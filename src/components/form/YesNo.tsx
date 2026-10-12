/**
 * YesNo.tsx — a labelled Yes / No segmented control.
 *
 * Replaces the tiny radio buttons on the old form with large, tappable
 * toggle buttons. `helper` shows a short explanation under the question;
 * `info` adds a "more info" link after the question that shows the text in a
 * tooltip (hover, keyboard focus, or tap on phones);
 * `badge` adds a lime "Changes results" chip (hover or focus it for the
 * Demo mode explanation, DemoNotice.tsx; used for answers that
 * switch the test dataset).
 */
import { useColors } from '../../theme/colors';
import DemoNoticeText from './DemoNotice';
import { Box, ButtonBase, Chip, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';

interface Props {
  label: string;
  helper?: string;
  /** Extra explanation shown in a tooltip from a "more info" link after the label. */
  info?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  badge?: boolean;
}

export default function YesNo({ label, helper, info, value, onChange, yesLabel = 'Yes', noLabel = 'No', badge }: Props) {
  const c = useColors(); // light or dark mode colours
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography sx={{ fontWeight: 600 }}>
          {label}
          {info && (
            <Tooltip title={info} describeChild arrow enterTouchDelay={0} leaveTouchDelay={6000}>
              <ButtonBase
                disableRipple
                sx={{
                  ml: 1, verticalAlign: 'baseline', font: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                  fontStyle: 'italic', color: 'primary.main', textDecoration: 'underline', textUnderlineOffset: 2,
                  borderRadius: 0.5,
                }}
              >
                more info
              </ButtonBase>
            </Tooltip>
          )}
          {badge && (
            <Tooltip title={<DemoNoticeText />} describeChild arrow enterTouchDelay={0} leaveTouchDelay={8000}>
              <Chip size="small" label="Changes results" tabIndex={0} sx={{ ml: 1, height: 20, bgcolor: c.accentSoft, color: c.accentDark, fontWeight: 700, cursor: 'help' }} />
            </Tooltip>
          )}
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
