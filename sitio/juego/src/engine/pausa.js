/* AVE · pausa real
   El mundo se congela mientras haya algún motivo de pausa: el menú de pausa (#pause, popover), la portada (#title)
   o lo que pida otro módulo con G.pausa.set('motivo', true|false) (p. ej. el Modo Maestro).
   Congela con el hit-stop del bucle (dt = 0 en cada cuadro): la simulación, los temporizadores, la lluvia, las partículas y
   las animaciones se detienen, y el último cuadro se sigue dibujando. src/engine/renderer.js es del rol TA y no se toca:
   cuando se pueda, el bucle debería leer G.pausa.activa() directamente.
   G.input ignora las acciones del juego (saltar, volar, impulso, gestos, Acción) mientras dura la pausa. */
AVE.module('pausa', function (G) {
  'use strict';
  const $ = G.util.$;
  const motivos = new Set();
  const juice = () => G.camara.juice;
  function apply() {
    const j = juice();
    if (motivos.size) j.hitStop = Infinity;
    else if (j.hitStop === Infinity) j.hitStop = 0;
  }
  function set(motivo, on) {
    const antes = motivos.size > 0;
    if (on) motivos.add(motivo); else motivos.delete(motivo);
    apply();
    if (antes !== motivos.size > 0) G.emit('pausa', motivos.size > 0);
  }
  // Menú de pausa (popover nativo) y portada (<dialog open> que se cierra con su formulario).
  // Además de sus eventos (toggle, close) se lee su estado en cada cuadro y al preguntar: Chrome entrega esos eventos con el
  // dibujo, y en una pestaña en segundo plano pueden llegar tarde.
  const menu = $('pause'), portada = $('title');
  function sincronizar() {
    if (menu) { let open = false; try { open = menu.matches(':popover-open'); } catch (e) { /* sin popover */ } if (open !== motivos.has('menu')) set('menu', open); }
    if (portada && !!portada.open !== motivos.has('portada')) set('portada', !!portada.open);
  }
  const activa = () => { sincronizar(); return motivos.size > 0; };
  if (menu) menu.addEventListener('toggle', sincronizar);
  if (portada) portada.addEventListener('close', sincronizar);
  sincronizar();
  G.on('update', sincronizar, 1);

  return { set, activa, sincronizar, motivos };
});
