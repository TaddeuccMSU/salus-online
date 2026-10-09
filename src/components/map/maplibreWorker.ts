/**
 * maplibreWorker.ts — tells MapLibre where its background "worker" script is.
 *
 * MapLibre v6 draws vector maps (the Streets basemap) by decoding tiles in a
 * separate worker script that it normally looks for next to its own file.
 * Vite bundles MapLibre into a different place (in dev and in builds), so
 * that lookup fails ("Worker failed to load") and Streets stays blank, while
 * Satellite (plain images) still works. Here Vite bundles the worker itself
 * (`?worker&url`) and we hand MapLibre its URL. Imported once, first thing,
 * by main.tsx.
 *
 * The standalone (double-click) build swaps this file for its own version
 * that inlines the worker (see ../salus-online-standalone/vite.config.ts).
 */
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
