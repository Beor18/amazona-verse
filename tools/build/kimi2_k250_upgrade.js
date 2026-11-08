#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-244: carga de arranque en «medio» y «alto» (1600×900, GPU real).
   Encargo coordinadora 8-nov 02:20/03:15 UTC (KIMI-243 parte B): medir la ventana de arranque «como la
   cuenta avtest, sumando lo que sirve sw.js» con criterio ≤ 28 MB. En esta PC no hay Python (avtest es .py),
   así que este script replica su contabilidad en Node: perfil fresco, Network CDP desde antes de navegar,
   flujo de jugador nuevo (portada → creador → Empezar, el preparar_js de config.json), red quieta 2 s,
   cada archivo contado UNA vez (con la cuenta del service worker: fromServiceWorker + dataReceived) y
   desglose por tipo + top de archivos. Además vuelca la vista de arranque (AV.look.medir) y errores de consola.
   Uso: node tools/build/kimi2_k244_carga.js --calidad medio|alto|bajo [--etiqueta r1] [--ancho 1600 --alto 900]
   Salida: consola + docs/img/kimi244/k244_carga_<calidad>_<etiqueta>.json */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path'); const os = require('os'); const { spawn, execSync } = require('child_process');
const AQUI = __dirname, RAIZ = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const CALIDAD = arg('--calidad', '');
const ETIQUETA = arg('--etiqueta', 'r1');
const ANCHO = +(arg('--ancho', '1600')), ALTO = +(arg('--alto', '900'));
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi244');
fs.mkdirSync(SALIDA, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
function servir() { const srv = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); } if (p.endsWith('/')) p += 'index.html'; const f = path.join(RAIZ, p); if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('404'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }); }); return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port }))); }
class CDP { constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = () => { for (const [, p] of this.pend) p.re2(new Error('WS')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; } listo() { return new Promise(r => { this.ws.onopen = r; }); } call(me, pa, si, t) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method: me, params: pa || {}, sessionId: si })); if (t) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('timeout ' + me)); } }, t); }); } bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); } }
async function ev(cdp, ses, exp, t, pr) { const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: pr !== false, returnByValue: true }, ses, (t || 60) * 1000); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result ? r.result.value : undefined; }
(async () => {
  const gpu = (() => { try { const out = execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController | Where-Object { \$_.AdapterRAM -gt 0 } | Select-Object -First 1).Name"', { timeout: 15000 }).toString().trim(); return out; } catch (e) { return '?'; } })();
  const { srv, puerto } = await servir(); const origen = `http://127.0.0.1:${puerto}`;
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2u-k244-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf, '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--mute-audio', `--window-size=${ANCHO},${ALTO}`], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const pf = path.join(perf, 'DevToolsActivePort'); let puertoDev, wsPath;
  for (let i = 0; i < 300; i++) { if (fs.existsSync(pf)) { const l = fs.readFileSync(pf, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) { puertoDev = parseInt(l[0], 10); wsPath = l[1].trim(); break; } } await new Promise(r => setTimeout(r, 200)); }
  if (!puertoDev) { try { chrome.kill(); } catch (e) { } throw new Error('Chrome no abrió DevTools ' + err.slice(0, 200)); }
  const reqs = {}, erroresConsola = []; let ultimaRed = Date.now();
  const ws = new WebSocket(`ws://127.0.0.1:${puertoDev}${wsPath}`); const cdp = new CDP(ws); await cdp.listo();
  const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
  const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (!d.method) return; ultimaRed = Date.now();
    if (d.method === 'Network.requestWillBeSent') { const q = d.params.request || {}; reqs[d.params.requestId] = { url: q.url || '', bytes: 0, sw: 0 }; }
    else if (d.method === 'Network.responseReceived') { const r = d.params.response || {}; const q = reqs[d.params.requestId]; if (q && r.fromServiceWorker && ['network', 'fallback-code', null].includes(r.serviceWorkerResponseSource)) q.swContabilizado = true; }
    else if (d.method === 'Network.dataReceived') { const q = reqs[d.params.requestId]; if (q && q.swContabilizado) q.sw += d.params.dataLength || 0; }
    else if (d.method === 'Network.loadingFinished') { const q = reqs[d.params.requestId]; if (q) q.bytes = d.params.encodedDataLength || q.sw || 0; }
    else if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'assert')) { erroresConsola.push((d.params.args || []).map(a => String(a.value != null ? a.value : a.description || '')).join(' ').slice(0, 300)); }
  });
  for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await cdp.call(m, {}, ses);
  await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); } catch(e){}" }, ses);
  const t0 = Date.now();
  await cdp.call('Page.navigate', { url: `${origen}/index.html${CALIDAD ? '?calidad=' + encodeURIComponent(CALIDAD) : ''}` }, ses);
  let ok = false;
  while (Date.now() - t0 < (CFG.espera_listo_s || 150) * 1000) { try { if (await ev(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) { ok = true; break; } } catch (e) { } await cdp.bombear(0.5); }
  if (!ok) throw new Error('el juego no expuso window.AV en ' + CFG.espera_listo_s + ' s');
  const prep = await ev(cdp, ses, CFG.preparar_js, 120);
  // red quieta: sin pendientes (no data:/blob:) y 2 s sin actividad, tope espera_red_s
  const tq = Date.now();
  while (Date.now() - tq < (CFG.espera_red_s || 30) * 1000) {
    const pend = Object.values(reqs).filter(q => !q.bytes && !q.url.startsWith('data:') && !q.url.startsWith('blob:'));
    if (!pend.length && Date.now() - ultimaRed >= 2000) break;
    await cdp.bombear(0.5);
  }
  const archivos = {}, peticiones = { n: 0, bytes: 0 };
  for (const q of Object.values(reqs)) {
    const u = q.url; if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:') || u.startsWith('chrome') || u.startsWith('devtools')) continue;
    let ruta; try { const s = new URL(u); if (s.hostname !== '127.0.0.1' || s.port != puerto) { ruta = u; } else ruta = decodeURIComponent(s.pathname).replace(/^\//, '') || 'index.html'; } catch (e) { continue; }
    peticiones.n++; peticiones.bytes += q.bytes;
    if (!(ruta in archivos) || q.bytes > archivos[ruta]) archivos[ruta] = q.bytes;
  }
  let vista = null; try { vista = JSON.parse(await ev(cdp, ses, `new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>{try{const m=window.AV&&window.AV.look&&window.AV.look.medir();ok(JSON.stringify(m||null))}catch(e){ok(JSON.stringify({error:String(e)}))}})))`, 30)); } catch (e) { vista = { error: String(e) }; }
  // KIMI-250: esperar a que el barrido de los ~20 s suba el 4096 real y verificar que la vista asentada queda
  // idéntica (mismas calls/tris, atlas de vuelta a 4096, sin errores). También capturar la red posterior.
  let upgrade = null;
  try {
    await new Promise(r => setTimeout(r, 32000));
    const hdRed = Object.entries(reqs).filter(([id, q]) => /tex_hd\/hd_(ancient|savage)\.jpg/.test(q.url || '')).map(([id, q]) => [q.url, Math.round(q.bytes / 1024)]);
    upgrade = JSON.parse(await ev(cdp, ses, `new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
      try {
        const G = window.AV && window.AV.G; const out = { mats: [], listo: {}, look: null, memoria: null };
        try { out.listo = { savage: G.assets.atlasHDListoEs('savage'), ancient: G.assets.atlasHDListoEs('ancient') }; } catch (e) { out.listo = String(e); }
        const vistos = {};
        G.renderer.scene.traverse(o => { const ms = o.material && (Array.isArray(o.material) ? o.material : [o.material]); if (!ms) return;
          for (const m of ms) { if (!m || !/^AV_HD_/.test(m.name || '') || vistos[m.name]) continue; vistos[m.name] = 1;
            out.mats.push({ nombre: m.name, mapW: m.map && m.map.image ? m.map.image.width : null, lq: !!m.userData.avLQDifuso, esc: m.userData.avAtlasEsc ? m.userData.avAtlasEsc.value : null, normalW: m.normalMap && m.normalMap.image ? m.normalMap.image.width : null }); } });
        try { out.look = window.AV.look.medir(); } catch (e) { out.look = String(e); }
        try { out.memoria = G.renderer.renderer.info.memory; } catch (e) { out.memoria = String(e); }
        ok(JSON.stringify(out));
      } catch (e) { ok(JSON.stringify({ error: String(e) })); }
    })))`, 60));
    upgrade.hdRedPost = hdRed;
    try { const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, ses, 20000); fs.writeFileSync(path.join(SALIDA, `k250_upgrade_${CALIDAD}_${ETIQUETA}.jpg`), Buffer.from(shot.data, 'base64')); } catch (e) { }
  } catch (e) { upgrade = { error: String(e) }; }
  const tipo = r => r.endsWith('_glb.js') ? '_glb.js' : r.endsWith('.glb') ? '.glb' : /\.(png|jpe?g|webp)$/.test(r) ? 'imágenes' : r.endsWith('.js') ? '.js' : r.startsWith('http') ? 'externas' : 'otros';
  const porTipo = {}; let bytes = 0;
  for (const [r, b] of Object.entries(archivos)) { bytes += b; porTipo[tipo(r)] = (porTipo[tipo(r)] || 0) + b; }
  const MB = 1048576;
  const res = { tarea: 'KIMI-250', cuando: new Date().toISOString(), head: execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(), gpu, ventana: { ancho: ANCHO, alto: ALTO }, calidad: CALIDAD || 'auto', preparacion: prep, red_quieta_s: ((Date.now() - tq) / 1000).toFixed(1), carga_inicial: { mb: +(bytes / MB).toFixed(2), archivos_n: Object.keys(archivos).length, por_tipo_mb: Object.fromEntries(Object.entries(porTipo).map(([k, v]) => [k, +(v / MB).toFixed(2)]).sort((a, b) => b[1] - a[1])), mb_peticiones: +(peticiones.bytes / MB).toFixed(2), peticiones_n: peticiones.n, mayores_kb: Object.entries(archivos).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => [k, Math.round(v / 1024)]) }, vista_arranque: vista, upgrade_32s: upgrade, consola_errores_n: erroresConsola.length, consola_errores: erroresConsola.slice(0, 10) };
  const f = path.join(SALIDA, `k250_carga_${CALIDAD || 'auto'}_${ETIQUETA}.json`);
  fs.writeFileSync(f, JSON.stringify(res, null, 1));
  console.log(`· calidad=${res.calidad} ventana=${ANCHO}×${ALTO} gpu=${gpu} head=${res.head}`);
  console.log(`· preparación: ${prep}`);
  console.log(`· CARGA INICIAL: ${res.carga_inicial.mb} MB en ${res.carga_inicial.archivos_n} archivos (${res.carga_inicial.mb_peticiones} MB en ${res.carga_inicial.peticiones_n} peticiones)`);
  console.log('· por tipo:', JSON.stringify(res.carga_inicial.por_tipo_mb));
  console.log('· top:', res.carga_inicial.mayores_kb.map(([k, v]) => `${k} ${v}KB`).join(' · '));
  if (vista && vista.calls != null) console.log(`· vista arranque: ${vista.calls} draw calls · ${vista.triangulos} tris · ${vista.texturasMB} MB texturas · calidad ${vista.calidad}`);
  if (upgrade && upgrade.mats) console.log(`· upgrade 32 s: ${upgrade.mats.map(m => `${m.nombre} map=${m.mapW} lq=${m.lq} esc=${m.esc} normal=${m.normalW}`).join(' · ')} | listo=${JSON.stringify(upgrade.listo)} | look=${upgrade.look ? upgrade.look.calls + ' calls ' + upgrade.look.triangulos + ' tris ' + upgrade.look.texturasMB + ' MB' : '-'} | redPost=${(upgrade.hdRedPost || []).map(u => u[0].split('/').pop() + ' ' + u[1] + 'KB').join(' · ')}`);
  else console.log('· upgrade 32 s:', JSON.stringify(upgrade).slice(0, 300));
  console.log(`· consola: ${erroresConsola.length} errores`);
  console.log('· json: ' + f);
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { }
  try { chrome.kill(); } catch (e) { }
  await new Promise(r => setTimeout(r, 1500));
  try { execSync(`taskkill /PID ${chrome.pid} /T /F 2>nul`, { timeout: 10000 }); } catch (e) { }
  try { fs.rmSync(perf, { recursive: true, force: true }); } catch (e) { }
  srv.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message || e); process.exit(1); });
