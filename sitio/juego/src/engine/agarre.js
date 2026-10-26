/* AVE · agarrar, llevar, soltar y usar objetos (rol Movimiento y animación; ver docs/equipo/MOVIMIENTO.md)
   El juego decide QUÉ se agarra y cuándo (p. ej. interaccion.add({ ..., use: () => G.agarre.agarrar(pieza, { id }) }));
   este módulo decide CÓMO se ve: gesto de alcanzar, enganche al pico, a la mano o a los dos brazos, pose de carga con IK,
   cambio a las patas al volar (como las aves) y gesto de soltar o de usar.
   API (también G.actores.agarrar / soltar):
   - agarrar(obj3D, { id, enganche: 'auto' | 'pico' | 'mano' | 'brazos', escala? }) → true si empieza. 'auto' elige por tamaño.
   - soltar({ en?: { x, y?, z }, instantaneo? }) → el objeto (vuelve a la escena, apoyado en el suelo delante de las patas o en `en`).
   - usar() → gesto de uso; lleva() → { id, obj, enganche } o null; mira = punto que mira la cabeza al alcanzar.
   Ganchos: 'agarrado' (id, obj), 'soltado' (id, obj, pos), 'usado' (id, obj).
   El objeto nunca atraviesa el cuerpo: se mide su caja y se coloca delante del pecho, bajo el pico o bajo la mano según su
   tamaño; lo alargado se lleva atravesado (palo en el pico, tronco en brazos) o de pie en la mano. */
AVE.module('agarre', function (G) {
  'use strict';
  const S = G.S, scene = G.renderer.scene;
  // Ajuste fino (s y m del mundo)
  const AG = {
    reachTime: 0.34,      // agacharse y alcanzar
    grabAt: 0.55,         // fracción del gesto en la que el objeto pasa al enganche
    snapTime: 0.16,       // vuelo del objeto hasta su sitio en el enganche
    dropTime: 0.32,       // gesto de soltar (lo deja a la mitad)
    useTime: 0.55,        // gesto de usar
    picoMax: 0.32,        // tamaño máximo (m, lado mayor) para el pico; 'auto' lo usa por debajo de esto
    manoMax: 0.75,        // tamaño máximo para una mano
    brazosMax: 2.2,       // más grande se reduce para poder llevarlo
    gap: 0.03,            // aire entre el objeto y el cuerpo
  };
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _box = new THREE.Box3();
  let held = null;                    // { id, obj, enganche, ancla, size, center, qGrip, scale0, quat0, from, t, grip }
  const act = { fase: '', t: 0, dur: 0, done: false };
  const api = { AG, agarrar, soltar, usar, lleva, mira: null, get fase() { return act.fase; } };

  const P = () => G.actores.player3D;
  const manoOcupada = () => { const p = P(); return !!(p && p.look && p.look.accessories && p.look.accessories.hand); };
  // Caja del objeto en su propio espacio (sin su posición, giro ni escala)
  function medir(obj) {
    const parent = obj.parent, p = obj.position.clone(), q = obj.quaternion.clone(), s = obj.scale.clone();
    if (parent) parent.remove(obj);
    obj.position.set(0, 0, 0); obj.quaternion.identity(); obj.scale.set(1, 1, 1); obj.updateMatrixWorld(true);
    _box.setFromObject(obj);
    obj.position.copy(p); obj.quaternion.copy(q); obj.scale.copy(s);
    if (parent) parent.add(obj);
    obj.updateMatrixWorld(true);
    if (_box.isEmpty()) return { size: new THREE.Vector3(0.2, 0.2, 0.2), center: new THREE.Vector3(), min: new THREE.Vector3(-0.1, -0.1, -0.1) };
    return { size: _box.getSize(new THREE.Vector3()), center: _box.getCenter(new THREE.Vector3()), min: _box.min.clone() };
  }
  // Giro que lleva el eje largo del objeto a `axis` ('x' de lado, 'y' de pie, 'z' a lo largo del cuerpo)
  function gripQuat(size, axis) {
    const q = new THREE.Quaternion(), dims = [['x', size.x], ['y', size.y], ['z', size.z]].sort((a, b) => b[1] - a[1]);
    const long = dims[0][1] > 1.6 * dims[1][1] ? dims[0][0] : null; // alargado: el lado mayor pasa de 1,6 veces el siguiente
    if (!long || long === axis) return q;
    const from = new THREE.Vector3(long === 'x' ? 1 : 0, long === 'y' ? 1 : 0, long === 'z' ? 1 : 0), to = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
    return q.setFromUnitVectors(from, to);
  }
  // Dónde va el objeto en cada enganche: ancla, eje largo y desplazamiento (m del mundo, en ejes del personaje)
  function grip(h, en) {
    const sz = h.size.clone().multiplyScalar(h.scale), qg = gripQuat(h.size, en === 'mano' ? 'y' : en === 'patas' ? 'z' : 'x');
    const ext = sz.clone().applyQuaternion(qg); ext.set(Math.abs(ext.x), Math.abs(ext.y), Math.abs(ext.z)); // tamaño ya girado
    const off = new THREE.Vector3();
    if (en === 'pico') off.set(0, -ext.y * 0.3, -ext.z * 0.15);                // sujeto entre las puntas del pico
    else if (en === 'mano') off.set(0, ext.y * 0.15, ext.z * 0.5 + 0.02);       // de pie en la mano
    else if (en === 'brazos') off.set(0, -ext.y * 0.1, ext.z / 2 + AG.gap);     // delante del pecho, sin tocarlo
    else off.set(0, -ext.y / 2 - AG.gap, 0);                                   // entre las patas
    // Con un objeto del ropero en la mano izquierda (bandera, maracas…), lo agarrado va en la derecha
    const ancla = en === 'pico' ? 'pico' : en === 'mano' ? (manoOcupada() ? 'manoR' : 'manoL') : en === 'brazos' ? 'pecho' : 'patas';
    return { en, ancla, qg, off, ext };
  }
  // Objetivos de las manos (espacio del modelo) para la pose de carga
  function manos(h) {
    const p = P(); if (!p || !h || !h.grip) return null;
    const g = h.grip, sc = p.root.scale.x;
    if (g.en === 'mano') return g.ancla === 'manoR' ? { R: [-0.3, 0.5, 0.4] } : { L: [0.3, 0.5, 0.4] };
    if (g.en !== 'brazos') return null;
    // Centro del objeto en el espacio del modelo: el ancla del pecho (0, 0,5, 0,25) más el desplazamiento
    const cx = 0, cy = 0.5 + g.off.y / sc, cz = 0.25 + g.off.z / sc, half = Math.min(0.24, g.ext.x / sc / 2 * 0.9);
    const side = Math.max(0.1, half);
    return { L: [cx + side, cy, cz], R: [cx - side, cy, cz] };
  }

  function enganche(h) {
    const p = P(); if (!p || !p.anchors) return;
    const en = G.fisica.MOVE.flying && h.enganche !== 'pico' ? 'patas' : h.enganche;
    if (h.grip && h.grip.en === en) return;
    h.grip = grip(h, en);
    const anc = p.anchors[h.grip.ancla];
    anc.attach(h.obj);
    h.from = { p: h.obj.position.clone(), q: h.obj.quaternion.clone(), s: h.obj.scale.clone() }; h.t = 0;
  }
  // Coloca el objeto en su enganche (con transición) y compensa la escala del hueso (el criadero escala huesos en runtime)
  function sujetar(dt) {
    const h = held, p = P(); if (!h || !h.grip || !p) return;
    const anc = p.anchors[h.grip.ancla], ws = anc.getWorldScale(_w), k = Math.min(1, (h.t += dt) / AG.snapTime), e = k * k * (3 - 2 * k);
    const c = h.center.clone().multiplyScalar(h.scale).applyQuaternion(h.grip.qg); // el centro de la caja va al punto de agarre
    const tp = _v.copy(h.grip.off).sub(c); tp.set(tp.x / ws.x, tp.y / ws.y, tp.z / ws.z);
    const ts = new THREE.Vector3(h.scale / ws.x, h.scale / ws.y, h.scale / ws.z);
    h.obj.position.lerpVectors(h.from.p, tp, e);
    h.obj.quaternion.copy(h.from.q).slerp(h.grip.qg, e);
    h.obj.scale.lerpVectors(h.from.s, ts, e);
  }

  function agarrar(obj, o) {
    o = o || {};
    const p = P(), M = G.fisica.MOVE;
    if (!obj || !p || !p.anchors || held || act.fase || G.ui.busy() || (M.swimming && G.input.keys.has('c'))) return false;
    if (!obj.parent) scene.add(obj);
    const m = medir(obj), big = Math.max(m.size.x, m.size.y, m.size.z) || 0.2;
    let en = o.enganche && o.enganche !== 'auto' ? o.enganche : big <= AG.picoMax ? 'pico' : big <= AG.manoMax ? 'mano' : 'brazos';
    const lim = en === 'pico' ? AG.picoMax : en === 'mano' ? AG.manoMax : AG.brazosMax;
    const ws = obj.getWorldScale(new THREE.Vector3()).x;
    const scale = o.escala != null ? o.escala : Math.min(ws, lim / big);
    held = { id: o.id != null ? o.id : obj.name || 'objeto', obj, enganche: en, size: m.size, center: m.center, min: m.min, scale,
      scale0: obj.getWorldScale(new THREE.Vector3()), quat0: obj.getWorldQuaternion(new THREE.Quaternion()), grip: null, t: 0 };
    // Gira hacia el objeto y lo mira mientras se agacha
    const wp = obj.getWorldPosition(new THREE.Vector3()), dx = wp.x - S.pos.x, dz = wp.z - S.pos.z, d = Math.hypot(dx, dz);
    if (d > 0.05 && !M.flying) S.facing = { x: dx / d, z: dz / d };
    api.mira = wp;
    act.fase = 'alcanzar'; act.t = 0; act.dur = AG.reachTime; act.done = false;
    return true;
  }
  function soltar(o) {
    o = o || {};
    if (!held || act.fase === 'soltar') return null;
    const h = held;
    if (o.instantaneo || !P()) { if (act.fase === 'alcanzar') { act.fase = ''; act.done = true; } dejar(o.en); return h.obj; } // soltar al instante corta el gesto de alcanzar (sin enganche de un held nulo)
    act.fase = 'soltar'; act.t = 0; act.dur = AG.dropTime; act.done = false; act.en = o.en || null;
    return h.obj;
  }
  // Deja el objeto en la escena: apoyado en el suelo delante de las patas (o en `en`), derecho y con su escala original
  function dejar(en) {
    const h = held; if (!h) return;
    held = null; api.mira = null;
    scene.attach(h.obj);
    const f = S.facing, fwd = 0.55 + Math.max(h.size.x, h.size.z) * h.scale / 2;
    const x = en && en.x != null ? en.x : S.pos.x + f.x * fwd, z = en && en.z != null ? en.z : S.pos.z + f.z * fwd;
    const gy = en && en.y != null ? en.y : G.fisica.suelo(x, z, S.pos.y + 0.3);
    h.obj.quaternion.copy(h.quat0); h.obj.scale.copy(h.scale0);
    const sy = h.scale0.y;
    h.obj.position.set(x, gy - h.min.y * sy, z);
    h.obj.updateMatrixWorld(true);
    const pos = { x, y: gy, z };
    G.emit('soltado', h.id, h.obj, pos);
  }
  function usar() {
    if (!held || act.fase) return false;
    act.fase = 'usar'; act.t = 0; act.dur = AG.useTime; act.done = false;
    return true;
  }
  function lleva() { return held && act.fase !== 'soltar' ? { id: held.id, obj: held.obj, enganche: held.enganche } : null; }

  // Pesos de la pose: antes de que actores actualice el modelo (prioridad 15)
  G.on('render', dt => {
    const p = P(); if (!p) return;
    let reach = 0, use = 0;
    if (act.fase) {
      act.t += dt;
      const k = Math.min(1, act.t / act.dur);
      if (act.fase === 'alcanzar') {
        reach = Math.sin(k * Math.PI);
        if (!act.done && k >= AG.grabAt) { act.done = true; if (held) { enganche(held); G.emit('agarrado', held.id, held.obj); } api.mira = null; }
      } else if (act.fase === 'soltar') {
        reach = Math.sin(k * Math.PI) * 0.8;
        if (!act.done && k >= 0.5) { act.done = true; dejar(act.en); }
      } else if (act.fase === 'usar') {
        use = Math.sin(k * Math.PI);
        if (!act.done && k >= 0.5) { act.done = true; if (held) G.emit('usado', held.id, held.obj); }
      }
      if (k >= 1) act.fase = '';
    }
    p.reach = reach; p.use = use; p.reachMode = held ? held.enganche : '';
    p.carry = held && held.grip ? held.grip.en : null;
    // Manos: hacia el objeto al alcanzarlo; luego a la pose de carga (con el gesto de uso encima)
    let T = held && held.grip ? manos(held) : null;
    if (act.fase === 'alcanzar' && held && held.enganche !== 'pico' && api.mira) {
      p.root.updateMatrixWorld(true);
      const lp = p.root.worldToLocal(_v.copy(api.mira));
      T = held.enganche === 'brazos' ? { L: [lp.x + 0.15, lp.y + 0.1, lp.z], R: [lp.x - 0.15, lp.y + 0.1, lp.z] } : manoOcupada() ? { R: [lp.x, lp.y + 0.05, lp.z] } : { L: [lp.x, lp.y + 0.05, lp.z] };
    }
    if (T && use > 0) for (const s of ['L', 'R']) if (T[s]) T[s] = held.grip.en === 'mano' ? [T[s][0], T[s][1] + 0.45 * use, T[s][2] + 0.1 * use] : [T[s][0], T[s][1] + 0.08 * use, T[s][2] + 0.18 * use];
    const wantW = T ? (act.fase === 'alcanzar' ? reach : 1) : 0;
    p.armW = (p.armW || 0) + (wantW - (p.armW || 0)) * Math.min(1, dt * 12);
    if (T) p.carryTargets = T; else if (p.armW < 0.02) p.carryTargets = null;
    // Al despegar o aterrizar con algo en la mano o en brazos, pasa a las patas y vuelve
    if (held && held.grip && act.fase !== 'soltar') enganche(held);
  }, 14);
  // Sigue al enganche después de animar el modelo
  G.on('render', dt => sujetar(dt), 16);
  // Al cargar o reiniciar la partida no se lleva nada (lo que llevaba queda en el suelo)
  G.on('apply', () => { if (held) dejar(); act.fase = ''; }, 35);

  G.actores.agarrar = agarrar; G.actores.soltar = soltar;
  return api;
});
