/* Juego · D14 · «Planeo entre nubes» (minijuego corto de «Más juegos», hasta 2 minutos). Lista larga D14 (docs/equipo/TAREAS_WEB.md).
   Llega lo más lejos posible planeando, sin tocar el suelo ni el agua. Sin anillos, sin rivales y sin ruta: distancia libre.
   Salida: en el aire sobre la cumbre de El Yunque (POI «cumbre», el punto más alto del mapa; si no está, lo más alto cerca de Vittata),
   mirando hacia Villa Raíz. Vittata planea sola (no se queda cernida: siempre lleva al menos VMIN m/s) y pierde HUNDE m por segundo.
   Dirección: el joystick o las flechas, como siempre. Picada (C o el botón Bajar): baja deprisa y va más rápido (para alcanzar una
   nube de abajo); gasta altura, así que no alarga el vuelo. Subir, el impulso, aterrizar y Acción no hacen nada aquí: machacar no sirve.
   Dan altura:
   - Nubes de corriente (el mismo dibujo que las de la «Carrera de las nubes» de retos.js: bolas blancas instanciadas, nunca un aro):
     cruzar una da un empujón hacia arriba (NUBE_V m/s durante NUBE_T s), una vez por nube; luego se queda gris.
   - Corrientes térmicas sobre tierra (una columna dorada suave y motas que suben): dentro, sube TERM_V m/s mientras le quede fuerza
     (TERM_CARGA s por corriente; se apaga al gastarse). Se aprovecha dando vueltas dentro.
   Tocar suelo, tejado o agua termina; a los 2 minutos también. El récord es la distancia en línea recta desde la salida (m).
   La flecha y el minimapa (minimapa.js objetivo()) señalan la ayuda más cercana que se puede alcanzar por delante.
   Física: solo se ajusta mientras se juega y se devuelve al salir (TUNING.climbV, glideSink y flyCeil; nada de retos.js ni del vuelo
   del mundo). El hundimiento, las nubes y las corrientes se aplican aquí, después de G.fisica.step (renderer.js: step y luego 'update').
   Mallas: 3 instanciadas (bolas de nube, columnas y motas) con grupos fijos y vectores reutilizados: nada se crea por cuadro. Al salir
   se suelta todo (dispose de geometrías, materiales e InstancedMesh) y Vittata vuelve a donde estaba.
   Mientras se juega la música del mundo calla (musica.js lee body.planeo-on) y los avisos de la historia esperan (G.menuModos.ocupado()).
   El panel final es modal: congela el mundo (G.pausa 'planeo') y no deja pasar teclas. «Reducir movimiento»: sin motas; los avisos
   importantes (suelo cerca, tiempo, final) también suenan. Sonidos que ya existen: boton, ring, aleteo, aviso, frenada, panel_final, logro.
   Récord en este dispositivo (localStorage, <almacen>.planeo = { v: 1, mejor (m), nubes, jugadas }); lo lee «Mis récords».
   Naturaleza: ningún dato nuevo (las corrientes que suben son un recurso de juego).
   API: window.AVPlaneo(G) → G.planeoApi = { jugar, salir, activo, paso, estado, objetivo, test }. Prueba: AV.planeoTest(). */
window.AVPlaneo = function (G) {
  'use strict';
  if (G.planeoApi) return G.planeoApi;
  const S = G.S, R = G.renderer;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -1e9; return w > -1e8 ? w : -Infinity; };
  const tierra = (x, z, y) => { let g = H(x, z); try { if (G.fisica && G.fisica.suelo) g = Math.max(g, G.fisica.suelo(x, z, y)); } catch (e) { /* solo el terreno */ } return g > -1e8 ? g : -Infinity; };
  const superficie = (x, z, y) => Math.max(tierra(x, z, y), nivelAgua(x, z)); // suelo, tejado o agua bajo (x, y, z)
  const MV = () => (G.fisica && G.fisica.MOVE) || {};
  const TU = () => (G.fisica && G.fisica.TUNING) || null;
  const ALM = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.planeo';
  const DUR = 120, HUNDE = 2.4, VMIN = 10, VPICADA = 16, ALTO_INI = 16, TOCA = 0.35, CERCA_SUELO = 5, LEJOS_SUELO = 9, TOQUE_T = 0.9;
  const NNUB = 16, NUBE_V = 9, NUBE_T = 0.9, NUBE_RX = 5, NUBE_RY = 3.4, NUBE_SEP = 16;
  const NTER = 10, TERM_R = 6, TERM_ALTO = 55, TERM_V = 5.2, TERM_CARGA = 3.5, NMOTA = 8;
  const AJ_FIS = { climbV: 0, glideSink: 0, flyCeil: 60 }; // subir no sube y el hundimiento lo pone este juego; techo más alto (las corrientes suben)
  const SALIDAS = ['cumbre', 'picachos', 'mirador'], HACIA = ['plaza', 'villa'];
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const html = document.documentElement;
  const reducido = () => html.classList.contains('mov-reducido') || !!(R && R.REDUCED);
  const reloj = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor < 100000 ? d : null; } catch (e) { return null; } };
  const guardarRec = () => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor: E.mejor, nubes: E.mejorNubes, jugadas: E.jugadas })); } catch (e) { /* sin almacén */ } };
  const sonar = (n, a) => { try { if (!G.quiet && G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  let azarS = 0; const azar = () => { if (!azarS) return Math.random(); azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };
  const rnd = (a, b) => a + azar() * (b - a);

  // ---------- Estado (grupos fijos, sin asignaciones por cuadro) ----------
  const nubes = []; for (let i = 0; i < NNUB; i++) nubes.push({ on: false, x: 0, y: 0, z: 0, giro: 0, usada: false });
  const terms = []; for (let i = 0; i < NTER; i++) terms.push({ on: false, x: 0, y: 0, z: 0, carga: TERM_CARGA, pint: -1, dentro: false });
  const salida = { x: 0, y: 0, z: 0, fx: 0, fz: 1, ancla: '' };
  const guia = { x: 0, y: 0, z: 0, ok: false };
  const vuelta = { x: 0, y: 0, z: 0, fx: 0, fz: 1, ok: false }; // dónde estaba Vittata antes de jugar (vuelve al salir)
  let fis0 = null; // la física de antes (se devuelve al salir)
  const E = { fase: 'nada', t: 0, lejos: 0, dist: 0, alto: 0, subeT: 0, nubesN: 0, termsN: 0, motivo: '', toqueT: 0, msgT: 0, avisos: 0, cerca: false, centena: 0,
    guiaT: 0, primeraTerm: true, mejor: 0, mejorNubes: 0, jugadas: 0, nuevo: false, finP: 0, motasPint: 0, hondo: 9 };
  const restante = () => Math.max(0, DUR - E.t);

  // ---------- Mallas (se crean al jugar y se sueltan al salir) ----------
  // La nube: el mismo dibujo que las de la «Carrera de las nubes» (retos.js, BOLAS_NUBE: 7 bolas suaves de icosaedro, sin tocar retos.js)
  const BOLAS_NUBE = [[0, 0, 0, 2.7, 2.0], [2.3, -0.3, 0.4, 2.0, 1.5], [-2.4, -0.2, -0.3, 2.1, 1.6], [0.9, 0.9, -1.4, 1.8, 1.5], [-1.0, 0.8, 1.5, 1.7, 1.4], [3.6, -0.6, -0.8, 1.3, 1.0], [-3.7, -0.7, 0.9, 1.3, 1.0]];
  const COL_NUBE = new THREE.Color('#ffffff'), COL_USADA = new THREE.Color('#aeb8c6'), COL_TERM = new THREE.Color('#ffd98a'), colTmp = new THREE.Color();
  let M = null;
  const dummy = new THREE.Object3D();
  function geoColumna() { // cilindro abierto: dorado abajo y negro arriba (con mezcla aditiva, negro = nada): se desvanece hacia el cielo
    const g = new THREE.CylinderGeometry(1, 1, 1, 24, 6, true); g.translate(0, 0.5, 0);
    const p = g.attributes.position, c = [];
    for (let i = 0; i < p.count; i++) { const k = Math.pow(1 - p.getY(i), 1.6) * 0.5; c.push(k, k * 0.86, k * 0.55); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    return g;
  }
  function crearMallas() {
    if (M) return;
    const inst = (geo, mat, n, nombre, color) => { const m = new THREE.InstancedMesh(geo, mat, n); if (color) m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); /* de su tamaño entero (setColorAt lo crearía del tamaño de count) */ m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.userData.sinCulling = true; m.name = 'planeo:' + nombre; R.scene.add(m); return m; };
    M = {};
    const matN = R.linMat(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#6d7f99', transparent: true, opacity: 1 }));
    M.nubes = inst(new THREE.IcosahedronGeometry(1, 3), matN, NNUB * BOLAS_NUBE.length, 'nubes', true); // blancas; grises las usadas
    const matC = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
    M.columnas = inst(geoColumna(), matC, NTER, 'columnas', true); M.columnas.renderOrder = 3; // más tenue al gastarse
    const matM = R.linMat(new THREE.MeshLambertMaterial({ color: '#fff1c4', emissive: '#c99a3a', emissiveIntensity: 0.6 }));
    M.motas = inst(new THREE.OctahedronGeometry(0.22, 0), matM, NTER * NMOTA, 'motas');
    M.motas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  function soltarMallas() {
    if (!M) return;
    for (const k in M) { const m = M[k]; R.scene.remove(m); m.dispose(); m.geometry.dispose(); m.material.dispose(); } // InstancedMesh.dispose(): sus búferes de la GPU
    M = null;
  }
  function pintarNubes() { // solo al empezar y cuando una nube se usa (no cada cuadro)
    if (!M) return;
    let k = 0;
    for (const n of nubes) {
      if (!n.on) continue;
      const c = Math.cos(n.giro), s = Math.sin(n.giro);
      for (const b of BOLAS_NUBE) {
        dummy.position.set(n.x + b[0] * c + b[2] * s, n.y + b[1], n.z - b[0] * s + b[2] * c); dummy.rotation.set(0, n.giro, 0); dummy.scale.set(b[3], b[4], b[3] * 0.9); dummy.updateMatrix();
        M.nubes.setMatrixAt(k, dummy.matrix); M.nubes.setColorAt(k, n.usada ? COL_USADA : COL_NUBE); k++;
      }
    }
    M.nubes.count = k; M.nubes.visible = k > 0; M.nubes.instanceMatrix.needsUpdate = true; if (M.nubes.instanceColor) M.nubes.instanceColor.needsUpdate = true;
  }
  function pintarColumnas() { // al empezar y cuando la fuerza de una corriente cambia de escalón
    if (!M) return;
    let k = 0;
    for (const t of terms) {
      if (!t.on) continue;
      dummy.position.set(t.x, t.y, t.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(TERM_R, TERM_ALTO, TERM_R); dummy.updateMatrix();
      M.columnas.setMatrixAt(k, dummy.matrix); colTmp.copy(COL_TERM).multiplyScalar(0.15 + 0.85 * t.carga / TERM_CARGA); M.columnas.setColorAt(k, colTmp); k++;
    }
    M.columnas.count = k; M.columnas.visible = k > 0; M.columnas.instanceMatrix.needsUpdate = true; if (M.columnas.instanceColor) M.columnas.instanceColor.needsUpdate = true;
  }
  function pintarMotas() { // motas que suben en espiral dentro de las corrientes con fuerza (con «Reducir movimiento», ninguna)
    if (!M) return;
    let k = 0;
    if (!reducido() && E.fase !== 'nada') for (let j = 0; j < NTER; j++) {
      const t = terms[j]; if (!t.on || t.carga <= 0) continue;
      for (let i = 0; i < NMOTA; i++) {
        const f = ((E.t * 0.09 + i / NMOTA + j * 0.13) % 1), a = i * 2.39996 + E.t * 1.3 + j, r = TERM_R * (0.35 + 0.5 * ((i * 0.618034) % 1));
        dummy.position.set(t.x + Math.cos(a) * r, t.y + 2 + f * (TERM_ALTO - 8), t.z + Math.sin(a) * r); dummy.rotation.set(a, a * 0.7, 0); dummy.scale.setScalar(0.6 + 0.8 * Math.sin(f * Math.PI)); dummy.updateMatrix();
        M.motas.setMatrixAt(k++, dummy.matrix);
      }
    }
    M.motas.count = k; M.motas.visible = k > 0; if (k) { M.motas.instanceMatrix.needsUpdate = true; E.motasPint++; }
  }

  // ---------- Salida, nubes y corrientes (siempre sobre lo que ya existe; ningún edificio ni modelo nuevo) ----------
  const poi = id => { try { const T = G.terreno; return T && T.poi ? T.poi(id) : null; } catch (e) { return null; } };
  const mojado = (x, z) => nivelAgua(x, z) > H(x, z) - 0.05;
  function techoEn(x, z, r) { // lo más alto (suelo, tejado o agua) en el centro y a r m alrededor
    let m = superficie(x, z, 400);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; m = Math.max(m, superficie(x + Math.cos(a) * r, z + Math.sin(a) * r, 400)); }
    return m;
  }
  function elegirSalida() {
    let a = null; salida.ancla = 'alto';
    for (const id of SALIDAS) { a = poi(id); if (a && H(a.x, a.z) > -1e8) { salida.ancla = id; break; } a = null; }
    let x = a ? a.x : S.pos.x, z = a ? a.z : S.pos.z;
    if (!a) { let bh = H(x, z); const x0 = x, z0 = z; for (let ix = -200; ix <= 200; ix += 20) for (let iz = -200; iz <= 200; iz += 20) { const h = H(x0 + ix, z0 + iz); if (h > bh) { bh = h; x = x0 + ix; z = z0 + iz; } } } // lo más alto cerca
    let h = null; for (const id of HACIA) { h = poi(id); if (h) break; }
    let fx = h ? h.x - x : 0, fz = h ? h.z - z : 1, d = Math.hypot(fx, fz);
    if (d < 1) { const f = S.facing || { x: 0, z: 1 }; fx = f.x; fz = f.z; d = Math.hypot(fx, fz) || 1; }
    salida.x = x; salida.z = z; salida.fx = fx / d; salida.fz = fz / d; salida.y = techoEn(x, z, 8) + ALTO_INI;
  }
  function ponerNubes() {
    const ang0 = Math.atan2(salida.fz, salida.fx);
    let k = 0;
    for (let i = 0; i < NNUB; i++) {
      const n = nubes[i]; n.on = false; n.usada = false; n.giro = i * 1.7;
      for (let r = 0; r < 12 && !n.on; r++) {
        const d = 45 + i * 26 + rnd(-6, 6), lado = i % 2 ? 1 : -1, a = ang0 + lado * rnd(0.1, r < 6 ? 1.1 : 1.6);
        const x = salida.x + Math.cos(a) * d, z = salida.z + Math.sin(a) * d;
        let sep = true; for (let j = 0; j < i; j++) { const o = nubes[j]; if (o.on && Math.hypot(o.x - x, o.z - z) < NUBE_SEP) { sep = false; break; } }
        if (!sep) continue;
        const suelo = techoEn(x, z, 6); if (!(suelo > -1e8)) continue;
        // a la altura del planeo recto, más un poco por cada nube anterior (si se cogen la mitad, se llega a las siguientes)
        let y = salida.y - d / 12 * HUNDE + i * 0.5 * NUBE_V * NUBE_T + rnd(-2, 2);
        y = Math.min(Math.max(y, suelo + 9), suelo + 45);
        n.on = true; n.x = x; n.y = y; n.z = z; k++;
      }
    }
    return k;
  }
  function ponerCorrientes() {
    const ang0 = Math.atan2(salida.fz, salida.fx);
    let k = 0;
    for (let i = 0; i < NTER; i++) {
      const t = terms[i]; t.on = false; t.carga = TERM_CARGA; t.pint = -1; t.dentro = false;
      for (let r = 0; r < 14 && !t.on; r++) {
        const d = 70 + i * 40 + rnd(-10, 10), a = ang0 + rnd(-1.4, 1.4), x = salida.x + Math.cos(a) * d, z = salida.z + Math.sin(a) * d;
        const g = H(x, z); if (!(g > -1e8) || mojado(x, z)) continue; // solo sobre tierra
        let seco = true; for (let j = 0; j < 6; j++) { const b = j * Math.PI / 3; if (mojado(x + Math.cos(b) * TERM_R, z + Math.sin(b) * TERM_R)) { seco = false; break; } }
        if (!seco) continue;
        let sep = true; for (let j = 0; j < i; j++) { const o = terms[j]; if (o.on && Math.hypot(o.x - x, o.z - z) < 30) { sep = false; break; } }
        if (!sep) continue;
        t.on = true; t.x = x; t.z = z; t.y = g; k++;
      }
    }
    return k;
  }
  function colocarVittata() {
    const Mv = G.fisica && G.fisica.MOVE;
    S.pos.x = salida.x; S.pos.z = salida.z; S.pos.y = salida.y; S.vy = 0;
    S.facing = { x: salida.fx, z: salida.fz };
    if (Mv) { Mv.vx = salida.fx * 12; Mv.vz = salida.fz * 12; Mv.swimming = false; Mv.landing = false; Mv.jumping = false; Mv.grounded = false; Mv.takeoff = 0; if (!Mv.flying) { Mv.flying = true; try { G.emit('vuelo', true); } catch (e) { /* */ } } }
    try { if (G.camara) { G.camara.yaw = Math.atan2(-salida.fx, -salida.fz); if (G.camara.manual) G.camara.manual(); } } catch (e) { /* sin cámara */ }
  }
  function ajustarFisica(on) { // solo mientras se juega; al salir, lo de antes
    const T = TU(); if (!T) return;
    if (on) { if (!fis0) { fis0 = {}; for (const k in AJ_FIS) fis0[k] = T[k]; } for (const k in AJ_FIS) T[k] = AJ_FIS[k]; }
    else if (fis0) { for (const k in fis0) T[k] = fis0[k]; fis0 = null; }
  }

  // ---------- Paso (después de G.fisica.step) ----------
  function paso(dt) {
    if (!(dt > 0)) return;
    if (E.fase === 'toque') { if ((E.toqueT -= dt) <= 0) mostrarFin(); return; }
    if (E.fase !== 'juego') return;
    const m = MV();
    E.t += dt;
    if (E.msgT > 0 && (E.msgT -= dt) <= 0 && hudEl) { const q0 = q(hudEl, 'msg'); q0.textContent = ''; q0.className = ''; }
    // nada de aterrizar, impulso ni subir: solo planear (cada cuadro, por si otro módulo lo cambió mientras tanto)
    const T = TU(); if (T) for (const k in AJ_FIS) if (T[k] !== AJ_FIS[k]) T[k] = AJ_FIS[k];
    if (m.landing) m.landing = false;
    if (!m.picando && S.vy < 0) S.vy = 0; // la bajada la pone este juego (salvo la picada): un toque de aterrizar no la hunde
    m.dashCd = Math.max(m.dashCd || 0, 0.5); m.dashT = 0;
    if (!m.flying && !m.swimming && E.alto > TOCA + 0.5) { m.flying = true; m.takeoff = 0; } // algo la bajó del vuelo en el aire: sigue planeando
    // siempre avanza: un planeador no se queda cernido (en picada, más rápido)
    const vmin = m.picando ? VPICADA : VMIN, hs = Math.hypot(m.vx || 0, m.vz || 0);
    if (hs < vmin) { if (hs > 0.5) { m.vx *= vmin / hs; m.vz *= vmin / hs; } else { const f = S.facing || salida; m.vx = f.x * vmin; m.vz = f.z * vmin; } }
    // altura: pierde HUNDE m/s; las nubes y las corrientes la devuelven
    let sube = -HUNDE;
    if (E.subeT > 0) { E.subeT -= dt; sube += NUBE_V; }
    let hondo = 9;
    for (const n of nubes) {
      if (!n.on) continue;
      const dx = (S.pos.x - n.x) / NUBE_RX, dy = (S.pos.y - n.y) / NUBE_RY, dz = (S.pos.z - n.z) / NUBE_RX, h = dx * dx + dy * dy + dz * dz;
      if (h < hondo) hondo = h;
      if (!n.usada && h < 1) { n.usada = true; E.nubesN++; E.subeT = NUBE_T; sonar('ring', Math.min(8, E.nubesN)); aviso(L('¡Nube! Más altura', 'Cloud boost!'), 'oro'); pintarNubes(); pintarHud(); }
    }
    if (M) { const op = hondo < 1.8 ? 0.5 : 1; if (M.nubes.material.opacity !== op) M.nubes.material.opacity = op; } // dentro de una nube, se aclara (Vittata no desaparece)
    E.hondo = hondo;
    let enTerm = false;
    for (const t of terms) {
      if (!t.on) continue;
      const dentro = Math.hypot(S.pos.x - t.x, S.pos.z - t.z) < TERM_R && S.pos.y < t.y + TERM_ALTO && t.carga > 0;
      if (dentro && !t.dentro) { E.termsN++; sonar('aleteo'); aviso(E.primeraTerm ? L('¡Corriente! Da vueltas dentro para subir', 'Updraft! Circle inside to rise') : L('¡Corriente!', 'Updraft!'), 'bien'); E.primeraTerm = false; pintarHud(); }
      t.dentro = dentro;
      if (dentro) { enTerm = true; sube += TERM_V; t.carga = Math.max(0, t.carga - dt); const p = Math.ceil(t.carga / TERM_CARGA * 8); if (p !== t.pint) { t.pint = p; pintarColumnas(); } }
    }
    S.pos.y += sube * dt;
    // ¿toca? suelo, tejado o agua
    const sup = superficie(S.pos.x, S.pos.z, S.pos.y + 0.3);
    if (!(sup > -1e8)) { fin('agua'); return; } // fuera del mapa: mar abierto
    E.alto = S.pos.y - sup;
    E.dist = Math.hypot(S.pos.x - salida.x, S.pos.z - salida.z); if (E.dist > E.lejos) E.lejos = E.dist;
    if (E.lejos >= (E.centena + 1) * 100) { E.centena = Math.floor(E.lejos / 100); if (!enTerm && E.subeT <= 0) aviso(L(`¡${E.centena * 100} m!`, `${E.centena * 100} m!`), 'oro'); sonar('boton'); }
    if (E.alto < CERCA_SUELO && !E.cerca) { E.cerca = true; sonar('aviso'); aviso(L('¡Cuidado, el suelo! Busca una nube o una corriente', 'Watch the ground! Find a cloud or an updraft'), 'malo'); }
    else if (E.alto > LEJOS_SUELO) E.cerca = false;
    const r = restante();
    if (E.avisos === 0 && r <= 10) { E.avisos = 1; sonar('aviso'); }
    if (E.avisos === 1 && r <= 5) { E.avisos = 2; sonar('aviso'); }
    if ((E.guiaT -= dt) <= 0) { E.guiaT = 0.25; apuntarGuia(); }
    pintarMotas();
    if (E.alto <= TOCA || m.swimming || (!m.flying && E.alto <= TOCA + 0.5)) { fin(nivelAgua(S.pos.x, S.pos.z) >= sup - 0.01 ? 'agua' : 'suelo'); return; }
    if (r <= 0) { fin('tiempo'); return; }
    if (hudEl && Math.floor((E.t - dt) * 4) !== Math.floor(E.t * 4)) pintarHud();
  }
  // La ayuda más cercana por delante que todavía se puede alcanzar planeando (la misma para la flecha y el minimapa)
  function apuntarGuia() {
    guia.ok = false;
    if (E.fase !== 'juego') return;
    const m = MV(), v = Math.hypot(m.vx || 0, m.vz || 0) || 1, ux = (m.vx || 0) / v, uz = (m.vz || 0) / v;
    let bd = 170;
    const mira = (x, y, z, ok) => {
      const dx = x - S.pos.x, dz = z - S.pos.z, d = Math.hypot(dx, dz);
      if (d < 4 || d > bd || (dx * ux + dz * uz) / d < 0.25) return;
      if (S.pos.y - d / VMIN * HUNDE < ok) return; // no se llega planeando
      bd = d; guia.x = x; guia.y = y; guia.z = z; guia.ok = true;
    };
    for (const n of nubes) if (n.on && !n.usada) mira(n.x, n.y, n.z, n.y - NUBE_RY);
    for (const t of terms) if (t.on && t.carga > TERM_CARGA * 0.3) mira(t.x, Math.min(S.pos.y, t.y + TERM_ALTO * 0.5), t.z, t.y + 2);
  }
  G.on('update', (dt, busy) => { if (!G.quiet && !busy) paso(Math.min(0.05, dt || 0)); });
  const guiar = () => {
    verHud(); if (!G.fx || !G.fx.guide) return;
    if (E.fase === 'juego') G.fx.guide(guia.ok ? guia : null, performance.now() / 1000); else if (E.fase === 'toque' || E.fase === 'fin') G.fx.guide(null, performance.now() / 1000);
  };
  G.on('render', guiar, 61); // después de misiones.js (60): la flecha va a la ayuda de delante (o a ninguna), no a la historia
  G.on('pausa', () => verHud());

  // ---------- Acción: aquí no hace nada (machacar no sirve) ----------
  const MODO = { activo: () => E.fase === 'juego', accion: () => false, aviso: () => '', get verbo() { return L('Planea', 'Glide'); } };
  let modo0 = null;

  // ---------- HUD y panel final ----------
  let hudEl = null, finEl = null;
  const FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15c5-1 9-4 13-9l-1 5 6-2-8 9-1-4c-3 2-6 2-9 1z" fill="#ffd98a"/></svg>';
  const ALTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l5 6h-3v6h-4V9H7z" fill="#bfe7ff"/><path d="M3 20q4-4 9-2t9-1v3H3z" fill="#5fae4a"/></svg>';
  function css() {
    if (document.getElementById('pln-css')) return;
    const st = document.createElement('style'); st.id = 'pln-css';
    st.textContent = '#pln-hud{position:fixed;left:12px;right:12px;margin-inline:auto;width:fit-content;max-width:calc(100vw - 24px);top:calc(env(safe-area-inset-top,0px) + 10px);z-index:60;display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;justify-content:center;box-sizing:border-box;padding:6px 8px 6px 14px;border-radius:20px;background:rgba(16,36,52,.86);color:#fff8e6;font:600 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}#pln-hud[hidden],#pln-fin[hidden]{display:none}' +
      '#pln-hud .pln-tit:empty{display:none}#pln-hud .pln-t{font-variant-numeric:tabular-nums;font-size:18px;font-weight:700;min-width:3.2ch;text-align:center}#pln-hud .pln-t.poco{color:#ffb4a2}' +
      '#pln-hud .pln-d,#pln-hud .pln-h{display:flex;align-items:center;gap:3px;font-weight:700;font-variant-numeric:tabular-nums}#pln-hud .pln-d{font-size:20px}#pln-hud .pln-h{font-size:15px;opacity:.92}#pln-hud .pln-h.bajo{color:#ffb4a2;opacity:1}#pln-hud svg{width:22px;height:22px}#pln-hud .pln-h svg{width:18px;height:18px}' +
      '#pln-hud .pln-r:empty{display:none}#pln-hud .pln-r{opacity:.85;font-size:14px}' +
      '#pln-hud [data-k="msg"]{position:absolute;left:50%;top:calc(100% + 72px);transform:translateX(-50%);width:max-content;max-width:min(560px,calc(100vw - 24px));box-sizing:border-box;text-align:center;line-height:1.25;padding:4px 12px;border-radius:999px;font-weight:700;pointer-events:none;background:#fff3d6;color:#3b2a14}#pln-hud [data-k="msg"]:empty{display:none}#pln-hud [data-k="msg"].oro{background:#ffd23f}#pln-hud [data-k="msg"].malo{background:#ffd0c4;color:#5a1e10}#pln-hud [data-k="msg"].bien{background:#c8f0c0;color:#173d12}' +
      '#pln-hud button,#pln-fin button{min-height:44px;min-width:44px;padding:4px 16px;border-radius:22px;border:0;font:700 16px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}#pln-fin button{min-height:54px;padding:4px 22px;font-size:18px}#pln-hud button.salir,#pln-fin button.salir{background:#ffd0c4}#pln-hud button:focus-visible,#pln-fin button:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}' +
      '#pln-fin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border-radius:24px;background:rgba(16,36,52,.93);color:#fff8e6;font-family:Fredoka,system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;gap:8px}#pln-fin:focus{outline:none}' +
      '#pln-fin h2{margin:0;font-size:26px}#pln-fin .pln-gran{display:flex;align-items:center;gap:8px;font-size:44px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}#pln-fin .pln-gran svg{width:44px;height:44px}#pln-fin p{margin:0;font-size:17px;font-weight:600}#pln-fin .pln-det{font-size:15px;opacity:.85;font-weight:500}#pln-fin .pln-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}' +
      // el aviso va bajo la fila de botones de arriba (Diario, Gestos, Nido…); en el teléfono de pie esa fila va al lado, así que sube
      '@media (max-width:600px){#pln-hud [data-k="msg"]{top:calc(100% + 8px)}}' +
      // teléfono de lado: el aviso va abajo, entre el joystick y los botones
      '@media (orientation:landscape) and (max-height:500px){#pln-hud [data-k="msg"]{position:fixed;top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);max-width:min(440px,calc(100vw - 380px))}}' +
      '@media (orientation:landscape) and (max-height:500px){#pln-fin{padding:12px 16px;gap:4px}#pln-fin h2{font-size:21px}#pln-fin .pln-gran{font-size:34px}#pln-fin .pln-gran svg{width:34px;height:34px}}' +
      // la historia no se mezcla con el minijuego (sus avisos esperan: G.menuModos.ocupado() cuenta este juego como actividad en marcha)
      'body.planeo-on :is(#quest,#inv,#inv-cuenta,#inv-reporte,#modo-salir,#toast,#prompt,#bocadillos,#juice-chip,#juice-pop,#truco-chip,#fx-descubre,#v18-exp-poder,#v18-extra,#b-construir,#b-nido,#marcador,#retos,#pista-vuela){visibility:hidden!important}' +
      // aquí no hay subir, impulso, aterrizar ni Acción: solo el joystick y «Bajar» (picada)
      'body.planeo-on :is(#b-act,#b-jump,#b-dash,#b-fly){visibility:hidden!important}' +
      // con el panel, tampoco las pistas de vuelo ni el minimapa: solo el resultado
      'body.planeo-fin :is(#minimapa,#guia-hud,#keyhint,#acts,#stick,#emotes,#tag,#sys,#sys button,#b-diary,#b-emotes,#b-nido,#b-menu,#b-dive,#v18-exp-poder){visibility:hidden!important}';
    document.head.appendChild(st);
  }
  function montar() {
    if (hudEl) return;
    css();
    hudEl = document.createElement('div'); hudEl.id = 'pln-hud'; hudEl.hidden = true; // sin role="status": el reloj cambia cada segundo y no se anuncia; solo el aviso (aria-live) habla
    hudEl.innerHTML = '<b class="pln-tit" data-k="tit"></b><span class="pln-t" data-k="r"></span><span class="pln-d" data-k="dw">' + FLECHA + '<span data-k="d"></span></span><span class="pln-h" data-k="hw">' + ALTO + '<span data-k="h"></span></span><span class="pln-r" data-k="rec"></span><span data-k="msg" aria-live="polite"></span><button type="button" class="salir" data-a="salir"></button>';
    finEl = document.createElement('div'); finEl.id = 'pln-fin'; finEl.hidden = true; finEl.tabIndex = -1; finEl.setAttribute('role', 'dialog'); finEl.setAttribute('aria-modal', 'true'); finEl.setAttribute('aria-labelledby', 'pln-fin-t');
    finEl.innerHTML = '<h2 id="pln-fin-t" data-k="ft"></h2><div class="pln-gran">' + FLECHA + '<span data-k="fn"></span></div><p data-k="fmsg" aria-live="polite"></p><p class="pln-det" data-k="fdet"></p><div class="pln-bots"><button type="button" data-a="otra"></button><button type="button" class="salir" data-a="salir"></button></div>';
    const clic = e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; e.preventDefault(); if (b.dataset.a === 'otra') jugar(); else salir(); };
    hudEl.addEventListener('click', clic); finEl.addEventListener('click', clic);
    document.body.appendChild(hudEl); document.body.appendChild(finEl);
  }
  const q = (el, k) => el.querySelector('[data-k="' + k + '"]');
  const ancho = () => innerWidth >= 700 && innerHeight >= 500;
  const metros = n => Math.floor(n) + ' m';
  function pintarHud() {
    if (!hudEl) return;
    q(hudEl, 'tit').textContent = ancho() ? L('Planeo entre nubes', 'Cloud Glide') : ''; // en el teléfono el título sobra: una sola franja
    const r = q(hudEl, 'r'); r.textContent = reloj(restante()); r.classList.toggle('poco', restante() <= 10);
    q(hudEl, 'd').textContent = metros(E.lejos); q(hudEl, 'dw').setAttribute('aria-label', L('Distancia: ', 'Distance: ') + metros(E.lejos));
    const h = Math.max(0, Math.round(E.alto)), hw = q(hudEl, 'hw');
    q(hudEl, 'h').textContent = h + ' m'; hw.classList.toggle('bajo', E.alto < CERCA_SUELO); hw.setAttribute('aria-label', L('Altura: ', 'Height: ') + h + ' m');
    const rq = q(hudEl, 'rec'); rq.textContent = E.mejor ? (ancho() ? L('Récord ', 'Best ') : '★') + metros(E.mejor) : ''; rq.setAttribute('aria-label', L('Récord: ', 'Best: ') + metros(E.mejor));
    hudEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }
  function aviso(txt, cls) {
    if (!hudEl) return;
    const m = q(hudEl, 'msg'); m.textContent = txt; m.className = cls || ''; E.msgT = 1.8;
  }
  const TITULO = { suelo: ['¡Tocaste el suelo!', 'You touched down!'], agua: ['¡Al agua!', 'Splash!'], tiempo: ['¡Tiempo!', 'Time’s up!'] };
  function pintarFin() {
    if (!finEl) return;
    const d = Math.floor(E.lejos), t = TITULO[E.motivo] || TITULO.suelo;
    q(finEl, 'ft').textContent = L(t[0], t[1]);
    q(finEl, 'fn').textContent = d + ' m';
    q(finEl, 'fmsg').textContent = d < 25 ? L('¡Casi! Busca las nubes y las corrientes que suben', 'So close! Look for clouds and updrafts')
      : E.nuevo ? L(`¡Nuevo récord: ${d} m!`, `New record: ${d} m!`) : L(`Récord: ${E.mejor} m`, `Best: ${E.mejor} m`);
    q(finEl, 'fdet').textContent = L(`Nubes: ${E.nubesN} · Corrientes: ${E.termsN} · En el aire: ${reloj(E.t)}`, `Clouds: ${E.nubesN} · Updrafts: ${E.termsN} · Airtime: ${reloj(E.t)}`);
    finEl.querySelector('[data-a="otra"]').textContent = L('Otra vez', 'Play again');
    finEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }

  // ---------- Partida ----------
  function jugar(o) {
    o = o || {};
    azarS = o.semilla || 0;
    if (E.fase === 'nada') { vuelta.x = S.pos.x; vuelta.y = S.pos.y; vuelta.z = S.pos.z; const f = S.facing || { x: 0, z: 1 }; vuelta.fx = f.x; vuelta.fz = f.z; vuelta.ok = true; }
    montar(); crearMallas();
    const rec = leerRec(), ent = v => (Number.isInteger(v) && v >= 0 ? v : 0);
    Object.assign(E, { fase: 'juego', t: 0, lejos: 0, dist: 0, alto: ALTO_INI, subeT: 0, nubesN: 0, termsN: 0, motivo: '', toqueT: 0, msgT: 0, avisos: 0, cerca: false, centena: 0, guiaT: 0, primeraTerm: true,
      mejor: rec ? rec.mejor : 0, mejorNubes: rec ? ent(rec.nubes) : 0, jugadas: rec ? ent(rec.jugadas) : 0, nuevo: false, finP: 0, hondo: 9 });
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    try { if (G.pausa && G.pausa.set) G.pausa.set('planeo', false); } catch (e) { /* sin pausa */ }
    if (G.interaccion && G.interaccion.modo !== MODO) { modo0 = G.interaccion.modo; G.interaccion.modo = MODO; }
    ajustarFisica(true);
    elegirSalida(); ponerNubes(); ponerCorrientes();
    colocarVittata();
    if (M) M.nubes.material.opacity = 1;
    pintarNubes(); pintarColumnas(); pintarMotas();
    finEl.hidden = true; q(hudEl, 'msg').textContent = '';
    document.body.classList.add('planeo-on'); document.body.classList.remove('planeo-fin');
    apuntarGuia(); pintarHud(); verHud();
    aviso(L('Planea lejos: las nubes y las corrientes que suben te dan altura', 'Glide far: clouds and updrafts give you height'), 'bien'); E.msgT = 4;
    sonar('boton');
    return true;
  }
  let logroId = 0;
  function fin(motivo) { // tocó suelo o agua, o se acabó el tiempo: un momento para verlo y luego el panel
    if (E.fase !== 'juego') return;
    E.motivo = motivo; guia.ok = false;
    E.fase = 'toque'; E.toqueT = motivo === 'tiempo' ? 0 : TOQUE_T;
    hudEl.hidden = true; q(hudEl, 'msg').textContent = ''; document.body.classList.add('planeo-fin');
    sonar(motivo === 'tiempo' ? 'panel_final' : 'frenada');
    pintarMotas();
    if (E.toqueT <= 0) mostrarFin();
  }
  function mostrarFin() {
    if (E.fase !== 'toque') return;
    E.fase = 'fin'; E.finP = performance.now() / 1000;
    E.jugadas++;
    const d = Math.floor(E.lejos);
    E.nuevo = d > E.mejor && d >= 25; if (d > E.mejor) E.mejor = d;
    if (E.nubesN > E.mejorNubes) E.mejorNubes = E.nubesN;
    guardarRec();
    try { G.emit('record', { modo: 'planeo', metros: d, nubes: E.nubesN }); } catch (e) { /* */ }
    if (E.motivo !== 'tiempo') sonar('panel_final');
    if (E.nuevo) logroId = setTimeout(() => { logroId = 0; if (E.fase === 'fin') sonar('logro'); }, 500);
    pintarMotas(); pintarHud(); pintarFin(); finEl.hidden = false;
    try { if (G.pausa && G.pausa.set) G.pausa.set('planeo', true); } catch (e) { /* sin pausa */ } // panel modal: el mundo se congela detrás
    // el foco va al panel (no a «Otra vez»): un toque de los últimos segundos no arranca otra partida sin ver el resultado
    setTimeout(() => { try { if (E.fase === 'fin') finEl.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
  }
  const activo = () => E.fase !== 'nada';
  // Durante la pantalla de carga (pausa 'carga') el HUD no sale encima: aparece cuando el mundo ya se ve; tampoco con «Saltar intro»
  const cargando = () => { try { return !!(G.pausa && G.pausa.motivos && G.pausa.motivos.has('carga')); } catch (e) { return false; } };
  function verHud() { if (hudEl) { const v = E.fase === 'juego' && !cargando() && !document.getElementById('c1-saltar'); if (hudEl.hidden === v) hudEl.hidden = !v; } }
  function salir() {
    if (!activo()) return false;
    E.fase = 'nada'; guia.ok = false;
    for (const n of nubes) n.on = false; for (const t of terms) t.on = false;
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    if (G.interaccion && G.interaccion.modo === MODO) G.interaccion.modo = modo0; modo0 = null;
    ajustarFisica(false); soltarMallas();
    if (vuelta.ok) { // Vittata vuelve a donde estaba (la cumbre no es parte de la historia)
      const Mv = G.fisica && G.fisica.MOVE;
      S.pos.x = vuelta.x; S.pos.y = vuelta.y; S.pos.z = vuelta.z; S.vy = 0; S.facing = { x: vuelta.fx, z: vuelta.fz };
      if (Mv) { Mv.vx = Mv.vz = 0; Mv.landing = false; Mv.dashT = 0; }
      vuelta.ok = false;
    }
    if (hudEl) { hudEl.hidden = true; finEl.hidden = true; [hudEl, finEl].forEach(el => el.querySelectorAll('[data-k]').forEach(x => { if (x.dataset.k !== 'dw' && x.dataset.k !== 'hw') x.textContent = ''; })); [hudEl, finEl].forEach(el => el.querySelectorAll('button').forEach(b => { b.textContent = ''; })); q(hudEl, 'd').textContent = ''; q(hudEl, 'h').textContent = ''; } // sin texto viejo (ni en otro idioma)
    document.body.classList.remove('planeo-on', 'planeo-fin');
    const poder = document.getElementById('v18-exp-poder'); if (poder) poder.hidden = true; // el chip táctil del poder estaba tapado por la clase (como en sembradora.js)
    try { if (G.pausa && G.pausa.set) G.pausa.set('planeo', false); } catch (e) { /* sin pausa */ }
    return true;
  }
  addEventListener('keydown', e => {
    if (!activo()) return;
    if (e.key === 'Escape') {
      if (e.repeat || (G.ui && G.ui.cardOpen)) return; // una tarjeta abierta encima se cierra primero
      e.preventDefault(); e.stopImmediatePropagation(); salir(); return;
    }
    if (E.fase === 'toque' || E.fase === 'fin') { // el toque y el panel son modales: las teclas del mundo no pasan; Tab, Enter y Espacio van a sus botones (no en el primer segundo)
      if (e.key === 'Tab') { // el foco no sale del panel: da la vuelta entre sus botones
        e.preventDefault(); e.stopImmediatePropagation();
        if (E.fase !== 'fin') return;
        const bs = finEl.querySelectorAll('button'), i = Array.prototype.indexOf.call(bs, document.activeElement), n = bs.length;
        const j = e.shiftKey ? (i <= 0 ? n - 1 : i - 1) : (i < 0 || i >= n - 1 ? 0 : i + 1);
        try { bs[j].focus({ preventScroll: true }); } catch (er) { /* */ }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const boton = E.fase === 'fin' && (e.key === 'Enter' || e.key === ' ') && performance.now() / 1000 - E.finP > 1 && e.target && e.target.closest && e.target.closest('#pln-fin button');
      e.stopImmediatePropagation(); if (!boton) e.preventDefault();
    }
  }, true);
  addEventListener('resize', () => { if (activo()) pintarHud(); });

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })(), pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const m = MV(), mv0 = { vx: m.vx, vz: m.vz, flying: m.flying }, yaw0 = G.camara ? G.camara.yaw : 0;
    const T = TU(), fisAntes = T ? Object.keys(AJ_FIS).map(k => T[k]) : null, fisIgual = () => !T || Object.keys(AJ_FIS).every((k, i) => T[k] === fisAntes[i]);
    const tecla = (k, tipo) => { const ev = new KeyboardEvent(tipo || 'keydown', { key: k, bubbles: true, cancelable: true }); dispatchEvent(ev); if (!tipo) dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); return ev; };
    const vis = id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0; };
    const lejosDeTodo = alto => { // un sitio del recorrido sin nubes ni corrientes cerca, a «alto» m del suelo (25 si no se dice)
      alto = alto || 25;
      for (let k = 0; k < 60; k++) {
        const a = k * 0.7, d = 30 + k * 6, x = salida.x + Math.cos(a) * d, z = salida.z + Math.sin(a) * d;
        if (nubes.some(n => n.on && Math.hypot(n.x - x, n.z - z) < 25) || terms.some(t => t.on && Math.hypot(t.x - x, t.z - z) < 25)) continue;
        const g = techoEn(x, z, 12); if (!(g > -1e8)) continue; return { x, z, y: g + alto };
      }
      return { x: salida.x, z: salida.z, y: salida.y };
    };
    const aRas = (p, h) => ({ x: p.x, z: p.z, y: superficie(p.x, p.z, 400) + h }); // a h m de lo que hay justo debajo
    const ir = (p, vx, vz) => { S.pos.x = p.x; S.pos.y = p.y; S.pos.z = p.z; m.vx = vx == null ? 12 : vx; m.vz = vz || 0; m.flying = true; m.landing = false; m.swimming = false; E.subeT = 0; };
    const pasos = (n, dt) => { for (let i = 0; i < n && E.fase === 'juego'; i++) paso(dt || 0.05); };
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ }
      { const sx = document.getElementById('c1-saltar'); if (sx) { sx.click(); for (let i = 0; i < 60 && document.getElementById('c1-saltar'); i++) await new Promise(r => setTimeout(r, 50)); } } // como sembradora.js: durante la apertura del capítulo, se salta antes
      jugar({ semilla: 7 });
      const hb = hudEl.querySelector('[data-a="salir"]').getBoundingClientRect();
      check('Se abre con el HUD (reloj 2:00, 0 m, la altura y «Salir» de ≥ 44 px) y la clase del juego', activo() && !hudEl.hidden && finEl.hidden && q(hudEl, 'r').textContent === '2:00' && q(hudEl, 'd').textContent === '0 m' && /\d+ m/.test(q(hudEl, 'h').textContent) && hb.height >= 44 && hb.width >= 44 && document.body.classList.contains('planeo-on'), q(hudEl, 'r').textContent + ' · ' + q(hudEl, 'd').textContent + ' · ' + Math.round(hb.height));
      check('Sale en el aire desde un punto alto que ya existe (la cumbre), volando y bien por encima del suelo', salida.ancla === 'cumbre' && m.flying && S.pos.y - superficie(S.pos.x, S.pos.z, S.pos.y) >= ALTO_INI - 0.5 && Math.abs(S.pos.x - salida.x) < 1e-6, salida.ancla + ' · ' + Math.round(salida.x) + ',' + Math.round(salida.z) + ' · ' + Math.round(salida.y) + ' m');
      check('3 mallas instanciadas (nubes, columnas y motas), todas del juego, y ningún aro', R.scene.children.filter(o => o.isInstancedMesh && /^planeo:/.test(o.name)).length === 3 && !R.scene.children.some(o => /^planeo:/.test(o.name) && o.geometry && /Torus|Ring/.test(o.geometry.type)), R.scene.children.filter(o => /^planeo:/.test(o.name)).map(o => o.name + ':' + o.geometry.type).join(','));
      const nN = nubes.filter(n => n.on).length, nT = terms.filter(t => t.on).length;
      check('Nubes en el aire, separadas y nunca dentro del suelo; corrientes solo sobre tierra', nN >= 12 && nT >= 6 && nubes.every(n => !n.on || n.y - techoEn(n.x, n.z, 6) >= 8.9) && terms.every(t => !t.on || !mojado(t.x, t.z)) && M.nubes.count === nN * BOLAS_NUBE.length && M.columnas.count === nT, nN + ' nubes · ' + nT + ' corrientes');
      check('El HUD no es una región viva (el reloj no se anuncia cada segundo); solo su aviso habla', !hudEl.hasAttribute('role') && !hudEl.hasAttribute('aria-live') && !q(hudEl, 'r').closest('[aria-live],[role="status"]') && q(hudEl, 'msg').getAttribute('aria-live') === 'polite');
      { const hr = hudEl.getBoundingClientRect(), mr = q(hudEl, 'msg').getBoundingClientRect(), choca = (r, h) => h.width > 0 && r.left < h.right && r.right > h.left && r.top < h.bottom && r.bottom > h.top;
        const tapa = ['stick', 'acts', 'minimapa', 'b-menu', 'b-diary', 'b-emotes', 'b-dive'].filter(id => { if (!vis(id)) return false; const r = document.getElementById(id).getBoundingClientRect(); return choca(r, hr) || choca(r, mr); });
        check('El HUD cabe en una franja arriba y ni él ni su aviso tapan los botones del juego', hr.left >= 0 && hr.right <= innerWidth && hr.top >= 0 && hr.height <= 64 && !tapa.length, `${innerWidth}×${innerHeight} · HUD ${Math.round(hr.width)}×${Math.round(hr.height)}` + (tapa.length ? ' · tapa ' + tapa.join(',') : '')); }
      check('La historia no se mezcla: cuenta como actividad (los avisos esperan) y el letrero, el aviso y los bocadillos no se ven; sin botones de subir, impulso ni Acción',
        (!G.menuModos || !G.menuModos.ocupado || G.menuModos.ocupado()) && ['toast', 'prompt', 'quest', 'inv-cuenta', 'bocadillos', 'b-act', 'b-jump', 'b-dash', 'b-fly'].every(id => !vis(id)));
      if (G.pausa && G.pausa.set && G.pausa.motivos) {
        const yaCarga = G.pausa.motivos.has('carga');
        G.pausa.set('carga', true); verHud(); const tapado = hudEl.hidden;
        if (!yaCarga) G.pausa.set('carga', false); verHud();
        check('Con la pantalla de carga el HUD espera y luego sale', tapado && (yaCarga || !hudEl.hidden), yaCarga + '/' + tapado + '/' + hudEl.hidden);
      }
      // Pierde altura poco a poco y siempre avanza (no se queda cernida)
      const p1 = lejosDeTodo(); ir(p1, 0, 0); pasos(20);
      const bajo1 = p1.y - S.pos.y, vel1 = Math.hypot(m.vx, m.vz);
      check('Sin ayudas pierde ' + HUNDE + ' m por segundo y nunca se queda cernida (≥ ' + VMIN + ' m/s)', Math.abs(bajo1 - HUNDE) < 0.05 && vel1 >= VMIN - 1e-6 && E.fase === 'juego', bajo1.toFixed(2) + ' m · ' + vel1.toFixed(1) + ' m/s');
      // La flecha y el minimapa apuntan a lo mismo
      ir({ x: salida.x, y: salida.y, z: salida.z }, salida.fx * 12, salida.fz * 12); apuntarGuia();
      check('La flecha y el minimapa apuntan a lo mismo (una ayuda de delante que se alcanza)', guia.ok && (!G.fx || !G.fx.guide || (() => { const g0 = G.fx.guide; let visto = null; G.fx.guide = t => { visto = t; }; try { guiar(); } finally { G.fx.guide = g0; } return visto === guia; })()) &&
        (!G.minimapa || !G.minimapa.marcadores || G.minimapa.marcadores().some(k => k.tipo === 'obj' && k.x === guia.x && k.z === guia.z)), guia.ok ? guia.x.toFixed(1) + ',' + guia.z.toFixed(1) : 'sin guía');
      // Una nube: empujón hacia arriba una sola vez y se queda gris
      const n0 = nubes.find(n => n.on); ir({ x: n0.x, y: n0.y, z: n0.z }, 0.01, 0); const y0n = S.pos.y; paso(0.05); const usada = n0.usada, k0 = nubes.filter(n => n.on).indexOf(n0) * BOLAS_NUBE.length;
      const cG = new THREE.Color(); M.nubes.getColorAt(k0, cG); const gris = cG.r < 0.9;
      pasos(17); const subeN = S.pos.y - y0n;
      check('Cruzar una nube da altura (+' + (NUBE_V * NUBE_T - HUNDE * NUBE_T).toFixed(1) + ' m en ' + NUBE_T + ' s), con su aviso, y la nube se queda gris', usada && gris && subeN > 5 && E.nubesN === 1 && /Nube/.test(q(hudEl, 'msg').textContent), subeN.toFixed(2) + ' m · ' + q(hudEl, 'msg').textContent + ' · ' + [usada, gris, E.nubesN, cG.r.toFixed(2)].join('/'));
      ir({ x: n0.x, y: n0.y, z: n0.z }, 0.01, 0); const y1n = S.pos.y; pasos(18);
      check('La misma nube no vuelve a empujar (una vez por nube)', S.pos.y < y1n && E.nubesN === 1, (S.pos.y - y1n).toFixed(2));
      // Una corriente: sube mientras le queda fuerza; luego se apaga
      const t0 = terms.find(t => t.on); ir({ x: t0.x, y: t0.y + 20, z: t0.z }, 0.01, 0); const y0t = S.pos.y; pasos(20); const subeT1 = S.pos.y - y0t, msgT = q(hudEl, 'msg').textContent;
      pasos(60); const yAg = S.pos.y; pasos(20); const bajaT = yAg - S.pos.y;
      check('Dentro de una corriente sube (' + (TERM_V - HUNDE).toFixed(1) + ' m/s) y, gastada su fuerza (' + TERM_CARGA + ' s), ya no', E.termsN === 1 && Math.abs(subeT1 - (TERM_V - HUNDE)) < 0.1 && t0.carga === 0 && Math.abs(bajaT - HUNDE) < 0.1 && /Corriente/.test(msgT), subeT1.toFixed(2) + ' / −' + bajaT.toFixed(2) + ' · ' + msgT);
      // Distancia: la mayor en línea recta desde la salida (dar vueltas no suma)
      E.lejos = 0; ir({ x: salida.x + 150, y: superficie(salida.x + 150, salida.z, 400) + 30, z: salida.z }, 12, 0); paso(0.05); const d150 = E.lejos;
      ir({ x: salida.x + 20, y: superficie(salida.x + 20, salida.z, 400) + 30, z: salida.z }, 12, 0); paso(0.05); pintarHud();
      check('El récord es la distancia más lejana en línea recta desde la salida (volver no la baja) y el HUD la enseña', d150 > 149 && d150 < 152 && E.lejos === d150 && q(hudEl, 'd').textContent === Math.floor(d150) + ' m', d150.toFixed(1) + ' · ' + q(hudEl, 'd').textContent);
      // Machacar no sirve: con la física de verdad, 40 toques de subir, impulso y Acción no alargan el vuelo
      if (G.fisica && G.fisica.step) {
        const p2 = lejosDeTodo(45), vuelo = toques => { ir(p2, 12, 0); S.facing = { x: 1, z: 0 }; for (let i = 0; i < 40 && E.fase === 'juego'; i++) { if (toques) { tecla(' ', 'keydown'); tecla('Shift'); tecla('e'); tecla('f'); tecla('v'); tecla('x'); } G.fisica.step(0.05, false); paso(0.05); if (toques) tecla(' ', 'keyup'); } return { y: S.pos.y, x: S.pos.x }; };
        const a = vuelo(false), b = vuelo(true);
        check('Machacar no sirve: 40 toques de subir, impulso, Acción y aterrizar no dan altura ni distancia y no la bajan del vuelo', b.y <= a.y + 0.05 && b.x <= a.x + 0.5 && m.flying && !m.landing && E.fase === 'juego', 'sin ' + a.y.toFixed(2) + ' · con ' + b.y.toFixed(2) + ' · x ' + (b.x - a.x).toFixed(2));
        // en picada baja más deprisa y va más rápido
        ir(p2, 12, 0); const yp = S.pos.y; tecla('c', 'keydown'); for (let i = 0; i < 10; i++) { G.fisica.step(0.05, false); paso(0.05); } tecla('c', 'keyup');
        const vP = Math.hypot(m.vx, m.vz);
        check('Picada (C): baja más deprisa y va más rápido (sin alargar el vuelo)', yp - S.pos.y > HUNDE * 0.5 * 1.5 && vP >= VPICADA - 0.5 && E.fase === 'juego', (yp - S.pos.y).toFixed(2) + ' m · ' + vP.toFixed(1) + ' m/s · ' + E.fase);
      }
      // Táctil: el joystick mueve como siempre; los botones que se ven son solo los que sirven (Bajar)
      check('En táctil no hay botones que no sirvan (subir, impulso, aterrizar, Acción) y «Bajar» sigue (≥ 44 px si se ve)', ['b-act', 'b-jump', 'b-dash', 'b-fly'].every(id => !vis(id)) && (!vis('b-dive') || document.getElementById('b-dive').getBoundingClientRect().height >= 44));
      // Aviso de suelo cerca (suena)
      { const p3 = lejosDeTodo(); E.cerca = false; ir(aRas(p3, 4), 12, 0); paso(0.05);
        check('Cerca del suelo, aviso «¡Cuidado, el suelo!» y la altura en rojo', E.cerca && /Cuidado, el suelo/.test(q(hudEl, 'msg').textContent) && (pintarHud(), q(hudEl, 'hw').classList.contains('bajo')), q(hudEl, 'msg').textContent); }
      { // «Reducir movimiento»: contadores (motas pintadas y sonidos), no estilos
        const au = G.audio, pl0 = au && au.play, sonidos = []; let motasRed = -1;
        html.classList.add('mov-reducido');
        try {
          if (au) au.play = n => { sonidos.push(n); };
          G.quiet = false;
          const c0 = E.motasPint; const p4 = lejosDeTodo(); ir(p4, 12, 0); pasos(10); motasRed = E.motasPint - c0;
          E.cerca = false; ir(aRas(p4, 4), 12, 0); paso(0.05);
          const t9 = E.t; E.t = DUR - 9.9; E.avisos = 0; ir(p4, 12, 0); paso(0.05); E.t = t9;
          check('Con «Reducir movimiento»: ninguna mota y los avisos importantes suenan (suelo cerca y tiempo)', motasRed === 0 && M.motas.count === 0 && sonidos.filter(n => n === 'aviso').length >= 2, 'motas ' + motasRed + ' · ' + sonidos.join(','));
        } finally { G.quiet = true; if (au) au.play = pl0; html.classList.remove('mov-reducido'); }
        const c1 = E.motasPint; const p5 = lejosDeTodo(); ir(p5, 12, 0); pasos(5);
        check('Sin «Reducir movimiento» las motas sí se pintan (el contador funciona)', E.motasPint - c1 === 5 && M.motas.count > 0, E.motasPint - c1);
      }
      check('Aterrizar está desactivado: no se baja del vuelo con el botón ni con V', (() => { ir(lejosDeTodo(), 12, 0); m.landing = true; paso(0.05); return !m.landing && E.fase === 'juego'; })());
      // Tocar el suelo termina: un momento y el panel modal
      const lejosFin = 260; E.lejos = lejosFin; E.mejor = 0;
      { const p6 = lejosDeTodo(); ir(aRas(p6, 0.1), 12, 0); paso(0.05); }
      const enToque = E.fase === 'toque' && hudEl.hidden && finEl.hidden;
      const tV = tecla('p');
      check('Tocar el suelo termina: un momento para verlo (sin teclas del mundo) y luego el panel', enToque && tV.defaultPrevented && E.motivo === 'suelo', E.fase + ' · ' + E.motivo);
      for (let i = 0; i < 30 && E.fase === 'toque'; i++) paso(0.05);
      const fr = finEl.getBoundingClientRect(), bots = [...finEl.querySelectorAll('button')].map(b => b.getBoundingClientRect());
      check('Panel final en una sola medida: «¡Tocaste el suelo!», los metros, «¡Nuevo récord: N m!», nubes, corrientes y tiempo, «Otra vez» y «Salir»', E.fase === 'fin' && !finEl.hidden && /Tocaste el suelo/.test(q(finEl, 'ft').textContent) && q(finEl, 'fn').textContent === lejosFin + ' m' && new RegExp('Nuevo récord: ' + lejosFin + ' m!').test(q(finEl, 'fmsg').textContent) && /Nubes: 1 · Corrientes: 1 · En el aire: \d:\d\d/.test(q(finEl, 'fdet').textContent) && /Otra vez/.test(finEl.textContent) && /Salir/.test(finEl.textContent), q(finEl, 'ft').textContent + ' · ' + q(finEl, 'fmsg').textContent + ' · ' + q(finEl, 'fdet').textContent);
      check('El récord (metros, nubes y partidas) se guarda en este dispositivo', (() => { const r = leerRec(); return r && r.mejor === lejosFin && r.nubes === 1 && r.jugadas === 1; })(), JSON.stringify(leerRec()));
      check('Cabe en la pantalla: panel dentro y botones del final ≥ 54 px', bots.every(b => b.height >= 54 && b.width >= 54) && fr.left >= 0 && fr.right <= innerWidth && fr.top >= 0 && fr.bottom <= innerHeight, `${innerWidth}×${innerHeight} · ${Math.round(fr.width)}×${Math.round(fr.height)}`);
      await new Promise(r => setTimeout(r, 30));
      const tP = tecla('p'), tE = tecla('e');
      check('El panel es modal: el mundo en pausa, las teclas del mundo no pasan y el foco va al panel', (!G.pausa || !G.pausa.motivos || G.pausa.motivos.has('planeo')) && tP.defaultPrevented && tE.defaultPrevented && E.fase === 'fin' && document.activeElement === finEl && ['minimapa', 'guia-hud', 'keyhint', 'b-dive'].every(id => !vis(id)), document.activeElement && (document.activeElement.id || document.activeElement.tagName));
      { const enPanel = []; for (const k of ['Tab', 'Tab', 'Tab']) { const t = tecla(k); enPanel.push(t.defaultPrevented && finEl.contains(document.activeElement) && document.activeElement !== finEl); }
        const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); dispatchEvent(ev); enPanel.push(finEl.contains(document.activeElement));
        const fuera = ['b-diary', 'b-menu', 'b-emotes', 'b-nido'].filter(id => vis(id));
        check('El foco no sale del panel con Tab y Diario, Gestos y el menú no quedan encima', enPanel.every(Boolean) && !fuera.length, enPanel.join(',') + (fuera.length ? ' · se ve ' + fuera.join(',') : ''));
        finEl.focus(); }
      const ae = G.aula && G.aula.aj;
      if (ae) {
        const idi0 = ae.idioma; ae.idioma = 'en'; pintarHud(); pintarFin();
        const txt = hudEl.textContent + ' ' + finEl.textContent + ' ' + MODO.verbo;
        check('En inglés no queda texto en español (You touched down!, New record, Clouds, Updrafts, Airtime, Play again, Exit)', /You touched down!/.test(txt) && /New record: \d+ m!/.test(txt) && /Clouds: 1 · Updrafts: 1 · Airtime/.test(txt) && /Play again/.test(txt) && /Exit/.test(txt) && !/[áéíóúñ¡]|Salir|Otra vez|Récord|Nubes|Corrientes|Planea\b/.test(txt), txt.slice(0, 220));
        ae.idioma = idi0; pintarHud(); pintarFin();
      }
      const salidaFin = { x: salida.x, z: salida.z };
      finEl.querySelector('[data-a="otra"]').click();
      check('«Otra vez» empieza limpio desde la misma salida (2:00, 0 m, nubes sin usar, corrientes llenas, sin panel ni pausa)', E.fase === 'juego' && E.lejos === 0 && E.nubesN === 0 && nubes.every(n => !n.on || !n.usada) && terms.every(t => !t.on || t.carga === TERM_CARGA) && finEl.hidden && q(hudEl, 'r').textContent === '2:00' && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('planeo')) && Math.hypot(salida.x - salidaFin.x, salida.z - salidaFin.z) < 0.01 && Math.abs(S.pos.y - salida.y) < 1e-6 && m.flying,
        [E.fase, E.lejos, E.nubesN, finEl.hidden, q(hudEl, 'r').textContent].join('/'));
      // Al agua (si hay agua en el recorrido) y «¡Casi!» sin distancia
      { let wx = null, wz = null; for (let k = 0; k < 400 && wx == null; k++) { const a = k * 0.37, d = 20 + k * 1.2, x = salida.x + Math.cos(a) * d, z = salida.z + Math.sin(a) * d; if (mojado(x, z)) { wx = x; wz = z; } }
        if (wx != null) { E.lejos = 3; ir({ x: wx, y: nivelAgua(wx, wz) + 0.1, z: wz }, 12, 0); paso(0.05); for (let i = 0; i < 30 && E.fase === 'toque'; i++) paso(0.05);
          check('Tocar el agua también termina («¡Al agua!») y el récord sigue', E.motivo === 'agua' && /Al agua/.test(q(finEl, 'ft').textContent) && leerRec().mejor === lejosFin, q(finEl, 'ft').textContent + ' · ' + q(finEl, 'fmsg').textContent);
          finEl.querySelector('[data-a="otra"]').click(); } }
      { // sin distancia, nunca castiga: «¡Casi!» con una pista y el récord sigue
        ir({ x: salida.x, y: superficie(salida.x, salida.z, salida.y) + 0.1, z: salida.z }, 12, 0); paso(0.05); for (let i = 0; i < 30 && E.fase === 'toque'; i++) paso(0.05);
        check('Sin distancia, nunca castiga: «¡Casi! Busca las nubes…» y el récord sigue', E.fase === 'fin' && /Casi! Busca las nubes/.test(q(finEl, 'fmsg').textContent) && leerRec().mejor === lejosFin, q(finEl, 'fmsg').textContent);
        finEl.querySelector('[data-a="otra"]').click(); }
      // A los 2 minutos se acaba («¡Tiempo!»), con el récord de antes si no se supera
      { E.lejos = 100; ir(lejosDeTodo(), 12, 0); E.t = DUR - 0.01; paso(0.05);
        check('A los 2 minutos se acaba: «¡Tiempo!» y el panel ya (sin superar el récord: «Récord: N m»)', E.fase === 'fin' && /Tiempo/.test(q(finEl, 'ft').textContent) && new RegExp('Récord: ' + lejosFin + ' m').test(q(finEl, 'fmsg').textContent) && leerRec().jugadas >= 2, q(finEl, 'ft').textContent + ' · ' + q(finEl, 'fmsg').textContent); }
      let soltadas = 0; for (const k of ['nubes', 'columnas', 'motas']) M[k].addEventListener('dispose', () => { soltadas++; });
      finEl.querySelector('[data-a="salir"]').click();
      check('Al salir se sueltan las 3 mallas instanciadas (sus búferes de la GPU también)', soltadas === 3, soltadas);
      check('«Salir» lo quita todo (HUD, panel, clases, pausa, mallas, Acción) y devuelve la física de siempre y a Vittata a donde estaba', !activo() && hudEl.hidden && finEl.hidden && !/planeo-(on|fin)/.test(document.body.className) && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('planeo')) && !M && !R.scene.children.some(o => /^planeo:/.test(o.name)) && (!G.interaccion || G.interaccion.modo !== MODO) && fisIgual() && Math.hypot(S.pos.x - pos0.x, S.pos.z - pos0.z) < 0.01,
        fisIgual() + ' · ' + Math.round(S.pos.x) + ',' + Math.round(S.pos.z));
      jugar({ semilla: 3 });
      { let chip = document.getElementById('v18-exp-poder'), puesto = false;
        if (!chip) { chip = document.createElement('button'); chip.id = 'v18-exp-poder'; document.body.appendChild(chip); puesto = true; }
        const h0 = chip.hidden; chip.hidden = false; hudEl.querySelector('[data-a="salir"]').click(); const oculto = chip.hidden;
        if (puesto) chip.remove(); else chip.hidden = h0;
        check('Al salir a media partida, la física vuelve y el chip «Tu poder» no se queda encima de la portada', oculto && !activo() && fisIgual()); }
      jugar({ semilla: 3 });
      const ev = tecla('Escape');
      check('Esc en plena partida también sale', !activo() && ev.defaultPrevented && hudEl.hidden && fisIgual());
      check('Sonidos que ya existen (boton, ring, aleteo, aviso, frenada, panel_final, logro)', !G.audio || !G.audio.has || ['boton', 'ring', 'aleteo', 'aviso', 'frenada', 'panel_final', 'logro'].every(n => G.audio.has(n)), G.audio && G.audio.has ? ['boton', 'ring', 'aleteo', 'aviso', 'frenada', 'panel_final', 'logro'].filter(n => !G.audio.has(n)).join(',') : '');
    } catch (e) { check('Sin errores', false, e && (e.stack || e.message)); }
    finally {
      salir(); G.quiet = q0; azarS = 0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; m.vx = mv0.vx; m.vz = mv0.vz; m.flying = mv0.flying; m.landing = false; if (G.camara) G.camara.yaw = yaw0;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  const objetivo = () => (E.fase === 'juego' && guia.ok ? guia : null); // lo lee el minimapa (minimapa.js objetivo()): la estrella marca lo mismo que la flecha
  G.planeoApi = { jugar, salir, activo, paso, test, objetivo,
    estado: () => ({ fase: E.fase, lejos: Math.floor(E.lejos), alto: E.alto, nubes: E.nubesN, corrientes: E.termsN, restante: restante(), mejor: E.mejor, motivo: E.motivo }),
    _dev: { E, nubes, terms, salida, guia } };
  return G.planeoApi;
};
