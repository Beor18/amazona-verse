/* AVE · estructuras y edificios del mapa (modo mapa)
   - Edificios de Kelvin (mapa.edificiosKelvin y mapa.escenaKelvin.compacto): los carga, instancia y libera por zonas
     src/engine/streaming.js (formato de datos en su encabezado). Aquí quedan la escala a la cotorra (factor uniforme por
     modelo, mundo.edificios.escala, sin deformar), el frente hacia el sendero más cercano y las colisiones de cada instancia.
   - Estructuras propias del mapa (mapa.estructuras): las que no tienen edificio de Kelvin (p. ej. el puente colgante) o como
     respaldo si el de Kelvin no carga. Colores planos horneados en el color de vértice: una sola malla por estructura.
     Las grutas usan el material de roca del suelo (triplanar con musgo).
   - Colisiones: las del mapa para las estructuras propias; para los edificios de Kelvin, sólidos calculados de la geometría
     real a la altura del personaje (círculo o caja) y pisos caminables (cubiertas y plataformas) detectados en la malla;
     los pisos del mapa (muelle, puentes) se escalan con el edificio.
   - API: edificio(nombre, { pos, rotY, escala }) → Promise<THREE.Group> (piezas del contenido como el taller; comparten la carga
     y los materiales del streaming y no se liberan), activos (instancias ya colocadas), listo, cargarTodo, streaming, stats().
   Datos del pack: mundo.edificios { escala: { defecto, <modelo>: f }, frente: { <modelo>: radianes }, orientar: bool,
     noOrientar: [modelos], propias: [roles que usan siempre la estructura propia], base, b64, kit? (manifiesto del kit) }. */
AVE.module('mundo', function (G) {
  'use strict';
  const T = G.terreno, MAPA = T.mapa, R = G.renderer, scene = R.scene;
  if (!MAPA) { setTimeout(() => G.emit('mundoListo'), 0); return { listo: Promise.resolve(), edificio: () => Promise.reject(new Error('sin mapa')), activos: {}, stats: () => ({}) }; }
  const W = G.pack.mundo || {}, ED = Object.assign({ escala: { defecto: 1 }, frente: {}, orientar: true, noOrientar: [], propias: ['puente'], base: 'assets/models/edificios/', b64: 'AV_EDIFICIOS_B64' }, W.edificios);
  const B64MAPA = (W.mapa && W.mapa.b64) || 'AV_MAPA_B64';
  const colliders = G.fisica.colliders;
  const nombreDe = url => url.split('/').pop().replace(/\.glb$/, '');
  const escalaDe = n => ED.escala[n] != null ? ED.escala[n] : ED.escala.defecto != null ? ED.escala.defecto : 1;

  // ---------- Carga con caché (estructuras propias; los edificios de Kelvin los carga streaming.js) ----------
  const cache = {};
  function cargarPropia(url) {
    const n = nombreDe(url);
    if (!cache['mapa:' + n]) cache['mapa:' + n] = G.assets.loadGLB(url, { b64: () => (window[B64MAPA] || {})[n], script: url.replace(/\.glb$/, '_glb.js'), base: '', error: 'estructura no disponible: ' + n })
      .then(g => { g.scene.updateMatrixWorld(true); return g.scene; });
    return cache['mapa:' + n];
  }

  // ---------- Materiales de los edificios: Phong por píxel (sombras), compartidos por nombre: G.streaming.material ----------
  // Estructuras propias (colores planos): un material con color de vértice y una variación suave de mundo para que no se vea plano
  let matPlano = null;
  function materialPlano() {
    if (matPlano) return matPlano;
    matPlano = new THREE.MeshLambertMaterial({ vertexColors: true });
    const tMac = T.macroNoise();
    matPlano.onBeforeCompile = sh => {
      sh.uniforms.tMac = { value: tMac };
      sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform sampler2D tMac; varying vec3 vWP;\n' + sh.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n  vec4 mc = texture2D(tMac, vWP.xz * 0.35 + vWP.y * 0.13); diffuseColor.rgb *= 0.86 + mc.b * 0.22 + mc.g * 0.08;');
    };
    return matPlano;
  }

  // ---------- Fundir geometrías (posición, normal, uv o color) con arreglos tipados ----------
  function fundir(partes, conColor) {
    let nv = 0, ni = 0;
    for (const p of partes) { nv += p.attributes.position.count; ni += p.index ? p.index.count : p.attributes.position.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = conColor ? null : new Float32Array(nv * 2), col = conColor ? new Float32Array(nv * 3) : null;
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const p of partes) {
      const a = p.attributes, n = a.position.count;
      for (let i = 0; i < n; i++) {
        pos[(vo + i) * 3] = a.position.getX(i); pos[(vo + i) * 3 + 1] = a.position.getY(i); pos[(vo + i) * 3 + 2] = a.position.getZ(i);
        if (a.normal) { nor[(vo + i) * 3] = a.normal.getX(i); nor[(vo + i) * 3 + 1] = a.normal.getY(i); nor[(vo + i) * 3 + 2] = a.normal.getZ(i); }
        if (uv && a.uv) { uv[(vo + i) * 2] = a.uv.getX(i); uv[(vo + i) * 2 + 1] = a.uv.getY(i); }
        if (col && a.color) { col[(vo + i) * 3] = a.color.getX(i); col[(vo + i) * 3 + 1] = a.color.getY(i); col[(vo + i) * 3 + 2] = a.color.getZ(i); }
      }
      if (p.index) for (let i = 0; i < p.index.count; i++) idx[io + i] = p.index.getX(i) + vo;
      else for (let i = 0; i < n; i++) idx[io + i] = i + vo;
      io += p.index ? p.index.count : n; vo += n;
    }
    const g = new THREE.BufferGeometry();
    // atributos extra comunes a todas las partes (p. ej. splat de las grutas)
    for (const k in partes[0].attributes) {
      if (['position', 'normal', 'uv', 'color'].includes(k) || !partes.every(p => p.attributes[k])) continue;
      const it = partes[0].attributes[k].itemSize, arr = new Float32Array(nv * it); let o = 0;
      for (const p of partes) { const a = p.attributes[k]; for (let i = 0; i < a.count; i++) for (let c = 0; c < it; c++) arr[o++] = a.array[i * it + c]; }
      g.setAttribute(k, new THREE.BufferAttribute(arr, it));
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeBoundingSphere();
    return g;
  }

  // Normales suaves soldando vértices por posición (las caras planas de una malla facetada pasan a curvas)
  function suavizar(g) {
    const p = g.attributes.position, n = g.attributes.normal, idx = g.index, acc = new Map(), key = i => Math.round(p.getX(i) * 50) + ',' + Math.round(p.getY(i) * 50) + ',' + Math.round(p.getZ(i) * 50);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t < idx.count; t += 3) {
      const i0 = idx.getX(t), i1 = idx.getX(t + 1), i2 = idx.getX(t + 2);
      a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1).sub(a); c.fromBufferAttribute(p, i2).sub(a); b.cross(c);
      for (const i of [i0, i1, i2]) { const k = key(i); const v = acc.get(k); if (v) v.add(b); else acc.set(k, b.clone()); }
    }
    for (let i = 0; i < p.count; i++) { const v = acc.get(key(i)); if (v) { a.copy(v).normalize(); n.setXYZ(i, a.x, a.y, a.z); } }
    n.needsUpdate = true;
  }

  // ---------- Senderos: punto más cercano para orientar los frentes ----------
  const sendas = [];
  for (const k in MAPA.senderos || {}) for (const p of MAPA.senderos[k]) sendas.push(p);
  function haciaSendero(x, z) {
    let best = null, bd = 45;
    for (const p of sendas) { const d = Math.hypot(p[0] - x, p[2] - z); if (d < bd && d > 2) { bd = d; best = p; } }
    return best ? Math.atan2(best[0] - x, best[2] - z) : null;
  }

  // ---------- Colisiones calculadas de la geometría (local, ya escalada) ----------
  const TECHO = /Roof|Thatch|Tarp/i;
  function analizar(root, esc) {
    // vértices de paredes a la altura del personaje (0,15 a 2,2 m) y pisos horizontales altos
    const P = [], pisos = new Map();
    const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    let alto = 0;
    root.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position, idx = o.geometry.index, mw = o.matrixWorld, techo = TECHO.test(o.material.name || '');
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mw).multiplyScalar(esc);
        if (v.y > alto) alto = v.y;
        if (!techo && v.y > 0.15 && v.y < 2.2) P.push(v.x, v.z);
      }
      if (techo || !idx) return;
      for (let t = 0; t < idx.count; t += 3) {
        a.fromBufferAttribute(pos, idx.getX(t)).applyMatrix4(mw).multiplyScalar(esc);
        b.fromBufferAttribute(pos, idx.getX(t + 1)).applyMatrix4(mw).multiplyScalar(esc);
        c.fromBufferAttribute(pos, idx.getX(t + 2)).applyMatrix4(mw).multiplyScalar(esc);
        n.subVectors(b, a).cross(c.clone().sub(a));
        const area = n.length() / 2; if (area < 1e-4) continue;
        n.normalize();
        if (Math.abs(n.y) < 0.92) continue;
        const y = (a.y + b.y + c.y) / 3; if (y < 0.6) continue;
        const k = Math.round(y / 0.3);
        let f = pisos.get(k); if (!f) pisos.set(k, f = { area: 0, y: 0, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
        f.area += area; f.y = Math.max(f.y, y);
        for (const q of [a, b, c]) { f.x0 = Math.min(f.x0, q.x); f.x1 = Math.max(f.x1, q.x); f.z0 = Math.min(f.z0, q.z); f.z1 = Math.max(f.z1, q.z); }
      }
    });
    let sol = null;
    if (P.length >= 6) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (let i = 0; i < P.length; i += 2) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); z0 = Math.min(z0, P[i + 1]); z1 = Math.max(z1, P[i + 1]); }
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
      const ds = []; for (let i = 0; i < P.length; i += 2) ds.push(Math.hypot(P[i] - cx, P[i + 1] - cz));
      ds.sort((p, q) => p - q);
      const r85 = ds[Math.floor(ds.length * 0.85)] || Math.max(hx, hz);
      const redondo = Math.abs(hx - hz) / Math.max(hx, hz) < 0.18;
      sol = redondo ? { tipo: 'circulo', cx, cz, r: r85 * 0.92 } : { tipo: 'caja', cx, cz, hx: hx * 0.9, hz: hz * 0.9 };
    }
    const fl = [...pisos.values()].filter(f => f.area > 3).sort((p, q) => q.y - p.y);
    return { sol, pisos: fl, alto };
  }
  // Collider en mundo: caja girada como cadena de círculos (fisica solo choca con círculos y cajas alineadas)
  function colliderMundo(local, pos, rot, h, kind, id) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const wx = pos[0] + local.cx * c + local.cz * s, wz = pos[2] - local.cx * s + local.cz * c;
    const out = [];
    if (local.tipo === 'circulo') out.push({ x: wx, z: wz, r: local.r, h, kind, id });
    else {
      const ang = ((rot % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
      if (ang < 0.05 || ang > Math.PI / 2 - 0.05) {
        const swap = Math.abs(Math.sin(rot)) > 0.7;
        out.push({ x: wx, z: wz, r: Math.hypot(local.hx, local.hz), hx: swap ? local.hz : local.hx, hz: swap ? local.hx : local.hz, h, kind, id });
      } else {
        const largo = Math.max(local.hx, local.hz), corto = Math.min(local.hx, local.hz), r = Math.max(0.3, corto);
        const ax = local.hx >= local.hz ? [c, -s] : [s, c]; // eje mayor en mundo
        const n = Math.max(1, Math.ceil((largo - r) / (r * 0.9)));
        for (let i = 0; i <= n; i++) {
          const t = n ? -1 + 2 * i / n : 0, d = t * Math.max(0, largo - r);
          out.push({ x: wx + ax[0] * d, z: wz + ax[1] * d, r, h, kind, id });
        }
      }
    }
    for (const o of out) colliders.push(o);
    return out;
  }
  // Colisiones del mapa (estructuras propias o pisos de Kelvin), escaladas alrededor de pos si hace falta
  function colisionMapa(c, piv, esc) {
    const P = (x, z) => piv ? [piv[0] + (x - piv[0]) * esc, piv[2] + (z - piv[2]) * esc] : [x, z];
    const kind = 'estructura', id = c.estructura;
    if (c.tipo === 'piso') {
      const [x, z] = P(c.x, c.z);
      if (c.forma === 'disco') return T.addPlatform({ tipo: 'circulo', x, z, r: c.hx * esc, top: c.y, unaVia: true, id });
      return T.addPlatform({ tipo: 'rect', x, z, hx: c.hx * esc, hz: c.hz * esc, rotY: c.rotY || 0, top: piv ? piv[1] + (c.y - piv[1]) * esc : c.y, id });
    }
    if (c.tipo === 'rampa' || c.tipo === 'puente') {
      const [ax, az] = P(c.a[0], c.a[2]), [bx, bz] = P(c.b[0], c.b[2]);
      const ay = piv ? piv[1] + (c.a[1] - piv[1]) * esc : c.a[1], by = piv ? piv[1] + (c.b[1] - piv[1]) * esc : c.b[1];
      return T.addPlatform({ tipo: c.tipo, a: [ax, ay, az], b: [bx, by, bz], ancho: c.ancho * esc, comba: c.comba || 0, id });
    }
    const [x, z] = P(c.x, c.z);
    const base = T.height(x, z), h = Math.max(0.5, (c.y1 - c.y0) * esc + (c.y0 - base));
    if (c.tipo === 'cilindro') return colliderMundo({ tipo: 'circulo', cx: 0, cz: 0, r: c.r * esc }, [x, 0, z], 0, h, kind, id);
    if (c.tipo === 'caja') return colliderMundo({ tipo: 'caja', cx: 0, cz: 0, hx: c.hx * esc, hz: c.hz * esc }, [x, 0, z], c.rotY || 0, h, kind, id);
    return null;
  }

  // ---------- Qué se dibuja: Kelvin donde hay (streaming.js), propias donde no ----------
  const KEL = (MAPA.edificiosKelvin || []).concat((MAPA.escenaKelvin && MAPA.escenaKelvin.compacto) || []);
  const rolesKelvin = new Set(KEL.filter(e => e.rol && !ED.propias.includes(e.rol)).map(e => e.rol));
  const propias = (MAPA.estructuras || []).filter(e => e.mundo || !rolesKelvin.has(e.id));
  const activos = {}; // id -> { tipo: 'kelvin'|'propia', pos, rotY, escala, grupo } (Kelvin: al colocarse la instancia)
  const stats0 = { edificios: 0, propias: 0, mallas: 0, colliders: 0, pisos: 0 };
  const pisoMapa = c => c.tipo === 'piso' || c.tipo === 'puente' || c.tipo === 'rampa';
  const conPisoMapa = id => (MAPA.colisiones || []).some(c => c.estructura === id && pisoMapa(c));

  // Frente hacia el sendero más cercano (null = respeta rotY): no a los que tienen pisos del mapa ni a los de noOrientar
  function orientarKelvin(e, n) {
    if (!ED.orientar || conPisoMapa(e.id) || ED.noOrientar.includes(n)) return null;
    const a = haciaSendero(e.pos[0], e.pos[2]);
    return a != null ? a + (ED.frente[n] || 0) : null;
  }
  // Colisiones de una instancia (streaming.js la llama una vez, cuando se carga por primera vez; A = analizar del modelo):
  // pisos del mapa escalados; sólidos y pisos altos de la geometría real
  function colocarKelvin(I, A) {
    const n = I.modelo, esc = I.escala, rot = I.rotY, [x, y, z] = I.pos, conPiso = conPisoMapa(I.id);
    for (const c of MAPA.colisiones || []) if (c.estructura === I.id && pisoMapa(c)) { colisionMapa(c, [x, y, z], esc); stats0.pisos++; }
    if (!conPiso && A.sol && n !== 'canoa' && I.erguido) {
      const piso = A.pisos.find(f => f.y > 1.2 && f.y < A.alto - 0.8 && (f.x1 - f.x0) * (f.z1 - f.z0) > 6);
      const rol = I.e.rol;
      const hSol = rol === 'mirador' && piso ? piso.y - 0.2 : A.alto;
      // el mirador escalonado es abierto: solo choca su núcleo, se camina por debajo de las cubiertas y se sube volando
      const sol = rol === 'mirador' ? { tipo: 'circulo', cx: A.sol.cx, cz: A.sol.cz, r: Math.min(1.4, A.sol.r || A.sol.hx || 1.4) } : A.sol;
      stats0.colliders += colliderMundo(sol, [x, y, z], rot, hSol, 'edificio', I.id).length;
      if (piso) {
        const c = Math.cos(rot), s = Math.sin(rot), lx = (piso.x0 + piso.x1) / 2, lz = (piso.z0 + piso.z1) / 2;
        T.addPlatform({ tipo: 'rect', x: x + lx * c + lz * s, z: z - lx * s + lz * c, hx: (piso.x1 - piso.x0) / 2, hz: (piso.z1 - piso.z0) / 2, rotY: rot, top: y + piso.y, id: I.id });
        stats0.pisos++;
      }
    }
    activos[I.id] = { tipo: 'kelvin', modelo: n, pos: [x, y, z], rotY: rot, escala: esc, grupo: I.zona, rol: I.e.rol || null, alto: A.alto };
    stats0.edificios++;
  }
  // Si el modelo de Kelvin no carga: la estructura propia de ese rol
  function respaldoKelvin(I) {
    const p = I.e.rol && (MAPA.estructuras || []).find(s => s.id === I.e.rol);
    if (p && !activos[p.id]) colocarPropia(p).catch(() => {});
  }
  function colocarPropia(e) {
    return cargarPropia(e.glb).then(root => {
      const m4 = e.mundo ? new THREE.Matrix4() : new THREE.Matrix4().compose(new THREE.Vector3(...e.pos), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), e.rotY || 0), new THREE.Vector3(1, 1, 1));
      const partes = [], roca = [];
      root.traverse(o => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(m4, o.matrixWorld));
        const mt = o.material, nm = mt.name || '';
        if (e.id === 'grutas') { geo.setAttribute('splat', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 4).map((_, i) => /Musgo/.test(nm) ? [0.7, 0.1, 0.2, 0][i % 4] : [0.05, 0.1, 0.85, 0][i % 4]), 4)); roca.push(geo); return; }
        const col = mt.color ? mt.color.clone() : new THREE.Color(1, 1, 1);
        if (mt.emissive && (mt.emissive.r + mt.emissive.g + mt.emissive.b) > 0.1) col.add(mt.emissive.clone().multiplyScalar(mt.emissiveIntensity || 1));
        const n = geo.attributes.position.count, c = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
        geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
        partes.push(geo);
      });
      if (partes.length) {
        const mesh = new THREE.Mesh(fundir(partes, true), materialPlano());
        mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'estructura:' + e.id; mesh.matrixAutoUpdate = false;
        scene.add(mesh); stats0.mallas++;
      }
      if (roca.length && T.chunks[0]) {
        const geo = fundir(roca, false);
        suavizar(geo); // las rocas de las grutas son icosferas facetadas: normales suaves para que se vean orgánicas
        const mesh = new THREE.Mesh(geo, T.chunks[0].material);
        mesh.castShadow = mesh.receiveShadow = true; mesh.name = 'estructura:' + e.id; mesh.matrixAutoUpdate = false;
        scene.add(mesh); stats0.mallas++;
      }
      for (const c of MAPA.colisiones || []) if (c.estructura === e.id && c.kit !== 'kelvin') colisionMapa(c, null, 1);
      activos[e.id] = { tipo: 'propia', pos: e.pos, rotY: e.rotY || 0, escala: 1 };
      stats0.propias++;
    });
  }
  // Los edificios esperan la malla del terreno: así se asientan a la altura exacta y las grutas usan su material.
  // streaming.js carga antes de mundoListo lo cercano al inicio y el resto por zonas al acercarse (y lo libera al alejarse).
  const ST = G.streaming.iniciar({ mapa: MAPA, ED, escalaDe, orientar: orientarKelvin, analizar, colocar: colocarKelvin, respaldo: respaldoKelvin });
  const listo = T.listo.then(() => {
    const tareas = [ST.arrancar()];
    for (const e of propias) tareas.push(colocarPropia(e).catch(err => console.warn('AVE estructura:', err && err.message || err)));
    return Promise.all(tareas);
  }).then(() => { G.emit('mundoListo'); });
  // todos (pruebas y capturas): G.mundo.cargarTodo(); G.mundo.streaming.soltarTodo() vuelve a la carga por zonas
  const cargarTodo = () => ST.cargarTodo();

  // Una pieza suelta del kit para el contenido (taller de Vittata, etc.): un grupo con los materiales compartidos
  function edificio(nombre, o) {
    o = o || {};
    return ST.modelo(nombre).then(r => {
      const g = new THREE.Group();
      for (const p of r.partes) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = m.receiveShadow = true; g.add(m); }
      const esc = o.escala != null ? o.escala : escalaDe(nombre);
      g.scale.setScalar(esc);
      if (o.pos) g.position.set(o.pos[0], o.pos[1] != null ? o.pos[1] : T.height(o.pos[0], o.pos[2]), o.pos[2]);
      if (o.rotY) g.rotation.y = o.rotY;
      if (o.agregar !== false) scene.add(g);
      return g;
    });
  }

  return { listo, edificio, activos, analizar, escalaDe, cargarTodo, streaming: ST, grupos: ST.zonas, stats: () => Object.assign({}, stats0, { streaming: ST.stats() }) };
});
