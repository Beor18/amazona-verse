#!/usr/bin/env node
/* Kimi 2 · escanea los *_glb.js (GLB en base64) de una carpeta y lista:
   - imágenes referenciadas por uri que no existen en disco (textura que no carga → material blanco);
   - materiales sin baseColorTexture y baseColorFactor blanco (≥0,93) o ausente;
   Uso: node tools/build/kimi2_materiales.js <carpeta> [carpeta2 ...] */
'use strict';
const fs = require('fs'), path = require('path');
let falta = 0, blanco = 0, archivos = 0;
for (const dir of process.argv.slice(2)) {
  if (!fs.existsSync(dir)) { console.log('· no existe ' + dir); continue; }
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('_glb.js')) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    // cada entrada: ["nombre"]="base64..."
    const re = /\["([^"]+)"\]="([A-Za-z0-9+/=]+)"/g;
    let m;
    while ((m = re.exec(txt))) {
      let buf;
      try { buf = Buffer.from(m[2], 'base64'); } catch (e) { continue; }
      if (buf.length < 20 || buf.toString('ascii', 0, 4) !== 'glTF') continue;
      const jsonLen = buf.readUInt32LE(12);
      if (20 + jsonLen > buf.length) continue;
      let g;
      try { g = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen)); } catch (e) { continue; }
      archivos++;
      for (const img of g.images || []) {
        const uri = img.uri;
        if (uri && !/^data:/.test(uri) && !fs.existsSync(path.join(dir, decodeURIComponent(uri)))) {
          console.log('FALTA ' + f + ' [' + m[1] + '] → ' + uri); falta++;
        }
      }
      for (const mat of g.materials || []) {
        const p = mat.pbrMetallicRoughness || {};
        const c = p.baseColorFactor;
        if (!p.baseColorTexture && (!c || (c[0] >= 0.93 && c[1] >= 0.93 && c[2] >= 0.93))) {
          console.log('BLANCO ' + f + ' [' + m[1] + '] :: ' + (mat.name || '?') + ' metal=' + (p.metallicFactor != null ? p.metallicFactor : 1));
          blanco++;
        }
      }
    }
  }
}
console.log('· ' + archivos + ' GLB analizados · ' + falta + ' imágenes faltantes · ' + blanco + ' materiales blancos sin textura');
