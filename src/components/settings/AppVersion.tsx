/**
 * AppVersion.tsx — the small version line at the bottom of the top-bar Settings
 * pop-out, e.g. "SALUS Online prototype · v0.3.0 · built Oct 9, 2026".
 *
 * The version comes from package.json and the date from the build (both via
 * `define` in vite.config.ts), so testers can tell which build they have,
 * which matters for installed offline copies that update in the background.
 * Bump "version" in package.json for each release.
 */
import { Typography } from '@mui/material';
import dayjs from 'dayjs';

const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
const BUILT = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : '';

export default function AppVersion() {
  if (!VERSION) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: -0.5 }}>
      SALUS Online prototype · v{VERSION}
      {BUILT && ` · built ${dayjs(BUILT).format('MMM D, YYYY')}`}
    </Typography>
  );
}
