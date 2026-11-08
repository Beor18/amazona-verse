/* KIMI-266 (Kimi 2) · análisis de cuantización de la geometría de los _glb.js del arranque.
   Decodifica el wrapper base64 (AV_*_B64) o lee un .glb, parsea el contenedor GLB y reporta:
   - extensionsUsed / generators (¿ya vienen gltfpack EXT_meshopt_compression + KHR_mesh_quantization?)
   - bytes por semantic+componentType (POSITION, NORMAL, TEXCOORD_0, COLOR_0, indices)
   - proyección de ahorro cuantizando a mano: POSITION f32→i16 (6B/v), NORMAL f32→i8n (3B/v),
     TEXCOORD f32→u16n (4B/v), índices u32→u16 cuando verts<65536 (con fallback u32).
   Uso: node tools/build/kimi2_cuantiza.js <archivo.glb|_glb.js> [más...] [--json salida.json]
   No toca el juego: lectura pura. */
'use strict';
const fs = require('fs'), path = require('path');

function bytesDe(ruta) {
  if (/\.js$/i.test(ruta)) {
    const txt = fs.readFileSync(ruta, 'utf8');
    const m = txt.match(/="([A-Za-z0-9+/=]+)"/);
    if (!m) throw new Error('no hay base64 en ' + ruta);
    return Buffer.from(m[1], 'base64');
  }
  return fs.readFileSync(ruta);
}

function parseaGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error('no es GLB');
  const len = buf.readUInt32LE(8);
  let off = 12;
  let json = null, bin = null;
  while (off < len) {
    const clen = buf.readUInt32LE(off), ctype = buf.readUInt32LE(off + 4);
    const chunk = buf.slice(off + 8, off + 8 + clen);
    if (ctype === 0x4E4F534A) json = JSON.parse(chunk.toString('utf8'));
    else if (ctype === 0x004E4942) bin = chunk;
    off += 8 + clen;
  }
  return { json, bin };
}

const CT = { 5120: ['i8', 1], 5121: ['u8', 1], 5122: ['i16', 2], 5123: ['u16', 2], 5125: ['u32', 4], 5126: ['f32', 4] };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function analiza(ruta) {
  const buf = bytesDe(ruta);
  const { json, bin } = parseaGLB(buf);
  const ext = json.extensionsUsed || [];
  const porSem = {};
  let verts = 0, prims = 0;
  for (const mesh of json.meshes || []) {
    for (const p of mesh.primitives || []) {
      prims++;
      for (const [sem, ai] of Object.entries(p.attributes || {})) {
        const a = json.accessors[ai];
        const nb = NCOMP[a.type] || 0, cb = CT[a.componentType][1];
        const bytes = a.count * nb * cb;
        const k = sem + ':' + CT[a.componentType][0];
        porSem[k] = (porSem[k] || 0) + bytes;
        if (sem === 'POSITION') verts += a.count;
      }
      if (p.indices != null) {
        const a = json.accessors[p.indices];
        porSem['indices:' + CT[a.componentType][0]] = (porSem['indices:' + CT[a.componentType][0]] || 0) + a.count * CT[a.componentType][1];
      }
    }
  }
  const geoBytes = Object.values(porSem).reduce((s, x) => s + x, 0);
  // proyección manual (si todo viniera en f32 crudo)
  const proj = { pos_i16: 0, norm_i8: 0, uv_u16: 0, col_u8: 0, idx_u16: 0, idx_u32: 0 };
  for (const mesh of json.meshes || []) for (const p of mesh.primitives || []) {
    const v = json.accessors[p.attributes.POSITION].count;
    if (p.attributes.POSITION != null) proj.pos_i16 += v * 6;
    if (p.attributes.NORMAL != null) proj.norm_i8 += v * 3;
    for (const s of Object.keys(p.attributes)) if (/^TEXCOORD/.test(s)) proj.uv_u16 += v * 4;
    if (p.attributes.COLOR_0 != null) { const a = json.accessors[p.attributes.COLOR_0]; proj.col_u8 += v * NCOMP[a.type] * 1; }
    if (p.indices != null) { const a = json.accessors[p.indices]; if (v < 65536) proj.idx_u16 += a.count * 2; else proj.idx_u32 += a.count * 4; }
  }
  const projTotal = Object.values(proj).reduce((s, x) => s + x, 0);
  return {
    archivo: path.basename(ruta), kb: Math.round(buf.length / 1024), ext, generator: json.asset && json.asset.generator || '',
    prims, verts, geoKB: Math.round(geoBytes / 1024), binKB: bin ? Math.round(bin.length / 1024) : 0,
    porSem: Object.fromEntries(Object.entries(porSem).map(([k, b]) => [k, Math.round(b / 1024)])),
    projKB: Math.round(projTotal / 1024),
  };
}

const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const rutas = args.filter(a => !a.startsWith('--') && a !== jsonOut);
const out = rutas.map(analiza);
for (const o of out) {
  console.log(`${o.archivo}: ${(o.kb / 1024).toFixed(2)} MB total, bin ${(o.binKB / 1024).toFixed(2)} MB, geo ${(o.geoKB / 1024).toFixed(2)} MB, ${o.verts} verts · ext=[${o.ext.join(',')}] · gen=${o.generator}`);
  console.log('  por semantic:', JSON.stringify(o.porSem));
  console.log(`  proyección cuantizado manual: ${(o.projKB / 1024).toFixed(2)} MB (ahorro geo ${(100 * (1 - o.projKB / Math.max(1, o.geoKB))).toFixed(0)}%)`);
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
