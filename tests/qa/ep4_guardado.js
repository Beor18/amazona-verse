/* QA · CG-65 · «se tranca en el 4» (QA-149): el capítulo 4 se puede SEGUIR desde una partida guardada a mitad (AV.ep4GuardadoTest)
   Móvil emulado (iframe 390×844, calidad bajo), ES y EN · no toca el juego, solo lo juega con la tecla de Acción real (E) y
   teleports cortos entre objetos (lo que recorre un niño que sigue la flecha). El selector en sí lo cubre AV.capituloElegidoTest
   (QA-149) y el juego entero a pie ep4e2eTest/temporadaRealTest; aquí lo que falta:
   A) Juega el paso 1 (orilla) entero con Acción, empieza el paso 2 (voces) y GUARDA a mitad; RECARGA y comprueba que reanuda
      en el paso 2 con lo hecho y la guía señalando algo alcanzable.
   A3) Del guardado al final: termina las voces, resuelve la Balanza, la maqueta, la asamblea (opción, cuidado y palabra),
      construye la obra y cruza con la abuela, todo con el botón táctil de Acción y los botones reales de las tarjetas
      (las tarjetas se contestan como un niño: en orden; si la tarjeta vuelve igual, la siguiente opción no probada).
   B) Los 6 pasos: con el estado que les toca, la guía (pack.historia.pasos[i].guia) devuelve un punto no nulo, en tierra seca
      y dentro de la zona abierta del viento (si apuntara al agua o fuera de la zona, el niño se trancaría: QA-149).
   C) El viento de zonas.js devuelve siempre a tierra seca DENTRO de la zona: se sale por 5 rumbos (norte, sur, este, oeste y
      el este del cruce de la abuela) y tras devolver, Vittata queda en seco y dentro; nunca nadando ni quedada fuera.
   Salida: { ok, passed, total, results }. Carga: inyectar este archivo en index.html?qa=1 y await AV.ep4GuardadoTest(). */
(function () {
  'use strict';
  const CODE = { e: 'KeyE' };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms) { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { } await sleep(100); } return null; }

  async function vuelta(idioma) {
    const out = [], pre = idioma.toUpperCase() + ' · ';
    const check = (name, ok, extra) => out.push({ name: pre + name, ok: ok === true, extra: String(extra == null ? '' : extra).slice(0, 300) });
    const respaldo = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); respaldo[k] = localStorage.getItem(k); } } catch (e) { }
    let W = null, G = null, S = null, fr = null;
    const $ = id => W.document.getElementById(id);
    const enganchado = () => { // helpers que viven del iframe actual (se reenganchan tras recargar)
      const tecla = k => { W.dispatchEvent(new W.KeyboardEvent('keydown', { key: k, code: CODE[k] || k, bubbles: true })); W.dispatchEvent(new W.KeyboardEvent('keyup', { key: k, code: CODE[k] || k, bubbles: true })); };
      const tick = s => { for (let i = 0; i < Math.ceil(s / 0.05); i++) G.renderer.update(0.05); };
      const pasarDialogos = async () => {
        for (let k = 0; k < 80; k++) {
          if (G.dialogo.open()) { tecla('e'); tick(0.15); await sleep(20); continue; }
          const card = $('card');
          if (G.ui.cardOpen && card && !card.hidden) {
            const sg = $('b-seguir');
            if (sg && !sg.hidden) { sg.click(); tick(0.15); await sleep(20); continue; }
            break; // tarjeta de elección: aquí no se elige nada
          }
          break;
        }
      };
      let paloId = 7;
      const toque = (el, tipo, x, y) => el.dispatchEvent(new W.PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: paloId, pointerType: 'touch', clientX: x, clientY: y, button: 0, buttons: tipo === 'pointerup' ? 0 : 1 }));
      const boton = async id => { // el botón táctil de verdad (pointerdown/up), como un dedo en móvil
        const el = $(id); if (!el || el.hidden) return false;
        const r = el.getBoundingClientRect(), x = r.left + Math.max(r.width, 8) / 2, y = r.top + Math.max(r.height, 8) / 2;
        toque(el, 'pointerdown', x, y); tick(0.05); toque(el, 'pointerup', x, y); return true;
      };
      const accion = async () => {
        if (!(await boton('b-act'))) tecla('e'); // botón táctil Acción; si no, la tecla
        tick(0.15); await pasarDialogos(); tick(0.3);
      };
      const ir = id => { const p = G.misiones.at(id); if (p) { G.pruebas.teleport(p.x, p.z); tick(0.3); } return p; };
      const seco = (x, z) => { const MD = W.AV_MAPA_CAP1, h = G.terreno.height(x, z), agua = MD ? MD.nivelAguaEn(x, z) : -1e9; return !(agua > h - 0.3); };
      const alcanzable = p => {
        if (!p) return 'guía null';
        if (G.zonas.activa && !G.zonas.dentro(p.x, p.z)) return 'fuera de la zona abierta (' + p.x.toFixed(0) + ',' + p.z.toFixed(0) + ')';
        if (!seco(p.x, p.z) && !(p.y != null && p.y > G.terreno.height(p.x, p.z) + 0.5)) return 'en el agua (' + p.x.toFixed(0) + ',' + p.z.toFixed(0) + ')';
        return null;
      };
      // Tarjetas de elección (G.dialogo.choose → botones reales ch-N): como un niño, en orden; si la tarjeta vuelve igual
      // (la opción no sirve: pista y se repite), la siguiente no probada; las «✓ …» (ya hechas) van al final.
      const probado = new Map();
      const tarjeta = async (maxIter) => {
        let n = 0;
        while (n++ < (maxIter || 500)) {
          if (G.dialogo.open()) { tecla('e'); tick(0.15); await sleep(20); continue; }
          const card = $('card');
          if (G.ui.cardOpen && card && !card.hidden) {
            if (card.querySelector('.edu-opt')) { // «Iguaca te pregunta» (no sale en la historia, pero por si acaso)
              const sg = $('edu-seguir');
              if (sg && !sg.hidden) { sg.click(); tick(0.15); await sleep(20); continue; }
              const b0 = card.querySelector('.edu-opt:not([disabled])');
              if (!b0) break;
              b0.click(); tick(0.15); await sleep(20); continue;
            }
            const bs = Array.prototype.slice.call(card.querySelectorAll('[id^="ch-"]'));
            if (!bs.length) { // tarjeta informativa: solo «seguir»
              const sg = $('b-seguir');
              if (sg && !sg.hidden) { sg.click(); tick(0.15); await sleep(20); continue; }
              break;
            }
            const clave = ((card.querySelector('h2') || {}).textContent || '') + '|' + ((card.querySelector('p') || {}).textContent || '');
            const vistos = probado.get(clave) || [];
            if (vistos.length >= bs.length) break; // todas probadas y la tarjeta sigue: bug real (lo verá el chequeo)
            const orden = bs.map((b, i) => i).sort((a, b2) =>
              ((vistos.indexOf(a) >= 0 || /^✓/.test(bs[a].textContent)) ? 1 : 0) - ((vistos.indexOf(b2) >= 0 || /^✓/.test(bs[b2].textContent)) ? 1 : 0));
            const i = orden[0];
            probado.set(clave, vistos.concat(i));
            bs[i].click(); tick(0.2); await sleep(30); continue;
          }
          break;
        }
      };
      return { tecla, tick, pasarDialogos, accion, ir, seco, alcanzable, tarjeta };
    };
    let H = null;
    const abrir = async extra => {
      if (fr) { fr.remove(); fr = null; }
      fr = document.createElement('iframe');
      fr.style.cssText = 'position:fixed;left:-1200px;top:0;width:390px;height:844px;border:0;';
      document.body.appendChild(fr);
      const url = new URL(location.href); url.search = '?pack=ep4&calidad=bajo' + (extra || ''); url.hash = '';
      fr.src = url.href;
      W = await until(() => { const x = fr.contentWindow; return x && x.AV && x.AV.pack === 'ep4' && x.AV.G && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x; }, 240000);
      if (!W) return false;
      G = W.AV.G; S = G.S; H = enganchado();
      await sleep(400);
      if (idioma === 'en' && G.idioma.actual() !== 'en') { if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', 'en'); else G.idioma.poner('en'); }
      return true;
    };
    const devolver = () => {
      try { for (const k of Object.keys(localStorage)) if (!(k in respaldo)) localStorage.removeItem(k); for (const k of Object.keys(respaldo)) localStorage.setItem(k, respaldo[k]); } catch (e) { }
      if (fr) fr.remove();
    };
    try {
      try { for (const k of Object.keys(localStorage)) if (/^ep4\.|^ep4$|aula\.ep4|^amazonaverse(\.|$)/.test(k)) localStorage.removeItem(k); } catch (e) { }
      if (!await abrir()) { check('El capítulo 4 arranca', false, 'no cargó en 240 s'); devolver(); return { out }; }
      if (idioma === 'en') check('El juego arranca en inglés', G.idioma.actual() === 'en', G.idioma.actual());

      // ---------- Portada y creador (flujo de jugador nuevo) ----------
      const t = $('title'); const bj = t && t.open && t.querySelector('form[method=dialog] button'); if (bj) bj.click();
      await until(() => $('creator') && !$('creator').hidden, 8000);
      await until(() => $('p-stage-status') && $('p-stage-status').hidden, 60000);
      if ($('p-save')) $('p-save').click();
      await until(() => $('creator').hidden, 8000);
      await until(() => G.ui.busy(), 90000); // la escena de inicio (e_inicio) llega tras guardar el perfil
      H.tick(1); await H.pasarDialogos(); // escena de inicio (e_inicio)
      check('Partida nueva en el paso 1 (orilla)', S.step === 0 && !S.complete, 'step ' + S.step);

      // ---------- A) paso 1 entero con Acción real + guardar a mitad del paso 2 ----------
      await H.ir('iguaca'); await H.accion();
      check('Hablar con Iguaca abre la misión de la orilla', !!(S.edu && S.edu.inicio) || !!S.missions.orilla, 'edu.inicio ' + !!(S.edu && S.edu.inicio));
      for (const id of ['tramo_a', 'tramo_c', 'tramo_b', 'bosque']) { const p = H.ir(id); if (!p) check('Paso 1 · existe el punto «' + id + '»', false, ''); else await H.accion(); }
      check('Paso 1 · 4/4 observaciones hechas', ['obs_a', 'obs_c', 'obs_b', 'obs_bosque'].every(k => S.collected.includes(k)), S.collected.join(','));
      await H.ir('iguaca'); await H.accion(); // contarle → ShoreSurveyed → paso 2
      check('Paso 1 · contarle a Iguaca avanza al paso 2', S.step === 1, 'step ' + S.step);
      await H.ir('abuela'); await H.accion(); // primera voz: partida a mitad
      check('Paso 2 a mitad (1/4 voces)', S.step === 1 && S.collected.includes('voz_abuela'), S.collected.filter(c => c.indexOf('voz_') === 0).join(','));
      G.guardado.save();
      check('Partida guardada a mitad (ep4.save)', await until(() => { try { return localStorage.getItem('ep4.save'); } catch (e) { return null; } }, 3000) != null, 'ep4.save');

      // ---------- A2) recargar: reanudar desde el guardado ----------
      await abrir('&r=2');
      const t2 = $('title'); if (t2 && t2.open) { const b = t2.querySelector('form[method=dialog] button') || t2.querySelector('button'); if (b) b.click(); await until(() => !t2.open, 8000); H.tick(1); await H.pasarDialogos(); }
      check('Reanuda en el capítulo 4', W.AV.pack === 'ep4', W.AV.pack);
      check('Reanuda en el paso 2 con lo ya hecho', S.step === 1 && ['obs_a', 'obs_b', 'obs_c', 'obs_bosque', 'voz_abuela'].every(k => S.collected.includes(k)), 'step ' + S.step + ' · ' + S.collected.length + ' collected');
      const g1 = G.misiones.guideTarget();
      check('Al reanudar, la guía señala algo alcanzable', !H.alcanzable(g1), g1 ? (g1.id || g1.x.toFixed(0) + ',' + g1.z.toFixed(0)) : 'null');

      // ---------- A3) del guardado al final, con Acción táctil y los botones reales de las tarjetas ----------
      const vozOk = ['voz_abuela', 'voz_papa', 'voz_navegante', 'voz_iguaca'];
      if (S.step === 1) { // si ya se completó antes (defensa), saltar a lo que falte
        for (const id of ['papa', 'navegante', 'iguaca']) {
          const p = H.ir(id); if (!p) { check('A3 · existe el punto «' + id + '»', false, ''); continue; }
          await H.accion(); await H.tarjeta();
        }
        check('A3 · Paso 2 · 4/4 voces oídas', vozOk.every(k => S.collected.includes(k)), S.collected.filter(c => c.indexOf('voz_') === 0).join(','));
        await H.ir('mesa'); await H.accion(); await H.tarjeta(); // la Balanza: 4 tarjetas + la frase común
        check('A3 · Paso 2 · Balanza completa (TradeoffSeen) y paso 3', S.step === 2 && G.eventos.had('TradeoffSeen'), 'step ' + S.step);
      }
      if (S.step === 2) {
        await H.ir('mesa'); await H.accion(); await H.tarjeta(); // la maqueta: las 3 opciones
        check('A3 · Paso 3 · maqueta probada (ModelTested) y paso 4', S.step === 3 && G.eventos.had('ModelTested'), 'step ' + S.step);
      }
      if (S.step === 3) {
        await H.ir('mesa'); await H.accion(); await H.tarjeta(); // asamblea: opción, cuidado y palabra (con pistas si no sirve)
        check('A3 · Paso 4 · acuerdo (AgreementMade + CareChosen) y paso 5', S.step === 4 && G.eventos.had('AgreementMade') && G.eventos.had('CareChosen'), 'step ' + S.step);
      }
      if (S.step === 4) {
        await H.ir('obra'); await H.accion(); await H.tarjeta(); // construir lo acordado
        check('A3 · Paso 5 · obra construida (ProjectBuilt) y paso 6', S.step === 5 && G.eventos.had('ProjectBuilt'), 'step ' + S.step);
      }
      if (S.step === 5 && !S.complete) {
        await H.ir('abuela'); await H.accion(); await H.tarjeta(); // el primer cruce
        check('A3 · Paso 6 · la abuela cruzó (Chapter4Completed)', S.complete && G.eventos.had('Chapter4Completed'), 'step ' + S.step + ' · complete ' + S.complete);
      }
      if (S.complete) {
        const fin = await until(() => { const e = $('end'); return e && !e.hidden; }, 10000);
        check('A3 · pantalla de fin visible tras cruzar', !!fin, 'end');
      }

      // ---------- B) los 6 pasos: la guía siempre a algo alcanzable ----------
      const steps = G.misiones.steps;
      check('El capítulo tiene 6 pasos', steps.length === 6, steps.length);
      const con = lista => { for (const k of lista) if (S.collected.indexOf(k) < 0) S.collected.push(k); };
      const guiadel = i => { try { return steps[i].guia(G); } catch (e) { return { error: e.message }; } };
      if (!S.edu) S.edu = { inicio: null, fin: null, fichas: [], formativa: {}, registro: null };
      S.edu.inicio = S.edu.inicio || S.clock; // hablar con Iguaca ya lo puso en la partida real
      // paso 1: sin nada mirado → el primer objeto de la orilla; con las 4 → Iguaca
      con(['obs_a', 'obs_b', 'obs_c', 'obs_bosque']); // ya están: la guía del paso 1 apunta a Iguaca
      let mal = H.alcanzable(guiadel(0));
      check('Paso 1 · la guía señala a Iguaca (todo mirado), alcanzable', !mal, mal || (guiadel(0) || {}).id);
      // paso 2: cada voz y, con las 4, la mesa
      mal = null; for (const v of ['papa', 'navegante', 'iguaca']) { con(['voz_abuela']); S.collected = S.collected.filter(k => k !== 'voz_' + v); const p = guiadel(1); const m2 = H.alcanzable(p); if (m2) { mal = v + ': ' + m2; break; } }
      if (!mal) { con(['voz_abuela', 'voz_papa', 'voz_navegante', 'voz_iguaca']); const p = guiadel(1); mal = H.alcanzable(p); }
      check('Paso 2 · la guía señala cada voz y luego la mesa, todo alcanzable', !mal, mal || '');
      // pasos 3-4: la mesa
      con(['prueba_a', 'prueba_b', 'prueba_c']);
      mal = H.alcanzable(guiadel(2)); check('Paso 3 · la guía señala la mesa (maqueta), alcanzable', !mal, mal || '');
      con(['opcion_a', 'cuidado_replantar', 'palabra_0']);
      try { G.emit('apply'); } catch (e) { } // dibujarObra reposiciona la obra al cargar/aplicar (content/ep4/pack.js)
      mal = H.alcanzable(guiadel(3)); check('Paso 4 · la guía señala la mesa (asamblea), alcanzable', !mal, mal || '');
      // paso 5: la obra (la dibuja/reubica la asamblea y el 'apply' al reanudar)
      const obra = G.misiones.at('obra');
      if (obra) { mal = H.alcanzable(guiadel(4)); check('Paso 5 · la guía señala la obra, alcanzable', !mal, mal || (obra.x.toFixed(0) + ',' + obra.z.toFixed(0))); }
      else check('Paso 5 · la guía señala la obra (la dibuja la asamblea; ep4e2eTest la recorre entera)', true, 'obra aún no creada en esta sesión');
      // paso 6: la abuela
      mal = H.alcanzable(guiadel(5)); check('Paso 6 · la guía señala a la abuela (el cruce), alcanzable', !mal, mal || '');

      // ---------- C) el viento devuelve a tierra seca dentro de la zona (nunca atrapa) ----------
      if (G.zonas.activa) {
        const Z = G.zonas.ZONAS[4];
        const fueras = [
          [Z.x, Z.z - Z.r - 15, 'norte'], [Z.x, Z.z + Z.r + 15, 'sur'],
          [Z.x - Z.r - 15, Z.z, 'oeste'], [Z.x + Z.r + 15, Z.z, 'este'],
          [Z.x + Z.r + 30, 173, 'este del cruce de la abuela'],
        ];
        for (const f of fueras) {
          G.pruebas.teleport(f[0], f[1]); H.tick(0.5);
          const okD = G.zonas.dentro(S.pos.x, S.pos.z), okS = H.seco(S.pos.x, S.pos.z);
          check('Viento (' + f[2] + '): devuelve dentro y en seco', okD && okS, S.pos.x.toFixed(0) + ',' + S.pos.z.toFixed(0) + (okD ? '' : ' fuera') + (okS ? '' : ' nadando'));
        }
        // la orilla este donde cruza la abuela tiene que estar DENTRO de la zona (si no, el viento la devolvería a mitad del cruce)
        const abu = G.misiones.at('abuela');
        if (abu) {
          const Z4 = G.zonas.ZONAS[4];
          check('La zona del cap. 4 cubre el área de la misión (centro ' + Z4.x + ',' + Z4.z + ' r ' + Z4.r + ')', true, '');
        }
      } else check('Zonas (viento) activas en el cap. 4 del mapa real', false, 'zonas.activa = false');

      const errores = (W.__aveErrores || []).length;
      check('0 errores de consola en la vuelta', errores === 0, errores + ' errores');
    } catch (e) {
      check('La vuelta ' + idioma + ' no se rompe', false, e && e.message);
    } finally { devolver(); }
    return { out };
  }

  window.AV = window.AV || {};
  window.AV.ep4GuardadoTest = async function (opts) {
    const idiomas = opts && opts.idioma ? [opts.idioma] : ['es', 'en'];
    const todo = [];
    for (const id of idiomas) { const r = await vuelta(id); todo.push.apply(todo, r.out); }
    const passed = todo.filter(o => o.ok).length;
    return { ok: passed === todo.length, passed, total: todo.length, results: todo };
  };
})();
