/* Juego · CG-41. Trucos de vuelo con combos. Nada de anillos.
   Tonel, looping, picado en barrena, rasante y aterrizaje perfecto. Encadenados en 4 s:
   2 = «¡Plumas al viento!», 3 o más = «¡Cotorra loca!». Contador, sonido y el juice de fx.js.
   El récord se guarda en el dispositivo y sale con G.emit('record'). Teclado y un latigazo horizontal.
   window.AVTrucos(G) → { anotar, test }. Prueba: AV.trucosTest(). */
window.AVTrucos = function (G) {
  'use strict';
  if (G.trucos) return G.trucos;
  const S = G.S, M = G.fisica.MOVE;
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.trucos';
  const NOMBRE = { tonel: '¡Tonel!', looping: '¡Looping!', barrena: '¡Barrena!', rasante: '¡Rasante!', perfecto: '¡Perfecto!' };
  const VENTANA = 4;
  let combo = 0, ultimo = 0, mejor = 0, ultimoId = '', aire = 0;
  try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && d.mejor) mejor = d.mejor; } catch (e) { /* sin almacén */ }
  if (G.audio && G.audio.define) {
    try { G.audio.define('truco', (t, n, X) => { X.tone(523 * Math.pow(2, Math.min(n || 1, 8) / 12), t, 0.2, { type: 'triangle', gain: 0.06 }); }); } catch (e) { /* ya estaba */ }
  }
  const chip = document.createElement('div');
  chip.id = 'truco-chip'; chip.hidden = true; chip.setAttribute('aria-live', 'polite');
  chip.style.cssText = 'position:fixed;left:0;right:0;top:18%;margin:auto;width:fit-content;z-index:6;pointer-events:none;padding:8px 18px;border-radius:999px;background:#10324a;color:#fff;border:3px solid #7fd3ff;font:800 22px/1.2 sans-serif';
  document.body.appendChild(chip);
  let chipT = 0;
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  function titulo(n, id) {
    if (n >= 3) return en() ? 'Silly parrot!' : '¡Cotorra loca!';
    if (n === 2) return en() ? 'Feathers in the wind!' : '¡Plumas al viento!';
    const es = { tonel: '¡Tonel!', looping: '¡Looping!', barrena: '¡Barrena!', rasante: '¡Rasante!', perfecto: '¡Perfecto!' };
    const eng = { tonel: 'Barrel roll!', looping: 'Loop!', barrena: 'Spin dive!', rasante: 'Skim!', perfecto: 'Perfect landing!' };
    return (en() ? eng : es)[id] || NOMBRE[id] || id;
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, mejor })); } catch (e) { /* sin almacén */ } }
  function anotar(id) {
    if (!id || !NOMBRE[id]) return combo;
    const ahora = S.clock || performance.now() / 1000;
    combo = (ahora - ultimo < VENTANA) ? combo + 1 : 1;
    ultimo = ahora; ultimoId = id;
    if (combo > mejor) { mejor = combo; guardar(); G.emit('record', { modo: 'trucos', combo, nombre: titulo(combo, id) }); }
    chip.textContent = titulo(combo, id) + '  ×' + combo; chip.hidden = false; chipT = 1.6;
    if (G.audio && G.audio.play) { try { G.audio.play('truco', combo); } catch (e) { /* sin audio */ } }
    if (G.fx && G.fx.burst) G.fx.burst(S.pos.x, S.pos.y + 0.4, S.pos.z, 'feathers', 8 + combo);
    return combo;
  }
  const teclas = { a: 0, d: 0, espacio: 0, c: 0, giro: 0 };
  addEventListener('keydown', e => {
    if (!M.flying || G.quiet) return;
    const k = e.key.toLowerCase();
    const ahora = performance.now();
    if ((k === 'a' || k === 'd') && !e.repeat && ahora - teclas[k] < 450) anotar('tonel');
    if (k === 'a' || k === 'd') teclas[k] = ahora;
    if (e.key === ' ' && !e.repeat) teclas.espacio = ahora;
    if (k === 'c' && !e.repeat && ahora - teclas.espacio < 1000) anotar('looping');
    if (k === 'c') teclas.c = ahora;
  });
  let flick = null;
  const canvas = G.renderer.canvas;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') flick = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (!flick || flick.id !== e.pointerId || !M.flying) { flick = null; return; }
    const dx = e.clientX - flick.x, dy = e.clientY - flick.y, dt = performance.now() - flick.t;
    if (dt < 340 && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) anotar('tonel');
    flick = null;
  });
  G.on('update', dt => {
    const d = Math.min(0.05, dt || 0);
    if (chipT > 0) { chipT -= d; if (chipT <= 0) chip.hidden = true; }
    if (!M.flying) { aire = 0; return; }
    aire = (M.speed || 0);
    const agua = G.agua && G.agua.levelAt ? G.agua.levelAt(S.pos.x, S.pos.z) : -999;
    const suelo = G.terreno.height(S.pos.x, S.pos.z);
    const alto = S.pos.y - Math.max(agua, suelo);
    if (alto > 0.15 && alto < 1.15 && aire > 6 && (S.clock || 0) - (teclas.ras || 0) > 1.2) { teclas.ras = S.clock || 0; anotar('rasante'); }
    const girando = !!(G.input && (G.input.keys.has('a') || G.input.keys.has('d') || Math.abs(G.input.stick.x) > 0.45));
    if (G.input && G.input.keys.has('c') && girando) teclas.giro += d; else teclas.giro = 0;
    if (teclas.giro > 0.4) { teclas.giro = -2; anotar('barrena'); }
  });
  G.on('vuelo', on => { if (!on && aire > 0 && aire < 2.2) anotar('perfecto'); if (!on) aire = 0; });

  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guard = { flying: M.flying, clock: S.clock, quiet: G.quiet, x: S.pos.x, y: S.pos.y, z: S.pos.z };
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
    const records = [];
    const oy = d => records.push(d);
    G.on('record', oy);
    const antesMejor = mejor;
    try {
      G.quiet = false; combo = 0; ultimo = 0; mejor = 0; S.clock = 100;
      anotar('tonel');
      ok('Un tonel abre el combo', combo === 1 && /Tonel|Barrel/.test(chip.textContent), chip.textContent);
      S.clock = 101; anotar('looping');
      ok('El segundo es «¡Plumas al viento!»', combo === 2 && /Plumas|Feathers/.test(chip.textContent), chip.textContent);
      S.clock = 102; anotar('barrena');
      ok('El tercero es «¡Cotorra loca!»', combo === 3 && /Cotorra|Silly/.test(chip.textContent), chip.textContent);
      ok('El récord se guarda y avisa', mejor >= 3 && records.some(r => r.modo === 'trucos' && r.combo >= 3), String(mejor));
      S.clock = 200; anotar('rasante');
      ok('Pasados 4 s el combo vuelve a 1', combo === 1, String(combo));
      M.flying = true;
      canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 31, pointerType: 'touch', clientX: 200, clientY: 300, bubbles: true }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 31, pointerType: 'touch', clientX: 320, clientY: 310, bubbles: true }));
      ok('Un latigazo horizontal hace un tonel', ultimoId === 'tonel', ultimoId);
      S.clock = 300; combo = 0; ultimo = 0;
      dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      ok('Doble A en vuelo hace un tonel', ultimoId === 'tonel' && combo === 1, ultimoId + ' ×' + combo);
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    M.flying = guard.flying; S.clock = guard.clock; G.quiet = guard.quiet;
    S.pos.x = guard.x; S.pos.y = guard.y; S.pos.z = guard.z;
    mejor = antesMejor; chip.hidden = true;
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.trucos = { anotar, test, get combo() { return combo; }, get mejor() { return mejor; } };
  return G.trucos;
};
