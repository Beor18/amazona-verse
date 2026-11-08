/* Juego · V18.3 · misión 2 del arco del Constructor, la Ingeniera y Tuerca: «Los faroles de las Atalayas» (G.v18arco).
   Sigue a «El puerto que volvió a vivir» (puerto.js). Directiva docs/DIRECTIVA_V18_3_RESOLUCION.md §3 (mundo abierto, ciudades que
   ya existen), §8 (un modelo, varias apariencias) y §9 (poderes V18.1). Contenido adicional: no toca los seis capítulos.
   - Dónde: Atalayas del Oeste (plaza −69,2, 68,4; content/cap1/mundo.js), fuera de las zonas de los capítulos (src/game/zonas.js) y
     sin misión del capítulo cerca. Usa tres de las once torres vigía que ya están (assets/data/mapa_cap1.js, escenaKelvin); no
     añade edificios ni modelos: el invento, los nidos, los faroles y los banderines son piezas simples como las del puerto.
   - Cuándo: con la bandera V18 y el puerto reparado. Al alejarse del puerto (> 160 m) los tres se mudan a las Atalayas (aviso y
     bandera verde del minimapa, una vez por sesión); mientras la misión no empieza, si Vittata vuelve al puerto (< 140 m) vuelven a
     estar allí. Empezada la misión, viven en las Atalayas (puerto.js les cede la colocación: G.v18arco.elenco()).
   - Historia: Tuerca, ya inventor, estrena el «Espantanubes» para alejar las tormentas, pero sopla tanto que revolvió los nidos
     de las torres. Nadie es malo: el Constructor, que ya aprendió en el puerto, propone mirar primero y arreglar después.
   - Pasos (estado G.v18.mundo.arco_atalayas: inicio → reunion → nidos → afinado → encendido; solo avanza):
     1 el invento de Tuerca causa un problema sin querer (ráfagas que empujan suave, nada de daño) · 2 Vittata llega y el
     Constructor, Tuerca y la Ingeniera le cuentan qué pasa; la Ingeniera se pone su equipo de rescate · 3 vuela (ALAS) a lo alto
     de tres torres y acomoda los nidos (con un poder OJOS brillan más; cada torre tiene una percha) · 4 calma el invento con el
     poder de su especie: 3 aciertos (motor de habilidades V18.1, como el engranaje del puerto) · 5 Tuerca y la Ingeniera lo
     reconvierten en «faroles mensajeros» · 6 Vittata los enciende con Tuerca (el estado se guarda antes de los efectos) ·
     7 transformación visible: faroles en las tres torres, banderines en la plaza, el invento verde y tranquilo con maceta ·
     8 apariencias nuevas del mismo modelo: Tuerca «aliado», el Constructor «vecino», la Ingeniera «rescate» · 9 todo persiste.
   - Personajes: la Ingeniera y el Constructor con npc.js (tope de 2); Tuerca aparte, como en el puerto, con los datos de su fila
     de content/comun/personajes_v18.js y el modelo en caché de npc.js (cargarModelo).
   - XP V18.2: 120 al terminar, una sola vez (no se toca evolucion.js).
   - Después: la misión 3, «El muelle de la otra orilla» (muelle.js). Con los faroles encendidos, la Ingeniera y el Constructor se
     mudan al Embarcadero de las Canoas (muelleTiene()); Tuerca se queda aquí con sus faroles.
   Solo con la bandera V18 (src/boot.js, después de puerto.js). Prueba: AV.v18ArcoTest() (junta esta y la de muelle.js). */
window.AVV18Arco = function (G) {
  'use strict';
  if (G.v18arco) return G.v18arco;
  const V = G.v18 || window.AVV18Progreso(G);
  const N = G.v18npc, H = G.v18hab;
  const S = G.S, T = G.terreno, scene = G.renderer.scene;
  const ID = 'arco_atalayas';
  const ESTADOS = ['inicio', 'reunion', 'nidos', 'afinado', 'encendido'];
  const XP_FIN = 120, R_VISTA = 220, R_REUNION = 9, R_LLEGADA = 30, R_ENCUENTRO = 14, R_HUD = 40, R_AVISO = 45, R_CEDE = 160, R_DEVUELVE = 140, RAFAGA_S = 5;
  const ALTO_TORRE = 7.9; // alto de torre_vigia.glb (kit de madera) a escala 1
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const PUERTO = { x: 73.6, z: -75.2 };
  // Medido en el mapa real: la plaza de las Atalayas (content/cap1/mundo.js, PLAZAS) y tres torres vigía del grupo kelvin_aldea_lomas
  const SITIO = { plaza: { x: -69.2, z: 68.4 }, maq: { x: -68.4, z: 69.6 }, tue: { x: -66.4, z: 70.6 }, ing: { x: -71.2, z: 71.0 }, con: { x: -70.6, z: 66.6 },
    banderin: [{ x: -73.6, z: 66.2 }, { x: -64.9, z: 70.9 }] };
  const TORRES = [[-80.7, 67.4], [-61.3, 83.5], [-89.5, 73.2]];
  const TXT = {
    titulo: 'Los faroles de las Atalayas',
    aviso: 'En las Atalayas del Oeste algo zumba muy fuerte… La bandera verde del mapa te lleva.',
    llegada: [['tuerca', '¡Les presento mi Espantanubes! Sopla tan fuerte que aleja las tormentas.'], ['ingeniera', 'Tuerca… también despeinó los nidos de las torres.'], ['constructor', 'Eso me suena. Yo también hacía cosas sin mirar.']],
    reunion: [['constructor', '¡Hola, Vittata! Esta vez lo hacemos bien: primero miramos, luego arreglamos.'], ['tuerca', 'Mi invento quería ayudar… pero asustó a las cotorras de las torres.'],
      ['ingeniera', 'Me pongo mi equipo de rescate. ¡Hay tres nidos revueltos arriba de las torres!'], ['ingeniera', 'Tú vuelas, Vittata. ¿Los acomodas?']],
    nido: 'Acomodar el nido', nidoN: '¡Nido acomodado! ({}/3)',
    nidos: ['Ramitas en su sitio. ¡Qué nido tan cómodo!', 'Una pluma verde en el nido: aquí vive alguien.', 'Desde aquí se ve casi toda la isla. ¡Qué vista!'],
    ojos: 'Tus ojos ven los nidos desde lejos: brillan arriba de las torres.',
    achis: '¡Achís! El Espantanubes estornuda viento.',
    nidosListos: [['ingeniera', '¡Los tres nidos, listos! Ahora hay que calmar al Espantanubes.'], ['tuerca', 'Su motor va muy rápido. Con tu poder lo bajamos: tres veces.']],
    acierto: '¡Más suave! {}/3', falla: 'Mira a la hélice y acércate un poco más.', espera: 'Tu poder se está recargando…',
    afinado: [['tuerca', '¡Ahora susurra! Ya no asusta a nadie.'], ['ingeniera', 'Tuerca, ¿y si en vez de soplar las nubes… avisa cuando vienen?'], ['tuerca', '¡Faroles mensajeros! Brillan cuando viene una tormenta. ¡Vamos a encenderlos!']],
    encender: 'Encender los faroles con Tuerca',
    encendido: '¡Los faroles mensajeros ya brillan sobre las Atalayas!',
    fin: [['tuerca', 'Toda la isla verá la luz. ¡Y las cotorras duermen tranquilas!'], ['constructor', 'Mirar primero, luego construir. ¡Ya me lo sé de memoria!'], ['ingeniera', 'Hoy fuimos un gran equipo. ¡Gracias, Vittata!']],
    obj: { inicio: 'Ve a la plaza de las Atalayas: ahí está el invento de Tuerca.', nidos: 'Vuela a las torres y acomoda los nidos: {}/3', poder: 'Calma el Espantanubes con tu poder: {}/3', afinado: 'Enciende los faroles mensajeros con Tuerca.' },
    poder: 'Poder', guia: '{}: mira a la hélice y pulsa Acción o G', guiaT: 'Toca Poder mirando a la hélice', guiaEscudo: 'Escudo de plumas: ábrelo cuando la máquina sople (Acción o G)',
    hablarTue: 'Hablar con Tuerca', hablarIng: 'Hablar con la Ingeniera', hablarCon: 'Hablar con el Constructor'
  };
  const con = (t, ...v) => { let i = 0; return t.replace(/\{\}/g, () => String(v[i++])); };
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3200); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18arco', ev); } catch (e) { /* sin oyentes */ } };
  const guardarJuego = () => { try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* sin guardado */ } };
  const alto = (x, z) => T.height(x, z);

  // ---------- Estado ----------
  const estado = () => { const e = V.mundo(ID); return ESTADOS.indexOf(e) >= 0 ? e : 'inicio'; }; // desconocido: como inicio
  const rango = e => ESTADOS.indexOf(e);
  const hecho = () => estado() === 'encendido';
  function avanzar(e) { if (rango(e) <= rango(estado())) return false; V.cambiarMundo(ID, e); emitir({ tipo: 'estado', estado: e }); return true; }
  const claveNido = i => 'v18_arco_nido_' + i;
  const nidoListo = i => V.mundo(claveNido(i)) === 'acomodado';
  const nidosListos = () => TORRES.filter((t, i) => nidoListo(i)).length;
  const A = { aciertos: 0, j: null, rafagaT: RAFAGA_S, manual: false, forzar: false, avisado: false, llegada: false, reuniendo: false, ojos: false, achis: false, empuje: null, tengo: false, tueCharlas: 0 };
  const M = { valido: false, hecho: false, torres: null, collider: null, perchas: [] };
  const puertoListo = () => V.mundo('puerto_mina') === 'reparado';
  const listo = () => !!(G.V18 || A.forzar) && puertoListo() && M.valido && (!G.zonas || !G.zonas.activa || G.zonas.dentro(SITIO.plaza.x, SITIO.plaza.z));
  // ¿Los tres están en las Atalayas? Empezada la misión, siempre; antes, según lo lejos que esté Vittata del puerto (con margen)
  function calcElenco() {
    if (!listo()) return false;
    if (rango(estado()) > 0) return true;
    const d = Math.hypot(S.pos.x - PUERTO.x, S.pos.z - PUERTO.z);
    return d > R_CEDE ? true : d < R_DEVUELVE ? false : A.tengo;
  }

  // ---------- Torres (las del mapa real) ----------
  function medirTorres() {
    const ek = T.mapa && T.mapa.escenaKelvin, lista = [];
    for (const e of (ek && ek.compacto) || []) if (e.grupo === 'kelvin_aldea_lomas' && e.modelo === 'torre_vigia') for (const v of e.inst || []) {
      if (v.length >= 16) lista.push({ x: v[12], y: v[13], z: v[14], s: Math.hypot(v[0], v[1], v[2]) }); else lista.push({ x: v[0], y: v[1], z: v[2], s: v[4] || 1 });
    }
    const out = [];
    for (const [x, z] of TORRES) { const t = lista.find(o => Math.hypot(o.x - x, o.z - z) < 1.5); if (!t) return null; out.push({ x: t.x, z: t.z, base: t.y, top: t.y + ALTO_TORRE * t.s }); }
    return out;
  }

  // ---------- Escena (piezas simples; nada de modelos nuevos) ----------
  const mats = {};
  const mat = (k, c, o) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.75, metalness: 0 }, o || {})));
  const caja = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cil = (r0, r1, h, n, m) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n || 10), m);
  const raiz = new THREE.Group(); raiz.name = 'v18-arco'; raiz.visible = false; scene.add(raiz);
  const grupo = (n, padre) => { const g = new THREE.Group(); g.name = n; (padre || raiz).add(g); return g; };
  let gMaq, gHelice, gFlor, gBander, gTue, itTue = null;
  const gNidos = [], gFaroles = [];
  const maq = { pintada: null, giro: 0, sacude: 0 };
  function construir() {
    if (M.hecho) return;
    M.hecho = true;
    const madera = mat('madera', '#9a6a3c'), ramas = mat('ramas', '#7a5230', { roughness: 0.95 }), metal = mat('metal', '#7c8790', { metalness: 0.5, roughness: 0.45 });
    const brillo = mat('brillo', '#fff1a8', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
    const haz = mat('haz', '#fff4c2', { emissive: new THREE.Color('#ffe08a'), emissiveIntensity: 0.6, transparent: true, opacity: 0.28, depthWrite: false });
    const luz = mat('luz', '#ffd98a', { emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 1.3 });
    // 1 · el Espantanubes de Tuerca: carrito con mástil y hélice (gira rápido y sopla; calmado gira despacio)
    gMaq = grupo('v18-arco-espantanubes');
    const cuerpo = caja(1.4, 0.8, 1.0, mat('maqCuerpo', '#d9822b', { roughness: 0.55, metalness: 0.2 })); cuerpo.position.y = 0.7; gMaq.add(cuerpo);
    for (const [x, z] of [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0.55], [0.5, 0.55]]) { const r = cil(0.25, 0.25, 0.14, 12, mat('goma', '#2d2f33')); r.rotation.x = Math.PI / 2; r.position.set(x, 0.25, z); gMaq.add(r); }
    const mastil = cil(0.07, 0.09, 1.9, 8, metal); mastil.position.y = 2.0; gMaq.add(mastil);
    gHelice = new THREE.Group(); gHelice.name = 'v18-arco-helice'; gHelice.position.set(0.18, 2.85, 0);
    const buje = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('rojo', '#c8322a')); gHelice.add(buje);
    for (let i = 0; i < 3; i++) { const p = caja(0.06, 1.1, 0.24, mat('pala', '#f2efe6', { roughness: 0.5 })); const a = i / 3 * Math.PI * 2; p.position.set(0.04, Math.cos(a) * 0.58, Math.sin(a) * 0.58); p.rotation.x = -a; gHelice.add(p); }
    gMaq.add(gHelice);
    const bocina = cil(0.08, 0.28, 0.5, 10, metal); bocina.rotation.z = -Math.PI / 2; bocina.position.set(0.9, 0.9, 0); gMaq.add(bocina);
    for (let i = 0; i < 4; i++) { const f = caja(0.02, 0.14, 0.24, mat(i % 2 ? 'aviso1' : 'aviso0', i % 2 ? '#1f1f1f' : '#ffd23a')); f.position.set(-0.71, 0.55, -0.36 + i * 0.24); gMaq.add(f); }
    // 7 · calmado y reconvertido: maceta con flores y un farolito en lo alto del mástil
    gFlor = grupo('v18-arco-flor', gMaq);
    const maceta = cil(0.32, 0.25, 0.35, 12, mat('barro', '#b5643c')); maceta.position.set(-0.35, 1.28, 0); gFlor.add(maceta);
    const hojas = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), mat('hojas', '#3f8f3a')); hojas.position.set(-0.35, 1.6, 0); hojas.scale.y = 0.75; gFlor.add(hojas);
    for (let i = 0; i < 5; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat('flor' + (i % 3), ['#ff6fa8', '#ffd23a', '#ffffff'][i % 3])); const a = i * 1.25; fl.position.set(-0.35 + Math.cos(a) * 0.27, 1.72 + (i % 2) * 0.08, Math.sin(a) * 0.27); gFlor.add(fl); }
    const farolito = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), luz); farolito.position.set(0, 3.1, 0); gFlor.add(farolito);
    const p0 = enSeco(SITIO.maq.x, SITIO.maq.z); SITIO.maq.x = p0.x; SITIO.maq.z = p0.z;
    maq.giro = Math.atan2(-(TORRES[0][1] - SITIO.maq.z), TORRES[0][0] - SITIO.maq.x); // la bocina (+x) mira a la primera torre
    gMaq.position.set(SITIO.maq.x, alto(SITIO.maq.x, SITIO.maq.z), SITIO.maq.z); gMaq.rotation.y = maq.giro;
    M.collider = { kind: 'v18arcomaq', x: SITIO.maq.x, z: SITIO.maq.z, r: 1.0, h: 3, when: () => listo() };
    G.fisica.colliders.push(M.collider);
    // 3 · los nidos en lo alto de las torres (revueltos, con un haz de luz para encontrarlos) y 7 · los faroles mensajeros
    const geoRama = new THREE.CylinderGeometry(0.035, 0.035, 0.7, 5);
    M.torres.forEach((t, i) => {
      const g = grupo('v18-arco-nido-' + i); g.position.set(t.x, t.top, t.z);
      const nido = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 6, 14), ramas); nido.rotation.x = Math.PI / 2; nido.position.y = 0.12; nido.name = 'nido'; g.add(nido);
      const revuelto = new THREE.Group(); revuelto.name = 'revuelto';
      for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(geoRama, ramas); const a = k * 1.05 + i; r.position.set(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7); r.rotation.set(1.2 + k * 0.3, a, 0.4); revuelto.add(r); }
      g.add(revuelto);
      const pluma = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 6), mat('pluma', '#3fae5a')); pluma.position.set(0.18, 0.3, 0.05); pluma.rotation.z = 0.6; pluma.name = 'pluma'; g.add(pluma);
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), brillo); aura.position.y = 0.55; aura.name = 'aura'; g.add(aura);
      const columna = cil(0.22, 0.22, 7, 10, haz); columna.position.y = 4; columna.name = 'haz'; g.add(columna);
      gNidos.push(g);
      const f = grupo('v18-arco-farol-' + i); f.position.set(t.x + 0.75, t.top, t.z);
      const poste = cil(0.05, 0.06, 1.3, 6, mat('negro', '#2c2a28', { metalness: 0.4 })); poste.position.y = 0.65; f.add(poste);
      const techo = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 8), mats.negro); techo.position.y = 1.62; f.add(techo);
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), luz); bola.position.y = 1.4; bola.name = 'luz'; f.add(bola);
      gFaroles.push(f);
      // percha en lo alto: Vittata puede posarse junto al nido
      M.perchas.push(G.fisica.addPercha({ x: t.x, z: t.z, y: t.top + 0.05, r: 1.3, when: () => listo() || hecho() }));
      G.interaccion.add({ id: 'v18_puerto_arco_nido_' + i, x: t.x, z: t.z, r: 4,
        visible: () => listo() && estado() === 'reunion' && !nidoListo(i) && S.pos.y > t.top - 3 && S.pos.y < t.top + 7,
        label: () => TXT.nido, use: () => acomodar(i) });
    });
    // 7 · banderines lisos de colores (ninguna bandera de país) entre dos postes de la plaza
    gBander = grupo('v18-arco-banderines');
    const [b0, b1] = SITIO.banderin.map(p => enSeco(p.x, p.z));
    const ends = [b0, b1].map(p => { const y = alto(p.x, p.z), po = cil(0.06, 0.08, 2.8, 6, madera); po.position.set(p.x, y + 1.4, p.z); gBander.add(po); return { x: p.x, y: y + 2.7, z: p.z }; });
    const COLS = ['#3fae5a', '#ffd23a', '#f08a2a', '#2bb3b1', '#9b6ad0'], nB = 14, tri = new THREE.BufferGeometry(), o3 = new THREE.Object3D();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.16, 0, 0, 0.16, 0, 0, 0, -0.34, 0], 3)); tri.computeVertexNormals();
    const banderines = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), nB);
    const [f0, f1] = ends, rotB = Math.atan2(-(f1.z - f0.z), f1.x - f0.x);
    for (let i = 0; i < nB; i++) { const t = (i + 0.5) / nB; o3.position.set(f0.x + (f1.x - f0.x) * t, f0.y + (f1.y - f0.y) * t - Math.sin(Math.PI * t) * 0.7, f0.z + (f1.z - f0.z) * t); o3.rotation.set(0, rotB, 0); o3.updateMatrix(); banderines.setMatrixAt(i, o3.matrix); banderines.setColorAt(i, new THREE.Color(COLS[i % COLS.length]).convertSRGBToLinear()); }
    gBander.add(banderines);
    const cuerdaB = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 13 }, (_, i) => { const t = i / 12; return new THREE.Vector3(f0.x + (f1.x - f0.x) * t, f0.y + (f1.y - f0.y) * t - Math.sin(Math.PI * t) * 0.7, f0.z + (f1.z - f0.z) * t); }));
    gBander.add(new THREE.Line(cuerdaB, new THREE.LineBasicMaterial({ color: '#e8dcc0' })));
    // 6 · encender los faroles con Tuerca, junto al invento
    G.interaccion.add({ id: 'v18_puerto_arco_encender', x: SITIO.maq.x, z: SITIO.maq.z, r: 3, visible: () => listo() && estado() === 'afinado', label: () => TXT.encender, use: encender });
    // Tuerca (carga diferida propia, con el modelo en caché de npc.js)
    gTue = grupo('v18-arco-tuerca');
    const pt = enSeco(SITIO.tue.x, SITIO.tue.z); SITIO.tue.x = pt.x; SITIO.tue.z = pt.z;
    itTue = G.interaccion.add({ id: 'v18_puerto_arco_tuerca', x: SITIO.tue.x, z: SITIO.tue.z, r: 2.6, visible: () => A.tengo && !!tue.raiz && !fiestaTiene(), label: () => TXT.hablarTue, use: () => usar('tuerca') });
    for (const k of ['ing', 'con']) { const p = enSeco(SITIO[k].x, SITIO[k].z); SITIO[k].x = p.x; SITIO[k].z = p.z; }
  }
  // sitio seco y libre cerca de (x, z) (mismo criterio que puerto.js)
  function enSeco(x, z) {
    const seco = (px, pz) => {
      try {
        const h = alto(px, pz);
        if (G.agua && G.agua.levelAt(px, pz) > h - 0.2) return false;
        const F = G.fisica, q = { x: px, z: pz, y: h };
        if (F && F.pushOut) for (const c of F.colliders) { if (c.kind === 'v18arcomaq') continue; F.pushOut(q, c, 0.7); if (q.x !== px || q.z !== pz) return false; }
      } catch (e) { /* sin consulta */ }
      return true;
    };
    if (seco(x, z)) return { x, z };
    for (let r = 1; r <= 4; r += 1) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * 0.785) * r, pz = z + Math.sin(a * 0.785) * r; if (seco(px, pz)) return { x: px, z: pz }; }
    return { x, z };
  }

  // ---------- Tuerca: un modelo, varias apariencias (datos de su fila en personajes_v18.js) ----------
  const tue = { cargando: false, fallo: null, raiz: null, modelo: null, nodos: {}, mats: [], mixer: null, acciones: {}, anim: null, hablaT: 0, apariencia: null };
  const RETRATO_TUE = (() => { // el mismo engranaje que en puerto.js
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3b4250"/>' +
      '<g fill="#ffd23a"><circle cx="32" cy="13" r="5"/><circle cx="48" cy="24" r="5"/><circle cx="43" cy="43" r="5"/><circle cx="21" cy="43" r="5"/><circle cx="16" cy="24" r="5"/></g>' +
      '<circle cx="32" cy="32" r="16" fill="#c68a5c"/><circle cx="26.5" cy="30" r="1.8" fill="#2b2118"/><circle cx="37.5" cy="30" r="1.8" fill="#2b2118"/>' +
      '<path d="M25 39q7 4 14 0" stroke="#2b2118" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="32" cy="32" r="6" fill="#3b4250"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  })();
  function cargarTue() {
    if (tue.cargando || tue.raiz || !N.def('tuerca')) return;
    tue.cargando = true;
    N.cargarModelo('tuerca').then(m => { tue.cargando = false; if (!m) { tue.fallo = 'sin modelo'; return; } try { montarTue(m); } catch (e) { tue.fallo = 'montar: ' + ((e && e.message) || e); } });
  }
  function montarTue(m) {
    if (tue.raiz) return;
    const modelo = m.raiz.clone(true), vistos = new Map();
    let sombra = false; try { sombra = !!(G.renderer.nivel && G.renderer.nivel() === 'alto'); } catch (e) { /* sin nivel */ }
    modelo.traverse(o => {
      if (o.name) tue.nodos[o.name] = tue.nodos[o.name] || o;
      if (!o.isMesh) return;
      o.castShadow = sombra; o.receiveShadow = false;
      const cl = mm => { if (!vistos.has(mm)) { const c = mm.clone(); c.userData.c0 = mm.color ? mm.color.clone() : null; vistos.set(mm, c); tue.mats.push(c); } return vistos.get(mm); };
      o.material = Array.isArray(o.material) ? o.material.map(cl) : cl(o.material);
    });
    if (m.clips && m.clips.length) { tue.mixer = new THREE.AnimationMixer(modelo); for (const clip of m.clips) tue.acciones[clip.name] = tue.mixer.clipAction(clip); }
    tue.raiz = new THREE.Group(); tue.raiz.name = 'v18-arco-tuerca-raiz'; tue.raiz.add(modelo); tue.modelo = modelo;
    gTue.add(tue.raiz);
    tue.raiz.position.set(SITIO.tue.x, alto(SITIO.tue.x, SITIO.tue.z), SITIO.tue.z);
    tue.raiz.rotation.y = Math.atan2(SITIO.maq.x - SITIO.tue.x, SITIO.maq.z - SITIO.tue.z);
    if (tue.mixer) tue.mixer.update(0.001);
    vestirTue();
  }
  function aparienciaTue(nom) {
    const d = N.def('tuerca'), a = d && d.apariencias[nom];
    if (!tue.raiz || !a) return false;
    const grupos = d.mallas || {}, nodosDe = k => (grupos[k] || [k]).map(n => tue.nodos[n]).filter(Boolean);
    for (const k of Object.keys(Object.assign({}, ...Object.values(d.apariencias).map(x => x.mallas || {})))) for (const n of nodosDe(k)) n.visible = true;
    for (const k in a.mallas || {}) for (const n of nodosDe(k)) n.visible = !!a.mallas[k];
    for (const mt of tue.mats) { if (mt.userData.c0) mt.color.copy(mt.userData.c0); const h = a.colores && a.colores[mt.name]; if (h) mt.color.copy(new THREE.Color(h).convertSRGBToLinear()); }
    tue.apariencia = nom;
    return true;
  }
  function animarTue(nom) {
    if (!tue.mixer) return;
    const act = tue.acciones[nom];
    if (!act || tue.anim === nom) return;
    const prev = tue.anim && tue.acciones[tue.anim];
    act.reset().setEffectiveWeight(1).play();
    if (prev) prev.crossFadeTo(act, 0.3, false);
    tue.anim = nom;
  }
  function vestirTue() {
    if (!tue.raiz) return;
    const d = N.def('tuerca'), pe = (d && d.porEstado[N.estado('tuerca')]) || {};
    aparienciaTue(pe.apariencia || 'inventor');
    animarTue(hecho() ? 'Reparar' : 'Idle'); // con los faroles encendidos, sigue ajustando su invento
  }
  function pasoTue(dt) {
    if (!tue.raiz) return;
    const px = tue.raiz.position.x, pz = tue.raiz.position.z, d = Math.hypot(S.pos.x - px, S.pos.z - pz);
    const objetivo = d < 7 ? Math.atan2(S.pos.x - px, S.pos.z - pz) : Math.atan2(SITIO.maq.x - px, SITIO.maq.z - pz);
    let dif = objetivo - tue.raiz.rotation.y; while (dif > Math.PI) dif -= Math.PI * 2; while (dif < -Math.PI) dif += Math.PI * 2;
    tue.raiz.rotation.y += dif * Math.min(1, dt * 4);
    let bajo = false; try { bajo = !!(G.renderer.nivel && G.renderer.nivel() === 'bajo'); } catch (e) { /* sin nivel */ }
    if (tue.mixer && !bajo && d < 60) tue.mixer.update(dt); // en «bajo», la pose del fotograma 0 (regla de npc.js)
    if (tue.hablaT > 0 && (tue.hablaT -= dt) <= 0) vestirTue();
  }
  function liberarTue() {
    if (!tue.raiz) return;
    if (tue.mixer) { tue.mixer.stopAllAction(); tue.mixer.uncacheRoot(tue.modelo); }
    gTue.remove(tue.raiz);
    for (const mt of tue.mats) mt.dispose();
    Object.assign(tue, { raiz: null, modelo: null, nodos: {}, mats: [], mixer: null, acciones: {}, anim: null, hablaT: 0, apariencia: null });
  }

  // ---------- Charlas (la Ingeniera y el Constructor con npc.js; Tuerca con su retrato) ----------
  function decir(who, textos, fin, opts) {
    if (who !== 'tuerca') return N.decir(who, textos, fin, opts);
    tue.hablaT = 1.5 + textos.length * 2.5; animarTue('Hablar');
    try { G.dialogo.say(textos.map(t => ({ who: N.nombre('tuerca'), img: RETRATO_TUE, text: t })), fin || null, Object.assign({ caja: true }, opts || {})); } catch (e) { if (fin) fin(); return false; }
    return true;
  }
  // una conversación de varios: [[quién, texto]…] en cadena; la caja se pasa con Acción
  function charla(lista, fin, opts) {
    const ir = i => { if (i >= lista.length) { if (fin) fin(); return; } decir(lista[i][0], [lista[i][1]], () => ir(i + 1), opts); };
    ir(0);
  }
  // Acción sobre uno de los tres (puerto.js delega aquí la Ingeniera y el Constructor mientras están en las Atalayas)
  const fiestaTiene = () => { try { return !!(G.v18fiesta && G.v18fiesta.elenco && G.v18fiesta.elenco()); } catch (e) { return false; } };
  const muelleTiene = () => { try { return !!(G.v18muelle && G.v18muelle.elenco && G.v18muelle.elenco()); } catch (e) { return false; } };
  function usar(id) {
    if (id !== 'tuerca' && muelleTiene()) return G.v18muelle.usar(id);
    const e = estado();
    if (e === 'inicio') return reunion();
    if (e === 'encendido') {
      const d = N.def(id), lineas = (d && d.porEstado[N.estado(id)] || {}).dialogo || [];
      if (id !== 'tuerca') return N.decir(id, lineas);
      A.tueCharlas++;
      return decir('tuerca', A.tueCharlas === 1 ? lineas : [lineas[A.tueCharlas % lineas.length]]);
    }
    return decir(id, [objetivo()]);
  }
  const etiqueta = id => id === 'tuerca' ? TXT.hablarTue : id === 'ingeniera' ? TXT.hablarIng : TXT.hablarCon;

  // ---------- Aplicar el estado guardado (persistencia, recarga y «Comenzar de cero») ----------
  function deducir() {
    // partidas de antes (sin las claves de personaje): el puerto hecho deja a Tuerca inventor; el arco hecho, a los tres al final
    if (puertoListo()) { N.cambiarEstado('tuerca', 'inventor'); N.cambiarEstado('ingeniera', 'responsable'); N.cambiarEstado('constructor', 'reparador'); }
    if (rango(estado()) >= rango('reunion')) N.cambiarEstado('ingeniera', 'rescate');
    if (hecho()) { N.cambiarEstado('tuerca', 'aliado'); N.cambiarEstado('constructor', 'vecino'); }
  }
  function colocarElenco() {
    const fin = hecho(), ve = () => A.tengo && listo();
    N.colocar('ingeniera', { x: SITIO.ing.x, z: SITIO.ing.z, rotY: Math.atan2(SITIO.maq.x - SITIO.ing.x, SITIO.maq.z - SITIO.ing.z), anim: null, aparece: ve, comenta: fin });
    N.colocar('constructor', { x: SITIO.con.x, z: SITIO.con.z, rotY: Math.atan2(SITIO.maq.x - SITIO.con.x, SITIO.maq.z - SITIO.con.z), anim: null, aparece: ve, comenta: fin });
  }
  function aplicar() {
    if (!M.valido) return false;
    construir();
    deducir();
    const e = estado(), fin = e === 'encendido', ver = A.tengo && listo();
    gMaq.visible = ver; gTue.visible = ver && !fiestaTiene(); gBander.visible = ver && fin; // en la fiesta de la colina (misión 4) Tuerca está allí
    gNidos.forEach((g, i) => {
      g.visible = ver; const ok = nidoListo(i) || rango(e) >= rango('nidos');
      g.getObjectByName('revuelto').visible = !ok; g.getObjectByName('aura').visible = e === 'reunion' && !ok; g.getObjectByName('haz').visible = e === 'reunion' && !ok;
      g.getObjectByName('pluma').visible = ok;
    });
    gFaroles.forEach(f => { f.visible = ver && fin; });
    pintarMaquina(fin ? 'flor' : rango(e) >= rango('afinado') ? 'calma' : 'sopla');
    if (ver && !muelleTiene()) colocarElenco(); // con la misión 3 en marcha, los dos humanos están en el embarcadero (muelle.js)
    if (tue.raiz) vestirTue();
    if (rango(e) >= rango('afinado')) A.aciertos = 3;
    pagarXP();
    return true;
  }
  function pintarMaquina(modo) {
    if (maq.pintada === modo) return;
    maq.pintada = modo;
    mats.maqCuerpo.color.set(modo === 'flor' ? '#4f9a5a' : '#d9822b').convertSRGBToLinear();
    gFlor.visible = modo === 'flor';
  }
  // ¿cambió quién tiene a los tres? Se recoloca (el puerto los recupera con su aplicar)
  function revisarElenco() {
    const e = calcElenco();
    if (e === A.tengo) return false;
    A.tengo = e;
    try { if (G.v18puerto && G.v18puerto.aplicar) G.v18puerto.aplicar(); } catch (er) { /* sin puerto */ }
    aplicar();
    if (!e && tue.raiz) liberarTue();
    emitir({ tipo: 'elenco', aqui: e });
    return true;
  }

  // ---------- Pasos del jugador ----------
  function reunion() {
    if (estado() !== 'inicio' || !A.tengo) return false;
    if (A.reuniendo && G.dialogo && G.dialogo.open && G.dialogo.open()) return false; // QA-211: espera a una caja, no a los bocadillos (esos los corta) // otra charla la cortó: se puede volver a empezar
    A.reuniendo = true; try { G.dialogo.cancelarLibre(); } catch (e) { /* QA-211: los bocadillos de llegada no siguen después */ }
    quitarGuia();
    charla(TXT.reunion.slice(0, 2), () => {
      // la Ingeniera se pone el equipo de rescate antes de pedir ayuda (se ve el cambio mientras habla)
      if (avanzar('reunion')) { N.cambiarEstado('ingeniera', 'rescate'); aplicar(); }
      charla(TXT.reunion.slice(2), () => { A.reuniendo = false; });
    });
    return true;
  }
  function acomodar(i) {
    if (estado() !== 'reunion' || nidoListo(i) || !V.cambiarMundo(claveNido(i), 'acomodado')) return false;
    const t = M.torres[i], n = nidosListos();
    sonar('pickup'); fx('leaves', t.x, t.top + 0.4, t.z, 12); fx('stars', t.x, t.top + 0.8, t.z, 8);
    aplicar();
    toast(TXT.nidos[i] + ' ' + con(TXT.nidoN, n), 3600);
    emitir({ tipo: 'nido', id: i, n });
    if (n >= TORRES.length && avanzar('nidos')) { A.aciertos = 0; aplicar(); charla(TXT.nidosListos, null, { libre: true, caja: false }); }
    return true;
  }
  const especie = () => (V.seleccionada && V.seleccionada()) || (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  function nuevoJugador(sp) { return H.luchador({ id: 'jugador', nombre: 'Tú', especie: sp || especie(), pos: S.pos, mira: () => S.facing }); }
  const tecnica = () => { const h = A.j && H.get(A.j.poder); return (h && h.tecnica) || 'pico'; };
  const helice = { id: 'helice', pos: { x: 0, y: 0, z: 0 } };
  function posHelice() { const c = Math.cos(maq.giro), s = Math.sin(maq.giro); helice.pos.x = SITIO.maq.x + 0.18 * c; helice.pos.z = SITIO.maq.z - 0.18 * s; helice.pos.y = alto(SITIO.maq.x, SITIO.maq.z) + 2.85; return helice.pos; }
  const timers = [];
  function ctx() {
    return {
      otro: helice,
      onda: (o, d, al) => { try { if (G.v18fx) G.v18fx.onda(o, d, al); } catch (e) { /* fx */ } },
      escudo: (f, s) => { try { if (G.v18fx) G.v18fx.escudo(S.pos, s); } catch (e) { /* fx */ } },
      despues: (s, fn) => timers.push({ t: s, fn }),
      fx: (k, x, y, z) => fx(k, x, y, z),
      sonar, lanzar: () => {},
      poder: ev => { try { G.emit('v18poder', Object.assign({ contra: 'espantanubes' }, ev)); } catch (e) { /* */ } },
      golpear: (blanco, g) => { if (blanco === helice && g && g.interrumpe) acertar('pico'); return true; } // el Grito apuntado llega a la hélice
    };
  }
  const enEncuentro = () => listo() && A.tengo && estado() === 'nidos' && A.aciertos < 3;
  function usarPoder() {
    if (!enEncuentro()) return { ok: false, motivo: 'fase' };
    if (!A.j) A.j = nuevoJugador();
    const g = posHelice(), r = H.usar(A.j, A.j.poder, ctx());
    if (!r.ok) { if (r.motivo === 'espera' || r.motivo === 'energia') toast(TXT.espera, 1600); return r; }
    emitir({ tipo: 'poder', id: A.j.poder });
    if (A.j.poder === 'grito_yunque') return r; // acierta (o no) cuando la onda llega: golpear()
    if (A.j.poder === 'escudo_plumas') { A.rafagaT = Math.min(A.rafagaT, 0.6); return r; } // acierta si la ráfaga la encuentra con el escudo
    const h = H.get(A.j.poder) || {}, dx = g.x - S.pos.x, dz = g.z - S.pos.z, d = Math.hypot(dx, dz), f = S.facing || { x: 0, z: 1 }, fl = Math.hypot(f.x, f.z) || 1;
    const mira = d < 1.5 || (dx * f.x + dz * f.z) / (d * fl) >= 0.5;
    if (d <= (h.alcance || 5) + 1 && mira) acertar(h.tecnica || 'poder'); else toast(TXT.falla, 2000);
    return r;
  }
  function acertar(como) {
    if (!enEncuentro()) return false;
    A.aciertos++; sonar('unlock'); const g = posHelice(); fx('stars', g.x, g.y, g.z, 14);
    maq.sacude = 0.5;
    emitir({ tipo: 'acierto', como, n: A.aciertos });
    if (A.aciertos < 3) { toast(con(TXT.acierto, A.aciertos), 2200); return true; }
    soltarModo();
    if (avanzar('afinado')) { aplicar(); charla(TXT.afinado); }
    return true;
  }
  function rafaga() {
    const d = Math.hypot(S.pos.x - SITIO.maq.x, S.pos.z - SITIO.maq.z), y = alto(SITIO.maq.x, SITIO.maq.z);
    fx('dust', SITIO.maq.x, y + 2.8, SITIO.maq.z, 12); fx('leaves', SITIO.maq.x, y + 2.8, SITIO.maq.z, 6); sonar('viento');
    emitir({ tipo: 'rafaga', d });
    if (d > 6) return 'lejos';
    if (A.j && A.j.escudo > 0 && enEncuentro()) { A.j.escudo = 0; try { if (G.v18fx && G.v18fx.dispersar) G.v18fx.dispersar(S.pos); } catch (e) { /* fx */ } acertar('plumas'); return 'escudo'; }
    if (!A.achis) { A.achis = true; toast(TXT.achis, 2600); }
    const enSuelo = S.pos.y - alto(S.pos.x, S.pos.z) < 2.5;
    if (d < 4 && d > 0.3 && enSuelo) A.empuje = { x: (S.pos.x - SITIO.maq.x) / d * 3, z: (S.pos.z - SITIO.maq.z) / d * 3, t: 0.3 }; // empuja suave, sin quitar nada
    return 'empuja';
  }
  function encender() {
    if (estado() !== 'afinado') return false;
    // primero se guarda el estado del mundo (G.v18, al momento) y luego vienen los efectos
    if (!avanzar('encendido')) return false;
    V.otorgar('arco_atalayas', 'arco_atalayas', 1);
    N.cambiarEstado('tuerca', 'aliado'); N.cambiarEstado('constructor', 'vecino');
    A.tueCharlas = 0;
    aplicar();
    guardarJuego();
    sonar('unlock');
    for (const t of M.torres) { fx('stars', t.x, t.top + 1.5, t.z, 12); fx('feathers', t.x, t.top + 1, t.z, 8); }
    try { G.camara.shake(0.05, 0.3); } catch (e) { /* sin cámara */ }
    toast(TXT.encendido, 4800);
    timers.push({ t: G.quiet ? 0 : 0.9, fn: () => charla(TXT.fin) });
    emitir({ tipo: 'encendido' });
    return true;
  }

  // ---------- XP V18.2 (una vez; también si evolucion.js llega después) ----------
  function pagarXP() {
    if (!hecho() || !G.v18evo || !G.v18evo.dar || V.otorgado('xp_atalayas')) return 0;
    if (!V.otorgar('xp_atalayas', 'xp_atalayas', 1)) return 0;
    return G.v18evo.dar(V.seleccionada() || 'vittata', XP_FIN, 'atalayas') || 0;
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

  // ---------- HUD pequeño (el mismo estilo que el del puerto) ----------
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    const st = document.createElement('style'); st.id = 'v18-arco-css';
    st.textContent = '#v18-arco{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(340px,calc(100vw - 32px));z-index:40;' +
      'font-family:inherit;color:#fff;background:rgba(28,32,44,.78);border-radius:16px;padding:8px 12px;text-align:center;pointer-events:none}' +
      '#v18-arco[hidden]{display:none}#v18-arco .va-t{font-weight:700;font-size:13px;letter-spacing:.04em;color:#ffe28a}#v18-arco .va-o{font-size:15px;margin-top:2px;text-wrap:pretty}' +
      '#v18-arco button{pointer-events:auto;font:inherit;font-size:15px;font-weight:700;min-height:44px;min-width:44px;padding:6px 18px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;margin-top:6px}' +
      '#v18-arco button.no{opacity:.45}@media (max-width:760px){body.v18-arco-on #quest{display:none}body.v18-arco-on #minimapa{visibility:hidden}#v18-arco{top:calc(env(safe-area-inset-top,0px) + 64px)}}body.v18-arco-on #toast{z-index:41}';
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'v18-arco'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-labelledby', 'va-t');
    el.innerHTML = '<div class="va-t" id="va-t">' + TXT.titulo + '</div><div class="va-o" data-k="obj" aria-live="polite"></div><button type="button" data-k="poder" hidden>' + TXT.poder + '</button>';
    el.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation(); pulsarPoder(); });
    el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b || e.detail !== 0) return; e.preventDefault(); pulsarPoder(); }); // teclado: Enter o Espacio
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  function pulsarPoder() { usarPoder(); pintarHud(!hud.el.hidden); }
  function objetivo() {
    const e = estado();
    if (e === 'inicio') return TXT.obj.inicio;
    if (e === 'reunion') return con(TXT.obj.nidos, nidosListos());
    if (e === 'nidos') return con(TXT.obj.poder, A.aciertos);
    if (e === 'afinado') return TXT.obj.afinado;
    return '';
  }
  function pintarHud(ver) {
    montarHud();
    const mostrar = !!ver && !hecho();
    if (hud.el.hidden === mostrar) hud.el.hidden = !mostrar;
    document.body.classList.toggle('v18-arco-on', mostrar);
    if (!mostrar) return;
    const o = objetivo(), q = hud.q('obj'); if (q.textContent !== o) q.textContent = o;
    const p = hud.q('poder'); p.hidden = !tomado;
    if (tomado && A.j) { const nom = (H.get(A.j.poder) || {}).nombre || TXT.poder; if (p.textContent !== nom) p.textContent = nom; p.classList.toggle('no', !H.listo(A.j, A.j.poder).ok); }
  }

  // ---------- Paso ----------
  function libre() {
    const $ = id => document.getElementById(id), oculto = id => !$(id) || $(id).hidden;
    try { if ($('c1-fade') || (G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return false; return oculto('end') && oculto('comic') && oculto('creator'); } catch (e) { return false; }
  }
  function pasoMaquina(dt) {
    const modoM = maq.pintada, rapido = modoM === 'sopla';
    gHelice.rotation.x += dt * (rapido ? 14 - A.aciertos * 3 : 1.2);
    gMaq.position.set(SITIO.maq.x, alto(SITIO.maq.x, SITIO.maq.z), SITIO.maq.z);
    if (maq.sacude > 0) { maq.sacude -= dt; gMaq.position.x += Math.sin(performance.now() / 20) * 0.04; }
    if (rango(estado()) === rango('reunion')) for (const g of gNidos) { const au = g.getObjectByName('aura'); if (au.visible) au.scale.setScalar((A.ojos ? 1.6 : 1) + Math.sin(performance.now() / 300) * 0.15); }
    if (hecho()) { const k = 1.2 + Math.sin(performance.now() / 700) * 0.25; mats.luz.emissiveIntensity = k; }
  }
  function paso(dt, busy) {
    if (!M.valido || !M.hecho) return;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    revisarElenco();
    const ver = A.tengo && listo();
    const dP = Math.hypot(S.pos.x - SITIO.plaza.x, S.pos.z - SITIO.plaza.z), cerca = dP < R_VISTA;
    if (raiz.visible !== (ver && cerca)) raiz.visible = ver && cerca;
    if (gMaq.visible !== ver) aplicar();
    if (!ver) { soltarModo(); pintarHud(false); return; }
    const e = estado();
    // aviso y bandera (una vez por sesión) mientras la misión no empezó: también desde lejos
    if (e === 'inicio' && !A.avisado && !busy) { A.avisado = true; if (dP > R_AVISO) { toast(TXT.aviso, 5200); ponerGuia(); } }
    if (fiestaTiene()) { if (tue.raiz) liberarTue(); } else if (!tue.raiz && !tue.cargando && !tue.fallo && dP < N.R_CARGA) cargarTue(); // si el modelo falló no se reintenta (sin errores en bucle)
    else if (tue.raiz && dP > N.R_LIBERA) liberarTue();
    if (!cerca) { soltarModo(); pintarHud(false); return; }
    pasoMaquina(dt);
    pasoTue(dt);
    const dM = Math.hypot(S.pos.x - SITIO.maq.x, S.pos.z - SITIO.maq.z);
    if (e === 'inicio' && !A.llegada && dP < R_LLEGADA && !busy && libre() && N.instancia('constructor') && N.instancia('ingeniera') && tue.raiz) {
      A.llegada = true; charla(TXT.llegada, null, { libre: true, caja: false });
    }
    if (e === 'inicio' && dM < R_REUNION && !busy && libre()) reunion();
    if (e === 'reunion' && !A.ojos && tecnica() === 'ojos') { A.ojos = true; toast(TXT.ojos, 3600); }
    if (!A.j && e === 'reunion') A.j = nuevoJugador();
    // encuentro con la hélice (paso 4)
    if (enEncuentro() && dM < R_ENCUENTRO && !busy) { tomarModo(); H.paso(A.j, dt); } else soltarModo();
    if (rango(e) < rango('afinado') && dM < 10) { if ((A.rafagaT -= dt) <= 0) { A.rafagaT = RAFAGA_S; rafaga(); } }
    if (A.empuje && A.empuje.t > 0) { S.pos.x += A.empuje.x * dt; S.pos.z += A.empuje.z * dt; A.empuje.t -= dt; }
    pintarHud(dP < R_HUD && (e !== 'inicio' || dM < R_REUNION + 6) && !busy);
  }
  G.on('update', (dt, busy) => { if (!A.manual) paso(Math.min(dt, 0.1), busy); }, 74);
  G.on('apply', () => setTimeout(() => { A.aciertos = 0; A.reuniendo = false; soltarModo(); revisarElenco(); aplicar(); }, 0), 98);
  G.on('v18', ev => { if (ev && ev.tipo === 'mundo' && (ev.id === ID || /^v18_arco_/.test(ev.id || '') || ev.id === 'puerto_mina')) aplicar(); if (ev && ev.tipo === 'evo') pagarXP(); });

  // ---------- Arranque: el mundo real y el sitio medido ----------
  function validar() {
    if (!T.mapa) return false;
    M.torres = medirTorres();
    if (!M.torres) return false;
    const hP = alto(SITIO.plaza.x, SITIO.plaza.z), seca = !(G.agua && G.agua.levelAt(SITIO.plaza.x, SITIO.plaza.z) > hP - 0.2);
    return seca && hP > 10 && hP < 30 && M.torres.every(t => t.top > alto(t.x, t.z) + 3); // la plaza en las lomas y las torres de pie
  }
  function iniciar() {
    if (M.valido) return true;
    M.valido = validar();
    if (M.valido) { aplicar(); revisarElenco(); }
    return M.valido;
  }
  Promise.resolve(G.mundo && G.mundo.listo).then(iniciar, iniciar);
  if (G.v18evo) pagarXP();

  // =====================================================================================================================
  // Prueba (AV.v18ArcoTest): la misión de punta a punta con entrada real (teclas E y G, el botón Poder) y su guardado.
  // =====================================================================================================================
  let evTest = null, v18Test = null;
  G.on('v18arco', e => { if (evTest) evTest.push(e); });
  G.on('v18', e => { if (v18Test) v18Test(e); }, 10);
  const textos = () => {
    const t = [TXT.titulo, TXT.aviso, TXT.nido, TXT.ojos, TXT.achis, TXT.falla, TXT.espera, TXT.encender, TXT.encendido, TXT.poder, TXT.guiaT, TXT.guiaEscudo, TXT.hablarTue, TXT.hablarIng, TXT.hablarCon,
      con(TXT.acierto, 1), con(TXT.guia, 'Grito del Yunque'), TXT.obj.inicio, con(TXT.obj.nidos, 1), con(TXT.obj.poder, 2), TXT.obj.afinado]
      .concat(TXT.nidos.map(x => x + ' ' + con(TXT.nidoN, 1)), [TXT.llegada, TXT.reunion, TXT.nidosListos, TXT.afinado, TXT.fin].flatMap(l => l.map(x => x[1])));
    for (const id of ['constructor', 'ingeniera', 'tuerca']) { const d = N.def(id); if (!d) continue; t.push(d.nombre.es); for (const e in d.porEstado) t.push(...(d.porEstado[e].dialogo || [])); }
    return t;
  };
  async function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const antes = o.antes || {};
    try { await G.mundo.listo; } catch (e) { /* sin mundo */ }
    iniciar();
    const tit = document.getElementById('title'), titAbierta = !!(tit && tit.open), cre = document.getElementById('creator'), creOculto = cre ? cre.hidden : true;
    if (titAbierta) tit.open = false; if (cre) cre.hidden = true; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z };
    const misiones = () => ({ m: JSON.stringify(S.missions), s: S.step, f: S.complete, e: JSON.stringify(S.events), c: JSON.stringify(S.collected), fl: JSON.stringify(S.field), cap: JSON.stringify(S.captures), u: JSON.stringify(S.unlocked) });
    const difMis = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]).map(k => k + ': ' + String(a[k]).slice(0, 120) + ' → ' + String(b[k]).slice(0, 120));
    const quiet0 = G.quiet, susp = G.guardado.suspender, toast0 = G.ui.toast, toasts = [];
    const evs = []; evTest = evs;
    G.ui.toast = t => { toasts.push(String(t)); };
    if (susp) susp(true);
    A.manual = true;
    const MV = G.fisica.MOVE, PU = G.v18puerto;
    const pManual0 = PU && PU.sesion ? PU.sesion().manual : false;
    if (PU && PU.sesion) PU.sesion().manual = true; // el puerto no avanza solo mientras esta prueba lo usa de fondo
    const cambios = [], vigilar = fn => { const a = misiones(), i0 = JSON.stringify(S.inv || {}); const r = fn(); const d = difMis(a, misiones()); if (JSON.stringify(S.inv || {}) !== i0) d.push('inv'); if (d.length) cambios.push(...d); return r; };
    const correr = (s, h) => vigilar(() => { h = h || 1 / 30; for (let t = 0; t < s; t += h) { paso(h, false); N.paso(h, false); } });
    const ir = (x, z, mirar, y) => {
      S.pos.x = x; S.pos.z = z; S.pos.y = y != null ? y : alto(x, z) + 0.02; S.vy = 0; MV.flying = y != null; MV.swimming = false; MV.grounded = y == null; MV.vx = MV.vz = 0;
      if (mirar && S.facing) { const dx = mirar.x - x, dz = mirar.z - z, d = Math.hypot(dx, dz) || 1; S.facing.x = dx / d; S.facing.z = dz / d; }
    };
    const tecla = (k, tipo) => window.dispatchEvent(new KeyboardEvent(tipo || 'keydown', { key: k, bubbles: true, cancelable: true }));
    const pulsar = k => vigilar(() => { tecla(k); tecla(k, 'keyup'); });
    const tocar = () => vigilar(() => G.input.actBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }))); // el botón Acción de la pantalla, como un dedo
    const tactil = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    // en un teléfono el botón tiene que verse y poder tocarse: en pantalla, ≥ 44 px y sin nada encima (ni el panel de la misión) en su centro
    const tocable = el => { if (!tactil) return true; const r = el.getBoundingClientRect(); if (el.offsetWidth < 44 || el.offsetHeight < 44 || r.right > innerWidth || r.bottom > innerHeight || r.left < 0 || r.top < 0) return false; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === el || el.contains(e)); };
    const cerrarCharlas = () => { for (let i = 0; i < 16 && G.dialogo.open(); i++) pulsar('e'); try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) { /* */ } };
    const geos = () => (G.renderer.renderer && G.renderer.renderer.info.memory.geometries) || 0;
    // un punto a r m de (cx, cz) donde lo más cercano para Acción es `id` (los tres y el invento están juntos en la plaza)
    const puntoPara = (cx, cz, r, id) => { for (const rr of [r, r * 0.7, r * 1.2]) for (let a = 0; a < 16; a++) { const x = cx + Math.cos(a * 0.3927) * rr, z = cz + Math.sin(a * 0.3927) * rr; ir(x, z, { x: cx, z: cz }); const n = G.interaccion.nearest(); if (n && n.id === id) return { x, z }; } return { x: cx + r, z: cz }; };
    const colorDe = (mats0, nom) => { const m = mats0.find(x => x.name === nom); return m ? '#' + m.color.clone().convertLinearToSRGB().getHexString() : null; };
    try {
      check('1 · Con la bandera apagada (?v18=0) no se cargó arco.js (ni ningún modelo de personaje)', antes.v18 ? true : (!antes.arco && !antes.glb),
        antes.v18 ? 'bandera puesta en esta sesión (por defecto; la carga se comprueba con ?v18=0)' : JSON.stringify(antes));
      check('1b · El sitio es el del mapa real: la plaza de las Atalayas en seco y tres torres vigía medidas', M.valido && M.hecho && M.torres.length === 3,
        M.torres ? M.torres.map(t => t.x.toFixed(1) + ',' + t.z.toFixed(1) + ' ↑' + t.top.toFixed(1)).join(' · ') : 'sin torres');
      V.borrar(); V.recargar(); A.forzar = false; A.avisado = false; A.llegada = false; A.aciertos = 0; A.ojos = false; A.achis = false; A.reuniendo = false; A.tueCharlas = 0;
      try { G.dialogo.clear(); } catch (e) { /* */ }
      // 2 · sin la bandera, o con el puerto sin reparar, no hay nada en las Atalayas
      const v18bk = G.V18; let sinBandera = false;
      G.V18 = false;
      try { V.cambiarMundo('puerto_mina', 'reparado'); ir(SITIO.plaza.x + 3, SITIO.plaza.z + 3); correr(0.3); sinBandera = !listo() && !A.tengo && !gMaq.visible; } finally { G.V18 = v18bk; }
      V.cambiarMundo('puerto_mina', 'obra'); A.forzar = true; correr(0.3);
      const nn = G.interaccion.nearest();
      check('2 · Sin la bandera, o antes de reparar el puerto, no aparece nada (ni invento, ni personajes, ni interacción)', sinBandera && !listo() && !A.tengo && !gMaq.visible && !(nn && /v18_puerto_arco/.test(nn.id)), nn && nn.id);
      // 3 · el elenco: en el puerto se quedan; lejos se mudan a las Atalayas (aviso y bandera)
      const sitioPuerto = PU && PU.SITIO ? PU.SITIO.plaza : PUERTO;
      V.cambiarMundo('puente_villa', 'reparado'); V.cambiarMundo('puerto_mina', 'reparado'); ir(sitioPuerto.x, sitioPuerto.z); correr(0.2); try { PU && PU.aplicar && PU.aplicar(); } catch (e) { /* */ }
      const enPuerto = !A.tengo && !(G.v18arco.elenco());
      const villa = (T.mapa.lugares && T.mapa.lugares.villa) || { x: 150, z: 170 };
      ir(villa.x, villa.z); correr(0.2);
      check('3 · Con el puerto reparado los tres se quedan en el puerto mientras Vittata está allí, y se mudan a las Atalayas al alejarse (> 160 m)', enPuerto && A.tengo && G.v18arco.elenco(),
        'puerto ' + enPuerto + ' · lejos ' + A.tengo);
      check('3b · Aviso «algo zumba» y bandera verde del minimapa en la plaza; el marcador de la misión V18 apunta a las Atalayas', toasts.includes(TXT.aviso) && (!G.minimapa || guia.puesta || (G.minimapa.marcadores && G.minimapa.marcadores().some(m => m.tipo === 'dest'))) && (PU && PU.mapa ? (PU.mapa() || {}).nombre === TXT.titulo : true),
        toasts.slice(-2).join(' | ') + ' · ' + JSON.stringify(PU && PU.mapa && PU.mapa()));
      check('3c · Lejos (villa) no se pidió el modelo de Tuerca ni hay personajes', !tue.raiz && !tue.cargando && N.activos().length === 0, N.activos().join(','));
      // 4 · el sitio respeta lo que ya existe
      const zona = G.zonas && G.zonas.zonaEn ? [SITIO.plaza, SITIO.maq, ...M.torres].filter(p => G.zonas.zonaEn(p.x, p.z)).length : 0;
      const mojado = [SITIO.maq, SITIO.tue, SITIO.ing, SITIO.con].filter(p => G.agua && G.agua.levelAt(p.x, p.z) > alto(p.x, p.z) - 0.2).length;
      const lejosPuerto = Math.hypot(SITIO.plaza.x - PUERTO.x, SITIO.plaza.z - PUERTO.z);
      check('4 · El sitio está fuera de las zonas de los capítulos, en seco y lejos del puerto (> 200 m)', !zona && !mojado && lejosPuerto > 200, 'zona ' + zona + ' · mojado ' + mojado + ' · ' + lejosPuerto.toFixed(0) + ' m');
      // 5 · cerca: la Ingeniera y el Constructor (npc.js, 2 como mucho) y Tuerca (inventor)
      const cerca = { x: SITIO.plaza.x - 20, z: SITIO.plaza.z - 22 }; ir(cerca.x, cerca.z); correr(0.2);
      for (let i = 0; i < 80 && !(N.instancia('ingeniera') && N.instancia('constructor') && tue.raiz); i++) { await esperar(100); correr(0.05); }
      const ing = N.instancia('ingeniera'), cons = N.instancia('constructor');
      check('5 · A < 90 m aparecen la Ingeniera y el Constructor en las Atalayas (2 como mucho, no en el puerto)', ing && cons && N.activos().length <= N.MAX_ACTIVOS && Math.hypot(cons.x - SITIO.con.x, cons.z - SITIO.con.z) < 1 && Math.hypot(ing.x - SITIO.ing.x, ing.z - SITIO.ing.z) < 1,
        N.activos().join(',') + (cons ? ' · constructor en ' + cons.x.toFixed(1) + ',' + cons.z.toFixed(1) : ''));
      check('5b · Tuerca es tuerca.glb (caché de npc.js) con Idle/Hablar/Reparar, de inventor: delantal y llave, sin capucha', !!tue.raiz && ['Idle', 'Hablar', 'Reparar'].every(a => tue.acciones[a]) && tue.apariencia === 'inventor' && tue.nodos.Delantal.visible && tue.nodos.Llave.visible && !tue.nodos.Capuchon.visible && N.estado('tuerca') === 'inventor',
        tue.raiz ? 'ap ' + tue.apariencia + ' · estado ' + N.estado('tuerca') : 'sin glb: ' + (tue.fallo || 'cargando'));
      check('5c · Las apariencias de partida: el Constructor reparador y la Ingeniera responsable (las del final del puerto)', cons && cons.apariencia === 'reparador' && ing && ing.apariencia === 'responsable');
      check('5d · El invento sopla: hélice rápida, color naranja, sin maceta; collider en la plaza', maq.pintada === 'sopla' && !gFlor.visible && G.fisica.colliders.indexOf(M.collider) >= 0 && M.collider.when());
      // 6 · pasos 1 y 2: la llegada (bocadillos) y la reunión (caja que se pasa con E)
      const pl = { x: SITIO.plaza.x - 14, z: SITIO.plaza.z - 14 }; ir(pl.x, pl.z); correr(0.4); await esperar(50);
      check('6 · Paso 1: al llegar, Tuerca presenta su Espantanubes y los otros dos comentan (bocadillos)', A.llegada, (G.dialogo.actual && G.dialogo.actual() || {}).text);
      cerrarCharlas();
      const r1 = reunion(); G.dialogo.clear(); const r2 = reunion();
      check('6a · Si otra charla corta la reunión, se puede volver a empezar (no se traba en «inicio»)', r1 && r2 && estado() === 'inicio' && G.dialogo.open(), r1 + ' / ' + r2);
      // QA-211: si la reunión empieza con los bocadillos de llegada en marcha, los corta (no siguen después de la caja, fuera de orden)
      { try { G.dialogo.clear(); } catch (e) { /* */ } A.reuniendo = false;
        charla(TXT.llegada, null, { libre: true, caja: false }); const habia = !!G.dialogo.libre();
        const r = reunion(); const corta = r && !G.dialogo.libre() && G.dialogo.open();
        try { G.dialogo.clear(); } catch (e) { /* */ } A.reuniendo = false;
        check('QA-211 · La reunión corta los bocadillos de llegada en curso', habia && corta && estado() === 'inicio', 'había ' + habia + ' · corta ' + corta + ' · ' + estado()); }
      ir(SITIO.maq.x - 5, SITIO.maq.z - 5, SITIO.maq); correr(0.2);
      const abre = G.dialogo.open() && (G.dialogo.actual() || {}).who === 'El Constructor';
      cerrarCharlas(); correr(0.1);
      const ing2 = N.instancia('ingeniera');
      check('6b · Paso 2: junto al invento el Constructor abre la reunión (caja) y con E se pasa → reunion; la Ingeniera se pone el equipo de rescate', abre && estado() === 'reunion' && V.mundo(ID) === 'reunion' && N.estado('ingeniera') === 'rescate' && ing2 && ing2.apariencia === 'rescate' && colorDe(ing2.mats, 'CHAQUETA') === '#d8352a',
        estado() + ' · ' + (ing2 && ing2.apariencia) + ' · ' + (ing2 && colorDe(ing2.mats, 'CHAQUETA')));
      // 7 · Tuerca habla (caja con su retrato)
      { const p = puntoPara(SITIO.tue.x, SITIO.tue.z, 1.4, 'v18_puerto_arco_tuerca'); ir(p.x, p.z, SITIO.tue); correr(0.1); }
      const it = G.interaccion.nearest(); const dice = it && it.id === 'v18_puerto_arco_tuerca' && (pulsar('e'), true);
      check('7 · Acción junto a Tuerca abre su charla (caja con su nombre y lo que falta)', dice && G.dialogo.open() && (G.dialogo.actual() || {}).who === 'Tuerca' && (G.dialogo.actual() || {}).text === con(TXT.obj.nidos, 0), it && it.id);
      cerrarCharlas();
      // 8 · paso 3: volar a las torres y acomodar los nidos (desde el suelo no se puede)
      const t0 = M.torres[0]; ir(t0.x + 0.5, t0.z + 0.5); correr(0.05);
      const desdeSuelo = G.interaccion.nearest();
      check('8 · Desde el pie de la torre no se acomoda el nido: hay que subir volando', !(desdeSuelo && /arco_nido/.test(desdeSuelo.id)), desdeSuelo && desdeSuelo.id);
      // como en un teléfono: llega volando encima de la torre, deja de volar, la física la posa en la percha y toca el botón Acción
      const posados = M.torres.map((t, i) => {
        cerrarCharlas(); ir(t.x + 0.1, t.z + 0.1, null, t.top + 1.6); MV.flying = false; MV.grounded = false;
        for (let k = 0; k < 60 && !MV.grounded; k++) G.fisica.step(0.05, false);
        const y = S.pos.y - t.top; correr(0.05); const n = G.interaccion.nearest();
        // en la torre 0 la copa de un árbol la envuelve (KIMI-247): en «alto» sus ramas pueden dejarla en el techo, hasta ~1 m bajo la
        // percha; desde ahí el nido se sigue alcanzando y se acomoda con un toque, que es lo que importa
        const ok = MV.grounded && y > -1.5 && y < 0.5 && n && n.id === 'v18_puerto_arco_nido_' + i;
        const antes = nidoListo(i); if (ok) tocar(); cerrarCharlas(); return ok && !antes && nidoListo(i) ? 'ok ' + y.toFixed(2) : 'no(' + y.toFixed(2) + ',' + (n && n.id) + ')';
      });
      check('8d · Móvil: en lo alto de cada torre Vittata se posa en la percha con la física y el botón Acción de la pantalla acomoda el nido', posados.every(x => /^ok/.test(x)) && tocable(G.input.actBtn), posados.join(' · ') + ' · táctil ' + tactil);
      check('8b · Paso 3: tres nidos con Acción en lo alto de las torres (cada uno una vez, guardado) → nidos', nidosListos() === 3 && estado() === 'nidos' && evs.filter(e => e.tipo === 'nido').length === 3 && TORRES.every((x, i) => V.mundo(claveNido(i)) === 'acomodado') && gNidos.every(g => !g.getObjectByName('revuelto').visible && g.getObjectByName('pluma').visible),
        nidosListos() + '/3 · ' + estado());
      check('8c · Cada torre tiene una percha en lo alto (Vittata se posa junto al nido)', M.perchas.length === 3 && M.perchas.every((p, i) => G.fisica.perchas.indexOf(p) >= 0 && Math.abs(p.y - M.torres[i].top) < 0.2));
      cerrarCharlas();
      // 9 · paso 4: calmar el invento con el poder (G de espaldas no cuenta; G apuntado y el botón táctil, sí)
      const g = posHelice(), lejos = { x: g.x - 3.5, z: g.z - 2.65 }; // 4,4 m: dentro del alcance del Grito (7 m) y fuera del empujón de la ráfaga (< 4 m)
      A.j = nuevoJugador('vittata');
      ir(lejos.x, lejos.z, { x: lejos.x - 4, z: lejos.z - 3 }); correr(0.1);
      const tomaModo = G.interaccion.modo === modo && !hud.el.hidden && !hud.q('poder').hidden;
      A.j.energia = 100; A.j.cd = {}; pulsar('g'); correr(0.8);
      const sinApuntar = A.aciertos;
      ir(lejos.x, lejos.z, g); A.j.energia = 100; A.j.cd = {}; pulsar('g'); correr(0.8);
      const conG = A.aciertos;
      ir(lejos.x, lejos.z, g); A.j.energia = 100; A.j.cd = {}; pulsar('e'); correr(0.8);
      check('9 · Junto al invento se toma el modo de acción y sale el botón Poder', tomaModo);
      check('9b · Grito del Yunque de espaldas no cuenta; apuntado con G y con E, sí (2/3)', sinApuntar === 0 && conG === 1 && A.aciertos === 2, sinApuntar + ' / ' + conG + ' / ' + A.aciertos);
      A.j = nuevoJugador('arausiaca'); ir(SITIO.maq.x - 2.4, SITIO.maq.z - 1.8, g); A.j.energia = 100; A.j.cd = {};
      const bt = hud.q('poder'); correr(0.05); pintarHud(true);
      bt.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
      const escudoAbierto = A.j.escudo > 0; correr(1.2);
      check('9c · Con arausiaca (PLUMAS) el botón táctil Poder abre el Escudo y la ráfaga que lo encuentra cuenta (3/3) → afinado', escudoAbierto && A.aciertos === 3 && estado() === 'afinado' && evs.some(e => e.tipo === 'acierto' && e.como === 'plumas'), 'escudo ' + escudoAbierto + ' · aciertos ' + A.aciertos + ' · ' + estado());
      check('9d · Al terminar el encuentro se devuelve el modo de acción; el botón mide 44 px o más', G.interaccion.modo !== modo && !tomado && (bt.offsetHeight >= 44 || getComputedStyle(bt).minHeight === '44px'), bt.offsetHeight + ' px');
      check('9e · Paso 5: el invento se calma (hélice lenta) y Tuerca propone los faroles mensajeros', maq.pintada === 'calma' && G.dialogo.open() && /Ahora susurra/.test((G.dialogo.actual() || {}).text || ''), (G.dialogo.actual() || {}).text);
      cerrarCharlas();
      // 10 · paso 6: encender los faroles; el estado se guarda antes de los efectos; XP una vez
      const evo = G.v18evo; G.v18evo = undefined;
      let guardadoAntes = null; v18Test = ev => { if (ev && ev.tipo === 'mundo' && ev.id === ID && ev.estado === 'encendido' && guardadoAntes == null) { try { guardadoAntes = /"arco_atalayas":"encendido"/.test(localStorage.getItem(V.clave())) && gFaroles.every(f => !f.visible); } catch (e) { guardadoAntes = false; } } };
      { const p = puntoPara(SITIO.maq.x, SITIO.maq.z, 2.2, 'v18_puerto_arco_encender'); ir(p.x, p.z, SITIO.maq); correr(0.05); }
      const itE = G.interaccion.nearest(); pulsar('e'); correr(0.2);
      check('10 · Paso 6: E junto al invento enciende los faroles (el estado ya estaba guardado antes de los efectos)', itE && itE.id === 'v18_puerto_arco_encender' && estado() === 'encendido' && guardadoAntes === true && V.otorgado('arco_atalayas'), itE && itE.id);
      const xpSin = V.otorgado('xp_atalayas');
      G.v18evo = evo;
      let xp = null;
      if (evo && evo.info) { const sp = V.seleccionada() || 'vittata', x0 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); const x1 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); aplicar(); xp = [x0, x1, evo.info(sp).xp]; }
      check('10b · XP V18.2: 120 al terminar, una sola vez, también si evolucion.js llega después', !xpSin && (xp ? xp[1] - xp[0] >= XP_FIN && xp[2] === xp[1] && V.otorgado('xp_atalayas') : true), xp ? xp.join(' → ') : 'sin G.v18evo en esta sesión');
      correr(1.0); cerrarCharlas(); tue.hablaT = 0.01; correr(0.1); // la charla final (a los 0,9 s) se pasa con E
      // 11 · pasos 7 y 8: transformación visible y apariencias nuevas del mismo modelo
      correr(0.2);
      const ci = N.instancia('constructor'), ii = N.instancia('ingeniera');
      check('11 · Paso 7: faroles en las tres torres, banderines en la plaza, invento verde con maceta y farolito', gFaroles.every(f => f.visible) && gBander.visible && gFlor.visible && maq.pintada === 'flor');
      check('11b · Paso 8: Tuerca pasa a aliado (chaleco verde, delantal y llave, trabajando) y el Constructor a vecino (casco verde, sin chaleco, con mochila y guantes)',
        N.estado('tuerca') === 'aliado' && tue.apariencia === 'aliado' && tue.nodos.Chaleco.visible && tue.nodos.Delantal.visible && !tue.nodos.Capuchon.visible && colorDe(tue.mats, 'CHALECO') === '#3fae5a' && tue.anim === 'Reparar'
        && N.estado('constructor') === 'vecino' && ci && ci.apariencia === 'vecino' && !ci.nodos.Chaleco.visible && ci.nodos.Mochila.visible && ci.nodos.GuanteL.visible && colorDe(ci.mats, 'CASCO') === '#5fae5a' && ii && ii.apariencia === 'rescate',
        'tuerca ' + tue.apariencia + '/' + colorDe(tue.mats, 'CHALECO') + '/' + tue.anim + ' · constructor ' + (ci && ci.apariencia) + '/' + (ci && colorDe(ci.mats, 'CASCO')));
      const g0 = geos(); aparienciaTue('operador'); aparienciaTue('inventor'); N.apariencia('constructor', 'supervisor'); const g1 = geos(); vestirTue(); N.apariencia('constructor', 'vecino');
      check('11c · Cambiar de apariencia no crea geometría (un modelo, varias apariencias)', g0 === g1 && geos() === g0 && tue.apariencia === 'aliado', 'geometrías ' + g0 + ' → ' + g1);
      { const p = puntoPara(SITIO.tue.x, SITIO.tue.z, 1.4, 'v18_puerto_arco_tuerca'); ir(p.x, p.z, SITIO.tue); correr(0.1); } pulsar('e');
      check('11d · Tuerca aliado tiene diálogo nuevo', G.dialogo.open() && (N.def('tuerca').porEstado.aliado.dialogo || []).indexOf((G.dialogo.actual() || {}).text) >= 0, (G.dialogo.actual() || {}).text);
      cerrarCharlas();
      // 12 · paso 9: persiste tras guardar y recargar
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.2);
      check('12 · Paso 9: tras recargar siguen los faroles, los banderines, el invento verde, los nidos y las tres apariencias nuevas', hecho() && gFaroles.every(f => f.visible) && gBander.visible && maq.pintada === 'flor' && nidosListos() === 3
        && N.estado('constructor') === 'vecino' && N.estado('tuerca') === 'aliado' && N.estado('ingeniera') === 'rescate' && tue.apariencia === 'aliado' && N.instancia('constructor') && N.instancia('constructor').apariencia === 'vecino');
      check('12b · Tras recargar, ni el premio ni la XP se repiten; el marcador de la misión desaparece', !V.otorgar('arco_atalayas', 'arco_atalayas', 1) && pagarXP() === 0 && mapa() === null);
      // 13 · partidas viejas y valores raros
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      const vieja = estado() === 'inicio' && !gBander.visible && gFaroles.every(f => !f.visible) && N.estado('tuerca') === 'inventor' && maq.pintada === 'sopla';
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado', arco_atalayas: 'zzz', 'personaje:tuerca': 'robot' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('13 · Una partida con el puerto hecho y sin claves del arco empieza en «inicio» (Tuerca inventor); un valor desconocido no rompe nada', vieja && estado() === 'inicio' && N.estado('tuerca') === 'inventor');
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado', arco_atalayas: 'encendido' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('13b · Con la misión hecha pero sin las claves de personaje se deducen aliado, vecino y rescate', N.estado('tuerca') === 'aliado' && N.estado('constructor') === 'vecino' && N.estado('ingeniera') === 'rescate' && gFaroles.every(f => f.visible));
      check('13c · El estado nunca retrocede ni cambia de bando sin causa', !N.cambiarEstado('constructor', 'supervisor') && !N.cambiarEstado('tuerca', 'operador') && !avanzar('inicio') && hecho());
      // 14 · «Comenzar de cero»
      localStorage.removeItem(V.clave()); G.emit('apply'); await esperar(60); correr(0.1);
      check('14 · «Comenzar de cero» lo borra: sin puerto reparado no hay nada en las Atalayas y los tres vuelven al principio', estado() === 'inicio' && !A.tengo && !gMaq.visible && N.estado('tuerca') === 'operador' && N.estado('constructor') === 'supervisor' && N.estado('ingeniera') === 'aprendiz');
      // 15 · no toca las misiones del capítulo
      check('15 · No toca las misiones del capítulo: ningún paso ni tecla cambió misiones, pasos, eventos ni inventario', !cambios.length, cambios.slice(0, 4).join(' | '));
      // 16 · textos
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
      const D = window.AV_EN || {}, pats = Object.keys(D).filter(k => k.indexOf('{}') >= 0).map(k => new RegExp('^' + k.split('{}').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'));
      const tx = textos(), faltan = tx.filter(t => !D[t] && !pats.some(re => re.test(t)));
      check('16 · Todos los textos tienen inglés en content/cap1/en.js', !faltan.length, faltan.slice(0, 6).join(' | '));
      check('16b · Ningún texto ni dato menciona el nombre del modelador (directiva V18.3 §1)', !/\x66eix/i.test(tx.join(' ') + JSON.stringify(N.defs())));
      // 17 · lejos se liberan
      V.cambiarMundo('puerto_mina', 'reparado'); ir(villa.x, villa.z); correr(0.2);
      check('17 · Al alejarse (> 150 m) se liberan los personajes y Tuerca (la caché del modelo se queda)', N.activos().length === 0 && !tue.raiz, N.activos().join(','));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    // restaurar
    try { cerrarCharlas(); } catch (e) { /* */ }
    soltarModo(); A.manual = false; A.forzar = false; A.aciertos = 0; A.j = null; A.reuniendo = false; timers.length = 0; A.tueCharlas = 0; tue.hablaT = 0;
    evTest = null; v18Test = null;
    G.ui.toast = toast0; G.quiet = quiet0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; }
    MV.flying = false;
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); revisarElenco(); aplicar(); quitarGuia(); pintarHud(false);
    if (PU && PU.sesion) PU.sesion().manual = pManual0;
    try { if (PU && PU.aplicar) PU.aplicar(); } catch (e) { /* */ }
    N.paso(0.01, false);
    if (titAbierta) tit.open = true; if (cre) cre.hidden = creOculto; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  // con los faroles encendidos, el marcador sigue el arco: la misión 3 (muelle.js), si toca
  const mapa = () => (listo() && A.tengo && !hecho() ? { x: SITIO.plaza.x, z: SITIO.plaza.z, nombre: TXT.titulo } : hecho() && G.v18muelle && G.v18muelle.mapa ? G.v18muelle.mapa() : null);
  G.v18arco = { tuercaAqui: () => !!tue.raiz && gTue.visible, ID, ESTADOS, estado, avanzar, aplicar, usar, etiqueta, usarPoder, encender, pagarXP, paso, SITIO, test, mapa, elenco: () => A.tengo,
    get torres() { return M.torres; }, get valido() { return M.valido; }, sesion: () => A };
  return G.v18arco;
};
