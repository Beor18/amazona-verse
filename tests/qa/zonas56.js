/* QA · mundo único de los caps. 5 y 6 (AV.zonas56Test) · no toca el juego, solo lo abre
   Abre ?pack=ep5 y ?pack=ep6 en iframes, con el interruptor tal como viene en el pack (apagado: mundo pequeño, sin zonas) y
   con ?mapa=real (encendido: el mapa real del cap. 1 y las zonas de src/game/zonas.js), y en cada uno corre AV.zonasTest().
   Comprueba además que el capítulo queda en su sitio del mapa: el punto de aparición, los personajes y los hallazgos del
   Diario dentro de la zona del capítulo, y el cap. 5 de noche. El almacenamiento se respalda entero y se devuelve igual.
   Carga: inyectar y await AV.zonas56Test(). Opciones: { timeout: ms de arranque (defecto 240000) }. */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 100); }
    return null;
  }
  // BM127: S.hora = 21 no basta; lo que se ve lo deciden la luz y el cielo vivos del renderer (look «noche» + solPos del pack)
  function nocheViva(W) {
    const R = W.AV.G.renderer, sk = R.sky && R.sky.material.uniforms, c = sk && sk.uCenit.value, lum = c ? 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b : NaN;
    const sol = R.sun.intensity, alto = R.sunDir ? R.sunDir.y : NaN, fria = R.sun.color.b >= R.sun.color.r;
    const ok = sol <= 1.25 && alto <= 0.45 && fria && lum < 0.03 && R.renderer.toneMappingExposure <= 0.78;
    // v2 (Kelvin: orientarse de noche): faroles en los sitios, cucubanos en los caminos y estrellas, en 3 llamadas y sin luces reales
    const L = W.AV.G.c.ep5noche, luces = []; R.scene.traverse(o => { if (o.isLight) luces.push(o); });
    const faroles = !!L && L.faroles >= 10 && L.cucubanos >= 20 && L.estrellas >= 1000 && L.llamadas === 3 && !!R.scene.getObjectByName('ep5-noche-luces') && !!R.scene.getObjectByName('ep5-noche-estrellas') && luces.length <= 3;
    return { ok, faroles, txtF: L ? L.faroles + ' faroles · ' + L.cucubanos + ' cucubanos · ' + L.estrellas + ' estrellas · ' + luces.length + ' luces reales' : 'sin luces de noche', txt: 'sol ' + sol.toFixed(2) + ' a y=' + (+alto).toFixed(2) + (fria ? ' fría' : ' cálida') + ' · cenit lum ' + (+lum).toFixed(3) + ' · exposición ' + R.renderer.toneMappingExposure };
  }
  window.AV = window.AV || {};
  window.AV.zonas56Test = async function (opts) {
    opts = opts || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: ok === true, extra: extra == null ? '' : String(extra).slice(0, 400) });
    const respaldo = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
    let fr = null;
    const abrir = async (pack, real) => {
      if (fr) fr.remove();
      fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
      fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
      const url = new URL(location.href); url.search = '?pack=' + pack + (real ? '&mapa=real' : '&mapa=pequeno') + ((/[?&]v18=([01])\b/.exec(location.search) || [])[1] ? '&v18=' + /[?&]v18=([01])\b/.exec(location.search)[1] : ''); url.hash = ''; fr.src = url.href; document.body.appendChild(fr);
      const W = await until(() => { const x = fr.contentWindow; return x && x.AV && x.AV.pack === pack && x.AV.G && x.AV.G.actores && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x.AV.zonasTest && x; }, opts.timeout || 240000);
      if (W) await sleep(800);
      return W;
    };
    try {
      for (const pack of ['ep5', 'ep6']) {
        const cap = pack === 'ep5' ? 5 : 6;
        // Interruptor tal como viene (apagado): mundo pequeño, sin zonas
        let W = await abrir(pack, false);
        if (!W) { check(pack + ' arranca con el interruptor apagado', false, 'no arrancó'); continue; }
        let G = W.AV.G, r;
        // Con tests/qa/mapa_real.js cargado todos los iframes llevan ?mapa=real: la mitad «apagada» no se puede comprobar aquí
        if (!window.AV.mapaRealForzado) {
          check(`Cap. ${cap} · apagado: mundo pequeño de siempre (sin el mapa real) y zonas inactivas`, !G.terreno.mapa && !G.zonas.activa, 'mapa ' + !!G.terreno.mapa);
          if (cap === 5) { const n = nocheViva(W); check('Cap. 5 · apagado: la luz y el cielo vivos son de noche (BM127)', n.ok, n.txt); check('Cap. 5 · apagado: faroles y cucubanos guían de noche', n.faroles, n.txtF); }
          r = await W.AV.zonasTest();
          check(`Cap. ${cap} · apagado: AV.zonasTest ${r.passed}/${r.total}`, r.total > 0 && r.passed === r.total, r.results.filter(x => !x.ok).map(x => x.name + ' ' + x.extra).join(' | '));
        }
        // Encendido con ?mapa=real: mapa real, zonas activas, el capítulo en su sitio
        W = await abrir(pack, true);
        if (!W) { check(pack + ' arranca con ?mapa=real', false, 'no arrancó'); continue; }
        G = W.AV.G;
        const Z = G.zonas, ZC = Z.ZONAS[cap], dentro = (x, z) => [[ZC.x, ZC.z, ZC.r]].concat(ZC.mas || []).some(c => Math.hypot(x - c[0], z - c[1]) <= c[2]);
        check(`Cap. ${cap} · ?mapa=real: el mapa real del cap. 1 y las zonas activas`, !!G.terreno.mapa && Z.activa && G.pack.mundo.mapa === W.AVE.mundoReal.mapa);
        const sitios = [['aparición', G.pack.jugador.aparicion]].concat(G.actores && G.pack.npcs ? G.pack.npcs.map(n => ['npc ' + n.id, n]) : [], G.diario.entries.map(e => ['diario ' + e.id, e]), G.interaccion.list.map(i => ['interacción ' + i.id, i]));
        const fuera = sitios.filter(([, p]) => !dentro(p.x, p.z)).map(([n, p]) => n + ' (' + p.x.toFixed(1) + ', ' + p.z.toFixed(1) + ')');
        check(`Cap. ${cap} · aparición, personajes, hallazgos e interacciones dentro de su zona (${sitios.length})`, !fuera.length, fuera.join(' | '));
        // Lo único que va sobre el agua es lo del puente (la percha de la señal y donde se coloca la tabla larga)
        const bajo = sitios.filter(([n, p]) => { if (/percha_v|colocar/.test(n)) return false; const y = G.terreno.height(p.x, p.z), w = G.agua && G.agua.levelAt ? G.agua.levelAt(p.x, p.z) : -Infinity; return !(isFinite(y) && y > 5) || (isFinite(w) && w > y - 0.3); })
          .map(([n, p]) => n + ' (' + p.x.toFixed(1) + ', ' + p.z.toFixed(1) + ')');
        check(`Cap. ${cap} · nada queda bajo el agua ni fuera del suelo de la isla`, !bajo.length, bajo.join(' | '));
        if (cap === 5) {
          check('Cap. 5 · ?mapa=real: de noche (permiso «noche» del look y S.hora de noche)', G.pack.mundo.cielo.permiso === 'noche' && G.S.hora >= 19, 'hora ' + G.S.hora);
          const n = nocheViva(W);
          check('Cap. 5 · ?mapa=real: la luz y el cielo vivos son de noche (luna baja, fría y suave; cielo oscuro), no solo S.hora (BM127)', n.ok, n.txt);
          check('Cap. 5 · ?mapa=real: faroles en el taller, la cadena, las ruinas y el Guardián, y cucubanos en los caminos, y cielo estrellado', n.faroles, n.txtF);
        }
        r = await W.AV.zonasTest();
        check(`Cap. ${cap} · ?mapa=real: AV.zonasTest ${r.passed}/${r.total}`, r.total >= 7 && r.passed === r.total, r.results.filter(x => !x.ok).map(x => x.name + ' ' + x.extra).join(' | '));
        check(`Cap. ${cap} · sin errores de consola`, !((W.__aveErrores) || []).length, ((W.__aveErrores) || []).slice(0, 3).join(' | '));
      }
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e)); }
    finally {
      if (fr) fr.remove();
      try {
        for (const k of Object.keys(localStorage)) if (!(k in respaldo)) localStorage.removeItem(k);
        for (const k of Object.keys(respaldo)) if (localStorage.getItem(k) !== respaldo[k]) localStorage.setItem(k, respaldo[k]);
      } catch (e) { /* sin almacenamiento */ }
    }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  };
})();
