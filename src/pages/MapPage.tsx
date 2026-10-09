/**
 * MapPage.tsx — route "/" — steps 1 and 2 of the 3-step new-run flow.
 *
 *   1 Select field     click the map → lime pin
 *   2 Set Management   a panel slides in on the right, over the map
 *   3 Results          "Run SALUS" creates the run and opens its results page
 *
 * The map stays live while the panel is open, so clicking elsewhere simply
 * moves the pin. Panel layout depends on the screen:
 *   - desktop (≥ 900 px wide): 540 px panel on the right, map fills the rest
 *   - phone/tablet in LANDSCAPE (≤ 600 px tall): 50/50 split, map left,
 *     panel right; the stepper is hidden to save height
 *   - phone in portrait: map keeps the top ~34% of the area below the
 *     (condensed) stepper; the form is a sheet filling the bottom 66%
 * In every layout the map shrinks beside the panel and pans if needed so
 * the pin stays visible. A slim stepper under the header shows where the user is.
 * Top-right of the map (desktop): an address search bar. Picking a result (or Go) only
 * FLIES the map there (zoomed to field level); the user then clicks their
 * actual field to drop the pin. An address is usually a house or town centre,
 * not the field, so selection is always a deliberate map click. The search
 * hides once a location is selected. Below it, when nothing is selected, a
 * step-1 instructions card (it says "Now click your field" after a search)
 * with a large How it works button. The card can be closed (✕); a round
 * "?" button then brings it back. That choice is remembered in localStorage.
 *
 * Keyboard: after an address search, focus moves onto the map; with keyboard
 * focus the map shows a white reticle (arrows move, + − zoom, Enter selects; see
 * FieldMap). Selecting by keyboard moves focus to the Set Management heading,
 * and closing the panel puts focus back on the map.
 */
import { useColors } from '../theme/colors';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Drawer, Fab, IconButton, Paper, Tooltip, Typography, useMediaQuery } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import CloseIcon from '@mui/icons-material/Close';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import AddressSearch from '../components/map/AddressSearch';
import FieldMap, { type SelectHow } from '../components/map/FieldMap';
import WelcomeDialog from '../components/map/WelcomeDialog';
import SetManagementPanel from '../components/runs/SetManagementPanel';
import WizardStepper from '../components/layout/WizardStepper';
import { useRuns } from '../state/RunsContext';
import { formatLatLng, useReverseGeocode } from '../hooks/useReverseGeocode';
import { useTour, useTourAction } from '../tour/TourProvider';
import { TOUR_DEMO_FIELD } from '../tour/HowToTourConfig';
import type { LatLng, ManagementInputs, RunSetup } from '../types';
import { tokens } from '../theme/tokens';
import { srOnly } from '../theme/a11y';
import { usePageTitle } from '../state/AnnouncerContext';

const WELCOME_KEY = 'salus-online.welcomed';
const HELP_HIDDEN_KEY = 'salus-online.mapHelpHidden';
/** Side panel width: 540 px at default text size, wider with large text (rem), never over 60% of the screen. */
const PANEL_WIDTH = 'min(33.75rem, 60vw)';
/** Portrait phones: share of the map area given to the form sheet (map keeps the rest, on top). */
const SHEET_SHARE = 66;

/** Reads / writes a "1" flag in localStorage, ignoring blocked storage. */
function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** True if this browser hasn't dismissed the welcome dialog yet. */
function firstVisit(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) !== '1';
  } catch {
    return true;
  }
}

export default function MapPage() {
  const c = useColors(); // light or dark mode colours
  const navigate = useNavigate();
  const { runs, createRun } = useRuns();
  // Landscape phones/small tablets take priority: they may be ≥ 900 px wide
  // but are too short for a fixed 540 px panel, so they get a 50/50 split.
  const split = useMediaQuery('(orientation: landscape) and (max-height: 600px)');
  const desktop = useMediaQuery('(min-width:900px)') && !split;
  const side = split || desktop; // panel docks on the right (vs. bottom sheet)
  const panelWidth = split ? '50%' : PANEL_WIDTH;
  const layout = split ? 'split' : desktop ? 'desktop' : 'sheet';
  const [welcome, setWelcome] = useState(firstVisit);
  const [selected, setSelected] = useState<LatLng | null>(null);
  const [flyTarget, setFlyTarget] = useState<LatLng | null>(null);
  /** Bumped to move keyboard focus onto the map / the Set Management heading. */
  const [focusMap, setFocusMap] = useState(0);
  const [focusPanel, setFocusPanel] = useState(0);
  /** Label of the last address searched (the map has flown there; waiting for a field click). */
  const [searchedPlace, setSearchedPlace] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(() => !readFlag(HELP_HIDDEN_KEY));
  const placeName = useReverseGeocode(selected);
  usePageTitle(selected ? 'Set Management' : 'Select your field');

  /** Show / hide the step-1 instructions card (remembered for next visit). */
  const toggleHelp = (open: boolean) => {
    setHelpOpen(open);
    writeFlag(HELP_HIDDEN_KEY, !open);
  };

  /** Search result picked → fly there (field zoom). The user then clicks their field. */
  const goToPlace = (location: LatLng, label: string) => {
    setFlyTarget({ ...location }); // new object so searching the same place again still flies
    setSearchedPlace(label);
    setFocusMap((n) => n + 1); // keyboard users carry on straight from the search to the map
    emit('placeFound'); // advances the tour's "Find your field" step
  };

  /** Map click (or Enter on the map) → drop the field pin (opens Set Management). */
  const selectField = (p: LatLng, how: SelectHow = 'pointer') => {
    if (how === 'keyboard' && !selected) setFocusPanel((n) => n + 1); // panel just opened: take focus there
    setSelected(p);
    setSearchedPlace(null);
    emit('fieldSelected'); // advances the tour's "Click your field" step
  };

  // Product tour: start it from the Welcome dialog, and provide the two
  // map-page set-up actions the tour needs (see src/tour/HowToTourConfig.ts).
  const { startTour, emit, active: tourActive } = useTour();
  useTourAction('resetMap', () => {
    setSelected(null);
    setSearchedPlace(null);
  });
  useTourAction('flyToDemoArea', () => {
    setFlyTarget({ lat: TOUR_DEMO_FIELD.lat, lng: TOUR_DEMO_FIELD.lng });
    setSearchedPlace(TOUR_DEMO_FIELD.placeName);
  });
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useTourAction('selectDemoField', () => {
    if (selectedRef.current) return; // keep the user's own pin (e.g. from their search)
    const p = { lat: TOUR_DEMO_FIELD.lat, lng: TOUR_DEMO_FIELD.lng };
    setFlyTarget(p);
    setSelected(p);
  });

  const closeWelcome = () => {
    setWelcome(false);
    try {
      localStorage.setItem(WELCOME_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  /** "Run SALUS" → save the run and jump to step 3 (Results). */
  const runSalus = (setup: RunSetup, inputs: ManagementInputs) => {
    if (!selected) return;
    const run = createRun(selected, placeName || formatLatLng(selected), setup, inputs);
    navigate(`/runs/${run.id}/results`, { state: { fromWizard: true } });
    emit('runSubmitted', { runId: run.id }); // tour shows this new run's results
  };

  return (
    // Fills the space under the header exactly (AppShell locks the window height on this page).
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
      {/* Page heading for screen readers (the map page has no visible one) */}
      <Box component="h1" sx={srOnly}>{selected ? 'Set Management' : 'Select your field'}</Box>
      {!split && <WizardStepper active={selected ? 1 : 0} />}

      {/* overflow: hidden is essential: the closed (persistent) Set Management drawer
          waits just off-screen, right on desktop and below on phones. Without clipping,
          it stretches the page, adding scrollbars that make the layout jump whenever
          a modal (e.g. the Welcome dialog) locks page scrolling. */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Leave room for a side panel so the pin isn't hidden under it */}
        <Box
          data-tour="map"
          sx={{
            position: 'absolute', top: 0, left: 0,
            right: selected && side ? panelWidth : 0,
            bottom: selected && !side ? `${SHEET_SHARE}%` : 0,
            transition: 'right .25s, bottom .25s',
          }}
        >
          <FieldMap
            runs={runs}
            selected={selected}
            onSelect={selectField}
            keepInView={selected}
            layoutKey={`${layout}-${!!selected}`}
            flyTo={flyTarget}
            // During a tour a click on an old run's pin is almost always an
            // attempt to pick the field there, so it does that instead of
            // leaving the map (which would end the tour).
            focusKey={focusMap}
            runMenu={!tourActive} // during a tour a pin click picks the field there instead
            onRunClick={(r) => (tourActive ? selectField(r.location) : navigate(`/runs/${r.id}/results`))}
          />
        </Box>

        {/* Address search — only while choosing a field; hidden once a pin is dropped
            (closing the Set Management panel clears the pin and brings it back) */}
        {!selected && (
          <Box
            sx={{
              // Top-RIGHT on desktop / landscape split (the zoom buttons own the top-left);
              // full width beside the zoom buttons on phones.
              position: 'absolute', zIndex: 2, top: split ? 10 : 16, right: { xs: 12, md: 16 },
              ...(split ? { width: 360 } : { left: { xs: 56, md: 'auto' }, width: { md: 360 } }),
            }}
          >
            <Box data-tour="address-search"><AddressSearch onPick={goToPlace} /></Box>
          </Box>
        )}

        {/* "?" brings the instructions back after they were closed */}
        {!selected && !helpOpen && !tourActive && (
          <Tooltip title="Show instructions" placement="left">
            <Fab
              size="small"
              onClick={() => toggleHelp(true)}
              aria-label="Show instructions"
              sx={{ position: 'absolute', zIndex: 2, top: { xs: 68, md: 72 }, right: { xs: 12, md: 16 }, bgcolor: 'background.paper', color: 'primary.main', '&:hover': { bgcolor: c.surfaceGreen } }}
            >
              <QuestionMarkIcon />
            </Fab>
          </Tooltip>
        )}

        {/* Step 1 card — top-right under the search on desktop, bottom sheet on phones.
            Closable; hidden while the Set Management panel is open and during the
            product tour (the tour's pop-overs give the same instructions). */}
        {!selected && helpOpen && !tourActive && (
          <Paper
            sx={{
              position: 'absolute', top: { xs: 'auto', md: 72 }, bottom: { xs: 0, md: 'auto' }, left: { xs: 0, md: 'auto' },
              right: { xs: 0, md: 16 }, width: { md: 360 }, maxHeight: { xs: '50%', md: 'calc(100% - 160px)' }, // clears the basemap toggle
              overflow: 'auto', p: 2.5, boxShadow: '0 8px 30px rgba(0,0,0,.18)',
              borderTop: `${tokens.headerRule}px solid ${tokens.color.spartanGreen}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="overline" sx={{ color: 'primary.main', flex: 1 }}>Step 1 of 3 · Select field</Typography>
              <Tooltip title="Hide instructions">
                <IconButton size="small" onClick={() => toggleHelp(false)} aria-label="Hide instructions" sx={{ ml: 0.5 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {searchedPlace ? (
              <>
                <Typography variant="h6" component="h2" sx={{ mt: 0.5 }}>Now click your field</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  We've zoomed to <strong>{searchedPlace}</strong>. Click the field itself on the map to drop your pin;
                  the Set Management form opens straight away. (Keyboard: arrow keys move the map, Enter drops the
                  pin in the centre of the white frame.)
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" component="h2" sx={{ mt: 0.5 }}>Find your field</Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Search for an address in the search box to zoom there, or pan and zoom the map yourself. Then click your field to
                  drop a pin. Satellite imagery helps you find the exact spot. Using a keyboard? Tab to the map, move
                  with the arrow keys and press Enter.
                </Typography>
              </>
            )}

            {/* Big white-on-green "How it works": opens the Welcome dialog, whose
                "Show me how" starts the guided tour. */}
            <Button
              fullWidth
              size="large"
              variant="contained"
              color="primary"
              startIcon={<HelpOutlineIcon />}
              onClick={() => setWelcome(true)}
              sx={{ mt: 2, py: 1.5, fontSize: '1rem', fontWeight: 700, bgcolor: tokens.color.spartanGreen, color: '#fff', '&:hover': { bgcolor: '#0F2E27' } }}
            >
              How it works
            </Button>
          </Paper>
        )}

        {/* Step 2 — Set Management panel (right side on desktop / landscape split, bottom sheet in portrait) */}
        <Drawer
          anchor={side ? 'right' : 'bottom'}
          variant="persistent"
          open={!!selected}
          slotProps={{
            paper: {
              sx: {
                position: 'absolute',
                width: side ? panelWidth : '100%',
                height: side ? '100%' : `${SHEET_SHARE}%`,
                borderLeft: side ? `1px solid ${c.border}` : 'none',
                borderTop: side ? 'none' : `${tokens.headerRule}px solid ${tokens.color.spartanGreen}`,
                boxShadow: side ? '-8px 0 30px rgba(0,0,0,.15)' : '0 -8px 24px rgba(0,0,0,.15)',
              },
            },
          }}
        >
          {selected && (
            <SetManagementPanel
              location={selected}
              placeName={placeName}
              onClose={() => {
                setSelected(null);
                setFocusMap((n) => n + 1); // back to the map, where the user was
                emit('fieldCleared'); // a tour on a Set Management step goes back to "Click your field"
              }}
              onSubmit={runSalus}
              focusKey={focusPanel}
              dense={split || !side}
            />
          )}
        </Drawer>
      </Box>

      <WelcomeDialog
        open={welcome}
        onClose={closeWelcome}
        onTour={() => {
          closeWelcome();
          startTour();
        }}
      />
    </Box>
  );
}
