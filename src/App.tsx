/**
 * App.tsx — route table (React Router v7, "data router" API).
 *
 *   /                         steps 1–2 — Select field on the map, then the
 *                             Set Management panel slides in over the map
 *   /runs/:runId/results      step 3 — Selected Field Results (NShow charts)
 *   /runs                     My Runs (DataGrid of all runs)
 *   /about /contact /review   Info pages
 * Every route renders inside <AppShell/> so the header is shared.
 */
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import MapPage from './pages/MapPage';
import RunsPage from './pages/RunsPage';
import ResultsPage from './pages/ResultsPage';
import { AboutPage, ContactPage, ReviewPage } from './pages/InfoPages';

/**
 * Sub-folder hosting (e.g. GitHub Pages at /salus-online/): routes live under
 * Vite's base path. Root hosting ('/') and the standalone file ('./') need none.
 */
const BASE = import.meta.env.BASE_URL;
const basename = BASE.startsWith('/') && BASE !== '/' ? BASE.replace(/\/$/, '') : undefined;

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <MapPage /> },
      { path: '/runs', element: <RunsPage /> },
      // Old wizard URLs from earlier prototypes → the map
      { path: '/new/*', element: <Navigate to="/" replace /> },
      { path: '/runs/new', element: <Navigate to="/" replace /> },
      { path: '/runs/:runId/results', element: <ResultsPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
], { basename });

export default function App() {
  return <RouterProvider router={router} />;
}
