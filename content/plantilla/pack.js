/* Content pack PLANTILLA · "La isla de las semillas"
   Juego mínimo y distinto hecho solo con datos y un preparar(G) pequeño, sin tocar src/. Sirve de prueba de que la base
   es reutilizable (AV.templateTest lo arranca en un iframe) y de punto de partida para un fork:
     1. Copia esta carpeta a content/<tu-id>/ y cambia id y meta.almacen.
     2. Cambia el mundo, los NPC, los objetos, la historia, las misiones, el Diario, la ropa y los diálogos.
     3. Ábrelo con index.html?pack=<tu-id> (se carga solo) o pon sus <script> en index.html en lugar de los de cap1.
   El esquema de cada bloque está documentado en el módulo que lo lee (src/engine/terreno.js, src/game/misiones.js, …)
   y en docs/ARQUITECTURA.md. */
(function () {
  'use strict';
  // Diálogos: mismo formato que content/cap1/dialogos_cap1.js (disparadores inicio:, interact:, evento:)
  const DIALOGOS = { escenas: [
    { id: 'p_inicio', disparador: 'inicio:isla', personaje: 'Ágil', emocion: 'feliz', lineas: ['¡Bienvenida a la isla de las semillas!', 'El viento se llevó nuestras semillas. ¿Me ayudas a buscarlas?'] },
    { id: 'p_agil', disparador: 'interact:agil', personaje: 'Ágil', emocion: 'idea', lineas: ['Hay tres semillas: dos en la pradera y una en el fondo del lago.', 'Para la del lago, nada hasta las burbujas y mantén C para bucear.'] },
    { id: 'p_semillas', disparador: 'evento:SemillasRecogidas', personaje: 'Vittata', emocion: 'feliz', lineas: ['¡Tengo las tres! Vamos con Ágil a sembrarlas.'] },
    { id: 'p_fin', disparador: 'evento:IslaSembrada', personaje: 'Ágil', emocion: 'feliz', lineas: ['¡La isla vuelve a florecer! Gracias por tu ayuda.'] },
  ] };
  const AGIL = { x: -2, z: 2 };

  AVE.registerPack({
    id: 'plantilla',
    meta: {
      titulo: 'La isla de las semillas', capitulo: 1, almacen: 'plantilla',
      // Textos del HUD que cambian respecto al markup de index.html (los contadores no nombrados se ocultan)
      hud: { capitulo: 'Plantilla · Isla Semilla', titulo: 'La isla de las semillas', portada: 'Plantilla · La isla de las semillas',
        etiqueta: 'Plantilla de Amazona Verse Engine · content/plantilla/pack.js', fin: '¡Isla sembrada!',
        nota: 'Serás aprendiz de Ágil en la isla. No uses tu nombre real.', inventario: { 'i-madera': 'Semillas' } },
    },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, aparicion: { x: -4, z: 6 }, camara: 0.6 },
    guardado: { version: 1 },

    // ---------- Mundo: una isla pequeña con una colina, un río y una poza ----------
    mundo: {
      tamano: 40, segmentos: 80,
      exposicion: 0.74,
      cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
      luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
      post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
      mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
      lugares: { inicio: { x: -4, z: 2, r: 5 }, cima: { x: -16, z: -14, r: 3 } },
      terreno: {
        ondas: [{ fn: 'sin', x: 0.09, amp: 0.6 }, { fn: 'cos', z: 0.07, amp: 0.5 }],
        relieves: [
          { tipo: 'colina', x: -16, z: -14, alto: 5, ancho: 90 },
          { tipo: 'cauce', x: 22, mitad: 7, pendiente: 0.6 },
          { tipo: 'colina', x: 22, z: -6, alto: -3, ancho: 10 }, // poza honda: la semilla del lago
        ],
        planos: ['inicio', 'cima'],
      },
      rio: { x: 22 },
      agua: { x: 22, ancho: 10, color: '#5fe3d6', nivel: { x: 22, z: 8, sobre: 1.0 } },
      arboles: { cantidad: 40, semilla: 3, copaCada: 2, margenRio: 5, copaColor: '#2f7d43', evitar: [AGIL] },
      oceano: { color: '#0b4f86', y: -2.6 },
      islas: { lista: [{ x: 60, z: -40, r: 9 }] },
    },
    npcs: [{ id: 'agil', nombre: 'Ágil', sprite: 'assets/agilis.png', x: AGIL.x, z: AGIL.z, escala: 2.2, flota: true }],
    // Objetos: sin "modelo" se usa el genérico del motor; hud = contador del markup donde se muestran
    objetos: { semilla: { nombre: 'semilla', hud: 'i-madera' } },
    recursos: [
      { id: 's1', tipo: 'semilla', x: 6, z: 10 },
      { id: 's2', tipo: 'semilla', x: -12, z: 8 },
      { id: 's3', tipo: 'semilla', x: 22, z: -6, fondo: true, burbujas: 1, avisoFondo: 'La semilla está en el fondo de la poza: mantén C (o Bucear)' },
    ],

    // ---------- Historia: 3 pasos ----------
    historia: {
      pasos: [
        { id: 'hablar', texto: 'Habla con Ágil', guia: G => G.misiones.at('agil') },
        { id: 'semillas', texto: 'Recoge 3 semillas', progreso: S => ` (${S.inv.semilla}/3)`,
          hasta: { tiene: { semilla: 3 } }, // avanza solo
          alCompletar: G => { G.eventos.log('SemillasRecogidas'); if (!G.dialogo.open()) G.dialogo.say(G.dialogo.L('evento:SemillasRecogidas')); },
          guia: G => G.misiones.needItems({ semilla: 3 }) },
        { id: 'sembrar', texto: 'Vuelve con Ágil y siembra', guia: G => G.misiones.at('agil') },
      ],
      fin: () => 'Las tres semillas ya están en la tierra. Esta isla es una plantilla: cámbiala por tu propio juego.',
    },
    // ---------- Misión secundaria: solo datos ----------
    misiones: [
      { id: 'lago', titulo: 'La semilla del lago', hud: 'Lago: bucear',
        pasos: [{ texto: 'Bucea hasta la semilla del fondo de la poza', hasta: { recogido: 's3' } }],
        recompensa: { hito: 'lago' } },
    ],
    // ---------- Coleccionables: tres plantas, sin modelo propio ----------
    diario: {
      titulo: 'Cuaderno de la isla', corto: 'Cuaderno', boton: 'Cuaderno',
      categorias: { planta: { nombre: 'Plantas', desconocido: 'Una planta', sonido: 'pickup', rafaga: 'feathers' } },
      entradas: [
        { id: 'helecho', cat: 'planta', nombre: 'Helecho', x: -10, z: -2, texto: 'Planta sin flores que se reproduce por esporas.' },
        { id: 'ceiba', cat: 'planta', nombre: 'Ceiba', x: 4, z: -10, texto: 'Árbol enorme de tronco ancho.' },
        { id: 'flor', cat: 'planta', nombre: 'Flor de la cima', x: -16, z: -12, texto: 'Crece arriba, donde da más el sol.' },
      ],
      hitos: [{ id: 'cuaderno', todos: true }],
    },
    ropa: [
      { clave: 'sombrero', hito: 'lago', nombre: 'Sombrero explorador', pista: 'la semilla del lago', viste: { slot: 'head', id: 'sombrero', color: '#8a6a3a' } },
      { clave: 'gafas:#c9a227', hito: 'cuaderno', nombre: 'Gafas doradas', pista: 'el Cuaderno completo', viste: { slot: 'eyes', id: 'gafas', color: '#c9a227' } },
    ],
    eventos: { defs: {
      PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'isla', chars: ['player'], scene: 'portrait' },
      MisionAceptada: { type: 'QuestAccepted', loc: 'isla', chars: ['agil'], scene: 'dialogue' },
      SemillasRecogidas: { type: 'ResourceMilestoneReached', loc: 'isla', chars: ['vittata'], scene: null },
      IslaSembrada: { type: 'ChapterCompleted', loc: 'isla', chars: ['vittata', 'agil'], scene: 'final' },
    } },
    dialogos: { datos: () => DIALOGOS, retratos: { 'Ágil': 'assets/agilis.png', Vittata: 'assets/vittata.png' }, retratoDefecto: 'assets/vittata.png' },
    comic: {
      marca: 'LA ISLA DE LAS SEMILLAS', tituloDefecto: 'Mi isla', archivo: 'isla-semillas-mi-comic', pdfTitulo: 'Isla de las semillas',
      capturas: ['siembra'], portadas: {},
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name} y llegué a la isla de las semillas.` },
        { id: 'final', img: 'siembra', needs: 'IslaSembrada', texto: 'Encontré las tres semillas y la isla volvió a florecer.' },
      ],
    },

    // Al crear el personaje por primera vez
    inicio(G) { G.dialogo.say(G.dialogo.L('inicio:isla'), () => G.ui.toast('Habla con Ágil', 3000)); },

    // Lo que no es dato: un huerto que florece al final y la conversación con Ágil
    preparar(G) {
      const S = G.S, H = G.terreno.height, L = G.dialogo.L;
      const huerto = new THREE.Group(), brotes = new THREE.Group();
      const tierra = new THREE.MeshLambertMaterial({ color: '#7a5634' }), hoja = new THREE.MeshLambertMaterial({ color: '#5fc46a' });
      for (let i = 0; i < 3; i++) {
        const surco = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 2.4), tierra); surco.position.set(i * 1.1, 0.1, 0); huerto.add(surco);
        const brote = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 6), hoja); brote.position.set(i * 1.1, 0.6, 0); brotes.add(brote);
      }
      const P = G.terreno.places.inicio;
      huerto.add(brotes); huerto.position.set(P.x + 2, H(P.x + 2, P.z - 3), P.z - 3); G.renderer.scene.add(huerto);
      G.fisica.colliders.push({ x: P.x + 3.1, z: P.z - 3, r: 1.6, h: 0.3, kind: 'obj' });

      function hablar() {
        if (S.step === 0) { G.dialogo.say(L('interact:agil'), () => { G.eventos.log('MisionAceptada'); G.misiones.advanceTo(1); }); return; }
        if (S.step === 1) { G.dialogo.say([{ who: 'Ágil', img: 'assets/agilis.png', text: `Llevas ${S.inv.semilla} de 3 semillas.` }]); return; }
        if (S.step === 2 && !S.complete) {
          S.complete = true; brotes.visible = true;
          G.eventos.log('IslaSembrada'); G.comic.capture('siembra');
          G.fx.burst(huerto.position.x + 1.1, huerto.position.y + 1, huerto.position.z, 'gold', 30); G.audio.play('unlock');
          G.misiones.advanceTo(G.misiones.DONE);
          G.dialogo.say(L('evento:IslaSembrada'), () => G.misiones.showEnd());
          return;
        }
        G.dialogo.say([{ who: 'Ágil', img: 'assets/agilis.png', text: '¡Mira cómo crecen!' }]);
      }
      G.interaccion.add({ id: 'agil', x: AGIL.x, z: AGIL.z, r: 2.4, label: () => S.step === 2 && !S.complete ? 'Sembrar con Ágil' : 'Hablar con Ágil', use: hablar });
      G.on('apply', () => { brotes.visible = S.complete; });
      G.c.brotes = brotes;
    },

    // Recorrido automático de la plantilla (AV.selfTest dentro de la plantilla; AV.templateTest lo usa)
    pruebas: {
      async selfTest(G, T) {
        const S = G.S, $ = G.util.$, { check, result } = T.runner(), { teleport, tick, drain, useAt } = T;
        const keep = T.keepSave();
        G.quiet = true; G.guardado.reset(true);
        check('Crea el personaje', G.creador.saveCharacter({ name: 'Semilla', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
        check('Empieza en el paso 1 de 3', S.step === 0 && $('steps').children.length === 3);
        useAt('agil'); drain();
        check('Ágil da la misión (paso por script)', S.step === 1 && G.eventos.had('MisionAceptada'), 'paso ' + S.step);
        useAt('s1'); useAt('s2');
        check('Dos semillas al pasar por encima, en su contador', S.inv.semilla === 2 && $('i-madera').textContent === '2', JSON.stringify(S.inv));
        const s3 = G.objetos.find('s3');
        teleport(s3.x + 0.4, s3.z); S.pos.y = S.water - G.fisica.SWIM_DEPTH; tick(0.3);
        check('La semilla del lago no se alcanza flotando', G.fisica.MOVE.swimming && !S.collected.includes('s3'));
        G.input.keys.add('c'); tick(2.5); G.input.keys.delete('c');
        check('Buceando: misión del lago completa y sombrero ganado', S.collected.includes('s3') && S.missions.lago && S.unlocked.includes('sombrero'));
        drain();
        check('Con 3 semillas la historia avanza sola (disparador "tiene")', S.step === 2 && G.eventos.had('SemillasRecogidas'), 'paso ' + S.step);
        for (const f of G.diario.entries) { teleport(f.x + 0.3, f.z); tick(0.1); }
        check('Cuaderno completo y su recompensa', S.field.length === G.diario.total && S.unlocked.includes('gafas:#c9a227'), S.field.join(','));
        useAt('agil'); drain();
        check('Final: isla sembrada y pantalla de fin', S.complete && S.step === G.misiones.DONE && !$('end').hidden && G.c.brotes.visible);
        check('El cómic sale de los eventos de la plantilla', G.comic.comicPanels().length === 2);
        G.guardado.save(true); const snap = G.guardado.serialize(); G.guardado.reset(true);
        try { localStorage.setItem(G.guardado.KEY, snap); } catch (e) { /* sin almacenamiento */ }
        check('Guardar y cargar', G.guardado.load(true) && S.complete && S.field.length === 3);
        G.guardado.reset(true);
        T.restoreSave(keep);
        G.quiet = false;
        return result();
      },
    },
  });
})();
