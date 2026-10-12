/**
 * SetManagementPanel.tsx — step 2 of 3: the Set Management panel that slides
 * in over the map once a field is selected.
 *
 * One scrolling column of cards, then a fixed footer:
 *   ⓘ About this demo  unnumbered demo-mode notice (dataset picker removed for now)
 *   1 Run details      name (required) + notes
 *   2 Field & soil  ┐
 *   3 Crop & planting ├ SetManagementForm (pre-filled from the dataset)
 *   4 Water & nitrogen┘
 *   5 Simulation period  year slider, 1980–2021 (FIRST/LAST_WEATHER_YEAR)
 *   [Cancel]                                     [▶ Run SALUS]
 *
 * Demo-mode rule: the Irrigation answer picks the sample dataset (rainfed or
 * irrigated); there is no dataset picker for now (the same choice
 * in the current test data). "Run SALUS" calls `onSubmit(setup, inputs)`.
 * `dense` tightens the header, padding and footer for short landscape
 * screens (the 50/50 split layout on phones).
 * A ⚙ in the header switches the answers between Metric and US units (the
 * same global setting as the results charts).
 */
import DemoNoticeText from '../form/DemoNotice';
import { useColors } from '../../theme/colors';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Box, Button, Divider, IconButton, MenuItem, Select, Slider, TextField, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FormSection from '../form/FormSection';
import SetManagementForm, { summarize, validate } from '../form/SetManagementForm';
import { DEFAULT_END_YEAR, DEFAULT_START_YEAR, FIRST_WEATHER_YEAR, LAST_WEATHER_YEAR } from '../../data/options';
import { TEST_DATASETS, datasetForInputs, getDataset } from '../../data/datasets';
import { formatLatLng } from '../../hooks/useReverseGeocode';
import type { LatLng, ManagementInputs, RunSetup } from '../../types';
import { tokens } from '../../theme/tokens';
import { ChromeSurface } from '../../theme/chrome';
import { useUnits } from '../../state/UnitsContext';
import SettingsButton from '../settings/SettingsButton';
import UnitsSetting from '../settings/UnitsSetting';
import TextSizeSetting from '../settings/TextSizeSetting';

interface Props {
  location: LatLng;
  placeName: string;
  onClose: () => void;
  onSubmit: (setup: RunSetup, inputs: ManagementInputs) => void;
  dense?: boolean;
  /** Change (to a new number) to move keyboard focus to the panel's heading (field picked by keyboard). */
  focusKey?: number;
}

/** Simulation lengths offered in the "How many years" select (plus "All"). */
const YEAR_CHOICES = [5, 10, 15, 20, 25, 30, 35];

/** Fresh answers for a new run, seeded from the first test dataset. */
function initialSetup(placeName: string): RunSetup {
  const d = TEST_DATASETS[0];
  return {
    name: `${placeName || 'My field'} — ${dayjs().format('MMM D, YYYY')}`,
    description: '',
    datasetId: d.id,
    startYear: DEFAULT_START_YEAR,
    endYear: DEFAULT_END_YEAR,
  };
}

export default function SetManagementPanel({ location, placeName, onClose, onSubmit, dense = false, focusKey }: Props) {
  const c = useColors(); // light or dark mode colours
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Field picked with the keyboard → focus the heading so the form is next in Tab order
  // (wait for the panel's slide-in).
  useEffect(() => {
    if (!focusKey) return;
    const t = setTimeout(() => headingRef.current?.focus({ preventScroll: true }), 300);
    return () => clearTimeout(t);
  }, [focusKey]);
  const [setup, setSetup] = useState<RunSetup>(() => initialSetup(placeName));
  const [inputs, setInputs] = useState<ManagementInputs>(() => getDataset(setup.datasetId).defaults);
  const [nameEdited, setNameEdited] = useState(false);
  const [touched, setTouched] = useState(false);

  // The place name arrives a moment after the click (reverse geocoding);
  // update the default run name unless the user already typed their own.
  useEffect(() => {
    if (!nameEdited) setSetup((s) => ({ ...s, name: initialSetup(placeName).name }));
  }, [placeName, nameEdited]);

  const { units } = useUnits(); // Metric / US for the answers (⚙ in the header)
  const errors = validate(inputs, units);
  const nameError = !setup.name.trim() ? 'Give the run a name' : undefined;
  const invalid = Object.keys(errors).length > 0 || !!nameError;
  const years = setup.endYear - setup.startYear + 1;

  /**
   * Simulation length picker ("How many years…?"): 5–35 years in 5-year steps,
   * or all of 1980–2021. Picking a length keeps the last year where it is and
   * moves the first year (sliding the window right if it would pass 1980).
   * The slider can't change the length: dragging a handle moves the whole range.
   */
  const ALL_YEARS = LAST_WEATHER_YEAR - FIRST_WEATHER_YEAR + 1;
  const durationValue = years === ALL_YEARS ? 'all' : String(years);
  const chooseDuration = (choice: string) => {
    const n = choice === 'all' ? ALL_YEARS : Number(choice);
    let end = setup.endYear;
    let start = end - n + 1;
    if (start < FIRST_WEATHER_YEAR) {
      start = FIRST_WEATHER_YEAR;
      end = start + n - 1;
    }
    setSetup({ ...setup, startYear: start, endYear: end });
  };

  /** Form edits: keep the dataset matched to answers that drive results (irrigation). */
  const changeInputs = (next: ManagementInputs) => {
    setInputs(next);
    const match = datasetForInputs(next);
    if (match.id !== setup.datasetId) setSetup((s) => ({ ...s, datasetId: match.id }));
  };

  const submit = () => {
    setTouched(true);
    if (!invalid) onSubmit({ ...setup, name: setup.name.trim() }, inputs);
  };

  return (
    <Box data-tour="set-management-panel" sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: c.canvas }}>
      {/* Header — follows the chrome scheme (white-on-green in the green variant) */}
      <ChromeSurface>
      <Box sx={{ px: dense ? 1.5 : 2.5, pt: dense ? 1 : 2, pb: dense ? 0.75 : 1.5, bgcolor: 'background.paper', color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Step 2 of 3 · Set Management</Typography>
            <Typography ref={headingRef} tabIndex={-1} variant={dense ? 'h6' : 'h5'} component="h2" noWrap sx={{ '&:focus': { outline: 'none' } }}>{placeName || 'Selected field'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {placeName && placeName !== formatLatLng(location) ? `${formatLatLng(location)} · ` : ''}Click the map to move the pin
            </Typography>
          </Box>
          {/* ⚙ Form settings: the same global units switch as the results charts */}
          <SettingsButton title="Form settings" subject="Set Management" tooltip="Form settings (units, text size)" tourId="form-settings">
            <UnitsSetting />
            <TextSizeSetting />
          </SettingsButton>
          <Tooltip title="Close">
            <IconButton onClick={onClose} aria-label="Close Set Management" sx={{ color: 'text.primary' }}><CloseIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>
      </ChromeSurface>

      {/* Scrolling cards */}
      {/* Scroll padding keeps keyboard focus clear of the panel's edges and footer */}
      <Box data-form-scroller sx={{ flex: 1, overflowY: 'auto', scrollPaddingBlock: '24px', p: dense ? 1.25 : 2, display: 'flex', flexDirection: 'column', gap: dense ? 1.25 : 2 }}>
        {/* Demo notice: not a numbered step. Explains the mock data. (The Rainfed / Irrigated picker was removed for now; the Irrigation answer still picks the sample, see changeInputs.) */}
        <FormSection id="dataset" title="About this demo">
          <Typography variant="body2" color="text.secondary">
            <DemoNoticeText />
          </Typography>
        </FormSection>

        <FormSection id="details" step={1} title="Run details">
          <TextField
            label="Run name" required fullWidth size="small" value={setup.name}
            onChange={(e) => { setNameEdited(true); setSetup({ ...setup, name: e.target.value }); }}
            error={touched && !!nameError} helperText={touched ? nameError : undefined}
          />
          <TextField
            label="Notes (optional)" fullWidth multiline minRows={2} size="small"
            placeholder="e.g. Comparing 150 lb N with and without irrigation"
            value={setup.description}
            onChange={(e) => setSetup({ ...setup, description: e.target.value })}
          />
        </FormSection>

        <SetManagementForm value={inputs} onChange={changeInputs} errors={touched ? errors : {}} firstStep={2} />

        <FormSection id="period" step={5} title="Simulation period" description={`Choose any years from ${FIRST_WEATHER_YEAR} to ${LAST_WEATHER_YEAR}.`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography id="sim-years-label" sx={{ fontWeight: 600, flex: 1, minWidth: 200 }}>How many years would you like to run SALUS?</Typography>
            <Select size="small" labelId="sim-years-label" value={durationValue} onChange={(e) => chooseDuration(e.target.value)} sx={{ minWidth: 112 }}>
              {YEAR_CHOICES.map((n) => <MenuItem key={n} value={String(n)}>{n}</MenuItem>)}
              <MenuItem value="all">All</MenuItem>
            </Select>
          </Box>
          <Box sx={{ px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{durationValue === 'all' ? 'All years are selected.' : `Drag either handle to move the ${years}-year range.`}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{setup.startYear} – {setup.endYear}</Typography>
              <Typography color="text.secondary">{years} year{years > 1 ? 's' : ''}</Typography>
            </Box>
            <Slider
              value={[setup.startYear, setup.endYear]}
              min={FIRST_WEATHER_YEAR}
              max={LAST_WEATHER_YEAR}
              step={1}
              // Labels every 10 years plus the last year (2020 is skipped so it doesn't collide with 2021).
              marks={[1980, 1990, 2000, 2010, LAST_WEATHER_YEAR].map((y) => ({ value: y, label: String(y) }))}
              onChange={(_, v, activeThumb) => {
                // The length comes from the "How many years" select; dragging either handle moves
                // the whole range (the other handle is pushed along), stopping at 1980 and 2021.
                const [a, b] = v as number[];
                const gap = years - 1;
                const start = activeThumb === 0
                  ? Math.max(FIRST_WEATHER_YEAR, Math.min(a, LAST_WEATHER_YEAR - gap))
                  : Math.max(FIRST_WEATHER_YEAR, Math.min(b, LAST_WEATHER_YEAR) - gap);
                setSetup({ ...setup, startYear: start, endYear: start + gap });
              }}
              getAriaLabel={(i) => (i === 0 ? 'First year' : 'Last year')}
              // The year shows in a bubble on the focused thumb; arrow keys move it one year.
              valueLabelDisplay="auto"
              sx={{ '& .MuiSlider-valueLabel': { bgcolor: tokens.color.spartanGreenDark, fontWeight: 700 } }}
            />
          </Box>
        </FormSection>

        <Box sx={{ p: 2, borderRadius: 2, bgcolor: c.surfaceGreen }}>
          <Typography variant="overline" sx={{ color: 'primary.main' }}>Your scenario</Typography>
          <Typography variant="body2">{summarize(inputs, units)} · {setup.startYear}–{setup.endYear}</Typography>
        </Box>
      </Box>

      {/* Fixed footer */}
      <Divider />
      <Box sx={{ px: dense ? 1.5 : 2.5, py: dense ? 0.75 : 1.5, display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: c.paper }}>
        {touched && invalid && <Typography variant="body2" color="error" sx={{ flex: 1 }}>Fix the highlighted answers.</Typography>}
        <Box sx={{ flex: touched && invalid ? 0 : 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button data-tour="run-salus" variant="contained" color="secondary" size={dense ? 'medium' : 'large'} startIcon={<PlayArrowIcon />} onClick={submit}>
          Run SALUS
        </Button>
      </Box>
    </Box>
  );
}
