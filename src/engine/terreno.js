/* AVE · terreno y mundo base
   Construye desde datos (pack.mundo): relieve analítico, zonas planas, suelo con texturas, árboles y palmas instanciados,
   océano, islas lejanas (relieve .glb o conos de respaldo) y bruma. Nada de esto conoce la historia del capítulo.
   Esquema (ver content/cap1/mundo.js como ejemplo completo):
     tamano, segmentos, lugares { id: { x, z, r, ... } },
     terreno { ondas: [{ fn: 'sin'|'cos', x, z, xz, amp }], relieves: [{ tipo: 'colina', x, z, alto, ancho } | { tipo: 'cauce', x, mitad, pendiente }], planos: [ids de lugares] },
     plataformas [{ lugar, r, alto }], rio { x }, agua { x, ancho, nivel: { x, z, sobre } },
     arboles { cantidad, semilla, copaCada, margenRio, extra: [{ x, z, s, copa }], evitar: [{ x, z, r }] },
     islas { lista: [{ x, z, r }], modelo: { url, b64, script, base } }, oceano { color, y }, bruma { dentro, fuera, color, opacidad, y }, texturas {}. */
AVE.module('terreno', function (G) {
  'use strict';
  const W = G.pack.mundo || {};
  const { clamp01, rng, mergeGeos } = G.util;
  const scene = G.renderer.scene;
  const WORLD = W.tamano || 70;
  const TX = Object.assign({ pasto: 'assets/tex/pasto.jpg', suelo: 'assets/tex/suelo.jpg', palmaHoja: 'assets/tex/palma_hoja.png', palmaTronco: 'assets/tex/palma_tronco.jpg' }, W.texturas);

  // ---------- Relieve ----------
  const places = W.lugares || {};
  const TR = W.terreno || {};
  const ondas = TR.ondas || [], relieves = TR.relieves || [];
  const FN = { sin: Math.sin, cos: Math.cos };
  function rawHeight(x, z) {
    let h = 0;
    for (const o of ondas) h += FN[o.fn || 'sin'](o.xz != null ? (x + z) * o.xz : x * (o.x || 0) + z * (o.z || 0)) * o.amp;
    for (const r of relieves) {
      if (r.tipo === 'cauce') { const dr = Math.abs(x - r.x); if (dr < r.mitad) h -= (r.mitad - dr) * r.pendiente; }
      else { const d = Math.hypot(x - r.x, z - r.z); h += r.alto * Math.exp(-(d * d) / r.ancho); }
    }
    return h;
  }
  const FLATS = (TR.planos || []).map(k => ({ k, x: places[k].x, z: places[k].z, r: places[k].r, base: rawHeight(places[k].x, places[k].z) }));
  for (const f of FLATS) places[f.k].base = f.base;
  function height(x, z) {
    let h = rawHeight(x, z);
    for (const f of FLATS) {
      const d = Math.hypot(x - f.x, z - f.z);
      const t = Math.min(1, Math.max(0, (f.r + 4 - d) / 4));
      h = h + (f.base - h) * t * t * (3 - 2 * t);
    }
    return h;
  }
  // Suelo donde se para un personaje: el terreno o una plataforma (p. ej. un mirador)
  const plataformas = (W.plataformas || []).map(p => { const L = places[p.lugar] || p; return { x: L.x, z: L.z, r: p.r, alto: p.alto }; });
  function surfaceY(x, z) {
    const g = height(x, z);
    for (const p of plataformas) if (Math.hypot(x - p.x, z - p.z) < p.r) return Math.max(g, height(p.x, p.z) + p.alto);
    return g;
  }
  const nivel = W.agua && W.agua.nivel;
  const waterBase = nivel ? rawHeight(nivel.x, nivel.z) + nivel.sobre : -Infinity;
  const riverX = W.rio ? W.rio.x : null;

  // ---------- Suelo ----------
  const tPasto = G.assets.tex(TX.pasto), tSuelo = G.assets.tex(TX.suelo);
  // Suelo con UV de mundo; el color de vértice son pesos: r = arena, g = suelo de selva
  function groundMaterial(scale) {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { tPasto: { value: tPasto }, tSuelo: { value: tSuelo }, uScale: { value: scale } });
      sh.vertexShader = 'varying vec2 vTUv;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  vTUv = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = 'uniform sampler2D tPasto, tSuelo; uniform float uScale; varying vec2 vTUv;\n' + sh.fragmentShader.replace('#include <color_fragment>', [
        // texturas sRGB leídas a mano: se pasan a lineal como las demás
        'vec3 gP = pow(texture2D(tPasto, vTUv * 0.22 * uScale).rgb * 1.5, vec3(2.2));',
        'vec3 gS = pow(texture2D(tSuelo, vTUv * 0.3 * uScale).rgb * 1.15, vec3(2.2));',
        'vec3 sand = pow(vec3(0.86, 0.77, 0.55) * (0.88 + 0.2 * pow(gS.g, 0.4545)), vec3(2.2));',
        'diffuseColor.rgb *= mix(mix(gP, gS, vColor.g), sand, vColor.r);',
      ].join('\n'));
    };
    return m;
  }
  const tGeo = new THREE.PlaneGeometry(WORLD * 2 + 20, WORLD * 2 + 20, W.segmentos || 110, W.segmentos || 110);
  tGeo.rotateX(-Math.PI / 2);
  const tp = tGeo.attributes.position, colors = [];
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), y = height(x, z);
    tp.setY(i, y);
    let dirt = Math.max(0, Math.sin(x * 0.21 + Math.cos(z * 0.17) * 2) * Math.cos(z * 0.13 - x * 0.05) - 0.1) * 1.6;
    for (const f of FLATS) dirt = Math.max(dirt, clamp01((f.r + 1 - Math.hypot(x - f.x, z - f.z)) / 3) * 0.8);
    // Arena solo en la orilla del río; el resto de las zonas bajas queda con pasto
    const sand = riverX == null ? 0 : clamp01((waterBase + 0.5 - y) / 0.9) * clamp01((15 - Math.abs(x - riverX)) / 4);
    colors.push(sand, clamp01(dirt), 0);
  }
  tGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  tGeo.computeVertexNormals();
  scene.add(new THREE.Mesh(tGeo, groundMaterial(1)));

  // ---------- Árboles y palmas ----------
  const A = W.arboles || {};
  const colliders = G.fisica.colliders;
  const evitar = () => [].concat(typeof A.evitar === 'function' ? A.evitar(G.pack) : A.evitar || []);
  const treeSpots = [];
  if (A.cantidad) {
    const R = rng(A.semilla || 7);
    const pick = (G.pack.recursos || []).map(r => ({ x: r.x, z: r.z, r: A.margenObjetos || 3 }));
    const clear = pick.concat(evitar().map(e => ({ x: e.x, z: e.z, r: e.r || 3 })));
    for (let tries = 0; treeSpots.length < A.cantidad && tries < 4000; tries++) {
      const x = (R() * 2 - 1) * WORLD, z = (R() * 2 - 1) * WORLD;
      if (riverX != null && Math.abs(x - riverX) < (A.margenRio || 7)) continue;
      if (FLATS.some(f => Math.hypot(x - f.x, z - f.z) < f.r + 3)) continue;
      if (clear.some(r => Math.hypot(x - r.x, z - r.z) < r.r)) continue;
      treeSpots.push({ x, z, s: 0.8 + R() * 0.7 });
    }
  }
  const extra = (A.extra || []).map(t => Object.assign({}, t));
  const allTrees = treeSpots.concat(extra);
  // Dos de cada tres son palmas con la hoja y la corteza del mapa original; el resto, árboles de copa
  const every = A.copaCada || 3;
  const broad = allTrees.filter((t, i) => i % every === every - 1 || t.copa);
  const palms = allTrees.filter(t => !broad.includes(t));
  const m4 = new THREE.Matrix4();
  if (broad.length) {
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), new THREE.MeshLambertMaterial({ color: '#7a5634' }), broad.length);
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshLambertMaterial({ color: A.copaColor || '#2f7d43', flatShading: false }), broad.length);
    broad.forEach((t, i) => {
      const y = height(t.x, t.z);
      m4.makeScale(t.s, t.s, t.s).setPosition(t.x, y + 1.5 * t.s, t.z); trunks.setMatrixAt(i, m4);
      m4.makeScale(t.s * 1.2, t.s, t.s * 1.2).setPosition(t.x, y + 3.4 * t.s, t.z); crowns.setMatrixAt(i, m4);
    });
    scene.add(trunks, crowns);
  }
  for (const t of allTrees) colliders.push({ x: t.x, z: t.z, r: 0.6 * t.s, kind: 'tree' });
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
  if (palms.length) {
    const tHoja = G.assets.loader.load(TX.palmaHoja), tTronco = G.assets.tex(TX.palmaTronco);
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
  }

  // ---------- Océano, islas y bruma ----------
  const O = W.oceano;
  if (O) {
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(O.tamano || 600, O.tamano || 600), new THREE.MeshLambertMaterial({ color: O.color || '#3a87a8' }));
    ocean.rotation.x = -Math.PI / 2; ocean.position.y = O.y != null ? O.y : -2.6; scene.add(ocean);
  }
  const ISL = W.islas || {};
  const islas = ISL.lista || [];
  const seaY = O && O.y != null ? O.y : -2.6;
  const islandCones = islas.map(I => {
    const isl = new THREE.Mesh(new THREE.ConeGeometry(I.r, I.r * 0.7, 9), new THREE.MeshLambertMaterial({ color: '#4f8a52' }));
    isl.position.set(I.x, seaY + I.r * 0.3, I.z); scene.add(isl);
    return isl;
  });
  // Las islas usan el relieve de un .glb (el mapa 3D original en cap1); los conos quedan si no carga
  if (islas.length && ISL.modelo) {
    const M = ISL.modelo;
    G.assets.loadGLB(M.url, { b64: () => window[M.b64], script: M.script, base: M.base, error: 'isla no disponible' }).then(g => {
      let mesh = null; g.scene.updateMatrixWorld(true);
      g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
      if (!mesh) throw new Error('sin malla');
      return mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    }).then(geo => {
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
      islas.forEach((I, k) => {
        const m = new THREE.Mesh(geo, mat);
        const s = I.r * 3.6;
        m.scale.set(s, s * 1.8, s); m.rotation.y = k * 2.1 + 0.4;
        m.position.set(I.x, seaY - 0.4, I.z);
        scene.add(m); islandCones[k].visible = false;
      });
    }).catch(() => {});
  }
  const B = W.bruma;
  if (B) {
    const mist = new THREE.Mesh(new THREE.RingGeometry(B.dentro, B.fuera, 48), new THREE.MeshBasicMaterial({ color: B.color || '#fff3d6', transparent: true, opacity: B.opacidad != null ? B.opacidad : 0.35, side: THREE.DoubleSide, depthWrite: false }));
    mist.rotation.x = -Math.PI / 2; mist.position.y = B.y != null ? B.y : 1.5; scene.add(mist);
  }

  return { WORLD, places, rawHeight, height, surfaceY, flats: FLATS, waterBase, riverX, islas, trees: allTrees, groundMaterial };
});
