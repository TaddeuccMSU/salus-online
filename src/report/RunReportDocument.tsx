/**
 * RunReportDocument.tsx — the printable 3-page run report, as a react-pdf
 * <Document>. Mirrors design/report-mockup/salus-run-report-sample.pdf.
 *
 *   Page 1  run name + chips, "Run & field" and "Set management" boxes,
 *           key-result tiles, season-by-season table
 *   Page 2  nitrogen pools, soil water, weather & management events charts
 *   Page 3  soil nitrate profile snapshots (years × May 1/Jul 1/Oct 15) + notes
 * Every page has the logo header with a green rule and a footer with the
 * generated date and page number. Styling follows the Spartan White tokens;
 * chart colours follow the user's chart-colour choices (`palette`) and all
 * numbers follow the Metric / US units setting (`units`, via scaleReportData).
 */
import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import type { ComponentProps, ReactNode } from 'react';
import type { Run } from '../types';
import { MATURITY, MONTHS, TILLAGE, soilDepthLabel } from '../data/options';
import { factorOf, inputToDisplay, inputUnit, layerLabel, nRateText, unitOf, type UnitSystem } from '../theme/units';
import { getDataset } from '../data/datasets';
import { formatLatLng } from '../hooks/useReverseGeocode';
import { tokens } from '../theme/tokens';
import { DEFAULT_COLORS, type ChartColors } from '../theme/chartColors';
import { scaleReportData, type ReportData } from './reportData';
import { EventsChart, NitrogenChart, ProfileMiniChart, SoilWaterChart, type PdfUnits } from './pdfCharts';

const C = tokens.color;
const BASE = import.meta.env.BASE_URL;

// Metropolis (MSU brand sans) — TrueType copies live in /public/fonts.
Font.register({
  family: 'Metropolis',
  fonts: [400, 600, 700, 800].map((w) => ({ src: `${BASE}fonts/Metropolis-${w}.ttf`, fontWeight: w })),
});
Font.registerHyphenationCallback((word) => [word]); // don't hyphenate

/** A single react-pdf style object (derived so we don't depend on @react-pdf/types directly). */
type Style = Exclude<ComponentProps<typeof View>['style'], unknown[] | undefined>;

const CONTENT_W = 612 - 2 * 43; // Letter width minus margins, in points

const s = StyleSheet.create({
  page: { fontFamily: 'Metropolis', fontSize: 8.5, color: C.text, paddingTop: 72, paddingBottom: 52, paddingHorizontal: 43 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 56, borderBottomWidth: 2.2, borderBottomColor: C.spartanGreen, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 43 },
  logo: { width: 30, height: 29, marginRight: 8 },
  brand: { fontSize: 14, fontWeight: 800, color: C.spartanGreen },
  brandSub: { fontSize: 7, color: C.textMuted, marginTop: 1 },
  headerRight: { marginLeft: 'auto', alignItems: 'flex-end' },
  footer: { position: 'absolute', bottom: 24, left: 43, right: 43, borderTopWidth: 0.6, borderTopColor: C.border, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: C.textMuted },
  overline: { fontSize: 7, fontWeight: 700, letterSpacing: 0.6, color: C.spartanGreen, marginBottom: 4 },
  h1: { fontSize: 20, fontWeight: 800, color: C.spartanGreen },
  h2: { fontSize: 12, fontWeight: 700, color: C.spartanGreen, marginBottom: 5, marginTop: 4 },
  small: { fontSize: 7.5, color: C.textMuted, lineHeight: 1.35 },
  chip: { backgroundColor: C.surfaceGreen, color: C.spartanGreen, fontWeight: 600, fontSize: 7.5, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 3, marginRight: 4, marginBottom: 3 },
  card: { borderWidth: 0.75, borderColor: C.border, borderRadius: 6, padding: 10, backgroundColor: '#fff' },
  kvRow: { flexDirection: 'row', borderBottomWidth: 0.4, borderBottomColor: C.border, paddingVertical: 3.5 },
  kvKey: { width: '40%', fontSize: 7.5, color: C.textMuted },
  kvVal: { width: '60%', fontWeight: 600 },
  tiles: { flexDirection: 'row', backgroundColor: C.surfaceGreen, borderRadius: 6 },
  tile: { flex: 1, padding: 9, borderRightWidth: 2, borderRightColor: '#fff' },
  th: { fontSize: 7, fontWeight: 700, color: C.spartanGreen },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
});

/** Logo header + footer drawn on every page. */
function Furniture({ runName }: { runName: string }) {
  return (
    <>
      <View style={s.header} fixed>
        <Image src={`${BASE}report/logo.png`} style={s.logo} />
        <View>
          <Text style={s.brand}>SALUS Online</Text>
          <Text style={s.brandSub}>Crop, nitrogen &amp; water simulation · Michigan State University</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={{ fontSize: 8, fontWeight: 600, color: C.textMuted }}>RUN REPORT</Text>
          <Text style={{ fontSize: 7, color: C.textMuted, marginTop: 1 }}>{runName}</Text>
        </View>
      </View>
      <View style={s.footer} fixed>
        <Text>Generated {dayjs().format('MMMM D, YYYY')} · Demo mode: mock sample results, not SALUS output</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

function Card({ children, style }: { children: ReactNode; style?: Style }) {
  return <View style={style ? [s.card, style] : s.card}>{children}</View>;
}

function KeyValues({ rows }: { rows: [string, string][] }) {
  return (
    <View>
      {rows.map(([k, v], i) => (
        <View key={k} style={[s.kvRow, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <Text style={s.kvKey}>{k}</Text>
          <Text style={s.kvVal}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Swatch({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
      <View style={{ width: 12, height: dashed ? 0 : 7, borderTopWidth: dashed ? 1.2 : 0, borderTopColor: color, borderStyle: 'dashed', backgroundColor: dashed ? undefined : color, marginRight: 4 }} />
      <Text style={{ fontSize: 7 }}>{label}</Text>
    </View>
  );
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const n1 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function RunReportDocument({ run, data: raw, palette = DEFAULT_COLORS, units = 'metric' }: { run: Run; data: ReportData; palette?: ChartColors; units?: UnitSystem }) {
  // Everything below is in the user's display units (metric by default).
  const data = scaleReportData(raw, units);
  const NU = unitOf('nArea', units); // "kg N/ha" | "lb N/ac"
  const AU = units === 'metric' ? 'kg/ha' : 'lb/ac'; // short form for table headers
  const WU = unitOf('water', units); // "mm" | "in"
  const pdfUnits: PdfUnits = { n: NU, w: WU, minEvents: 10 * factorOf('water', units) };
  const fw = (v: number) => (units === 'metric' ? n0(v) : n1(v)); // water: inches need a decimal
  const ev = palette.events;
  const plantColor = palette.nbudget.current === DEFAULT_COLORS.nbudget.current ? C.accentDark : palette.nbudget.current;
  const waterColor = palette.water.current === DEFAULT_COLORS.water.current ? C.accentDark : palette.water.current;
  const i = run.inputs;
  const label = <T extends { value: unknown; label: string }>(list: readonly T[], val: unknown) => list.find((o) => o.value === val)?.label ?? '';
  const dataset = getDataset(run.setup.datasetId);
  const years = `${run.setup.startYear}–${run.setup.endYear}`;
  const chips = [run.placeName, i.soilTexture, i.irrigate ? 'Irrigated' : 'Rainfed', i.inorganicFertilizer ? nRateText(i.fertilizerRate, units) : 'No inorganic N', years];
  const t = data.totals;
  const half = (CONTENT_W - 12) / 2;
  const depthLabels = data.layers.map((l) => layerLabel(l.top, l.bottom, units));
  const snapW = (CONTENT_W - 20 - 24) / 3;
  const yearList = [...new Set(data.snapshots.map((x) => x.year))];

  const cols: { key: string; label: string; w: number; right?: boolean }[] = [
    { key: 'year', label: 'Year', w: 0.08 },
    { key: 'rain', label: `Rain\n(${WU})`, w: 0.1, right: true },
    { key: 'irrigation', label: `Irrigation\n(${WU})`, w: 0.12, right: true },
    { key: 'fertilizer', label: `Fertilizer N\n(${AU})`, w: 0.13, right: true },
    { key: 'uptake', label: `Plant N uptake\n(${AU})`, w: 0.15, right: true },
    { key: 'leached', label: `N leached\n(${AU})`, w: 0.12, right: true },
    { key: 'soilNitrateEnd', label: `Soil nitrate\nDec 31 (${AU})`, w: 0.16, right: true },
    { key: 'lowestPesw', label: `Lowest PESW\n(${WU})`, w: 0.14, right: true },
  ];

  return (
    <Document title={`SALUS Online run report — ${run.name}`} author="SALUS Online, Basso Lab MSU" subject="SALUS run report">
      {/* ===== Page 1 ===== */}
      <Page size="LETTER" style={s.page}>
        <Furniture runName={run.name} />
        <Text style={s.overline}>SELECTED FIELD RESULTS</Text>
        <Text style={s.h1}>{run.name}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
          {chips.map((c) => <Text key={c} style={s.chip}>{c}</Text>)}
        </View>
        {run.setup.description ? <Text style={s.small}>{run.setup.description}</Text> : null}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
          <Card style={{ width: half }}>
            <Text style={s.overline}>RUN &amp; FIELD</Text>
            <KeyValues rows={[
              ['Location', `${run.placeName}\n${formatLatLng(run.location)}`],
              ['Dataset', `${dataset.label} (${dataset.site})`],
              ['Simulation period', `${years} (${data.annual.length} seasons)`],
              ['Run created', dayjs(run.createdAt).format('MMM D, YYYY')],
            ]} />
          </Card>
          <Card style={{ width: half }}>
            <Text style={s.overline}>SET MANAGEMENT</Text>
            <KeyValues rows={[
              ['Soil texture', i.soilTexture],
              ['Soil depth', soilDepthLabel(i.soilDepth, units)],
              ['Tillage', label(TILLAGE, i.tillage)],
              ['Crop', `Corn for ${i.cornUse}, ${label(MATURITY, i.maturityDays).replace('-day corn', '-day hybrid')}`],
              ['Plant population', `${n0(inputToDisplay('population', i.plantPopulation, units))} ${inputUnit('population', units)}`],
              ['Planting date', `${label(MONTHS, i.plantingMonth)} ${i.plantingDay}`],
              ['Irrigation', i.irrigate ? 'Yes (automatic)' : 'No'],
              ['Inorganic N', i.inorganicFertilizer ? `${n0(inputToDisplay('rate', i.fertilizerRate, units))} ${inputUnit('rate', units)} (${i.fertilizerBasis === 'nitrogen' ? 'actual N' : 'product'})` : 'None'],
              ['Cover crop / manure', `${i.coverCrop ? 'Yes' : 'No'} / ${i.manure ? 'Yes' : 'No'}`],
            ]} />
          </Card>
        </View>

        <Text style={[s.h2, { marginTop: 12 }]}>Key results, whole run</Text>
        <View style={s.tiles}>
          {[
            [n0(t.uptake), NU, 'Plant N uptake', C.accentDark],
            [n1(t.leached), NU, 'Nitrate leached', C.fertilizer],
            [n0(t.fertilizer), NU, 'Fertilizer N applied', C.spartanGreen],
            [fw(t.rain), WU, 'Rainfall', C.rain],
            [fw(t.irrigation), WU, 'Irrigation', C.irrigation],
          ].map(([v, u, l, col], idx) => (
            <View key={l} style={[s.tile, idx === 4 ? { borderRightWidth: 0 } : {}]}>
              <Text>
                <Text style={{ fontSize: 16, fontWeight: 800, color: col }}>{v}</Text>
                <Text style={{ fontSize: 7.5, fontWeight: 600, color: C.textMuted }}> {u}</Text>
              </Text>
              <Text style={[s.small, { marginTop: 3 }]}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={[s.h2, { marginTop: 12 }]}>Season by season</Text>
        <View style={{ borderWidth: 0.75, borderColor: C.border, borderRadius: 4 }}>
          <View style={{ flexDirection: 'row', backgroundColor: C.canvas, paddingVertical: 5, paddingHorizontal: 4 }}>
            {cols.map((c) => <Text key={c.key} style={[s.th, { width: `${c.w * 100}%`, textAlign: c.right ? 'right' : 'left', paddingRight: 4 }]}>{c.label}</Text>)}
          </View>
          {data.annual.map((r, idx) => (
            <View key={r.year} style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, borderTopWidth: 0.4, borderTopColor: C.border, backgroundColor: idx % 2 ? '#FAFBFA' : '#fff' }}>
              {cols.map((c) => {
                const v = r[c.key as keyof typeof r];
                const water = c.key === 'rain' || c.key === 'irrigation' || c.key === 'lowestPesw';
                const text = c.key === 'year' ? String(v) : c.key === 'leached' ? n1(v as number) : water ? fw(v as number) : n0(v as number);
                return <Text key={c.key} style={{ width: `${c.w * 100}%`, textAlign: c.right ? 'right' : 'left', paddingRight: 4, fontWeight: c.key === 'year' ? 600 : 400 }}>{text}</Text>;
              })}
            </View>
          ))}
          <View style={{ flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 4, backgroundColor: C.surfaceGreen, fontWeight: 700 }}>
            {['Total', fw(t.rain), fw(t.irrigation), n0(t.fertilizer), n0(t.uptake), n1(t.leached), '', ''].map((v, idx) => (
              <Text key={idx} style={{ width: `${cols[idx].w * 100}%`, textAlign: cols[idx].right ? 'right' : 'left', paddingRight: 4 }}>{v}</Text>
            ))}
          </View>
        </View>
        <Text style={[s.small, { marginTop: 5 }]}>
          Plant N uptake and N leached are the increase within each calendar year (SALUS reports them as running totals). PESW = plant-extractable soil water.
        </Text>
      </Page>

      {/* ===== Page 2 ===== */}
      <Page size="LETTER" style={s.page}>
        <Furniture runName={run.name} />
        <Text style={s.h2}>How the season unfolded</Text>
        <Text style={[s.small, { marginBottom: 8 }]}>Daily results for the whole simulation. Shaded bands mark each growing season (May–Sep).</Text>

        <Card style={{ marginBottom: 8 }}>
          <Text style={s.overline}>NITROGEN POOLS</Text>
          <View style={s.legendRow}>
            <Swatch color={C.spartanGreen} label="Soil nitrate" />
            <Swatch color={plantColor} label="Plant N (cumulative)" />
            <Swatch color={ev.fertilizer} label="N leached (cumulative, right axis)" dashed />
          </View>
          <NitrogenChart units={pdfUnits} palette={palette} days={data.days} width={CONTENT_W - 20} height={160} />
        </Card>

        <Card style={{ marginBottom: 8 }}>
          <Text style={s.overline}>SOIL WATER</Text>
          <View style={s.legendRow}>
            <Swatch color={waterColor} label="Plant-extractable soil water" />
            <Swatch color={C.textMuted} label={`Run maximum (${fw(data.maxPesw)} ${WU})`} dashed />
          </View>
          <SoilWaterChart units={pdfUnits} palette={palette} days={data.days} maxPesw={data.maxPesw} width={CONTENT_W - 20} height={125} />
        </Card>

        <Card>
          <Text style={s.overline}>WEATHER &amp; MANAGEMENT EVENTS</Text>
          <View style={s.legendRow}>
            <Swatch color={ev.rain} label={`Rain (${WU})`} />
            <Swatch color={ev.irrigation} label={`Irrigation (${WU})`} />
            <Swatch color={ev.fertilizer} label={`Fertilizer N (${AU}, labelled)`} dashed />
          </View>
          <EventsChart units={pdfUnits} palette={palette} days={data.days} events={data.events} width={CONTENT_W - 20} height={130} />
        </Card>
      </Page>

      {/* ===== Page 3 ===== */}
      <Page size="LETTER" style={s.page}>
        <Furniture runName={run.name} />
        <Text style={s.h2}>Soil nitrate profile snapshots</Text>
        <Text style={[s.small, { marginBottom: 8 }]}>
          Nitrate-N concentration ({unitOf('conc', units)}) by soil layer on key dates each year. Depth ({unitOf('depth', units)}) runs left to right, as in the app.
          All charts share one scale; taller values are clipped and labelled.
        </Text>
        <Card>
          <View style={{ flexDirection: 'row', marginLeft: 24 }}>
            {data.snapshotDates.map((d) => (
              <Text key={d.md} style={{ width: snapW, fontSize: 8, fontWeight: 700, color: C.spartanGreen }}>{d.title}</Text>
            ))}
          </View>
          {yearList.map((y) => (
            <View key={y} style={{ flexDirection: 'row', alignItems: 'center' }} wrap={false}>
              <Text style={{ width: 24, fontSize: 8, fontWeight: 700, color: C.textMuted }}>{y}</Text>
              {data.snapshots.filter((x) => x.year === y).map((x, idx) => (
                <ProfileMiniChart palette={palette} key={x.label} values={x.values} labels={depthLabels} max={data.snapshotMax} width={snapW} height={yearList.length > 5 ? 82 : 96} showYAxis={idx === 0} />
              ))}
            </View>
          ))}
        </Card>

        <View style={[s.card, { backgroundColor: C.canvas, marginTop: 8 }]} wrap={false}>
          <Text style={s.small}>
            <Text style={{ fontWeight: 700 }}>About this report. </Text>
            Generated from SALUS Online. In demo mode, results are mock sample data (invented numbers, not SALUS
            output) placed at the MSU Agronomy Farm (East Lansing, MI). Answers that don't change the demo data are recorded for reference only.
          </Text>
          <Text style={[s.small, { marginTop: 3 }]}>
            <Text style={{ fontWeight: 700 }}>Units. </Text>
            {units === 'metric'
              ? 'N amounts in kg N/ha (1 kg/ha is about 0.89 lb/acre); water in mm; nitrate concentration in mg N per kg dry soil.'
              : 'N amounts in lb N/acre (1 lb/acre is about 1.12 kg/ha); water and depth in inches; nitrate concentration in ppm (mg N per kg dry soil).'}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
