/**
 * SetManagementForm.tsx — the redesigned "Set Management" questionnaire.
 *
 * Same questions as the live SALUS Online pop-up, grouped into three numbered
 * cards (Field & soil → Crop & planting → Water & nitrogen). It is embedded in
 * the Set Management panel on the map page, which adds the run name, dataset
 * and simulation-period cards around it. All inputs are MUI.
 * `firstStep` sets the number on the first card (so numbering continues the
 * panel's own cards). `drivers` lists answers that change results with the
 * current test data; those questions get a "Changes results" badge. The component is "controlled": the
 * parent owns `value` and receives every change through `onChange`, which
 * keeps the form easy to test and to pre-fill when editing a run.
 * Quantities follow the global units setting (metric by default): values are
 * stored in US units and converted for display and typing.
 */
import { Box, Collapse, InputAdornment, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import type { ManagementInputs } from '../../types';
import { CROPS, MATURITY, MONTHS, PLANTING_MONTHS, daysInMonth, SOIL_DEPTHS, SOIL_TEXTURES, TILLAGE, soilDepthLabel } from '../../data/options';
import { useUnits } from '../../state/UnitsContext';
import { fmtNum, inputFromDisplay, inputToDisplay, inputUnit, type UnitSystem } from '../../theme/units';
import FormSection from './FormSection';
import YesNo from './YesNo';

export const SECTIONS = [
  { id: 'field', title: 'Field & soil' },
  { id: 'crop', title: 'Crop & planting' },
  { id: 'nitrogen', title: 'Water & nitrogen' },
] as const;

/** Builds a one-line, human-readable recap of the answers (used in summaries), in the user's units. */
export function summarize(v: ManagementInputs, units: UnitSystem = 'us'): string {
  const label = <T extends { value: unknown; label: string }>(list: readonly T[], val: unknown) => list.find((o) => o.value === val)?.label ?? '';
  return [
    `${v.soilTexture}, ${soilDepthLabel(v.soilDepth, units).toLowerCase()}`,
    label(TILLAGE, v.tillage),
    `${label(MATURITY, v.maturityDays)} for ${v.cornUse} at ${fmtNum(Math.round(inputToDisplay('population', v.plantPopulation, units)), 0)} ${inputUnit('population', units).replace('acre', 'ac')}, planted ${label(MONTHS, v.plantingMonth)} ${v.plantingDay}`,
    v.inorganicFertilizer ? `${fmtNum(inputToDisplay('rate', v.fertilizerRate, units), 0)} ${inputUnit('rate', units).replace('acre', 'ac')} ${v.fertilizerBasis === 'nitrogen' ? 'N' : 'product'}` : 'no inorganic N',
    v.irrigate ? 'irrigated' : 'rainfed',
    v.coverCrop ? 'cover crop' : null,
    v.manure ? 'manure applied' : null,
  ].filter(Boolean).join(' · ');
}

/**
 * Returns a map of field → error message (limits shown in the user's units).
 * Limits are checked on the stored US values: 10,000–60,000 seeds/acre and
 * 1–400 lbs/acre. Empty object means valid.
 */
export function validate(v: ManagementInputs, units: UnitSystem = 'us'): Partial<Record<keyof ManagementInputs, string>> {
  const e: Partial<Record<keyof ManagementInputs, string>> = {};
  const pop = (n: number) => fmtNum(Math.round(inputToDisplay('population', n, units) / 100) * 100, 0);
  const rate = (n: number) => fmtNum(inputToDisplay('rate', n, units), 0);
  if (v.plantPopulation < 10000 || v.plantPopulation > 60000) e.plantPopulation = `Between ${pop(10000)} and ${pop(60000)} ${inputUnit('population', units)}`;
  if (v.inorganicFertilizer && (v.fertilizerRate <= 0 || v.fertilizerRate > 400)) e.fertilizerRate = `Between ${rate(1)} and ${rate(400)} ${inputUnit('rate', units)}`;
  const monthDays = daysInMonth(v.plantingMonth);
  if (v.plantingDay < 1 || v.plantingDay > monthDays) e.plantingDay = `1–${monthDays}`;
  return e;
}

interface Props {
  value: ManagementInputs;
  onChange: (next: ManagementInputs) => void;
  errors?: Partial<Record<keyof ManagementInputs, string>>;
  drivers?: (keyof ManagementInputs)[];
  firstStep?: number;
}

export default function SetManagementForm({ value: v, onChange, errors = {}, drivers = [], firstStep = 1 }: Props) {
  /** Helper: update one field, keeping the rest. */
  const set = <K extends keyof ManagementInputs>(key: K, val: ManagementInputs[K]) => onChange({ ...v, [key]: val });
  // Units: answers are STORED in US units (seeds/acre, lbs/acre) and shown /
  // typed in the user's units (global Metric / US switch, see theme/units.ts).
  const { units } = useUnits();
  const shownPopulation = Math.round(inputToDisplay('population', v.plantPopulation, units));
  const shownRate = Math.round(inputToDisplay('rate', v.fertilizerRate, units) * 10) / 10;
  const drives = (k: keyof ManagementInputs) => drivers.includes(k);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <FormSection id="field" step={firstStep} title="Field & soil" description="Describe the soil at this location.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Soil texture" value={v.soilTexture} onChange={(e) => set('soilTexture', e.target.value)}>
              {SOIL_TEXTURES.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Soil depth" value={v.soilDepth} onChange={(e) => set('soilDepth', e.target.value as ManagementInputs['soilDepth'])}>
              {SOIL_DEPTHS.map((o) => <MenuItem key={o.value} value={o.value}>{units === 'metric' ? o.metricLabel : o.label}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Tillage</Typography>
          <ToggleButtonGroup exclusive value={v.tillage} onChange={(_, t) => t && set('tillage', t)} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {TILLAGE.map((o) => <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>
      </FormSection>

      <FormSection id="crop" step={firstStep + 1} title="Crop & planting" description="Corn hybrid, stand and planting date.">
        <Box>
          {/* Crop: corn is the only option for now (hard-coded; not stored with the run). */}
          <Typography id="crop-label" sx={{ fontWeight: 600, mb: 1 }}>Crop</Typography>
          <ToggleButtonGroup exclusive value="corn" aria-labelledby="crop-label">
            {CROPS.map((o) => <ToggleButton key={o.value} value={o.value} sx={{ minWidth: 96 }}>{o.label}</ToggleButton>)}
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Corn grown for</Typography>
          <ToggleButtonGroup exclusive value={v.cornUse} onChange={(_, t) => t && set('cornUse', t)}>
            <ToggleButton value="grain" sx={{ minWidth: 96 }}>Grain</ToggleButton>
            <ToggleButton value="silage" sx={{ minWidth: 96 }}>Silage</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth type="number" label="Plant population" value={shownPopulation}
              onChange={(e) => set('plantPopulation', inputFromDisplay('population', Number(e.target.value), units))}
              error={!!errors.plantPopulation} helperText={errors.plantPopulation}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">{inputUnit('population', units)}</InputAdornment> }, htmlInput: { step: units === 'metric' ? 1000 : 500, min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth label="Hybrid maturity" value={v.maturityDays} onChange={(e) => set('maturityDays', Number(e.target.value))}>
              {MATURITY.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 8, sm: 6 }}>
            {/* Changing the month keeps the day if it exists in the new month, else uses that month's last day. */}
            <TextField
              select fullWidth label="Planting month" value={v.plantingMonth}
              onChange={(e) => {
                const month = Number(e.target.value);
                onChange({ ...v, plantingMonth: month, plantingDay: Math.min(v.plantingDay, daysInMonth(month)) });
              }}
            >
              {MONTHS.filter((o) => (PLANTING_MONTHS as readonly number[]).includes(o.value)).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4, sm: 6 }}>
            {/* Day: a list of the selected month's days (30 for April, 31 for May). */}
            <TextField
              select fullWidth label="Day" value={v.plantingDay}
              onChange={(e) => set('plantingDay', Number(e.target.value))}
              error={!!errors.plantingDay} helperText={errors.plantingDay}
            >
              {Array.from({ length: daysInMonth(v.plantingMonth) }, (_, i) => i + 1).map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
        <YesNo label="Do you grow a cover crop over the winter?" value={v.coverCrop} onChange={(b) => set('coverCrop', b)} />
      </FormSection>

      <FormSection id="nitrogen" step={firstStep + 2} title="Water & nitrogen" description="Inputs that drive nitrate leaching and N-use efficiency.">
        <YesNo label="Irrigation" helper="SALUS irrigates automatically when soil water runs low." value={v.irrigate} onChange={(b) => set('irrigate', b)} badge={drives('irrigate')} />
        <YesNo label="Inorganic fertilizer" info="split fertilizer application (at planting plus a side dressing)" value={v.inorganicFertilizer} onChange={(b) => set('inorganicFertilizer', b)} />
        <Collapse in={v.inorganicFertilizer} unmountOnExit>
          <Grid container spacing={2} sx={{ pl: { sm: 2 }, borderLeft: { sm: '2px solid' }, borderColor: { sm: 'divider' } }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Enter rate as</Typography>
              <ToggleButtonGroup exclusive size="small" value={v.fertilizerBasis} onChange={(_, t) => t && set('fertilizerBasis', t)}>
                <ToggleButton value="nitrogen">Actual N</ToggleButton>
                <ToggleButton value="product">Product</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth type="number" label={v.fertilizerBasis === 'nitrogen' ? 'Nitrogen rate' : 'Product rate'}
                value={shownRate} onChange={(e) => set('fertilizerRate', inputFromDisplay('rate', Number(e.target.value), units))}
                error={!!errors.fertilizerRate} helperText={errors.fertilizerRate}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">{inputUnit('rate', units)}</InputAdornment> } }}
              />
            </Grid>
          </Grid>
        </Collapse>
        <YesNo label="Manure or compost" value={v.manure} onChange={(b) => set('manure', b)} />
      </FormSection>

    </Box>
  );
}
