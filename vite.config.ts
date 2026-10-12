// Vite build configuration. The React plugin enables JSX + fast refresh in dev.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

/** App version (package.json) and build date, shown at the bottom of Settings. */
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // MapLibre's worker (see src/components/map/maplibreWorker.ts) is built as an
  // ES-module worker, matching how MapLibre starts it.
  worker: { format: 'es' },
});
