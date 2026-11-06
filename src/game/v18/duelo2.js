/* Juego · V18.1 · «Duelo de 2 jugadores» en la misma computadora (decisión 14 de Kelvin, 5-nov: en tiempo real, no por
   turnos; nada de pantalla dividida en el móvil; nada en línea). Prototipo.
   - Solo con la bandera V18 y en computadora (sin pointer: coarse): en táctil no se carga ni aparece la opción.
   - Se entra en la explanada del duelo: en el centro del círculo hay un sitio «Duelo de 2 jugadores» (el duelo contra la
     Campeona sigue igual, hablando con ella). Una tarjeta simple deja elegir la cotorra del Jugador 2 y enseña las teclas.
   - Jugador 1 = la Vittata del jugador con sus teclas de siempre: mover (WASD), ala (Acción / E), semilla (Impulso / F),
     poder (mantener F o G). Jugador 2 = otra cotorra (una piel que ya existe) con flechas, «.» ala, «,» semilla
     (mantener: poder), «-» poder, Enter saltito y Mayús derecha para correr; o el teclado numérico (1 ala, 2 semilla,
     3 poder, 0 saltito); o un mando (Gamepad API: stick o cruceta, X ala, B semilla/mantener poder, Y poder, A saltito).
     Las teclas del Jugador 2 se cogen en la fase de captura y no llegan a input.js: no mueven a la Vittata ni hacen nada
     más en el juego. El mapa de teclas configurable de input.js no se toca.
   - Las dos van a pie (volar queda en pausa mientras dura) y dentro del círculo de la explanada.
   - Cámara compartida que encuadra a las dos (sin pantalla dividida); si se separan se abre hasta un límite.
   - HUD: «Jugador 1» / «Jugador 2», 5 plumas y energía de cada una.
   - Reglas: las mismas del duelo contra la IA (habilidades.js: usar, paso, listo y recibir). Este archivo solo pone la
     entrada, la cámara, los efectos y el HUD.
   - Sin recompensa (para no farmear): no toca S.inv, ni G.v18, ni guarda la partida.
   Prueba: AV.v18Duelo2Test(). */
window.AVV18Duelo2 = function (G) {
  'use strict';
  if (G.v18duelo2) return G.v18duelo2;
  const H = G.v18hab, Cb = G.v18combate, S = G.S, F = G.fisica, M = F.MOVE, R = G.renderer, scene = R.scene, camera = R.camera;
  const sitio = Cb.sitio, ARENA_R = 12, PLUMAS = 5, FLY_ORIG = F.toggleFly, FOLLOW_ORIG = G.camara && G.camara.follow;
  const ALTURA = p => G.terreno.height(p.x, p.z);
  const tactil = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const TXT = {
    opcion: 'Duelo de 2 jugadores', j1: 'Jugador 1', j2: 'Jugador 2', energia: 'Energía', ya: '¡Ya!',
    otra: 'Otra vez', salir: 'Salir', jugar: '¡A jugar!', cancelar: 'Ahora no',
    titulo: 'Duelo de 2 jugadores', nota: 'Dos personas en esta computadora. Gana quien le quite las 5 plumas a la otra. Es un juego: no da premios.',
    elige: '¿Con qué cotorra juega el Jugador 2?',
    teclas1: 'Jugador 1: W A S D mover · E ala · F semilla (mantener: poder) · G poder',
    teclas2: 'Jugador 2: flechas mover · . ala · , semilla (mantener: poder) · - poder · Enter saltito',
    // Las mismas teclas con <kbd> (juego en familia, 5-nov: «. , -» sueltos no se leían). Cada texto es su propio nodo (en.js).
    jugador1: 'Jugador 1:', jugador2: 'Jugador 2:', mover: 'mover', ala: 'ala', semillaMant: 'semilla (mantener: poder)', poder: 'poder', saltito: 'saltito',
    mando: 'Con un mando conectado, juega el Jugador 2: X ala · B semilla · Y poder · A saltito',
    aviso: 'Duelo de 2 jugadores · Esc para salir', gana1: '¡Gana el Jugador 1!', gana2: '¡Gana el Jugador 2!',
    bloquea: '¡Bloqueado!', reduce: '¡El escudo aguantó parte del grito!', interrumpe: '¡Interrumpida!'
  };
  const ESPECIES = [
    { id: 'arausiaca', nombre: 'Cotorra de Dominica' },
    { id: 'ventralis', nombre: 'Cotorra de La Española' },
    { id: 'vittata', nombre: 'Cotorra puertorriqueña' }
  ];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const emitir = ev => { try { G.emit('v18combate', Object.assign({ duelo: 2 }, ev)); } catch (e) { /* sin oyentes */ } };
  function fx(tipo, x, y, z) { try { if (G.fx && G.fx.burst) G.fx.burst(x, y, z, tipo, 8); } catch (e) { /* sin efectos */ } }
  function sonar(n, arg) { try { if (G.audio && G.audio.play) G.audio.play(n, arg); } catch (e) { /* sin audio */ } }
  const v18fx = n => G.v18fx && typeof G.v18fx[n] === 'function';

  // ---------- Estado ----------
  const D = { fase: 'nada', cuenta: 0, j1: null, j2: null, balas: [], timers: [], trampas: [], resultado: null, ch: null, chEsp: null, listo: null,
    esp2: 'arausiaca', stats: { usos1: 0, usos2: 0, golpes: 0 } };
  const pos2 = { x: sitio.x + 5, y: sitio.y, z: sitio.z };
  const especieJ1 = () => (G.v18 && G.v18.seleccionada && G.v18.seleccionada()) ||
    (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  function nuevos() {
    D.j1 = H.luchador({ id: 'j1', nombre: TXT.j1, especie: especieJ1(), pos: S.pos, plumas: PLUMAS, plumasMax: PLUMAS, kb: { x: 0, z: 0, t: 0 }, finMareo: 0, mira: () => S.facing });
    const j2 = H.luchador({ id: 'j2', nombre: TXT.j2, especie: D.esp2, pos: pos2, plumas: PLUMAS, plumasMax: PLUMAS, kb: { x: 0, z: 0, t: 0 }, finMareo: 0,
      lift: { alto: 0, t: 0, dura: 0 }, yaw: -Math.PI / 2, vel: 0 });
    j2.mira = () => ({ x: Math.sin(j2.yaw), z: Math.cos(j2.yaw) });
    D.j2 = j2;
  }
  function crearJ2() {
    if (D.listo) return D.listo;
    if (!window.AVCharacter || !window.AVCharacter.create) return (D.listo = Promise.resolve(null));
    return (D.listo = window.AVCharacter.create().then(ch => {
      const alto = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
      ch.root.scale.setScalar(alto / ch.height); ch.root.userData.sinCulling = true; ch.root.rotation.order = 'YXZ';
      ch.root.name = 'v18_jugador2'; ch.root.visible = false; ch.play('Idle'); scene.add(ch.root); D.ch = ch;
      pielJ2(); return ch;
    }).catch(() => null));
  }
  function pielJ2() { if (D.ch && D.chEsp !== D.esp2) { try { D.ch.applyLook({ species: D.esp2 }); D.chEsp = D.esp2; } catch (e) { /* piel */ } } }

  // ---------- Golpes, efectos y contexto de las habilidades (reglas: habilidades.js) ----------
  function golpear(de, blanco, g) {
    if (D.fase !== 'lucha' || !blanco) return false;
    const rc = H.recibir(de, blanco, g);
    if (rc.escudo) {
      if (v18fx('dispersar')) try { G.v18fx.dispersar(blanco); } catch (e) { /* efecto */ }
      fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z);
      if (rc.r === 'bloqueado') { sonar('land'); flotante(TXT.bloquea); emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: 0, bloqueado: true }); return false; }
      flotante(TXT.reduce, 1.2);
    }
    if (rc.r !== 'ok') return false;
    if (g.interrumpe) { blanco.interrumpida = rc.mareo; if (blanco === D.j1) { sost1 = 0; M.dashT = 0; M.vx *= 0.3; M.vz *= 0.3; } else sost2 = 0; if (!rc.parcial) flotante(TXT.interrumpe); }
    if (blanco.lift && rc.empuje > 0) { blanco.lift.alto = rc.n > 0 ? 0.45 : 0.25; blanco.lift.t = 0; blanco.lift.dura = 0.32; }
    fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z); sonar(rc.n > 0 ? 'land' : 'jump');
    D.stats.golpes++;
    emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: rc.n, reducido: rc.parcial || undefined, interrumpe: !!g.interrumpe || undefined });
    if (rc.n > 0) emitir({ tipo: 'damage', de: de.id, a: blanco.id, valor: blanco.plumas });
    pintar();
    if (blanco.plumas <= 0) terminar(blanco === D.j2 ? 'j1' : 'j2');
    return true;
  }
  function onda(origen, dir, alcance) {
    if (v18fx('onda')) { try { G.v18fx.onda(origen, { x: dir.x, y: 0, z: dir.z }, alcance); return; } catch (e) { /* cae al anillo */ } }
    try { if (G.fx && G.fx.ringFx) G.fx.ringFx(origen.x + dir.x * 2, origen.y, origen.z + dir.z * 2, 5, 0.6, 0.8); } catch (e) { /* efecto */ }
  }
  function escudo(f, s) { if (v18fx('escudo')) try { G.v18fx.escudo(f, s); } catch (e) { /* efecto */ } }
  const geoSemilla = new THREE.SphereGeometry(0.16, 10, 8), matSemilla = new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.8, emissive: '#3a2410' });
  function lanzar(b) { const m = new THREE.Mesh(geoSemilla, matSemilla); m.position.set(b.x, b.y, b.z); m.castShadow = true; scene.add(m); D.balas.push(Object.assign({ m, t: 0 }, b)); }
  function quitarBalas() {
    for (const b of D.balas) scene.remove(b.m); D.balas.length = 0;
    for (const f of [D.j1, D.j2]) if (f && f.escudo > 0) { f.escudo = 0; f.alasT = 0; if (v18fx('dispersar')) try { G.v18fx.dispersar(f); } catch (e) { /* efecto */ } }
  }
  function ctxDe(yo) {
    return { otro: yo === D.j1 ? D.j2 : D.j1, golpear: (bl, g) => golpear(yo, bl, g), lanzar, despues: (s, fn) => D.timers.push({ t: s, fn }),
      onda, escudo,
      trampa: (x, z, t, de) => D.trampas.push({ x, z, t, de: de || yo }), // Plumas de manglar
      mirar: () => { const d = H.dirA(yo, yo === D.j1 ? D.j2 : D.j1); if (yo === D.j1) { S.facing.x = d.x; S.facing.z = d.z; } else yo.yaw = Math.atan2(d.x, d.z); }, // Vuelta de pino
      poder: ev => { try { G.emit('v18poder', Object.assign({ duelo: 2 }, ev)); } catch (e) { /* sin oyentes */ } }, fx, sonar };
  }
  function usar(f, id) {
    if (D.fase !== 'lucha' || !f) return { ok: false, motivo: 'fase' };
    const r = H.usar(f, id, ctxDe(f));
    if (r.ok) { D.stats[f === D.j1 ? 'usos1' : 'usos2']++; pintar(); }
    return r;
  }
  const poderDe = f => f.poder;

  // ---------- Entrada del Jugador 1: la de siempre (Acción, Impulso y G), tomada mientras dura el duelo ----------
  // Tras terminar, «Otra vez» espera FIN_PAUSA ms: machacar el ala no reinicia sin ver quién ganó (como en combate.js)
  const FIN_PAUSA = 1200, otraVezSiListo = () => (performance.now() - (D.finT || 0) >= FIN_PAUSA ? otraVez() : false);
  const modo = { activo: () => D.fase !== 'nada', accion: () => { if (D.fase === 'fin') otraVezSiListo(); else usar(D.j1, 'golpe_ala'); },
    aviso: () => D.fase === 'fin' ? TXT.otra : TXT.aviso, get verbo() { return D.fase === 'fin' ? TXT.otra : 'Ala'; } };
  let sost1 = 0, sost2 = 0, modo0 = null, sostener0 = null, enganchado = false, fly0 = null, start0 = null;
  function sostener1(on) {
    if (on) { sost1 = performance.now(); return; }
    if (!sost1) return;
    const ms = performance.now() - sost1; sost1 = 0;
    usar(D.j1, ms >= 450 ? poderDe(D.j1) : 'semilla');
  }
  // ---------- Entrada del Jugador 2: teclas propias, cogidas antes de que lleguen a input.js ----------
  // Por código físico (sirve igual en teclado español o inglés): «.» y «,» en los dos; «-» es Slash en español.
  const MOVER2 = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  const ACC2 = { Period: 'ala', Numpad1: 'ala', Comma: 'semilla', Numpad2: 'semilla', Slash: 'poder', Numpad3: 'poder', Enter: 'salto', NumpadEnter: 'salto', Numpad0: 'salto', ShiftRight: 'correr' };
  const t2 = { up: false, down: false, left: false, right: false, correr: false };
  const entradaJ2 = { teclas: 0 }; // cuenta las teclas que se quedó el Jugador 2 (prueba)
  function teclaAbajo(e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName)) return;
    if (G.pausa && G.pausa.activa && G.pausa.activa()) return; // con el menú de pausa abierto no se juega
    if (e.key === 'Escape' && D.fase !== 'nada') { e.stopImmediatePropagation(); e.preventDefault(); salir(); return; }
    const mv = MOVER2[e.code] || MOVER2[e.key], ac = ACC2[e.code];
    if (!mv && !ac) {
      if ((e.key || '').toLowerCase() === 'g') { // poder directo del J1; QA-173: consumida, no inclina la cámara
        e.stopImmediatePropagation();
        if (!e.repeat && D.fase === 'lucha') usar(D.j1, poderDe(D.j1));
      }
      return;
    }
    e.stopImmediatePropagation(); e.preventDefault(); entradaJ2.teclas++;
    if (mv) { t2[mv] = true; return; }
    if (ac === 'correr') { t2.correr = true; return; }
    if (e.repeat) return;
    if (D.fase === 'fin' && ac === 'ala') { otraVezSiListo(); return; }
    if (ac === 'ala') usar(D.j2, 'golpe_ala');
    else if (ac === 'poder') usar(D.j2, poderDe(D.j2));
    else if (ac === 'semilla') sost2 = performance.now();
    else if (ac === 'salto') saltar2();
  }
  function teclaArriba(e) {
    const mv = MOVER2[e.code] || MOVER2[e.key], ac = ACC2[e.code];
    if (!mv && !ac) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (mv) t2[mv] = false;
    else if (ac === 'correr') t2.correr = false;
    else if (ac === 'semilla') soltar2();
  }
  function soltar2() {
    if (!sost2) return;
    const ms = performance.now() - sost2; sost2 = 0;
    usar(D.j2, ms >= 450 ? poderDe(D.j2) : 'semilla');
  }
  function saltar2() { const j = D.j2; if (D.fase === 'lucha' && j.lift.dura <= 0 && j.mareo <= 0) { j.lift.alto = 1.1; j.lift.t = 0; j.lift.dura = 0.55; sonar('jump'); } }
  // Mando (Gamepad API): el primero conectado juega como Jugador 2. Botones de la disposición estándar.
  const pad = { b: [], sostB: 0, usado: false };
  function leerMando() {
    let gp = null;
    try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) { gp = g; break; } } catch (e) { /* sin mandos */ }
    if (!gp) return null;
    pad.usado = true;
    const btn = i => !!(gp.buttons[i] && gp.buttons[i].pressed), nuevo = i => btn(i) && !pad.b[i];
    let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
    if (btn(14)) x = -1; if (btn(15)) x = 1; if (btn(12)) y = -1; if (btn(13)) y = 1;
    if (Math.hypot(x, y) < 0.2) { x = 0; y = 0; }
    if (D.fase === 'lucha') {
      if (nuevo(2)) usar(D.j2, 'golpe_ala');
      if (nuevo(3)) usar(D.j2, poderDe(D.j2));
      if (nuevo(0)) saltar2();
      if (nuevo(1)) pad.sostB = performance.now();
      if (!btn(1) && pad.b[1] && pad.sostB) { const ms = performance.now() - pad.sostB; pad.sostB = 0; usar(D.j2, ms >= 450 ? poderDe(D.j2) : 'semilla'); }
    } else if (D.fase === 'fin' && (nuevo(0) || nuevo(2))) otraVezSiListo();
    for (let i = 0; i < gp.buttons.length; i++) pad.b[i] = btn(i);
    return { x, y, correr: Math.hypot(x, y) > 0.92 || btn(5) };
  }

  // ---------- Vittata (J1): pico, alas y tambaleo (envoltura de player3D.update mientras dura; actores.js no se toca) ----------
  let pl3d = null, upd0 = null;
  function pose(ch, f) {
    if (!ch || !f) return;
    if (f.picoT > 0) { ch.mouth = Math.min(1, f.picoT / 0.15); ch.expression = 'fight'; }
    if (f.alasT > 0 && !ch.flying) ch.wingMode = 'land';
    const w = f.finMareo > 0 ? Math.sin(performance.now() / 1000 * 13) * 0.24 * Math.min(1, f.finMareo) : 0;
    if (ch.root) { ch.root.rotation.z += w - (f.wob || 0); f.wob = w; }
    if (f.finMareo > 0 || f.mareo > 0) ch.expression = 'surprised';
  }
  function envolver() {
    const ch = G.actores && G.actores.player3D; if (!ch || pl3d) return;
    pl3d = ch; upd0 = ch.update;
    ch.update = function (dt) { try { pose(this, D.j1); } catch (e) { /* pose */ } return upd0.call(this, dt); };
  }
  function soltarVittata() {
    if (!pl3d) return;
    if (D.j1 && D.j1.wob && pl3d.root) { pl3d.root.rotation.z -= D.j1.wob; D.j1.wob = 0; }
    delete pl3d.update; if (pl3d.update !== upd0) pl3d.update = upd0;
    pl3d = upd0 = null;
  }

  // ---------- Cámara compartida: encuadra a las dos y se abre hasta un límite ----------
  const CAMD = { min: 8.5, max: 21, base: 6.5, k: 0.9, elev: 0.6, rate: 4 };
  const cam = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), d: 10, listo: false };
  let follow0 = null, draw0 = null;
  function encuadre() {
    const a = S.pos, b = pos2, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, my = (a.y + b.y) / 2;
    const sep = Math.hypot(a.x - b.x, a.z - b.z);
    const d = Math.max(CAMD.min, Math.min(CAMD.max, CAMD.base + sep * CAMD.k));
    return { x: mx, y: my, z: mz, d, sep };
  }
  function camaraPaso(dt, snap) {
    const e = encuadre(), k = snap || !cam.listo ? 1 : Math.min(1, (dt || 0) * CAMD.rate);
    cam.d += (e.d - cam.d) * k;
    const y = Math.sin(CAMD.elev), h = Math.cos(CAMD.elev);
    // yaw 0: la cámara al sur (+z) mirando al norte; el Jugador 1 empieza a la izquierda y el 2 a la derecha
    const px = e.x, py = Math.max(e.y + 1 + cam.d * y, G.terreno.height(e.x, e.z + cam.d * h) + 1), pz = e.z + cam.d * h;
    cam.pos.set(cam.pos.x + (px - cam.pos.x) * k, cam.pos.y + (py - cam.pos.y) * k, cam.pos.z + (pz - cam.pos.z) * k);
    cam.mira.set(cam.mira.x + (e.x - cam.mira.x) * k, cam.mira.y + (e.y + 1 - cam.mira.y) * k, cam.mira.z + (e.z - cam.mira.z) * k);
    cam.listo = true;
    if (G.camara) G.camara.yaw = 0; // WASD y flechas, relativos a esta cámara
    camera.position.copy(cam.pos); camera.lookAt(cam.mira);
  }
  function tomarCamara() {
    if (!G.camara || follow0) return;
    follow0 = G.camara.follow; draw0 = G.camara.draw; cam.listo = false; cam.d = encuadre().d;
    G.camara.follow = dt => camaraPaso(dt, false);
    G.camara.draw = () => { camera.position.copy(cam.pos); camera.lookAt(cam.mira); if (R.drawScene) R.drawScene(camera); else R.renderer.render(scene, camera); };
    camaraPaso(0, true);
  }
  function soltarCamara() {
    if (!follow0) return;
    G.camara.follow = follow0; G.camara.draw = draw0; follow0 = draw0 = null;
    try { G.camara.place(true); } catch (e) { /* cámara */ }
  }

  // ---------- Enganchar / soltar ----------
  function enganchar() {
    if (enganchado) return; enganchado = true;
    modo0 = G.interaccion.modo; G.interaccion.modo = modo;
    if (G.dones) { sostener0 = G.dones.sostener; G.dones.sostener = sostener1; }
    fly0 = F.toggleFly; start0 = F.startFlying; F.toggleFly = () => false; F.startFlying = () => false; // a pie las dos
    addEventListener('keydown', teclaAbajo, true); addEventListener('keyup', teclaArriba, true); addEventListener('blur', sueltaTodo);
    envolver(); tomarCamara();
    document.body.classList.add('v18-duelo-on');
  }
  function sueltaTodo() { for (const k in t2) t2[k] = false; sost2 = 0; }
  function soltar() {
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    if (G.dones && G.dones.sostener === sostener1) G.dones.sostener = sostener0;
    if (fly0) { F.toggleFly = fly0; F.startFlying = start0; fly0 = start0 = null; }
    removeEventListener('keydown', teclaAbajo, true); removeEventListener('keyup', teclaArriba, true); removeEventListener('blur', sueltaTodo);
    sueltaTodo(); sost1 = 0; soltarVittata(); soltarCamara();
    document.body.classList.remove('v18-duelo-on');
  }

  // ---------- HUD ----------
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    if (!document.getElementById('v18-duelo2-css')) {
      const st = document.createElement('style'); st.id = 'v18-duelo2-css';
      st.textContent = '#v18-duelo2{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:0;right:0;margin-inline:auto;width:min(560px,calc(100vw - 32px));z-index:40;font-family:Fredoka,system-ui,sans-serif;color:#fff8ea;pointer-events:none;text-shadow:0 1px 2px #0008}' +
        '#v18-duelo2 .vd-fila{display:flex;gap:10px;justify-content:space-between}#v18-duelo2 .vd-lado{flex:1;background:rgba(30,40,30,.72);border-radius:12px;padding:6px 10px;min-width:0}' +
        '#v18-duelo2 .vd-lado.r{text-align:right}#v18-duelo2 .vd-nom{font-weight:600;font-size:15px}#v18-duelo2 .vd-pod{font-size:12px;opacity:.85}' +
        '#v18-duelo2 .vd-pl{display:flex;gap:3px;margin:3px 0}#v18-duelo2 .r .vd-pl{justify-content:flex-end}' +
        '#v18-duelo2 .vd-pl i{width:14px;height:20px;border-radius:12px 0 12px 0;background:#ffd27a;display:block;transform:rotate(20deg);transition:opacity .2s}' +
        '#v18-duelo2 .r .vd-pl i{background:#7fd3ff}#v18-duelo2 .vd-pl i.fuera{opacity:.18}' +
        '#v18-duelo2 .vd-en{height:6px;border-radius:3px;background:#0006;overflow:hidden}#v18-duelo2 .vd-en b{display:block;height:100%;background:#8fe08a;width:100%}' +
        '#v18-duelo2 .vd-et{font-size:10px;opacity:.75;margin-top:2px;line-height:1.2}#v18-duelo2 .vd-tc{font-size:11px;opacity:.8;margin-top:4px;line-height:1.25}' +
        '#v18-duelo2 .vd-centro{text-align:center;font-size:44px;font-weight:700;margin-top:6px}' +
        '#v18-duelo2 .vd-fin{text-align:center;background:rgba(30,40,30,.82);border-radius:14px;padding:10px;margin-top:8px}#v18-duelo2 .vd-fin p{margin:0 0 8px;font-size:20px;font-weight:600}' +
        '#v18-duelo2 button{pointer-events:auto;font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:6px 14px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 6px #0005;cursor:pointer}' +
        '.v18-d2 .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.v18-d2 .d2-teclas{font-size:14px;line-height:1.4;margin:8px 0}' +
        '.v18-d2 .d2-fila{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:4px 0}.v18-d2 .d2-k{white-space:nowrap}.v18-d2 .d2-k kbd{margin-right:2px}';
      document.head.appendChild(st);
    }
    const el = document.createElement('div'); el.id = 'v18-duelo2'; el.hidden = true;
    const pl = () => Array.from({ length: PLUMAS }, () => '<i></i>').join('');
    const lado = (c, n, k, tc) => `<div class="vd-lado ${c}"><div class="vd-nom">${n}</div><div class="vd-pod" data-k="p${k}"></div><div class="vd-pl" data-k="pl${k}">${pl()}</div><div class="vd-et">${TXT.energia}</div><div class="vd-en" data-k="en${k}"><b></b></div><div class="vd-tc">${tc}</div></div>`;
    el.innerHTML = `<div class="vd-fila">${lado('j', TXT.j1, 1, 'W A S D · E · F · G')}${lado('r', TXT.j2, 2, '← ↑ → ↓ · . · , · -')}</div>` +
      `<div class="vd-centro" data-k="centro"></div>` +
      `<div class="vd-fin" data-k="fin" hidden><p data-k="finTxt"></p><button data-a="otra">${TXT.otra}</button> <button data-a="salir">${TXT.salir}</button></div>`;
    el.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.a === 'otra') otraVezSiListo(); else salir();
    });
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  let centroT = 0;
  function flotante(t, s) { if (!hud) return; hud.q('centro').textContent = t; centroT = t ? (s || 0.8) : 0; }
  function pintar() {
    if (!hud || !D.j1) return;
    const pl = (k, f) => Array.from(hud.q(k).children).forEach((i, n) => i.classList.toggle('fuera', n >= f.plumas));
    pl('pl1', D.j1); pl('pl2', D.j2);
    hud.q('en1').firstChild.style.width = Math.round(100 * D.j1.energia / D.j1.energiaMax) + '%';
    hud.q('en2').firstChild.style.width = Math.round(100 * D.j2.energia / D.j2.energiaMax) + '%';
    const texto = (k, t) => { const e = hud.q(k); if (e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } };
    texto('p1', (H.get(D.j1.poder) || {}).nombre || ''); texto('p2', (H.get(D.j2.poder) || {}).nombre || '');
  }

  // ---------- Tarjeta: elegir la cotorra del Jugador 2 y ver las teclas ----------
  const filaTeclas = (quien, lista) => `<div class="d2-fila"><b>${esc(quien)}</b> ` +
    lista.map(([k, t]) => `<span class="d2-k"><kbd>${esc(k)}</kbd> ${esc(t)}</span>`).join(' ') + '</div>';
  function abrirTarjeta() {
    if (!disponible()) return false;
    crearJ2();
    const bot = ESPECIES.map(e => `<button class="btn${e.id === D.esp2 ? '' : ' ghost'}" type="button" data-d2sp="${e.id}" aria-pressed="${e.id === D.esp2}">${esc(e.nombre)}<small style="display:block;opacity:.8">${esc((H.get(H.poderDe(e.id)) || {}).nombre || '')}</small></button>`).join('');
    G.ui.showCard(`<div class="v18-d2"><h2>${esc(TXT.titulo)}</h2><p>${esc(TXT.nota)}</p><p><b>${esc(TXT.elige)}</b></p><div class="row">${bot}</div>` +
      `<div class="d2-teclas">${filaTeclas(TXT.jugador1, [['W A S D', TXT.mover], ['E', TXT.ala], ['F', TXT.semillaMant], ['G', TXT.poder]])}` +
      `${filaTeclas(TXT.jugador2, [['← ↑ ↓ →', TXT.mover], ['.', TXT.ala], [',', TXT.semillaMant], ['-', TXT.poder], ['Enter', TXT.saltito]])}<div class="note">${esc(TXT.mando)}</div></div>` +
      `<div class="row"><button class="btn" id="v18-d2-ok" type="button">${esc(TXT.jugar)}</button><button class="btn ghost" id="v18-d2-no" type="button">${esc(TXT.cancelar)}</button></div></div>`);
    const card = G.ui.$('card');
    card.querySelectorAll('[data-d2sp]').forEach(b => { b.onclick = () => {
      D.esp2 = b.getAttribute('data-d2sp');
      card.querySelectorAll('[data-d2sp]').forEach(x => { const on = x === b; x.classList.toggle('ghost', !on); x.setAttribute('aria-pressed', String(on)); });
    }; });
    G.ui.$('v18-d2-ok').onclick = () => { G.ui.hideCard(); iniciar({}); };
    G.ui.$('v18-d2-no').onclick = () => G.ui.hideCard();
    return true;
  }

  // ---------- Ciclo ----------
  function colocar() {
    S.pos.x = sitio.x - 5; S.pos.z = sitio.z; S.pos.y = ALTURA(S.pos) + 0.05; S.vy = 0; M.vx = M.vz = 0; M.dashT = 0;
    if (M.flying && F.endFlight) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
    S.facing = { x: 1, z: 0 };
    pos2.x = sitio.x + 5; pos2.z = sitio.z; pos2.y = ALTURA(pos2);
  }
  function iniciar(o) {
    o = o || {};
    if (!disponible() && !o.forzar) return false;
    if (Cb.estado().fase !== 'nada') return false; // nunca a la vez que el duelo contra la Campeona
    if (o.especie2) D.esp2 = o.especie2;
    crearJ2(); pielJ2();
    quitarBalas(); D.timers.length = 0; D.trampas.length = 0;
    if (D.j1 && D.j1.wob && pl3d && pl3d.root) { pl3d.root.rotation.z -= D.j1.wob; D.j1.wob = 0; }
    nuevos(); D.resultado = null; D.stats = { usos1: 0, usos2: 0, golpes: 0 };
    colocar();
    montarHud(); hud.el.hidden = false; hud.q('fin').hidden = true;
    enganchar(); sueltaTodo();
    if (o.sinCuenta) { D.fase = 'lucha'; flotante(''); } else { D.fase = 'cuenta'; D.cuenta = 3; flotante('3', 1); }
    pintar();
    return true;
  }
  function terminar(quien) {
    if (D.fase !== 'lucha') return;
    D.fase = 'fin'; D.resultado = quien; D.finT = performance.now(); quitarBalas(); D.timers.length = 0; D.trampas.length = 0;
    const perd = quien === 'j1' ? D.j2 : D.j1; perd.finMareo = 2.2; perd.mareo = Math.max(perd.mareo, 2.2);
    const txt = quien === 'j1' ? TXT.gana1 : TXT.gana2;
    emitir({ tipo: 'fin', de: quien, a: perd.id, valor: (quien === 'j1' ? D.j1 : D.j2).plumas });
    sonar('unlock'); fx('gold', perd.pos.x, perd.pos.y + 1.2, perd.pos.z);
    if (hud) { hud.q('finTxt').textContent = txt; hud.q('fin').hidden = false; flotante(''); }
    // Sin recompensa: ni inventario, ni G.v18, ni guardado
  }
  function otraVez() { return iniciar({ forzar: true }); }
  function salir() {
    if (D.fase === 'nada') return false;
    D.fase = 'nada'; quitarBalas(); D.timers.length = 0; D.trampas.length = 0; soltar();
    if (hud) { flotante(''); hud.el.hidden = true; }
    if (D.ch) D.ch.root.visible = false;
    return true;
  }
  const dentro = p => { const ox = p.x - sitio.x, oz = p.z - sitio.z, od = Math.hypot(ox, oz), lim = ARENA_R - 0.5; if (od > lim) { p.x = sitio.x + ox / od * lim; p.z = sitio.z + oz / od * lim; } };
  // Movimiento del J2: relativo a la cámara compartida (yaw 0: arriba = norte, −z)
  const VEL = () => ({ andar: F.SPEED || 6.5, correr: F.RUN_SPEED || 10.5 });
  function mover2(dt, mando) {
    const j = D.j2;
    let ix = (t2.right ? 1 : 0) - (t2.left ? 1 : 0), iz = (t2.down ? 1 : 0) - (t2.up ? 1 : 0), corre = t2.correr;
    if (mando && (mando.x || mando.y)) { ix = mando.x; iz = mando.y; corre = corre || mando.correr; }
    const n = Math.hypot(ix, iz);
    let vx = 0, vz = 0;
    if (j.kb.t > 0) { j.kb.t -= dt; vx += j.kb.x; vz += j.kb.z; j.kb.x *= 0.88; j.kb.z *= 0.88; }
    if (n > 0.01 && D.fase === 'lucha') {
      const v = (corre ? VEL().correr : VEL().andar) * Math.min(1, n) * (j.mareo > 0 ? 0.25 : 1) * (j.pesada > 0 ? 0.45 : 1); // Plumas de manglar: pisar una pluma va más lento
      vx += ix / n * v; vz += iz / n * v;
      if (j.mareo <= 0) j.yaw = Math.atan2(ix, iz);
    }
    pos2.x += vx * dt; pos2.z += vz * dt; dentro(pos2);
    let lift = 0;
    if (j.lift.dura > 0) { j.lift.t += dt; const k = j.lift.t / j.lift.dura; if (k >= 1) j.lift.dura = 0; else lift = j.lift.alto * Math.sin(Math.PI * k); }
    pos2.y = ALTURA(pos2) + lift;
    j.vel = Math.hypot(vx, vz);
  }
  function dibujar2(dt) {
    const ch = D.ch; if (!ch) return;
    const j = D.j2, root = ch.root, now = performance.now() / 1000;
    root.visible = true; root.position.set(pos2.x, pos2.y, pos2.z);
    const giro = a => Math.atan2(Math.sin(a), Math.cos(a));
    root.rotation.y += giro(j.yaw - root.rotation.y) * Math.min(1, dt * 10);
    root.rotation.z = j.mareo > 0 ? Math.sin(now * (j.finMareo > 0 ? 9 : 14)) * (j.finMareo > 0 ? 0.32 : 0.25) : root.rotation.z * 0.8;
    const enAire = j.lift.dura > 0, vel = j.vel || 0;
    Object.assign(ch, { speed: vel, gait: vel > 7 ? 1 : 0, airborne: enAire, flying: enAire, legsDown: enAire ? 0.6 : 1, swimming: false, diving: false,
      wingMode: j.alasT > 0 ? 'land' : enAire ? 'flap' : vel > 0.5 ? 'walk' : 'idle',
      expression: j.mareo > 0 ? 'surprised' : j.picoT > 0 ? 'fight' : 'happy', mouth: j.picoT > 0 ? Math.min(1, j.picoT / 0.15) : null, lookAt: null,
      emote: null, posado: '', agachada: 0, groundY: ALTURA(pos2), groundAt: null });
    try { ch.update(dt); } catch (e) { /* animación */ }
  }
  function pasoJ1(dt) {
    const j = D.j1;
    if (j.kb.t > 0) { j.kb.t -= dt; S.pos.x += j.kb.x * dt; S.pos.z += j.kb.z * dt; j.kb.x *= 0.88; j.kb.z *= 0.88; }
    if (j.mareo > 0) { M.vx *= 0.8; M.vz *= 0.8; }
    if (M.flying && F.endFlight) { try { F.endFlight(); } catch (e) { /* suelo */ } }
    dentro(S.pos);
  }
  // Plumas de manglar: las plumas del suelo frenan al primero que pisa (menos quien las plantó). Igual que en combate.js.
  function pasoTrampas(dt) {
    for (let i = D.trampas.length - 1; i >= 0; i--) {
      const tr = D.trampas[i];
      tr.t -= dt;
      if (tr.t <= 0) { D.trampas.splice(i, 1); continue; }
      for (const f of [D.j1, D.j2]) {
        if (!f || f === tr.de || f.pesada > 0) continue;
        if (Math.hypot(f.pos.x - tr.x, f.pos.z - tr.z) > 0.95) continue;
        f.pesada = (H.get('plumas_manglar') || {}).lenta || 2.8;
        fx('feathers', tr.x, f.pos.y + 0.5, tr.z); sonar('ring', 2);
        D.trampas.splice(i, 1);
        break;
      }
    }
  }
  function pasoBalas(dt) {
    for (let i = D.balas.length - 1; i >= 0; i--) {
      const b = D.balas[i], p = b.m.position;
      const bl = b.de === D.j1 ? D.j2 : D.j1;
      if (bl.marcada > 0) { const hx = bl.pos.x - p.x, hz = bl.pos.z - p.z, hn = Math.hypot(hx, hz) || 1, v = Math.hypot(b.vx, b.vz), k = Math.min(1, dt * 6); b.vx += (hx / hn * v - b.vx) * k; b.vz += (hz / hn * v - b.vz) * k;
        b.vy += (((bl.pos.y + 0.9) - p.y) / Math.max(0.15, hn / (v || 1)) - b.vy) * k; } // Ojo del cenote, como en combate.js (también en altura)
      b.t += dt; p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt;
      const dx = p.x - bl.pos.x, dy = p.y - (bl.pos.y + 0.9), dz = p.z - bl.pos.z;
      let fin = b.t >= b.vida || p.y < G.terreno.height(p.x, p.z) - 0.1;
      if (!fin && dx * dx + dy * dy + dz * dz < b.radio * b.radio) { golpear(b.de, bl, Object.assign({ dir: { x: b.vx / 16, z: b.vz / 16 } }, b.golpe)); fin = true; }
      if (fin) { scene.remove(b.m); D.balas.splice(i, 1); if (D.fase !== 'lucha') return; }
    }
  }
  function paso(dt) {
    if (D.fase === 'nada') return;
    if (centroT > 0) { centroT -= dt; if (centroT <= 0 && hud && D.fase !== 'cuenta') hud.q('centro').textContent = ''; }
    const mando = leerMando();
    if (D.fase === 'cuenta') {
      D.cuenta -= dt;
      if (hud) hud.q('centro').textContent = D.cuenta > 0 ? String(Math.ceil(D.cuenta)) : TXT.ya;
      if (D.cuenta <= 0) { D.fase = 'lucha'; centroT = 0.7; }
      M.vx = M.vz = 0; // nadie se mueve hasta «¡Ya!»
    }
    if (D.fase === 'lucha') {
      H.paso(D.j1, dt); H.paso(D.j2, dt);
      for (let i = D.timers.length - 1; i >= 0; i--) { const t = D.timers[i]; t.t -= dt; if (t.t <= 0) { D.timers.splice(i, 1); t.fn(); if (D.fase !== 'lucha') break; } }
      if (D.fase === 'lucha') pasoTrampas(dt);
      if (D.fase === 'lucha') pasoBalas(dt);
      if (Math.random() < dt * 4) pintar();
    } else if (D.fase === 'fin') {
      for (const f of [D.j1, D.j2]) if (f.finMareo > 0) { f.finMareo = Math.max(0, f.finMareo - dt); f.mareo = f.finMareo; }
      if (D.j1.finMareo > 0) { M.vx *= 0.8; M.vz *= 0.8; }
    }
    if (D.fase === 'nada') return;
    pasoJ1(dt); mover2(dt, mando);
    if (D.fase === 'lucha') { // el escudo caducado se dispersa solo
      for (const f of [D.j1, D.j2]) if (f.escudoVisto && f.escudo <= 0) { f.escudoVisto = false; if (v18fx('dispersar')) try { G.v18fx.dispersar(f); } catch (e) { /* efecto */ } } else if (f.escudo > 0) f.escudoVisto = true;
    }
    dibujar2(dt);
  }

  // ---------- En el mundo: el sitio del duelo de 2 jugadores, en el centro del círculo de la explanada ----------
  function disponible() { return !!G.V18 && !tactil(); }
  // Marca pintada en el suelo (un solo plano; textura canvas en runtime, 0 assets): halo cálido suave,
  // guía tenue, dos medias lunas entrelazadas (oro = Jugador 1 al oeste, azul = Jugador 2 al este) y dos plumas cruzadas.
  const texSitio = (() => {
    const S = 256, c = S / 2, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d');
    const halo = g.createRadialGradient(c, c, 4, c, c, c - 2);
    halo.addColorStop(0, 'rgba(255,236,190,0.22)'); halo.addColorStop(0.55, 'rgba(255,236,190,0.08)'); halo.addColorStop(1, 'rgba(255,236,190,0)');
    g.fillStyle = halo; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,243,214,0.38)'; g.lineWidth = 5;
    g.beginPath(); g.arc(c, c, 100, 0, Math.PI * 2); g.stroke();
    const media = (a0, rgb) => { // media luna con borde suave: halo ancho tenue + núcleo
      g.lineCap = 'butt';
      g.strokeStyle = 'rgba(' + rgb + ',0.35)'; g.lineWidth = 28;
      g.beginPath(); g.arc(c, c, 100, a0 - 0.07, a0 + Math.PI + 0.07); g.stroke();
      g.strokeStyle = 'rgba(' + rgb + ',1)'; g.lineWidth = 14;
      g.beginPath(); g.arc(c, c, 100, a0, a0 + Math.PI); g.stroke();
    };
    media(Math.PI / 2, '255,210,122'); // oeste: Jugador 1 (oro)
    media(-Math.PI / 2, '127,211,255'); // este: Jugador 2 (azul)
    const pluma = (x, y, ang, rgb) => {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.fillStyle = 'rgba(' + rgb + ',0.95)';
      g.beginPath(); g.moveTo(0, -30);
      g.quadraticCurveTo(9, -8, 2, 26); g.quadraticCurveTo(0, 30, -2, 26); g.quadraticCurveTo(-9, -8, 0, -30);
      g.fill();
      g.strokeStyle = 'rgba(90,55,20,0.75)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -27); g.lineTo(0, 27); g.stroke();
      g.lineWidth = 1.4;
      for (const d of [[-16, 11], [-6, 13], [4, 11], [13, 7]]) {
        g.beginPath(); g.moveTo(0, d[0]); g.quadraticCurveTo(d[1] * 0.6, d[0] - 3, d[1], d[0] - 7); g.stroke();
        g.beginPath(); g.moveTo(0, d[0]); g.quadraticCurveTo(-d[1] * 0.6, d[0] - 3, -d[1], d[0] - 7); g.stroke();
      }
      g.restore();
    };
    pluma(c - 5, c + 3, -0.5, '255,210,122');
    pluma(c + 5, c + 3, 0.5, '127,211,255');
    const t = new THREE.CanvasTexture(cv);
    t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; // decal: los mipas lavarían el alpha a rasante
    return t;
  })();
  const marcas = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6),
    new THREE.MeshBasicMaterial({ map: texSitio, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  marcas.rotation.x = -Math.PI / 2; marcas.position.set(sitio.x, sitio.y + 0.07, sitio.z); marcas.renderOrder = 3;
  marcas.name = 'v18_duelo2_sitio'; marcas.frustumCulled = false; // decal autogestionado: fuera del cullPequenos
  scene.add(marcas);
  const it = G.interaccion.add({ id: 'v18_duelo2', x: sitio.x, z: sitio.z, r: 2.2,
    visible: () => disponible() && D.fase === 'nada' && Cb.estado().fase === 'nada', label: () => TXT.opcion, use: () => abrirTarjeta() });
  G.on('update', (dt, busy) => {
    marcas.position.set(sitio.x, sitio.y + 0.07, sitio.z); it.x = sitio.x; it.z = sitio.z; // sigue a la explanada si se recoloca
    marcas.visible = disponible() && D.fase === 'nada' && Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) < 90;
    if (marcas.visible) marcas.material.opacity = 0.9 + Math.sin(performance.now() / 1000 * 2.2) * 0.1; // respira suave
    if (D.fase === 'nada') return;
    const c = Cb.estado(); if (c.ch && c.ch.root) c.ch.root.visible = false; // la Campeona se aparta mientras juegan dos
    if (busy) return;
    paso(Math.min(dt, 0.1));
  }, 75);
  G.on('apply', () => { if (D.fase !== 'nada') salir(); }, 48);
  crearJ2();

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    salir(); try { Cb.salir(); } catch (e) { /* sin duelo abierto */ }
    const v18on0 = G.V18; G.V18 = true; // el arnés abre el juego sin ?v18=1: la prueba se hace como en la demo y luego se deja la bandera como estaba
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, inv0 = JSON.stringify(S.inv || {}), esp0 = D.esp2;
    const P = G.v18, crudo = (() => { try { return localStorage.getItem(P.clave()); } catch (e) { return null; } })();
    const guardar0 = G.guardado && G.guardado.save; let guardados = 0;
    if (G.guardado) { G.guardado.save = function (ya) { if (ya) guardados++; else if (guardar0) return guardar0.apply(this, arguments); }; }
    const evs = []; const oy = e => { if (!oy.mudo && e && e.duelo === 2) evs.push(e); }; G.on('v18combate', oy);
    const errores = []; const oyErr = e => errores.push(String(e && (e.message || e.reason) || e)); addEventListener('error', oyErr); addEventListener('unhandledrejection', oyErr);
    const tecla = (tipo, key, code) => { const e = new KeyboardEvent(tipo, { key, code, bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e; };
    const correr = (s, antes) => { for (let t = 0; t < s && D.fase === 'lucha'; t += 0.05) { if (antes) antes(); paso(0.05); } };
    const cerca = d => { pos2.x = S.pos.x + d; pos2.z = S.pos.z; };
    const limpio = () => { for (const f of [D.j1, D.j2]) { f.cd = {}; f.energia = 100; f.mareo = 0; f.inv = 0; f.escudo = 0; f.kb.t = 0; } };
    try {
      await crearJ2();
      // 1. Solo en computadora: la opción aparece; en táctil no
      check('En computadora aparece «Duelo de 2 jugadores» en la explanada (además de la Campeona)', disponible() && it.visible() && it.label() === TXT.opcion &&
        !!G.interaccion.find('v18_rival'), it.label());
      const mm0 = window.matchMedia;
      window.matchMedia = q => /coarse/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm0.call(window, q);
      let tactilOk;
      try { tactilOk = !disponible() && !it.visible() && !abrirTarjeta() && !iniciar({}) && !G.ui.cardOpen; } finally { window.matchMedia = mm0; }
      check('En táctil no aparece la opción ni se puede abrir', tactilOk && D.fase === 'nada');
      // 2. La tarjeta: elegir la cotorra del J2 y empezar
      abrirTarjeta();
      const card = G.ui.$('card');
      const bv = card.querySelector('[data-d2sp="ventralis"]'); if (bv) bv.onclick();
      check('La tarjeta deja elegir la cotorra del Jugador 2 y enseña las teclas', G.ui.cardOpen && card.querySelectorAll('[data-d2sp]').length === ESPECIES.length && D.esp2 === 'ventralis' && /Jugador 2/.test(card.textContent));
      G.ui.$('v18-d2-ok').onclick();
      check('«¡A jugar!» abre el duelo con cuenta atrás, HUD de Jugador 1 / Jugador 2 y 5 plumas por lado', D.fase === 'cuenta' && !G.ui.cardOpen && !hud.el.hidden &&
        hud.el.textContent.includes(TXT.j1) && hud.el.textContent.includes(TXT.j2) && hud.q('pl1').children.length === 5 && hud.q('pl2').children.length === 5 && !!hud.q('en1') && !!hud.q('en2'));
      check('La segunda cotorra es otra piel de las que hay, con su poder', !!D.ch && D.chEsp === 'ventralis' && D.j2.poder === H.poderDe('ventralis') && D.ch.root.parent === scene, D.j2.poder);
      // 3. Entradas independientes: el J2 se mueve con flechas, el J1 no
      iniciar({ sinCuenta: true, especie2: 'arausiaca' });
      check('Con arausiaca, el Jugador 2 tiene Escudo de plumas', D.j2.poder === 'escudo_plumas' && D.ch && D.chEsp === 'arausiaca');
      const s1 = { x: S.pos.x, z: S.pos.z }, s2 = { x: pos2.x, z: pos2.z };
      const ev = tecla('keydown', 'ArrowUp', 'ArrowUp');
      const keysJ1 = G.input.keys.has('arrowup');
      for (let i = 0; i < 10; i++) { F.step(0.05, false); G.emit('update', 0.05, false, false); }
      tecla('keyup', 'ArrowUp', 'ArrowUp');
      check('Flecha arriba mueve al Jugador 2 y no llega al Jugador 1 (ni a input.js)', !keysJ1 && ev.defaultPrevented && s2.z - pos2.z > 1.5 &&
        Math.hypot(S.pos.x - s1.x, S.pos.z - s1.z) < 0.3, JSON.stringify({ dz2: (s2.z - pos2.z).toFixed(2), d1: Math.hypot(S.pos.x - s1.x, S.pos.z - s1.z).toFixed(2), keysJ1 }));
      const a1 = { x: S.pos.x, z: S.pos.z }, a2 = { x: pos2.x, z: pos2.z };
      tecla('keydown', 'd', 'KeyD');
      for (let i = 0; i < 10; i++) { F.step(0.05, false); G.emit('update', 0.05, false, false); }
      tecla('keyup', 'd', 'KeyD');
      check('D mueve al Jugador 1 (teclas de siempre) y no al Jugador 2', S.pos.x - a1.x > 1 && Math.hypot(pos2.x - a2.x, pos2.z - a2.z) < 0.05,
        JSON.stringify({ dx1: (S.pos.x - a1.x).toFixed(2), d2: Math.hypot(pos2.x - a2.x, pos2.z - a2.z).toFixed(2) }));
      check('Volar queda en pausa mientras dura (las dos a pie)', F.toggleFly() === false && !M.flying);
      // 4. Golpes: J2 → J1 y J1 → J2
      limpio(); cerca(1.5); evs.length = 0;
      const n1 = D.stats.usos1; tecla('keydown', '.', 'Period'); tecla('keyup', '.', 'Period');
      check('El ala del Jugador 2 («.») le quita una pluma al Jugador 1 y no dispara nada del Jugador 1', D.j1.plumas === PLUMAS - 1 && D.stats.usos1 === n1 && D.stats.usos2 >= 1 &&
        !(D.j1.cd.golpe_ala > 0) && evs.some(e => e.tipo === 'damage' && e.de === 'j2' && e.a === 'j1'), JSON.stringify({ pl1: D.j1.plumas, usos1: D.stats.usos1 }));
      limpio(); cerca(1.5); evs.length = 0;
      const n2 = D.stats.usos2; tecla('keydown', 'e', 'KeyE'); tecla('keyup', 'e', 'KeyE');
      check('El ala del Jugador 1 (E) le quita una pluma al Jugador 2', D.j2.plumas === PLUMAS - 1 && D.stats.usos2 === n2 && evs.some(e => e.tipo === 'damage' && e.de === 'j1' && e.a === 'j2'),
        JSON.stringify({ pl2: D.j2.plumas }));
      limpio(); cerca(7); S.facing = { x: 1, z: 0 }; const p2 = D.j2.plumas;
      tecla('keydown', 'f', 'KeyF'); tecla('keyup', 'f', 'KeyF'); correr(1.2, () => cerca(7));
      check('La semilla del Jugador 1 (F) vuela y pega', D.j2.plumas === p2 - 1, D.j2.plumas);
      limpio(); cerca(-7); D.j2.yaw = Math.PI / 2; const p1 = D.j1.plumas;
      tecla('keydown', ',', 'Comma'); tecla('keyup', ',', 'Comma'); correr(1.2, () => cerca(-7));
      check('La semilla del Jugador 2 («,») vuela y pega', D.j1.plumas === p1 - 1, D.j1.plumas);
      limpio(); cerca(1.5);
      tecla('keydown', '-', 'Slash');
      const escOk = D.j2.escudo > 0; tecla('keyup', '-', 'Slash');
      const pl1b = D.j2.plumas; usar(D.j1, 'golpe_ala');
      check('Poder del Jugador 2 («-»): Escudo de plumas, que para un golpe del Jugador 1', escOk && D.j2.plumas === pl1b && D.j2.escudo === 0);
      limpio(); cerca(4); S.facing = { x: 1, z: 0 };
      tecla('keydown', 'g', 'KeyG'); tecla('keyup', 'g', 'KeyG');
      const gritoOk = D.j1.cd[D.j1.poder] > 0; correr(0.5, () => cerca(4));
      check('Poder del Jugador 1 (G) sale y no lo dispara el Jugador 2', gritoOk && (D.j1.poder !== 'grito_yunque' || D.j2.interrumpida > 0), D.j1.poder);
      // 5. Victoria y derrota, sin recompensa
      const invA = JSON.stringify(S.inv || {}); evs.length = 0; guardados = 0;
      limpio(); cerca(1.5); D.j2.plumas = 1; usar(D.j1, 'golpe_ala');
      check('Sin plumas el Jugador 2: gana el Jugador 1', D.fase === 'fin' && D.resultado === 'j1' && D.j2.finMareo > 0 && hud.q('finTxt').textContent === TXT.gana1 && !hud.q('fin').hidden);
      check('Al terminar, Acción (o el ala del J2) dice «Otra vez»', modo.verbo === TXT.otra);
      modo.accion();
      check('Machacar Acción justo al terminar no reinicia: se ve quién ganó', D.fase === 'fin' && D.resultado === 'j1');
      D.finT -= FIN_PAUSA; modo.accion();
      check('«Otra vez» reinicia con 5 plumas cada una', D.fase === 'cuenta' && D.j1.plumas === PLUMAS && D.j2.plumas === PLUMAS);
      D.fase = 'lucha'; limpio(); cerca(1.5); D.j1.plumas = 1; tecla('keydown', '.', 'Period'); tecla('keyup', '.', 'Period');
      check('Sin plumas el Jugador 1: gana el Jugador 2', D.fase === 'fin' && D.resultado === 'j2' && hud.q('finTxt').textContent === TXT.gana2);
      const crudoAhora = (() => { try { return localStorage.getItem(P.clave()); } catch (e) { return null; } })();
      check('Sin recompensa: ni inventario, ni progreso V18, ni guardado', JSON.stringify(S.inv || {}) === invA && crudoAhora === crudo && guardados === 0 &&
        !P.otorgado('duelo2') && evs.every(e => e.tipo !== 'win' && e.tipo !== 'loss'), JSON.stringify({ guardados }));
      // 6. Cámara compartida
      iniciar({ sinCuenta: true }); cerca(3); G.camara.follow(0.05); G.camara.follow(1);
      const dCerca = camera.position.distanceTo(new THREE.Vector3((S.pos.x + pos2.x) / 2, (S.pos.y + pos2.y) / 2, (S.pos.z + pos2.z) / 2));
      S.pos.x = sitio.x - 11; pos2.x = sitio.x + 11; pos2.z = S.pos.z = sitio.z; for (let i = 0; i < 30; i++) G.camara.follow(0.1);
      const mid = new THREE.Vector3((S.pos.x + pos2.x) / 2, (S.pos.y + pos2.y) / 2, (S.pos.z + pos2.z) / 2), dLejos = camera.position.distanceTo(mid);
      camera.updateMatrixWorld(); const v1 = new THREE.Vector3(S.pos.x, S.pos.y + 1, S.pos.z).project(camera), v2 = new THREE.Vector3(pos2.x, pos2.y + 1, pos2.z).project(camera);
      check('Cámara compartida: encuadra a las dos y se abre hasta un límite', dLejos > dCerca + 3 && dLejos <= CAMD.max + 2 && Math.abs(v1.x) < 1 && Math.abs(v2.x) < 1 && v1.x < v2.x,
        JSON.stringify({ dCerca: dCerca.toFixed(1), dLejos: dLejos.toFixed(1), x1: v1.x.toFixed(2), x2: v2.x.toFixed(2) }));
      // 7. Salir: todo vuelve
      salir();
      const ev2 = tecla('keydown', 'ArrowUp', 'ArrowUp'); const vuelve = G.input.keys.has('arrowup'); tecla('keyup', 'ArrowUp', 'ArrowUp');
      check('Al salir se devuelven Acción, Impulso, volar, cámara y flechas', G.interaccion.modo !== modo && G.dones.sostener !== sostener1 && hud.el.hidden && !pl3d &&
        !follow0 && G.camara.follow === FOLLOW_ORIG && F.toggleFly === FLY_ORIG && vuelve && !ev2.defaultPrevented && !D.ch.root.visible);
      check('Sin errores de consola durante la prueba', errores.length === 0, errores.join(' | '));
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    try { salir(); } catch (e) { /* fuera */ }
    G.V18 = v18on0;
    oy.mudo = true; removeEventListener('error', oyErr); removeEventListener('unhandledrejection', oyErr);
    if (G.guardado) { if (guardar0) G.guardado.save = guardar0; else delete G.guardado.save; }
    D.esp2 = esp0;
    Object.assign(S.pos, pos0); S.facing = fac0; M.vx = M.vz = 0;
    if (JSON.stringify(S.inv || {}) !== inv0) { const o = JSON.parse(inv0); for (const k of Object.keys(S.inv)) if (!(k in o)) delete S.inv[k]; Object.assign(S.inv, o); }
    try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    try { G.camara.place(true); } catch (e) { /* cámara */ }
    try { if (v18fx('paso')) for (let i = 0; i < 40; i++) G.v18fx.paso(0.1); } catch (e) { /* efectos */ } // anillos y plumas de la prueba, apagados
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18duelo2 = { disponible, abrirTarjeta, iniciar, salir, otraVez, usar, paso, estado: () => D, TXT, test };
  return G.v18duelo2;
};
