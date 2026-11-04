// Retratos del Álbum de las 36 desde el modelo 3D real (ver tools/album/README.md).
//   node tools/album/retratos.js [--out carpeta] [--jpg] [--var variantes.json] [--silueta] [id ...]     (sin ids: las 36; --silueta: solo la de las cerradas)
// --var: lista [{nombre, encuadre?, clave?, yaw?, …}] que pisa retratos.json; cada variante sale en <out>/<nombre>/ (para afinar).
// Escribe <out>/<id>.webp (256×320) y <out>/2x/<id>.webp (512×640; carpeta y no «@2x» para que la poda de la build los alcance). Por defecto out = assets/retratos_album.
// Se dibujan en el juego de verdad (index.html, look vibrant_toon): ver en_juego.js. --comparar <salida.jpg>: el juego frente al retrato.
// Necesita Chromium de Playwright en /opt/pw-browsers/chromium (NODE_PATH=$(npm root -g)).
const { chromium } = require('playwright'); const fs = require('fs'); const http = require('http'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'retratos.json')));
const args = process.argv.slice(2); let out = path.join(ROOT, 'assets', 'retratos_album'), fmt = 'webp', sil = false, comparar = null, vars = [{ nombre: '' }]; const ids = [];
for (let i = 0; i < args.length; i++) { if (args[i] === '--out') out = path.resolve(args[++i]); else if (args[i] === '--jpg') fmt = 'jpg'; else if (args[i] === '--silueta') sil = true; else if (args[i] === '--comparar') comparar = path.resolve(args[++i]); else if (args[i] === '--var') vars = JSON.parse(fs.readFileSync(args[++i])); else ids.push(args[i]); }
const region = {}; for (const [r, l] of Object.entries(CFG.regiones)) for (const id of l) region[id] = r;
const lista = ids.length ? ids : Object.keys(region);
for (const id of lista) if (!region[id]) { console.error('sin región en retratos.json:', id); process.exit(1); }
// acento = color propio de la cabeza (PALETA de src/game/album.js, medido sobre las pieles)
const pal = {}; const src = fs.readFileSync(path.join(ROOT, 'src/game/album.js'), 'utf8');
for (const m of src.matchAll(/(\w+): \['(#[0-9a-f]{6})', '(#[0-9a-f]{6})', ([\d.]+)\]/g)) pal[m[1]] = m[3];
const mime = { '.css': 'text/css', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => { const p = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, p);
  fs.readFile(f, (e, d) => { if (e) { if (!/favicon/.test(p)) console.log('404', p); r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); }).listen(0);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--headless=new'] });
  // El juego de verdad (look de fábrica vibrant_toon, calidad alta, sol): Jugar → Empezar como un jugador nuevo, y luego se
  // inyectan fondos.js, en_juego.js y componer.js. Ventana 4:5 (el lienzo del juego tiene el aspecto de la tarjeta).
  const pg = await b.newPage({ viewport: { width: 512, height: 640 } }); let errores = 0;
  pg.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.location().url || '')) { errores++; console.log('CONSOLE', m.text()); } }); pg.on('pageerror', e => { errores++; console.log('PAGEERR', e.message); });
  const PR = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/build/config.json'))).pruebas;
  await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?look=vibrant_toon&calidad=alto&clima=sol`);
  await pg.waitForFunction(PR.listo_js, null, { timeout: 240000 });
  const prep = await pg.evaluate(PR.preparar_js); console.log('preparación:', prep); if (!/^ok/.test(prep)) throw new Error(prep);
  await pg.waitForFunction('window.AV.G.actores.player3D && window.AV.look && window.AV.look.actual === "vibrant_toon"', null, { timeout: 120000 });
  try { await pg.waitForSelector('#c1-saltar', { timeout: 20000 }); await pg.click('#c1-saltar'); } catch (e) { console.log('sin «Saltar intro»'); }
  await pg.waitForTimeout(8000); // streaming de la zona de aparición y primeros barridos del look
  for (const f of ['tools/album/fondos.js', 'tools/album/en_juego.js', 'tools/album/componer.js']) await pg.addScriptTag({ path: path.join(ROOT, f) });
  await pg.waitForFunction('window.READY', null, { timeout: 60000 });
  const ext = fmt === 'jpg' ? 'jpg' : 'webp';
  for (const v of vars) {
    const dir = path.join(out, v.nombre || ''); fs.mkdirSync(path.join(dir, '2x'), { recursive: true });
    const base = { pose: CFG.pose, t: CFG.t, yaw: CFG.yaw, encuadre: CFG.encuadre, clave: CFG.clave, fondo: CFG.fondo || {} };
    const c = Object.assign({}, base, v, { encuadre: Object.assign({}, base.encuadre, v.encuadre), fondo: Object.assign({}, base.fondo, v.fondo) });
    if (comparar) { // docs/img/retratos/comparacion_juego.jpg: el juego (cuadro real y misma cámara) frente al retrato nuevo y el anterior
      const o = Object.assign({ piel: 'vittata', region: region.vittata, acento: pal.vittata || null, semilla: 7, formato: 'jpg' }, c, CFG.salida);
      await pg.evaluate(() => { try { window.AV.G.ui.hideToast(); } catch (e) { /* sin HUD */ } }); await pg.waitForTimeout(4000);
      await pg.waitForFunction(() => { const p = window.AV.G.actores.player3D.root; let v = true; p.traverseAncestors(a => { if (!a.visible) v = false; }); return v && p.visible; }, null, { timeout: 30000 });
      const caja = await pg.evaluate(() => window.AVRetratoCaja());
      const real = (await pg.screenshot({ type: 'png' })).toString('base64');
      const juego = await pg.evaluate(o => window.AVRetratoJuego(o, o.w2, o.h2), o);
      const nuevo = await pg.evaluate(o => window.retrato(o), o);
      let viejo = null; try { viejo = require('child_process').execSync('git show b1696b05:assets/retratos_album/2x/vittata.webp', { cwd: ROOT }).toString('base64'); } catch (e) { /* sin historia */ }
      const r = await pg.evaluate(a => window.AVComparar(a), { caja, real: 'data:image/png;base64,' + real, juego: juego.url, nuevo: nuevo.x2.url, viejo: viejo && 'data:image/webp;base64,' + viejo });
      fs.writeFileSync(comparar, Buffer.from(r.url.split(',')[1], 'base64'));
      console.log('comparación', comparar, JSON.stringify(r.medidas)); continue;
    }
    if (sil) { // silueta de las cerradas (una sola para las 36): <out>/silueta.webp y <out>/2x/silueta.webp
      const r = await pg.evaluate(o => window.silueta(o), Object.assign({ piel: 'vittata' }, c, CFG.salida));
      fs.writeFileSync(path.join(dir, '2x', 'silueta.webp'), Buffer.from(r.x2.url.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(dir, 'silueta.webp'), Buffer.from(r.x1.url.split(',')[1], 'base64'));
      console.log(`${v.nombre || '-'}\tsilueta\t1x ${r.x1.kb} KB (q ${r.x1.q})\t2x ${r.x2.kb} KB (q ${r.x2.q})`); continue;
    }
    for (const id of lista) {
      const o = Object.assign({ piel: id, region: region[id], acento: pal[id] || null, semilla: 7, formato: fmt }, c, CFG.salida);
      const r = await pg.evaluate(o => window.retrato(o), o);
      fs.writeFileSync(path.join(dir, '2x', `${id}.${ext}`), Buffer.from(r.x2.url.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(dir, `${id}.${ext}`), Buffer.from(r.x1.url.split(',')[1], 'base64'));
      console.log(`${v.nombre || '-'}\t${id}\t${region[id]}\t1x ${r.x1.kb} KB (q ${r.x1.q})\t2x ${r.x2.kb} KB (q ${r.x2.q})`);
    }
  }
  console.log('caja', JSON.stringify(await pg.evaluate('window.CAJA')));
  console.log('errores de consola:', errores);
  await b.close(); srv.close(); process.exit(errores ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
