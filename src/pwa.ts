/**
 * pwa.ts — registers the offline service worker (GitHub Pages build only).
 *
 * `npm run build:pages` builds with `--mode pages` and writes dist/sw.js
 * (scripts/make-sw.mjs). Every other build
 * (dev, normal build, the standalone file) skips this, so nothing changes there.
 * The worker keeps a copy of the app, mock data, fonts and viewed map tiles so
 * an installed copy ("Add to Home Screen") opens without a connection.
 */
export function registerOfflineSupport() {
  if (import.meta.env.MODE !== 'pages') return;
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {
      /* offline support is a bonus; the app works without it */
    });
  });
}
