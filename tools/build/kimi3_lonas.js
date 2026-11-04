#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-Task-010: verificación de las lonas en las aldeas del cap. 1.
   Chrome headless propio + CDP (sin librerías), GPU real, escritorio 1920×1080 dpr 1, calidad alta.
   Recorre las aldeas con la familia de lonas (carpa_a/carpa_e/carpa_f/campamento_c/toldo_pequeno),
   mide FPS/draw calls/triángulos, audita los materiales de los _hd (deben ser AV_HD_Savage, 1 por modelo),
   saca capturas y corre streamingTest y lookTest de regresión.
   Salida: docs/img/kimi010/resultados.json y capturas *.jpg.  Uso: node tools/build/kimi3_lonas.js [--solo-aldeas]
   Chrome 156 (Win): el lanzador puede delegar en un hijo y salir code 0 con la flota viva; se espera solo a
   DevToolsActivePort (no a exitCode), se cierra con Browser.close por CDP y al arrancar se limpian huérfanos
   de vueltas anteriores (solo procesos chrome con el prefijo de perfil de este script). */
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
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi010');
fs.mkdirSync(SALIDA, { recursive: true });
const SEGUNDOS = 6;
const ANCHO = 1920, ALTO = 1080;
const SOLO_ALDEAS = process.argv.includes('--solo-aldeas');

// aldeas con lonas (posiciones del mundo real, de escena_kelvin_cap1.json)
const VISTAS = [
  { id: 'lomas', x: -85, z: 95, mira: [-85, 95], modelos: ['carpa_a', 'carpa_e', 'carpa_f'] },
  { id: 'colina', x: -5, z: 112, mira: [-5, 112], modelos: ['carpa_e'] },
  { id: 'rio_oeste_2', x: -133, z: -42, mira: [-133, -42], modelos: ['campamento_c', 'toldo_pequeno'] },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message + ' ' + JSON.stringify(d.error.data || ''))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: true, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}

const SONDA_JS = `(() => { const Q = window.__qaM = { dt: [] }; let t = 0;
  const f = n => { if (t) Q.dt.push(n - t); t = n; if (Q.dt.length > 40000) Q.dt.splice(0, 20000); requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;
const MEDIR_JS = `(() => { const Q = window.__qaM || { dt: [] }; const d = Q.dt.slice(), n = d.length;
  const orden = d.slice().sort((a, b) => a - b);
  const media = n ? orden.reduce((a, b) => a + b, 0) / n : 0;
  const q = p => n ? orden[Math.min(n - 1, Math.floor(n * p))] : 0;
  let st = {}; try { const R = window.AV && AV.G && AV.G.renderer; st = (R && R.stats && R.stats()) || {}; } catch (e) {}
  const info = (st.calls != null) ? { calls: st.calls, triangulos: st.triangulos } : null;
  const png = (() => { try { const R2 = AV.G.renderer; if (R2.drawScene) R2.drawScene(R2.camera); return R2.canvas.toDataURL('image/jpeg', 0.85); } catch (e) { return null; } })();
  Q.dt = [];
  return JSON.stringify({ cuadros: n, fps: n ? Math.round(10000 / media) / 10 : 0, p95: Math.round(q(0.95) * 10) / 10, peor: Math.round((n ? orden[n - 1] : 0) * 10) / 10, info, png }); })()`;
// teletransporte + asentar streaming mirando a un punto
const IR_JS = (v) => `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const T = G.terreno; let y = 30;
  try { y = (T.height ? T.height(${v.x}, ${v.z}) : 30) + 2; } catch (e) {}
  S.pos.x = ${v.x}; S.pos.y = y; S.pos.z = ${v.z};
  try { const M = G.fisica.MOVE; M.flying = false; M.posado = ''; M.grounded = true; M.speed = 0; } catch (e) {}
  try { const dx = ${v.mira[0]} - ${v.x}, dz = ${v.mira[1]} - ${v.z}; G.camara.yaw = Math.atan2(dx, dz); G.camara.place(true); } catch (e) {}
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(1800);
  return 'ok ' + Math.round(S.pos.x) + ',' + Math.round(S.pos.y) + ',' + Math.round(S.pos.z); })()`;
// auditoría de materiales: nombres y nº de mallas/dibujos por nombre en la escena
const AUDIT_JS = `(() => { const AV = window.AV; const out = {}; let calls = 0;
  (AV.G.renderer.scene).traverse(o => { if (!o.isMesh && !o.isInstancedMesh) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
    let nom = o.name || ''; for (const m of ms) { const k = (m && m.name) || '?'; out[k] = (out[k] || 0) + 1; } calls++; });
  return JSON.stringify({ llamadasEscena: calls, materiales: out }); })()`;

async function lanzarChrome(intentos) {
  let ultimo = '';
  for (let intento = 0; intento < (intentos || 3); intento++) {
    try { return await lanzarChromeUnaVez(); } catch (e) { ultimo = e.message; await new Promise(r => setTimeout(r, 2500)); }
  }
  throw new Error(ultimo);
}
async function lanzarChromeUnaVez() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3l-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--enable-logging=stderr', '--v=0',
    `--window-size=${ANCHO},${ALTO}`, 'about:blank'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  chrome.stderr.on('data', d => { err += d; });
  // Chrome 156 (Win) a veces delega en un proceso hijo y el lanzador sale code 0: no mirar exitCode,
  // solo esperar a que la flota escriba DevToolsActivePort en el perfil.
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(puertoFile)) {
      const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
      const puerto = parseInt(l[0], 10), wsPath = (l[1] || '').trim();
      if (puerto > 0 && wsPath) return { chrome, perf, puerto, wsPath };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Chrome no abrió DevTools en 30 s: ' + err.slice(0, 300));
}
// Limpia huérfanos de vueltas anteriores: solo chrome cuya línea de comandos lleva el prefijo de perfil de este script.
function limpiarHuerfanos() {
  try {
    const ps = "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*kimi3l-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { /* sin powershell o sin huérfanos: seguir */ }
}

(async () => {
  limpiarHuerfanos();
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws);
  await cdp.listo();
  const resultado = { cuando: new Date().toISOString(), maquina: 'PC Windows · Chrome headless GPU (ANGLE/D3D11) · ' + ANCHO + '×' + ALTO + ' dpr 1 · calidad alta', vistas: [], auditorias: {}, pruebas: {} };
  console.log(`· servidor ${origen} · ${ANCHO}×${ALTO} · calidad alta`);

  async function nuevaPestana() {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" + SONDA_JS }, ses);
    return { tid, ses };
  }
  async function esperarListo(ses) {
    const t0 = Date.now();
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10)) return true; } catch (e) { /* aún no */ }
      await cdp.bombear(0.5);
    }
    return false;
  }
  async function medirFase(ses, id, fase) {
    const m = JSON.parse(await evaluar(cdp, ses, MEDIR_JS, 30));
    const png = m.png; delete m.png;
    if (png) { const f = `${id}_${fase}.jpg`; fs.writeFileSync(path.join(SALIDA, f), Buffer.from(png.split(',')[1], 'base64')); m.captura = f; }
    m.vista = id; m.fase = fase;
    resultado.vistas.push(m);
    console.log(`  · ${id} ${fase}: ${m.fps} FPS (p95 ${m.p95} ms, peor ${m.peor} ms) · ${m.info ? m.info.calls + ' calls · ' + Math.round((m.info.triangulos || 0) / 1000) + ' k tris' : 'sin info'}`);
    return m;
  }

  // --- recorrido de aldeas ---
  {
    const { ses } = await nuevaPestana();
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=alto` }, ses);
    if (!(await esperarListo(ses))) throw new Error('el juego no arrancó');
    const prep = await evaluar(cdp, ses, CFG.preparar_js, 300);
    if (!String(prep).startsWith('ok')) throw new Error('preparar falló: ' + prep);
    await evaluar(cdp, ses, `(async () => { await (window.AV.G.mundo && window.AV.G.mundo.listo); await new Promise(r => setTimeout(r, 5000)); return 1; })()`, 300);
    for (const v of VISTAS) {
      try {
        await evaluar(cdp, ses, IR_JS(v), 120);
        await evaluar(cdp, ses, MEDIR_JS, 30);          // reset de la sonda
        await cdp.bombear(SEGUNDOS);                    // vista quieta
        await medirFase(ses, v.id, 'aldeas');
        const audit = JSON.parse(await evaluar(cdp, ses, AUDIT_JS, 30));
        resultado.auditorias[v.id] = audit;
        const hd = Object.keys(audit.materiales).filter(k => /AV_HD/.test(k));
        const crudos = Object.keys(audit.materiales).filter(k => /Fabric_|Multi_Pikes|tex_original/i.test(k));
        console.log(`    materiales HD visibles: [${hd.join(', ')}] · crudos: [${crudos.join(', ') || 'ninguno'}]`);
      } catch (e) { console.log(`  · ${v.id}: ERROR ${e.message}`); resultado.vistas.push({ vista: v.id, error: e.message }); }
    }
    // una pasada cercana a cada familia: zoom mirando cada modelo desde ~8 m
    for (const v of VISTAS) {
      for (const mod of v.modelos) {
        try {
          await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
            const ST = G.mundo && G.mundo.streaming; let mejor = null, dm = 1e9;
            const zonas = (ST && ST.zonas) || [];
            for (const zid in zonas) (zonas[zid].inst || []).forEach(I => { if (I.modelo !== '${mod}') return;
              const d = (I.m.elements[12] - S.pos.x) ** 2 + (I.m.elements[14] - S.pos.z) ** 2; if (d < dm) { dm = d; mejor = I; } });
            if (!mejor) return 'sin ' + '${mod}';
            const ix = mejor.m.elements[12], iz = mejor.m.elements[14];
            let y = 0; try { y = G.terreno.height(ix, iz); } catch (e) {}
            const ang = Math.random() * 6.28;
            S.pos.x = ix + Math.sin(ang) * 7; S.pos.y = y + 2.5; S.pos.z = iz + Math.cos(ang) * 7;
            try { const M = G.fisica.MOVE; M.flying = false; M.posado = ''; M.grounded = true; M.speed = 0; } catch (e) {}
            G.camara.yaw = Math.atan2(ix - S.pos.x, iz - S.pos.z); G.camara.place(true);
            if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); if (ST.terminar) await ST.terminar(); }
            await sleep(1500); return 'ok'; })()`, 120);
          await evaluar(cdp, ses, MEDIR_JS, 30);
          await cdp.bombear(2.5);
          await medirFase(ses, v.id, 'cerca_' + mod);
        } catch (e) { console.log(`  · cerca_${mod}: ERROR ${e.message}`); }
      }
    }
  }

  // --- regresiones: streamingTest y lookTest ---
  for (const prueba of SOLO_ALDEAS ? [] : ['streamingTest', 'lookTest']) {
    try {
      const { ses } = await nuevaPestana();
      await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&calidad=alto` }, ses);
      if (!(await esperarListo(ses))) { resultado.pruebas[prueba] = 'no arrancó'; continue; }
      const prep = await evaluar(cdp, ses, CFG.preparar_js, 300);
      if (!String(prep).startsWith('ok')) { resultado.pruebas[prueba] = 'preparar falló'; continue; }
      const r = await evaluar(cdp, ses, `(async () => { await (window.AV.G.mundo && window.AV.G.mundo.listo); await new Promise(r2 => setTimeout(r2, 3000)); const R = await AV.${prueba}(); return JSON.stringify(R && R.resumen ? R.resumen : R); })()`, 600);
      resultado.pruebas[prueba] = JSON.parse(r);
      console.log(`  · ${prueba}:`, r.slice(0, 300));
    } catch (e) { resultado.pruebas[prueba] = 'ERROR ' + e.message; console.log(`  · ${prueba}: ERROR ${e.message}`); }
  }

  fs.writeFileSync(path.join(SALIDA, 'resultados.json'), JSON.stringify(resultado, null, 1));
  console.log(`· listo → ${path.join(SALIDA, 'resultados.json')}`);
  // cierre limpio de toda la flota: Browser.close por CDP y señal directa como respaldo
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { /* ya cerrado */ }
  try { chrome.kill(); } catch (e) { /* ya murió */ }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
