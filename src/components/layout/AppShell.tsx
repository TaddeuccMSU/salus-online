/**
 * AppShell.tsx — page frame shared by every route.
 *
 * Renders the header once and an <Outlet/> where React Router drops the
 * current page. Pages decide their own padding (the map page is full-bleed).
 * On the map page ("/") the frame is locked to the window height (100dvh,
 * overflow hidden): the page itself never scrolls; only the panel does.
 * Everything sits inside <TourProvider> so the product tour can move between
 * pages (it needs the router, so it lives here rather than in main.tsx).
 *
 * Accessibility: a "Skip to main content" link is the first thing Tab reaches
 * (shown only when focused); <main id="main"> is its target. The announcer
 * (screen-reader status messages) and RouteFocus (focus + announcement on
 * page change) live here too; see state/AnnouncerContext.tsx.
 */
import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from './AppHeader';
import { TourProvider } from '../../tour/TourProvider';
import { AnnouncerProvider, RouteFocus } from '../../state/AnnouncerContext';
import { tokens } from '../../theme/tokens';

export default function AppShell() {
  // The map page is a fixed, app-like screen: exactly one window tall, no page
  // scrolling (the map pans/zooms, the Set Management panel scrolls inside).
  const fixed = useLocation().pathname === '/';
  return (
    <AnnouncerProvider>
    <TourProvider>
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', ...(fixed && { height: '100dvh', minHeight: 0, overflow: 'hidden' }) }}>
      {/* Skip link: off-screen until focused, then a lime tab at the top-left */}
      <Box
        component="a"
        href="#main"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        sx={{
          position: 'absolute', left: 8, top: -60, zIndex: 2000, px: 2, py: 1, borderRadius: 2,
          bgcolor: tokens.color.accent, color: tokens.color.spartanGreen, fontWeight: 700, textDecoration: 'none',
          '&:focus': { top: 8 },
        }}
      >
        Skip to main content
      </Box>
      <AppHeader />
      <Box id="main" tabIndex={-1} component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, outline: 'none' }}>
        <Outlet />
      </Box>
      <RouteFocus />
    </Box>
    </TourProvider>
    </AnnouncerProvider>
  );
}
