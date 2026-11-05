/* Juego · Ciudad viva (N17, mundo vivo). La Ciudad de los 36 (zona «kelvin_ruinas_yunque» del streaming) con cotorras que viven allí:
   vuelan entre las torres, se posan en tejados y balcones, conversan en grupitos y tienen rutinas de día y de noche.
   - Especies: las de la colonia «ciudad36» de residentes.js (bosque nublado de las Antillas; tras el pacto, las 36 vivas).
     Nada de canon nuevo: son cotorras de las especies que ya existen, sin nombres ni personajes.
   - De día: vuelan de torre en torre, conversan (2 o 3 en el mismo tejado, mirándose), buscan comida en la plaza en grupo,
     arreglan (picotean el borde de un tejado y bajan a por una ramita a la plaza), juegan (dos se persiguen alrededor de una torre) y
     cruzan el cielo en bandada: 3 a 6 ruedan juntas en un círculo lento y elevado sobre la ciudad (por encima de lo más alto del
     anillo, con margen muestreado) unos 16-30 s y luego se dispersan a posarse (KIMI-056: «que se vean volando», no solo 30 %).
   - De noche (S.hora de 19:00 a 5:30, o un capítulo de noche): vuelan a dormir a las perchas más altas, en parejas, con la cabeza
     metida; si el capítulo tiene faroles en la ciudad (AV_EP5.ruinas con sus luces), una o dos se quedan despiertas junto al farol.
   - No atraviesan edificios ni el suelo: las perchas son superficies con el cielo libre encima (G.solidos.altoEn), el vuelo sube
     por encima de lo más alto del camino y, en cada paso, la altura nunca queda por debajo del tope sólido de ese punto ni del terreno.
   - Rendimiento (Kelvin: lag en móvil e iPad): sin mallas nuevas. Se dibujan en las dos mallas instanciadas de la bandada
     (G.bandada.EXTRA, prioridad 87.5, como comunidades.js): 0 draw calls extra si esas mallas ya se ven, 2 como mucho.
     Cuántas: bajo 20, medio 32, alto 48 (KIMI-081: la población que aguanta cada calidad, medido en KIMI-067 — las aves
     cuestan ~0: mismas 2 mallas instanciadas, +0 draw calls; antes 12/16/20). Se actualizan cada cuadro a menos de 45 m de la
     cámara, cada 3 cuadros hasta 100 m y cada 6 más lejos; a más de 170 m del centro de la ciudad se apagan (sin trabajo ni dibujo).
   - Nada en las baterías (G.quiet) ni antes de crear el personaje. Prueba: AV.ciudadVivaTest(). */
window.AVCiudadViva = function (G) {
  'use strict';
  if (G.ciudadViva) return G.ciudadViva;
  const S = G.S, POI = 'kelvin_ruinas_yunque';
  const H = (x, z) => G.terreno.height(x, z);
  const N = { bajo: 20, medio: 32, alto: 48 }; // KIMI-081: «la población que aguante cada calidad» (medido en KIMI-067: +0 calls, ~0 CPU; 171 perchas dan cabida). Antes 12/16/20. Tope: MAXN de la bandada (20 + 26 + 48 = 94)
  const ACTIVA = 170, HIST = 20, LOD = [[45, 1], [100, 3], [Infinity, 6]], ESC = 1.35, VER_R = 8;
  const SP_DEF = ['vittata', 'imperialis', 'arausiaca', 'guildingii', 'versicolor']; // = residentes.js HAB.nublado
  const rnd = (a, b) => a + Math.random() * (b - a);
  const azar = l => l[Math.floor(Math.random() * l.length)];
  const angDif = (a, b) => { let d = (b - a) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };
  const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
  const cuantas = () => (N[nivel()] != null ? N[nivel()] : N.medio);
  const reducido = () => !!(G.renderer && G.renderer.REDUCED);
  const R = { prueba: false, pausa: false, horaPrueba: null, sitio: null, aves: [], P: null, verP: -1, on: false, cuadro: 0, t: 0, chkT: 0,
    stats: { pasos: 0, cuadros: 0 }, llamaT: 0 };
  const permitido = () => R.prueba || (!G.quiet && !!(S.profile && S.profile.created));

  // ---------- Sitio: el lugar del mapa y su radio (la zona del streaming si se conoce) ----------
  function sitio() {
    if (R.sitio) return R.sitio;
    const P = (G.terreno && G.terreno.pois) || {}, p = P[POI];
    if (!p || typeof p.x !== 'number') return null;
    const ST = G.mundo && G.mundo.streaming, ins = ((ST && ST.instancias) || []).filter(i => i.zona === POI && i.pos && Math.hypot(i.pos[0] - p.x, i.pos[2] - p.z) < 70);
    let r = 0; for (const i of ins) r = Math.max(r, Math.hypot(i.pos[0] - p.x, i.pos[2] - p.z) + (i.r || 0) * 0.5);
    R.sitio = { x: p.x, z: p.z, r: Math.max(30, Math.min(70, r || 40)), ins };
    return R.sitio;
  }
  const noche = () => {
    const h = R.horaPrueba != null ? R.horaPrueba : S.hora;
    if (h != null) return h >= 19 || h < 5.5;
    const W = G.pack && G.pack.mundo; return !!(W && W.cielo && W.cielo.permiso === 'noche');
  };

  // ---------- Perchas: tejados y balcones con el cielo libre encima, y el suelo libre de la plaza ----------
  const SO = () => (G.solidos && G.solidos.activo && G.solidos.altoEn ? G.solidos : null);
  const tope = (x, z) => { const so = SO(), g = so ? so.altoEn(x, z, 1e4) : -Infinity; return Math.max(H(x, z), g); };
  function enAgua(x, z) { const A = G.agua; return !!(A && A.levelAt && A.levelAt(x, z) > H(x, z) - 0.05); }
  function perchas() {
    const so = SO(), ver = G.solidos ? G.solidos.version : 0;
    if (R.P && R.verP === ver) return R.P;
    const s = sitio(), out = { alto: [], suelo: [], farol: [] };
    if (!s) return (R.P = out);
    const pon = (x, z, tipo, base) => {
      const h = H(x, z), y = tope(x, z);
      if (!isFinite(y) || enAgua(x, z)) return false;
      if (tipo === 'suelo') { if (y > h + 0.25) return false; out.suelo.push({ x, z, y: h, tipo }); return true; }
      if (y < h + 1.6 || y > h + 45) return false;
      // un tejado o un balcón: el punto y sus vecinos a 0,3 m no tienen nada más alto encima (cabe una cotorra posada)
      for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) if (tope(x + dx, z + dz) > y + 0.6) return false;
      if (out.alto.some(q => Math.hypot(q.x - x, q.z - z) < 1.2 && Math.abs(q.y - y) < 1)) return false;
      out.alto.push({ x, z, y, tipo, base: base || null }); return true;
    };
    if (so) {
      for (const i of s.ins) { // tejados (lo más alto de cada edificio) y balcones (escalones con cielo libre alrededor)
        const [cx, , cz] = i.pos, rr = Math.max(1.5, (i.r || 4) * 0.8);
        let mejor = null;
        for (let k = 0; k < 9; k++) {
          const a = k * 2.39996, d = k ? rr * 0.35 * Math.sqrt(k / 8) : 0, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = tope(x, z);
          if (!mejor || y > mejor.y) mejor = { x, z, y };
        }
        if (mejor) pon(mejor.x, mejor.z, 'tejado', i);
        for (let k = 0; k < 10; k++) {
          const a = k * 0.6283 + cx * 0.01, d = rr * (0.45 + (k % 3) * 0.18), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = tope(x, z);
          if (mejor && y < mejor.y - 0.8) pon(x, z, 'balcon', i);
        }
      }
    }
    if (out.alto.length < 6 && G.bandada && G.bandada.perchas) // sin sólidos todavía: las perchas de la bandada (techos, ramas y copas)
      for (const p of G.bandada.perchas(s.x, s.z, s.r, 18, { suelo: false, semilla: 3.6 })) if (tope(p.x, p.z) <= p.y + 0.3) pon(p.x, p.z, p.tipo === 'copa' ? 'copa' : 'tejado');
    // el suelo libre entre los edificios (calles y plaza), sin nada encima
    for (let k = 0; k < 80 && out.suelo.length < 12; k++) {
      const a = k * 2.39996 + 0.7, d = s.r * 0.75 * Math.sqrt((k + 0.5) / 80);
      pon(s.x + Math.cos(a) * d, s.z + Math.sin(a) * d, 'suelo');
    }
    // faroles: solo los que ya pone el capítulo (cap. 5, de noche: un farol en cada ruina) dentro de la ciudad
    const E5 = window.AV_EP5, W = G.pack.mundo || {};
    if (E5 && W.cielo && W.cielo.permiso === 'noche') for (const r of E5.ruinas || []) {
      if (!r || Math.hypot(r.x - s.x, r.z - s.z) > s.r) continue;
      for (const [dx, dz] of [[0.9, 0.3], [-0.8, 0.5]]) { const x = r.x + dx, z = r.z + dz; if (tope(x, z) <= H(x, z) + 0.25 && !enAgua(x, z)) out.farol.push({ x, z, y: H(x, z), tipo: 'suelo', farol: true }); }
    }
    R.verP = ver;
    return (R.P = out);
  }
  // Por encima de lo más alto entre dos puntos (muestras cada ~2 m)
  function topeCamino(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.min(24, Math.ceil(d / 2)));
    let m = -Infinity;
    for (let i = 0; i <= n; i++) { const t = i / n; m = Math.max(m, tope(ax + (bx - ax) * t, az + (bz - az) * t)); }
    return m;
  }

  // ---------- Especies: las de la colonia de la Ciudad de los 36 ----------
  function pool() {
    const Rs = G.residentes, col = Rs && Rs.colonias ? Rs.colonias().find(c => c.id === 'ciudad36') : null;
    let p = col && Rs.poolDe ? Rs.poolDe(col) : [];
    if (!p.length) p = SP_DEF.filter(id => !G.album || !G.album.colores || G.album.colores(id));
    return p.length ? p : ['vittata'];
  }
  function piel(sp) {
    const k = G.bandada && G.bandada.colorDe ? G.bandada.colorDe(sp) : null;
    return k || { c: new THREE.Color(0.18, 0.42, 0.12), a: new THREE.Color(0.18, 0.42, 0.12), cob: 0 };
  }

  // ---------- Aves ----------
  function nuevaAve(i, sp) {
    const P = perchas(), l = P.alto.length ? P.alto : P.suelo, s = sitio();
    const p = l.length ? l[(i * 7) % l.length] : { x: s.x, z: s.z, y: H(s.x, s.z), tipo: 'suelo' };
    const off = ocupar(p, null);
    return { i, sp, slot: off[2], k: piel(sp), x: p.x + off[0], y: p.y, z: p.z + off[1], yaw: rnd(0, 6.28), est: 'posada', accion: 'mira', t: 0, dur: rnd(3, 8),
      perch: p, ala: 0, cab: 0, gir: 0, giroObj: 0, pitch: -0.4, roll: 0, fase: rnd(0, 6.28), esc: ESC * rnd(0.92, 1.06), prox: rnd(0.5, 2),
      acum: 0, cada: 1, grupo: null, bando: null, bAng: 0, bR: 0, viajes: 0, vx: 0, vy: 0, vz: 0, lejos: false };
  }
  // Varias en la misma percha: cada una en su sitio (a 0,55 m o más, sin montarse) y siempre sobre la superficie de la percha
  function ocupar(p, a) {
    const usados = new Set(R.aves.filter(b => b !== a && b.perch === p).map(b => b.slot));
    for (let k = 0; k < 9; k++) {
      if (usados.has(k)) continue;
      if (!k) return [0, 0, 0];
      const ang = k * 2.39996 + p.x, d = 0.55 + 0.12 * Math.floor((k - 1) / 4), dx = Math.cos(ang) * d, dz = Math.sin(ang) * d, y = tope(p.x + dx, p.z + dz);
      if (y > p.y - 0.25 && y < p.y + 0.5) return [dx, dz, k];
    }
    return [0, 0, -1];
  }
  function poblar() {
    const n = cuantas(), sp = pool(), out = [];
    for (let i = 0; i < n; i++) out.push(sp[(i + Math.floor(Math.random() * sp.length)) % sp.length]);
    if (sp.includes('vittata')) out[0] = 'vittata'; // la puertorriqueña siempre está en la ciudad
    R.aves = []; R.P = null;
    out.forEach((s, i) => R.aves.push(nuevaAve(i, s)));
  }
  function ajustar() {
    const n = cuantas();
    if (R.aves.length > n) R.aves.length = n;
    else { const sp = pool(); while (R.aves.length < n) R.aves.push(nuevaAve(R.aves.length, azar(sp))); }
  }
  G.on('calidad', () => { if (R.aves.length) ajustar(); });
  G.on('apply', () => { R.aves = []; R.P = null; R.sitio = null; R.on = false; quitar(); }, 91);

  function volarA(a, p, alLlegar) {
    a.perch = null; const off = ocupar(p, a), tx = p.x + off[0], tz = p.z + off[1]; a.slot = off[2];
    a.est = 'vuela'; a.ox = a.x; a.oy = a.y; a.oz = a.z; a.tx = tx; a.tz = tz; a.perch = p; a.prog = 0; a.alLlegar = alLlegar || '';
    a.dVuelo = Math.max(3, Math.hypot(tx - a.x, tz - a.z));
    a.yc = Math.max(a.oy, p.y, topeCamino(a.x, a.z, tx, tz)) + 1.5 + Math.min(4, a.dVuelo * 0.12); // por encima de todo el camino
    a.ala = 1; a.cab = 0; a.gir = 0; a.accion = ''; a.roll = 0;
  }
  function posar(a) {
    const p = a.perch;
    if (tope(a.tx, a.tz) < p.y - 0.3) { a.tx = p.x; a.tz = p.z; } // al borde del tejado no queda en el aire: a la percha
    a.est = 'posada'; a.x = a.tx; a.z = a.tz; a.y = Math.max(p.y, tope(a.x, a.z)); a.t = 0; a.dur = rnd(4, 9); a.prox = rnd(0.4, 1.5);
    a.accion = a.alLlegar || (p.tipo === 'suelo' ? 'come' : 'mira'); a.alLlegar = ''; a.vx = a.vy = a.vz = 0; a.roll = 0;
    if (a.accion === 'duerme' || a.accion === 'vela') a.dur = 1e9;
  }
  const libres = a => R.aves.filter(b => b !== a && b.est === 'posada' && !b.grupo && b.t > 2 && b.accion !== 'duerme');
  // Rutinas de día: volar a otra torre, conversar, comer en la plaza en grupo, arreglar, jugar, cruzar el cielo en bandada
  function decidir(a) {
    const P = perchas(), A = P.alto, Sx = P.suelo, r = Math.random();
    if (a.grupo) salirGrupo(a);
    if (a.accion === 'arregla' && a.viajes > 0 && Sx.length) { a.viajes--; a.casa = a.perch; return volarA(a, azar(Sx), 'recoge'); }
    if (a.accion === 'recoge' && a.casa) { const c = a.casa; a.casa = null; return volarA(a, c, 'arregla'); }
    const otra = l => { const o = l.filter(p => p !== a.perch); return azar(o.length ? o : l); };
    if (r < 0.26 && A.length) return volarA(a, otra(A), '');
    if (r < 0.44 && A.length) { // conversar: 1 o 2 la acompañan al mismo tejado
      const p = otra(A), compas = libres(a).slice(0, 1 + Math.floor(Math.random() * 2)), g = { p, aves: [a].concat(compas), habla: 0, t: 0 };
      for (const b of g.aves) { b.grupo = g; volarA(b, p, 'charla'); }
      return;
    }
    if (r < 0.58 && Sx.length) { // a buscar comida a la plaza: una va y 1 o 2 la siguen
      const p = otra(Sx); volarA(a, p, 'come');
      for (const b of libres(a).slice(0, 1 + Math.floor(Math.random() * 2))) volarA(b, azar(Sx), 'come');
      return;
    }
    if (r < 0.70 && A.length) { a.viajes = 1 + Math.floor(Math.random() * 2); return volarA(a, otra(A), 'arregla'); }
    if (r < 0.82) { // cruzar el cielo en bandada: 3-6 ruedan juntas sobre la ciudad y luego se dispersan
      // (KIMI-081: con población de medio/alto caben dos bandadas a la vez; en bajo, una como antes)
      const compas = libres(a).slice(0, 2 + Math.floor(Math.random() * 3));
      const nBandos = new Set(R.aves.filter(c => c.bando).map(c => c.bando)).size;
      if (compas.length >= 2 && nBandos < (cuantas() >= 30 ? 2 : 1)) {
        const s = sitio();
        const b = { cx: s.x + rnd(-8, 8), cz: s.z + rnd(-8, 8), r: rnd(13, 24), w: (Math.random() < 0.5 ? 1 : -1) * rnd(0.28, 0.42),
          fin: R.t + rnd(16, 30), aves: [a].concat(compas) };
        let m = -Infinity; // lo más alto del anillo (muestreado): la bandada vuela por encima de eso + margen
        for (let i = 0; i < 12; i++) { const aa = i * 0.5236; m = Math.max(m, topeCamino(b.cx + Math.cos(aa) * b.r, b.cz + Math.sin(aa) * b.r, b.cx + Math.cos(aa + 0.6) * b.r, b.cz + Math.sin(aa + 0.6) * b.r)); }
        b.y0 = m + rnd(3.5, 6.5);
        for (const c of b.aves) { if (c.grupo) salirGrupo(c); c.bando = b; c.bAng = Math.atan2(c.z - b.cz, c.x - b.cx); c.bR = Math.max(4, Math.hypot(c.x - b.cx, c.z - b.cz)); c.est = 'bandada'; c.accion = ''; c.t = 0; c.ala = 1; }
        return;
      }
    }
    if (r < 0.9 && !reducido() && A.length) { // jugar: dos se persiguen alrededor de una torre
      const b = libres(a)[0], p = azar(A.filter(q => q.tipo === 'tejado').length ? A.filter(q => q.tipo === 'tejado') : A);
      if (b) { const g = { p, ang: rnd(0, 6.28), t: 0, dur: rnd(6, 10), aves: [a, b] }; for (const c of g.aves) { c.est = 'juega'; c.juego = g; c.t = 0; c.ala = 1; c.accion = ''; } a.lider = true; b.lider = false; return; }
    }
    a.t = 0; a.dur = rnd(3, 7);
  }
  function salirGrupo(a) { const g = a.grupo; a.grupo = null; if (g) g.aves = g.aves.filter(b => b !== a); }
  function salirBando(a) { const b = a.bando; a.bando = null; a.roll = 0; if (b) b.aves = b.aves.filter(c => c !== a); }
  // De noche: a dormir en las perchas más altas, en parejas; junto a un farol, una o dos despiertas
  function dormir(a) {
    const P = perchas();
    if (a.grupo) salirGrupo(a);
    if (a.bando) salirBando(a);
    if (P.farol.length && a.i < Math.min(2, P.farol.length)) return volarA(a, P.farol[a.i], 'vela');
    const A = P.alto.slice().sort((p, q) => q.y - p.y), k = Math.max(1, Math.ceil(R.aves.length / 2));
    const p = A.length ? A[Math.floor(a.i / 2) % Math.min(A.length, k)] : (P.suelo[0] || a.perch);
    volarA(a, p, 'duerme');
  }
  function accionNueva(a) {
    if (a.accion === 'duerme' || a.accion === 'vela' || a.accion === 'charla' || a.accion === 'arregla' || a.accion === 'recoge') { a.prox = rnd(1, 3); return; }
    const r = Math.random(), suelo = a.perch && a.perch.tipo === 'suelo';
    a.accion = suelo ? (r < 0.6 ? 'come' : r < 0.85 ? 'mira' : 'acicala') : (r < 0.45 ? 'mira' : r < 0.75 ? 'acicala' : 'come');
    a.prox = rnd(1.5, 4); a.giroObj = a.accion === 'acicala' ? (Math.random() < 0.5 ? -1 : 1) * 1.9 : rnd(-1.1, 1.1);
  }
  function llamar(a) {
    if (G.quiet || !G.audio || !G.audio.has || !G.audio.has('cotorra') || R.t - R.llamaT < 3) return;
    const d = Math.hypot(a.x - S.pos.x, a.z - S.pos.z); if (d > 30) return;
    R.llamaT = R.t; try { G.audio.play('cotorra', 1 - d / 30); } catch (e) { /* sin audio */ }
  }

  function pasoAve(a, dt) {
    a.t += dt;
    const ox = a.x, oy = a.y, oz = a.z, n = noche();
    if (a.est === 'posada') {
      a.ala = Math.max(0, a.ala - dt * 4);
      const dormida = a.accion === 'duerme' || a.accion === 'vela';
      if (n && !dormida) { if (a.t > 0.5 + a.i * 0.15) dormir(a); return; }        // al caer la noche se van a dormir, una tras otra
      if (!n && dormida) { if (a.t > 0.3 + a.i * 0.2 || a.dur < 1e8) { a.accion = 'mira'; a.dur = rnd(1, 3); a.t = 0; } } // amanece
      a.prox -= dt; if (a.prox <= 0) accionNueva(a);
      if (a.accion === 'charla' && a.grupo) { // se miran y se turnan para hablar
        const g = a.grupo; let cx = 0, cz = 0; for (const b of g.aves) { cx += b.x; cz += b.z; } cx /= g.aves.length; cz /= g.aves.length;
        const quiere = g.aves.length > 1 ? Math.atan2(cx - a.x, cz - a.z) : a.yaw, d = angDif(a.yaw, quiere);
        a.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 2.5);
        g.t += dt / g.aves.length; if (g.t > 1.6) { g.t = 0; g.habla = (g.habla + 1) % g.aves.length; if (g.aves[g.habla] === a) llamar(a); }
        const habla = g.aves[g.habla] === a;
        a.giroObj = habla ? Math.sin(R.t * 7 + a.fase) * 0.35 : Math.sin(R.t * 1.3 + a.fase) * 0.25;
        a.cab = habla ? -0.25 + Math.sin(R.t * 14 + a.fase) * 0.15 : 0.1;
        if (a.t > 14 + a.i % 4) { salirGrupo(a); a.accion = 'mira'; a.dur = 0; }
      } else if (a.accion === 'arregla') {
        a.cab = Math.max(0, Math.sin(R.t * 5 + a.fase)) * 0.8; a.giroObj = Math.sin(R.t * 0.7 + a.fase) * 0.5;
      } else if (a.accion === 'recoge') { a.cab = 0.5 + Math.max(0, Math.sin(R.t * 8 + a.fase)) * 0.5; a.giroObj = 0; if (a.t > 1.8) a.t = a.dur; }
      else if (a.accion === 'duerme') { a.cab = 0.55; a.giroObj = 1.9; a.pitch = -0.3 + Math.sin(R.t * 1.1 + a.fase) * 0.03; }
      else if (a.accion === 'vela') { a.cab = 0.05; a.giroObj = Math.sin(R.t * 0.4 + a.fase) * 1.1; }
      else a.cab = a.accion === 'come' ? 0.45 + Math.max(0, Math.sin(R.t * 9 + a.fase)) * 0.6 : a.accion === 'acicala' ? 0.35 + Math.sin(R.t * 11 + a.fase) * 0.2 : 0;
      a.gir += (a.giroObj - a.gir) * Math.min(1, dt * 6);
      if (a.accion !== 'duerme') a.pitch = (a.perch && a.perch.tipo === 'suelo' ? -0.25 : -0.45) + (a.accion === 'come' || a.accion === 'arregla' ? 0.4 : 0);
      if (a.t > a.dur && !dormida && a.accion !== 'charla') decidir(a);
      else if (a.accion === 'charla' && !a.grupo) decidir(a);
    } else if (a.est === 'vuela') {
      a.prog = Math.min(1, a.prog + dt * 7 / (a.dVuelo + 6));
      const u = a.prog, e = u * u * (3 - 2 * u), p = a.perch;
      const lift = Math.min(1, Math.sin(u * Math.PI) * 2.2), base = a.oy + (p.y - a.oy) * e;
      a.x = a.ox + (a.tx - a.ox) * e; a.z = a.oz + (a.tz - a.oz) * e;
      a.y = base + Math.max(0, a.yc - base) * lift;
      a.y = Math.max(a.y, tope(a.x, a.z) + (u > 0.97 ? 0 : 0.25)); // nunca dentro de un edificio ni bajo el suelo
      a.ala = 1;
      if (u >= 1) posar(a);
    } else if (a.est === 'bandada') {
      const b = a.bando;
      if (!b) { a.est = 'posada'; a.t = 0; a.dur = rnd(2, 5); }
      else if (n || R.t > b.fin || b.aves.length < 2) { // se dispersan: de noche a dormir; de día cada una a una percha
        salirBando(a);
        if (n) return dormir(a);
        const L2 = perchas(), A2 = L2.alto.length ? L2.alto : L2.suelo;
        if (A2.length) return volarA(a, azar(A2), '');
        a.est = 'posada'; a.t = 0; a.dur = rnd(2, 6);
      } else {
        a.bAng += b.w * dt;
        a.bR += (b.r - a.bR) * Math.min(1, dt * 0.7); // espiral de entrada al anillo desde donde estaba
        const tx = b.cx + Math.cos(a.bAng) * a.bR, tz = b.cz + Math.sin(a.bAng) * a.bR;
        const ty = b.y0 + Math.sin(R.t * 0.8 + a.fase) * 1.4;
        const k = 1 - Math.exp(-dt * 2.6);
        a.x += (tx - a.x) * k; a.z += (tz - a.z) * k; a.y += (ty - a.y) * Math.min(1, dt * 1.6);
        a.y = Math.max(a.y, tope(a.x, a.z) + 1.1); // nunca bajo lo que haya justo debajo
        a.ala = 1; a.cab = 0;
        a.roll = 0.4 * (b.w > 0 ? 1 : -1) + Math.sin(R.t * 1.7 + a.fase) * 0.1; // se inclinan hacia el centro del círculo
      }
    } else if (a.est === 'juega') {
      const g = a.juego, p = g.p; g.t += a.lider ? dt : 0;
      const ang = g.ang + g.t * 1.8 - (a.lider ? 0 : 0.6), rr = 3.5 + Math.sin(g.t * 0.8) * 1.2;
      const tx = p.x + Math.cos(ang) * rr, tz = p.z + Math.sin(ang) * rr, ty = p.y + 2.5 + Math.sin(g.t * 2.2 + (a.lider ? 0 : 0.7)) * 1.2;
      const k = 1 - Math.exp(-dt * 3);
      a.x += (tx - a.x) * k; a.z += (tz - a.z) * k; a.y += (ty - a.y) * k;
      a.y = Math.max(a.y, tope(a.x, a.z) + 0.6); a.ala = 1;
      if (g.t > g.dur || n) { a.juego = null; a.est = 'posada'; a.accion = ''; volarA(a, p.tipo ? p : azar(perchas().alto), a.lider ? 'mira' : 'acicala'); }
    }
    if (a.est !== 'posada' && dt > 0) {
      a.vx = (a.x - ox) / dt; a.vy = (a.y - oy) / dt; a.vz = (a.z - oz) / dt;
      if (Math.hypot(a.vx, a.vz) > 0.3) a.yaw = Math.atan2(a.vx, a.vz);
      const vh = Math.hypot(a.vx, a.vz) || 1; a.pitch = Math.max(-0.5, Math.min(0.5, -Math.atan2(a.vy, vh) * 0.8)); // al subir o bajar en vertical, sin ponerse de pie
    }
  }

  // ---------- Paso: encendido por distancia, actualización por distancia a la cámara y dibujo ----------
  function quitar() {
    const E = G.bandada && G.bandada.EXTRA; if (!E) return;
    for (let i = E.length - 1; i >= 0; i--) if (E[i].ciudad) E.splice(i, 1);
  }
  function pintar() {
    const B = G.bandada; if (!B || !B.EXTRA) return 0;
    quitar();
    let n = 0;
    for (const a of R.aves) {
      if (a.lejos) continue;
      const posada = a.est === 'posada';
      const e = a.extra || (a.extra = { ciudad: 1 }); // objeto persistente: bandada solo lee campos en el cuadro (CG-67)
      e.x = a.x; e.y = a.y + (posada ? 0.13 * a.esc : 0); e.z = a.z; e.yaw = a.yaw; e.pitch = a.pitch; e.roll = a.roll || 0; e.esc = a.esc;
      e.c = a.k.c; e.a = a.k.a; e.cob = a.k.cob || 0; e.fase = a.fase; e.ala = a.ala; e.cab = posada ? a.cab : 0; e.gir = posada ? a.gir : 0;
      B.EXTRA.push(e);
      n++;
    }
    return n;
  }
  function paso(dt, forzar) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1); R.t += dt; R.cuadro++;
    const s = sitio();
    if (!s || !permitido() || !cuantas()) { if (R.on) { R.on = false; R.aves = []; } return 0; }
    const d = Math.hypot(S.pos.x - s.x, S.pos.z - s.z), quiere = forzar || d < ACTIVA + (R.on ? HIST : 0);
    if (!quiere) { if (R.on) { R.on = false; R.aves = []; } return 0; }
    if (!R.on || !R.aves.length) { R.on = true; poblar(); }
    R.chkT += dt; if (R.chkT > 10) { R.chkT = 0; if (G.solidos && R.verP !== G.solidos.version) R.P = null; } // llegan más edificios con el streaming
    const cam = G.renderer.camera.position;
    R.stats.cuadros++;
    for (const a of R.aves) {
      const dc = Math.hypot(a.x - cam.x, a.y - cam.y, a.z - cam.z);
      a.lejos = dc > ACTIVA + 40;
      let cada = LOD[LOD.length - 1][1];
      for (let li = 0; li < LOD.length; li++) if (dc < LOD[li][0]) { cada = LOD[li][1]; break; }
      a.cada = forzar === 'todo' ? 1 : cada;
      a.acum += dt;
      if ((R.cuadro + a.i) % a.cada === 0 || a.acum > 0.5) { pasoAve(a, Math.min(a.acum, 0.25)); a.acum = 0; R.stats.pasos++; }
    }
    return R.aves.length;
  }
  G.on('update', dt => { if (R.pausa) return; const n = paso(dt); if (n) pintar(); else if (R.aves.length === 0) quitar(); }, 87.5);
  // Para el álbum (residentes.js): las que están a menos de VER_R de Vittata
  const cerca = (px, py, pz) => R.aves.filter(a => Math.hypot(a.x - px, a.y - py, a.z - pz) < VER_R);

  // ---------- Prueba: AV.ciudadVivaTest() ----------
  async function test(o) {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, quiet0 = G.quiet, cal0 = nivel(), man0 = !!(G.renderer.calidad && G.renderer.calidad.manual), yaw0 = G.camara.yaw, Rd = G.renderer;
    const T = G.pruebas, Rs = () => G.residentes;
    R.pausa = true;
    try {
      const B = G.bandada;
      if (B && B.residentes) await B.residentes;
      check('La bandada presta sus dos mallas', !!(B && B.EXTRA && B.meshes && B.meshes.length === 2));
      const s = sitio();
      check('La Ciudad de los 36 está en el mapa', !!s, s ? Math.round(s.x) + ',' + Math.round(s.z) + ' r ' + Math.round(s.r) + ' · ' + s.ins.length + ' edificios' : 'sin poi');
      if (!s || !B) throw new Error('sin ciudad o sin bandada');
      // a la ciudad, con sus edificios y sus sólidos cargados
      const ST = G.mundo && G.mundo.streaming;
      // los edificios llegan con el streaming: se espera (como mucho o.espera s) a que la mitad tenga su sólido; las aves se prueban
      // contra los que ya están (sin GPU el streaming tarda varios minutos)
      const espera = (o && o.espera != null ? o.espera : 300) * 1000, t0 = performance.now(), dormir = ms => new Promise(r => setTimeout(r, ms));
      T.teleport(s.x + 16, s.z + 16); T.tick(0.1);
      if (ST && ST.alrededor) ST.alrededor(s.x, s.z).catch(() => {});
      const conSolido = () => { const so = SO(); return so ? s.ins.filter(i => so.altoEn(i.pos[0], i.pos[2], 1e4) > H(i.pos[0], i.pos[2]) + 0.3).length : 0; };
      while (performance.now() - t0 < espera && conSolido() < s.ins.length * 0.5) { await dormir(3000); if (G.solidos && G.solidos.terminar) G.solidos.terminar(); }
      if (G.solidos && G.solidos.terminar) G.solidos.terminar();
      check('Hay edificios con sólido para probar las aves', conSolido() >= 8, conSolido() + '/' + s.ins.length + ' con sólido en ' + Math.round((performance.now() - t0) / 1000) + ' s');
      R.prueba = true; R.horaPrueba = 12; R.P = null; R.sitio = null; sitio();
      if (Rd.setCalidad) Rd.setCalidad('alto', true); else Rd.calidad.nivel = 'alto';
      paso(0.05, true);
      const P = perchas();
      check('Hay tejados y balcones donde posarse', P.alto.length >= 6 && P.alto.filter(p => p.tipo === 'tejado').length >= 3,
        P.alto.length + ' altas (' + P.alto.filter(p => p.tipo === 'tejado').length + ' tejados, ' + P.alto.filter(p => p.tipo === 'balcon').length + ' balcones) · ' + P.suelo.length + ' en la plaza');
      check('Aparecen residentes en la ciudad (alto: ' + N.alto + ')', R.aves.length === N.alto && R.aves.every(a => Math.hypot(a.x - s.x, a.z - s.z) < s.r + 10), R.aves.length + ' aves');
      const sp = pool();
      check('Son de las especies de la colonia de la ciudad (ninguna extinta)', R.aves.every(a => sp.includes(a.sp)) && R.aves.every(a => a.sp !== 'martinicana' && a.sp !== 'violacea'), [...new Set(R.aves.map(a => a.sp))].join(','));
      // un día entero de rutinas, comprobando cada paso que nadie esté dentro de un edificio ni bajo el suelo
      const so = G.solidos, dentro = a => so && so.dentro ? so.dentro(a.x, a.z, a.y + 0.05) > a.y + 0.25 : false;
      let malSuelo = 0, malEdif = 0, peor = '';
      const vistos = {}, revisar = () => {
        for (const a of R.aves) {
          vistos[a.est === 'posada' ? a.accion : a.est] = 1;
          if (a.y < H(a.x, a.z) - 0.05) { malSuelo++; peor = a.est + '@' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ',' + a.z.toFixed(1); }
          if (dentro(a)) { malEdif++; peor = a.est + '/' + a.accion + '@' + a.x.toFixed(1) + ',' + a.y.toFixed(1) + ',' + a.z.toFixed(1) + ' tope ' + tope(a.x, a.z).toFixed(1); }
        }
      };
      for (let i = 0; i < 1800; i++) { paso(0.05, 'todo'); revisar(); }
      check('Vuelan de torre en torre', !!vistos.vuela);
      check('Rutinas de día: conversan, buscan comida, arreglan y juegan', vistos.charla && vistos.come && (vistos.arregla || vistos.recoge) && (vistos.juega || reducido()), Object.keys(vistos).join(','));
      check('De día cruzan el cielo de la ciudad en bandada', !!vistos.bandada, Object.keys(vistos).join(','));
      check('Nadie atraviesa el suelo', malSuelo === 0, malSuelo + ' ' + peor);
      check('Nadie atraviesa un edificio', malEdif === 0, malEdif + ' ' + peor);
      // de noche: a dormir en las perchas altas
      R.horaPrueba = 22;
      for (let i = 0; i < 900; i++) { paso(0.05, 'todo'); revisar(); }
      const duermen = R.aves.filter(a => a.est === 'posada' && (a.accion === 'duerme' || a.accion === 'vela'));
      check('De noche duermen en perchas (en alto)', duermen.length === R.aves.length && duermen.filter(a => a.accion === 'duerme').every(a => a.perch.tipo !== 'suelo' || !P.alto.length),
        duermen.length + '/' + R.aves.length + ' · ' + duermen.filter(a => a.accion === 'vela').length + ' junto a un farol');
      check('Y siguen sin atravesar nada de noche', malSuelo === 0 && malEdif === 0, malSuelo + '/' + malEdif + ' ' + peor);
      R.horaPrueba = 12;
      for (let i = 0; i < 200; i++) paso(0.05, 'todo');
      check('Al amanecer vuelven a sus cosas', R.aves.some(a => a.accion !== 'duerme'), R.aves.filter(a => a.accion === 'duerme').length + ' aún dormidas');
      // calidad: menos en medio y en bajo
      const cuenta = c => { Rd.calidad.nivel = c; G.emit('calidad', Rd.calidad); return R.aves.length; };
      const nm = cuenta('medio'), nb = cuenta('bajo'), na = cuenta('alto');
      check('Menos cotorras con menos calidad: bajo ' + N.bajo + ', medio ' + N.medio + ', alto ' + N.alto, nb === N.bajo && nm === N.medio && na === N.alto, 'bajo ' + nb + ' · medio ' + nm + ' · alto ' + na);
      // actualización por distancia: de cerca cada cuadro, lejos cada 6
      const ritmo = () => { R.stats.pasos = 0; R.stats.cuadros = 0; for (let i = 0; i < 60; i++) paso(1 / 60); return R.stats.pasos / Math.max(1, R.stats.cuadros) / R.aves.length; };
      G.camara.place(true);
      const cam = Rd.camera.position, c0 = cam.clone();
      const rCerca = ritmo();
      cam.set(s.x + 150, cam.y + 60, s.z + 150); const rLejos = ritmo(); cam.copy(c0);
      check('Lejos de la cámara se actualizan menos', rLejos < rCerca * 0.5 && rLejos <= 0.34, 'pasos por ave y cuadro: cerca ' + rCerca.toFixed(2) + ' · lejos ' + rLejos.toFixed(2));
      // draw calls y triángulos en la ciudad: sin cotorras, antes (solo los residentes de residentes.js) y después (+ la ciudad viva)
      // Asentar antes del recuento: las bandas :lod/:sombra de la flora se crean perezosas en cuadros reales
      // (KIMI-035/110-mem), así que sin esta pausa el nº de hijos de la escena varía por la flora, no por las cotorras.
      if (ST && ST.terminar) { await ST.terminar().catch(() => {}); await dormir(3000); if (ST && ST.terminar) await ST.terminar().catch(() => {}); }
      // El mundo sigue vivo durante la prueba: el streaming funde/suelta lotes y zonas (^edificios*) y los fx de agua crean
      // mallas anónimas transitorias (se autoclean); ninguna es de las cotorras. Se excluyen del recuento (mismo criterio
      // que las bandas perezosas ^flora: de KIMI-044); este check vigila que la ciudad viva no cree mallas nuevas.
      const floraLazy = o => /^flora:/.test(o.name || ''), churn = o => /^edificios/.test(o.name || '') || !(o.name || '');
      const sc = Rd.scene, info = Rd.renderer.info, hijos = sc.children.filter(o => !floraLazy(o) && !churn(o)).length;
      const medir = () => { G.camara.place(true); Rd.renderer.render(sc, Rd.camera); return { c: info.render.calls, t: info.render.triangles }; };
      if (B.terminar) B.terminar();
      T.teleport(s.x + 22, s.z + 22); T.tick(0.05);
      if (AV && AV.debug && AV.debug.camYaw) AV.debug.camYaw(Math.atan2(22, 22));
      const res = Rs() && Rs().colonias ? Rs().colonias().find(c => c.id === 'ciudad36') : null, medidas = [];
      let okDC = true;
      for (const cal of ['medio', 'alto']) {
        if (Rd.setCalidad) Rd.setCalidad(cal, true); else Rd.calidad.nivel = cal;
        ajustar(); paso(0.05, 'todo');
        quitar(); B.EXTRA.length = 0; B.dibujar(); const sin = medir();
        if (res && Rs().poblar) { Rs().prueba(true); Rs().poblar(res, Rs().N[cal]); for (const a of res.aves) B.EXTRA.push({ x: a.x, y: a.y, z: a.z, yaw: a.yaw, pitch: 0, roll: 0, esc: a.esc, c: a.k.c, a: a.k.a, cob: a.k.cob, fase: 0, ala: 0, cab: 0, gir: 0 }); }
        B.dibujar(); const antes = medir();
        pintar(); B.dibujar(); const despues = medir();
        if (!(despues.c - sin.c <= 2 && despues.c - antes.c <= 2)) okDC = false;
        medidas.push(cal + ': sin cotorras ' + sin.c + ' calls/' + sin.t + ' tris · antes (' + (res ? res.aves.length : 0) + ' residentes) ' + antes.c + '/' + antes.t +
          ' · después (+' + R.aves.length + ' de la ciudad viva) ' + despues.c + '/' + despues.t + ' (+' + (despues.c - antes.c) + ' calls, +' + (despues.t - antes.t) + ' tris)');
      }
      if (ST && ST.terminar) { await ST.terminar().catch(() => {}); await dormir(3000); if (ST && ST.terminar) await ST.terminar().catch(() => {}); } // mismo estado asentado (y sin bandas de flora perezosas a medias) que al capturar «hijos»
      check('Antes y después en la ciudad: 2 draw calls extra o menos', okDC, medidas.join(' || '));
      check('No se crea ninguna malla nueva', sc.children.filter(o => !floraLazy(o) && !churn(o)).length === hijos && B.meshes.every(m => m.isInstancedMesh && !m.castShadow));
      check('Caben en las mallas de la bandada', B.MAXN >= 20 + 26 + N.alto, 'MAXN ' + B.MAXN);
      // fuera de rango: apagadas
      R.prueba = true; T.teleport(s.x + 260, s.z + 260); T.tick(0.05); paso(0.05);
      check('Fuera de rango se apagan (sin trabajo ni dibujo)', R.aves.length === 0 && !R.on);
      T.teleport(s.x + 16, s.z + 16); T.tick(0.05);
      R.prueba = false; G.quiet = true; paso(0.05);
      check('Con G.quiet (baterías) no salen', R.aves.length === 0);
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 500));
    } finally {
      R.prueba = false; R.pausa = false; R.horaPrueba = null; G.quiet = quiet0; R.aves = []; R.on = false;
      if (Rs() && Rs().prueba) { Rs().prueba(false); if (Rs().reiniciar) Rs().reiniciar(); }
      if (Rd.setCalidad) { Rd.setCalidad(cal0); Rd.calidad.manual = man0; } else Rd.calidad.nivel = cal0;
      T.teleport(pos0.x, pos0.z); S.pos.y = pos0.y; G.camara.yaw = yaw0;
      quitar(); if (G.bandada && G.bandada.dibujar) G.bandada.dibujar();
    }
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  const api = { N, paso, pintar, perchas, sitio, aves: () => R.aves, cerca, test, noche,
    prueba: on => { R.prueba = !!on; }, hora: h => { R.horaPrueba = h; }, pausa: v => { R.pausa = !!v; }, stats: () => R.stats };
  G.ciudadViva = api;
  if (window.AV) window.AV.ciudadVivaTest = o => Promise.resolve(api.test(o));
  return api;
};
