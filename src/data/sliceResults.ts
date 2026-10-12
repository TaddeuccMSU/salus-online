/**
 * sliceResults.ts — cuts a run's years out of a longer results file.
 *
 * The mock sample files cover 1980–2021 as one long simulation. A run only
 * asks for some of those years, so this keeps the days and events from
 * Jan 1 of `startYear` to Dec 31 of `endYear` and makes the run look as if
 * SALUS had started there:
 * - running totals (plant N uptake, leached N) restart at 0 on the first day;
 * - `maximums` are recomputed for those years only (the charts and gauges
 *   scale to them).
 * If the file has none of those years, the whole file is returned unchanged.
 * Real SALUS runs will already cover exactly the run's years, so this is then
 * a no-op.
 */
import type { RunResults } from '../types';

export function sliceResults(results: RunResults, startYear: number, endYear: number): RunResults {
  const from = `${startYear}-01-01`;
  const to = `${endYear}-12-31`;
  const inRange = (d: string) => d >= from && d <= to;
  const first = results.days.findIndex((d) => inRange(d.date));
  if (first < 0) return results;
  const kept = results.days.filter((d) => inRange(d.date));

  // Running totals at the end of the day before the run starts.
  const before = first > 0 ? results.days[first - 1] : undefined;
  const plant0 = before?.plantN ?? 0;
  const leach0 = before?.leachN ?? 0;
  const days = kept.map((d) => ({ ...d, plantN: d.plantN - plant0, leachN: d.leachN - leach0 }));

  const max = (f: (d: (typeof days)[number]) => number) => days.reduce((m, d) => Math.max(m, f(d)), 0);
  return {
    ...results,
    days,
    events: results.events.filter((e) => inRange(e.date)),
    maximums: {
      ...results.maximums,
      pesw: max((d) => d.pesw),
      soilN: max((d) => d.soilN),
      plantN: max((d) => d.plantN),
      leachN: max((d) => d.leachN),
      layerConc: max((d) => Math.max(...d.conc)),
      firstDate: days[0].date,
      lastDate: days[days.length - 1].date,
    },
  };
}
