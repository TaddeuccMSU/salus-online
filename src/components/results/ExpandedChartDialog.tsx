/**
 * ExpandedChartDialog.tsx — the "click to expand" view of a results chart.
 *
 * Opens one chart nearly full-screen so it's easier to read and present.
 * The date filter bar sits at the top of the dialog (same controls and state
 * as the page, so moving the date here moves it everywhere), and ‹ › buttons
 * step to the previous / next chart without closing. The chart itself is
 * drawn by `render(height)`, so each chart decides how to use the extra room.
 * Always uses the base theme (light or dark mode), whatever the surrounding page uses.
 * Full-screen on phones; the chart height is measured from the space left.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Dialog, IconButton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAppTheme } from '../../theme/chrome';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  /** Headline number + settings button shown top-right. */
  corner?: ReactNode;
  legend?: ReactNode;
  /** The date filter bar (shared state with the page). */
  dateBar?: ReactNode;
  /** Draws the chart at the given pixel height. */
  render: (height: number) => ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  /** e.g. "2 of 4" */
  position?: string;
}

/** Measures an element's height (ResizeObserver) so the chart fills the space left in the dialog. */
function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setH(Math.floor(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, height: h };
}

export default function ExpandedChartDialog({ open, onClose, title, subtitle, corner, legend, dateBar, render, onPrev, onNext, position }: Props) {
  const theme = useAppTheme(); // light or dark base theme (never a green bar's)
  const phone = useMediaQuery('(max-width:600px)');
  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xl"
        fullScreen={phone}
        aria-labelledby="expanded-chart-title"
        slotProps={{ paper: { sx: { height: phone ? '100%' : '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' } } }}
      >
        <Body {...{ title, subtitle, corner, legend, dateBar, render, onPrev, onNext, position, onClose }} />
      </Dialog>
    </ThemeProvider>
  );
}

/** Dialog contents (separate so the height hook mounts with the dialog). */
function Body({ title, subtitle, corner, legend, dateBar, render, onPrev, onNext, position, onClose }: Omit<Props, 'open'>) {
  const { ref, height } = useElementHeight<HTMLDivElement>();
  return (
    <>
      {/* Row 1: title + position on the left; chart switcher, settings and close on the right */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: { xs: 1.5, md: 2.5 }, pt: 1.5 }}>
        <Typography id="expanded-chart-title" variant="overline" component="h2" sx={{ color: 'primary.main', flex: 1, minWidth: 0, fontSize: { xs: '0.75rem', md: '0.85rem' }, lineHeight: 1.4 }}>
          {title}
          {position && <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, letterSpacing: 0, whiteSpace: 'nowrap' }}>{position}</Typography>}
        </Typography>
        {onPrev && (
          <Tooltip title="Previous chart">
            <IconButton onClick={onPrev} aria-label="Previous chart" size="small"><ChevronLeftIcon /></IconButton>
          </Tooltip>
        )}
        {onNext && (
          <Tooltip title="Next chart">
            <IconButton onClick={onNext} aria-label="Next chart" size="small"><ChevronRightIcon /></IconButton>
          </Tooltip>
        )}
        <Tooltip title="Close">
          <IconButton onClick={onClose} aria-label="Close expanded chart"><CloseIcon /></IconButton>
        </Tooltip>
      </Box>
      {/* Row 2: subtitle + legend, headline number and ⚙ on the right */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, px: { xs: 1.5, md: 2.5 }, pb: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          {legend && <Box sx={{ mt: 0.5 }}>{legend}</Box>}
        </Box>
        {corner}
      </Box>
      {dateBar}
      {/* The chart fills whatever height is left */}
      <Box ref={ref} sx={{ flex: 1, minHeight: 0, px: { xs: 0.5, md: 2.5 }, py: 1 }}>
        {height > 0 && render(Math.max(220, height - 16))}
      </Box>
    </>
  );
}
