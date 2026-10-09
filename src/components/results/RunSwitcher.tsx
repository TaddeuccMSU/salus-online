/**
 * RunSwitcher.tsx — "Run ▾" menu button in the results header for jumping to
 * another run's results.
 *
 * It replaced a select box that opened the chosen run as soon as it was picked
 * (a change of page on input, WCAG 3.2.2). Now it's a menu of LINKS: opening a
 * link is expected to change the page, and screen readers announce it as one.
 * Runs that haven't finished are listed but disabled.
 */
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CheckIcon from '@mui/icons-material/Check';
import type { Run } from '../../types';

export default function RunSwitcher({ run, runs }: { run: Run; runs: Run[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = 'run-switcher-menu';
  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-controls={anchor ? id : undefined}
        endIcon={<ArrowDropDownIcon />}
        sx={{ minWidth: 260, maxWidth: 360, justifyContent: 'space-between', textAlign: 'left', py: 0.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="span" sx={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, opacity: 0.8, lineHeight: 1.3 }}>Switch run</Typography>
          <Typography component="span" noWrap sx={{ display: 'block', fontWeight: 600, lineHeight: 1.3 }}>{run.name}</Typography>
        </Box>
      </Button>
      <Menu id={id} anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {runs.map((r) => (
          <MenuItem
            key={r.id}
            component={RouterLink}
            to={`/runs/${r.id}/results`}
            disabled={r.status !== 'complete'}
            selected={r.id === run.id}
            aria-current={r.id === run.id ? 'page' : undefined}
            onClick={() => setAnchor(null)}
          >
            <ListItemIcon>{r.id === run.id && <CheckIcon fontSize="small" />}</ListItemIcon>
            {r.name}
            {r.status !== 'complete' && <Typography component="span" variant="caption" sx={{ ml: 1 }}>(not finished)</Typography>}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
