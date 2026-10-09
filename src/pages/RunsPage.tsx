/**
 * RunsPage.tsx — route "/runs" — My Runs.
 *
 * Lists every saved run in an MUI X DataGrid (the free, MIT-licensed tier):
 * sortable columns, quick search, checkbox selection and pagination. A small
 * map above the grid shows where the runs are; clicking a pin or a row's
 * "Results" button opens Selected Field Results.
 *
 * PDF reports: each completed row has a PDF button, and the toolbar's
 * Export (download) menu adds "PDF report" items for the selected rows or
 * all completed runs next to the built-in Print and CSV options.
 *
 * Results tables: a table icon in each completed row opens RunTablesDialog,
 * the PDF report's tables on screen (season by season, key results, nitrate
 * snapshots), each downloadable as CSV.
 *
 * Bulk delete: tick runs (or the header box for the whole page) and a
 * selection bar appears above the grid: "N runs selected · Clear selection ·
 * Delete selected". Deleting (bulk, or one run from its row menu) asks for
 * confirmation first (DeleteRunsDialog) and then shows an "Undo" toast for
 * 8 seconds; screen readers hear both.
 *
 * Phones held upright (≤ 600 px wide, portrait): the grid is replaced by a
 * list of cards (RunCardList) with the same search, sort, export, selection
 * and per-run actions. Selection is shared, so rotating the phone keeps ticks.
 */
import { useColors } from '../theme/colors';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Divider, ListItemIcon, ListItemText, MenuItem, Paper, Snackbar, Typography, useMediaQuery } from '@mui/material';
import { DataGrid, GridActionsCellItem, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid';
// The default v9 toolbar lives in /internals; it's the only way to add items to
// its Export menu without rebuilding the toolbar. Re-check on MUI X upgrades.
import { GridToolbar, type GridToolbarProps } from '@mui/x-data-grid/internals';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdfOutlined';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import InsightsIcon from '@mui/icons-material/Insights';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PageContainer from '../components/layout/PageContainer';
import FieldMap from '../components/map/FieldMap';
import StatusChip from '../components/runs/StatusChip';
import ReportSnackbar from '../components/runs/ReportSnackbar';
import DeleteRunsDialog from '../components/runs/DeleteRunsDialog';
import RunTablesDialog from '../components/runs/RunTablesDialog';
import RunCardList from '../components/runs/RunCardList';
import TableChartIcon from '@mui/icons-material/TableChartOutlined';
import { useAnnounce } from '../state/AnnouncerContext';
import { useReportDownloads } from '../report/useReportDownloads';
import { useRuns } from '../state/RunsContext';
import { useUnits } from '../state/UnitsContext';
import { inputToDisplay } from '../theme/units';
import { useTour } from '../tour/TourProvider';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import type { Run } from '../types';

const EMPTY_SELECTION: GridRowSelectionModel = { type: 'include', ids: new Set() };

/** Extra props we pass to the grid toolbar so its Export menu can offer PDFs. */
interface PdfToolbarProps {
  selectedRuns: Run[];
  completedRuns: Run[];
  busy: boolean;
  onPdf: (runs: Run[]) => void;
}

/**
 * The standard grid toolbar (columns, filters, export, quick search) with two
 * extra items at the bottom of its Export menu: PDF reports for the selected
 * runs, and for every completed run.
 */
function RunsToolbar(props: GridToolbarProps & PdfToolbarProps) {
  const { selectedRuns, completedRuns, busy, onPdf, ...rest } = props;
  const selectedDone = selectedRuns.filter((r) => r.status === 'complete');
  // The grid's quick-search box only has a placeholder ("Search…"), which isn't a
  // label (WCAG 1.3.1 / 3.3.2). Give it a real accessible name, and keep it if the
  // toolbar re-renders the input.
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const label = () => box.querySelectorAll('input[type="text"], input[type="search"]').forEach((i) => {
      if (!i.getAttribute('aria-label')) i.setAttribute('aria-label', 'Search runs');
    });
    label();
    const mo = new MutationObserver(label);
    mo.observe(box, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return (
    // The wrapper also gives the "Help exporting" tour something to spotlight.
    <Box data-tour="runs-toolbar" ref={boxRef}>
    <GridToolbar
      {...rest}
      additionalExportMenuItems={(close) => [
        <Divider key="div" />,
        <MenuItem key="sel" disabled={busy || !selectedDone.length} onClick={() => { close(); onPdf(selectedDone); }}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary={selectedDone.length ? `PDF report — ${selectedDone.length} selected` : 'PDF report — selected runs'}
            secondary={selectedDone.length ? undefined : 'Tick completed runs first'}
          />
        </MenuItem>,
        <MenuItem key="all" disabled={busy || !completedRuns.length} onClick={() => { close(); onPdf(completedRuns); }}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary={`PDF reports — all completed (${completedRuns.length})`} />
        </MenuItem>,
      ]}
    />
    </Box>
  );
}

export default function RunsPage() {
  const c = useColors(); // light or dark mode colours
  const navigate = useNavigate();
  const { runs, deleteRuns, restoreRuns } = useRuns();
  const announce = useAnnounce();
  // Bulk delete: confirm first (dialog), then offer Undo for a few seconds.
  const [pendingDelete, setPendingDelete] = useState<Run[] | null>(null);
  const [undo, setUndo] = useState<Run[] | null>(null);
  /** Run whose results tables (the PDF report's tables, on screen) are open. */
  const [tablesRun, setTablesRun] = useState<Run | null>(null);
  const confirmDelete = () => {
    if (!pendingDelete) return;
    const gone = pendingDelete;
    deleteRuns(gone.map((r) => r.id));
    setSelection(EMPTY_SELECTION);
    setPendingDelete(null);
    setUndo(gone);
    announce(`${gone.length === 1 ? '1 run' : `${gone.length} runs`} deleted. Undo is available.`);
  };
  const undoDelete = () => {
    if (!undo) return;
    restoreRuns(undo);
    announce(`${undo.length === 1 ? '1 run' : `${undo.length} runs`} restored.`);
    setUndo(null);
  };
  const [selection, setSelection] = useState<GridRowSelectionModel>(EMPTY_SELECTION);
  // The grid's selection model can be "include these ids" or, after the
  // header "select all" box, "exclude these ids" (= everything else is selected).
  const isSelected = (id: string) => (selection.type === 'exclude' ? !selection.ids.has(id) : selection.ids.has(id));
  const selectedRuns = runs.filter((r) => isSelected(r.id));
  const selectedIds = selectedRuns.map((r) => r.id);
  const reports = useReportDownloads();
  const { units } = useUnits(); // N rate column follows the Metric / US setting
  const { startTour } = useTour();
  /** Phones held upright get cards instead of the grid. */
  const cards = useMediaQuery('(max-width:600px) and (orientation: portrait)');
  /** Tick or untick one run (works with both "include" and "exclude" models). */
  const toggleRun = (id: string) =>
    setSelection((s) => {
      const ids = new Set(s.ids);
      if (ids.has(id)) ids.delete(id); else ids.add(id);
      return { type: s.type, ids };
    });

  /** Column definitions — `valueGetter` flattens nested run.inputs for sorting/search. */
  const columns = useMemo<GridColDef<Run>[]>(
    () => [
      // Run name. There is no Status column: finished runs show just the name, and
      // only runs that aren't finished yet (Queued / Running / Failed) get a small
      // status chip after the name, so the unusual cases still stand out.
      {
        field: 'name',
        headerName: 'Run',
        flex: 1.4,
        minWidth: 170,
        renderCell: (p) =>
          p.row.status === 'complete' ? (
            p.row.name
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', minWidth: 0 }}>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.row.name}</Box>
              <StatusChip status={p.row.status} />
            </Box>
          ),
      },
      { field: 'placeName', headerName: 'Location', flex: 1, minWidth: 120 },
      { field: 'soil', headerName: 'Soil', width: 110, valueGetter: (_v, r) => r.inputs.soilTexture },
      { field: 'nRate', headerName: 'N rate', type: 'number', width: 90, valueGetter: (_v, r) => (r.inputs.inorganicFertilizer ? Math.round(inputToDisplay('rate', r.inputs.fertilizerRate, units)) : 0), valueFormatter: (v: number) => (v ? `${v} ${units === 'metric' ? 'kg/ha' : 'lb/ac'}` : '—') },
      { field: 'water', headerName: 'Water', width: 95, valueGetter: (_v, r) => (r.inputs.irrigate ? 'Irrigated' : 'Rainfed') },
      { field: 'period', headerName: 'Years', width: 100, valueGetter: (_v, r) => `${r.setup.startYear}–${r.setup.endYear}` },
      { field: 'createdAt', headerName: 'Created', type: 'dateTime', width: 115, valueGetter: (v: string) => new Date(v), valueFormatter: (v: Date) => v.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Results',
        width: 148,
        getActions: (p) => [
          <GridActionsCellItem key="view" icon={<InsightsIcon />} label="View results" disabled={p.row.status !== 'complete'} onClick={() => navigate(`/runs/${p.row.id}/results`)} />,
          <GridActionsCellItem key="tables" icon={<TableChartIcon />} label="View results tables" disabled={p.row.status !== 'complete'} onClick={() => setTablesRun(p.row)} />,
          <GridActionsCellItem key="pdf" {...{ 'data-tour': 'runs-pdf' }} icon={<PictureAsPdfIcon />} label="Download PDF report" disabled={p.row.status !== 'complete' || reports.busy} onClick={() => reports.download([p.row])} />,
          <GridActionsCellItem key="del" icon={<DeleteOutlineIcon />} label="Delete…" onClick={() => setPendingDelete([p.row])} showInMenu />,
        ],
      },
    ],
    [navigate, reports.busy, reports.download, units],
  );

  return (
    <PageContainer
      title="My Runs"
      intro="Every SALUS run you've started. Open a completed run to explore nitrogen and water day by day."
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Starts the short "Help exporting" tour (src/tour/HowToTourConfig.ts). */}
          <Button startIcon={<HelpOutlineIcon />} onClick={() => startTour('helpExporting')}>Help exporting</Button>
          <Button variant="contained" startIcon={<AddLocationAltIcon />} onClick={() => navigate('/')}>New run</Button>
        </Box>
      }
    >
      <Paper sx={{ height: 260, overflow: 'hidden', mb: 2.5 }}>
        <FieldMap
          compact
          runs={runs}
          initialView={runs[0] ? { latitude: runs[0].location.lat, longitude: runs[0].location.lng, zoom: 9 } : undefined}
          onRunClick={(r) => navigate(`/runs/${r.id}/results`)}
        />
      </Paper>
      <Paper data-tour="runs-grid" sx={{ overflow: 'hidden' }}>
        {/* Selection bar: appears when rows are ticked (bulk actions) */}
        {selectedIds.length > 0 && (
          <Box
            role="region"
            aria-label="Selected runs"
            sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, px: 2, py: 1, bgcolor: c.surfaceGreen, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 140 }}>
              {selectedIds.length === 1 ? '1 run selected' : `${selectedIds.length} runs selected`}
            </Typography>
            <Button size="small" onClick={() => setSelection(EMPTY_SELECTION)}>Clear selection</Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setPendingDelete(selectedRuns)}
            >
              Delete selected ({selectedIds.length})
            </Button>
          </Box>
        )}
        {cards ? (
          <RunCardList
            runs={runs}
            units={units}
            isSelected={isSelected}
            onToggle={toggleRun}
            onSelectOnly={(ids) => setSelection({ type: 'include', ids: new Set(ids) })}
            selectedRuns={selectedRuns}
            busy={reports.busy}
            onOpen={(r) => navigate(`/runs/${r.id}/results`)}
            onTables={setTablesRun}
            onPdf={reports.download}
            onDelete={(r) => setPendingDelete([r])}
          />
        ) : (
          <DataGrid
            rows={runs}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={selection}
            onRowSelectionModelChange={setSelection}
            onRowDoubleClick={(p) => navigate(`/runs/${p.id}/results`)}
            showToolbar
            slots={{ toolbar: RunsToolbar as never }}
            slotProps={{
              toolbar: {
                selectedRuns,
                completedRuns: runs.filter((r) => r.status === 'complete'),
                busy: reports.busy,
                onPdf: reports.download,
              } as never,
            }}
            initialState={{
              sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            autoHeight
            localeText={{ noRowsLabel: 'No runs yet — pick a field on the map to start one.' }}
          />
        )}
      </Paper>
      <ReportSnackbar status={reports.status} onClose={reports.clear} />
      <RunTablesDialog run={tablesRun} onClose={() => setTablesRun(null)} />
      <DeleteRunsDialog runs={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
      {/* "N runs deleted · Undo" toast (8 s) */}
      <Snackbar
        open={!!undo}
        autoHideDuration={8000}
        onClose={(_, reason) => { if (reason !== 'clickaway') setUndo(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={undo ? (undo.length === 1 ? '1 run deleted' : `${undo.length} runs deleted`) : ''}
        action={<Button color="secondary" size="small" onClick={undoDelete}>Undo</Button>}
      />
    </PageContainer>
  );
}
