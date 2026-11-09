/* QA · Modo Escuela (QA-181): recortes de CPU por cuadro (AV.escuelaTest) · no cambia el juego, solo lo mide
   Comprueba que el recorte va SOLO con calidad.escuela === true (con el modo apagado, todo como antes) y que el juego
   sigue funcionando con el modo encendido:
   - IK de patas de Vittata (character.js): con ikEscuela, el IK se calcula un cuadro de cada dos y el otro repite la
     corrección (sin consultas de suelo ni CCD); actores.js lo pone con el modo y quita el IK con la cámara a más de 12 m.
   - Multitud adaptativa de la ciudad viva (QA-182, ciudad_viva.js): con FPS simulados, solo con el modo o el auto en «bajo»,
     histéresis (<27 FPS 2 s quita un escalón, >33 FPS 4 s lo devuelve), primero fuera de cámara y las lejanas, fundido sin
     «pop», piso duro, la vittata y lo marcado como necesario no se quitan, y en modo normal todo igual.
   Medido por separado (cada recorte, su commit y su medición; regla de Kelvin 8-nov): la animación a menos ritmo de los
   animados lejanos y los topes de partículas/mariposas dieron una ganancia marginal en cap1/ep3 y se descartaron.
   Restaura el modo, la cámara y el personaje al terminar. Carga: inyectar y await AV.escuelaTest(). */
(function () {
  'use strict';
  window.AV = window.AV || {};
  window.AV.escuelaTest = async function () {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: ok === true, extra: extra == null ? '' : String(extra).slice(0, 400) });
    const G = window.AV.G, S = window.AV.state || G.S, R = G.renderer, C = R.calidad;
    const esc0 = C.escuela, auto0 = C.escuelaAuto;
    const poner = on => { R.setEscuela(on, true); };
    const restaurar = () => { if (esc0 === true) R.setEscuela(true, true); else if (esc0 === false) R.setEscuela(false, true); else R.setEscuela(null, true); C.escuelaAuto = auto0; };
    const cam = R.camera.position, cam0 = cam.clone();
    const A = G.actores, P = A && A.player3D;
    await new Promise(r => setTimeout(r, 0));
    try {
      // ---------- 0. La bandera ----------
      poner(false);
      check('Bandera: setEscuela(false) deja calidad.escuela en false (modo normal)', C.escuela === false, 'escuela ' + String(C.escuela));

      // ---------- 1. IK de patas (character.js) ----------
      if (!P || !P.feet || P.feet.length !== 2) check('IK de patas: hay modelo 3D de Vittata con dos patas', false, A && A.failed3D ? 'sin 3D' : 'sin patas');
      else {
        const guard = { groundAt: P.groundAt, airborne: P.airborne, swimming: P.swimming, ikEscuela: P.ikEscuela, fkW: P.fkW };
        const base = (x, z) => G.fisica.suelo(x, z, S.pos.y + 0.05);
        let n = 0; P.groundAt = (x, z) => { n++; return base(x, z); };
        P.airborne = false; P.swimming = false; P.fkW = 1;
        const _v = new THREE.Vector3(), pies = () => { P.root.updateMatrixWorld(true); return P.feet.map(f => f.eff.getWorldPosition(_v).toArray()); };
        const cuadro = esc => { P.ikEscuela = esc; n = 0; P.update(1 / 60); return { n, feet: !!P.ikFeet, err: Array.isArray(P.ikErr), huesos: P._ikEsc && P._ikEsc.ok ? P._ikEsc.n : 0 }; };
        const off = [cuadro(false), cuadro(false), cuadro(false)];
        check('IK normal: las mismas consultas de suelo cada cuadro y el IK aplicado', off[0].n > 0 && off.every(c => c.n === off[0].n && c.feet && c.err), off.map(c => c.n).join('/'));
        const on = [cuadro(true), cuadro(true), cuadro(true), cuadro(true)];
        check('IK escuela: se calcula un cuadro de cada dos (calcula, repite, calcula, repite: consultas de suelo)', on[0].n === off[0].n && on[1].n === 0 && on[2].n === off[0].n && on[3].n === 0, on.map(c => c.n).join('/') + ' (normal ' + off[0].n + ')');
        check('IK escuela: el IK se sigue aplicando todos los cuadros (pies con suelo y la corrección de los huesos repetida)', on.every(c => c.feet && c.err) && on[1].huesos > 0, 'huesos ' + on[1].huesos);
        // Fidelidad: en un cuadro de repetición, los pies frente al IK completo calculado sobre la misma pose animada
        let errMax = 0;
        for (let k = 0; k < 3; k++) {
          cuadro(true); const y0 = P.root.position.y; const r = cuadro(true); if (r.n !== 0) continue;
          const A = pies(); P._restoreIK(); P.root.position.y = y0; P.ikEscuela = false; P._footIK(0); const B = pies(); P._restoreIK(); P.root.position.y = y0;
          errMax = Math.max(errMax, ...A.map((a, i) => Math.hypot(a[0] - B[i][0], a[1] - B[i][1], a[2] - B[i][2])));
        }
        // solo cuenta con Vittata en el suelo de verdad (en el juego el IK va solo así); en el aire la prueba fuerza el IK con los pies al tope
        const pisa = !!G.fisica.MOVE.grounded;
        check('IK escuela: en el cuadro repetido los pies quedan a menos de 1,5 cm de donde los pondría el IK completo (Vittata en el suelo)', !pisa || errMax < 0.015, (errMax * 100).toFixed(2) + ' cm' + (pisa ? '' : ' (no pisa suelo: informativo)'));
        const vuelta = [cuadro(false), cuadro(false)];
        check('IK: al apagar el modo vuelve a consultar cada cuadro', vuelta.every(c => c.n === off[0].n), vuelta.map(c => c.n).join('/'));
        Object.assign(P, guard);
        // actores.js: la marca ikEscuela y el corte con la cámara lejos
        const lejos = (A.IK_LEJOS_ESC || 12) + 20;
        cam.set(P.root.position.x + lejos, P.root.position.y + 2, P.root.position.z);
        const offLejos = A.ikCerca ? A.ikCerca(P.root) : null;
        poner(true);
        const onLejos = A.ikCerca ? A.ikCerca(P.root) : null;
        cam.set(P.root.position.x, P.root.position.y + 2.5, P.root.position.z + 7.5);
        const onCerca = A.ikCerca ? A.ikCerca(P.root) : null;
        check('IK y cámara: sin el modo, siempre con IK; con el modo, sin IK a más de 12 m y con IK a la distancia normal (7,5 m)', offLejos === true && onLejos === false && onCerca === true, 'normal lejos ' + offLejos + ' · escuela lejos ' + onLejos + ' · escuela cerca ' + onCerca);
        cam.copy(cam0);
        A.sync3D(1 / 60, false, false); const marcaOn = P.ikEscuela;
        poner(false); A.sync3D(1 / 60, false, false); const marcaOff = P.ikEscuela;
        check('actores.js pone ikEscuela solo con el modo', marcaOn === true && marcaOff === false, 'on ' + marcaOn + ' · off ' + marcaOff);
      }

      // ---------- 1b. Multitud adaptativa de la ciudad viva (QA-182, ciudad_viva.js) ----------
      await multitud(check, poner, C, R);

      // ---------- 2. Jugar con el modo encendido ----------
      poner(true);
      const err0 = (window.__err || []).length; let exc = null;
      const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
      try {
        for (let i = 0; i < 60; i++) { const busy = G.ui.busy(); const mv = G.fisica.step(1 / 60, busy); G.emit('update', 1 / 60, busy, mv); G.camara.follow(1 / 60); G.emit('render', 1 / 60, i / 60, mv); G.camara.fov(1 / 60); }
      } catch (e) { exc = String(e && e.stack || e).slice(0, 300); }
      const enSuelo = G.fisica.MOVE.grounded;
      check('Con el modo: 60 cuadros de juego sin excepciones', !exc, exc || 'ok');
      check('Con el modo: Vittata sigue en el suelo y con IK de patas (cámara normal)', !P || !enSuelo || (P.ikEscuela === true && !!P.ikFeet), 'suelo ' + enSuelo + ' · ikFeet ' + !!(P && P.ikFeet) + ' · pos ' + [S.pos.x, S.pos.z].map(v => v.toFixed(1)).join(','));
      check('Con el modo: la posición no se va (sin deriva por el IK)', Math.hypot(S.pos.x - pos0.x, S.pos.z - pos0.z) < 0.5, Math.hypot(S.pos.x - pos0.x, S.pos.z - pos0.z).toFixed(3) + ' m');
      check('Con el modo: sin errores nuevos en consola', (window.__err || []).length === err0);
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 500));
    } finally {
      cam.copy(cam0);
      restaurar();
    }
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  };

  // QA-182 · multitud adaptativa: con FPS simulados (el medidor real no se toca), en la Ciudad de los 36 y con la cámara mirándola.
  async function multitud(check, poner, C, R) {
    const G = window.AV.G, CV = G.ciudadViva, MT = CV && CV.multitud, B = G.bandada;
    if (!MT || !B || !B.EXTRA) { check('Multitud: la ciudad viva expone su multitud adaptativa', false, CV ? 'sin multitud' : 'sin ciudad viva'); return; }
    const s = CV.sitio();
    if (!s) { check('Multitud: la Ciudad de los 36 está en el mapa', false, 'sin poi'); return; }
    const camara = R.camera, cam = camara.position, man0 = C.manual, niv0 = C.nivel, q0 = camara.quaternion.clone(), p0 = cam.clone();
    const aves = () => CV.aves(), H = (x, z) => G.terreno.height(x, z);
    const simular = (seg, fps, cada) => { for (let t = 0; t < seg - 1e-6; t += 0.1) { MT.paso(0.1, fps); if (cada) cada(); } };
    const centinela = { x: s.x, y: H(s.x, s.z) + 2, z: s.z, yaw: 0, pitch: 0, roll: 0, esc: 1.2, c: new THREE.Color(1, 0, 0), a: new THREE.Color(1, 0, 0), cob: 0, fase: 0, ala: 0, cab: 0, gir: 0, mision: 1 };
    try {
      CV.prueba(true); CV.pausa(true); CV.hora(12);
      poner(false); C.manual = true;   // equipo bueno en modo normal
      cam.set(s.x + 26, H(s.x, s.z) + 14, s.z + 26); camara.lookAt(s.x, H(s.x, s.z) + 3, s.z); camara.updateMatrixWorld();
      CV.paso(0.05, true); MT.reiniciar();
      const n0 = aves().length;
      // 1. modo normal en un equipo bueno: nada cambia, ni con FPS muy bajos
      simular(12, 12);
      CV.pintar();
      const ext = B.EXTRA.filter(e => e.ciudad), escIgual = aves().every(a => !a.lejos ? a.extra && a.extra.esc === a.esc : true);
      check('Multitud: en modo normal en un equipo bueno no cambia nada (12 s a 12 FPS simulados)', !MT.activa() && n0 > 0 && MT.objetivo() === n0 && MT.visibles() === n0 && aves().every(a => a.vis === 1 && !a.oculta) && escIgual && MT.cuenta().bajadas === 0,
        n0 + ' aves · objetivo ' + MT.objetivo() + ' · visibles ' + MT.visibles() + ' · dibujadas ' + ext.length + ' · escala intacta ' + escIgual);
      // 2. solo con el modo o con el auto en «bajo» (equipo lento); un «bajo» manual no cuenta
      C.manual = false; C.nivel = 'bajo'; const lento = MT.activa();
      C.manual = true; const bajoManual = MT.activa();
      C.nivel = niv0; poner(true); const conModo = MT.activa(); poner(false); const sinModo = MT.activa();
      check('Multitud: solo va con el Modo Escuela o con el auto en «bajo» (equipo lento)', lento === true && bajoManual === false && conModo === true && sinModo === false,
        'auto bajo ' + lento + ' · bajo manual ' + bajoManual + ' · escuela ' + conModo + ' · normal ' + sinModo);
      // 3. con el modo: histéresis con FPS simulados
      poner(true); CV.paso(0.05, true); MT.reiniciar(); MT.paso(0.1, 30);
      const n = aves().length, piso = MT.piso(), esc = MT.escalon();
      const fuera = MT.fuera(), dist = a => Math.hypot(a.x - cam.x, a.y - cam.y, a.z - cam.z);
      const clave = aves().filter(a => a.i !== 0).sort((a, b) => (fuera(b) - fuera(a)) || dist(b) - dist(a))[0];   // la primera candidata: se marca como necesaria
      if (clave) clave.clave = true;
      B.EXTRA.push(centinela);
      simular(1.9, 20); const a19 = MT.objetivo();
      simular(0.2, 20); const a21 = MT.objetivo();
      // prioridad: fuera de cámara antes que en pantalla, y las más lejanas antes
      const fueraAhora = MT.fuera(), rango = a => [fueraAhora(a) ? 1 : 0, dist(a)];
      const quitadas = aves().filter(a => a.quiere === false), quedan = aves().filter(a => a.quiere !== false && !MT.protegida(a));
      const mal = quitadas.filter(h => quedan.some(v => { const [fh, dh] = rango(h), [fv, dv] = rango(v); return fv > fh || (fv === fh && dv > dh + 1e-6); }));
      check('Multitud: <27 FPS 1,9 s no quita nada; a los 2 s quita un escalón', a19 === n && a21 === n - esc && quitadas.length === esc, 'n ' + n + ' · 1,9 s ' + a19 + ' · 2,1 s ' + a21 + ' · escalón ' + esc);
      check('Multitud: primero las de fuera de cámara y luego las más lejanas', mal.length === 0,
        quitadas.map(a => (fueraAhora(a) ? 'fuera ' : 'vista ') + dist(a).toFixed(0) + ' m').join(', ') + (mal.length ? ' · mal ' + mal.length : ''));
      // sin «pop»: en pantalla se apaga en ~0,6 s (nunca más de un sexto por paso de 0,1 s); de golpe solo fuera de cámara
      let pop = 0, minQ = Infinity, maxCaida = 0;
      const vigilar = () => {
        const f = MT.fuera();
        for (const a of aves()) { const v0 = a._v0 == null ? 1 : a._v0, caida = v0 - a.vis; if (caida > 0.1 / 0.6 + 1e-6 && !f(a)) pop++; if (!f(a)) maxCaida = Math.max(maxCaida, caida); a._v0 = a.vis; }
        minQ = Math.min(minQ, MT.quieren(), MT.visibles());
      };
      for (const a of aves()) a._v0 = a.vis;
      simular(10, 30, vigilar); const banda = MT.objetivo();
      for (let k = 0; k < 6; k++) { simular(1.5, 20, vigilar); simular(1.5, 36, vigilar); }
      const vaiven = MT.objetivo();
      check('Multitud: entre 27 y 33 FPS no cambia, y con FPS que van y vienen tampoco (histéresis)', banda === n - esc && vaiven === n - esc, 'banda ' + banda + ' · vaivén ' + vaiven);
      simular(40, 20, vigilar); const fondo = MT.objetivo();
      check('Multitud: con FPS bajos sostenidos baja hasta el piso y nunca por debajo (piso ' + piso + ' de ' + n + ')', fondo === piso && minQ >= piso && MT.visibles() >= piso && MT.cuenta().bajadas >= 2,
        'objetivo ' + fondo + ' · mínimo visto ' + minQ + ' · visibles ' + MT.visibles() + ' · bajadas ' + MT.cuenta().bajadas);
      check('Multitud: en pantalla se apagan con un fundido corto, sin «pop»', pop === 0, 'pops ' + pop + ' · mayor caída en pantalla por 0,1 s ' + maxCaida.toFixed(3));
      const v0 = aves().find(a => a.i === 0);
      check('Multitud: la vittata de la ciudad y un ave marcada como necesaria nunca se quitan', !!v0 && v0.quiere !== false && !v0.oculta && (!clave || (clave.quiere !== false && !clave.oculta && clave.vis === 1)),
        'vittata ' + (v0 ? v0.vis : '?') + ' · clave ' + (clave ? clave.vis + ' (era la primera candidata)' : 'sin'));
      CV.pintar(); B.dibujar && B.dibujar();
      const sigue = B.EXTRA.includes(centinela) && centinela.esc === 1.2 && centinela.x === s.x;
      check('Multitud: no toca a los personajes del juego (lo que otros módulos ponen en las mallas sigue igual)', sigue, 'centinela ' + sigue + ' · ciudad dibujadas ' + B.EXTRA.filter(e => e.ciudad).length);
      // vuelta: >33 FPS 3,9 s no devuelve; a los 4 s, un escalón; sostenido, todas
      simular(3.9, 36); const b39 = MT.objetivo(); simular(0.2, 36); const b41 = MT.objetivo();
      simular(60, 40); simular(1, 40);
      check('Multitud: >33 FPS 3,9 s no devuelve; a los 4 s un escalón; sostenido vuelven todas', b39 === piso && b41 === Math.min(n, piso + esc) && MT.objetivo() === n && MT.visibles() === n && aves().every(a => a.vis === 1),
        '3,9 s ' + b39 + ' · 4,1 s ' + b41 + ' · al final ' + MT.objetivo() + '/' + n + ' visibles ' + MT.visibles());
      // 4. al apagar el modo vuelven todas (con fundido) y no se quita nada más
      simular(20, 15); const conPocas = MT.visibles();
      poner(false); C.manual = true; simular(1, 15);
      check('Multitud: al volver al modo normal vuelven todas', conPocas < n && MT.objetivo() === aves().length && MT.visibles() === aves().length && aves().every(a => a.vis === 1 && !a.oculta),
        'con el modo ' + conPocas + ' · normal ' + MT.visibles() + '/' + aves().length);
    } catch (e) {
      check('Multitud: la prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
    } finally {
      const i = B.EXTRA.indexOf(centinela); if (i >= 0) B.EXTRA.splice(i, 1);
      for (const a of aves()) { delete a.clave; delete a._v0; }
      MT.reiniciar(); MT.fps(null);
      C.manual = man0; C.nivel = niv0;
      CV.prueba(false); CV.hora(null); CV.paso(0.05); CV.pausa(false);
      cam.copy(p0); camara.quaternion.copy(q0); camara.updateMatrixWorld();
    }
  }
})();
