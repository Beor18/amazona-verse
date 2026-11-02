/* Juego · Cotorras residentes («Mundo vivo», etapas 1 y 1.5; DIVERSION_CAP1 § 3 mejora 10)
   Cotorras viven alrededor de 9 lugares del mapa real. Cada lugar tiene un hábitat y cada hábitat sus especies, con la lógica
   geográfica de docs/equipo/MUNDO_VIVO_ECOLOGIA.md (HAB y DEF abajo; pack.residentes.colonias lo cambia). Nada al azar entre las 34:
   - la plaza de Villa Raíz es de las cotorras puertorriqueñas (vittata) y nada más;
   - la Ciudad de los 36 tiene el bosque nublado de las Antillas (con vittata); solo en el cap. 6 y después del pacto (PactRenewed,
     o el cap. 6 terminado en el registro de temporada) es la colonia mezclada de las 36 vivas, porque los guardianes llegaron;
   - las extintas (martinicana, violacea) nunca están en un hábitat: no salen vivas en el mundo.
   Entre las 9 colonias están las 34 especies vivas, así que el Álbum de las 36 se puede llenar en el cap. 1.
   Cada ave es una máquina de estados sencilla:
   - posada (copa, rama, techo o suelo) con acciones: mira, se acicala, llama (otra le contesta), come (fruta de la copa o el suelo);
   - vuela de una percha a otra en arco y aterriza; a veces baja a comer al suelo en grupo (1 o 2 la siguen) o a una copa con fruta;
   - en pareja: dos se posan juntas, se miran y se acicalan una a la otra;
   - persigue: dos se persiguen en círculos y vuelven a posarse (no con «reducir movimiento»);
   - bandadita: de vez en cuando 4 a 8 de una colonia vuelan juntas a otra colonia vecina del mismo tipo de hábitat (tierras bajas,
     montaña o seco), se posan allí 15–25 s y vuelven a casa; al llegar se quedan hasta que Vittata no las ve y se apagan;
   - reacciona a Vittata: a menos de 10 m la mira; si Vittata se posa a menos de 2,2 m, se aparta de un salto o se va volando;
     si Vittata hace el gesto «Saludar» cerca, 1 a 3 la siguen unos 8 s y vuelven a su sitio.
   Ver una de cerca (menos de 8 m durante 2 s) abre su tarjeta del Álbum de las 36 (src/game/album.js, G.album.ver); también las
   de la bandada (bandada.js) cuando pasa o se posa cerca. La bandada elige sus especies con especiesEn(x, z): las del hábitat del
   lugar al que va (o por donde pasa).
   - Rendimiento: no hay mallas propias. Se dibujan en las dos mallas instanciadas de la bandada (bandada.js EXTRA): la bandada y
     los residentes juntos son 2 draw calls. Solo viven las colonias a menos de 130 m (las 3 más cercanas): bajo 0, medio 4 y
     alto 6 por colonia, más una bandadita (medio 4–5, alto 6–8; bajo ninguna). CPU: unas cuentas por ave y cuadro.
   - Nada en las baterías (G.quiet) ni antes de crear el personaje; la prueba lo enciende con prueba(true).
   - Sonido: una llamada corta sintetizada ('cotorra', G.audio.define), más suave con la distancia; nunca en G.quiet.
   Se carga desde bandada.js: window.AVResidentes(G, B) → G.residentes. Prueba: AV.vivoTest() (src/game/album.js). */
window.AVResidentes = function (G, B) {
  'use strict';
  if (G.residentes) return G.residentes;
  const S = G.S, M = G.fisica.MOVE, H = (x, z) => G.terreno.height(x, z);
  const N = { bajo: 0, medio: 4, alto: 6 };
  const VIS_N = { bajo: [0, 0], medio: [4, 5], alto: [6, 8] };
  const ACTIVA = 130, MAX_COL = 3, VER_R = 8, VER_T = 2, MIRA_R = 10, ESPANTA = 2.2, SALUDO_R = 25, ESC = 1.35;
  const VIS_MIN = 25, VIS_MAX = 170, VIS_CADA = [22, 45], VIS_VELO = 10;
  // Hábitats (docs/equipo/MUNDO_VIVO_ECOLOGIA.md). familia: las bandaditas solo viajan entre colonias de la misma familia.
  const HAB = {
    casa:      { familia: 'baja', sp: ['vittata'] },                                                           // Puerto Rico
    rio:       { familia: 'baja', sp: ['festiva', 'kawalli', 'amazonica', 'ochrocephala', 'diadema', 'farinosa'] }, // várzea y selva de río
    humedo:    { familia: 'baja', sp: ['autumnalis', 'guatemalae', 'dufresniana', 'oratrix'] },                // selva baja húmeda y manglar
    atlantico: { familia: 'baja', sp: ['rhodocorytha', 'brasiliensis', 'vinacea', 'pretrei'] },                // Mata Atlántica
    nublado:   { familia: 'montana', sp: ['vittata', 'imperialis', 'arausiaca', 'guildingii', 'versicolor'] }, // bosque montano de las Antillas
    andes:     { familia: 'montana', sp: ['mercenarius', 'tucumana'] },                                         // bosque montano andino (yungas)
    antillas:  { familia: 'montana', sp: ['ventralis', 'leucocephala', 'agilis', 'collaria'] },                // bosques de las Antillas Mayores
    seco:      { familia: 'seca', sp: ['albifrons', 'auropalliata', 'xantholora', 'finschi', 'viridigenalis', 'tresmariae'] }, // bosque seco de México y Centroamérica
    sabana:    { familia: 'seca', sp: ['aestiva', 'barbadensis', 'lilacina'] },                                // cerrado, chaco y matorral seco de Sudamérica
    pacto:     { familia: 'montana', sp: null },                                                                // las 34 vivas: los guardianes del pacto
  };
  const DEF = [
    { id: 'plaza', poi: 'plaza', r: 24, hab: 'casa', fijas: ['vittata', 'vittata'] }, // Villa Raíz: cotorras puertorriqueñas en casa
    { id: 'rio', poi: 'rio_terrenoA', r: 22, hab: 'rio' },
    { id: 'poza', poi: 'poza_honda', r: 20, hab: 'humedo' },
    { id: 'dajao', poi: 'poza_dajao', r: 20, hab: 'atlantico' },
    { id: 'ciudad36', poi: 'kelvin_ruinas_yunque', r: 30, hab: 'nublado', pacto: true, fijas: ['vittata'] }, // tras el pacto: las 36
    { id: 'nubes', poi: 'charca_nubes', r: 22, hab: 'andes' },
    { id: 'puerta', poi: 'kelvin_aldea_yunque', r: 24, hab: 'antillas' },
    { id: 'colina', poi: 'kelvin_aldea_colina', r: 24, hab: 'seco' },
    { id: 'hacienda', poi: 'ruinas', r: 24, hab: 'sabana' },
  ];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const nivel = () => (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
  const porColonia = () => (N[nivel()] != null ? N[nivel()] : N.medio);
  const reducido = () => !!(G.renderer && G.renderer.REDUCED);
  const R = { prueba: false, cols: null, t: 0, verT: 0, acum: {}, saludo: false, llamaT: 0, vis: null, visEn: rnd(VIS_CADA[0], VIS_CADA[1]), pactoPrueba: null };
  const permitido = () => R.prueba || (!G.quiet && !!(S.profile && S.profile.created));
  const angDif = (a, b) => { let d = (b - a) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };
  const azar = l => l[Math.floor(Math.random() * l.length)];

  // ---------- El pacto de los 36: en el cap. 6 y después ----------
  function pacto() {
    if (R.pactoPrueba != null) return R.pactoPrueba;
    try { if (G.eventos && G.eventos.had && G.eventos.had('PactRenewed')) return true; } catch (e) { /* sin eventos */ }
    if (G.pack && G.pack.meta && G.pack.meta.capitulo === 6) return true; // los guardianes llegan a la Ciudad para el pacto
    try { const T = window.AVTemporada, d = T && T.leer(); return !!(d && d.terminados && d.terminados[6]); } catch (e) { return false; }
  }

  // ---------- Colonias (de los lugares del mapa) y sus especies ----------
  function colonias() {
    if (R.cols && R.cols.length) return R.cols;
    const P = (G.terreno && G.terreno.pois) || {}, lista = (G.pack.residentes && G.pack.residentes.colonias) || DEF;
    R.cols = lista.filter(c => P[c.poi] && typeof P[c.poi].x === 'number').map(c => ({ id: c.id, x: P[c.poi].x, z: P[c.poi].z, r: c.r || 22,
      hab: HAB[c.hab] ? c.hab : 'casa', pacto: !!c.pacto, fijas: c.fijas || [], aves: [], P: null }));
    return R.cols;
  }
  const vivas = () => { const E = window.AV_ESPECIES; return (E && E.especies ? E.especies.map(e => e.id) : []).filter(id => G.album && G.album.colores(id)); };
  const habitatDe = col => (col.pacto && pacto() ? 'pacto' : col.hab);
  function poolHab(h) { const v = vivas(), sp = HAB[h] && HAB[h].sp; return sp ? sp.filter(id => v.includes(id)) : v; }
  const poolDe = col => poolHab(habitatDe(col));
  // Especies del lugar más cercano a (x, z): lo usa la bandada para viajar con las especies del hábitat (sin colonias: vittata)
  function especiesEn(x, z) {
    let mejor = null, d0 = 1e9;
    for (const c of colonias()) { const d = Math.hypot(c.x - x, c.z - z); if (d < d0) { d0 = d; mejor = c; } }
    const p = mejor ? poolDe(mejor) : [];
    return p.length ? p : vivas().filter(id => id === 'vittata');
  }
  function elegirDe(pool, n, fijas, distintas, evitar) {
    const vistas = Array.isArray(S.album) ? S.album : [], out = (fijas || []).filter(id => pool.includes(id)).slice(0, n);
    while (out.length < n && pool.length) {
      let cand = pool.filter(id => !(evitar && evitar.has(id)) && !(distintas && out.includes(id)));
      if (!cand.length) cand = pool;
      const nuevas = cand.filter(id => !vistas.includes(id) && !out.includes(id));
      if (!distintas && out.length && Math.random() < 0.3) { out.push(out[out.length - 1]); continue; } // parejas de la misma especie
      out.push(azar(nuevas.length && Math.random() < 0.65 ? nuevas : cand)); // así el álbum se puede llenar
    }
    return out;
  }
  function elegirEspecies(col, n) {
    const mixta = habitatDe(col) === 'pacto', usadas = new Set();
    if (mixta) for (const c of R.cols || []) if (c !== col) for (const a of c.aves) usadas.add(a.sp);
    return elegirDe(poolDe(col), n, col.fijas, mixta, mixta ? usadas : null);
  }
  function perchasDe(col) {
    if (!col.P || !col.P.length) col.P = B.perchas(col.x, col.z, col.r, 14, { semilla: col.x * 0.01 });
    return col.P;
  }
  const altas = col => perchasDe(col).filter(p => p.tipo !== 'suelo');
  const suelos = col => perchasDe(col).filter(p => p.tipo === 'suelo');

  function nuevaAve(col, sp, i, llega) {
    const k = B.colorDe(sp) || { c: new THREE.Color(0.2, 0.5, 0.1), a: new THREE.Color(0.2, 0.5, 0.1), cob: 0 };
    const P = perchasDe(col), p = P.length ? P[(i * 5 + Math.floor(Math.random() * 3)) % P.length] : { x: col.x, z: col.z, y: H(col.x, col.z), tipo: 'suelo' };
    const a = { colonia: col.id, col, sp, k, x: p.x, y: p.y, z: p.z, yaw: rnd(0, 6.28), est: 'posada', accion: '', t: 0, dur: rnd(3, 8), perch: p,
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
  function reiniciar() { for (const c of colonias()) { c.aves = []; c.P = null; } R.vis = null; R.visEn = R.t + rnd(VIS_CADA[0], VIS_CADA[1]); R.acum = {}; B.EXTRA.length = 0; }
  function alCalidad() { const n = porColonia(); for (const c of colonias()) if (c.aves.length) { if (n === 0) c.aves = []; else ajustar(c, n); } if (n === 0) R.vis = null; }
  G.on('calidad', alCalidad);
  G.on('apply', () => reiniciar(), 91);

  // ---------- Estados ----------
  function volarA(a, p, alLlegar) {
    a.est = 'vuela'; a.accion = ''; a.ox = a.x; a.oy = a.y; a.oz = a.z; a.perch = p; a.prog = 0; a.alLlegar = alLlegar || '';
    a.dVuelo = Math.max(3, Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z)); a.ala = 1; a.cab = 0; a.gir = 0; a.espera = 0;
  }
  function posar(a, p) {
    a.est = 'posada'; a.perch = p; a.x = p.x; a.y = p.y; a.z = p.z; a.t = 0; a.dur = rnd(3, 8); a.prox = rnd(0.4, 1.5);
    a.accion = a.alLlegar || (p.tipo === 'suelo' || p.tipo === 'copa' ? 'come' : 'mira'); a.alLlegar = ''; a.vx = a.vy = a.vz = 0;
    if (a.accion === 'pareja' && a.compa) { a.dur = rnd(6, 9); a.prox = a.dur; a.yaw = Math.atan2(a.compa.perch.x - p.x, a.compa.perch.z - p.z); }
    else { a.compa = null; if (a.accion === 'pareja') a.accion = 'mira'; }
  }
  function forzar(a, est, tipo) { // para la prueba: posada en una percha (tipo 'suelo' la baja al suelo)
    const col = a.col, l = tipo === 'suelo' ? suelos(col) : altas(col);
    const p = l.length ? azar(l) : { x: a.x, y: H(a.x, a.z), z: a.z, tipo: 'suelo' };
    a.compa = null; a.alLlegar = ''; posar(a, tipo === 'suelo' && !l.length ? Object.assign(p, { tipo: 'suelo' }) : p); a.dur = 8; a.t = 0;
  }
  const libre = (x, a) => x !== a && x.est === 'posada' && x.t > 2.5 && !x.compa && !x.espera && !(x.vis && x.vis.fase !== 'posada');
  // Bajan a comer al suelo en grupo: la primera va y 1 o 2 la siguen un poco después, a su lado
  function grupoAlSuelo(a, Sx) {
    const p = azar(Sx.filter(q => q !== a.perch).length ? Sx.filter(q => q !== a.perch) : Sx);
    volarA(a, p, 'come');
    const A = G.agua, compas = a.col.aves.filter(x => libre(x, a)).slice(0, 1 + Math.floor(Math.random() * 2));
    for (const b of compas) {
      const ang = rnd(0, 6.28), r = rnd(0.5, 1.1), x = p.x + Math.cos(ang) * r, z = p.z + Math.sin(ang) * r, h = H(x, z);
      if (A && A.levelAt && A.levelAt(x, z) > h - 0.05) continue;
      b.pend = { x, z, y: h, tipo: 'suelo' }; b.espera = rnd(0.3, 1.2);
    }
    return compas.length;
  }
  // Pareja: dos se posan juntas, se miran y se acicalan
  function pareja(a, A) {
    const b = a.col.aves.find(x => libre(x, a));
    if (!b || !A.length) return false;
    const q = a.perch && a.perch.tipo !== 'suelo' ? a.perch : azar(A), ang = rnd(0, 3.14), dx = Math.cos(ang) * 0.2, dz = Math.sin(ang) * 0.2;
    a.compa = b; b.compa = a;
    volarA(a, { x: q.x + dx, y: q.y, z: q.z + dz, tipo: q.tipo }, 'pareja');
    volarA(b, { x: q.x - dx, y: q.y, z: q.z - dz, tipo: q.tipo }, 'pareja');
    return true;
  }
  function decidir(a) {
    const col = a.col, r = Math.random(), A = altas(col), Sx = suelos(col);
    if (a.compa) { const b = a.compa; a.compa = null; if (b.compa === a) b.compa = null; }
    const otra = l => { const o = l.filter(p => p !== a.perch); return azar(o.length ? o : l); };
    const copas = A.filter(p => p.tipo === 'copa');
    if (r < 0.3 && A.length) { const p = otra(copas.length && Math.random() < 0.6 ? copas : A); return volarA(a, p, p.tipo === 'copa' ? 'come' : ''); }
    if (r < 0.52 && Sx.length) { grupoAlSuelo(a, Sx); return; }
    if (r < 0.66 && pareja(a, A)) return;
    if (r < 0.8 && !reducido()) {
      const b = col.aves.find(x => libre(x, a));
      if (b) { a.est = b.est = 'persigue'; a.t = b.t = 0; a.dur = b.dur = rnd(6, 9); a.lider = true; b.lider = false; a.pareja = b; b.pareja = a; a.ang0 = b.ang0 = rnd(0, 6.28); a.ala = b.ala = 1; return; }
    }
    a.t = 0; a.dur = rnd(3, 7);
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
    if (a.accion === 'pareja' && a.compa) { a.prox = 1; return; }
    const suelo = a.perch && a.perch.tipo === 'suelo', copa = a.perch && a.perch.tipo === 'copa', r = Math.random();
    const L = suelo ? [['come', 0.55], ['mira', 0.8], ['acicala', 0.9], ['llama', 1]]
      : copa ? [['come', 0.5], ['mira', 0.7], ['acicala', 0.85], ['llama', 1]] : [['mira', 0.35], ['acicala', 0.6], ['come', 0.8], ['llama', 1]];
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
      if (a.espera) { a.espera -= dt; if (a.espera <= 0) { a.espera = 0; const p = a.pend; a.pend = null; if (p) { volarA(a, p, 'come'); return; } } }
      if (a.llamaEn >= 0) { a.llamaEn -= dt; if (a.llamaEn < 0) { a.llamaEn = -1; llamar(a, true); } }
      a.prox -= dt; if (a.prox <= 0) accionNueva(a);
      const enPareja = a.accion === 'pareja' && a.compa && a.compa.est === 'posada';
      // Vittata cerca: la mira; si se posa encima, se aparta
      const quieta = !M.flying || M.grounded || !!M.posado;
      if (dH < ESPANTA && Math.abs(dy) < 1.5 && quieta) {
        if (a.compa) { const b = a.compa; a.compa = null; if (b.compa === a) b.compa = null; }
        if (a.perch && a.perch.tipo === 'suelo') {
          const h = dH || 1, x = a.x - dx / h * 1.9, z = a.z - dz / h * 1.9;
          a.est = 'salta'; a.ox = a.x; a.oy = a.y; a.oz = a.z; a.prog = 0; a.perch = { x, z, y: H(x, z), tipo: 'suelo' }; a.yaw = Math.atan2(-dx, -dz);
        } else {
          const A = altas(a.col).filter(p => Math.hypot(p.x - px, p.z - pz) > 6);
          volarA(a, A.length ? azar(A) : { x: a.x - dx * 4, z: a.z - dz * 4, y: H(a.x - dx * 4, a.z - dz * 4), tipo: 'suelo' });
        }
      } else if (dH < MIRA_R && Math.abs(dy) < 6 && !enPareja) {
        const quiere = Math.atan2(dx, dz), d = angDif(a.yaw, quiere);
        if (Math.abs(d) > 1.2) a.yaw += Math.sign(d) * Math.min(Math.abs(d) - 1.2, dt * 1.6);
        a.giroObj = Math.max(-1.3, Math.min(1.3, angDif(a.yaw, quiere)));
        if (a.accion === 'acicala' || a.accion === 'come' || a.accion === 'pareja') a.accion = 'mira';
        if (a.t > a.dur * 1.6) decidir(a); // mira un rato y sigue con lo suyo
      } else if (a.t > a.dur && !(a.vis && a.vis.fase === 'posada' && a.vis.t > a.vis.dur)) decidir(a);
      if (enPareja && a.compa && a.est === 'posada') { // se miran y se acicalan una a la otra
        const b = a.compa, quiere = Math.atan2(b.x - a.x, b.z - a.z), d = angDif(a.yaw, quiere);
        a.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 2);
        a.giroObj = Math.max(-1.2, Math.min(1.2, angDif(a.yaw, quiere))) + Math.sin(R.t * 2.3 + a.fase) * 0.35;
      }
      a.gir += (a.giroObj - a.gir) * Math.min(1, dt * 6);
      a.cab = a.accion === 'come' ? 0.45 + Math.max(0, Math.sin(R.t * 9 + a.fase)) * 0.6
        : a.accion === 'acicala' ? 0.35 + Math.sin(R.t * 11 + a.fase) * 0.2
          : a.accion === 'pareja' ? 0.25 + Math.max(0, Math.sin(R.t * 5 + a.fase)) * 0.35
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
      a.x += (tx - a.x) * k; a.z += (tz - a.z) * k; a.y += (ty - a.y) * k; a.y = Math.max(a.y, H(a.x, a.z) + 0.6); a.ala = 1;
      if (a.t > a.dur || Math.hypot(px - a.col.x, pz - a.col.z) > a.col.r + 45) { const A = altas(a.col); volarA(a, A.length ? azar(A) : azar(perchasDe(a.col))); }
    } else if (a.est === 'bandadita') { // en formación tras el guía de la bandadita
      const L = a.vis.L, k = 1 - Math.exp(-dt * 2.4), h = Math.hypot(L.vx, L.vz) || 1, fx = L.vx / h, fz = L.vz / h;
      const tx = L.x - fz * a.lado - fx * a.atras, tz = L.z + fx * a.lado - fz * a.atras, ty = L.y + a.arriba + Math.sin(R.t * 1.3 + a.fase) * 0.4;
      a.x += (tx - a.x) * k; a.z += (tz - a.z) * k; a.y += (ty - a.y) * k; a.y = Math.max(a.y, H(a.x, a.z) + 2); a.ala = 1;
    }
    if (a.est !== 'posada' && a.est !== 'salta' && dt > 0) {
      a.vx = (a.x - ox) / dt; a.vy = (a.y - oy) / dt; a.vz = (a.z - oz) / dt;
      if (Math.hypot(a.vx, a.vz) > 0.3) a.yaw = Math.atan2(a.vx, a.vz);
    }
  }
  // «Saludar» cerca: las 1 a 3 más cercanas la siguen un rato
  function saludo() {
    const cand = [];
    for (const a of aves()) { const d = Math.hypot(a.x - S.pos.x, a.z - S.pos.z); if (d < SALUDO_R && a.est !== 'sigue' && !a.vis) cand.push([d, a]); }
    cand.sort((p, q) => p[0] - q[0]);
    const n = Math.min(cand.length, 1 + Math.floor(Math.random() * 3));
    for (let i = 0; i < n; i++) { const a = cand[i][1]; if (a.compa) { a.compa.compa = null; a.compa = null; } a.espera = 0; a.pend = null; a.est = 'sigue'; a.t = 0; a.dur = rnd(7, 9); a.sigA = Math.atan2(a.z - S.pos.z, a.x - S.pos.x); a.accion = ''; a.ala = 1; }
    return n;
  }

  // ---------- Bandadita: 4 a 8 vuelan de una colonia a otra vecina del mismo tipo de hábitat, se posan y vuelven ----------
  const familia = col => HAB[habitatDe(col)].familia;
  function visitar(o) {
    o = o || {};
    const rango = VIS_N[nivel()] || VIS_N.medio;
    if (R.vis || !rango[1]) return false;
    const act = colonias().filter(c => c.aves.length), pares = [];
    for (const A of act) for (const Bc of act) {
      if (A === Bc || familia(A) !== familia(Bc)) continue;
      const d = Math.hypot(A.x - Bc.x, A.z - Bc.z); if (d > VIS_MIN && d < VIS_MAX) pares.push([A, Bc]);
    }
    const par = o.de && o.a ? pares.find(p => p[0].id === o.de && p[1].id === o.a) : azar(pares);
    if (!par) return false;
    const [A, Bc] = par, n = Math.round(rnd(rango[0], rango[1] + 0.49)), sp = elegirDe(poolDe(A), n, null, false, null);
    const L = { x: A.x, z: A.z, y: H(A.x, A.z) + 10, vx: Bc.x - A.x, vz: Bc.z - A.z };
    const V = R.vis = { de: A, a: Bc, fase: 'ida', t: 0, dur: rnd(15, 25), L, aves: [] };
    sp.forEach((s, i) => {
      const a = nuevaAve(Bc, s, i, false), fila = 1 + Math.floor(i / 2);
      a.colonia = Bc.id; a.vis = V; a.est = 'bandadita'; a.lado = (i % 2 ? 1 : -1) * (fila * 1.3 + rnd(-0.4, 0.4)); a.atras = fila * 1.2 + rnd(-0.4, 0.4); a.arriba = rnd(-0.8, 0.8);
      a.x = L.x - a.lado * 0.1; a.z = L.z; a.y = L.y + a.arriba; a.ala = 1; a.de = A.id;
      V.aves.push(a);
    });
    return true;
  }
  function moverGuia(V, dest, dt) {
    const L = V.L, dx = dest.x - L.x, dz = dest.z - L.z, d = Math.hypot(dx, dz) || 1, v = Math.min(VIS_VELO, 2 + d * 0.5), k = Math.min(1, dt * 1.5);
    L.vx += (dx / d * v - L.vx) * k; L.vz += (dz / d * v - L.vz) * k; L.x += L.vx * dt; L.z += L.vz * dt;
    const yObj = Math.max(H(L.x, L.z), H(dest.x, dest.z)) + (d < 25 ? 6 + d * 0.2 : 11);
    L.y += (yObj - L.y) * Math.min(1, dt * 1.2); L.y = Math.max(L.y, H(L.x, L.z) + 3);
    return d;
  }
  function pasoVisita(dt, cerca) {
    const V = R.vis; if (!V) return;
    V.t += dt;
    if (!cerca.includes(V.de) && !cerca.includes(V.a)) { R.vis = null; return; }
    if (V.fase === 'ida') {
      if (moverGuia(V, V.a, dt) < 12) {
        const A = altas(V.a), P = A.length ? A : perchasDe(V.a);
        V.aves.forEach((a, i) => volarA(a, P.length ? P[(i * 3 + 1) % P.length] : { x: V.a.x, z: V.a.z, y: H(V.a.x, V.a.z), tipo: 'suelo' }, 'mira'));
        V.fase = 'posada'; V.t = 0;
      }
    } else if (V.fase === 'posada') {
      if (V.t > V.dur && V.aves.every(a => a.est === 'posada' || a.est === 'vuela')) { // despegan juntas hacia casa
        let x = 0, z = 0, y = 0; for (const a of V.aves) { x += a.x; z += a.z; y += a.y; if (a.compa) { a.compa.compa = null; a.compa = null; } a.est = 'bandadita'; a.espera = 0; a.pend = null; }
        const n = V.aves.length || 1; V.L = { x: x / n, z: z / n, y: y / n + 3, vx: V.de.x - x / n, vz: V.de.z - z / n }; V.fase = 'vuelta'; V.t = 0;
      }
    } else if (V.fase === 'vuelta') {
      if (moverGuia(V, V.de, dt) < 12) {
        const A = altas(V.de), P = A.length ? A : perchasDe(V.de);
        V.aves.forEach((a, i) => { a.col = V.de; a.colonia = V.de.id; volarA(a, P.length ? P[(i * 5 + 2) % P.length] : { x: V.de.x, z: V.de.z, y: H(V.de.x, V.de.z), tipo: 'suelo' }); });
        V.fase = 'llega'; V.t = 0;
      }
    } else if (V.fase === 'llega') { // ya en casa: se apagan cuando Vittata no las ve (lejos o a su espalda)
      const cam = G.renderer.camera, f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      V.aves = V.aves.filter(a => {
        if (a.est === 'vuela') return true;
        const dx = a.x - cam.position.x, dy = a.y - cam.position.y, dz = a.z - cam.position.z, d = Math.hypot(dx, dy, dz);
        return !(d > 45 || (dx * f.x + dy * f.y + dz * f.z) < 0 || V.t > 90);
      });
      if (!V.aves.length) R.vis = null;
    }
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
    if (!n) R.vis = null;
    else if (!R.vis && R.t >= R.visEn) { R.visEn = R.t + rnd(VIS_CADA[0], VIS_CADA[1]); visitar(); }
    pasoVisita(dt, cerca);
    const em = G.actores && G.actores.emote, sal = !!(em && em.name === 'saludar');
    if (sal && !R.saludo && n) saludo();
    R.saludo = sal;
    lista.length = 0;
    for (const c of cols) for (const a of c.aves) { pasoAve(a, dt); lista.push(a); }
    if (R.vis) for (const a of R.vis.aves) { pasoAve(a, dt); lista.push(a); }
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

  function aves() { const o = []; for (const c of colonias()) o.push(...c.aves); if (R.vis) o.push(...R.vis.aves); return o; }
  const giroHacia = (a, p) => angDif(a.yaw + a.gir, Math.atan2(p.x - a.x, p.z - a.z));
  G.residentes = { N, VIS_N, HAB, colonias, aves, paso, reiniciar, forzar, giroHacia, alCalidad, reducido, saludo, visitar, especiesEn, poolDe, habitatDe, pacto,
    poblar: (col, n) => activar(col, n), visita: () => R.vis,
    prueba: on => { R.prueba = !!on; if (!on) R.pactoPrueba = null; }, pactoPrueba: v => { R.pactoPrueba = v; },
    olvidar: () => { R.acum = {}; R.verT = 0; }, estado: () => ({ aves: aves().length, colonias: colonias().filter(c => c.aves.length).map(c => c.id), visita: R.vis ? R.vis.de.id + '→' + R.vis.a.id + ' ' + R.vis.fase : null }) };
  return G.residentes;
};
