#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-341: medición SEPARADA del parche eef133a0
   «captura del cómic sin tirón» (📣 coordinadora → Kimi 1, TAREAS_WEB.md 8-nov 21:00 UTC:
   «mide eef133a0 por separado: pausas de más de 50 ms al saltar los eventos del cómic»;
   condiciones 📣 20:30: mismo escenario y perfil, antes/después, una fila por parche).

   A/B por archivo único `src/game/eventos.js` (eef133a0^ = «antes» / HEAD = «después»; el
   swap lo hace quien corre la herramienta, no esta). Escenario: ESCRITORIO 1600×900@1, GPU real,
   entrada real portada → creador (defaults) → Empezar → cap. 1 revelado (mismo camino que
   preparar_js / kimi1_336). Con el mundo dibujándose se dispara `G.eventos.log()` de las 14
   claves CAPTURA (las que piden fondo de cómic), espaciadas; un muestreo rAF continuo mide
   tiempos de cuadro, pausas >50/100/200/500 ms y su distancia al evento más cercano, por
   ventana [evento, evento+4 s]. Verificación de que la captura ocurrió en el brazo medido:
   `G.mangaFondos` (el módulo guarda el JPEG por momento) + WebGL2 detectado.

   Uso: node tools/build/kimi1_338_comic.js --etiqueta k338-antes-r1
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

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi338');
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

// las 14 claves que piden fondo de cómic (CAPTURA en eventos.js), en orden de historia
const CLAVES = ['PlayerCharacterCreated', 'LandSelected', 'ShelterRelocated', 'LumaChoice', 'ListenChoice', 'HelmChosen', 'TradeoffSeen', 'FragmentsOrdered', 'PlanMade', 'FirstHardLanding', 'FirstSplash', 'ShelterFlooded', 'FirstChallengeRecord', 'ChapterCompleted'];

(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), `kimi1c338-${ETIQ}-`));
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
    try { const d = JSON.parse(m.data); if (d.method === 'Log.entryAdded' && d.params && d.params.entry && (d.params.entry.level === 'error' || d.params.entry.level === 'warning')) consola.push(d.params.entry.level + ': ' + d.params.entry.text); } catch (e) { }
  });
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');

  const stats = { perfil: `escritorio ${ANCHO}x${ALTO}@1 (A/B eventos.js, entrada real)`, etiqueta: ETIQ, head: null, webgl2: null, claves: CLAVES.length, beats: {}, consola_errores: [] };
  try { stats.head = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch (e) { }

  // ─── entrada real: portada → creador (defaults) → Empezar → cap.1 revelado ───
  const portada = await ev(cdp, ses, `(function(){const t=[...document.querySelectorAll('#modos [data-modo]')];return {tarjetas:t.length};})()`, 15);
  console.log('· portada:', JSON.stringify(portada));
  const b0click = await ev(cdp, ses, `(function(){const t=document.getElementById('title');if(!t||!t.open)return 'portada-no-abierta';const b=t.querySelector('form[method=dialog] button');if(!b)return 'sin-boton-jugar';b.click();return 'clic-jugar';})()`, 15);
  console.log('· portada →', b0click);
  await cdp.bombear(1500);
  const bc = await ev(cdp, ses, `(function(){const cr=document.getElementById('creator');if(!cr)return 'sin-creador';const s=document.getElementById('p-save');if(!s)return 'sin-p-save';s.click();return 'clic-empezar';})()`, 15);
  console.log('· creador →', bc);
  const tm = Date.now(); let listo = false;
  while (Date.now() - tm < 180000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { listo = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!listo) throw new Error('el mundo no arrancó tras el creador');
  await cdp.bombear(2500);
  const tcar = Date.now();
  while (Date.now() - tcar < 90000) { try { if (await ev(cdp, ses, `(function(){const c=document.getElementById('carga');return !c||!c.classList.contains('carga-vis');})()`, 10, false)) break; } catch (e) { } await cdp.bombear(0.5); }
  const tint = Date.now();
  while (Date.now() - tint < 30000) { try { if (await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/saltar intro/i.test(x.textContent));if(b&&b.offsetParent!==null){b.click();return true;}return false;})()`, 10)) break; } catch (e) { } await cdp.bombear(0.5); }
  await cdp.bombear(1500);
  console.log('· entrada completada');

  // webgl2 y estado previo
  const previo = await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G;let w2=false;try{w2=G.renderer.renderer.getContext() instanceof WebGL2RenderingContext;}catch(e){}
    return {webgl2:w2, capturas0:Object.keys(G.mangaFondos||{}), pos:{x:+G.S.pos.x.toFixed(1),y:+G.S.pos.y.toFixed(1),z:+G.S.pos.z.toFixed(1)}, s:G.renderer.stats()};})()`, 20);
  stats.webgl2 = previo.webgl2;
  console.log('· previo:', JSON.stringify(previo));

  // ─── medición: muestreo rAF continuo + disparo de las 14 claves CAPTURA ───
  const SIN_EV = process.argv.includes('--sin-eventos'); // control: mismo escenario sin disparar eventos
  const MEDIDA = `new Promise(async (res)=>{
    const AV=window.AV, G=AV.G, CLAVES=${JSON.stringify(CLAVES)}, SINEV=${SIN_EV};
    const deltas=[], marcas=[]; let ult=performance.now(); const t0=ult;
    const saltar=[...document.querySelectorAll('button')].find(x=>/saltar intro/i.test(x.textContent)); if(saltar&&saltar.offsetParent!==null) saltar.click();
    const f=()=>{const t=performance.now();deltas.push(+(t-ult).toFixed(2));ult=t;requestAnimationFrame(f)}; requestAnimationFrame(f);
    const dormir=ms=>new Promise(r=>setTimeout(r,ms));
    // PROBE QA-220: diff de programas por evento (cacheKey) para nombrar los que compila cada foto
    const progAntes=(()=>{try{return (G.renderer.renderer.info.programs||[]).map(p=>p.cacheKey);}catch(e){return [];}})();
    const progNuevosPorEvento=[];
    // PROBE QA-220: cronometra llamadas GL y del cómic que tarden >30 ms, con pila corta
    const glLentas=[];
    try{
      const P=WebGL2RenderingContext.prototype, NOMES=['blitFramebuffer','readPixels','getBufferSubData','fenceSync','clientWaitSync','getSyncParameter','flush','finish','texImage2D','texSubImage2D','bufferData','bufferSubData','drawElements','drawArrays','compileShader','linkProgram','getProgramParameter','getShaderParameter','getProgramInfoLog','getShaderInfoLog'];
      for(const n of NOMES){ const o=P[n]; if(typeof o!=='function')continue;
        P[n]=function(){ const a=performance.now(); try{return o.apply(this,arguments);} finally{const d=performance.now()-a; if(d>30) glLentas.push({m:n,d:+d.toFixed(1),t:+(a-t0).toFixed(0),st:new Error().stack.split('\\n').slice(1,4).join(' | ').slice(0,300)});} };
      }
    }catch(e){}
    const eventos=[];
    const capturaLog=[]; // (t, claves de mangaFondos) para saber cuándo acabó cada captura
    const pol=setInterval(()=>{try{capturaLog.push({t:+(performance.now()-t0).toFixed(0), n:Object.keys(G.mangaFondos||{}).length, k:Object.keys(G.mangaFondos||{}).join(','), marco:(()=>{try{return G.renderer.renderer.info.render.frame;}catch(e){return -1;}})()});}catch(e){}},250);
    const tick=[]; const iv=setInterval(()=>{try{tick.push({t:+(performance.now()-t0).toFixed(0), marco:(()=>{try{return G.renderer.renderer.info.render.frame;}catch(e){return -1;}})()});}catch(e){}},100);
    const longtasks=[]; try{new PerformanceObserver(l=>{l.getEntries().forEach(e=>longtasks.push({t:+(e.startTime-t0).toFixed(0), d:+e.duration.toFixed(1)}));}).observe({entryTypes:['longtask']});}catch(e){}
    await dormir(2000); // línea base con el mundo asentado
    if(!SINEV){ for(const k of CLAVES){ const te=performance.now(); try{ G.eventos.log(k); }catch(e){} eventos.push({key:k, t:+(te-t0).toFixed(0)});
      await dormir(700);
      try{ const ahora=(G.renderer.renderer.info.programs||[]).map(p=>p.cacheKey); const nuevos=ahora.filter(x=>!progAntes.includes(x)); progNuevosPorEvento.push({key:k, n:nuevos.length, claves:nuevos.slice(0,6).map(x=>String(x).slice(0,220))}); progAntes.splice(0,progAntes.length,...ahora); }catch(e){}
      await dormir(500); } }
    await dormir(8000); // cola de capturas diferidas (el «antes» dispara a +2 s)
    clearInterval(pol); clearInterval(iv);
    const fin=performance.now();
    const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(p*s.length))]:0;};
    // tiempos absolutos de cada delta (por suma) para distancia al evento
    let ac=0; const abs=deltas.map(d=>{ac+=d;return ac;});
    const gordos=deltas.map((d,i)=>({d,t:abs[i]})).filter(x=>x.d>15).map(x=>({d:+x.d.toFixed(1),t:+x.t.toFixed(0)}));
    const evAbs=eventos.map(e=>e.t);
    const pausaCerca=n=>deltas.map((d,i)=>({d,t:abs[i]})).filter(x=>x.d>n&&evAbs.some(e=>x.t>=e-1500&&x.t<=e+4000)).map(x=>{const e0=evAbs.reduce((a,e)=>Math.abs(x.t-e)<Math.abs(x.t-a)?e:a,evAbs[0]||0);return {d:+x.d.toFixed(1), ms_al_evento:+(x.t-e0).toFixed(0)};});
    const ventanas=evAbs.map(e=>{const v=deltas.map((d,i)=>({d,t:abs[i]})).filter(x=>x.t>=e&&x.t<=e+4000).map(x=>x.d);return {n:v.length, med:+pct(v,0.5).toFixed(1), p95:+pct(v,0.95).toFixed(1), max:v.length?+Math.max(...v).toFixed(1):0, pausas50:v.filter(d=>d>50).length};});
    const base={n:deltas.length, med:+pct(deltas,0.5).toFixed(1), p90:+pct(deltas,0.9).toFixed(1), p95:+pct(deltas,0.95).toFixed(1), p99:+pct(deltas,0.99).toFixed(1), max:+Math.max(...deltas).toFixed(1)};
    const resu={ eventos, base, gordos, capturaLog, tick, longtasks, sinev:SINEV,
      pausas50:pausaCerca(50), pausas100:pausaCerca(100), pausas200:pausaCerca(200), pausas500:pausaCerca(500),
      glLentas, progNuevosPorEvento,
      ventanas, suma_s:+((fin-t0)/1000).toFixed(1),
      capturas:Object.keys(G.mangaFondos||{}),
      info:(()=>{const o=G.renderer.stats();try{const inf=G.renderer.renderer.info;o.geo=inf.memory.geometries;o.tex=inf.memory.textures;o.prog=inf.programs.length;}catch(e){}o.heap=+(performance.memory?(performance.memory.usedJSHeapSize/1048576).toFixed(0):0);try{o.precalentar=JSON.parse(JSON.stringify(G.renderer._precalentar));}catch(e){}return o;})() };
    res(resu);
  })`;
  const m = await ev(cdp, ses, MEDIDA, 120);
  stats.beats.medida = m;
  const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
  fs.writeFileSync(path.join(SALIDA, `k338_${ETIQ}.jpg`), Buffer.from(foto.data, 'base64'));
  stats.consola_errores = consola.slice(0, 20);
  fs.writeFileSync(path.join(SALIDA, `k338_${ETIQ}.json`), JSON.stringify(stats, null, 1));
  console.log('· MEDIDA:', JSON.stringify({ base: m.base, capturas: m.capturas.length, pausas50: m.pausas50.length, pausas100: m.pausas100.length, max: m.base.max, info: m.info }, null, 1));
  console.log('· consola errores:', consola.length);
  try { chrome.kill(); } catch (e) { }
  srv.close();
  process.exit(0);
})().catch(e => { console.error('FALLO:', e.message); try { execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\'\\" | Where-Object { \$_.CommandLine -like \'*kimi1c338*\' } | Stop-Process -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' }); } catch (x) { } process.exit(1); });
