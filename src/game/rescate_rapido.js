/* Juego · D16 · «Rescate rápido» (minijuego corto de «Más juegos», 90 segundos). Lista larga D16 de docs/equipo/TAREAS_WEB.md.
   Tres pichones se bajaron del nido a curiosear y empieza a nublarse: Vittata los recoge de uno en uno (Acción: «Recoger») y los
   lleva al nido (Acción: «Dejar») antes de que llueva. Con los 3 a salvo, fiesta. Si llega la lluvia antes, no pasa nada malo: los
   que faltaban se tapan con una hoja grande y el panel dice cuántos salvaste («¡Casi!» si ninguno). Tono tierno y cómico, sin peligro.
   No es «¡Salva al pichón!» (src/game/rescate.js, el reto de un pichón tras la crecida): este es otro juego, con su propio archivo.
   Reloj de lluvia: una nube encima del nido que se va poniendo gris (nunca negra) y, en los últimos 15 s, gotas finas alrededor
   de Vittata; el HUD lleva el reloj con una nubecita. Machacar no sirve: Acción solo recoge junto a un pichón (y de uno en uno) y
   solo deja junto al nido; entre toque y toque hay 0,35 s.
   Zona: cerca del claro de la parada (parada_claro; sin ella, la plaza o donde esté Vittata), en un sitio abierto que se mide al
   empezar (rejilla de 2 m reutilizada): sin agua, barranco, copas de la flora, colliders ni huellas de los edificios. Se mide en
   cada partida, así que vale también con el bosque ya crecido (tras la historia). Si no hay sitio bueno en un sector, otro sector.
   Modelos: el pichón es la figura sencilla de src/game/rescate.js (cuerpo y cabeza verdes, frente roja, pico claro) y el nido, el
   del criadero (src/game/criadero.js: cuenco marrón, aro de ramitas y plumitas), en lo alto de un poste como la caja nido del cartel
   de rescate.js. Nada de modelos nuevos ni texturas: piezas con color por vértice unidas en una malla.
   Mallas: 2 instanciadas (pichones, gotas) + el nido y la nube (mallas sueltas); grupos fijos y vectores reutilizados: nada se crea
   por cuadro. Al salir se suelta todo (dispose de geometrías, materiales e InstancedMesh).
   Mientras se juega la música del mundo calla (musica.js lee body.pichones-on) y los avisos de la historia esperan
   (G.menuModos.ocupado()). El panel final es modal: congela el mundo (G.pausa 'pichones') y no deja pasar teclas.
   «Reducir movimiento»: sin gotas, sin plumas ni chispas de fiesta y sin saltitos; los avisos importantes también suenan.
   Sonidos que ya existen: pio (si rescate.js lo definió; si no, pickup), encaje, aviso, boton, panel_final, logro.
   Récord en este dispositivo (localStorage, <almacen>.pichones = { v: 1, mejor (pichones a salvo, 0–3), tiempo (s, el mejor con
   los 3; 0 = aún no), jugadas }).
   API: window.AVRescateRapido(G) → G.pichonesApi = { jugar, salir, activo, accion, paso, estado, objetivo, test }. Prueba: AV.pichonesTest(). */
window.AVRescateRapido = function (G) {
  'use strict';
  if (G.pichonesApi) return G.pichonesApi;
  const S = G.S, R = G.renderer;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -1e9; return w > -1e8 ? w : -Infinity; };
  const MV = () => (G.fisica && G.fisica.MOVE) || {};
  const ALM = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.pichones';
  const DUR = 90, N = 3, GOTAS_T = 15, NG = 70, ESPERA = 0.35, VISTA_T = 1.6;
  const COGER_R = 2.8, COGER_ABAJO = -1.5, COGER_ARRIBA = 4.5, DEJAR_R = 3.2, DEJAR_ABAJO = -3, DEJAR_ARRIBA = 6;
  const POSTE = 2.4, NIDO_K = 3.2, PICH_K = 1.6, D_MIN = 12, D_MAX = 28, SEP = 8, NUBE_ALTO = 24;
  const ANCLAS = ['parada_claro', 'plaza', 'terrenoB'];
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const html = document.documentElement;
  const reducido = () => html.classList.contains('mov-reducido') || !!(R && R.REDUCED);
  const reloj = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const ent = (v, max) => (Number.isInteger(v) && v >= 0 ? Math.min(v, max) : 0);
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor <= N ? d : null; } catch (e) { return null; } };
  const guardarRec = () => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor: E.mejor, tiempo: E.mejorT, jugadas: E.jugadas })); } catch (e) { /* sin almacén */ } };
  const sonar = (n, a) => { try { if (!G.quiet && G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const pio = () => sonar(G.audio && G.audio.has && G.audio.has('pio') ? 'pio' : 'pickup', 2); // el pío de rescate.js si ya está; si no, el de recoger
  const chispas = (x, y, z, tipo, n) => { if (reducido()) return; try { if (G.fx && G.fx.burst) G.fx.burst(x, y, z, tipo, n); } catch (e) { /* sin fx */ } };
  let azarS = 0; const azar = () => { if (!azarS) return Math.random(); azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };
  const rnd = (a, b) => a + azar() * (b - a);

  // ---------- Estado (grupos fijos, sin asignaciones por cuadro) ----------
  const pich = []; for (let i = 0; i < N; i++) pich.push({ x: 0, y: 0, z: 0, estado: 'suelo', fase: 0, yaw: 0 }); // suelo · lleva · nido
  const gotas = []; for (let i = 0; i < NG; i++) gotas.push({ x: 0, y: 0, z: 0, v: 0 });
  const nido = { x: 0, y: 0, z: 0, top: 0 };
  const guia = { x: 0, y: 0, z: 0, ok: false };
  const E = { fase: 'nada', t: 0, salvados: 0, lleva: -1, ultAccion: -9, pistaT: -9, msgT: 0, avisos: 0, cerca: -1, enNido: false, vistaT: 0, finP: 0,
    nuevo: false, todos: false, tiempo: 0, mejor: 0, mejorT: 0, jugadas: 0, gotasOn: false, sitioN: 0, zona: '' };
  const restante = () => Math.max(0, DUR - E.t);

  // ---------- Geometría: piezas con color por vértice, unidas en una sola malla (como sembradora.js) ----------
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
  function geoPichon() { // la figura del pichón de rescate.js (≈ 0,6 m), en una sola pieza
    const cuerpo = new THREE.SphereGeometry(0.2, 14, 10); cuerpo.scale(1, 1.15, 1); cuerpo.translate(0, 0.24, 0);
    const cabeza = new THREE.SphereGeometry(0.14, 14, 10); cabeza.translate(0, 0.5, 0.05);
    const frente = new THREE.SphereGeometry(0.06, 10, 8); frente.translate(0, 0.55, 0.16);
    const pk = new THREE.ConeGeometry(0.045, 0.1, 8); pk.rotateX(Math.PI / 2); pk.translate(0, 0.48, 0.2);
    const p = [[cuerpo, '#3fae4a'], [cabeza, '#3fae4a'], [frente, '#c8322a'], [pk, '#e8dcc0']];
    for (const s of [1, -1]) { const ojo = new THREE.SphereGeometry(0.025, 8, 6); ojo.translate(s * 0.07, 0.53, 0.13); p.push([ojo, '#111111']); }
    return unir(p);
  }
  function geoNido() { // el nido del criadero (cuenco, aro de ramitas y plumitas verdes) en lo alto de un poste, como la caja nido de rescate.js
    const k = NIDO_K, p = [];
    const poste = new THREE.CylinderGeometry(0.09 * k * 0.5, 0.11 * k * 0.5, POSTE, 8); poste.translate(0, POSTE / 2, 0); p.push([poste, '#7a5434']);
    const bowl = new THREE.SphereGeometry(0.38 * k, 24, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38); bowl.translate(0, POSTE + 0.25 * k, 0); p.push([bowl, '#6e4d2c']);
    const fondo = new THREE.CircleGeometry(0.3 * k, 20); fondo.rotateX(-Math.PI / 2); fondo.translate(0, POSTE + 0.05 * k, 0); p.push([fondo, '#5e3f24']);
    const COL = ['#7a5434', '#93683f', '#5e3f24', '#a8814f'];
    for (let i = 0; i < 44; i++) { // ramitas del aro (el criadero pone 170 en una instanciada; aquí van unidas, de una vez)
      const a = (i / 44) * Math.PI * 2 + ((i * 0.37) % 0.3), ring = (0.36 + ((i * 0.618) % 1) * 0.12) * k, y = POSTE + (0.04 + ((i * 0.41) % 1) * 0.12) * k;
      const t = new THREE.CylinderGeometry(0.012 * k, 0.016 * k, 0.4 * k, 5);
      t.rotateX(Math.PI / 2 + (((i * 0.53) % 1) - 0.5) * 0.7); t.rotateY(-a + (((i * 0.71) % 1) - 0.5) * 0.9); t.translate(Math.cos(a) * ring, y, Math.sin(a) * ring);
      p.push([t, COL[i % 4]]);
    }
    for (let i = 0; i < 6; i++) { const f = new THREE.SphereGeometry(1, 8, 5); f.scale(0.012 * k, 0.004 * k, 0.05 * k); f.rotateY(i * 1.7); f.translate(Math.cos(i * 1.1) * 0.2 * k, POSTE + 0.07 * k, Math.sin(i * 1.1) * 0.2 * k); p.push([f, '#7fbf6a']); }
    return unir(p);
  }
  function geoNube() { // nube de bolas suaves (blanca: el material la va agrisando)
    const p = [];
    for (const [x, y, z, r] of [[0, 0, 0, 5.2], [5, -0.8, 1, 4], [-5, -0.6, -0.5, 4.2], [2, 1.5, -2.5, 3.6], [-2.4, 1.2, 2.4, 3.4], [7.8, -1.5, -1.2, 2.8], [-7.6, -1.4, 1.4, 2.8]]) {
      const b = new THREE.SphereGeometry(r, 14, 9); b.scale(1, 0.62, 1); b.translate(x, y, z); p.push([b, '#ffffff']);
    }
    return unir(p);
  }

  // ---------- Mallas (se crean al jugar y se sueltan al salir) ----------
  let M = null;
  const dummy = new THREE.Object3D(), NUBE0 = new THREE.Color('#ffffff'), NUBE1 = new THREE.Color('#8d97a6'); // gris de lluvia mansa, nunca negro
  function crearMallas() {
    if (M) return;
    const lam = o => R.linMat(new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)));
    const inst = (geo, mat, n, nombre) => { const m = new THREE.InstancedMesh(geo, mat, n); m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.userData.sinCulling = true; m.name = 'pichones:' + nombre; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(m); return m; };
    M = {};
    M.pichones = inst(geoPichon(), lam({ emissive: '#1d3a12', emissiveIntensity: 0.35 }), N, 'pichones');
    const gg = new THREE.CylinderGeometry(0.018, 0.018, 0.55, 4);
    M.gotas = inst(gg, R.linMat(new THREE.MeshBasicMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.55, depthWrite: false })), NG, 'gotas');
    M.nido = new THREE.Mesh(geoNido(), lam()); M.nido.name = 'pichones:nido';
    M.nube = new THREE.Mesh(geoNube(), R.linMat(new THREE.MeshLambertMaterial({ vertexColors: true, color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false })));
    M.nube.name = 'pichones:nube';
    for (const k of ['nido', 'nube']) { const m = M[k]; m.visible = false; m.frustumCulled = false; m.castShadow = false; R.scene.add(m); }
  }
  function soltarMallas() {
    if (!M) return;
    for (const k in M) { const m = M[k]; R.scene.remove(m); if (m.isInstancedMesh) m.dispose(); m.geometry.dispose(); m.material.dispose(); } // InstancedMesh.dispose(): sus búferes de la GPU
    M = null;
  }
  const enSuelo = () => { const m = MV(); return !m.flying && !m.swimming; };
  function posLleva(o) { // el pichón va en las patas al volar; andando, delante, en el pico
    const f = S.facing || { x: 0, z: 1 };
    if (enSuelo()) { o.x = S.pos.x + f.x * 0.55; o.y = S.pos.y + 0.35; o.z = S.pos.z + f.z * 0.55; }
    else { o.x = S.pos.x; o.y = S.pos.y - 0.55; o.z = S.pos.z; }
    return o;
  }
  const pl = { x: 0, y: 0, z: 0 };
  const HUECOS = [[0.32, 0], [-0.18, 0.28], [-0.18, -0.28]]; // sitios en el nido (×NIDO_K/3.2)
  function pintar() {
    if (!M) return;
    const ver = E.fase !== 'nada', mueve = !reducido(), tt = E.t;
    let n = 0;
    if (ver) for (let i = 0; i < N; i++) {
      const p = pich[i];
      if (p.estado === 'suelo') {
        if (E.fase !== 'juego') continue;
        const salto = mueve ? Math.abs(Math.sin(tt * 4 + p.fase)) * 0.18 : 0; // saltitos de espera
        dummy.position.set(p.x, p.y + salto, p.z); dummy.rotation.set(0, Math.atan2(S.pos.x - p.x, S.pos.z - p.z), 0); dummy.scale.setScalar(PICH_K);
      } else if (p.estado === 'lleva') {
        posLleva(pl); dummy.position.set(pl.x, pl.y + (mueve ? Math.sin(tt * 9) * 0.04 : 0), pl.z);
        const f = S.facing || { x: 0, z: 1 }; dummy.rotation.set(0, Math.atan2(f.x, f.z), 0); dummy.scale.setScalar(PICH_K * 0.8);
      } else { // en el nido, asomando
        const h = HUECOS[p.hueco || 0], k = NIDO_K / 3.2;
        dummy.position.set(nido.x + h[0] * k * 3.2 * 0.4, nido.top - 0.15, nido.z + h[1] * k * 3.2 * 0.4); dummy.rotation.set(0, p.yaw + (mueve && E.todos ? Math.sin(tt * 6 + p.fase) * 0.5 : 0), 0); dummy.scale.setScalar(PICH_K * 0.85);
      }
      dummy.updateMatrix(); M.pichones.setMatrixAt(n++, dummy.matrix);
    }
    M.pichones.count = n; M.pichones.visible = n > 0; M.pichones.instanceMatrix.needsUpdate = true;
    let ng = 0;
    if (E.fase === 'juego' && E.gotasOn && mueve) for (const g of gotas) { dummy.position.set(g.x, g.y, g.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); M.gotas.setMatrixAt(ng++, dummy.matrix); }
    M.gotas.count = ng; M.gotas.visible = ng > 0; M.gotas.instanceMatrix.needsUpdate = true;
    M.nido.visible = ver; if (ver) M.nido.position.set(nido.x, nido.y, nido.z);
    M.nube.visible = E.fase === 'juego';
    if (M.nube.visible) { M.nube.position.set(nido.x, nido.top + NUBE_ALTO, nido.z); M.nube.material.color.copy(NUBE0).lerp(NUBE1, Math.min(1, E.t / DUR)); }
  }
  function nuevaGota(g, arriba) { g.x = S.pos.x + rnd(-9, 9); g.z = S.pos.z + rnd(-9, 9); g.y = S.pos.y + (arriba ? rnd(6, 12) : rnd(-3, 12)); g.v = rnd(11, 15); }

  // ---------- Zona: un sitio abierto cerca del claro de la parada (rejilla de 2 m, se mide en cada partida) ----------
  const huella = I => { const k = (window.AV_EDIFICIOS_KIT || {})[I.modelo], r = k && k.radio ? k.radio : 8, al = k && k.alto ? Math.min(k.alto, r) : 0; return Math.max(Math.sqrt(r * r - al * al), 0.4 * r) * (I.escala || 1) + 0.5; };
  function cadaObstaculo(fn) { // fn(x, z, radio): colliders del mundo, edificios por su huella y la copa de cada árbol de la flora (como sembradora.js)
    const cs = G.fisica && G.fisica.colliders;
    if (cs) for (let i = 0; i < cs.length; i++) { const c = cs[i]; fn(c.x, c.z, c.kind === 'tree' || c.kind === 'arbol' ? Math.max(1.2, Math.min(4.5, (c.r || 0.3) * 4)) : (c.hx ? Math.hypot(c.hx, c.hz) : c.r || 0) + 0.5); }
    const gs = G.streaming && G.streaming.gestor, ins = gs && gs.instancias;
    if (ins) for (let i = 0; i < ins.length; i++) { const I = ins[i]; if (I.pos) fn(I.pos[0], I.pos[2], huella(I)); }
    const Vg = G.vegetacion, inst = Vg && Vg.instancias, info = (Vg && Vg.info) || {};
    if (inst) for (const m in inst) {
      const I = inst[m], inf = info[m]; if (!I || !I.pos || !inf || !(inf.alto > 2)) continue;
      const n = I.n != null ? I.n : I.pos.length / 4, rc = Math.min(6.2, Math.max(1.5, (inf.ancho || 3) * 0.5));
      for (let i = 0; i < n; i++) { const s = I.pos[i * 4 + 3]; if (s > 0) fn(I.pos[i * 4], I.pos[i * 4 + 2], rc * s); }
    }
  }
  const RC = 2, HALF = 260; // el bosque de Villa Raíz es denso: el sitio abierto puede estar a unos 200 m (como el claro de sembradora.js)
  let ras = null, rasN = 0, rasX = 0, rasZ = 0;
  const mojado = (x, z) => nivelAgua(x, z) > H(x, z) - 0.05;
  const marcar = (x, z, r) => {
    const Rr = r + 1.5, n = rasN, i0 = Math.max(0, Math.floor((x - Rr - rasX) / RC)), i1 = Math.min(n - 1, Math.floor((x + Rr - rasX) / RC)), j0 = Math.max(0, Math.floor((z - Rr - rasZ) / RC)), j1 = Math.min(n - 1, Math.floor((z + Rr - rasZ) / RC));
    for (let j = j0; j <= j1; j++) { const dz = rasZ + (j + 0.5) * RC - z; for (let i = i0; i <= i1; i++) { const dx = rasX + (i + 0.5) * RC - x; if (dx * dx + dz * dz < Rr * Rr) ras[i + j * n] = 0; } }
  };
  function normalY(x, z) { const e = 0.8, dx = H(x + e, z) - H(x - e, z), dz = H(x, z + e) - H(x, z - e); return 2 * e / (Math.hypot(dx, 2 * e, dz) || 1); }
  function medir(cx, cz) {
    const n = Math.ceil(2 * HALF / RC), NN = n * n;
    if (!ras || ras.length < NN) ras = new Uint8Array(NN);
    ras.fill(1, 0, NN); rasN = n; rasX = cx - HALF; rasZ = cz - HALF;
    cadaObstaculo(marcar);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = i + j * n; if (!ras[k]) continue;
      const x = rasX + (i + 0.5) * RC, z = rasZ + (j + 0.5) * RC, g = H(x, z);
      if (!(g > -1e8) || mojado(x, z) || mojado(x + 1.5, z) || mojado(x - 1.5, z) || mojado(x, z + 1.5) || mojado(x, z - 1.5) || normalY(x, z) < 0.82) ras[k] = 0;
    }
  }
  const libre = (x, z) => { const i = Math.floor((x - rasX) / RC), j = Math.floor((z - rasZ) / RC); return i >= 0 && j >= 0 && i < rasN && j < rasN ? ras[i + j * rasN] : 0; };
  function puntuar(cx, cz) { // de 24 rumbos × 3 distancias, cuántos puestos sirven para un pichón (el nido, en el centro, también libre)
    if (!libre(cx, cz)) return -1;
    let n = 0;
    for (let a = 0; a < 24; a++) { const an = a * Math.PI / 12; for (const d of [D_MIN + 2, (D_MIN + D_MAX) / 2, D_MAX - 2]) n += libre(cx + Math.cos(an) * d, cz + Math.sin(an) * d); }
    return n;
  }
  function elegirZona() {
    const T = G.terreno, poi = id => { try { return T && T.poi ? T.poi(id) : null; } catch (e) { return null; } };
    let a = null; E.zona = 'vittata';
    for (const id of ANCLAS) { a = poi(id); if (a) { E.zona = id; break; } }
    const ax = a ? a.x : S.pos.x, az = a ? a.z : S.pos.z;
    medir(ax, az);
    let bx = ax, bz = az, bs = -2;
    const RMAX = HALF - D_MAX - 4;
    for (let r = 0; r <= RMAX && bs < 18; r += 4) { // del centro hacia fuera: el primero con sitio de sobra (18 de 72 puestos libres: los 3 pichones caben en sus sectores), o el mejor
      const pasos = Math.max(1, Math.round(2 * Math.PI * r / 4));
      for (let k = 0; k < pasos; k++) {
        const an = k * 2 * Math.PI / pasos, x = ax + Math.cos(an) * r, z = az + Math.sin(an) * r, s = puntuar(x, z);
        if (s > bs) { bs = s; bx = x; bz = z; }
      }
    }
    E.sitioN = bs;
    nido.x = bx; nido.z = bz; nido.y = H(bx, bz) - 0.05; nido.top = nido.y + POSTE + 0.3 * NIDO_K * 0.5;
    // los 3 pichones: uno por sector (120°), en un puesto libre a 12–28 m y separados; si un sector no tiene, cualquiera libre
    const a0 = rnd(0, Math.PI * 2);
    for (let i = 0; i < N; i++) {
      const p = pich[i]; let ok = false;
      for (let pase = 0; pase < 2 && !ok; pase++) for (let k = 0; k < 60 && !ok; k++) {
        const an = pase === 0 ? a0 + i * 2.0944 + rnd(-0.75, 0.75) : rnd(0, Math.PI * 2), d = rnd(D_MIN, D_MAX), x = bx + Math.cos(an) * d, z = bz + Math.sin(an) * d;
        if (!libre(x, z)) continue;
        let lejos = true; for (let j = 0; j < i; j++) if (Math.hypot(pich[j].x - x, pich[j].z - z) < SEP) lejos = false;
        if (!lejos) continue;
        p.x = x; p.z = z; ok = true;
      }
      if (!ok) { // sin sitio libre (no debería pasar): en seco, a la distancia mínima
        let x = bx + Math.cos(a0 + i * 2.0944) * D_MIN, z = bz + Math.sin(a0 + i * 2.0944) * D_MIN;
        for (let k = 0; k < 24 && mojado(x, z); k++) { const an = a0 + i * 2.0944 + k * 0.26; x = bx + Math.cos(an) * D_MIN; z = bz + Math.sin(an) * D_MIN; }
        p.x = x; p.z = z;
      }
      p.y = H(p.x, p.z); p.estado = 'suelo'; p.fase = i * 2.1; p.yaw = rnd(0, 6.28); p.hueco = 0;
    }
  }
  function colocarVittata() { // en el aire junto al nido, mirando al pichón más cercano: se ve desde el principio
    let fx = 0, fz = 1, bd = Infinity;
    for (const p of pich) { const d = Math.hypot(p.x - nido.x, p.z - nido.z); if (d < bd) { bd = d; fx = (p.x - nido.x) / d; fz = (p.z - nido.z) / d; } }
    const x = nido.x - fx * 5, z = nido.z - fz * 5, Mv = G.fisica && G.fisica.MOVE;
    let alto = Math.max(H(x, z), nivelAgua(x, z)); // la cámara va detrás: si allí el suelo sube (ladera), más alto, para que no quede dentro del monte
    for (let d = 3; d <= 12; d += 3) alto = Math.max(alto, H(x - fx * d, z - fz * d) - 2);
    S.pos.x = x; S.pos.z = z; S.pos.y = alto + 7; S.vy = 0;
    S.facing = { x: fx, z: fz };
    if (Mv) { Mv.vx = Mv.vz = 0; Mv.swimming = false; Mv.landing = false; Mv.jumping = false; Mv.grounded = false; Mv.takeoff = 0; if (!Mv.flying) { Mv.flying = true; try { G.emit('vuelo', true); } catch (e) { /* */ } } }
    try { if (G.camara) { G.camara.yaw = Math.atan2(-fx, -fz); if (G.camara.manual) G.camara.manual(); } } catch (e) { /* sin cámara */ }
  }

  // ---------- Recoger y dejar ----------
  function cercano() { // el pichón del suelo que se puede recoger ahora (o -1)
    let b = -1, bd = Infinity;
    for (let i = 0; i < N; i++) {
      const p = pich[i]; if (p.estado !== 'suelo') continue;
      const d = Math.hypot(S.pos.x - p.x, S.pos.z - p.z), dy = S.pos.y - p.y;
      if (d <= COGER_R && dy >= COGER_ABAJO && dy <= COGER_ARRIBA && d < bd) { bd = d; b = i; }
    }
    return b;
  }
  const junto = () => { const d = Math.hypot(S.pos.x - nido.x, S.pos.z - nido.z), dy = S.pos.y - nido.top; return d <= DEJAR_R && dy >= DEJAR_ABAJO && dy <= DEJAR_ARRIBA; };
  function accion() {
    if (E.fase !== 'juego') return false;
    if (E.t - E.ultAccion < ESPERA) return false; // machacar no sirve
    if (E.lleva >= 0) {
      if (junto()) { dejar(); return true; }
      const i = cercano();
      if (i >= 0) { if (E.t - E.pistaT > 1.2) { E.pistaT = E.t; aviso(L('¡De uno en uno! Primero lleva este al nido', 'One at a time! Take this one to the nest first'), 'malo'); } return false; }
      if (E.t - E.pistaT > 1.2) { E.pistaT = E.t; aviso(L('Vuela al nido para dejarlo', 'Fly to the nest to drop it off'), 'malo'); }
      return false;
    }
    const i = cercano();
    if (i < 0) { if (E.t - E.pistaT > 1.2) { E.pistaT = E.t; aviso(L('Acércate a un pichón para recogerlo', 'Get close to a chick to pick it up'), 'malo'); } return false; }
    E.ultAccion = E.t; E.lleva = i; pich[i].estado = 'lleva';
    pio(); aviso(L('¡Agárrate, pichón! Ahora, al nido', 'Hold on, little one! Now, to the nest'), 'bien');
    apuntarGuia(); pintarHud();
    return true;
  }
  function dejar() {
    const p = pich[E.lleva];
    E.ultAccion = E.t; p.estado = 'nido'; p.hueco = E.salvados; E.lleva = -1; E.salvados++;
    sonar('encaje'); pio();
    chispas(nido.x, nido.top + 0.6, nido.z, 'feathers', 12);
    if (E.salvados >= N) { todosASalvo(); return; }
    aviso(L(`¡A salvo! ${E.salvados} de ${N}`, `Safe! ${E.salvados} of ${N}`), 'oro');
    apuntarGuia(); pintarHud();
  }
  function todosASalvo() { // fiesta: plumas, chispas, saltitos en el nido y el panel
    E.todos = true; E.tiempo = Math.max(1, Math.ceil(E.t));
    chispas(nido.x, nido.top + 1, nido.z, 'gold', 30); chispas(nido.x, nido.top + 1, nido.z, 'feathers', 24);
    fin();
  }

  // ---------- Paso ----------
  function paso(dt) {
    if (!(dt > 0)) return;
    if (E.fase === 'vista') { E.vistaT -= dt; pintar(); if (E.vistaT <= 0) mostrarFin(); return; }
    if (E.fase !== 'juego') return;
    E.t += dt;
    if (E.msgT > 0 && (E.msgT -= dt) <= 0 && hudEl) { const m = q(hudEl, 'msg'); m.textContent = ''; m.className = ''; }
    const r = restante();
    // gotas finas en los últimos 15 s (con «Reducir movimiento», solo el aviso, que también suena)
    if (E.avisos === 0 && r <= 30) { E.avisos = 1; sonar('aviso'); aviso(L('La nube se pone gris: ¡date prisa!', 'The cloud is turning grey: hurry!'), 'malo'); }
    if (E.avisos === 1 && r <= 5) { E.avisos = 2; sonar('aviso'); }
    if (r <= GOTAS_T && !E.gotasOn) { E.gotasOn = true; sonar('aviso'); aviso(L('¡Plic! Ya caen las primeras gotas', 'Plip! The first drops are falling'), 'malo'); E.msgT = 2.4; for (const g of gotas) nuevaGota(g, false); }
    if (E.gotasOn && !reducido()) for (const g of gotas) { g.y -= g.v * dt; if (g.y < S.pos.y - 4 || Math.abs(g.x - S.pos.x) > 10 || Math.abs(g.z - S.pos.z) > 10) nuevaGota(g, true); }
    // a tiro de un pichón o del nido: el aviso lo dice una vez por llegada
    const c = E.lleva < 0 ? cercano() : -1, jn = E.lleva >= 0 && junto();
    if (c >= 0 && c !== E.cerca) aviso(L('¡Pío! Pulsa «Recoger»', 'Peep! Press «Pick up»'), 'bien');
    if (jn && !E.enNido) aviso(L('¡El nido! Pulsa «Dejar»', 'The nest! Press «Drop off»'), 'bien');
    E.cerca = c; E.enNido = jn;
    apuntarGuia();
    pintar();
    if (r <= 0) { fin(); return; }
    if (hudEl && Math.floor((E.t - dt) * 4) !== Math.floor(E.t * 4)) pintarHud();
  }
  function apuntarGuia() { // llevando un pichón, el nido; si no, el pichón del suelo más cercano
    guia.ok = false;
    if (E.fase !== 'juego') return;
    if (E.lleva >= 0) { guia.x = nido.x; guia.z = nido.z; guia.y = nido.top + 1; guia.ok = true; return; }
    let bd = Infinity;
    for (const p of pich) { if (p.estado !== 'suelo') continue; const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (d < bd) { bd = d; guia.x = p.x; guia.z = p.z; guia.y = p.y + 1.5; guia.ok = true; } }
  }
  G.on('update', (dt, busy) => { if (!G.quiet && !busy) paso(Math.min(0.05, dt || 0)); });
  const guiar = () => {
    verHud(); if (!G.fx || !G.fx.guide) return;
    if (E.fase === 'juego' && guia.ok) G.fx.guide(guia, performance.now() / 1000); else if (E.fase === 'vista' || E.fase === 'fin') G.fx.guide(null, performance.now() / 1000);
  };
  G.on('render', guiar, 61); // después de misiones.js (60): la flecha va al pichón (o al nido)
  G.on('pausa', () => verHud()); // al terminar la carga sale el HUD

  // ---------- Acción = «Recoger» / «Dejar» (G.interaccion.modo, como la sembradora) ----------
  const MODO = { activo: () => E.fase === 'juego', accion: () => accion(), aviso: () => '', get verbo() { return E.lleva >= 0 ? L('Dejar', 'Drop off') : L('Recoger', 'Pick up'); } };
  let modo0 = null;

  // ---------- HUD y panel final ----------
  let hudEl = null, finEl = null;
  const PICH = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="6" ry="6.6" fill="currentColor"/><circle cx="12" cy="7.6" r="4.4" fill="currentColor"/><circle cx="12" cy="5.4" r="1.8" fill="#c8322a"/><path d="M12 8.6l2.6 1-2.6 1z" fill="#e8dcc0"/><circle cx="10.4" cy="7" r=".9" fill="#111"/></svg>';
  const NUBE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.8 8 4.6 4.6 0 0 1 17.5 18z" fill="currentColor"/></svg>';
  function css() {
    if (document.getElementById('rr-css')) return;
    const st = document.createElement('style'); st.id = 'rr-css';
    st.textContent = '#rr-hud{position:fixed;left:12px;right:12px;margin-inline:auto;width:fit-content;max-width:calc(100vw - 24px);top:calc(env(safe-area-inset-top,0px) + 10px);z-index:60;display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;justify-content:center;box-sizing:border-box;padding:6px 8px 6px 14px;border-radius:20px;background:rgba(16,36,28,.86);color:#fff8e6;font:600 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}#rr-hud[hidden],#rr-fin[hidden]{display:none}' +
      '#rr-hud .rr-tit:empty{display:none}#rr-hud .rr-t{display:flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums;font-size:18px;font-weight:700}#rr-hud .rr-t svg{width:24px;height:24px;color:var(--rr-nube,#fff)}#rr-hud .rr-t.poco{color:#ffb4a2}' +
      '#rr-hud .rr-p{display:flex;gap:2px;align-items:center}#rr-hud .rr-p svg{width:22px;height:22px;color:rgba(255,248,230,.3)}#rr-hud .rr-p svg.on{color:#5fce5a}#rr-hud .rr-p svg.lleva{color:#ffd23f}' +
      '#rr-hud .rr-r:empty{display:none}#rr-hud .rr-r{opacity:.85;font-size:14px}' +
      '#rr-hud [data-k="msg"]{position:absolute;left:50%;top:calc(100% + 72px);transform:translateX(-50%);width:max-content;max-width:min(560px,calc(100vw - 24px));box-sizing:border-box;text-align:center;line-height:1.25;padding:4px 12px;border-radius:999px;font-weight:700;pointer-events:none;background:#fff3d6;color:#3b2a14}#rr-hud [data-k="msg"]:empty{display:none}#rr-hud [data-k="msg"].oro{background:#ffd23f}#rr-hud [data-k="msg"].malo{background:#ffd0c4;color:#5a1e10}#rr-hud [data-k="msg"].bien{background:#c8f0c0;color:#173d12}' +
      '#rr-hud button,#rr-fin button{min-height:44px;min-width:44px;padding:4px 16px;border-radius:22px;border:0;font:700 16px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}#rr-fin button{min-height:54px;padding:4px 22px;font-size:18px}#rr-hud button.salir,#rr-fin button.salir{background:#ffd0c4}#rr-hud button:focus-visible,#rr-fin button:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}' +
      '#rr-fin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border-radius:24px;background:rgba(16,36,28,.93);color:#fff8e6;font-family:Fredoka,system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;gap:8px}#rr-fin:focus{outline:none}' +
      '#rr-fin h2{margin:0;font-size:26px}#rr-fin .rr-gran{display:flex;align-items:center;gap:8px;font-size:44px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}#rr-fin .rr-gran svg{width:44px;height:44px;color:#5fce5a}#rr-fin p{margin:0;font-size:17px;font-weight:600}#rr-fin .rr-det{font-size:15px;opacity:.85;font-weight:500}#rr-fin .rr-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}' +
      '@media (max-width:600px){#rr-hud [data-k="msg"]{top:calc(100% + 8px)}}' +
      '@media (orientation:landscape) and (max-height:500px){#rr-hud [data-k="msg"]{position:fixed;top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);max-width:min(440px,calc(100vw - 380px))}}' +
      '@media (orientation:landscape) and (max-height:500px){#rr-fin{padding:12px 16px;gap:4px}#rr-fin h2{font-size:21px}#rr-fin .rr-gran{font-size:34px}#rr-fin .rr-gran svg{width:34px;height:34px}}' +
      // la historia no se mezcla con el minijuego (sus avisos esperan: G.menuModos.ocupado() cuenta este juego como actividad en marcha)
      'body.pichones-on :is(#quest,#inv,#inv-cuenta,#inv-reporte,#modo-salir,#toast,#prompt,#bocadillos,#juice-chip,#juice-pop,#truco-chip,#fx-descubre,#v18-exp-poder,#v18-extra,#b-construir,#b-nido,#marcador,#retos,#pista-vuela){visibility:hidden!important}' +
      // con la fiesta y el panel, tampoco las pistas de vuelo ni el minimapa: solo el nido y el resultado
      'body.pichones-fin :is(#minimapa,#guia-hud,#keyhint,#acts,#stick,#emotes,#tag,#sys,#sys button,#b-diary,#b-emotes,#b-nido,#b-menu,#v18-exp-poder){visibility:hidden!important}' +
      // el botón Acción lleva el icono de un pichón mientras dice «Recoger» o «Dejar»
      'body.pichones-on #b-act{--icon:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cellipse cx=%2712%27 cy=%2715.5%27 rx=%276%27 ry=%276.6%27/%3E%3Ccircle cx=%2712%27 cy=%277.6%27 r=%274.4%27/%3E%3C/svg%3E")}';
    document.head.appendChild(st);
  }
  function montar() {
    if (hudEl) return;
    css();
    hudEl = document.createElement('div'); hudEl.id = 'rr-hud'; hudEl.hidden = true; // sin role="status": el reloj cambia cada segundo y no se anuncia; solo el aviso (aria-live) habla
    hudEl.innerHTML = '<b class="rr-tit" data-k="tit"></b><span class="rr-t" data-k="r">' + NUBE + '<span data-k="rt"></span></span><span class="rr-p" data-k="p">' + PICH.repeat(N) + '</span><span class="rr-r" data-k="rec"></span><span data-k="msg" aria-live="polite"></span><button type="button" class="salir" data-a="salir"></button>';
    finEl = document.createElement('div'); finEl.id = 'rr-fin'; finEl.hidden = true; finEl.tabIndex = -1; finEl.setAttribute('role', 'dialog'); finEl.setAttribute('aria-modal', 'true'); finEl.setAttribute('aria-labelledby', 'rr-fin-t');
    finEl.innerHTML = '<h2 id="rr-fin-t" data-k="ft"></h2><div class="rr-gran">' + PICH + '<span data-k="fn"></span></div><p data-k="fmsg" aria-live="polite"></p><p class="rr-det" data-k="fdet"></p><div class="rr-bots"><button type="button" data-a="otra"></button><button type="button" class="salir" data-a="salir"></button></div>';
    const clic = e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; e.preventDefault(); if (b.dataset.a === 'otra') jugar(); else salir(); };
    hudEl.addEventListener('click', clic); finEl.addEventListener('click', clic);
    document.body.appendChild(hudEl); document.body.appendChild(finEl);
  }
  const q = (el, k) => el.querySelector('[data-k="' + k + '"]');
  const ancho = () => innerWidth >= 700 && innerHeight >= 500;
  const recTxt = () => (E.mejor >= N && E.mejorT ? reloj(E.mejorT) : E.mejor + '/' + N);
  function pintarHud() {
    if (!hudEl) return;
    q(hudEl, 'tit').textContent = ancho() ? L('Rescate rápido', 'Quick Rescue') : ''; // en el teléfono el título sobra: una sola franja
    const r = q(hudEl, 'r'); q(hudEl, 'rt').textContent = reloj(restante()); r.classList.toggle('poco', restante() <= GOTAS_T);
    r.setAttribute('aria-label', L('Lluvia en ', 'Rain in ') + reloj(restante()));
    const k = Math.min(1, E.t / DUR); r.style.setProperty('--rr-nube', 'rgb(' + [255, 255, 255].map((v, i) => Math.round(v + ([141, 151, 166][i] - v) * k)).join(',') + ')'); // la nubecita se agrisa como la del cielo
    const p = q(hudEl, 'p'), sv = p.querySelectorAll('svg');
    for (let i = 0; i < sv.length; i++) { sv[i].classList.toggle('on', i < E.salvados); sv[i].classList.toggle('lleva', i === E.salvados && E.lleva >= 0); }
    p.setAttribute('aria-label', L(`Pichones a salvo: ${E.salvados} de ${N}`, `Chicks safe: ${E.salvados} of ${N}`));
    const rq = q(hudEl, 'rec'); rq.textContent = E.jugadas ? (ancho() ? L('Récord ', 'Best ') : '★') + recTxt() : ''; rq.setAttribute('aria-label', L('Récord: ', 'Best: ') + recTxt());
    hudEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }
  function aviso(txt, cls) {
    if (!hudEl) return;
    const m = q(hudEl, 'msg'); m.textContent = txt; m.className = cls || ''; E.msgT = 1.8;
  }
  function pintarFin() {
    if (!finEl) return;
    const n = E.salvados;
    q(finEl, 'ft').textContent = E.todos ? L('¡Todos a salvo!', 'All safe!') : L('¡Llegó la lluvia!', 'Here comes the rain!');
    q(finEl, 'fn').textContent = n + '/' + N;
    q(finEl, 'fmsg').textContent = n === 0 ? L('¡Casi! Baja junto a un pichón y pulsa «Recoger»', 'So close! Fly down next to a chick and press «Pick up»')
      : E.nuevo ? (E.todos ? L(`¡Nuevo récord: ${reloj(E.tiempo)}!`, `New record: ${reloj(E.tiempo)}!`) : L(`¡Nuevo récord: ${n} de ${N}!`, `New record: ${n} of ${N}!`))
        : L('Récord: ', 'Best: ') + recTxt();
    q(finEl, 'fdet').textContent = E.todos ? L(`Los ${N} pichones, secos y felices en ${reloj(E.tiempo)}`, `All ${N} chicks, dry and happy in ${reloj(E.tiempo)}`)
      : L(`Pichones a salvo: ${n} de ${N} · los demás se taparon con una hoja grande`, `Chicks safe: ${n} of ${N} · the others hid under a big leaf`);
    finEl.querySelector('[data-a="otra"]').textContent = L('Otra vez', 'Play again');
    finEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }

  // ---------- Partida ----------
  function jugar(o) {
    o = o || {};
    azarS = o.semilla || 0;
    montar(); crearMallas();
    const rec = leerRec();
    Object.assign(E, { fase: 'juego', t: 0, salvados: 0, lleva: -1, ultAccion: -9, pistaT: -9, msgT: 0, avisos: 0, cerca: -1, enNido: false, vistaT: 0, finP: 0,
      nuevo: false, todos: false, tiempo: 0, gotasOn: false, mejor: rec ? rec.mejor : 0, mejorT: rec ? ent(rec.tiempo, 999) : 0, jugadas: rec ? ent(rec.jugadas, 99999) : 0 });
    try { if (G.pausa && G.pausa.set) G.pausa.set('pichones', false); } catch (e) { /* sin pausa */ }
    if (G.interaccion && G.interaccion.modo !== MODO) { modo0 = G.interaccion.modo; G.interaccion.modo = MODO; }
    elegirZona();
    colocarVittata();
    finEl.hidden = true; q(hudEl, 'msg').textContent = '';
    document.body.classList.add('pichones-on'); document.body.classList.remove('pichones-fin');
    apuntarGuia(); pintarHud(); pintar(); verHud();
    aviso(L('¡Tres pichones se bajaron a curiosear! Llévalos al nido antes de que llueva', 'Three chicks hopped down to explore! Take them to the nest before it rains'), 'bien'); E.msgT = 4;
    sonar('boton');
    return true;
  }
  let logroId = 0;
  function fin() { // los 3 a salvo (fiesta) o llega la lluvia: un momento para ver el nido y luego el panel
    if (E.fase !== 'juego') return;
    if (E.lleva >= 0) { pich[E.lleva].estado = 'suelo'; E.lleva = -1; } // el que llevaba se tapa con la hoja como los demás
    E.fase = 'vista'; E.vistaT = reducido() ? 0 : VISTA_T; guia.ok = false;
    hudEl.hidden = true; q(hudEl, 'msg').textContent = ''; document.body.classList.add('pichones-fin');
    sonar('panel_final');
    pintar();
    if (E.vistaT <= 0) mostrarFin();
  }
  function mostrarFin() {
    if (E.fase !== 'vista') return;
    E.fase = 'fin'; E.finP = performance.now() / 1000;
    E.jugadas++;
    E.nuevo = E.salvados > E.mejor || (E.todos && (!E.mejorT || E.tiempo < E.mejorT));
    if (E.salvados > E.mejor) E.mejor = E.salvados;
    if (E.todos && (!E.mejorT || E.tiempo < E.mejorT)) E.mejorT = E.tiempo;
    guardarRec();
    try { G.emit('record', { modo: 'pichones', salvados: E.salvados, tiempo: E.todos ? E.tiempo : 0 }); } catch (e) { /* */ }
    if ((E.nuevo && E.salvados > 0) || E.todos) logroId = setTimeout(() => { logroId = 0; if (E.fase === 'fin') sonar('logro'); }, 500);
    pintar(); pintarHud(); pintarFin(); finEl.hidden = false;
    try { if (G.pausa && G.pausa.set) G.pausa.set('pichones', true); } catch (e) { /* sin pausa */ } // panel modal: el mundo se congela detrás
    setTimeout(() => { try { if (E.fase === 'fin') finEl.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0); // el foco al panel, no a «Otra vez»
  }
  const activo = () => E.fase !== 'nada';
  const cargando = () => { try { return !!(G.pausa && G.pausa.motivos && G.pausa.motivos.has('carga')); } catch (e) { return false; } };
  function verHud() { if (hudEl) { const v = E.fase === 'juego' && !cargando() && !document.getElementById('c1-saltar'); if (hudEl.hidden === v) hudEl.hidden = !v; } }
  function salir() {
    if (!activo()) return false;
    E.fase = 'nada'; guia.ok = false; E.lleva = -1; E.gotasOn = false;
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    if (G.interaccion && G.interaccion.modo === MODO) G.interaccion.modo = modo0; modo0 = null;
    soltarMallas();
    if (hudEl) { hudEl.hidden = true; finEl.hidden = true; [hudEl, finEl].forEach(el => el.querySelectorAll('[data-k]').forEach(x => { if (!['r', 'p', 'fn'].includes(x.dataset.k) && !x.querySelector('svg')) x.textContent = ''; })); q(finEl, 'fn').textContent = ''; [hudEl, finEl].forEach(el => el.querySelectorAll('button').forEach(b => { b.textContent = ''; })); } // sin texto viejo (ni en otro idioma)
    document.body.classList.remove('pichones-on', 'pichones-fin');
    const poder = document.getElementById('v18-exp-poder'); if (poder) poder.hidden = true; // como en sembradora.js: el chip táctil del poder no se queda encima de la portada
    try { if (G.pausa && G.pausa.set) G.pausa.set('pichones', false); } catch (e) { /* sin pausa */ }
    return true;
  }
  addEventListener('keydown', e => {
    if (!activo()) return;
    if (e.key === 'Escape') {
      if (e.repeat || (G.ui && G.ui.cardOpen)) return;
      e.preventDefault(); e.stopImmediatePropagation(); salir(); return;
    }
    if (E.fase === 'vista' || E.fase === 'fin') { // fiesta y panel modales: las teclas del mundo no pasan; Tab, Enter y Espacio van a sus botones (no en el primer segundo)
      if (e.key === 'Tab') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (E.fase !== 'fin') return;
        const bs = finEl.querySelectorAll('button'), i = Array.prototype.indexOf.call(bs, document.activeElement), n = bs.length;
        const j = e.shiftKey ? (i <= 0 ? n - 1 : i - 1) : (i < 0 || i >= n - 1 ? 0 : i + 1);
        try { bs[j].focus({ preventScroll: true }); } catch (er) { /* */ }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const boton = E.fase === 'fin' && (e.key === 'Enter' || e.key === ' ') && performance.now() / 1000 - E.finP > 1 && e.target && e.target.closest && e.target.closest('#rr-fin button');
      e.stopImmediatePropagation(); if (!boton) e.preventDefault();
    }
  }, true);
  addEventListener('resize', () => { if (activo()) pintarHud(); });

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })(), pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const m = MV(), mv0 = { vx: m.vx, vz: m.vz, flying: m.flying }, yaw0 = G.camara ? G.camara.yaw : 0;
    const tecla = k => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); dispatchEvent(ev); dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); return ev; };
    const vis = id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0; };
    const ir = (x, z, alto) => { S.pos.x = x; S.pos.z = z; S.pos.y = H(x, z) + alto; m.vx = m.vz = 0; m.flying = true; };
    const aPichon = i => ir(pich[i].x + 0.6, pich[i].z, 2);
    const alNido = () => { S.pos.x = nido.x + 0.8; S.pos.z = nido.z; S.pos.y = nido.top + 1.5; m.vx = m.vz = 0; m.flying = true; };
    const lejos = () => ir(nido.x + 60, nido.z + 60, 12);
    const listo = () => { E.ultAccion = -9; E.pistaT = -9; };
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ }
      { const sx = document.getElementById('c1-saltar'); if (sx) { sx.click(); for (let i = 0; i < 60 && document.getElementById('c1-saltar'); i++) await new Promise(r => setTimeout(r, 50)); } } // como sembradoraTest: la apertura del capítulo se salta antes
      const t0z = performance.now();
      jugar({ semilla: 7 });
      const msZ = Math.round(performance.now() - t0z);
      const hb = hudEl.querySelector('[data-a="salir"]').getBoundingClientRect();
      check('Se abre con el HUD (reloj de lluvia 1:30, 0 de 3 y «Salir» de ≥ 44 px), los 3 pichones, el nido y la nube', activo() && !hudEl.hidden && finEl.hidden && q(hudEl, 'rt').textContent === '1:30' && q(hudEl, 'p').querySelectorAll('svg.on').length === 0 && hb.height >= 44 && hb.width >= 44 && pich.every(p => p.estado === 'suelo') && M.pichones.count === 3 && M.nido.visible && M.nube.visible && document.body.classList.contains('pichones-on'),
        q(hudEl, 'rt').textContent + ' · ' + Math.round(hb.height) + ' · ' + msZ + ' ms');
      check('2 mallas instanciadas (pichones y gotas) y 2 sueltas (nido y nube), todas del minijuego', R.scene.children.filter(o => o.isInstancedMesh && /^pichones:/.test(o.name)).length === 2 && R.scene.children.filter(o => /^pichones:/.test(o.name)).length === 4, R.scene.children.filter(o => /^pichones:/.test(o.name)).map(o => o.name).join(','));
      { // zona: el nido y los pichones en seco, sin copa, collider ni edificio encima, a 12–28 m del nido y separados
        const obst = []; cadaObstaculo((x, z, r) => { if (Math.hypot(x - nido.x, z - nido.z) < D_MAX + 12) obst.push([x, z, r]); });
        const seco = (x, z) => !mojado(x, z), sinNada = (x, z) => obst.every(([ox, oz, r]) => Math.hypot(x - ox, z - oz) >= r);
        const ds = pich.map(p => Math.hypot(p.x - nido.x, p.z - nido.z)), sep = Math.min(Math.hypot(pich[0].x - pich[1].x, pich[0].z - pich[1].z), Math.hypot(pich[0].x - pich[2].x, pich[0].z - pich[2].z), Math.hypot(pich[1].x - pich[2].x, pich[1].z - pich[2].z));
        const malos = pich.filter(p => !seco(p.x, p.z) || !sinNada(p.x, p.z)).length;
        check('Zona abierta: el nido y los 3 pichones en seco, sin copa, collider ni edificio encima, a 12–28 m del nido y separados (≥ 8 m)', seco(nido.x, nido.z) && sinNada(nido.x, nido.z) && !malos && ds.every(d => d >= D_MIN - 0.01 && d <= D_MAX + 0.01) && sep >= SEP - 0.01 && E.sitioN >= 12,
          'cerca de ' + E.zona + ' → ' + Math.round(nido.x) + ',' + Math.round(nido.z) + ' · sitio ' + E.sitioN + '/72 · d ' + ds.map(Math.round).join(',') + ' · sep ' + sep.toFixed(1) + ' · ' + obst.length + ' obstáculos · malos ' + malos);
      }
      check('El HUD no es una región viva (el reloj no se anuncia cada segundo); solo su aviso habla', !hudEl.hasAttribute('role') && !hudEl.hasAttribute('aria-live') && !q(hudEl, 'r').closest('[aria-live],[role="status"]') && q(hudEl, 'msg').getAttribute('aria-live') === 'polite');
      check('El botón Acción dice «Recoger» (con el icono del pichón)', G.interaccion && G.interaccion.modo === MODO && MODO.verbo === 'Recoger' && (!G.input || !G.input.actBtn || /svg/.test(getComputedStyle(G.input.actBtn).getPropertyValue('--icon'))));
      { const hr = hudEl.getBoundingClientRect(); aviso('¡Agárrate, pichón! Ahora, al nido', 'bien'); const mr = q(hudEl, 'msg').getBoundingClientRect(), choca = (r, h) => h.width > 0 && r.left < h.right && r.right > h.left && r.top < h.bottom && r.bottom > h.top;
        const tapa = ['b-act', 'stick', 'acts', 'minimapa', 'b-menu', 'b-diary', 'b-emotes', 'b-fly', 'b-jump', 'b-dash', 'b-land'].filter(id => { if (!vis(id)) return false; const r = document.getElementById(id).getBoundingClientRect(); return choca(r, hr) || choca(r, mr); });
        check('El HUD cabe en una franja arriba y ni él ni su aviso tapan los botones del juego', hr.left >= 0 && hr.right <= innerWidth && hr.top >= 0 && hr.height <= 64 && !tapa.length, `${innerWidth}×${innerHeight} · HUD ${Math.round(hr.width)}×${Math.round(hr.height)} · aviso ${Math.round(mr.width)}×${Math.round(mr.height)}` + (tapa.length ? ' · tapa ' + tapa.join(',') : '')); }
      check('La historia no se mezcla: cuenta como actividad (los avisos esperan) y el letrero, el aviso y los bocadillos no se ven',
        (!G.menuModos || !G.menuModos.ocupado || G.menuModos.ocupado()) && ['toast', 'prompt', 'quest', 'inv-cuenta', 'bocadillos'].every(id => !vis(id)));
      const mismoObjetivo = () => (!G.fx || !G.fx.guide || (() => { const g0 = G.fx.guide; let visto = null; G.fx.guide = t => { visto = t; }; try { guiar(); } finally { G.fx.guide = g0; } return visto === guia; })()) &&
        (!G.minimapa || !G.minimapa.marcadores || G.minimapa.marcadores().some(k => k.tipo === 'obj' && k.x === guia.x && k.z === guia.z));
      lejos(); apuntarGuia();
      { let bi = -1, bd = Infinity; pich.forEach((p, i) => { const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (d < bd) { bd = d; bi = i; } });
        check('La flecha y el minimapa apuntan a lo mismo: el pichón más cercano', guia.ok && guia.x === pich[bi].x && guia.z === pich[bi].z && mismoObjetivo(), guia.x.toFixed(1) + ',' + guia.z.toFixed(1)); }
      if (G.pausa && G.pausa.set && G.pausa.motivos) {
        const yaCarga = G.pausa.motivos.has('carga');
        G.pausa.set('carga', true); verHud(); const tapado = hudEl.hidden;
        if (!yaCarga) G.pausa.set('carga', false); verHud();
        check('Con la pantalla de carga el HUD espera y luego sale', tapado && (yaCarga || !hudEl.hidden), yaCarga + '/' + tapado + '/' + hudEl.hidden);
      }
      // Lejos de todo, Acción no recoge nada (y lo dice)
      listo(); lejos();
      check('Lejos de los pichones, Acción no recoge nada: «Acércate a un pichón»', !accion() && E.lleva < 0 && /Acércate a un pichón/.test(q(hudEl, 'msg').textContent), q(hudEl, 'msg').textContent);
      // Teclado (E) junto al pichón 0
      listo(); aPichon(0); paso(0.02);
      const avisoCerca = /Pulsa «Recoger»/.test(q(hudEl, 'msg').textContent);
      tecla('e');
      check('Con el teclado (E), junto a un pichón, se recoge («¡Agárrate, pichón!») y el botón pasa a «Dejar»', E.lleva === 0 && pich[0].estado === 'lleva' && avisoCerca && /Agárrate/.test(q(hudEl, 'msg').textContent) && MODO.verbo === 'Dejar' && q(hudEl, 'p').querySelectorAll('svg.lleva').length === 1, E.lleva + ' · ' + q(hudEl, 'msg').textContent);
      apuntarGuia();
      check('Llevando un pichón, la flecha y el minimapa apuntan al nido', guia.ok && guia.x === nido.x && guia.z === nido.z && mismoObjetivo());
      { // volando, el pichón va en las patas, bajo Vittata (se dibuja con ella)
        lejos(); paso(0.02); M.pichones.getMatrixAt(0, dummy.matrix); const v = new THREE.Vector3().setFromMatrixPosition(dummy.matrix); let bajo = false;
        for (let i = 0; i < M.pichones.count; i++) { M.pichones.getMatrixAt(i, dummy.matrix); v.setFromMatrixPosition(dummy.matrix); if (Math.hypot(v.x - S.pos.x, v.z - S.pos.z) < 0.01 && v.y < S.pos.y && v.y > S.pos.y - 1.2) bajo = true; }
        check('Volando, el pichón va en las patas de Vittata (sigue con ella)', bajo);
      }
      // De uno en uno: junto al pichón 1, llevando el 0, no se recoge otro
      listo(); aPichon(1);
      check('De uno en uno: llevando uno, no se recoge otro («¡De uno en uno!»)', !accion() && E.lleva === 0 && pich[1].estado === 'suelo' && /De uno en uno/.test(q(hudEl, 'msg').textContent), q(hudEl, 'msg').textContent);
      listo(); lejos();
      check('Lejos del nido no se deja: «Vuela al nido para dejarlo»', !accion() && E.lleva === 0 && /Vuela al nido/.test(q(hudEl, 'msg').textContent));
      listo(); alNido(); paso(0.02);
      const avisoNido = /Pulsa «Dejar»/.test(q(hudEl, 'msg').textContent);
      tecla('e');
      check('Junto al nido, Acción lo deja: «¡A salvo! 1 de 3», el HUD lo marca y el pichón se ve en el nido', avisoNido && E.salvados === 1 && pich[0].estado === 'nido' && E.lleva < 0 && /A salvo! 1 de 3/.test(q(hudEl, 'msg').textContent) && q(hudEl, 'p').querySelectorAll('svg.on').length === 1 && (pintar(), M.pichones.count === 3), q(hudEl, 'msg').textContent);
      // Machacar no sirve: 20 toques junto al pichón 1 recogen uno solo y no lo dejan; lejos del nido, tampoco sueltan
      listo(); aPichon(1); let hechos = 0; for (let i = 0; i < 20; i++) if (accion()) hechos++;
      for (let i = 0; i < 10; i++) { paso(0.1); accion(); }
      check('Machacar no sirve: 20 toques seguidos recogen un solo pichón y, lejos del nido, nadie se suelta', hechos === 1 && E.lleva === 1 && E.salvados === 1, hechos + ' · lleva ' + E.lleva);
      // Táctil: el botón Acción deja el pichón 1 en el nido y recoge el 2
      if (G.input && G.input.actBtn) {
        const toque = () => { listo(); G.input.actBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })); G.input.actBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'touch' })); };
        alNido(); toque(); const dos = E.salvados === 2;
        aPichon(2); toque(); const coge = E.lleva === 2;
        check('Con el botón táctil también se deja (2 de 3) y se recoge el último', dos && coge, E.salvados + ' · lleva ' + E.lleva);
      } else { listo(); alNido(); accion(); listo(); aPichon(2); accion(); }
      // Reloj de lluvia: la nube se agrisa y, en los últimos 15 s, gotas y aviso con sonido
      const c0 = M.nube.material.color.r;
      E.t = DUR - GOTAS_T - 0.05; lejos(); paso(0.1);
      check('Reloj de lluvia: la nube se pone gris (no negra) y en los últimos 15 s caen gotas finas con aviso', M.nube.material.color.r < c0 && M.nube.material.color.r > 0.2 && E.gotasOn && M.gotas.count === NG && /primeras gotas/.test(q(hudEl, 'msg').textContent) && q(hudEl, 'r').classList.contains('poco'), c0.toFixed(2) + ' → ' + M.nube.material.color.r.toFixed(2) + ' · gotas ' + M.gotas.count);
      { // «Reducir movimiento»: contadores (chispas lanzadas, gotas dibujadas y sonidos), no estilos
        const fx = G.fx, b0 = fx && fx.burst, au = G.audio, pl0 = au && au.play; let nChispas = 0; const sonidos = [];
        html.classList.add('mov-reducido');
        try {
          if (fx) fx.burst = () => { nChispas++; };
          if (au) au.play = n => { sonidos.push(n); };
          G.quiet = false;
          paso(0.05); const gotasRed = M.gotas.count;
          E.gotasOn = false; E.t = DUR - GOTAS_T - 0.05; paso(0.1); // el aviso de las gotas también suena
          const sp = { estado: pich[2].estado, lleva: E.lleva, salvados: E.salvados, todos: E.todos, fase: E.fase, t: E.t };
          listo(); alNido(); accion(); // deja el último: fiesta sin plumas ni chispas
          const fiestaRed = nChispas, faseRed = E.fase;
          check('Con «Reducir movimiento»: sin gotas, sin plumas ni chispas al dejar y en la fiesta, sin pausa de vista, y los avisos suenan', gotasRed === 0 && fiestaRed === 0 && faseRed === 'fin' && sonidos.filter(n => n === 'aviso').length >= 1, 'gotas ' + gotasRed + ' · chispas ' + fiestaRed + ' · ' + faseRed + ' · ' + sonidos.join(','));
          // vuelve atrás para seguir la prueba sin «Reducir movimiento»
          G.quiet = true; if (G.pausa && G.pausa.set) G.pausa.set('pichones', false); finEl.hidden = true; document.body.classList.remove('pichones-fin');
          if (logroId) { clearTimeout(logroId); logroId = 0; }
          E.jugadas = 0; E.mejor = 0; E.mejorT = 0; E.nuevo = false; try { localStorage.removeItem(ALM); } catch (e) { /* */ }
          pich[2].estado = sp.estado; pich[2].hueco = 0; E.lleva = sp.lleva; E.salvados = sp.salvados; E.todos = sp.todos; E.fase = 'juego'; E.t = sp.t; hudEl.hidden = false;
        } finally { G.quiet = true; if (fx) fx.burst = b0; if (au) au.play = pl0; html.classList.remove('mov-reducido'); }
        let nC2 = 0; const b1 = fx && fx.burst;
        if (fx) { fx.burst = () => { nC2++; }; try { paso(0.05); const gotasSi = M.gotas.count; chispas(0, 0, 0, 'gold', 3); check('Sin «Reducir movimiento» sí hay gotas y chispas (los contadores funcionan)', nC2 === 1 && gotasSi === NG, nC2 + ' · ' + gotasSi); } finally { fx.burst = b1; } }
      }
      // El último, al nido: fiesta y panel
      E.t = 52.3; listo(); alNido();
      let nFiesta = 0; const fxF = G.fx, bF = fxF && fxF.burst; if (fxF) fxF.burst = () => { nFiesta++; };
      try { accion(); } finally { if (fxF) fxF.burst = bF; }
      const enVista = E.fase === 'vista' && E.todos && hudEl.hidden && finEl.hidden && nFiesta >= 2;
      const tV = tecla('p');
      check('Con los 3 a salvo: fiesta (plumas y chispas, sin teclas del mundo) y luego el panel', enVista && tV.defaultPrevented, E.fase + ' · fiesta ' + nFiesta);
      for (let i = 0; i < 60 && E.fase === 'vista'; i++) paso(0.05);
      const fr = finEl.getBoundingClientRect(), bots = [...finEl.querySelectorAll('button')].map(b => b.getBoundingClientRect());
      check('Panel final: «¡Todos a salvo!», 3/3, «¡Nuevo récord: 0:53!», el detalle, «Otra vez» y «Salir»', E.fase === 'fin' && !finEl.hidden && /Todos a salvo/.test(q(finEl, 'ft').textContent) && q(finEl, 'fn').textContent === '3/3' && /Nuevo récord: 0:53!/.test(q(finEl, 'fmsg').textContent) && /secos y felices en 0:53/.test(q(finEl, 'fdet').textContent), q(finEl, 'ft').textContent + ' · ' + q(finEl, 'fmsg').textContent + ' · ' + q(finEl, 'fdet').textContent);
      check('El récord (pichones y tiempo) se guarda en este dispositivo', (() => { const r = leerRec(); return r && r.mejor === 3 && r.tiempo === 53 && r.jugadas === 1; })(), JSON.stringify(leerRec()));
      check('Cabe en la pantalla: panel dentro y botones del final ≥ 54 px', bots.every(b => b.height >= 54 && b.width >= 54) && fr.left >= 0 && fr.right <= innerWidth && fr.top >= 0 && fr.bottom <= innerHeight, `${innerWidth}×${innerHeight} · ${Math.round(fr.width)}×${Math.round(fr.height)}`);
      await new Promise(r => setTimeout(r, 30));
      const tP = tecla('p'), tE = tecla('e');
      check('El panel es modal: el mundo en pausa, las teclas del mundo no pasan y el foco va al panel', (!G.pausa || !G.pausa.motivos || G.pausa.motivos.has('pichones')) && tP.defaultPrevented && tE.defaultPrevented && E.fase === 'fin' && document.activeElement === finEl && ['minimapa', 'guia-hud', 'keyhint'].every(id => !vis(id)), document.activeElement && (document.activeElement.id || document.activeElement.tagName));
      {
        const enPanel = []; for (const k of ['Tab', 'Tab', 'Tab']) { const t = tecla(k); enPanel.push(t.defaultPrevented && finEl.contains(document.activeElement) && document.activeElement !== finEl); }
        const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); dispatchEvent(ev); enPanel.push(finEl.contains(document.activeElement));
        const fuera = ['b-diary', 'b-menu', 'b-emotes', 'b-nido'].filter(id => vis(id));
        check('El foco no sale del panel con Tab y Diario, Gestos y el menú no quedan encima', enPanel.every(Boolean) && !fuera.length, enPanel.join(',') + (fuera.length ? ' · se ve ' + fuera.join(',') : ''));
        finEl.focus();
      }
      const ae = G.aula && G.aula.aj;
      if (ae) {
        const idi0 = ae.idioma; ae.idioma = 'en'; pintarHud(); pintarFin();
        const txt = hudEl.textContent + ' ' + finEl.textContent + ' ' + MODO.verbo + ' ' + (q(hudEl, 'p').getAttribute('aria-label') || '') + ' ' + (q(hudEl, 'r').getAttribute('aria-label') || '');
        check('En inglés no queda texto en español (All safe!, New record, dry and happy, Play again, Exit, Pick up)', /All safe!/.test(txt) && /New record: 0:53!/.test(txt) && /dry and happy/.test(txt) && /Play again/.test(txt) && /Exit/.test(txt) && /Pick up/.test(txt) && /Chicks safe/.test(txt) && /Rain in/.test(txt) && !/[áéíóúñ¡]|Salir|Otra vez|Récord|Pichones|pichones|Recoger|Lluvia/.test(txt), txt.slice(0, 240));
        ae.idioma = idi0; pintarHud(); pintarFin();
      }
      finEl.querySelector('[data-a="otra"]').click();
      check('«Otra vez» empieza limpio (1:30, 0 de 3, los 3 en el suelo, sin panel ni pausa)', E.fase === 'juego' && E.salvados === 0 && E.lleva < 0 && pich.every(p => p.estado === 'suelo') && finEl.hidden && q(hudEl, 'rt').textContent === '1:30' && !E.gotasOn && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('pichones')) && M && M.pichones.count === 3,
        [E.fase, E.salvados, E.lleva, finEl.hidden, q(hudEl, 'rt').textContent].join('/'));
      // Llega la lluvia con 1 a salvo y otro en las patas: no castiga y el récord no baja
      listo(); aPichon(0); accion(); listo(); alNido(); accion(); listo(); aPichon(1); accion();
      lejos(); E.t = DUR - 0.05; paso(0.1);
      for (let i = 0; i < 60 && E.fase === 'vista'; i++) paso(0.05);
      check('Si llega la lluvia: «¡Llegó la lluvia!», 1/3, los demás se tapan con una hoja y el récord (3 en 0:53) sigue', E.fase === 'fin' && /Llegó la lluvia/.test(q(finEl, 'ft').textContent) && q(finEl, 'fn').textContent === '1/3' && /hoja grande/.test(q(finEl, 'fdet').textContent) && /Récord: 0:53/.test(q(finEl, 'fmsg').textContent) && leerRec().mejor === 3 && leerRec().tiempo === 53 && leerRec().jugadas === 2 && E.lleva < 0, q(finEl, 'fmsg').textContent + ' · ' + q(finEl, 'fdet').textContent);
      finEl.querySelector('[data-a="otra"]').click();
      E.t = DUR; paso(0.05); for (let i = 0; i < 60 && E.fase === 'vista'; i++) paso(0.05);
      check('Sin ningún pichón, nunca castiga: «¡Casi!» con la pista', E.fase === 'fin' && /Casi! Baja junto a un pichón/.test(q(finEl, 'fmsg').textContent), q(finEl, 'fmsg').textContent);
      let soltadas = 0; for (const k of ['pichones', 'gotas']) M[k].addEventListener('dispose', () => { soltadas++; });
      finEl.querySelector('[data-a="salir"]').click();
      check('Al salir se sueltan las 2 mallas instanciadas (sus búferes de la GPU también)', soltadas === 2, soltadas);
      check('«Salir» lo quita todo (HUD, panel, clases, pausa, mallas fuera de la escena y Acción de siempre)', !activo() && hudEl.hidden && finEl.hidden && !/pichones-(on|fin)/.test(document.body.className) && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('pichones')) && !M && !R.scene.children.some(o => /^pichones:/.test(o.name)) && (!G.interaccion || G.interaccion.modo !== MODO) && !hudEl.textContent.trim() && !finEl.textContent.trim());
      jugar({ semilla: 3 });
      { // al salir a media partida, el chip táctil del poder no se queda encima de la portada
        let chip = document.getElementById('v18-exp-poder'), puesto = false;
        if (!chip) { chip = document.createElement('button'); chip.id = 'v18-exp-poder'; document.body.appendChild(chip); puesto = true; }
        const h0 = chip.hidden; chip.hidden = false; hudEl.querySelector('[data-a="salir"]').click(); const oculto = chip.hidden;
        if (puesto) chip.remove(); else chip.hidden = h0;
        check('Al salir a media partida, el chip «Tu poder» no se queda encima de la portada', oculto && !activo());
      }
      jugar({ semilla: 3 });
      const ev = tecla('Escape');
      check('Esc en plena partida también sale', !activo() && ev.defaultPrevented && hudEl.hidden);
      check('Sonidos que ya existen (pickup, encaje, aviso, boton, panel_final, logro)', !G.audio || !G.audio.has || ['pickup', 'encaje', 'aviso', 'boton', 'panel_final', 'logro'].every(n => G.audio.has(n)));
    } catch (e) { check('Sin errores', false, e && (e.stack || e.message)); }
    finally {
      salir(); G.quiet = q0; azarS = 0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; m.vx = mv0.vx; m.vz = mv0.vz; m.flying = mv0.flying; if (G.camara) G.camara.yaw = yaw0;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  const objetivo = () => (E.fase === 'juego' && guia.ok ? guia : null); // lo lee el minimapa (minimapa.js objetivo()): la estrella marca lo mismo que la flecha
  G.pichonesApi = { jugar, salir, activo, accion, paso, test, objetivo,
    estado: () => ({ fase: E.fase, salvados: E.salvados, lleva: E.lleva, restante: restante(), mejor: E.mejor, tiempo: E.mejorT }),
    _dev: { E, pich, nido } };
  return G.pichonesApi;
};
