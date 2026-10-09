/**
 * FieldMap.tsx — the interactive MapLibre map used to pick a field.
 *
 * Built on `react-map-gl/maplibre` (MIT) + `maplibre-gl` (BSD). Features:
 *  - click anywhere to drop the "selected location" pin (`onSelect`)
 *  - green pins for existing runs; click one to open it (`onRunClick`). Runs at
 *    the same spot share one pin with a count badge and a menu to pick a run.
 *  - Satellite / Streets toggle (Streets = satellite imagery with roads and road
 *    names on top, the 'hybrid' basemap; the plain street map is no longer
 *    offered), zoom buttons, geolocate, scale bar
 *  - `static` mode: no controls and no panning/zooming (thumbnails)
 *  - `keepInView`: after the map box resizes (e.g. a side panel opens), gently
 *    pans so that point stays visible, without changing the zoom
 *
 * KEYBOARD (when `onSelect` is set): Tab to the map and a white reticle (four
 * corner brackets) appears in the middle, with a short key guide. Arrow keys move the map (MapLibre's own
 * keyboard handler), + / − zoom, and Enter or Space drops the pin in the
 * centre of the reticle. Screen readers hear the map's instructions (its aria-label), the
 * map-centre position after each move, and the result of selecting (a polite
 * live region). Run pins are focusable buttons (Enter opens the run).
 * `focusKey`: change it to move keyboard focus onto the map (e.g. after an
 * address search, or when Set Management closes). The reticle only shows
 * for keyboard focus (:focus-visible) and hides on a mouse click, so mouse users never see it.
 * The map is "controlled" by the parent through `selected` and `flyTo`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Map, { GeolocateControl, Marker, NavigationControl, ScaleControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Box, Menu, MenuItem, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import type { LatLng, Run } from '../../types';
import { tokens } from '../../theme/tokens';
import { basemapStyle, type BasemapId } from './basemaps';
import { formatLatLng } from '../../hooks/useReverseGeocode';
import { srOnly } from '../../theme/a11y';

/** How a field was picked: a click/tap, or Enter on the map. */
export type SelectHow = 'pointer' | 'keyboard';

/** What a screen reader hears when the map gets focus. */
const MAP_LABEL = 'Field map. Arrow keys move the map, plus and minus zoom, Enter selects the field at the centre.';


/** Key cap for the on-screen key guide. */
function Key({ children }: { children: React.ReactNode }) {
  return (
    <Box component="kbd" sx={{ fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 700, px: 0.75, py: 0.1, borderRadius: 1, bgcolor: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.35)', minWidth: 22, textAlign: 'center' }}>
      {children}
    </Box>
  );
}

interface Props {
  runs?: Run[];
  selected?: LatLng | null;
  /** Called when the user clicks empty map or presses Enter on it. Omit to make the map read-only. */
  onSelect?: (p: LatLng, how: SelectHow) => void;
  onRunClick?: (run: Run) => void;
  /** When this changes, the camera flies to it. */
  flyTo?: LatLng | null;
  initialView?: { latitude: number; longitude: number; zoom: number };
  /** Hide the layer toggle (e.g. in small preview maps). */
  compact?: boolean;
  /** Thumbnail mode: no controls, not draggable/zoomable. */
  static?: boolean;
  /** Point to keep on screen after the map's container changes size. */
  keepInView?: LatLng | null;
  /** Change this value whenever the container is resized by the parent (layout key). */
  layoutKey?: string;
  /** Change (to a new number) to move keyboard focus onto the map. */
  focusKey?: number;
  /** Several runs at one spot: show a menu to pick one (default). false = call onRunClick with the first. */
  runMenu?: boolean;
}

/**
 * Runs whose pins would overlap on screen (closer than `px` pixels at the
 * current zoom) are grouped so they share one pin; WCAG 2.5.8 needs each
 * target to be reachable. `project` turns a location into screen pixels;
 * without it (map still loading, which can take a few seconds) runs within
 * about 1 km (0.01°) of each other are grouped, so pins never overlap even then.
 */
function groupRuns(runs: Run[], project?: (r: Run) => { x: number; y: number }, px = 28): Run[][] {
  const groups: { at: { x: number; y: number } | null; first: Run; runs: Run[] }[] = [];
  const near = (a: Run, b: Run) => Math.abs(a.location.lat - b.location.lat) < 0.01 && Math.abs(a.location.lng - b.location.lng) < 0.01;
  for (const r of runs) {
    const at = project ? project(r) : null;
    const hit = groups.find((g) => (at && g.at ? Math.hypot(g.at.x - at.x, g.at.y - at.y) < px : near(g.first, r)));
    if (hit) hit.runs.push(r);
    else groups.push({ at, first: r, runs: [r] });
  }
  return groups.map((g) => g.runs);
}

/** Midwest view similar to the current site's landing page. */
const MIDWEST = { latitude: 42.6, longitude: -86.2, zoom: 5.6 };

/** A teardrop pin drawn with an MUI icon. */
function Pin({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <PlaceIcon
      // Thin white outline keeps dark pins (Spartan Green run pins) visible on satellite imagery.
      sx={{ fontSize: size, color, stroke: '#fff', strokeWidth: 1, paintOrder: 'stroke', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.45))', display: 'block' }}
    />
  );
}

export default function FieldMap({ runs = [], selected, onSelect, onRunClick, flyTo, initialView = MIDWEST, compact, static: isStatic, keepInView, layoutKey, focusKey, runMenu = true }: Props) {
  const [pinMenu, setPinMenu] = useState<{ anchor: HTMLElement; runs: Run[] } | null>(null);
  const mapRef = useRef<MapRef>(null);
  // Re-group pins whenever the view changes (zooming in separates nearby runs).
  const [viewTick, setViewTick] = useState(0);
  const groups = useMemo(() => {
    const map = mapRef.current?.getMap();
    const project = map ? (r: Run) => map.project([r.location.lng, r.location.lat]) : undefined;
    return groupRuns(runs, project);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, viewTick]);
  const [basemap, setBasemap] = useState<BasemapId>('satellite');
  /** The map has KEYBOARD focus → show the reticle and key guide. */
  const [kbFocus, setKbFocus] = useState(false);
  /** Polite screen-reader message (map-centre position, "field selected"). */
  const [announce, setAnnounce] = useState('');
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const keyboardPicking = !!onSelect && !isStatic;

  /** Wire up the keyboard behaviour once the map exists. */
  const handleLoad = () => {
    const map = mapRef.current?.getMap();
    if (!map || !keyboardPicking) return;
    const canvas = map.getCanvas();
    canvas.setAttribute('aria-label', MAP_LABEL);
    const showIfKeyboard = () => setKbFocus(canvas.matches(':focus-visible'));
    canvas.addEventListener('focus', showIfKeyboard);
    canvas.addEventListener('blur', () => setKbFocus(false));
    canvas.addEventListener('pointerdown', () => setKbFocus(false)); // back to the mouse: hide the keyboard aids
    canvas.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const c = map.getCenter();
        const p = { lat: c.lat, lng: c.lng };
        onSelectRef.current?.(p, 'keyboard');
        setAnnounce(`Field selected at ${formatLatLng(p)}.`);
      } else {
        setKbFocus(true); // focused by mouse, then used the keys
      }
    });
    // After a keyboard move, say where the map centre now is (debounced by moveend).
    map.on('moveend', () => {
      if (document.activeElement === canvas && canvas.matches(':focus-visible')) {
        const c = map.getCenter();
        setAnnounce(`Map centre at ${formatLatLng({ lat: c.lat, lng: c.lng })}, zoom ${Math.round(map.getZoom())}.`);
      }
    });
  };

  // Parent asks for focus (after an address search, or when the panel closes).
  useEffect(() => {
    if (focusKey) mapRef.current?.getMap().getCanvas().focus({ preventScroll: true });
  }, [focusKey]);

  // Animate the camera whenever the parent asks us to fly somewhere.
  useEffect(() => {
    if (flyTo) mapRef.current?.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 15, duration: 1200 }); // field level
  }, [flyTo]);

  // When the parent resizes our box (panel opens, phone rotates), wait for the
  // CSS transition, refit the canvas, and pan only if the point fell off-screen.
  useEffect(() => {
    if (!keepInView) return;
    const t = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;
      map.resize();
      const p = map.project([keepInView.lng, keepInView.lat]);
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const margin = 40;
      if (p.x < margin || p.x > w - margin || p.y < margin || p.y > h - margin) {
        map.easeTo({ center: [keepInView.lng, keepInView.lat], duration: 500 });
      }
    }, 320);
    return () => clearTimeout(t);
  }, [keepInView, layoutKey]);

  /** Map click → report the coordinates to the parent. */
  const handleClick = (e: MapLayerMouseEvent) => onSelect?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }, 'pointer');

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <Map
        ref={mapRef}
        initialViewState={initialView}
        mapStyle={basemapStyle(basemap)}
        onClick={onSelect ? handleClick : undefined}
        cursor={onSelect ? 'crosshair' : 'grab'}
        style={{ width: '100%', height: '100%' }}
        attributionControl={isStatic ? false : { compact: !!compact }}
        interactive={!isStatic}
        onLoad={() => { handleLoad(); setViewTick((t) => t + 1); }}
        onMoveEnd={() => setViewTick((t) => t + 1)}
      >
        {!isStatic && <NavigationControl position="top-left" showCompass={false} />}
        {!compact && !isStatic && <GeolocateControl position="top-left" />}
        {!isStatic && <ScaleControl position="bottom-left" unit="imperial" />}

        {groups.map((group) => {
          const [first] = group;
          const many = group.length > 1;
          const name = many ? `${group.length} runs at this field` : first.name;
          const open = (el: HTMLElement) => {
            if (!onRunClick) return;
            // One run → open it. Several at the same spot → a menu to pick one,
            // so every run stays reachable even though the pins overlap (WCAG 2.5.8).
            if (many && runMenu) setPinMenu({ anchor: el, runs: group });
            else onRunClick(first);
          };
          return (
            <Marker
              key={first.id}
              longitude={first.location.lng}
              latitude={first.location.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation(); // don't also treat it as a map click
                open(e.target.getElement());
              }}
            >
              <Tooltip title={name} arrow>
                <Box
                  // Focusable button for keyboard users (Tab reaches each pin).
                  {...(onRunClick && {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': many ? `${name}: ${group.map((r) => r.name).join(', ')}. Press Enter to choose one` : `Open run ${name}`,
                    'aria-haspopup': many && runMenu ? 'menu' : undefined,
                    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        open(e.currentTarget);
                      }
                    },
                  })}
                  sx={{
                    position: 'relative', minWidth: 30, minHeight: 32, display: 'grid', placeItems: 'center',
                    cursor: onRunClick ? 'pointer' : 'default', borderRadius: '50%',
                    // White ring + dark halo: visible on any imagery
                    '&:focus-visible': { outline: '3px solid #fff !important', boxShadow: `0 0 0 6px ${tokens.color.spartanGreen}` },
                  }}
                >
                  <Pin color={tokens.color.spartanGreen} size={30} />{/* MSU Spartan Green (theme primary) */}
                  {many && (
                    <Box aria-hidden sx={{ position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, px: 0.5, borderRadius: 9, bgcolor: '#fff', color: tokens.color.spartanGreen, border: `2px solid ${tokens.color.spartanGreen}`, fontSize: '0.6875rem', fontWeight: 800, lineHeight: 1.25, textAlign: 'center' }}>
                      {group.length}
                    </Box>
                  )}
                </Box>
              </Tooltip>
            </Marker>
          );
        })}

        {selected && (
          <Marker longitude={selected.lng} latitude={selected.lat} anchor="bottom">
            <Pin color={tokens.color.accent} size={44} />
          </Marker>
        )}
      </Map>

      {/* Picker for several runs at the same field */}
      <Menu anchorEl={pinMenu?.anchor} open={!!pinMenu} onClose={() => setPinMenu(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {pinMenu?.runs.map((r) => (
          <MenuItem key={r.id} onClick={() => { setPinMenu(null); onRunClick?.(r); }}>{r.name}</MenuItem>
        ))}
      </Menu>

      {/* Keyboard aids: focus ring, reticle at the centre, key guide (keyboard focus only) */}
      {keyboardPicking && kbFocus && (
        <>
          {/* focus ring around the whole map */}
          <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2, boxShadow: `inset 0 0 0 3px ${tokens.color.accent}` }} />
          {/* Reticle: four white corner brackets framing the map centre, where
              Enter drops the pin. Dark edge so it shows on any imagery. */}
          <Box aria-hidden sx={{ position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 2 }}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <Box
                key={c}
                sx={{
                  position: 'absolute', width: 14, height: 14, borderColor: '#fff', borderStyle: 'solid', borderWidth: 0,
                  filter: 'drop-shadow(0 0 1px rgba(0,0,0,.9)) drop-shadow(0 0 2px rgba(0,0,0,.5))',
                  ...(c[0] === 't' ? { top: 0, borderTopWidth: 4 } : { bottom: 0, borderBottomWidth: 4 }),
                  ...(c[1] === 'l' ? { left: 0, borderLeftWidth: 4 } : { right: 0, borderRightWidth: 4 }),
                }}
              />
            ))}
          </Box>
          <Box
            aria-hidden
            sx={{
              position: 'absolute', left: '50%', bottom: { xs: 76, md: 84 }, transform: 'translateX(-50%)', zIndex: 2, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 'calc(100% - 24px)',
              px: 1.75, py: 1, borderRadius: 2, bgcolor: 'rgba(15,46,39,.92)', color: '#fff', boxShadow: 3,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>Keyboard:</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}><Key>←</Key><Key>↑</Key><Key>↓</Key><Key>→</Key><Typography variant="body2">move</Typography></Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}><Key>+</Key><Key>−</Key><Typography variant="body2">zoom</Typography></Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}><Key>Enter</Key><Typography variant="body2">{selected ? 'move pin here' : 'select field here'}</Typography></Box>
          </Box>
        </>
      )}
      {keyboardPicking && <Box role="status" aria-live="polite" sx={srOnly}>{announce}</Box>}

      {!compact && !isStatic && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={basemap}
          onChange={(_, v: BasemapId | null) => v && setBasemap(v)}
          aria-label="Basemap"
          data-tour="basemap-toggle"
          sx={{
            position: 'absolute', bottom: 28, right: 12, bgcolor: '#fff', p: 0.5, borderRadius: 2, boxShadow: 2,
            // Segmented look: outer corners follow the container's rounding
            // (20 px container − 4 px padding = 16 px), inner corners stay square.
            // Equal fixed widths (room for the ✓ on the selected one) so the group doesn't change size.
            // Every button after the first overlaps the previous border by 1.5 px (single dividing line).
            '& .MuiToggleButton-root.MuiToggleButton-root': { m: 0, width: 100, justifyContent: 'center', px: 1, borderRadius: 0 },
            '& .MuiToggleButton-root + .MuiToggleButton-root': { ml: '-1.5px' },
            '& .MuiToggleButton-root:first-of-type': { borderRadius: '16px 0 0 16px' },
            '& .MuiToggleButton-root:last-of-type': { borderRadius: '0 16px 16px 0' },
          }}
        >
          <ToggleButton value="satellite">Satellite</ToggleButton>
          {/* "Streets" shows the hybrid basemap: imagery + roads and road names */}
          <ToggleButton value="hybrid">Streets</ToggleButton>
        </ToggleButtonGroup>
      )}
    </Box>
  );
}
