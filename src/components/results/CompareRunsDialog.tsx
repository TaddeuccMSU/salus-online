/**
 * CompareRunsDialog.tsx — "Compare with another run": a pop-up table that puts
 * the results summary of 2–4 runs side by side.
 *
 * - Runs A–D: A starts as the run being viewed, B as the previous run at the
 *   same field (else the most recent other finished run). "Add a run" adds up
 *   to four; runs at the same field are listed first. Runs made with
 *   "Run new management" show up here straight away.
 * - Show: one statistic for every run (Best, Average, Median, Worst or Total),
 *   so e.g. only each run's Best values are compared.
 * - Filter results (Best Agronomic / Economic / Environmental): in each
 *   measure that counts for a goal, the run with the better value (by that
 *   measure's direction, e.g. lowest leaching, highest yield) is shaded in the
 *   goal's colour; ties shade every tied run; two goals split the cell.
 * - "What's different" lists the parameters that are not the same in all runs;
 *   hovering or focusing a run's column header shows all its parameters.
 *
 * Numbers come from the same mock summaries as the Results summary table.
 * Full-screen on phones.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  alpha, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, MenuItem, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { DataGrid, useGridApiRef, type GridColDef } from '@mui/x-data-grid';
import type { Run } from '../../types';
import { useUnits } from '../../state/UnitsContext';
import { useIsDark } from '../../theme/colors';
import { tokens } from '../../theme/tokens';
import { useManyRunResults } from '../../hooks/useRunResults';
import { sliceResults } from '../../data/sliceResults';
import { SUMMARY_ROWS, summaryRows, yearlyMetrics, type SummaryRow } from '../../data/resultsSummary';
import GoalFilter from './GoalFilter';
import { FILTERS_KEY, GOALS, STAT_COLUMNS, fmt, goalBackground, load, rowGoals, save, type GoalKey, type StatKey } from './summaryShared';
import { previousRunAtField, runParameters } from './ResultsSummaryPanel';

interface Props {
  run: Run;
  runs: Run[];
  open: boolean;
  onClose: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];
const MAX_RUNS = 4;
const COMPARE_STAT_KEY = 'salus-online.compareStat.v1';
const BETTER = Object.fromEntries(SUMMARY_ROWS.map((r) => [r.id, r.better])) as Record<string, 'high' | 'low'>;

/** One row of the compare table: a measure, with that statistic for each run (by run letter). */
type CompareRow = { id: string; metric: string } & Record<string, number | string | null>;

function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

export default function CompareRunsDialog({ run, runs, open, onClose }: Props) {
  const phone = useMediaQuery('(max-width: 600px)');
  const dark = useIsDark();
  const { units } = useUnits();

  // Finished runs, same field first (newest first within each group).
  const options = useMemo(() => {
    const done = runs.filter((r) => r.status === 'complete');
    const near = (r: Run) => metres(r.location, run.location) <= 250;
    return [...done].sort((a, b) => Number(near(b)) - Number(near(a)) || b.createdAt.localeCompare(a.createdAt));
  }, [runs, run.location]);

  const defaultB = previousRunAtField(run, runs)?.id ?? options.find((r) => r.id !== run.id)?.id;
  const [ids, setIds] = useState<string[]>(() => [run.id, ...(defaultB ? [defaultB] : [])]);
  const [stat, setStat] = useState<StatKey>(() => load(COMPARE_STAT_KEY, (v): v is StatKey => STAT_COLUMNS.some((s) => s.key === v), 'best'));
  const [goals, setGoals] = useState<GoalKey[]>(() => load(FILTERS_KEY, (v): v is GoalKey[] => Array.isArray(v) && v.every((k) => GOALS.some((g) => g.key === k)), []));
  const chooseStat = (v: StatKey) => { setStat(v); save(COMPARE_STAT_KEY, v); };
  const chooseGoals = (v: GoalKey[]) => { setGoals(v); save(FILTERS_KEY, v); };

  const picked = ids.map((id) => runs.find((r) => r.id === id)).filter((r): r is Run => !!r);
  const { results, error } = useManyRunResults(picked.map((r) => r.resultsFile));

  // Summary rows per run (each run's own years), in the user's units.
  const perRun = picked.map((r) => {
    const raw = results.get(r.resultsFile);
    return raw ? summaryRows(yearlyMetrics(sliceResults(raw, r.setup.startYear, r.setup.endYear), r.setup.datasetId), units, r.setup.datasetId) : null;
  });
  const ready = perRun.every(Boolean) && picked.length >= 2;

  const rows: CompareRow[] = ready
    ? (perRun[0] as SummaryRow[]).map((r0, i) => {
        const row: CompareRow = { id: r0.id, metric: r0.metric };
        picked.forEach((_, k) => { row[LETTERS[k]] = (perRun[k] as SummaryRow[])[i][stat]; });
        return row;
      })
    : [];

  /** Active goals that run `letter` wins in this row (best value among the runs; ties all win). */
  const winGoals = (row: CompareRow, letter: string): GoalKey[] => {
    const vals = picked.map((_, k) => row[LETTERS[k]]).filter((v): v is number => typeof v === 'number');
    const mine = row[letter];
    if (typeof mine !== 'number' || vals.length < 2) return [];
    const best = BETTER[row.id] === 'high' ? Math.max(...vals) : Math.min(...vals);
    if (Math.abs(mine - best) > 1e-9 || vals.every((v) => Math.abs(v - best) < 1e-9)) return []; // no winner when all equal
    const g = rowGoals(row.id);
    return GOALS.map((x) => x.key).filter((k) => g.includes(k) && goals.includes(k));
  };

  const shadeA = dark ? 0.55 : 0.38;
  const combos: GoalKey[][] = [['agro'], ['econ'], ['env'], ['agro', 'econ']];
  const winSx = Object.fromEntries(combos.flatMap((c) => {
    const bg = { background: `${goalBackground(c, shadeA)} !important`, fontWeight: 700 };
    return [[`& .MuiDataGrid-cell.win-${c.join('-')}`, bg], [`& .MuiDataGrid-row:hover .MuiDataGrid-cell.win-${c.join('-')}`, bg]];
  }));
  const GREEN = tokens.color.spartanGreen;
  const statLabel = STAT_COLUMNS.find((s) => s.key === stat)?.label ?? '';

  // Parameters that are not the same in every picked run.
  const params = picked.map((r) => runParameters(r, units));
  const diffs = params[0]?.map((p, i) => ({ label: p.label, values: params.map((ps) => ps[i].value) }))
    .filter((d) => new Set(d.values).size > 1) ?? [];
  const diffKeys = new Set(diffs.map((d) => d.label));
  // Which run header's parameter tooltip is open (mouse hover or keyboard focus on the header).
  const [headerTip, setHeaderTip] = useState<string | null>(null);
  const apiRef = useGridApiRef();
  useEffect(() => {
    if (!ready || !apiRef.current) return;
    const api = apiRef.current;
    const offFocus = api.subscribeEvent('columnHeaderFocus', (p) => setHeaderTip(LETTERS.includes(p.field) ? p.field : null));
    const offBlur = api.subscribeEvent('columnHeaderBlur', () => setHeaderTip(null));
    return () => { offFocus(); offBlur(); };
  }, [ready, apiRef]);

  const columns: GridColDef<CompareRow>[] = [
    { field: 'metric', headerName: `${statLabel} value`, flex: 2, minWidth: phone ? 140 : 200, sortable: false, cellClassName: 'summary-metric' },
    ...picked.map((r, k): GridColDef<CompareRow> => ({
      field: LETTERS[k], type: 'number', headerClassName: 'run-head', flex: 1, minWidth: phone ? 96 : 130, sortable: false,
      headerName: `${LETTERS[k]} · ${r.name}`,
      // Hover or keyboard-focus the header to see this run's parameters (ones that differ in bold); shown above the header (flips below when there is no room) so the results stay visible.
      renderHeader: () => (
        <Tooltip
          open={headerTip === LETTERS[k]} onOpen={() => setHeaderTip(LETTERS[k])} onClose={() => setHeaderTip((t) => (t === LETTERS[k] ? null : t))}
          arrow placement="top" describeChild
          slotProps={{ tooltip: { sx: { maxWidth: 340 } } }}
          title={
            <Box sx={{ py: 0.5 }}>
              <Box sx={{ fontWeight: 800, mb: 0.25 }}>Run {LETTERS[k]} · {r.name}</Box>
              <Box sx={{ opacity: 0.85, mb: 0.75 }}>{r.placeName}</Box>
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                {params[k].map((p) => {
                  const differs = diffKeys.has(p.label);
                  return (
                    <Box component="li" key={p.key} sx={{ fontWeight: differs ? 800 : 400 }}>
                      {p.label}: {p.value}{differs ? ' •' : ''}
                    </Box>
                  );
                })}
              </Box>
              {diffKeys.size > 0 && <Box sx={{ mt: 0.75, opacity: 0.85, fontSize: '0.75rem' }}>• differs between the runs</Box>}
            </Box>
          }
        >
          <Box sx={{ lineHeight: 1.2, textAlign: 'right', overflow: 'hidden', cursor: 'help', width: '100%' }}>
            <Box component="span" sx={{ fontWeight: 800, textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>Run {LETTERS[k]}</Box>
            <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{r.name}</Box>
          </Box>
        </Tooltip>
      ),
      valueFormatter: (v: number | null) => fmt(v),
      cellClassName: (p) => { const g = winGoals(p.row, LETTERS[k]); return g.length ? `win-${g.join('-')}` : ''; },
    })),
  ];


  const runLabel = (r: Run) => `${r.name} · ${r.setup.startYear}–${r.setup.endYear}${metres(r.location, run.location) <= 250 ? '' : ` · ${r.placeName}`}`;

  return (
    <Dialog open={open} onClose={onClose} fullScreen={phone} fullWidth maxWidth="lg" aria-labelledby="compare-runs-title">
      <DialogTitle id="compare-runs-title" sx={{ pr: 7 }}>
        Compare runs
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 12, top: 12 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Runs A–D */}
        <Box sx={{ display: 'grid', gap: 1.5, pt: 1, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) minmax(0, 1fr)' } }}>
          {ids.map((id, k) => (
            <Box key={k} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                select fullWidth size="small" label={`Run ${LETTERS[k]}`} value={id} sx={{ minWidth: 0 }}
                onChange={(e) => setIds((cur) => cur.map((x, j) => (j === k ? e.target.value : x)))}
              >
                {options.map((r) => (
                  <MenuItem key={r.id} value={r.id} disabled={ids.includes(r.id) && r.id !== id}>{runLabel(r)}</MenuItem>
                ))}
              </TextField>
              {ids.length > 2 && (
                <IconButton aria-label={`Remove run ${LETTERS[k]}`} onClick={() => setIds((cur) => cur.filter((_, j) => j !== k))}><CloseIcon /></IconButton>
              )}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {ids.length < MAX_RUNS && options.length > ids.length && (
            <Button
              size="small" startIcon={<AddIcon />}
              onClick={() => { const next = options.find((r) => !ids.includes(r.id)); if (next) setIds((cur) => [...cur, next.id]); }}
            >
              Add a run
            </Button>
          )}
          {options.length < 2 && (
            <Typography variant="body2" color="text.secondary">Make another run (e.g. with “Run new management”) to compare.</Typography>
          )}
        </Box>

        {/* Statistic + Filter results */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography id="compare-stat-label" variant="body2" sx={{ fontWeight: 600 }}>Show:</Typography>
            <ToggleButtonGroup exclusive size="small" value={stat} aria-labelledby="compare-stat-label" sx={{ flexWrap: 'wrap', gap: 0.5 }} onChange={(_, v: StatKey | null) => v && chooseStat(v)}>
              {STAT_COLUMNS.map((s) => <ToggleButton key={s.key} value={s.key}>{s.label}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>
          <GoalFilter value={goals} onChange={chooseGoals} />
        </Box>

        {error && <Typography color="error">{error}</Typography>}
        {ready ? (
          // A plain block wrapper lets the grid grow to its rows (inside the flex dialog it was clipped on phones).
          <Box sx={{ display: 'block', flexShrink: 0 }}>
          <DataGrid
            apiRef={apiRef}
            rows={rows}
            columns={columns}
            density="compact"
            hideFooter
            disableColumnMenu
            disableRowSelectionOnClick
            showToolbar
            columnHeaderHeight={52}
            getRowHeight={() => 'auto'}
            aria-label={`Compare runs: ${statLabel.toLowerCase()} of each measure`}
            sx={{
              flexShrink: 0, // full height inside the scrolling dialog (phones)
              // Run headers: the hover area for the parameters tooltip fills the whole header cell.
              '& .run-head .MuiDataGrid-columnHeaderTitleContainer, & .run-head .MuiDataGrid-columnHeaderTitleContainerContent': { flex: 1, width: '100%' },
              '& .MuiDataGrid-cell': { py: 0.75, bgcolor: alpha(GREEN, dark ? 0.25 : 0.05) },
              '& .MuiDataGrid-cell.summary-metric': { bgcolor: alpha(GREEN, dark ? 0.55 : 0.16), fontWeight: 700 },
              '& .MuiDataGrid-columnHeader, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller--header': { bgcolor: `${GREEN} !important`, color: '#fff' },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
              '& .MuiDataGrid-columnSeparator': { color: alpha('#fff', 0.3) },
              '& .MuiDataGrid-row:hover .MuiDataGrid-cell': { bgcolor: alpha(GREEN, dark ? 0.4 : 0.1) },
              '& .MuiDataGrid-row:hover .MuiDataGrid-cell.summary-metric': { bgcolor: alpha(GREEN, dark ? 0.7 : 0.22) },
              ...winSx,
            }}
          />
          </Box>
        ) : (
          picked.length >= 2 && !error && <Typography color="text.secondary">Loading results…</Typography>
        )}

        {/* What's different between the runs */}
        {picked.length >= 2 && (
          <Box>
            <Typography variant="overline" color="text.secondary" component="h3">What&apos;s different</Typography>
            {diffs.length ? (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {diffs.map((d) => (
                  <Typography component="li" variant="body2" key={d.label}>
                    <strong>{d.label}:</strong> {d.values.map((v, k) => `${LETTERS[k]} ${v}`).join(' · ')}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">These runs used the same parameters.</Typography>
            )}
          </Box>
        )}
        <Typography variant="caption" color="text.secondary">
          Demo: mock numbers, as in the Results summary (here only Irrigation and the years change them). Each run uses its own years.
          Filter results shades the run with the better value in each measure for the goals you pick.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
