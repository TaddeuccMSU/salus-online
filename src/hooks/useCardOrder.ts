/**
 * useCardOrder.ts — remembers the order of the results chart cards that the
 * user set by dragging (see components/results/SortableCardGrid.tsx).
 *
 * The order is a list of chart ids, kept in localStorage (key below) so it is
 * the same for every run and survives a reload. It is always "repaired"
 * against the current list of charts: unknown ids are dropped and any new
 * chart is added at the end, so adding a chart later never breaks a saved layout.
 * Storage is optional: if it's blocked the order simply isn't remembered.
 */
import { useCallback, useMemo, useState } from 'react';

const KEY = 'salus-online.resultsLayout.v1';

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(order: string[] | null) {
  try {
    if (order) localStorage.setItem(KEY, JSON.stringify(order));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: not remembered */
  }
}

/** Saved order repaired against `ids` (the default order). */
function repair(saved: string[], ids: string[]): string[] {
  const kept = saved.filter((id) => ids.includes(id));
  return [...kept, ...ids.filter((id) => !kept.includes(id))];
}

export function useCardOrder(defaultIds: string[]) {
  const [saved, setSaved] = useState<string[]>(read);
  const key = defaultIds.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const order = useMemo(() => repair(saved, defaultIds), [saved, key]);
  const isDefault = order.join('|') === key;

  const setOrder = useCallback((next: string[]) => {
    setSaved(next);
    write(next);
  }, []);
  const reset = useCallback(() => {
    setSaved([]);
    write(null);
  }, []);

  return { order, setOrder, reset, isDefault };
}
