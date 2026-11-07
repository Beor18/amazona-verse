#!/usr/bin/env node
/* KIMI-220 (URGENTE 📣 7-nov 23:00): posible doble dibujo en la frontera HD/cerca por `tramos()` tragando
   huecos (KIMI-192: globalFus llama tramos(m, quiere, 8, 100000) en streaming.js ~1874).
   Detector OBJETIVO con GPU real: una instancia está doble-dibujada si su tramo queda cubierto por un run
   de edificiosZonaHDGlobal:* Y por uno de edificiosZonaCercaGlobal:* en el mismo cuadro (el run HD se traga
   el hueco de una instancia clasificada cerca, o al revés → se dibujan las dos versiones superpuestas).
   Uso: node tools/build/kimi1_dobledibujo.js [--etiqueta r1] [--calidad alto]
   Salida: JSON en docs/img/kimi220/k220_<etiqueta>.json + capturas cuando hay dobles. */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ETIQ = (process.argv.indexOf('--etiqueta') > 0 ? process.argv[process.argv.indexOf('--etiqueta') + 1] : 'r1');
const CALIDAD = (process.argv.indexOf('--calidad') > 0 ? process.argv[process.argv.indexOf('--calidad') + 1] : 'alto');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi220'); fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 500)); return r.result ? r.result.value : undefined; }
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi1dd-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=1280,800'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath, caido = '';
  chrome.on('exit', (c, s) => { caido = 'exit ' + c; });
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools en 60 s ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { console.log('· no arrancó'); process.exit(1); }
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  // Detector en página: cubre = para cada instancia, en qué globales queda su tramo este cuadro.
  const DETECTAR = `(() => {
    const G = AV.G, ST = G.streaming && G.streaming.gestor;
    if (!ST) return { error: 'sin gestor' };
    const cobre = new Map();
    let nGlobales = 0, nTramos = 0;
    G.renderer.scene.traverse(o => {
      if (!o.visible || !o.name || !/^edificiosZona(HD|Cerca)Global:/.test(o.name)) return;
      nGlobales++;
      const tipo = o.name.indexOf('HDGlobal') >= 0 ? 'HD' : 'cerca';
      const T = o.userData.tramos, GRP = o.geometry.groups;
      if (!T || !GRP) return;
      nTramos += T.length;
      for (let gi = 0; gi < GRP.length; gi++) {
        const g = GRP[gi], fin = g.start + g.count;
        for (const t of T) {
          if (t.start >= g.start && t.start + t.count <= fin && t.z) {
            let e = cobre.get(t.z);
            if (!e) cobre.set(t.z, e = { HD: 0, cerca: 0 });
            e[tipo]++;
          }
        }
      }
    });
    const dobles = [];
    for (const [I, e] of cobre) {
      if (e.HD > 0 && e.cerca > 0) dobles.push({
        id: I.id, modelo: I.modelo, zona: I.zona, fus: I.fus, fusN: I.fusN, via: 'HD+cerca',
        pos: I.pos ? [Math.round(I.pos[0] * 10) / 10, Math.round(I.pos[1] * 10) / 10, Math.round(I.pos[2] * 10) / 10] : null,
        cubreHD: e.HD, cubreCerca: e.cerca
      });
      else {
        const Z = ST.zonas[I.zona];
        const silueta = Z && Z.usaMalla && Z.malla && Z.malla.visible;
        if (silueta && (e.HD > 0 || e.cerca > 0)) dobles.push({
          id: I.id, modelo: I.modelo, zona: I.zona, fus: I.fus, fusN: I.fusN, via: 'global+silueta',
          pos: I.pos ? [Math.round(I.pos[0] * 10) / 10, Math.round(I.pos[1] * 10) / 10, Math.round(I.pos[2] * 10) / 10] : null,
          cubreHD: e.HD, cubreCerca: e.cerca
        });
        else if (I.lod === 1 && !I.hd && (e.HD > 0 || e.cerca > 0)) dobles.push({
          id: I.id, modelo: I.modelo, zona: I.zona, fus: I.fus, fusN: I.fusN, via: 'global+lejos',
          pos: I.pos ? [Math.round(I.pos[0] * 10) / 10, Math.round(I.pos[1] * 10) / 10, Math.round(I.pos[2] * 10) / 10] : null,
          cubreHD: e.HD, cubreCerca: e.cerca
        });
      }
    }
    return { nGlobales, nTramos, nCubre: cobre.size, dobles };
  })()`;
  const IR = `(async (x, z, fx, fz) => {
    const G = AV.G, P = G.pruebas, ST = G.streaming.gestor;
    P.teleport(x, z, fx, fz); P.tick(0.1);
    await ST.alrededor(x, z); await ST.terminar();
    if (G.solidos && G.solidos.terminar) G.solidos.terminar();
    for (let i = 0; i < 2; i++) { G.camara.place(true); G.renderer.render(1 / 60, false); }
    return true;
  })(...ARGS...)`;
  // Ruta: barrido alrededor del centro de kelvin_ruinas_yunque cruzando la frontera HD/cerca (45-135 m).
  const barrido = await ev(cdp, ses, `(async () => {
    const G = AV.G, ST = G.streaming.gestor;
    if (G.mundo && G.mundo.listo) await G.mundo.listo;
    await ST.listo; await ST.terminar();
    if (G.renderer.setCalidad) { G.renderer.setCalidad('${CALIDAD}', true); ST.revisar(); }
    const ZC = ST.zonas.kelvin_ruinas_yunque;
    if (!ZC) return { error: 'sin zona kelvin_ruinas_yunque' };
    const cx = ZC.cx, cz = ZC.cz, r = ZC.r;
    const radios = [40, 55, 70, 85, 100, 115, 130, 150, 180];
    const angulos = [0, Math.PI / 4, Math.PI / 2, Math.PI * 0.75, Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75];
    const puntos = [];
    for (const rad of radios) for (const a of angulos) {
      puntos.push({ x: cx + Math.sin(a) * (r + rad), z: cz + Math.cos(a) * (r + rad), rad, a, cx, cz });
    }
    const muestras = [];
    for (const p of puntos) {
      await (${IR.replace('...ARGS...', 'p.x, p.z, cx, cz')});
      const d = await (${DETECTAR});
      muestras.push({ x: Math.round(p.x), z: Math.round(p.z), rad: p.rad, globales: d.nGlobales, tramos: d.nTramos, cubre: d.nCubre, dobles: d.dobles.length, detalle: d.dobles.slice(0, 8) });
    }
    // Transecto SUR→NORTE por el eje de la ciudad (x=cx, z de cz+r+40 a cz-r-40): cruza el anillo HD/cerca
    // por dentro de las ruinas (sin terminar: estado de vuelo real, como pide el 📣). Se descartan los
    // teleports redirigidos por zonas sólidas (compara S.pos con lo pedido).
    const P = G.pruebas;
    const vuelo = [];
    const S = G.S;
    const lineas = [
      { x0: cx, z0: cz + r + 40, x1: cx, z1: cz - r - 40 },
      { x0: cx - r - 40, z0: cz, x1: cx + r + 40, z1: cz }
    ];
    for (const L of lineas) {
      const pasos = Math.ceil(Math.hypot(L.x1 - L.x0, L.z1 - L.z0) / 4);
      for (let s = 0; s <= pasos; s++) {
        const x = L.x0 + (L.x1 - L.x0) * s / pasos, z = L.z0 + (L.z1 - L.z0) * s / pasos;
        P.teleport(x, z, cx, cz); P.tick(0.1);
        const redirigido = Math.hypot(S.pos.x - x, S.pos.z - z) > 12;
        for (let i = 0; i < 1; i++) { G.camara.place(true); G.renderer.render(1 / 60, false); }
        const d = await (${DETECTAR});
        vuelo.push({ x: Math.round(x), z: Math.round(z), redirigido, globales: d.nGlobales, tramos: d.nTramos, cubre: d.nCubre, dobles: d.dobles.length, detalle: d.dobles.slice(0, 5) });
      }
    }
    return { zona: { id: ZC.id, cx, cz, r, inst: ZC.inst.length }, nMuestras: muestras.length, muestras, vuelo };
  })()`, 590);
  console.log('· barrido: ' + JSON.stringify({ zona: barrido.zona, nMuestras: barrido.nMuestras, error: barrido.error, conDobles: barrido.muestras ? barrido.muestras.filter(m => m.dobles > 0).length : 0, vueloConDobles: barrido.vuelo ? barrido.vuelo.filter(v => v.dobles > 0).length : 0, vueloConGlobales: barrido.vuelo ? barrido.vuelo.filter(v => v.globales > 0).length : 0 }));
  const errores = await ev(cdp, ses, `(window.__erroresConsola || []).slice(0, 10)`, 10);
  const resumen = { etiqueta: ETIQ, calidad: CALIDAD, fecha: new Date().toISOString(), barrido, captura: null, erroresConsola: errores };
  // Captura en el peor punto (más dobles) si hay.
  let captura = null;
  if (barrido.muestras) {
    const peor = barrido.muestras.filter(m => m.dobles > 0).sort((a, b) => b.dobles - a.dobles)[0];
    if (peor) {
      await ev(cdp, ses, `(async () => {
        const G = AV.G, P = G.pruebas, ST = G.streaming.gestor, ZC = ST.zonas.kelvin_ruinas_yunque;
        P.teleport(${peor.x}, ${peor.z}, ZC.cx, ZC.cz); P.tick(0.1);
        await ST.alrededor(${peor.x}, ${peor.z}); await ST.terminar();
        if (G.solidos && G.solidos.terminar) G.solidos.terminar();
        for (let i = 0; i < 2; i++) { G.camara.place(true); G.renderer.render(1 / 60, false); }
        return true;
      })()`, 120);
      const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 60000);
      fs.writeFileSync(path.join(SALIDA, `k220_${ETIQ}_peor.jpg`), Buffer.from(shot.data, 'base64'));
      captura = `k220_${ETIQ}_peor.jpg`;
    }
  }
  // Captura de control en un punto sin dobles (o en el spawn del barrido).
  const sano = barrido.muestras ? barrido.muestras.find(m => m.dobles === 0 && m.globales > 0) : null;
  if (sano) {
    await ev(cdp, ses, `(async () => {
      const G = AV.G, ST = G.streaming.gestor, ZC = ST.zonas.kelvin_ruinas_yunque;
      const P = G.pruebas;
      const b = document.querySelector('[data-guia="cerrar"]'); if (b) b.click();
      P.teleport(${sano.x}, ${sano.z}, ZC.cx, ZC.cz); P.tick(0.1);
      await ST.alrededor(${sano.x}, ${sano.z}); await ST.terminar();
      if (G.solidos && G.solidos.terminar) G.solidos.terminar();
      for (let i = 0; i < 2; i++) { G.camara.place(true); G.renderer.render(1 / 60, false); }
      return true;
    })()`, 120);
    const shot2 = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k220_${ETIQ}_sano.jpg`), Buffer.from(shot2.data, 'base64'));
    if (!captura) captura = `k220_${ETIQ}_sano.jpg`;
  }
  resumen.captura = captura;
  // Capturas del cruce de la frontera HD/cerca por el eje de la ciudad (z = cz±90 / ±30): 4 encuadres + detector.
  const cruce = [];
  for (const dz of [90, 30, -30, -90]) {
    const d = await ev(cdp, ses, `(async () => {
      const G = AV.G, ST = G.streaming.gestor, ZC = ST.zonas.kelvin_ruinas_yunque, P = G.pruebas;
      const b = document.querySelector('[data-guia="cerrar"]'); if (b) b.click();
      const x = ZC.cx, z = ZC.cz + ${dz};
      P.teleport(x, z, ZC.cx, ZC.cz); P.tick(0.1);
      const redirigido = Math.hypot(G.S.pos.x - x, G.S.pos.z - z) > 12;
      if (redirigido) return { redirigido: true, nGlobales: 0, nTramos: 0, nCubre: 0, dobles: 0 };
      await ST.alrededor(x, z); await ST.terminar();
      if (G.solidos && G.solidos.terminar) G.solidos.terminar();
      for (let i = 0; i < 2; i++) { G.camara.place(true); G.renderer.render(1 / 60, false); }
      return (${DETECTAR});
    })()`, 120);
    if (d.redirigido) { cruce.push({ dz, redirigido: true }); continue; }
    const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 60000);
    fs.writeFileSync(path.join(SALIDA, `k220_${ETIQ}_cruce_z${dz >= 0 ? 'p' : 'm'}${Math.abs(dz)}.jpg`), Buffer.from(shot.data, 'base64'));
    cruce.push({ dz, globales: d.nGlobales, tramos: d.nTramos, cubre: d.nCubre, dobles: d.dobles.length });
  }
  resumen.cruce = cruce;
  fs.writeFileSync(path.join(SALIDA, `k220_${ETIQ}.json`), JSON.stringify(resumen, null, 1));
  console.log('· cruce: ' + JSON.stringify(cruce));
  console.log('· JSON: docs/img/kimi220/k220_' + ETIQ + '.json · captura: ' + captura + ' · errores consola: ' + JSON.stringify(errores));
  try { await cdp.call('Browser.close', {}, ses, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  srv.close();
  const totales = barrido.muestras ? barrido.muestras.reduce((s, m) => s + m.dobles, 0) : -1;
  console.log('· TOTAL instancias dobles sumadas en el barrido: ' + totales);
  process.exit(0);
})().catch(e => { console.error('FALLO', e); process.exit(1); });
