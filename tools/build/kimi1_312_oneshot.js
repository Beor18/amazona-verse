#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-312: medición con GPU real del one-shot de la nube
   (duelo 2ª pasada + claridad minigolf/retos + Chispa aviso; commits 660a9ca5 + 4837e142 + 01761dcb,
   post-3adad49). Vistas: spawn (baseline), minigolf (hoyo activo con su HUD) y explanada del duelo.
   Por vista: teleport/estado + asentado (cola 0/0) + 12 s de muestreo rAF (FPS med/p10) + stats
   (draw calls/tris/heap/memoria GPU) + captura. Consola de errores vía CDP Log.

   Uso: node tools/build/kimi1_312_oneshot.js --perfil escritorio|movil [--etiqueta r1]
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

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi312');
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

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), `kimi1c312-${PERFIL}-`));
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
  const raf2 = `new Promise(r=>{let n=0;const f=()=>{if(++n>2)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f);setTimeout(()=>r(-1),8000)})`;
  const fpsMuestreo = `new Promise(r=>{const v=[];let n=0;const t0=performance.now();let ult=t0;const iv=setInterval(()=>{const t=performance.now();v.push(+(n/((t-ult)/1000)).toFixed(1));n=0;ult=t;if(t-t0>=12000){clearInterval(iv);r(v)}},1000);const f=()=>{n++;requestAnimationFrame(f)};requestAnimationFrame(f);setTimeout(()=>{try{clearInterval(iv);}catch(e){}r(v.concat(['WATCHDOG']))},14500)})`;
  const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

  async function asentar() {
    for (let i = 0; i < 90; i++) {
      const s = await ev(cdp, ses, `(function(){try{const st=window.AV.G.mundo.streaming.stats();return {t:st.trabajos,d:st.descargando};}catch(e){return {t:0,d:0};}})()`, 15);
      if (s && s.t === 0 && s.d === 0) break;
      await cdp.bombear(1000);
    }
  }
  async function medir(id) {
    console.log('· medir ' + id + ' (clear)');
    try { await ev(cdp, ses, `(function(){try{window.AV.G.dialogo.clear();}catch(e){}return 1;})()`, 10); } catch (e) { }
    await asentar();
    const rafOk = await ev(cdp, ses, raf2, 30);
    console.log('· medir ' + id + ' (raf ' + rafOk + ')');
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G;const s=Object.assign({px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());try{const inf=G.renderer.renderer.info;s.geo=inf.memory.geometries;s.tex=inf.memory.textures;s.prog=inf.programs.length;}catch(e){}s.heap=+(performance.memory?(performance.memory.usedJSHeapSize/1048576).toFixed(0):0);s.vis=document.visibilityState;return s;})()`, 30);
    const muestras = await ev(cdp, ses, fpsMuestreo, 25);
    const wd = muestras[muestras.length - 1] === 'WATCHDOG';
    const nums = muestras.filter(x => typeof x === 'number' && isFinite(x));
    sv.fps_med = nums.length ? +pct(nums, 0.5).toFixed(1) : 0; sv.fps_p10 = nums.length ? +pct(nums, 0.1).toFixed(1) : 0; sv.fps_watchdog = wd; sv.fps_muestras = nums;
    stats.vistas[id] = sv;
    const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k312_${PERFIL}_${id}.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· ' + id + ':', JSON.stringify(sv));
    fs.writeFileSync(path.join(SALIDA, `k312_${PERFIL}_${ETIQ}.json`), JSON.stringify(stats, null, 1));
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

  // entrar al mundo
  await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/¡A jugar!/i.test(x.textContent));if(b){b.click();return 'cerrada';}return 'no-estaba';})()`, 15);
  await cdp.bombear(1200);
  try { await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/Saltar intro/i.test(x.textContent));if(b&&b.offsetParent!==null){b.click();return 1;}return 0;})()`, 10); } catch (e) { }
  await cdp.bombear(1500);

  // cargar módulos V18 del one-shot explícitamente (los clicks sintéticos no son «gesto de confianza»
  // y alPrimerGesto no los carga; mismo truco que kimi1_288_arco.js)
  const mods = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G,A=window.AVE;
    const cad=[['src/game/v18/progreso.js','AVV18Progreso'],['src/game/v18/habilidades.js','AVV18Habilidades'],['src/game/v18/fx_poderes.js','AVV18Fx'],['content/comun/personajes_v18.js',null],['src/game/v18/combate.js','AVV18Combate'],['src/game/v18/duelo2.js','AVV18Duelo2'],['src/game/v18/minigolf.js','AVV18Minigolf']];
    const hechos=[];
    for(const c of cad){try{await A.assets.script(c[0]);if(c[1])window[c[1]](G);hechos.push(c[0]);}catch(e){hechos.push('FALLO '+c[0]+': '+e.message);}}
    return hechos;})()`, 120);
  console.log('· modulos:', JSON.stringify(mods));

  // 1) spawn baseline
  await medir('spawn');

  // 2) minigolf: llevar a Vittata al hoyo y empezar partida (API pública G.v18minigolf.irYJugar)
  const mg = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G;
    if(!G.v18minigolf){return 'sin-modulo';}
    const ok=G.v18minigolf.irYJugar();
    await new Promise(r=>setTimeout(r,1200));
    return ok?'jugando':'no-inicio';})()`, 30);
  console.log('· minigolf irYJugar:', mg);
  await medir('minigolf');
  // salir del hoyo para la siguiente vista
  await ev(cdp, ses, `(function(){try{window.AV.G.v18minigolf.salir();}catch(e){}return 1;})()`, 15);
  await cdp.bombear(800);

  // 3) explanada del duelo: centro del marcador v18_arena (combate.js)
  const arena = await ev(cdp, ses, `(function(){const G=window.AV.G;const a=G.renderer.scene.getObjectByName('v18_arena');if(!a)return null;return {x:+a.position.x.toFixed(1),y:+a.position.y.toFixed(1),z:+a.position.z.toFixed(1)};})()`, 15);
  console.log('· arena:', JSON.stringify(arena));
  if (arena) {
    await ev(cdp, ses, posBase(arena.x - 9, arena.z, null, arena.x, arena.z, 10, 4.5), 30);
    await cdp.bombear(1200);
    await medir('explanada_duelo');
  }

  stats.consola_errores = consola.slice(0, 20);
  fs.writeFileSync(path.join(SALIDA, `k312_${PERFIL}_${ETIQ}.json`), JSON.stringify(stats, null, 1));
  console.log('· consola errores:', consola.length);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200));
  try { console.log('· ' + execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(AQUI, 'kimi2_mata_perfil.ps1')}" ${path.basename(perf)}`, { timeout: 30000 }).toString().trim()); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  try { srv.close(); } catch (e) { }
  process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
