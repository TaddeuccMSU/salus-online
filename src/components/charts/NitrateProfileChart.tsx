/**
 * NitrateProfileChart.tsx — "Soil Nitrate Profile" card chart.
 *
 * Vertical columns, one per SALUS soil layer: soil depth runs along the
 * x-axis (0–2 cm on the left to 125–150 cm on the right) and nitrate-N
 * concentration (mg N/kg soil, shown as ppm in US units) is on the y-axis,
 * for the selected day. Depth labels/units come from the parent (units setting).
 * Columns use the gold→brown depth ramp (a data colour scale, kept on purpose) so shallow and deep layers read
 * differently. `yMax` is held fixed by the parent for the whole time window
 * so columns grow and shrink visibly while you scrub through dates; values
 * above it are clipped to the top and their label shows the true value.
 */
import { BarChart } from '@mui/x-charts/BarChart';
import type { SoilLayer } from '../../types';
import { depthRamp } from '../../theme/tokens';
import { useBarOutline } from './ChartPatterns';
import { useColors, useIsDark } from '../../theme/colors';

interface Props {
  layers: SoilLayer[];
  values: number[]; // mg N / kg soil, one per layer
  yMax: number;
  height?: number;
  /** Ten colours, shallow → deep (user-adjustable; defaults to the MSU depth ramp). */
  ramp?: readonly string[];
  /** Layer labels in the user's depth unit (default "0–2" … in cm) and the unit names. */
  layerLabels?: string[];
  depthUnit?: string;
  concUnit?: string;
}

export default function NitrateProfileChart({ layers, values, yMax, height = 380, ramp = depthRamp, layerLabels, depthUnit = 'cm', concUnit = 'mg N/kg soil' }: Props) {
  // Dark mode: a light frame (useBarOutline) so the deep brown layers show on the dark cards.
  const dark = useIsDark();
  const c = useColors();
  const outline = useBarOutline();
  const labelFill = dark ? c.text : '#3A4540';
  // Short tick labels ("0–2", "2–7"…) fit ten columns; the axis title carries the unit.
  const labels = layerLabels ?? layers.map((l) => `${l.top}–${l.bottom}`);
  const dataset = labels.map((label, i) => ({ label, value: Math.min(values[i] ?? 0, yMax), actual: values[i] ?? 0 }));

  return (
    <BarChart
      height={height}
      dataset={dataset}
      series={[{
        dataKey: 'value',
        label: 'Nitrate-N',
        valueFormatter: (_v, ctx) => `${dataset[ctx.dataIndex].actual.toFixed(1)} ${concUnit}`,
        barLabel: (item) => (item.dataIndex != null ? dataset[item.dataIndex].actual.toFixed(1) : null),
        barLabelPlacement: 'outside',
      }]}
      xAxis={[{
        scaleType: 'band',
        dataKey: 'label',
        label: `Soil depth (${depthUnit})`,
        categoryGapRatio: 0.25,
        // Show every layer's label, angled so all ten fit in a narrow card.
        tickLabelInterval: () => true,
        tickLabelStyle: { angle: -45, textAnchor: 'end', fontSize: '0.6875rem' },
        height: 78,
        valueFormatter: (v: string, ctx) => (ctx.location === 'tooltip' ? `${v} ${depthUnit}` : v),
        colorMap: { type: 'ordinal', values: labels, colors: [...ramp] },
      }]}
      yAxis={[{ min: 0, max: yMax, label: concUnit, width: 56 }]}
      borderRadius={4}
      hideLegend
      grid={{ horizontal: true }}
      margin={{ left: 8, right: 8, top: 20, bottom: 8 }}
      sx={{
        '& .MuiBarLabel-root': { fill: labelFill, fontWeight: 600, fontSize: '0.6875rem' },
        // Ten angled depth labels: keep them a little smaller than other charts' ticks (11 px at default size).
        '& .MuiChartsAxis-directionX .MuiChartsAxis-tickLabel': { fontSize: '0.6875rem !important' },
        // Spartan Green outline: light ramp colours (gold is 1.8:1 on white) stay visible (WCAG 1.4.11).
        '& rect.MuiBarChart-element': { stroke: outline, strokeWidth: 3 },
      }}
    />
  );
}
