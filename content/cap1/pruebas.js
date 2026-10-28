/* Content pack cap1 · pruebas automáticas del capítulo (AV.selfTest, AV.missionTest, AV.eduTest y AV.maestroTest)
   Recorren la historia, el creador, el cómic, la exportación, el guardado, las misiones, el Diario y la ropa,
   la misión educativa "La ruta de la gota" (jugada con las mismas acciones que un jugador) y el Modo Maestro.
   Usan las ayudas del motor (G.pruebas) y las piezas del pack en G.c. */
(function () {
  'use strict';

  // Lo que una prueba no debe dejar cambiado: el registro del aula (amazonaverse.aula.cap1) y el criadero (su clave y su
  // estado en memoria). Devuelve la función que lo restaura.
  function conservar(G) {
    const AU = G.aula, CR = G.criadero;
    const aula = AU && AU.activo ? leerAula(AU.KEY) : undefined;
    const criaK = CR && CR.KEY, cria = criaK ? leerAula(criaK) : undefined;
    const criaSt = CR && CR.estado ? JSON.stringify(CR.estado()) : null;
    return () => {
      if (aula !== undefined) { ponerAula(AU.KEY, aula); AU.recargar(); }
      if (criaK) ponerAula(criaK, cria);
      if (criaSt) {
        const st = CR.estado(); for (const k of Object.keys(st)) delete st[k]; Object.assign(st, JSON.parse(criaSt));
        if (CR.companero) G.emit('companero', CR.companero());
      }
    };
  }

  // Mejora 1 (DIVERSION_CAP1): Iguaca espera en la copa del flamboyán; para hablarle hay que volar y posarse a su lado.
  // Vuela hasta la percha (atajo: posición directa, como en la ruta de la gota) y se posa; devuelve si quedó junto a Iguaca.
  function posarseLuma(G, T) {
    const S = G.S, p = G.c.luma.percha;
    // La copa puede crecer cuando llega la vegetación (el alto real llega en una promesa). Si la percha
    // sube durante el tick, Vittata se queda debajo y Acción no ve a Iguaca (QA-64, solo con la máquina rápida).
    const sentar = () => { S.pos.x = p.x + 0.6; S.pos.y = p.y + 0.3; S.pos.z = p.z; S.vy = 0; G.fisica.MOVE.flying = false; };
    sentar(); T.tick(0.7); sentar();
    return G.c.luma.junto() && !G.fisica.MOVE.flying;
  }

  // QA-64: un choose del coro no puede quedar abierto, y una capa (final, cómic, creador o tarjeta)
  // no puede tragarse la Acción: si hay una, action() no habla con Iguaca y el paso se queda en 0.
  async function limpiarDialogo(G) {
    await new Promise(r => setTimeout(r, 0));
    soltarCapas(G);
    if (G.S) G.S.chorus = false;
  }
  function soltarCapas(G) {
    const $ = G.util.$;
    for (const id of ['end', 'comic', 'creator']) { const n = $(id); if (n) n.hidden = true; }
    if (G.ui && G.ui.cardOpen && G.ui.hideCard) G.ui.hideCard();
    if (G.dialogo && G.dialogo.open && G.dialogo.open()) G.dialogo.clear();
  }

  async function selfTest(G, T, opts) {
    opts = opts || {};
    const S = G.S, $ = G.util.$, C = G.c, PLACES = G.terreno.places, had = G.eventos.had, CM = G.comic, SV = G.guardado;
    const { out, check, result } = T.runner();
    const { teleport, tick, drain, useAt } = T;
    const saveCharacter = d => G.creador.saveCharacter(d);
    const action = () => G.interaccion.action();
    const keep = T.keepSave(), devolver = conservar(G);
    G.quiet = true;
    await limpiarDialogo(G);
    SV.reset(true);
    // Creador de personaje
    check('Nombre vacío se rechaza', saveCharacter({ name: '', preset: 'agilis', outfit: 'azul', accessory: 'gafas' }) !== null);
    check('Nombre con símbolos raros se rechaza', saveCharacter({ name: '<b>x</b>', preset: 'agilis', outfit: 'azul', accessory: 'gafas' }) !== null);
    check('Nombre con números, correo o "me llamo" se rechaza (seguridad infantil)', ['Ana123', 'yo@correo', 'me llamo Ana'].every(n => saveCharacter({ name: n, preset: 'agilis', outfit: 'azul', accessory: 'gafas' }) !== null));
    check('Personaje válido se guarda', saveCharacter({ name: 'Nube Azul', preset: 'versicolor', outfit: 'azul', accessory: 'gafas' }) === null && S.profile.created && had('PlayerCharacterCreated'));
    await G.creador.open(false); G.creador.pintarNombre('Luna del Mar'); $('p-save').click();
    check('El creador guarda el nombre de las listas y deja escribir el propio', S.profile.name === 'Luna del Mar' && $('p-name-a').tagName === 'SELECT' && !!$('p-name-libre'), S.profile.name);
    saveCharacter({ name: 'Nube Azul', preset: 'versicolor', outfit: 'azul', accessory: 'gafas' });
    await G.actores.refreshCompanion();
    if (G.criadero && G.criadero.companero) {
      // Regla de b7182ce: el compañero es la cría del criadero. Sin cría nacida no aparece; con una cría (simulada con el
      // evento 'companero', sin tocar el criadero del niño) aparece a la escala de su etapa: altura de Vittata × escala.
      const A = G.actores, c3 = A.companion3D, visible = () => A.companion.visible || !!(c3 && c3.root.visible);
      G.emit('companero', null);
      check('Sin cría nacida no hay compañero en el mundo', !visible());
      const altura = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
      const cria = { id: 'clasico', etapa: 'bebe', nivel: 1, nombre: 'Prueba', look: window.AVCharacter.defaultLook(), escala: 0.5 };
      G.emit('companero', cria); tick(0.2);
      const alto = c3 ? c3.root.scale.x * c3.height : 0;
      check('Con una cría aparece en el mundo con la escala de su etapa', !c3 || (c3.root.visible && Math.abs(alto - altura * 0.5) < 0.03), alto.toFixed(2) + ' m de ' + (altura * 0.5).toFixed(2));
      G.emit('companero', G.criadero.companero()); // vuelve la cría real del niño (o ninguna)
    } else check('El aprendiz aparece en el mundo', G.actores.companion.visible || !!(G.actores.companion3D && G.actores.companion3D.root.visible));
    check('Vittata despierta junto al taller', Math.hypot(S.pos.x - SV.spawn.x, S.pos.z - SV.spawn.z) < 0.1);
    // Mejora 1: Iguaca llama desde la copa; el primer objetivo es volar hasta ella y desde el suelo, bajo la copa, no se le habla
    check('Al despertar, Iguaca está arriba y el primer objetivo es volar hasta ella', C.luma.arriba() && S.step === 0 && /Iguaca/.test($('steps').querySelector('li.now').textContent) && C.luma.percha.y > G.terreno.height(C.luma.percha.x, C.luma.percha.z) + 3, C.luma.percha.y.toFixed(1) + ' m');
    check('Desde el suelo, bajo la copa, no se le puede hablar a Iguaca', !useAt('luma'));
    const posada = posarseLuma(G, T);
    check('Posada a su lado: Iguaca llamó desde arriba (bocadillo libre, el juego no se para) y se le puede hablar', posada && !!G.dialogo.libre() && G.dialogo.actual().who === 'Iguaca' && !G.ui.busy() && !!G.interaccion.nearest() && G.interaccion.nearest().id === 'luma', JSON.stringify(G.dialogo.actual()));
    action();
    check('La charla de la misión sí bloquea y sigue el orden del guion (interact:luma_inicio primero)', G.dialogo.open() && $('d-who').textContent === 'Iguaca' && $('d-text').textContent.startsWith('¡Vittata!'), $('d-text').textContent);
    drain();
    check('Iguaca da la misión, regala 3 tablas y baja a la plaza', S.step === 1 && had('LumaHelped') && S.inv.madera === 3 && !C.luma.arriba(), 'paso ' + S.step);
    useAt('maquina');
    check('Los comentarios de Vittata en el taller van en bocadillos (no bloquean)', !!G.dialogo.libre() && !G.dialogo.open() && !G.ui.busy());
    drain(); useAt('transmisor'); drain();
    check('Taller revisado: foto, evento y paso «Recolectar»', S.step === 2 && had('WorkshopExplored') && !!S.captures.workshop, 'paso ' + S.step);
    // Iguaca aporta 3 tablas: bastan 4 recogidas (1 madera, 2 piedras y la pieza de la poza)
    for (const id of ['m1', 'p1', 'p2', 'c1']) useAt(id);
    check('Recursos recolectados', S.step === 3 && had('ResourcesCollected'), JSON.stringify(S.inv));
    drain(); // escena evento:ResourcesCollected
    useAt('postA', 1, 1); $('c-close').click(); drain();
    useAt('postB', 1, 1); $('c-close').click(); drain();
    check('Sin la ruta de la gota todavía no se elige terreno', S.step === 3 && S.evaluated.A && S.evaluated.B, 'paso ' + S.step);
    jugarRutaGota(G, T);
    check('Dos terrenos inspeccionados y misión educativa hecha', S.step === 4 && S.missions.educativa && S.events.filter(e => e.key === 'LandInspected').length === 2, 'paso ' + S.step);
    C.startBuild('A'); teleport(PLACES.A.x + 50, PLACES.A.z, 0, 1); tick(0.1);
    const build = () => C.build();
    check('Construcción fuera del terreno rechazada', build() && !build().valid, build() && build().reason);
    teleport(PLACES.A.x, PLACES.A.z - 1.5, 0, 1); tick(0.1);
    check('Construcción dentro del terreno válida', build() && build().valid, build() && build().reason);
    action(); drain();
    check('Refugio construido y materiales consumidos', S.refuge && S.inv.madera === 1 && S.inv.piedra === 0, JSON.stringify(S.inv));
    // Mejora 4: la crecida dura 20 s y arrastra tres cosas que se agarran en vuelo y se sueltan a salvo (el agarre real se prueba en el E2E)
    const CRE = C.crecida, flotando = () => CRE.objetos().filter(o => o.fase === 'flota');
    check('La crecida empieza al construir y no bloquea (la escena de Iguaca va en bocadillos)', !!S.event && S.event.dur === 20 && !G.ui.busy());
    tick(4); check('La crecida sube el agua', S.water > G.terreno.waterBase + 0.5);
    const aFlote = o => { const lv = G.agua.levelAt(o.obj.position.x, o.obj.position.z); return lv > -Infinity && o.obj.position.y >= lv - 0.01; };
    check('El río arrastra las tablas de Iguaca, el coquí y un hallazgo, a flote y cerca del terreno de la crecida', flotando().length === 3 && flotando().every(o => aFlote(o) && Math.hypot(o.obj.position.x - CRE.ZONA.x, o.obj.position.z - CRE.ZONA.z) < 45), flotando().map(o => o.id + '@' + o.obj.position.y.toFixed(1) + (aFlote(o) ? '' : ' EN SECO')).join());
    check('Durante la crecida la guía apunta a lo que flota y el objetivo lo dice', !!G.misiones.guideTarget() && /Crecida/.test($('steps').querySelector('li.now').textContent), $('steps').querySelector('li.now').textContent);
    tick(2); const p0 = flotando()[0].obj.position.clone(); tick(3);   // el agua llega a la orilla hacia el segundo 6 y entonces los arrastra
    check('Lo que flota se mueve con la corriente', flotando()[0].obj.position.distanceTo(p0) > 0.5, flotando()[0].obj.position.distanceTo(p0).toFixed(2) + ' m');
    check('A salvo = donde el agua no llega (colina, copa, techo); en el agua de la zona, no', CRE.aSalvo({ x: PLACES.B.x, y: PLACES.B.base, z: PLACES.B.z }) && CRE.aSalvo({ x: C.luma.percha.x, y: C.luma.percha.y, z: C.luma.percha.z }) && !CRE.aSalvo({ x: CRE.ZONA.x, y: S.water, z: CRE.ZONA.z }));
    const coq = flotando().find(o => o.id === 'coqui'); coq.fase = 'llevado'; G.emit('soltado', coq.id, coq.obj, { x: PLACES.B.x, y: PLACES.B.base, z: PLACES.B.z });
    check('Soltar algo en tierra seca lo salva y queda en el registro (FloodRescue)', coq.fase === 'salvado' && CRE.salvados.includes('coqui') && had('FloodRescue'));
    tick(15); drain();
    check('Al bajar el agua, lo no salvado se da por perdido sin castigo y Iguaca lo cuenta', !S.event && CRE.perdidos.length === 2 && !CRE.objetos().some(o => o.fase === 'flota' && o.obj.parent) && S.events.filter(e => e.key === 'FloodRescue').length === 1, CRE.perdidos.join());
    check('Consecuencia visible: refugio inundado', S.refuge.damaged && C.refugeMesh().rotation.z > 0.1 && had('ShelterFlooded'));
    check('Aparece el Guardián', G.actores.npc('guardian').sp.visible && S.step === 5);
    C.syncRefugeInteractable(); useAt('refuge', 1.6, 0); drain(); // escena evento:ShelterDismantled
    check('Corregir: desarmar recupera materiales', !S.refuge && S.inv.madera === 4 && S.inv.piedra === 2, JSON.stringify(S.inv));
    useAt('postB', 1, 1);
    const bb = document.getElementById('c-build'); if (bb) bb.click();
    teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); drain(); tick(21); drain();
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
    // Panel final: «Seguir explorando» deja jugar libre; «Comenzar de cero» pregunta DENTRO del juego antes de borrar (nunca confirm())
    const confirmNativo = window.confirm; let confirmLlamado = 0; window.confirm = () => { confirmLlamado++; return true; };
    const enConfirm = () => !$('end-confirm').hidden, teclas = G.input.keys;
    const avanza = () => { const x0 = S.pos.x, z0 = S.pos.z; teclas.add('d'); tick(0.6); teclas.delete('d'); return Math.hypot(S.pos.x - x0, S.pos.z - z0); };
    teleport(PLACES.villa.x, PLACES.villa.z + 4, 0, 1); tick(0.1);
    check('Panel final: «Crear mi cómic», «Seguir explorando» y «Comenzar de cero» (ya no «Jugar de nuevo»)', ['b-comic', 'b-seguir', 'b-again'].every(id => $(id) && !$(id).hidden) && $('b-seguir').textContent.trim() === 'Seguir explorando' && $('b-again').textContent.trim() === 'Comenzar de cero' && !/Jugar de nuevo/.test($('end').textContent) && !enConfirm());
    check('Con el panel final abierto el mundo queda quieto', G.ui.busy() && avanza() < 0.05);
    $('b-again').click();
    check('«Comenzar de cero» pregunta «¿Comenzar de cero? Se borrará tu partida y tu cómic.» con «No, volver» y «Sí, comenzar de cero», y no borra todavía', enConfirm() && $('end-confirm-title').textContent === '¿Comenzar de cero?' && $('end-confirm-text').textContent === 'Se borrará tu partida y tu cómic.' && $('b-again-no').textContent.trim() === 'No, volver' && $('b-again-si').textContent.trim() === 'Sí, comenzar de cero' && $('end-acciones').hidden && !$('end').hidden && S.complete && S.profile.created && S.profile.name === 'Nube Azul' && !!S.captures.final);
    check('La pregunta lleva el foco a «No, volver» (la opción segura)', document.activeElement === $('b-again-no'));
    $('b-again-no').click();
    check('Cancelar no borra nada y vuelve al panel final', !enConfirm() && !$('end-acciones').hidden && !$('end').hidden && S.complete && S.step === G.misiones.DONE && S.profile.created && had('ChapterCompleted') && !!S.captures.final);
    $('b-again').click(); G.emit('escape');
    check('Esc cancela la pregunta sin cerrar el panel final ni borrar', !enConfirm() && !$('end').hidden && S.complete && S.profile.created);
    $('b-seguir').click();
    check('«Seguir explorando» cierra el panel y deja la partida terminada', $('end').hidden && !enConfirm() && S.explorando && S.complete && S.step === G.misiones.DONE && had('ChapterCompleted'));
    check('Tras el final el mundo está libre: Vittata se mueve', !G.ui.busy() && avanza() > 0.5);
    check('Tras el final se puede hablar con Iguaca', useAt('luma') && G.dialogo.activo());
    drain();
    check('Seguir explorando no repite el final ni el evento ChapterCompleted', $('end').hidden && S.events.filter(e => e.key === 'ChapterCompleted').length === 1);
    check('Guardar y cargar con la partida terminada no reabre el panel final', SV.save(true) && SV.load(true) && S.complete && S.explorando && $('end').hidden && !G.ui.busy());
    S.explorando = false; G.misiones.showEnd(); G.emit('escape');
    check('Esc en el panel final lo cierra como «Seguir explorando»', $('end').hidden && S.explorando && S.complete);
    $('pause').dispatchEvent(new Event('toggle'));
    check('Con la partida terminada el cómic está en el menú de pausa', !$('b-comic-menu').hidden);
    await $('b-comic-menu').onclick();
    check('«Mi cómic» del menú abre el cómic sin pasar por el panel final', !$('comic').hidden && $('end').hidden);
    $('c-close').click();
    check('Cerrar el cómic abierto desde el menú vuelve al mundo, no al panel final', $('comic').hidden && $('end').hidden && !G.ui.busy());
    S.explorando = false; G.misiones.showEnd(); await CM.openComic(); $('c-close').click();
    check('Cerrar el cómic abierto desde el panel final vuelve a ese panel mientras siga pendiente', $('comic').hidden && !$('end').hidden && !enConfirm());
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
    S.comic.title = CM.titulos[1]; S.comic.cover = 'personaje'; CM.syncComicForm();
    check('Mover la viñeta 4 hacia arriba cambia el orden', CM.moveComicPanel(3, -1) && CM.orderedPanels()[2].id === 'final');
    check('No se puede mover fuera de rango', CM.moveComicPanel(0, -1) === false);
    const ci = document.querySelector('#c-panels select[data-id]');
    check('Sin texto libre en el cómic: título y viñetas se eligen de listas', $('c-title').tagName === 'SELECT' && !!ci && !document.querySelector('#comic input[type=text]') && $('c-title').value === CM.titulos[1]);
    ci.value = '2'; ci.dispatchEvent(new Event('change', { bubbles: true }));
    const elegida = CM.comicPanels().find(p => p.id === ci.dataset.id);
    check('Elegir otro texto cambia la viñeta', elegida.eleccion === 2 && CM.orderedPanels().some(p => p.id === ci.dataset.id && p.text === elegida.opciones[2]));
    S.comic.captions.final = 'Mi teléfono es 787 555 1234';
    check('Texto libre de partidas viejas no se usa en el cómic', !CM.orderedPanels().some(p => /787/.test(p.text)));
    S.comic.captions.final = 3;
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
    const KEY = SV.KEY, copiasAntes = new Set(SV.copiasIlegibles().map(c => c.clave)); // copias de rescate que ya había: la prueba solo quita las suyas
    check('Guardar funciona', SV.save(true));
    const snap = SV.serialize();
    SV.reset(true); check('Reiniciar limpia la partida', S.step === 0 && !S.refuge && !S.profile.created);
    try { localStorage.setItem(KEY, snap); } catch (e) { /* sin almacenamiento */ }
    check('Cargar restaura progreso, personaje, cómic y eventos', SV.load(true) && S.complete && S.profile.name === 'Nube Azul' && S.comic.layout === 'strip' && S.events.length > 15 && !!S.captures.final, S.events.length + ' eventos');
    const vieja = JSON.parse(snap); vieja.profile.name = 'Ana Pérez'; vieja.comic.title = 'La casa de Ana';
    try { localStorage.setItem(KEY, JSON.stringify(vieja)); } catch (e) { /* sin almacenamiento */ }
    check('Partida vieja: un nombre con apellido se cambia por uno de la lista', SV.load(true) && S.profile.name !== 'Ana Pérez' && G.creador.esNombreDeLista(S.profile.name), S.profile.name);
    const v2 = { v: 2, pos: { x: 1, z: 2, y: 0 }, facing: { x: 0, z: 1 }, step: 2, inv: { madera: 1, piedra: 0, componente: 0 }, examined: { maquina: true, transmisor: true },
      collected: ['m1'], evaluated: { A: false, B: false }, refuge: null, builds: [], guardianMet: false, benchUnlocked: false, transmitterOn: false, boatPlan: false, complete: false,
      indicators: { seguridad: '—', acceso: '—', habitat: '—' }, events: [{ type: 'PlayerCharacterCreated', t: 0, data: {} }, { type: 'WorkshopExplored', t: 5, data: {} }, { type: 'LumaHelped', t: 9, data: {} }], captures: {}, clock: 12 };
    try { localStorage.setItem(KEY, JSON.stringify(v2)); } catch (e) { /* sin almacenamiento */ }
    check('Partida v2 se migra a v3 sin perder progreso', SV.load(true) && S.step === 2 && S.collected[0] === 'm1' && S.events.length === 3 && S.events[1].type === 'LocationDiscovered' && S.events[2].seq === 3);
    try { localStorage.setItem(KEY, '{roto'); } catch (e) { /* sin almacenamiento */ }
    check('Partida dañada se rechaza y se guarda una copia de rescate con fecha', SV.load(true) === false && SV.copiasIlegibles().some(c => c.raw === '{roto' && !copiasAntes.has(c.clave)) && localStorage.getItem(KEY) === '{roto');
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, step: 3 })); } catch (e) { /* sin almacenamiento */ }
    check('Partida v1 (incompatible) se rechaza', SV.load(true) === false);
    try { localStorage.setItem(KEY, JSON.stringify(Object.assign(JSON.parse(snap), { v: 3, step: 7 }))); } catch (e) { /* sin almacenamiento */ }
    check('Partida v3 terminada se migra a v4 como terminada', SV.load(true) && S.complete && S.step === G.misiones.DONE, 'paso ' + S.step);
    try { localStorage.setItem(KEY, JSON.stringify(Object.assign(JSON.parse(snap), { explorando: true }))); } catch (e) { /* sin almacenamiento */ }
    check('Partida terminada con «Seguir explorando» carga con el panel final cerrado', SV.load(true) && S.complete && S.explorando && $('end').hidden && !G.ui.busy());
    const sinCampo = JSON.parse(snap); delete sinCampo.explorando;
    try { localStorage.setItem(KEY, JSON.stringify(sinCampo)); } catch (e) { /* sin almacenamiento */ }
    check('Partida terminada de antes (sin el campo «explorando») abre el panel final una vez', SV.load(true) && S.complete && !S.explorando && !$('end').hidden && !enConfirm());
    // La partida y el cómic solo se borran con «Comenzar de cero» (la prueba salta el creador que abre reset())
    const resetReal = SV.reset; let resetLlamado = 0; SV.reset = () => { resetLlamado++; return resetReal(true); };
    const intacta = () => S.complete && S.step === G.misiones.DONE && S.profile.created && S.profile.name === 'Nube Azul' && S.comic.layout === 'strip' && !!S.captures.final && had('ChapterCompleted');
    check('Premisa: partida terminada con perfil, cómic y foto del final', intacta());
    check('Mi personaje (creador) no borra el avance ni el cómic', saveCharacter({ name: 'Nube Azul', preset: 'versicolor', outfit: 'azul', accessory: 'gafas' }) === null && intacta() && $('creator').hidden && resetLlamado === 0);
    check('Cargar una y otra vez no borra nada: la partida sigue en el almacén', SV.load(true) && SV.load(true) && intacta() && !!localStorage.getItem(KEY) && resetLlamado === 0);
    const tileReset = document.querySelector('[popovertarget="confirm-reset"]');
    check('Menú de pausa: «Comenzar de cero» (ya no «Reiniciar») con la misma pregunta', !!tileReset && tileReset.textContent.trim() === 'Comenzar de cero' && !/Reiniciar/.test($('pause').textContent) && $('cr-title').textContent === '¿Comenzar de cero?' && $('cr-text').textContent === 'Se borrará tu partida y tu cómic.' && $('b-reset').textContent.trim() === 'Sí, comenzar de cero' && !!$('confirm-reset').querySelector('.btn.ghost') && $('confirm-reset').querySelector('.btn.ghost').textContent.trim() === 'No, volver');
    if (window.CSS && CSS.supports && CSS.supports('selector(:popover-open)')) {
      try {
        $('pause').showPopover(); tileReset.click();
        check('Menú: el primer toque solo abre la pregunta y no borra nada', $('confirm-reset').matches(':popover-open') && resetLlamado === 0 && intacta());
        $('confirm-reset').querySelector('.btn.ghost').click();
        check('Menú: «No, volver» cierra la pregunta y deja la partida y el cómic intactos', !$('confirm-reset').matches(':popover-open') && resetLlamado === 0 && intacta());
      } catch (e) { check('Menú de pausa con popover', false, String(e && e.message || e)); }
      finally { try { if ($('pause').matches(':popover-open')) $('pause').hidePopover(); } catch (e) { /* ya cerrado */ } }
      await new Promise(r => setTimeout(r, 60));
      check('Cerrar el menú de pausa deja el juego en marcha', !G.pausa.activa());
    }
    $('b-reset').click();
    check('Menú: «Sí, comenzar de cero» borra la partida y el cómic (una sola vez)', resetLlamado === 1 && S.step === 0 && !S.complete && !S.profile.created && S.comic.layout === 'grid' && !S.captures.final && !localStorage.getItem(KEY));
    try { localStorage.setItem(KEY, JSON.stringify(sinCampo)); } catch (e) { /* sin almacenamiento */ }
    check('Se vuelve a la partida terminada para seguir probando el panel final', SV.load(true) && S.complete && !S.explorando && !$('end').hidden && intacta());
    resetLlamado = 0;
    const hechoAntes = intacta();
    $('b-again').click();
    check('Antes de confirmar «Comenzar de cero» la partida y el cómic siguen intactos', enConfirm() && resetLlamado === 0 && hechoAntes && intacta());
    $('b-again-si').click();
    SV.reset = resetReal;
    check('«Sí, comenzar de cero» borra la partida, el cómic y las capturas y cierra el panel', resetLlamado === 1 && S.step === 0 && !S.complete && !S.explorando && !S.profile.created && S.comic.layout === 'grid' && !S.captures.final && !had('ChapterCompleted') && $('end').hidden && !enConfirm());
    window.confirm = confirmNativo;
    check('El panel final no usa confirm() del navegador', confirmLlamado === 0, confirmLlamado + ' llamadas');
    // Ruta directa a la colina
    SV.reset(true); saveCharacter({ name: 'Rayo Veloz', preset: 'agilis', outfit: 'rojo', accessory: 'ninguno' });
    S.step = 4; S.evaluated = { A: true, B: true }; S.inv = { madera: 4, piedra: 2, componente: 1 };
    C.startBuild('B'); teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); drain(); tick(21); drain();
    check('Ruta colina directa: texto del cómic correcto', CM.comicPanels()[1] && CM.comicPanels().find(p => p.id === 'refugio').text.startsWith('Elegí construir en la colina'));
    check('Sin capítulo completo no hay viñeta final', !CM.comicPanels().some(p => p.id === 'final'));
    SV.reset(true);
    try { for (const c of SV.copiasIlegibles()) if (!copiasAntes.has(c.clave)) localStorage.removeItem(c.clave); } catch (e) { /* sin almacenamiento */ }
    devolver();
    T.restoreSave(keep);
    G.quiet = false;
    return result();
  }

  // Pruebas del sprint 1: diálogos del .json, misiones de nado, vuelo y coro, Diario, ropa, guía, sonido y fugas
  async function missionTest(G, T) {
    const S = G.S, $ = G.util.$, C = G.c, PLACES = G.terreno.places, had = G.eventos.had, SV = G.guardado;
    const O = G.objetos, F = G.fisica, L = G.dialogo.L;
    // Nivel del agua en un punto (el mapa nuevo tiene río, pozas y mar a distintas alturas)
    const nivel = (x, z) => { const lv = G.agua.levelAt(x, z); return lv > -Infinity ? lv : S.water; };
    const { check, result } = T.runner();
    const { teleport, tick, drain, useAt } = T;
    const keep = T.keepSave(), devolver = conservar(G);
    G.quiet = true;
    await limpiarDialogo(G);
    SV.reset(true); G.creador.saveCharacter({ name: 'Pluma Verde', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
    // Diálogos
    const scenes = G.dialogo.escenas;
    check('dialogos_cap1.js carga las 27 escenas', scenes.length === 27, scenes.length + ' escenas');
    const unknown = scenes.filter(sc => { const [k, v] = sc.disparador.split(':'); return k === 'evento' ? !G.eventos.defs[v] : !['inicio', 'interact'].includes(k); });
    check('Cada disparador evento: existe en EVENT_DEFS', unknown.length === 0, unknown.map(x => x.id).join(', '));
    check('Escenas del mismo disparador se encadenan en orden', L('evento:ShelterRelocated').length === 4 && L('evento:ShelterRelocated')[2].who === 'Vittata');
    check('Emoción del .json llega a la cara de Vittata', L('evento:ShelterDismantled')[0].mood === 'angry' && L('interact:transmisor')[0].mood === 'sad');
    G.quiet = false; G.pack.inicio(G);
    // Mejora 3: el gancho va en bocadillos libres (pasan solos con el tiempo del juego; no cuentan como ocupado)
    check('Introducción con los disparadores inicio: (bocadillos libres, el juego no se para)', !!G.dialogo.libre() && !G.dialogo.open() && !G.ui.busy() && G.dialogo.actual().who === 'Narrador' && G.dialogo.queue.length === 5, G.dialogo.queue.length + 1 + ' líneas');
    const l0 = G.dialogo.actual().text; tick(G.dialogo.LIBRE.max + 0.1);
    check('Un bocadillo pasa solo con el tiempo del juego', !!G.dialogo.libre() && G.dialogo.actual().text !== l0, G.dialogo.actual().text);
    let shook = false; while (G.dialogo.activo()) { G.dialogo.next(); if (G.camara.juice.shake > 0.5) shook = true; }
    check('La Ruptura sacude la cámara', shook || G.renderer.REDUCED);
    // Apertura (P1-3): negro y viento → corte al taller con luz (fundido) → brillo y onda → negro → fundido de nuevo
    G.c.apertura.fin(); G.audio.log.length = 0; G.pack.inicio(G);
    const fade = () => document.getElementById('c1-fade'), obs = () => [G.dialogo.actual().who, fade() ? fade().style.opacity : null, !!document.getElementById('c1-ruptura')];
    const ap = [obs()], retratoApertura = G.dialogo.actual().img || '';
    const zDe = id => parseInt(getComputedStyle(document.getElementById(id)).zIndex, 10) || 0;
    check('Apertura: con el negro puesto, el bocadillo del Narrador queda encima y se lee (AJ3)', !!fade() && !!document.getElementById('bocadillos') && zDe('bocadillos') > zDe('c1-fade'), zDe('bocadillos') + ' > ' + zDe('c1-fade'));
    while (G.dialogo.activo()) { G.dialogo.next(); if (G.dialogo.activo()) ap.push(obs()); }
    check('Apertura: negro con viento hasta el corte al taller, brillo y onda en la Ruptura, negro de nuevo y fundido al despertar',
      ap.length === 6 && ap[0][1] === '1' && ap[1][1] === '1' && ap[2][1] === '0' && ap[3][1] === '0' && !ap[3][2] && ap[4][2] && ap[5][1] === '1' && fade() && fade().style.opacity === '0' && ['viento', 'vmmm', 'zzzt', 'onda'].every(n => G.audio.log.includes(n)), JSON.stringify(ap) + ' ' + G.audio.log.join());
    check('Apertura: el Narrador no usa la cara de Vittata', /^data:image\/svg/.test(retratoApertura) && ap[0][0] === 'Narrador', retratoApertura.slice(0, 30));
    G.c.apertura.fin();
    check('Apertura: al terminar no queda ninguna capa encima del juego', !fade() && !document.getElementById('c1-ruptura'));
    G.quiet = true;
    useAt('transmisor');
    check('interact:transmisor usa el texto del guion (en bocadillo libre)', !!G.dialogo.libre() && G.dialogo.actual().text === 'Este transmisor llevaba años mudo.', JSON.stringify(G.dialogo.actual()));
    drain(); useAt('maquina'); drain();
    check('Revisar el taller antes de subir con Iguaca también cuenta (evento y foto; el paso avanza al volver)', had('WorkshopExplored') && !!S.captures.workshop && S.step === 0);
    posarseLuma(G, T);
    check('interact:luma_inicio: Iguaca llama desde la copa (bocadillo) y, al hablarle, la charla sigue desde ahí', !!G.dialogo.libre() && G.dialogo.actual().who === 'Iguaca' && G.dialogo.actual().text.startsWith('¡Vittata!'), JSON.stringify(G.dialogo.actual()));
    soltarCapas(G);
    if (!G.c.luma.junto()) posarseLuma(G, T);
    const nb0 = G.interaccion.nearest();
    if (G.c.luma.junto()) G.interaccion.find('luma').use(); else G.interaccion.action();
    check('La charla con Iguaca es la caja de diálogo (bloquea) con el guion en orden', G.dialogo.open() && $('d-who').textContent === 'Iguaca' && !G.dialogo.libre(),
      'junto ' + G.c.luma.junto() + ' cerca ' + (nb0 && nb0.id) + ' y ' + S.pos.y.toFixed(2) + '/' + G.c.luma.percha.y.toFixed(2) + ' ' + ($('d-who').textContent || '') + ' ' + ($('d-text').textContent || '').slice(0, 40));
    drain();
    check('Con el taller ya revisado, tras Iguaca el paso salta a «Recolectar»', S.step === 2 && had('LumaHelped'), 'paso ' + S.step);
    // M1: nado
    check('c2 espera al paso 3 (la pieza del paso 2 sale del río)', !O.available(O.find('c2')));
    const c1 = O.find('c1');
    teleport(c1.x + 0.5, c1.z); S.pos.y = nivel(c1.x, c1.z) - F.SWIM_DEPTH; tick(0.3);
    check('La poza es honda: flotando no se alcanza la pieza', F.MOVE.swimming && !S.collected.includes('c1') && !O.reachUnder(c1), 'fondo a ' + (S.pos.y - G.terreno.height(c1.x, c1.z)).toFixed(1) + ' m');
    G.input.keys.add('c'); tick(2.5); G.input.keys.delete('c');
    check('M1: buceando con C se recoge la pieza', S.collected.includes('c1') && S.missions.m1);
    const p3 = G.actores.player3D;
    check('M1 desbloquea las botas azules y Vittata las lleva', S.unlocked.includes('botas') && S.wear.feet && S.wear.feet.id === 'botas' && (!p3 || !!p3.mounted.feet));
    for (const id of ['m1', 'p1', 'p2']) useAt(id);
    drain();
    check('Con la pieza del río se completa la recolección', S.step === 3 && O.available(O.find('c2')), 'paso ' + S.step);
    // Guía: la misión educativa empieza en las marcas de agua del terreno A
    const g3 = G.misiones.guideTarget(), mk = C.edu.L.marcas;
    check('La guía lleva a las marcas de agua (La ruta de la gota)', g3 && Math.hypot(g3.x - mk.x, g3.z - mk.z) < 0.01, JSON.stringify(g3));
    // M2: sin anillos de vuelo; su lugar es la misión educativa "La ruta de la gota" (docs/equipo/EDUCATIVO.md)
    const edu = G.misiones.missions.find(m => m.id === 'educativa');
    check('Sin misión de anillos: ni datos, ni anillos en el mundo, ni línea en el HUD', !G.misiones.missions.some(m => m.id === 'm2') && !G.pack.anillos && !G.c.RINGS && !/Anillos/.test($('missions').textContent), $('missions').textContent);
    check('La misión educativa tiene sus 8 pasos y no se completa sola', edu && edu.pasos.length === 8 && S.missions.educativa === false && (G.misiones.check(), !S.missions.educativa), JSON.stringify(S.missions));
    const pava = G.misiones.unlocks.find(u => u.clave === 'pava');
    check('La pava queda reservada para la misión educativa', pava && pava.hito === 'educativa' && !S.unlocked.includes('pava') && !!G.misiones.lockOf('pava'));
    F.startFlying(); tick(0.5);
    check('Volar sobre el río ya no guía a ningún anillo', G.misiones.guideTarget() && G.misiones.guideTarget().y == null && !S.missions.educativa);
    F.toggleFly(); tick(1.5);
    // Diario de Campo y ropa por hitos
    const FIELD = G.diario.entries;
    const fauna = FIELD.filter(f => f.cat === 'fauna'), cult = FIELD.filter(f => f.cat === 'cultura');
    for (const f of fauna.slice(0, 4)) { teleport(f.x + 0.4, f.z); if (f.agua) S.pos.y = nivel(f.x, f.z) - F.SWIM_DEPTH; tick(0.1); }
    check('Diario: 4 animales por proximidad dan la gorra de la bandera', S.field.length === 4 && S.unlocked.includes('gorra:pr'), S.field.join(','));
    for (const f of cult.slice(0, 4)) { teleport(f.x + 0.4, f.z); tick(0.1); }
    check('Diario: 4 objetos de cultura dan las maracas', S.unlocked.includes('mano:maracas'));
    for (const f of [...fauna.slice(4), ...cult.slice(4)]) { teleport(f.x + 0.4, f.z); if (f.agua) S.pos.y = nivel(f.x, f.z) - F.SWIM_DEPTH; tick(0.1); }
    check('Diario 12/12 da la Deportiva 787 y los lentes dorados', S.field.length === 12 && S.unlocked.includes('camisa:deportiva') && S.unlocked.includes('lentes:#c9a227'));
    G.diario.open();
    check('El Diario muestra los 12 hallazgos', $('card').querySelectorAll('.diary:not(.ciencia):not(.especies) li.found').length === 12);
    G.ui.hideCard();
    // Creador: lo bloqueado se ve apagado y no se puede elegir
    S.unlocked = S.unlocked.filter(k => k !== 'camisa:guayabera');
    const lockOf = G.misiones.lockOf;
    check('Bloqueos por pieza, estilo y color', !lockOf('botas') && !!lockOf('camisa', 'guayabera') && !lockOf('camisa', 'liso') && !lockOf('lentes', 'sol', '#c9a227'));
    // M3: coro de coquíes
    S.step = 6; S.inv = { madera: 1, piedra: 0, componente: 1 }; S.benchUnlocked = true;
    useAt('transmisor');
    const lineasCoro = []; while (G.dialogo.activo() && lineasCoro.length < 40) { lineasCoro.push(G.dialogo.actual().text); G.dialogo.next(); }
    check('M3: el transmisor pide voz y ofrece una elección con Iguaca', S.chorus && !S.transmitterOn && !!$('ch-0'));
    // C9: el coquí canta al atardecer. Iguaca lo explica aquí; el atardecer se comprueba más abajo (en las baterías, G.quiet,
    // el fundido no arranca solo: se fuerza para medirlo y se apaga al final)
    const FRASE_TARDE = 'Los coquíes cantan cuando cae la tarde, del atardecer al amanecer. Mira: el sol ya baja.';
    check('Iguaca explica que los coquíes cantan al caer la tarde', lineasCoro.includes(FRASE_TARDE), lineasCoro.join(' | ').slice(0, 200));
    $('ch-0').click();
    check('La elección cambia la frase de Iguaca', $('d-text').textContent.startsWith('¡Eso, nena!') && had('LumaChoice'));
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
    // La Voz (P0-2): retrato neutro, no la cara del Guardián ni la de Vittata; suenan el BIP y la estática de la radio
    // La Voz y el Guardián narran en bocadillos libres (mejora 3): la historia ya pasó al mirador mientras hablan
    check('El transmisor narra en bocadillos: el símbolo queda a la vista y el juego no se para', !!G.dialogo.libre() && !G.ui.busy() && !$('symbol').hidden && S.step === 7);
    const vozL = []; while (G.dialogo.activo()) { const a = G.dialogo.actual(); vozL.push([a.who, a.img]); G.dialogo.next(); }
    check('Al terminar los bocadillos se retira el símbolo', $('symbol').hidden);
    check('La Voz sale con un retrato neutro y el Guardián conserva el suyo', vozL.filter(l => l[0] === 'Voz').length === 2 && vozL.filter(l => l[0] === 'Voz').every(l => /^data:image\/svg/.test(l[1])) && vozL.filter(l => l[0] === 'Guardián').every(l => /guardian\.png$/.test(l[1])) && G.pack.dialogos.retratos.Voz !== G.pack.dialogos.retratos['Guardián'], JSON.stringify(vozL.map(l => [l[0], l[1].slice(0, 22)])));
    check('El transmisor suena: BIP y estática bajo la Voz', ['bip', 'estatica'].every(n => G.audio.log.includes(n)), G.audio.log.slice(-12).join());
    // Sonido y feedback
    check('Sonidos sintéticos registrados (recoger, coquí, desbloqueo; sin anillo)', ['pickup', 'co', 'qui', 'unlock'].every(n => G.audio.log.includes(n)) && !G.audio.log.includes('ring'), G.audio.log.slice(-8).join(','));
    check('Partículas dentro del límite de 200', G.fx.live <= G.fx.MAX_PARTICLES, G.fx.live + ' vivas');
    // AJ2: un 'render' sin dt o con NaN no deja partículas en NaN (THREE «Computed radius is NaN» al dibujarlas)
    { G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'feathers', 3);   // si hay 200 vivas no crea más: se prueba con las que haya
      const ps = G.fx.list.filter(f => f.m && f.m.isPoints && f.vel);
      G.fx.update(); G.fx.update(NaN); G.fx.update(0.016);
      check('Un render sin dt no deja partículas en NaN', ps.length > 0 && ps.every(f => Number.isFinite(f.t) && Array.from(f.m.geometry.attributes.position.array).every(Number.isFinite)), ps.length + ' ráfagas'); }
    // Guardado del progreso del sprint
    SV.save(true); const snap = SV.serialize(); SV.reset(true);
    try { localStorage.setItem(SV.KEY, snap); } catch (e) { /* sin almacenamiento */ }
    // Toda la ropa que hoy se puede ganar (la pava espera a la misión educativa)
    check('Se guardan misiones, Diario y ropa', SV.load(true) && S.missions.m3 && S.field.length === 12 && S.unlocked.length === G.misiones.unlocks.filter(u => u.hito !== 'educativa').length && S.wear.feet, S.unlocked.join(','));
    // Color y presupuesto de render
    const R = G.renderer.renderer;
    // El post se carga perezoso: hasta que termina (o si el equipo cae a «bajo») el tone mapping es CustomToneMapping (W1: ACES con
    // la gradación de fábrica dentro). Se espera a que el post se asiente y se acepta ACES o CustomToneMapping-con-ACES; otro
    // encoding u otro tone mapping (lineal, Reinhard, ninguno) sigue fallando: eso sí sería un color distinto del creador.
    if (G.renderer.post && G.renderer.post.cargando) await G.renderer.post.cargando.catch(() => {});
    const tmACES = R.toneMapping === THREE.ACESFilmicToneMapping || (R.toneMapping === THREE.CustomToneMapping && /CustomToneMapping[^}]*ACESFilmicToneMapping/.test(THREE.ShaderChunk.tonemapping_pars_fragment));
    check('Juego y creador con el mismo color (sRGB + ACES)', R.outputEncoding === THREE.sRGBEncoding && tmACES, 'toneMapping ' + R.toneMapping + (G.renderer.post && G.renderer.post.activo ? ' · composer' : ' · sin composer'));
    check('Pixel ratio limitado', R.getPixelRatio() <= (G.renderer.MOBILE ? 1.5 : 2), String(R.getPixelRatio()));
    // C9 (sigue): las comprobaciones con await van después de las del color (el post se carga perezoso y cambia el tone mapping)
    const enTarde = await fetch((G.pack.idioma || 'content/cap1/en.js') + '?c9').then(r => r.text()).catch(() => '');
    check('La frase tiene su versión en inglés (en.js)', enTarde.includes(JSON.stringify(FRASE_TARDE) + ':'));
    const AT = window.AV && window.AV.atardecer ? await window.AV.atardecer() : null;
    check('El atardecer dura lo que el coro: con el coro en marcha y M3 sin terminar lo pide; al terminar M3 vuelve el día', AT && (() => { const q = G.quiet; G.quiet = false; const d = AT.deseado(); G.quiet = q; return d === (!!S.chorus && !S.missions.m3 && !S.complete); })(), AT ? JSON.stringify(AT.estado()) : 'sin atardecer.js');
    if (AT) {
      const R0 = G.renderer, sky0 = R0.sky && R0.sky.material.uniforms, dia = sky0 ? sky0.uHorizonte.value.clone() : null, solY = R0.sunDir ? R0.sunDir.y : 1;
      AT.forzar(true); AT.avanzar(AT.DUR + 1);
      const h = sky0 && sky0.uHorizonte.value;
      check('Durante M3 el cielo es de atardecer: horizonte naranja, sol bajo y S.hora casi de noche', AT.k() === 1 && (!h || (h.r > h.b * 1.8 && !h.equals(dia))) && (!R0.sunDir || R0.sunDir.y < solY - 0.2) && S.hora > 18.5 && S.hora < 19, `hora ${S.hora} · solY ${R0.sunDir ? R0.sunDir.y.toFixed(2) : '-'}`);
      const amb = G.musicaApi ? G.musicaApi.calcularAmbiente({ hora: S.hora }) : null;
      check('Y el ambiente suena a coquíes, no a aves de día', !amb || (amb.coquies > 0.85 && amb.aves < 0.15), amb ? `coquíes ${amb.coquies.toFixed(2)} · aves ${amb.aves.toFixed(2)}` : 'musica.js sin cargar: solo la hora');
      AT.forzar(false); AT.avanzar(AT.DUR + 1);
      check('Al apagar el atardecer vuelve el día exacto', AT.k() === 0 && (!h || h.equals(dia)) && S.hora === undefined);
      AT.forzar(null);
    }
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
    await recorrerFinal(G, T, check);
    SV.reset(true);
    devolver();
    T.restoreSave(keep);
    G.quiet = false;
    return result();
  }

  // ---------- El final del capítulo en escena (paquete B de CAP1_PENDIENTE) ----------
  // Recorre del refugio al mirador con las acciones del jugador y mira lo que se ve y suena en cada escena: golpes al construir y sonido
  // de la crecida, retrato neutro de la Voz, plano del bote en pantalla, luz de la niebla con tres destellos, viñeta final del cómic,
  // carga con el capítulo terminado y marcadores para Kelvin. Los sonidos se leen de G.audio.log (se registran aunque no haya altavoces).
  async function recorrerFinal(G, T, check) {
    const S = G.S, $ = G.util.$, C = G.c, P = G.terreno.places, SV = G.guardado, had = G.eventos.had;
    const { teleport, tick, drain, useAt } = T;
    const log = () => G.audio.log.slice(), cuenta = n => log().filter(x => x === n).length;
    G.quiet = true;
    SV.reset(true); G.creador.saveCharacter({ name: 'Brisa Azul', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
    // Refugio en la colina: martillazos al construir; en la crecida llueve sin parar, truena de lejos y el río ruge
    S.step = 4; S.evaluated = { A: true, B: true }; S.inv = { madera: 4, piedra: 2, componente: 1 };
    G.audio.log.length = 0;
    C.startBuild('B'); teleport(P.B.x, P.B.z - 1.5, 0, 1); tick(0.1); G.interaccion.action(); drain();
    check('Final · construir suena a martillazos', !!S.refuge && log().includes('construir'), log().join());
    tick(1.2);
    check('Final · crecida: llueve y se oye un trueno lejano', !!S.event && log().includes('lluvia') && log().includes('trueno'), log().join());
    tick(5); // el rugido del río llega al 30 % de la crecida (20 s desde la mejora 4)
    check('Final · crecida: el río sube con su rugido y la lluvia no se corta', log().includes('crecida') && cuenta('lluvia') >= 2, 'lluvia ×' + cuenta('lluvia'));
    tick(14); drain();
    const llovio = cuenta('lluvia'); tick(2);
    check('Final · al terminar la crecida deja de llover', !S.event && cuenta('lluvia') <= llovio && S.refuge && !S.refuge.damaged && S.step === 5, 'paso ' + S.step);
    // Guardián (banco) y transmisor (Voz con retrato neutro)
    useAt('guardian', 1.4, 0); drain();
    check('Final · el Guardián presenta el refugio y regala el banco', S.step === 6 && S.benchUnlocked && had('GuardianMet'), 'paso ' + S.step);
    S.inv = { madera: 1, piedra: 0, componente: 1 }; S.missions.m3 = true; // el coro de coquíes ya se probó arriba (M3)
    G.audio.log.length = 0; useAt('transmisor');
    const voz = []; while (G.dialogo.activo()) { const a = G.dialogo.actual(); voz.push([a.who, a.img]); G.dialogo.next(); }
    check('Final · transmisor: símbolo de 36, BIP, estática y la Voz sin la cara del Guardián', S.transmitterOn && ['bip', 'estatica'].every(n => log().includes(n)) && voz.filter(l => l[0] === 'Voz').length === 2 && voz.filter(l => l[0] === 'Voz').every(l => !/guardian|vittata|luma/.test(l[1])) && S.step === 7, JSON.stringify(voz.map(l => [l[0], l[1].slice(0, 20)])));
    // Mirador: plano del bote y luz que parpadea tres veces
    const luz = C.luzMirador;
    G.audio.log.length = 0; useAt('mirador', 2.4, 0);
    const esc = [], mira = () => { const a = G.dialogo.actual(); esc.push({ who: a.who, txt: a.text, plano: C.planoVisible(), luz: !!luz && luz.sprite.visible, img: a.img || '', libre: a.libre }); };
    mira(); while (G.dialogo.activo()) { G.dialogo.next(); if (G.dialogo.activo()) mira(); }
    check('Final · el mirador narra en bocadillos libres (la cotorra puede mirar alrededor) y el panel llega al terminar', esc.every(e => e.libre) && S.complete, esc.length + ' bocadillos');
    const lPlano = esc.find(e => /^Si los caminos/.test(e.txt)), lLuz = esc.find(e => /^Mira, Vittata\. Esa luz/.test(e.txt)), nar = esc.filter(e => e.who === 'Narrador');
    check('Final · mirador: el plano del bote sale en pantalla con su chispa de sonido', esc.length === 10 && !!lPlano && lPlano.plano && !lPlano.luz && log().includes('nido_chispa'), esc.length + ' líneas');
    check('Final · mirador: el plano se retira y la luz de la niebla se enciende', !!lLuz && !lLuz.plano && lLuz.luz && !esc.slice(0, 4).some(e => e.luz));
    check('Final · mirador: el Narrador cierra con su propio retrato, no el de Vittata', nar.length === 2 && nar.every(e => /^data:image\/svg/.test(e.img)));
    check('Final · capítulo completo con el plano desbloqueado y sin plano en pantalla', S.complete && S.boatPlan && had('BoatBlueprintUnlocked') && had('ChapterCompleted') && !$('end').hidden && !C.planoVisible());
    let picos = 0, alto = false, mx = 0;
    for (let i = 0; i < 90; i++) { tick(0.05); mx = Math.max(mx, luz.brillo); const a = luz.brillo > 0.5; if (a && !alto) picos++; alto = a; }
    check('Final · la luz parpadea exactamente tres veces (con campanita) y queda encendida', picos === 3 && luz.destellos === 3 && mx > 0.8 && cuenta('parpadeo') === 3 && luz.fijo && !luz.seq && luz.sprite.visible && luz.brillo < 0.5, `picos ${picos} · destellos ${luz.destellos} · máx ${mx.toFixed(2)} · parpadeo ×${cuenta('parpadeo')}`);
    // Viñeta final del cómic: el plano se dibuja abajo a la derecha y solo en esa viñeta
    const cv = document.createElement('canvas'); cv.width = 500; cv.height = 400;
    const cx = cv.getContext('2d'), px = (x, y) => Array.from(cx.getImageData(x, y, 1, 1).data);
    G.pack.comic.decorar(cx, { img: 'final' }, { x: 0, y: 0, w: 500, h: 400 }, 330, G);
    const papel = px(469, 213), vacio = px(40, 300);
    const cv2 = document.createElement('canvas'); cv2.width = 500; cv2.height = 400;
    G.pack.comic.decorar(cv2.getContext('2d'), { img: 'taller' }, { x: 0, y: 0, w: 500, h: 400 }, 330, G);
    check('Final · el cómic dibuja el plano del bote en la viñeta final y en ninguna otra', papel[3] === 255 && papel[2] > papel[0] && vacio[3] === 0 && !cv2.getContext('2d').getImageData(0, 0, 500, 400).data.some(v => v), 'papel ' + papel.join(','));
    // Cargar con el capítulo terminado deja la luz encendida; reiniciar apaga la luz y quita el plano y las capas
    const snap = SV.serialize(); SV.reset(true);
    check('Final · al reiniciar se apagan la luz, el plano y las capas de la apertura', !luz.sprite.visible && !luz.fijo && !document.getElementById('c1-plano') && !document.getElementById('c1-fade') && !document.getElementById('c1-ruptura'));
    try { localStorage.setItem(SV.KEY, snap); } catch (e) { /* sin almacenamiento */ }
    check('Final · al cargar la partida terminada la luz sigue encendida', SV.load(true) && S.complete && luz.fijo && luz.sprite.visible);
    // Marcadores de lo que espera una decisión de Kelvin (canon o arte)
    const PK = C.pendientesKelvin;
    check('Final · los 8 marcadores para Kelvin están listados con su lugar y lo que bloquean', PK.length === 8 && PK.every((p, i) => p.id === 'KELVIN-' + (i + 1) && p.que && p.donde && p.bloquea), PK.map(p => p.id).join());
    G.quiet = false;
  }

  // ---------- La ruta de la gota ----------
  // Juega la misión educativa como un jugador: Acción en las marcas, vuelo hasta las perchas, toques en las tarjetas, seguir el
  // vapor y la gota, bucear en la poza y explicarle el ciclo a Iguaca. o = { check, pred1 (índice), errores (equivocarse una vez en
  // cada actividad), fallarPregunta (id que se falla dos veces), trasP4() }.
  function jugarRutaGota(G, T, o) {
    o = o || {};
    const S = G.S, $ = G.util.$, E = G.c.edu, F = G.fisica, H = G.terreno.height, AU = G.aula, LEC = AU.LEC;
    const { teleport, tick, drain, useAt } = T;
    const ok = o.check || (() => {});
    const paso = id => LEC.mision_educativa.pasos.find(p => p.id === id);
    const click = id => { const b = $(id); if (b && !b.disabled) { b.click(); return true; } return false; };
    const card = () => ($('card').hidden ? '' : $('card').textContent);
    const opts = () => ($('card').hidden ? 0 : $('card').querySelectorAll('.edu-opt').length);
    const volarA = (x, y, z) => { S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; F.MOVE.flying = true; };
    // p1 Predecir
    soltarCapas(G);
    useAt('marcas_agua', 0.5, 0);
    ok('p1: en las marcas Iguaca pregunta de dónde salió el agua', G.dialogo.open() && $('d-text').textContent === AU.t(paso('p1').linea), $('d-text').textContent);
    drain();
    ok('p1: predicción con 3 opciones, sin juicio', opts() === 3 && /predicción|prediction/i.test(card()));
    click('ch-' + (o.pred1 != null ? o.pred1 : 1)); drain();
    ok('p1 hecho y predicción guardada', S.edu.hecho.p1 && !!S.edu.pred1, S.edu.pred1);
    // p2 Capas (perchas) y p3 Cadena en el dosel
    const P2 = paso('p2');
    for (const p of E.PERCHAS) {
      const def = P2.perchas.find(x => x.capa === p.capa);
      if (p.capa === 'sotobosque') ok('Percha de una vía: desde abajo se atraviesa volando, desde arriba sostiene', F.suelo(p.x, p.z, p.y - 1.5) < p.y - 1 && Math.abs(F.suelo(p.x, p.z, p.y + 0.2) - p.y) < 1e-6);
      volarA(p.x, p.y + 1.6, p.z); F.MOVE.flying = false; tick(1);
      const nb = G.interaccion.nearest();
      ok(`p2: se posa en la percha "${p.capa}" y aparece Observar`, E.posado(p) && nb && nb.id === 'percha_' + p.capa && /(Observar|Observe):/.test($('prompt').textContent), `y ${S.pos.y.toFixed(2)} / ${p.y.toFixed(2)} · ${nb && nb.id}`);
      G.interaccion.action();
      if (o.errores && p.capa === 'suelo') {
        click('ch-' + ((def.correcta + 1) % def.opciones.length));
        ok('Observar mal: "Mira otra vez" y otra oportunidad', /Mira otra vez|Look around/.test(card()) && !S.edu.perchas.suelo);
      }
      click('ch-' + def.correcta);
      if (p.capa === 'dosel') {
        tick(1); drain();
        const I = paso('p3').interaccion, seq = AU.aj.grado === '5-6' ? I.grados_5_6 : I.grados_3_4;
        ok(`p3: cadena alimentaria en el dosel con ${seq.length} tarjetas`, $('card').querySelectorAll('.edu-cadena li').length === seq.length && opts() === seq.length);
        if (o.errores) { click('ch-1'); ok('Cadena mal empezada: pista y vuelve a empezar', /Pista|Hint/.test(card()) || card().includes(AU.t(I.retro_incorrecta))); }
        seq.forEach((k, i) => click('ch-' + i));
        ok('Cadena: la palma de sierra no se presenta como alimento de la cotorra (dato sin validar)', AU.verificada(AU.ficha('cotorra_alimento')) || !card().includes(AU.t(I.etiquetas.palma_sierra)));
        click('edu-seguir');
      }
    }
    drain();
    ok('p2 y p3 hechos: 4 capas observadas y cadena', S.edu.hecho.p2 && S.edu.hecho.p3 && Object.keys(S.edu.perchas).length === 4, JSON.stringify(S.edu.perchas));
    // p4 Ojos de cotorra
    for (const k of ['A', 'B']) { const p = E.L[k]; volarA(p.x, H(p.x, p.z) + 6, p.z); tick(0.2); }
    tick(1.5);
    ok('p4: tras ver los dos terrenos desde arriba, pregunta cuál está más bajo', S.edu.vistos.A && S.edu.vistos.B && opts() === 2);
    if (o.errores) click('ch-1');
    click('ch-0');
    ok('p4 hecho y terrenos evaluados (S.evaluated)', S.edu.hecho.p4 && S.evaluated.A && S.evaluated.B);
    if (o.trasP4) o.trasP4();
    // p5 Nace la gota
    const pz = E.L.poza; volarA(pz.x + 3, Math.max(G.agua.levelAt(pz.x, pz.z), H(pz.x, pz.z)) + 2, pz.z); tick(0.3);
    ok('p5: en la poza sube el vapor', E.estado().voluta);
    for (let i = 0; i < 900 && E.estado().vapor < 1; i++) { const v = E.volutaPos(); if (!v) break; volarA(v.x + 1, v.y, v.z); tick(0.1); }
    const nb = E.nube(); volarA(nb.x, nb.y, nb.z); tick(0.3);
    ok('p5: en la nube, segunda predicción', opts() === 3 && card().includes(AU.t(paso('p5').interaccion.pregunta)), card().slice(0, 60));
    click('ch-0');
    ok('p5 hecho y empieza a llover', S.edu.hecho.p5 && !!E.estado().gota);
    // p6 Sigue la gota
    // Se sigue a la gota a 1,5 m (sobre la superficie si se infiltra); con el mapa grande el recorrido dura ~1 min
    for (let i = 0; i < 1800; i++) { const st = E.estado(); if (!st.gota || st.gota.parada) break; const g = E.gotaPos(); volarA(g.x + 1, Math.max(g.y, H(g.x, g.z)) + 1.5, g.z); tick(0.1); }
    tick(2.5);
    ok('p6: la gota corre al río, el río crece y se pregunta dónde se juntó el agua', S.water > G.agua.base + 0.2 && opts() === 2, 'río +' + (S.water - G.agua.base).toFixed(2));
    click('ch-0');
    ok('p6 hecho', S.edu.hecho.p6);
    // p7 La poza
    for (let i = 0; i < 900 && E.estado().gota; i++) { const g = E.gotaPos(); if (!g) break; volarA(g.x + 1, Math.max(g.y + 1, S.water + 2), g.z); tick(0.1); }
    const fg = E.fondo.gota(); teleport(fg.x, fg.z); F.MOVE.flying = false; S.pos.y = H(fg.x, fg.z) + 0.3; tick(0.2);
    ok('p7: buceando se encuentra la gota en el fondo', S.edu.poza.gota);
    const fr = E.fondo.roca(); teleport(fr.x + 1.2, fr.z); S.pos.y = S.water - 0.3; tick(0.2);
    ok('p7: y la marca de la crecida en la roca', S.edu.poza.marca && G.dialogo.open());
    drain(); tick(6);
    ok('p7 hecho: el ciclo se cierra y el río vuelve a su nivel', S.edu.hecho.p7 && Math.abs(S.water - G.agua.base) < 0.05, (S.water - G.agua.base).toFixed(3));
    // p8 Explícale a Iguaca
    useAt('marcas_agua', 0.5, 0);
    ok('p8: en las marcas se explica el ciclo eligiendo frases', opts() === 5);
    if (o.errores) { click('ch-4'); click('ch-3'); ok('Tras 2 fallos brilla la frase que sigue', !!$('card').querySelector('.edu-opt.brilla')); }
    for (let i = 0; i < 5; i++) click('ch-' + i);
    const pred = AU.t(paso('p1').interaccion.opciones[S.edu.pred1i]);
    ok('Predije y vi: la predicción frente a la evidencia', /Predije|I predicted/.test(card()) && card().includes(pred), pred);
    click('edu-seguir'); drain();
    // Iguaca te pregunta (formativa)
    const ids = E.idsFormativa(), vistas = [];
    for (let k = 0; k < 12; k++) {
      const cur = AU.enCurso(); if (!cur) break;
      const q = cur.q; vistas.push(q.id);
      if (o.fallarPregunta === q.id) {
        if (q.tipo === 'ordenar') { click('ch-' + q.correcta[1]); click('ch-' + q.correcta[1]); }
        else { click('ch-' + (q.correcta + 1) % q.opciones.length); ok('Pregunta fallada: pista en el 2.º intento', /Pista|Hint/.test(card())); click('ch-' + (q.correcta + 2) % q.opciones.length); }
        ok('3.er intento: se muestra la respuesta y se explica', /Así es|Here's how/.test(card()));
      } else if (q.tipo === 'ordenar') q.correcta.forEach(i => click('ch-' + i));
      else click('ch-' + q.correcta);
      ok(`Formativa ${q.id}: retroalimentación inmediata y sin puntaje visible`, !!$('edu-seguir') && !!$('card').querySelector('.edu-retro') && !/\d+\s*\/\s*\d+|puntos|points|score/i.test($('card').textContent));
      click('edu-seguir');
    }
    drain();
    ok(`Iguaca te pregunta: ${ids.join(', ')}`, vistas.join() === ids.join() && ids.every(id => S.edu.formativa[id]), vistas.join());
    ok('Misión completa: pava y paso de elegir terreno', S.missions.educativa && S.unlocked.includes('pava') && S.step === 4, 'paso ' + S.step);
    return { ids, vistas };
  }

  // Las pruebas de pausa necesitan el juego corriendo: si la portada (#title) está abierta la cierran y al final la
  // vuelven a abrir. Es una condición de la prueba, no un fallo del juego (la portada pausa a propósito).
  function sinPortada(G) {
    const t = document.getElementById('title'), estaba = !!(t && t.open);
    if (estaba) t.close();
    if (G.pausa && G.pausa.sincronizar) G.pausa.sincronizar();
    return () => { if (estaba && t && !t.open) { t.show(); if (G.pausa && G.pausa.sincronizar) G.pausa.sincronizar(); } };
  }
  const leerAula = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ponerAula = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } };

  async function eduTest(G, T) {
    const S = G.S, $ = G.util.$, C = G.c, E = C.edu, AU = G.aula, SV = G.guardado, LEC = AU.LEC;
    const { check, result } = T.runner();
    const { teleport, tick, drain, useAt } = T;
    const keep = T.keepSave(), aulaKeep = leerAula(AU.KEY), portada = sinPortada(G);
    G.quiet = true;
    try {
      // Datos de la lección
      const M = LEC.mision_educativa || {};
      await limpiarDialogo(G); // deja pasar un clic pendiente del coro y lo anula (QA-64)
      check('lecciones.js carga la lección (8 pasos, 4 perchas, 7 preguntas, 23 fichas)', window.AV_LECCIONES_CAP1 === LEC && M.pasos.length === 8 && M.pasos[1].perchas.length === 4 && LEC.preguntas.length === 7 && LEC.diario.length === 23);
      const sinEn = [];
      const bil = (o, path) => { if (!o || typeof o !== 'object') return; if ('es' in o && !('en' in o)) sinEn.push(path); for (const k of Object.keys(o)) bil(o[k], path + '.' + k); };
      bil(M, 'mision'); bil(LEC.preguntas, 'preguntas'); bil(LEC.diario, 'diario');
      check('Textos de la lección en ES y EN', sinEn.length === 0, sinEn.slice(0, 5).join(', '));
      check('Lugares por id de POI (los que faltan, provisionales y documentados)', Object.values(E.L).every(p => isFinite(p.x) && isFinite(p.z)) && Object.keys(E.origen).includes('marcas_agua'), JSON.stringify(E.origen).slice(0, 160));
      // Partida nueva en 3.º–4.º, español
      AU.setAjuste('grado', '3-4'); AU.setAjuste('idioma', 'es'); AU.setAjuste('corto', false); AU.setAjuste('voz', false); AU.borrarProgreso();
      SV.reset(true); G.creador.saveCharacter({ name: 'Nube Valiente', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
      useAt('maquina'); drain(); useAt('transmisor'); drain(); posarseLuma(G, T); soltarCapas(G);
      if (G.c.luma.junto()) G.interaccion.find('luma').use(); else G.interaccion.action();
      drain();
      check('Recolección -1 min: Iguaca aporta 3 tablas', S.step === 2 && S.inv.madera === 3, JSON.stringify(S.inv));
      for (const id of ['m1', 'p1', 'p2', 'c1']) useAt(id);
      drain();
      check('4 recogidas en vez de 7 completan la recolección', S.step === 3 && S.collected.length === 4, S.collected.join(','));
      check('Paso 3 del HUD: La ruta de la gota', /La ruta de la gota/.test($('steps').textContent) && /Ruta de la gota 0\/8/.test($('missions').textContent));
      // Pausa real
      G.pausa.set('prueba', true);
      const vy0 = S.vy;
      dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })); dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
      check('Pausa real: el bucle se congela (dt = 0) y no se puede saltar', G.camara.juice.hitStop === Infinity && S.vy === vy0);
      G.pausa.set('prueba', false);
      check('Al quitar la pausa el bucle sigue', G.camara.juice.hitStop === 0 && !G.pausa.activa());
      // La misión completa, con errores para probar pistas y sin castigo
      const r = jugarRutaGota(G, T, { check, pred1: 0, errores: true, fallarPregunta: 'q2' });
      check('Formativa breve de 3.º–4.º sin preguntas por verificar (q3, q4)', r.ids.join() === 'q1,q2,q5,q6', r.ids.join());
      const reg = AU.partida();
      check('Registro del aula: pasos, perchas, intentos y predicción', reg && reg.pasos_completados.length === 8 && reg.perchas_observadas === 4 && reg.cadena_correcta_intento === 2 && reg.explicacion_ciclo_intento === 2 && reg.prediccion_registrada === true && reg.prediccion_coincidio === false, JSON.stringify(reg));
      check('Intentos por pregunta (q2 fallada dos veces = 3)', reg.preguntas.q2 === 3 && reg.preguntas.q1 === 1 && reg.preguntas.q3 === '', JSON.stringify(reg.preguntas));
      check('Objetivos con evidencia del juego al terminar la misión', reg.objetivos_logrados.join() === 'O1,O2,O5', reg.objetivos_logrados.join());
      // Construir con la evidencia: la elección sigue libre; llegan las fichas del refugio y de la crecida
      const B = G.terreno.places.B;
      C.startBuild('B'); teleport(B.x, B.z - 1.5, 0, 1); tick(0.1); G.interaccion.action(); drain(); tick(21); drain(); tick(1.5); drain(); tick(1);
      const f = S.edu.fichas;
      check('Fichas por momentos de la historia: nidos y María', f.includes('cotorra_nidos') && f.includes('cotorra_maria'), f.join(','));
      check('Tras construir: objetivos O4 (adaptaciones) y O6 (terreno con evidencia)', AU.partida().objetivos_logrados.join() === 'O1,O2,O4,O5,O6', AU.partida().objetivos_logrados.join());
      // Paradas de aprendizaje en la aldea (opcionales, después de la misión)
      const PAR = G.c.paradas.lista;
      const todos = () => [].concat(G.interaccion.list.map(i => ({ id: i.id, x: i.x, z: i.z })), G.diario.entries.map(f => ({ id: 'diario:' + f.id, x: f.x, z: f.z })), G.objetos.recursos.map(r => ({ id: 'obj:' + r.id, x: r.x, z: r.z })));
      const cerca = PAR.flatMap(p => todos().filter(o => o.id !== p.id && Math.hypot(o.x - p.x, o.z - p.z) < G.c.paradas.SEPARACION).map(o => p.id + '↔' + o.id));
      check('8 paradas a 5 m o más de interactuables, hallazgos y objetos', PAR.length === 8 && cerca.length === 0, cerca.join(', '));
      const PR = PAR.filter(p => p.fuente);
      check('5 paradas de ciencia de Puerto Rico con fuente, ficha verificada y textos ES/EN', PR.length === 5 && PR.every(p => AU.verificada(AU.ficha(p.ficha)) && AU.ficha(p.ficha).fuente === p.fuente && [p.pregunta.enunciado, ...p.pregunta.opciones, p.pregunta.retro.correcta, p.pregunta.retro.incorrecta].every(x => x.es && x.en)), PR.map(p => p.id).join(','));
      // Posiciones medidas sobre el mapa (alrededor del POI 'aldea'): ninguna se apartó de su sitio y todas quedan en seco
      const aldea = E.poi('aldea'), prov0 = p => ({ x: aldea.x + p.prov[0].dx, z: aldea.z + p.prov[0].dz });
      check('Las 5 de ciencia quedan donde se midieron (sin apartarse) y en suelo seco', !!aldea && PR.every(p => Math.hypot(p.x - prov0(p).x, p.z - prov0(p).z) < 0.01 && !(G.agua.levelAt(p.x, p.z) > G.terreno.height(p.x, p.z))), PR.map(p => p.id + ' ' + p.x.toFixed(1) + ',' + p.z.toFixed(1)).join(' · '));
      const conFuente = [];
      for (const p of PAR) { useAt(p.id, 1, 0); if (p.fuente) conFuente.push($('card').textContent.includes('Fuente: ' + p.fuente)); if ($('ch-' + p.pregunta.correcta)) { $('ch-' + p.pregunta.correcta).click(); if ($('edu-seguir')) $('edu-seguir').click(); } }
      check('Cada parada de ciencia de Puerto Rico muestra su fuente al abrirse', conFuente.length === 5 && conFuente.every(Boolean), conFuente.join());
      check('Paradas respondidas y en el registro del aula', PAR.every(p => S.edu.paradas && S.edu.paradas[p.id] === 1) && AU.partida().paradas && Object.keys(AU.partida().paradas).length === 8, JSON.stringify(S.edu.paradas));
      check('Modo Maestro: pestaña Paradas con objetivo y estándares', AU.pestanas().includes('paradas'));
      check('Solo fichas verificadas', f.every(id => AU.verificada(AU.ficha(id))) && ['capas_bosque', 'bromelia', 'ceiba', 'heliconia', 'cotorra_alimento', 'tabonuco', 'helecho_gigante'].every(id => !f.includes(id)), f.join(','));
      G.diario.open();
      const dc = $('card').querySelector('.diary.ciencia');
      check('Diario de Campo · Ciencia: cada ficha con su fuente y sin enlaces', dc && dc.querySelectorAll('li.found').length === f.length && dc.querySelectorAll('li.found .fuente').length === f.length && /Fuente: USFWS/.test(dc.textContent) && !/https?:/.test(dc.innerHTML), dc && dc.querySelectorAll('li').length + ' fichas');
      check('3.º–4.º no muestra las fichas de 5.º–6.º (aviarios)', !dc.textContent.includes('Aviarios'));
      AU.setAjuste('corto', true); G.diario.open();
      check('Texto corto: la ficha muestra su frase corta', $('card').querySelector('.diary.ciencia').textContent.includes(AU.t(AU.ficha('cotorra_estatus').corto)));
      AU.setAjuste('idioma', 'en'); G.diario.open();
      check('Inglés: fichas y paso de la misión en EN', /Source: USFWS/.test($('card').textContent) && $('card').textContent.includes('Only native U.S. parrot.'));
      G.ui.hideCard(); AU.setAjuste('corto', false);
      check('HUD de la misión en inglés', /Raindrop's path 8\/8/.test($('missions').textContent), $('missions').textContent);
      AU.setAjuste('idioma', 'es');
      // Diario · Amazonas del mundo (content/comun/especies.js): solo datos verificados; las 13 de
      // docs/equipo/ESPECIES_DISCREPANCIAS.md van sin estado UICN hasta que Kelvin decida
      const DISCREPANCIAS = ['diadema', 'imperialis', 'lilacina', 'tresmariae', 'rhodocorytha', 'agilis', 'auropalliata', 'barbadensis', 'brasiliensis', 'farinosa', 'festiva', 'kawalli', 'aestiva'];
      const SP = G.diario.especies(), spId = id => SP.find(x => x.id === id);
      check('Amazonas del mundo: especies con nombre ES y EN, científico y distribución', SP.length >= 30 && SP.every(x => x.comun.es && x.comun.en && /^Amazona /.test(x.cientifico) && x.distribucion.es && x.distribucion.en), SP.length + ' especies');
      check('Amazonas del mundo: sin nombre común en español verificado no sale (guatemalae, kawalli)', !spId('guatemalae') && !spId('kawalli'));
      check('Amazonas del mundo: las 13 discrepancias sin estado UICN', DISCREPANCIAS.every(id => !spId(id) || (spId(id).uicn === null && spId(id).evaluacion === null)), DISCREPANCIAS.filter(id => spId(id) && spId(id).uicn).join(','));
      check('Amazonas del mundo: las demás con estado UICN y su evaluación', SP.filter(x => !DISCREPANCIAS.includes(x.id)).every(x => x.uicn && x.evaluacion && /BirdLife/.test(x.evaluacion)) && spId('vittata').uicn === 'CR', SP.filter(x => !DISCREPANCIAS.includes(x.id) && !x.uicn).map(x => x.id).join(','));
      G.diario.open();
      const de = $('card').querySelector('details.especies ul.diary.especies'), li = id => de && de.querySelector(`[data-especie="${id}"]`);
      check('Diario: sección «Amazonas del mundo» con una tarjeta por especie, fuente y sin enlaces', de && /Amazonas del mundo/.test($('card').querySelector('details.especies summary').textContent) && de.querySelectorAll('li').length === SP.length && de.querySelectorAll('li .fuente').length === SP.length && !/https?:/.test(de.innerHTML));
      check('Diario: la cotorra puertorriqueña con ambos nombres, científico y estado', li('vittata') && /cotorra puertorriqueña/.test(li('vittata').textContent) && /Puerto Rican amazon/.test(li('vittata').textContent) && /Amazona vittata/.test(li('vittata').textContent) && /En peligro crítico \(CR\)/.test(li('vittata').textContent));
      check('Diario: la fuente del estado UICN es corta y trae la evaluación (BirdLife, año e identificador)', li('vittata') && /Fuente: Wikipedia \(EN, ES\) · BirdLife International \(2020\), Lista Roja UICN e\.T22686239A179276011/.test(li('vittata').textContent) && !/IUCN Red List 2020/.test(li('vittata').textContent));
      check('Diario: el loro imperial dice «por verificar» y no muestra categoría', li('imperialis') && /Estado UICN: por verificar/.test(li('imperialis').textContent) && !/\((CR|EN|VU|NT|LC)\)/.test(li('imperialis').textContent));
      check('Diario: una especie extinta (loro de Martinica) con su estado y sin repetir «extinta»', li('martinicana') && /Estado UICN: Extinta \(EX\)/.test(li('martinicana').textContent) && !/ · extinta/.test(li('martinicana').textContent));
      AU.setAjuste('idioma', 'en'); G.diario.open();
      check('Diario en inglés: Amazons of the world', /Amazons of the world/.test($('card').textContent) && /IUCN status: Critically Endangered \(CR\)/.test($('card').textContent));
      AU.setAjuste('idioma', 'es'); G.ui.hideCard();
      // Lectura en voz alta: nunca rompe, aunque no haya voces
      let voz = null; try { voz = AU.leer('La gota cae en la montaña.', 'es'); AU.callar(); } catch (e) { voz = e; }
      check('Lectura en voz alta tolera que falle (speechSynthesis ' + (AU.vozDisponible() ? 'disponible' : 'no disponible') + ')', typeof voz === 'boolean');
      AU.setAjuste('voz', true); G.dialogo.say([{ who: 'Iguaca', img: 'assets/luma.png', text: 'Prueba de voz.', lang: 'es' }]);
      await new Promise(r => setTimeout(r, 0));
      check('Con la voz activada se leen las líneas del diálogo en su idioma', AU.vozLog.some(v => v.texto === 'Prueba de voz.' && v.lang === 'es'));
      drain(); AU.setAjuste('voz', false);
      // Reporte sin datos personales
      const csv = AU.reporteCSV();
      check('Reporte sin nombre, ids ni texto libre', !csv.includes('Nube Valiente') && !csv.includes(S.saveId) && !csv.includes('_id') && csv.split('\n')[0].includes('estacion'));
      // Segunda partida: 5.º–6.º, predicción acertada, hallazgo del flamboyán y guardar a mitad de misión
      SV.reset(true); G.creador.saveCharacter({ name: 'Rayo Veloz', preset: 'agilis', outfit: 'rojo', accessory: 'ninguno' });
      AU.setAjuste('grado', '5-6');
      const fl = E.L.flamboyan; teleport(fl.x + 0.5, fl.z); tick(0.6);
      check('Hallazgo opcional: flamboyán (verificado) en la plaza', S.edu.fichas.includes('flamboyan'));
      S.step = 3; S.inv = { madera: 4, piedra: 2, componente: 1 }; G.misiones.check();
      const r2 = jugarRutaGota(G, T, { check: (n, ok, x) => { if (!ok) check('5.º–6.º · ' + n, ok, x); }, pred1: 1, trasP4: () => {
        SV.save(true); const snap = SV.serialize(); SV.reset(true);
        try { localStorage.setItem(SV.KEY, snap); } catch (e) { /* sin almacenamiento */ }
        check('Guardar y cargar a mitad de la misión conserva el avance', SV.load(true) && S.edu.hecho.p4 && !S.edu.hecho.p5 && S.step === 3);
      } });
      check('5.º–6.º: formativa con q7 (abierta por el flamboyán), sin q3 ni q4', r2.ids.join() === 'q1,q2,q5,q6,q7', r2.ids.join());
      check('Predicción acertada: Iguaca lo reconoce', S.edu.pred1 === 'lluvia_montana' && AU.partida().prediccion_coincidio === true);
      check('Dos partidas en el registro del dispositivo', AU.partidas.length === 2 && AU.partidas[1].grado === '5-6');
      check('Sin errores de JavaScript', (window.__aveErrores || []).length === 0, (window.__aveErrores || []).slice(0, 2).join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      G.ui.hideCard(); G.dialogo.clear();
      ponerAula(AU.KEY, aulaKeep); AU.recargar();
      SV.reset(true);
      T.restoreSave(keep);
      G.quiet = false;
      portada();
    }
    return result();
  }

  async function maestroTest(G, T) {
    const S = G.S, $ = G.util.$, AU = G.aula;
    const { check, result } = T.runner();
    const aulaKeep = leerAula(AU.KEY), keep = T.keepSave(), prevKeep = leerAula(G.guardado.KEY + '.prev'), portada = sinPortada(G);
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const menu = $('pause');
    const claudeKeep = Object.getOwnPropertyDescriptor(window, 'claude');
    const ponerClaude = v => Object.defineProperty(window, 'claude', { value: v, configurable: true, writable: true });
    try {
      AU.borrarProgreso();
      S.edu.registro = null;
      AU.registrar({ pasos_completados: ['p1', 'p2'], perchas_observadas: 2, preguntas: { q1: 1, q2: '' }, objetivos_logrados: ['O1'] });
      menu.showPopover(); await espera(60);
      check('El menú de pausa congela el juego', G.pausa.motivos.has('menu') && G.camara.juice.hitStop === Infinity);
      check('Sección Aula en la pausa: ES/EN, texto corto y voz', !!menu.querySelector('[data-aula-idioma="en"]') && !!menu.querySelector('[data-aula-op="corto"]') && !!menu.querySelector('[data-aula-op="voz"]'));
      const link = menu.querySelector('.maestro-link');
      check('Acceso discreto: enlace pequeño y tenue al pie de la pausa', link && link.offsetHeight > 0 && parseFloat(getComputedStyle(link).opacity) < 0.8 && parseFloat(getComputedStyle(link).fontSize) <= 13);
      const form = menu.querySelector('.maestro-reto'), inp = $('maestro-resp');
      link.click();
      check('Un clic no abre la puerta docente', form.hidden);
      link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await espera(1350);
      check('Mantener pulsado 1,2 s pide una multiplicación (código simple, sin cuenta)', !form.hidden && /\d+ × \d+/.test(form.textContent));
      inp.value = String(AU.reto() + 1); form.requestSubmit();
      check('Suma equivocada: no entra y propone otra', !AU.maestroAbierto() && !menu.querySelector('.maestro-err').hidden);
      inp.value = String(AU.reto()); form.requestSubmit(); await espera(60);
      check('Suma correcta: Modo Maestro abierto y el juego sigue en pausa', AU.maestroAbierto() && G.pausa.motivos.has('maestro') && !menu.matches(':popover-open') && G.camara.juice.hitStop === Infinity);
      const g = AU.LEC.modo_maestro.guia_45_min;
      check('Guía de clase: pregunta guía, antes/durante/después y rúbrica', $('m-panel').textContent.includes(AU.t(g.pregunta_guia)) && $('m-panel').textContent.includes(g.antes.pasos[0]) && /Rúbrica|Rubric/.test($('m-panel').textContent));
      $('m-tab-progreso').click();
      check('Progreso de este dispositivo en una tabla', $('m-panel').querySelectorAll('tbody tr').length === AU.partidas.length && AU.partidas.length === 1);
      $('m-tab-fuentes').click();
      check('Las URL de las fuentes solo aparecen en Modo Maestro', /https:\/\/www\.fws\.gov\//.test($('m-panel').textContent));
      $('m-tab-reporte').click();
      const est = $('m-estacion'); est.value = 'Estación 4'; est.dispatchEvent(new Event('change'));
      check('Estación elegida de una lista (sin texto libre)', est.tagName === 'SELECT' && est.options.length >= 41 && AU.aj.estacion === 'Estación 4');
      let guardado = null;
      ponerClaude({ use: async n => (n === 'downloads' ? { save: async o => { guardado = o; return { status: 'saved' }; } } : null) });
      $('m-csv').click(); await espera(60);
      check('CSV con la capacidad downloads del artifact', guardado && /^amazonaverse_cap1_Estacion_4_\d{4}-\d{2}-\d{2}\.csv$/.test(guardado.filename) && guardado.data.includes('Estación 4') && guardado.data.includes('pasos_completados'), guardado && guardado.filename);
      guardado = null; $('m-json').click(); await espera(60);
      let js = null; try { js = JSON.parse(guardado.data); } catch (e) { js = null; }
      check('JSON con las partidas y sin ids internos', js && js.partidas.length === 1 && !guardado.data.includes('_id') && /\.json$/.test(guardado.filename));
      // La declaración solo es cierta si de verdad nada se pidió a otro origen (motor y fuentes servidos por el juego)
      const ajenos = performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith(location.origin) && !/^(data|blob):/.test(n));
      check('Sin peticiones a terceros al cargar (motor y fuentes del propio juego)', ajenos.length === 0, ajenos.slice(0, 3).join(' '));
      check('La privacidad del reporte dice la verdad (sin terceros, sin texto libre, voz local)', js && js.privacidad.some(x => /vienen con el juego/.test(x)) && js.privacidad.some(x => /Sin texto libre/.test(x)) && !js.privacidad.some(x => /Google Fonts|cdnjs|jsdelivr/i.test(x)));
      ponerClaude({ use: async () => ({ save: async () => { throw { code: 'declined', message: 'no' }; } }) });
      $('m-csv').click(); await espera(60);
      check('Si el docente cancela la descarga se avisa', /cancel/i.test($('m-estado').textContent), $('m-estado').textContent);
      ponerClaude({ use: async () => null });
      $('m-csv').click(); await espera(150);
      check('Sin descargas: copia al portapapeles o deja el texto listo para copiar', /portapapeles|clipboard/.test($('m-estado').textContent) || (!$('m-manual').hidden && $('m-manual').value.includes('estacion')), $('m-estado').textContent);
      const csv = AU.reporteCSV();
      check('Reporte sin datos personales (nombre, saveId, ids)', !csv.includes(S.saveId) && !csv.includes('_id') && (!S.profile.created || !csv.includes(S.profile.name)));
      const partidasAntes = AU.partidas.length, perfilKeep = S.profile.created;
      const saveIdAntes = S.saveId, pasoAntes = S.step;
      $('m-nuevo').click();
      check('Nuevo estudiante pregunta como el juego: «¿Comenzar de cero? Se borrará tu partida y tu cómic.» con «No, volver» (foco) y «Sí, comenzar de cero»', !$('m-nuevo-conf').hidden && $('m-nuevo').hidden && $('m-nuevo-q').textContent === '¿Comenzar de cero? Se borrará tu partida y tu cómic.' && $('m-nuevo-no').textContent.trim() === 'No, volver' && $('m-nuevo-si').textContent.trim() === 'Sí, comenzar de cero' && document.activeElement === $('m-nuevo-no'));
      check('El primer toque no borra la partida ni el cómic', S.saveId === saveIdAntes && S.step === pasoAntes && S.profile.created === perfilKeep);
      $('m-nuevo-no').click();
      check('«No, volver» cierra la pregunta y no borra nada', $('m-nuevo-conf').hidden && !$('m-nuevo').hidden && S.saveId === saveIdAntes && S.step === pasoAntes && S.profile.created === perfilKeep);
      $('m-nuevo').click(); $('m-nuevo-si').click();
      check('Nuevo estudiante: borra la partida y conserva el reporte', !S.profile.created && AU.partidas.length === partidasAntes && !leerAula(G.guardado.KEY + '.prev') && perfilKeep !== undefined);
      $('m-borrar').click(); $('m-borrar-si').click();
      check('Borrar el progreso de este dispositivo', AU.partidas.length === 0);
      $('maestro').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      check('Esc cierra el Modo Maestro y el juego sigue', !AU.maestroAbierto() && !G.pausa.activa() && G.camara.juice.hitStop === 0);
      // Nombre del personaje (decisión de Kelvin): «Iguaca». «Luma» recuerda a la empresa de electricidad, así que no puede verse ni leerse en ningún texto
      // del juego (los ids internos luma/LumaHelped, que guardan las partidas, no cuentan: solo se mira el texto)
      const npcLuma = (G.actores.npc('luma') || {}).def || {};
      const textoJuego = [JSON.stringify(window.AV_DIALOGOS_CAP1 || {}), JSON.stringify(window.AV_LECCIONES_CAP1 || {}), document.body.innerText, npcLuma.nombre].join(' ');
      check('Ningún texto visible dice «Luma»: el personaje se llama Iguaca (diálogos, lecciones, pantalla y nombre del NPC)', !/\bLuma\b/.test(textoJuego) && /Iguaca/.test(textoJuego) && npcLuma.nombre === 'Iguaca', (textoJuego.match(/.{0,20}\bLuma\b.{0,20}/) || [])[0]);
      check('Sin errores de JavaScript', (window.__aveErrores || []).length === 0, (window.__aveErrores || []).slice(0, 2).join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      if (claudeKeep) Object.defineProperty(window, 'claude', claudeKeep); else { try { delete window.claude; } catch (e) { /* propiedad fija */ } }
      AU.cerrarMaestro();
      try { if (menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
      ponerAula(AU.KEY, aulaKeep); AU.recargar();
      ponerAula(G.guardado.KEY + '.prev', prevKeep); T.restoreSave(keep);
      portada();
    }
    return result();
  }

  AVE.registerPack({ id: 'cap1', pruebas: { selfTest, missionTest, eduTest, maestroTest } });
})();
