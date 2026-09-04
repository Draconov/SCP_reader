import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const build = spawnSync('node', ['tools/build.mjs'], { cwd: process.cwd(), stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const root = path.join(process.cwd(), 'dist');
const port = Number(process.env.PORT || 5173);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json', '.map':'application/json' };
http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (file.endsWith(path.sep)) file += 'index.html';
  if (!file.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, '127.0.0.1', () => console.log(`SCP_reader dev server: http://127.0.0.1:${port}`));
