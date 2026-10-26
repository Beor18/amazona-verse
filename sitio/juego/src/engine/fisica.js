/* AVE · colisiones y movimiento (rol Movimiento y animación; ver docs/equipo/MOVIMIENTO.md)
   Movimiento de acción: aceleración, correr, salto variable, doble salto, planeo, impulso, tiempo de coyote y búfer de
   salto, pendientes (límite, frenado cuesta arriba, pegado al bajar), vuelo con despegue, cernido y aterrizaje suave, y nado.
   Todo el ajuste fino está en TUNING (abajo, documentado); un pack lo cambia con jugador.fisica = { clave: valor }.
   Colisiones: círculos (r) y cajas alineadas (hx/hz) contra el jugador; sin motor de física (CTO_PLAN §2).
   Un collider es { x, z, r, hx?, hz?, h?, kind, when?, id? }: h = altura que se puede sobrevolar (si falta, alturas[kind]).
   Ganchos: 'moved' (busy) justo después de mover al jugador y antes de chocar (p. ej. recoger objetos al pasar);
   'vuelo' (true | false) al despegar y al terminar el vuelo; 'viento' (true | false) al llegar subiendo al techo de vuelo y al
   dejarlo; 'desatasco' ({ x, y, z, como }) cuando la red de seguridad la saca de dentro de un sólido.
   Subir siempre sube (volando, mantener salto) hasta el techo de vuelo: flyCeil m sobre lo más alto del terreno y los sólidos
   a menos de techoRadio m. Los últimos techoZona m frenan la subida y, por encima, el viento la baja suave (lo avisa la guía).
   Bajo un saliente (plataforma, alero) que tapa la subida, se desliza sola hacia el cielo abierto más cercano.
   Volando, rozar el suelo o un tejado a velocidad de crucero no termina el vuelo: sigue rasante. Se posa al aterrizar (V o X),
   al bajar con C hasta el suelo o al tocarlo despacio, sin subir.
   Nunca encajada: en el aire los pies no entran en un sólido (un borde bajo se sube, como un escalón); si aun así queda dentro,
   sale empujada al punto libre más cercano (al lado o encima) y, si lleva más de T.atasco s sin poder moverse metida en la
   geometría, se recoloca allí sin castigo (MOVE.atasco: s que lleva así; MOVE.desatascos: cuántas veces).
   Perchas: superficies de una vía que añade un pack con addPercha({ x, z, r, y, when? }) (y = tope absoluto). Solo sostienen a
   quien llega desde arriba (y >= tope - 0,3 m); desde abajo se atraviesan volando. suelo(x, z, y) = terreno o percha.
   Estado legible (MOVE): flying, landing (bajando para aterrizar), swimming, grounded, fase ('suelo' | 'aire' | 'planeo' |
   'despegue' | 'vuelo' | 'cernido' | 'aterrizaje' | 'nado'), speed, land (s de aplastón), impact (0..1), slope (°),
   agachada (0..1: bajo un toldo o un alero bajo; la lee la pose de character.js) y alto (alto del cuerpo para chocar). */
AVE.module('fisica', function (G) {
  'use strict';
  const S = G.S;
  // ---------- Ajuste fino (tuning). Unidades: m, s, m/s, m/s²; las tasas k en 1/s (llega al 90 % en ln(10)/k s) ----------
  const TUNING = {
    // Suelo
    walk: 6.5,            // velocidad al caminar (m/s)
    run: 10.5,            // con Shift o el joystick a fondo
    accel: 18,            // tasa de arranque en el suelo: 90 % de la velocidad en 0,13 s
    decel: 22,            // tasa de frenado en el suelo: se para en 0,1 s (sin patinar)
    turnAccel: 22,        // tasa al pedir el sentido contrario: giro en seco sin derrape
    airAccel: 6,          // control en el aire (saltando o planeando)
    radius: 0.55,         // radio del cuerpo para chocar
    // Salto
    jumpV: 7.5,           // velocidad inicial: 1,28 m de alto con gravityUp
    doubleJumpV: 7,       // segundo salto con aleteo (+1,1 m)
    gravityUp: 22,        // gravedad mientras sube
    gravityDown: 30,      // gravedad al caer: caída firme, no flotante
    jumpCut: 0.6,         // soltar el salto mientras sube multiplica la velocidad por esto (un toque = salto corto)
    maxFall: 20,          // velocidad máxima de caída
    coyote: 0.12,         // tiempo para saltar después de salir de un borde
    jumpBuffer: 0.13,     // un salto pulsado hasta 0,13 s antes de tocar el suelo se guarda y salta al aterrizar
    glideGravity: 5,      // planeo (mantener salto al caer): gravedad…
    glideMaxFall: 2,      // …y caída máxima
    // Impulso
    dash: 19, dashTime: 0.2, dashCooldown: 0.7, dashAirLift: 1.5,
    // Pendientes
    maxSlope: 48,         // grados: más empinado no se sube caminando (se resbala por la curva de nivel)
    uphillSlow: 0.45,     // frenado cuesta arriba (0 = nada); a 34° se va al ~76 %
    snapDown: 0.3,        // pegado al suelo al bajar: m por cuadro además de la pendiente
    slideAccel: 9,        // en una ladera más empinada que maxSlope se resbala hacia abajo
    // Vuelo
    fly: 12,              // velocidad de crucero
    flyAccel: 3.5,        // tasa de aceleración en el aire (inercia de ave; radio de giro ≈ fly / flyAccel)
    flyBrake: 2.6,        // tasa de frenado al soltar la dirección (se queda cernida)
    flyCeil: 26,          // techo de vuelo: m sobre lo más alto del terreno y los sólidos a menos de techoRadio m
    techoRadio: 25,       // m alrededor que cuentan para el techo (junto a una torre o un cerro se puede subir por encima)
    techoZona: 3,         // en los últimos m bajo el techo la subida se frena poco a poco (se nota antes de llegar)
    vientoV: 1.5,         // por encima del techo, el viento fuerte la baja a esta velocidad (gancho 'viento': aviso)
    techoAyuda: 4,        // subiendo bajo un saliente que la tapa, se desliza hacia el cielo abierto a esta velocidad (m/s)
    atasco: 1.5,          // s metida en un sólido sin poder moverse antes de recolocarla (al lado o encima, sin castigo)
    salirV: 5,            // metida en un sólido, sale empujada hacia el punto libre más cercano a esta velocidad (m/s)
    climbV: 5.5,          // subir (mantener salto)
    diveV: 7,             // bajar (C)
    glideSink: 0.45,      // a velocidad de crucero, sin subir ni bajar, planea perdiendo esta altura por segundo
    takeoffV: 7.5,        // despegue desde el suelo o el agua: impulso hacia arriba…
    takeoffTime: 0.45,    // …durante este tiempo (sube ~2,5 m y se queda cernida)
    landV: 5.5,           // aterrizar (V o botón Aterrizar): baja a esta velocidad…
    flareHeight: 2.6,     // …y desde esta altura sobre el suelo frena con las alas…
    flareV: 1.3,          // …hasta tocar el suelo a esta velocidad (aterrizaje suave)
    landSpeed: 0.55,      // aterrizando, la velocidad horizontal máxima es esta fracción del crucero
    perchAssist: 0.6,     // bajando, a esta distancia (m) de algo fino se centra encima para posarse
    // Agacharse (bajo un toldo, un alero o una lona bajos): con menos espacio que altoCabeza sobre los pies se agacha
    altoCabeza: 1.8,      // alto de Vittata de pie con margen (el modelo mide 1,75 m)
    altoAgachada: 1.15,   // alto mínimo agachada: lo que quede más bajo es pared
    agacharMira: 0.3,     // mira el espacio libre también donde estará en estos s (se agacha antes de llegar)
    vAccel: 4,            // tasa del cambio de velocidad vertical en vuelo
    vAccelLand: 7,        // al aterrizar, más firme: llega a flareV antes de tocar aunque baje de 20 m o hacia una ladera
    // Nado
    swim: 4.5, swimRunFactor: 1.4, swimDepth: 0.22, swimJumpV: 7, swimAccel: 6,
    // Aterrizaje
    squashTime: 0.22,     // duración del aplastón al aterrizar
    hardLanding: 9,       // m/s de caída a partir de los que tiembla la cámara
  };
  const T = Object.assign(TUNING, G.pack.jugador && G.pack.jugador.fisica);
  const SPEED = T.walk, RUN_SPEED = T.run, DASH_SPEED = T.dash;
  const FLY_SPEED = T.fly, FLY_CEIL = T.flyCeil;
  const SWIM_SPEED = T.swim, SWIM_DEPTH = T.swimDepth;
  const MOVE = { vx: 0, vz: 0, airJumps: 0, coyote: 0, dashT: 0, dashCd: 0, airDash: true, land: 0, impact: 0, wasAir: false,
    flying: false, landing: false, takeoff: 0, jumping: false, buffer: 0, grounded: true, groundY: 0, grade: 0, onTerrain: true,
    fase: 'suelo', slope: 0, speed: 0, agachada: 0, alto: 0 };
  const colliders = [];
  // Altura de cada tipo de obstáculo para poder pasar volando por encima (un pack añade los suyos)
  const alturas = { post: 1.3, obj: 1.6, npc: 2 };

  const perchas = [];
  const PERCHA_TOL = 0.3;
  function addPercha(p) { perchas.push(p); return p; }
  function removePercha(p) { const i = perchas.indexOf(p); if (i >= 0) perchas.splice(i, 1); }
  // Suelo bajo (x, z) para algo a la altura y: el del terreno o el de una percha que tenga debajo
  // sinPisos: sin los pisos de una vía del terreno (fisica los quita si subir a uno metería el cuerpo en un sólido)
  function suelo(x, z, y, tolSolido, sinPisos) {
    let g = sinPisos ? G.terreno.height(x, z) : G.terreno.surfaceY(x, z, y); // con y, el terreno cuenta también sus pisos de una vía (puente, muelle, mirador)
    if (y != null) for (const p of perchas) {
      if (y >= p.y - PERCHA_TOL && p.y > g && Math.hypot(x - p.x, z - p.z) < p.r && (!p.when || p.when())) g = p.y;
    }
    // Sólidos sacados de la geometría (solidos.js): techos, cornisas, rocas, ramas, barandas, postes.
    // Sobre una percha del diseño (misión), su columna de aire manda: una rama encima no la tapa.
    if (y != null && G.solidos && G.solidos.activo && !columnaPercha(x, z, y)) { const s = G.solidos.suelo(x, z, y, tolSolido); if (s > g) g = s; }
    return g;
  }
  function columnaPercha(x, z, y) {
    for (const p of perchas) if (y >= p.y - PERCHA_TOL && y < p.y + 4 && Math.hypot(x - p.x, z - p.z) < p.r + 0.3 && (!p.when || p.when())) return p;
    return null;
  }
  const busyNow = () => G.dialogo.open() || G.ui.cardOpen || G.ui.overlayOpen();
  const onGroundNow = () => S.pos.y <= suelo(S.pos.x, S.pos.z, S.pos.y) + 0.01;

  // ---------- Acciones (las llama input.js) ----------
  function jump(v) { S.vy = v; MOVE.coyote = 0; MOVE.buffer = 0; MOVE.jumping = true; MOVE.grounded = false; G.audio.play('jump'); }
  function tryJump() {
    if (MOVE.flying) { if (MOVE.landing) { MOVE.landing = false; S.vy = Math.max(S.vy, 1); } return; } // saltar cancela el aterrizaje
    if (MOVE.swimming) { S.vy = T.swimJumpV; MOVE.swimming = false; MOVE.jumping = true; G.agua.splash(S.pos.x, S.water, S.pos.z, 0.8); return; }
    if (onGroundNow() || MOVE.coyote > 0) { jump(T.jumpV); MOVE.airJumps = 1; return; }
    // Cayendo y a punto de tocar el suelo: se guarda el salto (no gasta el doble salto ni despega sin querer)
    const h = S.pos.y - suelo(S.pos.x, S.pos.z, S.pos.y);
    if (S.vy < -0.5 && h / -S.vy < T.jumpBuffer) { MOVE.buffer = T.jumpBuffer; return; }
    if (MOVE.airJumps > 0) { jump(T.doubleJumpV); MOVE.airJumps--; G.fx.burst(S.pos.x, S.pos.y + 0.6, S.pos.z, 'feathers', 6); return; }
    startFlying();
  }
  // Soltar el salto mientras sube: salto corto (control fino para las perchas y los bordes)
  function releaseJump() {
    if (MOVE.jumping && !MOVE.flying && S.vy > 0) S.vy *= T.jumpCut;
    MOVE.jumping = false;
  }
  function startFlying() {
    if (busyNow()) return;
    const fromGround = onGroundNow() || MOVE.swimming;
    if (MOVE.swimming) { MOVE.swimming = false; G.agua.splash(S.pos.x, S.water, S.pos.z, 1.1); }
    MOVE.flying = true; MOVE.landing = false; MOVE.jumping = false; MOVE.grounded = false;
    if (fromGround) { S.vy = T.takeoffV * (G.rareza ? G.rareza.mult('impulso') : 1); MOVE.takeoff = T.takeoffTime; G.audio.play('despegar'); }
    else { S.vy = Math.max(S.vy, 2); MOVE.takeoff = 0.15; }
    G.emit('vuelo', true);
  }
  // Volando: empieza a aterrizar (bajada controlada y frenado con las alas). Otra vez (o saltar) sigue volando.
  function land() { if (MOVE.flying) { MOVE.landing = true; MOVE.takeoff = 0; } }
  function toggleFly() {
    if (!MOVE.flying) { startFlying(); return; }
    if (MOVE.landing) { MOVE.landing = false; S.vy = Math.max(S.vy, 0.5); } else land();
  }
  function endFlight() { if (!MOVE.flying) return; MOVE.flying = false; MOVE.landing = false; MOVE.takeoff = 0; G.emit('vuelo', false); }
  function tryDash() {
    if (MOVE.dashCd > 0 || busyNow()) return;
    const air = !onGroundNow();
    if (air && !MOVE.airDash) return;
    if (air && !MOVE.flying) { MOVE.airDash = false; S.vy = Math.max(S.vy, T.dashAirLift); }
    MOVE.dashT = T.dashTime; MOVE.dashCd = T.dashCooldown;
    G.audio.play('dash');
  }
  // Empuja un punto fuera de un collider: círculo (r) o caja alineada (hx/hz). Los de edificios, estructuras, árboles, el taller
  // y las estacas se ignoran donde solidos.js ya tiene su geometría real (si no, empujarían fuera de un techo a quien está parado encima).
  const KIND_SOLIDO = { edificio: 1, estructura: 1, arbol: 1, taller: 1, post: 1 };
  function pushOut(p, c, rad) {
    if (c.r <= 0 || (c.when && !c.when())) return;
    if (KIND_SOLIDO[c.kind] && G.solidos && G.solidos.activo) {
      if (c._solV !== G.solidos.version) { c._sol = G.solidos.cubre(c); c._solV = G.solidos.version; } // se renueva al crecer los sólidos
      if (c._sol) return;
    }
    if (p.y != null && p.y - G.terreno.height(c.x, c.z) > (c.h != null ? c.h : c.kind === 'tree' ? c.r * 9 : alturas[c.kind] || 2)) return;
    if (c.hx) {
      const qx = Math.max(c.x - c.hx, Math.min(c.x + c.hx, p.x)), qz = Math.max(c.z - c.hz, Math.min(c.z + c.hz, p.z));
      const dx = p.x - qx, dz = p.z - qz, d = Math.hypot(dx, dz);
      if (d >= rad) return;
      if (d > 1e-4) { p.x = qx + dx / d * rad; p.z = qz + dz / d * rad; return; }
      // Dentro de la caja: sale por el lado más cercano
      const ox = c.hx - Math.abs(p.x - c.x), oz = c.hz - Math.abs(p.z - c.z);
      if (ox < oz) p.x = c.x + Math.sign(p.x - c.x || 1) * (c.hx + rad);
      else p.z = c.z + Math.sign(p.z - c.z || 1) * (c.hz + rad);
      return;
    }
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = c.r + rad;
    if (d < min && d > 1e-4) { p.x = c.x + dx / d * min; p.z = c.z + dz / d * min; }
  }
  function removeColliders(kind) { for (let i = colliders.length - 1; i >= 0; i--) if (colliders[i].kind === kind) colliders.splice(i, 1); }

  // Normal del terreno (no de pisos ni perchas) bajo (x, z)
  const nrm = { x: 0, y: 1, z: 0 };
  function slopeAt(x, z) { G.terreno.normalAt(x, z, nrm); return nrm; }
  const cosMax = () => Math.cos(T.maxSlope * Math.PI / 180);
  const rate = (k, dt) => 1 - Math.exp(-dt * k);

  // ---------- Subir siempre sube y nunca encajada (sólidos de solidos.js) ----------
  const ANILLO = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  // Techo al subir con todo el cuerpo (centro y 4 puntos del borde): un saliente que solo tapa el borde también para la cabeza
  function techoCuerpo(SOL, x, z, y0, y1, h) {
    const r = SOL.SO.radio * 0.7; let t = Infinity;
    for (let k = 0; k < 5; k++) t = Math.min(t, SOL.techo(x + ANILLO[k][0] * r, z + ANILLO[k][1] * r, y0, y1, h));
    return t;
  }
  // Lo más alto en (x, z) a la altura de un escalón sobre los pies, en todo el cuerpo (para subir un borde bajo en el aire)
  function bordeBajo(SOL, x, z, y) {
    const r = SOL.SO.radio, d = SOL.SO.stepUp - SOL.SO.tolSuelo; let t = -Infinity;
    for (const [dx, dz] of ANILLO) t = Math.max(t, SOL.altoEn(x + dx * r, z + dz * r, y + d));
    return t;
  }
  // Techo de vuelo: lo más alto del terreno y los sólidos alrededor (se recalcula cada 3 m)
  const zona = { x: 1e9, z: 1e9, alto: -Infinity };
  function altoZona(x, z) {
    if (Math.hypot(x - zona.x, z - zona.z) > 3) {
      const SOL = G.solidos && G.solidos.activo ? G.solidos : null; let a = G.terreno.height(x, z);
      for (const f of [0.5, 1]) for (let i = 0; i < 8; i++) {
        const ax = x + Math.cos(i * Math.PI / 4) * T.techoRadio * f, az = z + Math.sin(i * Math.PI / 4) * T.techoRadio * f;
        a = Math.max(a, G.terreno.height(ax, az), SOL ? SOL.altoEn(ax, az, 1e4) : -Infinity);
      }
      zona.x = x; zona.z = z; zona.alto = a;
    }
    return zona.alto;
  }
  const techoVuelo = (x, z, ground) => Math.max(ground, altoZona(x, z)) + T.flyCeil;
  // Cielo abierto alcanzable: avanza en 32 direcciones a la altura y (pasos de 0,3 m hasta maxR) sin meterse más en un sólido,
  // hasta una columna sin techo en `alto` m sobre la cabeza. El más cercano, o null (encerrada: dentro de una torre hueca)
  function cieloAlcanzable(SOL, pen, y, h, maxR, alto) {
    const p0 = pen(S.pos.x, S.pos.z, y); let mejor = null;
    for (let i = 0; i < 32; i++) {
      const ux = Math.cos(i / 32 * Math.PI * 2), uz = Math.sin(i / 32 * Math.PI * 2);
      for (let r = 0.3; r <= maxR + 0.01 && (!mejor || r < mejor.r); r += 0.3) {
        const x = S.pos.x + ux * r, z = S.pos.z + uz * r;
        if (pen(x, z, y) > p0) break;
        if (techoCuerpo(SOL, x, z, y, y + alto, h) === Infinity) { mejor = { x, z, r }; break; }
      }
    }
    return mejor;
  }
  // Salir por arriba de lo que la tapa (y = el bajo de ese techo): sube por los tramos hasta un sitio libre para el cuerpo
  function salirPorArriba(SOL, pen, y, h) {
    for (let i = 0; i < 8; i++) {
      const t = SOL.dentro(S.pos.x, S.pos.z, y + 0.01); if (t > y) y = t + 0.02;
      const encima = techoCuerpo(SOL, S.pos.x, S.pos.z, y, y + 0.3, h);
      if (encima === Infinity && !pen(S.pos.x, S.pos.z, y)) return y;
      if (encima < Infinity) y = encima;
    }
    return Math.max(SOL.altoEn(S.pos.x, S.pos.z, 1e4), G.terreno.height(S.pos.x, S.pos.z)) + 0.05;
  }
  // Punto libre más cercano para salir de un sólido: encima (el tope de lo que la contiene) o al lado, a la misma altura volando
  // o en su suelo caminando; sin hueco en 4,5 m, encima de todo. abierto: el lado tiene que estar bajo el cielo abierto (al
  // salir de dentro de la piedra, nunca a otra cavidad); si no, vale el hueco más cercano (rozando, un empujoncito)
  function libreCerca(SOL, h, abierto) {
    const x = S.pos.x, z = S.pos.z, y = S.pos.y;
    let mejor = null;
    const top = SOL.dentro(x, z, y + h * 0.5);
    if (top > y && !SOL.penetra(x, z, top + 0.02, h)) mejor = { x, z, y: top + 0.02, d: (top - y) * 1.2, como: 'arriba' };
    for (let r = 0.3; r <= 4.51 && !(mejor && mejor.como === 'lado') && (!mejor || r < mejor.d); r += 0.3) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
        const cy = MOVE.flying ? y : Math.min(y, suelo(cx, cz, y + SOL.SO.stepUp));
        if (SOL.penetra(cx, cz, cy, h) || (abierto && techoCuerpo(SOL, cx, cz, cy, cy + 30, h) < Infinity)) continue;
        mejor = { x: cx, z: cz, y: cy, d: r, como: 'lado' }; break;
      }
    }
    if (!mejor) mejor = { x, z, y: Math.max(SOL.altoEn(x, z, 1e4), G.terreno.height(x, z)) + 0.05, d: 99, como: 'arriba' };
    return mejor;
  }
  // Red de seguridad, sin castigo:
  // - metida en un sólido (el centro del cuerpo dentro): sale empujada hacia el punto libre más cercano; a los T.atasco s, va;
  // - pidiendo moverse sin avanzar 0,6 m en T.atasco s, rozando un sólido o encerrada (techo encima y ningún cielo abierto
  //   alcanzable en 8 m: dentro de una torre hueca): se recoloca al lado o encima.
  const ATS = { t: 0, x: 0, y: 0, z: 0, salida: null, ult: null };
  function recolocar(o) {
    S.pos.x = o.x; S.pos.y = o.y; S.pos.z = o.z; S.vy = 0; MOVE.vx = MOVE.vz = 0;
    ATS.t = 0; ATS.salida = null; MOVE.atasco = 0; MOVE.desatascos = (MOVE.desatascos || 0) + 1;
    G.emit('desatasco', { x: o.x, y: o.y, z: o.z, como: o.como });
  }
  // Empuja hacia o a T.salirV; true al llegar
  function empujar(o, dt) {
    const dx = o.x - S.pos.x, dy = o.y - S.pos.y, dz = o.z - S.pos.z, d = Math.hypot(dx, dy, dz), paso = Math.min(d, T.salirV * dt);
    if (d > 1e-3) { S.pos.x += dx / d * paso; S.pos.y += dy / d * paso; S.pos.z += dz / d * paso; if (dy > 0) { S.vy = Math.max(S.vy, 0); MOVE.grounded = false; } }
    return d - paso < 0.01;
  }
  function desencajar(dt, SOL, pen, h, pide) {
    // Un salto de más de 2 m desde el cuadro anterior es un teletransporte (misión, prueba, cargar partida): lo de antes no cuenta
    const u = ATS.ult; ATS.ult = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    if (u && Math.hypot(S.pos.x - u.x, S.pos.y - u.y, S.pos.z - u.z) > 2) { ATS.t = 0; ATS.salida = null; MOVE.atasco = 0; }
    // Saliendo: sigue hasta el punto libre aunque a medio camino ya no cuente como metida (los pies en el borde de una losa)
    if (ATS.salida) {
      ATS.t += dt; MOVE.atasco = ATS.t;
      if (ATS.t > T.atasco) recolocar(ATS.salida);
      else if (empujar(ATS.salida, dt)) { ATS.salida = null; ATS.t = 0; MOVE.atasco = 0; }
      return;
    }
    const n = SOL.penetra(S.pos.x, S.pos.z, S.pos.y, h);
    const dentro = n > 0 && SOL.dentro(S.pos.x, S.pos.z, S.pos.y + h * 0.5) > S.pos.y + SOL.SO.stepUp;
    if (dentro) { ATS.salida = libreCerca(SOL, h, true); ATS.t = dt; MOVE.atasco = dt; if (empujar(ATS.salida, dt)) { ATS.salida = null; ATS.t = 0; MOVE.atasco = 0; } return; }
    if (!pide) { ATS.t = 0; MOVE.atasco = 0; return; }
    // pidiendo moverse: si avanza de verdad (0,6 m) no está atascada
    if (!ATS.t || Math.hypot(S.pos.x - ATS.x, S.pos.z - ATS.z, S.pos.y - ATS.y) > 0.6) { ATS.t = 0; ATS.x = S.pos.x; ATS.y = S.pos.y; ATS.z = S.pos.z; }
    ATS.t += dt; MOVE.atasco = ATS.t;
    if (ATS.t <= T.atasco) return;
    ATS.t = 0; MOVE.atasco = 0;
    const tapa = techoCuerpo(SOL, S.pos.x, S.pos.z, S.pos.y, S.pos.y + 30, h);
    if (tapa < Infinity && !cieloAlcanzable(SOL, pen, S.pos.y, h, 8, 30)) recolocar({ x: S.pos.x, z: S.pos.z, y: salirPorArriba(SOL, pen, tapa, h), como: 'arriba' });
    else if (n) recolocar(libreCerca(SOL, h, false));
  }

  // ---------- Un paso de simulación del jugador; devuelve si se está moviendo ----------
  function step(dt, busy) {
    const keys = G.input.keys, stick = G.input.stick, cam = G.camara;
    if (!MOVE.flying) { MOVE.landing = false; MOVE.takeoff = 0; } // por si un pack o una prueba cambia flying a mano
    let ix = 0, iz = 0;
    if (keys.has('w') || keys.has('arrowup')) iz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) iz += 1;
    if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
    if (keys.has('d') || keys.has('arrowright')) ix += 1;
    if (keys.has('q')) { cam.yaw += 1.8 * dt; if (cam.manual) cam.manual(); }
    if (keys.has('r')) { cam.yaw -= 1.8 * dt; if (cam.manual) cam.manual(); }
    ix += stick.x; iz += stick.y;
    const len = Math.hypot(ix, iz);
    const onGround = onGroundNow();
    const dive = keys.has('c') && !busy;
    let tx = 0, tz = 0, wantDir = null;
    if (len > 0.12 && !busy) {
      const mag = Math.min(1, len), camYaw = cam.yaw;
      ix /= Math.max(1, len); iz /= Math.max(1, len);
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      const mx = rx * ix - fx * iz, mz = rz * ix - fz * iz, ml = Math.hypot(mx, mz);
      // Shift (o el joystick a fondo) corre
      const run = keys.has('shift') || Math.hypot(stick.x, stick.y) > 0.92;
      let sp = MOVE.flying ? FLY_SPEED * (MOVE.landing ? T.landSpeed : 1) : MOVE.swimming ? SWIM_SPEED * (run ? T.swimRunFactor : 1) : run ? RUN_SPEED : SPEED;
      if (MOVE.flying) sp *= G.rareza ? G.rareza.mult('vuelo') : 1; // cría épica o legendaria; en Retos y duelos mult() es 1
      // Cuesta arriba se frena (según la subida del cuadro anterior)
      if (MOVE.grounded && MOVE.grade > 0) sp /= 1 + T.uphillSlow * Math.min(1.2, MOVE.grade);
      if (MOVE.agachada && !MOVE.flying) sp *= 1 - 0.4 * MOVE.agachada; // agachada camina más despacio
      sp *= (ml > 0 ? 1 / Math.max(1, ml) : 0) * Math.max(mag, 0.35);
      tx = mx * sp; tz = mz * sp;
      if (ml > 0.01) wantDir = { x: mx / ml, z: mz / ml };
      G.actores.flipSprite(ix);
    }
    // Hacia dónde mira: en el suelo, hacia donde se pide (giro inmediato); volando, hacia donde va (el ave no gira en seco)
    const v0 = Math.hypot(MOVE.vx, MOVE.vz);
    if (MOVE.flying && v0 > 1.5) S.facing = { x: MOVE.vx / v0, z: MOVE.vz / v0 };
    else if (wantDir) S.facing = wantDir;
    MOVE.dashCd = Math.max(0, MOVE.dashCd - dt);
    if (MOVE.dashT > 0) {
      MOVE.dashT -= dt;
      MOVE.vx = S.facing.x * DASH_SPEED; MOVE.vz = S.facing.z * DASH_SPEED;
    } else {
      let k;
      if (MOVE.flying) k = tx || tz ? T.flyAccel : T.flyBrake;
      else if (MOVE.swimming) k = T.swimAccel;
      else if (onGround) k = !(tx || tz) ? T.decel : MOVE.vx * tx + MOVE.vz * tz < 0 ? T.turnAccel : T.accel;
      else k = T.airAccel;
      const a = rate(k, dt);
      MOVE.vx += (tx - MOVE.vx) * a; MOVE.vz += (tz - MOVE.vz) * a;
    }
    // Ladera más empinada que maxSlope bajo los pies: resbala hacia abajo
    const px = S.pos.x, pz = S.pos.z, py = S.pos.y;
    if (onGround && MOVE.grounded && MOVE.onTerrain) {
      const n = slopeAt(px, pz);
      if (n.y < cosMax()) { MOVE.vx += n.x * T.slideAccel * dt; MOVE.vz += n.z * T.slideAccel * dt; }
    }
    S.pos.x += MOVE.vx * dt; S.pos.z += MOVE.vz * dt;
    G.emit('moved', busy);
    // Dos pasadas: al empujar fuera de un objeto se puede quedar dentro de otro vecino
    for (let pass = 0; pass < 2; pass++) for (const c of colliders) pushOut(S.pos, c, T.radius);
    const WORLD = G.terreno.WORLD;
    S.pos.x = Math.max(-WORLD, Math.min(WORLD, S.pos.x));
    S.pos.z = Math.max(-WORLD, Math.min(WORLD, S.pos.z));
    // Paredes de la geometría real: un paso que mete más el cuerpo en un sólido se desliza por el eje libre (o no avanza).
    // Se compara con lo que ya estaba metido: así se sale de un rincón estrecho, pero nunca se entra en una pared.
    const SOL = G.solidos && G.solidos.activo && !columnaPercha(S.pos.x, S.pos.z, S.pos.y) ? G.solidos : null;
    let hCuerpo;
    // En el suelo (o aún agachada) el cuerpo puede agacharse hasta altoAgachada: pasa bajo un toldo bajo sin que la cabeza roce
    const agachable = SOL && !MOVE.swimming && (MOVE.grounded || MOVE.agachada > 0.01);
    // pen(x, z, y): cuánto se mete el cuerpo. En el suelo se sube un escalón (stepUp); en el aire los pies no entran en un
    // sólido: volando junto al borde de una plataforma ya no se cuela con los pies bajo el borde y, al bajar, queda metida dentro
    let pen = null;
    if (SOL) {
      // nadando en superficie, el cuerpo llega hasta encima del agua: no se cuela por debajo de una canoa a flote
      const wy0 = MOVE.swimming && !dive ? G.agua.levelAt(S.pos.x) : -Infinity;
      hCuerpo = wy0 > -1e9 ? Math.max(SOL.SO.cuerpo, wy0 + 0.6 - S.pos.y) : agachable ? T.altoAgachada : undefined;
      const aire = !MOVE.grounded && !MOVE.swimming, pie = aire ? SOL.SO.stepUp - 0.05 : 0, hP = (hCuerpo != null ? hCuerpo : SOL.SO.cuerpo) + pie;
      pen = (x, z, y) => SOL.penetra(x, z, y - pie, hP);
      const pn = pen(S.pos.x, S.pos.z, S.pos.y);
      if (pn) {
        const p0 = pen(px, pz, S.pos.y);
        if (pn > p0) {
          // En el aire, contra un borde bajo (hasta un escalón sobre los pies): se sube encima, como caminando
          const borde = aire ? bordeBajo(SOL, S.pos.x, S.pos.z, S.pos.y) : -Infinity;
          if (borde > S.pos.y && pen(S.pos.x, S.pos.z, borde + 0.02) <= p0) { S.pos.y = borde + 0.02; S.vy = Math.max(S.vy, 0); }
          else if (pen(S.pos.x, pz, S.pos.y) <= p0) { S.pos.z = pz; MOVE.vz = 0; }
          else if (pen(px, S.pos.z, S.pos.y) <= p0) { S.pos.x = px; MOVE.vx = 0; }
          else { S.pos.x = px; S.pos.z = pz; MOVE.vx = MOVE.vz = 0; }
        }
      }
    }
    // Ayuda para posarse: bajando cerca de algo fino (rama, baranda, poste, cumbrera), se centra encima para aterrizar en él
    MOVE.perchY = -Infinity;
    if (SOL && !MOVE.grounded && !MOVE.swimming && S.vy < -0.3 && (!MOVE.flying || MOVE.landing || dive)) {
      const bajo = MOVE.landing ? T.flareHeight + 0.4 : 1.2; // aterrizando la ve antes: frena a tiempo sobre la rama
      const pc = SOL.percha(S.pos.x, S.pos.z, S.pos.y, T.perchAssist, bajo);
      if (pc && S.pos.y - pc.y < bajo) {
        MOVE.perchY = pc.y; // el frenado del aterrizaje cuenta con la percha a la que se acerca
        const k = rate(8, dt); S.pos.x += (pc.x - S.pos.x) * k; S.pos.z += (pc.z - S.pos.z) * k; MOVE.vx *= 0.9; MOVE.vz *= 0.9;
      }
    }
    // con la altura previa: las perchas sostienen al bajar. En el aire, un sólido solo es suelo si ya está bajo los pies
    let ground = suelo(S.pos.x, S.pos.z, S.pos.y, MOVE.grounded ? undefined : 0.05);
    // Un piso de una vía del terreno (la cubierta de un mirador, la plataforma de una torre) no sube a quien llega desde abajo
    // si eso le mete el cuerpo en un sólido: volando bajo la plataforma de la torre antigua, la cabeza la atravesaba
    if (SOL && ground > S.pos.y + 0.01 && pen(S.pos.x, S.pos.z, ground) > pen(S.pos.x, S.pos.z, S.pos.y)) ground = suelo(S.pos.x, S.pos.z, S.pos.y, MOVE.grounded ? undefined : 0.05, true);
    // Pendiente demasiado empinada para subir caminando: se anula la parte cuesta arriba del paso (sigue la curva de nivel)
    const grounded = MOVE.grounded && !MOVE.flying && !MOVE.swimming;
    if (grounded && ground > S.pos.y + 0.02 && Math.abs(ground - G.terreno.height(S.pos.x, S.pos.z)) < 0.05) {
      const n = slopeAt(S.pos.x, S.pos.z);
      const dx = S.pos.x - px, dz = S.pos.z - pz;
      if (n.y < cosMax() && dx * n.x + dz * n.z < 0) {
        const hl = Math.hypot(n.x, n.z) || 1, ux = -n.x / hl, uz = -n.z / hl, along = dx * ux + dz * uz; // u: cuesta arriba
        S.pos.x -= ux * along; S.pos.z -= uz * along;
        const vUp = MOVE.vx * ux + MOVE.vz * uz; if (vUp > 0) { MOVE.vx -= ux * vUp; MOVE.vz -= uz * vUp; }
        ground = suelo(S.pos.x, S.pos.z, S.pos.y);
        if (ground > S.pos.y + 0.3) { S.pos.x = px; S.pos.z = pz; ground = suelo(px, pz, S.pos.y); }
      }
    }
    const hSpeed = Math.hypot(MOVE.vx, MOVE.vz);
    const moving = hSpeed > 0.6;
    MOVE.speed = hSpeed;
    // Agua: el río (franja del plano de agua) es nadable donde cubre más de 0,7 m
    const wY = G.agua.levelAt(S.pos.x), deep = wY - ground > 0.7;
    const wasSwim = MOVE.swimming;
    // Volando, tocar el agua honda termina el vuelo y se posa a nadar (nunca vuela bajo el agua)
    if (MOVE.flying && deep && S.pos.y <= wY - SWIM_DEPTH + 0.05 && S.vy <= 0.5) { endFlight(); S.vy = Math.min(S.vy, 0); }
    MOVE.swimming = deep && !MOVE.flying && S.pos.y <= wY - SWIM_DEPTH + 0.15;
    if (MOVE.swimming && !wasSwim) G.agua.splash(S.pos.x, wY, S.pos.z, Math.min(1.6, 0.6 + Math.abs(S.vy) * 0.12));
    const jumpHeld = G.input.jumpHeld;
    if (MOVE.swimming) {
      // Flota en la superficie; mantener C bucea hasta el fondo; al soltar sube
      const target = dive ? ground + 0.25 : wY - SWIM_DEPTH;
      S.vy += ((target - S.pos.y) * 3 - S.vy) * rate(5, dt);
      MOVE.airJumps = 1; MOVE.airDash = true; MOVE.wet = true; MOVE.jumping = false;
      // Estela en V detrás al avanzar; quieta, solo ondas suaves
      if ((MOVE.ripple = (MOVE.ripple || 0) - dt) <= 0 && S.pos.y > wY - 1) {
        if (moving) {
          MOVE.ripple = 0.16;
          const bx = S.pos.x - S.facing.x * 0.5, bz = S.pos.z - S.facing.z * 0.5, ox = -S.facing.z * 0.35, oz = S.facing.x * 0.35;
          G.agua.ripple(bx + ox, wY, bz + oz, 0.7); G.agua.ripple(bx - ox, wY, bz - oz, 0.7);
        } else { MOVE.ripple = 1.1; G.agua.ripple(S.pos.x, wY, S.pos.z, 1.3); }
      }
    } else if (MOVE.flying) {
      // Vuelo sin gravedad. Despegue: impulso que se apaga. Aterrizaje: baja y frena con las alas cerca del suelo.
      // Si no: mantener salto sube, C baja, y sin nada se cierne en el sitio (o planea perdiendo un poco a velocidad de crucero).
      // Altura sobre el suelo, mirando también 0,35 s adelante: al aterrizar sobre un tejado o un borde frena a tiempo
      const above = S.pos.y - Math.max(ground, MOVE.perchY, suelo(S.pos.x + MOVE.vx * 0.35, S.pos.z + MOVE.vz * 0.35, S.pos.y));
      let want, k = T.vAccel;
      if (MOVE.takeoff > 0) { MOVE.takeoff -= dt; want = T.takeoffV * 0.6 * (G.rareza ? G.rareza.mult('impulso') : 1); k = 2; }
      else if (MOVE.landing) { want = above > T.flareHeight ? -T.landV : -Math.max(T.flareV, T.landV * above / T.flareHeight * 0.6); k = T.vAccelLand; }
      else if (jumpHeld && !busy) want = T.climbV;
      else if (dive) want = above < T.flareHeight ? -Math.max(T.flareV, T.diveV * above / T.flareHeight) : -T.diveV;
      else want = -T.glideSink * Math.min(1, hSpeed / FLY_SPEED) ** 2;
      // Techo de vuelo: la subida se frena en los últimos techoZona m y, por encima, el viento la baja suave (y se avisa)
      const lim = techoVuelo(S.pos.x, S.pos.z, ground);
      if (want > 0) want *= Math.max(0, Math.min(1, (lim - S.pos.y) / T.techoZona));
      if (S.pos.y > lim) want = Math.min(want, -T.vientoV);
      S.vy += (want - S.vy) * rate(k, dt);
      if (S.pos.y > lim + 1) S.vy = Math.min(S.vy, -T.vientoV); // muy por encima (el suelo bajó de golpe): baja ya
      const viento = jumpHeld && !busy && S.pos.y > lim - 0.6;
      if (viento !== !!MOVE.viento) { MOVE.viento = viento; G.emit('viento', viento); }
      MOVE.techoVuelo = lim;
      if (dive && above < 0.25 && S.vy <= 0) MOVE.landing = true; // bajar con C hasta el suelo también aterriza
    } else {
      if (MOVE.wet && onGround) { MOVE.wet = false; MOVE.shake = true; G.agua.spray(S.pos.x, S.pos.y + 1.0, S.pos.z); } // sale del agua: se sacude
      const gliding = jumpHeld && S.vy < 0 && !onGround;
      S.vy -= (gliding ? T.glideGravity : S.vy > 0 ? T.gravityUp : T.gravityDown) * dt;
      if (gliding) S.vy = Math.max(S.vy, -T.glideMaxFall);
      S.vy = Math.max(S.vy, -T.maxFall);
    }
    if (!MOVE.flying && MOVE.viento) { MOVE.viento = false; G.emit('viento', false); }
    let ny = (S.pos.y || ground) + S.vy * dt;
    // Subiendo bajo un techo o una cornisa: la cabeza (y el borde del cuerpo) no lo atraviesa. Volando y pidiendo subir,
    // se desliza hacia el cielo abierto más cercano: mantener subir nunca se queda trabado bajo una plataforma o un alero
    MOVE.ayudaTecho = 0;
    if (SOL && S.vy > 0) {
      const hT = agachable ? T.altoAgachada : SOL.SO.cuerpo, tch = techoCuerpo(SOL, S.pos.x, S.pos.z, S.pos.y, ny, hT);
      if (tch < Infinity) {
        ny = Math.min(ny, tch - hT); S.vy = 0;
        if (MOVE.flying && (jumpHeld || MOVE.takeoff > 0) && !busy && !MOVE.landing) {
          if ((MOVE.cieloT = (MOVE.cieloT || 0) - dt) <= 0) { MOVE.cielo = cieloAlcanzable(SOL, pen, S.pos.y, hT, 4, 3); MOVE.cieloT = 0.3; }
          const c = MOVE.cielo;
          if (c) {
            MOVE.tapadaT = 0;
            const dx = c.x - S.pos.x, dz = c.z - S.pos.z, d = Math.hypot(dx, dz), paso = Math.min(d, T.techoAyuda * dt);
            const qx = S.pos.x + dx / (d || 1) * paso, qz = S.pos.z + dz / (d || 1) * paso;
            if (pen(qx, qz, S.pos.y) <= pen(S.pos.x, S.pos.z, S.pos.y)) { S.pos.x = qx; S.pos.z = qz; MOVE.ayudaTecho = 1; }
          } else if ((MOVE.tapadaT = (MOVE.tapadaT || 0) + dt) > T.atasco) {
            // Sin cielo abierto alcanzable (encerrada, p. ej. dentro de una torre hueca): sale por encima de lo que la tapa
            MOVE.tapadaT = 0; ny = salirPorArriba(SOL, pen, tch, hT);
            MOVE.desatascos = (MOVE.desatascos || 0) + 1; G.emit('desatasco', { x: S.pos.x, y: ny, z: S.pos.z, como: 'arriba' });
          }
        }
      } else { MOVE.cielo = null; MOVE.cieloT = 0; MOVE.tapadaT = 0; }
    }
    // Pegado al suelo: caminando cuesta abajo no se despega (sin aleteos ni patas recogidas en cada bajada)
    const d = Math.hypot(S.pos.x - px, S.pos.z - pz);
    if (grounded && S.vy <= 0 && ny > ground && ny - ground <= T.snapDown + d * 1.2) ny = ground;
    S.pos.y = Math.max(ground, ny);
    // Con la altura nueva (subir o bajar un escalón, una rampa bajo un techo) el cuerpo tampoco puede quedar más metido en un
    // sólido que antes del paso: si pasa, no avanza (en el aire solo se anula lo horizontal)
    if (SOL && (S.pos.x !== px || S.pos.z !== pz)) {
      const pf = pen(S.pos.x, S.pos.z, S.pos.y);
      if (pf && pf > pen(px, pz, py)) {
        S.pos.x = px; S.pos.z = pz; MOVE.vx = MOVE.vz = 0;
        if (grounded) { S.pos.y = py; ground = suelo(px, pz, py); } else { ground = suelo(px, pz, py); S.pos.y = Math.max(ground, S.pos.y); }
      }
    }
    // Volando, rozar el suelo o un tejado a velocidad de crucero (o subiendo) no termina el vuelo: sigue rasante.
    // Se posa al aterrizar (V, X), al bajar con C hasta el suelo o al tocarlo despacio sin pedir subir.
    const rasante = MOVE.flying && S.pos.y <= ground && !(S.vy <= 0 && MOVE.takeoff <= 0 && (MOVE.landing || dive || (!jumpHeld && hSpeed < 2.5)));
    if (rasante) { S.pos.y = ground; S.vy = Math.max(S.vy, 0); MOVE.grounded = false; }
    else if (S.pos.y <= ground) {
      if (MOVE.wasAir) {
        const fall = -S.vy;
        MOVE.impact = MOVE.flying ? 0.25 : Math.min(1, Math.max(0, (fall - 2) / 12));
        if (fall > 4 || MOVE.flying) { MOVE.land = T.squashTime; MOVE.sonarLand = true; } // el sonido, abajo: depende de dónde se posa
        if (fall > T.hardLanding && !MOVE.flying) cam.shake(Math.min(0.35, fall * 0.02), 0.25); // aterrizaje fuerte: aplastón y sacudida
      }
      if (MOVE.flying && S.vy <= 0 && MOVE.takeoff <= 0) endFlight(); // tocar suelo bajando termina el vuelo
      S.pos.y = ground; if (!MOVE.flying) S.vy = 0;
      MOVE.coyote = T.coyote; MOVE.airJumps = 1; MOVE.airDash = true; MOVE.wasAir = false; MOVE.jumping = false;
      MOVE.grounded = !MOVE.flying;
      if (MOVE.buffer > 0 && MOVE.grounded && !busy) jump(T.jumpV); // salto guardado justo antes de aterrizar
    } else { MOVE.coyote = Math.max(0, MOVE.coyote - dt); MOVE.wasAir = true; MOVE.grounded = false; }
    MOVE.buffer = Math.max(0, MOVE.buffer - dt);
    MOVE.land = Math.max(0, MOVE.land - dt);
    // Red de seguridad: metida en un sólido sale sola; atascada más de T.atasco s, se recoloca al lado o encima (sin castigo)
    if (SOL && !MOVE.swimming) desencajar(dt, SOL, pen, hCuerpo != null ? hCuerpo : SOL.SO.cuerpo, (len > 0.12 || jumpHeld) && !busy);
    else if (MOVE.atasco || ATS.salida) { ATS.t = 0; ATS.salida = null; MOVE.atasco = 0; }
    // Lo que leen la animación, la cámara y las pruebas
    MOVE.grade = MOVE.grounded && d > 1e-3 ? (ground - MOVE.groundY) / d : 0;
    MOVE.groundY = ground;
    MOVE.onTerrain = Math.abs(ground - G.terreno.height(S.pos.x, S.pos.z)) < 0.05;
    MOVE.slope = MOVE.grounded && MOVE.onTerrain ? Math.acos(Math.min(1, slopeAt(S.pos.x, S.pos.z).y)) * 180 / Math.PI : 0;
    // Agachada: con menos espacio que altoCabeza sobre los pies se agacha. Mira también por delante (hasta agacharMira s de
    // camino, 0,6 m como mínimo) con menos peso cuanto más lejos: así baja poco a poco al acercarse a la lona y, debajo, nunca
    // va por detrás del espacio que tiene (la cabeza del modelo, 1,75 m, no roza). Al salir se levanta despacio.
    let quiere = 0;
    if (SOL && MOVE.grounded && !MOVE.swimming) {
      const v = Math.hypot(MOVE.vx, MOVE.vz), D = Math.max(0.6, v * T.agacharMira), ux = v > 0.1 ? MOVE.vx / v : S.facing.x, uz = v > 0.1 ? MOVE.vz / v : S.facing.z;
      for (let i = 0; i <= 4; i++) {
        const lb = SOL.libre(S.pos.x + ux * D * i / 4, S.pos.z + uz * D * i / 4, S.pos.y, 0.45, T.altoAgachada - 0.05);
        if (lb < T.altoCabeza) quiere = Math.max(quiere, Math.min(1, (T.altoCabeza - lb) / (T.altoCabeza - T.altoAgachada)) * (1 - 0.75 * i / 4));
      }
    }
    MOVE.agachada = quiere >= MOVE.agachada ? quiere : MOVE.agachada + (quiere - MOVE.agachada) * rate(8, dt);
    if (MOVE.agachada < 0.005) MOVE.agachada = 0;
    MOVE.alto = T.altoCabeza - (T.altoCabeza - T.altoAgachada) * MOVE.agachada;
    // Posada: sobre un sólido ('alto': techo, roca, cornisa) o sobre algo fino ('fino': rama, baranda, poste, cumbrera)
    const antes = MOVE.posado;
    MOVE.posado = '';
    if (SOL && MOVE.grounded && !MOVE.onTerrain && Math.abs(SOL.suelo(S.pos.x, S.pos.z, S.pos.y + 0.01) - S.pos.y) < 0.03) MOVE.posado = SOL.fino(S.pos.x, S.pos.z, S.pos.y + 0.01) ? 'fino' : 'alto';
    // Gancho 'posado' una vez por aterrizaje (el cómic cuenta la primera vez en un techo o en una rama alta)
    if (MOVE.posado && !antes && MOVE.wasAirPosado) {
      const que = SOL.que(S.pos.x, S.pos.z, S.pos.y + 0.01);
      G.emit('posado', { tipo: MOVE.posado, que, altura: +(S.pos.y - G.terreno.height(S.pos.x, S.pos.z)).toFixed(2) });
      // Sonido según dónde: techo o cumbrera → aterrizar_techo; rama (y lo fino) → posarse_rama
      G.audio.play(que === 'techo' || que === 'cumbrera' ? 'aterrizar_techo' : que === 'rama' || MOVE.posado === 'fino' ? 'posarse_rama' : 'aterrizar_techo');
      MOVE.sonarLand = false;
    }
    if (MOVE.sonarLand) { MOVE.sonarLand = false; G.audio.play('land'); }
    MOVE.wasAirPosado = !MOVE.grounded; // en el aire hasta este cuadro: el próximo contacto es un aterrizaje
    MOVE.fase = MOVE.swimming ? 'nado' : MOVE.flying ? (MOVE.takeoff > 0 ? 'despegue' : MOVE.landing ? 'aterrizaje' : hSpeed < 2.5 ? 'cernido' : 'vuelo')
      : MOVE.grounded ? 'suelo' : jumpHeld && S.vy < 0 ? 'planeo' : 'aire';
    return moving;
  }

  return { MOVE, TUNING: T, colliders, alturas, perchas, addPercha, removePercha, suelo, pushOut, removeColliders,
    tryJump, releaseJump, startFlying, land, toggleFly, endFlight, tryDash, step, slopeAt,
    techoVuelo: (x, z) => techoVuelo(x, z, suelo(x, z, S.pos.y)),
    SPEED, RUN_SPEED, DASH_SPEED, FLY_SPEED, FLY_CEIL, SWIM_SPEED, SWIM_DEPTH };
});
