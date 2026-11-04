/* QA · W17 / CG-66 · la temporada entera en móvil, con el pulgar (AV.temporadaMovilTest) · no toca el juego, solo lo juega
   Un jugador nuevo hace los 6 capítulos seguidos en un móvil (390×844, toques), con el mismo almacenamiento de principio a fin:
   cada capítulo se juega con AV.epCaminar (tests/qa/ep_caminar.js) en modo { tacto, movil, nativo, pulgar, temporada }: el
   joystick y los botones salen solos porque el navegador es táctil, el pulgar baja sobre el palo y arrastra hacia donde quiere ir
   según la cámara (sin girar la cámara a mano), Volar/Saltar/Bucear/Acción y los botones de las tarjetas se tocan, y cada botón
   tocado se mira (en pantalla, ≥ 40 px, sin nada encima). Sin teleport y sin escribir el paso.
   Entre capítulos: el capítulo queda guardado sin forzar el guardado (está en `<almacen>.save` con complete) y apuntado en la
   temporada (`amazonaverse.temporada`), se RECARGA el iframe y la partida sigue terminada; con el pulgar se pasa al siguiente
   («Siguiente capítulo» del panel final o, si al volver sale la portada, «Capítulos» → el capítulo siguiente) y el iframe lo abre. Atajo dicho: ese capítulo se juega luego en un iframe nuevo del
   mismo origen (igual que la navegación, pero con el iframe que prepara epCaminar). Los caps. 3 a 6 usan su recorrido
   (tests/qa/ep3_e2e.js … ep6_e2e.js, mismas tarjetas y comprobaciones); el 1 y el 2 siguen solo la flecha.
   Cómo se corre (navegador móvil de verdad: Playwright con viewport 390×844, hasTouch, isMobile, deviceScaleFactor 2):
     inyectar ep_caminar.js, ep3_e2e.js, ep4_e2e.js, ep5_e2e.js, ep6_e2e.js y este archivo, y await AV.temporadaMovilTest(opts).
     Todo seguido: AV_SWIFTSHADER=1 node tests/qa/temporada_movil_correr.js http://127.0.0.1:<puerto>/ [--log]
       (los 6, ~15 min con SwiftShader en la nube, 4-nov: cap. 1 ~5 min, caps. 2 a 6 ~7 min; --log saca la traza de epCaminar)
     Por capítulo, encadenados: node tests/qa/temporada_movil_correr.js <url> --caps 1 --perfil /tmp/perfil-av   y luego
     --caps 2 --seguir --perfil /tmp/perfil-av, etc. (--perfil guarda el almacenamiento entre corridas; --seguir no lo limpia).
   opts: { caps: [1..6], idioma: 'es', seguir: false (true: no limpia ni devuelve el almacenamiento, sigue la temporada que haya),
   timeout: ms de arranque de cada capítulo }. Sin seguir, el almacenamiento se respalda entero, se limpia lo del juego
   (jugador nuevo) y se devuelve igual al final. Salida: { passed, total, results }. */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 100); }
    return null;
  }
  const JUEGO = /^(amazonaverse|ep[2-6]|aula)/; // lo que guarda el juego (partidas, temporada, criadero, aula, menú)
  const PACK = n => (n === 1 ? 'cap1' : 'ep' + n);
  const ALMACEN = n => (n === 1 ? 'amazonaverse' : 'ep' + n);
  const TEMP = 'amazonaverse.temporada';
  const leerJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const log = (...a) => console.info('[W17] ' + a.join(' '));
  // Caps. 1 y 2 no tienen recorrido propio en epCaminar: lo que haría un niño que lee el objetivo
  const CFG = {
    // Cap. 1: «Despega, vuela hasta Iguaca y pósate a su lado» en la copa: se llega volando y posándose encima,
    // y lo mismo con las perchas de las capas del bosque («Pósate y observa»): la guía da su altura (y) sobre el suelo
    1: { pack: 'cap1', n: 1, maxIter: 160, volar: G => {
      if (G.S.step === 0 && G.c && G.c.luma && G.c.luma.arriba()) return true;
      const g = G.misiones.guideTarget();
      return !!g && g.y != null && g.y - G.terreno.height(g.x, g.z) > 1.5;
    },
    // el vapor y la gota de «La ruta de la gota» se mueven: se siguen en vuelo
    seguir: G => { const E = G.c && G.c.edu && G.c.edu.estado && G.c.edu.estado(); return !!E && (E.voluta || (!!E.gota && !E.gota.parada)); } },
    // Cap. 2: las tarjetas como en tests/qa/ep2_e2e.js (se equivoca una vez donde un niño suele equivocarse)
    2: { pack: 'ep2', n: 2, maxIter: 260, politica(ops, line, ctx) {
      const G = ctx.G, txt = (line && line.text) || '', idx = f => ops.findIndex(f);
      if (!G.__w17Say) { // la falla que marcó la tormenta se lee del texto original
        G.__w17Say = true; const say0 = G.dialogo.say;
        G.dialogo.say = function (ls) { for (const l of ls || []) if (l && /Algo cede/.test(l.text)) G.__w17Falla = l.text; return say0.apply(this, arguments); };
      }
      if (ops.some(o => o.p)) { const c = idx(o => !o.p.tarjeta); if (c >= 0 && ctx.fallaUnaVez('cerrada')) return c; const ab = idx(o => o.p.tarjeta); return ab >= 0 ? ab : 0; }
      if (ops.some(o => o.v === 'criterio')) { const bien = /^Iguaca te da/.test(txt) ? 'restriccion' : 'criterio'; return idx(o => o.v === (ctx.fallaUnaVez('mesa') ? (bien === 'criterio' ? 'restriccion' : 'criterio') : bien)); }
      if (ops.some(o => o.v === 'abuela')) return ctx.fallaUnaVez('choque') ? idx(o => o.v === 'abuela') : idx(o => o.v === 0);
      if (ops.some(o => o.k === 'ancha')) return idx(o => o.k === 'ancha');
      if (ops.some(o => o.ok !== undefined)) { const ok = !ctx.fallaUnaVez('nido'); return idx(o => o.ok === ok); }
      if (ops.some(o => o.k === 'anclaje' && /^Amarrar/.test(o.label))) {
        const f = G.__w17Falla || '', pista = /amarras/i.test(f) ? 'anclaje' : /base|charco/i.test(f) ? 'base' : /pared|juntas|trenzado/i.test(f) ? 'paredes' : 'techo';
        return Math.max(0, idx(o => o.k === pista));
      }
      const DEC = ['pilotes', 'tablas', 'dos', 'no'];
      if (ops.some(o => DEC.includes(o.v) || o.v === 'si')) { const v = DEC.find(x => ops.some(o => o.v === x)); return Math.max(0, idx(o => o.v === v)); }
      return null;
    } },
  };

  window.AV = window.AV || {};
  window.AV.temporadaMovilTest = async function (opts) {
    opts = opts || {};
    const caps = opts.caps || [1, 2, 3, 4, 5, 6], idioma = opts.idioma || 'es';
    const out = [], check = (name, ok, extra) => out.push({ name, ok: ok === true, extra: extra == null ? '' : String(extra).slice(0, 600) });
    const respaldo = {};
    if (!opts.seguir) {
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
      try { for (const k of Object.keys(respaldo)) if (JUEGO.test(k)) localStorage.removeItem(k); } catch (e) { /* */ }
    }
    const coarse = matchMedia('(pointer: coarse)').matches;
    check('Navegador móvil táctil (pointer: coarse, ' + innerWidth + '×' + innerHeight + ', DPR ' + devicePixelRatio + ')', coarse && innerWidth <= 430, 'coarse ' + coarse + ' · toques ' + navigator.maxTouchPoints);
    const o = { idioma, tacto: true, movil: true, playtest: true, temporada: true, nativo: coarse, pulgar: true, keep: true, timeout: opts.timeout || 300000 };
    try {
      for (const n of caps) {
        const pre = 'Cap. ' + n + ' · ';
        const previos = caps.filter(c => c < n);
        const T0 = leerJSON(TEMP) || { terminados: {} };
        if (previos.length) check(pre + 'al empezar, la temporada tiene terminados los anteriores (' + previos.join(', ') + ')', previos.every(c => (T0.terminados || {})[c]), JSON.stringify(T0.terminados));
        const t0 = performance.now();
        log('▶ capítulo', n);
        let r = null;
        try {
          const f = n >= 3 && window.AV['ep' + n + 'e2eTest'];
          if (n >= 3 && !f) { check(pre + 'su recorrido está cargado (ep' + n + '_e2e.js)', false, 'falta AV.ep' + n + 'e2eTest'); continue; }
          r = f ? await f(o) : await window.AV.epCaminar(CFG[n], o);
        } catch (e) { check(pre + 'se juega sin excepción', false, e && (e.stack || e.message)); }
        const res = (r && r.results) || [];
        for (const x of res) out.push({ name: pre + x.name, ok: x.ok, extra: x.extra });
        log('■ capítulo', n, (r ? r.passed + '/' + r.total : 'sin resultado'), Math.round((performance.now() - t0) / 1000) + ' s');
        // ---------- guardado, temporada y recarga ----------
        const frs = [...document.querySelectorAll('iframe')];
        const fr = frs.find(x => { try { return x.contentWindow && x.contentWindow.AV && x.contentWindow.AV.pack === PACK(n); } catch (e) { return false; } });
        if (!fr) { check(pre + 'el iframe del capítulo sigue abierto para recargarlo', false, frs.length + ' iframes'); continue; }
        const W0 = fr.contentWindow, completo = !!(W0.AV.G.S.complete);
        if (window.AV_E2E_LOG) { const g = W0.AV.G; log('diag', JSON.stringify({ fin: !W0.document.getElementById('end').hidden, explorando: g.S.explorando, abierta: g.dialogo.open(), libre: !!g.dialogo.libre(), carta: g.ui.cardOpen, eventos: (g.S.events || []).slice(-6).map(e => e.type || e.t || e) })); }
        await sleep(400);
        const sv = leerJSON(ALMACEN(n) + '.save');
        check(pre + 'la partida queda guardada sola, terminada (' + ALMACEN(n) + '.save)', !!sv && sv.complete === true && !!(sv.profile && sv.profile.created), sv ? 'complete ' + sv.complete + ' paso ' + sv.step : 'sin guardado');
        const T1 = leerJSON(TEMP) || { terminados: {}, decisiones: {} };
        check(pre + 'la temporada apunta el capítulo como terminado', !!(T1.terminados || {})[n], JSON.stringify(T1.terminados));
        const dec = (T1.decisiones || {})[n] || {};
        if (n === 2) check(pre + 'la temporada guarda el sitio elegido', !!dec.sitio, JSON.stringify(dec));
        if (n === 3) check(pre + 'la temporada guarda el nombre de la canoa', !!dec.canoa, JSON.stringify(dec));
        if (n === 4) check(pre + 'la temporada guarda la opción de la asamblea', !!dec.opcion, JSON.stringify(dec));
        W0.__w17viejo = true; // el WindowProxy del iframe es el mismo objeto tras recargar: la página vieja se marca
        W0.location.reload();
        const W = await until(() => { const x = fr.contentWindow; return x && !x.__w17viejo && x.AV && x.AV.pack === PACK(n) && x.AV.G && x.AV.G.actores && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x; }, o.timeout, 150);
        if (!W) { check(pre + 'recarga', false, 'no volvió a arrancar'); fr.remove(); continue; }
        await sleep(1200);
        const G = W.AV.G, S = G.S, $ = id => W.document.getElementById(id);
        const ms = (G.pack.misiones || []).map(m => m.id);
        check(pre + 'tras recargar, la partida sigue terminada (perfil, final y misiones)', completo && S.complete && S.profile.created && ms.every(m => S.missions[m]), 'complete ' + S.complete + ' · perfil ' + S.profile.created + ' · ' + JSON.stringify(S.missions));
        if (n < 6) {
          // Al volver a entrar, el jugador sigue con «Siguiente capítulo» del panel final o, si sale la portada, con «Capítulos»
          const tocable = el => {
            if (!el || el.hidden || !el.getClientRects().length) return 'no se ve';
            const rc = el.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2, enc = W.document.elementFromPoint(cx, cy);
            if (cx < 0 || cy < 0 || cx > W.innerWidth || cy > W.innerHeight) return 'fuera de la pantalla';
            if (Math.min(rc.width, rc.height) < 40) return 'pequeño ' + Math.round(rc.width) + '×' + Math.round(rc.height);
            if (!enc || (enc !== el && !el.contains(enc))) return 'tapado por ' + (enc && (enc.id || enc.className || enc.tagName));
            return null;
          };
          let boton = null, via = '', extra = '';
          const bs = $('b-siguiente'), t = $('title');
          if (!(t && t.open) && $('end') && !$('end').hidden && bs && !bs.hidden) { boton = bs; via = 'panel final'; }
          else if (t && t.open && $('b-capitulos-title')) { // al volver a entrar sale la portada, encima de todo
            const bc = $('b-capitulos-title');
            if (bc) bc.scrollIntoView({ block: 'center' }); // la portada se desliza con el dedo
            await sleep(200);
            const mal = tocable(bc);
            if (mal) extra = '«Capítulos» de la portada ' + mal;
            else {
              bc.click(); await sleep(500);
              const li = W.document.querySelector('#capitulos-lista .cap-item[data-cap="' + n + '"]');
              check(pre + 'en «Capítulos» sale como terminado', !!li && li.dataset.estado === 'terminado', li ? li.dataset.estado : 'sin fila');
              const sig = W.document.querySelector('#capitulos-lista .cap-item[data-cap="' + (n + 1) + '"] .cap-jugar');
              if (sig) sig.scrollIntoView({ block: 'center' }); // la lista se desliza con el dedo
              await sleep(200);
              boton = sig; via = 'Capítulos';
            }
          } else extra = 'ni panel final ni portada al recargar';
          let ok = false;
          if (boton) {
            const mal = tocable(boton);
            extra = via + (mal ? ': ' + mal : '');
            if (!mal) {
              W.__w17viejo = true; boton.click();
              const W2 = await until(() => { const x = fr.contentWindow; return x && !x.__w17viejo && x.AV && x.AV.pack && x; }, 120000, 200);
              ok = !!W2 && W2.AV.pack === PACK(n + 1); extra += ' → ' + (W2 ? W2.AV.pack : 'no navegó');
            }
          }
          check(pre + 'tras recargar, se pasa al capítulo ' + (n + 1) + ' con el pulgar', ok, extra);
        }
        const errs = (fr.contentWindow && fr.contentWindow.__aveErrores) || [];
        check(pre + 'sin errores de JavaScript tras recargar', !errs.length, errs.slice(0, 3).join(' | '));
        try { const g = fr.contentWindow.AV.G; g.renderer.renderer.dispose(); g.renderer.renderer.forceContextLoss(); } catch (e) { /* ya cerrado */ }
        fr.remove();
      }
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e)); }
    finally {
      for (const f of document.querySelectorAll('iframe')) { try { if (f.contentWindow && f.contentWindow.AV) f.remove(); } catch (e) { /* otro origen */ } }
      if (!opts.seguir) try {
        for (const k of Object.keys(localStorage)) if (!(k in respaldo)) localStorage.removeItem(k);
        for (const k of Object.keys(respaldo)) if (localStorage.getItem(k) !== respaldo[k]) localStorage.setItem(k, respaldo[k]);
      } catch (e) { /* sin almacenamiento */ }
    }
    return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
  };
})();
