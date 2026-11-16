/* Juego · F2-4 · «Sembradora del cielo» (minijuego corto de «Más juegos», 90 segundos). Diseño: docs/diseno/F2_MINIJUEGOS.md §4.
   Vuela sobre el claro y suelta cada semilla (Acción: «Soltar») cuando la sombra-diana pise un parche de tierra oscura: la semilla
   cae en arco (la línea fina que va de Vittata a la sombra es su camino de verdad) y brota un árbol en 1 s. Centro del parche: +3 y
   brote grande · borde: +1 y brote mediano · fuera: rebota y se pierde (solo se va la racha). Soltar a más de 8 m/s suma +1.
   Racha de parches seguidos: ×2 desde 3, ×3 desde 6. Se llevan 5 semillas; sin semillas, se recargan en el saco (junto a la salida).
   Machacar no sirve: cada toque gasta una semilla, hay 0,35 s entre una y otra y fallar rompe la racha.
   Dificultad: 0–30 s parches grandes y sin viento · 30–60 s medianos y viento lateral (la sombra ya lo lleva: lo que se ve es lo que
   pasa) · 60–90 s pequeños, en ladera si la hay, y parches que se secan (se achican en 8 s).
   Al final la cámara sube y enseña el claro reverdecido; los árboles del minijuego se van al salir (no cambian el mapa ni el canon).
   Naturaleza: el juego NO dice que las cotorras siembren semillas (no hay fuente): es fantasía de juego. Los árboles se llaman como
   en banquete.js (palma de sierra y tabonuco). Dato real opcional, una sola vez en el panel final (USFWS, docs/equipo/DATOS_VERIFICADOS.md).
   Mallas: 4 instanciadas (parches, semillas en el aire, palmas y tabonucos) + la diana, el arco y el saco (mallas sueltas); grupos fijos
   y vectores reutilizados: nada se crea por cuadro. Al salir se suelta todo (dispose de geometrías, materiales e InstancedMesh).
   Mientras se juega la música del mundo calla (musica.js lee body.sembradora-on) y los avisos de la historia esperan
   (G.menuModos.ocupado()). El panel final es modal: congela el mundo (G.pausa 'sembradora') y no deja pasar teclas.
   «Reducir movimiento»: sin hojas volando, sin crecer animado y sin la subida de la cámara; los avisos importantes también suenan.
   Sonidos que ya existen: lanzar, semilla, encaje, frenada, pieza, aviso, boton, panel_final, logro.
   Récord en este dispositivo (localStorage, <almacen>.sembradora = { v: 1, mejor (puntos), arboles, racha, jugadas, dato }).
   API: window.AVSembradora(G) → G.sembradoraApi = { jugar, salir, activo, soltar, paso, estado, objetivo, test }. Prueba: AV.sembradoraTest(). */
window.AVSembradora = function (G) {
  'use strict';
  if (G.sembradoraApi) return G.sembradoraApi;
  const S = G.S, R = G.renderer;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -1e9; return w > -1e8 ? w : -Infinity; };
  const superficie = (x, z) => Math.max(H(x, z), nivelAgua(x, z));
  const MV = () => (G.fisica && G.fisica.MOVE) || {};
  const ALM = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.sembradora';
  const DUR = 90, LLEVA = 5, NP = 4, NA = 64, NV = 5, NARCO = 18, NC = 160;
  const GRAV = 9, K_H = 0.6, ALTO_MIN = 2.5, ESPERA = 0.35, SACO_R = 4, VEL_BONO = 8, SECO_T = 8, VISTA_T = 1.8, CENTRO = 0.4, VIENTO = 2.4;
  const RADIO = [3.2, 2.3, 1.6], TAM = [1, 0.7, 0.48];
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const html = document.documentElement;
  const reducido = () => html.classList.contains('mov-reducido') || !!(R && R.REDUCED);
  const reloj = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor < 100000 ? d : null; } catch (e) { return null; } };
  const guardarRec = () => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor: E.mejor, arboles: E.mejorArb, racha: E.mejorRachaRec, jugadas: E.jugadas, dato: E.datoVisto })); } catch (e) { /* sin almacén */ } };
  const sonar = (n, a) => { try { if (!G.quiet && G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const hojas = (x, y, z, n) => { if (reducido()) return; try { if (G.fx && G.fx.burst) G.fx.burst(x, y, z, 'leaves', n); } catch (e) { /* sin fx */ } };
  let azarS = 0; const azar = () => { if (!azarS) return Math.random(); azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };
  const rnd = (a, b) => a + azar() * (b - a);
  const mult = n => (n >= 6 ? 3 : n >= 3 ? 2 : 1);

  // ---------- Estado (grupos fijos, sin asignaciones por cuadro) ----------
  const parches = []; for (let i = 0; i < NP; i++) parches.push({ on: false, x: 0, y: 0, z: 0, r: 0, r0: 0, nx: 0, ny: 1, nz: 0, seco: false, t: 0 });
  const arboles = []; for (let i = 0; i < NA; i++) arboles.push({ on: false, x: 0, y: 0, z: 0, esp: 0, tam: 1, t: 0, yaw: 0 });
  const vuelo = []; for (let i = 0; i < NV; i++) vuelo.push({ on: false, x0: 0, y0: 0, z0: 0, hx: 0, hz: 0, T: 0, t: 0, lx: 0, ly: 0, lz: 0, vel: 0, rebote: 0, giro: 0 });
  const cerca = []; for (let i = 0; i < NC; i++) cerca.push({ x: 0, z: 0, r: 0 });
  let nCerca = 0;
  const saco = { x: 0, y: 0, z: 0 };
  const guia = { x: 0, y: 0, z: 0, ok: false };
  const P = { x0: 0, y0: 0, z0: 0, hx: 0, hz: 0, T: 0, lx: 0, ly: 0, lz: 0, alto: 0, zona: 0 }; // la predicción de este cuadro
  const E = { fase: 'nada', t: 0, puntos: 0, arboles: 0, semillas: LLEVA, racha: 0, mejorRacha: 0, centros: 0, rapidas: 0, fallos: 0, ultSoltar: -9, sinT: -9,
    vientoX: 0, vientoZ: 0, vientoA: 0, vientoOn: false, msgT: 0, avisos: 0, vistaT: 0, finP: 0, nuevo: false, datoVisto: false, datoAhora: false,
    mejor: 0, mejorArb: 0, mejorRachaRec: 0, jugadas: 0 };
  const restante = () => Math.max(0, DUR - E.t);
  const etapa = () => (E.t < 30 ? 0 : E.t < 60 ? 1 : 2);

  // ---------- Geometría: piezas con color por vértice, unidas en una sola malla (como semillas.js, sin tocarlo) ----------
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  function unir(partes) {
    const pos = [], nor = [], col = [], idx = []; let off = 0;
    for (const [g, c] of partes) {
      if (!g.index) { const n = g.attributes.position.count, a = []; for (let i = 0; i < n; i++) a.push(i); g.setIndex(a); }
      const k = lin(c), n = g.attributes.position.count;
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
      for (let i = 0; i < n; i++) col.push(k.r, k.g, k.b);
      for (const i of g.index.array) idx.push(i + off);
      off += n; g.dispose();
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    m.setIndex(idx); m.computeBoundingSphere();
    return m;
  }
  const plano = g => { g.rotateX(-Math.PI / 2); return g; };
  function geoParche() { // tierra oscura con el centro marcado (anillos sin solaparse: nada parpadea)
    return unir([[plano(new THREE.CircleGeometry(0.36, 28)), '#3a2312'], [plano(new THREE.RingGeometry(0.36, 0.44, 28)), '#e0c184'],
      [plano(new THREE.RingGeometry(0.44, 0.9, 28)), '#4a2e18'], [plano(new THREE.RingGeometry(0.9, 1, 28)), '#7a5532']]);
  }
  function geoDiana() { return unir([[plano(new THREE.CircleGeometry(0.78, 24)), '#16240f'], [plano(new THREE.RingGeometry(0.78, 1, 24)), '#ffffff']]); }
  function geoSemilla() {
    const c = new THREE.SphereGeometry(0.2, 12, 8); c.scale(0.86, 1.12, 0.86);
    const raya = new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI * 0.44, Math.PI * 0.12); raya.scale(0.88, 1.14, 0.88);
    return unir([[c, '#93602e'], [raya, '#5e3a1a']]);
  }
  function geoPalma() { // palma de sierra: tronco fino y anillado, capitel verde y frondas largas que cuelgan (~5 m)
    const t = new THREE.CylinderGeometry(0.09, 0.15, 3.6, 7); t.translate(0, 1.8, 0);
    const cap = new THREE.CylinderGeometry(0.13, 0.1, 0.7, 7); cap.translate(0, 3.95, 0);
    const p = [[t, '#8b8170'], [cap, '#6c9a3e']];
    for (let i = 0; i < 9; i++) {
      const f = new THREE.SphereGeometry(0.5, 8, 5); f.scale(2.5, 0.1, 0.42); f.translate(1.15, 0, 0); f.rotateZ(i % 2 ? -0.42 : -0.18); f.rotateY(i * Math.PI * 2 / 9); f.translate(0, 4.25, 0);
      p.push([f, i % 2 ? '#3d8a38' : '#4f9e42']);
    }
    return unir(p);
  }
  function geoTabonuco() { // tabonuco: tronco claro y copa redonda de varias bolas (~5,5 m)
    const t = new THREE.CylinderGeometry(0.16, 0.27, 3.2, 8); t.translate(0, 1.6, 0);
    const p = [[t, '#cbc2ae']];
    const bolas = [[0, 4.3, 0, 1.45, '#2f6f33'], [1.0, 3.9, 0.3, 1.0, '#3c8239'], [-0.9, 3.95, -0.4, 1.05, '#357a36'], [0.2, 3.8, -1.0, 0.95, '#3c8239'], [-0.3, 3.85, 1.0, 0.95, '#2f6f33']];
    for (const [x, y, z, r, c] of bolas) { const b = new THREE.SphereGeometry(r, 10, 7); b.translate(x, y, z); p.push([b, c]); }
    return unir(p);
  }
  function geoSaco() { // saco de arpillera con semillas asomando
    const cuerpo = new THREE.SphereGeometry(0.55, 14, 10); cuerpo.scale(1, 1.1, 1); cuerpo.translate(0, 0.58, 0);
    const cuello = new THREE.CylinderGeometry(0.2, 0.32, 0.32, 12); cuello.translate(0, 1.2, 0);
    const lazo = new THREE.TorusGeometry(0.21, 0.05, 6, 14); lazo.rotateX(Math.PI / 2); lazo.translate(0, 1.16, 0);
    const boca = new THREE.CylinderGeometry(0.3, 0.2, 0.14, 12); boca.translate(0, 1.42, 0);
    const p = [[cuerpo, '#b48c58'], [cuello, '#a27c4a'], [lazo, '#6b3f1e'], [boca, '#b48c58']];
    for (const [x, z] of [[0.08, 0.05], [-0.1, 0.02], [0.01, -0.1]]) { const s = new THREE.SphereGeometry(0.09, 8, 6); s.scale(0.86, 1.1, 0.86); s.translate(x, 1.5, z); p.push([s, '#93602e']); }
    return unir(p);
  }

  // ---------- Mallas (se crean al jugar y se sueltan al salir) ----------
  let M = null;
  const dummy = new THREE.Object3D(), ARRIBA = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3();
  function crearMallas() {
    if (M) return;
    const lam = o => R.linMat(new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)));
    const inst = (geo, mat, n, nombre) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.userData.sinCulling = true; m.name = 'sembradora:' + nombre; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(m); return m; };
    M = {};
    M.parches = inst(geoParche(), lam({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), NP, 'parches');
    M.semillas = inst(geoSemilla(), lam({ emissive: '#2a1808', emissiveIntensity: 0.5 }), NV, 'semillas');
    M.palma = inst(geoPalma(), lam(), NA, 'palmas');
    M.tabonuco = inst(geoTabonuco(), lam(), NA, 'tabonucos');
    M.diana = new THREE.Mesh(geoDiana(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    M.diana.renderOrder = 2; M.diana.name = 'sembradora:diana';
    const ga = new THREE.BufferGeometry(); ga.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NARCO * 3), 3).setUsage(THREE.DynamicDrawUsage));
    M.arco = new THREE.Line(ga, new THREE.LineBasicMaterial({ color: '#fff8e6', transparent: true, opacity: 0.6, depthWrite: false }));
    M.arco.name = 'sembradora:arco'; M.arco.renderOrder = 2;
    M.saco = new THREE.Mesh(geoSaco(), lam({ emissive: '#ffd23f', emissiveIntensity: 0 }));
    M.saco.name = 'sembradora:saco'; M.saco.scale.setScalar(1.6);
    for (const k of ['diana', 'arco', 'saco']) { const m = M[k]; m.visible = false; m.frustumCulled = false; m.castShadow = false; R.scene.add(m); }
  }
  function soltarMallas() {
    if (!M) return;
    for (const k in M) { const m = M[k]; R.scene.remove(m); if (m.isInstancedMesh) m.dispose(); m.geometry.dispose(); m.material.dispose(); } // InstancedMesh.dispose(): sus búferes de la GPU
    M = null;
  }
  function inclinar(nx, ny, nz) { nrm.set(nx, ny, nz); dummy.quaternion.setFromUnitVectors(ARRIBA, nrm); }
  function normal(x, z, o) { // normal del suelo (diferencias finitas), sin crear objetos
    const e = 0.8, dx = H(x + e, z) - H(x - e, z), dz = H(x, z + e) - H(x, z - e), l = Math.hypot(dx, 2 * e, dz) || 1;
    o.nx = -dx / l; o.ny = 2 * e / l; o.nz = -dz / l; return o;
  }
  const nTmp = { nx: 0, ny: 1, nz: 0 };
  const crecer = t => { if (reducido() || t >= 1) return 1; const k = Math.max(0, t), c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }; // brota con un pequeño rebote
  function pintar() {
    if (!M) return;
    const juego = E.fase === 'juego', ver = E.fase !== 'nada';
    let n = 0;
    if (juego) for (const p of parches) {
      if (!p.on) continue;
      dummy.position.set(p.x, p.y + 0.05, p.z); inclinar(p.nx, p.ny, p.nz); dummy.scale.set(p.r, 1, p.r); dummy.updateMatrix();
      M.parches.setMatrixAt(n++, dummy.matrix);
    }
    M.parches.count = n; M.parches.visible = n > 0; M.parches.instanceMatrix.needsUpdate = true;
    let np = 0, nt = 0;
    if (ver) for (const a of arboles) {
      if (!a.on) continue;
      const k = a.tam * crecer(a.t);
      dummy.position.set(a.x, a.y - 0.05, a.z); dummy.rotation.set(0, a.yaw, 0); dummy.scale.setScalar(Math.max(0.001, k)); dummy.updateMatrix();
      if (a.esp === 0) M.palma.setMatrixAt(np++, dummy.matrix); else M.tabonuco.setMatrixAt(nt++, dummy.matrix);
    }
    M.palma.count = np; M.palma.visible = np > 0; M.palma.instanceMatrix.needsUpdate = true;
    M.tabonuco.count = nt; M.tabonuco.visible = nt > 0; M.tabonuco.instanceMatrix.needsUpdate = true;
    let ns = 0;
    if (juego) for (const s of vuelo) {
      if (!s.on) continue;
      if (s.rebote > 0) { // fuera: rebota una vez y se va
        const k = 1 - s.rebote / 0.7; dummy.position.set(s.lx + s.hx * 0.15 * k, s.ly + 0.2 + Math.sin(k * Math.PI) * 0.7, s.lz + s.hz * 0.15 * k); dummy.scale.setScalar(1.6 * (1 - k * 0.8));
      } else { const t = Math.min(s.t, s.T); dummy.position.set(s.x0 + s.hx * t, s.y0 - 0.5 * GRAV * t * t, s.z0 + s.hz * t); dummy.scale.setScalar(1.6); }
      dummy.rotation.set(s.giro * 0.7, s.giro, 0); dummy.updateMatrix();
      M.semillas.setMatrixAt(ns++, dummy.matrix);
    }
    M.semillas.count = ns; M.semillas.visible = ns > 0; M.semillas.instanceMatrix.needsUpdate = true;
    // diana y arco: dónde caería una semilla soltada ahora mismo
    const apunta = juego && E.semillas > 0 && P.alto >= ALTO_MIN;
    M.diana.visible = apunta; M.arco.visible = apunta;
    if (apunta) {
      normal(P.lx, P.lz, nTmp);
      dummy.position.set(P.lx, P.ly + 0.09, P.lz); inclinar(nTmp.nx, nTmp.ny, nTmp.nz); dummy.scale.setScalar(0.95); dummy.updateMatrix();
      M.diana.matrix.copy(dummy.matrix); M.diana.matrixAutoUpdate = false; M.diana.matrixWorldNeedsUpdate = true;
      M.diana.material.color.setHex(P.zona === 2 ? 0xffd23f : P.zona === 1 ? 0x9df07a : 0xffffff);
      const a = M.arco.geometry.attributes.position, arr = a.array;
      for (let i = 0; i < NARCO; i++) { const t = P.T * i / (NARCO - 1); arr[i * 3] = P.x0 + P.hx * t; arr[i * 3 + 1] = Math.max(P.ly + 0.1, P.y0 - 0.5 * GRAV * t * t); arr[i * 3 + 2] = P.z0 + P.hz * t; }
      a.needsUpdate = true;
    }
    M.saco.visible = juego;
    if (juego) { M.saco.position.set(saco.x, saco.y, saco.z); M.saco.material.emissiveIntensity = E.semillas === 0 ? (reducido() ? 0.35 : 0.25 + 0.2 * Math.sin(E.t * 5)) : 0; }
  }

  // ---------- Predicción balística (posición + velocidad de Vittata + viento) ----------
  function predecir(o) {
    const m = MV(), x0 = S.pos.x, y0 = S.pos.y + 0.3, z0 = S.pos.z;
    const hx = (m.vx || 0) * K_H + E.vientoX, hz = (m.vz || 0) * K_H + E.vientoZ;
    let T = Math.sqrt(2 * Math.max(0.01, y0 - superficie(x0, z0)) / GRAV), lx = x0, lz = z0, g = 0;
    for (let i = 0; i < 4; i++) { lx = x0 + hx * T; lz = z0 + hz * T; g = superficie(lx, lz); T = Math.sqrt(2 * Math.max(0.01, y0 - g) / GRAV); }
    o.x0 = x0; o.y0 = y0; o.z0 = z0; o.hx = hx; o.hz = hz; o.T = T; o.lx = x0 + hx * T; o.lz = z0 + hz * T; o.ly = y0 - 0.5 * GRAV * T * T;
    o.alto = y0 - 0.3 - superficie(x0, z0); o.zona = zonaEn(o.lx, o.lz).zona;
    return o;
  }
  const zTmp = { p: null, zona: 0 };
  function zonaEn(x, z) { // 2 centro · 1 borde · 0 fuera
    zTmp.p = null; zTmp.zona = 0; let bd = Infinity;
    for (const p of parches) { if (!p.on) continue; const d = Math.hypot(x - p.x, z - p.z); if (d < p.r && d < bd) { bd = d; zTmp.p = p; zTmp.zona = d < p.r * CENTRO ? 2 : 1; } }
    return zTmp;
  }

  // ---------- Claro: sitio libre para los parches (sin agua, sin copas ni edificios encima) ----------
  function renovarCerca() {
    nCerca = 0;
    const cs = G.fisica && G.fisica.colliders; if (!cs) return;
    for (let i = 0; i < cs.length && nCerca < NC; i++) {
      const c = cs[i], dx = c.x - saco.x, dz = c.z - saco.z; if (dx * dx + dz * dz > 70 * 70) continue;
      const e = cerca[nCerca++]; e.x = c.x; e.z = c.z;
      e.r = c.kind === 'tree' || c.kind === 'arbol' ? Math.max(1.2, Math.min(4.5, c.r * 4)) : (c.hx ? Math.hypot(c.hx, c.hz) : c.r) + 0.5;
    }
  }
  function libreEn(x, z, r) {
    for (let i = 0; i < nCerca; i++) { const c = cerca[i]; if (Math.hypot(x - c.x, z - c.z) < c.r + r + 0.6) return false; }
    for (const p of parches) if (p.on && Math.hypot(x - p.x, z - p.z) < p.r + r + 4) return false;
    for (const a of arboles) if (a.on && Math.hypot(x - a.x, z - a.z) < r + 1.6) return false;
    if (Math.hypot(x - saco.x, z - saco.z) < r + 4) return false;
    return true;
  }
  function nuevoParche(p) {
    const et = etapa(), r = RADIO[et];
    let bx = 0, bz = 0, bs = -1, ok = false;
    for (let k = 0; k < 16; k++) {
      const a = rnd(0, Math.PI * 2), d = rnd(12, 38), x = saco.x + Math.cos(a) * d, z = saco.z + Math.sin(a) * d, g = H(x, z);
      if (nivelAgua(x, z) > g - 0.05 || Math.abs(g - saco.y) > 22 || !libreEn(x, z, r)) continue;
      normal(x, z, nTmp); if (nTmp.ny < 0.8) continue; // nada de barrancos (~37°)
      const s = et === 2 ? 1 - nTmp.ny : 1; // al final, mejor en ladera si la hay
      if (s > bs) { bs = s; bx = x; bz = z; ok = true; }
      if (et < 2) break;
    }
    if (!ok) { const a = rnd(0, Math.PI * 2), d = rnd(12, 30); bx = saco.x + Math.cos(a) * d; bz = saco.z + Math.sin(a) * d; } // sin sitio ideal: uno cualquiera cerca
    normal(bx, bz, nTmp);
    p.on = true; p.x = bx; p.z = bz; p.y = H(bx, bz); p.nx = nTmp.nx; p.ny = nTmp.ny; p.nz = nTmp.nz; p.r = p.r0 = r; p.t = 0;
    p.seco = et === 2 && azar() < 0.5;
    return p;
  }
  function ponerParche(i, x, z, r, seco) { // solo para la prueba
    const p = parches[i]; normal(x, z, nTmp);
    p.on = true; p.x = x; p.z = z; p.y = H(x, z); p.nx = nTmp.nx; p.ny = nTmp.ny; p.nz = nTmp.nz; p.r = p.r0 = r; p.t = 0; p.seco = !!seco; return p;
  }

  // ---------- Soltar, caer y brotar ----------
  function soltar() {
    if (E.fase !== 'juego') return false;
    if (E.t - E.ultSoltar < ESPERA) return false;
    if (E.semillas <= 0) { // aviso importante: también suena (no a cada toque)
      if (E.t - E.sinT > 1.5) { E.sinT = E.t; sonar('aviso'); aviso(L('Sin semillas: vuelve al saco', 'Out of seeds: back to the sack'), 'malo'); }
      return false;
    }
    predecir(P);
    if (P.alto < ALTO_MIN) { if (E.t - E.sinT > 1.2) { E.sinT = E.t; aviso(L('Vuela más alto para soltar', 'Fly higher to drop'), 'malo'); } return false; }
    let s = null; for (const v of vuelo) if (!v.on) { s = v; break; }
    if (!s) return false;
    const m = MV();
    s.on = true; s.x0 = P.x0; s.y0 = P.y0; s.z0 = P.z0; s.hx = P.hx; s.hz = P.hz; s.T = P.T; s.t = 0; s.lx = P.lx; s.ly = P.ly; s.lz = P.lz; s.rebote = 0; s.giro = rnd(0, 6.28);
    s.vel = Math.hypot(m.vx || 0, m.vz || 0);
    E.semillas--; E.ultSoltar = E.t;
    sonar('lanzar');
    if (E.semillas === 0) { E.sinT = E.t; aviso(L('Sin semillas: vuelve al saco', 'Out of seeds: back to the sack'), 'malo'); sonar('aviso'); }
    pintarHud();
    return true;
  }
  function plantar(x, y, z, tam) {
    let a = null, viejo = null;
    for (const b of arboles) { if (!b.on) { a = b; break; } if (!viejo || b.t > viejo.t) viejo = b; }
    a = a || viejo;
    a.on = true; a.x = x; a.y = y; a.z = z; a.tam = tam; a.t = 0; a.yaw = rnd(0, 6.28); a.esp = azar() < 0.5 ? 0 : 1;
    return a;
  }
  function aterrizar(s) {
    const z = zonaEn(s.lx, s.lz), p = z.p;
    if (!p) { // fuera: rebota y se pierde; solo se va la racha
      s.rebote = 0.7; E.racha = 0; E.fallos++;
      sonar('frenada'); aviso(L('Rebotó fuera', 'Bounced away'), 'malo');
      pintarHud(); return;
    }
    s.on = false;
    const centro = z.zona === 2, rapida = s.vel > VEL_BONO;
    E.racha++; if (E.racha > E.mejorRacha) E.mejorRacha = E.racha;
    const mu = mult(E.racha), pts = ((centro ? 3 : 1) + (rapida ? 1 : 0)) * mu;
    E.puntos += pts; E.arboles++; if (centro) E.centros++; if (rapida) E.rapidas++;
    const tam = TAM[Math.min(2, (centro ? 0 : 1) + (p.seco && p.r < p.r0 * 0.75 ? 1 : 0))];
    plantar(s.lx, H(s.lx, s.lz), s.lz, tam);
    hojas(s.lx, s.ly + 1.2, s.lz, centro ? 18 : 10);
    sonar('semilla', Math.min(12, E.racha)); if (centro) sonar('encaje');
    p.on = false; nuevoParche(p);
    if (mu > 1 && (E.racha === 3 || E.racha === 6)) { aviso(L(`¡Racha ×${mu}!`, `Streak ×${mu}!`) + ' +' + pts, 'oro'); sonar('ring', mu); }
    else aviso((centro ? L('¡En el centro!', 'Bullseye!') : L('¡Brotó!', 'It sprouted!')) + ' +' + pts, centro ? 'oro' : 'bien');
    pintarHud();
  }

  // ---------- Paso ----------
  function paso(dt) {
    if (!(dt > 0)) return;
    if (E.fase === 'vista') { E.vistaT -= dt; for (const a of arboles) if (a.on) a.t += dt; pintar(); if (E.vistaT <= 0) mostrarFin(); return; }
    if (E.fase !== 'juego') return;
    E.t += dt;
    if (E.msgT > 0 && (E.msgT -= dt) <= 0 && hudEl) { const m = q(hudEl, 'msg'); m.textContent = ''; m.className = ''; }
    // viento lateral desde los 30 s: gira despacio; la sombra lo incluye
    if (etapa() >= 1) {
      if (!E.vientoOn) {
        E.vientoOn = true; E.vientoA = rnd(0, Math.PI * 2); sonar('aviso'); aviso(L('¡Viento! La sombra se mueve con él', 'Wind! The shadow drifts with it'), 'malo'); E.msgT = 2.4;
        hojas(S.pos.x + Math.cos(E.vientoA) * 3, S.pos.y + 1.5, S.pos.z + Math.sin(E.vientoA) * 3, 16);
      }
      E.vientoA += dt * 0.12; E.vientoX = Math.cos(E.vientoA) * VIENTO; E.vientoZ = Math.sin(E.vientoA) * VIENTO;
    } else { E.vientoX = 0; E.vientoZ = 0; }
    // parches que se secan
    for (const p of parches) {
      if (!p.on) continue;
      p.t += dt;
      if (p.seco) { p.r = p.r0 * Math.max(0, 1 - p.t / SECO_T); if (p.r < 0.45) { p.on = false; nuevoParche(p); } }
    }
    // semillas en el aire: siguen exactamente el arco que se dibujó al soltar
    for (const s of vuelo) {
      if (!s.on) continue;
      s.giro += dt * 3;
      if (s.rebote > 0) { if ((s.rebote -= dt) <= 0) s.on = false; continue; }
      s.t += dt; if (s.t >= s.T) aterrizar(s);
    }
    for (const a of arboles) if (a.on) a.t += dt;
    // el saco recarga
    const dS = Math.hypot(S.pos.x - saco.x, S.pos.z - saco.z);
    if (E.semillas < LLEVA && dS < SACO_R && S.pos.y - saco.y < 8) { E.semillas = LLEVA; sonar('pieza'); aviso(L('¡Semillas listas!', 'Seeds ready!'), 'bien'); pintarHud(); }
    // guía: el saco sin semillas; si no, el parche más cercano
    apuntarGuia();
    const r = restante();
    if (E.avisos === 0 && r <= 10) { E.avisos = 1; sonar('aviso'); }
    if (E.avisos === 1 && r <= 5) { E.avisos = 2; sonar('aviso'); }
    predecir(P);
    pintar();
    if (r <= 0) { fin(); return; }
    if (hudEl && Math.floor((E.t - dt) * 4) !== Math.floor(E.t * 4)) pintarHud();
  }
  function enVuelo() { for (const s of vuelo) if (s.on && !s.rebote) return true; return false; }
  function apuntarGuia() {
    guia.ok = false;
    if (E.fase !== 'juego') return;
    if (E.semillas === 0 && !enVuelo()) { guia.x = saco.x; guia.z = saco.z; guia.y = saco.y + 3; guia.ok = true; return; }
    let bd = Infinity;
    for (const p of parches) { if (!p.on) continue; const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (d < bd) { bd = d; guia.x = p.x; guia.z = p.z; guia.y = p.y + 3; guia.ok = true; } }
  }
  G.on('update', (dt, busy) => { if (!G.quiet && !busy) paso(Math.min(0.05, dt || 0)); });
  const guiar = () => { verHud(); if (E.fase === 'juego' && guia.ok && G.fx && G.fx.guide) G.fx.guide(guia, performance.now() / 1000); };
  G.on('render', guiar, 61); // después de misiones.js (60): la flecha va al parche (o al saco)
  G.on('pausa', () => verHud()); // al terminar la carga sale el HUD

  // ---------- Acción = «Soltar» (G.interaccion.modo, como el rescate y la foto) ----------
  const MODO = { activo: () => E.fase === 'juego', accion: () => soltar(), aviso: () => '', get verbo() { return L('Soltar', 'Drop'); } };
  let modo0 = null;

  // ---------- Cámara: al final sube para enseñar el claro (solo el ajuste de distancia de siempre) ----------
  let cam0 = null, camN = 0;
  const CAM_D = [0, 6], CAM_F = [0, 9];
  function camara(nivel) {
    const C = G.camara && G.camara.CAM; if (!C || nivel === camN) return;
    if (!cam0) cam0 = { dist: C.dist, distFly: C.distFly };
    if (C.dist === cam0.dist + CAM_D[camN]) C.dist = cam0.dist + CAM_D[nivel]; // si otro módulo la cambió mientras tanto, no se pisa
    if (C.distFly === cam0.distFly + CAM_F[camN]) C.distFly = cam0.distFly + CAM_F[nivel];
    camN = nivel; if (!nivel) cam0 = null;
  }

  // ---------- HUD y panel final ----------
  let hudEl = null, finEl = null;
  const ARBOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 13h2v9h-2z" fill="#8b6a46"/><circle cx="12" cy="9" r="6.5" fill="#3c8a3a"/><circle cx="9" cy="7.5" r="2.4" fill="#5fae4a"/></svg>';
  function css() {
    if (document.getElementById('sdc-css')) return;
    const st = document.createElement('style'); st.id = 'sdc-css';
    st.textContent = '#sdc-hud{position:fixed;left:12px;right:12px;margin-inline:auto;width:fit-content;max-width:calc(100vw - 24px);top:calc(env(safe-area-inset-top,0px) + 10px);z-index:60;display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;justify-content:center;box-sizing:border-box;padding:6px 8px 6px 14px;border-radius:20px;background:rgba(16,36,28,.86);color:#fff8e6;font:600 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}#sdc-hud[hidden],#sdc-fin[hidden]{display:none}' +
      '#sdc-hud .sdc-tit:empty{display:none}#sdc-hud .sdc-t{font-variant-numeric:tabular-nums;font-size:18px;font-weight:700;min-width:3.2ch;text-align:center}#sdc-hud .sdc-t.poco{color:#ffb4a2}#sdc-hud .sdc-a{display:flex;align-items:center;gap:3px;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}#sdc-hud .sdc-a svg{width:22px;height:22px}' +
      '#sdc-hud .sdc-s{display:flex;gap:3px;align-items:center}#sdc-hud .sdc-s i{width:10px;height:13px;border-radius:50%;background:rgba(255,248,230,.22);box-shadow:inset 0 0 0 1.5px rgba(255,248,230,.45)}#sdc-hud .sdc-s i.on{background:#c98a45;box-shadow:inset 0 -3px 0 #6e4520}#sdc-hud .sdc-s.vacio i{box-shadow:inset 0 0 0 1.5px #ffb4a2}' +
      '#sdc-hud .sdc-x{font-size:15px;font-weight:700;color:#ffd23f}#sdc-hud .sdc-x:empty,#sdc-hud .sdc-r:empty{display:none}#sdc-hud .sdc-r{opacity:.85;font-size:14px}' +
      '#sdc-hud [data-k="msg"]{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;max-width:calc(100vw - 24px);overflow:hidden;text-overflow:ellipsis;padding:4px 12px;border-radius:999px;font-weight:700;pointer-events:none;background:#fff3d6;color:#3b2a14}#sdc-hud [data-k="msg"]:empty{display:none}#sdc-hud [data-k="msg"].oro{background:#ffd23f}#sdc-hud [data-k="msg"].malo{background:#ffd0c4;color:#5a1e10}#sdc-hud [data-k="msg"].bien{background:#c8f0c0;color:#173d12}' +
      '#sdc-hud button,#sdc-fin button{min-height:44px;min-width:44px;padding:4px 16px;border-radius:22px;border:0;font:700 16px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}#sdc-fin button{min-height:54px;padding:4px 22px;font-size:18px}#sdc-hud button.salir,#sdc-fin button.salir{background:#ffd0c4}#sdc-hud button:focus-visible,#sdc-fin button:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}' +
      '#sdc-fin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border-radius:24px;background:rgba(16,36,28,.93);color:#fff8e6;font-family:Fredoka,system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;gap:8px}#sdc-fin:focus{outline:none}' +
      '#sdc-fin h2{margin:0;font-size:26px}#sdc-fin .sdc-gran{display:flex;align-items:center;gap:8px;font-size:44px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}#sdc-fin .sdc-gran svg{width:44px;height:44px}#sdc-fin p{margin:0;font-size:17px;font-weight:600}#sdc-fin .sdc-det{font-size:15px;opacity:.85;font-weight:500}' +
      '#sdc-fin .sdc-dato{font-size:14px;font-weight:500;line-height:1.3;padding:6px 10px;border-radius:12px;background:rgba(255,248,230,.1)}#sdc-fin .sdc-dato:empty{display:none}#sdc-fin .sdc-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}' +
      '@media (orientation:landscape) and (max-height:500px){#sdc-fin{padding:12px 16px;gap:4px}#sdc-fin h2{font-size:21px}#sdc-fin .sdc-gran{font-size:34px}#sdc-fin .sdc-gran svg{width:34px;height:34px}#sdc-fin .sdc-dato{font-size:13px;padding:4px 8px}}' +
      // la historia no se mezcla con el minijuego (sus avisos esperan: G.menuModos.ocupado() cuenta este juego como actividad en marcha)
      'body.sembradora-on :is(#quest,#inv,#inv-cuenta,#inv-reporte,#modo-salir,#toast,#prompt,#bocadillos,#juice-chip,#juice-pop,#truco-chip,#fx-descubre,#v18-exp-poder,#v18-extra,#b-construir,#b-nido,#marcador,#retos,#pista-vuela){visibility:hidden!important}' +
      // con la vista final y el panel, tampoco las pistas de vuelo ni el minimapa: solo el claro y el resultado
      'body.sembradora-fin :is(#minimapa,#guia-hud,#keyhint,#acts,#stick,#emotes,#tag,#sys){visibility:hidden!important}' +
      // el botón Acción lleva el icono de una semilla mientras dice «Soltar»
      'body.sembradora-on #b-act{--icon:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cellipse cx=%2712%27 cy=%2714%27 rx=%275.5%27 ry=%277%27/%3E%3Cpath d=%27M12 7V3M12 3c-2 0-3.5 1-4 2.5M12 3c2 0 3.5 1 4 2.5%27 stroke=%27black%27 stroke-width=%271.6%27 fill=%27none%27/%3E%3C/svg%3E")}';
    document.head.appendChild(st);
  }
  function montar() {
    if (hudEl) return;
    css();
    hudEl = document.createElement('div'); hudEl.id = 'sdc-hud'; hudEl.hidden = true; hudEl.setAttribute('role', 'status');
    hudEl.innerHTML = '<b class="sdc-tit" data-k="tit"></b><span class="sdc-t" data-k="r"></span><span class="sdc-a" data-k="aw">' + ARBOL + '<span data-k="a"></span></span><span class="sdc-s" data-k="s">' + '<i></i>'.repeat(LLEVA) + '</span><span class="sdc-x" data-k="x"></span><span class="sdc-r" data-k="rec"></span><span data-k="msg" aria-live="polite"></span><button type="button" class="salir" data-a="salir"></button>';
    finEl = document.createElement('div'); finEl.id = 'sdc-fin'; finEl.hidden = true; finEl.tabIndex = -1; finEl.setAttribute('role', 'dialog'); finEl.setAttribute('aria-modal', 'true'); finEl.setAttribute('aria-labelledby', 'sdc-fin-t');
    finEl.innerHTML = '<h2 id="sdc-fin-t" data-k="ft"></h2><div class="sdc-gran">' + ARBOL + '<span data-k="fn"></span></div><p data-k="fmsg" aria-live="polite"></p><p class="sdc-det" data-k="fdet"></p><p class="sdc-dato" data-k="fdato"></p><div class="sdc-bots"><button type="button" data-a="otra"></button><button type="button" class="salir" data-a="salir"></button></div>';
    const clic = e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; e.preventDefault(); if (b.dataset.a === 'otra') jugar(); else salir(); };
    hudEl.addEventListener('click', clic); finEl.addEventListener('click', clic);
    document.body.appendChild(hudEl); document.body.appendChild(finEl);
  }
  const q = (el, k) => el.querySelector('[data-k="' + k + '"]');
  const ancho = () => innerWidth >= 700 && innerHeight >= 500;
  function pintarHud() {
    if (!hudEl) return;
    q(hudEl, 'tit').textContent = ancho() ? L('Sembradora del cielo', 'Sky Planter') : ''; // en el teléfono el título sobra: una sola franja
    const r = q(hudEl, 'r'); r.textContent = reloj(restante()); r.classList.toggle('poco', restante() <= 10);
    q(hudEl, 'a').textContent = String(E.arboles); q(hudEl, 'aw').setAttribute('aria-label', L('Árboles: ', 'Trees: ') + E.arboles);
    const s = q(hudEl, 's'), is = s.querySelectorAll('i');
    for (let i = 0; i < is.length; i++) is[i].classList.toggle('on', i < E.semillas);
    s.classList.toggle('vacio', E.semillas === 0); s.setAttribute('aria-label', L('Semillas: ', 'Seeds: ') + E.semillas);
    q(hudEl, 'x').textContent = E.racha >= 3 ? '×' + mult(E.racha) : '';
    q(hudEl, 'rec').textContent = E.mejor && ancho() ? L('Récord ', 'Best ') + E.mejor : '';
    hudEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }
  function aviso(txt, cls) { if (!hudEl) return; const m = q(hudEl, 'msg'); m.textContent = txt; m.className = cls || ''; E.msgT = 1.6; }
  function pintarFin() {
    if (!finEl) return;
    const n = E.puntos, a = E.arboles;
    q(finEl, 'ft').textContent = L('¡Tiempo!', 'Time’s up!');
    q(finEl, 'fn').textContent = String(a);
    q(finEl, 'fmsg').textContent = E.nuevo ? L(`¡Nuevo récord: ${n} puntos!`, `New record: ${n} points!`)
      : n > 0 ? L(`Hiciste ${n} puntos. Récord: ${E.mejor}`, `You scored ${n} points. Best: ${E.mejor}`) : L('¡Casi! Suelta la semilla cuando la sombra pise la tierra oscura', 'So close! Drop the seed when the shadow is on the dark soil');
    q(finEl, 'fdet').textContent = (a === 1 ? L('Sembraste 1 árbol', 'You planted 1 tree') : L(`Sembraste ${a} árboles`, `You planted ${a} trees`)) + L(` · Mejor racha: ${E.mejorRacha}`, ` · Best streak: ${E.mejorRacha}`);
    q(finEl, 'fdato').textContent = E.datoAhora ? L('Dato real: la cotorra puertorriqueña se alimenta sobre todo de frutos silvestres, en especial de la palma de sierra (USFWS).', 'Real fact: the Puerto Rican parrot feeds mostly on wild fruits, especially from the sierra palm (USFWS).') : '';
    finEl.querySelector('[data-a="otra"]').textContent = L('Otra vez', 'Play again');
    finEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }

  // ---------- Partida ----------
  function jugar(o) {
    o = o || {};
    azarS = o.semilla || 0;
    montar(); crearMallas();
    for (const p of parches) p.on = false; for (const a of arboles) a.on = false; for (const s of vuelo) s.on = false;
    const rec = leerRec(), ent = v => (Number.isInteger(v) && v >= 0 ? v : 0);
    Object.assign(E, { fase: 'juego', t: 0, puntos: 0, arboles: 0, semillas: LLEVA, racha: 0, mejorRacha: 0, centros: 0, rapidas: 0, fallos: 0, ultSoltar: -9, sinT: -9,
      vientoX: 0, vientoZ: 0, vientoA: 0, vientoOn: false, msgT: 0, avisos: 0, vistaT: 0, finP: 0, nuevo: false, datoAhora: false,
      mejor: rec ? rec.mejor : 0, mejorArb: rec ? ent(rec.arboles) : 0, mejorRachaRec: rec ? ent(rec.racha) : 0, jugadas: rec ? ent(rec.jugadas) : 0, datoVisto: !!(rec && rec.dato) });
    camara(0);
    try { if (G.pausa && G.pausa.set) G.pausa.set('sembradora', false); } catch (e) { /* sin pausa */ }
    if (G.interaccion && G.interaccion.modo !== MODO) { modo0 = G.interaccion.modo; G.interaccion.modo = MODO; }
    // el saco, junto a Vittata (la salida); los parches, en el claro alrededor
    const f = S.facing || { x: 0, z: 1 }, sx = S.pos.x - f.z * 2.5, sz = S.pos.z + f.x * 2.5;
    saco.x = sx; saco.z = sz; saco.y = superficie(sx, sz);
    renovarCerca();
    for (const p of parches) nuevoParche(p);
    finEl.hidden = true; q(hudEl, 'msg').textContent = '';
    document.body.classList.add('sembradora-on'); document.body.classList.remove('sembradora-fin');
    apuntarGuia(); predecir(P); pintarHud(); pintar(); verHud();
    aviso(L('Suelta cada semilla cuando la sombra pise la tierra oscura', 'Drop each seed when the shadow is on the dark soil'), 'bien'); E.msgT = 4;
    sonar('boton');
    return true;
  }
  let logroId = 0;
  function fin() { // el reloj llega a 0: la cámara sube y enseña el claro; luego el panel
    if (E.fase !== 'juego') return;
    for (const p of parches) p.on = false; for (const s of vuelo) s.on = false;
    E.fase = 'vista'; E.vistaT = reducido() ? 0 : VISTA_T; guia.ok = false;
    hudEl.hidden = true; q(hudEl, 'msg').textContent = ''; document.body.classList.add('sembradora-fin');
    if (!reducido()) camara(1);
    sonar('panel_final');
    pintar();
    if (E.vistaT <= 0) mostrarFin();
  }
  function mostrarFin() {
    if (E.fase !== 'vista') return;
    E.fase = 'fin'; E.finP = performance.now() / 1000;
    E.jugadas++;
    E.nuevo = E.puntos > E.mejor; if (E.nuevo) E.mejor = E.puntos;
    if (E.arboles > E.mejorArb) E.mejorArb = E.arboles;
    if (E.mejorRacha > E.mejorRachaRec) E.mejorRachaRec = E.mejorRacha;
    E.datoAhora = !E.datoVisto; E.datoVisto = true; // el dato real, una sola vez
    guardarRec();
    try { G.emit('record', { modo: 'sembradora', puntos: E.puntos, arboles: E.arboles, racha: E.mejorRacha }); } catch (e) { /* */ }
    if (E.nuevo && E.puntos > 0) logroId = setTimeout(() => { logroId = 0; if (E.fase === 'fin') sonar('logro'); }, 500);
    pintar(); pintarHud(); pintarFin(); finEl.hidden = false;
    try { if (G.pausa && G.pausa.set) G.pausa.set('sembradora', true); } catch (e) { /* sin pausa */ } // panel modal: el mundo se congela detrás
    // el foco va al panel (no a «Otra vez»): un toque de los últimos segundos no arranca otra partida sin ver el resultado
    setTimeout(() => { try { if (E.fase === 'fin') finEl.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
  }
  const activo = () => E.fase !== 'nada';
  // Durante la pantalla de carga (pausa 'carga') el HUD no sale encima: aparece cuando el mundo ya se ve
  const cargando = () => { try { return !!(G.pausa && G.pausa.motivos && G.pausa.motivos.has('carga')); } catch (e) { return false; } };
  // tampoco durante la apertura del capítulo («Saltar intro» a la vista, ui.css T23)
  function verHud() { if (hudEl) { const v = E.fase === 'juego' && !cargando() && !document.getElementById('c1-saltar'); if (hudEl.hidden === v) hudEl.hidden = !v; } }
  function salir() {
    if (!activo()) return false;
    E.fase = 'nada'; guia.ok = false;
    for (const p of parches) p.on = false; for (const a of arboles) a.on = false; for (const s of vuelo) s.on = false; nCerca = 0; // los árboles del minijuego se van
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    if (G.interaccion && G.interaccion.modo === MODO) G.interaccion.modo = modo0; modo0 = null;
    camara(0); soltarMallas();
    if (hudEl) { hudEl.hidden = true; finEl.hidden = true; [hudEl, finEl].forEach(el => el.querySelectorAll('[data-k]').forEach(x => { if (x.dataset.k !== 's' && x.dataset.k !== 'aw') x.textContent = ''; })); [hudEl, finEl].forEach(el => el.querySelectorAll('button').forEach(b => { b.textContent = ''; })); q(hudEl, 'a').textContent = ''; } // sin texto viejo (ni en otro idioma)
    document.body.classList.remove('sembradora-on', 'sembradora-fin');
    try { if (G.pausa && G.pausa.set) G.pausa.set('sembradora', false); } catch (e) { /* sin pausa */ }
    return true;
  }
  addEventListener('keydown', e => {
    if (!activo()) return;
    if (e.key === 'Escape') {
      if (e.repeat || (G.ui && G.ui.cardOpen)) return; // una tarjeta abierta encima se cierra primero
      e.preventDefault(); e.stopImmediatePropagation(); salir(); return;
    }
    if (E.fase === 'vista' || E.fase === 'fin') { // vista final y panel modales: las teclas del mundo (P, M, 1-7, vuelo…) no pasan; Tab, Enter y Espacio van a sus botones (no en el primer segundo)
      if (e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
      const boton = E.fase === 'fin' && (e.key === 'Enter' || e.key === ' ') && performance.now() / 1000 - E.finP > 1 && e.target && e.target.closest && e.target.closest('#sdc-fin button');
      e.stopImmediatePropagation(); if (!boton) e.preventDefault();
    }
  }, true);
  addEventListener('resize', () => { if (activo()) pintarHud(); });

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })(), pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const m = MV(), mv0 = { vx: m.vx, vz: m.vz };
    const C = G.camara && G.camara.CAM, camD0 = C ? [C.dist, C.distFly] : null;
    const tecla = k => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); dispatchEvent(ev); dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); return ev; };
    const vis = id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0; };
    // Vittata a «alto» m sobre (x, z), con velocidad (vx, vz)
    const ir = (x, z, alto, vx, vz) => { S.pos.x = x; S.pos.z = z; S.pos.y = superficie(x, z) + alto; m.vx = vx || 0; m.vz = vz || 0; };
    const lejos = () => { S.pos.x = saco.x + 300; S.pos.z = saco.z + 300; S.pos.y = superficie(S.pos.x, S.pos.z) + 10; m.vx = m.vz = 0; };
    const caer = () => { const t0 = E.t; for (let i = 0; i < 200 && vuelo.some(s => s.on); i++) paso(0.05); E.t = t0; }; // el reloj de la partida no corre mientras cae
    const listo = () => { E.ultSoltar = -9; E.sinT = -9; };
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ }
      jugar({ semilla: 5, callado: true });
      const hb = hudEl.querySelector('[data-a="salir"]').getBoundingClientRect();
      check('Se abre con el HUD (reloj 1:30, 0 árboles, 5 semillas y «Salir» de ≥ 44 px), 4 parches y el saco', activo() && !hudEl.hidden && finEl.hidden && q(hudEl, 'r').textContent === '1:30' && q(hudEl, 'a').textContent === '0' && q(hudEl, 's').querySelectorAll('i.on').length === 5 && hb.height >= 44 && hb.width >= 44 && parches.every(p => p.on) && M.saco.visible && document.body.classList.contains('sembradora-on'),
        q(hudEl, 'r').textContent + ' · ' + Math.round(hb.height));
      check('4 mallas instanciadas como mucho (parches, semillas, palmas y tabonucos), todas del minijuego', R.scene.children.filter(o => o.isInstancedMesh && /^sembradora:/.test(o.name)).length === 4 && M.parches.visible && M.parches.count === 4, R.scene.children.filter(o => /^sembradora:/.test(o.name)).map(o => o.name).join(','));
      check('Los parches no caen en el agua ni bajo una copa', parches.every(p => nivelAgua(p.x, p.z) < p.y && (() => { for (let i = 0; i < nCerca; i++) { const c = cerca[i]; if (Math.hypot(p.x - c.x, p.z - c.z) < c.r) return false; } return true; })()));
      check('El botón Acción dice «Soltar» (con el icono de la semilla)', G.interaccion && G.interaccion.modo === MODO && MODO.verbo === 'Soltar' && (!G.input || !G.input.actBtn || /svg/.test(getComputedStyle(G.input.actBtn).getPropertyValue('--icon'))));
      { const hr = hudEl.getBoundingClientRect(); const tapa = ['b-act', 'stick', 'minimapa', 'b-menu', 'b-diary'].filter(id => { if (!vis(id)) return false; const r = document.getElementById(id).getBoundingClientRect(); return r.left < hr.right && r.right > hr.left && r.top < hr.bottom && r.bottom > hr.top; });
        check('El HUD cabe en una franja arriba y no tapa los botones del juego', hr.left >= 0 && hr.right <= innerWidth && hr.top >= 0 && hr.height <= 64 && !tapa.length, `${innerWidth}×${innerHeight} · HUD ${Math.round(hr.width)}×${Math.round(hr.height)}` + (tapa.length ? ' · tapa ' + tapa.join(',') : '')); }
      check('La historia no se mezcla: cuenta como actividad (los avisos esperan) y el letrero, el aviso y los bocadillos no se ven',
        (!G.menuModos || !G.menuModos.ocupado || G.menuModos.ocupado()) && ['toast', 'prompt', 'quest', 'inv-cuenta', 'bocadillos'].every(id => !vis(id)));
      apuntarGuia();
      check('La flecha y el minimapa apuntan a lo mismo (el parche más cercano)', guia.ok && (!G.fx || !G.fx.guide || (() => { const g0 = G.fx.guide; let visto = null; G.fx.guide = t => { visto = t; }; try { guiar(); } finally { G.fx.guide = g0; } return visto === guia; })()) &&
        (!G.minimapa || !G.minimapa.marcadores || G.minimapa.marcadores().some(k => k.tipo === 'obj' && k.x === guia.x && k.z === guia.z)), guia.x.toFixed(1) + ',' + guia.z.toFixed(1));
      if (G.pausa && G.pausa.set && G.pausa.motivos) {
        const yaCarga = G.pausa.motivos.has('carga');
        G.pausa.set('carga', true); verHud(); const tapado = hudEl.hidden;
        if (!yaCarga) G.pausa.set('carga', false); verHud();
        check('Con la pantalla de carga el HUD espera y luego sale', tapado && (yaCarga || !hudEl.hidden));
      }
      // Preparar un claro conocido: un parche grande en un sitio sin agua cerca del saco
      for (const p of parches) p.on = false;
      const px = saco.x + 20, pz = saco.z, pa = ponerParche(0, px, pz, 3.2);
      // La sombra dice dónde cae: quieta a 12 m sobre el parche, cae justo debajo
      ir(px, pz, 12, 0, 0); predecir(P);
      check('Quieta en el aire, la sombra-diana cae justo debajo y marca el centro (dorada)', Math.hypot(P.lx - px, P.lz - pz) < 0.01 && P.zona === 2 && (pintar(), M.diana.visible && M.arco.visible && M.diana.material.color.getHex() === 0xffd23f), P.lx.toFixed(2));
      // Soltar con teclado (Acción = E): la semilla sigue el arco y cae donde decía la sombra
      ir(px - 8, pz, 14, 10, 0); predecir(P); const lx = P.lx, lz = P.lz, T0 = P.T;
      const s0 = E.semillas; tecla('e');
      const sv = vuelo.find(s => s.on);
      check('Con el teclado (E) se suelta una semilla y se gasta una', E.semillas === s0 - 1 && !!sv && Math.abs(sv.lx - lx) < 1e-6, s0 + ' → ' + E.semillas);
      lejos(); paso(T0 * 0.5); const mitad = sv.on && M.semillas.visible && M.semillas.count === 1;
      caer();
      const arb = arboles.find(a => a.on);
      check('La semilla cae en arco donde marcaba la sombra (aunque Vittata ya se fue) y brota un árbol', mitad && !!arb && Math.hypot(arb.x - lx, arb.z - lz) < 0.01 && Math.abs(lx - px) > 0.5, arb ? Math.hypot(arb.x - lx, arb.z - lz).toFixed(3) + ' m' : 'sin árbol');
      check('Soltar rápido (más de 8 m/s) suma +1: borde o centro, con su aviso', E.arboles === 1 && E.rapidas === 1 && (E.puntos === 4 || E.puntos === 2) && /\+(4|2)/.test(q(hudEl, 'msg').textContent), E.puntos + ' · ' + q(hudEl, 'msg').textContent);
      check('El parche plantado se va y sale otro en el claro (siguen 1 + los nuevos)', !pa.on || Math.hypot(pa.x - px, pa.z - pz) > 1, pa.on);
      for (let i = 0; i < 20; i++) paso(0.05);
      check('El árbol brota (crece hasta su tamaño) y se dibuja con su malla instanciada', arb.t > 0.9 && (M.palma.count + M.tabonuco.count) === 1, M.palma.count + '/' + M.tabonuco.count);
      // Centro, borde y fuera (quieta encima: sin bono de velocidad)
      const prueba = (dx, alto) => { for (const p of parches) p.on = false; ponerParche(0, px, pz, 3.2); listo(); ir(px + dx, pz, alto || 10, 0, 0); const ok = soltar(); lejos(); caer(); return ok; };
      E.racha = 0; let p0 = E.puntos; prueba(0);
      check('En el centro: +3, «¡En el centro!» y brote grande', E.puntos - p0 === 3 && /En el centro! \+3/.test(q(hudEl, 'msg').textContent) && arboles.filter(a => a.on).some(a => a.tam === 1 && Math.hypot(a.x - px, a.z - pz) < 0.01), q(hudEl, 'msg').textContent);
      E.racha = 0; p0 = E.puntos; prueba(2.5);
      check('En el borde: +1, «¡Brotó!» y brote mediano', E.puntos - p0 === 1 && /Brotó! \+1/.test(q(hudEl, 'msg').textContent) && arboles.some(a => a.on && a.tam === 0.7), q(hudEl, 'msg').textContent);
      E.racha = 2; p0 = E.puntos; const a0 = E.arboles; prueba(6);
      check('Fuera: «Rebotó fuera», ni puntos ni árbol, y se pierde la racha', E.puntos === p0 && E.arboles === a0 && E.racha === 0 && /Rebotó fuera/.test(q(hudEl, 'msg').textContent), q(hudEl, 'msg').textContent);
      // Racha: ×2 desde 3 seguidos
      E.semillas = 5; E.racha = 0; prueba(0); prueba(0); p0 = E.puntos; prueba(0);
      check('Tres seguidos: «¡Racha ×2!» y puntos dobles; el HUD lo enseña', E.puntos - p0 === 6 && /Racha ×2! \+6/.test(q(hudEl, 'msg').textContent) && q(hudEl, 'x').textContent === '×2', q(hudEl, 'msg').textContent);
      // Muy bajo no se suelta
      E.semillas = 5; listo(); ir(px, pz, 1, 0, 0);
      check('A ras del suelo no se suelta: «Vuela más alto para soltar» (no gasta semilla)', !soltar() && E.semillas === 5 && /Vuela más alto/.test(q(hudEl, 'msg').textContent));
      // Machacar no sirve: 20 toques seguidos en el mismo instante sueltan una sola; sin semillas, el aviso y el saco
      for (const p of parches) p.on = false;
      E.semillas = 5; listo(); ir(px, pz, 12, 0, 0); let sueltas = 0; for (let i = 0; i < 20; i++) if (soltar()) sueltas++;
      check('Machacar no sirve: 20 toques seguidos sueltan una sola semilla', sueltas === 1 && E.semillas === 4, sueltas);
      for (let i = 0; i < 40; i++) { paso(0.1); soltar(); }
      lejos(); caer(); listo(); const sinOk = !soltar(); // tocar sin semillas: no suelta y avisa
      check('Sin semillas: «Sin semillas: vuelve al saco», el HUD lo marca y la flecha va al saco', sinOk && E.semillas === 0 && /Sin semillas/.test(q(hudEl, 'msg').textContent) && q(hudEl, 's').classList.contains('vacio') && (apuntarGuia(), guia.ok && guia.x === saco.x && guia.z === saco.z), E.semillas);
      ir(saco.x + 1, saco.z, 2, 0, 0); paso(0.05);
      check('En el saco se recargan las 5 semillas («¡Semillas listas!»)', E.semillas === 5 && /Semillas listas/.test(q(hudEl, 'msg').textContent) && q(hudEl, 's').querySelectorAll('i.on').length === 5);
      // Táctil: el botón Acción también suelta
      for (const p of parches) p.on = false; ponerParche(0, px, pz, 3.2);
      listo(); ir(px, pz, 10, 0, 0);
      if (G.input && G.input.actBtn) { const n0 = E.semillas; G.input.actBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
        lejos(); caer(); check('Con el botón táctil también se suelta y se gana un punto', E.semillas === n0 - 1 && /En el centro/.test(q(hudEl, 'msg').textContent), n0 + ' → ' + E.semillas); }
      // Viento (30–60 s): la sombra se desplaza y la semilla cae donde la sombra
      E.t = 31; E.semillas = 5; lejos(); paso(0.05);
      const avisoV = /Viento/.test(q(hudEl, 'msg').textContent);
      for (const p of parches) p.on = false; ponerParche(0, px, pz, 3.2);
      listo(); ir(px, pz, 14, 0, 0); predecir(P); const dV = Math.hypot(P.lx - px, P.lz - pz), wx = P.lx, wz = P.lz;
      for (const p of parches) p.on = false; ponerParche(0, wx, wz, 3.2); soltar(); lejos(); caer();
      const aw = arboles.filter(a => a.on).sort((a, b) => a.t - b.t)[0];
      check('Con viento lateral (aviso con sonido), la sombra se desplaza y la semilla cae justo en ella', avisoV && E.vientoOn && dV > 1.5 && aw && Math.hypot(aw.x - wx, aw.z - wz) < 0.01, dV.toFixed(2) + ' m');
      // 60–90 s: parches pequeños que se secan
      E.t = 61; const ps = nuevoParche(parches[1]); ps.seco = true; const r0 = ps.r;
      for (let i = 0; i < 40; i++) paso(0.1);
      check('Al final, parches pequeños; los que se secan se achican', r0 === RADIO[2] && (ps.r < r0 * 0.6 || ps.r0 !== r0 || !ps.seco), r0 + ' → ' + ps.r.toFixed(2));
      { // «Reducir movimiento»: contadores (hojas que se lanzan y sonidos), no estilos
        const fx = G.fx, b0 = fx && fx.burst, au = G.audio, pl0 = au && au.play; let nHojas = 0; const sonidos = [];
        html.classList.add('mov-reducido');
        try {
          if (fx) fx.burst = () => { nHojas++; };
          if (au) au.play = n => { sonidos.push(n); };
          G.quiet = false;
          E.t = 40; E.semillas = 5; for (const p of parches) p.on = false; ponerParche(0, px, pz, 3.2);
          listo(); ir(px, pz, 10, 0, 0); E.vientoX = E.vientoZ = 0; E.vientoOn = true; // sin viento para esta caída
          soltar(); lejos(); caer();
          const nuevo = arboles.filter(a => a.on).sort((a, b) => a.t - b.t)[0];
          E.semillas = 0; E.sinT = -9; E.ultSoltar = -9; soltar(); // sin semillas: el aviso suena
          E.vientoOn = false; E.t = 31; paso(0.02); // el viento también se avisa con sonido
          check('Con «Reducir movimiento»: ninguna ráfaga de hojas (al brotar ni con el viento), el árbol sale ya crecido y los avisos suenan', nHojas === 0 && nuevo && crecer(nuevo.t) === 1 && sonidos.filter(n => n === 'aviso').length >= 2, 'hojas ' + nHojas + ' · ' + sonidos.join(','));
        } finally { G.quiet = true; if (fx) fx.burst = b0; if (au) au.play = pl0; html.classList.remove('mov-reducido'); }
        // y sin «Reducir movimiento», las hojas sí salen (la prueba cuenta de verdad)
        let nH2 = 0; const b1 = fx && fx.burst;
        if (fx) { fx.burst = () => { nH2++; }; try { hojas(px, 0, pz, 5); } finally { fx.burst = b1; } check('Sin «Reducir movimiento» las hojas sí salen (el contador funciona)', nH2 === 1); }
      }
      // El reloj termina: la cámara sube a enseñar el claro y luego el panel modal
      const arbFin = E.arboles, ptsFin = E.puntos; lejos();
      E.t = DUR - 0.05; paso(0.1);
      const enVista = E.fase === 'vista' && hudEl.hidden && finEl.hidden && (M.palma.count + M.tabonuco.count) > 0 && !M.parches.visible && (!C || C.distFly === camD0[1] + CAM_F[1]);
      const tV = tecla('p');
      check('Al terminar, la cámara sube y enseña el claro reverdecido (los árboles siguen; sin teclas del mundo)', enVista && tV.defaultPrevented, E.fase + ' · ' + (C && C.distFly));
      for (let i = 0; i < 60 && E.fase === 'vista'; i++) paso(0.05);
      const fr = finEl.getBoundingClientRect(), bots = [...finEl.querySelectorAll('button')].map(b => b.getBoundingClientRect());
      check('Panel final: árboles, «¡Nuevo récord!», «Sembraste N árboles · Mejor racha», «Otra vez» y «Salir»', E.fase === 'fin' && !finEl.hidden && q(finEl, 'fn').textContent === String(arbFin) && new RegExp('Nuevo récord: ' + ptsFin + ' puntos').test(q(finEl, 'fmsg').textContent) && new RegExp('Sembraste ' + arbFin + ' árboles · Mejor racha: 3').test(q(finEl, 'fdet').textContent), q(finEl, 'fmsg').textContent + ' · ' + q(finEl, 'fdet').textContent);
      check('El dato real de la palma de sierra sale la primera vez (con su fuente)', /palma de sierra \(USFWS\)/.test(q(finEl, 'fdato').textContent) && !/siembr|dispers|plant/i.test(q(finEl, 'fdato').textContent));
      check('El récord (puntos, árboles y racha) se guarda en este dispositivo', (() => { const r = leerRec(); return r && r.mejor === ptsFin && r.arboles === arbFin && r.racha === 3 && r.jugadas === 1 && r.dato === true; })(), JSON.stringify(leerRec()));
      check('Cabe en la pantalla: panel dentro y botones del final ≥ 54 px', bots.every(b => b.height >= 54 && b.width >= 54) && fr.left >= 0 && fr.right <= innerWidth && fr.top >= 0 && fr.bottom <= innerHeight, `${innerWidth}×${innerHeight} · ${Math.round(fr.width)}×${Math.round(fr.height)}`);
      await new Promise(r => setTimeout(r, 30));
      const tP = tecla('p'), tE = tecla('e');
      check('El panel es modal: el mundo en pausa, las teclas del mundo no pasan y el foco va al panel', (!G.pausa || !G.pausa.motivos || G.pausa.motivos.has('sembradora')) && tP.defaultPrevented && tE.defaultPrevented && E.fase === 'fin' && document.activeElement === finEl && ['minimapa', 'guia-hud', 'keyhint'].every(id => !vis(id)), document.activeElement && (document.activeElement.id || document.activeElement.tagName));
      const ae = G.aula && G.aula.aj;
      if (ae) {
        const idi0 = ae.idioma; ae.idioma = 'en'; pintarHud(); pintarFin();
        const txt = hudEl.textContent + ' ' + finEl.textContent + ' ' + MODO.verbo;
        check('En inglés no queda texto en español (Time’s up!, You planted, Real fact, Play again, Exit, Drop)', /Time’s up!/.test(txt) && /You planted \d+ trees/.test(txt) && /Real fact/.test(txt) && /Play again/.test(txt) && /Exit/.test(txt) && /Drop/.test(txt) && !/[áéíóúñ¡]|Salir|Otra vez|Récord|Sembraste|puntos|Soltar/.test(txt), txt.slice(0, 200));
        ae.idioma = idi0; pintarHud(); pintarFin();
      }
      finEl.querySelector('[data-a="otra"]').click();
      check('«Otra vez» empieza limpio (1:30, 0 árboles, 5 semillas, sin árboles viejos, sin panel ni pausa y la cámara de siempre)', E.fase === 'juego' && E.puntos === 0 && E.arboles === 0 && E.semillas === 5 && arboles.every(a => !a.on) && finEl.hidden && q(hudEl, 'r').textContent === '1:30' && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('sembradora')) && parches.every(p => p.on) && (!C || (C.dist === camD0[0] && C.distFly === camD0[1])));
      lejos(); E.t = DUR; paso(0.1); for (let i = 0; i < 60 && E.fase === 'vista'; i++) paso(0.05);
      check('Sin puntos, nunca castiga: «¡Casi!», el récord sigue y el dato no se repite', /Casi/.test(q(finEl, 'fmsg').textContent) && leerRec().mejor === ptsFin && q(finEl, 'fdato').textContent === '', q(finEl, 'fmsg').textContent);
      let soltadas = 0; for (const k of ['parches', 'semillas', 'palma', 'tabonuco']) M[k].addEventListener('dispose', () => { soltadas++; });
      finEl.querySelector('[data-a="salir"]').click();
      check('Al salir se sueltan las 4 mallas instanciadas (sus búferes de la GPU también)', soltadas === 4, soltadas);
      check('«Salir» lo quita todo (HUD, panel, clases, pausa, árboles y mallas fuera de la escena, Acción y cámara de siempre)', !activo() && hudEl.hidden && finEl.hidden && !/sembradora-(on|fin)/.test(document.body.className) && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('sembradora')) && !M && !R.scene.children.some(o => /^sembradora:/.test(o.name)) && arboles.every(a => !a.on) && (!G.interaccion || G.interaccion.modo !== MODO) && (!C || (C.dist === camD0[0] && C.distFly === camD0[1])));
      jugar({ semilla: 3, callado: true });
      const ev = tecla('Escape');
      check('Esc en plena partida también sale', !activo() && ev.defaultPrevented && hudEl.hidden);
      check('Sonidos que ya existen (lanzar, semilla, encaje, frenada, pieza, aviso, panel_final, logro)', !G.audio || !G.audio.has || ['lanzar', 'semilla', 'encaje', 'frenada', 'pieza', 'aviso', 'panel_final', 'logro'].every(n => G.audio.has(n)));
    } catch (e) { check('Sin errores', false, e && (e.stack || e.message)); }
    finally {
      salir(); G.quiet = q0; azarS = 0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; m.vx = mv0.vx; m.vz = mv0.vz;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  const objetivo = () => (E.fase === 'juego' && guia.ok ? guia : null); // lo lee el minimapa (minimapa.js objetivo()): la estrella marca lo mismo que la flecha
  G.sembradoraApi = { jugar, salir, activo, soltar, paso, test, objetivo,
    estado: () => ({ fase: E.fase, puntos: E.puntos, arboles: E.arboles, semillas: E.semillas, racha: E.racha, restante: restante(), mejor: E.mejor, viento: E.vientoOn }),
    _dev: { E, parches, arboles, vuelo, saco, P, ponerParche, predecir } };
  return G.sembradoraApi;
};
