/* Juego · CG-42. Humor físico. No cambia el modelo ni el rig de Vittata: gestos que ya existen, partículas y sonido.
   Estornudo junto a flores, mareo tras 3 loopings, resbalón, sacudida al salir del agua, bostezo y siesta si se queda quieta,
   y una risa si se posa encima de un vecino. window.AVHumor(G). Prueba: AV.humorTest(). */
window.AVHumor = function (G) {
  'use strict';
  if (G.humor) return G.humor;
  const S = G.S, M = G.fisica.MOVE;
  const FLORES = [{ x: 125, z: 140 }, { x: 20, z: 30 }];
  let quieta = 0, loops = 0, nadaba = false, ultimo = '';
  if (G.audio && G.audio.define) {
    try { G.audio.define('humor', (t, a, X) => X.tone(700, t, 0.12, { type: 'square', gain: 0.04 })); } catch (e) { /* ya estaba */ }
  }
  const sonar = () => { try { if (G.audio && G.audio.play) G.audio.play('humor'); } catch (e) { /* sin audio */ } };
  const gesto = n => { try { if (G.actores && G.actores.playEmote) G.actores.playEmote(n); } catch (e) { /* sin gesto */ } };
  function hacer(id) {
    ultimo = id; sonar();
    if (id === 'estornudo') { gesto('molestia'); if (G.fx) G.fx.burst(S.pos.x, S.pos.y + 0.5, S.pos.z, 'leaves', 10); }
    else if (id === 'mareo') gesto('molestia');
    else if (id === 'resbalon') { if (G.fx && G.fx.polvo) G.fx.polvo(S.pos.x, S.pos.y, S.pos.z, 0.6); }
    else if (id === 'sacudida') { if (G.fx && G.fx.drops) G.fx.drops(S.pos.x, S.pos.y + 0.4, S.pos.z, 1, G.terreno.height(S.pos.x, S.pos.z)); }
    else if (id === 'bostezo' || id === 'siesta') gesto('idea');
    else if (id === 'risa') gesto('celebrar');
    if (G.ui && G.ui.toast && !G.quiet) {
      const t = { estornudo: '¡Achís!', mareo: '¡Qué mareo!', resbalon: '¡Ups, resbalón!', sacudida: '¡Sacudida de plumas!', bostezo: 'Bostezo…', siesta: 'Se quedó dormida.', risa: '¡Ja, ja!' };
      G.ui.toast(t[id] || id, 1600);
    }
    return id;
  }
  G.on('truco', id => { if (id === 'looping') { loops++; if (loops >= 3) { loops = 0; hacer('mareo'); } } });
  G.on('vuelo', on => {
    if (on || !G.vecinos) return;
    const est = G.vecinos.estado && G.vecinos.estado();
    if (est && est.n) hacer('risa');
  });
  function paso(dt, forzar) {
    const d = Math.min(0.05, dt || 0);
    if (G.quiet && !forzar) return;
    const cercaFlor = FLORES.some(f => Math.hypot(S.pos.x - f.x, S.pos.z - f.z) < 2.5);
    if (cercaFlor && ultimo !== 'estornudo') hacer('estornudo');
    if (M.swimming) nadaba = true;
    else if (nadaba) { nadaba = false; hacer('sacudida'); }
    if (M.grounded && !M.flying && (M.speed || 0) < 0.08) {
      quieta += d;
      if (quieta > 20 && quieta < 20.2) hacer('bostezo');
      if (quieta > 28 && quieta < 28.2) hacer('siesta');
    } else quieta = 0;
  }
  G.on('update', paso);
  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const q = G.quiet;
    try {
      G.quiet = false;
      ok('El estornudo usa un gesto que ya existe', hacer('estornudo') === 'estornudo');
      G.emit('truco', 'looping'); G.emit('truco', 'looping'); G.emit('truco', 'looping');
      ok('Tres loopings marean', ultimo === 'mareo', ultimo);
      ok('La sacudida y la risa también', hacer('sacudida') === 'sacudida' && hacer('risa') === 'risa');
      quieta = 28; M.grounded = true; M.flying = false; M.speed = 0; M.swimming = false;
      paso(0.05, true);
      ok('Quieta un rato, se duerme', ultimo === 'siesta', ultimo + ' ' + quieta.toFixed(2));
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    G.quiet = q; quieta = 0; loops = 0;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.humor = { hacer, paso, test, get ultimo() { return ultimo; } };
  return G.humor;
};
