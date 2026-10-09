/**
 * chartColors.ts — the colours of each results chart, and the ready-made
 * colour sets ("presets") users can switch to, e.g. a colour-blind-safe set.
 *
 * Every chart has a few named colour slots (see CHART_SLOTS). The app's
 * default colours come from the MSU tokens; users can pick their own per slot
 * with the palette button on each chart (state lives in state/ChartColorsContext).
 *
 * Presets:
 *  - default      MSU look (lime / grey-green / gold→brown ramp)
 *  - colorblind   Okabe–Ito hues, the standard set designed to stay distinct
 *                 for red–green and blue–yellow colour blindness, plus a
 *                 "cividis"-style yellow→navy ramp for the soil layers.
 *                 Checked with the dataviz palette validator (CVD ΔE ≥ 8).
 * The nitrate profile has ten soil layers; users choose its shallow and deep
 * colours and the layers in between are blended evenly (in OKLab, so the
 * steps look even). The default preset keeps the hand-tuned depthRamp.
 */
import { depthRamp, tokens } from './tokens';

export type ChartId = 'nitrate' | 'water' | 'nbudget' | 'events';

/** One colour slot of a chart: `key` is stored, `label` is shown in the picker. */
export interface ColorSlot {
  key: string;
  label: string;
}

export const CHART_SLOTS: Record<ChartId, ColorSlot[]> = {
  nitrate: [
    { key: 'shallow', label: 'Shallow layers' },
    { key: 'deep', label: 'Deep layers' },
  ],
  water: [
    { key: 'current', label: 'Current day' },
    { key: 'max', label: 'Run maximum' },
  ],
  nbudget: [
    { key: 'current', label: 'Current day' },
    { key: 'max', label: 'Run maximum' },
  ],
  events: [
    { key: 'rain', label: 'Rain' },
    { key: 'irrigation', label: 'Irrigation' },
    { key: 'fertilizer', label: 'Fertilizer N' },
    { key: 'cursor', label: 'Selected day' },
  ],
};

export const CHART_NAMES: Record<ChartId, string> = {
  nitrate: 'Soil nitrate profile',
  water: 'Soil water',
  nbudget: 'Nitrogen budget',
  events: 'Weather & management events',
};

export type ChartColors = Record<ChartId, Record<string, string>>;
export type PresetId = 'default' | 'colorblind';

export const PRESETS: { id: PresetId; label: string; description: string; colors: ChartColors }[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'The standard SALUS Online colours.',
    colors: {
      nitrate: { shallow: depthRamp[0], deep: depthRamp[9] },
      water: { current: tokens.color.accent, max: tokens.color.maxNeutral },
      nbudget: { current: tokens.color.accent, max: tokens.color.maxNeutral },
      events: { rain: tokens.color.rain, irrigation: tokens.color.irrigation, fertilizer: tokens.color.fertilizer, cursor: tokens.color.accentDark },
    },
  },
  {
    id: 'colorblind',
    label: 'Colour-blind safe',
    description: 'Blue / orange based colours that stay distinct for all common types of colour blindness.',
    colors: {
      nitrate: { shallow: '#FFE945', deep: '#00204D' },
      // #8C8C8C: 3.4:1 on white, so the "run maximum" part is visible (WCAG 1.4.11)
      water: { current: '#0072B2', max: '#8C8C8C' },
      nbudget: { current: '#0072B2', max: '#8C8C8C' },
      events: { rain: '#0072B2', irrigation: '#56B4E9', fertilizer: '#D55E00', cursor: '#000000' },
    },
  },
];

export const DEFAULT_COLORS: ChartColors = PRESETS[0].colors;

/** Which preset (if any) a chart's current colours match exactly. */
export function matchingPreset(chart: ChartId, colors: Record<string, string>): PresetId | null {
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const hit = PRESETS.find((p) => CHART_SLOTS[chart].every((s) => same(p.colors[chart][s.key], colors[s.key])));
  return hit?.id ?? null;
}

// ---- Colour maths for the soil-layer ramp ---------------------------------

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** "#RRGGBB" → OKLab [L, a, b]. */
function hexToOklab(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab [L, a, b] → "#RRGGBB" (clamped to the sRGB range). */
function oklabToHex([L, A, B]: [number, number, number]): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** `steps` colours blended evenly from `from` to `to`. */
export function blendRamp(from: string, to: string, steps: number): string[] {
  const a = hexToOklab(from);
  const b = hexToOklab(to);
  return Array.from({ length: steps }, (_, i) => {
    const t = steps === 1 ? 0 : i / (steps - 1);
    return oklabToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
  });
}

/** The ten soil-layer colours for the nitrate chart (hand-tuned ramp when on the default). */
export function nitrateRamp(c: Record<string, string>): string[] {
  return matchingPreset('nitrate', c) === 'default' ? [...depthRamp] : blendRamp(c.shallow, c.deep, depthRamp.length);
}
