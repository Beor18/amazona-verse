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
  const sonar = n => { try { G.audio.play(n); } catch (e) { /* sin audio */ } };
  const estado = () => V.mundo(ID) || 'roto';
  const reparado = () => estado() === 'reparado';

  // ---------- El puente real: piso (eje y comba) y malla ----------
  const P = { piso: null, malla: null, idx0: null, rotoIdx: null, ocultos: 0, eje: null };
  function buscarPiso() {
    if (P.piso && T.plataformas.indexOf(P.piso) >= 0) return P.piso;
    const pl = T.plataformas.find(p => p.id === 'puente' && p.tipo === 'puente');
    if (!pl) return null;
    P.piso = pl;
    const previo = pl.when;
    pl.when = () => reparado() && (!previo || previo());
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
      M.it = G.interaccion.add({ id: 'v18_' + key, x: p.x, z: p.z, r: 2.2, visible: () => !reparado() && !cogida(M),
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
  function sincronizar() { for (const M of maderas) M.g.visible = !reparado() && !cogida(M); for (const R of materiales) R.g.visible = !cogida(R); }

  // ---------- Materiales sin pelear (decisión 9 de Kelvin: también se consiguen explorando) ----------
  // BM148: piedra_recogible.glb y fibra_recogible.glb (assets/models/mapa, copia base64 AV_MAPA_B64.<nombre> en _glb.js).
  // Dos piedras y dos fibras: una de cada junto a la cabecera del puente (lado de Villa Raíz) y otra de cada en el camino
  // de Villa Raíz al puente. Cada una se recoge una sola vez (G.v18.mundo['v18_<clave>'] = 'recogida', se guarda al momento).
  // La piedra suma a S.inv.piedra. La fibra suma a S.inv.madera: el inventario de siempre no tiene «fibra» y la fibra sirve
  // para atar las tablas, así que cuenta como material de madera (nada de tipo nuevo en S.inv, en el HUD ni en el guardado).
  // Siguen ahí con el puente ya reparado: son del mundo (sirven también para el refugio del cap. 1). Siempre con ?v18=1.
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
      R.it = G.interaccion.add({ id: 'v18_recogible_' + k, x: p.x, z: p.z, r: 2.2, visible: () => !cogida(R), label: () => TIPOS[tipo].label, use: () => recogerMaterial(R) });
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
    itReparar = G.interaccion.add({ id: 'v18_reparar_puente', x: p.x, z: p.z, r: 3.2, visible: () => !reparado(),
      label: () => 'Reparar el puente: 2 maderas + 1 piedra', use: reparar });
  }

  // ---------- Corriente del puente (solo reparado): volando, sube hasta 28 m sobre el tablero ----------
  const CORR = { r: 3.6, alto: 28, sube: 9, avisada: false, pistaT: 0, fxT: 0 };
  function enCorriente(x, z, y) {
    if (!reparado() || !P.eje) return false;
    const c = centro();
    return Math.hypot(x - c.x, z - c.z) < CORR.r && (y == null || y < c.y + CORR.alto);
  }
  function paso(dt) {
    if (!P.eje || !reparado()) return;
    const c = centro(), M = G.fisica && G.fisica.MOVE, d = Math.hypot(S.pos.x - c.x, S.pos.z - c.z);
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

  // ---------- Aplicar el estado guardado ----------
  function aplicar() {
    if (!buscarPiso()) return false;
    ponerInteraccion(); ponerMaderas(); ponerMateriales(); sincronizar();
    pintar();
    return true;
  }
  let intentos = 0;
  function esperar() {
    if (aplicar() && P.rotoIdx) return;
    if (++intentos < 120) setTimeout(esperar, 500);
  }
  Promise.resolve(G.mundo && G.mundo.listo).then(esperar, esperar);
  G.on('apply', () => setTimeout(aplicar, 0), 95);
  G.on('v18', ev => { if (ev && ev.tipo === 'mundo' && ev.id === ID) aplicar(); else if (ev && ev.tipo === 'recompensa') sincronizar(); });
  G.on('update', (dt, busy) => { if (!busy) paso(dt); }, 46);

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
      const sinPiso = T.plataformas.filter(p => p.id === 'puente' && (!p.when || p.when())).length === 0;
      check('Roto: no hay piso activo del puente ni corriente', sinPiso && !enCorriente(c.x, c.z, c.y + 1));
      check('Interacción visible junto al puente con el coste en madera y piedra', itReparar && itReparar.visible() && /2 maderas \+ 1 piedra/.test(itReparar.label()) && !/pluma/.test(itReparar.label()), itReparar && itReparar.label());
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
      maderas.forEach(M => M.it.use());
      check('Recoger la orilla da 1 madera de S.inv cada una, una sola vez', !recoger(maderas[0]) && inv('madera') === 2 && maderas.every(M => !M.g.visible && !M.it.visible()), 'madera ' + inv('madera'));
      // una piedra del bosque y una madera de sobra (debe quedar)
      S.inv.piedra = 1; S.inv.madera += 1;
      toasts.length = 0;
      const ok = reparar();
      check('Con materiales repara y descuenta exactamente 2 maderas y 1 piedra', ok && estado() === 'reparado' && inv('madera') === 1 && inv('piedra') === 0 && V.cuantos('pluma_rival') === 1,
        'madera ' + inv('madera') + ', piedra ' + inv('piedra') + ', pluma ' + V.cuantos('pluma_rival'));
      check('Reparado: vuelve el tablero completo y el piso sostiene', igual(idx(), P.idx0) && P.piso.when() === true && !itReparar.visible() && toasts.some(t => /Puente reparado/.test(t)));
      const top = T.platformTop(P.piso, c.x, c.z);
      check('Utilidad: se cruza a pie (piso en el centro sobre el río)', top === top && Math.abs(top - c.y) < 0.2, 'top ' + top + ' / ' + c.y.toFixed(2));
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
        inv('piedra') === 1 && inv('madera') === 1 && !piedra1.g.visible && !fibra1.it.visible() && toasts.some(t => t === '+1 piedra') && toasts.some(t => /^\+1 fibra/.test(t)) && toasts.every(t => t.length < 40),
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
      const resto = materiales.filter(R => !cogida(R));
      check('Con el puente reparado, los demás recogibles siguen en el mundo', resto.length === 2 && resto.every(R => R.g.visible && R.it.visible()));
    } catch (e) { check('Sin excepciones', false, e && e.stack); }
    G.ui.toast = toastOrig;
    Object.assign(S.inv, invOrig); refrescarInv();
    try { if (crudo == null) localStorage.removeItem(clave); else localStorage.setItem(clave, crudo); } catch (e) { /* sin almacenamiento */ }
    V.recargar(); aplicar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18Reparar = { ID, COSTE, estado, reparar, faltan, enCorriente, aplicar, maderas, materiales, recogerMaterial, P, test };
  return G.v18Reparar;
};
