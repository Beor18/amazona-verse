// V18.3 · corre AV.v18ArcoTest y AV.v18PuertoTest en un teléfono emulado (390×844, táctil, iPhone; Playwright), con el mismo arranque de
// jugador nuevo que avtest.py (preparar_js de tools/build/config.json). Uso (sin GPU, con el candado de Chrome de la nube):
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node-tools/node_modules flock /tmp/av_chrome2.lock node tools/build/v18_arco_movil.js <build>/site tools/build/config.json
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
(async () => {
  const [dir, cfgPath] = process.argv.slice(2), cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')).pruebas;
  const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };
  const srv = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage(), errores = [], avisos = [];
  p.on('pageerror', e => errores.push(e.message)); p.on('console', m => { if (m.type() === 'error') errores.push(m.text()); else if (m.type() === 'warning') avisos.push(m.text()); });
  p.on('requestfailed', r => { if (!/sw\.js/.test(r.url())) errores.push('red: ' + r.url()); });
  await p.goto(url + 'index.html', { timeout: 120000 });
  await p.waitForFunction(cfg.listo_js, null, { timeout: 400000 });
  console.log('preparación: ' + await p.evaluate(cfg.preparar_js));
  console.log('táctil: ' + await p.evaluate(() => matchMedia('(pointer: coarse)').matches + ' · ' + innerWidth + '×' + innerHeight + ' · botón Acción ' + (() => { const r = document.getElementById('b-act').getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height) + ' en ' + Math.round(r.left) + ',' + Math.round(r.top); })()));
  let ok = true;
  for (const t of ['v18ArcoTest', 'v18PuertoTest']) {
    const r = await p.evaluate(n => AV[n]().then(x => ({ passed: x.passed, total: x.total, fallos: x.results.filter(y => !y.ok).map(y => y.name + ' :: ' + y.extra), movil: x.results.filter(y => /Móvil|táctil|Táctil/.test(y.name)).map(y => (y.ok ? '✓ ' : '✗ ') + y.name + ' :: ' + y.extra) })), t);
    console.log(t + ' ' + r.passed + '/' + r.total); for (const f of r.fallos) console.log('  ✗ ' + f); for (const m of r.movil) console.log('  · ' + m);
    if (r.passed !== r.total) ok = false;
  }
  console.log('consola: ' + errores.length + ' errores' + (errores.length ? ' · ' + errores.slice(0, 4).join(' | ') : '') + ' · ' + avisos.length + ' avisos');
  await b.close(); srv.close();
  process.exit(ok && !errores.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
