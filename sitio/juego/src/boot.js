/* AVE · arranque
   Elige el content pack y arranca el motor. Orden de elección: ?pack=<id> en la URL, AVE.config.pack, el primero registrado.
   Si el pack pedido no está cargado, se carga content/<id>/pack.js con <script> relativo (y los archivos que liste en
   "archivos"), así un pack nuevo no necesita tocar index.html. Expone window.AV (estado, pruebas y diagnóstico). */
(function () {
  'use strict';
  const AVE = window.AVE;
  const cfg = AVE.config || {};
  const fromUrl = new URLSearchParams(location.search).get('pack');
  // Último capítulo elegido o jugado (menu_modos.js lo apunta en `amazonaverse.capitulo` al pulsar Jugar en «Capítulos» o al
  // entrar en Aventura). Al volver a entrar sin un clic en el sitio (sin ?pack, o con un ?pack de autocompletar, marcador o
  // pantalla de inicio) se abre ese y no el del enlace viejo. Recargar, atrás/adelante, un iframe y un clic en el sitio respetan
  // la URL. Bug de Kelvin 4-nov: «pongo capítulo 1, vuelvo a entrar y me envía para el 4». Prueba: AV.capituloElegidoTest().
  const CAP_IDS = ['cap1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6'];
  AVE.capituloAlEntrar = function (o) {
    if (!o.top || (o.nav && o.nav !== 'navigate') || o.especial) return null;
    if (o.urlPack && o.clicEnSitio) return null; // enlace pulsado en la web o en el juego: manda la URL
    const id = o.guardado && o.guardado.v === 1 ? o.guardado.id : null;
    if (!CAP_IDS.includes(id) || id === (o.urlPack || 'cap1')) return null;
    return id;
  };
  let recordado = null;
  try {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    let clic = false; try { clic = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { /* referrer raro */ }
    recordado = AVE.capituloAlEntrar({ top: window.top === window, nav: nav && nav.type, urlPack: fromUrl, clicEnSitio: clic,
      especial: /[?&](mini|manga|partida|hud|atardecer)=/.test(location.search), guardado: JSON.parse(localStorage.getItem('amazonaverse.capitulo') || 'null') });
  } catch (e) { recordado = null; /* sin almacén: manda la URL */ }
  if (recordado) {
    try { const u = new URL(location.href); if (recordado === 'cap1') u.searchParams.delete('pack'); else u.searchParams.set('pack', recordado); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) { /* la URL se queda */ }
  }
  const pedido = recordado || fromUrl;
  const want = pedido && /^[a-z0-9_-]+$/.test(pedido) ? pedido : cfg.pack || Object.keys(AVE.packs)[0];
  // ?hud=0: sin interfaz (capturas de video del tráiler, BM11). Solo oculta el HUD del mundo; no cambia el juego.
  if (/[?&]hud=0\b/.test(location.search)) { const st = document.createElement('style'); st.textContent = '#top, #acts, #stick, #keyhint, #tag, #toast, #prompt, #emotes, .guia-hud, .hud-btn, #minimap, #minimapa, .fl-hud, .fl-salir, .fl-pista, .mz-hud, .mz-salir, .mz-pista, .mz-ayuda, .mz-mapa, .rr-hud, .rr-barra, .rr-modos, .rr-salir, .rr-pista { display: none !important; }'; document.head.appendChild(st); }

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
      secretosTest: o => (G.secretos ? G.secretos.test(o) : Promise.reject(new Error('sin secretos'))),
      cg34Test: o => (G.secretos && G.secretos.cg34 ? G.secretos.cg34(o) : Promise.reject(new Error('sin cg34'))),
      ep3Test: o => T.templateTest(Object.assign({ pack: 'ep3', timeout: 60000 }, o)), // content/ep3: el episodio 3 de punta a punta, ES y EN
      ep4Test: o => T.templateTest(Object.assign({ pack: 'ep4', timeout: 60000 }, o)), // content/ep4: el capítulo 4 de principio a fin
      ep6Test: o => T.templateTest(Object.assign({ pack: 'ep6', timeout: 240000 }, o)), // content/ep6: el capítulo 6 «El pacto de los 36» de principio a fin, ES y EN
      ep5Test: o => T.templateTest(Object.assign({ pack: 'ep5', timeout: 240000 }, o)), // content/ep5: capítulo 5 de principio a fin
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
    if (G.aula && G.aula.rankingClase) AV.rankingClaseTest = o => G.aula.rankingClase().then(r => r.test(o)); // src/game/ranking_clase.js (ranking de clase local)
    if (G.criadero && G.criadero.test) AV.criaderoTest = o => G.criadero.test(o); // src/game/criadero.js
    if (window.AVTemporada) AV.registroTemporadaTest = () => Promise.resolve(window.AVTemporada.test()); // src/game/temporada.js (D11, D32)
    if (G.creador && G.creador.test) AV.creadorTest = o => G.creador.test(o); // src/game/creador.js (carril N)
    // Pruebas que se cargan al pedirlas (no van en la descarga inicial): movimiento y guía de controles
    // Módulos que no van en la descarga inicial: se piden en el primer gesto del jugador (Jugar en la portada, una tecla o un toque)
    const alPrimerGesto = fn => { let hecho = false; const ir = () => { if (hecho) return; hecho = true; setTimeout(() => fn().catch(() => {}), 300); };
      for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, ir, { once: true, passive: true }); };
    const aDemanda = (src, fabrica) => { let p = null; return () => p || (p = AVE.assets.script(src).then(() => window[fabrica](G), e => { p = null; throw e; })); };
    // Pantalla de carga (src/ui/carga.js): entre «Empezar» y el control del jugador espera, por tandas, al mundo, la zona de
    // inicio, las texturas y los programas (tope 20 s). Se pide ya: tiene que estar antes de que el jugador entre.
    const cargarCarga = aDemanda('src/ui/carga.js', 'AVCarga');
    // QA-159: mientras esa pantalla (perezosa) no ha corrido, el mundo queda tapado aunque carga.js tarde en evaluarse
    // (el hilo se come el fetch/parseo del mundo y el script llega tarde): sin esto, una llegada tardía metía el motivo
    // de pausa 'carga' con el mundo ya jugable y congelaba la partida a medias unos segundos (maestroTest vía creador
    // 25/26 intermitente). carga.js quita la bandera al destapar (fase 'dibujo' o cierre) o al descartar la corrida;
    // este tope de seguridad destapa si el script no llega nunca; ?carga=0 no instala nada.
    if (!/[?&]carga=0\b/.test(location.search) && G.ui && G.ui.worldHidden && !G.ui.worldHidden.precarga) {
      G.cargaPendiente = true;
      const previo = G.ui.worldHidden;
      const wh = () => G.cargaPendiente || previo();
      wh.precarga = true;
      G.ui.worldHidden = wh;
      setTimeout(() => { G.cargaPendiente = false; }, 30000);
    }
    cargarCarga().then(c => { AV.carga = c; }, () => {});
    AV.cargaEsperar = ms => cargarCarga().then(c => c.esperar(ms), () => null);
    AV.cargaTest = o => cargarCarga().then(c => c.test(o));
    const movimiento = aDemanda('src/pruebas/movimiento.js', 'AVMovimientoTest'), controles = aDemanda('src/pruebas/controles.js', 'AVControlesTest');
    AV.movementTest = o => movimiento().then(m => m.test(o));
    const fugas = aDemanda('src/pruebas/fugas.js', 'AVFugasTest'); AV.fugasTest = o => fugas().then(m => m.test(o)); // W20: abrir y cerrar modos no deja basura
    if (AVE.pieles) { const pieles = aDemanda('src/pruebas/pieles.js', 'AVPielesTest'); AV.pielesTest = o => pieles().then(m => m.test(o)); } // src/personaje/pieles.js
    if (P.faunaDatos) { const fauna = aDemanda('src/game/fauna.js', 'AVFauna'); AV.faunaTest = o => fauna().then(f => f.test(o)); alPrimerGesto(fauna); } // src/game/fauna.js
    const cargarVecinos = aDemanda('src/game/vecinos.js', 'AVVecinos'); AV.vecinosTest = o => cargarVecinos().then(v => v.test(o)); alPrimerGesto(cargarVecinos); // CG-44
    // V18.1 «El mundo que cambia contigo» (Kelvin 5-nov). Kelvin 6-nov: ENCENDIDA por defecto en el enlace principal (docs/DECISION_LOG.md).
    // Se apaga con ?v18=0 o localStorage amazonaverse.v18on = '0' (QA-164: no es la clave del progreso <almacen>.v18); ?v18=1 / '1' la encienden.
    // Apagada no se carga nada nuevo y queda la versión estable anterior. Contrato: docs/equipo/V18_CONTRATOS.md.
    const v18Bandera = (search, leerClave) => { const q = /[?&]v18=([01])\b/.exec(search || ''); if (q) return q[1] === '1'; try { return leerClave() !== '0'; } catch (e) { return true; } };
    AV.v18Bandera = v18Bandera; // la prueba de progreso.js (AV.v18Test) comprueba que ?v18=0 y la clave '0' la apagan
    const v18On = v18Bandera(location.search, () => localStorage.getItem('amazonaverse.v18on'));
    G.V18 = v18On;
    // W32: módulos V18 que no hacen falta al arrancar. No se piden en el primer gesto, sino cuando hacen falta: Vittata cerca de su
    // sitio fijo o el progreso V18 que los saca (se mira una vez por segundo). Las pruebas AV.v18*Test los siguen cargando al pedirlas.
    const cuandoToque = (cond, fn) => { const t = setInterval(() => { let si = false; try { si = !!cond(); } catch (e) { si = false; } if (si) { clearInterval(t); fn().catch(() => {}); } }, 1000); };
    const cerca = (x, z, r) => { const p = G.S && G.S.pos; return !!p && Math.hypot(p.x - x, p.z - z) < r; };
    const enCap1 = () => !!(G.pack && G.pack.id === 'cap1');
    const mundoV18 = (id, valor) => !!(G.v18 && G.v18.mundo) && (G.v18.mundo(id) === valor);
    // Chispa, Moon y el Guardián: hasta que Vittata se acerca (< 130 m: Villa Raíz queda a ~150 m de Chispa; su NPC pide el .glb a < 90 m; los scripts se piden a la vez) solo queda su marcador del
    // minimapa (G.v18chispa… = { diferido, mapa }, con la misma condición que activa() del módulo). Al cargar, el módulo lo sustituye.
    const conMarca = (clave, x, z, nombre, src, fabrica) => { if (v18On) G[clave] = { diferido: true, mapa: () => (G.V18 && enCap1() ? { x, z, nombre } : null) };
      let p = null; return () => p || (p = AVE.assets.script(src).then(() => { if (G[clave] && G[clave].diferido) delete G[clave]; return window[fabrica](G); }, e => { p = null; throw e; })); };
    const cargarV18 = aDemanda('src/game/v18/progreso.js', 'AVV18Progreso'); AV.v18Test = o => cargarV18().then(v => v.test(o));
    const cargarV18Fx = aDemanda('src/game/v18/fx_poderes.js', 'AVV18Fx'); AV.v18FxTest = o => cargarV18Fx().then(v => v.test(o)); if (v18On) alPrimerGesto(cargarV18Fx); // KIMI-061: FX de los poderes (G.v18fx)
    if (v18On) alPrimerGesto(cargarV18);
    // V18.1 frente A (D7): habilidades por especie + duelo de entrenamiento contra una cotorra IA (src/game/v18/combate.js)
    const hab18 = aDemanda('src/game/v18/habilidades.js', 'AVV18Habilidades'), comb18 = aDemanda('src/game/v18/combate.js', 'AVV18Combate');
    const cargarCombate = () => cargarV18().then(hab18).then(comb18);
    AV.v18CombateTest = o => cargarCombate().then(c => c.test(o));
    if (v18On) alPrimerGesto(cargarCombate);
    const descubrir18 = aDemanda('src/game/v18/descubrir.js', 'AVV18Descubrir'), cargarV18Descubrir = () => cargarV18().then(descubrir18); AV.v18DescubrirTest = o => cargarV18Descubrir().then(d => d.test(o)); if (v18On) alPrimerGesto(cargarV18Descubrir); // frente C: descubrir, desbloquear y elegir la cotorra de Dominica
    const reparar18 = aDemanda('src/game/v18/reparar.js', 'AVV18Reparar'), cargarV18Reparar = () => cargarV18().then(reparar18); AV.v18RepararTest = o => cargarV18Reparar().then(r => r.test(o)); if (v18On) alPrimerGesto(cargarV18Reparar); // frente B: puente colgante roto → reparado
    const ciclo18 = aDemanda('src/game/v18/ciclo.js', 'AVV18Ciclo'), cargarV18Ciclo = () => Promise.all([cargarCombate(), cargarV18Descubrir(), cargarV18Reparar()]).then(ciclo18); AV.v18CicloTest = o => cargarV18Ciclo().then(c => c.test(o)); if (v18On) alPrimerGesto(cargarV18Ciclo); // frente D (D14): duelo → materiales → puente → pista del reto extra
    const misterio18 = aDemanda('src/game/v18/misterio.js', 'AVV18Misterio'), cargarV18Misterio = () => Promise.all([cargarV18(), cargarMarana()]).then(misterio18); AV.v18MisterioTest = o => cargarV18Misterio().then(m => m.test(o)); if (v18On) cuandoToque(() => G.v18 && enCap1() && !mundoV18('puente_villa', 'reparado'), cargarV18Misterio); // KIMI-070 (W32: solo mientras el puente está roto): la Maraña vigía el puente roto (misterio visual+sonido)
    // V18.1 · primera amenaza de fantasía, la Sombra de Tormenta (Kelvin 5-nov; src/game/v18/amenaza.js): después del puente y el duelo
    const amenaza18 = aDemanda('src/game/v18/amenaza.js', 'AVV18Amenaza'), cargarV18Amenaza = () => Promise.all([cargarCombate(), cargarV18Reparar(), cargarV18Fx()]).then(amenaza18); AV.v18AmenazaTest = o => cargarV18Amenaza().then(a => a.test(o)); if (v18On) alPrimerGesto(cargarV18Amenaza);
    // Decisión 14 (Kelvin 5-nov): «Duelo de 2 jugadores» en la misma computadora, en tiempo real (src/game/v18/duelo2.js). En táctil no se carga.
    const duelo218 = aDemanda('src/game/v18/duelo2.js', 'AVV18Duelo2'), cargarV18Duelo2 = () => Promise.all([cargarCombate(), cargarV18Fx()]).then(duelo218); AV.v18Duelo2Test = o => cargarV18Duelo2().then(d => d.test(o));
    if (v18On && !(window.matchMedia && matchMedia('(pointer: coarse)').matches)) cuandoToque(() => { const c = G.v18combate && G.v18combate.sitio; return c && cerca(c.x, c.z, 40); }, cargarV18Duelo2); // W32: al acercarse a la explanada del duelo
    // V18.1 · cuatro cotorras más que llegan con los hitos (Quiebro, Ala fuerte, Lluvia de semillas, Ojo del cenote; Kelvin 5-nov)
    const nuevas18 = aDemanda('src/game/v18/nuevas.js', 'AVV18Nuevas'), cargarV18Nuevas = () => Promise.all([cargarCombate(), cargarV18Amenaza()]).then(nuevas18); AV.v18NuevasTest = o => cargarV18Nuevas().then(n => n.test(o)); if (v18On) alPrimerGesto(cargarV18Nuevas);
    AV.v18PoderesTest = o => Promise.all([cargarV18Nuevas(), cargarV18Descubrir()]).then(([n]) => n.testPoderes(o)); // cierre: los 34 poderes, uno a uno (desbloqueo, G/botón, guardado, inglés)
    // V18.1 · segunda y tercera amenaza de fantasía (Kelvin 5-nov): Serpiente de la Maraña (nudos) y Sapo Encantado (minijuego de ritmo)
    const serpiente18 = aDemanda('src/game/v18/serpiente.js', 'AVV18Serpiente'), cargarV18Serpiente = () => Promise.all([cargarV18(), cargarMarana()]).then(serpiente18); AV.v18SerpienteTest = o => cargarV18Serpiente().then(x => x.test(o)); if (v18On) cuandoToque(() => mundoV18('sombra_tormenta', 'dispersa') && !mundoV18('serpiente_marana', 'deshecha'), cargarV18Serpiente); // W32: sale tras la Sombra y hasta deshacerla
    const sapo18 = aDemanda('src/game/v18/sapo.js', 'AVV18Sapo'), cargarV18Sapo = () => cargarV18().then(sapo18); AV.v18SapoTest = o => cargarV18Sapo().then(x => x.test(o)); if (v18On) cuandoToque(() => mundoV18('serpiente_marana', 'deshecha') && !mundoV18('sapo_encantado', 'despierto'), cargarV18Sapo); // W32: sale tras la Serpiente y hasta despertarlo
    const golf18 = aDemanda('src/game/v18/minigolf.js', 'AVV18Minigolf'), cargarV18Golf = () => Promise.all([cargarV18(), hab18(), cargarV18Fx()]).then(golf18); AV.v18MinigolfTest = o => cargarV18Golf().then(x => x.test(o)); if (v18On) alPrimerGesto(cargarV18Golf); // V18.1 Amazona Mini Golf: un hoyo en Villa Raíz (docs/DIRECTIVA_MINIGOLF_V18_1.md)
    // V18.3 · personajes históricos (sistema único src/game/v18/npc.js, datos content/comun/personajes_v18.js) y su primera misión en Puerto de La Mina (src/game/v18/puerto.js)
    const NPC18_SRC = 'src/game/v18/npc.js', npc18 = aDemanda(NPC18_SRC, 'AVV18Npc'), puerto18 = aDemanda('src/game/v18/puerto.js', 'AVV18Puerto'), cargarV18Puerto = () => Promise.all([cargarV18(), hab18(), cargarV18Fx(), AVE.assets.script('content/comun/personajes_v18.js')]).then(npc18).then(puerto18);
    AV.v18PuertoTest = o => { const antes = { v18: G.V18, npc: !!window.AVV18Npc, puerto: !!window.AVV18Puerto, glb: (performance.getEntriesByType('resource') || []).filter(r => /models\/personajes\//.test(r.name)).length }; return cargarV18Puerto().then(p => p.test(Object.assign({ antes }, o))); }; if (v18On) cuandoToque(() => mundoV18('puente_villa', 'reparado'), cargarV18Puerto); // W32: antes de reparar el puente no sale nada (su check 2)
    // V18.3 fase 5 · Chispa (shiba piloto, rival cómica) y su «Carrera con Chispa» en Los Portales del Río (src/game/v18/chispa.js; fila 'chispa' de personajes_v18.js)
    const chispa18 = conMarca('v18chispa', 45.8, 54.3, 'Carrera con Chispa', 'src/game/v18/chispa.js', 'AVV18Chispa'), cargarV18Chispa = () => Promise.all([cargarV18(), AVE.assets.script('content/comun/personajes_v18.js'), AVE.assets.script(NPC18_SRC), AVE.assets.script('src/game/v18/chispa.js')]).then(npc18).then(chispa18);
    AV.v18ChispaTest = o => { const antes = { v18: G.V18, chispa: !!window.AVV18Chispa, glb: (performance.getEntriesByType('resource') || []).filter(r => /models\/personajes\/chispa/.test(r.name)).length }; return cargarV18Chispa().then(c => c.test(Object.assign({ antes }, o))); }; if (v18On) cuandoToque(() => G.V18 && enCap1() && cerca(45.8, 54.3, 130), cargarV18Chispa); // W32: SITIO.salida de chispa.js
    // V18.3 fase 5 · Maestro Moon (gato mentor, sin armas) y su «Entrenamiento de esquiva» en el Embarcadero de las Canoas (src/game/v18/moon.js; fila 'maestromoon' de personajes_v18.js)
    const moon18 = conMarca('v18moon', -146.5, 28, 'Entrenamiento con Moon', 'src/game/v18/moon.js', 'AVV18Moon'), cargarV18Moon = () => Promise.all([cargarV18(), AVE.assets.script('content/comun/personajes_v18.js'), AVE.assets.script(NPC18_SRC), AVE.assets.script('src/game/v18/moon.js')]).then(npc18).then(moon18);
    AV.v18MoonTest = o => { const antes = { v18: G.V18, moon: !!window.AVV18Moon, glb: (performance.getEntriesByType('resource') || []).filter(r => /models\/personajes\/maestro_moon/.test(r.name)).length }; return cargarV18Moon().then(m => m.test(Object.assign({ antes }, o))); }; if (v18On) cuandoToque(() => G.V18 && enCap1() && cerca(-146.5, 28, 130), cargarV18Moon); // W32: SITIO de moon.js
    // V18.3 fase 5 · Guardián del Primer Vuelo (piloto cotorra, mentor de vuelo) y su «Circuito del Primer Vuelo» en el suroeste de la isla (src/game/v18/guardian.js; fila 'guardian' de personajes_v18.js)
    const guardian18 = conMarca('v18guardian', -63, -37, 'Circuito del Primer Vuelo', 'src/game/v18/guardian.js', 'AVV18Guardian'), cargarV18Guardian = () => Promise.all([cargarV18(), AVE.assets.script('content/comun/personajes_v18.js'), AVE.assets.script(NPC18_SRC), AVE.assets.script('src/game/v18/guardian.js')]).then(npc18).then(guardian18);
    AV.v18GuardianTest = o => { const antes = { v18: G.V18, guardian: !!window.AVV18Guardian, glb: (performance.getEntriesByType('resource') || []).filter(r => /models\/personajes\/guardian_vuelo/.test(r.name)).length }; return cargarV18Guardian().then(g => g.test(Object.assign({ antes }, o))); }; if (v18On) cuandoToque(() => G.V18 && enCap1() && cerca(-63, -37, 130), cargarV18Guardian); // W32: SITIO.salida de guardian.js
    // V18.2 evolución, niveles y alianza Eco Protector (src/game/v18/evolucion.js; docs/equipo/V18_2_DISENO.md). La prueba mira antes de cargarlo si ya estaba sin la bandera.
    const evo18 = aDemanda('src/game/v18/evolucion.js', 'AVV18Evolucion'), cargarV18Evo = () => Promise.all([cargarCombate(), cargarV18Descubrir(), cargarV18Fx()]).then(evo18); AV.v18EvolucionTest = o => { const antes = { v18: G.V18, cargado: !!window.AVV18Evolucion, evo: !!G.v18evo, script: !!document.querySelector('script[src*="v18/evolucion.js"]') }; return cargarV18Evo().then(e => e.test(Object.assign({ antes }, o))); }; if (v18On) alPrimerGesto(cargarV18Evo);
    // KIMI-150: poderes en exploración (columna «Explorando» de la matriz; tecla G o botón Poder en táctil)
    const explorar18 = aDemanda('src/game/v18/explorar.js', 'AVV18Explorar'), cargarV18Explorar = () => Promise.all([cargarV18(), hab18(), cargarV18Fx()]).then(explorar18); AV.v18ExplorarTest = o => cargarV18Explorar().then(x => x.test(o)); if (v18On) alPrimerGesto(cargarV18Explorar);
    const cargarSorpresas = aDemanda('src/game/sorpresas.js', 'AVSorpresas'); AV.sorpresasTest = o => cargarSorpresas().then(s => s.test(o)); alPrimerGesto(cargarSorpresas); // CG-45, sin tocar ciudad_viva.js
    if (G.terreno.mapa && ((G.terreno.mapa.agua && G.terreno.mapa.agua.bahiaBio) || (G.terreno.mapa.lugares && G.terreno.mapa.lugares.bahiaBio))) { const maravillas = aDemanda('src/game/maravillas.js', 'AVMaravillas'); AV.maravillasTest = o => maravillas().then(m => m.test(o)); alPrimerGesto(maravillas); } // src/game/maravillas.js
    if (G.terreno.mapa && G.terreno.mapa.escenaKelvin) { const guineo = aDemanda('src/game/guineo.js', 'AVGuineo'); AV.guineo = guineo; AV.guineoTest = o => guineo().then(g => g.test(o)); alPrimerGesto(guineo); } // src/game/guineo.js (huertos de guineo, C12)
    if (G.bohiosFactor > 1) { const bohios = aDemanda('src/game/bohios.js', 'AVBohios'); AV.bohios = bohios; AV.bohiosTest = o => bohios().then(b => b.test(o)); alPrimerGesto(bohios); } // src/game/bohios.js (G27: interior del bohío de Villa Raíz)
    if (G.vegetacion && G.vegetacion.listo && G.terreno.mapa && G.terreno.mapa.flora) { const dosel = aDemanda('src/engine/dosel.js', 'AVDosel'); AV.dosel = () => dosel().then(d => d.listo.then(() => d)); AV.doselTest = o => dosel().then(d => d.test(o)); alPrimerGesto(() => G.vegetacion.listo.then(dosel)); } // src/engine/dosel.js (dosel por celdas, AW3)
    if (G.guardado.test) AV.saveTest = async o => { // src/engine/guardado.js + el capítulo elegido al volver a entrar (AV.capituloElegidoTest)
      const r = await G.guardado.test(o);
      if (!AV.capituloElegidoTest || !r || !Array.isArray(r.results)) return r;
      const c = await AV.capituloElegidoTest();
      const results = r.results.concat(c.results.map(x => Object.assign({}, x, { name: 'Capítulo elegido: ' + x.name })));
      return Object.assign({}, r, { passed: results.filter(x => x.ok).length, total: results.length, results });
    };
    if (G.comic.test) AV.comicTest = o => G.comic.test(o); // src/game/comic.js
    if (G.renderer.contextTest) AV.contextTest = o => G.renderer.contextTest(o); // src/engine/renderer.js
    if (G.streaming && G.streaming.test) AV.streamingTest = o => G.streaming.test(o); // src/engine/streaming.js
    if (G.vegetacion && G.vegetacion.test) AV.floraTest = o => G.vegetacion.test(o); // src/engine/vegetacion.js (AW2, bosque lleno)
    if (G.guiaControles) AV.controlesTest = o => controles().then(m => m.test(o)); // src/game/guia_controles.js
    if (G.input.test) AV.teclasTest = o => G.input.test(o); // src/engine/input.js
    if (G.input.tactil) AV.tactilTest = o => G.input.tactil(o); // CG-40: joystick bajo el dedo, cámara con el otro, despegar y vibrar
    if (G.camara.test) AV.camaraTest = o => G.camara.test(o); // src/engine/camara.js (mirar arriba, 31-oct)
    if (G.accesibilidad && G.accesibilidad.test) AV.accesibilidadTest = o => G.accesibilidad.test(o); // src/game/accesibilidad.js
    // Mis récords y Compartir (src/game/records.js): se carga al pedirlo (pausa, portada o «Compartir» del cómic) y junto con los retos,
    // para anotar cada resultado a nombre de la cotorra que jugó. Todo local; la partida no se toca
    let records = null;
    const cargarRecords = () => records || (records = AVE.assets.script('src/game/records.js').then(() => window.AVRecords(G), e => { records = null; throw e; }));
    // Bandada de la casa (src/game/equipos.js): local, sin red. Se carga con «Mis récords», no en la descarga inicial.
    let equipos = null;
    const cargarEquipos = () => equipos || (equipos = AVE.assets.script('src/game/equipos.js').then(() => window.AVEquipos(G), e => { equipos = null; throw e; }));
    const conBandada = r => cargarEquipos().catch(() => {}).then(() => r);
    AV.records = o => cargarRecords().then(r => conBandada(r).then(x => x.abrir(o)), () => G.ui.toast('No se pudieron abrir tus récords. Prueba otra vez.', 3000));
    AV.recordsTest = o => cargarRecords().then(r => r.test(o));
    AV.equiposTest = o => cargarEquipos().then(m => m.test(o));
    for (const [id, accion, o] of [['b-records', 'abrir', { desde: 'pausa' }], ['b-records-title', 'abrir', { desde: 'portada' }], ['c-share', 'compartirComic']]) {
      const b = document.getElementById(id);
      if (b) b.addEventListener('click', () => cargarRecords().then(r => (accion === 'abrir' ? conBandada(r) : Promise.resolve(r)).then(x => x[accion](o)), () => G.ui.toast('No se pudo cargar. Prueba otra vez.', 3000)));
    }
    // Modo Retos (src/game/retos.js): se carga al pedirlo (botón «Retos» de la portada o de la pausa), no en la descarga inicial
    let retos = null;
    const cargarRetos = () => retos || (retos = AVE.assets.script('src/game/retos.js').then(() => { cargarRecords().catch(() => {}); return window.AVRetos(G); }, e => { retos = null; throw e; }));
    AV.retos = () => cargarRetos().then(r => (r.activo ? r.salir() : r.abrir()), () => G.ui.toast('No se pudieron cargar los retos. Prueba otra vez.', 3000));
    AV.retosTest = o => cargarRetos().then(r => r.test(o));
    AV.cg17Test = o => cargarRetos().then(r => r.cg17Test(o));
    // «Save the Parrot» (src/game/rescate.js): cartel con caja nido tras la crecida; se carga sola tras el arranque y al pedir su prueba
    let rescate = null;
    const cargarRescate = () => rescate || (rescate = AVE.assets.script('src/game/rescate.js').then(() => window.AVRescate(G), e => { rescate = null; throw e; }));
    AV.rescateTest = o => cargarRescate().then(r => r.test(o));
    alPrimerGesto(cargarRescate);
    // Bandada de cotorras (src/game/bandada.js): se carga sola al arrancar (en «bajo», la mínima: QA-110) y al pedir su prueba
    let bandada = null;
    const cargarBandada = () => bandada || (bandada = AVE.assets.script('src/game/bandada.js').then(() => window.AVBandada(G), e => { bandada = null; throw e; }));
    AV.bandadaTest = o => cargarBandada().then(b => b.test(o));
    alPrimerGesto(cargarBandada);
    // Comunidades (CG-21, src/game/comunidades.js): rutinas en Villa Raíz, Villa Mangle y la otra orilla.
    // Se dibujan en las mallas de la bandada. En calidad baja, 2 por sitio (QA-110: el iPhone arranca en bajo).
    let comunidades = null;
    const cargarComunidades = () => comunidades || (comunidades = cargarBandada().then(() => AVE.assets.script('src/game/comunidades.js')).then(() => window.AVComunidades(G), e => { comunidades = null; throw e; }));
    AV.comunidadesTest = o => cargarComunidades().then(c => c.test(o));
    alPrimerGesto(cargarComunidades);
    // Ciudad viva (N17, src/game/ciudad_viva.js): cotorras que viven en la Ciudad de los 36, en las mallas de la bandada.
    // En calidad baja también se carga, con 6 (QA-110/0l: si no, en el iPhone la ciudad sale vacía).
    let ciudadViva = null;
    const cargarCiudadViva = () => ciudadViva || (ciudadViva = cargarBandada().then(b => (G.bandada && G.bandada.residentes) || b).then(() => AVE.assets.script('src/game/ciudad_viva.js')).then(() => window.AVCiudadViva(G), e => { ciudadViva = null; throw e; }));
    AV.ciudadVivaTest = o => cargarCiudadViva().then(c => c.test(o));
    alPrimerGesto(cargarCiudadViva);
    // Momentos «wow» del capítulo 1 (src/game/wow.js, BM20): despegue del mirador y luciérnagas del coro; se carga tras el primer gesto y al pedir su prueba
    let wow = null;
    const cargarWow = () => wow || (wow = cargarBandada().catch(() => {}).then(() => AVE.assets.script('src/game/wow.js')).then(() => window.AVWow(G), e => { wow = null; throw e; }));
    AV.wowTest = o => cargarWow().then(w => w.test(o));
    alPrimerGesto(cargarWow);
    // «Juice» de vuelo (src/game/juice.js, DIVERSION_CAP1 mejora 6): rasante, picado, aterrizaje perfecto y pétalos; tras el primer gesto y al pedir su prueba
    const cargarJuice = aDemanda('src/game/juice.js', 'AVJuice');
    AV.juiceTest = o => cargarJuice().then(j => j.test(o));
    alPrimerGesto(cargarJuice);
    const cargarTrucos = aDemanda('src/game/trucos.js', 'AVTrucos'); AV.trucosTest = o => cargarTrucos().then(t => t.test(o)); alPrimerGesto(cargarTrucos); // CG-41
    const cargarHumor = aDemanda('src/game/humor.js', 'AVHumor'); AV.humorTest = o => cargarHumor().then(h => h.test(o)); alPrimerGesto(cargarHumor); // CG-42
    const cargarEscondite = aDemanda('src/game/escondite.js', 'AVEscondite'); AV.esconditeTest = o => cargarEscondite().then(e => e.test(o)); alPrimerGesto(cargarEscondite); // CG-43
    const cargarMarana = aDemanda('src/game/marana.js', 'AVMarana'); AV.maranaTest = o => cargarMarana().then(m => m.test(o)); alPrimerGesto(cargarMarana); // CG-46
    const cargarFamilia = aDemanda('src/game/familia.js', 'AVFamilia'); AV.familiaTest = o => cargarFamilia().then(f => f.test(o)); alPrimerGesto(cargarFamilia); // CG-53
    const cargarRendimiento = aDemanda('src/game/rendimiento_modulos.js', 'AVRendimientoModulos');
    AV.rendimientoModulosTest = o => Promise.all([cargarTrucos(), cargarHumor(), cargarEscondite(), cargarVecinos(), cargarSorpresas(), cargarMarana(), cargarRendimiento()]).then(() => G.rendimientoModulos.test(o)); // CG-47
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
    if (G.diario && G.diario.test) AV.diarioTest = o => G.diario.test(o); // src/game/diario.js (BM72)
    if (G.idioma && G.idioma.test) AV.idiomaTest = o => G.idioma.test(o); // src/game/idioma.js
    alPrimerGesto(cargarMarcador); // cuenta desde que el jugador empieza (Jugar), no desde la portada
    const bRetos = document.getElementById('b-retos'), portada = document.getElementById('title');
    if (bRetos) bRetos.addEventListener('click', () => AV.retos());
    // «¿Cómo quieres jugar?» (src/game/menu_modos.js): las tarjetas de la portada abren cada modo (también el valor «retos» de la portada anterior) y «Cambiar de juego» vuelve al menú
    // La temporada (AV1, en el mismo archivo): progreso de los 6 capítulos, «Siguiente capítulo» en el panel final y la pantalla «Capítulos» (portada y pausa)
    if (portada && window.AVMenuModos) { const menu = window.AVMenuModos(G, { retos: cargarRetos, records: () => cargarRecords().then(r => conBandada(r)) }); AV.menuModos = menu; AV.menuModosTest = o => menu.test(o); AV.temporada = menu.temporada; AV.temporadaTest = o => menu.temporada.test(o); AV.capituloElegidoTest = o => menu.temporada.capituloTest(o); }
    const recAlm = (P.meta && P.meta.almacen) || P.id, recRetos = recAlm + '.retos', recCasa = recAlm + '.records', recEquipos = recAlm + '.equipos', recDones = recRetos + '.dones'; // récords aparte de la partida; «Nuevo estudiante» los borra (también el libro, la bandada, Retos «Con dones» y los descubrimientos)
    const recDesc = [recAlm + '.trucos', recAlm + '.escondite', recAlm + '.ciudadVisitas', recAlm + '.marana', recAlm + '.vecinos', recAlm + '.humor', recAlm + '.retosDia'];
    AV.retosDiaTest = o => Promise.resolve(G.retosDia.test(o)); // CG-52
    const cargarMaze = aDemanda('src/game/maze.js', 'AVMaze'); AV.maze = () => cargarMaze().then(m => m.abrir()); AV.mazeTest = o => cargarMaze().then(m => m.test(o)); if (/[?&]mini=maze\b/.test(location.search)) { const ir = () => setTimeout(() => AV.maze().catch(() => {}), 400); if (portada && portada.open) portada.addEventListener('close', ir, { once: true }); else ir(); } // Amazona Maze (AB1, src/game/maze.js): prototipo oculto; ?mini=maze o AV.maze(); AV.mazeTest()
    const cargarRiver = aDemanda('src/game/river_rush.js', 'AVRiverRush'); AV.riverRush = () => cargarRiver().then(r => r.abrir()); AV.riverTest = o => cargarRiver().then(r => r.test(o)); if (/[?&]mini=river\b/.test(location.search)) { const ir = () => setTimeout(() => AV.riverRush().catch(() => {}), 400); if (portada && portada.open) portada.addEventListener('close', ir, { once: true }); else ir(); } // River Rush (AC1, src/game/river_rush.js): prototipo oculto; ?mini=river o AV.riverRush(); AV.riverTest()
    G.on('nuevoEstudiante', () => { for (const k of [recRetos, recCasa, recEquipos, recDones].concat(recDesc)) { try { localStorage.removeItem(k); } catch (e) { /* sin almacén */ } } });
    // Música y ambiente sintetizados (src/game/musica.js): se cargan tras el primer gesto del jugador (pointerdown o tecla), no en la descarga inicial
    let musica = null;
    const cargarMusica = () => musica || (musica = AVE.assets.script('src/game/musica.js').then(() => window.AVMusica(G), e => { musica = null; throw e; }));
    AV.musica = () => cargarMusica();
    AV.musicaTest = o => cargarMusica().then(m => m.test(o));
    // Clima de El Yunque (src/game/clima.js): sol, llovizna, aguacero y neblina; se carga en el primer gesto y al pedir su prueba
    const cargarClima = aDemanda('src/game/clima.js', 'AVClima');
    AV.climaTest = o => cargarClima().then(c => c.test(o));
    alPrimerGesto(cargarClima);
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { cargarMusica().catch(() => {}); }, { once: true, passive: true });
    // Look de color (src/game/look.js): «vibrant_toon» es el de fábrica (DEFECTO); ?look=fabrica|vibrante|soleado|toon y sección oculta en la pausa
    // Atardecer del coquí (C9, src/game/atardecer.js): lo carga el pack cuando empieza el coro (AV.atardecer); ?atardecer=1 lo fuerza
    const cargarAtardecer = aDemanda('src/game/atardecer.js', 'AVAtardecer');
    AV.atardecer = cargarAtardecer; AV.atardecerTest = o => cargarAtardecer().then(a => a.test(o));
    if (/[?&]atardecer=/.test(location.search)) cargarAtardecer().catch(() => {});
    // Amazona Flight (C14, src/game/flight.js): prototipo oculto (fase 3 la deciden Kelvin y Fernando); ?mini=flight (al cerrar la portada) o AV.flight() lo abren; AV.flightTest()
    const cargarFlight = aDemanda('src/game/flight.js', 'AVFlight'); AV.flight = () => cargarFlight().then(f => f.abrir()); AV.flightTest = o => cargarFlight().then(f => f.test(o)); if (/[?&]mini=flight\b/.test(location.search)) { const ir = () => setTimeout(() => AV.flight().catch(() => {}), 400); if (portada && portada.open) portada.addEventListener('close', ir, { once: true }); else ir(); }
    const cargarTren = aDemanda('src/game/tren.js', 'AVTren'); AV.tren = () => cargarTren().then(t => t.abrir()); AV.trenTest = o => cargarTren().then(t => t.test(o)); if (/[?&]mini=tren\b/.test(location.search)) { const ir = () => setTimeout(() => AV.tren().catch(() => {}), 400); if (portada && portada.open) portada.addEventListener('close', ir, { once: true }); else ir(); } // El tren de Vittata (C16, src/game/tren.js): ?mini=tren o AV.tren(); AV.trenTest()
    // Manga Toon (G17, src/game/manga.js): prototipo aparte del cómic; ?manga=demo o AV.manga(); AV.mangaTest(). No está en el menú.
    const cargarManga = aDemanda('src/game/manga.js', 'AVManga'); AV.manga = () => cargarManga().then(m => m.abrir()); AV.mangaTest = o => cargarManga().then(m => m.test(o)); if (/[?&]manga=demo\b/.test(location.search)) { const ir = () => setTimeout(() => AV.manga().catch(() => {}), 600); if (portada && portada.open) portada.addEventListener('close', ir, { once: true }); else ir(); }
    const cargarLook = aDemanda('src/game/look.js', 'AVLook');
    AV.lookTest = o => cargarLook().then(l => l.test(o));
    cargarLook().catch(() => {}); // ya, no a los 7 s: el look se aplica antes del primer cuadro del mundo (la portada lo tapa), sin salto de color
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
