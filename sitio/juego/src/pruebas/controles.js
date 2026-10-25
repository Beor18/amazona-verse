/* AVE · AV.controlesTest: la guía de controles con teclado (src/game/guia_controles.js; rol Movimiento y controles)
   Se carga al pedir la prueba (boot.js), no en la descarga inicial. Comprueba que en teclado el panel sale solo al empezar,
   con las teclas reales del mapa (también remapeadas) y «Dejar de volar» destacado; que se cierra al moverse y se reabre
   desde la pausa; el icono y su leyenda (sin tapar el objetivo, los recursos ni el Diario); la pastilla al volar; las pistas
   en contexto y el aviso de viento; y que en táctil no sale nada. Deja el estado guardado, el mapa de teclas y la interfaz
   como estaban. Devuelve { passed, total, results }. */
window.AVControlesTest = function (G) {
  'use strict';
  const $ = G.util.$;
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const X = G.guiaControles && G.guiaControles.prueba;
    if (!X) { ok('La guía de controles está cargada', false, 'sin G.guiaControles'); return { passed: 0, total: 1, results }; }
    const M = G.fisica.MOVE, I = G.input, K = I.keys, E = X.el, AJ = X.AJ, nombre = X.nombre;
    let crudo = null; try { crudo = localStorage.getItem(X.CLAVE); } catch (e) { /* sin almacenamiento */ }
    const claveTeclas = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.teclas';
    let crudoTeclas = null; try { crudoTeclas = localStorage.getItem(claveTeclas); } catch (e) { /* sin almacenamiento */ }
    const mapa0 = I.mapa, antes = { forzado: X.forzado, est: X.est, panel: X.panelAbierto, enSesion: Object.assign({}, X.enSesion), fly: M.flying, landing: M.landing, gr: M.grounded };
    const limpiarSesion = () => { for (const k in X.enSesion) delete X.enSesion[k]; };
    const mostrado = el => !el.hidden && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
    const ciclo = (n, dt) => { for (let i = 0; i < n; i++) X.actualizar(dt || 1 / 60); };
    try {
      // 1. Teclado: jugador nuevo → el panel sale solo, con las teclas reales y dejar de volar destacado
      X.forzado = 'teclado'; X.est = { hecho: {}, vistas: {} }; limpiarSesion(); X.cerrar(); X.leyenda(false); X.ocultarPista(); X.reiniciar();
      const jugable = X.enJuego();
      ciclo(60);
      ok('Teclado: el panel de controles sale solo al empezar a jugar', !jugable || mostrado(E.panel), jugable ? '' : 'el juego no está jugable ahora (ventana o diálogo abiertos): se abre a mano');
      if (!jugable) X.mostrar(false);
      const filasP = [...E.panel.querySelectorAll('.guia-fila')].map(f => f.dataset.fila);
      ok('El panel trae mover, volar, subir, bajar, dejar de volar, cámara y acción', ['mover', 'volar', 'subir', 'bajar', 'aterrizar', 'camara', 'accion'].every(f => filasP.includes(f)), filasP.join(','));
      const dest = E.panel.querySelector('.guia-fila.destacada');
      ok('Dejar de volar va destacado', dest && dest.dataset.fila === 'aterrizar' && /Dejar de volar/.test(dest.textContent));
      ok('Las teclas son las del mapa (W A S D, V, X, E) y la cámara es con el ratón', /W.*A.*S.*D/.test(E.panel.querySelector('[data-fila="mover"]').textContent) &&
        E.panel.querySelector('[data-fila="volar"] kbd').textContent === nombre(mapa0.volar) && E.panel.querySelector('[data-fila="camara"] svg') &&
        E.panel.querySelector('[data-fila="aterrizar"] kbd').textContent === nombre(mapa0.aterrizar));
      // Remapeo: volar en B → el panel dice B
      I.asignar('volar', 'b'); X.mostrar(true);
      ok('Con las teclas cambiadas, el panel enseña las nuevas', E.panel.querySelector('[data-fila="volar"] kbd').textContent === 'B', E.panel.querySelector('[data-fila="volar"] kbd').textContent);
      I.asignar('volar', mapa0.volar);
      // Se cierra solo al moverse (tras la gracia)
      X.mostrar(false); ciclo(Math.ceil(AJ.gracia * 60) + 2); K.add('w'); ciclo(Math.ceil(AJ.cierre * 60) + 4); K.delete('w');
      ok('Se cierra solo al moverse', !mostrado(E.panel) && !X.panelAbierto);
      ok('Queda guardado que ya se vio', X.est.vistas.panel === true && (() => { try { return JSON.parse(localStorage.getItem(X.CLAVE)).vistas.panel === true; } catch (e) { return true; } })());
      const bp = $('b-guia-controles');
      ok('La pausa tiene «Ver la guía de controles» y lo abre', !!bp && (bp.click(), mostrado(E.panel)));
      X.cerrar();
      // 2. Icono y leyenda
      ok('Icono de controles visible en teclado', mostrado(E.boton) && E.boton.dataset.icon === 'keyboard', E.boton.textContent);
      E.boton.click();
      const fl = [...E.ley.querySelectorAll('.guia-fila')].map(f => f.dataset.fila);
      ok('Pulsar el icono muestra la leyenda (con dejar de volar destacado)', mostrado(E.ley) && fl.includes('aterrizar') && E.ley.querySelector('.destacada').dataset.fila === 'aterrizar' && E.boton.getAttribute('aria-expanded') === 'true', fl.join(','));
      const rl = E.ley.getBoundingClientRect(), r = E.boton.getBoundingClientRect();
      const choca = ['quest', 'inv', 'sys', 'b-diary'].filter(id => { const e = $(id); if (!e || !e.getClientRects().length) return false; const q = e.getBoundingClientRect(); return q.width && [r, rl].some(b => b.width && b.left < q.right && q.left < b.right && b.top < q.bottom && q.top < b.bottom); });
      E.boton.click();
      ok('Pulsarlo otra vez la cierra', !mostrado(E.ley));
      ok('El icono y su leyenda no tapan el objetivo, los recursos ni el Diario', !choca.length, choca.join(','));
      // 3. Volando, la pastilla recuerda la tecla para dejar de volar
      M.flying = true; M.landing = false; ciclo(2);
      ok('Volando, junto al icono sale la tecla para dejar de volar', mostrado(E.pastilla) && E.pastilla.querySelector('kbd').textContent === nombre(mapa0.aterrizar) && /Dejar de volar/.test(E.pastilla.textContent), E.pastilla.textContent);
      M.landing = true; ciclo(2); const alAterrizar = mostrado(E.pastilla);
      M.flying = false; M.landing = false; ciclo(2);
      ok('Aterrizando o en el suelo, la pastilla se va', !alAterrizar && !mostrado(E.pastilla));
      // 4. Pistas en contexto
      X.est = { hecho: {}, vistas: { panel: true } }; limpiarSesion(); X.enSesion.panel = 1; X.cerrar(); X.ocultarPista(); X.reiniciar();
      if (X.enJuego()) {
        M.flying = false; M.grounded = true; ciclo(Math.ceil(AJ.suelo * 10) + 5, 0.1);
        ok('En el suelo sin despegar, pista «Pulsa V para volar»', mostrado(E.pista) && X.pistaId === 'volar' && /para volar/.test(E.pista.textContent) && E.pista.querySelector('kbd').textContent === nombre(mapa0.volar), E.pista.textContent);
        X.ocultarPista(); X.est.hecho.volar = true; M.flying = true; M.landing = false; ciclo(20, 0.1);
        ok('Al volar la primera vez, pista «Mantén Espacio para subir»', mostrado(E.pista) && X.pistaId === 'subir' && /Espacio/.test(E.pista.textContent), E.pista.textContent);
        X.ocultarPista(); M.flying = false; ciclo(2);
      } else ok('Pistas en contexto', true, 'el juego no está jugable ahora: sin pistas');
      X.reiniciar(); G.emit('viento', true); G.emit('viento', false);
      ok('Aviso de viento fuerte en el techo de vuelo', mostrado(E.pista) && X.pistaId === 'viento' && /viento/i.test(E.pista.textContent), E.pista.textContent);
      X.ocultarPista();
      // 5. Táctil: nada de esto sale (allí están los botones)
      X.forzado = 'tactil'; X.est = { hecho: {}, vistas: {} }; limpiarSesion(); X.reiniciar(); X.cerrar(); X.leyenda(false);
      ciclo(60); M.flying = true; ciclo(2);
      ok('Táctil: ni panel, ni icono, ni pastilla', !mostrado(E.panel) && !mostrado(E.boton) && !mostrado(E.pastilla) && !X.panelAbierto && document.documentElement.classList.contains('guia-tactil'));
      ok('Táctil: mostrar() no abre el panel', X.mostrar(true) === false && !mostrado(E.panel));
      M.flying = false; ciclo(1);
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    // Todo como estaba
    X.forzado = antes.forzado; X.est = antes.est; limpiarSesion(); Object.assign(X.enSesion, antes.enSesion);
    M.flying = antes.fly; M.landing = antes.landing; M.grounded = antes.gr; K.delete('w');
    if (I.mapa.volar !== mapa0.volar) I.asignar('volar', mapa0.volar);
    try { if (crudo == null) localStorage.removeItem(X.CLAVE); else localStorage.setItem(X.CLAVE, crudo); } catch (e) { /* sin almacenamiento */ }
    try { if (crudoTeclas == null) localStorage.removeItem(claveTeclas); else localStorage.setItem(claveTeclas, crudoTeclas); } catch (e) { /* sin almacenamiento */ }
    X.cerrar(); X.leyenda(false); X.ocultarPista(); X.reiniciar(); X.actualizar(0); if (antes.panel) X.mostrar(true);
    return { passed: results.filter(x => x.ok).length, total: results.length, results };
  }
  return { test };
};
