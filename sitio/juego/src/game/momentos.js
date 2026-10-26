/* Juego · momentos del cómic (DIVERSION_CAP1 mejora 5: «Cómic con humor y foto con pose»)
   Hechos que ya pasan en el juego y ahora se cuentan como eventos narrativos, una vez por partida, para que el pack les dé
   una viñeta con textos graciosos a elegir (content/cap1/pack.js, comic.vinetas; el cómic es src/game/comic.js y no se toca):
     FirstSplash           la primera vez que Vittata cae al agua honda (MOVE.swimming empieza)
     FirstHardLanding      el primer aterrizaje torpe (caída fuerte sin volar: MOVE.impact ≥ 0.75, el aplastón de fisica.js)
     ChickJumped           la primera vez que el niño toca a su cotorrita y brinca (criadero.js: G.emit('criadero', 'brinco'))
     FirstChallengeRecord  el primer «¡Nuevo récord!» del Modo Retos (G.emit('retosResultado')); se anota al volver a la
                           partida, porque el reto restaura la instantánea de G.S al salir
     PhotoTaken            «Foto»: uno de los 7 gestos y la foto de frente al cómic (actores.js: G.emit('foto', { gesto }));
                           cada foto nueva reemplaza la imagen de la misma viñeta y queda registrada como evento
   - Nunca en las baterías (G.quiet) ni antes de crear el personaje. Las fotos van a S.captures con la clave de img de la
     viñeta del pack (chapuzon, aterrizaje, brinco, record, foto); con imagen puesta el cómic no vuelve a capturar.
   - Sin viñeta en el pack para una clave, el evento se registra igual (otro pack puede dibujarlo) y no se guarda foto.
   Pruebas: AV.momentosTest(). */
AVE.module('momentos', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const C = G.pack.momentos || {};
  const IMPACTO = C.impacto || 0.75, ESPERA_FOTO = C.esperaFoto != null ? C.esperaFoto : 0.8;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const esImagen = im => typeof im === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(im) && im.length > 2000 && im.length < 800000;
  const aviso = (html, ms) => { if (!G.quiet && G.ui && G.ui.toastHTML) G.ui.toastHTML(html, ms); };

  // Eventos narrativos (definidos aquí si el pack no los trae)
  const EV = {
    FirstSplash: { type: 'SkillMoment', loc: null, chars: ['vittata'], scene: 'splash' },
    FirstHardLanding: { type: 'SkillMoment', loc: null, chars: ['vittata'], scene: 'landing' },
    ChickJumped: { type: 'CompanionMoment', loc: null, chars: ['vittata'], scene: 'nest' },
    FirstChallengeRecord: { type: 'RecordAchieved', loc: null, chars: ['vittata'], scene: 'race' },
    PhotoTaken: { type: 'PhotoTaken', loc: null, chars: ['player'], scene: 'photo' },
  };
  const CLAVES = Object.keys(EV);
  if (G.eventos.defs) for (const [k, d] of Object.entries(EV)) if (!G.eventos.defs[k]) G.eventos.defs[k] = d;
  // Clave de imagen (S.captures) de la viñeta del pack ligada a un evento
  function imgDe(key) { const v = ((G.pack.comic && G.pack.comic.vinetas) || []).find(x => x.needs === key); return v && v.img && v.img !== 'portrait' ? v.img : null; }
  const listo = () => !G.quiet && !!S.profile && !!S.profile.created;
  function registrar(key, datos, imagen) {
    if (!listo() || G.eventos.had(key)) return false;
    const img = imgDe(key);
    if (img && esImagen(imagen)) S.captures[img] = imagen;
    G.eventos.log(key, datos || {});
    if (G.comic && G.comic.revisarEventos) G.comic.revisarEventos(); // la viñeta nace ahora, con la apariencia de ahora
    G.guardado.autosave();
    return true;
  }

  // ---------- Chapuzón y aterrizaje torpe (estado de fisica.js, sin tocarla) ----------
  const M = G.fisica.MOVE;
  let eraNado = false, eraLand = false, gracia = 2;
  function pasoMovimiento() {
    const nado = !!M.swimming, land = M.land > 0;
    if (gracia <= 0) {
      if (nado && !eraNado) registrar('FirstSplash', { vuelo: !!M.flying });
      if (land && !eraLand && !M.flying && !nado && M.impact >= IMPACTO) registrar('FirstHardLanding', { impacto: +Number(M.impact).toFixed(2) });
    }
    eraNado = nado; eraLand = land;
  }

  // ---------- El pichón brinca (criadero.js: G.emit('criadero', 'brinco', { id, foto() | imagen })) ----------
  function alBrinco(d, ahora) {
    if (!listo() || G.eventos.had('ChickJumped')) return false;
    const tomar = () => {
      if (!listo() || G.eventos.had('ChickJumped')) return false;
      let im = null;
      try { im = d && typeof d.foto === 'function' ? d.foto() : d && d.imagen; } catch (e) { im = null; }
      return registrar('ChickJumped', { cria: d && typeof d.id === 'string' ? d.id.slice(0, 24) : null }, im);
    };
    if (ahora) return tomar();
    setTimeout(tomar, 420); // la cría ya va en el aire
    return true;
  }
  G.on('criadero', (tipo, d) => { if (tipo === 'brinco') alBrinco(d); });

  // ---------- Primer récord del Modo Retos ----------
  let pendRecord = null;
  const retoActivo = () => !!(G.retosApi && G.retosApi.activo);
  function alResultado(d) {
    if (!d || d.prueba || G.eventos.had('FirstChallengeRecord') || pendRecord) return false;
    const dev = (G.retosApi && G.retosApi._dev) || {};
    const nuevo = d.modo === 'carrera' || d.modo === 'rio' ? (dev.C ? dev.C.nuevo === true : !!d.llego) : (dev.TM ? dev.TM.nuevo === true : (d.puntos || 0) > 0);
    if (!nuevo) return false;
    let foto = null;
    try { foto = G.renderer && G.renderer.snapshot ? G.renderer.snapshot(480, 360, 0.72) : null; } catch (e) { foto = null; }
    pendRecord = { meta: { modo: d.modo, ms: d.ms || null, puesto: d.puesto || null, puntos: d.puntos || null }, foto };
    return true;
  }
  G.on('retosResultado', d => alResultado(d));
  function pasoRecord() {
    if (!pendRecord || retoActivo() || !listo()) return;
    const p = pendRecord; pendRecord = null;
    if (registrar('FirstChallengeRecord', p.meta, p.foto)) aviso('<b>¡Récord al cómic!</b> Tu primer récord ya tiene viñeta.', 3200);
  }

  // ---------- «Foto» con pose ----------
  const ESTILO = '#foto-flash{position:fixed;inset:0;background:#fff;pointer-events:none;z-index:9999;animation:foto-flash .55s ease-out forwards}' +
    '@keyframes foto-flash{0%{opacity:.85}100%{opacity:0}}';
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function flash() {
    if (REDUCED || G.quiet) return;
    if (!document.getElementById('estilo-foto')) { const s = document.createElement('style'); s.id = 'estilo-foto'; s.textContent = ESTILO; document.head.appendChild(s); }
    const viejo = document.getElementById('foto-flash'); if (viejo) viejo.remove();
    const d = document.createElement('div'); d.id = 'foto-flash'; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.remove(); }, 700);
  }
  if (G.audio && G.audio.define) G.audio.define('foto', (t, a, A) => { A.noise(t, 0.03, { freq: 2800, q: 1.5, gain: 0.25 }); A.noise(t + 0.09, 0.05, { freq: 1600, q: 1.2, gain: 0.18 }); A.tone(1400, t + 0.09, 0.08, { type: 'square', gain: 0.03 }); });
  // Foto de frente: un punto de cámara delante de Vittata desde el que ningún sólido (G.solidos) tape su cabeza; se fotografía
  // con la cámara del juego y se devuelve a su sitio (como la foto de posada de comic.js). null si no hay ángulo libre o lienzo.
  const lienzoListo = () => { const c = G.renderer && G.renderer.canvas; return !!c && c.width > 0 && c.height > 0; };
  function fotoFrente() {
    const R = G.renderer, cam = R && R.camera, SO = G.solidos;
    if (!lienzoListo() || !cam || !R.drawScene || !window.THREE) return null;
    const cab = new THREE.Vector3(S.pos.x, S.pos.y + 1.0, S.pos.z);
    const base = Math.atan2(S.facing.x, S.facing.z); // delante de Vittata
    const libre = q => {
      if (q.y < G.terreno.height(q.x, q.z) + 0.3) return false;
      if (!SO || !SO.activo || !SO.dentro) return true;
      for (let i = 0; i <= 11; i++) { const t = i / 14; if (SO.dentro(q.x + (cab.x - q.x) * t, q.z + (cab.z - q.z) * t, q.y + (cab.y - q.y) * t) > -Infinity) return false; }
      return true;
    };
    for (const d of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, Math.PI]) for (const [dist, dy] of [[3.2, 0.6], [4.0, 0.2]]) {
      const a = base + d, q = new THREE.Vector3(S.pos.x + Math.sin(a) * dist, S.pos.y + dy, S.pos.z + Math.cos(a) * dist);
      if (libre(q)) return fotoDesde(q, cab);
    }
    return null;
  }
  function fotoDesde(q, mira) {
    const R = G.renderer, cam = R.camera, pos = cam.position.clone(), rot = cam.quaternion.clone();
    try {
      cam.position.copy(q); cam.lookAt(mira); cam.updateMatrixWorld();
      R.drawScene();
      const src = R.canvas, sw = src.width, sh = src.height, c = document.createElement('canvas'); c.width = 480; c.height = 360;
      let cw = sw, ch = sw * 0.75; if (ch > sh) { ch = sh; cw = sh / 0.75; }
      c.getContext('2d').drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 480, 360);
      const url = c.toDataURL('image/jpeg', 0.75);
      return url.length > 2000 ? url : null;
    } catch (e) { return null; }
    finally { cam.position.copy(pos); cam.quaternion.copy(rot); cam.updateMatrixWorld(); }
  }
  function lookActual() {
    try { return JSON.parse(JSON.stringify(G.creador.profileLook(S.profile))); }
    catch (e) { return S.profile && S.profile.look ? JSON.parse(JSON.stringify(S.profile.look)) : null; }
  }
  const nombreGesto = g => { const E = G.actores && G.actores.EMOTES; return (E && E[g] && E[g].label) || g; };
  let fotoT = 0, fotoGesto = '';
  function pedirFoto(gesto) { if (!gesto || !listo()) return false; fotoGesto = gesto; fotoT = ESPERA_FOTO; return true; }
  G.on('foto', info => pedirFoto(info && info.gesto));
  // → true si la foto quedó en el cómic
  function tomarFoto(gesto) {
    fotoT = 0;
    if (!listo()) return false;
    let img = fotoFrente();
    if (!img) { try { img = G.renderer.snapshot ? G.renderer.snapshot(480, 360, 0.75) : null; } catch (e) { img = null; } }
    if (!esImagen(img)) { aviso('No se pudo tomar la foto aquí. Prueba en otro sitio.', 3000); return false; }
    const img0 = imgDe('PhotoTaken') || 'foto';
    S.captures[img0] = img;
    const meta = { gesto: String(gesto || '').slice(0, 24), numero: S.events.filter(e => e.key === 'PhotoTaken').length + 1 };
    if (G.eventos.had('PhotoTaken')) {
      // La viñeta ya existe: la foto nueva la reemplaza, con la apariencia de ahora; el evento se registra igual
      const v = S.comic && S.comic.vinetas && S.comic.vinetas.foto; if (v) v.look = lookActual();
      G.eventos.log('PhotoTaken', meta);
    } else registrar('PhotoTaken', meta, img);
    G.guardado.autosave();
    flash(); if (G.audio && G.audio.play) G.audio.play('foto');
    aviso(`<b>¡Foto al cómic!</b> Pose: ${esc(nombreGesto(meta.gesto))}`, 2800);
    G.emit('fotoTomada', meta);
    return true;
  }

  function paso(dt) {
    if (gracia > 0) gracia -= dt;
    pasoMovimiento();
    pasoRecord();
    if (fotoT > 0 && (fotoT -= dt) <= 0) tomarFoto(fotoGesto);
  }
  G.on('update', paso, 74);
  G.on('apply', () => { eraNado = !!M.swimming; eraLand = M.land > 0; gracia = 2; pendRecord = null; fotoT = 0; }, 81);

  // =====================================================================================================================
  // AV.momentosTest(): cada momento real → evento una sola vez → viñeta del pack con sus textos; el récord espera a salir
  // del reto; la foto va al cómic y una foto nueva reemplaza la anterior en la misma viñeta. G.S queda como estaba.
  // =====================================================================================================================
  async function test() {
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const SV = G.guardado, snap = SV.instantanea(), quiet = G.quiet, apiBk = G.retosApi, teniaApi = 'retosApi' in G;
    const mBk = { swimming: M.swimming, land: M.land, impact: M.impact, flying: M.flying, grounded: M.grounded };
    SV.suspender(true); G.quiet = true;
    const had = k => G.eventos.had(k), cuenta = k => S.events.filter(e => e.key === k).length;
    const panel = id => (G.comic && G.comic.comicPanels ? G.comic.comicPanels().find(p => p.id === id) : null);
    const fotoFalsa = (() => { const c = document.createElement('canvas'); c.width = 480; c.height = 360; const g = c.getContext('2d'); g.fillStyle = '#2d5a43'; g.fillRect(0, 0, 480, 360); g.fillStyle = '#7fc35a'; g.beginPath(); g.arc(240, 180, 110, 0, 7); g.fill(); return c.toDataURL('image/jpeg', 0.8); })();
    try {
      check('Los 5 eventos de los momentos están definidos', CLAVES.every(k => !!G.eventos.defs[k]));
      const defs = (G.pack.comic && G.pack.comic.vinetas) || [];
      const sinVineta = CLAVES.filter(k => { const v = defs.find(x => x.needs === k); return !(v && v.opciones && v.opciones.length >= 3); });
      check('El pack da a cada momento una viñeta con 3 textos a elegir', sinVineta.length === 0, sinVineta.join(', ') || defs.length + ' viñetas');
      S.profile = Object.assign({}, S.profile, { created: true });
      S.events = S.events.filter(e => !CLAVES.includes(e.key));
      for (const k of CLAVES) { const im = imgDe(k); if (im) delete S.captures[im]; }
      for (const id of ['chapuzon', 'aterrizaje', 'brinco', 'record', 'foto']) if (S.comic.vinetas) delete S.comic.vinetas[id];
      if (G.comic && G.comic.revisarEventos) G.comic.revisarEventos();
      gracia = 0; pendRecord = null; fotoT = 0;
      // Con G.quiet (baterías) nada se registra
      M.swimming = false; M.flying = false; M.land = 0; paso(0.05); M.swimming = true; paso(0.05);
      check('En las baterías (G.quiet) el chapuzón no se registra', !had('FirstSplash'));
      G.quiet = false;
      // Chapuzón: entrar al agua una vez
      M.swimming = false; paso(0.05); M.swimming = true; paso(0.05);
      const pCh = panel('chapuzon');
      check('Caer al agua → FirstSplash → viñeta «chapuzón» con texto y 3 opciones', had('FirstSplash') && !!pCh && pCh.opciones.length === 4, pCh ? pCh.text : 'sin viñeta');
      M.swimming = false; paso(0.05); M.swimming = true; paso(0.05);
      check('El chapuzón cuenta una sola vez por partida', cuenta('FirstSplash') === 1);
      // Aterrizaje torpe: un aterrizaje normal no cuenta, una caída fuerte sí (sin volar)
      M.swimming = false; M.grounded = true; M.land = 0; paso(0.05);
      M.land = 0.22; M.impact = 0.4; paso(0.05);
      check('Un aterrizaje normal (impacto bajo) no es torpe', !had('FirstHardLanding'));
      M.land = 0; paso(0.05); M.land = 0.22; M.impact = 0.95; M.flying = true; paso(0.05);
      check('Aterrizar volando no cuenta como torpe', !had('FirstHardLanding'));
      M.flying = false; M.land = 0; paso(0.05); M.land = 0.22; M.impact = 0.95; paso(0.05);
      const pAt = panel('aterrizaje');
      check('Caída fuerte sin volar → FirstHardLanding → viñeta «aterrizaje»', had('FirstHardLanding') && !!pAt, pAt ? pAt.text : 'sin viñeta');
      M.land = 0;
      // El pichón brinca: gancho del criadero con la foto de su escena
      const okB = alBrinco({ id: 'h1', foto: () => fotoFalsa }, true);
      const pBr = panel('brinco');
      check('Tocar a la cría → ChickJumped con la foto del criadero → viñeta «brinco»', okB && had('ChickJumped') && S.captures[imgDe('ChickJumped') || 'brinco'] === fotoFalsa && !!pBr, pBr ? pBr.text : 'sin viñeta');
      check('El brinco cuenta una sola vez', alBrinco({ id: 'h1', imagen: fotoFalsa }, true) === false && cuenta('ChickJumped') === 1);
      // Primer récord: la prueba de los retos no cuenta; dentro del reto se espera; al salir se anota con su foto
      G.retosApi = { activo: true, _dev: { C: { nuevo: true }, TM: { nuevo: false } } };
      alResultado({ modo: 'carrera', llego: true, puesto: 1, ms: 61234, prueba: true });
      check('El resultado de la prueba de los retos (prueba: true) no cuenta', !pendRecord && !had('FirstChallengeRecord'));
      G.quiet = true; G.emit('retosResultado', { modo: 'carrera', llego: true, puesto: 2, ms: 61234, rivales: [], prueba: false }); G.quiet = false; paso(0.05);
      check('Con el reto activo el récord queda pendiente (G.S se restaura al salir)', !!pendRecord && !had('FirstChallengeRecord'));
      G.retosApi.activo = false; paso(0.05);
      const pRe = panel('record'), eRe = S.events.find(e => e.key === 'FirstChallengeRecord');
      check('Al salir del reto → FirstChallengeRecord con el tiempo → viñeta «récord»', had('FirstChallengeRecord') && eRe && eRe.meta.ms === 61234 && !!pRe && /1:01/.test(pRe.text), pRe ? pRe.text : 'sin viñeta');
      G.retosApi._dev.C.nuevo = false;
      check('Un resultado que no es récord no se anota', alResultado({ modo: 'carrera', llego: true, puesto: 3, ms: 90000, prueba: false }) === false && !pendRecord);
      // Foto con pose: de frente, al cómic; una foto nueva reemplaza la anterior en la misma viñeta
      if (lienzoListo()) {
        const ok1 = tomarFoto('bailar');
        const pF = panel('foto'), cap1 = S.captures[imgDe('PhotoTaken') || 'foto'];
        check('«Foto» con un gesto → PhotoTaken → viñeta «foto» con la pose en el texto', ok1 && had('PhotoTaken') && esImagen(cap1) && !!pF && /bailar/i.test(pF.text), pF ? pF.text : 'sin viñeta');
        check('Al tomar la foto se avisa en el HUD', !$('toast').hidden && /Foto al cómic/.test($('toast').textContent), $('toast').textContent);
        const ok2 = tomarFoto('idea');
        const pF2 = panel('foto');
        check('Otra foto: reemplaza la imagen y el texto de la misma viñeta (sigue habiendo una) y queda como evento', ok2 && cuenta('PhotoTaken') === 2 && G.comic.comicPanels().filter(p => p.id === 'foto').length === 1 && !!pF2 && /idea/i.test(pF2.text), pF2 ? pF2.text : 'sin viñeta');
        check('Sin pose no hay foto', pedirFoto('') === false);
        G.ui.hideToast();
      } else check('Foto (ventana sin tamaño: no se puede fotografiar aquí)', true, 'lienzo 0×0');
      check('Las viñetas nuevas van en el orden en que pasaron', (() => { const P = G.comic.comicPanels(); return P.every((q, j) => j === 0 || P[j - 1].seq <= q.seq); })());
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      Object.assign(M, mBk);
      if (teniaApi) G.retosApi = apiBk; else delete G.retosApi;
      pendRecord = null; fotoT = 0;
      SV.restaurar(snap);
      SV.suspender(false); G.quiet = quiet;
      const f = document.getElementById('foto-flash'); if (f) f.remove();
    }
    check('G.S queda como estaba', JSON.stringify(SV.instantanea()) === JSON.stringify(snap));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  // AV.momentosTest (boot.js es del coordinador: se expone aquí si boot no lo hizo)
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.momentosTest) AV.momentosTest = o => test(o); }, 0);

  return { CLAVES, registrar, imgDe, alBrinco, alResultado, pedirFoto, tomarFoto, fotoFrente, paso, test, get pendiente() { return pendRecord; } };
});
