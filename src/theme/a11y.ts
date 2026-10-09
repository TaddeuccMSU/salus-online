/**
 * a11y.ts — small shared accessibility helpers.
 *
 *  - `srOnly`     sx for text that screen readers read but is hidden on screen
 *  - `FOCUS_*`    the focus-ring colours: Spartan Green on white surfaces
 *                 (10.8:1), MSU lime on the green bars (4.7:1). The ring itself is
 *                 drawn by the global :focus-visible rule in theme.ts, which reads
 *                 the CSS variable `--salus-focus` (ChromeSurface sets it to lime).
 */
import { tokens } from './tokens';

// top/left 0: without them an absolutely positioned element sits at its
// "natural" spot, which can be far down inside a scrolling panel, and then
// stretches the whole page's scroll height (the empty area under the map).
export const srOnly = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: 1,
  height: 1,
  p: 0,
  m: '-1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

export const FOCUS_ON_WHITE = tokens.color.spartanGreen;
export const FOCUS_ON_GREEN = tokens.color.limeGreen;
