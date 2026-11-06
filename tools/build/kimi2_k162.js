#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-162: conectar la máquina nueva del puerto (BM165).
   A/B visual en el juego real con GPU real:
     --modelo 1 (defecto): puerto.js actual (carga maquina_puerto.glb en diferido y lo monta)
     --modelo 0: bloquea *maquina_puerto* por CDP → loadGLB falla → quedan las primitivas (el «antes»)
   Escenarios (semilla v18, mapa real, ?v18=1, escritorio 1600×900):
     - maq_obra:       puerto_mina='obra'      → estado Bloqueando_* (naranja, humo, alarma)
     - maq_reparado:   puerto_mina='reparado'  → estado Reconvertida_* (verde, maceta, farol)
   Por cada uno: teleport junto a la máquina (posición leída del propio gMaq), espera de la montura
   del GLB (o su ausencia en --modelo 0), asentado, foto, calls/tris vía look.medir, nº de mallas
   visibles de la máquina y errores de consola. Uso:
     node tools/build/kimi2_k162.js [--modelo 0|1] [--solo maq_obra,maq_reparado] [--etiqueta r1] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'r1');
const MODELO = arg('--modelo', '1') !== '0';
const SOLO = arg('--solo', '').split(',').filter(Boolean);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi162');
const ANCHO = 1600, ALTO = 900;
fs.mkdirSync(SALIDA, { recursive: true });

const ESCENARIOS = [
  { id: 'maq_obra', mundo: { puente_villa: 'reparado', puerto_mina: 'obra' },
    camDx: -4.8, camDz: -3.4, alt: 3.0, nota: 'perforadora trabando la subida (estado Bloqueando)' },
  { id: 'maq_reparado', mundo: { puente_villa: 'reparado', puerto_mina: 'reparado' },
    camDx: -4.2, camDz: -4.4, alt: 3.0, nota: 'máquina reconvertida (estado Reconvertida: maceta, flores, farol)' },
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
  if (r.exceptionDetails) { const d = r.exceptionDetails; throw new Error('JS@' + (d.lineNumber != null ? d.lineNumber + ':' + d.columnNumber : '?') + ': ' + JSON.stringify(d.exception && d.exception.description || d.text).slice(0, 900)); }
  return r.result ? r.result.value : undefined;
}

function semillaSave(mundo) {
  const save = {
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi2k162-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  const progresoV18 = { v: 2, especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: mundo || {}, sel: 'vittata', evo: {} };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', ${JSON.stringify(JSON.stringify(save))});
  localStorage.setItem('amazonaverse.v18', ${JSON.stringify(JSON.stringify(progresoV18))});
} catch (e) {}`;
}

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (b) { b.click(); await espera(() => !t.open, 5000); } }
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

const CARGA_V18_JS = `(async () => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
  const asegurar = (src, glob) => new Promise((res, rej) => { if (window[glob]) return res(); const s = document.createElement('script'); s.src = src; s.onload = () => window[glob] ? res() : rej(new Error(glob + ' sin global')); s.onerror = () => rej(new Error('404 ' + src)); document.head.appendChild(s); });
  await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); window.AVV18Progreso(G);
  await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); window.AVV18Habilidades(G);
  await Promise.all([asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'), asegurar('content/comun/personajes_v18.js', 'AV_NPC_V18')]);
  window.AVV18Fx(G);
  await asegurar('src/game/v18/npc.js', 'AVV18Npc'); window.AVV18Npc(G);
  await asegurar('src/game/v18/puerto.js', 'AVV18Puerto'); window.AVV18Puerto(G);
  if (!await espera(() => G.v18puerto && G.v18puerto.estado, 30000)) return 'ERR v18puerto sin cargar';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  await espera(() => G.mundo && G.mundo.listo, 60000);
  await sleep(1500);
  return 'ok puerto estado=' + G.v18puerto.estado(); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

// Teleport a la máquina (posición leída del propio grupo 'v18-puerto-maquina'), cámara a 3/4 del frente
// (+X local, lado de la broca), espera de la montura del GLB, asentado, stats y foto.
const FOTO_MAQ_JS = `(async (camDx, camDz, alt, quiereGLB) => { try { return await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
  const gMaq = G.renderer.scene.getObjectByName('v18-puerto-maquina');
  if (!gMaq) return 'ERR sin grupo v18-puerto-maquina';
  if (!gMaq.visible) { // la misión no está activa en el estado guardado
    return 'ERR gMaq no visible (estado=' + (G.v18puerto.estado()) + ')';
  }
  const m = gMaq.getWorldPosition(new THREE.Vector3());
  const cx = m.x + camDx, cz = m.z + camDz;                       // posición de la cámara (mira a la máquina)
  const yaw = Math.atan2(-(m.x - cx), -(m.z - cz));
  const dl = Math.hypot(camDx, camDz) || 1, perp = { x: -camDz / dl, z: camDx / dl }; // perpendicular a la vista
  const vx = cx + perp.x * 3.4, vz = cz + perp.z * 3.4;           // Vittata desplazada del eje, para no tapar
  S.pos.x = vx; S.pos.z = vz; S.pos.y = G.terreno.height(vx, vz) + alt; S.vy = 0;
  if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.flying = true; G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; }
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(vx, vz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(2000);
  // la carga diferida de la máquina dispara al estar cerca: damos cuadros de sobra
  const hayGLB = () => !!G.renderer.scene.getObjectByName('v18-puerto-maquina-bm165');
  const okGLB = quiereGLB ? await espera(hayGLB, 15000) : !(await espera(hayGLB, 1500));
  try { if (G.dialogo && G.dialogo.clear) G.dialogo.clear(); } catch (e) { } // la charla de descubrir no debe tapar la foto
  try { if (G.ui && G.ui.hideToast) G.ui.hideToast(); } catch (e) { }
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await sleep(1200);
  try { if (G.ui && G.ui.hideToast) G.ui.hideToast(); } catch (e) { }
  const R = G.renderer;
  if (R.drawScene) R.drawScene(R.camera);
  await sleep(300);
  const st = R.stats ? R.stats() : {};
  const med = (AV.look && AV.look.medir) ? AV.look.medir() : null;
  let mallasMaq = 0; gMaq.traverse(o => { if (o.isMesh && o.visible) mallasMaq++; });
  let visibles = { bloq: 0, reco: 0 };
  gMaq.traverse(o => { if (!o.isMesh || !o.visible) return; if (o.name.indexOf('Bloqueando') === 0) visibles.bloq++; else if (o.name.indexOf('Reconvertida') === 0) visibles.reco++; });
  return JSON.stringify({ maq: [Math.round(m.x * 100) / 100, Math.round(m.z * 100) / 100], glb: hayGLB(), okGLB,
    estado: G.v18puerto.estado(), mallasMaq, visibles,
    diag: { cargando: !!(G.v18puerto.maq && G.v18puerto.maq.cargandoGLB), fallo: (G.v18puerto.maq && G.v18puerto.maq.glbFallo) || null, pintada: G.v18puerto.maq && G.v18puerto.maq.pintada },
    stats: { calls: st.calls != null ? st.calls : null, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, fps: st.fps != null ? Math.round(st.fps) : null },
    med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB, geometrias: med.geometrias, heapMB: med.heapMB, fps: med.fps } : null,
    errores: (window.__erroresConsola || []).slice(0, 10) }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k162-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    `--window-size=${ANCHO},${ALTO}`];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, puerto: parseInt(l[0], 10), wsPath: l[1].trim(), perf }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

async function paginaFresca(cdp, semilla, url, bloquear) {
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable', 'Network.enable']) await cdp.call(m, {}, ses);
  if (bloquear) await cdp.call('Network.setBlockedURLs', { urls: ['*maquina_puerto*'] }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semilla }, ses);
  await cdp.call('Page.navigate', { url }, ses);
  return { ses, tid };
}

const esperaListo = async (cdp, ses) => {
  const t0 = Date.now();
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
    try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) return true; } catch (e) { }
    await cdp.bombear(0.5);
  }
  return false;
};

(async () => {
  const lista = ESCENARIOS.filter(e => !SOLO.length || SOLO.includes(e.id));
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, puerto: puertoDev, wsPath, perf } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const resumen = { etiqueta: ETIQUETA, modelo: MODELO ? 'bm165-glb' : 'primitivas-bloqueo', pantalla: `escritorio ${ANCHO}x${ALTO}@1 cpuX1`, head: null, escenarios: {} };
  console.log(`· KIMI-162 A/B modelo=${MODELO ? 'GLB' : 'primitivas (bloqueado maquina_puerto)'} etiqueta=${ETIQUETA}`);
  try {
    for (const esc of lista) {
      resumen.escenarios[esc.id] = { nota: esc.nota };
      const url = `${origen}/index.html?pack=cap1&mapa=real&calidad=medio&v18=1`;
      console.log(`· ${esc.id} navegando…`);
      const { ses, tid } = await paginaFresca(cdp, semillaSave(esc.mundo), url, !MODELO);
      try {
        if (!await esperaListo(cdp, ses)) { console.log('  !! el juego no arrancó'); resumen.escenarios[esc.id].error = 'no listo'; continue; }
        const entro = await evaluar(cdp, ses, ENTRAR_JS, 120);
        if (typeof entro === 'string' && entro.indexOf('ERR') === 0) { console.log('  !! entrar: ' + entro); resumen.escenarios[esc.id].error = entro; continue; }
        const cargo = await evaluar(cdp, ses, CARGA_V18_JS, 120);
        console.log('  · v18: ' + cargo);
        if (typeof cargo === 'string' && cargo.indexOf('ERR') === 0) { resumen.escenarios[esc.id].error = cargo; continue; }
        const datos = await evaluar(cdp, ses, `(${FOTO_MAQ_JS})(${esc.camDx}, ${esc.camDz}, ${esc.alt}, ${MODELO})`, 120);
        if (typeof datos === 'string' && datos.indexOf('ERR') === 0) { console.log('  !! ' + datos); resumen.escenarios[esc.id].error = datos; continue; }
        resumen.escenarios[esc.id].datos = JSON.parse(datos);
        await cdp.bombear(0.4);
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, ses, 60000);
        const f = path.join(SALIDA, `k162_${ETIQUETA}_${esc.id}_${MODELO ? 'glb' : 'prim'}.jpg`);
        fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
        const d = resumen.escenarios[esc.id].datos;
        console.log(`  · foto ${path.basename(f)} · estado=${d.estado} glb=${d.glb} mallasMaq=${d.mallasMaq} (bloq=${d.visibles.bloq}/reco=${d.visibles.reco}) · calls=${d.stats.calls} ktris=${d.stats.ktris}` + (d.errores && d.errores.length ? ' · ERRORES: ' + d.errores.join(' | ') : ' · 0 errores'));
      } finally {
        try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { }
      }
    }
  } finally {
    resumen.head = await new Promise(r => { exec('git -C "' + RAIZ + '" rev-parse --short HEAD', (e, so) => r((so || '').trim())); });
    const js = path.join(SALIDA, `k162_${ETIQUETA}_${MODELO ? 'glb' : 'prim'}.json`);
    fs.writeFileSync(js, JSON.stringify(resumen, null, 1));
    console.log('· resumen ' + js);
    try { chrome.kill(); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  process.exit(0);
})().catch(e => { console.error('ERROR ' + e.message); process.exit(1); });
