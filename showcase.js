/* Amazona Verse · Taller de los Guardianes (escena 3D del creador de personaje)
   El personaje animado saluda, mira al jugador, celebra cada cambio y muestra la personalización en tiempo real. */
(function () {
  'use strict';

  let renderer, scene, camera, clock, ch = null, raf = 0, canvasEl, holder;
  let look = { x: 0, y: 0 }, spin = 0, yaw = 0, dragging = false, dragX = 0, idleTimer = 0, state = 'loading';
  let pendingLook = null;
  const listeners = [];
  function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); listeners.push([el, ev, fn, opt]); }

  function buildWorkshop() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#14251c');
    scene.fog = new THREE.Fog('#14251c', 7, 16);
    camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    scene.add(new THREE.HemisphereLight('#ffe9c4', '#1f3a2c', 0.35));
    const key = new THREE.SpotLight('#ffd9a0', 1.15, 14, Math.PI / 5, 0.5, 1.2);
    key.position.set(2.2, 4.2, 3.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
    scene.add(key); scene.add(key.target);
    const rim = new THREE.DirectionalLight('#9fd7ff', 0.6); rim.position.set(-3, 2.5, -2.5); scene.add(rim);
    const fill = new THREE.PointLight('#ffb36b', 0.4, 8); fill.position.set(-1.8, 1.4, 2); scene.add(fill);
    const wood = new THREE.MeshStandardMaterial({ color: '#6e4526', roughness: 0.85 });
    const woodDark = new THREE.MeshStandardMaterial({ color: '#3f2814', roughness: 0.9 });
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.16, 48), wood);
    deck.position.y = -0.08; deck.receiveShadow = true; scene.add(deck);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.03, 8, 64), new THREE.MeshStandardMaterial({ color: '#f2a03d', metalness: 0.6, roughness: 0.35 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.005; scene.add(ring);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), woodDark);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.16; floor.receiveShadow = true; scene.add(floor);
    for (let i = 0; i < 14; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.08), i % 2 ? wood : woodDark);
      plank.position.set(-3.25 + i * 0.5, 1.8, -2.6); plank.receiveShadow = true; scene.add(plank);
    }
    const bench = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.7), wood); top.position.y = 0.85; top.castShadow = top.receiveShadow = true; bench.add(top);
    for (const [x, z] of [[-0.8, -0.28], [0.8, -0.28], [-0.8, 0.28], [0.8, 0.28]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), woodDark); leg.position.set(x, 0.42, z); bench.add(leg);
    }
    const plan = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshStandardMaterial({ color: '#cfe3f0', roughness: 1 }));
    plan.rotation.set(-Math.PI / 2, 0, 0.15); plan.position.set(-0.3, 0.91, 0); bench.add(plan);
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 14), new THREE.MeshStandardMaterial({ color: '#c9d4d9', metalness: 0.8, roughness: 0.3 }));
    gear.position.set(0.45, 0.95, 0.05); gear.rotation.x = Math.PI / 2; bench.add(gear);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#2f8f4e', side: THREE.DoubleSide }));
    shade.position.set(0.7, 1.35, -0.1); bench.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a8' }));
    bulb.position.set(0.7, 1.28, -0.1); bench.add(bulb);
    bench.position.set(-2.1, -0.16, -1.6); bench.rotation.y = 0.5; scene.add(bench);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.3), wood); shelf.position.set(2.0, 1.9, -2.4); scene.add(shelf);
    const symbol = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 36), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#7a4a10', metalness: 0.4, roughness: 0.4 }));
    symbol.position.set(2.0, 2.3, -2.45); scene.add(symbol);
  }

  function resize() {
    const r = canvasEl.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    frameCamera();
  }
  function frameCamera() {
    const H = 1.7, narrow = camera.aspect < 0.9;
    camera.position.set(0.35, H * 0.62, narrow ? 5.4 : 4.3);
    camera.lookAt(0, H * 0.5, 0);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (ch) {
      ch.update(dt);
      if (!dragging) spin *= 0.9;
      yaw += spin * dt;
      yaw += (0 - yaw) * (dragging ? 0 : Math.min(1, dt * 0.8)); // vuelve a mirar al frente
      holder.rotation.y = yaw;
      const head = ch.bones.head || ch.bones.Head || ch.bones.cabeza;
      if (head) head.rotation.y += look.x * 0.45 - 0, head.rotation.x += look.y * 0.25;
      idleTimer += dt;
      if (idleTimer > 7) { idleTimer = 0; ch.play('Curious', true); }
    }
    renderer.render(scene, camera);
  }

  async function mount(canvas) {
    if (renderer) return;
    canvasEl = canvas;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.85;
    clock = new THREE.Clock();
    buildWorkshop();
    holder = new THREE.Group(); scene.add(holder);
    resize();
    on(window, 'resize', resize);
    on(canvas, 'pointermove', e => {
      const r = canvas.getBoundingClientRect();
      look.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      look.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      if (dragging) { spin = (e.clientX - dragX) * 0.3; dragX = e.clientX; }
      idleTimer = 0;
    });
    on(canvas, 'pointerdown', e => { dragging = true; dragX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    on(canvas, 'pointerup', () => { dragging = false; });
    on(canvas, 'pointerleave', () => { look.x = look.y = 0; dragging = false; });
    frame();
    try {
      ch = await window.AVCharacter.create();
      const s = 1.7 / ch.height; ch.root.scale.setScalar(s);
      holder.add(ch.root);
      ch.applyLook(pendingLook || window.AVCharacter.defaultLook());
      ch.play('Welcome', true);
      state = 'ready';
    } catch (e) { state = 'failed'; }
  }

  function setLook(l, celebrate) {
    pendingLook = l;
    if (!ch) return;
    ch.applyLook(l);
    if (celebrate) ch.play('Celebrate', true);
    idleTimer = 0;
  }

  function unmount() {
    cancelAnimationFrame(raf); raf = 0;
    for (const [el, ev, fn, opt] of listeners.splice(0)) el.removeEventListener(ev, fn, opt);
    if (renderer) { renderer.dispose(); }
    renderer = scene = camera = null; ch = null; state = 'loading';
  }

  window.AVShowcase = { mount, unmount, setLook, status: () => state, character: () => ch };
})();
