/**
 * useReportDownloads.ts — React hook wrapping downloadRunReport for the UI.
 *
 * `download(runs)` exports one PDF per run, one after another, and tracks
 * progress in `status` so pages can show a Snackbar ("Preparing 2 of 3…",
 * "Report downloaded", or an error). `busy` is true while exporting.
 */
import { useCallback, useState } from 'react';
import type { Run } from '../types';
import { downloadRunReport } from './downloadRunReport';
import { useChartColors } from '../state/ChartColorsContext';
import { useUnits } from '../state/UnitsContext';

export interface ReportStatus {
  kind: 'working' | 'done' | 'error';
  message: string;
}

export function useReportDownloads() {
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const { colors } = useChartColors(); // PDFs use the user's chart colours…
  const { units } = useUnits(); // …and units

  const download = useCallback(async (runs: Run[]) => {
    const ready = runs.filter((r) => r.status === 'complete');
    if (!ready.length) {
      setStatus({ kind: 'error', message: 'Only completed runs can be exported.' });
      return;
    }
    try {
      for (let i = 0; i < ready.length; i++) {
        setStatus({ kind: 'working', message: ready.length > 1 ? `Preparing report ${i + 1} of ${ready.length}…` : `Preparing "${ready[i].name}" report…` });
        await downloadRunReport(ready[i], colors, units);
      }
      const skipped = runs.length - ready.length;
      setStatus({
        kind: 'done',
        message: `${ready.length > 1 ? `${ready.length} reports` : 'Report'} downloaded${skipped ? ` (${skipped} unfinished run${skipped > 1 ? 's' : ''} skipped)` : ''}.`,
      });
    } catch (e) {
      setStatus({ kind: 'error', message: `Couldn't create the PDF: ${(e as Error).message}` });
    }
  }, [colors, units]);

  return { status, busy: status?.kind === 'working', download, clear: () => setStatus(null) };
}
