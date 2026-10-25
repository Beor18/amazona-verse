/* AVE · cámara (rol Movimiento y animación; ver docs/equipo/MOVIMIENTO.md)
   Cámara en tercera persona que sigue al jugador (giro con Q/R o arrastrando), FOV +8 al volar o en el impulso,
   sacudida y hit-stop (GDD §7). prefers-reduced-motion apaga la sacudida y el cambio de FOV.
   - Altura estable al saltar: la cámara no sube y baja con cada salto (ancla en la altura del último suelo, como en los
     plataformas 3D); sigue al jugador si sube mucho, si cae por debajo, al volar y al nadar.
   - Seguimiento perezoso: si el jugador no toca la cámara en CAM.lazyDelay s y se mueve, se coloca poco a poco detrás de él
     (no cuando corre hacia la cámara). G.camara.manual() lo pausa (input.js lo llama al arrastrar y con Q/R).
   - En laderas y barrancos no se mete bajo el terreno.
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
    copaMin: 2.4, copaDentro: 2.8, // con una copa en medio: distancia mínima / si Vittata está dentro de la copa (m)
  }, G.pack.jugador && G.pack.jugador.camaraAjuste);
  // combo/comboT: racha de capturas (la usan objetos y diario para subir la nota del arpegio)
  const juice = { shake: 0, amp: 0, hitStop: 0, combo: 0, comboT: 0 };
  const camPos = new THREE.Vector3();
  let anchorY = null, lastManual = -1e9;
  const now = () => performance.now() / 1000;
  const rate = (k, dt) => 1 - Math.exp(-dt * k);

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
  const copas = []; let copasT = -1;
  const cabeza = new THREE.Vector3(), dirCam = new THREE.Vector3();
  function copasCerca() {
    const V = G.vegetacion, now = performance.now();
    if (!V || !V.instancias || !V.info || now - copasT < 500) return;
    copasT = now; copas.length = 0;
    for (const m in V.instancias) {
      const inf = V.info[m], P = V.instancias[m]; if (!inf || !inf.alto || inf.alto < 3 || !(inf.tronco > 0.08)) continue;
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i * 4], z = P.pos[i * 4 + 2], sc = P.pos[i * 4 + 3];
        if (Math.abs(x - S.pos.x) > 25 || Math.abs(z - S.pos.z) > 25) continue;
        copas.push(x, P.pos[i * 4 + 1] + inf.alto * sc * 0.66, z, Math.min(7, inf.ancho * 0.42) * sc * 0.9);
      }
    }
  }
  // Acerca la cámara si la línea cabeza→cámara cruza una copa; si Vittata está dentro de una (posada en una rama),
  // la cámara baja bajo la copa, cerca de ella, mirando hacia arriba
  function evitarCopas() {
    // solo posada o en alto (rama, techo, vuelo bajo copas): a ras de suelo la cámara no salta al pasar junto a los árboles
    const M = G.fisica.MOVE; if (!M.posado && S.pos.y - G.terreno.height(S.pos.x, S.pos.z) < 1.5) return;
    copasCerca(); if (!copas.length) return;
    cabeza.set(S.pos.x, S.pos.y + 1.2, S.pos.z); dirCam.subVectors(camPos, cabeza);
    const L2 = dirCam.lengthSq(); if (L2 < 1e-6) return;
    let tMin = 1, dentro = false;
    for (let i = 0; i < copas.length; i += 4) {
      const ox = cabeza.x - copas[i], oy = cabeza.y - copas[i + 1], oz = cabeza.z - copas[i + 2], r = copas[i + 3];
      const c = ox * ox + oy * oy + oz * oz - r * r;
      if (c < 0) { dentro = true; continue; }
      const b = ox * dirCam.x + oy * dirCam.y + oz * dirCam.z; if (b >= 0) continue;
      const disc = b * b - L2 * c; if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) / L2; if (t > 0 && t < tMin) tMin = t;
    }
    const L = Math.sqrt(L2);
    if (dentro) { const k = Math.min(1, CAM.copaDentro / L); camPos.set(cabeza.x + dirCam.x * k, S.pos.y - 0.3, cabeza.z + dirCam.z * k); }
    else if (tMin < 1) { const k = Math.max(CAM.copaMin / L, tMin - 0.4 / L); camPos.set(cabeza.x + dirCam.x * k, cabeza.y + dirCam.y * k, cabeza.z + dirCam.z * k); }
  }
  function target() {
    const fly = G.fisica.MOVE.flying, ay = anchorY == null ? S.pos.y : anchorY;
    camPos.set(S.pos.x + Math.sin(yaw) * dist(), ay + (fly ? CAM.heightFly : CAM.height), S.pos.z + Math.cos(yaw) * dist());
    evitarCopas();
    // En laderas y barrancos la cámara no se mete bajo el terreno
    const gy = G.terreno ? G.terreno.height(camPos.x, camPos.z) + CAM.groundClear : -Infinity;
    if (camPos.y < gy) camPos.y = gy;
    // Tampoco dentro de un edificio, una roca o un árbol (solidos.js): sube por encima
    if (G.solidos && G.solidos.activo) { const t = G.solidos.dentro(camPos.x, camPos.z, camPos.y); if (t > -Infinity) camPos.y = t + 0.6; }
  }
  const lookY = () => (anchorY == null ? S.pos.y : anchorY) + CAM.look;
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
  function follow(dt) {
    lazyYaw(dt);
    updateAnchor(dt, false);
    target(); camera.position.lerp(camPos, rate(CAM.follow, dt));
  }
  function shake(amp, secs) { if (R.REDUCED) return; juice.amp = Math.max(juice.amp, amp); juice.shake = Math.max(juice.shake, secs || 0.3); }
  function hitStop(secs) { juice.hitStop = Math.max(juice.hitStop, secs || 0.06); }
  function fov(dt) {
    const M = G.fisica.MOVE;
    const wantFov = 55 + (!R.REDUCED && (M.flying || M.dashT > 0) ? 8 : 0);
    if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
  }
  // Dibuja: la sacudida se suma solo durante el dibujo para no ensuciar el seguimiento de la cámara
  function draw(dt) {
    camera.lookAt(S.pos.x, lookY(), S.pos.z);
    let sx = 0, sy = 0, sz = 0;
    if (juice.shake > 0) {
      juice.shake -= dt;
      const a = juice.amp * Math.min(1, Math.max(0, juice.shake) / 0.2);
      sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; sz = (Math.random() - 0.5) * a;
      camera.position.x += sx; camera.position.y += sy; camera.position.z += sz;
      if (juice.shake <= 0) juice.amp = 0;
    }
    if (R.drawScene) R.drawScene(camera); else R.renderer.render(R.scene, camera); // drawScene: sombras, cielo y post-proceso
    camera.position.x -= sx; camera.position.y -= sy; camera.position.z -= sz;
  }

  return { get yaw() { return yaw; }, set yaw(v) { yaw = v; }, CAM, juice, dist, place, follow, shake, hitStop, fov, draw, manual,
    get anchorY() { return anchorY; } };
});
