#!/usr/bin/env node
/* KIMI-371 · QA-nuevo-br1-3 en GPU real: A/B de la vista más cargada de streamingTest
   (kelvin_ruinas_yunque) antes/después de juiceTest + aislamiento de los NPC V18
   (v18_arausiaca, v18_rival y cualquier raíz v18_* visible) para la baseline del
   culling por distancia que propuso la nube (TAREAS_WEB 📣 9-nov 06:05).
   Solo mide; no toca el juego. Uso: node tools/build/kimi3_371.js [--etiqueta r1] */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'r1');
const PRELUDE = (process.argv.indexOf('--prelude') > 0 ? process.argv[process.argv.indexOf('--prelude') + 1].split(',').filter(Boolean) : []);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result ? r.result.value : undefined; }

// Medición de la peor vista (mismo protocolo que la check de streamingTest: spawn → soltarTodo → ZM × 4 yaw).
const MEDIR = `(async () => {
  const G = AV.G, R = G.renderer, scene = R.scene, P = G.pruebas, S = G.S;
  let ST = G.streaming && G.streaming.gestor;
  const r2 = v => Math.round(v * 10) / 10;
  const dibujar = n => { for (let i = 0; i < (n || 2); i++) { G.camara.place(true); R.render(1 / 60, false); } };
  const ir = async (x, z) => { P.teleport(x, z, 0, -1); P.tick(0.1); await ST.alrededor(x, z); await ST.terminar(); if (G.solidos && G.solidos.terminar) G.solidos.terminar(); dibujar(); };
  const contar = () => { const rr = R.renderer, orig = rr.render; let n = 0; rr.render = function (a, b) { orig.call(rr, a, b); n += rr.info.render.calls; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return n; };
  const porGrupo = () => { const n = {}; for (const h of scene.children) { if (!h.visible) continue; let k = 0; h.traverseVisible(o => { if (o.isMesh || o.isPoints || o.isLine || o.isSprite) k++; }); if (k) n[h.name || h.type] = (n[h.name || h.type] || 0) + k; } return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0] + ' ' + e[1]).join(', '); };
  const npc = () => { const out = []; for (const h of scene.children) { if (/^v18_/.test(h.name || '') && h.visible) { let meshes = 0; h.traverse(o => { if (o.isMesh || o.isSprite) meshes++; }); const d = Math.hypot(h.position.x - S.pos.x, h.position.z - S.pos.z); out.push(h.name + ' @(' + r2(h.position.x) + ',' + r2(h.position.z) + ') mallas ' + meshes + ' dist ' + r2(d)); } } return out; };
  const t0 = performance.now();
  while ((!ST || !ST.listo || !ST.zonas || !Object.keys(ST.zonas).length) && performance.now() - t0 < 120000) { await new Promise(r => setTimeout(r, 250)); ST = G.streaming && G.streaming.gestor; }
  if (G.mundo && G.mundo.listo) await G.mundo.listo;
  await ST.listo; await ST.terminar();
  if (R.setCalidad) R.setCalidad('alto', true);
  const MAPA = G.terreno.mapa || {}, sp = MAPA.spawn || { x: S.pos.x, z: S.pos.z };
  if (ST.soltarTodo) ST.soltarTodo();
  await ir(sp.x, sp.z);
  if (ST.liberarYa) ST.liberarYa();
  await ST.terminar();
  const zs = Object.values(ST.zonas);
  const ZM = zs.slice().sort((a, b) => b.inst.length - a.inst.length)[0];
  const bzM = ZM.cz + Math.min(ZM.r, 40) + 6;
  let st = null, tomas = [];
  for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    for (let intento = 0; intento < 4; intento++) {
      if (Math.hypot(S.pos.x - ZM.cx, S.pos.z - bzM) > 3) await ir(ZM.cx, bzM);
      await ST.terminar();
      const se0 = ST.stats();
      if (!se0.trabajos && !se0.descargando && Math.hypot(S.pos.x - ZM.cx, S.pos.z - bzM) <= 3) break;
    }
    G.camara.yaw = yaw; dibujar(2);
    const c = contar(), se = ST.stats();
    tomas.push({ yaw: r2(yaw), calls: c });
    if (!st || c > st.calls) st = { calls: c, yaw: r2(yaw), edif: se.drawEdificios, cerca: se.visiblesCerca, hd: se.visiblesHD, lejos: se.visiblesLejos, zonas: se.zonasFundidas, grupo: porGrupo() };
  }
  return { zm: ZM.id, tomas, npc: npc(), st };
})()`;

(async () => {
  const srv = await servir(); const origen = `http://127.0.0.1:${srv.puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi3k371-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { console.log('· no arrancó'); process.exit(1); }
  console.log('· entrada: ' + String(await ev(cdp, ses, CFG.preparar_js, 300)).slice(0, 120));
  const out = { etiqueta: ETIQ, cuando: new Date().toISOString(), gpu: 'PC real (ANGLE/D3D11)', fases: {} };
  console.log('· fase A (control, antes de juiceTest)…');
  out.fases.control = await ev(cdp, ses, MEDIR, 240);
  console.log('  peor vista:', JSON.stringify(out.fases.control.st));
  for (const b of PRELUDE) {
    console.log('· prelude ' + b + '…');
    const r = await ev(cdp, ses, `AV.${b}()`, 240);
    out.fases['prelude_' + b] = r && r.p !== undefined ? r.p + '/' + r.t : String(JSON.stringify(r || null)).slice(0, 200);
    console.log('  ' + b + ':', out.fases['prelude_' + b]);
  }
  console.log('· juiceTest…');
  out.fases.juice = await ev(cdp, ses, `AV.juiceTest()`, 120);
  console.log('  juiceTest:', out.fases.juice && out.fases.juice.p + '/' + out.fases.juice.t);
  console.log('· fase B (tras juiceTest)…');
  out.fases.post = await ev(cdp, ses, MEDIR, 240);
  console.log('  peor vista:', JSON.stringify(out.fases.post.st));
  console.log('  npc visibles:', JSON.stringify(out.fases.post.npc));
  console.log('· aislamiento de raíces v18_* en la peor yaw…');
  out.fases.aislar = await ev(cdp, ses, `(async (peor) => {
    const G = AV.G, R = G.renderer, scene = R.scene, ST = G.streaming.gestor, P = G.pruebas, S = G.S;
    const dibujar = n => { for (let i = 0; i < (n || 2); i++) { G.camara.place(true); R.render(1 / 60, false); } };
    const contar = () => { const rr = R.renderer, orig = rr.render; let n = 0; rr.render = function (a, b) { orig.call(rr, a, b); n += rr.info.render.calls; }; try { G.camara.place(true); R.render(1 / 60, false); } finally { rr.render = orig; } return n; };
    const zs = Object.values(ST.zonas);
    const ZM = zs.slice().sort((a, b) => b.inst.length - a.inst.length)[0];
    const bzM = ZM.cz + Math.min(ZM.r, 40) + 6;
    P.teleport(ZM.cx, bzM, 0, -1); P.tick(0.1); await ST.alrededor(ZM.cx, bzM); await ST.terminar();
    G.camara.yaw = peor; dibujar(2);
    const base = contar();
    const raices = []; for (const h of scene.children) { if (/^v18_/.test(h.name || '') && h.visible) raices.push(h); }
    const deltas = {}; for (const h of raices) { h.visible = false; dibujar(1); deltas[h.name] = base - contar(); h.visible = true; dibujar(1); }
    return { base, deltas, check: contar() };
  })(${out.fases.post.st.yaw})`, 120);
  console.log('  aislamiento:', JSON.stringify(out.fases.aislar));
  console.log('· streamingTest oficial (mismo orden que el barrido: juiceTest antes)…');
  try {
    out.fases.streamingTest = await ev(cdp, ses, `AV.streamingTest()`, 240);
    const st = out.fases.streamingTest;
    console.log('  streamingTest:', st && st.p + '/' + st.t, st && st.mal && st.mal.length ? JSON.stringify(st.mal).slice(0, 1500) : '');
  } catch (e) { out.fases.streamingTestError = String(e && e.message || e); console.log('  streamingTest: ERROR/CDP (' + out.fases.streamingTestError + ')'); }
  const SAL = path.join(RAIZ, 'docs', 'img', 'kimi371'); fs.mkdirSync(SAL, { recursive: true });
  fs.writeFileSync(path.join(SAL, 'k371_' + ETIQ + '.json'), JSON.stringify(out, null, 2));
  console.log('· JSON en docs/img/kimi371/k371_' + ETIQ + '.json');
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e && e.message || e); process.exit(1); });
