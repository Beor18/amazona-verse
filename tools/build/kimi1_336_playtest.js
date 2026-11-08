#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-336: playtest «como un niño nuevo» en ESCRITORIO
   (bloque 📣 coordinadora 8-nov ~17:45 UTC). Recorrido: portada → creador (defaults) → cap. 1
   (spawn + movimiento con teclado real) → menú V18 → duelo (entreno + golpes reales) →
   arco V18.3 (Atalayas, elenco) → Family Quest (cuento en cadena guardado).
   Por beat: FPS med/p10 (12 s), draw calls/tris/heap, captura y chequeos de fricción
   (HUD/objetivo visibles, textos que desbordan, botones, consola 0 errores).
   Los beats usan entrada real (clics de ratón / teclado CDP) donde es práctico; el estado de
   las actividades V18 se prepara por su API pública (mismo criterio que kimi1_288/312; los
   clicks sintéticos no son «gesto de confianza» y no cargan los módulos V18 por sí solos).

   Uso: node tools/build/kimi1_336_playtest.js [--etiqueta r1]
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
const ETIQ = arg('--etiqueta') || 'r1';
const ANCHO = 1600, ALTO = 900;

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi336');
fs.mkdirSync(SALIDA, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
function servir() {
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    if (p === '/') p = '/index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
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
const tecla = (cdp, ses, tipo, codigo, clave, vk) => cdp.call('Input.dispatchKeyEvent', { type: tipo, code: codigo, key: clave, windowsVirtualKeyCode: vk }, ses);
async function pulsar(cdp, ses, codigo, clave, vk, ms) { await tecla(cdp, ses, 'keyDown', codigo, clave, vk); await cdp.bombear(ms || 120); await tecla(cdp, ses, 'keyUp', codigo, clave, vk); }
async function mantener(cdp, ses, codigo, clave, vk, ms) { await tecla(cdp, ses, 'keyDown', codigo, clave, vk); await cdp.bombear(ms); await tecla(cdp, ses, 'keyUp', codigo, clave, vk); }
async function raton(cdp, ses, tipo, x, y) { await cdp.call('Input.dispatchMouseEvent', { type: tipo, x, y, button: 'left', clickCount: tipo === 'mousePressed' || tipo === 'mouseReleased' ? 1 : 0 }, ses); }
async function clic(cdp, ses, x, y) { await raton(cdp, ses, 'mouseMoved', x, y); await raton(cdp, ses, 'mousePressed', x, y); await cdp.bombear(60); await raton(cdp, ses, 'mouseReleased', x, y); }

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), `kimi1c336-${ETIQ}-`));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`, '--hide-scrollbars', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'], { detached: true, stdio: 'ignore' });
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
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');

  const stats = { perfil: `escritorio ${ANCHO}x${ALTO}@1 (niño nuevo, ?v18=1)`, etiqueta: ETIQ, head: null, beats: {}, fricciones: [], consola_errores: [] };
  try { stats.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { }
  const fpsMuestreo = `new Promise(r=>{const v=[];let n=0;const t0=performance.now();let ult=t0;const iv=setInterval(()=>{const t=performance.now();v.push(+(n/((t-ult)/1000)).toFixed(1));n=0;ult=t;if(t-t0>=12000){clearInterval(iv);r(v)}},1000);const f=()=>{n++;requestAnimationFrame(f)};requestAnimationFrame(f);setTimeout(()=>{try{clearInterval(iv);}catch(e){}r(v.concat(['WATCHDOG']))},14500)})`;
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const fjson = () => fs.writeFileSync(path.join(SALIDA, `k336_${ETIQ}.json`), JSON.stringify(stats, null, 1));

  async function hud() {
    return await ev(cdp, ses, `(function(){const q=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return {vis:!(cs.display==='none'||cs.visibility==='hidden')&&r.width>0&&r.height>0,x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),txt:(e.textContent||'').trim().slice(0,80),overflow:e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2};};
      const minimapa=document.querySelector('#minimapa canvas')||document.querySelector('#minimapa');
      return {quest:q('#quest'),acts:(document.querySelectorAll('#acts .btn')||[]).length,stick:!!document.querySelector('#stick'),minimapa:minimapa?{w:Math.round(minimapa.getBoundingClientRect().width)}:null,keyhint:(document.querySelector('#keyhint')||{textContent:''}).textContent.trim().slice(0,120)};})()`, 20);
  }
  async function medir(id, extras) {
    const hv = await hud();
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G;const s=Object.assign({px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());try{const inf=G.renderer.renderer.info;s.geo=inf.memory.geometries;s.tex=inf.memory.textures;s.prog=inf.programs.length;}catch(e){}s.heap=+(performance.memory?(performance.memory.usedJSHeapSize/1048576).toFixed(0):0);return s;})()`, 30);
    const muestras = await ev(cdp, ses, fpsMuestreo, 25);
    const wd = muestras[muestras.length - 1] === 'WATCHDOG';
    const nums = muestras.filter(x => typeof x === 'number' && isFinite(x));
    sv.fps_med = nums.length ? +pct(nums, 0.5).toFixed(1) : 0; sv.fps_p10 = nums.length ? +pct(nums, 0.1).toFixed(1) : 0; sv.fps_watchdog = wd; sv.hud = hv;
    if (extras) Object.assign(sv, extras);
    stats.beats[id] = sv;
    const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k336_${ETIQ}_${id}.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· ' + id + ':', JSON.stringify({ fps: sv.fps_med + '/' + sv.fps_p10, calls: sv.calls, ktris: sv.ktris, heap: sv.heap }));
    fjson();
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

  // ─── b0: portada → creador (defaults) → Empezar (mismo camino real que preparar_js del arnés) ───
  const portada = await ev(cdp, ses, `(function(){const t=[...document.querySelectorAll('#menu-modos .tarjeta, #menu-modos [data-modo], .modo-tarjeta')];return {tarjetas:t.length,titulo:(document.querySelector('#menu-modos h1, #menu-modos h2')||{textContent:''}).textContent.trim().slice(0,60)};})()`, 15);
  console.log('· portada:', JSON.stringify(portada));
  stats.beats.portada = portada;
  // portada: el botón Jugar del formulario del diálogo (mismo selector que preparar_js)
  const b0click = await ev(cdp, ses, `(function(){const t=document.getElementById('title');if(!t||!t.open)return 'portada-no-abierta';const b=t.querySelector('form[method=dialog] button');if(!b)return 'sin-boton-jugar';b.click();return 'clic-jugar';})()`, 15);
  console.log('· portada →', b0click);
  await cdp.bombear(1500);
  // creador: valores por defecto + #p-save (Empezar la aventura)
  const bc = await ev(cdp, ses, `(function(){const cr=document.getElementById('creator');if(!cr)return 'sin-creador';const s=document.getElementById('p-save');if(!s)return 'sin-p-save';s.click();return 'clic-empezar';})()`, 15);
  console.log('· creador →', bc);
  // esperar al mundo
  const tm = Date.now(); let listo = false;
  while (Date.now() - tm < 180000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) throw new Error('el mundo no arrancó tras el creador');
  await cdp.bombear(2500);
  // un niño mira la intro ~6 s y luego salta
  await cdp.bombear(6000);
  try { await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/saltar intro/i.test(x.textContent));if(b&&b.offsetParent!==null){b.click();return 1;}return 0;})()`, 10); } catch (e) { }
  await cdp.bombear(1500);
  console.log('· entrada completada');

  // ─── b1: spawn cap1 (primer contacto con el HUD) ───
  await medir('b1_spawn');

  // ─── b2: movimiento con teclado real (caminar → volar → subir) ───
  await clic(cdp, ses, 800, 450); // foco al lienzo
  const p0 = await ev(cdp, ses, `(function(){const G=window.AV.G;return {x:+G.S.pos.x.toFixed(2),y:+G.S.pos.y.toFixed(2),z:+G.S.pos.z.toFixed(2),flying:G.fisica.MOVE.flying};})()`, 15);
  await mantener(cdp, ses, 'KeyA', 'a', 65, 1500);
  await pulsar(cdp, ses, 'KeyV', 'v', 86, 120);
  await cdp.bombear(600);
  await mantener(cdp, ses, 'Space', ' ', 32, 1200);
  const p1 = await ev(cdp, ses, `(function(){const G=window.AV.G;return {x:+G.S.pos.x.toFixed(2),y:+G.S.pos.y.toFixed(2),z:+G.S.pos.z.toFixed(2),flying:G.fisica.MOVE.flying,grounded:G.fisica.MOVE.grounded};})()`, 15);
  const movio = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  console.log('· movimiento:', JSON.stringify({ p0, p1, volo: p1.flying, subio: +(p1.y - p0.y).toFixed(2), camino_m: +movio.toFixed(2) }));
  stats.beats.b2_movimiento = { p0, p1, volo: p1.flying, subio_m: +(p1.y - p0.y).toFixed(2), camino_m: +movio.toFixed(2) };
  if (!p1.flying) stats.fricciones.push('V no despegó tras pulsar V (niño nuevo no puede volar)');
  if (movio < 0.5) stats.fricciones.push('caminar: A no movió a Vittata (' + movio.toFixed(2) + ' m)');
  await medir('b2_volando', { volo: p1.flying });
  // aterrizar y dejarla quieta en el suelo
  await pulsar(cdp, ses, 'KeyV', 'v', 86, 120);
  await cdp.bombear(1500);

  // ─── módulos V18 (carga explícita; los clicks sintéticos no son gesto de confianza) ───
  const mods = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G,A=window.AVE;
    const cad=[['src/game/v18/progreso.js','AVV18Progreso'],['src/game/v18/habilidades.js','AVV18Habilidades'],['src/game/v18/fx_poderes.js','AVV18Fx'],['content/comun/personajes_v18.js',null],['src/game/v18/combate.js','AVV18Combate'],['src/game/v18/duelo2.js','AVV18Duelo2'],['src/game/v18/nuevas.js','AVV18Nuevas'],['src/game/v18/evolucion.js','AVV18Evolucion'],['src/game/v18/arco.js','AVV18Arco'],['src/game/v18/puerto.js','AVV18Puerto'],['src/game/v18/fiesta.js','AVV18Fiesta'],['src/game/familia_aventuras.js','AVFamiliaAventuras']];
    const hechos=[];
    for(const c of cad){try{await A.assets.script(c[0]);if(c[1])window[c[1]](G);hechos.push(c[0]);}catch(e){hechos.push('FALLO '+c[0]+': '+e.message);}}
    return hechos;})()`, 150);
  console.log('· modulos:', mods.filter(m => /^FALLO/.test(m)).length ? JSON.stringify(mods) : mods.length + ' ok');

  // ─── b3: menú V18 (portada de modos encima del mundo) ───
  await ev(cdp, ses, `(function(){try{window.AV.G.menuModos.volver();}catch(e){}return 1;})()`, 15);
  await cdp.bombear(1200);
  const menu = await ev(cdp, ses, `(function(){const d=document.querySelector('#menu-modos')||document.querySelector('dialog#title');const t=[...document.querySelectorAll('#menu-modos .tarjeta, #menu-modos [data-modo]')];return {abierto:!!d,tarjetas:t.length,desborda:t.filter(x=>x.scrollWidth>x.clientWidth+2||x.scrollHeight>x.clientHeight+2).length};})()`, 15);
  console.log('· menú V18:', JSON.stringify(menu));
  const fotoMenu = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k336_${ETIQ}_b3_menu.jpg`), Buffer.from(fotoMenu.data, 'base64'));
  stats.beats.b3_menu = menu;
  if (!menu.abierto || menu.tarjetas < 10) stats.fricciones.push('menú V18: no abrió o faltan tarjetas (' + JSON.stringify(menu) + ')');
  if (menu.desborda) stats.fricciones.push('menú V18: ' + menu.desborda + ' tarjetas con texto desbordado');
  await ev(cdp, ses, `(function(){const d=document.querySelector('dialog#title');if(d&&d.open)d.close();try{window.AV.G.menuModos.cerrar&&window.AV.G.menuModos.cerrar();}catch(e){}return 1;})()`, 15);
  await cdp.bombear(1200);

  // ─── b4: duelo (explanada, entreno real con golpes de tecla) ───
  const arena = await ev(cdp, ses, `(function(){const G=window.AV.G;const a=G.renderer.scene.getObjectByName('v18_arena');if(!a)return null;return {x:+a.position.x.toFixed(1),y:+a.position.y.toFixed(1),z:+a.position.z.toFixed(1)};})()`, 15);
  if (arena) {
    await ev(cdp, ses, posBase(arena.x - 8, arena.z, null, arena.x, arena.z, 11, 4.5), 30);
    await cdp.bombear(1500);
    const duelo = await ev(cdp, ses, `(async function(){const G=window.AV.G;try{G.v18combate.iniciar({entreno:true});await new Promise(r2=>setTimeout(r2,1500));const st=G.v18combate.estado();return {fase:st.fase,ok:true};}catch(e){return {ok:false,err:e.message};}})()`, 60);
    console.log('· duelo:', JSON.stringify(duelo));
    if (duelo.ok) {
      await clic(cdp, ses, 800, 450);
      for (let i = 0; i < 6; i++) { await pulsar(cdp, ses, 'KeyE', 'e', 69, 100); await cdp.bombear(700); }
      const st2 = await ev(cdp, ses, `(function(){try{const s=window.AV.G.v18combate.estado();return {fase:s.fase,hp:s.hpCampeona!==undefined?s.hpCampeona:s.campeona};}catch(e){return null;}})()`, 15);
      console.log('· duelo tras golpes:', JSON.stringify(st2));
      await medir('b4_duelo', { fase: st2 && st2.fase });
    } else stats.fricciones.push('duelo no arrancó: ' + duelo.err);
    try { await ev(cdp, ses, `(function(){try{window.AV.G.v18combate.salir();}catch(e){}return 1;})()`, 15); } catch (e) { }
    await cdp.bombear(1000);
  } else stats.fricciones.push('v18_arena no encontrada en la escena');

  // ─── b5: arco V18.3 (Atalayas con elenco despierto) ───
  await ev(cdp, ses, posBase(-69.2, 68.4, null, -69.2, 68.4, 12, 5), 30);
  await cdp.bombear(1500);
  const arco = await ev(cdp, ses, `(async function(){const G=window.AV.G;try{if(G.v18arco&&G.v18arco.avanzar){try{G.v18arco.avanzar('reunion');}catch(e){}}if(G.v18&&G.v18.cambiarMundo){try{G.v18.cambiarMundo('puerto_mina','reparado');}catch(e){}}for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,1000));const e=(G.v18arco&&G.v18arco.elenco)?G.v18arco.elenco():null;if(e)return {elenco:true,espera_s:i+1,estado:(G.v18arco&&G.v18arco.estado)?G.v18arco.estado():null};}const e2=(G.v18arco&&G.v18arco.elenco)?G.v18arco.elenco():null;return {elenco:!!e2,espera_s:15,estado:(G.v18arco&&G.v18arco.estado)?G.v18arco.estado():null};}catch(err){return {err:err.message};}})()`, 80);
  console.log('· arco:', JSON.stringify(arco).slice(0, 300));
  const arcoOk = arco && arco.elenco && arco.estado === 'reunion';
  if (!arcoOk) stats.fricciones.push('arco: elenco no despertó en Atalayas: ' + JSON.stringify(arco).slice(0, 200));
  await medir('b5_arco', { elenco: arcoOk });

  // ─── b6: Family Quest (cuento en cadena por clics reales) ───
  const fam = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G;
    try{
      const d=document.getElementById('b-diary');
      if(d){d.click();await new Promise(r=>setTimeout(r,1200));}
      const b=document.querySelector('[data-fq-abrir]');
      if(b){b.scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,600));b.click();}
      await new Promise(r=>setTimeout(r,1200));
      return {abrio:!!b||(G.familyQuest&&!!G.familyQuest.actual)};
    }catch(e){return {err:e.message};}})()`, 45);
  console.log('· family abrir:', JSON.stringify(fam));
  const cuento = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G;
    try{const F=G.familyQuest;if(!F)return {ok:false,err:'sin módulo'};
      if(!F.actual)F.abrir();
      F.empezar('cuento');
      await new Promise(r=>setTimeout(r,800));
      for(let i=0;i<4;i++){const b=document.getElementById('fq-cuento-'+(i%3));if(!b)return {ok:false,err:'sin botón fq-cuento-'+(i%3),hecha:F.hecha('cuento')};b.click();await new Promise(r=>setTimeout(r,600));}
      await new Promise(r=>setTimeout(r,800));
      return {ok:true,hecha:F.hecha('cuento')};
    }catch(e){return {ok:false,err:e.message};}})()`, 60);
  console.log('· family cuento:', JSON.stringify(cuento));
  const fotoFam = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k336_${ETIQ}_b6_family.jpg`), Buffer.from(fotoFam.data, 'base64'));
  stats.beats.b6_family = { abrio: fam && fam.abrio, cuento };
  if (!cuento.ok || !cuento.hecha) stats.fricciones.push('family: cuento en cadena no quedó guardado: ' + JSON.stringify(cuento).slice(0, 200));
  try { await ev(cdp, ses, `(function(){try{window.AV.G.familyQuest.cerrar();}catch(e){}return 1;})()`, 15); } catch (e) { }

  // ─── cierre ───
  const fin = await ev(cdp, ses, `(function(){const G=window.AV.G;const s=G.renderer.stats();const inf=G.renderer.renderer.info;return {calls:s.calls,ktris:s.ktris,heap:+(performance.memory?(performance.memory.usedJSHeapSize/1048576).toFixed(0):0),geo:inf.memory.geometries,tex:inf.memory.textures};})()`, 30);
  stats.final = fin;
  stats.consola_errores = consola.slice(0, 20);
  fjson();
  console.log('· final:', JSON.stringify(fin));
  console.log('· fricciones:', stats.fricciones.length ? JSON.stringify(stats.fricciones, null, 1) : 'ninguna');
  console.log('· consola errores:', consola.length);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  try { srv.close(); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
