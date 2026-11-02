/* Juego · eventos narrativos (NARRATIVE_EVENT_SCHEMA.md)
   Registro de lo que pasa en la partida, sin datos personales. Lo usan el cómic, las pruebas y los disparadores "evento:".
   Datos del pack: eventos { defs: { Clave: { type, loc, chars, scene } }, extra(def, data) → { location, choice } },
   meta.capitulo. */
AVE.module('eventos', function (G) {
  'use strict';
  const S = G.S, E = G.pack.eventos || {};
  const SCHEMA = 1;
  const defs = E.defs || {};
  const chapter = (G.pack.meta && G.pack.meta.capitulo) || 1;
  // saveId explícito para poder migrar partidas viejas sin tocar G.S
  function make(key, data, seq, t, saveId) {
    const def = defs[key] || { type: key, loc: null, chars: [], scene: null };
    data = data || {};
    const id = saveId != null ? saveId : S.saveId;
    const x = E.extra ? E.extra(def, data) : { location: def.loc, choice: data.choice || null };
    return {
      id: id + '-' + seq, schemaVersion: SCHEMA, saveId: id,
      type: def.type, key, chapter, seq, t,
      location: x.location, characters: def.chars.slice(), choice: x.choice, outcome: data.outcome || null,
      sceneTemplate: def.scene, locKey: 'evt.' + key, meta: data,
    };
  }
  function log(key, data) {
    S.events.push(make(key, data, S.events.length + 1, Math.round(S.clock * 10) / 10));
    // BM15: la captura (un render extra) espera a un cuadro tranquilo, no se cuela en el cuadro del evento
    if (CAPTURA[key]) { const m = CAPTURA[key]; if (window.requestIdleCallback) requestIdleCallback(() => capturarManga(m, key), { timeout: 2000 }); else setTimeout(() => capturarManga(m, key), 2000); }
  }
  function had(key) { return S.events.some(e => e.key === key); }
  // Fondo del cómic nuevo (G17f). Solo estos momentos, en baja, en memoria y en IndexedDB.
  // No se sube nada. No hay evento de «nuevo intento»: ese hueco sigue vacío.
  // No usa snapshot(): ese encuadre mueve la cámara (renderer.js, AJ1).
  const CAPTURA = {
    PlayerCharacterCreated: 'inicio',
    LandSelected: 'ruta', ShelterRelocated: 'ruta', LumaChoice: 'ruta',
    ListenChoice: 'ruta', HelmChosen: 'ruta', TradeoffSeen: 'ruta',
    FragmentsOrdered: 'ruta', PlanMade: 'ruta',
    FirstHardLanding: 'choque', FirstSplash: 'choque', ShelterFlooded: 'choque',
    FirstChallengeRecord: 'record',
    ChapterCompleted: 'meta',
  };
  let capturando = false;
  function capturarManga(momento, key) {
    if (capturando || !momento) return;
    capturando = true;
    try {
      const R = G.renderer, src = R && R.canvas;
      if (!src || src.width < 2) return;
      if (typeof R.drawScene === 'function') R.drawScene();
      const c = document.createElement('canvas'); c.width = 320; c.height = 180;
      const x = c.getContext('2d', { willReadFrequently: true });
      const sw = src.width, sh = src.height, ar = 320 / 180;
      let cw = sw, ch = sw / ar;
      if (ch > sh) { ch = sh; cw = sh * ar; }
      x.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 320, 180);
      const pix = x.getImageData(0, 0, 320, 180).data;
      let s = 0, n = 0;
      for (let i = 0; i < pix.length; i += 64) { s += pix[i] + pix[i + 1] + pix[i + 2]; n++; }
      if (!n || s / n < 18) return;
      const jpeg = c.toDataURL('image/jpeg', 0.62);
      if (!jpeg || jpeg.length < 800 || jpeg.length > 120000) return;
      const row = { momento: momento, evento: key, jpeg: jpeg, t: Date.now() };
      G.mangaFondos = G.mangaFondos || {};
      G.mangaFondos[momento] = row;
      const req = indexedDB.open('amazonaverse.manga', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('fondos')) db.createObjectStore('fondos', { keyPath: 'momento' });
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction('fondos', 'readwrite');
          tx.objectStore('fondos').put(row);
          tx.oncomplete = () => db.close();
        } catch (e) { try { req.result.close(); } catch (e2) { /* sigue en memoria */ } }
      };
    } catch (e) { /* sin fondo de partida la viñeta usa el mapa */ }
    finally { capturando = false; }
  }
  return { SCHEMA, defs, make, log, had };
});
