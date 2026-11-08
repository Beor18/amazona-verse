#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-333: composición de draw calls de los capítulos flojos
   del Modo Escuela (ep3 Villa Mangle, ep5 meseta) en su spawn natural, ?escuela=1 calidad bajo,
   perfil Chromebook 1366×768. Cuenta por grupos (NO mide tiempos: los counts son inmunes a la
   contención). Entrada = misma semilla/protocolo que tools/build/kimi1_127.js.
   Uso: node tools/build/kimi3_333_escuela.js --packs ep3,ep5 [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const PACKS = arg('--packs', 'ep3,ep5').split(',');
const ETIQUETA = arg('--etiqueta', 'probe');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi333');
fs.mkdirSync(SALIDA, { recursive: true });
const LOGF = path.join(SALIDA, `k333e_${ETIQUETA}.log`);
fs.writeFileSync(LOGF, '');
function log(m) { try { fs.appendFileSync(LOGF, `[${new Date().toISOString().slice(11, 19)}] ${m}\n`); } catch (e) { } }

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3e333-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, pr) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

function semillaSave(pack) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save';
  const v = pack === 'cap1' ? 6 : 1;
  const save = {
    v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3e333-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false },
    lugares: [], canoa: null, edu: { inicio: null, fin: null, fichas: [], formativa: {}, registro: null }
  };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem(${JSON.stringify(clave)}, ${JSON.stringify(JSON.stringify(save))});
} catch (e) {}`;
}

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const ASENTAR_JS = `(async () => { try { return await (async () => {
  const G = AV.G, S = AV.state, sleep = ms => new Promise(r => setTimeout(r, ms));
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { try { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); } catch (e) {} try { if (ST.terminar) await ST.terminar(); } catch (e) {} }
  if (G.solidos && G.solidos.terminar) { try { G.solidos.terminar(); } catch (e) {} }
  await sleep(6000);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

const INVENTARIO_JS = `function __inv() { const AV = window.AV, G = AV.G, R = G.renderer, scene = R.scene;
  const grupos = {};
  let totEscena = 0;
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.visible) return; let p = o.parent; while (p) { if (!p.visible) return; p = p.parent; }
    const es = o.isMesh || o.isLine || o.isPoints || o.isSprite;
    if (!es) return;
    const n = o.name || '(sin nombre)';
    let pref = n.split(':')[0];
    if (n.indexOf('edificios') === 0) pref = n.slice(0, 28);
    if (n === '(sin nombre)') pref = 'SIN_NOMBRE · ' + (o.type) + ' · mat:' + (Array.isArray(o.material) ? o.material.map(m => m.name || '?').join('+') : (o.material && o.material.name) || '?');
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    let calls = 0; try { if (o.geometry && o.geometry.groups && o.geometry.groups.length) calls = o.geometry.groups.length; else calls = mats.length; } catch (e) { calls = 1; }
    const tris = o.geometry && o.geometry.index ? Math.round(o.geometry.index.count / 3) : (o.geometry && o.geometry.attributes && o.geometry.attributes.position ? Math.round(o.geometry.attributes.position.count / 3) : 0);
    const g = grupos[pref] || (grupos[pref] = { n: 0, calls: 0, tris: 0, ejemplos: {} });
    g.n++; g.calls += calls; g.tris += tris; totEscena += calls;
    if (g.ejemplos[n] === undefined && Object.keys(g.ejemplos).length < 4) g.ejemplos[n] = 1;
  });
  const lista = Object.entries(grupos).map(([k, v]) => ({ prefijo: k, objetos: v.n, calls: v.calls, ktris: Math.round(v.tris / 1000), ejemplos: Object.keys(v.ejemplos) }))
    .sort((a, b) => b.calls - a.calls);
  const anoniDet = [];
  const _fr = new THREE.Frustum(), _pv = new THREE.Matrix4(), _m4 = new THREE.Matrix4(), _sph = new THREE.Sphere();
  const cam = R.camera; cam.updateMatrixWorld();
  _pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  _fr.setFromProjectionMatrix(_pv);
  scene.traverse(o => {
    if (!o.visible || !(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return; let p = o.parent; while (p) { if (!p.visible) return; p = p.parent; }
    const n = o.name || '';
    const mat = Array.isArray(o.material) ? o.material.map(m => (m && m.name) || '?').join('+') : ((o.material && o.material.name) || '?');
    if (n) return;
    if (anoniDet.length >= 120) return;
    const cadena = []; let q = o;
    while (q && cadena.length < 5) { cadena.unshift(q.name || q.type || '?'); q = q.parent; }
    const wp = new THREE.Vector3(); try { o.getWorldPosition(wp); } catch (e) {}
    const geo = o.geometry && o.geometry.index ? Math.round(o.geometry.index.count / 3) : (o.geometry && o.geometry.attributes && o.geometry.attributes.position ? Math.round(o.geometry.attributes.position.count / 3) : 0);
    let enFrustum = null;
    try {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      _sph.copy(o.geometry.boundingSphere).applyMatrix4(o.matrixWorld);
      enFrustum = _fr.intersectsSphere(_sph) && (o.layers.mask & cam.layers.mask) !== 0;
    } catch (e) { enFrustum = null; }
    anoniDet.push({ mat, tipo: o.type, tris: geo, enFrustum: !!enFrustum, pos: [Math.round(wp.x), Math.round(wp.y), Math.round(wp.z)], cadena: cadena.join(' < ') });
  });
  let st = null; try { st = R.stats(); } catch (e) {}
  return JSON.stringify({ totEscena, escuela: !!(st && st.escuela), calidad: st && st.calidad, dpr: st && st.dpr,
    infoCalls: st && st.calls, infoTris: st && st.triangulos, grupos: lista.slice(0, 40), anoniDet: anoniDet.slice(0, 90) });
} __inv()`;

(async () => {
  const res = { etiqueta: ETIQUETA, packs: {}, chromePid: null };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  log(`servidor ${origen} packs=${PACKS.join(',')}`);
  for (const pack of PACKS) {
    const perf = path.join(os.tmpdir(), `kimi3e333-${pack}-${Date.now().toString(36)}`);
    const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${perf}`, '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1366,768', '--force-device-scale-factor=1', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
    res.chromePid = chrome.pid;
    let err = ''; chrome.stderr.on('data', d => { err += d; });
    const puertoFile = path.join(perf, 'DevToolsActivePort');
    let port = null, wsPath = null;
    for (let i = 0; i < 150 && !port; i++) {
      if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { port = parseInt(l[0], 10); wsPath = l[1].trim(); } }
      if (!port) await new Promise(r => setTimeout(r, 200));
    }
    if (!port) { try { chrome.kill('SIGKILL'); } catch (e2) { } try { execSync(`taskkill /PID ${chrome.pid} /T /F >NUL 2>&1`); } catch (e2) { } res.packs[pack] = { error: 'Chrome no abrió DevTools en 30 s: ' + err.slice(0, 200) }; continue; }
    let ws;
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
      await new Promise((re, re2) => { ws.onopen = re; ws.onerror = re2; });
    } catch (e) { try { chrome.kill('SIGKILL'); } catch (e2) { } try { execSync(`taskkill /PID ${chrome.pid} /T /F >NUL 2>&1`); } catch (e2) { } res.packs[pack] = { error: 'ws: ' + (e && e.message || e) }; continue; }
    const cdp = new CDP(ws);
    const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' }, null, 15000);
    const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId, flatten: true }, null, 15000);
    await cdp.call('Page.enable', {}, ses, 15000);
    await cdp.call('Runtime.enable', {}, ses, 15000);
    try {
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave(pack) }, ses, 15000);
      const t0 = Date.now();
      await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=${pack}&mapa=real&calidad=bajo&escuela=1` }, ses, 30000);
      let listo = false;
      while (Date.now() - t0 < 240000) {
        try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
        await new Promise(r => setTimeout(r, 500));
      }
      if (!listo) { res.packs[pack] = { error: 'el juego no arrancó en 240 s' }; log(`${pack}: no arrancó`); throw new Error('arranque'); }
      const ent = await ev(cdp, ses, ENTRAR_JS, 150);
      log(`${pack}: entrar='${ent}' en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      if (ent !== 'ok') { res.packs[pack] = { error: 'entrar: ' + ent }; throw new Error('entrar'); }
      const asent = await ev(cdp, ses, ASENTAR_JS, 90);
      log(`${pack}: asentar='${asent}'`);
      const inv = JSON.parse(await ev(cdp, ses, INVENTARIO_JS, 60));
  const zonasInf = JSON.parse(await ev(cdp, ses, "(() => { const G = AV.G; const ST = G.mundo && G.mundo.streaming; const out = []; try { for (const id in ST.zonas) { const Z = ST.zonas[id]; out.push({ id: id, ciudad: !!Z.ciudad, nivel: Z.nivel, cercaMallas: (Z.cercaMallas||[]).length, cercaModelos: Z.cercaModelos ? Z.cercaModelos.size : -1, fundiendo: !!Z.cercaFundiendo, usaMalla: !!Z.usaMalla, usaCF: !!Z.usaCercaFusion, ninst: Z.inst.length, modelos: Z.modelos.size }); } } catch (e) {} const rec = []; try { for (const n in ST.recursos) { const r = ST.recursos[n].cerca; if (r && r.estado !== 'nada') rec.push(n + ':' + r.estado + (r.refs ? ':refs' + r.refs : '')); } } catch (e) {} return JSON.stringify({ zonas: out, cercaRec: rec.slice(0, 60) }); })()", 30));
  inv.zonasFusion = zonasInf;

      inv.errores = await ev(cdp, ses, `(window.__erroresConsola || []).slice(0, 8)`, 10, false);
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
      fs.writeFileSync(path.join(SALIDA, `k333e_${ETIQUETA}_${pack}_spawn.jpg`), Buffer.from(shot.data, 'base64'));
      res.packs[pack] = inv;
      log(`${pack}: totEscena=${inv.totEscena} escuela=${inv.escuela} calidad=${inv.calidad} dpr=${inv.dpr} grupos=${inv.grupos.length} errores=${JSON.stringify(inv.errores)}`);
    } catch (e) {
      if (!res.packs[pack]) res.packs[pack] = { error: String(e && e.message || e).slice(0, 300) };
      log(`${pack}: ERROR ${res.packs[pack].error}`);
    } finally {
      try { ws.close(); } catch (e) { }
      try { chrome.kill('SIGKILL'); } catch (e) { }
      try { execSync(`taskkill /PID ${chrome.pid} /T /F >NUL 2>&1`); } catch (e) { }
      try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    }
  }
  srv.close();
  fs.writeFileSync(path.join(SALIDA, `k333e_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  log('fin');
  console.log(JSON.stringify(res, null, 1));
  process.exit(0);
})().catch(e => { log('FATAL ' + (e && e.stack || e)); console.error(e); process.exit(1); });
