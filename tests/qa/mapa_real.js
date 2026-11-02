/* QA · interruptor del mundo único encendido para las pruebas (caps. 5 y 6) · no toca el juego
   Se inyecta antes de las baterías para correrlas con el interruptor encendido sin cambiar MAPA_REAL en los packs:
   - añade ?mapa=real a la URL de esta pestaña (los iframes de AV.ep5Test y AV.ep6Test la heredan, motor.js templateTest);
   - los iframes que abre AV.temporadaE2eTest (?pack=epN) también lo llevan;
   - da más tiempo de arranque a ep5Test y ep6Test (el iframe carga el mapa real).
   Sin este archivo, las baterías corren con el interruptor tal como viene en el pack (apagado). */
(function () {
  'use strict';
  const conReal = u => { try { const x = new URL(u, location.href); if (/^ep[56]$/.test(x.searchParams.get('pack') || '') && x.searchParams.get('mapa') !== 'real') { x.searchParams.set('mapa', 'real'); return x.href; } } catch (e) { /* */ } return u; };
  const q = new URLSearchParams(location.search);
  if (q.get('mapa') !== 'real') { q.set('mapa', 'real'); history.replaceState(history.state, '', location.pathname + '?' + q.toString() + location.hash); }
  const d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (d && d.set && !HTMLIFrameElement.prototype.__mapaReal) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, conReal(v)); } });
    HTMLIFrameElement.prototype.__mapaReal = true;
  }
  const AV = window.AV || {}, T = AV.G && AV.G.pruebas;
  if (T && T.templateTest) {
    AV.ep5Test = o => T.templateTest(Object.assign({ pack: 'ep5', timeout: 240000 }, o));
    AV.ep6Test = o => T.templateTest(Object.assign({ pack: 'ep6', timeout: 240000 }, o));
  }
  AV.mapaRealForzado = true;
})();
