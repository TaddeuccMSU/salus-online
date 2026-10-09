/**
 * DeleteRunsDialog.tsx — "Delete N runs?" confirmation for My Runs.
 *
 * Shown before deleting one run (row menu) or many (bulk delete from the
 * selection bar). Lists the runs by name (the first 8, then "and N more") so
 * nobody deletes the wrong ones, and says that results and PDF reports for
 * them go too. Deleting can still be undone for a few seconds from the
 * "Undo" toast on My Runs.
 */
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, List, ListItem, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import type { Run } from '../../types';

const SHOW = 8;

export default function DeleteRunsDialog({ runs, onCancel, onConfirm }: { runs: Run[] | null; onCancel: () => void; onConfirm: () => void }) {
  const count = runs?.length ?? 0;
  const what = count === 1 ? 'this run' : `these ${count} runs`;
  return (
    <Dialog open={!!runs && count > 0} onClose={onCancel} maxWidth="xs" fullWidth aria-labelledby="delete-runs-title" aria-describedby="delete-runs-text">
      <DialogTitle id="delete-runs-title">{count === 1 ? 'Delete 1 run?' : `Delete ${count} runs?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-runs-text">
          This removes {what} and their results from My Runs. You can undo it for a few seconds afterwards.
        </DialogContentText>
        <List dense sx={{ mt: 1, py: 0, listStyle: 'disc', pl: 2.5 }}>
          {runs?.slice(0, SHOW).map((r) => (
            <ListItem key={r.id} sx={{ display: 'list-item', py: 0.25, px: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
            </ListItem>
          ))}
        </List>
        {count > SHOW && <Typography variant="body2" color="text.secondary">…and {count - SHOW} more</Typography>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} autoFocus>Cancel</Button>
        <Button color="error" variant="contained" startIcon={<DeleteOutlineIcon />} onClick={onConfirm}>
          {count === 1 ? 'Delete run' : `Delete ${count} runs`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
