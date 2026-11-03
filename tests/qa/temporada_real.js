/* CG-23 · la temporada en el mapa real, seguida, en español (AV.temporadaRealTest).
   Juega los capítulos 2 a 6 con los recorridos que ya caminan o vuelan (AV.ep2e2eTest … AV.ep6e2eTest,
   y esos llaman a AV.epCaminar salvo el 2, que es el recorrido del que salió). No modifica ep_caminar.js.
   Entre un capítulo y el siguiente guarda y recarga ese capítulo: al cerrarse su iframe se copia la partida
   (el recorrido la devuelve al respaldo) y se abre otra vez para ver que el paso sigue.
   La clave amazonaverse.temporada no se borra entre capítulos, para que lo elegido en uno llegue al siguiente.
   Lo que se trabe queda en results (paso en rojo). Carga: inyectar y await AV.temporadaRealTest(). */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 80); }
    return null;
  }
  const PARTIDA = /^(ep[2-6](\.|$)|amazonaverse\.temporada|aula\.ep[2-6]|aula\.cap[2-6])/;
  function foto() {
    const o = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && PARTIDA.test(k)) o[k] = localStorage.getItem(k);
      }
    } catch (e) { /* sin almacenamiento */ }
    return o;
  }
  function poner(o) { try { for (const k of Object.keys(o)) localStorage.setItem(k, o[k]); } catch (e) { /* sin almacenamiento */ } }
  function pasoDe(tomada, pack) {
    const k = Object.keys(tomada || {}).find(x => x === pack + '.save');
    if (!k) return null;
    try { const d = JSON.parse(tomada[k]); return { step: d.step, complete: !!d.complete }; } catch (e) { return null; }
  }
  async function conFoto(fn) {
    let tomada = null;
    const relojes = new Map();
    const copiar = n => {
      try {
        const G = n.contentWindow && n.contentWindow.AV && n.contentWindow.AV.G;
        if (G && G.guardado && G.S && G.S.profile && G.S.profile.created && G.guardado.save(true) !== false) tomada = foto();
      } catch (e) { /* todavía arranca */ }
    };
    const obs = new MutationObserver(recs => {
      for (const r of recs) {
        for (const n of r.addedNodes) if (n && n.tagName === 'IFRAME') {
          const id = setInterval(() => copiar(n), 1000);
          relojes.set(n, id);
        }
        for (const n of r.removedNodes) if (n && n.tagName === 'IFRAME') {
          clearInterval(relojes.get(n)); relojes.delete(n); copiar(n);
        }
      }
    });
    obs.observe(document.body, { childList: true });
    let res;
    try { res = await fn(); }
    finally { obs.disconnect(); for (const id of relojes.values()) clearInterval(id); }
    if (tomada) poner(tomada);
    return { res, tomada };
  }
  async function recargar(pack, query, tomada, esperado) {
    poner(tomada || {});
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
    const url = new URL(location.href); url.search = '?pack=' + pack + (query || ''); url.hash = '';
    fr.src = url.href; document.body.appendChild(fr);
    const listo = x => x && x.AV && x.AV.pack === pack && x.AV.G && x.AV.G.guardado && x.AV.G.actores && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x;
    const W = await until(() => listo(fr.contentWindow), 240000, 100);
    let ok = false, extra = 'no arrancó';
    if (W) {
      await sleep(400);
      let cargo = false;
      try { cargo = W.AV.G.guardado.load(true) === true; } catch (e) { cargo = false; }
      await sleep(300);
      const step = W.AV.G.S.step, complete = !!W.AV.G.S.complete;
      ok = cargo && !!esperado && step === esperado.step && complete === esperado.complete;
      extra = 'paso ' + step + ' (guardado ' + (esperado ? esperado.step : '?') + ') completo ' + complete + (cargo ? '' : ' sin carga');
    }
    try { if (W && W.AV.G.renderer && W.AV.G.renderer.renderer) { W.AV.G.renderer.renderer.dispose(); W.AV.G.renderer.renderer.forceContextLoss(); } } catch (e) { /* ya cerrado */ }
    fr.remove();
    return { ok, extra };
  }
  const CAPS = [
    { pack: 'ep2', n: 2, query: '', jugar: o => window.AV.ep2e2eTest(o) },
    { pack: 'ep3', n: 3, query: '', jugar: o => window.AV.ep3e2eTest(o) },
    { pack: 'ep4', n: 4, query: '', jugar: o => window.AV.ep4e2eTest(o) },
    { pack: 'ep5', n: 5, query: '&mapa=real', jugar: o => window.AV.ep5e2eTest(Object.assign({ mapa: 'real' }, o)) },
    { pack: 'ep6', n: 6, query: '&mapa=real', jugar: o => window.AV.ep6e2eTest(Object.assign({ mapa: 'real' }, o)) }
  ];
  window.AV = window.AV || {};
  window.AV.temporadaRealTest = async function (opts) {
    opts = opts || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: ok === true, extra: extra == null ? '' : String(extra).slice(0, 500) });
    const faltan = ['epCaminar', 'ep2e2eTest', 'ep3e2eTest', 'ep4e2eTest', 'ep5e2eTest', 'ep6e2eTest'].filter(k => !window.AV[k]);
    if (faltan.length) {
      check('Están los apoyos de caminar', false, faltan.join(', '));
      return { ok: false, passed: 0, total: out.length, results: out };
    }
    const quitar = localStorage.removeItem.bind(localStorage);
    try {
      try { quitar('amazonaverse.temporada'); } catch (e) { /* sin almacenamiento */ }
      localStorage.removeItem = function (k) {
        if (k === 'amazonaverse.temporada') return;
        return quitar(k);
      };
      const idioma = opts.idioma === 'en' ? 'en' : 'es';
      for (const c of (opts.caps || CAPS)) {
        const { res, tomada } = await conFoto(() => c.jugar({ idioma, timeout: opts.timeout || 240000 }));
        const mal = ((res && res.results) || []).filter(x => !x.ok);
        check('Cap. ' + c.n + ' se juega a pie o volando, en ' + (idioma === 'en' ? 'inglés' : 'español'), !!(res && res.ok), mal.slice(0, 4).map(x => x.name + (x.extra ? ' (' + x.extra + ')' : '')).join(' | ') || (res ? res.passed + '/' + res.total : 'sin resultado'));
        const rec = await recargar(c.pack, c.query, tomada, pasoDe(tomada, c.pack));
        check('Cap. ' + c.n + ' · al guardar y recargar el paso sigue', rec.ok, rec.extra);
      }
    } catch (e) {
      check('El recorrido sigue sin excepción', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      localStorage.removeItem = quitar;
    }
    const passed = out.filter(x => x.ok).length;
    return { ok: passed === out.length, passed, total: out.length, results: out };
  };
})();
