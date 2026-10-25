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
  function log(key, data) { S.events.push(make(key, data, S.events.length + 1, Math.round(S.clock * 10) / 10)); }
  function had(key) { return S.events.some(e => e.key === key); }
  return { SCHEMA, defs, make, log, had };
});
