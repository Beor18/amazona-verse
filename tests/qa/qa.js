/* QA · batería automática de Amazona Verse (rol QA; no toca el motor ni el contenido)
   Cómo cargarla:
   - index.html?qa=1   tests/server.py inyecta este script al principio de <head> y la batería corre sola al cargar.
   - Desde la consola, en una pestaña del juego ya abierta (corre sola al cargar):
       (d => { const s = d.createElement('script'); s.src = 'tests/qa/qa.js?' + Date.now(); d.head.appendChild(s); })(document)
     y luego  await AVQA.done  (o  await AVQA.run({ ... })  para repetir con otras opciones).
     Para inyectar sin que corra sola: window.AVQA_OPTS = { autorun: false } antes de la línea de arriba.
   Los FPS por rAF solo valen con la pestaña pintándose (al frente y con el panel visible); si el navegador no la pinta,
   la batería no se cuelga: lo marca como aviso y mide el coste sintético por cuadro.
   Qué mide: AV.selfTest, missionTest, accessoryTest y templateTest; errores y warnings de consola (arranque y juego);
   FPS medios y mínimos, draw calls y coste por cuadro en 3 puntos del mapa; memoria de GPU al cambiar de ropa 10 veces
   (fugas); tiempo de carga en frío; tamaño de lo que se publicaría (*_glb.js, texturas, js); <script> sin 404.
   Salida: tests/out/qa_report.json y tests/out/qa_report.md (POST /__save de tests/server.py), AVQA.last y la consola.
   La partida guardada del jugador (localStorage) se guarda al empezar y se devuelve igual al terminar. */
(function () {
  'use strict';
  if (window.AVQA && window.AVQA.version) { console.info('AVQA ya estaba cargado: await AVQA.run()'); return; }
  const VERSION = '1.0.0';
  const T_LOAD = performance.now();
  const TOP = window.top === window;
  const params = new URLSearchParams(location.search);
  const EARLY = !window.AVE;                       // cargado antes que el motor (inyección en <head> de ?qa=1)
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const raf = () => new Promise(r => requestAnimationFrame(r));
  const r1 = v => Math.round(v * 10) / 10;
  const r2 = v => Math.round(v * 100) / 100;
  const MB = b => r2(b / 1048576);
  const KB = b => Math.round(b / 1024);
  const DEF = {
    autorun: true, save: true, history: true,
    tests: 'todas',                                // las 4 obligatorias + cualquier otra AV.*Test del pack (eduTest, maestroTest…)
    puntos: ['taller', 'villa', 'A'],              // lugares de G.terreno.places (o {nombre, x, z})
    fpsSegundos: 5, cuadrosSinteticos: 120, cambiosRopa: 10,
    presupuesto: { fpsMin: 50, fpsFalla: 30, drawCalls: 150, cargaS: 6, cargaInicialMB: 8, publicableMB: 30, publicableMaxMB: 64, archivoMaxMB: 15 },
  };
  try { performance.setResourceTimingBufferSize(4000); } catch (e) { /* sin Resource Timing */ }
  // La prueba E2E de aceptación vive al lado (tests/qa/e2e.js) y se expone como AV.e2eTest: la batería la corre al final
  const SELF = (document.currentScript && document.currentScript.src) || '';
  if (TOP && !window.AVQA_E2E) {
    const sc = document.createElement('script'); sc.charset = 'utf-8';
    sc.src = SELF ? new URL('e2e.js', SELF).href : 'tests/qa/e2e.js';
    (document.head || document.documentElement).appendChild(sc);
  }

  // ---------- 1. Consola: se escucha desde que carga este archivo ----------
  const logs = { error: [], warn: [], pagina: [], recursos: [], rechazos: [] };
  const str = a => {
    if (a instanceof Error) return a.stack || a.message;
    if (a && typeof a === 'object') { try { return JSON.stringify(a).slice(0, 300); } catch (e) { return String(a); } }
    return String(a);
  };
  const push = (list, msg) => { if (list.length < 500) list.push({ t: Math.round(performance.now()), msg: String(msg).slice(0, 600) }); };
  for (const lvl of ['error', 'warn']) {
    const orig = console[lvl];
    console[lvl] = function (...a) { try { push(logs[lvl], a.map(str).join(' ')); } catch (e) { /* nunca romper la consola */ } return orig.apply(this, a); };
  }
  addEventListener('error', e => {
    const el = e.target;
    if (el && el !== window && (el.src || el.href)) push(logs.recursos, 'no cargó ' + (el.tagName || '') + ' ' + (el.src || el.href));
    else push(logs.pagina, (e.message || 'error') + (e.filename ? ' @ ' + e.filename.replace(location.origin + '/', '') + ':' + e.lineno : ''));
  }, true);
  addEventListener('unhandledrejection', e => push(logs.rechazos, str(e.reason)));
  const isThree = m => /THREE\./.test(m);
  // Agrupa mensajes repetidos: [{ msg, veces }]
  function dedupe(list) {
    const m = new Map();
    for (const x of list) { const k = x.msg.replace(/\s+/g, ' ').slice(0, 300); m.set(k, (m.get(k) || 0) + 1); }
    return [...m].map(([msg, veces]) => ({ msg, veces }));
  }

  // ---------- 2. Hitos de carga de esta página (solo si se cargó con ?qa=1, antes que el motor) ----------
  const hitos = { modo: EARLY ? 'qa=1 (antes del motor)' : 'inyectado (después de cargar)' };
  if (EARLY && TOP) {
    (async () => {
      const t0 = performance.now();
      while (performance.now() - t0 < 120000) {
        const AV = window.AV, G = AV && AV.G;
        if (AV && hitos.avListo == null) { hitos.avListo = Math.round(performance.now()); hitos.creadorAlArrancar = !document.getElementById('creator').hidden; }
        if (G && hitos.personaje3D == null && (G.actores.player3D || G.actores.failed3D)) hitos.personaje3D = Math.round(performance.now());
        if (G && hitos.primerCuadro == null && G.renderer.renderer.info.render.frame > 0) hitos.primerCuadro = Math.round(performance.now());
        if (hitos.avListo != null && hitos.personaje3D != null && hitos.primerCuadro != null) break;
        await sleep(25);
      }
    })();
  }
  function navTiming() {
    const n = performance.getEntriesByType('navigation')[0];
    return n ? { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : {};
  }

  // ---------- Ayudas ----------
  const checks = [];
  function check(area, nombre, ok, detalle, sev) {
    checks.push({ area, nombre, estado: ok ? 'ok' : (sev || 'falla'), detalle: detalle == null ? '' : String(detalle) });
    return ok;
  }
  function status(msg) {
    console.info('[QA] ' + msg);
    const p = document.getElementById('avqa-panel');
    if (p) p.querySelector('.avqa-msg').textContent = msg;
  }
  function panel() {
    if (!TOP || !document.body || document.getElementById('avqa-panel')) return;
    const d = document.createElement('div');
    d.id = 'avqa-panel'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite');
    d.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;max-width:min(420px,calc(100vw - 16px));max-height:45vh;overflow:auto;' +
      'background:rgba(12,24,18,.92);color:#e9f3ec;font:12px/1.4 ui-monospace,Menlo,monospace;padding:8px 10px;border-radius:8px;pointer-events:auto;';
    d.innerHTML = '<b>QA Amazona Verse</b> <span class="avqa-msg">preparando…</span><pre class="avqa-out" style="white-space:pre-wrap;margin:6px 0 0"></pre>';
    document.body.appendChild(d);
  }
  async function waitFor(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 50); }
    return null;
  }
  const stats = arr => {
    if (!arr.length) return { media: null, p50: null, p95: null, p99: null, max: null };
    const s = [...arr].sort((a, b) => a - b), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
    return { media: arr.reduce((a, b) => a + b, 0) / arr.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s[s.length - 1] };
  };

  // ---------- 3. Pruebas del juego ----------
  const OBLIGATORIAS = ['selfTest', 'missionTest', 'accessoryTest', 'templateTest'];
  async function runTests(names) {
    if (names === 'todas') names = OBLIGATORIAS.concat(Object.keys(window.AV || {}).filter(k => /Test$/.test(k) && !OBLIGATORIAS.includes(k) && k !== 'e2eTest'), window.AV && window.AV.e2eTest ? ['e2eTest'] : []);
    const out = {};
    for (const name of names) {
      const fn = window.AV && window.AV[name];
      if (!fn) { out[name] = { error: 'AV.' + name + ' no existe' }; check('pruebas', 'AV.' + name, false, 'no existe en este pack'); continue; }
      status('AV.' + name + '()…');
      const t0 = performance.now();
      try {
        const r0 = await fn.call(window.AV) || {};
        const lista = r0.results || r0.checks || [];
        const r = { total: r0.total != null ? r0.total : lista.length, passed: r0.passed != null ? r0.passed : r0.pasan != null ? r0.pasan : lista.filter(x => x.ok).length, results: lista };
        const fallidas = lista.filter(x => !x.ok).map(x => ({ nombre: x.name, detalle: x.extra != null ? x.extra : x.info }));
        out[name] = { passed: r.passed, total: r.total, ms: Math.round(performance.now() - t0), fallidas };
        if (r0.bloqueados) out[name].bloqueados = r0.bloqueados;
        check('pruebas', 'AV.' + name, r.passed === r.total && r.total > 0, r.passed + '/' + r.total + (r0.bloqueados ? ' (' + r0.bloqueados + ' BLOQUEADO)' : '') + (fallidas.length ? ' · falla: ' + fallidas.map(f => f.nombre + (f.detalle ? ' (' + f.detalle + ')' : '')).join(' | ') : ''));
      } catch (e) {
        out[name] = { error: str(e), ms: Math.round(performance.now() - t0) };
        check('pruebas', 'AV.' + name, false, 'lanzó: ' + str(e).split('\n')[0]);
      }
      await sleep(300);
    }
    return out;
  }

  // ---------- 4. Rendimiento: FPS (rAF), draw calls por cuadro y coste sintético en 3 puntos ----------
  function prepareWorld(G) {
    const $ = id => document.getElementById(id), notas = [];
    G.quiet = true;
    if (!$('creator').hidden) {
      const C = G.creador, preset = (C.PRESETS && C.PRESETS[0] && C.PRESETS[0].id) || 'agilis', outfit = (C.OUTFITS && C.OUTFITS[0] && C.OUTFITS[0].id) || 'azul';
      const err = C.saveCharacter({ name: 'QA', preset, outfit, accessory: 'gafas' });
      notas.push(err ? 'no se pudo cerrar el creador: ' + err : 'creador cerrado con un perfil de prueba (la partida se devuelve al final)');
    }
    try { G.pruebas.drain(); } catch (e) { /* sin diálogo */ }
    if (G.ui.cardOpen) G.ui.hideCard();
    const title = $('title');
    if (title && title.open) { title.close(); notas.push('portada cerrada para medir'); }
    const pause = $('pause');
    try { if (pause && pause.matches(':popover-open')) pause.hidePopover(); } catch (e) { /* sin popover */ }
    G.quiet = false;
    return notas;
  }
  function wrapRender(R) {
    const orig = R.render, acc = { calls: 0, tris: 0, passes: 0 };
    // Con post-proceso el motor pone info.autoReset = false y los contadores se acumulan entre pasadas: se suma la diferencia
    R.render = function (s, c) {
      const i = this.info.render, c0 = this.info.autoReset ? 0 : i.calls, t0 = this.info.autoReset ? 0 : i.triangles;
      const r = orig.call(this, s, c);
      acc.calls += i.calls - c0; acc.tris += i.triangles - t0; acc.passes++;
      return r;
    };
    return { acc, restore: () => { R.render = orig; } };
  }
  async function measurePoint(G, p, opts) {
    const R = G.renderer.renderer, gl = R.getContext();
    const progs0 = R.info.programs ? R.info.programs.length : 0, tex0 = R.info.memory.textures;
    const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || null, nivel0 = nivel();
    G.pruebas.teleport(p.x, p.z);
    G.camara.place(true);
    await sleep(800);                                             // asentar cámara, LOD y cargas en vuelo
    const w = wrapRender(R), deltas = [], perFrame = [];
    let last = null, stalls = 0, rafDetenido = false;
    const t0 = performance.now();
    while (performance.now() - t0 < opts.fpsSegundos * 1000) {
      const now = await Promise.race([raf(), sleep(500).then(() => null)]);   // sin rAF (pestaña sin pintar) no se cuelga
      if (now == null) { if (++stalls >= 3) { rafDetenido = true; break; } last = null; continue; }
      if (last != null) deltas.push(now - last);
      last = now;
      if (w.acc.passes) perFrame.push({ calls: w.acc.calls, tris: w.acc.tris, passes: w.acc.passes });
      w.acc.calls = w.acc.tris = w.acc.passes = 0;
    }
    // Coste sintético: update + render + lectura de 1 píxel (obliga a esperar a la GPU); da margen por encima de los 60 Hz
    // y sirve aunque el navegador no esté pintando la pestaña. También da las draw calls si no hubo rAF.
    const buf = new Uint8Array(4), synth = [], synthFrames = [];
    for (let i = 0; i < opts.cuadrosSinteticos; i++) {
      w.acc.calls = w.acc.tris = w.acc.passes = 0;
      const a = performance.now();
      const moving = G.renderer.update(1 / 60);
      G.renderer.render(1 / 60, moving);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      synth.push(performance.now() - a);
      if (w.acc.passes) synthFrames.push({ calls: w.acc.calls, tris: w.acc.tris, passes: w.acc.passes });
    }
    w.restore();
    const drawCallsDe = perFrame.length ? 'rAF' : 'sintético';
    if (!perFrame.length) perFrame.push(...synthFrames);
    const d = stats(deltas), s = stats(synth), dc = stats(perFrame.map(f => f.calls)), tr = stats(perFrame.map(f => f.tris));
    const span = deltas.reduce((a, b) => a + b, 0);
    return {
      nombre: p.nombre, x: p.x, z: p.z,
      cuadros: deltas.length, rafDetenido, drawCallsDe,
      fpsMedio: span ? r1(deltas.length * 1000 / span) : null,
      fpsMin: d.max ? r1(1000 / d.max) : null,
      fps1pctBajo: d.p99 ? r1(1000 / d.p99) : null,
      msMedio: d.media && r2(d.media), msMax: d.max && r1(d.max),
      tirones33ms: deltas.filter(x => x > 33.4).length,
      drawCalls: dc.media != null ? Math.round(dc.media) : null, drawCallsMax: dc.max,
      triangulos: tr.media != null ? Math.round(tr.media) : null,
      pasadasPorCuadro: perFrame.length ? r2(perFrame.reduce((a, f) => a + f.passes, 0) / perFrame.length) : null,
      programas: R.info.programs ? R.info.programs.length : null, programasNuevos: (R.info.programs ? R.info.programs.length : 0) - progs0,
      geometrias: R.info.memory.geometries, texturas: R.info.memory.textures, texturasNuevas: R.info.memory.textures - tex0,
      sintetico: { msMedio: s.media && r2(s.media), msP95: s.p95 && r2(s.p95), fpsEquivalentes: s.media ? Math.round(1000 / s.media) : null },
      pixelRatio: R.getPixelRatio(), visibilidad: document.visibilityState, mundoVisible: !G.ui.worldHidden(),
      calidad: nivel0 === nivel() ? nivel0 : nivel0 + '→' + nivel(),
    };
  }
  async function performanceAt(G, opts) {
    const PL = G.terreno.places || {}, S = G.S;
    const keepPos = { x: S.pos.x, z: S.pos.z, fx: S.facing.x, fz: S.facing.z };
    const pts = opts.puntos.map(p => typeof p === 'string' ? (PL[p] ? { nombre: p, x: PL[p].x, z: PL[p].z } : null) : p).filter(Boolean);
    const out = [];
    for (const p of pts) { status('rendimiento en ' + p.nombre + '…'); out.push(await measurePoint(G, p, opts)); }
    G.pruebas.teleport(keepPos.x, keepPos.z, keepPos.fx, keepPos.fz); G.camara.place(true);
    return out;
  }

  // ---------- 5. Memoria: cambiar de ropa 10 veces (fugas de geometrías, texturas, programas y objetos) ----------
  function outfitLooks(n) {
    const C3 = window.AVCharacter, pieces = [];
    for (const d of C3.ACCESSORIES) for (const st of (d.styles || [[undefined]]).map(s => s[0])) pieces.push({ d, st });
    const looks = [];
    for (let i = 0; i < n; i++) {
      const acc = {};
      for (const k of [0, 5, 11]) {                                 // hasta 3 piezas por look, en ranuras distintas
        const { d, st } = pieces[(i * 7 + k * 13) % pieces.length];
        if (!acc[d.slot]) acc[d.slot] = { id: d.id, color: d.colors[i % d.colors.length], style: st };
      }
      looks.push(acc);
    }
    return looks;
  }
  async function waitMounted(ch, look, ms) {
    const C3 = window.AVCharacter;
    return !!(await waitFor(() => Object.entries(look).every(([slot, a]) => {
      const def = C3.ACCESSORIES.find(d => d.id === a.id);
      return !(def && def.glb) || (ch.mounted[slot] && ch.mounted[slot].blender);
    }), ms, 60));
  }
  async function memoryTest(G, opts) {
    const A = G.actores, S = G.S, R = G.renderer.renderer, scene = G.renderer.scene;
    const ch = A.player3D;
    if (!ch) return { error: 'sin personaje 3D' };
    const wear0 = JSON.parse(JSON.stringify(S.wear || {}));
    const snap = () => {
      G.camara.place(true); R.render(scene, G.renderer.camera);
      let objs = 0; scene.traverse(() => objs++);
      let mine = 0; ch.root.traverse(() => mine++);
      return { geometrias: R.info.memory.geometries, texturas: R.info.memory.textures, programas: R.info.programs ? R.info.programs.length : 0,
        objetosEscena: objs, objetosPersonaje: mine, heapMB: performance.memory ? MB(performance.memory.usedJSHeapSize) : null };
    };
    const wear = async (look, wait) => {
      S.wear = look; A.applyWear();
      const ok = wait ? await waitMounted(ch, look, 10000) : true;
      R.render(scene, G.renderer.camera);
      return ok;
    };
    const looks = outfitLooks(opts.cambiosRopa);
    await wear(wear0, true); await sleep(200);
    const inicial = snap();
    status('ropa: 1.ª vuelta (calienta la caché)…');
    const timeouts = [];
    for (const [i, l] of looks.entries()) if (!(await wear(l, true))) timeouts.push(i);
    await wear(wear0, true); await sleep(300);
    const calentada = snap();
    status('ropa: 2.ª vuelta (mide fugas)…');
    const pasos = [];
    for (const l of looks) { await wear(l, true); pasos.push(Object.assign({ look: Object.values(l).map(a => a.id + (a.style ? ':' + a.style : '')).join('+') }, snap())); }
    await wear(wear0, true); await sleep(300);
    let final = snap(), repetida = false, real = final;
    // Una textura o geometría del mundo que termina de cargar en medio da un falso +1: si sube, se repite la vuelta y solo
    // cuenta como fuga si vuelve a subir
    if (final.geometrias > calentada.geometrias || final.texturas > calentada.texturas) {
      const antes = final; repetida = true;
      for (const l of looks) await wear(l, true);
      await wear(wear0, true); await sleep(300);
      const otra = snap(); real = otra;
      final = (otra.geometrias > antes.geometrias || otra.texturas > antes.texturas) ? otra : Object.assign({}, otra, { geometrias: calentada.geometrias + Math.max(0, otra.geometrias - antes.geometrias), texturas: calentada.texturas + Math.max(0, otra.texturas - antes.texturas) });
    }
    status('ropa: cambios rápidos sin esperar la carga…');
    for (const l of looks) await wear(l, false);
    await wear(wear0, true); await sleep(2500); await wear(wear0, true);
    const rapida = snap();
    S.wear = wear0; A.applyWear();
    const diff = (a, b) => ({ geometrias: b.geometrias - a.geometrias, texturas: b.texturas - a.texturas, programas: b.programas - a.programas,
      objetosEscena: b.objetosEscena - a.objetosEscena, heapMB: a.heapMB != null ? r2(b.heapMB - a.heapMB) : null });
    return { cambios: looks.length, looks: looks.map(l => Object.values(l).map(a => a.id + (a.style ? ':' + a.style : '')).join('+')),
      inicial, calentada, final, rapida, vueltaRepetida: repetida, cacheCrecio: diff(inicial, calentada), fuga: diff(calentada, final), fugaRapida: diff(real, rapida),
      sinCargarA10s: timeouts.map(i => looks[i]), pasos };
  }

  // ---------- 6. Carga en frío (iframe con la consola escuchada desde el primer script) ----------
  async function coldBoot(opts) {
    const html = await (await fetch('index.html', { cache: 'no-store' })).text();
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    const hook = '<base href="' + base + '"><script>(function(){window.__qaLog=[];try{performance.setResourceTimingBufferSize(4000)}catch(e){}' +
      '["error","warn"].forEach(function(l){var o=console[l];console[l]=function(){try{__qaLog.push([l,[].map.call(arguments,function(a){return a&&a.stack?a.stack:String(a)}).join(" ").slice(0,600)])}catch(e){}return o.apply(this,arguments)}});' +
      'addEventListener("error",function(e){var t=e.target;__qaLog.push(t&&t!==window&&(t.src||t.href)?["recurso","no cargó "+(t.src||t.href)]:["pagina",(e.message||"error")+(e.filename?" @ "+e.filename+":"+e.lineno:"")])},true);' +
      'addEventListener("unhandledrejection",function(e){__qaLog.push(["rechazo",String(e.reason&&e.reason.stack||e.reason)])})})()<\/script>';
    const doc = html.replace(/<head[^>]*>/i, m => m + hook).replace(/<script[^>]+tests\/qa\/qa\.js[^>]*><\/script>/g, '');
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:640px;border:0;';
    const t0 = performance.now();
    fr.srcdoc = doc;
    document.body.appendChild(fr);
    const W = () => fr.contentWindow;
    const at = {};
    const tStart = performance.now();
    while (performance.now() - tStart < (opts.timeout || 60000)) {
      await sleep(25);
      let w; try { w = W(); } catch (e) { continue; }
      if (!w || !w.document) continue;
      const now = Math.round(performance.now() - t0);
      if (at.domContentLoaded == null && w.document.readyState !== 'loading' && w.AVE) at.domContentLoaded = now;
      if (at.avListo == null && w.AV && w.AV.G) at.avListo = now;
      const G = w.AV && w.AV.G;
      if (G && at.personaje3D == null && (G.actores.player3D || G.actores.failed3D)) at.personaje3D = now;
      if (G && at.primerCuadro == null && G.renderer.renderer.info.render.frame > 0) at.primerCuadro = now;
      if (at.load == null && w.document.readyState === 'complete') at.load = now;
      if (at.avListo != null && at.personaje3D != null && at.load != null && (at.primerCuadro != null || now - at.personaje3D > 3000)) break;
    }
    await sleep(2500);                                              // warnings tardíos (texturas, GLB del entorno)
    const w = W();
    const res = (w && w.performance.getEntriesByType('resource')) || [];
    const bytes = e => e.encodedBodySize || e.transferSize || 0;
    const porTipo = {};
    for (const e of res) {
      const u = e.name.replace(base, '');
      const k = /^https?:/.test(u) ? 'cdn' : /_glb\.js(\?|$)/.test(u) ? 'modelos (_glb.js)' : /\.glb(\?|$)/.test(u) ? 'modelos (.glb)' : /\.(png|jpe?g|webp)(\?|$)/i.test(u) ? 'imágenes y texturas' : /\.js(\?|$)/.test(u) ? 'código y datos (.js)' : /\.css/.test(u) ? 'css' : 'otros';
      porTipo[k] = (porTipo[k] || 0) + bytes(e);
    }
    const fallidos = res.filter(e => e.responseStatus >= 400).map(e => e.responseStatus + ' ' + e.name.replace(base, ''));
    const consola = ((w && w.__qaLog) || []).map(([nivel, msg]) => ({ nivel, msg }));
    const G = w && w.AV && w.AV.G;
    const info = G ? { geometrias: G.renderer.renderer.info.memory.geometries, texturas: G.renderer.renderer.info.memory.textures } : null;
    try { if (G) { G.renderer.renderer.dispose(); G.renderer.renderer.forceContextLoss(); } } catch (e) { /* ya cerrado */ }
    fr.remove();
    const total = Object.values(porTipo).reduce((a, b) => a + b, 0);
    return { ms: at, peticiones: res.length, bytesTotales: total, MB: MB(total), porTipoKB: Object.fromEntries(Object.entries(porTipo).map(([k, v]) => [k, KB(v)])),
      fallidos, consola, memoriaGPU: info,
      mayores: res.map(e => ({ archivo: e.name.replace(base, ''), KB: KB(bytes(e)) })).sort((a, b) => b.KB - a.KB).slice(0, 12) };
  }

  // ---------- 7. <script> y hojas de estilo de index.html sin 404; módulos sin enlazar ----------
  async function head(url) {
    try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return { status: r.status, bytes: +r.headers.get('content-length') || 0 }; }
    catch (e) {
      try { await fetch(url, { mode: 'no-cors', cache: 'no-store' }); return { status: 0, bytes: 0, nota: 'opaca (sin CORS), respondió' }; }
      catch (e2) { return { status: -1, bytes: 0, nota: str(e2) }; }
    }
  }
  async function listDir(dir) {             // índice de carpeta de tests/server.py (SimpleHTTPRequestHandler)
    try {
      const r = await fetch(dir, { cache: 'no-store' });
      if (!r.ok || !/text\/html/.test(r.headers.get('content-type') || '')) return [];
      const d = new DOMParser().parseFromString(await r.text(), 'text/html');
      return [...d.querySelectorAll('li > a')].map(a => decodeURIComponent(a.getAttribute('href'))).filter(h => h && !h.startsWith('..') && !h.startsWith('?'));
    } catch (e) { return []; }
  }
  async function crawl(roots, max) {
    const files = [], queue = [...roots];
    while (queue.length && files.length < max) {
      const dir = queue.shift();
      for (const name of await listDir(dir)) {
        if (/^\.|__pycache__/.test(name)) continue;
        if (name.endsWith('/')) queue.push(dir + name); else files.push(dir + name);
      }
    }
    return files;
  }
  async function pool(items, n, fn) {
    const out = new Array(items.length); let i = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
    return out;
  }
  async function scriptsCheck(htmlText) {
    const d = new DOMParser().parseFromString(htmlText, 'text/html');
    const urls = [...d.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))
      .concat([...d.querySelectorAll('link[rel="stylesheet"][href]')].map(l => l.getAttribute('href')))
      .filter(u => !/tests\/qa\/qa\.js/.test(u));
    const res = await pool(urls, 8, async u => Object.assign({ url: u }, await head(new URL(u, location.href).href)));
    const fallidos = res.filter(r => !(r.status === 200 || r.status === 0));
    // Enlazados: los de index.html y los que la página inyecta en vivo (p. ej. aula.js pone <link id="aula-css">)
    const vivos = [...document.querySelectorAll('script[src], link[rel="stylesheet"][href]')]
      .map(e => new URL(e.getAttribute('src') || e.getAttribute('href'), location.href))
      .filter(u => u.origin === location.origin).map(u => decodeURIComponent(u.pathname.replace(/^\//, '')));
    const enlazados = new Set(urls.filter(u => !/^https?:/.test(u)).map(u => u.split('?')[0]).concat(vivos));
    // Módulos del motor, del juego, de la UI y del capítulo que existen en disco pero index.html no carga
    const disco = (await crawl(['src/', 'content/cap1/'], 400)).filter(f => /\.(js|css)$/.test(f));
    const huerfanos = disco.filter(f => !enlazados.has(f));
    const T = window.THREE;
    const globals = { three: T ? T.REVISION : null, GLTFLoader: !!(T && T.GLTFLoader), SkeletonUtils: !!(T && T.SkeletonUtils), AVE: !!window.AVE, AV: !!window.AV };
    return { total: urls.length, fallidos, huerfanos, globals, lista: res };
  }

  // ---------- 8. Tamaño de lo que se publicaría ----------
  function categoria(p) {
    if (/_glb\.js$/.test(p)) return 'modelos (_glb.js)';
    if (/\.(png|jpe?g|webp|ktx2|basis|gif|svg)$/i.test(p)) return p.startsWith('assets/tex/') ? 'texturas' : 'imágenes y sprites';
    if (/\.js$/.test(p)) return p.startsWith('assets/') ? 'datos (.js)' : 'código (.js)';
    if (/\.(css|html)$/.test(p)) return 'html y css';
    if (/\.(woff2?|ttf|otf|mp3|ogg|wav|m4a)$/i.test(p)) return 'otros';
    return null;
  }
  async function assetSizes(cold, opts) {
    const files = ['index.html'].concat(await crawl(['src/', 'content/', 'assets/'], 4000));
    const sized = await pool(files, 12, async f => ({ f, b: (await head(f)).bytes }));
    const pub = {}, nopub = {}, grandes = [], todos = [];
    let total = 0, totalNo = 0;
    for (const { f, b } of sized) {
      const c = categoria(f);
      if (c) { pub[c] = (pub[c] || 0) + b; total += b; todos.push({ archivo: f, KB: KB(b), categoria: c }); if (b > opts.presupuesto.archivoMaxMB * 1048576) grandes.push(f + ' ' + MB(b) + ' MB'); }
      else { const ext = (f.match(/\.[^./]+$/) || ['(sin ext)'])[0]; nopub[ext] = (nopub[ext] || 0) + b; totalNo += b; }
    }
    // Lo que esta sesión (y la carga en frío) pidió de verdad; lo publicable que nadie pidió
    const pedidos = new Set(performance.getEntriesByType('resource').map(e => decodeURIComponent(e.name.replace(location.origin + '/', '').split('?')[0])));
    for (const m of (cold && cold.mayores) || []) pedidos.add(m.archivo);
    const glbPedido = f => pedidos.has(f) || pedidos.has(f.replace(/_glb\.js$/, '.glb'));
    const sinPedir = todos.filter(t => !glbPedido(t.archivo) && t.categoria !== 'código (.js)' && t.archivo !== 'index.html');
    const sinPedirBytes = sinPedir.reduce((a, t) => a + t.KB * 1024, 0);
    const porCarpeta = {};
    for (const t of todos) { const k = t.archivo.split('/').slice(0, t.archivo.startsWith('assets/models/') ? 3 : 2).join('/'); porCarpeta[k] = (porCarpeta[k] || 0) + t.KB; }
    return {
      archivos: sized.length, publicableBytes: total, publicableMB: MB(total),
      porCategoriaKB: Object.fromEntries(Object.entries(pub).map(([k, v]) => [k, KB(v)])),
      porCarpetaKB: Object.fromEntries(Object.entries(porCarpeta).sort((a, b) => b[1] - a[1])),
      noPublicableMB: MB(totalNo), noPublicablePorExtKB: Object.fromEntries(Object.entries(nopub).map(([k, v]) => [k, KB(v)])),
      mayores: todos.sort((a, b) => b.KB - a.KB).slice(0, 15),
      sinPedirEnSesion: { archivos: sinPedir.length, MB: MB(sinPedirBytes), ejemplos: sinPedir.slice(0, 20).map(t => t.archivo + ' (' + t.KB + ' KB)') },
      archivosSobreLimite: grandes,
    };
  }

  // ---------- 9. Informe ----------
  function verdict() {
    const f = checks.filter(c => c.estado === 'falla').length, a = checks.filter(c => c.estado === 'aviso').length;
    return { estado: f ? 'FALLA' : a ? 'OK con avisos' : 'OK', fallas: f, avisos: a, ok: checks.filter(c => c.estado === 'ok').length };
  }
  function markdown(R) {
    const L = [], v = R.resumen;
    L.push('# QA Amazona Verse · ' + R.fecha, '', '**' + v.estado + '** · ' + v.ok + ' ok, ' + v.fallas + ' fallas, ' + v.avisos + ' avisos · ' + R.duracionS + ' s · ' + R.url, '');
    L.push('Navegador: ' + R.entorno.navegador + ' · ventana ' + R.entorno.ventana + ' · DPR ' + R.entorno.dpr + ' · pixelRatio ' + R.entorno.pixelRatio + ' · ' + R.entorno.visibilidad, '');
    L.push('## Comprobaciones', '', '| estado | área | comprobación | detalle |', '|---|---|---|---|');
    const order = { falla: 0, aviso: 1, ok: 2 };
    for (const c of [...R.checks].sort((a, b) => order[a.estado] - order[b.estado])) L.push('| ' + c.estado + ' | ' + c.area + ' | ' + c.nombre + ' | ' + String(c.detalle).replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 300) + ' |');
    if (R.rendimiento && R.rendimiento.length) {
      L.push('', '## Rendimiento', '', '| punto | FPS medio | FPS mín | 1 % bajo | tirones >33 ms | draw calls (máx) | triángulos | ms/cuadro sintético (p95) |', '|---|---|---|---|---|---|---|---|');
      for (const p of R.rendimiento) L.push(`| ${p.nombre} (${p.x}, ${p.z}) | ${p.fpsMedio} | ${p.fpsMin} | ${p.fps1pctBajo} | ${p.tirones33ms} | ${p.drawCalls} (${p.drawCallsMax}) | ${p.triangulos} | ${p.sintetico.msMedio} (${p.sintetico.msP95}) |`);
    }
    const M = R.memoria;
    if (M && !M.error) {
      L.push('', '## Memoria (ropa ×' + M.cambios + ')', '', '| momento | geometrías | texturas | programas | objetos escena | heap MB |', '|---|---|---|---|---|---|');
      for (const k of ['inicial', 'calentada', 'final', 'rapida']) { const s = M[k]; L.push(`| ${k} | ${s.geometrias} | ${s.texturas} | ${s.programas} | ${s.objetosEscena} | ${s.heapMB} |`); }
      L.push('', 'Fuga (2.ª vuelta − 1.ª): ' + JSON.stringify(M.fuga) + ' · cambios rápidos: ' + JSON.stringify(M.fugaRapida));
    }
    const C = R.carga;
    if (C) {
      L.push('', '## Carga', '', 'En frío (iframe, ms desde el inicio): ' + JSON.stringify(C.frio && C.frio.ms) + ' · ' + (C.frio ? C.frio.peticiones + ' peticiones, ' + C.frio.MB + ' MB' : ''));
      if (C.pagina && C.pagina.avListo != null) L.push('Esta página (?qa=1): ' + JSON.stringify(C.pagina));
      if (C.frio) L.push('', 'Por tipo (KB): ' + JSON.stringify(C.frio.porTipoKB), '', 'Mayores: ' + C.frio.mayores.slice(0, 8).map(m => m.archivo + ' ' + m.KB + ' KB').join(', '));
    }
    const A = R.assets;
    if (A) {
      L.push('', '## Lo que se publicaría', '', '**' + A.publicableMB + ' MB** en ' + A.archivos + ' archivos revisados. Por categoría (KB): ' + JSON.stringify(A.porCategoriaKB));
      L.push('', 'Por carpeta (KB): ' + Object.entries(A.porCarpetaKB).slice(0, 10).map(([k, v]) => k + ' ' + v).join(', '));
      L.push('', 'Sin pedir en esta sesión: ' + A.sinPedirEnSesion.archivos + ' archivos, ' + A.sinPedirEnSesion.MB + ' MB. No publicable (fuentes .glb/.json…): ' + A.noPublicableMB + ' MB.');
    }
    const K = R.consola;
    L.push('', '## Consola', '', `Errores ${K.errores.length} · warnings de Three ${K.threeWarnings.length} · otros warnings ${K.otrosWarnings.length}`);
    for (const e of [...K.errores, ...K.threeWarnings, ...K.otrosWarnings].slice(0, 30)) L.push('- (' + e.veces + '×) ' + e.msg.split('\n')[0].slice(0, 220));
    if (R.scripts) {
      L.push('', '## Scripts', '', R.scripts.total + ' en index.html, ' + R.scripts.fallidos.length + ' con error.' + (R.scripts.huerfanos.length ? ' Sin enlazar: ' + R.scripts.huerfanos.join(', ') : ''));
    }
    L.push('', 'Re-correr: abrir `index.html?qa=1` o inyectar `tests/qa/qa.js` desde la consola (ver cabecera del archivo).', '');
    return L.join('\n');
  }
  async function saveFile(name, body, type) {
    try { const r = await fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body: new Blob([body], { type }) }); return r.ok; }
    catch (e) { return false; }
  }

  // ---------- Corrida completa ----------
  let running = null;
  async function run(o) {
    if (running) return running;
    running = (async () => {
      const opts = Object.assign({}, DEF, o || {}, { presupuesto: Object.assign({}, DEF.presupuesto, (o || {}).presupuesto) });
      const P = opts.presupuesto, tRun = performance.now();
      checks.length = 0;
      panel();
      status('esperando a que el juego cargue…');
      const AV = await waitFor(() => window.AV && window.AV.G && (window.AV.G.actores.player3D || window.AV.G.actores.failed3D) && window.AV, 90000, 100);
      const report = { qa: VERSION, fecha: new Date().toISOString(), url: location.href, opciones: opts };
      if (!AV) { check('carga', 'El juego expone window.AV con el personaje 3D', false, 'no llegó en 90 s'); }
      else check('carga', 'El juego expone window.AV con el personaje 3D', !AV.G.actores.failed3D, AV.G.actores.failed3D ? 'falló el modelo 3D: se usan sprites' : 'listo');
      const G = AV && AV.G;
      const KEY = G && G.guardado.KEY;
      const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
      const keep = KEY ? { a: read(KEY), b: read(KEY + '.prev') } : null;
      await sleep(1500);
      report.entorno = {
        navegador: navigator.userAgent.replace(/^Mozilla\/5\.0 /, ''), ventana: innerWidth + '×' + innerHeight, dpr: devicePixelRatio,
        pixelRatio: G ? G.renderer.renderer.getPixelRatio() : null, movil: G ? G.renderer.MOBILE : null,
        visibilidad: document.visibilityState, heapMB: performance.memory ? MB(performance.memory.usedJSHeapSize) : null,
        gpu: (() => { try { const gl = G.renderer.renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : null; } catch (e) { return null; } })(),
      };
      try {
        // Scripts
        status('revisando <script> de index.html…');
        const html = await (await fetch('index.html', { cache: 'no-store' })).text();
        const sc = report.scripts = await scriptsCheck(html);
        check('scripts', 'Todos los <script> y CSS de index.html responden 200', sc.fallidos.length === 0, sc.fallidos.length ? sc.fallidos.map(f => f.status + ' ' + f.url).join(', ') : sc.total + ' archivos');
        check('scripts', 'Three r128, GLTFLoader y SkeletonUtils cargados', sc.globals.three === '128' && sc.globals.GLTFLoader && sc.globals.SkeletonUtils, JSON.stringify(sc.globals));
        check('scripts', 'Sin módulos en disco que index.html no cargue', sc.huerfanos.length === 0, sc.huerfanos.join(', ') || 'ninguno', 'aviso');
        if (G) {
          report.preparacion = prepareWorld(G);
          // Rendimiento
          report.rendimiento = await performanceAt(G, opts);
          for (const p of report.rendimiento) {
            if (!p.mundoVisible) { check('rendimiento', 'Mundo visible al medir en ' + p.nombre, false, 'el creador tapaba el mundo: medición inválida'); continue; }
            if (p.visibilidad !== 'visible') check('rendimiento', 'Pestaña visible al medir en ' + p.nombre, false, p.visibilidad + ': FPS por rAF poco fiables', 'aviso');
            if (p.rafDetenido || !p.cuadros) {
              check('rendimiento', 'FPS por rAF en ' + p.nombre, false, 'el navegador no pintó la pestaña (rAF detenido): se juzga por el coste sintético', 'aviso');
              // Sin pintar, el navegador también relega la GPU: el sintético orienta, pero no basta para declarar una falla
              check('rendimiento', 'Coste por cuadro en ' + p.nombre + ' (sintético, pestaña sin pintar)', p.sintetico.fpsEquivalentes >= P.fpsMin, p.sintetico.msMedio + ' ms medio, p95 ' + p.sintetico.msP95 + ' ms (≈' + p.sintetico.fpsEquivalentes + ' FPS); repetir con la pestaña al frente', 'aviso');
            } else check('rendimiento', 'FPS en ' + p.nombre, p.fpsMedio >= P.fpsMin, `medio ${p.fpsMedio}, mín ${p.fpsMin}, 1 % ${p.fps1pctBajo}, ${p.tirones33ms} tirones` + (p.calidad ? ', calidad ' + p.calidad : '') + (p.programasNuevos ? ', ' + p.programasNuevos + ' shaders nuevos' : ''), p.fpsMedio >= P.fpsFalla ? 'aviso' : 'falla');
            check('rendimiento', 'Draw calls en ' + p.nombre + ' ≤ ' + P.drawCalls, p.drawCalls <= P.drawCalls, `${p.drawCalls} (máx ${p.drawCallsMax}), ${p.triangulos} triángulos, ${p.pasadasPorCuadro} pasadas`, 'aviso');
          }
          // Memoria
          status('memoria: 10 cambios de ropa…');
          try {
            const M = report.memoria = await memoryTest(G, opts);
            if (M.error) check('memoria', 'Cambiar de ropa ×' + opts.cambiosRopa + ' sin fugas', false, M.error);
            else {
              check('memoria', 'Cambiar de ropa ×' + M.cambios + ' sin fugas de geometrías ni texturas', M.fuga.geometrias <= 0 && M.fuga.texturas <= 0, JSON.stringify(M.fuga));
              check('memoria', 'Cambios rápidos (sin esperar la carga) sin fugas', M.fugaRapida.geometrias <= 0 && M.fugaRapida.texturas <= 0 && M.fugaRapida.objetosEscena <= 0, JSON.stringify(M.fugaRapida));
              check('memoria', 'Sin programas de shader nuevos en la 2.ª vuelta', M.fuga.programas <= 0, JSON.stringify(M.fuga.programas), 'aviso');
              check('memoria', 'Todas las piezas GLB cargan en < 10 s', !M.sinCargarA10s.length, M.sinCargarA10s.length ? JSON.stringify(M.sinCargarA10s) : 'sí', 'aviso');
            }
          } catch (e) { check('memoria', 'Cambiar de ropa sin fugas', false, 'lanzó: ' + str(e)); }
          // Pruebas del juego. Con la ventana en 0×0 (panel oculto, iframe plegado) el lienzo queda en 0 y fallan capturas y retratos
          if (!innerWidth || !innerHeight) check('entorno', 'La ventana tiene tamaño al correr las pruebas', false, innerWidth + '×' + innerHeight + ': las capturas del cómic salen vacías; abre el panel o fija un tamaño (resize_window)', 'aviso');
          report.pruebas = await runTests(opts.tests);
        }
        // Carga en frío y consola del arranque
        status('carga en frío en un iframe…');
        try {
          const cold = await coldBoot(opts);
          report.carga = { frio: cold, pagina: Object.assign({}, hitos, navTiming()) };
          const ready = cold.ms.personaje3D != null ? cold.ms.personaje3D : cold.ms.avListo;
          check('carga', 'Carga en frío hasta el personaje 3D ≤ ' + P.cargaS + ' s', ready != null && ready <= P.cargaS * 1000, ready != null ? r2(ready / 1000) + ' s (' + JSON.stringify(cold.ms) + ')' : 'no llegó', 'aviso');
          check('carga', 'Descarga inicial ≤ ' + P.cargaInicialMB + ' MB', cold.MB <= P.cargaInicialMB, cold.MB + ' MB en ' + cold.peticiones + ' peticiones', 'aviso');
          check('carga', 'Ninguna petición del arranque falla (4xx/5xx)', !cold.fallidos.length, cold.fallidos.join(', ') || 'ninguna');
        } catch (e) { check('carga', 'Carga en frío', false, 'lanzó: ' + str(e)); }
        // Tamaño publicable
        status('midiendo lo que se publicaría…');
        try {
          const A = report.assets = await assetSizes(report.carga && report.carga.frio, opts);
          check('assets', 'Publicable ≤ ' + P.publicableMB + ' MB', A.publicableMB <= P.publicableMB, A.publicableMB + ' MB · ' + JSON.stringify(A.porCategoriaKB), A.publicableMB <= P.publicableMaxMB ? 'aviso' : 'falla');
          check('assets', 'Ningún archivo publicable > ' + P.archivoMaxMB + ' MB', !A.archivosSobreLimite.length, A.archivosSobreLimite.join(', ') || 'ninguno');
          check('assets', 'Lo publicable se usa (sin pedir en la sesión ≤ 25 %)', A.sinPedirEnSesion.MB <= A.publicableMB * 0.25, A.sinPedirEnSesion.archivos + ' archivos, ' + A.sinPedirEnSesion.MB + ' MB sin pedir', 'aviso');
        } catch (e) { check('assets', 'Tamaño publicable', false, 'lanzó: ' + str(e)); }
      } finally {
        // La partida del jugador vuelve exactamente como estaba
        if (G && keep) {
          const put = (k, v) => { try { if (v != null) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } };
          put(KEY, keep.a); put(KEY + '.prev', keep.b);
          try { if (keep.a) G.guardado.load(true); else G.guardado.reset(true); } catch (e) { /* la prueba ya avisó */ }
        }
      }
      // Consola: arranque (iframe) + esta corrida
      const bootLogs = (report.carga && report.carga.frio && report.carga.frio.consola) || [];
      const err = dedupe([...logs.error, ...logs.pagina, ...logs.rechazos, ...logs.recursos,
        ...bootLogs.filter(l => l.nivel !== 'warn').map(l => ({ msg: '[arranque] ' + l.msg }))]);
      const warns = [...logs.warn, ...bootLogs.filter(l => l.nivel === 'warn').map(l => ({ msg: '[arranque] ' + l.msg }))];
      const three = dedupe(warns.filter(w => isThree(w.msg))), other = dedupe(warns.filter(w => !isThree(w.msg)));
      report.consola = { errores: err, threeWarnings: three, otrosWarnings: other, desdeMs: Math.round(T_LOAD) };
      check('consola', 'Sin errores en consola (arranque y juego)', err.length === 0, err.slice(0, 4).map(e => e.veces + '× ' + e.msg.split('\n')[0].slice(0, 160)).join(' | ') || 'ninguno');
      check('consola', 'Sin warnings de Three', three.length === 0, three.slice(0, 4).map(e => e.veces + '× ' + e.msg.slice(0, 160)).join(' | ') || 'ninguno');
      check('consola', 'Sin otros warnings', other.length === 0, other.slice(0, 4).map(e => e.veces + '× ' + e.msg.split('\n')[0].slice(0, 160)).join(' | ') || 'ninguno', 'aviso');
      report.checks = checks.slice();
      report.resumen = verdict();
      report.duracionS = Math.round((performance.now() - tRun) / 1000);
      const md = markdown(report);
      if (opts.save) {
        const json = JSON.stringify(report, null, 1);
        report.guardado = { json: await saveFile('qa_report.json', json, 'application/json'), md: await saveFile('qa_report.md', md, 'text/markdown') };
        if (opts.history) await saveFile('qa_report_' + report.fecha.replace(/[-:]/g, '').replace('T', '-').slice(0, 13) + '.json', json, 'application/json');
      }
      api.last = report; api.markdown = md;
      const p = document.getElementById('avqa-panel');
      if (p) {
        p.querySelector('.avqa-msg').textContent = report.resumen.estado + ' · ' + report.resumen.fallas + ' fallas, ' + report.resumen.avisos + ' avisos';
        p.querySelector('.avqa-out').textContent = checks.filter(c => c.estado !== 'ok').map(c => (c.estado === 'falla' ? '✗ ' : '! ') + c.nombre + ': ' + c.detalle.slice(0, 140)).join('\n') +
          (report.guardado ? '\n→ tests/out/qa_report.json ' + (report.guardado.json ? 'guardado' : 'NO guardado (¿servidor sin /__save?)') : '');
      }
      console.info('[QA] ' + report.resumen.estado + ' (' + report.duracionS + ' s)');
      try { console.table(checks.map(c => ({ estado: c.estado, area: c.area, nombre: c.nombre, detalle: c.detalle.slice(0, 120) }))); } catch (e) { /* sin table */ }
      return report;
    })();
    try { return await running; } finally { running = null; }
  }

  const api = window.AVQA = { version: VERSION, run, logs, hitos, last: null, markdown: '', done: null };
  const autorun = TOP && params.get('qa') !== '0' && !(window.AVQA_OPTS && window.AVQA_OPTS.autorun === false);
  if (autorun) {
    api.done = new Promise(res => {
      const go = () => setTimeout(() => run(window.AVQA_OPTS).then(res, e => { console.error('[QA] la batería falló', e); res(null); }), EARLY ? 1500 : 0);
      if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
    });
  }
})();
