/**
 * AnnouncerContext.tsx — one polite screen-reader "announcer" for the whole app
 * (WCAG 4.1.3 status messages), plus page titles and focus on page change
 * (WCAG 2.4.2 / 2.4.3).
 *
 *  - `useAnnounce()` returns `announce("Chart layout reset")`: the text is
 *    read out by screen readers without moving focus. Saying the same thing
 *    twice still speaks (the region is cleared first).
 *  - `usePageTitle("My Runs")` sets the browser tab title to
 *    "My Runs · SALUS Online" while that page is shown.
 *  - <RouteFocus/> (in AppShell): after every page change, scrolls to the top,
 *    moves keyboard focus to the new page's h1 and announces the page title,
 *    so keyboard and screen-reader users know the page changed.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';
import { srOnly } from '../theme/a11y';

const APP_NAME = 'SALUS Online';
type Announce = (message: string) => void;
const AnnouncerContext = createContext<Announce>(() => {});

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);
  const announce = useCallback<Announce>((m) => {
    setMessage('');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(m), 60);
  }, []);
  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <Box role="status" aria-live="polite" aria-atomic="true" sx={srOnly}>{message}</Box>
    </AnnouncerContext.Provider>
  );
}

/** Speak a short status message to screen-reader users. */
export function useAnnounce(): Announce {
  return useContext(AnnouncerContext);
}

/** Browser tab title for the current page ("<title> · SALUS Online"). */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · ${APP_NAME}`; // no title = leave the page's own title alone
  }, [title]);
}

/** After a page change: top of page, focus on its h1, announce the title. */
export function RouteFocus() {
  const { pathname } = useLocation();
  const announce = useAnnounce();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false; // first load: leave focus where the browser puts it
      return;
    }
    window.scrollTo(0, 0);
    // Wait a moment so the new page has rendered and set its title.
    const t = window.setTimeout(() => {
      const h1 = document.querySelector<HTMLElement>('main h1');
      if (h1) {
        if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
      announce(document.title.replace(` · ${APP_NAME}`, '') + ' page');
    }, 150);
    return () => window.clearTimeout(t);
  }, [pathname, announce]);
  return null;
}
