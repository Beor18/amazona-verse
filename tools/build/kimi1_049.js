#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-049 (islas lejanas del sur):
   diagnóstico en vivo (etiqueta «base»): los aros planos de espuma/bajío de los conos de
   respaldo medían world y = 0 / -0,2 (no +0,5: la loma aplastada scale.y 0.45 anula el
   -0,5 del posado) — coplanares con el mar y «colgados» de la loma, no del agua: desde
   rasante y desde el aire la isla leía «flotando» sobre su propia espuma, separada por
   una franja de mar. Fix (agua.js MAR_FRAG + uniform uIslas; terreno.js loma() sin aros):
   espuma de contacto + bandas y bajío turquesa se dibujan sobre la superficie real del
   mar (con olas). Post: este probe debe reportar aros: [] (la bruma es RingGeometry
   colgada de la escena, no entra).
   Las islas: A(-330,430,r60) B(40,520,r45) C(380,420,r40) — AV_MAPA_CAP1.ISLANDS.
   Sin gesto real del jugador los conos de respaldo siguen visibles: es el caso de uso
   (herramientas, y el juego real si el relieve .glb no llega).
   Uso: node tools/build/kimi1_049.js --etiqueta base [--salida docs/img/kimi049]
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
const CALIDAD = arg('--calidad', 'medio');
const ETIQUETA = arg('--etiqueta', 'toma');
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi049'));
const ANCHO = parseInt(arg('--ancho', '1600'), 10), ALTO = parseInt(arg('--alto', '900'), 10);
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1i-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

// [nombre, camX, camZ, alturaSobreMarOEnTierra, miraX, miraZ]
// la cámara va sobre el mar (altura sobre y=0) o sobre tierra (sobre el terreno); alt siempre suma al y base
const TOMAS = [
  ['islaB_rasante_cerca', 40, 380, 3.0, 40, 520],
  ['islaB_rasante_costa', 40, 252, 3.5, 40, 520],
  ['islaB_aerea', 40, 360, 45, 40, 520],
  ['islaC_rasante', 235, 250, 3.5, 380, 420],
  ['islaA_rasante', -228, 252, 3.5, -330, 430],
  ['ctrl_bahia_villa', 150, 222, 8, 150, 205],
  ['ctrl_playa_este', 60, 242, 8, 60, 214],
];

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
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 500));
  return r.result ? r.result.value : undefined;
}

const TOMA_JS = `(async (px, pz, alt, mx, mz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, R = G.renderer, S = G.S;
  const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (G.ui && G.ui.hideToast) G.ui.hideToast();
  const h = G.terreno.height(px, pz);
  const base = Math.max(h, 0); // sobre el mar, y=0; sobre tierra, el terreno
  S.pos.x = px; S.pos.z = pz; S.pos.y = base + alt; S.vy = 0;
  G.fisica.MOVE.flying = true;
  const yaw = Math.atan2(-(mx - px), -(mz - pz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1200);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await cuadro(); await cuadro();
  const RE = R.renderer || R;
  const info = RE.info.render;
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10],
    terrenoH: Math.round(h * 100) / 100, calls: info.calls, tris: Math.round(info.triangles / 1000) / 1000 + 'M',
    hora: S.hora != null ? Math.round(S.hora * 100) / 100 : null }) })`;

const ARO_JS = `(async () => { const G = window.AV.G; const scene = G.renderer.scene; const out = [];
  const v = new (window.AV.G.renderer.scene.position.constructor)();
  scene.traverse(o => { if (o.geometry && o.geometry.type === 'RingGeometry' && o.parent && o.parent !== scene && o.parent.type === 'Mesh') {
    o.getWorldPosition(v); out.push({ anillo: Math.round(v.y * 1000) / 1000, rInt: o.geometry.parameters.innerRadius, rExt: o.geometry.parameters.outerRadius, visible: o.visible && o.parent.visible, opacidad: o.material.opacity });
  } });
  return JSON.stringify({ aros: out, islas: (G.terreno.islas || []).map(i => ({ x: i.x, z: i.z, r: i.r })) }) })`;

const FPS_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = performance.now(); let n = 0;
  await new Promise(res => { const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return Math.round(n / 3) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1i-'));
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
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}` }, ses);
  const t0 = Date.now(); let listo = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
    await cdp.bombear(0.5);
  }
  if (!listo) throw new Error('el juego no arrancó');
  await evaluar(cdp, ses, CFG.preparar_js, 300);
  await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
    const b = document.getElementById('c1-saltar'); if (b) b.click();
    await sleep(1200);
    const f = document.getElementById('c1-fade'); if (f) f.remove();
    if (window.AV && AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
    return 'intro saltada'; })()`, 30);
  return { ses, tid };
}

async function toma(cdp, ses, nombre, t) {
  const stats = JSON.parse(await evaluar(cdp, ses, `(${TOMA_JS})(${t[1]}, ${t[2]}, ${t[3]}, ${t[4]}, ${t[5]})`, 180));
  await cdp.bombear(0.4);
  const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
  fs.writeFileSync(path.join(SALIDA, `k049_${ETIQUETA}_${nombre}.jpg`), Buffer.from(shot.data, 'base64'));
  console.log(`  ${nombre}: pos=${JSON.stringify(stats.pos)} calls=${stats.calls} tris=${stats.tris}`);
  return stats;
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = {};
  try {
    const { ses, tid } = await abrirJuego(cdp, origen);
    console.log(`· islas del sur · etiqueta=${ETIQUETA} · ${ANCHO}x${ALTO} · ${CALIDAD}:`);
    res.aros = JSON.parse(await evaluar(cdp, ses, `(${ARO_JS})()`, 30));
    console.log('  aros en escena:', JSON.stringify(res.aros.aros));
    for (const t of TOMAS) res[t[0]] = await toma(cdp, ses, t[0], t);
    const fps = await evaluar(cdp, ses, `(${FPS_JS})()`, 15);
    res.fps = fps;
    console.log(`· FPS ~${fps} en la última vista (3 s)`);
    const errs = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.logErrores ? AV.G.logErrores() : (window.__erroresConsola || []).length)`, 15);
    console.log(`· errores de consola: ${errs}`);
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } finally {
    chrome.kill(); srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `k049_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  process.exit(0);
})();
