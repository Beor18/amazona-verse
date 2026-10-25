/* AVE · sólidos del mundo sacados de la geometría real (rol Movimiento y animación; docs/equipo/INTERACCION_ELEMENTOS.md)
   Mapa de alturas por capas (2,5D) en celdas de 0,3 m: cada celda guarda hasta 2 tramos [bajo, alto] con la pendiente de
   su cara de arriba. Se rasterizan los triángulos de los edificios (mallas edificios:*), las estructuras del mapa
   (estructura:*; también InstancedMesh, instancia a instancia), el taller y las estacas del contenido (los grupos con collider 'taller' o 'post'), las rocas, los troncos
   caídos y la corteza de los árboles (troncos y ramas; las hojas no). Con eso fisica.js:
   - choca y se desliza por las paredes: bloquea(x, z, y) = algún tramo corta el cuerpo y sube más que un escalón;
   - se para encima de techos, cornisas, bordes, rocas y ramas: suelo(x, z, y) = el alto de un tramo que tiene debajo;
   - se posa en lo fino (rama, baranda, poste, cumbrera): fino(x, z, y) = tramo estrecho con caída a los dos lados, y
     percha(x, z, y, r) busca uno cerca para ayudar a aterrizar encima;
   - no sube volando a través de un techo: techo(x, z, y0, y1).
   Los colliders a mano de esos mismos elementos (kind 'edificio', 'estructura', 'arbol') se ignoran donde hay sólidos.
   Presupuesto: 13 bytes por celda (alturas en cm en Int16, pendiente en Int8) en bloques de 8×8 celdas. Se construye por
   tandas de ≤ 5 ms por cuadro: edificios, estructuras y contenido al terminar de cargar el mundo (~1,4 MB); rocas y árboles
   por regiones de 24 m en 40 m alrededor del jugador, y se descargan al alejarse (~0,5–1 MB).
   Un Mesh con userData.sinSolido no se rasteriza. API: listo, activo, suelo, bloquea, techo, fino, percha, cubre, agregar(obj),
   stats(). */
AVE.module('solidos', function (G) {
  'use strict';
  const S = G.S, R = G.renderer, scene = R.scene;
  const CELL = 0.3, B = 8, NS = 2, GAP = 1.2;          // celda (m), bloque (celdas), tramos por celda, hueco que separa tramos (m)
  const SO = { stepUp: 0.45, cuerpo: 1.5, radio: 0.32, pie: 0.15, tolSuelo: 0.35, finoCaida: 0.45, regionM: 24, regionR: 40, msCuadro: 5 };
  const blocks = new Map(), flora = new Map(); // estático (edificios, estructuras, contenido) y flora (por regiones, se descarga lejos)
  let destino = blocks, regionActual = null, tipoActual = 0; // tipo de la flora que se rasteriza: 1 árbol, 2 roca
  const sucios = new Set(); // bloques estáticos tocados desde el último rellenar
  const regionBloques = new Map();
  let celdas = 0, triangulos = 0;
  const key = (bx, bz) => (bx + 32768) * 65536 + (bz + 32768);
  function block(bx, bz, crear) {
    const k = key(bx, bz); let b = destino.get(k);
    if (!b && crear) { b = { n: new Uint8Array(B * B), lo: new Int16Array(B * B * NS), hi: new Int16Array(B * B * NS), gx: new Int8Array(B * B * NS), gz: new Int8Array(B * B * NS) }; destino.set(k, b); }
    if (b && destino === blocks) sucios.add(k);
    if (b && destino === flora && regionActual) {
      (b.duenos || (b.duenos = new Set())).add(regionActual);
      let l = regionBloques.get(regionActual); if (!l) regionBloques.set(regionActual, l = new Set()); l.add(k);
    }
    return b;
  }
  const cm = v => Math.max(-32767, Math.min(32767, Math.round(v * 100)));
  const g8 = v => Math.max(-127, Math.min(127, Math.round(v * 40)));
  // Añade un punto (y) a la celda; top = alto de la cara de arriba en el centro de la celda, con su pendiente (gx, gz)
  function insert(ix, iz, y, top, gx, gz) {
    const bx = Math.floor(ix / B), bz = Math.floor(iz / B), b = block(bx, bz, true), c = (ix - bx * B) + (iz - bz * B) * B;
    const yc = cm(y), tc = cm(top), gap = GAP * 100;
    if (destino === flora && tipoActual) (b.k || (b.k = new Uint8Array(B * B)))[c] |= tipoActual;
    let n = b.n[c];
    if (!n) celdas++;
    for (let s = 0; s < n; s++) {
      const i = c * NS + s;
      if (yc <= b.hi[i] + gap && yc >= b.lo[i] - gap) {
        if (yc < b.lo[i]) b.lo[i] = yc;
        if (tc > b.hi[i]) { b.hi[i] = tc; b.gx[i] = g8(gx); b.gz[i] = g8(gz); }
        if (n === 2) { // si los dos tramos se tocan, se funden
          const a = c * NS, d = a + 1;
          if (b.lo[d] <= b.hi[a] + gap && b.hi[d] >= b.lo[a] - gap) {
            if (b.hi[d] > b.hi[a]) { b.hi[a] = b.hi[d]; b.gx[a] = b.gx[d]; b.gz[a] = b.gz[d]; }
            b.lo[a] = Math.min(b.lo[a], b.lo[d]); b.n[c] = 1;
          }
        }
        return;
      }
    }
    if (n < NS) { const i = c * NS + n; b.lo[i] = yc; b.hi[i] = Math.max(tc, yc); b.gx[i] = g8(gx); b.gz[i] = g8(gz); b.n[c] = n + 1; return; }
    // lleno: se une al tramo más cercano
    let best = 0, bd = Infinity;
    for (let s = 0; s < n; s++) { const i = c * NS + s, d = yc < b.lo[i] ? b.lo[i] - yc : yc > b.hi[i] ? yc - b.hi[i] : 0; if (d < bd) { bd = d; best = s; } }
    const i = c * NS + best;
    if (yc < b.lo[i]) b.lo[i] = yc;
    if (tc > b.hi[i]) { b.hi[i] = tc; b.gx[i] = g8(gx); b.gz[i] = g8(gz); }
  }
  // Recorre los tramos de la celda de (x, z): fn(bajo, altoEnEsePunto) en metros
  function spans(x, z, fn) {
    const ix = Math.floor(x / CELL), iz = Math.floor(z / CELL), bx = Math.floor(ix / B), bz = Math.floor(iz / B), k = key(bx, bz);
    const c = (ix - bx * B) + (iz - bz * B) * B, dx = x - (ix + 0.5) * CELL, dz = z - (iz + 0.5) * CELL;
    for (const M of [blocks, flora]) {
      const b = M.get(k); if (!b) continue;
      const n = b.n[c];
      for (let s = 0; s < n; s++) {
        const i = c * NS + s, lo = b.lo[i] / 100, hc = b.hi[i] / 100;
        const top = Math.max(lo, hc + (b.gx[i] * dx + b.gz[i] * dz) / 40);
        if (fn(lo, top) === false) return;
      }
    }
  }

  // ---------- Rasterizado de triángulos (muestreo de la superficie cada 0,7 celdas) ----------
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
  function tri(a, b, c) {
    e1.subVectors(b, a); e2.subVectors(c, a); nn.crossVectors(e1, e2);
    const len = nn.length(); if (len < 1e-9) return;
    triangulos++;
    const ny = nn.y / len, steep = Math.abs(ny) < 0.3;
    const gx = steep ? 0 : -nn.x / nn.y, gz = steep ? 0 : -nn.z / nn.y;
    const ymin = Math.min(a.y, b.y, c.y), ymax = Math.max(a.y, b.y, c.y);
    const st = CELL * 0.7, nu = Math.min(400, Math.max(1, Math.ceil(e1.length() / st))), nv = Math.min(400, Math.max(1, Math.ceil(e2.length() / st)));
    let lastC = NaN;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      for (let j = 0; j <= nv; j++) {
        const v = j / nv; if (u + v > 1.0001) break;
        const x = a.x + e1.x * u + e2.x * v, y = a.y + e1.y * u + e2.y * v, z = a.z + e1.z * u + e2.z * v;
        const ix = Math.floor(x / CELL), iz = Math.floor(z / CELL);
        if (!steep) {
          const ck = ix * 100003 + iz; if (ck === lastC) continue; lastC = ck; // misma celda: el alto ya es el del plano
          const cx = (ix + 0.5) * CELL, cz = (iz + 0.5) * CELL;
          const top = Math.max(ymin, Math.min(ymax, a.y + gx * (cx - a.x) + gz * (cz - a.z)));
          insert(ix, iz, y, top, gx, gz);
        } else insert(ix, iz, y, y, 0, 0);
      }
    }
  }
  // Geometría con matriz de mundo (y matriz de instancia, si la hay) → triángulos, por tandas.
  // Primero lo estático (edificios, estructuras, contenido); al terminarlo se tapan los huecos (rellenar); luego la flora.
  const cola = [], colaFlora = [];
  function encolar(geo, matriz, etiqueta, region) {
    const pos = geo.attributes.position, idx = geo.index, nt = idx ? idx.count / 3 : pos.count / 3;
    (region ? colaFlora : cola).push({ pos, idx, nt, t: 0, m: matriz.clone(), etiqueta, region });
  }
  // Huecos de la malla vistos desde arriba (el vértice abierto de un techo cónico, juntas entre piezas): una celda vacía
  // rodeada de celdas con sólido (las 4 de los lados o 6 de las 8) recibe un tramo con el alto medio de sus vecinas.
  // Así no se cae dentro de un bohío por la punta del techo.
  function alto1(ix, iz) {
    const bx = Math.floor(ix / B), bz = Math.floor(iz / B), b = blocks.get(key(bx, bz)); if (!b) return null;
    const c = (ix - bx * B) + (iz - bz * B) * B, n = b.n[c]; if (!n) return null;
    let i = c * NS, best = i; for (let s2 = 1; s2 < n; s2++) if (b.hi[i + s2] > b.hi[best]) best = i + s2;
    return [b.lo[best] / 100, b.hi[best] / 100];
  }
  function rellenar() {
    const nuevos = [];
    for (const k of sucios) {
      const b = blocks.get(k); if (!b) continue;
      const bx = Math.floor(k / 65536) - 32768, bz = (k % 65536) - 32768;
      for (let c = 0; c < B * B; c++) {
        if (b.n[c]) continue;
        const ix = bx * B + (c % B), iz = bz * B + Math.floor(c / B);
        let lados = 0, todos = 0, lo = Infinity, sum = 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const v = alto1(ix + dx, iz + dz); if (!v) continue;
          todos++; if (!dx || !dz) lados++; lo = Math.min(lo, v[0]); sum += v[1];
        }
        if (lados === 4 || todos >= 6) nuevos.push([ix, iz, lo, sum / todos]);
      }
    }
    sucios.clear();
    for (const [ix, iz, lo, top] of nuevos) { insert(ix, iz, lo, top, 0, 0); insert(ix, iz, top, top, 0, 0); }
    sucios.clear();
    return nuevos.length;
  }
  let rellenas = 0, version = 0; // version sube cada vez que termina una pieza (fisica renueva su caché de colliders)
  function trabajar(msMax, soloEstatico) {
    const t0 = performance.now();
    while ((cola.length || (colaFlora.length && !soloEstatico)) && performance.now() - t0 < msMax) {
      const Q = cola.length ? cola : colaFlora, J = Q[0], p = J.pos, I = J.idx, m = J.m;
      destino = J.region ? flora : blocks; regionActual = J.region || null; tipoActual = /^(edificios|estructura)/.test(J.etiqueta || '') ? 0 : /roca|piedras/.test(J.etiqueta || '') ? 2 : 1;
      const fin = Math.min(J.nt, J.t + 400);
      for (let t = J.t; t < fin; t++) {
        const i0 = I ? I.getX(t * 3) : t * 3, i1 = I ? I.getX(t * 3 + 1) : t * 3 + 1, i2 = I ? I.getX(t * 3 + 2) : t * 3 + 2;
        va.fromBufferAttribute(p, i0).applyMatrix4(m); vb.fromBufferAttribute(p, i1).applyMatrix4(m); vc.fromBufferAttribute(p, i2).applyMatrix4(m);
        tri(va, vb, vc);
      }
      J.t = fin;
      if (J.t >= J.nt) { Q.shift(); version++; if (Q === cola && !cola.length) { destino = blocks; rellenas += rellenar(); } }
    }
    destino = blocks; regionActual = null;
    return !cola.length && !colaFlora.length;
  }
  const valida = o => o.isMesh && !o.isSkinnedMesh && !o.userData.sinSolido && o.visible !== false &&
    !(o.material && (o.material.transparent || o.material.depthWrite === false || o.material.isMeshBasicMaterial));
  // Para añadir piezas en cualquier momento (p. ej. el streaming de edificios): Mesh o Group de Mesh con su matriz (matrix o
  // position/quaternion/scale; sin padre, o con el padre ya colocado). Va a lo estático (no se descarga).
  function agregar(obj) {
    obj.updateMatrixWorld(true);
    obj.traverse(o => { if (valida(o) && o.geometry && o.geometry.attributes.position) encolar(o.geometry, o.matrixWorld, o.name); });
  }

  // ---------- Qué se rasteriza ----------
  const hechos = new Set();
  function estaticos() {
    for (const o of scene.children) {
      if (!/^(edificios|estructura):/.test(o.name || '') || hechos.has(o)) continue;
      hechos.add(o);
      if (o.isInstancedMesh) instanciadas(o); else agregar(o);
    }
    contenido();
  }
  // Edificios instanciados (InstancedMesh edificios:*: una malla por modelo y zona): cada instancia va a su región de 24 m y
  // se rasteriza cuando el jugador se acerca, como la flora
  function instanciadas(mesh) {
    if (!porRegion) porRegion = new Map();
    mesh.updateMatrixWorld(true);
    const m = new THREE.Matrix4(), w = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m); w.multiplyMatrices(mesh.matrixWorld, m); p.setFromMatrixPosition(w);
      const k = Math.floor(p.x / SO.regionM) + ',' + Math.floor(p.z / SO.regionM);
      let l = porRegion.get(k); if (!l) porRegion.set(k, l = []);
      l.push({ m: mesh.name, mat: w.toArray(), geos: [mesh.geometry] });
      regiones.delete(k); // si la región ya estaba hecha, se rehace con el edificio nuevo
    }
  }
  // Grupos del contenido con collider de taller o de estaca (el taller, los postes de los terrenos)
  const KIND_CONTENIDO = new Set(['taller', 'post']);
  const contHechos = new Map();
  function contenido() {
    for (const c of G.fisica.colliders) {
      if (!KIND_CONTENIDO.has(c.kind)) continue;
      let best = null, bd = 0.8;
      for (const o of scene.children) {
        if (!o.isGroup && !o.isMesh) continue;
        const d = Math.hypot(o.position.x - c.x, o.position.z - c.z); if (d < bd) { bd = d; best = o; }
      }
      if (!best) continue;
      let n = 0; best.traverse(o => { if (valida(o)) n++; });
      if (n && contHechos.get(best) !== n) { contHechos.set(best, n); agregar(best); }
    }
  }
  // Rocas, troncos caídos y árboles por regiones alrededor del jugador
  const regiones = new Map(); let porRegion = null;
  function prepararFlora() {
    const V = G.vegetacion; if (!V || !V.instancias) return;
    if (!porRegion) porRegion = new Map();
    const inst = V.instancias;
    for (const m in inst) {
      const geos = [];
      for (const tipo of ['corteza', 'roca']) { const mesh = scene.getObjectByName('flora:' + m + ':' + tipo); if (mesh && mesh.geometry) geos.push(mesh.geometry); }
      if (!geos.length) continue;
      const P = inst[m];
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i * 4], z = P.pos[i * 4 + 2], k = Math.floor(x / SO.regionM) + ',' + Math.floor(z / SO.regionM);
        let l = porRegion.get(k); if (!l) porRegion.set(k, l = []);
        l.push({ m, i, geos, P });
      }
    }
  }
  const mInst = new THREE.Matrix4();
  function floraCerca() {
    if (!porRegion) return;
    const r = Math.ceil(SO.regionR / SO.regionM), cx = Math.floor(S.pos.x / SO.regionM), cz = Math.floor(S.pos.z / SO.regionM);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const k = (cx + dx) + ',' + (cz + dz); if (regiones.has(k)) continue;
      regiones.set(k, true);
      for (const it of porRegion.get(k) || []) { if (it.mat) mInst.fromArray(it.mat); else mInst.fromArray(it.P.mat, it.i * 16); for (const g of it.geos) encolar(g, mInst, it.m, k); }
    }
    // Lejos (más de regionR + 2 regiones): se descarga la flora de esa región (vuelve a hacerse al acercarse)
    const lejos = (SO.regionR + SO.regionM * 2) / SO.regionM;
    for (const k of regiones.keys()) {
      const [rx, rz] = k.split(',').map(Number);
      if (Math.abs(rx - cx) <= lejos && Math.abs(rz - cz) <= lejos) continue;
      if (colaFlora.some(J => J.region === k)) continue;
      regiones.delete(k);
      for (const bk of regionBloques.get(k) || []) { const b = flora.get(bk); if (!b) continue; b.duenos.delete(k); if (!b.duenos.size) flora.delete(bk); }
      regionBloques.delete(k);
    }
  }
  // ¿La región de (x, z) ya está hecha? (para ignorar el collider a mano de un árbol solo cuando su sólido existe)
  const regionHecha = (x, z) => regiones.has(Math.floor(x / SO.regionM) + ',' + Math.floor(z / SO.regionM));

  let estaticosListos = false, resolver = null;
  const listo = new Promise(r => { resolver = r; });
  // La flora y lo estático arrancan por separado: con el streaming de edificios, mundo.listo puede tardar o no llegar,
  // y sin esto los árboles se quedaban sin sólido (ni ramas ni troncos)
  Promise.resolve(G.vegetacion && G.vegetacion.listo).then(() => { prepararFlora(); floraCerca(); }).catch(() => {});
  Promise.resolve(G.mundo && G.mundo.listo).then(() => { estaticos(); setTimeout(contenido, 1500); }).catch(() => {}); // el taller carga después
  setInterval(estaticos, 2000); // edificios que se añadan después (InstancedMesh por zonas, piezas del contenido)
  G.on('update', () => {
    if (!cola.length && !colaFlora.length && !estaticosListos && blocks.size && porRegion) { estaticosListos = true; resolver(); }
    floraCerca();
    if (cola.length || colaFlora.length) trabajar(SO.msCuadro);
  }, 96);
  // Termina todo lo pendiente ya (pruebas y capturas)
  function terminar(soloEstatico) {
    if (soloEstatico) { while (cola.length) trabajar(50, true); return; }
    floraCerca(); while (cola.length || colaFlora.length) trabajar(50); if (!estaticosListos && porRegion) { estaticosListos = true; resolver(); }
  }

  // ---------- Consultas para fisica.js ----------
  const RING = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  // Suelo: el alto más alto de los tramos que quedan bajo los pies (hasta tolSuelo por encima), en el pie y un poco alrededor
  // tol: cuánto por encima de los pies cuenta como suelo (por defecto tolSuelo, para subir escalones caminando; en el aire,
  // fisica.js pasa casi 0: así un saltito junto a una cerca no la sube encima)
  function suelo(x, z, y, tol) {
    if (!blocks.size && !flora.size) return -Infinity;
    const t = tol != null ? tol : SO.tolSuelo;
    let g = -Infinity;
    for (let k = 0; k < 5; k++) {
      spans(x + RING[k][0] * SO.pie, z + RING[k][1] * SO.pie, (lo, top) => { if (top <= y + t && top > g) g = top; });
    }
    return g;
  }
  // Cuánto se mete el cuerpo en (x, z) con los pies en y en algo más alto que un escalón: 0 = libre; el centro pesa 3 y
  // cada punto del borde 1. fisica.js deja moverse si no aumenta (así se sale de un sitio estrecho y se desliza por la pared).
  // h: alto del cuerpo (por defecto SO.cuerpo; nadando, fisica.js lo alarga hasta encima del agua: una canoa a flote frena)
  function penetra(x, z, y, h) {
    let n = 0;
    const alto = h != null ? h : SO.cuerpo;
    for (let k = 0; k < RING.length; k++) {
      let hit = false;
      spans(x + RING[k][0] * SO.radio, z + RING[k][1] * SO.radio, (lo, top) => { if (lo < y + alto && top > y + SO.stepUp) { hit = true; return false; } });
      if (hit) n += k ? 1 : 3;
    }
    return n;
  }
  const bloquea = (x, z, y) => penetra(x, z, y) > 0;
  // Techo al subir: el bajo del primer tramo que cruza la cabeza entre y0 y y1 (o Infinity)
  function techo(x, z, y0, y1) {
    let t = Infinity;
    spans(x, z, (lo, top) => { if (lo >= y0 + SO.cuerpo - 0.05 && lo < y1 + SO.cuerpo && lo < t) t = lo; });
    return t;
  }
  // Lo fino: el tramo bajo los pies cae más de finoCaida a ambos lados en x o en z (rama, baranda, poste, cumbrera)
  function altoEn(x, z, y) { let g = -Infinity; spans(x, z, (lo, top) => { if (top <= y + SO.tolSuelo && top > g) g = top; }); return g; }
  function fino(x, z, y) {
    const g = altoEn(x, z, y); if (g === -Infinity) return false;
    const d = CELL * 1.5, c = g - SO.finoCaida;
    const bajoX = altoEn(x + d, z, g) < c && altoEn(x - d, z, g) < c, bajoZ = altoEn(x, z + d, g) < c && altoEn(x, z - d, g) < c;
    return bajoX || bajoZ;
  }
  // Percha cercana para aterrizar: el punto fino más próximo dentro de r con su alto entre y - 1,2 y y + 0,1
  function percha(x, z, y, r) {
    let best = null, bd = Infinity;
    const n = Math.ceil(r / CELL);
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const px = x + i * CELL, pz = z + j * CELL, d = Math.hypot(i, j) * CELL; if (d > r || d >= bd) continue;
      const g = altoEn(px, pz, y + 0.1); if (g < y - 1.2 || g === -Infinity) continue;
      if (fino(px, pz, g + 0.01)) { bd = d; best = { x: (Math.floor(px / CELL) + 0.5) * CELL, z: (Math.floor(pz / CELL) + 0.5) * CELL, y: g }; }
    }
    return best;
  }
  // Para la cámara: el alto del tramo que contiene la altura y (con margen), o -Infinity
  function dentro(x, z, y) { let t = -Infinity; spans(x, z, (lo, top) => { if (y > lo - 0.3 && y < top + 0.4 && top > t) t = top; }); return t; }
  // Sobre qué está parada en (x, z) con los pies en y: 'techo', 'cumbrera', 'baranda', 'poste', 'cornisa', 'rama', 'roca' o null
  function que(x, z, y) {
    const ix = Math.floor(x / CELL), iz = Math.floor(z / CELL), bx = Math.floor(ix / B), bz = Math.floor(iz / B), kk = key(bx, bz), c = (ix - bx * B) + (iz - bz * B) * B;
    let mejor = -Infinity, deFlora = false, tipo = 0;
    for (const M of [blocks, flora]) {
      const b = M.get(kk); if (!b) continue;
      for (let s2 = 0; s2 < b.n[c]; s2++) { const top = b.hi[c * NS + s2] / 100; if (top <= y + SO.tolSuelo && top > mejor) { mejor = top; deFlora = M === flora; tipo = deFlora && b.k ? b.k[c] : 0; } }
    }
    if (mejor === -Infinity) return null;
    if (deFlora && tipo) return tipo & 2 && !(tipo & 1) ? 'roca' : 'rama'; // edificios instanciados (tipo 0): como los demás
    const h = y - G.terreno.height(x, z);
    if (!fino(x, z, y + 0.01)) return h >= 1.8 ? 'techo' : 'cornisa';
    const d = CELL * 1.5, g = altoEn(x, z, y + 0.01), c2 = g - SO.finoCaida;
    const bajoX = altoEn(x + d, z, g) < c2 && altoEn(x - d, z, g) < c2, bajoZ = altoEn(x, z + d, g) < c2 && altoEn(x, z - d, g) < c2;
    return h >= 2.5 ? 'cumbrera' : bajoX && bajoZ ? 'poste' : 'baranda';
  }
  // ¿Hay sólido donde está el collider a mano? (entonces sobra)
  function cubre(c) {
    if (c.kind === 'arbol' && !regionHecha(c.x, c.z)) return false;
    // el centro y, en los grandes, puntos a 0,3 y 0,6 del radio (el centro de un techo de paja puede estar hueco)
    const r = c.hx ? Math.max(c.hx, c.hz) : c.r || 0, pts = [[0, 0]];
    if (r > 1) for (const f of [0.3, 0.6]) for (const [dx, dz] of RING.slice(1)) pts.push([dx * r * f, dz * r * f]);
    let n = 0;
    for (const [dx, dz] of pts) { let hay = false; spans(c.x + dx, c.z + dz, () => { hay = true; return false; }); if (hay && (++n >= Math.min(2, pts.length))) return true; }
    return false;
  }
  function stats() {
    const kb = n => Math.round(n * B * B * (1 + NS * 6) / 1024);
    return { bloques: blocks.size, bloquesFlora: flora.size, triangulos, rellenas, pendientes: cola.length + colaFlora.length, regiones: regiones.size, kb: kb(blocks.size), kbFlora: kb(flora.size) };
  }
  return { SO, CELL, listo, get version() { return version; }, get activo() { return blocks.size > 0 || flora.size > 0; }, suelo, bloquea, penetra, techo, fino, percha, cubre, dentro, que, agregar, terminar, stats, altoEn };
});
