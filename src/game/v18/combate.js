/* Juego · V18.1 frente A · duelo de entrenamiento 1v1 contra una cotorra IA (entregable D7).
   - Explanada abierta y plana al este de la plaza de Villa Raíz (se busca en el mapa real; si no cabe, la más plana cerca).
   - La rival es una cotorra de entrenamiento con otra piel (sin canon nuevo): si juegas una Isleña, es una arausiaca
     (Columna de nube); si juegas una Montañera, una Isleña (Ráfaga doble). Lleva gafas de entreno, como las de los Retos.
   - Se entra hablando con ella (G.interaccion) o en el círculo marcado; sale en el minimapa como cualquier interactuable.
   - Aguante por plumas (5 cada una), sin vida ni daño: un toque quita una pluma, marea un momento y empuja. Victoria si la
     rival se queda sin plumas; derrota si tú. «Otra vez» repite. Nadie se hace daño: la que pierde se sacude y reaparece.
   - Controles (móvil y teclado): Acción (E / botón) = golpe de ala; Impulso (F / botón) = semilla; mantener Impulso = poder;
     G o el botón Grito = grito. Mientras dura el duelo se toma Acción con G.interaccion.modo y el «mantener Impulso» de los
     dones (G.dones.sostener) con una envoltura que se quita al salir: dones.js no se toca.
   - Eventos: G.emit('v18combate', { tipo: 'hit' | 'damage' | 'win' | 'loss', de, a, valor }).
   - Al ganar: G.v18.otorgar('combate_1', 'pluma_rival', 1) (idempotente) y aviso «¡Ganaste una pluma de rival!».
   Solo con la bandera V18. Prueba: AV.v18CombateTest(). */
window.AVV18Combate = function (G) {
  'use strict';
  if (G.v18combate) return G.v18combate;
  const H = G.v18hab, S = G.S, F = G.fisica, M = F.MOVE, scene = G.renderer.scene;
  const ALTURA = h => G.terreno.height(h.x, h.z);
  const ARENA_R = 12, SALIDA_R = 24, PLUMAS = 5;
  const TXT = {
    retar: 'Retar a la cotorra de entrenamiento', tu: 'Tú', rival: 'Entrenadora',
    ala: 'Ala', semilla: 'Semilla', poder: 'Poder', grito: 'Grito', otra: 'Otra vez', salir: 'Salir',
    aviso: 'Ala: Acción · Semilla: Impulso · Poder: mantén Impulso · Grito: G',
    ya: '¡Ya!', gana: '¡Ganaste una pluma de rival!', ganaOtra: '¡Ganaste otra vez! La pluma de rival ya la tienes.',
    pierde: '¡Uy, te mareaste! Sacude las plumas y prueba otra vez.', lejos: 'Te alejaste: el duelo queda para luego.',
    esquiva: '¡Esquivó!', ganaste: '¡Ganaste!', perdiste: '¡Casi!', bienvenida: 'Duelo de entrenamiento: quítale sus 5 plumas.'
  };
  // Generador con semilla: la IA decide igual en cada prueba
  let semilla = 1;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
  const emitir = ev => { try { G.emit('v18combate', ev); } catch (e) { /* sin oyentes */ } };

  // ---------- Sitio: la explanada más plana y libre cerca del este de la plaza ----------
  function plano(x, z) {
    const h0 = G.terreno.height(x, z); let mn = h0, mx = h0;
    for (let a = 0; a < 16; a++) for (const r of [4, 8, ARENA_R]) {
      const px = x + Math.cos(a / 16 * 6.2832) * r, pz = z + Math.sin(a / 16 * 6.2832) * r, h = G.terreno.height(px, pz);
      mn = Math.min(mn, h); mx = Math.max(mx, h);
      if (G.agua && G.agua.levelAt && G.agua.levelAt(px, pz) > h - 0.3) return Infinity;
      if (r < ARENA_R && G.solidos && G.solidos.activo && G.solidos.altoEn(px, pz, h + 6) > h + 0.5) return Infinity;
      for (const c of (F.colliders || [])) if (c && c.x != null && c.z != null && Math.hypot(px - c.x, pz - c.z) < (c.r || 1) + 0.6) return Infinity;
    }
    return mx - mn;
  }
  function buscarSitio() {
    const pl = G.terreno.places || {}, v = pl.villa || pl.plaza || { x: S.pos.x, z: S.pos.z };
    const pref = pl.villa ? { x: v.x + 26, z: v.z + 5 } : { x: v.x + 10, z: v.z };
    let mejor = null;
    for (let dx = -18; dx <= 18; dx += 3) for (let dz = -18; dz <= 18; dz += 3) {
      const x = pref.x + dx, z = pref.z + dz, d = plano(x, z); if (!isFinite(d) || d > 1.6) continue;
      const puntos = d * 20 + Math.hypot(dx, dz);
      if (!mejor || puntos < mejor.p) mejor = { x, z, p: puntos };
    }
    if (!mejor) mejor = { x: pref.x, z: pref.z };
    return { x: mejor.x, z: mejor.z, y: G.terreno.height(mejor.x, mejor.z) };
  }
  const sitio = buscarSitio();

  // ---------- Escena: círculo de la explanada, semillas ----------
  const marca = new THREE.Mesh(new THREE.RingGeometry(ARENA_R - 0.25, ARENA_R, 64),
    new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  marca.rotation.x = -Math.PI / 2; marca.position.set(sitio.x, sitio.y + 0.06, sitio.z); marca.renderOrder = 3; marca.name = 'v18_arena';
  scene.add(marca);
  const geoSemilla = new THREE.SphereGeometry(0.16, 10, 8), matSemilla = new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.8, emissive: '#3a2410' });

  // ---------- Luchadores ----------
  const especieJugador = () => (G.v18 && G.v18.seleccionada && G.v18.seleccionada()) ||
    (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  const especieRival = sp => H.familia(sp) === 'montaneras' ? 'ventralis' : 'arausiaca';
  const C = { fase: 'nada', t: 0, cuenta: 0, j: null, r: null, balas: [], timers: [], resultado: null, ch: null, listo: null,
    stats: { movida: 0, ataques: 0, esquivas: 0, poderes: 0 } };
  const rivalPos = { x: sitio.x + 4, y: sitio.y, z: sitio.z };
  function nuevoRival() {
    const sp = especieRival(especieJugador());
    return H.luchador({ id: 'rival', nombre: TXT.rival, especie: sp, ia: true, pos: rivalPos, plumas: PLUMAS, plumasMax: PLUMAS,
      kb: { x: 0, z: 0, t: 0 }, mov: { x: 0, z: 0, t: 0 }, lift: { alto: 0, t: 0, dura: 0 }, yaw: -Math.PI / 2,
      pensar: 0.4, golpeT: 1, tiroT: 1.5, esquivaT: 0, gritoT: 3, lado: 1 });
  }
  function nuevoJugador() {
    return H.luchador({ id: 'jugador', nombre: TXT.tu, especie: especieJugador(), pos: S.pos, plumas: PLUMAS, plumasMax: PLUMAS,
      kb: { x: 0, z: 0, t: 0 }, sube: 0, mira: () => S.facing });
  }
  C.r = nuevoRival();
  function crearRival() {
    if (C.listo) return C.listo;
    if (!window.AVCharacter || !window.AVCharacter.create) return (C.listo = Promise.resolve(null));
    return (C.listo = window.AVCharacter.create().then(ch => {
      ch.applyLook({ species: C.r.especie, accessories: { eyes: { id: 'gafas', color: '#7fd3ff' } } });
      const alto = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
      ch.root.scale.setScalar(alto / ch.height); ch.root.userData.sinCulling = true; ch.root.rotation.order = 'YXZ';
      ch.root.name = 'v18_rival'; ch.play('Idle'); scene.add(ch.root); C.ch = ch; C.chEsp = C.r.especie;
      return ch;
    }).catch(() => null));
  }

  // ---------- Contexto para las habilidades ----------
  function golpear(de, blanco, g) {
    if (C.fase !== 'lucha' || !blanco) return false;
    if (blanco.escudo > 0) {
      C.stats.esquivas++;
      fx('bubbles', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z);
      if (blanco.ia) flotante(TXT.esquiva);
      emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: 0, esquiva: true });
      return false;
    }
    if (blanco.inv > 0 && !g.forzar) return false;
    const n = g.plumas || 0, dir = g.dir || H.dirA(de, blanco);
    blanco.plumas = Math.max(0, blanco.plumas - n);
    blanco.mareo = Math.max(blanco.mareo, g.mareo || 0);
    if (n > 0) blanco.inv = (g.mareo || 0) + 0.25;
    blanco.kb.x = dir.x * (g.empuje || 0); blanco.kb.z = dir.z * (g.empuje || 0); blanco.kb.t = 0.3;
    fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z);
    sonar(n > 0 ? 'land' : 'jump');
    if (de.ia) C.stats.aciertosIA = (C.stats.aciertosIA || 0) + 1;
    emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: n });
    if (n > 0) emitir({ tipo: 'damage', de: de.id, a: blanco.id, valor: blanco.plumas });
    pintar();
    if (blanco.plumas <= 0) terminar(blanco === C.r ? 'win' : 'loss');
    return true;
  }
  function fx(tipo, x, y, z) {
    if (!G.fx) return;
    try {
      if (tipo === 'ring' && G.fx.ringFx) G.fx.ringFx(x, y, z, 5, 0.6, 0.8);
      else if (G.fx.burst) G.fx.burst(x, y, z, tipo, tipo === 'bubbles' ? 10 : 8);
    } catch (e) { /* sin efectos */ }
  }
  function sonar(n) { try { if (G.audio && G.audio.play) G.audio.play(n); } catch (e) { /* sin audio */ } }
  function ctxDe(yo) {
    const otro = yo === C.j ? C.r : C.j;
    return {
      otro,
      golpear: (blanco, g) => golpear(yo, blanco, g),
      lanzar: b => lanzar(b),
      mover: (f, vx, vz, s) => {
        if (f === C.j) { const v = Math.hypot(vx, vz) || 1; S.facing = { x: vx / v, z: vz / v }; M.dashT = s; M.vx = vx; M.vz = vz; }
        else { f.mov.x = vx; f.mov.z = vz; f.mov.t = s; }
      },
      subir: (f, alto, s) => { if (f === C.j) f.sube = Math.min(0.45, s); else { f.lift.alto = alto; f.lift.t = 0; f.lift.dura = s; } },
      despues: (s, fn) => C.timers.push({ t: s, fn }),
      fx, sonar
    };
  }
  function usar(f, id) {
    if (C.fase !== 'lucha' || !f) return { ok: false, motivo: 'fase' };
    const r = H.usar(f, id, ctxDe(f));
    if (r.ok && f.ia) { C.stats.ataques++; if (!H.get(id).basico) C.stats.poderes++; }
    if (r.ok) pintar();
    else if (!f.ia && r.motivo === 'energia') pulso('en-j');
    return r;
  }
  function lanzar(b) {
    const m = new THREE.Mesh(geoSemilla, matSemilla); m.position.set(b.x, b.y, b.z); m.castShadow = true; scene.add(m);
    C.balas.push(Object.assign({ m, t: 0 }, b));
  }
  function quitarBalas() { for (const b of C.balas) scene.remove(b.m); C.balas.length = 0; }

  // ---------- Entrada del jugador ----------
  const modo = { activo: () => C.fase === 'lucha' || C.fase === 'cuenta' || C.fase === 'fin', accion: () => { if (C.fase === 'fin') otraVez(); else usar(C.j, 'golpe_ala'); },
    aviso: () => C.fase === 'fin' ? TXT.otra : TXT.aviso, get verbo() { return C.fase === 'fin' ? TXT.otra : TXT.ala; } };
  let modo0 = null, sostener0 = null, sost = 0, enganchado = false;
  function sostenerDuelo(on) {
    if (on) { sost = performance.now(); return; }
    if (!sost) return;
    const ms = performance.now() - sost; sost = 0;
    usar(C.j, ms >= 450 ? C.j.poder : 'semilla');
  }
  function tecla(e) {
    if (e.repeat || !enganchado || C.fase !== 'lucha') return;
    if ((e.key || '').toLowerCase() === 'g' && !(e.target && /INPUT|TEXTAREA/.test(e.target.nodeName))) usar(C.j, 'grito');
  }
  function enganchar() {
    if (enganchado) return; enganchado = true;
    modo0 = G.interaccion.modo; G.interaccion.modo = modo;
    if (G.dones) { sostener0 = G.dones.sostener; G.dones.sostener = sostenerDuelo; }
    addEventListener('keydown', tecla);
    document.body.classList.add('v18-duelo-on');
  }
  function soltar() {
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    if (G.dones && G.dones.sostener === sostenerDuelo) G.dones.sostener = sostener0;
    removeEventListener('keydown', tecla); sost = 0;
    document.body.classList.remove('v18-duelo-on');
  }

  // ---------- HUD ----------
  let hud = null;
  function estilo() {
    if (document.getElementById('v18-duelo-css')) return;
    const st = document.createElement('style'); st.id = 'v18-duelo-css';
    st.textContent = '#v18-duelo{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:0;right:0;margin-inline:auto;width:min(420px,calc(100vw - 32px));z-index:40;font-family:Fredoka,system-ui,sans-serif;color:#fff8ea;pointer-events:none;text-shadow:0 1px 2px #0008}' +
      '#v18-duelo .vd-fila{display:flex;gap:8px;justify-content:space-between}' +
      '#v18-duelo .vd-lado{flex:1;background:rgba(30,40,30,.72);border-radius:12px;padding:6px 10px;min-width:0}' +
      '#v18-duelo .vd-lado.r{text-align:right}#v18-duelo .vd-nom{font-weight:600;font-size:14px}#v18-duelo .vd-pod{font-size:12px;opacity:.85}' +
      '#v18-duelo .vd-pl{display:flex;gap:3px;margin:3px 0}#v18-duelo .r .vd-pl{justify-content:flex-end}' +
      '#v18-duelo .vd-pl i{width:12px;height:18px;border-radius:12px 0 12px 0;background:#ffd27a;display:block;transform:rotate(20deg);transition:opacity .2s}' +
      '#v18-duelo .r .vd-pl i{background:#7fd3ff}#v18-duelo .vd-pl i.fuera{opacity:.18}' +
      '#v18-duelo .vd-en{height:6px;border-radius:3px;background:#0006;overflow:hidden}#v18-duelo .vd-en b{display:block;height:100%;background:#8fe08a;width:100%}' +
      '#v18-duelo .vd-en.pulso{outline:2px solid #ff9a7a}' +
      '#v18-duelo .vd-centro{text-align:center;font-size:44px;font-weight:700;min-height:0;margin-top:6px}' +
      '#v18-duelo .vd-bot{display:flex;gap:6px;justify-content:center;margin-top:6px;flex-wrap:wrap}' +
      '#v18-duelo button{pointer-events:auto;font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:6px 14px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 6px #0005;cursor:pointer}' +
      '#v18-duelo button.cd{opacity:.5}#v18-duelo .vd-fin{text-align:center;background:rgba(30,40,30,.82);border-radius:14px;padding:10px;margin-top:8px}' +
      '#v18-duelo .vd-fin p{margin:0 0 8px;font-size:18px;font-weight:600}';
    document.head.appendChild(st);
  }
  function montarHud() {
    if (hud) return hud;
    estilo();
    const el = document.createElement('div'); el.id = 'v18-duelo'; el.hidden = true;
    const plumas = () => Array.from({ length: PLUMAS }, () => '<i></i>').join('');
    el.innerHTML = `<div class="vd-fila"><div class="vd-lado j"><div class="vd-nom">${TXT.tu}</div><div class="vd-pod" data-k="pj"></div><div class="vd-pl" data-k="plj">${plumas()}</div><div class="vd-en" data-k="en-j"><b></b></div></div>` +
      `<div class="vd-lado r"><div class="vd-nom">${TXT.rival}</div><div class="vd-pod" data-k="pr"></div><div class="vd-pl" data-k="plr">${plumas()}</div><div class="vd-en" data-k="en-r"><b></b></div></div></div>` +
      `<div class="vd-centro" data-k="centro"></div>` +
      `<div class="vd-bot" data-k="bot"><button data-a="golpe_ala">${TXT.ala}</button><button data-a="semilla">${TXT.semilla}</button><button data-a="poder">${TXT.poder}</button><button data-a="grito">${TXT.grito}</button></div>` +
      `<div class="vd-fin" data-k="fin" hidden><p data-k="finTxt"></p><button data-a="otra">${TXT.otra}</button> <button data-a="salir">${TXT.salir}</button></div>`;
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'otra') otraVez(); else if (a === 'salir') salir(); else if (C.j) usar(C.j, a === 'poder' ? C.j.poder : a);
    });
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  function pulso(k) { if (!hud) return; const e = hud.q(k); e.classList.add('pulso'); setTimeout(() => e.classList.remove('pulso'), 300); }
  let centroT = 0;
  function flotante(t, s) { if (!hud) return; hud.q('centro').textContent = t; centroT = s || 0.8; }
  function pintar() {
    if (!hud || !C.j) return;
    const pl = (k, f) => Array.from(hud.q(k).children).forEach((i, n) => i.classList.toggle('fuera', n >= f.plumas));
    pl('plj', C.j); pl('plr', C.r);
    hud.q('en-j').firstChild.style.width = Math.round(100 * C.j.energia / C.j.energiaMax) + '%';
    hud.q('en-r').firstChild.style.width = Math.round(100 * C.r.energia / C.r.energiaMax) + '%';
    hud.q('pj').textContent = (H.get(C.j.poder) || {}).nombre || '';
    hud.q('pr').textContent = (H.get(C.r.poder) || {}).nombre || '';
    for (const b of hud.q('bot').children) {
      const id = b.dataset.a === 'poder' ? C.j.poder : b.dataset.a;
      b.classList.toggle('cd', !H.listo(C.j, id).ok);
    }
  }

  // ---------- Ciclo del duelo ----------
  function colocar() {
    const yJ = ALTURA({ x: sitio.x - 5, z: sitio.z });
    S.pos.x = sitio.x - 5; S.pos.z = sitio.z; S.pos.y = yJ + 0.05; S.vy = 0; M.vx = M.vz = 0; M.dashT = 0;
    if (M.flying && F.endFlight) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
    S.facing = { x: 1, z: 0 };
    rivalPos.x = sitio.x + 5; rivalPos.z = sitio.z; rivalPos.y = ALTURA(rivalPos);
    if (G.camara) { G.camara.yaw = Math.atan2(-1, 0); if (G.camara.place) try { G.camara.place(true); } catch (e) { /* cámara */ } }
  }
  function iniciar(o) {
    o = o || {};
    crearRival();
    semilla = o.semilla || 7;
    C.j = nuevoJugador(); const ch = C.ch; C.r = nuevoRival(); C.ch = ch;
    if (C.ch && C.chEsp !== C.r.especie) { try { C.ch.applyLook({ species: C.r.especie, accessories: { eyes: { id: 'gafas', color: '#7fd3ff' } } }); C.chEsp = C.r.especie; } catch (e) { /* piel */ } }
    C.balas.length && quitarBalas(); C.timers.length = 0; C.resultado = null;
    C.stats = { movida: 0, ataques: 0, esquivas: 0, poderes: 0, aciertosIA: 0 };
    colocar();
    montarHud(); hud.el.hidden = false; hud.q('fin').hidden = true; hud.q('bot').hidden = false;
    enganchar();
    if (o.sinCuenta) { C.fase = 'lucha'; flotante(''); }
    else { C.fase = 'cuenta'; C.cuenta = 3; flotante('3', 1); if (G.ui && G.ui.toast) G.ui.toast(TXT.bienvenida, 2600); }
    pintar();
    return true;
  }
  function terminar(res) {
    if (C.fase !== 'lucha') return;
    C.fase = 'fin'; C.resultado = res; quitarBalas(); C.timers.length = 0;
    const gano = res === 'win';
    emitir({ tipo: res, de: gano ? 'jugador' : 'rival', a: gano ? 'rival' : 'jugador', valor: gano ? C.j.plumas : C.r.plumas });
    let txt;
    if (gano) {
      const nueva = !!(G.v18 && G.v18.otorgar && G.v18.otorgar('combate_1', 'pluma_rival', 1));
      txt = nueva ? TXT.gana : TXT.ganaOtra; C.premio = nueva;
      sonar('unlock'); fx('gold', C.r.pos.x, C.r.pos.y + 1.2, C.r.pos.z);
    } else { txt = TXT.pierde; C.premio = false; sonar('wrong'); }
    if (G.ui && G.ui.toast) G.ui.toast(txt, 3200);
    if (hud) { hud.q('finTxt').textContent = txt; hud.q('fin').hidden = false; hud.q('bot').hidden = true; flotante(gano ? TXT.ganaste : TXT.perdiste, 1.6); }
  }
  function otraVez() { return iniciar({}); }
  function salir(motivo) {
    if (C.fase === 'nada') return false;
    C.fase = 'nada'; quitarBalas(); C.timers.length = 0; soltar();
    if (hud) hud.el.hidden = true;
    rivalPos.x = sitio.x + 4; rivalPos.z = sitio.z; rivalPos.y = ALTURA(rivalPos);
    if (C.r) { C.r.mareo = 0; C.r.lift.t = C.r.lift.dura = 0; }
    if (motivo && G.ui && G.ui.toast) G.ui.toast(motivo, 2600);
    return true;
  }

  // ---------- IA de la rival ----------
  function pasoIA(dt) {
    const r = C.r, j = C.j;
    if (r.mareo > 0) return;
    const d = H.dirA(r, j), dist = d.d;
    r.golpeT -= dt; r.tiroT -= dt; r.esquivaT -= dt; r.gritoT -= dt; r.pensar -= dt;
    // Esquiva: una semilla del jugador que viene cerca
    const viene = C.balas.find(b => b.de === j && Math.hypot(b.m.position.x - r.pos.x, b.m.position.z - r.pos.z) < 5.5);
    if (viene && r.esquivaT <= 0) {
      r.esquivaT = 2.4;
      if (r.poder === 'columna_nube' && H.listo(r, 'columna_nube').ok && azar() < 0.6) { usar(r, 'columna_nube'); return; }
      if (azar() < 0.55) { r.lado = azar() < 0.5 ? -1 : 1; r.mov.x = -d.z * r.lado * 9; r.mov.z = d.x * r.lado * 9; r.mov.t = 0.28; C.stats.esquivas++; return; }
    }
    if (r.pensar > 0) return;
    r.pensar = 0.25;
    if (r.poder === 'rafaga_doble' && dist > 3 && dist < 8 && H.listo(r, 'rafaga_doble').ok && azar() < 0.35) { usar(r, 'rafaga_doble'); return; }
    if (r.poder === 'columna_nube' && dist < 2.6 && j.cd.golpe_ala > 0.2 && H.listo(r, 'columna_nube').ok && azar() < 0.3) { usar(r, 'columna_nube'); return; }
    if (dist < 2.3 && r.golpeT <= 0) { r.golpeT = 1.15; usar(r, 'golpe_ala'); return; }
    if (dist < 3.2 && r.gritoT <= 0 && r.energia > 60 && azar() < 0.2) { r.gritoT = 5; usar(r, 'grito'); return; }
    if (dist > 6 && dist < 16 && r.tiroT <= 0 && r.energia > 40) { r.tiroT = 2.4; usar(r, 'semilla'); return; }
  }
  function moverRival(dt) {
    const r = C.r, j = C.j, d = H.dirA(r, j);
    let vx = 0, vz = 0;
    if (r.kb.t > 0) { r.kb.t -= dt; vx += r.kb.x; vz += r.kb.z; r.kb.x *= 0.88; r.kb.z *= 0.88; }
    if (r.mov.t > 0) { r.mov.t -= dt; vx += r.mov.x; vz += r.mov.z; }
    else if (r.mareo <= 0 && C.fase === 'lucha') {
      if (d.d > 2.0) { vx += d.x * 4.2; vz += d.z * 4.2; } // se acerca
      else { vx += -d.z * r.lado * 1.6; vz += d.x * r.lado * 1.6; } // rodea
    }
    const x0 = r.pos.x, z0 = r.pos.z;
    r.pos.x += vx * dt; r.pos.z += vz * dt;
    // Dentro de la explanada
    const ox = r.pos.x - sitio.x, oz = r.pos.z - sitio.z, od = Math.hypot(ox, oz);
    if (od > ARENA_R - 0.5) { r.pos.x = sitio.x + ox / od * (ARENA_R - 0.5); r.pos.z = sitio.z + oz / od * (ARENA_R - 0.5); }
    C.stats.movida += Math.hypot(r.pos.x - x0, r.pos.z - z0);
    let lift = 0;
    if (r.lift.dura > 0) { r.lift.t += dt; const k = r.lift.t / r.lift.dura; if (k >= 1) r.lift.dura = 0; else lift = r.lift.alto * Math.sin(Math.PI * k); }
    r.pos.y = ALTURA(r.pos) + lift;
    if (C.fase === 'lucha' || C.fase === 'cuenta') r.yaw = Math.atan2(d.x, d.z);
    return Math.hypot(vx, vz);
  }
  function dibujarRival(dt, vel) {
    const ch = C.ch; if (!ch) return;
    const r = C.r, root = ch.root, now = performance.now() / 1000;
    root.visible = true;
    root.position.set(r.pos.x, r.pos.y, r.pos.z);
    const giro = a => Math.atan2(Math.sin(a), Math.cos(a));
    root.rotation.y += giro(r.yaw - root.rotation.y) * Math.min(1, dt * 8);
    root.rotation.z = r.mareo > 0 ? Math.sin(now * 14) * 0.25 : root.rotation.z * 0.8; // tambaleo del mareo
    const enAire = r.lift.dura > 0;
    Object.assign(ch, { speed: vel, gait: vel > 5 ? 1 : 0, airborne: enAire, flying: enAire, legsDown: enAire ? 0.6 : 1, swimming: false, diving: false,
      wingMode: enAire ? 'flap' : r.mov.t > 0 ? 'takeoff' : vel > 0.5 ? 'walk' : 'idle', expression: r.mareo > 0 ? 'surprised' : 'happy', mouth: null, lookAt: null,
      emote: null, posado: '', agachada: 0, groundY: ALTURA(r.pos), groundAt: null });
    try { ch.update(dt); } catch (e) { /* animación */ }
  }
  function pasoJugador(dt) {
    const j = C.j;
    if (j.kb.t > 0) { j.kb.t -= dt; S.pos.x += j.kb.x * dt; S.pos.z += j.kb.z * dt; j.kb.x *= 0.88; j.kb.z *= 0.88; }
    if (j.sube > 0) { j.sube -= dt; S.vy = Math.max(S.vy || 0, 6); }
    if (j.mareo > 0) { M.vx *= 0.8; M.vz *= 0.8; if (G.fx && G.fx.burst && azar() < dt * 6) fx('gold', S.pos.x, S.pos.y + 1.7, S.pos.z); }
  }
  function pasoBalas(dt) {
    for (let i = C.balas.length - 1; i >= 0; i--) {
      const b = C.balas[i], p = b.m.position;
      b.t += dt; p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt;
      const blanco = b.de === C.j ? C.r : C.j;
      const dx = p.x - blanco.pos.x, dy = p.y - (blanco.pos.y + 0.9), dz = p.z - blanco.pos.z;
      let fin = b.t >= b.vida || p.y < G.terreno.height(p.x, p.z) - 0.1;
      if (!fin && dx * dx + dy * dy + dz * dz < b.radio * b.radio) {
        golpear(b.de, blanco, Object.assign({ dir: { x: b.vx / 16, z: b.vz / 16 } }, b.golpe)); fin = true;
      }
      if (fin) { scene.remove(b.m); C.balas.splice(i, 1); if (C.fase !== 'lucha') return; }
    }
  }
  // Un paso del duelo (lo llama el bucle del juego; las pruebas lo llaman con dt fijo)
  function paso(dt) {
    if (C.fase === 'nada') { if (C.ch) dibujarRival(dt, moverRivalQuieta(dt)); return; }
    if (centroT > 0) { centroT -= dt; if (centroT <= 0 && hud && C.fase !== 'cuenta') hud.q('centro').textContent = ''; }
    if (C.fase === 'cuenta') {
      C.cuenta -= dt;
      const n = Math.ceil(C.cuenta);
      if (hud) hud.q('centro').textContent = C.cuenta > 0 ? String(n) : TXT.ya;
      if (C.cuenta <= 0) { C.fase = 'lucha'; centroT = 0.7; }
    }
    if (C.fase === 'lucha') {
      H.paso(C.j, dt); H.paso(C.r, dt);
      for (let i = C.timers.length - 1; i >= 0; i--) { const t = C.timers[i]; t.t -= dt; if (t.t <= 0) { C.timers.splice(i, 1); t.fn(); if (C.fase !== 'lucha') break; } }
      if (C.fase === 'lucha') pasoIA(dt);
      if (C.fase === 'lucha') pasoBalas(dt);
      pasoJugador(dt);
      if (C.fase === 'lucha' && Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) > SALIDA_R) { salir(TXT.lejos); return; }
      if (Math.random() < dt * 4) pintar();
    } else if (C.fase === 'fin' && Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) > SALIDA_R) { salir(); return; }
    dibujarRival(dt, moverRival(dt));
  }
  function moverRivalQuieta(dt) {
    const r = C.r; r.pos.y = ALTURA(r.pos);
    const dx = S.pos.x - r.pos.x, dz = S.pos.z - r.pos.z;
    if (dx * dx + dz * dz < 400) r.yaw = Math.atan2(dx, dz); // mira a quien se acerca
    return 0;
  }

  // ---------- En el mundo: la rival espera en la explanada ----------
  const it = G.interaccion.add({ id: 'v18_rival', x: rivalPos.x, z: rivalPos.z, r: 3.2, visible: () => C.fase === 'nada' && !!C.ch,
    label: () => TXT.retar, use: () => iniciar({}) });
  G.on('update', (dt, busy) => {
    it.x = rivalPos.x; it.z = rivalPos.z;
    marca.visible = Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) < 90;
    if (busy && C.fase !== 'nada') return;
    paso(Math.min(dt, 0.1));
  }, 70);
  G.on('apply', () => { if (C.fase !== 'nada') salir(); }, 47);
  crearRival();

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, fly0 = M.flying;
    const P = G.v18, crudo = (() => { try { return localStorage.getItem(P.clave()); } catch (e) { return null; } })();
    const evs = []; const oyente = e => { if (!oyente.mudo) evs.push(e); }; G.on('v18combate', oyente);
    const toasts = []; const toast0 = G.ui.toast; G.ui.toast = (t, ms) => { toasts.push(String(t)); return toast0.call(G.ui, t, ms); };
    const correr = (s, antes) => { for (let t = 0; t < s && C.fase === 'lucha'; t += 0.05) { if (antes) antes(); paso(0.05); } };
    try {
      // 1. Dos habilidades exclusivas distintas
      const rafaga = H.get('rafaga_doble'), columna = H.get('columna_nube');
      check('Vittata (Isleñas) tiene Ráfaga doble y arausiaca (Montañeras) Columna de nube',
        H.poderDe('vittata') === 'rafaga_doble' && H.poderDe('arausiaca') === 'columna_nube' && H.familia('arausiaca') === 'montaneras', H.poderDe('vittata') + ' / ' + H.poderDe('arausiaca'));
      const prueba = (id, sp) => {
        const yo = H.luchador({ id: 'a', especie: sp, pos: { x: 0, y: 0, z: 0 } }), otro = H.luchador({ id: 'b', especie: 'ventralis', pos: { x: 2.5, y: 0, z: 0 } });
        const reg = { golpes: [], mov: 0, subir: 0, tim: [] };
        const r = H.usar(yo, id, { otro, golpear: (b, g) => { reg.golpes.push(g); return true; }, lanzar: () => {}, mover: () => { reg.mov++; }, subir: () => { reg.subir++; },
          despues: (s, fn) => reg.tim.push(fn), fx: () => {}, sonar: () => {} });
        while (reg.tim.length) reg.tim.shift()();
        return { r, reg, yo };
      };
      const a = prueba('rafaga_doble', 'vittata'), b = prueba('columna_nube', 'arausiaca');
      check('Ráfaga doble: dos acometidas que pegan y quitan una pluma', a.r.ok && a.reg.mov === 2 && a.reg.golpes.length === 2 && a.reg.golpes[0].plumas === 1 && a.yo.escudo === 0,
        JSON.stringify({ mov: a.reg.mov, g: a.reg.golpes.length }));
      check('Columna de nube: sube y esquiva (escudo), no quita plumas', b.r.ok && b.reg.subir === 1 && b.yo.escudo > 1 && b.reg.mov === 0 && b.reg.golpes.every(g => !g.plumas),
        JSON.stringify({ subir: b.reg.subir, escudo: b.yo.escudo }));
      check('Cada poder es exclusivo y cuesta energía; con poca energía no sale', !H.listo(H.luchador({ especie: 'vittata' }), 'columna_nube').ok && rafaga.coste > 0 &&
        !H.listo(H.luchador({ especie: 'vittata', energia: 10 }), 'rafaga_doble').ok && H.listo(H.luchador({ especie: 'vittata' }), 'rafaga_doble').ok);
      const en = H.luchador({ especie: 'vittata', energia: 0 }); H.paso(en, 1);
      check('La energía se recarga sola', en.energia > 10 && en.energia <= en.energiaMax, en.energia);
      check('Hay tres ataques básicos comunes', ['golpe_ala', 'semilla', 'grito'].every(id => H.get(id) && H.get(id).basico));

      // 2. La IA reacciona
      await crearRival();
      check('La rival es una cotorra con otra piel en la explanada', !!C.ch && C.r.especie !== especieJugador() && C.ch.root.parent === scene, C.r.especie);
      check('Hablar con la rival abre el duelo (interacción visible)', it.visible() && it.label() === TXT.retar);
      iniciar({ sinCuenta: true });
      check('El duelo toma Acción e Impulso y muestra el HUD', G.interaccion.modo === modo && G.dones.sostener === sostenerDuelo && hud && !hud.el.hidden);
      const r0 = { x: C.r.pos.x, z: C.r.pos.z };
      correr(6, () => { S.pos.x = sitio.x - 5; S.pos.z = sitio.z; M.vx = M.vz = 0; C.j.plumas = PLUMAS; C.j.inv = 0.5; });
      check('La IA se mueve hacia ti y ataca', C.stats.movida > 2 && C.stats.ataques >= 1 && Math.hypot(C.r.pos.x - r0.x, C.r.pos.z - r0.z) > 1,
        JSON.stringify(C.stats));
      // 3. Un golpe resta plumas y marea
      iniciar({ sinCuenta: true });
      C.r.pos.x = S.pos.x + 1.5; C.r.pos.z = S.pos.z; C.r.escudo = 0; evs.length = 0;
      const ru = usar(C.j, 'golpe_ala');
      check('Un golpe de ala quita una pluma, marea y empuja', ru.ok && ru.acierto && C.r.plumas === PLUMAS - 1 && C.r.mareo > 0 && C.r.kb.t > 0,
        JSON.stringify({ ok: ru.ok, pl: C.r.plumas, mareo: C.r.mareo }));
      check('Emite hit y damage', evs.some(e => e.tipo === 'hit' && e.de === 'jugador' && e.valor === 1) && evs.some(e => e.tipo === 'damage' && e.a === 'rival' && e.valor === PLUMAS - 1));
      check('Mareada no ataca', !usar(C.r, 'golpe_ala').ok);
      // Semilla a distancia
      C.r.mareo = 0; C.r.inv = 0; C.r.pos.x = S.pos.x + 7; C.r.pos.z = S.pos.z; C.r.esquivaT = 99; C.r.pensar = 99; S.facing = { x: 1, z: 0 };
      const plS = C.r.plumas; usar(C.j, 'semilla');
      correr(1.2, () => { C.r.pos.x = S.pos.x + 7; C.r.pos.z = S.pos.z; C.r.pensar = 99; });
      check('La semilla vuela y pega a distancia', C.r.plumas === plS - 1, C.r.plumas);
      // 4. Victoria: recompensa una sola vez
      P.borrar();
      iniciar({ sinCuenta: true }); C.r.plumas = 1; C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; evs.length = 0; toasts.length = 0;
      usar(C.j, 'golpe_ala');
      check('Sin plumas, la rival pierde: victoria y pluma de rival', C.fase === 'fin' && C.resultado === 'win' && P.cuantos('pluma_rival') === 1 && evs.some(e => e.tipo === 'win') &&
        toasts.includes(TXT.gana), JSON.stringify({ fase: C.fase, inv: P.cuantos('pluma_rival'), t: toasts }));
      check('Al terminar, Acción dice «Otra vez»', modo.verbo === TXT.otra && !hud.q('fin').hidden);
      modo.accion();
      check('«Otra vez» reinicia el duelo con 5 plumas', C.fase === 'cuenta' && C.r.plumas === PLUMAS && C.j.plumas === PLUMAS);
      C.fase = 'lucha'; C.r.plumas = 1; C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; usar(C.j, 'golpe_ala');
      check('Ganar otra vez no duplica la recompensa', C.resultado === 'win' && P.cuantos('pluma_rival') === 1, P.cuantos('pluma_rival'));
      // 5. Derrota: no otorga
      P.borrar();
      iniciar({ sinCuenta: true }); C.j.plumas = 1; C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; C.r.golpeT = 0; C.r.pensar = 0; C.r.mareo = 0; evs.length = 0;
      correr(3, () => { C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; });
      check('Si te quedas sin plumas pierdes y no hay recompensa', C.resultado === 'loss' && P.cuantos('pluma_rival') === 0 && evs.some(e => e.tipo === 'loss') && !evs.some(e => e.tipo === 'win'),
        JSON.stringify({ res: C.resultado, plj: C.j.plumas, inv: P.cuantos('pluma_rival') }));
      salir();
      check('Al salir se devuelven Acción e Impulso', G.interaccion.modo !== modo && G.dones.sostener !== sostenerDuelo && hud.el.hidden);
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    try { salir(); } catch (e) { /* ya fuera */ }
    G.ui.toast = toast0;
    oyente.mudo = true; evs.length = 0; // G.on no tiene «off»: el oyente de la prueba se queda mudo
    Object.assign(S.pos, pos0); S.facing = fac0; M.flying = fly0; M.vx = M.vz = 0;
    try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    P.recargar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  G.v18combate = { sitio, iniciar, salir, otraVez, usar, paso, estado: () => C, test };
  return G.v18combate;
};
