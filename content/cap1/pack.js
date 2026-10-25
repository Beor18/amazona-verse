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

  AVE.registerPack({
    id: 'cap1',
    meta: { titulo: 'El día que el cielo se rompió', capitulo: 1, almacen: 'amazonaverse' },
    jugador: { nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75, acompanante: { altura: 1.4 }, aparicion: { x: -8, z: -2.5 }, camara: 0.35 },
    guardado: {
      version: 4,
      claves: ['examined', 'evaluated', 'refuge', 'builds', 'guardianMet', 'benchUnlocked', 'transmitterOn', 'boatPlan', 'indicators', 'chorus', 'coquis'],
      estado: () => ({
        examined: { maquina: false, transmisor: false }, evaluated: { A: false, B: false },
        refuge: null, builds: [], guardianMet: false, benchUnlocked: false, transmitterOn: false, boatPlan: false,
        indicators: { seguridad: '—', acceso: '—', habitat: '—' }, chorus: false, coquis: [],
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
        return d;
      },
    },
    eventos: {
      defs: EVENT_DEFS,
      // Los eventos de un terreno llevan su lugar y la elección
      extra: (def, data) => ({ location: data.parcel ? (data.parcel === 'A' ? 'parcela_rio' : 'parcela_colina') : def.loc, choice: data.choice || (data.parcel || null) }),
    },
    // Diálogos del guion (dialogos_cap1.js, generado desde dialogos_cap1.json)
    dialogos: {
      datos: () => window.AV_DIALOGOS_CAP1,
      retratos: { Vittata: 'assets/vittata.png', Luma: 'assets/luma.png', 'Guardián': 'assets/guardian.png', Voz: 'assets/guardian.png', Narrador: 'assets/vittata.png' },
      retratoDefecto: 'assets/vittata.png',
      emociones: { feliz: 'happy', triste: 'sad', sorpresa: 'surprised', idea: 'idea', enojo: 'angry' },
    },
    comic: {
      marca: 'AMAZONA VERSE · CAPÍTULO 1', tituloDefecto: 'Mi primera reconstrucción',
      archivo: 'amazona-verse-mi-comic', pdfTitulo: 'Amazona Verse - Mi comic', pdfProductor: 'Amazona Verse prototipo',
      capturas: ['workshop', 'shelter', 'final'], portadas: { taller: 'workshop', refugio: 'shelter' },
      vinetas: [
        { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', texto: S => `Soy ${S.profile.name}, aprendiz de Vittata en Villa Raíz.` },
        { id: 'taller', img: 'workshop', needs: 'WorkshopExplored', texto: 'La Gran Ruptura dañó el taller de Vittata, pero entre los restos vimos posibilidades.' },
        { id: 'refugio', img: 'shelter', needs: 'ShelterConstructed', texto: S => {
          if (S.builds[0] === 'B') return 'Elegí construir en la colina porque descubrí que el río podía inundar el otro terreno.';
          if (S.builds.includes('A') && S.refuge && S.refuge.parcel === 'B') return 'Mi primera idea no era segura. Aprendí a observar mejor el terreno y encontré una solución.';
          return 'Construimos junto al río y la crecida dañó el refugio. Aprendí que construir rápido no siempre es construir bien.';
        } },
        { id: 'final', img: 'final', needs: 'ChapterCompleted', texto: 'El transmisor nos mostró un símbolo de 36 fragmentos. Desde el mirador vimos otras islas: construiremos un bote.' },
      ],
      decorar: (x, p, b, ih, G) => { if (p.img === 'final') G.c.drawSymbol(x, b.x + b.w - 80, b.y + 80, Math.min(64, ih * 0.3)); },
    },
    depuracion: G => ({ BUSHES: G.c.BUSHES }),
    preparar(G) {
      G.audio.define('guiro', (t, a, A) => { for (let k = 0; k < 7; k++) A.noise(t + k * 0.045, 0.035, { freq: 3200, q: 4, gain: 0.22 }); });
    },
  });
})();
