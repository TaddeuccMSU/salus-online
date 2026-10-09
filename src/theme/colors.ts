/**
 * colors.ts — colours that follow dark mode.
 *
 *  - useColors()   the current colour set: `tokens.color` in light mode,
 *                  `darkColor` in dark mode (same names, same jobs). Use it
 *                  in components instead of importing `tokens.color` for
 *                  anything drawn on the page or cards. Things that look the
 *                  same in both modes (map pins, the green bars, lime buttons)
 *                  can keep using `tokens.color`.
 *  - visibleOn()   returns a colour unchanged if it stands out from a
 *                  background (≥ 3:1, the WCAG level for graphics), otherwise
 *                  a fallback. Used so user-picked chart colours (e.g. a black
 *                  "selected day" line) stay visible on dark cards.
 */
import { useChrome } from './chrome';
import { darkColor, tokens, type ColorSet } from './tokens';

/** Hook: the light or dark colour set (see the file comment). */
export function useColors(): ColorSet {
  return useChrome().dark ? darkColor : tokens.color;
}

/** Hook: true while dark mode is on. */
export function useIsDark(): boolean {
  return useChrome().dark;
}

/** Relative luminance (WCAG) of a #RRGGBB or #RGB colour; null if not a hex colour. */
function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Contrast ratio of two hex colours (1–21); 21 if either isn't a hex colour. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  if (la == null || lb == null) return 21;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `color` if it shows at 3:1 or more on `bg`, else `fallback`. */
export function visibleOn(color: string, bg: string, fallback: string): string {
  return contrast(color, bg) >= 3 ? color : fallback;
}

/** Weather/management strip colours (same shape as EventsTimeline's `colors`). */
export interface EventColors { rain: string; irrigation: string; fertilizer: string; cursor: string }

/**
 * Hook: event colours made safe for the current mode. In dark mode any colour
 * that doesn't show on the dark cards (e.g. the colour-blind set's black
 * "selected day" line) is swapped for a light one; light mode returns them as-is.
 * Used by both the strip and its legend so they always match.
 */
export function useVisibleEventColors(colors: EventColors): EventColors {
  const dark = useIsDark();
  if (!dark) return colors;
  const bg = darkColor.paper;
  return {
    rain: visibleOn(colors.rain, bg, '#6EA4E6'),
    irrigation: visibleOn(colors.irrigation, bg, '#3FC1C1'),
    fertilizer: visibleOn(colors.fertilizer, bg, '#F07A55'),
    cursor: visibleOn(colors.cursor, bg, darkColor.accentDark),
  };
}
