#!/usr/bin/env node
/* Amazona Verse · Kimi 2 — KIMI-208: horneado del splat global del terreno (cap. 1).
   Corre el juego (worktree, GPU real), espera a que los 4 trozos del terreno carguen y la rejilla
   exacta (TG) esté lista, y muestrea G.terreno.splatAt en una rejilla de 2 m sobre todo el mapa
   (el splat ya lleva las plazas pintadas: pintarPlazas corre al cargar cada trozo, antes de TG).
   Escribe assets/data/mapa_cap1_splat.js:
     window.AV_MAPA_CAP1_SPLAT = { nx, nz, x0, z0, paso, s: '<base64 rgba 0..255>', c: '<base64 bitmask cobertura>' }
   La vegetación lo consume (KIMI-208) para decidir sinSuelo/pasto con datos del terreno COMPLETO,
   independientes de qué trozos estén cargados (reintento de la palanca KIMI-203).
   Uso: node tools/build/kimi2_k208_horneasplat.js [--salida assets/data/mapa_cap1_splat.js]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.resolve(RAIZ, arg('--salida', 'assets/data/mapa_cap1_splat.js'));
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon' };
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); this.onEvent = null;
    ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); };
    ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } else if (d.method && this.onEvent) this.onEvent(d); }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, (s || 0.3) * 1000)); }
}
async function ev(cdp, ses, expr, t) {
  const r = await cdp.call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ses, (t || 20) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result.value;
}

function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k208-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=500,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  return new Promise((res, rej) => {
    let vueltas = 0;
    const iv = setInterval(() => {
      if (fs.existsSync(puertoFile)) {
        const l = fs.readFileSync(puertoFile, 'utf8').split('\n');
        if (l.length > 1 && l[1].trim()) { clearInterval(iv); return res({ chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }); }
      }
      if (++vueltas > 300) { clearInterval(iv); rej(new Error('Chrome no abrió DevTools: ' + err.slice(0, 200))); }
    }, 200);
  });
}

// partida sembrada de cap1 (misma semilla que kimi2_k203_smoke): entra directo sin creador
const SEMILLA = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: 134, z: 182.5, y: 5.24 }, facing: { x: 0, z: -1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;

// Muestreo completo: corre dentro de la página con trozos de 512 filas para no bloquear el hilo
const MUESTREO = `(() => { const G = window.AV && AV.G; if (!G || !G.terreno) return { error: 'sin terreno' };
  const T = G.terreno, M = T.mapa && T.mapa.tamano; if (!M) return { error: 'sin mapa' };
  if (!T.exacto) return { error: 'TG no listo' };
  const paso = 2, nx = Math.round(M.ancho / paso) + 1, nz = Math.round(M.largo / paso) + 1;
  const n = nx * nz;
  const bytes = new Uint8Array(n * 4), cov = new Uint8Array(Math.ceil(n / 8));
  const h16 = new Uint16Array(n), ny8 = new Uint8Array(n);
  let hechos = 0, cubiertos = 0;
  return new Promise(resuelve => {
    function tanda() {
      const tope = Math.min(n, hechos + 32768);
      for (; hechos < tope; hechos++) {
        const ix = hechos % nx, iz = (hechos / nx) | 0;
        const x = M.x0 + ix * paso, z = M.z0 + iz * paso;
        const sp = T.splatAt(x, z);
        if (!sp) continue;
        cubiertos++;
        cov[hechos >> 3] |= 1 << (hechos & 7);
        h16[hechos] = Math.round(Math.max(-12, Math.min(103, T.height(x, z))) / 115 * 65535);
        ny8[hechos] = Math.round(Math.max(0, Math.min(1, T.normalAt(x, z).y)) * 255);
        const o = hechos * 4;
        bytes[o] = Math.round(Math.max(0, Math.min(1, sp[0])) * 255);
        bytes[o + 1] = Math.round(Math.max(0, Math.min(1, sp[1])) * 255);
        bytes[o + 2] = Math.round(Math.max(0, Math.min(1, sp[2])) * 255);
        bytes[o + 3] = Math.round(Math.max(0, Math.min(1, sp[3])) * 255);
      }
      if (hechos < n) { setTimeout(tanda, 0); return; }
      let s = '', c = '', hh = '', nn = '';
      for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)));
      for (let i = 0; i < cov.length; i += 8192) c += String.fromCharCode.apply(null, cov.subarray(i, Math.min(i + 8192, cov.length)));
      for (let i = 0; i < h16.length; i += 4096) hh += String.fromCharCode.apply(null, new Uint8Array(h16.buffer, i * 2, Math.min(4096, h16.length - i) * 2));
      for (let i = 0; i < ny8.length; i += 8192) nn += String.fromCharCode.apply(null, ny8.subarray(i, Math.min(i + 8192, ny8.length)));
      resuelve({ nx, nz, x0: M.x0, z0: M.z0, paso, cubiertos, total: n, s: btoa(s), c: btoa(c), h: btoa(hh), n8: btoa(nn) });
    }
    tanda();
  });
})()`;

(async () => {
  const res = { head: require('child_process').execSync('git rev-parse --short HEAD', { cwd: RAIZ, encoding: 'utf8' }).trim(), consola: [] };
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const chromeL = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${chromeL.puerto}${chromeL.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  cdp.onEvent = d => {
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') res.consola.push(d.params.entry.text.slice(0, 200));
    if (d.method === 'Runtime.exceptionThrown') res.consola.push('EXC: ' + JSON.stringify(d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text).slice(0, 300));
  };
  const limpiar = () => { try { chromeL.chrome.kill(); } catch (e) {} try { fs.rmSync(chromeL.perf, { recursive: true, force: true }); } catch (e) {} srv.close(); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA }, ses);
    await cdp.call('Page.navigate', { url: origen + '/index.html?qa=1&cap=1&v18=0' }, ses);
    // carga los 4 trozos de una vez (con el terreno por cercanía el spawn solo baja el suyo) y
    // espera la rejilla exacta completa: muestrear antes da una rejilla parcial — error real de la
    // primera hornada de KIMI-208 (NE solo), detectado por la sonda kimi2_k208_splatprobe. El
    // cargarTodo se repite en cada vuelta hasta que el módulo existe (a veces aún no está al navegar).
    let listo = false;
    for (let i = 0; i < 280 && !listo; i++) {
      await cdp.bombear(0.5);
      try { listo = await ev(cdp, ses, `(() => { const G = window.AV && AV.G; if (!G || !G.terreno) return false; if (G.terreno.cargarTodo) G.terreno.cargarTodo(); const trozos = (G.terreno.mapa && G.terreno.mapa.terreno && G.terreno.mapa.terreno.trozos || []).length; return G.terreno.exacto && G.terreno.chunks.length >= Math.max(1, trozos); })()`, 8); } catch (e) {}
    }
    res.exacto = listo;
    if (!listo) throw new Error('los 4 trozos del terreno no quedaron cargados en 75 s');
    await cdp.bombear(1.5); // asienta la última reconstrucción de la rejilla (cola serial)
    const m = await ev(cdp, ses, MUESTREO, 120);
    if (m.error) throw new Error('muestreo: ' + m.error);
    res.muestreo = { nx: m.nx, nz: m.nz, paso: m.paso, cubiertos: m.cubiertos, total: m.total };    // chequeo por cuadrantes: con el terreno completo ninguno puede quedar vacío (la hornada
    // rota de KIMI-208 dio NE 14 030 / NO,SO,SE 0 y pasó el chequeo de total)
    const covB = Buffer.from(m.c, 'base64');
    const med = Math.floor(m.nx / 2);
    const H = (ix, iz) => (covB[(ix + iz * m.nx) >> 3] >> ((ix + iz * m.nx) & 7)) & 1;
    const cuad = [[0, 0], [med, 0], [0, med], [med, med]].map(([ox, oz]) => {
      let c = 0; for (let iz = oz; iz < oz + med; iz++) for (let ix = ox; ix < ox + med; ix++) if (H(ix, iz)) c++; return c;
    });
    res.cuadrantes = { NO: cuad[0], NE: cuad[1], SO: cuad[2], SE: cuad[3] };
    if (Math.min(...cuad) < 0.2 * Math.max(...cuad)) throw new Error('cobertura desigual entre cuadrantes (¿terreno parcial?): ' + JSON.stringify(res.cuadrantes));
    const js = '// Generado por tools/build/kimi2_k208_horneasplat.js (KIMI-208). Splat, altura y normal-Y del terreno del Cap. 1\n'
      + '// muestreados de la malla final (rejilla 2 m, con las plazas pintadas), para decisiones de siembra\n'
      + '// independientes de los trozos cargados: el layout de flora es el mismo en sesión nueva y con terreno completo.\n'
      + '// s = RGBA pasto/tierra/roca/arena (0..255); c = bitmask de cobertura (1 = hay malla);\n'
      + '// h = altura Uint16 LE (-12..103 m); n8 = normal-Y (0..255 → 0..1). n2 y n8: claves cortas para achicar el archivo.\n'
      + '(function () {\n'
      + `window.AV_MAPA_CAP1_SPLAT = ${JSON.stringify({ nx: m.nx, nz: m.nz, x0: m.x0, z0: m.z0, paso: m.paso, s: m.s, c: m.c, h: m.h, n8: m.n8 }, null, 0).replace(/"([a-z0-9]+)":"([A-Za-z0-9+/=]+)"/g, '$1:"$2"')};\n`
      + '})();\n';
    fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
    fs.writeFileSync(SALIDA, js);
    res.salida = path.relative(RAIZ, SALIDA);
    res.bytes = fs.statSync(SALIDA).size;
    res.ok = !res.consola.length && m.cubiertos > 0;
  } catch (e) { res.fallo = String(e && e.stack || e).slice(0, 500); }
  console.log(JSON.stringify(res, null, 2));
  limpiar();
  process.exit(res.ok ? 0 : 1);
})();
