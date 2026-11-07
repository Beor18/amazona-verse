#!/usr/bin/env node
/* KIMI-219 · A/B de la reaplicación de la cuantización (kimi2_k219_aplica.js).
   Corre UNA pasada contra el worktree servido y deja evidencia en docs/img/kimi219/:

     node tools/build/kimi2_k219_ab.js --modo antes    (HEAD: captura arranque + contabilidad de carga)
     node tools/build/kimi2_k219_ab.js --modo despues  (cuantizado: captura + diff vs antes + 5 puertas + streamingTest/selfTest)

   Perfil: iPhone 390×844 dpr 3, calidad bajo forzada, ?v18=1 (las puertas lo exigen; movementTest
   también pasa con la bandera). La cámara y el spawn salen del preparar_js común (config.json). */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const MODO = arg('--modo', 'antes');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi219');
fs.mkdirSync(SALIDA, { recursive: true });
const RES = { tarea: 'KIMI-219-ab', modo: MODO, ts: new Date().toISOString(), carga: null, captura: null, diff: null, puertas: {}, consola: { errores: 0, muestras: [] } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/x-font-woff2', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 30) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result ? r.result.value : undefined; }
function guardar() { try { fs.writeFileSync(path.join(SALIDA, `k219_ab_${MODO}.json`), JSON.stringify(RES, null, 1)); } catch (e) { } }
guardar();
(async () => {
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2ab-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', '--window-size=420,900'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools: ' + err.slice(0, 200)); }
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  cdp.ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('EXC ' + JSON.stringify(d.params.exceptionDetails).slice(0, 300)); } if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') { RES.consola.errores++; if (RES.consola.muestras.length < 8) RES.consola.muestras.push('ERR ' + JSON.stringify(d.params.args).slice(0, 300)); } });
  await cdp.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true }, ses);
  await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, ses);
  await cdp.call('Emulation.setCPUThrottlingRate', { rate: 1 }, ses);
  await cdp.call('Page.navigate', { url: `${origen}/index.html?v18=1&calidad=bajo` }, ses);
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) { console.log('· no arrancó'); process.exit(1); }
  console.log('· preparar: ' + await ev(cdp, ses, CFG.preparar_js, 300));
  console.log('· asentando 4 s…'); await cdp.bombear(4);
  // contabilidad de carga (todo lo pedido hasta ahora, sin comprimir: servidor dev no-store)
  RES.carga = JSON.parse(await ev(cdp, ses, `(() => { const rs = performance.getEntriesByType('resource'); const items = rs.map(r => ({ u: r.name.split('/').pop(), b: r.transferSize || r.encodedBodySize || 0 })); const total = items.reduce((a, x) => a + x.b, 0); const porTipo = {}; for (const x of items) { const e = (x.u.match(/\\.[a-z0-9]+$/) || ['.?'])[0]; porTipo[e] = (porTipo[e] || 0) + x.b; } return JSON.stringify({ archivos: rs.length, totalBytes: total, porTipo, top12: items.slice().sort((a, b) => b.b - a.b).slice(0, 12) }); })()`, 20, false));
  console.log(`· carga: ${RES.carga.archivos} archivos · ${(RES.carga.totalBytes / 1048576).toFixed(2)} MB · top: ${RES.carga.top12.slice(0, 5).map(x => x.u + ' ' + Math.round(x.b / 1024) + 'K').join(' · ')}`);
  guardar();
  // captura de arranque (solo lienzo WebGL: sin HUD DOM)
  const dataUrl = await ev(cdp, ses, "AV.G.renderer.snapshot(390, 844, 0.92)", 90);
  if (dataUrl && dataUrl !== 'null') { const ruta = path.join(SALIDA, `k219_ab_${MODO}.jpg`); fs.writeFileSync(ruta, Buffer.from(dataUrl.split(',')[1], 'base64')); RES.captura = ruta; console.log('· captura → ' + ruta); }
  else console.log('· snapshot devolvió null');
  guardar();
  if (MODO === 'despues') {
    // diff de píxeles antes/después (mismo lienzo, umbral 4/255)
    try {
      RES.diff = JSON.parse(await ev(cdp, ses, `(async () => { const carga = u => fetch(u).then(r => r.blob()).then(b => createImageBitmap(b)); const a = await carga('/docs/img/kimi219/k219_ab_antes.jpg'), b = await carga('/docs/img/kimi219/k219_ab_despues.jpg'); const cv = document.createElement('canvas'); cv.width = 390; cv.height = 844; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(a, 0, 0, 390, 844); const A = cx.getImageData(0, 0, 390, 844).data; cx.drawImage(b, 0, 0, 390, 844); const B = cx.getImageData(0, 0, 390, 844).data; let distintos = 0, suma = 0; for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); suma += d; if (d > 4) distintos++; } return JSON.stringify({ px: distintos, pct: +(100 * distintos / (390 * 844)).toFixed(3), media: +(suma / (390 * 844)).toFixed(3) }); })()`, 60));
      console.log(`· diff vs antes: ${RES.diff.px} px (${RES.diff.pct} %) · media ${RES.diff.media}`);
    } catch (e) { console.log('· diff ERROR ' + e.message.slice(0, 200)); }
    guardar();
    for (const [nombre, exp, tope] of [
      ['movementTest', 'AV.movementTest()', 420],
      ['v18DescubrirTest', 'AV.v18DescubrirTest()', 420],
      ['bohiosTest', 'AV.bohiosTest()', 420],
      ['v18GuardianTest', 'AV.v18GuardianTest()', 420],
      ['v18PuertoTest', 'AV.v18PuertoTest()', 420],
      ['streamingTest', 'AV.streamingTest()', 420],
      ['selfTest', 'AV.selfTest()', 590],
    ]) {
      try {
        console.log(`· ${nombre}…`);
        const r = await ev(cdp, ses, `(async () => { const r = await (${exp}); return JSON.stringify({ passed: r.passed, total: r.total, fallos: (r.results || []).filter(x => !x.ok).map(x => x.name).slice(0, 10) }); })()`, tope);
        RES.puertas[nombre] = JSON.parse(r);
        console.log(`  ${nombre}: ${RES.puertas[nombre].passed}/${RES.puertas[nombre].total}` + (RES.puertas[nombre].fallos.length ? ' FALLOS: ' + RES.puertas[nombre].fallos.join(' | ') : ''));
      } catch (e) { RES.puertas[nombre] = { error: e.message.slice(0, 300) }; console.log('  ' + nombre + ' ERROR ' + e.message.slice(0, 160)); }
      guardar();
    }
    const st = JSON.parse(await ev(cdp, ses, "JSON.stringify(AV.G.renderer.stats())", 10, false));
    RES.statsFinal = st;
    console.log(`· final: ${st.fps} FPS · ${st.calls} calls · ${Math.round(st.triangulos / 1000)} k tris · calidad ${st.calidad}`);
  }
  guardar();
  console.log('· errores de consola: ' + RES.consola.errores);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
