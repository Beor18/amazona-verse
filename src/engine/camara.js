/* AVE · cámara (rol Movimiento y animación; ver docs/equipo/MOVIMIENTO.md)
   Cámara en tercera persona que sigue al jugador (giro con Q/R o arrastrando), sacudida y hit-stop (GDD §7).
   - Cámara con vida (MODERNIZACION_2026 ficha 26-G): FOV +4…+12 según la velocidad al volar o en el impulso, inclinación
     (roll) de hasta ±4° al girar en vuelo, que vuelve a 0 al ir recto o posarse, dolly y leve sacudida al aterrizar,
     balanceo de 1 cm al caminar y «plano de descubrimiento» de 1,2 s (órbita corta) al descubrir un lugar ('lugar').
     prefers-reduced-motion (o CAM.sinVida) apaga todo esto, la sacudida y el cambio de FOV.
   - Altura estable al saltar: la cámara no sube y baja con cada salto (ancla en la altura del último suelo, como en los
     plataformas 3D); sigue al jugador si sube mucho, si cae por debajo, al volar y al nadar.
   - Seguimiento perezoso: si el jugador no toca la cámara en CAM.lazyDelay s y se mueve, se coloca poco a poco detrás de él
     (no cuando corre hacia la cámara). G.camara.manual() lo pausa (input.js lo llama al arrastrar y con Q/R).
   - En laderas y barrancos no se mete bajo el terreno, ni dentro de un muro (retrocede por la línea hasta Vittata).
   - Agachada bajo un toldo o un alero (MOVE.agachada), baja y se acerca para que la lona no la tape.
   - QA-61: volando, una copa no acerca la cámara por debajo del 82 % de distFly (antes bajaba a 2,4 m y la vista
     se agrandaba como un zoom). Posada, sigue acercándose para verla (QA-27). El pellizco (rueda con Ctrl
     o gesto) no hace zoom de página, y el FOV de exploración no se queda en el de un minijuego.
   Dato del pack: jugador.camara (giro inicial, 0,35 por defecto) y jugador.camaraAjuste = { clave: valor } sobre CAM. */
AVE.module('camara', function (G) {
  'use strict';
  const S = G.S, R = G.renderer, camera = R.camera;
  let yaw = G.pack.jugador && G.pack.jugador.camara != null ? G.pack.jugador.camara : 0.35;
  // Ajuste fino de la cámara (tasas en 1/s)
  const CAM = Object.assign({
    dist: 7.5, distFly: 9.5,       // distancia al jugador en el suelo y volando
    height: 4.2, heightFly: 5.8,   // altura sobre los pies
    look: 1.2,                     // a qué altura del jugador mira
    follow: 6,                     // tasa de seguimiento de la posición
    anchorBand: 2.2,               // saltando, la cámara no sube hasta que el jugador pasa esta altura sobre el último suelo
    anchorRate: 6, anchorFall: 10, // tasa del ancla en el suelo / al caer por debajo
    lazyDelay: 1.2,                // s sin tocar la cámara antes de seguir por detrás
    lazy: 0.55, lazyFly: 1.1,      // fuerza del seguimiento perezoso (rad/s por rad de diferencia, a velocidad de carrera)
    groundClear: 0.9,              // separación mínima sobre el terreno
    agachadaAlto: 1.3, agachadaDist: 4.2, // agachada bajo un toldo: la cámara baja y se acerca para verla bajo la lona
    copaMin: 2.4, copaDentro: 2.8, // con una copa en medio: distancia mínima / si Vittata está dentro de la copa (m)
    rollMax: 4, rollK: 0.09,       // inclinación en vuelo: máximo (°) y grados por grado/s de giro del rumbo
    fovMin: 4, fovMax: 12,         // FOV extra al volar o en el impulso, de parado a velocidad de impulso
    caida: 0.35, bob: 0.01,        // dolly al aterrizar (m por impacto 1) y balanceo al caminar (m)
    plano: 1.2, planoGiro: 0.55,   // plano de descubrimiento: duración (s) y giro de la órbita (rad)
    sinVida: false,                // true: sin cámara con vida (como prefers-reduced-motion; lo usa movementTest)
  }, G.pack.jugador && G.pack.jugador.camaraAjuste);
  // combo/comboT: racha de capturas (la usan objetos y diario para subir la nota del arpegio)
  const juice = { shake: 0, amp: 0, hitStop: 0, combo: 0, comboT: 0 };
  const camPos = new THREE.Vector3();
  let anchorY = null, lastManual = -1e9;
  const now = () => performance.now() / 1000;
  // Cámara con vida: roll (rad), caida (m, dolly al aterrizar), fase del balanceo, plano de descubrimiento en curso (s)
  const vida = { roll: 0, caida: 0, fase: 0, plano: 0, planoDir: 1, rumbo: null, giro: 0, land: 0 };
  const quieta = () => R.REDUCED || CAM.sinVida;
  const rate = (k, dt) => 1 - Math.exp(-dt * k);
  // QA-61: el pellizco del trackpad (rueda + Ctrl) y el gesto del móvil no agrandan la página.
  addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) addEventListener(ev, e => e.preventDefault(), { passive: false });

  function manual() { lastManual = now(); }
  function dist() { return G.fisica.MOVE.flying ? CAM.distFly : CAM.dist; }
  // Altura de referencia: la del jugador, salvo al saltar (se queda en el último suelo dentro de una banda)
  function updateAnchor(dt, snap) {
    const M = G.fisica.MOVE, y = S.pos.y;
    if (snap || anchorY == null) { anchorY = y; return; }
    let want = anchorY, k = CAM.anchorRate;
    if (M.grounded || M.flying || M.swimming) want = y;
    else if (y < anchorY) { want = y; k = CAM.anchorFall; }
    else if (y > anchorY + CAM.anchorBand) want = y - CAM.anchorBand;
    anchorY += (want - anchorY) * rate(k, dt);
  }
  // Copas de árbol entre la cámara y Vittata (QA-27): esferas de copa de los árboles cercanos (se rehacen cada 0,5 s)
  const copas = []; let copasT = -1, copasExtra = null;
  const cabeza = new THREE.Vector3(), dirCam = new THREE.Vector3();
  function copasCerca() {
    const V = G.vegetacion, ahora = performance.now();
    if (!V || !V.instancias || !V.info || ahora - copasT < 500) return;
    copasT = ahora; copas.length = 0;
    for (const m in V.instancias) {
      const inf = V.info[m], P = V.instancias[m]; if (!inf || !inf.alto || inf.alto < 3 || !(inf.tronco > 0.08)) continue;
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i * 4], z = P.pos[i * 4 + 2], sc = P.pos[i * 4 + 3];
        if (Math.abs(x - S.pos.x) > 25 || Math.abs(z - S.pos.z) > 25) continue;
        copas.push(x, P.pos[i * 4 + 1] + inf.alto * sc * 0.66, z, Math.min(7, inf.ancho * 0.42) * sc * 0.9);
      }
    }
  }
  // Lista de este cuadro: las copas reales y, en la prueba, esferas de más. probarCopas(null) las quita.
  function copasAhora() {
    copasCerca();
    if (!copasExtra || !copasExtra.length) return copas;
    const out = copas.slice();
    for (let i = 0; i < copasExtra.length; i++) { const c = copasExtra[i]; out.push(c[0], c[1], c[2], c[3]); }
    return out;
  }
  function probarCopas(lista) { copasExtra = lista && lista.length ? lista : null; copasT = -1; }
  // Acerca la cámara si la línea cabeza→cámara cruza una copa; si Vittata está dentro de una (posada en una rama),
  // la cámara baja bajo la copa, cerca de ella, mirando hacia arriba
  function evitarCopas() {
    // solo posada o en alto (rama, techo, vuelo bajo copas): a ras de suelo la cámara no salta al pasar junto a los árboles
    const M = G.fisica.MOVE; if (!M.posado && S.pos.y - G.terreno.height(S.pos.x, S.pos.z) < 1.5) return;
    const lista = copasAhora(); if (!lista.length) return;
    cabeza.set(S.pos.x, S.pos.y + 1.2, S.pos.z); dirCam.subVectors(camPos, cabeza);
    const L2 = dirCam.lengthSq(); if (L2 < 1e-6) return;
    let tMin = 1, dentro = false;
    for (let i = 0; i < lista.length; i += 4) {
      const ox = cabeza.x - lista[i], oy = cabeza.y - lista[i + 1], oz = cabeza.z - lista[i + 2], r = lista[i + 3];
      const c = ox * ox + oy * oy + oz * oz - r * r;
      if (c < 0) { dentro = true; continue; }
      const b = ox * dirCam.x + oy * dirCam.y + oz * dirCam.z; if (b >= 0) continue;
      const disc = b * b - L2 * c; if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) / L2; if (t > 0 && t < tMin) tMin = t;
    }
    const L = Math.sqrt(L2);
    // Posada: se acerca para verla (QA-27). Volando, el piso es el 82 % de distFly: bajar a copaMin (2,4 m)
    // agrandaba la vista como un zoom cada vez que una copa cruzaba la línea (QA-61).
    const piso = M.posado ? CAM.copaMin : Math.max(CAM.copaMin, CAM.distFly * 0.82);
    if (dentro && M.posado) { const k = Math.min(1, CAM.copaDentro / L); camPos.set(cabeza.x + dirCam.x * k, S.pos.y - 0.3, cabeza.z + dirCam.z * k); }
    else if (tMin < 1 || dentro) { const k = Math.min(1, Math.max(piso / L, dentro ? piso / L : tMin - 0.4 / L)); if (k < 0.995) camPos.set(cabeza.x + dirCam.x * k, cabeza.y + dirCam.y * k, cabeza.z + dirCam.z * k); }
  }
  // Si el encuadre cae dentro de un muro, un tejado o una cúpula, retrocede por la línea hasta quedar fuera.
  // Si eso la dejaría a menos de 3,2 m (la vista se agrandaba al chocar), prueba a rodear el obstáculo.
  function evitarMuros() {
    if (!G.solidos || !G.solidos.activo) return;
    const qx = camPos.x, qy = camPos.y, qz = camPos.z, hx = S.pos.x, hy = S.pos.y + CAM.look, hz = S.pos.z;
    const libre = (dx, dy, dz) => {
      const L = Math.hypot(dx, dy, dz);
      if (L < 1.6) return { x: hx + dx, y: hy + dy, z: hz + dz, d: L };
      const n = Math.max(1, Math.ceil(L / 0.3)); let corte = -1;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        if (G.solidos.dentro(hx + dx * t, hz + dz * t, hy + dy * t) > -Infinity) { corte = i - 1; break; }
      }
      if (corte < 0) return { x: hx + dx, y: hy + dy, z: hz + dz, d: L };
      const k = Math.max(1.6 / L, corte / n);
      let x = hx + dx * k, y = hy + dy * k, z = hz + dz * k;
      const top = G.solidos.dentro(x, z, y);
      if (top > -Infinity) y = top + 0.6;
      return { x, y, z, d: Math.hypot(x - hx, y - hy, z - hz) };
    };
    const dx0 = qx - hx, dy0 = qy - hy, dz0 = qz - hz;
    let best = libre(dx0, dy0, dz0);
    if (best.d < 3.2) {
      const dh = Math.hypot(dx0, dz0) || CAM.dist, ang0 = Math.atan2(dx0, dz0);
      for (let s = 1; s <= 6 && best.d < 3.2; s++) for (const sig of [1, -1]) {
        const a = ang0 + s * 0.4 * sig, r = libre(Math.sin(a) * dh, dy0, Math.cos(a) * dh);
        if (r.d > best.d + 0.05) best = r;
      }
    }
    camPos.set(best.x, best.y, best.z);
    const suelo = G.terreno ? G.terreno.height(camPos.x, camPos.z) + CAM.groundClear : -Infinity;
    if (camPos.y < suelo) camPos.y = suelo;
  }
  // ¿Se ve «mira» desde q sin copas en medio? (fotos del cómic, QA-32). Si mira o q están dentro de una copa, no: posada en
  // la rama de un flamboyán, las hojas la tapan desde cualquier ángulo (medido) y el cómic usa su ilustración
  function copaLibre(q, mira) {
    copasCerca();
    const dx = q.x - mira.x, dy = q.y - mira.y, dz = q.z - mira.z, L2 = dx * dx + dy * dy + dz * dz;
    for (let i = 0; i < copas.length; i += 4) {
      const cx = copas[i], cy = copas[i + 1], cz = copas[i + 2], r2 = copas[i + 3] * copas[i + 3];
      const ox = mira.x - cx, oy = mira.y - cy, oz = mira.z - cz, c = ox * ox + oy * oy + oz * oz - r2;
      if (c < 0 || (q.x - cx) ** 2 + (q.y - cy) ** 2 + (q.z - cz) ** 2 < r2) return false;
      const b = ox * dx + oy * dy + oz * dz, disc = b * b - L2 * c; if (b >= 0 || disc < 0) continue;
      if (-b - Math.sqrt(disc) < L2) return false; // la recta entra en la copa antes de llegar a q
    }
    return true;
  }
  function target() {
    const M = G.fisica.MOVE, fly = M.flying, ay = anchorY == null ? S.pos.y : anchorY, ag = fly ? 0 : M.agachada || 0;
    let h = fly ? CAM.heightFly : CAM.height, d = dist();
    if (ag) { h += (CAM.agachadaAlto - h) * ag; d += (CAM.agachadaDist - d) * ag; }
    // Plano de descubrimiento: órbita corta de ida y vuelta alrededor de Vittata, algo más cerca y más baja
    let yw = yaw;
    if (vida.plano > 0) { const s = Math.sin(Math.PI * (1 - vida.plano / CAM.plano)); yw += vida.planoDir * CAM.planoGiro * s; d *= 1 - 0.18 * s; h *= 1 - 0.2 * s; }
    camPos.set(S.pos.x + Math.sin(yw) * d, ay + h - vida.caida, S.pos.z + Math.cos(yw) * d);
    evitarCopas();
    // En laderas y barrancos la cámara no se mete bajo el terreno
    const gy = G.terreno ? G.terreno.height(camPos.x, camPos.z) + CAM.groundClear : -Infinity;
    if (camPos.y < gy) camPos.y = gy;
    evitarMuros();
  }
  const lookY = () => (anchorY == null ? S.pos.y : anchorY) + CAM.look - 0.5 * (G.fisica.MOVE.flying ? 0 : G.fisica.MOVE.agachada || 0);
  // Coloca la cámara: snap = al instante (cargar, capturas); también deja al jugador y al aprendiz en su sitio
  function place(snap) {
    if (snap) updateAnchor(0, true);
    target();
    if (snap) { camera.position.copy(camPos); G.actores.snapCompanionSprite(); }
    G.actores.placePlayerSprite(0);
    if (snap) G.actores.sync3D(0, false, true);
    camera.lookAt(S.pos.x, lookY(), S.pos.z);
  }
  // Seguimiento perezoso: con el jugador en movimiento y la cámara sin tocar, gira despacio hasta quedar detrás
  function lazyYaw(dt) {
    const M = G.fisica.MOVE, sp = M.speed || 0;
    if (sp < 2 || now() - lastManual < CAM.lazyDelay || G.ui.busy() || M.swimming) return;
    const behind = Math.atan2(-M.vx, -M.vz), diff = Math.atan2(Math.sin(behind - yaw), Math.cos(behind - yaw));
    if (Math.abs(diff) > 2.3) return; // corre hacia la cámara: no se da la vuelta
    const k = (M.flying ? CAM.lazyFly : CAM.lazy) * Math.min(1, sp / G.fisica.RUN_SPEED);
    yaw += diff * Math.min(1, k * dt);
  }
  // Roll, dolly del aterrizaje y plano: avanzan con el seguimiento (no al dibujar) para que las pruebas los muevan sin dibujar
  function vivir(dt) {
    const M = G.fisica.MOVE;
    if (quieta()) { vida.roll = vida.caida = vida.plano = 0; vida.rumbo = null; vida.land = M.land || 0; return; }
    // Inclinación: proporcional a la velocidad de giro del rumbo en vuelo (suavizada); fuera del vuelo vuelve a 0
    let want = 0;
    if (M.flying && (M.speed || 0) > 2) {
      const r = Math.atan2(M.vx, M.vz);
      if (vida.rumbo != null && dt > 0) { const w = Math.atan2(Math.sin(r - vida.rumbo), Math.cos(r - vida.rumbo)) / dt; vida.giro += (w - vida.giro) * rate(5, dt); }
      vida.rumbo = r;
      const lim = CAM.rollMax * Math.PI / 180;
      want = Math.max(-lim, Math.min(lim, vida.giro * CAM.rollK));
    } else { vida.rumbo = null; vida.giro = 0; }
    vida.roll += (want - vida.roll) * rate(4, dt);
    if (Math.abs(vida.roll) < 1e-4 && !want) vida.roll = 0;
    // Aterrizaje (fisica.js pone MOVE.land al tocar suelo): la cámara baja un poco y vuelve; posarse en vuelo sacude leve
    if ((M.land || 0) > vida.land + 1e-3) { vida.caida = Math.max(vida.caida, CAM.caida * Math.max(0.3, M.impact || 0)); if ((M.impact || 0) <= 0.3) shake(0.04, 0.15); }
    vida.land = M.land || 0;
    vida.caida *= 1 - rate(5, dt); if (vida.caida < 1e-3) vida.caida = 0;
    if (vida.plano > 0) vida.plano = Math.max(0, vida.plano - dt);
    // Balanceo al caminar: fase según la distancia recorrida en el suelo
    if (M.grounded && !M.flying && !M.swimming && (M.speed || 0) > 0.5) vida.fase += dt * (M.speed || 0) * 2.4; else vida.fase = 0;
  }
  // Plano de descubrimiento (1,2 s): gira hacia el lado que aparta la cámara de la pendiente; nada con prefers-reduced-motion
  function descubrir() {
    if (quieta()) return false;
    const l = G.terreno.height(S.pos.x + Math.sin(yaw + 0.5) * 6, S.pos.z + Math.cos(yaw + 0.5) * 6), r = G.terreno.height(S.pos.x + Math.sin(yaw - 0.5) * 6, S.pos.z + Math.cos(yaw - 0.5) * 6);
    vida.planoDir = l <= r ? 1 : -1; vida.plano = CAM.plano; return true;
  }
  G.on('lugar', () => descubrir());
  function follow(dt) {
    vivir(dt);
    lazyYaw(dt);
    updateAnchor(dt, false);
    target(); camera.position.lerp(camPos, rate(CAM.follow, dt));
  }
  function shake(amp, secs) { if (R.REDUCED) return; juice.amp = Math.max(juice.amp, amp); juice.shake = Math.max(juice.shake, secs || 0.3); }
  function hitStop(secs) { juice.hitStop = Math.max(juice.hitStop, secs || 0.06); }
  // FOV: +4 al volar o en el impulso, hasta +12 a la velocidad del impulso
  function fovExtra() {
    const M = G.fisica.MOVE, F = G.fisica;
    if (quieta() || !(M.flying || M.dashT > 0)) return 0;
    const base = M.flying ? F.FLY_SPEED : F.SPEED; // volando, el crucero da fovMin; solo el impulso lo sube
    const k = M.dashT > 0 ? 1 : Math.max(0, Math.min(1, ((M.speed || 0) - base) / Math.max(0.1, F.DASH_SPEED - base)));
    return CAM.fovMin + (CAM.fovMax - CAM.fovMin) * k;
  }
  function fov(dt) {
    const wantFov = 55 + fovExtra();
    let dirty = false;
    // Un minijuego puede dejar el FOV en 34 o el zoom de la cámara en otro valor: aquí vuelve al de exploración.
    if (!(camera.fov > 30 && camera.fov < 100)) { camera.fov = wantFov; dirty = true; }
    if (camera.zoom !== 1) { camera.zoom = 1; dirty = true; }
    if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov += (wantFov - camera.fov) * Math.min(1, (dt || 0) * 5); dirty = true; }
    if (dirty) camera.updateProjectionMatrix();
  }
  // Dibuja: la sacudida se suma solo durante el dibujo para no ensuciar el seguimiento de la cámara
  function draw(dt) {
    camera.lookAt(S.pos.x, lookY(), S.pos.z);
    if (vida.roll) camera.rotateZ(vida.roll);
    let sx = 0, sy = quieta() ? 0 : Math.sin(vida.fase) * CAM.bob, sz = 0;
    camera.position.y += sy;
    if (juice.shake > 0) {
      juice.shake -= dt;
      const a = juice.amp * Math.min(1, Math.max(0, juice.shake) / 0.2);
      const ry = (Math.random() - 0.5) * a; sx = (Math.random() - 0.5) * a; sz = (Math.random() - 0.5) * a; sy += ry;
      camera.position.x += sx; camera.position.y += ry; camera.position.z += sz;
      if (juice.shake <= 0) juice.amp = 0;
    }
    if (R.drawScene) R.drawScene(camera); else R.renderer.render(R.scene, camera); // drawScene: sombras, cielo y post-proceso
    camera.position.x -= sx; camera.position.y -= sy; camera.position.z -= sz;
  }

  return { get yaw() { return yaw; }, set yaw(v) { yaw = v; }, CAM, juice, vida, dist, place, follow, shake, hitStop, fov, fovExtra, draw, manual, descubrir, copaLibre, probarCopas,
    get anchorY() { return anchorY; } };
});
