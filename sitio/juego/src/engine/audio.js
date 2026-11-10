/* AVE · audio
   Sonido sintético con WebAudio (sin archivos): buses master / efectos / voz, volumen guardado y registro para probar sin altavoces.
   Sonidos base del motor: pickup, ring, dash, splash, jump, land, unlock, tick, wrong, descubrir, grito (graznido + ondas del Grito).
   Un pack añade los suyos con G.audio.define(nombre, (t, arg, A) => ...), donde A = { tone, noise, pent }
   y la opción { bus: 'voice' } manda un tono al bus de voz.
   Muestras en archivo (assets/audio/, sintetizadas con tools/audio/juego.py; tabla en assets/audio/sonidos.json):
   aterrizar_techo, posarse_rama, despegar, nido_chispa, eclosion_huevo. Se tocan igual, con G.audio.play(nombre).
   Se piden tras el primer gesto (autoplay), .ogg o .mp3 según el navegador; mientras cargan suena un sintético
   de respaldo. Un pack registra más con G.audio.sample(nombre, { url: 'ruta/sin_extension.', gain, respaldo }).
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
    apply(); Object.keys(MUESTRAS).forEach(cargar); return ctx;
  }
  // Muestras en archivo: bus de efectos, mismo silencio y volumen que los sintéticos
  const MUESTRAS = {
    aterrizar_techo: { gain: 0.9, respaldo: 'land' },
    posarse_rama: { gain: 0.9, respaldo: 'land' },
    despegar: { gain: 0.8, respaldo: 'jump' },
    nido_chispa: { gain: 0.8, respaldo: 'tick' },
    eclosion_huevo: { gain: 0.9, respaldo: 'unlock' },
  };
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
  function cargar(n) {
    if (!ctx || bufs[n] || pedidas[n]) return;
    const m = MUESTRAS[n];
    pedidas[n] = fetch((m.url || 'assets/audio/' + n + '.') + formato())
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .catch(() => desdeB64(n))
      .then(ab => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(() => {}); }))
      .then(b => { bufs[n] = b; }, () => { /* se queda el respaldo sintético */ });
  }
  function muestra(n, t) {
    const b = bufs[n], m = MUESTRAS[n];
    if (!b) { cargar(n); if (m.respaldo && SOUNDS[m.respaldo]) SOUNDS[m.respaldo](t); return; }
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = b; g.gain.value = m.gain == null ? 1 : m.gain; src.connect(g); g.connect(salida); src.start(t);
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
    aleteo: (t, v) => noise(t, 0.12, { type: 'bandpass', freq: 380 + Math.min(1, (v || 0) / 20) * 420, to: 160, q: 0.7, gain: 0.07 }), // BM22: golpe de alas; el ritmo lo marca fisica.js según la velocidad
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
    wrong: t => tone(300, t, 0.28, { type: 'triangle', to: 190, gain: 0.14 }),
    grito, // Grito del Yunque: graznido + ondas (src/game/v18/habilidades.js, explorar.js)
    descubrir: t => { [0, 4, 7, 12].forEach((n, k) => tone(392 * Math.pow(2, n / 12), t + k * 0.05, 0.9 - k * 0.1, { type: 'sine', gain: 0.1 })); noise(t + 0.1, 0.8, { freq: 7000, q: 0.6, gain: 0.04 }); }, // acorde corto al descubrir un lugar (fx.js)
  };
  for (const n of Object.keys(MUESTRAS)) SOUNDS[n] = t => muestra(n, t);
  const api = {
    vol, ensure, apply, log: [],
    get ctx() { return ctx; }, get master() { return master; }, // para src/game/musica.js, que cuelga su música y su ambiente del mismo master (ctx es null hasta el primer gesto)
    alSonar(fn) { if (typeof fn === 'function') oyentes.push(fn); },
    define(name, fn) { SOUNDS[name] = (t, arg) => fn(t, arg, A); },
    sample(name, o) { MUESTRAS[name] = Object.assign({ gain: 1 }, o); SOUNDS[name] = t => muestra(name, t); cargar(name); },
    listo: name => !!bufs[name], // la muestra ya está decodificada (para pruebas)
    has: name => !!SOUNDS[name],
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
      salida = sfxBus;
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
        suaveBus = prev.suaveBus; salida = prev.salida; noiseBuf = prev.noiseBuf;
      }
    },
    // Devuelve true si sonó; el registro sirve para probar sin altavoces
    play(name, arg) {
      if (!SOUNDS[name]) return false;
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
  addEventListener('pointerdown', () => ensure(), { passive: true });
  addEventListener('keydown', () => ensure());
  return api;
});
