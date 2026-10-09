/**
 * StatusChip.tsx — coloured pill for a run's status (Queued / Running / Complete / Failed).
 */
import { Chip, CircularProgress } from '@mui/material';
import type { RunStatus } from '../../types';
import { tokens } from '../../theme/tokens';
import { useIsDark } from '../../theme/colors';

type Style = Record<RunStatus, { label: string; bg: string; fg: string }>;
const STYLE: Style = {
  queued: { label: 'Queued', bg: '#EEF2EF', fg: tokens.color.textMuted },
  running: { label: 'Running', bg: tokens.color.accentSoft, fg: tokens.color.accentDark },
  complete: { label: 'Complete', bg: tokens.color.surfaceGreen, fg: tokens.color.spartanGreen },
  failed: { label: 'Failed', bg: '#FDE7E2', fg: '#B3261E' },
};
// Dark mode: deep tinted pills with light text (all ≥ 7:1).
const DARK_STYLE: Style = {
  queued: { label: 'Queued', bg: '#1B4038', fg: '#C9D9D1' },
  running: { label: 'Running', bg: '#2A3D10', fg: '#9BD94A' },
  complete: { label: 'Complete', bg: '#1B4038', fg: '#9BD94A' },
  failed: { label: 'Failed', bg: '#3A1716', fg: '#F4A3A0' },
};

export default function StatusChip({ status }: { status: RunStatus }) {
  const s = (useIsDark() ? DARK_STYLE : STYLE)[status];
  return (
    <Chip
      size="small"
      label={s.label}
      icon={status === 'running' ? <CircularProgress size={12} aria-hidden sx={{ color: s.fg }} /> : undefined}
      sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 700 }}
    />
  );
}
