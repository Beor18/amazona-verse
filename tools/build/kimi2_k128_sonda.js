#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-128: sonda de zonas en ep6+mapa=real.
   ¿Carga el juego la zona de La Mina (kelvin_aldea_mina_2) y sus edificios instanciados?
   Uso: node tools/build/kimi2_k128_sonda.js [--pack ep6] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const PACK = arg('--pack', 'ep6');
const PX = parseFloat(arg('--px', '92.4')), PZ = parseFloat(arg('--pz', '-47.3'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.handlers = [];
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && this.pend.has(m.id)) { const p = this.pend.get(m.id); this.pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } else if (m.method) this.handlers.forEach(h => h(m)); };
  }
  call(m, p, s) { const id = ++this.id; return new Promise((res, rej) => { this.pend.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); }); }
  on(h) { this.handlers.push(h); }
  listo() { return new Promise(r => { this.ws.onopen = () => r(); }); }
  async bombear(segs) { const t0 = Date.now(); while (Date.now() - t0 < segs * 1000) { try { await this.call('Browser.getVersion'); } catch (e) { } await new Promise(r => setTimeout(r, 250)); } }
}

async function evaluar(cdp, ses, expr, topeS, json) {
  const r = await cdp.call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: (topeS || 30) * 1000 }, ses);
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  const v = r.result && r.result.value;
  return json ? JSON.stringify(v) : v;
}

(async () => {
  const srv = await servir();
  const puerto = srv.address().port;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k128-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--window-size=1280,720'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  let puertoDev = 0, wsPath = '';
  for (let i = 0; i < 300 && !wsPath; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!wsPath) { console.log('· no DevTools: ' + err.slice(0, 200)); process.exit(1); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
  await cdp.call('Page.navigate', { url: `http://127.0.0.1:${puerto}/index.html?pack=${PACK}&mapa=real&calidad=medio` }, ses);
  const t1 = Date.now(); let listo = false;
  while (Date.now() - t1 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) { console.log('· el juego no arrancó'); process.exit(1); }
  console.log('· listo: ' + await evaluar(cdp, ses, CFG.preparar_js, 300));
  // ir al punto de la cerca y drenar la zona
  console.log('· teleport: ' + await evaluar(cdp, ses, `(async (px, pz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G, S = G.S;
    S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + 8; S.vy = 0; G.fisica.MOVE.flying = true;
    const ST = G.mundo && G.mundo.streaming;
    if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
    if (G.solidos && G.solidos.terminar) G.solidos.terminar();
    await sleep(1500); return [Math.round(S.pos.x*10)/10, Math.round(S.pos.z*10)/10]; })(${PX}, ${PZ})`, 300));
  const zonas = await evaluar(cdp, ses, `(() => { const G = window.AV.G; const ST = G.streaming; const Z = (ST && ST.zonas) || {};
    const ids = Object.keys(Z);
    const conEmp = ids.filter(k => { const z = Z[k]; return z.modelos && z.modelos.has && z.modelos.has('empalizada'); });
    const zonaEn = ST && ST.zonaEn ? ST.zonaEn(${PX}, ${PZ}) : (ST && ST.zona ? ST.zona(${PX}, ${PZ}) : null);
    return { total: ids.length, mina: ids.filter(k => /mina/i.test(k)), conEmpalizada: conEmp,
      nivelMina: conEmp.map(k => ({ id: k, nivel: Z[k].nivel, inst: Z[k].inst.length })),
      zonaEnPunto: zonaEn && (zonaEn.id || zonaEn) }; })()`, 60);
  console.log('· zonas: ' + JSON.stringify(zonas));
  // re-fijar la posición (el anti-atasco reubica a Vittata) y re-drenar
  await evaluar(cdp, ses, `(async (px, pz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), G = window.AV.G, S = G.S;
    S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + 8; S.vy = 0;
    const ST = G.streaming; if (ST && ST.revisar) ST.revisar(px, pz);
    await sleep(2500);
    S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + 8;
    return [Math.round(S.pos.x*10)/10, Math.round(S.pos.z*10)/10]; })(${PX}, ${PZ})`, 60);
  const escena = await evaluar(cdp, ses, `(() => { const R = window.AV.G.renderer; const out = [];
    R.scene.traverse(o => { if (o.isInstancedMesh && /empalizada/.test(o.name || '')) {
      const M = new THREE.Matrix4(), V = new THREE.Vector3(), Q = new THREE.Quaternion(), SC = new THREE.Vector3();
      const inst = []; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, M); M.decompose(V, Q, SC); const w = o.localToWorld(V.clone()); inst.push([Math.round(w.x*100)/100, Math.round(w.y*100)/100, Math.round(w.z*100)/100]); }
      out.push({ nombre: o.name, count: o.count, visible: o.visible, instancias: inst.slice(0, 12) }); } });
    return out; })()`, 60);
  console.log('· escena: ' + JSON.stringify(escena));
  chrome.kill('SIGKILL');
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
