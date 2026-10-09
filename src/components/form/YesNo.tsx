/**
 * YesNo.tsx — a labelled Yes / No segmented control.
 *
 * Replaces the tiny radio buttons on the old form with large, tappable
 * toggle buttons. `helper` shows a short explanation under the question;
 * `badge` adds a lime "Changes results" chip (used for answers that
 * switch the test dataset).
 */
import { useColors } from '../../theme/colors';
import { Box, Chip, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

interface Props {
  label: string;
  helper?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  badge?: boolean;
}

export default function YesNo({ label, helper, value, onChange, yesLabel = 'Yes', noLabel = 'No', badge }: Props) {
  const c = useColors(); // light or dark mode colours
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography sx={{ fontWeight: 600 }}>
          {label}
          {badge && <Chip size="small" label="Changes results" sx={{ ml: 1, height: 20, bgcolor: c.accentSoft, color: c.accentDark, fontWeight: 700 }} />}
        </Typography>
        {helper && <Typography variant="body2" color="text.secondary">{helper}</Typography>}
      </Box>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value ? 'yes' : 'no'}
        onChange={(_, v: string | null) => v && onChange(v === 'yes')}
        aria-label={label}
      >
        <ToggleButton value="yes" sx={{ minWidth: 72 }}>{yesLabel}</ToggleButton>
        <ToggleButton value="no" sx={{ minWidth: 72 }}>{noLabel}</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
