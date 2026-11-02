/* QA · lanza AV.duracionCap1 (tests/qa/duracion_cap1.js) con Playwright y escribe el informe (AP4).
   Uso: node tests/qa/duracion_cap1_correr.js <url del juego servido, p. ej. http://127.0.0.1:8766/> <salida.md> [nota]
   Chrome: el de Playwright; sin GPU añade AV_SWIFTSHADER=1 (WebGL por software, todo más lento). */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [url, salida, nota] = process.argv.slice(2);
  if (!url || !salida) { console.error('uso: node tests/qa/duracion_cap1_correr.js <url> <salida.md> [nota]'); process.exit(2); }
  const args = process.env.AV_SWIFTSHADER ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [];
  const b = await chromium.launch({ args });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  await p.goto(url.replace(/\/?$/, '/') + 'index.html', { timeout: 120000 });
  await p.waitForFunction('window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D)', null, { timeout: 400000 });
  for (const f of ['e2e.js', 'duracion_cap1.js']) await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, f), 'utf8') });
  await p.waitForFunction('AV.duracionCap1 && AV.e2eTest', null, { timeout: 60000 });
  const r = await p.evaluate(n => AV.duracionCap1({ nota: n }), nota || '');
  fs.writeFileSync(salida, r.md + '\n');
  console.log('rápido', r.rapido, 's · normal', r.normal, 's · explorador', r.explorador, 's · aula', r.aula, '· e2e', r.e2e.passed + '/' + r.e2e.total, errores.length ? '· errores: ' + errores.slice(0, 3).join(' | ') : '');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
