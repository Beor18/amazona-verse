#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-306: recorrido completo con GPU real del arco V18.3
   (encargo 📣 coordinadora 8-nov ~11:00 UTC: «recorrido completo con GPU de las 4 misiones del arco
   V18.3 y del menú V18, en escritorio y en móvil. Capturas y FPS por misión; los fallos van a BUGS.md»).
   Chrome headless propio + CDP, GPU real RX 5700 XT, `?v18=1`.
   Dos pasadas: --pantalla escritorio (1600×900 dpr 1) y --pantalla movil (390×844 dpr 3, CPU ×4, táctil).
   En cada pasada: captura del menú V18 (portada de modos) y recorrido por las 4 misiones en su estado
   final (puerto reparado · Atalayas encendidas · muelle construido · fiesta en marcha), con
   FPS (rAF 1,2 s) / draw calls / tris / memoria GPU por vista.
   Salida: docs/img/kimi306/k306_<pantalla>_<vista>.jpg y k306_<pantalla>_stats.json

   Uso: node tools/build/kimi1_306_arco.js --pantalla escritorio|movil
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

const PANTALLA = (process.argv.indexOf('--pantalla') >= 0 ? process.argv[process.argv.indexOf('--pantalla') + 1] : 'escritorio') === 'movil' ? 'movil' : 'escritorio';
const MOVIL = PANTALLA === 'movil';
const ANCHO = MOVIL ? 390 : 1600, ALTO = MOVIL ? 844 : 900;

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi306');
fs.mkdirSync(SALIDA, { recursive: true });

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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(ms) { return new Promise(r => setTimeout(r, ms)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text).slice(0, 400)); return r.result ? r.result.value : undefined; }

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c306' + (MOVIL ? 'm' : 'e') + '-'));
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
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: MOVIL ? 3 : 1, mobile: MOVIL }, ses);
  if (MOVIL) { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses); } catch (e) { /* opcional */ } }
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');

  const stats = { pantalla: PANTALLA + ' ' + ANCHO + 'x' + ALTO + (MOVIL ? '@3 cpuX4 tactil' : '@1'), head: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(), vistas: {}, consola_errores: [] };
  const raf2 = `new Promise(r=>{let n=0;const f=()=>{if(++n>2)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f)})`;
  const fpsJS = `new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<1200)requestAnimationFrame(f);else r(+(n/((performance.now()-t0)/1000)).toFixed(1))};requestAnimationFrame(f)})`;

  async function foto(id) {
    const f = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k306_${PANTALLA}_${id}.jpg`), Buffer.from(f.data, 'base64'));
  }
  async function medir(id, extra) {
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G;const s=Object.assign({},${extra || '{}'},G.renderer.stats());try{const m=G.renderer.info.memory;s.geo=m.geometries;s.tex=m.textures;}catch(e){}return s;})()`, 30);
    sv.fps = await ev(cdp, ses, fpsJS, 20);
    stats.vistas[id] = sv;
    console.log('· ' + id + ':', JSON.stringify(sv));
    return sv;
  }
  async function asentar(topeS) {
    for (let i = 0; i < (topeS || 60); i++) {
      const s = await ev(cdp, ses, `(function(){try{const st=window.AV.G.mundo.streaming.stats();return {t:st.trabajos,d:st.descargando};}catch(e){return {t:-1,d:-1};}})()`, 15);
      if (s && s.t === 0 && s.d === 0) return true;
      await cdp.bombear(1000);
    }
    return false;
  }
  const posBase = (x, z, y, lx, lz, dist, height) => `(function(){const AV=window.AV,G=AV.G,MV=G.fisica.MOVE;
    MV.flying=${y != null}; MV.grounded=${y == null}; MV.swimming=false; MV.vx=MV.vz=0; G.S.vy=0;
    G.S.pos.x=${x}; G.S.pos.z=${z};
    G.S.pos.y=${y != null ? y : `AV.debug.height(${x},${z})+0.02`};
    G.camara.CAM.dist=${dist}; G.camara.CAM.height=${height};
    const dx=${lx}-G.S.pos.x, dz=${lz}-G.S.pos.z, d=Math.hypot(dx,dz)||1;
    if(G.S.facing){G.S.facing.x=dx/d;G.S.facing.z=dz/d;}
    AV.debug.camYaw(Math.atan2(-dx,-dz));
    return 1;})()`;
  const worldPos = async (nombre) => await ev(cdp, ses, `(function(){const G=window.AV.G;let o=null;G.renderer.scene.traverse(x=>{if(!o&&x.name==='${nombre}')o=x;});
    if(!o) return null; const v={x:0,y:0,z:0}; try{const THREE_V=o.getWorldPosition(new (o.position.constructor)());v.x=+THREE_V.x.toFixed(1);v.y=+THREE_V.y.toFixed(1);v.z=+THREE_V.z.toFixed(1);}catch(e){}
    return {vis:o.visible, p:v};})()`, 20);
  async function vista(id, jsPos, espera) {
    await ev(cdp, ses, jsPos, 30);
    for (let i = 0; i < (espera || 2); i++) { await cdp.bombear(600); await ev(cdp, ses, jsPos, 15); }
    try { await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/¡A jugar!/i.test(x.textContent)&&x.offsetParent!==null);if(b){b.click();return 1;}return 0;})()`, 10); } catch (e) { }
    try { await ev(cdp, ses, `(function(){try{window.AV.G.dialogo.clear();}catch(e){}return 1;})()`, 10); } catch (e) { }
    await ev(cdp, ses, raf2, 30);
    await medir(id);
    await foto(id);
  }

  // ---------- 0 · MENÚ V18 (portada de modos, sin semilla) ----------
  try {
    await ev(cdp, ses, `(function(){const m=document.querySelector('#modos');if(m){m.scrollIntoView();return 'modos-visible';}return 'sin-modos';})()`, 10);
    await cdp.bombear(2600);
    await medir('menu_v18', `(function(){const b=document.querySelectorAll('#modos .tarjeta, #modos button, #modos [class*=modo], #modos [class*=card]');return {tarjetas:b.length};})()`);
    await foto('menu_v18');
  } catch (e) { console.log('· menu_v18 falló:', (e.message || e).slice(0, 200)); }

  // ---------- entrar al mundo (semilla) ----------
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/¡A jugar!/i.test(x.textContent));if(b){b.click();return 'cerrada';}return 'no-estaba';})()`, 15);
  await cdp.bombear(800);

  // ---------- cadena V18 + las 4 misiones en su estado final ----------
  const setup = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G,A=window.AVE;
    if (!G.v18) await A.assets.script('src/game/v18/progreso.js').then(() => window.AVV18Progreso(G));
    if (!G.v18hab) await A.assets.script('src/game/v18/habilidades.js').then(() => window.AVV18Habilidades(G));
    if (!G.v18fx) await A.assets.script('src/game/v18/fx_poderes.js').then(() => window.AVV18Fx(G));
    await A.assets.script('content/comun/personajes_v18.js');
    if (!G.v18npc) await A.assets.script('src/game/v18/npc.js').then(() => window.AVV18Npc(G));
    if (!G.v18puerto) await A.assets.script('src/game/v18/puerto.js').then(() => window.AVV18Puerto(G));
    if (!G.v18arco) await A.assets.script('src/game/v18/arco.js').then(() => window.AVV18Arco(G));
    if (!G.v18muelle) await A.assets.script('src/game/v18/muelle.js').then(() => window.AVV18Muelle(G));
    if (!G.v18fiesta) await A.assets.script('src/game/v18/fiesta.js').then(() => window.AVV18Fiesta(G));
    const V=G.v18, mu=G.v18muelle, fi=G.v18fiesta, ar=G.v18arco;
    if(!mu||!fi||!ar) return {error:'sin-modulos'};
    V.cambiarMundo('puente_villa','reparado');
    V.cambiarMundo('puerto_mina','reparado');
    V.cambiarMundo('arco_atalayas','encendido');
    mu.avanzar('plan'); mu.avanzar('medido'); mu.avanzar('materiales'); mu.avanzar('construido'); mu.aplicar();
    fi.avanzar('reunion'); fi.avanzar('limpio'); fi.avanzar('faroles'); fi.avanzar('fiesta'); fi.aplicar();
    return {puerto:V.mundo('puerto_mina'), atalayas:V.mundo('arco_atalayas'), muelle:V.mundo('arco_muelle'), fiesta:V.mundo('fiesta_colina')};})()`, 120);
  console.log('· setup:', JSON.stringify(setup));
  if (setup.error) throw new Error(setup.error);
  stats.estados = setup;
  await cdp.bombear(3000); // elenco caminando, modelos cargando

  // ---------- 1 · MISIÓN 1: Puerto de La Mina (plaza 73,6;-75,2 · máquina 74,4,-73,25 → 85,6,-74,45) ----------
  await ev(cdp, ses, `AV.teleport(72.0,-78.0)`, 30);
  await asentar(90);
  await vista('puerto_plaza', posBase(72.0, -78.0, null, 79.0, -74.0, 7.5, 3.6), 2);
  await vista('puerto_escalera', posBase(73.6, -70.6, null, 82.0, -74.4, 6.5, 3.0), 2);
  await vista('puerto_aerea', posBase(76.0, -83.0, 24.0, 79.5, -74.0, 9.5, 6.0), 2);

  // ---------- 2 · MISIÓN 2: Atalayas del Oeste (plaza -69,2;68,4) ----------
  await ev(cdp, ses, `AV.teleport(-69.2,63.0)`, 30);
  await asentar(90);
  await vista('atalayas_plaza', posBase(-69.2, 63.0, null, -68.6, 69.4, 7.5, 3.6), 2);
  await vista('atalayas_aerea', posBase(-73.0, 58.0, 26.0, -69.2, 68.4, 9.5, 6.0), 2);

  // ---------- 3 · MISIÓN 3: El muelle (eje A(-125,5;-4,2) hacia el este) ----------
  await ev(cdp, ses, `AV.teleport(-128.4,-2.0)`, 30);
  await asentar(90);
  const ej = await ev(cdp, ses, `(function(){const mu=window.AV.G.v18muelle;return mu.eje?{s0:+mu.eje.s0.toFixed(2),sAgua:+mu.eje.sAgua.toFixed(2),s1:+mu.eje.s1.toFixed(2),cubierta:+mu.eje.cubierta.toFixed(2)}:null;})()`, 20);
  stats.muelle_eje = ej; console.log('· eje:', JSON.stringify(ej));
  const ax = -125.5, az = -4.2;
  const xm = ax + (ej ? (ej.s0 + ej.s1) / 2 : 5), cub = ej ? ej.cubierta : 13.5, xFin = ax + (ej ? ej.s1 : 10.5);
  await vista('muelle_orilla', posBase(ax - 5.5, az + 2.5, null, xm, az, 7.5, 3.6), 2);
  await vista('muelle_sobre', posBase(xm, az, cub + 0.35, xFin, az - 0.6, 6.0, 2.8), 2);
  await vista('muelle_aerea', posBase(xm + 4, az - 8, cub + 9.5, xm, az, 9.5, 6.0), 2);

  // ---------- 4 · MISIÓN 4: La fiesta de la colina (plaza 5;103,8) ----------
  await ev(cdp, ses, `AV.teleport(5.0,99.0)`, 30);
  await asentar(90);
  const p0 = await worldPos('v18-fiesta-poste-0');
  stats.fiesta_poste0 = p0;
  await vista('fiesta_plaza', posBase(5.0, 99.0, null, 5.0, 104.6, 7.5, 3.6), 2);
  if (p0 && p0.vis) await vista('fiesta_poste', posBase(p0.p.x - 2.6, p0.p.z - 2.6, null, p0.p.x, p0.p.z, 4.6, 2.2), 2);
  await vista('fiesta_aerea', posBase(10.0, 96.0, 24.0, 5.0, 103.8, 9.5, 6.0), 2);

  // ---------- cierre ----------
  stats.consola_errores = consola.slice();
  fs.writeFileSync(path.join(SALIDA, `k306_${PANTALLA}_stats.json`), JSON.stringify(stats, null, 1));
  console.log('· CONSOLA ERRORES (' + consola.length + '):', JSON.stringify(consola.slice(0, 6)));
  console.log('· stats: docs/img/kimi306/k306_' + PANTALLA + '_stats.json');

  try {
    const info = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 8000);
    const proc = (info.processInfo || []).filter(p => p.type === 'browser');
    for (const p of proc) { try { execSync(`taskkill /F /T /PID ${p.id}`, { stdio: 'ignore' }); } catch (e) { } }
  } catch (e) { try { execSync(`taskkill /F /T /PID ${chrome.pid}`, { stdio: 'ignore' }); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message || e); process.exit(1); });
