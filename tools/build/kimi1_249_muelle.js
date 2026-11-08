#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-249: validación visual GPU real de la misión 3
   del arco V18.3 «El muelle de la otra orilla» (encargo 📣 TAREAS_WEB.md 8-nov: «Para Kimi (GPU):
   AV.v18ArcoTest() en el móvil, con capturas del muelle (−121, −4) y de las boyas»).
   La lógica quedó verde en la batería oficial (v18ArcoTest 63/63, móvil GPU real); aquí va lo visual:
   Chrome headless propio + CDP; iPhone emulado 390×844 dpr 3 CPU ×4, GPU real, ?v18=1.
   Con la API pública del módulo (G.v18muelle): puerto reparado + faroles encendidos → avanzar por
   los estados (plan → medido → materiales → construido) con aplicar() → capturas del plano (estacas
   y cinta), las 3 boyas en el río, las 4 tablas, el muelle construido (orilla / sobre la cubierta /
   aérea / farol) y las dos apariencias nuevas (maestro de obra / jefa de obra).
   Salida: docs/img/kimi249/k249_<vista>.jpg y k249_stats.json

   Uso: node tools/build/kimi1_249_muelle.js
*/
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

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi249');
fs.mkdirSync(SALIDA, { recursive: true });
const ANCHO = 390, ALTO = 844;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p === '/') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for ( const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(ms) { return new Promise(r => setTimeout(r, ms)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text).slice(0, 400)); return r.result ? r.result.value : undefined; }

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c249-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`, '--hide-scrollbars'], { detached: true, stdio: 'ignore' });
  chrome.unref();
  let puertoDev, wsPath; const pf = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } }
    await new Promise(r => setTimeout(r, 200));
  }
  if (!puertoDev) throw new Error('Chrome no abrió DevTools');
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  const consola = [];
  ws.addEventListener('message', m => {
    try { const d = JSON.parse(m.data); if (d.method === 'Log.entryAdded' && d.params && d.params.entry && d.params.entry.level === 'error') consola.push(d.params.entry.text); } catch (e) { }
  });
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses); } catch (e) { /* opcional */ }
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/¡A jugar!/i.test(x.textContent));if(b){b.click();return 'cerrada';}return 'no-estaba';})()`, 15);
  await cdp.bombear(800);

  // Ir al embarcadero y asentar la zona
  await ev(cdp, ses, `(function(){const AV=window.AV;AV.teleport(-128.4,7.7);return 1;})()`, 30);
  for (let i = 0; i < 90; i++) {
    const s = await ev(cdp, ses, `(function(){try{const st=window.AV.G.mundo.streaming.stats();return {t:st.trabajos,d:st.descargando};}catch(e){return {t:-1,d:-1};}})()`, 15);
    if (s && s.t === 0 && s.d === 0) break;
    await cdp.bombear(1000);
  }
  // Cadena V18 como boot.js + misión en marcha (mismo truco que kimi1_247_arco.js)
  const setup = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G,A=window.AVE;
    if (!G.v18) await A.assets.script('src/game/v18/progreso.js').then(() => window.AVV18Progreso(G));
    if (!G.v18hab) await A.assets.script('src/game/v18/habilidades.js').then(() => window.AVV18Habilidades(G));
    if (!G.v18fx) await A.assets.script('src/game/v18/fx_poderes.js').then(() => window.AVV18Fx(G));
    await A.assets.script('content/comun/personajes_v18.js');
    if (!G.v18npc) await A.assets.script('src/game/v18/npc.js').then(() => window.AVV18Npc(G));
    if (!G.v18puerto) await A.assets.script('src/game/v18/puerto.js').then(() => window.AVV18Puerto(G));
    if (!G.v18arco) await A.assets.script('src/game/v18/arco.js').then(() => window.AVV18Arco(G));
    if (!G.v18muelle) await A.assets.script('src/game/v18/muelle.js').then(() => window.AVV18Muelle(G));
    const V=G.v18, mu=G.v18muelle;
    if(!mu) return {error:'sin v18muelle'};
    V.cambiarMundo('puente_villa','reparado');
    V.cambiarMundo('puerto_mina','reparado');
    V.cambiarMundo('arco_atalayas','encendido');
    mu.avanzar('plan'); mu.aplicar();
    // elenco al embarcadero (A.tengo): el propio paso lo hace por distancia; forzamos con una ida
    const antes = {estado: mu.estado(), valido: mu.valido, eje: mu.eje ? {s0:+mu.eje.s0.toFixed(2), sAgua:+mu.eje.sAgua.toFixed(2), s1:+mu.eje.s1.toFixed(2), cubierta:+mu.eje.cubierta.toFixed(2)} : null, elenco: mu.elenco()};
    return antes;})()`, 90);
  console.log('· setup:', JSON.stringify(setup));
  if (setup.error) throw new Error(setup.error);
  await cdp.bombear(2500); // elenco caminando, modelos cargando

  const stats = { pantalla: 'movil 390x844@3 cpuX4', setup, vistas: {}, consola_errores: consola.slice() };
  const raf2 = `new Promise(r=>{let n=0;const f=()=>{if(++n>2)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f)})`;
  // FPS: rAFs en 1200 ms de página visible
  const fpsJS = `new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<1200)requestAnimationFrame(f);else r(+(n/((performance.now()-t0)/1000)).toFixed(1))};requestAnimationFrame(f)})`;

  async function captura(id, jsPos, espera) {
    try {
    await ev(cdp, ses, jsPos, 30);
    for (let i = 0; i < (espera || 2); i++) { await cdp.bombear(600); await ev(cdp, ses, jsPos, 15); }
    try { await ev(cdp, ses, `(function(){try{window.AV.G.dialogo.clear();}catch(e){}return 1;})()`, 10); } catch (e) { }
    await ev(cdp, ses, raf2, 30);
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G,mu=G.v18muelle;
      const s=Object.assign({estado:mu.estado(),px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());
      return s;})()`, 30);
    sv.fps = await ev(cdp, ses, fpsJS, 20);
    stats.vistas[id] = sv;
    const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k249_${id}.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· ' + id + ':', JSON.stringify(sv));
    } catch (e) { console.error('· FALLO en captura', id, ':', (e.message || e).slice(0, 300)); throw e; }
  }

  const posBase = (x, z, y, lx, lz, ly, dist, height) => `(function(){const AV=window.AV,G=AV.G,MV=G.fisica.MOVE;
    MV.flying=${y != null}; MV.grounded=${y == null}; MV.swimming=false; MV.vx=MV.vz=0; G.S.vy=0;
    G.S.pos.x=${x}; G.S.pos.z=${z};
    G.S.pos.y=${y != null ? y : `AV.debug.height(${x},${z})+0.02`};
    G.camara.CAM.dist=${dist}; G.camara.CAM.height=${height};
    const dx=${lx}-G.S.pos.x, dz=${lz}-G.S.pos.z, d=Math.hypot(dx,dz)||1;
    if(G.S.facing){G.S.facing.x=dx/d;G.S.facing.z=dz/d;}
    AV.debug.camYaw(Math.atan2(-dx,-dz));
    return 1;})()`;

  // utilidad: posición mundo de un grupo de la escena
  const worldPos = async (nombre) => await ev(cdp, ses, `(function(){const G=window.AV.G;let o=null;G.renderer.scene.traverse(x=>{if(!o&&x.name==='${nombre}')o=x;});
    if(!o) return null; const v={x:0,y:0,z:0}; try{const THREE_V=o.getWorldPosition(new (o.position.constructor)());v.x=+THREE_V.x.toFixed(1);v.y=+THREE_V.y.toFixed(1);v.z=+THREE_V.z.toFixed(1);}catch(e){}
    return {vis:o.visible, p:v};})()`, 20);

  // ---------- 1 · estado 'plan': plano + elenco + boyas ----------
  await captura('orilla_plano_elenco', posBase(-131.5, -2.0, null, -125.5, -4.2, null, 6.5, 3.2), 3);
  const b0 = await worldPos('v18-muelle-boya-0'), b1 = await worldPos('v18-muelle-boya-1'), b2 = await worldPos('v18-muelle-boya-2');
  console.log('· boyas:', JSON.stringify([b0, b1, b2]));
  stats.boyas = [b0, b1, b2];
  if (b0 && b1) {
    const cx = (b0.p.x + b1.p.x + (b2 ? b2.p.x : b0.p.x)) / 3, cz = (b0.p.z + b1.p.z + (b2 ? b2.p.z : b0.p.z)) / 3;
    await captura('boyas_aerea', posBase(cx - 7, cz - 5, 19.5, cx, cz, null, 8.5, 5.5), 3);
    await captura('boyas_rasante', posBase(cx - 6, cz - 3.5, 14.6, cx, cz, null, 5.2, 2.2), 3);
  }

  // ---------- 2 · estado 'medido': tablas ----------
  await ev(cdp, ses, `(function(){const mu=window.AV.G.v18muelle;mu.avanzar('medido');mu.aplicar();return mu.estado();})()`, 30);
  await cdp.bombear(1200);
  const t0p = await worldPos('v18-muelle-tabla-0'), t2p = await worldPos('v18-muelle-tabla-2');
  console.log('· tablas:', JSON.stringify([t0p, t2p]));
  stats.tablas = [t0p, t2p];
  if (t0p && t2p) {
    const cx = (t0p.p.x + t2p.p.x) / 2, cz = (t0p.p.z + t2p.p.z) / 2;
    await captura('tablas_orilla', posBase(cx - 6, cz - 8, null, cx, cz, null, 7.0, 3.4), 3);
  }

  // ---------- 3 · construido: el muelle ----------
  await ev(cdp, ses, `(function(){const mu=window.AV.G.v18muelle;mu.avanzar('materiales');mu.aplicar();mu.avanzar('construido');mu.aplicar();
    // forzar elenco en el embarcadero (calcElenco: estado>inicio → true)
    return {estado:mu.estado(), eje:mu.eje?{s0:+mu.eje.s0.toFixed(2),sAgua:+mu.eje.sAgua.toFixed(2),s1:+mu.eje.s1.toFixed(2),cubierta:+mu.eje.cubierta.toFixed(2)}:null};})()`, 30);
  await cdp.bombear(2500);
  const ej = stats.vistas.construido_eje || (await ev(cdp, ses, `(function(){const mu=window.AV.G.v18muelle;return mu.eje?{s0:+mu.eje.s0.toFixed(2),sAgua:+mu.eje.sAgua.toFixed(2),s1:+mu.eje.s1.toFixed(2),cubierta:+mu.eje.cubierta.toFixed(2)}:null;})()`, 20));
  stats.construido_eje = ej;
  console.log('· eje:', JSON.stringify(ej));
  // el eje corre de A(-125.5,-4.2) hacia el ESTE (x creciente): un punto del eje = A + (s,0)
  const ax = -125.5, az = -4.2;
  const xm = ax + (ej ? (ej.s0 + ej.s1) / 2 : 5), zm = az;
  const cub = ej ? ej.cubierta : 13.5;
  const xFin = ax + (ej ? ej.s1 : 10.5);
  const xAgua = ax + (ej ? ej.sAgua : 6);
  await captura('muelle_orilla', posBase(ax - 5.5, az + 2.5, null, xm, zm, null, 7.5, 3.6), 3);
  await captura('muelle_sobre', posBase(xm, zm, cub + 0.35, xFin, zm, null, 6.0, 2.8), 3);
  await captura('muelle_farol_final', posBase(xFin - 2.2, zm - 0.2, cub + 0.35, xFin + 0.6, zm - 1.0, null, 4.2, 2.0), 3);
  await captura('muelle_aerea', posBase(xm + 4, zm - 7, cub + 9.5, xm, zm, null, 9.5, 6.0), 3);
  await captura('apariencias_obra', posBase(xAgua + 0.5, zm - 3.5, cub + 0.35, xAgua + 1, zm - 0.4, null, 4.6, 2.2), 3);

  // ---------- cierre ----------
  stats.consola_errores = consola.slice();
  fs.writeFileSync(path.join(SALIDA, 'k249_stats.json'), JSON.stringify(stats, null, 1));
  console.log('· CONSOLA ERRORES (' + consola.length + '):', JSON.stringify(consola.slice(0, 6)));
  console.log('· stats: docs/img/kimi249/k249_stats.json');

  // limpiar Chrome (árbol entero: Chrome 156 deja el navegador detached)
  try {
    const info = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 8000);
    const proc = (info.processInfo || []).filter(p => p.type === 'browser');
    for (const p of proc) { try { execSync(`taskkill /F /T /PID ${p.id}`, { stdio: 'ignore' }); } catch (e) { } }
  } catch (e) { try { execSync(`taskkill /F /T /PID ${chrome.pid}`, { stdio: 'ignore' }); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message || e); process.exit(1); });
