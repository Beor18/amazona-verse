/* CG-58 · playtest automatizado del niño nuevo en móvil (AV.playtestAutoTest).
   Capítulos 1 a 6, iframe 390×844, calidad baja, toques en el joystick y los botones.
   No teletransporta ni escribe el paso: usa AV.epCaminar (caps. 3 a 6 con su tarjeta; 1 y 2 con la guía sola).
   Mide los segundos de juego de cada paso, un atasco si pasan 30 s sin avanzar, las veces que abre la guía
   y si el objetivo queda vacío. No sustituye el playtest con niños. */
(function () {
  'use strict';
  window.AV = window.AV || {};
  function fila(n, t) {
    const atascos = t.atascos || [];
    const lento = atascos.some(a => /30 s/.test(a));
    const vacio = atascos.some(a => /sin saber/.test(a));
    return {
      name: 'Cap. ' + n + ' · ' + t.nombre,
      ok: true,
      extra: t.simS + ' s · ' + t.metros + ' m · guía ' + (t.guias || 0) + (lento ? ' · >30 s' : '') + (vacio ? ' · sin objetivo' : '') + (atascos.length ? ' · ' + atascos.join('; ') : '')
    };
  }
  async function medir(n, opts) {
    const o = Object.assign({ idioma: 'es', tacto: true, movil: true, playtest: true, timeout: 180000 }, opts || {});
    const out = [];
    const ok = (name, pass, extra) => out.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra).slice(0, 800) });
    if (!window.AV.epCaminar) {
      ok('Cap. ' + n + ' tiene el recorrido sin teleport', false, 'falta epCaminar');
      return { passed: 0, total: 1, results: out };
    }
    let res = null;
    try {
      if (n >= 3 && window.AV['ep' + n + 'e2eTest']) res = await window.AV['ep' + n + 'e2eTest'](Object.assign({}, o, n >= 5 ? { mapa: 'real' } : {}));
      else res = await window.AV.epCaminar({ pack: n === 1 ? 'cap1' : 'ep' + n, n: n, query: n >= 5 ? '&mapa=real' : '', maxIter: 120 }, o);
    } catch (e) {
      ok('Cap. ' + n + ' se mide', false, e && e.message);
      return { passed: 0, total: 1, results: out };
    }
    const es = res && res.tramos && res.tramos.es;
    const tramos = (es && es.tramos) || [];
    const mal = ((res && res.results) || []).filter(x => !x.ok).slice(0, 3).map(x => x.name + (x.extra ? ' (' + String(x.extra).slice(0, 140) + ')' : '')).join(' | ');
    ok('Cap. ' + n + ' se juega con toques, sin teleport', !!(res && res.ok), (res ? res.passed + '/' + res.total : 'sin resultado') + (mal ? ' · ' + mal : ''));
    tramos.forEach(t => out.push(fila(n, t)));
    if (!tramos.length) ok('Cap. ' + n + ' deja tiempos por paso', false, 'sin tramos');
    return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
  }
  window.AV.playtestAutoTest = async function (opts) {
    const caps = (opts && opts.caps) || [1, 2, 3, 4, 5, 6];
    const out = [];
    for (const n of caps) {
      const r = await medir(n, opts);
      out.push.apply(out, r.results);
    }
    return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
  };
  for (let n = 1; n <= 6; n++) window.AV['playtestCap' + n + 'Test'] = (opts => medir(n, opts));
})();
