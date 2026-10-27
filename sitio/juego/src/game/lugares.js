/* Juego · lugares descubiertos (DIVERSION_CAP1 mejora 2: «Lo que gano se ve»)
   Al llegar a un lugar con nombre del mapa (G.terreno.pois: el Taller, la Poza Honda, el Mirador Yokahú…) sale el aviso
   «Descubriste: <lugar>» una sola vez por lugar y por partida. Lo descubierto va en la partida (S.lugares, clave del pack:
   las partidas viejas la reciben vacía) y suma XP al nido por G.emit('aprendizaje', { tipo: 'lugar', id }) (criadero.js).
   - Llegar = estar a (r + 6) m del punto (12 m como mínimo) y a menos de 18 m de altura: sobrevolar el techo del vuelo no
     cuenta; aterrizar o pasar bajo sí. Se revisa 4 veces por segundo; nunca en las baterías (G.quiet) ni con el creador abierto.
   - El aviso usa el toast de logro del HUD (con <b>, como el Diario) y espera a que el jugador esté libre (sin diálogo ni
     tarjeta) y a que el toast anterior termine; varios lugares seguidos salen uno tras otro.
   - El nombre que se muestra quita el paréntesis técnico del mapa («Poza Honda (misión de buceo)» → «Poza Honda»).
   Datos del pack: descubrir { omitir: [id | RegExp], radio?, alto?, xp?: false } (cap1: Iguaca, las paradas y los grupos de
   la escena de Kelvin no son lugares para el jugador). G.emit('lugar', { id, nombre }) al descubrir.
   Pruebas: AV.lugaresTest(). */
AVE.module('lugares', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const C = G.pack.descubrir || {};
  const RADIO = C.radio || 12, ALTO = C.alto || 18;
  const OMITIR = [].concat(C.omitir || []);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const omitido = id => OMITIR.some(o => (o instanceof RegExp ? o.test(id) : o === id));
  function nombreDe(p) { return String(p.nombre || p.name || p.id).replace(/\s*\([^)]*\)\s*$/, '').trim(); }
  // Lugares con nombre del mapa que cuentan para descubrir
  function lista() {
    const P = (G.terreno && G.terreno.pois) || {};
    return Object.keys(P).map(id => P[id]).filter(p => p && typeof p.x === 'number' && typeof p.z === 'number' && (p.nombre || p.name) && !omitido(p.id));
  }
  // Solo lectura: la lista se crea en la partida al descubrir el primer lugar (una partida vieja no se toca hasta entonces)
  const descubiertos = () => (Array.isArray(S.lugares) ? S.lugares : []);
  const cerca = p => {
    const r = Math.max(RADIO, (p.r || 0) + 6), dx = S.pos.x - p.x, dz = S.pos.z - p.z;
    if (dx * dx + dz * dz > r * r) return false;
    const py = p.y != null ? p.y : (G.terreno.height ? G.terreno.height(p.x, p.z) : S.pos.y);
    return Math.abs(S.pos.y - py) <= ALTO;
  };

  // Avisos en cola: uno cada vez, cuando el jugador está libre y el toast anterior terminó
  const cola = [];
  let espera = 0;
  function descubrir(p, sinAviso) {
    if (descubiertos().includes(p.id)) return false;
    if (!Array.isArray(S.lugares)) S.lugares = [];
    S.lugares.push(p.id);
    const nombre = nombreDe(p);
    if (!sinAviso) cola.push({ id: p.id, nombre });
    if (C.xp !== false) G.emit('aprendizaje', { tipo: 'lugar', id: p.id }); // XP al nido (criadero.js)
    G.emit('lugar', { id: p.id, nombre });
    G.guardado.autosave();
    return true;
  }
  function revisar() {
    if (G.quiet || !S.pos || !S.profile || !S.profile.created || (G.ui.worldHidden && G.ui.worldHidden())) return 0;
    let n = 0;
    for (const p of lista()) if (!descubiertos().includes(p.id) && cerca(p)) n += descubrir(p) ? 1 : 0;
    return n;
  }
  function avisar(dt) {
    if (!cola.length) return;
    espera = Math.max(0, espera - dt);
    if (espera > 0 || G.quiet || G.ui.busy()) return;
    const t = $('toast');
    if (t && !t.hidden && t.querySelector('button')) return; // el aviso de construcción trae un botón: no se pisa
    const d = cola.shift();
    espera = 3.4;
    G.ui.toastHTML(`<b>Descubriste</b> ${esc(d.nombre)}`, 3200);
    G.audio.play('pickup');
  }
  let t = 0;
  G.on('update', dt => { if ((t += dt) >= 0.25) { t = 0; revisar(); } avisar(dt); }, 72);
  G.on('apply', () => { cola.length = 0; espera = 0; }, 80);

  // =====================================================================================================================
  // AV.lugaresTest(): la lista omite lo técnico, llegar descubre una vez y se guarda, lejos o muy alto no cuenta, aviso en el HUD
  // =====================================================================================================================
  let grabarXP = null; // la prueba anota aquí la XP que emite descubrir (un solo gancho, registrado una vez)
  G.on('aprendizaje', d => { if (grabarXP && d && d.tipo === 'lugar') grabarXP.push(d.id); });
  async function test() {
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const SV = G.guardado, snap = SV.instantanea(), quiet = G.quiet;
    const posBk = Object.assign({}, S.pos), xpRecibidas = [];
    SV.suspender(true); G.quiet = true;
    grabarXP = xpRecibidas;
    try {
      const L = lista();
      check('Hay lugares con nombre en el mapa', L.length >= 3, L.length + ' lugares');
      check('Se omiten los ids técnicos del pack (descubrir.omitir)', OMITIR.length === 0 || L.every(p => !omitido(p.id)), OMITIR.length + ' reglas');
      check('El nombre que se muestra no lleva el paréntesis técnico', nombreDe({ nombre: 'Poza Honda (misión de buceo)' }) === 'Poza Honda' && nombreDe({ nombre: 'Muelle' }) === 'Muelle' && !L.some(p => /\(/.test(nombreDe(p))));
      S.profile = Object.assign({}, S.profile, { created: true });
      S.lugares = [];
      const p = L.find(q => q.id === 'poza_honda') || L[0];
      const py = p.y != null ? p.y : G.terreno.height(p.x, p.z);
      // Lejos: nada
      S.pos.x = p.x + 60; S.pos.z = p.z + 60; S.pos.y = py;
      G.quiet = false; let n0 = revisar(); G.quiet = true;
      check('Lejos del lugar no se descubre', !descubiertos().includes(p.id), n0 + ' descubiertos');
      // Muy alto (sobrevolando): nada
      S.pos.x = p.x; S.pos.z = p.z; S.pos.y = py + ALTO + 10;
      G.quiet = false; revisar(); G.quiet = true;
      check('Sobrevolar muy alto no cuenta', !descubiertos().includes(p.id));
      // Con G.quiet nada se descubre
      S.pos.y = py + 1;
      revisar();
      check('En las baterías (G.quiet) no se descubre nada', !descubiertos().includes(p.id));
      // Llegar: se descubre una sola vez y suma XP al nido
      G.quiet = false; const n1 = revisar(); const n2 = revisar(); G.quiet = true;
      check('Al llegar se descubre una sola vez y queda en la partida (S.lugares)', n1 >= 1 && n2 === 0 && descubiertos().filter(id => id === p.id).length === 1, nombreDe(p));
      check('Descubrir suma XP al nido por el gancho aprendizaje (tipo lugar)', C.xp === false || xpRecibidas.includes(p.id));
      // Aviso en el HUD: espera a que el jugador esté libre y sale con el estilo de logro
      G.quiet = false; avisar(0); G.quiet = true;
      const tt = $('toast');
      check('Sale «Descubriste: <lugar>» en el HUD', !!tt && !tt.hidden && /Descubriste/.test(tt.textContent) && tt.textContent.includes(nombreDe(p)) && !!tt.querySelector('b'), tt ? tt.textContent : 'sin toast');
      G.ui.hideToast();
      // Guardado: la lista va en la partida y una partida vieja sin la clave la recibe vacía
      const ser = SV.serialize ? SV.serialize(true) : null;
      check('S.lugares se guarda con la partida', !ser || (typeof ser === 'string' ? ser.includes('"lugares"') : true), SV.KEYS && SV.KEYS.includes('lugares') ? 'clave del pack' : 'sin clave en KEYS');
      check('Una partida sin la clave la recibe vacía al cargar', Array.isArray(SV.freshState().lugares) && SV.freshState().lugares.length === 0);
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      grabarXP = null;
      Object.assign(S.pos, posBk);
      SV.restaurar(snap);
      SV.suspender(false); G.quiet = quiet;
      cola.length = 0; espera = 0;
    }
    check('G.S queda como estaba', JSON.stringify(SV.instantanea()) === JSON.stringify(snap));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  // AV.lugaresTest (boot.js es del coordinador: se expone aquí si boot no lo hizo)
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.lugaresTest) AV.lugaresTest = o => test(o); }, 0);

  return { lista, nombreDe, descubiertos, cerca, revisar, descubrir, omitido, test };
});
