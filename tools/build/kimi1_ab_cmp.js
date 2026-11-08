#!/usr/bin/env node
// Comparador A/B para k127_*.json (KIMI-329) — imprime tabla antes/despues por capa.
'use strict';
const fs = require('fs');
const [, , fa, fb] = process.argv;
if (!fa || !fb) { console.error('uso: node comp.js antes.json despues.json'); process.exit(1); }
const A = JSON.parse(fs.readFileSync(fa, 'utf8'));
const B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const capas = [...new Set([...Object.keys(A.capas || {}), ...Object.keys(B.capas || {})])];
console.log(`A head=${A.head}  B head=${B.head}`);
console.log('| capa | fpsMed A->B | fpsMin A->B | medianaMs | p99Ms | pausas50 | calls A/B | ktris A/B | heapMed A/B | texMB A/B | errores |');
for (const c of capas) {
  const a = A.capas[c], b = B.capas[c];
  if (!a || !b) { console.log(`| ${c} | FALTA ${a ? 'B' : 'A'} |`); continue; }
  const med = x => x.med || {};
  const num = (x, k) => (x == null ? '—' : x);
  console.log(`| ${c} | ${a.fpsMed}->${b.fpsMed} | ${a.fpsMin}->${b.fpsMin} | ${num(a.medianaMs)}->${num(b.medianaMs)} | ${num(a.p99Ms)}->${num(b.p99Ms)} | ${num(a.pausas50)}->${num(b.pausas50)} | ${med(a).calls}/${med(b).calls} | ${Math.round((med(a).triangulos || 0) / 1000)}k/${Math.round((med(b).triangulos || 0) / 1000)}k | ${med(a).heapMB}/${med(b).heapMB} | ${med(a).texturasMB}/${med(b).texturasMB} | ${(a.errores || []).length}/${(b.errores || []).length} |`);
}
