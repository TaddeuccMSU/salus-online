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

/** Loads one results file (shared cache with useRunResults). */
export function loadRunResults(file: string): Promise<RunResults> {
  const hit = cache.get(file);
  if (hit) return Promise.resolve(hit);
  return fetch(`${import.meta.env.BASE_URL}data/${file}`)
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load results (${r.status})`);
      return r.json() as Promise<RunResults>;
    })
    .then((json) => {
      cache.set(file, json);
      return json;
    });
}

/**
 * Loads several results files at once (Compare runs). Returns a map
 * file → results; files still loading are missing from it.
 */
export function useManyRunResults(files: string[]) {
  const key = [...new Set(files)].sort().join('|');
  const [loaded, setLoaded] = useState<Map<string, RunResults>>(() => new Map(files.filter((f) => cache.has(f)).map((f) => [f, cache.get(f)!])));
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    const wanted = key ? key.split('|') : [];
    Promise.all(wanted.map((f) => loadRunResults(f).then((d) => [f, d] as const)))
      .then((pairs) => !cancelled && setLoaded(new Map(pairs)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [key]);
  return { results: loaded, error };
}
