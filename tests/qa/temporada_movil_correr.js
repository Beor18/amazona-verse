/* QA · W17 / CG-66 · lanza AV.temporadaMovilTest (tests/qa/temporada_movil.js) en un móvil emulado con Playwright.
   Uso: node tests/qa/temporada_movil_correr.js <url del juego servido, p. ej. http://127.0.0.1:8971/> [--caps 1,2,3] [--seguir]
        [--perfil <carpeta>] [--en] [--log]
   Móvil: viewport 390×844, hasTouch, isMobile, deviceScaleFactor 2 (iPhone). Sin GPU añade AV_SWIFTSHADER=1.
   --perfil guarda el almacenamiento del navegador en esa carpeta (contexto persistente): así se juega un capítulo por corrida y se
   encadenan con --seguir (no limpia ni devuelve el almacenamiento: la temporada sigue). Sin --perfil, los 6 seguidos en una corrida.
   Sale con código 1 si algo queda en rojo. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const a = process.argv.slice(2), url = a.find(x => /^https?:/.test(x));
  const val = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  if (!url) { console.error('uso: node tests/qa/temporada_movil_correr.js <url> [--caps 1,2] [--seguir] [--perfil dir] [--en]'); process.exit(2); }
  const args = process.env.AV_SWIFTSHADER ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [];
  const movil = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
  let b = null, ctx;
  if (val('--perfil')) ctx = await chromium.launchPersistentContext(val('--perfil'), Object.assign({ args }, movil));
  else { b = await chromium.launch({ args }); ctx = await b.newContext(movil); }
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', e => errores.push(e.message)); p.on('console', m => { if (m.type() === 'error') errores.push(m.text()); else if (/^\[W17\]/.test(m.text()) || (a.includes('--log') && /^\[CG3\]/.test(m.text()))) console.log(m.text()); });
  await p.goto(url.replace(/\/?$/, '/') + 'index.html', { timeout: 120000 });
  await p.waitForFunction('window.AV && AV.G && AV.G.actores && (AV.G.actores.player3D || AV.G.actores.failed3D)', null, { timeout: 400000 });
  if (a.includes('--log')) await p.evaluate(() => { window.AV_E2E_LOG = true; }); // traza de epCaminar ([CG3])
  for (const f of ['ep_caminar.js', 'ep3_e2e.js', 'ep4_e2e.js', 'ep5_e2e.js', 'ep6_e2e.js', 'temporada_movil.js']) await p.addScriptTag({ content: fs.readFileSync(path.join(__dirname, f), 'utf8') });
  const opts = { idioma: a.includes('--en') ? 'en' : 'es', seguir: a.includes('--seguir') };
  if (val('--caps')) opts.caps = val('--caps').split(',').map(Number);
  const t0 = Date.now();
  const r = await p.evaluate(o => AV.temporadaMovilTest(o), opts);
  console.log('temporadaMovilTest ' + r.passed + '/' + r.total + ' · ' + Math.round((Date.now() - t0) / 60000) + ' min');
  for (const x of r.results) if (!x.ok) console.log('  ✗ ' + x.name + (x.extra ? ' :: ' + x.extra : ''));
  console.log('errores de consola: ' + errores.length + (errores.length ? ' · ' + errores.slice(0, 3).join(' | ') : ''));
  await ctx.close(); if (b) await b.close();
  process.exit(r.passed === r.total && !errores.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
