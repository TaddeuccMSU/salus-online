/**
 * datasets.ts — catalogue of sample results ("test data").
 *
 * Until the live SALUS service is connected, every run is answered with one of
 * these files from /public/data. They are MOCK data: invented numbers in the
 * SALUS results shape, made by scripts/make_sample_data.py (no real SALUS
 * output is in this repo). Each entry records the years it covers and the
 * management answers it stands for; the wizard uses those to set
 * defaults. The files cover 1980–2021, all the years the form offers; each
 * run's years are cut out with sliceResults().
 *
 * To add a dataset: drop its JSON (RunResults shape) in /public/data and add
 * an entry here.
 */
import type { ManagementInputs, TestDataset } from '../types';
import { DEFAULT_INPUTS, FIRST_WEATHER_YEAR, LAST_WEATHER_YEAR } from './options';

const MSU_FARM = { lat: 42.7095, lng: -84.4706 };

/** Management answers shared by both East Lansing sample datasets. */
const EAST_LANSING_BASE: ManagementInputs = {
  ...DEFAULT_INPUTS,
  soilTexture: 'Silty Clay',
  soilDepth: 'deep',
  cornUse: 'grain',
  tillage: 'none',
  plantPopulation: 38000,
  maturityDays: 100,
  plantingMonth: 5,
  plantingDay: 1,
  inorganicFertilizer: true,
  fertilizerBasis: 'nitrogen',
  fertilizerRate: 150,
};

export const TEST_DATASETS: TestDataset[] = [
  {
    id: 'east-lansing-rainfed',
    label: 'Rainfed corn',
    description: 'Continuous corn, no irrigation. Shows how rain alone moves nitrate through the profile.',
    site: 'MSU Agronomy Farm, East Lansing, MI',
    location: MSU_FARM,
    firstYear: FIRST_WEATHER_YEAR,
    lastYear: LAST_WEATHER_YEAR,
    resultsFile: 'east-lansing-rainfed.json',
    defaults: { ...EAST_LANSING_BASE, irrigate: false },
  },
  {
    id: 'east-lansing-irrigated',
    label: 'Irrigated corn',
    description: 'Same field with automatic irrigation. Higher uptake, but watch for leaching after heavy water.',
    site: 'MSU Agronomy Farm, East Lansing, MI',
    location: MSU_FARM,
    firstYear: FIRST_WEATHER_YEAR,
    lastYear: LAST_WEATHER_YEAR,
    resultsFile: 'east-lansing-irrigated.json',
    defaults: { ...EAST_LANSING_BASE, irrigate: true },
  },
];

/** Looks up a dataset by id (falls back to the first one). */
export function getDataset(id: string | undefined): TestDataset {
  return TEST_DATASETS.find((d) => d.id === id) ?? TEST_DATASETS[0];
}

/**
 * Picks the results file for a finished form. With only two test datasets,
 * the irrigation answer is the one choice that changes the results.
 */
export function datasetForInputs(inputs: ManagementInputs): TestDataset {
  return TEST_DATASETS.find((d) => d.defaults.irrigate === inputs.irrigate) ?? TEST_DATASETS[0];
}

/** Which form answers actually change results with the current test data. */
export const RESULT_DRIVING_FIELDS: (keyof ManagementInputs)[] = ['irrigate'];
