/* AVE · arranque
   Elige el content pack y arranca el motor. Orden de elección: ?pack=<id> en la URL, AVE.config.pack, el primero registrado.
   Si el pack pedido no está cargado, se carga content/<id>/pack.js con <script> relativo (y los archivos que liste en
   "archivos"), así un pack nuevo no necesita tocar index.html. Expone window.AV (estado, pruebas y diagnóstico). */
(function () {
  'use strict';
  const AVE = window.AVE;
  const cfg = AVE.config || {};
  const fromUrl = new URLSearchParams(location.search).get('pack');
  const want = fromUrl && /^[a-z0-9_-]+$/.test(fromUrl) ? fromUrl : cfg.pack || Object.keys(AVE.packs)[0];

  function expose(G) {
    const P = G.pack, T = G.pruebas;
    const AV = {
      get state() { return G.S; }, get renderer() { return G.renderer.renderer; }, G, pack: P.id,
      debug: Object.assign({ FIELD: G.diario.entries, guideTarget: () => G.misiones.guideTarget(), height: G.terreno.height,
        camYaw: v => (v != null ? (G.camara.yaw = v) : G.camara.yaw) }, P.depuracion ? P.depuracion(G) : {}),
      teleport: T.teleport, tick: T.tick, action: () => G.interaccion.action(), nearest: () => { const n = G.interaccion.nearest(); return n && n.id; },
      save: s => G.guardado.save(s), load: s => G.guardado.load(s), reset: s => G.guardado.reset(s),
      exportComic: (f, u) => G.comic.exportComic(f, u), portraitCanvasFor: (n, bg) => G.creador.portraitCanvasFor(n, bg),
      accessoryTest: () => T.accessoryTest(), templateTest: o => T.templateTest(o),
      ep2Test: o => T.templateTest(Object.assign({ pack: 'ep2' }, o)), // content/ep2: el pack arranca y su misión 1 se completa
    };
    // Pruebas propias del pack (cap1: selfTest y missionTest)
    for (const [name, fn] of Object.entries(P.pruebas || {})) AV[name] = opts => fn(G, T, opts);
    // Pruebas del pack que se cargan al pedirlas (pack.pruebasDiferidas = { archivo, nombres }): no van en la descarga inicial
    const dif = P.pruebasDiferidas;
    if (dif) {
      let carga = null;
      const cargarPruebas = () => carga || (carga = AVE.assets.script(dif.archivo).then(() => P.pruebas, e => { carga = null; throw e; }));
      for (const name of dif.nombres) if (!AV[name]) AV[name] = opts => cargarPruebas().then(ps => ps[name](G, T, opts));
    }
    if (G.criadero && G.criadero.test) AV.criaderoTest = o => G.criadero.test(o); // src/game/criadero.js
    // Pruebas que se cargan al pedirlas (no van en la descarga inicial): movimiento y guía de controles
    // Módulos que no van en la descarga inicial: se piden en el primer gesto del jugador (Jugar en la portada, una tecla o un toque)
    const alPrimerGesto = fn => { let hecho = false; const ir = () => { if (hecho) return; hecho = true; setTimeout(() => fn().catch(() => {}), 300); };
      for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, ir, { once: true, passive: true }); };
    const aDemanda = (src, fabrica) => { let p = null; return () => p || (p = AVE.assets.script(src).then(() => window[fabrica](G), e => { p = null; throw e; })); };
    const movimiento = aDemanda('src/pruebas/movimiento.js', 'AVMovimientoTest'), controles = aDemanda('src/pruebas/controles.js', 'AVControlesTest');
    AV.movementTest = o => movimiento().then(m => m.test(o));
    if (AVE.pieles) { const pieles = aDemanda('src/pruebas/pieles.js', 'AVPielesTest'); AV.pielesTest = o => pieles().then(m => m.test(o)); } // src/personaje/pieles.js
    if (P.faunaDatos) { const fauna = aDemanda('src/game/fauna.js', 'AVFauna'); AV.faunaTest = o => fauna().then(f => f.test(o)); alPrimerGesto(fauna); } // src/game/fauna.js
    if (G.guardado.test) AV.saveTest = o => G.guardado.test(o); // src/engine/guardado.js
    if (G.comic.test) AV.comicTest = o => G.comic.test(o); // src/game/comic.js
    if (G.renderer.contextTest) AV.contextTest = o => G.renderer.contextTest(o); // src/engine/renderer.js
    if (G.streaming && G.streaming.test) AV.streamingTest = o => G.streaming.test(o); // src/engine/streaming.js
    if (G.guiaControles) AV.controlesTest = o => controles().then(m => m.test(o)); // src/game/guia_controles.js
    if (G.input.test) AV.teclasTest = o => G.input.test(o); // src/engine/input.js
    if (G.accesibilidad && G.accesibilidad.test) AV.accesibilidadTest = o => G.accesibilidad.test(o); // src/game/accesibilidad.js
    // Mis récords y Compartir (src/game/records.js): se carga al pedirlo (pausa, portada o «Compartir» del cómic) y junto con los retos,
    // para anotar cada resultado a nombre de la cotorra que jugó. Todo local; la partida no se toca
    let records = null;
    const cargarRecords = () => records || (records = AVE.assets.script('src/game/records.js').then(() => window.AVRecords(G), e => { records = null; throw e; }));
    AV.records = o => cargarRecords().then(r => r.abrir(o), () => G.ui.toast('No se pudieron abrir tus récords. Prueba otra vez.', 3000));
    AV.recordsTest = o => cargarRecords().then(r => r.test(o));
    for (const [id, accion, o] of [['b-records', 'abrir', { desde: 'pausa' }], ['b-records-title', 'abrir', { desde: 'portada' }], ['c-share', 'compartirComic']]) {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', () => cargarRecords().then(r => r[accion](o), () => G.ui.toast('No se pudo cargar. Prueba otra vez.', 3000)));
    }
    // Modo Retos (src/game/retos.js): se carga al pedirlo (botón «Retos» de la portada o de la pausa), no en la descarga inicial
    let retos = null;
    const cargarRetos = () => retos || (retos = AVE.assets.script('src/game/retos.js').then(() => { cargarRecords().catch(() => {}); return window.AVRetos(G); }, e => { retos = null; throw e; }));
    AV.retos = () => cargarRetos().then(r => (r.activo ? r.salir() : r.abrir()), () => G.ui.toast('No se pudieron cargar los retos. Prueba otra vez.', 3000));
    AV.retosTest = o => cargarRetos().then(r => r.test(o));
    // «Save the Parrot» (src/game/rescate.js): cartel con caja nido tras la crecida; se carga sola tras el arranque y al pedir su prueba
    let rescate = null;
    const cargarRescate = () => rescate || (rescate = AVE.assets.script('src/game/rescate.js').then(() => window.AVRescate(G), e => { rescate = null; throw e; }));
    AV.rescateTest = o => cargarRescate().then(r => r.test(o));
    setTimeout(() => cargarRescate().catch(() => {}), 6000);
    // Bandada de cotorras (src/game/bandada.js): se carga sola al arrancar si la calidad no es «bajo», y al pedir su prueba
    let bandada = null;
    const cargarBandada = () => bandada || (bandada = AVE.assets.script('src/game/bandada.js').then(() => window.AVBandada(G), e => { bandada = null; throw e; }));
    AV.bandadaTest = o => cargarBandada().then(b => b.test(o));
    if (G.renderer.calidad.nivel !== 'bajo') alPrimerGesto(cargarBandada);
    // Ríos vivos (src/game/rio_vivo.js): peces nativos y el visor; se carga en el primer gesto (si el pack tiene mapa.agua) y al pedir su prueba
    let rioVivo = null;
    const cargarRioVivo = () => rioVivo || (rioVivo = AVE.assets.script('src/game/rio_vivo.js').then(() => window.AVRioVivo(G), e => { rioVivo = null; throw e; }));
    AV.rioVivoTest = o => cargarRioVivo().then(r => r.test(o));
    if (G.terreno.mapa && G.terreno.mapa.agua) alPrimerGesto(cargarRioVivo);
    // Banquete en la selva (src/game/banquete.js): frutos en los árboles y el reto «¡Banquete!»; se carga sola tras el arranque y al pedir su prueba
    let banquete = null;
    const cargarBanquete = () => banquete || (banquete = AVE.assets.script('src/game/banquete.js').then(() => window.AVBanquete(G), e => { banquete = null; throw e; }));
    AV.banqueteTest = o => cargarBanquete().then(b => b.test(o));
    alPrimerGesto(cargarBanquete);
    // Minimapa (src/game/minimapa.js): se carga solo tras el arranque (no va en la descarga inicial) y al pedir su prueba; M o un toque lo amplía
    let minimapa = null;
    const cargarMinimapa = () => minimapa || (minimapa = AVE.assets.script('src/game/minimapa.js').then(() => window.AVMinimapa(G), e => { minimapa = null; throw e; }));
    AV.minimapaTest = o => cargarMinimapa().then(m => m.test(o));
    alPrimerGesto(cargarMinimapa);
    // Marcador del capítulo (src/game/marcador.js): cronómetro, puntuación y medalla; se carga al arrancar para contar desde el primer cuadro
    let marcador = null;
    const cargarMarcador = () => marcador || (marcador = AVE.assets.script('src/game/marcador.js').then(() => window.AVMarcador(G), e => { marcador = null; throw e; }));
    AV.marcadorTest = o => cargarMarcador().then(m => m.test(o));
    if (G.idioma && G.idioma.test) AV.idiomaTest = o => G.idioma.test(o); // src/game/idioma.js
    alPrimerGesto(cargarMarcador); // cuenta desde que el jugador empieza (Jugar), no desde la portada
    const bRetos = document.getElementById('b-retos'), portada = document.getElementById('title');
    if (bRetos) bRetos.addEventListener('click', () => AV.retos());
    // «¿Cómo quieres jugar?» (src/game/menu_modos.js): las tarjetas de la portada abren cada modo (también el valor «retos» de la portada anterior) y «Cambiar de juego» vuelve al menú
    if (portada && window.AVMenuModos) { const menu = window.AVMenuModos(G, { retos: cargarRetos, records: cargarRecords }); AV.menuModos = menu; AV.menuModosTest = o => menu.test(o); }
    const recRetos = ((P.meta && P.meta.almacen) || P.id) + '.retos', recCasa = ((P.meta && P.meta.almacen) || P.id) + '.records'; // récords aparte de la partida; «Nuevo estudiante» los borra (también el libro de la casa)
    G.on('nuevoEstudiante', () => { for (const k of [recRetos, recCasa]) { try { localStorage.removeItem(k); } catch (e) { /* sin almacén */ } } });
    // Música y ambiente sintetizados (src/game/musica.js): se cargan tras el primer gesto del jugador (pointerdown o tecla), no en la descarga inicial
    let musica = null;
    const cargarMusica = () => musica || (musica = AVE.assets.script('src/game/musica.js').then(() => window.AVMusica(G), e => { musica = null; throw e; }));
    AV.musica = () => cargarMusica();
    AV.musicaTest = o => cargarMusica().then(m => m.test(o));
    // Clima de El Yunque (src/game/clima.js): sol, llovizna, aguacero y neblina; se carga solo tras el arranque y al pedir su prueba
    const cargarClima = aDemanda('src/game/clima.js', 'AVClima');
    AV.climaTest = o => cargarClima().then(c => c.test(o));
    setTimeout(() => cargarClima().catch(() => {}), 6000);
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { cargarMusica().catch(() => {}); }, { once: true, passive: true });
    // Looks de color A/B para Kelvin (src/game/look.js): ?look=vibrante|soleado|toon y sección oculta en la pausa; el de fábrica no cambia
    const cargarLook = aDemanda('src/game/look.js', 'AVLook');
    AV.lookTest = o => cargarLook().then(l => l.test(o));
    if (/[?&]look=/.test(location.search)) cargarLook().catch(() => {}); else setTimeout(() => cargarLook().catch(() => {}), 7000);
    window.AV = AV;
  }
  function start(id) { expose(AVE.boot(id)); }

  if (AVE.packs[want]) start(want);
  else {
    const base = 'content/' + want + '/';
    AVE.assets.script(base + 'pack.js')
      .then(() => {
        const files = (AVE.packs[want] && AVE.packs[want].archivos) || [];
        return files.reduce((p, f) => p.then(() => AVE.assets.script(base + f)), Promise.resolve());
      })
      .then(() => start(want))
      .catch(e => { console.error('AVE: no se pudo cargar el pack "' + want + '"', e); if (Object.keys(AVE.packs)[0]) start(Object.keys(AVE.packs)[0]); });
  }
})();
