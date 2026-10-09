/**
 * AppHeader.tsx — the white Spartan White app bar.
 *
 * Shows the SALUS leaf logo (src/assets/salus-logo.webp — swap that file
 * to rebrand) and the SALUS Online wordmark on the left, and the main
 * navigation on the right, plus the ⚙ Settings pop-out (the colour scheme, white bar ⇄ white
 * on Spartan Green, see theme/chrome.tsx). The leaf logo sits straight on the
 * bar in every scheme (the white disc behind it on green bars was removed). The 3 px Spartan Green bottom rule comes from the theme (MuiAppBar).
 * On phones the nav collapses into a menu button.
 * A ⚙ Settings button (always in the bar, also on phones next to ☰) opens one
 * pop-out with the app-wide display settings: Text size, Colour scheme
 * (green / white bars) and Chart colours (MSU / colour-blind safe, all charts).
 * The bar's real height is published as the CSS variable `--salus-header-h`
 * (it grows with large text), for things that stick just under it.
 */
import { useEffect, useRef, useState } from 'react';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SettingsButton from '../settings/SettingsButton';
import { AllChartColoursSetting, ColourSchemeSetting, DarkModeSetting } from '../settings/ColourSettings';
import TextSizeSetting from '../settings/TextSizeSetting';
import StepsBarSetting from '../settings/StepsBarSetting';
import AppVersion from '../settings/AppVersion';
import { useTextSize } from '../../state/TextSizeContext';
import { NavLink, Link as RouterLink } from 'react-router-dom';
import { AppBar, Box, Button, Divider, IconButton, Menu, MenuItem, Toolbar, Typography, useMediaQuery } from '@mui/material';
import { ChromeSurface, softPrimary, useChrome } from '../../theme/chrome';
import MenuIcon from '@mui/icons-material/Menu';
import salusLogo from '../../assets/salus-logo.webp';

/** Top-level destinations. `end` makes "/" only match the exact home route. */
const NAV = [
  { to: '/', label: 'Map', end: true },
  { to: '/runs', label: 'My Runs', end: false },
  { to: '/about', label: 'About', end: false },
  { to: '/contact', label: 'Contact Us', end: false },
  { to: '/review', label: 'Review', end: false },
];

export default function AppHeader() {
  // Collapse the nav into a menu on narrow screens and on short landscape
  // phones (where the full nav would squeeze the wordmark); the latter also
  // get a slimmer bar with no subtitle to save height.
  const shortLandscape = useMediaQuery('(orientation: landscape) and (max-height: 600px)');
  const { textSize } = useTextSize();
  // Large text needs more room for the full nav, so it collapses into the menu sooner.
  const compact = useMediaQuery(textSize === 'large' ? '(max-width:1060px)' : '(max-width:820px)') || shortLandscape;
  // Publish the bar's height (changes with text size and screen) as --salus-header-h.
  const barRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const set = () => document.documentElement.style.setProperty('--salus-header-h', `${Math.round(bar.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { variant } = useChrome();
  const green = variant === 'green';

  return (
    <ChromeSurface>
    <AppBar position="sticky" ref={barRef}>
      <Toolbar sx={{ gap: 2, minHeight: shortLandscape ? '52px !important' : { xs: 60, md: 68 } }}>
        {/* Wordmark — links home */}
        <Box component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textDecoration: 'none' }}>
          {/* The leaf logo sits straight on the bar in every scheme (no white disc), as in Dark bars */}
          <Box sx={{ display: 'flex' }}>
            <Box component="img" src={salusLogo} alt="" sx={{ height: { xs: 34, md: 40 }, width: 'auto', display: 'block' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.375rem', lineHeight: 1, color: 'primary.main' }}>
              SALUS Online
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: shortLandscape ? 'none' : { xs: 'none', sm: 'block' } }}>
              Crop, nitrogen &amp; water simulation · Michigan State University
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* One Settings pop-out for the whole app (text size, dark mode, colours) */}
        <Box data-tour="app-settings" sx={{ order: compact ? 0 : 1 }}>
          <SettingsButton title="Settings" subject="Display" tooltip="Settings: text size, dark mode, colours and steps bar" icon={<SettingsOutlinedIcon />} size="medium" color="text.primary">
            <TextSizeSetting />
            <Divider />
            <DarkModeSetting />
            <Divider />
            <ColourSchemeSetting />
            <Divider />
            <StepsBarSetting />
            <Divider />
            <AllChartColoursSetting />
            <Divider />
            <AppVersion />
          </SettingsButton>
        </Box>

        {compact ? (
          <>
            <IconButton data-tour="nav-menu" aria-label="Open navigation" onClick={(e) => setAnchor(e.currentTarget)} sx={{ color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
              {NAV.map((n) => (
                <MenuItem key={n.to} component={RouterLink} to={n.to} onClick={() => setAnchor(null)}>
                  {n.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : (
          <Box component="nav" sx={{ display: 'flex', gap: 0.5 }}>
            {NAV.map((n) => (
              <Button
                key={n.to}
                component={NavLink}
                to={n.to}
                end={n.end}
                data-tour={n.to === '/' ? 'nav-map' : n.to === '/runs' ? 'nav-my-runs' : undefined}
                sx={{
                  color: 'text.primary',
                  px: 1.5,
                  '&.active': { color: 'primary.main', bgcolor: softPrimary(green ? 0.16 : 0.1) },
                }}
              >
                {n.label}
              </Button>
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
    </ChromeSurface>
  );
}
