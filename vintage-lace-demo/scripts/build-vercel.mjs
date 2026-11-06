import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'public');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'script.js']) {
  await copyFile(resolve(root, file), resolve(output, file));
}
await cp(resolve(root, 'assets'), resolve(output, 'assets'), { recursive: true });
console.log('Built public/ for Vercel. API functions remain in api/.');
