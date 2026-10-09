/**
 * ReportSnackbar.tsx — bottom-left toast showing PDF export progress / result.
 * Pass the `status` and `onClose` from useReportDownloads.
 */
import { Alert, CircularProgress, Snackbar } from '@mui/material';
import type { ReportStatus } from '../../report/useReportDownloads';

export default function ReportSnackbar({ status, onClose }: { status: ReportStatus | null; onClose: () => void }) {
  return (
    <Snackbar
      open={!!status}
      onClose={(_, reason) => reason !== 'clickaway' && status?.kind !== 'working' && onClose()}
      autoHideDuration={status?.kind === 'working' ? null : 5000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Alert
        severity={status?.kind === 'error' ? 'error' : status?.kind === 'done' ? 'success' : 'info'}
        icon={status?.kind === 'working' ? <CircularProgress size={18} /> : undefined}
        onClose={status?.kind === 'working' ? undefined : onClose}
        variant="filled"
        sx={{ minWidth: 300 }}
      >
        {status?.message}
      </Alert>
    </Snackbar>
  );
}
