/* AVE · AV.memoriaLargaTest (hito 1: memoria estable en sesión larga en móvil).
   Se carga al pedir la prueba (boot.js), no en la descarga inicial.
   Simula una sesión de juego con el reloj acelerado (P.tick avanza el juego a 0,05 s por paso, sin esperar el tiempo real),
   como en un móvil: ventana de 390×844 (innerWidth/innerHeight y el lienzo) y calidad baja. Cada ciclo:
     1. recorre el capítulo andando entre puntos del mapa (interacciones repartidas; cada ciclo empieza en otro sitio) con el
        streaming de zonas cargando y soltando,
     2. vuela un rato (despegar, avanzar, aterrizar),
     3. un duelo V18 contra la Campeona (tarjeta Duelo del menú) hasta el final o el tope de tiempo, y vuelta al menú,
     4. abre y cierra el menú «¿Cómo quieres jugar?» y sus modos: minigolf, Retos (menú y tormenta), Mis cotorras y Álbum,
     5. vuelve al punto de partida y deja que el streaming suelte lo de lejos antes de medir.
   Medidas tras cada ciclo (con GC forzado si Chrome tiene --js-flags=--expose-gc): heap JS (performance.memory),
   renderer.info.memory (geometrías y texturas), programas de shader, objetos de la escena, oyentes netos vivos, intervalos,
   rAF pendientes y nodos del DOM. Los tres primeros ciclos calientan (lo que se ve por primera vez sube a la GPU una sola vez) (crean lo que se crea una sola vez); a partir de ahí
   nada debe crecer: la pendiente por ciclo debe ser ≈ 0.
   Versión corta (batería normal): 5 ciclos de 45 s de juego (≈ 4 min simulados). Versión larga: AV.memoriaLargaTest({ largo: true }),
   ?memlarga=1 o localStorage «amazonaverse.memlarga» = '1': 10 ciclos de 180 s (30 min simulados). Opciones: { ciclos, seg }.
   Deja la partida, el guardado, la calidad, el tamaño y la posición como estaban. Devuelve { passed, total, results, medidas }. */
window.AVMemoriaLargaTest = function (G) {
  'use strict';
  const $ = G.util.$, S = G.S, R = G.renderer;
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  async function hasta(f, ms) { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { if (f()) return true; } catch (e) { /* aún no */ } await espera(60); } try { return !!f(); } catch (e) { return false; } }
  const conTope = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), espera(ms)]);
  const r1 = v => (v == null || !isFinite(v) ? null : Math.round(v * 10) / 10);

  function largoPedido(opts) {
    if (opts && opts.largo != null) return !!opts.largo;
    if (/[?&]memlarga=1(?:&|$)/.test(location.search)) return true;
    try { return localStorage.getItem('amazonaverse.memlarga') === '1'; } catch (e) { return false; }
  }

  // ---------- Ventana de móvil (390×844) ----------
  function ventanaMovil(w, h) {
    const props = ['innerWidth', 'innerHeight', 'outerWidth', 'outerHeight'], vals = [w, h, w, h], antes = [];
    props.forEach((p, i) => { antes.push(Object.getOwnPropertyDescriptor(window, p)); try { Object.defineProperty(window, p, { configurable: true, get: () => vals[i] }); } catch (e) { /* no se deja */ } });
    window.dispatchEvent(new Event('resize'));
    return () => {
      props.forEach((p, i) => { try { if (antes[i]) Object.defineProperty(window, p, antes[i]); else delete window[p]; } catch (e) { /* */ } });
      window.dispatchEvent(new Event('resize'));
    };
  }

  // ---------- Medidas ----------
  let C = null, H = null, Gpu = null;
  function medir(tSim) {
    if (typeof window.gc === 'function') { try { window.gc(); window.gc(); } catch (e) { /* */ } }
    const M = R.renderer.info.memory, info = R.renderer.info;
    let objs = 0, mallas = 0;
    R.scene.traverse(o => { objs++; if (o.isMesh || o.isSprite || o.isPoints || o.isLine) mallas++; });
    // Los edificios por zonas (edificios*) entran y salen con el streaming según la vista: su memoria la vigila streamingTest
    const grupos = {}; let objsMundo = 0;
    for (const h of R.scene.children) { const k = h.name || h.type; let n = 0; h.traverse(() => { n++; }); grupos[k] = (grupos[k] || 0) + n; if (!/^edificios/.test(k)) objsMundo += n; }
    const L = C ? H.contar(C) : { n: 0, porTipo: {} };
    return {
      t: Math.round(tSim), geo: M.geometries, tex: M.textures, prog: (info.programs || []).length, objs, objsMundo, mallas,
      oyentes: L.n, intervalos: C ? C.intervalos.size : 0, raf: C ? C.raf.size : 0,
      nodos: document.getElementsByTagName('*').length,
      heapMB: performance.memory ? r1(performance.memory.usedJSHeapSize / 1048576) : null,
      porTipo: L.porTipo, grupos
    };
  }
  // Diagnóstico: geometrías y texturas que el renderer sube a la GPU (three engancha su 'dispose' al subirlas y lo suelta al
  // liberarlas). Las que se subieron tras calentar y siguen vivas al final se agrupan por dueño (nombre en la escena) para
  // señalar al módulo responsable cuando algo crece.
  function rastrearGPU() {
    const ED = THREE.EventDispatcher.prototype, add0 = ED.addEventListener, rem0 = ED.removeEventListener;
    const vivos = new Map(), visto = new WeakMap(); let ciclo = 0;
    ED.addEventListener = function (t, fn) { if (t === 'dispose' && (this.isBufferGeometry || this.isTexture) && !vivos.has(this)) vivos.set(this, ciclo); return add0.apply(this, arguments); };
    ED.removeEventListener = function (t) { if (t === 'dispose') vivos.delete(this); return rem0.apply(this, arguments); };
    function nombre(o) { const p = []; for (let x = o; x && x !== R.scene && p.length < 3; x = x.parent) if (x.name) p.unshift(x.name); return p.join('/') || o.type; }
    return {
      set ciclo(v) { ciclo = v; },
      mirar() { // apunta el último dueño visto de cada geometría o textura (las que luego salen de la escena lo conservan)
        R.scene.traverse(o => { const g = o.geometry, ms = o.material ? [].concat(o.material) : [];
          if (g && vivos.has(g)) visto.set(g, nombre(o));
          for (const m of ms) for (const k of ['map', 'alphaMap', 'emissiveMap', 'normalMap']) if (m && m[k] && vivos.has(m[k])) visto.set(m[k], nombre(o)); });
      },
      nuevos(desde) { // lo subido desde el ciclo «desde» que sigue vivo, agrupado por dueño
        const enEscena = new Set(); R.scene.traverse(o => { if (o.geometry) enEscena.add(o.geometry); });
        const out = {};
        for (const [x, c] of vivos) if (c >= desde) {
          const k = (x.isTexture ? 'tex ' : 'geo ') + (x.isTexture || enEscena.has(x) ? '' : '(fuera) ') + (visto.get(x) || (x.name || x.type) + (x.attributes && x.attributes.position ? ' ' + x.attributes.position.count + 'v' : ''));
          out[k] = (out[k] || 0) + 1;
        }
        return Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0] + ' ×' + e[1]).join(', ');
      },
      quitar() { ED.addEventListener = add0; ED.removeEventListener = rem0; }
    };
  }
  // Pendiente por ciclo (mínimos cuadrados) de una medida, desde el ciclo «desde»
  function pendiente(ms, k, desde) {
    const p = ms.slice(desde).map((m, i) => [i, m[k]]).filter(x => x[1] != null);
    if (p.length < 2) return 0;
    const n = p.length, sx = p.reduce((a, x) => a + x[0], 0), sy = p.reduce((a, x) => a + x[1], 0);
    const sxy = p.reduce((a, x) => a + x[0] * x[1], 0), sxx = p.reduce((a, x) => a + x[0] * x[0], 0);
    const d = n * sxx - sx * sx; return d ? (n * sxy - sx * sy) / d : 0;
  }

  // ---------- Pasos de juego (reloj acelerado) ----------
  let tSim = 0, pasoCuadro = 1.5;
  const ST = () => (G.streaming && G.streaming.gestor) || null;
  async function jugar(seg, cada) { // avanza «seg» segundos de juego; cada «cada» s deja pintar un cuadro de verdad
    const paso = cada || 1;
    for (let t = 0; t < seg; t += paso) {
      G.pruebas.tick(Math.min(paso, seg - t)); tSim += Math.min(paso, seg - t);
      if (Gpu) Gpu.mirar();
      G.pruebas.drain(); if (G.ui.cardOpen && !G.ui.overlayOpen()) G.ui.hideCard();
      await cuadros(1);
    }
  }
  async function asentar(x, z) { // como streamingTest: soltar lo de lejos hasta que no queden descargas ni trabajos (2 pasadas seguidas)
    const st = ST(); if (!st) return;
    let estables = 0;
    for (let i = 0; i < 40 && (i < 4 || estables < 2); i++) {
      try { st.revisar(x, z); if (st.liberarYa) st.liberarYa(); } catch (e) { /* */ }
      await cuadros(2); await espera(300);
      const s2 = st.stats ? st.stats() : { descargando: 0, trabajos: 0 };
      estables = s2.descargando === 0 && s2.trabajos === 0 ? estables + 1 : 0;
    }
  }
  async function ir(x, z, fx, fz) {
    G.pruebas.teleport(x, z, fx, fz); G.pruebas.tick(0.1);
    const st = ST(); if (st) { await conTope(st.alrededor(x, z), 6000); await conTope(st.terminar && st.terminar(), 4000); }
    if (G.solidos && G.solidos.terminar) try { G.solidos.terminar(); } catch (e) { /* */ }
  }
  function puntosDelMapa() {
    const vistos = [], lista = (G.interaccion && G.interaccion.list) || [];
    for (const it of lista) {
      const x = +it.x, z = +it.z;
      if (!isFinite(x) || !isFinite(z) || /^v18_/.test(String(it.id))) continue;
      if (vistos.some(p => Math.hypot(p.x - x, p.z - z) < 25)) continue;
      vistos.push({ x, z, id: it.id });
    }
    return vistos;
  }
  async function recorrer(puntos, k0, n, seg, notas) {
    const keys = G.input && G.input.keys;
    for (let i = 0; i < n && puntos.length; i++) {
      const p = puntos[(k0 + i) % puntos.length], a = (k0 + i) * 2.399;
      try {
        await ir(p.x + Math.cos(a) * 4, p.z + Math.sin(a) * 4, -Math.cos(a), -Math.sin(a));
        if (keys) keys.add('w');
        await jugar(seg / n, pasoCuadro);
      } catch (e) { notas.push('recorrer ' + p.id + ': ' + (e && e.message)); } finally { if (keys) keys.delete('w'); }
    }
  }
  async function volar(seg, notas) {
    const F = G.fisica, keys = G.input && G.input.keys;
    try {
      F.startFlying(); if (keys) keys.add('w');
      await jugar(seg * 0.8, pasoCuadro);
      if (keys) keys.delete('w'); F.land(); await jugar(seg * 0.2, pasoCuadro);
    } catch (e) { notas.push('vuelo: ' + (e && e.message)); } finally { if (keys) keys.delete('w'); try { F.endFlight(); } catch (e) { /* */ } }
  }
  const fase = a => { try { return (a && !a.diferido && a.estado && a.estado().fase) || 'nada'; } catch (e) { return 'nada'; } };
  const portada = () => $('title');
  const cerrarPortada = () => { const p = portada(); if (p && p.open) { p.returnValue = ''; p.close(); } };
  async function duelo(MM, seg, notas) {
    try {
      await MM.elegir('duelo');
      const ok = await hasta(() => ['cuenta', 'lucha'].includes(fase(G.v18combate)), 30000);
      if (!ok) { notas.push('el duelo no empezó (fase ' + fase(G.v18combate) + ')'); return false; }
      for (let t = 0; t < seg && fase(G.v18combate) !== 'fin'; t += 1.5) await jugar(1.5, 1.5);
      return true;
    } catch (e) { notas.push('duelo: ' + (e && e.message)); return false; } finally { try { MM.volver(); } catch (e) { /* */ } }
  }
  async function menuYModos(MM, notas) {
    const vistos = [];
    try {
      MM.volver(); await cuadros(2);
      // Minigolf
      await MM.elegir('golf');
      if (await hasta(() => !['nada', 'disuelve', 'deshace', 'despierta'].includes(fase(G.v18minigolf)), 30000)) {
        vistos.push('golf'); await jugar(3, 1.5); G.v18minigolf.salir(); await hasta(() => portada().open, 8000);
      } else notas.push('el minigolf no empezó');
      MM.volver(); await cuadros(2);
      // Retos: el menú y la tormenta
      await MM.elegir('carreras'); await hasta(() => G.retosApi && G.retosApi.fase === 'menu', 15000); vistos.push('retos');
      MM.volver(); await cuadros(2);
      await MM.elegir('tormenta');
      if (await hasta(() => G.retosApi && G.retosApi.activo, 15000)) { vistos.push('tormenta'); await jugar(3, 1.5); }
      MM.volver(); await cuadros(2);
      // Mis cotorras y Álbum (encima del menú)
      await MM.elegir('cotorras'); await cuadros(2);
      if (!$('card').hidden) { vistos.push('cotorras'); G.ui.hideCard(); } else notas.push('Mis cotorras no se abrió');
      await cuadros(2);
      if (G.album && G.album.html && G.album.html()) {
        await MM.elegir('album'); await cuadros(2);
        const ok = $('mm-album-ok'); if (!$('card').hidden) { vistos.push('album'); if (ok) ok.click(); else G.ui.hideCard(); } else notas.push('el Álbum no se abrió');
      }
      await cuadros(2);
    } catch (e) { notas.push('menú: ' + (e && e.message)); }
    try { MM.volver(); cerrarPortada(); } catch (e) { /* */ }
    return vistos;
  }

  async function test(opts) {
    opts = opts || {};
    const largo = largoPedido(opts);
    const N = Math.max(3, opts.ciclos || (largo ? 10 : 5)), SEG = Math.max(20, opts.seg || (largo ? 180 : 45));
    const CALIENTA = 3, P = G.pruebas, PASO = 1.5 * SEG / 45; pasoCuadro = PASO; // el mismo número de cuadros pintados por ciclo en la corta y en la larga
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const errores0 = (window.__aveErrores || []).length, errores = [], ce = console.error;
    console.error = (...a) => { errores.push(a.map(String).join(' ')); ce.apply(console, a); };
    const snap = G.guardado.instantanea ? G.guardado.instantanea() : null;
    const quiet0 = G.quiet, toast0 = G.ui.toast;
    const claves = Object.keys(localStorage).filter(k => /amazonaverse|^ave/.test(k));
    const copias = claves.map(k => localStorage.getItem(k));
    const pos0 = { x: S.pos.x, z: S.pos.z }, f0 = S.facing ? Object.assign({}, S.facing) : null;
    const cal0 = { nivel: R.calidad.nivel, manual: !!R.calidad.manual };
    const portada0 = !!(portada() && portada().open);
    if (G.guardado.suspender) G.guardado.suspender(true);
    G.quiet = true; G.ui.toast = () => {};
    let restaurarVentana = null; const medidas = [], notas = [], modos = {}; let duelos = 0;
    tSim = 0;
    try {
      if (!window.AVFugasTest) await AVE.assets.script('src/pruebas/fugas.js');
      H = window.AVFugasTest(G);
      const MM = G.menuModos;
      if (!MM) { ok('El menú «¿Cómo quieres jugar?» está cargado', false, 'sin G.menuModos'); return { passed: 0, total: 1, results, medidas }; }
      const v18 = !!(G.V18 && G.pack && G.pack.id === 'cap1');
      restaurarVentana = ventanaMovil(390, 844);
      if (R.setCalidad) R.setCalidad('bajo', true);
      cerrarPortada();
      const MAPA = (G.terreno && G.terreno.mapa) || {}, sp = MAPA.spawn || pos0;
      const todos = puntosDelMapa(), paso = Math.max(1, Math.floor(todos.length / 8)), puntos = todos.filter((p, i) => i % paso === 0).slice(0, 8); // 8 sitios repartidos por el capítulo
      C = H.instrumentar(); Gpu = rastrearGPU();
      for (let i = 0; i < N; i++) {
        Gpu.ciclo = i;
        await recorrer(puntos, 0, puntos.length, SEG * 0.45, notas); // la misma ruta en cada ciclo: lo que se carga una vez entra al calentar
        await volar(SEG * 0.2, notas);
        if (v18 && await duelo(MM, SEG * 0.25, notas)) duelos++;
        for (const m of await menuYModos(MM, notas)) modos[m] = (modos[m] || 0) + 1;
        await jugar(SEG * 0.1, pasoCuadro);
        await ir(sp.x, sp.z, 0, -1); await asentar(sp.x, sp.z); await espera(200);
        medidas.push(medir(tSim));
      }
      const a = medidas[CALIENTA - 1], b = medidas[medidas.length - 1], desde = CALIENTA - 1, gpuNuevos = Gpu.nuevos(CALIENTA);
      const crece = k => b[k] - a[k], pend = k => r1(pendiente(medidas, k, desde));
      const gc = typeof window.gc === 'function';
      const fila = k => medidas.map(m => m[k]).join('→');
      ok('Simula ' + Math.round(tSim / 60) + ' min de juego en 390×844 y calidad baja sin errores (' + N + ' ciclos)', notas.length === 0 && R.calidad.nivel === 'bajo', notas.slice(0, 4).join(' | '));
      if (v18) ok('Cada ciclo juega un duelo V18 y abre minigolf, Retos, Mis cotorras y el Álbum', duelos === N && ['golf', 'retos', 'cotorras'].every(m => modos[m] === N), 'duelos ' + duelos + '/' + N + ' · ' + JSON.stringify(modos));
      ok('Geometrías estables tras calentar (≤ +6, pendiente ≈ 0)', crece('geo') <= 6 && pend('geo') <= 1, fila('geo') + ' · pendiente ' + pend('geo') + '/ciclo' + (crece('geo') > 0 ? ' · subidas tras calentar y vivas: ' + gpuNuevos : ''));
      ok('Texturas estables tras calentar (≤ +2, pendiente ≈ 0)', crece('tex') <= 2 && pend('tex') <= 0.5, fila('tex') + ' · pendiente ' + pend('tex') + '/ciclo' + (crece('tex') > 0 && crece('geo') <= 0 ? ' · subidas tras calentar y vivas: ' + gpuNuevos : ''));
      ok('Programas de shader estables (≤ +2)', crece('prog') <= 2, fila('prog'));
      ok('Objetos de la escena estables (≤ +10; sin los edificios por zonas, que vigila streamingTest)', crece('objsMundo') <= 10 && pend('objsMundo') <= 3, fila('objsMundo') + ' · con edificios ' + fila('objs') + ' · mallas ' + fila('mallas') + (crece('objsMundo') > 0 ? ' · crecen: ' + Object.keys(b.grupos).map(k => [k, b.grupos[k] - (a.grupos[k] || 0)]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 6).map(x => x[0] + ' +' + x[1]).join(', ') : ''));
      const tipos = Object.keys(b.porTipo).filter(t => (b.porTipo[t] || 0) - (a.porTipo[t] || 0) > 0).map(t => t + ' +' + ((b.porTipo[t] || 0) - (a.porTipo[t] || 0)));
      ok('Oyentes de eventos: no se acumulan (≤ +1 tras calentar)', crece('oyentes') <= 1, fila('oyentes') + (tipos.length ? ' · ' + tipos.join(', ') : ''));
      ok('Intervalos y rAF: ninguno se acumula', crece('intervalos') <= 0 && crece('raf') <= 2, 'intervalos ' + fila('intervalos') + ' · raf ' + fila('raf'));
      ok('Nodos del DOM: sin huérfanos que crecen (≤ +20)', crece('nodos') <= 20, fila('nodos'));
      const dHeap = a.heapMB == null ? null : r1(b.heapMB - a.heapMB);
      ok('Heap JS estable tras calentar' + (gc ? ' (GC forzado: ≤ +6 MB y pendiente ≤ 1,5 MB/ciclo)' : ' (sin GC forzado: ≤ +40 MB)'),
        a.heapMB == null || (gc ? dHeap <= 6 && (N - desde < 5 || pend('heapMB') <= 1.5) : dHeap <= 40), a.heapMB == null ? 'sin performance.memory' : fila('heapMB') + ' MB · pendiente ' + pend('heapMB') + ' MB/ciclo' + (gc ? ' (gc)' : ' (sin gc)'));
      const nuevos = (window.__aveErrores || []).slice(errores0);
      ok('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
    } catch (e) {
      ok('La prueba de memoria corre sin excepciones', false, String((e && e.stack) || e).slice(0, 400));
    } finally {
      console.error = ce;
      if (C) { C.quitar(); C = null; }
      if (Gpu) { Gpu.quitar(); Gpu = null; }
      try { const keys = G.input && G.input.keys; if (keys) keys.delete('w'); } catch (e) { /* */ }
      try { if (G.menuModos) { G.menuModos.volver(); if (!portada0) cerrarPortada(); } } catch (e) { /* */ }
      if (restaurarVentana) restaurarVentana();
      if (R.setCalidad) { R.setCalidad(cal0.nivel, cal0.manual); R.calidad.manual = cal0.manual; }
      try { P.teleport(pos0.x, pos0.z, f0 ? f0.x : undefined, f0 ? f0.z : undefined); P.tick(0.1); } catch (e) { /* */ }
      G.ui.toast = toast0; G.quiet = quiet0;
      if (snap && G.guardado.restaurar) G.guardado.restaurar(snap);
      claves.forEach((k, i) => { try { if (copias[i] == null) localStorage.removeItem(k); else localStorage.setItem(k, copias[i]); } catch (e) { /* */ } });
      if (G.guardado.suspender) G.guardado.suspender(false);
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results, medidas: medidas.map(m => { const o = Object.assign({}, m); delete o.porTipo; delete o.grupos; return o; }) };
  }
  return { test };
};
