/**
 * reportData.ts — turns a run + its daily results into the numbers shown in
 * the PDF run report (no drawing here, just maths).
 *
 * - trims results to the run's simulation years
 * - builds the season-by-season table (SALUS reports plant N uptake and N
 *   leached as running totals, so each year shows the increase within it)
 * - totals for the "Key results" tiles
 * - nitrate-profile snapshots on May 1 / Jul 1 / Oct 15 each year
 */
import type { DailyEvent, DailyResult, Run, RunResults } from '../types';
import { factorOf, type UnitSystem } from '../theme/units';

export interface AnnualRow {
  year: string;
  rain: number;
  irrigation: number;
  fertilizer: number;
  uptake: number;
  leached: number;
  soilNitrateEnd: number;
  lowestPesw: number;
}

export interface Snapshot {
  year: string;
  label: string;
  values: number[] | null; // null when the date is outside the data
}

export interface ReportData {
  days: DailyResult[];
  events: DailyEvent[];
  layers: RunResults['layers'];
  maxPesw: number;
  annual: AnnualRow[];
  totals: { rain: number; irrigation: number; fertilizer: number; uptake: number; leached: number };
  snapshots: Snapshot[];
  snapshotDates: { md: string; title: string }[];
  snapshotMax: number;
}

export const SNAPSHOT_DATES = [
  { md: '05-01', title: 'May 1 (planting)' },
  { md: '07-01', title: 'Jul 1 (mid-season)' },
  { md: '10-15', title: 'Oct 15 (harvest)' },
];

export function buildReportData(run: Run, results: RunResults): ReportData {
  const from = `${run.setup.startYear}-01-01`;
  const to = `${run.setup.endYear}-12-31`;
  const inRange = (d: string) => d >= from && d <= to;
  let days = results.days.filter((d) => inRange(d.date));
  let events = results.events.filter((e) => inRange(e.date));
  if (!days.length) {
    days = results.days;
    events = results.events;
  }

  // Running totals at the end of the year before the first year shown (0 if none).
  const before = results.days.filter((d) => d.date < days[0].date);
  let prevPlant = before.length ? before[before.length - 1].plantN : 0;
  let prevLeach = before.length ? before[before.length - 1].leachN : 0;

  const years = [...new Set(days.map((d) => d.date.slice(0, 4)))];
  const annual: AnnualRow[] = years.map((year) => {
    const ds = days.filter((d) => d.date.startsWith(year));
    const ev = events.filter((e) => e.date.startsWith(year));
    const last = ds[ds.length - 1];
    const row: AnnualRow = {
      year,
      rain: ev.reduce((a, e) => a + e.rain, 0),
      irrigation: ev.reduce((a, e) => a + e.irrigation, 0),
      fertilizer: ev.reduce((a, e) => a + e.fertilizer, 0),
      uptake: last.plantN - prevPlant,
      leached: last.leachN - prevLeach,
      soilNitrateEnd: last.soilN,
      lowestPesw: Math.min(...ds.map((d) => d.pesw)),
    };
    prevPlant = last.plantN;
    prevLeach = last.leachN;
    return row;
  });

  const sum = (k: keyof Omit<AnnualRow, 'year' | 'soilNitrateEnd' | 'lowestPesw'>) => annual.reduce((a, r) => a + r[k], 0);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const snapshots: Snapshot[] = years.flatMap((year) =>
    SNAPSHOT_DATES.map(({ md, title }) => ({ year, label: title, values: byDate.get(`${year}-${md}`)?.conc ?? null })),
  );

  // Shared y-scale for all snapshots: 97th percentile × 1.1, rounded to 10.
  const all = snapshots.flatMap((s) => s.values ?? []).sort((a, b) => a - b);
  const p97 = all.length ? all[Math.floor(all.length * 0.97)] : 10;
  const snapshotMax = Math.max(10, Math.round((p97 * 1.1) / 10) * 10);

  return {
    days,
    events,
    layers: results.layers,
    maxPesw: results.maximums.pesw,
    annual,
    totals: { rain: sum('rain'), irrigation: sum('irrigation'), fertilizer: sum('fertilizer'), uptake: sum('uptake'), leached: sum('leached') },
    snapshots,
    snapshotDates: SNAPSHOT_DATES,
    snapshotMax,
  };
}

/**
 * The same report numbers converted to the user's display units (US customary:
 * lb N/ac and inches). Nitrate concentration is unchanged (mg/kg = ppm).
 * Metric returns the data as is.
 */
export function scaleReportData(d: ReportData, units: UnitSystem): ReportData {
  if (units === 'metric') return d;
  const n = factorOf('nArea', units);
  const w = factorOf('water', units);
  return {
    ...d,
    days: d.days.map((x) => ({ ...x, soilN: x.soilN * n, plantN: x.plantN * n, leachN: x.leachN * n, pesw: x.pesw * w })),
    events: d.events.map((e) => ({ ...e, rain: e.rain * w, irrigation: e.irrigation * w, fertilizer: e.fertilizer * n })),
    maxPesw: d.maxPesw * w,
    annual: d.annual.map((r) => ({
      ...r,
      rain: r.rain * w, irrigation: r.irrigation * w, fertilizer: r.fertilizer * n,
      uptake: r.uptake * n, leached: r.leached * n, soilNitrateEnd: r.soilNitrateEnd * n, lowestPesw: r.lowestPesw * w,
    })),
    totals: {
      rain: d.totals.rain * w, irrigation: d.totals.irrigation * w, fertilizer: d.totals.fertilizer * n,
      uptake: d.totals.uptake * n, leached: d.totals.leached * n,
    },
  };
}
