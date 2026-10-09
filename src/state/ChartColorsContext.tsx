/**
 * ChartColorsContext.tsx — remembers each user's chosen chart colours.
 *
 * Wrap the app in <ChartColorsProvider>; any component can then call
 * `useChartColors()` to read the colours for a chart (`colors.water.current`…)
 * or change them. Choices are saved in this browser (localStorage key
 * `salus-online.chartColors.v1`) and apply to every run's results.
 *
 * API:
 *  - colors                       resolved colours for every chart
 *  - setColor(chart, key, hex)    change one colour slot
 *  - applyPreset(preset, chart?)  load a preset into one chart, or all charts
 *  - resetChart(chart)            back to the MSU defaults for that chart
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CHART_SLOTS, DEFAULT_COLORS, PRESETS, type ChartColors, type ChartId, type PresetId } from '../theme/chartColors';

const KEY = 'salus-online.chartColors.v1';
const CHARTS = Object.keys(CHART_SLOTS) as ChartId[];

interface ChartColorsApi {
  colors: ChartColors;
  setColor: (chart: ChartId, key: string, hex: string) => void;
  applyPreset: (preset: PresetId, chart?: ChartId) => void;
  resetChart: (chart: ChartId) => void;
}

const ChartColorsContext = createContext<ChartColorsApi | null>(null);

/** Saved choices merged over the defaults (unknown or broken values are ignored). */
function load(): ChartColors {
  const out = structuredClone(DEFAULT_COLORS);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<ChartColors>;
    for (const c of CHARTS) {
      for (const { key } of CHART_SLOTS[c]) {
        const v = saved[c]?.[key];
        if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) out[c][key] = v;
      }
    }
  } catch {
    /* storage blocked or corrupted: use defaults */
  }
  return out;
}

export function ChartColorsProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ChartColors>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(colors));
    } catch {
      /* ignore */
    }
  }, [colors]);

  const setColor = useCallback((chart: ChartId, key: string, hex: string) => {
    setColors((prev) => ({ ...prev, [chart]: { ...prev[chart], [key]: hex.toUpperCase() } }));
  }, []);

  const applyPreset = useCallback((preset: PresetId, chart?: ChartId) => {
    const p = PRESETS.find((x) => x.id === preset) ?? PRESETS[0];
    setColors((prev) => (chart ? { ...prev, [chart]: { ...p.colors[chart] } } : structuredClone(p.colors)));
  }, []);

  const resetChart = useCallback((chart: ChartId) => applyPreset('default', chart), [applyPreset]);

  const api = useMemo(() => ({ colors, setColor, applyPreset, resetChart }), [colors, setColor, applyPreset, resetChart]);
  return <ChartColorsContext.Provider value={api}>{children}</ChartColorsContext.Provider>;
}

/** Hook: chart colours + setters. Must be used inside <ChartColorsProvider>. */
export function useChartColors(): ChartColorsApi {
  const ctx = useContext(ChartColorsContext);
  if (!ctx) throw new Error('useChartColors must be used inside <ChartColorsProvider>');
  return ctx;
}
