/**
 * units.ts — the display units of SALUS Online: Metric or US customary.
 *
 * One global setting (state/UnitsContext.tsx) decides how every chart,
 * headline number, legend, the PDF report and the Set Management form show
 * quantities. Data stays in its native units underneath:
 *   - SALUS results: kg N/ha, mm, cm, mg N/kg soil (metric)
 *   - Set Management answers: lbs/acre and seeds/acre (as on the live site)
 * and is converted only for display / entry, so switching never changes a run.
 *
 * DEFAULT: metric (for researchers and people used to SALUS output).
 * To change the default, edit DEFAULT_UNITS below or build with
 * VITE_DEFAULT_UNITS=us. Users' own choice is remembered per browser.
 */
export type UnitSystem = 'metric' | 'us';

export const DEFAULT_UNITS: UnitSystem = import.meta.env.VITE_DEFAULT_UNITS === 'us' ? 'us' : 'metric';

export const UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = { metric: 'Metric', us: 'US customary' };

/** Result quantities (native unit = metric) and how to show them in each system. */
const RESULT_UNITS = {
  /** Nitrogen per area (soil nitrate, plant N, leached N, fertilizer events). */
  nArea: { metric: { unit: 'kg N/ha', factor: 1 }, us: { unit: 'lb N/ac', factor: 0.892179 } },
  /** Water depth (soil water, rain, irrigation). */
  water: { metric: { unit: 'mm', factor: 1 }, us: { unit: 'in', factor: 1 / 25.4 } },
  /** Soil depth. */
  depth: { metric: { unit: 'cm', factor: 1 }, us: { unit: 'in', factor: 1 / 2.54 } },
  /** Nitrate concentration (mg/kg is the same number as ppm). */
  conc: { metric: { unit: 'mg N/kg soil', factor: 1 }, us: { unit: 'ppm N', factor: 1 } },
} as const;
export type ResultQuantity = keyof typeof RESULT_UNITS;

/** Unit label of a result quantity, e.g. unitOf('water', 'us') → "in". */
export const unitOf = (q: ResultQuantity, sys: UnitSystem) => RESULT_UNITS[q][sys].unit;
/** Multiplier from the native (metric) value to the display value. */
export const factorOf = (q: ResultQuantity, sys: UnitSystem) => RESULT_UNITS[q][sys].factor;
/** Native value → display value. */
export const convert = (q: ResultQuantity, v: number, sys: UnitSystem) => v * factorOf(q, sys);

/**
 * Set Management inputs (native unit = US, as stored in a run).
 * `factor` multiplies the stored value to get the displayed value.
 */
const INPUT_UNITS = {
  /** Fertilizer rate (actual N or product). */
  rate: { us: { unit: 'lbs/acre', factor: 1 }, metric: { unit: 'kg/ha', factor: 1.120851 } },
  /** Plant population. */
  population: { us: { unit: 'seeds/acre', factor: 1 }, metric: { unit: 'seeds/ha', factor: 2.471054 } },
} as const;
export type InputQuantity = keyof typeof INPUT_UNITS;

export const inputUnit = (q: InputQuantity, sys: UnitSystem) => INPUT_UNITS[q][sys].unit;
/** Stored (US) input value → display value in `sys`. */
export const inputToDisplay = (q: InputQuantity, stored: number, sys: UnitSystem) => stored * INPUT_UNITS[q][sys].factor;
/** Display value typed in `sys` → stored (US) value. */
export const inputFromDisplay = (q: InputQuantity, shown: number, sys: UnitSystem) => shown / INPUT_UNITS[q][sys].factor;

/** Number formatting: small values keep a decimal or two, large ones get thousands separators. */
export function fmtNum(v: number, maxDecimals?: number): string {
  const a = Math.abs(v);
  const d = maxDecimals ?? (a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 1 : 2);
  return v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

/** Fertilizer N rate of a run (stored lbs/acre) as display text, e.g. "168 kg N/ha" / "150 lb N/ac". */
export function nRateText(storedLbsPerAcre: number, sys: UnitSystem): string {
  return sys === 'metric'
    ? `${fmtNum(inputToDisplay('rate', storedLbsPerAcre, sys), 0)} kg N/ha`
    : `${fmtNum(storedLbsPerAcre, 0)} lb N/ac`;
}

/** Soil-layer label "top–bottom" in the display depth unit (cm → whole numbers, inches → 1 decimal). */
export function layerLabel(topCm: number, bottomCm: number, sys: UnitSystem): string {
  const f = factorOf('depth', sys);
  const d = sys === 'metric' ? 0 : 1;
  return `${fmtNum(topCm * f, d)}–${fmtNum(bottomCm * f, d)}`;
}

/** A "nice" axis maximum ≥ v (1, 2, 2.5, 5 × 10ⁿ). */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= v) ?? 10 * mag);
}
