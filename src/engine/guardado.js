/* AVE · estado y guardado
   G.S es el estado de la partida. Guardado versionado en localStorage con copia anterior (.prev), copia de partidas
   ilegibles (.unreadable), migraciones del pack y reintento sin capturas si no hay espacio.
   Claves base del motor + las del pack. Gancho 'apply' tras cargar o reiniciar: cada módulo deja el mundo como dice G.S.
   Datos del pack: meta.almacen (prefijo de localStorage), guardado { version, claves, estado(), migrar(d, h), validar(d) },
   jugador.aparicion { x, z }. */
AVE.module('guardado', function (G) {
  'use strict';
  const S = G.S, P = G.pack.guardado || {}, $ = G.util.$;
  const STORE = (G.pack.meta && G.pack.meta.almacen) || G.pack.id;
  const SAVE_KEY = STORE + '.save';
  const SAVE_VERSION = P.version || 1;
  const spawn = Object.assign({ x: 0, z: 0 }, G.pack.jugador && G.pack.jugador.aparicion);
  const BASE_KEYS = ['saveId', 'profile', 'comic', 'pos', 'facing', 'step', 'inv', 'collected', 'complete', 'events', 'captures', 'clock', 'missions', 'field', 'unlocked', 'wear'];
  const SAVED_KEYS = BASE_KEYS.concat(P.claves || []);

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
      comic: { title: comic.tituloDefecto || 'Mi cómic', cover: 'vittata', layout: 'grid', order: [0, 1, 2, 3], captions: {} },
    }, P.estado ? P.estado() : {});
  }
  // Rellena G.S en sitio (su identidad no cambia: los módulos guardan la referencia)
  function replace(next) { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, next); }
  replace(freshState());

  function serialize() { const o = { v: SAVE_VERSION }; for (const k of SAVED_KEYS) o[k] = S[k]; return JSON.stringify(o); }
  function save(silent) {
    const toast = t => { if (!silent) G.ui.toast(t); };
    try {
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev) localStorage.setItem(SAVE_KEY + '.prev', prev);
      localStorage.setItem(SAVE_KEY, serialize()); toast('Partida guardada'); return true;
    } catch (e) {
      try { const o = JSON.parse(serialize()); o.captures = {}; localStorage.setItem(SAVE_KEY, JSON.stringify(o)); toast('Partida guardada (sin imágenes del cómic)'); return true; }
      catch (e2) { toast('No se pudo guardar en este navegador'); return false; }
    }
  }
  let saveDebounce = 0;
  function autosave() { saveDebounce = 0.5; }
  G.on('update', dt => { if (saveDebounce > 0) { saveDebounce -= dt; if (saveDebounce <= 0) save(true); } }, 80);

  function migrate(d) { return P.migrar ? P.migrar(d, { freshState, newId: G.util.newId, makeEvent: G.eventos.make }) : d; }
  function validSave(d) {
    return !!(d && d.v === SAVE_VERSION && typeof d.saveId === 'string' && d.profile && d.comic && d.pos && typeof d.pos.x === 'number' && typeof d.step === 'number' &&
      d.inv && Array.isArray(d.collected) && Array.isArray(d.events) && (!P.validar || P.validar(d)));
  }
  function load(silent) {
    const toast = t => { if (!silent) G.ui.toast(t); };
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (!raw) { toast('No hay partida guardada'); return false; }
    let d; try { d = migrate(JSON.parse(raw)); } catch (e) { d = null; }
    if (!validSave(d)) {
      try { localStorage.setItem(SAVE_KEY + '.unreadable', raw); } catch (e) { /* sin espacio */ }
      toast('No se pudo leer la partida guardada; se guardó una copia y empiezas de nuevo');
      return false;
    }
    replace(Object.assign(freshState(), d, { event: null, water: G.terreno.waterBase, vy: 0, captures: d.captures || {} }));
    applyWorld();
    toast('Partida cargada');
    return true;
  }
  function applyWorld() { G.emit('apply'); }
  function reset(skipCreator) {
    replace(freshState());
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* sin almacenamiento */ }
    applyWorld();
    if (!skipCreator) G.creador.open(true);
  }

  $('b-save').onclick = () => save(false);
  $('b-load').onclick = () => load(false);
  $('b-reset').onclick = () => { reset(); G.ui.toast('Partida nueva'); };
  $('b-again').onclick = () => { reset(); };

  return { KEY: SAVE_KEY, VERSION: SAVE_VERSION, KEYS: SAVED_KEYS, spawn, freshState, replace, serialize, save, autosave, migrate, validSave, load, applyWorld, reset };
});
