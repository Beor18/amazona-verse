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
    };
    // Pruebas propias del pack (cap1: selfTest y missionTest)
    for (const [name, fn] of Object.entries(P.pruebas || {})) AV[name] = opts => fn(G, T, opts);
    if (G.criadero && G.criadero.test) AV.criaderoTest = o => G.criadero.test(o); // src/game/criadero.js
    // Pruebas que se cargan al pedirlas (no van en la descarga inicial): movimiento y guía de controles
    const aDemanda = (src, fabrica) => { let p = null; return () => p || (p = AVE.assets.script(src).then(() => window[fabrica](G), e => { p = null; throw e; })); };
    const movimiento = aDemanda('src/pruebas/movimiento.js', 'AVMovimientoTest'), controles = aDemanda('src/pruebas/controles.js', 'AVControlesTest');
    AV.movementTest = o => movimiento().then(m => m.test(o));
    if (AVE.pieles) { const pieles = aDemanda('src/pruebas/pieles.js', 'AVPielesTest'); AV.pielesTest = o => pieles().then(m => m.test(o)); } // src/personaje/pieles.js
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
    const bRetos = document.getElementById('b-retos'), portada = document.getElementById('title');
    if (bRetos) bRetos.addEventListener('click', () => AV.retos());
    if (portada) portada.addEventListener('close', () => { if (portada.returnValue === 'retos') { portada.returnValue = ''; AV.retos(); } });
    const recRetos = ((P.meta && P.meta.almacen) || P.id) + '.retos', recCasa = ((P.meta && P.meta.almacen) || P.id) + '.records'; // récords aparte de la partida; «Nuevo estudiante» los borra (también el libro de la casa)
    G.on('nuevoEstudiante', () => { for (const k of [recRetos, recCasa]) { try { localStorage.removeItem(k); } catch (e) { /* sin almacén */ } } });
    // Música y ambiente sintetizados (src/game/musica.js): se cargan tras el primer gesto del jugador (pointerdown o tecla), no en la descarga inicial
    let musica = null;
    const cargarMusica = () => musica || (musica = AVE.assets.script('src/game/musica.js').then(() => window.AVMusica(G), e => { musica = null; throw e; }));
    // Bandada de cotorras (src/game/bandada.js): se carga sola al arrancar si la calidad no es «bajo», y al pedir su prueba
    let bandada = null;
    const cargarBandada = () => bandada || (bandada = AVE.assets.script('src/game/bandada.js').then(() => window.AVBandada(G), e => { bandada = null; throw e; }));
    AV.bandadaTest = o => cargarBandada().then(b => b.test(o));
    if (G.renderer.calidad.nivel !== 'bajo') setTimeout(() => cargarBandada().catch(() => {}), 4000);
    AV.musica = () => cargarMusica();
    AV.musicaTest = o => cargarMusica().then(m => m.test(o));
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { cargarMusica().catch(() => {}); }, { once: true, passive: true });
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
