/**
 * GlobeLogo.tsx — the SALUS Online header logo, drawn as inline SVG so it stays
 * crisp and follows the colour scheme.
 *
 * An outline "web" globe (outline, two meridian ellipses, the central meridian,
 * equator and two latitude lines) with "SALUS" in small, evenly spaced bold
 * letters across its upper part, so the top of the globe peeks out above the
 * word. The word sits on a band in the bar's own colour (a thick outline drawn
 * under the letters) so the grid lines never run through it.
 *
 * Colours: on dark bars (Green bars, Dark mode) the globe is MSU Lime and the
 * word white; on White bars both are Spartan Green. Decorative (the
 * "SALUS Online" wordmark beside it carries the name), so hidden from screen
 * readers.
 */
import { Box, useTheme } from '@mui/material';
import { tokens } from '../../theme/tokens';

interface Props {
  /** Height in px (width follows the logo's shape). */
  height?: number | { xs: number; md: number };
  /** True on a dark background (Green bars or Dark mode). */
  onDark?: boolean;
}

// Globe geometry (SVG units): centre, radius.
const CX = 30;
const CY = 46;
const R = 27;

export default function GlobeLogo({ height = 44, onDark = true }: Props) {
  const bar = useTheme().palette.background.paper; // the app bar's colour (it uses `paper`)
  const globe = onDark ? tokens.color.limeGreen : tokens.color.spartanGreen;
  const word = onDark ? '#FFFFFF' : tokens.color.spartanGreen;
  return (
    <Box
      component="svg" viewBox="0 17 60 58" aria-hidden focusable="false"
      sx={{ height, width: 'auto', display: 'block', flexShrink: 0 }}
    >
      <g fill="none" stroke={globe} strokeWidth={2.6} strokeLinecap="round">
        <circle cx={CX} cy={CY} r={R} />
        <ellipse cx={CX} cy={CY} rx={11.5} ry={R} />
        <ellipse cx={CX} cy={CY} rx={21} ry={R} strokeOpacity={0.55} />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} />
        <path d={`M${CX - R} ${CY} H${CX + R}`} />
        <path d={`M${CX - 22.5} ${CY - 14} H${CX + 22.5}`} />
        <path d={`M${CX - 22.5} ${CY + 14} H${CX + 22.5}`} />
      </g>
      {/* "SALUS" across the upper globe, on a band of the bar colour */}
      <text
        x={CX} y={37} textAnchor="middle" fill={word}
        stroke={bar} strokeWidth={7} strokeLinejoin="round" paintOrder="stroke"
        style={{ font: `800 14px ${tokens.fontFamily}`, letterSpacing: '1.5px' }}
      >
        SALUS
      </text>
    </Box>
  );
}
