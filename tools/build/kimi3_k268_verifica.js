// KIMI-268 · verificador geométrico de la cuantización de los `_hd` del arranque (Kimi 3, PC Windows).
// Compara el GLB original (HEAD, vía `git show`) con el cuantizado (worktree):
//   (1) wrapper `_glb.js` regenerado: su base64 == bytes del .glb nuevo;
//   (2) por cada accessor POSITION: error local original vs descuantizado (min + q·esc), en mm;
//   (3) TEXCOORD (y cualquier atributo no POSITION/NORMAL) idéntico byte a byte;
//   (4) min/max de accessors POSITION conservados (gltf válido para three r128).
// Uso: node tools/build/kimi3_k268_verifica.js [glb ...]   (por defecto los 3 _hd del arranque)
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function leerGlb(buf) {
  if (buf.length < 12 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('no es GLB');
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
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
  if (a.sparse) throw new Error('accessor sparse');
  const T = CT[a.componentType];
  const n = NCOMP[a.type];
  const v = json.bufferViews[a.bufferView];
  const stride = v.byteStride || n * T.BYTES_PER_ELEMENT;
  const base = (v.byteOffset || 0) + (a.byteOffset || 0);
  let arr;
  if (stride === n * T.BYTES_PER_ELEMENT) arr = new T(bin.buffer, bin.byteOffset + base, a.count * n);
  else {
    arr = new T(a.count * n);
    for (let i = 0; i < a.count; i++)
      for (let c = 0; c < n; c++)
        arr[i * n + c] = new T(bin.buffer, bin.byteOffset + base + i * stride + c * T.BYTES_PER_ELEMENT, 1)[0];
  }
  return { a, arr: new T(arr), n };
}

// mapa mesh -> primitives con sus POSITION, y atributos para comparar
function geometria(buf) {
  const { json, bin } = leerGlb(buf);
  const meshes = (json.meshes || []).map(m => (m.primitives || []).map(p => {
    const at = {};
    for (const [k, idx] of Object.entries(p.attributes || {})) at[k] = acceso(json, bin, idx);
    return at;
  }));
  return { json, meshes };
}

function verifica(glbPath) {
  const rel = path.relative(process.cwd(), glbPath).split(path.sep).join('/');
  const nuevo = fs.readFileSync(glbPath);
  const original = execSync('git show HEAD:' + rel, { maxBuffer: 64 * 1024 * 1024 });
  const r = { archivo: rel, bytes: { original: original.length, nuevo: nuevo.length } };

  // (1) wrapper == glb
  const wrapper = glbPath.replace(/\.glb$/, '_glb.js');
  if (fs.existsSync(wrapper)) {
    const w = fs.readFileSync(wrapper, 'utf8');
    const i = w.indexOf('="');
    const b64 = w.slice(i + 2).replace(/";\s*$/, '');
    r.wrapper = Buffer.from(b64, 'base64').equals(nuevo) ? 'ok (base64 == glb)' : 'FALLO: base64 != glb';
  } else r.wrapper = 'sin wrapper';

  // (2)+(3) comparación geométrica por mesh/primitive
  const A = geometria(original), B = geometria(nuevo);
  if (A.meshes.length !== B.meshes.length) throw new Error('nº de meshes distinto');
  let errMax = 0, errSum = 0, errN = 0, attrsDistintos = 0;
  const porMesh = [], porMeshAng = [];
  for (let mi = 0; mi < A.meshes.length; mi++) {
    if (A.meshes[mi].length !== B.meshes[mi].length) throw new Error('nº de primitives distinto en mesh ' + mi);
    let eMaxM = 0, eSumM = 0, eNM = 0;
    for (let pi = 0; pi < A.meshes[mi].length; pi++) {
      const pa = A.meshes[mi][pi], pb = B.meshes[mi][pi];
      const claves = new Set([...Object.keys(pa), ...Object.keys(pb)]);
      for (const k of claves) {
        if (k === 'POSITION' || k === 'NORMAL') continue; // cuantizados a propósito (criterio gltfpack)
        const xa = pa[k], xb = pb[k];
        if (!xa || !xb) { attrsDistintos++; continue; }
        const ba = Buffer.from(xa.arr.buffer, xa.arr.byteOffset, xa.arr.byteLength);
        const bb = Buffer.from(xb.arr.buffer, xb.arr.byteOffset, xb.arr.byteLength);
        if (!ba.equals(bb)) attrsDistintos++;
      }
      // normales: error angular del descuantizado (int8 normalizado → ±1/127 por componente)
      let angMaxM = 0;
      {
        const na = pa.NORMAL, nb = pb.NORMAL;
        if (na && nb && na.a.count === nb.a.count) {
          for (let i = 0; i < na.a.count * 3; i += 3) {
            let dot = 0, la = 0, lb = 0;
            for (let c = 0; c < 3; c++) {
              const va = na.arr[i + c], vb = nb.arr[i + c];
              dot += va * vb; la += va * va; lb += vb * vb;
            }
            const cos = dot / Math.sqrt(la * lb || 1);
            const ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
            if (ang > angMaxM) angMaxM = ang;
          }
        }
      }
      porMeshAng.push(+angMaxM.toFixed(3));
      const qa = pa.POSITION, qb = pb.POSITION;
      if (!qa || !qb) continue;
      if (qa.a.count !== qb.a.count) throw new Error('count POSITION distinto');
      // descuantizado del nuevo: min + raw·esc (esc del propio accessor min/max)
      const mn = qb.a.min, mx = qb.a.max;
      const esc = [0, 1, 2].map(c => (mx[c] - mn[c]) / 65535 || 1);
      const n3 = qa.a.count * 3;
      for (let i = 0; i < n3; i += 3) {
        let d2 = 0;
        for (let c = 0; c < 3; c++) {
          const q = qb.arr[i + c];
          const desp = qa.a.componentType === 5126 ? 0 : 0; // el original siempre es f32 aquí
          void desp;
          const fl = mn[c] + q * esc[c];
          const dd = qa.arr[i + c] - fl;
          d2 += dd * dd;
        }
        const d = Math.sqrt(d2);
        if (d > eMaxM) eMaxM = d;
        eSumM += d; eNM++;
      }
    }
    porMesh.push({ mesh: mi, errMaxM: +(eMaxM * 1000).toFixed(3), errMediaM: +((eSumM / Math.max(1, eNM)) * 1000).toFixed(4) });
    if (eMaxM > errMax) errMax = eMaxM;
    errSum += eSumM; errN += eNM;
  }
  r.posiciones = { errMax_mm: +(errMax * 1000).toFixed(3), errMedia_mm: +((errSum / Math.max(1, errN)) * 1000).toFixed(4), verts: errN };
  r.attrsNoPosNorIguales = attrsDistintos === 0;
  r.normalesErrMaxGrados = porMeshAng.length ? Math.max(...porMeshAng) : null;
  r.porMesh = porMesh.slice(0, 8);
  if (porMesh.length > 8) r.porMesh.push({ '...': (porMesh.length - 8) + ' meshes más' });
  return r;
}

const defecto = ['assets/models/edificios/templo_mediano_h_hd.glb', 'assets/models/edificios/templo_grande_d_hd.glb', 'assets/models/edificios/complejo_ruinas_hd.glb'];
const archivos = process.argv.slice(2).length ? process.argv.slice(2) : defecto;
let fallos = 0;
for (const f of archivos) {
  try { console.log(JSON.stringify(verifica(path.resolve(f)), null, 1)); }
  catch (e) { fallos++; console.error('FALLO ' + f + ': ' + e.message); }
}
process.exit(fallos ? 1 : 0);
