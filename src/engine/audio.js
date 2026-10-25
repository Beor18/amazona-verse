/* AVE · audio
   Sonido sintético con WebAudio (sin archivos): buses master / efectos / voz, volumen guardado y registro para probar sin altavoces.
   Sonidos base del motor: pickup, ring, dash, splash, jump, land, unlock, tick, wrong.
   Un pack añade los suyos con G.audio.define(nombre, (t, arg, A) => ...), donde A = { tone, noise, pent }
   y la opción { bus: 'voice' } manda un tono al bus de voz. */
AVE.module('audio', function (G) {
  'use strict';
  const STORE = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.audio';
  let ctx = null, master = null, sfxBus = null, voiceBus = null, noiseBuf = null, lastAt = 0;
  const vol = { master: 0.7, sfx: 0.8, voice: 0.9, muted: false };
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
    apply(); return ctx;
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
    jump: t => tone(330, t, 0.12, { type: 'square', to: 540, gain: 0.05 }),
    land: t => noise(t, 0.14, { type: 'lowpass', freq: 520, gain: 0.25 }),
    unlock: t => { [0, 2, 4, 5, 7].forEach((i, k) => tone(pent(i, 523.25), t + k * 0.09, 0.32, { gain: 0.16 })); noise(t + 0.45, 0.7, { freq: 6000, q: 0.7, gain: 0.06 }); },
    tick: t => tone(880, t, 0.06, { type: 'sine', gain: 0.05 }),
    wrong: t => tone(300, t, 0.28, { type: 'triangle', to: 190, gain: 0.14 }),
  };
  const api = {
    vol, ensure, apply, log: [],
    define(name, fn) { SOUNDS[name] = (t, arg) => fn(t, arg, A); },
    has: name => !!SOUNDS[name],
    save() { try { localStorage.setItem(STORE, JSON.stringify(vol)); } catch (e) { /* sin almacenamiento */ } },
    // Devuelve true si sonó; el registro sirve para probar sin altavoces
    play(name, arg) {
      if (!SOUNDS[name]) return false;
      const now = performance.now();
      if (name === 'tick' && now - lastAt < 250) return false; // el aviso no tapa otro sonido
      lastAt = now; api.log.push(name); if (api.log.length > 40) api.log.shift();
      if (!ctx || ctx.state !== 'running' || vol.muted) return false;
      try { SOUNDS[name](ctx.currentTime + 0.01, arg); } catch (e) { return false; }
      return true;
    },
  };
  addEventListener('pointerdown', () => ensure(), { passive: true });
  addEventListener('keydown', () => ensure());
  return api;
});
