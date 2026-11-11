/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · frente B: reparación y persistencia (entregable D7).
   Estructura: el puente colgante de El Yunque junto a Villa Raíz (mapa.estructuras id 'puente', estructura propia de
   src/engine/mundo.js, malla 'estructura:puente' y piso tipo 'puente' en terreno.plataformas). worldChangeId 'puente_villa'.
   - 'roto' (por defecto): faltan las tablas del centro (se ocultan sus triángulos en la malla existente, sin modelos nuevos)
     y el piso del puente no sostiene (when() del piso: se cae al río, se nada y se sale; nada de daño).
     Dos maderas del puente quedaron en la orilla (modelo de la madera del pack): se recogen con Acción y van a S.inv.madera.
   - 'reparado': el aspecto de siempre, el piso vuelve a sostener (atajo a pie sobre el río) y en el centro sube la
     «corriente del puente»: volando dentro de ella, Vittata sube alto para planear lejos.
   - Coste (Kelvin 5-nov, respuestas a las 18 preguntas): 2 maderas + 1 piedra del inventario de siempre (S.inv), con
     G.objetos.has()/pay() del cap. 1: nada de inventario aparte ni de pluma de rival. Vías (decisión 9, también sin pelear):
     ganar el duelo de la explanada (frente A) o juntar madera y piedra por el bosque (recursos del cap. 1 y las 2 maderas
     de la orilla). Margen del cap. 1: hay 5 maderas + 3 de Luma y 4 piedras para 4 maderas y 2 piedras de la historia.
   - Materiales sin pelear (decisión 9): 2 piedras y 2 fibras recogibles (BM148) junto al puente y en el camino desde
     Villa Raíz; la piedra va a S.inv.piedra y la fibra cuenta como madera (S.inv.madera); cada una una sola vez (G.v18.mundo).
   - Persistencia: solo G.v18 (progreso.js). Se aplica al iniciar, en G.on('apply') y con cada evento v18 de tipo 'mundo'.
   Prueba: AV.v18RepararTest(). Solo se carga con la bandera V18 (src/boot.js). */
window.AVV18Reparar = function (G) {
  'use strict';
  if (G.v18Reparar) return G.v18Reparar;
  const V = G.v18 || window.AVV18Progreso(G);
  const S = G.S, T = G.terreno, scene = G.renderer.scene;
  const ID = 'puente_villa';
  const COSTE = { madera: 2, piedra: 1 };
  const inv = k => (S.inv && S.inv[k]) || 0;
  const tiene = c => (G.objetos && G.objetos.has ? G.objetos.has(c) : Object.keys(c).every(k => inv(k) >= c[k]));
  const pagar = c => { if (G.objetos && G.objetos.pay) G.objetos.pay(c); else for (const k in c) S.inv[k] -= c[k]; };
  const refrescarInv = () => { try { G.objetos.renderInv(); } catch (e) { /* sin HUD */ } try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* sin guardado */ } }; // QA-162: al momento, junto a la marca de G.v18
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3200); } catch (e) { /* sin interfaz */ } };
  // CG-124: desde el inicio, con el puente roto, una pista. No cambia la historia: nombra lo que ya existe.
  const PISTA_PUERTO = 'Repara el puente de Villa Raíz y se abre el Puerto de La Mina. Allí están Tuerca, el Constructor y la Ingeniera.';
  let pistaPuerto = false;
  function avisarPuerto() {
    if (pistaPuerto || !enCap1() || reparado()) return false;
    if (G.pausa && G.pausa.activa && G.pausa.activa()) return false;
    if (G.ui && (G.ui.cardOpen || (G.ui.overlayOpen && G.ui.overlayOpen()))) return false;
    if (G.dialogo && G.dialogo.open && G.dialogo.open()) return false;
    pistaPuerto = true;
    toast(PISTA_PUERTO, 6500);
    return true;
  }
  const sonar = n => { try { G.audio.play(n); } catch (e) { /* sin audio */ } };
  const estado = () => V.mundo(ID) || 'roto';
  const reparado = () => estado() === 'reparado';
  // QA-192: el puente V18 es de Villa Raíz; fuera del cap. 1 no se ofrece nada (mismo patrón que chispa/moon/guardian)
  const enCap1 = () => !!(G.pack && G.pack.id === 'cap1');

  // ---------- El puente real: piso (eje y comba) y malla ----------
  const P = { piso: null, malla: null, idx0: null, rotoIdx: null, ocultos: 0, eje: null };
  function buscarPiso() {
    if (P.piso && T.plataformas.indexOf(P.piso) >= 0) return P.piso;
    const pl = T.plataformas.find(p => p.id === 'puente' && p.tipo === 'puente');
    if (!pl) return null;
    P.piso = pl;
    const previo = pl.when;
    pl.when = () => reparado() && (!previo || previo());
    pl.cuerdas = true; // roto, faltan tablas del centro pero las barandas de soga siguen: posarse en ellas es «cuerda» (solidos.cuerdaPuente)
    const ux = pl.bx - pl.ax, uz = pl.bz - pl.az, L = Math.hypot(ux, uz) || 1;
    P.eje = { ax: pl.ax, az: pl.az, ay: pl.ay, by: pl.by, ux: ux / L, uz: uz / L, L, ancho: pl.ancho, comba: pl.comba };
    return pl;
  }
  const deckY = t => P.eje.ay + (P.eje.by - P.eje.ay) * t - P.eje.comba * 4 * t * (1 - t);
  // punto del eje a fracción t, desplazado `lado` m a la derecha
  function punto(t, lado) { const E = P.eje; return { x: E.ax + E.ux * E.L * t - E.uz * (lado || 0), z: E.az + E.uz * E.L * t + E.ux * (lado || 0) }; }
  function buscarMalla() {
    if (P.malla && P.malla.parent) return P.malla;
    const m = scene.getObjectByName('estructura:puente');
    if (!m || !m.geometry || !m.geometry.index || !P.eje) return null;
    P.malla = m;
    const g = m.geometry, idx = g.index.array, pos = g.attributes.position.array, E = P.eje;
    P.idx0 = idx.slice();
    const roto = idx.slice();
    let n = 0;
    for (let i = 0; i < idx.length; i += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let k = 0; k < 3; k++) { const v = idx[i + k] * 3; cx += pos[v]; cy += pos[v + 1]; cz += pos[v + 2]; }
      cx /= 3; cy /= 3; cz /= 3;
      const dx = cx - E.ax, dz = cz - E.az, t = (dx * E.ux + dz * E.uz) / E.L, lat = Math.abs(-dx * E.uz + dz * E.ux);
      const y = deckY(Math.min(1, Math.max(0, t)));
      // el tablero del centro (y los cables que lo sostienen por debajo); las barandas de soga quedan colgando
      if (t > 0.34 && t < 0.66 && lat < E.ancho / 2 + 0.35 && cy > y - 0.9 && cy < y + 0.3) { roto[i] = roto[i + 1] = roto[i + 2] = roto[i]; n++; }
    }
    P.rotoIdx = roto; P.ocultos = n;
    return m;
  }
  function pintar() {
    const m = buscarMalla();
    if (!m || !P.rotoIdx) return false;
    const a = m.geometry.index;
    a.array.set(reparado() ? P.idx0 : P.rotoIdx);
    a.needsUpdate = true;
    return true;
  }
  const centro = () => (P.eje ? Object.assign(punto(0.5), { y: deckY(0.5) }) : null);
  // QA-203: el centro solo cambia si cambia el eje; paso y enCorriente lo leen cada cuadro sin crear objetos (solo lectura)
  const _cen = { eje: null, c: null };
  const centroFijo = () => { if (_cen.eje !== P.eje) { _cen.eje = P.eje; _cen.c = centro(); } return _cen.c; };

  // ---------- QA-172: cruzarlo a pie de orilla a orilla (solo reparado) ----------
  // Medido en el juego (eje del piso, s en m desde la cabecera A de Villa Raíz; L ≈ 24,7 m): el estribo de concreto del modelo
  // (sólido, alto 11,92) tiene la cara hacia la orilla en s ≈ -3,5 (A) y L + 3,6 (B); el suelo de la orilla queda a 10,6-10,8 en A
  // (1,2 m más abajo: más que un escalón) y a 11,4 en B (0,5 m). Una rampa invisible por cabecera (piso 'rampa' del terreno, de una
  // vía, solo con el puente reparado) sube de la orilla a lo alto del estribo antes de su cara: el cuerpo no roza el concreto.
  // En A es empinada porque la orilla también lo es. Además, la riostra diagonal de cada marco de cabecera (del .glb, de 12,1 a
  // 13,9 m de un poste al otro) corta el paso a la altura de la cabeza en más de la mitad del tablero, y las sogas del anclaje
  // cruzan el hueco del estribo a la misma altura: esas celdas de sólido se recortan (G.solidos.recortar), sin tocar la malla.
  // Nada de esto existe con el puente roto (las rampas no sostienen y el recorte se hace al repararlo).
  // [s0, y0, s1, y1] de cada rampa (s relativo a la cabecera: A con s, B con L + s) y su ancho.
  // Cada cabecera lleva dos: la de la orilla al estribo y otra casi llana del estribo al tablero (entre los dos hay un hueco de
  // ~0,5 m con el suelo a 11,5: sin ella, al volver, la cara del estribo vuelve a ser un escalón de 0,45 m).
  // La primera de A empieza en s = -7 (y 8,0); la primera de cada cabecera es más ancha (3,6 m): andando recto desde la orilla sin venir justo por el eje, entre
  // s = -5 y -4 se quedaba en el suelo de la loma, 1 m por debajo de la rampa, y chocaba con la cara del estribo (juego de niño).
  const RAMPAS = { a: [[-7.0, 8.0, -3.6, 11.97, 3.6], [-3.6, 11.97, -0.3, 11.72]], b: [[6.0, 11.13, 3.3, 11.97, 3.6], [3.3, 11.97, 0.3, 11.72]], ancho: 2.6 };
  // Bandas de sólido que se recortan junto a cada cabecera (s de A; en B, L - s), hasta |lado| ≤ 0,85-1 m (los postes quedan):
  // la riostra (sobre el tablero + 0,08) y el hueco entre el tablero y el estribo, donde las sogas del anclaje cruzan a 12,8-13,5
  // (sobre lo alto del estribo, 12,0).
  const CORTES = [{ s0: -0.45, s1: 0.15, y: 0.08, lado: 0.85 }, { s0: -2.2, s1: -0.45, y: 0.33, lado: 1.0 }];
  const cabeceras = { rampas: [], recortado: false };
  function ponerCabeceras() {
    if (!P.eje) return;
    const E = P.eje;
    if (!cabeceras.rampas.length) {
      const enS = (sv, y) => { const p = punto(sv / E.L); return [p.x, y, p.z]; };
      const tramos = RAMPAS.a.concat(RAMPAS.b.map(([s0, y0, s1, y1, w]) => [E.L + s0, y0, E.L + s1, y1, w]));
      for (const [sa, ya, sb, yb, w] of tramos) {
        const pl = T.addPlatform({ tipo: 'rampa', a: enS(sa, ya), b: enS(sb, yb), ancho: w || RAMPAS.ancho, id: 'puente_rampa' });
        pl.when = reparado;
        cabeceras.rampas.push(pl);
      }
    }
    if (!cabeceras.recortado && reparado() && G.solidos && G.solidos.recortar) {
      cabeceras.recortado = true;
      const bandas = [];
      for (const C of CORTES) bandas.push([C.s0, C.s1, E.ay + C.y, C.lado], [E.L - C.s1, E.L - C.s0, E.by + C.y, C.lado]);
      for (const [s0, s1, yC, lado] of bandas) {
        const c = [punto(s0 / E.L, -1), punto(s0 / E.L, 1), punto(s1 / E.L, -1), punto(s1 / E.L, 1)];
        const dentro = (x, z) => { const dx = x - E.ax, dz = z - E.az, sv = dx * E.ux + dz * E.uz, lat = Math.abs(-dx * E.uz + dz * E.ux); return sv >= s0 && sv <= s1 && lat <= lado; };
        G.solidos.recortar(Math.min(...c.map(q => q.x)), Math.min(...c.map(q => q.z)), Math.max(...c.map(q => q.x)), Math.max(...c.map(q => q.z)), dentro, yC);
      }
    }
  }

  // ---------- Maderas del puente en la orilla (cerca del lado de Villa Raíz) ----------
  const maderas = [];
  function ponerMaderas() {
    if (maderas.length || !P.eje) return;
    const mod = G.pack.objetos && G.pack.objetos.madera && G.pack.objetos.madera.modelo;
    [[-0.12, -2.6, 'puente_madera_1'], [-0.2, 2.4, 'puente_madera_2']].forEach(([t, lado, key]) => {
      const p = punto(t, lado), y = T.height(p.x, p.z);
      const g = new THREE.Group(); g.name = 'v18-' + key;
      if (mod) { const o = mod(); o.rotation.y = 0.6 * lado; g.add(o); }
      g.position.set(p.x, y, p.z); scene.add(g);
      const M = { key, x: p.x, z: p.z, y, g };
      M.it = G.interaccion.add({ id: 'v18_' + key, x: p.x, z: p.z, r: 2.2, visible: () => enCap1() && !reparado() && !cogida(M),
        label: () => 'Recoger madera del puente', use: () => recoger(M) });
      maderas.push(M);
    });
    sincronizar();
  }
  // cada madera recogida es un cambio del mundo que se recuerda (G.v18.mundo); otorgar() es idempotente por la misma clave
  const cogida = M => V.mundo(M.key) === 'recogida';
  // primero se recuerda en G.v18 (se guarda al momento) y luego suma a S.inv: nunca da dos veces la misma madera
  function recoger(M) {
    if (cogida(M) || !V.cambiarMundo(M.key, 'recogida')) return false;
    S.inv.madera = inv('madera') + 1;
    refrescarInv();
    try { G.misiones.check(); } catch (e) { /* sin misiones */ }
    sonar('pickup');
    try { G.fx.recoger(M.x, M.y + 0.6, M.z, 'feathers', 12); } catch (e) { /* sin fx */ }
    toast('+1 madera del puente (' + Math.min(inv('madera'), COSTE.madera) + '/' + COSTE.madera + ')');
    sincronizar();
    return true;
  }
  function sincronizar() { for (const M of maderas) M.g.visible = enCap1() && !reparado() && !cogida(M); for (const R of materiales) R.g.visible = enCap1() && !cogida(R); }

  // ---------- Materiales sin pelear (decisión 9 de Kelvin: también se consiguen explorando) ----------
  // BM148: piedra_recogible.glb y fibra_recogible.glb (assets/models/mapa, copia base64 AV_MAPA_B64.<nombre> en _glb.js).
  // Dos piedras y dos fibras: una de cada junto a la cabecera del puente (lado de Villa Raíz) y otra de cada en el camino
  // de Villa Raíz al puente. Cada una se recoge una sola vez (G.v18.mundo['v18_<clave>'] = 'recogida', se guarda al momento).
  // La piedra suma a S.inv.piedra. La fibra suma a S.inv.madera: el inventario de siempre no tiene «fibra» y la fibra sirve
  // para atar las tablas, así que cuenta como material de madera (nada de tipo nuevo en S.inv, en el HUD ni en el guardado).
  // Siguen ahí con el puente ya reparado: son del mundo (sirven también para el refugio del cap. 1). Siempre con la bandera V18 (por defecto; ?v18=0 la apaga).
  const TIPOS = {
    piedra: { glb: 'piedra_recogible', inv: 'piedra', label: 'Recoger piedra', aviso: '+1 piedra', color: '#9aa0a3' },
    fibra: { glb: 'fibra_recogible', inv: 'madera', label: 'Recoger fibra', aviso: '+1 fibra (cuenta como madera)', color: '#8a9a4a' }
  };
  const modelos = {};
  function modelo(tipo) {
    const n = TIPOS[tipo].glb, url = 'assets/models/mapa/' + n + '.glb';
    if (!modelos[n]) modelos[n] = G.assets.loadGLB(url, { b64: () => (window.AV_MAPA_B64 || {})[n], script: url.replace(/\.glb$/, '_glb.js'), base: '', error: 'recogible no disponible: ' + n })
      .then(g => g.scene, () => null);
    return modelos[n];
  }
  // respaldo liso (si el .glb no carga): la forma de los recursos del cap. 1
  function respaldo(tipo) {
    const m = new THREE.Mesh(tipo === 'piedra' ? new THREE.DodecahedronGeometry(0.28, 0) : new THREE.CylinderGeometry(0.12, 0.18, 0.5, 6), new THREE.MeshLambertMaterial({ color: TIPOS[tipo].color }));
    m.position.y = 0.25; return m;
  }
  const materiales = [];
  // sitio en el suelo seco cerca de (x, z): prueba un anillo y se queda con el primer punto fuera del agua y sin muro
  function enSeco(x, z) {
    const seco = (px, pz) => {
      try {
        const h = T.height(px, pz);
        if (G.agua && G.agua.levelAt(px, pz) > h - 0.2) return false;
        const F = G.fisica, q = { x: px, z: pz, y: h };
        if (F && F.pushOut) for (const c of F.colliders) { F.pushOut(q, c, 0.7); if (q.x !== px || q.z !== pz) return false; }
      } catch (e) { /* sin consulta */ }
      return true;
    };
    if (seco(x, z)) return { x, z };
    for (let r = 1.5; r <= 6; r += 1.5) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * 0.785) * r, pz = z + Math.sin(a * 0.785) * r; if (seco(px, pz)) return { x: px, z: pz }; }
    return { x, z };
  }
  function sitiosMateriales() {
    const L = (T.mapa && T.mapa.lugares) || {};
    const a = punto(-0.08), v = L.villa ? { x: L.villa.x, z: L.villa.z } : punto(-1.2);
    const camino = f => ({ x: v.x + (a.x - v.x) * f, z: v.z + (a.z - v.z) * f });
    const p1 = punto(-0.2, -4.6), f1 = punto(-0.3, 4.2), p2 = camino(0.6), f2 = camino(0.35);
    return [['piedra', 'piedra_1', p1], ['fibra', 'fibra_1', f1], ['piedra', 'piedra_2', { x: p2.x - 2.5, z: p2.z + 1.5 }], ['fibra', 'fibra_2', { x: f2.x + 2, z: f2.z - 1.5 }]];
  }
  function ponerMateriales() {
    if (materiales.length || !P.eje) return;
    for (const [tipo, k, s] of sitiosMateriales()) {
      const p = enSeco(s.x, s.z), y = T.height(p.x, p.z), key = 'v18_' + k;
      const g = new THREE.Group(); g.name = 'v18-recogible-' + k; g.rotation.y = materiales.length * 1.7;
      g.position.set(p.x, y, p.z); scene.add(g);
      const R = { key, tipo, x: p.x, z: p.z, y, g, modelo: null };
      modelo(tipo).then(m => { const o = m ? m.clone(true) : respaldo(tipo); R.modelo = m ? 'glb' : 'respaldo'; g.add(o); });
      R.it = G.interaccion.add({ id: 'v18_recogible_' + k, x: p.x, z: p.z, r: 2.2, visible: () => enCap1() && !cogida(R), label: () => TIPOS[tipo].label, use: () => recogerMaterial(R) });
      materiales.push(R);
    }
    sincronizar();
  }
  // como las maderas de la orilla: primero la marca en G.v18 (al momento) y luego suma a S.inv; nunca da dos veces
  function recogerMaterial(R) {
    if (cogida(R) || !V.cambiarMundo(R.key, 'recogida')) return false;
    const T0 = TIPOS[R.tipo];
    S.inv[T0.inv] = inv(T0.inv) + 1;
    refrescarInv();
    try { G.misiones.check(); } catch (e) { /* sin misiones */ }
    sonar('pickup');
    try { G.fx.recoger(R.x, R.y + 0.5, R.z, 'leaves', 10); } catch (e) { /* sin fx */ }
    toast(T0.aviso, 2400);
    sincronizar();
    return true;
  }

  // ---------- Reparar (interacción en la cabecera del lado de Villa Raíz) ----------
  // qué falta: { madera, piedra } (0 si no falta)
  function faltan() { return { madera: Math.max(0, COSTE.madera - inv('madera')), piedra: Math.max(0, COSTE.piedra - inv('piedra')) }; }
  const textoFalta = () => 'Faltan materiales: 2 maderas y 1 piedra (tienes ' + inv('madera') + ' y ' + inv('piedra') + '). Gana el duelo de la explanada o junta madera y piedra por el bosque.';
  function reparar() {
    if (reparado()) { toast('El puente ya está reparado. ¡Prueba la corriente del centro!'); return false; }
    if (!tiene(COSTE)) { sonar('wrong'); toast(textoFalta(), 5000); return false; }
    // el estado del mundo se guarda primero (G.v18, al momento) y luego se cobra: si algo corta en medio, nunca queda cobrado sin reparar
    if (!V.cambiarMundo(ID, 'reparado')) return false;
    pagar(COSTE);
    refrescarInv();
    aplicar();
    sonar('unlock');
    const c = centro();
    if (c) { try { G.fx.recoger(c.x, c.y + 0.5, c.z, 'feathers', 26); G.fx.burst(c.x, c.y + 0.5, c.z, 'stars', 18); } catch (e) { /* sin fx */ } }
    try { G.camara.shake(0.08, 0.3); } catch (e) { /* sin cámara */ }
    toast('¡Puente reparado! Crúzalo a pie o vuela al centro: ¡hay una corriente que te sube!', 4500);
    return true;
  }
  let itReparar = null;
  function ponerInteraccion() {
    if (itReparar || !P.eje) return;
    const p = punto(-0.06);
    itReparar = G.interaccion.add({ id: 'v18_reparar_puente', x: p.x, z: p.z, r: 3.2, visible: () => enCap1() && !reparado(),
      label: () => 'Reparar el puente: 2 maderas + 1 piedra', use: reparar });
  }

  // ---------- Corriente del puente (solo reparado): volando, sube hasta 28 m sobre el tablero ----------
  const CORR = { r: 3.6, alto: 28, sube: 9, avisada: false, pistaT: 0, fxT: 0 };
  function enCorriente(x, z, y) {
    if (!reparado() || !P.eje || !enCap1()) return false;
    const c = centroFijo();
    return Math.hypot(x - c.x, z - c.z) < CORR.r && (y == null || y < c.y + CORR.alto);
  }
  // QA-172: en la cabecera B crece un árbol del bosque (su tronco queda entre el tablero y el estribo, en el centro del paso).
  // Se rodea: si Vittata camina hacia él y no avanza, se aparta de lado hacia el hueco libre (primero a un lado y, si allí
  // también choca, al otro), sin atravesar nada. Solo a pie, con el puente reparado y en las cabeceras.
  const RODEO = { t: 0, lado: -1, v: 2.4, espera: 0.2, x: 0, z: 0 };
  const TECLAS_MOVER = ['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
  const pideMover = () => {
    const k = G.input && G.input.keys, st = G.input && G.input.stick;
    if (k) for (let i = 0; i < TECLAS_MOVER.length; i++) if (k.has(TECLAS_MOVER[i])) return true;
    return !!(st && Math.hypot(st.x, st.y) > 0.12);
  };
  function rodeo(dt, M) {
    const SOL = G.solidos && G.solidos.activo ? G.solidos : null, E = P.eje;
    const avance = dt > 0 ? Math.hypot(S.pos.x - RODEO.x, S.pos.z - RODEO.z) / dt : 0; // m/s desde el cuadro anterior
    RODEO.x = S.pos.x; RODEO.z = S.pos.z;
    if (!SOL || !M || M.flying || M.swimming || !M.grounded || !pideMover() || avance > 0.6) { RODEO.t = 0; return false; }
    const dx = S.pos.x - E.ax, dz = S.pos.z - E.az, sv = dx * E.ux + dz * E.uz, lat = -dx * E.uz + dz * E.ux;
    if (!((sv > -2.6 && sv < 0.6) || (sv > E.L - 0.6 && sv < E.L + 2.6)) || Math.abs(lat) > 0.6) { RODEO.t = 0; return false; }
    if ((RODEO.t += dt) < RODEO.espera) return false;
    const pen0 = SOL.penetra(S.pos.x, S.pos.z, S.pos.y), d = RODEO.v * dt;
    // hacia dónde camina por el eje (la cámara manda el paso): para apartarse, de lado y, si de lado roza, también un poco atrás
    const yaw = G.camara.yaw, haciaB = (-Math.sin(yaw)) * E.ux + (-Math.cos(yaw)) * E.uz >= 0 ? 1 : -1;
    const lado0 = RODEO.lado;
    for (let li = 0; li < 2; li++) for (let ai = 0; ai < 2; ai++) {
      const lado = li ? -lado0 : lado0, atras = ai ? 0.6 : 0;
      const nx = S.pos.x - E.uz * lado * d - E.ux * haciaB * atras * d, nz = S.pos.z + E.ux * lado * d - E.uz * haciaB * atras * d;
      if (Math.abs(lat + lado * d) > 0.75 || SOL.penetra(nx, nz, S.pos.y) > pen0) continue;
      S.pos.x = nx; S.pos.z = nz; RODEO.lado = lado; RODEO.x = nx; RODEO.z = nz;
      return true;
    }
    RODEO.lado = -RODEO.lado;
    return false;
  }
  // Baranda (demo V18.1, juego de niño en el móvil): las sogas y barandas del puente son sólidos finos donde se puede quedar
  // posada (saltando junto al borde, la ayuda para posarse la sube encima) y desde ahí el joystick no la sacaba: cada paso le
  // metía el cuerpo en la soga de al lado. Posada en lo alto de una baranda del puente o de las sogas de las cabeceras
  // (a más de 0,3 m sobre el tablero del eje y a más de 0,5 m de él), pedir moverse (o saltar) la pasa de un paso al aire libre
  // sobre el tablero, a 0,25 m del eje, y cae encima. Volando no cambia nada; quieta, puede seguir posada.
  const BARANDA = { lat: 0.25, veces: 0 };
  function bajarBaranda(dt, M) {
    const F = G.fisica, E = P.eje, SOL = G.solidos && G.solidos.activo ? G.solidos : null;
    if (!F || !M || !SOL || M.flying || M.swimming || !(pideMover() || (G.input && G.input.jumpHeld))) return false;
    const dx = S.pos.x - E.ax, dz = S.pos.z - E.az, sv = dx * E.ux + dz * E.uz, lat = -dx * E.uz + dz * E.ux;
    if (sv < -3.6 || sv > E.L + 3.6 || Math.abs(lat) < 0.5 || Math.abs(lat) > 2.2) return false;
    const c = punto(sv / E.L), base = F.suelo(c.x, c.z, S.pos.y);
    // encima de algo (o metida en ello: la red de desatasco la sostiene arriba) y más de 0,3 m sobre el tablero del eje
    if (!(base > -1e9) || S.pos.y - base < 0.3 || S.pos.y - F.suelo(S.pos.x, S.pos.z, S.pos.y) > 0.2) return false;
    // de un paso (medio metro de lado, no se nota) al aire libre sobre el tablero, lejos de la soga: desde ahí cae encima.
    // Si ese aire o el tablero de debajo no están libres, no se la mueve.
    const sg = Math.sign(lat), nx = c.x - E.uz * sg * BARANDA.lat, nz = c.z + E.ux * sg * BARANDA.lat;
    if (SOL.penetra(nx, nz, S.pos.y) || SOL.penetra(nx, nz, base)) return false;
    S.pos.x = nx; S.pos.z = nz;
    M.vx = M.vz = 0; M.grounded = false; S.vy = Math.min(S.vy, 0);
    if (F.soltarAtasco) F.soltarAtasco(); // que la red de desatasco no la vuelva a subir a la soga
    BARANDA.veces++;
    return true;
  }
  // Entrada recta (juego de niño): con W sola o el joystick hacia delante, desde la orilla se iba recto contra el estribo, un poste o
  // una soga del anclaje si no venía justo por el eje (había que corregir con W+D). Caminando hacia el puente (lo pedido apunta
  // al tablero, a menos de ~50°) en los últimos 9 m de cada orilla y sobre el tablero, se la acerca al eje de lado
  // (2,2 m/s como mucho, nunca metiéndola más en un sólido). Volando, nadando o alejándose del puente no hace nada.
  const EMBUDO = { orilla: 9, lat: 3, v: 2.2, veces: 0 };
  const _w = { x: 0, z: 0 }, _st0 = { x: 0, y: 0 };
  function pedido() {
    const k = G.input && G.input.keys, st = (G.input && G.input.stick) || _st0;
    let ix = st.x || 0, iz = st.y || 0;
    if (k) { if (k.has('w') || k.has('arrowup')) iz -= 1; if (k.has('s') || k.has('arrowdown')) iz += 1; if (k.has('a') || k.has('arrowleft')) ix -= 1; if (k.has('d') || k.has('arrowright')) ix += 1; }
    const yaw = G.camara.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const mx = rx * ix - fx * iz, mz = rz * ix - fz * iz, l = Math.hypot(mx, mz);
    if (!(l > 0.12)) return null;
    _w.x = mx / l; _w.z = mz / l; return _w;
  }
  function encauzar(dt, M) {
    const SOL = G.solidos && G.solidos.activo ? G.solidos : null, E = P.eje;
    if (!M || M.flying || M.swimming || !M.grounded) return false;
    const w = pedido(); if (!w) return false;
    const dx = S.pos.x - E.ax, dz = S.pos.z - E.az, sv = dx * E.ux + dz * E.uz, lat = -dx * E.uz + dz * E.ux;
    // en las orillas, solo yendo hacia el puente; sobre el tablero, en los dos sentidos y solo lejos del centro (|lado| > 0,25 m):
    // con la cámara un poco torcida, se iba pegada a la baranda y se quedaba trabada en una péndola (s ≈ 6 y 18,5)
    const al = w.x * E.ux + w.z * E.uz, sobre = sv >= 1 && sv <= E.L - 1;
    const hacia = sobre ? Math.sign(al) : sv > -EMBUDO.orilla && sv < 1 ? 1 : sv > E.L - 1 && sv < E.L + EMBUDO.orilla ? -1 : 0;
    if (!hacia || Math.abs(lat) > EMBUDO.lat || Math.abs(lat) < (sobre ? 0.25 : 0.04)) return false;
    if (al * hacia < 0.64) return false;
    const sg = Math.sign(lat), d = Math.min(Math.abs(lat), EMBUDO.v * dt), nx = S.pos.x + E.uz * sg * d, nz = S.pos.z - E.ux * sg * d;
    if (SOL && SOL.penetra(nx, nz, S.pos.y) > SOL.penetra(S.pos.x, S.pos.z, S.pos.y)) return false;
    S.pos.x = nx; S.pos.z = nz; EMBUDO.veces++;
    return true;
  }
  function paso(dt) {
    if (!P.eje || !reparado()) return;
    const M = G.fisica && G.fisica.MOVE;
    if (!bajarBaranda(dt, M) && !encauzar(dt, M)) rodeo(dt, M);
    const c = centroFijo(), d = Math.hypot(S.pos.x - c.x, S.pos.z - c.z);
    if (d < 60 && (CORR.fxT -= dt) <= 0) { CORR.fxT = 0.45; try { G.fx.burst(c.x + (Math.random() - 0.5) * 3, c.y + 1 + Math.random() * 6, c.z + (Math.random() - 0.5) * 3, 'leaves', 2); } catch (e) { /* sin fx */ } }
    if (!M || d > CORR.r) return;
    if (!M.flying) {
      if ((CORR.pistaT -= dt) <= 0) { CORR.pistaT = 12; toast('Vuela aquí, en el centro del puente: la corriente te sube.'); }
      return;
    }
    if (S.pos.y >= c.y + CORR.alto) return;
    const lim = (M.techoVuelo || Infinity) - 1;
    S.pos.y = Math.min(S.pos.y + CORR.sube * dt, Math.max(S.pos.y, lim));
    if (S.vy < 0) S.vy = 0;
    if (!CORR.avisada) { CORR.avisada = true; sonar('viento'); toast('¡Corriente del puente! Sube y planea lejos.'); }
  }

  // Árboles en el paso de las cabeceras (QA-172, juego de niño): un tabonuco 7 m detrás de la cabecera A, en el eje, frenaba a quien
  // llega andando recto desde Villa Raíz, y en la cabecera B una palma joven crece entre el tablero y el estribo. Con el puente
  // reparado se quitan del bosque, en marcha (G.vegetacion.despejar, solo con la V18.1), los que tienen el pie en el pasillo del
  // eje (±2 m) de 12 m detrás de A hasta el tablero y del tablero hasta 12 m detrás de B. El resto del bosque no cambia.
  const PASO_LIBRE = { a: -12, b: 12, lat: 2, hecho: false, n: 0 };
  function despejarPaso() {
    const V = G.vegetacion, E = P.eje;
    if (PASO_LIBRE.hecho || !E || !reparado() || !V || !V.despejar || !V.instancias || !Object.keys(V.instancias).length) return 0;
    PASO_LIBRE.hecho = true;
    const enPaso = (x, z) => {
      const dx = x - E.ax, dz = z - E.az, sv = dx * E.ux + dz * E.uz, lat = Math.abs(-dx * E.uz + dz * E.ux);
      return lat < PASO_LIBRE.lat && ((sv > PASO_LIBRE.a && sv < 0.5) || (sv > E.L - 0.5 && sv < E.L + PASO_LIBRE.b));
    };
    const q = [punto(PASO_LIBRE.a / E.L, -3), punto(PASO_LIBRE.a / E.L, 3), punto((E.L + PASO_LIBRE.b) / E.L, -3), punto((E.L + PASO_LIBRE.b) / E.L, 3)];
    PASO_LIBRE.n = V.despejar(Math.min(...q.map(o => o.x)), Math.min(...q.map(o => o.z)), Math.max(...q.map(o => o.x)), Math.max(...q.map(o => o.z)), enPaso);
    return PASO_LIBRE.n;
  }

  // ---------- Aplicar el estado guardado ----------
  function aplicar() {
    if (!buscarPiso()) return false;
    ponerInteraccion(); ponerMaderas(); ponerMateriales(); ponerCabeceras(); despejarPaso(); sincronizar();
    pintar();
    return true;
  }
  let intentos = 0;
  function esperar() {
    if (aplicar() && P.rotoIdx) return;
    if (++intentos < 120) setTimeout(esperar, 500);
  }
  Promise.resolve(G.mundo && G.mundo.listo).then(esperar, esperar);
  Promise.resolve(G.vegetacion && G.vegetacion.listo).then(() => { if (P.eje) despejarPaso(); }, () => {});
  G.on('apply', () => setTimeout(aplicar, 0), 95);
  G.on('v18', ev => { if (ev && ev.tipo === 'mundo' && ev.id === ID) aplicar(); else if (ev && ev.tipo === 'recompensa') sincronizar(); });
  G.on('update', (dt, busy) => { if (!busy) paso(dt); }, 46);
  G.on('update', () => { avisarPuerto(); }, 47);

  // ---------- Cruce a pie con el motor de movimiento (para la prueba; no teletransporta por el camino) ----------
  // Pone a Vittata en la orilla, a `desde` m de la cabecera A por el eje (negativo: hacia Villa Raíz), y camina con W y la
  // cámara mirando al eje 1,2 m por delante (como quien apunta al otro lado), con G.fisica.step y el paso de este módulo,
  // hasta pasar `hasta` (m desde A) o agotar los pasos. Devuelve si llegó sin nadar, sin volar y sin rescate de atasco.
  async function cruzarAPie(desde, hasta, maxPasos) {
    const F = G.fisica, M = F.MOVE, E = P.eje, SOL = G.solidos, keys = G.input.keys, sgn = Math.sign(hasta - desde) || 1;
    const guard = { x: S.pos.x, y: S.pos.y, z: S.pos.z, vy: S.vy, flying: M.flying, swimming: M.swimming, grounded: M.grounded, vx: M.vx, vz: M.vz, yaw: G.camara.yaw, w: keys.has('w') };
    const terminar = () => { try { if (SOL && SOL.terminar) SOL.terminar(); } catch (e) { /* sin sólidos */ } };
    const r = { ok: false, pasos: 0, nado: false, volo: false, rescates: 0, minY: Infinity, s: desde, traza: [] };
    try {
      const p0 = punto(desde / E.L);
      S.pos.x = p0.x; S.pos.z = p0.z; S.vy = 0;
      terminar();
      S.pos.y = F.suelo(p0.x, p0.z, T.height(p0.x, p0.z) + 0.5);
      M.flying = false; M.swimming = false; M.grounded = true; M.vx = M.vz = 0;
      const d0 = M.desatascos || 0;
      keys.add('w');
      for (let k = 0; k < (maxPasos || 1500); k++) {
        const dx = S.pos.x - E.ax, dz = S.pos.z - E.az, sv = dx * E.ux + dz * E.uz;
        r.s = sv;
        if ((hasta - sv) * sgn < 0) { r.ok = true; break; }
        const obj = punto((sv + sgn * 1.2) / E.L);
        G.camara.yaw = Math.atan2(-(obj.x - S.pos.x), -(obj.z - S.pos.z));
        F.step(0.05, false); paso(0.05);
        r.pasos = k + 1;
        if (M.swimming) r.nado = true;
        if (M.flying) r.volo = true;
        r.minY = Math.min(r.minY, S.pos.y);
        if (k % 20 === 0) r.traza.push(sv.toFixed(1) + '/' + (-dx * E.uz + dz * E.ux).toFixed(1) + '/' + S.pos.y.toFixed(2));
        if (k % 40 === 39) terminar();
      }
      r.rescates = (M.desatascos || 0) - d0;
    } finally {
      if (!guard.w) keys.delete('w');
      Object.assign(S.pos, { x: guard.x, y: guard.y, z: guard.z }); S.vy = guard.vy;
      Object.assign(M, { flying: guard.flying, swimming: guard.swimming, grounded: guard.grounded, vx: guard.vx, vz: guard.vz });
      G.camara.yaw = guard.yaw;
    }
    r.ok = r.ok && !r.nado && !r.volo && !r.rescates;
    return r;
  }
  const textoCruce = r => (r.ok ? 'llega' : 'no llega') + ' en ' + r.pasos + ' pasos de 0,05 s · s=' + r.s.toFixed(1) + ' · y mín ' + r.minY.toFixed(2) +
    (r.nado ? ' · nadó' : '') + (r.volo ? ' · voló' : '') + (r.rescates ? ' · rescates ' + r.rescates : '') + (r.ok ? '' : ' · ' + r.traza.slice(-6).join(' '));

  // Como un niño con W sola: sale de (desde, lado) con la cámara fija mirando al otro lado con un error de `giro` rad, sin
  // corregir nada, y camina con G.fisica.step y el paso de este módulo hasta pasar `hasta`. Devuelve lo mismo que cruzarAPie.
  async function andarRecto(desde, lado, hasta, giro, maxPasos) {
    const F = G.fisica, M = F.MOVE, E = P.eje, SOL = G.solidos, keys = G.input.keys, sgn = Math.sign(hasta - desde) || 1;
    const guard = { x: S.pos.x, y: S.pos.y, z: S.pos.z, vy: S.vy, flying: M.flying, swimming: M.swimming, grounded: M.grounded, vx: M.vx, vz: M.vz, yaw: G.camara.yaw, w: keys.has('w') };
    const r = { ok: false, pasos: 0, nado: false, volo: false, rescates: 0, minY: Infinity, s: desde, traza: [] };
    try {
      const p0 = punto(desde / E.L, lado);
      S.pos.x = p0.x; S.pos.z = p0.z; S.vy = 0;
      try { if (SOL && SOL.terminar) SOL.terminar(); } catch (e) { /* sin sólidos */ }
      S.pos.y = F.suelo(p0.x, p0.z, T.height(p0.x, p0.z) + 0.5);
      M.flying = false; M.swimming = false; M.grounded = true; M.vx = M.vz = 0;
      G.camara.yaw = Math.atan2(-E.ux * sgn, -E.uz * sgn) + (giro || 0);
      const d0 = M.desatascos || 0;
      keys.add('w');
      for (let k = 0; k < (maxPasos || 900); k++) {
        const dx = S.pos.x - E.ax, dz = S.pos.z - E.az, sv = dx * E.ux + dz * E.uz;
        r.s = sv;
        if ((hasta - sv) * sgn < 0) { r.ok = true; break; }
        F.step(0.05, false); paso(0.05);
        r.pasos = k + 1;
        if (M.swimming) r.nado = true;
        if (M.flying) r.volo = true;
        r.minY = Math.min(r.minY, S.pos.y);
        if (k % 20 === 0) r.traza.push(sv.toFixed(1) + '/' + (-dx * E.uz + dz * E.ux).toFixed(1) + '/' + S.pos.y.toFixed(2));
      }
      r.rescates = (M.desatascos || 0) - d0;
    } finally {
      if (!guard.w) keys.delete('w');
      Object.assign(S.pos, { x: guard.x, y: guard.y, z: guard.z }); S.vy = guard.vy;
      Object.assign(M, { flying: guard.flying, swimming: guard.swimming, grounded: guard.grounded, vx: guard.vx, vz: guard.vz });
      G.camara.yaw = guard.yaw;
    }
    r.ok = r.ok && !r.nado && !r.volo && !r.rescates;
    return r;
  }
  // Posada encima de una baranda del tablero (a `s` m de A, del lado `sg`): con el joystick hacia delante 2 s, ¿baja al tablero y avanza?
  function bajaDeBaranda(sv, sg) {
    const F = G.fisica, M = F.MOVE, E = P.eje, st = G.input.stick;
    const guard = { x: S.pos.x, y: S.pos.y, z: S.pos.z, vy: S.vy, flying: M.flying, swimming: M.swimming, grounded: M.grounded, vx: M.vx, vz: M.vz, yaw: G.camara.yaw, sx: st.x, sy: st.y };
    const r = { encima: false, baja: false, avanza: 0, y0: 0, y1: 0, deck: 0 };
    try {
      const c = punto(sv / E.L), deck = F.suelo(c.x, c.z, deckY(sv / E.L) + 0.3);
      let mejor = null;
      for (let l = 0.6; l <= 1.3; l += 0.05) { const q = punto(sv / E.L, sg * l), y = F.suelo(q.x, q.z, deck + 2.2); if (y > deck + 0.3 && (!mejor || y < mejor.y)) mejor = { q, y }; }
      if (!mejor) return r;
      Object.assign(S.pos, { x: mejor.q.x, y: mejor.y, z: mejor.q.z }); S.vy = 0;
      M.flying = false; M.swimming = false; M.grounded = true; M.vx = M.vz = 0;
      F.step(0.05, false);
      r.deck = deck; r.y0 = S.pos.y; r.encima = S.pos.y > deck + 0.3;
      G.camara.yaw = Math.atan2(-E.ux, -E.uz); st.x = 0; st.y = -0.9;
      for (let k = 0; k < 40; k++) { F.step(0.05, false); paso(0.05); }
      const dx = S.pos.x - E.ax, dz = S.pos.z - E.az, s1 = dx * E.ux + dz * E.uz, c1 = punto(s1 / E.L);
      r.y1 = S.pos.y; r.deck = F.suelo(c1.x, c1.z, S.pos.y); r.baja = S.pos.y < r.deck + 0.25; r.avanza = s1 - sv;
    } finally {
      st.x = guard.sx; st.y = guard.sy;
      Object.assign(S.pos, { x: guard.x, y: guard.y, z: guard.z }); S.vy = guard.vy;
      Object.assign(M, { flying: guard.flying, swimming: guard.swimming, grounded: guard.grounded, vx: guard.vx, vz: guard.vz });
      G.camara.yaw = guard.yaw;
    }
    return r;
  }

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const clave = V.clave();
    let crudo = null; try { crudo = localStorage.getItem(clave); } catch (e) { /* sin almacenamiento */ }
    const invOrig = Object.assign({}, S.inv);
    const toasts = [], toastOrig = G.ui.toast;
    G.ui.toast = (t, ms) => { toasts.push(String(t)); return toastOrig.call(G.ui, t, ms); };
    const ponerInv = (m, p) => { S.inv.madera = m; S.inv.piedra = p; };
    const dosVias = t => /duelo de la explanada/.test(t) && /junta madera y piedra por el bosque/.test(t);
    try {
      for (let i = 0; i < 60 && !(aplicar() && P.rotoIdx); i++) await new Promise(r => setTimeout(r, 250));
      check('Encuentra el puente real (piso y malla)', P.piso && P.malla && P.ocultos > 20, 'triángulos del centro: ' + P.ocultos);
      // limpio: sin materiales, puente sin cambiar
      V.borrar(); aplicar(); ponerInv(0, 0);
      const c = centro(), idx = () => P.malla.geometry.index.array;
      const igual = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
      check('Roto por defecto: estado, tablas del centro ocultas y el piso no sostiene',
        estado() === 'roto' && igual(idx(), P.rotoIdx) && !igual(idx(), P.idx0) && P.piso.when() === false);
      if (G.dialogo && G.dialogo.open && G.dialogo.open() && G.dialogo.clear) G.dialogo.clear();
      if (G.ui && G.ui.cardOpen && G.ui.hideCard) G.ui.hideCard();
      for (const id of ['creator', 'comic', 'end']) { const e = document.getElementById(id); if (e) e.hidden = true; }
      pistaPuerto = false; toasts.length = 0;
      const dijoPuerto = avisarPuerto();
      check('CG-124 · con el puente roto, desde el inicio, la pista abre el Puerto de La Mina con Tuerca, el Constructor y la Ingeniera',
        dijoPuerto && toasts.some(t => /puente de Villa Raíz/.test(t) && /Puerto de La Mina/.test(t) && /Tuerca/.test(t) && /Constructor/.test(t) && /Ingeniera/.test(t)), toasts.join(' | '));
      toasts.length = 0;
      check('CG-124 · la pista sale una sola vez', !avisarPuerto() && toasts.length === 0);
      const sinPiso = T.plataformas.filter(p => p.id === 'puente' && (!p.when || p.when())).length === 0;
      check('Roto: no hay piso activo del puente ni corriente', sinPiso && !enCorriente(c.x, c.z, c.y + 1));
      const rotoPie = await cruzarAPie(-6.5, 3, 400);
      check('Roto: las rampas de las cabeceras no sostienen y a pie no se sube al puente', cabeceras.rampas.length === 4 && cabeceras.rampas.every(r => !r.when()) && rotoPie.s < -0.5, textoCruce(rotoPie));
      check('Interacción visible junto al puente con el coste en madera y piedra', itReparar && itReparar.visible() && /2 maderas \+ 1 piedra/.test(itReparar.label()) && !/pluma/.test(itReparar.label()), itReparar && itReparar.label());
      // QA-192: fuera del cap. 1 ni recogibles ni reparación ni corriente (el puente V18 es de Villa Raíz)
      try {
        const pack0 = G.pack && G.pack.id; G.pack.id = 'ep4';
        try {
          sincronizar();
          check('QA-192: fuera del cap. 1 el puente V18 no ofrece nada',
            !itReparar.visible() && maderas.every(M => !M.g.visible && !M.it.visible()) && materiales.every(R => !R.g.visible && !R.it.visible()) && !enCorriente(c.x, c.z, c.y + 1));
        } finally { G.pack.id = pack0; sincronizar(); }
      } catch (e) { check('QA-192: fuera del cap. 1 el puente V18 no ofrece nada', false, e && e.message); }
      toasts.length = 0;
      check('Sin materiales no repara y el aviso nombra las dos vías (duelo o juntar por el bosque)',
        reparar() === false && estado() === 'roto' && toasts.some(t => dosVias(t) && /2 maderas y 1 piedra/.test(t)), toasts.join(' | '));
      // con una pluma de rival (lo que antes pedía) sigue sin repararse: ya no cuenta
      V.otorgar('prueba_b', 'pluma_rival', 1); toasts.length = 0;
      check('La pluma de rival ya no paga el puente', reparar() === false && estado() === 'roto' && toasts.some(dosVias));
      // materiales a medias: 2 maderas sin piedra, y 1 madera + 1 piedra
      ponerInv(2, 0); toasts.length = 0;
      const r1 = reparar();
      ponerInv(1, 1);
      const r2 = reparar();
      check('Con materiales a medias no repara ni cobra', !r1 && !r2 && estado() === 'roto' && inv('madera') === 1 && inv('piedra') === 1 && toasts.filter(dosVias).length === 2, toasts.join(' | '));
      // los recursos recolectables del cap. 1 dan madera y piedra al mismo S.inv (G.objetos)
      const rec = (G.objetos && G.objetos.recursos) || [];
      const tipos = t => rec.filter(r => r.tipo === t);
      const lejos = t => tipos(t).reduce((m, r) => Math.min(m, Math.hypot(r.x - c.x, r.z - c.z)), Infinity);
      check('Hay madera y piedra recolectables en el mundo (G.objetos, S.inv)', tipos('madera').length >= 2 && tipos('piedra').length >= 1 && G.objetos.has({ madera: 1, piedra: 1 }),
        tipos('madera').length + ' maderas a ' + lejos('madera').toFixed(0) + ' m y ' + tipos('piedra').length + ' piedras a ' + lejos('piedra').toFixed(0) + ' m del centro del puente');
      // maderas en la orilla, recogidas con Acción: van a S.inv.madera, una sola vez
      ponerInv(0, 0);
      check('Hay 2 maderas del puente en la orilla', maderas.length === 2 && maderas.every(M => M.g.visible && M.it.visible()));
      const qa162 = { n: 0, inm: 0 }, save0 = G.guardado && G.guardado.save;
      if (save0) G.guardado.save = function (f) { qa162.n++; if (f === true) qa162.inm++; return save0.apply(this, arguments); };
      maderas.forEach(M => M.it.use());
      if (save0) G.guardado.save = save0;
      check('Recoger la orilla da 1 madera de S.inv cada una, una sola vez', !recoger(maderas[0]) && inv('madera') === 2 && maderas.every(M => !M.g.visible && !M.it.visible()), 'madera ' + inv('madera'));
      check('QA-162: recoger guarda la partida al momento (save inmediato, no solo autosave)', !save0 || (qa162.n >= 1 && qa162.inm >= 1), JSON.stringify(qa162));
      // una piedra del bosque y una madera de sobra (debe quedar)
      S.inv.piedra = 1; S.inv.madera += 1;
      toasts.length = 0;
      qa162.n = 0; qa162.inm = 0;
      if (save0) G.guardado.save = function (f) { qa162.n++; if (f === true) qa162.inm++; return save0.apply(this, arguments); };
      const ok = reparar();
      if (save0) G.guardado.save = save0;
      check('Con materiales repara y descuenta exactamente 2 maderas y 1 piedra', ok && estado() === 'reparado' && inv('madera') === 1 && inv('piedra') === 0 && V.cuantos('pluma_rival') === 1,
        'madera ' + inv('madera') + ', piedra ' + inv('piedra') + ', pluma ' + V.cuantos('pluma_rival'));
      check('QA-162: pagar la reparación guarda la partida al momento', !save0 || (qa162.n >= 1 && qa162.inm >= 1), JSON.stringify(qa162));
      check('Reparado: vuelve el tablero completo y el piso sostiene', igual(idx(), P.idx0) && P.piso.when() === true && !itReparar.visible() && toasts.some(t => /Puente reparado/.test(t)));
      const top = T.platformTop(P.piso, c.x, c.z);
      check('Utilidad: se cruza a pie (piso en el centro sobre el río)', top === top && Math.abs(top - c.y) < 0.2, 'top ' + top + ' / ' + c.y.toFixed(2));
      // QA-172: de orilla a orilla caminando (motor de movimiento), desde la orilla de Villa Raíz y de vuelta
      const ida = await cruzarAPie(-6.5, P.eje.L + 5);
      check('Utilidad: caminando desde la cabecera de Villa Raíz se llega a la otra orilla (sin volar, nadar ni rescate)', ida.ok, textoCruce(ida));
      const vuelta = await cruzarAPie(P.eje.L + 6.5, -5);
      check('Utilidad: y caminando de vuelta se llega a la orilla de Villa Raíz', vuelta.ok, textoCruce(vuelta));
      // Juego de niño: W sola, sin venir por el eje y con la cámara algo torcida, desde las dos cabeceras
      const rectos = [];
      for (const [lado, giro] of [[0.9, 0.15], [-0.9, -0.15], [1.5, 0], [0, -0.25]]) {
        rectos.push(['A', lado, giro, await andarRecto(-8, lado, P.eje.L + 2, giro)]);
        rectos.push(['B', lado, giro, await andarRecto(P.eje.L + 8, lado, -2, giro)]);
      }
      const malos = rectos.filter(x => !x[3].ok);
      check('Juego de niño: con W sola (sin venir por el eje y la cámara hasta 14° torcida) se cruza desde las dos cabeceras', !malos.length,
        rectos.length - malos.length + '/' + rectos.length + (malos.length ? ' · ' + malos.map(x => x[0] + ' lado ' + x[1] + ' giro ' + x[2] + ': ' + textoCruce(x[3])).join(' | ') : ''));
      const quitadoPaso = (() => { const V = G.vegetacion, E = P.eje; let n = 0; if (!V || !V.instancias) return -1; for (const m in V.instancias) { const PM = V.instancias[m]; for (let i = 0; i < PM.n; i++) { const dx = PM.pos[i * 4] - E.ax, dz = PM.pos[i * 4 + 2] - E.az, sv = dx * E.ux + dz * E.uz, lat = Math.abs(-dx * E.uz + dz * E.ux); if (lat < PASO_LIBRE.lat && ((sv > PASO_LIBRE.a && sv < 0.5) || (sv > E.L - 0.5 && sv < E.L + PASO_LIBRE.b))) n++; } } return n; })();
      check('Reparado: ningún árbol en el paso de las cabeceras (el de la cabecera B y el del eje detrás de A, quitados solo con la V18.1)', PASO_LIBRE.hecho && PASO_LIBRE.n > 0 && quitadoPaso === 0, 'quitados ' + PASO_LIBRE.n + ' · quedan ' + quitadoPaso);
      const bar = [bajaDeBaranda(6, 1), bajaDeBaranda(15, -1)];
      check('Posada en una baranda del puente, el joystick hacia delante la baja al tablero y sigue', bar.every(b => b.encima && b.baja && b.avanza > 2),
        bar.map(b => 'encima ' + b.encima + ' y ' + b.y0.toFixed(2) + '→' + b.y1.toFixed(2) + ' (tablero al final ' + b.deck.toFixed(2) + ') avanza ' + b.avanza.toFixed(1)).join(' | '));
      // corriente: volando en el centro sube
      const M = G.fisica.MOVE, guard = { x: S.pos.x, y: S.pos.y, z: S.pos.z, flying: M.flying, vy: S.vy };
      S.pos.x = c.x; S.pos.z = c.z; S.pos.y = c.y + 3; M.flying = true; S.vy = 0;
      const y0 = S.pos.y; paso(0.5);
      const subio = S.pos.y - y0;
      Object.assign(S.pos, { x: guard.x, y: guard.y, z: guard.z }); M.flying = guard.flying; S.vy = guard.vy;
      check('Utilidad: la corriente del centro sube a Vittata volando', enCorriente(c.x, c.z, c.y + 3) && subio > 3, 'subió ' + subio.toFixed(2) + ' m');
      // recarga: sigue reparado y no vuelve a cobrar (aunque haya materiales de sobra)
      V.recargar(); P.malla.geometry.index.array.set(P.rotoIdx); aplicar();
      check('Tras recargar y volver a aplicar sigue reparado (malla, piso y estado)', estado() === 'reparado' && igual(idx(), P.idx0) && P.piso.when() === true);
      ponerInv(5, 5); toasts.length = 0;
      check('Tras recargar no vuelve a cobrar', reparar() === false && inv('madera') === 5 && inv('piedra') === 5 && maderas.every(M => !M.g.visible && !recoger(M)));
      let guardado = null; try { guardado = JSON.parse(localStorage.getItem(clave)); } catch (e) { /* sin almacenamiento */ }
      check('Evidencia de guardado: <almacen>.v18 tiene mundo.puente_villa = reparado', guardado && guardado.mundo && guardado.mundo[ID] === 'reparado', clave);

      // ---- Materiales sin pelear (decisión 9): piedras y fibras recogibles (BM148) cerca de Villa Raíz y del puente ----
      V.borrar(); aplicar(); ponerInv(0, 0); toasts.length = 0;
      for (let i = 0; i < 40 && materiales.some(R => !R.modelo); i++) await new Promise(r => setTimeout(r, 250));
      const cuenta = t => materiales.filter(R => R.tipo === t).length;
      const L = (T.mapa && T.mapa.lugares) || {}, vi = L.villa;
      const dist = R => Math.round(Math.min(Math.hypot(R.x - c.x, R.z - c.z), vi ? Math.hypot(R.x - vi.x, R.z - vi.z) : Infinity));
      check('Hay 2 piedras y 2 fibras recogibles (modelos BM148) visibles cerca de Villa Raíz y del puente',
        cuenta('piedra') === 2 && cuenta('fibra') === 2 && materiales.every(R => R.g.visible && R.it.visible() && R.modelo === 'glb' && R.g.children.length && dist(R) < 90),
        materiales.map(R => R.tipo + ' ' + R.modelo + ' a ' + dist(R) + ' m').join(', '));
      check('Cada recogible está en suelo seco (fuera del agua)', materiales.every(R => !(G.agua && G.agua.levelAt(R.x, R.z) > R.y - 0.2)));
      const piedra1 = materiales.find(R => R.tipo === 'piedra'), fibra1 = materiales.find(R => R.tipo === 'fibra');
      piedra1.it.use(); fibra1.it.use();
      check('Recoger suma al inventario de siempre: piedra → S.inv.piedra, fibra → S.inv.madera, con aviso corto',
        inv('piedra') === 1 && inv('madera') === 1 && !piedra1.g.visible && !fibra1.it.visible() && toasts.some(t => t === '+1 piedra') && toasts.some(t => /^\+1 fibra/.test(t)) && toasts.filter(t => /^\+1/.test(t)).every(t => t.length < 40),
        'madera ' + inv('madera') + ', piedra ' + inv('piedra') + ' · ' + toasts.join(' | '));
      check('Recoger otra vez no suma', !recogerMaterial(piedra1) && !recogerMaterial(fibra1) && inv('piedra') === 1 && inv('madera') === 1);
      V.recargar(); aplicar();
      check('Tras recargar siguen recogidos (marca en G.v18) y no se repiten', V.mundo(piedra1.key) === 'recogida' && V.mundo(fibra1.key) === 'recogida' && !piedra1.g.visible && !piedra1.it.visible() && !recogerMaterial(piedra1) && !recogerMaterial(fibra1) && inv('piedra') === 1 && inv('madera') === 1);
      // el puente se paga sin pelear: 1 piedra recogida + 1 fibra + 1 madera de la orilla, sin el duelo
      maderas[0].it.use();
      toasts.length = 0;
      const sinPelear = !V.otorgado('combate_1') && reparar();
      check('El puente se paga sin pelear (piedra y fibra recogidas + madera de la orilla), sin el premio del duelo',
        sinPelear && estado() === 'reparado' && inv('madera') === 0 && inv('piedra') === 0 && !V.otorgado('combate_1'), 'madera ' + inv('madera') + ', piedra ' + inv('piedra'));
      pistaPuerto = false; toasts.length = 0;
      check('CG-124 · con el puente reparado la pista no sale', !avisarPuerto() && !toasts.some(t => /Puerto de La Mina/.test(t)));
      const resto = materiales.filter(R => !cogida(R));
      check('Con el puente reparado, los demás recogibles siguen en el mundo', resto.length === 2 && resto.every(R => R.g.visible && R.it.visible()));
    } catch (e) { check('Sin excepciones', false, e && e.stack); }
    G.ui.toast = toastOrig;
    Object.assign(S.inv, invOrig); refrescarInv();
    try { if (crudo == null) localStorage.removeItem(clave); else localStorage.setItem(clave, crudo); } catch (e) { /* sin almacenamiento */ }
    V.recargar(); aplicar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18Reparar = { ID, COSTE, estado, reparar, faltan, enCorriente, aplicar, maderas, materiales, recogerMaterial, P, cabeceras, cruzarAPie, andarRecto, bajaDeBaranda, PASO_LIBRE, BARANDA, EMBUDO, paso, test };
  return G.v18Reparar;
};
