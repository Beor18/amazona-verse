/* Juego · Clima de El Yunque (carril O, O1; ficha 1 de docs/equipo/BOSQUE_VIVO_DISENO.md)
   Cuatro estados, siempre de día: sol (4–7 min, térmicas que suben a Vittata sin aletear), llovizna (2–3 min, gotas finas),
   aguacero (60–90 s, lluvia de G.fx.rain, ráfaga lateral, truenos lejanos) y neblina (2–4 min, tras un aguacero o en el Bosque
   enano). Transiciones con lerp de niebla, cielo y luz: 12 s hacia la lluvia y 20 s hacia la calma; nunca aguacero directo desde
   sol. Pesos sol 55 / llovizna 25 / aguacero 12 / neblina 8 (40 en el Bosque enano); semilla = S.saveId + minuto de juego, así la
   misma partida ve el mismo clima. ?clima=aguacero fija un estado (como ?calidad=bajo).
   - Crecida del capítulo 1: mientras exista S.event el clima se queda en aguacero y no toca el agua (nunca llama a
     G.agua.setLevel); al terminar pasa a neblina y luego a sol. Antes del paso 4 (refugio sin construir) no hay aguacero.
   - Refugio: en aguacero, 3 s bajo techo o copa registran ShelterFromRain (una vez por partida) y el aprendizaje clima:refugio.
     Es la única recompensa: el clima no castiga nada.
   - Presupuesto por calidad (G.on('calidad')): gotas de G.fx.rain 300 / 600 / 900 (setDrawRange), hojas de las térmicas
     0 / 40 / 90 (un Points), gotas en la cámara 6 / 10 / 14 divs, lerp cada 4 / 2 / 1 cuadros, flash del trueno solo en medio y
     alto y nunca con «reducir movimiento». Las hojas no salen si G.fx.live > 140.
   - Quieto en las baterías (G.quiet) y en Modo Retos: sol, salvo que una prueba lo fije. No edita fisica.js: empuja el vuelo
     desde 'update' (prio 45) con G.fisica.MOVE, S.pos y techoVuelo.
   - Se carga en el primer gesto del jugador o al pedirlo (boot.js: alPrimerGesto). window.AVClima(G) → G.clima = { estado, fijar, enTermica, viento, test }.
   Prueba: AV.climaTest(). */
window.AVClima = function (G) {
  'use strict';
  if (G.clima) return G.clima;
  const S = G.S, R = G.renderer, scene = R.scene, W = G.pack.mundo || {}, CIELO = W.cielo || {};
  const CFG = Object.assign({
    pesos: { sol: 55, llovizna: 25, aguacero: 12, neblina: 8 }, neblinaZona: 40,
    zonasNeblina: ['nublado', 'cumbre', 'picachos'], termicas: ['plaza', 'colina', 'cumbre'],
  }, G.pack.clima || {});
  const NIVEL = { bajo: { gotas: 300, hojas: 0, camara: 6, cada: 4, flash: false }, medio: { gotas: 600, hojas: 40, camara: 10, cada: 2, flash: true }, alto: { gotas: 900, hojas: 90, camara: 14, cada: 1, flash: true } };
  const base = { niebla: [-scene.fog.near, scene.fog.far], atmos: scene.fog.near < 0 };
  // Cada estado: duración (s), niebla [inicio, extinción] (null = la del mundo), sol y hemi (× la del mundo), cielo (color y mezcla), lluvia y llovizna (0–1)
  const E = {
    sol: { dur: [240, 420], niebla: null, sol: 1, hemi: 1, cielo: null, mezcla: 0, lluvia: 0, llovizna: 0 },
    llovizna: { dur: [120, 180], niebla: [30, 600], sol: 0.8, hemi: 0.92, cielo: '#9aa9b2', mezcla: 0.3, lluvia: 0, llovizna: 1 },
    aguacero: { dur: [60, 90], niebla: [18, 260], sol: 0.45, hemi: 0.75, cielo: '#8fa6b4', mezcla: 1, lluvia: 1, llovizna: 0 },
    neblina: { dur: [120, 240], niebla: [10, 120], sol: 0.7, hemi: 0.9, cielo: '#d8e4e8', mezcla: 1, lluvia: 0, llovizna: 0 },
  };
  const NOMBRES = Object.keys(E);

  // ---------- Lo que toca: niebla, cielo, luces y el agua (se guarda lo del mundo para volver) ----------
  const lin = c => c.clone().convertSRGBToLinear();
  const skyU = R.sky ? R.sky.material.uniforms : null, aguaU = G.agua && G.agua.uniforms;
  const orig = {
    sol: R.sun.intensity, hemi: R.hemi.intensity,
    fog: new THREE.Color(CIELO.color || '#bfe1d6'),
    horizonte: skyU ? skyU.uHorizonte.value.clone() : null, cenit: skyU ? skyU.uCenit.value.clone() : null,
    solCol: skyU ? skyU.uSolCol.value.clone() : null, nubes: null,
    aguaSol: aguaU && aguaU.uSolCol ? aguaU.uSolCol.value.clone() : null, aguaH: aguaU && aguaU.uHorizonte ? aguaU.uHorizonte.value.clone() : null,
  };
  const NH = CIELO.nieblaAltura || [6, 55];
  scene.traverse(o => { const u = o.material && o.material.uniforms; if (u && u.tNube && u.uBajo && !orig.nubes) orig.nubes = { u: u.uBajo, c: u.uBajo.value.clone() }; });
  const vis = { near: base.niebla[0], far: base.niebla[1], sol: 1, hemi: 1, col: new THREE.Color(), mezcla: 0, lluvia: 0, llovizna: 0 };
  const objetivo = n => { const e = E[n], nb = e.niebla || base.niebla; return { near: nb[0], far: nb[1], sol: e.sol, hemi: e.hemi, col: new THREE.Color(e.cielo || CIELO.color || '#bfe1d6'), mezcla: e.mezcla, lluvia: e.lluvia, llovizna: e.llovizna }; };
  const tmp = new THREE.Color(), tmpL = new THREE.Color();
  let flashHasta = 0;
  function aplicar() {
    const f = scene.fog;
    // La niebla atmosférica se aclara con la altura (nieblaAltura, fija en el shader): con lluvia o neblina se compensa en la
    // cámara, así en la cumbre también se cierra la vista (solo se espesa; nunca pasa de la del estado)
    const k = base.atmos ? Math.min(1, Math.max(0.08, Math.exp(-(R.camera.position.y - NH[0]) / NH[1]))) : 1;
    f.near = base.atmos ? -vis.near : vis.near; f.far = vis.far * (1 + (k - 1) * vis.mezcla);
    tmp.copy(orig.fog).lerp(vis.col, vis.mezcla);
    if (base.atmos) {
      // renderer.js repone el color con fogColorFor (post y snapshot del cómic): se cambian sus colores base
      if (R.niebla) { R.niebla.srgb.copy(tmp); R.niebla.lin.copy(tmp).convertSRGBToLinear(); }
      f.color.copy(R.post && R.post.activo ? lin(tmp) : tmp);
    }
    else f.color.copy(tmp);
    R.sun.intensity = orig.sol * vis.sol;
    R.hemi.intensity = orig.hemi * vis.hemi * (performance.now() < flashHasta ? 1.9 : 1);
    if (skyU) {
      tmpL.copy(vis.col).convertSRGBToLinear();
      skyU.uHorizonte.value.copy(orig.horizonte).lerp(tmpL, vis.mezcla);
      skyU.uCenit.value.copy(orig.cenit).lerp(tmpL, vis.mezcla * 0.75);
      skyU.uSolCol.value.copy(orig.solCol).multiplyScalar(vis.sol); // disco y halo del sol, y el brillo de las nubes (uAlto)
      if (orig.nubes) orig.nubes.u.value.copy(orig.nubes.c).lerp(tmpL.copy(vis.col).multiplyScalar(0.8).convertSRGBToLinear(), vis.mezcla);
    }
    if (orig.aguaSol) aguaU.uSolCol.value.copy(orig.aguaSol).multiplyScalar(vis.sol);
    if (orig.aguaH) aguaU.uHorizonte.value.copy(orig.aguaH).lerp(tmpL.copy(vis.col).convertSRGBToLinear(), vis.mezcla);
  }

  // ---------- Máquina de estados ----------
  const F = { estado: 'sol', desde: 0, prox: 0, trans: null, fijado: null, trasEvento: false, enEvento: false, propia: false, n: 0, pausa: false, refugio: 0, cubierto: null, sim: false };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const azar = clave => hash(String(S.saveId || 'av') + ':' + Math.floor((S.clock || 0) / 60) + ':' + clave) / 4294967296;
  const pos = () => S.pos;
  const zonas = (window.AV_MAPA_CAP1 && window.AV_MAPA_CAP1.zonas) || [];
  function enZonaNeblina(x, z) {
    for (const id of CFG.zonasNeblina) {
      const zn = zonas.find(q => q.id === id || q.bioma === id);
      if (zn && Math.hypot(x - zn.centro[0], z - zn.centro[2]) < zn.r) return true;
      const p = G.terreno.poi && G.terreno.poi(id);
      if (p && Math.hypot(x - p.x, z - p.z) < Math.max(40, p.r || 0)) return true;
    }
    return false;
  }
  const aguaceroPermitido = () => !!S.event || (S.step || 0) >= 4;
  // El siguiente estado: sol → llovizna o neblina (solo en el Bosque enano); llovizna → aguacero, sol o neblina; aguacero → neblina; neblina → sol o llovizna
  function siguiente(desde, x, z, r) {
    const p = CFG.pesos, neb = enZonaNeblina(x, z) ? CFG.neblinaZona : p.neblina;
    const op = desde === 'sol' ? { sol: p.sol, llovizna: p.llovizna, neblina: enZonaNeblina(x, z) ? neb : 0 }
      : desde === 'llovizna' ? { sol: p.sol, aguacero: aguaceroPermitido() ? p.aguacero : 0, neblina: neb }
      : desde === 'aguacero' ? { neblina: 1 } : { sol: p.sol, llovizna: p.llovizna };
    let tot = 0; for (const k in op) tot += op[k];
    let v = r * tot;
    for (const k in op) { if ((v -= op[k]) < 0) return k; }
    return 'sol';
  }
  function cambiar(n, inmediato) {
    const e = E[n], hacia = n === 'llovizna' || n === 'aguacero';
    F.estado = n; F.desde = S.clock || 0; F.n++;
    F.prox = F.desde + e.dur[0] + azar('dur' + F.n) * (e.dur[1] - e.dur[0]);
    const to = objetivo(n);
    if (inmediato) { Object.assign(vis, to, { col: vis.col.copy(to.col) }); F.trans = null; aplicar(); return; }
    F.trans = { t: 0, dur: hacia ? 12 : 20, from: Object.assign({}, vis, { col: vis.col.clone() }), to };
  }
  function avanzarTrans(dt) {
    const T = F.trans; if (!T) return;
    T.t = Math.min(T.dur, T.t + dt);
    const k = T.t / T.dur, s = k * k * (3 - 2 * k), a = T.from, b = T.to;
    for (const c of ['near', 'far', 'sol', 'hemi', 'mezcla', 'lluvia', 'llovizna']) vis[c] = a[c] + (b[c] - a[c]) * s;
    // el color se funde desde el del estado anterior (si no tenía mezcla, se toma el nuevo y sube la mezcla)
    vis.col.copy(a.mezcla > 0.01 ? a.col : b.col).lerp(b.col, a.mezcla > 0.01 ? s : 1);
    if (T.t >= T.dur) F.trans = null;
  }
  function fijar(n, o) {
    if (n == null) { F.fijado = null; return true; }
    if (!E[n]) return false;
    if (n === 'aguacero' && !aguaceroPermitido() && !(o && o.forzar)) return false;
    F.fijado = n; if (F.estado !== n) cambiar(n, o && o.inmediato);
    return true;
  }
  const enRetos = () => document.body.classList.contains('retos-on') || !!(G.retosApi && G.retosApi.activo);

  // ---------- Térmicas y ráfaga ----------
  const RADIO_TERMICA = 9, SUBE = 2.5;
  const termicas = CFG.termicas.map(id => {
    const p = G.terreno.poi && G.terreno.poi(id);
    if (p) return { id, x: p.x, z: p.z };
    const zn = zonas.find(q => q.id === id);
    return zn ? { id, x: zn.centro[0], z: zn.centro[2] } : null;
  }).filter(Boolean);
  const solPleno = () => F.estado === 'sol' && vis.lluvia < 0.05 && vis.llovizna < 0.2 && vis.mezcla < 0.3;
  function enTermica(x, z) {
    if (x == null) { x = S.pos.x; z = S.pos.z; }
    if (!solPleno()) return null;
    for (const t of termicas) if (Math.hypot(x - t.x, z - t.z) < RADIO_TERMICA) return t;
    return null;
  }
  const VDIR = (() => { const d = (W.flora && W.flora.viento && W.flora.viento.dir) || [1, 0], l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; })();
  // Viento que siente Vittata volando (m/s): ráfaga en aguacero (a sotavento y hacia abajo por encima de 12 m), térmica en sol
  function viento(x, z, y) {
    if (x == null) { x = S.pos.x; z = S.pos.z; y = S.pos.y; }
    if (enTermica(x, z)) return { x: 0, z: 0, y: SUBE };
    const k = vis.lluvia;
    if (k < 0.01) return { x: 0, z: 0, y: 0 };
    const alto = y - G.terreno.height(x, z) > 12;
    return { x: VDIR[0] * 2.2 * k, z: VDIR[1] * 2.2 * k, y: alto ? -0.8 * k : 0 };
  }
  function empuje(dt) {
    const M = G.fisica.MOVE; if (!M.flying) return;
    const v = viento(); if (!v.x && !v.z && !v.y) return;
    M.vx += v.x * dt * 3; M.vz += v.z * dt * 3;
    if (v.y) {
      const lim = G.fisica.techoVuelo(S.pos.x, S.pos.z) - 1;
      S.pos.y = v.y > 0 ? Math.min(S.pos.y + v.y * dt, Math.max(S.pos.y, lim)) : S.pos.y + v.y * dt;
    }
  }

  // ---------- Llovizna (un Points de gotas finas, sin la pista de tensión de musica.js) y hojas de las térmicas ----------
  const LLOV_N = 450, llovPos = new Float32Array(LLOV_N * 3);
  for (let i = 0; i < LLOV_N; i++) { llovPos[i * 3] = (Math.random() - 0.5) * 50; llovPos[i * 3 + 1] = Math.random() * 22; llovPos[i * 3 + 2] = (Math.random() - 0.5) * 50; }
  const llovGeo = new THREE.BufferGeometry(); llovGeo.setAttribute('position', new THREE.BufferAttribute(llovPos, 3));
  const llovizna = new THREE.Points(llovGeo, new THREE.PointsMaterial({ color: '#dcebf2', size: 0.08, transparent: true, opacity: 0, depthWrite: false }));
  llovizna.name = 'clima-llovizna'; llovizna.visible = false; llovizna.frustumCulled = false; scene.add(llovizna);
  const HOJAS_N = 90, hojaPos = new Float32Array(HOJAS_N * 3), hojaFase = new Float32Array(HOJAS_N * 2);
  for (let i = 0; i < HOJAS_N; i++) { hojaFase[i * 2] = Math.random() * Math.PI * 2; hojaFase[i * 2 + 1] = Math.random(); }
  const hojaGeo = new THREE.BufferGeometry(); hojaGeo.setAttribute('position', new THREE.BufferAttribute(hojaPos, 3));
  const hojas = new THREE.Points(hojaGeo, new THREE.PointsMaterial({ color: '#6f9a3a', size: 0.4, transparent: true, opacity: 0.9, depthWrite: false }));
  hojas.name = 'clima-hojas'; hojas.visible = false; hojas.frustumCulled = false; scene.add(hojas);
  let hojasN = 0, hojasLibres = true, hojasT = 0;
  function moverLlovizna(dt) {
    llovizna.visible = vis.llovizna > 0.02 && !F.pausa;
    if (!llovizna.visible) return;
    llovizna.material.opacity = 0.55 * vis.llovizna;
    const a = llovGeo.attributes.position, n = llovGeo.drawRange.count === Infinity ? LLOV_N : llovGeo.drawRange.count;
    for (let i = 0; i < n; i++) { let y = a.getY(i) - 9 * dt; if (y < 0) y += 22; a.setY(i, y); }
    a.needsUpdate = true;
    llovizna.position.set(S.pos.x, G.terreno.height(S.pos.x, S.pos.z), S.pos.z);
  }
  function moverHojas(dt) {
    if ((hojasT += dt) >= 1) { hojasT = 0; hojasLibres = !(G.fx && G.fx.live > 140); }
    let t = null, d = 1e9;
    if (hojasN && hojasLibres && solPleno() && !F.pausa) for (const q of termicas) { const e = Math.hypot(S.pos.x - q.x, S.pos.z - q.z); if (e < d) { d = e; t = q; } }
    hojas.visible = !!t && d < 80;
    if (!hojas.visible) return;
    const g = G.terreno.height(t.x, t.z), a = hojaGeo.attributes.position, ahora = R.t || 0;
    for (let i = 0; i < hojasN; i++) {
      const f = hojaFase[i * 2], h = hojaFase[i * 2 + 1], y = ((h * 30 + ahora * SUBE) % 30), r = 2 + 5 * h, ang = f + ahora * (0.8 + h);
      a.setXYZ(i, t.x + Math.cos(ang) * r, g + 1 + y, t.z + Math.sin(ang) * r);
    }
    a.needsUpdate = true;
  }

  // ---------- Gotas en la cámara (divs, 0 draw calls; estilos aquí, como musica.js) ----------
  const css = document.createElement('style');
  css.textContent = '#clima-gotas{position:fixed;inset:0;pointer-events:none;z-index:4;overflow:hidden}' +
    '#clima-gotas i{position:absolute;width:10px;height:14px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55),rgba(190,215,230,.18) 60%,rgba(190,215,230,0) 72%);opacity:0;transition:opacity .6s}' +
    '#clima-gotas.on i{opacity:.85;animation:clima-gota 3.2s linear infinite}' +
    '@keyframes clima-gota{0%{transform:translateY(0)}80%{transform:translateY(10px)}100%{transform:translateY(26px);opacity:0}}' +
    '@media (prefers-reduced-motion: reduce){#clima-gotas.on i{animation:none}}';
  document.head.appendChild(css);
  const capa = document.createElement('div'); capa.id = 'clima-gotas'; capa.setAttribute('aria-hidden', 'true');
  document.body.appendChild(capa);
  function gotasCamara(n) {
    while (capa.children.length > n) capa.lastChild.remove();
    while (capa.children.length < n) {
      const i = document.createElement('i'), k = capa.children.length;
      i.style.left = (5 + ((k * 37) % 90)) + '%'; i.style.top = (8 + ((k * 53) % 70)) + '%';
      i.style.animationDelay = (-(k * 0.7) % 3.2).toFixed(2) + 's'; i.style.transform = 'scale(' + (0.7 + (k % 4) * 0.2) + ')';
      capa.appendChild(i);
    }
  }

  // ---------- Calidad ----------
  let Q = NIVEL[R.calidad.nivel] || NIVEL.medio;
  function alCalidad(C) {
    Q = NIVEL[C && C.nivel] || NIVEL.medio;
    if (G.fx && G.fx.rain) G.fx.rain.geometry.setDrawRange(0, Q.gotas);
    llovGeo.setDrawRange(0, Math.round(Q.gotas / 2));
    hojasN = Q.hojas; hojaGeo.setDrawRange(0, hojasN);
    gotasCamara(Q.camara);
    aplicar(); // el post puede haber cambiado (niebla en lineal o en sRGB)
  }
  alCalidad(R.calidad);
  G.on('calidad', alCalidad);

  // ---------- Truenos, lluvia que suena, ondas en el agua y refugio ----------
  let truenoT = 5, lluviaT = 0, ondaT = 0, cuadro = 0;
  // Sonidos sintéticos propios (audio.js no los trae): trueno lejano grave y un segundo de lluvia suave
  if (!G.audio.has('trueno')) G.audio.define('trueno', (t, arg, A) => { A.noise(t, 1.1, { type: 'lowpass', freq: 320, to: 70, q: 0.7, gain: 0.32 }); A.tone(58, t + 0.05, 1, { type: 'sine', to: 36, gain: 0.14 }); });
  if (!G.audio.has('lluvia')) G.audio.define('lluvia', (t, arg, A) => A.noise(t, 1.05, { type: 'highpass', freq: 2400, q: 0.4, gain: 0.05 }));
  function trueno(o) {
    const reducido = o && o.reducido != null ? o.reducido : R.REDUCED;
    const r = { sonido: G.audio.play('trueno') !== false, shake: !reducido, flash: !reducido && Q.flash };
    if (r.shake && !(o && o.seco)) G.camara.shake(0.03, 0.1);
    if (r.flash && !(o && o.seco)) flashHasta = performance.now() + 80;
    return r;
  }
  function cubierto() {
    if (F.cubierto) return F.cubierto();
    const so = G.solidos;
    return !!(so && so.activo && so.libre(S.pos.x, S.pos.z, S.pos.y, 0.15, 0.5) < 25);
  }
  const REFUGIO_EV = 'ShelterFromRain';
  function refugio(dt, bajoTecho) {
    if (F.estado !== 'aguacero' || vis.lluvia < 0.5 || !bajoTecho) { F.refugio = 0; return false; }
    if ((F.refugio += dt) < 3 || G.eventos.had(REFUGIO_EV)) return false;
    G.eventos.log(REFUGIO_EV, {});
    G.emit('aprendizaje', { tipo: 'clima', id: 'refugio' });
    return true;
  }

  // ---------- Bucle ----------
  function decidir() {
    if (S.event) { F.enEvento = true; if (F.estado !== 'aguacero') cambiar('aguacero'); return; }
    if (F.enEvento) { F.enEvento = false; cambiar('neblina'); return; }
    if (F.fijado) { if (F.estado !== F.fijado) cambiar(F.fijado); return; }
    if ((G.quiet && !F.sim) || !(S.profile && S.profile.created) && !F.sim) { if (F.estado !== 'sol' || F.trans) cambiar('sol', true); return; }
    if (F.estado === 'aguacero' && !aguaceroPermitido()) { cambiar('neblina'); return; }
    if ((S.clock || 0) >= F.prox) cambiar(siguiente(F.estado, S.pos.x, S.pos.z, azar('sig' + F.n)));
  }
  function paso(dt, busy, forzarLerp) {
    const retos = enRetos();
    if (retos !== F.pausa) { F.pausa = retos; if (retos && F.propia) { G.fx.rain.visible = false; F.propia = false; } }
    if (F.pausa) { if (vis.mezcla || vis.lluvia || vis.llovizna || vis.sol !== 1) { cambiar('sol', true); } llovizna.visible = hojas.visible = false; capa.classList.remove('on'); return; }
    decidir();
    avanzarTrans(dt);
    if (forzarLerp || ((F.trans || vis.mezcla > 0.001) && ++cuadro % Q.cada === 0) || performance.now() < flashHasta + 40) aplicar();
    // la lluvia grande es la de fx.js (la misma de la crecida); el clima solo la enciende y la apaga si es suya
    const llueve = vis.lluvia > 0.5;
    if (llueve && !G.fx.rain.visible) { G.fx.rain.visible = true; F.propia = true; }
    else if (!llueve && F.propia && !S.event) { G.fx.rain.visible = false; F.propia = false; }
    moverLlovizna(dt); moverHojas(dt);
    const bajoTecho = (vis.lluvia > 0.3 || vis.llovizna > 0.3) && cubierto();
    capa.classList.toggle('on', (vis.lluvia > 0.5 || vis.llovizna > 0.6) && !bajoTecho && !busy);
    if (F.estado === 'aguacero' && vis.lluvia > 0.5 && !S.event) {
      if ((truenoT -= dt) <= 0) { truenoT = 4 + azar('tr' + Math.round(S.clock)) * 4; trueno(); }
      if ((lluviaT -= dt) <= 0) { lluviaT = 1; G.audio.play('lluvia'); }
    }
    if (vis.lluvia > 0.5 && G.agua && (ondaT -= dt) <= 0) {
      ondaT = 0.35;
      const x = S.pos.x + (Math.random() - 0.5) * 24, z = S.pos.z + (Math.random() - 0.5) * 24, nv = G.agua.levelAt(x, z);
      if (isFinite(nv) && nv > G.terreno.height(x, z) + 0.05) G.agua.ripple(x, nv + 0.02, z, 0.5);
    }
    if (!G.quiet || F.fijado) refugio(dt, bajoTecho);
    if (!busy) empuje(dt);
  }
  G.on('update', (dt, busy) => { paso(dt, busy); }, 45);
  G.on('apply', () => { F.enEvento = false; F.refugio = 0; if (F.propia) { G.fx.rain.visible = false; F.propia = false; } cambiar(F.fijado || 'sol', true); }, 41);
  const deUrl = new URLSearchParams(location.search).get('clima');
  if (E[deUrl]) fijar(deUrl, { forzar: true, inmediato: true }); else cambiar('sol', true);

  // ---------- Prueba ----------
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const errores0 = (window.__aveErrores || []).length, M = G.fisica.MOVE;
    const g = { quiet: G.quiet, fijado: F.fijado, step: S.step, event: S.event, pos: Object.assign({}, S.pos), vy: S.vy, flying: M.flying, landing: M.landing, nivel: R.calidad.nivel, manual: R.calidad.manual, rain: G.fx.rain.visible, eventos: S.events.length, clock: S.clock, setLevel: G.agua && G.agua.setLevel };
    const sim = (seg, dt) => { dt = dt || 0.1; for (let t = 0; t < seg - 1e-6; t += dt) { S.clock += dt; paso(dt, false, true); } };
    try {
      G.quiet = true; F.sim = true; S.event = null; S.step = 5; R.calidad.manual = true;
      ok('La API está completa', ['estado', 'fijar', 'enTermica', 'viento', 'test'].every(k => typeof api[k] === 'function') && G.clima === api);
      // 1. Aguacero: niebla cerrada en 13 s, lluvia de fx.js y pista de tensión
      fijar('sol', { inmediato: true }); sim(0.2);
      ok('fijar(«aguacero») funciona tras el paso 4', fijar('aguacero') === true && F.estado === 'aguacero');
      sim(13);
      ok('En 13 s la niebla llega a ≤ 270 m y llueve', scene.fog.far <= 270 && G.fx.rain.visible, Math.round(scene.fog.far) + ' m');
      ok('El sol baja a ×0,45 y el cielo se agrisa', Math.abs(R.sun.intensity - orig.sol * 0.45) < 0.02 && vis.mezcla > 0.99, R.sun.intensity.toFixed(2));
      let mus = null; try { mus = window.AV && AV.musica ? await AV.musica() : G.musicaApi; } catch (e) { mus = null; }
      const lluviaMus = () => !!mus && (mus.banda ? mus.estado().momento === 'lluvia' && mus.estado().pista === mus.banda.momentos.lluvia : mus.estado().pista === 'tension'); // C13: la pista de la lluvia sale de la tabla BANDA_SONORA
      if (mus) for (let i = 0; i < 20 && !lluviaMus(); i++) await espera(500); // 5 s de lluvia + 0,7 s de calma de musica.js
      ok('Con el aguacero, la música pasa al momento «lluvia» tras 5 s (su pista, de la tabla de musica.js)', lluviaMus(), mus ? mus.estado().momento + ' → ' + mus.estado().pista : 'sin musica.js');
      // 2. Crecida: S.event congela el aguacero y el clima no toca el agua
      let llamadas = 0; if (G.agua) G.agua.setLevel = function () { llamadas++; return g.setLevel.apply(this, arguments); };
      const nivel0 = G.agua ? G.agua.levelAt(S.pos.x, S.pos.z) : 0;
      fijar(null); fijar('sol', { inmediato: true }); fijar(null);
      S.event = { t: 0, dur: 20 }; sim(3);
      const nivel1 = G.agua ? G.agua.levelAt(S.pos.x, S.pos.z) : 0;
      ok('Con S.event el estado queda en aguacero', F.estado === 'aguacero' && F.enEvento);
      ok('El clima no cambia el agua ni llama a setLevel', llamadas === 0 && (nivel0 === nivel1 || (!isFinite(nivel0) && !isFinite(nivel1))), llamadas + ' llamadas');
      S.event = null; sim(0.5);
      ok('Al acabar la crecida pasa a neblina', F.estado === 'neblina');
      sim(21);
      ok('La neblina cierra la vista a ≤ 125 m', scene.fog.far <= 125, Math.round(scene.fog.far) + ' m');
      if (G.agua) G.agua.setLevel = g.setLevel;
      // Máquina de estados: nunca aguacero desde sol, determinista, sin aguacero antes del paso 4
      let mal = 0, cuenta = { sol: 0, llovizna: 0, aguacero: 0, neblina: 0 }, est = 'sol';
      for (let i = 0; i < 4000; i++) { const s = siguiente(est, 150, 170, hash('t' + i) / 4294967296); if (est === 'sol' && s === 'aguacero') mal++; cuenta[s]++; est = s; }
      ok('Nunca aguacero directo desde sol (4000 cambios)', mal === 0 && cuenta.aguacero > 0, JSON.stringify(cuenta));
      ok('Fuera del Bosque enano, desde sol no hay neblina', [0.1, 0.5, 0.9, 0.99].every(r => siguiente('sol', 150, 170, r) !== 'neblina'));
      ok('En el Bosque enano la neblina pesa 40', siguiente('llovizna', -10, -185, 0.99) === 'neblina' && enZonaNeblina(-10, -185) && !enZonaNeblina(150, 170));
      const a1 = azar('x'), a2 = azar('x'); ok('La semilla (saveId + minuto) es determinista', a1 === a2 && a1 >= 0 && a1 < 1);
      // 5. Antes del paso 4 no hay aguacero
      S.step = 2; fijar(null);
      ok('Con S.step = 2, fijar(«aguacero») devuelve false', fijar('aguacero') === false);
      ok('…y llovizna nunca pasa a aguacero', [0.1, 0.4, 0.7, 0.95, 0.999].every(r => siguiente('llovizna', 150, 170, r) !== 'aguacero'));
      ok('Llovizna y neblina sí se pueden fijar', fijar('llovizna') && fijar('neblina'));
      S.step = 5;
      // Llovizna: gotas propias, sin la lluvia de fx.js (así no salta la tensión)
      fijar('llovizna'); sim(13);
      ok('La llovizna usa sus gotas finas y no la lluvia de fx.js', llovizna.visible && !G.fx.rain.visible && scene.fog.far <= 610, Math.round(scene.fog.far) + ' m');
      // 3. Térmica: sube sola ≥ 4 m en 2 s sin pasar techoVuelo − 1
      fijar('sol', { inmediato: true });
      const tq = termicas[0];
      ok('Hay 3 térmicas (plaza, colina y cumbre)', termicas.length === 3, termicas.map(t => t.id).join(', '));
      if (tq) {
        S.pos.x = tq.x; S.pos.z = tq.z; S.pos.y = G.terreno.height(tq.x, tq.z) + 8; S.vy = 0; M.flying = true; M.landing = false;
        const y0 = S.pos.y, lim = G.fisica.techoVuelo(tq.x, tq.z) - 1; let max = -1e9;
        for (let i = 0; i < 40; i++) { G.fisica.step(0.05, false); empuje(0.05); max = Math.max(max, S.pos.y); }
        ok('En una térmica sube ≥ 4 m en 2 s sin pulsar Subir', S.pos.y - y0 >= 4 && enTermica(), (S.pos.y - y0).toFixed(1) + ' m');
        ok('…y nunca pasa techoVuelo − 1', max <= lim + 0.01, max.toFixed(1) + ' / ' + lim.toFixed(1));
        S.pos.y = lim - 0.5; for (let i = 0; i < 40; i++) { empuje(0.05); }
        ok('Junto al techo se queda en techoVuelo − 1', S.pos.y <= lim + 0.01 && S.pos.y >= lim - 0.01, S.pos.y.toFixed(2));
        fijar('aguacero', { inmediato: true });
        const v = viento(tq.x, tq.z, G.terreno.height(tq.x, tq.z) + 20);
        ok('En aguacero no hay térmica; ráfaga de 2,2 m/s y empuje hacia abajo arriba de 12 m', !enTermica(tq.x, tq.z) && Math.abs(Math.hypot(v.x, v.z) - 2.2) < 0.01 && v.y === -0.8, JSON.stringify(v));
        M.flying = g.flying; M.landing = g.landing;
      }
      // Refugio: 3 s bajo techo en aguacero, una vez por partida
      const tenia = G.eventos.had(REFUGIO_EV);
      fijar('aguacero', { inmediato: true }); F.cubierto = () => true; F.refugio = 0;
      sim(3.3);
      const hecho = G.eventos.had(REFUGIO_EV), antes = S.events.length; sim(4);
      ok('3 s bajo techo en aguacero registran ShelterFromRain una sola vez', hecho && S.events.length === antes && !capa.classList.contains('on'));
      if (!tenia) S.events = S.events.filter(e => e.key !== REFUGIO_EV);
      F.cubierto = () => false; sim(0.2);
      ok('Sin techo, gotas en la cámara', capa.classList.contains('on'));
      F.cubierto = null;
      // 4. Presupuesto por calidad
      const cuentas = {};
      for (const n of ['bajo', 'medio', 'alto']) { R.setCalidad(n); cuentas[n] = [G.fx.rain.geometry.drawRange.count, hojasN, capa.children.length]; }
      ok('Calidad baja: 300 gotas, 0 hojas y 6 gotas en la cámara', cuentas.bajo.join() === '300,0,6', JSON.stringify(cuentas));
      ok('Medio 600/40/10 y alto 900/90/14', cuentas.medio.join() === '600,40,10' && cuentas.alto.join() === '900,90,14');
      // 6. «Reducir movimiento»: ni sacudida ni flash; en bajo, sin flash
      const tr = trueno({ reducido: true, seco: true }); R.setCalidad('bajo'); const trB = trueno({ reducido: false, seco: true });
      ok('Con «reducir movimiento» no hay sacudida ni flash; en calidad baja solo audio', !tr.shake && !tr.flash && !trB.flash && trB.shake);
      ok('Los sonidos trueno y lluvia existen', G.audio.has('trueno') && G.audio.has('lluvia'));
      // FPS en calidad baja (medidos, informativos: el equipo de las baterías no es el de referencia)
      const medir = async () => { let m = 0; for (let i = 0; i < 6; i++) { await espera(500); m = Math.max(m, R.stats().fps); } return m; };
      fijar('sol', { inmediato: true }); const fSol = await medir();
      fijar('aguacero', { inmediato: true }); const fAg = await medir();
      ok('FPS medidos en calidad baja (sol → aguacero)', fSol > 0 && fAg > 0, fSol + ' → ' + fAg + ' fps');
      // Quieto en las baterías y en Modo Retos
      F.sim = false; fijar(null); sim(0.3);
      ok('En las baterías (G.quiet) vuelve a sol y suelta la lluvia', F.estado === 'sol' && !G.fx.rain.visible && Math.abs(scene.fog.far - base.niebla[1]) < 0.5, F.estado + ' · lluvia ' + G.fx.rain.visible + ' · ' + Math.round(scene.fog.far) + ' m');
      ok('Sin errores de consola', (window.__aveErrores || []).length === errores0, (window.__aveErrores || []).slice(errores0).join(' | ').slice(0, 200));
    } catch (e) {
      ok('Sin excepciones', false, e && e.message);
    } finally {
      F.sim = false; F.cubierto = null; S.event = g.event; S.step = g.step; Object.assign(S.pos, g.pos); S.vy = g.vy; M.flying = g.flying; M.landing = g.landing;
      if (G.agua && g.setLevel) G.agua.setLevel = g.setLevel;
      if (R.calidad.nivel !== g.nivel) R.setCalidad(g.nivel); R.calidad.manual = g.manual; S.clock = g.clock;
      G.quiet = g.quiet; F.fijado = g.fijado; cambiar(F.fijado || 'sol', true);
      if (F.propia || !g.rain) { G.fx.rain.visible = g.rain; F.propia = false; }
      capa.classList.remove('on');
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }

  const api = { estado: () => F.estado, fijar, enTermica, viento, test, siguiente, F, get termicas() { return termicas; } };
  G.clima = api;
  return api;
};
