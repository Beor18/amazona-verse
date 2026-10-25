/* PoC Amazona Verse en Three.js r128 (motor actual), mismo guion que la PoC de Godot (poc/godot/proj).
   Cotorra original (vittata.glb) · movimiento 3D · cámara · Walk/Idle · accesorio intercambiable (ropa con piel
   re-enlazada al esqueleto por nombre de hueso) · huevo que se bambolea, saca patitas y camina · guardado atómico.
   Pruebas: window.pocTest() (también con ?test=1 escribe RESULT> en #result, para Chrome sin interfaz). ?bench=1 mide FPS. */
(function () {
  'use strict';
  const P = new URLSearchParams(location.search);
  const BENCH_CAP = P.get('bench') === '1';
  const SAVE = 'poc.save', ALTURA = 1.75, SPEED = 6.5;
  const ACC = { gorra: 'assets/gorra.glb', sombrero: 'assets/sombrero_paja.glb' };
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: BENCH_CAP });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc7e8);
  const cam = new THREE.PerspectiveCamera(55, 1, 0.05, 300);
  scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x5a7a3a, 0.9));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(6, 10, 4); sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  scene.add(sol, sol.target);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x528c40 }));
  suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; scene.add(suelo);

  const S = { player: new THREE.Group(), model: null, skel: null, mixer: null, clips: {}, actions: {}, clip: '',
    accId: '', accMesh: null, huevo: null, cuerpo: null, patas: [], eclosion: 0, eclosionando: false, t: 0, input: null };
  scene.add(S.player);
  const loader = new THREE.GLTFLoader();
  const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));

  // ---------- Cotorra ----------
  const listo = load('assets/vittata.glb').then(g => {
    S.model = g.scene; S.model.scale.setScalar(ALTURA / 1.4);
    S.model.traverse(o => { if (o.isSkinnedMesh) { S.skel = o.skeleton; o.castShadow = true; o.frustumCulled = false; } });
    S.player.add(S.model);
    S.mixer = new THREE.AnimationMixer(S.model);
    for (const c of g.animations) S.clips[c.name] = c;
    play('Idle', 0);
    huevoNuevo();
  });
  function play(name, fade) {
    if (S.clip === name) return;
    const a = S.actions[name] || (S.actions[name] = S.mixer.clipAction(S.clips[name]));
    a.reset().play();
    const prev = S.actions[S.clip];
    if (prev && fade) prev.crossFadeTo(a, fade, false); else if (prev) prev.stop();
    S.clip = name;
  }

  // ---------- Accesorio: SkinnedMesh del .glb de ropa re-enlazada al esqueleto de la cotorra por nombre ----------
  function quitarAcc() {
    if (!S.accMesh) return;
    S.accMesh.parent.remove(S.accMesh);
    S.accMesh.geometry.dispose();
    (Array.isArray(S.accMesh.material) ? S.accMesh.material : [S.accMesh.material]).forEach(m => m.dispose());
    S.accMesh = null; S.accId = '';
  }
  async function ponerAcc(id) {
    quitarAcc();
    if (!id) return true;
    if (!ACC[id]) return false;
    const g = await load(ACC[id]);
    let sm = null; g.scene.traverse(o => { if (o.isSkinnedMesh && !sm) sm = o; });
    if (!sm) return false;
    const byName = {}; S.skel.bones.forEach(b => { byName[b.name] = b; });
    const bones = sm.skeleton.bones.map(b => byName[b.name]);
    if (bones.some(b => !b)) return false;
    const skeleton = new THREE.Skeleton(bones, sm.skeleton.boneInverses.map(m => m.clone()));
    const mesh = new THREE.SkinnedMesh(sm.geometry, sm.material);
    mesh.castShadow = true; mesh.frustumCulled = false;
    S.skel.bones[0].parent.add(mesh);           // mismo espacio que la malla del cuerpo
    mesh.bind(skeleton, sm.bindMatrix.clone());
    S.accMesh = mesh; S.accId = id;
    return true;
  }

  // ---------- Huevo ----------
  function huevoNuevo() {
    S.huevo = new THREE.Group(); S.huevo.position.set(2.5, 0, 1.5);
    S.cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), new THREE.MeshStandardMaterial({ color: 0xf5f0e0, roughness: 0.6 }));
    S.cuerpo.scale.y = 0.78 / 0.56; S.cuerpo.position.y = 0.39; S.cuerpo.castShadow = true; S.huevo.add(S.cuerpo);
    const mp = new THREE.MeshStandardMaterial({ color: 0xee9e33 });
    for (const lado of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.16, 10), mp);
      p.position.set(0.1 * lado, 0.06, 0); p.scale.setScalar(0.001); S.huevo.add(p); S.patas.push(p);
    }
    scene.add(S.huevo);
  }
  function huevo(dt) {
    if (S.eclosionando && S.eclosion < 1) S.eclosion = Math.min(1, S.eclosion + dt / 1.2);
    const s = Math.max(0.001, S.eclosion);
    S.patas.forEach(p => p.scale.setScalar(s));
    S.cuerpo.position.y = 0.39 + 0.12 * S.eclosion;
    S.cuerpo.rotation.z = Math.sin(S.t * 7) * (S.eclosion < 1 ? 0.18 : 0.06);
    if (S.eclosion >= 1) {
      const a = S.t * 0.6; S.huevo.position.set(2.5 + Math.cos(a) * 0.8, 0, 1.5 + Math.sin(a) * 0.8); S.huevo.rotation.y = -a;
      S.patas.forEach((p, i) => { p.rotation.x = Math.sin(S.t * 10 + Math.PI * i) * 0.5; });
    }
  }

  // ---------- Entrada, movimiento y cámara ----------
  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = true; });
  addEventListener('keyup', e => { keys[e.code] = false; });
  const BENCH = P.get('bench') === '1';
  function paso(dt) {
    S.t += dt;
    let vx, vz;
    if (S.input) [vx, vz] = S.input;
    else if (BENCH) { vx = Math.sin(S.t * 0.5); vz = -Math.cos(S.t * 0.5); }
    else { vx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); vz = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0); }
    let len = Math.hypot(vx, vz); if (len > 1) { vx /= len; vz /= len; len = 1; }
    S.player.position.x += vx * SPEED * dt; S.player.position.z += vz * SPEED * dt;
    S.player.position.y = 0;                   // suelo plano: sin motor de física, como el juego (colisiones propias)
    const mov = len > 0.1;
    if (mov) {
      const target = Math.atan2(vx, vz); let d = target - S.player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      S.player.rotation.y += d * Math.min(1, dt * 12);
      S.mixer.timeScale = THREE.MathUtils.clamp(len * SPEED / 3, 0.6, 2.5);
    } else S.mixer.timeScale = 1;
    play(mov ? 'Walk' : 'Idle', 0.2);
    S.mixer.update(dt);
    huevo(dt);
    const obj = S.player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    cam.position.lerp(obj.clone().add(new THREE.Vector3(0, 2.4, -5.5)), Math.min(1, dt * 6));
    cam.lookAt(obj);
    sol.position.copy(S.player.position).add(new THREE.Vector3(6, 10, 4)); sol.target.position.copy(S.player.position);
  }
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    }
  }
  let last = performance.now(), manual = false;
  const bench = { n: 0, ms: [], draw: [], tris: [] };
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!S.mixer || manual) return;
    paso(dt); resize(); renderer.render(scene, cam);
    if (BENCH) benchStep(now);
  }
  if (P.get('test') !== '1') requestAnimationFrame(frame);   // en modo prueba el reloj lo avanza pocTest
  let prevNow = 0;
  function benchStep(now) {
    bench.n++;
    if (bench.n === 30) { ponerAcc('gorra'); S.eclosionando = true; }
    if (bench.n > 120) { bench.ms.push(now - prevNow); bench.draw.push(renderer.info.render.calls); bench.tris.push(renderer.info.render.triangles); }
    prevNow = now;
    if (bench.n === 700) {
      const avg = a => a.reduce((s, x) => s + x, 0) / a.length, sorted = bench.ms.slice().sort((a, b) => a - b);
      window.BENCH = { fps_medio: 1000 / avg(bench.ms), fps_min: 1000 / sorted[sorted.length - 1], p95_ms: sorted[Math.floor(sorted.length * 0.95)],
        draw_calls: avg(bench.draw), triangulos: avg(bench.tris), heapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null,
        geometrias: renderer.info.memory.geometries, texturas: renderer.info.memory.textures, programas: renderer.info.programs.length, pixelRatio: renderer.getPixelRatio(),
        lienzo: [canvas.width, canvas.height] };
      document.getElementById('result').textContent = 'BENCH> ' + JSON.stringify(window.BENCH);
      fetch('__result', { method: 'POST', body: JSON.stringify(Object.assign({ bench: true }, window.BENCH)) }).catch(() => {});
      renderer.domElement.toBlob(b => fetch('__result?captura', { method: 'POST', body: b }).catch(() => {}));
    }
  }

  // ---------- Guardado (localStorage: .tmp verificado → principal) ----------
  const estado = () => ({ v: 1, pos: [S.player.position.x, S.player.position.y, S.player.position.z], rotY: S.player.rotation.y, accesorio: S.accId, eclosion: S.eclosion });
  function guardar() {
    try {
      const s = JSON.stringify(estado()); localStorage.setItem(SAVE + '.tmp', s);
      if (localStorage.getItem(SAVE + '.tmp') !== s) return false;
      localStorage.setItem(SAVE, s); localStorage.removeItem(SAVE + '.tmp'); return true;
    } catch (e) { return false; }
  }
  async function cargar() {
    let d; try { d = JSON.parse(localStorage.getItem(SAVE)); } catch (e) { return false; }
    if (!d || d.v !== 1) return false;
    S.player.position.fromArray(d.pos); S.player.rotation.y = d.rotY; await ponerAcc(d.accesorio);
    S.eclosion = d.eclosion; S.eclosionando = d.eclosion > 0; return true;
  }
  function reiniciar() { S.player.position.set(0, 0, 0); S.player.rotation.y = 0; quitarAcc(); S.eclosion = 0; S.eclosionando = false; }

  // ---------- Pruebas (mismo guion que tests/run_tests.gd) ----------
  async function pocTest() {
    await listo; manual = true;                    // las pruebas avanzan el reloj a mano: deterministas aunque la pestaña no pinte
    const t0 = performance.now(), out = { ok: 0, total: 0, fallos: [] };
    const check = (n, c, det) => { out.total++; if (c) out.ok++; else out.fallos.push(n + (det ? ' (' + det + ')' : '')); };
    const frames = n => { for (let i = 0; i < n; i++) paso(1 / 60); };
    const names = Object.keys(S.clips);
    check('Modelo de la cotorra cargado', !!S.model);
    check('Esqueleto de 60 huesos', S.skel && S.skel.bones.length === 60, S.skel && S.skel.bones.length);
    check('Huesos de montaje presentes', !!S.skel.getBoneByName('mount_head_top') && !!S.skel.getBoneByName('mount_eyes'));
    check('5 animaciones originales', names.length === 5 && names.includes('Walk'), names.join());
    const p0 = S.player.position.clone(), c0 = cam.position.clone(), hueso = S.skel.getBoneByName('armL1');
    S.input = [0, -1]; frames(60);
    const p1 = S.player.position.clone();
    check('Se mueve en 3D (≥ 4 m en 1 s)', p0.distanceTo(p1) >= 4, p0.distanceTo(p1).toFixed(2));
    check('Queda sobre el suelo', Math.abs(p1.y) < 0.15);
    check('Reproduce Walk al moverse', S.clip === 'Walk', S.clip);
    const q1 = hueso.quaternion.clone(); frames(8);
    check('El esqueleto se anima', q1.angleTo(hueso.quaternion) > 0.001, q1.angleTo(hueso.quaternion).toFixed(4));
    check('La cámara sigue al jugador', cam.position.distanceTo(c0) > 3 && cam.position.distanceTo(p1) < 9);
    S.input = [0, 0]; frames(30);
    check('Vuelve a Idle al parar', S.clip === 'Idle', S.clip);
    check('Pone la gorra', await ponerAcc('gorra') && !!S.accMesh);
    check('La gorra queda enlazada al esqueleto de la cotorra', S.accMesh.skeleton.bones.every(b => S.skel.bones.includes(b)));
    check('Cambia a sombrero (la gorra se libera)', await ponerAcc('sombrero') && S.accId === 'sombrero');
    renderer.render(scene, cam);
    const g0 = renderer.info.memory.geometries;
    for (let i = 0; i < 10; i++) { await ponerAcc(i % 2 ? 'sombrero' : 'gorra'); renderer.render(scene, cam); }
    check('10 cambios sin fuga de geometrías', renderer.info.memory.geometries === g0, g0 + ' → ' + renderer.info.memory.geometries);
    const h0 = S.huevo.position.clone();
    check('Huevo sin patitas al principio', S.patas[0].scale.x < 0.01);
    const r1 = S.cuerpo.rotation.z; frames(6);
    check('El huevo se bambolea', Math.abs(S.cuerpo.rotation.z - r1) > 0.01);
    S.eclosionando = true; frames(90);
    check('Eclosión: patitas a escala 1', S.patas[0].scale.x > 0.99, S.patas[0].scale.x.toFixed(3));
    frames(30);
    check('El pichón camina', S.huevo.position.distanceTo(h0) > 0.05);
    await ponerAcc('gorra');
    const antes = JSON.stringify(estado());
    check('Guarda (escritura .tmp → final)', guardar());
    reiniciar();
    check('Reiniciar limpia el estado', S.accId === '' && S.player.position.length() < 0.01);
    check('Carga la partida', await cargar());
    check('Restaura posición, accesorio y eclosión', JSON.stringify(estado()) === antes, JSON.stringify(estado()));
    localStorage.setItem(SAVE, '{roto');
    check('Partida dañada se rechaza sin romper', !(await cargar()));
    out.ms = Math.round(performance.now() - t0);
    manual = false;
    return out;
  }
  window.POC = { S, ponerAcc, guardar, cargar, reiniciar, renderer, scene };
  window.pocTest = pocTest;
  const informar = r => { document.getElementById('result').textContent = 'RESULT> ' + JSON.stringify(r);
    fetch('__result', { method: 'POST', body: JSON.stringify(r) }).catch(() => {}); };   // srv_poc.py lo guarda (CLI sin interfaz)
  if (P.get('test') === '1') pocTest().then(informar, e => informar({ error: String(e && e.stack || e) }));
})();
