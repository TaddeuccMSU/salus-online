/**
 * TextSizeSetting.tsx — the "Text size" section of a settings pop-over:
 * Default / Large for the whole app (state/TextSizeContext). Each option
 * shows a sample "Aa" at its size.
 */
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { TEXT_SIZE_LABELS, useTextSize, type TextSize } from '../../state/TextSizeContext';
import { SettingsSection } from './SettingsButton';

const SAMPLE: Record<TextSize, string> = { default: '0.9rem', large: '1.15rem' };

export default function TextSizeSetting() {
  const { textSize, setTextSize } = useTextSize();
  return (
    <SettingsSection title="Text size" note="Makes all text in SALUS Online bigger. Remembered in this browser.">
      <ToggleButtonGroup exclusive size="small" value={textSize} onChange={(_, v: TextSize | null) => v && setTextSize(v)} aria-label="Text size" sx={{ display: 'flex' }}>
        {(['default', 'large'] as TextSize[]).map((t) => (
          <ToggleButton key={t} value={t} sx={{ flex: 1, gap: 0.75 }}>
            <Box component="span" aria-hidden sx={{ fontSize: SAMPLE[t], fontWeight: 800, lineHeight: 1 }}>Aa</Box>
            {TEXT_SIZE_LABELS[t]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </SettingsSection>
  );
}
