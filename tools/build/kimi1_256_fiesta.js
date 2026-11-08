#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-256: validación visual GPU real de la misión 4
   del arco V18.3 «La fiesta de la colina» (encargo 📣 TAREAS_WEB.md 8-nov: «Para Kimi (GPU):
   AV.v18ArcoTest() y capturas de la plaza de la colina antes y después de la fiesta, con la placa
   y la tarjeta»). La lógica quedó verde en la batería oficial (v18ArcoTest 87/87, GPU real);
   aquí va lo visual: Chrome headless propio + CDP; iPhone emulado 390×844 dpr 3 CPU ×4, GPU real, ?v18=1.
   Cadena V18 como boot.js + API pública (G.v18fiesta): mundo previo (puerto/arco/muelle hechos) →
   fiesta en 'reunion' (captura «antes»: escombros con aura, 3 postes, elenco de 3) → 'fiesta'
   (captura «después»: placa, banderines, faroles encendidos, Constructor aliado) + tarjeta «¡Arco completo!».
   Salida: docs/img/kimi256/k256_<vista>.jpg y k256_fiesta.json

   Uso: node tools/build/kimi1_256_fiesta.js
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

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi256');
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
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(JSON.stringify(d.error))) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(m, p, s, t) { const id = ++this.id; const msg = { id, method: m, params: p || {} }; if (s) msg.sessionId = s; this.ws.send(JSON.stringify(msg)); return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + m)); } }, t); }); }
  bombear(ms) { return new Promise(r => setTimeout(r, ms)); }
}
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception || r.exceptionDetails.text).slice(0, 400)); return r.result ? r.result.value : undefined; }

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c256-'));
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

  // Ir a la plaza de la colina y asentar la zona
  await ev(cdp, ses, `(function(){window.AV.teleport(5,99.5);return 1;})()`, 30);
  for (let i = 0; i < 90; i++) {
    const s = await ev(cdp, ses, `(function(){try{const st=window.AV.G.mundo.streaming.stats();return {t:st.trabajos,d:st.descargando};}catch(e){return {t:-1,d:-1};}})()`, 15);
    if (s && s.t === 0 && s.d === 0) break;
    await cdp.bombear(1000);
  }
  // Cadena V18 como boot.js + misión en marcha (mismo truco que kimi1_249_muelle.js)
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
    const V=G.v18, fi=G.v18fiesta;
    if(!fi) return {error:'sin v18fiesta'};
    V.cambiarMundo('puente_villa','reparado');
    V.cambiarMundo('puerto_mina','reparado');
    V.cambiarMundo('arco_atalayas','encendido');
    V.cambiarMundo('arco_muelle','construido');
    fi.avanzar('reunion'); fi.aplicar();
    return {estado:fi.estado(), valido:fi.valido, elenco:fi.elenco(), sitio:fi.SITIO ? {plaza:fi.SITIO.plaza, ing:fi.SITIO.ing, con:fi.SITIO.con, tue:fi.SITIO.tue} : null};})()`, 90);
  console.log('· setup:', JSON.stringify(setup));
  if (setup.error) throw new Error(setup.error);
  await cdp.bombear(3000); // elenco caminando, modelos cargando, calcElenco por distancia

  const stats = { pantalla: 'movil 390x844@3 cpuX4 (iPhone emulado, tactil)', setup, vistas: {}, consola_errores: consola.slice() };
  const raf2 = `new Promise(r=>{let n=0;const f=()=>{if(++n>2)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f)})`;
  const fpsJS = `new Promise(r=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<1200)requestAnimationFrame(f);else r(+(n/((performance.now()-t0)/1000)).toFixed(1))};requestAnimationFrame(f)})`;

  async function captura(id, jsPos, espera) {
    try {
    await ev(cdp, ses, jsPos, 30);
    for (let i = 0; i < (espera || 2); i++) { await cdp.bombear(600); await ev(cdp, ses, jsPos, 15); }
    try { await ev(cdp, ses, `(function(){try{window.AV.G.dialogo.clear();}catch(e){}return 1;})()`, 10); } catch (e) { }
    await ev(cdp, ses, raf2, 30);
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G,fi=G.v18fiesta;
      const s=Object.assign({estado:fi.estado(),elenco:fi.elenco(),px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());
      return s;})()`, 30);
    sv.fps = await ev(cdp, ses, fpsJS, 20);
    stats.vistas[id] = sv;
    const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k256_${id}.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· ' + id + ':', JSON.stringify(sv));
    } catch (e) { console.error('· FALLO en captura', id, ':', (e.message || e).slice(0, 300)); throw e; }
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

  const el = await ev(cdp, ses, `(function(){const fi=window.AV.G.v18fiesta; if(!fi.elenco()) { try{fi.paso(0.5,false);}catch(e){} } return {elenco:fi.elenco(), estado:fi.estado()};})()`, 20);
  console.log('· elenco:', JSON.stringify(el));
  stats.elenco_antes = el;

  // ---------- 1 · estado 'reunion': escombros + postes + elenco («antes») ----------
  await captura('plaza_antes', posBase(5, 98.8, null, 5, 105.4, 7.2, 3.4), 3);
  const p0 = await worldPos('v18-fiesta-poste-0'), pl = await worldPos('v18-fiesta-placa'), e0 = await worldPos('v18-fiesta-escombro-0');
  console.log('· poste0:', JSON.stringify(p0), '· escombro0:', JSON.stringify(e0), '· placa:', JSON.stringify(pl));
  stats.poste0 = p0; stats.escombro0 = e0; stats.placa_antes = pl;
  if (p0 && p0.p) await captura('poste_percha', posBase(p0.p.x + 3.2, p0.p.z + 2.4, p0.p.y + 4.6, p0.p.x, p0.p.z, 4.6, 1.6), 3);

  // ---------- 2 · estado 'fiesta': placa + banderines + faroles + aliado («después») ----------
  const fin = await ev(cdp, ses, `(function(){const fi=window.AV.G.v18fiesta;
    fi.avanzar('limpio'); fi.aplicar();
    fi.avanzar('faroles'); fi.aplicar();
    fi.avanzar('fiesta'); fi.aplicar();
    return {estado:fi.estado(), elenco:fi.elenco()};})()`, 30);
  console.log('· fiesta:', JSON.stringify(fin));
  stats.fiesta = fin;
  await cdp.bombear(2500);
  await captura('plaza_despues', posBase(5, 98.8, null, 5, 105.4, 7.2, 3.4), 3);
  const pl2 = await worldPos('v18-fiesta-placa'), bd = await worldPos('v18-fiesta-banderines');
  stats.placa_despues = pl2; stats.banderines = bd;
  console.log('· placa:', JSON.stringify(pl2), '· banderines:', JSON.stringify(bd));
  if (pl2 && pl2.p) await captura('placa_cerca', posBase(pl2.p.x - 2.4, pl2.p.z - 2.2, null, pl2.p.x, pl2.p.z, 3.6, 1.8), 3);

  // tarjeta «¡Arco completo!»
  const tar = await ev(cdp, ses, `(function(){const fi=window.AV.G.v18fiesta;return {abierta:fi.tarjeta()};})()`, 20);
  stats.tarjeta = tar;
  await cdp.bombear(900);
  await ev(cdp, ses, raf2, 30);
  const foto2 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, 'k256_tarjeta_arco.jpg'), Buffer.from(foto2.data, 'base64'));
  console.log('· tarjeta_arco:', JSON.stringify(tar));
  try { await ev(cdp, ses, `(function(){window.AV.G.ui.hideCard();return 1;})()`, 10); } catch (e) { }

  // ---------- cierre ----------
  stats.consola_errores = consola.slice();
  fs.writeFileSync(path.join(SALIDA, 'k256_fiesta.json'), JSON.stringify(stats, null, 1));
  console.log('· CONSOLA ERRORES (' + consola.length + '):', JSON.stringify(consola.slice(0, 6)));
  console.log('· stats: docs/img/kimi256/k256_fiesta.json');

  try {
    const info = await cdp.call('SystemInfo.getProcessInfo', {}, undefined, 8000);
    const proc = (info.processInfo || []).filter(p => p.type === 'browser');
    for (const p of proc) { try { execSync(`taskkill /F /T /PID ${p.id}`, { stdio: 'ignore' }); } catch (e) { } }
  } catch (e) { try { execSync(`taskkill /F /T /PID ${chrome.pid}`, { stdio: 'ignore' }); } catch (e2) { } }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message || e); process.exit(1); });
