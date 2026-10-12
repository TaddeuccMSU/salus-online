/**
 * resultsSummary.ts — the "Results over N years" table (Best / Average /
 * Median / Worst / Total), like the summary table on the live SALUS Online site.
 *
 * DEMO / MOCK: the sample results only carry daily water and nitrogen, so
 * most yearly numbers here are INVENTED. From the sample's daily data:
 * N leaching, plant N uptake, fertilizer N, rain/irrigation and year-end soil
 * nitrate. Invented (seeded per dataset + year, so a year always shows the
 * same value): yield, ET, drainage, runoff, N2O, CO2, soil organic N, soil
 * carbon change and hot days. Real SALUS output will replace `yearlyMetrics`.
 *
 * Everything is computed in metric (native) units; `SUMMARY_ROWS` says how to
 * show each row in Metric or US units and which direction is "best".
 */
import type { RunResults } from '../types';
import type { UnitSystem } from '../theme/units';

/** One simulated year, native units (kg/ha, t/ha, mm, °C days). */
export interface YearMetrics {
  year: number;
  yieldT: number; // grain, t/ha
  leach: number; // kg N/ha
  uptake: number; // kg N/ha
  fertN: number; // kg N/ha
  soilNEnd: number; // kg N/ha on Dec 31
  soilOrgN: number; // kg N/ha
  n2o: number; // kg/ha
  co2: number; // kg/ha
  drainage: number; // mm
  runoff: number; // mm
  et: number; // mm
  hotDays: number; // days above 32 °C (90 °F)
}

/** Small seeded random generator (mulberry32) so mock values are stable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);

/** Per-year numbers for the run's years (`results` already sliced to them). */
export function yearlyMetrics(results: RunResults, datasetId: string): YearMetrics[] {
  const years = [...new Set(results.days.map((d) => Number(d.date.slice(0, 4))))];
  let prevPlant = 0;
  let prevLeach = 0;
  return years.map((year) => {
    const ds = results.days.filter((d) => d.date.startsWith(`${year}`));
    const ev = results.events.filter((e) => e.date.startsWith(`${year}`));
    const last = ds[ds.length - 1];
    const uptake = last.plantN - prevPlant;
    const leach = last.leachN - prevLeach;
    prevPlant = last.plantN;
    prevLeach = last.leachN;
    const water = ev.reduce((a, e) => a + e.rain + e.irrigation, 0);
    const fertN = ev.reduce((a, e) => a + e.fertilizer, 0);
    const r = rng(hash(`${datasetId}:${year}`));
    const et = Math.min(850, Math.max(520, 640 + 0.2 * (water - 760) + (r() - 0.5) * 90));
    const yieldT = Math.min(15, Math.max(4.5, uptake * 0.072 + (r() - 0.5) * 1.6));
    return {
      year,
      yieldT,
      leach,
      uptake,
      fertN,
      soilNEnd: last.soilN,
      soilOrgN: 11200 + (r() - 0.5) * 600,
      n2o: 0.008 * fertN + 0.0008 * water + r() * 0.4,
      co2: 5600 + (r() - 0.5) * 3000,
      drainage: Math.max(0, (water - et) * 0.65 + r() * 60),
      runoff: ev.reduce((a, e) => a + Math.max(0, e.rain - 25) * 0.35, 0),
      et,
      hotDays: Math.round(r() ** 2 * 45),
    };
  });
}

type Stat = 'best' | 'avg' | 'median' | 'worst' | 'total';
interface RowDef {
  id: string;
  label: Record<UnitSystem, string>;
  /** Native value for a year (undefined = not defined that year, e.g. no fertilizer). */
  value: (y: YearMetrics) => number | undefined;
  /** Multiplier native → display. */
  factor: Record<UnitSystem, number>;
  better: 'high' | 'low';
  stats: Stat[];
  /** Run-level total that isn't a sum of years (soil carbon change). */
  total?: (ys: YearMetrics[], seed: string) => number;
}

const KG_HA_TO_LB_AC = 0.892179;
const MM_TO_IN = 1 / 25.4;
/** N in harvested grain (fraction of grain weight): N fertilizer efficiency = grain N / fertilizer N. */
const GRAIN_N = 0.0125;
const BAMW: Stat[] = ['best', 'avg', 'median', 'worst'];

/** The table's rows, in the live site's order. */
export const SUMMARY_ROWS: RowDef[] = [
  { id: 'yield', label: { us: 'Corn yield (bu/ac)', metric: 'Corn yield (t/ha)' }, value: (y) => y.yieldT, factor: { metric: 1, us: 15.93 }, better: 'high', stats: BAMW },
  { id: 'leach', label: { us: 'N leaching (lb/ac)', metric: 'N leaching (kg/ha)' }, value: (y) => y.leach, factor: { metric: 1, us: KG_HA_TO_LB_AC }, better: 'low', stats: [...BAMW, 'total'] },
  { id: 'nue', label: { us: 'N use efficiency (bu/lb N)', metric: 'N use efficiency (kg grain/kg N)' }, value: (y) => (y.fertN > 0 ? (y.yieldT * 1000) / y.fertN : undefined), factor: { metric: 1, us: 1.1209 / 62.77 }, better: 'high', stats: BAMW },
  { id: 'nfe', label: { us: 'N fertilizer efficiency', metric: 'N fertilizer efficiency' }, value: (y) => (y.fertN > 0 ? (y.yieldT * 1000 * GRAIN_N) / y.fertN : undefined), factor: { metric: 1, us: 1 }, better: 'high', stats: BAMW },
  { id: 'soilInorgN', label: { us: 'Total soil inorganic N (lb/ac)', metric: 'Total soil inorganic N (kg/ha)' }, value: (y) => y.soilNEnd, factor: { metric: 1, us: KG_HA_TO_LB_AC }, better: 'low', stats: ['total'] },
  { id: 'soilOrgN', label: { us: 'Total soil organic N (lb/ac)', metric: 'Total soil organic N (kg/ha)' }, value: (y) => y.soilOrgN, factor: { metric: 1, us: KG_HA_TO_LB_AC }, better: 'high', stats: ['total'] },
  {
    id: 'carbon', label: { us: 'Soil carbon change (%)', metric: 'Soil carbon change (%)' }, value: () => undefined, factor: { metric: 1, us: 1 }, better: 'high', stats: ['total'],
    total: (ys, seed) => {
      const r = rng(hash(`${seed}:${ys[0]?.year}-${ys[ys.length - 1]?.year}`));
      return ys.length * 0.025 + (r() - 0.5) * 0.6;
    },
  },
  { id: 'n2o', label: { us: 'N₂O emission (lb/ac)', metric: 'N₂O emission (kg/ha)' }, value: (y) => y.n2o, factor: { metric: 1, us: KG_HA_TO_LB_AC }, better: 'low', stats: ['avg', 'total'] },
  { id: 'co2', label: { us: 'CO₂ emission (lb/ac)', metric: 'CO₂ emission (kg/ha)' }, value: (y) => y.co2, factor: { metric: 1, us: KG_HA_TO_LB_AC }, better: 'low', stats: [...BAMW, 'total'] },
  { id: 'drainage', label: { us: 'Yearly drainage (in)', metric: 'Yearly drainage (mm)' }, value: (y) => y.drainage, factor: { metric: 1, us: MM_TO_IN }, better: 'low', stats: [...BAMW, 'total'] },
  { id: 'runoff', label: { us: 'Yearly runoff (in)', metric: 'Yearly runoff (mm)' }, value: (y) => y.runoff, factor: { metric: 1, us: MM_TO_IN }, better: 'low', stats: [...BAMW, 'total'] },
  { id: 'et', label: { us: 'Evapotranspiration (in)', metric: 'Evapotranspiration (mm)' }, value: (y) => y.et, factor: { metric: 1, us: MM_TO_IN }, better: 'low', stats: [...BAMW, 'total'] },
  { id: 'wue', label: { us: 'Water use efficiency (bu/ac/in)', metric: 'Water use efficiency (kg/ha/mm)' }, value: (y) => (y.yieldT * 1000) / y.et, factor: { metric: 1, us: 25.4 / 62.77 }, better: 'high', stats: BAMW },
  { id: 'hot', label: { us: 'Days above 90 °F', metric: 'Days above 32 °C' }, value: (y) => y.hotDays, factor: { metric: 1, us: 1 }, better: 'low', stats: BAMW },
];

/** One table row: display values (null = "–"). */
export interface SummaryRow {
  id: string;
  metric: string;
  best: number | null;
  avg: number | null;
  median: number | null;
  worst: number | null;
  total: number | null;
}

/** Builds the table rows for the run's years in the user's units. */
export function summaryRows(years: YearMetrics[], units: UnitSystem, seed: string): SummaryRow[] {
  return SUMMARY_ROWS.map((def) => {
    const f = def.factor[units];
    const vals = years.map(def.value).filter((v): v is number => v !== undefined && Number.isFinite(v)).map((v) => v * f);
    const sorted = [...vals].sort((a, b) => a - b);
    const has = (s: Stat) => def.stats.includes(s) && (s === 'total' && def.total ? true : sorted.length > 0);
    const hi = sorted[sorted.length - 1];
    const lo = sorted[0];
    const mid = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const sum = vals.reduce((a, v) => a + v, 0);
    return {
      id: def.id,
      metric: def.label[units],
      best: has('best') ? (def.better === 'high' ? hi : lo) : null,
      avg: has('avg') ? sum / vals.length : null,
      median: has('median') ? mid : null,
      worst: has('worst') ? (def.better === 'high' ? lo : hi) : null,
      total: has('total') ? (def.total ? def.total(years, seed) * f : sum) : null,
    };
  });
}
