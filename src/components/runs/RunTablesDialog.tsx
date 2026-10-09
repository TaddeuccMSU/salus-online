/**
 * RunTablesDialog.tsx — "Results tables" for one run, opened from My Runs.
 *
 * Shows the same tables as the PDF run report, as real on-screen tables
 * (readable by screen readers, zoomable, copyable), in three tabs:
 *   - Season by season   rain, irrigation, fertilizer N, plant N uptake,
 *                        N leached, soil nitrate on Dec 31, lowest PESW,
 *                        per year, plus a Total row
 *   - Key results        the whole-run totals (the PDF's tiles)
 *   - Nitrate snapshots  soil nitrate by depth on May 1, Jul 1 and Oct 15 of
 *                        each year
 * Numbers come from the PDF's own maths (report/reportData.ts) in the user's
 * units (Metric / US). Each tab can be downloaded as a CSV file.
 */
import { useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Skeleton, Tab, Tabs, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import ChartDataTable from '../results/ChartDataTable';
import { useRunResults } from '../../hooks/useRunResults';
import { buildReportData, scaleReportData } from '../../report/reportData';
import { useUnits } from '../../state/UnitsContext';
import { fmtNum, layerLabel, unitOf } from '../../theme/units';
import { useAppTheme } from '../../theme/chrome';
import type { Run } from '../../types';

type TabId = 'season' | 'totals' | 'snapshots';
interface TableSpec {
  caption: string;
  columns: { label: string; numeric?: boolean }[];
  rows: string[][];
}

/** One table → CSV text (quoted where needed). */
function toCsv(t: TableSpec): string {
  const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return [t.columns.map((c) => q(c.label)), ...t.rows.map((r) => r.map((c) => q(c.replace(/,/g, ''))))].map((r) => r.join(',')).join('\n');
}

function downloadCsv(name: string, t: TableSpec) {
  const url = URL.createObjectURL(new Blob([toCsv(t)], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function RunTablesDialog({ run, onClose }: { run: Run | null; onClose: () => void }) {
  const theme = useAppTheme(); // light or dark base theme (never a green bar's)
  const [tab, setTab] = useState<TabId>('season');
  const { units } = useUnits();
  const { data: results, error } = useRunResults(run?.resultsFile);

  const tables = useMemo<Record<TabId, TableSpec> | null>(() => {
    if (!run || !results) return null;
    const d = scaleReportData(buildReportData(run, results), units);
    const W = unitOf('water', units);
    const N = unitOf('nArea', units);
    const C = unitOf('conc', units);
    const D = unitOf('depth', units);
    const w = (v: number) => fmtNum(v, units === 'metric' ? 0 : 1);
    const n0 = (v: number) => fmtNum(v, 0);
    const n1 = (v: number) => fmtNum(v, 1);
    const t = d.totals;
    const depths = d.layers.map((l) => layerLabel(l.top, l.bottom, units));
    return {
      season: {
        caption: `Season by season, ${run.name}`,
        columns: [{ label: 'Year' }, { label: `Rain (${W})`, numeric: true }, { label: `Irrigation (${W})`, numeric: true }, { label: `Fertilizer N (${N})`, numeric: true }, { label: `Plant N uptake (${N})`, numeric: true }, { label: `N leached (${N})`, numeric: true }, { label: `Soil nitrate Dec 31 (${N})`, numeric: true }, { label: `Lowest PESW (${W})`, numeric: true }],
        rows: [
          ...d.annual.map((r) => [r.year, w(r.rain), w(r.irrigation), n0(r.fertilizer), n0(r.uptake), n1(r.leached), n0(r.soilNitrateEnd), w(r.lowestPesw)]),
          ['Total', w(t.rain), w(t.irrigation), n0(t.fertilizer), n0(t.uptake), n1(t.leached), '', ''],
        ],
      },
      totals: {
        caption: `Key results for the whole run, ${run.name}`,
        columns: [{ label: 'Measure' }, { label: 'Value', numeric: true }, { label: 'Unit' }],
        rows: [
          ['Plant N uptake', n0(t.uptake), N],
          ['Nitrate leached', n1(t.leached), N],
          ['Fertilizer N applied', n0(t.fertilizer), N],
          ['Rainfall', w(t.rain), W],
          ['Irrigation', w(t.irrigation), W],
          ['Seasons simulated', String(d.annual.length), ''],
        ],
      },
      snapshots: {
        caption: `Soil nitrate by depth (${C}) on May 1, Jul 1 and Oct 15, ${run.name}`,
        columns: [{ label: 'Year' }, { label: 'Date' }, ...depths.map((dl) => ({ label: `${dl} ${D}`, numeric: true }))],
        rows: d.snapshots.map((s) => [s.year, s.label, ...(s.values ? s.values.map((v) => n1(v)) : depths.map(() => '–'))]),
      },
    };
  }, [run, results, units]);

  const current = tables?.[tab];
  const fileBase = (run?.name ?? 'run').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

  return (
    // Base theme: opened from anywhere, always the white dialog style.
    <ThemeProvider theme={theme}>
      <Dialog open={!!run} onClose={onClose} maxWidth="lg" fullWidth aria-labelledby="run-tables-title">
        <DialogTitle id="run-tables-title" sx={{ pr: 7 }}>
          Results tables
          <Typography component="span" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary' }}>{run?.name}</Typography>
          <IconButton onClick={onClose} aria-label="Close results tables" sx={{ position: 'absolute', right: 12, top: 12 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <Box sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v: TabId) => setTab(v)} aria-label="Results tables" variant="scrollable" allowScrollButtonsMobile>
            <Tab value="season" label="Season by season" id="tab-season" aria-controls="panel-tables" />
            <Tab value="totals" label="Key results" id="tab-totals" aria-controls="panel-tables" />
            <Tab value="snapshots" label="Nitrate snapshots" id="tab-snapshots" aria-controls="panel-tables" />
          </Tabs>
        </Box>
        <DialogContent id="panel-tables" role="tabpanel" aria-labelledby={`tab-${tab}`} sx={{ pt: '16px !important' }}>
          {error ? (
            <Alert severity="error">{error}</Alert>
          ) : !current ? (
            <Skeleton variant="rounded" height={240} />
          ) : (
            <>
              <ChartDataTable caption={current.caption} columns={current.columns} rows={current.rows} maxHeight={480} />
              {tab === 'season' && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Plant N uptake and N leached are the increase within each calendar year (SALUS reports them as running totals). PESW = plant-extractable soil water.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button startIcon={<DownloadIcon />} disabled={!current} onClick={() => current && downloadCsv(`SALUS-${fileBase}-${tab}.csv`, current)}>
            Download this table (CSV)
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" onClick={onClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
