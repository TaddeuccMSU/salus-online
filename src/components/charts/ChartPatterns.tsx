/**
 * ChartPatterns.tsx — the shared "how the chart graphics stay readable" bits
 * (WCAG 1.4.1 use of colour, 1.4.11 non-text contrast).
 *
 *  - `BAR_OUTLINE`  every bar gets a Spartan Green outline (10.8:1 on white), so
 *                   bars are visible whatever their fill colour (MSU lime is only
 *                   2.3:1 on white, the light "run maximum" grey 1.5:1).
 *  - <HatchPattern> an SVG pattern: the given colour with diagonal Spartan
 *                   Green lines. "Run maximum" parts of bars use it, so they
 *                   differ from "current day" by texture, not only colour.
 *  - `hatchFill(id)` the CSS fill that points at a pattern.
 * The pattern lives in a tiny hidden SVG; other SVGs on the page can use it by id.
 *
 * Dark mode: useBarOutline() gives a light grey frame (so every fill shows on
 * the dark green cards) and the hatching uses a very dark green (`hatch`), so
 * it shows on the light "run maximum" fill.
 */
import { tokens } from '../../theme/tokens';
import { useColors } from '../../theme/colors';

export const BAR_OUTLINE = tokens.color.spartanGreen;
/** Hook: the bar outline / hatch colour for the current mode. */
export const useBarOutline = () => useColors().outline;
export const hatchFill = (id: string) => `url(#${id})`;

export function HatchPattern({ id, color, size = 7 }: { id: string; color: string; size?: number }) {
  const hatch = useColors().hatch;
  return (
    <svg width={0} height={0} aria-hidden focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width={size} height={size} patternTransform="rotate(45)">
          <rect width={size} height={size} fill={color} />
          <line x1={0} y1={0} x2={0} y2={size} stroke={hatch} strokeOpacity={0.55} strokeWidth={2} />
        </pattern>
      </defs>
    </svg>
  );
}
