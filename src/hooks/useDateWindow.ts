/**
 * useDateWindow.ts — state behind the results date filter bar.
 *
 * Tracks which simulated day is selected (`index` into `days`) and the zoom
 * level (`scale`): Month / Year / All. The slider only spans the current
 * window, so dragging is precise even across a 5-year run. Also provides
 * `step(±1)` for the ‹ › buttons and a simple play/pause animation.
 * Pressing Play when the last simulated day is showing starts again from the
 * first day (otherwise Play would do nothing at the end).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { DailyResult, TimeScale } from '../types';

export function useDateWindow(days: DailyResult[] | undefined) {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState<TimeScale>('year');
  const [playing, setPlaying] = useState(false);
  const n = days?.length ?? 0;

  // Fast lookup: "YYYY-MM-DD" → array index.
  const byDate = useMemo(() => new Map((days ?? []).map((d, i) => [d.date, i])), [days]);

  // Start each new run ~mid-way through its first growing season (July 1 of year 3 if available).
  useEffect(() => {
    if (!days?.length) return;
    const y = Number(days[0].date.slice(0, 4)) + 2;
    setIndex(byDate.get(`${y}-07-01`) ?? Math.floor(days.length / 2));
    setPlaying(false);
  }, [days, byDate]);

  /** First/last index of the window containing the selected day. */
  const window = useMemo(() => {
    if (!days?.length) return { start: 0, end: 0 };
    if (scale === 'all') return { start: 0, end: n - 1 };
    const key = scale === 'year' ? 4 : 7; // compare "YYYY" or "YYYY-MM"
    const prefix = days[index].date.slice(0, key);
    let start = index;
    let end = index;
    while (start > 0 && days[start - 1].date.startsWith(prefix)) start--;
    while (end < n - 1 && days[end + 1].date.startsWith(prefix)) end++;
    return { start, end };
  }, [days, index, scale, n]);

  /** Jump one month/year (or 30 days in "All") back or forward, clamped to the run. */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (!days?.length) return;
      if (scale === 'all') return setIndex((i) => Math.min(n - 1, Math.max(0, i + dir * 30)));
      const target = dayjs(days[index].date).add(dir, scale).format('YYYY-MM-DD');
      const hit = byDate.get(target);
      setIndex(hit ?? (dir > 0 ? n - 1 : 0));
    },
    [days, index, scale, n, byDate],
  );

  // Play: advance 1 day (month view), 3 days (year) or 10 days (all) every 120 ms.
  useEffect(() => {
    if (!playing) return;
    const jump = scale === 'month' ? 1 : scale === 'year' ? 3 : 10;
    const id = setInterval(() => {
      setIndex((i) => {
        if (i + jump >= n - 1) {
          setPlaying(false);
          return n - 1;
        }
        return i + jump;
      });
    }, 120);
    return () => clearInterval(id);
  }, [playing, scale, n]);

  /** Play/pause. Play at the very end of the run restarts from the first day. */
  const setPlayingFromStart = useCallback(
    (on: boolean) => {
      if (on && n > 0 && index >= n - 1) setIndex(0);
      setPlaying(on);
    },
    [index, n],
  );

  return { index, setIndex, scale, setScale, window, step, playing, setPlaying: setPlayingFromStart, day: days?.[index] };
}
