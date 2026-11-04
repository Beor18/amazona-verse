/* Juego · CG-50. Ajustes para niños pequeños. Se guardan en este dispositivo y se ven en la pausa.
   Vuelo fácil: ayuda a quedarse a una altura cómoda, gira un poco más y se posa solo cerca del suelo.
   También: sensibilidad de la cámara, invertir el eje vertical y botones más grandes.
   No toca musica.js ni el modelo de Vittata. La cámara lee G.ninos.camara desde input.js y fisica.js.
   window.AVNinos no hace falta: es un módulo del motor. Prueba: AV.ninosTest. */
AVE.module('ninos', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.ninos';
  const DEF = { vuelo: false, sensibilidad: 1, invertir: false, botones: false };
  function leer() {
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (d && d.v === 1) return { vuelo: !!d.vuelo, sensibilidad: Math.min(1.8, Math.max(0.6, Number(d.sensibilidad) || 1)), invertir: !!d.invertir, botones: !!d.botones };
    } catch (e) { /* sin almacén */ }
    return Object.assign({}, DEF);
  }
  let aj = leer();
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(Object.assign({ v: 1 }, aj))); } catch (e) { /* sin almacén */ } }
  function pintarClase() { document.documentElement.classList.toggle('ninos-grande', !!aj.botones); }
  pintarClase();
  const css = document.createElement('style');
  css.textContent = 'html.ninos-grande :is(#b-fly,#b-dash,#b-jump,#b-action,#b-dive){min-width:84px;min-height:84px}html.ninos-grande #stick{width:168px;height:168px}#pause-ninos{display:grid;gap:8px;margin:0}#pause-ninos label{display:flex;align-items:center;justify-content:space-between;gap:12px;font:700 16px/1.3 var(--font-display,sans-serif)}#pause-ninos input[type=range]{width:140px}';
  document.head.appendChild(css);

  function seccion() {
    const menu = $('pause');
    if (!menu || menu.querySelector('#pause-ninos')) return;
    const sec = document.createElement('section');
    sec.id = 'pause-ninos';
    sec.innerHTML = '<h3>Para los más pequeños</h3>' +
      '<label>Vuelo fácil<input id="ninos-vuelo" type="checkbox"></label>' +
      '<label>Sensibilidad de la cámara<input id="ninos-sens" type="range" min="0.6" max="1.8" step="0.1"></label>' +
      '<label>Invertir el eje vertical<input id="ninos-inv" type="checkbox"></label>' +
      '<label>Botones más grandes<input id="ninos-btn" type="checkbox"></label>';
    const ayuda = menu.querySelector('.pause-help');
    if (ayuda) menu.insertBefore(sec, ayuda); else menu.appendChild(sec);
    const v = $('ninos-vuelo'), s = $('ninos-sens'), i = $('ninos-inv'), b = $('ninos-btn');
    const sync = () => { v.checked = aj.vuelo; s.value = String(aj.sensibilidad); i.checked = aj.invertir; b.checked = aj.botones; };
    sync();
    const cambiar = () => {
      aj = { vuelo: v.checked, sensibilidad: Number(s.value) || 1, invertir: i.checked, botones: b.checked };
      guardar(); pintarClase();
    };
    [v, s, i, b].forEach(el => el.addEventListener('change', cambiar));
  }
  seccion();

  function aplicar(dt) {
    pintarClase();
    if (!aj.vuelo || (G.quiet && !aplicar.forzar)) return;
    const M = G.fisica.MOVE;
    if (!M.flying) return;
    const suelo = G.terreno.height(S.pos.x, S.pos.z);
    const agua = G.agua && G.agua.levelAt ? G.agua.levelAt(S.pos.x, S.pos.z) : -1e9;
    const base = Math.max(suelo, isFinite(agua) ? agua : suelo);
    const alto = S.pos.y - base;
    const sube = !!(G.input.jumpHeld);
    const baja = !!(G.input.keys && G.input.keys.has('c'));
    if (!sube && !baja) {
      const falta = 6 - alto;
      S.vy = Math.max(-3, Math.min(4, (S.vy || 0) + falta * (dt || 0) * 1.5));
    }
    const izq = G.input.keys && (G.input.keys.has('a') || G.input.keys.has('arrowleft'));
    const der = G.input.keys && (G.input.keys.has('d') || G.input.keys.has('arrowright'));
    const gira = (der ? 1 : 0) - (izq ? 1 : 0) + (G.input.stick.x || 0);
    if (Math.abs(gira) > 0.15 && G.camara) G.camara.yaw -= gira * 0.5 * (dt || 0) * aj.sensibilidad;
    if (alto < 1.25 && alto > 0.05 && !sube && !M.landing && G.fisica.land) G.fisica.land();
  }
  G.on('update', dt => aplicar(Math.min(0.05, dt || 0)), 56);

  function test() {
    const out = [], ok = (n, pass, extra) => out.push({ name: n, ok: !!pass, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
    const M = G.fisica.MOVE;
    const guarda = { y: S.pos.y, vy: S.vy, flying: M.flying, landing: M.landing, quiet: G.quiet, yaw: G.camara.yaw };
    try {
      aj = { vuelo: true, sensibilidad: 1.4, invertir: true, botones: true };
      guardar(); pintarClase();
      ok('Se guarda en el dispositivo', JSON.parse(localStorage.getItem(CLAVE)).sensibilidad === 1.4, localStorage.getItem(CLAVE));
      ok('La pausa tiene los cuatro ajustes', !!document.getElementById('ninos-vuelo') && !!document.getElementById('ninos-sens') && !!document.getElementById('ninos-inv') && !!document.getElementById('ninos-btn'));
      ok('Los botones grandes encienden la clase', document.documentElement.classList.contains('ninos-grande'));
      ok('La cámara lee la sensibilidad y el eje invertido', G.ninos.camara.sensibilidad === 1.4 && G.ninos.camara.invertir === -1, JSON.stringify(G.ninos.camara));
      const suelo = G.terreno.height(S.pos.x, S.pos.z);
      M.flying = true; M.landing = false; S.pos.y = suelo + 2; S.vy = 0; G.quiet = true;
      aplicar.forzar = true; aplicar(0.4);
      ok('El vuelo fácil empuja hacia una altura cómoda', S.vy > 0.2, String(S.vy));
      S.pos.y = suelo + 0.4; M.landing = false; G.input.jumpHeld = false;
      aplicar(0.05);
      ok('Cerca del suelo el vuelo fácil pide posarse', M.landing === true);
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    aplicar.forzar = false;
    M.flying = guarda.flying; M.landing = guarda.landing; S.pos.y = guarda.y; S.vy = guarda.vy; G.quiet = guarda.quiet; G.camara.yaw = guarda.yaw;
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
    aj = leer(); pintarClase();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.ninosTest) AV.ninosTest = test; }, 0);

  return {
    get camara() { return { sensibilidad: aj.sensibilidad, invertir: aj.invertir ? -1 : 1, vuelo: aj.vuelo, botones: aj.botones }; },
    leer, aplicar, test,
  };
});
