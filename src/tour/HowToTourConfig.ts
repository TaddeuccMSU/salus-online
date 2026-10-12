/**
 * HowToTourConfig.ts — CONTENT for the guided product tours.
 *
 * There are three short tours (see HOW_TO_TOURS at the bottom):
 *   - gettingStarted  "Show me how" in the Welcome dialog: map → Set
 *                     Management → Run SALUS, ending on the new run's results
 *   - explainResults  "Explain results" button on a results page
 *   - helpExporting   "Help exporting" button on My Runs (PDF / CSV exports)
 *
 * This file holds only words and targets, no logic, so anyone can edit the tour:
 *   - `title` / `body`  what the pop-over says (plain text)
 *   - `target`          which element to spotlight: the value of a
 *                       `data-tour="…"` attribute in the UI (see TOUR_TARGETS).
 *                       Leave it out for a centred message with no spotlight.
 *   - `route`           the page the step lives on; the tour navigates there
 *   - `action`          optional set-up the app performs BEFORE showing the
 *                       step (e.g. clear the map)
 *   - `ensure`          set-up run only if the target is missing (coming Back)
 *   - `waitFor`         makes the step INTERACTIVE: no Next button; the tour
 *                       waits for the user to do it (e.g. search + Go), then
 *                       moves on. `doItForMe` offers a fallback button.
 *   - `side` / `align`  where the pop-over sits relative to the target
 *   - `phoneBody`       optional shorter/different text for phones (≤ 600 px)
 *   - `phoneTarget`     optional different element to spotlight on phones
 *
 * On every step the spotlighted element stays clickable, so people can try
 * what a step describes; only the dimmed area around it is blocked.
 * Leaving the tour's page by yourself (a nav link, opening a run, the
 * browser's Back button) ends the tour; see TourProvider.tsx for the rules.
 * If a target isn't on screen (e.g. the top nav is folded into the ☰ menu on
 * phones), the step is shown centred instead of failing.
 * The engine that runs this lives in TourProvider.tsx (driver.js).
 */

/** Set-up steps the app knows how to perform (implemented in TourProvider / MapPage). */
export type TourAction =
  | 'resetMap' // close the Set Management panel, clear the pin and the last search
  | 'flyToDemoArea' // fly the map to the demo field, as if the user had searched for it
  | 'selectDemoField' // drop a pin on the demo field so Set Management opens
  | 'openDemoResults' // open the finished example run's results
  | 'nudgeDate'; // move the results date forward a little

/**
 * Things the USER does that an interactive step waits for. The app reports
 * them with `useTour().emit(event)`; the tour then moves on by itself.
 */
export type TourEvent =
  | 'placeFound' // searched an address (Go / suggestion): the map flew there
  | 'fieldSelected' // clicked the map to drop the field pin
  | 'runSubmitted' // pressed Run SALUS (payload: the new run id)
  | 'dateChanged' // moved the date slider, pressed ‹ › or ▶, or clicked the events strip
  | 'fieldCleared'; // closed Set Management (✕ / Cancel), which removes the field pin

/**
 * Events that UNDO an earlier interactive step. If one happens after that
 * step, the tour goes back to it so the user isn't left on a step whose
 * target has vanished (e.g. closing Set Management → back to "Click your field").
 */
export const REWIND_ON: Partial<Record<TourEvent, TourEvent>> = {
  fieldCleared: 'fieldSelected',
};

/**
 * Where a step lives. ':results' means "the results page of the run made in
 * this tour" (or the example run if the user pressed “Do it for me”); when a
 * tour is started FROM a results page it means that page's run.
 */
export type TourRoute = '/' | '/runs' | ':results';

export interface TourStepConfig {
  id: string;
  route: TourRoute;
  target?: TourTarget;
  title: string;
  body: string;
  phoneBody?: string;
  phoneTarget?: TourTarget;
  /** Set-up to run every time BEFORE the step is shown. */
  action?: TourAction;
  /** Set-up to run only if the target isn't on screen (e.g. when coming Back). */
  ensure?: TourAction;
  /**
   * INTERACTIVE step: hide "Next" and wait for the user to do this. The page
   * stays usable (dimmed) and the tour moves on as soon as it happens.
   */
  waitFor?: TourEvent;
  /** On an interactive step, "Do it for me" performs this instead, then moves on. */
  doItForMe?: TourAction;
  /** How long to wait for the target to appear (ms, default 3000). */
  waitMs?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
}

/**
 * Every `data-tour` id used by the tour. Add the attribute to an element
 * (`data-tour="my-id"`) and list it here to make it targetable.
 */
export const TOUR_TARGETS = [
  'address-search',
  'address-go',
  'map',
  'basemap-toggle',
  'set-management-panel',
  'panel-details',
  'panel-dataset',
  'panel-field',
  'panel-nitrogen',
  'panel-period',
  'run-salus',
  'results-header',
  'results-parameters',
  'results-table-toggle',
  'run-new-management',
  'date-filter',
  'chart-nitrate',
  'chart-water',
  'chart-nbudget',
  'chart-events',
  'chart-settings',
  'runs-grid',
  'runs-pdf',
  'runs-toolbar',
  'explain-results',
  'help-exporting',
  'nav-map',
  'nav-my-runs',
  'nav-menu',
  'app-settings',
] as const;
export type TourTarget = (typeof TOUR_TARGETS)[number];

/** Demo field used by “Do it for me” (MSU Agronomy Farm, same site as the sample data). */
export const TOUR_DEMO_FIELD = { lat: 42.7095, lng: -84.4706, placeName: 'MSU Agronomy Farm, East Lansing, MI' };

/** Which tour to run (see the entry points listed at the top of this file). */
export type TourId = 'gettingStarted' | 'explainResults' | 'helpExporting';

export interface TourDefinition {
  /** Shown nowhere yet; handy in docs / analytics. */
  name: string;
  steps: TourStepConfig[];
}

/** Button labels, the "3 of 12" progress text, and the interactive-step prompt (shared by all tours). */
export const TOUR_LABELS = {
  next: 'Next',
  previous: 'Back',
  done: 'Finish',
  doItForMe: 'Do it for me',
  yourTurn: 'Your turn: the tour continues when you do it',
  progress: '{{current}} of {{total}}',
};

export const HOW_TO_TOURS: Record<TourId, TourDefinition> = {
  /* ------------------------------------------------------------------ *
   * 1. Getting started: map → Set Management → Run → results           *
   * ------------------------------------------------------------------ */
  gettingStarted: {
    name: 'Show me how',
    steps: [
      {
        id: 'welcome',
        route: '/',
        action: 'resetMap',
        title: 'Let\'s make your first run',
        body:
          'We\'ll pick a field, set its management and run SALUS together. ' +
          'Steps marked “Your turn” wait for you to do them. Use Back any time, or leave with ✕ or Esc.',
      },
      {
        id: 'basemap',
        route: '/',
        target: 'basemap-toggle',
        side: 'top',
        align: 'end',
        title: 'Satellite or streets',
        body: 'Switch between plain satellite imagery (best for spotting field edges) and Streets: the same imagery with roads and road names on top (best for finding your way).',
      },
      {
        id: 'search',
        route: '/',
        action: 'resetMap',
        target: 'address-search',
        waitFor: 'placeFound',
        doItForMe: 'flyToDemoArea',
        side: 'left', // the search box sits top-right
        align: 'start',
        title: '1 · Find your area',
        body: 'Type an address or town (for example “East Lansing, MI”) and press Go. The map zooms there.',
        phoneBody: 'Type an address or town (e.g. “East Lansing, MI”) and tap Go. The map zooms there.',
      },
      {
        // Mandatory: an address is a house or town centre, so the user always
        // picks the exact field with a click.
        id: 'click-field',
        route: '/',
        target: 'map',
        waitFor: 'fieldSelected',
        doItForMe: 'selectDemoField',
        side: 'right',
        align: 'center',
        title: 'Click your field',
        body: 'Now click the field itself on the map to drop your pin. Zoom in with the + button or your scroll wheel if you need a closer look.',
        phoneBody: 'Now tap the field itself on the map to drop your pin. Pinch to zoom in if you need a closer look.',
      },
      {
        id: 'panel',
        route: '/',
        ensure: 'selectDemoField',
        target: 'set-management-panel',
        side: 'left',
        align: 'start',
        title: '2 · Set Management',
        body: 'Your pin is down and the Set Management panel is open. Clicking the map again just moves the pin.',
        phoneBody: 'Your pin is down and the Set Management form has opened under the map. Tapping the map again just moves the pin.',
      },
      {
        id: 'dataset',
        route: '/',
        ensure: 'selectDemoField',
        target: 'panel-dataset',
        side: 'left',
        title: 'About this demo',
        body: 'Until live SALUS runs are connected, results come from mock sample data (invented numbers, not SALUS output). The answers below start from the sample’s settings, and only Irrigation changes the results.',
      },
      {
        id: 'details',
        route: '/',
        ensure: 'selectDemoField',
        target: 'panel-details',
        side: 'left',
        title: 'Name your run',
        body: 'Give the run a name you\'ll recognise later in My Runs. Notes are optional, e.g. what you\'re comparing.',
      },
      {
        id: 'field',
        route: '/',
        ensure: 'selectDemoField',
        target: 'panel-field',
        side: 'left',
        title: 'Describe the field',
        body: 'Choose soil texture, depth and tillage. The selected option is marked with a ✓; tap another option to change it.',
      },
      {
        id: 'nitrogen',
        route: '/',
        ensure: 'selectDemoField',
        target: 'panel-nitrogen',
        side: 'left',
        title: 'Water & nitrogen',
        body: 'Irrigation and fertilizer drive nitrate leaching. In this demo only Irrigation changes the results; the rest are saved with your run. Prefer US units? Use the Form settings button (⚙) in this panel’s header.',
      },
      {
        id: 'period',
        route: '/',
        ensure: 'selectDemoField',
        target: 'panel-period',
        side: 'left',
        title: 'Years to simulate',
        body: 'Drag either end of the slider to choose which years SALUS replays with historical weather.',
      },
      {
        id: 'run',
        route: '/',
        ensure: 'selectDemoField',
        target: 'run-salus',
        waitFor: 'runSubmitted',
        doItForMe: 'openDemoResults',
        side: 'top',
        align: 'end',
        title: 'Run SALUS',
        body: 'Happy with your answers? Press Run SALUS to start your run.',
      },
      {
        id: 'results',
        route: ':results',
        target: 'explain-results',
        waitMs: 6000,
        side: 'bottom',
        align: 'end',
        title: '3 · Your results',
        body:
          'That\'s it: your run is saved and its results open here once SALUS finishes. ' +
          'Press “Explain results” any time for a short tour of the results.',
      },
    ],
  },

  /* ------------------------------------------------------------------ *
   * 2. Explain results (started from a results page)                   *
   * ------------------------------------------------------------------ */
  explainResults: {
    name: 'Explain results',
    steps: [
      {
        id: 'results-header',
        route: ':results',
        target: 'results-header',
        side: 'bottom',
        align: 'start',
        title: 'Your run at a glance',
        body: 'The run\'s name and field. Click the little map to see the field larger, or switch to another run with the Switch run menu.',
      },
      {
        id: 'parameters',
        route: ':results',
        target: 'results-parameters',
        side: 'bottom',
        align: 'start',
        title: 'Based on these parameters',
        body: 'The settings this run used: soil, crop, planting, water, fertilizer and years. If you ran this field before, anything you changed since the previous run is highlighted in lime; hover over it (or tab to it) to see the old value.',
      },
      {
        id: 'results-table',
        route: ':results',
        target: 'results-table-toggle',
        side: 'left',
        title: 'Results table',
        body: 'Try it: Show results table opens the summary for the whole run: the best, average, median, worst and total of each measure (yield, N leaching, efficiencies, water balance and more). Download it as a CSV from the table’s toolbar. Press it again to hide the table.',
        phoneBody: 'Try it: Show results table opens the summary for the whole run, one card per measure (yield, N leaching, water and more). Pick Best, Average, Median, Worst or Total under Show. Switch to Table for everything at once.',
      },
      {
        id: 'date',
        route: ':results',
        target: 'date-filter',
        waitFor: 'dateChanged',
        doItForMe: 'nudgeDate',
        waitMs: 8000, // a fresh run needs a few seconds to finish before the charts appear
        side: 'bottom',
        title: 'Move through time',
        body: 'Try it: drag the slider, use ‹ › to step a month or year, or press ▶ to play the season. Every chart on this page follows the selected day.',
      },
      {
        id: 'nitrate',
        route: ':results',
        target: 'chart-nitrate',
        side: 'right',
        title: 'Soil nitrate profile',
        body: 'Nitrate in each soil layer on the selected day, from the surface (left) to the deepest layer (right). Watch it move down after heavy rain.',
      },
      {
        id: 'water',
        route: ':results',
        target: 'chart-water',
        side: 'left',
        title: 'Soil water',
        body: 'How much water plants can still draw from the soil today (the solid “Current day” part), against the most seen in this run (the hatched “Run maximum” part).',
      },
      {
        id: 'nbudget',
        route: ':results',
        target: 'chart-nbudget',
        side: 'left',
        title: 'Nitrogen budget',
        body: 'Where the nitrogen is: in the soil, taken up by the crop, or leached below the roots, compared with the run\'s maximum.',
      },
      {
        id: 'events',
        route: ':results',
        target: 'chart-events',
        side: 'top',
        title: 'Weather & management',
        body: 'Daily rain and irrigation, with fertilizer applications marked in red. Click anywhere on this strip to jump to that day.',
      },
      {
        id: 'chart-settings',
        route: ':results',
        target: 'chart-settings',
        side: 'left',
        align: 'start',
        title: 'Layout, colours and units',
        body: 'Each chart has three buttons in its top-right corner. Expand chart (⤢) opens it full-screen (use Previous / Next to flip between charts). Chart settings (⚙) opens its settings: a data table view, colour-blind safe colours (or pick your own), and Metric or US units for the whole app. Your choices are remembered and used in PDF reports too. Move (⠿) rearranges the page: drag it, or click it for Move up / down (Reset layout puts it back).',
      },
      {
        id: 'results-done',
        route: ':results',
        target: 'nav-my-runs',
        phoneTarget: 'nav-menu',
        side: 'bottom',
        title: 'Want a copy?',
        body: 'Every run is saved in My Runs, where you can download a printable PDF report. Press “Help exporting” there for a quick how-to.',
        phoneBody: 'Every run is saved in My Runs (☰ menu), where you can download a printable PDF report. Press “Help exporting” there for a quick how-to.',
      },
      {
        id: 'new-management',
        route: ':results',
        target: 'run-new-management',
        side: 'top',
        align: 'end',
        title: 'Try different management',
        body: 'Run new management opens the Set Management form for this same field, filled in with this run\'s answers. Change what you want to compare (irrigation, fertilizer, planting date…) and press Run SALUS: the new run\'s results show what changed, highlighted.',
      },
    ],
  },

  /* ------------------------------------------------------------------ *
   * 3. Help exporting (started from My Runs)                           *
   * ------------------------------------------------------------------ */
  helpExporting: {
    name: 'Help exporting',
    steps: [
      {
        id: 'grid',
        route: '/runs',
        target: 'runs-grid',
        side: 'top',
        title: 'All your runs',
        body: 'Each row is a saved run. Tick a row’s checkbox to pick several runs at once; double-click a row to open its results.',
        phoneBody: 'Each card is a saved run. Tick a card’s box to pick several runs at once; tap View results to open one.',
      },
      {
        id: 'pdf',
        route: '/runs',
        target: 'runs-pdf',
        side: 'left',
        title: 'One run → PDF report',
        body: 'The PDF icon downloads a printable report for that run: field details, settings and the key charts. It\'s ready when the run shows Complete. The table icon next to it shows the report\'s tables on screen, with CSV downloads.',
        phoneBody: 'The PDF button on a run’s card downloads a printable report for that run: field details, settings and the key charts (once the run has finished). The table button next to it shows the report’s tables, with CSV downloads.',
      },
      {
        id: 'export',
        route: '/runs',
        target: 'runs-toolbar',
        side: 'bottom',
        align: 'end',
        title: 'Several runs, or a spreadsheet',
        body: 'Use the Export button (⤓) in the table toolbar for a CSV of the table, or PDF reports for the ticked runs (or every completed run) in one go.',
        phoneBody: 'The Export button (⤓) next to the search box gives a CSV of your runs, or PDF reports for the ticked runs (or every completed run) in one go.',
      },
    ],
  },
};
