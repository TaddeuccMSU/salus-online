/**
 * theme.ts — builds the Material UI theme from the Spartan White tokens.
 *
 * MUI components (buttons, inputs, DataGrid, dialogs…) read their colours,
 * typography and shapes from this object, so the whole app picks up the MSU
 * look without per-component styling.
 */
import { createTheme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { darkColor, tokens } from './tokens';

export type ColorMode = 'light' | 'dark';

/** Builds the app theme for light or dark mode (see the file comment). */
export function makeTheme(mode: ColorMode) {
  const dark = mode === 'dark';
  const c = dark ? darkColor : tokens.color;
  const heading = dark ? c.text : c.spartanGreen; // big headings: Spartan on white, near-white on dark
  const onPrimary = dark ? c.spartanGreenDark : '#fff'; // text on a primary-coloured button
  return createTheme({
  palette: {
    mode,
    // Dark mode: primary is MSU Lime (Spartan Green would disappear on the dark green).
    primary: dark ? { main: c.accent, dark: c.accentHover, contrastText: onPrimary } : { main: c.spartanGreen, dark: c.spartanGreenDark, contrastText: '#fff' },
    secondary: { main: c.accent, dark: c.accentHover, contrastText: tokens.color.spartanGreen }, // MSU Lime CTAs (Run SALUS)
    success: { main: c.kellyGreen },
    ...(dark && { error: { main: '#FF8A80' } }), // readable red on the dark cards (6:1)
    background: { default: c.canvas, paper: c.paper },
    text: { primary: c.text, secondary: c.textMuted },
    divider: c.border,
  },
  shape: { borderRadius: tokens.radius },
  typography: {
    fontFamily: tokens.fontFamily,
    h1: { fontWeight: 800, color: heading },
    h4: { fontWeight: 800, color: heading, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700, color: heading },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
    // "overline" is used for the small all-caps card titles (SOIL NITRATE PROFILE…)
    overline: { fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6, fontSize: '0.72rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: c.canvas },
        ...(dark && {
          // Dark mode: browser scrollbars/form bits go dark too, and the map's
          // own (MapLibre) zoom buttons and credit box follow the dark cards.
          ':root': { colorScheme: 'dark' },
          '.maplibregl-ctrl-group': { backgroundColor: `${c.paper} !important`, boxShadow: `0 0 0 1px ${c.maxNeutral} !important` },
          '.maplibregl-ctrl-group button + button': { borderTopColor: `${c.border} !important` },
          '.maplibregl-ctrl-icon': { filter: 'invert(1)' },
          '.maplibregl-ctrl-attrib': { backgroundColor: 'rgba(0,0,0,.6) !important', color: c.text },
          '.maplibregl-ctrl-attrib a': { color: `${c.text} !important` },
          '.maplibregl-ctrl-attrib-inner, .maplibregl-ctrl-attrib-inner *': { color: `${c.text} !important` },
          '.maplibregl-ctrl-attrib-button': { filter: 'invert(1)', backgroundColor: 'transparent !important' },
          '.maplibregl-ctrl-scale': { backgroundColor: 'rgba(0,0,0,.6) !important', color: c.text, borderColor: `${c.text} !important` },
        }),
        // Room for the sticky app bar, so the browser never scrolls a focused
        // element underneath it (WCAG 2.4.11). The results page raises this
        // to cover its sticky date bar too.
        html: { scrollPaddingTop: 'calc(var(--salus-header-h, 72px) + 16px)', '--salus-focus': dark ? c.accent : c.spartanGreen },
        // ONE clear keyboard focus ring for the whole app (WCAG 2.4.7): 3 px
        // Spartan Green on white (10.8:1); ChromeSurface switches the variable
        // to MSU lime on the green bars (4.7:1). Mouse clicks don't show it.
        '*:focus-visible, .Mui-focusVisible': {
          outline: '3px solid var(--salus-focus) !important',
          outlineOffset: '2px !important',
        },
        // Text fields draw their own 2 px focused border; the map draws its own ring;
        // elements focused only by script (tabIndex -1: page headings, dialogs) need none.
        '.MuiInputBase-input:focus-visible, .MuiInputBase-root textarea:focus-visible, .maplibregl-canvas:focus-visible, [tabindex="-1"]:focus-visible, .MuiSlider-root input:focus-visible':
          { outline: 'none !important' },
        // Chart axis text in rem, so it grows with the Text size setting (x-charts uses px).
        '.MuiChartsAxis-tickLabel': { fontSize: '0.75rem !important' },
        '.MuiChartsAxis-label': { fontSize: '0.875rem !important' },
        // Grid cells: keep the ring inside the cell so it isn't clipped.
        '.MuiDataGrid-cell:focus-visible, .MuiDataGrid-columnHeader:focus-visible, .MuiDataGrid-cell .Mui-focusVisible': { outlineOffset: '-3px !important' },
        // Menu and list items sit edge to edge: draw the ring inside them.
        '.MuiMenuItem-root.Mui-focusVisible, .MuiMenuItem-root:focus-visible, .MuiListItemButton-root.Mui-focusVisible': { outlineOffset: '-3px !important' },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${c.border}`, backgroundImage: 'none' } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          backgroundColor: c.paper,
          border: 'none',
          borderBottom: `${tokens.headerRule}px solid ${c.spartanGreen}`, // lime in dark mode
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 8 } },
    },
    // Pill toggles (Yes/No, Tillage, Grain/Silage, Month/Year/All, Satellite/Streets…).
    // Selected must be unmistakable: SOLID Spartan Green + white bold text + a ✓,
    // while unselected options are white with a grey-green outline. `&&` beats the
    // ToggleButtonGroup's own "grouped" border rules.
    MuiToggleButton: {
      styleOverrides: {
        root: {
          '&&': {
            border: `1.5px solid ${c.maxNeutral}`,
            borderRadius: 8,
            margin: '0 2px',
          },
          padding: '6px 14px',
          backgroundColor: c.paper,
          color: c.text,
          fontWeight: 600,
          '&:hover': { backgroundColor: c.canvas, borderColor: c.spartanGreen },
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: c.spartanGreen, // lime in dark mode
            color: onPrimary,
            fontWeight: 700,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          },
          '&&.Mui-selected': { borderColor: c.spartanGreen },
          '&.Mui-selected::before': { content: '"✓"', marginRight: 6, fontWeight: 800 },
        },
      },
    },
    // White fields with a #767676 outline (4.5:1 on white, WCAG 1.4.11; MUI's default is about 1.7:1).
    // Dark mode: deep green fields with a #7A958B outline (4.4:1 on the cards).
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: dark ? c.canvas : '#fff',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: dark ? c.maxNeutral : '#767676' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: c.text },
        },
      },
    },
    // Tooltips: deep Spartan Green with white, slightly larger semi-bold text
    // (≈ 15:1 contrast, vs MUI's small translucent grey) and a thin lime edge
    // so they still stand out on the green header and the satellite map.
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: c.spartanGreenDark,
          color: '#fff',
          fontSize: '0.8125rem',
          fontWeight: 600,
          lineHeight: 1.4,
          padding: '6px 10px',
          borderRadius: 8,
          border: `1px solid ${c.accent}8C`, // lime at 55 %
          boxShadow: '0 4px 14px rgba(0,0,0,.28)',
        },
        arrow: {
          color: c.spartanGreenDark,
          '&::before': { border: `1px solid ${c.accent}8C` },
        },
      },
    },
    // Dialogs: plain white top (no green accent bar), at the user's request.
    MuiDialog: {
      styleOverrides: { paper: { position: 'relative' } },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: { border: 'none', backgroundColor: c.paper },
        columnHeaders: { backgroundColor: c.raised },
        columnHeaderTitle: { fontWeight: 700 },
      },
    },
  },
});
}

/** The normal (light) theme. */
export const theme = makeTheme('light');
/** Dark mode theme. */
export const darkTheme = makeTheme('dark');
