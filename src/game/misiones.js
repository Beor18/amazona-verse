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
  // ---------- F4 · Sensación de juego (docs/diseno/F4_GAME_FEEL.md 1 y 2) ----------
  // Paso cumplido: «logro», el tramo de la barra se llena con un barrido de 400 ms y el objetivo nuevo entra deslizando
  // (clases recien/entra de ui.css: con «Reducir movimiento» la regla global de ui.css las deja quietas). Misión cumplida sin
  // ropa: «logro», ráfaga dorada sobre Vittata y su chip salta (G.fx.saltar ya respeta «Reducir movimiento»). Un solo
  // «logro» cada 1,5 s (el paso y la misión del mismo momento no se doblan, ni con el «unlock» de la ropa ni con el final del
  // capítulo, que tiene su panel_final). Con G.quiet (baterías) no suena ni salta nada; las clases sí se ponen.
  const feel = { pasos: 0, misiones: 0, saltos: 0 };
  let logroT = -1e9, recien = null; // recien: { de, a } pasos que entraron en este momento (lo gasta el siguiente renderQuest)
  function logro() {
    const t = performance.now(); if (G.quiet || t - logroT < 1500) return false;
    logroT = t; G.audio.play('logro'); return true;
  }
  function celebrarPaso(antes) {
    if (S.step <= antes) return;
    recien = { de: antes, a: S.step }; feel.pasos++;
    if (S.step < DONE) logro();
  }
  function celebrarMision(m) {
    feel.misiones++;
    if (G.quiet) return;
    logro();
    try { G.fx.burst(S.pos.x, S.pos.y + 1.7, S.pos.z, 'gold', 20); } catch (e) { /* sin efectos */ }
    const i = activas().filter(x => x.hud).indexOf(m), chip = i >= 0 && $('missions') ? $('missions').children[i] : null;
    if (chip && G.fx.saltar && G.fx.saltar(chip)) feel.saltos++;
  }
  feel.celebrar = celebrarMision; // las pruebas lo miran sin pasar por los oyentes de «aprendizaje»
  // F4-9: al reunir todos los materiales (se cumple un paso con hasta: { tiene }), «logro» (el del paso: no se dobla), los
  // contadores de esos materiales saltan en cadena (uno cada 120 ms) y aviso «¡Lo tienes todo!». «Reducir movimiento» (sistema o
  // menú): sin saltos; el aviso y el sonido se quedan. Con G.quiet (baterías), nada (feel.todo sí cuenta).
  const TODO = { cadenaMs: 120, avisoMs: 2600 };
  const movReducido = () => !!(G.renderer.REDUCED || (G.audio && G.audio.reducido === true) || document.documentElement.classList.contains('mov-reducido'));
  feel.todo = 0; feel.cadena = 0;
  function saltaContador(k) { const el = G.objetos.contador && G.objetos.contador(k); if (el && G.fx.saltar && G.fx.saltar(el)) feel.cadena++; }
  function celebrarTodo(cost) {
    feel.todo++;
    if (G.quiet) return;
    logro();
    G.ui.toast('¡Lo tienes todo!', TODO.avisoMs, { ya: true }); // lo que acaba de hacer: sale al momento
    if (movReducido()) return;
    Object.keys(cost).forEach((k, i) => { if (i) setTimeout(saltaContador, i * TODO.cadenaMs, k); else saltaContador(k); });
  }
  feel.celebrarTodo = celebrarTodo;
  function complete(id) {
    if (S.missions[id]) return;
    const m = missions.find(x => x.id === id);
    S.missions[id] = true;
    G.eventos.log('MissionCompleted', { mission: id });
    G.emit('aprendizaje', { tipo: 'mision', id });
    const ropa = grant((m && m.recompensa && m.recompensa.hito) || id);
    renderQuest(); G.guardado.autosave();
    if (!ropa.length && m) celebrarMision(m); // F4-2 (con ropa ya hay cofre, sacudida y aviso)
    if (m && m.alCompletar) m.alCompletar(G);
  }
  // Revisa misiones y pasos automáticos; refresca HUD, objetos visibles y guardado
  function check(antesDe) {
    const antes = typeof antesDe === 'number' ? antesDe : S.step;
    for (const m of activas()) if (!S.missions[m.id] && progreso(m) >= m.pasos.length) complete(m.id);
    let changed = true, todo = null;
    while (changed) {
      changed = false;
      const st = steps[S.step];
      if (st && st.hasta && cumple(st.hasta)) { S.step++; changed = true; if (st.hasta.tiene) todo = st.hasta.tiene; if (st.alCompletar) st.alCompletar(G); }
    }
    celebrarPaso(antes); // F4-1
    G.objetos.syncVisible();
    renderQuest(); G.objetos.renderInv(!!todo); G.guardado.autosave(); // F4-8: con todo reunido, el «encaje» del contador calla
    if (todo) celebrarTodo(todo); // F4-9
  }
  function advanceTo(n) { const antes = S.step; if (n > S.step) S.step = n; check(antes); }

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
    G.audio.play('unlock'); logroT = performance.now(); G.fx.rewardChest(); G.camara.shake(0.12, 0.3); // F4: el «logro» del paso no se dobla con este
    // Sin un toque previo Chrome bloquea la vibración y lo anota como error de consola (BC2)
    if (navigator.vibrate && G.renderer.MOBILE && !(navigator.userActivation && !navigator.userActivation.hasBeenActive)) try { navigator.vibrate(60); } catch (e) { /* sin vibración */ }
    G.ui.toast('¡Ropa nueva: ' + got.map(u => u.nombre).join(' y ') + '! ' + G.actores.nombre + ' la estrena y ya está en Mi personaje.', 4200);
    G.guardado.autosave();
    return got;
  }
  // Pieza bloqueada para el creador: pieza entera, pieza:estilo o pieza:color (devuelve la recompensa que la libera)
  // Los colores del Mercadito del río (pack.tienda.ropa, src/game/tienda.js) se liberan al comprarlos: la pista dice dónde y cuánto.
  const TIENDA = (G.pack.tienda && G.pack.tienda.ropa) || [];
  function lockOf(id, style, color) {
    for (const k of [id, id + ':' + style, id + ':' + color]) if (UNLOCK_KEYS.includes(k) && !S.unlocked.includes(k)) return unlocks.find(u => u.clave === k);
    for (const k of [id + ':' + color]) { const t = TIENDA.find(u => u.clave === k); if (t && !S.unlocked.includes(k)) return { clave: k, nombre: t.nombre, tienda: t.id, pista: 'el Mercadito del río (' + t.precio + ' conchitas)' }; }
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
  // «Próximo: <premio> · <pista>» bajo el objetivo (DIVERSION_CAP1 mejora 2: lo que se gana se ve antes de ganarlo).
  // El premio es la primera pieza de pack.ropa que aún no se tiene, en el orden del pack; con todo ganado o el capítulo
  // terminado no se muestra. El elemento y su estilo los pone este módulo (ui.css es de otro carril); el <style> va dentro
  // de #quest para que la maqueta móvil de accesibilidad.js (copia #top con sus hojas enlazadas) lo lleve. La línea se
  // oculta donde no cabe: pantallas bajas (teléfono apaisado: el objetivo no debe pisar los controles), teléfonos de 320 px
  // y, con el texto más grande (a11y-t2), hasta 560 px (ahí los subtítulos de sonido van debajo de #quest y no deben
  // llegar a los botones de acción ni al diálogo).
  function proximoPremio() { return S.complete ? null : unlocks.find(u => u.pista && !S.unlocked.includes(u.clave)) || null; }
  const ESTILO_PROXIMO = '#next-reward{display:flex;align-items:baseline;gap:6px;margin:8px 0 0;font:400 var(--fs-xs,12px)/1.35 var(--font-body,sans-serif);color:var(--c-text)}' +
    '#next-reward[hidden]{display:none}#next-reward .nr-k{flex:none;font-weight:700;text-transform:uppercase;letter-spacing:var(--tracking-caps,.04em);color:var(--c-eyebrow,inherit)}' +
    '#next-reward b{font:700 var(--fs-sm,14px)/1.3 var(--font-display,inherit);color:var(--c-primary,#f2a03d)}#next-reward .nr-p{opacity:.85}' +
    '@media (max-height:480px){#next-reward{display:none}}@media (max-width:360px){#next-reward{display:none}}@media (max-width:560px){html.a11y-t2 #next-reward{display:none}}';
  function cajaProximo() {
    let el = $('next-reward');
    if (el) return el;
    const steps = $('steps'); if (!steps || !steps.parentNode) return null;
    if (!document.getElementById('estilo-proximo')) { const st = document.createElement('style'); st.id = 'estilo-proximo'; st.textContent = ESTILO_PROXIMO; steps.parentNode.insertBefore(st, steps.nextSibling); }
    el = document.createElement('div'); el.id = 'next-reward'; el.hidden = true;
    const ancla = document.getElementById('estilo-proximo') || steps;
    ancla.parentNode.insertBefore(el, ancla.nextSibling);
    return el;
  }
  function renderProximo() {
    const el = cajaProximo(); if (!el) return null;
    const u = proximoPremio();
    el.hidden = !u;
    if (u) {
      const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      el.innerHTML = `<span class="nr-k">Próximo:</span> <b>${esc(u.nombre)}</b> <span class="nr-p">· ${esc(u.pista)}</span>`;
    } else el.textContent = '';
    return u;
  }
  function renderQuest() {
    // Número de pasos para la barra del HUD (variables CSS --n y --n-label de src/ui/ui.css)
    const el = $('steps'); el.style.setProperty('--n', steps.length); el.style.setProperty('--n-label', '"' + steps.length + '"');
    const r = recien; recien = null; // F4-1: el tramo recién cumplido barre y el objetivo nuevo entra (solo en este dibujo)
    el.innerHTML = steps.map((s, i) => {
      const label = (typeof s.texto === 'function' ? s.texto(S, G) : s.texto) + (s.progreso ? s.progreso(S, G) : '');
      const cls = (i < S.step ? 'done' : i === S.step ? 'now' : 'later') + (r && i >= r.de && i < r.a ? ' recien' : '') + (r && i === S.step ? ' entra' : '');
      return `<li class="${cls}">${label}</li>`;
    }).join('');
    renderProximo();
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
  // «Ver mi cómic» abre el cómic; «Seguir explorando» cierra el panel y deja el mundo libre con la partida terminada
  // (S.explorando, que se guarda: al recargar el panel no vuelve a abrirse solo); «Comenzar de cero» borra la partida y el
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
  // F4-12 (docs/diseno/F4_GAME_FEEL.md): fin del capítulo. Antes del panel, 1,2 s de fiesta: suena panel_final, Vittata celebra
  // (el gesto Celebrar, clip Celebrate; volando o si no puede, el clip directamente) y caen 30 pétalos; luego entra el panel.
  // Sin espera con G.quiet (baterías) ni al cargar una partida ya terminada ('apply': la repetición). «Reducir movimiento»: sin
  // pétalos (el gesto, el sonido y la espera se quedan). Llamar otra vez durante la fiesta no la repite.
  // La espera va con el reloj del juego (gancho 'update': con la pausa dt = 0 y en segundo plano no corre) y, si al acabar hay otra
  // pantalla delante (el cómic de cierre del cap. 6, un diálogo o una tarjeta; con la pausa el reloj no corre), el panel espera a que se cierre.
  // Si otra pantalla lo abre antes (c-close del cómic), el texto ya está puesto y la fiesta se da por terminada.
  const FIN = { celebraMs: 1200, petalos: 30 };
  feel.fin = 0; feel.finPetalos = 0; feel.finEsperas = 0; feel.FIN = FIN;
  let finEspera = 0, finFiesta = false, finForzada = false;
  function celebrarFin() {
    feel.fin++;
    try { G.audio.play('panel_final'); } catch (e) { /* sin audio */ } // T45: capítulo completado (una vez: el panel ya no lo repite)
    const A = G.actores;
    try { if (!(A.playEmote && A.playEmote('celebrar')) && A.player3D && A.player3D.play) A.player3D.play('Celebrate', true); } catch (e) { /* sin modelo */ }
    // Los pétalos, sobre la cabeza y 1,2 m hacia la cámara: delante de Vittata, no en un racimo contra el techo de detrás
    if (!movReducido()) {
      try {
        const c = G.renderer.camera.position, dx = c.x - S.pos.x, dz = c.z - S.pos.z, d = Math.hypot(dx, dz) || 1, k = Math.min(1.2, d * 0.4) / d;
        G.fx.petalos(S.pos.x + dx * k, S.pos.y + 1.6, S.pos.z + dz * k, FIN.petalos); feel.finPetalos++;
      } catch (e) { /* sin efectos */ }
    }
  }
  function cancelarFiesta() { finEspera = 0; finFiesta = false; finForzada = false; }
  // (la pausa y la portada no hace falta mirarlas: con ellas el bucle pasa dt = 0 y la fiesta no avanza)
  const tapado = () => { try { return G.ui.busy(); } catch (e) { return false; } };
  G.on('update', dt => {
    if (!finEspera) return;
    if (!$('end').hidden) { if (S.complete || finForzada) showEnd(true); else cancelarFiesta(); return; } // otra pantalla ya lo abrió
    if (finEspera > 0) { finEspera = Math.max(0, finEspera - dt * 1000) || -1; return; }
    if (!(S.complete || finForzada)) { cancelarFiesta(); return; }
    if (tapado()) { feel.finEsperas++; return; } // termina la fiesta con otra pantalla delante: espera a que se cierre
    showEnd(true);
  }, 62);
  function rellenarFin() { $('end-text').textContent = HIST.fin ? HIST.fin(S, G) : ''; }
  function showEnd(ya, o) {
    const fiesta = ya !== true && $('end').hidden && (!G.quiet || (o && o.fiesta));
    if (fiesta && finEspera) return; // ya está celebrando: el panel llega solo
    if (fiesta) {
      celebrarFin(); finFiesta = true; finForzada = !!(o && o.fiesta);
      rellenarFin(); // por si otra pantalla (el cómic) lo abre antes de que acabe la fiesta
      finEspera = FIN.celebraMs;
      return;
    }
    const sonado = finFiesta; cancelarFiesta();
    rellenarFin();
    verConfirmacion(false, false);
    // T2: el aviso que estaba en pantalla se va y no vuelve; los que lleguen con el panel abierto esperan a que se cierre (G.ui)
    try { G.ui.hideToast(); } catch (e) { /* sin HUD */ }
    if ($('end').hidden && !G.quiet && !sonado) try { G.audio.play('panel_final'); } catch (e) { /* sin audio */ } // T45: capítulo completado
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
  function comenzarDeCero() { verConfirmacion(false, false); $('end').hidden = true; G.guardado.reset(); }
  const alPulsar = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  alPulsar('b-seguir', seguirExplorando);
  alPulsar('b-again', () => verConfirmacion(true));
  alPulsar('b-again-no', () => verConfirmacion(false));
  alPulsar('b-again-si', comenzarDeCero);
  G.on('escape', () => { if ($('end').hidden) return; if (confirmando()) verConfirmacion(false); else seguirExplorando(); });

  G.on('render', () => { G.fx.guide(G.ui.busy() ? null : guideTarget(), performance.now() / 1000); }, 60);
  G.on('apply', () => { verConfirmacion(false, false); cancelarFiesta(); if (S.complete && !S.explorando) showEnd(true); else $('end').hidden = true; }, 70);
  G.on('apply', renderQuest, 90);

  // ---------- T8 · Pista «vuela» ----------
  // Con el objetivo más de VUELA_DY m por encima de Vittata (la plaza de la Ciudad de los 36 en el cap. 6, la meseta del cap. 5
  // desde abajo…) y ella sin volar, bajo el objetivo sale «↑ Vuela: está en lo alto». Se mira cada 0,5 s; nada se escribe en la partida.
  const VUELA_DY = 6;
  let vuelaT = 0;
  // T28: ¿a pie no se llega? En línea recta hacia el objetivo (a más de 8 m): agua de por medio, un escalón de más de 1,6 m
  // entre dos muestras seguidas (un barranco o un acantilado) o un muro a la altura del pecho. Es una estimación barata (cada 0,5 s)
  function aPieNo(t) {
    const dx = t.x - S.pos.x, dz = t.z - S.pos.z, L = Math.hypot(dx, dz); if (L < 8) return false;
    const n = Math.min(40, Math.ceil(L / 1.5)); let hPrev = G.terreno.height(S.pos.x, S.pos.z);
    for (let i = 1; i <= n; i++) {
      const x = S.pos.x + dx * i / n, z = S.pos.z + dz * i / n, h = G.terreno.height(x, z);
      if (Math.abs(h - hPrev) > 1.6) return true;
      try { if (G.agua && G.agua.levelAt && G.agua.levelAt(x, z) - h > 0.6) return true; } catch (e) { /* sin agua */ }
      try { if (i < n - 2 && G.solidos && G.solidos.activo && G.solidos.dentro(x, z, h + 1) > -Infinity) return true; } catch (e) { /* sin sólidos */ } // el sólido del propio objetivo (una casa, un tronco) no cuenta
      hPrev = h;
    }
    return false;
  }
  function pistaVuela() {
    const steps = $('steps'); if (!steps || !steps.parentNode) return false;
    let el = $('pista-vuela');
    let t = null; try { t = guideTarget(); } catch (e) { t = null; }
    const M = G.fisica && G.fisica.MOVE;
    const alto = t ? (t.y != null ? t.y : G.terreno.height(t.x, t.z)) : null;
    // T28: tampoco durante el rescate, un minijuego u otra actividad (allí el objetivo de la historia no es lo que se busca)
    let escena = false; try { escena = !!(G.ui.enEscena && G.ui.enEscena()); } catch (e) { escena = false; }
    const libre = !!(t && !(M && (M.flying || M.swimming)) && !escena);
    const enAlto = libre && alto - S.pos.y > VUELA_DY;
    const sinCamino = libre && !enAlto && aPieNo(t);
    const ver = enAlto || sinCamino;
    if (!el) {
      if (!ver) return false;
      el = document.createElement('div'); el.id = 'pista-vuela'; el.setAttribute('role', 'status');
      el.style.cssText = 'margin:6px 0 0;font:700 var(--fs-xs,12px)/1.3 var(--font-body,sans-serif);color:var(--c-primary,#f2a03d)';
      steps.parentNode.insertBefore(el, steps.nextSibling);
    }
    if (ver) { const txt = enAlto ? '↑ Vuela: está en lo alto' : '↑ Vuela: a pie no se llega'; if (el.textContent !== txt) el.textContent = txt; }
    if (el.hidden === ver) el.hidden = !ver;
    return ver;
  }
  G.on('update', dt => { if ((vuelaT -= dt) > 0) return; vuelaT = 0.5; pistaVuela(); });
  return { feel, steps, DONE, missions, unlocks, cumple, progreso, done, complete, check, advanceTo, grant, lockOf, guideTarget, at, closest, needItems, renderQuest, proximoPremio, renderProximo, showEnd, seguirExplorando, pistaVuela };
});
