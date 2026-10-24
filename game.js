/* Amazona Verse · Capítulo 1 "El día que el cielo se rompió" (guion de Kelvin García, v1.0)
   Prototipo web 3D con Three.js r128. Vittata, Luma y el Guardián usan renders oficiales como sprites
   (sustitutos declarados). La lógica está separada del render para probarla con AV.selfTest(). */
(function () {
  'use strict';

  const SAVE_KEY = 'amazonaverse.save';
  const SAVE_VERSION = 2;
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
    return h;
  }
  const FLATS = ['villa', 'taller', 'A', 'B'].map(k => ({ k, x: PLACES[k].x, z: PLACES[k].z, r: PLACES[k].r, base: rawHeight(PLACES[k].x, PLACES[k].z) }));
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
    };
  }
  let S = freshState();
  let build = null;
  let dialogQueue = [], dialogDone = null;
  let cardOpen = false;

  function logEvent(type, data) { S.events.push({ type, t: Math.round(S.clock * 10) / 10, data: data || {} }); }
  function hadEvent(type) { return S.events.some(e => e.type === type); }

  // ---------- Three.js ----------
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
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

  const tGeo = new THREE.PlaneGeometry(WORLD * 2 + 20, WORLD * 2 + 20, 110, 110);
  tGeo.rotateX(-Math.PI / 2);
  const tp = tGeo.attributes.position, colors = [];
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

  const water = new THREE.Mesh(new THREE.PlaneGeometry(32, WORLD * 2 + 20), new THREE.MeshLambertMaterial({ color: '#3d8fb0', transparent: true, opacity: 0.82 }));
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
    treeSpots.push({ x, z, s: 0.8 + R() * 0.7 });
  }
  // Árboles con marcas de agua junto al río (señal de riesgo del terreno A)
  const markTrees = [{ x: 16.5, z: 11.5, s: 1.1 }, { x: 24.5, z: 1.2, s: 1 }];
  const allTrees = treeSpots.concat(markTrees);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), new THREE.MeshLambertMaterial({ color: '#7a5634' }), allTrees.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 0), new THREE.MeshLambertMaterial({ color: '#2f7d43', flatShading: true }), allTrees.length);
  const m4 = new THREE.Matrix4();
  allTrees.forEach((t, i) => {
    const y = height(t.x, t.z);
    m4.makeScale(t.s, t.s, t.s).setPosition(t.x, y + 1.5 * t.s, t.z); trunks.setMatrixAt(i, m4);
    m4.makeScale(t.s * 1.2, t.s, t.s * 1.2).setPosition(t.x, y + 3.4 * t.s, t.z); crowns.setMatrixAt(i, m4);
    colliders.push({ x: t.x, z: t.z, r: 0.6 * t.s, kind: 'tree' });
  });
  scene.add(trunks, crowns);
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
  colliders.push({ x: T.x, z: T.z, r: 2.6, kind: 'taller' });

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
      S.boatPlan = true;
      logEvent('BoatBlueprintUnlocked');
      capture('final');
      showSymbol(false);
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
  }
  $('d-next').onclick = showNextLine;
  function dialogOpen() { return !$('dialog').hidden; }
  function showCard(html) { $('card').innerHTML = html; $('card').hidden = false; cardOpen = true; }
  function hideCard() { $('card').hidden = true; cardOpen = false; }
  let toastTimer = 0;
  function toast(text, ms) { $('toast').textContent = text; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function toastHTML(html, ms) { $('toast').innerHTML = html; $('toast').hidden = false; toastTimer = ms === 0 ? Infinity : (ms || 2200) / 1000; }
  function hideToast() { $('toast').hidden = true; toastTimer = 0; }
  function overlayOpen() { return !$('end').hidden || !$('comic').hidden; }

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

  function comicStory() {
    const builds = S.builds;
    let decision;
    if (builds[0] === 'B') decision = 'Elegí construir en la colina porque descubrí que el río podía inundar el otro terreno.';
    else if (builds.includes('A') && S.refuge && S.refuge.parcel === 'B') decision = 'Mi primera idea no era segura. Aprendí a observar mejor el terreno y encontré una solución.';
    else decision = 'Construí junto al río y la crecida dañó el refugio. Aprendí que construir rápido no siempre es construir bien.';
    return [
      { img: 'portrait', text: 'Soy Vittata, inventora de Villa Raíz.' },
      { img: 'workshop', text: 'La Gran Ruptura dañó mi taller, pero entre los restos vi posibilidades.' },
      { img: 'shelter', text: decision },
      { img: 'final', text: 'Ayudé a la familia de Luma y el transmisor me mostró un símbolo de 36 fragmentos.' },
    ];
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
  function wrap(ctx, text, x, y, maxW, lh, maxLines) {
    const words = text.split(' '); let line = '', lines = 0;
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); y += lh; line = w; if (++lines >= maxLines - 1) { /* última línea */ } }
      else line = t;
    }
    if (line) ctx.fillText(line, x, y);
  }
  async function renderComic(target, opts) {
    const W = 1080, H = 1520;
    target.width = W; target.height = H;
    const x = target.getContext('2d');
    try { await document.fonts.load('700 40px Fredoka'); await document.fonts.load('400 24px "Atkinson Hyperlegible"'); } catch (e) { /* fuente de respaldo */ }
    const panels = comicStory();
    if (opts.phrase) panels[3].text = opts.phrase;
    const vit = await loadImg(IMG.V);
    const src = { workshop: S.captures.workshop, shelter: S.captures.shelter, final: S.captures.final };
    const imgs = { workshop: await loadImg(src.workshop), shelter: await loadImg(src.shelter), final: await loadImg(src.final) };
    x.fillStyle = '#10241c'; x.fillRect(0, 0, W, H);
    // Portada
    const coverImg = opts.cover === 'vittata' ? null : imgs[opts.cover === 'taller' ? 'workshop' : 'shelter'];
    x.save(); x.beginPath(); x.rect(20, 20, W - 40, 360); x.clip();
    if (coverImg) coverFit(x, coverImg, 20, 20, W - 40, 360);
    else { const g = x.createLinearGradient(0, 20, 0, 380); g.addColorStop(0, '#2f8f4e'); g.addColorStop(1, '#10241c'); x.fillStyle = g; x.fillRect(20, 20, W - 40, 360); if (vit) x.drawImage(vit, W - 400, 10, 380, 380); }
    const shade = x.createLinearGradient(0, 160, 0, 380); shade.addColorStop(0, 'rgba(16,36,28,0)'); shade.addColorStop(1, 'rgba(16,36,28,.92)');
    x.fillStyle = shade; x.fillRect(20, 160, W - 40, 220); x.restore();
    x.fillStyle = '#f2a03d'; x.font = '600 26px Fredoka, sans-serif'; x.textBaseline = 'alphabetic'; x.fillText('AMAZONA VERSE · CAPÍTULO 1', 52, 300);
    x.fillStyle = '#f4f7f1'; x.font = '700 60px Fredoka, sans-serif'; x.fillText((opts.title || 'Mi primera reconstrucción').slice(0, 32), 50, 360);
    // Viñetas 2x2
    const pw = (W - 60) / 2, ph = (H - 400 - 40) / 2;
    for (let i = 0; i < 4; i++) {
      const px = 20 + (i % 2) * (pw + 20), py = 400 + Math.floor(i / 2) * (ph + 20);
      x.fillStyle = '#f4f7f1'; x.fillRect(px, py, pw, ph);
      const ih = ph - 170;
      x.save(); x.beginPath(); x.rect(px + 10, py + 10, pw - 20, ih); x.clip();
      const p = panels[i];
      if (p.img === 'portrait') { const g = x.createRadialGradient(px + pw / 2, py + ih / 2, 20, px + pw / 2, py + ih / 2, pw * 0.7); g.addColorStop(0, '#7fd38f'); g.addColorStop(1, '#2f8f4e'); x.fillStyle = g; x.fillRect(px + 10, py + 10, pw - 20, ih); if (vit) { const s = ih * 0.98; x.drawImage(vit, px + (pw - s) / 2, py + 10 + (ih - s) / 2, s, s); } }
      else if (imgs[p.img]) coverFit(x, imgs[p.img], px + 10, py + 10, pw - 20, ih);
      else { x.fillStyle = '#4f9a4c'; x.fillRect(px + 10, py + 10, pw - 20, ih); }
      if (p.img === 'final') drawSymbol(x, px + pw - 90, py + 90, 70);
      x.restore();
      x.fillStyle = '#10241c'; x.font = '600 22px Fredoka, sans-serif'; x.fillText(String(i + 1), px + 16, py + ih + 42);
      x.font = '400 25px "Atkinson Hyperlegible", sans-serif';
      wrap(x, p.text, px + 44, py + ih + 42, pw - 64, 33, 4);
    }
    x.fillStyle = '#a9c2b1'; x.font = '400 18px "Atkinson Hyperlegible", sans-serif';
    x.fillText('Cómic personal generado a partir de tu partida · ' + S.events.length + ' eventos registrados', 24, H - 8);
    return target;
  }

  function showEnd() {
    const safe = S.refuge && S.refuge.parcel === 'B';
    $('end-text').textContent = (safe ? 'El refugio de la colina protege a la familia de Luma.' : 'El refugio quedó junto al río y la crecida lo dañó.') +
      ' El transmisor reveló el símbolo de los 36 y desbloqueaste el plano de una embarcación. Continuará…';
    $('end').hidden = false;
  }
  async function openComic() {
    $('end').hidden = true; $('comic').hidden = false;
    $('c-export').hidden = true;
    await refreshComic();
  }
  async function refreshComic() {
    await renderComic($('comic-canvas'), { title: $('c-title').value.trim(), phrase: $('c-phrase').value.trim(), cover: $('c-cover').value });
  }
  async function exportComic() {
    await refreshComic();
    const url = $('comic-canvas').toDataURL('image/png');
    $('c-export-img').src = url;
    $('c-download').href = url;
    $('c-export').hidden = false;
    logEvent('ComicExported', { format: 'png', bytes: url.length });
    autosave();
    return url;
  }
  $('b-comic').onclick = openComic;
  $('c-close').onclick = () => { $('comic').hidden = true; if (S.complete) $('end').hidden = false; };
  $('c-refresh').onclick = refreshComic;
  $('c-png').onclick = exportComic;
  for (const id of ['c-title', 'c-phrase', 'c-cover']) $(id).addEventListener('change', refreshComic);

  // ---------- Guardado versionado ----------
  const SAVED_KEYS = ['pos', 'facing', 'step', 'inv', 'examined', 'collected', 'evaluated', 'refuge', 'builds', 'guardianMet', 'benchUnlocked', 'transmitterOn', 'boatPlan', 'complete', 'indicators', 'events', 'captures', 'clock'];
  function serialize() { const o = { v: SAVE_VERSION }; for (const k of SAVED_KEYS) o[k] = S[k]; return JSON.stringify(o); }
  function save(silent) {
    try { localStorage.setItem(SAVE_KEY, serialize()); if (!silent) toast('Partida guardada'); return true; }
    catch (e) {
      try { const o = JSON.parse(serialize()); o.captures = {}; localStorage.setItem(SAVE_KEY, JSON.stringify(o)); if (!silent) toast('Partida guardada (sin imágenes del cómic)'); return true; }
      catch (e2) { if (!silent) toast('No se pudo guardar en este navegador'); return false; }
    }
  }
  let saveDebounce = 0;
  function autosave() { saveDebounce = 0.5; }
  function validSave(d) {
    return d && d.v === SAVE_VERSION && d.pos && typeof d.pos.x === 'number' && typeof d.step === 'number' && d.inv && Array.isArray(d.collected) && Array.isArray(d.events) && d.evaluated && d.examined;
  }
  function load(silent) {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (!raw) { if (!silent) toast('No hay partida guardada'); return false; }
    let d; try { d = JSON.parse(raw); } catch (e) { d = null; }
    if (!validSave(d)) { if (!silent) toast('La partida guardada está dañada o es de otra versión; empiezas de nuevo'); return false; }
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
    showSymbol(false); $('comic').hidden = true;
    if (S.complete) showEnd(); else $('end').hidden = true;
    renderQuest(); renderInv();
  }
  function reset() {
    S = freshState();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
    logEvent('PlayerCharacterCreated', { character: 'Vittata' });
    applyWorld();
  }

  // ---------- Entrada ----------
  const keys = new Set();
  const stick = { x: 0, y: 0 };
  let jumpHeld = false, camYaw = 0.35;
  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.target && e.target.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
    keys.add(e.key.toLowerCase());
    if (e.key === ' ') { jumpHeld = true; tryJump(); e.preventDefault(); }
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
  function tryJump() { if (S.pos.y <= height(S.pos.x, S.pos.z) + 0.01) S.vy = 7.5; }

  // ---------- Simulación ----------
  const SPEED = 6.5;
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
    let moving = false;
    if (len > 0.12 && !busy) {
      ix /= Math.max(1, len); iz /= Math.max(1, len);
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const mx = rx * ix - fx * iz, mz = rz * ix - fz * iz, ml = Math.hypot(mx, mz);
      S.pos.x += mx * SPEED * dt; S.pos.z += mz * SPEED * dt;
      if (ml > 0.01) S.facing = { x: mx / ml, z: mz / ml };
      const map = player.material.map;
      if (ix < -0.1) map.repeat.x = -1; else if (ix > 0.1) map.repeat.x = 1;
      map.offset.x = map.repeat.x < 0 ? 1 : 0;
      moving = true;
    }
    for (const c of colliders) {
      if (c.r <= 0) continue;
      const dx = S.pos.x - c.x, dz = S.pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + 0.55;
      if (d < min && d > 1e-4) { S.pos.x = c.x + dx / d * min; S.pos.z = c.z + dz / d * min; }
    }
    S.pos.x = Math.max(-WORLD, Math.min(WORLD, S.pos.x));
    S.pos.z = Math.max(-WORLD, Math.min(WORLD, S.pos.z));
    const ground = height(S.pos.x, S.pos.z);
    const gliding = jumpHeld && S.vy < 0;
    S.vy -= (gliding ? 6 : 22) * dt;
    if (gliding) S.vy = Math.max(S.vy, -2.2);
    S.pos.y = Math.max(ground, (S.pos.y || ground) + S.vy * dt);
    if (S.pos.y <= ground) { S.pos.y = ground; S.vy = 0; }

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
    camPos.set(S.pos.x + Math.sin(camYaw) * 10, S.pos.y + 5.5, S.pos.z + Math.cos(camYaw) * 10);
    if (snap) camera.position.copy(camPos);
    player.position.set(S.pos.x, S.pos.y + 1.05, S.pos.z);
    pShadow.position.set(S.pos.x, height(S.pos.x, S.pos.z) + 0.03, S.pos.z);
    camera.lookAt(S.pos.x, S.pos.y + 1.2, S.pos.z);
  }
  function render(dt, moving) {
    t += dt;
    const bob = moving && S.pos.y <= height(S.pos.x, S.pos.z) + 0.01 ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
    camPos.set(S.pos.x + Math.sin(camYaw) * 10, S.pos.y + 5.5, S.pos.z + Math.cos(camYaw) * 10);
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    player.position.set(S.pos.x, S.pos.y + 1.05 + bob, S.pos.z);
    player.material.rotation = jumpHeld && S.vy < 0 ? Math.sin(t * 6) * 0.08 : 0;
    pShadow.position.set(S.pos.x, height(S.pos.x, S.pos.z) + 0.03, S.pos.z);
    luma.sp.position.y = height(LUMA.x, LUMA.z) + 1.0 + Math.sin(t * 2) * 0.05;
    for (const r of RESOURCES) if (resMeshes[r.id].visible) resMeshes[r.id].rotation.y += dt * 0.6;
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
  if (!load(true)) { reset(); setTimeout(() => toast('La Gran Ruptura dañó tu taller. Examina la máquina y el transmisor.', 4500), 600); }
  placeCamera(true);
  requestAnimationFrame(frame);

  // ---------- API de prueba (solo diagnóstico) ----------
  function teleport(x, z, fx, fz) { S.pos.x = x; S.pos.z = z; S.pos.y = height(x, z); S.vy = 0; if (fx !== undefined) S.facing = { x: fx, z: fz }; }
  function tick(seconds) { const n = Math.ceil(seconds / 0.05); for (let i = 0; i < n; i++) update(0.05); }
  function drain() { let n = 0; while (dialogOpen() && n++ < 30) showNextLine(); }
  function useAt(id, ox, oz) { const it = interactables.find(i => i.id === id); teleport(it.x + (ox || 0.9), it.z + (oz || 0)); tick(0.1); const nb = nearest(); if (nb && nb.id === id) { action(); return true; } return false; }
  async function selfTest() {
    const out = [];
    const check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra || '' });
    reset();
    check('Evento PlayerCharacterCreated', hadEvent('PlayerCharacterCreated'));
    check('Vittata despierta junto al taller', Math.hypot(S.pos.x - SPAWN.x, S.pos.z - SPAWN.z) < 0.1);
    useAt('maquina'); drain(); useAt('transmisor'); drain();
    check('Taller explorado y misión con Luma', S.step === 1 && hadEvent('WorkshopExplored') && !!S.captures.workshop, 'paso ' + S.step);
    useAt('luma'); drain();
    check('Luma da la misión (LumaHelped)', S.step === 2 && hadEvent('LumaHelped'), 'paso ' + S.step);
    for (const id of ['m1', 'm2', 'm3', 'm4', 'p1', 'p2', 'c1']) useAt(id);
    check('Recursos recolectados (ResourcesCollected)', S.step === 3 && hadEvent('ResourcesCollected'), JSON.stringify(S.inv));
    useAt('postA', 1, 1); $('c-close').click(); drain();
    useAt('postB', 1, 1); $('c-close').click(); drain();
    check('Dos terrenos inspeccionados', S.step === 4 && S.events.filter(e => e.type === 'LandInspected').length === 2, 'paso ' + S.step);
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
    check('GuardianMet y banco desbloqueado', hadEvent('GuardianMet') && S.benchUnlocked && bench.visible && S.step === 6);
    useAt('transmisor');
    check('Símbolo de 36 fragmentos visible', !$('symbol').hidden);
    drain();
    check('Transmisor activo, plano de embarcación y capítulo completo', S.transmitterOn && S.boatPlan && S.complete && hadEvent('ChapterCompleted') && !$('end').hidden);
    check('Capturas para el cómic', !!(S.captures.workshop && S.captures.shelter && S.captures.final));
    const story = comicStory();
    check('Cómic cuenta la corrección real', story[2].text.startsWith('Mi primera idea no era segura'), story[2].text);
    await openComic();
    $('c-title').value = 'Prueba de cómic'; $('c-cover').value = 'taller';
    const png = await exportComic();
    check('Exporta PNG válido', png.startsWith('data:image/png') && png.length > 50000, Math.round(png.length / 1024) + ' KB');
    const im = await loadImg(png);
    check('El PNG se decodifica a 1080×1520', im && im.width === 1080 && im.height === 1520, im ? im.width + '×' + im.height : 'no carga');
    check('Evento ComicExported', hadEvent('ComicExported'));
    $('comic').hidden = true;
    check('Guardar funciona', save(true));
    const snap = serialize();
    reset(); check('Reiniciar limpia la partida', S.step === 0 && !S.refuge);
    try { localStorage.setItem(SAVE_KEY, snap); } catch (e) { /* sin almacenamiento */ }
    check('Cargar restaura progreso, eventos y capturas', load(true) && S.complete && S.events.length > 10 && !!S.captures.final, S.events.length + ' eventos');
    try { localStorage.setItem(SAVE_KEY, '{roto'); } catch (e) { /* sin almacenamiento */ }
    check('Partida dañada se rechaza', load(true) === false);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, step: 3 })); } catch (e) { /* sin almacenamiento */ }
    check('Partida de la versión 1 se rechaza', load(true) === false);
    // Ruta directa a la colina
    reset(); S.step = 4; S.evaluated = { A: true, B: true }; S.inv = { madera: 4, piedra: 2, componente: 1 };
    startBuild('B'); teleport(PLACES.B.x, PLACES.B.z - 1.5, 0, 1); tick(0.1); action(); drain(); tick(9); drain();
    check('Ruta colina directa: texto del cómic correcto', comicStory()[2].text.startsWith('Elegí construir en la colina'), comicStory()[2].text);
    reset();
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  window.AV = { get state() { return S; }, teleport, tick, action, nearest: () => nearest() && nearest().id, selfTest, save, load, reset, exportComic };
})();
