/**
 * pages-404.mjs — run after `npm run build:pages`.
 *
 * GitHub Pages only knows real files, so opening a deep link such as
 * /salus-online/runs would show GitHub's 404 page. Pages serves 404.html for
 * any unknown path, so a copy of index.html there lets the app load and the
 * router show the right page. .nojekyll stops Pages from hiding files whose
 * names start with "_".
 */
import { copyFileSync, writeFileSync } from 'node:fs';

copyFileSync('dist/index.html', 'dist/404.html');
writeFileSync('dist/.nojekyll', '');
console.log('dist/404.html and dist/.nojekyll written for GitHub Pages');
