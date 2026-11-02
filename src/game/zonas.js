/* Juego · zonas del mundo único (BM114, docs/equipo/MUNDO_UNICO.md § Desbloqueo)
   Los capítulos 2–6 se juegan en el mapa real, cada uno en su zona. Mientras se juega uno, solo está abierta su zona y la de
   los capítulos ya terminados (registro de temporada, src/game/temporada.js: amazonaverse.temporada.terminados). Al terminar el
   capítulo (S.complete) se abre también la del siguiente. El resto de la isla se ve de lejos.
   - La barrera es el viento: al salir de lo abierto, el viento devuelve a Vittata al último punto abierto (a pie o volando) y
     sale un aviso amable: «Esta zona se abre en el capítulo N» (o «más adelante» si no es de ningún capítulo). Nada de muros
     invisibles sin explicación.
   - Solo actúa en un pack de capítulo 2–6 que use el mapa real (pack.mundo con el mapa de AVE.mundoReal) y que tenga zona en
     ZONAS. El cap. 1 es mundo abierto (no se toca). Los caps. 5 y 6 entran solos cuando su pack pase al mapa (interruptor de la
     nube): sus zonas de abajo son las del plan y la nube las ajusta si cambian.
   - Zonas: círculos (x, z, r) medidos sobre las coordenadas de cada capítulo (BM111–BM113) con margen para volar.
   API: G.zonas = { activa, abiertas(), dentro(x, z), zonaEn(x, z), ZONAS, test }. Prueba: AV.zonasTest(). */
AVE.module('zonas', function (G) {
  'use strict';
  const S = G.S;
  const ZONAS = {
    1: { x: 125, z: 140, r: 85, nombre: 'Villa Raíz', en: 'Villa Raíz' },                       // cap. 1 (y lo que lo rodea)
    2: { x: -15, z: 34, r: 45, nombre: 'Caney del Meandro', en: 'Caney del Meandro' },          // BM111
    3: { x: 187, z: 208, r: 62, nombre: 'la desembocadura y la laguna', en: 'the river mouth and the lagoon' }, // BM112
    4: { x: 200, z: 157, r: 38, nombre: 'el río de Villa Raíz', en: 'the Villa Raíz river' },     // BM113
    5: { x: -45, z: -100, r: 60, nombre: 'Los Miradores', en: 'The Lookouts' },                  // plan (MUNDO_UNICO); la nube ajusta
    6: { x: -4, z: -131, r: 55, nombre: 'la Ciudad de los 36', en: 'the City of the 36' },        // plan (MUNDO_UNICO); la nube ajusta
  };
  const enIngles = () => !!(G.idioma && G.idioma.actual && G.idioma.actual() === 'en');
  const cap = (G.pack.meta && G.pack.meta.capitulo) || 0;
  const real = () => !!(G.terreno.mapa && window.AVE.mundoReal && G.pack.mundo && G.pack.mundo.mapa === window.AVE.mundoReal.mapa);
  const activa = cap >= 2 && cap <= 6 && !!ZONAS[cap] && real();

  function terminados() {
    const T = window.AVTemporada, d = T && T.leer ? T.leer() : null;
    return d && d.terminados ? Object.keys(d.terminados).map(Number).filter(n => d.terminados[n]) : [];
  }
  // Abiertas: la del capítulo, las de los terminados y, con el capítulo completo, la siguiente
  function abiertas() {
    const a = new Set([cap].concat(terminados()));
    if (S.complete && ZONAS[cap + 1]) a.add(cap + 1);
    return [...a].filter(n => ZONAS[n]).sort((p, q) => p - q);
  }
  const en = (z, x, zz) => Math.hypot(x - z.x, zz - z.z) <= z.r;
  const dentro = (x, z) => abiertas().some(n => en(ZONAS[n], x, z));
  const zonaEn = (x, z) => { for (const n of Object.keys(ZONAS)) if (en(ZONAS[n], x, z)) return Number(n); return 0; };

  function aviso(x, z) {
    const n = zonaEn(x, z);
    return n && n !== cap
      ? (enIngles() ? `The wind won't let you through: this area opens in chapter ${n}.` : `El viento no te deja pasar: esta zona se abre en el capítulo ${n}.`)
      : (enIngles() ? "The wind won't let you through: this part of the island opens later." : 'El viento no te deja pasar: esta parte de la isla se abre más adelante.');
  }

  let lastOk = null, avisoT = -1e9;
  if (activa) {
    // Después de la física (que mueve a Vittata) y antes de la cámara: si salió de lo abierto, el viento la devuelve
    G.on('update', (dt, busy) => {
      const P = S.pos;
      if (dentro(P.x, P.z)) { lastOk = { x: P.x, y: P.y, z: P.z }; return; }
      if (!lastOk) { const a = (G.pack.jugador && G.pack.jugador.aparicion) || ZONAS[cap]; lastOk = { x: a.x, y: G.terreno.height(a.x, a.z), z: a.z }; }
      const fuera = { x: P.x, z: P.z };
      P.x = lastOk.x; P.z = lastOk.z; P.y = Math.max(lastOk.y, G.terreno.height(P.x, P.z));
      S.vy = Math.min(S.vy || 0, 0);
      if (G.fisica && G.fisica.MOVE) { G.fisica.MOVE.vx = 0; G.fisica.MOVE.vz = 0; }
      if (!busy && S.clock - avisoT > 4) { avisoT = S.clock; G.ui.toast(aviso(fuera.x, fuera.z), 3200); if (G.fx && G.fx.burst) G.fx.burst(P.x, P.y + 1.2, P.z, 'feathers', 12); }
    }, 21);
    G.on('apply', () => { lastOk = null; }, 80);
  }

  // =====================================================================================================================
  // AV.zonasTest(): fuera del mapa o en el cap. 1 no hace nada; en un capítulo del mapa, lo cerrado no deja pasar (vuelve con
  // aviso), lo abierto sí, y al terminar el capítulo se abre la zona del siguiente
  // =====================================================================================================================
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    if (!activa) {
      check('Inactiva fuera de un capítulo 2–6 del mapa real (cap. 1, mundo de relleno o interruptor apagado)', !(cap >= 2 && cap <= 6 && ZONAS[cap] && real()), 'cap ' + cap);
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }
    const T = G.pruebas, pos0 = Object.assign({}, S.pos), comp0 = S.complete, KEY = 'amazonaverse.temporada';
    let temp0 = null; try { temp0 = localStorage.getItem(KEY); localStorage.removeItem(KEY); } catch (e) { /* sin almacenamiento */ }
    try {
      S.complete = false;
      const Z = ZONAS[cap];
      check('Abierta solo la zona del capítulo (sin capítulos terminados)', abiertas().join() === String(cap), abiertas().join());
      T.teleport(Z.x, Z.z); T.tick(0.2);
      check('Dentro de la zona del capítulo se queda donde está', Math.hypot(S.pos.x - Z.x, S.pos.z - Z.z) < 0.5, S.pos.x.toFixed(1) + ',' + S.pos.z.toFixed(1));
      // Una zona cerrada: la de otro capítulo, lejos de la del capítulo actual
      const otra = Object.keys(ZONAS).map(Number).find(n => n !== cap && Math.hypot(ZONAS[n].x - Z.x, ZONAS[n].z - Z.z) > ZONAS[n].r + Z.r);
      const O = ZONAS[otra];
      const toast = document.getElementById('toast');
      T.teleport(O.x, O.z); T.tick(0.3);
      check('Una zona cerrada no deja pasar: el viento la devuelve a lo abierto', dentro(S.pos.x, S.pos.z) && Math.hypot(S.pos.x - O.x, S.pos.z - O.z) > 1, `zona ${otra} → ${S.pos.x.toFixed(1)},${S.pos.z.toFixed(1)}`);
      check('Sale el aviso «esta zona se abre en el capítulo N»', !!toast && !toast.hidden && new RegExp('cap[ií]tulo ' + otra + '|chapter ' + otra).test(toast.textContent), toast && toast.textContent);
      // Con ese capítulo terminado, su zona queda abierta
      if (window.AVTemporada) { const d = window.AVTemporada.leer(); d.terminados[otra] = Date.now(); localStorage.setItem(KEY, JSON.stringify(d)); }
      check('Un capítulo terminado abre su zona', abiertas().includes(otra), abiertas().join());
      T.teleport(O.x, O.z); T.tick(0.2);
      check('En una zona abierta se entra', Math.hypot(S.pos.x - O.x, S.pos.z - O.z) < 0.5, S.pos.x.toFixed(1) + ',' + S.pos.z.toFixed(1));
      // Al terminar el capítulo se abre el siguiente
      S.complete = true;
      check('Con el capítulo completo se abre la zona del siguiente', !ZONAS[cap + 1] || abiertas().includes(cap + 1), abiertas().join());
    } finally {
      S.complete = comp0;
      try { if (temp0 == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, temp0); } catch (e) { /* */ }
      T.teleport(pos0.x, pos0.z); T.tick(0.1); lastOk = null;
      const toast = document.getElementById('toast'); if (toast) toast.hidden = true;
    }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  G.zonas = { activa, abiertas, dentro, zonaEn, ZONAS, test };
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.zonasTest) AV.zonasTest = o => test(o); }, 0);
});
