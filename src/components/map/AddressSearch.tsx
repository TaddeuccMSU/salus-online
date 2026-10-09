/**
 * AddressSearch.tsx — the "Search address or place" box floating on the map.
 *
 * An MUI Autocomplete fed by useAddressSearch (OpenStreetMap Nominatim).
 * Picking a suggestion calls `onPick(location, label)`; the map page then
 * flies there and drops the field pin, which opens Set Management.
 * Users can also paste coordinates like "42.71, -84.47"; these are used
 * directly without a lookup.
 *
 * "Go" (or Enter with no suggestion highlighted) uses the best match for
 * what's typed: coordinates directly, else the top suggestion, else an
 * immediate lookup. The product tour waits for this step.
 */
import { useEffect, useState } from 'react';
import { useAnnounce } from '../../state/AnnouncerContext';
import { Autocomplete, Box, Button, CircularProgress, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { geocodeOnce, useAddressSearch, type PlaceResult } from '../../hooks/useAddressSearch';
import type { LatLng } from '../../types';

interface Props {
  onPick: (location: LatLng, label: string) => void;
}

/** Recognises "lat, lng" text (e.g. 42.71, -84.47) and returns it as a result. */
function parseCoords(text: string): PlaceResult | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { id: 'coords', label: `${lat}, ${lng}`, short: `${lat}, ${lng}`, location: { lat, lng } };
}

export default function AddressSearch({ onPick }: Props) {
  const [input, setInput] = useState('');
  const coords = parseCoords(input);
  const { results, loading, error } = useAddressSearch(coords ? '' : input);
  const options = coords ? [coords] : results;
  const [going, setGoing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const announce = useAnnounce();
  // Screen readers hear when Go finds nothing (the list text alone isn't read out).
  useEffect(() => {
    if (notFound) announce('No place found. Try adding the state.');
  }, [notFound, announce]);

  /** "Go": use the best match for the typed text. */
  const go = async () => {
    const q = input.trim();
    if (!q) return;
    setNotFound(false);
    const best = coords ?? results[0];
    if (best) return onPick(best.location, best.short);
    setGoing(true);
    try {
      const hit = await geocodeOnce(q);
      if (hit) onPick(hit.location, hit.short);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setGoing(false);
    }
  };

  return (
    <Paper sx={{ boxShadow: '0 4px 16px rgba(0,0,0,.18)', border: 'none', display: 'flex', alignItems: 'center', gap: 0.75, p: 0.5 }}>
      <Autocomplete<PlaceResult, false, false, false>
        sx={{ flex: 1, minWidth: 0 }}
        onKeyDown={(e) => {
          // Enter with no suggestion highlighted = Go.
          const target = e.target as HTMLInputElement;
          if (e.key === 'Enter' && !target.getAttribute('aria-activedescendant')) {
            e.preventDefault();
            void go();
          }
        }}
        options={options}
        filterOptions={(o) => o} // results are already filtered by the geocoder
        popupIcon={null} // reads as a search box, not a dropdown
        getOptionLabel={(o) => o.short}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        clearOnBlur={false} // keep the typed text when focus moves to the Go button
        inputValue={input}
        onInputChange={(_, v) => setInput(v)}
        onChange={(_, v) => v && onPick(v.location, v.short)}
        loading={loading}
        noOptionsText={error ? 'Search is unavailable right now' : notFound ? 'No place found, try adding the state' : input.trim().length < 3 ? 'Type at least 3 letters' : 'No matches'}
        renderOption={({ key, ...props }, o) => (
          <Box component="li" key={key} {...props} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start !important' }}>
            <PlaceOutlinedIcon fontSize="small" sx={{ mt: 0.25, color: 'primary.main' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.short}</Typography>
              {o.label !== o.short && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>{o.label}</Typography>}
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            placeholder="Search address, town or lat, lng"
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                endAdornment: <>{loading && <CircularProgress size={16} />}{params.slotProps.input.endAdornment}</>,
              },
              htmlInput: { ...params.slotProps.htmlInput, 'aria-label': 'Search address or place' },
            }}
          />
        )}
      />
      <Button
        data-tour="address-go"
        variant="contained"
        color="secondary"
        onMouseDown={(e) => e.preventDefault()} // don't steal focus from the search box
        onClick={() => void go()}
        disabled={!input.trim() || going}
        sx={{ minWidth: 56, height: 40, flexShrink: 0 }}
      >
        {going ? <CircularProgress size={18} color="inherit" /> : 'Go'}
      </Button>
    </Paper>
  );
}
