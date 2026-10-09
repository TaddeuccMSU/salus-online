/**
 * TextSizeContext.tsx — the user's text-size choice, applied to the whole app.
 *
 * `useTextSize()` → `{ textSize, setTextSize }`: 'default' (today's sizes) or
 * 'large' (everything 25% bigger). It works by setting the page's root font
 * size (100% / 125%); the MUI theme and the app's own styles size text in
 * rem, so ALL text — headings, forms, buttons, charts' labels, tooltips, the
 * tours — scales together, and layouts re-flow around it.
 * Remembered in this browser (localStorage `salus-online.textSize.v1`) and
 * applied before the first paint (see `applyTextSize` call at import), so
 * the page doesn't jump on load.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TextSize = 'default' | 'large';
export const TEXT_SIZE_LABELS: Record<TextSize, string> = { default: 'Default', large: 'Large' };
/** Root font size per option (browser default 16 px = 100%). */
const ROOT: Record<TextSize, string> = { default: '100%', large: '125%' };
const KEY = 'salus-online.textSize.v1';

function initial(): TextSize {
  try {
    return localStorage.getItem(KEY) === 'large' ? 'large' : 'default';
  } catch {
    return 'default';
  }
}

/** Sets the root font size. 'default' leaves the user's own browser setting alone. */
function applyTextSize(t: TextSize) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.fontSize = t === 'default' ? '' : ROOT[t];
  document.documentElement.dataset.textSize = t;
}
applyTextSize(initial()); // before React renders: no jump on load

interface TextSizeApi {
  textSize: TextSize;
  setTextSize: (t: TextSize) => void;
}
const TextSizeContext = createContext<TextSizeApi | null>(null);

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>(initial);
  useEffect(() => {
    applyTextSize(textSize);
    try {
      localStorage.setItem(KEY, textSize);
    } catch {
      /* not remembered */
    }
    // Charts and maps measure their boxes; tell them the layout changed.
    window.dispatchEvent(new Event('resize'));
  }, [textSize]);
  const api = useMemo(() => ({ textSize, setTextSize }), [textSize]);
  return <TextSizeContext.Provider value={api}>{children}</TextSizeContext.Provider>;
}

/** Hook: current text size + setter. Must be inside <TextSizeProvider>. */
export function useTextSize(): TextSizeApi {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error('useTextSize must be used inside <TextSizeProvider>');
  return ctx;
}
