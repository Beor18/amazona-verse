#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — verificación del recorte QA-110-mem (b):
   bandas de flora creadas perezosamente (vegetacion.js). En 'bajo' las bandas :sombra (cerca) y
   :lod no se usan nunca (sombraR=0, lodMax=maxArb): antes se reservaban de arranque los buffers
   de instancia (n×76 B por banda) y sus InstancedMesh; ahora se crean en el primer actualizar que
   las necesita. Mide en móvil emulado (390×844 dpr 3, CPU ×4, GPU real) sobre la Ciudad de los 36:
     - bajo:  nº de mallas flora:*:sombra / :lod vivas (esperado 0) y bytes de buffer no reservados
     - alto (tras setCalidad en marcha): bandas creadas (esperado 20 :sombra + 10 :lod) + look.medir
     - FPS p50 ~3 s en la vista de la ciudad, bajo
   Uso: node tools/build/kimi1_qa110b.js --etiqueta r1
*/
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
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi110'));
const ANCHO = 390, ALTO = 844, DPR = 3;
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1b-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 30000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// ciudad (-33,-136) +30 m, asentar, bandas + bytes + heap + medir + FPS
const TOMA_JS = `(async (px, pz, alt, mx, mz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
  G.fisica.MOVE.flying = true;
  const yaw = Math.atan2(-(mx - px), -(mz - pz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1500);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await cuadro(); await cuadro();
  const bands = () => { let sombra = 0, lod = 0; G.renderer.scene.traverse(o => { if (/^flora:.*:sombra$/.test(o.name)) sombra++; else if (/^flora:.*:lod$/.test(o.name)) lod++; }); return { sombra, lod }; };
  const MODELOS_ARBOL = ['ceiba', 'flamboyan', 'tabonuco', 'helecho_arboreo', 'palma_sierra', 'yagrumo', 'bambu', 'palma_sierra_joven', 'yagrumo_joven', 'arbol_enano'];
  const inst = AV.G.vegetacion.instancias, detalle = {};
  let bytes = 0, arboles = 0;
  for (const m of MODELOS_ARBOL) { const P = inst[m]; if (!P) continue; detalle[m] = P.n; arboles += P.n; bytes += P.n * 76 * 3; } // 3 bandas perezosas/modelo (cerca-hoja, cerca-corteza, lod-hoja): n×76 B de buffers por banda
  let med = null, medErr = null;
  try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; if (!med) medErr = 'sin look.medir'; } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  const heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 104857.6) / 10 : null;
  const fps = await new Promise(res => { let n = 0; const t0 = performance.now(); const tick = () => { n++; const dt = performance.now() - t0; if (dt < 3000) requestAnimationFrame(tick); else res(Math.round(n / (dt / 1000))); }; requestAnimationFrame(tick); });
  return JSON.stringify({ nivel: G.renderer.calidad.nivel, bandas: bands(), arboles, lazyBytes: bytes, lazyMB: Math.round(bytes / 104857.6) / 10, detalle, heapMB, fps, med, medErr, vegTipo: typeof AV.G.vegetacion, vegClaves: AV.G.vegetacion ? Object.keys(AV.G.vegetacion).join(',') : null, floraStats: (AV.G.vegetacion && typeof AV.G.vegetacion.stats === 'function') ? AV.G.vegetacion.stats() : null }) })`;

// alto en marcha: las bandas deben crearse solas al primer actualizar
const ALTO_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  G.renderer.setCalidad('alto', true);
  await sleep(700); AV.G.vegetacion.actualizar();
  const bands = () => { let sombra = 0, lod = 0; G.renderer.scene.traverse(o => { if (/^flora:.*:sombra$/.test(o.name)) sombra++; else if (/^flora:.*:lod$/.test(o.name)) lod++; }); return { sombra, lod }; };
  let med = null, medErr = null;
  try { med = AV.look.medir(); } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  return JSON.stringify({ nivel: G.renderer.calidad.nivel, bandas: bands(), med, medErr, dSombra: AV.G.vegetacion.stats().dSombra, sombraR: AV.G.vegetacion.stats().sombraR }) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1b-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

async function abrirJuego(cdp, origen) {
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
  try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
  try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
  try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses); } catch (e) { }
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=bajo` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error('el juego no arrancó');
  const r = await evaluar(cdp, ses, ENTRAR_JS, 90);
  if (!/^ok/.test(r)) throw new Error('entrada: ' + r);
  return { ses, tid };
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX4`, bajo: null, alto: null, errores: null };
  try {
    const { ses, tid } = await abrirJuego(cdp, origen);
    const bajo = JSON.parse(await evaluar(cdp, ses, `(${TOMA_JS})(-33, -136, 30, -4, -127)`, 300));
    res.bajo = bajo;
    console.log(`· bajo  ciudad: bandas sombra=${bajo.bandas.sombra} lod=${bajo.bandas.lod} (esperado 0/0) | lazy=${bajo.lazyMB} MB en ${bajo.arboles} árboles | calls=${bajo.med ? bajo.med.calls : '?'} tris=${bajo.med ? bajo.med.triangulos : '?'} heap=${bajo.heapMB} MB fps=${bajo.fps}`);
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `qa110b_${ETIQUETA}_bajo_ciudad.jpg`), Buffer.from(shot.data, 'base64'));
    const alto = JSON.parse(await evaluar(cdp, ses, `(${ALTO_JS})()`, 60));
    res.alto = alto;
    console.log(`· alto  ciudad: bandas sombra=${alto.bandas.sombra} lod=${alto.bandas.lod} (esperado 20/10) | sombraR=${alto.sombraR} dSombra=${alto.dSombra} | calls=${alto.med ? alto.med.calls : '?'} tris=${alto.med ? alto.med.triangulos : '?'}`);
    res.errores = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.logErrores ? AV.G.logErrores() : (window.__erroresConsola || []).length)`, 15);
    console.log(`· errores de consola: ${res.errores}`);
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } finally {
    try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `qa110b_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log('· JSON: ' + path.join(SALIDA, `qa110b_${ETIQUETA}.json`));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
