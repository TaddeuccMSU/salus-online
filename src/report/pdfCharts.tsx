/**
 * pdfCharts.tsx — small chart components for the PDF run report.
 *
 * react-pdf can't use the web chart library, so these draw with its SVG
 * primitives (Svg, Path, Rect, Line, Text). All sizes are in PDF points
 * (72 pt = 1 inch). Each chart takes plain arrays and draws:
 *  - NitrogenChart     soil nitrate + plant N lines, leached N on a right axis
 *  - SoilWaterChart    PESW area/line + dotted run-maximum line
 *  - EventsChart       rain + irrigation bars, labelled fertilizer markers
 *  - ProfileMiniChart  one nitrate-profile snapshot (depth on x, like the app)
 * Growing seasons (May–Sep) are shaded on the time-series charts.
 * Each chart takes an optional `palette` (the user's chart colours, see
 * theme/chartColors.ts) so the PDF matches what they chose on screen.
 */
import { G, Line, Path, Rect, Svg, Text } from '@react-pdf/renderer';
import type { DailyEvent, DailyResult } from '../types';
import { tokens } from '../theme/tokens';
import { DEFAULT_COLORS, nitrateRamp, type ChartColors } from '../theme/chartColors';

/** Unit labels for the axes (values arrive already converted; see scaleReportData). */
export interface PdfUnits {
  n: string; // e.g. "kg N/ha" | "lb N/ac"
  w: string; // e.g. "mm" | "in"
  /** Smallest y-axis top for the events chart, in display units (10 mm ≈ 0.4 in). */
  minEvents: number;
}
const METRIC_UNITS: PdfUnits = { n: 'kg N/ha', w: 'mm', minEvents: 10 };

const C = tokens.color;
const FONT = 'Metropolis';
const AXIS = '#9AA8A0';
const PAD = { l: 34, r: 34, t: 16, b: 16 }; // t leaves room for the unit labels above the plot

/** "Nice" round axis maximum and evenly spaced ticks for 0..max. */
export function niceTicks(max: number, count = 4): number[] {
  const raw = Math.max(max, 1e-6) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

const fmt = (v: number) => (v >= 1000 ? v.toLocaleString('en-US') : String(+v.toFixed(1)));

interface Frame {
  width: number;
  height: number;
  n: number; // number of days on the x-axis
}

/** x position for day index i, and the plot box. */
function frame({ width, height, n }: Frame) {
  const pw = width - PAD.l - PAD.r;
  const ph = height - PAD.t - PAD.b;
  return { pw, ph, x: (i: number) => PAD.l + (i / Math.max(1, n - 1)) * pw, yOf: (v: number, max: number) => PAD.t + ph - (v / max) * ph };
}

/** Light-green bands for May 1–Sep 30 plus year tick labels along the bottom. */
function SeasonsAndYears({ days, width, height }: { days: DailyResult[]; width: number; height: number }) {
  const f = frame({ width, height, n: days.length });
  const bands: { a: number; b: number }[] = [];
  const years: { i: number; label: string }[] = [];
  let start = -1;
  days.forEach((d, i) => {
    const md = d.date.slice(5);
    if (md >= '05-01' && md <= '09-30') {
      if (start < 0) start = i;
    } else if (start >= 0) {
      bands.push({ a: start, b: i - 1 });
      start = -1;
    }
    if (md === '01-01' || (i === 0 && md <= '01-15')) years.push({ i, label: d.date.slice(0, 4) });
  });
  if (start >= 0) bands.push({ a: start, b: days.length - 1 });
  return (
    <G>
      {bands.map((b) => (
        <Rect key={b.a} x={f.x(b.a)} y={PAD.t} width={Math.max(1, f.x(b.b) - f.x(b.a))} height={f.ph} fill={C.surfaceGreen} />
      ))}
      <Line x1={PAD.l} x2={PAD.l + f.pw} y1={PAD.t + f.ph} y2={PAD.t + f.ph} stroke={AXIS} strokeWidth={0.6} />
      {years.map((y) => (
        <Text key={y.label} x={f.x(y.i) + 2} y={height - 4} style={{ fontFamily: FONT, fontSize: 7 }} fill={C.textMuted}>
          {y.label}
        </Text>
      ))}
    </G>
  );
}

/** Gridlines + labels for a left (or right) value axis. */
function ValueAxis({ ticks, width, height, side = 'left', color = C.textMuted, unit }: {
  ticks: number[]; width: number; height: number; side?: 'left' | 'right'; color?: string; unit?: string;
}) {
  const f = frame({ width, height, n: 2 });
  const max = ticks[ticks.length - 1];
  return (
    <G>
      {ticks.map((t) => {
        const y = f.yOf(t, max);
        return (
          <G key={t}>
            {side === 'left' && <Line x1={PAD.l} x2={PAD.l + f.pw} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />}
            <Text
              x={side === 'left' ? PAD.l - 4 : PAD.l + f.pw + 4}
              y={y + 2.5}
              textAnchor={side === 'left' ? 'end' : 'start'}
              style={{ fontFamily: FONT, fontSize: 6.5 }}
              fill={color}
            >
              {fmt(t)}
            </Text>
          </G>
        );
      })}
      {unit && (
        <Text x={side === 'left' ? PAD.l - 4 : PAD.l + frame({ width, height, n: 2 }).pw + 4} y={7} textAnchor={side === 'left' ? 'end' : 'start'} style={{ fontFamily: FONT, fontSize: 6 }} fill={color}>
          {unit}
        </Text>
      )}
    </G>
  );
}

/** SVG path through daily values. */
function linePath(values: number[], width: number, height: number, max: number) {
  const f = frame({ width, height, n: values.length });
  return values.map((v, i) => `${i ? 'L' : 'M'}${f.x(i).toFixed(1)},${f.yOf(v, max).toFixed(1)}`).join(' ');
}

export function NitrogenChart({ days, width, height, palette = DEFAULT_COLORS, units = METRIC_UNITS }: { days: DailyResult[]; width: number; height: number; palette?: ChartColors; units?: PdfUnits }) {
  // Plant N follows the Nitrogen budget chart's colour, leached N the fertilizer colour (user-adjustable).
  const plant = palette.nbudget.current === DEFAULT_COLORS.nbudget.current ? C.accentDark : palette.nbudget.current;
  const leach = palette.events.fertilizer;
  const leftTicks = niceTicks(Math.max(...days.map((d) => Math.max(d.soilN, d.plantN))));
  const rightTicks = niceTicks(Math.max(1, ...days.map((d) => d.leachN)));
  const lmax = leftTicks[leftTicks.length - 1];
  const rmax = rightTicks[rightTicks.length - 1];
  return (
    <Svg width={width} height={height}>
      <SeasonsAndYears days={days} width={width} height={height} />
      <ValueAxis ticks={leftTicks} width={width} height={height} unit={units.n} />
      <ValueAxis ticks={rightTicks} width={width} height={height} side="right" color={leach} unit="leached" />
      <Path d={linePath(days.map((d) => d.soilN), width, height, lmax)} stroke={C.spartanGreen} strokeWidth={1} fill="none" />
      <Path d={linePath(days.map((d) => d.plantN), width, height, lmax)} stroke={plant} strokeWidth={1.3} fill="none" />
      <Path d={linePath(days.map((d) => d.leachN), width, height, rmax)} stroke={leach} strokeWidth={1.1} strokeDasharray="3 2" fill="none" />
    </Svg>
  );
}

export function SoilWaterChart({ days, maxPesw, width, height, palette = DEFAULT_COLORS, units = METRIC_UNITS }: { days: DailyResult[]; maxPesw: number; width: number; height: number; palette?: ChartColors; units?: PdfUnits }) {
  // Default keeps the lime fill + darker lime line; custom colours use one colour for both.
  const isDefault = palette.water.current === DEFAULT_COLORS.water.current;
  const fill = palette.water.current;
  const stroke = isDefault ? C.accentDark : palette.water.current;
  const ticks = niceTicks(maxPesw * 1.08);
  const max = ticks[ticks.length - 1];
  const f = frame({ width, height, n: days.length });
  const line = linePath(days.map((d) => d.pesw), width, height, max);
  const area = `${line} L${f.x(days.length - 1)},${PAD.t + f.ph} L${PAD.l},${PAD.t + f.ph} Z`;
  const yMax = f.yOf(maxPesw, max);
  return (
    <Svg width={width} height={height}>
      <SeasonsAndYears days={days} width={width} height={height} />
      <ValueAxis ticks={ticks} width={width} height={height} unit={units.w} />
      <Path d={area} fill={fill} fillOpacity={0.25} />
      <Path d={line} stroke={stroke} strokeWidth={0.9} fill="none" />
      <Line x1={PAD.l} x2={PAD.l + f.pw} y1={yMax} y2={yMax} stroke={C.textMuted} strokeWidth={1} strokeDasharray="1.5 2" />
    </Svg>
  );
}

export function EventsChart({ days, events, width, height, palette = DEFAULT_COLORS, units = METRIC_UNITS }: { days: DailyResult[]; events: DailyEvent[]; width: number; height: number; palette?: ChartColors; units?: PdfUnits }) {
  const ev = palette.events;
  const index = new Map(days.map((d, i) => [d.date, i]));
  const ticks = niceTicks(Math.max(units.minEvents, ...events.map((e) => e.rain + e.irrigation)) * 1.25);
  const max = ticks[ticks.length - 1];
  const f = frame({ width, height, n: days.length });
  const bw = Math.max(0.5, (f.pw / days.length) * 1.4);
  return (
    <Svg width={width} height={height}>
      <SeasonsAndYears days={days} width={width} height={height} />
      <ValueAxis ticks={ticks} width={width} height={height} unit={units.w} />
      {events.map((e) => {
        const i = index.get(e.date);
        if (i === undefined) return null;
        const x = f.x(i) - bw / 2;
        return (
          <G key={e.date}>
            {e.rain > 0 && <Rect x={x} y={f.yOf(e.rain, max)} width={bw} height={f.yOf(0, max) - f.yOf(e.rain, max)} fill={ev.rain} />}
            {e.irrigation > 0 && (
              <Rect x={x} y={f.yOf(e.rain + e.irrigation, max)} width={bw} height={f.yOf(e.rain, max) - f.yOf(e.rain + e.irrigation, max)} fill={ev.irrigation} />
            )}
            {e.fertilizer > 0 && (
              <G>
                <Line x1={f.x(i)} x2={f.x(i)} y1={PAD.t + 1} y2={PAD.t + f.ph} stroke={ev.fertilizer} strokeWidth={0.7} strokeDasharray="2 1.5" />
                <Text x={f.x(i)} y={PAD.t - 2} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 5.5 }} fill={ev.fertilizer}>
                  {fmt(e.fertilizer)}
                </Text>
              </G>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

/** One soil-nitrate snapshot: ten depth columns, value labels, shared y max. */
export function ProfileMiniChart({ values, labels, max, width, height, showYAxis, palette = DEFAULT_COLORS }: {
  values: number[] | null; labels: string[]; max: number; width: number; height: number; showYAxis: boolean; palette?: ChartColors;
}) {
  const ramp = nitrateRamp(palette.nitrate);
  const l = showYAxis ? 20 : 4;
  const b = 24; // room for angled depth labels
  const t = 8;
  const pw = width - l - 4;
  const ph = height - t - b;
  const slot = pw / labels.length;
  const y = (v: number) => t + ph - (Math.min(v, max) / max) * ph;
  const ticks = niceTicks(max, 2);
  return (
    <Svg width={width} height={height}>
      {ticks.map((tk) => (
        <G key={tk}>
          <Line x1={l} x2={l + pw} y1={y(tk)} y2={y(tk)} stroke={C.border} strokeWidth={0.4} />
          {showYAxis && (
            <Text x={l - 3} y={y(tk) + 2} textAnchor="end" style={{ fontFamily: FONT, fontSize: 5.5 }} fill={C.textMuted}>{fmt(tk)}</Text>
          )}
        </G>
      ))}
      {values ? (
        values.map((v, i) => (
          <G key={i}>
            <Rect x={l + i * slot + slot * 0.14} y={y(v)} width={slot * 0.72} height={t + ph - y(v)} fill={ramp[i]} />
            {v >= max * 0.02 && (
              <Text x={l + i * slot + slot / 2} y={y(v) - 1.5} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 4.6 }} fill={C.textMuted}>
                {v.toFixed(0)}
              </Text>
            )}
          </G>
        ))
      ) : (
        <Text x={l + pw / 2} y={t + ph / 2} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 6 }} fill={C.textMuted}>No data for this date</Text>
      )}
      <Line x1={l} x2={l + pw} y1={t + ph} y2={t + ph} stroke={AXIS} strokeWidth={0.5} />
      {labels.map((lab, i) => (
        <G key={lab} transform={`translate(${l + i * slot + slot / 2}, ${t + ph + 4}) rotate(-50)`}>
          <Text x={0} y={2} textAnchor="end" style={{ fontFamily: FONT, fontSize: 4.6 }} fill={C.textMuted}>{lab}</Text>
        </G>
      ))}
    </Svg>
  );
}
