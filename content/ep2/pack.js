/* Content pack EP2 · «Un lugar para todos» · PROTOTIPO jugable de la misión 1, «Lee la tierra»
   Sale de content/plantilla y reutiliza el motor tal cual (nada de src/ tocado). Diseño: docs/equipo/EP2_GDD.md,
   EP2_NARRATIVA.md y EP2_MISIONES.md §2. Ábrelo con index.html?pack=ep2 (boot.js lo carga solo).
   Lo que depende del canon de Kelvin (EP2_GDD.md §10) va con el marcador neutro [KELVIN] y no es canon.
   Lo que el jugador observa en cada sitio (pendiente, suelo, viento) son valores del juego, no datos del mundo real: la ciencia
   de suelos sigue «por verificar» (EP2_MISIONES.md §2). El único dato real es el de la parada del nido, con su fuente. */
(function () {
  'use strict';
  const LUMA = { x: -2, z: 2 };
  // Tres sitios para la casa: lo que se observa en cada uno (valores del juego). Ninguno es «el malo»: se elige con evidencia
  const SITIOS = {
    a: { id: 'a', nombre: 'el llano', x: -12, z: 10, pendiente: 'plano', suelo: 'se hace charco: el agua tarda mucho en bajar', viento: 'poco' },
    b: { id: 'b', nombre: 'la loma', x: 16, z: -6, pendiente: 'empinado', suelo: 'el agua baja rápido', viento: 'mucho' },
    c: { id: 'c', nombre: 'el claro', x: 0, z: -16, pendiente: 'suave', suelo: 'el agua baja a ritmo medio', viento: 'medio' },
  };
  const IDS = Object.keys(SITIOS);
  const NIDO = { x: -20, z: -4 };
  const FUENTE = 'USFWS, Programa interagencial de la cotorra puertorriqueña (2026)';
  const lee = id => 'lee_' + id, elige = id => 'sitio_' + id;
  const Lu = t => ({ who: 'Iguaca', img: 'assets/luma.png', text: t });

  const DIALOGOS = { escenas: [
    { id: 'e_inicio', disparador: 'inicio:ep2', personaje: 'Vittata', emocion: 'pensando', lineas: ['Otra tormenta en tres días. El refugio no aguanta.', 'Ya sé dónde pondré la casa… ¿o no? [KELVIN: lo que dice la Voz y la luz de la niebla]'] },
    { id: 'e_luma', disparador: 'interact:luma', personaje: 'Iguaca', emocion: 'idea', lineas: ['Elegiste el sitio a ojo. ¿Y si lo miras como en la ruta de la gota?', 'Hay tres sitios: el llano, la loma y el claro. Mira la pendiente, el suelo y el viento de cada uno. Luego eliges.'] },
    { id: 'e_fin', disparador: 'evento:SiteChosen', personaje: 'Iguaca', emocion: 'feliz', lineas: ['Elegiste con evidencia, no a ojo. Eso es leer la tierra.', 'Falta escuchar a quienes van a vivir ahí… pero eso es otra misión. [KELVIN: quiénes son los dos residentes]'] },
  ] };

  AVE.registerPack({
    id: 'ep2',
    meta: {
      titulo: 'Un lugar para todos', capitulo: 2, almacen: 'ep2',
      hud: { capitulo: 'Episodio 2 · Prototipo', titulo: 'Un lugar para todos', portada: 'Episodio 2 · Un lugar para todos',
        etiqueta: 'Prototipo del episodio 2 · content/ep2/pack.js', fin: '¡Sitio elegido!',
        nota: 'Prototipo: la primera misión del episodio 2. No uses tu nombre real.', inventario: {} },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -4, z: 6 }, camara: 0.6 },
    guardado: { version: 1 },

    mundo: {
      tamano: 40, segmentos: 80,
      cielo: { color: '#d9c4a8', niebla: [30, 100] },
      luces: { cielo: '#e6dccb', suelo: '#3a4a2a', hemi: 0.85, sol: '#ffcf9a', solInt: 0.7, solPos: [30, 40, -20] },
      lugares: { inicio: { x: -4, z: 4, r: 5 }, nido: { x: NIDO.x, z: NIDO.z, r: 3 } },
      terreno: {
        ondas: [{ fn: 'sin', x: 0.09, amp: 0.5 }, { fn: 'cos', z: 0.07, amp: 0.4 }],
        relieves: [{ tipo: 'colina', x: 16, z: -6, alto: 6, ancho: 40 }], // la loma: el sitio empinado
        planos: ['inicio', 'nido'],
      },
      arboles: { cantidad: 36, semilla: 5, copaCada: 2, margenRio: 5, copaColor: '#3f8f4a', evitar: [LUMA, NIDO].concat(IDS.map(i => SITIOS[i])) },
      oceano: { color: '#4a9ab8', y: -2.6 },
    },
    // id histórico 'luma': el personaje se llama Iguaca
    npcs: [{ id: 'luma', nombre: 'Iguaca', sprite: 'assets/luma.png', x: LUMA.x, z: LUMA.z, escala: 2.2, flota: true }],
    objetos: {}, recursos: [],

    // ---------- Historia: hablar, leer la tierra (misión 1) y cerrar con Iguaca ----------
    historia: {
      pasos: [
        { id: 'hablar', texto: 'Habla con Iguaca', guia: G => G.misiones.at('luma') },
        { id: 'tierra', texto: 'Lee la tierra: observa los 3 sitios y elige uno', progreso: S => ` (${IDS.filter(i => S.collected.includes(lee(i))).length}/3)`,
          hasta: { mision: 'lee_tierra' }, guia: G => { const S = G.S, i = IDS.find(k => !S.collected.includes(lee(k))); return G.misiones.at('sitio_' + (i || IDS[0])); } },
        { id: 'volver', texto: 'Cuéntale a Iguaca lo que elegiste', guia: G => G.misiones.at('luma') },
      ],
      fin: () => 'Leíste la tierra y elegiste con evidencia. Siguen «Escuchar primero» y «Casa que aguanta» (prototipo: aún no jugables).',
    },
    misiones: [
      { id: 'lee_tierra', titulo: 'Lee la tierra', hud: 'Pendiente, suelo y viento',
        pasos: [{ texto: 'Observa los 3 sitios', hasta: { recogido: IDS.map(lee) } }, { texto: 'Elige un sitio', hasta: { alguno: IDS.map(i => ({ recogido: elige(i) })) } }],
        recompensa: { hito: 'tierra' } },
    ],
    // Sin hallazgos propios: la parada del nido es una charla con fuente (abajo)
    diario: { titulo: 'Cuaderno del terreno', corto: 'Cuaderno', boton: 'Cuaderno', categorias: { terreno: { nombre: 'Terreno', desconocido: 'Un sitio', sonido: 'pickup', rafaga: 'feathers' } }, entradas: [], hitos: [] },
    ropa: [
      { clave: 'lentes:#2b2b2b:binoculares', hito: 'tierra', nombre: 'Lentes binoculares', pista: 'leer la tierra', viste: { slot: 'eyes', id: 'lentes', color: '#2b2b2b', style: 'binoculares' } },
    ],
    eventos: { defs: {
      PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'villa', chars: ['player'], scene: 'portrait' },
      StormWarning: { type: 'QuestAccepted', loc: 'villa', chars: ['vittata', 'luma'], scene: 'dialogue' },
      TerrainRead: { type: 'LocationDiscovered', loc: 'villa', chars: ['vittata'], scene: null },
      SiteChosen: { type: 'LandDecisionMade', loc: 'villa', chars: ['vittata', 'luma'], scene: 'final' },
    } },
    dialogos: { datos: () => DIALOGOS, retratos: { Iguaca: 'assets/luma.png', Vittata: 'assets/vittata.png' }, retratoDefecto: 'assets/vittata.png' },
    comic: {
      marca: 'UN LUGAR PARA TODOS', tituloDefecto: 'Mi episodio 2', archivo: 'ep2-mi-comic', pdfTitulo: 'Un lugar para todos',
      capturas: ['sitio'], portadas: {},
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name} y vi venir otra tormenta.` },
        { id: 'sitio', img: 'sitio', needs: 'SiteChosen', texto: 'Miré la pendiente, el suelo y el viento antes de elegir dónde construir.' },
      ],
    },

    inicio(G) { G.eventos.log('StormWarning'); G.dialogo.say(G.dialogo.L('inicio:ep2'), () => G.ui.toast('Habla con Iguaca', 3000)); },

    preparar(G) {
      const S = G.S, H = G.terreno.height, L = G.dialogo.L;
      const leidos = () => IDS.filter(i => S.collected.includes(lee(i)));
      const elegido = () => IDS.find(i => S.collected.includes(elige(i)));

      function hablar() {
        if (S.step === 0) { G.dialogo.say(L('interact:luma'), () => G.misiones.advanceTo(1)); return; }
        if (S.step === 1) { G.dialogo.say([Lu('Mira los 3 sitios: el llano, la loma y el claro. Llevas ' + leidos().length + ' de 3.')]); return; }
        if (S.step === 2 && !S.complete) {
          S.complete = true; G.eventos.log('SiteChosen'); G.comic.capture('sitio'); G.audio.play('unlock');
          G.misiones.advanceTo(G.misiones.DONE);
          G.dialogo.say(L('evento:SiteChosen'), () => G.misiones.showEnd());
          return;
        }
        G.dialogo.say([Lu('Ya tienes el sitio. La próxima misión es escuchar a quienes vivirán ahí.')]);
      }
      G.interaccion.add({ id: 'luma', x: LUMA.x, z: LUMA.z, r: 2.4, label: () => S.step === 2 && !S.complete ? 'Contarle a Iguaca' : 'Hablar con Iguaca', use: hablar });

      // Cada sitio: primero se observa (pendiente, suelo, viento); con los 3 leídos, se puede elegir
      for (const id of IDS) {
        const s = SITIOS[id], y = H(s.x, s.z);
        const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.2, 6), new THREE.MeshLambertMaterial({ color: '#8a6a3a' }));
        poste.position.set(s.x, y + 1.1, s.z); G.renderer.scene.add(poste);
        const cinta = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshLambertMaterial({ color: '#d6403a', side: THREE.DoubleSide }));
        cinta.position.set(s.x + 0.5, y + 2, s.z); G.renderer.scene.add(cinta);
        G.interaccion.add({ id: 'sitio_' + id, x: s.x, z: s.z, r: 2.4,
          visible: () => S.step === 1 && !elegido(),
          label: () => leidos().length === 3 ? 'Elegir ' + s.nombre : 'Observar ' + s.nombre,
          use: () => {
            if (!S.collected.includes(lee(id))) {
              S.collected.push(lee(id)); G.eventos.log('TerrainRead'); G.audio.play('pickup');
              G.dialogo.say([{ who: 'Vittata', img: 'assets/vittata.png', text: `En ${s.nombre}: pendiente ${s.pendiente}; ${s.suelo}; viento ${s.viento}.` }]);
              return;
            }
            if (leidos().length < 3) { G.ui.toast('Observa los 3 sitios antes de elegir', 2500); return; }
            S.collected.push(elige(id)); G.audio.play('unlock');
            G.dialogo.say([{ who: 'Vittata', img: 'assets/vittata.png', text: `Elijo ${s.nombre}. [KELVIN: aquí iría la consecuencia en la prueba de tormenta, misión 3]` }]);
            G.fx.burst(s.x, y + 1.5, s.z, 'gold', 20);
          } });
      }

      // Parada de aprendizaje: dato real con fuente (opcional)
      G.interaccion.add({ id: 'parada_nido', x: NIDO.x, z: NIDO.z, r: 2.4, label: () => 'Mirar el hueco del árbol',
        use: () => G.dialogo.say([
          { who: 'Vittata', img: 'assets/vittata.png', text: 'Este tronco tiene un hueco. La cotorra puertorriqueña anida en cavidades, naturales y artificiales.' },
          Lu('Por eso las cajas nido ayudan. Fuente: ' + FUENTE + '.'),
        ], () => G.eventos.log('DatoNido')) });
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 3, 8), new THREE.MeshLambertMaterial({ color: '#6b4a2a' }));
      poste.position.set(NIDO.x, H(NIDO.x, NIDO.z) + 1.5, NIDO.z); G.renderer.scene.add(poste);
      G.fisica.colliders.push({ x: NIDO.x, z: NIDO.z, r: 0.6, h: 3, kind: 'obj' });
    },

    pruebas: {
      async selfTest(G, T) {
        const S = G.S, $ = G.util.$, { check, result } = T.runner(), { tick, drain, useAt } = T;
        const keep = T.keepSave();
        G.quiet = true; G.guardado.reset(true);
        check('Crea el personaje', G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
        check('Empieza en el paso 1 de 3', S.step === 0 && $('steps').children.length === 3);
        check('Los marcadores [KELVIN] no son canon: están en los diálogos', JSON.stringify(G.pack.dialogos.datos()).includes('[KELVIN') );
        useAt('luma'); drain();
        check('Iguaca da la misión', S.step === 1, 'paso ' + S.step);
        check('Antes de leer los 3 sitios no se puede elegir', (useAt('sitio_a'), drain(), useAt('sitio_a'), drain(), !S.collected.includes('sitio_a')) && S.collected.includes('lee_a'));
        useAt('sitio_b'); drain(); useAt('sitio_c'); drain();
        check('Los 3 sitios observados', ['lee_a', 'lee_b', 'lee_c'].every(k => S.collected.includes(k)) && S.step === 1);
        useAt('sitio_c'); drain();
        check('Elige un sitio: la misión se completa y llegan los lentes', S.missions.lee_tierra && S.step === 2 && S.unlocked.includes('lentes:#2b2b2b:binoculares'), JSON.stringify(S.missions));
        useAt('parada_nido'); drain();
        check('Parada del nido: dato con su fuente y evento', G.eventos.had('DatoNido'));
        useAt('luma'); drain();
        check('Final: sitio elegido, pantalla de fin', S.complete && S.step === G.misiones.DONE && !$('end').hidden);
        check('El cómic sale de los eventos', G.comic.comicPanels().length === 2);
        G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
        try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
        check('Guardar y cargar', G.guardado.load(true) && S.complete && S.collected.includes('sitio_c'));
        G.guardado.reset(true);
        T.restoreSave(keep);
        G.quiet = false;
        return result();
      },
    },
  });
})();
