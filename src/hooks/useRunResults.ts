/**
 * useRunResults.ts — loads a run's daily SALUS output.
 *
 * Fetches `/data/<file>` once and caches it in memory, so switching between
 * runs is instant after the first load. Returns `{ data, error, loading }`.
 */
import { useEffect, useState } from 'react';
import type { RunResults } from '../types';

const cache = new Map<string, RunResults>();

export function useRunResults(file: string | undefined) {
  const [data, setData] = useState<RunResults | undefined>(file ? cache.get(file) : undefined);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!file) return;
    if (cache.has(file)) {
      setData(cache.get(file));
      return;
    }
    let cancelled = false;
    setData(undefined);
    setError(undefined);
    fetch(`${import.meta.env.BASE_URL}data/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load results (${r.status})`);
        return r.json() as Promise<RunResults>;
      })
      .then((json) => {
        cache.set(file, json);
        if (!cancelled) setData(json);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [file]);

  return { data, error, loading: !data && !error };
}
