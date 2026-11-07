#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-200: dossier del círculo del duelo (QA-174-demo,
   decisión pendiente de Kelvin: troncos/rocas restantes en el círculo y el pasillo de la cámara).
   Con ?v18=1 (combate crea la arena en v18_arena y despeja flora en marcha): teleport con
   asentado, censo de instancias de G.vegetacion dentro del círculo (ARENA_R=12) y del pasillo
   (x−5…x−18), capturas desde el pasillo y 3 orientaciones más + stats por calidad.
   Uso: node tools/build/kimi3_200.js --etiqueta r1 [--calidades bajo,alto] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const CALIDADES = arg('--calidades', 'bajo,alto').split(',').map(s => s.trim());
const CPU = parseInt(arg('--cpu', '1'), 10);
const ANCHO = 1600, ALTO = 900, DPR = 1;
const ARENA_R = 12;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi201'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi3q201-/.test(d)) continue;
  try { const st = fs.statSync(path.join(os.tmpdir(), d)); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(path.join(os.tmpdir(), d), { recursive: true, force: true }); } catch (e) { }
}

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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 600)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi3q201-' + Math.random().toString(36).slice(2, 10),
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
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 45000);
  const b = document.getElementById('c1-saltar'); if (b) b.click();
  await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// centro de la arena: la marca v18_arena del módulo de combate (QA-174: sitio fijo 182,172)
const CENTRO_JS = `(() => { const AV = window.AV, G = AV.G;
  const m = G.renderer.scene && G.renderer.scene.getObjectByName('v18_arena');
  if (!m) return JSON.stringify({ ok: false, fallo: 'sin v18_arena (combate no cargado?)' });
  return JSON.stringify({ ok: true, x: m.position.x, y: m.position.y, z: m.position.z });
})()`;

// teleport a dist d del centro con yaw mirando al centro, asentado de streaming
const IR_A = `(async (cx, cz, d, yaw, alt) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const vx = cx + Math.sin(yaw) * d, vz = cz + Math.cos(yaw) * d;
  const vy = Math.max(G.terreno.height(vx, vz) + 2.5, (alt || 0));
  S.pos.x = vx; S.pos.z = vz; S.pos.y = vy + 10; S.vy = 0;
  G.fisica.MOVE.flying = true; G.fisica.MOVE.landing = false;
  G.camara.yaw = Math.atan2(-(cx - vx), -(cz - vz));
  S.facing = { x: -Math.sin(G.camara.yaw), z: -Math.cos(G.camara.yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(vx, vz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1200);
  S.pos.x = vx; S.pos.z = vz; S.pos.y = vy; S.vy = 0;
  G.fisica.MOVE.flying = true; G.fisica.MOVE.landing = false;
  if (G.camara.place) G.camara.place(true);
  await sleep(400);
  S.pos.x = vx; S.pos.z = vz; S.pos.y = vy; S.vy = 0;
  if (G.camara.place) G.camara.place(true);
  return 'ok ' + JSON.stringify({ v: [Math.round(vx*10)/10, Math.round(vy*10)/10, Math.round(vz*10)/10] });
})`;

// censo de instancias de vegetación dentro del círculo (r<=R+1) y del pasillo de cámara (x−5…x−18)
const CENSO_JS = `(() => { const AV = window.AV, G = AV.G;
  try {
    const m = G.renderer.scene.getObjectByName('v18_arena'); if (!m) return 'sin arena';
    const cx = m.position.x, cz = m.position.z, R = ${ARENA_R};
    const inst = G.vegetacion && G.vegetacion.instancias; if (!inst) return 'sin vegetacion.instancias';
    const circulo = {}, pasillo = {};
    let nc = 0, np = 0;
    for (const mod in inst) {
      const P = inst[mod]; if (!P || !P.pos) continue;
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i*4], z = P.pos[i*4+2];
        if (x > 1e5) continue; // despejadas a lo lejos
        const d = Math.hypot(x - cx, z - cz);
        if (d <= R + 1) { circulo[mod] = (circulo[mod] || 0) + 1; nc++; }
        else if (x < cx - 4 && x > cx - 18 && Math.abs(z - cz) < 3.5) { pasillo[mod] = (pasillo[mod] || 0) + 1; np++; }
      }
    }
    const st = G.vegetacion.stats ? G.vegetacion.stats() : null;
    return JSON.stringify({ centro: [Math.round(cx*10)/10, Math.round(cz*10)/10], circulo, pasillo, nCirculo: nc, nPasillo: np, veg: st });
  } catch (e) { return 'ERR ' + e.message; }
})()`;

const STATS_JS = `(() => { const AV = window.AV, G = AV.G; try {
  const st = G.renderer.stats ? G.renderer.stats() : null;
  return JSON.stringify({ calls: st && st.calls, tris: st && st.triangulos, fps: st && st.fps,
    heap: Math.round((performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0)),
    tex: G.renderer.renderer.info.memory.textures, geo: G.renderer.renderer.info.memory.geometries,
    prog: G.renderer.renderer.info.programs.length });
} catch (e) { return 'ERR ' + e.message; } })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q201-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
function mataPorPerfil() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi3q201-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU}`, calidades: {} };
  // vistas: pasillo de la cámara (oeste, donde el check medía troncos) + 3 orientaciones
  const VISTAS = [['oeste_pasillo', 17, Math.PI * 1.5], ['sur', 17, Math.PI], ['este', 17, Math.PI * 0.5], ['norte', 17, 0]];
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: false }, ses);
    if (CPU > 1) { try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { } }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);

    for (const calidad of CALIDADES) {
      const rCal = { vistas: {} };
      try {
        await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${calidad}&v18=1` }, ses);
        const t0 = Date.now(); let listo = false;
        while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
          try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
          await cdp.bombear(0.5);
        }
        if (!listo) throw new Error('el juego no arrancó');
        const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
        if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
        // gesto real por CDP (el .click() sintético no dispara pointerdown/keydown: los módulos V18 cargan alPrimerGesto)
        await cdp.call('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 }, ses);
        await cdp.call('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w', windowsVirtualKeyCode: 87 }, ses);
        await cdp.bombear(1);
        // esperar a que el módulo de combate cree la arena y despeje (perezoso: al primer gesto)
        const arena = await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
          const t0 = performance.now();
          while (performance.now() - t0 < 60000) { if (AV.G.renderer.scene.getObjectByName('v18_arena')) return 'ok'; await sleep(500); }
          return 'sin arena en 60 s'; })()`, 90);
        rCal.arena = arena;
        const censo0 = await evaluar(cdp, ses, CENSO_JS, 30);
        rCal.censoTrasDespeje = typeof censo0 === 'string' && censo0.startsWith('{') ? JSON.parse(censo0) : censo0;
        const centro = rCal.censoTrasDespeje.centro;
        if (!centro) throw new Error('sin centro: ' + censo0);

        for (const [nombre, d, yaw] of VISTAS) {
          const ir = await evaluar(cdp, ses, `(${IR_A})(${centro[0]}, ${centro[1]}, ${d}, ${yaw}, 0)`, 240);
          await cdp.bombear(0.6);
          const stats = JSON.parse(await evaluar(cdp, ses, STATS_JS, 30));
          const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
          fs.writeFileSync(path.join(SALIDA, `k201_${ETIQUETA}_${calidad}_${nombre}.jpg`), Buffer.from(shot.data, 'base64'));
          rCal.vistas[nombre] = { teleport: ir, stats };
          console.log(`  [${calidad}] ${nombre}: calls=${stats.calls} tris=${stats.tris} fps=${stats.fps} heap=${stats.heap}`);
        }
        const censoF = await evaluar(cdp, ses, CENSO_JS, 30);
        rCal.censoFinal = typeof censoF === 'string' && censoF.startsWith('{') ? JSON.parse(censoF) : censoF;
        const errores = await evaluar(cdp, ses, `(window.__aveErrores || []).length`, 10, false);
        rCal.erroresConsola = errores;
        console.log(`  [${calidad}] censo: circulo=${rCal.censoFinal.nCirculo} pasillo=${rCal.censoFinal.nPasillo} · errores=${errores}`);
      } catch (e) {
        rCal.error = String(e && e.message || e).slice(0, 300);
        console.log(`  [${calidad}] ERROR ${rCal.error}`);
      }
      res.calidades[calidad] = rCal;
    }
  } catch (e) {
    res.error = String(e && e.message || e).slice(0, 400);
    console.error('ERROR: ' + res.error);
  } finally {
    fs.writeFileSync(path.join(SALIDA, `k201_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
    try { ws.close(); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  console.log('evidencia en ' + SALIDA);
})();
