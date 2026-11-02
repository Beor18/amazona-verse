/* QA · CG-3 · capítulo 4 «Un puente para todos» de punta a punta SIN teleport (AV.ep4e2eTest) · no toca el juego, solo lo juega
   Usa el motor común tests/qa/ep_caminar.js (AV.epCaminar): portada → creador → sigue la guía a pie (o volando si a pie no llega),
   Acción con la tecla E y los botones reales de las tarjetas, en español y en inglés, en el mapa real (el río de Villa Raíz).
   Las tarjetas (Balanza, maqueta, asamblea, cuidado) se contestan con la elección por defecto del motor: una opción que no
   sirve da pista y la tarjeta vuelve, y entonces prueba la siguiente (como un niño).
   Opciones: { idioma: 'es'|'en', timeout }. Carga: inyectar ep_caminar.js y este archivo, y await AV.ep4e2eTest(). */
(function () {
  'use strict';
  const cfg = { pack: 'ep4', n: 4, limpiar: /^ep4|aula\.cap4|temporada/ };
  window.AV = window.AV || {};
  window.AV.ep4e2eTest = o => window.AV.epCaminar(cfg, o);
})();
