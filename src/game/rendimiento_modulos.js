/* Juego · CG-47. Coste por cuadro de los módulos nuevos, en el hilo del juego (no en la GPU).
   Cada uno tiene que quedar por debajo de 0,5 ms y entre todos por debajo de 2 ms, en silencio y también cerca.
   Ciudad viva y comunidades no se reescriben: en calidad baja no se cargan y, lejos, su update sale al momento;
   dibujan en las mallas de la bandada (0 draw calls propios). T46: y el recorte de lo que queda fuera de cámara (renderer.js).
   window.AVRendimientoModulos(G). */
window.AVRendimientoModulos = function (G) {
  'use strict';
  const S = G.S, M = G.fisica.MOVE;
  const LISTA = ['trucos', 'humor', 'escondite', 'vecinos', 'sorpresas', 'marana'];
  function medir(fn, n) {
    const t0 = performance.now();
    for (let i = 0; i < n; i++) fn(1 / 60);
    return (performance.now() - t0) / n;
  }
  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guard = { quiet: G.quiet, x: S.pos.x, y: S.pos.y, z: S.pos.z, nivel: G.renderer.calidad && G.renderer.calidad.nivel, flying: M.flying };
    const cifras = { lejos: {}, cerca: {} };
    try {
      G.quiet = true;
      if (G.renderer.calidad) G.renderer.calidad.nivel = 'bajo';
      S.pos.x = 0; S.pos.z = 0; M.flying = false;
      let suma = 0;
      for (let i = 0; i < LISTA.length; i++) {
        const id = LISTA[i], mod = G[id], fn = mod && mod.paso;
        ok(id + ' expone su paso', typeof fn === 'function');
        if (typeof fn !== 'function') continue;
        const ms = medir(fn, 500);
        cifras.lejos[id] = ms; suma += ms;
        ok(id + ' lejos o en silencio < 0,5 ms', ms < 0.5, ms.toFixed(4) + ' ms');
      }
      ok('Los seis juntos, lejos, < 2 ms', suma < 2, suma.toFixed(4) + ' ms');
      G.quiet = false;
      if (G.renderer.calidad) G.renderer.calidad.nivel = 'medio';
      S.pos.x = 125; S.pos.z = 140; M.flying = true; M.speed = 8; S.pos.y = G.terreno.height(125, 140) + 0.5;
      suma = 0;
      for (let i = 0; i < LISTA.length; i++) {
        const id = LISTA[i], fn = G[id] && G[id].paso;
        if (typeof fn !== 'function') continue;
        const ms = medir(fn, 500);
        cifras.cerca[id] = ms; suma += ms;
        ok(id + ' cerca < 0,5 ms', ms < 0.5, ms.toFixed(4) + ' ms');
      }
      ok('Los seis juntos, cerca, < 2 ms', suma < 2, suma.toFixed(4) + ' ms');
      ok('Cifras', true, JSON.stringify(cifras));
      fueraDeCamara(ok);
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    G.quiet = guard.quiet; S.pos.x = guard.x; S.pos.y = guard.y; S.pos.z = guard.z; M.flying = guard.flying;
    if (G.renderer.calidad) G.renderer.calidad.nivel = guard.nivel;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  // T46: lo que queda fuera de cámara (InstancedMesh y personajes con esqueleto) no se dibuja. Mismo cuadro y misma cámara,
  // con el recorte apagado y encendido: lo que deja de dibujarse tiene que estar de verdad fuera, y lo de fuera tiene que bajar.
  function fueraDeCamara(ok) {
    const R = G.renderer, FC = R.fueraCamara;
    ok('T46 · el renderer expone el recorte fuera de cámara', !!FC && typeof FC.activo === 'boolean');
    if (!FC || !R.renderer.renderBufferDirect) return;
    const cam = R.camera, fr = new THREE.Frustum(), mm = new THREE.Matrix4(), mi = new THREE.Matrix4(), sp = new THREE.Sphere();
    const fuera = o => { // de verdad fuera: ninguna instancia (o el cuerpo entero) toca el cuadro
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      if (o.isInstancedMesh) { for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mi); sp.copy(g.boundingSphere).applyMatrix4(mi).applyMatrix4(o.matrixWorld); if (fr.intersectsSphere(sp)) return false; } return true; }
      sp.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); sp.radius += 0.5; return !fr.intersectsSphere(sp);
    };
    const sombra = () => !!(R.sun && R.sun.castShadow);
    // lo que el recorte puede apagar: instancias (≤ 4000) y cuerpos con esqueleto sin recorte de three; con sol, no lo que da sombra
    const candidato = o => (o.isInstancedMesh ? o.count > 0 && o.count <= 4000 : o.isSkinnedMesh && o.frustumCulled === false) && !(sombra() && o.castShadow) && !o.userData.sinCulling;
    const cuadro = activo => {
      const rr = R.renderer, orig = rr.renderBufferDirect, dib = new Set(); let n = 0, nFuera = 0;
      FC.activo = activo;
      rr.renderBufferDirect = function (c, sc, geo, mat, obj) { if (c === cam) { n++; dib.add(obj); if (candidato(obj) && fuera(obj)) nFuera++; } return orig.apply(this, arguments); };
      try { if (G.camara.place) G.camara.place(true); cam.updateMatrixWorld(); fr.setFromProjectionMatrix(mm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)); R.render(1 / 60, false); }
      finally { rr.renderBufferDirect = orig; FC.activo = true; }
      return { n, nFuera, dib, apagados: FC.ultimo };
    };
    const yaw0 = G.camara.yaw;
    try {
      const sp0 = (G.terreno.mapa || {}).spawn; if (sp0) { S.pos.x = sp0.x; S.pos.z = sp0.z; S.pos.y = G.terreno.height(sp0.x, sp0.z); }
      const filas = [];
      let malos = 0, antes = 0, despues = 0, callsA = 0, callsD = 0;
      for (const yaw of [0, Math.PI]) {
        G.camara.yaw = yaw;
        // tres pares alternados y el mínimo de cada lado: un precalentado o una carga de streaming en un cuadro suelto suma draw calls que no son del recorte
        let a = null, d = null;
        for (let k = 0; k < 3; k++) {
          const x = cuadro(false), y = cuadro(true);
          for (const o of x.dib) if (!y.dib.has(o) && !fuera(o)) malos++;
          if (!a || x.n < a.n) a = x; if (!d || y.n < d.n) d = y;
        }
        antes += a.nFuera; despues += d.nFuera; callsA += a.n; callsD += d.n;
        filas.push('giro ' + yaw.toFixed(1) + ': ' + a.n + '→' + d.n + ' calls, fuera ' + a.nFuera + '→' + d.nFuera + ', apagadas ' + d.apagados);
      }
      ok('T46 · lo que deja de dibujarse estaba de verdad fuera de cámara (nada visible desaparece)', malos === 0, malos + ' a la vista sin dibujar · ' + filas.join(' · '));
      ok('T46 · fuera de cámara se dibuja menos que sin el recorte (y nunca más draw calls)', (antes === 0 || despues < antes) && callsD <= callsA,
        'fuera ' + antes + '→' + despues + ' · calls ' + callsA + '→' + callsD + ' · ' + (G.renderer.calidad && G.renderer.calidad.nivel) + (sombra() ? ' con sombras' : ' sin sombras'));
    } catch (e) { ok('T46 · recorte fuera de cámara sin excepciones', false, e && e.message); }
    finally { G.camara.yaw = yaw0; FC.activo = true; }
  }
  G.rendimientoModulos = { test };
  return G.rendimientoModulos;
};
