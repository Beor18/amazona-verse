/* QA · CG-3 · capítulo 3 «Más allá de la bahía» de punta a punta SIN teleport (AV.ep3e2eTest) · no toca el juego, solo lo juega
   Usa el motor común tests/qa/ep_caminar.js (AV.epCaminar): portada → creador → sigue la guía a pie (o volando si a pie no llega),
   Acción con la tecla E y los botones reales de las tarjetas, en español y en inglés, en el mapa real (Villa Raíz y la laguna).
   Lo propio del capítulo: mientras la canoa va sobre sus raíles (G.ep3.enViaje()) el juego lleva el control y la prueba solo
   espera y contesta las tarjetas de señales; la respuesta a cada señal sale del código acordado (lo que el niño vio en la
   tarjeta de señales, apuntado en S.collected) tras equivocarse una vez a propósito.
   Opciones: { idioma: 'es'|'en', timeout }. Carga: inyectar ep_caminar.js y este archivo, y await AV.ep3e2eTest(). */
(function () {
  'use strict';
  const ORDEN = { izquierda: /izquierda/i, derecha: /derecha/i, para: /parar/i };
  const SENAL = { bandera: /bandera/i, silbido: /silb/i, gesto: /gesto/i, remo: /remo/i };
  const cfg = {
    pack: 'ep3', n: 3, limpiar: /^ep3|aula\.ep3|temporada/,
    esperar: G => !!(G.ep3 && G.ep3.enViaje && G.ep3.enViaje()),
    politica(ops, line, ctx) {
      const txt = (line && line.text) || '', S = ctx.S;
      if (ops.length && ops.every(o => o.v && ORDEN[o.v])) { // una señal en el agua: lo que acordamos
        const s = Object.keys(SENAL).find(k => SENAL[k].test(txt.split('.')[0] + ' ' + txt));
        const o = s && Object.keys(ORDEN).find(k => S.collected.includes('sen_' + k + '_' + s));
        if (o && !ctx.fallaUnaVez('senal')) return ops.findIndex(x => x.v === o);
        return null;
      }
      return null;
    },
  };
  window.AV = window.AV || {};
  window.AV.ep3e2eTest = o => window.AV.epCaminar(cfg, o);
})();
