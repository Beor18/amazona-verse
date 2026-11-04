// Sonda KIMI-006/008: AV.floraSonda() cuenta la flora en el mar, sin malla visible debajo o > 0,5 m bajo ella (rayo a la malla)
// y AV.floraFotos() saca las capturas de docs/img/kimi006/. Se inyecta con avtest.py (pruebas.inyectar) y no va en la build.
(function () {
  const AV = window.AV;
  const sleep = t => new Promise(r => setTimeout(r, t));
  AV.floraSonda = async function () {
    const G = AV.G, T = G.terreno, V = G.vegetacion;
    await G.mundo.listo; await V.listo; await T.listo;
    const ray = new THREE.Raycaster(), abajo = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3();
    const visible = (x, z) => { o.set(x, 400, z); ray.set(o, abajo); const h = ray.intersectObjects(T.chunks, false); return h.length ? h[0].point.y : NaN; };
    const mar = 0;
    const res = { total: 0, enMar: 0, sinTerreno: 0, enterradas: 0, porCat: {}, ejMar: [], ejEnt: [] };
    const I = V.instancias;
    for (const m in I) {
      const P = I[m];
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i * 4], y = P.pos[i * 4 + 1], z = P.pos[i * 4 + 2];
        res.total++;
        const hv = visible(x, z);
        const agua = Math.max(mar, G.agua.levelAt(x, z));
        const enMar = !(hv === hv) || y < agua - 0.1;
        if (!(hv === hv)) res.sinTerreno++;
        if (enMar) { res.enMar++; res.porCat[m] = (res.porCat[m] || 0) + 1; if (res.ejMar.length < 12) res.ejMar.push([m, +x.toFixed(1), +y.toFixed(2), +z.toFixed(1), hv === hv ? +hv.toFixed(2) : null]); }
        else if (y < hv - 0.5) {
          const esperado = T.selvaTepuy && T.selvaTepuy(x, z) > 0 ? (1 - T.normalAt(x, z).y) * 4 : 0;
          if (hv - y - esperado > 0.5) res.enterradasSinMotivo = (res.enterradasSinMotivo || 0) + 1; else res.hundidasLaderaTepuy = (res.hundidasLaderaTepuy || 0) + 1;
          res.enterradas++; if (res.ejEnt.length < 12) res.ejEnt.push([m, +x.toFixed(1), +y.toFixed(2), +z.toFixed(1), +hv.toFixed(2)]); }
      }
    }
    // flora junto a los edificios kelvin indicados (o al de techo y a ruinas_yunque)
    const ACT = (G.mundo && G.mundo.activos) || {}, cerca = {};
    for (const id of Object.keys(ACT)) {
      if (!/kelvin_ruinas_yunque#0|toldo_pequeno@kelvin_ruinas_yunque/.test(id) && !(ACT[id].tipo === 'kelvin' && (ACT[id].alto || 0) > 3 && /casa_paja|bohio|caney/.test(id))) continue;
      const [bx, , bz] = ACT[id].pos || [0, 0, 0], l = [];
      for (const m in I) { const P = I[m]; for (let i = 0; i < P.n; i++) { const d = Math.hypot(P.pos[i * 4] - bx, P.pos[i * 4 + 2] - bz); if (d < 11) l.push([m, +d.toFixed(1), +P.pos[i * 4].toFixed(1), +P.pos[i * 4 + 2].toFixed(1), +P.pos[i * 4 + 3].toFixed(2)]); } }
      cerca[id] = { pos: ACT[id].pos, alto: ACT[id].alto, flora: l };
    }
    res.cerca = cerca;
    // árboles dentro del disco de tierra pisada de una pieza de Kelvin
    const EK = (G.terreno.mapa.escenaKelvin && G.terreno.mapa.escenaKelvin.compacto) || [], pz = [];
    for (const e of EK) { if (/^(canoa|puente_madera)$/.test(e.modelo)) continue; const r = /^(templo|ruina|muro_templo|plataforma|bloque|losa|complejo)/.test(e.modelo) ? 3 : 4.5; for (const v of e.inst) pz.push([v.length >= 16 ? v[12] : v[0], v.length >= 16 ? v[14] : v[2], r]); }
    res.arbolesEnPiezas = 0;
    for (const m in I) { if (!/tabonuco|yagrumo|palma_sierra$|ceiba|flamboyan|bambu|helecho_arboreo|arbol_/.test(m)) continue; const P = I[m]; for (let i = 0; i < P.n; i++) if (pz.some(p => Math.hypot(p[0] - P.pos[i * 4], p[1] - P.pos[i * 4 + 2]) < p[2])) res.arbolesEnPiezas++; }
    return { results: [{ name: 'flora', ok: true, extra: JSON.stringify(res) }] };
  };
  // Capturas: window.AV_FOTOS = [{nombre, px, pz, cx, cy, cz, lx, ly, lz}]
  AV.floraFotos = async function () {
    const G = AV.G, S = G.S, R = G.renderer, out = [];
    for (const f of (window.AV_FOTOS_FLORA || [{ nombre: 'playa', px: 205, pz: -41, cx: 206, cy: 30, cz: -38, lx: 262, ly: -2, lz: -52 }, { nombre: 'ladera', px: -10, pz: -80, cx: -35, cy: 48, cz: -55, lx: -5, ly: 27, lz: -92 }])) {
      G.fisica.MOVE.flying = true; S.pos.x = f.px; S.pos.z = f.pz; S.pos.y = f.cy;
      for (let i = 0; i < 40; i++) { S.pos.x = f.px; S.pos.z = f.pz; S.pos.y = f.cy; S.vy = 0; await sleep(100); }
      if (G.vegetacion.actualizar) G.vegetacion.actualizar();
      await sleep(500);
      const cam = R.camera; cam.position.set(f.cx, f.cy, f.cz); cam.lookAt(f.lx, f.ly, f.lz); cam.updateMatrixWorld();
      R.renderer.render(R.scene, cam);
      out.push({ name: f.nombre, ok: true, extra: R.canvas.toDataURL('image/jpeg', 0.9) });
    }
    return { results: out };
  };
})();
