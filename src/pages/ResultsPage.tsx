/**
 * ResultsPage.tsx — route "/runs/:runId/results" — Selected Field Results.
 *
 * The NShow visualisation, rebuilt in the Spartan White style:
 *  0. 3-step stepper (only when arriving straight from Set Management)
 *  1. Run header, following the chrome colour scheme (field mini-map — click to enlarge — name, place, key inputs, run switcher)
 *  2. Date filter bar pinned at the top (play, ‹ period ›, Month/Year/All, slider)
 *  3. Soil Nitrate Profile · Soil Water · Nitrogen Budget cards
 *  4. Weather & Management Events strip (click to jump to a day)
 * Cards can be re-ordered by dragging their ⠿ handle (SortableCardGrid; the
 * order is remembered for all runs by useCardOrder, "Reset layout" undoes it).
 * Each chart card has an expand button (opens ExpandedChartDialog: the chart
 * nearly full-screen with the date bar and ‹ › to switch charts) and a ⚙ (ChartSettingsButton): colour-blind-safe or custom
 * colours per chart, and the global Metric / US units switch. Values are
 * converted for display only (theme/units.ts); choices are remembered.
 * Only the years chosen in Set Management are shown. If the run is still
 * queued/running, a progress card shows instead.
 */
import { useColors, useVisibleEventColors, type EventColors } from '../theme/colors';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Alert, Box, Button, Chip, Collapse, IconButton, LinearProgress, Paper, Skeleton, Tooltip, Typography } from '@mui/material';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ResultsSummaryPanel from '../components/results/ResultsSummaryPanel';
import PageContainer from '../components/layout/PageContainer';
import SectionCard from '../components/layout/SectionCard';
import Legend from '../components/layout/Legend';
import DateFilterBar from '../components/results/DateFilterBar';
import NitrateProfileChart from '../components/charts/NitrateProfileChart';
import StackedGaugeChart from '../components/charts/StackedGaugeChart';
import EventsTimeline from '../components/charts/EventsTimeline';
import WizardStepper from '../components/layout/WizardStepper';
import FieldMiniMap from '../components/results/FieldMiniMap';
import { ChromeSurface, softPrimary } from '../theme/chrome';
import { useRuns } from '../state/RunsContext';
import { useRunResults } from '../hooks/useRunResults';
import { nitrogenRate } from '../data/options';
import { sliceResults } from '../data/sliceResults';
import { useDateWindow } from '../hooks/useDateWindow';
import { nitrateRamp } from '../theme/chartColors';
import { useChartColors } from '../state/ChartColorsContext';
import ChartSettingsButton from '../components/results/ChartSettingsButton';
import ExpandedChartDialog from '../components/results/ExpandedChartDialog';
import ChartDataTable from '../components/results/ChartDataTable';
import LabelChartFocus from '../components/charts/LabelChartFocus';
import type { ChartView } from '../components/results/ChartSettingsButton';
import RunSwitcher from '../components/results/RunSwitcher';
import SortableCardGrid from '../components/results/SortableCardGrid';
import { useCardOrder } from '../hooks/useCardOrder';
import { useAnnounce, usePageTitle } from '../state/AnnouncerContext';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import type { ChartId } from '../theme/chartColors';
import { useUnits } from '../state/UnitsContext';
import { factorOf, fmtNum, layerLabel, nRateText, unitOf } from '../theme/units';
import { useTour, useTourAction } from '../tour/TourProvider';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';

/**
 * Big lime-accent number shown top-right on a card (dark lime for legibility on white).
 * Its width never changes while the date plays: digits are equal-width
 * (tabular figures) and an invisible copy of `reserve` (the widest value this
 * run can show) holds the space, so the card title/subtitle beside it don't
 * re-wrap from day to day.
 */
function Headline({ value, unit, reserve }: { value: string; unit: string; reserve?: string }) {
  const c = useColors(); // light or dark mode colours
  return (
    <Typography sx={{ fontWeight: 800, fontSize: '1.625rem', lineHeight: 1, color: c.accentDark, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline' }}>
      {/* Both strings share one grid cell; the cell is as wide as the wider one. */}
      <Box component="span" sx={{ display: 'inline-grid', justifyItems: 'end' }}>
        <Box component="span" sx={{ gridArea: '1 / 1' }}>{value}</Box>
        {reserve && <Box component="span" aria-hidden sx={{ gridArea: '1 / 1', visibility: 'hidden' }}>{reserve}</Box>}
      </Box>
      <Typography component="span" sx={{ fontSize: '0.875rem', fontWeight: 600, ml: 0.5, color: 'text.secondary' }}>{unit}</Typography>
    </Typography>
  );
}

/**
 * The widest text fmtNum can produce for values from 0 up to `max` (it uses
 * more decimals for small numbers, so e.g. "99.9" is wider than "245").
 */
function widestNum(max: number, decimals?: number): string {
  const tries = [max, 99.9, 9.99, 0.99].filter((v) => v <= max).map((v) => fmtNum(v, decimals));
  return tries.reduce((w, t) => (t.length > w.length ? t : w), '');
}

/** Legend for the two "current vs. run maximum" charts, in that chart's colours. */
const gaugeLegend = (c: Record<string, string>) => [
  { label: 'Current day', color: c.current },
  { label: 'Run maximum', color: c.max, mark: 'hatched' as const },
];

/** One results chart card (see `cards` in ResultsPage). */
interface ResultCard {
  id: ChartId;
  /** Takes a whole row in the card grid. */
  wide?: boolean;
  /** Relative width when sharing a row. */
  weight: number;
  tourId: string;
  title: string;
  subtitle: string;
  headline?: ReactNode;
  legend: ReactNode;
  /** Draws the chart; `height` given = expanded view, otherwise the card's default size. */
  render: (height?: number) => ReactNode;
  /** One plain sentence with the chart's main numbers (shown under it, read by screen readers). */
  summary: string;
  /** The same numbers as an accessible table (the "Table" view in Chart settings). */
  table: () => ReactNode;
}

const VIEWS_KEY = 'salus-online.chartViews.v1';
/** Chart / Table choice per chart, remembered in this browser. */
function useChartViews() {
  const [views, setViews] = useState<Partial<Record<ChartId, ChartView>>>(() => {
    try { return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? '{}'); } catch { return {}; }
  });
  const setView = (id: ChartId, v: ChartView) => setViews((old) => {
    const next = { ...old, [id]: v };
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(next)); } catch { /* not remembered */ }
    return next;
  });
  return { views, setView };
}

/** The cards' order before anyone rearranges them. */
const DEFAULT_CARD_ORDER: ChartId[] = ['nitrate', 'water', 'nbudget', 'events'];

/** Headline number + the chart's controls, side by side in the card corner (order: Expand, Settings, Move). */
function CardCorner({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>{children}</Box>;
}

/** localStorage key: is the Results summary panel open? */
const SUMMARY_KEY = 'salus-online.resultsSummaryOpen.v1';

export default function ResultsPage() {
  const { runId = '' } = useParams();
  const navigate = useNavigate();
  const { runs, getRun } = useRuns();
  const run = getRun(runId);
  const ready = run?.status === 'complete';
  const fromWizard = !!(useLocation().state as { fromWizard?: boolean } | null)?.fromWizard;
  const { data: raw, error } = useRunResults(ready ? run?.resultsFile : undefined);

  // Cut the run's simulation period out of the results (totals restart and maximums rescale; see sliceResults).
  const data = useMemo(() => (raw && run ? sliceResults(raw, run.setup.startYear, run.setup.endYear) : raw), [raw, run]);
  const ctl = useDateWindow(data?.days);
  // Results summary panel under the banner: open/closed is remembered in this browser.
  const [summaryOpen, setSummaryOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(SUMMARY_KEY) === '1'; } catch { return false; }
  });
  const toggleSummary = () => setSummaryOpen((o) => {
    try { localStorage.setItem(SUMMARY_KEY, o ? '0' : '1'); } catch { /* storage blocked: fine */ }
    return !o;
  });
  const { day, window: w } = ctl;
  // Product tour: "Do it for me" on the date step moves ~a month ahead; clicks on the events strip count as moving the date.
  const { emit, startTour } = useTour();
  /** Index of the chart open in the click-to-expand dialog (null = closed). */
  const [expanded, setExpanded] = useState<number | null>(null);
  const layout = useCardOrder(DEFAULT_CARD_ORDER);
  const { views, setView } = useChartViews();
  usePageTitle(run ? `Results: ${run.name}` : 'Run not found');
  const announce = useAnnounce();
  // Tell screen-reader users when a queued/running run finishes while they wait here.
  const wasReady = useRef(ready);
  useEffect(() => {
    if (ready && !wasReady.current) announce('Run complete. Results are ready.');
    wasReady.current = ready;
  }, [ready, announce]);
  // Keyboard focus must never land under the sticky app bar + date bar (WCAG 2.4.11):
  // make the browser keep that much room at the top when it scrolls to a focused element.
  const dateBarRef = useRef<HTMLDivElement>(null);
  const hasDateBar = !!(data && day);
  useEffect(() => {
    const bar = dateBarRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const update = () => {
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 72;
      root.style.scrollPaddingTop = `${Math.round(header + bar.getBoundingClientRect().height + 16)}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      root.style.scrollPaddingTop = ''; // back to the theme default (app bar only)
    };
  }, [hasDateBar]);
  // User-chosen chart colours (palette button on each card; colour-blind presets).
  const { colors } = useChartColors();
  const ramp = nitrateRamp(colors.nitrate);
  const ev = useVisibleEventColors(colors.events as unknown as EventColors); // dark mode swaps colours that wouldn't show
  // Display units (global Metric / US switch). Data stays metric; these convert for display.
  const { units } = useUnits();
  const wf = factorOf('water', units);
  const nf = factorOf('nArea', units);
  const wUnit = unitOf('water', units);
  const nUnit = unitOf('nArea', units);
  const concUnit = unitOf('conc', units);
  const layerLabels = (data?.layers ?? []).map((l) => layerLabel(l.top, l.bottom, units));
  const deepest = data?.layers.length ? data.layers[data.layers.length - 1].bottom : 150;
  useTourAction('nudgeDate', () => ctl.setIndex(Math.min((data?.days.length ?? 1) - 1, ctl.index + 30)));

  // Fixed y-axis for the nitrate profile across the visible window (stable while
  // scrubbing). Uses the 90th percentile of daily peaks so one fertilizer spike
  // doesn't flatten every other day; taller bars simply run to the edge.
  const profileMax = useMemo(() => {
    if (!data) return 10;
    const peaks: number[] = [];
    for (let i = w.start; i <= w.end; i++) peaks.push(Math.max(...data.days[i].conc));
    peaks.sort((a, b) => a - b);
    const m = Math.max(1, peaks[Math.floor(peaks.length * 0.9)] ?? 1);
    const nice = m > 50 ? 25 : m > 10 ? 5 : 1;
    return Math.ceil((m * 1.1) / nice) * nice;
  }, [data, w.start, w.end]);

  if (!run) {
    return (
      <PageContainer title="Run not found">
        <Alert severity="warning" action={<Button onClick={() => navigate('/runs')}>My Runs</Button>}>
          This run doesn't exist or was deleted.
        </Alert>
      </PageContainer>
    );
  }

  const header = (
    <>
    {fromWizard && <WizardStepper active={2} />}
    <ChromeSurface>
    <Box data-tour="results-header" sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 }, py: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <FieldMiniMap run={run} />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="overline" color="text.secondary">Selected field results</Typography>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>{run.name}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
            {[run.placeName, run.inputs.soilTexture, run.inputs.irrigate ? 'Irrigated' : 'Rainfed',
              run.inputs.inorganicFertilizer ? nRateText(nitrogenRate(run.inputs), units) : 'No inorganic N',
              `${run.setup.startYear}–${run.setup.endYear}`].map((t) => (
              <Chip key={t} size="small" label={t} sx={{ bgcolor: softPrimary(0.12), color: 'primary.main', fontWeight: 600 }} />
            ))}
          </Box>
        </Box>
        {/* Opens / closes the Results summary table under this banner (remembered in this browser). */}
        {ready && data && (
          <Button
            variant="outlined" startIcon={<TableChartOutlinedIcon />}
            endIcon={<ExpandMoreIcon sx={{ transform: summaryOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />}
            aria-expanded={summaryOpen} aria-controls="results-summary-panel"
            onClick={() => toggleSummary()}
          >
            Results summary
          </Button>
        )}
        {/* Starts the "Explain results" tour (content in src/tour/HowToTourConfig.ts). */}
        <Button data-tour="explain-results" variant="outlined" startIcon={<HelpOutlineIcon />} onClick={() => startTour('explainResults')}>
          Explain results
        </Button>
        <RunSwitcher run={run} runs={runs} />
      </Box>
      {run.setup.description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 }, pb: 2, mt: -1 }}>
          {run.setup.description}
        </Typography>
      )}
      {ready && data && (
        <Collapse in={summaryOpen} unmountOnExit id="results-summary-panel">
          <ResultsSummaryPanel run={run} runs={runs} data={data} />
        </Collapse>
      )}
    </Box>
    </ChromeSurface>
    </>
  );

  // Run still in progress.
  if (!ready) {
    return (
      <>
        {header}
        <PageContainer maxWidth={720}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6">SALUS is {run.status === 'queued' ? 'queued' : 'simulating your field'}…</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>This page updates automatically when results are ready.</Typography>
            <LinearProgress color="secondary" />
          </Paper>
        </PageContainer>
      </>
    );
  }

  /**
   * The four results charts, described once so the page grid and the
   * click-to-expand dialog draw exactly the same thing. `render(height?)`
   * draws the chart at its card height, or taller when expanded.
   */
  // --- Plain-words summaries and table rows (WCAG 1.1.1: the charts' text alternative) ---
  const dateText = day ? dayjs(day.date).format('MMM D, YYYY') : '';
  const depthUnit = unitOf('depth', units);
  const n = (v: number, d = 1) => fmtNum(v, d);
  const peakLayer = day ? day.conc.indexOf(Math.max(...day.conc)) : 0;
  const windowEvents = data && day
    ? data.events.filter((e) => e.date >= data.days[w.start].date && e.date <= data.days[w.end].date && (e.rain > 0 || e.irrigation > 0 || e.fertilizer > 0))
    : [];
  const sum = (k: 'rain' | 'irrigation' | 'fertilizer') => windowEvents.reduce((t, e) => t + e[k], 0);
  const countOf = (k: 'rain' | 'irrigation' | 'fertilizer') => windowEvents.filter((e) => e[k] > 0).length;
  const fertDates = windowEvents.filter((e) => e.fertilizer > 0).map((e) => dayjs(e.date).format('MMM D'));
  const windowText = data ? `${dayjs(data.days[w.start].date).format('MMM D, YYYY')} to ${dayjs(data.days[w.end].date).format('MMM D, YYYY')}` : '';
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  /** Jump every chart to a day from the events table. */
  const showDay = (date: string) => {
    const i = data?.days.findIndex((d) => d.date === date) ?? -1;
    if (i >= 0) { ctl.setIndex(i); emit('dateChanged'); }
  };

  const cardList: ResultCard[] = data && day ? [
    {
      id: 'nitrate',
      weight: 1.15,
      tourId: 'chart-nitrate',
      title: 'Soil nitrate profile',
      subtitle: `Nitrate-N concentration · ${concUnit} · ${dayjs(day.date).format('MMM D, YYYY')}`,
      legend: <Legend items={[{ label: 'Shallow', color: ramp[0] }, { label: `Deep (${fmtNum(deepest * factorOf('depth', units), 0)} ${unitOf('depth', units)})`, color: ramp[ramp.length - 1] }]} />,
      render: (h) => <NitrateProfileChart height={h} layers={data.layers} values={day.conc} yMax={profileMax} ramp={ramp} layerLabels={layerLabels} depthUnit={unitOf('depth', units)} concUnit={concUnit} />,
      summary: `${dateText}: nitrate is highest at ${layerLabels[peakLayer]} ${depthUnit} (${n(day.conc[peakLayer])} ${concUnit}); the deepest layer, ${layerLabels[layerLabels.length - 1]} ${depthUnit}, has ${n(day.conc[day.conc.length - 1])}.`,
      table: () => (
        <ChartDataTable
          caption={`Soil nitrate by depth, ${dateText}`}
          columns={[{ label: `Soil depth (${depthUnit})` }, { label: `Nitrate-N (${concUnit})`, numeric: true }]}
          rows={layerLabels.map((l, i) => [l, n(day.conc[i])])}
        />
      ),
    },
    {
      id: 'water',
      weight: 0.7,
      tourId: 'chart-water',
      title: 'Soil water',
      subtitle: `Plant-extractable soil water · ${wUnit}`,
      headline: <Headline value={fmtNum(day.pesw * wf)} unit={wUnit} reserve={widestNum(data.maximums.pesw * wf)} />,
      legend: <Legend items={gaugeLegend(colors.water)} />,
      render: (h) => <StackedGaugeChart height={h} unit={wUnit} items={[{ label: 'PESW', current: day.pesw * wf, max: data.maximums.pesw * wf }]} currentColor={colors.water.current} maxColor={colors.water.max} />,
      summary: `${dateText}: ${n(day.pesw * wf)} ${wUnit} of plant-available water, ${pct(day.pesw, data.maximums.pesw)}% of this run's maximum (${n(data.maximums.pesw * wf)} ${wUnit}).`,
      table: () => (
        <ChartDataTable
          caption={`Soil water, ${dateText}`}
          columns={[{ label: 'Measure' }, { label: `Current day (${wUnit})`, numeric: true }, { label: `Run maximum (${wUnit})`, numeric: true }, { label: '% of maximum', numeric: true }]}
          rows={[['Plant-extractable soil water', n(day.pesw * wf), n(data.maximums.pesw * wf), `${pct(day.pesw, data.maximums.pesw)}%`]]}
        />
      ),
    },
    {
      id: 'nbudget',
      weight: 1.15,
      tourId: 'chart-nbudget',
      title: 'Nitrogen budget',
      subtitle: `${nUnit} · current day vs. run maximum`,
      headline: <Headline value={fmtNum(day.plantN * nf, 0)} unit={`${nUnit.replace(' N', '')} plant N`} reserve={widestNum(data.maximums.plantN * nf, 0)} />,
      legend: <Legend items={gaugeLegend(colors.nbudget)} />,
      render: (h) => (
        <StackedGaugeChart
          height={h}
          unit={nUnit}
          items={[
            { label: 'Soil nitrate', current: day.soilN * nf, max: data.maximums.soilN * nf },
            { label: 'Plant nitrogen', current: day.plantN * nf, max: data.maximums.plantN * nf },
            { label: 'Leached nitrogen', current: day.leachN * nf, max: Math.max(1, data.maximums.leachN) * nf },
          ]}
          currentColor={colors.nbudget.current}
          maxColor={colors.nbudget.max}
        />
      ),
      summary: `${dateText}: soil nitrate ${n(day.soilN * nf, 0)}, plant nitrogen ${n(day.plantN * nf, 0)} and leached nitrogen ${n(day.leachN * nf, 0)} ${nUnit} (run maximums ${n(data.maximums.soilN * nf, 0)}, ${n(data.maximums.plantN * nf, 0)} and ${n(data.maximums.leachN * nf, 0)}).`,
      table: () => (
        <ChartDataTable
          caption={`Nitrogen budget, ${dateText}`}
          columns={[{ label: 'Pool' }, { label: `Current day (${nUnit})`, numeric: true }, { label: `Run maximum (${nUnit})`, numeric: true }, { label: '% of maximum', numeric: true }]}
          rows={([['Soil nitrate', day.soilN, data.maximums.soilN], ['Plant nitrogen', day.plantN, data.maximums.plantN], ['Leached nitrogen', day.leachN, data.maximums.leachN]] as const).map(([label, v, m]) => [label, n(v * nf, 0), n(m * nf, 0), `${pct(v, m)}%`])}
        />
      ),
    },
    {
      id: 'events',
      wide: true,
      weight: 1,
      tourId: 'chart-events',
      title: 'Weather & management events',
      subtitle: 'Click or drag to jump to a day',
      legend: <Legend items={[{ label: `Rain (${wUnit})`, color: ev.rain }, { label: `Irrigation (${wUnit})`, color: ev.irrigation, mark: 'cap' as const }, { label: `Fertilizer N (${nUnit})`, color: ev.fertilizer }, { label: 'Selected day', color: ev.cursor }]} />,
      render: (h) => <EventsTimeline height={h} days={data.days} events={data.events} start={w.start} end={w.end} selected={ctl.index} onSelect={(i) => { ctl.setIndex(i); emit('dateChanged'); }} colors={{ rain: ev.rain, irrigation: ev.irrigation, fertilizer: ev.fertilizer, cursor: ev.cursor }} water={{ unit: wUnit, factor: wf }} nitrogen={{ unit: nUnit, factor: nf }} />,
      summary: `${windowText}: ${countOf('rain')} rain days totalling ${n(sum('rain') * wf)} ${wUnit}; ${countOf('irrigation') ? `${countOf('irrigation')} irrigations totalling ${n(sum('irrigation') * wf)} ${wUnit}` : 'no irrigation'}; ${fertDates.length ? `${n(sum('fertilizer') * nf, 0)} ${nUnit} of fertilizer N on ${fertDates.join(', ')}` : 'no fertilizer'}.`,
      table: () => (
        <ChartDataTable
          caption={`Rain, irrigation and fertilizer, ${windowText}`}
          columns={[{ label: 'Date' }, { label: `Rain (${wUnit})`, numeric: true }, { label: `Irrigation (${wUnit})`, numeric: true }, { label: `Fertilizer N (${nUnit})`, numeric: true }, { label: 'Show on charts' }]}
          rows={windowEvents.map((e) => [
            dayjs(e.date).format('ddd, MMM D, YYYY'),
            e.rain ? n(e.rain * wf) : '–',
            e.irrigation ? n(e.irrigation * wf) : '–',
            e.fertilizer ? n(e.fertilizer * nf, 0) : '–',
            e.date === day.date ? 'Shown' : <Button size="small" onClick={() => showDay(e.date)} aria-label={`Show ${dayjs(e.date).format('MMMM D, YYYY')} on the charts`}>Show</Button>,
          ])}
          empty="No rain, irrigation or fertilizer in this period."
        />
      ),
    },
  ] : [];
  /** A card's content: the chart (or its table) and the one-line summary under it. */
  const cardBody = (c: ResultCard, height?: number) => (
    <>
      {views[c.id] === 'table' ? c.table() : <LabelChartFocus label={c.title}>{c.render(height)}</LabelChartFocus>}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>{c.summary}</Typography>
    </>
  );
  // In the user's chosen order (the expand dialog's ‹ › follows it too).
  const cards = layout.order.map((id) => cardList.find((c) => c.id === id)).filter((c): c is ResultCard => !!c);

  return (
    <Box sx={{ pb: 4 }}>
      {header}
      {data && day ? (
        <>
          {/* Sticks just under the app bar, whatever its height (it grows with large text) */}
          <Box ref={dateBarRef} data-tour="date-filter" sx={{ position: 'sticky', top: 'var(--salus-header-h, 71px)', zIndex: 5 }}>
            <DateFilterBar days={data.days} ctl={ctl} />
          </Box>

          <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 }, pt: layout.isDefault ? 3 : 1 }}>
            {!layout.isDefault && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                <Button size="small" startIcon={<RestartAltIcon />} onClick={() => { layout.reset(); announce('Chart layout reset'); }}>Reset layout</Button>
              </Box>
            )}
            <SortableCardGrid
              order={layout.order}
              onOrderChange={layout.setOrder}
              cards={cards.map((c, i) => ({
                id: c.id,
                title: c.title,
                wide: c.wide,
                weight: c.weight,
                render: (handle) => (
              <SectionCard
                tourId={c.tourId}
                title={c.title}
                subtitle={c.subtitle}
                action={
                  <CardCorner>
                    {c.headline}
                    <Tooltip title="Expand chart">
                      <IconButton size="small" onClick={() => setExpanded(i)} aria-label={`Expand ${c.title}`} data-tour={c.id === 'nitrate' ? 'chart-expand' : undefined} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}>
                        <OpenInFullIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <ChartSettingsButton chart={c.id} tourId={c.id === 'nitrate' ? 'chart-settings' : undefined} view={views[c.id] ?? 'chart'} onViewChange={(v) => setView(c.id, v)} />
                    {/* Move (drag handle / move menu) sits last, with the other controls */}
                    {handle}
                  </CardCorner>
                }
                legend={views[c.id] === 'table' ? undefined : c.legend}
              >
                {cardBody(c)}
              </SectionCard>
                ),
              }))}
            />
          </Box>

          {/* Click-to-expand view: one chart nearly full-screen, with the date bar and ‹ › to switch charts */}
          {expanded !== null && cards[expanded] && (
            <ExpandedChartDialog
              open
              onClose={() => setExpanded(null)}
              title={cards[expanded].title}
              subtitle={cards[expanded].subtitle}
              legend={cards[expanded].legend}
              corner={<CardCorner>{cards[expanded].headline}<ChartSettingsButton chart={cards[expanded].id} view={views[cards[expanded].id] ?? 'chart'} onViewChange={(v) => setView(cards[expanded].id, v)} /></CardCorner>}
              dateBar={<DateFilterBar days={data.days} ctl={ctl} />}
              render={(h) => cardBody(cards[expanded], Math.max(160, h - 48))} // leave room for the summary line
              onPrev={() => setExpanded((expanded + cards.length - 1) % cards.length)}
              onNext={() => setExpanded((expanded + 1) % cards.length)}
              position={`${expanded + 1} of ${cards.length}`}
            />
          )}
        </>
      ) : error ? (
        <PageContainer><Alert severity="error">{error}</Alert></PageContainer>
      ) : (
        <PageContainer><Skeleton variant="rounded" height={420} /></PageContainer>
      )}
    </Box>
  );
}
