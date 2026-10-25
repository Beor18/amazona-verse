/* AVE · estado y guardado (dueño: Save & Cómic Engineer)
   G.S es el estado de la partida: su identidad no cambia (replace() lo rellena en sitio). Gancho 'apply' tras cargar o
   reiniciar: cada módulo deja el mundo como dice G.S.
   Datos del pack: meta.almacen (prefijo de localStorage), guardado { version, claves, estado(), migrar(d, h), validar(d) },
   jugador.aparicion { x, z }.

   ESQUEMA · JSON en localStorage `<almacen>.save` (cap1: amazonaverse.save)
     v          versión de los datos del pack (cap1: 5). La sube el pack y la migra pack.guardado.migrar(d, h).
     formato    versión del sobre del motor (2). Sin el campo = formato 1 (todas las partidas hasta cap1 v4).
     escrito    ms de la escritura (Date.now). Tras un corte elige la más nueva entre la principal y la temporal.
     saveId     id aleatorio local para los eventos. No identifica a nadie y nunca sale del dispositivo.
     profile    perfil { created, name, look }. name = nombre INVENTADO, se guarda saneado (sin correo, teléfono ni URL);
                look = apariencia 3D (AVCharacter.normalizeLook). Los perfiles viejos (preset/outfit/accessory) se conservan.
     wear       ropa puesta por ranura · unlocked: piezas ganadas · missions: { idMisión: bool }, con todas las del pack.
     step, complete: historia · field: Diario (ids de hallazgos) · events: eventos narrativos (eventos.js, sin datos
                personales) · comic: { title (de la lista del pack), cover, layout, order, captions: { id: índice de opción },
                vinetas: { id: { look, seq } } } · captures:
                JPEG del mundo · pos, facing, inv, collected, clock: mundo · + claves del pack (cap1: examined, refuge, edu…).
     satelites  copia de respaldo de los almacenes del dispositivo que tienen otro dueño:
                criadero (`<almacen>.criadero`: cápsulas/huevos con su estado y XP) y aula (pack.aula.clave: ajustes ES/EN,
                texto corto, voz, grado, estación y registro del Modo Maestro). Su clave propia manda: la copia solo se
                restaura al arrancar si esa clave está CORRUPTA (si falta porque se borró a propósito, no se resucita).
     resumen    solo lectura, derivado al escribir: { idioma, criadero: { huevos, activa, etapa, nivel, xp },
                nido: { activo (hay una misión hecha), presentado (Luma ya lo presentó), visitado } }.
   MIGRACIONES: primero las del pack (v), después las del motor (formato). cap1 v4 → v5 = mapa nuevo (pack) + formato 1 → 2
     (motor: perfil saneado y look modular, misiones completas, Diario y ropa sin duplicados, cómic completo y satélites).
     Una partida de una versión FUTURA no se carga: se aparta en .unreadable.
   ESCRITURA ATÓMICA: <clave>.tmp → se verifica leyéndola → la principal (si es legible) pasa a <clave>.prev → <clave> →
     se borra .tmp. Sin espacio: se reintenta sin capturas, luego sin .prev; si no, queda en memoria. Si el almacén no
     existe o lanza (modo privado, cuota llena, política del navegador), la partida sigue en memoria y se avisa una vez.
   LECTURA: la más nueva legible entre la principal y .tmp; si no hay, .prev; si no, la memoria de la sesión. La principal
     ilegible se copia a <clave>.unreadable antes de seguir.
   NUEVO ESTUDIANTE (gancho de aula.js en equipos compartidos): se borran la partida, .tmp, .prev, .unreadable (con sus
     satélites) y la memoria; el siguiente niño no hereda nada.
   PRIVACIDAD (COPPA/FERPA): sin nombre real, correo, teléfono, ubicación, cuentas ni ids de dispositivo; nada se envía.
   PRUEBAS: AV.saveTest() usa claves aisladas `<clave>.prueba-*` y deja intacta la partida real. ?partida=<id> en la URL
     aísla la clave de guardado de una pestaña (QA y agentes que comparten el origen). */
AVE.module('guardado', function (G) {
  'use strict';
  const S = G.S, P = G.pack.guardado || {}, $ = G.util.$;
  const STORE = (G.pack.meta && G.pack.meta.almacen) || G.pack.id;
  const ALT = (() => { try { const v = new URLSearchParams(location.search).get('partida'); return v && /^[a-z0-9_-]{1,24}$/i.test(v) ? v : ''; } catch (e) { return ''; } })();
  const SAVE_KEY = STORE + '.save' + (ALT ? '.' + ALT : '');
  const SAVE_VERSION = P.version || 1;
  const FORMATO = 2;
  const spawn = Object.assign({ x: 0, z: 0 }, G.pack.jugador && G.pack.jugador.aparicion);
  const BASE_KEYS = ['saveId', 'profile', 'comic', 'pos', 'facing', 'step', 'inv', 'collected', 'complete', 'events', 'captures', 'clock', 'missions', 'field', 'unlocked', 'wear'];
  const SAVED_KEYS = BASE_KEYS.concat(P.claves || []);
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);

  function freshState() {
    const inv = {}; for (const k of Object.keys(G.pack.objetos || {})) inv[k] = 0;
    const missions = {}; for (const m of G.pack.misiones || []) missions[m.id] = false;
    const comic = G.pack.comic || {};
    return Object.assign({
      v: SAVE_VERSION,
      pos: { x: spawn.x, z: spawn.z, y: 0 }, vy: 0, facing: { x: 0, z: 1 },
      step: 0, inv, collected: [], complete: false,
      water: G.terreno.waterBase, event: null, clock: 0,
      events: [], captures: {},
      missions, field: [], unlocked: [], wear: {},
      saveId: G.util.newId(),
      profile: { created: false, name: 'Aprendiz', look: null },
      comic: { title: comic.tituloDefecto || 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {}, vinetas: {} },
    }, P.estado ? P.estado() : {});
  }
  // Rellena G.S en sitio (su identidad no cambia: los módulos guardan la referencia)
  function replace(next) { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, next); }
  replace(freshState());

  // ---------- Almacenes: { get(k), set(k, v) → true | 'lleno' | 'bloqueado', del(k) }; nunca lanzan ----------
  const esCuota = e => !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  function almacenDe(fuente) {
    return {
      get(k) { try { const v = fuente().getItem(k); return v == null ? null : String(v); } catch (e) { return null; } },
      set(k, v) { try { fuente().setItem(k, v); return true; } catch (e) { return esCuota(e) ? 'lleno' : 'bloqueado'; } },
      del(k) { try { fuente().removeItem(k); } catch (e) { /* sin almacén */ } },
    };
  }
  // Almacén de mentira para las pruebas: 'bloqueado' lanza en todo (modo privado/política); 'lleno' lanza al pasar el límite
  function almacenFalso(modo, limite) {
    const m = new Map();
    const error = n => { const e = new Error(n); e.name = n; return e; };
    const be = almacenDe(() => ({
      getItem(k) { if (modo === 'bloqueado') throw error('SecurityError'); return m.has(k) ? m.get(k) : null; },
      setItem(k, v) {
        if (modo === 'bloqueado') throw error('SecurityError');
        if (modo === 'lleno') { let usado = 0; for (const [kk, vv] of m) if (kk !== k) usado += kk.length + vv.length; if (usado + k.length + String(v).length > limite) throw error('QuotaExceededError'); }
        m.set(k, String(v));
      },
      removeItem(k) { if (modo === 'bloqueado') throw error('SecurityError'); m.delete(k); },
    }));
    be.mapa = m;
    return be;
  }
  const NATIVO = almacenDe(() => window.localStorage);
  let almacen = NATIVO; // la prueba lo cambia un momento por uno bloqueado
  const estado = { almacen: 'local', ultimo: null, fuente: null, reparados: [] };
  (function sondear() { const k = STORE + '.__sonda'; const ok = NATIVO.set(k, '1') === true && NATIVO.get(k) === '1'; NATIVO.del(k); estado.almacen = ok ? 'local' : 'memoria'; })();

  // ---------- Privacidad: el texto libre se guarda sin correos, teléfonos ni URL ----------
  const PII = [/[^\s@]+@[^\s@]+\.[^\s@]+/g, /\b(?:https?:\/\/|www\.)\S+/gi, /(?:\+?\d[\s().\-]*){7,}/g];
  function limpiarTexto(s, max) {
    let t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ');
    for (const re of PII) t = t.replace(re, ' ');
    return t.replace(/\s+/g, ' ').trim().slice(0, max);
  }
  const limpiarNombre = n => limpiarTexto(n, 24) || 'Aprendiz'; // 24 = NAME_OK de creador.js ("Estrella de la Bahía")
  // Sin texto libre en el cómic (seguridad infantil): título de la lista del pack y textos de viñeta como índice de opción
  function limpiarComic(c) {
    const f = freshState().comic, o = Object.assign({}, f, esObj(c) ? c : {});
    const titulos = (G.pack.comic && G.pack.comic.titulos) || null;
    o.title = titulos && titulos.length ? (titulos.includes(o.title) ? o.title : titulos[0]) : limpiarTexto(o.title, 32) || f.title;
    const caps = {}; for (const [k, v] of Object.entries(esObj(o.captions) ? o.captions : {})) if (Number.isInteger(v) && v >= 0 && v < 100) caps[k] = v;
    o.captions = caps;
    o.vinetas = esObj(o.vinetas) ? o.vinetas : {};
    o.order = Array.isArray(o.order) ? o.order.filter(Number.isInteger) : f.order;
    return o;
  }

  // ---------- Satélites: almacenes del dispositivo con dueño propio (criadero.js, aula.js) ----------
  function satelitesDef() {
    const d = { criadero: STORE + '.' + ((window.AV_HUEVOS && window.AV_HUEVOS.sufijo) || 'criadero') };
    if (G.pack.aula) d.aula = G.pack.aula.clave || STORE + '.aula';
    return d;
  }
  function leerJSON(raw) { if (raw == null) return null; try { const d = JSON.parse(raw); return esObj(d) ? d : null; } catch (e) { return null; } }
  function sateliteSano(nombre, d) {
    if (!esObj(d) || typeof d.v !== 'number') return false;
    if (nombre === 'criadero') return esObj(d.capsulas);
    if (nombre === 'aula') return esObj(d.ajustes);
    return true;
  }
  function leerSatelites(be) {
    const out = {};
    for (const [nombre, clave] of Object.entries(satelitesDef())) { const d = leerJSON(be.get(clave)); out[nombre] = sateliteSano(nombre, d) ? d : null; }
    return out;
  }
  function resumenDe(sat, missions) {
    const r = { idioma: sat.aula && sat.aula.ajustes && sat.aula.ajustes.idioma === 'en' ? 'en' : 'es', criadero: null, nido: null };
    const c = sat.criadero;
    // Nido del mundo (criadero.js): aparece con la primera misión; Luma lo presenta una sola vez (st.presentado)
    r.nido = { activo: Object.values(esObj(missions) ? missions : {}).some(v => v === true), presentado: !!(c && c.presentado), visitado: !!(c && c.vistos && c.vistos.abierto) };
    if (c) {
      const caps = c.capsulas || {}, a = c.activa && caps[c.activa], CR = G.criadero;
      let etapa = null, nivel = null;
      try { if (a && CR && CR.etapaDe) etapa = CR.etapaDe(a); if (a && CR && CR.nivelDe) nivel = CR.nivelDe(a.xp || 0); } catch (e) { /* sin datos de huevos */ }
      r.criadero = { huevos: Object.keys(caps).length, activa: c.activa || null, etapa, nivel, xp: a ? a.xp || 0 : 0 };
    }
    return r;
  }
  // Al arrancar (antes de que aula y criadero lean su clave): una clave satélite corrupta vuelve de la copia de la partida
  function repararSatelites(be, d) {
    const hechos = [];
    if (!d || !esObj(d.satelites)) return hechos;
    for (const [nombre, clave] of Object.entries(satelitesDef())) {
      const copia = d.satelites[nombre], raw = be.get(clave);
      if (!sateliteSano(nombre, copia) || raw == null || sateliteSano(nombre, leerJSON(raw))) continue;
      be.set(clave + '.unreadable', raw);
      if (be.set(clave, JSON.stringify(copia)) === true) hechos.push(nombre);
    }
    return hechos;
  }

  // ---------- Serializar ----------
  let escritoUltimo = 0;
  function paraGuardar(sinCapturas, be) {
    const o = { v: SAVE_VERSION, formato: FORMATO, escrito: escritoUltimo = Math.max(Date.now(), escritoUltimo + 1) };
    for (const k of SAVED_KEYS) o[k] = S[k];
    o.profile = Object.assign({}, S.profile, { name: limpiarNombre(S.profile && S.profile.name) });
    o.comic = limpiarComic(S.comic);
    if (sinCapturas) o.captures = {};
    o.satelites = leerSatelites(be || almacen);
    o.resumen = resumenDe(o.satelites, o.missions);
    return o;
  }
  function serialize(sinCapturas, be) { return JSON.stringify(paraGuardar(sinCapturas, be)); }

  // ---------- Migraciones ----------
  const unicos = a => Array.from(new Set((Array.isArray(a) ? a : []).filter(x => typeof x === 'string')));
  const MIGRACIONES = {
    // formato 1 → 2 (en cap1 llega con v4 → v5)
    1(d, be) {
      const f = freshState(), m = Object.assign({}, d, { formato: 2 });
      const p = esObj(d.profile) ? d.profile : {};
      m.profile = Object.assign({}, p, { created: !!p.created, name: limpiarNombre(p.name), look: esObj(p.look) ? p.look : null });
      if (!m.profile.look && m.profile.created) { try { m.profile.look = G.creador.profileLook(p); } catch (e) { /* sin modelo: queda el formato viejo */ } }
      m.missions = Object.assign({}, f.missions); for (const [k, v] of Object.entries(esObj(d.missions) ? d.missions : {})) m.missions[k] = !!v;
      m.field = unicos(d.field); m.unlocked = unicos(d.unlocked);
      m.wear = esObj(d.wear) ? d.wear : {};
      m.comic = limpiarComic(d.comic);
      m.satelites = leerSatelites(be);
      m.resumen = resumenDe(m.satelites, m.missions);
      return m;
    },
  };
  function migrate(d, be) {
    if (!esObj(d)) return null;
    if (P.migrar) d = P.migrar(d, { freshState, newId: G.util.newId, makeEvent: (...a) => G.eventos.make(...a) });
    let f = esObj(d) && d.v === SAVE_VERSION ? d.formato || 1 : FORMATO;
    while (f < FORMATO && MIGRACIONES[f]) { d = MIGRACIONES[f](d, be || almacen); f = d.formato; }
    return d;
  }
  function validSave(d) {
    return !!(esObj(d) && d.v === SAVE_VERSION && (d.formato || 1) === FORMATO && typeof d.saveId === 'string' && esObj(d.profile) && esObj(d.comic) &&
      esObj(d.pos) && Number.isFinite(d.pos.x) && Number.isFinite(d.pos.z) && typeof d.step === 'number' && esObj(d.inv) &&
      Array.isArray(d.collected) && Array.isArray(d.events) && (d.missions == null || esObj(d.missions)) && (d.field == null || Array.isArray(d.field)) &&
      (!P.validar || P.validar(d)));
  }
  function legible(raw, be) {
    if (!raw) return null;
    let d; try { d = migrate(JSON.parse(raw), be); } catch (e) { return null; }
    return validSave(d) ? d : null;
  }

  // ---------- Escritura atómica ----------
  // Un contexto = { be: almacén, K: clave, mem: { json } }. El real usa el almacén vivo y SAVE_KEY.
  const REAL = { get be() { return almacen; }, K: SAVE_KEY, mem: { json: null }, ultimo: null };
  function escribirAtomico(c, json) {
    const be = c.be, K = c.K, TMP = K + '.tmp';
    let r = be.set(TMP, json);
    if (r !== true) { be.del(TMP); return r; }
    if (be.get(TMP) !== json) { be.del(TMP); return 'bloqueado'; } // el almacén no devuelve lo escrito: no es fiable
    const cur = be.get(K);
    if (cur && cur !== json && (cur === c.ultimo || legible(cur, be))) { if (be.set(K + '.prev', cur) !== true) be.del(K + '.prev'); }
    r = be.set(K, json);
    if (r !== true) return r; // la temporal verificada queda y gana al cargar
    be.del(TMP);
    c.ultimo = json;
    return true;
  }
  // → 'ok' | 'sin-capturas' | 'sin-copia' | 'memoria'
  function guardarEn(c) {
    let json = serialize(false, c.be);
    c.mem.json = json; // la sesión nunca se pierde: lo último queda en memoria
    let r = escribirAtomico(c, json);
    if (r === true) return 'ok';
    if (r === 'lleno') {
      json = serialize(true, c.be); r = escribirAtomico(c, json);
      if (r === true) return 'sin-capturas';
      if (r === 'lleno') { c.be.del(c.K + '.prev'); r = escribirAtomico(c, json); if (r === true) return 'sin-copia'; }
    }
    return 'memoria';
  }
  let suspendido = false, avisadoMemoria = false;
  function save(silent) {
    if (suspendido) return false;
    const r = guardarEn(REAL);
    estado.ultimo = r; estado.almacen = r === 'memoria' ? 'memoria' : 'local';
    const toast = (t, ms) => { if (!silent && !G.quiet) G.ui.toast(t, ms); };
    if (r === 'ok') toast(L('Partida guardada', 'Game saved'));
    else if (r === 'sin-capturas') toast(L('Partida guardada (sin imágenes del cómic)', 'Game saved (without comic images)'));
    else if (r === 'sin-copia') toast(L('Partida guardada (sin copia de respaldo: falta espacio)', 'Game saved (no backup copy: storage is full)'));
    else {
      const msg = L('Este navegador no deja guardar (modo privado o sin espacio). Tu partida sigue mientras no cierres la pestaña.',
        'This browser cannot save (private mode or full storage). Your game continues while this tab stays open.');
      if (!avisadoMemoria && !G.quiet) { avisadoMemoria = true; G.ui.toast(msg, 6000); } else toast(msg, 4000);
    }
    return r !== 'memoria';
  }
  let saveDebounce = 0;
  function autosave() { saveDebounce = 0.5; }
  G.on('update', dt => { if (saveDebounce > 0) { saveDebounce -= dt; if (saveDebounce <= 0) save(true); } }, 80);
  // Al ocultar o cerrar la pestaña se escribe lo pendiente (Chromebooks y móviles cierran sin avisar)
  const pendiente = () => { if (saveDebounce > 0) { saveDebounce = 0; save(true); } };
  addEventListener('pagehide', pendiente);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') pendiente(); });

  // ---------- Lectura ----------
  // La mejor partida de un contexto: { d, fuente: 'principal'|'temporal'|'anterior'|'memoria'|null, danada }
  function leerMejor(c) {
    const be = c.be, raw = be.get(c.K), tmp = be.get(c.K + '.tmp');
    const dP = legible(raw, be), dT = legible(tmp, be);
    let d = null, fuente = null;
    if (dP && dT && (dT.escrito || 0) > (dP.escrito || 0)) { d = dT; fuente = 'temporal'; }
    else if (dP) { d = dP; fuente = 'principal'; }
    else if (dT) { d = dT; fuente = 'temporal'; }
    else { const dA = legible(be.get(c.K + '.prev'), be); if (dA) { d = dA; fuente = 'anterior'; } }
    const dM = c.mem && legible(c.mem.json, be);
    if (dM && (!d || (dM.escrito || 0) > (d.escrito || 0))) { d = dM; fuente = 'memoria'; }
    return { d, fuente, danada: raw && !dP ? raw : null };
  }
  function aplicar(d) {
    const f = freshState();
    const next = Object.assign(f, d, { event: null, water: G.terreno.waterBase, vy: 0, captures: d.captures || {} });
    next.missions = Object.assign({}, f.missions, d.missions);
    next.comic = limpiarComic(d.comic);
    for (const k of ['formato', 'escrito', 'satelites', 'resumen']) delete next[k];
    replace(next);
    escritoUltimo = Math.max(escritoUltimo, d.escrito || 0);
    applyWorld();
  }
  // → true si cargó (de la principal, la temporal, la copia anterior o la memoria)
  function cargarDe(c) {
    const r = leerMejor(c);
    if (r.danada) c.be.set(c.K + '.unreadable', r.danada);
    c.fuente = r.fuente;
    if (!r.d) return false;
    aplicar(r.d);
    return true;
  }
  function load(silent) {
    const toast = t => { if (!silent && !G.quiet) G.ui.toast(t); };
    const ok = cargarDe(REAL);
    estado.fuente = REAL.fuente;
    if (!ok) {
      const danada = REAL.be.get(SAVE_KEY) != null;
      toast(danada ? L('No se pudo leer la partida guardada; se guardó una copia y empiezas de nuevo', 'The saved game could not be read; a copy was kept and you start over')
        : L('No hay partida guardada', 'No saved game'));
      return false;
    }
    if (REAL.fuente === 'anterior' || REAL.fuente === 'temporal') { if (!G.quiet) G.ui.toast(L('Tu partida tenía un problema: se recuperó la última copia buena.', 'Your save had a problem: the last good copy was restored.'), 4500); }
    else toast(L('Partida cargada', 'Game loaded'));
    return true;
  }
  function applyWorld() { G.emit('apply'); }
  function reset(skipCreator) {
    replace(freshState());
    for (const s of ['', '.tmp', '.prev']) almacen.del(SAVE_KEY + s);
    REAL.mem.json = null; REAL.ultimo = null; saveDebounce = 0;
    applyWorld();
    if (!skipCreator) G.creador.open(true);
  }
  // Equipo compartido (aula.js): nada del niño anterior queda en este almacén, ni en la copia de los satélites
  function olvidarEstudiante() {
    for (const s of ['', '.tmp', '.prev', '.unreadable']) almacen.del(SAVE_KEY + s);
    for (const clave of Object.values(satelitesDef())) almacen.del(clave + '.unreadable');
    REAL.mem.json = null; REAL.ultimo = null; saveDebounce = 0;
  }
  G.on('nuevoEstudiante', olvidarEstudiante, 10);

  // Arranque: repara satélites corruptos con la copia de la partida más nueva
  (function repararAlArrancar() {
    let mejor = null;
    for (const s of ['', '.tmp', '.prev']) { const d = leerJSON(almacen.get(SAVE_KEY + s)); if (d && esObj(d.satelites) && (!mejor || (d.escrito || 0) > (mejor.escrito || 0))) mejor = d; }
    estado.reparados = repararSatelites(almacen, mejor);
  })();

  $('b-save').onclick = () => save(false);
  $('b-load').onclick = () => load(false);
  $('b-reset').onclick = () => { reset(); G.ui.toast(L('Partida nueva', 'New game')); };
  $('b-again').onclick = () => { reset(); };

  // Las pruebas de otros módulos (cómic) congelan el guardado real mientras cambian G.S
  function suspender(v) { suspendido = !!v; saveDebounce = 0; }
  function instantanea() { return JSON.parse(JSON.stringify(S)); }
  function restaurar(snap) { replace(JSON.parse(JSON.stringify(snap))); applyWorld(); }

  // =====================================================================================================================
  // AV.saveTest(): guardar, "cerrar" y recargar, persistencia, corrupción, corte a mitad, migración desde la versión
  // anterior, almacén bloqueado y lleno, nuevo estudiante y privacidad. Claves aisladas; la partida real y G.S quedan
  // como estaban. { iframe: true } añade una recarga real: arranca el juego en un iframe con ?partida=<prueba>.
  // =====================================================================================================================
  async function test(opts) {
    opts = opts || {};
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const id = 'prueba-' + G.util.newId().slice(0, 6), KT = SAVE_KEY + '.' + id;
    const claves = K => ['', '.tmp', '.prev', '.unreadable'].map(s => K + s);
    const realAntes = claves(SAVE_KEY).map(k => NATIVO.get(k));
    const respaldo = instantanea();
    const antes = { almacen, mem: REAL.mem.json, ultimo: REAL.ultimo, aviso: avisadoMemoria, quiet: G.quiet, estado: Object.assign({}, estado) };
    const ctx = (be, K) => ({ be, K, mem: { json: null }, ultimo: null });
    const comparable = d => { const o = {}; for (const k of SAVED_KEYS) o[k] = d && d[k]; return JSON.stringify(o); };
    suspender(true); G.quiet = true;
    const sat = satelitesDef();
    let iframe = null;
    try {
      // 1. Guardar en una clave aislada
      const C = ctx(NATIVO, KT);
      const hallazgo = ((G.pack.diario && G.pack.diario.entradas) || [])[0];
      const mision = Object.keys(S.missions)[0];
      // Nombre de la lista del pack (creador.js cambia al cargar los que no salen de ella)
      const nombre = s => (G.creador && G.creador.nombreAzar ? G.creador.nombreAzar(s) : 'Prueba ' + s);
      const N1 = nombre(7), N2 = nombre(11);
      S.profile = Object.assign({}, S.profile, { created: true, name: N1 });
      S.step = 3; S.comic.title = 'Título de prueba';
      if (mision) S.missions[mision] = true;
      if (hallazgo) S.field = [hallazgo.id];
      const lookTecho = { species: 'agilis', accessories: { neck: { id: 'panuelo', color: '#7a4fb3' } } };
      S.comic.vinetas = Object.assign({}, S.comic.vinetas, { techo: { look: lookTecho, seq: 99 } }); // viñeta del motor con su look
      const r1 = guardarEn(C), d1 = leerJSON(NATIVO.get(KT));
      check('Guardar escribe la partida en su clave', r1 === 'ok' && !!d1, r1);
      check(`Esquema v${SAVE_VERSION} · formato ${FORMATO}: perfil, apariencia, misiones, Diario, ropa, cómic, satélites y resumen`,
        d1 && d1.v === SAVE_VERSION && d1.formato === FORMATO && esObj(d1.profile) && 'look' in d1.profile && esObj(d1.missions) && Array.isArray(d1.field) &&
        esObj(d1.wear) && esObj(d1.comic) && esObj(d1.satelites) && 'criadero' in d1.satelites && (!G.pack.aula || 'aula' in d1.satelites) && esObj(d1.resumen),
        d1 ? Object.keys(d1).length + ' claves' : 'sin datos');
      check('Escritura atómica: no queda la temporal', NATIVO.get(KT + '.tmp') === null);
      // 2. Segunda escritura: la anterior pasa a .prev
      S.step = 4; const r2 = guardarEn(C), dA = leerJSON(NATIVO.get(KT + '.prev')), d2 = leerJSON(NATIVO.get(KT));
      check('Conserva la copia anterior (.prev)', r2 === 'ok' && dA && dA.step === 3 && d2 && d2.step === 4, dA ? 'prev paso ' + dA.step : 'sin .prev');
      // 3. "Cerrar" y volver a abrir: estado nuevo, sin memoria y un almacén nuevo sobre el mismo localStorage
      const esperado = comparable(d2), rawPaso4 = NATIVO.get(KT);
      replace(freshState());
      const C2 = ctx(almacenDe(() => window.localStorage), KT);
      const ok3 = cargarDe(C2);
      check('Tras cerrar y recargar, la partida persiste igual', ok3 && C2.fuente === 'principal' && comparable(JSON.parse(serialize(false, C2.be))) === esperado,
        `paso ${S.step} · ${S.profile.name} · fuente ${C2.fuente}`);
      check('Persisten misiones y Diario', (!mision || S.missions[mision] === true) && (!hallazgo || S.field[0] === hallazgo.id));
      check('Persiste la viñeta del motor con la apariencia de su momento', S.comic.vinetas.techo && JSON.stringify(S.comic.vinetas.techo.look) === JSON.stringify(lookTecho));
      // Nido y presentación de Luma: viajan en la copia del criadero y en el resumen
      const FN = almacenFalso();
      FN.set(sat.criadero, JSON.stringify({ v: 1, activa: 'h1', capsulas: { h1: { estado: 'incubando', xp: 40 } }, presentado: true, vistos: { abierto: 1 } }));
      guardarEn(ctx(FN, KT)); const dN = leerJSON(FN.get(KT));
      check('Se guardan el nido y la presentación de Luma', dN && dN.satelites.criadero && dN.satelites.criadero.presentado === true && dN.resumen.nido &&
        dN.resumen.nido.presentado && dN.resumen.nido.visitado && dN.resumen.nido.activo === Object.values(S.missions).some(v => v === true), dN ? JSON.stringify(dN.resumen.nido) : '');
      // 4. Corrupción: principal truncada → se recupera .prev y lo dañado se aparta
      NATIVO.set(KT, rawPaso4.slice(0, Math.floor(rawPaso4.length / 2)));
      const ok4 = cargarDe(C2);
      check('Partida corrupta: se recupera la copia anterior', ok4 && C2.fuente === 'anterior' && S.step === 3, `fuente ${C2.fuente} · paso ${S.step}`);
      check('Lo corrupto se aparta en .unreadable', (NATIVO.get(KT + '.unreadable') || '').length === Math.floor(rawPaso4.length / 2));
      // 4b. Corte entre la temporal y el cambio: gana la temporal verificada (más nueva)
      NATIVO.set(KT, rawPaso4); S.step = 6; NATIVO.set(KT + '.tmp', serialize(false, NATIVO));
      const ok4b = cargarDe(C2);
      check('Corte a mitad de la escritura: gana la temporal verificada', ok4b && C2.fuente === 'temporal' && S.step === 6, `fuente ${C2.fuente} · paso ${S.step}`);
      // 4c. Todo ilegible (y una versión futura): no se carga nada y la sesión sigue igual
      S.step = 5; const firma = JSON.stringify(S.profile) + '|' + S.step;
      NATIVO.set(KT, JSON.stringify(Object.assign(JSON.parse(rawPaso4), { v: SAVE_VERSION + 1 }))); NATIVO.set(KT + '.prev', '{"v":1}'); NATIVO.set(KT + '.tmp', 'null');
      const ok4c = cargarDe(C2);
      check('Sin copia sana ni versión conocida: no carga y la sesión sigue intacta', ok4c === false && JSON.stringify(S.profile) + '|' + S.step === firma);
      // 5. Migración desde la versión anterior (cap1: v4, la publicada) con los almacenes del dispositivo
      const F = almacenFalso();
      const vieja = Object.assign(JSON.parse(serialize(false, F)), { v: Math.max(1, SAVE_VERSION - 1) });
      for (const k of ['formato', 'escrito', 'satelites', 'resumen']) delete vieja[k];
      const ids = Object.keys(vieja.missions), nueva = ids[ids.length - 1];
      if (nueva) delete vieja.missions[nueva]; // misión que la versión anterior no tenía
      vieja.profile = { created: true, name: 'Ana 787 555 0123', preset: 'agilis', outfit: 'morado', accessory: 'gafas' }; // perfil viejo, sin look
      vieja.field = hallazgo ? [hallazgo.id, hallazgo.id] : []; vieja.unlocked = ['pava', 'pava']; vieja.step = 2;
      vieja.comic = { title: 'Mi cómic', captions: { intro: 'escríbeme a ana@correo.com' } }; vieja.captures = {};
      const capViejo = { v: 1, activa: 'h1', vista: 'h1', capsulas: { h1: { estado: 'nacida', xp: 300 } }, otorgado: {}, banco: 0, cargas: 2, fuentes: { aprender: 300 },
        presentado: true, vistos: { abierto: 1, 'nacio:h1': 1 }, compa: 'h1' };
      const conMision = !!mision && mision !== nueva;
      if (conMision) vieja.missions[mision] = true; // con una misión hecha, el nido ya está en el mundo
      const aulaVieja = { v: 1, ajustes: { idioma: 'en', corto: true, voz: false, grado: '5-6', estacion: 'Estación 4' }, partidas: [{ grado: '5-6', pasos: 8 }] };
      F.set(KT, JSON.stringify(vieja)); F.set(sat.criadero, JSON.stringify(capViejo)); if (sat.aula) F.set(sat.aula, JSON.stringify(aulaVieja));
      const CF = ctx(F, KT), m = leerMejor(CF).d;
      const migrable = SAVE_VERSION === 1 || !!P.migrar;
      check(`Migra v${vieja.v} → v${SAVE_VERSION} (formato 1 → ${FORMATO}) y valida`, migrable ? m && m.v === SAVE_VERSION && m.formato === FORMATO : true, m ? 'v' + m.v + ' f' + m.formato : 'no migró');
      if (m) {
        check('Migra perfil y apariencia (look modular desde el perfil viejo)', m.profile.created && m.profile.preset === 'agilis' && (!window.AVCharacter || (esObj(m.profile.look) && m.profile.look.species === 'agilis')),
          m.profile.look ? m.profile.look.species : 'sin look');
        check('Migra misiones (la nueva en false), Diario y ropa sin duplicados', (!nueva || m.missions[nueva] === false) && (!mision || mision in m.missions) &&
          m.field.length === (hallazgo ? 1 : 0) && m.unlocked.length === 1);
        const cr = m.satelites.criadero, rc = m.resumen && m.resumen.criadero;
        check('Migra el criadero (huevos, etapa y XP)', cr && cr.capsulas.h1.xp === 300 && rc && rc.huevos === 1 && rc.xp === 300 && (!G.criadero || !!rc.etapa), rc ? `${rc.huevos} huevo · ${rc.etapa} · nivel ${rc.nivel} · ${rc.xp} XP` : 'sin criadero');
        const nm = m.resumen && m.resumen.nido;
        check('Migra el nido y la presentación de Luma (no se repite)', cr && cr.presentado === true && cr.vistos.abierto === 1 && nm && nm.presentado && nm.visitado && nm.activo === conMision,
          nm ? JSON.stringify(nm) : 'sin nido');
        if (sat.aula) check('Migra aula/Modo Maestro y ajustes ES/EN', m.satelites.aula && m.satelites.aula.ajustes.idioma === 'en' && m.satelites.aula.partidas.length === 1 && m.resumen.idioma === 'en');
        const js = JSON.stringify(m);
        check('La migración limpia datos personales (teléfono y correo)', !js.includes('555 0123') && !js.includes('ana@') && m.profile.name === 'Ana', m.profile.name);
        const ok5 = cargarDe(CF);
        check('La partida migrada se carga en el juego', ok5 && S.step === 2 && S.profile.created && esObj(S.comic.vinetas));
      }
      // 5b. Satélite corrupto: vuelve de la copia; uno borrado a propósito no se resucita
      const RF = almacenFalso(); RF.set(sat.criadero, '{roto');
      const copia = { satelites: { criadero: capViejo } };
      const rep1 = repararSatelites(RF, copia);
      check('Criadero corrupto: se restaura desde la copia (con XP y la presentación de Luma hecha)', rep1.includes('criadero') && leerJSON(RF.get(sat.criadero)).capsulas.h1.xp === 300 &&
        leerJSON(RF.get(sat.criadero)).presentado === true && RF.get(sat.criadero + '.unreadable') === '{roto');
      const RB = almacenFalso(); const rep2 = repararSatelites(RB, copia);
      check('Criadero borrado a propósito: no se resucita', rep2.length === 0 && RB.get(sat.criadero) === null);
      // 6. Almacén bloqueado (modo privado, política o throw): la sesión sigue en memoria
      const B = almacenFalso('bloqueado'), CB = ctx(B, KT);
      S.step = 7; let r6 = null, lanzo = false;
      try { r6 = guardarEn(CB); } catch (e) { lanzo = true; }
      check('Almacén bloqueado: guardar no lanza y la partida queda en memoria', !lanzo && r6 === 'memoria' && !!CB.mem.json, r6);
      replace(freshState());
      let ok6 = false; try { ok6 = cargarDe(CB); } catch (e) { ok6 = false; }
      check('Almacén bloqueado: la sesión se recupera desde la memoria', ok6 && CB.fuente === 'memoria' && S.step === 7, `fuente ${CB.fuente} · paso ${S.step}`);
      almacen = B; suspendido = false; let rReal = null, lanzoReal = false;
      try { rReal = save(true); } catch (e) { lanzoReal = true; }
      suspendido = true; almacen = antes.almacen;
      check('El save() del juego con el almacén bloqueado no lanza y pasa a modo memoria', !lanzoReal && rReal === false && estado.almacen === 'memoria' && estado.ultimo === 'memoria');
      // 6b. Cuota llena: primero sin capturas; si no cabe nada, en memoria
      S.captures = Object.assign({}, S.captures, { prueba: 'data:image/jpeg;base64,' + 'A'.repeat(60000) });
      const chico = serialize(true, almacenFalso()).length;
      const Q = almacenFalso('lleno', 2 * chico + 4 * KT.length + 2000), CQ = ctx(Q, KT);
      const r7 = guardarEn(CQ);
      check('Cuota llena: se guarda sin las imágenes del cómic', r7 === 'sin-capturas' && esObj(leerJSON(Q.get(KT))), r7);
      const r8 = guardarEn(ctx(almacenFalso('lleno', 100), KT));
      check('Cuota agotada: queda en memoria, sin lanzar', r8 === 'memoria', r8);
      // 7. Privacidad: el texto libre no guarda correos, teléfonos ni URL
      S.profile = Object.assign({}, S.profile, { name: 'Leo 7875550123' });
      S.comic.captions = { a: 'mi correo es leo@escuela.edu', b: 'mira www.leo.com', c: 2 };
      const js7 = serialize(true, almacenFalso()), p7 = JSON.parse(js7);
      check('Sin datos personales ni texto libre en el guardado (correo, teléfono, URL)', !/leo@|www\.leo|7875550123/.test(js7) && p7.profile.name === 'Leo' &&
        JSON.stringify(p7.comic.captions) === '{"c":2}', p7.profile.name + ' · ' + JSON.stringify(p7.comic.captions));
      // 7b. Nuevo estudiante: la partida y todas sus copias se borran (también la de los satélites)
      const almReal = almacen, NE = almacenFalso();
      for (const s of ['', '.tmp', '.prev', '.unreadable']) NE.set(SAVE_KEY + s, '{"x":1}');
      NE.set(sat.criadero + '.unreadable', '{}');
      almacen = NE; REAL.mem.json = '{"x":1}';
      olvidarEstudiante(); // el mismo manejador del gancho, sin avisar a los demás módulos (borrarían sus datos reales)
      almacen = almReal;
      check('Nuevo estudiante: se borran la partida, .tmp, .prev, .unreadable y la memoria', NE.mapa.size === 0 && REAL.mem.json === null, NE.mapa.size + ' claves quedan');
      // 8. Recarga real (opcional): el juego arranca en un iframe con ?partida=<id> y debe leer lo guardado
      if (opts.iframe) {
        const KI = STORE + '.save.' + id;
        S.profile = Object.assign({}, S.profile, { created: true, name: N2 }); S.step = 5;
        guardarEn(ctx(NATIVO, KI));
        const url = new URL(location.href); url.searchParams.set('partida', id); url.searchParams.delete('qa');
        iframe = document.createElement('iframe'); iframe.setAttribute('aria-hidden', 'true'); iframe.tabIndex = -1;
        iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;height:480px;border:0;';
        iframe.src = url.href; document.body.appendChild(iframe);
        let W = null; const t0 = performance.now();
        while (performance.now() - t0 < (opts.timeout || 45000)) {
          await new Promise(r => setTimeout(r, 200));
          try { W = iframe.contentWindow; if (W && W.AV && W.AV.state && W.AV.G && W.AV.G.guardado) break; } catch (e) { /* cargando */ }
          W = null;
        }
        const st = W && W.AV.state;
        check('Recarga real (iframe ?partida=): el juego arranca con la partida guardada', st && st.step === 5 && st.profile.name === N2 && W.AV.G.guardado.KEY === KI,
          st ? `paso ${st.step} · ${st.profile.name} · ${Math.round((performance.now() - t0) / 1000)} s` : 'no arrancó');
        try { if (W) { W.AV.G.guardado.suspender(true); W.AV.renderer.dispose(); W.AV.renderer.forceContextLoss(); } } catch (e) { /* cerrado */ }
        iframe.remove(); iframe = null;
        for (const k of claves(KI)) NATIVO.del(k);
      }
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      if (iframe) iframe.remove();
      for (const k of claves(KT)) NATIVO.del(k);
      almacen = antes.almacen; REAL.mem.json = antes.mem; REAL.ultimo = antes.ultimo; avisadoMemoria = antes.aviso;
      Object.assign(estado, antes.estado);
      restaurar(respaldo);
      suspender(false); G.quiet = antes.quiet;
    }
    const intacta = claves(SAVE_KEY).every((k, i) => NATIVO.get(k) === realAntes[i]);
    check('La partida real del jugador y G.S quedan intactos', intacta && comparable(S) === comparable(respaldo));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  // AV.saveTest (boot.js es del coordinador: se expone aquí si boot no lo hizo)
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.saveTest) AV.saveTest = o => test(o); }, 0);

  return { KEY: SAVE_KEY, VERSION: SAVE_VERSION, FORMATO, KEYS: SAVED_KEYS, spawn, freshState, replace, serialize, save, autosave, migrate, validSave, load,
    applyWorld, reset, estado: () => Object.assign({}, estado), limpiarTexto, suspender, instantanea, restaurar, test };
});
