/**
 * EventsTimeline.tsx — "Weather & Management Events" strip.
 *
 * A lightweight custom SVG (thousands of daily bars render faster than in a
 * general chart library). For the visible window it draws:
 *  - rain (blue) with irrigation (teal) stacked on top, in mm; irrigation bars
 *    also get a small round cap, so they differ from rain by shape, not only colour
 *  - fertilizer applications as red markers in a lane along the top
 *  - a lime cursor at the selected day
 * Click or drag anywhere on the strip to jump to that day. Hovering shows a
 * tooltip with that day's rain, irrigation and fertilizer (like the other charts).
 *
 * Accessibility: the tooltip can be dismissed with Esc and stays open while the
 * pointer is over it (WCAG 1.4.13). Keyboard: Tab to the strip, ← → step
 * through the days that have events (the tooltip shows and a screen reader
 * reads them), Enter jumps the page to that day, Esc closes (WCAG 2.1.1).
 */
import { useColors, useIsDark, useVisibleEventColors } from '../../theme/colors';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { srOnly } from '../../theme/a11y';
import dayjs from 'dayjs';
import { Box, Paper, Typography } from '@mui/material';
import { useElementWidth } from '../../hooks/useElementWidth';
import type { DailyEvent, DailyResult } from '../../types';
import { tokens } from '../../theme/tokens';
import { fmtNum, niceMax } from '../../theme/units';

interface Props {
  days: DailyResult[];
  events: DailyEvent[];
  start: number; // first visible day index
  end: number; // last visible day index
  selected: number;
  onSelect: (index: number) => void;
  height?: number;
  /** Series colours (user-adjustable, see ChartColorButton). */
  colors?: { rain: string; irrigation: string; fertilizer: string; cursor: string };
  /** Display units: rain/irrigation are mm in the data, fertilizer kg N/ha; factors convert them. */
  water?: { unit: string; factor: number };
  nitrogen?: { unit: string; factor: number };
}

const DEFAULT_EVENT_COLORS = { rain: tokens.color.rain, irrigation: tokens.color.irrigation, fertilizer: tokens.color.fertilizer, cursor: tokens.color.accentDark };

const PAD = { l: 40, r: 8, t: 26, b: 22 };

/** One "swatch · label · value" line in the hover tooltip. */
function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ flex: 1 }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}

export default function EventsTimeline({ days, events, start, end, selected, onSelect, height = 170, colors = DEFAULT_EVENT_COLORS, water = { unit: 'mm', factor: 1 }, nitrogen = { unit: 'kg N/ha', factor: 1 } }: Props) {
  // Light / dark mode colours. In dark mode, series colours too dark to see on
  // the dark card (e.g. a black "selected day" line) swap for light ones.
  const c = useColors();
  const dark = useIsDark();
  colors = useVisibleEventColors(colors);
  const svgRef = useRef<SVGSVGElement>(null);
  const { ref: boxRef, width: W } = useElementWidth<HTMLDivElement>();
  const H = height;
  const count = end - start + 1;
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + ((i - start + 0.5) / count) * plotW;
  const barW = Math.max(0.6, (plotW / count) * 0.75);

  // Events keyed by date for O(1) lookup while drawing.
  const byDate = useMemo(() => new Map(events.map((e) => [e.date, e])), [events]);

  // Visible events + y max for the window, in DISPLAY units (mm or inches).
  const { visible, yMax } = useMemo(() => {
    const vis: { i: number; e: DailyEvent }[] = [];
    let max = 10;
    for (let i = start; i <= end; i++) {
      const e = byDate.get(days[i].date);
      if (!e) continue;
      vis.push({ i, e });
      max = Math.max(max, e.rain + e.irrigation);
    }
    return { visible: vis, yMax: niceMax(max * water.factor) };
  }, [byDate, days, start, end, water.factor]);
  /** Water amount in the data's mm → y position. */
  const y = (mm: number) => PAD.t + plotH - ((mm * water.factor) / yMax) * plotH;
  /** Display value → y position (gridlines). */
  const yd = (v: number) => PAD.t + plotH - (v / yMax) * plotH;

  // X-axis ticks: months for ≤ 1 year windows, years otherwise.
  const ticks = useMemo(() => {
    const out: { i: number; label: string }[] = [];
    const yearly = count > 400;
    for (let i = start; i <= end; i++) {
      const d = days[i].date;
      if (d.endsWith('-01') && (!yearly || d.slice(5, 7) === '01')) out.push({ i, label: dayjs(d).format(yearly ? 'YYYY' : count > 40 ? 'MMM' : 'MMM D') });
      else if (count <= 40 && Number(d.slice(8)) % 7 === 1) out.push({ i, label: dayjs(d).format('MMM D') });
    }
    return out;
  }, [days, start, end, count]);

  /** Pointer position → day index in the visible window. */
  const indexAt = (ev: PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return null;
    const ux = ((ev.clientX - box.left) / box.width) * W;
    const i = Math.round(start + ((ux - PAD.l) / plotW) * count - 0.5);
    return Math.min(end, Math.max(start, i));
  };

  /** Converts a pointer position into a day index and reports it. */
  const pick = (ev: PointerEvent<SVGSVGElement>) => {
    const i = indexAt(ev);
    if (i !== null) onSelect(i);
  };

  // Hover tooltip: the day under the pointer. Bars can be 1 px wide when the
  // whole run is shown, so it snaps to the nearest day WITH an event within
  // ~5 px; otherwise it shows the exact day ("no events").
  const [hover, setHover] = useState<{ i: number; py: number } | null>(null);
  const onHover = (ev: PointerEvent<SVGSVGElement>) => {
    let i = indexAt(ev);
    const box = svgRef.current?.getBoundingClientRect();
    if (i === null || !box) return;
    if (!byDate.has(days[i].date)) {
      const reach = Math.max(1, Math.round(5 / (plotW / count)));
      for (let d = 1; d <= reach; d++) {
        if (i - d >= start && byDate.has(days[i - d].date)) { i -= d; break; }
        if (i + d <= end && byDate.has(days[i + d].date)) { i += d; break; }
      }
    }
    setHover({ i, py: ev.clientY - box.top });
  };
  const hoverEvent = hover ? byDate.get(days[hover.i]?.date) : undefined;
  const fmtW = (mm: number) => `${fmtNum(mm * water.factor, water.factor === 1 ? 1 : 2)} ${water.unit}`;

  // Esc closes the tooltip (WCAG 1.4.13: dismissible without moving the pointer).
  useEffect(() => {
    if (!hover) return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setHover(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hover]);

  /** Plain-words description of one day, for screen readers. */
  const describe = (i: number) => {
    const e = byDate.get(days[i].date);
    const parts = e ? [e.rain > 0 && `rain ${fmtW(e.rain)}`, e.irrigation > 0 && `irrigation ${fmtW(e.irrigation)}`, e.fertilizer > 0 && `fertilizer ${fmtNum(e.fertilizer * nitrogen.factor)} ${nitrogen.unit}`].filter(Boolean) : [];
    return `${dayjs(days[i].date).format('dddd, MMMM D, YYYY')}: ${parts.length ? parts.join(', ') : 'no events'}.`;
  };
  const [spoken, setSpoken] = useState('');
  /** Keyboard: ← → move between days with events, Enter selects, Esc closes. */
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const from = hover?.i ?? selected;
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      let i = from + dir;
      while (i >= start && i <= end && !byDate.has(days[i].date)) i += dir;
      if (i < start || i > end) { setSpoken(dir > 0 ? 'No more events in this period.' : 'No earlier events in this period.'); return; }
      setHover({ i, py: H / 2 });
      setSpoken(describe(i) + ' Press Enter to show this day.');
    } else if (e.key === 'Enter' && hover) {
      e.preventDefault();
      onSelect(hover.i);
    } else if (e.key === 'Escape') {
      setHover(null);
    }
  };

  return (
    // Leaving the whole strip (chart AND tooltip) closes the tooltip, so the pointer can move onto it.
    <Box ref={boxRef} onPointerLeave={() => setHover(null)} sx={{ width: '100%', touchAction: 'none', position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="group"
        tabIndex={0}
        aria-label="Daily rain, irrigation and fertilizer events. Use the left and right arrow keys to step through the events; Enter shows that day on every chart."
        onKeyDown={onKeyDown}
        onBlur={() => setHover(null)}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => { if (e.buttons === 1) pick(e); onHover(e); }}
        style={{ cursor: 'pointer', display: 'block' }}
      >
        {/* gridlines + y labels */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yd(yMax * f)} y2={yd(yMax * f)} stroke={c.border} />
            <text x={PAD.l - 6} y={yd(yMax * f) + 4} textAnchor="end" style={{ fontSize: '0.6875rem' }} fill={c.textMuted}>{fmtNum(yMax * f, 2)}</text>
          </g>
        ))}
        <text x={4} y={PAD.t - 12} style={{ fontSize: '0.6875rem' }} fill={c.textMuted}>{water.unit}</text>

        {/* rain + irrigation bars */}
        {visible.map(({ i, e }) => (
          <g key={i}>
            {e.rain > 0 && <rect x={x(i) - barW / 2} width={barW} y={y(e.rain)} height={y(0) - y(e.rain)} fill={colors.rain} />}
            {e.irrigation > 0 && (
              <>
                <rect x={x(i) - barW / 2} width={barW} y={y(e.rain + e.irrigation)} height={y(e.rain) - y(e.rain + e.irrigation)} fill={colors.irrigation} />
                {/* round cap marks irrigation (shape cue, WCAG 1.4.1) */}
                <circle cx={x(i)} cy={y(e.rain + e.irrigation) - 4} r={3.5} fill={colors.irrigation} stroke={c.outline} strokeWidth={1.25} />
              </>
            )}
            {e.fertilizer > 0 && (
              <g>
                <line x1={x(i)} x2={x(i)} y1={PAD.t - 6} y2={y(0)} stroke={colors.fertilizer} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />
                <rect x={x(i) - 4} y={PAD.t - 20} width={8} height={12} rx={2} fill={colors.fertilizer} />
              </g>
            )}
          </g>
        ))}

        {/* x axis */}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} stroke={dark ? c.maxNeutral : '#9AA8A0'} />
        {ticks.map((t) => (
          <text key={t.i} x={x(t.i)} y={H - 6} style={{ fontSize: '0.6875rem' }} textAnchor="middle" fill={c.textMuted}>{t.label}</text>
        ))}

        {/* hover guide line */}
        {hover && (
          <line x1={x(hover.i)} x2={x(hover.i)} y1={PAD.t - 22} y2={y(0)} stroke={c.textMuted} strokeWidth={1} strokeDasharray="2 2" pointerEvents="none" />
        )}

        {/* selected-day cursor */}
        {selected >= start && selected <= end && (
          <g>
            <rect x={x(selected) - 1.5} width={3} y={PAD.t - 22} height={plotH + 22} fill={colors.cursor} />
          </g>
        )}
      </svg>

      {/* Hover tooltip (styled like the MUI chart tooltips on the other cards) */}
      {hover && (
        <Paper
          elevation={4}
          sx={{
            position: 'absolute', zIndex: 2, px: 1.5, py: 1, minWidth: 190, border: 'none',
            top: Math.max(0, Math.min(hover.py - 20, H - 120)),
            ...(x(hover.i) > W - 220 ? { right: W - x(hover.i) + 12 } : { left: x(hover.i) + 12 }),
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
            {dayjs(days[hover.i].date).format('ddd, MMM D, YYYY')}
          </Typography>
          {hoverEvent && (hoverEvent.rain > 0 || hoverEvent.irrigation > 0 || hoverEvent.fertilizer > 0) ? (
            <>
              <TipRow color={colors.rain} label="Rain" value={fmtW(hoverEvent.rain)} />
              <TipRow color={colors.irrigation} label="Irrigation" value={fmtW(hoverEvent.irrigation)} />
              {hoverEvent.fertilizer > 0 && (
                <TipRow color={colors.fertilizer} label="Fertilizer N" value={`${fmtNum(hoverEvent.fertilizer * nitrogen.factor)} ${nitrogen.unit}`} />
              )}
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">No rain, irrigation or fertilizer</Typography>
          )}
          {hover.i !== selected && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>Click (or press Enter) to show this day</Typography>
          )}
        </Paper>
      )}
      <Box role="status" aria-live="polite" sx={srOnly}>{spoken}</Box>
    </Box>
  );
}
