# SALUS Online (Spartan White redesign)

React + TypeScript rebuild of SALUS Online with the NShow visualisation folded in as
**Selected Field Results**. Styled to MSU brand (Spartan Green `#18453B`, Metropolis
typeface) following the "Spartan White" concept: white app bar with a 3 px green rule,
off-white canvas, white cards, amber accent for "current" values, date filter at the top.

## Data: everything here is MOCK

The results in `public/data/` (and everything shown in the app, the PDF reports
and `design/report-mockup/`) are **invented numbers** in the SALUS results shape,
made by `scripts/make_sample_data.py` (fixed seeds, so they're reproducible:
`python3 scripts/make_sample_data.py public/data`). No real SALUS output is in
this repo. Place names and coordinates (East Lansing, MSU Agronomy Farm) are real.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

Optional: copy `.env.example` to `.env` and add a free MapTiler key to use MapTiler
styles. Without it the map uses keyless Esri imagery (satellite) and OpenFreeMap (streets).

## User flow / routes

New runs take 3 steps: **Select field** on the map (`/`) → the **Set Management** panel slides in over the map (run name, test dataset, management answers pre-filled from the dataset, years) → **Run SALUS** opens **Results** (`/runs/:runId/results`) with the charts and the date filter/slider. `/runs` is **My Runs** (DataGrid). See `HANDOFF.md` for details.

## Libraries (all free / open source)

- **UI:** `@mui/material`, `@mui/icons-material`, `@mui/x-data-grid` (MIT tier), `@mui/x-charts` (MIT tier)
- **Map:** `maplibre-gl` + `react-map-gl/maplibre`
- **Routing:** `react-router-dom` v7
- **Font:** `@fontsource/metropolis` (MSU brand sans, OFL)
- **PDF reports:** `@react-pdf/renderer` (MIT), lazy-loaded; see `src/report/`
- **Product tour:** `driver.js` (MIT); content in `src/tour/HowToTourConfig.ts`

## Code map

```
src/
  main.tsx                 entry: font, theme, store, <App/>
  App.tsx                  route table
  theme/tokens.ts          ALL brand colours/fonts — edit here
  theme/theme.ts           MUI theme built from tokens
  types/index.ts           shared data shapes (Run, ManagementInputs, RunResults…)
  data/options.ts          form choice lists + defaults
  data/demoRuns.ts         seed runs (mock sample results, East Lansing)
  state/RunsContext.tsx    runs store (localStorage); createRun() is the API stub
  hooks/                   useRunResults, useDateWindow, useReverseGeocode, useElementWidth
  components/layout/       AppHeader, AppShell, SectionCard, Legend, PageContainer
  components/map/          FieldMap (MapLibre), basemaps, WelcomeDialog
  components/form/         SetManagementForm, FormSection, YesNo
  components/results/      DateFilterBar
  components/charts/       NitrateProfileChart, StackedGaugeChart, EventsTimeline
  components/runs/         StatusChip, SetManagementPanel (step 2 panel over the map)
  data/datasets.ts         test-data catalogue (defaults, years, files)
  report/                  PDF run report (data, charts, document, download)
  tour/                    product tour: HowToTourConfig.ts (content), TourProvider.tsx (engine), tour.css
  pages/                   one file per route
public/data/               MOCK results JSON (invented numbers; scripts/make_sample_data.py)
scripts/                  make_sample_data.py: regenerates the mock results
```

Every file starts with a comment explaining what it does.

## Hooking up the real backend

1. Replace `createRun` in `state/RunsContext.tsx` with a POST to the SALUS service and poll for status.
2. Have the service return results in the `RunResults` shape (`types/index.ts`) and point
   `useRunResults` at that URL instead of `/data/<file>`.
