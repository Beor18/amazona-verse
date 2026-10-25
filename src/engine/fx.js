/* AVE · efectos
   Partículas con límite para móvil (GDD: 200 vivas), anillos que se expanden, gotas, ráfagas por paleta
   (plumas, estrellas, burbujas, oro), cofre de recompensa, lluvia y guía (haz de luz sobre el objetivo y flecha sobre el jugador).
   Un pack añade paletas con G.fx.PALETTE.nombre = [colores]. */
AVE.module('fx', function (G) {
  'use strict';
  const S = G.S, scene = G.renderer.scene, linMat = G.renderer.linMat;
  const fx = [];
  let liveParticles = 0;
  const MAX_PARTICLES = 200;
  const PALETTE = { feathers: ['#2f8f4e', '#7fd38f', '#d6403a', '#3d8fb0', '#f2a03d'], stars: ['#d6403a', '#ffffff', '#0a50a1'], bubbles: ['#e6f7ff'], gold: ['#ffd84a', '#fff3b0', '#f2a03d'] };

  function ringFx(x, y, z, size, life, op) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.5, 32), linMat(new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.03, z); scene.add(m);
    fx.push({ m, t: 0, life, size, op });
  }
  function drops(x, y, z, s, floorY) {
    const n = 18, pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos.set([x, y + 0.1, z], i * 3);
      const a = Math.random() * Math.PI * 2, sp = (1.5 + Math.random() * 2) * s;
      vel.push([Math.cos(a) * sp, (3 + Math.random() * 3) * s, Math.sin(a) * sp]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, linMat(new THREE.PointsMaterial({ color: '#dff3ff', size: 0.16, transparent: true, opacity: 0.9, depthWrite: false })));
    scene.add(p); fx.push({ m: p, t: 0, life: 0.9, vel, y0: floorY, op: 0.9 });
  }
  // Ráfaga de plumas, estrellas de la bandera, burbujas o chispas doradas
  function burst(x, y, z, kind, n, ceil) {
    n = Math.min(n || 24, MAX_PARTICLES - liveParticles); if (n <= 0) return;
    const pal = PALETTE[kind] || PALETTE.feathers, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), vel = [], c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos.set([x + (kind === 'bubbles' ? (Math.random() - 0.5) * 0.5 : 0), y, z + (kind === 'bubbles' ? (Math.random() - 0.5) * 0.5 : 0)], i * 3);
      c.set(pal[i % pal.length]).convertSRGBToLinear(); col.set([c.r, c.g, c.b], i * 3);
      const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 2.5;
      vel.push(kind === 'bubbles' ? [(Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3] : [Math.cos(a) * sp, 2.5 + Math.random() * 3.5, Math.sin(a) * sp]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: kind === 'bubbles' ? 0.14 : 0.26, vertexColors: true, transparent: true, opacity: 1, depthWrite: false }));
    scene.add(p); liveParticles += n;
    fx.push({ m: p, t: 0, n, life: kind === 'bubbles' ? 1.8 : 1.3, vel, y0: -Infinity, ceil: ceil != null ? ceil : null, op: 1,
      grav: kind === 'bubbles' ? -0.6 : kind === 'feathers' ? 4 : 9, drag: kind === 'feathers' ? 2.2 : 0 });
  }
  // Cofre de recompensa: aparece frente al jugador, abre la tapa y suelta plumas y estrellas
  function rewardChest() {
    const g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: new THREE.Color('#a8743f').convertSRGBToLinear() });
    const gold = new THREE.MeshLambertMaterial({ color: new THREE.Color('#ffd84a').convertSRGBToLinear(), emissive: new THREE.Color('#5a3a00').convertSRGBToLinear() });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.55), wood); box.position.y = 0.25; g.add(box);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.57), gold); band.position.y = 0.42; g.add(band);
    const hinge = new THREE.Group(); hinge.position.set(0, 0.5, -0.275); g.add(hinge);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.55), wood); lid.position.set(0, 0.07, 0.275); hinge.add(lid);
    const fxX = S.pos.x + S.facing.x * 1.6, fxZ = S.pos.z + S.facing.z * 1.6, gy = G.terreno.surfaceY(fxX, fxZ);
    g.position.set(fxX, Math.max(gy, S.pos.y), fxZ); g.rotation.y = Math.atan2(-S.facing.x, -S.facing.z);
    scene.add(g);
    let popped = false;
    fx.push({ m: g, t: 0, life: 2.4, anim: (f, k) => {
      g.scale.setScalar(k < 0.15 ? k / 0.15 * 1.15 : k > 0.85 ? Math.max(0.001, (1 - k) / 0.15) : 1);
      hinge.rotation.x = -Math.min(1.9, Math.max(0, (k - 0.2) * 8));
      if (!popped && k > 0.3) { popped = true; burst(g.position.x, g.position.y + 0.6, g.position.z, 'feathers', 30); burst(g.position.x, g.position.y + 0.6, g.position.z, 'stars', 18); }
    } });
  }
  function update(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.t += dt; const k = f.t / f.life;
      if (f.anim) f.anim(f, Math.min(1, k));
      else if (f.vel) {
        const a = f.m.geometry.attributes.position, grav = f.grav != null ? f.grav : 14, drag = f.drag ? Math.exp(-f.drag * dt) : 1;
        f.vel.forEach((v, j) => {
          v[0] *= drag; v[2] *= drag; v[1] -= grav * dt;
          let y = Math.max(f.y0, a.getY(j) + v[1] * dt); if (f.ceil != null) y = Math.min(f.ceil, y);
          a.setXYZ(j, a.getX(j) + v[0] * dt, y, a.getZ(j) + v[2] * dt);
        });
        a.needsUpdate = true;
      } else f.m.scale.setScalar(0.4 + k * f.size * 2);
      if (!f.anim) f.m.material.opacity = (1 - k) * f.op;
      if (k >= 1) {
        scene.remove(f.m); liveParticles -= f.n || 0;
        f.m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        fx.splice(i, 1);
      }
    }
  }

  // ---------- Lluvia (la enciende un pack con G.fx.rain.visible = true) ----------
  const RAIN_N = 900, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 60; rainPos[i * 3 + 1] = Math.random() * 25; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#cfe6f0', size: 0.15, transparent: true, opacity: 0.7 }));
  rain.visible = false; scene.add(rain);
  function updateRain(dt) {
    if (!rain.visible) return;
    const a = rain.geometry.attributes.position;
    for (let i = 0; i < RAIN_N; i++) { let y = a.getY(i) - 28 * dt; if (y < 0) y += 25; a.setY(i, y); }
    a.needsUpdate = true;
    rain.position.set(S.pos.x, G.terreno.height(S.pos.x, S.pos.z), S.pos.z);
  }

  // ---------- Guía: haz de luz sobre el objetivo y flecha sobre el jugador (GDD §1: siempre hay un objetivo visible) ----------
  const guideBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 40, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#fff1b0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  guideBeam.visible = false; scene.add(guideBeam);
  const arrowGeo = new THREE.ConeGeometry(0.2, 0.55, 12); arrowGeo.rotateX(Math.PI / 2);
  const guideArrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: '#f2a03d' }));
  guideArrow.visible = false; scene.add(guideArrow);
  // tg = { x, z, y? } o null
  function guide(tg, now) {
    guideBeam.visible = !!tg; guideArrow.visible = false;
    if (!tg) return;
    const gy = tg.y != null ? tg.y - 20 : G.terreno.height(tg.x, tg.z) + 20;
    guideBeam.position.set(tg.x, gy, tg.z);
    guideBeam.material.opacity = 0.16 + Math.sin(now * 3) * 0.06;
    const d = Math.hypot(tg.x - S.pos.x, tg.z - S.pos.z);
    if (d > 4) {
      guideArrow.visible = true;
      guideArrow.position.set(S.pos.x + (tg.x - S.pos.x) / d * 0.9, S.pos.y + 2.75 + Math.sin(now * 4) * 0.06, S.pos.z + (tg.z - S.pos.z) / d * 0.9);
      guideArrow.lookAt(tg.x, tg.y != null ? tg.y : guideArrow.position.y, tg.z);
    }
  }

  G.on('render', dt => update(dt), 30);
  G.on('render', dt => updateRain(dt), 40);
  G.on('apply', () => { rain.visible = false; }, 40);

  return { list: fx, ringFx, drops, burst, rewardChest, update, rain, guide, guideBeam, guideArrow, PALETTE, MAX_PARTICLES, get live() { return liveParticles; } };
});
