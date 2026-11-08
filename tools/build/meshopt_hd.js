#!/usr/bin/env node
/* Amazona Verse · compresión meshopt de los modelos _hd de edificios (encargo 8-nov: Kelvin autoriza gltfpack/meshopt).
   La build de la nube no tiene tools/build/bin/gltfpack (binario de macOS) y publicaba la geometría _hd sin comprimir
   (avbuild.py paso_geometria avisa y sigue). Aquí se comprime en el repo, una vez, con gltfpack 1.2 (npm, el mismo
   1.2 que el MeshoptDecoder de assets/vendor/meshopt que assets.js ya pasa al GLTFLoader): la build ve
   EXT_meshopt_compression y lo deja «ya comprimido», en la Mac y en la nube.

   Solo geometría: EXT_meshopt_compression sin filtros (sin pérdida, ver comprimir()) + KHR_mesh_quantization con posiciones a 16 bits (-vp 16), normales
   a 10 (-vn 10) y UV en float (-vtf); -tr deja las texturas tal cual (las mismas uris); -kn -km -ke -kv conservan
   nodos con nombre, materiales, extras y atributos. Sin simplificar: mismos triángulos y vértices.

   Antes de escribir, verifica cada modelo (decodifica con el MeshoptDecoder vendorizado y descuantiza como assets.js):
   - mismos nombres de nodo, de material (y por primitiva), extras, imágenes/uris y texturas; UV idénticas (float, -vtf);
   - por material: mismos triángulos (los vértices solo pueden bajar: gltfpack funde los idénticos), misma caja en coordenadas de mundo (± tolerancia) y misma área;
   - caja total del modelo (la que compara streamingTest con el ligero, QA-71) dentro de la tolerancia.
   Si algo no cuadra, no escribe ese modelo.

   Uso: node tools/build/meshopt_hd.js [--escribir] [--tol 0.002] <modelo|ruta .glb|_glb.js> ...
        node tools/build/meshopt_hd.js --todos [--escribir]     (todos los assets/models/edificios/*_hd*.glb)
   Sin --escribir solo informa. Con --escribir reescribe <modelo>.glb y <modelo>_glb.js (mismo envoltorio).
   gltfpack: $GLTFPACK, si no tools/build/bin/gltfpack, si no `npx --yes gltfpack@1.2.0`. Encoder: $MESHOPTIMIZER (npm meshoptimizer@1.2.0).
   Vuelta atrás: los originales están en git (git show <commit>^:assets/models/edificios/<modelo>.glb). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const ED = path.join(RAIZ, 'assets', 'models', 'edificios');
// UV exactas: gltfpack redondea la mantisa de las UV float (-vtf) a -vt bits (hasta 3,8e-3 de UV en el kit KB3D: 8-15 texels)
// y con -c además las filtra (EXPONENTIAL). Por eso: (1) antes de gltfpack cada vértice lleva su número en un TEXCOORD extra
// (enteros < 4096, exactos con cualquier mantisa) y después se reescriben las UV originales, bit a bit, y se quita ese
// TEXCOORD; (2) gltfpack va sin -c y la compresión meshopt se hace aquí sin filtros (sin pérdida) con el MeshoptEncoder 1.2.
const OPCIONES = ['-kn', '-km', '-ke', '-kv', '-tr', '-vtf', '-vp', '16', '-vn', '10', '-af', '0', '-ac', '-ar', '16'];
const MeshoptDecoder = require(path.join(RAIZ, 'assets', 'vendor', 'meshopt', 'meshopt_decoder.js'));
// Encoder (solo para esta herramienta, no va al juego): npm meshoptimizer@1.2.0, el mismo 1.2 que el decoder vendorizado.
// $MESHOPTIMIZER = carpeta del paquete (p. ej. <tmp>/node_modules/meshoptimizer); si no, require('meshoptimizer').
const { MeshoptEncoder } = require(path.join(process.env.MESHOPTIMIZER || 'meshoptimizer', 'meshopt_encoder.js'));

const args = process.argv.slice(2);
const ESCRIBIR = args.includes('--escribir');
const TOL = args.includes('--tol') ? +args[args.indexOf('--tol') + 1] : 0.002; // m
let modelos = args.filter((a, i) => !a.startsWith('--') && !['--tol', '--json'].includes(args[i - 1]));
if (args.includes('--todos')) modelos = fs.readdirSync(ED).filter(f => /_hd[a-z0-9]*\.glb$/.test(f)).map(f => f.slice(0, -4)).sort();
modelos = modelos.map(m => path.basename(m).replace(/(_glb\.js|\.glb)$/, ''));

function gltfpack(i, o) {
  const local = path.join(__dirname, 'bin', 'gltfpack');
  const [cmd, pre] = process.env.GLTFPACK ? [process.env.GLTFPACK, []] : fs.existsSync(local) ? [local, []] : ['npx', ['--yes', 'gltfpack@1.2.0']];
  execFileSync(cmd, pre.concat(['-i', i, '-o', o], OPCIONES), { stdio: ['ignore', 'ignore', 'pipe'] });
}

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
// (1) Marca: TEXCOORD_<libre> = (id % 4096, id / 4096) por vértice; guarda las UV originales por id
function marcar(buf) {
  const { j, bin } = partir(buf), vista = vistas(j, bin), extra = [], orig = [];
  let id = 0, off = bin.length;
  for (const m of j.meshes || []) for (const p of m.primitives) {
    const uvs = Object.keys(p.attributes).filter(k => /^TEXCOORD_\d+$/.test(k));
    if (!uvs.length) continue;
    const n = j.accessors[p.attributes.POSITION].count, libre = 'TEXCOORD_' + (Math.max(...uvs.map(k => +k.slice(9))) + 1);
    const datos = uvs.map(k => { const a = j.accessors[p.attributes[k]]; if (a.componentType !== 5126 || a.type !== 'VEC2') throw new Error(k + ' no es float VEC2'); return [k, Float32Array.from(leer(j, vista, p.attributes[k]).d)]; });
    const ids = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { ids[i * 2] = (id + i) % 4096; ids[i * 2 + 1] = Math.floor((id + i) / 4096); orig[id + i] = datos.map(([k, d]) => [k, d[i * 2], d[i * 2 + 1]]); }
    const b = Buffer.from(ids.buffer); extra.push(b);
    j.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length, byteStride: 8, target: 34962 }); off += b.length;
    j.accessors.push({ bufferView: j.bufferViews.length - 1, componentType: 5126, count: n, type: 'VEC2' });
    p.attributes[libre] = j.accessors.length - 1;
    id += n;
  }
  if (id >= 4096 * 4096) throw new Error('demasiados vértices para la marca');
  const nb = Buffer.concat([bin].concat(extra)); j.buffers[0].byteLength = nb.length;
  return { glb: armar(j, nb), orig };
}
// (1b) Tras gltfpack: UV originales por el id de cada vértice, fuera el TEXCOORD de la marca y sus accessors
function restaurar(buf, orig) {
  const { j, bin } = partir(buf), out = Buffer.from(bin), vista = vistas(j, bin);
  for (const m of j.meshes || []) for (const p of m.primitives) {
    const uvs = Object.keys(p.attributes).filter(k => /^TEXCOORD_\d+$/.test(k)).sort((a, b) => +a.slice(9) - +b.slice(9));
    if (!uvs.length) continue;
    const marca = uvs[uvs.length - 1], I = leer(j, vista, p.attributes[marca]).d;
    for (const k of uvs.slice(0, -1)) {
      const a = j.accessors[p.attributes[k]], bv = j.bufferViews[a.bufferView], st = bv.byteStride || 8, base = (bv.byteOffset || 0) + (a.byteOffset || 0);
      if (a.componentType !== 5126 || a.type !== 'VEC2') throw new Error(k + ' salió de gltfpack sin float VEC2');
      for (let i = 0; i < a.count; i++) {
        const o = orig[I[i * 2] + I[i * 2 + 1] * 4096]; if (!o) throw new Error('id de vértice perdido');
        const uv = o.find(x => x[0] === k); if (!uv) throw new Error('UV ' + k + ' sin original');
        out.writeFloatLE(uv[1], base + i * st); out.writeFloatLE(uv[2], base + i * st + 4);
      }
      a.min = undefined; a.max = undefined;
    }
    const am = j.accessors[p.attributes[marca]], bvm = j.bufferViews[am.bufferView];
    for (let i = 0; i < am.count; i++) { out.writeFloatLE(0, (bvm.byteOffset || 0) + (am.byteOffset || 0) + i * (bvm.byteStride || 8)); out.writeFloatLE(0, (bvm.byteOffset || 0) + (am.byteOffset || 0) + i * (bvm.byteStride || 8) + 4); }
    delete p.attributes[marca];
  }
  // accessors sin uso fuera (renumerando)
  const usados = new Set();
  for (const m of j.meshes || []) for (const p of m.primitives) { Object.values(p.attributes).forEach(a => usados.add(a)); if (p.indices != null) usados.add(p.indices); (p.targets || []).forEach(t => Object.values(t).forEach(a => usados.add(a))); }
  for (const s of j.skins || []) if (s.inverseBindMatrices != null) usados.add(s.inverseBindMatrices);
  for (const an of j.animations || []) for (const sm of an.samplers) { usados.add(sm.input); usados.add(sm.output); }
  const nuevo = new Map(), acc = [];
  j.accessors.forEach((a, i) => { if (usados.has(i)) { nuevo.set(i, acc.length); acc.push(JSON.parse(JSON.stringify(a))); } });
  j.accessors = acc;
  for (const m of j.meshes || []) for (const p of m.primitives) { for (const k in p.attributes) p.attributes[k] = nuevo.get(p.attributes[k]); if (p.indices != null) p.indices = nuevo.get(p.indices); (p.targets || []).forEach(t => { for (const k in t) t[k] = nuevo.get(t[k]); }); }
  for (const s of j.skins || []) if (s.inverseBindMatrices != null) s.inverseBindMatrices = nuevo.get(s.inverseBindMatrices);
  for (const an of j.animations || []) for (const sm of an.samplers) { sm.input = nuevo.get(sm.input); sm.output = nuevo.get(sm.output); }
  return armar(j, out);
}

function armar(j, bin) {
  const js = Buffer.from(JSON.stringify(j)), jp = Buffer.alloc((4 - js.length % 4) % 4, 0x20), bp = Buffer.alloc((4 - bin.length % 4) % 4);
  const J = Buffer.concat([js, jp]), B = Buffer.concat([bin, bp]), h = Buffer.alloc(12);
  h.writeUInt32LE(0x46546C67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + J.length + 8 + B.length, 8);
  const c = (b, t) => { const x = Buffer.alloc(8); x.writeUInt32LE(b.length, 0); x.writeUInt32LE(t, 4); return x; };
  return Buffer.concat([h, c(J, 0x4E4F534A), J, c(B, 0x004E4942), B]);
}
// EXT_meshopt_compression sin filtros (sin pérdida): vértices en modo ATTRIBUTES, índices en TRIANGLES (o INDICES).
// Los datos comprimidos van en el buffer 0; el 1 es la reserva vacía (fallback) que exige la extensión.
function comprimir(buf) {
  const { j, bin } = partir(buf);
  if (j.buffers.length !== 1) throw new Error('se esperaba un solo buffer');
  const idx = new Map();
  for (const m of j.meshes || []) for (const p of m.primitives) if (p.indices != null) {
    const a = j.accessors[p.indices]; idx.set(a.bufferView, { size: a.componentType === 5125 ? 4 : 2, tri: (p.mode == null || p.mode === 4) });
  }
  const partes = [], al4 = n => (n + 3) & ~3; let off = 0, offF = 0;
  for (const [k, bv] of j.bufferViews.entries()) {
    const src = new Uint8Array(bin.buffer, bin.byteOffset + (bv.byteOffset || 0), bv.byteLength);
    let ext = null;
    if (idx.has(k)) {
      const { size, tri } = idx.get(k), count = bv.byteLength / size;
      ext = { mode: tri && count % 3 === 0 ? 'TRIANGLES' : 'INDICES', size, count };
    } else if (bv.byteStride && bv.byteStride % 4 === 0 && bv.byteStride <= 256 && bv.target === 34962) {
      ext = { mode: 'ATTRIBUTES', size: bv.byteStride, count: bv.byteLength / bv.byteStride };
    }
    if (ext) {
      const enc = Buffer.from(MeshoptEncoder.encodeGltfBuffer(src, ext.count, ext.size, ext.mode));
      partes.push(enc, Buffer.alloc(al4(enc.length) - enc.length));
      bv.extensions = Object.assign(bv.extensions || {}, { EXT_meshopt_compression: { buffer: 0, byteOffset: off, byteLength: enc.length, byteStride: ext.size, mode: ext.mode, count: ext.count } });
      off += al4(enc.length);
      bv.buffer = 1; bv.byteOffset = offF; offF += al4(bv.byteLength);
    } else {
      partes.push(Buffer.from(src), Buffer.alloc(al4(src.length) - src.length));
      bv.buffer = 0; bv.byteOffset = off; off += al4(src.length);
    }
  }
  j.buffers = [{ byteLength: off }, { byteLength: offF, extensions: { EXT_meshopt_compression: { fallback: true } } }];
  for (const l of ['extensionsUsed', 'extensionsRequired']) j[l] = [...new Set((j[l] || []).concat('EXT_meshopt_compression'))];
  return armar(j, Buffer.concat(partes));
}

const ENV_RE = /^([\s\S]*?=")([A-Za-z0-9+/=]+)(";?\s*)$/;

// ---- lectura de geometría (como GLTFLoader r128 + descuantizar de assets.js) ----
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

// gltfpack no escribe los valores por defecto del glTF (roughnessFactor 1, doubleSided false...): se rellenan para comparar
function conDefectos(m) {
  m = JSON.parse(JSON.stringify(m));
  m.pbrMetallicRoughness = Object.assign({ baseColorFactor: [1, 1, 1, 1], metallicFactor: 1, roughnessFactor: 1 }, m.pbrMetallicRoughness);
  m = Object.assign({ emissiveFactor: [0, 0, 0], alphaMode: 'OPAQUE', alphaCutoff: 0.5, doubleSided: false }, m);
  const tex = (o, extra) => { if (o) Object.assign(o, Object.assign({ texCoord: 0 }, extra, o)); };
  tex(m.normalTexture, { scale: 1 }); tex(m.occlusionTexture, { strength: 1 }); tex(m.emissiveTexture);
  tex(m.pbrMetallicRoughness.baseColorTexture); tex(m.pbrMetallicRoughness.metallicRoughnessTexture);
  return m;
}

function normaliza(v, j, k) {
  if (Array.isArray(v)) return v.map(x => normaliza(x, j));
  if (typeof v === 'number') return k === 'index' || k === 'texCoord' ? v : +Math.fround(v).toPrecision(7);
  if (!v || typeof v !== 'object') return v;
  const o = {};
  for (const kk of Object.keys(v).sort()) {
    o[kk] = normaliza(v[kk], j, kk);
  }
  if (typeof v.index === 'number' && j.textures && /Texture$/.test(k || '')) {
    const t = j.textures[v.index] || {}, im = (j.images || [])[t.source] || {};
    o.index = 'img:' + (im.uri || 'bv') + ' sampler:' + JSON.stringify(normaliza((j.samplers || [])[t.sampler] || {}, j));
  }
  return o;
}

function resumen(buf) {
  const { j, bin } = partir(buf), vista = vistas(j, bin);
  const porMat = {}, nombres = [], extras = [], caja = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  const visita = (ni, M) => {
    const n = j.nodes[ni], W = mul(M, mat4(n));
    if (n.name) nombres.push(n.name);
    if (n.extras) extras.push([n.name, JSON.stringify(n.extras)]);
    if (n.mesh != null) for (const p of j.meshes[n.mesh].primitives) {
      const mn = p.material != null ? (j.materials[p.material].name || '#' + p.material) : '(sin)';
      const g = porMat[mn] || (porMat[mn] = { tris: 0, verts: 0, area: 0, caja: [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity], attrs: new Set() });
      Object.keys(p.attributes).forEach(k => g.attrs.add(k));
      if (!g.uv) g.uv = new Set();
      for (const k of Object.keys(p.attributes).filter(k => /^TEXCOORD/.test(k))) { const U = leer(j, vista, p.attributes[k]); for (let i = 0; i < U.d.length; i += 2) g.uv.add(k + ':' + Math.fround(U.d[i]) + ',' + Math.fround(U.d[i + 1])); }
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
  return {
    j, porMat, caja, nombres: nombres.sort(), extras: extras.sort(),
    // Material resuelto: cada textura → uri de su imagen (gltfpack renumera y quita las texturas sin uso) y los números
    // a float32 (gltfpack los escribe con 9 cifras: 0.800000011920929 → 0.800000012, el mismo float32)
    materiales: (j.materials || []).map(m => JSON.stringify(normaliza(conDefectos(m), j))).sort(),
    imagenes: [...new Set(JSON.stringify((j.materials || []).map(m => normaliza(conDefectos(m), j))).match(/"img:[^"]*"/g) || [])].sort(),
    texturas: [],
    ext: j.extensionsUsed || [],
  };
}

function compara(A, B) {
  const err = [], avisos = [], d = (a, b) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
  if (JSON.stringify(A.nombres) !== JSON.stringify(B.nombres)) err.push('cambian los nombres de nodo');
  if (JSON.stringify(A.extras) !== JSON.stringify(B.extras)) err.push('cambian los extras');
  if (JSON.stringify(A.materiales) !== JSON.stringify(B.materiales)) err.push('cambian los materiales');
  if (JSON.stringify(A.imagenes) !== JSON.stringify(B.imagenes) || JSON.stringify(A.texturas) !== JSON.stringify(B.texturas)) err.push('cambian imágenes/texturas');
  if (JSON.stringify(Object.keys(A.porMat).sort()) !== JSON.stringify(Object.keys(B.porMat).sort())) err.push('cambia el reparto por material');
  let dCaja = d(A.caja, B.caja), dArea = 0;
  for (const k in A.porMat) {
    const a = A.porMat[k], b = B.porMat[k]; if (!b) continue;
    // gltfpack funde los vértices idénticos en todos sus atributos (sin pérdida): los triángulos no cambian, los vértices pueden bajar
    if (a.tris !== b.tris || b.verts > a.verts) err.push(`${k}: tris/verts ${a.tris}/${a.verts} → ${b.tris}/${b.verts}`);
    if ([...a.attrs].sort().join() !== [...b.attrs].sort().join()) err.push(`${k}: atributos ${[...a.attrs]} → ${[...b.attrs]}`);
    // cada UV de salida es una UV original exacta (gltfpack quita los vértices sin triángulo: el conjunto puede bajar)
    if ([...b.uv].some(x => !a.uv.has(x))) err.push(`${k}: cambian las UV`);
    else if (b.uv.size < a.uv.size) avisos.push(`${k}: ${a.uv.size - b.uv.size} UV de vértices sin triángulo fuera`);
    const dc = d(a.caja, b.caja); dCaja = Math.max(dCaja, dc);
    if (dc > TOL) err.push(`${k}: caja ±${(dc * 1000).toFixed(2)} mm`);
    const da = Math.abs(a.area - b.area) / Math.max(a.area, 1e-9); dArea = Math.max(dArea, da);
    if (da > 1e-3) err.push(`${k}: área ${(da * 100).toFixed(3)} %`);
  }
  if (d(A.caja, B.caja) > TOL) err.push(`caja total ±${(d(A.caja, B.caja) * 1000).toFixed(2)} mm`);
  return { err, avisos, dCaja, dArea };
}

Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]).then(() => {
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'meshopt-hd-'));
const filas = [];
let fallos = 0;
for (const m of modelos) {
  const fglb = path.join(ED, m + '.glb'), fjs = path.join(ED, m + '_glb.js');
  if (!fs.existsSync(fjs)) { console.log(`${m}: no existe ${path.relative(RAIZ, fjs)}`); fallos++; continue; }
  const txt = fs.readFileSync(fjs, 'utf8'), env = ENV_RE.exec(txt);
  if (!env) { console.log(`${m}: envoltorio no reconocido`); fallos++; continue; }
  const raw = Buffer.from(env[2], 'base64');
  if (fs.existsSync(fglb) && !fs.readFileSync(fglb).equals(raw)) console.log(`${m}: aviso: el .glb no coincide con el _glb.js; se parte del _glb.js (lo que sirve el juego)`);
  const A = resumen(raw);
  if (A.ext.includes('EXT_meshopt_compression')) { console.log(`${m}: ya comprimido (${(txt.length / 1e6).toFixed(2)} MB), sin cambio`); continue; }
  const i = path.join(tmp, m + '.in.glb'), o = path.join(tmp, m + '.out.glb');
  let orig;
  try { const mk = marcar(raw); orig = mk.orig; fs.writeFileSync(i, mk.glb); } catch (e) { console.log(`${m}: no se pudo marcar: ${e.message}`); fallos++; continue; }
  try { gltfpack(i, o); } catch (e) { console.log(`${m}: gltfpack falló: ${String(e.stderr || e.message).slice(-300)}`); fallos++; continue; }
  let out;
  try { out = comprimir(restaurar(fs.readFileSync(o), orig)); } catch (e) { console.log(`${m}: no se pudo comprimir: ${e.message}`); fallos++; continue; }
  const B = resumen(out), c = compara(A, B);
  const nuevo = env[1] + out.toString('base64') + env[3];
  const fila = { modelo: m, antes_js: txt.length, despues_js: nuevo.length, antes_glb: raw.length, despues_glb: out.length, caja_mm: +(c.dCaja * 1000).toFixed(3), area_rel: +c.dArea.toExponential(2), errores: c.err };
  filas.push(fila);
  console.log(`${m}: ${(txt.length / 1e6).toFixed(2)} → ${(nuevo.length / 1e6).toFixed(2)} MB (_glb.js) · caja máx ±${fila.caja_mm} mm · área ${fila.area_rel} · ${c.err.length ? 'NO: ' + c.err.slice(0, 4).join('; ') : 'ok'}${c.avisos.length ? ' (' + c.avisos.join('; ') + ')' : ''}`);
  if (c.err.length) { fallos++; continue; }
  if (ESCRIBIR) { fs.writeFileSync(fjs, nuevo); if (fs.existsSync(fglb)) fs.writeFileSync(fglb, out); }
}
fs.rmSync(tmp, { recursive: true, force: true });
const t = filas.filter(f => !f.errores.length);
console.log(`\n${t.length}/${filas.length} verificados · _glb.js ${(t.reduce((s, f) => s + f.antes_js, 0) / 1e6).toFixed(2)} → ${(t.reduce((s, f) => s + f.despues_js, 0) / 1e6).toFixed(2)} MB${ESCRIBIR ? ' (escritos)' : ' (sin escribir: --escribir)'}`);
if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(filas, null, 1));
process.exit(fallos ? 1 : 0);
});
