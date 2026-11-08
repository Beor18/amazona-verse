/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · FX de los dos poderes de la demo D7 (frente A).
   Contrato en docs/equipo/V18_CONTRATOS.md. Solo se carga con la bandera V18 (encendida por defecto; se apaga con ?v18=0 o localStorage amazonaverse.v18on = '0')
   desde boot.js (aDemanda + alPrimerGesto); AV.v18FxTest() lo carga bajo demanda para probarlo.
   - Grito del Yunque (Vittata, familia PICO): onda(origen, direccion, alcance) lanza 2-3 anillos de onda sonora que salen
     del pico hacia delante, se abren y se desvanecen a lo largo del alcance (empujar e interrumpir lo aplica combate.js).
   - Escudo de plumas (A. arausiaca, familia PLUMAS): escudo(actor, segundos) crea un círculo de plumas luminosas que gira
     alrededor de la cotorra; al acabar (o con dispersar(actor)) las plumas se dispersan y se apagan.
   - Rendimiento: los anillos son UN InstancedMesh aditivo con textura de borde suave (1 draw call para todos)
     y las plumas OTRO InstancedMesh de tarjetas con sprite propio (64×64, 1 textura pequeña generada en
     runtime; 1 draw call para todos los escudos). En calidad 'bajo' 2 anillos y 14 plumas; coste por cuadro:
     unas pocas escrituras de matriz/color (despreciable). Sin sombras ni luces dinámicas.
   - El frente A (combate.js) llama a esta API directamente; no se engancha a eventos (el evento 'v18poder' lo emite
     combate para la amenaza, KIMI-064). Prueba: AV.v18FxTest(). */
window.AVV18Fx = function (G) {
  'use strict';
  if (G.v18fx) return G.v18fx;
  const S = G.S, scene = G.renderer.scene;
  const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
  const reducido = () => !!G.renderer.REDUCED;

  // ---------- Anillos del Grito del Yunque: un InstancedMesh aditivo para todos los anillos ----------
  const MAXR = 12;                       // hasta 4 gritos simultáneos (3 anillos cada uno)
  // Textura de borde suave (128×128, canvas en runtime). RingGeometry (r128) usa uv = (pos/outerRadius+1)/2,
  // así que con outerRadius = 1 la banda del anillo vive a distancia UV 0,4–0,5 del centro: el degradado la
  // envuelve y ambos bordes (interno y externo) funden a transparente en vez de cortar en seco.
  const TEX_ANILLO = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.78, 'rgba(255,255,255,0)');
    g.addColorStop(0.83, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.93, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;   // degradado suave: sin mipas necesarios
    return t;
  })();
  const ringGeo = new THREE.RingGeometry(0.8, 1, 40);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffcf5e', map: TEX_ANILLO, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const rings = new THREE.InstancedMesh(ringGeo, ringMat, MAXR);
  rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  rings.frustumCulled = false; rings.visible = false; rings.renderOrder = 6;
  const NEGRO = new THREE.Color(0, 0, 0);
  for (let i = 0; i < MAXR; i++) rings.setColorAt(i, NEGRO);
  scene.add(rings);
  const ranillos = [];                   // por slot: {ox,oy,oz, dx,dy,dz, t0, vida, alcance} | null
  for (let i = 0; i < MAXR; i++) ranillos.push(null);
  let tFx = 0;                           // reloj propio: avanza con paso(dt) (enganchado a 'render' y usable en pruebas)

  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();
  const _z = new THREE.Vector3(0, 0, 1), _dir3 = new THREE.Vector3();

  function pintarAnillo(i, a) {
    if (!a) { _m.makeScale(0, 0, 0); rings.setMatrixAt(i, _m); rings.setColorAt(i, NEGRO); return; }
    const p = (tFx - a.t0) / a.vida;
    if (p < 0) { _m.makeScale(0, 0, 0); rings.setMatrixAt(i, _m); rings.setColorAt(i, NEGRO); return; } // aún no sale (escalonado)
    if (p >= 1) { ranillos[i] = null; _m.makeScale(0, 0, 0); rings.setMatrixAt(i, _m); rings.setColorAt(i, NEGRO); return; }
    const avance = 1 - (1 - p) * (1 - p);                     // easeOutQuad: sale rápido y frena
    const d = a.alcance * avance;
    _p.set(a.ox + a.dx * d, a.oy + a.dy * d, a.oz + a.dz * d);
    const esc = 0.35 + p * a.alcance * 0.5;                   // se abre
    _s.set(esc, esc, esc);
    _dir3.set(a.dx, a.dy, a.dz);
    _q.setFromUnitVectors(_z, _dir3.lengthSq() > 0 ? _dir3.normalize() : _z);
    _m.compose(_p, _q, _s);
    rings.setMatrixAt(i, _m);
    const fade = Math.pow(1 - p, 1.4);                        // se desvanece (aditivo: hacia negro)
    _c.setRGB(fade, fade * (0.95 - 0.33 * p), fade * (0.72 - 0.45 * p));   // de oro pálido a ámbar
    rings.setColorAt(i, _c);
  }

  // ---------- Escudo de plumas: UN InstancedMesh de tarjetas de pluma (billboard) para todos los escudos ----------
  // Se usa InstancedMesh y NO THREE.Points a propósito: el primitivo POINTS no renderiza en el driver headless de
  // esta PC (ANGLE/D3D11 con Chrome headless; comprobado 5-nov r7 — ni estas plumas ni la ráfaga de G.fx se veían;
  // en el iPad real de Kelvin sí se dibuja, KIMI-060). El InstancedMesh usa TRIANGLES, como los anillos y la flora.
  const MAXE = 2, PLUMAS = 32;           // hasta 2 escudos (Vittata + rival); 32 plumas por escudo
  const NE = 16, E0 = MAXE * PLUMAS;      // V18.2 §6: 16 tarjetas más al final para la estela del elemento de la alianza
  const NP = E0 + NE;
  // Sprite propio (64×64, canvas en runtime): pluma estilizada por tarjeta — halo suave, vana con degradado
  // (base cálida → punta verde-dorada), barbas finas y cañón curvo. Se tiñe por instancia con PLUMA_COLS.
  const TEX_PLUMA = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    let g = x.createRadialGradient(32, 30, 2, 32, 30, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.save();
    x.translate(32, 30); x.scale(1, 1.9);                     // elipse alta: encaja con la tarjeta 0,5×0,78
    g = x.createRadialGradient(0, 0, 1, 0, 0, 14);
    g.addColorStop(0, 'rgba(255,252,238,0.98)');
    g.addColorStop(0.55, 'rgba(240,246,200,0.92)');
    g.addColorStop(0.85, 'rgba(196,232,158,0.55)');
    g.addColorStop(1, 'rgba(180,224,148,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, 14, 0, Math.PI * 2); x.fill();
    x.restore();
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1;
    for (let i = 0; i < 7; i++) { const y = 10 + i * 6.5;
      x.beginPath(); x.moveTo(32, y + 4); x.quadraticCurveTo(26, y + 5, 21, y + 9); x.stroke();
      x.beginPath(); x.moveTo(32, y + 4); x.quadraticCurveTo(38, y + 5, 43, y + 9); x.stroke(); } // barbas
    x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(32, 57); x.quadraticCurveTo(30, 30, 32, 5); x.stroke(); // cañón
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    return t;
  })();
  const plumaGeo = new THREE.PlaneGeometry(0.5, 0.78);
  const plumaMat = new THREE.MeshBasicMaterial({ map: TEX_PLUMA, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const plumas = new THREE.InstancedMesh(plumaGeo, plumaMat, NP);
  plumas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  plumas.frustumCulled = false; plumas.visible = false; plumas.renderOrder = 6;
  for (let i = 0; i < NP; i++) { _m.makeScale(0, 0, 0); plumas.setMatrixAt(i, _m); plumas.setColorAt(i, NEGRO); }
  scene.add(plumas);
  const pPos = new Float32Array(NP * 3);   // espejo de posiciones (lo usan las pruebas y el diagnóstico)
  for (let i = 0; i < NP; i++) pPos[i * 3 + 1] = -1e4;
  // Varianza determinista por tarjeta (escala y fase de parpadeo): misma pluma, mismo aspecto en cada cuadro.
  const VAR_S = new Float32Array(NP), VAR_F = new Float32Array(NP);
  for (let i = 0, s = 1234567; i < NP; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff; VAR_S[i] = 0.8 + (s % 1000) / 1000 * 0.28;
    s = (s * 1103515245 + 12345) & 0x7fffffff; VAR_F[i] = (s % 628) / 100;
  }
  const escudos = [];                    // {clave, actor, t0, dur, fase, ang, n, vel, slot}
  const _v = new THREE.Vector3(), _ejeZ = new THREE.Vector3(0, 0, 1), _roll = new THREE.Quaternion();
  // Posición del actor: Object3D (.position), punto {x,y,z}, luchador de combate.js (.pos {x,y,z} vivo) o Vittata (S.pos).
  const posDe = (actor, out) => {
    if (actor && actor.position) return out.copy(actor.position);
    if (actor && typeof actor.x === 'number') return out.set(actor.x, actor.y || 0, actor.z || 0);
    if (actor && actor.pos && typeof actor.pos.x === 'number') return out.set(actor.pos.x, actor.pos.y || 0, actor.pos.z || 0);
    return out.set(S.pos.x, S.pos.y, S.pos.z);
  };
  let _nObj = 0; const _ids = new WeakMap();
  // Clave única por actor: string, Object3D (WeakMap), luchador de combate.js (.id: 'jugador'|'rival') o 'yo' (Vittata).
  const claveDe = actor => {
    if (actor == null) return 'yo';
    if (typeof actor === 'string') return actor;
    if (actor.position) { if (!_ids.has(actor)) _ids.set(actor, 'obj' + (++_nObj)); return _ids.get(actor); }
    if (typeof actor.id === 'string' && actor.id) return actor.id;
    return 'yo';
  };
  const PLUMA_COLS = ['#a8ffb8', '#d8ffb0', '#fff8d0', '#90e8a0'].map(h => new THREE.Color(h));
  const slots = [true, true];            // libres por índice
  function liberarSlot(s) {
    slots[s] = true;
    for (let i = 0; i < PLUMAS; i++) {
      const idx = s * PLUMAS + i, j = idx * 3;
      pPos[j] = 0; pPos[j + 1] = -1e4; pPos[j + 2] = 0;
      _m.makeScale(0, 0, 0); plumas.setMatrixAt(idx, _m); plumas.setColorAt(idx, NEGRO);
    }
  }
  function quitar(e) { const i = escudos.indexOf(e); if (i >= 0) escudos.splice(i, 1); liberarSlot(e.slot); }

  // Tarjeta de pluma mirando a cámara (billboard) con giro propio alrededor del eje de vista.
  function ponerPluma(idx, x, y, z, escala, color, giro) {
    pPos[idx * 3] = x; pPos[idx * 3 + 1] = y; pPos[idx * 3 + 2] = z;
    _q.copy(G.renderer.camera.quaternion);
    if (giro) { _roll.setFromAxisAngle(_ejeZ, giro); _q.multiply(_roll); }
    _p.set(x, y, z); _s.set(escala, escala, escala);
    _m.compose(_p, _q, _s);
    plumas.setMatrixAt(idx, _m);
    plumas.setColorAt(idx, color);
  }

  function pintarEscudo(e) {
    const base = e.slot * PLUMAS, n = e.n;
    posDe(e.actor, _v); _v.y += 1.35;      // centro del anillo: a la altura del cuerpo
    const t = tFx - e.t0;
    if (e.fase === 'dispersa') {
      const p = Math.min(1, t / 0.8);
      for (let i = 0; i < n; i++) {
        const vi = e.vel[i];
        const f = (1 - p) * (1 - p);
        _c.copy(PLUMA_COLS[i % PLUMA_COLS.length]).multiplyScalar(f);
        ponerPluma(base + i, _v.x + vi[0] * t, _v.y + vi[1] * t - 1.6 * t * t, _v.z + vi[2] * t, 0.85 * (0.5 + 0.5 * f), _c, e.ang + i * 1.7 + t * 4);
      }
      if (p >= 1) quitar(e);
      return;
    }
    const respira = 1.12 + Math.sin(t * 2.2) * 0.06;
    for (let i = 0; i < n; i++) {
      const capa = i % 2;                                    // doble corona: la mitad interior gira en contra
      const a = e.ang + t * 1.4 * (capa ? -1.5 : 1) + i * Math.PI * 2 / n;
      const rad = respira * (capa ? 0.74 : 1);
      _c.copy(PLUMA_COLS[i % PLUMA_COLS.length]).multiplyScalar(0.85 + Math.sin(t * 4.4 + VAR_F[base + i]) * 0.15);
      ponerPluma(base + i, _v.x + Math.cos(a) * rad, _v.y + Math.sin(a * 2 + t * 3.1) * 0.16, _v.z + Math.sin(a) * rad, 0.85 * VAR_S[base + i] * (1 + Math.sin(t * 3 + i) * 0.07), _c, a + t * 1.5);
    }
    if (t >= e.dur) dispersar(e.clave);   // se acaba: se dispersa solo
  }

  // ---------- API ----------
  // Grito del Yunque: anillos de onda sonora desde el pico hacia delante.
  // origen {x,y,z}|Object3D|null (null = pico de Vittata); direccion {x,y,z}|null (null = hacia donde mira S.facing); alcance en m.
  function onda(origen, direccion, alcance) {
    const n = reducido() ? 2 : (nivel() === 'bajo' ? 2 : 3);
    const alc = Math.min(24, Math.max(2, +alcance || 9));
    if (origen && origen.position) _v.copy(origen.position);
    else if (origen && typeof origen.x === 'number') _v.set(origen.x, origen.y || 0, origen.z || 0);
    else _v.set(S.pos.x + S.facing.x * 0.5, S.pos.y + 2.1, S.pos.z + S.facing.z * 0.5); // pico de Vittata
    let dx, dy, dz;
    if (!direccion) { dx = S.facing.x; dy = 0; dz = S.facing.z; }
    else { dx = +direccion.x || 0; dy = +direccion.y || 0; dz = direccion.z == null ? 0 : +direccion.z; }
    const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    let puestos = 0;
    for (let k = 0; k < n; k++) {
      let libre = -1, masViejo = 0, edad = -1;
      for (let i = 0; i < MAXR; i++) { if (!ranillos[i]) { libre = i; break; } const e = tFx - ranillos[i].t0; if (e > edad) { edad = e; masViejo = i; } }
      const i = libre >= 0 ? libre : masViejo;
      ranillos[i] = { ox: _v.x, oy: _v.y, oz: _v.z, dx, dy, dz, t0: tFx + k * 0.12, vida: 0.95, alcance: alc };
      puestos++;
    }
    rings.visible = true;
    return { ok: puestos > 0, n: puestos, alcance: alc };
  }

  // Escudo de plumas: círculo de plumas luminosas girando alrededor del actor ('yo'/null = Vittata).
  function escudo(actor, segundos) {
    const clave = claveDe(actor);
    const viejo = escudos.find(e => e.clave === clave);
    if (viejo) quitar(viejo);                        // refrescar el de ese actor
    if (escudos.length >= MAXE) quitar(escudos[0]);  // el más viejo cede el sitio
    const slot = slots[0] ? 0 : 1;
    slots[slot] = false;
    const e = { clave, actor: actor || null, t0: tFx, dur: Math.min(30, Math.max(0.5, +segundos || 6)), fase: 'gira', ang: Math.random() * 6.28, n: nivel() === 'bajo' ? 14 : PLUMAS, vel: [], slot };
    for (let i = 0; i < PLUMAS; i++) { const a = Math.random() * 6.28, r = 2 + Math.random() * 2.5; e.vel.push([Math.cos(a) * r, 1 + Math.random() * 2, Math.sin(a) * r]); }
    escudos.push(e);
    plumas.visible = true;
    return { ok: true, clave: e.clave, dur: e.dur, n: e.n };
  }

  // Dispersa el escudo de un actor (si tiene): las plumas vuelan y se apagan.
  function dispersar(actor) {
    const clave = claveDe(actor);
    const e = escudos.find(x => x.clave === clave);
    if (!e) return { ok: false };
    if (e.fase !== 'dispersa') { e.fase = 'dispersa'; e.t0 = tFx; }
    return { ok: true };
  }

  // Quita al instante el escudo de un actor, sin dispersión (fin de combate o salida: no queda un escudo fantasma girando).
  function apagar(actor) {
    const e = escudos.find(x => x.clave === claveDe(actor));
    if (!e) return { ok: false };
    quitar(e); plumas.visible = escudos.length > 0 || eVivas > 0;
    return { ok: true };
  }

  // ---------- V18.2 §6: estela del elemento de la alianza (explorando) ----------
  // Mismas tarjetas de pluma (mismo InstancedMesh y textura: 0 draw calls y 0 modelos nuevos), en las NE últimas instancias.
  // Cada elemento cambia color y movimiento: fuego = chispas que suben, agua = gotas que caen, viento = remolino, naturaleza =
  // hojitas que flotan, luz = destellos quietos, eco = ondas que se abren a ras de suelo. Sin asignaciones: arreglos fijos.
  // Con movimiento reducido no sale nada (devuelve { ok: false }).
  const ELEM = {
    fuego: { cols: ['#ffb347', '#ff7a2e', '#ffd84a'], abre: 0.45, sube: 1.7, grav: -0.6, vida: 0.8, esc: 0.32 },
    agua: { cols: ['#9fdcff', '#d8f3ff', '#6cc4f0'], abre: 0.35, sube: -0.2, grav: 4, vida: 0.7, esc: 0.26, alto: 1.1 },
    viento: { cols: ['#e8fff6', '#c8f0e8', '#ffffff'], abre: 1.5, sube: 0.4, grav: 0, vida: 0.9, esc: 0.3, gira: 3 },
    naturaleza: { cols: ['#7fd38f', '#a3c94a', '#3f8f3a'], abre: 0.6, sube: 0.7, grav: 1.2, vida: 1, esc: 0.34 },
    luz: { cols: ['#fff8d0', '#ffffff', '#ffe9a0'], abre: 0.3, sube: 0.45, grav: 0, vida: 0.7, esc: 0.28, brilla: 1 },
    eco: { cols: ['#ffcf5e', '#fff3b0', '#a8ffb8'], abre: 1.3, sube: 0.1, grav: 0, vida: 0.8, esc: 0.3 }
  };
  const ELEM_IDS = Object.keys(ELEM);
  for (const k of ELEM_IDS) ELEM[k].cols = ELEM[k].cols.map(h => new THREE.Color(h));
  const eX = new Float32Array(NE * 3), eV = new Float32Array(NE * 3), eT = new Float32Array(NE).fill(-1), eE = new Uint8Array(NE);
  let eSig = 0, eVivas = 0;
  function estela(elemento, x, y, z, n) {
    const P = ELEM[elemento];
    if (!P || reducido()) return { ok: false, n: 0 };
    n = Math.max(1, Math.min(NE, n | 0 || 1));
    const ei = ELEM_IDS.indexOf(elemento);
    for (let k = 0; k < n; k++) {
      const i = eSig; eSig = (eSig + 1) % NE;
      const a = Math.random() * 6.283, r = P.abre * (0.5 + Math.random() * 0.5);
      eX[i * 3] = x; eX[i * 3 + 1] = y + (P.alto || 0); eX[i * 3 + 2] = z;
      eV[i * 3] = Math.cos(a) * r; eV[i * 3 + 1] = P.sube * (0.7 + Math.random() * 0.6); eV[i * 3 + 2] = Math.sin(a) * r;
      eT[i] = tFx; eE[i] = ei;
    }
    plumas.visible = true; quieto = false;
    return { ok: true, n };
  }
  function pintarEstela() {
    let vivas = 0;
    for (let i = 0; i < NE; i++) {
      const idx = E0 + i;
      if (eT[i] < 0) continue;
      const P = ELEM[ELEM_IDS[eE[i]]], t = tFx - eT[i], p = t / P.vida;
      if (p >= 1 || p < 0) { eT[i] = -1; pPos[idx * 3 + 1] = -1e4; _m.makeScale(0, 0, 0); plumas.setMatrixAt(idx, _m); plumas.setColorAt(idx, NEGRO); continue; }
      vivas++;
      let vx = eV[i * 3], vz = eV[i * 3 + 2];
      if (P.gira) { const g = P.gira * t, cg = Math.cos(g), sg = Math.sin(g); const ax = vx * cg - vz * sg; vz = vx * sg + vz * cg; vx = ax; }
      const f = Math.min(1, p / 0.15) * Math.pow(1 - p, 1.2) * (P.brilla ? 0.7 + 0.3 * Math.sin(t * 22 + i) : 1);
      _c.copy(P.cols[i % P.cols.length]).multiplyScalar(f);
      ponerPluma(idx, eX[i * 3] + vx * t, eX[i * 3 + 1] + eV[i * 3 + 1] * t - 0.5 * P.grav * t * t, eX[i * 3 + 2] + vz * t, P.esc * (0.8 + 0.4 * p), _c, i * 1.3 + t * 2);
    }
    eVivas = vivas;
    return vivas;
  }

  let quieto = false; // CPU (móvil): sin anillos ni escudos, tras una pasada que los deja a escala 0 no se reescriben ni se suben los búferes
  function paso(dt) {
    tFx += Math.min(0.1, Math.max(0, dt || 0));
    let hay = escudos.length > 0 || eVivas > 0;
    for (let i = 0; i < NE && !hay; i++) if (eT[i] >= 0) hay = true;
    for (let i = 0; i < MAXR && !hay; i++) if (ranillos[i]) hay = true;
    if (!hay && quieto) return;
    quieto = !hay;
    let vivos = 0;
    for (let i = 0; i < MAXR; i++) { pintarAnillo(i, ranillos[i]); if (ranillos[i]) vivos++; }
    rings.visible = vivos > 0;
    rings.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    for (let i = 0; i < escudos.length;) { const e = escudos[i]; pintarEscudo(e); if (escudos[i] === e) i++; }
    const nEst = pintarEstela();
    plumas.visible = escudos.length > 0 || nEst > 0;
    plumas.instanceMatrix.needsUpdate = true;
    if (plumas.instanceColor) plumas.instanceColor.needsUpdate = true;
  }

  G.on('render', dt => paso(Number.isFinite(dt) ? dt : 0.016), 31);
  G.on('apply', () => { for (let i = 0; i < MAXR; i++) ranillos[i] = null; for (let i = escudos.length - 1; i >= 0; i--) quitar(escudos[i]); eT.fill(-1); eVivas = 0; rings.visible = plumas.visible = false; }, 31);

  const estado = () => ({ anillos: ranillos.filter(Boolean).length, escudos: escudos.length, estela: eVivas, llamadas: (rings.visible ? 1 : 0) + (plumas.visible ? 1 : 0), nivel: nivel() });

  function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const avanza = s => { for (let i = 0, k = Math.ceil(s / 0.1); i < k; i++) paso(0.1); };
    // La prueba fija su calidad (otras baterías, como climaTest o ambienteTest, la dejan cambiada) y la devuelve al terminar
    const RC = G.renderer.calidad, cal0 = RC && { nivel: RC.nivel, manual: RC.manual }, ponerCal = n => { if (RC && G.renderer.setCalidad && RC.nivel !== n) G.renderer.setCalidad(n); };
    try {
      if (RC) RC.manual = true;
      ponerCal('medio');
      for (let i = 0; i < MAXR; i++) ranillos[i] = null;
      for (let i = escudos.length - 1; i >= 0; i--) quitar(escudos[i]);
      paso(0.1);
      const nEsp = reducido() ? 2 : (nivel() === 'bajo' ? 2 : 3);
      const r0 = onda({ x: 0, y: 50, z: 0 }, { x: 1, y: 0, z: 0 }, 9);
      check('onda() encola los anillos esperados', r0.ok && estado().anillos === nEsp, estado().anillos + ' (' + nEsp + ' en ' + nivel() + (reducido() ? ', movimiento reducido' : '') + ')');
      if (RC) {
        for (let i = 0; i < MAXR; i++) ranillos[i] = null;
        ponerCal('bajo'); const rB = onda({ x: 0, y: 50, z: 0 }, { x: 1, y: 0, z: 0 }, 9), nB = estado().anillos;
        for (let i = 0; i < MAXR; i++) ranillos[i] = null;
        ponerCal('medio'); onda({ x: 0, y: 50, z: 0 }, { x: 1, y: 0, z: 0 }, 9);
        check('En calidad baja onda() pone 2 anillos (la prueba fija la calidad y la devuelve)', rB.ok && nB === 2 && nivel() === 'medio', nB + ' en bajo · vuelve a ' + nivel());
      }
      check('Los anillos son un solo InstancedMesh (1 draw call)', rings.isInstancedMesh && rings.visible);
      avanza(0.4);
      let avanzo = false;
      for (let i = 0; i < MAXR; i++) if (ranillos[i] && tFx >= ranillos[i].t0 && rings.instanceMatrix.array[i * 16 + 12] > 0.3) avanzo = true;
      check('Los anillos avanzan hacia delante (+x desde el origen)', avanzo);
      avanza(1.4);
      check('Tras su vida los anillos mueren y el mesh se apaga', estado().anillos === 0 && !rings.visible, estado().anillos);
      const e0 = escudo(null, 0.4);
      check('escudo() crea el escudo de Vittata con plumas visibles', e0.ok && estado().escudos === 1 && plumas.visible && e0.n >= 14, JSON.stringify({ n: e0.n, est: estado(), vis: plumas.visible }));
      let dentro = true;
      for (let i = 0; i < 32; i++) { const dx = pPos[i * 3] - S.pos.x, dy = pPos[i * 3 + 1] - (S.pos.y + 1.35), dz = pPos[i * 3 + 2] - S.pos.z; if (pPos[i * 3 + 1] > -100 && Math.hypot(dx, dy, dz) > 2) dentro = false; }
      check('Las plumas giran alrededor de la cotorra (≤2 m del centro)', dentro);
      avanza(0.6);                                   // pasa su duración (0,5 s; con margen: 5 pasos de 0,1 sumados a un tFx grande quedan a veces en 0,4999…): se dispersa sola
      const eYo = escudos.find(x => x.clave === 'yo');
      check('Al acabar el tiempo el escudo se dispersa solo', !eYo || eYo.fase === 'dispersa', eYo ? eYo.fase + ' t=' + (tFx - eYo.t0).toFixed(4) : 'ya no está');
      avanza(1.2);
      check('Tras la dispersión el escudo desaparece del todo', estado().escudos === 0 && !plumas.visible);
      escudo(null, 10); escudo('rival', 10);
      check('Dos actores pueden tener escudo a la vez', estado().escudos === 2);
      check('Los escudos juntos son 1 solo draw call (InstancedMesh)', estado().llamadas === 1, estado().llamadas);
      onda({ x: 0, y: 50, z: 0 }, { x: 1, y: 0, z: 0 }, 9);
      check('Grito + escudos juntos: 2 draw calls en total', estado().llamadas === 2, estado().llamadas);
      avanza(1.5);                                   // los anillos mueren
      const d = dispersar(null);
      avanza(1.2);
      check('dispersar(actor) apaga ese escudo y queda el otro', d.ok && estado().escudos === 1);
      const luchadorPrueba = { id: 'ia', pos: { x: S.pos.x + 5, y: S.pos.y, z: S.pos.z } }; // como habilidades.js luchador()
      escudo(luchadorPrueba, 10);
      paso(0.1);
      const dIa = Math.hypot(pPos[0] - luchadorPrueba.pos.x, pPos[1] - (luchadorPrueba.pos.y + 1.35), pPos[2] - luchadorPrueba.pos.z);
      luchadorPrueba.pos.x += 3;                       // se mueve el luchador: el escudo debe seguirlo (pos viva)
      paso(0.1);
      const dIa2 = Math.hypot(pPos[0] - luchadorPrueba.pos.x, pPos[1] - (luchadorPrueba.pos.y + 1.35), pPos[2] - luchadorPrueba.pos.z);
      check('Contrato combate.js: escudo sigue a un luchador {id,pos} vivo', estado().escudos === 2 && dIa <= 2 && dIa2 <= 2, dIa.toFixed(2) + ' m -> ' + dIa2.toFixed(2) + ' m');
      dispersar(luchadorPrueba); avanza(1.2);
      escudo('tercero', 10);                          // con 1 activo ('rival') cabe sin reemplazar
      check('Un tercer escudo con 1 activo cabe sin reemplazar (tope 2)', estado().escudos === 2 && escudos.some(e => e.clave === 'rival'), escudos.map(e => e.clave).join(','));
      escudo('cuarto', 10);                           // 3.º activo: supera el tope y reemplaza al más viejo ('rival')
      check('Al superar el tope se reemplaza al escudo más viejo', estado().escudos === 2 && !escudos.some(e => e.clave === 'rival') && escudos.some(e => e.clave === 'cuarto'), escudos.map(e => e.clave).join(','));
      avanza(0.5);
      onda();                                         // defaults desde el pico de Vittata
      check('onda() sin argumentos usa el pico y el facing de Vittata', estado().anillos >= 2, estado().anillos);
      avanza(1.5);
      dispersar('tercero'); dispersar('cuarto');
      avanza(1.5);
      escudo('rival', 10); const ap = apagar('rival');
      check('apagar(actor) quita su escudo al instante, sin dispersión (fin de combate)', ap.ok && estado().escudos === 0 && !plumas.visible, JSON.stringify(estado()));
      // V18.2 §6: estela del elemento de la alianza (mismo InstancedMesh, sin modelos nuevos, sin asignar por cuadro)
      const R0 = G.renderer.REDUCED, est = {};
      try {
        G.renderer.REDUCED = false;
        const yE = S.pos.y + 0.5;
        for (const el of ELEM_IDS) est[el] = estela(el, S.pos.x, yE, S.pos.z, 2).ok;
        paso(0.1);
        const ids0 = new Set(scene.children.map(o => o.uuid));
        let lejos = 0; for (let i = E0; i < NP; i++) if (pPos[i * 3 + 1] > -100 && Math.hypot(pPos[i * 3] - S.pos.x, pPos[i * 3 + 2] - S.pos.z) > 2.5) lejos++;
        est.vivas = eVivas; est.lejos = lejos; est.visible = plumas.visible;
        est.malla = scene.children.length === ids0.size && plumas.count === NP;
        // agua cae y fuego sube
        for (let i = 0; i < NE; i++) eT[i] = -1;
        estela('fuego', 0, 50, 0, 1); const iF = (eSig + NE - 1) % NE; estela('agua', 0, 50, 0, 1); const iA = (eSig + NE - 1) % NE;
        avanza(0.4);
        est.fuegoSube = pPos[(E0 + iF) * 3 + 1] > 50.3; est.aguaCae = pPos[(E0 + iA) * 3 + 1] < 51.1;
        avanza(1.2);
        est.muere = eVivas === 0 && !plumas.visible;
        G.renderer.REDUCED = true; est.reducido = estela('luz', 0, 50, 0, 3).ok === false && eVivas === 0;
        est.desconocido = estela('nada', 0, 50, 0, 1).ok === false;
      } catch (e) { est.err = e && e.message; }
      G.renderer.REDUCED = R0;
      check('V18.2 §6: estela del elemento (fuego, agua, viento, naturaleza, luz, eco) con las tarjetas de pluma del mismo InstancedMesh: cerca de la cotorra, fuego sube, agua cae, se apaga sola; nada con movimiento reducido',
        !est.err && ELEM_IDS.every(k => est[k]) && est.vivas === 12 && est.lejos === 0 && est.visible && est.malla && est.fuegoSube && est.aguaCae && est.muere && est.reducido && est.desconocido, JSON.stringify(est));
      check('Sin excepciones y todo se apaga al final', estado().escudos === 0 && estado().anillos === 0, JSON.stringify(estado()));
    } catch (e) { check('Sin excepciones', false, e && e.message); }
    finally { if (cal0) { ponerCal(cal0.nivel); RC.manual = cal0.manual; } }
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18fx = { onda, escudo, dispersar, apagar, estela, ELEMENTOS: ELEM_IDS, paso, estado, test, _interno: { ranillos, escudos, rings, plumas, pPos } };
  return G.v18fx;
};
