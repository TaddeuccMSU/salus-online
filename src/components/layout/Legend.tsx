/**
 * Legend.tsx — a compact row of coloured swatches + labels.
 *
 * Used above each chart instead of the chart library's built-in legend so all
 * cards share one consistent look. Swatches are outlined and can be hatched or
 * capped to match how the series is drawn (not colour alone, WCAG 1.4.1).
 */
import { useColors } from '../../theme/colors';
import { Box, Typography } from '@mui/material';

export interface LegendItem {
  label: string;
  color: string;
  /** How the series is drawn, so the swatch matches: solid (default), hatched, or a bar with a round cap. */
  mark?: 'solid' | 'hatched' | 'cap';
}

export default function Legend({ items }: { items: LegendItem[] }) {
  const c = useColors();
  // Swatches framed and hatched exactly like the chart bars (light or dark mode).
  const FRAME = c.outline;
  const OUTLINE = c.hatch;
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.75 }}>
      {items.map((i) => (
        <Box key={i.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* Swatch outlined like the bars; hatched / capped to match the chart */}
          <Box
            aria-hidden
            sx={{
              width: 12, height: 12, borderRadius: i.mark === 'cap' ? '50% 50% 2px 2px' : '2px', bgcolor: i.color, border: `1.5px solid ${FRAME}`, flexShrink: 0,
              ...(i.mark === 'hatched' && { backgroundImage: `repeating-linear-gradient(45deg, ${OUTLINE}8C 0 2px, transparent 2px 5px)` }),
            }}
          />
          <Typography variant="caption">{i.label}</Typography>
        </Box>
      ))}
    </Box>
  );
}
