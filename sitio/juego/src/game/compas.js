/* Juego · F2-3 · «Alas al compás» (minijuego corto de «Más juegos», unos 90 segundos). Diseño: docs/diseno/F2_MINIJUEGOS.md §3.
   Aletea justo cuando suena el tambor: las hojas llegan desde la derecha hasta el círculo que hay debajo de Vittata y, al tocar a
   tiempo, ella da un aletazo y sube (perfecto = el doble y una estela). Cada 8 seguidos, «¡Racha!»: cambia el paisaje (sotobosque →
   copas → nubes → cielo abierto), sube el tempo y entra un instrumento más. Fallar no hace caer: planea y solo pierde la racha.
   Capas: 1 negras a 90 ppm · 2 a 105 con silencios (hoja blanca: no tocar también es acertar) · 3 a 120 con contratiempos ·
   4 a 132 con patrones de 2 compases; luego cada 16 seguidos suma 4 ppm (tope 148). Hojas doradas opcionales entre tiempos: suben
   más, pero un toque fuera de tiempo rompe la racha. Si un toque cae cerca de un golpe y de una dorada o un silencio, gana el golpe.
   Multiplicador por racha (×2 desde 8 seguidos, ×3 desde 16, ×4 desde 24): machacar sin compás no compensa. Ventana ±120 ms (perfecto) y ±220 ms (bien); los 4 primeros golpes miden el retraso del
   toque (calibración) y lo compensan.
   El reloj es el del audio (AudioContext.currentTime), no el de los cuadros; sin audio, el de performance.now() (las hojas siguen
   marcando el tiempo). Tambor y percusión sintetizados con G.audio.define (sin archivos ni descargas); aleteo, ring, unlock,
   panel_final y logro son los que ya existen.
   Se juega encima del mundo, que queda en pausa (G.pausa 'compas'), con un lienzo 2D propio: fondos pintados una vez por capa y
   reutilizados, y grupos fijos de hojas y chispas (sin asignaciones por cuadro). «Reducir movimiento»: sin estela ni chispas, sin
   latido del círculo ni saltos grandes y el fondo casi quieto.
   Récord en este dispositivo (localStorage, clave <almacen>.compas = { v: 1, mejor (metros), racha, jugadas }); lo lee «Mis récords».
   API: window.AVCompas(G) → G.compasApi = { jugar, salir, activo, tocar, paso, estado, test }. Lo abre menu_modos.js. Prueba: AV.compasTest(). */
window.AVCompas = function (G) {
  'use strict';
  if (G.compasApi) return G.compasApi;
  const ALM = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.compas';
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const html = document.documentElement;
  const reducido = () => html.classList.contains('mov-reducido') || (G.audio && G.audio.reducido != null ? !!G.audio.reducido : !!(G.renderer && G.renderer.REDUCED));
  const DUR = 90, PERF = 0.12, BIEN = 0.22, CALIB_V = 0.3, CALIB_N = 4, ANTES = 2.0, GEN = 3.0, AUDIO_ANTES = 0.25;
  const BPM = [90, 105, 120, 132], BPM_MAX = 148;
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor < 100000 ? d : null; } catch (e) { return null; } };
  const guardarRec = (mejor, racha, jugadas) => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor, racha, jugadas })); } catch (e) { /* sin almacén */ } };
  const A = G.audio;
  const sonar = (n, a) => { try { if (!G.quiet && A && A.play) A.play(n, a); } catch (e) { /* sin audio */ } };
  // PULIR 4: el sonido del final sale de la tabla común (src/game/menu_modos.js, window.AVFinJuego): victoria, casi o récord (logro a los 500 ms)
  const finSon = (tipo, sigue) => { const F = window.AVFinJuego; if (!F) return 0; if (tipo === 'record') return F.record(G, 'compas', sigue); F.sonar(G, 'compas', tipo); return 0; };
  let azarS = 0; const azar = () => { if (!azarS) return Math.random(); azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };

  // ---------- Percusión sintetizada (arg = instante exacto en el reloj del audio) ----------
  if (A && A.define) {
    const en0 = (t, at) => (typeof at === 'number' && at > t ? at : t);
    A.define('compas_tambor', (t, at, X) => { t = en0(t, at); X.tone(150, t, 0.22, { type: 'sine', to: 62, gain: 0.32 }); X.tone(300, t, 0.06, { type: 'triangle', to: 140, gain: 0.08 }); X.noise(t, 0.05, { type: 'bandpass', freq: 900, q: 1.2, gain: 0.08 }); });
    A.define('compas_doble', (t, at, X) => { t = en0(t, at); X.tone(260, t, 0.14, { type: 'sine', to: 150, gain: 0.16 }); X.noise(t, 0.04, { type: 'bandpass', freq: 1800, q: 1.5, gain: 0.06 }); });
    A.define('compas_maraca', (t, at, X) => { t = en0(t, at); X.noise(t, 0.07, { type: 'highpass', freq: 5200, q: 0.7, gain: 0.05 }); });
    A.define('compas_clave', (t, at, X) => { t = en0(t, at); X.tone(1850, t, 0.05, { type: 'sine', gain: 0.1 }); X.tone(2500, t, 0.03, { type: 'triangle', gain: 0.03 }); });
    A.define('compas_bajo', (t, at, X) => { t = en0(t, at && at.t); const f = (at && at.f) || 110; X.tone(f, t, 0.3, { type: 'triangle', gain: 0.14 }); X.tone(f * 2, t, 0.16, { type: 'sine', gain: 0.05 }); });
    A.define('compas_cuenta', (t, at, X) => { t = en0(t, at && at.t); X.tone(at && at.ya ? 1320 : 990, t, 0.08, { type: 'sine', gain: 0.1 }); });
  }

  // ---------- Patrones (posición en tiempos dentro del compás · g golpe, s silencio) ----------
  const P = s => s.split(' ').map(x => ({ p: parseFloat(x), tipo: x.slice(-1) === 's' ? 'silencio' : 'golpe' }));
  const PAT = [
    [P('0g 1g 2g 3g')],
    [P('0g 1g 2g 3s'), P('0g 1s 2g 3g'), P('0g 1g 2s 3g'), P('0g 1g 2g 3g')],
    [P('0g 1g 1.5g 3g'), P('0g 1.5g 2g 3g'), P('0g 1g 2.5g 3g'), P('0g 1s 1.5g 2g 3g'), P('0g 1g 2g 2.5g 3s')],
    [P('0g 1g 1.5g 2g 3s 4g 5g 6g 6.5g 7g'), P('0g 1.5g 2g 3g 4g 5s 5.5g 6g 7g'), P('0g 1g 2.5g 3g 4g 4.5g 5g 6s 7g'), P('0g 1g 2g 3g 4g 5.5g 6g 7s')]
  ];

  // ---------- Estado (grupos fijos, sin asignaciones por cuadro) ----------
  const NN = 64, NE = 96, NP = 48;
  const notas = []; for (let i = 0; i < NN; i++) notas.push({ on: false, t: 0, tipo: 'golpe', res: '', tr: 0, y: 0 });
  const evs = []; for (let i = 0; i < NE; i++) evs.push({ on: false, t: 0, n: '', a: 0, f: 0, ya: false, puesto: false });
  const chis = []; for (let i = 0; i < NP; i++) chis.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, vida: 0, v0: 1, c: 0, r: 2 });
  const compases = []; for (let i = 0; i < 8; i++) compases.push({ t: -1, capa: 0, b: 0.5 });
  const calib = [0, 0, 0, 0];
  const E = { fase: 'nada', fuente: 'perf', t0: 0, tm: 0, manual: false, genT: 0, nComp: 0, capa: 0, capaMeta: 0, vuelta: 0, capaVis: 0, capaAnt: 0, mezcla: 1,
    metros: 0, racha: 0, mejorRacha: 0, perfectos: 0, bienes: 0, fallos: 0, dobles: 0, calN: 0, offset: 0, ultToque: -9, ultimoT: 0, ultT: 0, finP: 0,
    mejor: 0, mejorRachaRec: 0, jugadas: 0, nuevo: false, hop: 0, sq: 0, inclina: 0, plano: 0, flash: 0, flashC: 0, cuenta: -1, avisos: 0, pistaT: 0, vistoS: false, vistoD: false };
  let ctxPrueba = null; // solo la prueba: un AudioContext simulado
  const ac = () => { const c = ctxPrueba || (A && A.ctx); return c && c.state === 'running' ? c : null; };
  function ahora() {
    if (E.manual) return E.tm;
    if (E.fuente === 'audio') {
      const c = ac(); if (c) return (E.ultT = c.currentTime - E.t0);
      E.fuente = 'perf'; E.t0 = performance.now() / 1000 - E.ultT; // el audio se paró (suspend, Siri, alarma): sigue en performance.now() sin salto
    }
    return (E.ultT = performance.now() / 1000 - E.t0);
  }
  function bpm() { return E.capaMeta < 3 ? BPM[E.capaMeta] : Math.min(BPM_MAX, BPM[3] + 4 * E.vuelta); }
  const mult = () => 1 + Math.min(3, Math.floor(E.racha / 8)); // ×1, ×2 desde 8 seguidos, ×3 desde 16, ×4 desde 24
  function nota(t, tipo) { const n = notas.find(x => !x.on); if (!n) return null; n.on = true; n.t = t; n.tipo = tipo; n.res = ''; n.tr = 0; return n; }
  function ev(t, nombre, f, ya) { const e = evs.find(x => !x.on); if (!e) return; e.on = true; e.t = t; e.n = nombre; e.f = f || 0; e.ya = !!ya; e.puesto = false; }
  function generar(limite) {
    while (E.genT < limite && E.genT < DUR) {
      const t0 = E.genT, cap = E.capaMeta, b = 60 / bpm();
      const c = compases[E.nComp % compases.length]; c.t = t0; c.capa = cap; c.b = b;
      if (E.nComp === 0) { // cuenta: 4 golpes de clave, sin hojas
        for (let i = 0; i < 4; i++) ev(t0 + i * b, 'compas_cuenta', 0, i === 3);
        E.tCuenta = t0; E.bCuenta = b; E.genT = E.inicio = t0 + 4 * b; E.nComp++; continue;
      }
      const lista = PAT[Math.min(cap, 3)], pat = lista[Math.floor(azar() * lista.length)];
      const largo = cap >= 3 ? 8 : 4;
      for (const x of pat) { nota(t0 + x.p * b, x.tipo); if (x.tipo === 'golpe') ev(t0 + x.p * b, 'compas_tambor'); }
      // hoja dorada opcional entre tiempos (no en los dos primeros compases: ahí se calibra)
      if (E.nComp > 2 && azar() < 0.4) {
        let libres = 0, elegida = -1; // entre tiempos, sin otra hoja en ese sitio ni un contratiempo a menos de un tiempo
        for (let p = 0.5; p < largo; p += 1) if (!pat.some(x => Math.abs(x.p - p) < 0.01 || (x.p % 1 && Math.abs(x.p - p) < 0.99)) && azar() < 1 / ++libres) elegida = p;
        if (elegida >= 0) { nota(t0 + elegida * b, 'doble'); ev(t0 + elegida * b, 'compas_doble'); }
      }
      for (let i = 0; i < largo; i++) { // el pulso sigue sonando aunque haya silencio: maraca, clave y bajo según la capa
        const tb = t0 + i * b;
        if (cap >= 1) { ev(tb, 'compas_maraca'); ev(tb + b / 2, 'compas_maraca'); }
        if (cap >= 2 && i % 4 !== 1) ev(tb + (i % 4 === 3 ? b / 2 : 0), 'compas_clave');
        if (cap >= 3 && i % 2 === 0) ev(tb, 'compas_bajo', [110, 98, 123.47, 82.41][(i / 2) % 4]);
      }
      E.genT = t0 + largo * b; E.nComp++;
    }
  }
  function programarAudio(t) {
    const c = E.fuente === 'audio' && !E.manual ? ac() : null;
    for (const e of evs) {
      if (!e.on) continue;
      if (e.t < t - 0.3) { e.on = false; continue; }
      if (e.puesto || e.t > t + AUDIO_ANTES) continue;
      e.puesto = true;
      if (!c || G.quiet) continue;
      const at = E.t0 + e.t;
      sonar(e.n, e.n === 'compas_bajo' ? { t: at, f: e.f } : e.n === 'compas_cuenta' ? { t: at, ya: e.ya } : at);
    }
  }
  function chispas(x, y, n, col, fuerza) {
    if (reducido()) return;
    for (let i = 0; i < n; i++) {
      const p = chis.find(q => !q.on); if (!p) return;
      const a = azar() * Math.PI * 2, v = (40 + azar() * 90) * (fuerza || 1);
      p.on = true; p.x = x; p.y = y; p.vx = Math.cos(a) * v - 30; p.vy = Math.sin(a) * v - 20; p.vida = p.v0 = 0.5 + azar() * 0.4; p.c = col; p.r = 2 + azar() * 3;
    }
  }
  function estela() {
    if (reducido()) return;
    for (let i = 0; i < 6; i++) {
      const p = chis.find(q => !q.on); if (!p) return;
      p.on = true; p.x = lay.vx - lay.S * 0.15; p.y = lay.vy + (azar() - 0.5) * lay.S * 0.3; p.vx = -160 - azar() * 120; p.vy = (azar() - 0.5) * 30; p.vida = p.v0 = 0.6 + azar() * 0.3; p.c = 2; p.r = 3 + azar() * 3;
    }
  }

  // ---------- Juego ----------
  const FRASE_CAPA = [null, ['Llegaste a las copas', 'You reached the treetops'], ['Sobre las nubes', 'Above the clouds'], ['¡Cielo abierto!', 'Open sky!']];
  function romper() { // planea: pierde solo la racha
    E.fallos++; E.plano = 1; E.racha = 0;
    aviso(L('¡Casi!', 'Almost!'), 'casi');
    pintarHud();
  }
  function acierto(n, d) {
    const perf = Math.abs(d) <= PERF;
    n.res = perf ? 'perfecto' : 'bien'; n.tr = 0;
    const subir = (n.tipo === 'doble' ? (perf ? 3 : 2) : (perf ? 2 : 1)) * mult();
    E.metros += subir; E.racha++; if (E.racha > E.mejorRacha) E.mejorRacha = E.racha;
    if (perf) E.perfectos++; else E.bienes++;
    if (n.tipo === 'doble') E.dobles++;
    E.hop = Math.min(1.6, E.hop + (perf ? 1 : 0.6)); E.sq = 1; E.plano = 0; E.flash = 1; E.flashC = n.tipo === 'doble' ? 1 : perf ? 2 : 0;
    sonar('aleteo_sint', perf ? 18 : 10);
    if (perf) { chispas(lay.vx, lay.laneY, 10, n.tipo === 'doble' ? 1 : 2, 1.2); estela(); sonar('nido_chispa'); } else chispas(lay.vx, lay.laneY, 5, 0, 0.8);
    if (!racha()) aviso(perf ? L('¡Perfecto!', 'Perfect!') : L('¡Bien!', 'Good!'), perf ? 'perf' : 'bien');
    pintarHud();
  }
  function racha() { // cada 8 seguidos: ¡Racha! y la capa siguiente (tempo e instrumento nuevos desde el próximo compás que se genere)
    if (E.racha === 0 || E.racha % 8) return false;
    if (E.capaMeta < 3) E.capaMeta++; else if (E.racha % 16 === 0 && bpm() < BPM_MAX) E.vuelta++; // en el cielo abierto, con calma: +4 ppm cada 16
    aviso(L(`¡Racha de ${E.racha}!`, `${E.racha} in a row!`), 'racha'); prepintar(E.capaMeta);
    sonar('ring', Math.min(6, E.racha / 8));
    return true;
  }
  function tocar(t) {
    if (E.fase !== 'juego') return false;
    if (t == null) t = ahora();
    if (t - E.ultToque < 0.07) return false;
    E.ultToque = t; E.sq = Math.max(E.sq, 0.5);
    const cal = E.calN < CALIB_N, v = cal ? CALIB_V : BIEN, ta = t - (cal ? 0 : E.offset);
    // dentro de la ventana manda el golpe; la dorada solo si el toque cae en ella (±120 ms) y no tan cerca del golpe; el silencio, si no hay otra
    let g = null, gd = 1e9, o = null, od = 1e9, s = null, sd = 1e9;
    for (const n of notas) {
      if (!n.on || n.res) continue; const d = Math.abs(ta - n.t); if (d > v) continue;
      if (n.tipo === 'golpe') { if (d < gd) { gd = d; g = n; } } else if (n.tipo === 'doble') { if (d < od) { od = d; o = n; } } else if (d < sd) { sd = d; s = n; }
    }
    const best = o && od <= PERF && od < gd && gd > PERF ? o : g || o || s;
    if (!best) { // toque fuera de tiempo: durante la cuenta no cuenta; luego rompe la racha (sin bajar)
      if (E.nComp < 2 || t < E.inicio - 0.4) return false;
      romper(); return false;
    }
    if (best.tipo === 'silencio') { best.res = 'casi'; romper(); return false; }
    const d = ta - best.t;
    if (cal && best.tipo === 'golpe') {
      calib[E.calN++] = t - best.t;
      if (E.calN === CALIB_N) { let s = 0; for (const x of calib) s += x; E.offset = Math.max(-0.06, Math.min(0.24, s / CALIB_N)); }
      acierto(best, Math.min(Math.abs(d), BIEN) === Math.abs(d) ? d : BIEN);
    } else acierto(best, d);
    return true;
  }
  function logica(t, dt) {
    if (E.fase !== 'juego') return;
    if (E.fuente === 'perf' && !E.manual) { const c = ac(); if (c) { E.t0 = c.currentTime - t; E.fuente = 'audio'; } } // el audio arrancó: sigue en su reloj sin salto
    generar(t + GEN);
    programarAudio(t);
    const tj = t - (E.calN < CALIB_N ? 0 : E.offset), v = E.calN < CALIB_N ? CALIB_V : BIEN;
    let ultima = 0;
    for (const n of notas) {
      if (!n.on) continue;
      if (n.t > ultima) ultima = n.t;
      if (n.res) { n.tr += dt; if (n.tr > 0.6 || (n.res !== 'fallo' && n.res !== 'ok' && n.tr > 0.35)) n.on = false; continue; }
      if (tj > n.t + v) {
        if (n.tipo === 'golpe') { n.res = 'fallo'; romper(); }
        else if (n.tipo === 'silencio') { n.res = 'ok'; E.racha++; if (E.racha > E.mejorRacha) E.mejorRacha = E.racha; if (!racha()) aviso('✓', 'bien'); pintarHud(); }
        else { n.res = 'perdida'; }
      }
      if (n.t < t - 3) n.on = false;
    }
    // capa a la vista: la del compás que suena
    let cv = E.capaVis, ultC = null; for (const c of compases) if (c.t >= 0 && c.t <= t && (!ultC || c.t > ultC.t)) ultC = c;
    if (ultC) { cv = ultC.capa; E.compasT = ultC.t; E.compasB = ultC.b; }
    if (cv !== E.capaVis) {
      E.capaAnt = E.capaVis; E.capaVis = cv; E.mezcla = 0;
      const f = FRASE_CAPA[cv]; if (f && cv > E.capaAnt) setTimeout(() => { if (E.fase === 'juego') aviso(L(f[0], f[1]), 'capa'); }, 450);
      if (cv === 1 && !E.vistoS) { E.vistoS = true; pista(L('Hoja blanca: ¡no toques!', 'White leaf: don’t tap!')); }
    }
    if (!E.vistoD && hayDorada(t)) { E.vistoD = true; pista(L('Hoja dorada: sube más', 'Golden leaf: climb higher')); }
    // cuenta 3, 2, 1, ¡ya!
    const b0 = E.bCuenta;
    const k = t >= E.tCuenta && t < E.tCuenta + 4 * b0 ? Math.floor((t - E.tCuenta) / b0) : -1;
    if (k !== E.cuenta) { E.cuenta = k; pintarCuenta(); }
    if (E.mezcla < 1 && (E.mezcla = Math.min(1, E.mezcla + dt / 1.2)) >= 1) for (let i = 0; i < 4; i++) if (i !== E.capaVis && i !== E.capaMeta) capas[i] = null; // solo quedan la capa a la vista y la que viene
    E.hop = Math.max(0, E.hop - dt * 2.4); E.sq = Math.max(0, E.sq - dt * 5); E.flash = Math.max(0, E.flash - dt * 4); E.plano = Math.max(0, E.plano - dt * 1.2);
    if (E.pistaT > 0 && (E.pistaT -= dt) <= 0 && el) q('pista').classList.add('cp-oculta');
    if (E.genT >= DUR && t > ultima + 0.6) fin();
  }
  function hayDorada(t) { for (const n of notas) if (n.on && n.tipo === 'doble' && n.t - t < ANTES && n.t > t) return true; return false; }
  function pasoChispas(dt) {
    for (const p of chis) { if (!p.on) continue; p.vida -= dt; if (p.vida <= 0) { p.on = false; continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }
  }

  // ---------- Dibujo ----------
  let el = null, cv = null, cx = null, img = null, raf = 0, tPrev = 0;
  const lay = { lado: false, W: 0, H: 0, dpr: 1, vx: 0, vy: 0, S: 160, laneY: 0, vel: 200, r: 30 };
  const capas = [null, null, null, null]; // { fondo, medio, cerca } pintados una vez por tamaño
  const COL_CHIS = ['#9df07a', '#ffd23f', '#ffffff'];
  const HOJA = (() => { try { const p = new Path2D(); p.moveTo(-1, 0); p.quadraticCurveTo(-0.3, -0.62, 0.95, -0.08); p.quadraticCurveTo(1.05, 0, 0.95, 0.08); p.quadraticCurveTo(-0.3, 0.62, -1, 0); p.closePath(); return p; } catch (e) { return null; } })();
  const NERVIO = (() => { try { const p = new Path2D(); p.moveTo(-1.15, 0); p.lineTo(0.85, 0); return p; } catch (e) { return null; } })();
  const RAYA = [7, 6], SIN_RAYA = [];
  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function grad(x, h, paradas) { const g = x.createLinearGradient(0, 0, 0, h); paradas.forEach((c, i) => g.addColorStop(i / (paradas.length - 1), c)); return g; }
  function nube(x, cx0, cy, w, col) { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 5; i++) { const px = cx0 - w / 2 + (i + 0.5) * w / 5, r = w * (0.16 + 0.07 * Math.sin(i * 2.1 + w)); x.moveTo(px + r, cy); x.arc(px, cy - r * 0.35 * (i % 2 ? 1 : 0.6), r, 0, Math.PI * 2); } x.rect(cx0 - w / 2 + w * 0.08, cy - w * 0.06, w * 0.84, w * 0.14); x.fill(); }
  function copa(x, cx0, cy, r, col, luz) { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; x.moveTo(cx0 + Math.cos(a) * r * 0.55 + r * 0.5, cy + Math.sin(a) * r * 0.4); x.arc(cx0 + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.4, r * 0.5, 0, Math.PI * 2); } x.fill(); if (luz) { x.fillStyle = luz; x.beginPath(); x.arc(cx0 - r * 0.25, cy - r * 0.3, r * 0.32, 0, Math.PI * 2); x.fill(); } }
  function fronda(x, bx, by, largo, ang, col) { x.strokeStyle = col; x.fillStyle = col; x.lineWidth = Math.max(2, largo * 0.03); x.beginPath(); const ex = bx + Math.cos(ang) * largo, ey = by + Math.sin(ang) * largo; x.moveTo(bx, by); x.quadraticCurveTo((bx + ex) / 2 + largo * 0.2, (by + ey) / 2, ex, ey); x.stroke(); for (let i = 1; i < 9; i++) { const k = i / 9, px = bx + (ex - bx) * k + largo * 0.2 * Math.sin(k * Math.PI) * 0.6, py = by + (ey - by) * k, l = largo * 0.22 * (1 - k * 0.7); for (const s of [-1, 1]) { x.beginPath(); x.ellipse(px + Math.cos(ang + s * 1.1) * l * 0.5, py + Math.sin(ang + s * 1.1) * l * 0.5, l * 0.5, l * 0.14, ang + s * 1.1, 0, Math.PI * 2); x.fill(); } } }
  function pintarCapa(i) {
    // a la densidad de la pantalla (nítido en retina), con un tope de píxeles por lienzo para no pasarse de memoria en Safari
    const W = lay.W, H = lay.H, k = Math.max(1, Math.min(lay.dpr, Math.sqrt(2.4e6 / (W * H)))), f = lienzo(W * k, H * k), m = lienzo(W * k, H * k), c = lienzo(W * k, H * k), tira = lienzo(1, 1).getContext('2d');
    // medio y cerca se repiten en horizontal: se pintan tres veces (−W, 0, +W) con la misma semilla para que el borde no se note
    for (const dx of [0, -W, W]) {
      const xf = dx ? tira : f.getContext('2d'), xm = m.getContext('2d'), xc = c.getContext('2d'), r = rng(7 + i * 31);
      if (!dx) xf.setTransform(k, 0, 0, k, 0, 0); xm.setTransform(k, 0, 0, k, dx * k, 0); xc.setTransform(k, 0, 0, k, dx * k, 0);
      if (i === 0) { // sotobosque: verde hondo, rayos de luz, troncos y helechos
        xf.fillStyle = grad(xf, H, ['#0d3526', '#1d5a3a', '#3f7d3a']); xf.fillRect(0, 0, W, H);
        xf.fillStyle = 'rgba(255,250,200,.07)'; for (let k = 0; k < 5; k++) { const x0 = r() * W; xf.beginPath(); xf.moveTo(x0, 0); xf.lineTo(x0 + 40 + r() * 50, 0); xf.lineTo(x0 - W * 0.25 + 120, H); xf.lineTo(x0 - W * 0.25, H); xf.fill(); }
        for (let k = 0; k < 7; k++) { const x0 = (k + r() * 0.6) * W / 7, w = 14 + r() * 26; xm.fillStyle = k % 2 ? '#173f2a' : '#1b4630'; xm.fillRect(x0, 0, w, H); xm.fillStyle = 'rgba(120,170,110,.18)'; xm.fillRect(x0 + w * 0.15, 0, w * 0.18, H); }
        for (let k = 0; k < 9; k++) copa(xm, r() * W, H * (0.04 + r() * 0.1), 50 + r() * 40, '#14402a', null);
        for (let k = 0; k < 12; k++) fronda(xc, (k + r()) * W / 12, H + 6, H * (0.18 + r() * 0.14), -Math.PI / 2 - 0.9 + r() * 1.8, k % 2 ? '#0f3622' : '#123f27');
        for (let k = 0; k < 6; k++) { const x0 = r() * W; xc.strokeStyle = '#123a24'; xc.lineWidth = 3; xc.beginPath(); xc.moveTo(x0, 0); xc.quadraticCurveTo(x0 + 20, H * 0.12, x0 - 6, H * (0.12 + r() * 0.14)); xc.stroke(); }
      } else if (i === 1) { // copas: cielo claro arriba, copas soleadas abajo
        xf.fillStyle = grad(xf, H, ['#79c3ea', '#b9e3f0', '#d7efc9']); xf.fillRect(0, 0, W, H);
        xf.fillStyle = 'rgba(255,240,170,.55)'; xf.beginPath(); xf.arc(W * 0.8, H * 0.14, Math.min(W, H) * 0.07, 0, Math.PI * 2); xf.fill();
        for (let k = 0; k < 14; k++) copa(xm, (k + r() * 0.5) * W / 14, H * (0.72 + r() * 0.1), 40 + r() * 34, '#4f9b4c', '#77bd62');
        for (let k = 0; k < 9; k++) copa(xc, (k + r() * 0.5) * W / 9, H * (0.9 + r() * 0.08), 60 + r() * 40, '#2e7334', '#4d9a45');
        for (let k = 0; k < 4; k++) fronda(xc, r() * W, 0, H * 0.16, Math.PI / 2 + (r() - 0.5) * 0.8, '#2a6b31');
      } else if (i === 2) { // nubes: azul claro, el bosque lejos abajo, nubes grandes
        xf.fillStyle = grad(xf, H, ['#5ea8e6', '#a7d6f6', '#e3f4ff']); xf.fillRect(0, 0, W, H);
        xf.fillStyle = '#6aa66a'; for (let k = 0; k < 30; k++) { xf.beginPath(); xf.arc((k + r()) * W / 30, H * 0.99, 14 + r() * 10, 0, Math.PI * 2); xf.fill(); }
        for (let k = 0; k < 5; k++) nube(xm, (k + r() * 0.6) * W / 5, H * (0.2 + r() * 0.45), 110 + r() * 80, 'rgba(255,255,255,.75)');
        for (let k = 0; k < 4; k++) nube(xc, (k + r() * 0.5) * W / 4, H * (0.88 + r() * 0.1), 220 + r() * 120, 'rgba(255,255,255,.95)');
      } else { // cielo abierto: azul hondo y una franja dorada, cirros y alguna nube
        xf.fillStyle = grad(xf, H, ['#163f86', '#3a7fcf', '#8cc0ea', '#ffd9a0']); xf.fillRect(0, 0, W, H);
        const g = xf.createRadialGradient(W * 0.82, H * 0.2, 0, W * 0.82, H * 0.2, Math.min(W, H) * 0.3); g.addColorStop(0, 'rgba(255,245,200,.9)'); g.addColorStop(0.25, 'rgba(255,230,150,.35)'); g.addColorStop(1, 'rgba(255,230,150,0)'); xf.fillStyle = g; xf.fillRect(0, 0, W, H);
        for (let k = 0; k < 6; k++) { xm.strokeStyle = 'rgba(255,255,255,.35)'; xm.lineWidth = 3 + r() * 3; xm.lineCap = 'round'; const y0 = H * (0.12 + r() * 0.5), x0 = r() * W; xm.beginPath(); xm.moveTo(x0, y0); xm.quadraticCurveTo(x0 + 80, y0 - 12, x0 + 170 + r() * 80, y0 + 4); xm.stroke(); }
        for (let k = 0; k < 3; k++) nube(xc, (k + r() * 0.5) * W / 3, H * (0.8 + r() * 0.15), 150 + r() * 80, 'rgba(255,248,235,.9)');
      }
    }
    for (const x of [f, m, c]) x.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);
    capas[i] = { fondo: f, medio: m, cerca: c };
    return capas[i];
  }
  const capa = i => capas[i] || pintarCapa(i);
  let preId = 0; // la capa que viene se pinta antes, fuera del cuadro del cambio (sin tirón al llegar la racha)
  function prepintar(i) {
    if (preId || capas[i] || !cx) return;
    const hazlo = () => { preId = 0; if (E.fase === 'juego' && !capas[i] && lay.W) pintarCapa(i); };
    preId = window.requestIdleCallback ? requestIdleCallback(hazlo, { timeout: 1200 }) : setTimeout(hazlo, 60);
  }
  function medir() {
    if (!cv) return;
    const W = Math.max(1, innerWidth), H = Math.max(1, innerHeight), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (W === lay.W && H === lay.H && dpr === lay.dpr) return;
    lay.W = W; lay.H = H; lay.dpr = dpr;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    lay.S = Math.max(110, Math.min(250, W * 0.4, H * 0.3));
    lay.vx = Math.round(W * (W > H ? 0.32 : 0.28)); lay.vy = Math.round(Math.max(80 + lay.S * 0.5, H * 0.42));
    lay.laneY = Math.round(Math.min(H - 70, lay.vy + lay.S * 0.58 + 22)); lay.r = Math.max(24, Math.min(34, lay.S * 0.16));
    lay.vel = Math.max((W - lay.vx + 40) / ANTES, 2.2 * lay.r / (30 / BPM_MAX)); // en vertical, las corcheas más rápidas no se montan (hoja ≈ 1,9 r de ancho)
    capas[0] = capas[1] = capas[2] = capas[3] = null;
    if (el) { // el aviso va encima de Vittata; en horizontal bajo, a su derecha (encima no cabe sin tapar el HUD)
      const fb = q('fb'), lado = lay.lado = H < 500 && W > H; fb.classList.toggle('lado', lado);
      fb.style.left = (lado ? lay.vx + lay.S * 0.45 + 12 : lay.vx) + 'px'; fb.style.top = (lado ? lay.vy - lay.S * 0.15 : Math.max(120, lay.vy - lay.S * 0.5 - 30)) + 'px'; }
  }
  function tile(x, c, off, a) { if (a <= 0) return; x.globalAlpha = a; const w = lay.W, o = Math.round((((off % w) + w) % w) * lay.dpr) / lay.dpr; /* en píxel entero: sin raya en la junta */ x.drawImage(c, -o, 0, w, lay.H); x.drawImage(c, w - o, 0, w, lay.H); }
  function dibujar(t) {
    if (!cx) return;
    const W = lay.W, H = lay.H, red = reducido(), velF = red ? 0.15 : 1;
    cx.setTransform(lay.dpr, 0, 0, lay.dpr, 0, 0);
    const tt = E.fase === 'nada' ? 0 : t;
    const a = capa(E.capaVis), b = E.mezcla < 1 ? capa(E.capaAnt) : null;
    cx.globalAlpha = 1;
    if (b) { cx.drawImage(b.fondo, 0, 0, W, H); tile(cx, b.medio, tt * 22 * velF, 1); tile(cx, b.cerca, tt * 60 * velF, 1); }
    const ma = b ? E.mezcla : 1;
    cx.globalAlpha = ma; cx.drawImage(a.fondo, 0, 0, W, H);
    cx.save(); cx.translate(0, red ? 0 : E.hop * 6); tile(cx, a.medio, tt * 22 * velF, ma); cx.restore();
    cx.save(); cx.translate(0, red ? 0 : E.hop * 14); tile(cx, a.cerca, tt * 60 * velF, ma); cx.restore();
    cx.globalAlpha = 1;
    // carril: banda suave, marcas del pulso y el círculo de golpe debajo de Vittata
    const y = lay.laneY, r = lay.r, vx = lay.vx, oscuro = E.capaVis === 0;
    cx.fillStyle = oscuro ? 'rgba(255,255,255,.12)' : 'rgba(16,40,30,.18)';
    cx.beginPath(); if (cx.roundRect) cx.roundRect(vx - r - 14, y - r - 8, W - vx + r + 30, 2 * r + 16, r + 8); else cx.rect(vx - r - 14, y - r - 8, W - vx + r + 30, 2 * r + 16); cx.fill();
    if (E.fase === 'juego') { // puntitos del pulso
      cx.fillStyle = oscuro ? 'rgba(255,255,255,.35)' : 'rgba(20,50,35,.35)';
      for (const c of compases) { if (c.t < 0) continue; for (let i = 0; i < (c.capa >= 3 && c.t >= E.inicio ? 8 : 4); i++) { const x = vx + (c.t + i * c.b - t) * lay.vel; if (x > vx + 4 && x < W + 10) { cx.beginPath(); cx.arc(x, y, i % 4 ? 3 : 5, 0, Math.PI * 2); cx.fill(); } } }
    }
    let latido = 0;
    if (E.fase === 'juego' && !red && t >= E.tCuenta) { const ph = ((t - E.compasT) / E.compasB) % 1; latido = ph >= 0 ? Math.max(0, 1 - ph * 4) : 0; }
    // PULIR 3 (niño de 7 años): el círculo se enciende en dorado justo cuando hay que tocar (una hoja dentro de ±0,14 s); solo color,
    // así que también con «Reducir movimiento»
    let ahoraToca = false;
    if (E.fase === 'juego') for (const n of notas) { if (n.on && !n.res && n.tipo !== 'silencio' && Math.abs(n.t - t) < 0.14) { ahoraToca = true; break; } }
    cx.lineWidth = ahoraToca ? 8 : 5; cx.strokeStyle = ahoraToca ? '#ffd23f' : '#fff8e6';
    cx.beginPath(); cx.arc(vx, y, r * (1 + latido * 0.12), 0, Math.PI * 2);
    if (E.flash > 0) { cx.globalAlpha = 0.25 + 0.6 * E.flash; cx.fillStyle = COL_CHIS[E.flashC === 1 ? 1 : E.flashC === 2 ? 2 : 0]; } else cx.fillStyle = 'rgba(255,248,230,.18)';
    cx.fill(); cx.globalAlpha = 1; cx.stroke();
    cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,248,230,.6)'; cx.beginPath(); cx.arc(vx, y, r * 0.55, 0, Math.PI * 2); cx.stroke();
    // hojas que llegan desde la derecha
    if (HOJA) for (const n of notas) {
      if (!n.on) continue;
      const hecho = n.res === 'perfecto' || n.res === 'bien';
      let x = vx + (n.t - t) * lay.vel; if (hecho) x = vx;
      if (x > W + 60 || x < -60) continue;
      const k = n.tipo === 'doble' ? r * 0.72 : r * 0.95;
      let al = 1; if (n.res === 'fallo' || n.res === 'perdida' || n.res === 'casi') al = Math.max(0, 0.45 - n.tr * 0.6); else if (hecho) al = Math.max(0, 1 - n.tr / 0.35); else if (n.res === 'ok') al = Math.max(0, 0.6 - n.tr);
      if (al <= 0) continue;
      cx.save(); cx.globalAlpha = al; cx.translate(x, y - (hecho && !red ? n.tr * 90 : 0)); cx.rotate(red ? -0.25 : -0.25 + Math.sin(n.t * 7 + t * 2) * 0.12); cx.scale(k * (hecho ? 1 + n.tr : 1), k * (hecho ? 1 + n.tr : 1));
      if (n.tipo === 'silencio') { cx.lineWidth = 3 / k; cx.setLineDash(RAYA); cx.fillStyle = 'rgba(255,255,255,.22)'; cx.fill(HOJA); cx.strokeStyle = '#ffffff'; cx.lineDashOffset = 0; cx.stroke(HOJA); cx.setLineDash(SIN_RAYA); }
      else {
        cx.fillStyle = n.tipo === 'doble' ? '#ffcf2e' : n.res === 'fallo' ? '#8c9a7a' : '#4fbf4a'; cx.fill(HOJA);
        cx.lineWidth = 2.4 / k; cx.strokeStyle = n.tipo === 'doble' ? '#a86a00' : '#1f6b27'; cx.stroke(HOJA); cx.stroke(NERVIO);
      }
      cx.restore();
    }
    cx.setLineDash(SIN_RAYA);
    // chispas y estela
    for (const p of chis) { if (!p.on) continue; cx.globalAlpha = Math.max(0, p.vida / p.v0); cx.fillStyle = COL_CHIS[p.c]; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, Math.PI * 2); cx.fill(); }
    cx.globalAlpha = 1;
    // Vittata: aletazo (salta y se estira), planea al fallar (se inclina y baja un poco)
    if (img && img.complete && img.naturalWidth) {
      const S = lay.S, hop = red ? E.hop * 0.25 : E.hop, sq = red ? 0 : E.sq, bob = red ? 0 : Math.sin(t * 2.2) * 4;
      const yy = lay.vy - hop * S * 0.18 + bob + E.plano * 10;
      cx.save(); cx.translate(vx, yy); cx.rotate(E.plano * 0.18 - hop * 0.05); cx.scale(1 - sq * 0.06, 1 + sq * 0.08);
      if (E.sq > 0.1 && !red) { cx.globalAlpha = E.sq * 0.7; cx.strokeStyle = '#ffffff'; cx.lineWidth = 4; cx.lineCap = 'round'; for (let s = -1; s <= 1; s += 2) { cx.beginPath(); cx.moveTo(s * S * 0.2, -S * 0.1); cx.quadraticCurveTo(s * S * 0.46, -S * 0.32, s * S * 0.52, -S * 0.02); cx.stroke(); } cx.globalAlpha = 1; }
      cx.drawImage(img, -S / 2, -S / 2, S, S);
      cx.restore();
    }
    if (E.fase === 'fin') { cx.fillStyle = 'rgba(8,22,16,.6)'; cx.fillRect(0, 0, W, H); } // detrás del panel final: el juego queda en penumbra, sin fantasmas
  }
  function cuadro(ts) {
    raf = 0;
    if (E.fase === 'nada') return;
    const dt = Math.min(0.1, Math.max(0, (ts - (tPrev || ts)) / 1000)); tPrev = ts;
    medir();
    const t = ahora();
    if (!E.manual) logica(t, dt);
    pasoChispas(dt);
    try { dibujar(E.fase === 'fin' ? E.ultimoT + (performance.now() / 1000 - E.finP) * 0.4 : t); } catch (e) { /* un cuadro sin dibujo no frena el juego */ }
    raf = requestAnimationFrame(cuadro);
  }
  // Para las pruebas: avanza el reloj manual dt segundos (en pasos de 50 ms) y corre la lógica
  function paso(dt) {
    if (!E.manual || E.fase !== 'juego') return;
    let resto = dt;
    while (resto > 1e-6 && E.fase === 'juego') { const d = Math.min(0.05, resto); E.tm += d; resto -= d; logica(E.tm, d); pasoChispas(d); }
  }

  // ---------- Interfaz ----------
  function css() {
    if (document.getElementById('compas-css')) return;
    const st = document.createElement('style'); st.id = 'compas-css';
    st.textContent = '#compas{position:fixed;inset:0;z-index:80;font-family:Fredoka,system-ui,sans-serif;color:#fff8e6;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;background:#0d3526}#compas[hidden],#compas [hidden]{display:none!important}' +
      '#compas canvas{position:absolute;inset:0;width:100%;height:100%;display:block}' +
      '#compas .cp-hud{position:absolute;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 10px);display:flex;align-items:center;gap:6px 12px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);box-sizing:border-box;padding:6px 8px 6px 14px;border-radius:22px;background:rgba(16,36,28,.82);font-weight:600;font-size:15px;box-shadow:0 4px 14px rgba(0,0,0,.35)}' +
      '@media (max-width:599px),(max-height:500px){#compas .cp-hud{flex-wrap:nowrap;gap:10px;padding-left:12px}#compas .cp-alt{font-size:17px!important;white-space:nowrap}#compas .cp-racha{white-space:nowrap}#compas .cp-rec{display:none}#compas .cp-pista{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 70px);font-size:15px;max-width:calc(100vw - 32px)}}' +
      '#compas .cp-alt{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}#compas .cp-racha{font-variant-numeric:tabular-nums}#compas .cp-rec{opacity:.85;font-size:14px}' +
      '#compas button{min-height:44px;min-width:44px;padding:4px 16px;border-radius:22px;border:0;font:700 16px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}#compas button.salir{background:#ffd0c4}#compas button:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}#compas .cp-fin:focus{outline:none}' +
      '#compas .cp-fb{position:absolute;transform:translate(-50%,-100%);white-space:nowrap;padding:4px 14px;border-radius:999px;font-weight:700;font-size:20px;pointer-events:none;background:rgba(16,36,28,.78)}#compas .cp-fb:empty{display:none}#compas .cp-fb.lado{transform:translate(0,-50%)}#compas .cp-fb.lado.pop{animation:none}' +
      '#compas .cp-fb.perf{background:#fff8e6;color:#1f5a2a}#compas .cp-fb.bien{background:#9df07a;color:#173b12}#compas .cp-fb.casi{background:rgba(16,36,28,.78);color:#ffe0b8}#compas .cp-fb.racha,#compas .cp-fb.capa{background:#ffd23f;color:#3b2a14;font-size:22px}' +
      '#compas .cp-fb.pop{animation:cp-pop .35s ease-out}@keyframes cp-pop{0%{transform:translate(-50%,-80%) scale(.7)}60%{transform:translate(-50%,-105%) scale(1.08)}100%{transform:translate(-50%,-100%) scale(1)}}' +
      '#compas .cp-cuenta{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:min(22vw,120px);font-weight:700;text-shadow:0 4px 18px rgba(0,0,0,.45);pointer-events:none}#compas .cp-cuenta:empty{display:none}' +
      '#compas .cp-pista{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);width:max-content;max-width:calc(100vw - 32px);box-sizing:border-box;text-align:center;padding:8px 16px;border-radius:18px;background:rgba(16,36,28,.8);font-size:16px;font-weight:600;pointer-events:none;transition:opacity .4s}#compas .cp-pista.cp-oculta{opacity:0}' +
      '#compas .cp-fin{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(380px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border-radius:24px;background:rgba(16,36,28,.98);text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;gap:8px;touch-action:manipulation}' +
      '#compas .cp-fin h2{margin:0;font-size:26px}#compas .cp-gran{font-size:44px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}#compas .cp-fin p{margin:0;font-size:17px;font-weight:600}#compas .cp-det{font-size:15px!important;opacity:.85;font-weight:500!important}#compas .cp-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}#compas .cp-bots button{min-height:54px;padding:4px 22px;font-size:18px;border-radius:22px}' + // PULIR 4: como los demás paneles (.av-bot, ui.css)
      '@media (orientation:landscape) and (max-height:500px){#compas .cp-fin{padding:12px 16px;gap:4px}#compas .cp-fin h2{font-size:21px}#compas .cp-gran{font-size:34px}#compas .cp-pista{font-size:14px;padding:6px 12px}}' +
      '@media (prefers-reduced-motion:reduce){#compas .cp-fb.pop{animation:none}#compas .cp-pista{transition:none}}.mov-reducido #compas .cp-fb.pop{animation:none}.mov-reducido #compas .cp-pista{transition:none}' +
      'body.compas-on :is(#stick,#acts,#v18-exp-poder,#v18-extra,#prompt,#toast,#modo-salir,#quest,#inv,#b-diary,#b-emotes,#b-menu,#b-construir,#b-nido,#minimapa,#marcador,#top,#sys,#guia-hud,#c1-saltar){visibility:hidden!important}'; // F22: tampoco «Controles» ni «Saltar intro» (el foco se perdía detrás del lienzo)
    document.head.appendChild(st);
  }
  function montar() {
    if (el) return el;
    css();
    el = document.createElement('div'); el.id = 'compas'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'cp-tit'); el.tabIndex = -1;
    el.innerHTML = '<canvas aria-hidden="true"></canvas>' +
      '<div class="cp-hud"><b id="cp-tit" data-k="tit"></b><span class="cp-alt" data-k="alt"></span><span class="cp-racha" data-k="racha"></span><span class="cp-rec" data-k="rec"></span><button type="button" class="salir" data-a="salir"></button></div>' +
      '<div class="cp-fb" data-k="fb" aria-live="polite"></div><div class="cp-cuenta" data-k="cuenta" aria-hidden="true"></div><div class="cp-pista" data-k="pista"></div>' +
      '<div class="cp-fin av-fin" data-k="fin" role="group" aria-labelledby="cp-fin-t" tabindex="-1" hidden><h2 id="cp-fin-t" data-k="ft"></h2><div class="cp-gran av-num" data-k="fn"></div><p class="av-msg" data-k="fmsg" aria-live="polite"></p><p class="cp-det av-det" data-k="fdet"></p><div class="cp-bots av-bots"><button type="button" class="av-bot" data-a="otra"></button><button type="button" class="av-bot salir" data-a="salir"></button></div></div>';
    cv = el.querySelector('canvas'); cx = cv.getContext('2d');
    img = new Image(); img.decoding = 'async'; img.src = 'assets/vittata.png';
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button'); if (b) return; // los botones van por click
      if (e.target.closest && e.target.closest('.cp-fin')) return;
      if (e.button > 0) return;
      e.preventDefault();
      if (E.manual) { tocar(); return; }
      tocar(ahora() - Math.max(0, Math.min(0.1, (performance.now() - e.timeStamp) / 1000)));
    });
    el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; e.preventDefault(); if (b.dataset.a === 'otra') jugar({ manual: E.manual, semilla: E.semilla0 }); else salir(); });
    document.body.appendChild(el);
    return el;
  }
  const q = k => el.querySelector('[data-k="' + k + '"]');
  const estrecho = () => innerWidth < 600 || innerHeight < 500;
  function pintarHud() {
    if (!el) return;
    const t = q('tit'); t.textContent = L('Alas al compás', 'Wings on the Beat'); t.hidden = estrecho();
    q('alt').textContent = L(`Altura: ${E.metros} m`, `Height: ${E.metros} m`);
    q('racha').textContent = L('Racha ', 'Streak ') + E.racha + (mult() > 1 ? ' ×' + mult() : '');
    q('rec').textContent = E.mejor ? L('Récord ', 'Best ') + E.mejor + ' m' : '';
    el.querySelector('.cp-hud [data-a="salir"]').textContent = L('Salir', 'Exit');
    el.setAttribute('aria-label', L('Alas al compás', 'Wings on the Beat'));
  }
  function aviso(txt, cls) {
    if (!el) return;
    const fb = q('fb'); fb.textContent = txt; fb.className = 'cp-fb ' + (cls || '') + (lay.lado ? ' lado' : '');
    if (!reducido()) { void fb.offsetWidth; fb.classList.add('pop'); }
  }
  function pista(txt) { if (!el) return; const p = q('pista'); p.textContent = txt; p.classList.remove('cp-oculta'); E.pistaT = 4; }
  function pintarCuenta() { if (!el) return; q('cuenta').textContent = E.cuenta < 0 ? '' : E.cuenta < 3 ? String(3 - E.cuenta) : L('¡Ya!', 'Go!'); }
  function pintarFin() {
    if (!el) return;
    const m = E.metros;
    q('ft').textContent = L('¡Qué vuelo!', 'What a flight!');
    q('fn').textContent = m + ' m';
    q('fmsg').textContent = E.nuevo ? L(`¡Nuevo récord: ${m} m!`, `New record: ${m} m!`) : m === 0 ? L('¡Casi! Toca justo cuando la hoja llegue al círculo', 'So close! Tap right when the leaf reaches the circle') : L(`Llegaste a ${m} m. Récord: ${E.mejor} m`, `You reached ${m} m. Best: ${E.mejor} m`);
    q('fdet').textContent = L(`Racha más larga: ${E.mejorRacha} · Perfectos: ${E.perfectos}`, `Longest streak: ${E.mejorRacha} · Perfect: ${E.perfectos}`);
    el.querySelector('[data-a="otra"]').textContent = L('Otra vez', 'Play again');
    el.querySelector('.cp-fin [data-a="salir"]').textContent = L('Salir', 'Exit');
  }

  // ---------- Partida ----------
  function jugar(o) {
    o = o || {};
    azarS = o.semilla || 0;
    montar();
    for (const n of notas) n.on = false; for (const e of evs) e.on = false; for (const p of chis) p.on = false; for (const c of compases) { c.t = -1; c.capa = 0; }
    const rec = leerRec();
    Object.assign(E, { fase: 'juego', manual: !!o.manual, semilla0: o.semilla || 0, tm: 0, genT: 0.6, tCuenta: 0.6, bCuenta: 60 / BPM[0], inicio: 0.6 + 240 / BPM[0], compasT: 0.6, compasB: 60 / BPM[0], nComp: 0, capa: 0, capaMeta: 0, vuelta: 0, capaVis: 0, capaAnt: 0, mezcla: 1,
      metros: 0, racha: 0, mejorRacha: 0, perfectos: 0, bienes: 0, fallos: 0, dobles: 0, calN: 0, offset: 0, ultToque: -9, ultimoT: 0,
      mejor: rec ? rec.mejor : 0, mejorRachaRec: rec && Number.isInteger(rec.racha) ? rec.racha : 0, jugadas: rec && Number.isInteger(rec.jugadas) ? rec.jugadas : 0,
      nuevo: false, hop: 0, sq: 0, inclina: 0, plano: 0, flash: 0, cuenta: -1, pistaT: 0, vistoS: false, vistoD: false, ultT: 0, finP: 0 });
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    const c = !E.manual && ac();
    E.fuente = c ? 'audio' : 'perf'; E.t0 = c ? c.currentTime : performance.now() / 1000;
    el.hidden = false; q('fin').hidden = true; el.querySelector('.cp-hud').hidden = false; q('fb').textContent = ''; q('cuenta').textContent = '';
    document.body.classList.add('compas-on');
    try { if (G.pausa && G.pausa.set) G.pausa.set('compas', true); } catch (e) { /* sin pausa */ }
    medir(); pintarHud();
    const tactil = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    pista(tactil ? L('Toca cuando la hoja llegue al círculo', 'Tap when the leaf reaches the circle') : L('Toca la pantalla (o Espacio) cuando la hoja llegue al círculo', 'Tap the screen (or press Space) when the leaf reaches the circle')); E.pistaT = 6;
    generar(GEN);
    tPrev = 0; if (!raf) raf = requestAnimationFrame(cuadro);
    try { el.focus({ preventScroll: true }); } catch (e) { /* */ }
    return true;
  }
  function fin() {
    if (E.fase !== 'juego') return;
    E.ultimoT = ahora(); E.finP = performance.now() / 1000;
    E.fase = 'fin';
    for (const e of evs) e.on = false;
    E.jugadas++;
    E.nuevo = E.metros > E.mejor; if (E.nuevo) E.mejor = E.metros;
    if (E.mejorRacha > E.mejorRachaRec) E.mejorRachaRec = E.mejorRacha;
    guardarRec(E.mejor, E.mejorRachaRec, E.jugadas);
    try { G.emit('record', { modo: 'compas', puntos: E.metros, racha: E.mejorRacha }); } catch (e) { /* */ }
    finSon(E.metros > 0 ? 'victoria' : 'casi'); if (E.nuevo && E.metros > 0) logroId = finSon('record', () => E.fase === 'fin'); // PULIR 4: tabla común
    q('fb').textContent = ''; q('cuenta').textContent = ''; q('pista').classList.add('cp-oculta');
    pintarHud(); pintarFin(); q('fin').hidden = false; el.querySelector('.cp-hud').hidden = true;
    // el foco va al panel (no a «Otra vez»): un Espacio de los últimos compases no arranca otra partida sin ver el resultado; Tab lleva a los botones
    const pf = q('fin'); setTimeout(() => { try { if (E.fase === 'fin') pf.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
  }
  let logroId = 0;
  const activo = () => E.fase !== 'nada';
  function salir() {
    if (!activo()) return false;
    E.fase = 'nada';
    for (const n of notas) n.on = false; for (const e of evs) e.on = false; for (const p of chis) p.on = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    if (preId) { if (window.cancelIdleCallback) cancelIdleCallback(preId); clearTimeout(preId); preId = 0; }
    capas[0] = capas[1] = capas[2] = capas[3] = null; // sin lienzos grandes vivos junto al mundo 3D (memoria de Safari en iPhone)
    if (cv) { cv.width = cv.height = 1; lay.W = lay.H = 0; }
    if (el) { el.hidden = true; q('fin').hidden = true; el.querySelectorAll('[data-k]').forEach(x => { if (x.dataset.k !== 'fin') x.textContent = ''; }); el.querySelectorAll('button').forEach(b => { b.textContent = ''; }); } // sin texto viejo (ni en otro idioma)
    document.body.classList.remove('compas-on');
    try { if (G.pausa && G.pausa.set) G.pausa.set('compas', false); } catch (e) { /* sin pausa */ }
    return true;
  }
  addEventListener('keydown', e => {
    if (!activo()) return;
    if (e.key === 'Escape') { if (e.repeat) return; e.preventDefault(); e.stopImmediatePropagation(); salir(); return; }
    if (e.key === 'Tab') { // F22: el diálogo es modal: el foco da la vuelta entre sus botones a la vista (Salir al jugar; Otra vez y Salir al final)
      e.preventDefault(); e.stopImmediatePropagation();
      const bs = [...el.querySelectorAll('button')].filter(b => !b.disabled && b.getClientRects().length), i = bs.indexOf(document.activeElement), n = bs.length;
      if (!n) return;
      const j = e.shiftKey ? (i <= 0 ? n - 1 : i - 1) : (i < 0 || i >= n - 1 ? 0 : i + 1);
      try { bs[j].focus({ preventScroll: true }); } catch (er) { /* */ }
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (E.fase === 'fin') { // el panel final es modal: las teclas del mundo (P, M, 1-7…) no pasan; Tab, Enter y Espacio van a los botones (no en el primer segundo)
      const boton = (e.key === 'Enter' || e.key === ' ') && performance.now() / 1000 - E.finP > 1 && e.target && e.target.closest && e.target.closest('#compas button');
      e.stopImmediatePropagation(); if (!boton) e.preventDefault();
      return;
    }
    if (E.fase !== 'juego') return;
    if (e.key === ' ' || e.key === 'ArrowUp' || /^[a-zA-Z0-9ñÑ]$/.test(e.key)) {
      e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return;
      if (E.manual) tocar(); else tocar(ahora() - Math.max(0, Math.min(0.1, (performance.now() - e.timeStamp) / 1000)));
    }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden && E.fase === 'juego' && !E.manual) fin(); }); // pestaña oculta: termina con lo subido
  addEventListener('resize', () => { if (activo()) { medir(); pintarHud(); } });

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })(), red0 = A ? A.reducido : null;
    const golpes = () => notas.filter(n => n.on && !n.res && n.tipo === 'golpe').sort((a, b) => a.t - b.t);
    const sinDobles = () => { for (const n of notas) if (n.tipo === 'doble') n.on = false; };
    const irA = t => { if (t > E.tm) paso(t - E.tm); };
    const tecla = k => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); dispatchEvent(ev); dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); return ev; }; // con su keyup: que input.js no se quede con teclas pulsadas para las pruebas siguientes
    const dedo = () => { const r = el.getBoundingClientRect(), x = r.left + r.width * 0.7, y = r.top + r.height * 0.55; const pe = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true }); (document.elementFromPoint(x, y) || cv).dispatchEvent(pe); return pe; };
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ }
      jugar({ manual: true, semilla: 5 });
      const hb = el.querySelector('.cp-hud [data-a="salir"]').getBoundingClientRect();
      check('Se abre a pantalla completa con su lienzo, la altura (0 m), la racha y «Salir» de ≥ 44 px; el mundo en pausa', activo() && !el.hidden && q('fin').hidden && /Altura: 0 m/.test(q('alt').textContent) && /Racha 0/.test(q('racha').textContent) && hb.height >= 44 && cv.width > 0 && document.body.classList.contains('compas-on') && (!G.pausa || !G.pausa.motivos || G.pausa.motivos.has('compas')), q('alt').textContent + ' · ' + Math.round(hb.height));
      irA(E.tCuenta + 0.05); check('La cuenta se ve: 3', q('cuenta').textContent === '3', q('cuenta').textContent);
      check('Primero la cuenta: 4 golpes de clave sin hojas y luego las hojas (a 90 ppm)', E.tCuenta === 0.6 && notas.filter(n => n.on).every(n => n.t >= E.inicio - 1e-9) && golpes().length >= 4 && Math.abs(golpes()[1].t - golpes()[0].t - 60 / 90) < 1e-6 && evs.filter(e => e.on && e.n === 'compas_cuenta').length === 4, golpes().slice(0, 3).map(n => n.t.toFixed(2)).join(','));
      // Calibración: el niño toca 0,16 s tarde en los 4 primeros golpes (cuentan como «bien»)
      for (let i = 0; i < 4; i++) { const g = golpes()[0]; irA(g.t + 0.16); if (i === 0) { const ev = tecla(' '); check('Con el teclado (Espacio) se sube un tramo: «¡Bien!» +1 m', ev.defaultPrevented && E.metros === 1 && E.racha === 1 && /¡Bien!/.test(q('fb').textContent), E.metros + ' m · ' + q('fb').textContent); } else if (i === 1) { dedo(); check('Con el dedo en cualquier parte también: +1 m', E.metros === 2 && E.racha === 2, E.metros); } else tecla('ArrowUp'); }
      check('Calibración: tras 4 golpes mide el retraso (≈ 0,16 s) y lo compensa', E.calN === 4 && Math.abs(E.offset - 0.16) < 0.03, E.offset.toFixed(3));
      { const g = golpes()[0]; irA(g.t + 0.16); tecla('k'); check('Ya calibrado, el mismo retraso cuenta como «¡Perfecto!» (+2 m) y deja estela', E.perfectos === 1 && E.metros === 6 && /¡Perfecto!/.test(q('fb').textContent) && chis.some(p => p.on), E.metros + ' · ' + q('fb').textContent); }
      { const g = golpes()[0], m0 = E.metros; irA(g.t + E.offset + 0.4); check('Un golpe sin tocar: «¡Casi!», pierde la racha pero no baja', g.res === 'fallo' && E.racha === 0 && E.metros === m0 && /¡Casi!/.test(q('fb').textContent), E.racha + ' · ' + E.metros); }
      { irA(golpes()[0].t - 0.33); sinDobles(); const m0 = E.metros, r0 = E.racha; tecla(' '); check('Un toque fuera de tiempo (entre hojas) rompe la racha, sin bajar', E.metros === m0 && E.racha === 0 && E.fallos >= 2 && /¡Casi!/.test(q('fb').textContent), r0); }
      // 8 seguidos: ¡Racha!, capa 2 (copas, 105 ppm, silencios)
      let nR = 0; while (E.racha < 8 && nR++ < 30) { const g = golpes()[0]; irA(g.t + E.offset); tecla(' '); }
      check('8 seguidos: «¡Racha de 8!» y la capa siguiente (105 ppm)', E.racha === 8 && E.capaMeta === 1 && bpm() === 105 && /Racha de 8/.test(q('fb').textContent), q('fb').textContent + ' · ' + bpm());
      { const g = golpes()[0], m0 = E.metros; irA(g.t + E.offset); tecla(' '); check('Con racha de 8 o más sube el doble (×2 en el HUD)', E.metros === m0 + 4 && /×2/.test(q('racha').textContent), (E.metros - m0) + ' · ' + q('racha').textContent); }
      let nS = 0; while (E.capaVis !== 1 && nS++ < 40) { const g = golpes()[0]; irA(g.t + E.offset); tecla(' '); }
      await new Promise(r => setTimeout(r, 520));
      check('Al llegar su compás cambia el paisaje: «Llegaste a las copas»', E.capaVis === 1 && /Llegaste a las copas/.test(q('fb').textContent), E.capaVis + ' · ' + q('fb').textContent);
      // Silencio: dejarlo pasar es acertar; tocarlo rompe la racha
      { let s = null, k = 0; while (!s && k++ < 40) { s = notas.filter(n => n.on && !n.res && n.tipo === 'silencio').sort((a, b) => a.t - b.t)[0]; if (!s) { const g = golpes()[0]; irA(g.t + E.offset); tecla(' '); } }
        for (const g of golpes().filter(g => g.t < s.t)) { irA(g.t + E.offset); tecla(' '); }
        const r0 = E.racha; irA(s.t + E.offset + 0.3);
        check('Hoja blanca (silencio): no tocar también es acertar (+1 a la racha)', s.res === 'ok' && E.racha === r0 + 1, r0 + ' → ' + E.racha);
        let s2 = null; k = 0; while (!s2 && k++ < 40) { s2 = notas.filter(n => n.on && !n.res && n.tipo === 'silencio').sort((a, b) => a.t - b.t)[0]; if (!s2) { const g = golpes()[0]; irA(g.t + E.offset); tecla(' '); } }
        for (const g of golpes().filter(g => g.t < s2.t)) { irA(g.t + E.offset); tecla(' '); }
        irA(s2.t + E.offset); tecla(' '); check('Tocar en el silencio rompe la racha', s2.res === 'casi' && E.racha === 0); }
      // Hoja dorada opcional: sube 3 con perfecto
      { for (const n of notas) if (n.on && !n.res && n.t < E.tm + 1.5) n.on = false; const d = nota(E.tm + 1, 'doble'); const m0 = E.metros; irA(d.t + E.offset); tecla(' '); check('Hoja dorada (doble) a tiempo: +3 m', d.res === 'perfecto' && E.metros === m0 + 3 && E.dobles === 1, E.metros - m0);
        const d2 = nota(E.tm + 1, 'doble'); for (const n of notas) if (n !== d2 && n.on && !n.res && n.t < d2.t + 0.8) n.on = false; const r0 = E.racha, m1 = E.metros; irA(d2.t + 0.5); check('Dejar pasar la dorada no castiga', d2.res === 'perdida' && E.racha === r0 && E.metros === m1, d2.res + ' · ' + r0 + ' → ' + E.racha); }
      // Golpe entre una dorada o un silencio: el toque es del golpe (no rompe la racha)
      { const limpiar = () => { for (const n of notas) if (n.on && !n.res) n.on = false; };
        limpiar(); const T = E.tm + 1.5, o = E.offset, d = nota(T - 0.227, 'doble'), g1 = nota(T, 'golpe'), r0 = E.racha;
        irA(T - 0.12 + o); tecla(' ');
        check('Toque 0,12 s antes de un golpe con una dorada a 0,227 s: es del golpe y la dorada queda libre', g1.res === 'perfecto' && !d.res && E.racha === r0 + 1, g1.res + '/' + d.res);
        limpiar(); const T2 = E.tm + 1.5, s1 = nota(T2 - 0.25, 'silencio'), g2 = nota(T2, 'golpe'), r1 = E.racha;
        irA(T2 - 0.13 + o); tecla(' ');
        check('Toque 0,13 s antes de un golpe con un silencio a 0,25 s: cuenta el golpe, sin «¡Casi!»', g2.res === 'bien' && !s1.res && E.racha === r1 + 1, g2.res + '/' + s1.res);
        limpiar(); const T3 = E.tm + 1.5, d3 = nota(T3, 'doble'), g3 = nota(T3 + 0.227, 'golpe'), r2 = E.racha;
        irA(T3 + 0.01 + o); tecla(' ');
        check('Toque justo en la dorada (el golpe a más de 120 ms): es de la dorada', d3.res === 'perfecto' && !g3.res && E.racha === r2 + 1, d3.res + '/' + g3.res);
        limpiar(); let k = 0; while (!golpes().length && k++ < 200) paso(0.1); }
      check('Sin asignaciones por cuadro: grupos fijos, y la lógica y el dibujo sin cierres .some/.find ni colores armados con «+»', notas.length === NN && evs.length === NE && chis.length === NP && notas.filter(n => n.on).length < NN && evs.filter(e => e.on).length < NE && ![logica, dibujar].some(f => /\.(some|filter|find|map)\(|'rgba\([^']*'\s*\+/.test(String(f))));
      // El audio se para a media partida (suspend, Siri): el tiempo sigue sin salto
      { const man0 = E.manual, f0 = E.fuente, t00 = E.t0, uT = E.ultT; let okA = false, info = '';
        try { const fake = { state: 'running', currentTime: 500 }; ctxPrueba = fake; E.manual = false; E.fuente = 'audio'; E.t0 = 500 - 20; const a1 = ahora(); fake.state = 'interrupted'; const a2 = ahora();
          okA = Math.abs(a1 - 20) < 1e-6 && Math.abs(a2 - 20) < 0.05 && E.fuente === 'perf'; info = a1.toFixed(2) + ' → ' + a2.toFixed(2) + ' · ' + E.fuente; }
        catch (e) { info = e.message; } finally { ctxPrueba = null; E.manual = man0; E.fuente = f0; E.t0 = t00; E.ultT = uT; }
        check('Si el audio deja de sonar (suspend o «interrupted»), el reloj pasa a performance.now() sin saltar', okA, info); }
      // «Reducir movimiento»: sin chispas ni estela
      if (A) { A.reducido = true; for (const p of chis) p.on = false; const g = golpes()[0]; irA(g.t + E.offset); tecla(' '); check('Con «Reducir movimiento» no salen chispas ni estela', E.perfectos >= 2 && !chis.some(p => p.on)); A.reducido = red0; }
      // Fin: el tiempo se acaba
      aviso(L('¡Perfecto!', 'Perfect!'), 'perf'); const ladoOk = q('fb').classList.contains('lado') === (innerHeight < 500 && innerWidth > innerHeight); const hr = el.querySelector('.cp-hud').getBoundingClientRect(), fbr = q('fb').getBoundingClientRect();
      const metros = E.metros; let nF = 0; while (E.fase === 'juego' && nF++ < 200) paso(1);
      check('Al terminar la música (≈ 90 s): panel con la altura, «¡Nuevo récord!», «Otra vez» y «Salir»', E.fase === 'fin' && !q('fin').hidden && q('fn').textContent === metros + ' m' && new RegExp('Nuevo récord: ' + metros + ' m').test(q('fmsg').textContent) && /Racha más larga: \d+/.test(q('fdet').textContent), q('fmsg').textContent);
      await new Promise(r => setTimeout(r, 30));
      { const fe = document.activeElement, tP = tecla('p'), tE = tecla(' ');
        check('Con el panel final, las teclas del mundo no pasan (P, M…) y un Espacio no arranca otra partida; el foco va al panel', tP.defaultPrevented && tE.defaultPrevented && E.fase === 'fin' && fe === q('fin') && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('menu')), (fe && (fe.dataset.k || fe.tagName)) + ' · ' + E.fase); }
      { // F22: Tab no sale del diálogo (aria-modal) y «Controles» / «Saltar intro» no quedan detrás con foco
        const enPanel = []; for (let i = 0; i < 3; i++) { const t = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); dispatchEvent(t); enPanel.push(t.defaultPrevented && q('fin').contains(document.activeElement) && document.activeElement.tagName === 'BUTTON'); }
        const tS = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); dispatchEvent(tS); enPanel.push(el.contains(document.activeElement));
        const gb = document.getElementById('guia-hud');
        check('El foco no sale del diálogo con Tab (ni en juego ni en el panel final) y «Controles» no queda detrás', enPanel.every(Boolean) && (!gb || getComputedStyle(gb).visibility === 'hidden'), enPanel.join(',')); }
      const rg = leerRec(); check('El récord (metros, racha más larga y jugadas) se guarda en este dispositivo', rg && rg.mejor === metros && rg.racha === E.mejorRacha && rg.jugadas === 1, JSON.stringify(rg));
      const bots = [...q('fin').querySelectorAll('button')].map(b => b.getBoundingClientRect()), fr = q('fin').getBoundingClientRect();
      check('Cabe en la pantalla: panel dentro, sin el HUD encima; «Otra vez» y «Salir» ≥ 54 px', bots.every(b => b.height >= 54 && b.width >= 54) && fr.left >= 0 && fr.right <= innerWidth && fr.top >= 0 && fr.bottom <= innerHeight && el.querySelector('.cp-hud').hidden && hr.left >= 0 && hr.right <= innerWidth && hr.bottom < innerHeight * 0.3 && hr.height <= 72 && lay.laneY + lay.r < innerHeight && lay.vy - lay.S / 2 > hr.bottom - 30 && (fbr.top >= hr.bottom || fbr.left >= hr.right || fbr.right <= hr.left) && ladoOk, `${innerWidth}×${innerHeight} · panel ${Math.round(fr.width)}×${Math.round(fr.height)} · HUD ${Math.round(hr.width)}×${Math.round(hr.height)} · aviso ${Math.round(fbr.left)},${Math.round(fbr.top)}`);
      el.querySelector('[data-a="otra"]').click();
      check('«Otra vez» empieza limpio (0 m, racha 0, capa 1, sin panel, récord a la vista)', E.fase === 'juego' && E.metros === 0 && E.racha === 0 && E.capaMeta === 0 && E.capaVis === 0 && E.calN === 0 && q('fin').hidden && new RegExp('Récord ' + metros + ' m').test(q('rec').textContent) && !notas.some(n => n.on && n.res), q('rec').textContent);
      let nG = 0; while (E.fase === 'juego' && nG++ < 200) paso(1);
      check('Sin metros: «¡Casi!» con una pista (PULIR 4: sin castigo, como los demás) y el récord sigue', /^¡Casi! /.test(q('fmsg').textContent) && (window.AVFinJuego ? window.AVFinJuego.log.filter(x => x.juego === 'compas').slice(-1)[0].tipo === 'casi' : true) && leerRec().mejor === metros && leerRec().jugadas === 2, q('fmsg').textContent);
      const ae = G.aula && G.aula.aj, idi0 = ae ? ae.idioma : null;
      if (ae) {
        ae.idioma = 'en'; pintarHud(); pintarFin();
        const txt = el.innerText || el.textContent;
        check('En inglés no queda texto en español (Height, Streak, What a flight!, Play again, Exit)', /Height: 0 m/.test(q('alt').textContent) && /Streak/.test(q('racha').textContent) && q('ft').textContent === 'What a flight!' && el.querySelector('[data-a="otra"]').textContent === 'Play again' && el.querySelector('.cp-hud [data-a="salir"]').textContent === 'Exit' && !/Altura|Racha|Récord|Salir|Otra vez|vuelo|Llegaste|Perfectos|Toca/.test(txt), txt.replace(/\s+/g, ' ').slice(0, 160));
        ae.idioma = idi0; pintarHud(); pintarFin();
      }
      el.querySelector('.cp-fin [data-a="salir"]').click();
      check('«Salir» lo quita todo (lienzo, clase, pausa y bucle), sin pausa colgada, y suelta la memoria (capas y lienzo a 1 px, sin «logro» pendiente)', !activo() && el.hidden && !document.body.classList.contains('compas-on') && !raf && (!G.pausa || !G.pausa.motivos || !G.pausa.motivos.has('compas')) && !notas.some(n => n.on) && capas.every(c => !c) && cv.width === 1 && !logroId);
      // Machacar sin mirar el ritmo no compensa: frente a seguir el compás, menos de la mitad
      { jugar({ manual: true, semilla: 3 }); let n = 0; while (E.fase === 'juego' && n++ < 400) { paso(0.333); tocar(); } const mMach = E.metros;
        jugar({ manual: true, semilla: 3 }); n = 0; while (E.fase === 'juego' && n++ < 600) { const g = golpes()[0]; if (!g) { paso(0.5); continue; } irA(g.t + 0.02); tocar(); } const mBien = E.metros, vMax = E.vuelta, bMax = bpm();
        check('Machacar cada 0,333 s da menos de la mitad que seguir el compás; en el cielo abierto +4 ppm cada 16 (tope ' + BPM_MAX + ')', mMach * 2 < mBien && bMax <= BPM_MAX && BPM_MAX <= 148, mMach + ' m frente a ' + mBien + ' m · vuelta ' + vMax + ' · ' + bMax + ' ppm');
        check('Las corcheas más rápidas no se montan en el carril (separación ≥ ancho de hoja)', lay.vel * (30 / BPM_MAX) >= 1.9 * lay.r, Math.round(lay.vel * 30 / BPM_MAX) + ' px · hoja ' + Math.round(1.9 * lay.r));
        salir(); try { localStorage.removeItem(ALM); } catch (e) { /* */ } }
      jugar({ manual: true, semilla: 3 });
      const ev = tecla('Escape');
      check('Esc en plena partida también sale', !activo() && ev.defaultPrevented && el.hidden && (!G.pausa || !G.pausa.motivos || !G.pausa.motivos.has('compas')));
      check('Percusión sintetizada (sin archivos) y sonidos que ya existen (aleteo, ring, panel_final, logro)', !A || !A.has || ['compas_tambor', 'compas_doble', 'compas_maraca', 'compas_clave', 'compas_bajo', 'compas_cuenta', 'aleteo_sint', 'ring', 'panel_final', 'logro'].every(n => A.has(n)));
      jugar({ semilla: 9 }); const f0 = E.fuente; await new Promise(r => setTimeout(r, 250)); const t1 = ahora();
      check('Con el reloj real avanza solo (audio o, sin audio, performance.now) y dibuja', t1 > 0.1 && !!raf && (f0 === 'audio' || f0 === 'perf'), f0 + ' · ' + t1.toFixed(2));
      salir();
    } catch (e) { check('Sin errores', false, e && (e.stack || e.message)); }
    finally {
      salir(); G.quiet = q0; azarS = 0; if (A) A.reducido = red0;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  G.compasApi = { jugar, salir, activo, tocar, paso, test, _dev: { notas, E }, estado: () => ({ fase: E.fase, metros: E.metros, racha: E.racha, mejorRacha: E.mejorRacha, capa: E.capaVis, bpm: bpm(), mejor: E.mejor, offset: E.offset, fuente: E.fuente, t: ahora() }) };
  return G.compasApi;
};
