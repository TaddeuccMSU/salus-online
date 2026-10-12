/**
 * AppVersion.tsx — the small version line at the bottom of the top-bar Settings
 * pop-out, e.g. "SALUS Online prototype · v0.4.0".
 *
 * The version comes from package.json (via `define` in vite.config.ts), so
 * testers can tell which build they have, which matters for installed offline
 * copies that update in the background. Bump "version" in package.json for
 * every push that deploys the demo site.
 */
import { Typography } from '@mui/material';

const VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';

export default function AppVersion() {
  if (!VERSION) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: -0.5 }}>
      SALUS Online prototype · v{VERSION}
    </Typography>
  );
}
