/**
 * UnitsSetting.tsx — the "Units" section of a settings pop-over: a
 * Metric / US customary switch. It's ONE global setting (state/UnitsContext),
 * so changing it here changes every chart, the PDF report and the
 * Set Management form at once.
 */
import { ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useUnits } from '../../state/UnitsContext';
import { UNIT_SYSTEM_LABELS, type UnitSystem } from '../../theme/units';
import { SettingsSection } from './SettingsButton';

const EXAMPLES: Record<UnitSystem, string> = {
  metric: 'kg N/ha · mm · cm · seeds/ha',
  us: 'lb N/acre · inches · seeds/acre',
};

export default function UnitsSetting() {
  const { units, setUnits } = useUnits();
  return (
    <SettingsSection title="Units" note="Applies to all charts, PDF reports and the Set Management form.">
      <ToggleButtonGroup exclusive size="small" value={units} onChange={(_, v: UnitSystem | null) => v && setUnits(v)} aria-label="Units" sx={{ display: 'flex' }}>
        {(['metric', 'us'] as UnitSystem[]).map((u) => (
          <ToggleButton key={u} value={u} sx={{ flex: 1 }}>{UNIT_SYSTEM_LABELS[u]}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{EXAMPLES[units]}</Typography>
    </SettingsSection>
  );
}
