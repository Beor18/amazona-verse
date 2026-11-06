/* Juego · V18.3 · sistema único de personajes del mundo abierto (G.v18npc; docs/equipo/V18_3_DISENO.md §1).
   Un solo sistema para los seis personajes históricos (directiva V18.3 §13): los datos van en content/comun/personajes_v18.js
   (window.AV_NPC_V18) y aquí no hay ningún personaje escrito. La fase 5 solo añade filas.
   - Modelo: un GLTF en caché por ruta (G.assets.loadGLB, .glb o su _glb.js). Cada instancia clona la escena y sus materiales
     (para teñirlos sin tocar a los demás). Una fila sin modelo propio usa el de `respaldo` (provisional) y nunca pide un archivo
     que no existe: un 404 contaría como error de consola.
   - Carga diferida: el modelo no se pide hasta que la misión coloca al personaje y su condición se cumple con Vittata a < 90 m.
     Se libera (fuera de la escena, materiales y piezas soltados; la caché del GLTF se queda) a > 150 m. Como mucho 2 a la vez.
     Animación (mixer) y «mirar a Vittata» solo a < 60 m; en calidad «bajo» sin mixer (pose del fotograma 0).
   - Apariencia: un modelo, varias apariencias (§8): mallas que se encienden y apagan, colores por material y accesorios
     simples (casco, chaleco…) creados una sola vez por instancia. Cambiar de apariencia no crea geometría.
   - Estado narrativo: G.v18.mundo('personaje:<id>'); solo avanza por las transiciones declaradas (nunca atrás ni de bando sin
     causa). Lo cambia la misión (cambiarEstado), no el personaje.
   - Habla con G.dialogo.say (caja en las charlas de misión, bocadillo en los comentarios) y se usa con G.interaccion (Acción).
   API: G.v18npc = { registrar, def, defs, estado, cambiarEstado, colocar, quitar, instancia, activos, apariencia, animar,
   alUsar, decir, retrato, nombre, cargarModelo, paso, stats, MAX_ACTIVOS, R_CARGA, R_LIBERA }.
   Solo con la bandera V18 (src/boot.js; lo carga puerto.js). Su prueba va dentro de AV.v18PuertoTest(). */
window.AVV18Npc = function (G) {
  'use strict';
  if (G.v18npc) return G.v18npc;
  const V = G.v18 || window.AVV18Progreso(G);
  const S = G.S, T = G.terreno, scene = G.renderer.scene;
  const R_CARGA = 90, R_LIBERA = 150, R_VIVO = 60, MAX_ACTIVOS = 2;
  const DEFS = new Map();
  const ST = { pedidos: [], instancias: 0, liberadas: 0, geoAccesorios: 0 };
  const nivel = () => { try { return G.renderer.nivel ? G.renderer.nivel() : 'alto'; } catch (e) { return 'alto'; } };
  const enIngles = () => !!(G.idioma && G.idioma.actual && G.idioma.actual() === 'en');

  function registrar(d) {
    if (!d || !d.id) return false;
    DEFS.set(d.id, Object.assign({ alto: 1, anim: {}, mallas: {}, accesorios: {}, apariencias: {}, estados: ['base'], transiciones: {}, porEstado: {} }, d));
    return true;
  }
  const def = id => DEFS.get(id) || null;
  const nombre = id => { const d = def(id); return d ? (d.nombre && d.nombre.es) || id : id; };

  // ---------- Estado narrativo (G.v18.mundo, sin esquema nuevo) ----------
  function estado(id) {
    const d = def(id); if (!d) return null;
    const e = V.mundo('personaje:' + id);
    return d.estados.indexOf(e) >= 0 ? e : d.estados[0]; // sin valor o desconocido: el de partida
  }
  function cambiarEstado(id, e) {
    const d = def(id); if (!d) return false;
    const a = estado(id);
    if (a === e) return false;
    if (!(d.transiciones[a] && d.transiciones[a][e])) return false; // solo lo declarado: nunca atrás, nunca de bando sin causa
    V.cambiarMundo('personaje:' + id, e);
    vestirSegunEstado(id);
    return true;
  }

  // ---------- Modelos (caché por ruta) ----------
  const cache = {};
  function fuente(d) {
    if (d.modelo) return d;
    const r = d.respaldo && def(d.respaldo);
    return r && r.modelo ? r : null;
  }
  function cargarModelo(id) {
    const d = def(id), f = d && fuente(d);
    if (!f) return Promise.resolve(null);
    if (!cache[f.modelo]) {
      ST.pedidos.push(f.modelo);
      cache[f.modelo] = G.assets.loadGLB(f.modelo, { b64: () => (window.AV_PERSONAJES_B64 || {})[f.b64], script: f.script, base: '', error: 'personaje no disponible: ' + f.id })
        .then(g => ({ raiz: g.scene.children.length === 1 ? g.scene.children[0] : g.scene, clips: g.animations || [], variantes: leerVariantes(g.scene) }), () => null);
    }
    return cache[f.modelo];
  }
  function leerVariantes(sc) {
    let v = null;
    sc.traverse(o => { if (!v && o.userData && o.userData.variantes) { try { v = typeof o.userData.variantes === 'string' ? JSON.parse(o.userData.variantes) : o.userData.variantes; } catch (e) { v = null; } } });
    return v;
  }

  // ---------- Accesorios simples (en el espacio del modelo; se crean una vez por instancia) ----------
  const col = hex => new THREE.Color(hex).convertSRGBToLinear();
  function pieza(geo, color, o) { ST.geoAccesorios++; const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({ color: col(color), roughness: 0.6, metalness: 0.05 }, o || {}))); m.castShadow = false; return m; }
  const FORMAS = {
    // casco industrial: media esfera achatada y ala, sobre la cabeza (el pelo se oculta en la apariencia)
    casco(c) {
      const g = new THREE.Group();
      const cup = pieza(new THREE.SphereGeometry(2.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), c.color, { roughness: 0.35 }); cup.scale.set(1.04, 0.82, 1.04);
      const ala = pieza(new THREE.CylinderGeometry(3.25, 3.25, 0.22, 20), c.color, { roughness: 0.35 }); ala.position.set(0, 0.05, 0.25);
      const cresta = pieza(new THREE.BoxGeometry(0.5, 0.45, 4.6), c.color, { roughness: 0.35 }); cresta.position.set(0, 2.05, 0); cresta.scale.y = 0.9;
      g.add(cup, ala, cresta); return g;
    },
    // franja verde alrededor del casco (el que empieza a reparar)
    franja(c) { const m = pieza(new THREE.CylinderGeometry(2.9, 2.9, 0.42, 20, 1, true), c.color, { side: THREE.DoubleSide }); m.position.y = 0.55; return m; },
    // chaleco de supervisor: cuerpo naranja con dos bandas claras
    chaleco(c) {
      const g = new THREE.Group();
      g.add(pieza(new THREE.BoxGeometry(4.15, 2.9, 2.55), c.color, { roughness: 0.8 }));
      for (const y of [-0.55, 0.45]) { const b = pieza(new THREE.BoxGeometry(4.2, 0.3, 2.6), '#e9eef2', { roughness: 0.25, metalness: 0.3 }); b.position.y = y; g.add(b); }
      return g;
    },
    // insignia dorada en el pecho (responsable de la reconstrucción)
    insignia(c) { const m = pieza(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), c.color, { metalness: 0.6, roughness: 0.3 }); m.rotation.x = Math.PI / 2; return m; }
  };

  // ---------- Instancias ----------
  const INST = new Map(); // id → instancia viva
  const COL = new Map();  // id → colocación { x, z, rotY, aparece, comenta, meta }
  const USO = new Map();  // id → { label, use, visible } de la misión
  const its = new Map();  // id → interactuable (uno por personaje, para siempre: visible() decide)

  async function instanciar(id) {
    const d = def(id); if (!d || INST.has(id)) return INST.get(id) || null;
    const marca = { id, cargando: true }; INST.set(id, marca);
    const m = await cargarModelo(id);
    if (INST.get(id) !== marca) return null; // se liberó mientras cargaba
    if (!m) { INST.delete(id); return null; }
    const raiz = new THREE.Group(); raiz.name = 'v18npc:' + id;
    const modelo = m.raiz.clone(true);
    const k = d.alto || 1; modelo.scale.multiplyScalar(k);
    const mats = [], nodos = {}, vistos = new Map();
    const sombra = nivel() === 'alto';
    modelo.traverse(o => {
      if (o.name) nodos[o.name] = nodos[o.name] || o;
      if (!o.isMesh) return;
      o.castShadow = sombra; o.receiveShadow = false;
      const cl = mm => { if (!vistos.has(mm)) { const c = mm.clone(); c.userData.c0 = mm.color ? mm.color.clone() : null; vistos.set(mm, c); mats.push(c); } return vistos.get(mm); };
      o.material = Array.isArray(o.material) ? o.material.map(cl) : cl(o.material);
    });
    raiz.add(modelo);
    const acc = {};
    for (const n of Object.keys(d.accesorios || {})) {
      const c = d.accesorios[n], f = FORMAS[c.forma]; if (!f) continue;
      const o = f(c); o.name = 'acc:' + n; o.visible = false;
      if (c.pos) o.position.set(c.pos[0], c.pos[1], c.pos[2]);
      (c.hueso && nodos[c.hueso] ? nodos[c.hueso] : modelo).add(o);
      acc[n] = o;
    }
    let mixer = null; const acciones = {};
    if (m.clips.length) {
      mixer = new THREE.AnimationMixer(modelo);
      for (const clip of m.clips) acciones[clip.name] = mixer.clipAction(clip);
    }
    const inst = { id, raiz, modelo, mats, nodos, acc, mixer, acciones, anim: null, apariencia: null, provisional: !!(d.provisional || !d.modelo), giro: 0, hablaT: 0, x: 0, z: 0, meta: null };
    INST.set(id, inst); ST.instancias++;
    scene.add(raiz);
    const c = COL.get(id); if (c) { inst.x = c.x; inst.z = c.z; inst.giro = c.rotY || 0; }
    situar(inst, 0);
    vestirSegunEstado(id);
    if (mixer) mixer.update(0.001);
    try { G.emit('v18npc', { tipo: 'aparece', id }); } catch (e) { /* sin oyentes */ }
    return inst;
  }
  function liberar(id) {
    const inst = INST.get(id); if (!inst) return false;
    INST.delete(id);
    if (inst.cargando) return true;
    if (inst.mixer) { inst.mixer.stopAllAction(); inst.mixer.uncacheRoot(inst.modelo); }
    scene.remove(inst.raiz);
    for (const mt of inst.mats) mt.dispose();
    for (const n in inst.acc) inst.acc[n].traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); ST.geoAccesorios--; } });
    ST.liberadas++;
    try { G.emit('v18npc', { tipo: 'libera', id }); } catch (e) { /* sin oyentes */ }
    return true;
  }
  const instancia = id => { const i = INST.get(id); return i && !i.cargando ? i : null; };
  const activos = () => Array.from(INST.keys());

  // ---------- Apariencia y animación ----------
  function apariencia(id, nom) {
    const d = def(id), inst = instancia(id), a = d && d.apariencias[nom];
    if (!inst || !a) return false;
    const grupos = Object.assign({}, (fuente(d) || {}).mallas || {}, d.mallas || {});
    const nodosDe = k => (grupos[k] || [k]).map(n => inst.nodos[n]).filter(Boolean);
    // primero todo lo encendible vuelve a como viene el .glb (visible), luego la apariencia
    for (const k of Object.keys(Object.assign({}, ...Object.values(d.apariencias).map(x => x.mallas || {})))) for (const n of nodosDe(k)) n.visible = true;
    for (const k in a.mallas || {}) for (const n of nodosDe(k)) n.visible = !!a.mallas[k];
    for (const mt of inst.mats) { if (mt.userData.c0) mt.color.copy(mt.userData.c0); const h = a.colores && a.colores[mt.name]; if (h) mt.color.copy(col(h)); }
    const lista = a.accesorios || [];
    for (const n in inst.acc) inst.acc[n].visible = lista.indexOf(n) >= 0;
    inst.apariencia = nom;
    return true;
  }
  function animar(id, clave) {
    const d = def(id), inst = instancia(id);
    if (!inst || !inst.mixer) return false;
    const nom = (d.anim && d.anim[clave]) || clave, act = inst.acciones[nom];
    if (!act) return false;
    if (inst.anim === nom) return true;
    const prev = inst.anim && inst.acciones[inst.anim];
    act.reset().setEffectiveWeight(1).play();
    if (prev) prev.crossFadeTo(act, 0.3, false);
    inst.anim = nom;
    return true;
  }
  function vestirSegunEstado(id) {
    const d = def(id), inst = instancia(id); if (!d || !inst) return;
    const pe = d.porEstado[estado(id)] || {};
    apariencia(id, pe.apariencia || Object.keys(d.apariencias)[0]);
    animar(id, (COL.get(id) || {}).anim || pe.anim || 'idle');
  }

  // ---------- Colocación (la decide la misión) ----------
  // colocar(id, { x, z, rotY, aparece: () => bool, comenta, anim, caminar }) · caminar: va andando (1,4 m/s) al nuevo sitio
  function colocar(id, o) {
    const d = def(id); if (!d) return false;
    const prev = COL.get(id) || {};
    const c = Object.assign({ comenta: true }, prev, o);
    COL.set(id, c);
    const inst = instancia(id);
    if (inst) {
      if (o.caminar) inst.meta = { x: c.x, z: c.z }; else { inst.x = c.x; inst.z = c.z; inst.meta = null; }
      if (o.rotY != null) inst.giro = o.rotY;
      if (o.anim) animar(id, o.anim); else if ('anim' in o) vestirSegunEstado(id);
    }
    if (!its.has(id)) {
      its.set(id, G.interaccion.add({ id: 'v18npc_' + id, x: c.x, z: c.z, r: 2.6,
        visible: () => { const i = instancia(id), u = USO.get(id); return !!i && (!u || !u.visible || u.visible()); },
        label: () => { const u = USO.get(id); return u && u.label ? u.label() : 'Hablar con ' + nombre(id).replace(/^El /, 'el ').replace(/^La /, 'la '); },
        use: () => { const u = USO.get(id); if (u && u.use) return u.use(); return decir(id, (d.porEstado[estado(id)] || {}).dialogo || []); } }));
    }
    return true;
  }
  function quitar(id) { COL.delete(id); liberar(id); }
  function alUsar(id, u) { if (u) USO.set(id, u); else USO.delete(id); }

  // ---------- Diálogo ----------
  function retrato(id) {
    const d = def(id); if (!d) return '';
    if (d.retrato) return d.retrato;
    const i = d.insignia || { fondo: '#3b4250', color: '#ffd23a' };
    // insignia provisional (casco sobre un rostro liso) hasta que llegue el retrato del modelo definitivo
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="' + i.fondo + '"/>' +
      '<circle cx="32" cy="40" r="15" fill="#c68a5c"/><circle cx="26.5" cy="40" r="1.8" fill="#2b2118"/><circle cx="37.5" cy="40" r="1.8" fill="#2b2118"/>' +
      '<path d="M26 47q6 3 12 0" stroke="#2b2118" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '<path d="M13 33a19 17 0 0 1 38 0z" fill="' + i.color + '"/><rect x="9" y="31" width="46" height="5" rx="2.5" fill="' + i.color + '"/><rect x="30" y="16" width="4" height="16" rx="2" fill="#000" opacity=".12"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function decir(id, textos, fin, opts) {
    if (!textos || !textos.length) { if (fin) fin(); return false; }
    const who = nombre(id), img = retrato(id);
    const inst = instancia(id); if (inst) { inst.hablaT = 1.5 + textos.length * 2.5; animar(id, 'hablar'); }
    try { G.dialogo.say(textos.map(t => ({ who, img, text: t })), fin || null, Object.assign({ caja: true }, opts || {})); } catch (e) { if (fin) fin(); return false; }
    return true;
  }

  // ---------- Paso: carga diferida, caminar, mirar a Vittata, comentarios ----------
  function situar(inst, dt) {
    if (inst.meta && dt > 0) {
      const dx = inst.meta.x - inst.x, dz = inst.meta.z - inst.z, dd = Math.hypot(dx, dz), v = 1.4 * dt;
      if (dd <= v) { inst.x = inst.meta.x; inst.z = inst.meta.z; inst.meta = null; } else { inst.x += dx / dd * v; inst.z += dz / dd * v; inst.giroVa = Math.atan2(dx, dz); }
    }
    const y = T.height(inst.x, inst.z);
    inst.raiz.position.set(inst.x, y, inst.z);
    const it = its.get(inst.id); if (it) { it.x = inst.x; it.z = inst.z; }
  }
  const angDif = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
  const comentado = {};
  function paso(dt, busy) {
    // 1. qué personajes tocan: colocados, con su condición y cerca; los 2 más cercanos
    const quiere = [];
    for (const [id, c] of COL) {
      let ok = false; try { ok = !c.aparece || !!c.aparece(); } catch (e) { ok = false; }
      const d = Math.hypot(S.pos.x - c.x, S.pos.z - c.z);
      if (!ok || d > R_LIBERA) { if (INST.has(id)) liberar(id); continue; }
      if (INST.has(id) || d < R_CARGA) quiere.push([d, id]);
    }
    quiere.sort((a, b) => a[0] - b[0]);
    quiere.slice(MAX_ACTIVOS).forEach(q => liberar(q[1]));
    quiere.slice(0, MAX_ACTIVOS).forEach(q => { if (!INST.has(q[1])) instanciar(q[1]); });
    // 2. cada instancia viva
    const bajo = nivel() === 'bajo';
    for (const inst of INST.values()) {
      if (inst.cargando) continue;
      situar(inst, dt);
      const dx = S.pos.x - inst.x, dz = S.pos.z - inst.z, d = Math.hypot(dx, dz);
      if (d > R_VIVO) continue;
      if (inst.hablaT > 0 && (inst.hablaT -= dt) <= 0) vestirSegunEstado(inst.id);
      const objetivo = inst.meta ? inst.giroVa : d < 7 ? Math.atan2(dx, dz) : inst.giro;
      inst.raiz.rotation.y += angDif(objetivo, inst.raiz.rotation.y) * Math.min(1, dt * 4);
      if (inst.mixer && !bajo) inst.mixer.update(dt);
      // comentario al pasar (bocadillo, cada 20 s como mucho; nunca encima de otra charla)
      const c = COL.get(inst.id);
      if (!busy && c && c.comenta && d < 5 && (performance.now() - (comentado[inst.id] || -1e9)) > 20000 && G.dialogo && !(G.dialogo.activo && G.dialogo.activo())) {
        comentado[inst.id] = performance.now();
        const tx = ((def(inst.id).porEstado[estado(inst.id)] || {}).dialogo || [])[0];
        if (tx) decir(inst.id, [tx], null, { libre: true, caja: false });
      }
    }
  }
  G.on('update', (dt, busy) => paso(Math.min(dt, 0.1), busy), 47);
  G.on('apply', () => setTimeout(() => { for (const id of INST.keys()) vestirSegunEstado(id); }, 0), 96);
  G.on('v18', ev => { if (ev && ev.tipo === 'mundo' && /^personaje:/.test(ev.id || '')) vestirSegunEstado(ev.id.slice(10)); });

  const stats = () => ({ pedidos: ST.pedidos.slice(), instancias: ST.instancias, liberadas: ST.liberadas, vivas: activos().length, geoAccesorios: ST.geoAccesorios, ingles: enIngles() });
  G.v18npc = { registrar, def, defs: () => Array.from(DEFS.values()), estado, cambiarEstado, colocar, quitar, instancia, activos, apariencia, animar,
    alUsar, decir, retrato, nombre, cargarModelo, paso, stats, liberar, MAX_ACTIVOS, R_CARGA, R_LIBERA, R_VIVO };
  for (const d of window.AV_NPC_V18 || []) registrar(d);
  return G.v18npc;
};
