/* QA · CG-3 · capítulo 5 «La voz entre la niebla» de punta a punta SIN teleport (AV.ep5e2eTest) · no toca el juego, solo lo juega
   Usa el motor común tests/qa/ep_caminar.js (AV.epCaminar): portada → creador → sigue la guía a pie (o volando si a pie no llega),
   Acción con la tecla E y los botones reales de las tarjetas, en español y en inglés. Por defecto en su mundo pequeño
   (MAPA_REAL apagado en content/ep5/pack.js); AV.ep5e2eRealTest juega lo mismo con ?mapa=real (solo en español, para no
   doblar el tiempo).
   Lo propio del capítulo, como lo haría un niño que lee las tarjetas: copia «tres cortos y uno largo» (falla una vez a propósito),
   ordena el mensaje (una vez en un orden sin sentido y luego en el que se entiende: AV_EP5.ordenMensaje) y, en «Pon tres
   estaciones», va a las alturas que aún no tienen estación (loma, torre, mirador) porque la guía solo señala la loma.
   Opciones: { idioma: 'es'|'en', mapa: 'real', timeout }. Carga: inyectar ep_caminar.js y este archivo, y await AV.ep5e2eTest(). */
(function () {
  'use strict';
  const CADENA = ['loma', 'torre', 'mirador'];
  const cfg = mapa => {
    let patron = 0, orden = 0;
    return {
      pack: 'ep5', n: 5, query: mapa === 'real' ? '&mapa=real' : '', limpiar: /^ep5|aula\.ep5|temporada/,
      politica(ops, line, ctx) {
        const txt = (line && line.text) || '', idx = re => ops.findIndex(o => re.test(o.label || ''));
        if (/tres cortos y uno largo/.test(txt)) { // la tarjeta lo dice: tres cortos y después uno largo
          if (patron === 0 && ctx.fallaUnaVez('patron')) return idx(/^Largo/);
          const i = patron++ % 4; return idx(i < 3 ? /^Corto/ : /^Largo/);
        }
        if (/orden que se entienda|Qué tarjeta sigue/.test(txt)) {
          const D = ctx.W.AV_EP5 || {}, ids = D.ordenMensaje || [];
          if (/orden que se entienda/.test(txt)) orden = 0;
          if (ctx.fallaUnaVez('orden')) { orden++; return ops.length - 1; } // un orden sin sentido primero
          if (orden >= ids.length + 1) orden = 0;
          const quiero = ids.find(id => ops.some(o => o.id === id));
          orden++;
          return Math.max(0, ops.findIndex(o => o.id === quiero));
        }
        return null;
      },
      objetivo(G, guia, ctx) {
        const S = G.S, D = ctx.W.AV_EP5 || {}, est = D.estaciones || [];
        if (G.misiones.steps[S.step] && G.misiones.steps[S.step].id === 'estaciones') {
          const falta = CADENA.find(id => !S.collected.includes('est_' + id));
          if (falta && guia && S.collected.includes('est_loma')) {
            const it = G.interaccion.find(falta);
            return it && { x: it.x, z: it.z, id: falta, porque: 'tras poner la estación de la loma, la guía sigue en la loma (Acción la quitaría)', bug: 'QA-86' };
          }
        }
        return null;
      },
    };
  };
  window.AV = window.AV || {};
  window.AV.ep5e2eTest = o => window.AV.epCaminar(cfg((o || {}).mapa), o);
  window.AV.ep5e2eRealTest = o => window.AV.epCaminar(cfg('real'), Object.assign({ idioma: 'es' }, o));
})();
