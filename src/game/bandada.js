/* Juego · Bandada de cotorras (carril M, M1: «un mundo con vida»)
   12 a 20 cotorras de pieles de distintas especies (AVE.pieles) que cruzan el cielo de El Yunque en bandada. Salen en estos momentos:
   al despertar (la partida empieza o se carga: pasan a lo lejos), al terminar una misión (G.emit('aprendizaje', { tipo: 'mision' }),
   pasan más cerca), de vez en cuando por la tarde (cada 2,5 a 5 min de juego) y cuando la cría legendaria canta
   (G.on('canto') → pedir('canto', { en: 1 })). Si Vittata se acerca (menos de 30 m), la bandada
   la acompaña unos 18 s dando vueltas a su alrededor y luego se va. Nunca en las baterías (G.quiet) ni antes de crear el personaje.
   - Se carga al pedirlo (boot.js la trae tras 'listo'): no suma a la descarga inicial. window.AVBandada(G) → { pedir, estado, test }.
   - Rendimiento: una sola malla instanciada por nivel de detalle (dos draw calls en total): cotorra de ~110 triángulos de cerca
     y de ~24 a más de 55 m; el aleteo va en el vertex shader. Respeta la calidad automática de renderer.js: bajo = ninguna,
     medio = 12, alto = 20; se reajusta sola con G.on('calidad'). Sin sombras y sin tocar el terreno ni el mundo.
   - Color: la media de la piel de cada especie (AVE.pieles.cargar, ≤ 6 especies; se descargan solo si la bandada sale).
   Prueba: AV.bandadaTest(). */
window.AVBandada = function (G) {
  'use strict';
  const S = G.S, scene = G.renderer.scene, AVE = window.AVE;
  const H = (x, z) => G.terreno.height(x, z);
  const NIVEL_N = { bajo: 0, medio: 12, alto: 20 };
  const VELO = 13, ACOMPANA_S = 18, CERCA = 30, LOD_LEJOS = 55;
  const TARDE_MIN = 150, TARDE_VAR = 150;
  const PALETA = ['#3c9a45', '#5fae3c', '#2f8a4f', '#7bb83e', '#c9a227', '#3f8f6a']; // si no hay pieles

  // ---------- Geometría: cotorra con el pico al +Z, alas en ±X ----------
  function malla(detalle) {
    const pos = [], col = [];
    const tri = (a, b, c, k) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(k, k, k); };
    const quad = (a, b, c, d, k) => { tri(a, b, c, k); tri(a, c, d, k); };
    const elipsoide = (sx, sy, sz, x, y, z, ws, hs, k) => {
      const g = new THREE.SphereGeometry(1, ws, hs).toNonIndexed(), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i) * sx + x, p.getY(i) * sy + y, p.getZ(i) * sz + z); col.push(k, k, k); }
    };
    const f = detalle ? 1 : 0;
    elipsoide(0.085, 0.09, 0.2, 0, 0, 0, f ? 8 : 5, f ? 6 : 3, 1);          // cuerpo
    elipsoide(0.062, 0.062, 0.07, 0, 0.07, 0.2, f ? 7 : 4, f ? 5 : 3, 1.12); // cabeza
    if (f) elipsoide(0.025, 0.03, 0.04, 0, 0.055, 0.27, 5, 4, 0.45);          // pico
    quad([-0.05, 0.01, -0.16], [0.05, 0.01, -0.16], [0.035, -0.02, -0.5], [-0.035, -0.02, -0.5], 0.7); // cola
    for (const s of [-1, 1]) {                                               // alas: la punta (|x| grande) es la que bate
      const alaIn = [[0.07, 0.03, 0.09], [0.07, 0.03, -0.12], [0.24, 0.045, -0.13], [0.24, 0.045, 0.07]];
      const alaOut = [[0.24, 0.045, 0.07], [0.24, 0.045, -0.13], [0.45, 0.06, -0.2], [0.44, 0.06, 0.0]];
      for (const [q, k] of f ? [[alaIn, 0.9], [alaOut, 0.6]] : [[[alaIn[0], alaIn[1], alaOut[2], alaOut[3]], 0.75]]) {
        const v = q.map(p => [p[0] * s * 0.8, p[1], p[2] * 0.8]);
        if (s < 0) quad(v[3], v[2], v[1], v[0], k); else quad(v[0], v[1], v[2], v[3], k);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  const uT = { value: 0 };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\nattribute float iFase;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      'vec3 transformed = vec3(position);\n float ax = abs(position.x);\n transformed.y += sin(uT * 13.0 + iFase) * ax * 1.1 * (ax > 0.07 ? 1.0 : 0.0);\n transformed.x -= sign(position.x) * (1.0 - cos(sin(uT * 13.0 + iFase) * 0.5)) * ax * 0.6;');
  };
  const MAXN = NIVEL_N.alto;
  function instanciada(geo) {
    const im = new THREE.InstancedMesh(geo, mat, MAXN);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 3).fill(1), 3);
    geo.setAttribute('iFase', new THREE.InstancedBufferAttribute(new Float32Array(MAXN), 1));
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; im.visible = false; im.name = 'bandada'; im.userData.sinCulling = true; // renderer.js cullPequenos: la caja de la malla no sigue a las instancias
    return im;
  }
  const cerca = instanciada(malla(true)), lejos = instanciada(malla(false));
  scene.add(cerca); scene.add(lejos);

  // ---------- Especies y colores (media de la piel) ----------
  let colores = []; // [{ id, c: THREE.Color lineal }]
  let preparando = null;
  function mediaDe(tex) {
    try {
      const im = tex && tex.image; if (!im) return null;
      const c = document.createElement('canvas'); c.width = c.height = 16;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0, 16, 16);
      const d = x.getImageData(0, 0, 16, 16).data; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200 || d[i] + d[i + 1] + d[i + 2] < 45) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (!n) return null;
      const k = new THREE.Color(r / n / 255, g / n / 255, b / n / 255), hsl = {}; k.getHSL(hsl);
      return k.setHSL(hsl.h, Math.min(1, hsl.s * 1.25 + 0.05), Math.min(0.62, Math.max(0.3, hsl.l * 1.2)));
    } catch (e) { return null; }
  }
  function preparar() {
    if (colores.length) return Promise.resolve(colores);
    if (preparando) return preparando;
    const P = AVE.pieles, lista = P && P.lista ? P.lista().map(x => x.piel) : [];
    const elegidas = lista.slice().sort(() => Math.random() - 0.5).slice(0, 6);
    preparando = Promise.all(elegidas.map(id => P.cargar(id).then(t => ({ id, c: mediaDe(t) }), () => ({ id, c: null })))).then(r => {
      colores = r.filter(x => x.c).map(x => ({ id: x.id, c: x.c.convertSRGBToLinear() }));
      if (!colores.length) colores = PALETA.map((h, i) => ({ id: 'pal' + i, c: new THREE.Color(h).convertSRGBToLinear() }));
      preparando = null; return colores;
    });
    return preparando;
  }

  // ---------- Bandada ----------
  const F = { estado: 'off', motivo: '', t: 0, n: 0, lider: { x: 0, y: 0, z: 0, vx: 0, vz: 1 }, aves: [], giro: 0, tAcompana: 0 };
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'YXZ';
  const nivel = () => G.renderer.calidad.nivel;
  const cuentaPara = n => NIVEL_N[n] != null ? NIVEL_N[n] : 12;
  const permitido = () => !G.quiet && !!(S.profile && S.profile.created);
  const rnd = (a, b) => a + Math.random() * (b - a);

  function crearAves(n) {
    F.aves = [];
    for (let i = 0; i < n; i++) {
      const fila = 1 + Math.floor(i / 2), lado = i % 2 ? 1 : -1;
      F.aves.push({ x: 0, y: 0, z: 0, vx: 0, vz: 1, vy: 0, yaw: 0, lado: lado * (fila * 2.4 + rnd(-0.8, 0.8)), atras: fila * 1.9 + rnd(-0.7, 0.7), arriba: rnd(-1.4, 1.4),
        fase: rnd(0, 6.28), sp: i % Math.max(1, colores.length), esc: rnd(0.9, 1.2) * 1.5 });
    }
    F.n = n;
  }
  const colocar = (a, escala) => {
    const L = F.lider, h = Math.hypot(L.vx, L.vz) || 1, fx = L.vx / h, fz = L.vz / h;
    a.tx = L.x + (-fz) * a.lado * escala - fx * a.atras * escala; a.tz = L.z + fx * a.lado * escala - fz * a.atras * escala;
    a.ty = L.y + a.arriba + Math.sin(F.t * 1.3 + a.fase) * 0.6;
  };
  function aparecer(motivo, o) {
    o = o || {};
    const n = o.n != null ? o.n : cuentaPara(nivel());
    if (n <= 0 || F.estado !== 'off') return false;
    if (!o.forzar && !permitido()) return false;
    if (!colores.length) { preparar().then(() => { if (F.estado === 'off') aparecer(motivo, o); }); return true; }
    const dist = o.dist != null ? o.dist : motivo === 'despertar' ? rnd(190, 230) : rnd(150, 190), lado = rnd(55, motivo === 'mision' ? 45 : 110);
    const ang = o.ang != null ? o.ang : rnd(0, Math.PI * 2), L = F.lider;
    L.x = S.pos.x + Math.cos(ang) * dist; L.z = S.pos.z + Math.sin(ang) * dist;
    // rumbo: hacia un punto a `lado` metros de Vittata, de modo que pasen por un costado y se alejen
    const px = S.pos.x - Math.sin(ang) * lado, pz = S.pos.z + Math.cos(ang) * lado, dx = px - L.x, dz = pz - L.z, h = Math.hypot(dx, dz) || 1;
    L.vx = dx / h * VELO; L.vz = dz / h * VELO; L.y = H(L.x, L.z) + 38;
    crearAves(Math.min(n, MAXN)); F.t = 0; F.tAcompana = 0; F.estado = 'pasa'; F.motivo = motivo; F.dur = 0;
    for (const a of F.aves) { colocar(a, 1); a.x = a.tx; a.z = a.tz; a.y = a.ty; a.vx = L.vx; a.vz = L.vz; }
    return true;
  }
  const terminar = () => { F.estado = 'off'; F.aves = []; F.n = 0; cerca.count = lejos.count = 0; cerca.visible = lejos.visible = false; };

  function mover(dt) {
    if (F.estado === 'off') return;
    dt = Math.min(dt, 0.1); F.t += dt; F.dur += dt; uT.value += dt;
    const L = F.lider, px = S.pos.x, pz = S.pos.z, dP = Math.hypot(L.x - px, L.z - pz);
    let tx, tz, vel = VELO, ty;
    if (F.estado === 'pasa') {
      if (dP < CERCA) { F.estado = 'acompana'; F.tAcompana = 0; F.giro = Math.atan2(L.z - pz, L.x - px); }
      else if (F.dur > 20 && dP > 280 || F.dur > 90) return terminar();
    }
    if (F.estado === 'acompana') {
      F.tAcompana += dt; F.giro += dt * 0.32;
      tx = px + Math.cos(F.giro) * 13; tz = pz + Math.sin(F.giro) * 13; vel = 15;
      ty = Math.max(S.pos.y + 5, H(L.x, L.z) + 10);
      if (F.tAcompana > ACOMPANA_S) { F.estado = 'sale'; F.dur = 0; }
    }
    if (F.estado === 'sale') {
      const h = Math.hypot(L.x - px, L.z - pz) || 1; tx = L.x + (L.x - px) / h * 100; tz = L.z + (L.z - pz) / h * 100; vel = 17; ty = H(L.x, L.z) + 45;
      if (dP > 260 || F.dur > 40) return terminar();
    }
    if (tx != null) {
      const dx = tx - L.x, dz = tz - L.z, h = Math.hypot(dx, dz) || 1, k = Math.min(1, dt * 1.4);
      L.vx += (dx / h * vel - L.vx) * k; L.vz += (dz / h * vel - L.vz) * k;
    }
    L.x += L.vx * dt; L.z += L.vz * dt;
    const yObj = ty != null ? ty : H(L.x, L.z) + 38; L.y += (yObj - L.y) * Math.min(1, dt * 0.8);
    const esc = F.estado === 'acompana' ? 0.6 : 1, k = 1 - Math.exp(-dt * 2.2);
    for (const a of F.aves) {
      colocar(a, esc);
      const ox = a.x, oy = a.y, oz = a.z;
      a.x += (a.tx - a.x) * k; a.z += (a.tz - a.z) * k; a.y += (a.ty - a.y) * k;
      a.y = Math.max(a.y, H(a.x, a.z) + 3);
      a.vx += ((a.x - ox) / dt - a.vx) * 0.15; a.vz += ((a.z - oz) / dt - a.vz) * 0.15; a.vy += ((a.y - oy) / dt - a.vy) * 0.15;
    }
    dibujar();
  }
  const cam = G.renderer.camera;
  function dibujar() {
    let nc = 0, nl = 0;
    const fc = cerca.geometry.attributes.iFase, fl = lejos.geometry.attributes.iFase;
    for (const a of F.aves) {
      const cl = colores[a.sp % colores.length].c, vel = Math.hypot(a.vx, a.vz) || 1;
      const yaw = Math.atan2(a.vx, a.vz), banco = Math.max(-0.5, Math.min(0.5, (a.yawAnt != null ? ((yaw - a.yawAnt + 9.42) % 6.2832 - 3.1416) : 0) * -4));
      a.yawAnt = yaw;
      dummy.position.set(a.x, a.y, a.z); dummy.rotation.set(-Math.atan2(a.vy, vel) * 0.8, yaw, banco); dummy.scale.setScalar(a.esc); dummy.updateMatrix();
      const dx = a.x - cam.position.x, dy = a.y - cam.position.y, dz = a.z - cam.position.z;
      const im = dx * dx + dy * dy + dz * dz < LOD_LEJOS * LOD_LEJOS ? cerca : lejos, i = im === cerca ? nc++ : nl++;
      im.setMatrixAt(i, dummy.matrix); im.instanceColor.setXYZ(i, cl.r, cl.g, cl.b); (im === cerca ? fc : fl).setX(i, a.fase);
    }
    for (const [im, n, f] of [[cerca, nc, fc], [lejos, nl, fl]]) {
      im.count = n; im.visible = n > 0; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; f.needsUpdate = true;
    }
  }

  // ---------- Disparadores ----------
  let pend = null, proxTarde = S.clock + rnd(TARDE_MIN, TARDE_MIN + TARDE_VAR);
  const pedir = (motivo, o) => { if (!(o && o.forzar) && !permitido()) return false; pend = { motivo, en: o && o.en != null ? o.en : 0, o, espera: 0 }; return true; };
  G.on('apply', () => { terminar(); pend = null; proxTarde = S.clock + rnd(TARDE_MIN, TARDE_MIN + TARDE_VAR); if (permitido()) pedir('despertar', { en: 6 }); }, 90);
  G.on('aprendizaje', d => { if (d && d.tipo === 'mision') pedir('mision', { en: 3 }); });
  G.on('canto', () => pedir('canto', { en: 1 })); // rareza.js: la cría legendaria llama a la bandada al despegar
  const alCalidad = C => { const n = cuentaPara(C.nivel); if (n === 0 || (F.estado !== 'off' && F.n > n)) terminar(); };
  G.on('calidad', alCalidad);
  G.on('update', (dt, busy) => {
    if (pend) {
      pend.en -= dt; pend.espera += dt;
      if (pend.en <= 0 && !busy) { const p = pend; if (aparecer(p.motivo, p.o) || F.estado !== 'off' || p.espera > 90) pend = null; }
    } else if (F.estado === 'off' && S.clock >= proxTarde) {
      proxTarde = S.clock + rnd(TARDE_MIN, TARDE_MIN + TARDE_VAR);
      if (!busy) pedir('tarde');
    }
    mover(dt);
  }, 88);

  // ---------- Prueba ----------
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guardado = { quiet: G.quiet, pos: Object.assign({}, S.pos), calidad: nivel(), clock: S.clock, pend, prox: proxTarde };
    const espera = ms => new Promise(r => setTimeout(r, ms)), cuadros = n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    try {
      terminar(); pend = null;
      ok('Cantidad por calidad: bajo 0, medio 12, alto 20', cuentaPara('bajo') === 0 && cuentaPara('medio') === 12 && cuentaPara('alto') === 20);
      ok('Con calidad baja no sale ninguna', (() => { const q = G.renderer.calidad.nivel; G.renderer.calidad.nivel = 'bajo'; const r = aparecer('prueba', { forzar: true }); G.renderer.calidad.nivel = q; return r === false && F.estado === 'off'; })());
      G.quiet = true; S.profile = S.profile || { created: false };
      ok('En las baterías (G.quiet) los disparadores no sacan la bandada', pedir('mision') === false && aparecer('tarde') === false && F.estado === 'off');
      ok('«pedir» forzado deja el aviso pendiente', pedir('despertar', { forzar: true, en: 5 }) === true && pend && pend.motivo === 'despertar'); pend = null;
      // Salida lejana: 20 aves, dos mallas como mucho, sin NaN y sobre el suelo
      S.pos.x = 0; S.pos.z = 0;
      aparecer('prueba', { forzar: true, n: 20, dist: 200, ang: 0.7 }); await preparar(); if (F.estado === 'off') aparecer('prueba', { forzar: true, n: 20, dist: 200, ang: 0.7 });
      mover(0.05);
      ok('Salen 20 cotorras visibles en 1 o 2 mallas instanciadas', F.n === 20 && cerca.count + lejos.count === 20 && [cerca, lejos].filter(m => m.visible).length <= 2, cerca.count + ' cerca, ' + lejos.count + ' lejos');
      const dist = Math.hypot(F.lider.x - S.pos.x, F.lider.z - S.pos.z);
      ok('Sale a lo lejos (más de 150 m)', dist > 150, Math.round(dist) + ' m');
      ok('Usan 3 o más especies (colores distintos)', new Set(F.aves.map(a => colores[a.sp % colores.length].id)).size >= 3 || colores.length < 3, colores.length + ' colores');
      // El streaming de edificios puede cambiar los draw calls entre cuadros: 3 pares con y sin bandada, se queda la menor diferencia
      await cuadros(8); let dif = Infinity, nota = '';
      for (let i = 0; i < 3; i++) {
        mat.visible = true; await cuadros(2); const con = G.renderer.stats().calls;
        mat.visible = false; await cuadros(2); const base = G.renderer.stats().calls;
        if (con - base < dif) { dif = con - base; nota = base + ' → ' + con; }
      }
      mat.visible = true;
      ok('Suma 2 draw calls o menos', dif <= 2, nota);
      let minD = 1e9, bien = true, pasos = 0, acompano = false;
      for (; F.estado !== 'off' && pasos < 3000; pasos++) {
        mover(0.1);
        if (F.estado === 'acompana') acompano = true;
        for (const a of F.aves) if (!(isFinite(a.x + a.y + a.z)) || a.y < H(a.x, a.z) + 2.9) bien = false;
        if (F.aves.length) minD = Math.min(minD, F.aves[0] ? Math.hypot(F.aves[0].x - S.pos.x, F.aves[0].z - S.pos.z) : 1e9);
      }
      ok('Pasa, se va sola y termina (máx. 5 min simulados)', F.estado === 'off' && pasos < 3000, (pasos / 10).toFixed(0) + ' s');
      ok('Sin posiciones inválidas ni por debajo del suelo', bien);
      // Acompañar: Vittata en la ruta
      S.pos.x = 40; S.pos.z = 40;
      aparecer('prueba', { forzar: true, n: 12, dist: 170, ang: 2.2 });
      let cerc = 0; acompano = false;
      for (pasos = 0; F.estado !== 'off' && pasos < 2000; pasos++) {
        if (F.estado === 'pasa') { S.pos.x = F.lider.x + F.lider.vx * 1.5; S.pos.z = F.lider.z + F.lider.vz * 1.5; } // la bandada se le cruza
        mover(0.1);
        if (F.estado === 'acompana') { acompano = true; if (F.tAcompana > 8 && F.tAcompana < 8.25) cerc = F.aves.filter(a => Math.hypot(a.x - S.pos.x, a.z - S.pos.z) < 40).length; }
      }
      ok('Si Vittata se acerca, la acompañan (todas a menos de 40 m a los 8 s)', acompano && cerc === 12, cerc + '/12');
      ok('Después se van y la bandada termina', F.estado === 'off');
      // Reacciona a la calidad
      aparecer('prueba', { forzar: true, n: 20, dist: 200, ang: 0.3 }); alCalidad({ nivel: 'bajo' });
      ok('Si la calidad baja a «bajo», se retira', F.estado === 'off' && cerca.count + lejos.count === 0);
      // Disparadores reales con el personaje creado
      G.quiet = false; const creado = S.profile.created; S.profile.created = true;
      G.emit('aprendizaje', { tipo: 'mision', id: 'x' }); const trasMision = pend && pend.motivo; pend = null;
      G.emit('aprendizaje', { tipo: 'hallazgo', id: 'x' }); const trasOtra = pend; pend = null;
      G.emit('canto', { poder: 'canto', rareza: 'legendaria' });
      const trasCanto = !!(pend && pend.motivo === 'canto' && pend.en <= 1 && pend.en > 0); pend = null;
      G.quiet = true; G.emit('canto', { poder: 'canto' }); const cantoQuieto = !pend;
      S.profile.created = creado; G.quiet = true;
      ok('Terminar una misión la pide; otros aprendizajes no', trasMision === 'mision' && !trasOtra);
      ok('El canto de la cría pide la bandada (1 s) y en las baterías no', trasCanto && cantoQuieto, `${trasCanto}/${cantoQuieto}`);
    } finally {
      terminar(); G.quiet = guardado.quiet; Object.assign(S.pos, guardado.pos); pend = guardado.pend; proxTarde = guardado.prox;
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  return { pedir, estado: () => ({ estado: F.estado, motivo: F.motivo, n: F.n }), test, get meshes() { return [cerca, lejos]; }, aparecer, mover, F };
};
