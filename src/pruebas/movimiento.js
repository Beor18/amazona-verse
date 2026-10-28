/* AVE · AV.movementTest (rol Movimiento y animación; ver docs/equipo/MOVIMIENTO.md)
   Mide y comprueba la respuesta del personaje con la simulación real (fisica.step a 60 Hz, sin dibujar):
   latencia de entrada, arranque y frenado, salto (alto, toque corto, doble, búfer y coyote), pendientes, vuelo (despegue,
   cernido, aterrizaje suave), agua, el pico al hablar (máquina de escribir) y agarrar → llevar → soltar.
   Devuelve { passed, total, results, metricas }. La partida y la posición del jugador quedan como estaban.
   Opciones: { lugar: { x, z } } para medir en otro sitio.
   Se carga al pedir la prueba (boot.js: AV.movementTest), no en la descarga inicial del juego. */
window.AVMovimientoTest = function (G) {
  'use strict';
  const S = G.S, DT = 1 / 60;
  const r2 = v => Math.round(v * 100) / 100, ms = n => Math.round(n * DT * 1000);
  const sleep = t => new Promise(r => setTimeout(r, t));

  async function test(opts) {
    opts = opts || {};
    const F = G.fisica, M = F.MOVE, T = F.TUNING, K = G.input.keys, I = G.input, H = G.terreno.height;
    const R = G.pruebas.runner(), check = R.check, met = {};
    const keep = { pos: Object.assign({}, S.pos), facing: Object.assign({}, S.facing), vy: S.vy, yaw: G.camara.yaw, quiet: G.quiet, lazy: [G.camara.CAM.lazy, G.camara.CAM.lazyFly] };
    G.camara.CAM.lazy = G.camara.CAM.lazyFly = 0; // la cámara no gira sola durante la prueba: las direcciones son repetibles
    // Mundo limpio, venga de donde venga (otras pruebas, partida nueva con el creador abierto): sin ventanas ni diálogos,
    // MOVE en reposo y la cámara con el giro inicial del pack (las direcciones de la prueba son relativas a la cámara)
    const $ = G.util.$, ventanas = ['creator', 'comic', 'end'].filter(id => $(id) && !$(id).hidden);
    for (const id of ventanas) $(id).hidden = true;
    if (G.dialogo.open()) G.dialogo.clear(); if (G.ui.cardOpen) G.ui.hideCard();
    Object.assign(M, { flying: false, landing: false, takeoff: 0, swimming: false, dashT: 0, dashCd: 0, jumping: false, buffer: 0, land: 0, vx: 0, vz: 0 });
    S.vy = 0; G.camara.yaw = G.pack.jugador && G.pack.jugador.camara != null ? G.pack.jugador.camara : 0.35;
    G.quiet = true;
    const P3 = G.actores.player3D;
    const frame = (fn, n) => { const out = []; for (let i = 0; i < (n || 1); i++) { if (fn) fn(i); G.renderer.update(DT); out.push({ x: S.pos.x, y: S.pos.y, z: S.pos.z, vy: S.vy, sp: M.speed, g: M.groundY, fly: M.flying, sw: !!M.swimming, gr: M.grounded }); } return out; };
    const anim = n => { for (let i = 0; i < n; i++) { const mv = G.renderer.update(DT); G.emit('render', DT, G.renderer.t, mv); } };
    const reset = (x, z, y) => {
      K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false;
      F.endFlight(); M.flying = false; M.vx = M.vz = 0; M.dashT = M.dashCd = 0; M.buffer = 0; M.swimming = false;
      S.pos.x = x; S.pos.z = z; S.pos.y = y != null ? y : F.suelo(x, z, H(x, z) + 0.5); S.vy = 0; M.grounded = true; M.wasAir = false;
      frame(null, 20);
    };
    // Dirección de cámara → tecla: 'w' avanza alejándose de la cámara
    const fwd = () => ({ x: -Math.sin(G.camara.yaw), z: -Math.cos(G.camara.yaw) });
    // Sitio de pruebas: llano, seco y sin obstáculos cerca del jugador (o el pedido)
    function sitio(rechazados) {
      if (opts.lugar) return opts.lugar;
      const c = G.pack.jugador && G.pack.jugador.aparicion || keep.pos;
      let best = null;
      for (let rr = 0; rr <= 120; rr += 6) for (let a = 0; a < (rr ? 16 : 1); a++) {
        const x = c.x + Math.cos(a / 16 * Math.PI * 2) * rr, z = c.z + Math.sin(a / 16 * Math.PI * 2) * rr;
        if (Math.abs(x) > G.terreno.WORLD - 14 || Math.abs(z) > G.terreno.WORLD - 14) continue;
        let mx = -1e9, mn = 1e9;
        for (let b = 0; b < 8; b++) for (const d of [3, 7, 11]) { const h = H(x + Math.cos(b) * d, z + Math.sin(b) * d); mx = Math.max(mx, h); mn = Math.min(mn, h); }
        if (G.agua.levelAt(x, z) > H(x, z) - 0.5) continue;
        // ni agua a menos de 30 m (el vuelo de prueba no debe acabar nadando en el mar o el río)
        if ([10, 20, 30].some(d => [0, 1, 2, 3, 4, 5, 6, 7].some(b => { const ax = x + Math.cos(b * Math.PI / 4) * d, az = z + Math.sin(b * Math.PI / 4) * d; return G.agua.levelAt(ax, az) > H(ax, az) - 0.3; }))) continue;
        if (F.colliders.some(k => k.r > 0 && (!k.when || k.when()) && Math.hypot(k.x - x, k.z - z) < 12 + (k.r || 0) + Math.max(k.hx || 0, k.hz || 0))) continue;
        if (F.perchas.some(p => Math.hypot(p.x - x, p.z - z) < 12 + p.r)) continue;
        if (rechazados && rechazados.some(q => q.x === x && q.z === z)) continue;
        if (!best || mx - mn < best.d) best = { x, z, d: mx - mn };
        if (best.d < 0.6) return best;
      }
      return best || { x: c.x, z: c.z };
    }
    try {
      // El sitio se comprueba andando de verdad: los colliders a mano no ven los sólidos de la geometría (edificios, flora por
      // regiones, que se rasteriza por tandas y cambia con la carga). Si a 6 m en línea recta algo frena el paso, se prueba otro.
      let L = sitio();
      if (!opts.lugar) {
        const malos = [];
        for (let intento = 0; intento < 10; intento++) {
          reset(L.x, L.z);
          const w = frame(i => { if (i === 0) K.add('w'); }, 45); K.clear();
          const pico = Math.max(...w.map(o => o.sp)), fin = w.slice(30).map(o => o.sp);
          if (Math.min(...fin) > Math.min(pico, T.walk) * 0.7) break; // llegó a crucero y se mantiene (la cuesta ya lo frena un poco)
          malos.push(L); L = sitio(malos);
        }
        met.sitiosDescartados = malos.length;
      }
      met.sitio = { x: r2(L.x), z: r2(L.z) };
      // 1. Latencia y arranque: la tecla se lee en el primer paso tras pulsarla
      reset(L.x, L.z);
      // El arranque se mide sin el freno de la cuesta (uphillSlow = 0): en un sitio inclinado la pendiente solo aparece tras el
      // primer cuadro (grade = subida / paso) y la meta baja a media rampa, lo que alarga el 90 % sin que el arranque sea peor.
      // La cuesta se prueba aparte, en 'Pendientes'.
      const uphill = T.uphillSlow; T.uphillSlow = 0;
      let r = frame(i => { if (i === 0) K.add('w'); }, 45);
      T.uphillSlow = uphill;
      const lat = r.findIndex(o => o.sp > 0.05);
      met.latenciaCuadros = lat + 1;
      const top = Math.max(...r.map(o => o.sp)); // velocidad de crucero real (en cuesta arriba es algo menor que walk); el máximo, no el último cuadro: un tope no lo falsea
      met.arranque90ms = ms(r.findIndex(o => o.sp >= top * 0.9) + 1);
      check('Respuesta inmediata: se mueve en el primer cuadro tras la tecla', lat === 0, met.latenciaCuadros + ' cuadro');
      check('Arranque: 90 % de la velocidad en menos de 0,18 s', met.arranque90ms <= 180, met.arranque90ms + ' ms');
      r = frame(i => { if (i === 0) K.delete('w'); }, 40);
      met.frenado10ms = ms(r.findIndex(o => o.sp < T.walk * 0.1) + 1);
      met.frenadoM = r2(Math.hypot(r[r.length - 1].x - r[0].x, r[r.length - 1].z - r[0].z));
      check('Frenado: se para en menos de 0,15 s sin patinar', met.frenado10ms <= 150 && met.frenadoM < 0.5, met.frenado10ms + ' ms, ' + met.frenadoM + ' m');
      // Giro en seco: de avanzar a retroceder
      frame(() => K.add('w'), 40);
      r = frame(i => { if (i === 0) { K.delete('w'); K.add('s'); } }, 40);
      const f = fwd(), back = r.findIndex(o => o.sp > T.walk * 0.8 && ((o.x - r[0].x) * f.x + (o.z - r[0].z) * f.z) < 0);
      met.giro180ms = ms(back + 1);
      check('Giro de 180° en menos de 0,3 s', back >= 0 && met.giro180ms <= 300, met.giro180ms + ' ms');
      K.clear();
      // 2. Salto
      reset(L.x, L.z); const y0 = S.pos.y;
      r = frame(i => { if (i === 0) { I.jumpHeld = true; F.tryJump(); } }, 70); I.jumpHeld = false; F.releaseJump();
      const apex = Math.max(...r.map(o => o.y)) - y0, land = r.findIndex((o, i) => i > 2 && o.gr);
      met.saltoAltoM = r2(apex); met.saltoAireMs = ms(land + 1);
      check('Salto completo de 1,1 a 1,5 m', apex > 1.1 && apex < 1.5, met.saltoAltoM + ' m, ' + met.saltoAireMs + ' ms en el aire');
      reset(L.x, L.z);
      r = frame(i => { if (i === 0) { I.jumpHeld = true; F.tryJump(); } if (i === 4) { I.jumpHeld = false; F.releaseJump(); } }, 60);
      met.saltoCortoM = r2(Math.max(...r.map(o => o.y)) - y0);
      check('Un toque corto da un salto más bajo (control fino)', met.saltoCortoM < apex * 0.75, met.saltoCortoM + ' m');
      reset(L.x, L.z);
      r = frame(i => { if (i === 0) F.tryJump(); if (i === 20) F.tryJump(); }, 100);
      met.dobleSaltoM = r2(Math.max(...r.map(o => o.y)) - y0);
      check('El doble salto sube más', met.dobleSaltoM > apex + 0.6, met.dobleSaltoM + ' m');
      // Búfer: saltar 0,08 s antes de tocar el suelo vuelve a saltar al aterrizar (no gasta el doble salto ni despega)
      reset(L.x, L.z); frame(() => {}, 1);
      F.tryJump(); let n = 0; while (!(S.vy < 0 && (S.pos.y - M.groundY) / -S.vy < 0.08) && n++ < 120) frame();
      const airJ = M.airJumps; F.tryJump(); r = frame(null, 12);
      check('Búfer de salto: pulsar justo antes de aterrizar salta al tocar el suelo', !M.flying && M.airJumps === airJ && r.some((o, i) => i > 0 && o.vy > T.jumpV * 0.8), 'búfer ' + T.jumpBuffer + ' s');
      // Coyote: recién salido de un borde todavía salta
      reset(L.x, L.z); S.pos.y += 0.4; M.grounded = false; M.coyote = T.coyote; frame(null, 4);
      F.tryJump();
      check('Tiempo de coyote: salta 0,07 s después de dejar el suelo', S.vy > T.jumpV * 0.9 && !M.flying, T.coyote + ' s');
      // 3. Vuelo: despegar, cernirse sin tocar nada, aterrizar suave.
      // La cámara mira hacia el lado más despejado: el relieve más bajo a 60 m (y a la derecha, por el giro) y sin agua,
      // para que el crucero y el giro no choquen con una ladera ni acaben sobre el mar
      { let mejor = null; const h0 = H(L.x, L.z);
        for (let b2 = 0; b2 < 16; b2++) {
          const ang = b2 / 16 * Math.PI * 2, fx = Math.sin(ang), fz = Math.cos(ang), rx = -fz, rz = fx;
          let alto = -1e9, agua = false;
          for (const d of [10, 20, 30, 40, 50, 60]) for (const [ux, uz] of [[fx, fz], [(fx + rx) * 0.7, (fz + rz) * 0.7], [rx, rz]]) {
            const x = L.x + ux * d, z = L.z + uz * d; alto = Math.max(alto, H(x, z) - h0); if (G.agua.levelAt(x, z) > H(x, z) - 0.3) agua = true;
          }
          const score = alto + (agua ? 100 : 0); if (!mejor || score < mejor.score) mejor = { score, fx, fz };
        }
        G.camara.yaw = Math.atan2(-mejor.fx, -mejor.fz); met.direccionVuelo = { despejeM: r2(mejor.score) }; }
      reset(L.x, L.z);
      F.toggleFly(); r = frame(null, 60);
      const alto = S.pos.y - y0;
      met.despegueM = r2(alto);
      check('Despegue: V sube y se queda volando', M.flying && alto > 1.5, met.despegueM + ' m');
      r = frame(null, 120);
      met.cernidoDeriva = r2(Math.abs(r[r.length - 1].y - r[0].y));
      check('Cernido: sin tocar nada se queda en el sitio (no cae)', M.flying && met.cernidoDeriva < 0.3, met.cernidoDeriva + ' m en 2 s');
      // sube hasta 20 m sobre el suelo (o 5 s): crucero y giro por encima de las copas, lejos del suelo y del agua
      { let nn = 0; while (S.pos.y - M.groundY < 20 && nn++ < 300) frame(() => I.jumpHeld = true); } I.jumpHeld = false;
      met.subirMs = r2(T.climbV);
      r = frame(() => K.add('w'), 150); K.clear();
      met.vueloVel = r2(M.speed);
      check('Crucero a la velocidad de vuelo', Math.abs(M.speed - T.fly) < 0.6, met.vueloVel + ' m/s');
      // Radio de giro volando: 90° a la derecha
      r = frame(() => { K.add('d'); }, 90); K.clear();
      let minR = 1e9;
      for (let i = 2; i < r.length; i++) { const a = r[i - 2], b = r[i - 1], c = r[i]; const ab = Math.hypot(b.x - a.x, b.z - a.z), bc = Math.hypot(c.x - b.x, c.z - b.z), ac = Math.hypot(c.x - a.x, c.z - a.z), cr = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)); if (cr > 1e-7) minR = Math.min(minR, ab * bc * ac / (2 * cr)); }
      met.vueloRadioGiroM = r2(minR);
      check('Radio de giro en vuelo de ave (2 a 8 m)', minR > 2 && minR < 8, met.vueloRadioGiroM + ' m');
      const hLand = S.pos.y - M.groundY;
      F.toggleFly(); n = 0; let vyTouch = 0, prev = null;
      while (M.flying && n++ < 900) { prev = S.vy; frame(); }
      vyTouch = prev;
      met.aterrizajeDesdeM = r2(hLand); met.aterrizajeS = r2(n * DT); met.aterrizajeVy = r2(vyTouch);
      check('Aterrizar (V): baja sola y toca el suelo suave', !M.flying && M.grounded && vyTouch > -2.2, `${met.aterrizajeDesdeM} m en ${met.aterrizajeS} s, ${met.aterrizajeVy} m/s al tocar`);
      // 4. Pendientes: buscar una ladera cerca
      let lad = null, risco = null;
      for (let x = -G.terreno.WORLD + 8; x < G.terreno.WORLD - 8 && (!lad || !risco); x += 3) for (let z = -G.terreno.WORLD + 8; z < G.terreno.WORLD - 8; z += 3) {
        if (G.agua.levelAt(x, z) > H(x, z) - 0.5) continue;
        const nn = F.slopeAt(x, z), deg = Math.acos(nn.y) * 180 / Math.PI;
        // Ladera seguida: 15–38° en el punto y a 2, 4 y 6 m cuesta abajo (sin borde de risco)
        if (!lad && deg > 18 && deg < 34 && [2, 4, 6].every(d => { const q = F.slopeAt(x + nn.x / Math.hypot(nn.x, nn.z) * d, z + nn.z / Math.hypot(nn.x, nn.z) * d), g2 = Math.acos(q.y) * 57.3; return g2 > 15 && g2 < 38; })) lad = { x, z, nx: nn.x, nz: nn.z, deg };
        if (!risco && deg > T.maxSlope + 8) risco = { x, z, nx: nn.x, nz: nn.z, deg };
      }
      const toStick = (dx, dz) => { const y = G.camara.yaw, fx = -Math.sin(y), fz = -Math.cos(y), rx = Math.cos(y), rz = -Math.sin(y), l = Math.hypot(dx, dz) || 1; return { x: (dx * rx + dz * rz) / l, y: -(dx * fx + dz * fz) / l }; };
      if (lad) {
        reset(lad.x, lad.z);
        const st = toStick(lad.nx, lad.nz);
        r = frame(() => { I.stick.x = st.x; I.stick.y = st.y; K.add('shift'); }, 30);
        I.stick.x = I.stick.y = 0; K.clear();
        const pegado = r.filter(o => o.gr).length / r.length;
        met.ladera = { grados: r2(lad.deg), pegadoBajando: r2(pegado) };
        check('Corriendo cuesta abajo no se despega del suelo', pegado > 0.9, Math.round(pegado * 100) + ' % de cuadros en el suelo, ' + r2(lad.deg) + '°');
      } else check('Corriendo cuesta abajo no se despega del suelo', true, 'sin ladera en este mapa');
      if (risco) {
        reset(risco.x + risco.nx * 2, risco.z + risco.nz * 2);
        const ya = S.pos.y, st = toStick(-risco.nx, -risco.nz);
        r = frame(() => { I.stick.x = st.x; I.stick.y = st.y; }, 90);
        I.stick.x = I.stick.y = 0;
        met.risco = { grados: r2(risco.deg), subidaM: r2(S.pos.y - ya) };
        check('Un risco más empinado que el límite no se sube caminando', S.pos.y - ya < 1.2, met.risco.subidaM + ' m en 1,5 s contra ' + r2(risco.deg) + '°');
      } else check('Un risco más empinado que el límite no se sube caminando', true, 'sin riscos en este mapa');
      // 5. Agua: volar y bajar sobre agua honda acaba nadando en la superficie, nunca bajo el agua
      let hondo = null;
      for (let x = -G.terreno.WORLD + 6; x < G.terreno.WORLD - 6 && !hondo; x += 2) for (let z = -G.terreno.WORLD + 6; z < G.terreno.WORLD - 6; z += 2) {
        const w = G.agua.levelAt(x, z); if (w > -1e9 && w - H(x, z) > 2) { hondo = { x, z, w }; break; }
      }
      if (hondo) {
        reset(hondo.x, hondo.z, hondo.w + 3); M.flying = true; M.grounded = false;
        r = frame(() => { if (M.flying) K.add('c'); else K.delete('c'); }, 150); K.clear(); // bajar con C; al tocar el agua, se suelta
        const minY = Math.min(...r.filter(o => o.fly).map(o => o.y)) - hondo.w;
        check('Volar hasta el agua: se posa a nadar, nunca vuela bajo el agua', M.swimming && !M.flying && minY > -0.6 && S.pos.y > hondo.w - 1, 'volando, mínimo ' + r2(minY) + ' m respecto al agua');
        F.toggleFly(); r = frame(null, 40);
        check('Despega desde el agua', M.flying && S.pos.y > hondo.w + 1, r2(S.pos.y - hondo.w) + ' m');
        reset(L.x, L.z);
      } else check('Volar hasta el agua: se posa a nadar', true, 'sin agua honda en este mapa');
      // 6. Pico al hablar: sigue a la máquina de escribir (45 letras/s, aquí manejada a mano para no depender de que la pestaña
      // se esté pintando) y se cierra al terminar la frase
      const dType = document.querySelector('#d-type > span'), dlg = document.getElementById('dialog');
      if (P3 && G.dialogo && dType && dlg) {
        reset(L.x, L.z); anim(5);
        const frase = 'Hola, amigos: hoy vamos a mirar el bosque.';
        G.dialogo.say([{ who: G.actores.nombre, img: '', text: frase }]);
        const vals = [];
        for (let fr = 0; fr < 110; fr++) {
          const i = Math.min(frase.length, Math.floor(fr * 45 / 60));
          dType.textContent = frase.slice(0, i); dlg.classList.toggle('is-typing', i < frase.length);
          anim(1); vals.push(P3.mouth || 0);
        }
        let flaps = 0; for (let i = 1; i < vals.length; i++) if (vals[i] > 0.5 && vals[i - 1] <= 0.5) flaps++;
        const tail = vals.slice(-15).every(v => v < 0.05);
        met.picoAperturas = flaps; met.picoHz = r2(flaps / (frase.length / 45));
        check('El pico se abre y cierra al ritmo del texto y se cierra al terminar', flaps >= 4 && met.picoHz <= 10 && tail, flaps + ' aperturas, ' + met.picoHz + ' por segundo');
        G.dialogo.clear(); dlg.classList.remove('is-typing'); anim(3);
      }
      // 7. Agarrar → llevar → soltar (un objeto de prueba en el suelo)
      if (P3 && G.agarre) {
        reset(L.x, L.z); anim(5);
        const f2 = S.facing, box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: '#b07a3a' }));
        box.position.set(S.pos.x + f2.x * 0.9, S.pos.y + 0.175, S.pos.z + f2.z * 0.9); G.renderer.scene.add(box);
        const ok = G.agarre.agarrar(box, { id: 'prueba_caja' });
        anim(40);
        const lv = G.agarre.lleva(), p = new THREE.Vector3(); box.getWorldPosition(p);
        const local = P3.root.worldToLocal(p.clone()), sc = P3.root.scale.x;
        met.agarre = { enganche: lv && lv.enganche, frente: r2(local.z * sc) };
        check('Agarrar: la caja va al enganche y queda delante del cuerpo', ok && lv && lv.id === 'prueba_caja' && box.parent !== G.renderer.scene && local.z * sc > 0.35, JSON.stringify(met.agarre));
        frame(() => K.add('w'), 40); anim(10); K.clear();
        box.getWorldPosition(p);
        check('Llevar: la caja viaja con Vittata', Math.hypot(p.x - S.pos.x, p.z - S.pos.z) < 1.2);
        let soltado = null; G.on('soltado', (id, o, pos) => { if (id === 'prueba_caja') soltado = pos; });
        G.agarre.soltar(); anim(30);
        box.getWorldPosition(p);
        check('Soltar: la caja queda en el suelo delante de las patas', !G.agarre.lleva() && box.parent === G.renderer.scene && !!soltado && Math.abs(p.y - 0.175 - F.suelo(p.x, p.z, p.y)) < 0.1, soltado ? r2(p.y - F.suelo(p.x, p.z, p.y)) + ' m' : 'sin soltar');
        G.renderer.scene.remove(box); box.geometry.dispose(); box.material.dispose();
      }
      // 8. Elementos del mundo (solidos.js, geometría real): techo, rama, pared y despegar desde arriba
      const SO = G.solidos, ACT = G.mundo && G.mundo.activos;
      if (SO && SO.activo && ACT && Object.keys(ACT).length) {
        SO.terminar();
        // empieza ya en el aire (sin pasar por el suelo: junto a una estaca quedaría metida en ella y la red de seguridad de fisica.js la sacaría)
        const aterrizarEn = (x, z, y) => { K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false; M.vx = M.vz = 0; M.dashT = 0; M.swimming = false; S.pos.x = x; S.pos.z = z; S.pos.y = y; S.vy = 0; M.wasAir = true; M.flying = true; M.grounded = false; F.land(); let n = 0; while (M.flying && n++ < 900) frame(); SO.terminar(); };
        const altoCerca = (x, z, r) => { let b = null; for (let dz = -r; dz <= r; dz += 0.3) for (let dx = -r; dx <= r; dx += 0.3) { const t = SO.altoEn(x + dx, z + dz, 1e4); if (t > -Infinity && (!b || t > b.t)) b = { x: x + dx, z: z + dz, t }; } return b; };
        // alto del cuerpo que usa fisica.js ahora: agachada bajo un alero o un toldo, el que le queda (no se mete por agacharse)
        const cuerpo = () => Math.min(SO.SO.cuerpo, (M.alto || SO.SO.cuerpo) - 0.01);
        // Techo: el edificio con techo más alto de los de tipo casa, bohío o caney (si no, el primero con más de 3 m)
        const ids = Object.keys(ACT).filter(id => ACT[id].tipo === 'kelvin' && (ACT[id].alto || 0) > 3).sort((a, b) => ACT[b].alto - ACT[a].alto);
        const idT = ids.find(id => /casa_paja|bohio|caney/.test(id)) || ids[0];
        if (idT) {
          const [bx, by, bz] = ACT[idT].pos, tp = altoCerca(bx, bz, 1.5);
          aterrizarEn(tp.x, tp.z, tp.t + 4);
          const yl = S.pos.y, ys = frame(null, 180).map(o => o.y), quieta = Math.max(...ys) - Math.min(...ys);
          met.techo = { edificio: idT, alto: r2(yl - by), deriva3s: r2(quieta), posado: M.posado };
          check('Aterriza en el techo de un edificio y se queda 3 s sin moverse', M.grounded && !!M.posado && yl - H(S.pos.x, S.pos.z) > 2 && quieta < 0.02, JSON.stringify(met.techo));
          F.toggleFly(); frame(null, 40);
          check('Despega desde el techo', M.flying && S.pos.y > yl + 1, r2(S.pos.y - yl) + ' m');
          // Pared: desde 10 m fuera, caminar hacia el centro 2,5 s con el joystick
          let peor = 0, probadas = 0, dmin = 99;
          for (const ang of [0.4, 2.0, 3.6, 5.2]) {
            const sx = bx + Math.cos(ang) * 10, sz = bz + Math.sin(ang) * 10, sy = F.suelo(sx, sz, H(sx, sz) + 0.3);
            if (SO.penetra(sx, sz, sy) || G.agua.levelAt(sx, sz) > sy - 0.2) continue;
            reset(sx, sz); probadas++;
            const st = toStick(bx - sx, bz - sz);
            frame(() => { I.stick.x = st.x; I.stick.y = st.y; peor = Math.max(peor, SO.penetra(S.pos.x, S.pos.z, S.pos.y, cuerpo())); }, 150);
            I.stick.x = I.stick.y = 0; dmin = Math.min(dmin, Math.hypot(S.pos.x - bx, S.pos.z - bz));
          }
          met.pared = { edificio: idT, entradas: probadas, penetraMax: peor, distanciaMin: r2(dmin) };
          check('No atraviesa una pared: choca y se desliza sin meterse', probadas > 0 && peor <= 2, JSON.stringify(met.pared));
          // La cámara, mirando hacia el edificio, no puede quedarse dentro del muro (la pared llenaba la vista).
          const angCam = Math.atan2(bx - S.pos.x, bz - S.pos.z);
          G.camara.yaw = angCam; G.camara.place(true);
          const cp = G.renderer.camera.position, den = SO.dentro(cp.x, cp.z, cp.y), distH = Math.hypot(cp.x - S.pos.x, cp.z - S.pos.z);
          met.camPared = { dentro: den === -Infinity ? null : r2(den), dist: r2(distH) };
          check('La cámara no se mete en la pared del edificio y no se pega (sigue a más de 2,5 m)', !(den > -Infinity) && distH >= 2.5, JSON.stringify(met.camPared));
        }
        // Rama: de los 10 árboles más cercanos, el primero con un punto fino entre 1,5 y 8 m sobre el suelo, lejos del tronco
        // (un tabonuco alto puede no tener ramas bajas: se prueba el siguiente)
        const V = G.vegetacion, arboles = [];
        for (const m in (V && V.instancias) || {}) {
          if (!/tabonuco|ceiba|flamboyan|yagrumo|arbol_enano/.test(m)) continue;
          const P = V.instancias[m];
          for (let i = 0; i < P.n; i++) arboles.push({ x: P.pos[i * 4], y: P.pos[i * 4 + 1], z: P.pos[i * 4 + 2], d: Math.hypot(P.pos[i * 4] - L.x, P.pos[i * 4 + 2] - L.z), m });
        }
        arboles.sort((a, b) => a.d - b.d);
        let rama = null, arbol = null;
        for (const t of arboles.slice(0, 10)) {
          reset(t.x + 5, t.z); SO.terminar();
          for (let dz = -4; dz <= 4; dz += 0.3) for (let dx = -4; dx <= 4; dx += 0.3) {
            const x = t.x + dx, z = t.z + dz; if (Math.hypot(dx, dz) < 1) continue;
            const g = SO.altoEn(x, z, t.y + 10), hg = g - H(x, z); if (!(hg > 1.5 && hg < 8) || !SO.fino(x, z, g + 0.01)) continue;
            if (!rama || Math.abs(hg - 3.5) < Math.abs(rama.hg - 3.5)) rama = { x, z, g, hg };
          }
          if (rama) { arbol = t; break; }
        }
        if (arboles.length) {
          if (rama) {
            aterrizarEn(rama.x, rama.z, rama.g + 2);
            const ys = frame(null, 60).map(o => o.y);
            met.rama = { arbol: arbol.m, distancia: r2(arbol.d), alto: r2(S.pos.y - H(S.pos.x, S.pos.z)), posado: M.posado };
            check('Se posa en una rama (pose de posarse, patas agarrando)', M.posado === 'fino' && S.pos.y - H(S.pos.x, S.pos.z) > 1.2 && Math.max(...ys) - Math.min(...ys) < 0.02, JSON.stringify(met.rama));
          } else check('Se posa en una rama', false, 'sin rama entre 1,5 y 8 m en los 10 árboles más cercanos');
        }
        // Cuerda del puente colgante (pisos 'puente' del terreno): aterrizar 0,35 m fuera de la cuerda; la ayuda la centra
        // encima, se posa ('fino', que = 'cuerda') y se queda 3 s
        const PU = (G.terreno.plataformas || []).find(p => p.tipo === 'puente');
        if (PU) {
          const ux = PU.bx - PU.ax, uz = PU.bz - PU.az, Lp = Math.hypot(ux, uz), nx = -uz / Lp, nz = ux / Lp, t = 0.5;
          const cx = PU.ax + ux * t, cz = PU.az + uz * t, cub = PU.ay + (PU.by - PU.ay) * t - PU.comba * 4 * t * (1 - t);
          reset(cx, cz, cub); SO.terminar(true);
          let cu = null;
          for (let d = PU.ancho / 2 - 0.3; d <= PU.ancho / 2 + 0.6; d += 0.05) { const x = cx + nx * d, z = cz + nz * d, g = SO.altoEn(x, z, cub + 3); if (g - cub > 0.5 && g - cub < 1.6 && (!cu || g > cu.g)) cu = { x, z, g, d }; }
          if (cu) {
            aterrizarEn(cu.x + nx * 0.35, cu.z + nz * 0.35, cu.g + 2.5);
            const ys = frame(null, 180).map(o => o.y), que = SO.que(S.pos.x, S.pos.z, S.pos.y + 0.01);
            met.cuerda = { sobreCubierta: r2(S.pos.y - cub), alCentro: r2(Math.hypot(S.pos.x - cu.x, S.pos.z - cu.z)), posado: M.posado, que, deriva3s: r2(Math.max(...ys) - Math.min(...ys)) };
            check('Se posa en la cuerda del puente colgante (percha) y se queda 3 s', M.grounded && M.posado === 'fino' && que === 'cuerda' && S.pos.y - cub > 0.5 && met.cuerda.deriva3s < 0.02, JSON.stringify(met.cuerda));
          } else check('Se posa en la cuerda del puente colgante', false, 'sin cuerda sólida a mitad del puente');
        }
        // Toldo bajo (toldo_pequeno del streaming): caminando hacia un punto con menos espacio que su cabeza, se agacha y pasa;
        // la cabeza (vértices deformados por los huesos) nunca llega a la lona, y al salir se levanta
        const STR = G.mundo.streaming, toldos = ((STR && STR.instancias) || []).filter(i => i.modelo === 'toldo_pequeno' && i.pos);
        if (toldos.length) {
          const P3v = G.actores.player3D, vv = new THREE.Vector3();
          const tope = () => { let mx = -Infinity; P3v.root.updateMatrixWorld(true); P3v.root.traverse(o => { if (!o.isSkinnedMesh || !o.visible) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) { vv.fromBufferAttribute(p, i); o.boneTransform(i, vv); vv.applyMatrix4(o.matrixWorld); if (vv.y > mx) mx = vv.y; } }); return mx - S.pos.y; };
          let hecho = null;
          for (const tl of toldos.slice().sort((a, b) => b.escala - a.escala).slice(0, 4)) {
            const [tx, , tz] = tl.pos;
            reset(tx + 6, tz);
            for (let i = 0; i < 80 && !tl.colocado; i++) { if (STR.revisar) STR.revisar(S.pos.x, S.pos.z); await sleep(50); frame(); }
            SO.terminar(); // los edificios instanciados van por regiones, como la flora
            // bajo la lona (sobre el centro, no en su borde): espacio entre altoAgachada + 0,1 y altoCabeza - 0,2, sin pared para el cuerpo agachado
            const pts = [];
            for (let dz = -2; dz <= 2; dz += 0.3) for (let dx = -2; dx <= 2; dx += 0.3) {
              const x = tx + dx, z = tz + dz, y = F.suelo(x, z, H(x, z) + 0.3), lb = SO.libre(x, z, y, 0, T.altoAgachada - 0.05);
              if (SO.libre(x, z, y, 0.45, T.altoAgachada - 0.05) > T.altoAgachada + 0.05 && lb > T.altoAgachada + 0.1 && lb < T.altoCabeza - 0.2 && !SO.penetra(x, z, y, T.altoAgachada) && G.agua.levelAt(x, z) < y - 0.2) pts.push({ x, z, lb, y });
            }
            pts.sort((a, b) => a.lb - b.lb);
            for (const pt of pts.slice(0, 6)) {
              for (const ang of [0, 1.6, 3.1, 4.7]) {
                const sx = pt.x + Math.cos(ang) * 4, sz = pt.z + Math.sin(ang) * 4, sy = F.suelo(sx, sz, H(sx, sz) + 0.3);
                if (SO.penetra(sx, sz, sy) || SO.libre(sx, sz, sy, 0.45, T.altoAgachada - 0.05) < T.altoCabeza || G.agua.levelAt(sx, sz) > sy - 0.2) continue;
                reset(sx, sz); SO.terminar();
                let roce = -Infinity, agMax = 0, llego = false, lbMin = Infinity;
                for (let i = 0; i < 240 && !llego; i++) {
                  const st = toStick(pt.x - S.pos.x, pt.z - S.pos.z), m = Math.min(1, Math.hypot(pt.x - S.pos.x, pt.z - S.pos.z) * 2);
                  I.stick.x = st.x * m * 0.7; I.stick.y = st.y * m * 0.7; anim(1);
                  agMax = Math.max(agMax, M.agachada);
                  const lb = SO.libre(S.pos.x, S.pos.z, S.pos.y, 0.45, T.altoAgachada - 0.05);
                  if (lb < 2.2) { roce = Math.max(roce, tope() - lb); lbMin = Math.min(lbMin, lb); }
                  llego = Math.hypot(pt.x - S.pos.x, pt.z - S.pos.z) < 0.15;
                }
                I.stick.x = I.stick.y = 0;
                const dy = S.pos.y - pt.y;
                if (!llego || Math.abs(dy) > 0.3) continue; // el camino la subió a otra pieza: otro intento
                anim(20); { const lb = SO.libre(S.pos.x, S.pos.z, S.pos.y, 0.45, T.altoAgachada - 0.05); if (lb < 2.2) { roce = Math.max(roce, tope() - lb); lbMin = Math.min(lbMin, lb); } }
                // vuelve a salir: se levanta
                const st = toStick(sx - S.pos.x, sz - S.pos.z); frame(() => { I.stick.x = st.x * 0.7; I.stick.y = st.y * 0.7; }, 90); I.stick.x = I.stick.y = 0; anim(40);
                hecho = { toldo: tl.id, espacio: r2(pt.lb), espacioMin: r2(lbMin), dy: r2(dy), agachada: r2(agMax), cabezaMenosLona: r2(roce), deNuevoDePie: M.agachada < 0.05, alto: r2(tope()) };
                break;
              }
              if (hecho) break;
            }
            if (hecho) break;
          }
          met.toldo = hecho;
          check('Bajo un toldo bajo se agacha y la cabeza no roza la lona; al salir se levanta', !!hecho && hecho.agachada > 0.2 && Number.isFinite(hecho.cabezaMenosLona) && hecho.cabezaMenosLona < 0 && hecho.deNuevoDePie, hecho ? JSON.stringify(hecho) : 'sin punto bajo un toldo al que llegar caminando');
        }
        // Estacas de los terrenos (contenido, collider 'post'): sólido real, que sustituye al cilindro sin alto. Aterrizar
        // 0,3 m al lado de la estaca más cercana al letrero; la ayuda la centra encima, se posa ('fino', 'poste') y se queda 3 s
        const poste = F.colliders.find(c => c.kind === 'post');
        if (poste) {
          reset(poste.x + 3, poste.z); SO.terminar(true);
          let es = null;
          for (let dz = -6; dz <= 6; dz += 0.15) for (let dx = -6; dx <= 6; dx += 0.15) {
            const x = poste.x + dx, z = poste.z + dz, g = SO.altoEn(x, z, H(x, z) + 3), hg = g - H(x, z), d = Math.hypot(dx, dz);
            if (hg > 0.8 && hg < 1.4 && (!es || d < es.d) && SO.fino(x, z, g + 0.01)) es = { x, z, g, d };
          }
          if (es) {
            aterrizarEn(es.x + 0.3, es.z, es.g + 2);
            const ys = frame(null, 180).map(o => o.y), que = SO.que(S.pos.x, S.pos.z, S.pos.y + 0.01);
            met.estaca = { alto: r2(S.pos.y - H(S.pos.x, S.pos.z)), sobreEstaca: r2(S.pos.y - es.g), posado: M.posado, que, deriva3s: r2(Math.max(...ys) - Math.min(...ys)), colliderSustituido: SO.cubre(poste) };
            check('Se posa en una estaca de los terrenos (sólido real, sin el collider macizo) y se queda 3 s', M.grounded && M.posado === 'fino' && que === 'poste' && Math.abs(S.pos.y - es.g) < 0.1 && met.estaca.deriva3s < 0.02 && met.estaca.colliderSustituido, JSON.stringify(met.estaca));
          } else check('Se posa en una estaca de los terrenos', false, 'sin estaca sólida a menos de 6 m del letrero (collider sustituido: ' + SO.cubre(poste) + ')');
        }
        // Todos los edificios cargados (de mundo.js o del streaming): no se atraviesan y tienen dónde pararse encima
        const msK = SO.SO.msCuadro; SO.SO.msCuadro = 0.3; // la flora espera: aquí solo cuentan los edificios
        const fallos = [], enterrados = []; let revisados = 0;
        // Piezas marcadas decorativo: true en el mapa (cercas, canoas, muelles compactos): chocan, pero no se les pide techo
        const STI = G.mundo.streaming && G.mundo.streaming.instancias, instDe = id => STI && (Array.isArray(STI) ? STI.find(i => i.id === id) : STI[id]);
        const decorativo = id => !!(ACT[id].decorativo || ((instDe(id) || {}).e || {}).decorativo);
        try {
          for (const id of Object.keys(ACT)) {
            const a = ACT[id]; if (!a || a.tipo !== 'kelvin' || !a.pos) continue;
            const [bx, , bz] = a.pos;
            SO.terminar(true);
            const tp = altoCerca(bx, bz, Math.min(5, Math.max(2.4, a.alto || 0))), sobre = !!tp && tp.t - H(tp.x, tp.z) > 0.15; // cercas largas y canoas bajas también
            // desde arriba, ahí hay suelo (dentro de la columna de una percha del diseño manda la percha: también vale)
            const enPercha = !!tp && F.perchas.some(p => Math.hypot(tp.x - p.x, tp.z - p.z) < p.r + 0.3 && tp.t + 0.2 >= p.y - 0.3 && tp.t < p.y + 4 && (!p.when || p.when()));
            const paraOk = sobre && (enPercha || F.suelo(tp.x, tp.z, tp.t + 0.2) >= tp.t - 0.05);
            let peor = 0, n = 0;
            for (const ang of [0.5, 2.6, 4.7]) {
              const sx = bx + Math.cos(ang) * 9, sz = bz + Math.sin(ang) * 9, sy = F.suelo(sx, sz, H(sx, sz) + 0.3);
              if (SO.penetra(sx, sz, sy) || G.agua.levelAt(sx, sz) > sy - 0.2) continue;
              reset(sx, sz); n++;
              const st = toStick(bx - sx, bz - sz);
              // a ras de suelo (subirse a un alero bajo no cuenta como meterse)
              frame(() => { I.stick.x = st.x; I.stick.y = st.y; if (S.pos.y - H(S.pos.x, S.pos.z) < 0.5) peor = Math.max(peor, SO.penetra(S.pos.x, S.pos.z, S.pos.y, cuerpo())); }, 110);
              I.stick.x = I.stick.y = 0;
            }
            revisados++;
            // meterse = más que el centro y un punto del borde (un poste fino bajo el centro al pasar rozando no cuenta).
            // Sin sólido = fallo del motor; con sólido pero por debajo del terreno = pieza enterrada (datos del mapa): se informa aparte.
            if (tp && !sobre) enterrados.push(id);
            if (decorativo(id) ? peor > 4 : !tp || (sobre && !paraOk) || peor > 4) fallos.push(id + (!tp ? ' sin sólido' : sobre && !paraOk ? ' sin techo' : '') + (peor > 4 ? ' se mete ' + peor : ''));
          }
        } finally { SO.SO.msCuadro = msK; I.stick.x = I.stick.y = 0; }
        met.edificios = { revisados, fallos: fallos.length, enterrados };
        check('Todos los edificios cargados: no se atraviesan y tienen dónde pararse encima', revisados > 0 && !fallos.length, revisados + ' edificios' + (fallos.length ? ' · ' + fallos.join(', ') : ''));
        met.solidos = SO.stats();
      }
      // 8b. Cámara con vida (MODERNIZACION_2026 ficha 26-G): roll al girar en vuelo que vuelve a 0, FOV según la velocidad,
      // dolly al aterrizar, plano de descubrimiento sin meterse en el terreno; prefers-reduced-motion (CAM.sinVida) lo apaga todo
      {
        const C = G.camara, CAM = C.CAM, V = C.vida, cam = G.renderer.camera, sinVida0 = CAM.sinVida, deg = v => r2(v * 180 / Math.PI);
        const sigue = n => { for (let i = 0; i < n; i++) { C.follow(DT); C.fov(DT); } };
        // vuelo a mano (sin física): rumbo que gira w rad/s durante n cuadros
        let rumbo = 0;
        const volar = (w, n) => { for (let i = 0; i < n; i++) { rumbo += w * DT; M.vx = Math.sin(rumbo) * F.FLY_SPEED; M.vz = Math.cos(rumbo) * F.FLY_SPEED; sigue(1); } };
        const probar = () => {
          const o = {};
          reset(L.x, L.z); C.place(true); M.flying = true; M.grounded = false; M.speed = F.FLY_SPEED;
          volar(1.2, 60); o.rollGiro = deg(V.roll);
          volar(0, 150); o.rollRecto = deg(V.roll);
          o.fovVuelo = r2(C.fovExtra()); M.dashT = 0.2; o.fovImpulso = r2(C.fovExtra()); M.dashT = 0;
          M.flying = false; M.grounded = true; M.speed = 0; M.vx = M.vz = 0; volar(0, 1); sigue(120); o.rollSuelo = deg(V.roll); o.fovSuelo = r2(C.fovExtra());
          M.impact = 1; M.land = 0.2; sigue(1); o.caida = r2(V.caida); M.land = 0; sigue(120); o.caidaFin = r2(V.caida);
          // plano de descubrimiento: la cámara gira y nunca queda bajo el terreno
          const y0 = C.yaw; o.plano = C.descubrir(); let minSep = Infinity, giro = 0;
          for (let i = 0; i < Math.ceil(CAM.plano / DT) + 10; i++) {
            sigue(1); minSep = Math.min(minSep, cam.position.y - H(cam.position.x, cam.position.z));
            const da = Math.atan2(cam.position.x - S.pos.x, cam.position.z - S.pos.z) - y0; giro = Math.max(giro, Math.abs(Math.atan2(Math.sin(da), Math.cos(da))));
          }
          o.planoGiro = r2(giro); o.planoSep = r2(minSep); o.planoFin = V.plano;
          return o;
        };
        try {
          CAM.sinVida = false;
          if (!G.renderer.REDUCED) {
            const o = met.camaraVida = probar();
            check('Cámara con vida: se inclina al girar en vuelo (sin pasar de ±4°) y vuelve a 0 al ir recto y en el suelo', Math.abs(o.rollGiro) > 1.5 && Math.abs(o.rollGiro) <= CAM.rollMax + 1e-6 && Math.abs(o.rollRecto) < 0.1 && o.rollSuelo === 0, JSON.stringify(o));
            check('Cámara con vida: FOV +4 al volar, +12 en el impulso, 0 en el suelo; dolly al aterrizar que vuelve', o.fovVuelo === CAM.fovMin && o.fovImpulso === CAM.fovMax && o.fovSuelo === 0 && o.caida > 0.2 && o.caidaFin === 0, JSON.stringify(o));
            check('Plano de descubrimiento: órbita corta de 1,2 s que no atraviesa el terreno', o.plano && o.planoGiro > 0.2 && o.planoSep >= 0.3 && o.planoFin === 0, JSON.stringify(o));
          } else check('Cámara con vida (prefers-reduced-motion activo en este navegador)', true, 'solo el caso apagado');
          CAM.sinVida = true;
          const q = met.camaraQuieta = probar();
          check('Con prefers-reduced-motion la cámara no se inclina, no cambia el FOV, no baja al aterrizar ni hace el plano', q.rollGiro === 0 && q.fovVuelo === 0 && q.fovImpulso === 0 && q.caida === 0 && q.plano === false, JSON.stringify(q));
        } finally {
          CAM.sinVida = sinVida0; V.plano = 0; V.roll = 0; M.flying = false; M.dashT = 0; M.land = 0;
          reset(L.x, L.z); cam.fov = 55; cam.zoom = 1; cam.updateProjectionMatrix();
        }
        // QA-61: volando, una copa pegada a la línea no acerca la cámara (antes bajaba a ~2,4 m y la vista se agrandaba).
        // Posada dentro de la copa, sí se acerca (QA-27). El pellizco del trackpad no hace zoom de la página.
        const ev = new WheelEvent('wheel', { ctrlKey: true, deltaY: -80, cancelable: true, bubbles: true });
        window.dispatchEvent(ev);
        check('QA-61: el pellizco del trackpad (rueda con Ctrl) no hace zoom de la página', ev.defaultPrevented);
        reset(L.x, L.z); S.pos.y = H(L.x, L.z) + 8; M.flying = true; M.grounded = false; M.posado = '';
        const yw = C.yaw, dx = Math.sin(yw), dz = Math.cos(yw);
        C.probarCopas([[S.pos.x + dx * 1.6, S.pos.y + 1.2, S.pos.z + dz * 1.6, 1.5]]);
        C.place(true);
        const dVuelo = Math.hypot(cam.position.x - S.pos.x, cam.position.y - (S.pos.y + 1.2), cam.position.z - S.pos.z);
        met.qa61vuelo = { dist: r2(dVuelo), piso: r2(CAM.distFly * 0.82), fov: r2(cam.fov), zoom: cam.zoom };
        check('QA-61: volando, una copa no acerca la cámara por debajo del 82 % de la distancia de vuelo', dVuelo >= CAM.distFly * 0.82 - 0.2 && cam.zoom === 1 && cam.fov >= 50 && cam.fov <= 70, JSON.stringify(met.qa61vuelo));
        M.flying = false; M.posado = 'fino'; S.pos.y = H(L.x, L.z) + 4;
        C.probarCopas([[S.pos.x + dx * 1.0, S.pos.y + 1.2, S.pos.z + dz * 1.0, 2.2]]);
        C.place(true);
        const dPosada = Math.hypot(cam.position.x - S.pos.x, cam.position.z - S.pos.z);
        met.qa61posada = { dist: r2(dPosada) };
        check('QA-27: posada dentro de una copa, la cámara se acerca para verla', dPosada < CAM.dist * 0.7 && dPosada > 1, JSON.stringify(met.qa61posada));
        C.probarCopas(null); M.posado = ''; reset(L.x, L.z); cam.fov = 55; cam.zoom = 1; cam.updateProjectionMatrix();
      }
      // 9. Subir siempre sube y nunca encajada (rol Movimiento y controles). Lo que contó Kelvin: «a veces la cotorra no eleva
      // más» y Vittata metida en la pared de una torre de las ruinas, con la cabeza atravesando la plataforma de arriba.
      {
        const SOL = G.solidos, centroDentro = () => SOL.penetra(S.pos.x, S.pos.z, S.pos.y) > 0 && SOL.dentro(S.pos.x, S.pos.z, S.pos.y + 0.75) > S.pos.y + SOL.SO.stepUp;
        // a) Con el foco en un botón del HUD (tras un clic en el Diario), el Espacio sube igual (antes lo pulsaba el botón)
        const bd = $('b-diary');
        if (bd) {
          reset(L.x, L.z); F.toggleFly(); frame(null, 40);
          bd.focus(); bd.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
          const sube = I.jumpHeld, suelta = document.activeElement !== bd, ya = S.pos.y; frame(null, 30);
          bd.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
          met.espacioConFoco = { sube, sueltaFoco: suelta, subeM: r2(S.pos.y - ya) };
          check('Espacio sube aunque un botón del HUD tenga el foco (tras un clic en el Diario)', sube && suelta && S.pos.y - ya > 0.5 && !I.jumpHeld, JSON.stringify(met.espacioConFoco));
        }
        // b) Mantener subir sube siempre hasta el techo de vuelo, que se nota (frena), no se pasa y se explica (viento)
        reset(L.x, L.z); F.toggleFly(); frame(null, 30);
        { const lim = F.techoVuelo(S.pos.x, S.pos.z), y0 = S.pos.y; let y2 = null, maxY = -Infinity, nf = 0, trabada = 0, prev = S.pos.y;
          while (nf++ < 1200) {
            frame(() => { I.jumpHeld = true; }); maxY = Math.max(maxY, S.pos.y);
            if (nf === 120) y2 = S.pos.y;
            if (S.pos.y < lim - 1.5 && S.pos.y - prev < 0.01) trabada++; prev = S.pos.y;
            if (nf > 120 && S.pos.y > lim - 0.4) break;
          }
          const r = frame(() => { I.jumpHeld = true; }, 120); for (const o of r) maxY = Math.max(maxY, o.y);
          met.subir = { sube2sM: r2(y2 - y0), techoM: r2(lim - G.terreno.height(S.pos.x, S.pos.z)), alTechoM: r2(S.pos.y - lim), sobreTechoMaxM: r2(maxY - lim), viento: !!M.viento, cuadrosTrabada: trabada, ms: ms(nf) };
          I.jumpHeld = false; frame(null, 2);
          check('Mantener subir siempre sube (más de 8 m en 2 s) hasta el techo de vuelo, sin trabarse', y2 - y0 > 8 && S.pos.y > lim - 1.5 && trabada === 0, JSON.stringify(met.subir));
          check('El techo de vuelo se nota y se explica: frena, no se pasa y avisa del viento fuerte', met.subir.viento && maxY < lim + 0.3, JSON.stringify(met.subir));
        }
        // c) La torre antigua (ruina_torre de las ruinas de El Yunque): torre hueca con plataforma de baldosa arriba
        const STR2 = G.mundo.streaming, torre = STR2 && (STR2.instancias || []).find(i => i.id === 'ruina_torre@kelvin_ruinas_yunque#0' && i.pos);
        if (torre && SOL && SOL.activo) {
          const [tx, , tz] = torre.pos;
          reset(tx + 14, tz);
          if (STR2.alrededor) await STR2.alrededor(tx, tz);
          if (STR2.terminar) await STR2.terminar();
          SOL.terminar();
          // dentro de la cavidad: suelo abajo, la plataforma encima a más de 6 m y nada sólido para el cuerpo
          let cav = null;
          for (let rr = 0; rr <= 3 && !cav; rr += 0.3) for (let a = 0; a < 16 && !cav; a++) {
            const x = tx + Math.cos(a / 16 * Math.PI * 2) * rr, z = tz + Math.sin(a / 16 * Math.PI * 2) * rr, y = F.suelo(x, z, H(x, z) + 0.5), cap = SOL.techo(x, z, y, y + 30, 1.5);
            if (cap - y > 6 && cap < Infinity && !SOL.penetra(x, z, y)) cav = { x, z, y, cap, top: SOL.dentro(x, z, cap + 0.01) };
          }
          if (cav) {
            const mt = met.torre = { plataforma: r2(cav.top), cavidad: r2(cav.cap - cav.y) };
            // c1) Volando hacia el borde de la plataforma con los pies algo por debajo: no se mete (antes quedaba dentro)
            let peor = 0, dentroN = 0;
            for (const dy of [0.15, 0.3, 0.42]) {
              reset(tx + 7, tz); S.pos.y = cav.top - dy; M.flying = true; M.grounded = false;
              const st = toStick(tx - S.pos.x, tz - S.pos.z);
              frame(() => { I.stick.x = st.x; I.stick.y = st.y; peor = Math.max(peor, SOL.penetra(S.pos.x, S.pos.z, S.pos.y)); if (centroDentro()) dentroN++; }, 150);
              I.stick.x = I.stick.y = 0; frame(() => { if (centroDentro()) dentroN++; }, 60);
            }
            mt.bordePenetraMax = peor; mt.bordeCuadrosDentro = dentroN;
            check('Torre antigua: volando contra el borde de la plataforma no se mete en la piedra', dentroN === 0 && peor <= 2, JSON.stringify(mt));
            // c2) Metida en la plataforma con la cabeza fuera (la captura de Kelvin), a pie y volando: sale sola, sin castigo
            for (const vuela of [false, true]) {
              reset(cav.x, cav.z); S.pos.y = cav.top - 0.5; M.grounded = !vuela; M.flying = vuela; M.desatascos = 0;
              const r = frame(null, 96), libre = r.findIndex(o => !SOL.penetra(o.x, o.z, o.y));
              mt[vuela ? 'saleVolandoMs' : 'saleAPieMs'] = libre < 0 ? -1 : ms(libre + 1);
              check(`Torre antigua: metida en la plataforma ${vuela ? 'volando' : 'a pie'} sale sola en menos de 1,6 s`, libre >= 0 && ms(libre + 1) <= 1600 && !SOL.penetra(S.pos.x, S.pos.z, S.pos.y) && S.pos.y >= cav.top - 0.1, JSON.stringify(mt));
            }
            // c3) Dentro de la torre hueca manteniendo subir: no se queda trabada bajo la plataforma, sale por arriba
            reset(cav.x, cav.z); M.desatascos = 0; F.toggleFly();
            const r3 = frame(() => { I.jumpHeld = true; }, 330); I.jumpHeld = false;
            const arriba = r3.findIndex(o => o.y >= cav.top - 0.05);
            mt.subeDesdeDentroMs = arriba < 0 ? -1 : ms(arriba + 1); mt.desatascos = M.desatascos || 0;
            check('Torre antigua: dentro de la torre hueca, mantener subir la saca por encima de la plataforma', arriba >= 0 && !SOL.penetra(S.pos.x, S.pos.z, S.pos.y) && !r3.some(o => o.y > cav.cap - 1.5 && o.y < cav.top - 0.05 && SOL.penetra(o.x, o.z, o.y) > 2), JSON.stringify(mt));
            // c4) A pie dentro de la torre hueca, empujando contra la pared: a los 1,5 s se recoloca fuera, sin castigo
            reset(cav.x, cav.z); M.desatascos = 0;
            const st4 = toStick(tx + 5 - cav.x, tz - cav.z);
            const r4 = frame(() => { I.stick.x = st4.x; I.stick.y = st4.y; }, 180); I.stick.x = I.stick.y = 0;
            const sale = r4.findIndex(o => o.y > cav.cap - 0.5 || Math.hypot(o.x - tx, o.z - tz) > 4.5);
            const parada = r4.findIndex((o, i) => i > 0 && Math.hypot(o.x - r4[i - 1].x, o.z - r4[i - 1].z) < 0.005); // deja de avanzar contra la pared
            mt.recolocaTrasPararMs = sale < 0 || parada < 0 ? -1 : ms(sale - parada);
            check('Torre antigua: encerrada a pie sin poder salir, a los 1,5 s sin avanzar se recoloca fuera (red de seguridad)', sale > parada && parada >= 0 && ms(sale - parada) <= 2000 && (M.desatascos || 0) >= 1 && !SOL.penetra(S.pos.x, S.pos.z, S.pos.y), JSON.stringify(mt));
          } else check('Torre antigua de las ruinas', false, 'no se encontró la cavidad de la torre (¿cambió el modelo o el mapa?)');
          reset(L.x, L.z);
        } else check('Torre antigua de las ruinas', true, 'sin la torre en este mapa');
      }
      // Fundido de la flora (G1): con la cámara de seguimiento a su distancia normal la flora entre ella y Vittata se
      // tramea (uOcluA.w = FUNDIDO.fuerza); con la cámara pegada a Vittata (menos de 1,5 radios) se apaga
      if (G.vegetacion && G.vegetacion.fundido) {
        const FU = G.vegetacion.fundido, cam = G.renderer.camera;
        reset(L.x, L.z); frame(null, 40); G.vegetacion.fundir();
        const lejos = G.vegetacion.stats().fundido, dist = cam.position.distanceTo(new THREE.Vector3(S.pos.x, S.pos.y + FU.alto, S.pos.z));
        const p0 = cam.position.clone(); cam.position.set(S.pos.x + 0.3, S.pos.y + FU.alto + 0.3, S.pos.z); G.vegetacion.fundir();
        const cerca = G.vegetacion.stats().fundido; cam.position.copy(p0);
        met.fundido = { fuerza: FU.fuerza, lejos, cerca, distCam: r2(dist) };
        check('Fundido de la flora: activo con la cámara a distancia normal y apagado con la cámara pegada a Vittata', FU.fuerza > 0 && lejos === FU.fuerza && cerca === 0 && dist > FU.radio * 1.5, JSON.stringify(met.fundido));
      }
      met.tuning = { walk: T.walk, run: T.run, jumpV: T.jumpV, fly: T.fly, landV: T.landV };
    } finally {
      K.clear(); I.stick.x = I.stick.y = 0; I.jumpHeld = false;
      F.endFlight(); M.vx = M.vz = 0; M.swimming = false;
      Object.assign(S.pos, keep.pos); S.facing = keep.facing; S.vy = 0; G.camara.yaw = keep.yaw; G.quiet = keep.quiet;
      G.camara.CAM.lazy = keep.lazy[0]; G.camara.CAM.lazyFly = keep.lazy[1];
      for (const id of ventanas) $(id).hidden = false;
      G.camara.place(true);
    }
    const res = R.result(); res.metricas = met;
    return res;
  }
  return { test, sleep };
};
