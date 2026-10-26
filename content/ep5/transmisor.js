/* Episodio 5 · transmisor (EP5_GDD §4, EP5_MISIONES M1).
   Rueda de 5 posiciones, dos ondas y el patrón de destellos. Lo lee pack.js en window.AV_EP5. */
(function () {
  'use strict';
  const EP = window.AV_EP5 = window.AV_EP5 || {};
  // Tres fragmentos son de la onda dorada (voz A) y dos de la violeta (voz B): «seguimos aquí» y «tres y uno».
  EP.fragmentos = [
    { id: 'p', pos: 1, voz: 'a', texto: '…el pacto…', onda: 'dorada' },
    { id: 's', pos: 2, voz: 'b', texto: '…seguimos aquí…', onda: 'violeta' },
    { id: 't', pos: 3, voz: 'a', texto: '…la torre que mira al mar…', onda: 'dorada' },
    { id: 'n', pos: 4, voz: 'b', texto: '…tres y uno…', onda: 'violeta' },
    { id: 'o', pos: 5, voz: 'a', texto: '…no lo hagas sola…', onda: 'dorada' },
  ];
  EP.ordenMensaje = ['s', 't', 'o'];
  EP.tarjeta = { s: 'Seguimos aquí', t: 'La torre que mira al mar', o: 'No lo hagas sola' };
  EP.mensaje = 'Seguimos aquí. Busquen la torre que mira al mar. No lo hagas sola.';
  EP.patron = ['c', 'c', 'c', 'l']; // tres cortos y un largo
  EP.pulsoMs = 400; // como mucho 2,5 destellos por segundo; con menos movimiento, el mismo ritmo suave
})();
