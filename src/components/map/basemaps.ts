/**
 * basemaps.ts — the background map styles offered in the layer switcher.
 *
 * Default styles are free and keyless:
 *  - "Satellite": Esri World Imagery raster tiles + place labels (what the
 *    current SALUS Online site uses). Attribution is required and included.
 *  - "Hybrid":    the same imagery with Esri's transportation overlay on top
 *    (roads, highways and road names) plus place labels.
 *  - "Streets":   OpenFreeMap "Liberty" vector style (OpenStreetMap data).
 * If VITE_MAPTILER_KEY is set, MapTiler's satellite/hybrid/streets styles are used instead.
 */
import type { StyleSpecification } from 'maplibre-gl';

export type BasemapId = 'satellite' | 'hybrid' | 'streets';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

/** One Esri raster tile layer (imagery or a transparent reference overlay). */
const esriSource = (path: string, attribution?: string) => ({
  type: 'raster' as const,
  tiles: [`${ESRI}/${path}/MapServer/tile/{z}/{y}/{x}`],
  tileSize: 256,
  maxzoom: 19,
  ...(attribution ? { attribution } : {}),
});

/**
 * Builds a raster MapLibre style from Esri's public tile services:
 * imagery + place labels, and for hybrid also roads with their names.
 */
function esriImageryStyle(withRoads: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {
      imagery: esriSource('World_Imagery', 'Imagery © Esri, Maxar, Earthstar Geographics, USDA, USGS'),
      ...(withRoads ? { roads: esriSource('Reference/World_Transportation', 'Roads © Esri, HERE, Garmin') } : {}),
      labels: esriSource('Reference/World_Boundaries_and_Places'),
    },
    layers: [
      { id: 'imagery', type: 'raster', source: 'imagery' },
      ...(withRoads ? [{ id: 'roads', type: 'raster' as const, source: 'roads' }] : []),
      { id: 'labels', type: 'raster', source: 'labels' },
    ],
  };
}

/** Returns the style (URL or object) for a basemap id. */
export function basemapStyle(id: BasemapId): string | StyleSpecification {
  if (MAPTILER_KEY) {
    const name = id === 'streets' ? 'streets-v2' : id; // MapTiler has 'satellite' and 'hybrid' styles
    return `https://api.maptiler.com/maps/${name}/style.json?key=${MAPTILER_KEY}`;
  }
  if (id === 'streets') return 'https://tiles.openfreemap.org/styles/liberty';
  return esriImageryStyle(id === 'hybrid');
}
