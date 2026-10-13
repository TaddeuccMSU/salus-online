/**
 * ResultsSummaryPanel.tsx — the "Results summary" under the
 * Selected Field Results banner.
 *
 * Two parts, like the results page of the live SALUS Online site. The
 * parameters always show; only the table collapses (`tableOpen`).
 * 1. "Based on": the run's parameters. If an earlier run exists for the same
 *    field (within ~250 m), parameters that changed since it are highlighted
 *    in lime with the old value in a tooltip, so you can see what a re-run
 *    changed.
 * 2. "Results over N years" (collapsible), as a Table, or, when the panel is
 *    too narrow for the whole table, also as Cards (one card per measure; a
 *    Show filter picks the one statistic the cards show):
 *    Best / Average / Median / Worst / Total per
 *    measure, in an MUI X DataGrid (CSV export in its toolbar). The numbers
 *    come from data/resultsSummary.ts and are MOCK in this demo.
 *
 * It renders in the base (white / dark) theme even though it sits inside the
 * green results banner, like the other dialogs and pop-overs there.
 */
import { useMemo, useState } from 'react';
import { alpha, Box, Button, Collapse, ThemeProvider, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { useElementWidth } from '../../hooks/useElementWidth';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TuneIcon from '@mui/icons-material/Tune';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import type { Run, RunResults } from '../../types';
import { useAppTheme } from '../../theme/chrome';
import { useColors } from '../../theme/colors';
import { tokens } from '../../theme/tokens';
import { useUnits } from '../../state/UnitsContext';
import { inputToDisplay, inputUnit, nRateText, type UnitSystem } from '../../theme/units';
import { MATURITY, MONTHS, TILLAGE, productLabel, soilDepthLabel } from '../../data/options';
import { summaryRows, yearlyMetrics, type SummaryRow } from '../../data/resultsSummary';

interface Props {
  run: Run;
  runs: Run[];
  /** Results already cut to the run's years. */
  data: RunResults;
  /** Is the results table shown? (The parameters are always shown.) */
  tableOpen: boolean;
  /** Shows / hides the results table (button beside "Run new management"). */
  onToggleTable: () => void;
  /** Opens the "Run new management" pop-up (Set Management for this field). */
  onNewManagement: () => void;
}

const yn = (b: boolean) => (b ? 'Yes' : 'No');
const label = <T extends { value: unknown; label: string }>(list: readonly T[], val: unknown) => list.find((o) => o.value === val)?.label ?? String(val);

/** The run's parameters as labelled text, in the user's units (keys are stable for comparing runs). */
export function runParameters(run: Run, units: UnitSystem): { key: string; label: string; value: string }[] {
  const i = run.inputs;
  const pop = Math.round(inputToDisplay('population', i.plantPopulation, units)).toLocaleString('en-US');
  const rate = Math.round(inputToDisplay('rate', i.fertilizerRate, units)).toLocaleString('en-US');
  return [
    { key: 'soil', label: 'Soil', value: `${soilDepthLabel(i.soilDepth, units)} ${i.soilTexture}` },
    { key: 'cornUse', label: 'Grown for', value: i.cornUse === 'grain' ? 'Grain' : 'Silage' },
    { key: 'tillage', label: 'Tillage', value: label(TILLAGE, i.tillage) },
    { key: 'population', label: 'Plant population', value: `${pop} ${inputUnit('population', units)}` },
    { key: 'maturity', label: 'Hybrid maturity', value: label(MATURITY, i.maturityDays) },
    { key: 'planting', label: 'Planting date', value: `${label(MONTHS, i.plantingMonth)} ${i.plantingDay}` },
    { key: 'irrigate', label: 'Irrigation', value: yn(i.irrigate) },
    { key: 'coverCrop', label: 'Cover crop', value: yn(i.coverCrop) },
    {
      key: 'fertilizer', label: 'Inorganic fertilizer',
      value: !i.inorganicFertilizer ? 'No'
        : i.fertilizerBasis === 'product' ? `${rate} ${inputUnit('rate', units)} of ${productLabel(i.fertilizerProduct)}`
        : nRateText(i.fertilizerRate, units),
    },
    { key: 'manure', label: 'Manure / compost', value: yn(i.manure) },
    { key: 'years', label: 'Years', value: `${run.setup.startYear}–${run.setup.endYear}` },
  ];
}

/** Rough distance in metres between two points (fine for "same field" checks). */
function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** The most recent run made before this one at the same field (≤ 250 m away), if any. */
export function previousRunAtField(run: Run, runs: Run[]): Run | undefined {
  return runs
    .filter((r) => r.id !== run.id && r.createdAt < run.createdAt && metres(r.location, run.location) <= 250)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

/** Accent for the table's shading (Spartan Green tints). */
const GREEN = tokens.color.spartanGreen;

/** The statistics columns, in table order (also the Cards view's "Show" filter). */
const STAT_COLUMNS = [
  { key: 'best', label: 'Best' },
  { key: 'avg', label: 'Average' },
  { key: 'median', label: 'Median' },
  { key: 'worst', label: 'Worst' },
  { key: 'total', label: 'Total' },
] as const;
type StatKey = (typeof STAT_COLUMNS)[number]['key'];
type SummaryView = 'table' | 'cards';
const VIEW_KEY = 'salus-online.resultsSummaryView.v1';
const STAT_KEY = 'salus-online.resultsSummaryStat.v1';
/** The statistic the cards show first (one at a time). */
const DEFAULT_STAT: StatKey = 'avg';
/** Narrowest width the table fits in without side-scrolling (its columns' minimum widths + borders); narrower → Cards. */
const TABLE_MIN_WIDTH = 230 + 5 * 96 + 2;

/** Reads a remembered choice (browser storage may be blocked or hold old data). */
function load<T>(key: string, ok: (v: unknown) => v is T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    const v: unknown = raw ? JSON.parse(raw) : undefined;
    return ok(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked: choice lasts this visit */ }
}

const fmt = (v: number | null) => (v === null ? '–' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function ResultsSummaryPanel({ run, runs, data, tableOpen, onToggleTable, onNewManagement }: Props) {
  const theme = useAppTheme();
  const c = useColors();
  const { units } = useUnits();
  const dark = theme.palette.mode === 'dark';
  // Cards are offered only when the panel is too narrow for the whole table (it would side-scroll);
  // there they start as the view. Wider panels always get the table. The narrow-panel choice and the
  // cards' statistic are remembered.
  const { ref: widthRef, width } = useElementWidth<HTMLDivElement>(1600);
  const small = width < TABLE_MIN_WIDTH;
  const [savedView, setSavedView] = useState<SummaryView | null>(() => load<SummaryView | null>(VIEW_KEY, (v): v is SummaryView => v === 'table' || v === 'cards', null));
  const view: SummaryView = small ? savedView ?? 'cards' : 'table';
  const chooseView = (v: SummaryView) => { setSavedView(v); save(VIEW_KEY, v); };
  const [stat, setStat] = useState<StatKey>(() => load(STAT_KEY, (v): v is StatKey => STAT_COLUMNS.some((s) => s.key === v), DEFAULT_STAT));
  const chooseStat = (v: StatKey) => { setStat(v); save(STAT_KEY, v); };
  const statLabel = STAT_COLUMNS.find((s) => s.key === stat)?.label ?? '';

  const params = runParameters(run, units);
  const prev = previousRunAtField(run, runs);
  const prevParams = prev ? new Map(runParameters(prev, units).map((p) => [p.key, p.value])) : undefined;
  const changed = params.filter((p) => prevParams && prevParams.get(p.key) !== p.value);

  const rows = useMemo(() => summaryRows(yearlyMetrics(data, run.setup.datasetId), units, run.setup.datasetId), [data, run.setup.datasetId, units]);
  const nYears = run.setup.endYear - run.setup.startYear + 1;
  const num = (field: keyof SummaryRow, headerName: string): GridColDef<SummaryRow> => ({
    field, headerName, type: 'number', flex: 1, minWidth: 96, sortable: false,
    valueFormatter: (v: number | null) => fmt(v),
  });
  const columns: GridColDef<SummaryRow>[] = [
    { field: 'metric', cellClassName: 'summary-metric', headerClassName: 'summary-metric-header', headerName: `Results over ${nYears} year${nYears > 1 ? 's' : ''} (${run.setup.startYear}–${run.setup.endYear})`, flex: 2, minWidth: 230, sortable: false },
    num('best', 'Best'), num('avg', 'Average'), num('median', 'Median'), num('worst', 'Worst'), num('total', 'Total'),
  ];

  return (
    <ThemeProvider theme={theme}>
      <Box data-tour="results-summary" sx={{ bgcolor: 'background.paper', color: 'text.primary', borderTop: 1, borderColor: 'divider' }}>
        <Box ref={widthRef} sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 }, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 1 · Parameters, with changes since the previous run at this field highlighted */}
          <Box data-tour="results-parameters">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="overline" color="text.secondary" component="h2" sx={{ flex: 1 }}>Based on these parameters</Typography>
            </Box>
            <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {params.map((p) => {
                const was = prevParams?.get(p.key);
                const isChanged = !!prevParams && was !== p.value;
                const item = (
                  <Box
                    key={p.key}
                    component="li"
                    tabIndex={isChanged ? 0 : undefined}
                    sx={{
                      px: 1, py: 0.25, borderRadius: 1, fontSize: '0.875rem', border: 1,
                      borderColor: isChanged ? c.accentDark : 'divider',
                      bgcolor: isChanged ? c.accentSoft : 'transparent',
                    }}
                  >
                    <Box component="span" sx={{ color: 'text.secondary' }}>{p.label}: </Box>
                    <Box component="span" sx={{ fontWeight: 600, color: isChanged ? c.accentDark : 'text.primary' }}>{p.value}</Box>
                    {isChanged && <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> (changed, was {was})</Box>}
                  </Box>
                );
                return isChanged ? <Tooltip key={p.key} title={`Was: ${was}`} describeChild arrow>{item}</Tooltip> : item;
              })}
            </Box>
            {/* Bottom row: what changed since the previous run (left); "Run new management" and Show / Hide results table (bottom right; not in the collapsible table). */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', mt: 0.75 }}>
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
                {prev && (changed.length
                  ? <>Highlighted: {changed.length} parameter{changed.length > 1 ? 's' : ''} changed since “{prev.name}”, the previous run at this field (hover for the old value).</>
                  : <>Same parameters as “{prev.name}”, the previous run at this field.</>)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 'auto' }}>
                <Button data-tour="run-new-management" variant="contained" color="secondary" startIcon={<TuneIcon />} onClick={onNewManagement} aria-haspopup="dialog">
                  Run new management
                </Button>
                {/* Shows / hides only the results table below. */}
                <Button
                  variant="outlined" startIcon={tableOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  data-tour="results-table-toggle"
                  onClick={onToggleTable} aria-expanded={tableOpen} aria-controls="results-summary-table"
                >
                  {tableOpen ? 'Hide results table' : 'Show results table'}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* 2 · Best / Average / Median / Worst / Total (collapsible; the parameters above always show) */}
          <Collapse in={tableOpen} unmountOnExit id="results-summary-table">
          <Box>
            {/* Narrow panel only (the table would need side-scrolling): Table or Cards, then one statistic to show on the cards. */}
            {small && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
              <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v: SummaryView | null) => v && chooseView(v)} aria-label="Results view">
                <ToggleButton value="table">Table</ToggleButton>
                <ToggleButton value="cards">Cards</ToggleButton>
              </ToggleButtonGroup>
              {view === 'cards' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography id="summary-stats-label" variant="body2" sx={{ fontWeight: 600 }}>Show:</Typography>
                  {/* One statistic at a time. */}
                  <ToggleButtonGroup
                    exclusive size="small" value={stat} aria-labelledby="summary-stats-label" sx={{ flexWrap: 'wrap', gap: 0.5 }}
                    onChange={(_, v: StatKey | null) => v && chooseStat(v)}
                  >
                    {STAT_COLUMNS.map((s) => <ToggleButton key={s.key} value={s.key}>{s.label}</ToggleButton>)}
                  </ToggleButtonGroup>
                </Box>
              )}
            </Box>
            )}
            {view === 'cards' ? (
              <Box component="ul" aria-label={`Results summary over ${nYears} years: ${statLabel.toLowerCase()}`} sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                {/* Measures with the chosen statistic first (in table order), then the "Not available" ones (also in table order). */}
                {[...rows.filter((r) => r[stat] !== null), ...rows.filter((r) => r[stat] === null)].map((r) => {
                  const v = r[stat];
                  return (
                    <Box component="li" key={r.id} sx={{ borderRadius: 2, overflow: 'hidden', border: 1, borderColor: tokens.color.spartanGreen, bgcolor: alpha(GREEN, dark ? 0.25 : 0.05), display: 'flex', flexDirection: 'column' }}>
                      {/* Card title in the table header's dark Spartan Green */}
                      <Typography component="h3" sx={{ px: 1.5, py: 1, fontWeight: 700, fontSize: '0.875rem', lineHeight: 1.3, bgcolor: tokens.color.spartanGreen, color: '#fff', flex: 1 }}>{r.metric}</Typography>
                      {v !== null ? (
                        <Box sx={{ px: 1.5, py: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{statLabel}</Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '1.25rem', fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1 }}>
                          Not available
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              density="compact"
              hideFooter
              disableColumnMenu
              disableRowSelectionOnClick
              showToolbar
              getRowHeight={() => 'auto'}
              aria-label={`Results summary over ${nYears} years`}
              // Green accent shading: Spartan Green header row, a deeper tint on the
              // result-type column and a light tint on the Best…Total columns.
              sx={{
                '& .MuiDataGrid-cell': { py: 0.75, bgcolor: alpha(GREEN, dark ? 0.25 : 0.05) },
                '& .MuiDataGrid-cell.summary-metric': { bgcolor: alpha(GREEN, dark ? 0.55 : 0.16), fontWeight: 700 },
                '& .MuiDataGrid-columnHeader, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller--header': { bgcolor: `${tokens.color.spartanGreen} !important`, color: '#fff' },
                '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
                '& .MuiDataGrid-columnSeparator': { color: alpha('#fff', 0.3) },
                '& .MuiDataGrid-row:hover .MuiDataGrid-cell': { bgcolor: alpha(GREEN, dark ? 0.4 : 0.1) },
                '& .MuiDataGrid-row:hover .MuiDataGrid-cell.summary-metric': { bgcolor: alpha(GREEN, dark ? 0.7 : 0.22) },
              }}
            />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              Demo: mock numbers. N leaching follows the sample&apos;s daily data; yield, water balance, emissions and soil values are invented for this prototype.
              Best and worst follow what is better for each measure (e.g. lowest leaching, highest yield).
            </Typography>
          </Box>
          </Collapse>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
