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
   Asentamientos (AY1, MAPA_PLAN_COMPLETO F0.1, F2.4 y F2.5): pack.asentamientos = 'archivo.js' que define
   window.AV_ASENTAMIENTOS_CAP1 = [{ id, nombre, en, diario, diarioEn, glifo }]. Se pide en el primer gesto del jugador (no va en la
   descarga inicial). Cada id es un grupo de la escena de Kelvin (G.terreno.pois y mapa.zonasEdificios): cuenta como lugar aunque
   descubrir.omitir lo quite, con su nombre propio (ES o EN), un radio de llegada sacado del de la zona y más margen de altura.
   Al entrar sale el rótulo «Bienvenido a …» (#rotulo-lugar; la primera vez con «Lugar descubierto» en vez del toast), y cada uno
   suma su línea a la sección «Lugares de la isla» del Diario. El minimapa los pinta todos con su glifo (asentamiento()).
   Pruebas: AV.lugaresTest(). */
AVE.module('lugares', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const C = G.pack.descubrir || {};
  const RADIO = C.radio || 12, ALTO = C.alto || 18, ALTO_ASENT = 26;
  const OMITIR = [].concat(C.omitir || []);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const enIngles = () => !!((G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || (G.aula && G.aula.aj && G.aula.aj.idioma === 'en'));
  const L = (es, en) => (enIngles() && en ? en : es);

  // ---------- Asentamientos (datos del pack, perezosos) ----------
  const ASENT = {};          // id → { id, nombre, en, diario, diarioEn, glifo }
  let ASENT_LISTA = null;    // POIs de los asentamientos con su radio, hechos una vez al llegar los datos
  let cargaAsent = null;
  function usarAsentamientos(datos) {
    for (const a of datos || []) if (a && a.id) ASENT[a.id] = a;
    ASENT_LISTA = null;
    if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'lugares', html: htmlDiario });
  }
  function cargarAsentamientos() {
    if (!G.pack.asentamientos) return Promise.resolve([]);
    if (window.AV_ASENTAMIENTOS_CAP1) { if (!Object.keys(ASENT).length) usarAsentamientos(window.AV_ASENTAMIENTOS_CAP1); return Promise.resolve(window.AV_ASENTAMIENTOS_CAP1); }
    return cargaAsent || (cargaAsent = AVE.assets.script(G.pack.asentamientos).then(() => { usarAsentamientos(window.AV_ASENTAMIENTOS_CAP1); return window.AV_ASENTAMIENTOS_CAP1 || []; }, e => { cargaAsent = null; throw e; }));
  }
  if (G.pack.asentamientos) { // primer gesto del jugador (como alPrimerGesto de boot.js)
    let hecho = false; const ir = () => { if (hecho) return; hecho = true; setTimeout(() => cargarAsentamientos().catch(() => {}), 400); };
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, ir, { once: true, passive: true });
  }
  function asentamientos() {
    if (ASENT_LISTA && ASENT_LISTA.length) return ASENT_LISTA; // vacía si los datos llegaron antes que los POIs: se rehace
    const P = (G.terreno && G.terreno.pois) || {}, Z = (G.terreno && G.terreno.mapa && G.terreno.mapa.zonasEdificios) || {};
    ASENT_LISTA = Object.keys(ASENT).filter(id => P[id] && typeof P[id].x === 'number').map(id => {
      const z = Z[id], rz = z && z.radio > 0 ? z.radio : 30;
      return Object.assign({}, P[id], { r: Math.max(14, Math.min(34, rz * 0.6)), asentamiento: ASENT[id] });
    });
    return ASENT_LISTA;
  }
  const asentamiento = id => ASENT[id] || null;

  const omitido = id => OMITIR.some(o => (o instanceof RegExp ? o.test(id) : o === id));
  function nombreDe(p) {
    const a = p && (p.asentamiento || ASENT[p.id]);
    if (a) return L(a.nombre, a.en);
    return String(p.nombre || p.name || p.id).replace(/\s*\([^)]*\)\s*$/, '').trim();
  }
  // Lugares con nombre del mapa que cuentan para descubrir (los asentamientos, aunque el pack omita sus ids)
  function lista() {
    const P = (G.terreno && G.terreno.pois) || {};
    const L0 = Object.keys(P).map(id => P[id]).filter(p => p && typeof p.x === 'number' && typeof p.z === 'number' && (p.nombre || p.name) && !omitido(p.id) && !ASENT[p.id]);
    return ASENT_LISTA || Object.keys(ASENT).length ? L0.concat(asentamientos()) : L0;
  }
  // Solo lectura: la lista se crea en la partida al descubrir el primer lugar (una partida vieja no se toca hasta entonces)
  const descubiertos = () => (Array.isArray(S.lugares) ? S.lugares : []);
  const cerca = (p, margen) => {
    const r = Math.max(RADIO, (p.r || 0) + 6) + (margen || 0), dx = S.pos.x - p.x, dz = S.pos.z - p.z;
    if (dx * dx + dz * dz > r * r) return false;
    const py = p.y != null ? p.y : (G.terreno.height ? G.terreno.height(p.x, p.z) : S.pos.y);
    return Math.abs(S.pos.y - py) <= (p.asentamiento ? ALTO_ASENT : ALTO) + (margen || 0);
  };

  // ---------- Rótulo «Bienvenido a …» ----------
  const ESTILO = '#rotulo-lugar{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 22vh);transform:translateX(-50%);z-index:var(--z-toast,30);' +
    'max-width:min(88vw,520px);box-sizing:border-box;padding:10px 22px 12px;border-radius:var(--r-panel,18px);background:rgba(18,30,42,.82);border:2px solid rgba(255,255,255,.85);' +
    'color:#fff;text-align:center;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.35);animation:rotulo-lugar 3.6s ease forwards}' +
    '#rotulo-lugar[hidden]{display:none}#rotulo-lugar small{display:block;font:700 calc(13px * var(--fs-k,1))/1.3 var(--font-body,sans-serif);letter-spacing:.04em;opacity:.9}' +
    '#rotulo-lugar small.nuevo{color:#ffd23f}#rotulo-lugar b{display:block;font:700 calc(24px * var(--fs-k,1))/1.2 var(--font-display,sans-serif);overflow-wrap:anywhere}' +
    '@media (max-width:560px){#rotulo-lugar{top:calc(env(safe-area-inset-top,0px) + 30vh);padding:8px 16px 10px}#rotulo-lugar b{font-size:calc(20px * var(--fs-k,1))}}' +
    '@keyframes rotulo-lugar{0%{opacity:0;transform:translate(-50%,8px)}10%,82%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,0)}}' +
    '@media (prefers-reduced-motion:reduce){#rotulo-lugar{animation:rotulo-lugar-quieto 3.6s linear forwards}@keyframes rotulo-lugar-quieto{0%,85%{opacity:1}100%{opacity:0}}}' +
    ':root.a11y-contraste #rotulo-lugar{background:#000;border-color:#fff;border-width:3px}';
  let elR = null, tR = 0;
  function rotulo(a, nuevo) {
    if (!elR) {
      if (!document.getElementById('estilo-rotulo-lugar')) { const st = document.createElement('style'); st.id = 'estilo-rotulo-lugar'; st.textContent = ESTILO; document.head.appendChild(st); }
      elR = document.createElement('div'); elR.id = 'rotulo-lugar'; elR.className = 'hud'; elR.hidden = true; elR.setAttribute('role', 'status'); elR.setAttribute('aria-live', 'polite'); elR.setAttribute('data-no-tr', '');
      document.body.appendChild(elR);
    }
    elR.innerHTML = (nuevo ? `<small class="nuevo">${esc(L('¡Lugar descubierto!', 'Place discovered!'))}</small>` : '') +
      `<small>${esc(L('Bienvenido a', 'Welcome to'))}</small><b>${esc(L(a.nombre, a.en))}</b>`;
    elR.hidden = true; void elR.offsetWidth; elR.hidden = false; // reinicia la animación
    tR = 3.6;
  }
  const ocultarRotulo = () => { tR = 0; if (elR) elR.hidden = true; };

  // ---------- Diario: «Lugares de la isla» ----------
  function htmlDiario() {
    const v = descubiertos(), A = Object.keys(ASENT).map(id => ASENT[id]);
    if (!A.length) return '';
    const items = A.map(a => v.includes(a.id)
      ? `<li><b>${esc(L(a.nombre, a.en))}</b><br><small>${esc(L(a.diario, a.diarioEn))}</small></li>`
      : `<li class="falta"><b>???</b><br><small>${esc(L('Explora la isla para encontrarlo.', 'Explore the island to find it.'))}</small></li>`).join('');
    return `<span class="lbl">${esc(L('Lugares de la isla', 'Places on the island'))} (${A.filter(a => v.includes(a.id)).length}/${A.length})</span>` +
      `<ul class="lugares-isla" data-no-tr style="list-style:none;margin:0 0 10px;padding:0;display:grid;gap:6px">${items.replace(/<li class="falta">/g, '<li class="falta" style="opacity:.6">')}</ul>`;
  }

  // Avisos en cola: uno cada vez, cuando el jugador está libre y el toast anterior terminó
  const cola = [];
  let espera = 0;
  const dentro = new Set(), ultimaVez = {}; // asentamientos donde está el jugador y cuándo salió su rótulo (s de juego)
  let reloj = 0;
  function descubrir(p, sinAviso) {
    if (descubiertos().includes(p.id)) return false;
    if (!Array.isArray(S.lugares)) S.lugares = [];
    S.lugares.push(p.id);
    const nombre = nombreDe(p);
    if (!sinAviso) cola.push({ id: p.id, nombre, asentamiento: p.asentamiento || null, nuevo: true });
    if (C.xp !== false) G.emit('aprendizaje', { tipo: 'lugar', id: p.id }); // XP al nido (criadero.js)
    G.emit('lugar', { id: p.id, nombre });
    G.guardado.autosave();
    return true;
  }
  function revisar() {
    if (G.quiet || !S.pos || !S.profile || !S.profile.created || (G.ui.worldHidden && G.ui.worldHidden())) return 0;
    let n = 0;
    for (const p of lista()) {
      if (!descubiertos().includes(p.id) && cerca(p)) { n += descubrir(p) ? 1 : 0; if (p.asentamiento) { dentro.add(p.id); ultimaVez[p.id] = reloj; } continue; }
      if (!p.asentamiento) continue;
      // Volver a un asentamiento ya descubierto: «Bienvenido a …» otra vez, si salió de verdad (15 m de margen) y hace más de 90 s
      if (dentro.has(p.id)) { if (!cerca(p, 15)) dentro.delete(p.id); }
      else if (cerca(p)) {
        dentro.add(p.id);
        if (!(reloj - (ultimaVez[p.id] == null ? -1e9 : ultimaVez[p.id]) < 90)) { ultimaVez[p.id] = reloj; cola.push({ id: p.id, nombre: nombreDe(p), asentamiento: p.asentamiento, nuevo: false }); }
      }
    }
    return n;
  }
  function avisar(dt) {
    if (tR > 0 && (tR -= dt) <= 0) ocultarRotulo();
    if (!cola.length) return;
    espera = Math.max(0, espera - dt);
    if (espera > 0 || G.quiet || G.ui.busy()) return;
    const t = $('toast');
    const d = cola[0];
    if (!d.asentamiento && t && !t.hidden && t.querySelector('button')) return; // el aviso de construcción trae un botón: no se pisa
    cola.shift();
    espera = d.asentamiento ? 3.8 : 3.4;
    if (d.asentamiento) rotulo(d.asentamiento, d.nuevo);
    else G.ui.toastHTML(`<b>Descubriste</b> ${esc(d.nombre)}`, 3200);
    if (d.nuevo) G.audio.play('pickup');
  }
  let t = 0;
  G.on('update', dt => { reloj += dt; if ((t += dt) >= 0.25) { t = 0; revisar(); } avisar(dt); }, 72);
  G.on('apply', () => { cola.length = 0; espera = 0; dentro.clear(); ocultarRotulo(); }, 80);

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
      check('Se omiten los ids técnicos del pack (descubrir.omitir)', OMITIR.length === 0 || L.every(p => p.asentamiento || !omitido(p.id)), OMITIR.length + ' reglas');
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
      // Asentamientos (AY1): 14 con nombre propio ES y EN, línea del Diario, rótulo «Bienvenido a …» y regreso
      if (G.pack.asentamientos) {
        const datos = await cargarAsentamientos();
        const P = G.terreno.pois || {}, A = asentamientos();
        check('Los 14 asentamientos tienen nombre propio en ES y EN, glifo y línea del Diario', datos.length === 14 && datos.every(a => a.nombre && a.en && a.diario && a.diarioEn && /^(piedra|madera)$/.test(a.glifo)) &&
          new Set(datos.map(a => a.nombre)).size === 14 && new Set(datos.map(a => a.en)).size === 14, datos.length + ' asentamientos');
        check('Cada asentamiento es un grupo de la escena de Kelvin y entra en la lista aunque el pack omita sus ids', datos.every(a => P[a.id]) && A.length === 14 && lista().filter(q => q.asentamiento).length === 14,
          datos.filter(a => !P[a.id]).map(a => a.id).join(', ') || A.length + ' en la lista');
        const a = A.find(q => q.id === 'kelvin_aldea_meandros') || A[0];
        check('El nombre que se muestra es el propio, no el del mapa', nombreDe(a) === a.asentamiento.nombre && nombreDe(P[a.id]) === a.asentamiento.nombre, nombreDe(a));
        S.lugares = []; cola.length = 0; espera = 0; dentro.clear(); ocultarRotulo();
        const ay = a.y != null ? a.y : G.terreno.height(a.x, a.z);
        S.pos.x = a.x + a.r * 0.5; S.pos.z = a.z; S.pos.y = ay + 2;
        G.quiet = false; revisar(); avisar(0); G.quiet = true;
        const rt = document.getElementById('rotulo-lugar');
        check('Al llegar sale «¡Lugar descubierto! Bienvenido a …» con su nombre', descubiertos().includes(a.id) && rt && !rt.hidden && /Lugar descubierto/.test(rt.textContent) && /Bienvenido a/.test(rt.textContent) && rt.textContent.includes(a.asentamiento.nombre),
          rt ? rt.textContent : 'sin rótulo');
        const hd = htmlDiario();
        check('El Diario suma su línea en «Lugares de la isla» (1/14)', hd.includes('(1/14)') && hd.includes(esc(a.asentamiento.diario)) && (hd.match(/\?\?\?/g) || []).length === 13);
        // Salir y volver: «Bienvenido a …» otra vez, sin «descubierto»; enseguida no se repite
        ocultarRotulo(); espera = 0;
        S.pos.x = a.x + 300; G.quiet = false; revisar(); G.quiet = true;
        S.pos.x = a.x + a.r * 0.5; reloj += 120; G.quiet = false; revisar(); avisar(0); G.quiet = true;
        check('Al volver tras salir sale «Bienvenido a …» sin «descubierto»', !rt.hidden && /Bienvenido a/.test(rt.textContent) && !/descubierto/.test(rt.textContent), rt.textContent);
        ocultarRotulo(); espera = 0;
        S.pos.x = a.x + 300; G.quiet = false; revisar(); G.quiet = true;
        S.pos.x = a.x + a.r * 0.5; reloj += 5; G.quiet = false; revisar(); avisar(0); G.quiet = true;
        check('Entrar y salir enseguida no repite el rótulo', rt.hidden && !cola.length);
        const m = G.minimapa && G.minimapa.marcadores ? G.minimapa.marcadores().filter(x => x.tipo === 'pueblo') : null;
        check('El minimapa pinta los 14 asentamientos (descubiertos con nombre)', !m || (m.length === 14 && m.filter(x => !x.oculto).length === 1 && m.find(x => !x.oculto).nombre === a.asentamiento.nombre),
          m ? m.length + ' marcas' : 'minimapa sin cargar');
        dentro.clear(); ocultarRotulo();
      }
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

  return { lista, nombreDe, descubiertos, cerca, revisar, descubrir, omitido, asentamientos, asentamiento, cargarAsentamientos, test };
});
