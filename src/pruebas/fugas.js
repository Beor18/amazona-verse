/* AVE · AV.fugasTest (W20): abrir y cerrar varias veces los modos que viven en la misma página no debe dejar basura.
   Se carga al pedir la prueba (boot.js), no en la descarga inicial.
   Por cada ciclo: Retos (abrir → jugar «carrera» → salir), Modo familia (abrir → cerrar), Modo Maestro del Aula
   (abrir → cerrar) y el cómic (abrir → cerrar). Cambiar de CAPÍTULO recarga la página (?pack=…), así que ahí no
   puede quedar nada retenido: no se prueba aquí.
   Mide, entre el ciclo 1 (calentamiento: crea lo que se crea una sola vez) y el último:
   - listeners netos (addEventListener − removeEventListener, contando solo los nuevos durante la prueba),
   - intervalos vivos (setInterval sin clearInterval),
   - nodos del DOM y requestAnimationFrame pendientes,
   - heap JS (solo informativo: sin GPU y sin GC forzado es ruidoso; las texturas no cuentan).
   Falla si algo de la lógica de juego crece con cada ciclo. Deja la partida, el guardado y la interfaz como estaban.
   Devuelve { passed, total, results, medidas }. Opciones: { ciclos: 4 }. */
window.AVFugasTest = function (G) {
  'use strict';
  const $ = G.util.$;
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const cuadros = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });

  // ---------- Contadores (solo durante la prueba) ----------
  function instrumentar() {
    const ET = EventTarget.prototype, add0 = ET.addEventListener, rem0 = ET.removeEventListener;
    const si0 = window.setInterval, ci0 = window.clearInterval, raf0 = window.requestAnimationFrame, caf0 = window.cancelAnimationFrame;
    const vivos = new Map(); // target → Set de 'tipo|captura' con su fn
    const C = { listeners: 0, intervalos: new Set(), raf: new Set(), porTipo: {}, vivos };
    const clave = (t, fn, o) => t + '|' + (o === true || (o && o.capture) ? 1 : 0);
    ET.addEventListener = function (t, fn, o) {
      if (fn) {
        let m = vivos.get(this); if (!m) { m = new Map(); vivos.set(this, m); }
        const k = clave(t, fn, o); let s = m.get(k); if (!s) { s = new Set(); m.set(k, s); }
        if (!s.has(fn)) { s.add(fn); C.listeners++; C.porTipo[t] = (C.porTipo[t] || 0) + 1; }
      }
      return add0.call(this, t, fn, o);
    };
    ET.removeEventListener = function (t, fn, o) {
      const m = vivos.get(this), s = m && m.get(clave(t, fn, o));
      if (s && s.delete(fn)) { C.listeners--; C.porTipo[t]--; }
      return rem0.call(this, t, fn, o);
    };
    window.setInterval = function (...a) { const id = si0.apply(window, a); C.intervalos.add(id); return id; };
    window.clearInterval = function (id) { C.intervalos.delete(id); return ci0.call(window, id); };
    window.requestAnimationFrame = function (f) { const id = raf0.call(window, t => { C.raf.delete(id); f(t); }); C.raf.add(id); return id; };
    window.cancelAnimationFrame = function (id) { C.raf.delete(id); return caf0.call(window, id); };
    C.quitar = () => { ET.addEventListener = add0; ET.removeEventListener = rem0; window.setInterval = si0; window.clearInterval = ci0; window.requestAnimationFrame = raf0; window.cancelAnimationFrame = caf0; };
    return C;
  }
  // Solo cuentan los listeners de objetos que siguen vivos en la página: un botón que se rehace con innerHTML se lleva
  // los suyos al recolector (no es fuga). Cuentan window, document, nodos conectados y cualquier otro EventTarget.
  const vivo = t => !(t instanceof Node) || t === document || t.isConnected;
  function contar(C) {
    let n = 0; const porTipo = {};
    for (const [t, m] of C.vivos) if (vivo(t)) for (const [k, s] of m) if (s.size) { n += s.size; const tipo = k.split('|')[0]; porTipo[tipo] = (porTipo[tipo] || 0) + s.size; }
    return { n, porTipo };
  }
  const medir = C => { const L = contar(C); return {
    listeners: L.n, intervalos: C.intervalos.size, raf: C.raf.size,
    nodos: document.getElementsByTagName('*').length,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null,
    porTipo: L.porTipo
  }; };

  // ---------- Modos ----------
  async function cargarRetos() { if (!window.AVRetos) await AVE.assets.script('src/game/retos.js'); return window.AVRetos(G); }
  async function cargarFamilia() { if (!window.AVFamilia) await AVE.assets.script('src/game/familia.js'); return window.AVFamilia(G); }
  async function ciclo(R, F, notas) {
    // Retos: menú, una carrera corta y salir
    try {
      if (R.abrir() !== false) { await cuadros(3); if (R.jugar) { R.jugar('carrera'); await cuadros(20); } R.salir(); await cuadros(3); }
      else notas.push('retos no abrió (mundo no libre)');
    } catch (e) { notas.push('retos: ' + (e && e.message)); try { R.salir(); } catch (e2) { /* */ } }
    // Modo familia
    try { if (F) { F.abrir(); await cuadros(3); F.cerrar(); await cuadros(2); } } catch (e) { notas.push('familia: ' + (e && e.message)); }
    // Modo Maestro del Aula
    try { if (G.aula && G.aula.abrirMaestro) { G.aula.abrirMaestro(); await cuadros(3); G.aula.cerrarMaestro(); await cuadros(2); } } catch (e) { notas.push('aula: ' + (e && e.message)); }
    // Cómic: abrir, dibujar y cerrar (sin el panel final)
    try {
      if (G.comic && G.comic.openComic) {
        await G.comic.openComic(); await cuadros(2);
        $('comic').hidden = true; if (G.comicPlantilla && G.comicPlantilla.limpiarCache) G.comicPlantilla.limpiarCache(); await cuadros(2);
      }
    } catch (e) { notas.push('cómic: ' + (e && e.message)); try { $('comic').hidden = true; } catch (e2) { /* */ } }
  }

  async function test(opts) {
    opts = opts || {};
    const N = Math.max(3, opts.ciclos || 4);
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const snap = G.guardado.instantanea ? G.guardado.instantanea() : null;
    const quiet0 = G.quiet, toast0 = G.ui.toast;
    const claves = Object.keys(localStorage).filter(k => /amazonaverse|^ave/.test(k));
    const copias = claves.map(k => localStorage.getItem(k));
    if (G.guardado.suspender) G.guardado.suspender(true);
    G.quiet = true; G.ui.toast = () => {};
    let C = null; const medidas = [], notas = [];
    try {
      const R = await cargarRetos();
      let F = null; try { F = await cargarFamilia(); } catch (e) { notas.push('familia no cargó'); }
      C = instrumentar();
      for (let i = 0; i < N; i++) { await ciclo(R, F, notas); await espera(150); medidas.push(medir(C)); }
      const a = medidas[0], b = medidas[medidas.length - 1], n = N - 1;
      const crece = k => b[k] - a[k];
      const tipos = Object.keys(b.porTipo).filter(t => (b.porTipo[t] || 0) - (a.porTipo[t] || 0) > 0).map(t => t + ' +' + ((b.porTipo[t] || 0) - (a.porTipo[t] || 0)));
      ok('Sin errores al abrir y cerrar Retos, Modo familia, Modo Maestro y cómic', notas.length === 0, notas.slice(0, 4).join(' | '));
      ok('Listeners: no crecen al repetir (≤ 1 en ' + n + ' ciclos; solo en lo que sigue en la página)', crece('listeners') <= 1, crece('listeners') + (tipos.length ? ' · ' + tipos.join(', ') : ''));
      ok('Intervalos: ninguno queda vivo de más', crece('intervalos') <= 0, a.intervalos + ' → ' + b.intervalos);
      ok('Nodos del DOM: no crecen al repetir (≤ 20)', crece('nodos') <= 20, a.nodos + ' → ' + b.nodos);
      ok('requestAnimationFrame: sin bucles que se acumulan (≤ 2 pendientes de más)', crece('raf') <= 2, a.raf + ' → ' + b.raf);
      ok('Heap JS (informativo, no falla)', true, a.heapMB == null ? 'sin performance.memory' : a.heapMB + ' → ' + b.heapMB + ' MB en ' + n + ' ciclos');
    } catch (e) {
      ok('La prueba de fugas corre sin excepciones', false, e && e.message);
    } finally {
      if (C) C.quitar();
      G.ui.toast = toast0; G.quiet = quiet0;
      if (snap && G.guardado.restaurar) G.guardado.restaurar(snap);
      claves.forEach((k, i) => { try { if (copias[i] == null) localStorage.removeItem(k); else localStorage.setItem(k, copias[i]); } catch (e) { /* */ } });
      if (G.guardado.suspender) G.guardado.suspender(false);
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results, medidas: medidas.map(m => { const o = Object.assign({}, m); delete o.porTipo; return o; }) };
  }
  return { test };
};
