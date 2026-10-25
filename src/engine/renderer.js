/* AVE · renderer
   WebGL, color (sRGB + ACES, igual que el creador y el retrato), escena, luces, cielo y bucle principal.
   Bucle: update(dt) = reloj + G.fisica.step + gancho 'update'; render(dt) = G.camara.follow + gancho 'render' + G.camara.draw.
   Datos del pack: mundo.cielo { color, niebla: [cerca, lejos] }, mundo.luces { cielo, suelo, hemi, sol, solInt, solPos }, mundo.exposicion. */
AVE.module('renderer', function (G) {
  'use strict';
  const W = G.pack.mundo || {};
  const canvas = document.getElementById('game');
  // ── Color, antialias y resolución: dueño TA de personaje (docs/equipo/COORDINACION.md). El resto del archivo es del
  //    programador gráfico. Si se cambia algo de este bloque, avisar al TA: el color de la ropa y la nitidez dependen de esto.
  // MSAA siempre (sin él, ropa, plumas y estampados se veían en escalera en móviles de DPR 2 o más) y DPR máximo 1,5 en
  // pantallas táctiles, 2 en escritorio (CTO_PLAN §3.2). Resolución dinámica: si los FPS caen, el DPR baja en pasos de 0,25
  // hasta 1 y vuelve a subir cuando sobra margen (adaptDPR, al principio del bucle). Cada cambio emite el gancho 'dpr'
  // (G.on('dpr', pr => …)) para que un post-proceso (EffectComposer) ajuste su tamaño. Un render target de post debe ser
  // WebGLMultisampleRenderTarget (o llevar FXAA): un target normal anula el MSAA del lienzo.
  // snapshot() renderiza y lee el lienzo en la misma tarea, así que no hace falta preserveDrawingBuffer.
  const MOBILE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const DEVICE_DPR = window.devicePixelRatio || 1;
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  const DPR_MAX = Math.min(DEVICE_DPR, MOBILE ? 1.5 : 2), DPR_MIN = Math.min(1, DPR_MAX);
  renderer.setPixelRatio(DPR_MAX);
  const dyn = { ms: 16.7, t: 0, slow: 0, fast: 0, lock: 0 };
  function adaptDPR(raw) {
    if (!(raw > 0 && raw < 100)) return;                     // pestaña oculta o pausa larga: no cuenta
    dyn.ms += (raw - dyn.ms) * 0.05; dyn.t += raw; dyn.lock = Math.max(0, dyn.lock - raw);
    if (dyn.t < 1000) return;
    dyn.t = 0;
    dyn.slow = dyn.ms > 20.5 ? dyn.slow + 1 : 0;               // < ~49 FPS sostenido
    dyn.fast = dyn.ms < 17.6 ? dyn.fast + 1 : 0;               // a tope de refresco
    const pr = renderer.getPixelRatio();
    if (dyn.slow >= 2 && pr > DPR_MIN) { renderer.setPixelRatio(Math.max(DPR_MIN, pr - 0.25)); dyn.slow = 0; dyn.lock = 20000; }
    else if (dyn.fast >= 6 && !dyn.lock && pr < DPR_MAX) { renderer.setPixelRatio(Math.min(DPR_MAX, pr + 0.25)); dyn.fast = 0; dyn.lock = 6000; }
    else return;
    G.emit('dpr', renderer.getPixelRatio());
  }
  // Salida sRGB + ACES (igual en el creador, el retrato y las miniaturas). El personaje y la ropa ya llegan en lineal (AVColor en
  // src/personaje/wardrobe.js); los colores del mundo se escriben pensando en sRGB y linearize() los pasa a lineal una vez.
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
    adaptDPR(now - last);
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
