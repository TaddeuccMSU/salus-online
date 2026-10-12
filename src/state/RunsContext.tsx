/**
 * RunsContext.tsx — app-wide store for simulation runs.
 *
 * Wrap the app in <RunsProvider> and any component can call `useRuns()` to
 * list, add or delete runs. Runs are saved to the browser's localStorage so
 * they survive a refresh. `createRun` fakes the server: the run sits in
 * "queued" → "running" → "complete" for a few seconds, then points at the
 * test dataset matching the answers (see data/datasets.ts). Swap `createRun`
 * for a real API call when the backend is ready.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LatLng, ManagementInputs, Run, RunSetup } from '../types';
import { DEMO_RUNS } from '../data/demoRuns';
import { datasetForInputs } from '../data/datasets';
import { MATURITY } from '../data/options';

const STORAGE_KEY = 'salus-online.runs.v2';

interface RunsApi {
  runs: Run[];
  getRun: (id: string) => Run | undefined;
  createRun: (location: LatLng, placeName: string, setup: RunSetup, inputs: ManagementInputs) => Run;
  deleteRuns: (ids: string[]) => void;
  /** Put deleted runs back (the "Undo" after a delete); skips any that already exist. */
  restoreRuns: (runs: Run[]) => void;
}

const RunsContext = createContext<RunsApi | null>(null);

/**
 * migrateInputs — brings runs saved by older versions up to today's choices
 * so their labels still show:
 * - tillage 'reduced' / 'conventional' (before v0.3.2) → 'minimum' / 'moldboard';
 * - hybrid maturity: only 100, 110 and 120 days are offered now, so other
 *   saved values (80–115 in 5-day steps) snap to the nearest one.
 */
function migrateInputs(run: Run): Run {
  if (!run.inputs) return run;
  const inputs = { ...run.inputs };
  const tillageMap: Record<string, ManagementInputs['tillage']> = { reduced: 'minimum', conventional: 'moldboard' };
  const newTillage = tillageMap[inputs.tillage as string];
  if (newTillage) inputs.tillage = newTillage;
  const days = MATURITY.map((o) => o.value);
  if (!days.includes(inputs.maturityDays)) {
    inputs.maturityDays = days.reduce((best, d) => (Math.abs(d - inputs.maturityDays) < Math.abs(best - inputs.maturityDays) ? d : best));
  }
  return { ...run, inputs };
}

/** Reads saved runs, falling back to the demo runs if storage is empty or blocked. */
function loadRuns(): Run[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (JSON.parse(raw) as Run[]).map(migrateInputs);
  } catch {
    /* private mode or corrupted JSON — ignore */
  }
  return DEMO_RUNS;
}

export function RunsProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<Run[]>(loadRuns);

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    } catch {
      /* storage unavailable — runs stay in memory only */
    }
  }, [runs]);

  /** Updates one run's status by id. */
  const setStatus = useCallback((id: string, status: Run['status']) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }, []);

  const createRun = useCallback<RunsApi['createRun']>(
    (location, placeName, setup, inputs) => {
      const run: Run = {
        id: `run-${Date.now().toString(36)}`,
        name: setup.name.trim() || `Field at ${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`,
        location,
        placeName,
        createdAt: new Date().toISOString(),
        status: 'queued',
        setup,
        inputs,
        // Demo: answer with the test dataset that matches these inputs.
        resultsFile: datasetForInputs(inputs).resultsFile,
      };
      setRuns((prev) => [run, ...prev]);
      setTimeout(() => setStatus(run.id, 'running'), 800);
      setTimeout(() => setStatus(run.id, 'complete'), 3500);
      return run;
    },
    [setStatus],
  );

  const deleteRuns = useCallback((ids: string[]) => {
    setRuns((prev) => prev.filter((r) => !ids.includes(r.id)));
  }, []);

  const restoreRuns = useCallback((back: Run[]) => {
    setRuns((prev) => [...prev, ...back.filter((b) => !prev.some((r) => r.id === b.id))]);
  }, []);

  const api = useMemo<RunsApi>(
    () => ({ runs, getRun: (id) => runs.find((r) => r.id === id), createRun, deleteRuns, restoreRuns }),
    [runs, createRun, deleteRuns, restoreRuns],
  );

  return <RunsContext.Provider value={api}>{children}</RunsContext.Provider>;
}

/** Hook: access the runs store. Must be used inside <RunsProvider>. */
export function useRuns(): RunsApi {
  const ctx = useContext(RunsContext);
  if (!ctx) throw new Error('useRuns must be used inside <RunsProvider>');
  return ctx;
}
