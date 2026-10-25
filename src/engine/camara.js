/* AVE · cámara
   Cámara en tercera persona que sigue al jugador (giro con Q/R o arrastrando), FOV +8 al volar o en el impulso,
   sacudida y hit-stop (GDD §7). prefers-reduced-motion apaga la sacudida y el cambio de FOV.
   Dato del pack: jugador.camara (giro inicial, 0,35 por defecto). */
AVE.module('camara', function (G) {
  'use strict';
  const S = G.S, R = G.renderer, camera = R.camera;
  let yaw = G.pack.jugador && G.pack.jugador.camara != null ? G.pack.jugador.camara : 0.35;
  // combo/comboT: racha de capturas (la usan objetos y diario para subir la nota del arpegio)
  const juice = { shake: 0, amp: 0, hitStop: 0, combo: 0, comboT: 0 };
  const camPos = new THREE.Vector3();

  function dist() { return G.fisica.MOVE.flying ? 9.5 : 7.5; }
  function target() { camPos.set(S.pos.x + Math.sin(yaw) * dist(), S.pos.y + 4.2 + (G.fisica.MOVE.flying ? 1.6 : 0), S.pos.z + Math.cos(yaw) * dist()); }
  // Coloca la cámara: snap = al instante (cargar, capturas); también deja al jugador y al aprendiz en su sitio
  function place(snap) {
    target();
    if (snap) { camera.position.copy(camPos); G.actores.snapCompanionSprite(); }
    G.actores.placePlayerSprite(0);
    if (snap) G.actores.sync3D(0, false, true);
    camera.lookAt(S.pos.x, S.pos.y + 1.2, S.pos.z);
  }
  function follow(dt) { target(); camera.position.lerp(camPos, Math.min(1, dt * 6)); }
  function shake(amp, secs) { if (R.REDUCED) return; juice.amp = Math.max(juice.amp, amp); juice.shake = Math.max(juice.shake, secs || 0.3); }
  function hitStop(secs) { juice.hitStop = Math.max(juice.hitStop, secs || 0.06); }
  function fov(dt) {
    const M = G.fisica.MOVE;
    const wantFov = 55 + (!R.REDUCED && (M.flying || M.dashT > 0) ? 8 : 0);
    if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
  }
  // Dibuja: la sacudida se suma solo durante el dibujo para no ensuciar el seguimiento de la cámara
  function draw(dt) {
    camera.lookAt(S.pos.x, S.pos.y + 1.2, S.pos.z);
    let sx = 0, sy = 0, sz = 0;
    if (juice.shake > 0) {
      juice.shake -= dt;
      const a = juice.amp * Math.min(1, Math.max(0, juice.shake) / 0.2);
      sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; sz = (Math.random() - 0.5) * a;
      camera.position.x += sx; camera.position.y += sy; camera.position.z += sz;
      if (juice.shake <= 0) juice.amp = 0;
    }
    R.renderer.render(R.scene, camera);
    camera.position.x -= sx; camera.position.y -= sy; camera.position.z -= sz;
  }

  return { get yaw() { return yaw; }, set yaw(v) { yaw = v; }, juice, dist, place, follow, shake, hitStop, fov, draw };
});
