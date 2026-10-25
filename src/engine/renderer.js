/* AVE · renderer
   WebGL, color (sRGB + ACES, igual que el creador y el retrato), escena, luces, cielo y bucle principal.
   Bucle: update(dt) = reloj + G.fisica.step + gancho 'update'; render(dt) = G.camara.follow + gancho 'render' + G.camara.draw.
   Datos del pack: mundo.cielo { color, niebla: [cerca, lejos] }, mundo.luces { cielo, suelo, hemi, sol, solInt, solPos }, mundo.exposicion. */
AVE.module('renderer', function (G) {
  'use strict';
  const W = G.pack.mundo || {};
  const canvas = document.getElementById('game');
  // Presupuesto móvil (CTO_PLAN §3.2): DPR máximo 1,5 en pantallas táctiles y sin MSAA si el DPR real es 2 o más.
  // snapshot() renderiza y lee el lienzo en la misma tarea, así que no hace falta preserveDrawingBuffer.
  const MOBILE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const DEVICE_DPR = window.devicePixelRatio || 1;
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !(MOBILE && DEVICE_DPR >= 2), preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(DEVICE_DPR, MOBILE ? 1.5 : 2));
  // Los colores del mundo se escriben pensando en sRGB: linearize() los pasa a lineal una vez.
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = W.exposicion != null ? W.exposicion : 0.7; // ACES escala por 1/0,6
  const linDone = new WeakSet();
  function linMat(m) {
    if (!m || linDone.has(m)) return m;
    linDone.add(m);
    if (m.color) m.color.convertSRGBToLinear();
    if (m.emissive) m.emissive.convertSRGBToLinear();
    if (m.specular) m.specular.convertSRGBToLinear();
    if (m.map) m.map.encoding = THREE.sRGBEncoding;
    if (m.isSpriteMaterial) m.toneMapped = false; // renders oficiales: sin curva de tono
    return m;
  }
  function linearize(obj) { obj.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(linMat); }); return obj; }

  const cielo = W.cielo || {};
  const scene = new THREE.Scene();
  const SKY = new THREE.Color(cielo.color || '#bfe1d6');
  scene.background = SKY;
  const fogR = cielo.niebla || [55, 165];
  scene.fog = new THREE.Fog(SKY, fogR[0], fogR[1]);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  const L = W.luces || {};
  scene.add(new THREE.HemisphereLight(L.cielo || '#fff4dc', L.suelo || '#2f5a3a', L.hemi != null ? L.hemi : 0.95));
  const sun = new THREE.DirectionalLight(L.sol || '#ffe2b0', L.solInt != null ? L.solInt : 0.75);
  sun.position.set(...(L.solPos || [-30, 50, 20]));
  scene.add(sun);

  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize);
  resize();

  // ---------- Simulación y dibujo ----------
  function update(dt) {
    const S = G.S;
    S.clock += dt;
    const busy = G.ui.busy();
    const moving = G.fisica.step(dt, busy);
    G.emit('update', dt, busy, moving);
    return moving;
  }
  let t = 0;
  function render(dt, moving) {
    t += dt;
    G.camara.follow(dt);
    G.emit('render', dt, t, moving);
    G.camara.fov(dt);
    G.camara.draw(dt);
  }
  let last = performance.now();
  function frame(now) {
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    const juice = G.camara.juice;
    if (juice.hitStop > 0) { juice.hitStop -= dt; dt = 0; } // hit-stop de 60 ms al capturar
    const moving = update(dt);
    // Con un overlay opaco (el creador) el mundo no se dibuja: una sola escena por cuadro
    if (!G.ui.worldHidden()) render(dt, moving);
    requestAnimationFrame(frame);
  }
  function start() { requestAnimationFrame(frame); }

  // Foto del mundo desde la cámara colocada al instante, recortada a w×h (JPEG en data URL; null si falla)
  function snapshot(w, h, quality) {
    try {
      G.camara.place(true);
      renderer.render(scene, camera);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      const sw = canvas.width, sh = canvas.height, ar = w / h;
      let cw = sw, ch = sw / ar; if (ch > sh) { ch = sh; cw = sh * ar; }
      x.drawImage(canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
      return c.toDataURL('image/jpeg', quality);
    } catch (e) { return null; }
  }

  return { renderer, scene, camera, canvas, MOBILE, DEVICE_DPR, REDUCED, linMat, linearize, resize, update, render, start, snapshot, get t() { return t; } };
});
