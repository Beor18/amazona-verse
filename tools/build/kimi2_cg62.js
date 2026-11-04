#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — CG-62: verificación de la propuesta A de CG-60 aplicada.
   Mide y captura: (1) escalas del grupo familiar en el mundo (npcs luma-iguaca/abuela/papa de cap1 y ep2..ep4),
   (2) fondo propio del retrato de diálogo (data-fondo en .d-portrait/#d-img y en el bocadillo) con captura DOM,
   (3) captura del mundo con la familia visible + stats (FPS, draw calls, tris, memoria).
   Sirve la raiz pedida (--raiz; por defecto el repo en curso) — para el «antes» se exporta HEAD a una carpeta
   temporal y se sirve esa. Chrome headless propio + CDP, GPU real, escritorio 1280×800.

   Uso: node tools/build/kimi2_cg62.js --etiqueta despues [--raiz DIR] [--dir DIR] [--packs cap1,ep2,ep3,ep4]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const AQUI = __dirname;
const RAIZ_REPO = path.resolve(AQUI, '..', '..');
const CFG = JSON.parse(fs.readFileSync(path.join(AQUI, 'config.json'), 'utf8')).pruebas;
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const ETIQUETA = arg('--etiqueta', 'despues');
const RAIZ = path.resolve(arg('--raiz', RAIZ_REPO));
const DIR = arg('--dir', path.join(RAIZ_REPO, 'docs', 'img', 'personajes', 'aplicada'));
const PACKS = arg('--packs', 'cap1,ep2,ep3,ep4').split(',');
fs.mkdirSync(DIR, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltet-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };

function servir() {
  const QA_TAG = '<script src="tests/qa/qa.js" charset="utf-8"></script>';
  const srv = http.createServer((req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.writeHead(400); return res.end(); }
    const qa = /[?&]qa=1(?:&|$)/.test(req.url);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(RAIZ, p);
    if (!f.startsWith(RAIZ) || req.method !== 'GET') { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); return res.end('404'); }
      if (qa && /index\.html$/.test(f)) d = Buffer.from(d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + QA_TAG), 'utf8');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onclose = () => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: cerrado')); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) { const id = ++this.id; return new Promise((re, re2) => { this.pend.set(id, { re, re2 }); this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId })); if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs); }); }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 300));
  return r.result ? r.result.value : undefined;
}

const SEMILLA_SAVE_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-cg62-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(100); } try { return !!f(); } catch (e) { return false; } };
  const t = $('title');
  if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (!b) return 'la portada no tiene el botón Jugar'; b.click();
    if (!await espera(() => !t.open, 5000)) return 'la portada sigue abierta tras Jugar'; }
  const cr = $('creator');
  if (cr && !cr.hidden) { await espera(() => $('p-stage-status') && $('p-stage-status').hidden, 30000); const s = $('p-save'); if (!s) return 'sin Empezar';
    s.click(); if (!await espera(() => cr.hidden, 8000)) return 'Empezar no cerró el creador'; }
  const S = window.AV && window.AV.state; if (!S || !S.profile || !S.profile.created) return 'sin perfil creado tras entrar';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(30000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 20000);
  return 'ok'; })()`;

async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2cg62-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=1300,860'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 200));
}

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const informe = { etiqueta: ETIQUETA, raiz: RAIZ, packs: {}, dialogos: {}, mundo: null, erroresConsola: [] };
  console.log(`· CG-62 [${ETIQUETA}] · sirviendo ${RAIZ} · Chrome perfil ${l.perf}`);

  async function esperarListo(ses) {
    const t0 = Date.now();
    while (Date.now() - t0 < CFG.espera_listo_s * 1000) {
      try { if (await evaluar(cdp, ses, `!!(${CFG.listo_js})`, 10, false)) return true; } catch (e) {}
      await cdp.bombear(0.5);
    }
    return false;
  }
  async function entrada(pack, sembrar) {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: sembrar ? SEMILLA_SAVE_JS : "try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}" }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1${pack === 'cap1' ? '' : '&pack=' + pack}` }, ses);
    if (!(await esperarListo(ses))) throw new Error('el juego no arrancó en ' + pack);
    const r = await evaluar(cdp, ses, PREPARAR_JS, 300);
    // la barra de carga (#carga) puede seguir encima tras worldHidden: se espera a que se oculte y se asienta el streaming
    await evaluar(cdp, ses, `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms));
      const t0 = performance.now(); while (performance.now() - t0 < 60000) { const c = document.getElementById('carga'); if (!c || c.hidden) break; await sleep(250); }
      await sleep(4000); return 'ok'; })()`, 90);
    return { tid, ses, r };
  }

  // ---------- 1) Escalas de los npcs por pack ----------
  for (const pack of PACKS) {
    try {
      const { tid, ses } = await entrada(pack, true);
      await cdp.bombear(1.5);
      const j = JSON.parse(await evaluar(cdp, ses, `(() => {
        const out = {};
        for (const id of ['luma', 'iguaca', 'abuela', 'papa']) {
          const n = AV.G.actores.npc(id);
          if (n) out[id] = { nombre: n.def.nombre, escala: n.def.escala, mundo: +n.sp.scale.x.toFixed(3), x: +n.def.x.toFixed(1), z: +n.def.z.toFixed(1), visible: n.sp.visible };
        }
        return JSON.stringify(out); })()`, 30, false));
      informe.packs[pack] = j;
      console.log(`  · ${pack}: ` + Object.entries(j).map(([id, n]) => `${id}=${n.escala} (mundo ${n.mundo})`).join(' · '));
      // ---------- 2) Fondos de retrato (solo cap1 con capturas; ep2 solo atributo) ----------
      const PERSONAS = pack === 'cap1' ? ['Vittata', 'Iguaca', 'Abuela', 'Papá'] : ['Iguaca'];
      for (const who of PERSONAS) {
        await evaluar(cdp, ses, `(() => { AV.G.dialogo.clear(); AV.G.dialogo.say([{ who: ${JSON.stringify(who)}, text: 'Prueba CG-62: fondo del retrato.' }], null, { caja: true }); return 'ok'; })()`, 20, false);
        await cdp.bombear(1.2);
        const d = JSON.parse(await evaluar(cdp, ses, `(() => {
          const marco = document.querySelector('.d-portrait'), img = document.getElementById('d-img');
          const cs = getComputedStyle(marco);
          return JSON.stringify({ who: ${JSON.stringify(who)}, dataFondo: marco.getAttribute('data-fondo'), imgDataFondo: img.getAttribute('data-fondo'),
            fondoMarco: (cs.backgroundImage || '').slice(0, 90), dialogoVisible: !document.getElementById('dialog').hidden }); })()`, 20, false));
        informe.dialogos[pack + ':' + who] = d;
        console.log(`  · retrato ${pack}:${who}: data-fondo=${d.dataFondo} img=${d.imgDataFondo} · ${d.fondoMarco.slice(0, 60)}`);
        if (pack === 'cap1') {
          const shot = await cdp.call('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, ses, 30000);
          fs.writeFileSync(path.join(DIR, `cg62_dialogo_${who.toLowerCase()}_${ETIQUETA}.jpg`), Buffer.from(shot.data, 'base64'));
        }
        await evaluar(cdp, ses, `(AV.G.dialogo.clear(), 'ok')`, 10, false);
      }
      // Bocadillo libre: la img lleva su data-fondo también
      if (pack === 'cap1') {
        await evaluar(cdp, ses, `(AV.G.dialogo.clear(), AV.G.dialogo.say([{ who: 'Abuela', text: 'Bocadillo de prueba CG-62.' }], null, { libre: true }), 'ok')`, 20, false);
        await cdp.bombear(0.8);
        const bl = JSON.parse(await evaluar(cdp, ses, `(() => { const i = document.getElementById('bl-img'); return JSON.stringify({ dataFondo: i && i.getAttribute('data-fondo'), visible: i && !i.hidden }); })()`, 10, false));
        informe.dialogos['cap1:bocadillo:Abuela'] = bl;
        console.log(`  · bocadillo Abuela: data-fondo=${bl.dataFondo}`);
        await evaluar(cdp, ses, `(AV.G.dialogo.clear(), 'ok')`, 10, false);
      }
      // ---------- 3) Mundo: familia junta + stats (solo cap1) ----------
      // La familia (Abuela/Papá) está en la puerta de la colina (LUGARES.B ± 1,5) e Iguaca en su copa propia:
      // se encuadra cada pareja desde el sur, con la cámara ya asentada (se espera a que siga al jugador).
      if (pack === 'cap1') {
        const mirar = async (ids, nombre) => {
          const fam = JSON.parse(await evaluar(cdp, ses, `(async () => {
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            const G = AV.G, A = G.actores;
            for (const id of ['abuela', 'papa']) { const n = A.npc(id); if (n) n.setVisible(true); }
            const ns = ${JSON.stringify(ids)}.map(id => A.npc(id)).filter(Boolean);
            const bx = ns.reduce((s, n) => s + n.def.x, 0) / ns.length, bz = ns.reduce((s, n) => s + n.def.z, 0) / ns.length;
            AV.teleport(bx, bz - 7.5); AV.debug.camYaw(Math.PI);
            const t0 = performance.now();
            while (performance.now() - t0 < 12000) {
              const c = G.renderer.camera, dx = c.position.x - G.S.pos.x, dz = c.position.z - G.S.pos.z;
              if (dx * dx + dz * dz < 36) break;
              await sleep(300);
            }
            await sleep(2500);
            const st = G.renderer.stats();
            return JSON.stringify({ bx: +bx.toFixed(1), bz: +bz.toFixed(1), fps: st.fps, calls: st.calls, tris: st.triangulos,
              texturasMB: st.texturasMB != null ? st.texturasMB : null, calidad: st.calidad,
              heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
              escalas: ns.map(n => n.def.escala) }); })()`, 120));
          console.log(`  · mundo ${nombre} (${fam.bx},${fam.bz}): escalas ${fam.escalas.join('/')} · ${fam.fps} FPS · ${fam.calls} calls · ${Math.round(fam.tris / 1000)} k tris · heap ${fam.heapMB} MB`);
          const dataUrl = await evaluar(cdp, ses, "AV.G.renderer.snapshot(1280, 800, 0.92)", 90);
          if (dataUrl && dataUrl !== 'null') fs.writeFileSync(path.join(DIR, `cg62_mundo_${nombre}_${ETIQUETA}.jpg`), Buffer.from(dataUrl.split(',')[1], 'base64'));
          return fam;
        };
        informe.mundo = { familia: await mirar(['abuela', 'papa'], 'familia'), iguaca: await mirar(['luma'], 'iguaca') };
      }
      const errs = await evaluar(cdp, ses, 'JSON.stringify((window.__aveErrores || []).slice(0, 8))', 10, false);
      if (errs && errs !== '[]') informe.erroresConsola.push(pack + ': ' + errs);
      try { await cdp.call('Target.closeTarget', { targetId: tid }, undefined, 10); } catch (e) {}
    } catch (e) {
      console.log(`  · ${pack}: ERROR ${e.message.slice(0, 200)}`);
      informe.packs[pack] = { error: e.message.slice(0, 200) };
    }
  }
  fs.writeFileSync(path.join(DIR, `cg62_${ETIQUETA}.json`), JSON.stringify(informe, null, 2));
  console.log('· errores de consola: ' + JSON.stringify(informe.erroresConsola));
  console.log('· informe en ' + path.join(DIR, `cg62_${ETIQUETA}.json`));
  try { await cdp.call('Browser.close', {}, undefined, 5000); } catch (e) { l.chrome.kill(); }
  srv.close();
  try { fs.rmSync(l.perf, { recursive: true, force: true }); } catch (e) {}
  setTimeout(() => process.exit(0), 300);
})().catch(e => {
  console.error('FALLO:', e && e.stack || String(e));
  process.exit(2);
});
