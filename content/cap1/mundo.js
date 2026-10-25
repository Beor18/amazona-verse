/* Content pack cap1 · mundo de Villa Raíz
   Relieve, lugares, río, árboles, islas, NPC y objetos recogibles como datos; y las piezas propias del capítulo
   (taller de Vittata, máquina, transmisor, banco, mirador, estacas de los terrenos, refugio) construidas en preparar(G).
   Las piezas que necesita la historia quedan en G.c (espacio privado del pack). */
(function () {
  'use strict';
  const POOL = { x: 30, z: -18 }; // poza honda del río (misión de nado)
  const LUGARES = {
    taller: { x: -9, z: -7, r: 7 },
    villa: { x: 3, z: 1, r: 6 },
    A: { x: 20, z: 6, r: 7, half: 4, name: 'Junto al río',
         info: { Área: '64 m²', Elevación: 'baja, a la orilla del río', Acceso: 'corto, cerca de Villa Raíz', 'Señal de riesgo': 'marcas de agua a 1 m en los árboles', Hábitat: 'nidos de ribera cerca' } },
    B: { x: -24, z: 20, r: 7, half: 4, name: 'La colina',
         info: { Área: '64 m²', Elevación: 'alta, sobre la colina', Acceso: 'largo, cuesta arriba', 'Señal de riesgo': 'ninguna visible', Hábitat: 'bosque seco, sin nidos' } },
    mirador: { x: -30, z: 33, r: 2.5 },
  };
  // Árboles con marcas de agua junto al río (señal de riesgo del terreno A)
  const MARK_TREES = [{ x: 16.5, z: 11.5, s: 1.1, copa: true }, { x: 24.5, z: 1.2, s: 1, copa: true }];

  // Materiales compartidos de los objetos (se crean al primer uso, cuando THREE ya está)
  let resMat = null;
  const mats = () => resMat || (resMat = { madera: new THREE.MeshLambertMaterial({ color: '#8a5a2b' }), piedra: new THREE.MeshLambertMaterial({ color: '#9aa0a3' }), componente: new THREE.MeshLambertMaterial({ color: '#c9d4d9', emissive: '#1d3a46' }) });

  AVE.registerPack({
    id: 'cap1',
    mundo: {
      tamano: 70, segmentos: 110,
      cielo: { color: '#bfe1d6', niebla: [55, 165] },
      lugares: LUGARES,
      terreno: {
        ondas: [{ fn: 'sin', x: 0.06, amp: 1.2 }, { fn: 'cos', z: 0.05, amp: 1.0 }, { fn: 'sin', xz: 0.03, amp: 1.5 }],
        relieves: [
          { tipo: 'colina', x: -24, z: 20, alto: 6, ancho: 260 },       // la colina del terreno B
          { tipo: 'cauce', x: 30, mitad: 9, pendiente: 0.5 },           // el río
          { tipo: 'colina', x: -30, z: 33, alto: 6, ancho: 70 },        // colina del mirador
          { tipo: 'colina', x: POOL.x, z: POOL.z, alto: -3.2, ancho: 14 }, // poza honda del río (misión de nado)
        ],
        planos: ['villa', 'taller', 'A', 'B', 'mirador'],
      },
      plataformas: [{ lugar: 'mirador', r: 2.3, alto: 0.4 }],
      rio: { x: 30 },
      agua: { x: 28, ancho: 32, nivel: { x: 30, z: 0, sobre: 1.2 } },
      arboles: {
        cantidad: 110, semilla: 7, copaCada: 3, margenRio: 7, extra: MARK_TREES,
        // Sitios que deben quedar libres de árboles (los objetos recogibles ya se evitan solos)
        evitar: pack => [POOL, ...(pack.coquies || []), ...((pack.diario || {}).entradas || []).filter(f => !f.agua),
          { x: 0, z: -11, r: 4 }, { x: -30, z: 33, r: 5 }],
      },
      // Océano alrededor y las otras islas, separadas por una niebla luminosa (guion, página 12)
      oceano: { color: '#3a87a8', y: -2.6 },
      islas: {
        lista: [{ x: -95, z: 70, r: 14 }, { x: -40, z: 105, r: 10 }, { x: -110, z: 10, r: 9 }],
        modelo: { url: 'assets/models/isla_mapa.glb', b64: 'AV_ISLA_B64', script: 'assets/models/isla_mapa_glb.js', base: 'assets/models/' },
      },
      bruma: { dentro: 84, fuera: 128, color: '#fff3d6', opacidad: 0.35, y: 1.5 },
    },
    npcs: [
      { id: 'luma', nombre: 'Luma', sprite: 'assets/luma.png', x: 4, z: -1, escala: 2.0, flota: true },
      { id: 'guardian', nombre: 'Guardián', sprite: 'assets/guardian.png', x: 0, z: -11, escala: 2.6 },
    ],
    objetos: {
      madera: { nombre: 'madera', modelo: () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 7), mats().madera); m.rotation.z = Math.PI / 2; m.position.y = 0.3; return m; } },
      piedra: { nombre: 'piedra', modelo: () => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), mats().piedra); m.position.y = 0.35; return m; } },
      componente: { nombre: 'pieza de metal', modelo: () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 6, 10), mats().componente); m.position.y = 0.7; return m; } },
    },
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
      Object.assign(G.fisica.alturas, { taller: 3.8, bench: 1, refuge: 2.6 });
      // Retratos de las líneas escritas en el código del pack y nivel de la crecida sobre el terreno A
      G.c.IMG = { V: 'assets/vittata.png', L: 'assets/luma.png', G: 'assets/guardian.png' };
      G.c.FLOOD_LEVEL = PLACES.A.base + 1.1;
      for (const t of MARK_TREES) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.18, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#2d5f7a', side: THREE.DoubleSide }));
        band.position.set(t.x, H(t.x, t.z) + 1.0, t.z);
        scene.add(band);
      }
      // Estacas y letrero de cada terreno
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

      const MIRADOR = PLACES.mirador;
      const mirador = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.4, 10), new THREE.MeshLambertMaterial({ color: '#a8743f' }));
      deck.position.y = 0.2; mirador.add(deck);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2; const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), new THREE.MeshLambertMaterial({ color: '#7a5634' }));
        post.position.set(Math.cos(a) * 2.1, 0.8, Math.sin(a) * 2.1); mirador.add(post);
      }
      mirador.position.set(MIRADOR.x, H(MIRADOR.x, MIRADOR.z), MIRADOR.z); scene.add(mirador);

      // Taller de Vittata
      const taller = new THREE.Group();
      const tY = T.base;
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
      maquina.position.set(MAQ.x, H(MAQ.x, MAQ.z), MAQ.z);
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
      trx.position.set(TRX.x, H(TRX.x, TRX.z), TRX.z);
      scene.add(trx);
      colliders.push({ x: TRX.x, z: TRX.z, r: 0.6, kind: 'obj' });
      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.8), new THREE.MeshLambertMaterial({ color: '#c99a5b' }));
      bench.position.set(T.x - 3.6, tY + 0.45, T.z + 0.2);
      colliders.push({ x: T.x - 3.6, z: T.z + 0.2, r: 1, hx: 0.95, hz: 0.45, kind: 'bench', when: () => bench.visible });
      scene.add(bench);

      function applyTallerLook() {
        if (S.transmitterOn) {
          roofR.rotation.set(-Math.PI / 2 - 0.55, 0, 0); roofR.position.set(0, 3.3, 1);
          debris.visible = false; windowGlow.material.color.set('#ffd27a').convertSRGBToLinear();
          trxAnt.rotation.z = 0; trxLight.material.color.set('#7fd38f').convertSRGBToLinear();
        } else {
          roofR.rotation.set(-0.3, 0.2, 0.9); roofR.position.set(2.6, 0.6, 1.8);
          debris.visible = true; windowGlow.material.color.set('#3a2a1a').convertSRGBToLinear();
          trxAnt.rotation.z = 0.5; trxLight.material.color.set('#4a4a4a').convertSRGBToLinear();
        }
        bench.visible = S.benchUnlocked;
      }

      // Refugio: fantasma del modo construir y el refugio construido
      function hutMesh(opacity) {
        const g = new THREE.Group();
        const transparent = opacity < 1;
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshLambertMaterial({ color: '#c99a5b', transparent, opacity }));
        body.position.y = 0.8;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), new THREE.MeshLambertMaterial({ color: '#5e8f3a', transparent, opacity }));
        roof.position.y = 2.2; roof.rotation.y = Math.PI / 4;
        g.add(body, roof);
        return G.renderer.linearize(g);
      }
      const ghost = hutMesh(0.5); ghost.visible = false; scene.add(ghost);
      let refugeMesh = null;
      function placeRefugeMesh() {
        if (refugeMesh) { scene.remove(refugeMesh); refugeMesh = null; }
        G.fisica.removeColliders('refuge');
        if (!S.refuge) return;
        refugeMesh = hutMesh(1);
        refugeMesh.position.set(S.refuge.x, H(S.refuge.x, S.refuge.z), S.refuge.z);
        if (S.refuge.damaged) {
          refugeMesh.rotation.z = 0.18;
          refugeMesh.children[0].material.color.set('#7a6a52').convertSRGBToLinear();
          refugeMesh.children[1].material.color.set('#40603a').convertSRGBToLinear();
        }
        scene.add(refugeMesh);
        colliders.push({ x: S.refuge.x, z: S.refuge.z, r: 1.4, kind: 'refuge' });
      }
      // El transmisor encendido late
      G.on('render', (dt, t) => { if (S.transmitterOn) trxLight.scale.setScalar(1 + Math.sin(t * 6) * 0.25); }, 35);

      Object.assign(G.c, { PLACES, T, MAQ, TRX, MIRADOR, mirador, bench, ghost, applyTallerLook, placeRefugeMesh, refugeMesh: () => refugeMesh });
    },
  });
})();
