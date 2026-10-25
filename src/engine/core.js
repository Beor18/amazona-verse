/* Amazona Verse Engine (AVE) · núcleo
   Espacio de nombres global window.AVE. Scripts clásicos, sin bundler:
   - Cada módulo del motor (src/engine) o del juego (src/game) es una IIFE que llama a AVE.module(nombre, fábrica).
   - Cada content pack (content/<id>/) llama a AVE.registerPack({ id, ... }); varios archivos pueden aportar partes del mismo pack.
   - AVE.boot(id) crea el contexto G, instancia los módulos en el orden de carga, ejecuta los preparar(G) del pack y arranca.
   Contrato: los módulos se hablan solo a través de G (G.S estado, G.on/G.emit ganchos, G.<módulo> API). */
(function () {
  'use strict';

  const AVE = window.AVE = window.AVE || {};
  AVE.version = '1.0.0';

  // ---------- Módulos ----------
  const modules = [];
  AVE.module = function (name, factory) {
    if (modules.some(m => m.name === name)) throw new Error('AVE: módulo repetido: ' + name);
    modules.push({ name, factory });
  };
  AVE.modules = () => modules.map(m => m.name);

  // ---------- Content packs ----------
  // Las claves de cada archivo se fusionan; cada preparar(G) se acumula en el orden de carga.
  AVE.packs = {};
  AVE.registerPack = function (def) {
    if (!def || !/^[a-z0-9_-]+$/.test(def.id || '')) throw new Error('AVE: el pack necesita un id en minúsculas');
    const p = AVE.packs[def.id] || (AVE.packs[def.id] = { id: def.id, preparadores: [] });
    for (const k of Object.keys(def)) {
      if (k === 'preparar') p.preparadores.push(def.preparar);
      else if (k !== 'id') p[k] = def[k];
    }
    return p;
  };

  // ---------- Utilidades ----------
  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const clamp01 = v => Math.min(1, Math.max(0, v));
  function newId() {
    try { const a = new Uint8Array(8); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { return Math.random().toString(16).slice(2, 18); }
  }
  // Une geometrías indexadas con posición, normal y uv en una sola
  function mergeGeos(geos) {
    const pos = [], nor = [], uv = [], idx = []; let off = 0;
    for (const g of geos) {
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
      for (const i of g.index.array) idx.push(i + off);
      off += g.attributes.position.count;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    m.setIndex(idx);
    return m;
  }
  const $ = id => document.getElementById(id);
  // Lee una ruta "a.b.c" dentro de un objeto
  const get = (obj, path) => String(path).split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  AVE.util = { rng, clamp01, newId, mergeGeos, $, get };

  // ---------- Arranque ----------
  AVE.boot = function (packId, opts) {
    const pack = AVE.packs[packId];
    if (!pack) throw new Error('AVE: no existe el pack ' + packId);
    // G.S es el estado de la partida: su identidad no cambia nunca (guardado.replace lo rellena en sitio),
    // así cada módulo puede guardar const S = G.S. G.c es el espacio privado del pack para compartir entre sus archivos.
    const G = { AVE, pack, opts: opts || {}, util: AVE.util, S: {}, c: {}, quiet: false };
    const hooks = {};
    // Ganchos con prioridad (menor = antes; empate = orden de registro)
    G.on = function (name, fn, prio) {
      const l = hooks[name] || (hooks[name] = []);
      l.push({ fn, prio: prio == null ? 50 : prio, n: l.length });
      l.sort((a, b) => a.prio - b.prio || a.n - b.n);
    };
    G.emit = function (name, a, b, c) { const l = hooks[name]; if (l) for (const h of l) h.fn(a, b, c); };
    for (const m of modules) G[m.name] = m.factory(G) || {};
    for (const prep of pack.preparadores) prep(G);
    G.emit('listo');
    // Secuencia de inicio del juego original: altura inicial, color lineal, personajes 3D, partida y cámara
    G.S.pos.y = G.terreno.height(G.S.pos.x, G.S.pos.z);
    G.renderer.linearize(G.renderer.scene); // antes de aplicar el mundo: los looks ya escriben colores en lineal
    G.actores.init3D();
    if (!G.guardado.load(true)) G.guardado.reset();
    G.camara.place(true);
    G.renderer.start();
    return G;
  };
})();
