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
    if (G.movimiento && G.movimiento.test) AV.movementTest = o => G.movimiento.test(o); // src/pruebas/movimiento.js
    if (G.guardado.test) AV.saveTest = o => G.guardado.test(o); // src/engine/guardado.js
    if (G.comic.test) AV.comicTest = o => G.comic.test(o); // src/game/comic.js
    if (G.renderer.contextTest) AV.contextTest = o => G.renderer.contextTest(o); // src/engine/renderer.js
    if (G.streaming && G.streaming.test) AV.streamingTest = o => G.streaming.test(o); // src/engine/streaming.js
    if (G.input.test) AV.teclasTest = o => G.input.test(o); // src/engine/input.js
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
