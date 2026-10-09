/**
 * ColourSettings.tsx — the colour sections of the top-bar Settings pop-out.
 *
 *  - <DarkModeSetting>      a Dark mode on/off switch (theme/chrome.tsx;
 *                           remembered in this browser, off by default).
 *  - <ColourSchemeSetting>  Green bars (white on Spartan Green, the default)
 *                           or White bars, for the app bar, stepper, results
 *                           header and panel header (theme/chrome.tsx).
 *  - <AllChartColoursSetting> one switch for every results chart: MSU colours
 *                           or the colour-blind safe set. Each chart's own ⚙
 *                           can still pick its own colours; when the charts
 *                           don't all match one set, neither option is ticked.
 */
import { FormControlLabel, Switch, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useChrome, type ChromeVariant } from '../../theme/chrome';
import { useChartColors } from '../../state/ChartColorsContext';
import { CHART_SLOTS, PRESETS, matchingPreset, type ChartId, type PresetId } from '../../theme/chartColors';
import { SettingsSection } from './SettingsButton';

export function DarkModeSetting() {
  const { dark, setDark } = useChrome();
  return (
    <SettingsSection title="Dark mode" note="Dark page and cards, easier on the eyes in low light. The green bars stay the same. Remembered in this browser.">
      <FormControlLabel
        control={<Switch checked={dark} onChange={(e) => setDark(e.target.checked)} color="secondary" />}
        label={dark ? 'On' : 'Off'}
        sx={{ ml: 0, gap: 1 }}
      />
    </SettingsSection>
  );
}

export function ColourSchemeSetting() {
  const { variant, setVariant, dark } = useChrome();
  return (
    <SettingsSection title="Colour scheme" note="The colour of the top bar and page headers.">
      <ToggleButtonGroup exclusive size="small" value={variant} onChange={(_, v: ChromeVariant | null) => v && setVariant(v)} aria-label="Colour scheme" sx={{ display: 'flex' }}>
        <ToggleButton value="green" sx={{ flex: 1 }}>Green bars</ToggleButton>
        <ToggleButton value="white" sx={{ flex: 1 }}>{dark ? 'Dark bars' : 'White bars'}</ToggleButton>
      </ToggleButtonGroup>
    </SettingsSection>
  );
}

export function AllChartColoursSetting() {
  const { colors, applyPreset } = useChartColors();
  const charts = Object.keys(CHART_SLOTS) as ChartId[];
  const matches = charts.map((c) => matchingPreset(c, colors[c]));
  const all: PresetId | null = matches.every((m) => m && m === matches[0]) ? matches[0] : null;
  return (
    <SettingsSection title="Chart colours" note="Applies to every results chart and the PDF reports.">
      <ToggleButtonGroup exclusive size="small" value={all} onChange={(_, v: PresetId | null) => v && applyPreset(v)} aria-label="Chart colours" sx={{ display: 'flex' }}>
        {PRESETS.map((p) => (
          <ToggleButton key={p.id} value={p.id} sx={{ flex: 1 }}>{p.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      {!all && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Some charts use their own colours (set in each chart’s ⚙).
        </Typography>
      )}
    </SettingsSection>
  );
}
