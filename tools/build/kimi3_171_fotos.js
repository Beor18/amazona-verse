#!/usr/bin/env node
/* KIMI-171 · capturas del Entrenamiento de esquiva de Maestro Moon para Kelvin.
   Entra con ?v18=1, teleport al claro, espera al NPC y dispara 2 capturas: (1) Moon en su claro,
   (2) entreno en marcha con bolas de luz en el aire. Uso: node tools/build/kimi3_171_fotos.js */
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3m171-'));
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
  fs.mkdirSync(path.join(RAIZ, 'docs', 'img', 'kimi171'), { recursive: true });
  const foto = async (fich) => { const r = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, ses, 30000); fs.writeFileSync(path.join(RAIZ, 'docs', 'img', 'kimi171', fich), Buffer.from(r.data, 'base64')); };
  // acercarse al claro de Moon, encuadre de frente (Vittata al sur del SITIO, mirando al norte hacia Moon)
  console.log('· situar: ' + await ev(cdp, ses, `(async () => {
    const G = window.AV.G, T = G.terreno, S = G.S;
    const st = (G.v18moon && G.v18moon.SITIO) || { x: -150.5, z: 14 };
    S.pos.x = st.x + 3.5; S.pos.z = st.z + 0.5; S.pos.y = T.height(S.pos.x, S.pos.z) + 0.02;
    const dx = st.x - S.pos.x, dz = st.z - S.pos.z;
    G.camara.yaw = Math.atan2(-dx, -dz); if (G.camara.place) G.camara.place(true);
    return JSON.stringify(st);
  })()`, 60));
  for (let i = 0; i < 60; i++) { const inst = await ev(cdp, ses, `!!(window.AV.G.v18npc && window.AV.G.v18npc.instancia('maestromoon'))`, 10, false); if (inst) break; await cdp.bombear(0.5); }
  // el módulo moon carga a demanda tras el primer gesto: esperarlo y, si no, cargarlo explícito (misma cadena que boot.js)
  for (let i = 0; i < 10; i++) { const m = await ev(cdp, ses, `!!(window.AV.G.v18moon && window.AV.G.v18moon.SITIO)`, 10, false); if (m) break; await cdp.bombear(0.5); }
  if (!await ev(cdp, ses, `!!(window.AV.G.v18moon && window.AV.G.v18moon.SITIO)`, 10, false)) {
    console.log('· cargar moon explícito: ' + await ev(cdp, ses, `(async () => { const AV = window.AV, G = AV.G, AVE = window.AVE; const cargar = a => AVE.assets.script(a).catch(() => {}); await cargar('src/game/v18/progreso.js'); if (!G.v18 && window.AVV18Progreso) window.AVV18Progreso(G); await cargar('content/comun/personajes_v18.js'); await cargar('src/game/v18/npc.js'); if (!G.v18npc && window.AVV18Npc) window.AVV18Npc(G); await cargar('src/game/v18/moon.js'); if (!G.v18moon && window.AVV18Moon) window.AVV18Moon(G); return 'moon=' + !!G.v18moon + ' npc=' + !!G.v18npc + ' v18=' + !!G.v18; })()`, 90));
  }
  // tras registrar la fila, el NPC carga su modelo y aparece: esperar a la instancia antes de seguir
  for (let i = 0; i < 60; i++) { const inst = await ev(cdp, ses, `!!(window.AV.G.v18npc && window.AV.G.v18npc.instancia('maestromoon'))`, 10, false); if (inst) break; await cdp.bombear(0.5); }
  console.log('· instancia: ' + await ev(cdp, ses, `!!(window.AV.G.v18npc && window.AV.G.v18npc.instancia('maestromoon'))`, 10, false));
  // recon: posición y visibilidad de Moon + objetos a <10 m del SITIO
  console.log('· recon: ' + await ev(cdp, ses, `(() => { const G = window.AV.G, N = G.v18npc, st = G.v18moon.SITIO; const inst = N.instancia('maestromoon'); const p = inst && inst.raiz ? inst.raiz.position : null; let proy = null; if (p && G.camara && G.camara.cam) { const v = p.clone(); v.y += 0.6; v.project(G.camara.cam); proy = [Math.round((v.x * 0.5 + 0.5) * 1000) / 1000, Math.round((-v.y * 0.5 + 0.5) * 1000) / 1000, v.z < 1]; } return JSON.stringify({ moon: p ? [p.x.toFixed(1), p.y.toFixed(1), p.z.toFixed(1)] : null, visible: inst && inst.raiz ? !!inst.raiz.visible : null, proy, activos: N.activos() }); })()`, 30));
  // el panel «¡Así se juega!» del primer arranque tapa el encuadre: cerrarlo con su botón «¡A jugar!» (si sigue ahí)
  await ev(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 12; i++) { const jb = Array.from(document.querySelectorAll('button')).find(x => /a jugar/i.test(x.textContent || '')); if (jb) { jb.click(); await sleep(400); return 'cerrado ' + i; } await sleep(500); } return 'sin panel'; })()`, 30);
  await ev(cdp, ses, `window.AV.G.quiet = true`, 5, false);
  await cdp.bombear(1.2);
  await foto('k171_moon_claro.jpg');
  console.log('· k171_moon_claro.jpg');
  // entreno en marcha: empezar y esperar 2 lanzamientos (input manual off; A.manual no: usar la API pública con forzar)
  console.log('· entreno: ' + await ev(cdp, ses, `(async () => {
    const G = window.AV.G, S = G.S, T = G.terreno;
    if (!G.v18moon || !G.v18moon.SITIO) return 'sin modulo moon';
    const st = G.v18moon.SITIO;
    S.pos.x = st.x + 3.5; S.pos.z = st.z + 0.5; S.pos.y = T.height(S.pos.x, S.pos.z) + 0.02;
    G.v18moon.empezar({ forzar: true });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await sleep(5200); // cuenta 3 s + 2 lanzamientos
    return JSON.stringify(G.v18moon.estado().fase);
  })()`, 60));
  await foto('k171_entreno_orbs.jpg');
  console.log('· k171_entreno_orbs.jpg');
  await ev(cdp, ses, `try { window.AV.G.v18moon && window.AV.G.v18moon.cancelar(); } catch (e) {} window.AV.G.quiet = false`, 5, false);
  if (process.argv.includes('--orbit')) {
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2;
      await ev(cdp, ses, `(() => { const G = window.AV.G, T = G.terreno, S = G.S, st = G.v18moon.SITIO; S.pos.x = st.x + Math.cos(${a}) * 8; S.pos.z = st.z + Math.sin(${a}) * 8; S.pos.y = T.height(S.pos.x, S.pos.z) + 0.02; const dx = st.x - S.pos.x, dz = st.z - S.pos.z; G.camara.yaw = Math.atan2(-dx, -dz); if (G.camara.place) G.camara.place(true); return Math.round(${a} * 180 / Math.PI); })()`, 20);
      await cdp.bombear(0.9);
      await foto('k171_orb' + k + '.jpg');
      console.log('· k171_orb' + k + '.jpg (ángulo ' + Math.round(a * 180 / Math.PI) + '°)');
    }
  }
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { } srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
