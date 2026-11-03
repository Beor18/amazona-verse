// Regenera assets/data/mapa_cap1_altura.js muestreando la malla final del terreno
// (assets/models/mapa/terreno_{no,ne,so,se}.glb), sin Blender.
//
// Por qué existe: la integración TransferNow (28694db / 842452c) trajo un terreno
// nuevo de 80.000 triángulos y conservó el heightmap viejo. Fuera de la caja de la
// malla (anillo costero hasta ±264 m) el heightmap viejo declaraba tierra (hasta
// +3,3 m) donde hoy se ve mar abierto: terreno.height() cae al heightmap cuando
// triQuery no encuentra malla y la flora se sembraba flotando sobre el agua
// (KIMI-Task-006) con alturas inconsistentes en las laderas del borde (KIMI-Task-008).
//
// Qué hace:
//   1. Muestrea la altura exacta de la malla en cada punto de la rejilla de 265×265
//      (paso 2 m, mismo formato que mapa_build.py: triángulo superior, baricéntrica).
//   2. En las celdas sin malla propaga la altura del borde con una pendiente de
//      salida al mar (0,35 m/m) y, fuera de la caja de la malla, la fuerza bajo el
//      nivel del mar (<= -0,4 m, fondo -9 m): allí el juego dibuja el plano de mar.
//   3. Recalcula min/max y el error frente a la malla y escribe el .js con el
//      mismo formato que la salida de tools/blender/mapa_build.py.
//
// Uso: node tools/blender/mapa_altura_desde_glb.js
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------- GLB -> triángulos
function parseGLB(file) {
  const buf = fs.readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
  const binBuf = buf.slice(20 + jsonLen + 8);
  const tris = [];
  const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const acc = i => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView]; return new (CT[a.componentType])(binBuf.buffer, binBuf.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * NC[a.type]); };
  function nodeMat(n) {
    if (n.matrix) return n.matrix;
    const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
    const [x, y, z, w] = r;
    return [(1 - 2 * (y * y + z * z)) * s[0], (2 * (x * y + z * w)) * s[0], (2 * (x * z - y * w)) * s[0], 0,
      (2 * (x * y - z * w)) * s[1], (1 - 2 * (x * x + z * z)) * s[1], (2 * (y * z + x * w)) * s[1], 0,
      (2 * (x * z + y * w)) * s[2], (2 * (y * z - x * w)) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1];
  }
  function mul(a, b) { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; }
  function apply(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }
  (function walk(ni, parent) {
    const n = json.nodes[ni];
    const m = parent ? mul(parent, nodeMat(n)) : nodeMat(n);
    if (n.mesh != null) for (const p of json.meshes[n.mesh].primitives) {
      const pos = acc(p.attributes.POSITION), idx = p.indices != null ? acc(p.indices) : null;
      const nidx = idx ? idx.length : pos.length / 3;
      for (let t = 0; t < nidx; t += 3) {
        const tri = [];
        for (let v = 0; v < 3; v++) { const vi = idx ? idx[t + v] : t + v; tri.push(apply(m, pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2])); }
        tris.push(tri);
      }
    }
    for (const c of n.children || []) walk(c, m);
  })(json.scenes[json.scene || 0].nodes[0], null);
  for (const ni of json.scenes[json.scene || 0].nodes.slice(1)) (function walk(ni, parent) {
    const n = json.nodes[ni];
    const m = parent ? mul(parent, nodeMat(n)) : nodeMat(n);
    if (n.mesh != null) for (const p of json.meshes[n.mesh].primitives) {
      const pos = acc(p.attributes.POSITION), idx = p.indices != null ? acc(p.indices) : null;
      const nidx = idx ? idx.length : pos.length / 3;
      for (let t = 0; t < nidx; t += 3) {
        const tri = [];
        for (let v = 0; v < 3; v++) { const vi = idx ? idx[t + v] : t + v; tri.push(apply(m, pos[vi * 3], pos[vi * 3 + 1], pos[vi * 3 + 2])); }
        tris.push(tri);
      }
    }
    for (const c of n.children || []) walk(c, m);
  })(ni, null);
  return tris;
}

console.log('[altura] cargando malla del terreno...');
let tris = [];
for (const f of ['terreno_no.glb', 'terreno_ne.glb', 'terreno_so.glb', 'terreno_se.glb'])
  tris = tris.concat(parseGLB(path.join(ROOT, 'assets', 'models', 'mapa', f)));
console.log('[altura] %d triángulos', tris.length);

let mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
for (const t of tris) for (const p of t) {
  if (p[0] < mnx) mnx = p[0]; if (p[0] > mxx) mxx = p[0];
  if (p[2] < mnz) mnz = p[2]; if (p[2] > mxz) mxz = p[2];
}
console.log('[altura] caja de la malla: x ' + mnx.toFixed(1) + '..' + mxx.toFixed(1) + ' · z ' + mnz.toFixed(1) + '..' + mxz.toFixed(1));

// ------------------------------------------------- rejilla CSR de triángulos (4 m)
// Misma idea que terreno.js buildTriGrid: celda -> triángulos que la tocan.
const NX = 265, NZ = 265, PASO = 2.0, X0 = -264.0, Z0 = -264.0;   // heightmap
const CELL = 4, GX0 = X0, GZ0 = Z0;
const gnx = Math.ceil((NX - 1) * PASO / CELL) + 1, gnz = Math.ceil((NZ - 1) * PASO / CELL) + 1;
const cnt = new Uint32Array(gnx * gnz + 1);
const eachCelda = (tri, f) => {
  const xs = [tri[0][0], tri[1][0], tri[2][0]], zs = [tri[0][2], tri[1][2], tri[2][2]];
  const i0 = Math.max(0, Math.floor((Math.min(...xs) - GX0) / CELL)), i1 = Math.min(gnx - 1, Math.floor((Math.max(...xs) - GX0) / CELL));
  const k0 = Math.max(0, Math.floor((Math.min(...zs) - GZ0) / CELL)), k1 = Math.min(gnz - 1, Math.floor((Math.max(...zs) - GZ0) / CELL));
  for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) f(k * gnx + i);
};
tris.forEach(t => eachCelda(t, ci => cnt[ci + 1]++));
for (let i = 1; i < cnt.length; i++) cnt[i] += cnt[i - 1];
const lista = new Uint32Array(cnt[cnt.length - 1]);
const fill = cnt.slice(0, gnx * gnz);
tris.forEach((t, ti) => eachCelda(t, ci => { lista[fill[ci]++] = ti; }));

// Altura de la malla en (x, z): baricéntrica sobre el triángulo superior (max y). NaN si no hay malla.
function meshHeight(x, z) {
  const ix = Math.floor((x - GX0) / CELL), iz = Math.floor((z - GZ0) / CELL);
  if (ix < 0 || iz < 0 || ix >= gnx || iz >= gnz) return NaN;
  const ci = iz * gnx + ix;
  let best = NaN;
  for (let n = cnt[ci]; n < cnt[ci + 1]; n++) {
    const tri = tris[lista[n]];
    const [a, b, c] = tri;
    const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(d) < 1e-9) continue;
    const wa = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
    const wb = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
    const wc = 1 - wa - wb;
    if (wa < -1e-5 || wb < -1e-5 || wc < -1e-5) continue;
    const y = wa * a[1] + wb * b[1] + wc * c[1];
    if (!(y <= best)) best = y;
  }
  return best;
}

// ---------------------------------------------------------------- 1. muestreo directo
console.log('[altura] muestreando rejilla %dx%d...', NX, NZ);
const H = new Float64Array(NX * NZ);
const hit = new Uint8Array(NX * NZ);
for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
  const y = meshHeight(X0 + i * PASO, Z0 + k * PASO);
  if (y === y) { H[k * NX + i] = y; hit[k * NX + i] = 1; }
}
let nHit = 0; for (let i = 0; i < NX * NZ; i++) nHit += hit[i];
console.log('[altura] con malla: %d · sin malla: %d', nHit, NX * NZ - nHit);

// -------------------------------------------- 2. relleno del anillo / huecos (BFS)
// Multi-fuente desde las celdas con malla; distancia en pasos de rejilla.
const FUERA = 1e9;
const dist = new Float64Array(NX * NZ).fill(FUERA);
const src = new Int32Array(NX * NZ).fill(-1);
const cola = [];
for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
  const o = k * NX + i;
  if (hit[o]) { dist[o] = 0; src[o] = o; cola.push(o); }
}
for (let q = 0; q < cola.length; q++) {
  const o = cola[q], i = o % NX, k = (o / NX) | 0;
  for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ni = i + di, nk = k + dk;
    if (ni < 0 || nk < 0 || ni >= NX || nk >= NZ) continue;
    const no = nk * NX + ni;
    if (dist[no] > dist[o] + 1) { dist[no] = dist[o] + 1; src[no] = src[o]; cola.push(no); }
  }
}
const PEND_MAR = 0.35;      // pendiente de salida al mar (m por m)
const BAJO_MAR = -0.4;      // tope fuera de la malla: siempre bajo el nivel del mar (0)
const FONDO = -9.0;         // fondo del arrecife, como en el diseño del mapa
const MARGEN = 1.0;         // la caja de la malla, con 1 m de margen
let nAnillo = 0, nHueco = 0;
for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
  const o = k * NX + i;
  if (hit[o]) continue;
  const x = X0 + i * PASO, z = Z0 + k * PASO;
  const dM = dist[o] * PASO;
  let y = H[src[o]] - PEND_MAR * dM;
  const fuera = x < mnx - MARGEN || x > mxx + MARGEN || z < mnz - MARGEN || z > mxz + MARGEN;
  if (fuera) { y = Math.min(y, BAJO_MAR); nAnillo++; } else nHueco++;
  H[o] = Math.max(y, FONDO);
}
console.log('[altura] relleno: anillo costero %d celdas · huecos internos %d', nAnillo, nHueco);

// ------------------------------------------------------------- 3. min/max y cuantización
let hmin = Infinity, hmax = -Infinity;
for (let i = 0; i < NX * NZ; i++) { if (H[i] < hmin) hmin = H[i]; if (H[i] > hmax) hmax = H[i]; }
hmin = Math.floor(hmin); hmax = Math.ceil(hmax);
const Q = new Uint16Array(NX * NZ);
for (let i = 0; i < NX * NZ; i++) Q[i] = Math.round((H[i] - hmin) / (hmax - hmin) * 65535);

// Bilineal sobre la rejilla cuantizada (igual que alturaEn del .js generado)
const HQ = new Float64Array(NX * NZ);
for (let i = 0; i < NX * NZ; i++) HQ[i] = hmin + Q[i] / 65535 * (hmax - hmin);
function hmQ(x, z) {
  let fx = (x - X0) / PASO, fz = (z - Z0) / PASO;
  fx = Math.max(0, Math.min(NX - 1.001, fx)); fz = Math.max(0, Math.min(NZ - 1.001, fz));
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, o = iz * NX + ix;
  return (HQ[o] * (1 - tx) + HQ[o + 1] * tx) * (1 - tz) + (HQ[o + NX] * (1 - tx) + HQ[o + NX + 1] * tx) * tz;
}

// Error frente a la malla en puntos al azar de tierra firme (como mapa_build.py)
let rng = 3;
const rnd = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const errs = [];
for (let n = 0; n < 20000 && errs.length < 4000; n++) {
  const x = -230 + rnd() * 460, z = -230 + rnd() * 460;
  const y = meshHeight(x, z);
  if (!(y === y) || y < 0) continue;
  errs.push(Math.abs(hmQ(x, z) - y));
}
errs.sort((a, b) => a - b);
const eMedio = errs.reduce((s, e) => s + e, 0) / errs.length;
const eP95 = errs[Math.floor(errs.length * 0.95)];
const eMax = errs[errs.length - 1];
console.log('[altura] error frente a la malla (tierra firme): medio ' + eMedio.toFixed(3) + ' m · p95 ' + eP95.toFixed(3) + ' m · máx ' + eMax.toFixed(3) + ' m (' + errs.length + ' puntos)');

// ------------------------------------------------------------- 4. escribir el .js
const b64 = Buffer.from(Q.buffer, Q.byteOffset, Q.byteLength).toString('base64');
const f1 = v => Number(v.toFixed(1)).toString();   // -264.0 -> "-264", igual que %s de Python con float
const HJS = `// Generado por tools/blender/mapa_altura_desde_glb.js (Node; mismo muestreo que mapa_build.py). Alturas del terreno del Cap. 1 muestreadas de la malla final.
(function () {
var A = window.AV_MAPA_CAP1_ALTURA = {nx: ${NX}, nz: ${NZ}, x0: ${f1(X0)}, z0: ${f1(Z0)}, paso: ${f1(PASO)}, min: ${f1(hmin)}, max: ${f1(hmax)}, formato: 'Uint16 little-endian, fila = z, columna = x; altura = min + v / 65535 * (max - min)',
  error: {medio: ${eMedio.toFixed(3)}, p95: ${eP95.toFixed(3)}, max: ${eMax.toFixed(3)}}, datos: "${b64}"};
var bin = atob(A.datos), u8 = new Uint8Array(bin.length);
for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
var u16 = new Uint16Array(u8.buffer), k = (A.max - A.min) / 65535, h = new Float32Array(u16.length);
for (i = 0; i < u16.length; i++) h[i] = A.min + u16[i] * k;
A.alturas = h; A.datos = null;
A.alturaEn = function (x, z) {
  var fx = (x - A.x0) / A.paso, fz = (z - A.z0) / A.paso;
  fx = Math.max(0, Math.min(A.nx - 1.001, fx)); fz = Math.max(0, Math.min(A.nz - 1.001, fz));
  var ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, o = iz * A.nx + ix;
  return (h[o] * (1 - tx) + h[o + 1] * tx) * (1 - tz) + (h[o + A.nx] * (1 - tx) + h[o + A.nx + 1] * tx) * tz;
};
A.normalEn = function (x, z) {
  var e = A.paso, dx = A.alturaEn(x + e, z) - A.alturaEn(x - e, z), dz = A.alturaEn(x, z + e) - A.alturaEn(x, z - e), l = Math.hypot(dx, 2 * e, dz);
  return {x: -dx / l, y: 2 * e / l, z: -dz / l};
};
})();
`;
const out = path.join(ROOT, 'assets', 'data', 'mapa_cap1_altura.js');
fs.writeFileSync(out, HJS);
console.log('[altura] escrito %s (%d KB)', path.relative(ROOT, out), HJS.length >> 10);

// ------------------------------------------------------------- 5. verificación
// (a) fuera de la caja de la malla nada puede quedar sobre el nivel del mar
let mal = 0;
for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
  const x = X0 + i * PASO, z = Z0 + k * PASO;
  if (x < mnx - MARGEN || x > mxx + MARGEN || z < mnz - MARGEN || z > mxz + MARGEN) {
    if (hmQ(x, z) > -0.15) mal++;
  }
}
console.log('[altura] celdas del anillo sobre el nivel del mar tras el arreglo: %d (deben ser 0)', mal);
// (b) puntos jugables: la altura del heightmap no se mueve de la malla;
//     los puntos sin malla de terreno (cuevas) deben tener roca de grutas por encima
//     del heightmap: ahí el suelo lo da el sólido de la roca (solidos.js), no el heightmap
const grutas = parseGLB(path.join(ROOT, 'assets', 'models', 'mapa', 'grutas.glb'));
function rocaBajo(x, z) {
  let best = NaN;
  for (const tri of grutas) {
    const [a, b, c] = tri;
    const d = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(d) < 1e-9) continue;
    const wa = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / d;
    const wb = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / d;
    const wc = 1 - wa - wb;
    if (wa < -1e-5 || wb < -1e-5 || wc < -1e-5) continue;
    const y = wa * a[1] + wb * b[1] + wc * c[1];
    if (!(y <= best)) best = y;
  }
  return best;
}
global.window = {};
require(path.join(ROOT, 'assets', 'data', 'mapa_cap1.js'));
const D = window.AV_MAPA_CAP1;
const pts = [];
for (const id in D.lugares) pts.push([id, D.lugares[id].x, D.lugares[id].z]);
for (const p of D.pois || []) pts.push(['poi:' + p.id, p.pos[0], p.pos[2]]);
pts.push(['spawn', D.spawn.x, D.spawn.z]);
let peor = 0, peorK = '';
const sinMalla = [];
for (const [k2, px, pz] of pts) {
  const y = meshHeight(px, pz);
  if (!(y === y)) {
    const yr = rocaBajo(px, pz);
    if (!(yr === yr) || yr < hmQ(px, pz)) { console.error('[altura] FALLO: %s sin malla y sin roca encima del heightmap', k2); process.exit(1); }
    sinMalla.push(k2 + ' (roca ' + yr.toFixed(2) + ' m)');
    continue;
  }
  const d = Math.abs(hmQ(px, pz) - y);
  if (d > peor) { peor = d; peorK = k2; }
}
console.log('[altura] peor desvío en ' + pts.length + ' puntos jugables: ' + peor.toFixed(3) + ' m (' + peorK + ')' + (sinMalla.length ? ' · sin malla de terreno, con roca: ' + sinMalla.join(', ') : ''));
if (mal > 0 || peor > 0.5) { console.error('[altura] FALLO la verificación'); process.exit(1); }
console.log('[altura] OK');
