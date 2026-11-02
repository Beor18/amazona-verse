/* Juego · «Juice» de vuelo (DIVERSION_CAP1 §3, mejora 6): volar bien se siente. Nada castiga, no hay anillos ni relojes.
   - Rasante: volando a menos de 1 m del río o de la hierba (terreno o agua, nunca un tejado) a 6 m/s o más, sale una estela
     en la punta de cada ala (puntos suaves que se apagan), ondas en el agua y un soplo de aire con una nota que sube.
     Cada segundo seguido suma uno: «Rasante ×N» en un chip del HUD (en inglés «Skim ×N»); al dejarlo se queda 1,5 s y se va.
   - Picado: bajando con C a más de 4 m/s el campo de visión se abre hasta +7° (G.camara.fovPicado, aparte del de fovBonus de
     wow.js) y suena el viento. Remonte: si tras ≥ 0,6 s de picado se nivela sin pedir subir (sin aletear hacia arriba) y sigue
     volando rápido, un golpe de aire, un pulso de FOV y «¡Remonte!» pequeño. La física no cambia (fisica.js no se toca).
   - ¡Aterrizaje perfecto!: al terminar el vuelo tocando suelo, techo o rama a menos de 2 m/s (velocidad total al tocar),
     un pop dorado al centro, un acorde y un brillo. En el agua honda no cuenta. Si no sale, no pasa nada.
   - Pétalos: al cruzar volando la copa de un flamboyán (G.vegetacion.instancias, también los héroes del mapa), una lluvia de
     pétalos rojos y anaranjados (G.fx.petalos), con 1,2 s de espera por árbol.
   «Reducir movimiento» (prefers-reduced-motion o G.audio.reducido = true): sin FOV, sin estela, sin pétalos ni ondas, y los pops
   salen sin animación; quedan el chip, los textos y los sonidos. Con G.quiet (baterías) y en los minijuegos no hace nada.
   Se carga tras el primer gesto (boot.js). window.AVJuice(G) → G.juice = { stats, estado, test }. Prueba: AV.juiceTest(). */
window.AVJuice = function (G) {
  'use strict';
  const S = G.S, F = G.fisica, M = F.MOVE, cam = G.camara, scene = G.renderer.scene;
  const J = {
    rasAlto: 1, rasVel: 6, rasPaso: 1, rasQueda: 1.5,  // m sobre el agua o el terreno, m/s mínimos, s por cada «×1», s que queda el chip
    picadoVy: -4, picadoFov: 7, remonteMin: 0.6,       // m/s de bajada, ° de FOV al picar a fondo, s de picado para el remonte
    remonteFov: 4, perfectoV: 2, petaloEspera: 1.2,    // pulso de FOV del remonte, m/s al tocar, s entre pétalos del mismo árbol
  };
  const MINIJUEGO = /\b(retos|flight|maze|river|tren|duelo)-on\b/;
  let idiomaForzado = null, reducidoForzado = null, fuerza = false, simulado = null;
  const en = () => (idiomaForzado != null ? idiomaForzado === 'en' : !!(G.idioma && G.idioma.activo && G.idioma.activo()));
  const L = (es, eng) => (en() ? eng : es);
  const reducido = () => (reducidoForzado != null ? reducidoForzado : !!(G.renderer.REDUCED || (G.audio && G.audio.reducido === true)));
  const apagado = () => !fuerza && (G.quiet || MINIJUEGO.test(document.body.className) || !(S.profile && S.profile.created));
  const stats = { rasanteSeg: 0, rasanteMax: 0, rasantes: 0, picados: 0, remontes: 0, perfectos: 0, petalos: 0 };

  // ---------- Sonidos (sintetizados; no hay descarga) ----------
  const A = G.audio;
  if (A && A.define) {
    A.define('rasante', (t, n, X) => { X.noise(t, 0.5, { freq: 900, to: 2600, q: 0.5, gain: 0.07 }); X.tone(X.pent(Math.min(n || 1, 12) + 4, 392), t + 0.02, 0.32, { type: 'sine', gain: 0.07 }); });
    A.define('picado', (t, a, X) => X.noise(t, 0.9, { freq: 500, to: 2200, q: 0.6, gain: 0.09 }));
    A.define('remonte', (t, a, X) => { X.noise(t, 0.6, { freq: 2400, to: 600, q: 0.7, gain: 0.1 }); X.tone(523.25, t + 0.05, 0.25, { type: 'sine', to: 784, gain: 0.07 }); });
    A.define('aterrizaje_perfecto', (t, a, X) => { [0, 4, 7, 12].forEach((s, k) => X.tone(523.25 * Math.pow(2, s / 12), t + k * 0.06, 0.45, { type: 'triangle', gain: 0.09 })); X.noise(t + 0.2, 0.5, { freq: 7000, q: 0.6, gain: 0.04 }); });
    A.define('petalos', (t, a, X) => { X.tone(1318.5, t, 0.3, { type: 'sine', gain: 0.04 }); X.tone(1760, t + 0.07, 0.35, { type: 'sine', gain: 0.03 }); X.noise(t, 0.4, { freq: 3000, q: 0.8, gain: 0.03 }); });
  }
  const oidos = []; // lo que este módulo pidió sonar (la prueba lo lee; G.audio.log se recorta a 40)
  const sonar = (n, a) => { oidos.push(n); if (oidos.length > 200) oidos.splice(0, 100); sonarYa(n, a); };
  const sonarYa = (n, a) => { try { A.play(n, a); } catch (e) { /* sin audio */ } };

  // ---------- HUD: chip «Rasante ×N» y pop central ----------
  const st = document.createElement('style');
  st.textContent = '#juice-chip{position:fixed;left:0;right:0;margin-inline:auto;width:fit-content;bottom:calc(env(safe-area-inset-bottom,0px) + 132px);z-index:var(--z-hud,5);' +
    'padding:6px 16px;border-radius:999px;background:#10324a;color:#fff;border:2px solid #7fd3ff;font:700 18px/1.2 var(--font-display,sans-serif);letter-spacing:.02em;pointer-events:none;' +
    'box-shadow:0 3px 0 rgba(0,0,0,.25);transition:opacity .35s}' +
    '#juice-chip[hidden]{display:none}#juice-chip.sale{opacity:0}#juice-chip b{color:#ffe27a}' +
    '#juice-pop{position:fixed;left:0;right:0;top:34%;margin-inline:auto;width:fit-content;max-width:calc(100vw - 32px);z-index:var(--z-hud,5);pointer-events:none;text-align:center;' +
    'padding:10px 26px;border-radius:999px;background:#fff6d6;color:#3a2400;border:3px solid #e0a93a;font:800 28px/1.15 var(--font-display,sans-serif);box-shadow:0 4px 0 #b57d1f,0 0 24px rgba(255,220,120,.7)}' +
    '#juice-pop.chico{font-size:20px;padding:6px 18px;top:38%;background:#e9f8ff;color:#0b2a40;border-color:#7fd3ff;box-shadow:0 3px 0 #3d8fb0}' +
    '#juice-pop[hidden]{display:none}#juice-pop.anim{animation:juice-pop .9s cubic-bezier(.34,1.56,.64,1) both}' +
    '@keyframes juice-pop{0%{transform:scale(.4);opacity:0}25%{transform:scale(1.12);opacity:1}45%{transform:scale(.97)}60%,100%{transform:scale(1)}}' +
    '@media (prefers-reduced-motion: reduce){#juice-pop.anim{animation:none}#juice-chip{transition:none}}' +
    '@media (max-width:600px){#juice-pop{font-size:22px}#juice-chip{font-size:16px;bottom:calc(env(safe-area-inset-bottom,0px) + 168px)}}';
  document.head.appendChild(st);
  const chip = document.createElement('div'); chip.id = 'juice-chip'; chip.hidden = true; chip.setAttribute('aria-hidden', 'true'); document.body.appendChild(chip);
  const pop = document.createElement('div'); pop.id = 'juice-pop'; pop.hidden = true; pop.setAttribute('role', 'status'); pop.setAttribute('aria-live', 'polite'); document.body.appendChild(pop);
  let popT = 0;
  function mostrarPop(texto, chico) {
    pop.textContent = texto; pop.className = chico ? 'chico' : ''; pop.hidden = false; popT = chico ? 1.1 : 1.6;
    if (!reducido()) { void pop.offsetWidth; pop.classList.add('anim'); }
  }
  // Si el juego se pausa (menú, Diario, una tarjeta) el bucle 'update' no corre: el chip y el pop no se quedan encima de esa pantalla
  let ultimoPaso = 0;
  const ocultar = () => { chip.hidden = true; chip.classList.remove('sale'); pop.hidden = true; pop.classList.remove('anim'); popT = 0; };
  setInterval(() => { if ((!chip.hidden || !pop.hidden) && performance.now() - ultimoPaso > 400) ocultar(); }, 250);
  const pintarChip = n => { chip.innerHTML = `${L('Rasante', 'Skim')} <b>×${n}</b>`; };

  // ---------- Estela: dos colas de puntos (puntas de las alas), un solo Points aditivo ----------
  const COLA = 36, N = COLA * 2;
  const geo = new THREE.BufferGeometry(), posA = new Float32Array(N * 3), edadA = new Float32Array(N).fill(9);
  geo.setAttribute('position', new THREE.BufferAttribute(posA, 3)); geo.setAttribute('edad', new THREE.BufferAttribute(edadA, 1));
  const uni = { uColor: { value: new THREE.Color('#dff6ff') }, uVida: { value: 0.6 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: 'attribute float edad; uniform float uVida; varying float vA;\n' +
      'void main() { vA = clamp(1.0 - edad / uVida, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;\n' +
      ' gl_PointSize = clamp((60.0 + 60.0 * vA) / max(1.0, -mv.z), 1.5, 16.0); }',
    fragmentShader: 'uniform vec3 uColor; varying float vA; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = clamp(1.0 - d, 0.0, 1.0); a *= a * vA * 0.85;\n' +
      ' gl_FragColor = vec4(uColor * a, a); }',
  });
  const estela = new THREE.Points(geo, mat);
  estela.name = 'juice_estela'; estela.frustumCulled = false; estela.visible = false; estela.renderOrder = 4; scene.add(estela);
  let cabeza = 0, emitir = 0, onda = 0;
  function sembrar(x, y, z) {
    const fx = S.facing ? S.facing.x : 0, fz = S.facing ? S.facing.z : 1, ox = -fz * 0.75, oz = fx * 0.75, bx = x - fx * 0.3, bz = z - fz * 0.3;
    for (let k = 0; k < 2; k++) { const i = k * COLA + cabeza; posA.set([bx + (k ? -ox : ox), y + 0.55, bz + (k ? -oz : oz)], i * 3); edadA[i] = 0; }
    cabeza = (cabeza + 1) % COLA; geo.attributes.position.needsUpdate = true;
  }
  function envejecer(dt) {
    let viva = false;
    for (let i = 0; i < N; i++) { if (edadA[i] < 9) { edadA[i] += dt; if (edadA[i] < uni.uVida.value) viva = true; } }
    geo.attributes.edad.needsUpdate = true; estela.visible = viva; return viva;
  }

  // ---------- Flamboyanes: copas cercanas (centro y radio), de las instancias de la flora ----------
  let copas = [], copasT = -1, copasExtra = null;
  const espera = new Map(); // índice de copa → s que faltan para soltar pétalos otra vez
  function copasFlamboyan() {
    const V = G.vegetacion, ahora = performance.now();
    if (ahora - copasT < 1000 && !copasExtra) return copas;
    copasT = ahora; copas = [];
    if (copasExtra) { copas = copasExtra.slice(); return copas; }
    if (!V || !V.instancias || !V.info) return copas;
    for (const m in V.instancias) {
      if (!/flamboy/i.test(m)) continue;
      const inf = V.info[m], P = V.instancias[m]; if (!inf || !P) continue;
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i * 4], z = P.pos[i * 4 + 2], sc = P.pos[i * 4 + 3];
        if (Math.abs(x - S.pos.x) > 40 || Math.abs(z - S.pos.z) > 40) continue;
        copas.push([x, P.pos[i * 4 + 1] + inf.alto * sc * 0.66, z, Math.max(2.5, Math.min(7, inf.ancho * 0.5) * sc), m + ':' + i]);
      }
    }
    return copas;
  }

  // ---------- Lo que se lee de Vittata cada cuadro ----------
  function leer() {
    if (simulado) return simulado;
    const x = S.pos.x, z = S.pos.z, tierra = G.terreno.height(x, z), wY = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity;
    const agua = wY > tierra + 0.05, sup = agua ? wY : tierra;
    return { x, y: S.pos.y, z, vy: S.vy || 0, speed: M.speed || 0, flying: !!M.flying, landing: !!M.landing, takeoff: M.takeoff || 0,
      sube: !!(G.input && G.input.jumpHeld), alto: S.pos.y - sup, agua, sup, hondo: wY - tierra > 0.7 };
  }

  // ---------- Estado ----------
  const E = { ras: false, rasT: 0, rasN: 0, chipT: 0, picT: 0, picando: false, fov: 0, pulso: 0, remonte: false };
  function paso(dt) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1); ultimoPaso = performance.now();
    if (!fuerza && G.ui.busy && G.ui.busy() && (!chip.hidden || !pop.hidden)) ocultar();
    popT -= dt; if (popT <= 0 && !pop.hidden) { pop.hidden = true; pop.classList.remove('anim'); }
    const off = apagado(), v = off ? null : leer(), red = reducido();
    const vuela = !!v && v.flying && v.takeoff <= 0 && !v.landing;
    // Rasante
    const ras = vuela && v.alto >= -0.05 && v.alto < J.rasAlto && v.speed >= J.rasVel;
    if (ras) {
      if (!E.ras) { E.ras = true; E.rasT = 0; E.rasN = 0; stats.rasantes++; }
      E.rasT += dt; stats.rasanteSeg += dt;
      const n = 1 + Math.floor(E.rasT / J.rasPaso);
      if (n !== E.rasN) { E.rasN = n; stats.rasanteMax = Math.max(stats.rasanteMax, n); pintarChip(n); chip.hidden = false; chip.classList.remove('sale'); sonar('rasante', n); }
      E.chipT = J.rasQueda;
      if (!red) {
        uni.uColor.value.set(v.agua ? '#dff6ff' : '#f4ffd8');
        if ((emitir -= dt) <= 0) { emitir = 0.03; sembrar(v.x, v.y, v.z); }
        if (v.agua && (onda -= dt) <= 0 && G.agua && G.agua.ripple) { onda = 0.14; G.agua.ripple(v.x, v.sup, v.z, 0.8); }
      }
    } else {
      E.ras = false;
      if (!chip.hidden) { E.chipT -= dt; if (E.chipT <= 0.35) chip.classList.add('sale'); if (E.chipT <= 0) { chip.hidden = true; chip.classList.remove('sale'); } }
    }
    envejecer(dt);
    // Picado y remonte
    const picando = vuela && v.vy < J.picadoVy;
    if (picando) { if (!E.picando) { stats.picados++; sonar('picado'); } E.picando = true; E.picT += dt; }
    else {
      if (E.picando && E.picT >= J.remonteMin && vuela && !v.sube && v.vy > -1.5 && v.speed >= J.rasVel && v.alto > 0.3) {
        stats.remontes++; E.remonte = true; E.pulso = 1; sonar('remonte'); mostrarPop(L('¡Remonte!', 'Swoop!'), true);
      }
      if (!picando && (!vuela || v.vy > -1.5)) { E.picando = false; E.picT = 0; }
    }
    E.pulso = Math.max(0, E.pulso - dt / 0.8);
    const meta = red || !v ? 0 : (picando ? J.picadoFov * Math.min(1, (-v.vy - 3) / 4) : 0) + J.remonteFov * E.pulso;
    E.fov += (meta - E.fov) * Math.min(1, dt * 5); if (Math.abs(E.fov) < 0.02 && !meta) E.fov = 0;
    cam.fovPicado = E.fov;
    // Pétalos del flamboyán
    for (const [k, t] of espera) { if (t - dt <= 0) espera.delete(k); else espera.set(k, t - dt); }
    if (v && v.flying && v.speed > 1.5) {
      const cy = v.y + 0.8;
      for (const c of copasFlamboyan()) {
        const dx = v.x - c[0], dy = cy - c[1], dz = v.z - c[2];
        if (dx * dx + dy * dy + dz * dz < c[3] * c[3] && !espera.has(c[4])) {
          espera.set(c[4], J.petaloEspera); stats.petalos++; sonar('petalos');
          if (!red && G.fx && G.fx.petalos) G.fx.petalos(v.x, cy + 0.6, v.z, 16);
          break;
        }
      }
    }
  }
  // Aterrizaje: 'vuelo' false se emite en el mismo cuadro del toque (antes de poner vy a 0), con la velocidad del toque
  function alAterrizar(v) {
    if (apagado()) return false;
    v = v || leer();
    if (v.hondo && v.y <= v.sup + 0.2) return false; // se posó en el agua: a nadar, sin pop
    const suelo = v.suelo != null ? v.suelo : F.suelo(v.x, v.z, v.y + 0.3);
    if (!(v.y - suelo < 0.25)) return false; // terminó el vuelo en el aire (un minijuego, una prueba): no es aterrizaje
    const vel = Math.hypot(v.speed, v.vy);
    if (vel >= J.perfectoV) return false;
    stats.perfectos++; sonar('aterrizaje_perfecto'); mostrarPop(L('¡Aterrizaje perfecto!', 'Perfect landing!'));
    if (!reducido() && G.fx) { G.fx.burst(v.x, v.y + 0.6, v.z, 'gold', 14); }
    G.emit('aterrizajePerfecto', { vel: +vel.toFixed(2) });
    return true;
  }
  G.on('vuelo', on => { if (!on) alAterrizar(); });
  G.on('update', dt => paso(dt), 88);
  const limpiar = () => { E.ras = false; E.picando = false; E.picT = 0; E.pulso = 0; E.fov = 0; cam.fovPicado = 0; chip.hidden = true; pop.hidden = true; popT = 0; edadA.fill(9); estela.visible = false; espera.clear(); };
  G.on('apply', limpiar, 90);

  // ---------- Prueba (AV.juiceTest): cada efecto con cuadros simulados, sin depender de volar de verdad ----------
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const g0 = { quiet: G.quiet, fov: cam.fovPicado, stats: Object.assign({}, stats) };
    const audioLog = () => oidos.slice();
    const sono = (n, desde) => audioLog().slice(desde).indexOf(n) >= 0;
    const base = o => Object.assign({ x: S.pos.x, y: 10, z: S.pos.z, vy: 0, speed: 12, flying: true, landing: false, takeoff: 0, sube: false, alto: 8, agua: false, sup: 2, hondo: false, suelo: 2 }, o);
    const correr = (seg, o, dt) => { dt = dt || 1 / 30; simulado = base(o); for (let t = 0; t < seg - 1e-6; t += dt) paso(dt); };
    const reset = () => { simulado = null; limpiar(); for (let i = 0; i < 40; i++) paso(0.1); };
    const p0 = G.fx.juicy.petalos || 0;
    try {
      fuerza = true; reducidoForzado = false; idiomaForzado = 'es';
      // 1. Sonidos definidos
      ok('Sonidos: rasante, picado, remonte, aterrizaje perfecto y pétalos (sintetizados)', ['rasante', 'picado', 'remonte', 'aterrizaje_perfecto', 'petalos'].every(n => G.audio.has(n)));
      // 2. Rasante sobre el río: estela, onda, chip que cuenta por segundo, nota que sube
      reset(); let a0 = oidos.length; const r0 = G.fx.list.length;
      correr(3.2, { alto: 0.6, agua: true, sup: 2, y: 2.6 });
      ok('Rasante: a < 1 m del agua y 12 m/s, el chip dice «Rasante ×4» tras 3,2 s', !chip.hidden && chip.textContent.replace(/\s+/g, ' ').trim() === 'Rasante ×4', chip.textContent);
      ok('Rasante: suena una nota por cada «×N»', audioLog().slice(a0).filter(n => n === 'rasante').length >= 4);
      ok('Rasante: la estela se ve (dos colas de puntos aditivos)', estela.visible && mat.blending === THREE.AdditiveBlending && edadA.some(e => e < 0.3));
      ok('Rasante: sobre el agua deja ondas', G.fx.list.length > r0);
      ok('Rasante: cuenta segundos y el mejor ×N', stats.rasanteMax >= 4 && stats.rasanteSeg >= 3, JSON.stringify({ max: stats.rasanteMax, seg: +stats.rasanteSeg.toFixed(1) }));
      // 3. Sobre la hierba también; lento o alto, no
      reset(); correr(1.2, { alto: 0.4 });
      ok('Rasante: sobre la hierba también («×2» a 1,2 s; estela verde clara)', !chip.hidden && /×2/.test(chip.textContent) && uni.uColor.value.getHexString() === 'f4ffd8', chip.textContent);
      reset(); correr(2, { alto: 0.5, speed: 3 }); const lento = chip.hidden;
      reset(); correr(2, { alto: 2.5 }); const alto = chip.hidden;
      reset(); correr(2, { alto: 0.5, landing: true }); const aterr = chip.hidden;
      ok('Rasante: no cuenta lento (< 6 m/s), alto (> 1 m) ni aterrizando', lento && alto && aterr);
      // 4. El chip se va solo al dejar el rasante (sin castigo: nada se pierde)
      reset(); correr(1.5, { alto: 0.5 }); correr(1, { alto: 5 }); const sigue = !chip.hidden; correr(1, { alto: 5 });
      ok('Rasante: al subir el chip se queda un momento y se va solo', sigue && chip.hidden);
      // 5. Inglés
      idiomaForzado = 'en'; reset(); correr(2.1, { alto: 0.5 });
      ok('Inglés: el chip dice «Skim ×3»', chip.textContent.replace(/\s+/g, ' ').trim() === 'Skim ×3', chip.textContent);
      idiomaForzado = 'es';
      // 6. Picado: FOV hasta +7 y viento; remonte sin aletear
      reset(); a0 = oidos.length; correr(1.2, { vy: -7, alto: 12 });
      const fovPic = cam.fovPicado;
      ok('Picado: el campo de visión se abre (+5 a +7°) y suena el viento', fovPic > 5 && fovPic <= J.picadoFov + 0.01 && sono('picado', a0), fovPic.toFixed(2));
      a0 = oidos.length; correr(0.1, { vy: -0.4, alto: 6 });
      ok('Remonte: nivelar tras el picado sin pedir subir da «¡Remonte!», golpe de aire y pulso de FOV', !pop.hidden && pop.textContent === '¡Remonte!' && sono('remonte', a0) && E.pulso > 0.8);
      correr(3, { vy: 0, alto: 6 });
      ok('Picado: el FOV vuelve a 0 al nivelar', cam.fovPicado === 0, cam.fovPicado);
      reset(); const rem0 = stats.remontes; correr(1.2, { vy: -7, alto: 12 }); correr(0.1, { vy: 3, sube: true, alto: 8 });
      ok('Remonte: subiendo con las alas (salto) no cuenta como remonte', stats.remontes === rem0);
      reset(); correr(0.3, { vy: -7, alto: 12 }); correr(0.1, { vy: 0, alto: 8 });
      ok('Remonte: un picado corto (< 0,6 s) no cuenta', stats.remontes === rem0);
      // 7. Aterrizaje perfecto
      reset(); a0 = oidos.length; const pf0 = stats.perfectos;
      const lento2 = alAterrizar(base({ flying: false, speed: 1.1, vy: -1.3, y: 2, suelo: 2 }));
      ok('Aterrizaje perfecto: a 1,7 m/s sale «¡Aterrizaje perfecto!» con acorde', lento2 && !pop.hidden && pop.textContent === '¡Aterrizaje perfecto!' && sono('aterrizaje_perfecto', a0) && stats.perfectos === pf0 + 1);
      ok('Aterrizaje perfecto: el pop se anima (escala con rebote)', pop.classList.contains('anim'));
      const rapido = alAterrizar(base({ flying: false, speed: 5, vy: -1.3, y: 2, suelo: 2 }));
      const agua = alAterrizar(base({ flying: false, speed: 0.5, vy: -0.5, y: 2, sup: 2, hondo: true, suelo: 0 }));
      const aire = alAterrizar(base({ flying: false, speed: 0.5, vy: 0, y: 9, suelo: 2 }));
      ok('Aterrizaje: a 5 m/s, en el agua honda o en el aire no hay pop (sin castigo: no pasa nada)', !rapido && !agua && !aire && stats.perfectos === pf0 + 1);
      idiomaForzado = 'en'; alAterrizar(base({ flying: false, speed: 0.5, vy: -1, y: 2, suelo: 2 }));
      ok('Inglés: «Perfect landing!»', pop.textContent === 'Perfect landing!'); idiomaForzado = 'es';
      for (let i = 0; i < 20; i++) paso(0.1);
      ok('Aterrizaje perfecto: el pop se va solo', pop.hidden);
      reset(); correr(1.5, { alto: 0.5 }); alAterrizar(base({ flying: false, speed: 0.5, vy: -1, y: 2, suelo: 2 }));
      const antesPausa = !chip.hidden && !pop.hidden; await new Promise(res => setTimeout(res, 900));
      ok('En pausa (sin cuadros) el chip y el pop no se quedan encima del menú', antesPausa && chip.hidden && pop.hidden);
      // 8. Pétalos al cruzar un flamboyán (copa de prueba) con espera por árbol
      reset(); copasExtra = [[S.pos.x, 10, S.pos.z, 4, 'prueba']]; copasT = -1; a0 = oidos.length; const vivos0 = G.fx.live;
      correr(0.2, { y: 9.5, alto: 7 });
      ok('Pétalos: al cruzar la copa de un flamboyán caen pétalos (rojo y anaranjado) y suena un brillo', (G.fx.juicy.petalos || 0) === p0 + 1 && G.fx.live > vivos0 && sono('petalos', a0) && !!G.fx.PALETTE.petals, (G.fx.juicy.petalos || 0) - p0);
      correr(0.6, { y: 9.5, alto: 7 });
      ok('Pétalos: el mismo árbol espera 1,2 s antes de soltar más', (G.fx.juicy.petalos || 0) === p0 + 1);
      correr(1, { y: 9.5, alto: 7 });
      ok('Pétalos: pasada la espera vuelven a caer', (G.fx.juicy.petalos || 0) === p0 + 2);
      copasExtra = null; copasT = -1;
      const V = G.vegetacion, hayFl = !!(V && V.instancias && Object.keys(V.instancias).some(m => /flamboy/i.test(m) && V.instancias[m].n > 0));
      ok('Pétalos: el mapa tiene flamboyanes en la flora para cruzar', hayFl || !(G.terreno.mapa && G.terreno.mapa.flora), hayFl);
      // 9. Reducir movimiento: sin FOV, estela ni pétalos; el chip y el pop siguen (sin animación)
      reducidoForzado = true; reset(); correr(1.2, { alto: 0.5 });
      const sinEstela = !estela.visible, chipR = !chip.hidden;
      correr(1.2, { vy: -7, alto: 12 }); const fovR = cam.fovPicado;
      copasExtra = [[S.pos.x, 10, S.pos.z, 4, 'prueba2']]; copasT = -1; const pr0 = G.fx.juicy.petalos; correr(0.2, { y: 9.5, alto: 7 }); copasExtra = null; copasT = -1;
      alAterrizar(base({ flying: false, speed: 0.5, vy: -1, y: 2, suelo: 2 }));
      ok('Reducir movimiento: sin FOV, sin estela ni pétalos; chip y pop sin animación', sinEstela && chipR && fovR === 0 && G.fx.juicy.petalos === pr0 && !pop.hidden && !pop.classList.contains('anim'), JSON.stringify({ sinEstela, chipR, fovR, pet: G.fx.juicy.petalos - pr0 }));
      reducidoForzado = false;
      // 10. Baterías y minijuegos: nada
      fuerza = false; G.quiet = true; reset(); correr(2, { alto: 0.5 });
      const q = chip.hidden && cam.fovPicado === 0 && !alAterrizar(base({ flying: false, speed: 0.5, vy: -1, y: 2, suelo: 2 }));
      G.quiet = false; document.body.classList.add('retos-on'); reset(); correr(2, { alto: 0.5 }); const mj = chip.hidden; document.body.classList.remove('retos-on');
      ok('Con G.quiet (baterías) y en un minijuego no hace nada', q && mj);
      // 11. Cámara: fovPicado entra en el FOV y respeta la cámara sin vida
      fuerza = true; simulado = null;
      const C = cam.CAM, sv = C.sinVida; cam.fovPicado = 6; const camF = G.renderer.camera, f0 = camF.fov;
      for (let i = 0; i < 60; i++) cam.fov(0.1); const fConPic = camF.fov;
      C.sinVida = true; for (let i = 0; i < 60; i++) cam.fov(0.1); const fSinVida = camF.fov; C.sinVida = sv; cam.fovPicado = 0; for (let i = 0; i < 60; i++) cam.fov(0.1);
      ok('Cámara: fovPicado abre el FOV (+6) y se apaga con la cámara sin vida', fConPic - fSinVida > 5.5, JSON.stringify({ f0: +f0.toFixed(1), con: +fConPic.toFixed(1), sinVida: +fSinVida.toFixed(1) }));
      // 12. Con el estado real de Vittata: volando a 0,5 m del terreno a crucero, leer() lo ve como rasante
      const snap = { flying: M.flying, landing: M.landing, takeoff: M.takeoff, speed: M.speed, y: S.pos.y, vy: S.vy };
      try {
        M.flying = true; M.landing = false; M.takeoff = 0; M.speed = 12; S.vy = 0;
        S.pos.y = Math.max(G.terreno.height(S.pos.x, S.pos.z), G.agua.levelAt(S.pos.x, S.pos.z)) + 0.5;
        const r = leer();
        ok('Estado real: volando a 0,5 m del suelo a 12 m/s es rasante', r.flying && r.alto > 0.4 && r.alto < 0.6 && r.speed === 12, JSON.stringify({ alto: +r.alto.toFixed(2), agua: r.agua }));
      } finally { M.flying = snap.flying; M.landing = snap.landing; M.takeoff = snap.takeoff; M.speed = snap.speed; S.pos.y = snap.y; S.vy = snap.vy; }
    } finally {
      fuerza = false; reducidoForzado = null; idiomaForzado = null; simulado = null; copasExtra = null; copasT = -1;
      G.quiet = g0.quiet; document.body.classList.remove('retos-on'); limpiar(); Object.assign(stats, g0.stats);
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.juice = { stats, J, test, get estado() { return { rasante: E.ras ? E.rasN : 0, picando: E.picando, fov: E.fov }; } };
  return G.juice;
};
