/* Juego · «¿Cómo quieres jugar?» (tarjetas de la portada, #modos en index.html; estilos en src/ui/menu_modos.css)
   Kelvin, tras jugar: «quizás podemos crear el tipo de juego antes de entrar». Al abrir el juego se elige cómo jugar y se va directo
   a la acción, en vez de caer siempre en la historia. Siete tarjetas (nada se rehace: cada una abre lo que ya existe):
     aventura  → la historia del capítulo 1 (continuar o empezar)            carreras → el menú de Retos (src/game/retos.js: El Yunque, el río, el fantasma)
     tormenta  → retos.jugar('tormenta')                                      banquete → retos.jugar('banquete') (src/game/banquete.js)
     libre     → el mundo sin el panel de misiones ni la flecha de guía       nido     → el criadero (src/game/criadero.js), encima del menú
     records   → Mis récords (src/game/records.js), encima del menú
   V18 (solo con la bandera; Kelvin 7 y 8-nov: lo divertido a la vista): golf → minigolf.js · duelo → combate.js · duelo2 → duelo2.js
     (sin táctil) · amigos → tarjeta encima del menú con Chispa, Moon y el Guardián (chispa.js, moon.js, guardian.js) · cotorras →
     descubrir.js + evolucion.js (nivel, XP, etapa, poder y las que faltan con su aviso de nuevas.js), encima · album → album.js, encima.
     Cada actividad lleva a Vittata a su sitio y empieza (lanzar18); desde otro capítulo abre el cap. 1 con ?mini=<modo>.
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
    const MODOS = ['aventura', 'golf', 'pesca', 'duelo', 'duelo2', 'amigos', 'cotorras', 'album', 'carreras', 'tormenta', 'banquete', 'flight', 'tren', 'river', 'maze', 'libre', 'nido', 'records'];
    // V18 (Kelvin 8-nov: «¿dónde está lo divertido?»): cada actividad de la V18 con su tarjeta. «Retos con amigos» abre una tarjeta con
    // las tres de los amigos (SUB); Mis cotorras, el Álbum y Retos con amigos se abren encima del menú, como Mi nido (ENCIMA).
    const SUB = ['chispa', 'moon', 'guardian'], ENCIMA = ['nido', 'records', 'cotorras', 'album', 'amigos'];
    const V18M = ['golf', 'duelo', 'duelo2', 'amigos', 'cotorras', 'chispa', 'moon', 'guardian'];
    // Expansión (solo con G.EXPANSION: ?expansion=1; apagada por defecto hasta que Kelvin apruebe las fotos): pesca → src/game/v18/pesca.js
    const EXP = ['pesca'];
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    const TX = () => ({
      titulo: L('¿Cómo quieres jugar?', 'How do you want to play?'), ultimo: L('Lo último que jugaste', 'Last played'),
      listo: L('¡A jugar!', 'Let’s play!'), cambiar: L('Cambiar de juego', 'Change game'),
      aventura: [L('Aventura', 'Adventure'), subAventura()],
      golf: [L('Minigolf', 'Mini golf'), L('Lleva la semilla gigante hasta el nido', 'Take the giant seed to the nest')], // V18 (Kelvin 7-nov: a la vista en el menú)
      pesca: [L('Pesca', 'Fishing'), L('Lanza, espera el pique y suelta el pez', 'Cast, wait for the bite and release the fish')], // expansión (src/game/v18/pesca.js)
      duelo: [L('Duelo', 'Duel'), L('Uno a uno contra la Campeona', 'One-on-one against the Champion')], // src/game/v18/combate.js
      duelo2: [L('Duelo de 2', '2-player duel'), L('Dos jugadores en la misma computadora', 'Two players on the same computer')], // src/game/v18/duelo2.js
      amigos: [L('Retos con amigos', 'Challenges with friends'), L('Chispa, Moon y el Guardián', 'Chispa, Moon and the Guardian')],
      cotorras: [L('Mis cotorras', 'My parrots'), L('Nivel, poder y las que faltan', 'Level, power and the ones to get')], // descubrir.js + evolucion.js
      album: [L('Álbum', 'Album'), L('Las 36 cotorras que vas viendo', 'The 36 parrots you spot')], // src/game/album.js
      chispa: [L('Carrera con Chispa', 'Race with Chispa'), L('Cuatro banderines y vuelta a la meta', 'Four flags and back to the finish')], // src/game/v18/chispa.js
      moon: [L('Entrenamiento con Moon', 'Training with Moon'), L('Esquiva las bolas de luz', 'Dodge the light orbs')], // src/game/v18/moon.js
      guardian: [L('Circuito del Primer Vuelo', 'First Flight Circuit'), L('Vuela por las 5 columnas de viento', 'Fly through the 5 wind columns')], // src/game/v18/guardian.js
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
      const nc = (P.meta && P.meta.capitulo) || 1; // que diga a qué capítulo entras (bug de Kelvin 4-nov)
      if (S.step > 0 || (S.events && S.events.length)) return L(`Continuar el capítulo ${nc} · paso `, `Continue chapter ${nc} · step `) + Math.min(S.step + 1, pasos.length || S.step + 1) + (pasos.length ? '/' + pasos.length : '');
      return L('Empezar la historia', 'Start the story');
    }

    // ---------- Memoria del menú (no es la partida) ----------
    const leer = () => { try { const d = JSON.parse(localStorage.getItem(ALMACEN) || 'null'); return d && d.v === 1 ? d : { v: 1 }; } catch (e) { return { v: 1 }; } };
    const guardar = o => { try { localStorage.setItem(ALMACEN, JSON.stringify(Object.assign(leer(), o))); } catch (e) { /* sin almacén */ } };
    const ultimo = () => { const u = leer().ultimo; return MODOS.includes(u) ? u : SUB.includes(u) ? 'amigos' : null; };
    G.on('nuevoEstudiante', () => { try { localStorage.removeItem(ALMACEN); } catch (e) { /* sin almacén */ } });

    // ---------- Apertura del capítulo aplazada (primera vez sin Aventura) ----------
    let inicioReal = P.inicio, aplazar = false, aplazaN = 0;
    // ?mini=<modo> pendiente (más abajo): si en la portada se elige una actividad, el ?mini= ya no arranca (ni encima de ella ni al terminarla)
    let miniPend = null;
    if (typeof inicioReal === 'function') P.inicio = function (g) { if (aplazar) { aplazar = false; guardar({ intro: 1 }); return undefined; } return inicioReal(g); };
    function introPendiente() { return leer().intro === 1 && S.profile && S.profile.created && S.step === 0 && !S.complete; }

    // ---------- Vuelo libre: sin panel de misiones ni flecha de guía (el mundo, la bandada, los frutos y los hallazgos siguen) ----------
    let libre = false;
    G.on('render', () => { if (libre && G.fx && G.fx.guide) G.fx.guide(null, 0); }, 61); // después del gancho de misiones (60)
    function entrarLibre() { libre = true; raiz.classList.add('modo-libre'); }
    function salirLibre() { if (!libre) return; libre = false; raiz.classList.remove('modo-libre'); }

    // ---------- Pintar el menú ----------
    function tarjetas() { return form ? [...form.querySelectorAll('[data-modo]')] : []; }
    const tactil = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    // Las de la V18 solo con la bandera encendida; el Duelo de 2 necesita teclado (duelo2.js no se carga en táctil)
    const seVe = m => (EXP.includes(m) ? !!G.EXPANSION : !V18M.includes(m) || (!!G.V18 && (m !== 'duelo2' || !tactil())));
    function mostrar() {
      if (!form) return;
      const T = TX(), u = ultimo();
      const t = $('modos-t'); if (t) t.textContent = T.titulo;
      const bm = $('b-menu-modos'); if (bm) bm.textContent = T.cambiar;
      tarjetas().forEach((b, i) => {
        const m = b.dataset.modo, tx = T[m]; if (!tx) return;
        if (V18M.includes(m) || EXP.includes(m)) { const ve = seVe(m); b.hidden = !ve; b.style.display = ve ? '' : 'none'; }
        const bb = b.querySelector('b'), sm = b.querySelector('small');
        if (bb) bb.textContent = tx[0]; if (sm) sm.textContent = tx[1];
        b.style.setProperty('--i', i);
        const es = m === u; b.classList.toggle('es-ultimo', es);
        let chapa = b.querySelector('.modo-ultimo');
        if (es && !chapa) { chapa = document.createElement('span'); chapa.className = 'modo-ultimo'; b.prepend(chapa); }
        if (chapa) { chapa.textContent = T.ultimo; chapa.hidden = !es; }
        b.setAttribute('aria-label', tx[0] + '. ' + tx[1] + (es ? '. ' + T.ultimo : ''));
      });
      const foco = tarjetas().find(b => b.dataset.modo === u && !b.hidden) || tarjetas()[0];
      if (foco && portada && portada.open) setTimeout(() => { if (portada.open && !portada.inert) foco.focus({ preventScroll: true }); }, 0);
    }
    function recordar(modo) { guardar({ ultimo: modo }); }

    // ---------- Abrir cada modo ----------
    let pendiente = null, lanzando = null;
    const listo = () => Promise.resolve(G.mundo && G.mundo.listo).catch(() => {});
    const toast = txt => { if (!G.quiet) G.ui.toast(txt, 3000); };
    const fallo = () => toast(L('No se pudo abrir. Prueba otra vez.', 'It could not open. Try again.'));
    // ---------- V18: llevar a Vittata a su actividad y empezarla (el patrón del minigolf: irYJugar) ----------
    // Solo con la V18 encendida y sin otra actividad V18 en marcha. Son del cap. 1: desde otro capítulo se abre el cap. 1 con
    // ?mini=<modo> (sin ?pack) y allí arranca al cerrarse la portada. La apertura del cap. 1 queda pendiente para Aventura: si
    // asoma mientras dura la actividad, se corta.
    const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const API18 = { golf: 'v18minigolf', pesca: 'v18pesca', duelo: 'v18combate', duelo2: 'v18duelo2', chispa: 'v18chispa', moon: 'v18moon', guardian: 'v18guardian' };
    const CARGA18 = { golf: 'golf', pesca: 'pesca', duelo: 'combate', duelo2: 'duelo2', chispa: 'chispa', moon: 'moon', guardian: 'guardian', cotorras: 'cotorras' };
    const api18 = m => { const a = G[API18[m]]; return a && !a.diferido ? a : null; };
    const fase18 = a => { try { return (a && !a.diferido && a.estado && a.estado().fase) || 'nada'; } catch (e) { return 'nada'; } };
    const QUIETA = ['nada', 'disuelve', 'deshace', 'despierta'];
    function ocupado18() {
      return [G.v18combate, G.v18amenaza, G.v18serpiente, G.v18sapo, G.v18duelo2, G.v18minigolf, G.v18pesca, G.v18chispa, G.v18moon, G.v18guardian].some(a => !QUIETA.includes(fase18(a)));
    }
    function tarjeta2Abierta() { const c = $('card'); return !!(c && !c.hidden && c.querySelector('.v18-d2')); }
    function enMarcha18(m) { return !QUIETA.includes(fase18(api18(m))) || (m === 'duelo2' && tarjeta2Abierta()); }
    function cargar18(m) { const f = cargar.v18 && cargar.v18[CARGA18[m]]; return f ? Promise.resolve(f()).catch(e => { console.warn('menu_modos: carga V18 ' + m, e); }) : Promise.resolve(); }
    function llevar(x, z, mx, mz) {
      const F = G.fisica, M = F && F.MOVE;
      if (M && M.flying && F.endFlight) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
      S.pos.x = x; S.pos.z = z; S.pos.y = G.terreno.height(x, z) + 0.05; S.vy = 0;
      if (M) { M.vx = M.vz = 0; M.swimming = false; }
      if (mx != null) {
        const dx = mx - x, dz = mz - z, d = Math.hypot(dx, dz) || 1;
        S.facing = { x: dx / d, z: dz / d }; if (G.camara) G.camara.yaw = Math.atan2(-dx / d, -dz / d);
      }
      try { if (G.camara && G.camara.place) G.camara.place(true); } catch (e) { /* cámara */ }
    }
    const IR18 = {
      golf: a => a.irYJugar(),
      pesca: a => a.irYJugar(), // pesca.js lleva a Vittata al final del muelle de Villa Raíz
      duelo: a => a.iniciar({}), // combate.js coloca a Vittata y a la Campeona en la explanada
      duelo2: a => { if (!a.disponible()) return false; const s = G.v18combate && G.v18combate.sitio; if (s) llevar(s.x - 5, s.z, s.x, s.z); return a.abrirTarjeta(); },
      chispa: a => { const s = a.SITIO.salida; llevar(s.x, s.z, a.RUTA[0].x, a.RUTA[0].z); return a.empezar(); },
      moon: a => { const s = a.SITIO; llevar(s.x + Math.sin(s.rotY) * 6, s.z + Math.cos(s.rotY) * 6, s.x, s.z); return a.empezar(); }, // delante de Moon, mirándola
      guardian: a => { const s = a.SITIO.salida; llevar(s.x, s.z, a.RUTA[0].x, a.RUTA[0].z); return a.empezar(); }
    };
    const sinApertura = () => {
      const fade = document.getElementById('c1-fade'), saltar = document.getElementById('c1-saltar');
      if (!fade && !saltar) return;
      try { if (G.c && G.c.apertura) G.c.apertura.fin(); } catch (e) { /* sin apertura */ }
      try { if (G.dialogo && G.dialogo.cancelarLibre) G.dialogo.cancelarLibre(); } catch (e) { /* sin bocadillos */ }
      if (saltar) saltar.remove(); /* historia.js suelta su tecla al ver que el botón ya no está */
      guardar({ intro: 1 });
    };
    function alCap1(modo) {
      apuntarCapitulo('cap1');
      try { const u = new URL(location.href); u.searchParams.delete('pack'); u.searchParams.set('mini', modo); location.href = u.toString(); } catch (e) { /* sin URL */ }
    }
    function salir18() {
      for (const m of ['golf', 'pesca', 'duelo', 'duelo2']) { const a = api18(m); if (a && !QUIETA.includes(fase18(a))) { try { a.salir(); } catch (e) { /* ya fuera */ } } }
      for (const m of SUB) { const a = api18(m); if (a && !QUIETA.includes(fase18(a))) { try { a.cancelar('sale'); } catch (e) { /* ya fuera */ } } }
      const c = $('card'); if (G.ui.cardOpen && c && (tarjeta2Abierta() || c.classList.contains('mm-encima'))) G.ui.hideCard();
    }
    function lanzar18(modo) {
      if (!(EXP.includes(modo) ? G.EXPANSION : G.V18)) return Promise.resolve(false);
      if (P.id !== 'cap1') { alCap1(modo); return Promise.resolve(true); }
      return listo().then(() => cargar18(modo)).then(() => new Promise(res => {
        let n = 0, vigila = 0, carga = 0;
        const guardia = () => { sinApertura(); if (++vigila < 120 && enMarcha18(modo)) setTimeout(guardia, 500); };
        const t = () => {
          sinApertura();
          // du2 (8-nov): con partida nueva la actividad (el duelo y su cuenta atrás) arrancaba debajo de la pantalla de carga y
          // se quedaba congelada en «3»; además el sitio definitivo del duelo aún no estaba. Se espera a que la carga termine.
          if (((G.carga && G.carga.activa) || G.cargaPendiente) && ++carga < 120) { setTimeout(t, 500); return; }
          const a = api18(modo);
          if (a && enMarcha18(modo)) { guardia(); return res(true); } // ya estaba en marcha (?mini= o un toque anterior)
          let ok = false;
          if (a && !ocupado18()) {
            try { if (G.dialogo && G.dialogo.cancelarLibre) G.dialogo.cancelarLibre(); } catch (e) { /* sin bocadillos */ } /* el bocadillo de otro sitio (p. ej. la invitación de Chispa al dejar su carrera) no viaja con Vittata */
            try { ok = !!IR18[modo](a); } catch (e) { console.warn('menu_modos: ' + modo, e); }
          }
          if (ok) { guardia(); return res(true); }
          if (++n < 60) setTimeout(t, 500); else res(false);
        };
        t();
      }));
    }
    // ---------- Encima del menú: Mis cotorras, Álbum y Retos con amigos (tarjeta #card por encima de la portada) ----------
    // ui.js deja #card inerte mientras la portada está abierta: aquí la tarjeta se activa y la portada queda inerte detrás (como records.js)
    let origen = null, portadaInerte = false;
    function encima(html) {
      G.ui.showCard(html); marcarEncima();
    }
    function marcarEncima() {
      const c = $('card'); if (!c || !portada || !portada.open) return;
      c.classList.add('mm-encima'); c.inert = false;
      if (!portada.inert) { origen = document.activeElement; portada.inert = true; portadaInerte = true; }
      c.scrollTop = 0; c.tabIndex = -1;
      // ui.js vuelve a poner #card inerte al reabrirse la portada (MutationObserver, después de este código si se reabrió justo antes)
      Promise.resolve().then(() => { if (c.classList.contains('mm-encima')) c.inert = false; });
      setTimeout(() => { if (!c.hidden && c.classList.contains('mm-encima')) { c.inert = false; c.focus({ preventScroll: true }); c.scrollTop = 0; } }, 0);
    }
    G.on('cardHidden', () => {
      const c = $('card'); if (!c || !c.classList.contains('mm-encima')) return;
      c.classList.remove('mm-encima');
      if (portadaInerte) { portada.inert = false; portadaInerte = false; }
      c.inert = !!(portada && portada.open);
      const o = origen; origen = null;
      if (o && portada && portada.open && document.contains(o)) setTimeout(() => { try { o.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
    });
    const CANDADO = '<svg class="mm-candado" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2.4" fill="none"/></svg>';
    // El aviso con el que llega cada una (nuevas.js, descubrir.js), sin «Elígela en Pausa…»; en EN, su traducción de content/cap1/en.js
    function comoLlega(p) {
      if (!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en') || !(G.idioma && G.idioma.tr)) return p.txt;
      const en = G.idioma.tr(p.aviso);
      if (en === p.aviso) return p.txt;
      return en.replace(/\s*(Pick|Find) (her|him|it) in Pause → My parrots\.\s*$/, '');
    }
    function abrirCotorras() {
      if (!G.V18) return Promise.resolve(false);
      if (P.id !== 'cap1') { alCap1('cotorras'); return Promise.resolve(true); }
      return listo().then(() => cargar18('cotorras')).then(() => {
        const D = G.v18descubrir; if (!D || !D.abrirSeleccion) return false;
        const ids = D.abrirSeleccion(), c = $('card'), E = G.v18evo;
        const h2 = c.querySelector('h2'); if (h2) { h2.textContent = TX().cotorras[0]; h2.setAttribute('data-no-tr', ''); } /* desde el menú es la colección, no solo «con qué cotorra juegas el duelo» */
        if (E && E.info) c.querySelectorAll('[data-v18sp]').forEach(b => {
          try { const r = E.info(b.dataset.v18sp); if (r && isFinite(r.xp)) b.insertAdjacentHTML('beforeend', `<small class="mm-xp" data-no-tr>XP ${Math.round(r.xp)}</small>`); } catch (e) { /* sin evolución */ }
        });
        const N = G.v18nuevas, pend = N && N.pendientes ? N.pendientes() : [];
        if (D.ID && !ids.includes(D.ID) && D.TXT && D.TXT.pistaInicio) pend.splice(pend.findIndex(p => p.album) < 0 ? pend.length : pend.findIndex(p => p.album), 0, { id: D.ID, txt: D.TXT.pistaInicio, aviso: D.TXT.pistaInicio });
        if (pend.length) {
          const filas = pend.map(p => `<li data-v18falta="${esc(p.id)}">${CANDADO}<span>${esc(comoLlega(p))}</span></li>`).join('');
          const html = `<details class="mm-faltan" data-no-tr${ids.length < 2 ? ' open' : ''}><summary>${esc(L('Por conseguir', 'Still to get'))} (${pend.length})</summary>` +
            `<p class="note">${esc(L('Así llegan a tu bandada:', 'This is how they join your flock:'))}</p><ul>${filas}</ul></details>`;
          const filaOk = c.querySelector('#v18-elegir-ok'); const fila = filaOk && filaOk.closest('.row');
          if (fila) fila.insertAdjacentHTML('beforebegin', html); else c.insertAdjacentHTML('beforeend', html);
        }
        marcarEncima();
        return true;
      });
    }
    function abrirAlbum() {
      if (P.id !== 'cap1') { alCap1('album'); return Promise.resolve(true); }
      const A = G.album, h = A && A.html ? A.html() : '';
      if (!h) return Promise.resolve(false);
      encima(`<div class="mm-album" data-no-tr><h2>${esc(L('Álbum', 'Album'))}</h2>${h}<div class="row"><button class="btn" type="button" id="mm-album-ok">${esc(L('Cerrar', 'Close'))}</button></div></div>`);
      const ok = $('mm-album-ok'); if (ok) ok.onclick = () => G.ui.hideCard();
      return Promise.resolve(true);
    }
    function abrirAmigos() {
      if (!G.V18) return Promise.resolve(false);
      const T = TX();
      const bots = SUB.map(m => `<button class="btn mm-amigo" type="button" data-amigo="${m}">${ICONOS[m]}<b>${esc(T[m][0])}</b><small>${esc(T[m][1])}</small></button>`).join('');
      encima(`<div class="mm-amigos" data-no-tr><h2>${esc(T.amigos[0])}</h2><div class="mm-amigos-grid">${bots}</div><div class="row"><button class="btn ghost" type="button" id="mm-amigos-no">${esc(L('Cerrar', 'Close'))}</button></div></div>`);
      const c = $('card');
      c.querySelectorAll('[data-amigo]').forEach(b => { b.onclick = () => { const m = b.dataset.amigo; G.ui.hideCard(); elegir(m); }; });
      const no = $('mm-amigos-no'); if (no) no.onclick = () => G.ui.hideCard();
      return Promise.resolve(true);
    }
    const ICONOS = {
      chispa: '<svg class="modo-img" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 50q24-8 48 0" stroke="var(--wood)" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M14 22h2v28h-2z" fill="var(--ink)"/><path d="M16 22l12 4-12 4z" fill="var(--crest)"/><path d="M46 22h2v26h-2z" fill="var(--ink)"/><path d="M48 22l12 4-12 4z" fill="var(--sky)"/><path d="M34 6l-9 18h7l-4 16 13-20h-7l5-14z" fill="var(--gold)"/></svg>',
      moon: '<svg class="modo-img" viewBox="0 0 64 64" aria-hidden="true"><path d="M40 6a20 20 0 1 0 18 30A16 16 0 1 1 40 6z" fill="var(--parchment)"/><circle cx="14" cy="16" r="5" fill="#fff6c8" opacity=".9"/><circle cx="24" cy="44" r="4" fill="#fff6c8" opacity=".8"/><circle cx="12" cy="52" r="3" fill="#fff6c8" opacity=".7"/><circle cx="44" cy="50" r="7" fill="var(--leaf)"/><path d="M42 45q2-5 7-3-2 3-7 3z" fill="var(--crest)"/><path d="M49 49l5 1.5-5 1.5z" fill="var(--beak)"/></svg>',
      guardian: '<svg class="modo-img" viewBox="0 0 64 64" aria-hidden="true"><path d="M12 58V30" stroke="#5ac8fa" stroke-width="6" stroke-linecap="round" opacity=".75"/><path d="M28 58V18" stroke="var(--gold)" stroke-width="6" stroke-linecap="round" opacity=".8"/><path d="M44 58V28" stroke="#7ee08a" stroke-width="6" stroke-linecap="round" opacity=".8"/><path d="M6 24q10-14 22-6t22-6" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="54" cy="14" r="6" fill="var(--leaf)"/><path d="M57 13l5 1.5-5 1.5z" fill="var(--beak)"/></svg>'
    };

    // ---------- Abierto desde el menú: al salir del modo (su «Salir» o el botón de salir del final) se vuelve al menú ----------
    // lanzar y lanzar18 marcan el modo (desdeMenu); volver() quita la marca. Cada modo la lee con G.menuModos.desdeMenu() al pintar
    // su final, para que el botón de salir diga «Volver al menú» (y no «Volver a la historia»). Abierto desde el mundo (estación del minigolf, retos
    // del mapa) no hay marca y se vuelve al mundo como siempre. Se vigila el estado del modo, no sus botones: vale cualquier salida.
    let desdeMenu = null, vigiaMenu = 0;
    const SIGUE = {
      flight: () => document.body.classList.contains('flight-on'),
      river: () => document.body.classList.contains('river-on'),
      tren: () => document.body.classList.contains('tren-on'),
      maze: () => document.body.classList.contains('maze-on'),
      carreras: () => !!(G.retosApi && G.retosApi.activo) || document.body.classList.contains('retos-on'),
      tormenta: () => !!(G.retosApi && G.retosApi.activo) || document.body.classList.contains('retos-on'),
      banquete: () => !!(G.retosApi && G.retosApi.activo) || document.body.classList.contains('retos-on')
    };
    const sigueEn = m => (SIGUE[m] ? SIGUE[m]() : API18[m] ? enMarcha18(m) : false);
    function marcarMenu(modo, p) {
      clearInterval(vigiaMenu); vigiaMenu = 0;
      desdeMenu = SIGUE[modo] || API18[modo] ? modo : null;
      if (!desdeMenu) return;
      const a0 = api18(modo), ultimo0 = a0 && a0.estado ? a0.estado().ultimo : undefined;
      let visto = false, n = 0;
      if (p) p.then(ok => { if (ok !== false && desdeMenu === modo && sigueEn(modo)) visto = true; }, () => {}); /* una salida antes del primer vistazo también cuenta */
      vigiaMenu = setInterval(() => {
        if (desdeMenu !== modo || (portada && portada.open)) { clearInterval(vigiaMenu); vigiaMenu = 0; if (desdeMenu === modo) desdeMenu = null; return; }
        if (sigueEn(modo)) { visto = true; return; }
        if (!visto) { if (++n > 150) { clearInterval(vigiaMenu); vigiaMenu = 0; desdeMenu = null; } return; }
        clearInterval(vigiaMenu); vigiaMenu = 0;
        const a = api18(modo), conFinal = !!(a && a.estado && a.estado().ultimo !== ultimo0);
        /* Chispa, Moon y el Guardián terminan sin panel (aviso y bocadillo): se deja verlo antes de volver */
        const ir = espera => { if (desdeMenu !== modo || (portada && portada.open) || (espera && ocupado18())) { if (desdeMenu === modo) desdeMenu = null; return; } volver(); };
        if (conFinal && !G.quiet) setTimeout(() => ir(true), 3500); else ir(false);
      }, 400);
    }
    function lanzar(modo) {
      if (modo !== 'libre') salirLibre();
      if (!ENCIMA.includes(modo) && (SIGUE[modo] || API18[modo])) desdeMenu = modo; /* ya marcado al pintar el modo (el menú de Carreras dice «Volver al menú») */
      let p;
      if (modo === 'aventura') {
        aplazar = false;
        if (introPendiente() && typeof inicioReal === 'function') { guardar({ intro: 0 }); setTimeout(() => { if (!G.dialogo.open()) inicioReal(G); }, 300); }
        p = Promise.resolve(true);
      } else if ((V18M.includes(modo) || EXP.includes(modo)) && API18[modo]) p = lanzar18(modo); // golf, pesca, duelo, duelo2, chispa, moon, guardian
      else if (modo === 'cotorras') p = abrirCotorras();
      else if (modo === 'album') p = abrirAlbum();
      else if (modo === 'amigos') p = abrirAmigos();
      else if (modo === 'carreras') p = listo().then(() => cargar.retos()).then(r => r.abrir());
      else if (modo === 'tormenta' || modo === 'banquete') p = listo().then(() => cargar.retos()).then(r => r.jugar(modo));
      else if (modo === 'flight') p = listo().then(() => (window.AV && window.AV.flight ? window.AV.flight() : false));
      else if (modo === 'tren') p = listo().then(() => (window.AV && window.AV.tren ? window.AV.tren() : false)); // El tren de Vittata (src/game/tren.js, C16)
      else if (modo === 'river') p = listo().then(() => (window.AV && window.AV.riverRush ? window.AV.riverRush() : false));
      else if (modo === 'maze') p = listo().then(() => (window.AV && window.AV.maze ? window.AV.maze() : false)); // Amazona Maze (src/game/maze.js, BI2)
      else if (modo === 'libre') { entrarLibre(); p = Promise.resolve(true); }
      else if (modo === 'nido') p = G.criadero && G.criadero.abrir ? G.criadero.abrir() : Promise.resolve(false);
      else if (modo === 'records') p = cargar.records().then(r => r.abrir({ desde: 'portada' }));
      else p = Promise.resolve(false);
      if (!ENCIMA.includes(modo)) marcarMenu(modo, p);
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
        // con otro modo la apertura se aplaza; carga.js puede retrasar pack.inicio hasta que se destapa el mundo (más de 1,5 s en
        // un equipo lento: la apertura salía encima del minigolf y del duelo), así que la marca dura hasta 2 min o hasta Aventura
        const n = ++aplazaN; guardar({ intro: 1 }); aplazar = true; setTimeout(() => { if (aplazaN === n) aplazar = false; }, 120000);
        lanzar(modo);
      }).observe(creador, { attributes: true, attributeFilter: ['hidden'] });
    }
    // nido y records se abren encima del menú (la portada sigue abierta); el resto cierra la portada primero
    function elegir(modo) {
      if (!MODOS.includes(modo) && !SUB.includes(modo)) return Promise.resolve(false);
      if (miniPend && !ENCIMA.includes(modo)) miniPend = null;
      if (ENCIMA.includes(modo)) return lanzar(modo); // encima del menú; no cuentan como «lo último que jugaste»
      recordar(modo);
      if (modo === 'aventura' && !G.quiet) apuntarCapitulo(P.id); // al volver a entrar se abre este capítulo (boot.js)
      const primera = !(S.profile && S.profile.created);
      if (primera) pendiente = modo; // antes de cerrar: el evento close no debe tomarlo por un cierre sin valor
      if (portada && portada.open) { portada.returnValue = ''; portada.close(); }
      if (primera) { prepararCreador(); return Promise.resolve(true); }
      return lanzar(modo);
    }
    // Volver al menú desde el juego (pausa → «Cambiar de juego»)
    function volver() {
      desdeMenu = null; clearInterval(vigiaMenu); vigiaMenu = 0;
      const r = G.retosApi; if (r) { try { r.salir(); } catch (e) { /* ya fuera */ } }
      const fv = G.flightApi; if (fv) { try { fv.salir(); } catch (e) { /* ya fuera */ } }
      const tv = G.trenApi; if (tv) { try { tv.salir(); } catch (e) { /* ya fuera */ } } // src/game/tren.js (C16)
      const rv = G.riverRushApi; if (rv) { try { rv.salir(); } catch (e) { /* ya fuera */ } }
      const mz = G.mazeApi; if (mz) { try { mz.salir(); } catch (e) { /* ya fuera */ } } // src/game/maze.js (BI2)
      if (G.criadero && G.criadero.abierto && G.criadero.abierto()) G.criadero.cerrar();
      salir18();
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
        if (MODOS.includes(v) || SUB.includes(v)) { elegir(v); return; }
        if (pendiente == null && !(S.profile && S.profile.created)) { pendiente = 'aventura'; prepararCreador(); } // cierre sin valor y sin cotorra: la historia
      });
      // Si se tocó una tarjeta antes de que cargara este archivo, el dialog ya está cerrado con su valor
      if (!portada.open && MODOS.includes(portada.returnValue)) setTimeout(() => { const v = portada.returnValue; portada.returnValue = ''; elegir(v); }, 0);
    }
    if (form) {
      form.addEventListener('click', e => {
        const b = e.target.closest('[data-modo]'); if (!b) return;
        if (!G.quiet && G.audio && G.audio.play) try { G.audio.play('pickup', 2); } catch (e2) { /* sin audio */ }
        if (b.type === 'button' && ENCIMA.includes(b.dataset.modo)) elegir(b.dataset.modo); // records: la tarjeta es #b-records-menu; #b-records-title es su etiqueta <b> (records.js la traduce con textContent)
      });
      form.addEventListener('keydown', e => {
        if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
        const ts = tarjetas().filter(b => !b.hidden), i = ts.indexOf(document.activeElement); if (i < 0) return;
        const cols = Math.max(1, Math.round(form.querySelector('.modos-grid').clientWidth / ts[0].offsetWidth));
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? cols : -cols;
        const j = i + d; if (j < 0 || j >= ts.length) return;
        e.preventDefault(); ts[j].focus();
      });
    }
    const bm = $('b-menu-modos'); if (bm) bm.addEventListener('click', volver);
    G.on('apply', () => { if (portada && portada.open) mostrar(); }, 90);
    // Al cambiar el idioma en Opciones (portada cerrada), «Cambiar de juego» del menú de pausa y las tarjetas se quedaban en el idioma anterior
    G.on('aula', k => { if (k === 'idioma') mostrar(); });
    mostrar();
    // ?mini=<modo> (alCap1, desde otro capítulo): la actividad arranca cuando se cierra la portada, como ?mini=golf (minigolf.js);
    // Mis cotorras y el Álbum se abren encima del menú en cuanto el mundo está listo
    {
      const q = /[?&]mini=(duelo2|duelo|cotorras|album|chispa|moon|guardian)\b/.exec(location.search), m = q && q[1];
      if (m && P.id === 'cap1' && (G.V18 || m === 'album')) {
        let n = 0; miniPend = m;
        // Libre: sin creador, tarjeta, diálogo ni otra actividad en marcha (los minijuegos ponen G.ui.busy; las de la V18, ocupado18)
        const libreYa = () => !(creador && !creador.hidden) && !G.ui.cardOpen && !(G.dialogo && G.dialogo.open && G.dialogo.open()) && !(G.ui.busy && G.ui.busy()) && !ocupado18();
        if (m === 'cotorras' || m === 'album') {
          const ir = () => { if (miniPend !== m) return; if (libreYa() || (portada && portada.open && !G.ui.cardOpen)) { lanzar(m); return; } if (++n < 60) setTimeout(ir, 1000); };
          listo().then(() => setTimeout(ir, 1500));
        } else {
          const probar = () => { if (miniPend !== m) return; if (!(portada && portada.open) && libreYa()) { miniPend = null; if (!enMarcha18(m)) marcarMenu(m, lanzar18(m)); return; } if (++n < 180) setTimeout(probar, 1000); }; /* espera a que se cierre la portada */
          setTimeout(probar, 1500);
        }
      }
    }

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
      // con la CPU cargada (GPU por software, varias pruebas a la vez) el load pasaba de 4 s y se medía la portada sin estilos (página
      // de 550 px, todo «se sale»): se espera el load más tiempo y a que cada hoja de estilo del iframe esté aplicada
      await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 15000); });
      const d = f.contentDocument;
      await hasta(() => [...d.querySelectorAll('link[rel="stylesheet"]')].every(l => !!l.sheet), 8000);
      try { await Promise.race([d.fonts.ready, espera(2500)]); } catch (e) { /* sin fuentes */ }
      return { d, cerrar: () => f.remove() };
    }
    async function test() {
      const out = [], errores = [];
      const check = (n, ok, det) => { out.push({ name: n, ok: !!ok, detail: ok ? undefined : det, extra: ok ? undefined : det }); if (!ok) console.warn('menuModosTest ✗', n, det || ''); };
      const ce = console.error; console.error = (...a) => { errores.push(a.map(String).join(' ')); ce.apply(console, a); };
      const errores0 = (window.__aveErrores || []).length;
      const quiet0 = G.quiet; G.quiet = true;
      const snap = G.guardado.instantanea(); G.guardado.suspender(true);
      const menu0 = (() => { try { return localStorage.getItem(ALMACEN); } catch (e) { return null; } })();
      const abierta0 = !!portada.open, libre0 = libre, inicio0 = inicioReal;
      // Tras selfTest en un perfil limpio queda el creador abierto y sin cotorra: sin una, elegir() abriría el creador en vez del modo (QA-82).
      // Se crea una cotorra de prueba (la partida real se restaura al final con la instantánea) y se reabre el creador si estaba abierto.
      const creador0 = !!(creador && !creador.hidden);
      if (!(S.profile && S.profile.created) && G.creador) {
        try { G.creador.saveCharacter({ name: G.creador.nombreAzar(), look: G.creador.profileLook(S.profile) }); await espera(50); } catch (e) { /* lo avisa la primera comprobación */ }
      }
      let llamadas = 0; inicioReal = () => { llamadas++; };
      let retos = null;
      try {
        // 1. Markup y contrato de la portada (config.json preparar_js y e2e.js tocan el primer botón del formulario)
        const ts = tarjetas();
        check('Una tarjeta por modo (con Amazona Flight, el tren, River Rush, Amazona Maze y las de la V18)', ts.length === MODOS.length && ['tren', 'river', 'maze', 'golf', 'duelo', 'duelo2', 'amigos', 'cotorras', 'album'].every(m => !!form.querySelector(`[data-modo="${m}"]`)) && form.querySelector('[data-modo="flight"] b').textContent === 'Amazona Flight' && MODOS.every(m => ts.some(b => b.dataset.modo === m)), ts.map(b => b.dataset.modo).join(','));
        const primero = form.querySelector('button');
        check('La primera tarjeta es Aventura y es submit del form method=dialog', primero && primero.dataset.modo === 'aventura' && primero.type === 'submit' && form.method === 'dialog');
        check('Nido, récords, Mis cotorras, Álbum y Retos con amigos no cierran la portada (type=button)', ENCIMA.every(m => form.querySelector(`[data-modo="${m}"]`).type === 'button'));
        check('Las tarjetas de la V18 se ven con la bandera encendida y se ocultan sin ella', ['golf', 'duelo', 'amigos', 'cotorras'].every(m => form.querySelector(`[data-modo="${m}"]`).hidden === !G.V18));
        check('Textos en ES', $('modos-t').textContent === '¿Cómo quieres jugar?' && form.querySelector('[data-modo="libre"] b').textContent === 'Vuelo libre', '«' + $('modos-t').textContent + '» / «' + form.querySelector('[data-modo="libre"] b').textContent + '»');
        // 2. Cada tarjeta abre su modo y «Cambiar de juego» vuelve al menú
        retos = await cargar.retos(); retos.pruebas.prueba(true);
        if (!portada.open) volver();
        check('El menú se muestra (portada abierta, mundo en pausa)', portada.open && G.pausa.activa());
        await elegir('tormenta');
        check('Tormenta: la portada se cierra y el reto arranca', !portada.open && retos.activo && retos.reto === 'tormenta', 'portada ' + portada.open + ', activo ' + retos.activo + ', reto ' + retos.reto + ', creador ' + !$('creator').hidden);
        check('Vuelve al menú y sale del reto', volver() && portada.open && !retos.activo && !document.body.classList.contains('retos-on'));
        await elegir('carreras');
        check('Carreras: abre el menú de Retos', !portada.open && retos.fase === 'menu' && !retos.pruebas.ui().menu.hidden, 'portada ' + portada.open + ', fase ' + retos.fase + ', creador ' + !$('creator').hidden);
        volver(); check('Vuelve al menú desde el menú de Retos', portada.open && retos.pruebas.ui().el.hidden);
        await elegir('banquete');
        const okB = await hasta(() => retos.activo && retos.reto === 'banquete', 15000);
        check('Banquete: el reto arranca (carga perezosa)', okB && !portada.open, retos.reto);
        volver(); check('Vuelve al menú desde el banquete', portada.open && !retos.activo);
        await elegir('flight');
        const okF = await hasta(() => G.flightApi && G.flightApi._dev.st.activo, 15000);
        check('Amazona Flight: la tarjeta abre el vuelo y cierra la portada', okF && !portada.open, 'okF ' + okF + ', flight ' + typeof (window.AV && window.AV.flight) + ', api ' + typeof G.flightApi + ', mundo.listo ' + String(G.mundo && G.mundo.listo));
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
        // Humo iPhone: el «Salir» de cada modo (y el del final) vuelve al menú si se entró desde él; desde el mundo se queda en el mundo
        const cerrarPortada = () => { if (portada.open) { portada.returnValue = ''; portada.close(); } };
        const SALIDAS = [
          ['flight', 'Amazona Flight', () => window.AV.flight(), () => G.flightApi.salir(), () => !!(G.flightApi && G.flightApi.activo)],
          ['river', 'River Rush', () => window.AV.riverRush(), () => G.riverRushApi.salir(), () => !!(G.riverRushApi && G.riverRushApi.activo)],
          ['tren', 'el tren', () => window.AV.tren(), () => G.trenApi.salir(), () => !!(G.trenApi && G.trenApi.activo)],
          ['maze', 'Amazona Maze', () => window.AV.maze(), () => G.mazeApi.salir(), () => !!(G.mazeApi && G.mazeApi.activo)],
          ['tormenta', 'Tormenta', () => retos.jugar('tormenta'), () => retos.salir(), () => retos.activo && retos.reto === 'tormenta'],
          ['carreras', 'Carreras', () => retos.abrir(), () => retos.salir(), () => retos.fase === 'menu' && !retos.pruebas.ui().el.hidden]
        ];
        // El botón de salir del final dice «Volver al menú» si se entró desde el menú, y como siempre si se entró desde el mundo
        const CLAVE_RET = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.retos';
        const textoEs = (el, s) => !!el && [s, G.idioma && G.idioma.tr ? G.idioma.tr(s) : s].includes(el.textContent.trim());
        let finInfo = '';
        async function finFlight(s) {
          const fa = G.flightApi, d = fa && fa._dev; if (!d) return false;
          let rec0 = null; try { rec0 = localStorage.getItem(CLAVE_RET); } catch (e) { /* sin almacén */ }
          // 12 s y no 3: el choque emite retosResultado (XP, foto del momento) y en la nube el hilo se para segundos (QA-220); con 3 s
          // la espera vencía antes de que saltara el temporizador de 350 ms de resultados() y se leía el texto viejo del botón (QA-223b)
          d.vaciar(); d.st.fase = 'juego'; d.J.dist = 30; d.J.y = fa.P.yMin - 0.1; d.J.vy = -1; d.paso(1 / 60);
          const t0 = performance.now(), visto = await hasta(() => !!(d.st.ui && !d.st.ui.fin.hidden), 12000); finInfo = 'final ' + (visto ? 'a los ' : 'no salió en ') + Math.round(performance.now() - t0) + ' ms, fase ' + d.st.fase + ', puntos ' + d.J.puntos;
          const ok = visto && textoEs(d.st.ui.fin.querySelector('[data-salir]'), s);
          try { if (rec0 == null) localStorage.removeItem(CLAVE_RET); else localStorage.setItem(CLAVE_RET, rec0); } catch (e) { /* sin almacén */ }
          return ok;
        }
        const salirCarreras = s => textoEs(retos.pruebas.ui().menu.querySelector('.rt-fila [data-salir]'), s);
        for (const [m, nom, abrirMundo, salirM, activoM] of SALIDAS) {
          await elegir(m);
          const dentro = await hasta(activoM, 15000);
          if (m === 'flight') { const marca0 = desdeMenu, okFin = dentro && await finFlight('Volver al menú');
            check('Amazona Flight abierto desde el menú: el botón del final dice «Volver al menú»', okFin, (G.flightApi._dev.st.ui && G.flightApi._dev.st.ui.fin.querySelector('[data-salir]').textContent) + ' · dentro ' + dentro + ', marca antes ' + marca0 + ', ahora ' + desdeMenu + ', portada ' + portada.open + ', vigía ' + !!vigiaMenu + ' · ' + finInfo); }
          if (m === 'carreras') check('Carreras abierto desde el menú: el botón de salir dice «Volver al menú»', dentro && salirCarreras('Volver al menú'));
          salirM();
          const alMenu = await hasta(() => portada.open, 8000);
          check(`${nom}: abierto desde el menú, «Salir» vuelve al menú`, dentro && alMenu && !activoM() && desdeMenu === null, 'dentro ' + dentro + ', portada ' + portada.open + ', marca ' + desdeMenu + ', vigía ' + !!vigiaMenu + ', sigue ' + sigueEn(m) + ', ocupado ' + ocupado18());
          volver(); cerrarPortada();
          await abrirMundo();
          const dentroM = await hasta(activoM, 15000);
          if (m === 'flight') check('Amazona Flight abierto desde el mundo: el botón del final sigue diciendo «Volver a la historia»', dentroM && await finFlight('Volver a la historia'), G.flightApi._dev.st.ui && G.flightApi._dev.st.ui.fin.querySelector('[data-salir]').textContent);
          if (m === 'carreras') check('Carreras abierto desde el mundo: el botón de salir sigue diciendo «Volver a la historia»', dentroM && salirCarreras('Volver a la historia'));
          salirM(); await espera(1200);
          check(`${nom}: abierto desde el mundo, «Salir» deja en el mundo`, dentroM && !portada.open && !activoM(), 'dentro ' + dentroM + ', portada ' + portada.open);
          volver();
        }
        // V18 (Kelvin 8-nov: «¿dónde está lo divertido?»): cada tarjeta lleva a Vittata a su actividad y la empieza de verdad
        if (G.V18 && P.id === 'cap1') {
          const cerca = (x, z, r) => Math.hypot(S.pos.x - x, S.pos.z - z) < r;
          await elegir('golf');
          const okGolf = await hasta(() => enMarcha18('golf'), 30000);
          check('V18 · Minigolf: la tarjeta lleva a Vittata al hoyo y empieza la partida', okGolf && !portada.open && document.body.classList.contains('v18-golf-on'), 'fase ' + fase18(G.v18minigolf));
          volver(); check('V18 · Vuelve al menú y sale del minigolf', portada.open && !enMarcha18('golf') && !document.body.classList.contains('v18-golf-on'));
          await elegir('duelo');
          const okDuelo = await hasta(() => ['cuenta', 'lucha'].includes(fase18(G.v18combate)), 30000), sd = G.v18combate && G.v18combate.sitio;
          check('V18 · Duelo: la tarjeta lleva a Vittata a la explanada y empieza el duelo contra la Campeona', okDuelo && !portada.open && sd && cerca(sd.x, sd.z, 8), 'fase ' + fase18(G.v18combate) + (sd ? ', a ' + Math.hypot(S.pos.x - sd.x, S.pos.z - sd.z).toFixed(1) + ' m' : ''));
          volver(); check('V18 · Vuelve al menú y sale del duelo', portada.open && fase18(G.v18combate) === 'nada');
          { // du2: con la pantalla de carga delante, el duelo no arranca debajo (su cuenta atrás se quedaba en «3»): espera y luego empieza
            let antes = '', okC = false;
            try { G.cargaPendiente = true; elegir('duelo'); await espera(1600); antes = fase18(G.v18combate); } finally { G.cargaPendiente = false; }
            okC = await hasta(() => ['cuenta', 'lucha'].includes(fase18(G.v18combate)), 30000);
            check('du2: el duelo espera a que termine la pantalla de carga y después empieza', antes === 'nada' && okC, 'durante la carga ' + antes + ', después ' + fase18(G.v18combate));
            volver();
          }
          if (seVe('duelo2')) {
            await elegir('duelo2');
            const ok2 = await hasta(tarjeta2Abierta, 30000);
            check('V18 · Duelo de 2: la tarjeta lleva a Vittata a la explanada y abre la elección de cotorras', ok2 && !portada.open && sd && cerca(sd.x, sd.z, 8));
            const jugar = $('v18-d2-ok'); if (jugar) jugar.click();
            check('V18 · Duelo de 2: «¡A jugar!» empieza el duelo de dos', ['cuenta', 'lucha'].includes(fase18(G.v18duelo2)), 'fase ' + fase18(G.v18duelo2));
            volver(); check('V18 · Vuelve al menú y sale del duelo de 2', portada.open && fase18(G.v18duelo2) === 'nada' && !tarjeta2Abierta());
          }
          const z = el => Number(getComputedStyle(el).zIndex) || 0;
          // Las actividades V18: al salir o terminar, al menú si se entró desde él; desde el mundo (la estación del minigolf) siguen en el mundo
          await elegir('golf'); const dGolf = await hasta(() => enMarcha18('golf'), 30000); await espera(600);
          G.v18minigolf.salir(); const mGolf = await hasta(() => portada.open, 8000);
          check('V18 · Minigolf abierto desde el menú: «Salir» vuelve al menú', dGolf && mGolf && !enMarcha18('golf'), 'dentro ' + dGolf + ', portada ' + portada.open + ', marca ' + desdeMenu + ', vigía ' + !!vigiaMenu + ', fase ' + fase18(G.v18minigolf) + ', ocupado ' + ocupado18());
          volver(); cerrarPortada();
          const dGolfM = !!G.v18minigolf.irYJugar() && await hasta(() => enMarcha18('golf'), 30000);
          G.v18minigolf.salir(); await espera(1200);
          check('V18 · Minigolf desde la estación del mundo: «Salir» deja en el mundo', dGolfM && !portada.open && !enMarcha18('golf'), 'dentro ' + dGolfM + ', portada ' + portada.open);
          volver();
          await elegir('chispa'); const dCh = await hasta(() => enMarcha18('chispa'), 60000); await espera(600); /* la vigía la ve en marcha (mira cada 400 ms) */
          G.v18chispa.cancelar('sale'); const mCh = await hasta(() => portada.open, 8000);
          check('V18 · Chispa abierta desde el menú: al salir vuelve al menú', dCh && mCh && fase18(G.v18chispa) === 'nada', 'dentro ' + dCh + ', portada ' + portada.open + ', marca ' + desdeMenu + ', vigía ' + !!vigiaMenu + ', fase ' + fase18(G.v18chispa) + ', ocupado ' + ocupado18());
          volver();
          // El final del duelo (una derrota: sin premio): «Volver al menú» si se entró desde el menú; «Salir» desde el mundo
          const perder = () => { const C = G.v18combate.estado(); return hasta(() => {
            if (C.fase === 'fin') return true;
            if (C.fase === 'cuenta') G.v18combate.paso(1); /* la cuenta 3-2-1 sin esperarla */
            if (C.fase !== 'lucha') return false;
            for (const f of [C.j, C.r]) { f.cd = {}; f.mareo = 0; f.inv = 0; f.escudo = 0; }
            C.j.plumas = Math.min(C.j.plumas, 1); C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; C.r.poderT = 99;
            try { G.v18combate.usar(C.r, 'golpe_ala'); } catch (e) { /* aún no puede */ }
            return false;
          }, 20000); };
          const salirDuelo = () => { const f = G.v18combate.estado(), h = document.querySelector('#v18-duelo .vd-fin [data-a="salir"]'); return { fin: f.fase === 'fin' && f.resultado === 'loss', h }; };
          await elegir('duelo'); const dDu = await hasta(() => ['cuenta', 'lucha'].includes(fase18(G.v18combate)), 30000) && await perder();
          const fDu = salirDuelo();
          check('V18 · Duelo abierto desde el menú: el botón del final dice «Volver al menú»', dDu && fDu.fin && textoEs(fDu.h, 'Volver al menú'), 'fase ' + fase18(G.v18combate) + ', botón ' + (fDu.h && fDu.h.textContent));
          volver(); cerrarPortada();
          G.v18combate.iniciar({ sinCuenta: true }); const dDuM = await perder();
          const fDuM = salirDuelo();
          check('V18 · Duelo desde el mundo: el botón del final sigue diciendo «Salir»', dDuM && fDuM.fin && textoEs(fDuM.h, 'Salir') && !portada.open, 'fase ' + fase18(G.v18combate) + ', botón ' + (fDuM.h && fDuM.h.textContent));
          G.v18combate.salir(); volver();
          for (const m of SUB) {
            await elegir('amigos'); await espera(30);
            const c = $('card'), bots = c.querySelectorAll('[data-amigo]');
            if (m === SUB[0]) check('V18 · Retos con amigos: tarjeta encima del menú con Chispa, Moon y el Guardián', !c.hidden && c.classList.contains('mm-encima') && portada.open && bots.length === 3 && z(c) > z(portada) && !c.inert && portada.inert, bots.length + ' botones, z ' + z(c) + '/' + z(portada) + ', inerte ' + c.inert + '/' + portada.inert);
            const b = c.querySelector(`[data-amigo="${m}"]`); if (b) b.click();
            const okA = await hasta(() => enMarcha18(m), 60000), a = api18(m), s = a && (a.SITIO.salida || a.SITIO);
            check(`V18 · ${TX()[m][0]}: desde Retos con amigos lleva a Vittata a su sitio y empieza`, okA && !portada.open && c.hidden && s && cerca(s.x, s.z, 12), 'fase ' + fase18(a) + (s ? ', a ' + Math.hypot(S.pos.x - s.x, S.pos.z - s.z).toFixed(1) + ' m' : ''));
            volver(); check(`V18 · Vuelve al menú y deja ${TX()[m][0]}`, portada.open && fase18(a) === 'nada' && ultimo() === 'amigos');
          }
          await elegir('cotorras');
          const cc = $('card'), sps = cc.querySelectorAll('[data-v18sp]'), pend = G.v18nuevas && G.v18nuevas.pendientes ? G.v18nuevas.pendientes() : [];
          const faltan = cc.querySelectorAll('.mm-faltan li'), det = cc.querySelector('.mm-faltan');
          check('V18 · Mis cotorras: encima del menú, cada cotorra con su poder, su nivel, su etapa y su XP', !cc.hidden && cc.classList.contains('mm-encima') && portada.open && sps.length >= 1 &&
            [...sps].every(b => b.querySelector('.v18-evo-f') && b.querySelector('.v18-evo-bar') && b.querySelector('.mm-xp') && /Poder|Power/.test(b.textContent)), sps.length + ' cotorras');
          check('V18 · Mis cotorras: las que faltan se ven, con candado y cómo llegan (el aviso de nuevas.js)', faltan.length >= pend.length && (!pend.length || (det && (sps.length >= 2 || det.open) && faltan[0].textContent.length > 20)), faltan.length + '/' + pend.length);
          G.ui.hideCard(); check('V18 · Al cerrar Mis cotorras el menú sigue (y vuelve a responder)', cc.hidden && portada.open && !cc.classList.contains('mm-encima') && !portada.inert && cc.inert);
        }
        if (G.album && G.album.html && G.album.html()) {
          await elegir('album');
          const ca = $('card');
          check('Álbum: se abre encima del menú con las cotorras del Álbum de las 36', !ca.hidden && ca.classList.contains('mm-encima') && portada.open && ca.querySelectorAll('.album36 li').length >= 34, ca.querySelectorAll('.album36 li').length + ' tarjetas');
          const ok = $('mm-album-ok'); if (ok) ok.click(); check('Al cerrar el Álbum el menú sigue', ca.hidden && portada.open);
        }
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
        if (aj) { aj.idioma = 'en'; mostrar(); check('Textos en EN', $('modos-t').textContent === 'How do you want to play?' && form.querySelector('[data-modo="nido"] b').textContent === 'My nest' && form.querySelector('[data-modo="duelo"] b').textContent === 'Duel' && form.querySelector('[data-modo="amigos"] small').textContent === 'Chispa, Moon and the Guardian'); aj.idioma = idioma0; mostrar(); }
        // 6. Maqueta móvil: sin desbordes, tarjetas de 44 px o más y sin solaparse
        for (const [w, h] of [[375, 812], [320, 568], [812, 375]]) {
          const m = await maquetaPortada(w, h);
          try {
            const d = m.d, malos = [];
            if (d.documentElement.scrollWidth > w + 1) malos.push('página ' + d.documentElement.scrollWidth + ' px');
            const rs = [...d.querySelectorAll('.modo:not([hidden])')].map(b => b.getBoundingClientRect());
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
        try { salir18(); } catch (e) { /* ya fuera */ }
        try { if (retos) { retos.salir(); retos.pruebas.prueba(false); } } catch (e) { /* ya fuera */ }
        try { if (G.criadero && G.criadero.abierto && G.criadero.abierto()) G.criadero.cerrar(); } catch (e) { /* cerrado */ }
        try { if (G.recordsApi) G.recordsApi.cerrar(); } catch (e) { /* cerrado */ }
        try { if (menu0 == null) localStorage.removeItem(ALMACEN); else localStorage.setItem(ALMACEN, menu0); } catch (e) { /* sin almacén */ }
        G.guardado.restaurar(snap); G.guardado.suspender(false); G.quiet = quiet0;
        if (creador0 && creador && creador.hidden && !(S.profile && S.profile.created)) { try { G.creador.open(true); } catch (e) { /* sin creador */ } }
        if (libre0) entrarLibre();
        if (portada.open !== abierta0) { if (abierta0) { portada.returnValue = ''; portada.show(); } else portada.close(); }
        mostrar();
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    // QA-212: ocupado() = hay una actividad V18 en marcha (duelo, minigolf, carreras…); lo miran las pistas de descubrir.js y ciclo.js
    const api = G.menuModos = { elegir, mostrar, volver, ultimo, test, desdeMenu: () => desdeMenu, ocupado: () => ocupado18(), get libre() { return libre; }, get pendiente() { return pendiente; } };
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
  // Último capítulo elegido o jugado: boot.js lo abre al volver a entrar sin un clic en el sitio. Solo la página de arriba
  // (los iframes de las pruebas no lo tocan).
  const CAPK = 'amazonaverse.capitulo';
  function apuntarCapitulo(id) {
    if (window.top !== window || !CAPS.some(c => c.id === id)) return;
    try { localStorage.setItem(CAPK, JSON.stringify({ v: 1, id })); } catch (e) { /* sin almacén */ }
  }

  function temporada(G, h) {
    const S = G.S, P = G.pack, $ = G.util.$, L = h.L;
    const actual = (P.meta && P.meta.capitulo) || (CAPS.find(c => c.id === P.id) || CAPS[0]).n;
    const cap = n => CAPS[n - 1];
    const dlg = $('capitulos'), lista = $('capitulos-lista'), bSig = $('b-siguiente');

    // ---------- Progreso ----------
    const leer = () => { try { const d = JSON.parse(localStorage.getItem(TEMP) || 'null'); if (d && d.v === 1) return Object.assign({ terminados: {}, decisiones: {} }, d); } catch (e) { /* corrupto: se empieza de nuevo */ } return { v: 1, terminados: {}, decisiones: {} }; };
    const escribir = d => { try { localStorage.setItem(TEMP, JSON.stringify(d)); } catch (e) { /* sin almacén */ } };
    G.on('nuevoEstudiante', () => { try { localStorage.removeItem(TEMP); localStorage.removeItem(CAPK); } catch (e) { /* sin almacén */ } });
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
      apuntarCapitulo(cap(n).id); // lo que eligió el jugador manda al volver a entrar (boot.js)
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
      const check = (n, ok, det) => { out.push({ name: n, ok: !!ok, detail: ok ? undefined : det, extra: ok ? undefined : det }); if (!ok) console.warn('temporadaTest ✗', n, det || ''); };
      const ce = console.error; console.error = (...a) => { errores.push(a.map(String).join(' ')); ce.apply(console, a); };
      const errores0 = (window.__aveErrores || []).length;
      const quiet0 = G.quiet; G.quiet = true;
      const snap = G.guardado.instantanea(); G.guardado.suspender(true);
      const creador = $('creator'), creador0 = !!(creador && !creador.hidden); // para reabrir el creador al final si estaba abierto (antes no se definía: ReferenceError)
      const claves = [TEMP, CAPK].concat(CAPS.filter(c => c.n !== actual).map(c => c.almacen + '.save'));
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
        if (creador0 && creador && creador.hidden && !(S.profile && S.profile.created)) { try { G.creador.open(true); } catch (e) { /* sin creador */ } }
        if (fin) fin.hidden = fin0;
        if (finTxt) finTxt.textContent = finTxt0;
        if (portada && portada.open !== portada0) { portada.returnValue = ''; if (portada0) portada.show(); else portada.close(); }
        pintar(); pintarFin();
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    // Prueba: AV.capituloElegidoTest(). Con progreso hasta el cap. 4, elegir el cap. 1 en «Capítulos» y volver a entrar (aunque
    // sea con el enlace viejo ?pack=ep4 sin clic) abre el cap. 1; recargar o un clic en el sitio respetan la URL; nada se pierde.
    async function capituloTest() {
      const out = [], check = (n, ok, det) => { out.push({ name: n, ok: !!ok, detail: ok ? undefined : det }); if (!ok) console.warn('capituloElegidoTest ✗', n, det || ''); };
      const dec = window.AVE.capituloAlEntrar, claves = [CAPK, TEMP, 'ep4.save'];
      const antes = {}; for (const k of claves) { try { antes[k] = localStorage.getItem(k); } catch (e) { /* sin almacén */ } }
      const nav0 = navegar; let fueA = null; navegar = u => { fueA = u; };
      const quiet0 = G.quiet; G.quiet = true;
      try {
        check('boot.js expone la regla de entrada', typeof dec === 'function');
        if (typeof dec !== 'function') return { passed: 0, total: out.length, results: out };
        const g = id => ({ v: 1, id }), base = { top: true, nav: 'navigate', clicEnSitio: false };
        check('Cap. 1 elegido + enlace viejo ?pack=ep4 sin clic (autocompletar, marcador) → cap. 1', dec(Object.assign({}, base, { urlPack: 'ep4', guardado: g('cap1') })) === 'cap1');
        check('Cap. 4 jugado + /juego/ sin ?pack → cap. 4', dec(Object.assign({}, base, { urlPack: null, guardado: g('ep4') })) === 'ep4');
        check('Clic en un enlace del sitio con ?pack=ep4 → manda la URL', dec(Object.assign({}, base, { urlPack: 'ep4', clicEnSitio: true, guardado: g('cap1') })) === null);
        check('Recargar respeta la URL', dec(Object.assign({}, base, { nav: 'reload', urlPack: 'ep4', guardado: g('cap1') })) === null);
        check('Atrás/adelante respeta la URL', dec(Object.assign({}, base, { nav: 'back_forward', urlPack: 'ep4', guardado: g('cap1') })) === null);
        check('En un iframe (pruebas) manda la URL', dec(Object.assign({}, base, { top: false, urlPack: 'ep4', guardado: g('cap1') })) === null);
        check('Sin nada apuntado o dañado manda la URL', dec(Object.assign({}, base, { urlPack: 'ep4', guardado: null })) === null && dec(Object.assign({}, base, { urlPack: null, guardado: { v: 1, id: 'x"><' } })) === null);
        check('Mismo capítulo que la URL: no hace nada', dec(Object.assign({}, base, { urlPack: null, guardado: g('cap1') })) === null && dec(Object.assign({}, base, { urlPack: 'ep4', guardado: g('ep4') })) === null);
        // El flujo de Kelvin con la pantalla «Capítulos»: progreso en el 4, se elige el 1
        localStorage.setItem(CAPK, JSON.stringify(g('ep4')));
        const prog4 = JSON.stringify({ v: 1, step: 3, profile: { created: true }, events: ['x'] });
        localStorage.setItem('ep4.save', prog4);
        const otro = actual === 1 ? 4 : 1;
        abrir();
        const b = lista && lista.querySelector(`[data-cap="${otro}"] .cap-jugar`);
        check(`«Capítulos» muestra el capítulo ${otro} con su número`, b && new RegExp(otro).test(b.getAttribute('aria-label') || ''), b && b.getAttribute('aria-label'));
        if (b) b.click();
        let ap = null; try { ap = JSON.parse(localStorage.getItem(CAPK) || 'null'); } catch (e) { /* */ }
        check(`Jugar en el capítulo ${otro} lo apunta`, ap && ap.id === cap(otro).id, JSON.stringify(ap));
        check(`…y navega a su URL`, fueA && (otro === 1 ? !new URL(fueA, location.href).searchParams.get('pack') : new URL(fueA, location.href).searchParams.get('pack') === cap(otro).id), fueA);
        check(`Al volver a entrar con el enlace del otro capítulo, sin clic, abre el ${otro}`, dec(Object.assign({}, base, { urlPack: otro === 1 ? 'ep4' : null, guardado: ap })) === (otro === 1 ? 'cap1' : cap(otro).id));
        check('El progreso del cap. 4 sigue intacto', localStorage.getItem('ep4.save') === prog4);
        // «Seguir aquí» en el capítulo de esta página también cuenta como elección
        localStorage.setItem(CAPK, JSON.stringify(g(cap(otro).id))); abrir();
        const aqui = lista && lista.querySelector('.es-actual .cap-jugar'), t = $('title');
        if (aqui && !(t && t.open)) aqui.click(); else apuntarCapitulo(P.id); // con la portada abierta el clic abriría Aventura
        try { ap = JSON.parse(localStorage.getItem(CAPK) || 'null'); } catch (e) { ap = null; }
        check('«Seguir aquí» apunta este capítulo', ap && ap.id === P.id, JSON.stringify(ap));
      } catch (e) {
        check('sin excepciones', false, String(e && e.stack || e));
      } finally {
        navegar = nav0; G.quiet = quiet0; cerrar();
        for (const k of claves) { try { if (antes[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, antes[k]); } catch (e) { /* sin almacén */ } }
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    return { CAPS, actual, estado, terminar, decision, leer, urlDe, jugar, abrir, cerrar, pintar, test, capituloTest };
  }
})();
