#!/usr/bin/env node
/* Amazona Verse · Kimi 3 — QA-221: «Saltar intro» (#c1-saltar) no debe quedar encima de los paneles
   que se abren durante la apertura del cap. 1 (Diario #card, diálogo #dialog, overlays).
   Entra como niño nuevo (misma semilla que kimi2_qa217_ver.js), espera el botón en la apertura,
   abre el Diario, mide rects reales + elementFromPoint, captura, cierra y verifica que el botón
   vuelve; fuerza #dialog para validar la rama diálogo. Uso: node tools/build/kimi3_qa221.js */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQ = process.argv[2] || 'r1';
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi364');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.webp': 'image/webp', '.ktx2': 'image/ktx2' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); const zas = m => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + m)); this.pend.clear(); }; ws.onerror = e => zas(e.message || 'error'); ws.onclose = () => zas('cerrado'); ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function evaluar(cdp, ses, exp, timeoutS, promesa) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000); if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300)); return r.result ? r.result.value : undefined; }
async function espera(cdp, ses, exp, segs) { const t0 = Date.now(); while (Date.now() - t0 < segs * 1000) { const r = await evaluar(cdp, ses, exp, 8, false); if (r) return r; await cdp.bombear(0.5); } return false; }
const rectFn = `function __r(el){const r=el.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}
function __solapa(a,b){return !(a.x+a.w<b.x||a.x>b.x+b.w||a.y+a.h<b.y||a.y>b.y+b.h);}`;
(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3q221-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-component-update', '--window-size=800,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort');
  let puertoD = 0, wsPath = ''; for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoD = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoD) { console.log(JSON.stringify({ ok: false, error: 'sin DevTools: ' + err.slice(0, 200) })); process.exit(1); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoD}${wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = cod => { try { spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) {} srv.close(); process.exit(cod); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
    await cdp.call('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, ses);
    await cdp.call('Page.navigate', { url: origen + '/?v18=1' }, ses);
    await espera(cdp, ses, `!!(document.getElementById('title') || document.getElementById('creator'))`, 90);
    await evaluar(cdp, ses, `localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
      localStorage.setItem('amazonaverse.save', JSON.stringify({ v: 6, formato: 2, escrito: Date.now(), saveId: 'qa221-' + Math.random().toString(36).slice(2, 8), profile: { created: true, name: 'Estrella de la Bahía', look: null }, pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0, inv: {}, collected: [], complete: false, explorando: false, clock: 0, events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {}, comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} }, evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false } })); 'ok'`, 15, false);
    await cdp.call('Page.navigate', { url: origen + '/?v18=1' }, ses);
    await espera(cdp, ses, `(() => { const t = document.getElementById('title'); return t && t.open; })()`, 90);
    await evaluar(cdp, ses, `(() => { const b = document.querySelector('[data-modo="aventura"]'); if (b) b.click(); return 1; })()`, 10, false);
    await espera(cdp, ses, `!!(window.AV && AV.G && AV.G.mundo && AV.G.mundo.listo)`, 240);
    // La semilla ya tiene perfil creado (el creador no dispara la apertura): arrancarla in-page,
    // el mismo camino que selfTest (content/cap1/pruebas.js) y que creador.js firstTime
    await evaluar(cdp, ses, `(() => { const G = AV.G; G.c.apertura.fin(); G.quiet = false; G.pack.inicio(G); return 1; })()`, 15, false);
    // La apertura arranca: esperar el botón «Saltar intro»
    const hayBtn = await espera(cdp, ses, `!!document.getElementById('c1-saltar')`, 60);
    if (!hayBtn) throw new Error('no apareció #c1-saltar (¿la apertura no arrancó?)');
    // esperar a que la pantalla de carga (#carga, src/ui/carga.js) se oculte para medir y capturar el mundo real
    await espera(cdp, ses, `(() => { const c = document.getElementById('carga'); return !c || c.hidden; })()`, 90);
    if (!(await evaluar(cdp, ses, `!!document.getElementById('c1-saltar')`, 8, false))) throw new Error('el botón desapareció mientras se iba #carga (¿la apertura terminó sola?)');
    await cdp.bombear(0.6);
    const base = await evaluar(cdp, ses, `(() => { ${rectFn}
      const b = document.getElementById('c1-saltar');
      const rb = __r(b);
      const enPunto = document.elementFromPoint(rb.x + rb.w / 2, rb.y + rb.h / 2);
      return { boton: rb, z: getComputedStyle(b).zIndex, punto: enPunto ? (enPunto.id || enPunto.className) : null, fade: !!document.getElementById('c1-fade') };
    })()`, 10, false);
    // Abrir el Diario durante la apertura
    await evaluar(cdp, ses, `(() => { const d = document.getElementById('b-diary'); if (d) d.click(); return !!d; })()`, 10, false);
    await espera(cdp, ses, `(() => { const c = document.getElementById('card'); return c && !c.hidden; })()`, 15);
    await cdp.bombear(0.5);
    const conCard = await evaluar(cdp, ses, `(() => { ${rectFn}
      const b = document.getElementById('c1-saltar'), c = document.getElementById('card');
      const rb = __r(b), rc = __r(c);
      const enPunto = document.elementFromPoint(rb.x + rb.w / 2, rb.y + rb.h / 2);
      return { boton: rb, card: rc, solape: __solapa(rb, rc), displayBtn: getComputedStyle(b).display, punto: enPunto ? (enPunto.id || enPunto.className) : null };
    })()`, 10, false);
    const shot1 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `qa221_${ETIQ}_card.jpg`), Buffer.from(shot1.data, 'base64'));
    // Rama diálogo: forzar #dialog visible y comprobar que el mecanismo lo cubre (sin diálogo real a mano)
    const conDialog = await evaluar(cdp, ses, `(async () => {
      const b = document.getElementById('c1-saltar'), d = document.getElementById('dialog');
      const antes = d.hidden; d.hidden = false;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const displayForzado = b ? getComputedStyle(b).display : 'sin-boton';
      d.hidden = antes;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const displayRestaurado = b ? getComputedStyle(b).display : 'sin-boton';
      return { displayForzado, displayRestaurado };
    })()`, 15, true);
    // Cerrar el Diario: el botón debe volver
    await evaluar(cdp, ses, `(() => { const c = document.getElementById('card'); if (c) c.hidden = true; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return 1; })()`, 10, false);
    await cdp.bombear(0.6);
    const trasCerrar = await evaluar(cdp, ses, `(() => {
      const b = document.getElementById('c1-saltar');
      if (!b) return { boton: false };
      return { boton: true, display: getComputedStyle(b).display, conectado: b.isConnected };
    })()`, 10, false);
    const shot2 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `qa221_${ETIQ}_tras-cerrar.jpg`), Buffer.from(shot2.data, 'base64'));
    const res = { ok: false, etiqueta: ETIQ, base, conCard, conDialog, trasCerrar, capturas: [`docs/img/kimi364/qa221_${ETIQ}_card.jpg`, `docs/img/kimi364/qa221_${ETIQ}_tras-cerrar.jpg`] };
    res.ok = conCard && conCard.solape === false && conDialog.displayForzado === 'none' && (!trasCerrar.boton || trasCerrar.display !== 'none');
    console.log(JSON.stringify(res, null, 1));
    fs.writeFileSync(path.join(SALIDA, `qa221_${ETIQ}.json`), JSON.stringify(res, null, 1));
    fin(res.ok ? 0 : 2);
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e && e.message || e).slice(0, 400) }));
    try { fs.writeFileSync(path.join(SALIDA, `qa221_${ETIQ}.json`), JSON.stringify({ ok: false, error: String(e && e.message || e).slice(0, 400) })); } catch (e2) {}
    fin(1);
  }
})();
