#!/usr/bin/env node
/* QA-189 · repro real con GPU: la estación de minigolf solo se ofrece en Villa Raíz (cap. 1).
   Por cada pack abre ?pack=<p>&mapa=real&v18=1, entra, carga la cadena v18 del minigolf a mano
   (el gesto alPrimerGesto no dispara en headless; mismo truco que kimi1_124/147), teletransporta
   al punto del bug (ep4: spawn 191,165) o a la entrada de la estación (cap1: control) y sondea:
   interacción visible, piezas v18_golf_* visibles, marcador del minimapa, prompt de Acción e invitación.
   Uso: node tools/build/kimi1_qa189.js [--packs ep4,cap1] [--etiqueta r1] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { spawn, exec } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const PACKS = arg('--packs', 'ep4,cap1').split(',');
const ETIQUETA = arg('--etiqueta', 'r1');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi189'); fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function evaluar(cdp, ses, exp, timeoutS, promesa) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 500)); return r.result ? r.result.value : undefined; }
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q189-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; } await new Promise(r => setTimeout(r, 200)); }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 200));
}
function semillaSave(pack) {
  const clave = pack === 'cap1' ? 'amazonaverse.save' : pack + '.save', v = pack === 'cap1' ? 6 : 1;
  const save = { v, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1q189-' + Math.random().toString(36).slice(2, 10), profile: { created: true, name: 'Estrella de la Bahía', look: null }, pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0, inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {}, comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false } };
  if (pack !== 'cap1') { save.lugares = []; save.canoa = null; save.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null }; }
  const progresoV18 = { v: 2, especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {}, sel: 'vittata', evo: {} };
  return `try { localStorage.clear(); sessionStorage.clear();
  window.__erroresConsola = [];
  addEventListener('error', e => __erroresConsola.push(String(e.message || e)));
  addEventListener('unhandledrejection', e => __erroresConsola.push('rechazo: ' + (e.reason && e.reason.message || e.reason)));
  const cerr = console.error; console.error = function () { try { __erroresConsola.push([].map.call(arguments, String).join(' ').slice(0, 300)); } catch (e) {} return cerr.apply(this, arguments); };
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem(${JSON.stringify(clave)}, ${JSON.stringify(JSON.stringify(save))});
  localStorage.setItem('amazonaverse.v18', ${JSON.stringify(JSON.stringify(progresoV18))});
  } catch (e) {}`;
}
const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title'); if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (b) { b.click(); await espera(() => !t.open, 5000); } }
  const S = window.AV && window.AV.state; if (!S) return 'sin AV.state';
  if (!await espera(() => S.profile && S.profile.created, 45000)) return 'sin perfil';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 60000);
  const b = document.getElementById('c1-saltar'); if (b) b.click(); await sleep(800);
  const f = document.getElementById('c1-fade'); if (f) f.remove();
  if (AV.G.ui && AV.G.ui.hideToast) AV.G.ui.hideToast();
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;
// Cadena del minigolf: progreso → habilidades → fx → minigolf (boot.js: Promise.all([cargarV18(), hab18(), cargarV18Fx()]).then(golf18))
const CARGA_JS = `(async () => { try { return await (async () => {
  const G = AV.G, sleep = ms => new Promise(r => setTimeout(r, ms));
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(150); } return false; };
  const asegurar = (src, glob) => new Promise((res, rej) => { if (window[glob]) return res(); const s = document.createElement('script'); s.src = src; s.onload = () => window[glob] ? res() : rej(new Error(glob + ' sin global')); s.onerror = () => rej(new Error('404 ' + src)); document.head.appendChild(s); });
  await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); window.AVV18Progreso(G);
  await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); window.AVV18Habilidades(G);
  await asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'); window.AVV18Fx(G);
  await asegurar('src/game/v18/minigolf.js', 'AVV18Minigolf'); window.AVV18Minigolf(G);
  if (!await espera(() => G.v18minigolf && G.v18minigolf.sitio, 30000)) return 'ERR minigolf sin sitio';
  await espera(() => G.mundo && G.mundo.listo, 60000); await sleep(1500);
  return 'ok sitio=' + G.v18minigolf.sitio.x.toFixed(1) + ',' + G.v18minigolf.sitio.z.toFixed(1); })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;
// Teletransporte al punto del repro y sondeo tras dejar correr cuadros reales
const SONDEA_JS = `(async (px, pz) => { try { return await (async () => {
  const G = AV.G, S = G.S, sleep = ms => new Promise(r => setTimeout(r, ms));
  if (px != null) { S.pos.x = px; S.pos.z = pz; S.pos.y = G.terreno.height(px, pz) + 0.05; S.vy = 0; if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.flying = false; G.fisica.MOVE.vx = G.fisica.MOVE.vz = 0; } }
  await sleep(3000); // cuadros reales: paso() del hoyo decide visibilidad e invitación
  const golf = G.v18minigolf, it = G.interaccion.list.find(i => i.id === 'v18_minigolf');
  const props = {}; G.renderer.scene.traverse(o => { if (/^v18_golf/.test(o.name || '')) props[o.name] = !!o.visible; });
  let nearest = null; try { const n = G.interaccion.nearest(); nearest = n ? n.id : null; } catch (e) { nearest = 'ERR ' + e; }
  const promptEl = document.querySelector('#prompt .prompt-txt');
  const dist = golf && golf.sitio && px != null ? +Math.hypot(golf.sitio.x - px, golf.sitio.z - pz).toFixed(1) : null;
  return { pos: [+S.pos.x.toFixed(1), +S.pos.z.toFixed(1)], distSitio: dist, interaccion: it ? { visible: (() => { try { return it.visible(); } catch (e) { return 'ERR ' + e; } })() } : null,
    props, mapa: golf.mapa(), nearest, prompt: promptEl ? promptEl.textContent : null, invitado: golf.estado().invitado,
    toast: (() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.textContent : null; })(),
    errores: (window.__erroresConsola || []).slice(0, 10) }; })(); } catch (e) { return { error: 'ERR ' + (e && e.stack || e) }; } })`;
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const resumen = { etiqueta: ETIQUETA, pantalla: 'escritorio 1280x800@1 cpuX1', head: null, packs: {} };
  try {
    for (const pack of PACKS) {
      const url = `${origen}/index.html?pack=${pack}&mapa=real&v18=1&calidad=media`;
      console.log(`· ${pack} navegando…`);
      const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
      const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
      for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
      await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: semillaSave(pack) }, ses);
      await cdp.call('Page.navigate', { url }, ses);
      let listo = false; const t0 = Date.now();
      while (Date.now() - t0 < 150000) { try { if (await evaluar(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
      if (!listo) { resumen.packs[pack] = { error: 'no listo' }; continue; }
      const entro = await evaluar(cdp, ses, ENTRAR_JS, 120);
      if (typeof entro === 'string' && entro.indexOf('ERR') === 0) { resumen.packs[pack] = { error: entro }; continue; }
      const cargo = await evaluar(cdp, ses, CARGA_JS, 120);
      console.log('  · v18: ' + cargo);
      if (typeof cargo === 'string' && cargo.indexOf('ERR') === 0) { resumen.packs[pack] = { error: cargo }; continue; }
      // ep4: punto exacto del bug (spawn ~191,165); cap1: entrada de la estación (control: se ofrece)
      const destino = pack === 'ep4' ? [191, 165] : JSON.parse(await evaluar(cdp, ses, `(() => { const s = AV.G.v18minigolf.sitio; return JSON.stringify([s.x + s.ux * -10.3, s.z + s.uz * -10.3]); })()`, 15));
      const datos = await evaluar(cdp, ses, `(${SONDEA_JS})(${destino[0]}, ${destino[1]})`, 90);
      await cdp.bombear(0.3);
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 60000);
      const foto = `k189_${ETIQUETA}_${pack}.jpg`; fs.writeFileSync(path.join(SALIDA, foto), Buffer.from(shot.data, 'base64'));
      resumen.packs[pack] = Object.assign({ foto }, datos);
      console.log(`  · ${pack}@${JSON.stringify(datos.pos)}: interaccion=${datos.interaccion && datos.interaccion.visible} nearest=${datos.nearest} prompt=${JSON.stringify(datos.prompt)} invitado=${datos.invitado} mapa=${datos.mapa ? 'si' : 'null'} propsVisibles=${Object.values(datos.props).filter(Boolean).length} errores=${(datos.errores || []).length}`);
      try { await cdp.call('Target.closeTarget', { targetId: tid }); } catch (e) { }
    }
  } finally {
    resumen.head = await new Promise(r => { exec('git -C "' + RAIZ + '" rev-parse --short HEAD', (e, so) => r((so || '').trim())); });
    const js = path.join(SALIDA, `k189_${ETIQUETA}.json`); fs.writeFileSync(js, JSON.stringify(resumen, null, 1));
    console.log('· resumen ' + js);
    try { chrome.kill(); } catch (e) { }
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  process.exit(0);
})().catch(e => { console.error('ERROR ' + e.message); process.exit(1); });
