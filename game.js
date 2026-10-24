/* Amazona Verse · Capítulo 1 "El día que el cielo se rompió" (guion de Kelvin García, v1.0)
   Prototipo web 3D con Three.js r128. Vittata, Luma y el Guardián usan renders oficiales como sprites
   (sustitutos declarados). La lógica está separada del render para probarla con AV.selfTest(). */
(function () {
  'use strict';

  const SAVE_KEY = 'amazonaverse.save';
  const SAVE_VERSION = 4;
  const EVENT_SCHEMA = 1;

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
  };

  // Creador de personaje (MVP): presets basados en renders oficiales de especies
  const PRESETS = [
    { id: 'agilis', name: 'Pico negro (agilis)' }, { id: 'albifrons', name: 'Frente blanca (albifrons)' },
    { id: 'amazonica', name: 'Ala naranja (amazonica)' }, { id: 'auropalliata', name: 'Nuca amarilla (auropalliata)' },
    { id: 'festiva', name: 'Festiva (festiva)' }, { id: 'guildingii', name: 'Multicolor (guildingii)' },
    { id: 'oratrix', name: 'Cabeza amarilla (oratrix)' }, { id: 'versicolor', name: 'Cara azul (versicolor)' },
  ];
  const OUTFITS = [
    { id: 'naranja', name: 'Pañuelo naranja', color: '#f2a03d' }, { id: 'rojo', name: 'Pañuelo rojo', color: '#d6403a' },
    { id: 'azul', name: 'Pañuelo azul', color: '#3d8fb0' }, { id: 'morado', name: 'Pañuelo morado', color: '#7a4fb3' },
    { id: 'amarillo', name: 'Pañuelo amarillo', color: '#e8c32a' },
  ];
  const ACCESSORIES = [
    { id: 'ninguno', name: 'Ninguno' }, { id: 'gafas', name: 'Gafas de inventor' },
    { id: 'gorra', name: 'Gorra de explorador' }, { id: 'medalla', name: 'Medalla de constructor' },
  ];
  const NAME_OK = /^[\p{L}\p{N} '\-]{1,16}$/u;
  const RIVER_X = 30;
  const WORLD = 70;

  // ---------- Datos del capítulo ----------
  const NEEDS = { madera: 4, piedra: 2, componente: 1 };
  const REFUGE_COST = { madera: 3, piedra: 2 };
  const REPAIR_COST = { madera: 1, componente: 1 };

  const PLACES = {
    taller: { x: -9, z: -7, r: 7 },
    villa: { x: 3, z: 1, r: 6 },
    A: { x: 20, z: 6, r: 7, half: 4, name: 'Junto al río',
         info: { Área: '64 m²', Elevación: 'baja, a la orilla del río', Acceso: 'corto, cerca de Villa Raíz', 'Señal de riesgo': 'marcas de agua a 1 m en los árboles', Hábitat: 'nidos de ribera cerca' } },
    B: { x: -24, z: 20, r: 7, half: 4, name: 'La colina',
         info: { Área: '64 m²', Elevación: 'alta, sobre la colina', Acceso: 'largo, cuesta arriba', 'Señal de riesgo': 'ninguna visible', Hábitat: 'bosque seco, sin nidos' } },
  };

  const RESOURCES = [
    { id: 'm1', type: 'madera', x: -3, z: 7 }, { id: 'm2', type: 'madera', x: 7, z: 9 },
    { id: 'm3', type: 'madera', x: -14, z: 2 }, { id: 'm4', type: 'madera', x: 10, z: -9 },
    { id: 'm5', type: 'madera', x: -17, z: -13 },
    { id: 'p1', type: 'piedra', x: 12, z: -2 }, { id: 'p2', type: 'piedra', x: -6, z: 13 },
    { id: 'p3', type: 'piedra', x: 4, z: -15 }, { id: 'p4', type: 'piedra', x: -15, z: 8 },
    { id: 'c1', type: 'componente', x: -12, z: -16 }, { id: 'c2', type: 'componente', x: 9, z: 14 },
  ];

  const STEPS = [
    'Examina tu taller dañado',
    'Ayuda a Luma: habla con ella',
    'Recolecta 4 madera, 2 piedras y 1 pieza de metal',
    'Inspecciona los dos terrenos',
    'Elige un terreno y construye el refugio',
    'Habla con el Guardián Constructor',
    'Repara y activa el transmisor',
    'Sube al mirador de la colina',
  ];
  const DONE = STEPS.length;
  const LABEL = { madera: 'madera', piedra: 'piedra', componente: 'pieza de metal' };
  const IMG = { V: 'assets/vittata.png', L: 'assets/luma.png', G: 'assets/guardian.png' };

  // ---------- Terreno ----------
  function rawHeight(x, z) {
    let h = Math.sin(x * 0.06) * 1.2 + Math.cos(z * 0.05) * 1.0 + Math.sin((x + z) * 0.03) * 1.5;
    const dB = Math.hypot(x - PLACES.B.x, z - PLACES.B.z);
    h += 6 * Math.exp(-(dB * dB) / 260);
    const dr = Math.abs(x - RIVER_X);
    if (dr < 9) h -= (9 - dr) * 0.5;
    const dM = Math.hypot(x + 30, z - 33);
    h += 6 * Math.exp(-(dM * dM) / 70); // colina del mirador
    return h;
  }
  PLACES.mirador = { x: -30, z: 33, r: 2.5 };
  const FLATS = ['villa', 'taller', 'A', 'B', 'mirador'].map(k => ({ k, x: PLACES[k].x, z: PLACES[k].z, r: PLACES[k].r, base: rawHeight(PLACES[k].x, PLACES[k].z) }));
  for (const f of FLATS) PLACES[f.k].base = f.base;
  function height(x, z) {
    let h = rawHeight(x, z);
    for (const f of FLATS) {
      const d = Math.hypot(x - f.x, z - f.z);
      const t = Math.min(1, Math.max(0, (f.r + 4 - d) / 4));
      h = h + (f.base - h) * t * t * (3 - 2 * t);
    }
    return h;
  }
  // Suelo donde se para un personaje: el terreno o la plataforma del mirador
  function surfaceY(x, z) {
    const g = height(x, z), M = PLACES.mirador;
    return Math.hypot(x - M.x, z - M.z) < 2.3 ? Math.max(g, height(M.x, M.z) + 0.4) : g;
  }
  const WATER_BASE = rawHeight(RIVER_X, 0) + 1.2;
  const FLOOD_LEVEL = PLACES.A.base + 1.1;
  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }

  // ---------- Estado ----------
  const T = PLACES.taller;
  const SPAWN = { x: T.x + 1, z: T.z + 4.5 };
  function freshState() {
    return {
      v: SAVE_VERSION,
      pos: { x: SPAWN.x, z: SPAWN.z, y: 0 }, vy: 0, facing: { x: 0, z: 1 },
      step: 0, inv: { madera: 0, piedra: 0, componente: 0 },
      examined: { maquina: false, transmisor: false },
      collected: [], evaluated: { A: false, B: false },
      refuge: null, builds: [], guardianMet: false, benchUnlocked: false,
      transmitterOn: false, boatPlan: false, complete: false,
      water: WATER_BASE, event: null, clock: 0,
      indicators: { seguridad: '—', acceso: '—', habitat: '—' },
      events: [], captures: {},
      saveId: newId(),
      profile: { created: false, name: 'Aprendiz', look: null },
      comic: { title: 'Mi primera reconstrucción', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {} },
    };
  }
  function newId() {
    try { const a = new Uint8Array(8); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { return Math.random().toString(16).slice(2, 18); }
  }
  let S = freshState();
  let build = null;
  let dialogQueue = [], dialogDone = null;
  let cardOpen = false;

  // Esquema de evento (NARRATIVE_EVENT_SCHEMA.md): sin datos personales
  function makeEvent(key, data, seq, t) {
    const def = EVENT_DEFS[key] || { type: key, loc: null, chars: [], scene: null };
    data = data || {};
    return {
      id: S.saveId + '-' + seq, schemaVersion: EVENT_SCHEMA, saveId: S.saveId,
      type: def.type, key, chapter: 1, seq, t,
      location: data.parcel ? (data.parcel === 'A' ? 'parcela_rio' : 'parcela_colina') : def.loc,
      characters: def.chars.slice(), choice: data.choice || (data.parcel || null), outcome: data.outcome || null,
      sceneTemplate: def.scene, locKey: 'evt.' + key, meta: data,
    };
  }
  function logEvent(key, data) { S.events.push(makeEvent(key, data, S.events.length + 1, Math.round(S.clock * 10) / 10)); }
  function hadEvent(key) { return S.events.some(e => e.key === key); }

  // ---------- Three.js ----------
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#bfe1d6');
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 55, 165);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight('#fff4dc', '#2f5a3a', 0.95));
  const sun = new THREE.DirectionalLight('#ffe2b0', 0.75);
  sun.position.set(-30, 50, 20);
  scene.add(sun);

  // Texturas del mapa original de 3ds Max: pasto, suelo de selva, palma y agua
  const TEX = new THREE.TextureLoader();
  function tex(name) {
    const t = TEX.load('assets/tex/' + name);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return t;
  }
  const tPasto = tex('pasto.jpg'), tSuelo = tex('suelo.jpg');
  // Suelo con UV de mundo; el color de vértice son pesos: r = arena, g = suelo de selva
  function groundMaterial(scale) {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { tPasto: { value: tPasto }, tSuelo: { value: tSuelo }, uScale: { value: scale } });
      sh.vertexShader = 'varying vec2 vTUv;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  vTUv = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = 'uniform sampler2D tPasto, tSuelo; uniform float uScale; varying vec2 vTUv;\n' + sh.fragmentShader.replace('#include <color_fragment>', [
        'vec3 gP = texture2D(tPasto, vTUv * 0.22 * uScale).rgb * 1.5;',
        'vec3 gS = texture2D(tSuelo, vTUv * 0.3 * uScale).rgb * 1.15;',
        'vec3 sand = vec3(0.86, 0.77, 0.55) * (0.88 + 0.2 * gS.g);',
        'diffuseColor.rgb *= mix(mix(gP, gS, vColor.g), sand, vColor.r);',
      ].join('\n'));
    };
    return m;
  }
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const tGeo = new THREE.PlaneGeometry(WORLD * 2 + 20, WORLD * 2 + 20, 110, 110);
  tGeo.rotateX(-Math.PI / 2);
  const tp = tGeo.attributes.position, colors = [];
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = height(x, z);
    tp.setY(i, y);
    let dirt = Math.max(0, Math.sin(x * 0.21 + Math.cos(z * 0.17) * 2) * Math.cos(z * 0.13 - x * 0.05) - 0.1) * 1.6;
    for (const f of FLATS) dirt = Math.max(dirt, clamp01((f.r + 1 - Math.hypot(x - f.x, z - f.z)) / 3) * 0.8);
    // Arena solo en la orilla del río; el resto de las zonas bajas queda con pasto
    colors.push(clamp01((WATER_BASE + 0.5 - y) / 0.9) * clamp01((15 - Math.abs(x - RIVER_X)) / 4), clamp01(dirt), 0);
  }
  tGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  tGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(tGeo, groundMaterial(1)));

  const tAgua = tex('agua_normal.jpg'); tAgua.repeat.set(3, 18);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(32, WORLD * 2 + 20), new THREE.MeshPhongMaterial({
    color: '#2f7f9f', transparent: true, opacity: 0.85, normalMap: tAgua, normalScale: new THREE.Vector2(0.5, 0.5),
    shininess: 40, specular: new THREE.Color('#5f8fa8') }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(28, WATER_BASE, 0);
  scene.add(water);

  const colliders = [];
  const R = rng(7), treeSpots = [];
  for (let tries = 0; treeSpots.length < 110 && tries < 4000; tries++) {
    const x = (R() * 2 - 1) * WORLD, z = (R() * 2 - 1) * WORLD;
    if (Math.abs(x - RIVER_X) < 7) continue;
    if (FLATS.some(f => Math.hypot(x - f.x, z - f.z) < f.r + 3)) continue;
    if (RESOURCES.some(r => Math.hypot(x - r.x, z - r.z) < 3)) continue;
    if (Math.hypot(x, z + 11) < 4) continue;
    if (Math.hypot(x + 30, z - 33) < 5) continue; // mirador
    treeSpots.push({ x, z, s: 0.8 + R() * 0.7 });
  }
  // Árboles con marcas de agua junto al río (señal de riesgo del terreno A)
  const markTrees = [{ x: 16.5, z: 11.5, s: 1.1 }, { x: 24.5, z: 1.2, s: 1 }];
  const allTrees = treeSpots.concat(markTrees);
  // Dos de cada tres son palmas con la hoja y la corteza del mapa original; el resto, árboles de copa
  const broad = allTrees.filter((t, i) => i % 3 === 2 || markTrees.includes(t));
  const palms = allTrees.filter(t => !broad.includes(t));
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), new THREE.MeshLambertMaterial({ color: '#7a5634' }), broad.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshLambertMaterial({ color: '#2f7d43', flatShading: false }), broad.length);
  const m4 = new THREE.Matrix4();
  broad.forEach((t, i) => {
    const y = height(t.x, t.z);
    m4.makeScale(t.s, t.s, t.s).setPosition(t.x, y + 1.5 * t.s, t.z); trunks.setMatrixAt(i, m4);
    m4.makeScale(t.s * 1.2, t.s, t.s * 1.2).setPosition(t.x, y + 3.4 * t.s, t.z); crowns.setMatrixAt(i, m4);
  });
  for (const t of allTrees) colliders.push({ x: t.x, z: t.z, r: 0.6 * t.s, kind: 'tree' });
  scene.add(trunks, crowns);

  function mergeGeos(geos) {
    const pos = [], nor = [], uv = [], idx = []; let off = 0;
    for (const g of geos) {
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
      for (const i of g.index.array) idx.push(i + off);
      off += g.attributes.position.count;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    m.setIndex(idx);
    return m;
  }
  const PALM_H = 4.2;
  function palmFronds() {
    const parts = [], N = 8;
    for (let k = 0; k < N; k++) {
      const len = 2.8 + (k % 3) * 0.35;
      const g = new THREE.PlaneGeometry(len, 0.9, 8, 1);
      g.translate(len / 2, 0, 0); g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len; p.setY(i, u * 0.7 - u * u * (1.5 + (k % 2) * 0.4)); }
      g.computeVertexNormals();
      g.rotateY(k * Math.PI * 2 / N + (k % 2) * 0.2);
      g.translate(0, PALM_H, 0);
      parts.push(g);
    }
    return mergeGeos(parts);
  }
  const tHoja = TEX.load('assets/tex/palma_hoja.png'), tTronco = tex('palma_tronco.jpg');
  tTronco.repeat.set(1, 4);
  const palmTrunkGeo = new THREE.CylinderGeometry(0.15, 0.27, PALM_H, 7, 1); palmTrunkGeo.translate(0, PALM_H / 2, 0);
  const palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, new THREE.MeshLambertMaterial({ map: tTronco }), palms.length);
  const palmLeaves = new THREE.InstancedMesh(palmFronds(), new THREE.MeshLambertMaterial({ map: tHoja, alphaTest: 0.45, side: THREE.DoubleSide }), palms.length);
  const pQ = new THREE.Quaternion(), pE = new THREE.Euler(), pS = new THREE.Vector3(), pP = new THREE.Vector3();
  palms.forEach((t, i) => {
    pE.set(Math.sin(t.x * 3.1) * 0.12, t.x * 7.3 + t.z * 1.7, Math.cos(t.z * 2.3) * 0.12);
    m4.compose(pP.set(t.x, height(t.x, t.z) - 0.1, t.z), pQ.setFromEuler(pE), pS.setScalar(t.s * 1.05));
    palmTrunks.setMatrixAt(i, m4); palmLeaves.setMatrixAt(i, m4);
  });
  scene.add(palmTrunks, palmLeaves);
  for (const t of markTrees) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.18, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#2d5f7a', side: THREE.DoubleSide }));
    band.position.set(t.x, height(t.x, t.z) + 1.0, t.z);
    scene.add(band);
  }

  function parcelMarker(p, color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color });
    const h = p.half;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), mat);
      post.position.set(p.x + sx * h, p.base + 0.55, p.z + sz * h);
      g.add(post);
    }
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sz]) => new THREE.Vector3(p.x + sx * h, p.base + 0.9, p.z + sz * h));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color })));
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.1), new THREE.MeshLambertMaterial({ color: '#e8d7a8' }));
    sign.position.set(p.x - h - 1.2, p.base + 1.4, p.z - h);
    const stick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), mat);
    stick.position.set(p.x - h - 1.2, p.base + 0.7, p.z - h);
    g.add(sign, stick);
    p.post = { x: p.x - h - 1.2, z: p.z - h };
    colliders.push({ x: p.post.x, z: p.post.z, r: 0.35, kind: 'post' });
    scene.add(g);
  }
  parcelMarker(PLACES.A, '#f2a03d');
  parcelMarker(PLACES.B, '#d6403a');

  // Océano alrededor y las otras islas, separadas por una niebla luminosa (guion, página 12)
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: '#3a87a8' }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -2.6; scene.add(ocean);
  const ISLANDS = [{ x: -95, z: 70, r: 14 }, { x: -40, z: 105, r: 10 }, { x: -110, z: 10, r: 9 }];
  const islandCones = ISLANDS.map(I => {
    const isl = new THREE.Mesh(new THREE.ConeGeometry(I.r, I.r * 0.7, 9), new THREE.MeshLambertMaterial({ color: '#4f8a52' }));
    isl.position.set(I.x, -2.6 + I.r * 0.3, I.z); scene.add(isl);
    return isl;
  });
  // Las otras islas usan el relieve del mapa 3D original (río serpenteante y mesetas); los conos quedan si no carga
  function loadIslandGeometry() {
    return new Promise((resolve, reject) => {
      if (!THREE.GLTFLoader) { reject(new Error('GLTFLoader no disponible')); return; }
      const done = g => {
        let mesh = null; g.scene.updateMatrixWorld(true);
        g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
        mesh ? resolve(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)) : reject(new Error('sin malla'));
      };
      const fromB64 = () => {
        const parse = () => {
          const bin = atob(window.AV_ISLA_B64), buf = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          new THREE.GLTFLoader().parse(buf.buffer, 'assets/models/', done, reject);
        };
        if (window.AV_ISLA_B64) { parse(); return; }
        const sc = document.createElement('script'); sc.src = 'assets/models/isla_mapa_glb.js';
        sc.onload = parse; sc.onerror = () => reject(new Error('isla no disponible')); document.head.appendChild(sc);
      };
      new THREE.GLTFLoader().load('assets/models/isla_mapa.glb', done, undefined, fromB64);
    });
  }
  loadIslandGeometry().then(geo => {
    geo.computeBoundingBox();
    const bb = geo.boundingBox, c = bb.getCenter(new THREE.Vector3()), w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    geo.translate(-c.x, -bb.min.y, -c.z); geo.scale(1 / w, 1 / w, 1 / w);
    const hMax = (bb.max.y - bb.min.y) / w, p = geo.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) {
      // Costa orgánica: hunde el borde rectangular del mapa bajo el mar
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), d = Math.hypot(x, z) * 2;
      const edge = 0.78 + 0.1 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 7 + 2.1);
      if (d > edge) p.setY(i, p.getY(i) - (d - edge) * 0.6);
      const hn = p.getY(i) / hMax;
      col.push(clamp01((0.06 - hn) / 0.06 + (d > edge ? 1 : 0)), clamp01((hn - 0.35) * 2.5), 0);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mat = groundMaterial(0.6);
    ISLANDS.forEach((I, k) => {
      const m = new THREE.Mesh(geo, mat);
      const s = I.r * 3.6;
      m.scale.set(s, s * 1.8, s); m.rotation.y = k * 2.1 + 0.4;
      m.position.set(I.x, -3.0, I.z);
      scene.add(m); islandCones[k].visible = false;
    });
  }).catch(() => {});
  const mist = new THREE.Mesh(new THREE.RingGeometry(84, 128, 48), new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  mist.rotation.x = -Math.PI / 2; mist.position.y = 1.5; scene.add(mist);
  const MIRADOR = PLACES.mirador;
  const mirador = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.4, 10), new THREE.MeshLambertMaterial({ color: '#a8743f' }));
  deck.position.y = 0.2; mirador.add(deck);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2; const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), new THREE.MeshLambertMaterial({ color: '#7a5634' }));
    post.position.set(Math.cos(a) * 2.1, 0.8, Math.sin(a) * 2.1); mirador.add(post);
  }
  mirador.position.set(MIRADOR.x, height(MIRADOR.x, MIRADOR.z), MIRADOR.z); scene.add(mirador);

  // Taller de Vittata
  const taller = new THREE.Group();
  const tY = PLACES.taller.base;
  const wood = new THREE.MeshLambertMaterial({ color: '#a8743f' });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4), wood);
  walls.position.y = 1.3;
  const roofMat = new THREE.MeshLambertMaterial({ color: '#7c3b2a', side: THREE.DoubleSide });
  const roofL = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3), roofMat);
  const roofR = roofL.clone();
  roofL.position.set(0, 3.3, -1); roofL.rotation.set(-Math.PI / 2 + 0.55, 0, 0);
  const windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), new THREE.MeshBasicMaterial({ color: '#3a2a1a' }));
  windowGlow.position.set(0, 1.5, 2.01);
  const debris = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.35), wood);
    b.position.set(-2 + i * 0.9, 0.08, 2.8 + (i % 2) * 0.6); b.rotation.y = i * 0.7;
    debris.add(b);
  }
  taller.add(walls, roofL, roofR, windowGlow, debris);
  taller.position.set(T.x, tY, T.z);
  scene.add(taller);
  // r es el radio para comprobar construcciones; hx/hz es la caja real de las paredes para chocar
  colliders.push({ x: T.x, z: T.z, r: 2.6, hx: 2.55, hz: 2.05, kind: 'taller' });

  // Objetos del taller: máquina experimental, transmisor y banco de trabajo (mejora)
  const MAQ = { x: T.x - 2.6, z: T.z + 3.4 }, TRX = { x: T.x + 3.4, z: T.z + 2.6 };
  const maquina = new THREE.Group();
  const mBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 10), new THREE.MeshLambertMaterial({ color: '#b9c4c9' }));
  mBody.position.y = 0.45;
  const mProp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.18), new THREE.MeshLambertMaterial({ color: '#f2a03d' }));
  mProp.position.y = 1.0; mProp.rotation.z = 0.35;
  maquina.add(mBody, mProp);
  maquina.position.set(MAQ.x, height(MAQ.x, MAQ.z), MAQ.z);
  scene.add(maquina);
  colliders.push({ x: MAQ.x, z: MAQ.z, r: 0.6, kind: 'obj' });
  const trx = new THREE.Group();
  const trxBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), new THREE.MeshLambertMaterial({ color: '#5a4a3a' }));
  trxBox.position.y = 0.55;
  const trxAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), new THREE.MeshLambertMaterial({ color: '#9aa0a3' }));
  trxAnt.position.set(0.25, 1.8, 0); trxAnt.rotation.z = 0.5;
  const trxLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#4a4a4a' }));
  trxLight.position.set(0, 0.85, 0.36);
  trx.add(trxBox, trxAnt, trxLight);
  trx.position.set(TRX.x, height(TRX.x, TRX.z), TRX.z);
  scene.add(trx);
  colliders.push({ x: TRX.x, z: TRX.z, r: 0.6, kind: 'obj' });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.8), new THREE.MeshLambertMaterial({ color: '#c99a5b' }));
  bench.position.set(T.x - 3.6, tY + 0.45, T.z + 0.2);
  colliders.push({ x: T.x - 3.6, z: T.z + 0.2, r: 1, hx: 0.95, hz: 0.45, kind: 'bench', when: () => bench.visible });
  scene.add(bench);

  function applyTallerLook() {
    const fixed = S.transmitterOn;
    if (fixed) {
      roofR.rotation.set(-Math.PI / 2 - 0.55, 0, 0); roofR.position.set(0, 3.3, 1);
      debris.visible = false; windowGlow.material.color.set('#ffd27a');
      trxAnt.rotation.z = 0; trxLight.material.color.set('#7fd38f');
    } else {
      roofR.rotation.set(-0.3, 0.2, 0.9); roofR.position.set(2.6, 0.6, 1.8);
      debris.visible = true; windowGlow.material.color.set('#3a2a1a');
      trxAnt.rotation.z = 0.5; trxLight.material.color.set('#4a4a4a');
    }
    bench.visible = S.benchUnlocked;
  }

  // Refugio
  function hutMesh(opacity) {
    const g = new THREE.Group();
    const transparent = opacity < 1;
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshLambertMaterial({ color: '#c99a5b', transparent, opacity }));
    body.position.y = 0.8;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), new THREE.MeshLambertMaterial({ color: '#5e8f3a', transparent, opacity }));
    roof.position.y = 2.2; roof.rotation.y = Math.PI / 4;
    g.add(body, roof);
    return g;
  }
  const ghost = hutMesh(0.5); ghost.visible = false; scene.add(ghost);
  let refugeMesh = null;
  function placeRefugeMesh() {
    if (refugeMesh) { scene.remove(refugeMesh); refugeMesh = null; }
    for (let i = colliders.length - 1; i >= 0; i--) if (colliders[i].kind === 'refuge') colliders.splice(i, 1);
    if (!S.refuge) return;
    refugeMesh = hutMesh(1);
    refugeMesh.position.set(S.refuge.x, height(S.refuge.x, S.refuge.z), S.refuge.z);
    if (S.refuge.damaged) {
      refugeMesh.rotation.z = 0.18;
      refugeMesh.children[0].material.color.set('#7a6a52');
      refugeMesh.children[1].material.color.set('#40603a');
    }
    scene.add(refugeMesh);
    colliders.push({ x: S.refuge.x, z: S.refuge.z, r: 1.4, kind: 'refuge' });
  }

  // Recursos
  const resMeshes = {};
  const resMat = { madera: new THREE.MeshLambertMaterial({ color: '#8a5a2b' }), piedra: new THREE.MeshLambertMaterial({ color: '#9aa0a3' }), componente: new THREE.MeshLambertMaterial({ color: '#c9d4d9', emissive: '#1d3a46' }) };
  for (const r of RESOURCES) {
    let m;
    if (r.type === 'madera') { m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 7), resMat.madera); m.rotation.z = Math.PI / 2; m.position.y = 0.3; }
    else if (r.type === 'piedra') { m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), resMat.piedra); m.position.y = 0.35; }
    else { m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 6, 10), resMat.componente); m.position.y = 0.7; }
    const g = new THREE.Group(); g.add(m);
    g.position.set(r.x, height(r.x, r.z), r.z);
    scene.add(g); resMeshes[r.id] = g;
  }

  // Sprites (renders oficiales como sustitutos)
  const loader = new THREE.TextureLoader();
  function spriteFrom(url, scale) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: loader.load(url), transparent: true, alphaTest: 0.05 }));
    sp.scale.set(scale, scale, 1);
    return sp;
  }
  function blob(radius) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  const player = spriteFrom(IMG.V, 2.4); scene.add(player);
  const pShadow = blob(0.6); scene.add(pShadow);
  function npcAt(img, p, scale) {
    const sp = spriteFrom(img, scale); sp.position.set(p.x, height(p.x, p.z) + 1.0, p.z); scene.add(sp);
    const sh = blob(0.55); sh.position.set(p.x, height(p.x, p.z) + 0.03, p.z); scene.add(sh);
    colliders.push({ x: p.x, z: p.z, r: 0.6, kind: 'npc' });
    return { sp, sh };
  }
  const LUMA = { x: 4, z: -1 };
  const luma = npcAt(IMG.L, LUMA, 2.0);
  const GUARD = { x: 0, z: -11 };
  const guardian = npcAt(IMG.G, GUARD, 2.6);
  // Personaje del jugador: aprendiz que acompaña a Vittata (Vittata sigue siendo la protagonista)
  const portraitCanvas = document.createElement('canvas'); portraitCanvas.width = portraitCanvas.height = 256;
  const companionTex = new THREE.CanvasTexture(portraitCanvas);
  const companion = new THREE.Sprite(new THREE.SpriteMaterial({ map: companionTex, transparent: true, alphaTest: 0.05 }));
  companion.scale.set(1.7, 1.7, 1); companion.visible = false; scene.add(companion);
  const cShadow = blob(0.45); cShadow.visible = false; scene.add(cShadow);
  const companionPos = { x: 0, z: 0 };
  // Personajes 3D con esqueleto (si el modelo carga); si no, se usan los sprites
  let player3D = null, companion3D = null, failed3D = false;
  const anim3D = { player: '', companion: '' };
  async function init3D() {
    if (!window.AVCharacter) { failed3D = true; return; }
    try {
      const [a, b] = await Promise.all([window.AVCharacter.create(), window.AVCharacter.create()]);
      a.applyLook({ species: 'vittata', accessories: {} });
      a.root.scale.setScalar(1.75 / a.height); b.root.scale.setScalar(1.4 / b.height);
      b.root.visible = false;
      scene.add(a.root, b.root);
      player3D = a; companion3D = b;
      player.visible = false; companion.visible = false;
      refreshCompanion();
    } catch (e) { failed3D = true; }
  }
  // Gestos (teclas 1–7 o botón Gestos): clips del modelo o poses procedurales de character.js
  const EMOTES = {
    saludar: { label: 'Saludar', clip: 'Welcome', face: 'happy', secs: 2 },
    celebrar: { label: 'Celebrar', clip: 'Celebrate', face: 'happy', secs: 1.6 },
    bailar: { label: 'Bailar', pose: 'dance', face: 'happy', secs: 8 },
    idea: { label: 'Idea', pose: 'idea', face: 'idea', secs: 2.2 },
    enojo: { label: 'Enojarse', pose: 'angry', face: 'angry', secs: 2.6 },
    pelea: { label: 'Pelear', pose: 'fight', face: 'fight', secs: 6 },
    molestia: { label: 'Molestia', pose: 'annoyed', face: 'annoyed', secs: 4 },
  };
  const EMOTE_KEYS = Object.keys(EMOTES);
  const emote = { name: '', until: 0 };
  function playEmote(name) {
    if (!EMOTES[name] || dialogOpen() || cardOpen || overlayOpen() || MOVE.flying) return;
    if (S.pos.y > surfaceY(S.pos.x, S.pos.z) + 0.01) return;
    emote.name = name; emote.until = performance.now() + EMOTES[name].secs * 1000;
    if (player3D && EMOTES[name].clip) { player3D.play(EMOTES[name].clip, true); anim3D.player = 'emote'; }
  }
  function stopEmote() { emote.name = ''; anim3D.player = ''; }
  // Foco de "idea" sobre la cabeza
  const ideaBulb = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 54, 6, 64, 54, 60); grd.addColorStop(0, 'rgba(255,240,150,1)'); grd.addColorStop(1, 'rgba(255,220,80,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffe36b'; g.beginPath(); g.arc(64, 52, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9aa0a3'; g.fillRect(52, 76, 24, 16); g.fillStyle = '#6b7073'; g.fillRect(52, 82, 24, 3); g.fillRect(52, 88, 24, 3);
    g.strokeStyle = '#fff6c8'; g.lineWidth = 4; g.beginPath(); g.arc(56, 46, 10, Math.PI, Math.PI * 1.5); g.stroke();
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    s.scale.set(0.9, 0.9, 1); s.visible = false; scene.add(s); return s;
  })();
  // Efectos de agua: anillos que se expanden (salpicadura y ondas) y gotas con gravedad
  const fx = [];
  function ringFx(x, y, z, size, life, op) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.5, 32), new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.03, z); scene.add(m);
    fx.push({ m, t: 0, life, size, op });
  }
  function ripple(x, y, z) { ringFx(x, y, z, 1.2, 0.9, 0.4); }
  function splash(x, y, z, s) {
    ringFx(x, y, z, 2.2 * s, 0.75, 0.75); ringFx(x, y, z, 1.2 * s, 0.5, 0.55);
    const n = 18, pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos.set([x, y + 0.1, z], i * 3);
      const a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 2) * s;
      vel.push([Math.cos(a) * sp, (3 + Math.random() * 3) * s, Math.sin(a) * sp]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: '#dff3ff', size: 0.16, transparent: true, opacity: 0.9, depthWrite: false }));
    scene.add(p); fx.push({ m: p, t: 0, life: 0.9, vel, y0: y, op: 0.9 });
  }
  function camDist() { return MOVE.flying ? 9.5 : 7.5; }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; const k = f.t / f.life;
      if (f.vel) {
        const a = f.m.geometry.attributes.position;
        f.vel.forEach((v, j) => { v[1] -= 14 * dt; a.setXYZ(j, a.getX(j) + v[0] * dt, Math.max(f.y0, a.getY(j) + v[1] * dt), a.getZ(j) + v[2] * dt); });
        a.needsUpdate = true;
      } else f.m.scale.setScalar(0.4 + k * f.size * 2);
      f.m.material.opacity = (1 - k) * f.op;
      if (k >= 1) { scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); fx.splice(i, 1); }
    }
  }
  function sync3D(dt, moving, snap) {
    if (player3D) {
      player3D.root.position.set(S.pos.x, S.pos.y, S.pos.z);
      // Giro suave hacia donde mira (camino más corto)
      const want3 = Math.atan2(S.facing.x, S.facing.z), r = player3D.root.rotation;
      const dA = Math.atan2(Math.sin(want3 - r.y), Math.cos(want3 - r.y));
      r.y = snap ? want3 : r.y + dA * Math.min(1, dt * 14);
      // Inclinación al correr / impulsarse y aplastón al aterrizar
      const sp = MOVE.speed || 0, base = player3D.root.userData.s || (player3D.root.userData.s = player3D.root.scale.x);
      // Volando: el cuerpo se tumba hacia adelante según la velocidad, y se endereza al subir
      const flyLean = MOVE.flying ? 0.2 + Math.min(1, sp / FLY_SPEED) * 0.55 - Math.max(0, S.vy) * 0.05 : 0;
      r.x += ((MOVE.flying ? flyLean : MOVE.swimming ? 0.35 + Math.min(1, sp / SWIM_SPEED) * 0.35 : Math.min(0.35, sp / RUN_SPEED * 0.12 + (MOVE.dashT > 0 ? 0.25 : 0))) - r.x) * Math.min(1, dt * 8);
      const sq = MOVE.land > 0 ? Math.sin(MOVE.land / 0.2 * Math.PI) * 0.18 : 0;
      player3D.root.scale.set(base * (1 + sq * 0.5), base * (1 - sq), base * (1 + sq * 0.5));
      const air = S.pos.y > surfaceY(S.pos.x, S.pos.z) + 0.01 && !MOVE.swimming;
      const want = moving && !air && !MOVE.swimming ? 'Walk' : 'Idle';
      const clipEmote = emote.name && EMOTES[emote.name].clip && !moving && !air;
      if (!clipEmote && anim3D.player !== want && player3D.play(want)) anim3D.player = want;
      if (player3D.current && !clipEmote) player3D.current.timeScale = want === 'Walk' ? Math.max(0.8, sp / SPEED) : 1;
      player3D.gait = MOVE.swimming ? (moving ? 2 : 1) : air || !moving ? 0 : sp > (SPEED + RUN_SPEED) / 2 ? 2 : 1; // nadando patalea siempre
      player3D.airborne = air;
      player3D.swimming = MOVE.swimming;
      // Habla y expresión en diálogos; si escucha a otro, atiende con curiosidad
      const inDialog = dialogOpen(), mine = inDialog && talk.who === 'Vittata';
      player3D.talking = mine && performance.now() < talk.until;
      // Un gesto se cancela al moverse, saltar, volar o abrir un diálogo
      if (emote.name && (moving || air || inDialog)) stopEmote();
      if (emote.name && performance.now() > emote.until) stopEmote();
      player3D.emote = emote.name && EMOTES[emote.name].pose || null;
      player3D.expression = emote.name ? EMOTES[emote.name].face
        : !inDialog ? (MOVE.land > 0 ? 'surprised' : MOVE.flying || MOVE.swimming ? 'happy' : 'neutral') : mine ? talk.mood : talk.mood === 'sad' ? 'sad' : 'curious';
      player3D.wingMode = MOVE.swimming ? 'swim' : MOVE.flying ? (jumpHeld ? 'flap' : 'fly') : MOVE.dashT > 0 ? 'glide' : !air ? (moving ? 'walk' : 'idle') : S.vy > 0 ? 'flap' : jumpHeld ? 'glide' : 'flap';
      ideaBulb.visible = emote.name === 'idea';
      if (ideaBulb.visible) ideaBulb.position.set(S.pos.x, S.pos.y + 2.55 + Math.sin(performance.now() / 180) * 0.06, S.pos.z);
      player3D.update(dt);
    }
    if (companion3D && companion3D.root.visible) {
      const tx = S.pos.x - S.facing.x * 1.8 + S.facing.z * 1.1, tz = S.pos.z - S.facing.z * 1.8 - S.facing.x * 1.1;
      const k = snap ? 1 : Math.min(1, dt * 3);
      const dx = (tx - companionPos.x) * k, dz = (tz - companionPos.z) * k;
      companionPos.x += dx; companionPos.z += dz;
      for (const c of colliders) pushOut(companionPos, c, 0.4);
      companion3D.root.position.set(companionPos.x, Math.max(surfaceY(companionPos.x, companionPos.z), waterLevelAt(companionPos.x) - SWIM_DEPTH), companionPos.z);
      const sp = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
      if (sp > 0.6) companion3D.root.rotation.y = Math.atan2(dx, dz);
      const want = sp > 0.6 && !snap ? 'Walk' : 'Idle';
      if (anim3D.companion !== want && companion3D.play(want)) anim3D.companion = want;
      companion3D.wingMode = want === 'Walk' ? 'walk' : 'idle';
      companion3D.gait = want === 'Walk' ? (sp > (SPEED + RUN_SPEED) / 2 ? 2 : 1) : 0;
      companion3D.update(dt);
      cShadow.position.set(companionPos.x, height(companionPos.x, companionPos.z) + 0.03, companionPos.z);
    }
  }
  // withBg = retrato de busto (creador, cómic, perfil); sin fondo = cuerpo entero para el sprite del mundo.
  // Los adornos se dibujan en coordenadas del render de 256 px y se transforman con el encuadre.
  async function drawPortrait(ctx, size, p, withBg) {
    p = legacyFields(p);
    const img = await loadImg(p.preset === 'vittata' ? IMG.V : 'assets/presets/' + p.preset + '.png');
    const outfit = (OUTFITS.find(o => o.id === p.outfit) || OUTFITS[0]).color;
    ctx.save();
    ctx.clearRect(0, 0, size, size);
    if (withBg) {
      const g = ctx.createRadialGradient(size * 0.5, size * 0.38, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
      g.addColorStop(0, '#2d5a43'); g.addColorStop(1, '#10241c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 0.35; ctx.fillStyle = outfit;
      ctx.beginPath(); ctx.arc(size * 0.5, size * 1.05, size * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      const k = size / 164; ctx.scale(k, k); ctx.translate(-46, 2);
    } else ctx.scale(size / 256, size / 256);
    if (img) ctx.drawImage(img, 0, 0, 256, 256);
    // Pañuelo al cuello
    ctx.fillStyle = outfit; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(98, 120); ctx.quadraticCurveTo(128, 140, 160, 118); ctx.lineTo(164, 132);
    ctx.quadraticCurveTo(128, 156, 94, 134); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(122, 142); ctx.lineTo(112, 166); ctx.lineTo(134, 158); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#3a2a1a';
    if (p.accessory === 'gafas') {
      ctx.fillStyle = 'rgba(170,225,255,.4)';
      for (const cx of [108, 146]) { ctx.beginPath(); ctx.arc(cx, 52, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(121, 52); ctx.lineTo(133, 52); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (const cx of [103, 141]) { ctx.beginPath(); ctx.arc(cx, 47, 3, 0, Math.PI * 2); ctx.fill(); }
    } else if (p.accessory === 'gorra') {
      ctx.fillStyle = outfit;
      ctx.beginPath(); ctx.arc(127, 34, 30, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(150, 35, 22, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (p.accessory === 'medalla') {
      ctx.fillStyle = '#ffd27a';
      ctx.beginPath(); ctx.arc(124, 150, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  async function refreshCompanion() {
    if (!S.profile.created) { companion.visible = cShadow.visible = false; if (companion3D) companion3D.root.visible = false; return; }
    if (companion3D) {
      companion3D.applyLook(profileLook(S.profile));
      companion3D.root.visible = true; cShadow.visible = true; companion.visible = false;
      companionPos.x = S.pos.x - 1.5; companionPos.z = S.pos.z + 1;
      return;
    }
    await drawPortrait(portraitCanvas.getContext('2d'), 256, S.profile, false);
    companionTex.needsUpdate = true;
    companion.visible = cShadow.visible = true;
    companionPos.x = S.pos.x - 1.5; companionPos.z = S.pos.z + 1;
  }

  function applyGuardianLook() {
    const show = S.builds.length > 0 && !S.event;
    guardian.sp.visible = guardian.sh.visible = show;
    const c = colliders.find(q => q.x === GUARD.x && q.z === GUARD.z);
    if (c) c.r = show ? 0.6 : 0;
  }

  const rainGeo = new THREE.BufferGeometry();
  const RAIN_N = 900, rainPos = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 60; rainPos[i * 3 + 1] = Math.random() * 25; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#cfe6f0', size: 0.15, transparent: true, opacity: 0.7 }));
  rain.visible = false; scene.add(rain);

  // ---------- Interactuables ----------
  const interactables = [
    { id: 'maquina', x: MAQ.x, z: MAQ.z, r: 2.2, label: () => 'Examinar la máquina experimental', use: () => examine('maquina') },
    { id: 'transmisor', x: TRX.x, z: TRX.z, r: 2.2, label: () => S.step === 6 ? 'Reparar y activar el transmisor' : 'Examinar el transmisor', use: useTransmitter },
    { id: 'luma', x: LUMA.x, z: LUMA.z, r: 2.4, label: () => 'Hablar con Luma', use: talkLuma },
    { id: 'mirador', x: MIRADOR.x, z: MIRADOR.z, r: 3.2, label: () => S.step === 7 ? 'Mirar el horizonte desde el mirador' : 'Asomarte al mirador', use: useMirador },
    { id: 'guardian', x: GUARD.x, z: GUARD.z, r: 2.6, visible: () => guardian.sp.visible, label: () => 'Hablar con el Guardián', use: talkGuardian },
    { id: 'refuge', x: 0, z: 0, r: 2.6, visible: () => !!(S.refuge && S.refuge.damaged && !S.event && !S.complete), label: () => 'Desarmar el refugio y recuperar materiales', use: dismantle },
  ];
  for (const r of RESOURCES) interactables.push({ id: r.id, x: r.x, z: r.z, r: 1.8, visible: () => !S.collected.includes(r.id), label: () => 'Recoger ' + LABEL[r.type], use: () => collect(r) });
  for (const k of ['A', 'B']) {
    const p = PLACES[k];
    interactables.push({ id: 'post' + k, x: p.post.x, z: p.post.z, r: 2.2, label: () => 'Inspeccionar terreno: ' + p.name, use: () => openParcelCard(k) });
  }
  function syncRefugeInteractable() { const it = interactables.find(i => i.id === 'refuge'); if (S.refuge) { it.x = S.refuge.x; it.z = S.refuge.z; } }

  function nearest() {
    let best = null, bd = Infinity;
    for (const it of interactables) {
      if (it.visible && !it.visible()) continue;
      const d = Math.hypot(S.pos.x - it.x, S.pos.z - it.z);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    return best;
  }

  // ---------- Acciones de la historia ----------
  function has(cost) { return Object.keys(cost).every(k => S.inv[k] >= cost[k]); }
  function pay(cost) { for (const k in cost) S.inv[k] -= cost[k]; }
  function missingText(cost) { return Object.keys(cost).filter(k => S.inv[k] < cost[k]).map(k => (cost[k] - S.inv[k]) + ' ' + LABEL[k]).join(', '); }

  function examine(what) {
    const firstTime = !S.examined[what];
    S.examined[what] = true;
    const lines = what === 'maquina'
      ? [{ who: 'Vittata', img: IMG.V, text: 'Mi máquina… Si consigo repararla, todavía podemos…' }]
      : [{ who: 'Vittata', img: IMG.V, text: 'Este transmisor llevaba años sin funcionar. Ahora además tiene la antena doblada.' }];
    say(lines, () => {
      if (firstTime && S.step === 0 && S.examined.maquina && S.examined.transmisor) {
        logEvent('WorkshopExplored'); capture('workshop');
        say([{ who: 'Luma', img: IMG.L, text: '¡Vittata! ¡Necesitamos ayuda!' }], () => advanceTo(1));
      } else checkProgress();
    });
  }

  function talkLuma() {
    if (S.step === 0) { say([{ who: 'Luma', img: IMG.L, text: '¿Estás bien? Revisa tu taller y después ven, por favor.' }]); return; }
    if (S.step === 1) {
      say([
        { who: 'Luma', img: IMG.L, text: 'Mi familia no tiene dónde quedarse. Nuestro árbol se partió.' },
        { who: 'Vittata', img: IMG.V, text: 'Entonces tendremos que construir algo nuevo.' },
        { who: 'Luma', img: IMG.L, text: 'No tenemos suficientes materiales.' },
        { who: 'Vittata', img: IMG.V, text: 'Tenemos más de lo que parece. Busquemos madera, piedras y piezas de metal.' },
      ], () => { logEvent('LumaHelped'); advanceTo(2); });
      return;
    }
    if (S.step <= 3) { say([{ who: 'Luma', img: IMG.L, text: 'Hay dos terrenos: junto al río (estacas naranja) y en la colina (estacas rojas). Mira bien los dos.' }]); return; }
    if (S.refuge && S.refuge.damaged) { say([{ who: 'Luma', img: IMG.L, text: 'El agua llegó otra vez… Si desarmas el refugio recuperas los materiales y podemos llevarlo a la colina.' }]); return; }
    say([{ who: 'Luma', img: IMG.L, text: S.complete ? 'Pensé que hoy lo habíamos perdido todo.' : '¡Gracias, Vittata! Mi familia ya tiene un techo.' }]);
  }

  function collect(r) {
    S.collected.push(r.id);
    S.inv[r.type]++;
    resMeshes[r.id].visible = false;
    toast('+1 ' + LABEL[r.type]);
    checkProgress();
  }

  function openParcelCard(k) {
    const p = PLACES[k];
    const first = !S.evaluated[k];
    S.evaluated[k] = true;
    if (first) logEvent('LandInspected', { parcel: k });
    const canBuild = S.step >= 4 && !S.refuge && !S.event && !S.complete;
    const rows = Object.entries(p.info).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    const buildBtn = canBuild ? `<button class="btn" id="c-build" type="button">Construir refugio aquí (${REFUGE_COST.madera} madera, ${REFUGE_COST.piedra} piedras)</button>` : '';
    const note = S.step < 4 ? '<p class="note">Inspecciona los dos terrenos y junta los materiales para poder construir.</p>' : '';
    showCard(`<h2>${p.name}</h2><dl>${rows}</dl>${note}<div class="row">${buildBtn}<button class="btn ghost" id="c-close" type="button">Cerrar</button></div>`);
    const b = document.getElementById('c-build');
    if (b) b.onclick = () => { if (!has(REFUGE_COST)) { toast('Te falta ' + missingText(REFUGE_COST)); return; } hideCard(); startBuild(k); };
    document.getElementById('c-close').onclick = () => {
      hideCard();
      if (first) {
        const line = k === 'A'
          ? [{ who: 'Vittata', img: IMG.V, text: 'Aquí construiríamos mucho más rápido.' }, { who: 'Luma', img: IMG.L, text: 'Pero mira esas marcas en los árboles: el río llegó hasta aquí durante la tormenta.' }]
          : [{ who: 'Luma', img: IMG.L, text: 'Allá arriba parece más seguro.' }];
        say(line, checkProgress);
      } else checkProgress();
    };
  }

  function startBuild(k) {
    build = { parcel: k, gx: 0, gz: 0, valid: false, reason: '' };
    ghost.visible = true;
    toastHTML('Modo construcción: muévete y pulsa <b>Acción</b> para colocar. <button class="btn ghost" id="t-cancel" type="button">Cancelar</button>', 0);
    const c = document.getElementById('t-cancel');
    if (c) c.onclick = cancelBuild;
  }
  function cancelBuild() { build = null; ghost.visible = false; hideToast(); }
  function updateGhost() {
    if (!build) return;
    const p = PLACES[build.parcel];
    const gx = S.pos.x + S.facing.x * 2.6, gz = S.pos.z + S.facing.z * 2.6;
    build.gx = gx; build.gz = gz;
    let reason = '';
    if (Math.abs(gx - p.x) > p.half - 1.1 || Math.abs(gz - p.z) > p.half - 1.1) reason = 'Fuera del terreno elegido';
    else if (colliders.some(c => c.kind !== 'refuge' && c.r > 0 && Math.hypot(gx - c.x, gz - c.z) < c.r + 1.3)) reason = 'Choca con algo';
    build.valid = !reason; build.reason = reason;
    ghost.position.set(gx, height(gx, gz), gz);
    ghost.children.forEach(m => m.material.color.set(build.valid ? '#7fd38f' : '#d6403a'));
  }
  function placeRefuge() {
    if (!build || !build.valid) { toast(build ? build.reason : 'No hay nada que colocar'); return false; }
    if (!has(REFUGE_COST)) { toast('Te falta ' + missingText(REFUGE_COST)); return false; }
    pay(REFUGE_COST);
    S.refuge = { parcel: build.parcel, x: build.gx, z: build.gz, damaged: false };
    S.builds.push(build.parcel);
    logEvent('LandSelected', { parcel: build.parcel, attempt: S.builds.length });
    logEvent('ShelterConstructed', { parcel: build.parcel, attempt: S.builds.length });
    build = null; ghost.visible = false; hideToast();
    placeRefugeMesh(); syncRefugeInteractable();
    say([{ who: 'Luma', img: IMG.L, text: '¡Lo logramos! …¿Oyes eso? Viene más lluvia.' }]);
    S.event = { t: 0, dur: 8 };
    applyGuardianLook();
    return true;
  }
  function finishRainEvent() {
    if (S.refuge.parcel === 'A') {
      S.refuge.damaged = true;
      S.indicators = { seguridad: 'baja', acceso: 'corto', habitat: 'nidos de ribera alterados' };
      logEvent('ShelterFlooded', { parcel: 'A' });
      placeRefugeMesh();
      capture('shelter');
      say([
        { who: 'Luma', img: IMG.L, text: 'El río subió y el refugio se inundó…' },
        { who: 'Vittata', img: IMG.V, text: 'Quise construir rápido y no escuché lo de las marcas de agua. Si lo desarmo, recupero los materiales.' },
      ], afterRain);
    } else {
      S.indicators = { seguridad: 'alta', acceso: 'largo, cuesta arriba', habitat: 'nidos de ribera intactos' };
      if (S.builds.includes('A')) logEvent('ShelterRelocated', { from: 'A', to: 'B' });
      capture('shelter');
      say([
        { who: 'Luma', img: IMG.L, text: 'La colina aguantó la crecida. Mi familia está a salvo.' },
        { who: 'Vittata', img: IMG.V, text: 'Construir rápido no sirve de mucho si después tenemos que empezar otra vez.' },
      ], afterRain);
    }
  }
  function afterRain() {
    applyGuardianLook();
    if (S.step === 4) { advanceTo(5); toast('Alguien te observa desde el sendero del sur', 3500); }
    else checkProgress();
  }
  function dismantle() {
    S.inv.madera += REFUGE_COST.madera; S.inv.piedra += REFUGE_COST.piedra;
    logEvent('ShelterDismantled', { parcel: S.refuge.parcel });
    S.refuge = null; placeRefugeMesh();
    S.indicators = { seguridad: '—', acceso: '—', habitat: '—' };
    toast('Recuperaste 3 madera y 2 piedras. Ve al letrero de la colina para construir de nuevo.', 3500);
    checkProgress();
  }

  function talkGuardian() {
    if (S.step === 5) {
      const present = S.refuge && !S.refuge.damaged
        ? { who: 'Guardián', img: IMG.G, text: 'Buen lugar. Un hogar no es solamente lo que construimos. También es lo que cuidamos.' }
        : { who: 'Guardián', img: IMG.G, text: 'Lo levantaste rápido, pero quedó en el agua. Todavía puedes moverlo: un error a tiempo también enseña.' };
      say([
        { who: 'Guardián', img: IMG.G, text: 'Veo que todavía quedan constructores por aquí.' },
        { who: 'Vittata', img: IMG.V, text: '¿Y usted quién es?' },
        { who: 'Guardián', img: IMG.G, text: 'Alguien que construyó muchas cosas… y perdió algunas de las más importantes.' },
        { who: 'Vittata', img: IMG.V, text: 'Entonces quizás pueda ayudarnos. Este es nuestro refugio.' },
        present,
        { who: 'Guardián', img: IMG.G, text: 'Te dejo mi viejo banco de trabajo en tu taller. Con él podrás reparar ese transmisor.' },
      ], () => {
        S.guardianMet = true; S.benchUnlocked = true;
        logEvent('GuardianMet', { refugeSafe: !!(S.refuge && !S.refuge.damaged) });
        logEvent('WorkshopUpgradeUnlocked', { upgrade: 'banco de trabajo' });
        applyTallerLook();
        toast('Mejora del taller desbloqueada: banco de trabajo', 3000);
        advanceTo(6);
      });
      return;
    }
    say([{ who: 'Guardián', img: IMG.G, text: S.step > 5 ? 'El transmisor está en tu taller. Veamos si todavía habla.' : '¿Segura de que funcionará? Bien. Entonces vamos a comprobarlo.' }]);
  }

  function useTransmitter() {
    if (S.step !== 6) { examine('transmisor'); return; }
    if (!has(REPAIR_COST)) { toast('Para repararlo te falta ' + missingText(REPAIR_COST)); return; }
    pay(REPAIR_COST);
    S.transmitterOn = true;
    applyTallerLook();
    logEvent('TransmitterActivated');
    showSymbol(true);
    say([
      { who: 'Vittata', img: IMG.V, text: '¡Ese transmisor llevaba años sin funcionar!' },
      { who: 'Voz', img: IMG.G, text: 'Si alguien puede escucharme… …el pacto…' },
      { who: 'Vittata', img: IMG.V, text: '¿Qué pacto? Mira: un símbolo dividido en 36 fragmentos.' },
      { who: 'Guardián', img: IMG.G, text: 'No veía ese símbolo desde hace mucho tiempo. Significa que esta historia es mucho más grande de lo que imaginamos.' },
      { who: 'Vittata', img: IMG.V, text: 'Si los caminos desaparecieron, construiremos otros.' },
    ], () => {
      showSymbol(false);
      advanceTo(7);
      toast('Sube al mirador de la colina, al norte del refugio de la loma', 4000);
    });
  }

  function useMirador() {
    if (S.step !== 7) { say([{ who: 'Vittata', img: IMG.V, text: 'Desde aquí se ve todo el daño de la Ruptura… y a lo lejos, otras islas.' }]); return; }
    camYaw = Math.atan2(MIRADOR.x - ISLANDS[0].x, MIRADOR.z - ISLANDS[0].z);
    say([
      { who: 'Vittata', img: IMG.V, text: 'Allá están las otras islas, separadas por esa niebla luminosa.' },
      { who: 'Luma', img: IMG.L, text: '¿Y cómo vamos a llegar si los caminos desaparecieron?' },
      { who: 'Vittata', img: IMG.V, text: 'Si los caminos desaparecieron, construiremos otros. Empezando por una embarcación.' },
      { who: 'Narrador', img: IMG.V, text: 'Y así comenzó la aventura que volvería a conectar los mundos. Continuará…' },
    ], () => {
      S.boatPlan = true;
      logEvent('BoatBlueprintUnlocked');
      logEvent('LocationDiscoveredMirador');
      capture('final');
      S.complete = true;
      logEvent('ChapterCompleted', { refugeParcel: S.refuge ? S.refuge.parcel : null });
      advanceTo(DONE);
      showEnd();
    });
  }

  function checkProgress() {
    let changed = true;
    while (changed) {
      changed = false;
      if (S.step === 2 && has(NEEDS)) { S.step = 3; logEvent('ResourcesCollected', { ...S.inv }); changed = true; }
      else if (S.step === 3 && S.evaluated.A && S.evaluated.B) { S.step = 4; changed = true; }
    }
    renderQuest(); renderInv(); autosave();
  }
  function advanceTo(n) { if (n > S.step) S.step = n; checkProgress(); }

  // ---------- Interfaz ----------
  const $ = id => document.getElementById(id);
  function say(lines, done) { dialogQueue = lines.slice(); dialogDone = done || null; showNextLine(); }
  function showNextLine() {
    const l = dialogQueue.shift();
    if (!l) { $('dialog').hidden = true; const d = dialogDone; dialogDone = null; if (d) d(); return; }
    $('d-who').textContent = l.who; $('d-text').textContent = l.text; $('d-img').src = l.img; $('d-img').alt = l.who;
    $('dialog').hidden = false;
    // Vittata en 3D: mueve el pico mientras "dice" la línea y pone cara según el tono
    talk.who = l.who; talk.until = performance.now() + Math.min(5000, 600 + l.text.length * 55);
    talk.mood = l.mood || moodOf(l.text);
  }
  const talk = { who: '', until: 0, mood: 'neutral' };
  function moodOf(text) {
    if (/…\s*$|perdido|inund|no tenemos/i.test(text)) return 'sad';
    if (/^¡|!\s*$|gracias|logramos/i.test(text)) return 'happy';
    if (/\?\s*$/.test(text)) return 'curious';
    return 'neutral';
  }
  $('d-next').onclick = showNextLine;
  function dialogOpen() { return !$('dialog').hidden; }
  function showCard(html) { $('card').innerHTML = html; $('card').hidden = false; cardOpen = true; }
  function hideCard() { $('card').hidden = true; cardOpen = false; }
  let toastTimer = 0;
  function toast(text, ms) { $('toast').textContent = text; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function toastHTML(html, ms) { $('toast').innerHTML = html; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function hideToast() { $('toast').hidden = true; toastTimer = 0; }
  function overlayOpen() { return !$('end').hidden || !$('comic').hidden || !$('creator').hidden; }

  function renderQuest() {
    const got = type => Math.min(NEEDS[type], S.collected.filter(id => RESOURCES.find(r => r.id === id).type === type).length);
    $('steps').innerHTML = STEPS.map((s, i) => {
      let label = s;
      if (i === 0) label += ` (${(S.examined.maquina ? 1 : 0) + (S.examined.transmisor ? 1 : 0)}/2)`;
      if (i === 2) label += ` (${got('madera')}/4 · ${got('piedra')}/2 · ${got('componente')}/1)`;
      if (i === 3) label += ` (${(S.evaluated.A ? 1 : 0) + (S.evaluated.B ? 1 : 0)}/2)`;
      const cls = i < S.step ? 'done' : i === S.step ? 'now' : 'later';
      return `<li class="${cls}">${label}</li>`;
    }).join('');
    const I = S.indicators;
    $('indicators').innerHTML = S.refuge ? `Seguridad del refugio: <b>${I.seguridad}</b> · Acceso: <b>${I.acceso}</b> · Hábitat: <b>${I.habitat}</b>` : '';
  }
  function renderInv() { $('i-madera').textContent = S.inv.madera; $('i-piedra').textContent = S.inv.piedra; $('i-componente').textContent = S.inv.componente; }

  // Símbolo de los 36 fragmentos
  const FRAG_COLORS = ['#2f8f4e', '#d6403a', '#f2a03d', '#3d8fb0', '#7fd38f', '#c9a227'];
  function drawSymbol(ctx, cx, cy, r) {
    ctx.save();
    for (let i = 0; i < 36; i++) {
      const a0 = (i / 36) * Math.PI * 2 - Math.PI / 2 + 0.012, a1 = ((i + 1) / 36) * Math.PI * 2 - Math.PI / 2 - 0.012;
      const ri = r * (i % 2 ? 0.55 : 0.62);
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.arc(cx, cy, ri, a1, a0, true); ctx.closePath();
      ctx.fillStyle = FRAG_COLORS[i % FRAG_COLORS.length]; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fillStyle = '#10241c'; ctx.fill();
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = Math.max(2, r * 0.04); ctx.stroke();
    ctx.fillStyle = '#ffd27a'; ctx.font = `700 ${Math.round(r * 0.32)}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('36', cx, cy + r * 0.02);
    ctx.restore();
  }
  function showSymbol(on) {
    $('symbol').hidden = !on;
    if (on) { const c = $('symbol-canvas'), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); drawSymbol(x, c.width / 2, c.height / 2, c.width * 0.45); }
  }

  // ---------- Capturas y cómic personal ----------
  function capture(key) {
    try {
      placeCamera(true);
      renderer.render(scene, camera);
      const c = document.createElement('canvas'); c.width = 480; c.height = 360;
      const x = c.getContext('2d');
      const sw = canvas.width, sh = canvas.height, ar = 480 / 360;
      let w = sw, h = sw / ar; if (h > sh) { h = sh; w = sh * ar; }
      x.drawImage(canvas, (sw - w) / 2, (sh - h) / 2, w, h, 0, 0, 480, 360);
      S.captures[key] = c.toDataURL('image/jpeg', 0.72);
    } catch (e) { S.captures[key] = null; }
  }

  // Selección narrativa: cada viñeta sale de eventos reales; si un evento no ocurrió, la viñeta no existe
  function comicPanels() {
    const p = S.profile;
    const builds = S.builds;
    let decision = null;
    if (hadEvent('ShelterConstructed')) {
      if (builds[0] === 'B') decision = 'Elegí construir en la colina porque descubrí que el río podía inundar el otro terreno.';
      else if (builds.includes('A') && S.refuge && S.refuge.parcel === 'B') decision = 'Mi primera idea no era segura. Aprendí a observar mejor el terreno y encontré una solución.';
      else decision = 'Construimos junto al río y la crecida dañó el refugio. Aprendí que construir rápido no siempre es construir bien.';
    }
    const all = [
      { id: 'intro', img: 'portrait', needs: 'PlayerCharacterCreated', text: `Soy ${p.name}, aprendiz de Vittata en Villa Raíz.` },
      { id: 'taller', img: 'workshop', needs: 'WorkshopExplored', text: 'La Gran Ruptura dañó el taller de Vittata, pero entre los restos vimos posibilidades.' },
      { id: 'refugio', img: 'shelter', needs: 'ShelterConstructed', text: decision },
      { id: 'final', img: 'final', needs: 'ChapterCompleted', text: 'El transmisor nos mostró un símbolo de 36 fragmentos. Desde el mirador vimos otras islas: construiremos un bote.' },
    ];
    return all.filter(x => hadEvent(x.needs)).map(x => Object.assign(x, { text: (S.comic.captions[x.id] || x.text) }));
  }
  function orderedPanels() {
    const panels = comicPanels();
    const order = S.comic.order.filter(i => i < panels.length);
    for (let i = 0; i < panels.length; i++) if (!order.includes(i)) order.push(i);
    return order.map(i => panels[i]);
  }
  const imgCache = {};
  function loadImg(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache[src]) return imgCache[src];
    imgCache[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    return imgCache[src];
  }
  function coverFit(ctx, img, x, y, w, h) {
    const ar = img.width / img.height, tr = w / h;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ar > tr) { sw = img.height * tr; sx = (img.width - sw) / 2; } else { sh = img.width / tr; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  function wrapLines(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  // Calcula las cajas de las viñetas (probado en selfTest: sin solapes y dentro de la página)
  function comicLayout(n, layout, W, H, top) {
    const boxes = [], g = 20;
    if (layout === 'strip') {
      const ph = (H - top - g * (n + 1)) / n;
      for (let i = 0; i < n; i++) boxes.push({ x: g, y: top + g + i * (ph + g), w: W - 2 * g, h: ph });
    } else {
      const rows = Math.ceil(n / 2), pw = (W - 3 * g) / 2, ph = (H - top - g * (rows + 1)) / rows;
      for (let i = 0; i < n; i++) {
        const lastAlone = n % 2 === 1 && i === n - 1;
        boxes.push({ x: lastAlone ? g : g + (i % 2) * (pw + g), y: top + g + Math.floor(i / 2) * (ph + g), w: lastAlone ? W - 2 * g : pw, h: ph });
      }
    }
    return boxes;
  }
  async function renderComic(target) {
    const W = 1080, H = 1520, TOP = 380;
    target.width = W; target.height = H;
    const x = target.getContext('2d');
    try { await document.fonts.load('700 40px Fredoka'); await document.fonts.load('400 24px "Atkinson Hyperlegible"'); } catch (e) { /* fuente de respaldo */ }
    const C = S.comic;
    const panels = orderedPanels();
    const portrait = await portraitCanvasFor(512, true);
    const vit = await loadImg(IMG.V);
    const imgs = { workshop: await loadImg(S.captures.workshop), shelter: await loadImg(S.captures.shelter), final: await loadImg(S.captures.final) };
    x.fillStyle = '#10241c'; x.fillRect(0, 0, W, H);
    // Portada
    x.save(); x.beginPath(); x.rect(20, 20, W - 40, TOP - 30); x.clip();
    const coverImg = C.cover === 'taller' ? imgs.workshop : C.cover === 'refugio' ? imgs.shelter : null;
    if (coverImg) coverFit(x, coverImg, 20, 20, W - 40, TOP - 30);
    else {
      const g = x.createLinearGradient(0, 20, 0, TOP); g.addColorStop(0, '#2f8f4e'); g.addColorStop(1, '#10241c');
      x.fillStyle = g; x.fillRect(20, 20, W - 40, TOP - 30);
      if (C.cover === 'personaje') x.drawImage(portrait, W - 380, 10, 360, 360); else if (vit) x.drawImage(vit, W - 400, 0, 380, 380);
    }
    const shade = x.createLinearGradient(0, 150, 0, TOP); shade.addColorStop(0, 'rgba(16,36,28,0)'); shade.addColorStop(1, 'rgba(16,36,28,.92)');
    x.fillStyle = shade; x.fillRect(20, 150, W - 40, TOP - 160); x.restore();
    x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    x.fillStyle = '#f2a03d'; x.font = '600 26px Fredoka, sans-serif'; x.fillText('AMAZONA VERSE · CAPÍTULO 1', 52, 288);
    x.fillStyle = '#f4f7f1'; x.font = '700 58px Fredoka, sans-serif'; x.fillText((C.title || 'Mi primera reconstrucción').slice(0, 32), 50, 346);
    // Viñetas
    const boxes = comicLayout(panels.length, C.layout, W, H - 30, TOP);
    panels.forEach((p, i) => {
      const b = boxes[i];
      x.fillStyle = '#f4f7f1'; x.fillRect(b.x, b.y, b.w, b.h);
      x.font = '400 25px "Atkinson Hyperlegible", sans-serif';
      const lines = wrapLines(x, p.text, b.w - 64).slice(0, 4);
      const capH = 30 + lines.length * 33;
      const ih = b.h - capH - 20;
      x.save(); x.beginPath(); x.rect(b.x + 10, b.y + 10, b.w - 20, ih); x.clip();
      if (p.img === 'portrait') {
        const neckAcc = profileLook(S.profile).accessories.neck, outfit = neckAcc ? neckAcc.color : '#2f8f4e';
        const g = x.createLinearGradient(b.x, b.y, b.x + b.w, b.y + ih); g.addColorStop(0, '#f4f7f1'); g.addColorStop(1, outfit);
        x.fillStyle = g; x.fillRect(b.x + 10, b.y + 10, b.w - 20, ih);
        const s = Math.min(b.w - 20, ih); x.drawImage(portrait, b.x + (b.w - s) / 2, b.y + 10 + (ih - s) / 2, s, s);
      }
      else if (imgs[p.img]) coverFit(x, imgs[p.img], b.x + 10, b.y + 10, b.w - 20, ih);
      else { x.fillStyle = '#4f9a4c'; x.fillRect(b.x + 10, b.y + 10, b.w - 20, ih); }
      if (p.img === 'final') drawSymbol(x, b.x + b.w - 80, b.y + 80, Math.min(64, ih * 0.3));
      x.restore();
      x.fillStyle = '#10241c'; x.font = '600 22px Fredoka, sans-serif'; x.fillText(String(i + 1), b.x + 16, b.y + ih + 46);
      x.font = '400 25px "Atkinson Hyperlegible", sans-serif';
      lines.forEach((l, k) => x.fillText(l, b.x + 44, b.y + ih + 46 + k * 33));
    });
    x.fillStyle = '#a9c2b1'; x.font = '400 18px "Atkinson Hyperlegible", sans-serif';
    x.fillText('Cómic personal generado con ' + S.events.length + ' eventos reales de tu partida', 24, H - 10);
    return { target, boxes, panels };
  }

  // PDF de una página con la imagen JPEG del cómic (sin librerías externas)
  function dataUrlBytes(url) { const b = atob(url.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function buildPdf(jpegUrl, pxW, pxH) {
    const jpg = dataUrlBytes(jpegUrl);
    const ptW = 612, ptH = Math.round(612 * pxH / pxW);
    const enc = s => new TextEncoder().encode(s);
    const parts = [], offsets = [];
    let len = 0;
    const push = u => { parts.push(u); len += u.length; };
    push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
    const objs = [
      `<< /Type /Catalog /Pages 2 0 R >>`,
      `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      null,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      `<< /Title (Amazona Verse - Mi comic) /Producer (Amazona Verse prototipo) >>`,
    ];
    objs.forEach((o, i) => {
      offsets.push(len);
      if (o === null) {
        push(enc(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`));
        push(jpg); push(enc('\nendstream\nendobj\n'));
      } else push(enc(`${i + 1} 0 obj\n${o}\nendobj\n`));
    });
    const xref = len;
    let xs = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) xs += String(o).padStart(10, '0') + ' 00000 n \n';
    xs += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(enc(xs));
    return new Blob(parts, { type: 'application/pdf' });
  }

  function showEnd() {
    const safe = S.refuge && S.refuge.parcel === 'B';
    $('end-text').textContent = (safe ? 'El refugio de la colina protege a la familia de Luma.' : 'El refugio quedó junto al río y la crecida lo dañó.') +
      ' El transmisor reveló el símbolo de los 36 y desbloqueaste el plano de una embarcación. Continuará…';
    $('end').hidden = false;
  }
  function syncComicForm() {
    $('c-title').value = S.comic.title; $('c-cover').value = S.comic.cover; $('c-layout').value = S.comic.layout;
    const panels = orderedPanels();
    $('c-panels').innerHTML = panels.map((p, i) => `<li><div class="pn">Viñeta ${i + 1}</div>
      <input id="cap-${p.id}" data-id="${p.id}" type="text" maxlength="120" aria-label="Texto de la viñeta ${i + 1}">
      <div class="pm"><button class="btn ghost sm" type="button" data-mv="-1" data-i="${i}" aria-label="Subir viñeta ${i + 1}">↑</button><button class="btn ghost sm" type="button" data-mv="1" data-i="${i}" aria-label="Bajar viñeta ${i + 1}">↓</button></div></li>`).join('');
    panels.forEach(p => { $('cap-' + p.id).value = p.text; });
  }
  function moveComicPanel(i, dir) {
    const n = comicPanels().length;
    const order = orderedPanels().map(p => comicPanels().findIndex(q => q.id === p.id));
    const j = i + dir; if (j < 0 || j >= n) return false;
    [order[i], order[j]] = [order[j], order[i]];
    S.comic.order = order; return true;
  }
  $('c-panels').addEventListener('click', e => {
    const b = e.target.closest('button[data-mv]'); if (!b) return;
    if (moveComicPanel(+b.dataset.i, +b.dataset.mv)) { syncComicForm(); refreshComic(); autosave(); }
  });
  $('c-panels').addEventListener('change', e => {
    const inp = e.target.closest('input[data-id]'); if (!inp) return;
    const v = inp.value.trim().slice(0, 120);
    if (v) S.comic.captions[inp.dataset.id] = v; else delete S.comic.captions[inp.dataset.id];
    refreshComic(); autosave();
  });
  for (const id of ['c-title', 'c-cover', 'c-layout']) $(id).addEventListener('change', () => {
    S.comic.title = $('c-title').value.trim().slice(0, 32) || 'Mi primera reconstrucción';
    S.comic.cover = $('c-cover').value; S.comic.layout = $('c-layout').value;
    refreshComic(); autosave();
  });
  async function openComic() {
    $('end').hidden = true; $('comic').hidden = false;
    $('c-export').hidden = true;
    syncComicForm();
    await refreshComic();
  }
  async function refreshComic() { return renderComic($('comic-canvas')); }
  let lastPdfUrl = null;
  // Descargas oficiales del visor de Claude (capacidad "downloads"); fuera del visor queda en null
  let downloads = null;
  try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {}); } catch (e) { /* sin visor */ }
  async function offerFile(filename, blob) {
    if (!downloads) return false;
    try { await downloads.save({ filename, data: blob }); toast('Archivo guardado'); return true; }
    catch (e) {
      if (e && e.code === 'declined') toast('Descarga cancelada');
      else if (e && e.code === 'rate_limited') toast('Espera un momento y vuelve a intentarlo');
      else toast('No se pudo guardar aquí. Mantén presionada la imagen para guardarla.');
      return false;
    }
  }
  async function exportComic(format, fromUser) {
    await refreshComic();
    const cv = $('comic-canvas');
    let url, bytes;
    if (format === 'pdf') {
      const blob = buildPdf(cv.toDataURL('image/jpeg', 0.9), cv.width, cv.height);
      if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
      url = lastPdfUrl = URL.createObjectURL(blob); bytes = blob.size;
      $('c-export-img').hidden = true;
      $('c-download').href = url; $('c-download').download = 'amazona-verse-mi-comic.pdf'; $('c-download').textContent = 'Descargar PDF';
      $('c-export-note').textContent = 'PDF listo. Si tu navegador no lo descarga aquí, usa Exportar PNG y guarda la imagen.';
      exportComic.lastBlob = blob;
    } else {
      url = cv.toDataURL('image/png'); bytes = url.length;
      $('c-export-img').src = url; $('c-export-img').hidden = false;
      $('c-download').href = url; $('c-download').download = 'amazona-verse-mi-comic.png'; $('c-download').textContent = 'Descargar PNG';
      $('c-export-note').textContent = 'En iPhone o Android: mantén presionada la imagen y elige Guardar. En computadora: usa el enlace.';
    }
    $('c-export').hidden = false;
    $('c-download').hidden = !!downloads;
    logEvent('ComicExported', { format, bytes });
    autosave();
    if (fromUser && downloads) {
      const blob = format === 'pdf' ? exportComic.lastBlob : await (await fetch(url)).blob();
      await offerFile('amazona-verse-mi-comic.' + format, blob);
    }
    return url;
  }
  $('b-comic').onclick = openComic;
  $('c-close').onclick = () => { $('comic').hidden = true; if (S.complete) $('end').hidden = false; };
  $('c-refresh').onclick = refreshComic;
  $('c-png').onclick = () => exportComic('png', true);
  $('c-pdf').onclick = () => exportComic('pdf', true);

  // ---------- Creador de personaje: Taller de los Guardianes en 3D ----------
  const C3 = window.AVCharacter;
  const SLOT_LABEL = { head: 'Cabeza', eyes: 'Ojos', neck: 'Cuello', chest: 'Pecho', back: 'Espalda', wings: 'Alas' };
  const LEGACY_SPECIES = { agilis: 1, albifrons: 1, amazonica: 1, festiva: 1, guildingii: 1, oratrix: 1, versicolor: 1 };
  // Perfiles de versiones anteriores (preset/outfit/accessory) pasan al formato modular
  function profileLook(p) {
    if (p && p.look) return C3.normalizeLook(p.look);
    p = p || {};
    const outfit = (OUTFITS.find(o => o.id === p.outfit) || OUTFITS[0]).color;
    const acc = { neck: { id: 'panuelo', color: outfit } };
    if (p.accessory === 'gafas') acc.eyes = { id: 'gafas' };
    if (p.accessory === 'gorra') acc.head = { id: 'sombrero' };
    if (p.accessory === 'medalla') acc.chest = { id: 'brujula' };
    return C3.normalizeLook({ species: LEGACY_SPECIES[p.preset] ? p.preset : 'vittata', accessories: acc });
  }
  // Datos para el retrato 2D de respaldo (cuando no hay modelo 3D)
  function legacyFields(p) {
    if (p.preset && p.outfit) return p;
    const look = profileLook(p);
    const neck = look.accessories.neck, outfit = neck ? (OUTFITS.find(o => o.color === neck.color) || OUTFITS[0]).id : 'naranja';
    const accessory = look.accessories.eyes ? 'gafas' : look.accessories.head ? 'gorra' : look.accessories.chest ? 'medalla' : 'ninguno';
    return { name: p.name, preset: LEGACY_SPECIES[look.species] ? look.species : 'vittata', outfit, accessory };
  }
  let draftLook = null;
  const thumbCache = {};
  async function accessoryThumb(id, color) {
    const key = id + color;
    if (thumbCache[key]) return thumbCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 104;
    const rr = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#fff4dc', '#2f5a3a', 0.9));
    const dl = new THREE.DirectionalLight('#ffffff', 0.9); dl.position.set(1, 2, 3); sc.add(dl);
    const acc = C3.buildAccessory(id, color); sc.add(acc);
    const box = new THREE.Box3().setFromObject(acc), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    cam.position.set(c.x + sz * 0.9, c.y + sz * 0.6, c.z + sz * 1.6); cam.lookAt(c);
    rr.render(sc, cam);
    thumbCache[key] = cv.toDataURL('image/png');
    rr.dispose(); rr.forceContextLoss();
    return thumbCache[key];
  }
  async function renderSlots() {
    const look = draftLook;
    const rows = [];
    for (const slot of C3.SLOTS) {
      const def = C3.ACCESSORIES.find(a => a.slot === slot);
      const cur = look.accessories[slot];
      const color = cur ? cur.color : def.colors[0];
      const img = await accessoryThumb(def.id, color);
      rows.push(`<div class="slot" data-slot="${slot}">
        <div class="sname">${SLOT_LABEL[slot]}<small>${def.name}${def.placeholder ? ' <span class="ph-tag">(provisional)</span>' : ''}</small></div>
        <div class="opts">
          <button class="thumb" type="button" data-act="none" aria-pressed="${!cur}" aria-label="Sin ${def.name}">Nada</button>
          <button class="thumb" type="button" data-act="on" aria-pressed="${!!cur}" aria-label="${def.name}"><img src="${img}" alt=""></button>
          <div class="swatches" ${cur ? '' : 'hidden'}>${def.colors.map(c => `<button class="swatch" type="button" data-color="${c}" aria-pressed="${cur && cur.color === c}" aria-label="Color ${c}" style="background:${c}"></button>`).join('')}</div>
        </div></div>`);
    }
    $('p-slots').innerHTML = rows.join('');
  }
  function changeLook(mutator) {
    mutator(draftLook);
    draftLook = C3.normalizeLook(draftLook);
    if (window.AVShowcase) window.AVShowcase.setLook(draftLook, true);
    renderSlots();
  }
  $('p-slots').addEventListener('click', e => {
    const row = e.target.closest('.slot'); if (!row) return;
    const slot = row.dataset.slot, def = C3.ACCESSORIES.find(a => a.slot === slot);
    const btn = e.target.closest('button'); if (!btn) return;
    if (btn.dataset.act === 'none') changeLook(l => { delete l.accessories[slot]; });
    else if (btn.dataset.act === 'on') changeLook(l => { l.accessories[slot] = { id: def.id, color: (l.accessories[slot] || {}).color || def.colors[0] }; });
    else if (btn.dataset.color) changeLook(l => { l.accessories[slot] = { id: def.id, color: btn.dataset.color }; });
  });
  $('p-species').addEventListener('change', () => changeLook(l => { l.species = $('p-species').value; }));
  async function openCreator(first) {
    const p = S.profile;
    draftLook = profileLook(p);
    $('p-name').value = p.created ? p.name : '';
    $('p-species').innerHTML = Object.entries(C3.SPECIES).map(([id, sp]) => `<option value="${id}">${sp.name}</option>`).join('');
    $('p-species').value = draftLook.species;
    $('p-error').hidden = true;
    $('p-cancel').hidden = !!first;
    $('creator').hidden = false;
    renderSlots();
    if (window.AVShowcase) {
      $('p-stage-status').hidden = false; $('p-stage-status').textContent = 'Cargando el taller…';
      window.AVShowcase.setLook(draftLook, false);
      await window.AVShowcase.mount($('p-stage'));
      const st = window.AVShowcase.status();
      $('p-stage-status').hidden = st === 'ready';
      if (st === 'failed') $('p-stage-status').textContent = 'No se pudo cargar el modelo 3D en este dispositivo.';
    }
  }
  function closeCreator() { $('creator').hidden = true; if (window.AVShowcase) window.AVShowcase.unmount(); }
  function saveCharacter(draft) {
    const d = draft || { name: $('p-name').value.trim(), look: draftLook };
    if (!NAME_OK.test(d.name)) return 'Escribe un nombre inventado de 1 a 16 letras o números.';
    if (d.preset && !PRESETS.some(o => o.id === d.preset)) return 'Opción no válida.';
    const look = d.look ? C3.normalizeLook(d.look) : profileLook(d);
    const firstTime = !S.profile.created;
    S.profile = { created: true, name: d.name, look };
    const meta = { species: look.species, accessories: Object.values(look.accessories).map(a => a.id) };
    logEvent(firstTime ? 'PlayerCharacterCreated' : 'PlayerCharacterUpdated', meta);
    closeCreator();
    refreshCompanion();
    autosave();
    if (firstTime) setTimeout(() => toast('La Gran Ruptura dañó el taller de Vittata. Examina la máquina y el transmisor.', 4500), 300);
    return null;
  }
  $('p-save').onclick = () => { const err = saveCharacter(); if (err) { $('p-error').textContent = err; $('p-error').hidden = false; } };
  $('p-cancel').onclick = closeCreator;
  $('b-char').onclick = () => openCreator(false);

  // Retrato idéntico al del juego: se renderiza con el mismo modelo, plumaje y accesorios
  async function portraitCanvasFor(size, withBg) {
    const out = document.createElement('canvas'); out.width = out.height = size;
    const x = out.getContext('2d');
    if (window.AVCharacter && !failed3D) {
      try {
        const cv = await C3.renderPortrait(profileLook(S.profile), size);
        if (withBg) {
          const g = x.createRadialGradient(size * 0.5, size * 0.38, size * 0.05, size * 0.5, size * 0.5, size * 0.72);
          g.addColorStop(0, '#2d5a43'); g.addColorStop(1, '#10241c'); x.fillStyle = g; x.fillRect(0, 0, size, size);
        }
        x.drawImage(cv, 0, 0, size, size);
        return out;
      } catch (e) { /* sin modelo: retrato 2D */ }
    }
    await drawPortrait(x, size, S.profile, withBg);
    return out;
  }

  // ---------- Guardado versionado con migración y respaldo ----------
  const SAVED_KEYS = ['saveId', 'profile', 'comic', 'pos', 'facing', 'step', 'inv', 'examined', 'collected', 'evaluated', 'refuge', 'builds', 'guardianMet', 'benchUnlocked', 'transmitterOn', 'boatPlan', 'complete', 'indicators', 'events', 'captures', 'clock'];
  function serialize() { const o = { v: SAVE_VERSION }; for (const k of SAVED_KEYS) o[k] = S[k]; return JSON.stringify(o); }
  function save(silent) {
    try {
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev) localStorage.setItem(SAVE_KEY + '.prev', prev);
      localStorage.setItem(SAVE_KEY, serialize()); if (!silent) toast('Partida guardada'); return true;
    } catch (e) {
      try { const o = JSON.parse(serialize()); o.captures = {}; localStorage.setItem(SAVE_KEY, JSON.stringify(o)); if (!silent) toast('Partida guardada (sin imágenes del cómic)'); return true; }
      catch (e2) { if (!silent) toast('No se pudo guardar en este navegador'); return false; }
    }
  }
  let saveDebounce = 0;
  function autosave() { saveDebounce = 0.5; }
  // v2 -> v3: eventos al esquema nuevo, perfil y proyecto de cómic por defecto
  function migrate(d) {
    d = migrateV2(d);
    if (d && d.v === 3) {
      d = Object.assign({}, d, { v: 4 });
      if (d.complete && d.step === 7) d.step = DONE;
    }
    return d;
  }
  function migrateV2(d) {
    if (d && d.v === 2) {
      const base = freshState();
      const id = newId();
      const m = Object.assign({}, d, { v: 3, saveId: id, profile: base.profile, comic: base.comic });
      const oldS = S; S = { saveId: id };
      m.events = (d.events || []).map((e, i) => makeEvent(e.type, e.data, i + 1, e.t || 0));
      S = oldS;
      if (m.events.some(e => e.key === 'PlayerCharacterCreated')) m.profile = Object.assign({}, base.profile, { created: true });
      return m;
    }
    return d;
  }
  function validSave(d) {
    return d && d.v === SAVE_VERSION && typeof d.saveId === 'string' && d.profile && d.comic && d.pos && typeof d.pos.x === 'number' && typeof d.step === 'number' &&
      d.inv && Array.isArray(d.collected) && Array.isArray(d.events) && d.evaluated && d.examined;
  }
  function load(silent) {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (!raw) { if (!silent) toast('No hay partida guardada'); return false; }
    let d; try { d = migrate(JSON.parse(raw)); } catch (e) { d = null; }
    if (!validSave(d)) {
      try { localStorage.setItem(SAVE_KEY + '.unreadable', raw); } catch (e) { /* sin espacio */ }
      if (!silent) toast('No se pudo leer la partida guardada; se guardó una copia y empiezas de nuevo');
      return false;
    }
    S = Object.assign(freshState(), d, { event: null, water: WATER_BASE, vy: 0, captures: d.captures || {} });
    applyWorld();
    if (!silent) toast('Partida cargada');
    return true;
  }
  function applyWorld() {
    for (const r of RESOURCES) resMeshes[r.id].visible = !S.collected.includes(r.id);
    placeRefugeMesh(); syncRefugeInteractable();
    applyTallerLook(); applyGuardianLook();
    water.position.y = S.water; rain.visible = false;
    build = null; ghost.visible = false;
    hideCard(); $('dialog').hidden = true; dialogQueue = []; dialogDone = null;
    showSymbol(false); $('comic').hidden = true; $('creator').hidden = true;
    if (S.complete) showEnd(); else $('end').hidden = true;
    renderQuest(); renderInv();
    refreshCompanion();
  }
  function reset(skipCreator) {
    S = freshState();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
    applyWorld();
    if (!skipCreator) openCreator(true);
  }

  // ---------- Entrada ----------
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  let jumpHeld = false, camYaw = 0.35;
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    keys.add(e.key.toLowerCase());
    if (e.key === ' ') { jumpHeld = true; if (!e.repeat) tryJump(); e.preventDefault(); }
    if ((e.key === 'f' || e.key === 'F') && !e.repeat) tryDash();
    if ((e.key === 'v' || e.key === 'V') && !e.repeat) toggleFly();
    if (/^[1-7]$/.test(e.key) && !e.repeat) playEmote(EMOTE_KEYS[+e.key - 1]);
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') action();
    if (e.key === 'Escape') { if (build) cancelBuild(); hideCard(); }
  });
  addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (e.key === ' ') jumpHeld = false; });
  addEventListener('blur', () => { keys.clear(); jumpHeld = false; });

  const stickEl = $('stick'), knob = $('knob');
  let stickId = null;
  stickEl.addEventListener('pointerdown', e => { stickId = e.pointerId; stickEl.setPointerCapture(e.pointerId); moveStick(e); });
  stickEl.addEventListener('pointermove', e => { if (e.pointerId === stickId) moveStick(e); });
  const endStick = e => { if (e.pointerId !== stickId) return; stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', endStick); stickEl.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    const r = stickEl.getBoundingClientRect();
    let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    stick.x = dx; stick.y = dy;
    knob.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;
  }
  const jumpBtn = $('b-jump');
  jumpBtn.addEventListener('pointerdown', e => { e.preventDefault(); jumpHeld = true; tryJump(); });
  jumpBtn.addEventListener('pointerup', () => { jumpHeld = false; });
  jumpBtn.addEventListener('pointerleave', () => { jumpHeld = false; });
  $('b-dash').addEventListener('pointerdown', e => { e.preventDefault(); tryDash(); });
  $('b-fly').addEventListener('pointerdown', e => { e.preventDefault(); toggleFly(); });
  // Menú de gestos (celular y ratón)
  const emoteMenu = $('emotes');
  emoteMenu.innerHTML = EMOTE_KEYS.map((k, i) => `<button class="btn" type="button" data-emote="${k}">${i + 1} · ${EMOTES[k].label}</button>`).join('');
  emoteMenu.addEventListener('click', e => { const b = e.target.closest('[data-emote]'); if (!b) return; emoteMenu.hidden = true; playEmote(b.dataset.emote); });
  $('b-emotes').addEventListener('click', () => { emoteMenu.hidden = !emoteMenu.hidden; });
  $('b-act').addEventListener('click', action);

  let dragId = null, dragX = 0;
  canvas.addEventListener('pointerdown', e => { dragId = e.pointerId; dragX = e.clientX; });
  canvas.addEventListener('pointermove', e => { if (e.pointerId !== dragId) return; camYaw -= (e.clientX - dragX) * 0.006; dragX = e.clientX; });
  const endDrag = e => { if (e.pointerId === dragId) dragId = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);

  $('b-save').onclick = () => save(false);
  $('b-load').onclick = () => load(false);
  $('b-reset').onclick = () => { reset(); toast('Partida nueva'); };
  $('b-again').onclick = () => { reset(); };

  function action() {
    if (overlayOpen()) return;
    if (dialogOpen()) { showNextLine(); return; }
    if (cardOpen) { hideCard(); return; }
    if (build) { placeRefuge(); return; }
    const it = nearest();
    if (it) it.use();
  }
  // Movimiento de acción: velocidad con aceleración, correr, doble salto con aleteo, impulso y tiempo de coyote
  const MOVE = { vx: 0, vz: 0, airJumps: 0, coyote: 0, dashT: 0, dashCd: 0, airDash: true, land: 0, wasAir: false, flying: false };
  // Vuelo: tercer toque de salto en el aire, o V / botón Volar. Mantener salto sube, C baja, soltar desciende suave.
  const FLY_SPEED = 12, FLY_CEIL = 26;
  // Nado: la cotorra flota con el cuerpo medio hundido
  const SWIM_SPEED = 4.5, SWIM_DEPTH = 0.55;
  function waterLevelAt(x) { return Math.abs(x - water.position.x) < 16 ? S.water : -Infinity; }
  function tryJump() {
    if (MOVE.flying) return;
    if (MOVE.swimming) { S.vy = 7; MOVE.swimming = false; splash(S.pos.x, S.water, S.pos.z, 0.8); return; }
    if (S.pos.y <= surfaceY(S.pos.x, S.pos.z) + 0.01 || MOVE.coyote > 0) { S.vy = 7.5; MOVE.coyote = 0; MOVE.airJumps = 1; return; }
    if (MOVE.airJumps > 0) { S.vy = 6.8; MOVE.airJumps--; return; }
    startFlying();
  }
  function startFlying() {
    if (dialogOpen() || cardOpen || overlayOpen()) return;
    MOVE.flying = true;
    if (S.pos.y <= surfaceY(S.pos.x, S.pos.z) + 0.01) S.vy = 6; else S.vy = Math.max(S.vy, 2);
  }
  function toggleFly() { if (MOVE.flying) MOVE.flying = false; else startFlying(); }
  // Altura de cada obstáculo para poder pasar volando por encima
  const KIND_H = { taller: 3.8, post: 1.3, obj: 1.6, bench: 1, refuge: 2.6, npc: 2 };
  function tryDash() {
    if (MOVE.dashCd > 0 || dialogOpen() || cardOpen || overlayOpen()) return;
    const air = S.pos.y > surfaceY(S.pos.x, S.pos.z) + 0.01;
    if (air && !MOVE.airDash) return;
    if (air) { MOVE.airDash = false; S.vy = Math.max(S.vy, 1.5); }
    MOVE.dashT = 0.2; MOVE.dashCd = 0.7;
  }
  // Empuja un punto fuera de un collider: círculo (r) o caja alineada (hx/hz)
  function pushOut(p, c, rad) {
    if (c.r <= 0 || (c.when && !c.when())) return;
    if (p.y != null && p.y - height(c.x, c.z) > (c.h != null ? c.h : c.kind === 'tree' ? c.r * 9 : KIND_H[c.kind] || 2)) return;
    if (c.hx) {
      const qx = Math.max(c.x - c.hx, Math.min(c.x + c.hx, p.x)), qz = Math.max(c.z - c.hz, Math.min(c.z + c.hz, p.z));
      const dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
      if (d >= rad) return;
      if (d > 1e-4) { p.x = qx + dx / d * rad; p.z = qz + dz / d * rad; return; }
      // Dentro de la caja: sale por el lado más cercano
      const ox = c.hx - Math.abs(p.x - c.x), oz = c.hz - Math.abs(p.z - c.z);
      if (ox < oz) p.x = c.x + Math.sign(p.x - c.x || 1) * (c.hx + rad);
      else p.z = c.z + Math.sign(p.z - c.z || 1) * (c.hz + rad);
      return;
    }
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + rad;
    if (d < min && d > 1e-4) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
  }

  // ---------- Simulación ----------
  const SPEED = 6.5, RUN_SPEED = 10.5, DASH_SPEED = 19;
  function update(dt) {
    S.clock += dt;
    let ix = 0, iz = 0;
    if (keys.has('w') || keys.has('arrowup')) iz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('q')) camYaw += 1.8 * dt;
    if (keys.has('r')) camYaw -= 1.8 * dt;
    ix += stick.x; iz += stick.y;
    const busy = dialogOpen() || cardOpen || overlayOpen();
    const len = Math.hypot(ix, iz);
    const onGround = S.pos.y <= surfaceY(S.pos.x, S.pos.z) + 0.01;
    let tx = 0, tz = 0;
    if (len > 0.12 && !busy) {
      const mag = Math.min(1, len);
      ix /= Math.max(1, len); iz /= Math.max(1, len);
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const mx = rx * ix - fx * iz, mz = rz * ix - fz * iz, ml = Math.hypot(mx, mz);
      // Shift (o el joystick a fondo) corre
      const run = keys.has('shift') || Math.hypot(stick.x, stick.y) > 0.92;
      const sp = (MOVE.flying ? FLY_SPEED : MOVE.swimming ? SWIM_SPEED * (run ? 1.4 : 1) : run ? RUN_SPEED : SPEED) * (ml > 0 ? 1 / Math.max(1, ml) : 0) * Math.max(mag, 0.35);
      tx = mx * sp; tz = mz * sp;
      if (ml > 0.01) S.facing = { x: mx / ml, z: mz / ml };
      const map = player.material.map;
      if (ix < -0.1) map.repeat.x = -1; else if (ix > 0.1) map.repeat.x = 1;
      map.offset.x = map.repeat.x < 0 ? 1 : 0;
    }
    MOVE.dashCd = Math.max(0, MOVE.dashCd - dt);
    if (MOVE.dashT > 0) {
      MOVE.dashT -= dt;
      MOVE.vx = S.facing.x * DASH_SPEED; MOVE.vz = S.facing.z * DASH_SPEED;
    } else {
      const acc = 1 - Math.exp(-dt * (onGround ? (tx || tz ? 14 : 18) : MOVE.flying || MOVE.swimming ? 6 : 5));
      MOVE.vx += (tx - MOVE.vx) * acc; MOVE.vz += (tz - MOVE.vz) * acc;
    }
    S.pos.x += MOVE.vx * dt; S.pos.z += MOVE.vz * dt;
    const hSpeed = Math.hypot(MOVE.vx, MOVE.vz);
    const moving = hSpeed > 0.6;
    MOVE.speed = hSpeed;
    // Recoger materiales al pasar por encima (también funciona E / Acción desde más lejos)
    if (!busy) for (const r of RESOURCES) {
      if (S.collected.includes(r.id)) continue;
      if (Math.hypot(S.pos.x - r.x, S.pos.z - r.z) < 1.1 && S.pos.y - height(r.x, r.z) < 1.6) collect(r);
    }
    // Dos pasadas: al empujar fuera de un objeto se puede quedar dentro de otro vecino
    for (let pass = 0; pass < 2; pass++) for (const c of colliders) pushOut(S.pos, c, 0.55);
    S.pos.x = Math.max(-WORLD, Math.min(WORLD, S.pos.x));
    S.pos.z = Math.max(-WORLD, Math.min(WORLD, S.pos.z));
    const ground = surfaceY(S.pos.x, S.pos.z);
    // Agua: el río (franja del plano de agua) es nadable donde cubre más de 0,7 m
    const wY = waterLevelAt(S.pos.x), deep = wY - ground > 0.7;
    const wasSwim = MOVE.swimming;
    MOVE.swimming = deep && !MOVE.flying && S.pos.y <= wY - SWIM_DEPTH + 0.15;
    if (MOVE.swimming && !wasSwim) splash(S.pos.x, wY, S.pos.z, Math.min(1.6, 0.6 + Math.abs(S.vy) * 0.12));
    if (MOVE.swimming) {
      // Flota en la superficie; mantener C bucea hasta el fondo; al soltar sube
      const target = keys.has('c') && !busy ? ground + 0.25 : wY - SWIM_DEPTH;
      S.vy += ((target - S.pos.y) * 3 - S.vy) * (1 - Math.exp(-dt * 5));
      MOVE.airJumps = 1; MOVE.airDash = true;
      if (moving && (MOVE.ripple = (MOVE.ripple || 0) - dt) <= 0) { MOVE.ripple = 0.35; ripple(S.pos.x, wY, S.pos.z); }
    } else if (MOVE.flying) {
      // Volando: sin gravedad; sube con salto, baja con C, si no desciende despacio
      const want = jumpHeld && !busy ? 5.5 : keys.has('c') ? -7 : -1.1;
      S.vy += (want - S.vy) * (1 - Math.exp(-dt * 4));
      if (S.pos.y > ground + FLY_CEIL) S.vy = Math.min(S.vy, 0);
    } else {
      const gliding = jumpHeld && S.vy < 0;
      S.vy -= (gliding ? 6 : 22) * dt;
      if (gliding) S.vy = Math.max(S.vy, -2.2);
    }
    S.pos.y = Math.max(ground, (S.pos.y || ground) + S.vy * dt);
    if (S.pos.y <= ground) {
      if (MOVE.wasAir && S.vy < -4) MOVE.land = 0.2; // aterrizaje fuerte: pequeño aplastón
      if (MOVE.flying && S.vy <= 0) MOVE.flying = false; // tocar suelo bajando termina el vuelo
      S.pos.y = ground; S.vy = 0;
      MOVE.coyote = 0.12; MOVE.airJumps = 1; MOVE.airDash = true; MOVE.wasAir = false;
    } else { MOVE.coyote = Math.max(0, MOVE.coyote - dt); MOVE.wasAir = true; }
    MOVE.land = Math.max(0, MOVE.land - dt);

    if (S.event) {
      const e = S.event; e.t += dt;
      const k = Math.min(1, e.t / (e.dur * 0.6));
      const fall = e.t > e.dur * 0.8 ? Math.min(1, (e.t - e.dur * 0.8) / (e.dur * 0.2)) : 0;
      S.water = WATER_BASE + (FLOOD_LEVEL - WATER_BASE) * k * (1 - fall * 0.85);
      water.position.y = S.water;
      rain.visible = true;
      if (e.t >= e.dur) { S.event = null; rain.visible = false; finishRainEvent(); }
    }
    updateGhost();
    if (saveDebounce > 0) { saveDebounce -= dt; if (saveDebounce <= 0) save(true); }
    if (toastTimer !== Infinity && toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) hideToast(); }
    const it = (!busy && !build) ? nearest() : null;
    const pr = $('prompt');
    if (build && !busy) { pr.textContent = build.valid ? 'Acción: colocar refugio' : build.reason; pr.hidden = false; }
    else if (it) { pr.textContent = 'Acción: ' + it.label(); pr.hidden = false; }
    else pr.hidden = true;
    return moving;
  }

  // ---------- Render ----------
  let t = 0;
  const camPos = new THREE.Vector3();
  function placeCamera(snap) {
    camPos.set(S.pos.x + Math.sin(camYaw) * camDist(), S.pos.y + 4.2 + (MOVE.flying ? 1.6 : 0), S.pos.z + Math.cos(camYaw) * camDist());
    if (snap) {
      camera.position.copy(camPos);
      if (companion.visible) {
        companionPos.x = S.pos.x - S.facing.x * 1.8 + S.facing.z * 1.1; companionPos.z = S.pos.z - S.facing.z * 1.8 - S.facing.x * 1.1;
        companion.position.set(companionPos.x, height(companionPos.x, companionPos.z) + 0.75, companionPos.z);
        cShadow.position.set(companionPos.x, height(companionPos.x, companionPos.z) + 0.03, companionPos.z);
      }
    }
    player.position.set(S.pos.x, S.pos.y + 1.05, S.pos.z);
    pShadow.position.set(S.pos.x, surfaceY(S.pos.x, S.pos.z) + 0.03, S.pos.z);
    if (snap) sync3D(0, false, true);
    camera.lookAt(S.pos.x, S.pos.y + 1.2, S.pos.z);
  }
  function render(dt, moving) {
    t += dt;
    const bob = moving && S.pos.y <= surfaceY(S.pos.x, S.pos.z) + 0.01 ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
    camPos.set(S.pos.x + Math.sin(camYaw) * camDist(), S.pos.y + 4.2 + (MOVE.flying ? 1.6 : 0), S.pos.z + Math.cos(camYaw) * camDist());
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    player.position.set(S.pos.x, S.pos.y + 1.05 + bob, S.pos.z);
    player.material.rotation = jumpHeld && S.vy < 0 ? Math.sin(t * 6) * 0.08 : 0;
    pShadow.position.set(S.pos.x, surfaceY(S.pos.x, S.pos.z) + 0.03, S.pos.z);
    luma.sp.position.y = height(LUMA.x, LUMA.z) + 1.0 + Math.sin(t * 2) * 0.05;
    if (companion.visible) {
      const tx = S.pos.x - S.facing.x * 1.8 + S.facing.z * 1.1, tz = S.pos.z - S.facing.z * 1.8 - S.facing.x * 1.1;
      const k = Math.min(1, dt * 3);
      companionPos.x += (tx - companionPos.x) * k; companionPos.z += (tz - companionPos.z) * k;
      const cy = height(companionPos.x, companionPos.z);
      companion.position.set(companionPos.x, cy + 0.75 + Math.abs(Math.sin(t * 9)) * (moving ? 0.1 : 0), companionPos.z);
      cShadow.position.set(companionPos.x, cy + 0.03, companionPos.z);
    }
    sync3D(dt, moving, false);
    for (const r of RESOURCES) if (resMeshes[r.id].visible) resMeshes[r.id].rotation.y += dt * 0.6;
    tAgua.offset.y = t * 0.04; tAgua.offset.x = Math.sin(t * 0.3) * 0.05;
    updateFx(dt);
    if (S.transmitterOn) trxLight.scale.setScalar(1 + Math.sin(t * 6) * 0.25);
    if (rain.visible) {
      const a = rain.geometry.attributes.position;
      for (let i = 0; i < RAIN_N; i++) { let y = a.getY(i) - 28 * dt; if (y < 0) y += 25; a.setY(i, y); }
      a.needsUpdate = true;
      rain.position.set(S.pos.x, height(S.pos.x, S.pos.z), S.pos.z);
    }
    camera.lookAt(S.pos.x, S.pos.y + 1.2, S.pos.z);
    renderer.render(scene, camera);
  }
  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);
  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    render(dt, update(dt));
    requestAnimationFrame(frame);
  }

  // ---------- Inicio ----------
  S.pos.y = height(S.pos.x, S.pos.z);
  init3D();
  if (!load(true)) reset();
  placeCamera(true);
  requestAnimationFrame(frame);

  // ---------- API de prueba (solo diagnóstico) ----------
  function teleport(x, z, fx, fz) { S.pos.x = x; S.pos.z = z; S.pos.y = height(x, z); S.vy = 0; if (fx !== undefined) S.facing = { x: fx, z: fz }; }
  function tick(seconds) { const n = Math.ceil(seconds / 0.05); for (let i = 0; i < n; i++) update(0.05); }
  function drain() { let n = 0; while (dialogOpen() && n++ < 30) showNextLine(); }
  function useAt(id, ox, oz) { const it = interactables.find(i => i.id === id); teleport(it.x + (ox || 0.9), it.z + (oz || 0)); tick(0.1); const nb = nearest(); if (nb && nb.id === id) { action(); return true; } return false; }
  async function selfTest(opts) {
    opts = opts || {};
    const out = [];
    const check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra || '' });
    const keep = (() => { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } })();
    reset(true);
    // Creador de personaje
    check('Nombre vacío se rechaza', saveCharacter({ name: '', preset: 'agilis', outfit: 'azul', accessory: 'gafas' }) !== null);
    check('Nombre con símbolos raros se rechaza', saveCharacter({ name: '<b>x</b>', preset: 'agilis', outfit: 'azul', accessory: 'gafas' }) !== null);
    check('Personaje válido se guarda', saveCharacter({ name: 'Nube Azul', preset: 'versicolor', outfit: 'azul', accessory: 'gafas' }) === null && S.profile.created && hadEvent('PlayerCharacterCreated'));
    await refreshCompanion();
    check('El aprendiz aparece en el mundo', companion.visible || !!(companion3D && companion3D.root.visible));
    check('Vittata despierta junto al taller', Math.hypot(S.pos.x - SPAWN.x, S.pos.z - SPAWN.z) < 0.1);
    useAt('maquina'); drain(); useAt('transmisor'); drain();
    check('Taller explorado y misión con Luma', S.step === 1 && hadEvent('WorkshopExplored') && !!S.captures.workshop, 'paso ' + S.step);
    useAt('luma'); drain();
    check('Luma da la misión', S.step === 2 && hadEvent('LumaHelped'), 'paso ' + S.step);
    for (const id of ['m1', 'm2', 'm3', 'm4', 'p1', 'p2', 'c1']) useAt(id);
    check('Recursos recolectados', S.step === 3 && hadEvent('ResourcesCollected'), JSON.stringify(S.inv));
    useAt('postA', 1, 1); $('c-close').click(); drain();
    useAt('postB', 1, 1); $('c-close').click(); drain();
    check('Dos terrenos inspeccionados', S.step === 4 && S.events.filter(e => e.key === 'LandInspected').length === 2, 'paso ' + S.step);
    startBuild('A'); teleport(PLACES.A.x + 50, PLACES.A.z, 0, 1); tick(0.1);
    check('Construcción fuera del terreno rechazada', build && !build.valid, build && build.reason);
    teleport(PLACES.A.x, PLACES.A.z - 1.5, 0, 1); tick(0.1);
    check('Construcción dentro del terreno válida', build && build.valid, build && build.reason);
    action(); drain();
    check('Refugio construido y materiales consumidos', S.refuge && S.inv.madera === 1 && S.inv.piedra === 0, JSON.stringify(S.inv));
    tick(4); check('La crecida sube el agua', S.water > WATER_BASE + 0.5);
    tick(5); drain();
    check('Consecuencia visible: refugio inundado', S.refuge.damaged && refugeMesh.rotation.z > 0.1 && hadEvent('ShelterFlooded'));
    check('Aparece el Guardián', guardian.sp.visible && S.step === 5);
    syncRefugeInteractable(); useAt('refuge', 1.6, 0);
    check('Corregir: desarmar recupera materiales', !S.refuge && S.inv.madera === 4 && S.inv.piedra === 2, JSON.stringify(S.inv));
    useAt('postB', 1, 1);
    const bb = document.getElementById('c-build'); if (bb) bb.click();
    teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); drain(); tick(9); drain();
    check('Reconstruido en la colina y a salvo', S.refuge && S.refuge.parcel === 'B' && !S.refuge.damaged && hadEvent('ShelterRelocated'));
    useAt('guardian', 1.4, 0); drain();
    check('Guardián conocido y banco desbloqueado', hadEvent('GuardianMet') && S.benchUnlocked && bench.visible && S.step === 6);
    useAt('transmisor');
    check('Símbolo de 36 fragmentos visible', !$('symbol').hidden);
    drain();
    check('Después del transmisor toca subir al mirador', S.step === 7 && !S.complete && $('symbol').hidden, 'paso ' + S.step);
    check('El mirador está en alto', mirador.position.y > PLACES.villa.base + 2, mirador.position.y.toFixed(1));
    useAt('mirador', 2.4, 0); drain();
    check('Capítulo completo', S.transmitterOn && S.boatPlan && S.complete && hadEvent('ChapterCompleted') && !$('end').hidden);
    // Esquema de eventos
    const ev = S.events;
    const schemaOk = ev.every((e, i) => e.schemaVersion === EVENT_SCHEMA && e.saveId === S.saveId && e.seq === i + 1 && e.id === S.saveId + '-' + (i + 1) && typeof e.type === 'string' && e.chapter === 1 && 'location' in e && Array.isArray(e.characters) && 'sceneTemplate' in e && e.locKey === 'evt.' + e.key);
    check('Todos los eventos cumplen el esquema', schemaOk, ev.length + ' eventos');
    check('Eventos sin el nombre real ni datos personales', !JSON.stringify(ev).includes('Nube Azul'));
    const json = JSON.stringify(ev);
    check('Los eventos se serializan y vuelven igual', JSON.stringify(JSON.parse(json)) === json);
    // Cómic
    const panels = comicPanels();
    check('El cómic usa solo eventos reales (4 viñetas)', panels.length === 4);
    check('Viñeta 1 presenta al personaje creado', panels[0].text.includes('Nube Azul'));
    check('Viñeta 3 cuenta la corrección real', panels[2].text.startsWith('Mi primera idea no era segura'), panels[2].text);
    await openComic();
    S.comic.title = 'Prueba de cómic'; S.comic.cover = 'personaje'; syncComicForm();
    check('Mover la viñeta 4 hacia arriba cambia el orden', moveComicPanel(3, -1) && orderedPanels()[2].id === 'final');
    check('No se puede mover fuera de rango', moveComicPanel(0, -1) === false);
    S.comic.captions.final = 'Mi frase editada';
    check('Texto editado aparece en la viñeta', orderedPanels().some(p => p.text === 'Mi frase editada'));
    for (const lay of ['grid', 'strip']) {
      for (const n of [1, 2, 3, 4]) {
        const bx = comicLayout(n, lay, 1080, 1490, 380);
        const inside = bx.every(b => b.x >= 0 && b.y >= 380 && b.x + b.w <= 1080 && b.y + b.h <= 1490 && b.w > 100 && b.h > 100);
        const overlap = bx.some((a, i) => bx.some((b, j) => i < j && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
        if (!inside || overlap) check(`Diseño ${lay} con ${n} viñetas`, false, JSON.stringify(bx));
      }
    }
    check('Diseños sin solapes y dentro de la página (8 casos)', !out.some(o => o.name.startsWith('Diseño') && !o.ok));
    S.comic.layout = 'strip';
    const png = await exportComic('png');
    check('Exporta PNG válido', png.startsWith('data:image/png') && png.length > 50000, Math.round(png.length / 1024) + ' KB');
    const im = await loadImg(png);
    check('El PNG se decodifica a 1080×1520', im && im.width === 1080 && im.height === 1520, im ? im.width + '×' + im.height : 'no carga');
    await exportComic('pdf');
    const pdf = exportComic.lastBlob;
    const head = new TextDecoder().decode(new Uint8Array(await pdf.slice(0, 8).arrayBuffer()));
    const tail = new TextDecoder().decode(new Uint8Array(await pdf.slice(pdf.size - 6).arrayBuffer()));
    check('Exporta PDF con cabecera y cierre correctos', head.startsWith('%PDF-1.4') && tail.includes('%%EOF') && pdf.size > 50000, Math.round(pdf.size / 1024) + ' KB');
    check('Exportaciones registradas', S.events.filter(e => e.key === 'ComicExported').length === 2);
    if (opts.saveFiles) {
      const post = (name, body) => fetch('/__save?name=' + encodeURIComponent(name), { method: 'POST', body }).then(r => r.ok).catch(() => false);
      const pngBlob = await (await fetch(png)).blob();
      check('PNG enviado al servidor de pruebas', await post('comic.png', pngBlob));
      check('PDF enviado al servidor de pruebas', await post('comic.pdf', pdf));
      const portrait = await portraitCanvasFor(512, true);
      check('Retrato enviado al servidor de pruebas', await post('retrato.png', await (await fetch(portrait.toDataURL('image/png'))).blob()));
    }
    $('comic').hidden = true;
    // Guardado, migración y respaldo
    check('Guardar funciona', save(true));
    const snap = serialize();
    reset(true); check('Reiniciar limpia la partida', S.step === 0 && !S.refuge && !S.profile.created);
    try { localStorage.setItem(SAVE_KEY, snap); } catch (e) { /* sin almacenamiento */ }
    check('Cargar restaura progreso, personaje, cómic y eventos', load(true) && S.complete && S.profile.name === 'Nube Azul' && S.comic.layout === 'strip' && S.events.length > 15 && !!S.captures.final, S.events.length + ' eventos');
    const v2 = { v: 2, pos: { x: 1, z: 2, y: 0 }, facing: { x: 0, z: 1 }, step: 2, inv: { madera: 1, piedra: 0, componente: 0 }, examined: { maquina: true, transmisor: true },
      collected: ['m1'], evaluated: { A: false, B: false }, refuge: null, builds: [], guardianMet: false, benchUnlocked: false, transmitterOn: false, boatPlan: false, complete: false,
      indicators: { seguridad: '—', acceso: '—', habitat: '—' }, events: [{ type: 'PlayerCharacterCreated', t: 0, data: {} }, { type: 'WorkshopExplored', t: 5, data: {} }, { type: 'LumaHelped', t: 9, data: {} }], captures: {}, clock: 12 };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(v2)); } catch (e) { /* sin almacenamiento */ }
    check('Partida v2 se migra a v3 sin perder progreso', load(true) && S.step === 2 && S.collected[0] === 'm1' && S.events.length === 3 && S.events[1].type === 'LocationDiscovered' && S.events[2].seq === 3);
    try { localStorage.setItem(SAVE_KEY, '{roto'); } catch (e) { /* sin almacenamiento */ }
    check('Partida dañada se rechaza y se guarda una copia', load(true) === false && localStorage.getItem(SAVE_KEY + '.unreadable') === '{roto');
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, step: 3 })); } catch (e) { /* sin almacenamiento */ }
    check('Partida v1 (incompatible) se rechaza', load(true) === false);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign(JSON.parse(snap), { v: 3, step: 7 }))); } catch (e) { /* sin almacenamiento */ }
    check('Partida v3 terminada se migra a v4 como terminada', load(true) && S.complete && S.step === DONE, 'paso ' + S.step);
    // Ruta directa a la colina
    reset(true); saveCharacter({ name: 'Rio', preset: 'agilis', outfit: 'rojo', accessory: 'ninguno' });
    S.step = 4; S.evaluated = { A: true, B: true }; S.inv = { madera: 4, piedra: 2, componente: 1 };
    startBuild('B'); teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); drain(); tick(9); drain();
    check('Ruta colina directa: texto del cómic correcto', comicPanels()[1] && comicPanels().find(p => p.id === 'refugio').text.startsWith('Elegí construir en la colina'));
    check('Sin capítulo completo no hay viñeta final', !comicPanels().some(p => p.id === 'final'));
    reset(true);
    try { localStorage.removeItem(SAVE_KEY + '.unreadable'); if (keep) localStorage.setItem(SAVE_KEY, keep); } catch (e) { /* sin almacenamiento */ }
    if (keep) load(true); else openCreator(true);
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  // Pruebas del sistema de accesorios 3D (requieren el modelo con esqueleto)
  async function accessoryTest() {
    const out = [];
    const check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra || '' });
    let ch;
    try { ch = await window.AVCharacter.create(); } catch (e) { check('El modelo 3D carga', false, String(e)); return { passed: 0, total: 1, results: out }; }
    check('El modelo 3D carga', true, Math.round(ch.height * 100) / 100 + ' de alto');
    check('Tiene los 7 puntos de montaje', ch.missingMounts().length === 0, ch.missingMounts().join(', '));
    const needed = ['Idle', 'Welcome', 'Celebrate', 'Curious', 'Walk'];
    check('Tiene las animaciones de espera, presentación, celebración, curiosidad y caminar', needed.every(n => ch.clips[n]), Object.keys(ch.clips).join(', '));
    const all = { species: 'vittata', accessories: {} };
    for (const a of window.AVCharacter.ACCESSORIES) all.accessories[a.slot] = { id: a.id, color: a.colors[1] || a.colors[0] };
    ch.applyLook(all);
    const objs = Object.values(ch.mounted).flatMap(m => m.objects);
    check('Se montan los 6 accesorios (7 piezas con los dos brazaletes)', Object.keys(ch.mounted).length === 6 && objs.length === 7, objs.length + ' piezas');
    // Colisiones en pose de reposo: ningún vértice de accesorio dentro del pico ni de los ojos
    ch.mixer.stopAllAction(); ch.root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); }); ch.root.updateMatrixWorld(true);
    // Puntos reales del pico (material del pico) y esferas de los ojos, en pose de reposo
    const beakPts = [];
    ch.root.traverse(o => {
      if (!o.isMesh || o.userData.isAccessory) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const bi = mats.findIndex(m => /^Material\.001$|^Beak$/.test(m.name)); if (bi < 0) return;
      const pos = o.geometry.attributes.position, v = new THREE.Vector3();
      const groups = Array.isArray(o.material) ? o.geometry.groups.filter(g => g.materialIndex === bi) : [{ start: 0, count: pos.count, direct: true }];
      for (const g of groups) for (let i = g.start; i < g.start + g.count; i += g.direct ? 2 : 3) {
        const vi = g.direct ? i : (o.geometry.index ? o.geometry.index.getX(i) : i);
        v.fromBufferAttribute(pos, vi).applyMatrix4(o.matrixWorld); beakPts.push(v.clone());
      }
    });
    const mi = window.AVCharacter.mountsInfo();
    const eyes = mi && mi.eyes ? Object.values(mi.eyes).map(e => new THREE.Vector3().fromArray(e.center || e)) : [];
    const EYE_R = 0.045, MIN_GAP = 0.004;
    const hits = [];
    for (const [slot, m] of Object.entries(ch.mounted)) for (const obj of m.objects) obj.traverse(o => {
      if (!o.isMesh) return; const pos = o.geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 250))) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (eyes.some(e => e.distanceTo(v) < EYE_R)) { hits.push(slot + '→ojo'); return; }
        for (const b of beakPts) if (b.distanceTo(v) < MIN_GAP) { hits.push(slot + '→pico'); return; }
      }
    });
    const solids = beakPts.length ? [1] : [];
    check('Los accesorios no atraviesan el pico ni los ojos (reposo)', solids.length > 0 && hits.length === 0, solids.length ? (hits.join(', ') || solids.length + ' piezas revisadas') : 'no se encontraron mallas de pico/ojos');
    // Seguimiento durante las animaciones: el accesorio conserva su posición relativa al hueso y se mueve con él
    let maxDrift = 0, maxTravel = 0;
    const inv = new THREE.Matrix4(), rel = new THREE.Vector3();
    for (const name of needed) {
      const clip = ch.clips[name]; if (!clip) continue;
      ch.mixer.stopAllAction(); const act = ch.mixer.clipAction(clip); act.reset().play();
      const ref = {};
      for (let k = 0; k <= 6; k++) {
        ch.mixer.setTime(clip.duration * k / 6); ch.root.updateMatrixWorld(true);
        for (const [slot, m] of Object.entries(ch.mounted)) m.objects.forEach((obj, j) => {
          const bone = obj.parent, key = slot + j;
          const wp = obj.getWorldPosition(new THREE.Vector3());
          inv.copy(bone.matrixWorld).invert(); rel.copy(wp).applyMatrix4(inv);
          if (!ref[key]) ref[key] = { rel: rel.clone(), wp: wp.clone() };
          maxDrift = Math.max(maxDrift, rel.distanceTo(ref[key].rel));
          maxTravel = Math.max(maxTravel, wp.distanceTo(ref[key].wp));
        });
      }
    }
    check('Los accesorios siguen a sus huesos en las 5 animaciones', maxDrift < 1e-4 && maxTravel > ch.height * 0.005, 'desvío ' + maxDrift.toExponential(1) + ', recorrido ' + maxTravel.toFixed(3));
    // Personalización: quitar, cambiar color, especie
    const before = ch.mounted.neck.objects[0];
    ch.applyLook(Object.assign({}, all, { accessories: Object.assign({}, all.accessories, { neck: { id: 'panuelo', color: '#7a4fb3' } }) }));
    let col = null; ch.mounted.neck.objects[0].traverse(o => { if (o.isMesh && !col) col = '#' + o.material.color.getHexString(); });
    check('Cambiar el color reemplaza la pieza con el color nuevo', ch.mounted.neck.objects[0] !== before && col === '#7a4fb3', col);
    ch.applyLook({ species: 'versicolor', accessories: {} });
    check('Quitar accesorios los desmonta', Object.keys(ch.mounted).length === 0 && !before.parent);
    const pc = ch.tint ? '#' + ch.tint.patchColor.value.getHexString() : (ch.materials.Patch ? '#' + ch.materials.Patch.color.getHexString() : null);
    check('El plumaje cambia la máscara facial', pc === window.AVCharacter.SPECIES.versicolor.patch && (!ch.tint || ch.tint.tintOn.value.x === 1), pc || 'sin máscara ni material Patch');
    // Retrato idéntico para juego y cómic
    const prevProfile = S.profile;
    S.profile = { created: true, name: 'Prueba', look: { species: 'vittata', accessories: { eyes: { id: 'gafas', color: '#2b2b2b' }, neck: { id: 'panuelo', color: '#d6403a' } } } };
    const p1 = (await portraitCanvasFor(256, false)).toDataURL(), p2 = (await portraitCanvasFor(256, false)).toDataURL();
    check('El retrato del cómic es idéntico en cada render', p1 === p2 && p1.length > 5000, Math.round(p1.length / 1024) + ' KB');
    S.profile = prevProfile;
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  window.AV = { get state() { return S; }, teleport, tick, action, nearest: () => nearest() && nearest().id, selfTest, accessoryTest, save, load, reset, exportComic, portraitCanvasFor: (n, bg) => portraitCanvasFor(n, bg) };
})();
