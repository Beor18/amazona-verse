/* Juego · V18.3 · misión 4, el final del arco: «La fiesta de la colina» (G.v18fiesta).
   Sigue a «El muelle de la otra orilla» (muelle.js). Directiva docs/DIRECTIVA_V18_3_RESOLUCION.md §3 (ciudades que ya existen), §8 (un
   modelo, varias apariencias; nunca de bando sin causa) y §9 (poderes). Contenido adicional del mundo abierto: no toca los seis capítulos.
   - Dónde: Templos de la Colina, en la plaza de las carpas (5, 103,8; content/cap1/mundo.js), fuera de las zonas de los capítulos y
     lejos del mirador Yokahú y de la carrera de Chispa. Ninguna misión del arco la había usado. Nada de edificios ni modelos nuevos:
     escombros, postes, faroles, banderines y una placa son piezas simples.
   - Cuándo: con el muelle hecho. Los tres (el Constructor, la Ingeniera y Tuerca) se mudan a la colina cuando Vittata se aleja del
     muelle (> 160 m) o llega a la plaza (< 45 m); antes de empezar, si vuelve al muelle (< 60 m), están otra vez allí. muelle.js deja
     de colocar a los dos humanos y arco.js oculta a Tuerca (G.v18fiesta.elenco()).
   - Historia (el cierre): antes de aprender, la obra del Constructor dejó escombros en la plaza de la colina. Los tres lo arreglan
     juntos y los vecinos de las carpas los invitan a su fiesta. El Constructor termina como aliado de verdad, con su ropa de reparador.
   - Pasos (estado G.v18.mundo.fiesta_colina: inicio → reunion → limpio → faroles → fiesta; solo avanza):
     1 reunión (caja) · 2 quitar 3 montones de escombros con el poder de la especie (motor V18.1: botón Poder, G o Acción) ·
     3 volar a lo alto de 3 postes y colgar los faroles de Tuerca (percha en cada poste) · 4 empezar la fiesta: tarjeta «¡Arco
     completo!», placa del arco donde estaba el escombro, faroles, banderines y confeti; el Constructor pasa a «aliado» (apariencia
     «reparador») · 5 todo persiste (también la tarjeta: se puede volver a ver hablando con ellos).
   - XP V18.2: 150 al terminar, una sola vez. Prueba: dentro de AV.v18ArcoTest() (src/boot.js junta las misiones 2, 3 y 4). */
window.AVV18Fiesta = function (G) {
  'use strict';
  if (G.v18fiesta) return G.v18fiesta;
  const V = G.v18 || window.AVV18Progreso(G);
  const N = G.v18npc, H = G.v18hab;
  const S = G.S, T = G.terreno, scene = G.renderer.scene;
  const ID = 'fiesta_colina';
  const ESTADOS = ['inicio', 'reunion', 'limpio', 'faroles', 'fiesta'];
  const XP_FIN = 150, R_VISTA = 220, R_REUNION = 9, R_LLEGADA = 30, R_ENCUENTRO = 14, R_HUD = 40, R_AVISO = 45, ALTO_POSTE = 4.5;
  const R_TOMA_LEJOS = 160, R_TOMA_CERCA = 45, R_DEVUELVE = 60;
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const MUELLE = { x: -121, z: -4.2 }, YOKAHU = { x: 14, z: 172 }, CHISPA = { x: 45.8, z: 54.3 };
  // Medido en el mapa real: la plaza de las carpas de los Templos de la Colina (content/cap1/mundo.js, PLAZAS); carpas al norte, toldos al sur
  const SITIO = { plaza: { x: 5, z: 103.8 }, ing: { x: 2.2, z: 105.6 }, con: { x: 7.8, z: 105.6 }, tue: { x: 5, z: 107.2 }, fiesta: { x: 5, z: 104.2 },
    escombros: [{ x: 1.8, z: 101.6 }, { x: 8.4, z: 101.8 }, { x: 5.1, z: 100.2 }], postes: [{ x: -0.8, z: 103.4 }, { x: 10.8, z: 103.8 }, { x: 5.2, z: 109.6 }] };
  const TXT = {
    titulo: 'La fiesta de la colina',
    aviso: 'En los Templos de la Colina se prepara una fiesta… ¡y tus amigos te esperan! La bandera verde te lleva.',
    llegada: [['tuerca', '¡Vittata! Los vecinos de las carpas nos invitaron a su fiesta.'], ['constructor', 'Antes hay algo que arreglar. Ven, te cuento.']],
    reunion: [['constructor', 'Cuando yo construía sin mirar, mi obra dejó escombros en esta plaza.'], ['ingeniera', 'Hoy lo arreglamos los tres juntos… bueno, los cuatro, contigo.'],
      ['tuerca', 'Yo traje faroles nuevos para la fiesta. ¡Hay que colgarlos bien alto!'], ['constructor', 'Primero los escombros. Tu poder los aparta en un momento.']],
    escombro: '¡Escombros fuera! {}/3', falla: 'Mira al montón de escombros y acércate un poco más.', espera: 'Tu poder se está recargando…',
    limpio: [['ingeniera', '¡La plaza quedó limpia! Ahora, los faroles de Tuerca.'], ['tuerca', 'Vuela a lo alto de cada poste y cuelga uno. ¡Que se vean desde lejos!']],
    farol: 'Colgar el farol', farolN: '¡Farol colgado! ({}/3)',
    faroles: [['constructor', 'Todo listo. Vittata, ¿empiezas tú la fiesta?']],
    empezar: 'Empezar la fiesta',
    fiesta: '¡Empieza la fiesta de la colina!',
    fin: [['constructor', 'Gracias por enseñarme a mirar primero. Ahora reparo con ustedes.'], ['ingeniera', 'Del puerto a la colina… ¡qué buen equipo hicimos!'], ['tuerca', 'Mis faroles brillan, mis amigos bailan. ¡Mejor invento, imposible!']],
    tarjeta: { titulo: '¡Arco completo!', sub: 'El Constructor, la Ingeniera y Tuerca: de la obra sin mirar a la fiesta de todos.',
      m: ['El puerto que volvió a vivir', 'Los faroles de las Atalayas', 'El muelle de la otra orilla', 'La fiesta de la colina'],
      nota: 'Ahora el Constructor es tu aliado. La placa de la colina lo recuerda.', boton: '¡A celebrar!' },
    obj: { inicio: 'Ve a la plaza de los Templos de la Colina: allí te esperan tus amigos.', escombros: 'Quita los escombros con tu poder: {}/3', faroles: 'Vuela a los postes y cuelga los faroles: {}/3', empezar: 'Empieza la fiesta en el centro de la plaza.' },
    poder: 'Poder', guia: '{}: mira a los escombros y pulsa Acción o G', guiaT: 'Toca Poder mirando a los escombros',
    hablarTue: 'Hablar con Tuerca'
  };
  const con = (t, ...v) => { let i = 0; return t.replace(/\{\}/g, () => String(v[i++])); };
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3200); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18fiesta', ev); } catch (e) { /* sin oyentes */ } };
  const guardarJuego = () => { try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* sin guardado */ } };
  const alto = (x, z) => T.height(x, z);
  const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z);

  // ---------- Estado ----------
  const estado = () => { const e = V.mundo(ID); return ESTADOS.indexOf(e) >= 0 ? e : 'inicio'; };
  const rango = e => ESTADOS.indexOf(e);
  const hecho = () => estado() === 'fiesta';
  function avanzar(e) { if (rango(e) <= rango(estado())) return false; V.cambiarMundo(ID, e); emitir({ tipo: 'estado', estado: e }); return true; }
  const claveEsc = i => 'v18_fiesta_escombro_' + i, claveFarol = i => 'v18_fiesta_farol_' + i;
  const escListo = i => V.mundo(claveEsc(i)) === 'quitado', farolListo = i => V.mundo(claveFarol(i)) === 'colgado';
  const cuenta = f => [0, 1, 2].filter(f).length;
  const A = { manual: false, forzar: false, avisado: false, llegada: false, reuniendo: false, tengo: false, j: null, confetiT: 0, tueCharlas: 0 };
  const M = { valido: false, hecho: false, perchas: [], postes: [] };
  const muelleHecho = () => V.mundo('arco_muelle') === 'construido';
  const listo = () => !!(G.V18 || A.forzar) && muelleHecho() && M.valido && (!G.zonas || !G.zonas.activa || G.zonas.dentro(SITIO.plaza.x, SITIO.plaza.z));
  function calcElenco() {
    if (!listo()) return false;
    if (rango(estado()) > 0) return true;
    const dM = dist(S.pos, MUELLE), dP = dist(S.pos, SITIO.plaza);
    if (dM > R_TOMA_LEJOS || dP < R_TOMA_CERCA) return true;
    return dM < R_DEVUELVE ? false : A.tengo;
  }

  // ---------- Escena (piezas simples) ----------
  const mats = {};
  const mat = (k, c, o) => mats[k] || (mats[k] = new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.75, metalness: 0 }, o || {})));
  const caja = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cil = (r0, r1, h, n, m) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n || 10), m);
  const raiz = new THREE.Group(); raiz.name = 'v18-fiesta'; raiz.visible = false; scene.add(raiz);
  const grupo = (n, padre) => { const g = new THREE.Group(); g.name = n; (padre || raiz).add(g); return g; };
  let gEsc = [], gFaroles = [], gPlaca, gBander, gTue;
  function enSeco(x, z) {
    const seco = (px, pz) => { try { const h = alto(px, pz); if (G.agua && G.agua.levelAt(px, pz) > h - 0.2) return false; const F = G.fisica, q = { x: px, z: pz, y: h }; if (F && F.pushOut) for (const c of F.colliders) { F.pushOut(q, c, 0.7); if (q.x !== px || q.z !== pz) return false; } } catch (e) { /* */ } return true; };
    if (seco(x, z)) return { x, z };
    for (let r = 1; r <= 4; r += 1) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * 0.785) * r, pz = z + Math.sin(a * 0.785) * r; if (seco(px, pz)) return { x: px, z: pz }; }
    return { x, z };
  }
  function construir() {
    if (M.hecho) return;
    M.hecho = true;
    for (const k of ['ing', 'con', 'tue', 'fiesta']) { const p = enSeco(SITIO[k].x, SITIO[k].z); SITIO[k].x = p.x; SITIO[k].z = p.z; }
    SITIO.escombros = SITIO.escombros.map(p => enSeco(p.x, p.z)); SITIO.postes = SITIO.postes.map(p => enSeco(p.x, p.z));
    const piedra = mat('piedra', '#8d8a84'), maderaO = mat('maderaO', '#6e4a2a'), madera = mat('madera', '#9a6a3c'), metal = mat('metal', '#7c8790', { metalness: 0.5, roughness: 0.45 });
    const luz = mat('luz', '#ffd98a', { emissive: new THREE.Color('#ffb84a'), emissiveIntensity: 1.3 }), apagado = mat('apagado', '#b8b2a4', { roughness: 0.4 });
    const brillo = mat('brillo', '#fff1a8', { emissive: new THREE.Color('#ffd84a'), emissiveIntensity: 0.8, transparent: true, opacity: 0.85 });
    // 2 · escombros: piedras, tablas rotas y un tubo, en tres montones
    SITIO.escombros.forEach((p, i) => {
      const g = grupo('v18-fiesta-escombro-' + i); g.position.set(p.x, alto(p.x, p.z), p.z);
      for (const [x, z, r] of [[0, 0, 0.42], [0.45, 0.2, 0.3], [-0.35, 0.3, 0.28], [0.1, -0.4, 0.25]]) { const o = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), piedra); o.position.set(x, r * 0.6, z); o.rotation.set(x * 3, z * 2, r); g.add(o); }
      for (const [x, z, a] of [[0.1, 0.1, 0.5], [-0.2, -0.2, -0.8]]) { const o = caja(1.2, 0.06, 0.28, maderaO); o.position.set(x, 0.55, z); o.rotation.set(0.3, a, 0.2); g.add(o); }
      const tubo = cil(0.08, 0.08, 0.9, 8, metal); tubo.rotation.z = 1.3; tubo.position.set(0.2, 0.3, -0.25); g.add(tubo);
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), brillo); aura.position.y = 1.2; aura.name = 'aura'; g.add(aura);
      gEsc.push(g);
    });
    // 3 · postes de los faroles (con percha arriba) y 4 · banderines entre ellos
    SITIO.postes.forEach((p, i) => {
      const y = alto(p.x, p.z), g = grupo('v18-fiesta-poste-' + i); g.position.set(p.x, y, p.z);
      const po = cil(0.09, 0.11, ALTO_POSTE, 8, madera); po.position.y = ALTO_POSTE / 2; g.add(po);
      const tabla = caja(0.9, 0.08, 0.9, maderaO); tabla.position.y = ALTO_POSTE + 0.04; g.add(tabla);
      const gancho = cil(0.025, 0.025, 0.5, 5, mat('negro', '#2c2a28', { metalness: 0.4 })); gancho.position.set(0.3, ALTO_POSTE + 0.33, 0); g.add(gancho);
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), luz); bola.position.set(0.3, ALTO_POSTE + 0.7, 0); bola.name = 'farol'; g.add(bola);
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), brillo); aura.position.y = ALTO_POSTE + 1.1; aura.name = 'aura'; g.add(aura);
      gFaroles.push(g); M.postes.push({ x: p.x, z: p.z, top: y + ALTO_POSTE + 0.08 });
      M.perchas.push(G.fisica.addPercha({ x: p.x, z: p.z, y: y + ALTO_POSTE + 0.08, r: 0.9, when: () => listo() || hecho() }));
      G.fisica.colliders.push({ kind: 'v18fiestaposte', x: p.x, z: p.z, r: 0.18, h: ALTO_POSTE, when: () => (listo() && A.tengo) || hecho() });
      const top = y + ALTO_POSTE + 0.08;
      G.interaccion.add({ id: 'v18_puerto_fiesta_farol_' + i, x: p.x, z: p.z, r: 2.6,
        visible: () => listo() && A.tengo && estado() === 'limpio' && !farolListo(i) && S.pos.y > top - 2.5 && S.pos.y < top + 6, label: () => TXT.farol, use: () => colgar(i) });
    });
    gBander = grupo('v18-fiesta-banderines');
    const COLS = ['#3fae5a', '#ffd23a', '#f08a2a', '#2bb3b1', '#9b6ad0'], tri = new THREE.BufferGeometry(), o3 = new THREE.Object3D();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.15, 0, 0, 0.15, 0, 0, 0, -0.32, 0], 3)); tri.computeVertexNormals();
    const tramos = [[0, 2], [2, 1], [1, 0]], nB = 12, ban = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), nB * tramos.length);
    let k = 0;
    for (const [a, b] of tramos) {
      const p0 = M.postes[a], p1 = M.postes[b], y0 = p0.top - 0.4, y1 = p1.top - 0.4, rot = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
      for (let i = 0; i < nB; i++) { const t = (i + 0.5) / nB; o3.position.set(p0.x + (p1.x - p0.x) * t, y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * 0.9, p0.z + (p1.z - p0.z) * t); o3.rotation.set(0, rot, 0); o3.updateMatrix(); ban.setMatrixAt(k, o3.matrix); ban.setColorAt(k, new THREE.Color(COLS[k % COLS.length]).convertSRGBToLinear()); k++; }
    }
    gBander.add(ban);
    // 4 · la placa del arco, donde estaba el tercer montón: un tablón con un engranaje (Tuerca), una pluma (Vittata), un casco (el Constructor) y una regla (la Ingeniera)
    gPlaca = grupo('v18-fiesta-placa');
    const pp = SITIO.escombros[2]; gPlaca.position.set(pp.x, alto(pp.x, pp.z), pp.z); gPlaca.rotation.y = Math.atan2(SITIO.plaza.x - pp.x, SITIO.plaza.z - pp.z);
    for (const x of [-0.55, 0.55]) { const o = cil(0.06, 0.07, 1.4, 6, maderaO); o.position.set(x, 0.7, 0); gPlaca.add(o); }
    const tablon = caja(1.5, 0.8, 0.08, madera); tablon.position.set(0, 1.25, 0); gPlaca.add(tablon);
    const oro = mat('oro', '#ffd23a', { metalness: 0.6, roughness: 0.35 });
    const eng = cil(0.16, 0.16, 0.05, 8, oro); eng.rotation.x = Math.PI / 2; eng.position.set(-0.5, 1.28, 0.06); gPlaca.add(eng);
    const pluma = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 6), mat('verde', '#3fae5a')); pluma.position.set(-0.16, 1.28, 0.07); pluma.rotation.z = 0.5; gPlaca.add(pluma);
    const casco = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), oro); casco.position.set(0.18, 1.2, 0.06); gPlaca.add(casco);
    const regla = caja(0.36, 0.06, 0.03, mat('turquesa', '#2bb3b1')); regla.position.set(0.5, 1.28, 0.07); regla.rotation.z = 0.4; gPlaca.add(regla);
    // 4 · empezar la fiesta, en el centro de la plaza
    G.interaccion.add({ id: 'v18_puerto_fiesta_empezar', x: SITIO.fiesta.x, z: SITIO.fiesta.z, r: 3, visible: () => listo() && A.tengo && estado() === 'faroles', label: () => TXT.empezar, use: empezar });
    // Tuerca (aparte, como en el puerto y las Atalayas: npc.js lleva a los otros dos)
    gTue = grupo('v18-fiesta-tuerca');
    G.interaccion.add({ id: 'v18_puerto_fiesta_tuerca', x: SITIO.tue.x, z: SITIO.tue.z, r: 2.4, visible: () => A.tengo && listo() && !!tue.raiz && estado() !== 'faroles', label: () => TXT.hablarTue, use: () => usar('tuerca') });
  }

  // ---------- Tuerca: el modelo en caché de npc.js y su fila de personajes_v18.js ----------
  const tue = { cargando: false, fallo: null, raiz: null, modelo: null, nodos: {}, mats: [], mixer: null, acciones: {}, anim: null, hablaT: 0, apariencia: null };
  const RETRATO_TUE = (() => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3b4250"/>' +
      '<g fill="#ffd23a"><circle cx="32" cy="13" r="5"/><circle cx="48" cy="24" r="5"/><circle cx="43" cy="43" r="5"/><circle cx="21" cy="43" r="5"/><circle cx="16" cy="24" r="5"/></g>' +
      '<circle cx="32" cy="32" r="16" fill="#c68a5c"/><circle cx="26.5" cy="30" r="1.8" fill="#2b2118"/><circle cx="37.5" cy="30" r="1.8" fill="#2b2118"/>' +
      '<path d="M25 39q7 4 14 0" stroke="#2b2118" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="32" cy="32" r="6" fill="#3b4250"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  })();
  function cargarTue() {
    if (tue.cargando || tue.raiz || tue.fallo || !N.def('tuerca')) return;
    tue.cargando = true;
    N.cargarModelo('tuerca').then(m => { tue.cargando = false; if (!m) { tue.fallo = 'sin modelo'; return; } try { montarTue(m); } catch (e) { tue.fallo = 'montar: ' + ((e && e.message) || e); } });
  }
  function montarTue(m) {
    if (tue.raiz) return;
    const modelo = m.raiz.clone(true), vistos = new Map();
    modelo.traverse(o => {
      if (o.name) tue.nodos[o.name] = tue.nodos[o.name] || o;
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = false;
      const cl = mm => { if (!vistos.has(mm)) { const c = mm.clone(); c.userData.c0 = mm.color ? mm.color.clone() : null; vistos.set(mm, c); tue.mats.push(c); } return vistos.get(mm); };
      o.material = Array.isArray(o.material) ? o.material.map(cl) : cl(o.material);
    });
    if (m.clips && m.clips.length) { tue.mixer = new THREE.AnimationMixer(modelo); for (const clip of m.clips) tue.acciones[clip.name] = tue.mixer.clipAction(clip); }
    tue.raiz = new THREE.Group(); tue.raiz.name = 'v18-fiesta-tuerca-raiz'; tue.raiz.add(modelo); tue.modelo = modelo; gTue.add(tue.raiz);
    tue.raiz.position.set(SITIO.tue.x, alto(SITIO.tue.x, SITIO.tue.z), SITIO.tue.z);
    tue.raiz.rotation.y = Math.atan2(SITIO.plaza.x - SITIO.tue.x, SITIO.plaza.z - SITIO.tue.z);
    if (tue.mixer) tue.mixer.update(0.001);
    vestirTue();
  }
  function vestirTue() {
    if (!tue.raiz) return;
    const d = N.def('tuerca'), pe = d.porEstado[N.estado('tuerca')] || {}, a = d.apariencias[pe.apariencia || 'aliado'];
    const grupos = d.mallas || {}, nodosDe = k => (grupos[k] || [k]).map(n => tue.nodos[n]).filter(Boolean);
    for (const k of Object.keys(Object.assign({}, ...Object.values(d.apariencias).map(x => x.mallas || {})))) for (const n of nodosDe(k)) n.visible = true;
    for (const k in a.mallas || {}) for (const n of nodosDe(k)) n.visible = !!a.mallas[k];
    for (const mt of tue.mats) { if (mt.userData.c0) mt.color.copy(mt.userData.c0); const h = a.colores && a.colores[mt.name]; if (h) mt.color.copy(new THREE.Color(h).convertSRGBToLinear()); }
    tue.apariencia = pe.apariencia || 'aliado';
    animarTue(hecho() ? 'Reparar' : 'Idle');
  }
  function animarTue(nom) {
    if (!tue.mixer) return;
    const act = tue.acciones[nom]; if (!act || tue.anim === nom) return;
    const prev = tue.anim && tue.acciones[tue.anim];
    act.reset().setEffectiveWeight(1).play(); if (prev) prev.crossFadeTo(act, 0.3, false);
    tue.anim = nom;
  }
  function liberarTue() {
    if (!tue.raiz) return;
    if (tue.mixer) { tue.mixer.stopAllAction(); tue.mixer.uncacheRoot(tue.modelo); }
    gTue.remove(tue.raiz); for (const mt of tue.mats) mt.dispose();
    Object.assign(tue, { raiz: null, modelo: null, nodos: {}, mats: [], mixer: null, acciones: {}, anim: null, hablaT: 0, apariencia: null });
  }
  function pasoTue(dt) {
    if (!tue.raiz) return;
    const d = dist(S.pos, tue.raiz.position), px = tue.raiz.position.x, pz = tue.raiz.position.z;
    const objetivo = d < 7 ? Math.atan2(S.pos.x - px, S.pos.z - pz) : Math.atan2(SITIO.plaza.x - px, SITIO.plaza.z - pz);
    let dif = objetivo - tue.raiz.rotation.y; while (dif > Math.PI) dif -= Math.PI * 2; while (dif < -Math.PI) dif += Math.PI * 2;
    tue.raiz.rotation.y += dif * Math.min(1, dt * 4);
    let bajo = false; try { bajo = !!(G.renderer.nivel && G.renderer.nivel() === 'bajo'); } catch (e) { /* */ }
    if (tue.mixer && !bajo && d < 60) tue.mixer.update(dt);
    if (tue.hablaT > 0 && (tue.hablaT -= dt) <= 0) vestirTue();
  }

  // ---------- Charlas ----------
  function decir(who, textos, fin, opts) {
    if (who !== 'tuerca') return N.decir(who, textos, fin, opts);
    tue.hablaT = 1.5 + textos.length * 2.5; animarTue('Hablar');
    try { G.dialogo.say(textos.map(t => ({ who: N.nombre('tuerca'), img: RETRATO_TUE, text: t })), fin || null, Object.assign({ caja: true }, opts || {})); } catch (e) { if (fin) fin(); return false; }
    return true;
  }
  function charla(lista, fin, opts) { const ir = i => { if (i >= lista.length) { if (fin) fin(); return; } decir(lista[i][0], [lista[i][1]], () => ir(i + 1), opts); }; ir(0); }
  function objetivo() {
    const e = estado();
    if (e === 'inicio') return TXT.obj.inicio;
    if (e === 'reunion') return con(TXT.obj.escombros, cuenta(escListo));
    if (e === 'limpio') return con(TXT.obj.faroles, cuenta(farolListo));
    if (e === 'faroles') return TXT.obj.empezar;
    return '';
  }
  function usar(id) {
    const e = estado();
    if (e === 'inicio') return reunion();
    if (e === 'fiesta') {
      // terminado el arco, una charla con ellos vuelve a enseñar la tarjeta (además de sus frases nuevas)
      const d = N.def(id), lineas = (d.porEstado[N.estado(id)] || {}).dialogo || [];
      if (id === 'tuerca') { A.tueCharlas++; return decir('tuerca', A.tueCharlas === 1 ? lineas : [lineas[A.tueCharlas % lineas.length]], tarjeta); }
      return N.decir(id, lineas, tarjeta);
    }
    return decir(id, [objetivo()]);
  }

  // ---------- Aplicar el estado guardado ----------
  function deducir() {
    if (!hecho()) return;
    for (const e of ['reparador', 'vecino', 'maestro_obra', 'aliado']) N.cambiarEstado('constructor', e);
    for (const e of ['responsable', 'rescate', 'jefa_obra']) N.cambiarEstado('ingeniera', e);
    for (const e of ['inventor', 'aliado']) N.cambiarEstado('tuerca', e);
  }
  function colocarElenco() {
    const ve = () => A.tengo && listo(), fin = hecho(), mira = p => Math.atan2(SITIO.plaza.x - p.x, SITIO.plaza.z - p.z);
    N.colocar('ingeniera', { x: SITIO.ing.x, z: SITIO.ing.z, rotY: mira(SITIO.ing), anim: null, aparece: ve, comenta: fin });
    N.colocar('constructor', { x: SITIO.con.x, z: SITIO.con.z, rotY: mira(SITIO.con), anim: fin ? 'trabajar' : null, aparece: ve, comenta: fin });
  }
  function aplicar() {
    if (!M.valido) return false;
    construir(); deducir();
    const e = estado(), fin = e === 'fiesta', ver = A.tengo && listo();
    gEsc.forEach((g, i) => { g.visible = ver && !fin && !escListo(i) && rango(e) < rango('limpio'); g.getObjectByName('aura').visible = e === 'reunion'; });
    gFaroles.forEach((g, i) => { g.visible = ver || fin && muelleHecho(); const on = farolListo(i) || fin; g.getObjectByName('farol').material = on ? mats.luz : mats.apagado; g.getObjectByName('aura').visible = e === 'limpio' && !farolListo(i); });
    gBander.visible = fin && muelleHecho(); gPlaca.visible = fin && muelleHecho(); gTue.visible = ver;
    if (ver) colocarElenco();
    if (tue.raiz) vestirTue();
    pagarXP();
    return true;
  }
  function revisarElenco() {
    const t = calcElenco();
    if (t === A.tengo) return false;
    A.tengo = t;
    try { if (G.v18muelle && G.v18muelle.aplicar) G.v18muelle.aplicar(); if (G.v18arco && G.v18arco.aplicar) G.v18arco.aplicar(); } catch (er) { /* */ }
    aplicar();
    if (!t && tue.raiz) liberarTue();
    emitir({ tipo: 'elenco', aqui: t });
    return true;
  }

  // ---------- Pasos del jugador ----------
  function reunion() {
    if (estado() !== 'inicio' || !A.tengo) return false;
    if (A.reuniendo && G.dialogo && G.dialogo.open && G.dialogo.open()) return false; // QA-211: espera a una caja, no a los bocadillos (esos los corta)
    A.reuniendo = true; try { G.dialogo.cancelarLibre(); } catch (e) { /* QA-211: los bocadillos de llegada no siguen después */ } quitarGuia();
    charla(TXT.reunion, () => { A.reuniendo = false; if (avanzar('reunion')) aplicar(); });
    return true;
  }
  const especie = () => (V.seleccionada && V.seleccionada()) || (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  function nuevoJugador(sp) { return H.luchador({ id: 'jugador', nombre: 'Tú', especie: sp || especie(), pos: S.pos, mira: () => S.facing }); }
  const blanco = { id: 'escombros', pos: { x: 0, y: 0, z: 0 }, i: -1 };
  function apuntar() { // el montón sin quitar más cercano
    let best = -1, bd = Infinity; SITIO.escombros.forEach((p, i) => { if (escListo(i)) return; const d = dist(S.pos, p); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return null;
    const p = SITIO.escombros[best]; blanco.i = best; blanco.pos.x = p.x; blanco.pos.z = p.z; blanco.pos.y = alto(p.x, p.z) + 0.5; return blanco;
  }
  const timers = [];
  function ctx() {
    return {
      otro: blanco,
      onda: (o, d, al) => { try { if (G.v18fx) G.v18fx.onda(o, d, al); } catch (e) { /* */ } },
      escudo: (f, s) => { try { if (G.v18fx) G.v18fx.escudo(S.pos, s); } catch (e) { /* */ } },
      despues: (s, fn) => timers.push({ t: s, fn }), fx: (k, x, y, z) => fx(k, x, y, z), sonar, lanzar: () => {},
      poder: ev => { try { G.emit('v18poder', Object.assign({ contra: 'escombros' }, ev)); } catch (e) { /* */ } },
      golpear: (b, g) => { if (b === blanco && g && g.interrumpe) quitar(blanco.i, 'pico'); return true; }
    };
  }
  const enEncuentro = () => listo() && A.tengo && estado() === 'reunion' && cuenta(escListo) < 3;
  function usarPoder() {
    if (!enEncuentro()) return { ok: false, motivo: 'fase' };
    if (!A.j) A.j = nuevoJugador();
    const b = apuntar(); if (!b) return { ok: false, motivo: 'nada' };
    const r = H.usar(A.j, A.j.poder, ctx());
    A.ultimo = { poder: A.j.poder, ok: r.ok, motivo: r.motivo, i: b.i, d: +dist(S.pos, b.pos).toFixed(2) };
    if (!r.ok) { if (r.motivo === 'espera' || r.motivo === 'energia') toast(TXT.espera, 1600); return r; }
    emitir({ tipo: 'poder', id: A.j.poder });
    if (A.j.poder === 'grito_yunque') return r; // llega con la onda: golpear()
    const h = H.get(A.j.poder) || {}, dx = b.pos.x - S.pos.x, dz = b.pos.z - S.pos.z, d = Math.hypot(dx, dz), f = S.facing || { x: 0, z: 1 }, fl = Math.hypot(f.x, f.z) || 1;
    const escudo = A.j.poder === 'escudo_plumas' || h.tecnica === 'plumas'; // las plumas apartan lo que tocan: de cerca, sin apuntar
    const mira = escudo || d < 1.5 || (dx * f.x + dz * f.z) / (d * fl) >= 0.5;
    if (d <= (escudo ? 3 : (h.alcance || 5) + 1) && mira) quitar(b.i, h.tecnica || 'poder'); else toast(TXT.falla, 2000);
    return r;
  }
  function quitar(i, como) {
    if (!enEncuentro() || i < 0 || escListo(i) || !V.cambiarMundo(claveEsc(i), 'quitado')) return false;
    const p = SITIO.escombros[i], n = cuenta(escListo);
    sonar('unlock'); fx('dust', p.x, alto(p.x, p.z) + 0.5, p.z, 16); fx('stars', p.x, alto(p.x, p.z) + 1, p.z, 10);
    toast(con(TXT.escombro, n), 2400); emitir({ tipo: 'escombro', id: i, n, como });
    aplicar();
    if (n >= 3) { soltarModo(); if (avanzar('limpio')) { aplicar(); charla(TXT.limpio); } }
    return true;
  }
  function colgar(i) {
    if (estado() !== 'limpio' || farolListo(i) || !V.cambiarMundo(claveFarol(i), 'colgado')) return false;
    const p = M.postes[i], n = cuenta(farolListo);
    sonar('pickup'); fx('stars', p.x, p.top + 0.8, p.z, 12);
    toast(con(TXT.farolN, n), 2600); emitir({ tipo: 'farol', id: i, n });
    aplicar();
    if (n >= 3 && avanzar('faroles')) { aplicar(); charla(TXT.faroles, null, { libre: true, caja: false }); }
    return true;
  }
  function empezar() {
    if (estado() !== 'faroles') return false;
    if (!avanzar('fiesta')) return false; // primero se guarda; luego los efectos
    V.otorgar('fiesta_colina', 'fiesta_colina', 1);
    deducir(); A.tueCharlas = 0;
    aplicar(); guardarJuego(); sonar('unlock');
    for (const p of M.postes) fx('stars', p.x, p.top + 1, p.z, 14);
    fx('feathers', SITIO.plaza.x, alto(SITIO.plaza.x, SITIO.plaza.z) + 2, SITIO.plaza.z, 24);
    try { G.camara.shake(0.05, 0.3); } catch (e) { /* */ }
    toast(TXT.fiesta, 4800);
    emitir({ tipo: 'fiesta' });
    charla(TXT.fin, tarjeta);
    return true;
  }
  // la tarjeta del final del arco (también se vuelve a ver hablando con ellos)
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function tarjeta() {
    if (!hecho()) return false;
    estiloTarjeta();
    const T2 = TXT.tarjeta;
    G.ui.showCard('<div class="v18-arco-fin"><h2>' + esc(T2.titulo) + '</h2><p>' + esc(T2.sub) + '</p><ol>' + T2.m.map(t => '<li><span aria-hidden="true">★</span> ' + esc(t) + '</li>').join('') + '</ol>' +
      '<p class="note">' + esc(T2.nota) + '</p><div class="row"><button class="btn" id="v18-arco-fin-ok" type="button">' + esc(T2.boton) + '</button></div></div>');
    const b = document.getElementById('v18-arco-fin-ok');
    if (b) { b.addEventListener('click', () => G.ui.hideCard()); try { b.focus({ preventScroll: true }); } catch (e) { /* */ } }
    emitir({ tipo: 'tarjeta' });
    return true;
  }
  function estiloTarjeta() {
    if (document.getElementById('v18-arco-fin-css')) return;
    const st = document.createElement('style'); st.id = 'v18-arco-fin-css';
    st.textContent = '.v18-arco-fin h2{margin:0 0 6px}.v18-arco-fin ol{list-style:none;padding:0;margin:10px 0;text-align:left}.v18-arco-fin li{padding:4px 0}' +
      '.v18-arco-fin li span{color:#e8a91a;margin-right:6px}.v18-arco-fin .btn{min-height:44px;min-width:44px}';
    document.head.appendChild(st);
  }
  function pagarXP() {
    if (!hecho() || !G.v18evo || !G.v18evo.dar || V.otorgado('xp_fiesta')) return 0;
    if (!V.otorgar('xp_fiesta', 'xp_fiesta', 1)) return 0;
    return G.v18evo.dar(V.seleccionada() || 'vittata', XP_FIN, 'fiesta') || 0;
  }

  // ---------- Aviso, bandera, modo de acción (tecla G y botón Poder) y HUD ----------
  const guia = { x: SITIO.plaza.x, z: SITIO.plaza.z, puesta: false };
  function ponerGuia() {
    if (guia.puesta || !G.minimapa || !G.minimapa.fijarDestino) return;
    let otra = null; try { otra = (G.minimapa.marcadores ? G.minimapa.marcadores() : []).find(m => m.tipo === 'dest' && !m.auto); } catch (e) { otra = null; }
    if (otra) return;
    try { G.minimapa.fijarDestino(guia.x, guia.z); guia.puesta = true; } catch (e) { /* */ }
  }
  function quitarGuia() {
    if (!guia.puesta) return; guia.puesta = false;
    try { const d = (G.minimapa.marcadores ? G.minimapa.marcadores() : []).find(m => m.tipo === 'dest' && !m.auto); if (d && Math.abs(d.x - guia.x) < 1 && Math.abs(d.z - guia.z) < 1) G.minimapa.quitarDestino(); } catch (e) { /* */ }
  }
  let modo0 = null, tomado = false;
  const guiaTxt = () => TACTIL ? TXT.guiaT : con(TXT.guia, ((A.j && H.get(A.j.poder)) || {}).nombre || TXT.poder);
  const modo = { activo: () => enEncuentro() && tomado, accion: () => usarPoder(), aviso: () => guiaTxt(), get verbo() { return TXT.poder; } };
  function tecla(e) {
    if (!tomado || (e.key || '').toLowerCase() !== 'g' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    e.stopImmediatePropagation();
    if (G.pausa && G.pausa.activa && G.pausa.activa()) return;
    if (!e.repeat) usarPoder();
  }
  addEventListener('keydown', tecla, true);
  function tomarModo() { if (tomado) return; tomado = true; if (!A.j) A.j = nuevoJugador(); modo0 = G.interaccion.modo; G.interaccion.modo = modo; if (G.input && G.input.keys) G.input.keys.delete('g'); }
  function soltarModo() { if (!tomado) return; tomado = false; if (G.interaccion.modo === modo) G.interaccion.modo = modo0; modo0 = null; }
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    const st = document.createElement('style'); st.id = 'v18-fiesta-css';
    st.textContent = '#v18-fiesta{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(340px,calc(100vw - 32px));z-index:40;' +
      'font-family:inherit;color:#fff;background:rgba(28,32,44,.78);border-radius:16px;padding:8px 12px;text-align:center;pointer-events:none}' +
      '#v18-fiesta[hidden]{display:none}#v18-fiesta .vf-t{font-weight:700;font-size:13px;letter-spacing:.04em;color:#ffe28a}#v18-fiesta .vf-o{font-size:15px;margin-top:2px;text-wrap:pretty}' +
      '#v18-fiesta button{pointer-events:auto;font:inherit;font-size:15px;font-weight:700;min-height:44px;min-width:44px;padding:6px 18px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;margin-top:6px}' +
      '#v18-fiesta button.no{opacity:.45}@media (max-width:760px){body.v18-fiesta-on #quest{display:none}body.v18-fiesta-on #minimapa{visibility:hidden}#v18-fiesta{top:calc(env(safe-area-inset-top,0px) + 64px)}}body.v18-fiesta-on #toast{z-index:41}';
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'v18-fiesta'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-labelledby', 'vf-t');
    el.innerHTML = '<div class="vf-t" id="vf-t">' + TXT.titulo + '</div><div class="vf-o" data-k="obj" aria-live="polite"></div><button type="button" data-k="poder" hidden>' + TXT.poder + '</button>';
    el.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation(); usarPoder(); pintarHud(true); });
    el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b || e.detail !== 0) return; e.preventDefault(); usarPoder(); });
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  function pintarHud(ver) {
    montarHud();
    const mostrar = !!ver && !hecho();
    if (hud.el.hidden === mostrar) hud.el.hidden = !mostrar;
    document.body.classList.toggle('v18-fiesta-on', mostrar);
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
  // El aviso de inicio espera al jugador libre de verdad, como QA-188/212 en descubrir.js: sin diálogo ni bocadillos de historia,
  // sin la apertura, sin actividad del menú V18 y con la portada y la pausa cerradas
  function libreAviso() {
    try {
      const t = document.getElementById('title'), p = document.getElementById('pause');
      if (!libre() || (G.dialogo && G.dialogo.activo && G.dialogo.activo()) || document.getElementById('c1-saltar')) return false;
      return !(G.menuModos && G.menuModos.ocupado && G.menuModos.ocupado()) && !(t && t.open) && !(p && p.matches && p.matches(':popover-open'));
    } catch (e) { return false; }
  }
  function paso(dt, busy) {
    if (!M.valido || !M.hecho) return;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    revisarElenco();
    const ver = A.tengo && listo(), dP = dist(S.pos, SITIO.plaza), cerca = dP < R_VISTA;
    const verRaiz = (ver || (hecho() && muelleHecho())) && cerca;
    if (raiz.visible !== verRaiz) raiz.visible = verRaiz;
    if (gTue.visible !== ver) aplicar();
    if (!ver) { soltarModo(); pintarHud(false); return; }
    const e = estado();
    if (e === 'inicio' && !A.avisado && !busy && dP > R_AVISO && libreAviso()) { A.avisado = true; toast(TXT.aviso, 5200); ponerGuia(); }
    if (!tue.raiz && dP < N.R_CARGA) cargarTue(); else if (tue.raiz && dP > N.R_LIBERA) liberarTue();
    if (!cerca) { soltarModo(); pintarHud(false); return; }
    pasoTue(dt);
    if (e === 'inicio' && !A.llegada && dP < R_LLEGADA && !busy && libre() && N.instancia('constructor') && N.instancia('ingeniera') && tue.raiz) { A.llegada = true; charla(TXT.llegada, null, { libre: true, caja: false }); }
    if (e === 'inicio' && dP < R_REUNION && !busy && libre()) reunion();
    if (e === 'reunion' && !A.j) A.j = nuevoJugador();
    if (enEncuentro() && dP < R_ENCUENTRO && !busy) { tomarModo(); H.paso(A.j, dt); } else soltarModo();
    const t = performance.now();
    if (e === 'reunion') for (const g of gEsc) { const au = g.getObjectByName('aura'); au.scale.setScalar(1 + Math.sin(t / 300) * 0.15); }
    if (e === 'limpio') for (const g of gFaroles) { const au = g.getObjectByName('aura'); au.scale.setScalar(1 + Math.sin(t / 300) * 0.15); }
    // la fiesta sigue: confeti de vez en cuando cerca de la plaza (solo fx, sin guardar nada)
    if (hecho() && dP < 30 && (A.confetiT -= dt) <= 0) { A.confetiT = 1.6; const a = t / 900; fx(['stars', 'feathers', 'leaves'][Math.floor(t / 1600) % 3], SITIO.plaza.x + Math.cos(a) * 3, alto(SITIO.plaza.x, SITIO.plaza.z) + 3, SITIO.plaza.z + Math.sin(a) * 3, 10); }
    pintarHud(dP < R_HUD && (e !== 'inicio' || dP < R_REUNION + 6) && !busy);
  }
  G.on('update', (dt, busy) => { if (!A.manual) paso(Math.min(dt, 0.1), busy); }, 76);
  G.on('apply', () => setTimeout(() => { A.reuniendo = false; soltarModo(); revisarElenco(); aplicar(); }, 0), 99);
  G.on('v18', ev => { if (ev && ev.tipo === 'mundo' && (ev.id === ID || /^v18_fiesta_/.test(ev.id || '') || ev.id === 'arco_muelle')) aplicar(); if (ev && ev.tipo === 'evo') pagarXP(); });

  function validar() {
    if (!T.mapa) return false;
    const h = alto(SITIO.plaza.x, SITIO.plaza.z), seca = !(G.agua && G.agua.levelAt(SITIO.plaza.x, SITIO.plaza.z) > h - 0.2);
    return seca && h > 15 && h < 40 && dist(SITIO.plaza, YOKAHU) > 40 && dist(SITIO.plaza, CHISPA) > 40;
  }
  function iniciar() { if (M.valido) return true; M.valido = validar(); if (M.valido) { aplicar(); revisarElenco(); } return M.valido; }
  Promise.resolve(G.mundo && G.mundo.listo).then(iniciar, iniciar);
  if (G.v18evo) pagarXP();

  // =====================================================================================================================
  // Prueba (va dentro de AV.v18ArcoTest): la misión 4 de punta a punta, con los botones en pantalla (Acción y Poder) como en un
  // teléfono, posándose en los postes con la física, la tarjeta del final y su guardado.
  // =====================================================================================================================
  let v18Test = null;
  G.on('v18', e => { if (v18Test) v18Test(e); }, 10);
  const textos = () => {
    const t = [TXT.titulo, TXT.aviso, TXT.falla, TXT.espera, TXT.farol, TXT.empezar, TXT.fiesta, TXT.poder, TXT.guiaT, TXT.hablarTue, con(TXT.guia, 'Grito del Yunque'),
      con(TXT.escombro, 1), con(TXT.farolN, 2), TXT.obj.inicio, con(TXT.obj.escombros, 1), con(TXT.obj.faroles, 2), TXT.obj.empezar,
      TXT.tarjeta.titulo, TXT.tarjeta.sub, TXT.tarjeta.nota, TXT.tarjeta.boton, ...TXT.tarjeta.m]
      .concat([TXT.llegada, TXT.reunion, TXT.limpio, TXT.faroles, TXT.fin].flatMap(l => l.map(x => x[1])));
    for (const id of ['constructor', 'ingeniera', 'tuerca']) { const d = N.def(id); t.push(d.nombre.es); for (const e in d.porEstado) t.push(...(d.porEstado[e].dialogo || [])); }
    return t;
  };
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name: 'Fiesta · ' + name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    try { await G.mundo.listo; } catch (e) { /* */ }
    iniciar();
    const tit = document.getElementById('title'), titAbierta = !!(tit && tit.open), cre = document.getElementById('creator'), creOculto = cre ? cre.hidden : true;
    if (titAbierta) tit.open = false; if (cre) cre.hidden = true; try { G.pausa.sincronizar(); } catch (e) { /* */ }
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z };
    const misiones = () => ({ m: JSON.stringify(S.missions), s: S.step, f: S.complete, e: JSON.stringify(S.events), c: JSON.stringify(S.collected), u: JSON.stringify(S.unlocked) });
    const difMis = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]).map(k => k + ': ' + String(a[k]).slice(0, 80) + ' → ' + String(b[k]).slice(0, 80));
    const susp = G.guardado.suspender, toast0 = G.ui.toast, toasts = [];
    G.ui.toast = t => { toasts.push(String(t)); };
    if (susp) susp(true);
    A.manual = true;
    const F = G.fisica, MV = F.MOVE, otros = [G.v18puerto, G.v18arco, G.v18muelle].filter(m => m && m.sesion), manual0 = otros.map(m => m.sesion().manual);
    otros.forEach(m => { m.sesion().manual = true; });
    const cambios = [], vigilar = fn => { const a = misiones(), i0 = JSON.stringify(S.inv || {}); const r = fn(); const d = difMis(a, misiones()); if (JSON.stringify(S.inv || {}) !== i0) d.push('inv'); if (d.length) cambios.push(...d); return r; };
    const correr = (s, h) => vigilar(() => { h = h || 1 / 30; for (let t = 0; t < s; t += h) { paso(h, false); N.paso(h, false); } });
    const ir = (x, z, mirar, y) => {
      S.pos.x = x; S.pos.z = z; S.pos.y = y != null ? y : alto(x, z) + 0.02; S.vy = 0; MV.flying = y != null; MV.swimming = false; MV.grounded = y == null; MV.vx = MV.vz = 0;
      if (mirar && S.facing) { const dx = mirar.x - x, dz = mirar.z - z, d = Math.hypot(dx, dz) || 1; S.facing.x = dx / d; S.facing.z = dz / d; }
    };
    const tocarEl = el => vigilar(() => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })));
    const tocar = () => tocarEl(G.input.actBtn); // el botón Acción de la pantalla, como un dedo
    const cerrarCharlas = () => { for (let i = 0; i < 16 && G.dialogo.open(); i++) tocar(); try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) { /* */ } };
    const geos = () => (G.renderer.renderer && G.renderer.renderer.info.memory.geometries) || 0;
    const puntoPara = (cx, cz, r, id) => { for (const rr of [r, r * 0.6, r * 1.3]) for (let a = 0; a < 16; a++) { const x = cx + Math.cos(a * 0.3927) * rr, z = cz + Math.sin(a * 0.3927) * rr; ir(x, z, { x: cx, z: cz }); const n = G.interaccion.nearest(); if (n && n.id === id) return { x, z }; } return { x: cx, z: cz }; };
    // en un teléfono el botón tiene que verse y poder tocarse: en pantalla, ≥ 44 px y sin nada encima en su centro
    const tocable = el => { if (!TACTIL) return true; const r = el.getBoundingClientRect(); if (el.offsetWidth < 44 || el.offsetHeight < 44 || r.right > innerWidth || r.bottom > innerHeight || r.left < 0 || r.top < 0) return false; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === el || el.contains(e)); };
    const posarse = p => { // llega volando encima del poste, deja de volar y cae con la física hasta la percha
      ir(p.x + 0.1, p.z + 0.1, null, p.top + 1.6); MV.flying = false; MV.grounded = false;
      for (let k = 0; k < 60 && !MV.grounded; k++) F.step(0.05, false);
      return { ok: MV.grounded && Math.abs(S.pos.y - p.top) < 0.35, y: S.pos.y - p.top };
    };
    try {
      check('1 · El sitio es el del mapa real: la plaza de las carpas en seco, fuera de las zonas de los capítulos y lejos del mirador Yokahú y de Chispa', M.valido && M.hecho && !(G.zonas && G.zonas.zonaEn && G.zonas.zonaEn(SITIO.plaza.x, SITIO.plaza.z)),
        'altura ' + alto(SITIO.plaza.x, SITIO.plaza.z).toFixed(1) + ' · Yokahú ' + dist(SITIO.plaza, YOKAHU).toFixed(0) + ' m · Chispa ' + dist(SITIO.plaza, CHISPA).toFixed(0) + ' m · táctil ' + TACTIL);
      V.borrar(); V.recargar(); Object.assign(A, { forzar: true, avisado: false, llegada: false, reuniendo: false, j: null, tueCharlas: 0 });
      try { G.dialogo.clear(); G.ui.hideCard(); } catch (e) { /* */ }
      // 2 · sin el muelle no hay nada; con él, los tres siguen en el muelle con Vittata allí y se mudan a la colina al alejarse
      for (const [k, v] of [['puente_villa', 'reparado'], ['puerto_mina', 'reparado'], ['arco_atalayas', 'encendido'], ['arco_muelle', 'materiales']]) V.cambiarMundo(k, v);
      ir(SITIO.plaza.x, SITIO.plaza.z); correr(0.2);
      const antes = !A.tengo && !gTue.visible;
      V.cambiarMundo('arco_muelle', 'construido'); ir(MUELLE.x - 3, MUELLE.z); correr(0.2);
      const enMuelle = !A.tengo;
      const villa = (T.mapa.lugares && T.mapa.lugares.villa) || { x: 150, z: 170 };
      ir(villa.x - 60, villa.z - 40); correr(0.2);
      check('2 · Antes del muelle no hay nada; luego los tres siguen en el muelle con Vittata allí y se mudan a la colina al alejarse', antes && enMuelle && A.tengo, antes + ' / ' + enMuelle + ' / ' + A.tengo);
      const PU = G.v18puerto;
      check('2b · Aviso y bandera verde; el marcador «Misión V18» (puerto → arco → muelle → colina) apunta a la fiesta', toasts.includes(TXT.aviso) && (PU && PU.mapa ? (PU.mapa() || {}).nombre === TXT.titulo : true), JSON.stringify(PU && PU.mapa && PU.mapa()));
      // 3 · cerca: los tres (Tuerca aquí y no en las Atalayas)
      ir(SITIO.plaza.x - 20, SITIO.plaza.z - 22); correr(0.2);
      for (let i = 0; i < 80 && !(N.instancia('ingeniera') && N.instancia('constructor') && tue.raiz); i++) { await esperar(100); correr(0.05); }
      const ing = N.instancia('ingeniera'), cons = N.instancia('constructor'), arcoTue = G.v18arco && G.v18arco.sesion ? G.v18arco.tuercaAqui && G.v18arco.tuercaAqui() : false;
      check('3 · En la colina aparecen la Ingeniera (jefa de obra), el Constructor (maestro de obra) y Tuerca (aliado); en las Atalayas ya no está Tuerca',
        ing && cons && tue.raiz && ing.apariencia === 'jefa_obra' && cons.apariencia === 'maestro_obra' && tue.apariencia === 'aliado' && !arcoTue && dist(cons, SITIO.con) < 1,
        (ing && ing.apariencia) + ' / ' + (cons && cons.apariencia) + ' / ' + tue.apariencia + ' · Tuerca en las Atalayas ' + arcoTue);
      // 4 · llegada y reunión (las charlas se pasan tocando Acción)
      ir(SITIO.plaza.x - 14, SITIO.plaza.z - 14); correr(0.4); await esperar(30);
      check('4 · Paso 1: al llegar, Tuerca y el Constructor saludan (bocadillos)', A.llegada);
      cerrarCharlas(); try { G.dialogo.clear(); } catch (e) { /* */ }
      // QA-211: si la reunión empieza con los bocadillos de llegada en marcha, los corta (no siguen después de la caja, fuera de orden)
      { try { G.dialogo.clear(); } catch (e) { /* */ } A.reuniendo = false;
        charla(TXT.llegada, null, { libre: true, caja: false }); const habia = !!G.dialogo.libre();
        const r = reunion(); const corta = r && !G.dialogo.libre() && G.dialogo.open();
        try { G.dialogo.clear(); } catch (e) { /* */ } A.reuniendo = false;
        check('QA-211 · La reunión corta los bocadillos de llegada en curso', habia && corta && estado() === 'inicio', 'había ' + habia + ' · corta ' + corta + ' · ' + estado()); }
      ir(SITIO.plaza.x - 5, SITIO.plaza.z - 5, SITIO.plaza); correr(0.2);
      const abre = G.dialogo.open() && (G.dialogo.actual() || {}).who === 'El Constructor';
      cerrarCharlas(); correr(0.1);
      check('4b · Paso 2: en la plaza el Constructor cuenta lo de los escombros (caja) y tocando Acción se pasa → reunion', abre && estado() === 'reunion', estado());
      // 5 · escombros con el botón Poder de la pantalla (y con Acción en modo poder)
      A.j = nuevoJugador('vittata');
      const e0 = SITIO.escombros[0], cerca0 = { x: e0.x - 3.2, z: e0.z - 2.4 };
      ir(cerca0.x, cerca0.z, e0); correr(0.1); pintarHud(true);
      const bt = hud.q('poder'), tomaModo = G.interaccion.modo === modo && !bt.hidden;
      A.j.energia = 100; A.j.cd = {}; tocarEl(bt); correr(0.8);
      const uno = cuenta(escListo);
      const e1 = SITIO.escombros[1]; ir(e1.x + 3.2, e1.z + 2.4, e1); correr(0.05); A.j.energia = 100; A.j.cd = {}; tocar(); correr(0.8); // desde el este: así el montón más cercano es este
      const dos = cuenta(escListo), tras2 = JSON.stringify(A.ultimo) + ' modo ' + (G.interaccion.modo === modo) + ' charla ' + G.dialogo.open() + ' tarjeta ' + G.ui.cardOpen;
      A.j = nuevoJugador('arausiaca'); const e2 = SITIO.escombros[2]; ir(e2.x - 1.6, e2.z - 1.2, e2); correr(0.05); A.j.energia = 100; A.j.cd = {}; tocarEl(bt); correr(0.3);
      check('5 · Paso 3: tocando Poder (Grito, de lejos), Acción en modo poder y el Escudo de plumas de cerca se quitan los 3 montones → limpio', tomaModo && uno === 1 && dos === 2 && cuenta(escListo) === 3 && estado() === 'limpio' && SITIO.escombros.every((p, i) => !gEsc[i].visible),
        tomaModo + ' · ' + uno + '/' + dos + '/' + cuenta(escListo) + ' · ' + estado() + ' · tras el 2.º ' + tras2 + ' · último ' + JSON.stringify(A.ultimo) + ' · modo ' + (G.interaccion.modo === modo) + ' · avisos ' + toasts.slice(-3).join(' | '));
      check('5b · Táctil: el botón Poder mide 44 px o más y, al terminar, se devuelve el modo de acción', (bt.offsetHeight >= 44 || getComputedStyle(bt).minHeight === '44px') && G.interaccion.modo !== modo, bt.offsetHeight + ' px');
      cerrarCharlas();
      // 6 · faroles: posarse en cada poste con la física y tocar Acción
      const desdeSuelo = (ir(M.postes[0].x + 0.5, M.postes[0].z + 0.5), correr(0.05), G.interaccion.nearest());
      const posados = M.postes.map((p, i) => { cerrarCharlas(); const r = posarse(p); correr(0.05); const n = G.interaccion.nearest(); const ok = r.ok && n && n.id === 'v18_puerto_fiesta_farol_' + i; if (ok) tocar(); return ok ? 'ok' : 'no(' + r.y.toFixed(2) + ',' + (n && n.id) + ')'; });
      cerrarCharlas();
      check('6 · Paso 4: desde el suelo no se cuelga; posándose en lo alto de cada poste (física, percha) y tocando Acción se cuelgan los 3 faroles → faroles',
        !(desdeSuelo && /fiesta_farol/.test(desdeSuelo.id)) && posados.every(x => x === 'ok') && estado() === 'faroles' && M.postes.every((p, i) => farolListo(i)), posados.join(' · ') + ' · ' + estado());
      // 7 · la fiesta: la tarjeta del arco completo, guardado antes de los efectos
      let guardadoAntes = null; v18Test = ev => { if (ev && ev.tipo === 'mundo' && ev.id === ID && ev.estado === 'fiesta' && guardadoAntes == null) { try { guardadoAntes = /"fiesta_colina":"fiesta"/.test(localStorage.getItem(V.clave())) && !gPlaca.visible; } catch (e) { guardadoAntes = false; } } };
      const evo = G.v18evo; G.v18evo = undefined;
      MV.flying = false;
      { const p = puntoPara(SITIO.fiesta.x, SITIO.fiesta.z, 1.6, 'v18_puerto_fiesta_empezar'); ir(p.x, p.z, SITIO.fiesta); correr(0.05); }
      const itE = G.interaccion.nearest(); tocar(); correr(0.1);
      check('7 · Paso 5: tocando Acción en el centro empieza la fiesta (el estado ya estaba guardado antes de los efectos)', itE && itE.id === 'v18_puerto_fiesta_empezar' && hecho() && guardadoAntes === true && V.otorgado('fiesta_colina'), (itE && itE.id) + ' · ' + guardadoAntes);
      G.v18evo = evo;
      let xp = null;
      if (evo && evo.info) { const sp = V.seleccionada() || 'vittata', x0 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); const x1 = evo.info(sp).xp; G.emit('v18', { tipo: 'evo' }); xp = [x0, x1, evo.info(sp).xp]; }
      check('7b · XP V18.2: 150 al terminar, una sola vez', xp ? xp[1] - xp[0] >= XP_FIN && xp[2] === xp[1] : true, xp ? xp.join(' → ') : 'sin G.v18evo');
      cerrarCharlas();
      const card = document.getElementById('v18-arco-fin-ok');
      check('7c · Al pasar la charla final sale la tarjeta «¡Arco completo!» con las 4 misiones y un botón tocable', G.ui.cardOpen && !!card && document.querySelectorAll('.v18-arco-fin li').length === 4 && /Arco completo|Arc complete/.test(document.querySelector('.v18-arco-fin h2').textContent) && tocable(card),
        'abierta ' + G.ui.cardOpen + ' · ' + (card ? card.getBoundingClientRect().height.toFixed(0) + ' px' : 'sin botón'));
      if (card) card.click(); correr(0.1);
      // 8 · lo que queda en el mundo y las apariencias finales
      const ci = N.instancia('constructor');
      check('8 · Paso 6: la placa del arco donde estaba el escombro, faroles encendidos y banderines', gPlaca.visible && gBander.visible && gFaroles.every(g => g.visible && g.getObjectByName('farol').material === mats.luz) && !G.ui.cardOpen);
      check('8b · El Constructor termina aliado de verdad con su ropa de reparador (sin chaleco, mochila y guantes), trabajando con los demás', N.estado('constructor') === 'aliado' && ci && ci.apariencia === 'reparador' && !ci.nodos.Chaleco.visible && ci.nodos.Mochila.visible && ci.nodos.GuanteL.visible && N.def('constructor').porEstado.aliado.apariencia === 'reparador',
        N.estado('constructor') + ' / ' + (ci && ci.apariencia));
      const g0 = geos(); N.apariencia('constructor', 'supervisor'); const g1 = geos(); N.apariencia('constructor', 'reparador');
      check('8c · Cambiar de apariencia no crea geometría', g0 === g1 && geos() === g0, g0 + ' → ' + g1);
      { const p = puntoPara(SITIO.tue.x, SITIO.tue.z, 1.3, 'v18_puerto_fiesta_tuerca'); ir(p.x, p.z, SITIO.tue); correr(0.1); }
      const nt = G.interaccion.nearest(); if (nt && nt.id === 'v18_puerto_fiesta_tuerca') tocar(); cerrarCharlas();
      check('8d · Hablar con ellos después vuelve a enseñar la tarjeta', G.ui.cardOpen && !!document.getElementById('v18-arco-fin-ok'), nt && nt.id);
      try { G.ui.hideCard(); } catch (e) { /* */ }
      // 9 · persistencia, partidas viejas y «Comenzar de cero»
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.2);
      check('9 · Tras recargar siguen la placa, los faroles, los banderines y el Constructor aliado; ni premio ni XP se repiten', hecho() && gPlaca.visible && gBander.visible && N.estado('constructor') === 'aliado' && !V.otorgar('fiesta_colina', 'fiesta_colina', 1) && pagarXP() === 0 && !G.ui.cardOpen);
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado', arco_atalayas: 'encendido', arco_muelle: 'construido', fiesta_colina: '???' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('9b · Una partida de antes (muelle hecho, sin claves de la fiesta) empieza en «inicio»; un valor desconocido no rompe nada', estado() === 'inicio' && !gPlaca.visible && N.estado('constructor') === 'maestro_obra' && SITIO.escombros.every((p, i) => !escListo(i)));
      localStorage.setItem(V.clave(), JSON.stringify({ v: 2, especies: {}, inv: {}, otorgados: {}, mundo: { puente_villa: 'reparado', puerto_mina: 'reparado', arco_atalayas: 'encendido', arco_muelle: 'construido', fiesta_colina: 'fiesta' }, sel: null, evo: {} }));
      V.recargar(); G.emit('apply'); await esperar(60); correr(0.1);
      check('9c · Con la fiesta hecha y sin claves de personaje se deducen los estados finales; nada retrocede', N.estado('constructor') === 'aliado' && N.estado('ingeniera') === 'jefa_obra' && N.estado('tuerca') === 'aliado' && gPlaca.visible && !N.cambiarEstado('constructor', 'maestro_obra') && !avanzar('reunion'));
      localStorage.removeItem(V.clave()); G.emit('apply'); await esperar(60); correr(0.1);
      check('9d · «Comenzar de cero» lo borra: sin placa ni faroles y el Constructor al principio', estado() === 'inicio' && !A.tengo && !gPlaca.visible && N.estado('constructor') === 'supervisor');
      check('10 · No toca las misiones del capítulo', !cambios.length, cambios.slice(0, 4).join(' | '));
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* */ } }
      const D = window.AV_EN || {}, pats = Object.keys(D).filter(k => k.indexOf('{}') >= 0).map(k => new RegExp('^' + k.split('{}').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'));
      const faltan = textos().filter(t => !D[t] && !pats.some(re => re.test(t)));
      check('10b · Todos los textos tienen inglés en content/cap1/en.js', !faltan.length, faltan.slice(0, 6).join(' | '));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    try { cerrarCharlas(); G.ui.hideCard(); } catch (e) { /* */ }
    soltarModo(); A.manual = false; A.forzar = false; A.reuniendo = false; A.j = null; timers.length = 0; v18Test = null;
    G.ui.toast = toast0; MV.flying = false;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); revisarElenco(); aplicar(); quitarGuia(); pintarHud(false);
    otros.forEach((m, i) => { m.sesion().manual = manual0[i]; try { if (m.aplicar) m.aplicar(); } catch (e) { /* */ } });
    N.paso(0.01, false);
    if (titAbierta) tit.open = true; if (cre) cre.hidden = creOculto; try { G.pausa.sincronizar(); } catch (e) { /* */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  const mapa = () => (listo() && A.tengo && !hecho() ? { x: SITIO.plaza.x, z: SITIO.plaza.z, nombre: TXT.titulo } : null);
  G.v18fiesta = { ID, ESTADOS, estado, avanzar, aplicar, usar, tarjeta, paso, SITIO, test, mapa, elenco: () => A.tengo, get valido() { return M.valido; }, sesion: () => A };
  return G.v18fiesta;
};
