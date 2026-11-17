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
  // T27: entre lo que está al alcance, primero lo que señala la guía (a 2,5 m o menos de su objetivo); si no, lo más cercano.
  // Antes, al llegar adonde decía la guía, Acción podía apuntar a otra cosa de al lado y «no hacía nada» para el paso
  function guia() { try { return G.misiones && G.misiones.guideTarget ? G.misiones.guideTarget() : null; } catch (e) { return null; } }
  function nearest() {
    let best = null, bd = Infinity, guiado = null, gd = Infinity;
    const g = guia();
    for (const it of list) {
      if (it.visible && !it.visible()) continue;
      const d = Math.hypot(S.pos.x - it.x, S.pos.z - it.z);
      if (!(d < it.r)) continue;
      if (d < bd) { bd = d; best = it; }
      if (g) { const dg = Math.hypot(it.x - g.x, it.z - g.z); if (dg < 2.5 && dg < gd) { gd = dg; guiado = it; } }
    }
    return guiado || best;
  }
  const modoActivo = () => !!(api.modo && api.modo.activo());
  // El texto del aviso va en un span: así se recorta con puntos suspensivos (o en 2 líneas en el móvil) y no a mitad de palabra
  function promptTxt() {
    const pr = $('prompt');
    let t = pr.querySelector('.prompt-txt');
    if (!t) { pr.textContent = ''; t = document.createElement('span'); t.className = 'prompt-txt'; pr.appendChild(t); }
    return t;
  }
  function action() {
    if (G.ui.overlayOpen()) return;
    if (G.dialogo.open()) { G.dialogo.next(); return; }
    if (G.ui.cardOpen) { G.ui.hideCard(); return; }
    if (modoActivo()) { api.modo.accion(); return; }
    const it = nearest();
    if (it) { it.use(); return; }
    if (lleva()) { G.agarre.soltar(); return; }
    // Nada cerca: que el botón no parezca roto. T27: responde al momento ({ ya }), con un sonido suave y la pista del paso
    try { G.audio.play('flecha'); } catch (e) { /* sin audio */ } // T45: pista «sigue la flecha» (audio.js: si se repite, un tick)
    let paso = ''; try { const q = document.querySelector('#steps li.now'); paso = q ? q.textContent.trim() : ''; } catch (e) { /* sin HUD */ }
    const en = !!(G.idioma && G.idioma.activo && G.idioma.activo()); // el objetivo de la página ya va traducido; el prefijo, según el idioma
    // F20: en Vuelo libre (sin misiones) no se manda a seguir la flecha hacia el objetivo de la historia
    if (G.menuModos && G.menuModos.libre) { G.ui.toast('Aquí no hay nada para usar. Acércate a algo que brille: el botón cambia de nombre.', 2600, { ya: true }); return; }
    G.ui.toast(paso ? (en ? 'Follow the arrow ✦: ' : 'Sigue la flecha ✦: ') + paso : 'Aquí no hay nada para usar. Sigue la flecha ✦ hasta lo que brilla: el botón cambia de nombre.', 2600, { ya: true });
  }
  const lleva = () => !!(G.agarre && G.agarre.lleva && G.agarre.lleva());
  // Aviso de acción, verbo del botón contextual y botón Bucear (al final de cada paso de simulación)
  G.on('update', (dt, busy) => {
    const modo = modoActivo();
    const it = (!busy && !modo) ? nearest() : null;
    const pr = $('prompt'), txt = promptTxt();
    // QA-181: el DOM solo se escribe si cambia (antes hidden se reescribía cada cuadro: una mutación y estilo invalidado por cuadro)
    const ocultar = () => { if (!pr.hidden) pr.hidden = true; };
    const poner = t => { if (txt.textContent !== t) txt.textContent = t; if (pr.hidden) pr.hidden = false; };
    if (modo && !busy) { const a = api.modo.aviso(); if (a) poner(a); else ocultar(); } // aviso vacío: el modo ya enseña sus controles (chips del duelo)
    else if (it) poner('Acción: ' + it.label());
    else ocultar();
    // T27: el verbo sin la puntuación del final («Observar: Suelo» daba «Observar:» y se veía cortado)
    const verb = modo && !busy ? api.modo.verbo : it ? it.label().split(' ')[0].replace(/[:,;.…·]+$/, '') : G.dialogo.open() ? 'Seguir' : !busy && lleva() ? 'Soltar' : 'Acción';
    const actBtn = G.input.actBtn;
    if (actBtn.textContent !== verb) actBtn.textContent = verb;
    // Atenuado cuando no hay nada que hacer; con algo cerca se ve pleno y dice el verbo
    const libre = verb === 'Acción';
    if (actBtn.classList.contains('sin-objetivo') !== libre) { actBtn.classList.toggle('sin-objetivo', libre); actBtn.style.opacity = libre ? '0.65' : ''; }
    G.input.syncSwimButtons(G.fisica.MOVE.swimming);
    // CG-122: el texto y el bloqueo del aterrizaje. input.js y botones.js son de CG-125 (Dev 1): no se mueven de sitio.
    // Fuera del agua, volando, #b-fly ya es el botón de bajar (Aterrizar). En el agua sigue #b-dive, en el mismo sitio.
    const fly = $('b-fly'), Mfly = G.fisica.MOVE;
    if (fly) {
      if (Mfly.flying && Mfly.landing) {
        if (fly.textContent !== 'Aterrizando…') {
          fly.textContent = 'Aterrizando…'; fly.dataset.icon = 'dive';
          fly.setAttribute('aria-label', 'Aterrizando: espera a tocar el suelo');
        }
        if (!fly.disabled) fly.disabled = true;
      } else if (fly.disabled) fly.disabled = false;
    }
  }, 90);
  return api;
});
