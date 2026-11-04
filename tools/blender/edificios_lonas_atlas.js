// KIMI-Task-010: repara la familia de lonas (campamento_c, carpa_a, carpa_e, carpa_f, toldo_pequeno).
// Los _hd de TransferNow llegaron con los materiales crudos (3-5 por modelo, texturas embebidas en tex_original):
// streaming.js no los reconoce, salen marrón/ocre y gastan 3-7 draw calls en vez de 1. Este script (Node, sin
// dependencias) los convierte al formato del atlas (tools/blender/edificios_hd.py): 1 material AV_HD_Savage,
// TEXCOORD_1 = origen de celda por vértice y texturas por URI tex_hd/. Además recorta la caja al ligero (≤ 0,3 m)
// y, para los _lejos, reescala la geometría a la caja del ligero (los lejos quedaron más chicos que el modelo).
//
// Uso:
//   node tools/blender/edificios_lonas_atlas.js hd <modelo> [<modelo>...]
//   node tools/blender/edificios_lonas_atlas.js lejos <modelo> [<modelo>...]
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../../assets/models/edificios');
// Mismo orden que edificios_hd_atlas.py (KITS.savage.orden) y que CELDAS en src/engine/streaming.js.
const CELDAS = ['WoodPlanks', 'WoodHewn', 'BarkNew', 'BarkCharred', 'RoofThatched', 'TarpFabricDamaged', 'Rope', 'RockSharp', 'RockSmooth', 'MudRocky'];
const NATLAS = 4;

// ---------------------------------------------------------------- GLB
const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const CTX = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function leerGlbDesdeJs(archivo) {
  const src = fs.readFileSync(archivo, 'utf8');
  const m = src.match(/="([A-Za-z0-9+/=]+)"/);
  if (!m) throw new Error('sin base64 en ' + archivo);
  return Buffer.from(m[1], 'base64');
}
function leerGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error('magic GLB no encontrado');
  const jl = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jl).toString());
  const off = 20 + jl, bl = buf.readUInt32LE(off);
  return { json, bin: buf.slice(off + 8, off + 8 + bl) };
}
function acceso(g, i) {
  const a = g.json.accessors[i], bv = g.json.bufferViews[a.bufferView];
  const T = CT[a.componentType], w = NC[a.type];
  const inicio = (bv.byteOffset || 0) + (a.byteOffset || 0);
  return { a, T, w, inicio, buf: g.bin, paso: bv.byteStride || 0 };
}
function leerAcc(g, i) {
  const { a, T, w, inicio, buf, paso } = acceso(g, i);
  if (paso && paso !== CTX[a.componentType] * w) {
    const n = a.count, out = new T(n * w), sz = CTX[a.componentType] * w;
    for (let k = 0; k < n; k++) {
      const o = inicio + k * paso;
      for (let c = 0; c < w; c++) out[k * w + c] = new T(buf.buffer, buf.byteOffset + o + c * (CTX[a.componentType]), 1)[0];
    }
    return out;
  }
  return new T(buf.buffer, buf.byteOffset + inicio, a.count * w);
}
function matrizNodo(n) {
  if (n.matrix) {
    const m = n.matrix;
    return [[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]], [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]];
  }
  return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
}
const mulM = (A, B) => { const C = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) for (let q = 0; q < 4; q++) C[i][q] += A[i][k] * B[k][q]; return C; };
const xfP = (M, p) => [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2] + M[0][3], M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2] + M[1][3], M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2] + M[2][3]];
const I4 = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

// Vértices y triángulos de todas las mallas del GLB, en espacio mundial (matrices de nodo aplicadas).
function extraer(g, conColor) {
  const P = [], N = [], UV = [], COL = [], I = [];
  let base = 0;
  function walk(ni, Pa) {
    const n = g.json.nodes[ni], W = mulM(Pa, matrizNodo(n));
    if (n.mesh !== undefined) {
      for (const pr of g.json.meshes[n.mesh].primitives) {
        const pos = leerAcc(g, pr.attributes.POSITION);
        const nor = pr.attributes.NORMAL !== undefined ? leerAcc(g, pr.attributes.NORMAL) : null;
        const uv = pr.attributes.TEXCOORD_0 !== undefined ? leerAcc(g, pr.attributes.TEXCOORD_0) : null;
        const col = conColor && pr.attributes.COLOR_0 !== undefined ? leerAcc(g, pr.attributes.COLOR_0) : null;
        const cw = col ? NC[g.json.accessors[pr.attributes.COLOR_0].type] : 0;
        const nv = g.json.accessors[pr.attributes.POSITION].count;
        const mat = pr.material !== undefined ? (g.json.materials[pr.material].name || '') : '';
        for (let i = 0; i < nv; i++) {
          const w = xfP(W, [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);
          P.push(w[0], w[1], w[2]);
          if (nor) {
            // normal por la submatriz 3x3 (rotación+escala) y renormalizada
            let nx = W[0][0] * nor[i * 3] + W[0][1] * nor[i * 3 + 1] + W[0][2] * nor[i * 3 + 2];
            let ny = W[1][0] * nor[i * 3] + W[1][1] * nor[i * 3 + 1] + W[1][2] * nor[i * 3 + 2];
            let nz = W[2][0] * nor[i * 3] + W[2][1] * nor[i * 3 + 1] + W[2][2] * nor[i * 3 + 2];
            const l = Math.hypot(nx, ny, nz) || 1;
            N.push(nx / l, ny / l, nz / l);
          } else N.push(0, 1, 0);
          if (uv) UV.push(uv[i * 2], uv[i * 2 + 1]); else UV.push(0, 0);
          if (col) for (let c = 0; c < cw; c++) COL.push(col[i * cw + c]);
        }
        if (pr.indices !== undefined) {
          const idx = leerAcc(g, pr.indices);
          for (let i = 0; i < idx.length; i++) I.push(idx[i] + base);
        } else for (let i = 0; i < nv; i++) I.push(i + base);
        base += nv;
      }
    }
    for (const c of n.children || []) walk(c, W);
  }
  for (const r of g.json.scenes[g.json.scene || 0].nodes) walk(r, I4);
  return { P, N, UV, COL, I, cw: COL.length ? COL.length / (P.length / 3) : 0 };
}

function caja(P) {
  const mn = [1e30, 1e30, 1e30], mx = [-1e30, -1e30, -1e30];
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) {
    if (P[i + k] < mn[k]) mn[k] = P[i + k];
    if (P[i + k] > mx[k]) mx[k] = P[i + k];
  }
  return { mn, mx };
}

// p' = ligMin + (p - mn) * (ligSize/size) : la caja queda exactamente igual a la del ligero.
function encajar(P, N, de, hacia) {
  const s = [0, 1, 2].map(k => (hacia.mx[k] - hacia.mn[k]) / Math.max(de.mx[k] - de.mn[k], 1e-9));
  for (let i = 0; i < P.length; i += 3) {
    for (let k = 0; k < 3; k++) P[i + k] = hacia.mn[k] + (P[i + k] - de.mn[k]) * s[k];
  }
  if (N) for (let i = 0; i < N.length; i += 3) {
    // inversa-transpuesta de la escala por ejes: n /= s, luego normalizar
    let nx = N[i] / s[0], ny = N[i + 1] / s[1], nz = N[i + 2] / s[2];
    const l = Math.hypot(nx, ny, nz) || 1;
    N[i] = nx / l; N[i + 1] = ny / l; N[i + 2] = nz / l;
  }
  return s;
}

function celdaDe(nombreMat) {
  const limpio = nombreMat.toLowerCase();
  for (let c = 0; c < CELDAS.length; c++) {
    if (limpio.includes('kb3d_' + CELDAS[c].toLowerCase())) return c;
  }
  throw new Error('material sin celda en el atlas Savage: ' + nombreMat);
}

// ---------------------------------------------------------------- escritura
function vista(arr, vistas, partes, target) {
  const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
  const pad = (4 - b.length % 4) % 4;
  vistas.push({ buffer: 0, byteOffset: 0, byteLength: b.length, target });
  partes.push(Buffer.concat([b, Buffer.alloc(pad)]));
  return vistas.length - 1;
}
function escribirGlb(ruta, json, vistas, partes) {
  let off = 0;
  for (let i = 0; i < vistas.length; i++) { vistas[i].byteOffset = off; off += partes[i].length; }
  json.buffers = [{ byteLength: off }];
  json.bufferViews = vistas;
  let jb = Buffer.from(JSON.stringify(json), 'utf8');
  jb = Buffer.concat([jb, Buffer.alloc((4 - jb.length % 4) % 4, 0x20)]);
  const bin = Buffer.concat(partes);
  const total = 12 + 8 + jb.length + 8 + bin.length;
  const cab = Buffer.alloc(12); cab.writeUInt32LE(0x46546C67, 0); cab.writeUInt32LE(2, 4); cab.writeUInt32LE(total, 8);
  const head = Buffer.alloc(8); head.writeUInt32LE(jb.length, 0); head.writeUInt32LE(0x4E4F534A, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004E4942, 4);
  const glb = Buffer.concat([cab, head, jb, bh, bin]);
  fs.writeFileSync(ruta, glb);
  fs.writeFileSync(ruta.replace(/\.glb$/, '_glb.js'),
    '(window.AV_EDIFICIOS_B64=window.AV_EDIFICIOS_B64||{})["' + path.basename(ruta, '.glb') + '"]="' + glb.toString('base64') + '";\n');
  return glb.length;
}

// ---------------------------------------------------------------- comandos
function cargar(nombre) {
  const ligero = leerGlb(leerGlbDesdeJs(path.join(DIR, nombre + '_glb.js')));
  const meta = { nombre, ligero, cajaLigero: null };
  const t = extraer(ligero, false);
  meta.cajaLigero = caja(t.P);
  return meta;
}

function cmdHd(nombre) {
  const { cajaLigero } = cargar(nombre);
  const g = leerGlb(leerGlbDesdeJs(path.join(DIR, nombre + '_hd_glb.js')));
  const P = [], N = [], UV = [], UV2 = [], I = [];
  let base = 0;
  function walk(ni, Pa) {
    const n = g.json.nodes[ni], W = mulM(Pa, matrizNodo(n));
    if (n.mesh !== undefined) {
      for (const pr of g.json.meshes[n.mesh].primitives) {
        const pos = leerAcc(g, pr.attributes.POSITION);
        const nor = pr.attributes.NORMAL !== undefined ? leerAcc(g, pr.attributes.NORMAL) : null;
        const uv = pr.attributes.TEXCOORD_0 !== undefined ? leerAcc(g, pr.attributes.TEXCOORD_0) : null;
        const nv = g.json.accessors[pr.attributes.POSITION].count;
        const mat = pr.material !== undefined ? (g.json.materials[pr.material].name || '') : '';
        const celda = celdaDe(mat);
        const ox = (celda % NATLAS) / NATLAS, oy = Math.floor(celda / NATLAS) / NATLAS;
        for (let i = 0; i < nv; i++) {
          const w = xfP(W, [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);
          P.push(w[0], w[1], w[2]);
          if (nor) {
            let nx = W[0][0] * nor[i * 3] + W[0][1] * nor[i * 3 + 1] + W[0][2] * nor[i * 3 + 2];
            let ny = W[1][0] * nor[i * 3] + W[1][1] * nor[i * 3 + 1] + W[1][2] * nor[i * 3 + 2];
            let nz = W[2][0] * nor[i * 3] + W[2][1] * nor[i * 3 + 1] + W[2][2] * nor[i * 3 + 2];
            const l = Math.hypot(nx, ny, nz) || 1;
            N.push(nx / l, ny / l, nz / l);
          } else N.push(0, 1, 0);
          UV.push(uv ? uv[i * 2] : 0, uv ? uv[i * 2 + 1] : 0);
          UV2.push(ox, oy);
        }
        const idx = pr.indices !== undefined ? leerAcc(g, pr.indices) : null;
        if (idx) for (let i = 0; i < idx.length; i++) I.push(idx[i] + base);
        else for (let i = 0; i < nv; i++) I.push(i + base);
        base += nv;
      }
    }
    for (const c of n.children || []) walk(c, W);
  }
  for (const r of g.json.scenes[g.json.scene || 0].nodes) walk(r, I4);

  const caja0 = caja(P);
  const s = encajar(P, N, caja0, cajaLigero);
  const caja1 = caja(P);

  const nv = P.length / 3;
  const idxArr = nv > 65535 ? Uint32Array : Uint16Array;
  const vistas = [], partes = [];
  const accs = [];
  const vP = vista(new Float32Array(P), vistas, partes, 34962);
  const vN = vista(new Float32Array(N), vistas, partes, 34962);
  const vU = vista(new Float32Array(UV), vistas, partes, 34962);
  const vU2 = vista(new Float32Array(UV2), vistas, partes, 34962);
  const vI = vista(new idxArr(I), vistas, partes, 34963);
  accs.push({ bufferView: vP, componentType: 5126, count: nv, type: 'VEC3', min: caja1.mn, max: caja1.mx });
  accs.push({ bufferView: vN, componentType: 5126, count: nv, type: 'VEC3' });
  accs.push({ bufferView: vU, componentType: 5126, count: nv, type: 'VEC2' });
  accs.push({ bufferView: vU2, componentType: 5126, count: nv, type: 'VEC2' });
  accs.push({ bufferView: vI, componentType: nv > 65535 ? 5125 : 5123, count: I.length, type: 'SCALAR' });
  const json = {
    asset: { version: '2.0', generator: 'Kimi 3 · edificios_lonas_atlas.js (KIMI-Task-010)' },
    scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: nombre + '_hd' }],
    meshes: [{ name: nombre + '_hd', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, TEXCOORD_1: 3 }, indices: 4, material: 0 }] }],
    materials: [{ name: 'AV_HD_Savage', doubleSided: true, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0.0, roughnessFactor: 1.0 }, normalTexture: { index: 1 } }],
    textures: [{ sampler: 0, source: 0 }, { sampler: 0, source: 1 }],
    images: [{ uri: 'tex_hd/hd_savage.jpg', mimeType: 'image/jpeg' }, { uri: 'tex_hd/hd_savage_n.jpg', mimeType: 'image/jpeg' }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    accessors: accs,
  };
  const kb0 = fs.statSync(path.join(DIR, nombre + '_hd_glb.js')).size / 1024;
  const bytes = escribirGlb(path.join(DIR, nombre + '_hd.glb'), json, vistas, partes);
  const kb1 = fs.statSync(path.join(DIR, nombre + '_hd_glb.js')).size / 1024;
  console.log('HD', nombre,
    'tris', I.length / 3, 'verts', nv,
    '| caja', caja0.mx.map((v, k) => +(v - caja0.mn[k]).toFixed(2)), '→', caja1.mx.map((v, k) => +(v - caja1.mn[k]).toFixed(2)),
    '| escala', s.map(v => +v.toFixed(3)),
    '|', Math.round(kb0), '→', Math.round(kb1), 'KB (js)');
}

function cmdLejos(nombre) {
  const { cajaLigero } = cargar(nombre);
  const g = leerGlb(leerGlbDesdeJs(path.join(DIR, nombre + '_lejos_glb.js')));
  const t = extraer(g, true);
  if (!t.cw) throw new Error(nombre + '_lejos sin COLOR_0');
  const caja0 = caja(t.P);
  const s = encajar(t.P, t.N, caja0, cajaLigero);
  const caja1 = caja(t.P);
  const nv = t.P.length / 3;
  // conserva el componentType y la normalización del COLOR_0 original
  const pr0 = g.json.meshes[0].primitives[0];
  const accC = g.json.accessors[pr0.attributes.COLOR_0];
  const vistas = [], partes = [];
  const accs = [];
  const vP = vista(new Float32Array(t.P), vistas, partes, 34962);
  const vN = vista(new Float32Array(t.N), vistas, partes, 34962);
  const vC = vista(t.COL instanceof Uint8Array ? new Uint8Array(t.COL) : new Uint16Array(t.COL), vistas, partes, 34962);
  const idxArr = nv > 65535 ? Uint32Array : Uint16Array;
  const vI = vista(new idxArr(t.I), vistas, partes, 34963);
  accs.push({ bufferView: vP, componentType: 5126, count: nv, type: 'VEC3', min: caja1.mn, max: caja1.mx });
  accs.push({ bufferView: vN, componentType: 5126, count: nv, type: 'VEC3' });
  const accC2 = { bufferView: vC, componentType: accC.componentType, count: nv, type: accC.type };
  if (accC.normalized) accC2.normalized = true;
  accs.push(accC2);
  accs.push({ bufferView: vI, componentType: nv > 65535 ? 5125 : 5123, count: t.I.length, type: 'SCALAR' });
  const json = {
    asset: { version: '2.0', generator: 'Kimi 3 · edificios_lonas_atlas.js (KIMI-Task-010)' },
    scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: nombre + '_lejos' }],
    meshes: [{ name: nombre + '_lejos', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 }] }],
    materials: [{ name: 'AV_Lejos' }],
    accessors: accs,
  };
  const kb0 = fs.statSync(path.join(DIR, nombre + '_lejos_glb.js')).size / 1024;
  const bytes = escribirGlb(path.join(DIR, nombre + '_lejos.glb'), json, vistas, partes);
  const kb1 = fs.statSync(path.join(DIR, nombre + '_lejos_glb.js')).size / 1024;
  console.log('LEJOS', nombre,
    'tris', t.I.length / 3, 'verts', nv,
    '| caja', caja0.mx.map((v, k) => +(v - caja0.mn[k]).toFixed(2)), '→', caja1.mx.map((v, k) => +(v - caja1.mn[k]).toFixed(2)),
    '| escala', s.map(v => +v.toFixed(3)),
    '|', Math.round(kb0), '→', Math.round(kb1), 'KB (js)');
}

const [modo, ...nombres] = process.argv.slice(2);
if (!['hd', 'lejos'].includes(modo) || !nombres.length) {
  console.error('uso: node edificios_lonas_atlas.js <hd|lejos> <modelo> [...]');
  process.exit(1);
}
for (const n of nombres) (modo === 'hd' ? cmdHd : cmdLejos)(n);
