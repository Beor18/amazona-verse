/* Juego · CG-47. Coste por cuadro de los módulos nuevos, en el hilo del juego (no en la GPU).
   Cada uno tiene que quedar por debajo de 0,5 ms y entre todos por debajo de 2 ms, en silencio y también cerca.
   Ciudad viva y comunidades no se reescriben: en calidad baja no se cargan y, lejos, su update sale al momento;
   dibujan en las mallas de la bandada (0 draw calls propios). window.AVRendimientoModulos(G). */
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
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    G.quiet = guard.quiet; S.pos.x = guard.x; S.pos.y = guard.y; S.pos.z = guard.z; M.flying = guard.flying;
    if (G.renderer.calidad) G.renderer.calidad.nivel = guard.nivel;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.rendimientoModulos = { test };
  return G.rendimientoModulos;
};
