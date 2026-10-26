/* Juego · Banquete en la selva (V9 bosque vivo, punto 1: «árboles con frutos»)
   Frutos en los árboles reales del mapa (palma de sierra, Prestoea montana, con racimos colgando bajo la copa; tabonuco,
   Dacryodes excelsa, con frutos en la copa) en el bosque y los bordes de Villa Raíz. Brillan un poco, se recogen en vuelo
   al pasar cerca (o con Acción si estás posada al lado), con sonido y chispas. Vittata lleva hasta 5; al pasar por el nido
   del criadero (o por el refugio, si aún no hay nido) los entrega: el pichón da saltitos de alegría y cada fruto suma XP al
   nido por la API del criadero (G.criadero.dar('fruta', id)). Los frutos vuelven a salir a los 2–3 minutos.
   Comer del árbol (directiva P1 de Kelvin): cada árbol con fruta tiene una rama (percha de fisica.js bajo la fruta). Vuela o
   trepa hasta ella, pósate y el botón Acción dice «Comer»: Vittata celebra con su propio gesto (clip Celebrate del rig, sin
   modelos nuevos), el fruto se consume, da +5 XP al nido (no hay sistema de energía: queda como decisión de Kelvin) y el HUD lo
   avisa («+5 XP al nido» en el botón Nido); el fruto vuelve a estar a los 2–3 min. Nada de carne ni comida humana: solo frutos.
   Dato real, una sola vez, al recoger la primera palma de sierra (USFWS, ficha de Amazona vittata; consultada el 25-oct-2026):
   «se alimenta sobre todo de frutos silvestres, en especial de la palma de sierra; en octubre el fruto del tabonuco pasa a
   ser importante». Fuente enlazada en la tarjeta.
   Minijuego «¡Banquete!» (desde el menú de Retos, src/game/retos.js lo pide con modoRetos(compartido)): 75 s en la colina,
   recoge frutos en vuelo; seguidos sin tocar el suelo suben el combo (hasta x8). Dos rutas: la de abajo (10 puntos) y la de
   las copas (25). Si tocas el suelo, el combo se va con una pista graciosa (sin castigo). Récord en `<almacen>.retos.banquete`
   y gancho retosResultado { modo: 'banquete', puntos, frutos } para «Mis récords». Sin anillos: los frutos son los objetivos.
   Rendimiento: una InstancedMesh por tipo de fruto (2 draw calls el mundo, 2 el minijuego); cantidad por calidad automática
   (bajo 16 árboles, medio 36, alto 60; se reajusta con G.on('calidad')); carga perezosa desde boot.js (no suma a la descarga
   inicial). Nada se escribe en la partida: lo que lleva Vittata vive en memoria; el dato visto, en `<almacen>.banquete`.
   window.AVBanquete(G) → { modoRetos, estado, recoger, entregar, test }. Prueba: AV.banqueteTest(). */
window.AVBanquete = function (G) {
  'use strict';
  if (G.banquete) return G.banquete;
  const S = G.S, R = G.renderer, scene = R.scene, F = G.fisica, M = F.MOVE, AVE = window.AVE, $ = G.util.$;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -1e9; return w > -1e8 ? w : -Infinity; };
  const superficie = (x, z) => Math.max(H(x, z), nivelAgua(x, z));
  const MAPA = window.AV_MAPA_CAP1 || null;
  const ALMACEN = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.banquete';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lm = m => R.linMat(m);
  const ARBOLES_N = { bajo: 16, medio: 36, alto: 60 };
  const LLEVO_MAX = 5, ALCANCE = 2.4, ALCANCE_Y = 2.6, REGEN = [120, 180], XP_FRUTO = 5;
  const DATO = {
    titulo: '¿Qué come la cotorra?',
    texto: 'La cotorra puertorriqueña se alimenta sobre todo de frutos silvestres, en especial de la palma de sierra. En octubre, cuando escasean otros frutos, el del tabonuco pasa a ser importante.',
    fuente: 'U.S. Fish & Wildlife Service: ficha de Amazona vittata (consultada el 25 de octubre de 2026)',
    url: 'https://www.fws.gov/species/puerto-rican-amazon-amazona-vittata',
  };
  const PISTAS_SUELO = ['¡Plof! El combo se fue a dormir la siesta en la hierba.', 'Las patitas tocaron el suelo: el combo salió corriendo. ¡Arriba otra vez!',
    'Ups, aterrizaje sorpresa. Los frutos de las copas te esperan.', 'El suelo también quería un abrazo. Combo a cero, pero los puntos se quedan.'];

  // ---------- Sonidos (sintéticos, como los del motor) ----------
  const A = G.audio;
  if (A && A.define && !A.has('bq_fruto')) {
    A.define('bq_fruto', (t, c, X) => { c = Math.min(c || 0, 10); X.tone(X.pent(c + 1, 659.25), t, 0.12, { gain: 0.12 }); X.tone(X.pent(c + 3, 659.25), t + 0.06, 0.2, { type: 'sine', gain: 0.1 }); });
    A.define('bq_copa', (t, c, X) => { c = Math.min(c || 0, 10); X.tone(X.pent(c + 4, 783.99), t, 0.1, { gain: 0.12 }); X.tone(X.pent(c + 6, 783.99), t + 0.05, 0.16, { type: 'sine', gain: 0.1 }); X.tone(X.pent(c + 8, 783.99), t + 0.11, 0.24, { type: 'sine', gain: 0.08 }); });
    A.define('bq_entrega', (t, n, X) => { for (let i = 0; i < 4; i++) X.tone(X.pent(i * 2 + 2, 523.25), t + i * 0.07, 0.22, { type: 'sine', gain: 0.1 }); });
    A.define('bq_pichon', (t, n, X) => { X.tone(1046, t, 0.08, { type: 'square', to: 1400, gain: 0.05 }); X.tone(1200, t + 0.12, 0.1, { type: 'square', to: 1650, gain: 0.05 }); });
    A.define('bq_plof', (t, n, X) => { X.tone(220, t, 0.18, { type: 'triangle', to: 140, gain: 0.1 }); X.noise(t, 0.12, { gain: 0.06 }); });
  }
  const sonar = (n, a) => { try { if (A && A.play) A.play(n, a); } catch (e) { /* sin audio */ } };

  // ---------- Geometría: racimo de palma (bolitas colgando) y frutos de tabonuco (óvalos) ----------
  function geoRacimo() {
    const partes = [];
    const bola = (x, y, z, r) => { const g = new THREE.SphereGeometry(r, 7, 5); g.translate(x, y, z); partes.push(g); };
    const tallo = new THREE.CylinderGeometry(0.025, 0.035, 0.5, 5); tallo.translate(0, -0.2, 0); partes.push(tallo);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.07 + (i % 3) * 0.035, y = -0.3 - (i % 4) * 0.11; bola(Math.cos(a) * r * 1.3, y, Math.sin(a) * r * 1.3, 0.065 + (i % 2) * 0.02); }
    bola(0, -0.72, 0, 0.085);
    return G.util.mergeGeos(partes);
  }
  function geoTabonuco() {
    const partes = [];
    for (let i = 0; i < 3; i++) { const g = new THREE.SphereGeometry(0.11, 8, 6); g.scale(1, 1.35, 1); g.translate(Math.cos(i * 2.1) * 0.14, -(i % 2) * 0.1, Math.sin(i * 2.1) * 0.14); partes.push(g); }
    const tallo = new THREE.CylinderGeometry(0.015, 0.02, 0.3, 4); tallo.translate(0, 0.15, 0); partes.push(tallo);
    return G.util.mergeGeos(partes);
  }
  const MATS = {
    palma: lm(new THREE.MeshLambertMaterial({ color: '#7a2a52', emissive: '#4a1232', emissiveIntensity: 0.35 })),
    tabonuco: lm(new THREE.MeshLambertMaterial({ color: '#b8c84a', emissive: '#56601a', emissiveIntensity: 0.35 })),
  };
  const GEOS = { palma: geoRacimo(), tabonuco: geoTabonuco() };
  const dummy = new THREE.Object3D();

  // Una capa de frutos: lista + 2 mallas instanciadas. fr = { x, y, z, tipo, activo, t, s, ruta, regen }
  function capa(nombre, cap) {
    const mallas = {};
    for (const tipo of ['palma', 'tabonuco']) {
      const im = new THREE.InstancedMesh(GEOS[tipo], MATS[tipo], cap);
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; im.visible = false; im.name = 'frutos_' + nombre + '_' + tipo;
      im.userData.sinCulling = true; im.userData.sinSolido = true;
      mallas[tipo] = im;
    }
    const L = { lista: [], mallas, grupo: null, fase: Math.random() * 6 };
    L.dibujar = function (dt) {
      L.fase += dt;
      const n = { palma: 0, tabonuco: 0 };
      for (const fr of L.lista) {
        if (!fr.activo) continue;
        const im = mallas[fr.tipo], i = n[fr.tipo]++;
        const bob = Math.sin(L.fase * 1.6 + fr.x * 0.7 + fr.z * 0.3) * 0.06, s = fr.s * (fr.pop > 0 ? 1 + fr.pop * 0.4 : 1);
        dummy.position.set(fr.x, fr.y + bob, fr.z); dummy.rotation.set(0, fr.x + fr.z, Math.sin(L.fase * 1.1 + fr.z) * 0.08); dummy.scale.setScalar(s); dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        if (fr.pop > 0) fr.pop = Math.max(0, fr.pop - dt * 3);
      }
      for (const tipo in mallas) { const im = mallas[tipo]; im.count = n[tipo]; im.visible = n[tipo] > 0; if (n[tipo]) im.instanceMatrix.needsUpdate = true; }
      const brillo = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(L.fase * 2.2));
      MATS.palma.emissiveIntensity = MATS.tabonuco.emissiveIntensity = brillo;
    };
    L.vaciar = () => { L.lista = []; for (const t in mallas) { mallas[t].count = 0; mallas[t].visible = false; } };
    L.cerca = function (x, y, z, r, ry) {
      let best = null, bd = Infinity;
      for (const fr of L.lista) {
        if (!fr.activo) continue;
        const d = Math.hypot(fr.x - x, fr.z - z); if (d > r || Math.abs(fr.y - y) > ry) continue;
        if (d < bd) { bd = d; best = fr; }
      }
      return best;
    };
    return L;
  }

  // ---------- Árboles con frutos en el mundo ----------
  const B = { listo: false, arboles: [], llevo: 0, recogidos: 0, entregados: 0, comidos: 0, gesto: false, datoVisto: false, reaccion: 0, ultimoAviso: -1e9, nivel: null };
  const mundo = capa('mundo', ARBOLES_N.alto * 3 + 8);
  scene.add(mundo.mallas.palma); scene.add(mundo.mallas.tabonuco);
  const ANCLAS = [['plaza', 0], ['terrenoB', 0], ['estacion', 0], ['poza_honda', 0], ['aldea', 0], ['parada_claro', 0]];
  function poi(id) { const p = MAPA && (MAPA.pois || []).find(q => q.id === id); return p ? { x: p.pos[0], z: p.pos[2] } : null; }
  function anclas() {
    const l = ANCLAS.map(a => poi(a[0])).filter(Boolean);
    if (!l.length) { const a = G.guardado.spawn; l.push({ x: a.x, z: a.z }); }
    return l;
  }
  // Árboles candidatos: palmas y tabonucos reales del mapa, los más cercanos a los sitios del capítulo, sin dos a menos de 6 m
  function candidatos() {
    const V = G.vegetacion, inst = V && V.instancias, info = V && V.info;
    if (!inst) return [];
    const an = anclas(), out = [];
    for (const [m, tipo] of [['palma_sierra', 'palma'], ['palma_sierra_joven', 'palma'], ['tabonuco', 'tabonuco'], ['tabonuco_enano', 'tabonuco']]) {
      const P = inst[m], inf = info && info[m]; if (!P || !inf) continue;
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i * 4], z = P.pos[i * 4 + 2], s = P.pos[i * 4 + 3], alto = inf.alto * s;
        if (alto < 3) continue;
        let d = Infinity; for (const a of an) d = Math.min(d, Math.hypot(x - a.x, z - a.z));
        if (d > (tipo === 'palma' ? 220 : 150)) continue; // las palmas viven más lejos del pueblo (terrazas): se buscan más allá
        out.push({ x, z, s, alto, tipo, d, y0: P.pos[i * 4 + 1] });
      }
    }
    out.sort((a, b) => a.d - b.d);
    const sel = [];
    for (const c of out) { if (sel.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 6)) continue; sel.push(c); }
    // Que haya de los dos en todas las calidades: se intercalan (una palma cada tres árboles mientras queden), así los 16 de «bajo»
    // ya llevan palmas aunque las más cercanas al pueblo sean tabonucos. Si solo hay de un tipo, se queda lo que hay en el mapa
    const pal = sel.filter(a => a.tipo === 'palma'), tab = sel.filter(a => a.tipo !== 'palma'), mezcla = [];
    while (mezcla.length < ARBOLES_N.alto && (pal.length || tab.length)) { const quierePalma = mezcla.length % 3 === 0; const de = quierePalma ? (pal.length ? pal : tab) : (tab.length ? tab : pal); mezcla.push(de.shift()); }
    return mezcla;
  }
  function frutosDe(arbol, ruta) {
    const l = [], base = superficie(arbol.x, arbol.z), suelo = H(arbol.x, arbol.z);
    if (arbol.tipo === 'palma') {
      // racimos colgando bajo la copa, a 1 o 2 lados del tronco
      const n = 1 + (Math.abs(Math.round(arbol.x * 3 + arbol.z)) % 2);
      for (let i = 0; i < n; i++) { const a = arbol.x * 0.9 + arbol.z * 0.4 + i * 2.6; l.push({ x: arbol.x + Math.cos(a) * 0.55, y: suelo + arbol.alto * 0.7, z: arbol.z + Math.sin(a) * 0.55, tipo: 'palma', s: 2.1 * Math.max(0.8, arbol.s) }); }
    } else {
      const n = 2 + (Math.abs(Math.round(arbol.z * 2 + arbol.x)) % 2);
      for (let i = 0; i < n; i++) { const a = arbol.x * 0.6 + arbol.z * 0.8 + i * (6.28 / n), r = 1.1 + (i % 2) * 0.8; l.push({ x: arbol.x + Math.cos(a) * r, y: suelo + arbol.alto * (0.72 + (i % 2) * 0.1), z: arbol.z + Math.sin(a) * r, tipo: 'tabonuco', s: 2.0 }); }
    }
    for (const fr of l) { fr.activo = true; fr.t = 0; fr.pop = 0; fr.regen = 0; fr.ruta = ruta || 'arbol'; fr.y = Math.max(fr.y, base + 1.5); }
    return l;
  }
  const nivel = () => R.calidad.nivel;
  const arbolesPara = n => ARBOLES_N[n] != null ? ARBOLES_N[n] : 36;
  // Rama para posarse junto a la fruta: una percha de fisica.js por árbol (bajo los racimos de la palma; en la copa del tabonuco)
  const perchas = [];
  function percharArbol(ar) {
    const suelo = H(ar.x, ar.z), y = suelo + ar.alto * (ar.tipo === 'palma' ? 0.7 : 0.72) - 0.55;
    if (y - superficie(ar.x, ar.z) < 1.2) return null;
    const p = F.addPercha({ x: ar.x, y, z: ar.z, r: ar.tipo === 'palma' ? 1.3 : 2.2, banquete: true }); perchas.push(p); return p;
  }
  function poblar(forzarN) {
    if (!B.arboles.length) B.arboles = candidatos();
    const n = forzarN != null ? forzarN : arbolesPara(nivel());
    mundo.vaciar();
    for (const p of perchas) F.removePercha(p); perchas.length = 0;
    for (const ar of B.arboles.slice(0, n)) { for (const fr of frutosDe(ar)) mundo.lista.push(fr); percharArbol(ar); }
    B.nivel = n; B.listo = true;
    return mundo.lista.length;
  }
  const preparado = (G.vegetacion && G.vegetacion.listo ? G.vegetacion.listo : Promise.resolve()).then(() => { if (!B.listo) poblar(); }, () => { if (!B.listo) poblar(); });
  G.on('calidad', C => { if (B.listo && arbolesPara(C.nivel) !== B.nivel) poblar(); });

  // ---------- HUD: lo que lleva Vittata ----------
  let chip = null;
  function estilo() {
    if (document.getElementById('estilo-banquete')) return;
    const st = document.createElement('style'); st.id = 'estilo-banquete';
    st.textContent = '#bq-chip{position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);z-index:30;pointer-events:none;' +
      'background:#fff8e8;color:#4a2a12;border:2px solid #d8b27a;border-radius:999px;padding:6px 14px;font:700 15px/1.2 var(--font-display,system-ui);box-shadow:0 3px 0 #b86f1a44;display:flex;gap:8px;align-items:center;opacity:0;transition:opacity .3s}' +
      '#bq-chip.ver{opacity:1}#bq-chip i{display:inline-block;width:12px;height:14px;border-radius:50% 50% 55% 55%;background:radial-gradient(circle at 35% 30%,#c86aa0,#5a1434)}' +
      '#bq-chip.late{animation:bq-late .5s ease-out}@keyframes bq-late{0%{transform:translateX(-50%) scale(1)}40%{transform:translateX(-50%) scale(1.18)}100%{transform:translateX(-50%) scale(1)}}' +
      'body.retos-on #bq-chip{display:none}' +
      '#card .bq-dato{max-width:520px}#card .bq-dato .bq-fuente{font-size:.85em;opacity:.85;margin:6px 0 10px}#card .bq-dato a{color:inherit}' +
      '@media (prefers-reduced-motion:reduce){#bq-chip.late{animation:none}}';
    document.head.appendChild(st);
  }
  function pintarChip() {
    if (!chip) { estilo(); chip = document.createElement('div'); chip.id = 'bq-chip'; chip.setAttribute('aria-live', 'polite'); chip.innerHTML = '<i aria-hidden="true"></i><span></span>'; document.body.appendChild(chip); }
    const ver = B.llevo > 0;
    chip.querySelector('span').textContent = B.llevo >= LLEVO_MAX ? `Frutos: ${B.llevo} de ${LLEVO_MAX} · ¡llévalos al nido!` : `Frutos para el nido: ${B.llevo}`;
    chip.classList.toggle('ver', ver);
    if (ver) { chip.classList.remove('late'); void chip.offsetWidth; chip.classList.add('late'); }
  }

  // ---------- Recoger, dato real, entregar ----------
  const enRetos = () => !!(G.retosApi && G.retosApi.activo);
  function recogerMundo(fr, comoAccion) {
    if (!fr || !fr.activo) return false;
    fr.activo = false; fr.regen = S.clock + rnd(REGEN[0], REGEN[1]);
    B.recogidos++;
    const lleno = B.llevo >= LLEVO_MAX;
    if (!lleno) B.llevo++;
    G.fx.burst(fr.x, fr.y, fr.z, fr.tipo === 'palma' ? 'petalos' : 'gold', 14);
    sonar('bq_fruto', Math.min(B.llevo, 5));
    pintarChip();
    if (lleno && performance.now() - B.ultimoAviso > 4000) { B.ultimoAviso = performance.now(); G.ui.toast('Ya llevas cinco. Llévaselos al nido y vuelve por más.', 2600); }
    if (fr.tipo === 'palma' && !B.datoVisto && !G.quiet) mostrarDato();
    return true;
  }
  function leerPropio() { try { return JSON.parse(localStorage.getItem(ALMACEN) || 'null') || {}; } catch (e) { return {}; } }
  function guardarPropio(d) { try { localStorage.setItem(ALMACEN, JSON.stringify(d)); } catch (e) { /* sin almacén */ } }
  B.datoVisto = !!leerPropio().dato;
  function mostrarDato() {
    if (B.datoVisto || G.ui.busy()) return false;
    B.datoVisto = true; guardarPropio(Object.assign(leerPropio(), { dato: true }));
    estilo();
    G.ui.showCard(`<div class="bq-dato"><h2>${DATO.titulo}</h2><p>${DATO.texto}</p><p class="bq-fuente note">Fuente: <a href="${DATO.url}" target="_blank" rel="noopener">${DATO.fuente}</a></p><div class="row"><button class="btn" id="bq-ok" type="button">¡A comer!</button></div></div>`);
    const b = document.getElementById('bq-ok'); if (b) { b.addEventListener('click', () => G.ui.hideCard()); b.focus({ preventScroll: true }); }
    return true;
  }
  // Dónde se entregan: el nido del criadero si ya está en el mundo; si no, el refugio construido
  function destino() {
    const it = G.interaccion.find('nido_criadero');
    if (it && (!it.visible || it.visible())) return { x: it.x, z: it.z, que: 'nido' };
    const r = S.refuge && S.refuge.parcel && MAPA && MAPA.lugares && MAPA.lugares[S.refuge.parcel];
    if (r) return { x: r.x, z: r.z, que: 'refugio' };
    return null;
  }
  let contador = 0;
  function entregar(forzado) {
    const d = forzado || destino(); if (!d || B.llevo <= 0) return 0;
    const n = B.llevo; B.llevo = 0; B.entregados += n;
    let xp = 0;
    if (G.criadero && G.criadero.dar) for (let i = 0; i < n; i++) { try { xp += G.criadero.dar('fruta', 'b' + Date.now().toString(36) + (contador++).toString(36)) || 0; } catch (e) { /* sin criadero */ } }
    sonar('bq_entrega'); setTimeout(() => sonar('bq_pichon'), 350);
    G.fx.burst(S.pos.x, S.pos.y + 0.8, S.pos.z, 'feathers', 18); G.fx.burst(d.x, superficie(d.x, d.z) + 1, d.z, 'gold', 22);
    B.reaccion = 2.2;
    const quien = d.que === 'nido' ? 'al nido' : 'al refugio';
    const pichon = G.actores && G.actores.companion3D && G.actores.companion3D.root.visible;
    G.ui.toast(`${n === 1 ? 'Un fruto' : n + ' frutos'} ${quien}${pichon ? ' · ¡el pichón da saltitos de alegría!' : ''}${xp ? ` · +${xp} XP` : ''}`, 3000);
    pintarChip();
    G.emit('banquete', { tipo: 'entrega', n, xp, donde: d.que });
    return n;
  }
  // Comer del árbol: posada en la rama junto al fruto, Acción = «Comer». Gesto del propio rig de Vittata (Celebrate), el fruto
  // se consume, +5 XP al nido por el criadero (el botón Nido muestra «+5 XP al nido») y vuelve a salir a los 2–3 min
  const NOMBRE = { palma: 'palma de sierra', tabonuco: 'tabonuco' };
  function comer(fr) {
    if (!fr || !fr.activo) return false;
    fr.activo = false; fr.regen = S.clock + rnd(REGEN[0], REGEN[1]);
    B.comidos++;
    let xp = 0;
    if (G.criadero && G.criadero.dar) { try { xp = G.criadero.dar('fruta', 'c' + Date.now().toString(36) + (contador++).toString(36)) || 0; } catch (e) { /* sin criadero */ } }
    B.gesto = !!(G.actores && G.actores.playEmote && G.actores.playEmote('celebrar'));
    G.fx.burst(fr.x, fr.y, fr.z, fr.tipo === 'palma' ? 'petalos' : 'gold', 16);
    sonar('bq_fruto', 3); setTimeout(() => sonar('bq_pichon'), 250);
    G.ui.toast(`Ñam: fruto de ${NOMBRE[fr.tipo]}${xp ? ` · +${xp} XP al nido` : ''}`, 2600);
    if (fr.tipo === 'palma' && !B.datoVisto && !G.quiet) setTimeout(() => mostrarDato(), 900);
    G.emit('banquete', { tipo: 'comer', fruto: fr.tipo, xp });
    return true;
  }
  // Acción posada junto a un fruto: un interactuable que se mueve al fruto más cercano
  const itAccion = { id: 'bq_fruto', x: 0, z: 0, r: ALCANCE, fr: null, label: () => 'Comer', use: () => { if (itAccion.fr) comer(itAccion.fr); },
    visible: () => !!itAccion.fr && !M.flying && !enRetos() };
  G.interaccion.add(itAccion);

  G.on('update', (dt, busy) => {
    if (!B.listo || enRetos()) { itAccion.fr = null; return; }
    // Regeneración
    for (const fr of mundo.lista) if (!fr.activo && fr.regen && S.clock >= fr.regen) { fr.activo = true; fr.pop = 1; fr.regen = 0; }
    if (busy) { itAccion.fr = null; return; }
    const fr = mundo.cerca(S.pos.x, S.pos.y + 0.7, S.pos.z, ALCANCE, ALCANCE_Y);
    if (fr && M.flying) { recogerMundo(fr, false); itAccion.fr = null; }
    else { itAccion.fr = fr; if (fr) { itAccion.x = fr.x; itAccion.z = fr.z; } }
    if (B.llevo > 0) { const d = destino(); if (d && Math.hypot(S.pos.x - d.x, S.pos.z - d.z) < 4.2 && S.pos.y - H(d.x, d.z) < 7) entregar(d); }
  }, 87);
  G.on('render', dt => {
    if (!enRetos()) mundo.dibujar(dt);
    // Saltitos del pichón al recibir frutos (encima de donde lo deja actores.js)
    if (B.reaccion > 0) {
      B.reaccion -= dt;
      const c = G.actores && G.actores.companion3D;
      if (c && c.root.visible) { const k = (2.2 - B.reaccion) * 6; c.root.position.y += Math.abs(Math.sin(k)) * 0.35; c.root.rotation.z = Math.sin(k * 0.5) * 0.25; }
    }
  }, 60);
  G.on('apply', () => { B.llevo = 0; B.reaccion = 0; pintarChip(); for (const fr of mundo.lista) { fr.activo = true; fr.regen = 0; } }, 95);

  // ---------- Minijuego «¡Banquete!» (modo de src/game/retos.js) ----------
  const T = { dur: 75, radio: 38, frutos: 16, combo: 4, comboMax: 8, abajo: 10, copas: 25, cuentaPaso: 0.85 };
  let ctx = null; // lo que comparte retos.js (ui, aviso, resultados, récords…)
  const J = { fase: 'nada', t: 0, cuenta: 0, puntos: 0, combo: 0, comboT: 0, frutos: 0, copas: 0, plofs: 0, finT: 0, enSuelo: false, fueraT: 0, sitios: [], grupo: null, arena: null, rec: null, nuevo: false, total: 0, respawn: 0 };
  const juego = capa('banquete', 40);
  function datosArenaJuego() {
    const b = poi('terrenoB') || poi('plaza'); if (b) return { x: b.x, z: b.z };
    const a = G.guardado.spawn; return { x: a.x, z: a.z };
  }
  // Sitios donde salen frutos: árboles reales dentro de la arena (abajo: media copa; copas: sobre la copa). Si hay pocos, puntos del aire
  function sitiosArena(a) {
    const out = [];
    for (const ar of (B.arboles.length ? B.arboles : candidatos())) {
      if (Math.hypot(ar.x - a.x, ar.z - a.z) > T.radio - 3) continue;
      const suelo = superficie(ar.x, ar.z);
      out.push({ x: ar.x, z: ar.z, tipo: ar.tipo, yAbajo: suelo + clamp(ar.alto * 0.5, 2.5, 5), yCopa: suelo + Math.max(ar.alto + 1.5, 7.5) });
    }
    for (let k = 0; out.length < 22 && k < 300; k++) {
      const ang = rnd(0, 6.28), r = Math.sqrt(Math.random()) * (T.radio - 4), x = a.x + Math.cos(ang) * r, z = a.z + Math.sin(ang) * r;
      if (out.some(o => Math.hypot(o.x - x, o.z - z) < 4)) continue;
      const suelo = superficie(x, z);
      out.push({ x, z, tipo: k % 2 ? 'palma' : 'tabonuco', yAbajo: suelo + 3.2, yCopa: suelo + 12.5 });
    }
    return out;
  }
  function construirArenaJuego() {
    const a = J.arena = datosArenaJuego();
    J.grupo = new THREE.Group(); J.grupo.name = 'banquete'; J.grupo.userData.sinSolido = true;
    const palo = lm(new THREE.MeshLambertMaterial({ color: '#c9a46a' }));
    for (let i = 0; i < 12; i++) {
      const t = i / 12 * Math.PI * 2, x = a.x + Math.cos(t) * (T.radio + 1), z = a.z + Math.sin(t) * (T.radio + 1), y0 = superficie(x, z) - 0.4;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 8, 6), palo); p.position.set(x, y0 + 4, z); J.grupo.add(p);
      const tela = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), lm(new THREE.MeshLambertMaterial({ color: i % 2 ? '#c86aa0' : '#b8c84a', side: THREE.DoubleSide })));
      tela.position.set(x + 0.75 * Math.cos(t + 1.57), y0 + 7.4, z + 0.75 * Math.sin(t + 1.57)); tela.rotation.y = -t; J.grupo.add(tela);
    }
    J.grupo.add(juego.mallas.palma); J.grupo.add(juego.mallas.tabonuco);
    J.sitios = sitiosArena(a);
  }
  function ponerFruto(ruta) {
    const libres = J.sitios.filter(s => !juego.lista.some(fr => fr.activo && fr.sitio === s && fr.ruta === ruta) && Math.hypot(s.x - S.pos.x, s.z - S.pos.z) > 7);
    if (!libres.length) return null;
    const s = libres[Math.floor(Math.random() * libres.length)];
    let fr = juego.lista.find(f => !f.activo);
    if (!fr) { if (juego.lista.length >= 40) return null; fr = {}; juego.lista.push(fr); }
    Object.assign(fr, { x: s.x + rnd(-0.6, 0.6), y: ruta === 'copas' ? s.yCopa : s.yAbajo, z: s.z + rnd(-0.6, 0.6), tipo: s.tipo, s: ruta === 'copas' ? 1.9 : 1.6, activo: true, t: 0, pop: 1, regen: 0, ruta, sitio: s });
    return fr;
  }
  function recogerJuego(fr) {
    fr.activo = false; J.frutos++;
    J.combo = Math.min(T.comboMax, J.combo + 1); J.comboT = T.combo;
    const copa = fr.ruta === 'copas', pts = (copa ? T.copas : T.abajo) * J.combo; J.puntos += pts; if (copa) J.copas++;
    sonar(copa ? 'bq_copa' : 'bq_fruto', J.combo);
    G.fx.burst(fr.x, fr.y, fr.z, copa ? 'gold' : 'petalos', copa ? 20 : 12);
    ctx.aviso('+' + pts + (J.combo >= 2 ? '  ·  combo x' + J.combo : '') + (copa ? '  ·  ¡copas!' : ''));
    if (!ctx.REDUCED) ctx.efectos.fovExtra += copa ? 4 : 2;
    J.respawn = 0.7;
  }
  function acabarJuego() {
    J.fase = 'fin'; J.finT = 0; J.total = J.puntos;
    sonar('bq_entrega'); ctx.aviso('¡Banquete terminado!'); G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'gold', 36);
    const rec = ctx.leerRec(), r = rec.banquete || (rec.banquete = {});
    J.nuevo = J.total > 0 && (!r.mejor || J.total > r.mejor);
    r.jugadas = (r.jugadas || 0) + 1; if (J.nuevo) r.mejor = J.total; r.frutos = Math.max(r.frutos || 0, J.frutos);
    ctx.guardarRec(rec); J.rec = r;
    G.emit('retosResultado', { modo: 'banquete', puntos: J.total, frutos: J.frutos, copas: J.copas, prueba: ctx.esPrueba() });
  }
  const medallaDe = p => (p >= 1200 ? 'oro' : p >= 600 ? 'plata' : p > 0 ? 'bronce' : 'sin');
  function mostrarResultadosJuego() {
    ctx.resultados(() => {
      const ui = ctx.ui, m = medallaDe(J.total);
      ui.medalla.className = 'rt-medalla ' + m; ui.medalla.textContent = J.frutos + '';
      ui.finT.textContent = J.total >= 1200 ? '¡Banquete de campeona!' : J.total >= 600 ? '¡Qué banquete!' : J.frutos ? '¡Buen picoteo!' : 'Los frutos siguen ahí';
      ui.nuevo.hidden = !J.nuevo;
      ui.datos.innerHTML = `<div class="rt-dato"><small>Puntos</small>${J.total}</div><div class="rt-dato"><small>Récord</small>${J.rec.mejor || 0}</div>` +
        `<div class="rt-dato"><small>Frutos</small>${J.frutos}</div><div class="rt-dato"><small>De las copas</small>${J.copas}</div>`;
    });
  }
  function actualizarJuego(dt) {
    if (J.fase === 'nada') return;
    J.t += dt;
    if (J.fase === 'cuenta') {
      J.t = 0; J.cuenta -= dt;
      const n = Math.ceil(J.cuenta / T.cuentaPaso);
      if (J.cuenta > 0 && n !== J.ultimoN) { J.ultimoN = n; ctx.mostrarCuenta(String(n)); ctx.sonar('r_cuenta'); }
      if (J.cuenta <= 0) { J.fase = 'juego'; ctx.mostrarCuenta('¡A comer!'); ctx.sonar('r_ya'); setTimeout(() => { if (ctx.ui.cuenta.textContent === '¡A comer!') ctx.mostrarCuenta(''); }, 700); }
      ctx.seguirCamara(dt, 1.2);
      return;
    }
    if (J.fase === 'fin') { J.finT += dt; if (J.finT > 1.3 && ctx.st.fase !== 'fin') mostrarResultadosJuego(); return; }
    // Combo: se enfría a los 4 s; tocar el suelo (o el agua) lo apaga con una pista graciosa
    J.comboT = Math.max(0, J.comboT - dt); if (J.comboT <= 0) J.combo = 0;
    const enSuelo = (M.grounded && !M.flying) || M.swimming;
    if (enSuelo && !J.enSuelo && J.combo >= 2) { J.combo = 0; J.plofs++; ctx.aviso(PISTAS_SUELO[J.plofs % PISTAS_SUELO.length]); sonar('bq_plof'); }
    J.enSuelo = enSuelo;
    // Recoger
    for (const fr of juego.lista) {
      if (!fr.activo) continue;
      if (Math.hypot(S.pos.x - fr.x, S.pos.z - fr.z) < ALCANCE && Math.abs(S.pos.y + 0.7 - fr.y) < ALCANCE_Y) recogerJuego(fr);
    }
    // Reponer
    if ((J.respawn -= dt) <= 0) {
      J.respawn = 0.5;
      const act = juego.lista.filter(f => f.activo), ab = act.filter(f => f.ruta === 'abajo').length, cp = act.length - ab;
      if (act.length < T.frutos) ponerFruto(ab <= cp ? 'abajo' : 'copas');
    }
    // Dentro de los banderines
    const a = J.arena, d = Math.hypot(S.pos.x - a.x, S.pos.z - a.z);
    if (d > T.radio + 6) { J.fueraT += dt; if (J.fueraT > 2.5) { J.fueraT = 0; ctx.aviso('Los frutos están dentro de los banderines. ¡Da la vuelta!'); } } else J.fueraT = 0;
    if (J.t >= T.dur) acabarJuego();
    ctx.seguirCamara(dt, 0.9);
    ctx.efectos.fovExtra += (0 - ctx.efectos.fovExtra) * (1 - Math.exp(-dt * 3));
  }
  function dibujarJuego(dt) {
    if (J.fase === 'nada') return;
    juego.dibujar(dt);
    const ui = ctx.ui;
    ui.tiempo.textContent = ctx.reloj(Math.max(0, T.dur - (J.fase === 'cuenta' ? 0 : J.t)));
    ui.puntos.textContent = String(J.puntos);
    ui.combo.textContent = J.combo >= 2 ? ' x' + J.combo : '';
    ctx.chispasFx(dt);
  }
  const MODO = {
    iniciar() {
      if (!J.grupo) construirArenaJuego();
      J.grupo.visible = true; if (!J.grupo.parent) ctx.raiz.add(J.grupo);
      juego.vaciar();
      Object.assign(J, { fase: 'cuenta', t: 0, cuenta: T.cuentaPaso * 3, puntos: 0, combo: 0, comboT: 0, frutos: 0, copas: 0, plofs: 0, finT: 0, enSuelo: false, fueraT: 0, ultimoN: 3, respawn: 0, nuevo: false, total: 0 });
      const a = J.arena, y = superficie(a.x, a.z) + 4.5;
      ctx.colocarJugador(a.x, y, a.z - 6, 0, 1); ctx.mirarHacia(0, 1);
      Object.assign(G.camara.CAM, { distFly: 11, heightFly: 7.5, follow: 7 });
      G.camara.place(true);
      const ui = ctx.ui;
      ui.hud.hidden = false; ui.flecha.hidden = true;
      ui.chipPos.hidden = ui.chipPts.hidden = ui.chipVidas.hidden = true; ui.chipPuntos.hidden = ui.chipTiempo.hidden = false;
      ui.puntos.textContent = '0'; ui.combo.textContent = '';
      for (let i = 0; i < 8; i++) ponerFruto('abajo'); for (let i = 0; i < 8; i++) ponerFruto('copas');
      ctx.st.fase = 'juego';
      ctx.sonar('r_cuenta'); ctx.mostrarCuenta('3');
    },
    terminar() { if (J.grupo) J.grupo.visible = false; juego.vaciar(); J.fase = 'nada'; },
    update(dt) { actualizarJuego(dt); },
    render(dt) { dibujarJuego(dt); },
  };
  function modoRetos(compartido) { ctx = compartido; return MODO; }

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const SV = G.guardado, claves = ['', '.tmp', '.prev'].map(s => SV.KEY + s);
    const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    // Otros módulos (minimapa, marcador, rareza…) escriben en G.S por su cuenta mientras pasan cuadros: una pasada de calibración con el
    // Banquete apagado descubre qué claves cambian solas; esas se guardan, se excluyen de la comparación estricta y se restauran al final
    const volatiles = new Set(), copiaVol = {};
    const comparable = d => { const o = {}; for (const k of SV.KEYS) if (!volatiles.has(k)) o[k] = d && d[k]; return JSON.stringify(o); };
    const restaurarVol = () => { for (const k of volatiles) { const v = JSON.parse(copiaVol[k]); if (Array.isArray(S[k]) && Array.isArray(v)) S[k].splice(0, S[k].length, ...v); else if (S[k] && typeof S[k] === 'object' && v && typeof v === 'object') { for (const q of Object.keys(S[k])) delete S[k][q]; Object.assign(S[k], v); } else S[k] = v; } };
    const realAntes = claves.map(leer); let sAntes = comparable(S); const propioAntes = leer(ALMACEN), errores0 = (window.__aveErrores || []).length;
    const guard = { quiet: G.quiet, pos: Object.assign({}, S.pos), flying: M.flying, grounded: M.grounded, swimming: M.swimming, llevo: B.llevo, dato: B.datoVisto, recogidos: B.recogidos, entregados: B.entregados, comidos: B.comidos, pausa: G.pausa.activa() };
    const ce = console.error, errores = []; console.error = function () { errores.push(Array.from(arguments).join(' ')); return ce.apply(console, arguments); };
    const estCri = G.criadero && G.criadero.estado ? G.criadero.estado() : null, criBackup = estCri ? JSON.parse(JSON.stringify(estCri)) : null, criKey = G.criadero && G.criadero.KEY, criLS = criKey ? leer(criKey) : null;
    const apartados = ['dialog', 'end', 'comic'].filter(id => $(id) && !$(id).hidden); apartados.forEach(id => { $(id).hidden = true; });
    if (G.ui.cardOpen) G.ui.hideCard();
    const cuadros = n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const tick = (s, dt) => { dt = dt || 0.05; for (let i = 0, n = Math.ceil(s / dt); i < n; i++) R.update(dt); };
    let api = null;
    try {
      G.quiet = true;
      await preparado;
      if (!window.AVRetos) await AVE.assets.script('src/game/retos.js'); // antes de la instantánea: mientras llega pasan cuadros y S.clock avanza
      { // calibración: los mismos disparadores de la prueba (cuadros de simulación y ganchos) con el Banquete apagado
        const listo0 = B.listo, a0 = {}; for (const k of SV.KEYS) a0[k] = JSON.stringify(S[k]);
        B.listo = false; tick(0.5); G.emit('update', 0.016, false, true); G.emit('render', 0.016); B.listo = listo0;
        for (const k of SV.KEYS) if (JSON.stringify(S[k]) !== a0[k] && k !== 'pos' && k !== 'facing') { volatiles.add(k); copiaVol[k] = JSON.stringify(S[k]); }
      }
      for (let i = 0; i < claves.length; i++) realAntes[i] = leer(claves[i]);
      sAntes = comparable(S);
      // ----- Frutos en el mundo -----
      const nAlto = poblar(ARBOLES_N.alto), nMedio = poblar(ARBOLES_N.medio), nBajo = poblar(ARBOLES_N.bajo);
      check('Hay árboles con frutos en el mapa (palma de sierra y tabonuco reales)', B.arboles.length >= 12, B.arboles.length + ' árboles, ' + nAlto + ' frutos en alto');
      const palmasEn = n => B.arboles.slice(0, n).filter(a => a.tipo === 'palma').length, hayPalmas = B.arboles.some(a => a.tipo === 'palma');
      check('Hay palmas de sierra con racimos en todas las calidades (4 o más en «bajo», o no hay palmas a menos de 220 m)', !hayPalmas || (palmasEn(ARBOLES_N.bajo) >= 4 && palmasEn(ARBOLES_N.medio) >= 8), palmasEn(16) + ' / ' + palmasEn(36) + ' / ' + palmasEn(60) + ' palmas de ' + B.arboles.length);
      check('La cantidad sigue la calidad (bajo < medio < alto)', nBajo < nMedio && nMedio < nAlto, nBajo + ' / ' + nMedio + ' / ' + nAlto);
      poblar();
      check('Todos los frutos quedan sobre el suelo y a altura de vuelo (1,5 a 30 m)', mundo.lista.every(fr => isFinite(fr.x + fr.y + fr.z) && fr.y - superficie(fr.x, fr.z) >= 1.5 && fr.y - superficie(fr.x, fr.z) <= 30));
      check('Cerca de los sitios del capítulo (a menos de 150 m de la plaza o la colina)', mundo.lista.every(fr => anclas().some(a => Math.hypot(fr.x - a.x, fr.z - a.z) <= 155)));
      mundo.dibujar(0.016);
      check('Se dibujan en 2 mallas instanciadas', mundo.mallas.palma.count + mundo.mallas.tabonuco.count === mundo.lista.length && Object.values(mundo.mallas).filter(m => m.visible).length <= 2, mundo.mallas.palma.count + ' racimos, ' + mundo.mallas.tabonuco.count + ' tabonucos');
      // ----- Recoger en vuelo -----
      B.llevo = 0; B.datoVisto = true; pintarChip();
      const fr0 = mundo.lista.find(fr => fr.activo && fr.tipo === 'palma') || mundo.lista[0];
      S.pos.x = fr0.x + 0.5; S.pos.z = fr0.z; S.pos.y = fr0.y - 0.7; M.flying = true; M.grounded = false; M.swimming = false;
            G.emit('update', 0.016, false, true);
      check('Al pasar volando junto a un fruto se recoge, suena y se cuenta', !fr0.activo && B.llevo === 1 && B.recogidos > guard.recogidos && (!A || A.log[A.log.length - 1] === 'bq_fruto'), 'llevo ' + B.llevo + ', fruto ' + (fr0.activo ? 'sigue' : 'recogido') + ', sonido ' + (A && A.log[A.log.length - 1]));
      check('El fruto recogido tiene hora de volver (2 a 3 min)', fr0.regen > S.clock + 100 && fr0.regen <= S.clock + 181);
      check('El HUD muestra lo que lleva', chip && chip.classList.contains('ver') && /Frutos para el nido: 1/.test(chip.textContent), chip && chip.textContent);
      // ----- Posada: no se recoge sola; Acción la recoge -----
      const fr1 = mundo.lista.find(fr => fr.activo && fr !== fr0);
      S.pos.x = fr1.x + 0.5; S.pos.z = fr1.z; S.pos.y = fr1.y - 0.7; M.flying = false; M.grounded = true;
      G.emit('update', 0.016, false, false);
      const cerca = G.interaccion.nearest();
      check('Posada al lado, no se recoge sola: Acción dice «Comer»', fr1.activo && B.llevo === 1 && cerca && cerca.id === 'bq_fruto' && cerca.label() === 'Comer', cerca && cerca.id);
      const cuidarA = estCri ? (estCri.fuentes.cuidar || 0) : 0, comidos0 = B.comidos;
      if (cerca && cerca.id === 'bq_fruto') cerca.use();
      check('«Comer»: el fruto se consume, da +5 XP al nido y lo avisa', !fr1.activo && B.llevo === 1 && B.comidos === comidos0 + 1 && (!estCri || (estCri.fuentes.cuidar || 0) - cuidarA === XP_FRUTO) && /Ñam/.test($('toast').textContent), $('toast').textContent);
      check('El fruto comido vuelve a salir a los 2–3 min', fr1.regen > S.clock + 100 && fr1.regen <= S.clock + 181);
      // Rama para posarse: una percha por árbol bajo la fruta
      // Por consulta: un árbol con rama que aún tenga un fruto al alcance (los de antes pudieron comerse en los pasos anteriores)
      const alAlcance = p => mundo.lista.find(f => f.activo && Math.hypot(f.x - p.x, f.z - p.z) < 2.4 && Math.abs(f.y - (p.y + 0.7)) < ALCANCE_Y);
      const pr0 = perchas.find(p => alAlcance(p)) || perchas[0], ar0 = pr0 && B.arboles.find(a => a.x === pr0.x && a.z === pr0.z);
      check('Cada árbol con fruta tiene una rama donde posarse (percha de fisica.js)', perchas.length >= Math.min(B.nivel, B.arboles.length) - 4 && !!pr0 && Math.abs(F.suelo(pr0.x, pr0.z, pr0.y + 0.1) - pr0.y) < 0.01, perchas.length + ' ramas de ' + B.nivel + ' árboles');
      const frR = pr0 && alAlcance(pr0);
      check('Posada en la rama, el fruto queda al alcance del pico', !!frR, frR ? Math.round((frR.y - pr0.y) * 10) / 10 + ' m sobre la rama' : 'sin fruto al alcance');
      if (frR) { S.pos.x = pr0.x; S.pos.z = pr0.z; S.pos.y = pr0.y; M.flying = false; M.grounded = true; G.emit('update', 0.016, false, false); const c2 = G.interaccion.nearest(), f2 = itAccion.fr; check('Desde la rama, Acción dice «Comer» y Vittata hace su gesto (Celebrate)', c2 && c2.id === 'bq_fruto' && f2 && (c2.use(), !f2.activo && B.gesto === true), 'gesto ' + B.gesto); }
      // Recoger con Acción ya no existe: en vuelo se recoge, posada se come
      // ----- Lleno a 5 -----
      M.flying = true; M.grounded = false;
      for (let i = 0, k = 0; i < mundo.lista.length && k < 5; i++) { const fr = mundo.lista[i]; if (!fr.activo) continue; k++; S.pos.x = fr.x + 0.3; S.pos.z = fr.z; S.pos.y = fr.y - 0.7; G.emit('update', 0.016, false, true); }
      check('Nunca lleva más de 5', B.llevo === LLEVO_MAX);
      // ----- Entregar al nido: XP por el criadero y reacción del pichón -----
      const cuidar0 = estCri ? (estCri.fuentes.cuidar || 0) : 0;
      let evento = null; const onB = d => { evento = d; }; G.on('banquete', onB);
      const n = entregar({ x: S.pos.x, z: S.pos.z, que: 'nido' });
      const cuidar1 = estCri ? (estCri.fuentes.cuidar || 0) : 0;
      check('Entrega los 5 frutos y lo avisa', n === 5 && B.llevo === 0 && evento && evento.n === 5 && evento.donde === 'nido' && !$('toast').hidden, $('toast').textContent);
      check('Cada fruto suma XP de «cuidar» al nido por la API del criadero (' + XP_FRUTO + ' XP)', !estCri || cuidar1 - cuidar0 === 5 * XP_FRUTO, (cuidar1 - cuidar0) + ' XP');
      check('El pichón reacciona (saltitos durante 2 s)', B.reaccion > 2);
      G.emit('render', 0.016); check('La reacción avanza con el render', B.reaccion < 2.2);
      const d0 = destino();
      check('El destino de la entrega es el nido o el refugio (o nada, antes de construir)', !d0 || d0.que === 'nido' || d0.que === 'refugio', d0 && d0.que);
      // ----- Dato real -----
      B.datoVisto = false; G.quiet = false;
      for (const fr of mundo.lista) if (fr.tipo === 'palma') { fr.activo = true; fr.regen = 0; } // por consulta: una palma con racimo, la haya comido antes o no
      const frP = mundo.lista.find(fr => fr.activo && fr.tipo === 'palma');
      if (frP) { S.pos.x = frP.x + 0.4; S.pos.z = frP.z; S.pos.y = frP.y - 0.7; M.flying = true; G.emit('update', 0.016, false, true); }
      const card = $('card');
      check('La primera palma de sierra abre el dato real con su fuente (USFWS)', (!hayPalmas && !frP) || (!!frP && G.ui.cardOpen && /fws\.gov/.test(card.innerHTML) && /palma de sierra/.test(card.textContent) && B.datoVisto && leerPropio().dato === true), 'palma ' + !!frP + ', tarjeta ' + G.ui.cardOpen + ', busy ' + G.ui.busy() + ', overlay ' + G.ui.overlayOpen() + ', visto ' + B.datoVisto);
      check('La tarjeta se cierra con «¡A comer!»', (() => { const b = $('bq-ok'); if (b) b.click(); return !G.ui.cardOpen; })());
      G.quiet = true; B.datoVisto = true;
      const frP2 = mundo.lista.find(fr => fr.activo && fr.tipo === 'palma');
      if (frP2) { S.pos.x = frP2.x + 0.4; S.pos.z = frP2.z; S.pos.y = frP2.y - 0.7; G.emit('update', 0.016, false, true); }
      check('El dato no se repite', !G.ui.cardOpen);
      // ----- Minijuego «¡Banquete!» -----
      api = window.AVRetos(G);
      api.pruebas.prueba(true);
      const recPrueba = api.pruebas.clave();
      try { localStorage.removeItem(recPrueba); } catch (e) { /* sin almacén */ }
      let emitido = null; G.on('retosResultado', r => { if (r && r.modo === 'banquete') emitido = r; });
      check('El menú de Retos tiene «¡Banquete!»', api.abrir() && !!ctxUI(api).menu.querySelector('[data-jugar="banquete"]'));
      check('Arranca desde el menú con cuenta atrás', api.jugar('banquete') === true && api.activo && api.reto === 'banquete' && J.fase === 'cuenta' && ctx && ctx.ui);
      check('Frutos del minijuego en 2 mallas, dentro de la arena y en dos rutas', juego.lista.filter(f => f.activo).length >= 12 && juego.lista.filter(f => f.ruta === 'copas').length >= 6 && juego.lista.filter(f => f.ruta === 'abajo').length >= 6 && (juego.dibujar(0.016), juego.mallas.palma.count + juego.mallas.tabonuco.count === juego.lista.filter(f => f.activo).length) && juego.lista.every(f => Math.hypot(f.x - J.arena.x, f.z - J.arena.z) <= T.radio) && juego.lista.every(f => f.ruta === 'copas' ? f.y - superficie(f.x, f.z) >= 6 : f.y - superficie(f.x, f.z) <= 5.6), juego.lista.filter(f => f.activo).length + ' frutos, ' + juego.lista.filter(f => f.ruta === 'copas').length + ' en las copas');
      check('Mientras dura el reto, Acción no recoge frutos del mundo', enRetos() && (G.emit('update', 0.016, false, true), itAccion.fr === null && !itAccion.visible()));
      tick(3); // cuenta atrás
      check('Empieza el juego (¡A comer!)', J.fase === 'juego', J.fase);
      // Recoge 5 seguidos sin tocar el suelo → combo
      let combos = 0;
      for (let i = 0; i < 5; i++) {
        const fr = juego.lista.find(f => f.activo && f.ruta === (i % 2 ? 'copas' : 'abajo')) || juego.lista.find(f => f.activo);
        S.pos.x = fr.x; S.pos.z = fr.z; S.pos.y = fr.y - 0.7; M.flying = true; M.grounded = false; S.vy = 0;
        R.update(0.02); combos = Math.max(combos, J.combo);
      }
      check('Recoger seguidos sube el combo y los puntos (copas valen más)', J.frutos === 5 && combos >= 4 && J.puntos >= 10 + 20 + 30 + 40 + 50 && J.copas >= 1, J.puntos + ' pts, combo ' + combos + ', copas ' + J.copas);
      check('Se reponen frutos', (() => { for (let i = 0; i < 60; i++) MODO.update(0.05); return juego.lista.filter(f => f.activo).length >= 12; })(), juego.lista.filter(f => f.activo).length + ' de ' + J.sitios.length + ' sitios');
      // Toca el suelo: pista graciosa, combo a cero, puntos intactos
      M.grounded = false; M.flying = true; M.swimming = false; MODO.update(0.02);
      const pts = J.puntos; J.combo = 3; J.comboT = 4;
      M.grounded = true; M.flying = false; MODO.update(0.02);
      check('Tocar el suelo quita el combo con una pista graciosa y sin quitar puntos', J.combo === 0 && J.plofs === 1 && PISTAS_SUELO.includes(ctxUI(api).aviso.textContent) && J.puntos === pts, ctxUI(api).aviso.textContent);
      M.grounded = false; M.flying = true;
      // Fin: 75 s
      J.t = T.dur - 0.1; tick(2);
      check('A los 75 s termina y muestra los resultados', J.fase === 'fin' && api.fase === 'fin' && !ctxUI(api).fin.hidden, ctxUI(api).finT.textContent);
      const rr = JSON.parse(leer(recPrueba) || 'null');
      check('Guarda el récord en su clave (aparte de la partida)', rr && rr.banquete && rr.banquete.mejor === J.total && rr.banquete.jugadas === 1 && rr.banquete.frutos === J.frutos, JSON.stringify(rr && rr.banquete));
      check('«Mis récords» recibe retosResultado { modo: banquete }', emitido && emitido.modo === 'banquete' && emitido.puntos === J.total && emitido.frutos === J.frutos && emitido.prueba === true, JSON.stringify(emitido));
      const total1 = J.total;
      check('«Otra vez» reinicia', (api.otraVez(), J.fase === 'cuenta' && J.puntos === 0 && juego.lista.filter(f => f.activo).length >= 12));
      J.t = T.dur; J.fase = 'juego'; J.puntos = Math.max(0, total1 - 1); tick(2);
      const rr2 = JSON.parse(leer(recPrueba) || 'null');
      check('Una partida peor no pisa el récord; cuenta la jugada', rr2 && rr2.banquete.mejor === total1 && rr2.banquete.jugadas === 2 && !J.nuevo, JSON.stringify(rr2 && rr2.banquete));
      api.abrir();
      check('El menú muestra el récord del banquete', /Récord: \d+ puntos/.test(ctxUI(api).menu.querySelector('[data-rec="banquete"]').textContent), ctxUI(api).menu.querySelector('[data-rec="banquete"]').textContent);
      api.salir();
      check('Al salir, el modo queda apagado y los frutos del mundo vuelven', !api.activo && J.fase === 'nada' && !enRetos() && mundo.lista.length > 0);
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      try { if (api && api.activo) api.salir(); } catch (e2) { /* ya fuera */ }
    } finally {
      try { if (api) { localStorage.removeItem(api.pruebas.clave()); api.pruebas.prueba(false); } } catch (e) { /* sin almacén */ }
      if (G.ui.cardOpen) G.ui.hideCard();
      G.ui.hideToast();
      if (estCri && criBackup) { for (const k of Object.keys(estCri)) delete estCri[k]; Object.assign(estCri, criBackup); try { if (criLS == null) localStorage.removeItem(criKey); else localStorage.setItem(criKey, criLS); } catch (e) { /* sin almacén */ } }
      try { if (propioAntes == null) localStorage.removeItem(ALMACEN); else localStorage.setItem(ALMACEN, propioAntes); } catch (e) { /* sin almacén */ }
      B.datoVisto = guard.dato; B.llevo = guard.llevo; B.recogidos = guard.recogidos; B.entregados = guard.entregados; B.comidos = guard.comidos; B.reaccion = 0; if (G.actores && G.actores.stopEmote) G.actores.stopEmote(); pintarChip();
      for (const fr of mundo.lista) { fr.activo = true; fr.regen = 0; }
      Object.assign(S.pos, guard.pos); M.flying = guard.flying; M.grounded = guard.grounded; M.swimming = guard.swimming;
      restaurarVol();
      G.quiet = guard.quiet; console.error = ce;
      apartados.forEach(id => { $(id).hidden = false; });
    }
    check('La partida de la historia (G.S) queda intacta (el Banquete no escribe en ella)', comparable(S) === sAntes, volatiles.size ? 'otros módulos escriben solos en: ' + [...volatiles].join(', ') + ' (guardadas y restauradas)' : 'ninguna clave cambia sola');
    check('El almacén de la partida no se escribió', claves.every((k, i) => leer(k) === realAntes[i]));
    check('El mundo no queda en pausa', G.pausa.activa() === guard.pausa);
    const nuevos = (window.__aveErrores || []).slice(errores0);
    check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  const ctxUI = api => (ctx && ctx.ui) || api.pruebas.ui();

  const api = G.banquete = { modoRetos, recoger: recogerMundo, comer, entregar, test, preparado, get listo() { return B.listo; },
    estado: () => ({ arboles: B.arboles.length, ramas: perchas.length, frutos: mundo.lista.length, activos: mundo.lista.filter(f => f.activo).length, llevo: B.llevo, recogidos: B.recogidos, entregados: B.entregados, comidos: B.comidos, dato: B.datoVisto }),
    _dev: { B, J, T, mundo, juego, perchas, poblar, candidatos, destino, comer, DATO } };
  return api;
};
