/**
 * StepsBarSetting.tsx — the "Steps bar" section of the top-bar Settings
 * pop-out: a switch to show or hide the "1 Select field · 2 Set Management ·
 * 3 Results" bar (WizardStepper). The bar's own ✕ turns it off; this is how
 * people turn it back on. Remembered in this browser (hooks/useStepsBar.ts).
 */
import { FormControlLabel, Switch } from '@mui/material';
import { useStepsBar } from '../../hooks/useStepsBar';
import { SettingsSection } from './SettingsButton';

export default function StepsBarSetting() {
  const [shown, setShown] = useStepsBar();
  return (
    <SettingsSection title="Steps bar" note="The 1 · 2 · 3 bar (Select field, Set Management, Results) shown while you make a run.">
      <FormControlLabel
        control={<Switch checked={shown} onChange={(e) => setShown(e.target.checked)} color="secondary" />}
        label={shown ? 'Shown' : 'Hidden'}
        sx={{ ml: 0, gap: 1 }}
      />
    </SettingsSection>
  );
}
