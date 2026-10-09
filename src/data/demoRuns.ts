/**
 * demoRuns.ts — seed runs so the app has something to show on first load.
 *
 * One run per test dataset (mock sample results placed at East Lansing MI,
 * 2010–2014; see scripts/make_sample_data.py). Replace with API data later.
 */
import type { Run } from '../types';
import { TEST_DATASETS } from './datasets';

export const DEMO_RUNS: Run[] = TEST_DATASETS.map((d, i) => ({
  id: `demo-${d.id.replace('east-lansing-', '')}`,
  name: `Test ET Run — ${d.defaults.irrigate ? 'Irrigated' : 'Rainfed'}`,
  // Nudge the second pin so both are clickable on the map.
  location: { lat: d.location.lat - i * 0.004, lng: d.location.lng + i * 0.006 },
  placeName: 'East Lansing, MI',
  createdAt: `2026-03-28T14:0${i * 5}:00.000Z`,
  status: 'complete',
  resultsFile: d.resultsFile,
  setup: { name: `Test ET Run — ${d.label}`, description: d.description, datasetId: d.id, startYear: d.firstYear, endYear: d.lastYear },
  inputs: d.defaults,
}));
