/* QA · CG-17: el modo «Con dones» nunca publica en el ranking en línea (AV.cg17Test) · no toca el juego, solo lo mira
   Contrato (docs/equipo/TAREAS_CURSOR_GROK.md, CG-17, y PROPUESTA_PODERES_SECRETOS_BANDADAS.md §A.6):
   - Control: sin dones, una marca nueva de Tormenta ofrece «Publicar en el ranking» (datosRanking no es null).
   - Con dones (G.dones.conDones('norte')): datosRanking da null, así el botón no sale.
   - Con dones, aunque alguien llame a records.publicarRanking, no se abre el panel ni se llama a la red.
   La red nunca se toca: publicarRanking recibe un fetch espía y window.fetch se envuelve para contar llamadas a amazona-records.
   Carga: inyectar este archivo y await AV.cg17Test(). Devuelve { passed, total, results }. */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function cg17Test() {
    const R = [], ok = (name, c, extra) => R.push({ name, ok: !!c, extra: extra == null ? '' : String(extra) });
    const G = window.AV && window.AV.G;
    if (!G) return { passed: 0, total: 1, results: [{ name: 'Hay juego (AV.G)', ok: false, extra: '' }] };
    // fisica.js pide dones.js con un <script> propio; si aún no llegó (o se cortó), se carga igual que allí
    if (!G.dones) { try { if (!window.AVDones) await G.AVE.assets.script('src/game/dones.js'); if (window.AVDones && !G.dones) window.AVDones(G); } catch (e) { /* lo dice la prueba */ } }
    ok('G.dones.conDones existe', !!(G.dones && typeof G.dones.conDones === 'function'));
    if (!G.retosApi) { if (!window.AVRetos) await G.AVE.assets.script('src/game/retos.js'); window.AVRetos(G); }
    if (!G.recordsApi) { if (!window.AVRecords) await G.AVE.assets.script('src/game/records.js'); window.AVRecords(G); }
    const P = G.retosApi && G.retosApi.pruebas, rk = G.recordsApi;
    ok('Retos y récords cargan', !!(P && P.datosRanking && rk && rk.publicarRanking));
    if (!P || !rk || !G.dones) return { passed: R.filter(r => r.ok).length, total: R.length, results: R };
    const fetch0 = window.fetch; let red = 0;
    window.fetch = function (u) { if (/amazona-records|supabase/.test(String(u && u.url || u))) { red++; return Promise.reject(new Error('cg17Test: red bloqueada')); } return fetch0.apply(this, arguments); };
    try {
      const u = { modo: 'tormenta', puntos: 900 }, rec = { tormenta: { mejor: 900 } };
      G.dones.conDones(null);
      const sin = P.datosRanking('tormenta', u, rec);
      ok('Control: sin dones, una marca nueva ofrece el ranking', !!sin, JSON.stringify(sin));
      G.dones.conDones('norte');
      const con = P.datosRanking('tormenta', u, rec);
      ok('CG-17 · con dones, la marca NO ofrece el ranking (datosRanking null)', con === null, JSON.stringify(con));
      let llamadas = 0;
      const espia = () => { llamadas++; return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) }); };
      const pr = rk.publicarRanking({ reto: 'tormenta', valor: 900, dur_ms: 60000, fetch: espia });
      await sleep(300);
      const panel = document.getElementById('rec-rank'), abierto = !!(panel && !panel.hidden);
      if (abierto) { const pub = panel.querySelector('#rk-pub'); if (pub) pub.click(); await sleep(500); const no = panel.querySelector('#rk-no'); if (no && !panel.hidden) no.click(); }
      const res = await Promise.race([pr, sleep(3000).then(() => 'sin respuesta')]);
      ok('CG-17 · con dones, publicarRanking no abre el panel', !abierto, abierto ? 'el panel se abrió' : '');
      ok('CG-17 · con dones, publicarRanking no llama a la red (ni al espía)', llamadas === 0 && red === 0, 'espía ' + llamadas + ' · fetch real ' + red + ' · resultado ' + res);
    } catch (e) { ok('Sin excepciones', false, String(e && e.stack || e).slice(0, 300)); }
    finally { window.fetch = fetch0; try { G.dones.conDones(null); } catch (e) { /* */ } const p = document.getElementById('rec-rank'); if (p && !p.hidden) { const no = p.querySelector('#rk-no'); if (no) no.click(); } }
    return { passed: R.filter(r => r.ok).length, total: R.length, results: R };
  }
  window.AV = window.AV || {};
  window.AV.cg17Test = cg17Test;
})();
