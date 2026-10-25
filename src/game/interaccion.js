/* Juego · interacción
   Lista de cosas con las que se puede interactuar, la más cercana dentro de su radio, la acción (E/Enter/botón Acción),
   el aviso "Acción: …" y el verbo del botón contextual.
   Interactuable = { id, x, z, r, label: () => texto, use: () => void, visible?: () => bool }.
   Un pack puede tomar la acción con G.interaccion.modo = { activo: () => bool, accion(), aviso: () => texto, verbo }
   (p. ej. el modo construir de cap1). Si el jugador lleva algo (G.agarre, del rol de movimiento) y no hay nada cerca,
   Acción lo suelta: un solo botón para recoger, usar y soltar. */
AVE.module('interaccion', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const list = [];
  const api = { list, modo: null, add, find, nearest, action };
  function add(it) { list.push(it); return it; }
  function find(id) { return list.find(i => i.id === id); }
  function nearest() {
    let best = null, bd = Infinity;
    for (const it of list) {
      if (it.visible && !it.visible()) continue;
      const d = Math.hypot(S.pos.x - it.x, S.pos.z - it.z);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    return best;
  }
  const modoActivo = () => !!(api.modo && api.modo.activo());
  function action() {
    if (G.ui.overlayOpen()) return;
    if (G.dialogo.open()) { G.dialogo.next(); return; }
    if (G.ui.cardOpen) { G.ui.hideCard(); return; }
    if (modoActivo()) { api.modo.accion(); return; }
    const it = nearest();
    if (it) { it.use(); return; }
    if (lleva()) G.agarre.soltar();
  }
  const lleva = () => !!(G.agarre && G.agarre.lleva && G.agarre.lleva());
  // Aviso de acción, verbo del botón contextual y botón Bucear (al final de cada paso de simulación)
  G.on('update', (dt, busy) => {
    const modo = modoActivo();
    const it = (!busy && !modo) ? nearest() : null;
    const pr = $('prompt');
    if (modo && !busy) { pr.textContent = api.modo.aviso(); pr.hidden = false; }
    else if (it) { pr.textContent = 'Acción: ' + it.label(); pr.hidden = false; }
    else pr.hidden = true;
    const verb = modo && !busy ? api.modo.verbo : it ? it.label().split(' ')[0] : G.dialogo.open() ? 'Seguir' : !busy && lleva() ? 'Soltar' : 'Acción';
    const actBtn = G.input.actBtn;
    if (actBtn.textContent !== verb) actBtn.textContent = verb;
    G.input.syncSwimButtons(G.fisica.MOVE.swimming);
  }, 90);
  return api;
});
