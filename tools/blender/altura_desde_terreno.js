// Regenera assets/data/mapa_cap1_altura.js muestreando la malla visible del terreno (trozos terreno_*.glb).
// Uso: node tools/blender/altura_desde_terreno.js            (reecribe assets/data/mapa_cap1_altura.js)
// Salidas: assets/data/mapa_cap1_altura.js (mismo formato de siempre) y un resumen con el error y las
// alturas jugables conservadas. Sin dependencias (node >= 16). Reversible: el archivo anterior está en git.
//
// Por qué: tras integrar el terreno original de Kelvin (28694db/842452c), la malla visible y este
// heightmap eran superficies distintas (KIMI-Task-006/008): la flora se sembraba con la altura vieja y
// quedaba flotando sobre el mar donde la malla nueva no llega, y enterrada o tapada en las laderas del
// tepuy donde la malla gruesa (rejilla ~4,6 m) se aparta del mapa viejo. Este script hace que el
// heightmap sea EXACTAMENTE la superficie que se ve y sobre la que se camina (consulta por triángulo,
// la más alta, igual que terreno.js), con dos reglas:
//   - sin malla (mar abierto): se conserva el fondo marino viejo si ya estaba bajo el mar; si el mapa
//     viejo decía tierra donde hoy no hay terreno, se pone -0,6 (bajo el mar): ni suelo invisible ni
//     flora sobre el agua.
//   - alturas jugables de las misiones: en un radio de 6 m alrededor de los puntos de misión (spawn,
//     lugares, perchas, FIELD, RESOURCES, pozas, paradas…) se conserva el valor viejo si la diferencia
//     con la malla supera 0,5 m (hoy la diferencia medida es ~0,0 m: la malla ya se deformó a las
//     alturas del mapa viejo en 842452c; esto es un seguro declarado, no cambia nada en la práctica).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ALTURA = path.join(ROOT, 'assets', 'data', 'mapa_cap1_altura.js');
const MAPA = path.join(ROOT, 'assets', 'data', 'mapa_cap1.js');
const TROZOS = ['no', 'ne', 'so', 'se'].map(q => path.join(ROOT, 'assets', 'models', 'mapa', 'terreno_' + q + '.glb'));

// ---------- GLB ----------
function readGLB(file) {
  const data = fs.readFileSync(file);
  const jsonLen = data.readUInt32LE(12);
  const doc = JSON.parse(data.slice(20, 20 + jsonLen).toString());
  const off = 20 + jsonLen;
  const binLen = data.readUInt32LE(off);
  return { doc, bin: data.slice(off + 8, off + 8 + binLen) };
}
function accessor(glb, index) {
  const acc = glb.doc.accessors[index];
  const view = glb.doc.bufferViews[acc.bufferView];
  const C = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[acc.componentType];
  const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const start = (view.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new C(acc.count * width);
  new Uint8Array(out.buffer).set(glb.bin.slice(start, start + out.byteLength));
  return out;
}

// ---------- heightmap viejo (parámetros de rejilla + fondo marino + misiones) ----------
global.window = {};
eval(fs.readFileSync(ALTURA, 'utf8'));
const VIEJO = global.window.AV_MAPA_CAP1_ALTURA;
const hv = VIEJO.alturas;
function viejoAt(x, z) {
  let fx = (x - VIEJO.x0) / VIEJO.paso, fz = (z - VIEJO.z0) / VIEJO.paso;
  fx = Math.max(0, Math.min(VIEJO.nx - 1.001, fx)); fz = Math.max(0, Math.min(VIEJO.nz - 1.001, fz));
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, o = iz * VIEJO.nx + ix;
  return (hv[o] * (1 - tx) + hv[o + 1] * tx) * (1 - tz) + (hv[o + VIEJO.nx] * (1 - tx) + hv[o + VIEJO.nx + 1] * tx) * tz;
}
eval(fs.readFileSync(MAPA, 'utf8'));
const D = global.window.AV_MAPA_CAP1;

// ---------- malla del terreno visible (misma semántica que terreno.js: la cara más alta) ----------
let pos = [], tris = [], base = 0;
for (const f of TROZOS) {
  const glb = readGLB(f);
  for (const mesh of glb.doc.meshes) for (const prim of mesh.primitives) {
    const P = accessor(glb, prim.attributes.POSITION);
    const I = accessor(glb, prim.indices);
    for (let i = 0; i < P.length; i++) pos.push(P[i]);
    for (let i = 0; i < I.length; i++) tris.push(I[i] + base);
    base += P.length / 3;
  }
}
pos = new Float32Array(pos); tris = new Uint32Array(tris);
const CELL = 4, NX = Math.ceil(528 / CELL) + 1, NZ = NX;
const celdas = new Map();
for (let t = 0; t < tris.length / 3; t++) {
  const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
  const i0 = Math.max(0, Math.floor((Math.min(pos[a * 3], pos[b * 3], pos[c * 3]) + 264) / CELL));
  const i1 = Math.min(NX - 1, Math.floor((Math.max(pos[a * 3], pos[b * 3], pos[c * 3]) + 264) / CELL));
  const k0 = Math.max(0, Math.floor((Math.min(pos[a * 3 + 2], pos[b * 3 + 2], pos[c * 3 + 2]) + 264) / CELL));
  const k1 = Math.min(NZ - 1, Math.floor((Math.max(pos[a * 3 + 2], pos[b * 3 + 2], pos[c * 3 + 2]) + 264) / CELL));
  for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
    const key = k * NX + i;
    let l = celdas.get(key); if (!l) celdas.set(key, l = []);
    l.push(t);
  }
}
function tope(x, z) {
  const ix = Math.floor((x + 264) / CELL), iz = Math.floor((z + 264) / CELL);
  if (ix < 0 || iz < 0 || ix >= NX || iz >= NZ) return NaN;
  const l = celdas.get(iz * NX + ix);
  if (!l) return NaN;
  let best = NaN;
  for (const t of l) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
    const x0 = pos[a * 3], z0 = pos[a * 3 + 2], x1 = pos[b * 3], z1 = pos[b * 3 + 2], x2 = pos[c * 3], z2 = pos[c * 3 + 2];
    const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
    if (Math.abs(d) < 1e-9) continue;
    const wa = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d, wb = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d, wc = 1 - wa - wb;
    if (wa < -1e-5 || wb < -1e-5 || wc < -1e-5) continue;
    const y = wa * pos[a * 3 + 1] + wb * pos[b * 3 + 1] + wc * pos[c * 3 + 1];
    if (!(y <= best)) best = y;
  }
  return best;
}

// ---------- puntos de misión (alturas jugables que se conservan) ----------
const mision = [];
const add = (x, z, id) => { if (x != null && z != null && isFinite(x) && isFinite(z)) mision.push({ x, z, id }); };
if (D.spawn) add(D.spawn.x, D.spawn.z, 'spawn');
for (const k in D.lugares || {}) add(D.lugares[k].x, D.lugares[k].z, 'lugar:' + k);
const M = D.misiones || {};
for (const p of M.perchas || []) add(p.x, p.z, 'percha');
for (const p of M.FIELD || []) add(p.x, p.z, 'field:' + p.id);
for (const p of M.RESOURCES || []) add(p.x, p.z, 'recurso:' + p.id);
for (const p of M.BUSHES || []) add(p.x, p.z, 'bush');
for (const p of M.markTrees || []) add(p.x, p.z, 'markTree');
for (const p of M.ISLANDS || []) add(p.x, p.z, 'isla');
if (M.LUMA) add(M.LUMA.x, M.LUMA.z, 'luma');
if (M.GUARD) add(M.GUARD.x, M.GUARD.z, 'guard');
for (const p of D.agua.pozas || []) add(p.x, p.z, 'poza:' + p.id);
for (const p of D.pois || []) add(p.x, p.z, 'poi:' + p.id);
for (const p of D.decoracion || []) add(p.pos[0], p.pos[2], 'deco');
function conserva(x, z) { // null si no aplica; radio 6 m con borde suave
  for (const m of mision) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d < 6) return { p: 1 - (d / 6) * (d / 6) * (3 - 2 * d / 6), m };
  }
  return null;
}

// ---------- muestreo y cuantización ----------
const N = VIEJO.nx;
const H = new Float64Array(N * N);
let sinMalla = 0, fondoNuevo = 0, conservados = 0, maxConservado = 0;
for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
  const x = VIEJO.x0 + ix * VIEJO.paso, z = VIEJO.z0 + iz * VIEJO.paso, o = iz * N + ix;
  const v = hv[o];
  const t = tope(x, z);
  let h;
  if (t !== t) {
    sinMalla++;
    h = v < -0.2 ? v : -0.6; // mar: fondo viejo o agua poco profunda; nunca tierra invisible
    if (v >= -0.2) fondoNuevo++;
  } else h = t;
  const c = conserva(x, z);
  if (c && t === t && Math.abs(h - v) > 0.5) { // seguro de misiones: la malla existe y se aparta > 0,5 m del valor jugable
    const d0 = Math.abs(h - v);                  // (sin malla el valor correcto es el del mar: mezclar aquí resucitaría suelo invisible)
    h = h * (1 - c.p) + v * c.p;
    conservados++; if (d0 > maxConservado) maxConservado = d0;
  }
  H[o] = h;
}
let hmin = Infinity, hmax = -Infinity;
for (let i = 0; i < H.length; i++) { if (H[i] < hmin) hmin = H[i]; if (H[i] > hmax) hmax = H[i]; }
hmin = Math.floor(hmin); hmax = Math.ceil(hmax);
const Q = new Uint16Array(N * N);
for (let i = 0; i < H.length; i++) Q[i] = Math.round((H[i] - hmin) / (hmax - hmin) * 65535);

// error del mapa frente a la malla (puntos con terreno, como mapa_build)
const err = [];
for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) {
  const x = VIEJO.x0 + ix * VIEJO.paso, z = VIEJO.z0 + iz * VIEJO.paso;
  const t = tope(x, z);
  if (t !== t) continue;
  const o = iz * N + ix;
  err.push(Math.abs(hmin + Q[o] / 65535 * (hmax - hmin) - t));
}
err.sort((a, b) => a - b);
const em = err.reduce((a, b) => a + b, 0) / err.length;

// ---------- escritura (mismo formato que mapa_build.py) ----------
const js = `// Generado por tools/blender/altura_desde_terreno.js desde los trozos terreno_*.glb (terreno original
// de Kelvin, integrado en 28694db y deformado a las alturas del mapa en 842452c). El heightmap es la
// superficie visible: la flora, el agua y el suelo coinciden con la malla (KIMI-Task-006/008, 3-nov).
(function () {
var A = window.AV_MAPA_CAP1_ALTURA = {nx: ${N}, nz: ${N}, x0: ${VIEJO.x0}, z0: ${VIEJO.z0}, paso: ${VIEJO.paso}, min: ${hmin}, max: ${hmax}, formato: 'Uint16 little-endian, fila = z, columna = x; altura = min + v / 65535 * (max - min)',
  error: {medio: ${em.toFixed(3)}, p95: ${err[Math.floor(err.length * 0.95)].toFixed(3)}, max: ${err[err.length - 1].toFixed(3)}}, datos: "${Buffer.from(Q.buffer).toString('base64')}"};
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
fs.writeFileSync(ALTURA, js);

console.log('malla: %d vértices, %d triángulos', pos.length / 3, tris.length / 3);
console.log('muestreado: %d×%d, paso %s m — sin malla: %d celdas (fondo marino viejo conservado: %d; tierra vieja bajo el mar ahora: %d)',
  N, N, VIEJO.paso, sinMalla, sinMalla - fondoNuevo, fondoNuevo);
console.log('rango: [%s, %s] m   error vs malla: medio %s m, p95 %s m, máx %s m',
  hmin, hmax, em.toFixed(3), err[Math.floor(err.length * 0.95)].toFixed(3), err[err.length - 1].toFixed(3));
console.log('misiones: %d puntos vigilados; conservados con mezcla: %d (máx apartamiento %s m)',
  mision.length, conservados, maxConservado.toFixed(2));
console.log('escrito: %s (%s KB)', path.relative(ROOT, ALTURA), (js.length / 1024).toFixed(0));
