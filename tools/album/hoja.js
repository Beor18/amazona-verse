// Hoja de contacto del Álbum: node tools/album/hoja.js <carpeta con los retratos> <salida.png> <id …>
// Captura tools/album/hoja.html (CSS real del Diario + album.js real) con la propuesta arriba y la tarjeta de hoy abajo.
const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..'); const [dir, salida, ...ids] = process.argv.slice(2);
const DIR = path.resolve(dir), rel = '__retratos';
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u.startsWith('/__retratos/') ? path.join(DIR, path.basename(u)) : path.join(ROOT, u);
  fs.readFile(f, (e, d) => { if (e) { if (!/favicon/.test(u)) console.log('404', u); r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--headless=new'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 2 }); let err = 0;
  pg.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.location().url || '')) { err++; console.log('CONSOLE', m.text()); } }); pg.on('pageerror', e => { err++; console.log('PAGEERR', e.message); });
  await pg.goto(`http://127.0.0.1:${srv.address().port}/tools/album/hoja.html`);
  await pg.evaluate(([i, c]) => { document.documentElement.style.setProperty('--ancho', (140 + i.length * 190) + 'px'); return window.montar(i, c); }, [ids, rel]);
  await pg.waitForTimeout(300);
  await (await pg.$('#card')).screenshot({ path: salida });
  console.log('hoja', salida, 'errores de consola:', err); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
