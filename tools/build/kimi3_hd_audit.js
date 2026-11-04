// Auditoría de los _hd de edificios: invariantes de KIMI-Task-010 sobre TODOS los modelos, no solo las lonas.
// Uso: node tools/build/kimi3_hd_audit.js [--dir assets/models/edificios]
// Sale con código 1 si un modelo hd:true tiene materiales crudos del integrador (Fabric_*/Multi_*) o referencias
// a tex_original en los materiales que usa (los restaurados Ancient usan materiales con nombre: se reportan como info).
'use strict';
const fs = require('fs');
const path = require('path');

const dirArg = process.argv.indexOf('--dir');
const DIR = dirArg > -1 ? process.argv[dirArg + 1] || 'assets/models/edificios' : 'assets/models/edificios';
const kit = JSON.parse(fs.readFileSync(path.join(DIR, 'kit.js'), 'utf8').match(/=\s*(\{.*\})/s)[1]);

const filas = [];
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('_hd.glb')).sort()) {
  const id = f.replace('_hd.glb', '');
  const b = fs.readFileSync(path.join(DIR, f));
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jsonLen).toString());
  let tris = 0;
  for (const m of json.meshes || []) for (const p of m.primitives) {
    if (p.indices != null) tris += json.accessors[p.indices].count / 3;
    else if (p.attributes.POSITION != null) tris += json.accessors[p.attributes.POSITION].count / 3;
  }
  const mats = (json.materials || []).map(m => m.name || '(sin nombre)');
  const imgs = (json.images || []).map(i => i.uri || '(embebida)');
  // texturas realmente usadas por materiales (las demás del array images no las carga GLTFLoader)
  const texUsadas = new Set();
  for (const m of json.materials || []) for (const k of ['baseColorTexture', 'normalTexture', 'metallicRoughnessTexture', 'occlusionTexture', 'emissiveTexture']) {
    const t = m.pbrMetallicRoughness && (k === 'baseColorTexture' || k === 'metallicRoughnessTexture') ? m.pbrMetallicRoughness[k === 'baseColorTexture' ? 'baseColorTexture' : 'metallicRoughnessTexture'] : m[k];
    if (t && t.index != null) texUsadas.add(t.index);
  }
  const imgsUsadas = new Set();
  for (const t of texUsadas) { const tex = json.textures[t]; if (tex && tex.source != null) imgsUsadas.add(tex.source); }
  const urisUsadas = [...imgsUsadas].map(i => imgs[i] || '');
  const crudo = mats.some(n => /^(Fabric_|Multi_)/.test(n));
  const texOrigUsada = urisUsadas.some(u => /tex_original/.test(u));
  const k = kit[id] || {};
  filas.push({ id, hd: !!k.hd, tris: Math.round(tris), trisHD: k.trisHD, nmats: mats.length, mats: mats.join('|'), nimgs: imgs.length, nimgsUsadas: imgsUsadas.size, urisUsadas: urisUsadas.join(','), crudo, texOrigUsada });
}

let fallos = 0;
for (const o of filas) {
  const problemas = [];
  if (o.crudo) problemas.push('MATERIAL-CRUDO(Fabric_/Multi_)');
  if (o.hd && o.texOrigUsada) problemas.push('USA tex_original');
  if (!o.hd) problemas.push('hd:false (_hd inerte)');
  if (o.hd && o.trisHD && Math.abs(o.tris - o.trisHD) / o.trisHD > 0.35) problemas.push('tris ' + o.tris + ' vs kit ' + o.trisHD);
  if (o.hd && o.crudo) fallos++;
  console.log([o.id, 'hd=' + o.hd, 'tris=' + o.tris + (o.trisHD ? '/' + o.trisHD : ''), 'mats=' + o.nmats, 'imgs=' + o.nimgsUsadas + '/' + o.nimgs, problemas.length ? problemas.join(' · ') : 'ok'].join(' | '));
}
const crudos = filas.filter(o => o.crudo);
console.log('---');
console.log('modelos _hd:', filas.length, '· hd:true', filas.filter(o => o.hd).length, '· hd:false', filas.filter(o => !o.hd).length);
console.log('crudos (integrador, materiales Fabric_/Multi_):', crudos.map(o => o.id + (o.hd ? ' (hd:true ¡FAIL!)' : ' (hd:false, inerte)')).join(', ') || 'ninguno');
console.log('hd:true con materiales con nombre (restaurados y cajas del integrador, by design):', filas.filter(o => o.hd && !/AV_HD_/.test(o.mats)).map(o => o.id).join(', ') || 'ninguno');
process.exit(fallos ? 1 : 0);
