/* Juego · F2-1 · «¡Sígueme, bandada!» (minijuego corto de «Más juegos», 2 minutos). Diseño: docs/diseno/F2_MINIJUEGOS.md §1.
   Vuela cerca de las cotorras sueltas (las que tienen «?» encima): a menos de 6 m se unen a la fila con un silbido que sube de
   tono y siguen a Vittata calcando su camino. Llévalas al dormidero (el árbol que brilla, con la flecha de guía de siempre) y
   «entrega» la fila: puntos = cotorras × multiplicador (×1 de 1 a 3, ×2 de 4 a 6, ×3 de 7 a 9, ×4 con 10 o más).
   Un giro muy cerrado (con la fila larga hay que girar más abierto) o rozar una copa suelta a las últimas: se quedan dando
   vueltas donde se soltaron y se pueden recuperar. Decisión: entregar ya (seguro) o ir por dos más (puntúa mucho más).
   Dificultad: 0–40 s cerca y en campo abierto · 40–80 s entre árboles y sobre el agua · 80–120 s ráfagas de viento avisadas
   con hojas y sonido (empujan la cola: vuela recto) y cotorras dormilonas («Zz») que hay que rodear una vez para despertarlas.
   No hay botones nuevos: se juega volando (teclado, joystick o los botones de vuelo de siempre), así que machacar no sirve.
   Mallas: 3 instanciadas nuevas como mucho (las cotorras, con la geometría y el aleteo en el shader de bandada.js y los colores de
   las especies del Álbum; los carteles «?» y «Zz»). Grupos fijos (fila de 10 visibles + «+N», 14 sueltas o perdidas, rastro de 64
   puntos en un Float32Array): nada se crea por cuadro. Al salir se suelta todo (mallas, texturas, cámara, pausa).
   Mientras se juega la música del mundo calla (musica.js lee body.sigueme-on). El panel final es modal: congela el mundo
   (G.pausa 'sigueme') y no deja pasar teclas. «Reducir movimiento»: sin bamboleo de la cola en las ráfagas ni chispas;
   los avisos importantes (ráfaga, últimos segundos) también suenan.
   Récord en este dispositivo (localStorage, <almacen>.sigueme = { v: 1, mejor, fila, jugadas }); lo lee «Mis récords».
   API: window.AVSigueme(G) → G.siguemeApi = { jugar, salir, activo, paso, estado, test }. Lo abre menu_modos.js. Prueba: AV.siguemeTest(). */
window.AVSigueme = function (G) {
  'use strict';
  if (G.siguemeApi) return G.siguemeApi;
  const S = G.S, R = G.renderer;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -1e9; return w > -1e8 ? w : -Infinity; };
  const ALM = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.sigueme';
  const DUR = 120, VIS = 10, NP = 14, BUF = 64, PASO_R = 0.4, SEP = 1.5, UNE = 6, ENTREGA = 8, CERCA_R = 45, NC = 96, UNE_V = 10; // UNE_V: en vertical se une con más margen (posada sobre una copa, la de abajo también vale)
  const ESC_FILA = 1.95;
  const MEDALLA = { bronce: 30, plata: 70, oro: 120 };
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const html = document.documentElement;
  const reducido = () => html.classList.contains('mov-reducido') || !!(R && R.REDUCED);
  const reloj = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor < 100000 ? d : null; } catch (e) { return null; } };
  const guardarRec = (mejor, fila, jugadas) => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor, fila, jugadas })); } catch (e) { /* sin almacén */ } };
  const sonar = (n, a) => { try { if (!G.quiet && G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  let azarS = 0; const azar = () => { if (!azarS) return Math.random(); azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };
  const rnd = (a, b) => a + azar() * (b - a);
  const mult = n => (n >= 10 ? 4 : n >= 7 ? 3 : n >= 4 ? 2 : 1);
  const giroMax = n => (n < 4 ? Infinity : n < 7 ? 1.7 : n < 10 ? 1.25 : 0.95); // rad de cambio de rumbo en unos 2,5 m de camino
  const envolver = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

  // ---------- Estado (grupos fijos, sin asignaciones por cuadro) ----------
  const fila = []; for (let i = 0; i < VIS; i++) fila.push({ x: 0, y: 0, z: 0, yaw: 0, fase: 0, col: 0, tUne: 0, ox: 0, oz: 0 });
  const pool = []; for (let i = 0; i < NP; i++) pool.push({ on: false, tipo: 'suelta', x: 0, y: 0, z: 0, yaw: 0, fase: 0, col: 0, vuela: false, ang: 0, angPrev: 0, cx: 0, cz: 0, t: 0 });
  const cerca = []; for (let i = 0; i < NC; i++) cerca.push({ x: 0, z: 0, rc: 0, rc2: 0, y0: 0, y1: 0, top: 0 });
  let nCerca = 0;
  const TR = new Float32Array(BUF * 3); let trH = 0, trN = 0;
  const E = { fase: 'nada', t: 0, n: 0, extra: 0, puntos: 0, filaMax: 0, entregas: 0, soltadas: 0, mejor: 0, mejorFila: 0, jugadas: 0, nuevo: false,
    msgT: 0, avisos: 0, prox: 0, cercaT: 0, cortes: 0, avisoGiroT: 0, rafaga: 0, rafagaAviso: 0, proxRafaga: 0, rafDir: 0, chispaT: 0, giro: 0, camLejos: false, finP: 0 };
  const dorm = { x: 0, y: 0, z: 0, top: 0, ok: false };
  const guia = { x: 0, y: 0, z: 0 };
  const tmp = { x: 0, y: 0, z: 0 };
  let colores = [];
  const lin = h => new THREE.Color(h).convertSRGBToLinear();
  const PALETA = ['#3c9a45', '#5fae3c', '#2f8a4f', '#7bb83e'];
  function prepararColores() {
    const B = G.bandada; colores = [];
    try {
      const ids = B && B.poolEn ? B.poolEn(S.pos.x, S.pos.z).slice(0, 6) : [];
      for (const id of ids) { const c = B.colorDe(id); if (c) colores.push(c); }
    } catch (e) { colores = []; }
    if (!colores.length) colores = PALETA.map((h, i) => ({ id: 'pal' + i, c: lin(h), a: lin(h), cob: 0 }));
  }
  const restante = () => Math.max(0, DUR - E.t);
  const etapa = () => (E.t < 40 ? 0 : E.t < 80 ? 1 : 2);

  // ---------- Mallas: cotorras (geometría y material de bandada.js) y carteles «?» / «Zz» ----------
  const NM = VIS + NP;
  let malla = null, cartelQ = null, cartelZ = null, texQ = null, texZ = null, geoCartel = null, geoPropia = null, matPropio = null;
  const dummy = new THREE.Object3D();
  function texto(t, fondo, tinta) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = fondo; x.beginPath(); x.arc(64, 64, 56, 0, Math.PI * 2); x.fill();
    x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.35)'; x.stroke();
    x.fillStyle = tinta; x.font = '700 ' + (t.length > 1 ? 58 : 84) + 'px Fredoka, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 64, 70);
    const tx = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding; return tx;
  }
  function crearMallas() {
    if (malla) return;
    const B = G.bandada, base = B && B.meshes && B.meshes[0];
    let geo, mat;
    if (base && base.geometry && base.geometry.attributes.aParte) {
      geo = base.geometry.clone(); mat = base.material; // el material (y su aleteo) es el de la bandada: no se suelta al salir
      for (const k of ['iFase', 'iPose', 'iAcento']) if (geo.attributes[k]) geo.deleteAttribute(k);
    } else { // sin bandada: una cotorra sencilla de esferas
      const g = new THREE.SphereGeometry(0.16, 10, 8); g.scale(0.8, 0.85, 1.6); geo = g; mat = matPropio = new THREE.MeshLambertMaterial();
    }
    geo.setAttribute('iFase', new THREE.InstancedBufferAttribute(new Float32Array(NM), 1));
    geo.setAttribute('iPose', new THREE.InstancedBufferAttribute(new Float32Array(NM * 4), 4));
    geo.setAttribute('iAcento', new THREE.InstancedBufferAttribute(new Float32Array(NM * 3).fill(1), 3));
    geoPropia = geo;
    malla = new THREE.InstancedMesh(geo, mat, NM);
    malla.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NM * 3).fill(1), 3);
    texQ = texto('?', '#ffd23f', '#3b2a14'); texZ = texto('Zz', '#cfe3ff', '#24324a');
    geoCartel = new THREE.PlaneGeometry(0.62, 0.62);
    const matC = tx => new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false });
    cartelQ = new THREE.InstancedMesh(geoCartel, matC(texQ), NP); cartelZ = new THREE.InstancedMesh(geoCartel, matC(texZ), NP);
    for (const m of [malla, cartelQ, cartelZ]) {
      m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.userData.sinCulling = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(m);
    }
    malla.name = 'sigueme:cotorras'; cartelQ.name = 'sigueme:interrogacion'; cartelZ.name = 'sigueme:dormilona';
  }
  function soltarMallas() {
    for (const m of [malla, cartelQ, cartelZ]) if (m) { R.scene.remove(m); m.dispose(); if (m !== malla) m.material.dispose(); } // m.dispose(): suelta los búferes de instanceMatrix e instanceColor en la GPU
    if (geoPropia) geoPropia.dispose(); if (geoCartel) geoCartel.dispose(); if (texQ) texQ.dispose(); if (texZ) texZ.dispose(); if (matPropio) matPropio.dispose();
    malla = cartelQ = cartelZ = texQ = texZ = geoCartel = geoPropia = matPropio = null;
  }
  let nm = 0;
  function poner(x, y, z, pitch, yaw, roll, esc, col, fase, ala, cab) {
    if (nm >= NM) return;
    const k = colores[col % colores.length], ga = malla.geometry.attributes, i = nm++;
    dummy.position.set(x, y, z); dummy.rotation.set(pitch, yaw, roll); dummy.scale.setScalar(esc); dummy.updateMatrix();
    malla.setMatrixAt(i, dummy.matrix); malla.instanceColor.setXYZ(i, k.c.r, k.c.g, k.c.b);
    ga.iFase.setX(i, fase); ga.iPose.setXYZW(i, ala, cab, 0, k.cob || 0); ga.iAcento.setXYZ(i, k.a.r, k.a.g, k.a.b);
  }
  function pintar() {
    if (!malla) return;
    const ver = E.fase === 'juego', cam = R.camera, ahora = E.t;
    nm = 0; let nq = 0, nz = 0;
    if (ver) {
      for (let i = 0; i < E.n && i < VIS; i++) { const f = fila[i]; poner(f.x + f.ox, f.y, f.z + f.oz, 0, f.yaw, 0, ESC_FILA, f.col, f.fase, 1, 0); } // las tuyas, un poco más grandes que las de la bandada del mundo
      for (const p of pool) {
        if (!p.on) continue;
        const posada = p.tipo !== 'perdida' && !p.vuela;
        poner(p.x, p.y, p.z, posada ? -0.25 : 0, p.yaw, p.tipo === 'perdida' ? -0.35 : 0, 1.55, p.col, p.fase, posada ? 0 : 1, p.tipo === 'dormilona' ? 0.7 : 0);
        if (p.tipo === 'perdida') continue;
        const m = p.tipo === 'dormilona' ? cartelZ : cartelQ, j = p.tipo === 'dormilona' ? nz++ : nq++;
        dummy.position.set(p.x, p.y + 0.95 + (reducido() ? 0 : Math.sin(ahora * 3 + p.fase) * 0.08), p.z); dummy.quaternion.copy(cam.quaternion); dummy.scale.setScalar(1); dummy.updateMatrix();
        m.setMatrixAt(j, dummy.matrix);
      }
    }
    const ga = malla.geometry.attributes;
    malla.count = nm; malla.visible = ver && nm > 0; malla.instanceMatrix.needsUpdate = true; malla.instanceColor.needsUpdate = true;
    ga.iFase.needsUpdate = true; ga.iPose.needsUpdate = true; ga.iAcento.needsUpdate = true;
    cartelQ.count = nq; cartelQ.visible = ver && nq > 0; cartelQ.instanceMatrix.needsUpdate = true;
    cartelZ.count = nz; cartelZ.visible = ver && nz > 0; cartelZ.instanceMatrix.needsUpdate = true;
  }

  // ---------- Rastro de Vittata (buffer circular por distancia: cada seguidora va a (i + 1) · SEP m de camino) ----------
  const trX = k => TR[((trH - k + BUF) % BUF) * 3], trY = k => TR[((trH - k + BUF) % BUF) * 3 + 1], trZ = k => TR[((trH - k + BUF) % BUF) * 3 + 2];
  function trPon(x, y, z) { trH = (trH + 1) % BUF; TR[trH * 3] = x; TR[trH * 3 + 1] = y; TR[trH * 3 + 2] = z; if (trN < BUF) trN++; }
  function trReset(x, y, z) { trN = 0; trH = 0; for (let i = 0; i < 4; i++) trPon(x, y, z); }
  function enRastro(s, out) { // punto a s metros de camino detrás de Vittata
    let ax = S.pos.x, ay = S.pos.y + 0.6, az = S.pos.z;
    for (let k = 0; k < trN; k++) {
      const bx = trX(k), by = trY(k), bz = trZ(k), d = Math.hypot(bx - ax, by - ay, bz - az);
      if (d >= s && d > 1e-6) { const f = s / d; out.x = ax + (bx - ax) * f; out.y = ay + (by - ay) * f; out.z = az + (bz - az) * f; return out; }
      s -= d; ax = bx; ay = by; az = bz;
    }
    out.x = ax; out.y = ay; out.z = az; return out;
  }
  function rumbo(k0, k1) { if (k1 >= trN) return null; const dx = trX(k0) - trX(k1), dz = trZ(k0) - trZ(k1); return dx * dx + dz * dz > 0.09 ? Math.atan2(dx, dz) : null; }

  // ---------- Copas cercanas (se renueva cada medio segundo: los choques no recorren todos los colliders) ----------
  function renovarCerca() {
    nCerca = 0;
    const cs = G.fisica && G.fisica.colliders; if (!cs) return;
    const vx = S.pos.x, vz = S.pos.z;
    for (let i = 0; i < cs.length && nCerca < NC; i++) {
      const c = cs[i]; if (c.kind !== 'tree' && c.kind !== 'arbol') continue;
      const dx = c.x - vx, dz = c.z - vz; if (dx * dx + dz * dz > CERCA_R * CERCA_R) continue;
      const g = H(c.x, c.z), alto = c.h != null ? c.h : c.r * 9, e = cerca[nCerca++];
      e.x = c.x; e.z = c.z; e.rc = Math.max(1.2, Math.min(4.5, c.r * 4)); e.rc2 = e.rc * e.rc; e.y0 = g + alto * 0.5; e.y1 = g + alto; e.top = g + alto;
    }
  }
  function bajoCopa(x, z) { for (let i = 0; i < nCerca; i++) { const c = cerca[i], dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < (c.rc + 1) * (c.rc + 1)) return true; } return false; }
  function enCopa(x, y, z) { for (let i = 0; i < nCerca; i++) { const c = cerca[i], dx = x - c.x, dz = z - c.z; if (dx * dx + dz * dz < c.rc2 && y > c.y0 && y < c.y1) return true; } return false; }

  // ---------- Cotorras sueltas, dormilonas y perdidas ----------
  function libre() { for (const p of pool) if (!p.on) return p; return null; }
  function sueltasVivas() { let n = 0; for (const p of pool) if (p.on && p.tipo !== 'perdida') n++; return n; }
  function nacer(tipo) {
    const p = libre(); if (!p) return null;
    const et = etapa();
    p.on = true; p.tipo = tipo || (et === 2 && azar() < 0.35 ? 'dormilona' : 'suelta'); p.vuela = false; p.ang = 0; p.angPrev = 0; p.t = 0;
    p.fase = rnd(0, 6.28); p.col = Math.floor(rnd(0, 6)); p.yaw = rnd(0, 6.28);
    if (et >= 1 && nCerca && azar() < 0.6) { // entre árboles: posada en una copa
      for (let k = 0; k < 6; k++) {
        const c = cerca[Math.floor(azar() * nCerca)], d = Math.hypot(c.x - S.pos.x, c.z - S.pos.z);
        if (d > 12 && d < 40) { // revolotea junto a la copa, por fuera y a media altura: no hay que meterse en el follaje
          const a = rnd(0, Math.PI * 2), r = c.rc + 1.6; p.x = c.x + Math.cos(a) * r; p.z = c.z + Math.sin(a) * r;
          p.y = Math.max(H(p.x, p.z) + 1.2, c.y0); p.vuela = true; return p;
        }
      }
    }
    for (let k = 0; k < 8; k++) {
      const a = rnd(0, Math.PI * 2), d = et === 0 ? rnd(10, 26) : rnd(12, 34);
      const x = S.pos.x + Math.cos(a) * d, z = S.pos.z + Math.sin(a) * d, g = H(x, z), w = nivelAgua(x, z);
      if (w > g + 0.3) { if (et === 0 && k < 7) continue; p.x = x; p.z = z; p.y = w + 1.6; p.vuela = true; if (p.tipo === 'dormilona') p.tipo = 'suelta'; return p; } // sobre el agua: revolotea
      if (k < 7 && bajoCopa(x, z)) continue; // nunca debajo de una copa (se vería desde arriba y no se llega sin meterse en las hojas)
      p.x = x; p.z = z; p.y = g + 0.12; return p;
    }
    p.on = false; return null;
  }
  function perder(x, y, z, col) {
    let p = libre();
    if (!p) { // grupo lleno: la que se suelta no se pierde; deja su sitio la suelta o dormilona más lejana (ya nacerá otra cerca) o, si no hay, la perdida más vieja
      let bd = -1, bt = -1, q = null;
      for (const o of pool) { if (o.tipo !== 'perdida') { const d = (o.x - S.pos.x) ** 2 + (o.z - S.pos.z) ** 2; if (d > bd) { bd = d; p = o; } } else if (o.t > bt) { bt = o.t; q = o; } }
      p = p || q; if (!p) return;
    }
    p.on = true; p.tipo = 'perdida'; p.vuela = true; p.cx = x; p.cz = z; p.y = Math.max(y, H(x, z) + 1); p.x = x; p.z = z; p.ang = rnd(0, 6.28); p.t = 0; p.col = col; p.fase = rnd(0, 6.28);
  }
  function unir(p) {
    const n = E.n;
    if (n < VIS) {
      const f = fila[n]; f.x = p.x; f.y = p.y + 0.3; f.z = p.z; f.yaw = p.yaw; f.fase = p.fase; f.col = p.col; f.tUne = E.t; f.ox = f.oz = 0;
    } else E.extra++;
    p.on = false; E.n = n + 1; E.filaMax = Math.max(E.filaMax, E.n);
    sonar('semilla', Math.min(12, E.n)); // el silbido sube de tono con la fila
    if (E.n === 4 || E.n === 7 || E.n === 10) aviso(L(`¡Fila de ${E.n}!`, `Line of ${E.n}!`) + ' ×' + mult(E.n), 'oro');
    else aviso(L('¡Se unió!', 'Joined!'), 'bien');
    camara(); pintarHud();
  }
  function soltarCola(k, porQue) {
    k = Math.min(k, E.n); if (k <= 0) return 0;
    for (let j = 0; j < k; j++) {
      const ult = fila[Math.min(E.n, VIS) - 1];
      if (E.extra > 0) { E.extra--; perder(ult.x, ult.y, ult.z, (ult.col + j + 1) % 6); } else { perder(ult.x, ult.y, ult.z, ult.col); }
      E.n--;
    }
    E.soltadas += k; E.cortes = E.t + 1.0;
    sonar('frenada');
    aviso(porQue === 'copa' ? L(`Rozaste una copa: se soltaron ${k}`, `You brushed a treetop: ${k} let go`) : L(`Giro muy cerrado: se soltaron ${k}`, `Too sharp a turn: ${k} let go`), 'malo');
    camara(); pintarHud();
    return k;
  }
  function nuevoDormidero() {
    let mejor = null, mejorD = 0;
    for (let i = 0; i < nCerca; i++) { const c = cerca[i], d = Math.hypot(c.x - S.pos.x, c.z - S.pos.z); if (d > 22 && d > mejorD && (!dorm.ok || Math.hypot(c.x - dorm.x, c.z - dorm.z) > 15)) { mejor = c; mejorD = d; } }
    if (mejor) { dorm.x = mejor.x; dorm.z = mejor.z; dorm.top = mejor.top; }
    else { const a = rnd(0, Math.PI * 2), d = rnd(30, 40); dorm.x = S.pos.x + Math.cos(a) * d; dorm.z = S.pos.z + Math.sin(a) * d; dorm.top = Math.max(H(dorm.x, dorm.z), nivelAgua(dorm.x, dorm.z)) + 7; }
    dorm.y = dorm.top; dorm.ok = true;
  }
  function entregar() {
    const n = E.n, pts = n * mult(n);
    E.puntos += pts; E.entregas++;
    E.n = 0; E.extra = 0;
    try { if (G.fx && G.fx.burst) if (!reducido()) G.fx.burst(dorm.x, dorm.top, dorm.z, 'gold', 24); } catch (e) { /* sin fx */ }
    sonar('encaje'); if (n >= 7) sonar('logro');
    aviso(L(`¡Bandada a salvo! +${pts}`, `Flock safe! +${pts}`), 'oro');
    nuevoDormidero(); camara(); pintarHud();
  }
  // Con la fila de 4 o más, la cámara se aleja para verla (un poco con 4–6, más con 7 o más; solo el ajuste de siempre, como el minigolf)
  let cam0 = null, camN = 0;
  const CAM_D = [0, 1.2, 2.6], CAM_F = [0, 2.2, 4.6];
  function camara() {
    const C = G.camara && G.camara.CAM; if (!C) return;
    const nivel = E.fase !== 'juego' ? 0 : E.n >= 7 ? 2 : E.n >= 4 ? 1 : 0;
    if (nivel === camN) return;
    if (!cam0) cam0 = { dist: C.dist, distFly: C.distFly };
    // si otro módulo cambió la distancia mientras tanto, no se pisa
    if (C.dist === cam0.dist + CAM_D[camN]) C.dist = cam0.dist + CAM_D[nivel];
    if (C.distFly === cam0.distFly + CAM_F[camN]) C.distFly = cam0.distFly + CAM_F[nivel];
    camN = nivel; E.camLejos = nivel > 0; if (!nivel) cam0 = null;
  }

  // ---------- Paso ----------
  function paso(dt) {
    if (E.fase !== 'juego' || !(dt > 0)) return;
    E.t += dt;
    if (E.msgT > 0 && (E.msgT -= dt) <= 0 && hudEl) { const m = q(hudEl, 'msg'); m.textContent = ''; m.className = ''; }
    if ((E.cercaT -= dt) <= 0) { E.cercaT = 0.5; renovarCerca(); }
    const vx = S.pos.x, vy = S.pos.y + 0.6, vz = S.pos.z, red = reducido();
    // rastro y giro
    const lx = trX(0), ly = trY(0), lz = trZ(0);
    const salto = Math.hypot(vx - lx, vy - ly, vz - lz);
    if (salto > 6) trReset(vx, vy, vz); // un salto (teletransporte, otra vez): el rastro empieza de nuevo
    else if (salto >= PASO_R) {
      trPon(vx, vy, vz);
      const hA = rumbo(0, 2), hB = rumbo(5, 7);
      E.giro = hA != null && hB != null ? Math.abs(envolver(hA - hB)) : 0;
      const lim = giroMax(E.n) * (E.rafaga > 0 ? 0.6 : 1);
      if (E.giro > lim && E.t > E.cortes) soltarCola(Math.max(1, Math.min(3, Math.ceil((E.giro - lim) / 0.35))), 'giro');
      else if (E.giro > lim * 0.7 && E.n >= 4 && E.t > E.avisoGiroT && E.t > E.cortes + 1) { E.avisoGiroT = E.t + 3; sonar('aviso'); aviso(L('¡Gira más abierto!', 'Turn wider!'), 'malo'); } // aviso importante: también suena
    }
    // ráfagas (etapa 3): aviso con hojas y sonido, luego 2,5 s de viento que empuja la cola
    if (E.t >= 80) {
      if (!E.proxRafaga) E.proxRafaga = E.t + 2;
      if (!E.rafagaAviso && !E.rafaga && E.t >= E.proxRafaga) {
        E.rafagaAviso = 1.6; E.rafDir = rnd(0, Math.PI * 2); sonar('aviso');
        aviso(L('¡Viene una ráfaga! Vuela recto', 'A gust is coming! Fly straight'), 'malo');
        try { if (G.fx && G.fx.burst) if (!red) G.fx.burst(vx + Math.sin(E.rafDir) * 4, vy + 1.5, vz + Math.cos(E.rafDir) * 4, 'leaves', 18); } catch (e) { /* sin fx */ }
      }
      if (E.rafagaAviso > 0 && (E.rafagaAviso -= dt) <= 0) { E.rafagaAviso = 0; E.rafaga = 2.5; }
      if (E.rafaga > 0 && (E.rafaga -= dt) <= 0) { E.rafaga = 0; E.proxRafaga = E.t + rnd(7, 10); }
    }
    // la fila sigue el rastro
    const kk = 1 - Math.exp(-dt * 9), empuje = E.rafaga > 0 && !red ? Math.sin(Math.min(1, E.rafaga / 2.5) * Math.PI) : 0;
    const nv = Math.min(E.n, VIS);
    for (let i = 0; i < nv; i++) {
      const f = fila[i]; enRastro((i + 1) * SEP, tmp);
      const k = E.t - f.tUne < 1 ? 1 - Math.exp(-dt * 4) : kk; // la recién llegada vuela a su sitio
      const px = f.x, pz = f.z;
      f.x += (tmp.x - f.x) * k; f.y += (Math.max(tmp.y, H(tmp.x, tmp.z) + 0.35) - f.y) * k; f.z += (tmp.z - f.z) * k;
      const mx = f.x - px, mz = f.z - pz; if (mx * mx + mz * mz > 1e-6) f.yaw = Math.atan2(mx, mz);
      const sw = empuje * (i + 1) * 0.12; f.ox = Math.sin(E.rafDir) * sw; f.oz = Math.cos(E.rafDir) * sw;
      f.fase += dt * 0.3;
    }
    // ¿roza una copa? (no la recién llegada, que aún vuela a su sitio)
    if (E.t > E.cortes) for (let i = 0; i < nv; i++) { const f = fila[i]; if (E.t - f.tUne > 1.5 && enCopa(f.x + f.ox, f.y, f.z + f.oz)) { soltarCola(Math.min(3, E.n - i), 'copa'); break; } }
    // sueltas, dormilonas y perdidas
    for (const p of pool) {
      if (!p.on) continue;
      p.t += dt;
      const dx = p.x - vx, dz = p.z - vz, d2 = dx * dx + dz * dz;
      if (p.tipo === 'perdida') {
        p.ang += dt * (red ? 1.2 : 2.2); p.x = p.cx + Math.cos(p.ang) * 2.4; p.z = p.cz + Math.sin(p.ang) * 2.4; p.yaw = p.ang + Math.PI; p.fase += dt;
        if (p.t > 20) { p.tipo = 'suelta'; p.vuela = false; p.y = H(p.x, p.z) + 0.12; } // se cansa y se posa: sigue esperando
      } else if (p.tipo === 'dormilona') {
        if (d2 > 75 * 75) { p.on = false; continue; } // quedó muy atrás: no ocupa el sitio de una que nazca cerca
        // el ángulo se suma CON signo: solo una vuelta de verdad llega a 2π (ir y volver en zigzag se anula)
        if (d2 < 15 * 15) { const a = Math.atan2(dz, dx); if (p.t > 0 && p.angPrev !== 0) p.ang += envolver(a - p.angPrev); p.angPrev = a || 1e-6; }
        else { p.angPrev = 0; p.ang = Math.sign(p.ang) * Math.max(0, Math.abs(p.ang) - dt * 0.5); }
        if (Math.abs(p.ang) >= Math.PI * 2) { p.tipo = 'suelta'; p.t = 0; sonar('descubrir'); aviso(L('¡Se despertó!', 'She woke up!'), 'bien'); }
        continue;
      } else if (d2 > 75 * 75) { p.on = false; continue; } // quedó muy atrás: nace otra más cerca
      else { p.yaw = Math.atan2(-dx, -dz); }
      if (d2 < UNE * UNE && Math.abs(p.y - vy) < UNE_V && (p.tipo !== 'perdida' || p.t > 2.5)) unir(p); // la que se acaba de soltar no vuelve en el mismo giro
    }
    // nacen más sueltas
    if ((E.prox -= dt) <= 0) { E.prox = 0.5; if (sueltasVivas() < 4 + etapa()) nacer(); }
    // dormidero
    if (!dorm.ok) nuevoDormidero();
    if (E.n > 0 && Math.hypot(dorm.x - vx, dorm.z - vz) < ENTREGA && vy < dorm.top + 12) entregar();
    if (!red && (E.chispaT -= dt) <= 0) { E.chispaT = 1.4; try { if (G.fx && G.fx.burst && !G.quiet) G.fx.burst(dorm.x, dorm.top + 0.5, dorm.z, 'gold', 6); } catch (e) { /* sin fx */ } }
    const r = restante();
    if (E.avisos === 0 && r <= 10) { E.avisos = 1; sonar('aviso'); }
    if (E.avisos === 1 && r <= 5) { E.avisos = 2; sonar('aviso'); }
    pintar();
    if (r <= 0) { fin(); return; }
    if (hudEl && Math.floor((E.t - dt) * 4) !== Math.floor(E.t * 4)) pintarHud();
  }
  G.on('update', (dt, busy) => { if (!G.quiet && !busy) paso(Math.min(0.05, dt || 0)); });
  const guiar = () => { verHud(); if (E.fase === 'juego' && dorm.ok && G.fx && G.fx.guide) { guia.x = dorm.x; guia.y = dorm.top + 4; guia.z = dorm.z; G.fx.guide(guia, performance.now() / 1000); } };
  G.on('render', guiar, 61); // después de misiones.js (60): la flecha va al dormidero
  G.on('pausa', () => verHud()); // al terminar la carga sale el HUD

  // ---------- HUD y panel final ----------
  let hudEl = null, finEl = null;
  const ICONO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15q2-7 9-8 4 0 6 3l-3 1q2 3-1 6-5 3-11-2z" fill="#4caf50"/><path d="M14 7q4 0 6 3l-3 1z" fill="#e53935"/><circle cx="16.5" cy="9.5" r="1.2" fill="#fff"/><path d="M20 10l3 1.2-3 .8z" fill="#f2d16b"/><path d="M5 15l-3 4 5-2z" fill="#2e7d32"/><path d="M8 13q3-3 7-1" stroke="#1565c0" stroke-width="1.6" fill="none"/></svg>';
  function css() {
    if (document.getElementById('sig-css')) return;
    const st = document.createElement('style'); st.id = 'sig-css';
    st.textContent = '#sig-hud{position:fixed;left:12px;right:12px;margin-inline:auto;width:fit-content;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:60;display:flex;align-items:center;gap:6px 10px;flex-wrap:wrap;justify-content:center;box-sizing:border-box;padding:6px 8px 6px 14px;border-radius:20px;background:rgba(16,36,28,.86);color:#fff8e6;font:600 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}#sig-hud[hidden],#sig-fin[hidden]{display:none}' +
      '#sig-hud .sig-t{font-variant-numeric:tabular-nums;font-size:18px;font-weight:700;min-width:3.2ch;text-align:center}#sig-hud .sig-t.poco{color:#ffb4a2}#sig-hud .sig-p{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}#sig-hud .sig-r{opacity:.85;font-size:14px}' +
      '#sig-hud .sig-fila{display:flex;align-items:center;gap:1px;min-height:22px}#sig-hud .sig-fila svg{width:17px;height:17px;display:none}#sig-hud .sig-fila svg.on{display:block}#sig-hud .sig-fila svg:first-child{display:block;opacity:.45}#sig-hud .sig-fila svg.on:first-child{opacity:1}#sig-hud .sig-mas{font-size:14px;font-weight:700;margin-left:2px}#sig-hud .sig-x{font-size:14px;font-weight:700;color:#ffd23f;margin-left:4px}' +
      '#sig-hud [data-k="msg"]{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;max-width:calc(100vw - 24px);overflow:hidden;text-overflow:ellipsis;padding:4px 12px;border-radius:999px;font-weight:700;pointer-events:none;background:#fff3d6;color:#3b2a14}#sig-hud [data-k="msg"]:empty{display:none}#sig-hud [data-k="msg"].oro{background:#ffd23f;color:#3b2a14}#sig-hud [data-k="msg"].malo{background:#ffd0c4;color:#5a1e10}#sig-hud [data-k="msg"].bien{background:#c8f0c0;color:#173d12}' +
      '#sig-hud button,#sig-fin button{min-height:44px;min-width:44px;padding:4px 16px;border-radius:22px;border:0;font:700 16px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}#sig-fin button{min-height:54px;padding:4px 22px;font-size:18px}#sig-hud button.salir,#sig-fin button.salir{background:#ffd0c4}#sig-hud button:focus-visible,#sig-fin button:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}' +
      '#sig-fin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border-radius:24px;background:rgba(16,36,28,.95);color:#fff8e6;font-family:Fredoka,system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;gap:8px}#sig-fin:focus{outline:none}' +
      '#sig-fin h2{margin:0;font-size:26px}#sig-fin .sig-gran{display:flex;align-items:center;gap:8px;font-size:44px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}#sig-fin .sig-gran svg{width:42px;height:42px}#sig-fin p{margin:0;font-size:17px;font-weight:600}#sig-fin .sig-med{font-size:16px;padding:3px 12px;border-radius:999px;background:#fff3d6;color:#3b2a14}#sig-fin .sig-med:empty{display:none}#sig-fin .sig-det{font-size:15px;opacity:.85;font-weight:500}#sig-fin .sig-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}' +
      '@media (orientation:landscape) and (max-height:500px){#sig-fin{padding:12px 16px;gap:4px}#sig-fin h2{font-size:21px}#sig-fin .sig-gran{font-size:34px}}' +
      // la historia no se mezcla con el minijuego: fuera el letrero y los avisos de la misión, los bocadillos, la pista de Acción, los contadores
      // de la Patrulla, los combos y el poder (sus avisos esperan: G.menuModos.ocupado() cuenta este juego como actividad en marcha)
      'body.sigueme-on :is(#quest,#inv,#inv-cuenta,#inv-reporte,#modo-salir,#toast,#prompt,#bocadillos,#juice-chip,#juice-pop,#truco-chip,#fx-descubre,#v18-exp-poder,#v18-extra,#b-construir,#b-nido,#marcador,#retos,#pista-vuela){visibility:hidden!important}' +
      // con el panel final, tampoco las pistas de vuelo ni el minimapa: solo el resultado
      'body.sigueme-fin :is(#minimapa,#guia-hud,#keyhint,#acts,#stick,#emotes,#tag){visibility:hidden!important}';
    document.head.appendChild(st);
  }
  function montar() {
    if (hudEl) return;
    css();
    hudEl = document.createElement('div'); hudEl.id = 'sig-hud'; hudEl.hidden = true; hudEl.setAttribute('role', 'status');
    hudEl.innerHTML = '<span class="sig-t" data-k="r"></span><span class="sig-p" data-k="p"></span><span class="sig-fila" data-k="fila">' + ICONO.repeat(VIS) + '<span class="sig-mas" data-k="mas"></span><span class="sig-x" data-k="x"></span></span><span class="sig-r" data-k="rec"></span><span data-k="msg" aria-live="polite"></span><button type="button" class="salir" data-a="salir"></button>';
    finEl = document.createElement('div'); finEl.id = 'sig-fin'; finEl.hidden = true; finEl.tabIndex = -1; finEl.setAttribute('role', 'dialog'); finEl.setAttribute('aria-modal', 'true'); finEl.setAttribute('aria-labelledby', 'sig-fin-t');
    finEl.innerHTML = '<h2 id="sig-fin-t" data-k="ft"></h2><div class="sig-gran">' + ICONO + '<span data-k="fn"></span></div><p data-k="fmsg" aria-live="polite"></p><p class="sig-med" data-k="fmed"></p><p class="sig-det" data-k="fdet"></p><div class="sig-bots"><button type="button" data-a="otra"></button><button type="button" class="salir" data-a="salir"></button></div>';
    const clic = e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; e.preventDefault(); if (b.dataset.a === 'otra') jugar(); else salir(); };
    hudEl.addEventListener('click', clic); finEl.addEventListener('click', clic);
    document.body.appendChild(hudEl); document.body.appendChild(finEl);
  }
  const q = (el, k) => el.querySelector('[data-k="' + k + '"]');
  function pintarHud() {
    if (!hudEl) return;
    const r = q(hudEl, 'r'); r.textContent = reloj(restante()); r.classList.toggle('poco', restante() <= 10);
    q(hudEl, 'p').textContent = L(`${E.puntos} pts`, `${E.puntos} pts`);
    const fl = q(hudEl, 'fila'), ics = fl.querySelectorAll('svg');
    for (let i = 0; i < ics.length; i++) ics[i].classList.toggle('on', i < E.n);
    q(hudEl, 'mas').textContent = E.n > VIS ? '+' + (E.n - VIS) : '';
    q(hudEl, 'x').textContent = E.n > 0 ? '×' + mult(E.n) : '';
    fl.setAttribute('aria-label', L(`Fila: ${E.n}`, `Line: ${E.n}`));
    q(hudEl, 'rec').textContent = E.mejor && innerWidth >= 600 ? L('Récord ', 'Best ') + E.mejor : '';
    hudEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }
  function aviso(txt, cls) { if (!hudEl) return; const m = q(hudEl, 'msg'); m.textContent = txt; m.className = cls || ''; E.msgT = 1.6; }
  const medalla = p => (p >= MEDALLA.oro ? 'oro' : p >= MEDALLA.plata ? 'plata' : p >= MEDALLA.bronce ? 'bronce' : '');
  function pintarFin() {
    if (!finEl) return;
    const n = E.puntos, m = medalla(n);
    q(finEl, 'ft').textContent = L('¡Tiempo!', 'Time’s up!');
    q(finEl, 'fn').textContent = String(n);
    q(finEl, 'fmsg').textContent = E.nuevo ? L(`¡Nuevo récord: ${n} puntos!`, `New record: ${n} points!`)
      : n > 0 ? L(`Hiciste ${n} puntos. Récord: ${E.mejor}`, `You scored ${n} points. Best: ${E.mejor}`) : L('¡Casi! Junta cotorras y llévalas al árbol que brilla', 'So close! Gather parrots and lead them to the glowing tree');
    q(finEl, 'fmed').textContent = m === 'oro' ? L('Medalla de oro', 'Gold medal') : m === 'plata' ? L('Medalla de plata', 'Silver medal') : m === 'bronce' ? L('Medalla de bronce', 'Bronze medal') : '';
    q(finEl, 'fdet').textContent = L(`Fila más larga: ${E.filaMax} · Bandadas a salvo: ${E.entregas}`, `Longest line: ${E.filaMax} · Flocks safe: ${E.entregas}`);
    finEl.querySelector('[data-a="otra"]').textContent = L('Otra vez', 'Play again');
    finEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }

  // ---------- Partida ----------
  function jugar(o) {
    o = o || {};
    azarS = o.semilla || 0;
    montar(); crearMallas(); prepararColores();
    for (const p of pool) p.on = false;
    const rec = leerRec();
    Object.assign(E, { fase: 'juego', t: 0, n: 0, extra: 0, puntos: 0, filaMax: 0, entregas: 0, soltadas: 0, nuevo: false, msgT: 0, avisos: 0, prox: 0.5, cercaT: 0, cortes: 0, avisoGiroT: 0,
      rafaga: 0, rafagaAviso: 0, proxRafaga: 0, rafDir: 0, chispaT: 0, giro: 0, finP: 0,
      mejor: rec ? rec.mejor : 0, mejorFila: rec && Number.isInteger(rec.fila) ? rec.fila : 0, jugadas: rec && Number.isInteger(rec.jugadas) ? rec.jugadas : 0 });
    try { if (G.pausa && G.pausa.set) G.pausa.set('sigueme', false); } catch (e) { /* sin pausa */ }
    trReset(S.pos.x, S.pos.y + 0.6, S.pos.z);
    renovarCerca(); dorm.ok = false; nuevoDormidero();
    for (let i = 0; i < 3; i++) nacer('suelta'); // que no empiece con el cielo vacío
    finEl.hidden = true; q(hudEl, 'msg').textContent = '';
    document.body.classList.add('sigueme-on'); document.body.classList.remove('sigueme-fin');
    camara(); pintarHud(); pintar(); verHud();
    aviso(L('Junta cotorras y llévalas al árbol que brilla', 'Gather parrots and lead them to the glowing tree'), 'bien'); E.msgT = 4; // en su franja, no en un aviso grande que tape el HUD
    sonar('boton');
    return true;
  }
  let logroId = 0;
  function fin() {
    if (E.fase !== 'juego') return;
    E.fase = 'fin'; E.finP = performance.now() / 1000;
    for (const p of pool) p.on = false;
    E.jugadas++;
    E.nuevo = E.puntos > E.mejor; if (E.nuevo) E.mejor = E.puntos;
    if (E.filaMax > E.mejorFila) E.mejorFila = E.filaMax;
    guardarRec(E.mejor, E.mejorFila, E.jugadas);
    try { G.emit('record', { modo: 'sigueme', puntos: E.puntos, fila: E.filaMax }); } catch (e) { /* */ }
    sonar('panel_final'); if (E.nuevo && E.puntos > 0) logroId = setTimeout(() => { logroId = 0; if (E.fase === 'fin') sonar('logro'); }, 700);
    camara(); pintar(); pintarHud(); pintarFin(); finEl.hidden = false; hudEl.hidden = true; q(hudEl, 'msg').textContent = ''; document.body.classList.add('sigueme-fin'); // un solo «Salir»: el del panel
    try { if (G.pausa && G.pausa.set) G.pausa.set('sigueme', true); } catch (e) { /* sin pausa */ } // panel modal: el mundo se congela detrás
    // el foco va al panel (no a «Otra vez»): una tecla de vuelo de los últimos segundos no arranca otra partida sin ver el resultado
    setTimeout(() => { try { if (E.fase === 'fin') finEl.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
  }
  const activo = () => E.fase !== 'nada';
  // Durante la pantalla de carga (pausa 'carga') el HUD no sale encima: aparece cuando el mundo ya se ve
  const cargando = () => { try { return !!(G.pausa && G.pausa.motivos && G.pausa.motivos.has('carga')); } catch (e) { return false; } };
  function verHud() { if (hudEl) { const v = E.fase === 'juego' && !cargando(); if (hudEl.hidden === v) hudEl.hidden = !v; } }
  function salir() {
    if (!activo()) return false;
    E.fase = 'nada';
    for (const p of pool) p.on = false; E.n = 0; E.extra = 0; dorm.ok = false; nCerca = 0;
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    camara(); soltarMallas();
    if (hudEl) { hudEl.hidden = true; finEl.hidden = true; [hudEl, finEl].forEach(el => el.querySelectorAll('[data-k]').forEach(x => { if (x.dataset.k !== 'fila') x.textContent = ''; })); [hudEl, finEl].forEach(el => el.querySelectorAll('button').forEach(b => { b.textContent = ''; })); } // sin texto viejo (ni en otro idioma)
    document.body.classList.remove('sigueme-on', 'sigueme-fin');
    try { if (G.pausa && G.pausa.set) G.pausa.set('sigueme', false); } catch (e) { /* sin pausa */ }
    return true;
  }
  addEventListener('keydown', e => {
    if (!activo()) return;
    if (e.key === 'Escape') {
      if (e.repeat || (G.ui && G.ui.cardOpen)) return; // una tarjeta abierta encima se cierra primero
      e.preventDefault(); e.stopImmediatePropagation(); salir(); return;
    }
    if (E.fase === 'fin') { // el panel final es modal: las teclas del mundo (P, M, 1-7, vuelo…) no pasan; Tab, Enter y Espacio van a sus botones (no en el primer segundo)
      if (e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
      const boton = (e.key === 'Enter' || e.key === ' ') && performance.now() / 1000 - E.finP > 1 && e.target && e.target.closest && e.target.closest('#sig-fin button');
      e.stopImmediatePropagation(); if (!boton) e.preventDefault();
    }
  }, true);
  addEventListener('resize', () => { if (activo()) pintarHud(); });

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })(), pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const C = G.camara && G.camara.CAM, camD0 = C ? [C.dist, C.distFly] : null;
    const tecla = k => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); dispatchEvent(ev); dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); return ev; }; // con su keyup: que input.js no se quede con teclas pulsadas para las pruebas siguientes
    const lejos = () => { S.pos.x = pos0.x + 900; S.pos.z = pos0.z + 900; };
    const ir = (x, y, z) => { S.pos.x = x; S.pos.y = y - 0.6; S.pos.z = z; };
    const vivas = t => pool.filter(p => p.on && (!t || p.tipo === t));
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ }
      jugar({ semilla: 7, callado: true });
      const hb = hudEl.querySelector('[data-a="salir"]').getBoundingClientRect();
      check('Se abre con el HUD (reloj 2:00, puntos, fila y «Salir» de ≥ 44 px), cotorras sueltas con «?» y un dormidero', activo() && !hudEl.hidden && finEl.hidden && q(hudEl, 'r').textContent === '2:00' && /^0 pts$/.test(q(hudEl, 'p').textContent) && hb.height >= 44 && vivas('suelta').length === 3 && dorm.ok && document.body.classList.contains('sigueme-on'),
        q(hudEl, 'r').textContent + ' · ' + vivas().length + ' · ' + Math.round(hb.height));
      check('Se dibujan con 3 mallas instanciadas como mucho (cotorras, «?» y «Zz»)', malla && malla.visible && malla.count === 3 && cartelQ.visible && cartelQ.count === 3 && R.scene.children.filter(m => /^sigueme:/.test(m.name)).length === 3, malla && malla.count);
      { const hr = hudEl.getBoundingClientRect(); check('El HUD cabe en una sola franja arriba', hr.left >= 0 && hr.right <= innerWidth && hr.top >= 0 && hr.height <= 64, `${innerWidth}×${innerHeight} · HUD ${Math.round(hr.width)}×${Math.round(hr.height)}`); }
      check('La historia no se mezcla: cuenta como actividad (los avisos de la misión esperan) y su letrero, la pista de Acción y los contadores no se ven',
        (!G.menuModos || !G.menuModos.ocupado || G.menuModos.ocupado()) && ['toast', 'prompt', 'quest', 'inv-cuenta', 'bocadillos'].every(id => { const el = document.getElementById(id); return !el || getComputedStyle(el).visibility === 'hidden'; }));
      check('El minimapa marca el dormidero (la misma meta que la flecha)', !G.minimapa || !G.minimapa.marcadores || G.minimapa.marcadores().some(m => m.tipo === 'obj' && m.x === dorm.x && m.z === dorm.z));
      if (G.pausa && G.pausa.set && G.pausa.motivos) {
        const yaCarga = G.pausa.motivos.has('carga');
        G.pausa.set('carga', true); verHud(); const tapado = hudEl.hidden;
        if (!yaCarga) G.pausa.set('carga', false); verHud();
        check('Con la pantalla de carga el HUD espera y luego sale', tapado && (yaCarga || !hudEl.hidden));
      }
      check('La geometría y el aleteo son los de la bandada (o la de reserva sin ella)', !G.bandada || !G.bandada.meshes || malla.material === G.bandada.meshes[0].material, G.bandada ? 'bandada' : 'reserva');
      const ae = G.aula && G.aula.aj;
      let llegan = 0; const oye = () => { llegan++; }; addEventListener('keydown', oye); tecla('w'); tecla('ArrowLeft'); removeEventListener('keydown', oye);
      check('Con teclado y táctil se juega volando: las teclas de vuelo pasan al mundo y el joystick sigue a la vista', llegan === 2 && (() => { const st = document.getElementById('stick'); return !st || getComputedStyle(st).visibility !== 'hidden'; })());
      // Unirse: Vittata a menos de 6 m de una suelta
      E.prox = 1e9; lejos(); trReset(S.pos.x, S.pos.y + 0.6, S.pos.z);
      for (const p of pool) p.on = false;
      const sumar = () => { const p = nacer('suelta'); p.vuela = true; ir(p.x + 3, p.y, p.z); paso(0.02); return p; };
      const p1 = sumar(); lejos();
      check('Pasar a menos de 6 m: se une a la fila con «¡Se unió!»', E.n === 1 && !p1.on && /Se unió/.test(q(hudEl, 'msg').textContent) && fila[0].col === p1.col, E.n + ' · ' + q(hudEl, 'msg').textContent);
      for (let i = 0; i < 3; i++) sumar();
      check('Con 4, «¡Fila de 4! ×2» y el HUD lo cuenta', E.n === 4 && /Fila de 4! ×2/.test(q(hudEl, 'msg').textContent) && q(hudEl, 'x').textContent === '×2' && q(hudEl, 'fila').querySelectorAll('svg.on').length === 4 && (!C || (E.camLejos && C.distFly > camD0[1])), q(hudEl, 'msg').textContent);
      for (let i = 0; i < 4; i++) sumar();
      check('Con más de 6 la cámara se aleja un poco', !C || (E.camLejos && C.distFly > camD0[1]), C && C.distFly);
      // Volar recto: nadie se suelta y la fila calca el camino detrás de Vittata
      const x0 = S.pos.x, z0 = S.pos.z, y0 = Math.max(H(x0, z0), nivelAgua(x0, z0)) + 40; nCerca = 0; E.cercaT = 1e9;
      ir(x0, y0, z0); trReset(x0, y0, z0); for (let i = 0; i < 8; i++) { fila[i].x = x0; fila[i].y = y0; fila[i].z = z0; fila[i].tUne = -9; }
      for (let i = 0; i < 160; i++) { S.pos.x += 0.25; paso(0.02); }
      const ult = fila[7], dUlt = S.pos.x - ult.x;
      check('Volando recto la fila de 8 no se rompe y la última va detrás, a unos 12 m', E.n === 8 && dUlt > 9 && dUlt < 15 && Math.abs(ult.z - S.pos.z) < 0.5, 'n ' + E.n + ' · ' + dUlt.toFixed(1) + ' m');
      // Giro en U muy cerrado: se sueltan las últimas y dan vueltas donde estaban
      for (let i = 0; i < 6; i++) { S.pos.z += 0.25; paso(0.02); }
      for (let i = 0; i < 10; i++) { S.pos.x -= 0.25; paso(0.02); }
      const perdidas = vivas('perdida');
      check('Un giro muy cerrado suelta a las últimas («Giro muy cerrado: se soltaron N»), que se quedan dando vueltas', E.n < 8 && E.n >= 5 && perdidas.length === 8 - E.n && /Giro muy cerrado: se soltaron \d/.test(q(hudEl, 'msg').textContent), E.n + ' · ' + q(hudEl, 'msg').textContent);
      const pp = perdidas[0], ax0 = pp.x; paso(0.1); pp.t = 3;
      E.cortes = 0; trReset(S.pos.x, S.pos.y + 0.6, S.pos.z); const nAntes = E.n;
      ir(pp.cx + 1, pp.y, pp.cz); paso(0.02);
      check('Las perdidas dan vueltas y se pueden recuperar', pp.x !== ax0 && E.n === nAntes + 1 && !pp.on, E.n);
      { // con el grupo lleno, las que se sueltan tampoco se pierden: deja su sitio la suelta más lejana
        for (const p of pool) p.on = false;
        for (let i = 0; i < NP; i++) { const p = pool[i]; p.on = true; p.tipo = 'suelta'; p.t = 0; p.x = S.pos.x + 20 + i; p.z = S.pos.z; p.y = S.pos.y; }
        const nA = E.n, k = soltarCola(2, 'giro');
        check('Con el grupo de 14 lleno, las que se sueltan siguen dando vueltas (no desaparecen)', nA >= 2 && k === 2 && E.n === nA - 2 && vivas('perdida').length === 2, nA + ' · ' + vivas('perdida').length);
        for (let j = 0; j < 2; j++) { const f = fila[E.n]; f.tUne = -9; E.n++; } E.cortes = 0;
      }
      for (const p of pool) p.on = false; E.n = Math.min(E.n, 8);
      // Rozar una copa
      for (const f of fila) f.tUne = -9;
      const f3 = fila[Math.min(E.n, VIS) - 1], n3 = E.n; E.cortes = 0;
      const cc = cerca[0]; cc.x = f3.x; cc.z = f3.z; cc.rc = 2; cc.rc2 = 4; cc.y0 = f3.y - 2; cc.y1 = f3.y + 2; cc.top = f3.y + 2; nCerca = 1;
      paso(0.016); nCerca = 0;
      check('Rozar una copa suelta a las últimas («Rozaste una copa: se soltaron N»)', E.n < n3 && /Rozaste una copa/.test(q(hudEl, 'msg').textContent), n3 + ' → ' + E.n);
      for (const p of pool) p.on = false;
      // Entregar en el dormidero
      const nE = E.n, pE = nE * mult(nE), d0 = { x: dorm.x, z: dorm.z };
      ir(dorm.x + 2, dorm.top + 2, dorm.z); paso(0.02);
      check('En el dormidero se entrega: puntos = cotorras × multiplicador y «¡Bandada a salvo! +N»', E.n === 0 && E.puntos === pE && E.entregas === 1 && new RegExp('Bandada a salvo! \\+' + pE).test(q(hudEl, 'msg').textContent) && q(hudEl, 'p').textContent === pE + ' pts', nE + ' × ' + mult(nE) + ' = ' + E.puntos);
      check('Luego el dormidero cambia de sitio y la cámara vuelve', dorm.ok && Math.hypot(dorm.x - d0.x, dorm.z - d0.z) > 10 && (!C || (C.distFly === camD0[1] && C.dist === camD0[0])), Math.hypot(dorm.x - d0.x, dorm.z - d0.z).toFixed(1));
      check('La flecha de guía señala el dormidero', (() => { const g0 = G.fx && G.fx.guide; if (!g0) return true; let visto = null; G.fx.guide = t => { visto = t; }; try { guiar(); } finally { G.fx.guide = g0; } return visto && visto.x === dorm.x && visto.z === dorm.z; })());
      // Multiplicador
      check('Multiplicador ×1 (1–3), ×2 (4–6), ×3 (7–9), ×4 (10 o más)', [1, 3, 4, 6, 7, 9, 10, 14].map(mult).join('') === '11223344');
      // Dormilona: pasar cerca no basta; rodearla una vez la despierta
      lejos(); const dm = nacer('dormilona'); dm.tipo = 'dormilona'; dm.vuela = false; dm.x = S.pos.x + 9; dm.z = S.pos.z; dm.y = S.pos.y + 0.6; dm.t = 0.1;
      ir(dm.x + 3, dm.y, dm.z); paso(0.02); paso(0.02);
      const dormida = dm.on && dm.tipo === 'dormilona' && E.n === 0;
      for (let a = 0; a < 200; a++) { const s = a % 2 ? 0.8 : -0.8; ir(dm.x + 9 * Math.cos(s), dm.y, dm.z + 9 * Math.sin(s)); paso(0.02); }
      check('Ir y volver en zigzag a su lado no la despierta (hay que dar la vuelta de verdad)', dm.on && dm.tipo === 'dormilona', dm.ang.toFixed(2));
      for (let a = 0; a <= 64; a++) { const t = a / 64 * Math.PI * 2.1; ir(dm.x + Math.cos(t) * 9, dm.y, dm.z + Math.sin(t) * 9); paso(0.02); }
      check('Una dormilona («Zz») no se une al pasar; rodeándola una vez se despierta', dormida && dm.tipo === 'suelta' && cartelZ && cartelQ, dm.tipo + ' · ' + dm.ang.toFixed(2));
      ir(dm.x + 2, dm.y, dm.z); paso(0.02);
      check('…y entonces se une', E.n === 1 && !dm.on, E.n);
      for (const p of pool) p.on = false;
      { const d2 = nacer('dormilona'); d2.tipo = 'dormilona'; d2.x = S.pos.x + 80; d2.z = S.pos.z; d2.t = 0.1; paso(0.02);
        check('Una dormilona que queda muy atrás (más de 75 m) desaparece y deja nacer otra cerca', !d2.on); }
      { // en la etapa 2, la que espera en un árbol revolotea junto a la copa (por fuera), no dentro ni encima del follaje
        const t0 = E.t; E.t = 50; lejos(); const cx = S.pos.x + 25, cz = S.pos.z, gy = H(cx, cz), c = cerca[0];
        c.x = cx; c.z = cz; c.rc = 3; c.rc2 = 9; c.y0 = gy + 6; c.y1 = gy + 12; c.top = gy + 12; nCerca = 1;
        let vistas = 0, bien = 0;
        for (let i = 0; i < 40; i++) { for (const p of pool) p.on = false; const p = nacer('suelta'); if (!p) continue; const d = Math.hypot(p.x - cx, p.z - cz); if (d < c.rc + 3 && p.y > H(p.x, p.z) + 1) { vistas++; if (d > c.rc && !enCopa(p.x, p.y, p.z) && p.y < c.top && p.vuela) bien++; } }
        check('En los árboles esperan junto a la copa, por fuera y a media altura (no hay que meterse en las hojas)', vistas > 0 && bien === vistas, bien + '/' + vistas);
        for (const p of pool) p.on = false; nCerca = 0; E.t = t0;
      }
      { // «Reducir movimiento»: sin ráfagas de partículas, y el aviso de giro también suena
        const fx = G.fx, b0 = fx && fx.burst, au = G.audio, p0 = au && au.play; let chispas = 0; const sonidos = [];
        html.classList.add('mov-reducido'); const ptsA = E.puntos, entA = E.entregas;
        try {
          if (fx) fx.burst = () => { chispas++; };
          if (au) au.play = n => { sonidos.push(n); };
          G.quiet = false;
          E.n = 1; fila[0].tUne = -9; ir(dorm.x + 2, dorm.top + 2, dorm.z); paso(0.02);
          E.t = 85; E.proxRafaga = 85; E.rafaga = 0; E.rafagaAviso = 0; lejos(); trReset(S.pos.x, S.pos.y + 0.6, S.pos.z); paso(0.02);
          E.rafaga = 0; E.rafagaAviso = 0; E.proxRafaga = 1e9; E.t = 30;
          // giro de unos 0,7 × el límite con 4 en fila: «¡Gira más abierto!» con sonido
          for (let i = 0; i < 4; i++) { fila[i].tUne = -9; } E.n = 4; E.cortes = 0; E.avisoGiroT = 0;
          const x1 = S.pos.x, z1 = S.pos.z; trReset(x1, S.pos.y + 0.6, z1); sonidos.length = 0;
          for (let i = 0; i < 10; i++) { S.pos.x += 0.45; paso(0.02); }
          for (let i = 0; i < 8; i++) { S.pos.x += 0.45 * Math.cos(1.25); S.pos.z += 0.45 * Math.sin(1.25); paso(0.02); }
        } finally { G.quiet = true; E.puntos = ptsA; E.entregas = entA; if (fx) fx.burst = b0; if (au) au.play = p0; html.classList.remove('mov-reducido'); }
        const giroOk = /Gira más abierto/.test(q(hudEl, 'msg').textContent);
        check('Con «Reducir movimiento»: ni chispas al entregar ni hojas en la ráfaga, y «¡Gira más abierto!» suena', chispas === 0 && (!au || (giroOk && sonidos.includes('aviso'))), 'chispas ' + chispas + ' · ' + q(hudEl, 'msg').textContent + ' · ' + sonidos.join(','));
        for (const p of pool) p.on = false; E.n = 0;
      }
      // Ráfaga (etapa 3): se avisa con texto y sonido, y con ella un giro menor ya suelta
      E.t = 85; E.proxRafaga = 85; E.rafaga = 0; E.rafagaAviso = 0; lejos(); trReset(S.pos.x, S.pos.y + 0.6, S.pos.z); paso(0.02);
      const avisada = E.rafagaAviso > 0 && /ráfaga/i.test(q(hudEl, 'msg').textContent);
      for (let i = 0; i < 100 && !E.rafaga; i++) paso(0.02);
      check('Las ráfagas se avisan antes («¡Viene una ráfaga! Vuela recto») y luego soplan', avisada && E.rafaga > 0, E.rafaga.toFixed(2));
      E.rafaga = 0; E.proxRafaga = 1e9;
      // El reloj termina: panel modal
      lejos(); E.t = DUR - 0.05; paso(0.1);
      const fr = finEl.getBoundingClientRect(), bots = [...finEl.querySelectorAll('button')].map(b => b.getBoundingClientRect());
      check('El reloj termina: panel con puntos, «¡Nuevo récord!», la fila más larga, «Otra vez» y «Salir»', E.fase === 'fin' && !finEl.hidden && q(finEl, 'fn').textContent === String(pE) && new RegExp('Nuevo récord: ' + pE + ' puntos').test(q(finEl, 'fmsg').textContent) && /Fila más larga: 8/.test(q(finEl, 'fdet').textContent) && !malla.visible, q(finEl, 'fmsg').textContent + ' · ' + q(finEl, 'fdet').textContent);
      check('Con el panel final no quedan pistas del mundo detrás (minimapa ni pistas de vuelo)', document.body.classList.contains('sigueme-fin') && ['minimapa', 'guia-hud', 'keyhint'].every(id => { const el = document.getElementById(id); return !el || getComputedStyle(el).visibility === 'hidden'; }));
      check('El récord y la fila más larga se guardan en este dispositivo', (() => { const r = leerRec(); return r && r.mejor === pE && r.fila === 8 && r.jugadas === 1; })(), JSON.stringify(leerRec()));
      check('Cabe en la pantalla: panel dentro y botones del final ≥ 54 px', bots.every(b => b.height >= 54 && b.width >= 54) && fr.left >= 0 && fr.right <= innerWidth && fr.top >= 0 && fr.bottom <= innerHeight, `${innerWidth}×${innerHeight} · ${Math.round(fr.width)}×${Math.round(fr.height)}`);
      await new Promise(r => setTimeout(r, 30));
      const tP = tecla('p'), tE = tecla(' ');
      check('El panel es modal: el mundo queda en pausa, las teclas del mundo no pasan y el foco va al panel', (!G.pausa || !G.pausa.motivos || G.pausa.motivos.has('sigueme')) && tP.defaultPrevented && tE.defaultPrevented && E.fase === 'fin' && document.activeElement === finEl, (document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
      if (ae) {
        const idi0 = ae.idioma; ae.idioma = 'en'; pintarHud(); pintarFin();
        const txt = hudEl.textContent + ' ' + finEl.textContent;
        check('En inglés no queda texto en español (Time’s up!, Play again, Exit, Longest line)', /Time’s up!/.test(txt) && /Play again/.test(txt) && /Exit/.test(txt) && /Longest line: 8/.test(txt) && !/[áéíóúñ¡]|Salir|Otra vez|Récord|Fila|puntos/.test(txt), txt.slice(0, 160));
        ae.idioma = idi0; pintarHud(); pintarFin();
      }
      finEl.querySelector('[data-a="otra"]').click();
      check('«Otra vez» empieza limpio (2:00, 0 puntos, fila vacía, sin panel ni pausa)', E.fase === 'juego' && E.puntos === 0 && E.n === 0 && finEl.hidden && q(hudEl, 'r').textContent === '2:00' && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('sigueme')) && vivas('suelta').length === 3);
      lejos(); E.t = DUR; paso(0.1);
      check('Sin puntos, nunca castiga: «¡Casi!» y el récord sigue', /Casi/.test(q(finEl, 'fmsg').textContent) && leerRec().mejor === pE && q(finEl, 'fmed').textContent === '', q(finEl, 'fmsg').textContent);
      let soltadas = 0; for (const m of [malla, cartelQ, cartelZ]) m.addEventListener('dispose', () => { soltadas++; });
      finEl.querySelector('[data-a="salir"]').click();
      check('Al salir se sueltan las 3 mallas instanciadas (sus búferes de la GPU también)', soltadas === 3, soltadas);
      check('«Salir» lo quita todo (HUD, panel, clase, pausa, mallas fuera de la escena y cámara de siempre)', !activo() && hudEl.hidden && finEl.hidden && !document.body.classList.contains('sigueme-on') && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('sigueme')) && !malla && !R.scene.children.some(m => /^sigueme:/.test(m.name)) && (!C || (C.dist === camD0[0] && C.distFly === camD0[1])));
      jugar({ semilla: 3, callado: true });
      const ev = tecla('Escape');
      check('Esc en plena partida también sale', !activo() && ev.defaultPrevented && hudEl.hidden);
      check('Sonidos que ya existen (semilla, frenada, encaje, aviso, descubrir, panel_final, logro)', !G.audio || !G.audio.has || ['semilla', 'frenada', 'encaje', 'aviso', 'descubrir', 'panel_final', 'logro'].every(n => G.audio.has(n)));
    } catch (e) { check('Sin errores', false, e && (e.stack || e.message)); }
    finally {
      salir(); G.quiet = q0; azarS = 0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  G.siguemeApi = { jugar, salir, activo, paso, test, estado: () => ({ fase: E.fase, puntos: E.puntos, fila: E.n, filaMax: E.filaMax, restante: restante(), mejor: E.mejor, sueltas: sueltasVivas(), dormidero: dorm.ok ? { x: dorm.x, z: dorm.z } : null }),
    objetivo: () => (E.fase === 'juego' && dorm.ok ? dorm : null), // lo lee el minimapa (minimapa.js objetivo()): la estrella marca el dormidero, como la flecha
    _dev: { E, pool, fila } };
  return G.siguemeApi;
};
