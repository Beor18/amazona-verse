/* Amazona Verse · Taller de los Guardianes (escena del creador de personaje)
   Muestra el modelo 3D animado (assets/models/vittata.glb) en una pose natural, que mira al jugador
   y cambia en tiempo real con la personalización. Si el modelo no carga, usa el render oficial. */
(function () {
  'use strict';

  const MODEL_URL = 'assets/models/vittata.glb';
  // Máscaras faciales por plumaje (base común del proyecto original + colores de cada especie)
  const SPECIES_COLORS = {
    vittata: { patch: '#d63a2f', ring: '#f4f4f0', wingTip: null },
    agilis: { patch: '#2f9e44', ring: '#e9efe9', wingTip: '#c0392b' },
    albifrons: { patch: '#f4f4f0', ring: '#d63a2f', wingTip: null },
    amazonica: { patch: '#2f6fd1', ring: '#f2c21a', wingTip: '#e8811a' },
    auropalliata: { patch: '#2f9e44', ring: '#e9efe9', wingTip: null, nape: '#f2c21a' },
    festiva: { patch: '#c0392b', ring: '#3a6fc4', wingTip: null },
    guildingii: { patch: '#e6b422', ring: '#f4f4f0', wingTip: '#2f6fd1' },
    oratrix: { patch: '#f2c21a', ring: '#f2c21a', wingTip: '#c0392b' },
    versicolor: { patch: '#2f5fd1', ring: '#2f5fd1', wingTip: '#2f5fd1' },
  };
  const OUTFIT_HEX = { naranja: '#f2a03d', rojo: '#d6403a', azul: '#3d8fb0', morado: '#7a4fb3', amarillo: '#e8c32a' };

  let renderer, scene, camera, clock, mixer, model, fallback, raf = 0, canvasEl;
  let headBone = null, neckBone = null, baseHeadQuat = null;
  const accessories = {};
  const look = { x: 0, y: 0 };
  let spin = 0, dragging = false, dragX = 0, loaded = false, failed = false, profile = null;
  const listeners = [];

  function on(el, ev, fn, opt) { el.addEventListener(ev, fn, opt); listeners.push([el, ev, fn, opt]); }

  function buildWorkshop() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#1b2f25');
    scene.fog = new THREE.Fog('#1b2f25', 9, 18);
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.25, 4.6);
    // Luz cálida de lámpara + luz fría de ventana + contraluz
    scene.add(new THREE.HemisphereLight('#ffe9c4', '#1f3a2c', 0.55));
    const key = new THREE.SpotLight('#ffd9a0', 1.35, 14, Math.PI / 5, 0.5, 1.2);
    key.position.set(2.2, 4.2, 3.2); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
    scene.add(key); scene.add(key.target);
    const rim = new THREE.DirectionalLight('#9fd7ff', 0.55); rim.position.set(-3, 2.5, -2.5); scene.add(rim);
    const fill = new THREE.PointLight('#ffb36b', 0.45, 8); fill.position.set(-1.8, 1.4, 2); scene.add(fill);
    const wood = new THREE.MeshStandardMaterial({ color: '#8a5a33', roughness: 0.85 });
    const woodDark = new THREE.MeshStandardMaterial({ color: '#5e3c22', roughness: 0.9 });
    // Plataforma giratoria de madera
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.16, 40), wood);
    deck.position.y = -0.08; deck.receiveShadow = true; scene.add(deck);
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.03, 8, 60), new THREE.MeshStandardMaterial({ color: '#f2a03d', metalness: 0.6, roughness: 0.35 }));
    rimRing.rotation.x = Math.PI / 2; rimRing.position.y = 0.005; scene.add(rimRing);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), woodDark);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.16; floor.receiveShadow = true; scene.add(floor);
    // Pared de tablas
    for (let i = 0; i < 14; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 0.08), i % 2 ? wood : woodDark);
      plank.position.set(-3.25 + i * 0.5, 1.8, -2.6); plank.receiveShadow = true; scene.add(plank);
    }
    // Banco de trabajo con herramientas y planos
    const bench = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.7), wood); top.position.y = 0.85; top.castShadow = top.receiveShadow = true;
    bench.add(top);
    for (const [x, z] of [[-0.8, -0.28], [0.8, -0.28], [-0.8, 0.28], [0.8, 0.28]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), woodDark); leg.position.set(x, 0.42, z); bench.add(leg);
    }
    const plan = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.42), new THREE.MeshStandardMaterial({ color: '#cfe3f0', roughness: 1 }));
    plan.rotation.x = -Math.PI / 2; plan.position.set(-0.3, 0.91, 0); plan.rotation.z = 0.15; bench.add(plan);
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 14), new THREE.MeshStandardMaterial({ color: '#c9d4d9', metalness: 0.8, roughness: 0.3 }));
    gear.position.set(0.45, 0.95, 0.05); gear.rotation.x = Math.PI / 2; bench.add(gear);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#2f8f4e', side: THREE.DoubleSide }));
    lampShade.position.set(0.7, 1.35, -0.1); bench.add(lampShade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a8' }));
    bulb.position.set(0.7, 1.28, -0.1); bench.add(bulb);
    bench.position.set(-2.1, -0.16, -1.6); bench.rotation.y = 0.5; scene.add(bench);
    // Estante con el símbolo de los 36 (pista del capítulo)
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.3), wood); shelf.position.set(2.0, 1.9, -2.4); scene.add(shelf);
    const symbol = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 8, 36), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#7a4a10', metalness: 0.4, roughness: 0.4 }));
    symbol.position.set(2.0, 2.3, -2.45); scene.add(symbol);
  }

  function findBones(root) {
    root.traverse(o => {
      if (!o.isBone) return;
      const n = o.name.toLowerCase();
      if (!headBone && /cabeza|head/.test(n)) headBone = o;
      if (!neckBone && /cuello|neck/.test(n)) neckBone = o;
    });
    if (headBone) baseHeadQuat = headBone.quaternion.clone();
  }

  // Material por nombre: el modelo trae materiales separados para parche, anillo de ojos y puntas de alas
  function recolor(sp) {
    if (!model) return;
    const c = SPECIES_COLORS[sp] || SPECIES_COLORS.vittata;
    model.traverse(o => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        const n = (m.name || '').toLowerCase();
        if (!m.userData.base) m.userData.base = m.color ? m.color.clone() : null;
        if (/patch|parche|mask|mascara/.test(n)) m.color.set(c.patch);
        else if (/ring|anillo/.test(n)) m.color.set(c.ring);
        else if (/wingtip|punta/.test(n)) { if (c.wingTip) m.color.set(c.wingTip); else if (m.userData.base) m.color.copy(m.userData.base); }
      }
    });
  }

  function makeAccessories() {
    const outfitMat = new THREE.MeshStandardMaterial({ color: '#f2a03d', roughness: 0.7 });
    const scarf = new THREE.Group();
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.22, 10, 32), outfitMat); band.rotation.x = Math.PI / 2; band.scale.set(1, 1, 0.8);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 3), outfitMat); knot.position.set(0, -0.45, 0.95); knot.rotation.x = Math.PI;
    scarf.add(band, knot); scarf.userData.mat = outfitMat;
    const frame = new THREE.MeshStandardMaterial({ color: '#3a2a1a', roughness: 0.5, metalness: 0.3 });
    const lensMat = new THREE.MeshPhysicalMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.35, roughness: 0.05 });
    const glasses = new THREE.Group();
    for (const x of [-0.42, 0.42]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 24), frame); rim.position.x = x; glasses.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), lensMat); lens.position.set(x, 0, 0.01); glasses.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), frame); bridge.rotation.z = Math.PI / 2; glasses.add(bridge);
    const cap = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), outfitMat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 20, 1, false, -Math.PI / 2, Math.PI), outfitMat); brim.position.set(0, 0, 0.55);
    cap.add(dome, brim); cap.userData.mat = outfitMat;
    const medal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), new THREE.MeshStandardMaterial({ color: '#ffd27a', metalness: 0.8, roughness: 0.25 }));
    medal.rotation.x = Math.PI / 2;
    Object.assign(accessories, { scarf, glasses, cap, medal, outfitMat });
  }

  // Coloca los adornos usando la caja del modelo (se ajustan a la escala real del personaje)
  function attachAccessories() {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()), min = box.min;
    const H = size.y, W = size.x;
    const headY = min.y + H * 0.78, neckY = min.y + H * 0.5;
    const front = box.max.z;
    const head = headBone || model, neck = neckBone || headBone || model;
    const toLocal = (obj, v) => obj.worldToLocal(v.clone());
    model.updateMatrixWorld(true);
    const place = (acc, parent, worldPos, scale) => {
      parent.add(acc); acc.position.copy(toLocal(parent, worldPos));
      const ps = new THREE.Vector3(); parent.getWorldScale(ps); acc.scale.setScalar(scale / ps.x);
    };
    place(accessories.scarf, neck, new THREE.Vector3(0, neckY, (box.min.z + front) / 2), W * 0.16);
    place(accessories.glasses, head, new THREE.Vector3(0, headY + H * 0.03, front - size.z * 0.12), W * 0.11);
    place(accessories.cap, head, new THREE.Vector3(0, box.max.y - H * 0.04, (box.min.z + front) / 2 - size.z * 0.05), W * 0.17);
    place(accessories.medal, neck, new THREE.Vector3(0, neckY - H * 0.05, front - size.z * 0.15), W * 0.2);
  }

  function applyProfile() {
    if (!profile) return;
    if (accessories.outfitMat) accessories.outfitMat.color.set(OUTFIT_HEX[profile.outfit] || '#f2a03d');
    if (accessories.scarf) {
      accessories.scarf.visible = true;
      accessories.glasses.visible = profile.accessory === 'gafas';
      accessories.cap.visible = profile.accessory === 'gorra';
      accessories.medal.visible = profile.accessory === 'medalla';
    }
    recolor(profile.preset);
    if (fallback && !loaded) fallback.material.map = new THREE.TextureLoader().load('assets/presets/' + profile.preset + '.png');
  }

  function loadModel() {
    if (!THREE.GLTFLoader) { failed = true; return; }
    new THREE.GLTFLoader().load(MODEL_URL, gltf => {
      model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const s = 1.7 / box.getSize(new THREE.Vector3()).y;
      model.scale.setScalar(s);
      const box2 = new THREE.Box3().setFromObject(model);
      model.position.y -= box2.min.y;
      model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(model);
      findBones(model);
      makeAccessories(); attachAccessories();
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        const clip = THREE.AnimationClip.findByName(gltf.animations, 'Idle') || gltf.animations[0];
        mixer.clipAction(clip).play();
        const wave = THREE.AnimationClip.findByName(gltf.animations, 'Wave');
        if (wave) {
          const a = mixer.clipAction(wave); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false;
          setTimeout(() => { if (mixer) { a.reset().fadeIn(0.3).play(); mixer.addEventListener('finished', () => a.fadeOut(0.4)); } }, 900);
        }
      }
      if (fallback) fallback.visible = false;
      loaded = true;
      applyProfile();
    }, undefined, () => { failed = true; });
  }

  function addFallback() {
    fallback = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.05 }));
    fallback.position.y = 0.95; scene.add(fallback);
  }

  function resize() {
    const r = canvasEl.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? 5.6 : 4.6;
    camera.updateProjectionMatrix();
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    if (mixer) mixer.update(dt);
    if (!dragging) spin *= 0.92;
    const target = model || fallback;
    if (target) target.rotation.y += spin * dt + (model ? 0 : 0);
    if (headBone && baseHeadQuat) {
      // Mirar al jugador: giro suave de la cabeza hacia el puntero, sobre la animación
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-look.y * 0.35, look.x * 0.6, 0));
      headBone.quaternion.multiply(q);
    }
    if (fallback && fallback.visible) { fallback.position.y = 0.95 + Math.sin(t * 2) * 0.03; fallback.lookAt(camera.position); }
    camera.lookAt(0, 0.9, 0);
    renderer.render(scene, camera);
  }

  function mount(canvas) {
    if (renderer) return;
    canvasEl = canvas;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    clock = new THREE.Clock();
    buildWorkshop(); addFallback(); applyProfile(); loadModel(); resize();
    on(window, 'resize', resize);
    on(canvas, 'pointermove', e => {
      const r = canvas.getBoundingClientRect();
      look.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      look.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      if (dragging) { spin = (e.clientX - dragX) * 0.25; dragX = e.clientX; }
    });
    on(canvas, 'pointerdown', e => { dragging = true; dragX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    on(canvas, 'pointerup', () => { dragging = false; });
    on(canvas, 'pointerleave', () => { look.x = look.y = 0; dragging = false; });
    frame();
  }

  function unmount() {
    cancelAnimationFrame(raf); raf = 0;
    for (const [el, ev, fn, opt] of listeners.splice(0)) el.removeEventListener(ev, fn, opt);
    if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
    renderer = scene = camera = mixer = model = fallback = null; headBone = neckBone = baseHeadQuat = null; loaded = failed = false;
  }

  function setProfile(p) { profile = Object.assign({}, p); applyProfile(); }
  function status() { return { loaded, failed, bones: !!headBone, animations: !!mixer }; }

  window.AVShowcase = { mount, unmount, setProfile, status };
})();
