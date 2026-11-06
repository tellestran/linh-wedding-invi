import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
if (existsSync(resolve(root, '.env.local'))) loadEnvFile(resolve(root, '.env.local'));
const port = Number(process.env.PORT || 5500);
const source = await readFile(resolve(root, 'dist/server/index.js'), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
await mkdir(resolve(root, '.preview'), { recursive:true });
const sqlite = new DatabaseSync(resolve(root, '.preview/rsvp.sqlite'));
const table = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='rsvps'").get();
if (!table) sqlite.exec(await readFile(resolve(root, 'drizzle/0000_wedding_rsvps.sql'), 'utf8'));
const DB = { prepare(sql) { return { bind(...args) { return { async run() { return sqlite.prepare(sql).run(...args); } }; } }; } };
createServer(async (req, res) => {
  try {
    const parts = [];
    for await (const part of req) parts.push(part);
    const request = new Request(`http://${req.headers.host || `127.0.0.1:${port}`}${req.url}`, { method:req.method, headers:req.headers, ...(!['GET','HEAD'].includes(req.method) ? { body:Buffer.concat(parts) } : {}) });
    const result = await worker.fetch(request, {
      DB,
      GUEST_LOOKUP_URL: process.env.GUEST_LOOKUP_URL,
      GUEST_LOOKUP_SECRET: process.env.GUEST_LOOKUP_SECRET
    });
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(Buffer.from(await result.arrayBuffer()));
  } catch { res.writeHead(500); res.end('Preview error'); }
}).listen(port, '127.0.0.1', () => console.log(`Local preview: http://127.0.0.1:${port}`));
