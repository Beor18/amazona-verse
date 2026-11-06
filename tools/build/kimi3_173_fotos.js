#!/usr/bin/env node
/* KIMI-173 · capturas de Tuerca (BM166) para Kelvin: (1) operador junto a su perforadora (misión en obra),
   (2) inventor reparador con delantal y llave (misión reparada). Uso: node tools/build/kimi3_173_fotos.js */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k173-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1600,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { console.log('· no arrancó'); process.exit(1); }
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  fs.mkdirSync(path.join(RAIZ, 'docs', 'img', 'kimi173'), { recursive: true });
  const foto = async (fich) => { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000); fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi173', fich), Buffer.from(r.data, 'base64')); console.log('· ' + fich); };
  // el panel «¡Así se juega!» tapa el encuadre: cerrarlo con su botón
  await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 12; i++) { const jb = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jb) { jb.click(); await sleep(400); return 'cerrado ' + i; } await sleep(500); } return 'sin panel'; })()`, 30);
  // cargar la cadena de la misión como hace boot.js (puerto.js se carga al primer gesto; aquí no hay gesto)
  console.log('· cargar módulos: ' + await ev(cdp, ses, `(async () => { const AV = window.AV, G = AV.G, AVE = window.AVE; const cargar = a => AVE.assets.script(a).catch(() => {}); await cargar('src/game/v18/progreso.js'); if (!G.v18 && window.AVV18Progreso) window.AVV18Progreso(G); await cargar('content/comun/personajes_v18.js'); await cargar('src/game/v18/npc.js'); if (!G.v18npc && window.AVV18Npc) window.AVV18Npc(G); await cargar('src/game/v18/puerto.js'); if (!G.v18puerto && window.AVV18Puerto) window.AVV18Puerto(G); return 'puerto=' + !!G.v18puerto + ' npc=' + !!G.v18npc + ' v18=' + !!G.v18; })()`, 90));
  // el panel «¡Así se juega!» reaparece tras los teleports: cerrarlo (y charlas/bocadillos) antes de CADA captura
  const limpiar = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); const G = window.AV.G;
    for (let i = 0; i < 10; i++) { const jb = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jb) jb.click(); try { if (G.dialogo.open()) G.dialogo.clear(); if (G.dialogo.cancelarLibre) G.dialogo.cancelarLibre(); } catch (e) {} await sleep(200); }
    return 'limpio'; })()`;
  // encuadre: Vittata en la plaza (sitio aceptado por las zonas), mirando a Tuerca a ~6 m; él se gira a recibirte
  const encuadrar = `(fin) => { const G = window.AV.G, T = G.terreno, S = G.S;
    const a = { x: 74.4, z: -73.25 }, b = { x: 85.6, z: -74.45 }, L = Math.hypot(b.x - a.x, b.z - a.z);
    const U = { x: (b.x - a.x) / L, z: (b.z - a.z) / L }, Nn = { x: -U.z, z: U.x };
    const en = (s, l) => ({ x: a.x + U.x * s + Nn.x * l, z: a.z + U.z * s + Nn.z * l });
    const t = fin ? en(0.8, 4.6) : en(3.6, 2.0);
    if (fin) { S.pos.x = en(3.5, 5.5).x; S.pos.z = en(3.5, 5.5).z; } // fase 2: desde la ladera (la cámara trasera queda sobre el terreno, no sobre el agua)
    else { S.pos.x = 73.6; S.pos.z = -75.2; } // fase 1: desde la plaza
    S.pos.y = T.height(S.pos.x, S.pos.z) + 0.02; S.vy = 0;
    const dx = t.x - S.pos.x, dz = t.z - S.pos.z; G.camara.yaw = Math.atan2(-dx, -dz); if (G.camara.place) G.camara.place(true);
    return JSON.stringify(t); }`;
  const recon = `(fin) => { const G = window.AV.G, S = G.S, sc = G.renderer.scene; const r = sc.getObjectByName('v18-puerto-tuerca-raiz');
    if (!r) return JSON.stringify({ vittata: [S.pos.x.toFixed(1), S.pos.z.toFixed(1)], raiz: null }); const b = new THREE.Box3().setFromObject(r); const s = b.getSize(new THREE.Vector3());
    const n = (nm) => { const o = sc.getObjectByName(nm); return o ? !!o.visible : null; };
    return JSON.stringify({ vittata: [S.pos.x.toFixed(1), S.pos.z.toFixed(1)], pos: [r.position.x.toFixed(1), r.position.y.toFixed(1), r.position.z.toFixed(1)], tam: [s.x.toFixed(2), s.y.toFixed(2), s.z.toFixed(2)], visible: !!(r.parent && r.parent.visible), capuchon: n('Capuchon'), chaleco: n('Chaleco'), delantal: n('Delantal'), llave: n('Llave') }); }`;
  // 1 · operador: misión listada (puente reparado) en «obra»
  console.log('· fase operador: ' + await ev(cdp, ses, `(async () => { const G = window.AV.G; G.v18.cambiarMundo('puente_villa', 'reparado'); G.v18.cambiarMundo('puerto_mina', 'obra'); (${encuadrar})(false); return 'obra'; })()`, 60));
  for (let i = 0; i < 90; i++) { const hay = await ev(cdp, ses, `!!window.AV.G.renderer.scene.getObjectByName('v18-puerto-tuerca-raiz')`, 10, false); if (hay) break; await cdp.bombear(0.5); }
  console.log('· recon operador: ' + await ev(cdp, ses, `(${recon})(false)`, 30));
  await ev(cdp, ses, limpiar, 30);
  await ev(cdp, ses, `window.AV.G.quiet = true`, 5, false);
  await cdp.bombear(1.2);
  await foto('k173_tuerca_operador.jpg');
  // 2 · inventor: misión reparada (la máquina se reconvierte y Tuerca cambia de apariencia)
  console.log('· fase inventor: ' + await ev(cdp, ses, `(async () => { const G = window.AV.G; G.v18.cambiarMundo('puerto_mina', 'reparado'); (${encuadrar})(true); return 'reparado'; })()`, 60));
  for (let i = 0; i < 60; i++) { const mv = await ev(cdp, ses, `(() => { const r = window.AV.G.renderer.scene.getObjectByName('v18-puerto-tuerca-raiz'); return r ? JSON.stringify([r.position.x.toFixed(1), r.position.z.toFixed(1)]) : '""'; })()`, 10, false); if (mv && Math.abs(parseFloat(JSON.parse(mv)[0]) - 0) < 40) break; await cdp.bombear(0.5); }
  await cdp.bombear(2.5); // deja que camine al puesto de inventor y asiente el cambio de apariencia
  console.log('· recon inventor: ' + await ev(cdp, ses, `(${recon})(true)`, 30));
  await ev(cdp, ses, limpiar, 30);
  await cdp.bombear(0.8);
  await foto('k173_tuerca_inventor.jpg');
  console.log('· stats render (fase inventor, escena visible): ' + await ev(cdp, ses, `(() => { const G = window.AV.G, info = G.renderer.renderer.info; return JSON.stringify({ calls: info.render.calls, tris: info.render.triangles, geoms: info.memory.geometries, texs: info.memory.textures, heapMB: Math.round((performance.memory && performance.memory.usedJSHeapSize || 0) / 1048576) }); })()`, 10, false));
  const consola = await ev(cdp, ses, `(() => { const G = window.AV.G; return JSON.stringify({ errores: (G.ui && G.ui._errores) || [], quiet: G.quiet }); })()`, 10, false);
  console.log('· fin: ' + consola);
  try { chrome.kill(); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('ERROR', e && e.message || e); process.exit(1); });
