/* AVE · pruebas del motor (diagnóstico; se exponen en window.AV)
   - Ayudas para las pruebas de cada pack (G.pruebas): teleport, tick, drain, useAt, runner y guardar/restaurar la partida.
   - accessoryTest: personaje 3D, montajes, animaciones, ropero y retrato (necesita src/personaje/character.js).
   - templateTest: arranca content/plantilla en un iframe oculto (?pack=plantilla) y corre su selfTest: prueba que la base
     sirve para un juego distinto sin tocar el motor. */
AVE.module('pruebas', function (G) {
  'use strict';
  const S = G.S;
  function teleport(x, z, fx, fz) { S.pos.x = x; S.pos.z = z; S.pos.y = G.terreno.height(x, z); S.vy = 0; if (fx !== undefined) S.facing = { x: fx, z: fz }; }
  function tick(seconds) { const n = Math.ceil(seconds / 0.05); for (let i = 0; i < n; i++) G.renderer.update(0.05); }
  // Pasa la caja de diálogo y también los bocadillos libres (dialogo.activo), para que sus `done` lleguen sin esperar el reloj
  function drain() { let n = 0; while ((G.dialogo.activo ? G.dialogo.activo() : G.dialogo.open()) && n++ < 40) G.dialogo.next(); }
  function useAt(id, ox, oz) {
    const it = G.interaccion.find(id); teleport(it.x + (ox || 0.9), it.z + (oz || 0)); tick(0.1);
    const nb = G.interaccion.nearest(); if (nb && nb.id === id) { G.interaccion.action(); return true; } return false;
  }
  function runner() {
    const out = [];
    const check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra || '' });
    return { out, check, result: () => ({ passed: out.filter(o => o.ok).length, total: out.length, results: out }) };
  }
  // Guarda la partida del jugador antes de una prueba y la devuelve al final
  function keepSave() { try { return localStorage.getItem(G.guardado.KEY); } catch (e) { return null; } }
  function restoreSave(keep) {
    try { if (keep) localStorage.setItem(G.guardado.KEY, keep); } catch (e) { /* sin almacenamiento */ }
    if (keep) G.guardado.load(true); else G.creador.open(true);
  }

  // Pruebas del sistema de accesorios 3D (requieren el modelo con esqueleto)
  async function accessoryTest() {
    const { check, result } = runner();
    let ch;
    try { ch = await window.AVCharacter.create(); } catch (e) { check('El modelo 3D carga', false, String(e)); return result(); }
    check('El modelo 3D carga', true, Math.round(ch.height * 100) / 100 + ' de alto');
    check('Tiene los 7 puntos de montaje', ch.missingMounts().length === 0, ch.missingMounts().join(', '));
    const needed = ['Idle', 'Welcome', 'Celebrate', 'Curious', 'Walk'];
    check('Tiene las animaciones de espera, presentación, celebración, curiosidad y caminar', needed.every(n => ch.clips[n]), Object.keys(ch.clips).join(', '));
    const all = { species: 'vittata', accessories: {} };
    for (const a of window.AVCharacter.ACCESSORIES) if (window.AVCharacter.BASE_IDS.includes(a.id)) all.accessories[a.slot] = { id: a.id, color: a.colors[1] || a.colors[0] };
    ch.applyLook(all);
    const objs = Object.values(ch.mounted).flatMap(m => m.objects);
    check('Se montan los 6 accesorios (7 piezas con los dos brazaletes)', Object.keys(ch.mounted).length === 6 && objs.length === 7, objs.length + ' piezas');
    // Colisiones en pose de reposo: ningún vértice de accesorio dentro del pico ni de los ojos
    ch.mixer.stopAllAction(); ch.root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); }); ch.root.updateMatrixWorld(true);
    // Puntos reales del pico (material del pico) y esferas de los ojos, en pose de reposo
    const beakPts = [];
    ch.root.traverse(o => {
      if (!o.isMesh || o.userData.isAccessory) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const bi = mats.findIndex(m => /^Material\.001$|^Beak$/.test(m.name)); if (bi < 0) return;
      const pos = o.geometry.attributes.position, v = new THREE.Vector3();
      const groups = Array.isArray(o.material) ? o.geometry.groups.filter(g => g.materialIndex === bi) : [{ start: 0, count: pos.count, direct: true }];
      for (const g of groups) for (let i = g.start; i < g.start + g.count; i += g.direct ? 2 : 3) {
        const vi = g.direct ? i : (o.geometry.index ? o.geometry.index.getX(i) : i);
        v.fromBufferAttribute(pos, vi).applyMatrix4(o.matrixWorld); beakPts.push(v.clone());
      }
    });
    const mi = window.AVCharacter.mountsInfo();
    const eyes = mi && mi.eyes ? Object.values(mi.eyes).map(e => new THREE.Vector3().fromArray(e.center || e)) : [];
    const EYE_R = 0.045, MIN_GAP = 0.004;
    const hits = [];
    for (const [slot, m] of Object.entries(ch.mounted)) for (const obj of m.objects) obj.traverse(o => {
      if (!o.isMesh) return; const pos = o.geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 250))) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        if (eyes.some(e => e.distanceTo(v) < EYE_R)) { hits.push(slot + '→ojo'); return; }
        for (const b of beakPts) if (b.distanceTo(v) < MIN_GAP) { hits.push(slot + '→pico'); return; }
      }
    });
    const solids = beakPts.length ? [1] : [];
    check('Los accesorios no atraviesan el pico ni los ojos (reposo)', solids.length > 0 && hits.length === 0, solids.length ? (hits.join(', ') || solids.length + ' piezas revisadas') : 'no se encontraron mallas de pico/ojos');
    // Seguimiento durante las animaciones: el accesorio conserva su posición relativa al hueso y se mueve con él
    let maxDrift = 0, maxTravel = 0;
    const inv = new THREE.Matrix4(), rel = new THREE.Vector3();
    for (const name of needed) {
      const clip = ch.clips[name]; if (!clip) continue;
      ch.mixer.stopAllAction(); const act = ch.mixer.clipAction(clip); act.reset().play();
      const ref = {};
      for (let k = 0; k <= 6; k++) {
        ch.mixer.setTime(clip.duration * k / 6); ch.root.updateMatrixWorld(true);
        for (const [slot, m] of Object.entries(ch.mounted)) m.objects.forEach((obj, j) => {
          const bone = obj.parent, key = slot + j;
          const wp = obj.getWorldPosition(new THREE.Vector3());
          inv.copy(bone.matrixWorld).invert(); rel.copy(wp).applyMatrix4(inv);
          if (!ref[key]) ref[key] = { rel: rel.clone(), wp: wp.clone() };
          maxDrift = Math.max(maxDrift, rel.distanceTo(ref[key].rel));
          maxTravel = Math.max(maxTravel, wp.distanceTo(ref[key].wp));
        });
      }
    }
    check('Los accesorios siguen a sus huesos en las 5 animaciones', maxDrift < 1e-4 && maxTravel > ch.height * 0.005, 'desvío ' + maxDrift.toExponential(1) + ', recorrido ' + maxTravel.toFixed(3));
    // Personalización: quitar, cambiar color, especie
    const before = ch.mounted.neck.objects[0];
    ch.applyLook(Object.assign({}, all, { accessories: Object.assign({}, all.accessories, { neck: { id: 'panuelo', color: '#7a4fb3' } }) }));
    // los colores del personaje se guardan en lineal (AVColor): se comparan de vuelta en hex sRGB
    const hexOf = c => window.AVColor ? window.AVColor.hex(c) : '#' + c.getHexString();
    let col = null; ch.mounted.neck.objects[0].traverse(o => { if (o.isMesh && !col) col = hexOf(o.material.color); });
    // El material puede guardar el color en sRGB o ya pasado a lineal (flujo de color del personaje): ambos son el color elegido
    const lin = '#' + new THREE.Color('#7a4fb3').convertSRGBToLinear().getHexString();
    check('Cambiar el color reemplaza la pieza con el color nuevo', ch.mounted.neck.objects[0] !== before && (col === '#7a4fb3' || col === lin), col);
    ch.applyLook({ species: 'versicolor', accessories: {} });
    check('Quitar accesorios los desmonta', Object.keys(ch.mounted).length === 0 && !before.parent);
    // Ropero: cada pieza en cada estilo se monta en su hueso, y gorras/lentes no tocan ojos ni pico
    {
      let pieces = 0; const failed = [], wHits = [];
      // Las piezas de Blender se cargan antes: sin esto la prueba revisaba a veces la versión simple (según lo que ya hubiera en caché)
      if (window.AVCharacter.preloadRopa) await window.AVCharacter.preloadRopa();
      ch.mixer.stopAllAction(); ch.root.traverse(o => { if (o.isSkinnedMesh) o.skeleton.pose(); });
      for (const d of window.AVCharacter.ACCESSORIES.filter(a => !window.AVCharacter.BASE_IDS.includes(a.id))) {
        for (const st of (d.styles || [[undefined]]).map(s => s[0])) {
          ch.applyLook({ species: 'vittata', accessories: { [d.slot]: { id: d.id, color: d.colors[0], style: st } } });
          const m = ch.mounted[d.slot];
          if (!m || !m.objects.length || m.objects.some(o => !o.parent)) { failed.push(d.id + ':' + st); continue; }
          pieces += m.objects.length;
          if (d.slot === 'head' || d.slot === 'eyes') {
            ch.root.updateMatrixWorld(true);
            for (const obj of m.objects) obj.traverse(o => {
              if (!o.isMesh) return; const pos = o.geometry.attributes.position, v = new THREE.Vector3();
              for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 200))) {
                v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
                // gorras: lejos de los ojos; lentes: delante del ojo, con al menos 1 cm de aire (no lo tocan)
                if (eyes.some(e => e.distanceTo(v) < (d.slot === 'eyes' ? 0.01 : EYE_R))) { wHits.push(d.id + ':' + st + '→ojo'); return; }
              }
            });
          }
        }
      }
      check('El ropero monta todas sus piezas y estilos en sus huesos', failed.length === 0 && pieces > 0, failed.join(', ') || pieces + ' partes');
      check('Gorras y lentes del ropero no tapan los ojos (reposo)', wHits.length === 0, [...new Set(wHits)].join(', ') || 'sin choques');
      ch.applyLook({ species: 'versicolor', accessories: {} });
    }
    const pc = ch.tint ? hexOf(ch.tint.patchColor.value) : (ch.materials.Patch ? hexOf(ch.materials.Patch.color) : null);
    check('El plumaje cambia la máscara facial', pc === window.AVCharacter.SPECIES.versicolor.patch && (!ch.tint || ch.tint.tintOn.value.x === 1), pc || 'sin máscara ni material Patch');
    // Retrato idéntico para juego y cómic
    const prevProfile = S.profile;
    S.profile = { created: true, name: 'Prueba', look: { species: 'vittata', accessories: { eyes: { id: 'gafas', color: '#2b2b2b' }, neck: { id: 'panuelo', color: '#d6403a' } } } };
    const p1 = (await G.creador.portraitCanvasFor(256, false)).toDataURL(), p2 = (await G.creador.portraitCanvasFor(256, false)).toDataURL();
    check('El retrato del cómic es idéntico en cada render', p1 === p2 && p1.length > 5000, Math.round(p1.length / 1024) + ' KB');
    S.profile = prevProfile;
    return result();
  }

  // La plantilla carga: otro content pack arranca un juego distinto con el mismo motor (en un iframe oculto)
  async function templateTest(opts) {
    opts = opts || {};
    const { check, result } = runner();
    const packId = opts.pack || 'plantilla';
    const url = new URL(location.href); url.searchParams.set('pack', packId);
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;';
    fr.src = url.href;
    document.body.appendChild(fr);
    const t0 = performance.now();
    let W = null;
    // QA-60: con la máquina cargada el iframe tarda más de 30 s y la prueba salía en falso rojo
    while (performance.now() - t0 < (opts.timeout || 90000)) {
      await new Promise(r => setTimeout(r, 150));
      try { W = fr.contentWindow; if (W && W.AV && W.AV.pack) break; } catch (e) { /* aún cargando */ }
      W = null;
    }
    if (!W) { fr.remove(); check('La plantilla arranca en un iframe (?pack=' + packId + ')', false, 'sin window.AV tras ' + Math.round((performance.now() - t0) / 1000) + ' s'); return result(); }
    const A = W.AV, G2 = A.G, P = G2.pack, doc = W.document;
    const K = G2.guardado.KEY, read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const keep = read(K), keepPrev = read(K + '.prev');
    try {
      check('La plantilla arranca con su propio content pack', A.pack === packId && P.id === packId, A.pack);
      check('Mismo motor: todos los módulos instanciados', W.AVE.modules().every(m => !!G2[m]), W.AVE.modules().length + ' módulos');
      // contra la clave del cap. 1 aunque la prueba corra desde la pestaña del propio pack (?pack=epN, la ronda de QA BE4)
      const K1 = G.pack.id === 'cap1' ? G.guardado.KEY : 'amazonaverse.save';
      check('Guarda aparte de cap1 (otra clave de localStorage)', G2.guardado.KEY !== K1, G2.guardado.KEY);
      check('Nada del capítulo 1 en la plantilla', !G2.interaccion.find('maquina') && !G2.interaccion.find('transmisor') && !G2.actores.npc('luma'));
      check('Su historia en el HUD', doc.querySelectorAll('#steps li').length === G2.misiones.steps.length && G2.misiones.steps.length > 0 &&
        doc.querySelector('#steps li').textContent.startsWith(G2.misiones.steps[0].texto), G2.misiones.steps.length + ' pasos');
      check('Sus textos en el HUD', !P.meta.hud || doc.querySelector('#quest h1').textContent === P.meta.hud.titulo, doc.querySelector('#quest h1').textContent);
      check('Su mundo: NPC, objetos y Diario propios', Object.keys(G2.actores.npcs).length === (P.npcs || []).length && G2.objetos.recursos.length === (P.recursos || []).length && G2.diario.total === ((P.diario || {}).entradas || []).length,
        `${Object.keys(G2.actores.npcs).length} NPC, ${G2.objetos.recursos.length} objetos, ${G2.diario.total} hallazgos`);
      if (A.selfTest) {
        const r = await A.selfTest();
        for (const x of r.results) check('Plantilla · ' + x.name, x.ok, x.extra);
      } else check('La plantilla trae su selfTest', false);
      const errs = W.__aveErrores || [];
      check('Sin errores de JavaScript en la plantilla', errs.length === 0, errs.slice(0, 3).join(' | '));
    } finally {
      const put = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } };
      put(K, keep); put(K + '.prev', keepPrev); // la partida de la plantilla queda como estaba
      try { G2.renderer.renderer.dispose(); G2.renderer.renderer.forceContextLoss(); } catch (e) { /* ya cerrado */ }
      if (!opts.keep) fr.remove();
    }
    return result();
  }

  return { teleport, tick, drain, useAt, runner, keepSave, restoreSave, accessoryTest, templateTest };
});
