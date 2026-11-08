#!/usr/bin/env node
/* Amazona Verse · compresión meshopt de los modelos _hd de edificios (encargo 8-nov: Kelvin autoriza gltfpack/meshopt).
   La build de la nube no tiene tools/build/bin/gltfpack (binario de macOS) y publicaba la geometría _hd sin comprimir
   (avbuild.py paso_geometria avisa y sigue). Aquí se comprime en el repo, una vez, con gltfpack 1.2 (npm, el mismo
   1.2 que el MeshoptDecoder de assets/vendor/meshopt que assets.js ya pasa al GLTFLoader): la build ve
   EXT_meshopt_compression y lo deja «ya comprimido», en la Mac y en la nube.

   Solo geometría: -c (EXT_meshopt_compression) + KHR_mesh_quantization con posiciones a 16 bits (-vp 16), normales
   a 10 (-vn 10) y UV en float (-vtf); -tr deja las texturas tal cual (las mismas uris); -kn -km -ke -kv conservan
   nodos con nombre, materiales, extras y atributos. Sin simplificar: mismos triángulos y vértices.

   Antes de escribir, verifica cada modelo (decodifica con el MeshoptDecoder vendorizado y descuantiza como assets.js):
   - mismos nombres de nodo, de material (y por primitiva), extras, imágenes/uris y texturas;
   - por material: mismos triángulos (los vértices solo pueden bajar: gltfpack funde los idénticos), misma caja en coordenadas de mundo (± tolerancia) y misma área;
   - caja total del modelo (la que compara streamingTest con el ligero, QA-71) dentro de la tolerancia.
   Si algo no cuadra, no escribe ese modelo.

   Uso: node tools/build/meshopt_hd.js [--escribir] [--tol 0.002] <modelo|ruta .glb|_glb.js> ...
        node tools/build/meshopt_hd.js --todos [--escribir]     (todos los assets/models/edificios/*_hd*.glb)
   Sin --escribir solo informa. Con --escribir reescribe <modelo>.glb y <modelo>_glb.js (mismo envoltorio).
   gltfpack: $GLTFPACK, si no tools/build/bin/gltfpack, si no `npx --yes gltfpack@1.2.0`.
   Vuelta atrás: los originales están en git (git show <commit>^:assets/models/edificios/<modelo>.glb). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const RAIZ = path.resolve(__dirname, '..', '..');
const ED = path.join(RAIZ, 'assets', 'models', 'edificios');
const OPCIONES = ['-c', '-ce', 'ext', '-kn', '-km', '-ke', '-kv', '-tr', '-vtf', '-vp', '16', '-vn', '10', '-af', '0', '-ac', '-ar', '16'];
const MeshoptDecoder = require(path.join(RAIZ, 'assets', 'vendor', 'meshopt', 'meshopt_decoder.js'));

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
  const err = [], d = (a, b) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
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
    const dc = d(a.caja, b.caja); dCaja = Math.max(dCaja, dc);
    if (dc > TOL) err.push(`${k}: caja ±${(dc * 1000).toFixed(2)} mm`);
    const da = Math.abs(a.area - b.area) / Math.max(a.area, 1e-9); dArea = Math.max(dArea, da);
    if (da > 1e-3) err.push(`${k}: área ${(da * 100).toFixed(3)} %`);
  }
  if (d(A.caja, B.caja) > TOL) err.push(`caja total ±${(d(A.caja, B.caja) * 1000).toFixed(2)} mm`);
  return { err, dCaja, dArea };
}

MeshoptDecoder.ready.then(() => {
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
  fs.writeFileSync(i, raw);
  try { gltfpack(i, o); } catch (e) { console.log(`${m}: gltfpack falló: ${String(e.stderr || e.message).slice(-300)}`); fallos++; continue; }
  const out = fs.readFileSync(o), B = resumen(out), c = compara(A, B);
  const nuevo = env[1] + out.toString('base64') + env[3];
  const fila = { modelo: m, antes_js: txt.length, despues_js: nuevo.length, antes_glb: raw.length, despues_glb: out.length, caja_mm: +(c.dCaja * 1000).toFixed(3), area_rel: +c.dArea.toExponential(2), errores: c.err };
  filas.push(fila);
  console.log(`${m}: ${(txt.length / 1e6).toFixed(2)} → ${(nuevo.length / 1e6).toFixed(2)} MB (_glb.js) · caja máx ±${fila.caja_mm} mm · área ${fila.area_rel} · ${c.err.length ? 'NO: ' + c.err.slice(0, 4).join('; ') : 'ok'}`);
  if (c.err.length) { fallos++; continue; }
  if (ESCRIBIR) { fs.writeFileSync(fjs, nuevo); if (fs.existsSync(fglb)) fs.writeFileSync(fglb, out); }
}
fs.rmSync(tmp, { recursive: true, force: true });
const t = filas.filter(f => !f.errores.length);
console.log(`\n${t.length}/${filas.length} verificados · _glb.js ${(t.reduce((s, f) => s + f.antes_js, 0) / 1e6).toFixed(2)} → ${(t.reduce((s, f) => s + f.despues_js, 0) / 1e6).toFixed(2)} MB${ESCRIBIR ? ' (escritos)' : ' (sin escribir: --escribir)'}`);
if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(filas, null, 1));
process.exit(fallos ? 1 : 0);
});
