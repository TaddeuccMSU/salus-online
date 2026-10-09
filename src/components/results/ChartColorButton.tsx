/**
 * ChartColorButton.tsx — the "Colours" section of a chart's ⚙ settings
 * (shown by ChartSettingsButton). Users can:
 *   - switch the chart to a ready-made colour set (Default or Colour-blind
 *     safe), or apply the colour-blind-safe set to every chart;
 *   - pick their own colour for each series with the browser's colour picker;
 *   - reset the chart to the default colours.
 * Changes apply instantly and are remembered (see state/ChartColorsContext).
 */
import { useColors } from '../../theme/colors';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { useChartColors } from '../../state/ChartColorsContext';
import { CHART_SLOTS, PRESETS, matchingPreset, nitrateRamp, type ChartId } from '../../theme/chartColors';
import { SettingsSection } from '../settings/SettingsButton';

/** A row of small colour squares (preview of a colour set). */
function Swatches({ colors, size = 14 }: { colors: string[]; size?: number }) {
  return (
    <Box sx={{ display: 'flex', gap: '2px' }} aria-hidden>
      {colors.map((c, i) => (
        <Box key={i} sx={{ width: size, height: size, borderRadius: '3px', bgcolor: c, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />
      ))}
    </Box>
  );
}

export default function ChartColorsSection({ chart }: { chart: ChartId }) {
  const c = useColors(); // light or dark mode colours
  const { colors, setColor, applyPreset, resetChart } = useChartColors();
  const mine = colors[chart];
  const active = matchingPreset(chart, mine);
  const slots = CHART_SLOTS[chart];
  const previewOf = (c: Record<string, string>) => (chart === 'nitrate' ? nitrateRamp(c) : slots.map((s) => c[s.key]));

  return (
    <>
      {/* Ready-made sets */}
      <SettingsSection title="Colours" note="Pick a colour set for this chart, or your own colours below.">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {PRESETS.map((p) => {
            const on = active === p.id;
            return (
              <ButtonBase
                key={p.id}
                onClick={() => applyPreset(p.id, chart)}
                aria-pressed={on}
                sx={{
                  justifyContent: 'flex-start', gap: 1.25, px: 1.25, py: 1, borderRadius: 2, textAlign: 'left',
                  border: `1.5px solid ${on ? c.spartanGreen : c.border}`,
                  bgcolor: on ? c.surfaceGreen : c.paper,
                  '&:hover': { borderColor: c.spartanGreen },
                }}
              >
                <Swatches colors={previewOf(p.colors[chart])} size={chart === 'nitrate' ? 10 : 14} />
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{p.label}</Typography>
                {on && <CheckIcon fontSize="small" sx={{ color: 'primary.main' }} />}
              </ButtonBase>
            );
          })}
        </Box>
        <Button size="small" onClick={() => applyPreset('colorblind')} sx={{ mt: 0.75, px: 0.5 }}>
          Use colour-blind safe colours on all charts
        </Button>
      </SettingsSection>

      {/* Custom colours: one native colour picker per series */}
      <SettingsSection title="Your own colours">
        {chart === 'nitrate' && (
          <Box sx={{ mb: 1 }}>
            <Swatches colors={nitrateRamp(mine)} size={22} />
            <Typography variant="caption" color="text.secondary">The layers in between blend from shallow to deep.</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {slots.map((s) => (
            <Box key={s.key} component="label" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer' }}>
              <Box
                component="input"
                type="color"
                value={mine[s.key]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(chart, s.key, e.target.value)}
                aria-label={`${s.label} colour`}
                sx={{
                  width: 40, height: 28, p: 0, border: `1px solid ${c.border}`, borderRadius: 1.5, bgcolor: c.paper, cursor: 'pointer',
                  '&::-webkit-color-swatch-wrapper': { p: '3px' },
                  '&::-webkit-color-swatch': { border: 'none', borderRadius: '4px' },
                  '&::-moz-color-swatch': { border: 'none', borderRadius: '4px' },
                  '&:focus-visible': { outline: `2px solid ${c.spartanGreen}`, outlineOffset: 2 },
                }}
              />
              <Typography variant="body2" sx={{ flex: 1 }}>{s.label}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{mine[s.key]}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button size="small" onClick={() => resetChart(chart)} disabled={active === 'default'}>Reset colours</Button>
        </Box>
      </SettingsSection>
    </>
  );
}
