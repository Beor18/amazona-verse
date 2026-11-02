/* Juego · Cotorras residentes («Mundo vivo», etapa 1; DIVERSION_CAP1 § 3 mejora 10)
   Cotorras de varias especies viven alrededor de los lugares principales del mapa real: la plaza de Villa Raíz (con
   cotorras puertorriqueñas), la orilla del río, la Poza Honda, la Ciudad de los 36 y la Poza del Dajao (pack.residentes.colonias
   lo cambia; sin esos lugares en el mapa no sale ninguna). Cada una es una máquina de estados sencilla:
   - posada (en una copa, una rama, un techo o el suelo) con acciones: mira alrededor, se acicala, llama (y otra le contesta),
     come (picotea la fruta de la copa o el suelo);
   - vuela de una percha a otra en arco y aterriza; baja al suelo a comer;
   - persigue: dos se persiguen en círculos un rato y vuelven a posarse (no con «reducir movimiento»);
   - reacciona a Vittata: a menos de 10 m la mira; si Vittata se posa a menos de 2,2 m, se aparta de un salto (en el suelo) o
     se va volando a otra percha; si Vittata hace el gesto «Saludar» cerca, 1 a 3 la siguen unos 8 s y vuelven a su sitio.
   Ver una de cerca (menos de 8 m durante 2 s) abre su tarjeta del Álbum de las 36 (src/game/album.js, G.album.ver); también las
   de la bandada (bandada.js) cuando pasa o se posa cerca.
   - Rendimiento: no hay mallas propias. Se dibujan en las dos mallas instanciadas de la bandada (bandada.js EXTRA): la bandada y
     los residentes juntos son 2 draw calls. Solo viven las colonias a menos de 130 m (las 3 más cercanas): bajo 0, medio 4 y
     alto 6 por colonia (hasta 18). CPU: unas cuentas por ave y cuadro; el álbum se revisa 4 veces por segundo.
   - Nada en las baterías (G.quiet) ni antes de crear el personaje; la prueba lo enciende con prueba(true).
   - Sonido: una llamada corta sintetizada ('cotorra', G.audio.define), más suave con la distancia; nunca en G.quiet.
   Se carga desde bandada.js: window.AVResidentes(G, B) → G.residentes. Prueba: AV.vivoTest() (src/game/album.js). */
window.AVResidentes = function (G, B) {
  'use strict';
  if (G.residentes) return G.residentes;
  const S = G.S, M = G.fisica.MOVE, H = (x, z) => G.terreno.height(x, z);
  const N = { bajo: 0, medio: 4, alto: 6 };
  const ACTIVA = 130, MAX_COL = 3, VER_R = 8, VER_T = 2, MIRA_R = 10, ESPANTA = 2.2, SALUDO_R = 25, ESC = 1.35;
  const DEF = [
    { id: 'plaza', poi: 'plaza', r: 24, fijas: ['vittata', 'vittata'] },   // Villa Raíz: cotorras puertorriqueñas en casa
    { id: 'rio', poi: 'rio_terrenoA', r: 22 },
    { id: 'poza', poi: 'poza_honda', r: 20 },
    { id: 'ciudad36', poi: 'kelvin_ruinas_yunque', r: 30 },                 // Ciudad de los 36: siempre especies distintas
    { id: 'dajao', poi: 'poza_dajao', r: 20 },
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
  const porColonia = () => (N[nivel()] != null ? N[nivel()] : N.medio);
  const reducido = () => !!(G.renderer && G.renderer.REDUCED);
  const R = { prueba: false, cols: null, t: 0, verT: 0, acum: {}, saludo: false, llamaT: 0 };
  const permitido = () => R.prueba || (!G.quiet && !!(S.profile && S.profile.created));
  const angDif = (a, b) => { let d = (b - a) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };

  // ---------- Colonias (de los lugares del mapa) ----------
  function colonias() {
    if (R.cols && R.cols.length) return R.cols;
    const P = (G.terreno && G.terreno.pois) || {}, lista = (G.pack.residentes && G.pack.residentes.colonias) || DEF;
    R.cols = lista.filter(c => P[c.poi] && typeof P[c.poi].x === 'number').map(c => ({ id: c.id, x: P[c.poi].x, z: P[c.poi].z, r: c.r || 22, fijas: c.fijas || [], aves: [], P: null }));
    return R.cols;
  }
  const vivas = () => { const E = window.AV_ESPECIES; return (E && E.especies ? E.especies.map(e => e.id) : []).filter(id => G.album && G.album.colores(id)); };
  function elegirEspecies(col, n) {
    const viv = vivas(), vistas = Array.isArray(S.album) ? S.album : [], usadas = new Set();
    for (const c of R.cols || []) if (c !== col) for (const a of c.aves) usadas.add(a.sp);
    const out = col.fijas.slice(0, n);
    while (out.length < n && viv.length) {
      const libres = viv.filter(id => !out.includes(id) && !usadas.has(id));
      const nuevas = libres.filter(id => !vistas.includes(id));
      const pool = nuevas.length && Math.random() < 0.65 ? nuevas : libres.length ? libres : viv; // así el álbum se puede llenar
      out.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    return out;
  }
  function perchasDe(col) {
    if (!col.P || !col.P.length) col.P = B.perchas(col.x, col.z, col.r, 14, { semilla: col.x * 0.01 });
    return col.P;
  }
  const altas = col => perchasDe(col).filter(p => p.tipo !== 'suelo');
  const suelos = col => perchasDe(col).filter(p => p.tipo === 'suelo');
  const azar = l => l[Math.floor(Math.random() * l.length)];

  function nuevaAve(col, sp, i, llega) {
    const k = B.colorDe(sp) || { c: new THREE.Color(0.2, 0.5, 0.1), a: new THREE.Color(0.2, 0.5, 0.1), cob: 0 };
    const P = perchasDe(col), p = P.length ? P[(i * 5 + Math.floor(Math.random() * 3)) % P.length] : { x: col.x, z: col.z, y: H(col.x, col.z), tipo: 'suelo' };
    const a = { colonia: col.id, col, sp, k, x: p.x, y: p.y, z: p.z, yaw: rnd(0, 6.28), est: 'posada', accion: '', t: 0, dur: rnd(3, 9), perch: p,
      ala: 0, cab: 0, gir: 0, giroObj: 0, fase: rnd(0, 6.28), esc: ESC * rnd(0.92, 1.06), prox: rnd(0.5, 3), vx: 0, vy: 0, vz: 0, llamaEn: -1 };
    if (llega) { const ang = rnd(0, 6.28); a.x = col.x + Math.cos(ang) * 60; a.z = col.z + Math.sin(ang) * 60; a.y = H(a.x, a.z) + 25; volarA(a, p); }
    return a;
  }
  function activar(col, n) {
    col.P = null; // las perchas se miden de nuevo (techos y ramas pueden haber llegado con el streaming)
    const sp = elegirEspecies(col, n);
    col.aves = sp.map((s, i) => nuevaAve(col, s, i, false));
  }
  function ajustar(col, n) {
    if (col.aves.length > n) col.aves.length = n;
    else if (col.aves.length < n) { const sp = elegirEspecies(col, n).slice(col.aves.length); for (const s of sp) col.aves.push(nuevaAve(col, s, col.aves.length, true)); }
  }
  function reiniciar() { for (const c of colonias()) { c.aves = []; c.P = null; } R.acum = {}; B.EXTRA.length = 0; }
  function alCalidad() { const n = porColonia(); for (const c of colonias()) if (c.aves.length) { if (n === 0) c.aves = []; else ajustar(c, n); } }
  G.on('calidad', alCalidad);
  G.on('apply', () => reiniciar(), 91);

  // ---------- Estados ----------
  function volarA(a, p) {
    a.est = 'vuela'; a.accion = ''; a.ox = a.x; a.oy = a.y; a.oz = a.z; a.perch = p; a.prog = 0;
    a.dVuelo = Math.max(3, Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z)); a.ala = 1; a.cab = 0; a.gir = 0;
  }
  function posar(a, p) {
    a.est = 'posada'; a.perch = p; a.x = p.x; a.y = p.y; a.z = p.z; a.t = 0; a.dur = rnd(4, 10); a.prox = rnd(0.4, 1.5);
    a.accion = p.tipo === 'suelo' ? 'come' : 'mira'; a.vx = a.vy = a.vz = 0;
  }
  function forzar(a, est, tipo) { // para la prueba: posada en una percha (tipo 'suelo' la baja al suelo)
    const col = a.col, l = tipo === 'suelo' ? suelos(col) : altas(col);
    const p = l.length ? azar(l) : { x: a.x, y: H(a.x, a.z), z: a.z, tipo: 'suelo' };
    posar(a, tipo === 'suelo' && !l.length ? Object.assign(p, { tipo: 'suelo' }) : p); a.dur = 8; a.t = 0;
  }
  function decidir(a) {
    const col = a.col, r = Math.random(), A = altas(col), Sx = suelos(col);
    const otra = l => { const o = l.filter(p => p !== a.perch); return azar(o.length ? o : l); };
    if (r < 0.45 && A.length) return volarA(a, otra(A));
    if (r < 0.7 && Sx.length && (!A.length || (a.perch && a.perch.tipo !== 'suelo'))) return volarA(a, otra(Sx));
    if (r < 0.88 && !reducido()) {
      const b = col.aves.find(x => x !== a && x.est === 'posada' && x.t > 1.5);
      if (b) { a.est = b.est = 'persigue'; a.t = b.t = 0; a.dur = b.dur = rnd(6, 9); a.lider = true; b.lider = false; a.pareja = b; b.pareja = a; a.ang0 = b.ang0 = rnd(0, 6.28); a.ala = b.ala = 1; return; }
    }
    a.t = 0; a.dur = rnd(4, 10);
  }
  // Llamada: una ave llama y otra de la colonia le contesta
  if (G.audio && G.audio.define && !G.audio.has('cotorra')) {
    G.audio.define('cotorra', (t, g, A) => {
      const k = Math.max(0.15, Math.min(1, g == null ? 1 : g)), f = 1 + (Math.random() - 0.5) * 0.12;
      A.tone(1450 * f, t, 0.08, { type: 'sawtooth', to: 950 * f, gain: 0.028 * k });
      A.tone(1750 * f, t + 0.1, 0.07, { type: 'square', to: 1150 * f, gain: 0.018 * k });
      A.noise(t, 0.14, { freq: 2600, q: 2.2, gain: 0.03 * k });
    });
  }
  function llamar(a, contesta) {
    a.accion = 'llama'; a.prox = rnd(0.8, 1.4); a.t = Math.min(a.t, a.dur - 1.5);
    const d = Math.hypot(a.x - S.pos.x, a.z - S.pos.z);
    if (!G.quiet && d < 35) { try { G.audio.play('cotorra', 1 - d / 35); } catch (e) { /* sin audio */ } }
    if (!contesta) { const b = a.col.aves.find(x => x !== a && x.est === 'posada' && x.llamaEn < 0); if (b) b.llamaEn = rnd(0.4, 0.8); }
  }
  function accionNueva(a) {
    const suelo = a.perch && a.perch.tipo === 'suelo', r = Math.random();
    const L = suelo ? [['come', 0.55], ['mira', 0.8], ['acicala', 0.9], ['llama', 1]] : [['mira', 0.35], ['acicala', 0.6], ['come', 0.8], ['llama', 1]];
    const ac = L.find(x => r < x[1])[0];
    if (ac === 'llama' && R.t - R.llamaT > 2.5) { R.llamaT = R.t; llamar(a, false); return; }
    a.accion = ac === 'llama' ? 'mira' : ac; a.prox = rnd(1.5, 4); a.giroObj = ac === 'acicala' ? (Math.random() < 0.5 ? -1 : 1) * 1.9 : rnd(-1.1, 1.1);
  }

  function pasoAve(a, dt) {
    a.t += dt;
    const px = S.pos.x, pz = S.pos.z, dx = px - a.x, dz = pz - a.z, dH = Math.hypot(dx, dz), dy = S.pos.y - a.y;
    const ox = a.x, oy = a.y, oz = a.z;
    if (a.est === 'posada') {
      a.ala = Math.max(0, a.ala - dt * 4);
      if (a.llamaEn >= 0) { a.llamaEn -= dt; if (a.llamaEn < 0) { a.llamaEn = -1; llamar(a, true); } }
      a.prox -= dt; if (a.prox <= 0) accionNueva(a);
      // Vittata cerca: la mira; si se posa encima, se aparta
      const quieta = !M.flying || M.grounded || !!M.posado;
      if (dH < ESPANTA && Math.abs(dy) < 1.5 && quieta) {
        if (a.perch && a.perch.tipo === 'suelo') {
          const h = dH || 1, x = a.x - dx / h * 1.9, z = a.z - dz / h * 1.9;
          a.est = 'salta'; a.ox = a.x; a.oy = a.y; a.oz = a.z; a.prog = 0; a.perch = { x, z, y: H(x, z), tipo: 'suelo' }; a.yaw = Math.atan2(-dx, -dz);
        } else {
          const A = altas(a.col).filter(p => Math.hypot(p.x - px, p.z - pz) > 6);
          volarA(a, A.length ? azar(A) : { x: a.x - dx * 4, z: a.z - dz * 4, y: H(a.x - dx * 4, a.z - dz * 4), tipo: 'suelo' });
        }
      } else if (dH < MIRA_R && Math.abs(dy) < 6) {
        const quiere = Math.atan2(dx, dz), d = angDif(a.yaw, quiere);
        if (Math.abs(d) > 1.2) a.yaw += Math.sign(d) * Math.min(Math.abs(d) - 1.2, dt * 1.6);
        a.giroObj = Math.max(-1.3, Math.min(1.3, angDif(a.yaw, quiere)));
        if (a.accion === 'acicala' || a.accion === 'come') a.accion = 'mira';
        if (a.t > a.dur * 1.6) decidir(a); // mira un rato y sigue con lo suyo
      } else if (a.t > a.dur) decidir(a);
      a.gir += (a.giroObj - a.gir) * Math.min(1, dt * 6);
      a.cab = a.accion === 'come' ? 0.45 + Math.max(0, Math.sin(R.t * 9 + a.fase)) * 0.6
        : a.accion === 'acicala' ? 0.35 + Math.sin(R.t * 11 + a.fase) * 0.2
          : a.accion === 'llama' ? -0.35 + Math.sin(R.t * 18) * 0.12 : 0;
    } else if (a.est === 'vuela') {
      a.prog = Math.min(1, a.prog + dt * 8 / a.dVuelo);
      const e = a.prog * a.prog * (3 - 2 * a.prog), p = a.perch, arco = Math.sin(a.prog * Math.PI) * Math.min(5, 1 + a.dVuelo * 0.22);
      a.x = a.ox + (p.x - a.ox) * e; a.z = a.oz + (p.z - a.oz) * e; a.y = a.oy + (p.y - a.oy) * e + arco;
      a.y = Math.max(a.y, H(a.x, a.z) + (a.prog > 0.9 ? 0 : 0.6));
      a.ala = 1;
      if (a.prog >= 1) posar(a, p);
    } else if (a.est === 'salta') {
      a.prog = Math.min(1, a.prog + dt / (reducido() ? 0.6 : 0.45));
      const p = a.perch; a.x = a.ox + (p.x - a.ox) * a.prog; a.z = a.oz + (p.z - a.oz) * a.prog;
      a.y = a.oy + (p.y - a.oy) * a.prog + Math.sin(a.prog * Math.PI) * (reducido() ? 0.2 : 0.45); a.ala = 0.5 * Math.sin(a.prog * Math.PI);
      if (a.prog >= 1) { posar(a, p); a.accion = 'mira'; }
    } else if (a.est === 'persigue') {
      const col = a.col, ang = a.ang0 + a.t * 1.7 - (a.lider ? 0 : 0.55), rr = 5 + Math.sin(a.t * 0.7) * 1.5;
      const tx = col.x + Math.cos(ang) * rr, tz = col.z + Math.sin(ang) * rr, ty = H(col.x, col.z) + 7 + Math.sin(a.t * 2.1 + (a.lider ? 0 : 0.6)) * 1.5;
      const k = 1 - Math.exp(-dt * 2.5);
      a.x += (tx - a.x) * k; a.z += (tz - a.z) * k; a.y += (ty - a.y) * k; a.y = Math.max(a.y, H(a.x, a.z) + 1); a.ala = 1;
      if (a.t > a.dur) { const A = altas(col); volarA(a, A.length ? azar(A) : azar(perchasDe(col))); }
    } else if (a.est === 'sigue') {
      a.sigA += dt * (reducido() ? 0.15 : 0.6);
      const r0 = 3, tx = px + Math.cos(a.sigA) * r0, tz = pz + Math.sin(a.sigA) * r0, ty = Math.max(S.pos.y + (M.flying ? 1 : 1.6), H(tx, tz) + 1.2);
      const k = 1 - Math.exp(-dt * 2);
      a.x += (tx - a.x) * k; a.z += (tz - a.z) * k; a.y += (ty - a.y) * k; a.ala = 1;
      if (a.t > a.dur || Math.hypot(px - a.col.x, pz - a.col.z) > a.col.r + 45) { const A = altas(a.col); volarA(a, A.length ? azar(A) : azar(perchasDe(a.col))); }
    }
    if (a.est !== 'posada' && a.est !== 'salta' && dt > 0) {
      a.vx = (a.x - ox) / dt; a.vy = (a.y - oy) / dt; a.vz = (a.z - oz) / dt;
      if (Math.hypot(a.vx, a.vz) > 0.3) a.yaw = Math.atan2(a.vx, a.vz);
    }
  }
  // «Saludar» cerca: las 1 a 3 más cercanas la siguen un rato
  function saludo() {
    const cand = [];
    for (const c of colonias()) for (const a of c.aves) { const d = Math.hypot(a.x - S.pos.x, a.z - S.pos.z); if (d < SALUDO_R && a.est !== 'sigue') cand.push([d, a]); }
    cand.sort((p, q) => p[0] - q[0]);
    const n = Math.min(cand.length, 1 + Math.floor(Math.random() * 3));
    for (let i = 0; i < n; i++) { const a = cand[i][1]; a.est = 'sigue'; a.t = 0; a.dur = rnd(7, 9); a.sigA = Math.atan2(a.z - S.pos.z, a.x - S.pos.x); a.accion = ''; a.ala = 1; }
    return n;
  }

  // ---------- Paso: colonias cercanas, aves, álbum y dibujo ----------
  const lista = [];
  function paso(dt, busy) {
    dt = Math.min(dt, 0.1); R.t += dt;
    const ok = permitido(), n = ok ? porColonia() : 0, cols = colonias(), px = S.pos.x, pz = S.pos.z;
    // las 3 colonias más cercanas a menos de ACTIVA viven; el resto se apaga
    const cerca = cols.map(c => [Math.hypot(c.x - px, c.z - pz), c]).filter(x => x[0] < ACTIVA).sort((p, q) => p[0] - q[0]).slice(0, MAX_COL).map(x => x[1]);
    for (const c of cols) {
      if (!n || !cerca.includes(c)) { if (c.aves.length && Math.hypot(c.x - px, c.z - pz) > ACTIVA + 20 || !n) c.aves = []; continue; }
      if (!c.aves.length) activar(c, n);
    }
    const em = G.actores && G.actores.emote, sal = !!(em && em.name === 'saludar');
    if (sal && !R.saludo && n) saludo();
    R.saludo = sal;
    lista.length = 0;
    for (const c of cols) for (const a of c.aves) { pasoAve(a, dt); lista.push(a); }
    // Álbum: una especie a menos de VER_R durante VER_T segundos (residentes y bandada)
    R.verT += dt;
    if (R.verT >= 0.25 && G.album && (ok || R.prueba)) {
      const paso4 = R.verT; R.verT = 0;
      const aqui = new Set(), py = S.pos.y;
      for (const a of lista) if (Math.hypot(a.x - px, a.y - py, a.z - pz) < VER_R) aqui.add(a.sp);
      const F = B.F, ids = B.especies();
      if (F.estado !== 'off' && ids.length) for (const a of F.aves) if (Math.hypot(a.x - px, a.y - py, a.z - pz) < VER_R) aqui.add(ids[a.sp % ids.length]);
      for (const id of Object.keys(R.acum)) if (!aqui.has(id)) delete R.acum[id];
      for (const id of aqui) { R.acum[id] = (R.acum[id] || 0) + paso4; if (R.acum[id] >= VER_T - 1e-6 && !G.album.visto(id)) G.album.ver(id, 'residente'); }
    } else if (R.verT >= 0.25) R.verT = 0;
    // al dibujo (las mallas de la bandada)
    const E = B.EXTRA; E.length = 0;
    for (const a of lista) {
      const posada = a.est === 'posada' || a.est === 'salta', vh = Math.hypot(a.vx, a.vz);
      const pitch = posada ? (a.perch && a.perch.tipo === 'suelo' ? -0.25 : -0.45) + (a.accion === 'come' ? 0.45 : 0) : -Math.atan2(a.vy, vh || 1) * 0.8;
      E.push({ x: a.x, y: a.y + (posada ? 0.13 * a.esc : 0), z: a.z, yaw: a.yaw, pitch, roll: 0, esc: a.esc, c: a.k.c, a: a.k.a, cob: a.k.cob,
        fase: a.fase, ala: a.ala, cab: posada ? a.cab : 0, gir: posada ? a.gir : 0 });
    }
    if (busy !== 'sin-dibujo') B.dibujar();
  }
  G.on('update', dt => paso(dt, 'sin-dibujo'), 87); // bandada.js (prio 88) dibuja todo junto

  const aves = () => { const o = []; for (const c of colonias()) o.push(...c.aves); return o; };
  const giroHacia = (a, p) => angDif(a.yaw + a.gir, Math.atan2(p.x - a.x, p.z - a.z));
  G.residentes = { N, colonias, aves, paso, reiniciar, forzar, giroHacia, alCalidad, reducido, saludo,
    prueba: on => { R.prueba = !!on; }, olvidar: () => { R.acum = {}; R.verT = 0; }, estado: () => ({ aves: aves().length, colonias: colonias().filter(c => c.aves.length).map(c => c.id) }) };
  return G.residentes;
};
