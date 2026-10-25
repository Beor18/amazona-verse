/* Amazona Verse · personaje 3D modular
   Carga el modelo con esqueleto (assets/models/vittata.glb, con el cargador único AVE.assets), crea instancias independientes,
   monta accesorios 3D en huesos de montaje y renderiza retratos idénticos para el juego y el cómic. */
(function () {
  'use strict';

  const MODEL_URL = 'assets/models/vittata.glb';
  const MOUNTS = ['mount_head_top', 'mount_eyes', 'mount_neck', 'mount_chest', 'mount_back', 'mount_wing_L', 'mount_wing_R'];
  // Dedos de las alas-mano (nombres de three, sin puntos): tres dedos por mano, dos falanges cada uno
  // Dedos de las patas (dos adelante y dos atrás por pie): con calzado se quedan en su pose de reposo dentro del zapato
  const TOES = ['pieL4', 'pieL5', 'pieL6', 'pieL7', 'pieL8', 'pieL8002', 'pieL4001', 'pieL5001', 'pieL6001', 'pieL7001', 'pieL8001', 'pieL8003'];
  // Calzado de Blender: la suela baja 6 mm de z=0 (para que los dedos no la atraviesen), así que el personaje sube 6 mm.
  // Pantalón: las alas se abren WING_CLEAR rad. Aletas: cadera abierta y punta hacia fuera (ejes medidos en el rig).
  const SWIM_BACK_SHIFT = 0.6;
  // Objetos largos en la mano y cuánto se abre el brazo izquierdo (rad) en los gestos que lo llevan a la cara
  const LONG_HAND = { bandera: 1, mapa: 1, martillo: 1 }, LONG_HAND_DANCE = 0.9;
  const SOLE_LIFT = 0.006, WING_CLEAR = 0.12, SPLAY = { axis: 'z', sign: 1, twist: 'y', tsign: 1, amount: 0.09 };
  // ---------- Animación procedural: ajuste fino (rol Movimiento y animación; docs/equipo/MOVIMIENTO.md) ----------
  // El juego pone en cada instancia, antes de update(dt): speed (m/s), gait, airborne, flying, legsDown (0..1), wingMode,
  // mouth (0..1 o null), lookAt (Vector3 del mundo o null), groundY + groundAt(x, z) (IK de patas), carry/reach/use (agarre.js).
  const ANIM = {
    strideWalk: 1.25,         // m recorridos por ciclo de paso (dos pasos): cadencia = velocidad / zancada, sin patinar
    strideRun: 3.0,           // m por saltito al correr (galope de ave con aleteo, patas juntas)
    cadence: [1.2, 6],        // Hz mínimo y máximo del paso
    walkRef: 6.5,             // velocidad de referencia para la amplitud del paso
    walkAmp: [0.35, 0.75],    // amplitud de la cadera (rad) de paso lento a paso rápido
    runAmp: 0.85,
    bobWalk: 0.05, bobRun: 0.12, // rebote del cuerpo (unidades del modelo)
    // Alas por modo: [apertura media, amplitud, frecuencia rad/s, barrido (-X adelanta)]; la bajada es más rápida que la subida
    wings: {
      idle: [0, 0.05, 2.2, 0], walk: [0.14, 0.05, 11, 0], hop: [0.55, 0.35, 0, 0],
      fly: [1.0, 0.55, 11, 0], flap: [0.95, 0.7, 18, 0], hover: [1.0, 0.62, 17, -0.15], takeoff: [0.95, 0.8, 15, -0.05],
      glide: [1.25, 0.05, 9, 0], land: [1.15, 0.22, 20, -0.55],
    },
    mouthMax: 0.4,            // apertura máxima del pico al hablar (rad; 0,35 ≈ 5,5 cm): algo más para que se lea de lejos
    lookMax: [1.05, 0.45],    // giro máximo de la cabeza al mirar a alguien (lado, arriba/abajo)
    footIK: 0.32,             // corrección máxima de cada pata en pendiente (unidades del modelo)
    // Posada en algo fino: cadera, patas juntas, rodilla, tobillo, dedos cerrados (rad) y cuánto baja el cuerpo (modelo)
    perch: { cadera: 0.15, juntas: 0.08, rodilla: 0.45, tobillo: 0.35, dedos: 0.6, bajar: 0.04 },
    agachada: { espalda: 1.0, pecho: 0.45, cabeza: 0.4, cadera: 0.45, rodilla: 0.7, tobillo: 0.5, bajar: 0.1 }, // de 1,75 a 0,81 m
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _bp = new THREE.Vector3(), _ep = new THREE.Vector3(), _tg = new THREE.Vector3();
  const _q = new THREE.Quaternion(), _qw = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qi = new THREE.Quaternion();
  const FINGERS = ['armL2002', 'armL2003', 'armL2004', 'armL2005', 'armL2006', 'armL2007',
    'armL2010', 'armL2011', 'armL2013', 'armL2014', 'armL2016', 'armL2017'];

  // Plumajes: base común del proyecto original con máscaras de color por especie (ver grupo_especies_referencia.jpg)
  const SPECIES = {
    vittata: { name: 'Vittata (verde clásico)', patch: '#d63a2f', ring: '#f4f4f0', wingTip: null },
    agilis: { name: 'Pico negro (agilis)', patch: '#2f9e44', ring: '#e9efe9', wingTip: '#c0392b', beak: '#3a3a36' },
    albifrons: { name: 'Frente blanca (albifrons)', patch: '#f4f4f0', ring: '#d63a2f', wingTip: null },
    amazonica: { name: 'Ala naranja (amazonica)', patch: '#2f6fd1', ring: '#f2c21a', wingTip: '#e8811a' },
    festiva: { name: 'Antifaz rojo y azul (festiva)', patch: '#c0392b', ring: '#3a6fc4', wingTip: '#3a6fc4' },
    oratrix: { name: 'Cabeza amarilla (oratrix)', patch: '#f2c21a', ring: '#f2c21a', wingTip: '#c0392b' },
    versicolor: { name: 'Antifaz azul (versicolor)', patch: '#2f5fd1', ring: '#2f5fd1', wingTip: '#2f5fd1' },
    guildingii: { name: 'Multicolor (guildingii)', patch: '#e6b422', ring: '#f4f4f0', wingTip: '#2f6fd1' },
  };

  // Seis accesorios modulares: ranura, hueso de montaje, colores y si es un sustituto pendiente de modelado
  const PALETTE = ['#f2a03d', '#d6403a', '#3d8fb0', '#2f8f4e', '#7a4fb3', '#5a3a22', '#e8c32a', '#2b2b2b'];
  const ACCESSORIES = [
    { id: 'gafas', slot: 'eyes', mount: 'mount_eyes', offset: [0, 0.09, 0.05], name: 'Gafas de inventor', colors: ['#5a3a22', '#2b2b2b', '#c9a227', '#3d8fb0'], placeholder: false },
    { id: 'sombrero', slot: 'head', mount: 'mount_head_top', offset: [0, -0.08, 0], name: 'Sombrero explorador', colors: ['#8a6a3a', '#5a3a22', '#2f8f4e', '#d6403a'], placeholder: false },
    { id: 'panuelo', slot: 'neck', mount: 'mount_neck', offset: [0, -0.1, 0], wrap: true, glb: 'panuelo', name: 'Pañuelo aventurero', colors: ['#f2a03d', '#3d8fb0', '#d6403a', '#2f8f4e', '#7a4fb3', '#e8c32a'], placeholder: false,
      styles: [['liso', 'Liso'], ['pr', 'Bandera PR'], ['coqui', 'Coquí'], ['caribe', 'Tropical'], ['camuflaje', 'Camuflaje']] },
    { id: 'brujula', slot: 'chest', mount: 'mount_chest', offset: [0, 0, 0.06], name: 'Brújula colgante', colors: ['#c9a227', '#b9c4c9', '#b87333'], placeholder: false },
    { id: 'mochila', slot: 'back', mount: 'mount_back', offset: [0, 0, -0.05], name: 'Mochila de exploración', colors: ['#8a5a2b', '#2f8f4e', '#3d8fb0', '#d6403a'], placeholder: true },
    { id: 'brazaletes', slot: 'wings', mount: 'mount_wing_L', mount2: 'mount_wing_R', offset: [0, -0.06, 0], size: 0.8, name: 'Brazaletes de constructor', colors: ['#c9a227', '#3d8fb0', '#d6403a', '#2b2b2b'], placeholder: false },
  ];
  // Ropero (wardrobe.js): gorras, ropa ajustada, calzado y objetos; se suman al catálogo base
  const BASE_IDS = ACCESSORIES.map(a => a.id);
  if (window.AVWardrobe) ACCESSORIES.push(...window.AVWardrobe.defs);
  const SLOTS = ['head', 'eyes', 'neck', 'torso', 'chest', 'back', 'wings', 'legs', 'feet', 'hand'];
  const styleOf = (def, s) => def.styles ? (def.styles.some(x => x[0] === s) ? s : def.styles[0][0]) : undefined;

  function defaultLook() {
    return { species: 'vittata', accessories: { neck: { id: 'panuelo', color: '#f2a03d' }, eyes: { id: 'gafas', color: '#5a3a22' } } };
  }
  function normalizeLook(look) {
    const out = defaultLook();
    if (!look) return out;
    if (SPECIES[look.species]) out.species = look.species;
    if (look.accessories && typeof look.accessories === 'object') {
      out.accessories = {};
      for (const slot of SLOTS) {
        const a = look.accessories[slot];
        const def = a && ACCESSORIES.find(x => x.id === a.id && x.slot === slot);
        if (def) {
          out.accessories[slot] = { id: def.id, color: def.colors.includes(a.color) ? a.color : def.colors[0] };
          if (def.styles) out.accessories[slot].style = styleOf(def, a.style);
        }
      }
    }
    return out;
  }

  // ---------- Carga compartida ----------
  let gltfPromise = null, mountsInfo = null, maskTexture = null;
  function loadGLTF() {
    if (gltfPromise) return gltfPromise;
    const info = fetch('assets/models/vittata_mounts.json').then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
      mountsInfo = j;
      if (!j || !j.masks) return null;
      return new Promise(res => new THREE.TextureLoader().load('assets/models/' + j.masks, t => { t.flipY = false; maskTexture = t; res(t); }, undefined, () => res(null)));
    });
    // Primero el .glb; si el host no lo sirve, el mismo modelo empaquetado en vittata_glb.js (cargador único del motor)
    gltfPromise = info.then(() => window.AVE.assets.loadGLB(MODEL_URL, {
      b64: () => window.AV_MODEL_B64, script: 'assets/models/vittata_glb.js', base: 'assets/models/', error: 'modelo no disponible',
    }));
    return gltfPromise;
  }

  // ---------- Ropa modelada en Blender (assets/models/ropa/<nombre>.glb, o su copia base64 en <nombre>_glb.js) ----------
  const ropaCache = {};
  function loadRopa(name) {
    if (ropaCache[name] && ropaCache[name].then) return ropaCache[name];
    const p = window.AVE.assets.loadGLB('assets/models/ropa/' + name + '.glb', {
      b64: () => window.AV_ROPA_B64 && window.AV_ROPA_B64[name], script: 'assets/models/ropa/' + name + '_glb.js',
      base: 'assets/models/ropa/', error: 'ropa no disponible',
    }).then(g => { prepRopa(g, name); ropaCache[name] = g; return g; }, () => { ropaCache[name] = 'error'; });
    ropaCache[name] = p;
    return p;
  }
  // Una vez por .glb cargado (la geometría y los materiales se comparten entre personajes):
  // - UV de TELA/PAJA: el exportador glTF invierte V y cyl_uv corre U al revés que el lienzo de los estampados, así que el
  //   diseño salía girado 180° (787 cabeza abajo, la bandera con el triángulo a la derecha). Se gira de vuelta.
  // - Colores fijos (CUERO, SUELA, GOMA, MADERA…): de la aproximación gamma 2,2 a la curva sRGB exacta.
  // - Normales: Blender ya exporta shade smooth; si alguna primitiva llega sin normales se calculan.
  function prepRopa(g, name) {
    let patch = false; g.scene.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (/^BANDERA/.test(m.name)) patch = true; });
    g.scene.traverse(o => { if (o.geometry) o.geometry.userData.avFlagPatch = patch; });
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const geo = o.geometry, mats = Array.isArray(o.material) ? o.material : [o.material];
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.userData.avSmooth) { geo.userData.avSmooth = true; smoothByAngle(geo, 45); }
      if (!geo.userData.avUv && geo.attributes.uv && mats.some(m => /^(TELA|PAJA)/.test(m.name))) {
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i));
        geo.userData.avUv = true;
        uvMetric(geo, name, mats.find(m => /^(TELA|PAJA)/.test(m.name)));
        uv.needsUpdate = true;
      }
      for (const m of mats) if (!/^(TELA|PAJA|ACENTO|BANDERA)/.test(m.name) && window.AVColor) window.AVColor.fixGamma22(m);
    });
  }
  // UV métricas: el lienzo de los estampados (512×256 lógicos) mide 1,2 × 0,6 m sobre CUALQUIER prenda, con el frente (o el
  // centro de la zona de la bandera) en (0,5, 0,5). Así flores, camuflaje y coquíes salen del mismo tamaño en camisa, gorra y
  // tenis, sin estirarse, y la bandera se dibuja del tamaño de cada pieza. Los .glb ya métricos (material extras.av_uv) no se
  // tocan. En piezas que dan la vuelta (cyl_uv) la escala en U se redondea a vueltas enteras: la costura de atrás no se corta.
  // Alto de la bandera por pieza (m): extras.av_flag_h del material, esta tabla o el 70 % del alto visible de la pieza.
  const FLAG_H = { camisa: 0.15, gorra: 0.11, panuelo: 0.075, botas_tenis_pr: 0.06 };
  function uvMetric(geo, name, mat) {
    const P = geo.attributes.position, UV = geo.attributes.uv, I = geo.index, CM = (window.AVWardrobe && window.AVWardrobe.CANVAS_M) || [1.2, 0.6];
    const tri = I ? I.count / 3 : P.count / 3, at = (t, k) => I ? I.getX(t * 3 + k) : t * 3 + k;
    let umin = 1e9, umax = -1e9; for (let i = 0; i < UV.count; i++) { const u = UV.getX(i); umin = Math.min(umin, u); umax = Math.max(umax, u); }
    const wraps = umax - umin > 0.9, mu = [], mv = [], vs = [], us = [], side = [];
    const fn = new THREE.Vector3();
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), Ju = new THREE.Vector3(), Jv = new THREE.Vector3();
    for (let t = 0; t < tri; t++) {
      const a = at(t, 0), b = at(t, 1), c = at(t, 2);
      const u0 = UV.getX(a), v0 = UV.getY(a), du1 = UV.getX(b) - u0, dv1 = UV.getY(b) - v0, du2 = UV.getX(c) - u0, dv2 = UV.getY(c) - v0;
      const det = du1 * dv2 - du2 * dv1; if (Math.abs(det) < 1e-9) continue;
      if (wraps && Math.abs((u0 + du1 / 3 + du2 / 3) - 0.5) > 0.12) continue;     // solo el frente (u ≈ 0,5)
      p0.fromBufferAttribute(P, a); p1.fromBufferAttribute(P, b).sub(p0); p2.fromBufferAttribute(P, c).sub(p0);
      Ju.copy(p1).multiplyScalar(dv2).addScaledVector(p2, -dv1).divideScalar(det);
      Jv.copy(p2).multiplyScalar(du1).addScaledVector(p1, -du2).divideScalar(det);
      mu.push(Ju.length()); mv.push(Jv.length()); vs.push(v0 + dv1 / 3 + dv2 / 3); us.push(u0 + du1 / 3 + du2 / 3);
      fn.crossVectors(p1, p2).normalize(); if (Math.abs(fn.y) < 0.55) side.push(v0 + dv1 / 3 + dv2 / 3);   // pared casi vertical
    }
    if (mu.length < 4) return;
    const med = arr => arr.slice().sort((x, y) => x - y)[arr.length >> 1];
    // centro vertical: el de las paredes casi verticales del frente (en un zapato, el lateral y no el empeine)
    const sv = side.length >= 20 ? side : vs;
    const MU = med(mu), MV = med(mv), vc = med(sv), vlo = Math.min(...sv), vhi = Math.max(...sv);
    if (!(mat && mat.userData && mat.userData.av_uv)) {
      const ku = wraps ? Math.max(1, Math.round(MU / CM[0])) : MU / CM[0], kv = MV / CM[1], uc = wraps ? 0.5 : med(us);
      for (let i = 0; i < UV.count; i++) UV.setXY(i, 0.5 + (UV.getX(i) - uc) * ku, 0.5 + (UV.getY(i) - vc) * kv);
      geo.userData.avMetric = { mu: MU / ku, mv: CM[1] };     // metros por unidad de UV tras normalizar
    } else geo.userData.avMetric = { mu: CM[0], mv: CM[1] };
    // Bandera: alto en metros → px lógicos del lienzo (el ancho, 1,5 × alto real, según los metros por unidad de U de la pieza)
    const visH = (vhi - vlo) * MV;
    const fh = (mat && mat.userData && mat.userData.av_flag_h) || FLAG_H[name] || Math.min(0.2, Math.max(0.05, visH * 0.7));
    geo.userData.avFlag = { h: fh / geo.userData.avMetric.mv * 256, w: fh * 1.5 / geo.userData.avMetric.mu * 512, m: +fh.toFixed(3) };
  }
  // Piezas exportadas con sombreado plano (cada triángulo con sus propios vértices: se ven facetadas, como los objetos de
  // mano y la mochila PR): se suavizan por ángulo como "shade smooth by angle" de Blender. Las aristas de más de `deg`
  // grados (bordes de caja, filos) se quedan vivas. Las piezas ya suavizadas (vértices compartidos) no se tocan.
  function smoothByAngle(geo, deg) {
    const P = geo.attributes.position, I = geo.index, n = P.count, cosT = Math.cos(deg * Math.PI / 180);
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const k = Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4);
      let g = groups.get(k); if (!g) groups.set(k, g = []); g.push(i);
    }
    if (n / groups.size < 2.2) return false;
    const fn = new Float32Array(n * 3), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const tri = I ? I.count / 3 : n / 3;
    for (let t = 0; t < tri; t++) {
      const i0 = I ? I.getX(t * 3) : t * 3, i1 = I ? I.getX(t * 3 + 1) : t * 3 + 1, i2 = I ? I.getX(t * 3 + 2) : t * 3 + 2;
      a.fromBufferAttribute(P, i0); b.fromBufferAttribute(P, i1); c.fromBufferAttribute(P, i2);
      c.sub(b); a.sub(b); c.cross(a); // normal × 2·área
      for (const i of [i0, i1, i2]) { fn[i * 3] += c.x; fn[i * 3 + 1] += c.y; fn[i * 3 + 2] += c.z; }
    }
    const unit = i => { const l = Math.hypot(fn[i * 3], fn[i * 3 + 1], fn[i * 3 + 2]) || 1; return [fn[i * 3] / l, fn[i * 3 + 1] / l, fn[i * 3 + 2] / l]; };
    const N = geo.attributes.normal;
    for (const g of groups.values()) {
      const U = g.map(unit);
      g.forEach((i, k) => {
        let x = 0, y = 0, z = 0;
        g.forEach((j, m) => { if (U[k][0] * U[m][0] + U[k][1] * U[m][1] + U[k][2] * U[m][2] >= cosT) { x += fn[j * 3]; y += fn[j * 3 + 1]; z += fn[j * 3 + 2]; } });
        const l = Math.hypot(x, y, z) || 1; N.setXYZ(i, x / l, y / l, z / l);
      });
    }
    N.needsUpdate = true;
    return true;
  }
  // Material por nombre (ver tools/blender/ropa_lib.py): TELA = color/estampado elegido, ACENTO = 2.º color, PAJA = paja
  // (three r128: una malla con piel necesita material.skinning = true; si no, se dibuja quieta en pose T)
  const skinCache = {};
  if (window.AVWardrobe && window.AVWardrobe.onEvict) window.AVWardrobe.onEvict(key => { delete skinCache['tela' + key]; });
  // Estilo de la pieza → estampado de su TELA (la criolla lleva copa de paja; la playera, tropical; tenis y mochila PR, bandera).
  // Un estilo que no es estampado (aventura, militar…) deja la TELA lisa del color elegido.
  const TELA_STYLE = { criolla: 'paja', playera: 'caribe', tenis_pr: 'pr', mochila_pr: 'pr' };
  // Modelo de Blender para la pieza y estilo: def.glb es un nombre o un mapa estilo → nombre (sin entrada = versión simple)
  function glbName(def, style) {
    if (!def.glb) return null;
    if (typeof def.glb === 'string') return def.glb;
    return def.glb[style] || def.glb['*'] || null;
  }
  // morph: la malla trae morph targets (el pañuelo, con su forma 'camisa'); en r128 el material debe declararlo
  function ropaMaterial(m, color, style, morph, geo) {
    const W = window.AVWardrobe;
    let base = m, key = null;
    if (/^TELA/.test(m.name) && W) {
      let st = TELA_STYLE[style] || style;
      if (!W.isPattern(st) || (st === 'pr' && geo && geo.userData.avFlagPatch)) st = 'liso';  // con parche plano, la tela va lisa
      const c = st === 'paja' ? '#d9b56a' : color, flag = st === 'pr' && geo ? geo.userData.avFlag : null;
      base = W.cloth(st, c, flag); key = 'tela' + st + c + (st === 'pr' ? W.flagKey(flag) : '');
    }
    else if (/^PAJA/.test(m.name) && W) { base = W.cloth('paja', '#d9b56a'); key = 'telapaja#d9b56a'; }
    else if (/^BANDERA/.test(m.name) && W) { base = W.flagMat(); key = 'bandera'; }   // parche plano: bandera fiel 3:2
    else if (/^ACENTO/.test(m.name)) { base = m.clone(); window.AVColor.set(base.color, color); }
    else if (/^VIDRIO/.test(m.name)) { base = m.clone(); base.transparent = true; base.opacity = Math.min(base.opacity, 0.55); base.depthWrite = false; }
    if (key && morph) key += '|morph';
    if (key && skinCache[key]) return skinCache[key];
    const s = base === m ? m.clone() : base.clone();
    s.skinning = true; s.morphTargets = !!morph;
    if (base.onBeforeCompile && base.userData.triplanar) { s.onBeforeCompile = base.onBeforeCompile; s.customProgramCacheKey = base.customProgramCacheKey; } // clone() no los copia
    if (key) { skinCache[key] = s; s.userData.shared = true; }
    return s;
  }
  const HEAD_R = () => (mountsInfo && mountsInfo.head_sphere && mountsInfo.head_sphere.radius) || 0.5104;
  // ---------- Geometría de accesorios (piezas simples, materiales reutilizables) ----------
  const matCache = {};
  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache[key]) { matCache[key] = window.AVColor.make(THREE.MeshStandardMaterial, Object.assign({ color, roughness: 0.6, metalness: 0.05 }, opts || {})); matCache[key].userData.shared = true; }
    return matCache[key];
  }
  // Libera la GPU de una pieza quitada: geometría propia y materiales sin caché. Las texturas están todas en caché
  // (estampados, banderas, parches) y la ropa de Blender comparte geometría con el modelo cargado: esas se conservan.
  function disposeObject(obj, sharedGeometry) {
    obj.traverse(o => {
      if (o.isSkinnedMesh && o.skeleton && o.userData.isAccessory) o.skeleton.dispose();
      if (o.geometry && !sharedGeometry) o.geometry.dispose();
      if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (!m.userData.shared) m.dispose();
    });
  }
  function unmountSlot(ch, slot) {
    const m = ch.mounted[slot]; if (!m) return;
    for (const obj of m.objects) { if (obj.parent) obj.parent.remove(obj); disposeObject(obj, !!m.blender); }
    delete ch.mounted[slot];
  }
  // Todas las medidas en unidades de "radio de cabeza" (R); se escalan al montar
  function buildAccessory(id, color, style) {
    const def = ACCESSORIES.find(a => a.id === id);
    if (def && def.fit) {
      // Pieza ajustada: para la miniatura se juntan todas sus partes en el espacio del modelo
      const g = new THREE.Group(); g.name = 'acc_' + id;
      for (const p of def.fit(color, styleOf(def, style))) g.add(p.obj);
      g.traverse(o => { if (o.isMesh) o.userData.isAccessory = true; });
      return g;
    }
    if (def && def.build) {
      // Pieza del ropero en metros: se lleva a "radios de cabeza" como las demás
      const g = new THREE.Group(); g.name = 'acc_' + id;
      const inner = def.build(color, styleOf(def, style)); inner.scale.setScalar(1 / HEAD_R()); g.add(inner);
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.isAccessory = true; } });
      return g;
    }
    const g = new THREE.Group(); g.name = 'acc_' + id;
    const pat = style && style !== 'liso' && window.AVWardrobe;
    const M = pat ? window.AVWardrobe.cloth(style, color) : mat(color), dark = mat('#2b2016', { roughness: 0.5 }), metal = mat('#c9d4d9', { metalness: 0.7, roughness: 0.3 });
    if (id === 'gafas') {
      const lens = window.AVColor.make(THREE.MeshPhysicalMaterial, { color: '#bfe8ff', transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.1 });
      for (const x of [-0.37, 0.37]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 28), M); rim.position.set(x, 0, 0); g.add(rim);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 24, 1, true), M); cup.rotation.x = Math.PI / 2; cup.position.set(x, 0, -0.04); g.add(cup);
        const l = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), lens); l.position.set(x, 0, 0.01); g.add(l);
      }
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 6, 14, Math.PI), M); bridge.position.y = 0.08; g.add(bridge);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 40, Math.PI * 1.25), dark); strap.rotation.set(Math.PI / 2, 0, Math.PI * 0.375); strap.position.z = -0.45; g.add(strap);
    } else if (id === 'sombrero') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.42, 28), M); crown.position.y = 0.2; g.add(crown);
      const dent = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3), M); dent.position.y = 0.32; dent.scale.y = 0.5; g.add(dent);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.04, 36), M); brim.position.y = 0.0; g.add(brim);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.505, 0.505, 0.08, 28, 1, true), dark); band.position.y = 0.06; g.add(band);
    } else if (id === 'panuelo') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.11, 10, 36), M); ring.rotation.x = Math.PI / 2; g.add(ring);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 3), M); knot.position.set(0, -0.25, 0.48); knot.rotation.set(Math.PI + 0.25, 0, 0); g.add(knot);
    } else if (id === 'brujula') {
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 30, Math.PI), dark); cord.rotation.z = Math.PI; cord.position.y = 0.42; g.add(cord);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24), M); body.rotation.x = Math.PI / 2; g.add(body);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.135, 24), mat('#f4f1e6')); face.position.z = 0.032; g.add(face);
      const needle = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.2, 4), mat('#d6403a')); needle.position.z = 0.04; needle.rotation.z = 0.5; g.add(needle);
    } else if (id === 'mochila') {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.32), M); pack.position.z = -0.16; g.add(pack);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.26, 0.34), mat('#5a3a22')); flap.position.set(0, 0.26, -0.15); g.add(flap);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.72, 16), mat('#7a5634')); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.44, -0.2); g.add(roll);
      for (const x of [-0.2, 0.2]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.04), dark); st.position.set(x, 0, 0.02); g.add(st); }
      g.userData.placeholder = true;
    } else if (id === 'brazaletes') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 24), M); band.rotation.y = Math.PI / 2; g.add(band);
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), metal); stud.position.set(0, 0.16, 0); g.add(stud);
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.isAccessory = true; } });
    return g;
  }

  // ---------- Párpados: forma medida de los ojos pintados (la misma para todos los personajes) ----------
  // Para cada ojo se ajusta una esfera a su abombamiento (h = h0 − ρ²/2R a lo largo de la normal) con los vértices del
  // cuerpo en reposo, y se construye el párpado como un trozo de esfera 2,5 mm por fuera, más un labio en el borde libre.
  let lidFit = null;
  function measureEyes(root, E) {
    const meshes = []; root.traverse(o => { if (o.isSkinnedMesh && !o.userData.isAccessory) meshes.push(o); });
    if (!meshes.length) return null;
    const out = {}, v = new THREE.Vector3();
    for (const k of ['L', 'R']) {
      const c = new THREE.Vector3().fromArray(E[k].center), n = new THREE.Vector3().fromArray(E[k].normal).normalize();
      const x = new THREE.Vector3(0, 1, 0).cross(n).normalize(), y = n.clone().cross(x);
      const bins = new Array(11).fill(-1), pts = [];
      for (const o of meshes) {
        const p = o.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
          const d = v.clone().sub(c), h = d.dot(n); if (h < -0.03 || h > 0.08) continue;
          const rho = Math.hypot(d.dot(x), d.dot(y)); if (rho > 0.065) continue;
          pts.push(v.clone());
          const b = Math.round(rho / 0.005); if (b < bins.length) bins[b] = Math.max(bins[b], h);
        }
      }
      // mínimos cuadrados de h frente a ρ² (contorno exterior por anillos de 5 mm)
      let sx = 0, sy = 0, sxx = 0, sxy = 0, cnt = 0;
      bins.forEach((h, b) => { if (h < -0.5) return; const X = (b * 0.005) ** 2; sx += X; sy += h; sxx += X * X; sxy += X * h; cnt++; });
      const slope = (cnt * sxy - sx * sy) / Math.max(1e-12, cnt * sxx - sx * sx), h0 = (sy - slope * sx) / cnt;
      const Rs = Math.min(0.2, Math.max(0.05, -1 / (2 * Math.min(-1e-6, slope))));
      const c0 = c.clone().addScaledVector(n, h0 - Rs);
      let RL = Rs;
      const rEye = E[k].radius * 0.92;
      for (const q of pts) { const d = q.clone().sub(c), h = d.dot(n); if (h > 0 && Math.hypot(d.dot(x), d.dot(y)) < rEye) RL = Math.max(RL, q.distanceTo(c0)); }
      RL += 0.0025;
      const th = Math.asin(Math.min(0.97, E[k].radius / Rs)), alpha = th + 0.14, beta = th + 0.16;
      out[k] = { c0, x, y, n, RL, th, alpha, shell: lidShell(RL, alpha, beta), lip: lidLip(RL, alpha, beta) };
    }
    return out;
  }
  const lidDir = (t, s) => new THREE.Vector3(Math.sin(s), Math.sin(t) * Math.cos(s), Math.cos(t) * Math.cos(s));
  // Trozo de esfera: t (elevación) de −alpha (borde libre, abajo) a +alpha; s (lado) de −beta a +beta. Normales hacia fuera.
  function lidShell(R, alpha, beta, NT, NS) {
    NT = NT || 16; NS = NS || 28;
    const pos = [], nor = [], idx = [];
    for (let i = 0; i <= NT; i++) for (let j = 0; j <= NS; j++) {
      const d = lidDir(-alpha + 2 * alpha * i / NT, -beta + 2 * beta * j / NS);
      pos.push(d.x * R, d.y * R, d.z * R); nor.push(d.x, d.y, d.z);
    }
    for (let i = 0; i < NT; i++) for (let j = 0; j < NS; j++) {
      const a = i * (NS + 1) + j, b = a + 1, c = a + NS + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx); return g;
  }
  // Labio del borde libre: tubo fino que sigue el borde (t = −alpha)
  function lidLip(R, alpha, beta) {
    const pts = []; for (let j = 0; j <= 24; j++) pts.push(lidDir(-alpha, -beta + 2 * beta * j / 24).multiplyScalar(R + 0.0012));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0032, 8, false);
  }

  // ---------- Instancia de personaje ----------
  class Character {
    constructor(gltf) {
      this.root = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
      this.root.name = 'personaje';
      this.bones = {};
      this.materials = {};
      this.root.traverse(o => {
        if (o.isBone) this.bones[o.name] = o;
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
          o.material = Array.isArray(o.material) ? o.material.map(m => this._own(m)) : this._own(o.material);
        }
      });
      this.root.updateMatrixWorld(true);
      this.restQuat = {};
      const qRoot = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
      for (const n of MOUNTS) if (this.bones[n]) this.restQuat[n] = qRoot.clone().multiply(this.bones[n].getWorldQuaternion(new THREE.Quaternion()));
      // Matriz de reposo de cada hueso respecto al personaje: la ropa ajustada se construye en ese espacio
      const rootInv = this.root.matrixWorld.clone().invert();
      this.restMat = {};
      for (const [n, b] of Object.entries(this.bones)) this.restMat[n] = rootInv.clone().multiply(b.matrixWorld);
      const box = new THREE.Box3().setFromObject(this.root);
      this.height = box.getSize(new THREE.Vector3()).y || 1;
      this.mixer = new THREE.AnimationMixer(this.root);
      this.clips = {};
      for (const c of gltf.animations) this.clips[c.name] = c;
      this.actions = {};
      this.current = null;
      this.mounted = {};
      this.headR = (mountsInfo && mountsInfo.head_sphere && mountsInfo.head_sphere.radius) || this.height * 0.2;
      this.look = defaultLook();
      this.lids = this._buildLids();
      // Pose de reposo de los dedos de las patas y nodo del esqueleto (para levantar al personaje el grosor de la suela)
      this.toeRest = {}; for (const n of TOES) if (this.bones[n]) this.toeRest[n] = this.bones[n].rotation.clone();
      this.rigNode = this.root.children.find(c => { let b = false; c.traverse(o => { if (o.isBone) b = true; }); return b; }) || null;
      this.rigY = this.rigNode ? this.rigNode.position.y : 0;
      this.fitAdj = {};
      this.expression = 'neutral'; this.talking = false;
      this.anchors = this._buildAnchors();
      this.ikSaved = [];
      if (this.clips.Idle) this.play('Idle');
    }
    // Anclas para llevar cosas (agarre.js): puntos del modelo en reposo, derechos y a escala del personaje, que siguen a su hueso.
    // manoL/manoR: palma de cada ala-mano; pico: entre las puntas del pico (en la cabeza: abrir el pico no lo suelta);
    // pecho: delante del pecho (carga con los dos brazos); patas: entre las patas (lo que lleva volando, como las aves).
    // También mide hacia dónde gira la cabeza (signos de los ejes) para mirar a quien habla.
    _buildAnchors() {
      const A = {}, inv = new THREE.Matrix4(), m = new THREE.Matrix4();
      const mk = (name, bone, p) => {
        const b = this.bones[bone], rest = this.restMat[bone]; if (!b || !rest) return;
        const o = new THREE.Object3D(); o.name = 'ancla_' + name;
        inv.copy(rest).invert(); m.makeTranslation(p[0], p[1], p[2]); inv.multiply(m);
        inv.decompose(o.position, o.quaternion, o.scale);
        b.add(o); A[name] = o;
      };
      mk('manoL', 'armL2', [0.66, 0.688, 0.05]); mk('manoR', 'armL2001', [-0.66, 0.688, 0.05]);
      mk('pico', 'cabeza001', [0, 0.9, 0.4]); mk('pecho', 'espalda2', [0, 0.5, 0.25]); mk('patas', 'espalda1', [0, 0.1, 0.08]);
      // Pies (bola del pie) para el IK de patas
      this.feet = [['pieL4', ['pieL1', 'pieL2', 'pieL3']], ['pieL4001', ['pieL1001', 'pieL2001', 'pieL3001']]]
        .filter(([f, ch]) => this.bones[f] && ch.every(n => this.bones[n])).map(([f, ch]) => ({ eff: this.bones[f], chain: ch.map(n => this.bones[n]) }));
      // Signos medidos de la cabeza: girar en +Y lleva el pico hacia ±X; inclinar en +X lo baja o lo sube
      const head = this.bones.cabeza, tip = A.pico;
      this.headSign = { yaw: 1, pitch: 1 };
      if (head && tip) {
        const at = () => { this.root.updateMatrixWorld(true); return this.root.worldToLocal(tip.getWorldPosition(new THREE.Vector3())); };
        const p0 = at(); head.rotation.y += 0.3; const p1 = at(); head.rotation.y -= 0.3; head.rotation.x += 0.3; const p2 = at(); head.rotation.x -= 0.3;
        this.root.updateMatrixWorld(true);
        this.headSign.yaw = p1.x > p0.x ? 1 : -1; this.headSign.pitch = p2.y < p0.y ? 1 : -1; // pitch: +1 si +X baja el pico
      }
      return A;
    }
    // Párpados: casquete esférico que se desliza sobre el ojo pintado como un párpado real (gira alrededor del eje
    // horizontal del ojo, centrado en la curvatura medida del ojo). Abierto, el casquete queda pasado el borde de arriba,
    // por debajo de la superficie de la cabeza (oculto: nada flota); cerrado, cubre el ojo entero. Lleva el color del anillo
    // del ojo de la especie y un labio algo más oscuro en el borde, que es lo que se lee al parpadear.
    _buildLids() {
      const head = this.bones.cabeza001, E = mountsInfo && mountsInfo.eye_lids;
      if (!head || !E) return [];
      this.root.updateMatrixWorld(true);
      const fit = lidFit || (lidFit = measureEyes(this.root, E));
      if (!fit) return [];
      const C = window.AVColor;
      this.lidMat = { skin: C.make(THREE.MeshStandardMaterial, { color: '#f4f4f0', roughness: 0.55 }), lip: C.make(THREE.MeshStandardMaterial, { color: '#f4f4f0', roughness: 0.6 }) };
      const qHeadInv = head.getWorldQuaternion(new THREE.Quaternion()).invert(), ws = head.getWorldScale(new THREE.Vector3());
      return ['L', 'R'].map(k => {
        const F = fit[k];
        const pivot = new THREE.Object3D(); pivot.name = 'parpado_' + k;
        pivot.position.copy(head.worldToLocal(F.c0.clone()));
        pivot.quaternion.copy(qHeadInv.clone().multiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F.x, F.y, F.n))));
        pivot.scale.set(1 / ws.x, 1 / ws.y, 1 / ws.z);
        const lid = new THREE.Group();
        lid.add(new THREE.Mesh(F.shell, this.lidMat.skin), new THREE.Mesh(F.lip, this.lidMat.lip));
        lid.children.forEach(m => { m.castShadow = false; m.receiveShadow = false; });
        lid.userData.fit = F;
        pivot.add(lid); head.add(pivot);
        this._lid(lid, 0.05);
        return lid;
      });
    }
    // Cierre del párpado: 0 abierto (oculto) … 1 cerrado. El borde libre baja de forma lineal por la altura del ojo.
    _lid(lid, v) {
      const F = lid.userData.fit, m = 0.1;
      const edge = (F.th + m) - v * (2 * F.th + 2 * m);
      lid.rotation.x = -(edge + F.alpha);
      lid.visible = v > 0.02;
    }
    _own(m) {
      const c = m.clone(); this.materials[m.name] = c; c.userData.base = c.color ? c.color.clone() : null;
      if (maskTexture && c.map) this._addMaskTint(c);
      return c;
    }
    // Recolor por especie con la máscara (R parche, G anillo de ojos, B pico): conserva el detalle de la textura original
    _addMaskTint(m) {
      const u = this.tint || (this.tint = {
        maskMap: { value: maskTexture },
        patchColor: { value: window.AVColor.lin('#d63a2f') }, ringColor: { value: window.AVColor.lin('#f4f4f0') }, beakColor: { value: window.AVColor.lin('#f2a23a') },
        tintOn: { value: new THREE.Vector3(0, 0, 0) },
      });
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, u);
        sh.fragmentShader = 'uniform sampler2D maskMap; uniform vec3 patchColor; uniform vec3 ringColor; uniform vec3 beakColor; uniform vec3 tintOn;\n' +
          sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
            vec4 mk = texture2D(maskMap, vUv);
            float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float shade = clamp(0.55 + lum * 0.7, 0.0, 1.25);
            diffuseColor.rgb = mix(diffuseColor.rgb, patchColor * shade, mk.r * tintOn.x);
            diffuseColor.rgb = mix(diffuseColor.rgb, ringColor * shade, mk.g * tintOn.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, beakColor * shade, mk.b * tintOn.z);`);
      };
      m.customProgramCacheKey = () => 'avmask';
      m.needsUpdate = true;
    }
    missingMounts() { return MOUNTS.filter(n => !this.bones[n]); }
    play(name, once) {
      const clip = this.clips[name]; if (!clip) return false;
      const a = this.actions[name] || (this.actions[name] = this.mixer.clipAction(clip));
      if (once) {
        a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false;
        if (this.current) this.current.crossFadeTo(a, 0.25, false);
        a.play();
        const back = e => { if (e.action === a) { this.mixer.removeEventListener('finished', back); this.play('Idle'); } };
        this.mixer.addEventListener('finished', back);
      } else {
        a.reset(); a.setLoop(THREE.LoopRepeat, Infinity);
        if (this.current && this.current !== a) this.current.crossFadeTo(a, 0.3, false);
        a.play(); this.current = a;
      }
      return true;
    }
    // wingMode: 'idle' | 'walk' | 'flap' (subiendo) | 'glide' (planeando) | 'fly' (crucero) | 'hover' (cernido) | 'takeoff'
    // (despegue) | 'land' (frena para aterrizar) | 'swim' | 'dive'. Se suma encima del clip activo (ver ANIM.wings).
    // El mixer solo reescribe un hueso cuando el valor del clip cambia, así que los ajustes del cuadro
    // anterior se deshacen antes de mezclar; si no, se acumulan y el cuerpo termina girado (el IK se deshace igual).
    update(dt) {
      this._restoreIK();
      for (const [bone, ax, v] of this.ofs || []) bone.rotation[ax] -= v;
      this.ofs = [];
      this._gaitPhase(dt);
      this.mixer.update(dt);
      const L = this.bones.armL1, R = this.bones.armL1001;
      if (!L || !R) return;
      const t = this.wingT = (this.wingT || 0) + dt;
      let mode = this.wingMode || 'idle';
      if (mode === 'walk' && (this.gait || 0) > 1.5 && !this.swimming) mode = 'hop'; // corriendo: saltitos con las alas a medio abrir
      if (this.carry && this.carry !== 'pico' && (mode === 'walk' || mode === 'idle' || mode === 'hop')) mode = 'idle';
      // Nado de ave real: las dos alas reman a la vez sobre el agua. Fase de empuje (sin>0): abiertas y hacia atrás;
      // recuperación: cerradas, codo doblado y hacia adelante. swimRate (Hz) lo pone el juego: lento quieto, más rápido avanzando.
      if (mode === 'swim' || mode === 'dive') {
        this.sPh = ((this.sPh || 0) + dt * (this.swimRate || 0.7) * Math.PI * 2) % (Math.PI * 2);
      }
      const sS = Math.sin(this.sPh || 0), sC = Math.cos(this.sPh || 0);
      const k = 1 - Math.exp(-dt * 12);
      // Aleteo con fase propia (la frecuencia cambia sin saltos) y bajada rápida: s = sin(φ + 0,4·sin φ)
      const Wd = ANIM.wings[mode] || ANIM.wings.idle;
      this.flRate = (this.flRate || Wd[2]) + (Wd[2] - (this.flRate || Wd[2])) * k;
      this.flPh = ((this.flPh || 0) + dt * this.flRate) % (Math.PI * 2);
      const fs = mode === 'hop' ? Math.cos(this.ph || 0) : Math.sin(this.flPh + 0.4 * Math.sin(this.flPh));
      let center = Wd[0], amp = Wd[1], sweep = Wd[3];
      if (mode === 'swim') { center = 0.62; amp = 0.3; } else if (mode === 'dive') { center = -0.05; amp = 0; }
      const swing = mode === 'walk' ? 0.3 * Math.sin(this.ph || 0) * (this.gW || 0) : 0;   // alterno, en fase con el paso
      const reach = mode === 'swim' ? 0.55 * sC : mode === 'dive' ? 0.45 : 0;  // a la vez (remar / pegadas al bucear)
      this.wOpen = (this.wOpen || 0) + (center - (this.wOpen || 0)) * k;
      this.wAmp = (this.wAmp || 0) + (amp - (this.wAmp || 0)) * k;
      this.wSweep = (this.wSweep || 0) + (sweep - (this.wSweep || 0)) * k;
      this.wSwing = (this.wSwing || 0) + (swing - (this.wSwing || 0)) * k;
      this.wReach = (this.wReach || 0) + (reach - (this.wReach || 0)) * k;
      const open = this.wOpen + this.wAmp * (mode === 'swim' ? sS : fs);
      this.rot(L, "z", open); this.rot(R, "z", -open);
      this.rot(L, "x", this.wSwing + this.wReach + this.wSweep); this.rot(R, "x", -this.wSwing + this.wReach + this.wSweep);
      if (mode === 'swim') for (const el of ['armL2', 'armL2001']) if (this.bones[el]) this.rot(this.bones[el], "x", 0.15 + 0.6 * Math.max(0, -sS));
      // Sacudirse el agua al salir: temblor rápido de cuerpo, cabeza y alas
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const env = Math.sin(Math.min(1, this.shakeT / 0.7) * Math.PI), q = Math.sin(t * 48) * env;
        if (this.bones.espalda1) this.rot(this.bones.espalda1, "y", q * 0.35);
        if (this.bones.cabeza) this.rot(this.bones.cabeza, "y", -q * 0.5);
        this.rot(L, "z", 0.35 * env); this.rot(R, "z", -0.35 * env);
      }
      this.locomotion(dt, k);
      this.face(dt);
      this.emotePose(dt);
      this.actPose(dt);
      this.crouchPose();
      this.clothes();
      this._footIK(dt);
      this._armIK(dt);
    }
    // Fase del paso: la cadencia sale de la velocidad real (speed / zancada), así los pies no patinan; el clip Walk se
    // sincroniza con esa fase (su pie izquierdo va adelante en t = 0,25 del ciclo, igual que el paso procedural en φ = π/2).
    _gaitPhase(dt) {
      const g = this.gait || 0, run = g > 1.5, sp = this.speed;
      const hz = this.swimming ? (run ? 2.6 : 1.4) : sp != null ? clamp(sp / (run ? ANIM.strideRun : ANIM.strideWalk), ANIM.cadence[0], ANIM.cadence[1]) : run ? 4.8 : 3.4;
      this.hz = this.hz == null ? hz : this.hz + (hz - this.hz) * Math.min(1, dt * 8);
      if (g > 0 || (this.gW || 0) > 0.01) this.ph = ((this.ph || 0) + dt * this.hz * Math.PI * 2) % (Math.PI * 2);
      const wa = this.actions.Walk;
      if (wa && wa.isScheduled() && !this.swimming) { wa.timeScale = 0; wa.time = (this.ph || 0) / (Math.PI * 2) * wa.getClip().duration; }
      else if (wa && wa.timeScale === 0) wa.timeScale = 1;
    }
    // Ajustes por la ropa puesta, encima de todo lo demás (con rot(): se deshacen solos en el cuadro siguiente).
    // - Calzado: los dedos se quedan en su pose de reposo dentro del zapato (al caminar se doblaban y salían ~5 cm por la puntera).
    // - Pantalón: las alas plegadas se separan un poco de la cadera para no entrar en la tela.
    // - Aletas de buzo: piernas algo abiertas y puntas hacia fuera, para que una aleta no choque con la otra pata.
    clothes() {
      const B = this.bones, f = this.fitAdj;
      if (f.toes) for (const n of TOES) { const b = B[n], r = this.toeRest[n]; if (b && r) for (const ax of ['x', 'y', 'z']) this.rot(b, ax, r[ax] - b.rotation[ax]); }
      if (f.wing && B.armL1 && B.armL1001) { this.rot(B.armL1, 'z', f.wing); this.rot(B.armL1001, 'z', -f.wing); }
      if (f.splay) for (const [h, sg] of [['pieL1', 1], ['pieL1001', -1]]) if (B[h]) { this.rot(B[h], SPLAY.axis, sg * f.splay * SPLAY.sign); this.rot(B[h], SPLAY.twist, sg * f.splay * SPLAY.tsign * 1.4); }
      // Objeto largo en la mano izquierda (bandera, mapa, martillo): al bailar, ese brazo deja de barrer por delante de la cara
      // (se anula su vaivén) y se queda en alto y abierto, agitando la bandera; así el asta no cruza el pico
      // (docs/equipo/TRAITS_PEDIDOS.md). Pelear no lo necesita: el objeto queda a más de 20 cm de la cabeza.
      if (f.longHand && this.emoteName === 'dance' && this.eW > 0.01 && B.armL1 && B.armL2) {
        const w = (this.longHandOpen != null ? this.longHandOpen : 1) * this.eW, b = (this.emoteT || 0) * Math.PI * 4, h = Math.sin(b / 2);
        this.rot(B.armL1, 'x', 0.4 * h * w); this.rot(B.armL1, 'z', (LONG_HAND_DANCE - 0.5 * h) * w); this.rot(B.armL2, 'x', -0.4 * Math.sin(b) * w);
      }
    }
    // Gestos de cuerpo entero (emote: 'dance' | 'fight' | 'angry' | 'annoyed' | 'idea'), con transición suave.
    // Hombro: -X adelanta; abrir hacia arriba/afuera es +Z en el izquierdo y -Z en el derecho. Codo +X dobla.
    emotePose(dt) {
      const B = this.bones;
      if (this.emote !== this.emoteLast) { if (this.emote) { this.emoteT = 0; this.emoteName = this.emote; } this.emoteLast = this.emote; }
      this.eW = (this.eW || 0) + ((this.emote ? 1 : 0) - (this.eW || 0)) * (1 - Math.exp(-dt * 8));
      const w = this.eW;
      if (w < 0.01 || !this.emoteName) return;
      const t = this.emoteT = (this.emoteT || 0) + dt, P = Math.PI * 2;
      const arm = (side, x, zOut, elbow) => {
        const sh = B[side === 'L' ? 'armL1' : 'armL1001'], el = B[side === 'L' ? 'armL2' : 'armL2001'];
        if (!sh || !el) return;
        this.rot(sh, 'x', x * w); this.rot(sh, 'z', (side === 'L' ? zOut : -zOut) * w); this.rot(el, 'x', elbow * w);
      };
      const leg = (side, hip, knee, ankle) => {
        const s = side === 'L' ? '' : '001';
        if (!B['pieL1' + s]) return;
        this.rot(B['pieL1' + s], 'x', hip * w); this.rot(B['pieL2' + s], 'x', knee * w); this.rot(B['pieL3' + s], 'x', ankle * w);
      };
      const body = (lean, tilt, twist) => { if (B.espalda1) { this.rot(B.espalda1, 'x', lean * w); this.rot(B.espalda1, 'z', tilt * w); this.rot(B.espalda1, 'y', twist * w); } };
      const head = (x, y, z) => { if (B.cabeza) { this.rot(B.cabeza, 'x', x * w); this.rot(B.cabeza, 'y', y * w); this.rot(B.cabeza, 'z', z * w); } };
      const beak = v => { if (B.pico) this.rot(B.pico, 'x', v * w); };
      const lift = v => { this.root.position.y += v * w * this.root.scale.y; };
      switch (this.emoteName) {
        case 'dance': {
          const b = t * P * 2, h = Math.sin(b / 2);
          body(0.05, h * 0.22, h * 0.28); lift((1 - Math.cos(b)) * 0.03);
          arm('L', -0.4 * h, 0.9 + 0.5 * h, 0.7 + 0.4 * Math.sin(b));
          arm('R', 0.4 * h, 0.9 - 0.5 * h, 0.7 - 0.4 * Math.sin(b));
          leg('L', -0.2 * Math.max(0, h), -0.6 * Math.max(0, h), 0.3 * Math.max(0, h));
          leg('R', -0.2 * Math.max(0, -h), -0.6 * Math.max(0, -h), 0.3 * Math.max(0, -h));
          head(Math.sin(b) * 0.08, 0, h * 0.18); beak(0.12 * Math.max(0, Math.sin(b * 1.5)));
          break;
        }
        case 'fight': {
          const bounce = Math.sin(t * P * 2.5), cyc = t % 1.4, punch = cyc < 0.18 ? Math.sin(cyc / 0.18 * Math.PI) : 0, side = Math.floor(t / 1.4) % 2;
          body(0.18, 0, 0.3); lift(-0.03 + bounce * 0.015);
          leg('L', -0.15, -0.3, 0.3); leg('R', -0.15, -0.3, 0.3);
          arm('L', -0.9 - (side === 0 ? 0.5 * punch : 0), 0.15, 1.6 - (side === 0 ? 1.3 * punch : 0));
          arm('R', -0.9 - (side === 1 ? 0.5 * punch : 0), 0.15, 1.6 - (side === 1 ? 1.3 * punch : 0));
          head(0.12, -0.15, 0); beak(punch * 0.12);
          break;
        }
        case 'angry': {
          const st = t % 0.55, up = st < 0.3 ? Math.sin(st / 0.3 * Math.PI) : 0, stomp = st > 0.3 && st < 0.38 ? 1 : 0;
          body(0.15, 0, 0); lift(-stomp * 0.015);
          leg('L', -0.25 * up, -0.9 * up, 0.4 * up);
          arm('L', -0.15, -0.15, 0.6); arm('R', -0.15, -0.15, 0.6);
          head(0.2, Math.sin(t * 25) * 0.07 * (t < 0.6 ? 1 : 0.3), 0); beak(0.16 * Math.max(0, Math.sin(t * 16)));
          break;
        }
        case 'annoyed': {
          const tap = Math.max(0, Math.sin(t * P * 3));
          arm('L', -0.7, -0.35, 1.9); arm('R', -0.7, -0.35, 1.9);
          leg('R', 0, -0.1 * tap, 0.35 * tap);
          body(0, 0, 0.15); head(0.04, Math.sin(t * 1.5) * 0.2, 0.15);
          beak(t % 2 < 0.4 ? 0.08 : 0);
          break;
        }
        case 'idea': {
          const up = Math.min(1, t / 0.3);
          lift(0.08 * Math.sin(Math.min(1, t / 0.35) * Math.PI));
          arm('L', -1.9 * up, 0.2, 0.3); arm('R', -0.1, 0, 0.3);
          body(-0.08, 0, 0); head(-0.2 * up, 0, 0.1);
          for (const n of ['armL2002', 'armL2003']) if (B[n]) this.rot(B[n], 'x', -0.4 * w * up); // dedo índice estirado
          break;
        }
      }
    }
    // Cara y manos: parpadeo, expresión (párpados, pico, cabeza), hablar, mirar alrededor, gestos y dedos.
    // Ejes medidos: pico +X abre; cabeza X asiente, Y gira, Z ladea; codo +X dobla; dedos +X cierran.
    face(dt) {
      const B = this.bones, t = this.wingT || 0, k = 1 - Math.exp(-dt * 7);
      const EX = {
        neutral: [0.05, 0, 0, 0], happy: [0.42, 0.12, -0.06, 0.14], surprised: [0, 0.3, -0.16, 0],
        sad: [0.55, 0, 0.22, -0.1], curious: [0.22, 0.05, 0.04, 0.26], angry: [0.48, 0.06, 0.12, 0],
        idea: [0, 0.18, -0.2, 0], fight: [0.38, 0.05, 0.14, 0], annoyed: [0.52, 0, 0.04, 0.16],
      };
      const e = EX[this.expression] || EX.neutral;
      const ex = this.ex || (this.ex = e.slice());
      for (let i = 0; i < 4; i++) ex[i] += (e[i] - ex[i]) * k;
      // Parpadeo con pausas al azar; a veces doble
      this.blinkIn = (this.blinkIn == null ? 1 + Math.random() * 2 : this.blinkIn) - dt;
      if (this.blinkIn <= 0) { this.blinkT = 0.15; this.blinkIn = Math.random() < 0.15 ? 0.3 : 2 + Math.random() * 3.5; }
      let blink = 0;
      if (this.blinkT > 0) { this.blinkT -= dt; blink = Math.sin(Math.max(0, 1 - this.blinkT / 0.15) * Math.PI); }
      for (const lid of this.lids || []) this._lid(lid, Math.max(0.03, Math.min(1, ex[0] + blink * (1 - ex[0]))));
      // Hablar: el pico sigue a mouth (0..1) si el juego lo da (sílabas del texto que se escribe o de la voz que lee);
      // si no, abre y cierra con un ritmo de sílabas genérico. Abre rápido y cierra algo más lento, como un pico real.
      let talk = 0;
      if (this.talking) this.talkPh = (this.talkPh || 0) + dt * 15;
      if (this.mouth != null) talk = clamp(this.mouth, 0, 1) * ANIM.mouthMax;
      else if (this.talking) talk = Math.max(0, Math.sin(this.talkPh)) * (0.55 + 0.45 * Math.sin(this.talkPh * 0.37 + 1.3)) * 0.32;
      if (this.carry === 'pico') talk *= 0.35; // con algo en el pico habla entre dientes
      this.talkV = (this.talkV || 0) + (talk - (this.talkV || 0)) * Math.min(1, dt * (talk > (this.talkV || 0) ? 38 : 22));
      if (B.pico) this.rot(B.pico, "x", ex[1] + this.talkV);
      // Mirar a alguien (lookAt: quien habla, lo que va a agarrar) o, quieta, mirar alrededor
      this.lookIn = (this.lookIn || 0) - dt;
      if (this.lookIn <= 0) { this.lookIn = 1.5 + Math.random() * 3; this.lookGoal = [(Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.25]; }
      const still = !(this.gW > 0.1) && !this.talking;
      let g = still ? (this.lookGoal || [0, 0]) : [0, 0];
      if (this.lookAt && this.anchors && this.anchors.pico) {
        this.root.updateMatrixWorld(true);
        const v = this.root.worldToLocal(_tg.copy(this.lookAt)), hy = 1.0;
        g = [clamp(Math.atan2(v.x, v.z), -ANIM.lookMax[0], ANIM.lookMax[0]) * this.headSign.yaw,
          clamp(-Math.atan2(v.y - hy, Math.hypot(v.x, v.z)), -ANIM.lookMax[1], ANIM.lookMax[1]) * this.headSign.pitch];
      }
      const lk = this.lk || (this.lk = [0, 0]);
      lk[0] += (g[0] - lk[0]) * Math.min(1, dt * 3); lk[1] += (g[1] - lk[1]) * Math.min(1, dt * 3);
      if (B.cabeza) {
        const nod = this.talking ? Math.sin((this.talkPh || 0) * 0.45) * 0.06 : 0;
        this.rot(B.cabeza, "y", lk[0]); this.rot(B.cabeza, "x", lk[1] + ex[2] + nod); this.rot(B.cabeza, "z", ex[3]);
      }
      // Gestos al hablar: una mano y luego la otra suben, codo doblado
      const gest = this.talking ? 1 : 0;
      this.gestW = (this.gestW || 0) + (gest - (this.gestW || 0)) * k;
      const gw = this.gestW, gp = (this.talkPh || 0) * 0.18;
      for (const [sh, el, sg, off] of [['armL1', 'armL2', 1, 0], ['armL1001', 'armL2001', -1, Math.PI]]) {
        if (!B[sh]) continue;
        const a = Math.max(0, Math.sin(gp + off)) * gw;
        this.rot(B[sh], "x", -0.5 * a); this.rot(B[sh], "z", 0.25 * a * sg);
        this.rot(B[el], "x", 0.12 + 0.9 * a);
      }
      // Dedos: algo cerrados en reposo, se abren al gesticular, con leve movimiento propio
      let i = 0;
      for (const n of FINGERS) if (B[n]) this.rot(B[n], "x", 0.18 + Math.sin(t * 1.4 + i++) * 0.05 - gw * 0.15);
    }
    rot(bone, ax, v) { bone.rotation[ax] += v; this.ofs.push([bone, ax, v]); }
    // Paso procedural encima del clip: gait 0 quieto, 1 caminar, 2 correr (saltitos con las patas juntas); airborne recoge
    // las patas; legsDown (cernido, aterrizaje) las baja y adelanta para recibir el suelo.
    // Ejes medidos en el rig: muslo -X adelanta el pie, rodilla -X lo levanta, tobillo +X lo aplana.
    locomotion(dt, k) {
      const B = this.bones, g = this.gait || 0, run = g > 1.5;
      this.gW = (this.gW || 0) + ((g > 0 ? 1 : 0) - (this.gW || 0)) * k;
      this.rW = (this.rW || 0) + ((run && !this.swimming ? 1 : 0) - (this.rW || 0)) * k;
      this.aW = (this.aW || 0) + ((this.airborne ? 1 : 0) - (this.aW || 0)) * k;
      this.ldW = (this.ldW || 0) + ((this.airborne ? this.legsDown || 0 : 0) - (this.ldW || 0)) * k;
      const w = this.gW, rw = this.rW, ld = this.ldW, aw = this.aW * (1 - ld);
      const ph = this.ph || 0, s = Math.sin(ph), c = Math.cos(ph);
      const sp01 = this.speed != null ? Math.min(1, this.speed / ANIM.walkRef) : 1;
      const A = ((ANIM.walkAmp[0] + (ANIM.walkAmp[1] - ANIM.walkAmp[0]) * sp01) * (1 - rw) + ANIM.runAmp * rw) * w;
      for (const [hip, knee, ankle, sg] of [['pieL1', 'pieL2', 'pieL3', 1], ['pieL1001', 'pieL2001', 'pieL3001', -1]]) {
        if (!B[hip]) continue;
        const sgE = sg * (1 - rw) + rw;   // caminar: piernas alternas; correr: juntas
        const sw = s * sgE, lift = Math.max(0, c * sgE) * w * (0.85 + 0.3 * rw);
        // Nadando el cuerpo va tumbado: las patas se adelantan ~1 rad para quedar debajo y patalear en el agua
        this.rot(B[hip], "x", -A * sw + aw * 0.55 - ld * 0.5 - (this.swimming && !this.diving ? 1.0 : 0));
        this.rot(B[knee], "x", -lift * 0.95 - aw * 0.7 - ld * 0.2);
        this.rot(B[ankle], "x", lift * 0.45 + A * sw * 0.25 + aw * 0.3 + ld * 0.3);
      }
      if (B.espalda1) {
        this.rot(B.espalda1, "x", (run ? 0.2 : 0.08) * w + this.aW * 0.12);
        this.rot(B.espalda1, "z", s * 0.07 * w * (1 - rw));
      }
      if (B.cabeza) {
        this.rot(B.cabeza, "x", -((run ? 0.14 : 0.05) + Math.cos(ph * 2) * 0.04) * w);
        this.rot(B.cabeza, "z", -s * 0.05 * w * (1 - rw));
        // Volando, la cabeza se queda casi nivelada aunque el cuerpo se incline o se ladee (estabiliza la mirada, como las aves)
        if (this.flying) {
          const r = this.root.rotation;
          this.rot(B.cabeza, "x", -r.x * 0.55 * this.headSign.pitch); this.rot(B.cabeza, "z", -r.z * 0.5);
        }
      }
      if (B.espalda1001) this.rot(B.espalda1001, "z", Math.sin(ph + 1) * 0.12 * w);
      this.perchPose(k);
      // Cintura: la cadera gira con el paso y el pecho contrarresta
      if (B.espalda1 && B.espalda2) { this.rot(B.espalda1, "y", s * 0.14 * w * (1 - rw)); this.rot(B.espalda2, "y", -s * 0.12 * w * (1 - rw)); }
      // Codos: más doblados al correr y cuando el brazo va adelante
      for (const [el, sg] of [['armL2', 1], ['armL2001', -1]]) if (B[el]) this.rot(B[el], "x", ((run ? 0.55 : 0.25) * w + Math.max(0, s * sg) * 0.2 * w) * (1 - rw));
      // Nadando: la cabeza mira al frente aunque el cuerpo vaya tumbado, y no hay rebote de pasos
      // (el cuerpo va casi horizontal; el cuello levanta la cabeza para llevar el pico fuera del agua)
      // Con algo a la espalda (mochila, cuatro, tanques, jetpack) parte de esa extensión pasa del cuello al pecho: la mirada
      // queda casi igual y la nuca no se mete en la pieza (docs/equipo/TRAITS_PEDIDOS.md).
      if (this.swimming) {
        const sh = this.diving || !this.mounted.back ? 0 : (this.swimBackShift != null ? this.swimBackShift : SWIM_BACK_SHIFT);
        if (B.cabeza) this.rot(B.cabeza, "x", this.diving ? 0.3 : -0.75 + sh);
        if (B.espalda2) this.rot(B.espalda2, "x", this.diving ? 0 : -0.25 - sh);
        return;
      }
      // Rebote del cuerpo: caminando, dos subidas por ciclo (una por pie); corriendo, un saltito por ciclo con las patas recogidas
      const bob = (1 - Math.cos(ph * 2)) * 0.5 * ANIM.bobWalk * (1 - rw) + Math.max(0, c) * ANIM.bobRun * rw;
      this.root.position.y += bob * w * this.root.scale.y;
    }
    // Posada en algo fino (posado = 'fino': rama, baranda, poste, cumbrera): agachada, patas juntas y dedos cerrados agarrando,
    // con un leve balanceo para mantener el equilibrio. Con calzado los dedos no se tocan (siguen en su pose dentro del zapato).
    perchPose(k) {
      const B = this.bones, on = this.posado === 'fino' && !this.airborne && !this.swimming && !(this.gait > 0) ? 1 : 0;
      this.pW = (this.pW || 0) + (on - (this.pW || 0)) * k;
      const w = this.pW; if (w < 0.01) return;
      const t = this.wingT || 0, bal = Math.sin(t * 1.7) * 0.04 * w;
      for (const [hip, knee, ankle, sg] of [['pieL1', 'pieL2', 'pieL3', 1], ['pieL1001', 'pieL2001', 'pieL3001', -1]]) {
        if (!B[hip]) continue;
        this.rot(B[hip], 'x', -ANIM.perch.cadera * w); this.rot(B[hip], SPLAY.axis, -sg * ANIM.perch.juntas * w * SPLAY.sign);
        this.rot(B[knee], 'x', -ANIM.perch.rodilla * w); this.rot(B[ankle], 'x', ANIM.perch.tobillo * w);
      }
      if (!(this.fitAdj && this.fitAdj.toes)) for (const n of TOES) if (B[n]) this.rot(B[n], 'x', ANIM.perch.dedos * w);
      if (B.espalda1) { this.rot(B.espalda1, 'x', 0.12 * w); this.rot(B.espalda1, 'z', bal); }
      this.root.position.y -= ANIM.perch.bajar * w * this.root.scale.y;
    }
    // Agachada bajo un toldo o un alero bajo (agachada 0..1, ya suavizada por fisica.js): patas flexionadas, el cuerpo se tumba
    // hacia delante y la cabeza se encoge. Con la raíz del peso la cabeza queda siempre por debajo del hueco que pide fisica.js
    // (medido con los vértices deformados: hueco 1,55 m → cabeza a 1,42; 1,4 → 1,11; 1,15 → 0,81).
    crouchPose() {
      const a = this.swimming || this.airborne ? 0 : Math.min(1, Math.max(0, this.agachada || 0)); if (a < 0.01) return;
      const B = this.bones, A = ANIM.agachada, w = Math.sqrt(a);
      if (B.espalda1) this.rot(B.espalda1, 'x', A.espalda * w);
      if (B.espalda2) this.rot(B.espalda2, 'x', A.pecho * w);
      if (B.cabeza) this.rot(B.cabeza, 'x', A.cabeza * w * this.headSign.pitch);
      for (const [h, kn, an] of [['pieL1', 'pieL2', 'pieL3'], ['pieL1001', 'pieL2001', 'pieL3001']]) if (B[h]) {
        this.rot(B[h], 'x', -A.cadera * w); this.rot(B[kn], 'x', -A.rodilla * w); this.rot(B[an], 'x', A.tobillo * w);
      }
      this.root.position.y -= A.bajar * w * this.root.scale.y;
    }
    // Agarrar, llevar y usar (los pesos los anima src/engine/agarre.js): reach 0..1 agacharse y alcanzar (con el pico, bajar la
    // cabeza), use 0..1 gesto de uso. Las manos van con IK a carryTargets (en _armIK); aquí solo el cuerpo.
    actPose(dt) {
      const B = this.bones, r = this.reach || 0, u = this.use || 0, beak = this.reachMode === 'pico';
      if (r > 0.001) {
        if (B.espalda1) this.rot(B.espalda1, 'x', (beak ? 0.55 : 0.42) * r);
        if (B.espalda2) this.rot(B.espalda2, 'x', (beak ? 0.3 : 0.15) * r);
        if (B.cabeza) this.rot(B.cabeza, 'x', (beak ? 0.45 : 0.2) * r * this.headSign.pitch);
        for (const [h, kn, an] of [['pieL1', 'pieL2', 'pieL3'], ['pieL1001', 'pieL2001', 'pieL3001']]) if (B[h]) {
          this.rot(B[h], 'x', -0.35 * r); this.rot(B[kn], 'x', -0.45 * r); this.rot(B[an], 'x', 0.35 * r);
        }
        this.root.position.y -= 0.06 * r * this.root.scale.y;
        if (beak && B.pico) this.rot(B.pico, 'x', 0.25 * Math.sin(Math.min(1, r) * Math.PI));
      }
      if (u > 0.001 && this.carry === 'pico' && B.cabeza) this.rot(B.cabeza, 'x', 0.3 * Math.sin(u * Math.PI) * this.headSign.pitch);
      if (this.carry === 'pico' && B.pico) this.rot(B.pico, 'x', 0.06); // el pico sujeta: apenas abierto
    }
    // ---------- IK (CCD sobre los huesos ya animados; se deshace al empezar el cuadro siguiente) ----------
    _restoreIK() {
      const sv = this.ikSaved || [];
      for (let i = sv.length - 1; i >= 0; i--) sv[i][0].quaternion.copy(sv[i][1]);
      sv.length = 0;
    }
    // Lleva el punto mundial de `eff` hacia `target` girando la cadena (de la raíz al extremo); w 0..1, maxA rad por hueso
    _ccd(chain, eff, target, w, iters, maxA) {
      if (w < 0.01) return;
      for (const b of chain) this.ikSaved.push([b, b.quaternion.clone()]);
      for (let it = 0; it < iters; it++) {
        for (let i = chain.length - 1; i >= 0; i--) {
          const b = chain[i];
          b.getWorldPosition(_bp); eff.getWorldPosition(_ep);
          _v1.subVectors(_ep, _bp); _v2.subVectors(target, _bp);
          if (_v1.lengthSq() < 1e-10 || _v2.lengthSq() < 1e-10) continue;
          _v1.normalize(); _v2.normalize();
          const ang = Math.acos(clamp(_v1.dot(_v2), -1, 1));
          if (ang < 1e-4) continue;
          _q.setFromUnitVectors(_v1, _v2);
          _qi.identity().slerp(_q, Math.min(1, Math.min(ang, maxA) / ang * w));
          b.parent.getWorldQuaternion(_qp); b.getWorldQuaternion(_qw);
          _qw.premultiply(_qi); b.quaternion.copy(_qp.invert().multiply(_qw));
          b.updateMatrixWorld(true);
        }
      }
    }
    // Bandera en la mano izquierda: el antebrazo se orienta para que el asta quede vertical, sea cual sea la pose (pedido del TA).
    // Eje del asta en reposo (ropero: rotation.x = π/2 - 0,35 sobre +Y) pasado al espacio del antebrazo una vez.
    _holdUpright() {
      const hand = this.look && this.look.accessories && this.look.accessories.hand, el = this.bones.armL2;
      if (!hand || hand.style !== 'bandera' || !el || !this.restMat.armL2 || (this.carryTargets && this.carryTargets.L && (this.armW || 0) > 0.05)) return;
      if (!this.poleLocal) {
        const qr = new THREE.Quaternion(); this.restMat.armL2.decompose(new THREE.Vector3(), qr, new THREE.Vector3());
        this.poleLocal = new THREE.Vector3(0, Math.sin(0.35), Math.cos(0.35)).applyQuaternion(qr.invert()).normalize();
      }
      this.root.updateMatrixWorld(true);
      el.getWorldQuaternion(_qw); _v1.copy(this.poleLocal).applyQuaternion(_qw); _v2.set(0, 1, 0);
      if (_v1.dot(_v2) > 0.966) return; // ya está a menos de 15°
      this.ikSaved.push([el, el.quaternion.clone()]);
      _q.setFromUnitVectors(_v1, _v2); _qi.identity().slerp(_q, 0.9);
      el.parent.getWorldQuaternion(_qp); _qw.premultiply(_qi); el.quaternion.copy(_qp.invert().multiply(_qw));
      el.updateMatrixWorld(true);
    }
    // IK de patas: en pendiente o escalón cada pie busca su suelo (groundAt) y la cadera baja lo que pida el pie más bajo
    _footIK(dt) {
      const on = !!(this.groundAt && !this.airborne && !this.swimming && this.feet && this.feet.length === 2);
      this.fkW = (this.fkW || 0) + ((on ? 1 : 0) - (this.fkW || 0)) * Math.min(1, dt * 10);
      if (this.fkW < 0.02 || !on) { this.ikFeet = null; return; }
      this.root.updateMatrixWorld(true);
      const sc = this.root.scale.y, max = ANIM.footIK * sc, g0 = this.groundY != null ? this.groundY : this.root.position.y;
      const d = this.feet.map(f => { f.eff.getWorldPosition(_ep); return clamp(this.groundAt(_ep.x, _ep.z) - g0, -max, max); });
      const pelvis = Math.min(0, d[0], d[1]) * this.fkW;
      if (pelvis < -1e-4) { this.root.position.y += pelvis; this.root.updateMatrixWorld(true); }
      this.ikFeet = d;
      this.feet.forEach((f, i) => {
        const raise = d[i] * this.fkW - pelvis;
        if (raise < 0.003) return;
        f.eff.getWorldPosition(_tg); _tg.y += raise;
        this._ccd(f.chain, f.eff, _tg, 1, 3, 0.7);
      });
    }
    // IK de brazos: con algo en las manos (agarre.js pone carryTargets = { L, R } en el espacio del modelo y el peso armW)
    _armIK() {
      this._holdUpright();
      const T = this.carryTargets, w = this.armW || 0;
      if (!T || w < 0.01 || !this.anchors) return;
      this.root.updateMatrixWorld(true);
      for (const [side, sh, el, anc] of [['L', 'armL1', 'armL2', 'manoL'], ['R', 'armL1001', 'armL2001', 'manoR']]) {
        const p = T[side], B = this.bones;
        if (!p || !B[sh] || !B[el] || !this.anchors[anc]) continue;
        _tg.set(p[0], p[1], p[2]); this.root.localToWorld(_tg);
        this._ccd([B[sh], B[el]], this.anchors[anc], _tg, w, 3, 1.2);
      }
    }
    setSpecies(id) {
      const s = SPECIES[id] || SPECIES.vittata;
      this.species = id;
      // Párpados del color del anillo del ojo (piel desnuda alrededor del ojo); el labio, un tono más oscuro
      if (this.lidMat) { window.AVColor.set(this.lidMat.skin.color, s.ring); this.lidMat.lip.color.copy(this.lidMat.skin.color).multiplyScalar(0.45); }
      if (this.tint) {
        const base = SPECIES.vittata, on = this.tint.tintOn.value;
        const C = window.AVColor; C.set(this.tint.patchColor.value, s.patch); C.set(this.tint.ringColor.value, s.ring); C.set(this.tint.beakColor.value, s.beak || '#f2a23a');
        on.set(s.patch !== base.patch ? 1 : 0, s.ring !== base.ring ? 1 : 0, s.beak ? 1 : 0);
        return;
      }
      const set = (name, hex) => { const m = this.materials[name]; if (!m) return; if (hex) window.AVColor.set(m.color, hex); else if (m.userData.base) m.color.copy(m.userData.base); };
      set('Patch', s.patch); set('Ring', s.ring); set('WingTip', s.wingTip); set('Beak', s.beak || null);
    }
    // Engancha las mallas con piel de una pieza de Blender al esqueleto de este personaje (huesos por nombre)
    _mountRopa(def, want) {
      const gltf = ropaCache[glbName(def, want.style)];
      const sceneCopy = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
      let body = null; this.root.traverse(o => { if (o.isSkinnedMesh && !o.userData.isAccessory && !body) body = o; });
      if (!body) return null;
      const out = [];
      sceneCopy.traverse(o => { if (o.isSkinnedMesh) out.push(o); });
      for (const mesh of out) {
        const bones = mesh.skeleton.bones.map(b => this.bones[b.name]);
        if (bones.some(b => !b)) return null;
        mesh.bind(new THREE.Skeleton(bones, mesh.skeleton.boneInverses.map(m => m.clone())), mesh.bindMatrix);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const swap = mats.map(m => ropaMaterial(m, want.color, want.style, !!mesh.morphTargetInfluences, mesh.geometry));
        mesh.material = Array.isArray(mesh.material) ? swap : swap[0];
        if (mats.every(m => /^BANDERA/.test(m.name))) mesh.visible = (TELA_STYLE[want.style] || want.style) === 'pr';
        mesh.castShadow = true; mesh.frustumCulled = false; mesh.userData.isAccessory = true;
        body.parent.add(mesh);
      }
      return out;
    }
    // Qué ajustes de pose y altura pide la ropa puesta (los aplica clothes() en cada cuadro)
    _fitClothes() {
      const M = this.mounted, feet = M.feet, legs = M.legs;
      const hand = M.hand;
      this.fitAdj = { toes: !!feet, wing: legs ? WING_CLEAR : 0, splay: feet && feet.style === 'buzo' ? SPLAY.amount : 0, longHand: !!(hand && LONG_HAND[hand.style]) };
      if (this.rigNode) this.rigNode.position.y = this.rigY + (feet && feet.blender ? SOLE_LIFT : 0);
      // Pañuelo de Blender: con camisa puesta va por encima de ella (forma 'camisa' del .glb)
      if (M.neck && M.neck.blender) for (const o of M.neck.objects) if (o.morphTargetInfluences) {
        const i = o.morphTargetDictionary && o.morphTargetDictionary.camisa;
        o.morphTargetInfluences[i != null ? i : 0] = M.torso ? 1 : 0;
      }
    }
    // Monta, quita o recolorea cada ranura; el accesorio queda como hijo del hueso y sigue sus animaciones
    applyLook(look) {
      this.look = normalizeLook(look);
      this.setSpecies(this.look.species);
      for (const slot of SLOTS) {
        const want = this.look.accessories[slot];
        const have = this.mounted[slot];
        if (have && (!want || have.id !== want.id || have.color !== want.color || have.style !== want.style)) unmountSlot(this, slot);
        if (want && !this.mounted[slot]) {
          const def = ACCESSORIES.find(a => a.id === want.id);
          const objects = [];
          // Pieza modelada en Blender (con piel sobre el mismo esqueleto): si ya está cargada se usa;
          // si no, se monta la versión simple y se cambia sola cuando termine de cargar.
          const gname = glbName(def, want.style);
          if (gname && ropaCache[gname] && ropaCache[gname] !== 'error' && !ropaCache[gname].then) {
            const objs = this._mountRopa(def, want);
            if (objs) { this.mounted[slot] = { id: want.id, color: want.color, style: want.style, objects: objs, blender: true }; continue; }
          }
          if (gname && !ropaCache[gname]) {
            loadRopa(gname).then(() => {
              const cur = this.look.accessories[slot], m = this.mounted[slot];
              if (cur && m && cur.id === want.id && cur.style === want.style && cur.color === want.color && !m.blender) {
                unmountSlot(this, slot); this.applyLook(this.look);
              }
            });
          }
          if (def.fit) {
            // Cada parte se pasa del espacio del modelo en reposo al espacio de su hueso, y lo sigue al animarse
            for (const part of def.fit(want.color, want.style)) {
              const bone = this.bones[part.bone], rest = this.restMat[part.bone]; if (!bone || !rest) continue;
              part.obj.applyMatrix4(rest.clone().invert());
              part.obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.isAccessory = true; } });
              bone.add(part.obj); objects.push(part.obj);
            }
            this.mounted[slot] = { id: want.id, color: want.color, style: want.style, objects };
            continue;
          }
          for (const mountName of [def.mount, def.mount2].filter(Boolean)) {
            const bone = this.bones[mountName]; if (!bone) continue;
            const acc = buildAccessory(def.id, want.color, want.style);
            const ws = new THREE.Vector3(); bone.getWorldScale(ws);
            const rs = new THREE.Vector3(); this.root.getWorldScale(rs);
            const k = 1 / ((ws.x || 1) / (rs.x || 1));
            const inv = (this.restQuat[mountName] || new THREE.Quaternion()).clone().invert();
            // El accesorio se orienta como el personaje en reposo y luego sigue al hueso en cada animación
            acc.quaternion.copy(inv);
            const off = new THREE.Vector3().fromArray(def.offset || [0, 0, 0]).multiplyScalar(this.headR);
            if (mountName.endsWith('_R')) off.x *= -1;
            let size = def.size ? def.size * this.headR : this.headR;
            if (def.wrap && mountsInfo && mountsInfo.mounts && mountsInfo.mounts[mountName] && mountsInfo.head_sphere) {
              // El montaje está en la superficie del frente del cuello: el centro del cuello queda detrás
              const mp = new THREE.Vector3().fromArray(mountsInfo.mounts[mountName].position);
              const axis = new THREE.Vector3(0, mp.y, mountsInfo.head_sphere.center[2] - 0.02);
              const neckR = Math.hypot(mp.x - axis.x, mp.z - axis.z);
              off.set(axis.x - mp.x, off.y, axis.z - mp.z);
              size = (neckR * 1.3 + 0.02) / 0.5; // el aro mide 0.5 unidades de radio; holgura para el pecho
            }
            acc.position.copy(off.applyQuaternion(inv).multiplyScalar(k));
            acc.scale.setScalar(size * k);
            bone.add(acc); objects.push(acc);
          }
          this.mounted[slot] = { id: want.id, color: want.color, style: want.style, objects };
        }
      }
      this._fitClothes();
    }
  }

  async function create() { const gltf = await loadGLTF(); return new Character(gltf); }
  // Carga por adelantado los .glb de ropa (todos los del catálogo o los nombres dados); útil para pruebas y para el creador
  function preloadRopa(names) {
    const all = names || [...new Set(ACCESSORIES.flatMap(d => !d.glb ? [] : typeof d.glb === 'string' ? [d.glb] : Object.values(d.glb)))];
    return Promise.all(all.map(n => ropaCache[n] && !ropaCache[n].then ? null : loadRopa(n)));
  }

  // ---------- Retrato: misma cámara y luz para el creador, el juego y el cómic ----------
  let portraitRig = null;
  async function renderPortrait(look, size, pose) {
    if (!portraitRig) {
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#ffe9c4', '#1f3a2c', 0.8));
      const key = new THREE.DirectionalLight('#ffd9a0', 1.1); key.position.set(2, 3, 4); scene.add(key);
      const rim = new THREE.DirectionalLight('#9fd7ff', 0.6); rim.position.set(-3, 2, -2); scene.add(rim);
      const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 100);
      const ch = await create();
      scene.add(ch.root);
      portraitRig = { canvas, renderer, scene, camera, ch };
    }
    const { canvas, renderer, scene, camera, ch } = portraitRig;
    renderer.setSize(size, size, false);
    // Las piezas de Blender de ese look se esperan antes de dibujar: si no, el primer retrato salía con la versión simple
    const nl = normalizeLook(look);
    await preloadRopa(Object.values(nl.accessories).map(a => { const d = ACCESSORIES.find(x => x.id === a.id); return d && glbName(d, a.style); }).filter(Boolean));
    ch.applyLook(nl);
    if (window.AVColor) window.AVColor.setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());
    // Pose estable del retrato: un fotograma fijo de Welcome (o Idle), más los ajustes de la ropa (dedos, alas, aletas)
    for (const [bone, ax, v] of ch.ofs || []) bone.rotation[ax] -= v;
    ch.ofs = [];
    ch.mixer.stopAllAction();
    const clip = ch.clips[pose || 'Welcome'] || ch.clips.Idle;
    if (clip) { const a = ch.mixer.clipAction(clip); a.reset().play(); ch.mixer.setTime(clip.duration * 0.45); }
    ch.clothes();
    ch.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(ch.root);
    const h = box.max.y - box.min.y;
    const target = new THREE.Vector3(0, box.min.y + h * 0.68, 0);
    camera.position.set(h * 0.5, box.min.y + h * 0.82, h * 3.0);
    camera.lookAt(target);
    renderer.render(scene, camera);
    return canvas;
  }

  window.AVCharacter = { SPECIES, ACCESSORIES, SLOTS, MOUNTS, BASE_IDS, create, loadGLTF, preloadRopa, buildAccessory, disposeObject, normalizeLook, defaultLook, renderPortrait, mountsInfo: () => mountsInfo };
})();
