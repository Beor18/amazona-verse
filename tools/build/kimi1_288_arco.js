#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-288: recorrido completo con GPU real de las
   4 misiones del arco V18.3 y del menú V18, en escritorio y en móvil (encargo 📣 coordinadora
   → Kimi 1 · 8-nov ~11:00 UTC: «Capturas y FPS por misión; los fallos van a BUGS.md»).
   Misiones: 1 «El puerto que volvió a vivir» (puerto.js, obra→reparado) · 2 «Los faroles de
   las Atalayas» (arco.js, reunion→encendido) · 3 «El muelle de la otra orilla» (muelle.js,
   plan→construido) · 4 «La fiesta de la colina» (fiesta.js, reunion→fiesta) + menú V18 (portada).
   Por cada vista: teleport al sitio + estado por la API pública + asentado (cola 0/0) +
   12 s de muestreo rAF (FPS med/p10) + stats (draw calls/tris/heap/memoria GPU) + captura.

   Uso: node tools/build/kimi1_288_arco.js --perfil escritorio|movil [--etiqueta r1]
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

const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const PERFIL = arg('--perfil') || 'escritorio';
const ETIQ = arg('--etiqueta') || 'r1';
const MOVIL = PERFIL === 'movil';
const ANCHO = MOVIL ? 390 : 1600, ALTO = MOVIL ? 844 : 900;

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi288');
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), `kimi1c288-${PERFIL}-`));
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
  if (MOVIL) { await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses); try { await cdp.call('Emulation.setCPUThrottlingRate', { rate: 4 }, ses); } catch (e) { } }
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  await cdp.bombear(1500);

  const stats = { perfil: `${PERFIL} ${ANCHO}x${ALTO}@${MOVIL ? 3 : 1}${MOVIL ? ' cpuX4 tactil' : ''}`, etiqueta: ETIQ, head: null, vistas: {}, consola_errores: [] };
  try { stats.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { }
  const raf2 = `new Promise(r=>{let n=0;const f=()=>{if(++n>2)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f)})`;
  const fpsMuestreo = `new Promise(r=>{const v=[];let n=0;const t0=performance.now();let ult=t0;const iv=setInterval(()=>{const t=performance.now();v.push(+(n/((t-ult)/1000)).toFixed(1));n=0;ult=t;if(t-t0>=12000){clearInterval(iv);r(v)}},1000);const f=()=>{n++;requestAnimationFrame(f)};requestAnimationFrame(f)})`;
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

  async function captura(id, jsPos, espera) {
    await ev(cdp, ses, jsPos, 30);
    for (let i = 0; i < (espera || 2); i++) { await cdp.bombear(600); await ev(cdp, ses, jsPos, 15); }
    try { await ev(cdp, ses, `(function(){try{window.AV.G.dialogo.clear();}catch(e){}return 1;})()`, 10); } catch (e) { }
    try { await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/Saltar intro/i.test(x.textContent));if(b&&b.offsetParent!==null){b.click();return 1;}return 0;})()`, 10); } catch (e) { }
    // asentar la cola de streaming antes de medir
    for (let i = 0; i < 90; i++) {
      const s = await ev(cdp, ses, `(function(){try{const st=window.AV.G.mundo.streaming.stats();return {t:st.trabajos,d:st.descargando};}catch(e){return {t:0,d:0};}})()`, 15);
      if (s && s.t === 0 && s.d === 0) break;
      await cdp.bombear(1000);
    }
    await ev(cdp, ses, raf2, 30);
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G;const s=Object.assign({px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());try{const inf=G.renderer.renderer.info;s.geo=inf.memory.geometries;s.tex=inf.memory.textures;s.prog=inf.programs.length;}catch(e){}s.heap=+(performance.memory?(performance.memory.usedJSHeapSize/1048576).toFixed(0):0);return s;})()`, 30);
    const muestras = await ev(cdp, ses, fpsMuestreo, 25);
    sv.fps_med = +pct(muestras, 0.5).toFixed(1); sv.fps_p10 = +pct(muestras, 0.1).toFixed(1); sv.fps_muestras = muestras;
    stats.vistas[id] = sv;
    const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k288_${PERFIL}_${id}.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· ' + id + ':', JSON.stringify(sv));
    fs.writeFileSync(path.join(SALIDA, `k288_${PERFIL}_${ETIQ}.json`), JSON.stringify(stats, null, 1));
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

  // ---------- entrar al mundo ----------
  await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/¡A jugar!/i.test(x.textContent));if(b){b.click();return 'cerrada';}return 'no-estaba';})()`, 15);
  await cdp.bombear(1200);

  // Cadena V18 como boot.js + mundo previo hecho (mismo truco que kimi1_256_fiesta.js)
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
    const V=G.v18;
    V.cambiarMundo('puente_villa','reparado');
    V.cambiarMundo('puerto_mina','reparado');
    V.cambiarMundo('arco_atalayas','encendido');
    V.cambiarMundo('arco_muelle','construido');
    return {ok: !!(G.v18puerto&&G.v18arco&&G.v18muelle&&G.v18fiesta)};})()`, 90);
  console.log('· setup:', JSON.stringify(setup));
  if (!setup.ok) throw new Error('cadena V18 incompleta');
  // saltar la intro si aún está viva (a CPU ×4 la cinémática negra puede seguir activa)
  const intro1 = await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/Saltar intro/i.test(x.textContent));if(b&&b.offsetParent!==null){b.click();return 'saltada';}return 'no-estaba';})()`, 15);
  console.log('· intro:', intro1);
  await cdp.bombear(1500);

  // ---------- 1 · MISIÓN 1 «El puerto» (puerto.js): obra → reparado ----------
  await ev(cdp, ses, `(function(){const pu=window.AV.G.v18puerto; return {estado:pu.estado()};})()`, 20);
  await captura('m1_puerto_reparado', posBase(73.6, -75.2, null, 77.5, -73.5, 11, 4.2), 4);

  // ---------- 2 · MISIÓN 2 «Las Atalayas» (arco.js): reunion → encendido ----------
  await ev(cdp, ses, `(function(){const a=window.AV.G.v18arco; a.aplicar(); return {estado:a.estado ? a.estado() : '?'};})()`, 30);
  await captura('m2_atalayas_plaza', posBase(-69.2, 68.4, null, -72, 74, 9, 4), 4);
  await captura('m2_atalayas_farol', posBase(-80.7, 67.4, 23.5, -80.7, 67.4, 5.5, 1.8), 3);

  // ---------- 3 · MISIÓN 3 «El muelle» (muelle.js): plan → construido ----------
  await ev(cdp, ses, `(function(){const m=window.AV.G.v18muelle; if(m.avanzar){['plan','medido','materiales','construido'].forEach(e=>m.avanzar(e)); m.aplicar();} return {estado:m.estado ? m.estado() : '?'};})()`, 30);
  await cdp.bombear(2500);
  await captura('m3_muelle_construido', posBase(-121, -4, null, -117, -6, 10, 4), 4);

  // ---------- 4 · MISIÓN 4 «La fiesta» (fiesta.js): reunion → fiesta ----------
  await ev(cdp, ses, `(function(){const fi=window.AV.G.v18fiesta; if(fi.avanzar){fi.avanzar('reunion'); fi.aplicar();} return {estado:fi.estado ? fi.estado() : '?'};})()`, 30);
  await captura('m4_fiesta_antes', posBase(5, 98.8, null, 5, 105.4, 7.2, 3.4), 3);
  await ev(cdp, ses, `(function(){const fi=window.AV.G.v18fiesta; ['limpio','faroles','fiesta'].forEach(e=>fi.avanzar(e)); fi.aplicar(); return {estado:fi.estado()};})()`, 30);
  await cdp.bombear(2500);
  await captura('m4_fiesta_despues', posBase(5, 98.8, null, 5, 105.4, 7.2, 3.4), 4);

  // ---------- 5 · MENÚ V18 (portada sobre el mundo pausado) ----------
  const menuOk = await ev(cdp, ses, `(function(){try{const G=window.AV.G; if(G.menuModos&&G.menuModos.volver){return G.menuModos.volver()?'abierto':'no-abrio';} return 'sin-api';}catch(e){return 'err:'+e.message;}})()`, 20);
  console.log('· menu:', menuOk);
  await cdp.bombear(2500);
  await ev(cdp, ses, raf2, 30);
  {
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G;const s={};try{Object.assign(s,G.renderer.stats());}catch(e){}s.heap=+(performance.memory?(performance.memory.usedJSHeapSize/1048576).toFixed(0):0);const dlg=document.querySelector('dialog#title')||document.querySelector('dialog');s.menuDom=!!(dlg&&dlg.open);return s;})()`, 30);
    const muestras = await ev(cdp, ses, fpsMuestreo, 25);
    sv.fps_med = +pct(muestras, 0.5).toFixed(1); sv.fps_p10 = +pct(muestras, 0.1).toFixed(1); sv.fps_muestras = muestras;
    stats.vistas['menu_v18'] = sv;
    const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k288_${PERFIL}_menu_v18.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· menu_v18:', JSON.stringify(sv));
  }
  // volver al mundo (cerrar la portada) y verificar que sigue renderizando
  await ev(cdp, ses, `(function(){const d=document.querySelector('dialog#title')||document.querySelector('dialog');if(d&&d.open){d.close('');return 'cerrada';}return 'no-estaba';})()`, 15);
  await cdp.bombear(1500);
  const vuelta = await ev(cdp, ses, `(function(){const G=window.AV.G;let adv=false;try{adv=!!G.mundo.listo;}catch(e){}let c=0;try{c=G.renderer.stats().calls;}catch(e){}return {listo:adv,calls:c};})()`, 20);
  stats.vuelta_mundo = vuelta;
  console.log('· vuelta:', JSON.stringify(vuelta));

  // ---------- cierre ----------
  stats.consola_errores = consola.slice();
  fs.writeFileSync(path.join(SALIDA, `k288_${PERFIL}_${ETIQ}.json`), JSON.stringify(stats, null, 1));
  console.log('· CONSOLA ERRORES (' + consola.length + '):', JSON.stringify(consola.slice(0, 6)));
  console.log('· stats: docs/img/kimi288/k288_' + PERFIL + '_' + ETIQ + '.json');

  try {
    const info = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 8000);
    const proc = (info.processInfo || []).filter(p => p.type === 'browser');
    for (const p of proc) { try { execSync(`taskkill /F /T /PID ${p.id}`, { stdio: 'ignore' }); } catch (e) { } }
  } catch (e) { try { execSync(`taskkill /F /T /PID ${chrome.pid}`, { stdio: 'ignore' }); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message || e); process.exit(1); });
