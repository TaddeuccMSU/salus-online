/**
 * FieldMiniMap.tsx — small map thumbnail of a run's field, shown beside the
 * run details at the top of Selected Field Results.
 *
 * The thumbnail is a static (non-draggable) satellite map centred on the
 * field, with no pin (kept clean at this size).
 * Clicking it, or the expand badge, opens a dialog with a full interactive
 * map (zoom, satellite/streets toggle) with the field pin, so users can check
 * where the run is.
 * The attribution required by the imagery provider is shown in the dialog,
 * plus a small "© Esri" credit on the thumbnail.
 */
import { useState } from 'react';
import { Box, ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';
import { ThemeProvider } from '@mui/material/styles';
import FieldMap from '../map/FieldMap';
import { useAppTheme } from '../../theme/chrome';
import { formatLatLng } from '../../hooks/useReverseGeocode';
import type { Run } from '../../types';
import { tokens } from '../../theme/tokens';

interface Props {
  run: Run;
  width?: number;
  height?: number;
}

export default function FieldMiniMap({ run, width = 148, height = 100 }: Props) {
  const theme = useAppTheme(); // light or dark base theme (never a green bar's)
  const [open, setOpen] = useState(false);
  const view = { latitude: run.location.lat, longitude: run.location.lng };

  return (
    <>
      <Box sx={{ position: 'relative', width, height, flexShrink: 0 }}>
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-label={`Show ${run.name} on a larger map`}
        sx={{
          position: 'relative', width, height, borderRadius: 2, overflow: 'hidden',
          border: `2px solid ${tokens.color.border}`, display: 'block',
          '&:hover, &:focus-visible': { borderColor: tokens.color.spartanGreen },
          '&:hover .expand, &:focus-visible .expand': { bgcolor: tokens.color.spartanGreen, color: '#fff' },
        }}
      >
        {/* key forces a fresh map when switching runs (static maps don't re-centre) */}
        <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <FieldMap key={run.id} static initialView={{ ...view, zoom: 12 }} />
        </Box>
        <Box
          className="expand"
          sx={{
            position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 1.5, display: 'grid', placeItems: 'center',
            bgcolor: 'rgba(255,255,255,.92)', color: tokens.color.spartanGreen, boxShadow: 1, transition: 'all .15s',
          }}
        >
          <OpenInFullIcon sx={{ fontSize: 16 }} />
        </Box>
      </ButtonBase>
      {/* Credit sits OUTSIDE the button so the button's name matches what it shows (WCAG 2.5.3) */}
      <Typography aria-hidden sx={{ position: 'absolute', bottom: 2, right: 4, fontSize: '0.5625rem', color: '#fff', textShadow: '0 0 3px #000', pointerEvents: 'none' }}>© Esri</Typography>
      </Box>

      {/* The thumbnail sits in the results header, which may use the green
          "chrome" theme; the dialog must use the normal base theme (light or dark mode) or its
          map controls (e.g. the Satellite/Streets toggle) get green-bar styles. */}
      <ThemeProvider theme={theme}>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth aria-labelledby="field-map-title">
        <DialogTitle id="field-map-title" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, pb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="span" sx={{ display: 'block' }} noWrap>{run.name}</Typography>
            <Typography variant="body2" color="text.secondary">{run.placeName} · {formatLatLng(run.location)}</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} aria-label="Close map"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: { xs: 420, md: 560 } }}>
          <FieldMap selected={run.location} initialView={{ ...view, zoom: 13 }} />
        </DialogContent>
      </Dialog>
      </ThemeProvider>
    </>
  );
}
