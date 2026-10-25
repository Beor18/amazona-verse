/* Content pack cap1 · ficha del capítulo 1 "El día que el cielo se rompió"
   Metadatos, guardado (versión, claves propias y migraciones de partidas viejas), eventos narrativos, diálogos,
   protagonista y cómic. El resto del capítulo está en mundo.js, coleccionables.js, misiones.js e historia.js. */
(function () {
  'use strict';
  // Eventos narrativos: clave del capítulo -> tipo genérico (directivo V4, sección 7.2) y datos de escena
  const EVENT_DEFS = {
    PlayerCharacterCreated: { type: 'CharacterCreated', loc: 'villa_raiz', chars: ['player'], scene: 'portrait' },
    PlayerCharacterUpdated: { type: 'CharacterCustomized', loc: 'taller_vittata', chars: ['player'], scene: 'portrait' },
    WorkshopExplored: { type: 'LocationDiscovered', loc: 'taller_vittata', chars: ['vittata'], scene: 'workshop' },
    LumaHelped: { type: 'QuestAccepted', loc: 'villa_raiz', chars: ['vittata', 'luma'], scene: 'dialogue' },
    ResourcesCollected: { type: 'ResourceMilestoneReached', loc: 'villa_raiz', chars: ['vittata'], scene: 'gather' },
    LandInspected: { type: 'LocationDiscovered', loc: 'parcela', chars: ['vittata', 'luma'], scene: 'parcel' },
    LandSelected: { type: 'LandDecisionMade', loc: 'parcela', chars: ['vittata'], scene: 'parcel' },
    ShelterConstructed: { type: 'BuildingConstructed', loc: 'parcela', chars: ['vittata', 'luma'], scene: 'shelter' },
    ShelterFlooded: { type: 'BuildingDamaged', loc: 'parcela_rio', chars: ['vittata', 'luma'], scene: 'shelter' },
    ShelterDismantled: { type: 'LandDecisionMade', loc: 'parcela_rio', chars: ['vittata'], scene: 'shelter' },
    ShelterRelocated: { type: 'LandDecisionMade', loc: 'parcela_colina', chars: ['vittata', 'luma'], scene: 'shelter' },
    GuardianMet: { type: 'CharacterMet', loc: 'sendero_sur', chars: ['vittata', 'guardian'], scene: 'dialogue' },
    WorkshopUpgradeUnlocked: { type: 'InventionUnlocked', loc: 'taller_vittata', chars: ['guardian'], scene: 'workshop' },
    TransmitterActivated: { type: 'BuildingRepaired', loc: 'taller_vittata', chars: ['vittata', 'guardian'], scene: 'symbol' },
    BoatBlueprintUnlocked: { type: 'InventionUnlocked', loc: 'taller_vittata', chars: ['vittata'], scene: 'symbol' },
    LocationDiscoveredMirador: { type: 'LocationDiscovered', loc: 'mirador', chars: ['vittata', 'luma'], scene: 'final' },
    ChapterCompleted: { type: 'ChapterCompleted', loc: 'mirador', chars: ['vittata', 'luma', 'guardian'], scene: 'final' },
    ComicExported: { type: 'ComicExported', loc: null, chars: ['player'], scene: null },
    // Sprint 1: misiones de habilidad, Diario de Campo y ropa desbloqueable
    MissionCompleted: { type: 'QuestCompleted', loc: 'villa_raiz', chars: ['vittata'], scene: null },
    FieldEntryFound: { type: 'CollectibleFound', loc: 'villa_raiz', chars: ['vittata'], scene: null },
    OutfitUnlocked: { type: 'ItemUnlocked', loc: null, chars: ['vittata'], scene: null },
    LumaChoice: { type: 'DialogueChoiceMade', loc: 'taller_vittata', chars: ['vittata', 'luma'], scene: 'dialogue' },
  };
  const DONE = 8; // pasos de la historia (historia.js)

  // ---------- Retratos neutros (SVG en línea, sin archivos nuevos) ----------
  // La Voz del transmisor y el Narrador no llevan la cara de ningún personaje (CAP1_PENDIENTE P0-2): el guion no revela quién habla
  // por el transmisor y la propia Vittata dice «esa voz es de ahora». La caja de diálogo recorta el retrato con
  // translate(-8%, 35%) scale(1.6), así que lo que se ve es el cuadro (0.24-0.86, 0-0.59) del SVG: todo va centrado en (55, 30).
  // [KELVIN-4] Cara definitiva de la Voz (silueta, onda o ninguna) y si es alguien del pacto de los 36: decide Kelvin.
  const svgURI = cuerpo => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' + cuerpo + '</svg>');
  const RETRATO_VOZ = svgURI(
    '<style>.o{fill:none;stroke:#ffd27a;stroke-linecap:round}' +
    '.r{transform-box:fill-box;transform-origin:center;animation:p 2.4s ease-out infinite}.r2{animation-delay:.8s}.r3{animation-delay:1.6s}' +
    '@keyframes p{0%{opacity:0;transform:scale(.4)}25%{opacity:.95}100%{opacity:0;transform:scale(1.25)}}' +
    '@media (prefers-reduced-motion:reduce){.r{animation:none;opacity:.55}}</style>' +
    '<circle cx="55" cy="30" r="27" fill="#10241c"/><circle cx="55" cy="30" r="27" fill="none" stroke="#7fd3c8" stroke-width="1.2" opacity=".6"/>' +
    '<circle class="o r" cx="55" cy="30" r="9" stroke-width="2.2"/><circle class="o r r2" cx="55" cy="30" r="15" stroke-width="2"/><circle class="o r r3" cx="55" cy="30" r="21" stroke-width="1.8"/>' +
    '<circle cx="55" cy="30" r="4.6" fill="#ffd27a"/><circle cx="55" cy="30" r="2" fill="#fff6d8"/>');
  const RETRATO_NARRADOR = svgURI(
    '<circle cx="55" cy="30" r="27" fill="#10241c"/>' +
    '<path d="M55 21C48 16.500 40 17 35 19V44C40 42 48 42.500 55 47Z" fill="#f4ecd2"/><path d="M55 21C62 16.500 70 17 75 19V44C70 42 62 42.500 55 47Z" fill="#fff8e2"/>' +
    '<path d="M55 21V47" stroke="#c9a227" stroke-width="1.6"/>' +
    '<path d="M39 25C42 24.300 46 24.600 51 27M39 30C42 29.300 46 29.600 51 32M39 35C42 34.300 46 34.600 51 37M59 27C64 24.600 68 24.300 71 25M59 32C64 29.600 68 29.300 71 30M59 37C64 34.600 68 34.300 71 35" fill="none" stroke="#c9a227" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M55 6.500L56.400 10.200 60.100 11.600 56.400 13 55 16.700 53.600 13 49.900 11.600 53.600 10.200Z" fill="#ffd27a"/>');

  AVE.registerPack({
    id: 'cap1',
    meta: { titulo: 'El día que el cielo se rompió', capitulo: 1, almacen: 'amazonaverse' },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, acompanante: { altura: 1.4 }, aparicion: { x: -8, z: -2.5 }, camara: 0.35 },
    guardado: {
      version: 5,
      // edu: misión educativa "La ruta de la gota" y aula (educativa.js, src/game/aula.js). Clave nueva: las partidas viejas la reciben vacía.
      // lugares: ids de los lugares con nombre ya descubiertos (src/game/lugares.js); las partidas viejas la reciben vacía.
      claves: ['examined', 'evaluated', 'refuge', 'builds', 'guardianMet', 'benchUnlocked', 'transmitterOn', 'boatPlan', 'indicators', 'chorus', 'coquis', 'edu', 'lugares'],
      estado: () => ({
        examined: { maquina: false, transmisor: false }, evaluated: { A: false, B: false },
        refuge: null, builds: [], guardianMet: false, benchUnlocked: false, transmitterOn: false, boatPlan: false,
        indicators: { seguridad: '—', acceso: '—', habitat: '—' }, chorus: false, coquis: [], lugares: [],
        edu: {
          hecho: { p1: false, p2: false, p3: false, p4: false, p5: false, p6: false, p7: false, p8: false },
          inicio: null, fin: null, pred1: null, pred2: null, perchas: {}, cadena: 0, vista: 0, vistos: { A: false, B: false },
          rio: 0, poza: { gota: false, marca: false }, explicacion: 0, contraste: false, fichas: [], formativa: {}, registro: null,
        },
      }),
      validar: d => !!(d.evaluated && d.examined),
      // v2 -> v3: eventos al esquema nuevo, perfil y proyecto de cómic por defecto; v3 -> v4: capítulo terminado = paso final
      migrar(d, h) {
        if (d && d.v === 2) {
          const base = h.freshState(), id = h.newId();
          const m = Object.assign({}, d, { v: 3, saveId: id, profile: base.profile, comic: base.comic });
          m.events = (d.events || []).map((e, i) => h.makeEvent(e.type, e.data, i + 1, e.t || 0, id));
          if (m.events.some(e => e.key === 'PlayerCharacterCreated')) m.profile = Object.assign({}, base.profile, { created: true });
          d = m;
        }
        if (d && d.v === 3) {
          d = Object.assign({}, d, { v: 4 });
          if (d.complete && d.step === 7) d.step = DONE;
        }
        // v4 -> v5: mapa nuevo de El Yunque (programador gráfico). Las posiciones del mundo viejo (±70 m) no existen en el mapa:
        // el jugador vuelve a la aparición y el refugio construido pasa a su terreno (A o B) en el mapa nuevo.
        if (d && d.v === 4) {
          d = Object.assign({}, d, { v: 5 });
          const MD = window.AV_MAPA_CAP1;
          if (MD) {
            d.pos = Object.assign({}, h.freshState().pos);
            const L = d.refuge && MD.lugares && MD.lugares[d.refuge.parcel];
            if (L) d.refuge = Object.assign({}, d.refuge, { x: L.x, z: L.z - 1.5 });
          }
        }
        return d;
      },
    },
    eventos: {
      defs: EVENT_DEFS,
      // Los eventos de un terreno llevan su lugar y la elección
      extra: (def, data) => ({ location: data.parcel ? (data.parcel === 'A' ? 'parcela_rio' : 'parcela_colina') : def.loc, choice: data.choice || (data.parcel || null) }),
    },
    // Nombres de aventurero que el niño elige en el creador (dos listas; sin texto libre). Ver src/game/creador.js
    nombres: {
      a: ['Nube', 'Pluma', 'Brisa', 'Rayo', 'Trueno', 'Lluvia', 'Semilla', 'Hoja', 'Coral', 'Estrella', 'Luna', 'Sol', 'Ola', 'Flor', 'Viento', 'Cielo', 'Ceiba', 'Palma'],
      b: ['Azul', 'Verde', 'Veloz', 'Valiente', 'Feliz', 'Alegre', 'Brillante', 'Gentil', 'Tropical', 'Solar', 'del Río', 'del Monte', 'del Yunque', 'de la Bahía', 'del Mar'],
    },
    // Aula (src/game/aula.js): progreso del aula en el dispositivo, separado de la partida; lecciones en lecciones.js
    aula: { clave: 'amazonaverse.aula.cap1', estado: 'edu', archivo: 'amazonaverse_cap1', lecciones: () => window.AV_LECCIONES_CAP1 },
    // Criadero (src/game/criadero.js): el nido entra en el mundo desde la charla con Luma (evento LumaHelped, minuto 2), no al
    // terminar la primera misión (DIVERSION_CAP1 mejora 2). Luma lo presenta en cuanto el jugador queda libre.
    criadero: { desde: 'LumaHelped' },
    // Lugares descubiertos (src/game/lugares.js): «Descubriste: <lugar>» al llegar a un POI con nombre del mapa. Fuera: Luma (es un
    // personaje), las paradas de aprendizaje y los grupos de la escena de Kelvin (nombres internos de assets/data/mapa_cap1.js).
    descubrir: { omitir: ['luma', 'aldea', /^kelvin_/, /^parada_/] },
    // Diálogos del guion (dialogos_cap1.js, generado desde dialogos_cap1.json)
    dialogos: {
      datos: () => window.AV_DIALOGOS_CAP1,
      // La Voz y el Narrador llevan retratos neutros (arriba): ya no comparten la cara del Guardián ni la de Vittata
      retratos: { Vittata: 'assets/vittata.png', Luma: 'assets/luma.png', 'Guardián': 'assets/guardian.png', Voz: RETRATO_VOZ, Narrador: RETRATO_NARRADOR },
      retratoDefecto: 'assets/vittata.png',
      emociones: { feliz: 'happy', triste: 'sad', sorpresa: 'surprised', idea: 'idea', enojo: 'angry' },
    },
    comic: {
      marca: 'AMAZONA VERSE · CAPÍTULO 1', tituloDefecto: 'Mi primera reconstrucción',
      // Sin texto libre (seguridad infantil): el niño elige el título y el texto de cada viñeta
      titulos: ['Mi primera reconstrucción', 'El día que el cielo se rompió', 'La ruta de la gota', 'Vittata y yo', 'Aprendiz de Villa Raíz', 'Construimos juntos'],
      archivo: 'amazona-verse-mi-comic', pdfTitulo: 'Amazona Verse - Mi comic', pdfProductor: 'Amazona Verse prototipo',
      capturas: ['workshop', 'shelter', 'final'], portadas: { taller: 'workshop', refugio: 'shelter' },
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name}, aprendiz de Vittata en Villa Raíz.`,
          opciones: ['Hoy empezó mi aventura en Villa Raíz.', 'Me convertí en aprendiz de Vittata.', 'Con mi pañuelo listo, salí a ayudar.'] },
        { id: 'taller', img: 'workshop', needs: 'WorkshopExplored', texto: 'La Gran Ruptura dañó el taller de Vittata, pero entre los restos vimos posibilidades.',
          opciones: ['El taller quedó hecho pedazos, pero no nos rendimos.', 'Entre los restos encontramos piezas útiles.', 'Vittata me enseñó a ver posibilidades.'] },
        { id: 'refugio', img: 'shelter', needs: 'ShelterConstructed', texto: S => {
          if (S.builds[0] === 'B') return 'Elegí construir en la colina porque descubrí que el río podía inundar el otro terreno.';
          if (S.builds.includes('A') && S.refuge && S.refuge.parcel === 'B') return 'Mi primera idea no era segura. Aprendí a observar mejor el terreno y encontré una solución.';
          return 'Construimos junto al río y la crecida dañó el refugio. Aprendí que construir rápido no siempre es construir bien.';
        }, opciones: ['Antes de construir, seguimos la ruta de la gota.', 'Lo que llueve en la montaña baja por el río.', 'Elegimos dónde construir mirando la evidencia.'] },
        { id: 'final', img: 'final', needs: 'ChapterCompleted', texto: 'El transmisor nos mostró un símbolo de 36 fragmentos. Desde el mirador vimos otras islas: construiremos un bote.',
          opciones: ['El transmisor mostró un símbolo de 36 fragmentos.', 'Desde el mirador vimos otras islas.', 'La aventura apenas comienza. Continuará…'] },
      ],
      // Viñeta final: el símbolo de los 36 arriba a la derecha y el plano del bote abajo a la derecha (el medallón del jugador va abajo a la izquierda)
      decorar: (x, p, b, ih, G) => {
        if (p.img !== 'final') return;
        G.c.drawSymbol(x, b.x + b.w - 80, b.y + 80, Math.min(64, ih * 0.3));
        const w = Math.min(230, b.w * 0.42, (ih - 160) / 0.7);
        if (w >= 110 && G.c.drawBlueprint) { x.save(); x.translate(b.x + b.w - w - 16, b.y + ih - w * 0.7 - 16); x.rotate(-0.035); G.c.drawBlueprint(x, 0, 0, w); x.restore(); }
      },
    },
    depuracion: G => ({ BUSHES: G.c.BUSHES }),
    preparar(G) {
      G.audio.define('guiro', (t, a, A) => { for (let k = 0; k < 7; k++) A.noise(t + k * 0.045, 0.035, { freq: 3200, q: 4, gain: 0.22 }); });
      // Sonidos de la historia (CAP1_PENDIENTE P1-3 y P1-4): sintéticos con A = { tone, noise, pent } de src/engine/audio.js, sin archivos
      // nuevos. Los usa historia.js: apertura (viento, vmmm, onda), construir, crecida (lluvia, trueno, crecida), transmisor (bip,
      // estatica) y mirador (parpadeo). El plano del bote reutiliza la muestra nido_chispa de assets/audio.
      const snd = (n, f) => G.audio.define(n, f);
      // Viento sobre la pantalla negra: ráfagas de aire que se solapan
      snd('viento', (t, a, A) => {
        for (let k = 0; k < 7; k++) { const f = 240 + (k % 3) * 140; A.noise(t + k * 0.62, 1.8, { freq: f, to: f * 2, q: 0.9, gain: 0.05 + (k % 2) * 0.02 }); }
        A.noise(t, 4.6, { type: 'lowpass', freq: 380, q: 0.5, gain: 0.05 });
      });
      // VMMMM: el mecanismo de Vittata despega
      snd('vmmm', (t, a, A) => {
        A.tone(72, t, 1.8, { type: 'sawtooth', to: 150, gain: 0.07 }); A.tone(144, t, 1.8, { type: 'triangle', to: 300, gain: 0.05 });
        A.noise(t, 1.6, { freq: 500, to: 1600, q: 2, gain: 0.04 });
      });
      // La onda luminosa cruza el cielo
      snd('onda', (t, a, A) => { A.tone(560, t, 1.5, { type: 'sine', to: 80, gain: 0.12 }); A.noise(t, 1.5, { freq: 2600, to: 280, q: 1.4, gain: 0.12 }); });
      // Tres golpes de martillo en la madera y un acorde corto de «ya quedó»
      snd('construir', (t, a, A) => {
        for (let k = 0; k < 3; k++) { A.noise(t + k * 0.17, 0.09, { type: 'lowpass', freq: 900, q: 0.8, gain: 0.3 }); A.tone(190 - k * 12, t + k * 0.17, 0.12, { type: 'triangle', to: 95, gain: 0.22 }); }
        [0, 2, 4].forEach((i, k) => A.tone(A.pent(i, 523.25), t + 0.62 + k * 0.09, 0.3, { gain: 0.12 }));
      });
      // Crecida: lluvia continua (se vuelve a tocar cada segundo y se solapa), trueno lejano y el río que sube
      snd('lluvia', (t, a, A) => { A.noise(t, 1.5, { type: 'highpass', freq: 3800, q: 0.4, gain: 0.05 }); A.noise(t, 1.5, { freq: 1400, q: 0.6, gain: 0.03 }); });
      snd('trueno', (t, a, A) => {
        A.noise(t, 2.6, { type: 'lowpass', freq: 260, to: 70, q: 0.7, gain: 0.34 }); A.noise(t + 0.5, 2.2, { type: 'lowpass', freq: 180, to: 50, q: 0.7, gain: 0.2 });
        A.tone(58, t, 2.0, { type: 'sine', to: 34, gain: 0.2 });
      });
      snd('crecida', (t, a, A) => { A.noise(t, 3.2, { type: 'lowpass', freq: 600, to: 160, q: 0.6, gain: 0.2 }); A.noise(t + 0.8, 2.4, { freq: 900, to: 350, q: 0.8, gain: 0.08 }); });
      // Transmisor: BIP… BIP… y la estática de la radio bajo la Voz
      snd('bip', (t, a, A) => { A.tone(1320, t + 0.9, 0.12, { type: 'square', gain: 0.05 }); A.tone(1320, t + 1.2, 0.12, { type: 'square', gain: 0.05 }); }); // tras el coro
      snd('estatica', (t, a, A) => { for (let k = 0; k < 10; k++) A.noise(t + k * 0.07 + (k * k % 3) * 0.02, 0.05, { type: 'highpass', freq: 2400 + k * 280, q: 0.7, gain: 0.05 }); });
      // Mirador: cada destello de la luz lejana es una campanita (a: número del destello, sube la nota)
      snd('parpadeo', (t, a, A) => { const f = A.pent(4 + 2 * (a || 0), 440); A.tone(f, t, 0.55, { type: 'sine', gain: 0.14 }); A.tone(f * 2, t + 0.02, 0.3, { type: 'sine', gain: 0.05 }); });
    },
  });
})();
