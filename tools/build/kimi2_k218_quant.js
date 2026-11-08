// KIMI-218 · cuantizador GLB puro Node (KHR_mesh_quantization) — palanca de carga inicial sin cambio visual.
// Mismo criterio que el gltfpack de la build (docs/equipo/BUILD.md): POSITION uint16 sin normalizar con el
// dequant en la transformación del nodo (patrón -vpi), NORMAL int8 normalizado, TEXCOORD se queda float (-vtf).
// assets.js descuantiza a Float32 al cargar (descuantizar/aFloat), así el resto del motor lee lo mismo que antes.
// Uso: node tools/build/kimi2_k218_quant.js <archivo.glb> [...]
//   Rewrites cada .glb in place (git es el respaldo) y regenera su <nombre>_glb.js (mismo global y clave).
const fs = require('fs');
const path = require('path');

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

// multiplicación de matrices 4x4 column-major (O = A·B)
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

function acceso(json, bin, idx) {
  const a = json.accessors[idx];
  if (a.sparse) throw new Error('accessor ' + idx + ' sparse: no soportado');
  const T = CT[a.componentType];
  if (!T) throw new Error('componentType ' + a.componentType + ' no soportado');
  const n = NCOMP[a.type];
  if (!n) throw new Error('tipo ' + a.type + ' no soportado');
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
  return { a, arr: new T(arr), n };
}

function cuantizar(buf) {
  const { json, bin } = leerGlb(buf);
  if (json.skins && json.skins.length) throw new Error('con skins: fuera de alcance');
  if (json.animations && json.animations.length) throw new Error('con animaciones: fuera de alcance');

  // plan por accessor: qué cuantizar
  const plan = new Map(); // idx -> 'pos' | 'nor'
  for (const m of json.meshes || [])
    for (const p of m.primitives) {
      if (p.targets) throw new Error('con morph targets: fuera de alcance');
      for (const [k, idx] of Object.entries(p.attributes || {})) {
        if (k === 'POSITION') plan.set(idx, 'pos');
        else if (k === 'NORMAL') { if (!plan.has(idx)) plan.set(idx, 'nor'); }
      }
    }
  if (!plan.size) return null;

  // dequant (min/max reales) por mesh, tomado de su POSITION
  const dqMesh = new Map();
  for (const m of json.meshes || []) {
    for (const p of m.primitives) {
      const idx = p.attributes && p.attributes.POSITION;
      if (idx == null || dqMesh.has(m)) continue;
      const { arr, n } = acceso(json, bin, idx);
      if (n !== 3) throw new Error('POSITION no VEC3');
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < arr.length; i += 3)
        for (let c = 0; c < 3; c++) {
          const v = arr[i + c];
          if (v < min[c]) min[c] = v;
          if (v > max[c]) max[c] = v;
        }
      dqMesh.set(m, { min, max });
    }
  }

  // accessors + BIN nuevos
  const partes = [];
  let cursor = 0;
  const vistas = [], accessors = [];
  function vistaDe(bytes, target) {
    while (cursor % 4) { partes.push(Buffer.from([0])); cursor++; }
    const off = cursor;
    partes.push(bytes); cursor += bytes.length;
    vistas.push({ buffer: 0, byteOffset: off, byteLength: bytes.length, ...(target ? { target } : {}) });
    return vistas.length - 1;
  }
  for (let i = 0; i < json.accessors.length; i++) {
    const a0 = json.accessors[i];
    if (!CT[a0.componentType] || !NCOMP[a0.type]) throw new Error('accessor ' + i + ' tipo raro ' + a0.componentType + '/' + a0.type);
    const modo = plan.get(i);
    const { arr, n } = acceso(json, bin, i);
    const v0 = json.bufferViews[a0.bufferView];
    if (modo === 'pos' && a0.componentType === 5126) {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let k = 0; k < arr.length; k += 3)
        for (let c = 0; c < 3; c++) { const v = arr[k + c]; if (v < min[c]) min[c] = v; if (v > max[c]) max[c] = v; }
      const esc = [0, 1, 2].map(c => (max[c] - min[c]) / 65535 || 1);
      const q = new Uint16Array(arr.length);
      for (let k = 0; k < arr.length; k += 3)
        for (let c = 0; c < 3; c++)
          q[k + c] = Math.round((arr[k + c] - min[c]) / esc[c]);
      const bv = vistaDe(Buffer.from(q.buffer, q.byteOffset, q.byteLength), v0.target);
      accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5123, count: a0.count, type: 'VEC3', min, max });
    } else if (modo === 'nor' && a0.componentType === 5126) {
      const q = new Int8Array(arr.length);
      for (let k = 0; k < arr.length; k++) q[k] = Math.round(Math.max(-1, Math.min(1, arr[k])) * 127);
      const bv = vistaDe(Buffer.from(q.buffer, q.byteOffset, q.byteLength), v0.target);
      accessors.push({ bufferView: bv, byteOffset: 0, componentType: 5120, normalized: true, count: a0.count, type: 'VEC3' });
    } else {
      const bytes = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength);
      const bv = vistaDe(bytes, v0.target);
      accessors.push({ ...a0, bufferView: bv, byteOffset: 0 });
    }
  }

  // imágenes embebidas (y cualquier otra referencia a bufferViews fuera de accessors): se
  // trasladan al final del BIN y se remapean sus índices (KIMI-225: antes quedaban apuntando
  // a vistas de geometría o fuera de rango → «The source image could not be decoded»).
  const remapVistas = new Map();
  const imgs2 = (json.images || []).map(im => {
    if (im.bufferView == null) return im;
    if (remapVistas.has(im.bufferView)) return { ...im, bufferView: remapVistas.get(im.bufferView) };
    const v0 = json.bufferViews[im.bufferView];
    if (!v0) throw new Error('imagen con bufferView ' + im.bufferView + ' inexistente');
    const bytes = bin.slice(v0.byteOffset || 0, (v0.byteOffset || 0) + v0.byteLength);
    const bv = vistaDe(bytes, v0.target);
    remapVistas.set(im.bufferView, bv);
    return { ...im, bufferView: bv };
  });

  // nodos con mesh: componen el dequant de ESE mesh (por su POSITION)
  for (const nd of json.nodes || []) {
    if (nd.mesh == null || !dqMesh.has(json.meshes[nd.mesh])) continue;
    const { min, max } = dqMesh.get(json.meshes[nd.mesh]);
    const esc = [0, 1, 2].map(c => (max[c] - min[c]) / 65535 || 1);
    const D = [
      esc[0], 0, 0, 0,
      0, esc[1], 0, 0,
      0, 0, esc[2], 0,
      min[0], min[1], min[2], 1,
    ];
    const M = mul(matrizNodo(nd), D);
    nd.matrix = M.map(v => Math.abs(v) < 1e-12 ? 0 : v);
    delete nd.translation; delete nd.rotation; delete nd.scale;
  }

  const ext = new Set([...(json.extensionsUsed || []), 'KHR_mesh_quantization']);
  const req = new Set([...(json.extensionsRequired || []), 'KHR_mesh_quantization']);
  const json2 = { ...json, accessors, bufferViews: vistas, extensionsUsed: [...ext], extensionsRequired: [...req] };
  if (json.images) json2.images = imgs2;
  delete json2.buffers;
  json2.buffers = [{ byteLength: cursor }];

  const bin2 = Buffer.concat(partes);
  let js = Buffer.from(JSON.stringify(json2), 'utf8');
  const padJ = (4 - (js.length % 4)) % 4; js = Buffer.concat([js, Buffer.from(' '.repeat(padJ))]);
  const padB = (4 - (bin2.length % 4)) % 4;
  const bin2p = padB ? Buffer.concat([bin2, Buffer.alloc(padB)]) : bin2;
  const total = 12 + 8 + js.length + 8 + bin2p.length;
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  const cj = Buffer.alloc(8);
  cj.writeUInt32LE(js.length, 0); cj.writeUInt32LE(0x4e4f534a, 4);
  const cb = Buffer.alloc(8);
  cb.writeUInt32LE(bin2p.length, 0); cb.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, cj, js, cb, bin2p]);
}

function regenerarWrapper(glbPath, nuevo) {
  const dir = path.dirname(glbPath);
  const id = path.basename(glbPath, '.glb');
  const wrapper = path.join(dir, id + '_glb.js');
  if (!fs.existsSync(wrapper)) return 'sin wrapper';
  const viejo = fs.readFileSync(wrapper, 'utf8');
  const idx = viejo.indexOf('="'); // el wrapper es PREFIX + B64 + '";': base64 nunca contiene comillas
  if (idx < 0) return 'wrapper formato no reconocido';
  const pref = viejo.slice(0, idx + 2);
  const b64 = nuevo.toString('base64');
  fs.writeFileSync(wrapper, pref + b64 + '";\n');
  return 'ok';
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (!args.length) { console.error('uso: node kimi2_k218_quant.js <archivo.glb> [...]'); process.exit(2); }
  let fallos = 0;
  for (const f of args) {
    try {
      const antes = fs.statSync(f).size;
      const out = cuantizar(fs.readFileSync(f));
      if (!out) { console.log('SIN POSICIONES ' + f + ' (sin cambio)'); continue; }
      const r = regenerarWrapper(f, out);
      fs.writeFileSync(f, out);
      const despues = out.length;
      console.log('OK ' + path.basename(f) + ': ' + antes + ' -> ' + despues + ' B (' + Math.round((1 - despues / antes) * 100) + ' % menos) · wrapper ' + r);
    } catch (e) { fallos++; console.error('FALLO ' + f + ': ' + e.message); }
  }
  process.exit(fallos ? 1 : 0);
}
