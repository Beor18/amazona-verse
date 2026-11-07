// KIMI-219 · preparación post-lanzamiento de la cuantización de la carga inicial.
// Candidatos: terreno_{so,se,no,ne}.glb (trozos del arranque) + complejo_ruinas.glb + ceiba + flamboyan.
// Cuantiza COPIAS en tools/build/salida/kimi219-prep/ (los activos del repo NO se tocan) y mide:
//   (1) bytes antes/después, (2) error máximo de posición por eje (esc/2),
//   (3) costuras entre trozos de terreno vecinos: desplazamiento máximo de vértices compartidos tras
//       cuantizar cada trozo con su propio min/max (mismo criterio que el runtime: matriz de nodo · dequant).
// Verificación estructural: POSITION pasa a uint16 (5123), NORMAL a int8 normalizado (5120),
// min/max preservados, KHR_mesh_quantization en extensionsUsed/Required, y decodificación de muestras.
// Uso: node tools/build/kimi2_k219_prep.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');
const SALIDA = path.join(RAIZ, 'tools', 'build', 'salida', 'kimi219-prep');
const QUANT = path.join(RAIZ, 'tools', 'build', 'kimi2_k218_quant.js');

const CANDIDATOS = [
  'assets/models/mapa/terreno_so.glb',
  'assets/models/mapa/terreno_se.glb',
  'assets/models/mapa/terreno_no.glb',
  'assets/models/mapa/terreno_ne.glb',
  'assets/models/edificios/complejo_ruinas.glb',
  'assets/models/entorno/ceiba.glb',
  'assets/models/entorno/flamboyan.glb',
];

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function leerGlb(buf) {
  if (buf.length < 12 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('no es GLB');
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    if (off + 8 + len > buf.length) throw new Error('chunk truncado');
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = data;
    off += 8 + len;
  }
  if (!json || !bin) throw new Error('falta chunk JSON o BIN');
  return { json, bin };
}

function acceso(json, bin, idx) {
  const a = json.accessors[idx];
  const T = CT[a.componentType];
  const n = NCOMP[a.type];
  const v = json.bufferViews[a.bufferView];
  const stride = v.byteStride || n * T.BYTES_PER_ELEMENT;
  const base = (v.byteOffset || 0) + (a.byteOffset || 0);
  let arr;
  if (stride === n * T.BYTES_PER_ELEMENT) {
    arr = new T(bin.buffer, bin.byteOffset + base, a.count * n);
  } else {
    arr = new T(a.count * n);
    for (let i = 0; i < a.count; i++)
      for (let c = 0; c < n; c++)
        arr[i * n + c] = new T(bin.buffer, bin.byteOffset + base + i * stride + c * T.BYTES_PER_ELEMENT, 1)[0];
  }
  return { a, arr: new T(arr), n, norm: !!a.normalized };
}

function mul(A, B) {
  const O = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    for (let k = 0; k < 4; k++) O[c * 4 + r] += A[k * 4 + r] * B[c * 4 + k];
  return O;
}
function trsAMat(t, q, s) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const [sx, sy, sz] = s;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    t[0], t[1], t[2], 1,
  ];
}
function matrizNodo(n) {
  if (n.matrix) return n.matrix.slice();
  return trsAMat(n.translation || [0, 0, 0], n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]);
}
// aplica matriz 4x4 column-major a [x,y,z]
function xform(M, x, y, z) {
  return [
    M[0] * x + M[4] * y + M[8] * z + M[12],
    M[1] * x + M[5] * y + M[9] * z + M[13],
    M[2] * x + M[6] * y + M[10] * z + M[14],
  ];
}

// vértices POSITION en espacio de mundo (con la matriz del nodo; si es cuantizado, con dequant compuesto)
function posicionesMundo(buf) {
  const { json, bin } = leerGlb(buf);
  const out = [];
  const visitados = new Map(); // meshIdx -> lista de vértices (por si un mesh se instancia con varios nodos)
  for (const nd of json.nodes || []) {
    if (nd.mesh == null) continue;
    const mesh = json.meshes[nd.mesh];
    if (!visitados.has(nd.mesh)) {
      const verts = [];
      for (const p of mesh.primitives) {
        const idx = p.attributes && p.attributes.POSITION;
        if (idx == null) continue;
        const { arr, a } = acceso(json, bin, idx);
        // si está cuantizado (uint16), los valores crudos van DIRECTOS a la matriz del nodo:
        // el cuantizador compone el dequant en ella (M·D), así que no se descuantiza aquí.
        for (let i = 0; i < a.count; i++)
          verts.push([arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]]);
      }
      visitados.set(nd.mesh, verts);
    }
    const M = matrizNodo(nd);
    for (const v of visitados.get(nd.mesh)) out.push(xform(M, v[0], v[1], v[2]));
  }
  return out;
}

function verificar(orig, cuant) {
  const o = leerGlb(orig), c = leerGlb(cuant);
  const probs = [];
  if (!c.json.extensionsUsed.includes('KHR_mesh_quantization')) probs.push('falta KHR_mesh_quantization en extensionsUsed');
  if (!c.json.extensionsRequired.includes('KHR_mesh_quantization')) probs.push('falta KHR_mesh_quantization en extensionsRequired');
  // min/max preservados y tipos cambiados
  let nPos = 0, nNor = 0, maxErrM = [0, 0, 0];
  const oAcc = o.json.accessors, cAcc = c.json.accessors;
  if (oAcc.length !== cAcc.length) probs.push('nº de accessors distinto: ' + oAcc.length + ' -> ' + cAcc.length);
  for (let i = 0; i < Math.min(oAcc.length, cAcc.length); i++) {
    const a0 = oAcc[i], a1 = cAcc[i];
    if (a0.type === 'VEC3' && a0.componentType === 5126 && a1.componentType === 5123) {
      nPos++;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(a0.min[k] - a1.min[k]) > 1e-6 || Math.abs(a0.max[k] - a1.max[k]) > 1e-6) probs.push('min/max distinto en accessor ' + i);
        const esc = (a0.max[k] - a0.min[k]) / 65535 || 0;
        if (esc / 2 > maxErrM[k]) maxErrM[k] = esc / 2;
      }
    } else if (a0.type === 'VEC3' && a0.componentType === 5126 && a1.componentType === 5120) {
      nNor++;
      if (!a1.normalized) probs.push('NORMAL int8 sin normalized en accessor ' + i);
    } else if (a0.componentType !== a1.componentType) {
      probs.push('accessor ' + i + ' tipo ' + a0.componentType + ' -> ' + a1.componentType + ' inesperado');
    }
  }
  return { nPos, nNor, maxErrM, probs };
}

// ---- main ----
fs.mkdirSync(SALIDA, { recursive: true });
const copias = [];
for (const rel of CANDIDATOS) {
  const src = path.join(RAIZ, rel);
  const dst = path.join(SALIDA, path.basename(rel));
  fs.copyFileSync(src, dst);
  copias.push(dst);
}
console.log('== cuantizando copias (repo intacto) ==');
execFileSync(process.execPath, [QUANT, ...copias], { stdio: 'inherit' });

const resultado = { when: new Date().toISOString(), archivos: {}, costuras: {} };
let totalAntes = 0, totalDespues = 0;
const mundoOrig = {}, mundoCuant = {};
for (const rel of CANDIDATOS) {
  const nombre = path.basename(rel);
  const orig = fs.readFileSync(path.join(RAIZ, rel));
  const cuant = fs.readFileSync(path.join(SALIDA, nombre));
  const v = verificar(orig, cuant);
  const escM = v.maxErrM.map(e => +(e * 1000).toFixed(3)); // mm
  resultado.archivos[nombre] = {
    antes: orig.length, despues: cuant.length,
    deltaPct: +( (1 - cuant.length / orig.length) * 100 ).toFixed(1),
    posCuantizados: v.nPos, norCuantizados: v.nNor,
    errMaxMm: escM, problemas: v.probs,
  };
  totalAntes += orig.length; totalDespues += cuant.length;
  mundoOrig[nombre] = posicionesMundo(orig);
  mundoCuant[nombre] = posicionesMundo(cuant);
  console.log(nombre + ': ' + orig.length + ' -> ' + cuant.length + ' B (' + resultado.archivos[nombre].deltaPct + ' %) · errMax mm ' + escM.join('/') + (v.probs.length ? ' · PROBS: ' + v.probs.join('; ') : ''));
}
resultado.total = { antes: totalAntes, despues: totalDespues, deltaKb: +((totalAntes - totalDespues) / 1024).toFixed(1) };
console.log('TOTAL: ' + totalAntes + ' -> ' + totalDespues + ' B (−' + ((totalAntes - totalDespues) / 1024).toFixed(1) + ' KB)');

// costuras: pares de trozos de terreno vecinos que comparten plano frontera
const PARES = [
  ['terreno_so.glb', 'terreno_se.glb'], // lindan en el eje X
  ['terreno_no.glb', 'terreno_ne.glb'],
  ['terreno_so.glb', 'terreno_no.glb'], // lindan en el eje Z
  ['terreno_se.glb', 'terreno_ne.glb'],
];
const EJE = { 0: 'x', 1: 'x', 2: 'z', 3: 'z' }; // so/se y no/ne lindan ⊥X · so/no y se/ne lindan ⊥Z
for (let pi = 0; pi < PARES.length; pi++) {
  const [na, nb] = PARES[pi];
  const eje = EJE[pi]; // coordenada fija de la frontera
  const ei = eje === 'x' ? 0 : 2;
  const A = mundoOrig[na], B = mundoOrig[nb];
  const Qa = mundoCuant[na], Qb = mundoCuant[nb];
  const minA = Math.min(...A.map(v => v[ei])), maxA = Math.max(...A.map(v => v[ei]));
  const minB = Math.min(...B.map(v => v[ei])), maxB = Math.max(...B.map(v => v[ei]));
  // frontera: plano de A más cercano al rango de B
  const frontera = Math.abs(maxA - minB) < Math.abs(maxB - minA) ? maxA : minB;
  const TOL = 0.02; // 2 cm: vértices «de borde»
  const otros = [0, 1, 2].filter(k => k !== ei);
  const borde = (V) => V.filter(v => Math.abs(v[ei] - frontera) <= TOL)
    .map(v => [v[otros[0]], v[otros[1]]]);
  const bA = borde(A), bB = borde(B);
  // índice de bB por coordenada redondeada (1 mm)
  const idxB = new Map();
  bB.forEach((k, i) => { const cl = k.map(x => Math.round(x * 1000)).join(','); if (!idxB.has(cl)) idxB.set(cl, i); });
  let emparejados = 0, desplMaxMm = 0, desplMedMm = 0;
  const usados = new Set();
  bA.forEach(kA => {
    const cl = kA.map(x => Math.round(x * 1000)).join(',');
    const iB = idxB.get(cl);
    if (iB == null || usados.has(iB)) return;
    usados.add(iB); emparejados++;
    // mismo vértice (índice global): buscar en Q el correspondiente por posición original exacta
  });
  // desplazamiento real: para cada vértice de A en el borde, el más cercano de B ANTES (dist<1mm)
  // y la distancia ENTRE los cuantizados correspondientes (mismo índice dentro de su nube de borde)
  const candidatos = [];
  for (let i = 0; i < A.length; i++) {
    if (Math.abs(A[i][ei] - frontera) > TOL) continue;
    let mejor = -1, dMejor = Infinity;
    for (let j = 0; j < B.length; j++) {
      if (Math.abs(B[j][ei] - frontera) > TOL) continue;
      const d = Math.hypot(A[i][otros[0]] - B[j][otros[0]], A[i][otros[1]] - B[j][otros[1]]);
      if (d < dMejor) { dMejor = d; mejor = j; }
    }
    if (mejor >= 0 && dMejor <= 0.001) { // par compartido (≤1 mm) en ORIGINAL
      const dq = Math.hypot(Qa[i][0] - Qb[mejor][0], Qa[i][1] - Qb[mejor][1], Qa[i][2] - Qb[mejor][2]);
      candidatos.push(dq);
    }
  }
  if (candidatos.length) {
    desplMaxMm = +(Math.max(...candidatos) * 1000).toFixed(2);
    desplMedMm = +(candidatos.reduce((s, x) => s + x, 0) / candidatos.length * 1000).toFixed(2);
  }
  resultado.costuras[na + '+' + nb] = { eje, frontera: +frontera.toFixed(2), paresCompartidos: candidatos.length, desplMaxMm, desplMedMm };
  console.log('costura ' + na + ' / ' + nb + ' (eje ' + eje + ' @ ' + frontera.toFixed(1) + '): ' + candidatos.length + ' pares compartidos · desplazamiento cuantizado máx ' + desplMaxMm + ' mm · medio ' + desplMedMm + ' mm');
}

fs.writeFileSync(path.join(SALIDA, 'k219_prep.json'), JSON.stringify(resultado, null, 1));
console.log('JSON: ' + path.join(SALIDA, 'k219_prep.json'));
