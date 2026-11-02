/* QA · CG-3 · capítulo 6 «El pacto de los 36» de punta a punta SIN teleport (AV.ep6e2eTest) · no toca el juego, solo lo juega
   Usa el motor común tests/qa/ep_caminar.js (AV.epCaminar): portada → creador → sigue la guía a pie (o volando si a pie no llega),
   Acción con la tecla E y los botones reales de las tarjetas, en español y en inglés. Por defecto en su mundo pequeño
   (MAPA_REAL apagado en content/ep6/pack.js); AV.ep6e2eRealTest juega lo mismo con ?mapa=real (solo en español).
   Lo propio del capítulo, como lo haría un niño que lee las tarjetas de los visitantes:
   - la mesa: presenta una pareja que no se cubre (solo saludan) y luego las que sí (G.ep6.PAREJAS, lo que dicen sus tarjetas);
   - el tablero del plan (tarjeta propia, botones data-ayud y data-tarea): prueba primero el plan «yo sola» (se atasca), y luego
     reparte las tareas tocando ayudante y tarea (Roca carga, Nudo ata, Mira revisa y avisa) y mira la prueba paso a paso;
   - la percha vacía: hay que posarse encima volando (V, Espacio, W, X), no basta con llegar debajo.
   Opciones: { idioma: 'es'|'en', mapa: 'real', timeout }. Carga: inyectar ep_caminar.js y este archivo, y await AV.ep6e2eTest(). */
(function () {
  'use strict';
  const PLAN = { cargar: 'roca', sostener: 'vittata', atar: 'nudo', revisar: 'mira', avisar: 'mira' };
  const cfg = mapa => {
    let primero = null, pruebas = 0;
    return {
      pack: 'ep6', n: 6, query: mapa === 'real' ? '&mapa=real' : '', limpiar: /^ep6|aula\.ep6|temporada/,
      volar: (G, it) => !!(it && it.id === 'percha_v'),
      politica(ops, line, ctx) {
        const txt = (line && line.text) || '', E = ctx.G.ep6 || {}, P = E.PAREJAS || [], S = ctx.S;
        const libre = p => !S.collected.includes('pareja_' + p.join('+'));
        if (/A quién presento primero/.test(txt)) {
          const p = P.find(q => libre(q) && ops.some(o => o.v === q[0]));
          primero = p ? p[0] : ops[0].v;
          return Math.max(0, ops.findIndex(o => o.v === primero));
        }
        if (/^¿Con quién\?/.test(txt)) {
          const p = P.find(q => q[0] === primero || q[1] === primero), otro = p && (p[0] === primero ? p[1] : p[0]);
          if (ctx.fallaUnaVez('pareja')) { const i = ops.findIndex(o => o.v !== otro); if (i >= 0) return i; }
          return Math.max(0, ops.findIndex(o => o.v === otro));
        }
        return null;
      },
      async tarjeta(card, ctx) {
        const G = ctx.G, $ = ctx.$;
        if (card.querySelector('[data-tarea]')) { // el tablero del plan
          const asig = (G.ep6.PL() || {}).asig || {};
          if (pruebas === 0 || Object.keys(PLAN).every(k => asig[k] === PLAN[k])) { pruebas++; await ctx.clic($('ch-0')); return true; } // Probar el plan
          const k = Object.keys(PLAN).find(t => asig[t] !== PLAN[t]);
          const a = card.querySelector('[data-ayud="' + PLAN[k] + '"]'); if (!a) return false;
          await ctx.clic(a);
          const b = $('card').querySelector('[data-tarea="' + k + '"]'); if (!b) return false;
          await ctx.clic(b); return true;
        }
        if (card.querySelector('.ep6-sim')) { // la prueba del plan, paso a paso; al final, volver al tablero o cerrar
          await ctx.clic($('ch-0') || $('ch-2')); return true;
        }
        return false;
      },
    };
  };
  window.AV = window.AV || {};
  window.AV.ep6e2eTest = o => window.AV.epCaminar(cfg((o || {}).mapa), o);
  window.AV.ep6e2eRealTest = o => window.AV.epCaminar(cfg('real'), Object.assign({ idioma: 'es' }, o));
})();
