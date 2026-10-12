/**
 * options.ts — the choice lists for the Set Management form.
 *
 * Mirrors the drop-downs on the current SALUS Online site so existing users see
 * familiar answers. Each option has a `value` (stored) and a `label` (shown).
 */
import type { ManagementInputs } from '../types';

export const SOIL_TEXTURES = [
  'Sand', 'Loamy Sand', 'Sandy Loam', 'Loam', 'Silt Loam', 'Silt',
  'Sandy Clay Loam', 'Clay Loam', 'Silty Clay Loam', 'Sandy Clay', 'Silty Clay', 'Clay',
].map((t) => ({ value: t, label: t }));

/** Soil depth classes; `label` is in inches (as on the live site), `metricLabel` in cm. */
export const SOIL_DEPTHS = [
  { value: 'shallow', label: 'Shallow (less than 20")', metricLabel: 'Shallow (less than 50 cm)' },
  { value: 'moderate', label: 'Moderate (20–40")', metricLabel: 'Moderate (50–100 cm)' },
  { value: 'deep', label: 'Deep (more than 40")', metricLabel: 'Deep (more than 100 cm)' },
] as const;

/** Soil depth class label in the user's units (metric → cm, US → inches). */
export function soilDepthLabel(value: string, units: 'metric' | 'us'): string {
  const d = SOIL_DEPTHS.find((o) => o.value === value);
  return d ? (units === 'metric' ? d.metricLabel : d.label) : '';
}

/**
 * Crops the form offers. Only corn for now, and it's hard-coded: the answer
 * isn't saved with the run (SALUS Online runs are all corn). Add crops here
 * and a `crop` field to ManagementInputs when more become available.
 */
export const CROPS = [{ value: 'corn', label: 'Corn' }] as const;

export const TILLAGE = [
  { value: 'none', label: 'No tillage' },
  { value: 'minimum', label: 'Minimum tillage' },
  { value: 'moldboard', label: 'Moldboard plow' },
] as const;

export const MATURITY = [100, 110, 120].map((d) => ({
  value: d,
  label: `${d}-day corn`,
}));

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((m, i) => ({ value: i + 1, label: m }));

/** Weather history available to the model. */
export const FIRST_WEATHER_YEAR = 1990;
export const LAST_WEATHER_YEAR = 2025;

/** Sensible defaults matching the live site's pre-filled form. */
export const DEFAULT_INPUTS: ManagementInputs = {
  soilTexture: 'Silty Clay',
  soilDepth: 'deep',
  cornUse: 'grain',
  tillage: 'none',
  plantPopulation: 38000,
  maturityDays: 100,
  plantingMonth: 5,
  plantingDay: 1,
  irrigate: false,
  coverCrop: false,
  inorganicFertilizer: true,
  fertilizerBasis: 'nitrogen',
  fertilizerRate: 150,
  manure: false,
};
