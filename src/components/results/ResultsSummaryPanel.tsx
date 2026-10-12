/**
 * ResultsSummaryPanel.tsx — the collapsible "Results summary" under the
 * Selected Field Results banner.
 *
 * Two parts, like the results page of the live SALUS Online site:
 * 1. "Based on": the run's parameters. If an earlier run exists for the same
 *    field (within ~250 m), parameters that changed since it are highlighted
 *    in lime with the old value in a tooltip, so you can see what a re-run
 *    changed.
 * 2. "Results over N years": Best / Average / Median / Worst / Total per
 *    measure, in an MUI X DataGrid (CSV export in its toolbar). The numbers
 *    come from data/resultsSummary.ts and are MOCK in this demo.
 *
 * It renders in the base (white / dark) theme even though it sits inside the
 * green results banner, like the other dialogs and pop-overs there.
 */
import { useMemo } from 'react';
import { alpha, Box, Button, ThemeProvider, Tooltip, Typography } from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
  /** Collapses the panel (the "Collapse" button at its top right). */
  onCollapse: () => void;
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

const fmt = (v: number | null) => (v === null ? '–' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function ResultsSummaryPanel({ run, runs, data, onCollapse }: Props) {
  const theme = useAppTheme();
  const c = useColors();
  const { units } = useUnits();
  const dark = theme.palette.mode === 'dark';

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
        <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 }, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 1 · Parameters, with changes since the previous run at this field highlighted */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="overline" color="text.secondary" component="h2" sx={{ flex: 1 }}>Based on these parameters</Typography>
              {/* Same as the banner's "Results summary" button: closes this panel. */}
              <Button size="small" startIcon={<ExpandLessIcon />} onClick={onCollapse} aria-controls="results-summary-panel" aria-label="Collapse results summary">
                Collapse
              </Button>
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
            {prev && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {changed.length
                  ? <>Highlighted: {changed.length} parameter{changed.length > 1 ? 's' : ''} changed since “{prev.name}”, the previous run at this field (hover for the old value).</>
                  : <>Same parameters as “{prev.name}”, the previous run at this field.</>}
              </Typography>
            )}
          </Box>

          {/* 2 · Best / Average / Median / Worst / Total */}
          <Box>
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
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              Demo: mock numbers. N leaching follows the sample&apos;s daily data; yield, water balance, emissions and soil values are invented for this prototype.
              Best and worst follow what is better for each measure (e.g. lowest leaching, highest yield).
            </Typography>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
