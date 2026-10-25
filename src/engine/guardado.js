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
     step, complete: historia · explorando: true si cerró el panel final con «Seguir explorando» (no se reabre solo; un
                guardado sin el campo cuenta como false) · field: Diario (ids de hallazgos) · events: eventos narrativos
                (eventos.js, sin datos personales) · comic: { title (de la lista del pack), cover, layout, order, captions: { id: índice de opción },
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
     Una partida de una versión FUTURA no se carga: se aparta en una copia de rescate con fecha (ver COPIAS DE RESCATE).
   ESCRITURA ATÓMICA: <clave>.tmp → se verifica leyéndola → la principal (si es legible) pasa a <clave>.prev → <clave> →
     se borra .tmp. Sin espacio: se reintenta sin capturas, luego sin .prev; si no, queda en memoria. Si el almacén no
     existe o lanza (modo privado, cuota llena, política del navegador), la partida sigue en memoria y se avisa una vez.
   LECTURA: la más nueva legible entre la principal y .tmp; si no hay, .prev; si no, la memoria de la sesión. Lo ilegible
     (dañado o de una versión futura) se aparta en una copia de rescate antes de seguir.
   COPIAS DE RESCATE: <clave>.unreadable.<aaaammddThhmmssmmm>, hasta 3 (las de la partida y las de cada satélite por separado).
     Nunca comparten un único hueco: una copia nueva no pisa a las anteriores, y la más vieja solo sale si pasa de 3 o si hace
     falta sitio. Una copia idéntica a otra ya guardada no se repite (cada arranque ve lo mismo). Antes de escribir encima de
     una principal ilegible se aparta; si no hay sitio para apartarla, no se pisa (gana la temporal). Antes de este esquema
     había un solo <clave>.unreadable: cuenta como la copia más vieja.
   ARRANQUE SIN PARTIDA LEGIBLE: arrancarVacio() empieza una partida nueva en memoria SIN borrar nada; si había algo ilegible
     se avisa con suavidad al cerrar la portada y la principal ilegible solo se sustituye al guardar, ya con su copia aparte.
   NUEVO ESTUDIANTE (gancho de aula.js en equipos compartidos): se borran la partida, .tmp, .prev, todas las copias de rescate
     (con las de los satélites) y la memoria; el siguiente niño no hereda nada.
   BORRADO EXPLÍCITO: la partida y el cómic solo se borran por «Comenzar de cero» (menú de pausa y panel final, los dos con
     pregunta dentro del juego) o «Nuevo estudiante» (Modo Maestro, dos toques). Recargar, cargar, el creador y los errores de
     lectura no borran: una partida ilegible se aparta en una copia con fecha antes de empezar vacío. Único recorte sin elección: con
     el almacén lleno se sacrifica primero la copia .prev y solo si aun así no cabe se guarda sin las fotos del cómic; en
     memoria siguen intactas y cada guardado vuelve a intentarlo completo.
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
  const BASE_KEYS = ['saveId', 'profile', 'comic', 'pos', 'facing', 'step', 'inv', 'collected', 'complete', 'explorando', 'events', 'captures', 'clock', 'missions', 'field', 'unlocked', 'wear'];
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
      step: 0, inv, collected: [], complete: false, explorando: false,
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
      // Claves que empiezan por pre (para las copias de rescate con fecha)
      claves(pre) { try { const s = fuente(), out = []; for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k != null && k.startsWith(pre)) out.push(k); } return out; } catch (e) { return []; } },
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
      get length() { if (modo === 'bloqueado') throw error('SecurityError'); return m.size; },
      key(i) { if (modo === 'bloqueado') throw error('SecurityError'); const ks = [...m.keys()]; return i < ks.length ? ks[i] : null; },
    }));
    be.mapa = m;
    return be;
  }
  const NATIVO = almacenDe(() => window.localStorage);
  let almacen = NATIVO; // la prueba lo cambia un momento por uno bloqueado
  const estado = { almacen: 'local', ultimo: null, fuente: null, reparados: [], ilegible: false };
  (function sondear() { const k = STORE + '.__sonda'; const ok = NATIVO.set(k, '1') === true && NATIVO.get(k) === '1'; NATIVO.del(k); estado.almacen = ok ? 'local' : 'memoria'; })();

  // ---------- Copias de rescate de lo ilegible (ver COPIAS DE RESCATE en la cabecera) ----------
  const MAX_COPIAS = 3;
  const sello = () => new Date().toISOString().replace(/[-:.Z]/g, ''); // 20261025T171530123
  // → [{ clave, fecha, raw }] de la más vieja a la más nueva; el hueco único de antes (<base>.unreadable) cuenta como la más vieja
  function copiasIlegibles(be, base) {
    const viejo = base + '.unreadable', ks = be.claves(viejo + '.');
    if (be.get(viejo) != null) ks.push(viejo);
    return ks.map(clave => ({ clave, fecha: clave.slice(viejo.length + 1), raw: be.get(clave) })).filter(c => c.raw != null)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  }
  // Aparta raw sin pisar ninguna copia → la clave donde queda, o null si no hay sitio (entonces quien llama no debe pisar el original)
  function archivarIlegible(be, base, raw, fecha) {
    if (!raw) return null;
    const previas = copiasIlegibles(be, base), igual = previas.find(c => c.raw === raw);
    if (igual) return igual.clave;
    const f = fecha || sello(); let clave = base + '.unreadable.' + f;
    for (let n = 2; be.get(clave) != null; n++) clave = base + '.unreadable.' + f + '-' + n;
    let r = be.set(clave, raw);
    const viejas = previas.slice();
    while (r === 'lleno' && viejas.length) { be.del(viejas.shift().clave); r = be.set(clave, raw); } // la más vieja sale solo si hace falta sitio
    if (r !== true) return null;
    const todas = copiasIlegibles(be, base);
    for (const c of todas.slice(0, Math.max(0, todas.length - MAX_COPIAS))) be.del(c.clave);
    return clave;
  }
  // Si la principal de la partida no se puede leer, aparta ella y las copias ilegibles (.tmp, .prev) → false si algo no cupo
  function rescatarIlegibles(be, K) {
    const main = be.get(K);
    if (!main || legible(main, be)) return true;
    let todo = true;
    for (const s of ['', '.tmp', '.prev']) { const raw = be.get(K + s); if (raw && !legible(raw, be) && !archivarIlegible(be, K, raw)) todo = false; }
    return todo;
  }

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
      archivarIlegible(be, clave, raw); // copia de rescate con fecha, sin pisar las anteriores
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
    if (cur && cur !== json) {
      if (cur === c.ultimo || legible(cur, be)) { if (be.set(K + '.prev', cur) !== true) be.del(K + '.prev'); }
      // Una principal ilegible nunca se pisa sin su copia de rescate; si no cabe, no se pisa (la temporal verificada gana al cargar)
      else if (!archivarIlegible(be, K, cur)) return 'lleno';
    }
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
      // Sin espacio: primero se sacrifica la copia de respaldo (.prev); las fotos del cómic son lo último que se recorta
      c.be.del(c.K + '.prev'); r = escribirAtomico(c, json);
      if (r === true) return 'sin-copia';
      if (r === 'lleno') { json = serialize(true, c.be); r = escribirAtomico(c, json); if (r === true) return 'sin-capturas'; }
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
    if (r.danada) rescatarIlegibles(c.be, c.K); // dañada o de una versión futura: copia con fecha, nunca se borra
    c.fuente = r.fuente;
    if (!r.d) return false;
    aplicar(r.d);
    return true;
  }
  const MSG_ILEGIBLE = () => L('No pudimos abrir tu partida guardada; la guardamos por si se puede recuperar',
    'We could not open your saved game; we kept it in case it can be recovered');
  function load(silent) {
    const toast = t => { if (!silent && !G.quiet) G.ui.toast(t); };
    estado.ilegible = false;
    const ok = cargarDe(REAL);
    estado.fuente = REAL.fuente;
    if (!ok) {
      const danada = REAL.be.get(SAVE_KEY) != null;
      estado.ilegible = danada; // al arrancar, arrancarVacio() avisa cuando la portada deja ver el juego
      toast(danada ? MSG_ILEGIBLE() : L('No hay partida guardada', 'No saved game'));
      return false;
    }
    if (REAL.fuente === 'anterior' || REAL.fuente === 'temporal') { if (!G.quiet) G.ui.toast(L('Tu partida tenía un problema: se recuperó la última copia buena.', 'Your save had a problem: the last good copy was restored.'), 4500); }
    else toast(L('Partida cargada', 'Game loaded'));
    return true;
  }
  function applyWorld() { G.emit('apply'); }
  // Arranque sin partida legible (src/engine/core.js): empieza una partida nueva en memoria SIN borrar nada. Si había algo
  // ilegible, load() ya lo apartó en una copia con fecha; se avisa con suavidad cuando la portada deja ver el juego.
  function arrancarVacio(skipCreator) {
    replace(freshState());
    REAL.mem.json = null; REAL.ultimo = null; saveDebounce = 0;
    applyWorld();
    if (estado.ilegible && !G.quiet) avisarIlegible();
    if (!skipCreator) G.creador.open(true);
  }
  function avisarIlegible() {
    const mostrar = () => { if (!G.quiet) G.ui.toast(MSG_ILEGIBLE(), 9000); };
    const t = $('title');
    if (!t || !t.open) { mostrar(); return; }
    const mo = new MutationObserver(() => { if (!t.open) { mo.disconnect(); mostrar(); } });
    mo.observe(t, { attributes: true, attributeFilter: ['open'] });
  }
  // «Comenzar de cero» (elección explícita): borra la partida y su cómic; lo ilegible que hubiera se aparta antes
  function reset(skipCreator) {
    replace(freshState());
    rescatarIlegibles(almacen, SAVE_KEY);
    for (const s of ['', '.tmp', '.prev']) almacen.del(SAVE_KEY + s);
    REAL.mem.json = null; REAL.ultimo = null; saveDebounce = 0;
    applyWorld();
    if (!skipCreator) G.creador.open(true);
  }
  // Equipo compartido (aula.js): nada del niño anterior queda en este almacén, ni en la copia de los satélites
  function olvidarEstudiante() {
    for (const s of ['', '.tmp', '.prev']) almacen.del(SAVE_KEY + s);
    for (const base of [SAVE_KEY].concat(Object.values(satelitesDef()))) for (const c of copiasIlegibles(almacen, base)) almacen.del(c.clave);
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
  // «Comenzar de cero»: la partida y el cómic solo se borran por esta elección explícita (menú de pausa, panel final, o
  // «Nuevo estudiante» del Modo Maestro). Menú: con popover el botón solo se alcanza dentro de la pregunta #confirm-reset;
  // sin popover (navegadores viejos) src/ui/ui.css lo deja suelto en la fila del menú, así que pide dos toques seguidos.
  // Panel final: la pregunta vive en src/game/misiones.js (#end-confirm) y también llama a reset().
  const HAY_POPOVER = !!(window.CSS && CSS.supports && CSS.supports('selector(:popover-open)'));
  const bReset = $('b-reset'), TXT_RESET = L('Comenzar de cero', 'Start from scratch');
  let armado = 0;
  const desarmar = () => { clearTimeout(armado); armado = 0; if (!HAY_POPOVER) bReset.textContent = TXT_RESET; };
  if (!HAY_POPOVER) bReset.textContent = TXT_RESET;
  bReset.onclick = () => {
    if (!HAY_POPOVER && !armado) {
      bReset.textContent = L('Toca otra vez: se borrará tu partida y tu cómic', 'Tap again: your game and comic will be erased');
      armado = setTimeout(desarmar, 5000);
      return;
    }
    desarmar();
    G.guardado.reset(); G.ui.toast(L('Partida nueva', 'New game')); // por la API pública (igual que el panel final)
  };

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
    const claves = K => ['', '.tmp', '.prev', '.unreadable'].map(s => K + s).concat(NATIVO.claves(K + '.unreadable.'));
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
      const cop4 = copiasIlegibles(NATIVO, KT);
      check('Lo corrupto se aparta en una copia de rescate con fecha y la principal no se borra', cop4.length === 1 && /^\d{8}T\d{9}$/.test(cop4[0].fecha) && cop4[0].raw.length === Math.floor(rawPaso4.length / 2) &&
        NATIVO.get(KT + '.unreadable') == null && NATIVO.get(KT) != null, cop4.map(c => c.clave.slice(KT.length)).join());
      // 4b. Corte entre la temporal y el cambio: gana la temporal verificada (más nueva)
      NATIVO.set(KT, rawPaso4); S.step = 6; NATIVO.set(KT + '.tmp', serialize(false, NATIVO));
      const ok4b = cargarDe(C2);
      check('Corte a mitad de la escritura: gana la temporal verificada', ok4b && C2.fuente === 'temporal' && S.step === 6, `fuente ${C2.fuente} · paso ${S.step}`);
      // 4c. Todo ilegible (y una versión futura): no se carga nada y la sesión sigue igual
      S.step = 5; const firma = JSON.stringify(S.profile) + '|' + S.step;
      NATIVO.set(KT, JSON.stringify(Object.assign(JSON.parse(rawPaso4), { v: SAVE_VERSION + 1 }))); NATIVO.set(KT + '.prev', '{"v":1}'); NATIVO.set(KT + '.tmp', 'null');
      const ok4c = cargarDe(C2);
      check('Sin copia sana ni versión conocida: no carga y la sesión sigue intacta', ok4c === false && JSON.stringify(S.profile) + '|' + S.step === firma);
      const futura = NATIVO.get(KT), cop4c = copiasIlegibles(NATIVO, KT);
      check('Partida de una versión futura: no se borra; queda la principal y una copia de rescate', !!futura && JSON.parse(futura).v === SAVE_VERSION + 1 && cop4c.some(c => c.raw === futura) && NATIVO.get(KT + '.prev') === '{"v":1}');
      check('Las copias ilegibles se acumulan sin pisarse (máximo 3; sale la más vieja)', cop4c.length === 3 && new Set(cop4c.map(c => c.clave)).size === 3 && !cop4c.some(c => c.raw.length === Math.floor(rawPaso4.length / 2)), cop4c.length + ' copias');
      const clavesCop = cop4c.map(c => c.clave).join();
      cargarDe(C2); cargarDe(C2);
      check('Abrir otra vez lo mismo no crea copias repetidas', copiasIlegibles(NATIVO, KT).map(c => c.clave).join() === clavesCop);
      // 4d. Copias de rescate en un almacén de mentira: máximo 3, la del esquema anterior es la más vieja y con poco sitio sale solo la que hace falta
      const FR = almacenFalso();
      for (let i = 1; i <= 5; i++) archivarIlegible(FR, KT, 'copia-' + i, '2026010' + i + 'T000000000');
      check('Cinco copias ilegibles: quedan las 3 más nuevas y ninguna comparte hueco', copiasIlegibles(FR, KT).map(c => c.raw).join() === 'copia-3,copia-4,copia-5' && FR.get(KT + '.unreadable') == null);
      const FL = almacenFalso(); FL.set(KT + '.unreadable', 'del-esquema-anterior');
      archivarIlegible(FL, KT, 'nueva-1', '20260101T000000000'); archivarIlegible(FL, KT, 'nueva-2', '20260102T000000000');
      check('La copia del esquema anterior (.unreadable) se conserva y cuenta como la más vieja', copiasIlegibles(FL, KT).map(c => c.raw).join() === 'del-esquema-anterior,nueva-1,nueva-2');
      archivarIlegible(FL, KT, 'nueva-3', '20260103T000000000');
      check('Con la cuarta, sale la del esquema anterior (la más vieja)', copiasIlegibles(FL, KT).map(c => c.raw).join() === 'nueva-1,nueva-2,nueva-3' && FL.get(KT + '.unreadable') == null);
      const dosCopias = 2 * (KT.length + '.unreadable.F1'.length + 1000) + 50, FS = almacenFalso('lleno', dosCopias);
      archivarIlegible(FS, KT, 'a'.repeat(1000), 'F1'); archivarIlegible(FS, KT, 'b'.repeat(1000), 'F2');
      const kS = archivarIlegible(FS, KT, 'c'.repeat(1000), 'F3');
      check('Sin sitio sale solo la copia más vieja que hace falta y la nueva se guarda', !!kS && copiasIlegibles(FS, KT).map(c => c.raw[0]).join('') === 'bc');
      // 4e. Guardar encima de una principal ilegible: antes se aparta; si no cabe el rescate, no se pisa y gana la temporal verificada
      const FG = almacenFalso(); FG.set(KT, '{"roto":');
      const rG = guardarEn(ctx(FG, KT));
      check('Guardar sobre una principal ilegible la aparta antes de pisarla', rG === 'ok' && esObj(leerJSON(FG.get(KT))) && copiasIlegibles(FG, KT).some(c => c.raw === '{"roto":'), rG);
      const R = 'z'.repeat(5000), jsonG = serialize(false, almacenFalso());
      const FQ = almacenFalso('lleno', (KT.length + R.length) + (KT.length + 4 + jsonG.length) + 50); FQ.set(KT, R);
      const rQ = escribirAtomico(ctx(FQ, KT), jsonG);
      check('Si no cabe la copia de rescate, la principal ilegible no se pisa y gana la temporal verificada', rQ === 'lleno' && FQ.get(KT) === R && leerMejor(ctx(FQ, KT)).fuente === 'temporal', String(rQ));
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
        leerJSON(RF.get(sat.criadero)).presentado === true && copiasIlegibles(RF, sat.criadero).some(c => c.raw === '{roto'));
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
      // 6b. Cuota llena: sin .prev; si aun así no cabe, sin capturas; si no cabe nada, en memoria
      S.captures = Object.assign({}, S.captures, { prueba: 'data:image/jpeg;base64,' + 'A'.repeat(60000) });
      const chico = serialize(true, almacenFalso()).length;
      const Q = almacenFalso('lleno', 2 * chico + 4 * KT.length + 2000), CQ = ctx(Q, KT);
      const r7 = guardarEn(CQ);
      check('Cuota llena: se guarda sin las imágenes del cómic', r7 === 'sin-capturas' && esObj(leerJSON(Q.get(KT))), r7);
      // 6c. Con copia de respaldo ocupando el espacio, se sacrifica .prev y las fotos del cómic se conservan
      const grande = serialize(false, almacenFalso()).length;
      const Q3 = almacenFalso('lleno', Math.round(2.6 * grande) + 8 * KT.length);
      Q3.set(KT, serialize(false, almacenFalso())); Q3.set(KT + '.prev', serialize(false, almacenFalso()));
      const r7b = guardarEn(ctx(Q3, KT)), d7b = leerJSON(Q3.get(KT));
      check('Cuota llena con copia de respaldo: se sacrifica .prev y las fotos del cómic se conservan', r7b === 'sin-copia' && esObj(d7b) && !!(d7b.captures && d7b.captures.prueba) && Q3.get(KT + '.prev') == null, r7b);
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
      for (const s of ['', '.tmp', '.prev', '.unreadable', '.unreadable.20260101T000000001', '.unreadable.20260102T000000002']) NE.set(SAVE_KEY + s, '{"x":1}');
      NE.set(sat.criadero + '.unreadable', '{}'); NE.set(sat.criadero + '.unreadable.20260101T000000001', '{}');
      almacen = NE; REAL.mem.json = '{"x":1}';
      olvidarEstudiante(); // el mismo manejador del gancho, sin avisar a los demás módulos (borrarían sus datos reales)
      almacen = almReal;
      check('Nuevo estudiante: se borran la partida, .tmp, .prev, todas las copias de rescate (también las de los satélites) y la memoria', NE.mapa.size === 0 && REAL.mem.json === null, NE.mapa.size + ' claves quedan');
      // 7c. Arranque con una partida de una versión futura (o dañada): no se borra nada, se empieza una nueva y se avisa con suavidad
      const AR = almacenFalso(), futuraRaw = JSON.stringify(Object.assign(JSON.parse(serialize(false, almacenFalso())), { v: SAVE_VERSION + 1 }));
      AR.set(SAVE_KEY, futuraRaw); AR.set(SAVE_KEY + '.prev', '{"v":1}');
      const toastReal = G.ui.toast, avisos = []; G.ui.toast = t => { avisos.push(String(t)); };
      almacen = AR; REAL.mem.json = null; G.quiet = false;
      let okAr = null;
      try { okAr = load(true); arrancarVacio(true); } finally { G.quiet = true; almacen = almReal; G.ui.toast = toastReal; }
      check('Arranque con partida de versión futura: no carga y empieza una nueva SIN borrar la guardada', okAr === false && AR.get(SAVE_KEY) === futuraRaw && AR.get(SAVE_KEY + '.prev') === '{"v":1}' && S.step === 0 && !S.profile.created && estado.ilegible === true);
      check('...la deja en una copia de rescate con fecha', copiasIlegibles(AR, SAVE_KEY).some(c => c.raw === futuraRaw));
      check('...y avisa con suavidad: «No pudimos abrir tu partida guardada; la guardamos por si se puede recuperar»', avisos.some(t => /No pudimos abrir tu partida guardada; la guardamos por si se puede recuperar|We could not open your saved game; we kept it in case it can be recovered/.test(t)), avisos.join(' | '));
      const rAr = guardarEn(ctx(AR, SAVE_KEY));
      check('El primer guardado de la partida nueva no pierde la ilegible', rAr === 'ok' && esObj(leerJSON(AR.get(SAVE_KEY))) && copiasIlegibles(AR, SAVE_KEY).some(c => c.raw === futuraRaw), rAr);
      const AV2 = almacenFalso(); almacen = AV2; REAL.mem.json = null; let okVacio = null;
      try { okVacio = load(true); arrancarVacio(true); } finally { almacen = almReal; }
      check('Arranque sin ninguna partida guardada: empieza una nueva sin aviso ni copias', okVacio === false && estado.ilegible === false && AV2.mapa.size === 0);
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
    applyWorld, reset, arrancarVacio, copiasIlegibles: (be, base) => copiasIlegibles(be || almacen, base || SAVE_KEY), estado: () => Object.assign({}, estado), limpiarTexto, suspender, instantanea, restaurar, test };
});
