/* QA · regresión de los bugs de CG-3 y CG-4 (AV.cg34Test) · no toca el juego, solo lo mira
   Pruebas cortas y deterministas (sin jugar a pie: eso lo hacen ep3e2eTest…ep6e2eTest) para que cada bug quede cubierto:
   - QA-86 (cap. 5): en «Pon tres estaciones», tras poner la de la loma la guía apunta a otra altura sin estación.
   - QA-87 (caps. 3–6, EN): la línea de misiones del HUD («· …» / «✓ …») se traduce entera.
   - QA-88 (caps. 3 y 5, EN): «Acción: Subir a «Coquí» y cruzar la bahía» y «Acción: Poner estación en …» salen enteros en
     inglés; «Plaza de Villa Raíz» y «Estación de Conservación» tienen EN.
   - QA-89 (cap. 6, decisión de Kelvin): informativo; dice si la línea recta de la tabla larga a «Colocar» pasa bajo el agua.
   - QA-90/91/92 (móvil 375×812): el aviso no tapa los gestos, la caja de diálogo ni el panel final.
   - QA-93 (móvil): un aviso que salta con una tarjeta abierta espera a que se cierre y sale después.
   - QA-98 (propuesto, cap. 4): el secreto «Lo que se llevó el río» (fondo de la poza) no se da al aparecer en seco.
   Cada pack se arranca en un iframe (como idioma.maestroPack). Opciones: { packs: ['ep3', …] }. Carga: inyectar este archivo
   y await AV.cg34Test(). Devuelve { passed, total, results: [{ name, ok, extra }] }. */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const NO_ES = /\b(el|la|los|las|de|del|que|con|para|por|una|en|y|Subir|cruzar|Poner|estación|Probar|construir|mejorar|decidir|cuidar|Hablar|observar|presentar|Transmisor|Ruinas|Señal)\b/;

  // visible: el iframe va en pantalla (casi transparente y sin recibir toques) para que su bucle de cuadros no se frene;
  // fuera de pantalla Chrome pausa requestAnimationFrame y el aviso pendiente (QA-93) nunca saldría.
  async function abrir(query, w, h, visible) {
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = (visible ? 'position:fixed;left:0;top:0;opacity:0.01;pointer-events:none;z-index:2147483647;' : 'position:fixed;left:-10000px;top:0;') + 'width:' + (w || 900) + 'px;height:' + (h || 700) + 'px;border:0;';
    const u = new URL(location.href); u.search = query || ''; fr.src = u.href;
    document.body.appendChild(fr);
    const t0 = performance.now();
    while (performance.now() - t0 < 120000) {
      await sleep(250);
      try { const W = fr.contentWindow; if (W && W.AV && W.AV.G && W.AV.G.idioma && W.AV.G.ui && W.AV.G.misiones && W.AV.G.S) return { fr, W, G: W.AV.G }; } catch (e) { /* cargando */ }
    }
    fr.remove();
    return { fr: null, W: null, G: null };
  }
  async function ponerEn(G) {
    const antes = G.aula && G.aula.aj ? G.aula.aj.idioma : null;
    if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', 'en'); else G.idioma.poner('en');
    await G.idioma.listo; await sleep(200);
    return () => { try { if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', antes || 'es'); else G.idioma.poner('es'); } catch (e) { /* */ } };
  }
  const solape = (a, b) => {
    const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return Math.round(x * y);
  };

  async function cg34Test(o) {
    o = o || {};
    const R = [], ok = (name, c, extra) => R.push({ name, ok: !!c, extra: extra == null ? '' : String(extra) });
    const packs = o.packs || ['ep3', 'ep4', 'ep5', 'ep6'];

    // ---------- Caps. 3–6 (QA-86, QA-87, QA-88, QA-89)
    for (const id of packs) {
      const { fr, W, G } = await abrir('?pack=' + id, 900, 700, id === 'ep4');
      if (!G) { ok(id + ' · el pack arranca en un iframe', false, 'no arrancó en 120 s'); continue; }
      try {
        const volver = await ponerEn(G);
        const tr = s => G.idioma.tr(s);
        // QA-87: la línea de misiones del HUD, con su prefijo
        const huds = (G.pack.misiones || []).map(m => m.hud).filter(h => typeof h === 'string' && h.trim());
        const mal = [];
        for (const h of huds) for (const p of ['· ', '✓ ']) {
          const t = tr(p + h);
          if (!t.startsWith(p) || t === p + h || NO_ES.test(t.slice(p.length))) mal.push(p + h + ' → ' + t);
        }
        ok(id + ' · QA-87 · la línea de misiones del HUD sale en inglés (' + huds.length + ' misiones)', huds.length && !mal.length, mal.slice(0, 4).join(' | '));
        // QA-88: avisos de Acción
        if (id === 'ep3') {
          const t = tr('Acción: Subir a «Coquí» y cruzar la bahía');
          ok('ep3 · QA-88 · «Acción: Subir a «Coquí» y cruzar la bahía» sale entero en inglés', /^Action: /.test(t) && !NO_ES.test(t.replace(/^Action: /, '')), t);
          for (const s of ['Plaza de Villa Raíz', 'Estación de Conservación']) { const e = tr(s); ok('ep3 · QA-88 · «' + s + '» tiene EN', e !== s && !/Station de|Plaza de/.test(e), e); }
        }
        if (id === 'ep5') {
          const D = W.AV_EP5 || {}, est = D.estaciones || [];
          const mal5 = est.map(e => { const s = 'Acción: Poner estación en ' + e.nombre, t = tr(s); return (/^Action: /.test(t) && !/Poner estación| en the /.test(t)) ? null : s + ' → ' + t; }).filter(Boolean);
          ok('ep5 · QA-88 · «Acción: Poner estación en …» sale entero en inglés (' + est.length + ' alturas)', est.length && !mal5.length, mal5.slice(0, 3).join(' | '));
        }
        volver();
        // QA-86: la guía de «Pon tres estaciones» tras poner la loma
        if (id === 'ep5') {
          const S = G.S, pasos = (G.pack.historia && G.pack.historia.pasos) || [], st = pasos.find(p => p.id === 'estaciones');
          if (!st || !st.guia) ok('ep5 · QA-86 · existe el paso «estaciones» con guía', false);
          else {
            const antesC = S.collected.slice(), antesStep = S.step;
            try {
              S.step = pasos.indexOf(st);
              if (!S.collected.includes('est_loma')) S.collected.push('est_loma');
              const g = st.guia(G), loma = G.interaccion.find('loma');
              const sinEst = ['torre', 'mirador'].map(k => G.interaccion.find(k)).filter(Boolean);
              const apuntaLoma = g && loma && Math.hypot(g.x - loma.x, g.z - loma.z) < 0.5;
              const apuntaOtra = g && sinEst.some(p => Math.hypot(g.x - p.x, g.z - p.z) < 0.5);
              ok('ep5 · QA-86 · con la loma puesta, la guía va a una altura sin estación (torre o mirador)', !apuntaLoma && apuntaOtra,
                g ? 'guía en (' + g.x.toFixed(1) + ', ' + g.z.toFixed(1) + ')' + (apuntaLoma ? ' = la loma' : '') : 'sin guía');
            } finally { S.collected.length = 0; antesC.forEach(k => S.collected.push(k)); S.step = antesStep; }
          }
        }
        // Nuevo (QA-98 propuesto): en el cap. 4 el secreto «Lo que se llevó el río» (tipo fondo: bucear en la poza) no se da al aparecer
        if (id === 'ep4') {
          const S = G.S, sec = (G.pack.secretos || []).find(x => x.id === 'ep4_poza');
          await sleep(4000);
          const p = sec && sec.punto, d = p ? Math.hypot(S.pos.x - p.x, S.pos.z - p.z) : null;
          ok('ep4 · QA-98 · el secreto del fondo de la poza no se concede al aparecer, en seco', !(S.secretos || []).includes('ep4_poza'),
            'secretos: ' + JSON.stringify(S.secretos || []) + (d != null ? ' · Vittata a ' + d.toFixed(1) + ' m del punto (r ' + p.r + ')' : '') + (G.fisica.MOVE.swimming ? ' · nadando' : ' · en seco'));
        }
        // QA-89 (informativo, decisión de Kelvin): ¿la línea recta tabla → Colocar pasa bajo el agua?
        if (id === 'ep6') {
          const a = G.interaccion.find('tabla_larga'), b = G.interaccion.find('colocar'), h = G.terreno && G.terreno.height;
          const agua = (G.pack.mundo && G.pack.mundo.oceano && G.pack.mundo.oceano.y);
          if (a && b && typeof h === 'function') {
            let min = Infinity, at = null;
            for (let i = 0; i <= 40; i++) { const x = a.x + (b.x - a.x) * i / 40, z = a.z + (b.z - a.z) * i / 40, y = h(x, z); if (y < min) { min = y; at = [x, z]; } }
            R.push({ name: 'ep6 · QA-89 (informativo) · suelo más bajo en la recta tabla → Colocar', ok: true,
              extra: 'y=' + min.toFixed(2) + ' en (' + at[0].toFixed(1) + ', ' + at[1].toFixed(1) + ')' + (agua != null ? ' · océano y=' + agua : '') + ' · ¿llevarla volando vale? lo decide Kelvin' });
          }
        }
      } catch (e) { ok(id + ' · sin excepciones', false, String(e && e.stack || e).slice(0, 300)); }
      finally { if (fr) fr.remove(); }
    }

    // ---------- Móvil 375×812 (QA-90, QA-91, QA-92, QA-93) en el cap. 1
    const { fr, W, G } = await abrir('', 375, 812, true);
    if (!G) ok('móvil · el juego arranca en un iframe de 375×812', false, 'no arrancó en 120 s');
    else {
      try {
        const d = W.document, $ = x => d.getElementById(x), rect = x => $(x).getBoundingClientRect();
        const cerrarTodo = () => { for (const x of ['emotes', 'end']) if ($(x)) $(x).hidden = true; if (G.dialogo.open && G.dialogo.open() && G.dialogo.clear) G.dialogo.clear(); if (G.ui.hideCard) G.ui.hideCard(); G.ui.hideToast && G.ui.hideToast(); };
        const aviso = async t => { G.ui.toast(t, 0); await sleep(150); };
        ok('móvil · el iframe mide 375 px de ancho', W.innerWidth === 375, W.innerWidth);
        // QA-90: gestos + aviso
        cerrarTodo(); $('emotes').hidden = false; await aviso('Habla con Iguaca');
        const v90 = !$('toast').hidden, s90 = v90 ? solape(rect('toast'), rect('emotes')) : 0;
        ok('móvil · QA-90 · con los gestos abiertos el aviso se ve y no los tapa', v90 && s90 === 0, (v90 ? '' : 'el aviso no se ve · ') + s90 + ' px² de solape');
        // QA-91: caja de diálogo + aviso
        cerrarTodo();
        if (G.dialogo.say) G.dialogo.say([{ who: 'Iguaca', text: 'Hola, Vittata. Mira la loma, que allí empieza todo.' }], null, { caja: true });
        await sleep(400); await aviso('Habla con Iguaca');
        const dlg = $('dialog'), s91 = (!dlg || dlg.hidden || $('toast').hidden) ? 0 : solape(rect('toast'), dlg.getBoundingClientRect());
        ok('móvil · QA-91 · con el diálogo abierto el aviso se ve y no tapa la caja', dlg && !dlg.hidden && !$('toast').hidden && s91 === 0, ($('toast').hidden ? 'el aviso no se ve · ' : '') + (dlg && !dlg.hidden ? '' : 'el diálogo no se abrió · ') + s91 + ' px² de solape');
        // QA-92: panel final + aviso
        cerrarTodo(); $('end').hidden = false; await aviso('Descubriste Poza Honda');
        const btns = [...$('end').querySelectorAll('button, .btn')].filter(b => b.offsetParent);
        const s92 = $('toast').hidden ? 0 : btns.reduce((s, b) => s + solape(rect('toast'), b.getBoundingClientRect()), 0);
        ok('móvil · QA-92 · con el panel final el aviso se ve y no tapa sus botones (' + btns.length + ')', !$('toast').hidden && btns.length && s92 === 0, s92 + ' px² de solape');
        // QA-93: tarjeta a pantalla completa + aviso → espera y sale al cerrar
        cerrarTodo(); G.ui.showCard('<h2>Cuaderno</h2><p>Prueba QA-93</p>'); await aviso('Termina lo que estás haciendo y vuelve a tocar «Retos»');
        const oculto = $('toast').hidden;
        G.ui.hideCard(); { const t0 = performance.now(); while ($('toast').hidden && performance.now() - t0 < 3000) await sleep(100); }
        ok('móvil · QA-93 · con una tarjeta abierta el aviso espera y sale al cerrarla', oculto && !$('toast').hidden, 'con tarjeta: ' + (oculto ? 'oculto' : 'visible') + ' · tras cerrar: ' + ($('toast').hidden ? 'oculto' : 'visible'));
        cerrarTodo();
      } catch (e) { ok('móvil · sin excepciones', false, String(e && e.stack || e).slice(0, 300)); }
      finally { if (fr) fr.remove(); }
    }
    return { passed: R.filter(r => r.ok).length, total: R.length, results: R };
  }
  window.AV = window.AV || {};
  window.AV.cg34Test = cg34Test;
})();
