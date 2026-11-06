#!/usr/bin/env node
/* Amazona Verse · Kimi 2 — KIMI-125: datos de los 12 edificios graves.
   1) Triángulos REALES de cada versión (ligero/_hd/_lejos) leyendo los GLB binarios.
   2) Instancias del mapa con coordenadas.
   3) Comparación con lo declarado en kit.js. */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const MODELOS = ['templo_grande', 'templo_grande_a', 'templo_grande_d', 'templo_grande_e', 'templo_grande_f',
  'templo_mediano', 'templo_mediano_f', 'templo_mediano_g', 'templo_mediano_h', 'monumento_g', 'corral', 'complejo_ruinas'];

function triangulosGlb(f) {
  const b = fs.readFileSync(f);
  if (b.length < 20 || b.readUInt32LE(0) !== 0x46546C67) return { error: 'no es GLB' };
  const lenJson = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + lenJson).toString('utf8'));
  let tris = 0, verts = 0, prims = 0, mats = new Set();
  for (const m of json.meshes || []) {
    for (const p of m.primitives || []) {
      prims++;
      const acc = json.accessors || [];
      if (p.indices != null) tris += Math.floor((acc[p.indices] && acc[p.indices].count || 0) / 3);
      else if (p.attributes && p.attributes.POSITION != null) tris += Math.floor((acc[p.attributes.POSITION] && acc[p.attributes.POSITION].count || 0) / 3);
      if (p.material != null) mats.add(p.material);
    }
  }
  for (const a of json.accessors || []) if (a.type === 'VEC3') verts += a.count || 0;
  return { tris, prims, mats: mats.size, verts, kb: Math.round(b.length / 102.4) / 10 };
}

// kit.js
const kitSrc = fs.readFileSync(path.join(RAIZ, 'assets/models/edificios/kit.js'), 'utf8');
const KIT = JSON.parse(kitSrc.slice(kitSrc.indexOf('{'), kitSrc.lastIndexOf('}') + 1));

// mapa
const mapSrc = fs.readFileSync(path.join(RAIZ, 'assets/data/mapa_cap1.js'), 'utf8');
const a = mapSrc.indexOf('AV_MAPA_CAP1');
const i0 = mapSrc.indexOf('{', a);
let d = 0, i1 = i0, inStr = false, q = '';
for (let i = i0; i < mapSrc.length; i++) {
  const c = mapSrc[i];
  if (inStr) { if (c === '\\') i++; else if (c === q) inStr = false; continue; }
  if (c === '"' || c === "'") { inStr = true; q = c; continue; }
  if (c === '{') d++;
  else if (c === '}' && --d === 0) { i1 = i; break; }
}
const MAPA = JSON.parse(mapSrc.slice(i0, i1 + 1));

// localizar la lista de instancias
let instancias = null, instClave = null;
for (const k of Object.keys(MAPA)) {
  const v = MAPA[k];
  if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
    const hit = v.filter(x => MODELOS.includes(x.m || x.modelo || x.id)).length;
    if (hit) { instancias = v; instClave = k; }
  }
}
if (!instancias) {
  // buscar un nivel más abajo
  for (const k of Object.keys(MAPA)) {
    const v = MAPA[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const k2 of Object.keys(v)) {
        const w = v[k2];
        if (Array.isArray(w) && w.length && typeof w[0] === 'object' && w.filter(x => MODELOS.includes(x.m || x.modelo || x.id)).length) {
          instancias = w; instClave = k + '.' + k2;
        }
      }
    }
  }
}

const porModelo = {};
for (const id of MODELOS) porModelo[id] = [];
if (instancias) {
  for (const it of instancias) {
    const m = it.m || it.modelo || it.id;
    if (MODELOS.includes(m)) {
      porModelo[m].push(it);
    }
  }
}
const outRaw = {};
for (const id of MODELOS) if (porModelo[id][0]) outRaw[id] = porModelo[id][0];
console.error('EJEMPLOS CRUDOS: ' + JSON.stringify(outRaw, null, 1).slice(0, 3000));

const out = { instanciasEn: instClave, mapa: {} };
for (const id of MODELOS) {
  const fila = { kit: KIT[id] ? { tris: KIT[id].tris, trisHD: KIT[id].trisHD, trisLejos: KIT[id].trisLejos, hd: KIT[id].hd, kb: KIT[id].kb, kbHD: KIT[id].kbHD, radio: KIT[id].radio, alto: KIT[id].alto } : null, versiones: {}, nInst: porModelo[id].length, ejemplos: porModelo[id].slice(0, 4) };
  for (const suf of ['', '_hd', '_lejos']) {
    const f = path.join(RAIZ, 'assets/models/edificios', id + suf + '.glb');
    if (fs.existsSync(f)) fila.versiones[suf || 'ligero'] = triangulosGlb(f);
    else fila.versiones[suf || 'ligero'] = null;
  }
  out.mapa[id] = fila;
}
console.log(JSON.stringify(out, null, 1));
