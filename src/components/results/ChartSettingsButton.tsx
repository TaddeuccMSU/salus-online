/**
 * ChartSettingsButton.tsx — the ⚙ in the corner of each results chart.
 * Opens "Chart settings" with these sections:
 *   - View    Chart or Table (the same numbers as an accessible table), this chart only
 *   - Units   (global Metric / US customary switch for every chart and form)
 *   - Colours (this chart only; colour-blind safe / custom)
 * New kinds of setting can be added here as more sections.
 */
import { Divider, ToggleButton, ToggleButtonGroup } from '@mui/material';
import SettingsButton, { SettingsSection } from '../settings/SettingsButton';
import UnitsSetting from '../settings/UnitsSetting';
import TextSizeSetting from '../settings/TextSizeSetting';
import ChartColorsSection from './ChartColorButton';
import { CHART_NAMES, type ChartId } from '../../theme/chartColors';

export type ChartView = 'chart' | 'table';

interface Props {
  chart: ChartId;
  tourId?: string;
  view?: ChartView;
  onViewChange?: (v: ChartView) => void;
}

export default function ChartSettingsButton({ chart, tourId, view, onViewChange }: Props) {
  return (
    <SettingsButton title="Chart settings" subject={CHART_NAMES[chart]} tooltip="Chart settings (view, units, colours, text size)" tourId={tourId}>
      {view && onViewChange && (
        <>
          <SettingsSection title="View" note="Show this chart as a graph, or its numbers as a table.">
            <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v: ChartView | null) => v && onViewChange(v)} aria-label="View">
              <ToggleButton value="chart">Chart</ToggleButton>
              <ToggleButton value="table">Table</ToggleButton>
            </ToggleButtonGroup>
          </SettingsSection>
          <Divider />
        </>
      )}
      <UnitsSetting />
      <Divider />
      <ChartColorsSection chart={chart} />
      <Divider />
      <TextSizeSetting />
    </SettingsButton>
  );
}
