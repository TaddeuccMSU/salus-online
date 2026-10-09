/**
 * TourProvider.tsx — runs the product tours (engine only; the words, targets
 * and which steps are interactive live in HowToTourConfig.ts). One engine,
 * several tours: `startTour('gettingStarted' | 'explainResults' | 'helpExporting')`.
 *
 * Built on driver.js (MIT): it dims the page, spotlights one element and shows
 * a pop-over. On EVERY step the spotlighted part of the page stays live, so
 * people can try what's being shown (open the little map, hover a chart,
 * press ⚙, download a PDF…). The dim area around it can't be clicked on info
 * steps; dialogs, menus and tooltips opened from the spotlight are lifted
 * above the dimming (tour.css). Two kinds of step:
 *   - INFO steps: the user reads (and tries things), then presses Next / Back.
 *   - INTERACTIVE steps (`waitFor` in the config): there is no Next. The page
 *     stays usable (still dimmed) and the tour waits until the user actually
 *     does the thing, e.g. types an address and presses Go. The app reports it
 *     with `emit('fieldSelected')` and the tour moves on by itself. A
 *     "Do it for me" button runs `doItForMe` instead, so nobody gets stuck.
 *
 * Before showing any step we navigate to its route, run its `action`, run
 * `ensure` if the target is missing (e.g. coming Back), then wait for the
 * `[data-tour="…"]` target. Missing targets fall back to a centred pop-over.
 *
 * LEAVING THE TOUR'S PAGE. The spotlight (and, on "Your turn" steps, the
 * whole page) is clickable, so people can wander off: a nav link, opening a
 * run, the Run menu, the browser's Back button. When the page changes and the
 * tour didn't do it:
 *   - another run's results while on a results step → the tour carries on
 *     with that run (Run menu);
 *   - a "Your turn" step whose task itself changes page (Run SALUS → results)
 *     → that's the expected next page, carry on;
 *   - anything else → the tour ends.
 * Undo events (REWIND_ON in the config, e.g. closing Set Management) send the
 * tour back to the step that set things up (e.g. "Click your field").
 *
 * Pages provide page-specific actions with `useTourAction(name, fn)`
 * (MapPage: resetMap / selectDemoField; ResultsPage: nudgeDate) and report
 * user actions with `useTour().emit(event, payload?)`.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver, type Driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';
import { HOW_TO_TOURS, REWIND_ON, TOUR_LABELS, type TourAction, type TourEvent, type TourId, type TourStepConfig } from './HowToTourConfig';

type ActionFn = () => void | Promise<void>;

interface TourApi {
  /** Start a tour (default: the getting-started tour from the Welcome dialog). */
  startTour: (id?: TourId) => void;
  /** Register a handler for a TourAction; returns an unregister function. */
  registerAction: (name: TourAction, fn: ActionFn) => () => void;
  /** True while any tour is running (pages hide their own instruction cards). */
  active: boolean;
  /** Report a user action an interactive step may be waiting for. Safe to call any time. */
  emit: (event: TourEvent, payload?: { runId?: string }) => void;
}

const TourContext = createContext<TourApi | null>(null);
const DEMO_RUN_ID = 'demo-irrigated';

/** `/runs/<id>/results` → id. */
const resultsRunId = (path: string) => /^\/runs\/([^/]+)\/results\/?$/.exec(path)?.[1] ?? null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isPhone = () => window.matchMedia('(max-width:600px)').matches;

/** CSS selector for a step's target (its phone-specific target on small screens). */
const selectorFor = (s: TourStepConfig) => {
  const t = (isPhone() && s.phoneTarget) || s.target;
  return t ? `[data-tour="${t}"]` : null;
};

/**
 * True while ← → Esc belong to the page, not the tour: the user is typing in a
 * field, using a slider, or has a dialog / menu open (e.g. Esc closes the
 * expanded chart, ‹ › cycles charts), so the tour mustn't move or close.
 */
function userIsEditing(): boolean {
  if (document.querySelector('.MuiModal-root:not(.MuiModal-hidden)')) return true;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (el.classList.contains('maplibregl-canvas')) return true; // arrow keys are moving the map
  return el.matches('input, textarea, select, [contenteditable="true"], [role="slider"]') || !!el.closest('[role="slider"]');
}

/** ARIA attributes driver.js adds to the spotlighted element, and that element's own values. */
const DRIVER_ARIA = ['aria-haspopup', 'aria-expanded', 'aria-controls'] as const;
const savedAria = new WeakMap<Element, (string | null)[]>();
const saveAria = (el: Element) => savedAria.set(el, DRIVER_ARIA.map((a) => el.getAttribute(a)));
function restoreAria(el: Element) {
  const orig = savedAria.get(el) ?? DRIVER_ARIA.map(() => null);
  DRIVER_ARIA.forEach((a, i) => (orig[i] === null ? el.removeAttribute(a) : el.setAttribute(a, orig[i]!)));
}

/**
 * Everything a keyboard user can Tab to. driver.js's own Tab trap only knows
 * links, buttons, text/radio/checkbox inputs and native selects, so it skipped
 * MUI dropdowns (Soil texture, Soil depth: `div role="combobox" tabindex="0"`),
 * number fields, sliders and toggle groups. We use this fuller list instead.
 */
const FOCUSABLE = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable="true"]',
].join(',');

/** Focusable, enabled, visible elements inside `roots`, in page order. */
function tabbables(roots: Element[]): HTMLElement[] {
  // A spotlighted button counts even if it's normally skipped by Tab (e.g. a
  // data-grid row action, which the grid reaches with arrow keys instead).
  const isRootButton = (el: Element) => roots.includes(el) && el.matches('button, a[href], [role="button"]');
  const all = roots.flatMap((r) => [...(r.matches(FOCUSABLE) || isRootButton(r) ? [r] : []), ...Array.from(r.querySelectorAll(FOCUSABLE))]) as HTMLElement[];
  return all.filter((el) => {
    if ((el as HTMLButtonElement).disabled || (el.tabIndex < 0 && !isRootButton(el)) || el.closest('[aria-hidden="true"], [inert]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

/** The spotlighted element, unless driver.js is showing a centred step (dummy element). */
const realSpot = (el?: Element | null) => (el && el.id !== 'driver-dummy-element' ? el : null);

/**
 * Put keyboard focus where the current step is, so a keyboard user never
 * ends up "behind" the tour:
 *  - focus already inside the spotlight or the pop-over → leave it;
 *  - a "Your turn" step → the first control in the spotlight (e.g. the
 *    address box), so they can just start doing it;
 *  - any other step → the pop-over itself (a dialog named by its title and
 *    described by its text, so screen readers read the step); Tab then moves
 *    to its buttons and the spotlighted controls.
 * `onlyIfLost`: second pass, only acts if focus has wandered out.
 */
function focusStep(el: Element | undefined, interactive: boolean, onlyIfLost = false) {
  const pop = document.querySelector<HTMLElement>('.driver-popover');
  if (!pop) return;
  const spot = realSpot(el);
  const active = document.activeElement;
  const inside = !!active && active !== document.body && (pop.contains(active) || !!spot?.contains(active));
  if (inside && (onlyIfLost || active !== pop.querySelector('.driver-popover-close-btn'))) return;
  if (document.querySelector('.MuiModal-root:not(.MuiModal-hidden)')) return; // a dialog/menu has it
  const first = interactive && spot ? tabbables([spot])[0] : undefined;
  if (first) first.focus({ preventScroll: true });
  else {
    pop.setAttribute('tabindex', '-1');
    pop.focus({ preventScroll: true });
  }
}

/**
 * driver.js calls the same Next/Back/Close handlers for its buttons and for
 * the ← → Esc keys. The keys must be ignored while typing (e.g. in the address
 * box), but a click on a pop-over button must always work, even though
 * driver.js keeps focus where it was (in that box). So we note pointer
 * presses on the pop-over.
 */
let lastPopoverPress = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => {
    if ((e.target as Element | null)?.closest?.('.driver-popover')) lastPopoverPress = Date.now();
  }, true);
}
/** True when a ← → / Esc key should be left to the page instead of driving the tour. */
const keyBelongsToPage = () => Date.now() - lastPopoverPress > 800 && userIsEditing();

/** Polls until `test()` returns truthy or the timeout passes. */
async function waitFor<T>(test: () => T | null | undefined | false, timeout = 3000, every = 60): Promise<T | null> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const v = test();
    if (v) return v;
    await sleep(every);
  }
  return null;
}

/** Element is in the DOM and actually visible (not display:none / zero-size). */
function visibleEl(sel: string | null): Element | null {
  if (!sel) return null;
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const actions = useRef(new Map<TourAction, ActionFn>());
  const drv = useRef<Driver | null>(null);
  const [active, setActive] = useState(false);
  /** Interactive step currently waiting for the user (index + event). */
  const waiting = useRef<{ index: number; event: TourEvent } | null>(null);
  /** Run made during this tour (results steps show it); demo run if skipped. */
  const runId = useRef<string | null>(null);
  /** Steps of the tour that's running. */
  const stepsRef = useRef<TourStepConfig[]>([]);
  /** True while the tour itself is changing step (and may be navigating). */
  const busyRef = useRef(false);
  /** Moves the tour to a step (set when a tour starts). */
  const goRef = useRef<(index: number) => Promise<void>>(async () => {});

  /** Resolve ':results' to the run made in this tour. */
  const routeOf = (s: TourStepConfig) => (s.route === ':results' ? `/runs/${runId.current ?? DEMO_RUN_ID}/results` : s.route);

  // Navigation-type actions are handled here; page-specific ones are registered by pages.
  const builtIn: Partial<Record<TourAction, ActionFn>> = useMemo(
    () => ({
      openDemoResults: () => {
        runId.current = DEMO_RUN_ID;
        navigate(`/runs/${DEMO_RUN_ID}/results`);
      },
    }),
    [navigate],
  );

  const registerAction = useCallback((name: TourAction, fn: ActionFn) => {
    actions.current.set(name, fn);
    return () => {
      if (actions.current.get(name) === fn) actions.current.delete(name);
    };
  }, []);

  /** Run a TourAction (built-in, or registered by the page once it has mounted). */
  const runAction = useCallback(
    async (name: TourAction) => {
      const fn = builtIn[name] ?? (await waitFor(() => actions.current.get(name), 3000));
      if (fn) await fn();
    },
    [builtIn],
  );

  /** Get the app into the right state for step `i` (route, action, ensure, target). */
  const prepare = useCallback(
    async (i: number) => {
      const step = stepsRef.current[i];
      if (!step) return;
      const route = routeOf(step);
      if (pathRef.current !== route) {
        navigate(route);
        await waitFor(() => pathRef.current === route, 3000);
      }
      if (step.action) await runAction(step.action);
      const sel = selectorFor(step);
      if (step.ensure && sel && !(await waitFor(() => visibleEl(sel), 600))) await runAction(step.ensure);
      const el = await waitFor(() => visibleEl(sel), sel ? step.waitMs ?? 3000 : 0);
      if (el) {
        await sleep(step.action || step.ensure ? 450 : 150); // let panels/charts finish animating
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    },
    // routeOf only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, runAction],
  );

  /** The app reports a user action; if the current step waits for it, move on. */
  const emit = useCallback((event: TourEvent, payload?: { runId?: string }) => {
    if (!drv.current) return;
    if (event === 'runSubmitted' && payload?.runId) runId.current = payload.runId;
    // An undo (e.g. Set Management closed): go back to the step it undid.
    const undoes = REWIND_ON[event];
    if (undoes) {
      const now = drv.current.getActiveIndex() ?? 0;
      const back = stepsRef.current.findIndex((s) => s.waitFor === undoes);
      if (back >= 0 && now > back && !busyRef.current) {
        waiting.current = null;
        void goRef.current(back);
      }
      return;
    }
    const w = waiting.current;
    if (!w) return;
    if (w.event === event) {
      waiting.current = null;
      void goRef.current(w.index + 1);
    } else if (stepsRef.current[w.index + 1]?.waitFor === event) {
      // The user did the NEXT task straight away (e.g. clicked the map
      // without searching first): skip past both steps.
      waiting.current = null;
      void goRef.current(w.index + 2);
    }
  }, []);

  const startTour = useCallback((id: TourId = 'gettingStarted') => {
    // Where keyboard focus goes back to when the tour ends (the button that started it).
    const returnFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    drv.current?.destroy();
    waiting.current = null;
    // Started from a results page → ':results' steps use that page's run.
    runId.current = /^\/runs\/([^/]+)\/results/.exec(pathRef.current)?.[1] ?? null;
    const STEPS = HOW_TO_TOURS[id].steps;
    stepsRef.current = STEPS;
    const L = TOUR_LABELS;

    let resizeWatch: ResizeObserver | null = null;
    /** Dim the pop-over and block its buttons while the next step is being prepared. */
    const setBusy = (on: boolean) => document.querySelector('.driver-popover')?.classList.toggle('is-busy', on);

    const steps: DriveStep[] = STEPS.map((s, idx) => ({
      // A function, so the element is looked up when the step is shown.
      element: (() => visibleEl(selectorFor(s))) as () => Element,
      disableActiveInteraction: false, // the spotlighted area is always usable, so people can try it
      popover: {
        title: s.title,
        description: isPhone() && s.phoneBody ? s.phoneBody : s.body,
        side: isPhone() ? undefined : s.side, // let driver.js choose on small screens
        align: s.align,
        // Set explicitly: an undefined value would hide the "Finish" label on the last step.
        nextBtnText: idx === STEPS.length - 1 ? L.done : s.waitFor ? L.doItForMe : L.next,
        popoverClass: s.waitFor ? 'salus-tour is-waiting' : 'salus-tour',
        // Interactive steps get a "Your turn" prompt above the buttons.
        onPopoverRender: (pop) => {
          // driver.js makes the title a <header>, which screen readers list as a
          // second page banner (WCAG 1.3.1). Drop that role and name the
          // pop-over (a non-modal dialog) by the title instead.
          pop.title.setAttribute('role', 'none');
          pop.title.id = 'salus-tour-title';
          pop.wrapper.setAttribute('role', 'dialog');
          pop.wrapper.setAttribute('aria-labelledby', 'salus-tour-title');
          pop.description.id = 'salus-tour-desc';
          pop.wrapper.setAttribute('aria-describedby', 'salus-tour-desc');
          if (s.waitFor) {
            const hint = document.createElement('div');
            hint.className = 'salus-tour-yourturn';
            hint.textContent = L.yourTurn;
            pop.footer.parentElement?.insertBefore(hint, pop.footer);
          }
        },
      },
      onHighlightStarted: (el) => {
        if (el) saveAria(el);
      },
      onHighlighted: (el) => {
        waiting.current = s.waitFor ? { index: idx, event: s.waitFor } : null;
        // driver.js's `body.driver-active` class sets pointer-events on every
        // element, which breaks MUI controls inside the spotlight (e.g. a
        // Select's outline would swallow the click). It's always taken off;
        // instead the dim overlay itself blocks clicks outside the spotlight
        // (its cut-out lets clicks through to the spotlighted area). On
        // interactive steps the overlay lets ALL clicks through, so the whole
        // page is usable (e.g. click the map instead of searching).
        document.body.classList.remove('driver-active');
        // driver.js marks the spotlighted element as a popup button (aria-haspopup /
        // aria-expanded / aria-controls). Those are wrong on most elements (axe:
        // critical, WCAG 4.1.2), and the pop-over is announced anyway; remove them.
        // The element's own values (saved in onHighlightStarted) are put back.
        if (el) setTimeout(() => restoreAria(el), 0);
        document.body.classList.toggle('tour-interactive', !!s.waitFor);
        // Keep the spotlight fitted if the area changes size as people try it
        // (a panel opens, a chart redraws).
        resizeWatch?.disconnect();
        if (el && typeof ResizeObserver !== 'undefined') {
          resizeWatch = new ResizeObserver(() => drv.current?.refresh());
          resizeWatch.observe(el);
        }
        // Keyboard focus follows the tour (twice: a closing dialog, e.g. the
        // Welcome dialog that started the tour, may hand focus back late).
        setTimeout(() => focusStep(el, !!s.waitFor), 60);
        setTimeout(() => focusStep(el, !!s.waitFor, true), 350);
      },
    }));

    const go = async (index: number) => {
      if (busyRef.current || !drv.current) return;
      busyRef.current = true;
      waiting.current = null;
      setBusy(true);
      try {
        await prepare(index);
        drv.current?.moveTo(index);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    };
    goRef.current = go;

    const d = driver({
      steps,
      showProgress: true,
      progressText: L.progress,
      nextBtnText: L.next,
      prevBtnText: L.previous,
      doneBtnText: L.done,
      overlayColor: '#0F2E27',
      overlayOpacity: 0.55,
      overlayClickBehavior: 'none', // clicking outside never skips or closes the tour
      stagePadding: 6,
      stageRadius: 10,
      smoothScroll: true,
      allowClose: true,
      onNextClick: () => {
        if (keyBelongsToPage()) return; // → key while typing / on a slider (a click still works)
        const i = d.getActiveIndex() ?? 0;
        const step = STEPS[i];
        if (d.isLastStep()) return d.destroy();
        if (step?.waitFor && step.doItForMe) {
          // "Do it for me": perform the step, then continue.
          void (async () => {
            waiting.current = null;
            setBusy(true);
            await runAction(step.doItForMe!);
            setBusy(false);
            await go(i + 1);
          })();
          return;
        }
        void go(i + 1);
      },
      onPrevClick: () => {
        if (keyBelongsToPage()) return;
        const i = d.getActiveIndex() ?? 0;
        if (i > 0) void go(i - 1);
      },
      onDestroyStarted: () => {
        // Esc while typing in the search box shouldn't end the tour (the ✕ still does).
        if (keyBelongsToPage()) return;
        d.destroy();
      },
      onDestroyed: () => {
        resizeWatch?.disconnect();
        drv.current = null;
        waiting.current = null;
        document.body.classList.remove('tour-interactive', 'tour-on');
        setActive(false);
        // Hand keyboard focus back: to the button that started the tour if it's
        // still on the page, else to the page heading (never lost on <body>).
        setTimeout(() => {
          const a = document.activeElement;
          if (a && a !== document.body && !a.closest('.driver-popover')) return; // user already moved on
          if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
          else {
            const h1 = document.querySelector<HTMLElement>('main h1');
            if (h1) { if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
          }
        }, 0);
      },
    });
    drv.current = d;
    document.body.classList.add('tour-on');
    setActive(true);
    void (async () => {
      await prepare(0);
      d.drive(0);
    })();
  }, [prepare, runAction]);

  // The user changed page themselves (see "LEAVING THE TOUR'S PAGE" above).
  useEffect(() => {
    const d = drv.current;
    if (!d || busyRef.current) return; // tour not running, or it's the tour navigating
    const i = d.getActiveIndex();
    const step = i == null ? undefined : stepsRef.current[i];
    if (!step) return; // still starting up
    const path = location.pathname;
    if (path === routeOf(step)) return;
    const runHere = resultsRunId(path);
    if (step.route === ':results' && runHere) {
      runId.current = runHere; // switched runs: carry on with this one
      setTimeout(() => drv.current?.refresh(), 400); // re-fit once the new run has drawn
      return;
    }
    const next = stepsRef.current[i! + 1];
    if (step.waitFor && next && (next.route === ':results' ? !!runHere : path === next.route)) return; // the task itself changes page
    d.destroy();
    // routeOf only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Tab while a tour runs (replaces driver.js's Tab handling, see FOCUSABLE):
  //  - A menu/dialog is open (e.g. a dropdown's list): leave Tab to it.
  //  - Every step: Tab cycles through the pop-over and the spotlighted area
  //    (dropdowns, number fields, sliders, the map…), so focus can't wander
  //    off behind the dimming. Esc still closes the tour (no keyboard trap).
  //    The mouse can still use the whole page on "Your turn" steps.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !drv.current || e.defaultPrevented) return;
      // driver.js listens on window too (added later, so it runs after us);
      // this stops ITS Tab trap only. The page's own handlers already ran.
      e.stopImmediatePropagation();
      if (document.querySelector('.MuiModal-root:not(.MuiModal-hidden)')) return;
      const pop = document.querySelector('.driver-popover');
      const spot = realSpot(drv.current.getActiveElement());
      const list = tabbables([...(pop ? [pop] : []), ...(spot ? [spot] : [])]);
      if (!list.length) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? list[i <= 0 ? list.length - 1 : i - 1] : list[i < 0 || i === list.length - 1 ? 0 : i + 1];
      next.focus();
    };
    window.addEventListener('keydown', onKey); // registered before driver.js starts, so it runs first
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  // Close the tour if the provider unmounts.
  useEffect(() => () => drv.current?.destroy(), []);

  const api = useMemo(() => ({ startTour, registerAction, emit, active }), [startTour, registerAction, emit, active]);
  return <TourContext.Provider value={api}>{children}</TourContext.Provider>;
}

/** Hook: start the tour / register actions / report user actions. Must be inside <TourProvider>. */
export function useTour(): TourApi {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
}

/** Hook for pages: provide the handler for one tour action while mounted. */
export function useTourAction(name: TourAction, fn: ActionFn) {
  const { registerAction } = useTour();
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => registerAction(name, () => ref.current()), [name, registerAction]);
}
