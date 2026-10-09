/**
 * chrome.tsx — switchable "chrome" colour scheme for the app's bars.
 *
 * Two looks for the frame around the content (cards, charts and forms stay
 * white in both):
 *   - 'white'  Spartan White: white bars, Spartan Green text and rule
 *   - 'green'  Spartan Green (DEFAULT, chosen by the user): the colour flip. Spartan Green bars with white
 *              text and a lime accent rule, used for the app bar, the stepper,
 *              the results header and date filter, and the Set Management
 *              panel header
 *
 * How it works: <ChromeProvider> stores the choice (localStorage
 * `salus-online.uiTheme.v2`; default from VITE_UI_THEME, else 'green').
 * <ChromeSurface> wraps a bar. In green mode it swaps in `onGreenTheme`, a
 * nested MUI theme where "primary" is white and backgrounds are green, so
 * buttons, toggles, sliders, selects and steppers inside recolour themselves.
 * Components inside a surface should use theme colours (primary.main,
 * background.paper, divider…), not hard-coded tokens.
 *
 * Dark mode lives here too, because it decides which base theme every surface
 * starts from: <ChromeProvider> also stores `dark` (localStorage
 * `salus-online.darkMode.v1`, off by default) and supplies the app-wide MUI
 * theme (light `theme` or `darkTheme`, theme.ts) plus CssBaseline. The green
 * bars look the same in both modes; "White bars" become dark green bars with a
 * lime rule in dark mode. useAppTheme() gives the current base theme to
 * dialogs and pop-overs that must not inherit a green bar's theme.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline } from '@mui/material';
import { ThemeProvider, alpha, createTheme, type Theme } from '@mui/material/styles';
import { theme as baseTheme, darkTheme } from './theme';
import { darkColor, tokens } from './tokens';
import { FOCUS_ON_GREEN, FOCUS_ON_WHITE } from './a11y';

export type ChromeVariant = 'white' | 'green';
// v2: the default changed to green, so earlier saved choices are ignored once.
const KEY = 'salus-online.uiTheme.v2';
const DARK_KEY = 'salus-online.darkMode.v1';
const c = tokens.color;

/** Bright accent used on green: MSU lime for the bar rule and completed steps. */
export const GREEN_ACCENT = c.limeGreen;

/** Nested theme for bars in the green variant: white-on-green (built on the light or dark base). */
function makeOnGreen(base: Theme, dark: boolean) {
  // Menus and pop-overs opened from a green bar use the page's card colours.
  const menuPaper = dark ? { bgcolor: darkColor.paper, color: darkColor.text } : { bgcolor: '#fff', color: c.text };
  return createTheme(base, {
  palette: {
    mode: 'dark',
    primary: { main: '#FFFFFF', dark: '#E6EFEA', contrastText: c.spartanGreen },
    success: { main: GREEN_ACCENT },
    background: { default: c.spartanGreen, paper: c.spartanGreen },
    text: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.78)', disabled: 'rgba(255,255,255,0.45)' },
    divider: 'rgba(255,255,255,0.18)',
    action: { hover: 'rgba(255,255,255,0.10)', selected: 'rgba(255,255,255,0.16)' },
  },
  // The base theme colours big headings Spartan Green, which would vanish on green.
  typography: { h1: { color: '#FFFFFF' }, h4: { color: '#FFFFFF' }, h5: { color: '#FFFFFF' } },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: c.spartanGreen, color: '#fff', borderBottom: `${tokens.headerRule}px solid ${GREEN_ACCENT}` },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', border: 'none' } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          // On green bars: unselected = translucent with a white outline; selected = solid white.
          '&&': { borderColor: 'rgba(255,255,255,0.45)' },
          backgroundColor: 'rgba(255,255,255,0.08)',
          color: '#fff',
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' },
          '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: '#fff', color: c.spartanGreen },
          '&&.Mui-selected': { borderColor: '#fff' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.08)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.45)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
        },
      },
    },
    // Menus/popovers opened from a green bar stay readable (page card colours).
    MuiPopover: { defaultProps: { slotProps: { paper: { sx: menuPaper } } } },
    MuiMenu: { defaultProps: { slotProps: { paper: { sx: menuPaper } } } },
  },
  });
}
export const onGreenTheme = makeOnGreen(baseTheme, false);
const onGreenDarkTheme = makeOnGreen(darkTheme, true);

interface ChromeApi {
  variant: ChromeVariant;
  setVariant: (v: ChromeVariant) => void;
  toggle: () => void;
  /** Dark mode on/off (Settings → Dark mode). */
  dark: boolean;
  setDark: (on: boolean) => void;
}

const ChromeContext = createContext<ChromeApi | null>(null);

function initialVariant(): ChromeVariant {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'white' || saved === 'green') return saved;
  } catch {
    /* storage blocked */
  }
  return import.meta.env.VITE_UI_THEME === 'white' ? 'white' : 'green';
}

function initialDark(): boolean {
  try {
    return localStorage.getItem(DARK_KEY) === 'on';
  } catch {
    return false;
  }
}

/** Stores the bar scheme and dark mode, and supplies the app-wide MUI theme + CssBaseline. */
export function ChromeProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<ChromeVariant>(initialVariant);
  const [dark, setDark] = useState<boolean>(initialDark);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, variant);
    } catch {
      /* ignore */
    }
  }, [variant]);
  useEffect(() => {
    try {
      localStorage.setItem(DARK_KEY, dark ? 'on' : 'off');
    } catch {
      /* ignore */
    }
    // For plain CSS files (the tour pop-over) that need to know the mode.
    document.documentElement.dataset.colorMode = dark ? 'dark' : 'light';
  }, [dark]);
  const toggle = useCallback(() => setVariant((v) => (v === 'white' ? 'green' : 'white')), []);
  const api = useMemo(() => ({ variant, setVariant, toggle, dark, setDark }), [variant, toggle, dark]);
  return (
    <ChromeContext.Provider value={api}>
      <ThemeProvider theme={dark ? darkTheme : baseTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ChromeContext.Provider>
  );
}

/** The app's base theme right now (light or dark), for dialogs and pop-overs. */
export function useAppTheme(): Theme {
  return useChrome().dark ? darkTheme : baseTheme;
}

/** Hook: current chrome variant + setters. */
export function useChrome(): ChromeApi {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error('useChrome must be used inside <ChromeProvider>');
  return ctx;
}

/** Wrap a bar/header so it follows the chrome variant (white-on-green in 'green'). */
export function ChromeSurface({ children }: { children: ReactNode }) {
  const { variant, dark } = useChrome();
  const green = variant === 'green';
  const theme = green ? (dark ? onGreenDarkTheme : onGreenTheme) : dark ? darkTheme : baseTheme;
  const focus = green || dark ? FOCUS_ON_GREEN : FOCUS_ON_WHITE; // lime on green bars and on dark
  // The same elements in both schemes (only the theme and a CSS variable
  // change), so switching scheme never re-mounts the bar, e.g. the Settings
  // pop-out stays open while you try both. `display: contents` adds no box to
  // the layout; it carries the focus-ring colour (see a11y.ts): lime on green.
  return (
    <ThemeProvider theme={theme}>
      <div style={{ display: 'contents', ['--salus-focus' as string]: focus }}>{children}</div>
    </ThemeProvider>
  );
}

/** Soft tint of the current primary colour (selected nav item, chips, soft buttons). */
export const softPrimary = (amount = 0.12) => (t: { palette: { primary: { main: string } } }) => alpha(t.palette.primary.main, amount);
