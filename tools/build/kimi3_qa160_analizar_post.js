// Analizador offline QA-160 post-mortem: qué quedó retenido en m2 con refs>0, quién lo retiene (zonas n2/ciudad/hd/pre).
// Uso: node tools/build/kimi3_qa160_analizar_post.js <etiqueta>
const E = process.argv[2] || 'r18-post';
const d = require(`../../docs/img/kimi160/qa160-${E}.json`);
for (const [i, c] of (d.corridas || []).entries()) {
  if (c.error) { console.log(`corrida ${i + 1}: ERROR ${c.error}`); continue; }
  const sf = (c.sinFugas || [])[0];
  console.log(`\n=== corrida ${i + 1}: ${c.passed}/${c.total} · SinFugas ${sf ? (sf.ok ? 'VERDE' : 'ROJO') : '?'} · kb ${c.kbM1}→${c.kbM2} · info ${JSON.stringify(c.infoM1)}→${JSON.stringify(c.infoM2)}`);
  if (!c.m2) { console.log('  (sin m2)'); continue; }
  // dueños estructurales desde m2.zonas (nivel/ciudad/hd/pre congelados en el snap)
  const duenos = {};
  for (const z of c.m2.zonas) {
    for (const k of (z.pre || [])) { const j = k.indexOf(':'), t = k.slice(0, j), n = k.slice(j + 1); (duenos[n + ':' + t] = duenos[n + ':' + t] || []).push(z.id + '(pre)'); }
    if (z.ciudad) for (const k of (c._modelosCiudad || [])) {} // (modelos no están en el snap; se cruza abajo por nombre)
  }
  // zonas vivas por nombre para cruzar
  const zonas = {};
  for (const z of c.m2.zonas) zonas[z.id] = z;
  const retenidos = (c.m2.recursos || []).filter(r => r.e === 'listo' && r.refs > 0 && !r.fijo);
  const conSoltarEn = retenidos.filter(r => r.soltarEn);
  console.log(`  listos refs>0: ${retenidos.length} (con soltarEn=${conSoltarEn.length} — gracia, no leak estructural)`);
  // top por MB sin soltarEn (retenidos de verdad)
  const dudosos = retenidos.filter(r => !r.soltarEn).sort((a, b) => b.mb - a.mb).slice(0, 25);
  for (const r of dudosos) {
    const du = duenos[r.n + ':' + r.t] || [];
    const zonaNombres = Object.keys(zonas).filter(id => zonas[id].nivel === 2 || zonas[id].ciudad || zonas[id].hd).join(',');
    console.log(`   ${r.n}:${r.t} r${r.refs} ${r.mb}KB preDueños=[${du.join('|')}] zonasVivas(n2/ciudad/hd)=${zonaNombres}`);
  }
  // zonas con pre en m2
  const conPre = c.m2.zonas.filter(z => (z.pre || []).length);
  for (const z of conPre) console.log(`   Z.pre ${z.id} (n${z.nivel} ciudad=${z.ciudad} hd=${z.hd} d=${z.d}): ${z.pre.length} refs — ${z.pre.slice(0, 6).join(', ')}${z.pre.length > 6 ? '…' : ''}`);
  // zonas a nivel 2 / ciudad / hd en el estado final (spawn): no debería haber más que la villa
  for (const z of c.m2.zonas) if (z.nivel === 2 || z.ciudad || z.hd) console.log(`   ZONA VIVA ${z.id}: n${z.nivel} ciudad=${z.ciudad} hd=${z.hd} d=${z.d} bajarPide=${z.bajarPide} hdBajar=${z.hdBajar}`);
}
