/**
 * NewManagementDialog.tsx — "Run new management" on the results page.
 *
 * Opens the Set Management form in a pop-up for the SAME field as the run
 * being viewed, pre-filled with that run's answers and years, so you can
 * change a few things and run again. Run SALUS creates the new run and opens
 * its results; the Results summary then highlights what changed.
 * Full-screen on phones; Esc, ✕ or Cancel closes it without running.
 */
import { Dialog, ThemeProvider, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { Run } from '../../types';
import { useAppTheme } from '../../theme/chrome';
import { useRuns } from '../../state/RunsContext';
import SetManagementPanel from '../runs/SetManagementPanel';

interface Props {
  run: Run;
  open: boolean;
  onClose: () => void;
}

export default function NewManagementDialog({ run, open, onClose }: Props) {
  const theme = useAppTheme();
  const phone = useMediaQuery('(max-width: 600px)');
  const navigate = useNavigate();
  const { createRun } = useRuns();
  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="sm"
        aria-label={`Run new management for ${run.placeName}`}
        slotProps={{ paper: { sx: { height: phone ? '100%' : 'min(92vh, 900px)', overflow: 'hidden' } } }}
      >
        {/* Mounted only while open, so each opening starts again from this run's answers. */}
        {open && (
          <SetManagementPanel
            location={run.location}
            placeName={run.placeName}
            initial={{ setup: run.setup, inputs: run.inputs }}
            context={{ overline: 'Run new management · same field', hint: `Starts from “${run.name}”` }}
            onClose={onClose}
            onSubmit={(setup, inputs) => {
              const next = createRun(run.location, run.placeName, setup, inputs);
              onClose();
              navigate(`/runs/${next.id}/results`);
            }}
          />
        )}
      </Dialog>
    </ThemeProvider>
  );
}
