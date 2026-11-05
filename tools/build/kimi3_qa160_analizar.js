#!/usr/bin/env node
/* Analizador offline de qa160-*.json (KIMI-052/QA-160): diff de censo de escena m1↔m2 por corrida.
   Uso: node tools/build/kimi3_qa160_analizar.js docs/img/kimi160/qa160-r13.json */
'use strict';
const fs = require('fs');
const f = process.argv[2];
if (!f) { console.error('uso: node tools/build/kimi3_qa160_analizar.js <qa160-*.json>'); process.exit(1); }
const r = JSON.parse(fs.readFileSync(f, 'utf8'));
console.log('archivo:', f, '· corridas:', r.corridas.length);
for (let i = 0; i < r.corridas.length; i++) {
  const c = r.corridas[i];
  if (c.error) { console.log(`\n[${i}] ERROR: ${c.error}`); continue; }
  const sf = (c.sinFugas || [])[0];
  const rojo = sf && !sf.ok;
  console.log(`\n[${i}] ${c.passed}/${c.total} · Sin fugas: ${sf ? (sf.ok ? 'VERDE' : 'ROJO') : '?'} · heap ${c.heapM1}→${c.heapM2} MB · listos ${c.nListosM1}→${c.nListosM2} · kb ${c.kbM1}→${c.kbM2} · info ${JSON.stringify(c.infoM1)}→${JSON.stringify(c.infoM2)}`);
  if (rojo) {
    console.log('   extra:', String(sf.extra).slice(0, 260));
    const ng = c.nuevasGeo || [];
    if (ng.length) {
      console.log('   GEOMETRÍAS NUEVAS en escena (m2 vs m1):');
      for (const x of ng.slice(0, 25)) console.log(`     ${x.nom}  Δn=${x.dn} Δkb=${x.dkb}  (n=${x.n2}, kb=${x.kb2})`);
    } else {
      const m1r = {}, m2r = {};
      for (const x of c.m1.recursos) if (x.e === 'listo') m1r[x.n + ':' + x.t] = x;
      for (const x of c.m2.recursos) if (x.e === 'listo') m2r[x.n + ':' + x.t] = x;
      const nuevosListos = Object.keys(m2r).filter(k => !m1r[k]);
      console.log('   sin geometrías de escena nuevas; listos nuevos en m2:', nuevosListos.length);
      for (const k of nuevosListos.slice(0, 20)) { const x = m2r[k]; console.log(`     ${k} refs=${x.refs} ${x.mb}KB soltarEn=${x.soltarEn}`); }
    }
  }
}
