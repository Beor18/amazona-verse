#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-091: «parche blanco brillante de noche» de QA-106.
   El 2-nov Kelvin vio «un parche blanco y brillante en una pared de la ciudad» en el iPad (peor de
   noche con bloom). KIMI-053 no lo reprodujo de día y su noche forzada en caliente no cambió el
   ambiente; ?atardecer=1 (atardecer.js:165) lo fuerza AL INSTANTE desde el arranque, incluida la
   carga del módulo en boot.js.
   Dos corridas idénticas salvo ?atardecer=0/1, iPad emulado (820×1180 CSS @ DPR 1,5, UA iPad,
   táctil, CPU ×4, GPU real RX 5700 XT, semilla sin creador), 4 encuadres fijos en la Ciudad de los 36
   con ST.terminar + look.medir + captura CDP, y en cada toma un detector de píxeles blancos
   brillantes (render síncrono + readPixels) con raycast (window.THREE) para nombrar al objeto.
   El juego no se toca: herramienta + evidencia en docs/img/kimi091/.
   Uso: node tools/build/kimi1_091.js --noche 0|1 --etiqueta r1 */
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
const NOCHE = arg('--noche', '1');
const ETIQUETA = arg('--etiqueta', 'r' + NOCHE);
const CALIDAD = arg('--calidad', 'medio');
const DPR = parseFloat(arg('--dpr', '1.5'));
const CPU = parseInt(arg('--cpu', '4'), 10);
const ANCHO = 820, ALTO = 1180;
const SALIDA = arg('--salida', path.join(RAIZ, 'docs', 'img', 'kimi091'));
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1q-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1q-' + Math.random().toString(36).slice(2, 10),
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

// teleport + asentado + look.medir + detector de blancos brillantes + raycast
const TOMA_JS = `(async (px, pz, alt, mx, mz) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S, T = window.THREE;
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
  let med = null, medErr = null;
  try { med = (AV.look && typeof AV.look.medir === 'function') ? AV.look.medir() : null; } catch (e) { medErr = String(e && e.message || e).slice(0, 200); }
  // detector: render síncrono + readPixels; blanco brillante = luma alta y baja saturación
  let blancos = [], rayos = [], detErr = null;
  try {
    const r = G.renderer.renderer, gl = r.getContext(), cam = G.renderer.camera, scene = G.renderer.scene;
    r.render(scene, cam);
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    for (let y = Math.floor(h * 0.05); y < h * 0.95; y += 4) {
      for (let x = Math.floor(w * 0.05); x < w * 0.95; x += 4) {
        const i = (y * w + x) * 4, R = buf[i], G2 = buf[i + 1], B = buf[i + 2];
        const luma = 0.2126 * R + 0.7152 * G2 + 0.0722 * B, mx = Math.max(R, G2, B), mn = Math.min(R, G2, B);
        if (luma > 205 && (mx - mn) < 45) blancos.push([x, y, Math.round(luma)]);
      }
    }
    if (blancos.length) {
      cam.updateMatrixWorld(true);
      const ray = new T.Raycaster(), v2 = new T.Vector2();
      const nombre = o => { let n = o.name || '(sin nombre)', p = o.parent; while (p && p !== scene) { if (p.name) n = p.name + '/' + n; p = p.parent; } return n; };
      const probados = new Set();
      for (const [bx, by] of blancos) {
        if (rayos.length >= 6) break;
        const clave = Math.round(bx / 40) + ',' + Math.round(by / 40);
        if (probados.has(clave)) continue; probados.add(clave);
        v2.set((bx / w) * 2 - 1, -((by / h) * 2 - 1));
        ray.setFromCamera(v2, cam);
        const inter = [];
        for (const o of scene.children) {
          if (!o.visible) continue;
          if (o.isInstancedMesh && o.count > 4000) continue;
          try { const hh = ray.intersectObject(o, true); for (let i = 0; i < Math.min(2, hh.length); i++) inter.push(hh[i]); } catch (e) {}
        }
        inter.sort((a, b) => a.distance - b.distance);
        if (inter[0]) { const o = inter[0].object, m = o.material;
          rayos.push({ px: [bx, by], d: Math.round(inter[0].distance * 10) / 10, obj: nombre(o),
            mat: m ? (m.name || m.type) + (m.color ? '#' + m.color.getHexString() : '') : null,
            inst: o.isInstancedMesh ? (typeof inter[0].instanceId === 'number' ? inter[0].instanceId : null) : null }); }
      }
    }
  } catch (e) { detErr = String(e && e.message || e).slice(0, 200); }
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10],
    med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB } : null, medErr,
    blancos: blancos.length, rayos, detErr }) })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q-'));
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1q-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const res = { etiqueta: ETIQUETA, atardecer: NOCHE, pantalla: `${ANCHO}x${ALTO}@${DPR} cpuX${CPU} ipad-emulado`, calidad: CALIDAD, head: null, tomas: {} };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    try { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses); } catch (e) { }
    try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPU }, ses); } catch (e) { }
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=${CALIDAD}&atardecer=${NOCHE}` }, ses);
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 120);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.head = await evaluar(cdp, ses, `(() => { try { return (AV.G.build && (AV.G.build.commit || AV.G.build.id)) || document.querySelector('meta[name=build]') && document.querySelector('meta[name=build]').content || 'desconocido'; } catch (e) { return 'desconocido'; } })()`, 10);
    const ambiente = await evaluar(cdp, ses, `(() => { try { return JSON.stringify({ hora: AV.G.S.hora, atardecer: AV.G.atardecer ? AV.G.atardecer.estado() : null, k: AV.G.atardecer ? AV.G.atardecer.k() : null }); } catch (e) { return 'ERR ' + e.message; } })()`, 15);
    console.log('· ambiente: ' + ambiente);
    res.ambiente = ambiente;

    const SOLO_RAYS = process.argv.includes('--solo-rays');
    const TOMAS = [
      ['puerta_oeste', 12, -114.8, 4, -4, -127],
      ['aerea', -33, -136, 30, -4, -127],
      ['callejon', 2, -121, 4, -20, -140],
      ['plaza_sur', -4, -132, 4, -4, -120],
    ];
    if (!SOLO_RAYS) for (const [n, px, pz, alt, mx, mz] of TOMAS) {
      const toma = JSON.parse(await evaluar(cdp, ses, `(${TOMA_JS})(${px}, ${pz}, ${alt}, ${mx}, ${mz})`, 300));
      await cdp.bombear(0.3);
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 60000);
      fs.writeFileSync(path.join(SALIDA, `k091_${ETIQUETA}_${n}.jpg`), Buffer.from(shot.data, 'base64'));
      res.tomas[n] = toma;
      console.log(`  ${n}: ${toma.medErr ? 'MED: ' + toma.medErr : `calls=${toma.med.calls} tris=${(toma.med.triangulos / 1e6).toFixed(2)}M`} · blancos=${toma.blancos}${toma.detErr ? ' detErr:' + toma.detErr : ''}`);
      for (const ry of toma.rayos || []) console.log(`    rayo @${ry.px} d=${ry.d} ${ry.obj} · ${ry.mat}`);
    }

    const errs = await evaluar(cdp, ses, `(window.AV && AV.G && AV.G.logErrores ? AV.G.logErrores() : (window.__erroresConsola || []).length)`, 15);
    res.erroresConsola = errs;
    console.log('· errores de consola: ' + JSON.stringify(errs));

    // raycast dirigido: identificar un objeto visto en una captura (NDC x,y en [-1,1])
    const RAYS = arg('--rays', '');
    const APAGA_GUIA = process.argv.includes('--apaga-guia');
    if (APAGA_GUIA) {
      const off = await evaluar(cdp, ses, `(() => { const G = AV.G; let n = 0;
        G.renderer.scene.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === 'f2a03d' && o.material.type === 'MeshBasicMaterial') { o.visible = false; n++; } });
        return 'guia ocultada: ' + n + ' mallas'; })()`, 30, false);
      console.log('· ' + off);
      res.apagaGuia = off;
    }
    if (RAYS) {
      const RAY_JS = `(async (lista) => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S, T = window.THREE;
        S.pos.x = 2; S.pos.z = -121; S.pos.y = G.terreno.height(2, -121) + 4; S.vy = 0; G.fisica.MOVE.flying = true;
        const yaw = Math.atan2(-(-20 - 2), -(-140 - -121));
        G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
        await sleep(1500);
        G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
        const cam = G.renderer.camera, scene = G.renderer.scene;
        cam.updateMatrixWorld(true);
        const ray = new T.Raycaster(), v2 = new T.Vector2(), out = [];
        const nombre = o => { let n = o.name || '(sin nombre)', p = o.parent; while (p && p !== scene) { if (p.name) n = p.name + '/' + n; p = p.parent; } return n; };
        for (const [nx, ny] of lista) {
          v2.set(nx, ny); ray.setFromCamera(v2, cam);
          const inter = [];
          for (const o of scene.children) {
            if (!o.visible) continue;
            if (o.isInstancedMesh && o.count > 4000) continue;
            try { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === 'f2a03d') continue; } catch (e) {}
            try { const hh = ray.intersectObject(o, true); for (let i = 0; i < Math.min(3, hh.length); i++) { if (hh[i].object.material && hh[i].object.material.color && hh[i].object.material.color.getHexString() === 'f2a03d') continue; inter.push(hh[i]); } } catch (e) {}
          }
          inter.sort((a, b) => a.distance - b.distance);
          const h = inter[0];
          out.push({ ndc: [nx, ny], d: h ? Math.round(h.distance * 10) / 10 : null,
            obj: h ? nombre(h.object) : null,
            mat: h && h.object.material ? (h.object.material.name || h.object.material.type) + (h.object.material.color ? '#' + h.object.material.color.getHexString() : '') : null,
            pto: h ? [Math.round(h.point.x * 10) / 10, Math.round(h.point.y * 10) / 10, Math.round(h.point.z * 10) / 10] : null });
        }
        return JSON.stringify(out) })`;
      const lista = RAYS.split(';').filter(Boolean).map(p => p.split(',').map(Number));
      const rayos = JSON.parse(await evaluar(cdp, ses, `(${RAY_JS})(${JSON.stringify(lista)})`, 60));
      res.rayosDirigidos = rayos;
      for (const r of rayos) console.log(`  rayo ndc=${r.ndc} d=${r.d} ${r.obj} · ${r.mat} @${r.pto}`);
    }

    await cdp.call('Target.closeTarget', { targetId: tid }).catch(() => { });
  } finally {
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    srv.close();
  }
  fs.writeFileSync(path.join(SALIDA, `k091_${ETIQUETA}.json`), JSON.stringify(res, null, 1));
  console.log('· JSON: ' + path.join(SALIDA, `k091_${ETIQUETA}.json`));
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); try { mataPorPerfil(); } catch (e2) { } process.exit(1); });
