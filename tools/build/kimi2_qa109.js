#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — QA-109 (BUGS.md, hallazgo de KIMI-016):
   la bahía de Villa Raíz junto al muelle (cap. 1, (150, 222) mirando a la orilla) se ve
   muy pálida/blanca con parches teal frente al mar rico de la desembocadura (cap. 3).
   Hipótesis a comprobar antes de tocar nada:
     A) fresnel a ángulo rasante (la mitad lejana de la bahía refleja el horizonte pálido):
        a más altura de cámara (ángulo más vertical) el agua tiene que verse rica;
     B) pendiente suave del fondo = banda de poca profundidad muy ancha (espuma + alfa baja);
        el perfil de profundidad de la bahía lo muestra;
     C) specular del sol: a otra hora (atardecer forzado) tiene que cambiar.
   Mide por toma: % píxeles pálidos (luma>180), fracción teal, draw calls, tris.
   Uso: node tools/build/kimi2_qa109.js [--salida docs/img/kimi016]
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
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi016'));
const ANCHO = parseInt(arg('--ancho', '1920'), 10), ALTO = parseInt(arg('--alto', '1080'), 10);
fs.mkdirSync(SALIDA, { recursive: true });

// limpieza de perfiles temporales míos de vueltas cortadas (Chrome zombi)
for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi2q-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

// [nombre, camX, camZ, altura, miraX, miraZ]
const TOMAS = [
  ['baja_rasante', 150, 240, 2.5, 150, 205],
  ['original', 150, 222, 8, 150, 205],
  ['media', 150, 232, 12, 150, 205],
  ['alta', 150, 238, 25, 150, 208],
  ['mar_adentro', 150, 222, 8, 150, 258],
  ['cenital', 152, 226, 60, 150, 214],
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
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
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
  // estadísticas de color sobre el lienzo real (96×54): pálidos, teal, medias
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 54;
  const cx2 = cv.getContext('2d'); cx2.drawImage(RE.domElement, 0, 0, 96, 54);
  const d = cx2.getImageData(0, 0, 96, 54).data;
  let pale = 0, teal = 0, sum = 0, aguaN = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], l = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += l;
    if (l > 180) pale++;
    // agua ~= dominante azul/verde, no vegetación oscura ni arena
    if (b > 90 && b >= r + 12 && g >= r) { aguaN++; if (g > 140 && b > 140 && l > 150) teal++; }
  }
  const n = d.length / 4;
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10],
    calls: info.calls, tris: Math.round(info.triangles / 1000) / 1000 + 'M',
    luma: Math.round(sum / n), palePc: Math.round(pale / n * 100), aguaPc: Math.round(aguaN / n * 100), tealPc: Math.round(teal / Math.max(1, aguaN) * 100),
    hora: S.hora != null ? Math.round(S.hora * 100) / 100 : null }) })`;

const PERFIL_JS = `(async (x, z0, z1, paso) => { const G = window.AV.G, H = G.terreno.height, nivel = G.agua && G.agua.levelAt ? G.agua.levelAt(x, (z0 + z1) / 2) : null;
  const out = [];
  for (let z = z0; z <= z1; z += paso) { const h = H(x, z); out.push({ z, h: Math.round(h * 100) / 100, prof: nivel != null ? Math.round((nivel - h) * 100) / 100 : null }); }
  return JSON.stringify({ x, nivel: Math.round(nivel * 100) / 100, filas: out }) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q-'));
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

async function abrirJuego(cdp, origen, extra) {
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}${extra || ''}` }, ses);
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
  const f = path.join(SALIDA, `qa109_${nombre}.jpg`);
  fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
  console.log(`  ${nombre}: luma=${stats.luma} palida=${stats.palePc}% agua=${stats.aguaPc}% teal=${stats.tealPc}% hora=${stats.hora}`);
  return stats;
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  try {
    // mediodía (estado normal del juego)
    let { ses, tid } = await abrirJuego(cdp, origen, '');
    console.log('· mediodía:');
    for (const t of TOMAS) await toma(cdp, ses, t[0], t);
    const perfil = JSON.parse(await evaluar(cdp, ses, `(${PERFIL_JS})(150, 196, 246, 2)`, 60));
    console.log(`· perfil de fondo x=${perfil.x} · nivel del mar=${perfil.nivel}:`);
    for (const f of perfil.filas) console.log(`  z=${f.z} terreno=${f.h >= 0 ? '+' : ''}${f.h} prof=${f.prof}`);
    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
    // atardecer forzado (?atardecer=1)
    ({ ses, tid } = await abrirJuego(cdp, origen, '&atardecer=1'));
    console.log('· atardecer (sol bajo, luz cálida):');
    for (const t of [TOMAS[1], TOMAS[3]]) await toma(cdp, ses, `atardecer_${t[0]}`, t);
  } finally {
    chrome.kill(); srv.close();
  }
  process.exit(0);
})().catch(e => { console.error('ERROR ' + e.message); process.exit(1); });
