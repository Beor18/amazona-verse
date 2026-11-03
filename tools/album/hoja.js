// Hoja de contacto del Álbum: node tools/album/hoja.js <salida.jpg|png> [--cols 6] [id …]   (sin ids: las 36 abiertas)
// Captura tools/album/hoja.html: la sección real del Diario (album.js) con los retratos de assets/retratos_album/.
const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..'); const args = process.argv.slice(2); const salida = path.resolve(args.shift()); let cols = 6; const ids = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--cols') cols = +args[++i]; else ids.push(args[i]); }
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u);
  fs.readFile(f, (e, d) => { if (e) { if (!/favicon/.test(u)) console.log('404', u); r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--headless=new'] });
  const pg = await b.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 2 }); let err = 0;
  pg.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.location().url || '')) { err++; console.log('CONSOLE', m.text()); } }); pg.on('pageerror', e => { err++; console.log('PAGEERR', e.message); });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/tools/album/hoja.html`);
  const todas = ids.length ? ids : await pg.evaluate(() => (window.AV_ESPECIES.especies || []).concat(window.AV_ESPECIES.extintas || []).map(e => e.id));
  await pg.evaluate(([i, c]) => { document.documentElement.style.setProperty('--cols', c); document.documentElement.style.setProperty('--ancho', (24 + c * 160) + 'px'); return window.montar(i); }, [todas, cols]);
  await pg.waitForTimeout(300);
  const jpg = /\.jpe?g$/i.test(salida);
  await (await pg.$('#card')).screenshot(jpg ? { path: salida, type: 'jpeg', quality: 86 } : { path: salida });
  console.log('hoja', salida, (fs.statSync(salida).size / 1024).toFixed(0) + ' KB', 'errores de consola:', err); await b.close(); srv.close(); process.exit(err ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
