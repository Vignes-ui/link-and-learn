import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const publicDir = path.join(repoRoot, 'backend', 'public');
const preserved = new Set(['.htaccess', 'index.php']);

const entries = await readdir(publicDir, { withFileTypes: true });
for (const entry of entries) {
  if (preserved.has(entry.name)) continue;
  await rm(path.join(publicDir, entry.name), { recursive: true, force: true });
}

await mkdir(publicDir, { recursive: true });
await cp(distDir, publicDir, { recursive: true, force: true });

console.log('Copied frontend build into backend/public');
