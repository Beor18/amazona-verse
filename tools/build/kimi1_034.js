// KIMI-034: composición honesta de la flora por banda y tipo (malla cerca/lejos vs lod) y por calidad.
// Replica el reparto de vegetacion.js leyendo las InstancedMesh `flora:<modelo>:<tipo>[:sombra|:lod]` de la escena:
// la cuenta `trisArboles` histórica NO suma la banda medio; aquí se suma todo (ver fila KIMI-021).
// Uso: node tools/build/kimi1_034.js [--calidades medio,alto] [--etiqueta x] [--capturas]
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi034');
const ANCHO = 1600, ALTO = 900;
const argv = process.argv.slice(2);
const ETIQUETA = (argv.includes('--etiqueta') ? argv[argv.indexOf('--etiqueta') + 1] : 'r1').replace(/[^\w-]/g, '');
const CAPTURAS = argv.includes('--capturas');
const CALIDADES = (argv.includes('--calidades') ? argv[argv.indexOf('--calidades') + 1] : 'medio,alto').split(',');
// Vistas ancla ya usadas en rondas anteriores (kimi1_013_ronda / kimi1_qa021): x, z, yaw (0 = −z), alzar.
const VISTAS = [
  { id: 'ciudad', x: -20, z: -133, yaw: Math.PI, alzar: 2 },
  { id: 'ciudad_aerea', x: -33, z: -136, yaw: Math.PI * 0.9, alzar: 30 },
  { id: 'meseta', x: -40, z: -131, yaw: Math.PI, alzar: 8 },
  { id: 'bahia', x: 150, z: 218, yaw: 0, alzar: 4 },
  { id: 'ruinas_yunque', zona: true, yaw: Math.PI, alzar: 2 },
];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + '<script src="tests/qa/qa.js" charset="utf-8"></script>'), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: m, params: p || {}, sessionId: s })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function ev(cdp, ses, exp, t, aw) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, returnByValue: true, awaitPromise: aw !== false }, ses, (t || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
}
// QA-111: semilla de partida cap1 (válida, sin creador) — misma que tools/build/kimi2_empezar.js
const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'el creador no tiene Empezar (#p-save)';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok'; })()`;
// Una toma: teleport + asentar (re-ancla 6×0,5 s), dump de mallas flora:* + stats + fps de 2 s + captura opcional.
const TOMA_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G, S = G.S;
  const P = ${'$PAYLOAD'};
  if (P.zona) { const ST0 = G.mundo.streaming; let z = null, n = -1; for (const id in ST0.zonas) { const zz = ST0.zonas[id]; const inst = zz.inst ? zz.inst.length : 0; if (inst > n) { n = inst; z = zz; } } if (!z) return JSON.stringify({ error: 'sin zonas' }); P.x = z.cx; P.z = z.cz + Math.min(z.r, 40) + 6; }
  AV.teleport(P.x, P.z, 0, -1); S.vy = 0; if (G.fisica && G.fisica.MOVE) G.fisica.MOVE.flying = true;
  const ST = G.mundo && G.mundo.streaming;
  for (let i = 0; i < 6; i++) { await sleep(500); S.pos.x = P.x; S.pos.z = P.z; S.vy = 0; if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(P.yaw); }
  if (ST) { if (ST.alrededor) await ST.alrededor(S.pos.x, S.pos.z); }
  S.pos.x = P.x; S.pos.z = P.z; S.vy = 0; if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(P.yaw);
  if (P.alzar) { const y0 = (G.terreno && G.terreno.height ? G.terreno.height(P.x, P.z) : S.pos.y) + P.alzar; S.pos.y = y0; }
  await sleep(500); S.pos.x = P.x; S.pos.z = P.z; S.vy = 0; if (AV.debug && AV.debug.camYaw) AV.debug.camYaw(P.yaw);
  const raf = () => new Promise(r => requestAnimationFrame(r));
  await raf(); await raf();
  const flora = [];
  G.renderer.scene.traverse(o => {
    if (!o.name || o.name.indexOf('flora:') !== 0 || !o.isInstancedMesh) return;
    if (!o.visible || !o.count) return;
    const geo = o.geometry, n = (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
    const partes = o.name.split(':');
    flora.push({ nombre: o.name, modelo: partes[1], tipo: partes[2], banda: partes[3] || 'lejos', instancias: o.count, geoTris: Math.round(n), tris: Math.round(n * o.count) });
  });
  let cuadros = 0; const t0 = performance.now();
  const tick = () => { cuadros++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); };
  requestAnimationFrame(tick); await sleep(2100);
  const st = G.renderer.stats();
  const png = ${CAPTURAS} ? await G.renderer.snapshot(${ANCHO}, ${ALTO}, 0.9) : null;
  // conteo por banda según distancia al jugador (replica del reparto del módulo): la corteza del medio
  // hoy dibuja geometría completa (sinLod va dentro de la malla lejos): cuánto se ahorraría al decimarla.
  const veg = G.vegetacion.stats ? G.vegetacion.stats() : null;
  const porModelo = G.vegetacion.instancias || {};
  const geoCorteza = {};
  for (const f of flora) if (f.banda === 'lejos' && f.tipo && !(f.modelo in geoCorteza)) geoCorteza[f.modelo] = f.geoTris;
  let instMedio = 0, trisMedioCorteza = 0;
  if (veg && veg.dArbol) {
    const maxArb = veg.dArbol, lodMax = veg.dLod || veg.dArbol, cx2 = S.pos.x, cz2 = S.pos.z;
    for (const m in porModelo) { const P = porModelo[m]; if (!P || !P.pos || !P.n) continue; let medio = 0;
      for (let i = 0; i < P.n; i++) { const dx = P.pos[i * 4] - cx2, dz = P.pos[i * 4 + 2] - cz2, d = Math.sqrt(dx * dx + dz * dz); if (d > maxArb && d <= lodMax) medio++; }
      instMedio += medio; trisMedioCorteza += medio * (geoCorteza[m] || 0); }
  }
  return JSON.stringify({ pos: { x: +S.pos.x.toFixed(1), y: +S.pos.y.toFixed(1), z: +S.pos.z.toFixed(1) }, fps: Math.round(cuadros / 2), stats: st, flora, veg, instMedio, trisMedioCorteza, png }); })()`;
async function lanzar() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1x-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', `--window-size=${ANCHO},${ALTO}`];
  const c = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let e0 = null; c.on('error', e => { e0 = e; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { c, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    if (e0) throw new Error('spawn: ' + e0.message);
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('sin DevToolsActivePort');
}
(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  const resultado = { etiqueta: ETIQUETA, ancho: ANCHO, alto: ALTO, calidades: {} };
  let proc = null, perfil = null, srv = null;
  try {
  const s0 = await servir(); srv = s0.srv; const origen = `http://127.0.0.1:${s0.puerto}`;
  const l0 = await lanzar(); proc = l0.c; perfil = l0.perf;
  const ws = new WebSocket(`ws://127.0.0.1:${l0.puerto}${l0.wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const { sessionId: ses } = await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true });
  await cdp.call('Page.enable', {}, ses);
  await cdp.call('Runtime.enable', {}, ses);
  for (const calidad of CALIDADES) {
    console.log(`· calidad ${calidad}`);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_SAVE_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1&mapa=real&calidad=${calidad}` }, ses);
    const CFG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools/build/config.json'), 'utf8')).pruebas;
    { const t0 = Date.now(); let ok = false; while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) {} await cdp.bombear(0.5); } console.log('  listo:', ok); }
    console.log('  preparar:', String(await ev(cdp, ses, PREPARAR_JS, 300)).slice(0, 60));
    for (let i = 0; i < 240; i++) { try { if ((await ev(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.streaming && Object.keys(AV.G.mundo.streaming.zonas).length)`, 10, false)) === true) break; } catch (e) {} await cdp.bombear(1); }
    await ev(cdp, ses, `(async () => { const s = ms => new Promise(r => setTimeout(r, ms)); if (AV.G.mundo.listo) await AV.G.mundo.listo; if (AV.G.mundo.streaming.listo) await AV.G.mundo.streaming.listo; if (AV.G.mundo.streaming.terminar) await AV.G.mundo.streaming.terminar(); await s(1500); return 'ok'; })()`, 300);
    const vistas = {};
    for (const v of VISTAS) {
      const m = JSON.parse(await ev(cdp, ses, TOMA_JS.replace('$PAYLOAD', JSON.stringify(v)), 240));
      if (m.error) { console.log('  ', v.id, 'ERROR', m.error); continue; }
      const png = m.png; delete m.png;
      vistas[v.id] = m;
      const porBanda = {};
      for (const f of m.flora) { const k = f.banda + ':' + f.tipo; porBanda[k] = (porBanda[k] || 0) + f.tris; }
      const trisLod = (porBanda['lod:corteza'] || 0) + (porBanda['lod:hoja'] || 0) + (porBanda['lod:roca'] || 0);
      const trisTotal = m.flora.reduce((a, f) => a + f.tris, 0);
      console.log(`  ${v.id}: ${m.stats.calls} calls · ${(m.stats.triangulos / 1e6).toFixed(2)} M tris · fps ${m.fps} · flora ${m.flora.length} mallas · tris flora ${Math.round(trisTotal / 1e3)} k (lod ${Math.round(trisLod / 1e3)} k) · medio ${m.instMedio} inst → corteza lod ${Math.round((m.trisMedioCorteza || 0) / 1e3)} k`);
      console.log('    por banda:', JSON.stringify(porBanda));
      if (png && CAPTURAS) fs.writeFileSync(path.join(SALIDA, `k034_${ETIQUETA}_${calidad}_${v.id}.jpg`), Buffer.from(png.includes(',') ? png.split(',')[1] : png, 'base64'));
    }
    resultado.calidades[calidad] = { vistas, consola: await ev(cdp, ses, `(window.__erroresConsola || []).join(' | ')`, 5).catch(() => '(sin hook)') || '0 errores' };
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: 'try { localStorage.clear(); } catch(e){}' }, ses);
  }
  const arch = path.join(SALIDA, `k034_${ETIQUETA}.json`);
  fs.writeFileSync(arch, JSON.stringify(resultado, null, 2));
  console.log('· JSON:', path.relative(RAIZ, arch));
  for (const calidad of CALIDADES) console.log(`· consola (${calidad}):`, resultado.calidades[calidad].consola);
  } finally {
    try { proc && proc.kill('SIGKILL'); } catch (e) {}
    await new Promise(r => setTimeout(r, 800));
    try { if (perfil) spawn('cmd', ['/c', 'rd', '/s', '/q', perfil.replace(/\//g, '\\')], { stdio: 'ignore', detached: true }); } catch (e) {}
    try { srv && srv.close(); } catch (e) {}
  }
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
