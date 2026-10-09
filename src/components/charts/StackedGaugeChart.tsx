/**
 * StackedGaugeChart.tsx — "current vs. maximum" stacked columns.
 *
 * Used twice: Soil Water (one column) and Nitrogen Budget (three columns).
 * Each column stacks today's value (lime) under the remaining head-room to
 * the run maximum (green), so the full column height is always the maximum
 * and the lime fill shows how "full" it is today (head-room is a neutral grey-green).
 * Every bar has a Spartan Green outline and the head-room part is HATCHED, so
 * the two parts differ by texture as well as colour (see ChartPatterns.tsx).
 */
import { useId } from 'react';
import { Box } from '@mui/material';
import { HatchPattern, hatchFill, useBarOutline } from './ChartPatterns';
import { BarChart } from '@mui/x-charts/BarChart';
import { tokens } from '../../theme/tokens';

export interface GaugeItem {
  label: string;
  current: number;
  max: number;
}

interface Props {
  items: GaugeItem[];
  unit: string;
  height?: number;
  /** Fill for today's value and for the head-room to the maximum (user-adjustable, see ChartColorButton). */
  currentColor?: string;
  maxColor?: string;
}

export default function StackedGaugeChart({ items, unit, height = 380, currentColor = tokens.color.accent, maxColor = tokens.color.maxNeutral }: Props) {
  const outline = useBarOutline(); // frame colour for light / dark mode
  const dataset = items.map((i) => ({
    label: i.label,
    current: Math.max(0, i.current),
    remaining: Math.max(0, i.max - i.current),
  }));
  const fmt = (v: number | null) => `${(v ?? 0).toFixed(1)} ${unit}`;
  const hatchId = `hatch-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

  return (
    <Box sx={{ position: 'relative' }}>
    <HatchPattern id={hatchId} color={maxColor} />
    <BarChart
      height={height}
      dataset={dataset}
      xAxis={[{ scaleType: 'band', dataKey: 'label', categoryGapRatio: 0.35 }]}
      yAxis={[{ label: unit, width: 68 }]}
      series={[
        { dataKey: 'current', label: 'Current day', stack: 'total', color: currentColor, valueFormatter: fmt },
        { dataKey: 'remaining', label: 'To run maximum (hatched)', stack: 'total', color: maxColor, valueFormatter: fmt },
      ]}
      borderRadius={6}
      hideLegend
      grid={{ horizontal: true }}
      margin={{ left: 8, right: 8, top: 16, bottom: 8 }}
      sx={{
        // Outline every bar (drawn 3 px; the rounded clip leaves about 1.5 px visible).
        '& rect.MuiBarChart-element': { stroke: outline, strokeWidth: 3 },
        // Hatch the "to run maximum" part (its rects carry the series colour as their fill).
        [`& rect.MuiBarChart-element[fill="${maxColor}" i]`]: { fill: hatchFill(hatchId) },
      }}
    />
    </Box>
  );
}
