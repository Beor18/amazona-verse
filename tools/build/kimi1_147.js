#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-147: confirmación con GPU real de las estructuras
   pegadas al agua tras el arreglo de la nube (acotada por Kelvin 6-nov: no reexportar ni cambiar
   modelos; solo mirar y fotografiar):
     - muelle y bahía de Villa Raíz (cap1; QA-109)
     - muelle tablado oeste del río (ep3; QA-107, reubicado a (155.5, 206.5))
     - campamento del río con toldo y empalizada (ep6; QA-108)
     - Puerto de La Mina (cap1 + ?v18=1; máquina en obra y reconvertida tras reparar)
   Por cada escenario y calidad: navegación fresca con semilla, teleport, asentado, foto,
   draw calls/tris/fps y volcado de mallas del radio con terreno vs nivel del agua.

   Uso: node tools/build/kimi1_147.js [--solo id1,id2] [--calidades bajo,medio,alto] [--etiqueta r1]
*/
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
const SOLO = arg('--solo', '').split(',').filter(Boolean);
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi147');
const ANCHO = 1600, ALTO = 900;
fs.mkdirSync(SALIDA, { recursive: true });

const ESCENARIOS = [
  { id: 'cap1_muelle_bahia', pack: 'cap1', px: 150, pz: 222, alt: 5, mx: 157, mz: 230, radio: 42,
    calidades: ['bajo', 'medio', 'alto'], nota: 'bahía y muelle de Villa Raíz desde el agua (QA-109; cam (150,222) mirando orilla)' },
  { id: 'cap1_muelle_aerea', pack: 'cap1', px: 170, pz: 212, alt: 24, mx: 156, mz: 222, radio: 42,
    calidades: ['medio'], nota: 'muelle de Villa Raíz y bahía desde el aire' },
  { id: 'ep3_muelle_oeste', pack: 'ep3', px: 150, pz: 208, alt: 6, mx: 189, mz: 186, radio: 42,
    calidades: ['bajo', 'medio', 'alto'], nota: 'muelle tablado oeste del río (QA-107: pieza en (155.5, 206.5), z 202.5..210.5)' },
  { id: 'ep6_campamento', pack: 'ep6', px: 36, pz: -50, alt: 6, mx: 60, mz: -58, radio: 85,
    calidades: ['bajo', 'medio', 'alto'], nota: 'campamento del río: toldo amarillo (taller) y empalizada reubicada (QA-108 en (92.4, -47.3))' },
  { id: 'v18_puerto_maq', pack: 'cap1', v18: true, mundo: { puente_villa: 'reparado', puerto_mina: 'obra' },
    px: 71, pz: -71, alt: 7, mx: 76.3, mz: -75.2, radio: 48, calidades: ['bajo', 'medio'],
    nota: 'Puerto de La Mina con la máquina trabando la escalera (obra; SITIO.plaza (73.6, -75.2))' },
  { id: 'v18_puerto_reparado', pack: 'cap1', v18: true, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado' },
    px: 71, pz: -71, alt: 7, mx: 76.3, mz: -75.2, radio: 48, calidades: ['bajo', 'medio'],
    nota: 'Puerto de La Mina reconstruido (máquina reconvertida, rampas, faroles)' },
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

// Semilla por pack (mismo convenio que kimi1_127: clave y versión del guardado por pack).
function semillaSave(pack, v18, mundo) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save';
  const v = pack === 'cap1' ? 6 : 1;
  const save = {
    v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1k147-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  };
  if (pack !== 'cap1') { save.lugares = []; save.canoa = null; save.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null }; }
  const progresoV18 = { v: 2, especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: mundo || {}, sel: 'vittata', evo: {} };
  return `try {
  localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem(${JSON.stringify(clave)}, ${JSON.stringify(JSON.stringify(save))});
  ${v18 ? `localStorage.setItem('amazonaverse.v18', ${JSON.stringify(JSON.stringify(progresoV18))});` : ''}
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

// Carga manual de la cadena del puerto V18 (el gesto alPrimerGesto no dispara en headless; kimi1_124).
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

const TELEFOTO_JS = `(async (px, pz, alt, mx, mz, radio) => { try { return await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + alt; S.vy = 0;
  if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.flying = true; G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; }
  const yaw = Math.atan2(-(mx - px), -(mz - pz));
  G.camara.yaw = yaw; S.facing = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  const ST = G.mundo && G.mundo.streaming;
  if (ST) { if (ST.alrededor) await ST.alrededor(px, pz); if (ST.terminar) await ST.terminar(); }
  if (G.solidos && G.solidos.terminar) G.solidos.terminar();
  await sleep(2500);
  G.camara.yaw = yaw; if (G.camara.place) G.camara.place(true);
  await sleep(600);
  const R = G.renderer;
  if (R.drawScene) R.drawScene(R.camera);
  await sleep(300);
  const st = R.stats ? R.stats() : {};
  const med = (AV.look && AV.look.medir) ? AV.look.medir() : null;
  // volcado de mallas del radio con terreno vs nivel de agua
  const MAR = G.agua && G.agua.levelAt ? G.agua.levelAt(px, pz) : null;
  const out = [];
  R.scene.traverse(o => {
    if (!o.isMesh) return;
    const p = o.getWorldPosition(new THREE.Vector3());
    const dx = p.x - px, dz = p.z - pz;
    if (dx * dx + dz * dz > radio * radio) return;
    let q = o; const nombres = []; while (q) { if (q.name) nombres.push(q.name); q = q.parent; }
    o.geometry.computeBoundingBox && o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    const tam = bb ? [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map(v => Math.round(v * 100) / 100) : null;
    out.push({ n: o.name || '(anon)', cadena: nombres.join('<'), pos: [Math.round(p.x * 10) / 10, Math.round(p.y * 100) / 100, Math.round(p.z * 10) / 10],
      tam, terra: Math.round((G.terreno.height ? G.terreno.height(p.x, p.z) : NaN) * 100) / 100 });
  });
  out.sort((a, b) => a.pos[2] - b.pos[2]);
  return JSON.stringify({ pos: [Math.round(S.pos.x * 10) / 10, Math.round(S.pos.y * 100) / 100, Math.round(S.pos.z * 10) / 10],
    mar: MAR != null ? Math.round(MAR * 100) / 100 : null,
    stats: { calls: st.calls != null ? st.calls : null, ktris: st.triangulos != null ? Math.round(st.triangulos / 1000) : null, fps: st.fps != null ? Math.round(st.fps) : null, dpr: st.dpr != null ? Math.round(st.dpr * 100) / 100 : null },
    med: med ? { calls: med.calls, triangulos: med.triangulos, texturasMB: med.texturasMB, geometrias: med.geometrias, heapMB: med.heapMB, fps: med.fps } : null,
    nMallas: out.length, mallas: out.slice(0, 120),
    errores: (window.__erroresConsola || []).slice(0, 10) }); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1k147-'));
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

async function paginaFresca(cdp, semilla, url) {
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
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
  const { chrome, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const resumen = { etiqueta: ETIQUETA, pantalla: `escritorio ${ANCHO}x${ALTO}@1 cpuX1`, head: null, escenarios: {} };
  try {
    for (const esc of lista) {
      resumen.escenarios[esc.id] = { nota: esc.nota, calidades: {} };
      for (const calidad of (arg('--calidades', '') ? arg('--calidades', '').split(',') : esc.calidades)) {
        const url = `${origen}/index.html?pack=${esc.pack}&mapa=real&calidad=${calidad}${esc.v18 ? '&v18=1' : '&v18=0'}`;
        console.log(`· ${esc.id} [${calidad}] navegando…`);
        const { ses, tid } = await paginaFresca(cdp, semillaSave(esc.pack, esc.v18, esc.mundo), url);
        if (!await esperaListo(cdp, ses)) { console.log(`  !! el juego no arrancó en ${esc.id}/${calidad}`); resumen.escenarios[esc.id].calidades[calidad] = { error: 'no listo' }; continue; }
        const entro = await evaluar(cdp, ses, ENTRAR_JS, 120);
        if (typeof entro === 'string' && entro.indexOf('ERR') === 0) { console.log('  !! entrar: ' + entro); resumen.escenarios[esc.id].calidades[calidad] = { error: entro }; continue; }
        if (esc.v18) {
          const cargo = await evaluar(cdp, ses, CARGA_V18_JS, 120);
          console.log('  · v18: ' + cargo);
          if (typeof cargo === 'string' && cargo.indexOf('ERR') === 0) { resumen.escenarios[esc.id].calidades[calidad] = { error: cargo }; continue; }
        }
        const datos = JSON.parse(await evaluar(cdp, ses, `(${TELEFOTO_JS})(${esc.px}, ${esc.pz}, ${esc.alt}, ${esc.mx}, ${esc.mz}, ${esc.radio})`, 180));
        await cdp.bombear(0.4);
        const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
        const f = path.join(SALIDA, `k147_${ETIQUETA}_${esc.id}_${calidad}.jpg`);
        fs.writeFileSync(f, Buffer.from(shot.data, 'base64'));
        resumen.escenarios[esc.id].calidades[calidad] = Object.assign({ foto: path.basename(f) }, datos);
        console.log(`  · foto ${path.basename(f)} · calls=${datos.stats.calls} ktris=${datos.stats.ktris} mar=${datos.mar} mallas=${datos.nMallas}` + (datos.errores && datos.errores.length ? ' · ERRORES: ' + datos.errores.join(' | ') : ' · 0 errores'));
        try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { }
      }
    }
  } finally {
    resumen.head = await new Promise(r => { exec('git -C "' + RAIZ + '" rev-parse --short HEAD', (e, so) => r((so || '').trim())); });
    const js = path.join(SALIDA, `k147_${ETIQUETA}.json`);
    fs.writeFileSync(js, JSON.stringify(resumen, null, 1));
    console.log('· resumen ' + js);
    try { chrome.kill(); } catch (e) { }
    srv.close();
  }
  process.exit(0);
})().catch(e => { console.error('ERROR ' + e.message); process.exit(1); });
