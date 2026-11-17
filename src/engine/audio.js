/* AVE · audio
   Sonido sintético con WebAudio (sin archivos): buses master / efectos / voz, volumen guardado y registro para probar sin altavoces.
   Sonidos base del motor: pickup, ring, dash, splash, jump, land, unlock, tick, wrong, descubrir, grito (graznido + ondas del Grito).
   Un pack añade los suyos con G.audio.define(nombre, (t, arg, A) => ...), donde A = { tone, noise, pent }
   y la opción { bus: 'voice' } manda un tono al bus de voz.
   Muestras en archivo (assets/audio/, sintetizadas con tools/audio/juego.py; tabla en assets/audio/sonidos.json):
   aterrizar_techo, posarse_rama, despegar, nido_chispa, eclosion_huevo. Se tocan igual, con G.audio.play(nombre).
   Se piden tras el primer gesto (autoplay), .ogg o .mp3 según el navegador; mientras cargan suena un sintético
   de respaldo. Un pack registra más con G.audio.sample(nombre, { url: 'ruta/sin_extension.', gain, respaldo }).
   T45: los 30 efectos de Suno de assets/audio/sfx/ (ficha en sonidos.json) van en MUESTRAS con «perezosa»: no se piden en el primer
   gesto, sino al primer uso, con G.audio.precargar(lista) al entrar en su modo o, los de vuelo e interfaz, un rato después de arrancar.
   Mientras tanto suena su respaldo sintético (el primero que exista de la lista). minMs: tiempo mínimo entre dos (si llega antes suena
   «pronto», o nada). Los ambientes (bucle: true) no se tocan con play: los pone src/game/musica.js en su bus con G.audio.buffer(n);
   un play de su nombre (p. ej. la lluvia de clima.js) suena su respaldo solo si el bucle no está sonando (G.audio.enBucle[n]).
   Clics en los botones de los menús: «boton», solo al pulsar (nunca al pasar por encima) y si el botón no tocó ya otro sonido.
   G.audio.alSonar(fn): fn(nombre, arg) en cada G.audio.play de un sonido que existe, suene o no (sin altavoces, con el sonido apagado o
   antes del primer gesto del jugador). Lo usan los subtítulos de sonido (src/game/accesibilidad.js); un fallo del oyente no frena el sonido.
   Con «Reducir movimiento» (G.renderer.REDUCED o G.audio.reducido = true) los golpes fuertes (FUERTES: trueno, crecida, construir) suenan a la
   mitad, sin sobresaltos. */
AVE.module('audio', function (G) {
  'use strict';
  const STORE = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.audio';
  let ctx = null, master = null, sfxBus = null, voiceBus = null, suaveBus = null, salida = null, noiseBuf = null, lastAt = 0;
  const FUERTES = new Set(['trueno', 'crecida', 'construir']), SUAVE = 0.5;
  const vol = { master: 0.7, sfx: 0.8, voice: 0.9, muted: false };
  const oyentes = [];
  let nPlays = 0; // cuántos play() van (el registro se recorta a 40; el clic de «boton» mira si su botón ya sonó algo)
  try { const v = JSON.parse(localStorage.getItem(STORE) || 'null'); if (v && typeof v === 'object') Object.assign(vol, v); } catch (e) { /* sin almacenamiento */ }
  function apply() { if (!ctx) return; master.gain.value = vol.muted ? 0 : vol.master; sfxBus.gain.value = vol.sfx; voiceBus.gain.value = vol.voice; }
  // El navegador solo deja sonar después de un gesto del jugador
  function gestoConfiable() { try { return !navigator.userActivation || navigator.userActivation.hasBeenActive; } catch (e) { return true; } }
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended' && gestoConfiable()) ctx.resume().catch(() => {}); return ctx; }
    if (!gestoConfiable()) return null; // sin activación de usuario: no crear (el navegador avisaría y quedaría suspendido)
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    suaveBus = ctx.createGain(); suaveBus.gain.value = SUAVE; suaveBus.connect(sfxBus); salida = sfxBus;
    voiceBus = ctx.createGain(); voiceBus.connect(master);
    apply(); Object.keys(MUESTRAS).forEach(n => { if (!MUESTRAS[n].perezosa || quiere.has(n)) cargar(n); });
    setTimeout(() => precargarEnCalma(PRECARGA), PRECARGA_MS); // vuelo e interfaz: fuera de la carga inicial
    return ctx;
  }
  // F21 · volúmenes equilibrados. lu: sonoridad momentánea máxima de cada archivo (EBU R128, ventana de 400 ms, en LUFS), medida el
  // 17-nov sobre el .ogg con ffmpeg -af "apad=pad_dur=1,ebur128" (el .mp3 queda a ±0,3). La ganancia no se pone a ojo: sale del nivel al
  // que debe sonar su tipo, gain = min(1, 10^((NIVEL[nivel] − lu) / 20)) redondeada a 0,01, y ninguno destaca ni se pierde:
  //   suave −28 (suenan a cada rato: aleteo, boton) · corto −25 (golpes de construir y del duelo) · accion −23 (vuelo, recoger, pesca,
  //   avisos) · poder −22 (poderes y el poder del duelo) · premio −21 (logros, finales, el pez sacado, el huevo).
  // Antes (ganancias a ojo) iban de −29,8 (aleteo) a −18,5 (poder_rafaga): 11 dB entre el más flojo y el más fuerte; ahora 7, por tipo.
  //   archivo          lu     nivel   antes → ahora   (efectivo antes → ahora, LUFS)
  //   aterrizar_techo −23,8  accion  0,90 → 1,00   (−24,7 → −23,8; no se sube más de 1)   posarse_rama  −22,9 accion 0,90 → 0,99 (−23,8 → −23,0)
  //   despegar        −19,9  accion  0,80 → 0,70   (−21,8 → −23,0)   nido_chispa −18,2 premio 0,80 → 0,72   eclosion_huevo −18,0 premio 0,90 → 0,71
  //   aleteo          −23,8  suave   0,50 → 0,62   (−29,8 → −28,0)   boton  −22,6 suave 0,60 → 0,54   (−27,0 → −28,0)
  //   planeo −18,3 accion 0,55 → 0,58 · picada −17,4 accion 0,60 → 0,52 · frenada −17,9 accion 0,60 → 0,56 · semilla −18,5 accion 0,70 → 0,60
  //   aviso −19,0 accion 0,60 → 0,63 · flecha −18,2 accion 0,65 → 0,58 · lanzar −19,7 accion 0,75 → 0,68 · pica −17,2 accion 0,80 → 0,51
  //   pieza −19,1 corto 0,80 → 0,51 · encaje −18,8 corto 0,70 → 0,49 · duelo_ala −17,9 corto 0,70 → 0,44 · duelo_pata −19,5 corto 0,70 → 0,53
  //   duelo_semilla −17,8 corto 0,70 → 0,44 · duelo_poder −19,7 poder 0,80 → 0,77 · poder_grito −17,6 poder 0,85 → 0,60
  //   poder_rafaga −16,6 poder 0,80 → 0,54 · poder_ojo −18,0 poder 0,80 → 0,63 · poder_planeo −17,7 poder 0,80 → 0,61
  //   logro −18,3 premio 0,80 → 0,73 · panel_final −17,7 premio 0,85 → 0,68 · clavado −19,0 premio 0,85 → 0,79
  //   puente_reparado −19,9 premio 0,90 → 0,88 · duelo_victoria −18,1 premio 0,85 → 0,72 · duelo_derrota −18,1 premio 0,80 → 0,72
  // Los ambientes en bucle (bosque_yunque, noche_coquis, lluvia, rio) los equilibra src/game/musica.js (BUCLES) con su sonoridad integrada.
  // Un archivo nuevo: mide su lu igual y elige su nivel; sin lu, gain explícita (G.audio.sample) o 1.
  const NIVEL = { suave: -28, corto: -25, accion: -23, poder: -22, premio: -21 };
  const ganancia = m => (m.lu != null && NIVEL[m.nivel] != null ? Math.min(1, Math.round(Math.pow(10, (NIVEL[m.nivel] - m.lu) / 20) * 100) / 100) : m.gain == null ? 1 : m.gain);
  // Muestras en archivo: bus de efectos, mismo silencio y volumen que los sintéticos
  const MUESTRAS = {
    aterrizar_techo: { lu: -23.8, nivel: 'accion', respaldo: 'land' },
    posarse_rama: { lu: -22.9, nivel: 'accion', respaldo: 'land' },
    despegar: { lu: -19.9, nivel: 'accion', respaldo: 'jump' },
    nido_chispa: { lu: -18.2, nivel: 'premio', respaldo: 'tick' },
    eclosion_huevo: { lu: -18.0, nivel: 'premio', respaldo: 'unlock' },
  };
  // T45: efectos de Suno (assets/audio/sfx/, ficha en sonidos.json; −20 LUFS como los de arriba). respaldo: lista de sintéticos (el primero
  // que exista); minMs y pronto: sin spam; tono(arg): velocidad de reproducción; bucle: ambiente que pone musica.js (no se toca con play).
  const SFX = {
    aleteo: { lu: -23.8, nivel: 'suave', respaldo: 'aleteo_sint', minMs: 380, pronto: 'aleteo_sint' }, // entre dos aletazos de archivo, el sintético suave
    planeo: { lu: -18.3, nivel: 'accion', respaldo: 'dash', minMs: 2500 },
    picada: { lu: -17.4, nivel: 'accion', respaldo: ['picado', 'dash'], minMs: 2000 },
    frenada: { lu: -17.9, nivel: 'accion', respaldo: 'land', minMs: 1500 },
    semilla: { lu: -18.5, nivel: 'accion', respaldo: ['r_semilla', 'pickup'], minMs: 70, tono: c => 1 + Math.min(c || 0, 9) * 0.03 }, // el combo sube un poco el tono (F21: también al recoger un objeto del mundo)
    logro: { lu: -18.3, nivel: 'premio', respaldo: 'unlock', minMs: 1500 },
    boton: { lu: -22.6, nivel: 'suave', respaldo: 'clic', minMs: 90 },
    aviso: { lu: -19.0, nivel: 'accion', respaldo: 'tick', minMs: 1500 },
    flecha: { lu: -18.2, nivel: 'accion', respaldo: 'tick', minMs: 1500, pronto: 'tick' },
    panel_final: { lu: -17.7, nivel: 'premio', respaldo: 'unlock', minMs: 3000 },
    pieza: { lu: -19.1, nivel: 'corto', respaldo: 'tac', minMs: 120, pronto: 'tac', tono: a => (a >= 0.7 && a < 1 ? a : 1) }, // F21: quitar una pieza la toca más grave (0,85)
    encaje: { lu: -18.8, nivel: 'corto', respaldo: 'tick', minMs: 250 },
    puente_reparado: { lu: -19.9, nivel: 'premio', respaldo: 'unlock', minMs: 3000 },
    lanzar: { lu: -19.7, nivel: 'accion', respaldo: 'dash', minMs: 600 },
    pica: { lu: -17.2, nivel: 'accion', respaldo: 'splash', minMs: 600 },
    clavado: { lu: -19.0, nivel: 'premio', respaldo: 'unlock', minMs: 1000 },
    duelo_ala: { lu: -17.9, nivel: 'corto', respaldo: ['ext_ala', 'dash'], minMs: 300, pronto: 'ext_ala' },
    duelo_pata: { lu: -19.5, nivel: 'corto', respaldo: ['ext_pata', 'tac'], minMs: 250, pronto: 'ext_pata', tono: a => (a > 1 && a <= 1.5 ? a : 1) }, // F4-15: la pluma quitada lo sube (1,06–1,3); el lado de la patada (±1) no
    duelo_semilla: { lu: -17.8, nivel: 'corto', respaldo: 'dash', minMs: 300, pronto: 'dash' },
    duelo_poder: { lu: -19.7, nivel: 'poder', respaldo: 'dash', minMs: 800 },
    duelo_victoria: { lu: -18.1, nivel: 'premio', respaldo: 'unlock', minMs: 3000 },
    duelo_derrota: { lu: -18.1, nivel: 'premio', respaldo: 'wrong', minMs: 3000 },
    poder_grito: { lu: -17.6, nivel: 'poder', respaldo: 'grito', minMs: 800 },
    poder_rafaga: { lu: -16.6, nivel: 'poder', respaldo: 'dash', minMs: 800 }, // T42 le dará su momento
    poder_ojo: { lu: -18.0, nivel: 'poder', respaldo: 'descubrir', minMs: 800 }, // T42
    poder_planeo: { lu: -17.7, nivel: 'poder', respaldo: 'dash', minMs: 800 }, // T42
    bosque_yunque: { bucle: true },
    lluvia: { bucle: true, respaldo: 'lluvia_sint' },
    rio: { bucle: true },
    noche_coquis: { bucle: true },
  };
  for (const n of Object.keys(SFX)) MUESTRAS[n] = Object.assign({ url: 'assets/audio/sfx/' + n + '.', perezosa: true }, SFX[n]);
  for (const n of Object.keys(MUESTRAS)) MUESTRAS[n].gain = ganancia(MUESTRAS[n]);
  // Los de vuelo e interfaz (y los finales de una sola vez) se piden PRECARGA_MS después del primer gesto, de uno en uno y en calma
  const PRECARGA = ['aleteo', 'planeo', 'picada', 'frenada', 'boton', 'aviso', 'flecha', 'semilla', 'logro', 'panel_final', 'puente_reparado', 'poder_grito'], PRECARGA_MS = 20000;
  const quiere = new Set(); // pedidas con precargar() antes de que exista el AudioContext
  function precargarEnCalma(lista) {
    const fila = lista.filter(n => MUESTRAS[n] && !bufs[n] && !pedidas[n]);
    const uno = () => { const n = fila.shift(); if (!n || !ctx) return; cargar(n); (pedidas[n] || Promise.resolve()).then(() => setTimeout(siguiente, 150)); };
    const siguiente = () => (window.requestIdleCallback ? requestIdleCallback(uno, { timeout: 2000 }) : uno());
    siguiente();
  }
  const bufs = {}, pedidas = {};
  let ext = null;
  function formato() {
    if (ext) return ext;
    let ogg = '';
    try { ogg = document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"'); } catch (e) { /* sin <audio> */ }
    return (ext = ogg ? 'ogg' : 'mp3');
  }
  // Sin servidor de archivos (file://, host sin binarios): assets/audio/sonidos_b64.js deja el MP3 en AV_AUDIO_B64
  function desdeB64(n) {
    const get = () => (window.AV_AUDIO_B64 || {})[n];
    const listo = get() || !(AVE.assets && AVE.assets.script) ? Promise.resolve() : AVE.assets.script('assets/audio/sonidos_b64.js');
    return listo.then(() => {
      const s = get(); if (!s) throw new Error('sin audio ' + n);
      const bin = atob(s), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u.buffer;
    });
  }
  let midiendo = false; // medir() cambia ctx por uno sin conexión: entonces no se pide ningún archivo (se decodificaría en el contexto prestado)
  function cargar(n) {
    if (!ctx || midiendo || bufs[n] || pedidas[n]) return;
    const m = MUESTRAS[n];
    pedidas[n] = fetch((m.url || 'assets/audio/' + n + '.') + formato())
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .catch(() => desdeB64(n))
      .then(ab => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(() => {}); }))
      .then(b => { bufs[n] = b; }, () => { /* se queda el respaldo sintético */ });
  }
  function respaldoDe(m) { for (const r of [].concat(m.respaldo || [])) if (SOUNDS[r]) return SOUNDS[r]; return null; }
  function muestra(n, t, arg) {
    const b = bufs[n], m = MUESTRAS[n];
    if (m.bucle) { if (!api.enBucle[n]) { const r = respaldoDe(m); if (r) r(t, arg); } return; } // el bucle lo pone musica.js
    if (m.minMs) {
      const ahora = performance.now();
      if (ahora - (m.ult || -1e9) < m.minMs) { if (m.pronto && SOUNDS[m.pronto]) SOUNDS[m.pronto](t, arg); return; }
      m.ult = ahora;
    }
    if (!b) { cargar(n); const r = respaldoDe(m); if (r) r(t, arg); return; }
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; if (m.tono) src.playbackRate.value = m.tono(arg); g.gain.value = m.gain == null ? 1 : m.gain; src.connect(g); g.connect(salida); src.start(t);
  }
  function env(g, t0, dur, peak) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
  function tone(freq, t0, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'triangle'; osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    env(g, t0, dur, o.gain || 0.2); osc.connect(g); g.connect(o.bus === 'voice' ? voiceBus : o.bus || salida); osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function ruido() {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  }
  function noise(t0, dur, o) {
    o = o || {};
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = ruido(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.freq || 1200, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    env(g, t0, dur, o.gain || 0.25); src.connect(f); f.connect(g); g.connect(salida); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
  }
  // Chillido de cotorra: sierra con barrido rápido de tono (sube y cae) por un filtro de banda que hace de «pico»
  function chillido(f0, f1, f2, t0, dur, gain) {
    const osc = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.linearRampToValueAtTime(f1, t0 + dur * 0.3); osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.setValueAtTime(f1 * 1.6, t0); f.frequency.exponentialRampToValueAtTime(f2 * 1.8, t0 + dur);
    env(g, t0, dur, gain); osc.connect(f); f.connect(g); g.connect(salida); osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  // Grito del Yunque (y los gritos con onda), ~1,2 s: graznido (~0,3 s), luego la «ola» que acompaña a los 3 anillos visibles
  // mientras viajan (7 m a 16 m/s, unos 0,45 s): un «whoom» por anillo y un soplo de viento que crece y se apaga; al final, el eco
  // del graznido en el monte. La energía va en 200 Hz-3 kHz, lo que suenan los altavoces de portátil y de móvil (Kelvin 9-nov: «en la
  // computadora no se escuchó»; el de antes era casi todo 85-170 Hz). El subgrave es solo un extra para auriculares y altavoces buenos.
  // Volumen parecido a «dash» y «ring», sin golpes más fuertes que ellos. arg = tono (1 = Vittata; >1 más agudo, <1 más grave).
  function ola(t0, dur, o) { // ruido filtrado con envolvente que crece (subida) y se apaga, no un golpe seco
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), sube = t0 + dur * (o.subida || 0.35);
    src.buffer = ruido(); src.loop = true; f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(o.freq, t0); f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain, sube); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(salida); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
  }
  function grito(t, k) {
    k = k > 0 ? k : 1;
    const kg = Math.sqrt(k); // la ola cambia menos de tono que el graznido
    chillido(1100 * k, 1700 * k, 850 * k, t, 0.3, 0.22);
    tone(1700 * k, t + 0.01, 0.16, { type: 'square', to: 1150 * k, gain: 0.03 }); // armónico: el «raspado» de la cotorra
    noise(t, 0.1, { freq: 2300 * k, q: 1.4, gain: 0.08 });
    for (let i = 0; i < 3; i++) { // un «whoom» por anillo
      const t0 = t + 0.2 + i * 0.16, a = 1 - i * 0.2;
      tone(480 / kg, t0, 0.34, { type: 'triangle', to: 230 / kg, gain: 0.13 * a }); // cuerpo de la onda: se oye en cualquier altavoz
      tone(960 / kg, t0, 0.2, { type: 'sine', to: 460 / kg, gain: 0.03 * a }); // su brillo, para que se note en portátil
      tone(110 / kg, t0, 0.42, { type: 'sine', to: 50 / kg, gain: 0.035 * a }); // subgrave: extra con auriculares
    }
    ola(t + 0.16, 0.9, { type: 'bandpass', freq: 1100, to: 300, q: 0.8, gain: 0.12, subida: 0.4 }); // soplo de la onda que crece y se va
    ola(t + 0.16, 0.95, { freq: 700, to: 220, gain: 0.04, subida: 0.4 }); // y su rumor grave
    chillido(1060 * k, 1620 * k, 820 * k, t + 0.66, 0.24, 0.06); // eco del graznido en el monte, y otro más lejos
    chillido(1030 * k, 1560 * k, 800 * k, t + 0.94, 0.22, 0.025);
    tone(300 / kg, t + 0.78, 0.45, { type: 'triangle', to: 180 / kg, gain: 0.03 }); // cola
  }
  const PENTA = [0, 2, 4, 7, 9]; // pentatónica mayor: el combo sube la nota
  const pent = (i, base) => base * Math.pow(2, (PENTA[i % 5] + 12 * Math.floor(i / 5)) / 12);
  const A = { tone, noise, pent };
  const SOUNDS = {
    pickup: (t, c) => { c = Math.min(c || 0, 9); for (let k = 0; k < 3; k++) tone(pent(c + k * 2, 523.25), t + k * 0.07, 0.2, { gain: 0.16 }); },
    ring: (t, i) => { tone(pent(i + 2, 392), t, 0.4, { type: 'sine', gain: 0.22 }); tone(pent(i + 4, 392), t + 0.08, 0.35, { type: 'sine', gain: 0.1 }); },
    dash: t => noise(t, 0.25, { freq: 600, to: 2600, q: 0.8, gain: 0.22 }),
    splash: t => noise(t, 0.45, { type: 'lowpass', freq: 1800, to: 280, gain: 0.3 }),
    aleteo_sint: (t, v) => noise(t, 0.12, { type: 'bandpass', freq: 380 + Math.min(1, (v || 0) / 20) * 420, to: 160, q: 0.7, gain: 0.07 }), // BM22: golpe de alas; el ritmo lo marca fisica.js según la velocidad
    jump: t => tone(330, t, 0.12, { type: 'square', to: 540, gain: 0.05 }),
    land: t => noise(t, 0.14, { type: 'lowpass', freq: 520, gain: 0.25 }),
    unlock: t => { [0, 2, 4, 5, 7].forEach((i, k) => tone(pent(i, 523.25), t + k * 0.09, 0.32, { gain: 0.16 })); noise(t + 0.45, 0.7, { freq: 6000, q: 0.7, gain: 0.06 }); },
    martillo: (t, v) => { const k = 1 + 0.06 * ((v || 0) % 3); tone(210 * k, t, 0.09, { type: 'square', to: 130 * k, gain: 0.07 }); noise(t, 0.07, { type: 'bandpass', freq: 1500, q: 1.2, gain: 0.2 }); }, // BM34: golpe de martillo en madera
    // CG-103: lo nuevo, sin archivos. Energía en 200 Hz–3 kHz (se oye en la bocina de una laptop) y más flojo que «ring».
    carrete: t => { for (let i = 0; i < 3; i++) { const t0 = t + i * 0.045; noise(t0, 0.035, { type: 'bandpass', freq: 1400, q: 3, gain: 0.1 }); tone(520, t0, 0.03, { type: 'square', gain: 0.035 }); } },
    chapuzon: t => { noise(t, 0.36, { type: 'lowpass', freq: 1600, to: 380, gain: 0.2 }); tone(240, t, 0.2, { type: 'sine', to: 140, gain: 0.05 }); },
    tac: t => { noise(t, 0.05, { type: 'bandpass', freq: 1200, q: 1.6, gain: 0.16 }); tone(190, t, 0.07, { type: 'triangle', to: 95, gain: 0.06 }); },
    chaching: t => { tone(880, t, 0.14, { type: 'sine', gain: 0.08 }); tone(1318, t + 0.09, 0.18, { type: 'sine', gain: 0.06 }); },
    clic: t => { tone(2400, t, 0.03, { type: 'square', gain: 0.045 }); noise(t, 0.025, { type: 'highpass', freq: 1800, gain: 0.06 }); },
    tick: t => tone(880, t, 0.06, { type: 'sine', gain: 0.05 }),
    lluvia_sint: t => noise(t, 1.05, { type: 'highpass', freq: 2400, q: 0.4, gain: 0.05 }), // la de clima.js: respaldo de «lluvia» sin el bucle
    wrong: t => tone(300, t, 0.28, { type: 'triangle', to: 190, gain: 0.14 }),
    grito, // Grito del Yunque: graznido + ondas (src/game/v18/habilidades.js, explorar.js)
    descubrir: t => { [0, 4, 7, 12].forEach((n, k) => tone(392 * Math.pow(2, n / 12), t + k * 0.05, 0.9 - k * 0.1, { type: 'sine', gain: 0.1 })); noise(t + 0.1, 0.8, { freq: 7000, q: 0.6, gain: 0.04 }); }, // acorde corto al descubrir un lugar (fx.js)
  };
  for (const n of Object.keys(MUESTRAS)) SOUNDS[n] = (t, arg) => muestra(n, t, arg);
  const api = {
    vol, ensure, apply, log: [],
    get ctx() { return ctx; }, get master() { return master; }, // para src/game/musica.js, que cuelga su música y su ambiente del mismo master (ctx es null hasta el primer gesto)
    alSonar(fn) { if (typeof fn === 'function') oyentes.push(fn); },
    // Un ambiente en bucle no se pisa: lo que un pack define con su nombre (la lluvia de la crecida de cap1) pasa a ser su respaldo
    define(name, fn) {
      const m = MUESTRAS[name];
      if (m && m.bucle) { SOUNDS[name + '_sint'] = (t, arg) => fn(t, arg, A); m.respaldo = name + '_sint'; return; }
      SOUNDS[name] = (t, arg) => fn(t, arg, A);
    },
    sample(name, o) { MUESTRAS[name] = Object.assign({ gain: 1 }, o); SOUNDS[name] = (t, arg) => muestra(name, t, arg); cargar(name); },
    listo: name => !!bufs[name], // la muestra ya está decodificada (para pruebas)
    // T45: efectos en archivo. precargar(lista) al entrar en un modo; buffer(n) devuelve la muestra decodificada o null (y la pide);
    // enBucle[n] lo pone musica.js mientras suena el ambiente en archivo; muestras() y ficha(n) son para las pruebas.
    precargar(lista) { for (const n of [].concat(lista || [])) { if (!MUESTRAS[n]) continue; if (ctx) cargar(n); else quiere.add(n); } },
    buffer(n) { if (bufs[n]) return bufs[n]; if (MUESTRAS[n]) cargar(n); return null; },
    enBucle: {},
    muestras: () => Object.keys(MUESTRAS),
    ficha: n => MUESTRAS[n] ? Object.assign({}, MUESTRAS[n], { url: (MUESTRAS[n].url || 'assets/audio/' + n + '.') + formato() }) : null,
    has: name => !!SOUNDS[name],
    NIVEL, efectivo: n => (MUESTRAS[n] && MUESTRAS[n].lu != null ? MUESTRAS[n].lu + 20 * Math.log10(MUESTRAS[n].gain) : null), // F21: LUFS con su ganancia (pruebas)
    reducido: null, // null: lo decide el sistema (G.renderer.REDUCED); true o false lo fuerza (pruebas o ajuste del menú)
    esSuave: name => FUERTES.has(name) && (api.reducido != null ? !!api.reducido : !!(G.renderer && G.renderer.REDUCED)),
    save() { try { localStorage.setItem(STORE, JSON.stringify(vol)); } catch (e) { /* sin almacenamiento */ } },
    // BM34: martilleo al construir (n golpes cada 0,3 s). Con «Reducir movimiento» solo uno; con G.quiet no suena nada. Devuelve cuántos golpes programó.
    martillar(n) {
      if (G.quiet) return 0;
      n = (G.renderer && G.renderer.REDUCED) ? 1 : Math.max(1, n || 4);
      for (let i = 0; i < n; i++) setTimeout(() => { if (!G.quiet) api.play('martillo', i); }, i * 300);
      return n;
    },
    // Pico y RMS de la ventana de 300 ms más fuerte, sin altavoces (OfflineAudioContext). El Grito v2 se mide así.
    async medir(name, seg) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!OC || !SOUNDS[name]) return null;
      const sr = 44100, off = new OC(1, Math.ceil(sr * (seg || 1.4)), sr);
      const prev = { ctx, master, sfxBus, voiceBus, suaveBus, salida, noiseBuf };
      ctx = off; noiseBuf = null;
      master = off.createGain(); master.gain.value = 1; master.connect(off.destination);
      sfxBus = off.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
      suaveBus = off.createGain(); suaveBus.gain.value = SUAVE; suaveBus.connect(sfxBus);
      voiceBus = off.createGain(); voiceBus.gain.value = 1; voiceBus.connect(master);
      salida = sfxBus; midiendo = true;
      try {
        SOUNDS[name](0.02, name === 'grito' ? 1 : 0);
        const buf = await off.startRendering(), d = buf.getChannelData(0);
        let pico = 0;
        for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pico) pico = a; }
        const win = Math.floor(0.3 * buf.sampleRate);
        let rms = 0;
        for (let i = 0; i + win < d.length; i += Math.floor(win / 4)) {
          let s = 0; for (let k = 0; k < win; k++) s += d[i + k] * d[i + k];
          rms = Math.max(rms, Math.sqrt(s / win));
        }
        return { pico, rms };
      } finally {
        ctx = prev.ctx; master = prev.master; sfxBus = prev.sfxBus; voiceBus = prev.voiceBus;
        suaveBus = prev.suaveBus; salida = prev.salida; noiseBuf = prev.noiseBuf; midiendo = false;
      }
    },
    // Devuelve true si sonó; el registro sirve para probar sin altavoces
    play(name, arg) {
      if (!SOUNDS[name]) return false;
      nPlays++; // también los que el tope de abajo calla: el botón que pidió su sonido no se dobla con «boton»
      const now = performance.now();
      if (name === 'tick' && now - lastAt < 250) return false; // el aviso no tapa otro sonido
      lastAt = now; api.log.push(name); if (api.log.length > 40) api.log.shift();
      for (const f of oyentes) { try { f(name, arg); } catch (e) { /* un oyente no frena el sonido */ } }
      if (!ctx || ctx.state !== 'running' || vol.muted) return false;
      salida = api.esSuave(name) ? suaveBus : sfxBus;
      try { SOUNDS[name](ctx.currentTime + 0.01, arg); } catch (e) { return false; } finally { salida = sfxBus; }
      return true;
    },
  };
  // T45: «boton» al pulsar un botón de un menú (no los del juego: palanca, Acción, gestos). Si el botón ya sonó algo, no se dobla.
  let logAntes = -1;
  const BOTON_NO = '#acts, #stick, #emotes, #sys, .guia-hud, #minimapa, [data-sin-boton]';
  document.addEventListener('click', () => { logAntes = nPlays; }, true); // antes de los oyentes del botón
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('button, [role="button"], summary');
    const sono = logAntes >= 0 && nPlays !== logAntes; logAntes = -1;
    if (!b || b.disabled || sono || G.quiet || b.closest(BOTON_NO)) return;
    api.play('boton');
  });
  addEventListener('pointerdown', () => ensure(), { passive: true });
  addEventListener('keydown', () => ensure());
  return api;
});
