/**
 * useReverseGeocode.ts — turns a lat/lng into a friendly place name.
 *
 * Uses the free OpenStreetMap Nominatim service (no key). If it fails we just
 * show the coordinates. Please keep traffic light — Nominatim's usage policy
 * allows ~1 request/second.
 */
import { useEffect, useState } from 'react';
import type { LatLng } from '../types';

export function formatLatLng(p: LatLng): string {
  return `${Math.abs(p.lat).toFixed(4)}°${p.lat >= 0 ? 'N' : 'S'}, ${Math.abs(p.lng).toFixed(4)}°${p.lng >= 0 ? 'E' : 'W'}`;
}

export function useReverseGeocode(point: LatLng | null): string {
  const [name, setName] = useState('');

  useEffect(() => {
    if (!point) return;
    setName(formatLatLng(point));
    const ctrl = new AbortController();
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${point.lat}&lon=${point.lng}`;
    fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((j: { address?: Record<string, string> }) => {
        const a = j.address ?? {};
        const town = a.city || a.town || a.village || a.county;
        if (town) setName(`${town}${a.state ? `, ${a.state}` : ''}`);
      })
      .catch(() => {
        /* offline or rate-limited — keep coordinates */
      });
    return () => ctrl.abort();
  }, [point]);

  return name;
}
