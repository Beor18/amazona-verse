/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · frente B: reparación y persistencia (entregable D7).
   Estructura: el puente colgante de El Yunque junto a Villa Raíz (mapa.estructuras id 'puente', estructura propia de
   src/engine/mundo.js, malla 'estructura:puente' y piso tipo 'puente' en terreno.plataformas). worldChangeId 'puente_villa'.
   - 'roto' (por defecto): faltan las tablas del centro (se ocultan sus triángulos en la malla existente, sin modelos nuevos)
     y el piso del puente no sostiene (when() del piso: se cae al río, se nada y se sale; nada de daño).
     Dos maderas del puente quedaron en la orilla (modelo de la madera del pack): se recogen con Acción.
   - 'reparado': el aspecto de siempre, el piso vuelve a sostener (atajo a pie sobre el río) y en el centro sube la
     «corriente del puente»: volando dentro de ella, Vittata sube alto para planear lejos.
   - Coste: 1 pluma de rival (G.v18, rewardKey 'combate_1' del frente A) + 2 maderas del puente (G.v18 'madera_puente').
     No usa la madera de S.inv: la historia del cap. 1 la necesita toda (refugio y transmisor) y no se puede gastar aquí.
   - Persistencia: solo G.v18 (progreso.js). Se aplica al iniciar, en G.on('apply') y con cada evento v18 de tipo 'mundo'.
   Prueba: AV.v18RepararTest(). Solo se carga con la bandera V18 (src/boot.js). */
window.AVV18Reparar = function (G) {
  'use strict';
  if (G.v18Reparar) return G.v18Reparar;
  const V = G.v18 || window.AVV18Progreso(G);
  const S = G.S, T = G.terreno, scene = G.renderer.scene;
  const ID = 'puente_villa', PIEZA = 'pluma_rival', MADERA = 'madera_puente';
  const COSTE = { [PIEZA]: 1, [MADERA]: 2 };
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
  function recoger(M) {
    if (cogida(M) || !V.otorgar(M.key, MADERA, 1)) return false;
    V.cambiarMundo(M.key, 'recogida');
    sonar('pickup');
    try { G.fx.recoger(M.x, M.y + 0.6, M.z, 'feathers', 12); } catch (e) { /* sin fx */ }
    const n = V.cuantos(MADERA);
    toast('+1 madera del puente (' + Math.min(n, 2) + '/2)');
    sincronizar();
    return true;
  }
  function sincronizar() { for (const M of maderas) M.g.visible = !reparado() && !cogida(M); }

  // ---------- Reparar (interacción en la cabecera del lado de Villa Raíz) ----------
  // qué falta: { pluma, madera } (0 si no falta)
  function faltan() { return { pluma: Math.max(0, COSTE[PIEZA] - V.cuantos(PIEZA)), madera: Math.max(0, COSTE[MADERA] - V.cuantos(MADERA)) }; }
  function textoFalta(f) {
    if (f.pluma && f.madera) return 'Te falta 1 pluma de rival y ' + f.madera + (f.madera > 1 ? ' maderas' : ' madera') + '. Gana la pluma en el duelo de la explanada y busca las maderas en la orilla.';
    if (f.pluma) return 'Te falta 1 pluma de rival. Gana una pluma en el duelo de la explanada.';
    return f.madera > 1 ? 'Te faltan ' + f.madera + ' maderas del puente. Búscalas en la orilla, junto al puente.' : 'Te falta 1 madera del puente. Búscala en la orilla, junto al puente.';
  }
  function reparar() {
    if (reparado()) { toast('El puente ya está reparado. ¡Prueba la corriente del centro!'); return false; }
    const f = faltan();
    if (f.pluma || f.madera) { sonar('wrong'); toast(textoFalta(f), 4500); return false; }
    if (!V.gastar(PIEZA, COSTE[PIEZA]) || !V.gastar(MADERA, COSTE[MADERA])) return false; // faltan() ya comprobó los dos
    V.cambiarMundo(ID, 'reparado');
    aplicar();
    sonar('unlock');
    const c = centro();
    if (c) { try { G.fx.recoger(c.x, c.y + 0.5, c.z, 'feathers', 26); G.fx.burst(c.x, c.y + 0.5, c.z, 'stars', 18); } catch (e) { /* sin fx */ } }
    try { G.camara.shake(0.08, 0.3); } catch (e) { /* sin cámara */ }
    toast('¡Puente reparado! Ya se cruza a pie, y en el centro sube una corriente de aire.', 4500);
    return true;
  }
  let itReparar = null;
  function ponerInteraccion() {
    if (itReparar || !P.eje) return;
    const p = punto(-0.06);
    itReparar = G.interaccion.add({ id: 'v18_reparar_puente', x: p.x, z: p.z, r: 3.2, visible: () => !reparado(),
      label: () => 'Reparar el puente: 1 pluma de rival + 2 maderas', use: reparar });
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
    ponerInteraccion(); ponerMaderas(); sincronizar();
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
    const toasts = [], toastOrig = G.ui.toast;
    G.ui.toast = (t, ms) => { toasts.push(String(t)); return toastOrig.call(G.ui, t, ms); };
    try {
      for (let i = 0; i < 60 && !(aplicar() && P.rotoIdx); i++) await new Promise(r => setTimeout(r, 250));
      check('Encuentra el puente real (piso y malla)', P.piso && P.malla && P.ocultos > 20, 'triángulos del centro: ' + P.ocultos);
      // limpio: sin pluma ni maderas, puente sin cambiar
      V.borrar(); aplicar();
      const c = centro(), idx = () => P.malla.geometry.index.array;
      const igual = (a, b) => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };
      check('Roto por defecto: estado, tablas del centro ocultas y el piso no sostiene',
        estado() === 'roto' && igual(idx(), P.rotoIdx) && !igual(idx(), P.idx0) && P.piso.when() === false);
      const sinPiso = T.plataformas.filter(p => p.id === 'puente' && (!p.when || p.when())).length === 0;
      check('Roto: no hay piso activo del puente ni corriente', sinPiso && !enCorriente(c.x, c.z, c.y + 1));
      check('Interacción visible junto al puente con el coste', itReparar && itReparar.visible() && /1 pluma de rival \+ 2 maderas/.test(itReparar.label()));
      toasts.length = 0;
      check('Sin recursos no repara y dice qué falta y cómo conseguirlo',
        reparar() === false && estado() === 'roto' && toasts.some(t => /pluma de rival/.test(t) && /duelo de la explanada/.test(t) && /2 maderas/.test(t)), toasts.join(' | '));
      // pluma sola: sigue faltando madera
      V.otorgar('prueba_b', PIEZA, 1); toasts.length = 0;
      check('Con la pluma pero sin maderas no repara ni cobra', reparar() === false && V.cuantos(PIEZA) === 1 && toasts.some(t => /2 maderas/.test(t) && !/pluma/.test(t)), toasts.join(' | '));
      // maderas en la orilla, recogidas con Acción
      check('Hay 2 maderas del puente en la orilla', maderas.length === 2 && maderas.every(M => M.g.visible && M.it.visible()));
      maderas.forEach(M => M.it.use());
      check('Recoger da 1 madera cada una, una sola vez', !recoger(maderas[0]) && V.cuantos(MADERA) === 2 && maderas.every(M => !M.g.visible && !M.it.visible()));
      V.otorgar('prueba_b_extra', MADERA, 1); // una de sobra: debe quedar
      toasts.length = 0;
      const ok = reparar();
      check('Con recursos repara y gasta exactamente 1 pluma y 2 maderas', ok && estado() === 'reparado' && V.cuantos(PIEZA) === 0 && V.cuantos(MADERA) === 1,
        'pluma ' + V.cuantos(PIEZA) + ', madera ' + V.cuantos(MADERA));
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
      // recarga: sigue reparado y no vuelve a cobrar
      V.recargar(); P.malla.geometry.index.array.set(P.rotoIdx); aplicar();
      check('Tras recargar y volver a aplicar sigue reparado (malla, piso y estado)', estado() === 'reparado' && igual(idx(), P.idx0) && P.piso.when() === true);
      toasts.length = 0;
      check('Tras recargar no vuelve a cobrar', reparar() === false && V.cuantos(PIEZA) === 0 && V.cuantos(MADERA) === 1 && !V.otorgar('prueba_b', PIEZA, 1));
      let guardado = null; try { guardado = JSON.parse(localStorage.getItem(clave)); } catch (e) { /* sin almacenamiento */ }
      check('Evidencia de guardado: <almacen>.v18 tiene mundo.puente_villa = reparado', guardado && guardado.mundo && guardado.mundo[ID] === 'reparado', clave);
    } catch (e) { check('Sin excepciones', false, e && e.stack); }
    G.ui.toast = toastOrig;
    try { if (crudo == null) localStorage.removeItem(clave); else localStorage.setItem(clave, crudo); } catch (e) { /* sin almacenamiento */ }
    V.recargar(); aplicar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18Reparar = { ID, COSTE, estado, reparar, faltan, enCorriente, aplicar, maderas, P, test };
  return G.v18Reparar;
};
