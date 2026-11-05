/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · frente C: descubrir, desbloquear y elegir especie (D7).
   - Una cotorra de Dominica (Amazona arausiaca, piel de content/comun/especies.js sobre el rig de siempre con AVCharacter.create
     y applyLook, como los rivales de src/game/retos.js) canta posada en la copa de un árbol del borde del bosque cerca de
     Villa Raíz. El árbol se busca en la vegetación real (G.vegetacion.instancias): a 34–60 m de la villa, lejos de la plaza
     (que es solo de vittata, residentes.js), de la explanada del duelo (frente A), del puente (frente B) y de otros lugares.
   - Pista: sale en el minimapa (es un interactuable de G.interaccion), canta cada pocos segundos con chispas, y al acercarse
     a 80 m un aviso dice por dónde está. Una vez por sesión, un aviso al empezar.
   - Descubrir: al acercarse (10 m en el plano o 16 m en el espacio) o con Acción → G.v18.descubrir('arausiaca') + aviso.
   - Reto (≈ 50 s, idea de los secretos 'perchas'/'seguir' de src/game/secretos.js): con Acción junto a ella, vuela de copa en
     copa por 4 perchas; hay que llegar volando a cada una (6,5 m). Al cumplirlo → G.v18.desbloquear('arausiaca') + aviso. Si
     se acaba el tiempo o te alejas, vuelve a su rama y se puede repetir: sin castigo.
   - Elegir: una tarjeta (G.ui.showCard) con las especies seleccionables → G.v18.seleccionar(id). Se abre desde la propia
     cotorra ya desbloqueada (Acción) y desde «Mis cotorras» en el menú de pausa (solo si hay dos o más para elegir). Solo decide
     el poder del duelo (el frente A lee G.v18.seleccionada()); la piel y el perfil del jugador no cambian.
   - Estados (G.v18): no_descubierta → descubierta → seleccionable (desbloqueada) → seleccionada. Partidas viejas: la especie
     del perfil ya entra como seleccionable (progreso.js); aquí no se bloquea nada.
   Solo con la bandera V18 (src/boot.js). Prueba: AV.v18DescubrirTest(). */
window.AVV18Descubrir = function (G) {
  'use strict';
  if (G.v18descubrir) return G.v18descubrir;
  const V = G.v18 || window.AVV18Progreso(G);
  const scene = G.renderer.scene;
  const ID = 'arausiaca';
  const R_DESC_XZ = 10, R_DESC_3D = 16, R_PERCHA = 6.5, R_PISTA = 80, R_LEJOS = 75, RETO_S = 50, SALTOS = 4;
  const TXT = {
    pistaInicio: 'Pista: una cotorra visitante canta cerca de Villa Raíz. Búscala en el minimapa.',
    pistaCerca: '¿Oyes ese canto? Una cotorra que no es de aquí canta en la copa de un árbol.',
    descubre: 'Descubriste una cotorra de Dominica',
    descubreMas: 'Descubriste una cotorra de Dominica. Acércate y pulsa Acción para seguirla.',
    mirar: 'Mirar la cotorra que canta', seguir: 'Seguir a la cotorra de Dominica', elegir: 'Elegir con qué cotorra jugar el duelo',
    empieza: '¡Síguela volando de copa en copa! Tienes 50 segundos.',
    bien: '¡La alcanzaste! Sigue, que se va otra vez.',
    poco: '¡Rápido, que se escapa!',
    falla: 'Se fue a su rama a descansar. Pulsa Acción junto a ella para intentarlo otra vez.',
    lejos: 'Te alejaste y volvió a su rama. Inténtalo otra vez cuando quieras.',
    gana: '¡La cotorra de Dominica ya vuela contigo! Elígela para el duelo en el menú de pausa (Mis cotorras).',
    titulo: '¿Con qué cotorra juegas el duelo?',
    nota: 'Solo cambia el poder del duelo. Tu personaje se queda igual.',
    listo: 'Listo', poder: 'Poder', boton: 'Mis cotorras', elegida: 'Para el duelo:'
  };
  const NOMBRES = { vittata: 'Cotorra puertorriqueña', arausiaca: 'Cotorra de Dominica' };
  const PODERES = { islenas: 'Ráfaga doble', montaneras: 'Columna de nube' };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 3600); } catch (e) { /* sin interfaz */ } };
  const sonar = (n, a) => { try { if (G.audio && (!G.audio.has || G.audio.has(n))) return G.audio.play(n, a); } catch (e) { /* sin audio */ } return false; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const estado = () => V.estado(ID);
  const rango = e => Math.max(0, V.ESTADOS.indexOf(e || 'no_descubierta'));
  const descubierta = () => rango(estado()) >= rango('descubierta');
  const desbloqueada = () => rango(estado()) >= rango('seleccionable');
  const S = () => G.S;
  const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const distXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // ---------- Perchas: copas reales del borde del bosque ----------
  const P = []; // P[0] = su rama; P[1..4] = el recorrido del reto. { x, y, z, arbol }
  function centroVilla() { const pl = (G.terreno && G.terreno.places) || {}; return pl.villa || pl.plaza || { x: S().pos.x, z: S().pos.z }; }
  function prohibidos(v) {
    const pl = (G.terreno && G.terreno.places) || {}, out = [{ x: v.x, z: v.z, r: 30 }, { x: v.x + 26, z: v.z + 5, r: 26 }]; // plaza, duelo
    for (const k in pl) { const p = pl[k]; if (p && typeof p.x === 'number' && Math.hypot(p.x - v.x, p.z - v.z) > 25) out.push({ x: p.x, z: p.z, r: k === 'puente' ? 24 : 16 }); }
    return out;
  }
  function arbolesCerca(v, rmax) {
    const Vg = G.vegetacion, inst = Vg && Vg.instancias, info = (Vg && Vg.info) || {}, out = [];
    if (!inst) return out;
    for (const m in inst) {
      const I = inst[m], inf = info[m]; if (!I || !I.pos || !inf || !(inf.alto > 2)) continue;
      const n = I.n != null ? I.n : I.pos.length / 4;
      for (let i = 0; i < n; i++) {
        const x = I.pos[i * 4], y = I.pos[i * 4 + 1], z = I.pos[i * 4 + 2], s = I.pos[i * 4 + 3] || 1, alto = inf.alto * s;
        if (alto < 4 || alto > 24 || Math.hypot(x - v.x, z - v.z) > rmax) continue;
        out.push({ x, z, y: y + alto, base: y, m });
      }
    }
    return out;
  }
  function elegirPerchas() {
    P.length = 0;
    const v = centroVilla(), malos = prohibidos(v), arb = arbolesCerca(v, 110);
    const libre = a => !malos.some(p => Math.hypot(a.x - p.x, a.z - p.z) < p.r) && !(G.agua && G.agua.levelAt && G.agua.levelAt(a.x, a.z) > a.base - 0.2);
    const vecinos = a => arb.reduce((n, b) => n + (b !== a && Math.hypot(a.x - b.x, a.z - b.z) < 14 ? 1 : 0), 0);
    const dv = a => Math.hypot(a.x - v.x, a.z - v.z);
    const usados = new Set();
    // la primera: borde del bosque (árboles alrededor) a 34–60 m; empate → la más cercana a la villa
    let mejor = null;
    for (const a of arb) {
      const d = dv(a); if (d < 34 || d > 60 || !libre(a)) continue;
      const p = vecinos(a) * 3 - d * 0.15;
      if (!mejor || p > mejor.p) mejor = { a, p };
    }
    if (mejor) { P.push({ x: mejor.a.x, y: mejor.a.y + 0.05, z: mejor.a.z, arbol: true }); usados.add(mejor.a); }
    else { const a = Math.PI * 0.8; P.push(perchaAire(v.x + Math.cos(a) * 42, v.z + Math.sin(a) * 42)); }
    // el recorrido: cada copa a 12–26 m de la anterior, hacia dentro del bosque (sin volver a la villa)
    for (let k = 1; k <= SALTOS; k++) {
      const prev = P[k - 1], dprev = Math.hypot(prev.x - v.x, prev.z - v.z);
      let b = null;
      for (const a of arb) {
        if (usados.has(a)) continue;
        const d = Math.hypot(a.x - prev.x, a.z - prev.z); if (d < 12 || d > 26 || !libre(a) || dv(a) < Math.max(30, dprev - 6)) continue;
        const p = vecinos(a) - Math.abs(d - 18) * 0.5 + (k > 1 ? giroSuave(P[k - 2], prev, a) : 0);
        if (!b || p > b.p) b = { a, p };
      }
      if (b) { P.push({ x: b.a.x, y: b.a.y + 0.05, z: b.a.z, arbol: true }); usados.add(b.a); }
      else { // sin árbol: un punto en el aire 16 m más afuera
        const ux = prev.x - v.x, uz = prev.z - v.z, L = Math.hypot(ux, uz) || 1, g = k * 0.5;
        P.push(perchaAire(prev.x + (ux / L * Math.cos(g) - uz / L * Math.sin(g)) * 16, prev.z + (uz / L * Math.cos(g) + ux / L * Math.sin(g)) * 16));
      }
    }
    return P;
  }
  // premia no dar media vuelta (que el recorrido avance)
  function giroSuave(a, b, c) { const u = { x: b.x - a.x, z: b.z - a.z }, w = { x: c.x - b.x, z: c.z - b.z }; return (u.x * w.x + u.z * w.z) / ((Math.hypot(u.x, u.z) * Math.hypot(w.x, w.z)) || 1) * 2; }
  const perchaAire = (x, z) => ({ x, z, y: G.terreno.height(x, z) + 8, arbol: false });

  // ---------- La cotorra ----------
  const B = { ch: null, listo: null, pos: { x: 0, y: 0, z: 0 }, yaw: 0, vuelo: null, cantaT: 2, bocaT: 0, k: 0 };
  function crearCotorra() {
    if (B.listo) return B.listo;
    if (!window.AVCharacter || !window.AVCharacter.create) return (B.listo = Promise.resolve(null));
    return (B.listo = window.AVCharacter.create().then(ch => {
      ch.applyLook({ species: ID });
      const alto = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
      ch.root.scale.setScalar(alto / ch.height); ch.root.userData.sinCulling = true; ch.root.rotation.order = 'YXZ';
      ch.root.name = 'v18_arausiaca'; ch.play('Idle'); scene.add(ch.root); B.ch = ch;
      colocar(0);
      return ch;
    }).catch(() => null));
  }
  function posar(k) { const p = P[k]; if (!p) return; B.k = k; B.vuelo = null; B.pos.x = p.x; B.pos.y = p.y; B.pos.z = p.z; }
  function volarA(k) {
    const a = { x: B.pos.x, y: B.pos.y, z: B.pos.z }, b = P[k]; if (!b) return;
    const d = dist3(a, b);
    B.vuelo = { a, b, k, t: 0, dura: Math.min(3, Math.max(1.2, d / 9)) };
    B.yaw = Math.atan2(b.x - a.x, b.z - a.z);
    cantar();
  }
  function cantar() {
    B.bocaT = 0.5;
    if (!sonar('cotorra', 1)) sonar('pickup', 6);
    try { G.fx.burst(B.pos.x, B.pos.y + 1.6, B.pos.z, 'gold', 6); } catch (e) { /* sin fx */ }
  }
  function moverCotorra(dt) {
    const f = B.vuelo;
    if (f) {
      f.t += dt; const u = Math.min(1, f.t / f.dura);
      B.pos.x = f.a.x + (f.b.x - f.a.x) * u; B.pos.z = f.a.z + (f.b.z - f.a.z) * u;
      B.pos.y = f.a.y + (f.b.y - f.a.y) * u + Math.sin(Math.PI * u) * 3;
      if (u >= 1) { B.k = f.k; B.vuelo = null; }
    }
    colocar(dt);
  }
  function colocar(dt) {
    const ch = B.ch; if (!ch) return;
    const root = ch.root, vuela = !!B.vuelo;
    root.visible = true;
    root.position.set(B.pos.x, B.pos.y, B.pos.z);
    const giro = a => Math.atan2(Math.sin(a), Math.cos(a));
    if (!vuela) { const s = S(); if (s && s.pos && distXZ(s.pos, B.pos) < 40) B.yaw = Math.atan2(s.pos.x - B.pos.x, s.pos.z - B.pos.z); } // mira a Vittata
    root.rotation.y += giro(B.yaw - root.rotation.y) * Math.min(1, (dt || 1) * 6);
    root.rotation.x += ((vuela ? 0.5 : 0) - root.rotation.x) * Math.min(1, (dt || 1) * 5);
    if (B.bocaT > 0) B.bocaT -= dt;
    Object.assign(ch, { speed: vuela ? 9 : 0, gait: 0, airborne: vuela, flying: vuela, legsDown: vuela ? 0 : 1, swimming: false, diving: false,
      wingMode: vuela ? 'fly' : 'idle', expression: 'happy', mouth: B.bocaT > 0 ? 0.5 + 0.5 * Math.sin(B.bocaT * 30) : null, lookAt: null,
      emote: null, posado: vuela ? '' : 'fino', agachada: 0, groundY: B.pos.y, groundAt: null });
    try { if (dt) ch.update(dt); } catch (e) { /* animación */ }
  }

  // ---------- Reto: seguirla de copa en copa ----------
  const R = { activo: false, t: 0, k: 0, avisoPoco: false, intentos: 0 };
  function empezarReto() {
    if (R.activo || desbloqueada() || !P.length) return false;
    if (!descubierta()) descubrir();
    posar(0);
    Object.assign(R, { activo: true, t: RETO_S, k: 1, avisoPoco: false }); R.intentos++;
    volarA(1);
    toast(TXT.empieza);
    return true;
  }
  function terminarReto(ok, motivo) {
    R.activo = false;
    if (ok) {
      V.desbloquear(ID);
      sonar('unlock');
      try { G.fx.burst(B.pos.x, B.pos.y + 1, B.pos.z, 'stars', 22); G.fx.burst(B.pos.x, B.pos.y + 1, B.pos.z, 'feathers', 16); } catch (e) { /* sin fx */ }
      toast(TXT.gana, 5200);
      volarA(0); // vuelve a su rama: allí se la puede elegir
      pintarBoton();
    } else {
      sonar('wrong');
      toast(motivo === 'lejos' ? TXT.lejos : TXT.falla, 4500);
      volarA(0);
    }
  }
  function pasoReto(dt, s) {
    R.t -= dt;
    if (!R.avisoPoco && R.t < 15) { R.avisoPoco = true; toast(TXT.poco, 2000); }
    const p = P[R.k];
    if (dist3(s.pos, p) < R_PERCHA) {
      if (R.k >= SALTOS) { posar(R.k); terminarReto(true); return; }
      sonar('pickup', R.k + 2);
      toast(TXT.bien + ' ' + R.k + '/' + SALTOS, 1800);
      R.k++; volarA(R.k);
      return;
    }
    if (R.t <= 0) { terminarReto(false, 'tiempo'); return; }
    if (distXZ(s.pos, B.pos) > R_LEJOS) terminarReto(false, 'lejos');
  }

  // ---------- Descubrir ----------
  let avisoCerca = false, avisoInicio = false;
  function descubrir() {
    if (!V.descubrir(ID)) return false;
    sonar('descubrir');
    try { G.fx.burst(B.pos.x, B.pos.y + 1, B.pos.z, 'stars', 14); } catch (e) { /* sin fx */ }
    toast(TXT.descubreMas, 5000);
    return true;
  }
  function paso(dt) {
    const s = S(); if (!s || !s.pos || !P.length) return;
    moverCotorra(dt);
    const dXZ = distXZ(s.pos, B.pos), d3 = dist3(s.pos, B.pos);
    if (R.activo) { pasoReto(dt, s); return; }
    if (!B.vuelo && dXZ < R_PISTA && (B.cantaT -= dt) <= 0) { B.cantaT = 4 + Math.random() * 2; cantar(); }
    if (!descubierta()) {
      if (!avisoCerca && dXZ < R_PISTA && dXZ > R_DESC_XZ * 2) { avisoCerca = true; toast(TXT.pistaCerca, 4000); }
      if (dXZ < R_DESC_XZ || d3 < R_DESC_3D) descubrir();
    }
  }

  // ---------- Interacción (sale también en el minimapa) ----------
  let it = null;
  function ponerInteraccion() {
    if (it || !P.length) return;
    it = G.interaccion.add({ id: 'v18_cotorra_dominica', x: P[0].x, z: P[0].z, r: 8,
      visible: () => !R.activo && !B.vuelo,
      label: () => (!descubierta() ? TXT.mirar : !desbloqueada() ? TXT.seguir : TXT.elegir),
      use: () => { if (!descubierta()) descubrir(); else if (!desbloqueada()) empezarReto(); else abrirSeleccion(); } });
  }

  // ---------- Elegir especie para el duelo ----------
  function seleccionables() {
    const ids = new Set(['vittata', ID]);
    const E = window.AV_ESPECIES; if (E && Array.isArray(E.especies)) for (const e of E.especies) if (e && e.id) ids.add(e.id);
    const sel = V.seleccionada(); if (sel) ids.add(sel);
    return Array.from(ids).filter(id => rango(V.estado(id)) >= rango('seleccionable'));
  }
  function nombre(id) {
    if (NOMBRES[id]) return NOMBRES[id];
    const E = window.AV_ESPECIES, e = E && Array.isArray(E.especies) && E.especies.find(x => x.id === id);
    return (e && e.comun && e.comun.es) || id;
  }
  function poder(id) {
    try { const H = G.v18hab; if (H) { const p = H.poderDe(id), h = p && (typeof p === 'string' ? H.get(p) : p); if (h && h.nombre) return h.nombre; } } catch (e) { /* sin motor */ }
    const fam = (G.dones && G.dones.de && G.dones.de[id]) || (id === ID ? 'montaneras' : 'islenas');
    return PODERES[fam] || '';
  }
  function abrirSeleccion() {
    const ids = seleccionables(), sel = V.seleccionada();
    const botones = ids.map(id => `<button class="btn${id === sel ? '' : ' ghost'}" type="button" data-v18sp="${esc(id)}" aria-pressed="${id === sel}">${esc(nombre(id))}<small style="display:block;opacity:.8">${esc(TXT.poder)}: ${esc(poder(id))}</small></button>`).join('');
    G.ui.showCard(`<div class="v18-elegir"><h2>${esc(TXT.titulo)}</h2><p>${esc(TXT.nota)}</p><div class="row">${botones}</div><div class="row"><button class="btn" id="v18-elegir-ok" type="button">${esc(TXT.listo)}</button></div></div>`);
    const card = G.ui.$('card');
    card.querySelectorAll('[data-v18sp]').forEach(b => { b.onclick = () => elegir(b.getAttribute('data-v18sp')); });
    const ok = G.ui.$('v18-elegir-ok'); if (ok) ok.onclick = () => G.ui.hideCard();
    return ids;
  }
  function elegir(id) {
    if (!V.seleccionar(id)) return false;
    sonar('pickup', 4);
    G.ui.hideCard();
    toast(TXT.elegida + ' ' + nombre(id) + ' (' + poder(id) + ')', 3000);
    return true;
  }

  // ---------- «Mis cotorras» en el menú de pausa (solo con dos o más para elegir) ----------
  let boton = null;
  function pintarBoton() {
    const menu = G.ui.$('pause'), grid = menu && menu.querySelector('.pause-grid');
    if (!grid) return null;
    if (!boton) {
      boton = document.createElement('button');
      boton.className = 'btn tile'; boton.id = 'b-v18-cotorras'; boton.type = 'button';
      boton.setAttribute('data-icon', 'star'); boton.setAttribute('popovertarget', 'pause'); boton.setAttribute('popovertargetaction', 'hide');
      boton.textContent = TXT.boton;
      boton.addEventListener('click', () => setTimeout(abrirSeleccion, 0));
      const ref = grid.querySelector('#b-char'); if (ref) ref.after(boton); else grid.prepend(boton);
    }
    boton.hidden = seleccionables().length < 2;
    return boton;
  }
  { const menu = G.ui.$('pause'); if (menu) menu.addEventListener('beforetoggle', e => { if (e.newState === 'open') pintarBoton(); }); }

  // ---------- Arranque ----------
  let montado = false;
  function montar() {
    if (montado) return true;
    montado = true;
    elegirPerchas(); posar(0); ponerInteraccion(); crearCotorra(); pintarBoton();
    setTimeout(() => {
      if (avisoInicio || descubierta() || G.quiet) return;
      avisoInicio = true;
      try { if (!G.ui.busy()) toast(TXT.pistaInicio, 5000); } catch (e) { /* sin interfaz */ }
    }, 9000);
    return true;
  }
  const listo = Promise.race([
    Promise.resolve(G.vegetacion && G.vegetacion.listo).catch(() => null),
    new Promise(r => setTimeout(r, 15000))
  ]).then(() => Promise.resolve(G.mundo && G.mundo.listo).catch(() => null)).then(montar);
  G.on('update', (dt, busy) => { if (!busy && montado) paso(dt); }, 47);
  G.on('apply', () => { R.activo = false; setTimeout(() => { if (montado) { posar(0); pintarBoton(); } }, 0); }, 96);
  G.on('v18', ev => { if (ev && ev.tipo === 'especie') pintarBoton(); });

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const clave = V.clave();
    let crudo = null; try { crudo = localStorage.getItem(clave); } catch (e) { /* sin almacenamiento */ }
    const s = S(), guard = { x: s.pos.x, y: s.pos.y, z: s.pos.z }, perfil = JSON.stringify((s.profile && s.profile.look) || null);
    const toasts = [], toastOrig = G.ui.toast;
    G.ui.toast = (t, ms) => { toasts.push(String(t)); return toastOrig.call(G.ui, t, ms); };
    const ir = (p, dy) => { s.pos.x = p.x; s.pos.y = p.y + (dy || 0); s.pos.z = p.z; };
    const correr = (seg, fn) => { for (let t = 0; t < seg; t += 0.1) { if (fn) fn(); paso(0.1); } };
    try {
      await listo; await crearCotorra();
      V.borrar(); V.recargar(); R.activo = false; posar(0); avisoCerca = false;
      const v = centroVilla();
      check('Cotorra de Dominica en el mundo, con su piel, en una copa fuera de la plaza',
        B.ch && B.ch.root.parent === scene && P.length === SALTOS + 1 && distXZ(P[0], v) > 30,
        'perchas ' + P.map(p => Math.round(p.x) + ',' + Math.round(p.y) + ',' + Math.round(p.z) + (p.arbol ? 'a' : 'x')).join(' ') + ' · a ' + Math.round(distXZ(P[0], v)) + ' m de la villa');
      check('Las perchas son copas de árboles reales', P.filter(p => p.arbol).length >= 3, P.filter(p => p.arbol).length + '/' + P.length);
      check('Al inicio: no descubierta', estado() === 'no_descubierta');
      const mm = G.minimapa && G.minimapa.marcadores ? G.minimapa.marcadores() : null;
      check('Pista: marca en el minimapa y Acción «Mirar la cotorra que canta»', it && it.visible() && it.label() === TXT.mirar &&
        (!mm || mm.some(m => Math.abs(m.x - P[0].x) < 1.5 && Math.abs(m.z - P[0].z) < 1.5)), mm ? mm.length + ' marcas' : 'sin minimapa');
      ir(v, 1); toasts.length = 0; correr(0.5);
      check('Lejos (en la plaza) no se descubre', estado() === 'no_descubierta');
      ir({ x: P[0].x + 40, y: P[0].y, z: P[0].z }); correr(0.3);
      check('A menos de 80 m sale la pista del canto', toasts.some(t => /canto/.test(t)) && estado() === 'no_descubierta', toasts.join(' | '));
      toasts.length = 0; ir({ x: P[0].x + 4, y: P[0].y - 6, z: P[0].z + 3 }); correr(0.2);
      check('Al acercarse se descubre y avisa «Descubriste una cotorra de Dominica»', estado() === 'descubierta' && toasts.some(t => t.indexOf(TXT.descubre) === 0), toasts.join(' | '));
      check('Descubierta no es elegible todavía', !V.seleccionar(ID) && it.label() === TXT.seguir && seleccionables().indexOf(ID) < 0);
      // reto fallido: se acaba el tiempo sin seguirla (sin castigo: vuelve a su rama)
      toasts.length = 0; it.use();
      check('Acción junto a ella empieza el reto y ella vuela a la primera copa', R.activo && B.vuelo && B.vuelo.k === 1 && toasts.some(t => /Síguela/.test(t)));
      correr(RETO_S + 1);
      correr(4);
      check('Si se acaba el tiempo vuelve a su rama y sigue descubierta', !R.activo && estado() === 'descubierta' && B.k === 0 && !B.vuelo && toasts.some(t => /descansar/.test(t)), toasts.join(' | '));
      // reto bien hecho: llegar a cada copa
      toasts.length = 0; it.use();
      let pasos = 0;
      for (let k = 1; k <= SALTOS && R.activo; k++) { correr(0.5); ir(P[k], 1.5); paso(0.1); pasos++; }
      check('Seguirla por las 4 copas la desbloquea', estado() === 'seleccionable' && !R.activo && pasos === SALTOS, 'estado ' + estado() + ', saltos ' + pasos);
      check('Aviso al desbloquear', toasts.some(t => /ya vuela contigo/.test(t)) && toasts.filter(t => /La alcanzaste/.test(t)).length === SALTOS - 1, toasts.join(' | '));
      correr(4);
      check('Vuelve a su rama y su Acción es elegir', B.k === 0 && it.visible() && it.label() === TXT.elegir);
      check('Menú de pausa: «Mis cotorras» aparece con dos para elegir', !G.ui.$('pause') || (pintarBoton() && !boton.hidden));
      // elegir
      const ids = abrirSeleccion(), card = G.ui.$('card');
      const bt = card.querySelector('[data-v18sp="' + ID + '"]');
      check('La tarjeta ofrece Vittata y la desbloqueada', G.ui.cardOpen && ids.indexOf('vittata') >= 0 && ids.indexOf(ID) >= 0 && !!bt, ids.join(','));
      bt.click();
      check('Elegir en la tarjeta la selecciona para el duelo y cierra', V.seleccionada() === ID && estado() === 'seleccionada' && !G.ui.cardOpen);
      check('No cambia la piel ni el perfil del jugador', JSON.stringify((s.profile && s.profile.look) || null) === perfil);
      V.recargar();
      check('Tras recargar: sigue seleccionada y desbloqueada', V.seleccionada() === ID && estado() === 'seleccionada' && desbloqueada() && it.label() === TXT.elegir);
      check('Tras recargar se puede volver a Vittata', elegir('vittata') && V.seleccionada() === 'vittata' && V.estado(ID) === 'seleccionable');
      let guardado = null; try { guardado = JSON.parse(localStorage.getItem(clave)); } catch (e) { /* sin almacenamiento */ }
      check('Evidencia de guardado: <almacen>.v18 con arausiaca seleccionable', guardado && guardado.especies && guardado.especies[ID] === 'seleccionable' && guardado.sel === 'vittata', clave);
      // partida vieja: la especie del perfil entra elegible, sin el botón de pausa vacío
      V.borrar(); V.recargar();
      const sp = (s.profile && ((s.profile.look && s.profile.look.species) || s.profile.species)) || 'vittata';
      check('Partida vieja: la especie del perfil es elegible y la de Dominica empieza sin descubrir', seleccionables().indexOf(sp) >= 0 && estado() === 'no_descubierta' && (!G.ui.$('pause') || pintarBoton().hidden));
    } catch (e) { check('Sin excepciones', false, e && e.stack); }
    G.ui.toast = toastOrig;
    try { if (G.ui.cardOpen) G.ui.hideCard(); } catch (e) { /* sin tarjeta */ }
    Object.assign(s.pos, guard);
    try { if (crudo == null) localStorage.removeItem(clave); else localStorage.setItem(clave, crudo); } catch (e) { /* sin almacenamiento */ }
    V.recargar(); R.activo = false; posar(0); pintarBoton();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18descubrir = { ID, P, B, R, estado, descubrir, empezarReto, abrirSeleccion, elegir, seleccionables, paso, listo, test };
  return G.v18descubrir;
};
