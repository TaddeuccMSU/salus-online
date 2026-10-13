/**
 * summaryShared.ts — pieces shared by the Results summary panel and the
 * Compare runs dialog: the statistics (Best … Total), the "Filter results"
 * goals (Best Agronomic / Economic / Environmental) with their colours and the
 * measures each goal covers, cell shading, number format and remembered
 * choices (browser storage).
 */
import { alpha } from '@mui/material';

/** The statistics columns, in table order (also the Cards view's "Show" filter). */
export const STAT_COLUMNS = [
  { key: 'best', label: 'Best' },
  { key: 'avg', label: 'Average' },
  { key: 'median', label: 'Median' },
  { key: 'worst', label: 'Worst' },
  { key: 'total', label: 'Total' },
] as const;
export type StatKey = (typeof STAT_COLUMNS)[number]['key'];

/**
 * "Filter results" goals. Turning one on shades the winning cell (the Best
 * value; Average or Total when a measure has no Best) of every measure that
 * counts for that goal, in the goal's colour. A cell that wins for two goals
 * is split half-and-half between both colours.
 */
export const GOALS = [
  { key: 'agro', label: 'Best Agronomic', color: '#43A047' },
  { key: 'econ', label: 'Best Economic', color: '#1E88E5' },
  { key: 'env', label: 'Best Environmental', color: '#E53935' },
] as const;
export type GoalKey = (typeof GOALS)[number]['key'];
export const FILTERS_KEY = 'salus-online.resultsFilters.v1';
/** Which goals each measure counts for (by SUMMARY_ROWS id); every other measure is Environmental only. */
export const ROW_GOALS: Record<string, GoalKey[]> = {
  yield: ['agro', 'econ'], nue: ['agro', 'econ'], nfe: ['agro', 'econ'],
  et: ['agro'], wue: ['agro'], hot: ['agro'],
};
export const rowGoals = (id: string): GoalKey[] => ROW_GOALS[id] ?? ['env'];
/** Cell background for 1 or 2 winning goals (2 = left half / right half). */
export function goalBackground(goals: GoalKey[], a: number): string {
  const col = (k: GoalKey) => alpha(GOALS.find((g) => g.key === k)!.color, a);
  if (goals.length === 1) return col(goals[0]);
  return `linear-gradient(90deg, ${col(goals[0])} 50%, ${col(goals[1])} 50%)`;
}

/** Reads a remembered choice (browser storage may be blocked or hold old data). */
export function load<T>(key: string, ok: (v: unknown) => v is T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    const v: unknown = raw ? JSON.parse(raw) : undefined;
    return ok(v) ? v : fallback;
  } catch {
    return fallback;
  }
}
export function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked: choice lasts this visit */ }
}

/** Two decimals with thousands separators; "–" for none. */
export const fmt = (v: number | null) => (v === null ? '–' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
