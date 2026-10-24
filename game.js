/* Amazona Verse · Hito 1 · "La primera reconstrucción" (título provisional)
   Prototipo web 3D con Three.js r128. Vittata usa su render oficial como sprite (sustituto declarado
   hasta convertir Piloto Cotorra.blend). Lógica separada del render para poder probarla con AV.selfTest(). */
(function () {
  'use strict';

  const SAVE_KEY = 'amazonaverse.save';
  const SAVE_VERSION = 1;
  const RIVER_X = 30;
  const WORLD = 70;

  // ---------- Datos del capítulo (externos a la lógica) ----------
  const NEEDS = { madera: 4, piedra: 2, componente: 1 };
  const REFUGE_COST = { madera: 3, piedra: 2 };
  const REPAIR_COST = { madera: 1, componente: 1 };

  const PLACES = {
    spawn: { x: 0, z: 2, r: 6 },
    taller: { x: -9, z: -7, r: 6 },
    A: { x: 20, z: 6, r: 7, half: 4, name: 'Orilla del río',
         info: { Área: '64 m²', Elevación: 'baja, junto al río', Acceso: 'corto, 20 pasos del poblado', Riesgo: 'inundación con lluvias fuertes', Hábitat: 'nidos de ribera cerca' } },
    B: { x: -24, z: 20, r: 7, half: 4, name: 'La loma',
         info: { Área: '64 m²', Elevación: 'alta, sobre la colina', Acceso: 'largo, cuesta arriba', Riesgo: 'bajo', Hábitat: 'bosque seco, sin nidos' } },
  };

  const RESOURCES = [
    { id: 'm1', type: 'madera', x: -3, z: 7 }, { id: 'm2', type: 'madera', x: 6, z: 9 },
    { id: 'm3', type: 'madera', x: -13, z: 2 }, { id: 'm4', type: 'madera', x: 10, z: -9 },
    { id: 'm5', type: 'madera', x: -17, z: -11 },
    { id: 'p1', type: 'piedra', x: 12, z: -2 }, { id: 'p2', type: 'piedra', x: -6, z: 13 },
    { id: 'p3', type: 'piedra', x: 2, z: -13 }, { id: 'p4', type: 'piedra', x: -15, z: 7 },
    { id: 'c1', type: 'componente', x: -11, z: -14 }, { id: 'c2', type: 'componente', x: 9, z: 14 },
  ];

  const STEPS = [
    'Habla con Agilis',
    'Recolecta 4 madera, 2 piedras y 1 pieza',
    'Evalúa los dos terrenos',
    'Elige un terreno y construye el refugio',
    'Observa qué pasa con la lluvia',
    'Repara el taller de Vittata',
    'Recoge la pista de otra región',
  ];

  const LABEL = { madera: 'madera', piedra: 'piedra', componente: 'pieza' };

  // ---------- Terreno ----------
  function rawHeight(x, z) {
    let h = Math.sin(x * 0.06) * 1.2 + Math.cos(z * 0.05) * 1.0 + Math.sin((x + z) * 0.03) * 1.5;
    const dB = Math.hypot(x - PLACES.B.x, z - PLACES.B.z);
    h += 6 * Math.exp(-(dB * dB) / 260);
    const dr = Math.abs(x - RIVER_X);
    if (dr < 9) h -= (9 - dr) * 0.5;
    return h;
  }
  const FLATS = ['spawn', 'taller', 'A', 'B'].map(k => {
    const p = PLACES[k];
    return { x: p.x, z: p.z, r: p.r, base: rawHeight(p.x, p.z) };
  });
  PLACES.A.base = FLATS[2].base;
  PLACES.B.base = FLATS[3].base;
  function height(x, z) {
    let h = rawHeight(x, z);
    for (const f of FLATS) {
      const d = Math.hypot(x - f.x, z - f.z);
      const t = Math.min(1, Math.max(0, (f.r + 4 - d) / 4));
      const s = t * t * (3 - 2 * t);
      h = h + (f.base - h) * s;
    }
    return h;
  }
  const WATER_BASE = rawHeight(RIVER_X, 0) + 1.2;
  const FLOOD_LEVEL = PLACES.A.base + 1.1;

  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }

  // ---------- Estado ----------
  function freshState() {
    return {
      v: SAVE_VERSION,
      pos: { x: PLACES.spawn.x, z: PLACES.spawn.z, y: 0 }, vy: 0, facing: { x: 0, z: -1 },
      step: 0, inv: { madera: 0, piedra: 0, componente: 0 },
      collected: [], evaluated: { A: false, B: false },
      refuge: null, tallerRepaired: false, fragment: false, complete: false,
      water: WATER_BASE, event: null,
      indicators: { seguridad: '—', acceso: '—', habitat: '—' },
    };
  }
  let S = freshState();
  let build = null;          // { parcel, gx, gz, valid, reason }
  let dialogQueue = [], dialogDone = null;
  let cardOpen = false;

  // ---------- Three.js ----------
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#bfe1d6');
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 45, 110);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight('#fff4dc', '#2f5a3a', 0.95));
  const sun = new THREE.DirectionalLight('#ffe2b0', 0.75);
  sun.position.set(-30, 50, 20);
  scene.add(sun);

  // Terreno con color por altura
  const tGeo = new THREE.PlaneGeometry(WORLD * 2 + 20, WORLD * 2 + 20, 110, 110);
  tGeo.rotateX(-Math.PI / 2);
  const tp = tGeo.attributes.position;
  const colors = [];
  const cSand = new THREE.Color('#d8c48c'), cGrass = new THREE.Color('#4f9a4c'), cHigh = new THREE.Color('#7eb35a'), cMud = new THREE.Color('#6b5a3a');
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = height(x, z);
    tp.setY(i, y);
    const c = y < WATER_BASE + 0.4 ? (y < WATER_BASE - 0.5 ? cMud : cSand) : cGrass.clone().lerp(cHigh, Math.min(1, Math.max(0, (y - 1) / 6)));
    colors.push(c.r, c.g, c.b);
  }
  tGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  tGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(tGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));

  // Agua solo en la franja del río (x de 12 a 44) para que la crecida afecte la orilla
  const water = new THREE.Mesh(new THREE.PlaneGeometry(32, WORLD * 2 + 20), new THREE.MeshLambertMaterial({ color: '#3d8fb0', transparent: true, opacity: 0.82 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(28, WATER_BASE, 0);
  scene.add(water);

  // Árboles con InstancedMesh
  const colliders = [];
  const R = rng(7);
  const treeSpots = [];
  for (let tries = 0; treeSpots.length < 110 && tries < 4000; tries++) {
    const x = (R() * 2 - 1) * WORLD, z = (R() * 2 - 1) * WORLD;
    if (Math.abs(x - RIVER_X) < 7) continue;
    if (FLATS.some(f => Math.hypot(x - f.x, z - f.z) < f.r + 3)) continue;
    if (RESOURCES.some(r => Math.hypot(x - r.x, z - r.z) < 3)) continue;
    if (Math.hypot(x - 4, z + 2) < 4) continue;
    treeSpots.push({ x, z, s: 0.8 + R() * 0.7 });
  }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), new THREE.MeshLambertMaterial({ color: '#7a5634' }), treeSpots.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 0), new THREE.MeshLambertMaterial({ color: '#2f7d43', flatShading: true }), treeSpots.length);
  const m4 = new THREE.Matrix4();
  treeSpots.forEach((t, i) => {
    const y = height(t.x, t.z);
    m4.makeScale(t.s, t.s, t.s).setPosition(t.x, y + 1.5 * t.s, t.z); trunks.setMatrixAt(i, m4);
    m4.makeScale(t.s * 1.2, t.s, t.s * 1.2).setPosition(t.x, y + 3.4 * t.s, t.z); crowns.setMatrixAt(i, m4);
    colliders.push({ x: t.x, z: t.z, r: 0.6 * t.s, kind: 'tree' });
  });
  scene.add(trunks, crowns);

  // Estacas de los terrenos
  function parcelMarker(p, color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color });
    const h = p.half;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.2), mat);
      post.position.set(p.x + sx * h, p.base + 0.55, p.z + sz * h);
      g.add(post);
    }
    const lineMat = new THREE.LineBasicMaterial({ color });
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sz]) => new THREE.Vector3(p.x + sx * h, p.base + 0.9, p.z + sz * h));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
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

  // Taller de Vittata (dañado o reparado)
  const taller = new THREE.Group();
  const T = PLACES.taller, tY = FLATS[1].base;
  const wood = new THREE.MeshLambertMaterial({ color: '#a8743f' });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4), wood);
  walls.position.y = 1.3;
  const roofMat = new THREE.MeshLambertMaterial({ color: '#7c3b2a', side: THREE.DoubleSide });
  const roofL = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3), roofMat);
  const roofR = roofL.clone();
  roofL.position.set(0, 3.3, -1); roofL.rotation.set(-Math.PI / 2 + 0.55, 0, 0);
  roofR.position.set(0, 3.3, 1); roofR.rotation.set(-Math.PI / 2 - 0.55, 0, 0);
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
  colliders.push({ x: T.x, z: T.z, r: 2.6, kind: 'taller' });
  function applyTallerLook() {
    if (S.tallerRepaired) {
      roofR.visible = true; roofR.rotation.set(-Math.PI / 2 - 0.55, 0, 0); roofR.position.set(0, 3.3, 1);
      debris.visible = false; windowGlow.material.color.set('#ffd27a');
    } else {
      roofR.visible = true; roofR.rotation.set(-0.3, 0.2, 0.9); roofR.position.set(2.6, 0.6, 1.8);
      debris.visible = true; windowGlow.material.color.set('#3a2a1a');
    }
  }

  // Refugio (modelo simple de casita) y su fantasma para colocar
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
  const resMat = { madera: new THREE.MeshLambertMaterial({ color: '#8a5a2b' }), piedra: new THREE.MeshLambertMaterial({ color: '#9aa0a3', flatShading: true }), componente: new THREE.MeshLambertMaterial({ color: '#c9d4d9', emissive: '#1d3a46' }) };
  for (const r of RESOURCES) {
    let m;
    if (r.type === 'madera') { m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 7), resMat.madera); m.rotation.z = Math.PI / 2; m.position.y = 0.3; }
    else if (r.type === 'piedra') { m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), resMat.piedra); m.position.y = 0.35; }
    else { m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 6, 10), resMat.componente); m.position.y = 0.7; }
    const g = new THREE.Group(); g.add(m);
    g.position.set(r.x, height(r.x, r.z), r.z);
    scene.add(g); resMeshes[r.id] = g;
  }

  // Pista de otra región (fragmento de mapa brillante)
  const fragment = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), new THREE.MeshLambertMaterial({ color: '#ffd27a', emissive: '#a8641b' }));
  const FRAG = { x: T.x + 3.5, z: T.z + 3.5 };
  fragment.position.set(FRAG.x, height(FRAG.x, FRAG.z) + 1.2, FRAG.z);
  fragment.visible = false; scene.add(fragment);

  // Sprites: Vittata y Agilis (renders oficiales con transparencia)
  const loader = new THREE.TextureLoader();
  function spriteFrom(url, scale) {
    const tex = loader.load(url);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.05 }));
    sp.scale.set(scale, scale, 1);
    return sp;
  }
  function blob(radius) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  const player = spriteFrom('assets/vittata.png', 2.4); scene.add(player);
  const pShadow = blob(0.6); scene.add(pShadow);
  const NPC = { x: 4, z: -2 };
  const npc = spriteFrom('assets/agilis.png', 2.2); npc.position.set(NPC.x, height(NPC.x, NPC.z) + 1.0, NPC.z); scene.add(npc);
  const nShadow = blob(0.55); nShadow.position.set(NPC.x, height(NPC.x, NPC.z) + 0.03, NPC.z); scene.add(nShadow);
  colliders.push({ x: NPC.x, z: NPC.z, r: 0.6, kind: 'npc' });

  // Lluvia
  const rainGeo = new THREE.BufferGeometry();
  const RAIN_N = 900, rainPos = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 60; rainPos[i * 3 + 1] = Math.random() * 25; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#cfe6f0', size: 0.15, transparent: true, opacity: 0.7 }));
  rain.visible = false; scene.add(rain);

  // ---------- Interactuables ----------
  const interactables = [];
  interactables.push({ id: 'npc', x: NPC.x, z: NPC.z, r: 2.4, label: () => 'Hablar con Agilis', use: talkAgilis });
  for (const r of RESOURCES) {
    interactables.push({ id: r.id, x: r.x, z: r.z, r: 1.8, visible: () => !S.collected.includes(r.id),
      label: () => 'Recoger ' + LABEL[r.type], use: () => collect(r) });
  }
  for (const k of ['A', 'B']) {
    const p = PLACES[k];
    interactables.push({ id: 'post' + k, x: p.post.x, z: p.post.z, r: 2.2, label: () => 'Evaluar terreno: ' + p.name, use: () => openParcelCard(k) });
  }
  interactables.push({ id: 'taller', x: T.x, z: T.z + 2.6, r: 2.6, visible: () => !S.tallerRepaired,
    label: () => (S.step === 5 ? 'Reparar el taller' : 'Ver el taller dañado'), use: useTaller });
  interactables.push({ id: 'fragment', x: FRAG.x, z: FRAG.z, r: 2, visible: () => S.tallerRepaired && !S.fragment,
    label: () => 'Recoger la pista', use: takeFragment });

  function nearest() {
    let best = null, bd = Infinity;
    for (const it of interactables) {
      if (it.visible && !it.visible()) continue;
      const d = Math.hypot(S.pos.x - it.x, S.pos.z - it.z);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    return best;
  }

  // ---------- Acciones de juego ----------
  function has(cost) { return Object.keys(cost).every(k => S.inv[k] >= cost[k]); }
  function pay(cost) { for (const k in cost) S.inv[k] -= cost[k]; }
  function missingText(cost) {
    return Object.keys(cost).filter(k => S.inv[k] < cost[k]).map(k => (cost[k] - S.inv[k]) + ' ' + LABEL[k] + (cost[k] - S.inv[k] > 1 ? 's' : '')).join(', ');
  }

  function talkAgilis() {
    const V = 'assets/vittata.png', A = 'assets/agilis.png';
    if (S.step === 0) {
      say([
        { who: 'Agilis', img: A, text: '¡Vittata! La tormenta de anoche tumbó tu taller y medio poblado se quedó sin techo.' },
        { who: 'Vittata', img: V, text: 'Yo lo arreglo todo. Dame una hora y… bueno, quizás dos.' },
        { who: 'Agilis', img: A, text: 'Primero un refugio para la familia del río. Necesitamos madera, piedras y alguna pieza útil.' },
        { who: 'Agilis', img: A, text: 'Hay dos terrenos posibles. Míralos bien antes de construir.' },
      ], () => advanceTo(1));
    } else if (S.step < 3) {
      say([{ who: 'Agilis', img: A, text: 'Recoge lo que haga falta y evalúa los dos terrenos. Las estacas naranja están en la orilla; las rojas, en la loma.' }]);
    } else if (S.step === 3) {
      say([{ who: 'Agilis', img: A, text: 'Ya los viste. ¿Cuál eliges? Ve al letrero del terreno y construye allí.' }]);
    } else {
      say([{ who: 'Agilis', img: A, text: S.step >= 6 ? 'Esa pista brilla como las de las islas del sur. ¿La viste?' : 'Tu taller sigue roto. Con una pieza y un poco de madera lo levantas.' }]);
    }
  }

  function collect(r) {
    S.collected.push(r.id);
    S.inv[r.type]++;
    if (resMeshes[r.id]) resMeshes[r.id].visible = false;
    toast('+1 ' + LABEL[r.type]);
    checkProgress();
  }

  function openParcelCard(k) {
    const p = PLACES[k];
    S.evaluated[k] = true;
    checkProgress();
    const canBuild = S.step === 3 && !S.refuge;
    const rows = Object.entries(p.info).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
    const buildBtn = canBuild ? `<button class="btn" id="c-build" type="button">Construir refugio aquí (${REFUGE_COST.madera} madera, ${REFUGE_COST.piedra} piedras)</button>` : '';
    const note = S.step < 3 ? '<p style="margin:0 0 10px;font-size:13px;color:var(--muted)">Evalúa ambos terrenos y junta los materiales para poder construir.</p>' : '';
    showCard(`<h2>${p.name}</h2><dl>${rows}</dl>${note}<div class="row">${buildBtn}<button class="btn ghost" id="c-close" type="button">Cerrar</button></div>`);
    const b = document.getElementById('c-build');
    if (b) b.onclick = () => { if (!has(REFUGE_COST)) { toast('Te falta ' + missingText(REFUGE_COST)); return; } hideCard(); startBuild(k); };
    document.getElementById('c-close').onclick = hideCard;
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
    else if (colliders.some(c => c.kind !== 'refuge' && Math.hypot(gx - c.x, gz - c.z) < c.r + 1.3)) reason = 'Choca con algo';
    else if (Math.hypot(gx - S.pos.x, gz - S.pos.z) < 1.5) reason = 'Muy cerca de Vittata';
    build.valid = !reason; build.reason = reason;
    ghost.position.set(gx, height(gx, gz), gz);
    const col = build.valid ? '#7fd38f' : '#d6403a';
    ghost.children.forEach(m => m.material.color.set(col));
  }

  function placeRefuge() {
    if (!build || !build.valid) { toast(build ? build.reason : 'No hay nada que colocar'); return false; }
    if (!has(REFUGE_COST)) { toast('Te falta ' + missingText(REFUGE_COST)); return false; }
    pay(REFUGE_COST);
    S.refuge = { parcel: build.parcel, x: build.gx, z: build.gz, damaged: false };
    build = null; ghost.visible = false; hideToast();
    placeRefugeMesh();
    toast('Refugio construido en ' + PLACES[S.refuge.parcel].name);
    advanceTo(4);
    S.event = { t: 0, dur: 8, applied: false };
    return true;
  }

  function finishRainEvent() {
    const A = 'assets/agilis.png', V = 'assets/vittata.png';
    if (S.refuge.parcel === 'A') {
      S.refuge.damaged = true;
      S.indicators = { seguridad: 'baja', acceso: 'corto', habitat: 'nidos de ribera alterados' };
      placeRefugeMesh();
      say([
        { who: 'Agilis', img: A, text: 'El río subió y el refugio se inundó. La orilla era cómoda… y peligrosa.' },
        { who: 'Vittata', img: V, text: 'Quise resolverlo rápido y no escuché lo del riesgo. La próxima vez lo pienso con todos.' },
      ], () => advanceTo(5));
    } else {
      S.indicators = { seguridad: 'alta', acceso: 'largo, cuesta arriba', habitat: 'nidos de ribera intactos' };
      say([
        { who: 'Agilis', img: A, text: 'La loma aguantó la crecida. La familia está a salvo, aunque subir agua y comida cuesta más.' },
        { who: 'Vittata', img: V, text: 'Más lejos, pero seguro. Habrá que hacer un camino mejor.' },
      ], () => advanceTo(5));
    }
  }

  function useTaller() {
    const V = 'assets/vittata.png';
    if (S.step !== 5) { say([{ who: 'Vittata', img: V, text: 'Mi taller… Primero el refugio de la familia. Después vuelvo por ti.' }]); return; }
    if (!has(REPAIR_COST)) { toast('Para reparar te falta ' + missingText(REPAIR_COST)); return; }
    pay(REPAIR_COST);
    S.tallerRepaired = true;
    applyTallerLook();
    fragment.visible = true;
    advanceTo(6);
    say([{ who: 'Vittata', img: V, text: '¡Listo! Y mira… entre los escombros brilla algo. Parece un pedazo de mapa.' }]);
  }

  function takeFragment() {
    S.fragment = true; fragment.visible = false;
    S.complete = true;
    advanceTo(7);
    const choice = S.refuge && S.refuge.parcel === 'A'
      ? 'Elegiste la orilla del río: rápido y cerca, pero la crecida dañó el refugio.'
      : 'Elegiste la loma: el refugio aguantó la crecida, aunque el camino es largo.';
    document.getElementById('end-text').textContent = choice + ' El fragmento de mapa señala una región al otro lado del mar. Continuará en el próximo hito.';
    document.getElementById('end').hidden = false;
  }

  function checkProgress() {
    let changed = true;
    while (changed) {
      changed = false;
      if (S.step === 1 && has(NEEDS)) { S.step = 2; changed = true; }
      else if (S.step === 2 && S.evaluated.A && S.evaluated.B) { S.step = 3; changed = true; }
    }
    renderQuest(); renderInv(); autosave();
  }
  function advanceTo(n) { if (n > S.step) S.step = n; checkProgress(); }

  // ---------- Diálogo, tarjetas y avisos ----------
  const $ = id => document.getElementById(id);
  function say(lines, done) { dialogQueue = lines.slice(); dialogDone = done || null; showNextLine(); }
  function showNextLine() {
    const l = dialogQueue.shift();
    if (!l) { $('dialog').hidden = true; const d = dialogDone; dialogDone = null; if (d) d(); return; }
    $('d-who').textContent = l.who; $('d-text').textContent = l.text; $('d-img').src = l.img; $('d-img').alt = l.who;
    $('dialog').hidden = false;
  }
  $('d-next').onclick = showNextLine;
  function dialogOpen() { return !$('dialog').hidden; }
  function showCard(html) { $('card').innerHTML = html; $('card').hidden = false; cardOpen = true; }
  function hideCard() { $('card').hidden = true; cardOpen = false; }
  let toastTimer = 0;
  function toast(text, ms) { $('toast').textContent = text; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function toastHTML(html, ms) { $('toast').innerHTML = html; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function hideToast() { $('toast').hidden = true; toastTimer = 0; }

  function renderQuest() {
    $('steps').innerHTML = STEPS.map((s, i) => {
      let label = s;
      if (i === 1) {
        const got = type => Math.min(NEEDS[type], S.collected.filter(id => RESOURCES.find(r => r.id === id).type === type).length);
        label += ` (${got('madera')}/4 · ${got('piedra')}/2 · ${got('componente')}/1)`;
      }
      if (i === 2) label += ` (${(S.evaluated.A ? 1 : 0) + (S.evaluated.B ? 1 : 0)}/2)`;
      const cls = i < S.step ? 'done' : i === S.step ? 'now' : 'later';
      return `<li class="${cls}">${label}</li>`;
    }).join('');
    const I = S.indicators;
    $('indicators').innerHTML = S.refuge ? `Seguridad del refugio: <b>${I.seguridad}</b> · Acceso: <b>${I.acceso}</b> · Hábitat: <b>${I.habitat}</b>` : '';
  }
  function renderInv() { $('i-madera').textContent = S.inv.madera; $('i-piedra').textContent = S.inv.piedra; $('i-componente').textContent = S.inv.componente; }

  // ---------- Guardado versionado ----------
  function serialize() {
    return JSON.stringify({ v: SAVE_VERSION, pos: S.pos, facing: S.facing, step: S.step, inv: S.inv, collected: S.collected, evaluated: S.evaluated,
      refuge: S.refuge, tallerRepaired: S.tallerRepaired, fragment: S.fragment, complete: S.complete, indicators: S.indicators });
  }
  function save(silent) {
    try { localStorage.setItem(SAVE_KEY, serialize()); if (!silent) toast('Partida guardada'); return true; }
    catch (e) { if (!silent) toast('No se pudo guardar en este navegador'); return false; }
  }
  let saveDebounce = 0;
  function autosave() { saveDebounce = 0.5; }
  function validSave(d) {
    return d && d.v === SAVE_VERSION && d.pos && typeof d.pos.x === 'number' && typeof d.step === 'number' && d.inv && Array.isArray(d.collected) && d.evaluated;
  }
  function load(silent) {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (!raw) { if (!silent) toast('No hay partida guardada'); return false; }
    let d;
    try { d = JSON.parse(raw); } catch (e) { d = null; }
    if (!validSave(d)) { if (!silent) toast('La partida guardada está dañada o es de otra versión; empiezas de nuevo'); return false; }
    S = Object.assign(freshState(), d, { event: null, water: WATER_BASE, vy: 0 });
    applyWorld();
    if (!silent) toast('Partida cargada');
    return true;
  }
  function applyWorld() {
    for (const r of RESOURCES) resMeshes[r.id].visible = !S.collected.includes(r.id);
    placeRefugeMesh();
    applyTallerLook();
    fragment.visible = S.tallerRepaired && !S.fragment;
    water.position.y = S.water;
    rain.visible = false;
    build = null; ghost.visible = false;
    hideCard(); $('dialog').hidden = true; dialogQueue = [];
    $('end').hidden = !S.complete;
    if (S.complete) document.getElementById('end-text').textContent = 'Partida terminada. Puedes jugar de nuevo.';
    renderQuest(); renderInv();
  }
  function reset() {
    S = freshState();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
    applyWorld();
  }

  // ---------- Entrada ----------
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  let jumpHeld = false, camYaw = 0.35;
  addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    keys.add(e.key.toLowerCase());
    if (e.key === ' ') { jumpHeld = true; e.preventDefault(); }
    if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') action();
    if (e.key === 'Escape') { if (build) cancelBuild(); hideCard(); }
  });
  addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (e.key === ' ') jumpHeld = false; });

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
    if (!$('end').hidden) return;
    if (dialogOpen()) { showNextLine(); return; }
    if (cardOpen) { hideCard(); return; }
    if (build) { placeRefuge(); return; }
    const it = nearest();
    if (it) it.use();
  }

  function tryJump() {
    const g = height(S.pos.x, S.pos.z);
    if (S.pos.y <= g + 0.01) S.vy = 7.5;
  }
  addEventListener('keydown', e => { if (e.key === ' ') tryJump(); });

  // ---------- Simulación ----------
  const SPEED = 6.5;
  function update(dt) {
    // Movimiento relativo a la cámara
    let ix = 0, iz = 0;
    if (keys.has('w') || keys.has('arrowup')) iz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('q')) camYaw += 1.8 * dt;
    if (keys.has('r')) camYaw -= 1.8 * dt;
    ix += stick.x; iz += stick.y;
    const busy = dialogOpen() || cardOpen || !$('end').hidden;
    const len = Math.hypot(ix, iz);
    let moving = false;
    if (len > 0.12 && !busy) {
      ix /= Math.max(1, len); iz /= Math.max(1, len);
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const mx = rx * ix - fx * iz, mz = rz * ix - fz * iz;
      const ml = Math.hypot(mx, mz);
      S.pos.x += mx * SPEED * dt; S.pos.z += mz * SPEED * dt;
      if (ml > 0.01) { S.facing = { x: mx / ml, z: mz / ml }; }
      player.material.map.repeat.x = ix < -0.1 ? -1 : ix > 0.1 ? 1 : player.material.map.repeat.x;
      player.material.map.offset.x = player.material.map.repeat.x < 0 ? 1 : 0;
      moving = true;
    }
    // Colisiones y límites
    for (const c of colliders) {
      const dx = S.pos.x - c.x, dz = S.pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + 0.55;
      if (d < min && d > 1e-4) { S.pos.x = c.x + dx / d * min; S.pos.z = c.z + dz / d * min; }
    }
    S.pos.x = Math.max(-WORLD, Math.min(WORLD, S.pos.x));
    S.pos.z = Math.max(-WORLD, Math.min(WORLD, S.pos.z));
    // Salto y planeo
    const ground = height(S.pos.x, S.pos.z);
    const gliding = jumpHeld && S.vy < 0;
    S.vy -= (gliding ? 6 : 22) * dt;
    if (gliding) S.vy = Math.max(S.vy, -2.2);
    S.pos.y = Math.max(ground, (S.pos.y || ground) + S.vy * dt);
    if (S.pos.y <= ground) { S.pos.y = ground; S.vy = 0; }

    // Evento de lluvia y crecida
    if (S.event) {
      const e = S.event; e.t += dt;
      const k = Math.min(1, e.t / (e.dur * 0.6));
      const fall = e.t > e.dur * 0.8 ? Math.min(1, (e.t - e.dur * 0.8) / (e.dur * 0.2)) : 0;
      S.water = WATER_BASE + (FLOOD_LEVEL - WATER_BASE) * k * (1 - fall * 0.85);
      water.position.y = S.water;
      rain.visible = true;
      if (e.t >= e.dur && !e.applied) { e.applied = true; S.event = null; rain.visible = false; finishRainEvent(); }
    }

    updateGhost();
    if (saveDebounce > 0) { saveDebounce -= dt; if (saveDebounce <= 0) save(true); }
    if (toastTimer !== Infinity && toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) hideToast(); }

    // Aviso de interacción
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
  function render(dt, moving) {
    t += dt;
    const bob = moving && S.pos.y <= height(S.pos.x, S.pos.z) + 0.01 ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
    player.position.set(S.pos.x, S.pos.y + 1.05 + bob, S.pos.z);
    player.material.rotation = jumpHeld && S.vy < 0 ? Math.sin(t * 6) * 0.08 : 0;
    pShadow.position.set(S.pos.x, height(S.pos.x, S.pos.z) + 0.03, S.pos.z);
    npc.position.y = height(NPC.x, NPC.z) + 1.0 + Math.sin(t * 2) * 0.05;
    for (const r of RESOURCES) if (resMeshes[r.id].visible) resMeshes[r.id].rotation.y += dt * 0.6;
    if (fragment.visible) { fragment.rotation.y += dt * 1.5; fragment.position.y = height(FRAG.x, FRAG.z) + 1.2 + Math.sin(t * 3) * 0.15; }
    if (rain.visible) {
      const a = rain.geometry.attributes.position;
      for (let i = 0; i < RAIN_N; i++) {
        let y = a.getY(i) - 28 * dt; if (y < 0) y += 25;
        a.setY(i, y);
      }
      a.needsUpdate = true;
      rain.position.set(S.pos.x, height(S.pos.x, S.pos.z), S.pos.z);
    }
    const target = new THREE.Vector3(S.pos.x, S.pos.y + 1.2, S.pos.z);
    camPos.set(S.pos.x + Math.sin(camYaw) * 10, S.pos.y + 5.5, S.pos.z + Math.cos(camYaw) * 10);
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    camera.lookAt(target);
    renderer.render(scene, camera);
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const moving = update(dt);
    render(dt, moving);
    requestAnimationFrame(frame);
  }

  // ---------- Inicio ----------
  S.pos.y = height(S.pos.x, S.pos.z);
  camera.position.set(S.pos.x + Math.sin(camYaw) * 10, S.pos.y + 5.5, S.pos.z + Math.cos(camYaw) * 10);
  if (!load(true)) applyWorld();
  applyTallerLook();
  if (S.step === 0 && !S.collected.length) setTimeout(() => toast('Acércate a Agilis y pulsa Acción', 4000), 600);
  requestAnimationFrame(frame);

  // ---------- API de prueba (solo diagnóstico) ----------
  function teleport(x, z, fx, fz) { S.pos.x = x; S.pos.z = z; S.pos.y = height(x, z); S.vy = 0; if (fx !== undefined) S.facing = { x: fx, z: fz }; }
  function tick(seconds) { const n = Math.ceil(seconds / 0.05); for (let i = 0; i < n; i++) update(0.05); }
  function drainDialogs() { let n = 0; while (dialogOpen() && n++ < 20) showNextLine(); }
  function selfTest() {
    const out = [];
    const check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra || '' });
    reset();
    teleport(NPC.x, NPC.z + 1.5); tick(0.1);
    check('Interactuable cercano es Agilis', nearest() && nearest().id === 'npc');
    action(); check('Se abre el diálogo', dialogOpen()); drainDialogs();
    check('Misión avanza a recolectar', S.step === 1, 'paso ' + S.step);
    const before = { ...S.inv };
    for (const id of ['m1', 'm2', 'm3', 'm4', 'p1', 'p2', 'c1']) {
      const r = RESOURCES.find(q => q.id === id); teleport(r.x + 0.8, r.z); tick(0.1);
      const it = nearest(); if (it && it.id === id) action();
    }
    check('Inventario sumó 4 madera, 2 piedras, 1 pieza', S.inv.madera === before.madera + 4 && S.inv.piedra === 2 && S.inv.componente === 1, JSON.stringify(S.inv));
    check('Misión avanza a evaluar terrenos', S.step === 2, 'paso ' + S.step);
    for (const k of ['A', 'B']) { teleport(PLACES[k].post.x + 1, PLACES[k].post.z + 1); tick(0.1); action(); hideCard(); }
    check('Ambos terrenos evaluados y misión en construir', S.evaluated.A && S.evaluated.B && S.step === 3, 'paso ' + S.step);
    startBuild('A'); teleport(PLACES.A.x + 50, PLACES.A.z, 0, 1); tick(0.1);
    check('Colocación fuera del terreno se rechaza', build && !build.valid, build && build.reason);
    teleport(PLACES.A.x, PLACES.A.z - 1.5, 0, 1); tick(0.1);
    check('Colocación dentro del terreno es válida', build && build.valid, build && build.reason);
    const invBefore = { ...S.inv };
    action();
    check('Refugio colocado y materiales consumidos', S.refuge && S.inv.madera === invBefore.madera - 3 && S.inv.piedra === invBefore.piedra - 2, JSON.stringify(S.inv));
    check('Colisión del refugio existe', colliders.some(c => c.kind === 'refuge'));
    tick(0.1); check('Empieza la lluvia', S.event && rain.visible);
    tick(4.5); check('El agua sube en la orilla', S.water > WATER_BASE + 0.5, S.water.toFixed(2) + ' > ' + WATER_BASE.toFixed(2));
    tick(5); drainDialogs();
    check('Consecuencia visible: refugio de la orilla dañado', S.refuge.damaged === true && refugeMesh && refugeMesh.rotation.z > 0.1);
    check('Indicadores cambian', S.indicators.seguridad === 'baja', JSON.stringify(S.indicators));
    check('Misión avanza a reparar', S.step === 5, 'paso ' + S.step);
    teleport(T.x, T.z + 3.4); tick(0.1); action(); drainDialogs();
    check('Taller reparado', S.tallerRepaired && debris.visible === false);
    check('Aparece la pista', fragment.visible);
    teleport(FRAG.x + 0.8, FRAG.z); tick(0.1); action();
    check('Capítulo completado', S.complete && S.step === 7 && !$('end').hidden);
    const saved = save(true);
    check('Guardar funciona', saved);
    const snap = serialize();
    reset(); check('Reiniciar limpia la partida', S.step === 0 && !S.refuge);
    try { localStorage.setItem(SAVE_KEY, snap); } catch (e) { /* sin almacenamiento */ }
    check('Cargar restaura el progreso', load(true) && S.step === 7 && S.refuge && S.refuge.damaged && S.tallerRepaired);
    try { localStorage.setItem(SAVE_KEY, '{roto'); } catch (e) { /* sin almacenamiento */ }
    check('Partida dañada se rechaza sin romper el juego', load(true) === false);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 0, step: 3 })); } catch (e) { /* sin almacenamiento */ }
    check('Partida de otra versión se rechaza', load(true) === false);
    // Ruta alternativa: la loma
    reset(); S.step = 3; S.evaluated = { A: true, B: true }; S.inv = { madera: 4, piedra: 2, componente: 1 };
    startBuild('B'); teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); tick(10); drainDialogs();
    check('Ruta loma: refugio intacto y seguridad alta', S.refuge && S.refuge.parcel === 'B' && !S.refuge.damaged && S.indicators.seguridad === 'alta', JSON.stringify(S.indicators));
    reset();
    const passed = out.filter(o => o.ok).length;
    return { passed, total: out.length, results: out };
  }
  window.AV = { get state() { return S; }, teleport, tick, action, nearest: () => nearest() && nearest().id, selfTest, save, load, reset };
})();
