/**
 * GlobeLogo.tsx — the SALUS Online header logo, drawn as inline SVG so it stays
 * crisp and follows the colour scheme (no lettering; the "SALUS Online"
 * wordmark sits beside it). The globe is the Material "Public" icon shape
 * (a solid disc with the land cut out). Two designs (pick with `design`):
 *
 * - 'leaf'   the original SALUS leaf (src/assets/salus-logo.webp), small and
 *            mirrored, splitting off the globe's upper left.
 * - 'globe'  the globe on its own.
 *
 * Colours: MSU Lime on dark bars (Green bars, Dark mode), Spartan Green on
 * White bars. Decorative, so hidden from screen readers.
 */
import { Box } from '@mui/material';
import { tokens } from '../../theme/tokens';
import leaf from '../../assets/salus-logo.webp';

export type LogoDesign = 'leaf' | 'globe';

/** Material Icons "Public" (Apache 2.0), 24 × 24: a globe with the continents cut out. */
const GLOBE_PATH =
  'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39';

interface Props {
  design?: LogoDesign;
  /** Height in px (width follows the design's shape). */
  height?: number | { xs: number; md: number };
  /** True on a dark background (Green bars or Dark mode). */
  onDark?: boolean;
}

export default function GlobeLogo({ design = 'leaf', height = 44, onDark = true }: Props) {
  const fill = onDark ? tokens.color.limeGreen : tokens.color.spartanGreen;
  const wide = design === 'leaf';
  return (
    <Box
      component="svg" viewBox={wide ? '0 0 72 60' : '0 0 60 60'} aria-hidden focusable="false"
      sx={{ height, width: 'auto', display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      {/* Globe: the 24-unit icon scaled to a 50-unit disc (leaf design: shifted right to leave room for the leaf) */}
      <path d={GLOBE_PATH} fill={fill} transform={wide ? 'translate(16 6.5) scale(2.5)' : 'translate(0 0) scale(2.5)'} />
      {wide && (
        /* The SALUS leaf, mirrored and small, breaking away from the globe's upper left */
        <g transform="translate(31 1) scale(-1 1) rotate(-10 13 12)">
          <image href={leaf} x={0} y={0} width={26} height={25} />
        </g>
      )}
    </Box>
  );
}
