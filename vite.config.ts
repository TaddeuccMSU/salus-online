// Vite build configuration. The React plugin enables JSX + fast refresh in dev.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // MapLibre's worker (see src/components/map/maplibreWorker.ts) is built as an
  // ES-module worker, matching how MapLibre starts it.
  worker: { format: 'es' },
});
