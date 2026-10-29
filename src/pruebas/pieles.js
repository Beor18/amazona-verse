/* AVE · AV.pielesTest: pieles de especie (src/personaje/pieles.js)
   Las 22 cargan (1024², sRGB, flipY falso) y se aplican a un personaje aparte (no el jugador): cuerpo, pico y plumón de cría
   con la piel y el tinte apagado; la piel fija sobrevive a applyLook; quitar() vuelve al mapa original; las especies sin
   piel conservan el tinte; solo se descarga la piel que un personaje pide, una vez.
   Devuelve { passed, total, results }. Se carga al pedir la prueba (boot.js), no en la descarga inicial del juego. */
window.AVPielesTest = function () {
  'use strict';
  const P = window.AVE.pieles;
  async function test() {
    const { PIELES, POR_PIEL, pedidas, mapaBase, cadaMaterial } = P._prueba;
    const { DIR, cargar, aplicar, quitar, listo, tiene } = P;
    const results = [], check = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const fin = () => ({ passed: results.filter(r => r.ok).length, total: results.length, results });
    const recursos = () => (performance.getEntriesByType ? performance.getEntriesByType('resource') : []).filter(e => e.name.indexOf(DIR) >= 0);
    // 1. Carga perezosa: lo bajado de pieles/ hasta ahora es solo lo que algún personaje pidió (crías, rivales de Retos, creador);
    //    la descarga inicial se mide aparte (test.sh lista sus archivos: ninguno de pieles/)
    const nombre = e => decodeURIComponent(e.name.split('/').pop().replace(/\.jpg.*$/, ''));
    const sueltas = recursos().filter(e => pedidas.indexOf(nombre(e)) < 0);
    check('Carga perezosa: solo se descarga la piel que un personaje pide', !sueltas.length, sueltas.map(nombre).join(',') || (pedidas.length + ' pedidas antes de la prueba: ' + pedidas.join(',')));
    // 2. Catálogo: 22 pieles; 21 enlazadas desde especies.js, sin especies inventadas
    if (!window.AV_ESPECIES && window.AVE.assets) { try { await AVE.assets.script('content/comun/especies.js'); } catch (e) { /* falla abajo */ } }
    const sp = window.AV_ESPECIES ? window.AV_ESPECIES.especies : [];
    const enlazadas = sp.filter(x => x.piel);
    check('Catálogo: 22 pieles distintas', PIELES.length === 22 && new Set(PIELES.map(p => p.piel)).size === 22, PIELES.length);
    check('especies.js: 21 especies con piel y cada piel existe', enlazadas.length === 21 && enlazadas.every(x => POR_PIEL[x.piel] && POR_PIEL[x.piel].especie === x.id), enlazadas.length);
    check('Vittata sigue sin piel (protagonista intacta)', !tiene('vittata'));
    // 3. Las 22 cargan
    const tex = await Promise.all(PIELES.map(p => cargar(p.piel)));
    const T = {}; PIELES.forEach((p, i) => { T[p.piel] = tex[i]; });
    const malas = PIELES.filter((p, i) => !(tex[i] && tex[i].image && tex[i].image.width === 1024 && tex[i].image.height === 1024 && tex[i].flipY === false && tex[i].encoding === THREE.sRGBEncoding));
    check('Las 22 pieles cargan (1024², sRGB, flipY falso)', !malas.length, malas.map(p => p.piel).join(','));
    if (!window.AVCharacter) { check('Hay personaje para probar', false, 'sin AVCharacter'); return fin(); }
    // 4. Un personaje real aparte (no el jugador)
    const ch = await window.AVCharacter.create();
    try {
      ch.applyLook({ species: 'vittata', accessories: {} });
      const base = mapaBase(ch), on = ch.tint && ch.tint.tintOn.value;
      check('El personaje tiene mapa de color y tinte por máscaras', !!base && !!on);
      if (!base || !on) return fin();
      // plumón de cría: una malla extra que comparte el mapa del cuerpo (como crearPlumon en criadero.js)
      let body = null; ch.root.traverse(x => { if (x.isSkinnedMesh && !x.userData.isAccessory && !body) body = x; });
      const plumon = new THREE.SkinnedMesh(body.geometry, new THREE.MeshStandardMaterial({ map: base }));
      plumon.bind(body.skeleton, body.bindMatrix); body.parent.add(plumon);
      const cuerpo = () => { const m = []; cadaMaterial(ch, x => { if (x.map === base || x.userData.pielDe === ch.root.uuid) m.push(x.map); }); return m; };
      const n0 = cuerpo().length;
      const fallos = [];
      for (const p of PIELES) {
        const ok = await aplicar(ch, p.especie || p.piel), m = cuerpo();
        if (!ok || m.length !== n0 || !m.every(x => x === T[p.piel]) || on.length() !== 0) fallos.push(p.piel);
      }
      check('Las 22 se aplican (cuerpo, pico y plumón con la piel; tinte apagado)', !fallos.length && n0 >= 2, fallos.join(',') || n0 + ' materiales');
      await aplicar(ch, 'oratrix');
      ch.applyLook({ species: 'vittata', accessories: { neck: { id: 'panuelo', color: '#f2a03d' } } }); await listo(ch);
      check('La piel fija sobrevive a applyLook (crías y rivales con ropa)', cuerpo().every(x => x === T.oratrix) && on.length() === 0);
      quitar(ch); await listo(ch);
      check('quitar() vuelve al mapa original', cuerpo().every(x => x === base));
      ch.applyLook({ species: 'agilis', accessories: {} }); await listo(ch);
      check('Especie sin piel (agilis): queda el tinte de hoy', cuerpo().every(x => x === base) && on.x === 1 && on.z === 1, [on.x, on.y, on.z].join(','));
      ch.applyLook({ species: 'amazonica', accessories: {} }); await listo(ch);
      check('Look con especie con piel (amazonica): usa la piel', cuerpo().every(x => x === T.amazonica) && on.length() === 0);
      ch.applyLook({ species: 'vittata', accessories: {} }); await listo(ch);
      check('Volver a vittata devuelve su textura', cuerpo().every(x => x === base) && on.length() === 0);
      body.parent.remove(plumon); plumon.material.dispose();
    } finally {
      if (window.AVCharacter.disposeObject) window.AVCharacter.disposeObject(ch.root);
    }
    // 5. Peso: cada piel se pidió una sola vez (caché compartida) y lo bajado sigue siendo solo lo pedido
    const kb = recursos().reduce((s, e) => s + (e.encodedBodySize || e.transferSize || 0), 0) / 1024;
    check('Cada piel se descarga una vez y solo al usarla', pedidas.length === 22 && new Set(pedidas).size === 22 && recursos().every(e => pedidas.indexOf(nombre(e)) >= 0), pedidas.length + ' pedidas' + (kb ? ', ' + Math.round(kb) + ' KB' : ''));
    return fin();
  }
  return { test };
};
