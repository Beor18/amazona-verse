#!/usr/bin/env node
/* Analizador offline del censo de kimi3_356_geo.js: agrupa las geometrías únicas por prefijo de
   dueño (nombre de malla antes de ':'), compara fases (base/paseoFin/liberar) y las recursos por
   estado. Uso: node tools/build/kimi3_356_analizar.js <json> [json2 ...] */
'use strict';
const fs = require('fs');
function grupos(fase) {
  const g = {};
  const uuids = new Set();
  for (const [dueño, uuid, verts, visible, count] of fase.lista) {
    if (uuids.has(uuid)) continue;
    uuids.add(uuid);
    const pref = (dueño || 'anon').split(':')[0];
    g[pref] = g[pref] || { geos: 0, verts: 0 };
    g[pref].geos++; g[pref].verts += verts;
  }
  return { unicas: uuids.size, grupos: g };
}
for (const f of process.argv.slice(2)) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log('=== ' + f + (d.sinPrecarga ? '  [SIN PRECARGA]' : '') + (d.error ? '  ERROR: ' + d.error : ''));
  let base = null, baseRec = null;
  for (const nombre of ['base', 'paseoFin', 'liberar']) {
    const fase = d.fases && d.fases[nombre];
    if (!fase || fase.info === undefined) { console.log(` ${nombre}: (sin datos)`); continue; }
    const g = grupos(fase);
    const recPorEstado = {};
    for (const [, estado] of (fase.recursos || [])) recPorEstado[estado] = (recPorEstado[estado] || 0) + 1;
    console.log(` ${nombre}: info.geo=${fase.info.geo} info.tex=${fase.info.tex} | geoUnicasEscena=${g.unicas} | objetos=${fase.objetosConGeo} | recursos=${JSON.stringify(recPorEstado)} | heap=${fase.heap}`);
    const top = Object.entries(g.grupos).sort((a, b) => b[1].geos - a[1].geos).slice(0, 12);
    console.log('   top grupos: ' + top.map(([k, v]) => `${k}=${v.geos}`).join(' '));
    if (nombre === 'base') { base = g; baseRec = fase.recursos; }
    else {
      const du = g.unicas - base.unicas;
      console.log(`   Δ vs base: geoUnicas ${du >= 0 ? '+' : ''}${du} | info.geo ${fase.info.geo - d.fases.base.info.geo >= 0 ? '+' : ''}${fase.info.geo - d.fases.base.info.geo}`);
      const difGrupos = [];
      for (const k in g.grupos) { const b = base.grupos[k] || { geos: 0 }; if (g.grupos[k].geos - b.geos) difGrupos.push(`${k} ${b.geos}→${g.grupos[k].geos}`); }
      for (const k in base.grupos) if (!g.grupos[k]) difGrupos.push(`${k} ${base.grupos[k].geos}→0`);
      if (difGrupos.length) console.log('   Δ grupos: ' + difGrupos.slice(0, 16).join(' | '));
    }
  }
  console.log('');
}
