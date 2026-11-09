/* Servidor estático mínimo para el sanity check local de kimi3_353_sitio.js (KIMI-353). */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path');
const RAIZ = process.cwd(); const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.ktx2': 'application/octet-stream', '.wasm': 'application/wasm', '.jpg': 'image/jpeg' };
http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(RAIZ, u === '/' ? 'index.html' : u);
  if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
}).listen(8931, '127.0.0.1', () => console.log('sirviendo 8931'));
