/* Content pack cap1 · pruebas automáticas del capítulo (AV.selfTest y AV.missionTest)
   Recorren la historia, el creador, el cómic, la exportación, el guardado, las misiones, el Diario y la ropa.
   Usan las ayudas del motor (G.pruebas) y las piezas del pack en G.c. */
(function () {
  'use strict';

  async function selfTest(G, T, opts) {
    opts = opts || {};
    const S = G.S, $ = G.util.$, C = G.c, PLACES = G.terreno.places, had = G.eventos.had, CM = G.comic, SV = G.guardado;
    const { out, check, result } = T.runner();
    const { teleport, tick, drain, useAt } = T;
    const saveCharacter = d => G.creador.saveCharacter(d);
    const action = () => G.interaccion.action();
    const keep = T.keepSave();
    G.quiet = true;
    SV.reset(true);
    // Creador de personaje
    check('Nombre vacío se rechaza', saveCharacter({ name: '', preset: 'agilis', outfit: 'azul', accessory: 'gafas' }) !== null);
    check('Nombre con símbolos raros se rechaza', saveCharacter({ name: '<b>x</b>', preset: 'agilis', outfit: 'azul', accessory: 'gafas' }) !== null);
    check('Personaje válido se guarda', saveCharacter({ name: 'Nube Azul', preset: 'versicolor', outfit: 'azul', accessory: 'gafas' }) === null && S.profile.created && had('PlayerCharacterCreated'));
    await G.actores.refreshCompanion();
    check('El aprendiz aparece en el mundo', G.actores.companion.visible || !!(G.actores.companion3D && G.actores.companion3D.root.visible));
    check('Vittata despierta junto al taller', Math.hypot(S.pos.x - SV.spawn.x, S.pos.z - SV.spawn.z) < 0.1);
    useAt('maquina'); drain(); useAt('transmisor'); drain();
    check('Taller explorado y misión con Luma', S.step === 1 && had('WorkshopExplored') && !!S.captures.workshop, 'paso ' + S.step);
    useAt('luma'); drain();
    check('Luma da la misión', S.step === 2 && had('LumaHelped'), 'paso ' + S.step);
    // Luma aporta 3 tablas: bastan 4 recogidas (1 madera, 2 piedras y la pieza de la poza)
    for (const id of ['m1', 'p1', 'p2', 'c1']) useAt(id);
    check('Recursos recolectados', S.step === 3 && had('ResourcesCollected'), JSON.stringify(S.inv));
    drain(); // escena evento:ResourcesCollected
    useAt('postA', 1, 1); $('c-close').click(); drain();
    useAt('postB', 1, 1); $('c-close').click(); drain();
    check('Dos terrenos inspeccionados', S.step === 4 && S.events.filter(e => e.key === 'LandInspected').length === 2, 'paso ' + S.step);
    C.startBuild('A'); teleport(PLACES.A.x + 50, PLACES.A.z, 0, 1); tick(0.1);
    const build = () => C.build();
    check('Construcción fuera del terreno rechazada', build() && !build().valid, build() && build().reason);
    teleport(PLACES.A.x, PLACES.A.z - 1.5, 0, 1); tick(0.1);
    check('Construcción dentro del terreno válida', build() && build().valid, build() && build().reason);
    action(); drain();
    check('Refugio construido y materiales consumidos', S.refuge && S.inv.madera === 1 && S.inv.piedra === 0, JSON.stringify(S.inv));
    tick(4); check('La crecida sube el agua', S.water > G.terreno.waterBase + 0.5);
    tick(5); drain();
    check('Consecuencia visible: refugio inundado', S.refuge.damaged && C.refugeMesh().rotation.z > 0.1 && had('ShelterFlooded'));
    check('Aparece el Guardián', G.actores.npc('guardian').sp.visible && S.step === 5);
    C.syncRefugeInteractable(); useAt('refuge', 1.6, 0); drain(); // escena evento:ShelterDismantled
    check('Corregir: desarmar recupera materiales', !S.refuge && S.inv.madera === 4 && S.inv.piedra === 2, JSON.stringify(S.inv));
    useAt('postB', 1, 1);
    const bb = document.getElementById('c-build'); if (bb) bb.click();
    teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); drain(); tick(9); drain();
    check('Reconstruido en la colina y a salvo', S.refuge && S.refuge.parcel === 'B' && !S.refuge.damaged && had('ShelterRelocated'));
    useAt('guardian', 1.4, 0); drain();
    check('Guardián conocido y banco desbloqueado', had('GuardianMet') && S.benchUnlocked && C.bench.visible && S.step === 6);
    // M3 (sprint 1): el transmisor pide el coro de coquíes antes de encenderse
    useAt('transmisor'); drain(); if ($('ch-1')) $('ch-1').click(); drain();
    for (const b of C.BUSHES) { useAt(b.id, 1.3, 0); for (const n of b.song) C.simonPress(n); }
    useAt('transmisor');
    check('Símbolo de 36 fragmentos visible', !$('symbol').hidden);
    drain();
    check('Después del transmisor toca subir al mirador', S.step === 7 && !S.complete && $('symbol').hidden, 'paso ' + S.step);
    check('El mirador está en alto', C.mirador.position.y > PLACES.villa.base + 2, C.mirador.position.y.toFixed(1));
    useAt('mirador', 2.4, 0); drain();
    check('Capítulo completo', S.transmitterOn && S.boatPlan && S.complete && had('ChapterCompleted') && !$('end').hidden);
    // Esquema de eventos
    const ev = S.events, SCHEMA = G.eventos.SCHEMA;
    const schemaOk = ev.every((e, i) => e.schemaVersion === SCHEMA && e.saveId === S.saveId && e.seq === i + 1 && e.id === S.saveId + '-' + (i + 1) && typeof e.type === 'string' && e.chapter === 1 && 'location' in e && Array.isArray(e.characters) && 'sceneTemplate' in e && e.locKey === 'evt.' + e.key);
    check('Todos los eventos cumplen el esquema', schemaOk, ev.length + ' eventos');
    check('Eventos sin el nombre real ni datos personales', !JSON.stringify(ev).includes('Nube Azul'));
    const json = JSON.stringify(ev);
    check('Los eventos se serializan y vuelven igual', JSON.stringify(JSON.parse(json)) === json);
    // Cómic
    const panels = CM.comicPanels();
    check('El cómic usa solo eventos reales (4 viñetas)', panels.length === 4);
    check('Viñeta 1 presenta al personaje creado', panels[0].text.includes('Nube Azul'));
    check('Viñeta 3 cuenta la corrección real', panels[2].text.startsWith('Mi primera idea no era segura'), panels[2].text);
    await CM.openComic();
    S.comic.title = 'Prueba de cómic'; S.comic.cover = 'personaje'; CM.syncComicForm();
    check('Mover la viñeta 4 hacia arriba cambia el orden', CM.moveComicPanel(3, -1) && CM.orderedPanels()[2].id === 'final');
    check('No se puede mover fuera de rango', CM.moveComicPanel(0, -1) === false);
    S.comic.captions.final = 'Mi frase editada';
    check('Texto editado aparece en la viñeta', CM.orderedPanels().some(p => p.text === 'Mi frase editada'));
    for (const lay of ['grid', 'strip']) {
      for (const n of [1, 2, 3, 4]) {
        const bx = CM.comicLayout(n, lay, 1080, 1490, 380);
        const inside = bx.every(b => b.x >= 0 && b.y >= 380 && b.x + b.w <= 1080 && b.y + b.h <= 1490 && b.w > 100 && b.h > 100);
        const overlap = bx.some((a, i) => bx.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
        if (!inside || overlap) check(`Diseño ${lay} con ${n} viñetas`, false, JSON.stringify(bx));
      }
    }
    check('Diseños sin solapes y dentro de la página (8 casos)', !out.some(o => o.name.startsWith('Diseño') && !o.ok));
    S.comic.layout = 'strip';
    const png = await CM.exportComic('png');
    check('Exporta PNG válido', png.startsWith('data:image/png') && png.length > 50000, Math.round(png.length / 1024) + ' KB');
    const im = await G.assets.image(png);
    check('El PNG se decodifica a 1080×1520', im && im.width === 1080 && im.height === 1520, im ? im.width + '×' + im.height : 'no carga');
    await CM.exportComic('pdf');
    const pdf = CM.lastBlob;
    const head = new TextDecoder().decode(new Uint8Array(await pdf.slice(0, 8).arrayBuffer()));
    const tail = new TextDecoder().decode(new Uint8Array(await pdf.slice(pdf.size - 6).arrayBuffer()));
    check('Exporta PDF con cabecera y cierre correctos', head.startsWith('%PDF-1.4') && tail.includes('%%EOF') && pdf.size > 50000, Math.round(pdf.size / 1024) + ' KB');
    check('Exportaciones registradas', S.events.filter(e => e.key === 'ComicExported').length === 2);
    if (opts.saveFiles) {
      const post = (name, body) => fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body }).then(r => r.ok).catch(() => false);
      const pngBlob = await (await fetch(png)).blob();
      check('PNG enviado al servidor de pruebas', await post('comic.png', pngBlob));
      check('PDF enviado al servidor de pruebas', await post('comic.pdf', pdf));
      const portrait = await G.creador.portraitCanvasFor(512, true);
      check('Retrato enviado al servidor de pruebas', await post('retrato.png', await (await fetch(portrait.toDataURL('image/png'))).blob()));
    }
    $('comic').hidden = true;
    // Guardado, migración y respaldo
    const KEY = SV.KEY;
    check('Guardar funciona', SV.save(true));
    const snap = SV.serialize();
    SV.reset(true); check('Reiniciar limpia la partida', S.step === 0 && !S.refuge && !S.profile.created);
    try { localStorage.setItem(KEY, snap); } catch (e) { /* sin almacenamiento */ }
    check('Cargar restaura progreso, personaje, cómic y eventos', SV.load(true) && S.complete && S.profile.name === 'Nube Azul' && S.comic.layout === 'strip' && S.events.length > 15 && !!S.captures.final, S.events.length + ' eventos');
    const v2 = { v: 2, pos: { x: 1, z: 2, y: 0 }, facing: { x: 0, z: 1 }, step: 2, inv: { madera: 1, piedra: 0, componente: 0 }, examined: { maquina: true, transmisor: true },
      collected: ['m1'], evaluated: { A: false, B: false }, refuge: null, builds: [], guardianMet: false, benchUnlocked: false, transmitterOn: false, boatPlan: false, complete: false,
      indicators: { seguridad: '—', acceso: '—', habitat: '—' }, events: [{ type: 'PlayerCharacterCreated', t: 0, data: {} }, { type: 'WorkshopExplored', t: 5, data: {} }, { type: 'LumaHelped', t: 9, data: {} }], captures: {}, clock: 12 };
    try { localStorage.setItem(KEY, JSON.stringify(v2)); } catch (e) { /* sin almacenamiento */ }
    check('Partida v2 se migra a v3 sin perder progreso', SV.load(true) && S.step === 2 && S.collected[0] === 'm1' && S.events.length === 3 && S.events[1].type === 'LocationDiscovered' && S.events[2].seq === 3);
    try { localStorage.setItem(KEY, '{roto'); } catch (e) { /* sin almacenamiento */ }
    check('Partida dañada se rechaza y se guarda una copia', SV.load(true) === false && localStorage.getItem(KEY + '.unreadable') === '{roto');
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, step: 3 })); } catch (e) { /* sin almacenamiento */ }
    check('Partida v1 (incompatible) se rechaza', SV.load(true) === false);
    try { localStorage.setItem(KEY, JSON.stringify(Object.assign(JSON.parse(snap), { v: 3, step: 7 }))); } catch (e) { /* sin almacenamiento */ }
    check('Partida v3 terminada se migra a v4 como terminada', SV.load(true) && S.complete && S.step === G.misiones.DONE, 'paso ' + S.step);
    // Ruta directa a la colina
    SV.reset(true); saveCharacter({ name: 'Rio', preset: 'agilis', outfit: 'rojo', accessory: 'ninguno' });
    S.step = 4; S.evaluated = { A: true, B: true }; S.inv = { madera: 4, piedra: 2, componente: 1 };
    C.startBuild('B'); teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); drain(); tick(9); drain();
    check('Ruta colina directa: texto del cómic correcto', CM.comicPanels()[1] && CM.comicPanels().find(p => p.id === 'refugio').text.startsWith('Elegí construir en la colina'));
    check('Sin capítulo completo no hay viñeta final', !CM.comicPanels().some(p => p.id === 'final'));
    SV.reset(true);
    try { localStorage.removeItem(KEY + '.unreadable'); } catch (e) { /* sin almacenamiento */ }
    T.restoreSave(keep);
    G.quiet = false;
    return result();
  }

  // Pruebas del sprint 1: diálogos del .json, misiones de nado, vuelo y coro, Diario, ropa, guía, sonido y fugas
  async function missionTest(G, T) {
    const S = G.S, $ = G.util.$, C = G.c, PLACES = G.terreno.places, had = G.eventos.had, SV = G.guardado;
    const O = G.objetos, F = G.fisica, L = G.dialogo.L;
    const { check, result } = T.runner();
    const { teleport, tick, drain, useAt } = T;
    const keep = T.keepSave();
    G.quiet = true;
    SV.reset(true); G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
    // Diálogos
    const scenes = G.dialogo.escenas;
    check('dialogos_cap1.js carga las 27 escenas', scenes.length === 27, scenes.length + ' escenas');
    const unknown = scenes.filter(sc => { const [k, v] = sc.disparador.split(':'); return k === 'evento' ? !G.eventos.defs[v] : !['inicio', 'interact'].includes(k); });
    check('Cada disparador evento: existe en EVENT_DEFS', unknown.length === 0, unknown.map(x => x.id).join(', '));
    check('Escenas del mismo disparador se encadenan en orden', L('evento:ShelterRelocated').length === 4 && L('evento:ShelterRelocated')[2].who === 'Vittata');
    check('Emoción del .json llega a la cara de Vittata', L('evento:ShelterDismantled')[0].mood === 'angry' && L('interact:transmisor')[0].mood === 'sad');
    G.quiet = false; G.pack.inicio(G);
    check('Introducción con los disparadores inicio:', G.dialogo.open() && $('d-who').textContent === 'Narrador' && G.dialogo.queue.length === 5, G.dialogo.queue.length + 1 + ' líneas');
    let shook = false; while (G.dialogo.open()) { G.dialogo.next(); if (G.camara.juice.shake > 0.5) shook = true; }
    check('La Ruptura sacude la cámara', shook || G.renderer.REDUCED);
    G.quiet = true;
    useAt('transmisor');
    check('interact:transmisor usa el texto del guion', $('d-text').textContent === 'Este transmisor llevaba años mudo.', $('d-text').textContent);
    drain(); useAt('maquina'); drain();
    useAt('luma');
    check('interact:luma_inicio al hablar con Luma', $('d-who').textContent === 'Luma' && $('d-text').textContent.startsWith('¡Vittata!'));
    drain();
    // M1: nado
    check('c2 espera al paso 3 (la pieza del paso 2 sale del río)', !O.available(O.find('c2')));
    const c1 = O.find('c1');
    teleport(c1.x + 0.5, c1.z); S.pos.y = S.water - F.SWIM_DEPTH; tick(0.3);
    check('La poza es honda: flotando no se alcanza la pieza', F.MOVE.swimming && !S.collected.includes('c1') && !O.reachUnder(c1), 'fondo a ' + (S.pos.y - G.terreno.height(c1.x, c1.z)).toFixed(1) + ' m');
    G.input.keys.add('c'); tick(2.5); G.input.keys.delete('c');
    check('M1: buceando con C se recoge la pieza', S.collected.includes('c1') && S.missions.m1);
    const p3 = G.actores.player3D;
    check('M1 desbloquea las botas azules y Vittata las lleva', S.unlocked.includes('botas') && S.wear.feet && S.wear.feet.id === 'botas' && (!p3 || !!p3.mounted.feet));
    for (const id of ['m1', 'p1', 'p2']) useAt(id);
    drain();
    check('Con la pieza del río se completa la recolección', S.step === 3 && O.available(O.find('c2')), 'paso ' + S.step);
    // Guía
    const g3 = G.misiones.guideTarget();
    check('La guía apunta al terreno sin inspeccionar', g3 && Math.hypot(g3.x - PLACES.A.post.x, g3.z - PLACES.A.post.z) < 0.01);
    // M2: sin anillos de vuelo; queda el hueco de la misión educativa (docs/equipo/EDUCATIVO.md)
    const edu = G.misiones.missions.find(m => m.id === 'educativa');
    check('Sin misión de anillos: ni datos, ni anillos en el mundo, ni línea en el HUD', !G.misiones.missions.some(m => m.id === 'm2') && !G.pack.anillos && !G.c.RINGS && !/Anillos/.test($('missions').textContent), $('missions').textContent);
    check('El hueco "educativa" existe vacío y el motor lo ignora', edu && edu.pasos.length === 0 && S.missions.educativa === false && (G.misiones.check(), !S.missions.educativa), JSON.stringify(S.missions));
    const pava = G.misiones.unlocks.find(u => u.clave === 'pava');
    check('La pava queda reservada para la misión educativa', pava && pava.hito === 'educativa' && !S.unlocked.includes('pava') && !!G.misiones.lockOf('pava'));
    F.startFlying(); tick(0.5);
    check('Volar sobre el río ya no guía a ningún anillo', G.misiones.guideTarget() && G.misiones.guideTarget().y == null && !S.missions.educativa);
    F.toggleFly(); tick(1.5);
    // Diario de Campo y ropa por hitos
    const FIELD = G.diario.entries;
    const fauna = FIELD.filter(f => f.cat === 'fauna'), cult = FIELD.filter(f => f.cat === 'cultura');
    for (const f of fauna.slice(0, 4)) { teleport(f.x + 0.4, f.z); if (f.agua) S.pos.y = S.water - F.SWIM_DEPTH; tick(0.1); }
    check('Diario: 4 animales por proximidad dan la gorra de la bandera', S.field.length === 4 && S.unlocked.includes('gorra:pr'), S.field.join(','));
    for (const f of cult.slice(0, 4)) { teleport(f.x + 0.4, f.z); tick(0.1); }
    check('Diario: 4 objetos de cultura dan las maracas', S.unlocked.includes('mano:maracas'));
    for (const f of [...fauna.slice(4), ...cult.slice(4)]) { teleport(f.x + 0.4, f.z); if (f.agua) S.pos.y = S.water - F.SWIM_DEPTH; tick(0.1); }
    check('Diario 12/12 da la Deportiva 787 y los lentes dorados', S.field.length === 12 && S.unlocked.includes('camisa:deportiva') && S.unlocked.includes('lentes:#c9a227'));
    G.diario.open();
    check('El Diario muestra los 12 hallazgos', $('card').querySelectorAll('.diary li.found').length === 12);
    G.ui.hideCard();
    // Creador: lo bloqueado se ve apagado y no se puede elegir
    S.unlocked = S.unlocked.filter(k => k !== 'camisa:guayabera');
    const lockOf = G.misiones.lockOf;
    check('Bloqueos por pieza, estilo y color', !lockOf('botas') && !!lockOf('camisa', 'guayabera') && !lockOf('camisa', 'liso') && !lockOf('lentes', 'sol', '#c9a227'));
    // M3: coro de coquíes
    S.step = 6; S.inv = { madera: 1, piedra: 0, componente: 1 }; S.benchUnlocked = true;
    useAt('transmisor'); drain();
    check('M3: el transmisor pide voz y ofrece una elección con Luma', S.chorus && !S.transmitterOn && !!$('ch-0'));
    $('ch-0').click();
    check('La elección cambia la frase de Luma', $('d-text').textContent.startsWith('¡Eso, nena!') && had('LumaChoice'));
    drain();
    const b0 = C.BUSHES[0];
    useAt(b0.id, 1.3, 0);
    check('Un arbusto brillante abre el Simon del coquí', !!C.simon() && !!$('s-co'));
    C.simonPress(b0.song[0] === 'co' ? 'qui' : 'co'); C.simonPress(b0.song[0] === 'co' ? 'qui' : 'co');
    check('Tras 2 fallos aparece "Pasar"', !!$('s-skip') && C.simon().fails === 2);
    for (const n of b0.song) C.simonPress(n);
    for (const b of C.BUSHES.slice(1)) { useAt(b.id, 1.3, 0); for (const n of b.song) C.simonPress(n); }
    check('M3: 3 coquíes completan el coro y dan la guayabera', S.missions.m3 && S.unlocked.includes('camisa:guayabera'), S.coquis.join(','));
    useAt('transmisor');
    check('El coro enciende el transmisor', S.transmitterOn && !$('symbol').hidden);
    drain();
    // Sonido y feedback
    check('Sonidos sintéticos registrados (recoger, coquí, desbloqueo; sin anillo)', ['pickup', 'co', 'qui', 'unlock'].every(n => G.audio.log.includes(n)) && !G.audio.log.includes('ring'), G.audio.log.slice(-8).join(','));
    check('Partículas dentro del límite de 200', G.fx.live <= G.fx.MAX_PARTICLES, G.fx.live + ' vivas');
    // Guardado del progreso del sprint
    SV.save(true); const snap = SV.serialize(); SV.reset(true);
    try { localStorage.setItem(SV.KEY, snap); } catch (e) { /* sin almacenamiento */ }
    // Toda la ropa que hoy se puede ganar (la pava espera a la misión educativa)
    check('Se guardan misiones, Diario y ropa', SV.load(true) && S.missions.m3 && S.field.length === 12 && S.unlocked.length === G.misiones.unlocks.filter(u => u.hito !== 'educativa').length && S.wear.feet, S.unlocked.join(','));
    // Color y presupuesto de render
    const R = G.renderer.renderer;
    check('Juego y creador con el mismo color (sRGB + ACES)', R.outputEncoding === THREE.sRGBEncoding && R.toneMapping === THREE.ACESFilmicToneMapping);
    check('Pixel ratio limitado', R.getPixelRatio() <= (G.renderer.MOBILE ? 1.5 : 2), String(R.getPixelRatio()));
    // Fugas: cambiar de ropa muchas veces no aumenta geometrías ni texturas en la GPU
    if (window.AVCharacter) {
      try {
        const ch = await window.AVCharacter.create();
        const cv = document.createElement('canvas'); cv.width = cv.height = 64;
        const rr = new THREE.WebGLRenderer({ canvas: cv }), sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
        cam.position.set(0, 1, 4); sc.add(ch.root, new THREE.HemisphereLight());
        const looks = [{ head: { id: 'gorra', color: '#d6403a', style: 'liso' }, hand: { id: 'mano', color: '#d6403a', style: 'bandera' }, eyes: { id: 'gafas', color: '#2b2b2b' } },
          { head: { id: 'sombrero', color: '#8a6a3a' }, hand: { id: 'mano', color: '#d6403a', style: 'mapa' }, neck: { id: 'panuelo', color: '#3d8fb0' } }];
        const mem = () => ({ g: rr.info.memory.geometries, t: rr.info.memory.textures });
        for (let i = 0; i < 4; i++) { ch.applyLook({ species: 'vittata', accessories: looks[i % 2] }); rr.render(sc, cam); }
        const m0 = mem();
        for (let i = 0; i < 12; i++) { ch.applyLook({ species: 'vittata', accessories: looks[i % 2] }); rr.render(sc, cam); }
        const m1 = mem();
        check('Cambiar de ropa 12 veces no acumula memoria de GPU', m1.g <= m0.g && m1.t <= m0.t, `geometrías ${m0.g}→${m1.g}, texturas ${m0.t}→${m1.t}`);
        rr.dispose(); rr.forceContextLoss();
      } catch (e) { check('Cambiar de ropa no acumula memoria de GPU', false, String(e)); }
    }
    SV.reset(true);
    T.restoreSave(keep);
    G.quiet = false;
    return result();
  }

  AVE.registerPack({ id: 'cap1', pruebas: { selfTest, missionTest } });
})();
