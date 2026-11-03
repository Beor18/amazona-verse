/* QA · BM85 · la temporada de verdad, entre capítulos (AV.temporadaE2eTest) · no toca el juego, solo lo juega
   En UNA sesión de navegador (mismo almacenamiento) abre ?pack=ep2 → ep3 → ep4 → ep5 → ep6 en iframes seguidos y comprueba que lo
   elegido en un capítulo se nombra en el siguiente: casa de ep2 (sitio) en ep3; canoa de ep3 en ep4; puente/muelles/… de ep4 en ep5;
   guardianes encontrados (ep3, ep4, ep5) en ep6. Cada capítulo se juega con sus interacciones reales (useAt + diálogos + tarjetas);
   el paso se fuerza solo donde se dice (atajo: S.step) y se RECARGA el iframe a mitad de ep3 y de ep4 para comprobar que la partida
   y la temporada siguen. El almacenamiento se respalda entero y se devuelve igual. Carga: inyectar y await AV.temporadaE2eTest().
   Opciones: { sitio: 'a'|'b'|'c' (defecto 'b'), timeout: ms de arranque (defecto 300000) }. */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 80); }
    return null;
  }
  window.AV = window.AV || {};
  window.AV.temporadaE2eTest = async function (opts) {
    opts = opts || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: ok === true, extra: extra == null ? '' : String(extra).slice(0, 400) });
    const sitio = opts.sitio || 'b';
    const respaldo = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
    try { for (const k of Object.keys(respaldo)) if (/^ep[2-6]|temporada/.test(k)) localStorage.removeItem(k); } catch (e) { /* */ }
    let fr = null;
    const abrir = async pack => {
      if (fr) fr.remove();
      fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
      fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
      const url = new URL(location.href); url.search = '?pack=' + pack; url.hash = ''; fr.src = url.href; document.body.appendChild(fr);
      return recargado(pack);
    };
    const recargado = async pack => {
      const W = await until(() => { const x = fr.contentWindow; return x && x.AV && x.AV.pack === pack && x.AV.G && x.AV.G.actores && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x.AVTemporada && x; }, opts.timeout || 300000, 100);
      if (W) await sleep(600);
      return W;
    };
    const recargar = async (W, pack) => { W.AV.G.guardado.save(true); const w0 = W; fr.contentWindow.location.reload(); await until(() => fr.contentWindow !== w0 || !w0.AV || !w0.AV.G, 5000, 50); return recargado(pack); };
    // Un capítulo: devuelve las herramientas para jugarlo
    const kit = W => {
      const G = W.AV.G, S = G.S, T = G.pruebas, doc = W.document;
      return { G, S, TP: W.AVTemporada, useAt: T.useAt, drain: T.drain,
        pick: txt => { const b = [...doc.querySelectorAll('[id^="ch-"]')].find(x => x.textContent.includes(txt)); if (b) b.click(); T.drain(); return !!b; },
        click: id => { const b = doc.getElementById(id); if (b) b.click(); T.drain(); return !!b; },
        cards: () => [...doc.querySelectorAll('[id^="ch-"]')].map(b => b.textContent) };
    };
    const texto = ls => (ls || []).map(l => l.text || '').join(' ');
    // BM122 · Mundo único: el capítulo se juega en el mapa real, con su zona y las de los capítulos terminados abiertas
    // (src/game/zonas.js), y todo lo que el jugador tiene que usar o encontrar (lo visible, el Diario y los personajes) cae
    // dentro de lo abierto: si algo quedara fuera, el viento no dejaría llegar.
    const mundo = (k, n, previos) => {
      const Z = k.G.zonas, TP = k.TP, KEY = TP.KEY;
      check('Ep. ' + n + ' · se juega en el mapa real, con sus zonas', !!k.G.terreno.mapa && !!Z && Z.activa, 'mapa ' + !!k.G.terreno.mapa + ' zonas ' + !!(Z && Z.activa));
      if (!Z || !Z.activa) return;
      try { const d = TP.leer(); for (const p of previos) d.terminados[p] = d.terminados[p] || Date.now(); localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* sin almacenamiento */ }
      const ab = Z.abiertas();
      check('Ep. ' + n + ' · abiertas: la suya y las de los capítulos terminados (' + (previos.join(', ') || 'ninguno') + ')', ab.includes(n) && previos.every(p => ab.includes(p)), ab.join());
      const pts = k.G.interaccion.list.filter(it => it && typeof it.x === 'number' && (!it.visible || it.visible())).map(it => ['acción ' + it.id, it.x, it.z])
        .concat((k.G.diario.entries || []).map(e => ['Diario ' + e.id, e.x, e.z]), (k.G.pack.npcs || []).map(c => ['personaje ' + c.id, c.x, c.z]));
      const fuera = pts.filter(([, x, z]) => !Z.dentro(x, z)).map(([id, x, z]) => id + '@' + Math.round(x) + ',' + Math.round(z));
      check('Ep. ' + n + ' · lo visible, el Diario y los personajes caen dentro de lo abierto', !fuera.length, fuera.join(' ') || pts.length + ' puntos');
    };
    try {
      // ---------- ep. 2 · elige el sitio (se recarga entre lecturas y elección) ----------
      let W = await abrir('ep2'); if (!W) { check('Ep. 2 arranca', false, 'no arrancó'); throw new Error('ep2'); }
      let k = kit(W); k.G.quiet = true; k.G.guardado.reset(true);
      mundo(k, 2, []);
      check('Ep. 2 · crea el personaje', k.G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' }) === null);
      k.useAt('iguaca'); k.drain(); k.useAt('sitio_a'); k.drain(); k.useAt('sitio_b'); k.drain(); k.useAt('sitio_c'); k.drain();
      check('Ep. 2 · lee los 3 sitios', ['lee_a', 'lee_b', 'lee_c'].every(x => k.S.collected.includes(x)), k.S.collected.join());
      W = await recargar(W, 'ep2'); k = kit(W); k.G.quiet = true;
      check('Ep. 2 · recargar a mitad: siguen las 3 lecturas', ['lee_a', 'lee_b', 'lee_c'].every(x => k.S.collected.includes(x)) && k.S.step === 1, k.S.step + ' ' + k.S.collected.join());
      k.useAt('sitio_' + sitio); k.drain(); k.useAt('iguaca'); k.drain(); // la elección se apunta al cerrarla con Iguaca
      check('Ep. 2 · elige el sitio y queda en la temporada', k.TP.dato(2, 'sitio') === sitio && k.S.step === 3, JSON.stringify(k.TP.decision(2)) + ' paso ' + k.S.step);

      // ---------- ep. 3 · nombra la casa elegida; navega; bautiza la canoa ----------
      W = await abrir('ep3'); if (!W) { check('Ep. 3 arranca', false, 'no arrancó'); throw new Error('ep3'); }
      k = kit(W); k.G.quiet = true; k.G.guardado.reset(true); k.G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
      mundo(k, 3, [2]);
      const cont3 = texto(k.G.pack.continuidad());
      check('Ep. 3 · nombra la casa elegida en el ep. 2 (sitio ' + sitio + ')', cont3.length > 20, cont3);
      const otros = ['a', 'b', 'c'].filter(x => x !== sitio).map(x => { k.TP.apuntar(2, { sitio: x }); return texto(k.G.pack.continuidad()); });
      k.TP.apuntar(2, { sitio });
      check('Ep. 3 · cada sitio da una casa distinta', otros.every(t => t && t !== cont3) && texto(k.G.pack.continuidad()) === cont3, otros.join(' | '));
      k.S.step = 7; k.G.guardado.save(true); // atajo: el capítulo ya llegó al final de la canoa
      W = await recargar(W, 'ep3'); k = kit(W); k.G.quiet = true;
      check('Ep. 3 · recargar a mitad: sigue en el paso 7 y la temporada conserva el sitio', k.S.step === 7 && k.TP.dato(2, 'sitio') === sitio, 'paso ' + k.S.step);
      k.G.eventos.log('BoatLaunched'); k.useAt('navegante'); k.drain();
      check('Ep. 3 · conoce a quien navega y queda entre los guardianes', k.TP.guardianes().includes('navegante'), k.TP.guardianes().join());
      k.useAt('astillero'); k.drain();
      const nombres = k.cards();
      check('Ep. 3 · el astillero pregunta el nombre de la canoa', nombres.includes('Ceiba'), nombres.join());
      k.pick('Ceiba');
      check('Ep. 3 · la canoa se llama «Ceiba» (partida y temporada)', k.S.canoa === 'Ceiba' && k.TP.dato(3, 'canoa') === 'Ceiba', k.S.canoa + ' / ' + JSON.stringify(k.TP.decision(3)));
      W = await recargar(W, 'ep3'); k = kit(W);
      check('Ep. 3 · tras recargar, la canoa conserva el nombre', k.S.canoa === 'Ceiba' && k.TP.dato(3, 'canoa') === 'Ceiba', k.S.canoa);

      // ---------- ep. 4 · nombra la canoa; encuentra a los guardianes; decide ----------
      W = await abrir('ep4'); if (!W) { check('Ep. 4 arranca', false, 'no arrancó'); throw new Error('ep4'); }
      k = kit(W); k.G.quiet = true; k.G.guardado.reset(true); k.G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
      mundo(k, 4, [2, 3]);
      const cont4 = texto(k.G.pack.continuidad());
      check('Ep. 4 · nombra la canoa «Ceiba» del ep. 3', /Ceiba/.test(cont4), cont4);
      k.S.step = 1; k.useAt('bosque'); k.drain();
      check('Ep. 4 · mira el bosquecillo y lo apunta entre los guardianes', k.TP.guardianes().includes('bosquecillo'), k.TP.guardianes().join());
      k.G.guardado.save(true); W = await recargar(W, 'ep4'); k = kit(W); k.G.quiet = true;
      check('Ep. 4 · recargar a mitad: sigue lo observado y la temporada', k.S.collected.includes('obs_bosque') && k.TP.dato(3, 'canoa') === 'Ceiba', k.S.collected.join());
      k.S.step = 3; k.useAt('navegante'); k.drain();
      check('Ep. 4 · quien navega sigue entre los guardianes (sin repetirse)', k.TP.guardianes().filter(g => g === 'navegante').length === 1, k.TP.guardianes().join());
      k.S.step = 6; k.useAt('mesa'); k.drain();
      const op4 = k.cards();
      check('Ep. 4 · la asamblea ofrece las 3 opciones', op4.length === 3, op4.join(' | '));
      k.click('ch-0'); k.drain();
      const cu4 = k.cards();
      for (let i = 0; i < 3 && k.TP.dato(4, 'cuidado') == null; i++) { k.click('ch-' + i); k.drain(); } // un cuidado que no ayude a esa opción se rechaza y vuelve a preguntar
      const opcion = k.TP.dato(4, 'opcion'), cuidado = k.TP.dato(4, 'cuidado');
      check('Ep. 4 · decide la opción y el cuidado y quedan en la temporada', !!opcion && cuidado != null, JSON.stringify(k.TP.decision(4)) + ' / ' + cu4.join(' | '));

      // ---------- ep. 5 · nombra lo decidido en el ep. 4; el guardián ----------
      W = await abrir('ep5'); if (!W) { check('Ep. 5 arranca', false, 'no arrancó'); throw new Error('ep5'); }
      k = kit(W); k.G.quiet = true; k.G.guardado.reset(true); k.G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
      const cont5 = texto(k.G.pack.continuidad());
      check('Ep. 5 · nombra lo decidido en el ep. 4 (opción ' + opcion + ')', cont5.length > 20, cont5);
      k.S.step = 6; k.useAt('guardian'); k.drain();
      for (let i = 0; i < 6 && !k.TP.guardianes().includes('guardian'); i++) { if (!k.click('ch-0')) { k.drain(); } }
      check('Ep. 5 · el Guardián recuerda y queda entre los encontrados', k.TP.guardianes().includes('guardian'), k.TP.guardianes().join() + ' / ' + k.cards().join(' | '));

      // ---------- ep. 6 · llegan los guardianes encontrados ----------
      W = await abrir('ep6'); if (!W) { check('Ep. 6 arranca', false, 'no arrancó'); throw new Error('ep6'); }
      k = kit(W); k.G.quiet = true; k.G.guardado.reset(true); k.G.creador.saveCharacter({ name: 'Prueba', preset: 'agilis', outfit: 'azul', accessory: 'ninguno' });
      const ll = k.G.pack.llegan(), l6 = texto(k.G.pack.lineasInicio(k.G));
      check('Ep. 6 · llegan quien navega y el del bosquecillo', ll.join() === 'navegante,bosquecillo', ll.join());
      check('Ep. 6 · Iguaca los nombra al recibirlos', /remando/.test(l6) && /bosquecillo/.test(l6), l6.slice(0, 300));
      check('Ep. 6 · sin errores de consola de los capítulos', Array.from(document.querySelectorAll('iframe')).every(f => !((f.contentWindow && f.contentWindow.__aveErrores) || []).length));
    } catch (e) { if (!/^ep\d$/.test(String(e && e.message))) check('Sin excepciones', false, e && (e.stack || e)); }
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
