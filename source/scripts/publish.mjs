// Copies the Vite build (source/dist) to the repository root, where GitHub Pages serves it.
// Usage (inside source/):  npm run publish:site
import {cpSync, rmSync, readdirSync, existsSync} from 'node:fs';
const dist = new URL('../dist/', import.meta.url);
const repoRoot = new URL('../../', import.meta.url);
if (!existsSync(new URL('index.html', dist))) throw new Error('dist/index.html missing — run "npm run build" first');
rmSync(new URL('app/', repoRoot), {recursive: true, force: true}); // drop old hashed bundles
for (const name of readdirSync(dist)) cpSync(new URL(name, dist), new URL(name, repoRoot), {recursive: true});
console.log('Copied dist/ → repository root:', readdirSync(dist).join(', '));
