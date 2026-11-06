/* Juego · V18.3 · primera misión de los personajes históricos: «El puerto que volvió a vivir» (G.v18puerto).
   Directiva docs/DIRECTIVA_V18_3_RESOLUCION.md §7 (9 pasos) y diseño docs/equipo/V18_3_DISENO.md §2. Contenido adicional del mundo
   abierto: no toca los seis capítulos ni sus misiones.
   - Dónde: Puerto de La Mina (plaza 73,6, −75,2), en la ladera sin sendero entre la plaza y la meseta de las tres torres. Hoy esa
     ladera es más empinada que lo que se sube a pie (48°): se vuela o se rodea. La misión AÑADE un acceso a pie (una escalera de
     tablas) y no tapa nada de lo que ya hay: ni el río, ni la poza y la cascada (Retos), ni la gruta, ni la ruta de la gota del
     cap. 1, ni el sendero de La Mina, ni la puerta del bohío.
   - Cuándo: con la bandera V18 y el puente de Villa Raíz ya reparado (el jugador ya sabe reparar). Una vez por sesión, un aviso y
     la bandera verde del minimapa (si no hay otra puesta).
   - Los 9 pasos (estado G.v18.mundo.puerto_mina: obra → descubierto → investigado → desactivado → reparado; solo avanza):
     1 obra irresponsable del Constructor (andamio a medias, escombros) · 2 la perforadora de Tuerca, atascada al pie de la ladera,
     tapa la subida (collider; bocanadas de polvo que empujan suave, nada de daño) · 3 Vittata lo descubre (la Ingeniera se lo
     cuenta) · 4 investiga: 3 pistas (con un poder OJOS brillan y hay ruta dorada; si no, la Ingeniera señala la última) y 3
     aciertos con el poder de su especie sobre el engranaje (motor de habilidades V18.1, como la Sombra de Tormenta) · 5 la
     Ingeniera apaga la máquina mientras el jugador sostiene el freno · 6 3 tablas y 1 cuerda (de la misión: no gastan S.inv) ·
     7 se repara el acceso (el estado se guarda antes de los efectos) · 8 escalera caminable (rampas del terreno), faroles,
     banderines lisos; la máquina queda reconvertida (verde, con maceta y farol); el Constructor pasa a «reparador» y la Ingeniera a
     «responsable» · 9 todo persiste (se aplica al iniciar, en G.on('apply') y con cada cambio del mundo).
   - XP V18.2: 150 al terminar, una sola vez, también si evolucion.js se carga después (no se toca evolucion.js).
   - Controles: PC, Acción (E) y G para el poder; táctil, el botón Acción y un botón «Poder» (≥ 44 px) que solo sale junto a la
     máquina en el paso 4. Dentro de ese radio se toma G.interaccion.modo y se devuelve al salir.
   Solo con la bandera V18 (src/boot.js). Prueba: AV.v18PuertoTest(). */
window.AVV18Puerto = function (G) {
  'use strict';
  if (G.v18puerto) return G.v18puerto;
  const V = G.v18 || window.AVV18Progreso(G);
  const N = G.v18npc, H = G.v18hab;
  const S = G.S, T = G.terreno, scene = G.renderer.scene;
  const ID = 'puerto_mina';
  const ESTADOS = ['obra', 'descubierto', 'investigado', 'desactivado', 'reparado'];
  const XP_FIN = 150, R_DESCUBRE = 14, R_ENCUENTRO = 16, R_HUD = 45, R_AVISO = 40, FRENO_S = 3, BOCANADA_S = 5;
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  // Medido en el mapa real (assets/data/mapa_cap1*.js) y en el juego: eje de la escalera de A (pie, plaza) a B (borde de la meseta)
  const SITIO = { plaza: { x: 73.6, z: -75.2 }, a: { x: 74.4, z: -73.25 }, b: { x: 85.6, z: -74.45 } };
  // Lo que no se puede tapar (diseño §0): [nombre, x, z, distancia mínima] y tramos [nombre, x0, z0, x1, z1, mínima]
  const RESPETAR = [['poza y cascada de La Mina', 72, -91.5, 10], ['gruta', 65.5, -98.5, 8], ['secreto de la cascada', 61, -109, 8], ['corriente de la neblina', 72, -104, 12],
    ['torre 1', 88, -80, 3], ['torre 2', 92, -68, 3], ['torre 3', 102, -74, 3], ['toldo de la plaza', 75.1, -76.7, 2], ['toldo de la meseta', 88.6, -70.7, 2.5], ['canoa', 75.1, -69.2, 2.5]];
  const TRAMOS = [['ruta de la gota (cap. 1)', 78, -129, 66, -70, 5], ['sendero de La Mina', 126, -60, 86, -86, 6]];
  const TXT = {
    aviso: 'En Puerto de La Mina retumba una máquina… La bandera verde del mapa te lleva.',
    llegada: [['constructor', '¡Más rápido! Esta escalera tiene que estar lista hoy.'], ['ingeniera', 'Pero en esa ladera anidan cotorras… y la máquina se atascó.'], ['constructor', '¿Las cotorras? Se mudan un ratito y ya. ¡Esta obra no se para!']],
    descubre: ['¡Hola, Vittata! Qué bueno que llegaste.', 'Mi jefe le compró a Tuerca esta perforadora para hacer escalones a toda prisa. Se trabó y ahora tapa la única subida a pie.', 'Antes de tocarla hay que entender qué le pasa. ¿Me ayudas a buscar pistas?'],
    pistas: { tuerca: ['Mirar la tuerca suelta', 'Una tuerca suelta del engranaje: por eso se trabó.'], plano: ['Mirar el plano roto', 'El plano de la obra… ¡nadie marcó los nidos de la ladera!'], aceite: ['Mirar la mancha de aceite', 'Aceite en el suelo: la máquina trabajó sin parar ni revisarse.'] },
    ojos: 'Tus ojos ven lo que otros no: las pistas brillan y una ruta dorada lleva al engranaje.',
    senala: 'Mira lo que brilla junto a la máquina: ahí falta una pista.',
    trabado: '¡Ya sé! El engranaje está trabado. Con tu poder lo aflojamos: tres veces.',
    acierto: '¡El engranaje se movió! {}/3', falla: 'Mira al engranaje y acércate un poco más.', espera: 'Tu poder se está recargando…',
    investigado: ['¡Se aflojó! Ahora la apago yo.', 'Tú sostén el freno, la palanca roja del costado, hasta que se pare.'],
    freno: 'Sostener el freno', frenoVa: 'Sostén el freno… {}%', frenoSuelta: '¡No sueltes el freno! Vuelve a la palanca.',
    desactivado: ['¡Listo, apagada! Para la escalera faltan 3 tablas y una cuerda: quedaron tiradas por la obra.', 'Una tabla voló hasta arriba de la meseta. ¡A volar!'],
    tabla: 'Recoger tabla', cuerda: 'Recoger cuerda', mas: '+1 material de la escalera ({}/4)',
    reparar: 'Reparar la escalera con la Ingeniera', falta: 'Faltan materiales: {}/4. Busca las tablas y la cuerda por la obra.',
    reparado: '¡La escalera de La Mina está lista! Ya se sube a pie del puerto a la meseta.',
    fin: [['ingeniera', '¡Mira cómo quedó! Y la máquina ahora riega flores.'], ['constructor', 'Construir rápido no es construir bien… Esta vez miré primero quién vive aquí.']],
    obj: { obra: 'Acércate a la máquina del pie de la ladera.', pistas: 'Busca pistas alrededor de la máquina: {}/3', poder: 'Destraba el engranaje con tu poder: {}/3',
      investigado: 'Sostén el freno de la máquina con la Ingeniera.', materiales: 'Recupera las tablas y la cuerda: {}/4', repara: 'Repara la escalera con la Ingeniera, al pie de la ladera.' },
    titulo: 'El puerto que volvió a vivir', poder: 'Poder',
    guia: '{}: mira al engranaje y pulsa Acción o G', guiaT: 'Toca Poder mirando al engranaje', guiaEscudo: 'Escudo de plumas: ábrelo cuando la máquina sople (Acción o G)'
  };
  const con = (t, ...v) => { let i = 0; return t.replace(/\{\}/g, () => String(v[i++])); };
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3200); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18puerto', ev); } catch (e) { /* sin oyentes */ } };
  const guardarJuego = () => { try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* sin guardado */ } };

  // ---------- Geometría del sitio ----------
  const ux0 = SITIO.b.x - SITIO.a.x, uz0 = SITIO.b.z - SITIO.a.z, L = Math.hypot(ux0, uz0);
  const U = { x: ux0 / L, z: uz0 / L }, Nn = { x: -uz0 / L, z: ux0 / L }; // a lo largo de la escalera y a su izquierda (hacia el norte)
  const en = (s, lado) => ({ x: SITIO.a.x + U.x * s + Nn.x * (lado || 0), z: SITIO.a.z + U.z * s + Nn.z * (lado || 0) });
  const alto = (x, z) => T.height(x, z);
  const MAQ = { on: en(2.7, 0), off: en(2.1, 3.4) };
  const P = {
    freno: en(0.75, -0.95), panel: en(2.9, 1.95), reparar: en(-0.6, 0),
    ingObra: en(-1.6, 2.6), ingFin: en(-1.4, -2.3), conObra: en(L + 2.4, -1.8), conFin: en(L + 0.9, 1.7),
    pistas: { tuerca: en(1.0, 1.4), plano: en(-3.2, -2.0), aceite: en(3.6, -2.6) },
    mats: [['v18_puerto_tabla_1', 'tabla', en(-3.6, 3.2)], ['v18_puerto_tabla_2', 'tabla', en(5.0, -2.8)], ['v18_puerto_tabla_3', 'tabla', en(L + 1.8, 2.6)], ['v18_puerto_cuerda', 'cuerda', en(-1.2, -3.6)]]
  };
  // sitio seco y libre cerca de (x, z) (mismo criterio que reparar.js)
  function enSeco(x, z) {
    const seco = (px, pz) => {
      try {
        const h = alto(px, pz);
        if (G.agua && G.agua.levelAt(px, pz) > h - 0.2) return false;
        const F = G.fisica, q = { x: px, z: pz, y: h };
        if (F && F.pushOut) for (const c of F.colliders) { if (c.kind === 'v18maquina') continue; F.pushOut(q, c, 0.7); if (q.x !== px || q.z !== pz) return false; }
      } catch (e) { /* sin consulta */ }
      return true;
    };
    if (seco(x, z)) return { x, z };
    for (let r = 1; r <= 4; r += 1) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * 0.785) * r, pz = z + Math.sin(a * 0.785) * r; if (seco(px, pz)) return { x: px, z: pz }; }
    return { x, z };
  }
  // Perfil de la escalera: envolvente superior del terreno (+ holgura) de A a B; cada tramo recto es una rampa del terreno.
  // Así ningún punto del suelo asoma por encima de las tablas (donde asomara, mandaría la ladera de 53° y se resbalaría).
  function perfil() {
    const pts = [];
    for (let s = 0; s <= L + 1e-6; s += 0.25) { const p = en(Math.min(s, L), 0), sc = Math.min(s, L); pts.push([sc, alto(p.x, p.z) + (sc < 0.1 || sc > L - 0.1 ? 0.03 : 0.14)]); }
    const h = [];
    for (const p of pts) { while (h.length >= 2) { const [a, b] = [h[h.length - 2], h[h.length - 1]]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0) h.pop(); else break; } h.push(p); }
    // une tramos casi iguales (< 5°) para no tener escalones de más
    const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
    const r = [h[0]];
    for (let i = 1; i < h.length - 1; i++) if (Math.abs(ang(r[r.length - 1], h[i]) - ang(h[i], h[i + 1])) > 0.087) r.push(h[i]);
    r.push(h[h.length - 1]);
    // la unión puede dejar el suelo apenas por encima: se sube el vértice lo que haga falta
    for (let i = 0; i < r.length - 1; i++) for (const p of pts) if (p[0] > r[i][0] && p[0] < r[i + 1][0]) {
      const t = (p[0] - r[i][0]) / (r[i + 1][0] - r[i][0]), y = r[i][1] + (r[i + 1][1] - r[i][1]) * t;
      if (y < p[1]) { const d = p[1] - y; if (i > 0) r[i][1] += d; if (i + 1 < r.length - 1) r[i + 1][1] += d; }
    }
    return r;
  }
  const yEscalera = s => { const r = M.perfil; for (let i = 0; i < r.length - 1; i++) if (s <= r[i + 1][0] || i === r.length - 2) { const t = Math.max(0, Math.min(1, (s - r[i][0]) / (r[i + 1][0] - r[i][0]))); return r[i][1] + (r[i + 1][1] - r[i][1]) * t; } return r[0][1]; };
  const pendienteMax = () => { let m = 0; const r = M.perfil; for (let i = 0; i < r.length - 1; i++) m = Math.max(m, Math.atan2(r[i + 1][1] - r[i][1], r[i + 1][0] - r[i][0]) * 180 / Math.PI); return m; };

  // ---------- Estado ----------
  const estado = () => { const e = V.mundo(ID); return ESTADOS.indexOf(e) >= 0 ? e : 'obra'; }; // desconocido: como obra
  const rango = e => ESTADOS.indexOf(e);
  const reparado = () => estado() === 'reparado';
  function avanzar(e) { if (rango(e) <= rango(estado())) return false; V.cambiarMundo(ID, e); emitir({ tipo: 'estado', estado: e }); return true; }
  const recogida = k => V.mundo(k) === 'recogida';
  const materiales = () => P.mats.filter(m => recogida(m[0])).length;
  // sesión (rehacerlas no cuesta nada): pistas vistas y aciertos del paso 4
  const A = { pistas: new Set(), aciertos: 0, j: null, freno: 0, frenando: false, bocanadaT: BOCANADA_S, manual: false, forzar: false, avisado: false, llegada: false, descubriendo: false, guia: false, senalada: false, empuje: null };
  const listaMision = () => !!(G.V18 || A.forzar) && V.mundo('puente_villa') === 'reparado' && M.valido && (!G.zonas || !G.zonas.activa || G.zonas.dentro(SITIO.plaza.x, SITIO.plaza.z));

  // ---------- Escena (primitivas; ningún asset nuevo) ----------
  const M = { valido: false, perfil: null, hecho: false, rampas: [], collider: null, despejado: false };
  const mats = {};
  const mat = (k, c, o) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.75, metalness: 0 }, o || {})));
  const caja = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cil = (r0, r1, h, n, m) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n || 10), m);
  const grupo = n => { const g = new THREE.Group(); g.name = n; scene.add(g); return g; };
  let gObra, gEscalera, gMaq, gPistas = {}, gMats = {}, gRuta;
  const maq = { cuerpo: null, engranaje: null, broca: null, luces: [], flor: null, pos: { x: 0, z: 0 }, giro: 0, pintada: null, mueve: null };
  function construir() {
    if (M.hecho) return;
    M.hecho = true;
    M.perfil = perfil();
    const madera = mat('madera', '#9a6a3c'), maderaO = mat('maderaO', '#6e4a2a'), metal = mat('metal', '#7c8790', { metalness: 0.5, roughness: 0.45 }), piedra = mat('piedra', '#8d8a84');
    // 1 · obra a medias: andamio en la ladera y escombros (solo antes de reparar)
    gObra = grupo('v18-puerto-obra');
    for (const [s, l] of [[5.2, -1.3], [5.2, 1.3], [7.6, -1.3], [7.6, 1.3]]) { const p = en(s, l), y = alto(p.x, p.z), h = 2.6; const o = cil(0.07, 0.07, h, 6, metal); o.position.set(p.x, y + h / 2, p.z); gObra.add(o); }
    for (const [s0, s1, l, dy] of [[5.2, 7.6, -1.3, 2.3], [5.2, 7.6, 1.3, 1.6]]) { const p0 = en(s0, l), p1 = en(s1, l), y = Math.max(alto(p0.x, p0.z), alto(p1.x, p1.z)) + dy - 1.2; const o = caja(2.5, 0.08, 0.4, madera); o.position.set((p0.x + p1.x) / 2, y, (p0.z + p1.z) / 2); o.rotation.y = Math.atan2(-U.z, U.x); o.rotation.z = 0.3; gObra.add(o); }
    for (const [s, l, r] of [[3.9, 1.8, 0.35], [4.3, -1.9, 0.28], [6.5, 0.2, 0.4], [9.1, -1.4, 0.3], [L + 1.2, -0.8, 0.32]]) { const p = en(s, l), o = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), piedra); o.position.set(p.x, alto(p.x, p.z) + r * 0.6, p.z); o.rotation.set(s, l, r); gObra.add(o); }
    for (const [s, l, a] of [[4.6, 0.9, 0.5], [8.2, 1.9, -0.7]]) { const p = en(s, l), o = caja(1.6, 0.06, 0.3, maderaO); o.position.set(p.x, alto(p.x, p.z) + 0.08, p.z); o.rotation.set(0.15, a, 0.25); gObra.add(o); }
    // 8 · la escalera (oculta hasta reparar): tablas, barandas, faroles y banderines lisos
    gEscalera = grupo('v18-puerto-escalera');
    const pasos = Math.floor(L / 0.48), tablas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.08, 2.1), madera, pasos + 1), o3 = new THREE.Object3D();
    for (let i = 0; i <= pasos; i++) { const s = Math.min(L, i * 0.48 + 0.2), p = en(s, 0); o3.position.set(p.x, yEscalera(s) - 0.05, p.z); o3.rotation.set(0, Math.atan2(-U.z, U.x), 0); o3.updateMatrix(); tablas.setMatrixAt(i, o3.matrix); }
    gEscalera.add(tablas);
    const nPost = Math.ceil(L / 1.6) + 1, postes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 6), maderaO, nPost * 2);
    let k = 0;
    for (let i = 0; i < nPost; i++) for (const l of [-1.1, 1.1]) { const s = Math.min(L, i * 1.6), p = en(s, l); o3.position.set(p.x, yEscalera(s) + 0.45, p.z); o3.rotation.set(0, 0, 0); o3.updateMatrix(); postes.setMatrixAt(k++, o3.matrix); }
    gEscalera.add(postes);
    const r = M.perfil;
    for (let i = 0; i < r.length - 1; i++) for (const l of [-1.1, 1.1]) {
      const p0 = en(r[i][0], l), p1 = en(r[i + 1][0], l), y0 = r[i][1] + 0.9, y1 = r[i + 1][1] + 0.9, dl = Math.hypot(p1.x - p0.x, y1 - y0, p1.z - p0.z);
      const b = caja(dl, 0.07, 0.07, madera); b.position.set((p0.x + p1.x) / 2, (y0 + y1) / 2, (p0.z + p1.z) / 2);
      b.rotation.set(0, Math.atan2(-U.z, U.x), Math.atan2(y1 - y0, Math.hypot(p1.x - p0.x, p1.z - p0.z))); b.rotation.order = 'YZX'; gEscalera.add(b);
    }
    const luz = mat('luz', '#ffd98a', { emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 1.2 });
    const faroles = [];
    for (const s of [0, L]) {
      const p = en(s, 1.55), y = s ? yEscalera(L) : yEscalera(0), poste = cil(0.07, 0.09, 2.4, 6, mat('negro', '#2c2a28', { metalness: 0.4 })); poste.position.set(p.x, y + 1.2, p.z);
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), luz); l.position.set(p.x, y + 2.45, p.z); gEscalera.add(poste, l); faroles.push({ x: p.x, y: y + 2.4, z: p.z });
    }
    // banderines lisos de colores (ninguna bandera de país), colgando de un farol al otro
    const COLS = ['#3fae5a', '#ffd23a', '#f08a2a', '#2bb3b1', '#9b6ad0'], nB = 16, tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.34, 0], 3)); tri.computeVertexNormals();
    const banderines = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), nB);
    const [f0, f1] = faroles;
    for (let i = 0; i < nB; i++) { const t = (i + 0.5) / nB; o3.position.set(f0.x + (f1.x - f0.x) * t, f0.y + (f1.y - f0.y) * t - Math.sin(Math.PI * t) * 0.9, f0.z + (f1.z - f0.z) * t); o3.rotation.set(0, Math.atan2(-U.z, U.x), 0); o3.updateMatrix(); banderines.setMatrixAt(i, o3.matrix); banderines.setColorAt(i, new THREE.Color(COLS[i % COLS.length]).convertSRGBToLinear()); }
    gEscalera.add(banderines);
    const cuerdaB = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 13 }, (_, i) => { const t = i / 12; return new THREE.Vector3(f0.x + (f1.x - f0.x) * t, f0.y + (f1.y - f0.y) * t - Math.sin(Math.PI * t) * 0.9, f0.z + (f1.z - f0.z) * t); }));
    gEscalera.add(new THREE.Line(cuerdaB, new THREE.LineBasicMaterial({ color: '#e8dcc0' })));
    // rampas del terreno (una por tramo): solo sostienen con la escalera reparada
    for (let i = 0; i < r.length - 1; i++) {
      const p0 = en(r[i][0], 0), p1 = en(r[i + 1][0], 0);
      const pl = T.addPlatform({ tipo: 'rampa', a: [p0.x, r[i][1], p0.z], b: [p1.x, r[i + 1][1], p1.z], ancho: 2.2, id: 'v18_escalera_mina' });
      pl.when = reparado; M.rampas.push(pl);
    }
    // 2 · la perforadora de Tuerca (primitivas; cuerpo, orugas, engranaje, broca, luces, palanca y panel)
    gMaq = grupo('v18-puerto-maquina');
    const naranja = mat('maqCuerpo', '#d9822b', { roughness: 0.55, metalness: 0.2 }), oscuro = mat('oscuro', '#2d2f33', { roughness: 0.8 });
    maq.cuerpo = caja(2.2, 1.3, 1.8, naranja); maq.cuerpo.position.y = 1.05; gMaq.add(maq.cuerpo);
    for (const l of [-0.95, 0.95]) { const o = caja(2.4, 0.5, 0.35, oscuro); o.position.set(0, 0.25, l); gMaq.add(o); }
    const tanque = cil(0.45, 0.45, 1.2, 12, mat('tanque', '#b8c0c6', { metalness: 0.5, roughness: 0.4 })); tanque.rotation.z = Math.PI / 2; tanque.position.set(-0.3, 1.95, 0); gMaq.add(tanque);
    maq.engranaje = new THREE.Group(); maq.engranaje.position.set(1.18, 1.35, 0);
    const disco = cil(0.62, 0.62, 0.22, 16, metal); disco.rotation.x = Math.PI / 2; disco.rotation.z = Math.PI / 2; maq.engranaje.add(disco);
    for (let i = 0; i < 10; i++) { const d = caja(0.12, 0.2, 0.22, metal), a = i / 10 * Math.PI * 2; d.position.set(0, Math.cos(a) * 0.7, Math.sin(a) * 0.7); d.rotation.x = -a; maq.engranaje.add(d); }
    gMaq.add(maq.engranaje);
    maq.broca = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.2, 10), metal); maq.broca.rotation.z = -Math.PI / 2; maq.broca.position.set(1.75, 0.75, 0); gMaq.add(maq.broca);
    for (const [x, c] of [[-0.6, '#ff4a3a'], [0.2, '#ffb02e']]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), new THREE.MeshBasicMaterial({ color: c })); l.position.set(x, 1.78, 0.75); l.userData.c = c; maq.luces.push(l); gMaq.add(l); }
    // el freno: palanca roja en la trasera (lado de la plaza), donde el jugador la sostiene
    const palanca = cil(0.05, 0.05, 0.9, 6, mat('rojo', '#c8322a')); palanca.position.set(-1.25, 1.4, -0.55); palanca.rotation.z = 0.4; gMaq.add(palanca);
    const pomo = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mats.rojo); pomo.position.set(-1.43, 1.82, -0.55); gMaq.add(pomo);
    // franjas de aviso amarillas y negras en el frente y la trasera
    for (const x of [-1.11, 1.11]) for (let i = 0; i < 5; i++) { const f = caja(0.02, 0.16, 0.3, mat(i % 2 ? 'aviso1' : 'aviso0', i % 2 ? '#1f1f1f' : '#ffd23a')); f.position.set(x, 0.62, -0.6 + i * 0.3); gMaq.add(f); }
    const panel = caja(0.6, 0.45, 0.06, mat('panel', '#3a4652')); panel.position.set(0.3, 1.2, 0.93); gMaq.add(panel);
    // 8 · reconvertida: maceta con flores y farol encima
    maq.flor = new THREE.Group(); maq.flor.position.set(-0.3, 1.7, 0);
    const maceta = cil(0.42, 0.32, 0.45, 12, mat('barro', '#b5643c')); maceta.position.y = 0.6; maq.flor.add(maceta);
    const hojas = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 8), mat('hojas', '#3f8f3a')); hojas.position.y = 1.05; hojas.scale.y = 0.75; maq.flor.add(hojas);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat('flor' + (i % 3), ['#ff6fa8', '#ffd23a', '#ffffff'][i % 3])); const a = i * 1.05; f.position.set(Math.cos(a) * 0.36, 1.2 + (i % 2) * 0.12, Math.sin(a) * 0.36); maq.flor.add(f); }
    const fp = cil(0.04, 0.05, 1.1, 6, mats.negro); fp.position.set(0.8, 1.15, 0.55); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), luz); fl.position.set(0.8, 1.75, 0.55); maq.flor.add(fp, fl);
    gMaq.add(maq.flor);
    maq.giro = Math.atan2(-U.z, U.x);
    M.collider = { kind: 'v18maquina', x: MAQ.on.x, z: MAQ.on.z, r: 1.55, h: 2.4, when: () => listaMision() && rango(estado()) < rango('desactivado') };
    G.fisica.colliders.push(M.collider);
    // 4 · pistas (brillan; con OJOS, más y con ruta dorada al engranaje)
    const brillo = mat('brillo', '#fff1a8', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
    for (const k of Object.keys(P.pistas)) {
      const p = enSeco(P.pistas[k].x, P.pistas[k].z); P.pistas[k] = p;
      const g = grupo('v18-puerto-pista-' + k), y = alto(p.x, p.z);
      let o;
      if (k === 'tuerca') { o = cil(0.16, 0.16, 0.1, 6, metal); o.position.y = 0.06; }
      else if (k === 'plano') { o = caja(0.6, 0.02, 0.42, mat('papel', '#cfe2f3')); o.position.y = 0.03; o.rotation.y = 0.4; }
      else { o = cil(0.45, 0.45, 0.02, 14, mat('aceite', '#1d1a17', { roughness: 0.1, metalness: 0.3 })); o.position.y = 0.02; }
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), brillo); aura.position.y = 0.45; aura.name = 'aura';
      g.add(o, aura); g.position.set(p.x, y, p.z); gPistas[k] = g;
      G.interaccion.add({ id: 'v18_puerto_pista_' + k, x: p.x, z: p.z, r: 2.2, visible: () => listaMision() && estado() === 'descubierto' && !A.pistas.has(k), label: () => TXT.pistas[k][0], use: () => verPista(k) });
    }
    gRuta = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), brillo, 12); gRuta.name = 'v18-puerto-ruta'; scene.add(gRuta);
    // 6 · materiales de la escalera
    const cuerdaM = mat('cuerda', '#c9a86a');
    for (const [key, tipo, s0] of P.mats) {
      const p = enSeco(s0.x, s0.z), y = alto(p.x, p.z), g = grupo('v18-puerto-' + key);
      if (tipo === 'tabla') { const o = caja(1.4, 0.07, 0.32, madera); o.position.y = 0.05; o.rotation.y = s0.x; g.add(o); }
      else { const o = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 6, 14), cuerdaM); o.rotation.x = Math.PI / 2; o.position.y = 0.08; g.add(o); }
      g.position.set(p.x, y, p.z); gMats[key] = g;
      G.interaccion.add({ id: 'v18_puerto_' + key.slice(10), x: p.x, z: p.z, r: 2.2, visible: () => listaMision() && estado() === 'desactivado' && !recogida(key), label: () => tipo === 'tabla' ? TXT.tabla : TXT.cuerda, use: () => recoger(key) });
      P.mats.find(m => m[0] === key)[2] = p;
    }
    // 5 y 7 · el freno y la reparación
    G.interaccion.add({ id: 'v18_puerto_freno', x: P.freno.x, z: P.freno.z, r: 2.4, visible: () => listaMision() && estado() === 'investigado' && !A.frenando, label: () => TXT.freno, use: frenar });
    G.interaccion.add({ id: 'v18_puerto_reparar', x: P.reparar.x, z: P.reparar.z, r: 2.6, visible: () => listaMision() && estado() === 'desactivado', label: () => TXT.reparar, use: reparar });
    // personajes (npc.js): solo con la misión lista y cerca; la carga la decide npc.js
    N.colocar('ingeniera', { x: P.ingObra.x, z: P.ingObra.z, rotY: Math.atan2(MAQ.on.x - P.ingObra.x, MAQ.on.z - P.ingObra.z), aparece: listaMision, comenta: false });
    N.colocar('constructor', { x: P.conObra.x, z: P.conObra.z, rotY: Math.atan2(-U.x, -U.z), aparece: listaMision, comenta: false });
    N.alUsar('ingeniera', { label: () => 'Hablar con la Ingeniera', use: hablarIngeniera });
    N.alUsar('constructor', { label: () => 'Hablar con el Constructor', use: () => N.decir('constructor', (N.def('constructor').porEstado[N.estado('constructor')] || {}).dialogo) });
  }

  // ---------- Aplicar el estado guardado (persistencia, recarga y «Comenzar de cero») ----------
  function aplicar() {
    if (!M.valido) return false;
    construir();
    const e = estado(), lista = listaMision(), fin = e === 'reparado';
    // partida con la misión hecha pero sin las claves de personaje (o de una build vieja): se deducen
    if (fin) { N.cambiarEstado('ingeniera', 'responsable'); N.cambiarEstado('constructor', 'reparador'); }
    gObra.visible = lista && !fin;
    gEscalera.visible = fin; // la escalera es del mundo: con la misión hecha se queda aunque la bandera se apague
    gMaq.visible = lista || fin;
    const fuera = rango(e) >= rango('desactivado');
    if (!maq.mueve) { const p = fuera ? MAQ.off : MAQ.on; maq.pos.x = p.x; maq.pos.z = p.z; }
    pintarMaquina(fin ? 'flor' : fuera ? 'apagada' : 'trabada');
    for (const k in gPistas) gPistas[k].visible = lista && e === 'descubierto' && !A.pistas.has(k);
    for (const k in gMats) gMats[k].visible = lista && e === 'desactivado' && !recogida(k);
    gRuta.visible = false;
    if (fin) {
      N.colocar('ingeniera', { x: P.ingFin.x, z: P.ingFin.z, caminar: true, rotY: Math.atan2(U.x, U.z), anim: 'idle', aparece: () => listaMision() || reparado(), comenta: true });
      N.colocar('constructor', { x: P.conFin.x, z: P.conFin.z, caminar: true, rotY: Math.atan2(-Nn.x, -Nn.z), anim: 'trabajar', aparece: () => listaMision() || reparado(), comenta: true });
    } else {
      const ip = A.frenando ? P.panel : P.ingObra;
      N.colocar('ingeniera', { x: ip.x, z: ip.z, caminar: true, anim: A.frenando ? 'trabajar' : null, aparece: listaMision, comenta: false });
      N.colocar('constructor', { x: P.conObra.x, z: P.conObra.z, caminar: true, rotY: Math.atan2(-U.x, -U.z), anim: null, aparece: listaMision, comenta: false });
    }
    if (fin) despejar();
    if (!fin) A.aciertos = rango(e) >= rango('investigado') ? 3 : A.aciertos;
    pagarXP();
    return true;
  }
  function pintarMaquina(modo) {
    gMaq.position.set(maq.pos.x, alto(maq.pos.x, maq.pos.z), maq.pos.z);
    gMaq.rotation.y = maq.giro;
    if (M.collider) { M.collider.x = maq.pos.x; M.collider.z = maq.pos.z; }
    if (maq.pintada === modo) return;
    maq.pintada = modo;
    mats.maqCuerpo.color.set(modo === 'flor' ? '#4f9a5a' : '#d9822b').convertSRGBToLinear();
    maq.broca.visible = modo !== 'flor';
    maq.flor.visible = modo === 'flor';
    maq.luces.forEach(l => { l.material.color.set(modo === 'trabada' ? l.userData.c : modo === 'flor' ? '#7dff9a' : '#3a3a3a'); });
  }
  // los árboles del pasillo de la escalera (±1,6 m), solo con la escalera hecha (como el puente, G.vegetacion.despejar)
  function despejar() {
    const Vg = G.vegetacion; if (M.despejado || !Vg || !Vg.despejar || !Vg.instancias || !Object.keys(Vg.instancias).length) return 0;
    M.despejado = true;
    const enPaso = (x, z) => { const dx = x - SITIO.a.x, dz = z - SITIO.a.z, s = dx * U.x + dz * U.z, l = Math.abs(dx * Nn.x + dz * Nn.z); return s > -1 && s < L + 1 && l < 1.6; };
    const q = [en(-1, -2), en(-1, 2), en(L + 1, -2), en(L + 1, 2)];
    return Vg.despejar(Math.min(...q.map(o => o.x)), Math.min(...q.map(o => o.z)), Math.max(...q.map(o => o.x)), Math.max(...q.map(o => o.z)), enPaso);
  }

  // ---------- Pasos del jugador ----------
  const especie = () => (V.seleccionada && V.seleccionada()) || (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  function nuevoJugador(sp) { return H.luchador({ id: 'jugador', nombre: 'Tú', especie: sp || especie(), pos: S.pos, mira: () => S.facing }); }
  const tecnica = () => { const h = A.j && H.get(A.j.poder); return (h && h.tecnica) || 'pico'; };
  function descubrir() {
    if (A.descubriendo || estado() !== 'obra') return false;
    A.descubriendo = true;
    N.decir('ingeniera', TXT.descubre, () => { A.descubriendo = false; if (avanzar('descubierto')) { quitarGuia(); aplicar(); } });
    return true;
  }
  function verPista(k) {
    if (estado() !== 'descubierto' || A.pistas.has(k)) return false;
    A.pistas.add(k); sonar('pickup');
    const p = P.pistas[k]; fx('gold', p.x, alto(p.x, p.z) + 0.5, p.z, 10);
    toast(TXT.pistas[k][1] + ' (' + A.pistas.size + '/3)', 3600);
    gPistas[k].visible = false;
    emitir({ tipo: 'pista', id: k, n: A.pistas.size });
    if (A.pistas.size === 2 && tecnica() !== 'ojos' && !A.senalada) { A.senalada = true; N.decir('ingeniera', [TXT.senala], null, { libre: true, caja: false }); }
    if (A.pistas.size >= 3) { A.aciertos = 0; N.decir('ingeniera', [TXT.trabado], null, { libre: true, caja: false }); }
    return true;
  }
  const gear = { id: 'engranaje', pos: { x: 0, y: 0, z: 0 } };
  function posEngranaje() { const c = Math.cos(maq.giro), s = Math.sin(maq.giro); gear.pos.x = maq.pos.x + 1.18 * c; gear.pos.z = maq.pos.z - 1.18 * s; gear.pos.y = alto(maq.pos.x, maq.pos.z) + 1.35; return gear.pos; }
  const timers = [];
  function ctx() {
    return {
      otro: gear,
      onda: (o, d, al) => { try { if (G.v18fx) G.v18fx.onda(o, d, al); } catch (e) { /* fx */ } },
      escudo: (f, s) => { try { if (G.v18fx) G.v18fx.escudo(S.pos, s); } catch (e) { /* fx */ } },
      despues: (s, fn) => timers.push({ t: s, fn }),
      fx: (k, x, y, z) => fx(k, x, y, z),
      sonar, lanzar: () => {},
      poder: ev => { try { G.emit('v18poder', Object.assign({ contra: 'maquina_puerto' }, ev)); } catch (e) { /* */ } },
      golpear: (blanco, g) => { if (blanco === gear && g && g.interrumpe) acertar('pico'); return true; } // el Grito apuntado llega al engranaje
    };
  }
  const enEncuentro = () => listaMision() && estado() === 'descubierto' && A.pistas.size >= 3 && A.aciertos < 3;
  function usarPoder() {
    if (!enEncuentro()) return { ok: false, motivo: 'fase' };
    if (!A.j) A.j = nuevoJugador();
    const g = posEngranaje(), r = H.usar(A.j, A.j.poder, ctx());
    if (!r.ok) { if (r.motivo === 'espera' || r.motivo === 'energia') toast(TXT.espera, 1600); return r; }
    emitir({ tipo: 'poder', id: A.j.poder });
    if (A.j.poder === 'grito_yunque') return r; // acierta (o no) cuando la onda llega: golpear()
    if (A.j.poder === 'escudo_plumas') { A.bocanadaT = Math.min(A.bocanadaT, 0.6); return r; } // acierta si la bocanada la encuentra con el escudo
    // ALAS, OJOS y el resto de PICO/PLUMAS: de cerca (su alcance + 1 m) y mirando al engranaje
    const h = H.get(A.j.poder) || {}, dx = g.x - S.pos.x, dz = g.z - S.pos.z, d = Math.hypot(dx, dz), f = S.facing || { x: 0, z: 1 }, fl = Math.hypot(f.x, f.z) || 1;
    const mira = d < 1.5 || (dx * f.x + dz * f.z) / (d * fl) >= 0.5;
    if (d <= (h.alcance || 5) + 1 && mira) acertar(h.tecnica || 'poder'); else toast(TXT.falla, 2000);
    return r;
  }
  function acertar(como) {
    if (!enEncuentro()) return false;
    A.aciertos++; sonar('unlock'); const g = posEngranaje(); fx('stars', g.x, g.y, g.z, 14); fx('dust', g.x, g.y, g.z, 8);
    maq.sacude = 0.5;
    emitir({ tipo: 'acierto', como, n: A.aciertos });
    if (A.aciertos < 3) { toast(con(TXT.acierto, A.aciertos), 2200); return true; }
    soltarModo();
    if (avanzar('investigado')) { aplicar(); N.decir('ingeniera', TXT.investigado); }
    return true;
  }
  function bocanada() {
    const d = Math.hypot(S.pos.x - maq.pos.x, S.pos.z - maq.pos.z), y = alto(maq.pos.x, maq.pos.z);
    fx('dust', maq.pos.x, y + 2.1, maq.pos.z, 14); sonar('viento');
    emitir({ tipo: 'bocanada', d });
    if (d > 6) return 'lejos';
    if (A.j && A.j.escudo > 0 && enEncuentro()) { A.j.escudo = 0; try { if (G.v18fx && G.v18fx.dispersar) G.v18fx.dispersar(S.pos); } catch (e) { /* fx */ } acertar('plumas'); return 'escudo'; }
    if (d < 4 && d > 0.3) A.empuje = { x: (S.pos.x - maq.pos.x) / d * 3.2, z: (S.pos.z - maq.pos.z) / d * 3.2, t: 0.3 }; // empuja suave, sin quitar nada
    return 'empuja';
  }
  function frenar() {
    if (estado() !== 'investigado' || A.frenando) return false;
    A.frenando = true; A.freno = 0;
    N.colocar('ingeniera', { x: P.panel.x, z: P.panel.z, caminar: true, anim: 'trabajar' });
    sonar('ring', 2); emitir({ tipo: 'freno', fase: 'empieza' });
    return true;
  }
  function pasoFreno(dt) {
    if (!A.frenando) return;
    const d = Math.hypot(S.pos.x - P.freno.x, S.pos.z - P.freno.z);
    if (d > 3.6) { A.frenando = false; A.freno = 0; toast(TXT.frenoSuelta, 2400); N.colocar('ingeniera', { anim: null }); emitir({ tipo: 'freno', fase: 'suelta' }); return; }
    A.freno += dt;
    if (A.freno >= FRENO_S) {
      A.frenando = false; A.freno = 0;
      if (avanzar('desactivado')) {
        maq.mueve = { de: { x: maq.pos.x, z: maq.pos.z }, a: { x: MAQ.off.x, z: MAQ.off.z }, t: 0 };
        sonar('unlock'); fx('dust', maq.pos.x, alto(maq.pos.x, maq.pos.z) + 1, maq.pos.z, 20);
        N.colocar('ingeniera', { x: P.ingObra.x, z: P.ingObra.z, caminar: true, anim: null });
        aplicar();
        N.decir('ingeniera', TXT.desactivado);
      }
    }
  }
  function recoger(key) {
    if (estado() !== 'desactivado' || recogida(key) || !V.cambiarMundo(key, 'recogida')) return false;
    const m = P.mats.find(x => x[0] === key), p = m[2];
    sonar('pickup'); fx('leaves', p.x, alto(p.x, p.z) + 0.5, p.z, 10);
    gMats[key].visible = false;
    toast(con(TXT.mas, materiales()), 2600);
    emitir({ tipo: 'material', id: key, n: materiales() });
    return true;
  }
  function reparar() {
    if (estado() !== 'desactivado') return false;
    if (materiales() < P.mats.length) { sonar('wrong'); toast(con(TXT.falta, materiales()), 4200); return false; }
    // primero se guarda el estado del mundo (G.v18, al momento) y luego vienen los efectos
    if (!avanzar('reparado')) return false;
    V.otorgar('puerto_mina', 'puerto_mina', 1);
    N.cambiarEstado('ingeniera', 'responsable'); N.cambiarEstado('constructor', 'reparador');
    aplicar();
    guardarJuego();
    sonar('unlock');
    for (const s of [0, L / 2, L]) { const p = en(s, 0); fx('feathers', p.x, yEscalera(s) + 0.8, p.z, 14); fx('stars', p.x, yEscalera(s) + 1.2, p.z, 10); }
    try { G.camara.shake(0.06, 0.3); } catch (e) { /* sin cámara */ }
    toast(TXT.reparado, 4800);
    const t = TXT.fin;
    setTimeout(() => N.decir(t[0][0], [t[0][1]], () => N.decir(t[1][0], [t[1][1]])), G.quiet ? 0 : 900);
    emitir({ tipo: 'reparado' });
    return true;
  }
  function hablarIngeniera() {
    const e = estado();
    if (e === 'obra') return descubrir();
    const d = N.def('ingeniera');
    const linea = e === 'descubierto' ? (A.pistas.size < 3 ? con(TXT.obj.pistas, A.pistas.size) : con(TXT.obj.poder, A.aciertos))
      : e === 'investigado' ? TXT.investigado[1] : e === 'desactivado' ? (materiales() < 4 ? con(TXT.obj.materiales, materiales()) : TXT.obj.repara) : null;
    return N.decir('ingeniera', linea ? [linea] : (d.porEstado[N.estado('ingeniera')] || {}).dialogo);
  }

  // ---------- XP V18.2 (una vez; también si evolucion.js llega después) ----------
  function pagarXP() {
    if (!reparado() || !G.v18evo || !G.v18evo.dar || V.otorgado('xp_puerto')) return 0;
    if (!V.otorgar('xp_puerto', 'xp_puerto', 1)) return 0;
    return G.v18evo.dar(V.seleccionada() || 'vittata', XP_FIN, 'puerto') || 0;
  }

  // ---------- Aviso y bandera del minimapa (una vez por sesión) ----------
  const guia = { x: SITIO.plaza.x, z: SITIO.plaza.z, puesta: false };
  function ponerGuia() {
    if (guia.puesta || !G.minimapa || !G.minimapa.fijarDestino) return;
    let otra = null; try { otra = (G.minimapa.marcadores ? G.minimapa.marcadores() : []).find(m => m.tipo === 'dest' && !m.auto); } catch (e) { otra = null; }
    if (otra) return;
    try { G.minimapa.fijarDestino(guia.x, guia.z); guia.puesta = true; } catch (e) { /* sin minimapa */ }
  }
  function quitarGuia() {
    if (!guia.puesta) return; guia.puesta = false;
    try { const d = (G.minimapa.marcadores ? G.minimapa.marcadores() : []).find(m => m.tipo === 'dest' && !m.auto); if (d && Math.abs(d.x - guia.x) < 1 && Math.abs(d.z - guia.z) < 1) G.minimapa.quitarDestino(); } catch (e) { /* sin minimapa */ }
  }

  // ---------- Modo de acción y tecla G (solo dentro del encuentro) ----------
  let modo0 = null, tomado = false;
  const modo = { activo: () => enEncuentro() && tomado, accion: () => usarPoder(), aviso: () => guiaTxt(), get verbo() { return TXT.poder; } };
  const guiaTxt = () => TACTIL ? TXT.guiaT : A.j && A.j.poder === 'escudo_plumas' ? TXT.guiaEscudo : con(TXT.guia, ((A.j && H.get(A.j.poder)) || {}).nombre || TXT.poder);
  function tecla(e) {
    if (!tomado || (e.key || '').toLowerCase() !== 'g' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    e.stopImmediatePropagation();
    if (G.pausa && G.pausa.activa && G.pausa.activa()) return;
    if (!e.repeat) usarPoder();
  }
  addEventListener('keydown', tecla, true);
  function tomarModo() {
    if (tomado) return; tomado = true;
    if (!A.j) A.j = nuevoJugador();
    modo0 = G.interaccion.modo; G.interaccion.modo = modo;
    if (G.input && G.input.keys) G.input.keys.delete('g');
    emitir({ tipo: 'modo', tomado: true });
  }
  function soltarModo() {
    if (!tomado) return; tomado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    modo0 = null;
    emitir({ tipo: 'modo', tomado: false });
  }

  // ---------- HUD pequeño (estilo de #v18-amenaza) ----------
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    const st = document.createElement('style'); st.id = 'v18-puerto-css';
    st.textContent = '#v18-puerto{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(340px,calc(100vw - 32px));z-index:40;' +
      'font-family:inherit;color:#fff;background:rgba(28,32,44,.78);border-radius:16px;padding:8px 12px;text-align:center;pointer-events:none}' +
      '#v18-puerto[hidden]{display:none}#v18-puerto .vp-t{font-weight:700;font-size:13px;letter-spacing:.04em;color:#ffe28a}#v18-puerto .vp-o{font-size:15px;margin-top:2px;text-wrap:pretty}' +
      '#v18-puerto .vp-b{height:8px;border-radius:4px;background:rgba(255,255,255,.2);margin-top:6px;overflow:hidden}#v18-puerto .vp-b i{display:block;height:100%;width:0;background:#7dff9a}' +
      '#v18-puerto button{pointer-events:auto;font:inherit;font-size:15px;font-weight:700;min-height:44px;min-width:44px;padding:6px 18px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;margin-top:6px}' +
      '#v18-puerto button.no{opacity:.45}@media (max-width:760px){body.v18-puerto-on #quest{display:none}body.v18-puerto-on #minimapa{visibility:hidden}#v18-puerto{top:calc(env(safe-area-inset-top,0px) + 64px)}}body.v18-puerto-on #toast{z-index:41}';
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'v18-puerto'; el.hidden = true; el.setAttribute('role', 'status');
    el.innerHTML = '<div class="vp-t">' + TXT.titulo + '</div><div class="vp-o" data-k="obj"></div><div class="vp-b" data-k="barra" hidden><i></i></div><button type="button" data-k="poder" hidden>' + TXT.poder + '</button>';
    el.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation(); usarPoder(); pintarHud(); });
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  function objetivo() {
    const e = estado();
    if (e === 'obra') return TXT.obj.obra;
    if (e === 'descubierto') return A.pistas.size < 3 ? con(TXT.obj.pistas, A.pistas.size) : con(TXT.obj.poder, A.aciertos);
    if (e === 'investigado') return A.frenando ? con(TXT.frenoVa, Math.round(A.freno / FRENO_S * 100)) : TXT.obj.investigado;
    if (e === 'desactivado') return materiales() < P.mats.length ? con(TXT.obj.materiales, materiales()) : TXT.obj.repara;
    return '';
  }
  function pintarHud(ver) {
    montarHud();
    const mostrar = !!ver && !reparado();
    if (hud.el.hidden === mostrar) hud.el.hidden = !mostrar;
    document.body.classList.toggle('v18-puerto-on', mostrar);
    if (!mostrar) return;
    const o = objetivo(), q = hud.q('obj'); if (q.textContent !== o) q.textContent = o;
    const b = hud.q('barra'); b.hidden = !A.frenando; if (A.frenando) b.firstChild.style.width = Math.round(A.freno / FRENO_S * 100) + '%';
    const p = hud.q('poder'); p.hidden = !tomado;
    if (tomado && A.j) { const nom = (H.get(A.j.poder) || {}).nombre || TXT.poder; if (p.textContent !== nom) p.textContent = nom; p.classList.toggle('no', !H.listo(A.j, A.j.poder).ok); }
  }

  // ---------- Paso ----------
  function libre() {
    const $ = id => document.getElementById(id), oculto = id => !$(id) || $(id).hidden;
    try { if ($('c1-fade') || (G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return false; return oculto('end') && oculto('comic') && oculto('creator'); } catch (e) { return false; }
  }
  function pasoMaquina(dt) {
    if (maq.mueve) { maq.mueve.t = Math.min(1, maq.mueve.t + dt); const t = maq.mueve.t, k = t * t * (3 - 2 * t); maq.pos.x = maq.mueve.de.x + (maq.mueve.a.x - maq.mueve.de.x) * k; maq.pos.z = maq.mueve.de.z + (maq.mueve.a.z - maq.mueve.de.z) * k; if (t >= 1) maq.mueve = null; }
    const mode = reparado() ? 'flor' : rango(estado()) >= rango('desactivado') ? 'apagada' : 'trabada';
    pintarMaquina(mode);
    if (mode === 'trabada') {
      maq.engranaje.rotation.x += dt * (A.aciertos ? 1.5 + A.aciertos : 0.6) * (Math.sin(performance.now() / 160) > -0.3 ? 1 : -0.4);
      const parpadeo = Math.sin(performance.now() / 240) > 0; maq.luces[0].visible = parpadeo; maq.luces[1].visible = !parpadeo;
    } else { maq.luces[0].visible = maq.luces[1].visible = true; }
    if (maq.sacude > 0) { maq.sacude -= dt; gMaq.position.x += Math.sin(performance.now() / 20) * 0.04; }
  }
  function ruta() {
    const ver = enEncuentro() || (estado() === 'descubierto' && tecnica() === 'ojos');
    gRuta.visible = ver;
    if (!ver) return;
    const g = posEngranaje(), o3 = new THREE.Object3D(), t0 = performance.now() / 600;
    for (let i = 0; i < 12; i++) { const t = ((i / 12) + t0 % 1 / 12); const x = S.pos.x + (g.x - S.pos.x) * t, z = S.pos.z + (g.z - S.pos.z) * t; o3.position.set(x, alto(x, z) + 0.35 + Math.sin(Math.PI * t) * 0.8, z); o3.updateMatrix(); gRuta.setMatrixAt(i, o3.matrix); }
    gRuta.instanceMatrix.needsUpdate = true;
  }
  function paso(dt, busy) {
    if (!M.valido || !M.hecho) return;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    const lista = listaMision();
    if (gMaq.visible !== (lista || reparado())) aplicar();
    if (!lista) { soltarModo(); pintarHud(false); return; }
    pasoMaquina(dt);
    const e = estado(), dM = Math.hypot(S.pos.x - maq.pos.x, S.pos.z - maq.pos.z), dP = Math.hypot(S.pos.x - SITIO.plaza.x, S.pos.z - SITIO.plaza.z);
    // aviso y bandera (una vez por sesión) mientras la misión no empezó
    if (e === 'obra' && !A.avisado && !busy) { A.avisado = true; if (dP > R_AVISO) { toast(TXT.aviso, 5200); ponerGuia(); } }
    if (e === 'obra' && !A.llegada && dP < 32 && !busy && libre() && N.instancia('constructor') && N.instancia('ingeniera')) {
      A.llegada = true; const l = TXT.llegada;
      N.decir(l[0][0], [l[0][1]], () => N.decir(l[1][0], [l[1][1]], () => N.decir(l[2][0], [l[2][1]], null, { libre: true, caja: false }), { libre: true, caja: false }), { libre: true, caja: false });
    }
    if (e === 'obra' && dM < R_DESCUBRE && !busy && libre()) descubrir();
    // pistas: con OJOS brillan más; sin OJOS, tras dos la Ingeniera señala la tercera (brilla más)
    if (e === 'descubierto') {
      const ojos = tecnica() === 'ojos';
      if (!A.j) A.j = nuevoJugador();
      if (ojos && !A.guia && dP < 30) { A.guia = true; toast(TXT.ojos, 3600); }
      for (const k in gPistas) { const au = gPistas[k].getObjectByName('aura'), fuerte = ojos || (A.senalada && !A.pistas.has(k)); au.scale.setScalar((fuerte ? 1.5 : 0.8) + Math.sin(performance.now() / 300) * 0.15); }
    }
    ruta();
    // encuentro con el engranaje (paso 4)
    if (enEncuentro() && dM < R_ENCUENTRO && !busy) { tomarModo(); H.paso(A.j, dt); } else soltarModo();
    if (rango(e) < rango('desactivado') && dM < 12) { if ((A.bocanadaT -= dt) <= 0) { A.bocanadaT = BOCANADA_S; bocanada(); } }
    if (A.empuje && A.empuje.t > 0) { S.pos.x += A.empuje.x * dt; S.pos.z += A.empuje.z * dt; A.empuje.t -= dt; }
    pasoFreno(dt);
    pintarHud(dP < R_HUD && !busy);
  }
  G.on('update', (dt, busy) => { if (!A.manual) paso(Math.min(dt, 0.1), busy); }, 73);
  G.on('apply', () => setTimeout(() => { A.pistas.clear(); A.aciertos = 0; A.frenando = false; maq.mueve = null; soltarModo(); aplicar(); }, 0), 97);
  G.on('v18', ev => { if (!ev) return; if (ev.tipo === 'mundo' && (ev.id === ID || /^v18_puerto_/.test(ev.id || '') || ev.id === 'puente_villa')) aplicar(); if (ev.tipo === 'evo') pagarXP(); });

  // ---------- Arranque: el mundo real y el sitio medido ----------
  function validar() {
    if (!T.mapa) return false;
    const hA = alto(SITIO.a.x, SITIO.a.z), hB = alto(SITIO.b.x, SITIO.b.z), hP = alto(SITIO.plaza.x, SITIO.plaza.z);
    return Math.abs(hP - 5) < 2.5 && hB - hA > 4 && hB - hA < 9; // la plaza a orillas del río y la meseta encima: el mapa que se midió
  }
  function iniciar() {
    if (M.valido) return true;
    M.valido = validar();
    if (M.valido) aplicar();
    return M.valido;
  }
  Promise.resolve(G.mundo && G.mundo.listo).then(iniciar, iniciar);
  Promise.resolve(G.vegetacion && G.vegetacion.listo).then(() => { if (reparado()) despejar(); }, () => {});
  if (G.v18evo) pagarXP();

  // =====================================================================================================================
  // Prueba (AV.v18PuertoTest): la misión de punta a punta con entrada real (teclas E y G, el botón Poder y la física a pie).
  // =====================================================================================================================
  let evTest = null, v18Test = null; // oyentes únicos (G no tiene off): mudos fuera de la prueba
  G.on('v18puerto', e => { if (evTest) evTest.push(e); });
  G.on('v18', e => { if (v18Test) v18Test(e); }, 10);
  const textos = () => {
    const t = [TXT.aviso, TXT.ojos, TXT.senala, TXT.trabado, TXT.falla, TXT.espera, TXT.freno, TXT.frenoSuelta, TXT.tabla, TXT.cuerda, TXT.reparar, TXT.reparado, TXT.titulo, TXT.guiaT, TXT.guiaEscudo,
      'Hablar con la Ingeniera', 'Hablar con el Constructor', con(TXT.acierto, 1), con(TXT.frenoVa, 50), con(TXT.mas, 2), con(TXT.falta, 3), con(TXT.guia, 'Grito del Yunque'),
      TXT.obj.obra, con(TXT.obj.pistas, 1), con(TXT.obj.poder, 2), TXT.obj.investigado, con(TXT.obj.materiales, 3), TXT.obj.repara]
      .concat(TXT.descubre, TXT.investigado, TXT.desactivado, TXT.llegada.map(x => x[1]), TXT.fin.map(x => x[1]));
    for (const k in TXT.pistas) t.push(TXT.pistas[k][0], TXT.pistas[k][1] + ' (1/3)');
    for (const d of N.defs()) { t.push(d.nombre.es); for (const e in d.porEstado) t.push(...(d.porEstado[e].dialogo || [])); }
    return t;
  };
  async function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const antes = o.antes || {};
    try { await G.mundo.listo; } catch (e) { /* sin mundo */ }
    iniciar();
    // como un jugador que ya pasó la portada y creó su cotorra (las teclas no cuentan con la portada o el creador abiertos)
    const tit = document.getElementById('title'), titAbierta = !!(tit && tit.open), cre = document.getElementById('creator'), creOculto = cre ? cre.hidden : true;
    if (titAbierta) tit.open = false; if (cre) cre.hidden = true; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z }, inv0 = JSON.stringify(S.inv || {});
    const misiones = () => JSON.stringify({ m: S.missions, s: S.step, e: S.events, c: S.collected, f: S.complete, fl: S.field, cap: S.captures, u: S.unlocked });
    const mis0 = misiones(), quiet0 = G.quiet, susp = G.guardado.suspender, toast0 = G.ui.toast, toasts = [];
    const evs = []; evTest = evs;
    G.ui.toast = t => { toasts.push(String(t)); };
    if (susp) susp(true);
    A.manual = true;
    const F = G.fisica, MV = F.MOVE;
    const correr = (s, h) => { h = h || 1 / 30; for (let t = 0; t < s; t += h) { paso(h, false); N.paso(h, false); } };
    const ir = (x, z, mirar) => {
      S.pos.x = x; S.pos.z = z; S.pos.y = alto(x, z) + 0.02; S.vy = 0; MV.flying = false; MV.swimming = false; MV.grounded = true; MV.vx = MV.vz = 0;
      if (mirar && S.facing) { const dx = mirar.x - x, dz = mirar.z - z, d = Math.hypot(dx, dz) || 1; S.facing.x = dx / d; S.facing.z = dz / d; }
    };
    const tecla = (k, tipo) => window.dispatchEvent(new KeyboardEvent(tipo || 'keydown', { key: k, bubbles: true, cancelable: true }));
    const pulsar = k => { tecla(k); tecla(k, 'keyup'); };
    const cerrarCharlas = () => { for (let i = 0; i < 12 && G.dialogo.open(); i++) pulsar('e'); try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) { /* */ } };
    const recursos = () => (performance.getEntriesByType('resource') || []).map(r => r.name).filter(n => /models\/personajes\//.test(n));
    const geos = () => (G.renderer.renderer && G.renderer.renderer.info.memory.geometries) || 0;
    // subir a pie con el motor de movimiento: W y la cámara al eje 1,5 m por delante (como cruzarAPie de reparar.js)
    const subir = (pasos) => {
      const keys = G.input.keys, r = { ok: false, s: 0, volo: false, nado: false, rescates: 0, y: 0 };
      const p0 = en(-2.2, 0); ir(p0.x, p0.z);
      if (G.solidos && G.solidos.terminar) try { G.solidos.terminar(); } catch (e) { /* */ }
      S.pos.y = F.suelo ? F.suelo(p0.x, p0.z, alto(p0.x, p0.z) + 0.5) : alto(p0.x, p0.z);
      const d0 = MV.desatascos || 0, yaw0 = G.camara.yaw;
      keys.add('w');
      try {
        for (let k = 0; k < (pasos || 900); k++) {
          const dx = S.pos.x - SITIO.a.x, dz = S.pos.z - SITIO.a.z, s = dx * U.x + dz * U.z; r.s = s;
          if (s > L + 0.6) { r.ok = true; break; }
          const obj = en(s + 1.5, 0); G.camara.yaw = Math.atan2(-(obj.x - S.pos.x), -(obj.z - S.pos.z));
          F.step(0.05, false);
          if (MV.flying) r.volo = true; if (MV.swimming) r.nado = true;
        }
      } finally { keys.delete('w'); G.camara.yaw = yaw0; }
      r.rescates = (MV.desatascos || 0) - d0; r.y = S.pos.y - alto(SITIO.b.x, SITIO.b.z);
      r.ok = r.ok && !r.volo && !r.nado && r.rescates === 0;
      return r;
    };
    try {
      // 1 · solo con la bandera, sin cargar nada antes
      check('1 · Sin la bandera no se cargó nada: ni npc.js ni puerto.js, ni ningún modelo de personaje', antes.v18 ? true : (!antes.npc && !antes.puerto && !antes.glb),
        antes.v18 ? 'bandera puesta en esta sesión (comprobación de carga no aplica)' : JSON.stringify(antes));
      check('1b · El sitio medido es el del mapa real (plaza a orillas del río, meseta encima)', M.valido && M.hecho, 'plaza ' + alto(SITIO.plaza.x, SITIO.plaza.z).toFixed(1) + ' · A ' + alto(SITIO.a.x, SITIO.a.z).toFixed(1) + ' · B ' + alto(SITIO.b.x, SITIO.b.z).toFixed(1));
      V.borrar(); V.recargar(); A.forzar = false; A.avisado = false; A.llegada = false; A.pistas.clear(); A.aciertos = 0; A.senalada = false; A.guia = false; aplicar();
      // 2 · con la bandera apagada y con el puente sin reparar no aparece nada
      ir(SITIO.plaza.x, SITIO.plaza.z); V.cambiarMundo('puente_villa', 'reparado'); correr(0.3); await esperar(150);
      const sinBandera = !G.V18 ? (!listaMision() && !gMaq.visible && N.activos().length === 0) : true;
      V.cambiarMundo('puente_villa', 'roto'); A.forzar = true; correr(0.3); await esperar(150);
      const nn = G.interaccion.nearest();
      check('2 · Sin la bandera, o antes de reparar el puente, no aparece nada (ni máquina, ni personajes, ni interacción)', sinBandera && !listaMision() && !gMaq.visible && N.activos().length === 0 && !(nn && /v18_puerto|v18npc/.test(nn.id)), nn && nn.id);
      // 3 · lejos no se carga nada; aviso y bandera
      const villa = (T.mapa.lugares && T.mapa.lugares.villa) || { x: 125, z: 140 };
      ir(villa.x, villa.z); V.cambiarMundo('puente_villa', 'reparado'); correr(0.4); await esperar(300); correr(0.1);
      check('3 · Carga diferida: lejos del puerto (> 150 m) no hay personajes ni se pidió su modelo', Math.hypot(villa.x - SITIO.plaza.x, villa.z - SITIO.plaza.z) > 150 && N.activos().length === 0 && N.stats().pedidos.length === 0 && !recursos().length,
        'dist ' + Math.hypot(villa.x - SITIO.plaza.x, villa.z - SITIO.plaza.z).toFixed(0) + ' m · pedidos ' + N.stats().pedidos.length);
      check('3b · Con el puente reparado: aviso «retumba una máquina» y bandera verde del minimapa en la plaza', toasts.includes(TXT.aviso) && (!G.minimapa || guia.puesta || (G.minimapa.marcadores && G.minimapa.marcadores().some(m => m.tipo === 'dest'))), toasts.slice(-2).join(' | '));
      // 4 · el sitio respeta lo que ya existe
      const seg = (px, pz, x0, z0, x1, z1) => { const vx = x1 - x0, vz = z1 - z0, t = Math.max(0, Math.min(1, ((px - x0) * vx + (pz - z0) * vz) / (vx * vx + vz * vz))); return Math.hypot(px - x0 - vx * t, pz - z0 - vz * t); };
      const dEje = (x, z) => { let m = Infinity; for (let s = -1; s <= L + 1; s += 0.25) { for (const l of [-1.1, 0, 1.1]) { const p = en(s, l); m = Math.min(m, Math.hypot(p.x - x, p.z - z)); } } return m; };
      const malos = RESPETAR.filter(([, x, z, min]) => dEje(x, z) < min).map(r => r[0] + ' ' + dEje(r[1], r[2]).toFixed(1));
      const medidas = RESPETAR.map(r => r[0] + ' ' + dEje(r[1], r[2]).toFixed(1));
      for (const [n, x0, z0, x1, z1, min] of TRAMOS) { let m = Infinity; for (let s = -1; s <= L + 1; s += 0.25) for (const l of [-1.1, 0, 1.1]) { const p = en(s, l); m = Math.min(m, seg(p.x, p.z, x0, z0, x1, z1)); } medidas.push(n + ' ' + m.toFixed(1)); if (m < min) malos.push(n + ' ' + m.toFixed(1)); }
      let mojado = 0, zona = 0; for (let s = 0; s <= L; s += 0.5) { const p = en(s, 0); if (G.agua && G.agua.levelAt(p.x, p.z) > alto(p.x, p.z) - 0.2) mojado++; if (G.zonas && G.zonas.zonaEn && G.zonas.zonaEn(p.x, p.z)) zona++; }
      check('4 · El sitio no tapa nada: río, poza y cascada, gruta, secreto, ruta de la gota, sendero, torres, toldos, canoa; en seco y fuera de las zonas de los capítulos', !malos.length && !mojado && !zona, (malos.length ? 'NO: ' + malos.join(' | ') + ' · ' : '') + medidas.join(' · ') + ' m · mojado ' + mojado + ' · zona ' + zona);
      check('4b · Escalera de ' + (M.perfil.length - 1) + ' tramos sobre el terreno, pendiente máxima ≤ 40°', pendienteMax() <= 40 && M.perfil.length >= 2, pendienteMax().toFixed(1) + '° · ' + M.perfil.map(p => p[0].toFixed(1) + '/' + p[1].toFixed(2)).join(' '));
      // 5 · antes de repararla, la ladera no se sube a pie
      const antesSube = subir(500);
      check('5 · Antes de la misión no se sube a pie (la máquina tapa el pie y la ladera pasa de 48°: hoy se vuela o se rodea)', !antesSube.ok, 's ' + antesSube.s.toFixed(1) + ' de ' + L.toFixed(1));
      // 6 · cerca: dos personajes como mucho, modelo de la Ingeniera, Constructor provisional sin 404
      const cerca = en(-30, 25); ir(cerca.x, cerca.z); correr(0.2);
      for (let i = 0; i < 80 && !(N.instancia('ingeniera') && N.instancia('constructor')); i++) { await esperar(100); correr(0.05); }
      const ing = N.instancia('ingeniera'), cons = N.instancia('constructor');
      check('6 · A < 90 m aparecen la Ingeniera y el Constructor (2 como mucho)', ing && cons && N.activos().length <= N.MAX_ACTIVOS, N.activos().join(','));
      check('6b · La Ingeniera es ingeniera.glb con Idle, Hablar y Reparar', ing && ['Idle', 'Hablar', 'Reparar'].every(a => ing.acciones[a]) && N.stats().pedidos.length === 1 && /ingeniera\.glb$/.test(N.stats().pedidos[0]), N.stats().pedidos.join(','));
      check('6c · El Constructor es provisional (modelo de respaldo, casco y chaleco) y no se pidió ningún constructor.glb', cons && cons.provisional && cons.acc.casco && cons.acc.chaleco && !recursos().some(n => /constructor/.test(n)) && !N.stats().pedidos.some(n => /constructor/.test(n)));
      const g0 = geos(); N.apariencia('constructor', 'reparador'); N.apariencia('ingeniera', 'responsable'); const g1 = geos(); N.apariencia('constructor', 'supervisor'); N.apariencia('ingeniera', 'aprendiz');
      check('6d · Cambiar de apariencia no crea geometría (un modelo, varias apariencias)', g0 === g1 && geos() === g0 && cons.apariencia === 'supervisor' && !cons.nodos.Pelo.visible && cons.acc.casco.visible && cons.acc.chaleco.visible && ing.apariencia === 'aprendiz' && !ing.nodos.Chaqueta.visible,
        'geometrías ' + g0 + ' → ' + g1);
      check('7 · La máquina tapa la subida: collider puesto al pie de la ladera', G.fisica.colliders.indexOf(M.collider) >= 0 && M.collider.when() && Math.hypot(M.collider.x - SITIO.a.x, M.collider.z - SITIO.a.z) < 3.5);
      // 8 · pasos 1 y 3: llegar y descubrir (las charlas se pasan con E, como el jugador)
      const pl = en(-12, 8); ir(pl.x, pl.z); correr(0.5); await esperar(50);
      check('8 · Paso 1: al llegar, el Constructor ignora el aviso de la Ingeniera (bocadillos)', A.llegada && (G.dialogo.libre ? !!G.dialogo.libre() : true), (G.dialogo.actual && G.dialogo.actual() || {}).text);
      cerrarCharlas();
      const pd = en(-4, 1); ir(pd.x, pd.z, MAQ.on); correr(0.2);
      const abre = G.dialogo.open() && (G.dialogo.actual() || {}).who === 'La Ingeniera';
      cerrarCharlas(); correr(0.1);
      check('8b · Pasos 2 y 3: a 14 m de la máquina la Ingeniera cuenta qué pasó (caja) y con E se pasa → descubierto', abre && estado() === 'descubierto' && V.mundo(ID) === 'descubierto', estado());
      // 9 · paso 4: tres pistas con E
      const inv1 = JSON.stringify(S.inv || {});
      for (const k of ['plano', 'tuerca', 'aceite']) { const p = P.pistas[k]; ir(p.x + 0.4, p.z + 0.4); correr(0.05); cerrarCharlas(); pulsar('e'); }
      check('9 · Paso 4: tres pistas con Acción (E); la tercera la señala la Ingeniera si no hay OJOS', A.pistas.size === 3 && toasts.some(t => /tuerca suelta/.test(t)) && toasts.some(t => /nidos/.test(t)) && toasts.some(t => /Aceite/.test(t)) && (tecnica() === 'ojos' || A.senalada), 'pistas ' + A.pistas.size);
      cerrarCharlas();
      // 10 · paso 4: tres aciertos con el poder (G mal apuntado no cuenta; G bien apuntado; E; y arausiaca con el escudo)
      const g = posEngranaje(), lejos = { x: g.x - U.x * 5, z: g.z - U.z * 5 };
      A.j = nuevoJugador('vittata');
      ir(lejos.x, lejos.z, { x: lejos.x - U.x, z: lejos.z - U.z }); correr(0.1);
      const tomaModo = G.interaccion.modo === modo && !hud.el.hidden && !hud.q('poder').hidden;
      A.j.energia = 100; A.j.cd = {}; pulsar('g'); correr(0.8);
      const sinApuntar = A.aciertos;
      ir(lejos.x, lejos.z, g); A.j.energia = 100; A.j.cd = {}; pulsar('g'); correr(0.8);
      const conG = A.aciertos;
      ir(lejos.x, lejos.z, g); A.j.energia = 100; A.j.cd = {}; pulsar('e'); correr(0.8);
      check('10 · Junto a la máquina se toma el modo de acción y sale el botón Poder', tomaModo);
      check('10b · Grito del Yunque de espaldas no cuenta; apuntado con G y con E, sí (2/3)', sinApuntar === 0 && conG === 1 && A.aciertos === 2, sinApuntar + ' / ' + conG + ' / ' + A.aciertos);
      A.j = nuevoJugador('arausiaca'); ir(g.x - U.x * 3, g.z - U.z * 3, g); A.j.energia = 100; A.j.cd = {};
      const bt = hud.q('poder'); correr(0.05); pintarHud(true);
      bt.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      const escudoAbierto = A.j.escudo > 0; correr(1.2);
      check('10c · Con arausiaca (PLUMAS) el botón táctil Poder abre el Escudo y la bocanada que lo encuentra cuenta (3/3) → investigado', escudoAbierto && A.aciertos === 3 && estado() === 'investigado' && evs.some(e => e.tipo === 'acierto' && e.como === 'plumas'), 'escudo ' + escudoAbierto + ' · aciertos ' + A.aciertos + ' · ' + estado());
      check('10d · Al terminar el encuentro se devuelve el modo de acción', G.interaccion.modo !== modo && !tomado);
      check('10e · Táctil: el botón Poder mide 44 px o más', bt.offsetHeight >= 44 || getComputedStyle(bt).minHeight === '44px', bt.offsetHeight + ' px');
      cerrarCharlas();
      // 11 · paso 5: sostener el freno (soltarlo lo corta)
      ir(P.freno.x + 0.3, P.freno.z, P.freno); correr(0.05); pulsar('e'); correr(1);
      const ingTrabaja = N.instancia('ingeniera') && N.instancia('ingeniera').anim === 'Reparar';
      ir(P.freno.x + U.x * 6, P.freno.z + U.z * 6); correr(0.1);
      const solto = !A.frenando && estado() === 'investigado' && toasts.includes(TXT.frenoSuelta);
      ir(P.freno.x + 0.3, P.freno.z, P.freno); correr(0.05); pulsar('e'); correr(FRENO_S + 0.3); correr(1.2);
      check('11 · Paso 5: con E se sostiene el freno, la Ingeniera trabaja (Reparar) y, si te vas, se suelta', ingTrabaja && solto);
      check('11b · A los 3 s la máquina se apaga y se aparta: ya no tapa la subida → desactivado', estado() === 'desactivado' && !M.collider.when() && Math.hypot(maq.pos.x - MAQ.off.x, maq.pos.z - MAQ.off.z) < 0.2, estado());
      cerrarCharlas();
      // 12 · paso 6 y 7: sin materiales no se repara; recoger 4 (sin tocar S.inv)
      ir(P.reparar.x, P.reparar.z); correr(0.05); pulsar('e');
      const sinMat = estado() === 'desactivado' && toasts.some(t => /Faltan materiales: 0\/4/.test(t));
      for (const [, , p] of P.mats) { cerrarCharlas(); ir(p.x + 0.3, p.z); correr(0.05); pulsar('e'); cerrarCharlas(); pulsar('e'); cerrarCharlas(); }
      check('12 · Paso 7 sin los 4 materiales: no se repara', sinMat);
      check('12b · Paso 6: 3 tablas y 1 cuerda con E, cada una una sola vez, sin tocar el inventario del capítulo', materiales() === 4 && JSON.stringify(S.inv || {}) === inv1 && evs.filter(e => e.tipo === 'material').length === 4, materiales() + '/4');
      // 13 · paso 7: reparar; el estado se guarda antes de los efectos; XP una vez (también si evolucion.js llega después)
      const evo = G.v18evo; G.v18evo = undefined;
      let guardadoAntes = null; v18Test = ev => { if (ev && ev.tipo === 'mundo' && ev.id === ID && ev.estado === 'reparado' && guardadoAntes == null) { try { guardadoAntes = /"puerto_mina":"reparado"/.test(localStorage.getItem(V.clave())) && gEscalera.visible === false; } catch (e) { guardadoAntes = false; } } };
      ir(P.reparar.x, P.reparar.z); correr(0.05); pulsar('e'); correr(0.2);
      check('13 · Paso 7: con 4/4, E en el pie de la ladera repara (el estado ya estaba guardado antes de los efectos)', estado() === 'reparado' && guardadoAntes === true && V.otorgado('puerto_mina'));
      const xpSin = V.otorgado('xp_puerto');
      G.v18evo = evo;
      let xp = null;
      if (evo && evo.info) { const sp = V.seleccionada() || 'vittata', x0 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); const x1 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); aplicar(); xp = [x0, x1, evo.info(sp).xp]; }
      check('13b · XP V18.2: 150 al terminar, una sola vez, también si evolucion.js llega después', !xpSin && (xp ? xp[1] - xp[0] >= XP_FIN && xp[2] === xp[1] && V.otorgado('xp_puerto') : true), xp ? xp.join(' → ') : 'sin G.v18evo en esta sesión');
      cerrarCharlas();
      // 14 · paso 8: transformación visible; apariencias nuevas
      correr(0.2);
      const ci = N.instancia('constructor'), ii = N.instancia('ingeniera');
      check('14 · Paso 8: escalera con faroles y banderines, obra recogida, máquina verde con maceta y farol', gEscalera.visible && !gObra.visible && maq.flor.visible && !maq.broca.visible && maq.pintada === 'flor');
      check('14b · El Constructor pasa a reparador (sin chaleco, franja verde) y la Ingeniera a responsable (chaqueta, insignia)', N.estado('constructor') === 'reparador' && N.estado('ingeniera') === 'responsable' && ci && ci.apariencia === 'reparador' && !ci.acc.chaleco.visible && ci.acc.franja.visible && ii && ii.apariencia === 'responsable' && ii.nodos.Chaqueta.visible && ii.acc.insignia.visible);
      const sube = subir(900);
      check('14c · La escalera se sube a pie de la plaza a la meseta, sin volar ni rescate de atasco', sube.ok && sube.y > -0.6, 's ' + sube.s.toFixed(1) + '/' + L.toFixed(1) + ' · Δy ' + sube.y.toFixed(2) + ' · rescates ' + sube.rescates + (sube.volo ? ' · voló' : ''));
      // 15 · paso 9: persiste tras guardar y recargar
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.2);
      check('15 · Paso 9: tras recargar siguen la escalera, la rampa, la máquina reconvertida, las apariencias y los diálogos nuevos', reparado() && gEscalera.visible && M.rampas.every(p => p.when()) && maq.flor.visible && N.estado('constructor') === 'reparador' && N.instancia('ingeniera') && N.instancia('ingeniera').apariencia === 'responsable'
        && (N.def('constructor').porEstado[N.estado('constructor')].dialogo[0] || '').indexOf('Construir rápido') === 0);
      check('15b · Tras recargar, ni el premio ni la XP se repiten', !V.otorgar('puerto_mina', 'puerto_mina', 1) && pagarXP() === 0);
      // 16 · partidas viejas y valores raros
      localStorage.setItem(V.clave(), JSON.stringify({ v: 1, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado' }, sel: null }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      const vieja = estado() === 'obra' && !gEscalera.visible && gObra.visible && N.estado('constructor') === 'supervisor' && M.collider.when();
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'zzz', 'personaje:constructor': 'jefe_supremo' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('16 · Una partida V18 vieja sin estas claves carga y empieza en «obra»; un valor desconocido no rompe nada', vieja && estado() === 'obra' && N.estado('constructor') === 'supervisor');
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('16b · Con la misión hecha pero sin las claves de personaje (build vieja) se deducen reparador y responsable', N.estado('constructor') === 'reparador' && N.estado('ingeniera') === 'responsable' && gEscalera.visible);
      check('16c · El estado nunca retrocede ni cambia de bando sin causa', !N.cambiarEstado('constructor', 'supervisor') && !avanzar('obra') && reparado());
      // 17 · «Comenzar de cero» (borra la clave V18 y aplica el mundo, como guardado.reset)
      localStorage.removeItem(V.clave()); G.emit('apply'); await esperar(60); correr(0.1);
      check('17 · «Comenzar de cero» lo borra: sin escalera, máquina otra vez atascada, personajes al principio', estado() === 'obra' && !gEscalera.visible && !M.rampas.some(p => p.when()) && N.estado('constructor') === 'supervisor' && N.estado('ingeniera') === 'aprendiz' && maq.pintada !== 'flor');
      // 18 · no toca las misiones del capítulo
      check('18 · No toca las misiones del capítulo (estado de misiones, pasos, eventos e inventario iguales)', misiones() === mis0 && JSON.stringify(S.inv || {}) === inv0);
      // 19 · textos
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
      const D = window.AV_EN || {}, pats = Object.keys(D).filter(k => k.indexOf('{}') >= 0).map(k => new RegExp('^' + k.split('{}').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'));
      const tx = textos(), faltan = tx.filter(t => !D[t] && !pats.some(re => re.test(t)));
      check('19 · Todos los textos tienen inglés en content/cap1/en.js', !faltan.length, faltan.slice(0, 6).join(' | '));
      check('19b · Ningún texto ni dato menciona «FeixZero»', !/feix/i.test(tx.join(' ') + JSON.stringify(N.defs())));
      // 20 · lejos se liberan
      V.cambiarMundo('puente_villa', 'reparado'); ir(villa.x, villa.z); correr(0.2);
      const st = N.stats();
      check('20 · Al alejarse (> 150 m) se liberan los personajes y sus piezas (la caché del modelo se queda)', N.activos().length === 0 && st.liberadas >= 2 && st.geoAccesorios === 0, JSON.stringify(st));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    // restaurar
    try { cerrarCharlas(); } catch (e) { /* */ }
    soltarModo(); A.manual = false; A.forzar = false; A.frenando = false; A.pistas.clear(); A.aciertos = 0; A.j = null; timers.length = 0;
    evTest = null; v18Test = null;
    G.ui.toast = toast0; G.quiet = quiet0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); aplicar(); quitarGuia();
    N.paso(0.01, false);
    if (titAbierta) tit.open = true; if (cre) cre.hidden = creOculto; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18puerto = { ID, ESTADOS, estado, avanzar, aplicar, usarPoder, reparar, pagarXP, paso, SITIO, test, get perfil() { return M.perfil; }, get valido() { return M.valido; }, sesion: () => A };
  return G.v18puerto;
};
