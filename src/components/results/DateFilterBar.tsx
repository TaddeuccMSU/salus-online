/**
 * DateFilterBar.tsx — the date "filter" pinned to the top of Selected Field Results.
 *
 * Layout (left → right): play button, ‹ period ›, Month/Year/All toggle, and a
 * slider spanning the current window with its start/end labels. It sits right
 * under the app header (sticky), per the "filter at the top" request.
 * Follows the chrome colour scheme (white-on-green in the green variant).
 */
import { useColors } from '../../theme/colors';
import dayjs from 'dayjs';
import { Box, IconButton, Paper, Slider, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import type { DailyResult, TimeScale } from '../../types';
import { tokens } from '../../theme/tokens';
import { ChromeSurface, softPrimary, useChrome } from '../../theme/chrome';
import type { useDateWindow } from '../../hooks/useDateWindow';
import { useTour } from '../../tour/TourProvider';

interface Props {
  days: DailyResult[];
  ctl: ReturnType<typeof useDateWindow>;
}

const fmt = (d: string, f: string) => dayjs(d).format(f);

/** Square, soft-tinted arrow button used for ‹ and › (tint follows the chrome scheme). */
const navBtn = { bgcolor: softPrimary(0.12), color: 'primary.main', borderRadius: 2, '&:hover': { bgcolor: softPrimary(0.22) } };

export default function DateFilterBar({ days, ctl }: Props) {
  const c = useColors(); // light or dark mode colours
  const { index, setIndex, scale, setScale, window: w, step, playing, setPlaying } = ctl;
  // Tell the product tour the user moved through time (its "Move through time" step waits for this).
  const { emit } = useTour();
  const moved = () => emit('dateChanged');
  const current = days[index].date;
  const periodLabel = scale === 'month' ? fmt(current, 'MMM YYYY') : scale === 'year' ? fmt(current, 'YYYY') : `${fmt(days[0].date, 'YYYY')}–${fmt(days[days.length - 1].date, 'YYYY')}`;

  const green = useChrome().variant === 'green';
  return (
    <ChromeSurface>
    {/* In the green scheme this bar is a touch darker than the app bar so the two read as separate bands. */}
    <Paper square sx={{ border: 'none', borderBottom: 1, borderColor: 'divider', bgcolor: green ? '#133830' : 'background.paper' }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 }, py: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 1.5, md: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={playing ? 'Pause' : 'Play through time'}>
            <IconButton onClick={() => { setPlaying(!playing); moved(); }} sx={{ bgcolor: tokens.color.accent, color: tokens.color.spartanGreen, '&:hover': { bgcolor: tokens.color.accentHover } }} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
          </Tooltip>
          <IconButton sx={navBtn} onClick={() => { step(-1); moved(); }} aria-label={`Previous ${scale}`}><ChevronLeftIcon /></IconButton>
          <Typography sx={{ fontWeight: 700, minWidth: 92, textAlign: 'center' }}>{periodLabel}</Typography>
          <IconButton sx={navBtn} onClick={() => { step(1); moved(); }} aria-label={`Next ${scale}`}><ChevronRightIcon /></IconButton>
        </Box>

        <ToggleButtonGroup exclusive size="small" value={scale} onChange={(_, v: TimeScale | null) => v && setScale(v)} aria-label="Time scale">
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="year">Year</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1, minWidth: 260, px: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary">{fmt(days[w.start].date, 'MMM D, YYYY')}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{fmt(current, 'dddd, MMMM D, YYYY')}</Typography>
            <Typography variant="caption" color="text.secondary">{fmt(days[w.end].date, 'MMM D, YYYY')}</Typography>
          </Box>
          <Slider
            size="small"
            min={w.start}
            max={w.end}
            value={index}
            onChange={(_, v) => { setIndex(v as number); moved(); }}
            valueLabelDisplay="auto"
            valueLabelFormat={(i) => fmt(days[i].date, 'MMM D, YYYY')}
            aria-label="Simulation date"
            sx={{ color: green ? '#fff' : c.kellyGreen, py: 1 }}
          />
        </Box>
      </Box>
    </Paper>
    </ChromeSurface>
  );
}
