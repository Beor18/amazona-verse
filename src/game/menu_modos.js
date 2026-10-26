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
    const MODOS = ['aventura', 'carreras', 'tormenta', 'banquete', 'libre', 'nido', 'records'];
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    const TX = () => ({
      titulo: L('¿Cómo quieres jugar?', 'How do you want to play?'), ultimo: L('Lo último que jugaste', 'Last played'),
      listo: L('¡A jugar!', 'Let’s play!'), cambiar: L('Cambiar de juego', 'Change game'),
      aventura: [L('Aventura', 'Adventure'), subAventura()],
      carreras: [L('Carreras', 'Races'), L('El Yunque, el río y tu fantasma', 'El Yunque, the river and your ghost')],
      tormenta: [L('¡Escapa de la tormenta!', 'Escape the storm!'), L('90 segundos sobre el mar', '90 seconds over the sea')],
      banquete: [L('¡Banquete!', 'Feast!'), L('Frutos en vuelo y combos', 'Fruit on the wing and combos')],
      libre: [L('Vuelo libre', 'Free flight'), L('Explora sin misiones', 'Explore with no missions')],
      nido: [L('Mi nido', 'My nest'), L('Tus huevos y crías', 'Your eggs and chicks')],
      records: [L('Mis récords', 'My records'), L('Medallas y tiempos', 'Medals and times')],
    });
    function subAventura() {
      const pasos = (G.misiones && G.misiones.steps) || [];
      if (!(S.profile && S.profile.created)) return L('Empezar la historia', 'Start the story');
      if (S.complete) return L('Capítulo 1 completado · seguir explorando', 'Chapter 1 complete · keep exploring');
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
        // Mis récords los abre boot.js con #b-records-title (records.js vuelve el foco a esa tarjeta al cerrar)
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
        check('Siete tarjetas, una por modo', ts.length === 7 && MODOS.every(m => ts.some(b => b.dataset.modo === m)), ts.map(b => b.dataset.modo).join(','));
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
        await elegir('libre');
        check('Vuelo libre: sin panel de misiones ni guía, y la partida sigue siendo la misma', !portada.open && raiz.classList.contains('modo-libre') && getComputedStyle($('quest')).display === 'none' && libre);
        G.emit('render'); check('Vuelo libre: la flecha de guía no se ve', G.fx && G.fx.guideBeam ? !G.fx.guideBeam.visible : true);
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
    return api;
  };
})();
