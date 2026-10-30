/* AVE · audio
   Sonido sintético con WebAudio (sin archivos): buses master / efectos / voz, volumen guardado y registro para probar sin altavoces.
   Sonidos base del motor: pickup, ring, dash, splash, jump, land, unlock, tick, wrong, descubrir.
   Un pack añade los suyos con G.audio.define(nombre, (t, arg, A) => ...), donde A = { tone, noise, pent }
   y la opción { bus: 'voice' } manda un tono al bus de voz.
   Muestras en archivo (assets/audio/, sintetizadas con tools/audio/juego.py; tabla en assets/audio/sonidos.json):
   aterrizar_techo, posarse_rama, despegar, nido_chispa, eclosion_huevo. Se tocan igual, con G.audio.play(nombre).
   Se piden tras el primer gesto (autoplay), .ogg o .mp3 según el navegador; mientras cargan suena un sintético
   de respaldo. Un pack registra más con G.audio.sample(nombre, { url: 'ruta/sin_extension.', gain, respaldo }).
   G.audio.alSonar(fn): fn(nombre, arg) en cada G.audio.play de un sonido que existe, suene o no (sin altavoces, con el sonido apagado o
   antes del primer gesto del jugador). Lo usan los subtítulos de sonido (src/game/accesibilidad.js); un fallo del oyente no frena el sonido. */
AVE.module('audio', function (G) {
  'use strict';
  const STORE = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.audio';
  let ctx = null, master = null, sfxBus = null, voiceBus = null, noiseBuf = null, lastAt = 0;
  const vol = { master: 0.7, sfx: 0.8, voice: 0.9, muted: false };
  const oyentes = [];
  try { const v = JSON.parse(localStorage.getItem(STORE) || 'null'); if (v && typeof v === 'object') Object.assign(vol, v); } catch (e) { /* sin almacenamiento */ }
  function apply() { if (!ctx) return; master.gain.value = vol.muted ? 0 : vol.master; sfxBus.gain.value = vol.sfx; voiceBus.gain.value = vol.voice; }
  // El navegador solo deja sonar después de un gesto del jugador
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    master = ctx.createGain(); master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
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
    src.buffer = b; g.gain.value = m.gain == null ? 1 : m.gain; src.connect(g); g.connect(sfxBus); src.start(t);
  }
  function env(g, t0, dur, peak) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
  function tone(freq, t0, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'triangle'; osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    env(g, t0, dur, o.gain || 0.2); osc.connect(g); g.connect(o.bus === 'voice' ? voiceBus : o.bus || sfxBus); osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function noise(t0, dur, o) {
    o = o || {};
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.freq || 1200, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    env(g, t0, dur, o.gain || 0.25); src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.03);
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
    tick: t => tone(880, t, 0.06, { type: 'sine', gain: 0.05 }),
    wrong: t => tone(300, t, 0.28, { type: 'triangle', to: 190, gain: 0.14 }),
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
    save() { try { localStorage.setItem(STORE, JSON.stringify(vol)); } catch (e) { /* sin almacenamiento */ } },
    // BM34: martilleo al construir (n golpes cada 0,3 s). Con «Reducir movimiento» solo uno; con G.quiet no suena nada. Devuelve cuántos golpes programó.
    martillar(n) {
      if (G.quiet) return 0;
      n = (G.renderer && G.renderer.REDUCED) ? 1 : Math.max(1, n || 4);
      for (let i = 0; i < n; i++) setTimeout(() => { if (!G.quiet) api.play('martillo', i); }, i * 300);
      return n;
    },
    // Devuelve true si sonó; el registro sirve para probar sin altavoces
    play(name, arg) {
      if (!SOUNDS[name]) return false;
      const now = performance.now();
      if (name === 'tick' && now - lastAt < 250) return false; // el aviso no tapa otro sonido
      lastAt = now; api.log.push(name); if (api.log.length > 40) api.log.shift();
      for (const f of oyentes) { try { f(name, arg); } catch (e) { /* un oyente no frena el sonido */ } }
      if (!ctx || ctx.state !== 'running' || vol.muted) return false;
      try { SOUNDS[name](ctx.currentTime + 0.01, arg); } catch (e) { return false; }
      return true;
    },
  };
  addEventListener('pointerdown', () => ensure(), { passive: true });
  addEventListener('keydown', () => ensure());
  return api;
});
