/* Juego · V18.1 · «Duelo de 2 jugadores» en la misma computadora (decisión 14 de Kelvin, 5-nov: en tiempo real, no por
   turnos; nada de pantalla dividida en el móvil; nada en línea). Prototipo.
   - Solo con la bandera V18. T44: también en táctil, en horizontal: cada jugador con su joystick y sus 4 botones (en vertical,
     «Gira el teléfono» y pausa).
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
   - Cómo se pelea (Kelvin 8-nov): el primer duelo de 2 empieza con un entreno de 3 pasos (aletazo, semilla, poder) con las
     teclas de cada jugador; cada paso avanza cuando las dos lo hacen; nadie pierde plumas y se puede saltar. Se recuerda en
     este navegador (localStorage 'av_v18_duelo2_entreno': no toca la partida ni G.v18) y luego sale con «¿Cómo se pelea?».
     Chips de acción con tecla y recarga visual en el panel de cada jugador, y pistas breves por jugador que dejan de salir
     al dominarlas.
   Prueba: AV.v18Duelo2Test(). */
window.AVV18Duelo2 = function (G) {
  'use strict';
  const alMenu = () => !!(G.menuModos && G.menuModos.desdeMenu && G.menuModos.desdeMenu()); /* se entró desde «¿Cómo quieres jugar?»: el botón del final lleva al menú */
  if (G.v18duelo2) return G.v18duelo2;
  const H = G.v18hab, Cb = G.v18combate, S = G.S, F = G.fisica, M = F.MOVE, R = G.renderer, scene = R.scene, camera = R.camera;
  const sitio = Cb.sitio, ARENA_R = 12, PLUMAS = 5;
  // F1 · cambios 2 y 3 (16-nov), los mismos números que contra la Campeona (combate.js): mejor de 3 asaltos de 5 plumas con
  // tope de 45 s (sin tope en el modo relajado) y Brinco con 0,25 s sin daño (J1: Espacio; J2: su saltito, Enter / 0 / A).
  // Un golpe esquivado con el Brinco deja a quien lo dio abierta 0,8 s (no puede atacar) y quien esquivó carga 15 de energía.
  // F1 · cambio 7 (16-nov): revancha y hándicap. Marcador de la sesión (J1 3 · 2 J2: suma al terminar cada duelo, se borra al
  // salir), «Otra vez» con cuenta corta (1,5 s: «2, 1, ¡Ya!») y sin pantallas, y «Ventaja» por jugadora en la tarjeta: quien la
  // marca empieza CADA asalto con 7 plumas en vez de 5 (al tope de 45 s gana quien tenga más plumas, contadas tal cual: la
  // ventaja sigue valiendo). Ventaja y emparejamiento se guardan para «Otra vez»; al salir del modo se borran con el marcador.
  const PLUMAS_VENTAJA = 7, CUENTA_OTRA = 1.5;
  let asaltosDef = 0; // AV.v18Duelo2Test mira lo de siempre con un asalto (asaltosDef = 1) y los asaltos aparte, pidiéndolos
  const ASALTOS = Cb.ASALTOS || 3, ASALTO_TOPE = Cb.ASALTO_TOPE || 45, ASALTO_PAUSA = 2, BRINCO = Cb.BRINCO || { dura: 0.25, cd: 0.9, empuje: 8, abierta: 0.8, energia: 15 };
  // Combate 2.0 (para todos; ?combate2=0 lo apaga; combate.js → vida.c2): la misma máquina de estados para Vittata (J1) y el J2; sin la bandera, lo de siempre
  const C2 = Cb.vida && Cb.vida.c2, c2On = () => !!(C2 && C2.on()); let enUso = null;
  // Combate 2.0 · extremidades y combos (combate.js → vida.ext, el mismo motor). J1: U O J L (las del mapa de input.js);
  // J2: teclado numérico 7 9 4 6 (alas arriba, patas abajo) o mando LB RB LT RT. Sin la bandera no se toma ninguna tecla.
  const XT = Cb.vida && Cb.vida.ext;
  const EXT2 = { Numpad7: 'alaIzq', Numpad9: 'alaDer', Numpad4: 'pataIzq', Numpad6: 'pataDer' };
  const ALTURA = p => G.terreno.height(p.x, p.z);
  const tactil = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const TXT = {
    opcion: 'Duelo de 2 jugadores', j1: 'Jugador 1', j2: 'Jugador 2', energia: 'Energía', ya: '¡Ya!',
    otra: 'Otra vez', salir: 'Salir', menu: 'Volver al menú', jugar: '¡A jugar!', cancelar: 'Ahora no',
    titulo: 'Duelo de 2 jugadores', nota: 'Dos personas en la misma pantalla. Gana quien le quite todas las plumas a la otra. Premio la primera vez: los Lentes de la Campeona.',
    elige: '¿Con qué cotorra juega el Jugador 2?',
    teclas1: 'Jugador 1: W A S D mover · E ala · F semilla (mantener: poder) · G poder',
    teclas2: 'Jugador 2: flechas mover · . ala · , semilla (mantener: poder) · - poder · Enter saltito',
    // Las mismas teclas con <kbd> (juego en familia, 5-nov: «. , -» sueltos no se leían). Cada texto es su propio nodo (en.js).
    jugador1: 'Jugador 1:', jugador2: 'Jugador 2:', mover: 'mover', ala: 'ala', semillaMant: 'semilla (mantener: poder)', poder: 'poder', saltito: 'saltito',
    mando: 'Con un mando conectado, juega el Jugador 2: X ala · B semilla · Y poder · A saltito',
    extTeclas: 'Alas y patas (combos): Jugador 1 con U O J L · Jugador 2 con 7 9 4 6 del teclado numérico o LB RB LT RT del mando', comboDe: n => 'Jugador ' + n,
    aviso: 'Duelo de 2 jugadores · Esc para salir', gana1: '¡Gana el Jugador 1!', gana2: '¡Gana el Jugador 2!',
    bloquea: '¡Bloqueado!', reduce: '¡El escudo aguantó parte del grito!', interrumpe: '¡Interrumpida!',
    // Entreno y pistas (8-nov); las de Jugador 1 son las mismas del duelo contra la Campeona
    chAla: 'Ala', chSemilla: 'Semilla', chPoder: 'Poder',
    como: '¿Cómo se pelea?', saltarEnt: 'Saltar entreno', entPaso: n => 'Entreno · paso ' + n + ' de 3', bien: '¡Bien!', masCerca: '¡Más cerca!',
    ent1: 'Acérquense y den un aletazo.', ent2: 'Ahora, cada una lanza una semilla.', ent3: 'Ahora, cada una usa su poder.',
    entFin: '¡Ya saben pelear! Ahora, el duelo de verdad.',
    pista1: { cerca: '¡Cerca! Aletazo (E)', lejos: 'Lejos: semilla (F)', poder: '¡Poder listo! (G)', golpe: '¡Te dieron! Muévete de lado para esquivar.', escudo: '¡Te dieron! Cúbrete con tu poder (G).' },
    ventaja: 'Ventaja', ventajaNota: '(7 plumas en cada asalto):', serie: (a, b) => 'J1 ' + a + ' · ' + b + ' J2',
    asalto2: '¡Asalto 2!', asalto3: '¡Asalto final!', tiempo: '¡Tiempo!', empate: '¡Empate! La próxima pluma gana.', esquivado: '¡Esquivado!', brinco: 'brinco', espacio: 'Espacio',
    pista2: { cerca: '¡Cerca! Aletazo (.)', lejos: 'Lejos: semilla (,)', poder: '¡Poder listo! (-)', golpe: '¡Te dieron! Muévete de lado para esquivar.', escudo: '¡Te dieron! Cúbrete con tu poder (-).' }
  };
  const TECLAS = { j1: ['E', 'F', 'G'], j2: ['.', ',', '-'] };
  const DEFENSAS = new Set(['escudo_plumas', 'quiebro', 'capa_palma', 'pluma_rebote', 'hojas_envuelven', 'remolino']); // como en combate.js
  const ESPECIES = [
    { id: 'arausiaca', nombre: 'Cotorra de Dominica' },
    { id: 'ventralis', nombre: 'Cotorra de La Española' },
    { id: 'vittata', nombre: 'Cotorra puertorriqueña' }
  ];
  // T57: la tarjeta «¿Cómo se pelea?» de combate.js (modo 'dos': teclas de cada jugador o mitades de la pantalla). Sale sola
  // el primer Duelo de 2 de este navegador (como su entreno: localStorage) y luego con el botón, aquí y en la elección de cotorras
  const TJ = Cb.tarjeta, CLAVE_TJ = 'av_v18_duelo2_tarjeta';
  const tjAbierta = () => !!(TJ && TJ.abierta() && TJ.modo() === 'dos');
  const tjVista = () => { try { return localStorage.getItem(CLAVE_TJ) === '1'; } catch (e) { return false; } };
  const marcarTj = () => { try { localStorage.setItem(CLAVE_TJ, '1'); } catch (e) { /* sin almacenamiento */ } };
  function abrirComo(conPracticar, alCerrar) {
    if (!TJ) return false;
    marcarTj(); return TJ.abrir('dos', { tactil: tactil(), alCerrar, entrenar: conPracticar ? () => iniciar({ forzar: true, entreno: true }) : null });
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const emitir = ev => { try { G.emit('v18combate', Object.assign({ duelo: 2 }, ev)); } catch (e) { /* sin oyentes */ } };
  function fx(tipo, x, y, z) { try { if (G.fx && G.fx.burst) G.fx.burst(x, y, z, tipo, 8); } catch (e) { /* sin efectos */ } }
  function sonar(n, arg) { if (n === 'duelo_pata' && FL) FL.pata(); try { if (G.audio && G.audio.play) G.audio.play(n, arg); } catch (e) { /* sin audio */ } }
  // F4 · sensación de juego (14 cuenta con sonido, 15 pluma quitada, 17 poder listo): las mismas funciones que el duelo (combate.js → feel)
  const FL = Cb.feel || null;
  let cuentaVista = -1;
  const estP1 = { armado: false, coste: 0 }, estP2 = { armado: false, coste: 0 };
  const chipPoder = k => hud && hud.q(k) && hud.q(k).querySelector('[data-a="poder"]');
  const poder1 = () => chipPoder('ch1'), poder2 = () => chipPoder('ch2');
  const v18fx = n => G.v18fx && typeof G.v18fx[n] === 'function';

  // ---------- Estado ----------
  const D = { fase: 'nada', cuenta: 0, j1: null, j2: null, balas: [], timers: [], trampas: [], resultado: null, ch: null, chEsp: null, listo: null,
    esp2: 'arausiaca', stats: { usos1: 0, usos2: 0, golpes: 0 }, ventaja: { j1: false, j2: false }, serie: { j1: 0, j2: 0 } };
  const pos2 = { x: sitio.x + 5, y: sitio.y, z: sitio.z };
  const especieJ1 = () => (G.v18 && G.v18.seleccionada && G.v18.seleccionada()) ||
    (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  const plumasDe = k => (D.ventaja[k] ? PLUMAS_VENTAJA : PLUMAS); // F1 · cambio 7
  function nuevos() {
    const p1 = plumasDe('j1'), p2 = plumasDe('j2');
    D.j1 = H.luchador({ id: 'j1', nombre: TXT.j1, especie: especieJ1(), pos: S.pos, plumas: p1, plumasMax: p1, kb: { x: 0, z: 0, t: 0 }, finMareo: 0, mira: () => S.facing });
    const j2 = H.luchador({ id: 'j2', nombre: TXT.j2, especie: D.esp2, pos: pos2, plumas: p2, plumasMax: p2, kb: { x: 0, z: 0, t: 0 }, finMareo: 0,
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
    if (D.fase !== 'lucha' || !blanco || D.pausa > 0) return false;
    const rc = H.recibir(de, blanco, g);
    if (rc.r === 'esquivado') { esquive(blanco, de); return false; } // F1 · cambio 2: Brinco
    if (rc.escudo) {
      if (v18fx('dispersar')) try { G.v18fx.dispersar(blanco); } catch (e) { /* efecto */ }
      fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z);
      if (rc.r === 'bloqueado') { sonar('land'); flotante(TXT.bloquea); emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: 0, bloqueado: true }); if (C2) C2.golpe(de, blanco, { bloqueado: true, directo: de === enUso, camara: true }); return false; }
      flotante(TXT.reduce, 1.2);
    }
    if (rc.r !== 'ok') return false;
    if (rc.n > 0 && (D.nAsaltos || 1) > 1 && Cb.RITMO && Cb.RITMO.respiro > 0) blanco.inv = (blanco.inv || 0) + Cb.RITMO.respiro; // F1 · cambio 3: respiro tras la pluma (como contra la Campeona)
    if (g.interrumpe) { blanco.interrumpida = rc.mareo; if (blanco === D.j1) { sost1 = 0; M.dashT = 0; M.vx *= 0.3; M.vz *= 0.3; } else sost2 = 0; if (!rc.parcial) flotante(TXT.interrumpe); }
    if (blanco.lift && rc.empuje > 0) { blanco.lift.alto = rc.n > 0 ? 0.45 : 0.25; blanco.lift.t = 0; blanco.lift.dura = 0.32; }
    if (rc.n > 0 && FL) FL.pluma(blanco, rc.n, hud && hud.q(blanco === D.j1 ? 'pl1' : 'pl2').children, sonar); // F4-15
    else { fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z); sonar(rc.n > 0 ? 'land' : 'jump'); }
    D.stats.golpes++;
    emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: rc.n, reducido: rc.parcial || undefined, interrumpe: !!g.interrumpe || undefined });
    if (rc.n > 0) emitir({ tipo: 'damage', de: de.id, a: blanco.id, valor: blanco.plumas });
    if (C2) C2.golpe(de, blanco, { n: rc.n, directo: de === enUso, camara: true }); // Combate 2.0 (solo con la bandera)
    pintar();
    if (blanco.plumas <= 0 || (D.empate && rc.n > 0)) finAsalto(blanco === D.j2 ? 'j1' : 'j2'); // F1 · cambio 3: fin del asalto (con 2 ganados, del duelo)
    return true;
  }
  function onda(origen, dir, alcance) {
    if (v18fx('onda') && c2On()) { C2.despues(0.12, () => G.v18fx.onda(origen, { x: dir.x, y: 0, z: dir.z }, alcance)); return; } // Combate 2.0: con la pose de lanzar
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
    if (D.fase !== 'lucha' || !f || tjAbierta() || D.pausa > 0) return { ok: false, motivo: 'fase' };
    if (f.abierta > 0) return { ok: false, motivo: 'abierta' }; // F1: abierta tras un Brinco de la otra
    if (c2On() && EXD && EXD.bloquea(f, id)) return { ok: false, motivo: 'recupera' }; // recuperándose de un combo
    enUso = f; let r; try { r = H.usar(f, id, ctxDe(f)); } finally { enUso = null; }
    if (r.ok && C2) C2.accion(f, id); // Combate 2.0 (solo con la bandera): la pose de la acción, en este mismo cuadro
    if (r.ok && c2On() && EXD) EXD.alPoder(f, id); // el poder justo después de un combo: «¡Bomba Boricua!»
    if (r.ok && !H.get(id).basico) f.ultPoder = id; // Imitación (oratrix): el registro del último poder de cada una
    if (r.ok) { D.stats[f === D.j1 ? 'usos1' : 'usos2']++; pintar(); alUsar(f, id, r); }
    return r;
  }
  const poderDe = f => f.poder;
  // El motor de extremidades de este duelo (las mismas reglas, combos y poses que contra la Campeona)
  const EXD = XT ? XT.crear({
    lucha: () => D.fase === 'lucha' && !(D.pausa > 0),
    otro: f => (f === D.j1 ? D.j2 : D.j1),
    golpear: (de, bl, g) => golpear(de, bl, g),
    despues: (s, fn) => D.timers.push({ t: s, fn }),
    t: () => D.tLucha || 0,
    ventana: () => XT.ventana(),
    anunciar: (f, cb) => anunciarCombo(f, cb),
    fxCombo: (f, cb, fase) => XT.fxCombo(f, cb, fase, f === D.j1 ? D.j2 : D.j1, true),
    sonar,
    alUsar: (f, k, r) => { const q = f === D.j1 ? 'ext1' : 'ext2'; D.stats[q] = (D.stats[q] || 0) + (k === 'poder' ? 0 : 1); if (r.combo) D.stats.combos = (D.stats.combos || 0) + 1; }
  }) : null;
  const usarExt = (f, k) => (c2On() && EXD && D.fase === 'lucha' && !(D.pausa > 0) && !(f && f.abierta > 0) ? EXD.usar(f, k) : { ok: false, motivo: 'fase' });
  let comboVis = 0;
  function anunciarCombo(f, cb) {
    if (!hud) return; XT.css();
    let e = hud.q('combo'); if (!e) { e = document.createElement('div'); e.className = 'vd-combo'; e.dataset.k = 'combo'; e.setAttribute('aria-live', 'polite'); hud.q('centro').after(e); }
    e.textContent = ''; const b = document.createElement('b'); b.textContent = cb.nombre; e.appendChild(b);
    const sm = document.createElement('small'); sm.textContent = TXT.comboDe(f === D.j1 ? 1 : 2); e.appendChild(sm);
    e.className = 'vd-combo c-' + cb.id + (f === D.j2 ? ' rival' : ''); e.hidden = false; void e.offsetWidth; e.classList.add('sale'); e.dataset.id = cb.id; comboVis = 1.3;
  }

  // ---------- Entrada del Jugador 1: la de siempre (Acción, Impulso y G), tomada mientras dura el duelo ----------
  // Tras terminar, «Otra vez» espera FIN_PAUSA ms: machacar el ala no reinicia sin ver quién ganó (como en combate.js)
  const FIN_PAUSA = 1200, otraVezSiListo = () => (performance.now() - (D.finT || 0) >= FIN_PAUSA ? otraVez() : false);
  const modo = { activo: () => D.fase !== 'nada', accion: () => { if (D.fase === 'fin') otraVezSiListo(); else usar(D.j1, 'golpe_ala'); },
    aviso: () => D.fase === 'fin' ? TXT.otra : TXT.aviso, get verbo() { return D.fase === 'fin' ? TXT.otra : 'Ala'; } };
  let sost1 = 0, sost2 = 0, modo0 = null, sostener0 = null, enganchado = false, fly0 = null, start0 = null, salto1 = null;
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
    if (tjAbierta()) return; // T57: Esc y Enter cierran la tarjeta; el duelo espera
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName)) return;
    if (G.pausa && G.pausa.activa && G.pausa.activa()) return; // con el menú de pausa abierto no se juega
    if (e.key === 'Escape' && D.fase !== 'nada') { e.stopImmediatePropagation(); e.preventDefault(); salir(); return; }
    const mv = MOVER2[e.code] || MOVER2[e.key], ac = ACC2[e.code];
    if (!mv && !ac && c2On() && XT) { // Combate 2.0: extremidades del J2 (teclado numérico) y del J1 (las de input.js)
      const k2 = EXT2[e.code], kl = (e.key || '').toLowerCase(), k1 = !k2 && kl.length === 1 ? XT.EXT_K.find(a => XT.teclaExt(a) === kl) : null;
      if (k2 || k1) { e.stopImmediatePropagation(); e.preventDefault(); if (k2) entradaJ2.teclas++; if (!e.repeat) usarExt(k2 ? D.j2 : D.j1, k2 || k1); return; }
    }
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
    if (!mv && !ac) { if (c2On() && EXT2[e.code]) { e.stopImmediatePropagation(); e.preventDefault(); } return; }
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
  function saltar2() { const j = D.j2; if (D.fase === 'lucha' && !(D.pausa > 0) && j.lift.dura <= 0 && j.mareo <= 0) { j.lift.alto = 1.1; j.lift.t = 0; j.lift.dura = 0.55; sonar('jump');
    if (!(j.brincoCd > 0)) { j.brinco = BRINCO.dura; j.brincoCd = BRINCO.cd; j.abrio = false; } } } // F1: el saltito del J2 es su Brinco (0,25 s sin daño)
  // F1 · cambio 2: Brinco del Jugador 1 (Espacio): un salto corto de lado, como contra la Campeona
  let brincoLado = 1;
  function brinco1() {
    const j = D.j1; if (D.fase !== 'lucha' || D.pausa > 0 || !j || tjAbierta() || j.mareo > 0 || j.brincoCd > 0) return false;
    let dx = M.vx || 0, dz = M.vz || 0, n = Math.hypot(dx, dz);
    if (n < 0.5) { const d = H.dirA(j, D.j2); brincoLado = -brincoLado; dx = -d.z * brincoLado; dz = d.x * brincoLado; n = 1; }
    j.brinco = BRINCO.dura; j.brincoCd = BRINCO.cd; j.abrio = false;
    j.kb.x = dx / n * BRINCO.empuje; j.kb.z = dz / n * BRINCO.empuje; j.kb.t = BRINCO.dura;
    try { if (C2) C2.accion(j, 'esquiva', { fam: 'esquiva', lado: brincoLado }); } catch (e) { /* sin Combate 2.0 */ }
    fx('dust', S.pos.x, S.pos.y + 0.1, S.pos.z); sonar('jump'); D.stats.brincos = (D.stats.brincos || 0) + 1;
    return true;
  }
  function esquive(yo, otro) {
    if (!yo || !otro || yo.abrio) return false;
    yo.abrio = true; otro.abierta = BRINCO.abierta; yo.energia = Math.min(yo.energiaMax || 100, (yo.energia || 0) + BRINCO.energia);
    D.stats.esquivas = (D.stats.esquivas || 0) + 1;
    flotante(TXT.esquivado, 0.9); fx('stars', otro.pos.x, otro.pos.y + 1.8, otro.pos.z); sonar('ring', 3); pintar();
    return true;
  }
  // Mando (Gamepad API): el primero conectado juega como Jugador 2. Botones de la disposición estándar.
  // QA-205: botones con funciones de módulo y salida en un objeto reutilizable (se lee cada cuadro)
  const pad = { b: [], sostB: 0, usado: false, out: { x: 0, y: 0, correr: false } };
  const btnG = (gp, i) => !!(gp.buttons[i] && gp.buttons[i].pressed), nuevoG = (gp, i) => btnG(gp, i) && !pad.b[i];
  function leerMando() {
    let gp = null;
    try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) { gp = g; break; } } catch (e) { /* sin mandos */ }
    if (!gp) return null;
    pad.usado = true;
    let x = gp.axes[0] || 0, y = gp.axes[1] || 0;
    if (btnG(gp, 14)) x = -1; if (btnG(gp, 15)) x = 1; if (btnG(gp, 12)) y = -1; if (btnG(gp, 13)) y = 1;
    if (Math.hypot(x, y) < 0.2) { x = 0; y = 0; }
    if (D.fase === 'lucha') {
      if (nuevoG(gp, 2)) usar(D.j2, 'golpe_ala');
      if (nuevoG(gp, 3)) usar(D.j2, poderDe(D.j2));
      if (nuevoG(gp, 0)) saltar2();
      if (c2On()) { if (nuevoG(gp, 4)) usarExt(D.j2, 'alaIzq'); if (nuevoG(gp, 5)) usarExt(D.j2, 'alaDer'); if (nuevoG(gp, 6)) usarExt(D.j2, 'pataIzq'); if (nuevoG(gp, 7)) usarExt(D.j2, 'pataDer'); } // Combate 2.0
      if (nuevoG(gp, 1)) pad.sostB = performance.now();
      if (!btnG(gp, 1) && pad.b[1] && pad.sostB) { const ms = performance.now() - pad.sostB; pad.sostB = 0; usar(D.j2, ms >= 450 ? poderDe(D.j2) : 'semilla'); }
    } else if (D.fase === 'fin' && (nuevoG(gp, 0) || nuevoG(gp, 2))) otraVezSiListo();
    for (let i = 0; i < gp.buttons.length; i++) pad.b[i] = btnG(gp, i);
    const o = pad.out; o.x = x; o.y = y; o.correr = Math.hypot(x, y) > 0.92 || (!c2On() && btnG(gp, 5)); // con Combate 2.0, RB es el ala derecha
    return o;
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
    ch.update = function (dt) {
      let V2 = null;
      try { pose(this, D.j1); if (c2On() && D.j1 && D.fase !== 'nada') V2 = C2.antes(this, D.j1, oJ1(), dt); } catch (e) { /* pose */ }
      const res = upd0.call(this, V2 ? C2.dtVis(dt) : dt);
      if (V2) try { C2.huesos(this, V2); } catch (e) { /* pose */ }
      return res;
    };
  }
  const oJ = { fin: '', vel: 0, escalaAbs: true };
  function oJ1() { oJ.fin = D.fase === 'fin' ? (D.resultado === 'j1' ? 'gana' : 'pierde') : ''; oJ.vel = Math.hypot(M.vx || 0, M.vz || 0); return oJ; }
  function soltarVittata() {
    if (!pl3d) return;
    if (C2 && D.j1) C2.soltar(pl3d, D.j1, true);
    if (D.j1 && D.j1.wob && pl3d.root) { pl3d.root.rotation.z -= D.j1.wob; D.j1.wob = 0; }
    delete pl3d.update; if (pl3d.update !== upd0) pl3d.update = upd0;
    pl3d = upd0 = null;
  }

  // ---------- Cámara compartida: encuadra a las dos y se abre hasta un límite ----------
  // F1 (16-nov): encuadre() y el paso de cámara viven en combate.js (camaraDos), que el duelo contra la Campeona también usa;
  // aquí, con giro 0: la cámara al sur (+z) mirando al norte; el Jugador 1 empieza a la izquierda y el 2 a la derecha
  // F4-16 y 19: al terminar, durante la cámara lenta, cerca de las dos; luego, con la ganadora (como en combate.js; con «Reducir
  // movimiento», en un corte). El panel final va abajo y aparece al acabar la cámara lenta (FL.panel): la ganadora, entre el HUD y él.
  const CAM_FIN = 7; let camAlto = -0.4; // m que la cámara mira por encima de la ganadora (+1; se decide al terminar: no cada cuadro)
  const ganadora2 = () => (D.resultado === 'j1' ? S.pos : pos2);
  const camDos = Cb.camaraDos({ a: () => S.pos, b: () => pos2, ajusta(e) {
    if (D.fase !== 'fin' || !D.resultado) return;
    if (FL && FL.lento && FL.lento()) { e.d = FL.CAM_LENTO; return; }
    const g = ganadora2(); e.x = g.x; e.y = g.y + camAlto; e.z = g.z; e.d = CAM_FIN;
    if (FL && FL.apartar) FL.apartar(e, g, g === S.pos ? pos2 : S.pos, 0); // revisión F4: la perdedora no tapa a la ganadora
  } }), CAMD = camDos.CAMD, cam = camDos.cam, encuadre = camDos.encuadre;
  let follow0 = null, draw0 = null;
  function camaraPaso(dt, snap) {
    camDos.paso(dt, snap);
    if (G.camara) G.camara.yaw = 0; // WASD y flechas, relativos a esta cámara
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
    if (typeof F.tryJump === 'function' && !F.tryJump.duelo2) { const t0 = F.tryJump; salto1 = Object.assign(function () { if (salto1 && F.tryJump === salto1 && D.fase !== 'nada') { brinco1(); return false; } return t0.apply(this, arguments); }, { duelo2: true, orig: t0 }); F.tryJump = salto1; } // F1: Espacio = Brinco del J1
    addEventListener('keydown', teclaAbajo, true); addEventListener('keyup', teclaArriba, true); addEventListener('blur', sueltaTodo);
    envolver(); tomarCamara();
    document.body.classList.add('v18-duelo-on');
    if (tactil()) tactilOn(true);
  }
  function sueltaTodo() { for (const k in t2) t2[k] = false; sost2 = 0; }
  function soltar() {
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    if (G.dones && G.dones.sostener === sostener1) G.dones.sostener = sostener0;
    if (fly0) { F.toggleFly = fly0; F.startFlying = start0; fly0 = start0 = null; }
    if (salto1 && F.tryJump === salto1) F.tryJump = salto1.orig; salto1 = null;
    removeEventListener('keydown', teclaAbajo, true); removeEventListener('keyup', teclaArriba, true); removeEventListener('blur', sueltaTodo);
    sueltaTodo(); sost1 = 0; soltarVittata(); soltarCamara(); tactilOn(false);
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
        // F4-19: panel de dos líneas: quién gana (en grande) y la serie. F4-18: «¡Uy!» pequeño (fijo: no mueve el HUD)
        '#v18-duelo2 .vd-fin{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);margin:0 auto;width:min(520px,calc(100vw - 32px));box-sizing:border-box;padding:8px 10px}#v18-duelo2 .vd-fin.vd-fin-espera{visibility:hidden}' +
        '@media (max-height:500px){#v18-duelo2 .vd-fin{padding:5px 8px}#v18-duelo2 .vd-fin p[data-k="finTxt"]{font-size:24px!important;margin-bottom:2px!important}#v18-duelo2 .vd-fin p.vd-fin-serie{margin:0 0 4px!important}}' +
        '#v18-duelo2 .vd-fin p[data-k="finTxt"]{font-size:26px;font-weight:800;color:#ffe27a;line-height:1.15;margin-bottom:4px}' +
        '#v18-duelo2 .vd-uy{position:fixed;left:0;right:0;top:40%;margin:0 auto;width:max-content;padding:2px 12px;border-radius:12px;background:rgba(30,40,30,.72);font-size:20px;font-weight:700;pointer-events:none}#v18-duelo2 .vd-uy[hidden]{display:none}' +
        // F1 · cambio 7 (revisión): el marcador de la serie en el panel final y «Otra vez» atenuado mientras espera FIN_PAUSA
        '#v18-duelo2 .vd-fin p.vd-fin-serie{margin:-2px 0 10px;font-size:17px;letter-spacing:.02em;word-spacing:.3em}#v18-duelo2 .vd-fin p.vd-fin-serie[hidden]{display:none}#v18-duelo2 .vd-fin button.espera{opacity:.55;cursor:default}' +
        '#v18-duelo2 .vd-vent{display:inline-block;margin:0 4px;padding:0 7px;border-radius:9px;background:#ffd27a;color:#3b2a14;text-shadow:none;font-size:11px;font-weight:700;line-height:16px;vertical-align:2px}#v18-duelo2 .vd-vent[hidden]{display:none}' +
        '#card:has(.v18-d2){width:min(680px,calc(100vw - 32px))}.v18-d2 .d2-vent{margin:4px 0 6px}.v18-d2 .d2-vent .btn{min-height:44px}' +
        '#v18-duelo2 button{pointer-events:auto;font:inherit;font-size:15px;font-weight:600;min-height:44px;padding:6px 14px;border-radius:22px;border:0;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 6px #0005;cursor:pointer}' +
        '.v18-d2 .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.v18-d2 .d2-teclas{font-size:14px;line-height:1.4;margin:4px 0 0}' +
        '.v18-d2 .d2-fila{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:4px 0}.v18-d2 .d2-k{white-space:nowrap}.v18-d2 .d2-k kbd{margin-right:2px}' +
        // Cómo se pelea (8-nov): chips con tecla y recarga, pistas por jugador y entreno
        '#v18-duelo2 [data-icon="semilla"]{--icon:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 2c4 3 6 7 6 11a6 6 0 0 1-12 0c0-4 2-8 6-11z\'/%3E%3C/svg%3E")}' +
        '#v18-duelo2 .vd-chips{display:flex;gap:4px;margin-top:5px}#v18-duelo2 .r .vd-chips{justify-content:flex-end}' +
        '#v18-duelo2 .vd-chip{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:4px;padding:3px 6px 3px 7px;border-radius:14px;background:#fff3d6;color:#3b2a14;text-shadow:none;font-size:12px;font-weight:600;--icon-size:15px;transition:box-shadow .15s,opacity .15s}' +
        '#v18-duelo2 .vd-chip kbd{font:700 13px/1 Fredoka,system-ui,sans-serif;min-width:18px;padding:3px 5px;border-radius:6px;background:#3b2a14;color:#fff3d6;text-align:center}' +
        '#v18-duelo2 .vd-chip .vd-cdv{position:absolute;left:0;right:0;bottom:0;height:var(--cd,0%);background:rgba(40,30,20,.45)}' +
        '#v18-duelo2 .vd-chip.listo{box-shadow:0 0 0 2px #8fe08a,0 0 10px #8fe08a99}#v18-duelo2 .vd-chip.sin{opacity:.55}' +
        '#v18-duelo2 .vd-pista{margin-top:5px;display:inline-block;background:rgba(255,227,154,.95);color:#3b2a14;text-shadow:none;font-weight:600;font-size:13px;padding:3px 10px;border-radius:12px}#v18-duelo2 .vd-pista[hidden]{display:none}' +
        '#v18-duelo2 button.vd-como{display:flex;align-items:center;gap:5px;margin:6px auto 0;min-height:44px;padding:4px 12px;font-size:13px;background:#ffe39a;--icon-size:16px}#v18-duelo2 button.vd-como[hidden]{display:none}' +
        '#v18-duelo2 .vd-ent{margin:8px auto 0;max-width:420px;background:rgba(255,248,234,.96);color:#3b2a14;text-shadow:none;border-radius:16px;padding:10px 12px;box-shadow:0 4px 14px #0006;text-align:center}#v18-duelo2 .vd-ent[hidden]{display:none}' +
        '#v18-duelo2 .vd-ent-cab{font-size:13px;font-weight:600;opacity:.8}#v18-duelo2 .vd-ent-txt{font-size:18px;font-weight:600;margin:6px 0}' +
        '#v18-duelo2 .vd-ent-js{display:flex;gap:10px;justify-content:center;margin-bottom:8px}#v18-duelo2 .vd-ent-j{display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;background:#3b2a1414;font-weight:600}' +
        '#v18-duelo2 .vd-ent-j kbd{font:700 22px/1 Fredoka,system-ui,sans-serif;min-width:36px;padding:6px 8px;border-radius:9px;background:#3b2a14;color:#fff3d6;box-shadow:0 3px 0 #000a}' +
        '#v18-duelo2 .vd-ent-j i{font-style:normal;color:#2e8b3e;font-size:20px;visibility:hidden}#v18-duelo2 .vd-ent-j.ya{background:#8fe08a66}#v18-duelo2 .vd-ent-j.ya i{visibility:visible}' +
        '#v18-duelo2 .vd-ent button{min-height:44px;min-width:44px;font-size:14px;background:#3b2a14;color:#fff3d6}' +
        // F1 · cambio 3: reloj del asalto y asaltos ganados (oro = Jugador 1, azul = Jugador 2), debajo de los paneles
        '#v18-duelo2 .vd-reloj{display:flex;align-items:center;justify-content:center;gap:8px;margin:4px auto 0;width:max-content;padding:2px 10px;border-radius:14px;background:rgba(30,40,30,.72);font-weight:700;font-size:16px;line-height:1.2}#v18-duelo2 .vd-reloj[hidden]{display:none}' +
        '#v18-duelo2 .vd-reloj b{min-width:24px;text-align:center}#v18-duelo2 .vd-as{display:flex;gap:4px}#v18-duelo2 .vd-as i{width:11px;height:11px;border-radius:50%;border:2px solid #ffd27a;box-sizing:border-box;display:block}' +
        '#v18-duelo2 .vd-serie{margin:3px auto 0;width:max-content;padding:1px 10px;border-radius:12px;background:rgba(30,40,30,.72);font-weight:700;font-size:14px;line-height:1.3;letter-spacing:.02em;word-spacing:.3em}#v18-duelo2 .vd-serie[hidden]{display:none}' +
        '#v18-duelo2 .vd-as.r i{border-color:#7fd3ff}#v18-duelo2 .vd-as.j i.on{background:#ffd27a}#v18-duelo2 .vd-as.r i.on{background:#7fd3ff}#v18-duelo2 .vd-as i[hidden]{display:none}';
      document.head.appendChild(st);
    }
    const el = document.createElement('div'); el.id = 'v18-duelo2'; el.hidden = true;
    const pl = () => Array.from({ length: PLUMAS }, () => '<i></i>').join('');
    // Chips de acción (icono + tecla; .vd-cdv es la recarga) y una pista breve por jugador
    const chips = (k, t) => [['golpe_ala', 'wing', TXT.chAla], ['semilla', 'semilla', TXT.chSemilla], ['poder', 'bolt', TXT.chPoder]].map(([a, ico, n], i) =>
      `<span class="vd-chip" data-a="${a}" data-icon="${ico}"><span data-k="cn${k}-${a}">${n}</span><kbd>${esc(t[i])}</kbd><i class="vd-cdv"></i></span>`).join('');
    const lado = (c, n, k, tc) => `<div class="vd-lado ${c}"><div class="vd-nom">${n}<span class="vd-vent" data-k="vent${k}" hidden>${TXT.ventaja}</span></div><div class="vd-pod" data-k="p${k}"></div><div class="vd-pl" data-k="pl${k}">${pl()}</div><div class="vd-et">${TXT.energia}</div><div class="vd-en" data-k="en${k}"><b></b></div><div class="vd-tc">${tc}</div><div class="vd-chips" data-k="ch${k}">${chips(k, TECLAS['j' + k])}</div><div class="vd-pista" data-k="pista${k}" hidden></div></div>`;
    const fj = k => `<div class="vd-ent-j" data-k="entJ${k}"><span>${k === 1 ? TXT.j1 : TXT.j2}</span><kbd data-k="entK${k}"></kbd><i>✓</i></div>`;
    el.innerHTML = `<div class="vd-fila">${lado('j', TXT.j1, 1, 'W A S D')}${lado('r', TXT.j2, 2, '← ↑ → ↓')}</div>` +
      `<div class="vd-reloj" data-k="reloj" hidden><span class="vd-as j" data-k="as1"><i></i><i></i></span><b data-k="relojN"></b><span class="vd-as r" data-k="as2"><i></i><i></i></span></div>` +
      `<div class="vd-serie" data-k="serie" hidden></div>` +
      `<div class="vd-centro" data-k="centro"></div><div class="vd-uy" data-k="uy" hidden aria-hidden="true"></div>` +
      `<div class="vd-ent" data-k="ent" hidden><div class="vd-ent-cab" data-k="entPaso"></div><div class="vd-ent-txt" data-k="entTxt"></div><div class="vd-ent-js">${fj(1)}${fj(2)}</div><button data-a="saltarEnt" type="button">${TXT.saltarEnt}</button></div>` +
      `<button class="vd-como" data-a="como" data-k="como" type="button" data-icon="question">${TXT.como}</button>` +
      `<div class="vd-fin" data-k="fin" hidden><p data-k="finTxt"></p><p class="vd-fin-serie" data-k="finSerie" hidden></p><button type="button" data-a="otra" data-k="otraB">${TXT.otra}</button> <button type="button" data-a="salir">${TXT.salir}</button></div>`;
    const hudBoton = e => { // F22: un solo manejador para el dedo/ratón (pointerdown) y el teclado (click con detail 0: Enter o Espacio con el foco)
      const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      if (e.type === 'click' && e.detail !== 0) return; // el click del ratón o del dedo ya entró por pointerdown
      e.preventDefault(); e.stopPropagation();
      const a = b.dataset.a;
      if (a === 'como') abrirComo(!ent); else if (a === 'saltarEnt') saltarEntreno(); else if (a === 'otra') otraVezSiListo(); else salir();
    };
    el.addEventListener('pointerdown', hudBoton); el.addEventListener('click', hudBoton);
    document.body.appendChild(el);
    hud = { el, q: k => el.querySelector('[data-k="' + k + '"]') };
    return hud;
  }
  // F1 · cambio 7: tantas plumas en el HUD como plumasMax (5, o 7 con Ventaja) y el marcador de la sesión
  function ajustarPlumas() {
    if (!hud || !D.j1) return;
    for (const [k, f] of [['pl1', D.j1], ['pl2', D.j2]]) { const el = hud.q(k), n = f.plumasMax || PLUMAS; while (el.children.length < n) el.appendChild(document.createElement('i')); while (el.children.length > n) el.lastChild.remove(); }
    for (const k of [1, 2]) { const v = hud.q('vent' + k), on = !!D.ventaja['j' + k]; if (v && v.hidden === on) v.hidden = !on; } // con Ventaja, se ve junto al nombre
  }
  function pintarSerie() {
    if (!hud) return; const el = hud.q('serie'); if (!el) return;
    // (en el final no: el marcador ya va en el panel, no dos veces en pantalla; revisión F4)
    const ver = D.fase !== 'nada' && D.fase !== 'fin' && !ent && (D.serie.j1 + D.serie.j2) > 0, t = TXT.serie(D.serie.j1, D.serie.j2);
    if (el.hidden === ver) el.hidden = !ver; if ((ver || D.fase === 'fin') && el.textContent !== t) el.textContent = t;
  }
  function pintarFin() { // F1 · cambio 7 (revisión): serie en el panel final y «Otra vez» atenuado hasta que se puede pulsar
    if (!hud || D.fase !== 'fin') return;
    const fs = hud.q('finSerie'), ver = !ent && (D.serie.j1 + D.serie.j2) > 0, t = TXT.serie(D.serie.j1, D.serie.j2);
    if (fs.hidden === ver) fs.hidden = !ver; if (ver && fs.textContent !== t) fs.textContent = t;
    const b = hud.q('otraB'), espera = performance.now() - (D.finT || 0) < FIN_PAUSA;
    if (b.classList.contains('espera') !== espera) { b.classList.toggle('espera', espera); b.setAttribute('aria-disabled', String(espera)); }
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
    texto('cn1-poder', (H.get(D.j1.poder) || {}).nombre || TXT.chPoder); texto('cn2-poder', (H.get(D.j2.poder) || {}).nombre || TXT.chPoder);
    hud.q('como').hidden = !!ent;
    pintarChips();
  }
  // Recarga visual: cada cuadro, pero solo escribe en el DOM cuando cambia (pasos de 5 %)
  function pintarChips() {
    if (!hud || !D.j1) return;
    if (FL) { const lu = D.fase === 'lucha' && !ent; FL.poder(estP1, D.j1, lu, poder1, sonar); FL.poder(estP2, D.j2, lu, poder2, sonar); } // F4-17
    for (const [f, k] of [[D.j1, 'ch1'], [D.j2, 'ch2']]) for (const b of hud.q(k).children) {
      const id = b.dataset.a === 'poder' ? f.poder : b.dataset.a, h = H.ver(f, H.get(id)) || {}, cd = f.cd[id] || 0;
      const pct = Math.round(Math.max(0, Math.min(1, cd / (h.cooldown || 1))) * 20) * 5;
      const st = D.fase === 'lucha' && H.listo(f, id).ok ? 'listo' : cd > 0 ? 'cd' : 'sin';
      if (b._pct !== pct) { b._pct = pct; b.style.setProperty('--cd', pct + '%'); }
      if (b._st !== st) { b._st = st; b.classList.toggle('listo', st === 'listo'); b.classList.toggle('cd', st === 'cd'); b.classList.toggle('sin', st === 'sin'); }
    }
  }

  // ---------- Cómo se pelea: entreno de 3 pasos para las dos y pistas por jugador ----------
  const ENT = ['golpe_ala', 'semilla', 'poder'], ENT_TXT = [TXT.ent1, TXT.ent2, TXT.ent3], CLAVE_ENT = 'av_v18_duelo2_entreno';
  let ent = null; // { paso, j1, j2 (hecho en este paso), fin }
  const entVisto = () => { try { return localStorage.getItem(CLAVE_ENT) === '1'; } catch (e) { return false; } };
  const marcarEnt = () => { try { localStorage.setItem(CLAVE_ENT, '1'); } catch (e) { /* sin almacenamiento */ } };
  const pistas = { j1: { t: 0, vis: 0, pl: 0, golpeado: false, dom: {} }, j2: { t: 0, vis: 0, pl: 0, golpeado: false, dom: {} } }; // dom: veces bien hecho (en memoria)
  function pintarEntreno() {
    if (!hud) return;
    hud.q('ent').hidden = !ent; if (!ent) return;
    const i = Math.min(ent.paso, 2), pon = (k, t) => { const e = hud.q(k); if (e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } };
    pon('entPaso', TXT.entPaso(i + 1)); pon('entTxt', ENT_TXT[i]); const tk = tactil() ? [TT.ala, TT.semilla, TT.poder] : null; pon('entK1', tk ? tk[i] : TECLAS.j1[i]); pon('entK2', tk ? tk[i] : TECLAS.j2[i]); // T44: en táctil, el botón
    hud.q('entJ1').classList.toggle('ya', !!ent.j1); hud.q('entJ2').classList.toggle('ya', !!ent.j2);
  }
  function saltarEntreno() { if (!ent) return false; marcarEnt(); ent = null; return iniciar({ forzar: true, sinEntreno: true }); }
  function alUsar(f, id, r) {
    const k = f === D.j1 ? 'j1' : 'j2', otro = f === D.j1 ? D.j2 : D.j1, P = pistas[k], d = Math.hypot(f.pos.x - otro.pos.x, f.pos.z - otro.pos.z);
    if (id === 'golpe_ala' && r.acierto) P.dom.cerca = (P.dom.cerca || 0) + 1;
    if (id === 'semilla' && d > 4) P.dom.lejos = (P.dom.lejos || 0) + 1;
    if (id === f.poder) P.dom.poder = (P.dom.poder || 0) + 1;
    if (!ent || ent.fin > 0) return;
    const quiere = ENT[ent.paso] === 'poder' ? f.poder : ENT[ent.paso];
    if (id !== quiere || ent[k]) return;
    if (quiere === 'golpe_ala' && !r.acierto) { flotante(TXT.masCerca, 1); return; }
    ent[k] = true; sonar('ring', 1);
    if (ent.j1 && ent.j2) {
      ent.paso++; ent.j1 = ent.j2 = false; flotante(TXT.bien, 0.9);
      for (const g of [D.j1, D.j2]) { g.cd = {}; g.energia = g.energiaMax; g.mareo = 0; g.inv = 0; }
      if (ent.paso >= ENT.length) { ent.fin = 1.3; marcarEnt(); if (G.ui && G.ui.toast) G.ui.toast(TXT.entFin, 2600); }
    }
    pintarEntreno();
  }
  function pasoEntreno(dt) {
    for (const g of [D.j1, D.j2]) { g.plumas = g.plumasMax; g.energia = g.energiaMax; }
    if (ent.fin > 0) { ent.fin -= dt; if (ent.fin <= 0) { ent = null; iniciar({ forzar: true, sinEntreno: true }); } }
  }
  function pistaDe(k, t) {
    const P = pistas[k], e = hud && hud.q(k === 'j1' ? 'pista1' : 'pista2'); if (!e) return;
    if (t) { if (e.textContent !== t) e.textContent = t; e.hidden = false; P.vis = 2.4; } else { e.hidden = true; P.vis = 0; }
  }
  // Por jugador: una pista cada 4,5 s como mucho y solo las que aún no domina (dos veces bien hecho); la del golpe, una vez
  function pasoPistas(dt) {
    const d = Math.hypot(D.j1.pos.x - D.j2.pos.x, D.j1.pos.z - D.j2.pos.z), alaR = ((H.get('golpe_ala') || {}).alcance || 2.4) + 0.3;
    for (const [k, f] of [['j1', D.j1], ['j2', D.j2]]) {
      const P = pistas[k], T = k === 'j1' ? TXT.pista1 : TXT.pista2;
      if (P.vis > 0 && (P.vis -= dt) <= 0) pistaDe(k, null);
      if (f.plumas < P.pl && !P.golpeado) { P.golpeado = true; pistaDe(k, DEFENSAS.has(f.poder) ? T.escudo : T.golpe); P.vis = 3.2; P.t = 4.5; }
      P.pl = f.plumas;
      if ((P.t -= dt) > 0) continue;
      const dom = n => (P.dom[n] || 0) >= 2;
      let t = null;
      if (!dom('poder') && f.energia >= f.energiaMax - 0.5 && H.listo(f, f.poder).ok) t = T.poder;
      else if (!dom('cerca') && d <= alaR && H.listo(f, 'golpe_ala').ok) t = T.cerca;
      else if (!dom('lejos') && d > 5.5 && H.listo(f, 'semilla').ok) t = T.lejos;
      if (t) { pistaDe(k, t); P.t = 4.5; } else P.t = 0.3;
    }
  }

  // ---------- Tarjeta: elegir la cotorra del Jugador 2 y ver las teclas ----------
  const filaTeclas = (quien, lista) => `<div class="d2-fila"><b>${esc(quien)}</b> ` +
    lista.map(([k, t]) => `<span class="d2-k"><kbd>${esc(k)}</kbd> ${esc(t)}</span>`).join(' ') + '</div>';
  // ---------- T44 · En el teléfono: en horizontal, cada jugador con su joystick y sus 4 botones ----------
  // Jugador 1 a la izquierda: el joystick de siempre (#stick) y su 2×2 encima. Jugador 2 a la derecha: un joystick propio y su
  // 2×2 encima. Los botones grandes (#acts) se ocultan. Ala y Pata eligen el lado solos (alternan: dos toques = combo).
  // En vertical: «Gira el teléfono» y el duelo en pausa (G.pausa 'duelo2-girar') hasta que se gire.
  const T44 = { el: null, st2: { id: null, x: 0, y: 0, cx: 0, cy: 0 }, lado: { j1: { ala: 1, pata: 1 }, j2: { ala: 1, pata: 1 } }, girar: false };
  const TT = { ala: 'Ala', pata: 'Pata', semilla: 'Semilla', poder: 'Poder', brinco: 'Brinco', gira: 'Gira el teléfono: el Duelo de 2 se juega en horizontal, cada jugador por su lado.',
    j1: 'Jugador 1', j2: 'Jugador 2', tarjetaT: 'En el teléfono, en horizontal: el Jugador 1 a la izquierda (joystick y 4 botones) y el Jugador 2 a la derecha (su joystick y sus 4 botones).' };
  function usarTactil(f, quien, a) {
    if (D.fase !== 'lucha' || !f) return false;
    if (a === 'brinco') { if (f === D.j1) return brinco1(); const cd = f.brincoCd > 0; saltar2(); return !cd && f.brinco > 0; } // F1: Brinco en el teléfono (un botón junto a cada 2×2)
    if (a === 'ala' || a === 'pata') {
      if (!c2On() || ent) return a === 'ala' ? usar(f, 'golpe_ala').ok : false; // en el entreno, el aletazo de siempre (lo que pide su paso 1)
      const L = T44.lado[quien]; L[a] = -L[a];
      return usarExt(f, a + (L[a] > 0 ? 'Izq' : 'Der')).ok;
    }
    return usar(f, a === 'poder' ? poderDe(f) : 'semilla').ok;
  }
  function toque2() { const s2 = T44.st2; return T44.el && s2.id != null ? { x: s2.x, y: s2.y, correr: Math.hypot(s2.x, s2.y) > 0.92 } : null; }
  function cssT44() {
    if (document.getElementById('d2-tactil-css')) return;
    const st = document.createElement('style'); st.id = 'd2-tactil-css';
    st.textContent = '#d2-tactil{position:fixed;inset:0;pointer-events:none;z-index:42;font-family:Fredoka,system-ui,sans-serif}#d2-tactil[hidden]{display:none}' +
      '#d2-tactil .d2-pad{position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 168px);display:grid;grid-template-columns:repeat(2,58px);gap:8px;pointer-events:none}' +
      '#d2-tactil .d2-pad.j1{left:max(14px,env(safe-area-inset-left,0px))}#d2-tactil .d2-pad.j2{right:max(14px,env(safe-area-inset-right,0px))}' +
      '#d2-tactil .d2-pad b{grid-column:1/3;text-align:center;font-size:12px;color:#fff8ea;text-shadow:0 1px 2px #000a}' +
      '#d2-tactil .d2-pad button{pointer-events:auto;width:58px;height:58px;border-radius:18px;border:3px solid var(--borde);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:700 11px/1 Fredoka,system-ui,sans-serif;color:#fff;background:rgba(20,70,40,.84);box-shadow:0 3px 0 #0b2a17,0 4px 10px #0007;text-shadow:0 1px 2px #000;--icon-size:24px;touch-action:none;-webkit-user-select:none;user-select:none}' +
      '#d2-tactil .d2-pad.j1{--borde:#ffd27a}#d2-tactil .d2-pad.j2{--borde:#7fd3ff}#d2-tactil .d2-pad button.pata{background:rgba(110,55,10,.86)}#d2-tactil .d2-pad button.semilla{background:rgba(150,105,10,.88)}#d2-tactil .d2-pad button.poder{background:rgba(110,40,140,.88)}' +
      '#d2-tactil .d2-pad button:active{transform:translateY(2px)}' +
      '#d2-tactil .d2-pad button.brinco{position:absolute;bottom:0;width:56px;height:56px;border-radius:50%;background:rgba(20,90,120,.86)}#d2-tactil .d2-pad.j1 button.brinco{left:calc(100% + 10px)}#d2-tactil .d2-pad.j2 button.brinco{right:calc(100% + 10px)}' +
      '#d2-tactil .d2-st2{position:absolute;right:max(24px,env(safe-area-inset-right,0px));bottom:calc(env(safe-area-inset-bottom,0px) + 18px);width:136px;height:136px;border-radius:50%;background:rgba(255,255,255,.14);border:3px solid #7fd3ff;pointer-events:auto;touch-action:none}' +
      '#d2-tactil .d2-st2 i{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;background:#7fd3ff;box-shadow:0 3px 8px #0007}' +
      '#d2-tactil .d2-gira{position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:rgba(8,20,14,.88);color:#fff8ea;font-size:20px;font-weight:700;text-align:center;pointer-events:auto}#d2-tactil .d2-gira[hidden]{display:none}' +
      '#d2-tactil .d2-pad[hidden],#d2-tactil .d2-st2[hidden],#d2-tactil .d2-salir[hidden]{display:none}#d2-tactil [data-icon="semilla"]{--icon:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 2c4 3 6 7 6 11a6 6 0 0 1-12 0c0-4 2-8 6-11z\'/%3E%3C/svg%3E")}' +
      'body.d2-tactil-on #v18-duelo2 :is(.vd-chips,.vd-tc,.vd-et){display:none!important}body.d2-tactil-on #v18-duelo2 .vd-lado{padding:4px 8px}' +
      'body.d2-tactil-on :is(#quest,#inv,#b-diary,#b-emotes,#b-construir,#b-menu,#prompt,#minimapa,#marcador){visibility:hidden!important}' + // «Salir» va arriba a la izquierda
      '#d2-tactil .d2-salir{position:absolute;left:max(14px,env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 10px);pointer-events:auto;min-height:44px;padding:4px 14px;border-radius:22px;border:0;background:#ffd0c4;color:#3b2a14;font:700 15px Fredoka,system-ui,sans-serif;box-shadow:0 2px 6px #0006}' +
      'body.d2-tactil-on #acts,body.d2-tactil-on #v18-exp-poder,body.d2-tactil-on #v18-extra,body.d2-tactil-on #v18-duelo-tags{visibility:hidden!important}';
    document.head.appendChild(st);
  }
  function tactilOn(on) {
    if (!on) {
      if (T44.el) { T44.el.remove(); T44.el = null; }
      document.body.classList.remove('d2-tactil-on'); T44.st2.id = null; T44.st2.x = T44.st2.y = 0;
      if (T44.girar) { T44.girar = false; try { G.pausa && G.pausa.set && G.pausa.set('duelo2-girar', false); } catch (e) { /* */ } }
      return;
    }
    if (T44.el) return;
    cssT44();
    const pad = q => `<div class="d2-pad ${q}"><b>${q === 'j1' ? TT.j1 : TT.j2}</b>` + ['ala', 'pata', 'semilla', 'poder'].map(a => `<button type="button" class="${a}" data-q="${q}" data-a="${a}" data-icon="${{ ala: 'wing', pata: 'paw', semilla: 'semilla', poder: 'bolt' }[a]}" aria-label="${TT[a]} (${q === 'j1' ? TT.j1 : TT.j2})"><span>${TT[a]}</span></button>`).join('') +
      `<button type="button" class="brinco" data-q="${q}" data-a="brinco" data-icon="jump" aria-label="${TT.brinco} (${q === 'j1' ? TT.j1 : TT.j2})"><span>${TT.brinco}</span></button></div>`; // F1: el Brinco, al lado de dentro del 2×2 (no lo mueve)
    const el = document.createElement('div'); el.id = 'd2-tactil';
    el.innerHTML = pad('j1') + pad('j2') + '<div class="d2-st2" aria-label="Joystick del Jugador 2"><i></i></div><button type="button" class="d2-salir" data-salir="1"></button><div class="d2-gira" hidden></div>';
    el.querySelector('.d2-salir').textContent = TXT.salir;
    el.querySelector('.d2-gira').textContent = TT.gira;
    el.addEventListener('pointerdown', e => {
      if (e.target.closest && e.target.closest('[data-salir]')) { e.preventDefault(); e.stopPropagation(); salir(); return; }
      const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      usarTactil(b.dataset.q === 'j1' ? D.j1 : D.j2, b.dataset.q, b.dataset.a);
    });
    const st = el.querySelector('.d2-st2'), bola = st.firstChild, s2 = T44.st2;
    const mueve = e => { const dx = e.clientX - s2.cx, dy = e.clientY - s2.cy, R = 50, n = Math.hypot(dx, dy) || 1, k = Math.min(1, n / R); s2.x = dx / n * k; s2.y = dy / n * k; bola.style.transform = `translate(${s2.x * R}px,${s2.y * R}px)`; };
    st.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const r = st.getBoundingClientRect(); s2.id = e.pointerId; s2.cx = r.left + r.width / 2; s2.cy = r.top + r.height / 2; try { st.setPointerCapture(e.pointerId); } catch (x) { /* */ } mueve(e); });
    st.addEventListener('pointermove', e => { if (e.pointerId === s2.id) mueve(e); });
    const suelta = e => { if (e.pointerId !== s2.id) return; s2.id = null; s2.x = s2.y = 0; bola.style.transform = ''; };
    st.addEventListener('pointerup', suelta); st.addEventListener('pointercancel', suelta);
    document.body.appendChild(el); T44.el = el;
    document.body.classList.add('d2-tactil-on');
    pintarT44();
  }
  // Cada cuadro (barato): en vertical, el aviso de girar y la pausa; los botones solo en la pelea
  function pintarT44() {
    const el = T44.el; if (!el) return;
    const vertical = innerHeight > innerWidth, gira = vertical && D.fase !== 'fin';
    const g = el.querySelector('.d2-gira'); if (g.hidden === gira) g.hidden = !gira;
    if (gira !== T44.girar) { T44.girar = gira; try { G.pausa && G.pausa.set && G.pausa.set('duelo2-girar', gira); } catch (e) { /* */ } }
    const ver = D.fase === 'lucha' || D.fase === 'cuenta';
    for (const p of el.querySelectorAll('.d2-pad, .d2-st2, .d2-salir')) if (p.hidden === ver) p.hidden = !ver;
  }
  addEventListener('resize', () => pintarT44());

  function abrirTarjeta() {
    if (!disponible()) return false;
    crearJ2();
    // F20 r2: los estilos de la tarjeta iban con los del HUD (montarHud, al empezar): al abrirla desde la portada aún no estaban y los
    // botones salían sueltos a la izquierda («Jugador 2» solo en su fila). Ahora se ponen aquí (tarjeta más ancha y filas centradas).
    if (!document.getElementById('v18-d2-card-css')) {
      const st = document.createElement('style'); st.id = 'v18-d2-card-css';
      st.textContent = '#card:has(.v18-d2){width:min(680px,calc(100vw - 32px))}.v18-d2 .row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.v18-d2 .d2-vent{margin:4px 0 6px}.v18-d2 .d2-vent .btn{min-height:44px}' +
        '.v18-d2 .d2-teclas{font-size:14px;line-height:1.4;margin:4px 0 0}.v18-d2 .d2-fila{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:4px 0}.v18-d2 .d2-k{white-space:nowrap}.v18-d2 .d2-k kbd{margin-right:2px}';
      document.head.appendChild(st);
    }
    const bot = ESPECIES.map(e => `<button class="btn${e.id === D.esp2 ? '' : ' ghost'}" type="button" data-d2sp="${e.id}" aria-pressed="${e.id === D.esp2}">${esc(e.nombre)}<small style="display:block;opacity:.8">${esc((H.get(H.poderDe(e.id)) || {}).nombre || '')}</small></button>`).join('');
    G.ui.showCard(`<div class="v18-d2"><h2>${esc(TXT.titulo)}</h2><p>${esc(TXT.nota)}</p><p><b>${esc(TXT.elige)}</b></p><div class="row">${bot}</div>` +
      (tactil() ? `<p class="note" data-d2tactil>${esc(TT.tarjetaT)}</p>` : '') +
      `<div class="d2-teclas"${tactil() ? ' hidden' : ''}>${filaTeclas(TXT.jugador1, [['W A S D', TXT.mover], ['E', TXT.ala], ['F', TXT.semillaMant], ['G', TXT.poder], [TXT.espacio, TXT.brinco]])}` +
      `${filaTeclas(TXT.jugador2, [['← ↑ ↓ →', TXT.mover], ['.', TXT.ala], [',', TXT.semillaMant], ['-', TXT.poder], ['Enter', TXT.saltito]])}<div class="note">${esc(TXT.mando)}</div>${c2On() ? `<div class="note" data-d2ext>${esc(TXT.extTeclas)}</div>` : ''}</div>` +
      `<div class="row d2-vent" style="align-items:center"><span><b>${esc(TXT.ventaja)}</b> <span>${esc(TXT.ventajaNota)}</span></span>${['j1', 'j2'].map(k => `<button class="btn${D.ventaja[k] ? '' : ' ghost'}" type="button" data-d2v="${k}" aria-pressed="${!!D.ventaja[k]}" aria-label="${esc(TXT.ventaja + ': ' + TXT[k])}">${esc(TXT[k])}</button>`).join('')}</div>` +
      `<div class="row"><button class="btn" id="v18-d2-ok" type="button">${esc(TXT.jugar)}</button>${TJ ? `<button class="btn secondary" id="v18-d2-como" type="button" data-icon="question">${esc(TXT.como)}</button>` : ''}<button class="btn ghost" id="v18-d2-no" type="button">${esc(TXT.cancelar)}</button></div></div>`);
    const card = G.ui.$('card');
    card.querySelectorAll('[data-d2sp]').forEach(b => { b.onclick = () => {
      D.esp2 = b.getAttribute('data-d2sp');
      card.querySelectorAll('[data-d2sp]').forEach(x => { const on = x === b; x.classList.toggle('ghost', !on); x.setAttribute('aria-pressed', String(on)); });
    }; });
    card.querySelectorAll('[data-d2v]').forEach(b => { b.onclick = () => { // F1 · cambio 7: Ventaja por jugadora (se puede marcar a las dos o a ninguna)
      const k = b.getAttribute('data-d2v'); D.ventaja[k] = !D.ventaja[k]; b.classList.toggle('ghost', !D.ventaja[k]); b.setAttribute('aria-pressed', String(D.ventaja[k]));
    }; });
    G.ui.$('v18-d2-ok').onclick = () => { G.ui.hideCard(); iniciar({}); };
    G.ui.$('v18-d2-no').onclick = () => G.ui.hideCard();
    const bc = G.ui.$('v18-d2-como'); if (bc) bc.onclick = () => abrirComo(false, () => { G.ui.hideCard(); iniciar({ sinTarjeta: true }); }); // T57: encima de la elección; «¡A pelear!» empieza (Esc vuelve a la elección)
    try { G.ui.$('v18-d2-ok').focus({ preventScroll: true }); } catch (e) { /* sin foco */ } // F22: el teclado empieza en «¡A jugar!» (antes, 10 Tab desde BODY)
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
    try { G.audio.precargar(['duelo_ala', 'duelo_pata', 'duelo_semilla', 'duelo_poder', 'duelo_victoria', 'duelo_derrota']); } catch (e) { /* sin audio */ } // T45: sus efectos de Suno, antes de que toquen
    o = o || {};
    if (!disponible() && !o.forzar) return false;
    if (Cb.estado().fase !== 'nada') return false; // nunca a la vez que el duelo contra la Campeona
    if (o.especie2) D.esp2 = o.especie2;
    if (o.ventaja) D.ventaja = { j1: !!o.ventaja.j1, j2: !!o.ventaja.j2 }; // F1 · cambio 7 (pruebas y menú); si no, lo marcado en la tarjeta
    crearJ2(); pielJ2();
    quitarBalas(); D.timers.length = 0; D.trampas.length = 0;
    if (D.j1 && D.j1.wob && pl3d && pl3d.root) { pl3d.root.rotation.z -= D.j1.wob; D.j1.wob = 0; }
    nuevos(); D.resultado = null; D.stats = { usos1: 0, usos2: 0, golpes: 0 }; D.tLucha = 0;
    D.nAsaltos = Math.max(1, o.asaltos || asaltosDef || ASALTOS); D.asalto = 1; D.gan1 = D.gan2 = 0; D.pausa = 0; D.tAsalto = 0; D.empate = false; // F1 · cambio 3
    comboVis = 0; if (hud && hud.q('combo')) hud.q('combo').hidden = true;
    const conEntreno = !!o.entreno || (!o.sinCuenta && !o.sinEntreno && !entVisto()); // el primer duelo de 2 empieza con el entreno
    const conTarjeta = !o.entreno && !o.sinCuenta && !o.sinEntreno && !o.sinTarjeta && !tjVista(); // T57: antes, la tarjeta
    ent = null; for (const k in pistas) { const P = pistas[k]; P.t = 2.5; P.pl = D[k] ? D[k].plumasMax : PLUMAS; P.golpeado = false; }
    colocar();
    montarHud(); ajustarPlumas(); hud.el.hidden = false; hud.q('fin').hidden = true; pistaDe('j1', null); pistaDe('j2', null);
    enganchar(); sueltaTodo();
    if (conEntreno) { D.fase = 'lucha'; ent = { paso: 0, j1: false, j2: false, fin: 0 }; flotante(''); }
    else if (o.sinCuenta) { D.fase = 'lucha'; flotante(''); } else { D.fase = 'cuenta'; D.cuenta = o.cuenta > 0 ? o.cuenta : 3; flotante(String(Math.ceil(D.cuenta)), 1); }
    cuentaVista = -1; if (FL) { FL.poderIni(estP1, D.j1); FL.poderIni(estP2, D.j2); } // F4-14 y 17
    if (FL && FL.cancelar) FL.cancelar(); if (hud && hud.q('uy')) hud.q('uy').hidden = true; // F4-16 y 18: sin cámara lenta ni «¡Uy!» de antes
    if (tjAbierta()) TJ.cerrar('salir');
    if (conTarjeta) abrirComo(false);
    pintarEntreno(); pintar(); pintarSerie(); pintarReloj(); // F1 · cambio 7 (revisión): sin los asaltos del duelo anterior en la cuenta de «Otra vez»
    return true;
  }
  // ---------- F1 · cambio 3: asaltos (como contra la Campeona) ----------
  const ganaCon = () => Math.ceil((D.nAsaltos || 1) / 2);
  function finAsalto(quien) {
    if (D.fase !== 'lucha' || D.pausa > 0) return;
    if (quien === 'j1') D.gan1++; else D.gan2++;
    D.empate = false;
    if (ent || D.gan1 >= ganaCon() || D.gan2 >= ganaCon()) { pintarReloj(); terminar(D.gan1 >= D.gan2 ? 'j1' : 'j2'); return; }
    D.asalto++; D.pausa = ASALTO_PAUSA; D.tAsalto = 0; quitarBalas(); D.timers.length = 0; D.trampas.length = 0;
    const perd = quien === 'j1' ? D.j2 : D.j1; perd.mareo = Math.max(perd.mareo || 0, 1);
    for (const f of [D.j1, D.j2]) { f.kb.t = 0; f.brinco = 0; f.abierta = 0; } M.vx = M.vz = 0; sueltaTodo();
    emitir({ tipo: 'asalto', de: quien, asalto: D.asalto - 1, asaltos: [D.gan1, D.gan2] });
    flotante(D.asalto >= D.nAsaltos ? TXT.asalto3 : TXT.asalto2, ASALTO_PAUSA); sonar('ring', 3); pintar(); pintarReloj();
  }
  function nuevoAsalto() {
    D.pausa = 0; D.tAsalto = 0;
    for (const f of [D.j1, D.j2]) { f.plumas = f.plumasMax || PLUMAS; f.mareo = 0; f.inv = 0; f.kb.t = 0; f.cd = {}; if (f.ext) { f.ext.cad.length = 0; f.ext.rec = 0; } }
    if (D.j2.v) D.j2.v.x = D.j2.v.z = 0;
    colocar(); flotante(TXT.ya, 0.7); pintar(); pintarReloj();
  }
  // ¿Corre el tope de 45 s? Solo al mejor de 3, fuera del entreno y sin el modo relajado (el reloj solo cuenta si hay tope)
  function hayTope() {
    if (ent || (D.nAsaltos || 1) < 2) return false;
    try { if (G.accesibilidad && G.accesibilidad.relajado && G.accesibilidad.relajado()) return false; } catch (e) { /* sin accesibilidad */ }
    return true;
  }
  function topeAsalto() {
    if (D.empate || !hayTope()) return;
    if (D.j1.plumas === D.j2.plumas) { D.empate = true; flotante(TXT.empate, 1.6); return; }
    flotante(TXT.tiempo, 1); finAsalto(D.j1.plumas > D.j2.plumas ? 'j1' : 'j2');
  }
  function pintarReloj() {
    if (!hud) return; const el = hud.q('reloj'); if (!el) return;
    const ver = !ent && D.fase !== 'nada'; if (el.hidden === ver) el.hidden = !ver; if (!ver) return;
    const t = D.pausa > 0 || D.fase !== 'lucha' || !hayTope() ? '' : D.empate ? '!' : String(Math.max(0, Math.ceil(ASALTO_TOPE - (D.tAsalto || 0)))); // sin tope, sin cuenta atrás
    const n = hud.q('relojN'); if (n.textContent !== t) n.textContent = t;
    puntos(hud.q('as1'), D.gan1 || 0); puntos(hud.q('as2'), D.gan2 || 0);
  }
  function puntos(el, g) { // sin closures ni arrays nuevos: corre en cada cuadro de la pelea
    const c = el.children, gc = ganaCon();
    for (let x = 0; x < c.length; x++) { const i = c[x], on = x < g, oc = x >= gc; if (i.classList.contains('on') !== on) i.classList.toggle('on', on); if (i.hidden !== oc) i.hidden = oc; }
  }
  function terminar(quien) {
    if (D.fase !== 'lucha') return;
    D.fase = 'fin'; D.resultado = quien; D.finT = performance.now(); quitarBalas(); D.timers.length = 0; D.trampas.length = 0;
    if (!ent) { D.serie[quien]++; pintarSerie(); } // F1 · cambio 7
    const perd = quien === 'j1' ? D.j2 : D.j1; perd.finMareo = 2.2; perd.mareo = Math.max(perd.mareo, 2.2);
    const txt = quien === 'j1' ? TXT.gana1 : TXT.gana2;
    emitir({ tipo: 'fin', de: quien, a: perd.id, valor: (quien === 'j1' ? D.j1 : D.j2).plumas, asaltos: [D.gan1 || 0, D.gan2 || 0] });
    sonar('duelo_victoria'); fx('gold', perd.pos.x, perd.pos.y + 1.2, perd.pos.z);
    // Revisión F4: el panel ya no va en medio sino abajo (en el final los botones táctiles se esconden) y espera a que acabe la
    // cámara lenta: la ganadora, en la franja libre entre el HUD y el panel (la cámara mira a la altura de su pecho)
    camAlto = -0.4;
    if (FL && FL.final) { if (FL.movReducido()) cam.listo = false; FL.final(ganadora2()); } // F4-16 y 19: cámara lenta, acercamiento, y destellos y pétalos sobre quien gana
    if (hud) { hud.q('finTxt').textContent = txt; hud.q('fin').querySelector('[data-a="salir"]').textContent = alMenu() ? TXT.menu : TXT.salir; hud.q('fin').hidden = false; flotante(''); pintarFin(); pintarSerie(); if (FL && FL.panel) FL.panel(hud.q('fin')); }
    // T38: el premio de juego del duelo (los Lentes de la Campeona, una vez por partida: combate.js); nada más (ni
    // inventario ni G.v18)
    if (Cb && Cb.premioRopa) Cb.premioRopa();
  }
  function otraVez() { return iniciar({ forzar: true, sinEntreno: true, asaltos: D.nAsaltos, cuenta: CUENTA_OTRA }); } // F1 · cambio 7: mismo emparejamiento y Ventaja, cuenta corta
  function salir() {
    if (D.fase === 'nada') return false;
    D.fase = 'nada'; quitarBalas(); D.timers.length = 0; D.trampas.length = 0; soltar(); ent = null; if (tjAbierta()) TJ.cerrar('salir');
    if (FL && FL.cancelar) FL.cancelar(); // revisión F4: salir durante la cámara lenta no deja destellos ni pétalos pendientes
    D.serie.j1 = D.serie.j2 = 0; D.ventaja.j1 = D.ventaja.j2 = false; pintarSerie(); // F1 · cambio 7: al salir del modo, marcador y Ventaja a cero
    if (hud) { flotante(''); hud.el.hidden = true; pintarEntreno(); }
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
    let vx = 0, vz = 0, tx = 0, tz = 0;
    if (j.kb.t > 0) { j.kb.t -= dt; vx += j.kb.x; vz += j.kb.z; j.kb.x *= 0.88; j.kb.z *= 0.88; }
    if (n > 0.01 && D.fase === 'lucha') {
      const v = (corre ? VEL().correr : VEL().andar) * Math.min(1, n) * (j.mareo > 0 ? 0.25 : 1) * (j.pesada > 0 ? 0.45 : 1); // Plumas de manglar: pisar una pluma va más lento
      tx = ix / n * v; tz = iz / n * v;
      if (j.mareo <= 0) j.yaw = Math.atan2(ix, iz); // la puntería sigue al mando al instante (el cuerpo gira suave en dibujar2)
    }
    // 9-nov: arranca y frena con las mismas tasas que Vittata en el suelo (fisica.js: 18 al arrancar, 22 al frenar o dar
    // media vuelta; el 90 % en ~0,13 s), no de 0 a 6,5 m/s en un cuadro
    const vv = j.v || (j.v = { x: 0, z: 0 }), kv = 1 - Math.exp(-dt * (!(tx || tz) || vv.x * tx + vv.z * tz < 0 ? 22 : 18));
    vv.x += (tx - vv.x) * kv; vv.z += (tz - vv.z) * kv; vx += vv.x; vz += vv.z;
    pos2.x += vx * dt; pos2.z += vz * dt; dentro(pos2);
    let lift = 0;
    if (j.lift.dura > 0) { j.lift.t += dt; const k = j.lift.t / j.lift.dura; if (k >= 1) j.lift.dura = 0; else lift = j.lift.alto * Math.sin(Math.PI * k); }
    pos2.y = ALTURA(pos2) + lift;
    j.vel = Math.hypot(vx, vz);
  }
  const giro = a => Math.atan2(Math.sin(a), Math.cos(a)), mira2 = new THREE.Vector3();
  function dibujar2(dt) {
    const ch = D.ch; if (!ch) return;
    const j = D.j2, root = ch.root, now = performance.now() / 1000;
    root.visible = true;
    // Andar (9-nov, el mismo de la Campeona: combate.js): cuerpo con muelle, giro limitado, pasos con el clip Walk a la
    // cadencia de su velocidad (antes, a 6,5 m/s, gait 0: se deslizaba con las patas quietas) y saltitos si va de lado
    const Vi = Cb.vida, A = Vi && Vi.andar, enAire = j.lift.dura > 0;
    const fin = D.fase === 'fin' ? (D.resultado === 'j2' ? 'gana' : 'pierde') : '';
    const O = A ? A(j, { x: pos2.x, z: pos2.z, yaw: j.yaw, aire: enAire || j.kb.t > 0 }, dt) : null;
    if (O) { root.position.set(O.x, pos2.y + O.alto, O.z); root.rotation.y = O.yaw; }
    else { root.position.set(pos2.x, pos2.y, pos2.z); root.rotation.y += giro(j.yaw - root.rotation.y) * Math.min(1, dt * 10); }
    const kz = Math.min(1, dt * 10);
    root.rotation.z = j.mareo > 0 ? Math.sin(now * (j.finMareo > 0 ? 9 : 14)) * (j.finMareo > 0 ? 0.32 : 0.25) : root.rotation.z + ((O ? O.bank : 0) - root.rotation.z) * kz;
    if (O) root.rotation.x += (O.lean - root.rotation.x) * kz;
    const vel = O ? O.speed : j.vel || 0, esc = !!(G.renderer && G.renderer.calidad && G.renderer.calidad.escuela);
    // QA-205: campos sueltos en vez de un literal nuevo por cuadro (mismo orden)
    if (O) Vi.andarAplicar(ch, O, j, !fin); else { ch.speed = vel; ch.gait = vel > 0.5 ? 1 : 0; }
    const aire = enAire || !!(O && O.airborne);
    ch.airborne = aire; ch.flying = false; ch.legsDown = 0; ch.swimming = false; ch.diving = false;
    ch.wingMode = j.alasT > 0 ? 'land' : enAire ? 'flap' : ch.gait ? 'walk' : 'idle';
    // Vida (9-nov, la misma capa que la Campeona: combate.js): mira a la Vittata, aletazo al golpear, retrocede al recibir,
    // se bambolea mareado, celebra al ganar y se queda cabizbajo al perder
    const mira = !(j.mareo > 0) && fin !== 'pierde' && D.fase !== 'nada';
    if (mira) mira2.set(S.pos.x, S.pos.y + 1.2, S.pos.z);
    ch.expression = j.mareo > 0 ? 'surprised' : j.picoT > 0 ? 'fight' : 'happy'; ch.mouth = j.picoT > 0 ? Math.min(1, j.picoT / 0.15) : null; ch.lookAt = mira ? mira2 : null;
    ch.emote = null; ch.posado = ''; ch.agachada = 0; ch.groundY = ALTURA(pos2); ch.groundAt = esc ? null : sueloJ2; ch.ikEscuela = esc;
    const cdA = (j.cd && j.cd.golpe_ala) || 0; if (cdA > (j.cdAla0 || 0) + 0.2) j.aletazo = 0.3; j.cdAla0 = cdA; if (j.aletazo > 0) j.aletazo -= dt;
    const oV = { ataque: j.aletazo > 0, salto: enAire, vel: O && O.modo === 'quieta' ? 0 : vel, fin };
    if (c2On()) { // Combate 2.0: su máquina de estados en vez de vida()
      const V2 = C2.antes(ch, j, oV, dt);
      try { ch.update(C2.dtVis(dt)); C2.huesos(ch, V2); if (O && Vi.andarHuesos) Vi.andarHuesos(ch, O); } catch (e) { /* animación */ }
      return;
    }
    if (C2 && ch._c2esc) C2.soltar(ch, j); // la bandera se apagó (pruebas): la escala vuelve
    const V = Vi ? Vi.antes(ch, j, oV, dt) : null;
    try { ch.update(dt); if (V) Vi.huesos(ch, V); if (O && Vi.andarHuesos) Vi.andarHuesos(ch, O); } catch (e) { /* animación */ }
  }
  const sueloJ2 = (x, z) => G.terreno.height(x, z);
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
      const dx = p.x - bl.pos.x, dy = p.y - (bl.pos.y + 0.9), dz = p.z - bl.pos.z, d2 = dx * dx + dy * dy + dz * dz, suelo = G.terreno.height(p.x, p.z);
      if (b.cerca === undefined || d2 < b.cerca) b.cerca = d2; // F4-18: lo más cerca que pasó
      let fin = b.t >= b.vida || p.y < suelo - 0.1, porGolpe = false;
      if (!fin && d2 < b.radio * b.radio) { golpear(b.de, bl, Object.assign({ dir: { x: b.vx / 16, z: b.vz / 16 } }, b.golpe)); fin = true; porGolpe = true; }
      if (fin && !porGolpe && FL && FL.falla) FL.falla(b, suelo, p.y < suelo - 0.1, hud ? hud.q('uy') : null); // F4-18: hojas y polvo en el suelo; «¡Uy!» si la otra la esquivó
      if (fin) { scene.remove(b.m); D.balas.splice(i, 1); if (D.fase !== 'lucha' || D.pausa > 0) return; }
    }
  }
  function paso(dt) {
    if (D.fase === 'nada') return;
    if (tjAbierta()) { M.vx = M.vz = 0; return; } // T57: con la tarjeta «¿Cómo se pelea?» abierta, el duelo espera
    if (C2) C2.pasoReloj(dt); // hit-stop visual de Combate 2.0 (mientras dura este duelo, combate.js no lo lleva)
    if (centroT > 0) { centroT -= dt; if (centroT <= 0 && hud && D.fase !== 'cuenta') hud.q('centro').textContent = ''; }
    if (comboVis > 0) { comboVis -= dt; if (comboVis <= 0 && hud && hud.q('combo')) hud.q('combo').hidden = true; }
    const mando = leerMando() || toque2();
    if (D.fase === 'cuenta') {
      D.cuenta -= dt;
      if (hud) hud.q('centro').textContent = D.cuenta > 0 ? String(Math.ceil(D.cuenta)) : TXT.ya;
      if (FL) cuentaVista = FL.cuenta(cuentaVista, D.cuenta, hud && hud.q('centro'), sonar); // F4-14
      if (D.cuenta <= 0) { D.fase = 'lucha'; centroT = 0.7; }
      M.vx = M.vz = 0; // nadie se mueve hasta «¡Ya!»
      pintarReloj();
    }
    if (D.fase === 'lucha' && D.pausa > 0) { // F1 · cambio 3: respiro entre asaltos
      M.vx = M.vz = 0; D.j1.mareo = Math.max(0, (D.j1.mareo || 0) - dt); D.j2.mareo = Math.max(0, (D.j2.mareo || 0) - dt);
      D.pausa -= dt; if (D.pausa <= 0) nuevoAsalto();
      pintarReloj(); pasoJ1(dt); dibujar2(dt); return;
    }
    if (D.fase === 'lucha') {
      D.tLucha = (D.tLucha || 0) + dt;
      if (!ent) { D.tAsalto = (D.tAsalto || 0) + dt; if (D.tAsalto >= ASALTO_TOPE) topeAsalto(); if (D.fase !== 'lucha' || D.pausa > 0) return; }
      if (D.j1.abierta > 0) D.j1.abierta = Math.max(0, D.j1.abierta - dt); if (D.j2.abierta > 0) D.j2.abierta = Math.max(0, D.j2.abierta - dt); // F1: abierta tras un Brinco
      H.paso(D.j1, dt); H.paso(D.j2, dt); if (c2On() && EXD) { EXD.paso(D.j1, dt); EXD.paso(D.j2, dt); }
      for (let i = D.timers.length - 1; i >= 0; i--) { const t = D.timers[i]; t.t -= dt; if (t.t <= 0) { D.timers.splice(i, 1); t.fn(); if (D.fase !== 'lucha' || D.pausa > 0) break; } }
      if (D.fase === 'lucha' && !(D.pausa > 0)) pasoTrampas(dt);
      if (D.fase === 'lucha' && !(D.pausa > 0)) pasoBalas(dt);
      if (D.fase === 'lucha' && ent) pasoEntreno(dt); else if (D.fase === 'lucha') pasoPistas(dt);
      if (Math.random() < dt * 4) pintar(); else pintarChips();
      pintarReloj();
    } else if (D.fase === 'fin') {
      for (const f of [D.j1, D.j2]) if (f.finMareo > 0) { f.finMareo = Math.max(0, f.finMareo - dt); f.mareo = f.finMareo; }
      if (D.j1.finMareo > 0) { M.vx *= 0.8; M.vz *= 0.8; }
      pintarFin();
    }
    if (D.fase === 'nada') return;
    pasoJ1(dt); mover2(dt, mando); if (T44.el) pintarT44();
    if (D.fase === 'lucha') { // el escudo caducado se dispersa solo
      for (const f of [D.j1, D.j2]) if (f.escudoVisto && f.escudo <= 0) { f.escudoVisto = false; if (v18fx('dispersar')) try { G.v18fx.dispersar(f); } catch (e) { /* efecto */ } } else if (f.escudo > 0) f.escudoVisto = true;
    }
    dibujar2(dt);
  }

  // ---------- En el mundo: el sitio del duelo de 2 jugadores, en el centro del círculo de la explanada ----------
  function disponible() { return !!G.V18 && !!(G.pack && G.pack.id === 'cap1'); } // T44: también en táctil (en horizontal, con dos mandos en pantalla) // QA-192: la estación es de la explanada de Villa Raíz
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
  // du3 (8-nov): como en el duelo contra la Campeona (combate.js), mientras juegan dos no va la guía de la misión (fx.js):
  // su flecha naranja flotaba sobre el Jugador 1 y el haz cruzaba la explanada. Después del gancho de misiones (60).
  G.on('render', () => { if (D.fase !== 'nada' && G.fx && G.fx.guide) G.fx.guide(null, 0); }, 61);
  G.on('apply', () => { if (D.fase !== 'nada') salir(); }, 48);
  crearJ2();

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    salir(); try { Cb.salir(); } catch (e) { /* sin duelo abierto */ }
    asaltosDef = 1; // F1 · cambio 3: lo de siempre, con un asalto; los asaltos se prueban aparte (iniciar({ asaltos: 3 }))
    // La cámara y volar de antes de entrar se toman aquí, no al cargar el módulo: si se cargó con otro juego abierto, eran sus envolturas.
    const followAntes = G.camara && G.camara.follow, flyAntes = F.toggleFly;
    const v18on0 = G.V18; G.V18 = true; // el arnés puede abrir el juego con ?v18=0: la prueba se hace como en la demo y luego se deja la bandera como estaba
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, inv0 = JSON.stringify(S.inv || {}), esp0 = D.esp2;
    const P = G.v18, crudo = (() => { try { return localStorage.getItem(P.clave()); } catch (e) { return null; } })();
    const guardar0 = G.guardado && G.guardado.save; let guardados = 0;
    const ent0 = (() => { try { return localStorage.getItem(CLAVE_ENT); } catch (e) { return null; } })(); // el entreno visto o no, como estaba
    const tj0 = (() => { try { return localStorage.getItem(CLAVE_TJ); } catch (e) { return null; } })(); marcarTj(); // T57: la tarjeta se mira aparte (abajo)
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
      try { tactilOk = disponible() && it.visible() && abrirTarjeta() && G.ui.cardOpen && !!G.ui.$('card').querySelector('[data-d2tactil]'); } finally { window.matchMedia = mm0; if (G.ui.cardOpen) G.ui.hideCard(); }
      check('T44 · en táctil también aparece la opción y su tarjeta explica los mandos en pantalla', tactilOk && D.fase === 'nada');
      // 2. La tarjeta: elegir la cotorra del J2 y empezar
      abrirTarjeta();
      const card = G.ui.$('card');
      const bv = card.querySelector('[data-d2sp="ventralis"]'); if (bv) bv.onclick();
      check('La tarjeta deja elegir la cotorra del Jugador 2 y enseña las teclas', G.ui.cardOpen && card.querySelectorAll('[data-d2sp]').length === ESPECIES.length && D.esp2 === 'ventralis' && /Jugador 2/.test(card.textContent));
      { // F22: la tarjeta de elección recibe el foco en «¡A jugar!», se nombra por su título y Tab no sale de ella
        const okB = G.ui.$('v18-d2-ok'), foco0 = document.activeElement === okB || !document.hasFocus(), dentro = [];
        for (let i = 0; i < 3; i++) { const t = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); document.body.dispatchEvent(t); dentro.push(t.defaultPrevented && card.contains(document.activeElement)); }
        check('F22 · Duelo de 2: la tarjeta de elección enfoca «¡A jugar!», se llama como su título y Tab no sale de ella', foco0 && card.getAttribute('aria-label') === TXT.titulo && card.getAttribute('aria-modal') === 'true' && dentro.every(Boolean),
          JSON.stringify({ foco0, nombre: card.getAttribute('aria-label'), dentro })); okB.focus(); }
      // T57: «¿Cómo se pelea?» también en la elección de cotorras: la tarjeta sale encima, con las teclas de los dos; Esc vuelve a la elección
      {
        const bc = G.ui.$('v18-d2-como'); if (bc) bc.onclick();
        const el = TJ && TJ.el(), kj = el ? [...el.querySelectorAll('.vdc-k em')].map(e => e.textContent).join('') : '';
        const ok1 = tjAbierta() && G.ui.cardOpen && /J1/.test(kj) && /J2/.test(kj) && !!el.querySelector('[data-mov="mover"] kbd') && el.textContent.includes('←') && D.fase === 'nada';
        const ev = tecla('keydown', 'Escape', 'Escape');
        check('T57 · Duelo de 2: «¿Cómo se pelea?» en la elección abre la tarjeta con las teclas de cada jugador (J1 / J2) y Esc vuelve a la elección', ok1 && ev.defaultPrevented && !tjAbierta() && G.ui.cardOpen && D.fase === 'nada', JSON.stringify({ ok1, kj, card: G.ui.cardOpen }));
      }
      marcarEnt(); // el entreno se mira aparte (abajo): aquí, la cuenta atrás de siempre
      G.ui.$('v18-d2-ok').onclick();
      check('«¡A jugar!» abre el duelo con cuenta atrás, HUD de Jugador 1 / Jugador 2 y 5 plumas por lado', D.fase === 'cuenta' && !G.ui.cardOpen && !hud.el.hidden &&
        hud.el.textContent.includes(TXT.j1) && hud.el.textContent.includes(TXT.j2) && hud.q('pl1').children.length === 5 && hud.q('pl2').children.length === 5 && !!hud.q('en1') && !!hud.q('en2'));
      check('La segunda cotorra es otra piel de las que hay, con su poder', !!D.ch && D.chEsp === 'ventralis' && D.j2.poder === H.poderDe('ventralis') && D.ch.root.parent === scene, D.j2.poder);
      // F4 · sensación de juego (docs/diseno/F4_GAME_FEEL.md 14, 15 y 17) con las funciones del duelo (combate.js → feel).
      // audio.js calla un «tick» a menos de 250 ms de otro sonido: entre números se espera ese rato de reloj real.
      if (FL) {
        const A = G.audio, R0 = R.REDUCED, ar0 = A.reducido, FS = FL.stats, espera = ms => new Promise(r => setTimeout(r, ms)), veces = n => A.log.filter(x => x === n).length;
        try {
          R.REDUCED = false; A.reducido = false; cerca(4); await espera(300);
          D.fase = 'cuenta'; D.cuenta = 3; cuentaVista = -1; A.log.length = 0; const f0 = Object.assign({}, FS), vistos = []; await espera(300); // el bucle también corre la cuenta
          for (let i = 0; i < 4; i++) { paso(i ? 1 : 0.05); vistos.push(hud.q('centro').textContent); if (i < 3) await espera(300); }
          paso(0.05);
          check('F4-14 · Duelo de 2: la cuenta suena «tick» en 3, 2 y 1 y «lanzar» en «¡Ya!», con pop (sin «encaje» al empezar)',
            vistos.join() === ['3', '2', '1', TXT.ya].join() && veces('tick') === 3 && veces('lanzar') === 1 && FS.ticks - f0.ticks === 3 && FS.ya - f0.ya === 1 && FS.pops - f0.pops === 4 &&
            D.fase === 'lucha' && veces('encaje') === 0, JSON.stringify({ vistos, log: A.log.join(), pops: FS.pops - f0.pops }));
          const f1 = Object.assign({}, FS); limpio(); cerca(1.5); S.facing = { x: 1, z: 0 }; A.log.length = 0; usar(D.j1, 'golpe_ala');
          check('F4-15 · Duelo de 2: la pluma quitada suena «duelo_pata» (no «land») y la del HUD cae',
            D.j2.plumas === PLUMAS - 1 && veces('duelo_pata') === 1 && !A.log.includes('land') && FS.plumas - f1.plumas === 1 && FS.caidas - f1.caidas === 1, JSON.stringify({ pl: D.j2.plumas, log: A.log.join() }));
          D.j2.plumas = PLUMAS; limpio(); cerca(4); paso(0.05);
          const id = D.j2.poder, f2 = Object.assign({}, FS); D.j2.cd[id] = 5; paso(0.05); A.log.length = 0; D.j2.cd[id] = 0; D.j2.energia = 100; paso(0.05); paso(0.05); paso(0.05);
          check('F4-17 · Duelo de 2: el poder listo suena «encaje» y late su botón, una vez por carga',
            veces('encaje') === 1 && FS.poderes - f2.poderes === 1 && FS.pulsos - f2.pulsos === 1 && !!poder2(), JSON.stringify({ log: A.log.join(), poder: id, pulsos: FS.pulsos - f2.pulsos }));
        } finally { R.REDUCED = R0; A.reducido = ar0; limpio(); D.j1.plumas = D.j2.plumas = PLUMAS; pintar(); }
      }
      // Cómo se pelea (8-nov): entreno de 3 pasos con las teclas de cada jugador, chips y pistas
      {
        const pd = b => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        const toque = (key, code) => { tecla('keydown', key, code); tecla('keyup', key, code); };
        try { localStorage.removeItem(CLAVE_ENT); localStorage.removeItem(CLAVE_TJ); } catch (e) { /* sin almacenamiento */ }
        iniciar({ forzar: true });
        // T57: la tarjeta sale sola en el primer Duelo de 2, antes del entreno; mientras está abierta el duelo espera
        {
          const el = TJ && TJ.el(), abierta = tjAbierta() && tjVista() && !!ent && ent.paso === 0 && !el.querySelector('[data-tj="entrenar"]');
          limpio(); cerca(1.5); toque('e', 'KeyE'); toque('.', 'Period'); paso(0.3);
          const espera = ent && !ent.j1 && !ent.j2 && ent.paso === 0;
          el.querySelector('[data-tj="ok"]').click();
          check('T57 · Duelo de 2: la tarjeta sale sola la primera vez (antes del entreno), el duelo espera y «¡A pelear!» la cierra', abierta && espera && !tjAbierta() && !!ent && D.fase === 'lucha', JSON.stringify({ abierta, espera }));
        }
        check('Entreno de 2: el primer duelo empieza con el paso 1 (Jugador 1 E, Jugador 2 «.») sin cuenta atrás', !!ent && ent.paso === 0 && D.fase === 'lucha' && !hud.q('ent').hidden &&
          hud.q('entK1').textContent === 'E' && hud.q('entK2').textContent === '.' && hud.q('entTxt').textContent === TXT.ent1 && hud.q('como').hidden, JSON.stringify({ ent, fase: D.fase }));
        limpio(); cerca(7); toque('e', 'KeyE');
        const lejosOk = !ent.j1 && hud.q('centro').textContent === TXT.masCerca;
        limpio(); cerca(1.5); toque('e', 'KeyE');
        const solo1 = ent.j1 && !ent.j2 && ent.paso === 0 && hud.q('entJ1').classList.contains('ya');
        D.j1.inv = 0; D.j2.mareo = 0; D.j2.inv = 0; toque('.', 'Period'); // el aletazo del J1 marea un momento al J2: aquí no se espera
        correr(0.1);
        check('Entreno de 2: el paso avanza cuando las dos dan su aletazo (de lejos no cuenta) y nadie pierde plumas', lejosOk && solo1 && ent.paso === 1 && D.j1.plumas === PLUMAS && D.j2.plumas === PLUMAS &&
          hud.q('entK1').textContent === 'F' && hud.q('entK2').textContent === ',', JSON.stringify({ lejosOk, solo1, paso: ent.paso }));
        cerca(7); S.facing = { x: 1, z: 0 }; D.j2.yaw = -Math.PI / 2; toque('f', 'KeyF'); toque(',', 'Comma');
        const p2 = ent.paso === 2 && hud.q('entK1').textContent === 'G' && hud.q('entK2').textContent === '-';
        toque('g', 'KeyG'); toque('-', 'Slash');
        const p3 = ent && ent.fin > 0 && entVisto();
        correr(2);
        check('Entreno de 2: semilla (F / «,») y poder (G / «-»); al terminar se recuerda y empieza el duelo con cuenta atrás', p2 && p3 && !ent && D.fase === 'cuenta' && hud.q('ent').hidden, JSON.stringify({ p2, p3, fase: D.fase }));
        salir(); iniciar({ forzar: true });
        check('Entreno de 2: no se repite solo', !ent && D.fase === 'cuenta' && !hud.q('como').hidden);
        check('T57 · Duelo de 2: la tarjeta no sale sola la segunda vez', !tjAbierta());
        { const mh = el => el ? parseFloat(getComputedStyle(el).minHeight) || 0 : 99, se = hud.el.querySelector('[data-a="saltarEnt"]');
          check('F22 · Duelo de 2: «¿Cómo se pelea?» y «Saltar entreno» miden al menos 44 px de alto (antes 36 y 40)', mh(hud.q('como')) >= 44 && mh(se) >= 44, mh(hud.q('como')) + ' / ' + mh(se)); }
        { const bc = hud.q('como'); bc.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 })); const ab = tjAbierta(); if (ab) TJ.cerrar('esc');
          check('F22 · Duelo de 2: los botones del HUD responden al teclado (Enter en «¿Cómo se pelea?» la abre; antes solo el dedo)', ab && !tjAbierta() && D.fase === 'cuenta', JSON.stringify({ ab, fase: D.fase })); }
        pd(hud.q('como')); const c0 = D.cuenta, conPr = tjAbierta() && !!TJ.el().querySelector('[data-tj="entrenar"]'); paso(0.4);
        const ev = tecla('keydown', 'Escape', 'Escape');
        check('T57 · Duelo de 2: el botón «¿Cómo se pelea?» abre la tarjeta (con «Practicar»), la cuenta espera y Esc la cierra sin salir', conPr && D.cuenta === c0 && ev.defaultPrevented && !tjAbierta() && D.fase === 'cuenta', JSON.stringify({ conPr, c0, c: D.cuenta, fase: D.fase }));
        pd(hud.q('como')); TJ.el().querySelector('[data-tj="entrenar"]').click();
        const porBoton = !!ent && D.fase === 'lucha' && !tjAbierta();
        pd(hud.el.querySelector('[data-a="saltarEnt"]'));
        check('Entreno de 2: «¿Cómo se pelea?» → «Practicar» lo abre y «Saltar entreno» va al duelo', porBoton && !ent && D.fase === 'cuenta');
        iniciar({ sinCuenta: true, forzar: true }); limpio(); cerca(7);
        const kb = k => Array.from(hud.q(k).querySelectorAll('kbd')).map(e => e.textContent).join('');
        usar(D.j2, 'semilla'); paso(0.05);
        const c2 = hud.q('ch2').querySelector('[data-a="semilla"]');
        check('Duelo de 2: chips con la tecla de cada jugador (E F G · . , -); el listo brilla y el que recarga lo enseña', kb('ch1') === 'EFG' && kb('ch2') === '.,-' &&
          hud.q('ch1').querySelector('[data-a="golpe_ala"]').classList.contains('listo') && c2.classList.contains('cd') && (parseFloat(c2.style.getPropertyValue('--cd')) || 0) > 50, kb('ch1') + ' / ' + kb('ch2') + ' / ' + c2.className);
        quitarBalas(); limpio(); cerca(1.5); for (const P of Object.values(pistas)) { P.t = 0; P.dom = {}; } D.j1.energia = D.j2.energia = 50; paso(0.05);
        const pc1 = hud.q('pista1').hidden ? '' : hud.q('pista1').textContent, pc2 = hud.q('pista2').hidden ? '' : hud.q('pista2').textContent;
        D.j1.plumas = PLUMAS - 1; paso(0.05); const pg1 = hud.q('pista1').textContent;
        check('Duelo de 2: pistas por jugador con su tecla («¡Cerca! Aletazo (E)» / «(.)») y la del primer golpe', pc1 === TXT.pista1.cerca && pc2 === TXT.pista2.cerca && pg1 === TXT.pista1.golpe, JSON.stringify({ pc2, pg1, pc1, j2: { m: D.j2.mareo, pl: D.j2.plumas, cd: D.j2.cd, e: D.j2.energia }, ent: !!ent }));
        salir();
      }
      // 3. Entradas independientes: el J2 se mueve con flechas, el J1 no
      iniciar({ sinCuenta: true, especie2: 'arausiaca' });
      check('Con arausiaca, el Jugador 2 tiene Escudo de plumas', D.j2.poder === 'escudo_plumas' && D.ch && D.chEsp === 'arausiaca');
      const s1 = { x: S.pos.x, z: S.pos.z }, s2 = { x: pos2.x, z: pos2.z };
      const ev = tecla('keydown', 'ArrowUp', 'ArrowUp');
      const keysJ1 = G.input.keys.has('arrowup');
      // 9-nov (Kelvin: «no me gusta el movimiento»): andando, el J2 da pasos (gait 1 con el clip Walk, cadencia de su velocidad)
      // y arranca sin saltar de 0 a 6,5 m/s en un cuadro
      const anda = { gait1: 0, n: 0, dvMax: 0, v0: 0, clip: '' };
      for (let i = 0; i < 10; i++) {
        const z0 = pos2.z; F.step(0.05, false); G.emit('update', 0.05, false, false);
        const v = Math.abs(pos2.z - z0) / 0.05; anda.dvMax = Math.max(anda.dvMax, Math.abs(v - anda.v0)); anda.v0 = v;
        if (i >= 5 && D.ch) { anda.n++; if (D.ch.gait === 1 && !D.ch.airborne && Math.abs(D.ch.speed / ((Cb.vida && Cb.vida.AND && Cb.vida.AND.paso) || 1) - v) < 1) anda.gait1++; }
      }
      anda.clip = D.j2.clipAnda || '';
      tecla('keyup', 'ArrowUp', 'ArrowUp');
      check('Flecha arriba mueve al Jugador 2 y no llega al Jugador 1 (ni a input.js)', !keysJ1 && ev.defaultPrevented && s2.z - pos2.z > 1.5 &&
        Math.hypot(S.pos.x - s1.x, S.pos.z - s1.z) < 0.3, JSON.stringify({ dz2: (s2.z - pos2.z).toFixed(2), d1: Math.hypot(S.pos.x - s1.x, S.pos.z - s1.z).toFixed(2), keysJ1 }));
      check('Movimiento del Jugador 2: anda a pasos con el clip Walk a la velocidad que lleva y arranca sin tirón (como Vittata)',
        anda.gait1 === anda.n && anda.clip === 'Walk' && anda.dvMax < 5, JSON.stringify(anda));
      for (let i = 0; i < 8; i++) { F.step(0.05, false); G.emit('update', 0.05, false, false); } // frena (como Vittata, en ~0,1 s)
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
      // 5. Victoria y derrota: de premio, solo los Lentes de la Campeona (T38), una vez
      const invA = JSON.stringify(S.inv || {}); evs.length = 0; guardados = 0;
      const ropa0 = { u: (S.unlocked || []).slice(), w: JSON.stringify(S.wear || {}) }; S.unlocked = (S.unlocked || []).filter(k => k !== (Cb && Cb.LENTES));
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
      const lentesN = S.unlocked.filter(k => k === (Cb && Cb.LENTES)).length;
      check('T38 · de premio, los Lentes de la Campeona (una vez); ni inventario ni progreso V18', JSON.stringify(S.inv || {}) === invA && crudoAhora === crudo && lentesN === 1 &&
        !P.otorgado('duelo2') && evs.every(e => e.tipo !== 'win' && e.tipo !== 'loss'), JSON.stringify({ guardados, lentesN }));
      S.unlocked = ropa0.u; S.wear = JSON.parse(ropa0.w); if (G.actores && G.actores.applyWear) G.actores.applyWear();
      // F1 · tanda B: mejor de 3 asaltos (como contra la Campeona) y Brinco de los dos jugadores
      {
        evs.length = 0; iniciar({ sinCuenta: true, asaltos: 3 });
        limpio(); cerca(1.5); D.j2.plumas = 1; usar(D.j1, 'golpe_ala');
        const a1 = { fase: D.fase, g1: D.gan1, pausa: D.pausa > 0, txt: hud.q('centro').textContent, bloq: usar(D.j2, 'golpe_ala').motivo, fin: evs.filter(e => e.tipo === 'fin').length };
        for (let t = 0; t < 2.2; t += 0.05) paso(0.05);
        const a2 = { pl1: D.j1.plumas, pl2: D.j2.plumas, asalto: D.asalto, x1: +(S.pos.x - sitio.x).toFixed(1), x2: +(pos2.x - sitio.x).toFixed(1) };
        limpio(); cerca(1.5); D.j1.plumas = 1; usar(D.j2, 'golpe_ala'); const a3 = { g2: D.gan2, txt: hud.q('centro').textContent }; for (let t = 0; t < 2.2; t += 0.05) paso(0.05);
        limpio(); cerca(1.5); D.j2.plumas = 1; usar(D.j1, 'golpe_ala');
        const fins = evs.filter(e => e.tipo === 'fin');
        check('F1 · Duelo de 2 al mejor de 3 asaltos: «¡Asalto 2!» con 2 s de respiro (nadie ataca), plumas llenas y cada uno a su sitio; 1–1 → «¡Asalto final!»; el fin sale una vez, con [2, 1]',
          a1.fase === 'lucha' && a1.g1 === 1 && a1.pausa && a1.txt === TXT.asalto2 && a1.bloq === 'fase' && a1.fin === 0 && a2.pl1 === PLUMAS && a2.pl2 === PLUMAS && a2.asalto === 2 && a2.x1 === -5 && a2.x2 === 5 &&
          a3.g2 === 1 && a3.txt === TXT.asalto3 && D.fase === 'fin' && D.resultado === 'j1' && fins.length === 1 && fins[0].asaltos.join() === '2,1', JSON.stringify({ a1, a2, a3, fins: fins.length, as: fins[0] && fins[0].asaltos }));
        iniciar({ sinCuenta: true, asaltos: 3 }); limpio(); cerca(6); D.j1.plumas = 4; D.j2.plumas = 2; D.tAsalto = ASALTO_TOPE - 0.02; paso(0.05); const tp = { g1: D.gan1, pausa: D.pausa > 0 };
        check('F1 · Duelo de 2: tope de 45 s por asalto (gana quien tenga más plumas) y reloj a la vista', tp.g1 === 1 && tp.pausa && !hud.q('reloj').hidden, JSON.stringify(tp));
        // Revisión: sin tope (modo relajado o un solo asalto) el reloj no cuenta hacia atrás; «Otra vez» quita el cartel del combo anterior
        { const acc = G.accesibilidad, rel0 = acc && acc.relajado; let tRel = null;
          if (acc) { acc.relajado = () => true; try { iniciar({ sinCuenta: true, asaltos: 3 }); limpio(); cerca(6); D.tAsalto = 10; paso(0.05); tRel = hud.q('relojN').textContent; } finally { acc.relajado = rel0; } }
          iniciar({ sinCuenta: true, asaltos: 1 }); limpio(); cerca(6); D.tAsalto = 10; paso(0.05); const t1 = hud.q('relojN').textContent;
          iniciar({ sinCuenta: true, asaltos: 3 }); limpio(); cerca(6); D.tAsalto = 10; paso(0.05); const t3 = hud.q('relojN').textContent;
          let ce = hud.q('combo'); if (!ce) { ce = document.createElement('div'); ce.className = 'vd-combo'; ce.dataset.k = 'combo'; hud.q('centro').after(ce); } // como lo crea el primer combo
          ce.hidden = false; comboVis = 1.3; iniciar({ sinCuenta: true, asaltos: 3 }); const cv = { vis: comboVis, oculto: hud.q('combo').hidden };
          check('F1 · Duelo de 2: sin tope (modo relajado o un asalto) el reloj no cuenta; al mejor de 3, sí; al empezar se quita el cartel del combo',
            (tRel === null || tRel === '') && t1 === '' && t3 === String(ASALTO_TOPE - 10) && cv.vis === 0 && cv.oculto, JSON.stringify({ tRel, t1, t3, cv })); }
        // Brinco: J1 con Espacio (no salta como siempre), J2 con su saltito; un golpe dentro del Brinco no entra y deja abierta 0,8 s a quien lo dio
        iniciar({ sinCuenta: true, asaltos: 3 }); limpio(); cerca(1.5); D.j1.brincoCd = 0;
        tecla('keydown', ' ', 'Space'); tecla('keyup', ' ', 'Space');
        const b1 = { brinco: D.j1.brinco, cd: D.j1.brincoCd };
        cerca(1.5); const pl1 = D.j1.plumas, en2 = D.j2.energia; D.j1.energia = 40; usar(D.j2, 'golpe_ala');
        const e1 = { pl: D.j1.plumas, ab: D.j2.abierta, en: Math.round(D.j1.energia), bloq: usar(D.j2, 'semilla').motivo };
        limpio(); for (const f of [D.j1, D.j2]) { f.abierta = 0; f.brinco = 0; f.brincoCd = 0; } cerca(1.5);
        tecla('keydown', 'Enter', 'Enter'); tecla('keyup', 'Enter', 'Enter'); const b2 = { brinco: D.j2.brinco }; usar(D.j1, 'golpe_ala'); const e2 = { pl: D.j2.plumas, ab: D.j1.abierta };
        check('F1 · Duelo de 2: Brinco del J1 (Espacio) y del J2 (su saltito) con 0,25 s sin daño; el golpe esquivado deja abierta 0,8 s a quien lo dio y quien esquiva carga 15 de energía',
          Math.abs(b1.brinco - BRINCO.dura) < 1e-6 && b1.cd > 0 && e1.pl === pl1 && Math.abs(e1.ab - BRINCO.abierta) < 1e-6 && e1.en === 55 && e1.bloq === 'abierta' && b2.brinco > 0 && e2.pl === PLUMAS && e2.ab > 0, JSON.stringify({ b1, e1, b2, e2, en2 }));
        salir();
      }
      // F4-16, 18 y 19 · Duelo de 2 (docs/diseno/F4_GAME_FEEL.md), con las funciones del duelo (combate.js → feel)
      if (FL && FL.final) {
        const A = G.audio, R0 = R.REDUCED, ar0 = A.reducido, FS = FL.stats, burst0 = G.fx.burst, pet0 = G.fx.petalos, hoj0 = G.fx.hojas, rafagas = [], petalos = [], J = G.fx.juicy;
        G.fx.hojas = function (x, y, z, n) { rafagas.push('leaves:' + n); return hoj0.apply(this, arguments); };
        G.fx.burst = function (x, y, z, k, n) { rafagas.push(k + ':' + n); return burst0.apply(this, arguments); };
        G.fx.petalos = function (x, y, z, n) { petalos.push(n); return pet0.apply(this, arguments); };
        try {
          R.REDUCED = false; A.reducido = false;
          const ultimo = k => { salir(); iniciar({ sinCuenta: true, asaltos: 1 }); limpio(); cerca(1.5); S.facing = { x: 1, z: 0 }; A.log.length = 0; rafagas.length = 0; petalos.length = 0;
            if (k === 'j1') { D.j2.plumas = 1; usar(D.j1, 'golpe_ala'); } else { D.j1.plumas = 1; usar(D.j2, 'golpe_ala'); } };
          const g0 = Object.assign({}, FS); ultimo('j2');
          const finEl = hud.q('fin'), espera = () => finEl.classList.contains('vd-fin-espera') && getComputedStyle(finEl).visibility === 'hidden';
          const c2 = c2On(), enLento = { fase: D.fase, res: D.resultado, lentoT: C2 ? C2.lentoT : 0, d: encuadre().d, dest: FS.destellos - g0.destellos, vic: A.log.filter(n => n === 'duelo_victoria').length, panelEspera: espera() };
          for (let i = 0; i < 6; i++) C2.pasoReloj(0.1);
          { const panel06 = espera(); for (let i = 0; i < 6; i++) C2.pasoReloj(0.1); const panel12 = espera(), r = finEl.getBoundingClientRect(), serieHud = hud.q('serie');
            const abajo = getComputedStyle(finEl).position === 'fixed' && r.bottom > innerHeight - 40 && r.top > innerHeight * 0.45;
            check('F4-16 y 19 · Duelo de 2 (revisión): el panel final va abajo y aparece al acabar la cámara lenta (no tapa a quien gana); el marcador sale en el panel y no también en el HUD',
              (!c2 || (enLento.panelEspera && panel06 && !panel12)) && abajo && (!serieHud || serieHud.hidden) && !hud.q('finSerie').hidden,
              JSON.stringify({ c2, panelEspera: enLento.panelEspera, panel06, panel12, abajo, top: Math.round(r.top), bottom: Math.round(r.bottom), alto: innerHeight, serieHud: serieHud && !serieHud.hidden })); }
          const e2 = encuadre(), tras = { lentoT: C2.lentoT, d: e2.d, x: +(e2.x - pos2.x).toFixed(3), z: +(e2.z - pos2.z).toFixed(3), dest: FS.destellos - g0.destellos, oro30: rafagas.filter(r => r === 'gold:30').length, pet: petalos.join(),
            l1: hud.q('finTxt').textContent, l2: hud.q('finSerie').textContent, l2Vis: !hud.q('finSerie').hidden, tam: parseFloat(getComputedStyle(hud.q('finTxt')).fontSize), otra: !!hud.q('otraB') };
          check('F4-16 y 19 · Duelo de 2: último golpe a cámara lenta 0,5 s cerca de las dos; luego la cámara con quien gana (también el J2), 30 destellos y pétalos, y panel de dos líneas (quién gana y la serie)',
            enLento.fase === 'fin' && enLento.res === 'j2' && enLento.vic === 1 && enLento.dest === 0 && (!c2 || (Math.abs(enLento.lentoT - 0.5) < 1e-6 && enLento.d === FL.CAM_LENTO)) &&
            tras.lentoT === 0 && tras.d === 7 && tras.x === 0 && tras.z === 0 && tras.dest === 1 && tras.oro30 === 1 && tras.pet === String(FL.FINAL.petalos) && tras.l1 === TXT.gana2 && tras.l2Vis && tras.l2 === TXT.serie(0, 1) && tras.tam >= 24 && tras.otra,
            JSON.stringify({ c2, enLento, tras }));
          { const s0 = FS.destellos; ultimo('j1'); salir(); for (let i = 0; i < 12; i++) C2.pasoReloj(0.1);
            check('F4-16 · Duelo de 2 (revisión): salir durante la cámara lenta cancela los destellos y pétalos pendientes', FS.destellos === s0 && C2.lentoT === 0, JSON.stringify({ dest: FS.destellos - s0, lentoT: C2.lentoT })); }
          const g1 = Object.assign({}, FS); A.reducido = true; ultimo('j1'); for (let i = 0; i < 6; i++) C2.pasoReloj(0.1); A.reducido = false;
          const red = { lentos: FS.lentos - g1.lentos, dest: FS.destellos - g1.destellos, oro30: rafagas.filter(r => r === 'gold:30').length, pet: petalos.length, lentoT: C2.lentoT, listo: cam.listo, finales: FS.finales - g1.finales, d: encuadre().d };
          check('F4-16 y 19 · Duelo de 2: con «Reducir movimiento», sin cámara lenta ni partículas y la cámara pasa a quien gana en un corte',
            red.lentos === 0 && red.dest === 0 && red.oro30 === 0 && red.pet === 0 && red.lentoT === 0 && red.finales === 1 && red.d === 7 && red.listo === false, JSON.stringify(red));
          // 18 · semilla que falla
          salir(); iniciar({ sinCuenta: true, asaltos: 1 }); limpio(); cerca(5); const uy = hud.q('uy'); uy.hidden = true; rafagas.length = 0;
          const tiro = (dx, dz, vx, vy, vida) => { D.balas.length = 0; const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 3)); m.position.set(pos2.x + dx, pos2.y + 0.9, pos2.z + dz); scene.add(m);
            D.balas.push({ m, t: 0, de: D.j1, vx, vy, vz: 0, vida, radio: 0.9, golpe: { plumas: 1 } }); for (let i = 0; i < 40 && D.balas.length; i++) pasoBalas(0.05); m.geometry.dispose(); };
          const h0 = { f: FS.fallos, p: FS.polvos, u: FS.uys, hojas: J.hojas };
          tiro(-6, 3, 0, -12, 2); const suelo = { fallos: FS.fallos - h0.f, polvos: FS.polvos - h0.p, hojas: J.hojas - h0.hojas, hojas4: rafagas.filter(r => r === 'leaves:4').length, uy: !uy.hidden };
          tiro(-3, 1.5, 12, 0, 0.5); const roza = { uys: FS.uys - h0.u, uy: !uy.hidden, txt: uy.textContent, pl: D.j2.plumas };
          A.reducido = true; const r0 = { p: FS.polvos, hojas: J.hojas }; tiro(-6, 3, 0, -12, 2); A.reducido = false; const redS = { polvos: FS.polvos - r0.p, hojas: J.hojas - r0.hojas };
          check('F4-18 · Duelo de 2: la semilla que falla deja 4 hojas y polvo al tocar el suelo; si la otra la esquiva por poco, «¡Uy!»; con «Reducir movimiento», sin hojas ni polvo',
            suelo.fallos === 1 && suelo.polvos === 1 && suelo.hojas === 1 && suelo.hojas4 === 1 && !suelo.uy && roza.uys === 1 && roza.uy && roza.txt === FL.UY.txt && roza.pl === PLUMAS && redS.polvos === 0 && redS.hojas === 0,
            JSON.stringify({ suelo, roza, redS }));
        } finally { G.fx.burst = burst0; G.fx.petalos = pet0; G.fx.hojas = hoj0; R.REDUCED = R0; A.reducido = ar0; salir(); }
      }
      // F1 · cambio 7: revancha y hándicap (marcador de la sesión, «Otra vez» en < 2 s sin pantallas, Ventaja por jugadora)
      try {
        salir(); evs.length = 0;
        const fins = () => evs.filter(e => e.tipo === 'fin').length;
        const gana = k => { limpio(); cerca(1.5); if (k === 'j1') { D.j2.plumas = 1; usar(D.j1, 'golpe_ala'); } else { D.j1.plumas = 1; usar(D.j2, 'golpe_ala'); } };
        iniciar({ sinCuenta: true, asaltos: 1 }); const s0 = { j1: D.serie.j1, j2: D.serie.j2, oculto: hud.q('serie').hidden };
        gana('j1'); usar(D.j1, 'golpe_ala'); terminar('j2'); // tras el fin, ni otro golpe ni otro terminar cuentan
        const s1 = { j1: D.serie.j1, j2: D.serie.j2, txt: hud.q('serie').textContent, oculto: hud.q('serie').hidden, panel: hud.q('finSerie').hidden ? '' : hud.q('finSerie').textContent, fins: fins() }; // en el final, el marcador va en el panel (no en el HUD a la vez: revisión F4)
        // «Otra vez»: sin tarjeta, sin entreno, cuenta corta; la pelea empieza antes de 2 s (tiempo de juego) y la llamada es inmediata
        const espA = D.esp2; D.finT -= FIN_PAUSA; const r0 = performance.now(); hud.q('fin').querySelector('[data-a="otra"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); const rMs = performance.now() - r0;
        const ov = { fase: D.fase, card: !!G.ui.cardOpen, tj: tjAbierta(), ent: !!ent, finOculto: hud.q('fin').hidden, pl: [D.j1.plumas, D.j2.plumas], serie: hud.q('serie').textContent };
        let tJuego = 0; while (D.fase === 'cuenta' && tJuego < 4) { paso(0.05); tJuego += 0.05; }
        check('F1 · cambio 7: «Otra vez» relanza en < 2 s (cuenta corta, sin tarjeta ni entreno) con el mismo emparejamiento y el marcador intacto',
          ov.fase === 'cuenta' && !ov.card && !ov.tj && !ov.ent && ov.finOculto && D.fase === 'lucha' && tJuego < 2 && rMs < 200 && D.esp2 === espA && ov.serie === TXT.serie(1, 0),
          JSON.stringify({ ov, tJuego: +tJuego.toFixed(2), rMs: Math.round(rMs), esp2: D.esp2 }));
        gana('j2'); const s2 = { j1: D.serie.j1, j2: D.serie.j2, txt: hud.q('serie').textContent, fins: fins() };
        D.finT -= FIN_PAUSA; otraVez(); D.fase = 'lucha'; gana('j1'); const s3 = { txt: hud.q('serie').textContent, fins: fins() };
        salir(); const s4 = { j1: D.serie.j1, j2: D.serie.j2, oculto: hud.q('serie').hidden };
        iniciar({ sinCuenta: true, asaltos: 1 }); const s5 = { oculto: hud.q('serie').hidden, j1: D.serie.j1 }; salir();
        check('F1 · cambio 7: marcador de la sesión «J1 1 · 0 J2» que suma al terminar cada duelo (una vez; en el final, en el panel) y se borra al salir del modo',
          s0.j1 === 0 && s0.j2 === 0 && s0.oculto && s1.j1 === 1 && s1.j2 === 0 && s1.txt === TXT.serie(1, 0) && s1.oculto && s1.panel === TXT.serie(1, 0) && s2.j1 === 1 && s2.j2 === 1 && s2.txt === TXT.serie(1, 1) &&
          s3.txt === TXT.serie(2, 1) && s4.j1 === 0 && s4.j2 === 0 && s4.oculto && s5.oculto && s5.j1 === 0, JSON.stringify({ s0, s1, s2, s3, s4, s5 }));
        check('F1 · cambio 7: el fin (victoria / derrota) se emite una sola vez por duelo, también con «Otra vez»', s1.fins === 1 && s2.fins === 2 && s3.fins === 3 && evs.every(e => e.tipo !== 'win' && e.tipo !== 'loss'), JSON.stringify({ f1: s1.fins, f2: s2.fins, f3: s3.fins }));
        // Ventaja: solo a quien la marca, en cada asalto, y se mantiene con «Otra vez»
        iniciar({ sinCuenta: true, asaltos: 3, ventaja: { j1: false, j2: true } });
        const v0 = { m1: D.j1.plumasMax, m2: D.j2.plumasMax, p1: D.j1.plumas, p2: D.j2.plumas, h1: hud.q('pl1').children.length, h2: hud.q('pl2').children.length };
        gana('j1'); for (let t = 0; t < 2.2; t += 0.05) paso(0.05);
        const v1 = { asalto: D.asalto, p1: D.j1.plumas, p2: D.j2.plumas, h2: hud.q('pl2').children.length };
        gana('j2'); for (let t = 0; t < 2.2; t += 0.05) paso(0.05); const v2 = { asalto: D.asalto, p1: D.j1.plumas, p2: D.j2.plumas };
        gana('j1'); D.finT -= FIN_PAUSA; otraVez(); const v3 = { p1: D.j1.plumas, p2: D.j2.plumas, h1: hud.q('pl1').children.length, h2: hud.q('pl2').children.length };
        salir(); iniciar({ sinCuenta: true, asaltos: 1 }); const v4 = { p1: D.j1.plumas, p2: D.j2.plumas, h2: hud.q('pl2').children.length }; salir();
        check('F1 · cambio 7: «Ventaja» solo para quien la marca: 7 plumas (y 7 en el HUD) al empezar cada asalto y con «Otra vez»; la otra, 5; al salir se quita',
          v0.m1 === PLUMAS && v0.m2 === PLUMAS_VENTAJA && v0.p1 === PLUMAS && v0.p2 === PLUMAS_VENTAJA && v0.h1 === PLUMAS && v0.h2 === PLUMAS_VENTAJA &&
          v1.asalto === 2 && v1.p1 === PLUMAS && v1.p2 === PLUMAS_VENTAJA && v1.h2 === PLUMAS_VENTAJA && v2.asalto === 3 && v2.p1 === PLUMAS && v2.p2 === PLUMAS_VENTAJA &&
          v3.p1 === PLUMAS && v3.p2 === PLUMAS_VENTAJA && v3.h1 === PLUMAS && v3.h2 === PLUMAS_VENTAJA && v4.p1 === PLUMAS && v4.p2 === PLUMAS && v4.h2 === PLUMAS, JSON.stringify({ v0, v1, v2, v3, v4 }));
        // La tarjeta: un botón por jugadora (≥ 44 px), que se marca y desmarca; «¡A jugar!» empieza con esa Ventaja
        abrirTarjeta(); const cd = G.ui.$('card'), bvs = [...cd.querySelectorAll('[data-d2v]')];
        const altos = bvs.map(b => b.offsetHeight); // offsetHeight: sin la animación de entrada de la tarjeta (escala)
        bvs[0].onclick(); const t1 = { j1: D.ventaja.j1, j2: D.ventaja.j2, ap: bvs[0].getAttribute('aria-pressed') };
        bvs[1].onclick(); bvs[1].onclick(); const t2 = { j2: D.ventaja.j2, ap: bvs[1].getAttribute('aria-pressed') };
        G.ui.$('v18-d2-ok').onclick(); const t3 = { fase: D.fase, m1: D.j1 && D.j1.plumasMax, m2: D.j2 && D.j2.plumasMax }; salir();
        check('F1 · cambio 7: la tarjeta trae «Ventaja» por jugadora (botones ≥ 44 px, aria-pressed) y el duelo empieza con ella',
          bvs.length === 2 && altos.every(h => h >= 44) && t1.j1 && !t1.j2 && t1.ap === 'true' && !t2.j2 && t2.ap === 'false' && t3.fase !== 'nada' && t3.m1 === PLUMAS_VENTAJA && t3.m2 === PLUMAS && !D.ventaja.j1,
          JSON.stringify({ altos, t1, t2, t3 }));
      } catch (e) { check('F1 · cambio 7 sin excepciones', false, e && (e.stack || e.message)); } finally { if (G.ui.cardOpen) G.ui.hideCard(); if (tjAbierta()) TJ.cerrar('salir'); salir(); }
      // F1 · cambio 7 (revisión de dos revisores): lo que se arregló
      try {
        salir();
        // a) al terminar, sin semillas en el aire ni temporizadores ni trampas pendientes (la limpieza había quedado comentada)
        iniciar({ sinCuenta: true, asaltos: 1 }); limpio(); cerca(6); const rs = usar(D.j1, 'semilla'); const enVuelo = D.balas.length, mallas = D.balas.map(b => b.m);
        D.timers.push({ t: 9, fn: () => {} }); D.trampas.push({ x: S.pos.x, z: S.pos.z, t: 9, de: D.j1 });
        D.j2.plumas = 1; limpio(); cerca(1.5); usar(D.j1, 'golpe_ala');
        const fz = { fase: D.fase, balas: D.balas.length, timers: D.timers.length, trampas: D.trampas.length, enEscena: mallas.filter(m => m.parent).length };
        check('F1 · cambio 7 (rev.): al ganar con una semilla en vuelo, la semilla se quita de la escena y no quedan temporizadores ni trampas',
          rs.ok && enVuelo > 0 && fz.fase === 'fin' && fz.balas === 0 && fz.timers === 0 && fz.trampas === 0 && fz.enEscena === 0, JSON.stringify({ ok: rs.ok, enVuelo, fz }));
        // b) panel final con la serie y «Otra vez» atenuado mientras no se puede pulsar (y un pulso temprano no relanza)
        const fin0 = { serie: hud.q('finSerie').textContent, oculto: hud.q('finSerie').hidden, espera: hud.q('otraB').classList.contains('espera'), aria: hud.q('otraB').getAttribute('aria-disabled') };
        modo.accion(); const temprano = D.fase;
        D.finT -= FIN_PAUSA; paso(0.05); const fin1 = { espera: hud.q('otraB').classList.contains('espera'), aria: hud.q('otraB').getAttribute('aria-disabled') };
        check('F1 · cambio 7 (rev.): el panel final enseña la serie («J1 1 · 0 J2») y «Otra vez» va atenuado hasta que se puede pulsar',
          !fin0.oculto && fin0.serie === TXT.serie(1, 0) && fin0.espera && fin0.aria === 'true' && temprano === 'fin' && !fin1.espera && fin1.aria === 'false', JSON.stringify({ fin0, temprano, fin1 }));
        // c) «Otra vez» tras un duelo de 3 asaltos: la cuenta corta ya no enseña los asaltos ganados del duelo anterior
        iniciar({ sinCuenta: true, asaltos: 3 });
        const g3 = () => { limpio(); cerca(1.5); D.j2.plumas = 1; usar(D.j1, 'golpe_ala'); for (let t = 0; t < 2.2 && D.fase === 'lucha'; t += 0.05) paso(0.05); };
        g3(); g3(); const antes = { fase: D.fase, on: hud.q('as1').querySelectorAll('i.on').length };
        D.finT -= FIN_PAUSA; otraVez(); paso(0.05);
        const cuenta = { fase: D.fase, gan1: D.gan1, on1: hud.q('as1').querySelectorAll('i.on').length, on2: hud.q('as2').querySelectorAll('i.on').length };
        check('F1 · cambio 7 (rev.): en la cuenta de «Otra vez» el reloj arranca sin asaltos ganados', antes.fase === 'fin' && antes.on === 2 && cuenta.fase === 'cuenta' && cuenta.gan1 === 0 && cuenta.on1 === 0 && cuenta.on2 === 0,
          JSON.stringify({ antes, cuenta }));
        salir();
        // d) con Ventaja se ve la etiqueta junto al nombre (solo en quien la tiene); sin ella, no
        iniciar({ sinCuenta: true, asaltos: 1, ventaja: { j1: false, j2: true } }); const et0 = { v1: hud.q('vent1').hidden, v2: hud.q('vent2').hidden };
        salir(); iniciar({ sinCuenta: true, asaltos: 1 }); const et1 = { v1: hud.q('vent1').hidden, v2: hud.q('vent2').hidden }; salir();
        check('F1 · cambio 7 (rev.): la etiqueta «Ventaja» sale junto al nombre de quien la tiene y se quita sin ella', et0.v1 && !et0.v2 && et1.v1 && et1.v2, JSON.stringify({ et0, et1 }));
        // e) la tarjeta cabe a 1280×720 con la fila de Ventaja (sin scroll), dice «Jugador 1 / 2» y ya no promete «5 plumas».
        // La batería corre a 1280×657: se mide el alto natural (scrollHeight) contra el máximo a 720 px (100vh − 40, ui.css)
        abrirTarjeta(); const cd = G.ui.$('card'), ok = G.ui.$('v18-d2-ok');
        const tj = { sh: cd.scrollHeight, ch: cd.clientHeight, vw: innerWidth, vh: innerHeight, txt: [...cd.querySelectorAll('[data-d2v]')].map(b => b.textContent), cinco: /5 plumas/.test(cd.textContent), okAbajo: Math.round(ok.offsetTop + ok.offsetHeight) };
        G.ui.hideCard();
        check('F1 · cambio 7 (rev.): la tarjeta del Duelo de 2 cabe sin scroll (con la fila de Ventaja), botones «Jugador 1 / Jugador 2» y sin «5 plumas»',
          (innerWidth < 1200 || tj.sh <= 720 - 40) && tj.txt.join('|') === TXT.j1 + '|' + TXT.j2 && !tj.cinco, JSON.stringify(tj));
      } catch (e) { check('F1 · cambio 7 (rev.) sin excepciones', false, e && (e.stack || e.message)); } finally { if (G.ui.cardOpen) G.ui.hideCard(); if (tjAbierta()) TJ.cerrar('salir'); salir(); }
      // 6. Cámara compartida
      iniciar({ sinCuenta: true }); cerca(3); G.camara.follow(0.05); G.camara.follow(1);
      const dCerca = camera.position.distanceTo(new THREE.Vector3((S.pos.x + pos2.x) / 2, (S.pos.y + pos2.y) / 2, (S.pos.z + pos2.z) / 2));
      S.pos.x = sitio.x - 11; pos2.x = sitio.x + 11; pos2.z = S.pos.z = sitio.z; for (let i = 0; i < 30; i++) G.camara.follow(0.1);
      const mid = new THREE.Vector3((S.pos.x + pos2.x) / 2, (S.pos.y + pos2.y) / 2, (S.pos.z + pos2.z) / 2), dLejos = camera.position.distanceTo(mid);
      camera.updateMatrixWorld(); const v1 = new THREE.Vector3(S.pos.x, S.pos.y + 1, S.pos.z).project(camera), v2 = new THREE.Vector3(pos2.x, pos2.y + 1, pos2.z).project(camera);
      check('Cámara compartida: encuadra a las dos y se abre hasta un límite', dLejos > dCerca + 3 && dLejos <= CAMD.max + 2 && Math.abs(v1.x) < 1 && Math.abs(v2.x) < 1 && v1.x < v2.x,
        JSON.stringify({ dCerca: dCerca.toFixed(1), dLejos: dLejos.toFixed(1), x1: v1.x.toFixed(2), x2: v2.x.toFixed(2) }));
      // du3: la flecha y el haz de la guía de la misión no se ven mientras juegan dos (aunque hubiera un objetivo encendido)
      if (G.fx && G.fx.guide) {
        G.fx.guide({ x: S.pos.x + 14, z: S.pos.z + 6 }, 0); const flecha0 = G.fx.guideArrow.visible;
        G.emit('render', 0.016);
        check('du3: en el duelo de 2 no se ven la flecha ni el haz de la guía de la misión', !G.fx.guideArrow.visible && !G.fx.guideBeam.visible, JSON.stringify({ flechaAntes: flecha0 }));
      }
      // Combate 2.0 (para todos; ?combate2=0 lo apaga): el J2 y Vittata con la máquina de estados de combate.js; sin la bandera, la capa de siempre
      if (C2) {
        const c2_0 = G.combate2;
        try {
          G.combate2 = false; iniciar({ forzar: true, sinCuenta: true, sinEntreno: true }); cerca(1.5); limpio(); correr(0.3);
          const sinC2 = !D.j2.anima2 && !D.j1.anima2 && !!D.j2.anima;
          G.combate2 = true; iniciar({ forzar: true, sinCuenta: true, sinEntreno: true }); cerca(1.5); limpio(); S.facing = { x: 1, z: 0 }; correr(0.2);
          const u = usar(D.j1, 'golpe_ala'), acc = D.j1.anima2 && D.j1.anima2.acc, subs = []; let imp = 0;
          correr(0.7, () => { const a = D.j2.anima2 || {}; if (a.sub === 'impacto') imp++; if (subs[subs.length - 1] !== a.sub) subs.push(a.sub); });
          check('Combate 2.0 (duelo de 2): con la bandera, el aletazo de Vittata sale en su pose de impacto y el J2 lo encaja (impacto → vuelve); sin ella, la capa de siempre',
            sinC2 && u.acierto && acc && acc.fam === 'ala' && acc.u >= C2.FAM.ala.imp - 1e-6 && imp >= 3 && subs.indexOf('impacto') >= 0 && subs[subs.length - 1] !== 'impacto',
            JSON.stringify({ sinC2, acierto: u.acierto, acc: acc && { fam: acc.fam, u: +acc.u.toFixed(3) }, imp, subs }));
          // Extremidades y combos (10-nov): J1 con U O J L (input.js), J2 con 7 9 4 6 del teclado numérico; sin la bandera esas teclas no se toman
          G.combate2 = false; iniciar({ forzar: true, sinCuenta: true, sinEntreno: true }); cerca(1.5); limpio();
          const n7 = tecla('keydown', '7', 'Numpad7'); tecla('keyup', '7', 'Numpad7');
          const apagada = !n7.defaultPrevented && !D.j2.ext && !D.j1.ext;
          G.combate2 = true; iniciar({ forzar: true, sinCuenta: true, sinEntreno: true }); cerca(1.5); limpio(); S.facing = { x: 1, z: 0 }; correr(0.2);
          const eu = tecla('keydown', 'u', 'KeyU'); tecla('keyup', 'u', 'KeyU'); const acc1 = D.j1.anima2 && D.j1.anima2.acc; correr(0.15);
          const j1 = { prev: eu.defaultPrevented, usos: D.j1.ext && D.j1.ext.usos, subs: acc1 ? acc1.fam + '@' + acc1.lado : '', pl2: D.j2.plumas };
          correr(0.8); limpio(); cerca(1.5);
          tecla('keydown', '4', 'Numpad4'); tecla('keyup', '4', 'Numpad4'); correr(0.25, () => cerca(1.5)); tecla('keydown', '6', 'Numpad6'); tecla('keyup', '6', 'Numpad6'); correr(0.1, () => cerca(1.5));
          const nomC = hud.q('combo'), j2 = { usos: D.j2.ext && D.j2.ext.usos, combos: D.j2.ext && Object.keys(D.j2.ext.combos).join(','), nom: nomC && !nomC.hidden && nomC.dataset.id, subs: D.j2.anima2 && (D.j2.anima2.historial || []).slice(-3).join('>') };
          check('Combate 2.0 (duelo de 2): extremidades y combos para las dos (J1: U O J L; J2: 7 9 4 6 del teclado numérico) con el nombre del combo; sin la bandera esas teclas no se toman',
            apagada && j1.prev && j1.usos === 1 && /ext_ala/.test(j1.subs) && j1.pl2 === 4 && j2.usos === 2 && j2.combos === 'patita' && j2.nom === 'patita' && /combo_patita/.test(j2.subs),
            JSON.stringify({ apagada, j1, j2 }));
        } finally { G.combate2 = c2_0; salir(); }
      }
      // 7. Salir: todo vuelve
      salir();
      const ev2 = tecla('keydown', 'ArrowUp', 'ArrowUp'); const vuelve = G.input.keys.has('arrowup'); tecla('keyup', 'ArrowUp', 'ArrowUp');
      const vuelta = { modo: G.interaccion.modo !== modo, sostener: G.dones.sostener !== sostener1, hud: hud.el.hidden, pl3d: !pl3d, follow0: !follow0,
        camara: G.camara.follow === followAntes, volar: F.toggleFly === flyAntes, flechas: vuelve && !ev2.defaultPrevented, j2: !D.ch.root.visible };
      check('Al salir se devuelven Acción, Impulso, volar, cámara y flechas', Object.values(vuelta).every(Boolean),
        Object.keys(vuelta).filter(k => !vuelta[k]).join(', '));
      check('Sin errores de consola durante la prueba', errores.length === 0, errores.join(' | '));
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    // T44: en el teléfono (pointer: coarse simulado), dos mandos en pantalla; el J2 se mueve con su joystick y usa sus botones
    { const mm = window.matchMedia;
      try {
        window.matchMedia = q => (/pointer:\s*coarse/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, onchange: null } : mm(q));
        salir(); iniciar({ forzar: true, sinCuenta: true });
        const el = document.getElementById('d2-tactil'), pads = el ? el.querySelectorAll('.d2-pad') : [], b1 = el && el.querySelectorAll('.d2-pad.j1 button:not(.brinco)').length, b2 = el && el.querySelectorAll('.d2-pad.j2 button:not(.brinco)').length;
        check('T44 · táctil: dos 2×2 (Jugador 1 a la izquierda, Jugador 2 a la derecha), el joystick del J2 y sin los botones grandes', !!el && pads.length === 2 && b1 === 4 && b2 === 4 && !!el.querySelector('.d2-st2') && document.body.classList.contains('d2-tactil-on') && disponible(), JSON.stringify({ b1, b2 }));
        const x0 = pos2.x; T44.st2.id = 7; T44.st2.x = -1; T44.st2.y = 0; for (let i = 0; i < 10; i++) paso(0.05); T44.st2.id = null; T44.st2.x = 0;
        D.j2.cd = {}; D.j2.energia = D.j2.energiaMax || 100; const us = usarTactil(D.j2, 'j2', 'semilla');
        check('T44 · el joystick del J2 lo mueve y su botón Semilla dispara', pos2.x < x0 - 0.5 && us && (D.j2.cd.semilla || 0) > 0, (pos2.x - x0).toFixed(2));
        { const bb1 = el.querySelector('.d2-pad.j1 button.brinco'), bb2 = el.querySelector('.d2-pad.j2 button.brinco');
          for (const f of [D.j1, D.j2]) { f.brinco = 0; f.brincoCd = 0; f.mareo = 0; if (f.lift) f.lift.dura = 0; }
          const ok1 = usarTactil(D.j1, 'j1', 'brinco'), ok2 = usarTactil(D.j2, 'j2', 'brinco');
          const r1 = bb1 && bb1.getBoundingClientRect(), p1 = el.querySelector('.d2-pad.j1').getBoundingClientRect(), r2 = bb2 && bb2.getBoundingClientRect(), p2 = el.querySelector('.d2-pad.j2').getBoundingClientRect();
          const fuera = (r, p) => r && r.width >= 44 && (r.left >= p.right - 0.5 || r.right <= p.left + 0.5);
          check('F1 · táctil: cada jugador tiene su botón Brinco (≥ 44 px, junto a su 2×2 sin pisarlo) y da su Brinco de 0,25 s',
            ok1 && ok2 && D.j1.brinco > 0 && D.j2.brinco > 0 && fuera(r1, p1) && fuera(r2, p2), JSON.stringify({ ok1, ok2, r1: r1 && [r1.left, r1.width], p1: [p1.left, p1.right], r2: r2 && [r2.left, r2.width], p2: [p2.left, p2.right] })); }
        const vertical = innerHeight > innerWidth, g = el.querySelector('.d2-gira');
        check('T44 · en vertical sale «Gira el teléfono» (y pausa); en horizontal, no', g.hidden === !vertical && T44.girar === vertical, JSON.stringify({ vertical, oculto: g.hidden }));
        salir();
        check('T44 · al salir se quitan los mandos y vuelven los botones grandes', !document.getElementById('d2-tactil') && !document.body.classList.contains('d2-tactil-on') && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('duelo2-girar')));
      } catch (e) { check('T44 · táctil sin excepciones', false, e && (e.stack || e.message)); }
      try { const m = await TJ.maqueta('dos'); check('T57 · Duelo de 2: la tarjeta «¿Cómo se pelea?» cabe entera (sin desplazar ni cortar) a 390 × 844, 844 × 390 y 1280 × 720, con «¡A pelear!» ≥ 44 px', m.ok, m.mal.slice(0, 8).join(' · ') || m.info); }
      catch (e) { check('T57 · Duelo de 2: la tarjeta cabe en las tres medidas', false, e && e.message); }
      finally { window.matchMedia = mm; try { salir(); } catch (e) { /* fuera */ } }
    }
    // QA-192: fuera del cap. 1 la estación no existe (la marca del suelo usa la misma guarda)
    try {
      const pack0 = G.pack && G.pack.id; G.pack.id = 'ep4';
      try { check('QA-192: fuera del cap. 1 no se ofrece el duelo de 2', !disponible() && !it.visible()); }
      finally { G.pack.id = pack0; }
    } catch (e) { check('QA-192: fuera del cap. 1 no se ofrece el duelo de 2', false, e && e.message); }
    try { salir(); } catch (e) { /* fuera */ }
    G.V18 = v18on0;
    oy.mudo = true; removeEventListener('error', oyErr); removeEventListener('unhandledrejection', oyErr);
    if (G.guardado) { if (guardar0) G.guardado.save = guardar0; else delete G.guardado.save; }
    try { if (ent0 == null) localStorage.removeItem(CLAVE_ENT); else localStorage.setItem(CLAVE_ENT, ent0); } catch (e) { /* sin almacenamiento */ }
    try { if (tj0 == null) localStorage.removeItem(CLAVE_TJ); else localStorage.setItem(CLAVE_TJ, tj0); } catch (e) { /* sin almacenamiento */ }
    if (tjAbierta()) TJ.cerrar('salir');
    D.esp2 = esp0;
    Object.assign(S.pos, pos0); S.facing = fac0; M.vx = M.vz = 0;
    if (JSON.stringify(S.inv || {}) !== inv0) { const o = JSON.parse(inv0); for (const k of Object.keys(S.inv)) if (!(k in o)) delete S.inv[k]; Object.assign(S.inv, o); }
    try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    try { G.camara.place(true); } catch (e) { /* cámara */ }
    try { if (v18fx('paso')) for (let i = 0; i < 40; i++) G.v18fx.paso(0.1); } catch (e) { /* efectos */ } // anillos y plumas de la prueba, apagados
    asaltosDef = 0;
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18duelo2 = { disponible, abrirTarjeta, iniciar, salir, otraVez, usar, paso, estado: () => D, entreno: () => ent, saltarEntreno, TXT, test };
  return G.v18duelo2;
};
