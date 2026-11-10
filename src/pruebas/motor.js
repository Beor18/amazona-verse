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
  // Guarda la partida del jugador antes de una prueba y la devuelve al final.
  // QA-111: si el perfil ya está creado pero el autoguardado aún no escribió (debounce de 0,5 s de juego tras
  // «Empezar», que con CPU ×4 se estira a segundos), se flushea ahora; sin esto keepSave() devolvía null, la
  // prueba acababa con reset(true) (created=false) y restoreSave(null) reabría el creador con el mundo oculto.
  function keepSave() {
    try {
      const k = localStorage.getItem(G.guardado.KEY);
      if (k) return k;
      if (G.S.profile && G.S.profile.created) { G.guardado.save(true); return localStorage.getItem(G.guardado.KEY); }
    } catch (e) { /* sin almacenamiento */ }
    return null;
  }
  function restoreSave(keep) {
    try { if (keep) localStorage.setItem(G.guardado.KEY, keep); } catch (e) { /* sin almacenamiento */ }
    if (keep) G.guardado.load(true); else G.creador.open(true);
  }

  // Combat Animation 2.0 (docs/equipo/AUDITORIA_ANIMACION_COMBATE.md): pico que abre hacia -X, sílabas al hablar, abanico de
  // plumas, cola con muelle y mirar. Con una instancia propia, sin escena: solo update() a 60 Hz.
  async function caraTest(check) {
    let ch; try { ch = await window.AVCharacter.create(); } catch (e) { check('Cara: el modelo carga', false, String(e)); return; }
    if (!ch.pico || !ch.alas) { check('Cara: la API pico/hablar/alas/colaImpulso/mirar existe', false); return; }
    const B = ch.bones, dt = 1 / 60, paso = n => { for (let i = 0; i < n; i++) ch.update(dt); };
    const r3 = v => Math.round(v * 1000) / 1000;
    ch.expression = 'neutral'; paso(40);
    // 1. Pico: abrir gira el hueso hacia -X y baja la punta de la mandíbula (punto delante del pico, en el espacio del hueso)
    const inv = ch.restMat.pico.clone().invert(), tipL = new THREE.Vector3(0, 0.86, 0.46).applyMatrix4(inv), w = new THREE.Vector3();
    const tipY = () => { ch.root.updateMatrixWorld(true); return w.copy(tipL).applyMatrix4(B.pico.matrixWorld).y; };
    const x0 = B.pico.rotation.x, y0 = tipY();
    ch.pico(1); paso(20);
    const x1 = B.pico.rotation.x, y1 = tipY();
    check('Pico: abrir gira el hueso hacia -X (~0,55 rad) y baja la mandíbula', x1 - x0 < -0.45 && x1 - x0 > -0.65 && y1 < y0 - 0.01, 'Δx ' + r3(x1 - x0) + ' rad, punta ' + r3((y1 - y0) * 100) + ' cm');
    ch.pico(0); paso(40);
    ch.pico(1, 200); paso(10); const abierto = ch.talkV; paso(45);
    check('Pico: pico(1, 200 ms) abre rápido y se cierra solo', abierto > 0.35 && ch.talkV < 0.03, r3(abierto) + ' → ' + r3(ch.talkV) + ' rad');
    // 2. Hablar: sílabas de 6 a 9 por segundo, irregulares, de 0,25 a 0,35 rad como mucho; al callar se cierra
    ch.hablar(true); const xs = [];
    for (let i = 0; i < 180; i++) { paso(1); xs.push(ch.talkV); }
    ch.hablar(false); paso(30);
    const mx = Math.max(...xs), cruces = [];
    for (let i = 1; i < xs.length; i++) if (xs[i] > mx * 0.3 && xs[i - 1] <= mx * 0.3) cruces.push(i);
    const hz = cruces.length / 3, ints = cruces.slice(1).map((c, i) => c - cruces[i]), dif = new Set(ints).size;
    check('Hablar: el pico aletea en sílabas de 6 a 9 por segundo (no un seno) y se cierra al callar', hz >= 4.5 && hz <= 10 && dif >= 3 && mx > 0.2 && mx < 0.38 && ch.talkV < 0.03,
      hz.toFixed(1) + ' Hz, ' + dif + ' duraciones distintas, máx ' + r3(mx) + ' rad, al callar ' + r3(ch.talkV));
    // 3. Alas: alas(1, 1) abre el abanico (la cadena de delante y la de atrás se separan) y alas(0, 0) lo pliega
    const cL = ch.alasCad && ch.alasCad.L, sep = () => { ch.root.updateMatrixWorld(true); const a = cL[0].c[2].getWorldPosition(new THREE.Vector3()), b = cL[3].c[2].getWorldPosition(new THREE.Vector3()); return a.distanceTo(b); };
    const s0 = cL ? sep() : 0, r0 = cL ? cL[0].c[0].rotation.x : 0;
    ch.alas(1, 1); paso(60);
    const s1 = cL ? sep() : 0, r1 = cL ? cL[0].c[0].rotation.x : 0, abre = ch.estadoCara().alas;
    ch.alas(0, 0); paso(60);
    const s2 = cL ? sep() : 0;
    check('Alas: alas(1, 1) abre las plumas en abanico y alas(0, 0) las pliega', !!cL && abre > 0.95 && Math.abs(r1 - r0) > 0.3 && s1 > s0 * 1.25 && Math.abs(s2 - s0) < s0 * 0.1,
      'separación ' + r3(s0) + ' → ' + r3(s1) + ' → ' + r3(s2) + ', raíz ' + r3(r1 - r0) + ' rad');
    // 4. Cola: muelle que responde a un golpe y al frenar, y se asienta
    ch.alas(null); ch.colaImpulso(1); const cs = [];
    for (let i = 0; i < 150; i++) { paso(1); cs.push(ch.colaSp.x); }
    const pico1 = Math.max(...cs.map(Math.abs)), fin1 = Math.abs(cs[cs.length - 1]);
    for (let i = 0; i < 40; i++) { ch.root.position.z += 6 * dt; paso(1); }
    const cf = []; for (let i = 0; i < 150; i++) { paso(1); cf.push(ch.colaSp.x); }
    const frena = Math.max(...cf.slice(0, 30)), fin2 = Math.abs(cf[cf.length - 1]);
    ch.root.position.set(0, 0, 0); paso(5);
    check('Cola: el muelle responde a colaImpulso y al frenar (sube) y se asienta en 2,5 s', pico1 > 0.15 && fin1 < 0.01 && frena > 0.04 && fin2 < 0.01,
      'golpe ' + r3(pico1) + ' → ' + r3(fin1) + ', frenar ' + r3(frena) + ' → ' + r3(fin2) + ' rad');
    // 5. Mirar: un objetivo a un lado gira la cabeza hacia allí
    paso(30); const y0c = B.cabeza.rotation.y;
    ch.mirar(new THREE.Vector3(3, 1.2, 1)); paso(90); const y1c = B.cabeza.rotation.y; ch.mirar(null); paso(5);
    check('Mirar: mirar(objetivo) gira la cabeza hacia el objetivo', Math.abs(y1c - y0c) > 0.3, 'giro ' + r3(y1c - y0c) + ' rad');
    try { window.AVCharacter.disposeObject(ch.root, true); } catch (e) { /* nada */ }
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
    ch.applyLook({ species: 'festiva', accessories: {} });
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
      // BM157 · Traje de Guardián: pieza de Blender con piel; la TELA toma el color elegido y cambia al recolorear; la corona
      // (2.º grupo, rígida a la cabeza) se ve sola y se apaga con un casco; quitarlo deja montar la camisa de nuevo
      {
        const tj = window.AVCharacter.ACCESSORIES.find(a => a.id === 'traje'), info = [];
        const linHex = h => '#' + new THREE.Color(h).convertSRGBToLinear().getHexString();
        const mats = () => (ch.mounted.torso ? ch.mounted.torso.objects : []).flatMap(o => [].concat(o.material));
        const tiene = h => mats().some(m => m.color && !m.userData.avHeadPart && ('#' + m.color.getHexString() === linHex(h)));
        const corona = () => mats().filter(m => m.userData.avHeadPart);
        let ok = !!tj;
        if (tj) {
          ch.applyLook({ species: 'vittata', accessories: { torso: { id: 'traje', color: tj.colors[1] } } });
          const m1 = ch.mounted.torso, c1 = tiene(tj.colors[1]);
          ok = ok && !!(m1 && m1.blender && m1.objects.every(o => o.isSkinnedMesh && o.parent)) && c1; info.push('glb ' + !!(m1 && m1.blender), 'color ' + c1);
          const cr = corona(); ok = ok && cr.length === 1 && cr[0].visible; info.push('corona ' + cr.length);
          ch.root.updateMatrixWorld(true);
          let ojo = 0; for (const o of ch.mounted.torso.objects) { const p = o.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i += 3) { o.boneTransform ? o.boneTransform(i, v.fromBufferAttribute(p, i)) : v.fromBufferAttribute(p, i); v.applyMatrix4(o.matrixWorld); if (eyes.some(e => e.distanceTo(v) < EYE_R)) ojo++; } }
          ok = ok && ojo === 0; info.push('ojos ' + ojo);
          ch.applyLook({ species: 'festiva', accessories: { torso: { id: 'traje', color: tj.colors[2] } } });
          const c2 = tiene(tj.colors[2]) && !tiene(tj.colors[1]); ok = ok && c2 && ch.mounted.torso.objects[0] !== m1.objects[0] && !m1.objects[0].parent; info.push('recolor ' + c2);
          ch.applyLook({ species: 'festiva', accessories: { torso: { id: 'traje', color: tj.colors[2] }, head: { id: 'casco', color: '#f2c21a', style: 'constructor' } } });
          const sinCorona = corona().length === 1 && !corona()[0].visible && !!ch.mounted.head; ok = ok && sinCorona; info.push('casco sin corona ' + sinCorona);
          ch.applyLook({ species: 'festiva', accessories: { torso: { id: 'traje', color: tj.colors[2] } } });
          ok = ok && corona()[0].visible;
          ch.applyLook({ species: 'vittata', accessories: { torso: { id: 'camisa', color: '#d6403a', style: 'liso' } } });
          const cam = ch.mounted.torso; ok = ok && !!(cam && cam.id === 'camisa' && cam.objects.length && corona().length === 0); info.push('camisa ' + !!(cam && cam.blender));
        }
        check('El traje de Guardián se monta del .glb, toma y cambia el color, y su corona cede al sombrero', ok, info.join(', '));
      }
      ch.applyLook({ species: 'festiva', accessories: {} });
    }
    // BM124 (2-nov): todas las especies del creador tienen piel; la máscara facial va pintada en la piel de cada especie
    // (antes festiva era la única con máscara por tinte y sin piel). Se comprueba que el plumaje pone la piel de festiva.
    if (window.AVE && AVE.pieles) await AVE.pieles.listo(ch);
    const mapas = []; ch.root.traverse(m => { if ((m.isSkinnedMesh || m.isMesh) && !m.userData.isAccessory && m.material && m.material.map) mapas.push(m.material.map.name || ''); });
    const conPiel = mapas.some(n => n === 'piel_festiva');
    check('El plumaje cambia la cara: festiva lleva su piel (máscara pintada) y el tinte se apaga', conPiel && (!ch.tint || ch.tint.tintOn.value.length() === 0), [...new Set(mapas)].join(',') || 'sin mapas');
    await caraTest(check);
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
      const paso0 = G2.misiones.steps[0].texto, li0 = doc.querySelector('#steps li'), visto = li0 ? li0.textContent : '';
      const tr = t => (G2.idioma && G2.idioma.tr ? G2.idioma.tr(t) : t);
      check('Su historia en el HUD', doc.querySelectorAll('#steps li').length === G2.misiones.steps.length && G2.misiones.steps.length > 0 &&
        (visto.startsWith(paso0) || visto.startsWith(tr(paso0))), G2.misiones.steps.length + ' pasos · ' + visto.slice(0, 48));
      const tit = P.meta.hud && P.meta.hud.titulo, h1 = doc.querySelector('#quest h1');
      check('Sus textos en el HUD', !tit || (h1 && (h1.textContent === tit || h1.textContent === tr(tit))), h1 && h1.textContent);
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
