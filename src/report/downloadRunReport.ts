/**
 * downloadRunReport.ts — builds a run's PDF report in the browser and saves it.
 *
 * Steps: fetch the run's results JSON → crunch the numbers (reportData) →
 * lazy-load react-pdf + the report document (so the ~1 MB PDF engine is only
 * downloaded the first time someone exports) → render to a Blob → trigger a
 * file download named "SALUS-report-<run name>.pdf".
 * No server is needed. When a backend exists this could call an API instead.
 */
import { createElement } from 'react';
import type { Run, RunResults } from '../types';
import type { ChartColors } from '../theme/chartColors';
import type { UnitSystem } from '../theme/units';
import { buildReportData } from './reportData';

/** Safe file name from the run name. */
export function reportFileName(run: Run): string {
  const slug = run.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || run.id;
  return `SALUS-report-${slug}.pdf`;
}

/** `palette` / `units` = the user's chart colours and Metric/US choice, so the PDF matches the screen. */
export async function downloadRunReport(run: Run, palette?: ChartColors, units?: UnitSystem): Promise<void> {
  if (run.status !== 'complete') throw new Error('This run has not finished yet.');

  const res = await fetch(`${import.meta.env.BASE_URL}data/${run.resultsFile}`);
  if (!res.ok) throw new Error(`Could not load results (${res.status})`);
  const results = (await res.json()) as RunResults;
  const data = buildReportData(run, results);

  const [{ pdf }, { default: RunReportDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./RunReportDocument'),
  ]);
  // pdf() expects a <Document> element; RunReportDocument returns one.
  const blob = await pdf(createElement(RunReportDocument, { run, data, palette, units }) as Parameters<typeof pdf>[0]).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = reportFileName(run);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
