/* AVE · efectos
   Partículas con límite para móvil (GDD: 200 vivas), anillos que se expanden, gotas, ráfagas por paleta
   (plumas, estrellas, burbujas, oro), cofre de recompensa, lluvia y guía (haz de luz sobre el objetivo y flecha sobre el jugador).
   Un pack añade paletas con G.fx.PALETTE.nombre = [colores].
   Recoger y descubrir (MODERNIZACION_2026 ficha 26-I): las ráfagas usan sprites con brillo de un atlas de 256 px dibujado al
   cargar (estrella, pluma, burbuja); recoger() suma un anillo de luz que sube y saltar(el) hace saltar la cifra del HUD;
   al descubrir un lugar ('lugar'), destello suave, título grande 1,5 s y el acorde 'descubrir' de audio.js.
   prefers-reduced-motion quita el destello y los saltos; el título sale sin animación. */
AVE.module('fx', function (G) {
  'use strict';
  const S = G.S, scene = G.renderer.scene, linMat = G.renderer.linMat;
  const fx = [];
  let liveParticles = 0;
  const MAX_PARTICLES = 200;
  const PALETTE = { feathers: ['#2f8f4e', '#7fd38f', '#d6403a', '#3d8fb0', '#f2a03d'], stars: ['#d6403a', '#ffffff', '#0a50a1'], bubbles: ['#e6f7ff'], gold: ['#ffd84a', '#fff3b0', '#f2a03d'] };

  // Atlas de 256 px (2×2 celdas de 128): estrella de 4 puntas con halo, pluma, burbuja y punto suave
  const ATLAS = (function () {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const halo = (cx, cy, r, a) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    // estrella
    halo(64, 64, 60, 0.55); x.fillStyle = '#fff'; x.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? 11 : 50; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
    x.closePath(); x.fill(); halo(64, 64, 18, 1);
    // pluma: lámina curva con raquis más claro
    halo(192, 64, 58, 0.25); x.save(); x.translate(192, 64); x.rotate(-0.6); x.fillStyle = 'rgba(255,255,255,0.92)';
    x.beginPath(); x.moveTo(0, -48); x.bezierCurveTo(26, -26, 22, 26, 0, 48); x.bezierCurveTo(-22, 26, -26, -26, 0, -48); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, -46); x.lineTo(0, 56); x.stroke(); x.restore();
    // burbuja: anillo con reflejo
    x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 7; x.beginPath(); x.arc(64, 192, 40, 0, Math.PI * 2); x.stroke();
    halo(64, 192, 44, 0.18); x.fillStyle = '#fff'; x.beginPath(); x.ellipse(50, 176, 10, 6, -0.7, 0, Math.PI * 2); x.fill();
    // punto suave
    halo(192, 192, 56, 1);
    return c;
  })();
  const SPRITE = {}; // celda del atlas por tipo de ráfaga (texturas que comparten la misma imagen)
  function sprite(kind) {
    const celda = kind === 'bubbles' ? [0, 0] : kind === 'feathers' ? [1, 1] : kind === 'gold' ? [1, 0] : [0, 1];
    const k = celda.join();
    if (!SPRITE[k]) { const t = new THREE.CanvasTexture(ATLAS); t.repeat.set(0.5, 0.5); t.offset.set(celda[0] * 0.5, celda[1] * 0.5); SPRITE[k] = t; }
    return SPRITE[k];
  }
  const reducido = () => !!G.renderer.REDUCED;

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
    // Sprites del atlas: estrellas y oro suman luz (brillan); plumas y burbujas, mezcla normal para no perder el color
    const brilla = kind !== 'feathers' && kind !== 'bubbles';
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: kind === 'bubbles' ? 0.22 : 0.42, map: sprite(kind), vertexColors: true, transparent: true, opacity: 1, depthWrite: false,
      blending: brilla ? THREE.AdditiveBlending : THREE.NormalBlending }));
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
        f.m.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); // el atlas no se libera: es compartido
        fx.splice(i, 1);
      }
    }
  }

  // ---------- Recoger y descubrir (ficha 26-I) ----------
  // Anillo de luz que sube y se abre (0,7 s), aditivo
  function luzSube(x, y, z, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(color || '#fff3b0').convertSRGBToLinear(), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m);
    fx.push({ m, t: 0, life: 0.7, anim: (f, k) => { m.position.y = y + k * 1.4; m.scale.setScalar(0.6 + k * 1.2); m.material.opacity = 0.9 * (1 - k) * Math.min(1, k * 6); } });
  }
  // Recoger: ráfaga de sprites + anillo de luz (el hit-stop y el sonido los pone quien llama)
  function recoger(x, y, z, kind, n, ceil) { burst(x, y, z, kind, n, ceil); if (kind !== 'bubbles') luzSube(x, y - 0.4, z); }
  // La cifra del HUD salta (escala con rebote, 0,35 s); con prefers-reduced-motion no se mueve
  function saltar(el) {
    if (!el || reducido() || !el.animate) return false;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.45)', offset: 0.35 }, { transform: 'scale(0.94)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 350, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    return true;
  }
  // Descubrir un lugar: destello suave a pantalla completa, título grande 1,5 s y acorde corto
  let capa = null;
  function descubrimiento(nombre) {
    if (!capa) {
      capa = document.createElement('div'); capa.id = 'fx-descubre'; capa.setAttribute('aria-hidden', 'true');
      capa.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:40;display:none;align-items:flex-start;justify-content:center;padding-top:18vh;' +
        'background:radial-gradient(ellipse at 50% 40%,rgba(255,250,225,.55),rgba(255,250,225,0) 70%);';
      capa.innerHTML = '<div style="text-align:center;color:#fff;text-shadow:0 2px 10px rgba(0,40,30,.65),0 0 2px rgba(0,0,0,.6);font-weight:800;line-height:1.1">' +
        '<div class="fx-d1" style="font-size:clamp(14px,2.2vw,20px);letter-spacing:.18em;text-transform:uppercase;opacity:.9">Descubriste</div>' +
        '<div class="fx-d2" style="font-size:clamp(28px,6vw,56px)"></div></div>';
      document.body.appendChild(capa);
    }
    capa.querySelector('.fx-d2').textContent = nombre || '';
    capa.style.display = 'flex';
    if (capa.getAnimations) capa.getAnimations().forEach(a => a.cancel());
    clearTimeout(capa._t); capa._t = setTimeout(() => { capa.style.display = 'none'; }, 1500);
    if (!reducido() && capa.animate) {
      capa.animate([{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1500, easing: 'ease-out' });
      capa.firstChild.animate([{ transform: 'translateY(12px) scale(.92)' }, { transform: 'translateY(0) scale(1)', offset: 0.2 }, { transform: 'translateY(0) scale(1)' }], { duration: 1500, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    }
    if (G.audio && G.audio.has && G.audio.has('descubrir')) G.audio.play('descubrir');
    return capa;
  }
  G.on('lugar', d => { if (!G.quiet) descubrimiento(d && d.nombre); });

  // ---------- Lluvia (la enciende un pack con G.fx.rain.visible = true) ----------
  const RAIN_N = 900, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 60; rainPos[i * 3 + 1] = Math.random() * 25; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#cfe6f0', size: 0.15, transparent: true, opacity: 0.7 }));
  rain.visible = false; scene.add(rain);
  function updateRain(dt) {
    if (!rain.visible) return;
    const a = rain.geometry.attributes.position;
    for (let i = 0, n = Math.min(RAIN_N, rain.geometry.drawRange.count); i < n; i++) { let y = a.getY(i) - 28 * dt; if (y < 0) y += 25; a.setY(i, y); }
    a.needsUpdate = true;
    rain.position.set(S.pos.x, G.terreno.height(S.pos.x, S.pos.z), S.pos.z);
  }

  // ---------- Guía: haz de luz sobre el objetivo y flecha sobre el jugador (GDD §1: siempre hay un objetivo visible) ----------
  const guideBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 40, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#fff1b0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  guideBeam.visible = false; scene.add(guideBeam);
  const arrowGeo = new THREE.ConeGeometry(0.2, 0.55, 12); arrowGeo.rotateX(Math.PI / 2);
  const guideArrow = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({ color: '#f2a03d' }));
  guideArrow.visible = false; scene.add(guideArrow);
  // tg = { x, z, y? } o null. Modo relajado (src/game/accesibilidad.js): el haz brilla más y la flecha, más grande, se ve también de cerca
  function guide(tg, now) {
    guideBeam.visible = !!tg; guideArrow.visible = false;
    if (!tg) return;
    const relajado = !!(G.accesibilidad && G.accesibilidad.relajado && G.accesibilidad.relajado());
    const gy = tg.y != null ? tg.y - 20 : G.terreno.height(tg.x, tg.z) + 20;
    guideBeam.position.set(tg.x, gy, tg.z);
    // Con la cámara pegada al haz, el cilindro aditivo tapaba media pantalla (QA-22): se desvanece entre 8 y 2,5 m del eje
    const cp = G.renderer.camera.position, cerca = THREE.MathUtils.smoothstep(Math.hypot(cp.x - tg.x, cp.z - tg.z), 2.5, 8);
    guideBeam.visible = cerca > 0.01;
    guideBeam.material.opacity = (0.16 + Math.sin(now * 3) * 0.06) * cerca * (relajado ? 1.8 : 1);
    const d = Math.hypot(tg.x - S.pos.x, tg.z - S.pos.z);
    if (d > (relajado ? 1.5 : 4)) {
      guideArrow.visible = true; guideArrow.scale.setScalar(relajado ? 1.4 : 1);
      guideArrow.position.set(S.pos.x + (tg.x - S.pos.x) / d * 0.9, S.pos.y + 2.75 + Math.sin(now * 4) * 0.06, S.pos.z + (tg.z - S.pos.z) / d * 0.9);
      guideArrow.lookAt(tg.x, tg.y != null ? tg.y : guideArrow.position.y, tg.z);
    }
  }

  G.on('render', dt => update(dt), 30);
  G.on('render', dt => updateRain(dt), 40);
  G.on('apply', () => { rain.visible = false; }, 40);

  return { list: fx, ringFx, drops, burst, rewardChest, update, rain, guide, guideBeam, guideArrow, PALETTE, MAX_PARTICLES, get live() { return liveParticles; },
    ATLAS, sprite, luzSube, recoger, saltar, descubrimiento };
});
