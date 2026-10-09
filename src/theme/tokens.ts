/**
 * tokens.ts — the "Spartan White" design tokens.
 *
 * Every colour, radius and font used in the app lives here so the brand can be
 * tuned in one place. Colours come from the MSU Brand Studio palette
 * (brand.msu.edu/visual/color-palette). The action/"current value" accent is
 * MSU Lime Green (it replaced the earlier gold/amber at the user's request);
 * the off-white canvas comes from the Spartan White concept.
 */
export const tokens = {
  color: {
    spartanGreen: '#18453B', // MSU core colour — headings, primary buttons, the header rule
    spartanGreenDark: '#0F2E27',
    kellyGreen: '#008208', // MSU accent — positive / "maximum" series, slider track
    excellenceGreen: '#0B9A6D', // MSU accent — secondary highlights
    limeGreen: '#7BBD00', // MSU accent — base of the accent colours below
    surfaceGreen: '#E8F0EC', // pale green tint for selected states / chips
    // Accent = MSU Lime. Lime is light, so text ON lime uses Spartan Green, and lime
    // used AS text/thin lines on white uses the darker `accentDark` for legibility.
    accent: '#7BBD00', // Run SALUS / Play buttons, selected pin, "current day" fills
    accentHover: '#6CA600',
    accentDark: '#4E7A00', // lime as text / thin lines on white (≥ 4.5:1 contrast)
    accentSoft: '#EEF6DC', // pale lime tint (badges, running chip)
    maxNeutral: '#C9D6CE', // "remaining to run maximum" — neutral so lime stands out
    canvas: '#F0F4EF', // off-white page background (reduces glare on long sessions)
    paper: '#FFFFFF', // card background
    border: '#DCE3DE',
    text: '#1B2420',
    textMuted: '#5B6B63',
    // Event series (weather & management timeline)
    rain: '#2F6FB5',
    irrigation: '#0E8A8A',
    fertilizer: '#C8431F',
    // Role colours (same as above in light mode; see darkColor for dark mode)
    outline: '#18453B', // thin frame around chart bars and legend swatches
    stripe: '#18453B', // left edge of the Set Management form cards
    raised: '#F0F4EF', // table header rows, slightly lifted surfaces
    hatch: '#18453B', // diagonal lines on the "run maximum" bars
  },
  radius: 10,
  headerRule: 3, // px — the green bottom rule under the white app bar
  fontFamily: '"Metropolis", "Helvetica Neue", Arial, sans-serif',
  serifFamily: 'Garamond, "EB Garamond", "Times New Roman", serif',
} as const;

/** A full colour set with the same names as `tokens.color`. */
export type ColorSet = { [K in keyof typeof tokens.color]: string };

/**
 * Dark mode colours ("Spartan Night", option A of the dark mode mockups, the
 * user's pick): the page and cards are deep shades of Spartan Green, so the
 * whole app stays green; the Spartan Green bars stay the same (set apart by
 * the lime rule) and MSU Lime marks actions and selections. Every name means the same job
 * as in light mode, e.g. `spartanGreen` is "the brand colour for selected
 * borders and highlights", which on dark has to be lime to be seen. Text
 * colours pass 4.5:1 on `paper` (text 12.6:1, muted 7.2:1); borders of
 * controls pass 3:1 (4.4:1). Use them through useColors() (theme/colors.ts), not directly.
 */
export const darkColor: ColorSet = {
  ...tokens.color,
  spartanGreen: '#7BBD00', // highlight / selected borders (Spartan would vanish on the dark green)
  spartanGreenDark: '#0F2E27',
  kellyGreen: '#7BBD00',
  surfaceGreen: '#1B4038', // selected tint (text on it 10:1)
  accentDark: '#9BD94A', // lime as text on dark (9:1)
  accentSoft: '#2A3D10',
  maxNeutral: '#7A958B', // control outlines (4.4:1 on cards)
  canvas: '#0B1F1A',
  paper: '#12302A',
  border: '#2C4D44',
  text: '#EEF3F0',
  textMuted: '#A9BDB4',
  outline: '#D3D8D6', // light frame round chart bars, so every fill (even dark blue or deep brown) shows on the dark cards
  hatch: '#0F2E27', // dark diagonal lines on the light "run maximum" bars
  stripe: '#7BBD00', // MSU Lime
  raised: '#183A33',
};

/**
 * Soil-nitrate colour ramp, shallow → deep (high → low concentration in the
 * concept art). Ten stops, one per SALUS soil layer.
 */
export const depthRamp = [
  '#F7B23B', '#F0961D', '#E5651C', '#C9461F', '#A5331C',
  '#83281A', '#6B2418', '#552018', '#401C17', '#2C1814',
] as const;
