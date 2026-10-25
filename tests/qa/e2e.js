/* QA · prueba E2E de aceptación (AV.e2eTest) · validador independiente
   Recorre la build en un iframe del mismo origen con el almacenamiento del juego vacío (build limpia) y sin tocar la
   partida de la pestaña: se guarda al empezar y se devuelve igual al terminar.
     1. Elegir cotorra en el creador sin cambiar su diseño (mismo modelo, huesos y vértices; solo cambia el plumaje).
     2. Equipar un accesorio desde el creador y guardar.
     3. Obtener un huevo en el criadero y ver la animación de patitas en la eclosión (BLOQUEADO si no hay criadero).
     4. Completar una misión jugando (M1: bucear hasta la pieza del fondo de la poza) y construir el refugio.
     5. Guardar, recargar el iframe y verificar que todo persiste.
     6. Evento narrativo → viñeta del cómic → exportar PNG (se decodifica y mide 1080×1520).
   Cada paso da ok / falla / BLOQUEADO con su evidencia; los atajos (teleport, XP de prueba) se dicen en la evidencia.
   Carga: tests/qa/qa.js lo inyecta solo (?qa=1); a mano: inyectar este archivo y  await AV.e2eTest(). */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 80); }
    return null;
  }
  const s = v => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };

  async function e2eTest(opts) {
    opts = opts || {};
    const out = [], t0 = performance.now();
    const check = (paso, nombre, estado, evidencia) => out.push({ paso, name: paso + ' · ' + nombre, ok: estado === true, estado: estado === true ? 'ok' : estado === 'bloqueado' ? 'BLOQUEADO' : 'falla', extra: s(evidencia).slice(0, 400) });
    const pack = (window.AV && window.AV.G && window.AV.G.pack) || {};
    const prefijo = (pack.meta && pack.meta.almacen) || 'amazonaverse';
    // Respaldo de todo lo del juego en localStorage (partida, criadero, aula, sonido…)
    const respaldo = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefijo)) respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
    const limpiar = () => { try { for (const k of Object.keys(localStorage)) if (k.startsWith(prefijo)) localStorage.removeItem(k); } catch (e) { /* */ } };
    limpiar();
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
    const url = new URL(location.href); url.search = ''; url.hash = '';
    const abrir = async () => {
      const W = await until(() => { const w = fr.contentWindow; return w && w.AV && w.AV.G && (w.AV.G.actores.player3D || w.AV.G.actores.failed3D) && w; }, opts.timeout || 60000, 100);
      if (W) { await sleep(800); const t = W.document.getElementById('title'); if (t && t.open) { const b = t.querySelector('button'); if (b) b.click(); else t.close(); } await sleep(300); }
      return W;
    };
    fr.src = url.href;
    document.body.appendChild(fr);
    let W = null;
    try {
      W = await abrir();
      if (!W) { check('0', 'La build arranca limpia en un iframe', false, 'sin window.AV en 60 s'); return fin(); }
      let G = W.AV.G, S = G.S, T = G.pruebas, $ = id => W.document.getElementById(id);
      const errores0 = (W.__aveErrores || []).length;
      check('0', 'La build arranca limpia (sin partida guardada, el creador se abre)', !$('creator').hidden && !S.profile.created, { creador: !$('creator').hidden, version: W.AVE.version, modulos: W.AVE.modules().length });

      // ---------- 1. Elegir cotorra sin cambiar su diseño ----------
      const firma = ch => { let v = 0, m = 0, b = []; ch.root.traverse(o => { if (o.isBone) b.push(o.name); if ((o.isMesh || o.isSkinnedMesh) && !o.userData.isAccessory) { m++; v += o.geometry.attributes.position.count; } }); return { vertices: v, mallas: m, huesos: b.length, nombres: b.join(',').length }; };
      const ref = firma(await W.AVCharacter.create());
      const sel = $('p-species');
      const opciones = sel ? [...sel.options].map(o => o.value) : [];
      const especie = opciones.find(v => v && v !== sel.value) || opciones[0];
      if (sel && especie) { sel.value = especie; sel.dispatchEvent(new W.Event('change', { bubbles: true })); sel.dispatchEvent(new W.Event('input', { bubbles: true })); }
      await sleep(600);
      const C3 = W.AVCharacter, showcase = W.AVShowcase && W.AVShowcase.status ? W.AVShowcase.status() : 'sin showcase';
      check('1', 'El creador ofrece cotorras y se elige una', !!especie, { opciones, elegida: especie, showcase });

      // ---------- 2. Equipar un accesorio y guardar ----------
      const thumbs = [...W.document.querySelectorAll('#creator button.thumb:not([disabled])')].filter(b => b.dataset.id && !/^nada$|^none$/i.test(b.dataset.id));
      const pieza = thumbs.find(b => /gorra|sombrero|lentes|gafas/.test(b.dataset.id)) || thumbs[0];
      if (pieza) pieza.click();
      await sleep(400);
      // Nombre: de las listas (seguridad infantil, sin texto libre) si existen; si no, el campo de texto de siempre
      const na = $('p-name-a'), nb = $('p-name-b'), nombre = $('p-name');
      if (na && nb) { na.selectedIndex = 1 % na.options.length; nb.selectedIndex = 1 % nb.options.length; for (const e of [na, nb]) e.dispatchEvent(new W.Event('change', { bubbles: true })); }
      else if (nombre && 'value' in nombre && nombre.tagName === 'INPUT') { nombre.value = 'Nube E2E'; nombre.dispatchEvent(new W.Event('input', { bubbles: true })); }
      G.quiet = true;                                                // sin la escena de inicio del capítulo
      $('p-save').click();
      await sleep(600);
      G.quiet = false;
      const look = S.profile && S.profile.look ? S.profile.look : {};
      const accs = Object.values(look.accessories || {}).map(a => a.id);
      check('2', 'Equipar un accesorio y guardar (creador cerrado, perfil con la pieza)', S.profile.created && $('creator').hidden && !!pieza && accs.includes(pieza.dataset.id),
        { pieza: pieza && pieza.dataset.id, especie: look.species, accesorios: accs, nombre: S.profile.name });
      // El jugador nunca cambia de modelo: misma firma que el modelo base (solo plumaje y accesorios)
      const comp = G.actores.companion3D, prota = G.actores.player3D;
      const fComp = comp ? firma(comp) : null, fProta = prota ? firma(prota) : null;
      check('1', 'Sin cambiar su diseño: mismo modelo, huesos y vértices que la cotorra base', !!fProta && s(fProta) === s(ref) && (!fComp || s(fComp) === s(ref)) && look.species === especie,
        { base: ref, protagonista: fProta, companero: fComp || 'sin compañero 3D', especie: look.species });
      T.drain();

      // ---------- 3a. Obtener un huevo (criadero) ----------
      const CR = G.criadero;
      if (!CR) check('3', 'Obtener un huevo y ver las patitas en la eclosión', 'bloqueado', 'el criadero no está integrado en esta build (G.criadero no existe)');
      else {
        await CR.abrir();
        await until(() => CR.estado().capsulas && Object.keys(CR.estado().capsulas).length, 5000);
        const est = CR.estado(), id = est.activa || 'clasico', cap = est.capsulas[id];
        check('3', 'Se obtiene un huevo al abrir el criadero (cápsula de nido incubando)', !!cap && /incubando|lista/.test(cap.estado), { activa: id, estado: cap && cap.estado, xp: cap && cap.xp });
        CR.cerrar && CR.cerrar();
      }

      // ---------- 4. Completar una misión jugando y construir ----------
      const xpAntes = CR ? (CR.estado().capsulas[CR.estado().activa || 'clasico'] || {}).xp || 0 : 0;
      const c1 = G.objetos && G.objetos.find ? G.objetos.find('c1') : null;
      const poza = (G.terreno.poi && G.terreno.poi('poza_honda')) || c1 || (G.terreno.places && G.terreno.places.pozaRio);
      const keys = G.input.keys;
      if (poza) {
        T.teleport(poza.x, poza.z); T.tick(0.5);
        keys.add('c'); for (let i = 0; i < 120 && !(S.missions && S.missions.m1); i++) T.tick(0.1); keys.delete('c');
        T.tick(0.5); T.drain();
      }
      check('4', 'Misión M1 «Fondo del río» completada buceando (C) hasta la pieza', !!(S.missions && S.missions.m1), { poza: poza && [Math.round(poza.x), Math.round(poza.z)], nado: G.fisica.MOVE.swimming, inv: S.inv, misiones: S.missions, atajo: 'teleport a la poza; el buceo es con la tecla C simulada' });
      // Materiales para el refugio jugando: recogidas reales (useAt) de lo que haga falta
      const costo = (G.pack.costos && G.pack.costos.REFUGE_COST) || { madera: 3, piedra: 2 };
      for (const o of (G.objetos.recursos || [])) {
        if (Object.keys(costo).every(k => (S.inv[k] || 0) >= costo[k])) break;
        if (!S.collected.includes(o.id) && costo[o.tipo] && (S.inv[o.tipo] || 0) < costo[o.tipo]) { T.useAt(o.id); T.tick(0.2); T.drain(); }
      }
      const P = G.terreno.places || {}, parcela = P.B ? 'B' : 'A', sitio = P[parcela];
      let construido = false, motivo = '';
      if (G.c.startBuild && sitio) {
        G.c.startBuild(parcela); T.teleport(sitio.x, sitio.z - 1.5, 0, 1); T.tick(0.2);
        const b = G.c.build && G.c.build(); motivo = b ? (b.valid ? 'válido' : b.reason) : 'sin modo construir';
        G.interaccion.action(); T.tick(0.5); T.drain(); T.tick(9); T.drain();
        construido = !!S.refuge;
      } else motivo = 'el pack no expone startBuild';
      check('4', 'Construir el refugio con los materiales recogidos', construido, { parcela, refugio: S.refuge, inv: S.inv, modo: motivo, atajo: 'el paso de historia "terrenos" (La ruta de la gota) lo cubre AV.eduTest; aquí se entra al modo construir con G.c.startBuild' });

      // ---------- 3b. Eclosión con patitas ----------
      if (CR) {
        const id = CR.estado().activa || 'clasico';
        const xpTras = (CR.estado().capsulas[id] || {}).xp || 0;
        let atajoXP = 0;
        if ((CR.estado().capsulas[id] || {}).estado !== 'lista') { for (let i = 0; i < 6 && (CR.estado().capsulas[id] || {}).estado !== 'lista'; i++) atajoXP += CR.dar('mision', 'e2e-' + i) || 0; }
        await CR.abrir(); await sleep(400);
        const boton = W.document.querySelector('#criadero [data-cr="eclosion"]');
        if (boton && !boton.closest('[hidden]')) boton.click(); else if (CR.debug && CR.debug.eclosion) await CR.debug.eclosion(id);
        const cria = await until(() => CR.debug && CR.debug.cria && CR.debug.cria(), 15000);
        let raiz = cria && cria.holder; while (raiz && raiz.parent) raiz = raiz.parent;
        const huevo = raiz && raiz.getObjectByName('huevo');
        const patas = huevo && huevo.children.find(o => o.isGroup && o.children.length === 2);
        const escala = () => { if (!patas) return null; const v = new W.THREE.Vector3(); patas.children[0].getWorldScale(v); return +v.x.toFixed(3); };
        CR.debug.irA(1.0); const e1 = escala();
        CR.debug.irA(6.0); const e6 = escala();
        CR.debug.irA(9.6); await sleep(300);                         // terminarEclosion corre con T > 9,4
        const tras = CR.estado().capsulas[id] || {};
        check('3', 'Eclosión: las patitas salen del huevo (escala ~0 a 1 s, visible a 6 s)', patas && e1 < 0.05 && e6 > 0.5, { escala1s: e1, escala6s: e6, xpPorJugar: xpTras - xpAntes, xpDePrueba: atajoXP, boton: !!boton });
        check('3', 'Tras la eclosión la cápsula queda nacida', tras.estado === 'nacida', { estado: tras.estado, xp: tras.xp });
        CR.cerrar && CR.cerrar();
      }

      // ---------- 5. Guardar, recargar y verificar persistencia ----------
      const antes = { nombre: S.profile.name, especie: S.profile.look && S.profile.look.species, accs, m1: !!(S.missions && S.missions.m1), refugio: s(S.refuge), inv: s(S.inv), eventos: S.events.length,
        criadero: CR ? s((CR.estado().capsulas || {})[CR.estado().activa || 'clasico']) : null };
      const guardo = G.guardado.save(true);
      const errAntes = (W.__aveErrores || []).slice(errores0);
      fr.contentWindow.location.reload();
      await sleep(500);
      W = await abrir();
      if (!W) { check('5', 'Recargar la build', false, 'no volvió a arrancar'); return fin(); }
      G = W.AV.G; S = G.S; T = G.pruebas; $ = id => W.document.getElementById(id);
      const CR2 = G.criadero;
      const despues = { nombre: S.profile.name, especie: S.profile.look && S.profile.look.species, accs: Object.values((S.profile.look || {}).accessories || {}).map(a => a.id), m1: !!(S.missions && S.missions.m1), refugio: s(S.refuge), inv: s(S.inv), eventos: S.events.length,
        criadero: CR2 ? s((CR2.estado().capsulas || {})[CR2.estado().activa || 'clasico']) : null };
      const iguales = Object.keys(antes).filter(k => s(antes[k]) !== s(despues[k]));
      check('5', 'Guardar, recargar y todo persiste (perfil, pieza, misión, refugio, inventario, eventos, criadero)', guardo !== false && !iguales.length && $('creator').hidden && S.profile.created, { distintos: iguales, antes, despues });

      // ---------- 6. Evento narrativo → viñeta → PNG ----------
      const CM = G.comic;
      const evs = S.events.map(e => e.key);
      const paneles = CM.comicPanels ? CM.comicPanels() : [];
      const conNombre = !!S.profile.name && paneles.some(p => String(p.text || '').includes(S.profile.name));
      check('6', 'Los eventos narrativos se convierten en viñetas (con el nombre del jugador)', paneles.length >= 1 && conNombre, { nombre: S.profile.name, eventos: evs.slice(0, 12), vinetas: paneles.map(p => p.id + ': ' + String(p.text || '').slice(0, 50)) });
      let png = '';
      try { png = await CM.exportComic('png'); } catch (e) { png = 'error: ' + e.message; }
      const im = png.startsWith('data:image/png') ? await new Promise(r => { const i = new W.Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = png; }) : null;
      check('6', 'Exportar el cómic a PNG (se decodifica a 1080×1520)', !!im && im.width === 1080 && im.height === 1520, { kb: Math.round(png.length / 1024), medida: im ? im.width + '×' + im.height : png.slice(0, 60) });
      if (W.document.getElementById('comic')) W.document.getElementById('comic').hidden = true;
      const errs = errAntes.concat((W.__aveErrores || []));
      check('·', 'Sin errores de JavaScript en todo el recorrido', !errs.length, errs.slice(0, 3).join(' | ') || 'ninguno');
      return fin();
    } catch (e) {
      check('!', 'El recorrido no lanza excepciones', false, (e && e.stack) || String(e));
      return fin();
    }
    function fin() {
      try { const G2 = fr.contentWindow && fr.contentWindow.AV && fr.contentWindow.AV.G; if (G2) { G2.renderer.renderer.dispose(); G2.renderer.renderer.forceContextLoss(); } } catch (e) { /* ya cerrado */ }
      if (!opts.keep) fr.remove();
      limpiar();
      try { for (const [k, v] of Object.entries(respaldo)) localStorage.setItem(k, v); } catch (e) { /* */ }
      const bloqueados = out.filter(o => o.estado === 'BLOQUEADO').length;
      return { passed: out.filter(o => o.ok).length, total: out.length, bloqueados, segundos: Math.round((performance.now() - t0) / 1000), build: location.origin, results: out };
    }
  }

  window.AVQA_E2E = e2eTest;
  const poner = () => { if (window.AV) { window.AV.e2eTest = o => e2eTest(o); return true; } return false; };
  if (!poner()) { const t = setInterval(() => { if (poner()) clearInterval(t); }, 200); setTimeout(() => clearInterval(t), 120000); }
})();
