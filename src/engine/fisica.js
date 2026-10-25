/* AVE · colisiones y movimiento
   Movimiento de acción: aceleración, correr, doble salto con aleteo, planeo, impulso, tiempo de coyote, vuelo y nado.
   Colisiones: círculos (r) y cajas alineadas (hx/hz) contra el jugador; sin motor de física (CTO_PLAN §2).
   Un collider es { x, z, r, hx?, hz?, h?, kind, when?, id? }: h = altura que se puede sobrevolar (si falta, alturas[kind]).
   Ganchos: 'moved' (busy) justo después de mover al jugador y antes de chocar (p. ej. recoger objetos al pasar). */
AVE.module('fisica', function (G) {
  'use strict';
  const S = G.S;
  const T = Object.assign({ walk: 6.5, run: 10.5, dash: 19, fly: 12, flyCeil: 26, swim: 4.5, swimDepth: 0.22 }, G.pack.jugador && G.pack.jugador.fisica);
  const SPEED = T.walk, RUN_SPEED = T.run, DASH_SPEED = T.dash;
  // Vuelo: tercer toque de salto en el aire, o V / botón Volar. Mantener salto sube, C baja, soltar desciende suave.
  const FLY_SPEED = T.fly, FLY_CEIL = T.flyCeil;
  // Nado: el ave flota con el cuerpo medio hundido; profundidad de los pies: deja cabeza y espalda fuera del agua
  const SWIM_SPEED = T.swim, SWIM_DEPTH = T.swimDepth;
  const MOVE = { vx: 0, vz: 0, airJumps: 0, coyote: 0, dashT: 0, dashCd: 0, airDash: true, land: 0, wasAir: false, flying: false };
  const colliders = [];
  // Altura de cada tipo de obstáculo para poder pasar volando por encima (un pack añade los suyos)
  const alturas = { post: 1.3, obj: 1.6, npc: 2 };

  const busyNow = () => G.dialogo.open() || G.ui.cardOpen || G.ui.overlayOpen();
  const onGroundNow = () => S.pos.y <= G.terreno.surfaceY(S.pos.x, S.pos.z) + 0.01;

  function tryJump() {
    if (MOVE.flying) return;
    if (MOVE.swimming) { S.vy = 7; MOVE.swimming = false; G.agua.splash(S.pos.x, S.water, S.pos.z, 0.8); return; }
    if (onGroundNow() || MOVE.coyote > 0) { S.vy = 7.5; MOVE.coyote = 0; MOVE.airJumps = 1; G.audio.play('jump'); return; }
    if (MOVE.airJumps > 0) { S.vy = 6.8; MOVE.airJumps--; G.audio.play('jump'); G.fx.burst(S.pos.x, S.pos.y + 0.6, S.pos.z, 'feathers', 6); return; }
    startFlying();
  }
  function startFlying() {
    if (busyNow()) return;
    MOVE.flying = true;
    if (onGroundNow()) S.vy = 6; else S.vy = Math.max(S.vy, 2);
  }
  function toggleFly() { if (MOVE.flying) MOVE.flying = false; else startFlying(); }
  function tryDash() {
    if (MOVE.dashCd > 0 || busyNow()) return;
    const air = !onGroundNow();
    if (air && !MOVE.airDash) return;
    if (air) { MOVE.airDash = false; S.vy = Math.max(S.vy, 1.5); }
    MOVE.dashT = 0.2; MOVE.dashCd = 0.7;
    G.audio.play('dash');
  }
  // Empuja un punto fuera de un collider: círculo (r) o caja alineada (hx/hz)
  function pushOut(p, c, rad) {
    if (c.r <= 0 || (c.when && !c.when())) return;
    if (p.y != null && p.y - G.terreno.height(c.x, c.z) > (c.h != null ? c.h : c.kind === 'tree' ? c.r * 9 : alturas[c.kind] || 2)) return;
    if (c.hx) {
      const qx = Math.max(c.x - c.hx, Math.min(c.x + c.hx, p.x)), qz = Math.max(c.z - c.hz, Math.min(c.z + c.hz, p.z));
      const dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
      if (d >= rad) return;
      if (d > 1e-4) { p.x = qx + dx / d * rad; p.z = qz + dz / d * rad; return; }
      // Dentro de la caja: sale por el lado más cercano
      const ox = c.hx - Math.abs(p.x - c.x), oz = c.hz - Math.abs(p.z - c.z);
      if (ox < oz) p.x = c.x + Math.sign(p.x - c.x || 1) * (c.hx + rad);
      else p.z = c.z + Math.sign(p.z - c.z || 1) * (c.hz + rad);
      return;
    }
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + rad;
    if (d < min && d > 1e-4) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
  }
  function removeColliders(kind) { for (let i = colliders.length - 1; i >= 0; i--) if (colliders[i].kind === kind) colliders.splice(i, 1); }

  // Un paso de simulación del jugador; devuelve si se está moviendo
  function step(dt, busy) {
    const keys = G.input.keys, stick = G.input.stick, cam = G.camara;
    let ix = 0, iz = 0;
    if (keys.has('w') || keys.has('arrowup')) iz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('q')) cam.yaw += 1.8 * dt;
    if (keys.has('r')) cam.yaw -= 1.8 * dt;
    ix += stick.x; iz += stick.y;
    const len = Math.hypot(ix, iz);
    const onGround = onGroundNow();
    let tx = 0, tz = 0;
    if (len > 0.12 && !busy) {
      const mag = Math.min(1, len), camYaw = cam.yaw;
      ix /= Math.max(1, len); iz /= Math.max(1, len);
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const mx = rx * ix - fx * iz, mz = rz * ix - fz * iz, ml = Math.hypot(mx, mz);
      // Shift (o el joystick a fondo) corre
      const run = keys.has('shift') || Math.hypot(stick.x, stick.y) > 0.92;
      const sp = (MOVE.flying ? FLY_SPEED : MOVE.swimming ? SWIM_SPEED * (run ? 1.4 : 1) : run ? RUN_SPEED : SPEED) * (ml > 0 ? 1 / Math.max(1, ml) : 0) * Math.max(mag, 0.35);
      tx = mx * sp; tz = mz * sp;
      if (ml > 0.01) S.facing = { x: mx / ml, z: mz / ml };
      G.actores.flipSprite(ix);
    }
    MOVE.dashCd = Math.max(0, MOVE.dashCd - dt);
    if (MOVE.dashT > 0) {
      MOVE.dashT -= dt;
      MOVE.vx = S.facing.x * DASH_SPEED; MOVE.vz = S.facing.z * DASH_SPEED;
    } else {
      const acc = 1 - Math.exp(-dt * (onGround ? (tx || tz ? 14 : 18) : MOVE.flying || MOVE.swimming ? 6 : 5));
      MOVE.vx += (tx - MOVE.vx) * acc; MOVE.vz += (tz - MOVE.vz) * acc;
    }
    S.pos.x += MOVE.vx * dt; S.pos.z += MOVE.vz * dt;
    const hSpeed = Math.hypot(MOVE.vx, MOVE.vz);
    const moving = hSpeed > 0.6;
    MOVE.speed = hSpeed;
    G.emit('moved', busy);
    // Dos pasadas: al empujar fuera de un objeto se puede quedar dentro de otro vecino
    for (let pass = 0; pass < 2; pass++) for (const c of colliders) pushOut(S.pos, c, 0.55);
    const WORLD = G.terreno.WORLD;
    S.pos.x = Math.max(-WORLD, Math.min(WORLD, S.pos.x));
    S.pos.z = Math.max(-WORLD, Math.min(WORLD, S.pos.z));
    const ground = G.terreno.surfaceY(S.pos.x, S.pos.z);
    // Agua: el río (franja del plano de agua) es nadable donde cubre más de 0,7 m
    const wY = G.agua.levelAt(S.pos.x), deep = wY - ground > 0.7;
    const wasSwim = MOVE.swimming;
    MOVE.swimming = deep && !MOVE.flying && S.pos.y <= wY - SWIM_DEPTH + 0.15;
    if (MOVE.swimming && !wasSwim) G.agua.splash(S.pos.x, wY, S.pos.z, Math.min(1.6, 0.6 + Math.abs(S.vy) * 0.12));
    const jumpHeld = G.input.jumpHeld;
    if (MOVE.swimming) {
      // Flota en la superficie; mantener C bucea hasta el fondo; al soltar sube
      const target = keys.has('c') && !busy ? ground + 0.25 : wY - SWIM_DEPTH;
      S.vy += ((target - S.pos.y) * 3 - S.vy) * (1 - Math.exp(-dt * 5));
      MOVE.airJumps = 1; MOVE.airDash = true; MOVE.wet = true;
      // Estela en V detrás al avanzar; quieta, solo ondas suaves
      if ((MOVE.ripple = (MOVE.ripple || 0) - dt) <= 0 && S.pos.y > wY - 1) {
        if (moving) {
          MOVE.ripple = 0.16;
          const bx = S.pos.x - S.facing.x * 0.5, bz = S.pos.z - S.facing.z * 0.5, px = -S.facing.z * 0.35, pz = S.facing.x * 0.35;
          G.agua.ripple(bx + px, wY, bz + pz, 0.7); G.agua.ripple(bx - px, wY, bz - pz, 0.7);
        } else { MOVE.ripple = 1.1; G.agua.ripple(S.pos.x, wY, S.pos.z, 1.3); }
      }
    } else if (MOVE.wet && onGround) {
      // Sale del agua a tierra: se sacude como un ave, con gotas
      MOVE.wet = false; MOVE.shake = true; G.agua.spray(S.pos.x, S.pos.y + 1.0, S.pos.z);
    } else if (MOVE.flying) {
      // Volando: sin gravedad; sube con salto, baja con C, si no desciende despacio
      const want = jumpHeld && !busy ? 5.5 : keys.has('c') ? -7 : -1.1;
      S.vy += (want - S.vy) * (1 - Math.exp(-dt * 4));
      if (S.pos.y > ground + FLY_CEIL) S.vy = Math.min(S.vy, 0);
    } else {
      const gliding = jumpHeld && S.vy < 0;
      S.vy -= (gliding ? 6 : 22) * dt;
      if (gliding) S.vy = Math.max(S.vy, -2.2);
    }
    S.pos.y = Math.max(ground, (S.pos.y || ground) + S.vy * dt);
    if (S.pos.y <= ground) {
      if (MOVE.wasAir && S.vy < -4) { MOVE.land = 0.2; G.audio.play('land'); if (S.vy < -9) cam.shake(Math.min(0.35, -S.vy * 0.02), 0.25); } // aterrizaje fuerte: aplastón y sacudida
      if (MOVE.flying && S.vy <= 0) MOVE.flying = false; // tocar suelo bajando termina el vuelo
      S.pos.y = ground; S.vy = 0;
      MOVE.coyote = 0.12; MOVE.airJumps = 1; MOVE.airDash = true; MOVE.wasAir = false;
    } else { MOVE.coyote = Math.max(0, MOVE.coyote - dt); MOVE.wasAir = true; }
    MOVE.land = Math.max(0, MOVE.land - dt);
    return moving;
  }

  return { MOVE, colliders, alturas, pushOut, removeColliders, tryJump, startFlying, toggleFly, tryDash, step,
    SPEED, RUN_SPEED, DASH_SPEED, FLY_SPEED, FLY_CEIL, SWIM_SPEED, SWIM_DEPTH };
});
