/* Registro de temporada (D11 y D32, DECISION_LOG lotes AP10): lo que el jugador eligió en cada capítulo, para que se vea en los siguientes.
   - La misma clave que la pantalla «Capítulos» (menu_modos.js): localStorage `amazonaverse.temporada` = { v: 1, terminados: { n: ms },
     decisiones: { n: {…} } }, común a los 6 packs (cada capítulo guarda su partida aparte, en `<almacen>.save`, que aquí no se toca).
   - Cada capítulo apunta al decidir (window.AVTemporada.apuntar(n, datos)): ep. 2 { sitio: 'a'|'b'|'c' }, ep. 3 { canoa: nombre }, ep. 4
     { opcion: 'a'|'b'|'c', cuidado }, y los guardianes que encontró ({ guardianes: ['navegante', …] }, se suman sin repetir).
   - Sin datos personales: solo ids cortos y el nombre de la canoa (ya filtrado por el creador, máx. 24 letras). «Nuevo estudiante» lo borra.
   - Sin dato (capítulo suelto, almacén bloqueado o corrupto): decision(n) da null y cada capítulo dice su línea de siempre.
   Prueba: AV.registroTemporadaTest(). */
(function () {
  'use strict';
  const KEY = 'amazonaverse.temporada';
  const vacio = () => ({ v: 1, terminados: {}, decisiones: {} });
  const corto = v => (typeof v === 'string' ? v.slice(0, 24) : typeof v === 'number' || typeof v === 'boolean' ? v : null);

  function leer() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1) return Object.assign(vacio(), d, { terminados: d.terminados || {}, decisiones: d.decisiones || {} });
    } catch (e) { /* corrupto o sin almacén: como vacío */ }
    return vacio();
  }
  function escribir(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }

  // Apunta lo elegido en el capítulo n (se mezcla con lo que ya había; guardianes se suman sin repetir)
  function apuntar(n, datos) {
    if (!(n >= 1 && n <= 6) || !datos) return false;
    const d = leer(), dec = Object.assign({}, d.decisiones[n]);
    for (const [k, v] of Object.entries(datos)) {
      if (k === 'guardianes') { const a = (dec.guardianes || []).slice(); for (const g of [].concat(v)) { const c = corto(g); if (c && !a.includes(c)) a.push(c); } dec.guardianes = a; continue; }
      const c = corto(v); if (c != null) dec[k] = c;
    }
    d.decisiones[n] = dec;
    return escribir(d);
  }
  const decision = n => leer().decisiones[n] || null;
  const dato = (n, k) => { const d = decision(n); return d && d[k] != null && d[k] !== '' ? d[k] : null; };
  const encontrar = (n, id) => apuntar(n, { guardianes: [id] });
  // Los guardianes encontrados en toda la temporada, en orden de capítulo y sin repetir
  function guardianes() {
    const d = leer().decisiones, out = [];
    for (let n = 1; n <= 6; n++) for (const g of (d[n] && d[n].guardianes) || []) if (!out.includes(g)) out.push(g);
    return out;
  }

  function test() {
    const out = [], check = (name, ok, detail) => out.push({ name, ok: !!ok, detail: ok ? undefined : detail });
    let antes = null; try { antes = localStorage.getItem(KEY); } catch (e) { /* */ }
    try {
      localStorage.removeItem(KEY);
      check('Vacío: sin decisiones y sin guardianes (cada capítulo usa su línea de siempre)', decision(2) === null && dato(3, 'canoa') === null && guardianes().length === 0);
      localStorage.setItem(KEY, '{roto');
      check('Corrupto: se lee como vacío, sin error', decision(4) === null && leer().v === 1);
      localStorage.removeItem(KEY);
      apuntar(2, { sitio: 'b' }); apuntar(3, { canoa: 'Ceiba' }); apuntar(4, { opcion: 'c' }); apuntar(4, { cuidado: 'nidos' });
      check('Apunta y mezcla por capítulo', dato(2, 'sitio') === 'b' && dato(3, 'canoa') === 'Ceiba' && dato(4, 'opcion') === 'c' && dato(4, 'cuidado') === 'nidos');
      encontrar(3, 'navegante'); encontrar(4, 'navegante'); encontrar(4, 'bosquecillo');
      check('Guardianes encontrados: en orden y sin repetir', guardianes().join() === 'navegante,bosquecillo', guardianes().join());
      apuntar(3, { canoa: 'x'.repeat(80), nombre_real: { a: 1 } });
      const crudo = JSON.parse(localStorage.getItem(KEY));
      check('Solo datos cortos (máx. 24 letras, sin objetos)', crudo.v === 1 && crudo.decisiones[3].canoa.length === 24 && !('nombre_real' in crudo.decisiones[3]));
      check('Capítulo fuera de 1–6: no apunta', apuntar(9, { sitio: 'a' }) === false && !crudo.decisiones[9]);
    } catch (e) { check('Sin errores', false, String(e)); }
    try { if (antes == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, antes); } catch (e) { /* */ }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  window.AVTemporada = { KEY, leer, apuntar, decision, dato, encontrar, guardianes, test };
})();
