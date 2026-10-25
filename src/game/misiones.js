/* Juego · misiones (data-driven)
   - Historia: pack.historia.pasos = lista ordenada (S.step = índice; texto: string o (S, G) => string). Un paso avanza solo si tiene "hasta" y se cumple;
     si no, lo avanza un script del pack con G.misiones.advanceTo(n).
   - Misiones secundarias: pack.misiones = [{ id, titulo, hud, pasos: [{ texto, hasta }], recompensa: { hito }, guia?, alCompletar? }].
     Se completan cuando todos sus pasos se cumplen en orden; una misión sin pasos es un hueco reservado y se ignora.
   - Recompensas: pack.ropa = [{ clave, hito, nombre, pista, viste: { slot, id, color, style } }]. Un hito es el id de una misión
     o un hito del Diario; al cumplirse se abre un cofre, se viste al protagonista y la pieza queda libre en "Mi personaje".
   Disparadores ("hasta"): función (S, G) => bool, o un objeto con cualquiera de:
     { tiene: { tipo: n } } { recogido: id|[ids] } { evento: Clave|[...] } { marca: 'ruta.en.S'|[...] } { cuenta: ['ruta', n] }
     { paso: n } { mision: id|[...] } { cerca: { x, z, r } } { todos: [...] } { alguno: [...] }. */
AVE.module('misiones', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, get = G.util.get;
  const HIST = G.pack.historia || {};
  const steps = HIST.pasos || [];
  const DONE = steps.length;
  const missions = G.pack.misiones || [];
  const activas = () => missions.filter(m => m.pasos && m.pasos.length);
  const unlocks = G.pack.ropa || [];
  const UNLOCK_KEYS = unlocks.map(u => u.clave);

  function cumple(tr) {
    if (!tr) return false;
    if (typeof tr === 'function') return !!tr(S, G);
    if (tr.todos) return tr.todos.every(cumple);
    if (tr.alguno) return tr.alguno.some(cumple);
    let ok = true;
    if (tr.tiene) ok = ok && G.objetos.has(tr.tiene);
    if (tr.recogido) ok = ok && [].concat(tr.recogido).every(id => S.collected.includes(id));
    if (tr.evento) ok = ok && [].concat(tr.evento).every(k => G.eventos.had(k));
    if (tr.marca) ok = ok && [].concat(tr.marca).every(p => !!get(S, p));
    if (tr.cuenta) ok = ok && (get(S, tr.cuenta[0]) || []).length >= tr.cuenta[1];
    if (tr.paso != null) ok = ok && S.step >= tr.paso;
    if (tr.mision) ok = ok && [].concat(tr.mision).every(id => !!S.missions[id]);
    if (tr.cerca) { const c = tr.cerca; ok = ok && Math.hypot(S.pos.x - c.x, S.pos.z - c.z) < (c.r || 2); }
    return ok;
  }
  // Cuántos pasos de una misión secundaria se cumplen en orden
  function progreso(m) { let i = 0; while (i < m.pasos.length && cumple(m.pasos[i].hasta)) i++; return i; }
  function done(id) { return !!S.missions[id]; }
  function complete(id) {
    if (S.missions[id]) return;
    const m = missions.find(x => x.id === id);
    S.missions[id] = true;
    G.eventos.log('MissionCompleted', { mission: id });
    G.emit('aprendizaje', { tipo: 'mision', id });
    grant((m && m.recompensa && m.recompensa.hito) || id);
    renderQuest(); G.guardado.autosave();
    if (m && m.alCompletar) m.alCompletar(G);
  }
  // Revisa misiones y pasos automáticos; refresca HUD, objetos visibles y guardado
  function check() {
    for (const m of activas()) if (!S.missions[m.id] && progreso(m) >= m.pasos.length) complete(m.id);
    let changed = true;
    while (changed) {
      changed = false;
      const st = steps[S.step];
      if (st && st.hasta && cumple(st.hasta)) { S.step++; changed = true; if (st.alCompletar) st.alCompletar(G); }
    }
    G.objetos.syncVisible();
    renderQuest(); G.objetos.renderInv(); G.guardado.autosave();
  }
  function advanceTo(n) { if (n > S.step) S.step = n; check(); }

  // ---------- Recompensas ----------
  function grant(hito) {
    const got = unlocks.filter(u => u.hito === hito && !S.unlocked.includes(u.clave));
    if (!got.length) return [];
    for (const u of got) {
      S.unlocked.push(u.clave);
      const w = u.viste; S.wear[w.slot] = { id: w.id, color: w.color, style: w.style };
      G.eventos.log('OutfitUnlocked', { item: u.clave, milestone: hito });
    }
    S.wear = Object.assign({}, S.wear);
    G.actores.applyWear();
    G.audio.play('unlock'); G.fx.rewardChest(); G.camara.shake(0.12, 0.3);
    if (navigator.vibrate && G.renderer.MOBILE) try { navigator.vibrate(60); } catch (e) { /* sin vibración */ }
    G.ui.toast('¡Ropa nueva: ' + got.map(u => u.nombre).join(' y ') + '! ' + G.actores.nombre + ' la estrena y ya está en Mi personaje.', 4200);
    G.guardado.autosave();
    return got;
  }
  // Pieza bloqueada para el creador: pieza entera, pieza:estilo o pieza:color (devuelve la recompensa que la libera)
  function lockOf(id, style, color) {
    for (const k of [id, id + ':' + style, id + ':' + color]) if (UNLOCK_KEYS.includes(k) && !S.unlocked.includes(k)) return unlocks.find(u => u.clave === k);
    return null;
  }

  // ---------- Guía (GDD §1: siempre hay un objetivo visible) ----------
  const at = id => { const it = G.interaccion.find(id); return it ? { x: it.x, z: it.z } : null; };
  const closest = list => { let best = null, bd = Infinity; for (const p of list) { if (!p) continue; const d = Math.hypot(S.pos.x - p.x, S.pos.z - p.z); if (d < bd) { bd = d; best = p; } } return best; };
  const needItems = cost => closest(G.objetos.recursos.filter(r => G.objetos.available(r) && S.inv[r.tipo] < cost[r.tipo]));
  function guideTarget() {
    if (S.complete) return null;
    if (HIST.guiaBloqueada && HIST.guiaBloqueada(G)) return null;
    for (const m of activas()) if (m.guia && !S.missions[m.id]) { const t = m.guia(G); if (t) return t; }
    const st = steps[S.step];
    return (st && st.guia && st.guia(G)) || null;
  }

  // ---------- HUD ----------
  function renderQuest() {
    // Número de pasos para la barra del HUD (variables CSS --n y --n-label de src/ui/ui.css)
    const el = $('steps'); el.style.setProperty('--n', steps.length); el.style.setProperty('--n-label', '"' + steps.length + '"');
    el.innerHTML = steps.map((s, i) => {
      const label = (typeof s.texto === 'function' ? s.texto(S, G) : s.texto) + (s.progreso ? s.progreso(S, G) : '');
      const cls = i < S.step ? 'done' : i === S.step ? 'now' : 'later';
      return `<li class="${cls}">${label}</li>`;
    }).join('');
    // Misiones y Diario en una línea (con forma además de color: ✓ hecho, · pendiente)
    const mk = (ok, txt) => `<span class="${ok ? 'ok' : ''}">${ok ? '✓' : '·'} ${txt}</span>`;
    const parts = activas().filter(m => m.hud).map(m => mk(!!S.missions[m.id], typeof m.hud === 'function' ? m.hud(S, G) : m.hud));
    const d = G.diario.hud();
    if (d) parts.push(mk(d.ok, d.text));
    $('missions').innerHTML = parts.join('');
    G.diario.renderButton();
    $('indicators').innerHTML = HIST.indicadores ? HIST.indicadores(S, G) : '';
  }
  // ---------- Pantalla final ----------
  // «Crear mi cómic» abre el cómic; «Seguir explorando» cierra el panel y deja el mundo libre con la partida terminada
  // (S.explorando, que se guarda: al recargar el panel no vuelve a abrirse solo); «Jugar de nuevo» borra la partida y el
  // cómic, así que primero pregunta DENTRO del juego (#end-confirm; nunca confirm()). Esc cancela la pregunta o, sin
  // pregunta, cierra el panel como «Seguir explorando».
  const FIN_PRINCIPAL = ['end-title', 'end-text', 'end-acciones'];
  const confirmando = () => { const c = $('end-confirm'); return !!c && !c.hidden; };
  function verConfirmacion(on, foco) {
    const c = $('end-confirm'); if (!c) return;
    c.hidden = !on;
    for (const id of FIN_PRINCIPAL) { const el = $(id); if (el) el.hidden = !!on; }
    if (foco !== false && !$('end').hidden) { const b = $(on ? 'b-again-no' : 'b-again'); if (b) b.focus({ preventScroll: true }); }
  }
  function showEnd() {
    $('end-text').textContent = HIST.fin ? HIST.fin(S, G) : '';
    verConfirmacion(false, false);
    $('end').hidden = false;
  }
  function seguirExplorando() {
    if (!S.complete || $('end').hidden) return false;
    S.explorando = true;
    verConfirmacion(false, false);
    $('end').hidden = true;
    G.guardado.autosave();
    if (!G.quiet) G.ui.toast('Tu cómic te espera en el menú de pausa', 4000);
    return true;
  }
  function jugarDeNuevo() { verConfirmacion(false, false); $('end').hidden = true; G.guardado.reset(); }
  const alPulsar = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  alPulsar('b-seguir', seguirExplorando);
  alPulsar('b-again', () => verConfirmacion(true));
  alPulsar('b-again-no', () => verConfirmacion(false));
  alPulsar('b-again-si', jugarDeNuevo);
  G.on('escape', () => { if ($('end').hidden) return; if (confirmando()) verConfirmacion(false); else seguirExplorando(); });

  G.on('render', () => { G.fx.guide(G.ui.busy() ? null : guideTarget(), performance.now() / 1000); }, 60);
  G.on('apply', () => { verConfirmacion(false, false); if (S.complete && !S.explorando) showEnd(); else $('end').hidden = true; }, 70);
  G.on('apply', renderQuest, 90);

  return { steps, DONE, missions, unlocks, cumple, progreso, done, complete, check, advanceTo, grant, lockOf, guideTarget, at, closest, needItems, renderQuest, showEnd, seguirExplorando };
});
