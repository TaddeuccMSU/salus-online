/**
 * types/index.ts — shared TypeScript shapes.
 *
 * Keeping these in one file makes it easy to see what data flows between the
 * map, the run form, the runs grid and the results charts.
 */

/** A point on the map the user clicked (WGS84 degrees). */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Every answer on the Set Management form. Units match the live SALUS Online site. */
export interface ManagementInputs {
  soilTexture: string;
  soilDepth: 'shallow' | 'moderate' | 'deep';
  cornUse: 'grain' | 'silage';
  tillage: 'none' | 'minimum' | 'moldboard';
  plantPopulation: number; // seeds / acre
  maturityDays: number; // hybrid relative maturity, days
  plantingMonth: number; // 1-12
  plantingDay: number; // 1-31
  irrigate: boolean;
  coverCrop: boolean;
  inorganicFertilizer: boolean;
  fertilizerBasis: 'nitrogen' | 'product';
  fertilizerRate: number; // lbs / acre: of N, or of product when fertilizerBasis is 'product'
  fertilizerProduct: string; // FERTILIZER_PRODUCTS value (used when fertilizerBasis is 'product')
  manure: boolean;
}

/**
 * Run-level answers from the Set Management panel: what the run is called,
 * which test dataset it is based on, and which years to simulate.
 */
export interface RunSetup {
  name: string;
  description: string;
  datasetId: string;
  startYear: number;
  endYear: number;
}

/**
 * A sample (mock) results set we can show while there is no live backend.
 * `defaults` are the management answers that produced the data, used to
 * pre-fill the Set Management form.
 */
export interface TestDataset {
  id: string;
  label: string;
  description: string;
  site: string;
  location: LatLng;
  firstYear: number;
  lastYear: number;
  resultsFile: string;
  defaults: ManagementInputs;
}


/** Lifecycle of a simulation run. */
export type RunStatus = 'queued' | 'running' | 'complete' | 'failed';

/** One SALUS run as shown in the My Runs grid. */
export interface Run {
  id: string;
  name: string;
  location: LatLng;
  placeName: string;
  createdAt: string; // ISO timestamp
  status: RunStatus;
  setup: RunSetup;
  inputs: ManagementInputs;
  /** Which results file under /public/data backs this run (demo data for now). */
  resultsFile: string;
}

/** A soil layer (cm below surface). */
export interface SoilLayer {
  top: number;
  bottom: number;
}

/** One simulated day of SALUS output. */
export interface DailyResult {
  date: string; // YYYY-MM-DD
  pesw: number; // plant-extractable soil water, mm
  soilN: number; // soil nitrate, kg N/ha
  plantN: number; // plant N uptake, kg N/ha
  leachN: number; // leached N, kg N/ha
  conc: number[]; // nitrate-N per layer, mg N/kg soil
}

/** A weather or management event on a given day. */
export interface DailyEvent {
  date: string;
  rain: number; // mm
  irrigation: number; // mm
  fertilizer: number; // kg N/ha
}

/** Whole-run results loaded from JSON. */
export interface RunResults {
  layers: SoilLayer[];
  maximums: {
    pesw: number;
    soilN: number;
    plantN: number;
    leachN: number;
    layerConc: number;
    firstDate: string;
    lastDate: string;
  };
  days: DailyResult[];
  events: DailyEvent[];
}

/** Zoom level of the date filter bar. */
export type TimeScale = 'month' | 'year' | 'all';
