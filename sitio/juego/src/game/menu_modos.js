/* Juego · «¿Cómo quieres jugar?» (tarjetas de la portada, #modos en index.html; estilos en src/ui/menu_modos.css)
   Kelvin, tras jugar: «quizás podemos crear el tipo de juego antes de entrar». Al abrir el juego se elige cómo jugar y se va directo
   a la acción, en vez de caer siempre en la historia. Siete tarjetas (nada se rehace: cada una abre lo que ya existe):
     aventura  → la historia del capítulo 1 (continuar o empezar)            carreras → el menú de Retos (src/game/retos.js: El Yunque, el río, el fantasma)
     tormenta  → retos.jugar('tormenta')                                      banquete → retos.jugar('banquete') (src/game/banquete.js)
     libre     → el mundo sin el panel de misiones ni la flecha de guía       nido     → el criadero (src/game/criadero.js), encima del menú
     records   → Mis récords (src/game/records.js), encima del menú
   - Las tarjetas «submit» cierran el <dialog id="title"> con su valor (sin JS); el evento close trae returnValue y aquí se abre el modo.
     Mi nido y Mis récords son type=button: se abren encima y al cerrarlos el menú sigue ahí.
   - Lo último que jugaste sale destacado (clase es-ultimo, chapa y foco) y se guarda en localStorage `<almacen>.menu` = { v, ultimo, intro }.
     No es parte de la partida: «Comenzar de cero» no lo toca; «Nuevo estudiante» sí lo borra.
   - Primera vez (sin cotorra): el creador ya está abierto detrás de la portada (guardado.arrancarVacio); se pone «corto» (nombre y
     plumaje; #creator.creator-corto) y al guardarse arranca el modo elegido. Si no era Aventura, la apertura del capítulo
     (pack.inicio) se aplaza (intro: 1) y se juega la primera vez que se entra en Aventura con el capítulo en el paso 0.
   - Volver: «Cambiar de juego» (#b-menu-modos, menú de pausa) sale del modo activo y vuelve a mostrar la portada (dialog.show()):
     pausa.js, musica.js y ui.js ya reaccionan a #title[open] (mundo congelado, pista «alegre», fondo inerte, HUD oculto).
   - Partida y cómic no se tocan: aquí no se escribe `<almacen>.save` ni se borra nada.
   - ES y EN según G.aula.aj.idioma; teclado (Tab/Enter, flechas entre tarjetas) y táctil; respeta prefers-reduced-motion (CSS).
   boot.js: window.AVMenuModos(G, { retos, records }) con las cargas perezosas. API: elegir(modo), mostrar(), volver(), ultimo(), test().
   Prueba: AV.menuModosTest(). */
(function () {
  'use strict';
  window.AVMenuModos = function (G, cargar) {
    if (G.menuModos) return G.menuModos;
    const S = G.S, $ = G.util.$, P = G.pack, raiz = document.documentElement;
    const ALMACEN = ((P.meta && P.meta.almacen) || P.id) + '.menu';
    const portada = $('title'), form = $('modos'), creador = $('creator');
    const MODOS = ['aventura', 'carreras', 'tormenta', 'banquete', 'flight', 'tren', 'river', 'maze', 'libre', 'nido', 'records'];
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    const TX = () => ({
      titulo: L('¿Cómo quieres jugar?', 'How do you want to play?'), ultimo: L('Lo último que jugaste', 'Last played'),
      listo: L('¡A jugar!', 'Let’s play!'), cambiar: L('Cambiar de juego', 'Change game'),
      aventura: [L('Aventura', 'Adventure'), subAventura()],
      carreras: [L('Carreras', 'Races'), L('El Yunque, el río y tu fantasma', 'El Yunque, the river and your ghost')],
      tormenta: [L('¡Escapa de la tormenta!', 'Escape the storm!'), L('90 segundos sobre el mar', '90 seconds over the sea')],
      banquete: [L('¡Banquete!', 'Feast!'), L('Frutos en vuelo y combos', 'Fruit on the wing and combos')],
      flight: [L('Amazona Flight', 'Amazona Flight'), L('Vuela sin parar entre los troncos', 'Fly non-stop between the logs')],
      tren: [L('El tren de Vittata', "Vittata's Train"), L('Carga, desvíos y curvas por la costa', 'Cargo, switches and curves along the coast')], // src/game/tren.js (C16)
      river: [L('River Rush', 'River Rush'), L('Baja el río en canoa: contrarreloj y fantasma', 'Paddle down the river: time trial and ghost')], // src/game/river_rush.js (AC2)
      maze: [L('Amazona Maze', 'Amazona Maze'), L('Frutos en el laberinto y guardianes', 'Fruit in the maze and guardians')], // src/game/maze.js (AB1, BI2)
      libre: [L('Vuelo libre', 'Free flight'), L('Explora sin misiones', 'Explore with no missions')],
      nido: [L('Mi nido', 'My nest'), L('Tus huevos y crías', 'Your eggs and chicks')],
      records: [L('Mis récords', 'My records'), L('Medallas y tiempos', 'Medals and times')],
    });
    function subAventura() {
      const pasos = (G.misiones && G.misiones.steps) || [];
      if (!(S.profile && S.profile.created)) return L('Empezar la historia', 'Start the story');
      if (S.complete) { const n = (P.meta && P.meta.capitulo) || 1; return L(`Capítulo ${n} completado · seguir explorando`, `Chapter ${n} complete · keep exploring`); }
      if (S.step > 0 || (S.events && S.events.length)) return L('Continuar · paso ', 'Continue · step ') + Math.min(S.step + 1, pasos.length || S.step + 1) + (pasos.length ? '/' + pasos.length : '');
      return L('Empezar la historia', 'Start the story');
    }

    // ---------- Memoria del menú (no es la partida) ----------
    const leer = () => { try { const d = JSON.parse(localStorage.getItem(ALMACEN) || 'null'); return d && d.v === 1 ? d : { v: 1 }; } catch (e) { return { v: 1 }; } };
    const guardar = o => { try { localStorage.setItem(ALMACEN, JSON.stringify(Object.assign(leer(), o))); } catch (e) { /* sin almacén */ } };
    const ultimo = () => { const u = leer().ultimo; return MODOS.includes(u) ? u : null; };
    G.on('nuevoEstudiante', () => { try { localStorage.removeItem(ALMACEN); } catch (e) { /* sin almacén */ } });

    // ---------- Apertura del capítulo aplazada (primera vez sin Aventura) ----------
    let inicioReal = P.inicio, aplazar = false;
    if (typeof inicioReal === 'function') P.inicio = function (g) { if (aplazar) { aplazar = false; guardar({ intro: 1 }); return undefined; } return inicioReal(g); };
    function introPendiente() { return leer().intro === 1 && S.profile && S.profile.created && S.step === 0 && !S.complete; }

    // ---------- Vuelo libre: sin panel de misiones ni flecha de guía (el mundo, la bandada, los frutos y los hallazgos siguen) ----------
    let libre = false;
    G.on('render', () => { if (libre && G.fx && G.fx.guide) G.fx.guide(null, 0); }, 61); // después del gancho de misiones (60)
    function entrarLibre() { libre = true; raiz.classList.add('modo-libre'); }
    function salirLibre() { if (!libre) return; libre = false; raiz.classList.remove('modo-libre'); }

    // ---------- Pintar el menú ----------
    function tarjetas() { return form ? [...form.querySelectorAll('[data-modo]')] : []; }
    function mostrar() {
      if (!form) return;
      const T = TX(), u = ultimo();
      const t = $('modos-t'); if (t) t.textContent = T.titulo;
      const bm = $('b-menu-modos'); if (bm) bm.textContent = T.cambiar;
      tarjetas().forEach((b, i) => {
        const m = b.dataset.modo, tx = T[m]; if (!tx) return;
        const bb = b.querySelector('b'), sm = b.querySelector('small');
        if (bb) bb.textContent = tx[0]; if (sm) sm.textContent = tx[1];
        b.style.setProperty('--i', i);
        const es = m === u; b.classList.toggle('es-ultimo', es);
        let chapa = b.querySelector('.modo-ultimo');
        if (es && !chapa) { chapa = document.createElement('span'); chapa.className = 'modo-ultimo'; b.prepend(chapa); }
        if (chapa) { chapa.textContent = T.ultimo; chapa.hidden = !es; }
        b.setAttribute('aria-label', tx[0] + '. ' + tx[1] + (es ? '. ' + T.ultimo : ''));
      });
      const foco = tarjetas().find(b => b.dataset.modo === u) || tarjetas()[0];
      if (foco && portada && portada.open) setTimeout(() => { if (portada.open && !portada.inert) foco.focus({ preventScroll: true }); }, 0);
    }
    function recordar(modo) { guardar({ ultimo: modo }); }

    // ---------- Abrir cada modo ----------
    let pendiente = null, lanzando = null;
    const listo = () => Promise.resolve(G.mundo && G.mundo.listo).catch(() => {});
    const toast = txt => { if (!G.quiet) G.ui.toast(txt, 3000); };
    const fallo = () => toast(L('No se pudo abrir. Prueba otra vez.', 'It could not open. Try again.'));
    function lanzar(modo) {
      if (modo !== 'libre') salirLibre();
      let p;
      if (modo === 'aventura') {
        if (introPendiente() && typeof inicioReal === 'function') { guardar({ intro: 0 }); setTimeout(() => { if (!G.dialogo.open()) inicioReal(G); }, 300); }
        p = Promise.resolve(true);
      } else if (modo === 'carreras') p = listo().then(() => cargar.retos()).then(r => r.abrir());
      else if (modo === 'tormenta' || modo === 'banquete') p = listo().then(() => cargar.retos()).then(r => r.jugar(modo));
      else if (modo === 'flight') p = listo().then(() => (window.AV && window.AV.flight ? window.AV.flight() : false));
      else if (modo === 'tren') p = listo().then(() => (window.AV && window.AV.tren ? window.AV.tren() : false)); // El tren de Vittata (src/game/tren.js, C16)
      else if (modo === 'river') p = listo().then(() => (window.AV && window.AV.riverRush ? window.AV.riverRush() : false));
      else if (modo === 'maze') p = listo().then(() => (window.AV && window.AV.maze ? window.AV.maze() : false)); // Amazona Maze (src/game/maze.js, BI2)
      else if (modo === 'libre') { entrarLibre(); p = Promise.resolve(true); }
      else if (modo === 'nido') p = G.criadero && G.criadero.abrir ? G.criadero.abrir() : Promise.resolve(false);
      else if (modo === 'records') p = cargar.records().then(r => r.abrir({ desde: 'portada' }));
      else p = Promise.resolve(false);
      lanzando = p.then(ok => { if (ok === false) fallo(); return ok; }, e => { console.error('menu_modos: no se pudo abrir ' + modo, e); fallo(); return false; });
      return lanzando;
    }
    // Primera vez: el creador (ya abierto detrás de la portada) se pone corto; al guardarse arranca el modo
    function prepararCreador() {
      if (!creador) return;
      creador.classList.add('creator-corto');
      const b = $('p-save'); if (b) { if (!b.dataset.txt0) b.dataset.txt0 = b.textContent; b.textContent = TX().listo; }
      if (creador.hidden) G.creador.open(true);
    }
    function soltarCreador() {
      if (!creador) return;
      creador.classList.remove('creator-corto');
      const b = $('p-save'); if (b && b.dataset.txt0) { b.textContent = b.dataset.txt0; delete b.dataset.txt0; }
    }
    if (creador) {
      let visible = !creador.hidden;
      new MutationObserver(() => {
        const v = !creador.hidden; if (v === visible) return; visible = v;
        if (v || !pendiente) return;
        const modo = pendiente; pendiente = null; soltarCreador();
        if (!(S.profile && S.profile.created)) return; // se cerró sin cotorra (cargar una partida, reinicio): nada que abrir
        if (modo === 'aventura') { aplazar = false; return; } // pack.inicio llega 300 ms después del guardado (creador.js) y se juega
        guardar({ intro: 1 }); aplazar = true; setTimeout(() => { aplazar = false; }, 1500); // con otro modo la apertura se aplaza
        lanzar(modo);
      }).observe(creador, { attributes: true, attributeFilter: ['hidden'] });
    }
    // nido y records se abren encima del menú (la portada sigue abierta); el resto cierra la portada primero
    function elegir(modo) {
      if (!MODOS.includes(modo)) return Promise.resolve(false);
      if (modo === 'nido' || modo === 'records') return lanzar(modo); // encima del menú; no cuentan como «lo último que jugaste»
      recordar(modo);
      const primera = !(S.profile && S.profile.created);
      if (primera) pendiente = modo; // antes de cerrar: el evento close no debe tomarlo por un cierre sin valor
      if (portada && portada.open) { portada.returnValue = ''; portada.close(); }
      if (primera) { prepararCreador(); return Promise.resolve(true); }
      return lanzar(modo);
    }
    // Volver al menú desde el juego (pausa → «Cambiar de juego»)
    function volver() {
      const r = G.retosApi; if (r) { try { r.salir(); } catch (e) { /* ya fuera */ } }
      const fv = G.flightApi; if (fv) { try { fv.salir(); } catch (e) { /* ya fuera */ } }
      const tv = G.trenApi; if (tv) { try { tv.salir(); } catch (e) { /* ya fuera */ } } // src/game/tren.js (C16)
      const rv = G.riverRushApi; if (rv) { try { rv.salir(); } catch (e) { /* ya fuera */ } }
      const mz = G.mazeApi; if (mz) { try { mz.salir(); } catch (e) { /* ya fuera */ } } // src/game/maze.js (BI2)
      if (G.criadero && G.criadero.abierto && G.criadero.abierto()) G.criadero.cerrar();
      salirLibre();
      const pausa = $('pause'); try { if (pausa && pausa.matches(':popover-open')) pausa.hidePopover(); } catch (e) { /* sin popover */ }
      if (portada && !portada.open) { portada.returnValue = ''; portada.show(); }
      mostrar();
      if (!G.quiet && G.audio && G.audio.play) try { G.audio.play('tick'); } catch (e) { /* sin audio */ }
      return !!(portada && portada.open);
    }

    // ---------- Enganches ----------
    if (portada) {
      portada.addEventListener('close', () => {
        const v = portada.returnValue; portada.returnValue = '';
        if (v === 'retos') { cargar.retos().then(r => r.abrir(), fallo); return; } // valor de la portada anterior
        if (MODOS.includes(v)) { elegir(v); return; }
        if (pendiente == null && !(S.profile && S.profile.created)) { pendiente = 'aventura'; prepararCreador(); } // cierre sin valor y sin cotorra: la historia
      });
      // Si se tocó una tarjeta antes de que cargara este archivo, el dialog ya está cerrado con su valor
      if (!portada.open && MODOS.includes(portada.returnValue)) setTimeout(() => { const v = portada.returnValue; portada.returnValue = ''; elegir(v); }, 0);
    }
    if (form) {
      form.addEventListener('click', e => {
        const b = e.target.closest('[data-modo]'); if (!b) return;
        if (!G.quiet && G.audio && G.audio.play) try { G.audio.play('pickup', 2); } catch (e2) { /* sin audio */ }
        if (b.type === 'button' && b.dataset.modo === 'nido') elegir('nido');
        else if (b.type === 'button' && b.dataset.modo === 'records') elegir('records'); // la tarjeta es #b-records-menu; #b-records-title es su etiqueta <b> (records.js la traduce con textContent)
      });
      form.addEventListener('keydown', e => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
        const ts = tarjetas(), i = ts.indexOf(document.activeElement); if (i < 0) return;
        const cols = Math.max(1, Math.round(form.querySelector('.modos-grid').clientWidth / ts[0].offsetWidth));
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? cols : -cols;
        const j = i + d; if (j < 0 || j >= ts.length) return;
        e.preventDefault(); ts[j].focus();
      });
    }
    const bm = $('b-menu-modos'); if (bm) bm.addEventListener('click', volver);
    G.on('apply', () => { if (portada && portada.open) mostrar(); }, 90);
    mostrar();

    // =================================================================================================================
    // Prueba: AV.menuModosTest()
    // =================================================================================================================
    const espera = ms => new Promise(r => setTimeout(r, ms));
    async function hasta(f, ms) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await espera(50); } return !!f(); }
    async function maquetaPortada(w, h) {
      const f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      f.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;border:0;`;
      const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
      const copia = portada.cloneNode(true); copia.setAttribute('open', ''); copia.querySelectorAll('.modo-ultimo').forEach(c => { c.hidden = false; });
      f.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}` +
        '<style>*, *::before, *::after { animation: none !important; transition: none !important; }</style></head><body>' + copia.outerHTML + '</body></html>';
      document.body.appendChild(f);
      await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
      const d = f.contentDocument;
      try { await Promise.race([d.fonts.ready, espera(2500)]); } catch (e) { /* sin fuentes */ }
      return { d, cerrar: () => f.remove() };
    }
    async function test() {
      const out = [], errores = [];
      const check = (n, ok, det) => { out.push({ name: n, ok: !!ok, detail: ok ? undefined : det }); if (!ok) console.warn('menuModosTest ✗', n, det || ''); };
      const ce = console.error; console.error = (...a) => { errores.push(a.map(String).join(' ')); ce.apply(console, a); };
      const errores0 = (window.__aveErrores || []).length;
      const quiet0 = G.quiet; G.quiet = true;
      const snap = G.guardado.instantanea(); G.guardado.suspender(true);
      const menu0 = (() => { try { return localStorage.getItem(ALMACEN); } catch (e) { return null; } })();
      const abierta0 = !!portada.open, libre0 = libre, inicio0 = inicioReal;
      let llamadas = 0; inicioReal = () => { llamadas++; };
      let retos = null;
      try {
        // 1. Markup y contrato de la portada (config.json preparar_js y e2e.js tocan el primer botón del formulario)
        const ts = tarjetas();
        check('Una tarjeta por modo (con Amazona Flight, el tren, River Rush y Amazona Maze)', ts.length === MODOS.length && ['tren', 'river', 'maze'].every(m => !!form.querySelector(`[data-modo="${m}"]`)) && form.querySelector('[data-modo="flight"] b').textContent === 'Amazona Flight' && MODOS.every(m => ts.some(b => b.dataset.modo === m)), ts.map(b => b.dataset.modo).join(','));
        const primero = form.querySelector('button');
        check('La primera tarjeta es Aventura y es submit del form method=dialog', primero && primero.dataset.modo === 'aventura' && primero.type === 'submit' && form.method === 'dialog');
        check('Nido y récords no cierran la portada (type=button)', ['nido', 'records'].every(m => form.querySelector(`[data-modo="${m}"]`).type === 'button'));
        check('Textos en ES', $('modos-t').textContent === '¿Cómo quieres jugar?' && form.querySelector('[data-modo="libre"] b').textContent === 'Vuelo libre');
        // 2. Cada tarjeta abre su modo y «Cambiar de juego» vuelve al menú
        retos = await cargar.retos(); retos.pruebas.prueba(true);
        if (!portada.open) volver();
        check('El menú se muestra (portada abierta, mundo en pausa)', portada.open && G.pausa.activa());
        await elegir('tormenta');
        check('Tormenta: la portada se cierra y el reto arranca', !portada.open && retos.activo && retos.reto === 'tormenta');
        check('Vuelve al menú y sale del reto', volver() && portada.open && !retos.activo && !document.body.classList.contains('retos-on'));
        await elegir('carreras');
        check('Carreras: abre el menú de Retos', !portada.open && retos.fase === 'menu' && !retos.pruebas.ui().menu.hidden);
        volver(); check('Vuelve al menú desde el menú de Retos', portada.open && retos.pruebas.ui().el.hidden);
        await elegir('banquete');
        const okB = await hasta(() => retos.activo && retos.reto === 'banquete', 15000);
        check('Banquete: el reto arranca (carga perezosa)', okB && !portada.open, retos.reto);
        volver(); check('Vuelve al menú desde el banquete', portada.open && !retos.activo);
        await elegir('flight');
        const okF = await hasta(() => G.flightApi && G.flightApi._dev.st.activo, 15000);
        check('Amazona Flight: la tarjeta abre el vuelo y cierra la portada', okF && !portada.open);
        volver(); check('Vuelve al menú desde Amazona Flight', portada.open && !G.flightApi._dev.st.activo && !document.body.classList.contains('flight-on'));
        await elegir('river');
        const okR = await hasta(() => G.riverRushApi && G.riverRushApi.activo, 15000);
        check('River Rush: la tarjeta abre el río y cierra la portada', okR && !portada.open);
        volver(); check('Vuelve al menú desde River Rush', portada.open && !G.riverRushApi.activo && !document.body.classList.contains('river-on'));
        await elegir('tren');
        const okTren = await hasta(() => G.trenApi && G.trenApi.activo, 15000);
        check('El tren de Vittata: la tarjeta abre el tren y cierra la portada', okTren && !portada.open);
        volver(); check('Vuelve al menú desde el tren', portada.open && !G.trenApi.activo && !document.body.classList.contains('tren-on'));
        await elegir('maze');
        const okMaze = await hasta(() => G.mazeApi && G.mazeApi.activo, 15000);
        check('Amazona Maze: la tarjeta abre el laberinto y cierra la portada', okMaze && !portada.open);
        volver(); check('Vuelve al menú desde Amazona Maze', portada.open && !G.mazeApi.activo && !document.body.classList.contains('maze-on'));
        await elegir('libre');
        check('Vuelo libre: sin panel de misiones ni guía, y la partida sigue siendo la misma', !portada.open && raiz.classList.contains('modo-libre') && getComputedStyle($('quest')).display === 'none' && libre);
        G.emit('render', 0.016); check('Vuelo libre: la flecha de guía no se ve', G.fx && G.fx.guideBeam ? !G.fx.guideBeam.visible : true);
        volver(); check('Vuelve al menú desde el vuelo libre', portada.open && !raiz.classList.contains('modo-libre') && getComputedStyle($('quest')).display !== 'none');
        if (G.criadero && G.criadero.abrir) {
          const okN = await elegir('nido');
          check('Mi nido: el criadero se abre encima del menú', okN && G.criadero.abierto() && portada.open);
          G.criadero.cerrar(); check('Al cerrar el nido el menú sigue', !G.criadero.abierto() && portada.open);
        }
        const rec = await cargar.records(); await elegir('records');
        check('Mis récords: se abren encima del menú', !$('records').hidden && portada.open);
        rec.cerrar(); check('Al cerrar los récords el menú sigue', $('records').hidden && portada.open);
        await elegir('aventura');
        check('Aventura: la portada se cierra, sin retos ni vuelo libre', !portada.open && !retos.activo && !libre);
        volver();
        // 3. Recuerda lo último que jugaste
        check('Recuerda el último modo (aventura) y lo destaca con foco', ultimo() === 'aventura' && form.querySelector('[data-modo="aventura"]').classList.contains('es-ultimo') && form.querySelectorAll('.es-ultimo').length === 1);
        await espera(10); check('La tarjeta destacada tiene el foco', document.activeElement === form.querySelector('[data-modo="aventura"]') || !document.hasFocus());
        guardar({ ultimo: 'tormenta' }); mostrar();
        check('Al cambiar lo último cambia la tarjeta destacada', form.querySelector('[data-modo="tormenta"]').classList.contains('es-ultimo') && !form.querySelector('[data-modo="aventura"]').classList.contains('es-ultimo'));
        // 4. Primera vez: el creador corto, y la apertura del capítulo se aplaza si no se eligió Aventura
        const look = G.creador.profileLook(S.profile), nombre = G.creador.nombreAzar();
        S.profile.created = false; guardar({ intro: 0 });
        await elegir('tormenta');
        check('Primera vez: la portada se cierra, el creador se abre corto y el reto espera', !portada.open && !creador.hidden && creador.classList.contains('creator-corto') && pendiente === 'tormenta' && !retos.activo && $('p-save').textContent === '¡A jugar!');
        check('Primera vez: el plumaje se elige, los accesorios quedan para «Mi personaje»', getComputedStyle($('p-slots')).display === 'none' && getComputedStyle($('p-species')).display !== 'none');
        const err = G.creador.saveCharacter({ name: nombre, look }); // con G.quiet creador.js no llama a pack.inicio: se simula abajo
        const okT = await hasta(() => retos.activo && retos.reto === 'tormenta', 5000);
        check('Al guardar la cotorra arranca el modo elegido', err === null && okT && S.profile.created && creador.hidden && !creador.classList.contains('creator-corto') && $('p-save').textContent !== '¡A jugar!', err);
        P.inicio(G);
        check('La apertura del capítulo se aplaza (intro pendiente) y no se juega', llamadas === 0 && leer().intro === 1 && aplazar === false);
        volver();
        await elegir('aventura'); await espera(400);
        check('Al entrar en Aventura con la intro pendiente, se juega y deja de estar pendiente', llamadas === 1 && leer().intro !== 1);
        volver();
        // Primera vez con Aventura: la apertura se juega como siempre (pack.inicio) y no queda pendiente
        S.profile.created = false; llamadas = 0;
        await elegir('aventura');
        check('Primera vez con Aventura: el creador corto espera', !portada.open && !creador.hidden && pendiente === 'aventura');
        G.creador.saveCharacter({ name: nombre, look }); await espera(20); P.inicio(G);
        check('Primera vez con Aventura: la apertura del capítulo se juega al guardar', llamadas === 1 && leer().intro !== 1 && creador.hidden && aplazar === false);
        volver();
        // 5. EN
        const aj = G.aula && G.aula.aj, idioma0 = aj ? aj.idioma : null;
        if (aj) { aj.idioma = 'en'; mostrar(); check('Textos en EN', $('modos-t').textContent === 'How do you want to play?' && form.querySelector('[data-modo="nido"] b').textContent === 'My nest'); aj.idioma = idioma0; mostrar(); }
        // 6. Maqueta móvil: sin desbordes, tarjetas de 44 px o más y sin solaparse
        for (const [w, h] of [[375, 812], [320, 568], [812, 375]]) {
          const m = await maquetaPortada(w, h);
          try {
            const d = m.d, malos = [];
            if (d.documentElement.scrollWidth > w + 1) malos.push('página ' + d.documentElement.scrollWidth + ' px');
            const rs = [...d.querySelectorAll('.modo')].map(b => b.getBoundingClientRect());
            rs.forEach((r, i) => { if (r.left < -1 || r.right > w + 1) malos.push(`tarjeta ${i} se sale (${Math.round(r.left)}…${Math.round(r.right)})`); if (r.width < 44 || r.height < 44) malos.push(`tarjeta ${i} mide ${Math.round(r.width)}×${Math.round(r.height)}`); });
            for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) malos.push(`tarjetas ${i} y ${j} se solapan`); }
            const main = d.querySelector('.title-main'), cs = main && d.defaultView.getComputedStyle(main);
            if (main && main.scrollHeight > main.clientHeight + 1 && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') malos.push('el menú no cabe y no se desplaza');
            const titulo = d.getElementById('modos-t'); if (titulo && titulo.getBoundingClientRect().width > w) malos.push('el título desborda');
            check(`Maqueta ${w}×${h}: nada desborda, tarjetas ≥ 44 px y sin solapes`, !malos.length, malos.join('; '));
          } finally { m.cerrar(); }
        }
        const nuevos = (window.__aveErrores || []).slice(errores0);
        check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally {
        console.error = ce; inicioReal = inicio0; aplazar = false; pendiente = null; soltarCreador(); salirLibre();
        try { if (retos) { retos.salir(); retos.pruebas.prueba(false); } } catch (e) { /* ya fuera */ }
        try { if (G.criadero && G.criadero.abierto && G.criadero.abierto()) G.criadero.cerrar(); } catch (e) { /* cerrado */ }
        try { if (G.recordsApi) G.recordsApi.cerrar(); } catch (e) { /* cerrado */ }
        try { if (menu0 == null) localStorage.removeItem(ALMACEN); else localStorage.setItem(ALMACEN, menu0); } catch (e) { /* sin almacén */ }
        G.guardado.restaurar(snap); G.guardado.suspender(false); G.quiet = quiet0;
        if (libre0) entrarLibre();
        if (portada.open !== abierta0) { if (abierta0) { portada.returnValue = ''; portada.show(); } else portada.close(); }
        mostrar();
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = G.menuModos = { elegir, mostrar, volver, ultimo, test, get libre() { return libre; }, get pendiente() { return pendiente; } };
    api.temporada = G.temporada = temporada(G, { L, espera, hasta, elegir });
    return api;
  };

  // =================================================================================================================
  // La temporada 1 como una sola aventura (AV1)
  //   - Progreso en localStorage `amazonaverse.temporada` = { v: 1, terminados: { n: ms }, decisiones: { n: {…} } }, común a los 6
  //     packs (cada capítulo guarda su partida en `<almacen>.save`; de ahí sale «en curso»). «Nuevo estudiante» lo borra;
  //     «Comenzar de cero» de un capítulo no (lo terminado sigue terminado).
  //   - Al terminar (S.complete con el panel #end a la vista) se marca el capítulo y, si el pack trae temporada.decision(S),
  //     se guarda lo que decidió el jugador (cap. 4: opción y cuidado). G.temporada.decision(4) lo devuelve en los caps. 5 y 6.
  //   - #b-siguiente en el panel final abre el siguiente pack (?pack=epN; el 1 es sin pack).
  //   - Pantalla «Capítulos» (#capitulos): los 6 con portada, estado (nuevo / en curso / terminado) y Jugar. Se abre desde la
  //     portada (#b-capitulos-title) y la pausa (#b-capitulos). Estilos en src/ui/menu_modos.css.
  //   Prueba: AV.temporadaTest() (encadena el final de este capítulo con el arranque del siguiente en un iframe a 375×812).
  // =================================================================================================================
  const CAPS = [
    { n: 1, id: 'cap1', almacen: 'amazonaverse', es: 'El día que el cielo se rompió', en: 'The Day the Sky Broke', c: ['#4b6fd8', '#1d1a5c'],
      img: '<path d="M14 34a10 10 0 0 1 4-19 13 13 0 0 1 25 2 9 9 0 0 1 3 17z" fill="#dfe8ff"/><path d="M33 30l-7 13h7l-4 13 13-18h-8l5-8z" fill="var(--gold)"/>' },
    { n: 2, id: 'ep2', almacen: 'ep2', es: 'Un lugar para todos', en: 'A Place for Everyone', c: ['#3f9b58', '#164a2a'],
      img: '<path d="M8 32L32 12l24 20z" fill="#c9733b"/><path d="M14 30h36v24H14z" fill="#f2d7a6"/><path d="M28 40h8v14h-8z" fill="#7a4a24"/>' },
    { n: 3, id: 'ep3', almacen: 'ep3', es: 'Más allá de la bahía', en: 'Beyond the Bay', c: ['#2c9bc4', '#0f3d63'],
      img: '<path d="M33 8v30H14z" fill="#fff"/><path d="M36 14v24h14z" fill="#ffe7a8"/><path d="M8 42h48l-7 10H15z" fill="#8a5a2e"/><path d="M4 56q7-4 14 0t14 0 14 0 14 0" stroke="#bfe9ff" stroke-width="3" fill="none"/>' },
    { n: 4, id: 'ep4', almacen: 'ep4', es: 'El precio del progreso', en: 'The Price of Progress', c: ['#c98a2b', '#5b3510'],
      img: '<path d="M4 40h56v6H4z" fill="#8a5a2e"/><path d="M8 46q24-26 48 0" stroke="#f2d7a6" stroke-width="5" fill="none"/><path d="M12 46v10m40-10v10" stroke="#8a5a2e" stroke-width="5"/><path d="M4 58q7-3 14 0t14 0 14 0 14 0" stroke="#9fe3ff" stroke-width="3" fill="none"/>' },
    { n: 5, id: 'ep5', almacen: 'ep5', es: 'Las voces olvidadas', en: 'The Forgotten Voices', c: ['#6b4fc9', '#211552'],
      img: '<path d="M26 56l6-30 6 30z" fill="#cfd4ff"/><circle cx="32" cy="22" r="5" fill="var(--gold)"/><path d="M20 12a17 17 0 0 0 0 20M44 12a17 17 0 0 1 0 20M14 6a25 25 0 0 0 0 32M50 6a25 25 0 0 1 0 32" stroke="#e7dcff" stroke-width="3" fill="none" stroke-linecap="round"/>' },
    { n: 6, id: 'ep6', almacen: 'ep6', es: 'El pacto de los 36', en: 'The Pact of the 36', c: ['#d4507a', '#4f1630'],
      img: Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return `<circle cx="${(32 + 21 * Math.cos(a)).toFixed(1)}" cy="${(32 + 21 * Math.sin(a)).toFixed(1)}" r="4" fill="${i % 3 ? '#ffe2ec' : 'var(--gold)'}"/>`; }).join('') + '<circle cx="32" cy="32" r="8" fill="var(--gold)"/>' },
  ];
  const TEMP = 'amazonaverse.temporada';

  function temporada(G, h) {
    const S = G.S, P = G.pack, $ = G.util.$, L = h.L;
    const actual = (P.meta && P.meta.capitulo) || (CAPS.find(c => c.id === P.id) || CAPS[0]).n;
    const cap = n => CAPS[n - 1];
    const dlg = $('capitulos'), lista = $('capitulos-lista'), bSig = $('b-siguiente');

    // ---------- Progreso ----------
    const leer = () => { try { const d = JSON.parse(localStorage.getItem(TEMP) || 'null'); if (d && d.v === 1) return Object.assign({ terminados: {}, decisiones: {} }, d); } catch (e) { /* corrupto: se empieza de nuevo */ } return { v: 1, terminados: {}, decisiones: {} }; };
    const escribir = d => { try { localStorage.setItem(TEMP, JSON.stringify(d)); } catch (e) { /* sin almacén */ } };
    G.on('nuevoEstudiante', () => { try { localStorage.removeItem(TEMP); } catch (e) { /* sin almacén */ } });
    function partida(n) {
      if (n === actual) return S;
      try { return JSON.parse(localStorage.getItem(cap(n).almacen + '.save') || 'null'); } catch (e) { return null; }
    }
    function estado(n) {
      const d = partida(n);
      if (leer().terminados[n] || (d && d.complete)) return 'terminado';
      if (d && d.profile && d.profile.created && (d.step > 0 || (d.events && d.events.length))) return 'en curso';
      return 'nuevo';
    }
    function terminar(n, decision) {
      const d = leer(); if (!d.terminados[n]) d.terminados[n] = Date.now();
      if (decision) d.decisiones[n] = Object.assign({}, d.decisiones[n], decision); // se mezcla con lo apuntado al decidir (src/game/temporada.js)
      escribir(d);
    }
    const decision = n => leer().decisiones[n] || null;
    function alTerminar() {
      if (!S.complete) return;
      let dec = null;
      try { dec = P.temporada && P.temporada.decision ? P.temporada.decision(S, G) : null; } catch (e) { console.warn('temporada: decisión', e); }
      terminar(actual, dec);
    }

    // ---------- Navegación ----------
    let navegar = url => { location.href = url; }; // la prueba lo cambia para no salir de la página
    function urlDe(n) {
      const u = new URL(location.href);
      if (n === 1) u.searchParams.delete('pack'); else u.searchParams.set('pack', cap(n).id);
      u.searchParams.delete('mini');
      return u.pathname + u.search;
    }
    function jugar(n) {
      if (n === actual) { cerrar(); const t = $('title'); if (t && t.open) h.elegir('aventura'); return null; }
      const url = urlDe(n); G.guardado.autosave && G.guardado.autosave(); navegar(url); return url;
    }

    // ---------- Panel final: «Siguiente capítulo» ----------
    function pintarFin() {
      if (!bSig) return;
      const hay = actual < CAPS.length && S.complete;
      bSig.hidden = !hay;
      if (hay) { bSig.textContent = L('Siguiente capítulo', 'Next chapter'); bSig.setAttribute('aria-label', L(`Siguiente capítulo: Capítulo ${actual + 1}, ${cap(actual + 1).es}`, `Next chapter: Chapter ${actual + 1}, ${cap(actual + 1).en}`)); }
    }
    if (bSig) bSig.addEventListener('click', () => jugar(actual + 1));
    const fin = $('end');
    if (fin) new MutationObserver(() => { if (!fin.hidden && S.complete) { alTerminar(); pintarFin(); } }).observe(fin, { attributes: true, attributeFilter: ['hidden'] });
    G.on('apply', () => { if (S.complete) alTerminar(); pintarFin(); }, 95);

    // ---------- Pantalla «Capítulos» ----------
    const ESTADO_TX = { nuevo: ['Nuevo', 'New'], 'en curso': ['En curso', 'In progress'], terminado: ['Terminado', 'Finished'] };
    function pintar() {
      const t = $('capitulos-t'); if (t) t.textContent = L('Capítulos', 'Chapters');
      const x = $('b-capitulos-cerrar'); if (x) x.setAttribute('aria-label', L('Cerrar', 'Close'));
      for (const id of ['b-capitulos', 'b-capitulos-title']) { const b = $(id); if (b) b.textContent = L('Capítulos', 'Chapters'); }
      if (!lista) return;
      lista.innerHTML = '';
      for (const c of CAPS) {
        const e = estado(c.n), aqui = c.n === actual, rot = L('Capítulo ', 'Chapter ') + c.n, tit = L(c.es, c.en);
        const li = document.createElement('li');
        li.className = 'cap-item' + (aqui ? ' es-actual' : ''); li.dataset.cap = c.n; li.dataset.estado = e;
        li.style.setProperty('--cap-a', c.c[0]); li.style.setProperty('--cap-b', c.c[1]);
        const boton = aqui ? L('Seguir aquí', 'Keep playing') : e === 'terminado' ? L('Volver a jugar', 'Play again') : e === 'en curso' ? L('Continuar', 'Continue') : L('Jugar', 'Play');
        li.innerHTML = `<div class="cap-portada" aria-hidden="true"><svg viewBox="0 0 64 64">${c.img}</svg><span>${c.n}</span></div>` +
          `<div class="cap-info"><small>${rot}${aqui ? ' · ' + L('estás aquí', 'you are here') : ''}</small><b></b><span class="cap-estado"></span></div>` +
          `<button class="btn cap-jugar" type="button" data-icon="play"></button>`;
        li.querySelector('b').textContent = tit;
        li.querySelector('.cap-estado').textContent = L(...ESTADO_TX[e]);
        const b = li.querySelector('.cap-jugar'); b.textContent = boton; b.setAttribute('aria-label', `${boton}: ${rot}, ${tit}`);
        b.addEventListener('click', () => jugar(c.n));
        lista.appendChild(li);
      }
    }
    function abrir() {
      if (!dlg) return false;
      pintar();
      if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.show(); } }
      const f = lista && (lista.querySelector('.es-actual .cap-jugar') || lista.querySelector('.cap-jugar'));
      if (f) f.focus({ preventScroll: true });
      return true;
    }
    function cerrar() { if (dlg && dlg.open) dlg.close(); }
    for (const id of ['b-capitulos', 'b-capitulos-title']) { const b = $(id); if (b) b.addEventListener('click', abrir); }
    const bx = $('b-capitulos-cerrar'); if (bx) bx.addEventListener('click', cerrar);
    if (dlg) dlg.addEventListener('click', e => { if (e.target === dlg) cerrar(); }); // clic en el fondo
    G.on('aula', k => { if (k === 'idioma') { pintar(); pintarFin(); } });
    pintar(); pintarFin();

    // =================================================================================================================
    // Prueba: AV.temporadaTest()
    // =================================================================================================================
    async function test(opts) {
      opts = opts || {};
      const out = [], errores = [];
      const check = (n, ok, det) => { out.push({ name: n, ok: !!ok, detail: ok ? undefined : det }); if (!ok) console.warn('temporadaTest ✗', n, det || ''); };
      const ce = console.error; console.error = (...a) => { errores.push(a.map(String).join(' ')); ce.apply(console, a); };
      const errores0 = (window.__aveErrores || []).length;
      const quiet0 = G.quiet; G.quiet = true;
      const snap = G.guardado.instantanea(); G.guardado.suspender(true);
      const claves = [TEMP].concat(CAPS.filter(c => c.n !== actual).map(c => c.almacen + '.save'));
      const antes = {}; for (const k of claves) { try { antes[k] = localStorage.getItem(k); localStorage.removeItem(k); } catch (e) { /* sin almacén */ } }
      const nav0 = navegar; let fueA = null; navegar = u => { fueA = u; };
      const aj = G.aula && G.aula.aj, idioma0 = aj ? aj.idioma : null;
      const pausa = $('pause'), fin0 = fin ? fin.hidden : true, finTxt = $('end-text'), finTxt0 = finTxt ? finTxt.textContent : '', portada = $('title'), portada0 = !!(portada && portada.open);
      let fr = null;
      try {
        // 1. Markup y rótulos
        check('Markup: #capitulos, «Capítulos» en portada y pausa, «Siguiente capítulo» en el panel final', dlg && lista && $('b-capitulos') && $('b-capitulos-title') && bSig && bSig.closest('#end'));
        check('Seis capítulos y este pack es el ' + actual, CAPS.length === 6 && cap(actual).id === P.id);
        const hud = (P.meta && P.meta.hud) || {};
        check('Rótulo «Capítulo N» en el HUD del pack (sin «Episodio»)', !/Episodio|Prototipo/.test(JSON.stringify(hud)) && (!hud.capitulo || hud.capitulo.startsWith('Capítulo ' + actual)), hud.capitulo);
        check('La portada ya no tiene enlaces «Episodio»', !/Episodio/.test(($('title') || document.body).textContent));
        // 2. Guardar y cargar
        check('Sin progreso: todo nuevo menos lo que se juega aquí', CAPS.filter(c => c.n !== actual).every(c => estado(c.n) === 'nuevo'));
        const otro = actual === 3 ? 2 : 3;
        localStorage.setItem(cap(otro).almacen + '.save', JSON.stringify({ v: 1, profile: { created: true, name: 'Prueba' }, step: 2, events: [] }));
        check('Una partida empezada en otro capítulo cuenta como «en curso»', estado(otro) === 'en curso', estado(otro));
        terminar(4, { opcion: 'puente', cuidado: 'nidos' });
        const crudo = JSON.parse(localStorage.getItem(TEMP));
        check('Terminar se guarda en amazonaverse.temporada con la decisión del cap. 4', crudo.v === 1 && crudo.terminados[4] > 0 && crudo.decisiones[4].opcion === 'puente');
        check('Al leer otra vez: cap. 4 terminado y su decisión a mano (G.temporada.decision)', estado(4) === 'terminado' && G.temporada.decision(4).cuidado === 'nidos');
        // 3. Final del capítulo → «Siguiente capítulo»
        if (aj) aj.idioma = 'es';
        S.complete = true; S.explorando = false; G.misiones.showEnd(); await h.espera(30);
        const hay = actual < 6;
        check('Al terminar se marca este capítulo', estado(actual) === 'terminado' && leer().terminados[actual] > 0);
        check('El panel final ofrece «Siguiente capítulo»' + (hay ? '' : ' (no en el 6)'), hay ? !bSig.hidden && bSig.textContent === 'Siguiente capítulo' && bSig.getBoundingClientRect().height >= 44 : bSig.hidden);
        if (hay) { bSig.click(); check('«Siguiente capítulo» abre el pack ' + cap(actual + 1).id, fueA && new URL(fueA, location.href).searchParams.get('pack') === cap(actual + 1).id, fueA); }
        if (aj) { aj.idioma = 'en'; pintarFin(); check('EN: «Next chapter»', !hay || bSig.textContent === 'Next chapter'); aj.idioma = 'es'; pintarFin(); }
        fin.hidden = true; S.complete = snap.complete;
        // 4. Pantalla «Capítulos»
        if (pausa) { try { pausa.showPopover(); } catch (e) { /* sin popover */ } }
        $('b-capitulos').click();
        const items = [...lista.querySelectorAll('.cap-item')];
        check('Desde la pausa: se abre con los 6, portada, estado y botón', dlg.open && items.length === 6 && items.every(li => li.querySelector('.cap-portada svg') && li.querySelector('.cap-estado').textContent && li.querySelector('.cap-jugar')));
        check('Los estados se ven: terminado, en curso y nuevo', items[3].dataset.estado === 'terminado' && items[3].querySelector('.cap-estado').textContent === 'Terminado' && items[otro - 1].querySelector('.cap-estado').textContent === 'En curso' && items.some(li => li.querySelector('.cap-estado').textContent === 'Nuevo'));
        check('Rótulos «Capítulo N» en orden y el actual marcado', items.every((li, i) => li.querySelector('small').textContent.startsWith('Capítulo ' + (i + 1))) && lista.querySelectorAll('.es-actual').length === 1 && items[actual - 1].classList.contains('es-actual'));
        fueA = null; items[otro - 1].querySelector('.cap-jugar').click();
        check('Jugar abre el pack de ese capítulo', fueA && (otro === 1 ? !new URL(fueA, location.href).searchParams.get('pack') : new URL(fueA, location.href).searchParams.get('pack') === cap(otro).id), fueA);
        fueA = null; items[actual - 1].querySelector('.cap-jugar').click();
        check('En el capítulo actual el botón cierra la pantalla y no recarga', !dlg.open && fueA === null);
        const bt = $('b-capitulos-title'); const t = $('title'), tAbierta = t && t.open;
        if (t && !tAbierta) t.show();
        bt.click(); check('Desde la portada también se abre', dlg.open); cerrar();
        if (t && !tAbierta) { t.returnValue = ''; t.close(); }
        if (aj) {
          aj.idioma = 'en'; abrir();
          const it = [...lista.querySelectorAll('.cap-item')];
          check('EN: «Chapters», «Chapter N» y estados en inglés', $('capitulos-t').textContent === 'Chapters' && it[1].querySelector('small').textContent.startsWith('Chapter 2') && it[3].querySelector('.cap-estado').textContent === 'Finished' && $('b-capitulos').textContent === 'Chapters');
          cerrar(); aj.idioma = 'es'; pintar();
        }
        // 5. Maqueta 375×812 (ES y EN): nada se sale, botones de 44 px o más y la lista se desplaza si no cabe
        for (const idi of ['es', 'en']) {
          if (aj) aj.idioma = idi; pintar();
          const f = document.createElement('iframe'); f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
          f.style.cssText = 'position:fixed;left:-10000px;top:0;width:375px;height:812px;border:0;';
          const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
          const copia = dlg.cloneNode(true); copia.setAttribute('open', '');
          f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}<style>*{animation:none!important;transition:none!important}</style></head><body>${copia.outerHTML}</body></html>`;
          document.body.appendChild(f);
          await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
          try {
            const d = f.contentDocument, malos = [];
            try { await Promise.race([d.fonts.ready, h.espera(2500)]); } catch (e) { /* sin fuentes */ }
            const caja = d.querySelector('dialog').getBoundingClientRect();
            if (caja.left < -1 || caja.right > 376) malos.push(`panel ${Math.round(caja.left)}…${Math.round(caja.right)}`);
            if (caja.bottom > 813 && d.defaultView.getComputedStyle(d.querySelector('dialog')).overflowY === 'visible') malos.push('el panel no cabe y no se desplaza');
            d.querySelectorAll('.cap-jugar, #b-capitulos-cerrar').forEach((b, i) => { const r = b.getBoundingClientRect(); if (r.height < 44 || r.width < 44) malos.push(`botón ${i} ${Math.round(r.width)}×${Math.round(r.height)}`); if (r.right > caja.right + 1) malos.push(`botón ${i} se sale`); });
            d.querySelectorAll('.cap-info b').forEach((b, i) => { if (b.scrollWidth > b.clientWidth + 1) malos.push(`título ${i + 1} desborda`); });
            check(`Maqueta 375×812 (${idi.toUpperCase()}): nada se sale y botones ≥ 44 px`, !malos.length, malos.join('; '));
          } finally { f.remove(); }
        }
        if (aj) aj.idioma = 'es';
        // 6. Encadenar: el siguiente capítulo arranca (iframe a 375×812) y ve el progreso guardado aquí
        const sig = actual < 6 ? actual + 1 : actual - 1;
        if (opts.encadenar !== false) {
          fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
          fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:375px;height:812px;border:0;';
          fr.src = new URL(urlDe(sig), location.href).href; document.body.appendChild(fr);
          const ok = await h.hasta(() => { const x = fr.contentWindow; return x && x.AV && x.AV.pack === cap(sig).id && x.AV.temporada && x.AV.G; }, opts.timeout || 180000);
          check(`El capítulo ${sig} arranca con ?pack=${cap(sig).id}`, ok);
          if (ok) {
            const W = fr.contentWindow, T2 = W.AV.temporada, G2 = W.AV.G;
            G2.quiet = true; G2.guardado.suspender(true);
            const hud2 = (G2.pack.meta && G2.pack.meta.hud) || {};
            check(`Capítulo ${sig}: rótulo «Capítulo ${sig}»`, (G2.pack.meta.capitulo === sig) && (!hud2.capitulo || hud2.capitulo.startsWith('Capítulo ' + sig)), hud2.capitulo);
            check(`Capítulo ${sig}: ve terminados el ${actual} y el 4 (progreso común)`, T2.estado(actual) === 'terminado' && T2.estado(4) === 'terminado' && T2.decision(4).opcion === 'puente');
            T2.abrir();
            const d2 = W.document, it2 = [...d2.querySelectorAll('#capitulos-lista .cap-item')];
            check(`Capítulo ${sig}: la pantalla Capítulos marca el ${sig} como actual`, it2.length === 6 && it2[sig - 1].classList.contains('es-actual') && it2[actual - 1].dataset.estado === 'terminado');
            const de = d2.getElementById('capitulos').getBoundingClientRect();
            check(`Capítulo ${sig}: la pantalla Capítulos cabe a 375 px`, de.left >= -1 && de.right <= W.innerWidth + 1, `${de.left}…${de.right} de ${W.innerWidth}`);
            T2.cerrar();
            const e2 = (W.__aveErrores || []);
            check(`Capítulo ${sig}: sin errores de consola al arrancar`, !e2.length, e2.slice(0, 3).join(' | '));
          }
        }
        const nuevos = (window.__aveErrores || []).slice(errores0);
        check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally {
        if (fr) fr.remove();
        console.error = ce; navegar = nav0; cerrar();
        if (aj) aj.idioma = idioma0;
        try { if (pausa && pausa.matches(':popover-open')) pausa.hidePopover(); } catch (e) { /* sin popover */ }
        for (const k of claves) { try { if (antes[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, antes[k]); } catch (e) { /* sin almacén */ } }
        G.guardado.restaurar(snap); G.guardado.suspender(false); G.quiet = quiet0;
        if (fin) fin.hidden = fin0;
        if (finTxt) finTxt.textContent = finTxt0;
        if (portada && portada.open !== portada0) { portada.returnValue = ''; if (portada0) portada.show(); else portada.close(); }
        pintar(); pintarFin();
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    return { CAPS, actual, estado, terminar, decision, leer, urlDe, jugar, abrir, cerrar, pintar, test };
  }
})();
