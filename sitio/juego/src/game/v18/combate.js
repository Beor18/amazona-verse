/* Juego · V18.1 frente A · duelo de entrenamiento 1v1 contra una cotorra IA (entregable D7). Kelvin 5-nov, respuestas definitivas.
   - Explanada abierta y plana al este de la plaza de Villa Raíz (se busca en el mapa real; si no cabe, la más plana cerca).
   - La rival, «Campeona de la Explanada», es una cotorra existente con otra piel (sin canon nuevo): si juegas una Isleña, es
     una arausiaca (Escudo de plumas); si juegas una Montañera, una Isleña (Grito del Yunque). Lleva gafas de entreno.
   - Se entra hablando con ella (G.interaccion); sale en el minimapa como cualquier interactuable.
   - Resistencia: 5 plumas visibles por lado; cada impacto normal (ala o semilla) quita 1. La energía de los poderes va en un
     indicador aparte. Sin plumas: mareo breve con estrellitas (nadie se hace daño), fin del duelo y «Otra vez».
   - Básicos de todas: golpe de ala (Acción / E) y semilla (Impulso / F). Poder de la especie elegida (G.v18.seleccionada()):
     mantener Impulso, la tecla G o el botón con su nombre. Vittata: Grito del Yunque (sale hacia donde miras: hay que apuntar).
     A. arausiaca: Escudo de plumas. Mientras dura el duelo se toma Acción con G.interaccion.modo y el «mantener Impulso» de
     los dones (G.dones.sostener) con una envoltura que se quita al salir: dones.js no se toca.
   - Pico y alas: el grito abre el pico (hueso «pico» vía mouth, como al hablar) y el escudo abre las alas (wingMode 'land');
     en Vittata se pone con una envoltura de player3D.update mientras dura el duelo: actores.js y character.js no se tocan.
   - Efectos: G.v18fx.onda(origen, dir, alcance) / escudo(actor, s) / dispersar(actor) si existe (fx_poderes.js); si no, unos
     anillos y plumas propios, baratos.
   - Eventos: G.emit('v18combate', { tipo: 'hit' | 'damage' | 'win' | 'loss', de, a, valor }) y
     G.emit('v18poder', { id: 'grito_yunque' | 'escudo_plumas', de, origen, direccion, alcance }).
   - Recompensa: la primera victoria da 2 maderas y 1 piedra al inventario del juego (S.inv, el mismo del cap. 1);
     G.v18.otorgar('combate_1', 'victoria_duelo', 1) es solo la marca idempotente de que ya pagó. Repetir no da más.
   Solo con la bandera V18. Prueba: AV.v18CombateTest(). */
window.AVV18Combate = function (G) {
  'use strict';
  if (G.v18combate) return G.v18combate;
  const H = G.v18hab, S = G.S, F = G.fisica, M = F.MOVE, scene = G.renderer.scene;
  const ALTURA = h => G.terreno.height(h.x, h.z);
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); // QA-163: sin tecla G en táctil
  const ARENA_R = 12, SALIDA_R = 24, PLUMAS = 5;
  const TXT = {
    retar: 'Retar a la Campeona de la Explanada', tu: 'Tú', rival: 'Campeona de la Explanada',
    ala: 'Ala', semilla: 'Semilla', poder: 'Poder', otra: 'Otra vez', salir: 'Salir', energia: 'Energía',
    aviso: 'Ala: Acción · Semilla: Impulso · Poder: mantén Impulso o G', avisoTactil: 'Toca Ala, Semilla o Poder',
    ya: '¡Ya!', gana: '¡Ganaste 2 maderas y 1 piedra! Con eso se repara el puente colgante: sigue la bandera verde del mapa.',
    ganaGuarda: '¡Ganaste 2 maderas y 1 piedra! El puente ya está reparado: guárdalas para lo que venga.', ganaOtra: '¡Ganaste otra vez! Los materiales ya te los llevaste; busca más por el bosque.',
    pierde: '¡Uy, te mareaste! Sacude las plumas y prueba otra vez.', lejos: 'Te alejaste: el duelo queda para luego.',
    bloquea: '¡Bloqueado!', rompe: '¡Escudo roto!', reduce: '¡El escudo aguantó parte del grito!', interrumpe: '¡Interrumpida!',
    ganaste: '¡Ganaste!', perdiste: '¡Casi!', bienvenida: '¡A jugar! Quítale sus 5 plumas a la Campeona.'
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
  let espForzada = null; // solo las pruebas: iniciar({ especie })
  const especieJugador = () => espForzada || (G.v18 && G.v18.seleccionada && G.v18.seleccionada()) ||
    (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata';
  const especieRival = sp => H.familia(sp) === 'montaneras' ? 'ventralis' : 'arausiaca';
  const nuevasStats = () => ({ movida: 0, ataques: 0, esquivas: 0, poderes: 0, aciertosIA: 0, bloqueos: 0, interrupciones: 0, ondas: 0, escudos: 0, dispersiones: 0, poderesEv: 0, reacciones: 0 });
  const C = { fase: 'nada', t: 0, cuenta: 0, j: null, r: null, balas: [], timers: [], resultado: null, ch: null, listo: null, stats: nuevasStats() };
  // Recompensa de la primera victoria: materiales del inventario del juego (S.inv), los mismos del cap. 1
  const PREMIO = { madera: 2, piedra: 1 };
  const rivalPos = { x: sitio.x + 4, y: sitio.y, z: sitio.z };
  function nuevoRival() {
    const sp = especieRival(especieJugador());
    return H.luchador({ id: 'rival', nombre: TXT.rival, especie: sp, ia: true, pos: rivalPos, plumas: PLUMAS, plumasMax: PLUMAS,
      kb: { x: 0, z: 0, t: 0 }, mov: { x: 0, z: 0, t: 0 }, lift: { alto: 0, t: 0, dura: 0 }, yaw: -Math.PI / 2,
      pensar: 0.4, golpeT: 1, tiroT: 1.5, esquivaT: 0, poderT: 2.5, lado: 1, finMareo: 0 });
  }
  function nuevoJugador() {
    return H.luchador({ id: 'jugador', nombre: TXT.tu, especie: especieJugador(), pos: S.pos, plumas: PLUMAS, plumasMax: PLUMAS,
      kb: { x: 0, z: 0, t: 0 }, finMareo: 0, mira: () => S.facing });
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
    if (blanco.escudo > 0 && g.rompeEscudo) { quitarEscudo(blanco); flotante(TXT.rompe, 1.2); } // Ala fuerte: rompe el escudo y el golpe entra entero
    const rc = H.recibir(de, blanco, g); // regla común (habilidades.js): escudo, invulnerabilidad, plumas, mareo, empujón
    if (rc.escudo) {
      // Escudo de plumas: un golpe normal se para del todo; el grito se reduce, no se anula. En los dos casos se dispersa.
      C.stats.bloqueos++;
      quitarEscudo(blanco);
      if (rc.r === 'bloqueado') {
        fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z); sonar('land');
        if (blanco.ia) flotante(TXT.bloquea);
        emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: 0, bloqueado: true });
        return false;
      }
      if (blanco.ia || !de.ia) flotante(TXT.reduce, 1.2);
    }
    if (rc.r !== 'ok') return false;
    const n = rc.n, empuje = rc.empuje, mareo = rc.mareo, parcial = rc.parcial;
    if (g.interrumpe) interrumpir(blanco, mareo, parcial);
    if (blanco.lift && empuje > 0) { blanco.lift.alto = n > 0 ? 0.45 : 0.25; blanco.lift.t = 0; blanco.lift.dura = 0.32; C.stats.reacciones++; } // saltito de sorpresa
    fx('feathers', blanco.pos.x, blanco.pos.y + 1, blanco.pos.z);
    sonar(n > 0 ? 'land' : 'jump');
    if (de.ia) C.stats.aciertosIA = (C.stats.aciertosIA || 0) + 1;
    emitir({ tipo: 'hit', de: de.id, a: blanco.id, valor: n, reducido: parcial || undefined, interrumpe: !!g.interrumpe || undefined });
    if (n > 0) emitir({ tipo: 'damage', de: de.id, a: blanco.id, valor: blanco.plumas });
    pintar();
    if (blanco.plumas <= 0) terminar(blanco === C.r ? 'win' : 'loss');
    return true;
  }
  // Interrumpir: corta lo que hacía (acometida, pensar, carga del poder) durante el mareo corto del grito
  function interrumpir(f, s, parcial) {
    C.stats.interrupciones++;
    f.interrumpida = s;
    if (f.ia) { f.mov.t = 0; f.pensar = Math.max(f.pensar, s); f.golpeT = Math.max(f.golpeT, s); if (!parcial) flotante(TXT.interrumpe); }
    else { sost = 0; M.dashT = 0; M.vx *= 0.3; M.vz *= 0.3; }
  }
  function fx(tipo, x, y, z) {
    if (!G.fx) return;
    try {
      if (tipo === 'ring' && G.fx.ringFx) G.fx.ringFx(x, y, z, 5, 0.6, 0.8);
      else if (G.fx.burst) G.fx.burst(x, y, z, tipo, tipo === 'bubbles' ? 10 : 8);
    } catch (e) { /* sin efectos */ }
  }
  function sonar(n, arg) { try { if (G.audio && G.audio.play) G.audio.play(n, arg); } catch (e) { /* sin audio */ } }
  const v18fx = nombre => G.v18fx && typeof G.v18fx[nombre] === 'function';

  // Ondas del Grito del Yunque: con G.v18fx.onda si existe; si no, tres anillos que avanzan y se abren (una geometría compartida)
  const geoOnda = new THREE.RingGeometry(0.42, 0.6, 40);
  const ondas = [];
  function onda(origen, dir, alcance) {
    C.stats.ondas++;
    if (v18fx('onda')) { try { G.v18fx.onda(origen, { x: dir.x, y: 0, z: dir.z }, alcance); return; } catch (e) { /* cae al propio */ } }
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(geoOnda, new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(origen.x, origen.y, origen.z); m.rotation.y = Math.atan2(dir.x, dir.z); m.renderOrder = 4; m.name = 'v18_onda';
      scene.add(m); ondas.push({ m, t: -i * 0.09, vida: alcance / 16, o: origen, dir, alcance });
    }
  }
  function pasoOndas(dt) {
    for (let i = ondas.length - 1; i >= 0; i--) {
      const w = ondas[i]; w.t += dt;
      const k = w.t / w.vida;
      if (k >= 1) { scene.remove(w.m); w.m.material.dispose(); ondas.splice(i, 1); continue; }
      if (k < 0) continue;
      const d = k * w.alcance, s = 0.6 + k * 2.6;
      w.m.position.set(w.o.x + w.dir.x * d, w.o.y, w.o.z + w.dir.z * d); w.m.scale.setScalar(s);
      w.m.material.opacity = 0.75 * (1 - k);
    }
  }
  function quitarOndas() { for (const w of ondas) { scene.remove(w.m); w.m.material.dispose(); } ondas.length = 0; }

  // Escudo de plumas: con G.v18fx.escudo/dispersar si existen; si no, 8 plumas de luz que giran y al final se dispersan
  const geoPluma = (() => { // pluma: hoja alargada con el cañón marcado
    const f = new THREE.Shape(); f.moveTo(0, -0.24); f.quadraticCurveTo(0.11, -0.05, 0.035, 0.24); f.lineTo(0, 0.2); f.lineTo(-0.035, 0.24); f.quadraticCurveTo(-0.11, -0.05, 0, -0.24);
    return new THREE.ShapeGeometry(f, 6);
  })();
  const matPluma = new THREE.MeshBasicMaterial({ color: '#9fe6ff', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const matPluma2 = new THREE.MeshBasicMaterial({ color: '#ffe7a3', transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  function escudo(f, s) {
    C.stats.escudos++;
    if (v18fx('escudo')) { try { G.v18fx.escudo(f, s); f.escudoFx = 'v18fx'; return; } catch (e) { /* cae al propio */ } }
    if (f.escudoFx && f.escudoFx !== 'v18fx') scene.remove(f.escudoFx);
    const g = new THREE.Group(); g.name = 'v18_escudo';
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(geoPluma, i % 2 ? matPluma2 : matPluma), a = i / 10 * Math.PI * 2;
      m.position.set(Math.cos(a) * 0.95, 0.32 * Math.sin(a * 2), Math.sin(a) * 0.95); m.rotation.set(0, -a + Math.PI / 2, 0.9); m.scale.setScalar(i % 2 ? 1.25 : 1.5); g.add(m);
    }
    g.position.set(f.pos.x, f.pos.y + 0.95, f.pos.z); scene.add(g); f.escudoFx = g;
  }
  function quitarEscudo(f, sinFx) {
    f.escudo = 0; f.alasT = 0;
    const e = f.escudoFx; if (!e) return; f.escudoFx = null;
    if (e === 'v18fx') { if (!sinFx && v18fx('dispersar')) try { G.v18fx.dispersar(f); } catch (er) { /* efecto */ } }
    else scene.remove(e);
    if (!sinFx) { fx('feathers', f.pos.x, f.pos.y + 1, f.pos.z); C.stats.dispersiones++; }
  }
  function pasoEscudo(f, dt) {
    if (!f || !f.escudoFx) return;
    if (f.escudo <= 0) { quitarEscudo(f); return; } // caducó sin recibir golpe
    if (f.escudoFx !== 'v18fx') { const g = f.escudoFx; g.position.set(f.pos.x, f.pos.y + 0.95, f.pos.z); g.rotation.y += dt * 4.5; }
  }
  function ctxDe(yo) {
    const otro = yo === C.j ? C.r : C.j;
    return {
      otro,
      golpear: (blanco, g) => golpear(yo, blanco, g),
      lanzar: b => lanzar(b),
      despues: (s, fn) => C.timers.push({ t: s, fn }),
      onda, escudo,
      poder: ev => { C.stats.poderesEv++; try { G.emit('v18poder', ev); } catch (e) { /* sin oyentes */ } },
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
  function quitarBalas() { for (const b of C.balas) scene.remove(b.m); C.balas.length = 0; quitarOndas(); if (C.j) quitarEscudo(C.j, true); if (C.r) quitarEscudo(C.r, true); }

  // ---------- Entrada del jugador ----------
  const modo = { activo: () => C.fase === 'lucha' || C.fase === 'cuenta' || C.fase === 'fin', accion: () => { if (C.fase === 'fin') otraVez(); else usar(C.j, 'golpe_ala'); },
    aviso: () => C.fase === 'fin' ? TXT.otra : (TACTIL ? TXT.avisoTactil : TXT.aviso), get verbo() { return C.fase === 'fin' ? TXT.otra : TXT.ala; } };
  let modo0 = null, sostener0 = null, sost = 0, enganchado = false;
  function sostenerDuelo(on) {
    if (on) { sost = performance.now(); return; }
    if (!sost) return;
    const ms = performance.now() - sost; sost = 0;
    usar(C.j, ms >= 450 ? C.j.poder : 'semilla');
  }
  function tecla(e) {
    if (e.repeat || !enganchado || C.fase !== 'lucha') return;
    if ((e.key || '').toLowerCase() === 'g' && !(e.target && /INPUT|TEXTAREA/.test(e.target.nodeName))) usar(C.j, C.j.poder);
  }
  // Pico y alas de la protagonista: se ponen justo antes de que el modelo se anime (envoltura de player3D.update mientras dura
  // el duelo; actores.js escribe mouth/wingMode cada cuadro y aquí solo se sobrescriben cuando el poder lo pide)
  function pose(ch, f, dt) {
    if (!ch || !f) return;
    if (f.picoT > 0) { ch.mouth = boca(f); ch.expression = 'fight'; }
    if (f.alasT > 0 && !ch.flying) ch.wingMode = 'land';
    const root = ch.root, w = f.finMareo > 0 ? Math.sin(performance.now() / 1000 * 13) * 0.24 * Math.min(1, f.finMareo) : 0;
    if (root) { root.rotation.z += w - (f.wob || 0); f.wob = w; }
    if (f.finMareo > 0 || f.mareo > 0) ch.expression = 'surprised';
  }
  // Pico abierto del todo mientras grita y se cierra en los últimos 0,15 s (character.js suaviza la apertura, como al hablar)
  const boca = f => Math.min(1, f.picoT / 0.15);
  let pl3d = null, upd0 = null;
  function envolverJugador() {
    const ch = G.actores && G.actores.player3D; if (!ch || pl3d) return;
    pl3d = ch; upd0 = ch.update;
    ch.update = function (dt) { try { pose(this, C.j, dt); } catch (e) { /* pose */ } return upd0.call(this, dt); };
  }
  function soltarJugador() {
    if (!pl3d) return;
    if (C.j && C.j.wob && pl3d.root) { pl3d.root.rotation.z -= C.j.wob; C.j.wob = 0; }
    delete pl3d.update; if (pl3d.update !== upd0) pl3d.update = upd0; // la de la clase vuelve a mandar
    pl3d = upd0 = null;
  }
  function enganchar() {
    if (enganchado) return; enganchado = true;
    modo0 = G.interaccion.modo; G.interaccion.modo = modo;
    if (G.dones) { sostener0 = G.dones.sostener; G.dones.sostener = sostenerDuelo; }
    addEventListener('keydown', tecla); envolverJugador();
    document.body.classList.add('v18-duelo-on');
  }
  function soltar() {
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    if (G.dones && G.dones.sostener === sostenerDuelo) G.dones.sostener = sostener0;
    removeEventListener('keydown', tecla); sost = 0; soltarJugador();
    document.body.classList.remove('v18-duelo-on');
  }

  // ---------- HUD ----------
  let hud = null;
  function estilo() {
    if (document.getElementById('v18-duelo-css')) return;
    const st = document.createElement('style'); st.id = 'v18-duelo-css';
    st.textContent = '#v18-duelo{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(380px,calc(100vw - 32px));z-index:40;font-family:Fredoka,system-ui,sans-serif;color:#fff8ea;pointer-events:none;text-shadow:0 1px 2px #0008}' +
      '#v18-duelo .vd-fila{display:flex;gap:8px;justify-content:space-between}' +
      '#v18-duelo .vd-lado{flex:1;background:rgba(30,40,30,.72);border-radius:12px;padding:6px 10px;min-width:0}' +
      '#v18-duelo .vd-lado.r{text-align:right}#v18-duelo .vd-nom{font-weight:600;font-size:14px}#v18-duelo .vd-pod{font-size:12px;opacity:.85}' +
      'body.v18-duelo-on #quest,body.v18-duelo-on #inv{visibility:hidden}' +
      // QA-166/167: en el escritorio el HUD va debajo del aviso (#toast, arriba al centro); en el móvil el minimapa tapaba las
      // plumas de la rival y el panel de fin pisaba el botón Diario (columna derecha): se oculta el minimapa durante el duelo
      // (vuelve al salir) y el panel deja libre esa columna.
      '@media (max-width:760px){#v18-duelo{top:calc(env(safe-area-inset-top,0px) + 66px)}body.v18-duelo-on #minimapa{visibility:hidden}#v18-duelo .vd-fin{margin-right:52px}}' +
      '#v18-duelo .vd-pl{display:flex;gap:3px;margin:3px 0}#v18-duelo .r .vd-pl{justify-content:flex-end}' +
      '#v18-duelo .vd-pl i{width:12px;height:18px;border-radius:12px 0 12px 0;background:#ffd27a;display:block;transform:rotate(20deg);transition:opacity .2s}' +
      '#v18-duelo .r .vd-pl i{background:#7fd3ff}#v18-duelo .vd-pl i.fuera{opacity:.18}' +
      '#v18-duelo .vd-en{height:6px;border-radius:3px;background:#0006;overflow:hidden}#v18-duelo .vd-en b{display:block;height:100%;background:#8fe08a;width:100%}' +
      '#v18-duelo .vd-en.pulso{outline:2px solid #ff9a7a}#v18-duelo .vd-et{font-size:10px;opacity:.75;margin-top:2px;line-height:1.2}' +
      '#v18-duelo .vd-pl i{width:14px;height:20px}' +
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
    el.innerHTML = `<div class="vd-fila"><div class="vd-lado j"><div class="vd-nom">${TXT.tu}</div><div class="vd-pod" data-k="pj"></div><div class="vd-pl" data-k="plj">${plumas()}</div><div class="vd-et">${TXT.energia}</div><div class="vd-en" data-k="en-j"><b></b></div></div>` +
      `<div class="vd-lado r"><div class="vd-nom">${TXT.rival}</div><div class="vd-pod" data-k="pr"></div><div class="vd-pl" data-k="plr">${plumas()}</div><div class="vd-et">${TXT.energia}</div><div class="vd-en" data-k="en-r"><b></b></div></div></div>` +
      `<div class="vd-centro" data-k="centro"></div>` +
      `<div class="vd-bot" data-k="bot"><button data-a="golpe_ala">${TXT.ala}</button><button data-a="semilla">${TXT.semilla}</button><button data-a="poder">${TXT.poder}</button></div>` +
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
  // Aviso del centro del HUD («¡Bloqueado!», «¡Interrumpida!»…). Frente A (5-nov): tras un golpe al escudo se quedaba
  // puesto; solo se borraba desde paso() y en fase de lucha o fin. Ahora también lo borra un reloj real y se limpia al
  // salir o reiniciar: nunca se queda fijo en pantalla.
  let centroT = 0, centroTO = 0;
  function flotante(t, s) {
    if (!hud) return;
    const el = hud.q('centro'); el.textContent = t; centroT = t ? (s || 0.8) : 0;
    clearTimeout(centroTO);
    if (t) centroTO = setTimeout(() => { if (hud && el.textContent === t && C.fase !== 'cuenta') { el.textContent = ''; centroT = 0; } }, (centroT + 0.5) * 1000);
  }
  function pintar() {
    if (!hud || !C.j) return;
    const pl = (k, f) => Array.from(hud.q(k).children).forEach((i, n) => i.classList.toggle('fuera', n >= f.plumas));
    pl('plj', C.j); pl('plr', C.r);
    hud.q('en-j').firstChild.style.width = Math.round(100 * C.j.energia / C.j.energiaMax) + '%';
    hud.q('en-r').firstChild.style.width = Math.round(100 * C.r.energia / C.r.energiaMax) + '%';
    const texto = (k, t) => { const e = hud.q(k); if (e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } }; // una vez: el traductor no pelea
    texto('pj', (H.get(C.j.poder) || {}).nombre || ''); texto('pr', (H.get(C.r.poder) || {}).nombre || '');
    for (const b of hud.q('bot').children) {
      const id = b.dataset.a === 'poder' ? C.j.poder : b.dataset.a;
      b.classList.toggle('cd', !H.listo(C.j, id).ok);
      if (b.dataset.a === 'poder') { const nom = (H.get(C.j.poder) || {}).nombre || TXT.poder; if (b.dataset.nom !== nom) { b.dataset.nom = nom; b.textContent = nom; } }
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
    semilla = o.semilla || 7; espForzada = o.especie || null;
    quitarBalas(); if (C.j && C.j.wob && pl3d && pl3d.root) { pl3d.root.rotation.z -= C.j.wob; C.j.wob = 0; }
    C.j = nuevoJugador(); const ch = C.ch; C.r = nuevoRival(); C.ch = ch;
    if (C.ch && C.chEsp !== C.r.especie) { try { C.ch.applyLook({ species: C.r.especie, accessories: { eyes: { id: 'gafas', color: '#7fd3ff' } } }); C.chEsp = C.r.especie; } catch (e) { /* piel */ } }
    C.timers.length = 0; C.resultado = null; C.premio = false;
    C.stats = nuevasStats();
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
    // La que se queda sin plumas se marea un rato, con estrellitas, y se sacude (nadie se hace daño)
    const perdedora = gano ? C.r : C.j; perdedora.finMareo = 2.2; perdedora.mareo = Math.max(perdedora.mareo, 2.2);
    if (gano) {
      const nueva = !!(G.v18 && G.v18.otorgar && G.v18.otorgar('combate_1', 'victoria_duelo', 1)); // marca idempotente: esta victoria ya pagó
      if (nueva) pagar();
      // el aviso dice para qué sirven: el puente (frente B), si todavía está roto; la guía al puente la pone ciclo.js
      const puenteListo = !!(G.v18 && G.v18.mundo && G.v18.mundo('puente_villa') === 'reparado');
      txt = nueva ? (puenteListo ? TXT.ganaGuarda : TXT.gana) : TXT.ganaOtra; C.premio = nueva;
      sonar('unlock'); fx('gold', C.r.pos.x, C.r.pos.y + 1.2, C.r.pos.z);
    } else { txt = TXT.pierde; C.premio = false; sonar('wrong'); }
    if (G.ui && G.ui.toast) G.ui.toast(txt, 3200);
    if (hud) { hud.q('finTxt').textContent = txt; hud.q('fin').hidden = false; hud.q('bot').hidden = true; flotante(gano ? TXT.ganaste : TXT.perdiste, 1.6); }
  }
  function pagar() {
    if (!S.inv) S.inv = {};
    for (const k in PREMIO) S.inv[k] = (S.inv[k] || 0) + PREMIO[k];
    try { if (G.objetos && G.objetos.renderInv) G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (G.guardado && G.guardado.save) G.guardado.save(true); else if (G.guardado && G.guardado.autosave) G.guardado.autosave(); } catch (e) { /* guardado */ } // QA-162: al momento
  }
  function otraVez() { return iniciar({}); }
  function salir(motivo) {
    if (C.fase === 'nada') return false;
    C.fase = 'nada'; quitarBalas(); C.timers.length = 0; soltar();
    if (hud) { flotante(''); hud.el.hidden = true; }
    rivalPos.x = sitio.x + 4; rivalPos.z = sitio.z; rivalPos.y = ALTURA(rivalPos);
    if (C.r) { C.r.mareo = 0; C.r.finMareo = 0; C.r.lift.t = C.r.lift.dura = 0; }
    if (motivo && G.ui && G.ui.toast) G.ui.toast(motivo, 2600);
    return true;
  }

  // ---------- IA de la rival ----------
  function pasoIA(dt) {
    const r = C.r, j = C.j;
    if (r.mareo > 0) return;
    const d = H.dirA(r, j), dist = d.d;
    r.golpeT -= dt; r.tiroT -= dt; r.esquivaT -= dt; r.poderT -= dt; r.pensar -= dt;
    // Defensa: una semilla del jugador que viene cerca → escudo (si es arausiaca y lo tiene) o un quiebro de lado
    const viene = C.balas.find(b => b.de === j && Math.hypot(b.m.position.x - r.pos.x, b.m.position.z - r.pos.z) < 5.5);
    if (viene && r.esquivaT <= 0 && !(r.marcada > 0)) {
      r.esquivaT = 2.4;
      if (r.poder === 'escudo_plumas' && r.escudo <= 0 && H.listo(r, 'escudo_plumas').ok && azar() < 0.55) { usar(r, 'escudo_plumas'); return; }
      if (azar() < 0.55) { r.lado = azar() < 0.5 ? -1 : 1; r.mov.x = -d.z * r.lado * 9; r.mov.z = d.x * r.lado * 9; r.mov.t = 0.28; C.stats.esquivas++; return; }
    }
    if (r.pensar > 0) return;
    r.pensar = 0.25;
    // Poder: el escudo cuando la tienes encima; el grito cuando estás delante y a tiro (sale hacia ti, que es adonde mira)
    if (r.poderT <= 0 && H.listo(r, r.poder).ok) {
      if (r.poder === 'escudo_plumas' && r.escudo <= 0 && dist < 2.8 && azar() < 0.3) { r.poderT = 3; usar(r, 'escudo_plumas'); return; }
      if (r.poder === 'grito_yunque' && dist > 2 && dist < 6 && azar() < 0.3) { r.poderT = 4; usar(r, 'grito_yunque'); return; }
    }
    if (dist < 2.3 && r.golpeT <= 0) { r.golpeT = 1.15; usar(r, 'golpe_ala'); return; }
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
    root.rotation.z = r.mareo > 0 ? Math.sin(now * (r.finMareo > 0 ? 9 : 14)) * (r.finMareo > 0 ? 0.32 : 0.25) : root.rotation.z * 0.8; // tambaleo del mareo
    if (r.finMareo > 0 && azar() < dt * 5) fx('gold', r.pos.x, r.pos.y + 1.8, r.pos.z); // estrellitas del mareo final
    const enAire = r.lift.dura > 0;
    Object.assign(ch, { speed: vel, gait: vel > 5 ? 1 : 0, airborne: enAire, flying: enAire, legsDown: enAire ? 0.6 : 1, swimming: false, diving: false,
      wingMode: r.alasT > 0 ? 'land' : enAire ? 'flap' : r.mov.t > 0 ? 'takeoff' : vel > 0.5 ? 'walk' : 'idle',
      expression: r.mareo > 0 ? 'surprised' : r.picoT > 0 ? 'fight' : 'happy',
      mouth: r.picoT > 0 ? boca(r) : null, lookAt: null,
      emote: null, posado: '', agachada: 0, groundY: ALTURA(r.pos), groundAt: null });
    try { ch.update(dt); } catch (e) { /* animación */ }
  }
  function pasoJugador(dt) {
    const j = C.j;
    if (j.kb.t > 0) { j.kb.t -= dt; S.pos.x += j.kb.x * dt; S.pos.z += j.kb.z * dt; j.kb.x *= 0.88; j.kb.z *= 0.88; }
    if (j.mareo > 0) { M.vx *= 0.8; M.vz *= 0.8; if (G.fx && G.fx.burst && azar() < dt * 6) fx('gold', S.pos.x, S.pos.y + 1.7, S.pos.z); }
  }
  function pasoBalas(dt) {
    for (let i = C.balas.length - 1; i >= 0; i--) {
      const b = C.balas[i], p = b.m.position;
      const blanco = b.de === C.j ? C.r : C.j;
      if (blanco.marcada > 0) { const hx = blanco.pos.x - p.x, hz = blanco.pos.z - p.z, hn = Math.hypot(hx, hz) || 1, v = Math.hypot(b.vx, b.vz), k = Math.min(1, dt * 6);
        b.vx += (hx / hn * v - b.vx) * k; b.vz += (hz / hn * v - b.vz) * k; } // Ojo del cenote: la semilla busca a la marcada
      b.t += dt; p.x += b.vx * dt; p.y += b.vy * dt; p.z += b.vz * dt;
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
      pasoEscudo(C.j, dt); pasoEscudo(C.r, dt);
      pasoJugador(dt);
      if (C.fase === 'lucha' && Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) > SALIDA_R) { salir(TXT.lejos); return; }
      if (Math.random() < dt * 4) pintar();
    } else if (C.fase === 'fin') {
      for (const f of [C.j, C.r]) if (f && f.finMareo > 0) { f.finMareo = Math.max(0, f.finMareo - dt); f.mareo = f.finMareo; }
      if (C.j && C.j.finMareo > 0) { M.vx *= 0.8; M.vz *= 0.8; if (azar() < dt * 5) fx('gold', S.pos.x, S.pos.y + 1.8, S.pos.z); }
      if (Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z) > SALIDA_R) { salir(); return; }
    }
    pasoOndas(dt);
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
    salir(); // la prueba empieza con la rival esperando, aunque hubiera un duelo abierto
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, fly0 = M.flying, inv0 = Object.assign({}, S.inv);
    const P = G.v18, crudo = (() => { try { return localStorage.getItem(P.clave()); } catch (e) { return null; } })();
    const evs = [], podEv = [];
    const oyente = e => { if (!oyente.mudo) evs.push(e); }; G.on('v18combate', oyente);
    const oyenteP = e => { if (!oyente.mudo) podEv.push(e); }; G.on('v18poder', oyenteP);
    const toasts = []; const toast0 = G.ui.toast; G.ui.toast = (t, ms) => { toasts.push(String(t)); return toast0.call(G.ui, t, ms); };
    const correr = (s, antes) => { for (let t = 0; t < s && C.fase === 'lucha'; t += 0.05) { if (antes) antes(); paso(0.05); } };
    const quieta = (dx) => { C.r.pos.x = S.pos.x + dx; C.r.pos.z = S.pos.z; C.r.pensar = 99; C.r.esquivaT = 99; C.r.poderT = 99; C.r.mov.t = 0; };
    const cara = (x) => { S.facing = { x, z: 0 }; };
    try {
      // 1. Poderes por especie y básicos
      const grito = H.get('grito_yunque'), esc = H.get('escudo_plumas');
      check('Vittata tiene Grito del Yunque (PICO) y arausiaca Escudo de plumas (PLUMAS)',
        H.poderDe('vittata') === 'grito_yunque' && H.poderDe('arausiaca') === 'escudo_plumas' && grito.tecnica === 'pico' && esc.tecnica === 'plumas', H.poderDe('vittata') + ' / ' + H.poderDe('arausiaca'));
      const basicos = H.lista().filter(h => h.basico).map(h => h.id).sort().join(',');
      check('Básicos de todas: solo golpe de ala y semilla (el grito ya no es básico)', basicos === 'golpe_ala,semilla' && !H.get('grito'), basicos);
      check('Cada poder es exclusivo y cuesta energía; con poca energía no sale', !H.listo(H.luchador({ especie: 'vittata' }), 'escudo_plumas').ok && grito.coste > 0 && esc.coste > 0 &&
        !H.listo(H.luchador({ especie: 'vittata', energia: 10 }), 'grito_yunque').ok && H.listo(H.luchador({ especie: 'vittata' }), 'grito_yunque').ok);
      const en = H.luchador({ especie: 'vittata', energia: 0 }); H.paso(en, 1);
      check('La energía se recarga sola', en.energia > 10 && en.energia <= en.energiaMax, en.energia);

      // 2. La rival en el mundo; el jugador usa el poder de su especie elegida
      await crearRival();
      check('La rival es una cotorra con otra piel en la explanada', !!C.ch && C.r.especie !== especieJugador() && C.ch.root.parent === scene, C.r.especie);
      check('Hablar con la Campeona de la Explanada abre el duelo', it.visible() && it.label() === TXT.retar);
      iniciar({ sinCuenta: true, especie: 'vittata' });
      check('Con Vittata: poder Grito del Yunque; la rival es arausiaca con Escudo de plumas', C.j.poder === 'grito_yunque' && C.r.especie === 'arausiaca' && C.r.poder === 'escudo_plumas', C.j.poder + ' / ' + C.r.poder);
      check('El duelo toma Acción e Impulso y muestra el HUD con 5 plumas por lado, energía aparte y sin botón de grito',
        G.interaccion.modo === modo && G.dones.sostener === sostenerDuelo && hud && !hud.el.hidden && hud.q('plj').children.length === 5 && hud.q('plr').children.length === 5 &&
        !!hud.q('en-j') && !hud.el.querySelector('[data-a="grito"]'));

      // 3. Grito del Yunque: empuja, interrumpe, sin quitar plumas; hay que apuntar; recuperación
      quieta(4); cara(1); C.r.escudo = 0; evs.length = 0; podEv.length = 0;
      const rg = usar(C.j, 'grito_yunque');
      const picoAbierto = C.j.picoT > 0;
      let bocaModelo = null;
      if (pl3d) { try { pl3d.update(0.016); bocaModelo = pl3d.mouth; } catch (e) { bocaModelo = 'error ' + e.message; } }
      correr(0.4, () => { C.r.pensar = Math.max(C.r.pensar, 0); });
      const kb = Math.hypot(C.r.kb.x, C.r.kb.z);
      check('Grito: abre el pico y emite v18poder { id, origen, direccion, alcance }', rg.ok && picoAbierto && (bocaModelo == null || bocaModelo > 0.3) &&
        podEv.some(e => e.id === 'grito_yunque' && e.origen && e.direccion && e.direccion.x > 0.9 && e.alcance === grito.alcance), JSON.stringify({ ok: rg.ok, boca: bocaModelo, ev: podEv[0] }));
      check('Grito: la onda empuja a la rival, la interrumpe y no le quita plumas', C.stats.ondas >= 1 && C.r.plumas === PLUMAS && (C.r.kb.t > 0 || C.r.pos.x - S.pos.x > 4.3) &&
        C.r.interrumpida > 0 && C.r.mareo > 0.5 && C.stats.interrupciones === 1 && !usar(C.r, 'golpe_ala').ok, JSON.stringify({ pl: C.r.plumas, kb, x: C.r.pos.x - S.pos.x, m: C.r.mareo }));
      check('Grito: tiene recuperación (no se repite enseguida)', !H.listo(C.j, 'grito_yunque').ok && H.listo(C.j, 'grito_yunque').motivo === 'espera');
      C.j.cd.grito_yunque = 0; C.j.energia = 100; C.r.mareo = 0; C.r.interrumpida = 0; C.r.kb.t = 0; quieta(4); cara(-1); const n0 = C.stats.interrupciones;
      usar(C.j, 'grito_yunque'); correr(0.5, () => { quieta(4); });
      check('Grito: hay que apuntar (mirando al otro lado no alcanza)', C.stats.interrupciones === n0 && C.r.mareo === 0);
      C.j.cd.grito_yunque = 0; C.j.energia = 100; quieta(11); cara(1);
      usar(C.j, 'grito_yunque'); correr(0.8, () => { quieta(11); });
      check('Grito: alcance limitado (a 11 m no llega)', C.stats.interrupciones === n0 && C.r.mareo === 0);

      // 4. Escudo de plumas (la rival arausiaca): para un golpe, reduce el grito, caduca
      iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(1.5); cara(1); podEv.length = 0;
      const re = usar(C.r, 'escudo_plumas');
      check('Escudo: abre las alas, plumas alrededor y emite v18poder', re.ok && C.r.escudo > 0 && C.r.alasT > 0 && !!C.r.escudoFx && podEv.some(e => e.id === 'escudo_plumas'));
      const ra = usar(C.j, 'golpe_ala');
      check('Escudo: bloquea un golpe de ala (sin quitar plumas) y se dispersa', ra.ok && !ra.acierto && C.r.plumas === PLUMAS && C.r.escudo === 0 && !C.r.escudoFx && C.stats.dispersiones >= 1,
        JSON.stringify({ pl: C.r.plumas, esc: C.r.escudo }));
      C.j.cd.golpe_ala = 0; C.r.inv = 0; quieta(1.5);
      const ra2 = usar(C.j, 'golpe_ala');
      check('Escudo: solo para UN ataque (el siguiente golpe sí quita pluma)', ra2.acierto && C.r.plumas === PLUMAS - 1);
      C.r.cd.escudo_plumas = 0; C.r.energia = 100; C.r.mareo = 0; C.r.inv = 0; C.r.kb.t = 0; quieta(3); C.j.cd.grito_yunque = 0; C.j.energia = 100;
      usar(C.r, 'escudo_plumas'); usar(C.j, 'grito_yunque'); while (C.timers.length) C.timers.shift().fn(); // la onda llega
      const kbR = Math.hypot(C.r.kb.x, C.r.kb.z);
      check('Escudo contra el grito: reduce el empujón y la interrupción sin anularlos', C.r.escudo === 0 && C.r.mareo > 0 && C.r.mareo < grito.interrumpe * 0.5 &&
        kbR > 0.5 && kbR < grito.empuje * 0.6, JSON.stringify({ m: C.r.mareo, kb: kbR.toFixed(2) }));
      C.r.cd.escudo_plumas = 0; C.r.energia = 100; C.r.mareo = 0; usar(C.r, 'escudo_plumas');
      correr(esc.dura + 0.3, () => { quieta(6); S.pos.x = sitio.x - 5; C.j.inv = 9; C.j.plumas = PLUMAS; });
      check('Escudo: caduca solo y se dispersa; nunca permanente (espera > duración)', C.r.escudo === 0 && !C.r.escudoFx && esc.cooldown > esc.dura);

      // 5. Con arausiaca elegida, el jugador tiene el escudo; la rival (Isleña) el grito
      iniciar({ sinCuenta: true, especie: 'arausiaca' });
      check('Con arausiaca: poder Escudo de plumas; la rival usa el Grito del Yunque', C.j.poder === 'escudo_plumas' && C.r.poder === 'grito_yunque' && usar(C.j, 'escudo_plumas').ok && C.j.escudo > 0);

      // 6. La IA se mueve, ataca, se defiende y reacciona a los impactos
      iniciar({ sinCuenta: true, especie: 'vittata' });
      const r0 = { x: C.r.pos.x, z: C.r.pos.z };
      correr(8, () => { S.pos.x = sitio.x - 5; S.pos.z = sitio.z; M.vx = M.vz = 0; C.j.plumas = PLUMAS; C.r.plumas = PLUMAS; C.j.inv = 0.5; if (C.j.cd.semilla <= 0 && C.j.energia > 40) usar(C.j, 'semilla'); });
      check('La IA se mueve hacia ti, ataca y se defiende', C.stats.movida > 2 && C.stats.ataques >= 1 && Math.hypot(C.r.pos.x - r0.x, C.r.pos.z - r0.z) > 1 && (C.stats.escudos + C.stats.esquivas) >= 1,
        JSON.stringify(C.stats));
      iniciar({ sinCuenta: true, especie: 'vittata' }); quieta(1.5); C.r.escudo = 0; evs.length = 0;
      const ru = usar(C.j, 'golpe_ala');
      check('Un golpe de ala quita una pluma, marea, empuja y la rival reacciona', ru.ok && ru.acierto && C.r.plumas === PLUMAS - 1 && C.r.mareo > 0 && C.r.kb.t > 0 && C.r.lift.dura > 0 && C.stats.reacciones >= 1,
        JSON.stringify({ ok: ru.ok, pl: C.r.plumas, mareo: C.r.mareo }));
      check('Emite hit y damage', evs.some(e => e.tipo === 'hit' && e.de === 'jugador' && e.valor === 1) && evs.some(e => e.tipo === 'damage' && e.a === 'rival' && e.valor === PLUMAS - 1));
      check('El HUD muestra las plumas que quedan', hud.q('plr').querySelectorAll('i.fuera').length === 1);
      C.r.mareo = 0; C.r.inv = 0; quieta(7); cara(1);
      const plS = C.r.plumas; usar(C.j, 'semilla');
      correr(1.2, () => { quieta(7); });
      check('La semilla vuela y pega a distancia', C.r.plumas === plS - 1, C.r.plumas);

      // 7. Victoria: 2 maderas y 1 piedra del inventario del juego, una sola vez
      P.borrar(); const m0 = S.inv.madera || 0, p0 = S.inv.piedra || 0;
      iniciar({ sinCuenta: true, especie: 'vittata' }); C.r.plumas = 1; quieta(1.2); C.r.escudo = 0; evs.length = 0; toasts.length = 0;
      usar(C.j, 'golpe_ala');
      check('Sin plumas, la rival se marea: victoria con 2 maderas y 1 piedra', C.fase === 'fin' && C.resultado === 'win' && S.inv.madera === m0 + 2 && S.inv.piedra === p0 + 1 &&
        evs.some(e => e.tipo === 'win') && toasts.includes(TXT.gana) && C.r.finMareo > 0 && P.cuantos('pluma_rival') === 0,
        JSON.stringify({ fase: C.fase, m: S.inv.madera - m0, p: S.inv.piedra - p0, t: toasts }));
      check('Al terminar, Acción dice «Otra vez»', modo.verbo === TXT.otra && !hud.q('fin').hidden);
      modo.accion();
      check('«Otra vez» reinicia el duelo con 5 plumas', C.fase === 'cuenta' && C.r.plumas === PLUMAS && C.j.plumas === PLUMAS);
      C.fase = 'lucha'; C.r.plumas = 1; quieta(1.2); C.r.escudo = 0; usar(C.j, 'golpe_ala');
      check('Ganar otra vez no da los materiales de nuevo', C.resultado === 'win' && S.inv.madera === m0 + 2 && S.inv.piedra === p0 + 1 && toasts.includes(TXT.ganaOtra), S.inv.madera - m0);
      P.recargar();
      check('Tras recargar, la victoria sigue marcada como pagada', !P.otorgar('combate_1', 'victoria_duelo', 1));
      // 8. Derrota: mareo divertido, sin recompensa
      P.borrar(); const m1 = S.inv.madera;
      iniciar({ sinCuenta: true, especie: 'vittata' }); C.j.plumas = 1; C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; C.r.golpeT = 0; C.r.pensar = 0; C.r.mareo = 0; C.r.poderT = 99; evs.length = 0;
      correr(3, () => { C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; C.r.poderT = 99; });
      check('Si te quedas sin plumas: mareo breve, fin y sin recompensa', C.resultado === 'loss' && C.j.finMareo > 0 && S.inv.madera === m1 && evs.some(e => e.tipo === 'loss') && !evs.some(e => e.tipo === 'win'),
        JSON.stringify({ res: C.resultado, plj: C.j.plumas, fm: C.j.finMareo }));
      for (let i = 0; i < 60; i++) paso(0.05);
      check('El mareo final se pasa solo', C.j.finMareo === 0 && C.fase === 'fin');
      salir();
      check('Al salir se devuelven Acción, Impulso y el modelo de Vittata', G.interaccion.modo !== modo && G.dones.sostener !== sostenerDuelo && hud.el.hidden && !pl3d &&
        !(G.actores && G.actores.player3D && Object.prototype.hasOwnProperty.call(G.actores.player3D, 'update')) && !scene.getObjectByName('v18_escudo') && !scene.getObjectByName('v18_onda'));
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    try { salir(); } catch (e) { /* ya fuera */ }
    G.ui.toast = toast0;
    oyente.mudo = true; evs.length = 0; podEv.length = 0; // G.on no tiene «off»: los oyentes de la prueba se quedan mudos
    Object.assign(S.pos, pos0); S.facing = fac0; M.flying = fly0; M.vx = M.vz = 0;
    for (const k of Object.keys(S.inv)) if (!(k in inv0)) delete S.inv[k];
    Object.assign(S.inv, inv0); try { if (G.objetos && G.objetos.renderInv) G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (crudo == null) localStorage.removeItem(P.clave()); else localStorage.setItem(P.clave(), crudo); } catch (e) { /* sin almacenamiento */ }
    P.recargar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  G.v18combate = { sitio, iniciar, salir, otraVez, usar, paso, estado: () => C, test };
  return G.v18combate;
};
