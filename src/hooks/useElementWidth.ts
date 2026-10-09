/**
 * useElementWidth.ts — measures an element's width and re-renders on resize.
 * Lets hand-drawn SVG charts draw at true pixel size (crisp text, no stretching).
 */
import { useEffect, useRef, useState } from 'react';

export function useElementWidth<T extends HTMLElement>(fallback = 800) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}
