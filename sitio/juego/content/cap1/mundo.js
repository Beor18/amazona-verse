/* Content pack cap1 · mundo: El Yunque (mapa del level designer) o, si no cargó su .js, la Villa Raíz analítica de antes
   - Mapa: assets/data/mapa_cap1.js (AV_MAPA_CAP1) y mapa_cap1_altura.js. Lugares, POIs, agua, colisiones, flora y edificios
     salen de ahí; aquí quedan la ambientación (cielo, luz, niebla, post), la escala de los edificios de Kelvin con la cotorra,
     y reubicar(pack): mueve en sitio recursos, Diario, coquíes y aparición a las coordenadas del mapa (por id).
   - Piezas propias del capítulo construidas en preparar(G): taller de Vittata (bohío y toldo del kit de Kelvin), máquina,
     transmisor, banco, estacas de los terrenos, marcas de agua, mirador (marcador) y el refugio que construye el jugador.
   Las piezas que necesita la historia quedan en G.c (espacio privado del pack). */
(function () {
  'use strict';
  const D = window.AV_MAPA_CAP1 || null;      // mapa de El Yunque (null: mundo analítico de respaldo)
  const M = (D && D.misiones) || {};
  const INFO_A = { Área: '64 m²', Elevación: 'baja, a la orilla del río', Acceso: 'corto, cerca de Villa Raíz', 'Señal de riesgo': 'marcas de agua a 1 m en los árboles', Hábitat: 'nidos de ribera cerca' };
  const INFO_B = { Área: '64 m²', Elevación: 'alta, sobre la colina', Acceso: 'largo, cuesta arriba', 'Señal de riesgo': 'ninguna visible', Hábitat: 'bosque seco, sin nidos' };
  const POOL = M.POOL ? { x: M.POOL.x, z: M.POOL.z } : { x: 30, z: -18 }; // poza honda del río (misión de buceo)
  const DL = D ? D.lugares : null;
  const LUGARES = D ? {
    taller: { x: DL.taller.x, z: DL.taller.z, r: DL.taller.r || 7 },
    villa: { x: DL.villa.x, z: DL.villa.z, r: DL.villa.r || 8 },
    A: { x: DL.A.x, z: DL.A.z, r: DL.A.r || 7, half: DL.A.half || 4, name: 'Junto al río', info: INFO_A },
    B: { x: DL.B.x, z: DL.B.z, r: DL.B.r || 7, half: DL.B.half || 4, name: 'La colina', info: INFO_B },
    mirador: { x: DL.mirador.x, z: DL.mirador.z, r: 2.5 },
  } : {
    taller: { x: -9, z: -7, r: 7 }, villa: { x: 3, z: 1, r: 6 },
    A: { x: 20, z: 6, r: 7, half: 4, name: 'Junto al río', info: INFO_A },
    B: { x: -24, z: 20, r: 7, half: 4, name: 'La colina', info: INFO_B },
    mirador: { x: -30, z: 33, r: 2.5 },
  };
  // Árboles con marcas de agua junto al río (señal de riesgo del terreno A): en el mapa son tabonucos héroe
  const MARK_TREES = D && M.markTrees ? M.markTrees.map(t => ({ x: t.x, z: t.z, s: t.s || 1, copa: true })) : [{ x: 16.5, z: 11.5, s: 1.1, copa: true }, { x: 24.5, z: 1.2, s: 1, copa: true }];

  // POIs que pide la misión educativa ("La ruta de la gota") y que salen de los datos del mapa
  function poisExtra() {
    if (!D) return [];
    const out = [], P = (id, nombre, x, y, z) => out.push({ id, nombre, x, y, z });
    if (M.markTrees && M.markTrees[0]) P('marcas_agua', 'Árbol con marcas de agua', M.markTrees[0].x, null, M.markTrees[0].z);
    for (const p of M.perchas || []) P('percha_' + p.id, 'Percha · ' + p.id, p.x, p.y, p.z);
    const RG = M.rutaGota || {};
    if (RG.nube) P('nube_lluvia', 'Nube sobre la cumbre', RG.nube.x, RG.nube.y, RG.nube.z);
    const dosel = (M.perchas || []).find(p => p.id === 'dosel');
    if (dosel) P('bromelia_dosel', 'Bromelia en el dosel', dosel.x + 0.6, dosel.y + 0.4, dosel.z);
    if (M.POOL) P('gota_poza', 'Fondo de la Poza Honda', M.POOL.x, M.POOL.nivel - M.POOL.profundidad + 0.3, M.POOL.z);
    if (RG.marcaCrecida) P('roca_crecida', 'Roca con la marca de crecida', RG.marcaCrecida.x, RG.marcaCrecida.y, RG.marcaCrecida.z);
    // orilla del río más cercana al terreno A
    const A = LUGARES.A, rio = D.agua && D.agua.rio && D.agua.rio.puntos;
    if (rio) {
      let best = null, bd = 1e9;
      for (const q of rio) { const d = Math.hypot(q[0] - A.x, q[1] - A.z); if (d < bd) { bd = d; best = q; } }
      if (best) { const k = (best[3] + 1.2) / Math.max(bd, 1e-3); P('rio_terrenoA', 'Orilla del río junto al terreno A', best[0] + (A.x - best[0]) * k, null, best[1] + (A.z - best[1]) * k); }
    }
    const plaza = (D.pois || []).find(p => p.id === 'plaza');
    const fls = ((D.flora && D.flora.heroes) || []).filter(h => h.especie === 'flamboyan');
    if (plaza && fls.length) {
      fls.sort((a, b) => Math.hypot(a.pos[0] - plaza.pos[0], a.pos[2] - plaza.pos[2]) - Math.hypot(b.pos[0] - plaza.pos[0], b.pos[2] - plaza.pos[2]));
      P('flamboyan_plaza', 'Flamboyán de la plaza', fls[0].pos[0], null, fls[0].pos[2]);
    }
    return out;
  }
  // Mueve el contenido de los otros archivos del pack a las coordenadas del mapa (por id; lo que no está en el mapa no se toca)
  function reubicar(pack, MD) {
    const MS = MD.misiones || {};
    const by = arr => { const o = {}; for (const e of arr || []) o[e.id] = e; return o; };
    const RS = by(MS.RESOURCES), FI = by(MS.FIELD), BU = by(MS.BUSHES);
    // Fuera de las huellas de los edificios (cajas y cilindros del mapa, con 1 m de margen): si un hallazgo o un objeto cae
    // dentro de un edificio sólido, se saca al borde más cercano para que se pueda alcanzar a pie.
    const solidos = (MD.colisiones || []).filter(c => c.tipo === 'caja' || c.tipo === 'cilindro');
    const afuera = o => {
      for (let pass = 0; pass < 3; pass++) for (const c of solidos) {
        const m = 1.0;
        if (c.tipo === 'cilindro') {
          const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), r = c.r + m;
          if (d < r) { const k = d > 1e-3 ? r / d : 1; o.x = c.x + (d > 1e-3 ? dx : r) * k; o.z = c.z + (d > 1e-3 ? dz : 0) * k; }
        } else {
          const cs = Math.cos(c.rotY || 0), sn = Math.sin(c.rotY || 0), dx = o.x - c.x, dz = o.z - c.z;
          let lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
          const hx = c.hx + m, hz = c.hz + m;
          if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
            if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
            o.x = c.x + lx * cs + lz * sn; o.z = c.z - lx * sn + lz * cs;
          }
        }
      }
      return o;
    };
    for (const r of pack.recursos || []) { const n = RS[r.id]; if (n) { r.x = n.x; r.z = n.z; afuera(r); } }
    for (const f of (pack.diario && pack.diario.entradas) || []) { const n = FI[f.id]; if (n) { f.x = n.x; f.z = n.z; if (n.r) f.r = n.r; if (!f.agua) afuera(f); } }
    for (const b of pack.coquies || []) { const n = BU[b.id]; if (n) { b.x = n.x; b.z = n.z; afuera(b); } }
    if (MD.spawn && pack.jugador) pack.jugador.aparicion = { x: MD.spawn.x, z: MD.spawn.z };
  }

  // Materiales compartidos de los objetos (se crean al primer uso, cuando THREE ya está)
  let resMat = null;
  const mats = () => resMat || (resMat = { madera: new THREE.MeshLambertMaterial({ color: '#8a5a2b' }), piedra: new THREE.MeshLambertMaterial({ color: '#9aa0a3' }), componente: new THREE.MeshLambertMaterial({ color: '#c9d4d9', emissive: '#1d3a46' }) });

  const MUNDO_MAPA = D && {
    mapa: { datos: () => window.AV_MAPA_CAP1, alturas: () => window.AV_MAPA_CAP1_ALTURA, b64: 'AV_MAPA_B64' },
    lugares: LUGARES, pois: poisExtra, reubicar,
    nivelBase: M.POOL ? M.POOL.nivel : 3,
    // Ambiente de El Yunque a media mañana: cielo tropical, sol cálido alto desde el sudoeste, niebla ligera que sube del valle
    exposicion: 0.74,
    cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
    luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
    post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
    mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
    aguaRio: { claro: '#47b9a6', hondo: '#155a68', turbio: '#8c6c3e' },
    flora: { viento: { dir: [0.85, 0.35], fuerza: 1 }, evitar: pack => [POOL, ...(pack.coquies || []), ...(pack.recursos || []), ...((pack.diario || {}).entradas || [])] },
    // Edificios de Kelvin a escala con la cotorra (1,75 m de alto en el juego): el kit está hecho para una persona de 1,8 m,
    // así que las casas van a 0,95 (puertas de ~1,95 m) y lo monumental (templos, ruinas) a 1. Factor uniforme, sin deformar.
    edificios: {
      escala: { defecto: 0.95, templo_grande: 1, templo_mediano: 1, ruina_torre: 1, ruina_mirador: 1, ruina_pilar: 1, ruina_portal: 1, ruina_altar: 1, muelle_troncos: 1, puente_madera: 1, canoa: 1 },
      frente: {}, orientar: true, noOrientar: ['empalizada', 'canoa', 'ruina_pilar', 'ruina_altar', 'muelle_troncos', 'puente_madera'], propias: ['puente'],
      kit: 'assets/models/edificios/kit.js', // manifiesto del kit web (64 modelos, ver docs/EDIFICIOS.md)
    },
    islas: {
      lista: (M.ISLANDS || []).map(i => ({ x: i.x, z: i.z, r: i.r })),
      modelo: { url: 'assets/models/isla_mapa.glb', b64: 'AV_ISLA_B64', script: 'assets/models/isla_mapa_glb.js', base: 'assets/models/' },
    },
  };
  const MUNDO_ANALITICO = {
    tamano: 70, segmentos: 110,
    cielo: { color: '#bfe1d6', niebla: [55, 165] },
    lugares: LUGARES,
    terreno: {
      ondas: [{ fn: 'sin', x: 0.06, amp: 1.2 }, { fn: 'cos', z: 0.05, amp: 1.0 }, { fn: 'sin', xz: 0.03, amp: 1.5 }],
      relieves: [
        { tipo: 'colina', x: -24, z: 20, alto: 6, ancho: 260 }, { tipo: 'cauce', x: 30, mitad: 9, pendiente: 0.5 },
        { tipo: 'colina', x: -30, z: 33, alto: 6, ancho: 70 }, { tipo: 'colina', x: POOL.x, z: POOL.z, alto: -3.2, ancho: 14 },
      ],
      planos: ['villa', 'taller', 'A', 'B', 'mirador'],
    },
    plataformas: [{ lugar: 'mirador', r: 2.3, alto: 0.4 }],
    rio: { x: 30 },
    agua: { x: 28, ancho: 32, nivel: { x: 30, z: 0, sobre: 1.2 } },
    arboles: {
      cantidad: 110, semilla: 7, copaCada: 3, margenRio: 7, extra: MARK_TREES,
      evitar: pack => [POOL, ...(pack.coquies || []), ...((pack.diario || {}).entradas || []).filter(f => !f.agua), { x: 0, z: -11, r: 4 }, { x: -30, z: 33, r: 5 }],
    },
    oceano: { color: '#3a87a8', y: -2.6 },
    islas: {
      lista: [{ x: -95, z: 70, r: 14 }, { x: -40, z: 105, r: 10 }, { x: -110, z: 10, r: 9 }],
      modelo: { url: 'assets/models/isla_mapa.glb', b64: 'AV_ISLA_B64', script: 'assets/models/isla_mapa_glb.js', base: 'assets/models/' },
    },
    bruma: { dentro: 84, fuera: 128, color: '#fff3d6', opacidad: 0.35, y: 1.5 },
  };
  const LUMA = M.LUMA || { x: 4, z: -1 }, GUARD = M.GUARD || { x: 0, z: -11 };

  AVE.registerPack({
    id: 'cap1',
    mundo: MUNDO_MAPA || MUNDO_ANALITICO,
    // Luma y el Guardián son sprites 2D de renders sustitutos (CANON_REGISTRY: PROVISIONALES), junto a una Vittata 3D.
    // [KELVIN-1] Identidad del Guardián (¿cotorra, humano u otra forma?): decide su retrato, su sprite y su modelo 3D.
    // [KELVIN-3] Medalla del Guardián igual a una pieza del emblema (NARRATIVA «Giro»): si es canon, falta un detalle visible en su figura.
    // [KELVIN-5] Familia de Luma (SCRIPT p.9: entra al refugio): no hay arte ni diseño, solo Luma. Ver historia.js, afterRain().
    npcs: [
      { id: 'luma', nombre: 'Luma', sprite: 'assets/luma.png', x: LUMA.x, z: LUMA.z, escala: 2.0, flota: true },
      { id: 'guardian', nombre: 'Guardián', sprite: 'assets/guardian.png', x: GUARD.x, z: GUARD.z, escala: 2.6 },
    ],
    objetos: {
      madera: { nombre: 'madera', modelo: () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 7), mats().madera); m.rotation.z = Math.PI / 2; m.position.y = 0.3; return m; } },
      piedra: { nombre: 'piedra', modelo: () => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), mats().piedra); m.position.y = 0.35; return m; } },
      componente: { nombre: 'pieza de metal', modelo: () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 6, 10), mats().componente); m.position.y = 0.7; return m; } },
    },
    // En el mapa, reubicar() pone estas coordenadas en las de misiones.RESOURCES (mismos ids)
    recursos: [
      { id: 'm1', tipo: 'madera', x: -3, z: 7 }, { id: 'm2', tipo: 'madera', x: 7, z: 9 },
      { id: 'm3', tipo: 'madera', x: -14, z: 2 }, { id: 'm4', tipo: 'madera', x: 10, z: -9 },
      { id: 'm5', tipo: 'madera', x: -17, z: -13 },
      { id: 'p1', tipo: 'piedra', x: 12, z: -2 }, { id: 'p2', tipo: 'piedra', x: -6, z: 13 },
      { id: 'p3', tipo: 'piedra', x: 4, z: -15 }, { id: 'p4', tipo: 'piedra', x: -15, z: 8 },
      // M1 "Fondo del río": la pieza c1 cayó al fondo de la poza del río; solo se alcanza buceando (C o Bucear)
      { id: 'c1', tipo: 'componente', x: POOL.x, z: POOL.z, fondo: true, burbujas: 2, avisoFondo: 'La pieza está en el fondo de la poza: mantén C (o Bucear) para bajar' },
      // c2 aparece después de la recolección: así la pieza de metal del paso 3 sale del río (M1)
      { id: 'c2', tipo: 'componente', x: 9, z: 14, desdePaso: 3 },
    ],
    pozaRio: POOL,

    preparar(G) {
      const S = G.S, scene = G.renderer.scene, colliders = G.fisica.colliders, H = G.terreno.height;
      const PLACES = G.terreno.places, T = PLACES.taller;
      const MAPA = !!G.terreno.mapa;
      Object.assign(G.fisica.alturas, { taller: 3.8, bench: 1, refuge: 2.6 });
      // Retratos de las líneas escritas en el código del pack y nivel de la crecida sobre el terreno A
      // VOZ y N: retratos neutros de la Voz del transmisor y del Narrador (pack.js); nunca la cara del Guardián ni la de Vittata
      const RET = (G.pack.dialogos && G.pack.dialogos.retratos) || {};
      G.c.IMG = { V: 'assets/vittata.png', L: 'assets/luma.png', G: 'assets/guardian.png', VOZ: RET.Voz || '', N: RET.Narrador || '' };
      G.c.FLOOD_LEVEL = PLACES.A.base + 1.1;
      // Marcas de agua a 1 m en los árboles junto al río (en el mapa, ajustadas al tronco real cuando carga la flora)
      const lin = c => new THREE.Color(c).convertSRGBToLinear();
      const bandMat = new THREE.MeshLambertMaterial({ color: lin('#3b5f6e'), side: THREE.DoubleSide });
      const bands = MARK_TREES.map(t => {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 14, 1, true), bandMat);
        band.position.set(t.x, H(t.x, t.z) + 1.0, t.z); band.visible = !MAPA;
        scene.add(band); return band;
      });
      if (MAPA && G.vegetacion && G.vegetacion.listo) G.vegetacion.listo.then(() => {
        const inf = G.vegetacion.info.tabonuco;
        bands.forEach((b, i) => { const t = MARK_TREES[i], r = inf ? Math.max(0.3, inf.tronco * t.s * 1.0) : 0.6; b.scale.set(r / 0.4, 1, r / 0.4); b.position.y = H(t.x, t.z) + 1.0; b.visible = true; });
      });
      // Estacas y letrero de cada terreno
      const madera = new THREE.MeshLambertMaterial({ color: lin('#8a5e34') });
      function parcelMarker(p, color) {
        const g = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: lin(color) });
        const h = p.half;
        // estacas y sus topes de color: dos mallas instanciadas (2 draw calls por terreno)
        const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), madera, 4), caps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), mat, 4);
        const m4 = new THREE.Matrix4();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i) => {
          const x = p.x + sx * h, z = p.z + sz * h, y = H(x, z);
          posts.setMatrixAt(i, m4.makeTranslation(x, y + 0.5, z)); caps.setMatrixAt(i, m4.makeTranslation(x, y + 1.1, z));
        });
        posts.castShadow = true; posts.frustumCulled = caps.frustumCulled = false; g.add(posts, caps);
        const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sz]) => new THREE.Vector3(p.x + sx * h, H(p.x + sx * h, p.z + sz * h) + 0.85, p.z + sz * h));
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: lin(color) })));
        const sx = p.x - h - 1.2, sz = p.z - h, sy = H(sx, sz);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.1), new THREE.MeshLambertMaterial({ color: lin('#e8d7a8') }));
        sign.position.set(sx, sy + 1.4, sz); sign.castShadow = true;
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), madera);
        stick.position.set(sx, sy + 0.7, sz);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 0.11), mat); stripe.position.set(sx, sy + 1.62, sz);
        g.add(sign, stick, stripe);
        p.post = { x: sx, z: sz };
        colliders.push({ x: p.post.x, z: p.post.z, r: 0.35, kind: 'post' });
        scene.add(g);
      }
      parcelMarker(PLACES.A, '#f2a03d');
      parcelMarker(PLACES.B, '#d6403a');

      // Mirador: en el mapa es el mirador escalonado de Kelvin (src/engine/mundo.js); aquí queda el marcador de la historia
      const MIRADOR = PLACES.mirador;
      const mirador = new THREE.Group();
      if (!MAPA) {
        const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.4, 10), new THREE.MeshLambertMaterial({ color: '#a8743f' }));
        deck.position.y = 0.2; mirador.add(deck);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2; const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), new THREE.MeshLambertMaterial({ color: '#7a5634' }));
          post.position.set(Math.cos(a) * 2.1, 0.8, Math.sin(a) * 2.1); mirador.add(post);
        }
      }
      mirador.position.set(MIRADOR.x, H(MIRADOR.x, MIRADOR.z), MIRADOR.z); scene.add(mirador);

      // ---------- Taller de Vittata ----------
      // Mapa: bohío redondo del kit de Kelvin con un toldo de trabajo; la Ruptura tumbó el toldo y regó tablas.
      // Analítico: la caseta de primitivas de antes.
      const taller = new THREE.Group();
      const tY = T.base;
      const wood = new THREE.MeshLambertMaterial({ color: lin('#a8743f') });
      const windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), new THREE.MeshBasicMaterial({ color: lin('#3a2a1a') }));
      const debris = new THREE.Group();
      const tablas = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 0.12, 0.35), wood, 5);
      for (let i = 0; i < 5; i++) {
        const o = new THREE.Object3D(); o.position.set(-2 + i * 0.9, 0.08, 3.6 + (i % 2) * 0.6); o.rotation.y = i * 0.7; o.updateMatrix();
        tablas.setMatrixAt(i, o.matrix);
      }
      tablas.castShadow = true; tablas.frustumCulled = false; debris.add(tablas);
      let roofL = null, roofR = null, toldo = null;
      // el taller mira hacia la plaza
      const facing = Math.atan2(PLACES.villa.x - T.x, PLACES.villa.z - T.z);
      if (MAPA && G.mundo && G.mundo.edificio) {
        taller.rotation.y = facing;
        windowGlow.position.set(0, 1.25, 2.95); windowGlow.visible = false;
        G.mundo.edificio('bohio_redondo', { agregar: false, escala: 0.95 }).then(g => { taller.add(g); }).catch(() => {});
        G.mundo.edificio('toldo_pequeno', { agregar: false, escala: 0.95 }).then(g => { toldo = g; g.position.set(-3.9, 0, 2.4); taller.add(g); applyTallerLook(); }).catch(() => {});
        taller.add(windowGlow, debris);
      } else {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4), wood);
        walls.position.y = 1.3;
        const roofMat = new THREE.MeshLambertMaterial({ color: '#7c3b2a', side: THREE.DoubleSide });
        roofL = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3), roofMat);
        roofR = roofL.clone();
        roofL.position.set(0, 3.3, -1); roofL.rotation.set(-Math.PI / 2 + 0.55, 0, 0);
        windowGlow.position.set(0, 1.5, 2.01);
        debris.position.z = -0.8;
        taller.add(walls, roofL, roofR, windowGlow, debris);
      }
      taller.position.set(T.x, tY, T.z);
      scene.add(taller);
      // r es el radio para comprobar construcciones; hx/hz es la caja real de las paredes para chocar
      if (MAPA) colliders.push({ x: T.x, z: T.z, r: 2.9, kind: 'taller' });
      else colliders.push({ x: T.x, z: T.z, r: 2.6, hx: 2.55, hz: 2.05, kind: 'taller' });

      // Objetos del taller: máquina experimental, transmisor y banco de trabajo (mejora), al frente del taller
      // [KELVIN-6] Diseño de la máquina experimental y del transmisor antiguo: hoy son primitivas (cilindro con aspa, caja con antena).
      // Tampoco hay engranaje visible en el techo del refugio (NARRATIVA M2) ni la máquina cambia al sacrificarlo (CAP1_PENDIENTE P2-2).
      const fx = Math.sin(facing), fz = Math.cos(facing), rx = Math.cos(facing), rz = -Math.sin(facing);
      const MAQ = MAPA ? { x: T.x + fx * 4.4 - rx * 2.4, z: T.z + fz * 4.4 - rz * 2.4 } : { x: T.x - 2.6, z: T.z + 3.4 };
      const TRX = MAPA ? { x: T.x + fx * 4.2 + rx * 3.0, z: T.z + fz * 4.2 + rz * 3.0 } : { x: T.x + 3.4, z: T.z + 2.6 };
      const maquina = new THREE.Group();
      const mBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 14), new THREE.MeshLambertMaterial({ color: lin('#b9c4c9') }));
      mBody.position.y = 0.45; mBody.castShadow = true;
      const mProp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.18), new THREE.MeshLambertMaterial({ color: lin('#f2a03d') }));
      mProp.position.y = 1.0; mProp.rotation.z = 0.35; mProp.castShadow = true;
      maquina.add(mBody, mProp);
      maquina.position.set(MAQ.x, H(MAQ.x, MAQ.z), MAQ.z);
      scene.add(maquina);
      colliders.push({ x: MAQ.x, z: MAQ.z, r: 0.6, kind: 'obj' });
      const trx = new THREE.Group();
      const trxBox = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), new THREE.MeshLambertMaterial({ color: lin('#5a4a3a') }));
      trxBox.position.y = 0.55; trxBox.castShadow = true;
      const trxAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), new THREE.MeshLambertMaterial({ color: lin('#9aa0a3') }));
      trxAnt.position.set(0.25, 1.8, 0); trxAnt.rotation.z = 0.5;
      const trxLight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: '#4a4a4a' }));
      trxLight.position.set(0, 0.85, 0.36);
      trx.add(trxBox, trxAnt, trxLight);
      trx.position.set(TRX.x, H(TRX.x, TRX.z), TRX.z);
      if (MAPA) trx.rotation.y = facing;
      scene.add(trx);
      colliders.push({ x: TRX.x, z: TRX.z, r: 0.6, kind: 'obj' });
      const BEN = MAPA ? { x: T.x - rx * 4.6 + fx * 1.2, z: T.z - rz * 4.6 + fz * 1.2 } : { x: T.x - 3.6, z: T.z + 0.2 };
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.8), new THREE.MeshLambertMaterial({ color: lin('#c99a5b') }));
      bench.position.set(BEN.x, H(BEN.x, BEN.z) + 0.45, BEN.z); bench.castShadow = true;
      if (MAPA) bench.rotation.y = facing;
      colliders.push({ x: BEN.x, z: BEN.z, r: 1, hx: 0.95, hz: 0.45, kind: 'bench', when: () => bench.visible });
      scene.add(bench);

      function applyTallerLook() {
        if (S.transmitterOn) {
          if (roofR) { roofR.rotation.set(-Math.PI / 2 - 0.55, 0, 0); roofR.position.set(0, 3.3, 1); }
          if (toldo) { toldo.rotation.set(0, 0.3, 0); toldo.position.y = 0; }
          debris.visible = false; windowGlow.material.color.set('#ffd27a').convertSRGBToLinear(); windowGlow.visible = true;
          trxAnt.rotation.z = 0; trxLight.material.color.set('#7fd38f').convertSRGBToLinear();
        } else {
          if (roofR) { roofR.rotation.set(-0.3, 0.2, 0.9); roofR.position.set(2.6, 0.6, 1.8); }
          if (toldo) { toldo.rotation.set(0.15, 0.9, 1.25); toldo.position.y = 0.55; } // la Ruptura lo tumbó
          debris.visible = true; windowGlow.material.color.set('#3a2a1a').convertSRGBToLinear(); windowGlow.visible = !MAPA;
          trxAnt.rotation.z = 0.5; trxLight.material.color.set('#4a4a4a').convertSRGBToLinear();
        }
        bench.visible = S.benchUnlocked;
      }

      // ---------- Refugio: fantasma del modo construir y el refugio construido ----------
      // Mapa: bohío pequeño del kit de Kelvin (cuando carga); antes, y en el mundo analítico, la choza de primitivas.
      let modeloRefugio = null;
      if (MAPA && G.mundo && G.mundo.edificio) G.mundo.edificio('bohio_redondo', { agregar: false, escala: 0.7 }).then(g => { modeloRefugio = g; refrescarFantasma(); if (S.refuge) placeRefugeMesh(); }).catch(() => {});
      function hutMesh(opacity) {
        const g = new THREE.Group();
        const transparent = opacity < 1;
        if (modeloRefugio) {
          const m = modeloRefugio.clone(true);
          m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = transparent; o.material.opacity = opacity; o.material.depthWrite = !transparent; o.castShadow = !transparent; } });
          g.add(m);
          return g;
        }
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshLambertMaterial({ color: '#c99a5b', transparent, opacity }));
        body.position.y = 0.8;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), new THREE.MeshLambertMaterial({ color: '#5e8f3a', transparent, opacity }));
        roof.position.y = 2.2; roof.rotation.y = Math.PI / 4;
        g.add(body, roof);
        return G.renderer.linearize(g);
      }
      const ghost = new THREE.Group(); ghost.visible = false; scene.add(ghost);
      function refrescarFantasma() { ghost.clear(); ghost.add(hutMesh(0.5)); }
      refrescarFantasma();
      let refugeMesh = null;
      function placeRefugeMesh() {
        if (refugeMesh) { scene.remove(refugeMesh); refugeMesh = null; }
        G.fisica.removeColliders('refuge');
        if (!S.refuge) return;
        refugeMesh = hutMesh(1);
        refugeMesh.position.set(S.refuge.x, H(S.refuge.x, S.refuge.z), S.refuge.z);
        if (S.refuge.damaged) {
          refugeMesh.rotation.z = 0.18;
          // dañado: barro y humedad oscurecen la madera y la paja
          refugeMesh.traverse(o => { if (o.isMesh && o.material && o.material.color) o.material.color.multiply(new THREE.Color(0.55, 0.5, 0.42)); });
        }
        scene.add(refugeMesh);
        colliders.push({ x: S.refuge.x, z: S.refuge.z, r: modeloRefugio ? 1.9 : 1.4, kind: 'refuge' }); // bohío de 4,4 m (pared de 1,6 m: a escala con la cotorra)
      }
      // El transmisor encendido late
      G.on('render', (dt, t) => { if (S.transmitterOn) trxLight.scale.setScalar(1 + Math.sin(t * 6) * 0.25); }, 35);

      // ---------- Luz en la niebla (SCRIPT p.12 · NARRATIVA «Final») ----------
      // Desde el mirador, una luz lejana parpadea tres veces, como respuesta a la señal. Es un sprite aditivo sin niebla puesto en la
      // isla del centro; solo existe desde esa escena (S.boatPlan) y luego queda encendida con un pulso lento. El tamaño sale de la
      // distancia (unos 5° en pantalla) y el parpadeo corre en el gancho update (con el tiempo del juego), así que se puede probar con tick().
      // [KELVIN-8] Quién contesta (¿la Voz?, ¿el pacto de los 36?) no se revela en el cap. 1: la luz es neutra, sin color de personaje.
      const luzMirador = (() => {
        const islas = G.terreno.islas || [];
        if (!islas.length) return null;
        const I = islas[Math.min(1, islas.length - 1)];
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,252,235,1)'); gr.addColorStop(0.1, 'rgba(255,238,175,0.95)'); gr.addColorStop(0.3, 'rgba(255,214,130,0.4)'); gr.addColorStop(1, 'rgba(255,214,130,0)');
        cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
        const sp = new THREE.Sprite(G.renderer.linMat(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 })));
        // En la orilla de la isla que mira al mirador y a unos metros sobre el mar
        const d = Math.hypot(I.x - MIRADOR.x, I.z - MIRADOR.z) || 1, k = (d - I.r * 0.5) / d;
        const dist = d * k, esc = dist * 0.1;
        sp.position.set(MIRADOR.x + (I.x - MIRADOR.x) * k, (MAPA ? 0 : -2.6) + I.r * 0.34, MIRADOR.z + (I.z - MIRADOR.z) * k);
        sp.scale.set(esc, esc, 1); sp.visible = false; sp.renderOrder = 5; scene.add(sp);
        const L = { sprite: sp, isla: I, seq: null, fijo: false, destellos: 0, brillo: 0 };
        // 3 destellos de 0,5 s, uno por segundo, tras 0,4 s de espera; al terminar la luz queda encendida
        L.parpadear = (veces) => { L.seq = { t: 0, n: veces || 3, ultimo: -1 }; L.destellos = 0; sp.visible = true; };
        L.reposo = () => { L.seq = null; L.fijo = true; sp.visible = true; };
        L.destello = () => { sp.visible = true; sp.material.opacity = 1; L.brillo = 1; }; // brillo máximo hasta el siguiente cuadro (foto de la última viñeta)
        L.apagar = () => { L.seq = null; L.fijo = false; L.destellos = 0; L.brillo = 0; sp.visible = false; sp.material.opacity = 0; };
        G.on('update', dt => {
          if (!sp.visible) return;
          let b = 0;
          if (L.seq) {
            const q = L.seq, u = (q.t += dt) - 0.4;
            if (u >= 0) {
              const i = Math.floor(u), f = u - i;
              if (i < q.n) {
                b = f < 0.5 ? Math.pow(Math.sin(Math.PI * f / 0.5), 2) : 0;
                if (i !== q.ultimo) { q.ultimo = i; L.destellos = i + 1; G.audio.play('parpadeo', i); }
              } else if (u > q.n + 0.2) L.reposo();
            }
          }
          if (!L.seq && L.fijo) b = 0.28 + 0.06 * Math.sin(S.clock * 1.3);
          L.brillo = b; sp.material.opacity = Math.min(1, b);
          sp.visible = !!L.seq || L.fijo;
        }, 36);
        // Al cargar o reiniciar: encendida con pulso lento solo si el plano del bote ya se desbloqueó
        G.on('apply', () => { L.apagar(); if (S.boatPlan) L.reposo(); }, 36);
        return L;
      })();

      Object.assign(G.c, { PLACES, T, MAQ, TRX, MIRADOR, mirador, bench, ghost, applyTallerLook, placeRefugeMesh, refugeMesh: () => refugeMesh, luzMirador });
    },
  });
})();
