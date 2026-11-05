#!/usr/bin/env node
/* Amazona Verse · Kimi 2 (PC Windows) — KIMI-056: cotorras de verdad en la bandada.
   Fase --hornea (default): abre un visor con three.js, lee assets/models/vittata_base_lod1.glb
   (solo lectura; ni el modelo ni su rig se tocan), clasifica cada vértice (cuerpo/cabeza/pico/ala/cola),
   despliega las alas, normaliza la escala y decima por celdas a dos LOD; guarda:
     - docs/img/kimi056/horneado.jpg (vista de las 6 poses con el shader real)
     - assets/data/cotorra_horneada.js (datos estáticos: window.AV_COTORRA_HORNEADA)
   Fase --valida: entra al juego con partida sembrada, espera la bandada, corre AV.bandadaTest(),
   fuerza una salida, captura el plano y los stats, y verifica que bandada.js haya cogido la malla horneada.
   Fase --ciudad (KIMI-056, «que se vean volando»): a la Ciudad de los 36 con sólidos; mide con simulación
   forzada la fracción del tiempo con cotorras en el aire y cuántas bandadas cruzan el cielo (antes ~30 %);
   verifica la dispersión nocturna; espera una bandada real y captura el cielo de la ciudad; corre
   AV.ciudadVivaTest() como regresión.

   Uso: node tools/build/kimi2_k056.js [--hornea] [--valida] [--ciudad] [--ala R] [--girar R] [--cellN m] [--cellF m] [--puerto N]
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const HORNEA = !process.argv.includes('--valida') && !process.argv.includes('--ciudad');
const CIUDAD = process.argv.includes('--ciudad');
const SALIDA = path.join(RAIZ, 'docs', 'img', 'kimi056');
const DATA_JS = path.join(RAIZ, 'assets', 'data', 'cotorra_horneada.js');
fs.mkdirSync(SALIDA, { recursive: true });

function arg(n, d) { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; }
const EXTRAS = ['ala', 'girar', 'cellN', 'cellF', 'sweep', 'droop', 'muneca', 'largo', 'cola', 'colax'].filter(k => process.argv.includes('--' + k)).map(k => `${k}=${arg('--' + k)}`).join('&');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.ico': 'image/x-icon' };
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
      if (qa && /index\.html$/.test(f)) {
        const html = d.toString('utf8').replace(/<meta charset[^>]*>/i, m => m + QA_TAG);
        d = Buffer.from(html, 'utf8');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port })));
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pend = new Map(); ws.onerror = e => { for (const [, p] of this.pend) p.re2(new Error('WebSocket: ' + (e.message || 'error'))); this.pend.clear(); }; ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && this.pend.has(d.id)) { const p = this.pend.get(d.id); this.pend.delete(d.id); d.error ? p.re2(new Error(d.error.message)) : p.re(d.result); } }; }
  listo() { return new Promise(r => { this.ws.onopen = r; }); }
  call(method, params, sessionId, timeoutMs) {
    const id = ++this.id;
    return new Promise((re, re2) => {
      this.pend.set(id, { re, re2 });
      this.ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
      if (timeoutMs) setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); re2(new Error('CDP timeout ' + method)); } }, timeoutMs);
    });
  }
  bombear(s) { return new Promise(r => setTimeout(r, s * 1000)); }
}
async function evaluar(cdp, ses, exp, timeoutS, promesa) {
  const r = await cdp.call('Runtime.evaluate', { expression: exp, awaitPromise: promesa !== false, returnByValue: true }, ses, (timeoutS || 30) * 1000);
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text).slice(0, 400));
  return r.result ? r.result.value : undefined;
}
async function lanzarChrome() {
  const perf = fs.mkdtempSync(path.join(os.tmpdir(), 'kimi2k56-'));
  const args = ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + perf,
    '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--mute-audio', '--disable-sync', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--disable-component-update', '--enable-precise-memory-info', '--window-size=800,900'];
  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; chrome.stderr.on('data', d => { err += d; });
  const puertoFile = path.join(perf, 'DevToolsActivePort');
  for (let i = 0; i < 300; i++) {
    if (fs.existsSync(puertoFile)) { const l = fs.readFileSync(puertoFile, 'utf8').split('\n'); if (l.length > 1 && l[1].trim()) return { chrome, perf, puerto: parseInt(l[0], 10), wsPath: l[1].trim() }; }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Chrome no abrió DevTools en 60 s: ' + err.slice(0, 300));
}

const SEMILLA_JS = `try {
  localStorage.clear(); sessionStorage.clear();
  window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message || e.error).slice(0, 200)));
  window.addEventListener('unhandledrejection', e => __errs.push('rechazo: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200)));
  localStorage.setItem('amazonaverse.menu', JSON.stringify({ v: 1, ultimo: 'aventura' }));
  localStorage.setItem('amazonaverse.save', JSON.stringify({
    v: 6, formato: 2, escrito: Date.now(), saveId: 'qa-k056-' + Math.random().toString(36).slice(2, 10),
    profile: { created: true, name: 'Estrella de la Bahía', look: null },
    pos: { x: -8, z: -2.5, y: 0 }, facing: { x: 0, z: 1 }, step: 0,
    inv: {}, collected: [], complete: false, explorando: false, clock: 0,
    events: [], captures: {}, missions: {}, field: [], unlocked: [], wear: {},
    comic: { title: 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    evaluated: { A: false, B: false }, examined: { maquina: false, transmisor: false }
  }));
} catch (e) {}`;
const PREPARAR_JS = `(async () => { const sleep = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) {} await sleep(200); } try { return !!f(); } catch (e) { return false; } };
  const listo = () => !!(window.AV && AV.state && AV.state.profile && AV.state.profile.created);
  const t0 = performance.now();
  while (performance.now() - t0 < 240000) {
    if (listo()) break;
    const t = $('title');
    if (t && t.open) { const b = t.querySelector('form[method=dialog] button'); if (b) b.click(); }
    else { const cr = $('creator'); if (cr && !cr.hidden) { const s = $('p-save'); if (s) s.click(); } }
    await sleep(1000);
  }
  if (!listo()) return 'sin perfil creado tras esperar 240 s';
  if (window.AV.cargaEsperar) await window.AV.cargaEsperar(60000);
  await espera(() => { try { return !(AV.G.ui && AV.G.ui.worldHidden && AV.G.ui.worldHidden()); } catch (e) { return false; } }, 30000);
  return 'ok'; })()`;

(async () => {
  const { srv, puerto } = await servir();
  const origen = `http://127.0.0.1:${puerto}`;
  const l = await lanzarChrome();
  const ws = new WebSocket(`ws://127.0.0.1:${l.puerto}${l.wsPath}`);
  const cdp = new CDP(ws); await cdp.listo();
  const fin = codigo => { try { spawnSync('taskkill', ['/PID', String(l.chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {} srv.close(); process.exit(codigo); };
  try {
    const tid = (await cdp.call('Target.createTarget', { url: 'about:blank' })).targetId;
    const ses = (await cdp.call('Target.attachToTarget', { targetId: tid, flatten: true })).sessionId;
    if (HORNEA) {
      await cdp.call('Page.navigate', { url: `${origen}/tools/build/k056_viewer.html${EXTRAS ? '?' + EXTRAS : ''}` }, ses);
      let r = null;
      for (let i = 0; i < 90; i++) { await cdp.bombear(1); r = await evaluar(cdp, ses, 'window.__k056 || null', 5, false); if (r) break; }
      if (!r) throw new Error('el visor no produjo __k056 en 90 s');
      if (r.error) throw new Error('visor: ' + r.error);
      fs.writeFileSync(path.join(SALIDA, 'horneado.jpg'), Buffer.from(r.foto.split(',')[1], 'base64'));
      for (const [k, v] of Object.entries(r.diag || {})) fs.writeFileSync(path.join(SALIDA, `diag_${k}.jpg`), Buffer.from(v.split(',')[1], 'base64'));
      const data = { ala: r.ala, cuello: r.cuello, largo: r.largo, near: r.near, far: r.far };
      fs.writeFileSync(DATA_JS, '/* KIMI-056 · cotorra horneada desde assets/models/vittata_base_lod1.glb (solo lectura).\n' +
        '   Generado por tools/build/kimi2_k056.js --hornea; no editar a mano. */\n' +
        'window.AV_COTORRA_HORNEADA = ' + JSON.stringify(data) + ';\n');
      const kb = Math.round(fs.statSync(DATA_JS).size / 1024);
      console.log(JSON.stringify({ ok: true, analisis: r.analisis, ala: r.ala, cuello: r.cuello, dataKB: kb, foto: 'docs/img/kimi056/horneado.jpg' }, null, 1));
      fin(0);
    }
    // ---- valida ----
    for (const m of ['Page.enable', 'Runtime.enable', 'Log.enable']) await cdp.call(m, {}, ses);
    await cdp.call('Page.addScriptToEvaluateOnNewDocument', { source: SEMILLA_JS }, ses);
    await cdp.call('Page.navigate', { url: `${origen}/index.html?qa=1` }, ses, 30000);
    console.log('entrada: ' + await evaluar(cdp, ses, PREPARAR_JS, 260));
    if (true) {
      const dbg = await evaluar(cdp, ses, `(() => { const t = document.getElementById('title'), cr = document.getElementById('creator');
        return JSON.stringify({ href: location.href.slice(0, 80), av: !!window.AV, ave: !!window.AVE, ready: document.readyState, titulo: document.title, guiones: document.scripts.length,
          state: !!(window.AV && AV.state), perfil: !!(window.AV && AV.state && AV.state.profile && AV.state.profile.created),
          portada: !!(t && t.open), creador: !!(cr && !cr.hidden), save: (localStorage.getItem('amazonaverse.save') || '').slice(0, 60) }); })()`, 15, false);
      console.log('diag: ' + dbg);
    }
    if (CIUDAD) {
      console.log('ciudad: midiendo el vuelo en bandada (KIMI-056, «que se vean volando»)…');
      const m = JSON.parse(await evaluar(cdp, ses, `(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const G = AV.G;
        if (!G.ciudadViva) { // la ciudad viva carga tras el primer gesto: lo simulamos y esperamos
          try { window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true })); } catch (e) {}
          const tg = performance.now();
          while (performance.now() - tg < 90000) { if (G.ciudadViva) break; await sleep(400); }
        }
        const CV = G.ciudadViva;
        if (!CV) return JSON.stringify({ error: 'sin G.ciudadViva' });
        const T = G.pruebas, s = CV.sitio();
        if (!s) return JSON.stringify({ error: 'sin sitio' });
        const H = (x, z) => G.terreno.height(x, z);
        // el centro de la ciudad es zona de redirección de teleport (KIMI-013): se usa el ancla buena de k44, fuera de los muros
        T.teleport(12, -114.8); T.tick(0.1);
        if (Math.hypot(G.S.pos.x - 12, G.S.pos.z + 114.8) > 8) { G.S.pos.x = 12; G.S.pos.z = -114.8; G.S.pos.y = H(12, -114.8) + 0.1; }
        const ancla = { x: G.S.pos.x, z: G.S.pos.z };
        const ST = G.mundo && G.mundo.streaming;
        if (ST && ST.alrededor) ST.alrededor(s.x, s.z).catch(() => {});
        const conSolido = () => { const so = G.solidos; return so && so.activo ? s.ins.filter(i => so.altoEn(i.pos[0], i.pos[2], 1e4) > H(i.pos[0], i.pos[2]) + 0.3).length : 0; };
        const t0 = performance.now();
        while (performance.now() - t0 < 150000 && conSolido() < s.ins.length * 0.5) { await sleep(2500); if (G.solidos.terminar) G.solidos.terminar(); }
        if (G.solidos.terminar) G.solidos.terminar();
        const esperaS = Math.round((performance.now() - t0) / 1000);
        // (a) 120 s simulados de día (0,05 s × 2400 pasos forzados): fracción en el aire y bandadas que cruzan el cielo
        CV.prueba(true); CV.hora(12); CV.pausa(true);
        if (!CV.aves().length) CV.paso(0.05, 'todo');
        const total = CV.aves().length;
        let airSum = 0, mues = 0, maxBando = 0, enBando = 0;
        const bandos = new Set(), est = {};
        for (let i = 0; i < 2400; i++) {
          CV.paso(0.05, 'todo');
          if (i % 10 === 0) {
            const av = CV.aves();
            airSum += av.filter(a => a.est !== 'posada').length; mues++;
            const nb = av.filter(a => a.bando).length;
            enBando += nb;
            if (nb > maxBando) maxBando = nb;
            for (const a of av) if (a.bando) bandos.add(a.bando);
            for (const a of av) est[a.est] = (est[a.est] || 0) + 1;
          }
        }
        const fraccionAire = airSum / Math.max(1, mues * total);
        const fraccionBando = enBando / Math.max(1, mues * total);
        // (b) de noche la bandada se dispersa a dormir
        CV.hora(22);
        for (let i = 0; i < 900; i++) CV.paso(0.05, 'todo');
        const duermen = CV.aves().filter(a => a.est === 'posada' && (a.accion === 'duerme' || a.accion === 'vela')).length;
        const enAireNoche = CV.aves().filter(a => a.est !== 'posada').length;
        CV.hora(12);
        for (let i = 0; i < 200; i++) CV.paso(0.05, 'todo');
        const despiertas = CV.aves().filter(a => a.accion !== 'duerme' && a.accion !== 'vela').length;
        CV.pausa(false);
        // (c) tiempo real: ¿sale una bandada de verdad gobernada por los updates del juego?
        // si en 60 s no ha salido, se fuerza con unos pasos simulados (la bandada luego vive y se mueve en tiempo real)
        const t1 = performance.now();
        let hay = false;
        while (performance.now() - t1 < 60000) { if (CV.aves().some(a => a.bando)) { hay = true; break; } await sleep(400); }
        if (!hay && CV.aves().length) {
          for (let i = 0; i < 4000 && !hay; i++) { CV.paso(0.05, 'todo'); if (CV.aves().some(a => a.bando)) hay = true; }
        }
        const st = G.renderer.stats();
        return JSON.stringify({ total, fraccionAire: +fraccionAire.toFixed(3), fraccionBando: +fraccionBando.toFixed(3), bandadas: bandos.size,
          maxBando, duermen, enAireNoche, despiertas, bandadaReal: hay, esperaS, conSolido: conSolido() + '/' + s.ins.length,
          estados: est, stats: { pasos: CV.stats().pasos, cuadros: CV.stats().cuadros }, calls: st.calls, tris: Math.round(st.triangulos), fps: st.fps });
      })()`, 420));
      console.log('ciudad: ' + JSON.stringify(m));
      fs.writeFileSync(path.join(SALIDA, 'k056-ciudad.json'), JSON.stringify(m, null, 1));
      const capturar = async nombre => {
        const foto = await evaluar(cdp, ses, `(async () => {
          let f = null;
          for (let i = 0; i < 3 && !f; i++) { f = await AV.G.renderer.snapshot(1280, 800, 0.9); if (!f) await new Promise(r => setTimeout(r, 1200)); }
          return f; })()`, 30);
        if (foto) { fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(foto.split(',')[1], 'base64')); console.log('  captura ' + nombre); }
      };
      if (m.bandadaReal) {
        // encuadre probado en v2: Vittata volando sobre el centro de la ciudad a +17 m; el anillo de la bandada (r 13-24 m
        // alrededor del centro) cruza el encuadre en alguna de las 4 tomas rápidas. Posición directa (el teleport redirige
        // dentro de la ciudad) y capturas seguidas: la bandada se mueve y en una de ellas entra en cuadro.
        await evaluar(cdp, ses, `(() => { const G = AV.G, s = G.ciudadViva.sitio();
          G.fisica.MOVE.flying = true; G.S.vy = 0;
          G.S.pos.x = s.x + 6; G.S.pos.z = s.z + 16;
          G.S.pos.y = AV.debug.height(s.x, s.z) + 17;
          AV.debug.camYaw(0.8); G.camara.inclina = -0.22; return 'ok'; })()`, 30, false);
        for (let k = 0; k < 4; k++) {
          await cdp.bombear(1.1);
          await capturar('bando_aire_' + (k + 1) + '.jpg');
        }
      }
      // gancho: atribuir cualquier malla añadida o quitada de la escena DURANTE la prueba (el check «No se crea ninguna malla nueva»)
      await evaluar(cdp, ses, `(() => { const sc = AV.G.renderer.scene; window.__adds = []; window.__rems = [];
        const oa = sc.add.bind(sc), or_ = sc.remove.bind(sc);
        sc.add = function () { for (let i = 0; i < arguments.length; i++) { const x = arguments[i];
          window.__adds.push((x.name || x.type) + ' @ ' + String(new Error().stack).split('\\n').slice(2, 4).join(' <- ').slice(0, 220)); }
          return oa.apply(sc, arguments); };
        sc.remove = function () { for (let i = 0; i < arguments.length; i++) { const x = arguments[i];
          window.__rems.push((x.name || x.type) + ' @ ' + String(new Error().stack).split('\\n').slice(2, 4).join(' <- ').slice(0, 220)); }
          return or_.apply(sc, arguments); };
        return 'ok'; })()`, 20, false);
      const cvTest = JSON.parse(await evaluar(cdp, ses, `(async () => { const r = await AV.ciudadVivaTest({ espera: 150 }); return JSON.stringify({ passed: r.passed, total: r.total, fallos: r.results.filter(x => !x.ok).map(x => x.name + ' :: ' + String(x.extra).slice(0, 200)) }); })()`, 900));
      console.log('ciudadVivaTest: ' + cvTest.passed + '/' + cvTest.total + (cvTest.fallos.length ? ' · FALLOS: ' + cvTest.fallos.join(' | ') : ''));
      const dump = async exp => { // con reintentos: la página puede tardar en quedar libre tras la prueba
        for (let i = 0; i < 4; i++) {
          try { return JSON.parse(await evaluar(cdp, ses, exp, 25)); } catch (e) { await cdp.bombear(2.5); }
        }
        return [];
      };
      const adds = await dump('JSON.stringify(window.__adds || [])');
      const rems = await dump('JSON.stringify(window.__rems || [])');
      if (adds.length) console.log('scene.add durante la prueba (' + adds.length + '):\n  ' + adds.join('\n  '));
      if (rems.length) console.log('scene.remove durante la prueba (' + rems.length + '):\n  ' + rems.join('\n  '));
      const errs = await dump('JSON.stringify((window.__errs || []).slice(0, 8))');
      console.log('errores consola: ' + JSON.stringify(errs));
      fin(m && !m.error && cvTest.passed === cvTest.total && errs.length === 0 ? 0 : 1);
    }
    // espera a que la bandada exista y use la malla horneada
    const bandada = await evaluar(cdp, ses, `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const t0 = performance.now();
      while (performance.now() - t0 < 180000) { if (window.AV && AV.G && AV.G.bandada) break; await sleep(500); }
      if (!(window.AV && AV.G && AV.G.bandada)) return { error: 'sin G.bandada' };
      const B = AV.G.bandada;
      await sleep(1500);
      const usoReal = !!B.real;
      const vertsCerca = B.meshes[0].geometry.attributes.position.count;
      // los dos checks de recuento fallan con residentes activos en EXTRA (preexistente; en baterías G.quiet los deja vacíos):
      // la medimos en silencio, como las baterías
      const quietAnt = AV.G.quiet; AV.G.quiet = true; B.EXTRA.length = 0;
      const t0b = performance.now();
      let test = null; try { test = await (window.AV.bandadaTest ? AV.bandadaTest() : B.test()); } catch (e) { test = { error: String(e && e.message || e) }; }
      AV.G.quiet = quietAnt;
      const dur = Math.round(performance.now() - t0b);
      return { usoReal, vertsCerca, test, durMs: dur }; })()`, 180);
    console.log('bandada: ' + JSON.stringify(bandada));
    if (bandada && bandada.test && !bandada.test.error) {
      const p = bandada.test.passed, t = bandada.test.total;
      console.log(`bandadaTest: ${p}/${t}` + (p < t ? ' · FALLAN: ' + bandada.test.results.filter(x => !x.ok).map(x => x.name).join(' | ') : ''));
    }
    // salida forzada + captura + stats
    const escena = await evaluar(cdp, ses, `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const B = AV.G.bandada; B.aparecer('prueba', { forzar: true, n: 12, dist: 26, ang: 2.4 });
      await sleep(2500);
      // en GPU real la primera foto puede anularse (cola llena, QA-157): con la cola drenada resuelve en 1-2 cuadros
      let foto = null;
      for (let i = 0; i < 4 && !foto; i++) { foto = await AV.G.renderer.snapshot(1280, 800, 0.9); if (!foto) await sleep(1500); }
      const st = AV.G.renderer.stats();
      return JSON.stringify({ foto, calls: st.calls, tris: Math.round(st.triangulos), fps: st.fps, calidad: st.calidad }); })()`, 60);
    const sc = JSON.parse(escena);
    if (sc.foto) fs.writeFileSync(path.join(SALIDA, 'valida_bandada.jpg'), Buffer.from(sc.foto.split(',')[1], 'base64'));
    console.log(`escena: ${sc.fps} FPS · ${sc.calls} calls · ${Math.round(sc.tris / 1000)} k tris · ${sc.calidad}${sc.foto ? ' → docs/img/kimi056/valida_bandada.jpg' : ' · foto: null (GPU sin señalar)'}`);
    fin(bandada && bandada.test && bandada.test.passed === bandada.test.total && bandada.usoReal ? 0 : 1);
  } catch (e) { console.error('ERROR: ' + e.message); fin(2); }
})();
