/**
 * useAddressSearch.ts — address / place lookup for the map search bar.
 *
 * Sends the typed text to the free OpenStreetMap Nominatim geocoder (no API
 * key) once the user pauses typing for 400 ms, and returns up to 6 matches.
 * Results are biased to the US Midwest view but not limited to it.
 * Nominatim's usage policy asks for ≤ 1 request/second, which the debounce
 * respects for normal typing. Swap the URL for MapTiler Geocoding (needs the
 * VITE_MAPTILER_KEY) if traffic grows.
 */
import { useEffect, useState } from 'react';
import type { LatLng } from '../types';

export interface PlaceResult {
  id: string;
  label: string; // full display name
  short: string; // first part, for the input box
  location: LatLng;
}

const DEBOUNCE_MS = 400;

/** Builds the Nominatim search URL (Midwest preferred, not required). */
function searchUrl(q: string, limit: number) {
  return `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}&viewbox=-97.5,49.5,-80,36&q=${encodeURIComponent(q)}`;
}

/** Turns a Nominatim row into our PlaceResult. */
function toResult(r: { place_id: number; display_name: string; lat: string; lon: string }): PlaceResult {
  return {
    id: String(r.place_id),
    label: r.display_name,
    short: r.display_name.split(',').slice(0, 2).join(','),
    location: { lat: Number(r.lat), lng: Number(r.lon) },
  };
}

/** One immediate lookup (used by the Go button / Enter): best match or null. */
export async function geocodeOnce(q: string): Promise<PlaceResult | null> {
  const r = await fetch(searchUrl(q.trim(), 1), { headers: { Accept: 'application/json' } });
  const rows = (await r.json()) as Parameters<typeof toResult>[0][];
  return rows[0] ? toResult(rows[0]) : null;
}

export function useAddressSearch(query: string) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      // viewbox = rough US Midwest bounds (lon/lat), used only as a preference.
      fetch(searchUrl(q, 6), { signal: ctrl.signal, headers: { Accept: 'application/json' } })
        .then((r) => r.json())
        .then((rows: Parameters<typeof toResult>[0][]) => {
          setResults(rows.map(toResult));
          setError(false);
        })
        .catch((e: Error) => {
          if (e.name !== 'AbortError') setError(true);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  return { results, loading, error };
}
