/**
 * useStepsBar.ts — whether the "1 Select field · 2 Set Management · 3 Results"
 * steps bar (WizardStepper) is shown.
 *
 * People can dismiss the bar with its ✕ and bring it back from the top-bar
 * ⚙ Settings ("Steps bar"). The choice is remembered in this browser
 * (localStorage `salus-online.stepsBar.v1`, shown by default). Every
 * component using the hook updates together (useSyncExternalStore), so
 * flipping it in Settings shows/hides the bar on the page straight away.
 */
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'salus-online.stepsBar.v1';
const listeners = new Set<() => void>();

/** Read the saved choice (default: shown). */
function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'hidden';
  } catch {
    return true;
  }
}

/** Let every subscribed component know the choice changed. */
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Hook: `[shown, setShown]` for the steps bar. */
export function useStepsBar(): [boolean, (shown: boolean) => void] {
  const shown = useSyncExternalStore(subscribe, read, () => true);
  const setShown = useCallback((on: boolean) => {
    try {
      localStorage.setItem(KEY, on ? 'shown' : 'hidden');
    } catch {
      /* storage blocked: the change still applies until reload */
    }
    listeners.forEach((fn) => fn());
  }, []);
  return [shown, setShown];
}
