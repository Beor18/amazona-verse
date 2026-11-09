#!/usr/bin/env node
/* QA-221 (cosmético) · reproducción con GPU real: en el duelo táctil la etiqueta «Ala»
   (#v18-duelo-tags [data-t="b-act"]) se monta sobre el texto «Impulso» del botón #b-dash
   (mismo grid #acts: dash arriba, act abajo, ~10 px de gap; la etiqueta cuelga sobre el
   borde superior de act y se come ~19 px del botón de arriba).
   iPhone 13 emulado (DeviceMetrics 390×844 · DSF 3 · táctil real por CDP), GPU real, ?v18=1.
   Mide rects e intersecciones en la posición por defecto y en 4 candidatas de reposición,
   con captura por candidata, para elegir el fix visualmente. Escribe JSON+JPG en docs/img/qa221/.
   Uso: node tools/build/kimi2_qa221tags.js [--etiqueta qa221tags-r1] [--url https://...] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, spawnSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'qa221tags-r1');
const URLBASE = (process.argv.indexOf('--url') > 0 ? process.argv[process.argv.indexOf('--url') + 1].replace(/\/$/, '') : '');
const CAPTURAS = path.join(RAIZ, 'docs', 'img', 'qa221'); fs.mkdirSync(CAPTURAS, { recursive: true });
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
async function toca(cdp, ses, x, y) { const p = { x: Math.round(x), y: Math.round(y), id: 1 }; await cdp.call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] }, ses); await cdp.bombear(0.06); await cdp.call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, ses); await cdp.bombear(0.25); }
async function tocaSel(cdp, ses, sel) { const r = await ev(cdp, ses, `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()`, 10, false); if (!r) return false; await toca(cdp, ses, r.x, r.y); return r; }
async function espera(cdp, ses, exp, segs) { const t0 = Date.now(); while (Date.now() - t0 < segs * 1000) { const r = await ev(cdp, ses, exp, 8, false).catch(() => false); if (r) return r; await cdp.bombear(0.5); } return false; }
// Geometría: rects de los 4 botones de #acts y de las dos etiquetas, con quiet para congelar el paso del duelo.
const EXPERIMENTO = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await sleep(80); } return !!f(); };
  const G = AV.G; G.quiet = true; await espera(() => false, 250);
  const ids = ['b-act', 'b-dash', 'b-fly', 'b-jump'];
  const rr = {}; for (const id of ids) { const b = $(id); const r = b && !b.hidden ? b.getBoundingClientRect() : null; rr[id] = r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) } : null; }
  const tg = $('v18-duelo-tags');
  const mide = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; };
  const out = { botones: rr, spanA: mide([...tg.children].find(s => s.dataset.t === 'b-act')), spanD: mide([...tg.children].find(s => s.dataset.t === 'b-dash')), vw: window.innerWidth, vh: window.innerHeight, quiet: !!G.quiet };
  return out; })()`;
// Coloca el span b-act según el candidato y un rAF propio re-aplica la posición cada cuadro
// (el gancho 'update' del duelo sigue vivo con G.quiet y ponerTags la pisa; nuestro rAF se
// registra después del loop del renderer y gana).
const COLOCAR = `(cand) => { const $ = id => document.getElementById(id); const tg = $('v18-duelo-tags'); const tagA = [...tg.children].find(s => s.dataset.t === 'b-act');
  const aplica = () => { const rA = $('b-act').getBoundingClientRect(), rD = $('b-dash').getBoundingClientRect();
    const w = tagA.offsetWidth, h = tagA.offsetHeight; let T;
    if (cand === 'B') T = rA.top + 8 - h;            /* cabalga el borde: come 8 px de su botón, roza el labio del otro */
    else if (cand === 'C') T = rA.top + 4;           /* dentro, pegada al borde superior de su botón */
    else if (cand === 'D') T = rA.bottom - h - 4;    /* dentro, como etiqueta del botón (cubre su texto) */
    else if (cand === 'E') T = rD.top - 4 - h;       /* apilada encima de la etiqueta Semilla */
    else T = rA.top - 6 - h;                          /* por defecto (bug) */
    tagA.style.transform = 'none';
    tagA.style.left = Math.round(rA.left + rA.width / 2 - w / 2) + 'px';
    tagA.style.top = Math.round(T) + 'px'; };
  if (window.__qa221raf) cancelAnimationFrame(window.__qa221raf);
  const f = () => { aplica(); window.__qa221raf = requestAnimationFrame(f); }; f();
  return { cand }; }`;
const PARAR = `(() => { if (window.__qa221raf) { cancelAnimationFrame(window.__qa221raf); window.__qa221raf = null; } const tagA = [...document.getElementById('v18-duelo-tags').children].find(s => s.dataset.t === 'b-act'); tagA.style.transform = ''; tagA.style.left = ''; tagA.style.top = ''; return 'ok'; })()`;
(async () => {
  const srv = URLBASE ? { srv: { close() {} }, puerto: 0 } : await servir();
  const out = { etiqueta: ETIQ, hora_utc: new Date().toISOString(), base: URLBASE || 'local', head: null, ok: true, pasos: [] };
  try { out.head = require('child_process').execSync('git rev-parse --short=8 HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) {}
  const paso = (n, d) => { out.pasos.push(n + (d !== undefined ? ': ' + JSON.stringify(d) : '')); };
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2q221t-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=800,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { try { const s = fs.readFileSync(path.join(perf, 'DevToolsActivePort'), 'utf8').split('\n'); if (s.length > 1 && s[1].trim()) { puertoDev = parseInt(s[0], 10); wsPath = s[1].trim(); break; } } catch (e) {} await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} srv.srv.close(); throw new Error('sin DevToolsActivePort: ' + err.slice(-300)); }
  const WebSocket = (() => { try { return require('ws'); } catch (e) { return globalThis.WebSocket; } })();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  let capt = 0;
  const foto = async (nombre) => { const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000); fs.writeFileSync(path.join(CAPTURAS, `${ETIQ}_${nombre}.jpg`), Buffer.from(shot.data, 'base64')); capt++; };
  let ses;
  try {
    const { targetId } = await cdp.call('Target.createTarget', { url: 'about:blank' });
    ses = (await cdp.call('Target.attachToTarget', { targetId, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: IPHONE_UA }, ses);
    await cdp.call('Page.navigate', { url: URLBASE ? `${URLBASE}/?v18=1` : `http://127.0.0.1:${srv.puerto}/?v18=1` }, ses);
    await espera(cdp, ses, `!!(document.getElementById('title') || document.getElementById('creator'))`, 90); paso('portada');
    await ev(cdp, ses, `localStorage.clear(); sessionStorage.clear(); 'ok'`, 10, false);
    // portada: esperar la tarjeta Aventura y pulsarla (reintento si el creador no abre)
    for (let i = 0; i < 3; i++) {
      await espera(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); return b && !b.hidden && b.getBoundingClientRect().width > 0; })()`, 30);
      await tocaSel(cdp, ses, '[data-modo="aventura"]');
      const abrio = await espera(cdp, ses, `(() => { const cr = document.getElementById('creator'); return cr && !cr.hidden; })()`, 20);
      if (abrio) break;
      await ev(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (b) b.click(); return true; })()`, 10, false);
      await cdp.bombear(1);
    }
    paso('aventura');
    const hayCreador = await espera(cdp, ses, `(() => { const cr = document.getElementById('creator'); return cr && !cr.hidden; })()`, 45); paso('creador', hayCreador);
    if (hayCreador) {
      await cdp.bombear(1);
      // pulsar ¡A jugar! hasta que el creador cierre (tap táctil; respaldo .click(); reintentos)
      for (let i = 0; i < 4; i++) {
        const cerrado = await ev(cdp, ses, `(() => { const cr = document.getElementById('creator'); return !cr || cr.hidden; })()`, 8, false);
        if (cerrado) break;
        await tocaSel(cdp, ses, '#p-save');
        await cdp.bombear(1.2);
        const cerrado2 = await ev(cdp, ses, `(() => { const cr = document.getElementById('creator'); return !cr || cr.hidden; })()`, 8, false);
        if (cerrado2) break;
        await ev(cdp, ses, `(() => { const b = document.getElementById('p-save'); const e = document.getElementById('p-error'); const cr = document.getElementById('creator'); if (b) b.click(); return JSON.stringify({ click: true, error: e && !e.hidden ? e.textContent : null, crHidden: !cr || cr.hidden }); })()`, 10, false);
        await cdp.bombear(1.5);
      }
      paso('creador-cerrado', await ev(cdp, ses, `(() => { const cr = document.getElementById('creator'); return !cr || cr.hidden; })()`, 8, false));
    }
    // con V18 el guardado arranca el modo elegido directamente; si la portada reaparece, Aventura otra vez
    const portadaOtra = await espera(cdp, ses, `(() => { const t = document.getElementById('title'); return t && t.open; })()`, 12);
    if (portadaOtra) { await cdp.bombear(0.8); await tocaSel(cdp, ses, '[data-modo="aventura"]'); }
    const listo = await espera(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)`, 240); paso('mundoListo', listo);
    if (!listo) throw new Error('el mundo no cargó (creador/entrada falló)');
    await espera(cdp, ses, `(() => { try { return !(AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return true; } })()`, 60);
    await ev(cdp, ses, `(() => { const b = [...document.querySelectorAll('button')].find(x => /saltar/i.test(x.textContent) && !x.hidden); if (b) { b.click(); return true; } return false; })()`, 10, false);
    await espera(cdp, ses, `(() => { const b = document.getElementById('b-act'); return b && b.getBoundingClientRect().width > 0; })()`, 30); paso('HUD tactil');
    // módulo combate (el gesto real ya disparó la cadena perezosa; si no, la cargamos a mano)
    const hayComb = await espera(cdp, ses, `!!(window.AV && AV.G && AV.G.v18combate)`, 20);
    if (!hayComb) {
      await ev(cdp, ses, `(async () => { const G = AV.G; await window.AVE.assets.script('src/game/v18/progreso.js').then(() => window.AVV18Progreso(G)); await window.AVE.assets.script('src/game/v18/habilidades.js').then(() => window.AVV18Habilidades(G)); await window.AVE.assets.script('src/game/v18/combate.js').then(() => window.AVV18Combate(G)); return !!G.v18combate; })()`, 60, true);
    }
    paso('v18combate', hayComb);
    await ev(cdp, ses, `(() => { AV.G.v18combate.iniciar({}); return 'ok'; })()`, 15, false);
    await espera(cdp, ses, `(() => { const tg = document.getElementById('v18-duelo-tags'); return tg && !tg.hidden && [...tg.children].some(s => !s.hidden); })()`, 20); paso('tags visibles');
    out.geometria = await ev(cdp, ses, EXPERIMENTO, 30);
    out.candidatos = {};
    for (const cand of ['default', 'B', 'C', 'D', 'E']) {
      if (cand === 'default') { await cdp.bombear(400); }
      else { out.candidatos[cand] = await ev(cdp, ses, `(${COLOCAR})('${cand}')`, 15); await cdp.bombear(300); }
      const m = await ev(cdp, ses, `(() => { const tg = document.getElementById('v18-duelo-tags'); const tagA = [...tg.children].find(s => s.dataset.t === 'b-act'); const r = tagA.getBoundingClientRect(); const me = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) }; const inter = {}; for (const id of ['b-dash', 'b-fly', 'b-jump', 'b-act']) { const b = document.getElementById(id); if (!b || b.hidden) continue; const c = b.getBoundingClientRect(); inter[id] = !(me.r < c.left || c.right < me.x || me.b < c.top || c.bottom < me.y); } me.inter = inter; me.fueraViewport = me.x < 0 || me.r > window.innerWidth || me.y < 0; return me; })()`, 15);
      out.candidatos[cand] = Object.assign(out.candidatos[cand] || {}, { rect: m });
      await foto('cand_' + cand);
    }
    await ev(cdp, ses, PARAR, 15);
    await foto('final');
    out.erroresConsola = await ev(cdp, ses, `(window.__aveErrores || []).length`, 10);
  } catch (e) { out.error = String(e).slice(0, 300); out.ok = false; }
  try { await cdp.call('Browser.close', {}, ses); } catch (e) { try { spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e2) {} }
  await cdp.bombear(0.8);
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {}
  srv.srv.close();
  out.capturas = capt;
  try { fs.writeFileSync(path.join(CAPTURAS, ETIQ + '.json'), JSON.stringify(out, null, 1)); } catch (e) {}
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
