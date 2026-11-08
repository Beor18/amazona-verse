#!/usr/bin/env node
/* Amazona Verse · Kimi 3 (PC Windows) — KIMI-299: spot-check offline independiente del parche meshopt eb21ebdf.
   Compara el GLB «antes» (git show eb21ebdf^:<ruta>) con el «después» (worktree) para los modelos pedidos:
   decodifica con el MeshoptDecoder vendorizado (mismo camino que assets.js) y contrasta por material los
   triángulos, la caja de mundo (mm) y el área — el mismo criterio que tools/build/meshopt_hd.js (la nube),
   re-hecho aquí como corroboración independiente. Solo lectura: no toca el repo (solo escribe su JSON de
   evidencia en docs/img/kimi290/). */
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const MeshoptDecoder = require(path.join(RAIZ, 'assets', 'vendor', 'meshopt', 'meshopt_decoder.js'));
const MODELOS = process.argv.slice(2);
if (!MODELOS.length) { console.error('uso: node kimi3_k299_verifica.js <modelo_hd.glb> [...]'); process.exit(1); }

function partir(buf) {
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error('no es GLB');
  let off = 12, json = null, bin = null;
  while (off < buf.readUInt32LE(8)) {
    const n = buf.readUInt32LE(off), t = buf.readUInt32LE(off + 4), c = buf.slice(off + 8, off + 8 + n);
    if (t === 0x4E4F534A) json = JSON.parse(c.toString('utf8')); else if (t === 0x004E4942) bin = c;
    off += 8 + n;
  }
  return { j: json, bin };
}
const CT = { 5120: [Int8Array, 127], 5121: [Uint8Array, 255], 5122: [Int16Array, 32767], 5123: [Uint16Array, 65535], 5125: [Uint32Array, 0], 5126: [Float32Array, 0] };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function vistas(j, bin) {
  const cache = new Map();
  return k => {
    if (cache.has(k)) return cache.get(k);
    const bv = j.bufferViews[k], ex = bv.extensions && bv.extensions.EXT_meshopt_compression;
    let out;
    if (ex) {
      out = new Uint8Array(ex.count * ex.byteStride);
      MeshoptDecoder.decodeGltfBuffer(out, ex.count, ex.byteStride, new Uint8Array(bin.buffer, bin.byteOffset + (ex.byteOffset || 0), ex.byteLength), ex.mode, ex.filter || 'NONE');
      out = { u8: out, stride: ex.byteStride };
    } else out = { u8: new Uint8Array(bin.buffer, bin.byteOffset + (bv.byteOffset || 0), bv.byteLength), stride: bv.byteStride || 0 };
    cache.set(k, out); return out;
  };
}
function leer(j, vista, ai) {
  const a = j.accessors[ai], [T, nmax] = CT[a.componentType], nc = NC[a.type], v = vista(a.bufferView);
  const tam = T.BYTES_PER_ELEMENT, stride = v.stride || nc * tam, out = new Float64Array(a.count * nc);
  const buf = Buffer.from(v.u8.buffer, v.u8.byteOffset, v.u8.byteLength);
  const rd = { 5120: 'readInt8', 5121: 'readUInt8', 5122: 'readInt16LE', 5123: 'readUInt16LE', 5125: 'readUInt32LE', 5126: 'readFloatLE' }[a.componentType];
  for (let i = 0; i < a.count; i++) for (let c = 0; c < nc; c++) {
    let x = buf[rd]((a.byteOffset || 0) + i * stride + c * tam);
    if (a.normalized && nmax) x = Math.max(x / nmax, -1);
    out[i * nc + c] = x;
  }
  return { d: out, n: a.count, nc };
}
function mat4(n) {
  if (n.matrix) return n.matrix.slice();
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
}
function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
function resumen(buf) {
  const { j, bin } = partir(buf), vista = vistas(j, bin);
  const porMat = {}, nombres = [], caja = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const visita = (ni, M) => {
    const n = j.nodes[ni], W = mul(M, mat4(n));
    if (n.name) nombres.push(n.name);
    if (n.mesh != null) for (const p of j.meshes[n.mesh].primitives) {
      const mn = p.material != null ? (j.materials[p.material].name || '#' + p.material) : '(sin)';
      const g = porMat[mn] || (porMat[mn] = { tris: 0, verts: 0, area: 0, caja: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity] });
      const P = leer(j, vista, p.attributes.POSITION), w = new Float64Array(P.n * 3);
      for (let i = 0; i < P.n; i++) {
        const x = P.d[i * 3], y = P.d[i * 3 + 1], z = P.d[i * 3 + 2];
        for (let c = 0; c < 3; c++) {
          const v = W[c] * x + W[4 + c] * y + W[8 + c] * z + W[12 + c]; w[i * 3 + c] = v;
          if (v < g.caja[c]) g.caja[c] = v; if (v > g.caja[c + 3]) g.caja[c + 3] = v;
          if (v < caja[c]) caja[c] = v; if (v > caja[c + 3]) caja[c + 3] = v;
        }
      }
      const I = p.indices != null ? leer(j, vista, p.indices).d : Float64Array.from({ length: P.n }, (_, i) => i);
      g.verts += P.n; g.tris += I.length / 3;
      for (let t = 0; t < I.length; t += 3) {
        const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
        const ux = w[b] - w[a], uy = w[b + 1] - w[a + 1], uz = w[b + 2] - w[a + 2], vx = w[c] - w[a], vy = w[c + 1] - w[a + 1], vz = w[c + 2] - w[a + 2];
        g.area += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
      }
    }
    (n.children || []).forEach(c => visita(c, W));
  };
  for (const r of j.scenes[j.scene || 0].nodes) visita(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  return { porMat, caja, nombres: nombres.sort(), ext: j.extensionsUsed || [] };
}
function d(a, b) { return Math.max(...a.map((x, i) => Math.abs(x - b[i]))); }
function compara(A, B) {
  const err = [];
  if (JSON.stringify(A.nombres) !== JSON.stringify(B.nombres)) err.push('cambian los nombres de nodo');
  const claves = new Set([...Object.keys(A.porMat), ...Object.keys(B.porMat)]);
  let dCaja = d(A.caja, B.caja), dArea = 0;
  for (const k of claves) {
    const a = A.porMat[k], b = B.porMat[k];
    if (!a || !b) { err.push(`${k}: falta en un lado`); continue; }
    if (a.tris !== b.tris) err.push(`${k}: tris ${a.tris} → ${b.tris}`);
    const dc = d(a.caja, b.caja); dCaja = Math.max(dCaja, dc);
    const da = Math.abs(a.area - b.area) / Math.max(a.area, b.area); if (da > dArea) dArea = da;
  }
  return { err, dCaja, dArea };
}
(async () => {
  await MeshoptDecoder.ready;
  const filas = [];
  for (const m of MODELOS) {
    const ruta = 'assets/models/edificios/' + m;
    const desp = fs.readFileSync(path.join(RAIZ, ruta));
    // ojo: cmd.exe (por defecto en execSync de Windows) se come el '^' — usar ~1 (lección documentada KIMI-267)
    const ante = execSync(`git show eb21ebdf~1:${ruta}`, { cwd: RAIZ, maxBuffer: 256 * 1024 * 1024 });
    if (ante.equals(desp)) throw new Error('«antes» == «después»: cmd.exe se comió el ~1 o el modelo no cambió en eb21ebdf');
    const A = resumen(ante), B = resumen(desp), c = compara(A, B);
    const kbA = Math.round(ante.length / 1024), kbB = Math.round(desp.length / 1024);
    filas.push({ modelo: m, antes_KB: kbA, despues_KB: kbB, ext_despues: B.ext, caja_mm: +(c.dCaja * 1000).toFixed(3), area_rel: +c.dArea.toExponential(2), errores: c.err });
    console.log(`${m}: ${(kbA / 1024).toFixed(2)} → ${(kbB / 1024).toFixed(2)} MB · ext=${B.ext.join(',') || 'ninguna'} · caja máx ±${filas[filas.length - 1].caja_mm} mm · área Δ${filas[filas.length - 1].area_rel} · ${c.err.length ? 'NO: ' + c.err.slice(0, 4).join('; ') : 'ok (nombres/tris por material/caja)'}`);
  }
  const out = path.join(RAIZ, 'docs', 'img', 'kimi290', 'k299_verifica_meshopt.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ tarea: 'KIMI-299', parche: 'eb21ebdf', metodo: 'decode MeshoptDecoder vendorizado; por material: tris/caja(mundo)/area; nombres de nodo', filas }, null, 1));
  console.log('json: docs/img/kimi290/k299_verifica_meshopt.json');
})().catch(e => { console.error('FATAL', e.message || e); process.exit(1); });
