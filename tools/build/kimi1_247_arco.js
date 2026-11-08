#!/usr/bin/env node
/* Amazona Verse · Kimi 1 (PC Windows) — KIMI-247: validación visual GPU real de la misión 2
   del arco V18.3 «Los faroles de las Atalayas» (encargo 📣 TAREAS_WEB.md 8-nov: «Para Kimi (GPU):
   capturas de la plaza (−69,2, 68,4) y de lo alto de las tres torres; mirar si los nidos y
   faroles quedan bien sobre el techo de torre_vigia»). La lógica ya se validó en KIMI-245
   (v18ArcoTest 39/39, móvil 375×812, mismo código); aquí va lo visual.
   Chrome headless propio + CDP; iPhone emulado 390×844 dpr 3, GPU real, ?v18=1.
   Con la API pública del módulo (G.v18arco): puerto reparado → avanzar('reunion') → capturas
   de las 3 torres (nidos revueltos con haz) y de la plaza → avanzar('nidos','afinado','encendido')
   → mismas ventajas con faroles encendidos y nidos acomodados.
   Salida: docs/img/kimi247/k247_<vista>.jpg y k247_stats.json

   Uso: node tools/build/kimi1_247_arco.js
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi247');
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
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1c247-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`, '--hide-scrollbars'], { detached: true, stdio: 'ignore' });
  chrome.unref();
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
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
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('no arrancó');
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  await ev(cdp, ses, `(function(){const b=[...document.querySelectorAll('button')].find(x=>/¡A jugar!/i.test(x.textContent));if(b){b.click();return 'cerrada';}return 'no-estaba';})()`, 15);
  await cdp.bombear(800);

  // Ir a las Atalayas y asentar la zona (streaming quieto)
  await ev(cdp, ses, `(function(){const AV=window.AV;AV.teleport(-69.2,62.0);return 1;})()`, 30);
  for (let i = 0; i < 60; i++) {
    const s = await ev(cdp, ses, `(function(){try{const st=window.AV.G.mundo.streaming.stats();return {t:st.trabajos,d:st.descargando};}catch(e){return {t:-1,d:-1};}})()`, 15);
    if (s && s.t === 0 && s.d === 0) break;
    await cdp.bombear(1000);
  }
  // Cargar la cadena V18 como boot.js (progreso → habilidades → fx → personajes → npc → puerto → arco) y encender la misión
  const setup = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G,A=window.AVE;
    if (!G.v18) await A.assets.script('src/game/v18/progreso.js').then(() => window.AVV18Progreso(G));
    if (!G.v18hab) await A.assets.script('src/game/v18/habilidades.js').then(() => window.AVV18Habilidades(G));
    if (!G.v18fx) await A.assets.script('src/game/v18/fx_poderes.js').then(() => window.AVV18Fx(G));
    await A.assets.script('content/comun/personajes_v18.js');
    if (!G.v18npc) await A.assets.script('src/game/v18/npc.js').then(() => window.AVV18Npc(G));
    if (!G.v18puerto) await A.assets.script('src/game/v18/puerto.js').then(() => window.AVV18Puerto(G));
    if (!G.v18arco) await A.assets.script('src/game/v18/arco.js').then(() => window.AVV18Arco(G));
    const V=G.v18, ar=G.v18arco;
    if(!ar) return {error:'sin v18arco'};
    V.cambiarMundo('puerto_mina','reparado');
    ar.avanzar('reunion'); ar.aplicar();
    return {estado:ar.estado(), valido:ar.valido, torres:(ar.torres||[]).map(t=>({x:+t.x.toFixed(1),z:+t.z.toFixed(1),top:+t.top.toFixed(1)}))};})()`, 90);
  console.log('· setup:', JSON.stringify(setup));
  if (setup.error) throw new Error(setup.error);
  await cdp.bombear(1500); // elenco colocado, modelo de Tuerca cargando

  const stats = { pantalla: 'movil 390x844@3', setup, vistas: {} };
  const raf2 = `new Promise(r=>{let n=0;const f=()=>{if(++n>2)r(1);else requestAnimationFrame(f)};requestAnimationFrame(f)})`;

  // Encuadres: [id, x, y|null(=suelo), z, lookX, lookY, lookZ] — y=null pone a Vittata en tierra
  const PLAZA = [{ id: 'plaza_reunion_oeste', x: -72.8, y: null, z: 64.2, lx: -68.4, ly: null, lz: 69.6 },
                 { id: 'plaza_reunion_este', x: -63.6, y: null, z: 65.6, lx: -68.4, ly: null, lz: 69.6 }];
  const torres = setup.torres;

  async function captura(v) {
    // posicionar (y != null = volando junto al techo de la torre)
    await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G,MV=G.fisica.MOVE;
      const y=${v.y == null ? 'null' : v.y};
      MV.flying=y!=null; MV.grounded=y==null; MV.swimming=false; MV.vx=MV.vz=0; G.S.vy=0;
      G.S.pos.x=${v.x}; G.S.pos.z=${v.z};
      G.S.pos.y=y!=null?y:AV.debug.height(${v.x},${v.z})+0.02;
      const dx=${v.lx}-G.S.pos.x, dz=${v.lz}-G.S.pos.z, d=Math.hypot(dx,dz)||1;
      if(G.S.facing){G.S.facing.x=dx/d;G.S.facing.z=dz/d;}
      AV.debug.camYaw(Math.atan2(-dx,-dz));
      return 1;})()`, 30);
    for (let i = 0; i < 3; i++) { await cdp.bombear(600); await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G,MV=G.fisica.MOVE;const y=${v.y == null ? 'null' : v.y};MV.flying=y!=null;MV.grounded=y==null;MV.swimming=false;MV.vx=MV.vz=0;G.S.vy=0;G.S.pos.x=${v.x};G.S.pos.z=${v.z};G.S.pos.y=y!=null?y:AV.debug.height(${v.x},${v.z})+0.02;return 1;})()`, 15); }
    await ev(cdp, ses, raf2, 30);
    const sv = await ev(cdp, ses, `(function(){const G=window.AV.G,ar=G.v18arco;return Object.assign({estado:ar.estado(),px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());})()`, 30);
    stats.vistas[v.id] = sv;
    const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
    fs.writeFileSync(path.join(SALIDA, `k247_${v.id}.jpg`), Buffer.from(foto.data, 'base64'));
    console.log('· ' + v.id + ':', JSON.stringify(sv));
  }

  // Posarse en la percha de una torre: caer desde +1,4 m sobre (x,z); la percha frena la caída.
  // Dos encuadres opuestos por torre (cámara al oeste y al este): cada torre tiene su viga/palisada y uno de los dos sale limpio.
  async function capturaPercha(t, i, id) {
    const posado = await ev(cdp, ses, `(async function(){const AV=window.AV,G=AV.G,MV=G.fisica.MOVE;
      MV.flying=false; MV.grounded=false; MV.swimming=false; MV.vx=MV.vz=0; G.S.vy=0;
      G.S.pos.x=${t.x}-0.35; G.S.pos.z=${t.z}+0.15; G.S.pos.y=${t.top}+1.4;
      const yPercha=${t.top}+0.05;
      const t0=performance.now();
      while(performance.now()-t0<3000){ if(MV.grounded && Math.abs(G.S.pos.y-yPercha)<0.5) break; await new Promise(r=>setTimeout(r,100)); }
      const poso=MV.grounded && Math.abs(G.S.pos.y-yPercha)<0.5;
      G.camara.CAM.dist=3.8; G.camara.CAM.height=2.6;
      try{G.dialogo.clear();}catch(e){}
      return {poso:poso, y:+G.S.pos.y.toFixed(2), py:+(G.S.pos.y-yPercha).toFixed(2)};})()`, 30);
    for (const lado of [{ suf: 'a', dx: 1.5, dz: 0.05 }, { suf: 'b', dx: -1.5, dz: -0.05 }, { suf: 'c', dx: 0.05, dz: 1.5 }, { suf: 'd', dx: -0.05, dz: -1.5 }]) {
      await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G;
        G.camara.CAM.dist=${lado.suf === 'c' ? '5.2' : '3.8'}; G.camara.CAM.height=${lado.suf === 'c' ? '5.6' : '2.6'};
        const dx=${lado.dx}, dz=${lado.dz}, d=Math.hypot(dx,dz);
        if(G.S.facing){G.S.facing.x=dx/d;G.S.facing.z=dz/d;}
        AV.debug.camYaw(Math.atan2(-dx,-dz));
        return 1;})()`, 30);
      await cdp.bombear(900);
      await ev(cdp, ses, raf2, 30);
      const vid = id + '_' + lado.suf;
      const sv = await ev(cdp, ses, `(function(){const G=window.AV.G,ar=G.v18arco;return Object.assign(${JSON.stringify(posado)},{lado:'${lado.suf}',estado:ar.estado(),px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());})()`, 30);
      stats.vistas[vid] = sv;
      const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
      fs.writeFileSync(path.join(SALIDA, `k247_${vid}.jpg`), Buffer.from(foto.data, 'base64'));
      console.log('· ' + vid + ':', JSON.stringify(sv));
    }
    // variante aérea: Vittata cernido por encima de la copa, cámara volando mirando el techo desde arriba
    await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G,MV=G.fisica.MOVE,t={x:${t.x},z:${t.z},top:${t.top}};
      G.camara.CAM.dist=9.5; G.camara.CAM.height=5.8;
      MV.flying=true; MV.grounded=false; MV.swimming=false; MV.vx=MV.vz=0; G.S.vy=0;
      G.S.pos.x=t.x+3.0; G.S.pos.z=t.z+1.5; G.S.pos.y=t.top+11;
      const dx=t.x-G.S.pos.x, dz=t.z-G.S.pos.z, d=Math.hypot(dx,dz)||1;
      if(G.S.facing){G.S.facing.x=dx/d;G.S.facing.z=dz/d;}
      AV.debug.camYaw(Math.atan2(-dx,-dz));
      return 1;})()`, 30);
    for (let i = 0; i < 3; i++) { await cdp.bombear(500); await ev(cdp, ses, `(function(){const AV=window.AV,G=AV.G,MV=G.fisica.MOVE,t={x:${t.x},z:${t.z},top:${t.top}};MV.flying=true;MV.grounded=false;MV.swimming=false;MV.vx=MV.vz=0;G.S.vy=0;G.S.pos.x=t.x+3.0;G.S.pos.z=t.z+1.5;G.S.pos.y=t.top+11;return 1;})()`, 15); }
    await ev(cdp, ses, raf2, 30);
    {
      const vid = id + '_aerea';
      const sv = await ev(cdp, ses, `(function(){const G=window.AV.G,ar=G.v18arco;return Object.assign(${JSON.stringify(posado)},{lado:'aerea',estado:ar.estado(),px:+G.S.pos.x.toFixed(1),py:+G.S.pos.y.toFixed(1),pz:+G.S.pos.z.toFixed(1)},G.renderer.stats());})()`, 30);
      stats.vistas[vid] = sv;
      const foto = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 85 }, ses, 30000);
      fs.writeFileSync(path.join(SALIDA, `k247_${vid}.jpg`), Buffer.from(foto.data, 'base64'));
      console.log('· ' + vid + ':', JSON.stringify(sv));
    }
  }

  // Pasada 1 · estado 'reunion': nidos revueltos con haz y aura (Vittata posado en la percha de cada torre)
  for (const v of PLAZA) await captura(v);
  for (let i = 0; i < torres.length; i++) await capturaPercha(torres[i], i, 'torre' + i);

  // Pasada 2 · estado 'encendido': nidos acomodados, faroles encendidos, banderines, invento en flor
  await ev(cdp, ses, `(function(){const ar=window.AV.G.v18arco;['nidos','afinado','encendido'].forEach(e=>ar.avanzar(e));ar.aplicar();return ar.estado();})()`, 30);
  await cdp.bombear(1200);
  const PLAZA2 = [{ id: 'plaza_encendido_este', x: -63.6, y: null, z: 65.6, lx: -68.4, ly: null, lz: 69.6 },
                  { id: 'plaza_encendido_banderines', x: -73.2, y: null, z: 71.6, lx: -66.0, ly: null, lz: 68.2 },
                  { id: 'plaza_encendido_invento', x: -65.3, y: null, z: 70.9, lx: -68.4, ly: null, lz: 69.6 }];
  for (const v of PLAZA2) { await ev(cdp, ses, `try{window.AV.G.dialogo.clear()}catch(e){};1`, 10); await captura(v); }
  for (let i = 0; i < torres.length; i++) await capturaPercha(torres[i], i, 'torre' + i + '_farol');

  // Verificación geométrica: nido y farol sobre el techo de cada torre_vigia
  const geo = await ev(cdp, ses, `(function(){const G=window.AV.G,ar=G.v18arco,raiz=G.renderer.scene&&G.renderer.scene.getObjectByName?G.renderer.scene.getObjectByName('v18-arco'):null;
    const esc=raiz||null, out=[];
    if(!esc) return {error:'sin raiz'};
    for(let i=0;i<3;i++){const n=esc.getObjectByName('v18-arco-nido-'+i), f=esc.getObjectByName('v18-arco-farol-'+i), t=(ar.torres||[])[i];
      out.push({torre:i, nidoY:n&&+n.position.y.toFixed(2), farolY:f&&+f.position.y.toFixed(2), techo:t&&+t.top.toFixed(2), nidoX:n&&+n.position.x.toFixed(1), farolX:f&&+f.position.x.toFixed(1), torreX:t&&+t.x.toFixed(1), visible:n&&n.visible, farolVisible:f&&f.visible});}
    return out;})()`, 30);
  stats.geometria = geo;
  console.log('· geometria:', JSON.stringify(geo));

  stats.head = await ev(cdp, ses, `window.AV.G.revision||''`, 10);
  stats.consola_errores = consola;
  fs.writeFileSync(path.join(SALIDA, 'k247_stats.json'), JSON.stringify(stats, null, 1));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message || e); process.exit(1); });
