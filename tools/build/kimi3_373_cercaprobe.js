#!/usr/bin/env node
/* KIMI-373 (Kimi 3) — micro-sonda de ciclo de vida de la fusión cercana de zona (QA-nuevo-br3-3).
   Visita repetida a las zonas sospechosas (colina, kelvin_aldea_rio_este_3): fusión → salida → asentado,
   4 fases, con tracker de dispose (THREE.EventDispatcher) y censo por uuid. Si la fusión cercana se refunde
   en cada visita y la geometría vieja NO se dispone, info.memory.geometries crece por fase y el censo lo muestra.
   Uso: node tools/build/kimi3_373_cercaprobe.js --etiqueta p1 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const ETI = arg('--etiqueta', 'p1');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3c373-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { console.log('· no arrancó'); process.exit(1); }
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  const t1 = Date.now();
  const res = await ev(cdp, ses, `(async () => {
    const G = AV.G, R = G.renderer, ST = G.streaming.gestor, P = G.pruebas;
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const ED = THREE.EventDispatcher.prototype, add0 = ED.addEventListener, rem0 = ED.removeEventListener;
    const vivos = new Map(); let fase = 0;
    ED.addEventListener = function (t, fn) { if (t === 'dispose' && (this.isBufferGeometry || this.isTexture) && !vivos.has(this)) vivos.set(this, fase); return add0.apply(this, arguments); };
    ED.removeEventListener = function (t) { if (t === 'dispose') vivos.delete(this); return rem0.apply(this, arguments); };
    const ZONAS = ['colina', 'kelvin_aldea_rio_este_3'];
    const info = R.renderer.info;
    async function asentar() {
      for (let i = 0; i < 14; i++) {
        try { ST.revisar(G.S.pos.x, G.S.pos.z); if (ST.liberarYa) ST.liberarYa(); } catch (e) {}
        await cuadros(2); await espera(280);
        const s = ST.stats();
        if (s.descargando === 0 && s.trabajos === 0 && i >= 3) break;
      }
    }
    async function irZona(id) {
      const Z = ST.zonas[id]; if (!Z) return 'sin zona ' + id;
      P.teleport(Z.cx, Z.cz, 0, -1); P.tick(0.1);
      try { await Promise.race([ST.alrededor(Z.cx, Z.cz), espera(8000)]); } catch (e) {}
      try { await Promise.race([ST.terminar && ST.terminar(), espera(6000)]); } catch (e) {}
      if (G.solidos && G.solidos.terminar) try { G.solidos.terminar(); } catch (e) {}
      await asentar();
      return { id, nivel: Z.nivel, cercaMallas: (Z.cercaMallas || []).length, cercaF: !!Z.cercaF };
    }
    function censoGeo(prefijo) {
      const out = [];
      R.scene.traverse(o => {
        if (o.geometry && o.name && o.name.indexOf(prefijo) === 0) {
          const g = o.geometry;
          out.push({ mesh: o.name, uuid: g.uuid.slice(0, 8), v: g.attributes && g.attributes.position ? g.attributes.position.count : 0, up: vivos.has(g) ? vivos.get(g) : 'pre' });
        }
      });
      return out;
    }
    const spawn = (G.terreno && G.terreno.mapa && G.terreno.mapa.spawn) || { x: G.S.pos.x, z: G.S.pos.z };
    const fases = [];
    async function faseEn(idZona) {
      fase++;
      let detalle = null;
      if (idZona) detalle = await irZona(idZona);
      else { P.teleport(spawn.x, spawn.z, 0, -1); P.tick(0.1); await asentar(); }
      const cerca = {};
      for (const z of ZONAS) cerca[z] = censoGeo('edificiosZonaCerca:' + z + ':');
      fases.push({ fase, detalle, geo: info.memory.geometries, tex: info.memory.textures, cerca, cercaVivas: (function () { const l = []; R.scene.traverse(o => { if (o.geometry && /^edificiosZonaCerca:/.test(o.name)) l.push(o.name + ':' + o.geometry.uuid.slice(0, 8) + 'v' + (o.geometry.attributes.position ? o.geometry.attributes.position.count : 0) + 'up' + (vivos.has(o.geometry) ? vivos.get(o.geometry) : 'pre')); }); return l; })() });
    }
    await faseEn(null);                       // fase 1: spawn asentado
    await faseEn('colina');                   // fase 2: colina fundida
    await faseEn(null);                       // fase 3: vuelta al spawn (teardown)
    await faseEn('colina');                   // fase 4: colina otra vez (¿re-fusión? ¿dispose?)
    await faseEn(null);                       // fase 5: spawn
    await faseEn('kelvin_aldea_rio_este_3');  // fase 6
    await faseEn(null);                       // fase 7
    return { fases, totalGeo: info.memory.geometries };
  })()`, 420);
  const dir = path.join(RAIZ, 'docs', 'img', 'kimi373'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `k373_cerca_${ETI}.json`), JSON.stringify({ cuando: new Date().toISOString(), head: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(), res }, null, 1));
  console.log('· resultado:', JSON.stringify(res).slice(0, 8000));
  console.log(`· ${Math.round((Date.now() - t1) / 1000)} s · evidencia docs/img/kimi373/k373_cerca_${ETI}.json`);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
