let s = '';
process.stdin.on('data', d => s += d).on('end', () => {
  const j = JSON.parse(s);
  let mal = 0;
  for (const id of Object.keys(j.mapa)) {
    const m = j.mapa[id];
    if (!m.kit) continue;
    const v = m.versiones, L = v.ligero, H = v['_hd'], E = v['_lejos'];
    const ck = (nom, decl, realBin, realWrap) => {
      const okk = decl === realBin || (realWrap != null && Math.abs(decl - realWrap) < 0.15);
      if (!okk) { mal++; console.log('DESHONESTO', id, nom, 'decl', decl, 'bin', realBin, 'wrap', realWrap); }
    };
    if (id === 'complejo_ruinas') {
      // trisHD/kbHD de complejo_ruinas describen el variant hd400 (400k), no el _hd normal: KIMI-022.
      if (m.kit.trisHD !== 400000 || m.kit.kbHD !== 5377) { mal++; console.log('DESHONESTO', id, 'hd400', m.kit.trisHD, m.kit.kbHD); }
      ck('tris', m.kit.tris, L.tris, null);
      ck('kb', m.kit.kb, L.kb, L.kbWrapper);
      ck('trisLejos', m.kit.trisLejos, E ? E.tris : null, null);
      ck('kbLejos', m.kit.kbLejos, E ? E.kb : null, E ? E.kbWrapper : null);
      continue;
    }
    ck('tris', m.kit.tris, L.tris, null);
    ck('kb', m.kit.kb, L.kb, L.kbWrapper);
    ck('trisHD', m.kit.trisHD, H ? H.tris : null, null);
    ck('kbHD', m.kit.kbHD, H ? H.kb : null, H ? H.kbWrapper : null);
    ck('trisLejos', m.kit.trisLejos, E ? E.tris : null, null);
    ck('kbLejos', m.kit.kbLejos, E ? E.kb : null, E ? E.kbWrapper : null);
  }
  console.log(mal === 0 ? 'TODO HONESTO (12 modelos x campos)' : mal + ' campos deshonestos');
});
