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

/** Planting months the form offers: April and May only (values match MONTHS). */
export const PLANTING_MONTHS = [4, 5] as const;

/** Number of days in a month (1–12); uses a non-leap year, so February is 28. */
export function daysInMonth(month: number): number {
  return new Date(2021, month, 0).getDate();
}

export const MATURITY = [100, 110, 120].map((d) => ({
  value: d,
  label: `${d}-day corn`,
}));

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((m, i) => ({ value: i + 1, label: m }));

/** Years the Simulation period slider offers (weather history available to the model). */
export const FIRST_WEATHER_YEAR = 1980;
export const LAST_WEATHER_YEAR = 2021;

/** Years a new run (and the demo runs) start with. */
export const DEFAULT_START_YEAR = 2010;
export const DEFAULT_END_YEAR = 2014;

/**
 * Fertilizer products offered when the rate is entered as product (from the
 * live SALUS Online form). `n` is the nitrogen fraction by weight.
 */
export const FERTILIZER_PRODUCTS = [
  { value: 'ammonium-nitrate', label: 'Ammonium Nitrate', n: 0.34 },
  { value: 'ammonium-sulfate', label: 'Ammonium Sulfate', n: 0.205 },
  { value: 'calcium-nitrate', label: 'Calcium Nitrate', n: 0.155 },
  { value: 'cal-nitro', label: 'Cal-nitro', n: 0.26 },
  { value: 'urea', label: 'Urea', n: 0.46 },
  { value: 'anhydrous-ammonia', label: 'Anhydrous Ammonia', n: 0.822 },
  { value: 'aqua-ammonia', label: 'Aqua Ammonia', n: 0.21 },
  { value: 'uan', label: 'Urea-ammonium Nitrate', n: 0.3 },
  { value: 'low-pressure-n', label: 'Low Pressure N Solutions', n: 0.4 },
] as const;

/** A product as shown in the list, e.g. "Ammonium Nitrate: 34% N". */
export function productLabel(value: string): string {
  const p = FERTILIZER_PRODUCTS.find((o) => o.value === value) ?? FERTILIZER_PRODUCTS[0];
  return `${p.label}: ${Math.round(p.n * 1000) / 10}% N`;
}

/** Nitrogen fraction of a product (falls back to the first product). */
export function productN(value: string): number {
  return (FERTILIZER_PRODUCTS.find((o) => o.value === value) ?? FERTILIZER_PRODUCTS[0]).n;
}

/** Nitrogen applied, lbs N/acre, whether the rate was entered as N or as product. */
export function nitrogenRate(v: Pick<ManagementInputs, 'fertilizerBasis' | 'fertilizerRate' | 'fertilizerProduct'>): number {
  return v.fertilizerBasis === 'product' ? v.fertilizerRate * productN(v.fertilizerProduct) : v.fertilizerRate;
}

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
  fertilizerProduct: 'ammonium-nitrate',
  manure: false,
};
