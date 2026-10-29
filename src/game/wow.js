/* Juego · momentos «wow» del capítulo 1 (BM20; GDD §6, CAP1_PENDIENTE hito 20)
   - Despegue del mirador: al usar el mirador (content/cap1/historia.js useMirador) la cámara se abre 4 s (FOV +10, G.camara.fovBonus),
     suena el viento, caen hojas y la bandada (bandada.js pedir('mision')) cruza delante. Cualquier tecla o toque (pasados 0,4 s) lo salta.
     G.wow.despegue(seguir): llama a `seguir` al terminar; con G.quiet (baterías) llama a `seguir` al instante, sin cámara ni sonido.
   - Coro con luciérnagas: durante el Simon de los coquíes (S.chorus sin M3) 60 a 120 puntos de luz cálidos (un solo Points aditivo,
     sin luces reales) laten con cada nota (co/qui); se apagan solos 5 s después de la última nota. Con G.quiet no aparecen.
   - Las 20 cotorras en dos pasadas al terminar M3 viven en bandada.js (pedir con n: 20, pasadas: 2).
   Se carga tras el primer gesto (boot.js). window.AVWow(G) → G.wow = { despegue, luciernagas, test }. Prueba: AV.wowTest(). */
window.AVWow = function (G) {
  'use strict';
  const S = G.S, scene = G.renderer.scene, cam = G.camara;
  const DUR = 4, FOV = 10, SALTO_DESDE = 0.4, SILENCIO = 5;
  const NIVEL_N = { bajo: 60, medio: 90, alto: 120 };
  const nivel = () => G.renderer.calidad.nivel;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------- Sonido: viento (ruido filtrado que sube y baja) ----------
  if (G.audio && G.audio.define && !G.audio.has('viento')) {
    G.audio.define('viento', (t, a, A) => { A.noise(t, 3.6, { freq: 300, to: 1500, q: 0.6, gain: 0.2 }); A.noise(t + 1.6, 2.4, { freq: 1500, to: 500, q: 0.7, gain: 0.14 }); });
  }

  // ---------- Despegue del mirador ----------
  const D = { activo: false, t: 0, seguir: null, hojas: 0, bonus: 0, salto: false };
  function acabar() {
    if (!D.activo) return;
    D.activo = false; const f = D.seguir; D.seguir = null;
    if (f) { try { f(); } catch (e) { setTimeout(() => { throw e; }); } }
  }
  const alSaltar = () => { if (D.activo && D.t > SALTO_DESDE) { D.salto = true; acabar(); } };
  for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, alSaltar, { passive: true });
  function despegue(seguir, o) {
    o = o || {};
    if ((G.quiet && !o.forzar) || D.activo) { if (seguir) seguir(); return false; }
    Object.assign(D, { activo: true, t: 0, seguir: seguir || null, hojas: 0, salto: false });
    try { G.audio.play('viento'); } catch (e) { /* sin audio */ }
    if (G.bandada) G.bandada.pedir('mision', { forzar: !!o.forzar, en: 0.3 });
    return true;
  }
  function pasoDespegue(dt) {
    if (D.activo) {
      D.t += dt; D.hojas -= dt;
      if (D.hojas <= 0) { D.hojas = 0.35; G.fx.burst(S.pos.x + rnd(-3, 3), S.pos.y + rnd(0.5, 2.5), S.pos.z + rnd(-3, 3), 'leaves', 8); }
      if (D.t >= DUR) return acabar();
    }
    // FOV: sube en 1,2 s mientras dura el despegue y baja suave después (también si se salta)
    const meta = D.activo ? FOV * Math.min(1, D.t / 1.2) * Math.min(1, (DUR - D.t) / 0.8) : 0;
    D.bonus += (meta - D.bonus) * Math.min(1, dt * (D.activo ? 6 : 4));
    if (Math.abs(D.bonus) < 0.02 && !D.activo) D.bonus = 0;
    cam.fovBonus = D.bonus;
  }

  // ---------- Luciérnagas del coro ----------
  const MAXN = NIVEL_N.alto;
  const uni = { uT: { value: 0 }, uC: { value: new THREE.Vector3() }, uLuz: { value: 0 }, uPx: { value: 1 } };
  const geo = new THREE.BufferGeometry(), off = new Float32Array(MAXN * 3), fase = new Float32Array(MAXN);
  for (let i = 0; i < MAXN; i++) { const a = rnd(0, 6.2832), r = Math.sqrt(Math.random()) * 15; off.set([Math.cos(a) * r, rnd(0.4, 4.5), Math.sin(a) * r], i * 3); fase[i] = rnd(0, 6.28); }
  geo.setAttribute('position', new THREE.BufferAttribute(off, 3)); geo.setAttribute('fase', new THREE.BufferAttribute(fase, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'uniform float uT; uniform vec3 uC; uniform float uLuz; attribute float fase; varying float vB;\n' +
      'void main() { vec3 p = position + vec3(sin(uT * 0.7 + fase * 3.0) * 1.2, sin(uT * 1.1 + fase) * 0.6, cos(uT * 0.6 + fase * 2.0) * 1.2);\n' +
      ' vB = uLuz * (0.55 + 0.45 * sin(uT * 2.0 + fase));\n' +
      ' vec4 mv = viewMatrix * vec4(uC + p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(110.0 / max(1.0, -mv.z), 2.0, 14.0); }',
    fragmentShader: 'varying float vB; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = clamp(1.0 - d, 0.0, 1.0); a *= a;\n' +
      ' gl_FragColor = vec4(vec3(1.0, 0.82, 0.38) * a * vB, a * vB); }',
  });
  const luces = new THREE.Points(geo, mat);
  luces.name = 'luciernagas'; luces.frustumCulled = false; luces.visible = false; luces.renderOrder = 4; luces.userData.sinCulling = true; scene.add(luces);
  const L = { pulso: 0, brillo: 0, sinNota: 99, n: 0, notas: 0 };
  const cuenta = () => NIVEL_N[nivel()] || 90;
  const coroEnMarcha = () => !!S.chorus && !(S.missions && S.missions.m3);
  if (G.audio && G.audio.alSonar) G.audio.alSonar(n => { if ((n === 'co' || n === 'qui') && !G.quiet && coroEnMarcha()) { L.pulso = 1; L.sinNota = 0; L.notas++; } });
  function pasoLuces(dt) {
    L.sinNota += dt; L.pulso *= Math.exp(-dt * 3.2);
    const meta = L.sinNota < SILENCIO && !G.quiet ? 1 : 0;
    L.brillo += (meta - L.brillo) * Math.min(1, dt * 1.6);
    if (L.brillo < 0.01 && !meta) { L.brillo = 0; luces.visible = false; return; }
    L.n = cuenta(); geo.setDrawRange(0, L.n);
    uni.uT.value += dt; uni.uC.value.set(S.pos.x, S.pos.y, S.pos.z);
    uni.uLuz.value = L.brillo * (0.3 + 0.9 * L.pulso); luces.visible = true; // laten: cada nota las enciende y se van apagando hasta la siguiente
  }
  const luciernagas = () => ({ visible: luces.visible, n: luces.visible ? L.n : 0, brillo: L.brillo, pulso: L.pulso, notas: L.notas });

  G.on('update', dt => { pasoDespegue(Math.min(dt, 0.1)); pasoLuces(Math.min(dt, 0.1)); }, 87);
  G.on('apply', () => { D.activo = false; D.seguir = null; L.sinNota = 99; L.brillo = 0; luces.visible = false; cam.fovBonus = 0; D.bonus = 0; }, 90);

  // ---------- Prueba ----------
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const g0 = { quiet: G.quiet, chorus: S.chorus, m3: S.missions ? S.missions.m3 : undefined, tieneM: !!S.missions };
    const tic = (n, dt) => { for (let i = 0; i < n; i++) pasoDespegue(dt); };
    try {
      S.missions = S.missions || {};
      // Despegue
      G.quiet = true; let llamado = 0;
      const sinNada = despegue(() => llamado++);
      ok('Despegue: con G.quiet no abre la cámara y la misión sigue al instante', sinNada === false && llamado === 1 && !D.activo && cam.fovBonus === 0);
      G.quiet = false; llamado = 0;
      const ini = despegue(() => llamado++, { forzar: true });
      tic(30, 0.1);
      const pico = cam.fovBonus;
      ok('Despegue: el FOV se abre ~10 grados y la misión aún no sigue', ini && D.activo && pico > 8 && pico <= 10.01 && llamado === 0, pico.toFixed(2));
      tic(12, 0.1);
      ok('Despegue: a los 4 s termina solo y deja seguir la misión (una vez)', !D.activo && llamado === 1, llamado);
      tic(60, 0.1);
      ok('Despegue: el FOV vuelve a lo normal', cam.fovBonus === 0 && D.bonus === 0, cam.fovBonus);
      llamado = 0; despegue(() => llamado++, { forzar: true }); tic(2, 0.1); alSaltar();
      ok('Despegue: una tecla antes de 0,4 s no lo salta', D.activo && llamado === 0); tic(4, 0.1); alSaltar();
      ok('Despegue: una tecla pasados 0,4 s lo salta y la misión sigue', !D.activo && llamado === 1 && D.salto); tic(60, 0.1);
      ok('Despegue: pide la bandada y suena el viento', !!G.bandada && G.audio.has('viento'));
      // Luciérnagas
      G.quiet = true; S.chorus = true; S.missions.m3 = false; L.sinNota = 99; L.brillo = 0;
      G.audio.play('co'); pasoLuces(0.1);
      ok('Luciérnagas: con G.quiet no aparecen', !luces.visible && L.notas === (luciernagas().notas));
      G.quiet = false; const n0 = L.notas; G.audio.play('co'); G.audio.play('qui');
      for (let i = 0; i < 20; i++) pasoLuces(0.1);
      const lu = luciernagas();
      ok('Luciérnagas: entre 60 y 120 puntos cálidos laten con las notas del Simon', lu.visible && lu.n >= 60 && lu.n <= 120 && L.notas === n0 + 2 && uni.uLuz.value > 0, JSON.stringify({ n: lu.n, luz: +uni.uLuz.value.toFixed(2) }));
      ok('Luciérnagas: un solo Points aditivo, sin luces reales', mat.blending === THREE.AdditiveBlending && !scene.children.some(o => o.isLight && o.name === 'luciernagas'));
      const picoLuz = (G.audio.play('co'), pasoLuces(0.01), uni.uLuz.value); for (let i = 0; i < 10; i++) pasoLuces(0.1);
      ok('Luciérnagas: laten (suben con la nota y bajan hasta la siguiente)', picoLuz > uni.uLuz.value, picoLuz.toFixed(2) + ' → ' + uni.uLuz.value.toFixed(2));
      for (let i = 0; i < 160; i++) pasoLuces(0.1);
      ok('Luciérnagas: se apagan solas sin notas', !luces.visible);
      S.chorus = false; G.audio.play('co'); pasoLuces(0.1);
      ok('Luciérnagas: sin coro (fuera del Simon) no se encienden', !luces.visible);
    } finally {
      G.quiet = g0.quiet; S.chorus = g0.chorus; if (g0.tieneM) { if (g0.m3 === undefined) delete S.missions.m3; else S.missions.m3 = g0.m3; }
      D.activo = false; D.seguir = null; cam.fovBonus = 0; D.bonus = 0; L.sinNota = 99; L.brillo = 0; luces.visible = false;
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.wow = { despegue, luciernagas, test, get activo() { return D.activo; } };
  return G.wow;
};
