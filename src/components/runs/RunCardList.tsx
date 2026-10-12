/**
 * RunCardList.tsx — My Runs as a list of cards, for phones held upright.
 *
 * A data grid is hard to use on a narrow portrait screen (the Results column
 * is scrolled off to the right), so RunsPage swaps the grid for this list
 * when the screen is ≤ 600 px wide and in portrait. It offers the same things
 * as the grid:
 *   - a toolbar: search, sort (newest / oldest / name) and an Export menu
 *     (CSV of the list, PDF reports for the ticked or all completed runs);
 *   - a "Select all" box and a checkbox on every card (bulk delete uses the
 *     selection bar that RunsPage already shows above the list);
 *   - one card per run: name (+ status chip if not finished), place, a line of
 *     settings, created date, and buttons: View results, results tables, PDF
 *     report, and a ⋮ menu with Delete…;
 *   - 10 cards at first, then "Show more".
 * Selection lives in RunsPage (the same model the grid uses), so switching
 * between the grid and cards (e.g. rotating the phone) keeps the ticks.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, Divider, FormControlLabel, IconButton, InputAdornment, ListItemIcon, ListItemText,
  Menu, MenuItem, Paper, TextField, Tooltip, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import FileDownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InsightsIcon from '@mui/icons-material/Insights';
import TableChartIcon from '@mui/icons-material/TableChartOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PlaceIcon from '@mui/icons-material/PlaceOutlined';
import StatusChip from './StatusChip';
import { useColors } from '../../theme/colors';
import { inputToDisplay, type UnitSystem } from '../../theme/units';
import { nitrogenRate } from '../../data/options';
import type { Run } from '../../types';

/** How the cards are ordered. */
type SortKey = 'newest' | 'oldest' | 'name';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'name', label: 'Name (A–Z)' },
];
const PAGE = 10;

export interface RunCardListProps {
  runs: Run[];
  units: UnitSystem;
  isSelected: (id: string) => boolean;
  /** Tick or untick one run. */
  onToggle: (id: string) => void;
  /** Replace the selection with exactly these ids (empty = clear). */
  onSelectOnly: (ids: string[]) => void;
  selectedRuns: Run[];
  busy: boolean;
  onOpen: (run: Run) => void;
  onTables: (run: Run) => void;
  onPdf: (runs: Run[]) => void;
  onDelete: (run: Run) => void;
}

/** The settings line on a card and in the CSV (same wording as the grid columns). */
function nRateText(r: Run, units: UnitSystem) {
  if (!r.inputs.inorganicFertilizer) return 'No N';
  return `${Math.round(inputToDisplay('rate', nitrogenRate(r.inputs), units))} ${units === 'metric' ? 'kg/ha' : 'lb/ac'}`;
}
const created = (r: Run) => new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Download the (filtered, sorted) list as a CSV like the grid's Export → CSV. */
function downloadCsv(runs: Run[], units: UnitSystem) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    ['Run', 'Status', 'Location', 'Soil', 'N rate', 'Water', 'Years', 'Created'],
    ...runs.map((r) => [r.name, r.status, r.placeName, r.inputs.soilTexture, nRateText(r, units), r.inputs.irrigate ? 'Irrigated' : 'Rainfed', `${r.setup.startYear}–${r.setup.endYear}`, created(r)]),
  ];
  const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'SALUS-my-runs.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export default function RunCardList(p: RunCardListProps) {
  const c = useColors();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [shown, setShown] = useState(PAGE);
  const [sortEl, setSortEl] = useState<HTMLElement | null>(null);
  const [exportEl, setExportEl] = useState<HTMLElement | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; run: Run } | null>(null);

  // Search matches the same things the grid's quick search does: name, place and settings.
  const list = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (r: Run) => {
      const text = [r.name, r.placeName, r.inputs.soilTexture, r.inputs.irrigate ? 'irrigated' : 'rainfed', r.status, `${r.setup.startYear}`, `${r.setup.endYear}`].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    };
    const out = p.runs.filter(hit);
    out.sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : (sort === 'newest' ? -1 : 1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt)));
    return out;
  }, [p.runs, query, sort]);
  useEffect(() => setShown(PAGE), [query, sort]);

  const visible = list.slice(0, shown);
  const ticked = list.filter((r) => p.isSelected(r.id)).length;
  const allTicked = list.length > 0 && ticked === list.length;
  const completed = p.runs.filter((r) => r.status === 'complete');
  const selectedDone = p.selectedRuns.filter((r) => r.status === 'complete');
  // The "Help exporting" tour points at the PDF button of the first finished run.
  const firstDone = visible.find((r) => r.status === 'complete')?.id;

  return (
    <Box>
      {/* Toolbar: search, sort, export (tour target "runs-toolbar") */}
      <Box data-tour="runs-toolbar" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 1.5, pb: 1 }}>
        <TextField
          size="small"
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          slotProps={{
            htmlInput: { 'aria-label': 'Search runs', type: 'search' },
            input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
          }}
        />
        <Tooltip title="Sort">
          <IconButton aria-label={`Sort: ${SORTS.find((s) => s.key === sort)!.label}`} aria-haspopup="menu" onClick={(e) => setSortEl(e.currentTarget)} sx={{ width: 44, height: 44 }}>
            <SortIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export">
          <IconButton aria-label="Export" aria-haspopup="menu" onClick={(e) => setExportEl(e.currentTarget)} sx={{ width: 44, height: 44 }}>
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Menu anchorEl={sortEl} open={!!sortEl} onClose={() => setSortEl(null)}>
        {SORTS.map((s) => (
          <MenuItem key={s.key} selected={s.key === sort} onClick={() => { setSort(s.key); setSortEl(null); }}>{s.label}</MenuItem>
        ))}
      </Menu>
      <Menu anchorEl={exportEl} open={!!exportEl} onClose={() => setExportEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem disabled={!list.length} onClick={() => { setExportEl(null); downloadCsv(list, p.units); }}>
          <ListItemIcon><FileDownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Download as CSV" />
        </MenuItem>
        <Divider />
        <MenuItem disabled={p.busy || !selectedDone.length} onClick={() => { setExportEl(null); p.onPdf(selectedDone); }}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary={selectedDone.length ? `PDF report — ${selectedDone.length} selected` : 'PDF report — selected runs'}
            secondary={selectedDone.length ? undefined : 'Tick completed runs first'}
          />
        </MenuItem>
        <MenuItem disabled={p.busy || !completed.length} onClick={() => { setExportEl(null); p.onPdf(completed); }}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={`PDF reports — all completed (${completed.length})`} />
        </MenuItem>
      </Menu>

      {/* Select all + count */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, pb: 0.5 }}>
        <FormControlLabel
          sx={{ m: 0 }}
          control={
            <Checkbox
              checked={allTicked}
              indeterminate={ticked > 0 && !allTicked}
              disabled={!list.length}
              onChange={() => p.onSelectOnly(allTicked ? [] : list.map((r) => r.id))}
              // A native checkbox can't carry aria-checked (axe); its own
              // "indeterminate" state is read as "mixed" by screen readers.
              slotProps={{
                input: {
                  'aria-checked': undefined,
                  ref: (el: HTMLInputElement | null) => { if (el) el.indeterminate = ticked > 0 && !allTicked; },
                } as never,
              }}
            />
          }
          label={<Typography variant="body2">Select all</Typography>}
        />
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {query ? `${list.length} of ${p.runs.length} runs` : list.length === 1 ? '1 run' : `${list.length} runs`}
        </Typography>
      </Box>

      {/* The cards */}
      {list.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {p.runs.length ? 'No runs match your search.' : 'No runs yet — pick a field on the map to start one.'}
        </Typography>
      ) : (
        <Box component="ul" aria-label="Runs" sx={{ listStyle: 'none', m: 0, p: 1.5, pt: 0.5, display: 'grid', gap: 1.25 }}>
          {visible.map((r) => {
            const done = r.status === 'complete';
            const sel = p.isSelected(r.id);
            const titleId = `run-card-${r.id}`;
            return (
              <Paper
                key={r.id}
                component="li"
                variant="outlined"
                aria-labelledby={titleId}
                sx={{ p: 1.5, pl: 0.75, borderColor: sel ? 'primary.main' : 'divider', bgcolor: sel ? c.surfaceGreen : 'background.paper', borderWidth: sel ? 2 : 1 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Checkbox checked={sel} onChange={() => p.onToggle(r.id)} slotProps={{ input: { 'aria-label': `Select ${r.name}` } }} sx={{ mt: -0.5 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography id={titleId} component="h2" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{r.name}</Typography>
                      {!done && <StatusChip status={r.status} />}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <PlaceIcon sx={{ fontSize: '1rem' }} aria-hidden />
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.placeName}</Box>
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {r.inputs.soilTexture} · {nRateText(r, p.units)} · {r.inputs.irrigate ? 'Irrigated' : 'Rainfed'} · {r.setup.startYear}–{r.setup.endYear}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Created {created(r)}</Typography>
                  </Box>
                  <IconButton aria-label={`More actions for ${r.name}`} aria-haspopup="menu" onClick={(e) => setMenu({ el: e.currentTarget, run: r })} sx={{ width: 44, height: 44, mt: -0.75 }}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, pl: 0.75 }}>
                  <Button variant="contained" size="small" startIcon={<InsightsIcon />} disabled={!done} onClick={() => p.onOpen(r)} sx={{ minHeight: 40, flex: 1 }}>
                    View results
                  </Button>
                  <Tooltip title="Results tables">
                    <span>
                      <IconButton aria-label={`Results tables for ${r.name}`} disabled={!done} onClick={() => p.onTables(r)} sx={{ width: 44, height: 44 }}>
                        <TableChartIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Download PDF report">
                    <span>
                      <IconButton
                        {...(r.id === firstDone ? { 'data-tour': 'runs-pdf' } : {})}
                        aria-label={`Download PDF report for ${r.name}`}
                        disabled={!done || p.busy}
                        onClick={() => p.onPdf([r])}
                        sx={{ width: 44, height: 44 }}
                      >
                        <PictureAsPdfIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}
      {list.length > shown && (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Button fullWidth variant="outlined" onClick={() => setShown((n) => n + PAGE)}>
            Show more ({list.length - shown} more)
          </Button>
        </Box>
      )}
      <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem onClick={() => { const r = menu!.run; setMenu(null); p.onDelete(r); }}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Delete…" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
