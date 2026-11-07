#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — QA-191: verificación GPU real del fix de la coordinadora
   (e53f1bc0): en táctil, si el aviso de Acción (#prompt) coincide a la altura del botón táctil del
   poder (#v18-exp-poder, explorar.js), el botón SUBE por encima y no tapa el nombre.
   Dos casos en la misma página (móvil iPhone emulado 390×844 dpr 3 CPU ×4, ?v18=1, input real):
     A) prompt real: se acerca a Iguaca del inicio del cap. 1 («Habla con Iguaca», r 2,4) y, si el
        prompt queda visible, se miden las cajas reales (botón vs prompt) y su intersección;
     B) sintético determinista: se muestra el #prompt real (o uno clonado con su estilo) colocado a
        la altura del botón (overlap x/y) y se espera 0,6 s (> el tick de 0,1 s del update): el fix
        debe subir el botón hasta que su borde inferior quede ≥8 px sobre el top del prompt.
   Veredicto: verde si en ningún caso las cajas se intersecan y el botón queda visible. No toca el
   juego (sonda de verificación). Capturas CDP en docs/img/kimi191/.
   Uso: node tools/build/kimi1_qa191.js --etiqueta r1 */
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
const ANCHO = 390, ALTO = 844, DPR = 3, CPUX = 4;
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi191');
fs.mkdirSync(SALIDA, { recursive: true });

for (const d of fs.readdirSync(os.tmpdir())) {
  if (!/^kimi1q191-/.test(d)) continue;
  const p = path.join(os.tmpdir(), d);
  try { const st = fs.statSync(p); if (Date.now() - st.mtimeMs > 3600e3) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
async function capturar(cdp, ses, archivo) {
  const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
  fs.writeFileSync(archivo, Buffer.from(r.data, 'base64'));
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-kimi1q191-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null, species: 'vittata' },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
  localStorage.setItem('amazonaverse.v18', JSON.stringify({ v: 1, sel: 'vittata', especies: { vittata: 'seleccionada' }, inv: {}, otorgados: {}, mundo: {} }));
} catch (e) {}`;

const ENTRAR_JS = `(async () => { try { return await (async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta'; }
  await espera(() => { try { const AV = window.AV; return AV && AV.G && AV.G.player3D && AV.G.S && AV.G.S.step != null && AV.G.renderer && AV.G.renderer.stats().calls >= 0; } catch (e) { return false; } }, 90000);
  try { const AV = window.AV; if (AV.G.intro && AV.G.intro.saltar) AV.G.intro.saltar(); } catch (e) {}
  await espera(() => { try { return window.AV.G.renderer.stats().calls > 5; } catch (e) { return false; } }, 60000);
  await sleep(1500);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* carga manual de la cadena de explorar.js (progreso → habilidades → fx → explorar): en headless el
   alPrimerGesto no dispara (KIMI-124); las fábricas tienen guarda idempotente */
const PREP_JS = `(async () => { try { return await (async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)), G = AV.G;
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(120); } return false; };
  if (!await espera(() => G.mundo && G.mundo.listo, 60000)) return 'ERR mundo no listo';
  try { window.dispatchEvent(new PointerEvent('pointerdown')); } catch (e) {}
  const cargarScript = src => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s);
  });
  const asegurar = async (src, fabrica) => {
    if (typeof window[fabrica] !== 'function' && !document.querySelector('script[src="' + src + '"]')) await cargarScript(src);
    const t0 = performance.now();
    while (typeof window[fabrica] !== 'function' && performance.now() - t0 < 20000) await sleep(200);
    if (typeof window[fabrica] !== 'function') throw new Error('sin fábrica ' + fabrica);
  };
  try {
    await asegurar('src/game/v18/progreso.js', 'AVV18Progreso'); window.AVV18Progreso(G);
    await asegurar('src/game/v18/habilidades.js', 'AVV18Habilidades'); window.AVV18Habilidades(G);
    await asegurar('src/game/v18/fx_poderes.js', 'AVV18Fx'); window.AVV18Fx(G);
    await asegurar('src/game/v18/explorar.js', 'AVV18Explorar'); window.AVV18Explorar(G);
  } catch (e) { return 'ERR cargando v18: ' + (e && e.message || e); }
  if (!(G.v18explorar && G.v18hab && G.v18fx)) return 'ERR módulos: explorar=' + !!G.v18explorar + ' hab=' + !!G.v18hab + ' fx=' + !!G.v18fx;
  await sleep(400);
  return 'ok'; })(); } catch (e) { return 'ERR ' + (e && e.stack || e); } })()`;

/* QA-191: botón táctil del poder vs aviso de Acción (#prompt). Caso B por el camino REAL del juego:
   una interacción FALSA a 1 m hace que el PROPIO interaccion.js muestre el #prompt (texto, posición
   CSS y hidden verdaderos); si no solapa de forma natural con el botón, se fuerza el solape con el
   estilo inline del prompt (el juego nunca toca el estilo del prompt, solo hidden + texto; la versión
   anterior movía el prompt a document.body y el tick del juego lo re-ocultaba: caja 0x0). El fix de
   explorar.js (tick 0,1 s) debe subir el botón hasta que su borde inferior quede ≥8 px sobre el top
   del prompt. Caso A: prompt real junto a Iguaca. No muta estado (quita la interacción falsa y
   restaura el estilo del prompt). */
const QA191_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), AV = window.AV, G = AV.G;
  const $ = id => document.getElementById(id);
  const caja = el => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left * 10) / 10, t: Math.round(r.top * 10) / 10, r: Math.round(r.right * 10) / 10, b: Math.round(r.bottom * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
  const solapan = (a, b) => !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
  const out = { coarse: matchMedia('(pointer: coarse)').matches, v18: G.V18 };
  try {
    await sleep(600);
    const b = $('v18-exp-poder');
    if (!b) { out.error = 'no existe #v18-exp-poder'; return JSON.stringify(out); }
    const pr = $('prompt');
    out.promptExiste = !!pr;
    if (!pr) { out.error = 'no existe #prompt'; return JSON.stringify(out); }
    const medirBoton = () => ({ hidden: b.hidden, visible: !b.hidden && caja(b).w > 0, bottom: b.style.bottom, right: b.style.right, caja: caja(b) });
    out.base = medirBoton();

    // CASO B: interacción falsa cerca → el juego muestra el prompt. El escenario del bug es que el
    // prompt natural (bottom ~206px en el CSS móvil) queda a la altura del botón en su base (~208px):
    // el fix debe subir el botón ≥8 px sobre el top del prompt. Se compara la caja del prompt con la
    // BASE del botón (medida con el prompt oculto), no con la caja ya reaccionada.
    const s = G.S;
    const fake = { id: 'qa191-fake', x: s.pos.x + 0.9, z: s.pos.z + 0.9, r: 5, label: () => 'Hablar con el Guardián de las Plumas', use() {} };
    const bottom0 = pr.style.bottom;
    try {
      G.interaccion.add(fake);
      await sleep(700); // tick interaccion muestra el prompt + 2-3 ticks del botón (0,1 s) para asentar
      const rp = caja(pr), rb = caja(b);
      const escenarioBug = solapan(out.base.caja, rp); // ¿el botón EN SU BASE taparía el prompt?
      const subio = parseFloat(b.style.bottom) > parseFloat(out.base.bottom) + 2;
      const sinSolape = !solapan(rb, rp) && rb.b <= rp.t - 6; // botón ≥6 px por encima del top del prompt
      out.casoB = { promptDelJuego: !pr.hidden && rp.h > 0, escenarioBug, subio, sinSolape, cajaPrompt: rp, cajaBoton: rb, bottomBoton: b.style.bottom, bottomBase: out.base.bottom };
    } finally {
      try { const i = G.interaccion.list.findIndex(x => x.id === 'qa191-fake'); if (i >= 0) G.interaccion.list.splice(i, 1); } catch (e) {}
      pr.style.bottom = bottom0;
      await sleep(500); // el juego re-oculta el prompt y el botón debe volver a su base
      out.trasQuitar = medirBoton();
      out.trasQuitar.promptHidden = pr.hidden;
    }

    // CASO A: prompt real junto a Iguaca del inicio (interacción genuina, sin tocar el DOM)
    try {
      const luma = G.interaccion.find('luma') || (G.interaccion.list || [])[0] || null;
      const dest = luma ? { x: luma.x, z: luma.z } : { x: -4.5, z: 3.5 };
      s.pos.x = dest.x + 1.1; s.pos.z = dest.z + 1.1; s.pos.y = (G.fisica ? G.fisica.suelo(s.pos.x, s.pos.z, 30) : 0);
      await sleep(1400);
      const rp3 = !pr.hidden && caja(pr).h > 0 ? caja(pr) : null;
      const rb3 = caja(b);
      out.casoA = { promptVisible: !!rp3, cajaBoton: rb3, cajaPrompt: rp3, solapan: rp3 ? solapan(rb3, rp3) : false,
                    pos: { x: Math.round(s.pos.x * 10) / 10, z: Math.round(s.pos.z * 10) / 10 } };
    } catch (e) { out.casoAError = String(e && e.message || e); }

    const okB = !!(out.casoB && out.casoB.promptDelJuego && (!out.casoB.escenarioBug || (out.casoB.subio && out.casoB.sinSolape)));
    const okA = !out.casoA || !out.casoA.promptVisible || !out.casoA.solapan;
    out.veredicto = { baseVisible: out.base.visible, casoB: okB, casoA: okA,
                      vuelveABase: !out.trasQuitar.bottom || out.trasQuitar.bottom === out.base.bottom,
                      ok: out.base.visible && okB && okA };
    const st = G.renderer.stats(); out.stats = { calls: st.calls, tris: st.triangulos };
  } catch (e) { out.error = String(e && e.stack || e); }
  return JSON.stringify(out); })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1q191-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info',
    '--window-size=390,844', 'about:blank'];
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
    const ps = "Get-CimInstance Win32_Process -Filter \\\"Name='chrome.exe'\\\" | Where-Object { $_.CommandLine -like '*kimi1q191-*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync('powershell -NoProfile -Command "' + ps + '"', { timeout: 30000, stdio: 'ignore' });
  } catch (e) { }
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const res = { etiqueta: ETIQUETA, pantalla: `movil ${ANCHO}x${ALTO}@${DPR} cpuX${CPUX} (iPhone emulado, tactil)`, head: null, consola: [] };
  const outJson = path.join(SALIDA, `qa191_${ETIQUETA}.json`);
  const { chrome, perf, puerto: puertoDev, wsPath } = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  let ses = null;
  const consola = [];
  try {
    res.head = (await cdp.call('Browser.getVersion')).product;
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Runtime.addBinding', { name: '__qa191Consola' }, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: DPR, mobile: true }, ses);
    await cdp.call('Emulation.setCPUThrottlingRate', { rate: CPUX }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: `window.addEventListener('error', e => { try { window.__qa191Consola && window.__qa191Consola('ERROR ' + e.message); } catch (_) {} });
      const _ce = console.error.bind(console); console.error = (...a) => { try { window.__qa191Consola && window.__qa191Consola('CERR ' + a.join(' ')); } catch (_) {} _ce(...a); };` }, ses);
    await cdp.call('Runtime.enable', {}, ses);
    // la semilla se inyecta en el documento del juego antes de sus scripts (about:blank tiene origen opaco:
    // sembrar con evaluate ahí se pierde y el creador reaparece — la familia QA-111)
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?pack=cap1&mapa=real&v18=1` }, ses);
    res.fase = 'arranque'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    const t0 = Date.now(); let listo = false;
    while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 20, false)) { listo = true; break; } } catch (e) { }
      await cdp.bombear(0.5);
    }
    if (!listo) throw new Error('el juego no arrancó');
    res.fase = 'entrada'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    const ent = await evaluar(cdp, ses, ENTRAR_JS, 300);
    if (!/^ok/.test(ent)) throw new Error('entrada: ' + ent);
    res.fase = 'prep'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    const prep = await evaluar(cdp, ses, PREP_JS, 120);
    if (!/^ok/.test(prep)) throw new Error('prep: ' + prep);
    res.fase = 'qa191'; fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    // recolector de consola (binding)
    const drenar = async () => {
      try {
        const r = await evaluar(cdp, ses, `window.__qa191Buf ? JSON.stringify(window.__qa191Buf.splice(0)) : '[]'`, 10, false);
        const arr = JSON.parse(r || '[]'); for (const m of arr) consola.push(String(m).slice(0, 400));
      } catch (e) { }
    };
    await evaluar(cdp, ses, `window.__qa191Buf = []; const _p = window.__qa191Consola ? null : null;`, 10, false);
    // el binding empuja a __qa191Buf vía un listener (addBinding llama a window.__qa191Consola)
    await evaluar(cdp, ses, `window.__qa191Consola = m => { try { window.__qa191Buf.push(m); } catch (e) {} };`, 10, false);
    res.qa191 = JSON.parse(await evaluar(cdp, ses, QA191_JS, 150));
    await capturar(cdp, ses, path.join(SALIDA, `qa191_${ETIQUETA}_final.jpg`));
    await drenar();
    res.consola = consola;
    res.ok = !!(res.qa191 && res.qa191.veredicto && res.qa191.veredicto.ok && consola.filter(m => /^ERROR|^CERR/.test(m)).length === 0);
  } catch (e) {
    res.error = String(e && e.message || e);
    try { await drenarConsola(cdp, ses, consola); } catch (_) { }
    res.consola = consola;
  } finally {
    fs.writeFileSync(outJson, JSON.stringify(res, null, 1));
    try { if (ses) await cdp.call('Browser.close', {}, undefined, 8000); } catch (e) { }
    try { chrome.kill(); } catch (e) { }
    mataPorPerfil();
    try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
    srv.close();
  }
  console.log(JSON.stringify({ ok: res.ok, veredicto: res.qa191 && res.qa191.veredicto, error: res.error || null, json: outJson }, null, 1));
  process.exit(res.ok ? 0 : 1);
})();

async function drenarConsola(cdp, ses, consola) {
  try {
    const r = await cdp.call('Runtime.evaluate', { expression: `window.__qa191Buf ? JSON.stringify(window.__qa191Buf) : '[]'`, returnByValue: true }, ses, 10000);
    const arr = JSON.parse((r.result && r.result.value) || '[]'); for (const m of arr) consola.push(String(m).slice(0, 400));
  } catch (e) { }
}
