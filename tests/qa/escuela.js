/* QA · Modo Escuela (QA-181): recortes de CPU por cuadro (AV.escuelaTest) · no cambia el juego, solo lo mide
   Comprueba que el recorte va SOLO con calidad.escuela === true (con el modo apagado, todo como antes) y que el juego
   sigue funcionando con el modo encendido:
   - IK de patas de Vittata (character.js): con ikEscuela, el IK se calcula un cuadro de cada dos y el otro repite la
     corrección (sin consultas de suelo ni CCD); actores.js lo pone con el modo y quita el IK con la cámara a más de 12 m.
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
})();
