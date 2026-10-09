/**
 * main.tsx — browser entry point.
 *
 * Loads the Metropolis font (MSU's brand typeface, SIL Open Font License),
 * provides the colour scheme, dark mode and MUI theme + CSS baseline (ChromeProvider), provides the runs store and the
 * user's text size (TextSizeProvider), display units (UnitsProvider) and chart-colour choices
 * (ChartColorsProvider), and mounts
 * <App/> into #root.
 */
import './components/map/maplibreWorker'; // must run before any map is created
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/metropolis/400.css';
import '@fontsource/metropolis/600.css';
import '@fontsource/metropolis/700.css';
import '@fontsource/metropolis/800.css';
import { RunsProvider } from './state/RunsContext';
import { ChartColorsProvider } from './state/ChartColorsContext';
import { UnitsProvider } from './state/UnitsContext';
import { TextSizeProvider } from './state/TextSizeContext'; // also applies the saved size before the first paint
import { ChromeProvider } from './theme/chrome';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChromeProvider>
        <RunsProvider>
          <TextSizeProvider>
          <UnitsProvider>
            <ChartColorsProvider>
              <App />
            </ChartColorsProvider>
          </UnitsProvider>
          </TextSizeProvider>
        </RunsProvider>
    </ChromeProvider>
  </StrictMode>,
);
