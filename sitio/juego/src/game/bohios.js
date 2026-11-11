/* Juego · Interior de un bohío de Villa Raíz (G27, carril M).
   La escala la aplica mundo.js (×1,75 de fábrica; ?bohioEsc=1.25|1.5|1.75 para las capturas).
   El bohío más alto es el único cuya puerta (1,95 m) queda por encima de Vittata (1,75 m).
   Dentro, junto a la puerta, hay hamaca, tinaja y fogón. Colores del mismo vibrant_toon:
   madera cálida, crema y rojo teja mate. Vittata no se achica. La cámara se queda fuera del muro.
   Carga perezosa desde boot.js. window.AVBohios(G) → { listo, casa, vistas, test }. */
window.AVBohios = function (G) {
  'use strict';
  if (G.bohios) return G.bohios;
  const R = G.renderer, scene = R.scene, S = G.S;
  const ZONA = 'kelvin_aldea_rio_este', MODELO = 'bohio_redondo';
  const ALTO_MODELO = 3.626; // kit.js bohio_redondo.alto
  const ALTURA = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
  // Lineal, la misma familia que el atlas: crema (0.80, 0.71, 0.55), madera cálida y rojo teja (0.58, 0.22, 0.14).
  const COLOR = { madera: [0.45, 0.28, 0.16], crema: [0.80, 0.71, 0.55], piedra: [0.42, 0.34, 0.24], teja: [0.58, 0.22, 0.14] };
  const FRASES = {
    hamaca: 'La hamaca está fresca. Un buen sitio para descansar un momento.',
    tinaja: 'La tinaja guarda agua de lluvia. Fría, y alcanza para todos.',
    fogon: 'El fogón está apagado. Huele a leña de esta mañana.',
  };
  let casa = null, grupo = null, listoP = null;
  const montadas = {}; // BM13: id de instancia → grupo de muebles (Villa Raíz y una casa por aldea)

  const factor = () => G.bohiosFactor || 1;
  const casas = () => {
    const st = G.mundo && G.mundo.streaming;
    return (st && st.instancias || []).filter(I => I.zona === ZONA && I.modelo === MODELO && I.pos);
  };
  const otras = () => { // BM13: las casas amuebladas de las demás aldeas (mundo.js las marca en G.bohiosAmueblados)
    const st = G.mundo && G.mundo.streaming;
    return (st && st.instancias || []).filter(I => I.zona !== ZONA && I.modelo === MODELO && I.pos && G.esBohioAbierto && G.esBohioAbierto(I));
  };
  function elegir(lista) {
    const sp = (G.terreno.mapa && G.terreno.mapa.spawn) || { x: 134, z: 182.5 };
    const fija = G.esBohioAbierto && lista.find(I => G.esBohioAbierto(I)); if (fija) return fija;
    return lista.slice().sort((a, b) => (b.escala - a.escala) ||
      (Math.hypot(a.pos[0] - sp.x, a.pos[2] - sp.z) - Math.hypot(b.pos[0] - sp.x, b.pos[2] - sp.z)))[0] || null;
  }
  function localAMundo(I, lx, ly, lz) {
    const c = Math.cos(I.rotY), s = Math.sin(I.rotY), e = I.escala;
    return { x: I.pos[0] + (lx * c + lz * s) * e, y: I.pos[1] + ly * e, z: I.pos[2] + (-lx * s + lz * c) * e };
  }
  function girar(I, nx, nz) {
    const c = Math.cos(I.rotY), s = Math.sin(I.rotY);
    const x = nx * c + nz * s, z = -nx * s + nz * c, L = Math.hypot(x, z) || 1;
    return { x: x / L, z: z / L };
  }
  function vanoDe() {
    const M = G.solidos && G.solidos.vanos;
    const R = M && M.get && M.get(MODELO);
    return R && R.vanos && R.vanos[0] || null;
  }
  function puerta(I) {
    const v = vanoDe();
    if (!I || !v) return null;
    const p = localAMundo(I, v.x, 0, v.z);
    const n = girar(I, v.nx, v.nz);
    const suelo = G.terreno ? G.terreno.height(p.x + n.x * 0.7, p.z + n.z * 0.7) : I.pos[1];
    return {
      x: p.x + n.x * 0.7, z: p.z + n.z * 0.7, y: suelo + 0.02,
      dentroX: p.x - n.x * 0.35, dentroZ: p.z - n.z * 0.35,
      alto: (v.alto - v.y0) * I.escala, ancho: v.w * I.escala, nx: n.x, nz: n.z,
    };
  }
  function mat(rgb) {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2]), roughness: 0.92, metalness: 0 });
    m.name = 'bohio-interior';
    return m;
  }
  function pieza(geo, rgb, x, y, z) {
    const m = new THREE.Mesh(geo, mat(rgb));
    m.castShadow = m.receiveShadow = true;
    m.position.set(x, y, z);
    grupo.add(m);
    return m;
  }
  function tocar(frase) {
    G.ui.toast(frase, 2800);
  }
  function montar(I) {
    if (!I || montadas[I.id]) return;
    const suf = I.zona === ZONA ? '' : '@' + I.zona; // BM13: las de otras aldeas llevan la zona en el id
    if (!suf) casa = I;
    grupo = new THREE.Group();
    grupo.name = 'bohio-interior' + suf;
    grupo.userData.inst = I; // KIMI-333: referencia para la puerta de visibilidad de Modo Escuela
    montadas[I.id] = grupo;
    const v = vanoDe();
    const n = v ? girar(I, v.nx, v.nz) : { x: 0, z: 1 };
    const p = v ? localAMundo(I, v.x, 0, v.z) : { x: I.pos[0], y: I.pos[1], z: I.pos[2] };
    // Justo dentro de la puerta, al alcance de quien está en el umbral. Metros de mundo.
    const dentro = (lado, fondo) => ({ x: p.x - n.x * fondo + n.z * lado, z: p.z - n.z * fondo - n.x * lado });
    // BM6-8: a 1,0-1,4 m del umbral (Vittata mide 0,32 de radio): antes estaban a 0,4-0,7 m y tapaban la puerta
    const a = dentro(-0.6, 1.0), b = dentro(0.1, 1.4), c = dentro(0.65, 1.2);
    const yDe = p => (G.terreno ? G.terreno.height(p.x, p.z) : I.pos[1]);
    // Hamaca: dos postes y un lienzo de madera.
    const poste = new THREE.CylinderGeometry(0.045, 0.05, 0.85, 6);
    const pa = pieza(poste, COLOR.madera, 0, 0, 0); pa.position.set(a.x - n.z * 0.42, yDe(a) + 0.42, a.z + n.x * 0.42); // la hamaca gira con la normal de la puerta
    const pb = pieza(poste, COLOR.madera, 0, 0, 0); pb.position.set(a.x + n.z * 0.42, yDe(a) + 0.42, a.z - n.x * 0.42);
    const tela = pieza(new THREE.BoxGeometry(0.9, 0.06, 0.38), COLOR.crema, 0, 0, 0);
    tela.position.set(a.x, yDe(a) + 0.48, a.z);
    tela.rotation.y = Math.atan2(n.x, n.z);
    // Tinaja crema.
    const tin = pieza(new THREE.SphereGeometry(0.22, 12, 8), COLOR.crema, 0, 0, 0);
    tin.scale.set(1, 0.85, 1);
    tin.position.set(b.x, yDe(b) + 0.2, b.z);
    // Fogón de piedra con brasa de rojo teja, mate.
    pieza(new THREE.BoxGeometry(0.28, 0.16, 0.22), COLOR.piedra, 0, 0, 0).position.set(c.x - 0.16, yDe(c) + 0.08, c.z);
    pieza(new THREE.BoxGeometry(0.28, 0.16, 0.22), COLOR.piedra, 0, 0, 0).position.set(c.x + 0.16, yDe(c) + 0.08, c.z);
    const brasa = pieza(new THREE.SphereGeometry(0.07, 8, 6), COLOR.teja, 0, 0, 0);
    brasa.position.set(c.x, yDe(c) + 0.1, c.z);
    scene.add(grupo);
    grupo.updateMatrixWorld(true);
    if (G.solidos && G.solidos.agregar) G.solidos.agregar(grupo); // BM6-8: los muebles son sólidos
    const add = (id0, p, frase) => G.interaccion.add({
      id: id0 + suf, x: p.x, z: p.z, r: 1.35,
      label: () => (id0 === 'bohio-hamaca' ? 'Tocar la hamaca' : id0 === 'bohio-tinaja' ? 'Tocar la tinaja' : 'Tocar el fogón'),
      use: () => tocar(frase),
    });
    add('bohio-hamaca', a, FRASES.hamaca);
    add('bohio-tinaja', b, FRASES.tinaja);
    add('bohio-fogon', c, FRASES.fogon);
  }
  function preparar() {
    if (listoP) return listoP;
    listoP = (async () => {
      await (G.mundo && G.mundo.listo);
      const lista = casas();
      const I = elegir(lista);
      if (!I) return null;
      const st = G.mundo.streaming;
      if (st && st.alrededor) await st.alrededor(I.pos[0], I.pos[2]);
      if (st && st.terminar) await st.terminar();
      if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
      montar(I);
      return I;
    })();
    return listoP;
  }
  // BM13: las casas amuebladas de otras aldeas se montan solas cuando el streaming ya las ha colocado (sin forzar cargas): una comprobación por segundo.
  let vigilando = null;
  function vigilar() {
    if (vigilando) return;
    vigilando = setInterval(() => {
      if (!G.bohiosAmueblados || !G.bohiosAmueblados.some(A => !A.hecho)) { clearInterval(vigilando); return; }
      const lista = otras();
      for (const A of G.bohiosAmueblados) {
        if (A.hecho || Math.hypot(S.pos.x - A.x, S.pos.z - A.z) > 140) continue;
        const I = lista.find(J => J.colocado && Math.hypot(J.pos[0] - A.x, J.pos[2] - A.z) < 0.5);
        if (I) { montar(I); A.hecho = true; }
      }
    }, 1000);
  }
  // Para las pruebas: monta ya las casas de las otras aldeas (sin esperar a que Vittata se acerque).
  async function montarOtras() {
    await preparar();
    const st = G.mundo.streaming, res = [];
    for (const A of (G.bohiosAmueblados || [])) {
      if (st.alrededor) await Promise.race([st.alrededor(A.x, A.z), new Promise(r => setTimeout(r, 60000))]);
      if (st.terminar) await Promise.race([st.terminar(), new Promise(r => setTimeout(r, 60000))]);
      if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
      const I = otras().find(J => Math.hypot(J.pos[0] - A.x, J.pos[2] - A.z) < 0.5);
      if (I) { montar(I); A.hecho = true; res.push(I); }
    }
    return res;
  }
  // Tres encuadres para las capturas: aire, camino y puerta (Vittata en el umbral).
  function donde() {
    const I = casa || elegir(casas());
    const p = I && puerta(I);
    if (p) return { x: p.x, z: p.z };
    if (I && I.pos) return { x: I.pos[0], z: I.pos[2] };
    return null;
  }
  function vistas() {
    const I = casa || elegir(casas());
    if (!I) return null;
    const p = puerta(I);
    const cx = I.pos[0], cz = I.pos[2];
    const suelo = G.terreno ? G.terreno.height(cx + 6, cz + 8) : I.pos[1];
    return {
      aire: { x: cx, y: I.pos[1] + 18, z: cz + 4, vuelo: true, yaw: 0.1, cam: [cx + 6, I.pos[1] + 22, cz + 16], mirar: [cx, I.pos[1] + 1, cz] },
      camino: { x: cx + 7, y: suelo + 0.05, z: cz + 8, vuelo: false, yaw: Math.atan2(-(cx) + (cx + 7), -(cz) + (cz + 8)), cam: [cx + 9, suelo + 2.2, cz + 11], mirar: [cx, I.pos[1] + 1.2, cz] },
      puerta: p ? { x: p.x, y: p.y, z: p.z, vuelo: false, yaw: Math.atan2(-p.nx, -p.nz), cam: [p.x + p.nx * 3.2, p.y + 1.6, p.z + p.nz * 3.2], mirar: [I.pos[0], I.pos[1] + 1.1, I.pos[2]] } : null,
      casa: { id: I.id, escala: I.escala, alto: ALTO_MODELO * I.escala, x: cx, z: cz },
      puertaMedida: p,
    };
  }

  // CG-113 · Casa editable del bohío amueblado. Se entra en el mismo sitio (sin cuarto aparte).
  // CG-126: encendida para todos. ?interiores=1 sigue encendiéndola. G.interioresOn === false o ?interiores=0 la apaga.
  const casaOn = () => {
    if (/[?&]interiores=0\b/.test(location.search)) return false;
    if (G.interioresOn === false) return false;
    return true;
  };
  const casaDat = () => (window.AV_INTERIORES && window.AV_INTERIORES.casa) || { id: 'bohio_villa', cuerpo: 0.64, piezas: ['banco'] };
  const CASA_R = 1.6, ESC_GLB = 1.75;
  let dentroCasa = false, vanoHecho = false, casaLista = false, muebleP = null, muebleG = null;
  const dibujo = new THREE.Group(); dibujo.name = 'casa-piezas';
  function datosCasa() {
    if (window.AV_INTERIORES || !G.assets || !G.assets.script) return Promise.resolve(casaDat());
    return G.assets.script('content/comun/interiores.js').then(casaDat, casaDat);
  }
  function piezasGuardadas() {
    const id = casaDat().id, e = S.interiores && S.interiores.edificios && S.interiores.edificios[id];
    return (e && e.piezas) ? e.piezas.map(p => ({ t: p.t, x: p.x, z: p.z, r: p.r })) : [];
  }
  function guardarPiezas(lista) {
    const id = casaDat().id;
    if (!lista.length) {
      if (S.interiores && S.interiores.edificios) delete S.interiores.edificios[id];
      if (S.interiores && S.interiores.edificios && !Object.keys(S.interiores.edificios).length) S.interiores = null;
      return;
    }
    if (!S.interiores || S.interiores.v !== 1 || !S.interiores.edificios) S.interiores = { v: 1, edificios: {} };
    const piezas = lista.map(p => ({ t: p.t, x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, r: p.r | 0 }));
    S.interiores.edificios[id] = { piezas, estado: null };
  }
  function pintarPiezas() {
    while (dibujo.children.length) {
      const m = dibujo.children.pop();
      if (m.geometry) m.geometry.dispose();
      if (m.material && m.material.dispose) m.material.dispose();
    }
    const I = casa; if (!I) return 0;
    if (!dibujo.parent) G.renderer.scene.add(dibujo);
    for (const p of piezasGuardadas()) {
      const w = localAMundo(I, p.x, 0, p.z);
      const y = (G.terreno ? G.terreno.height(w.x, w.z) : I.pos[1]) + 0.2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.42), new THREE.MeshLambertMaterial({ color: 0xa56b3c }));
      m.name = 'casa-pieza'; m.userData.sinSolido = true; m.position.set(w.x, y, w.z);
      m.rotation.y = (I.rotY || 0) + p.r * Math.PI / 4;
      dibujo.add(m);
    }
    return dibujo.children.length;
  }
  function piezaValida(t, x, z, r) {
    const tipos = casaDat().piezas || ['banco'];
    return tipos.indexOf(t) >= 0 && Math.abs(x) <= CASA_R && Math.abs(z) <= CASA_R && Number.isInteger(r) && r >= 0 && r <= 7;
  }
  function colocar(t, x, z, r) {
    if (!casaOn() || !casa || !piezaValida(t, x, z, r)) return false;
    const lista = piezasGuardadas(); lista.push({ t, x, z, r }); guardarPiezas(lista); pintarPiezas(); return true;
  }
  function mover(i, x, z, r) {
    if (!casaOn() || !casa) return false;
    const lista = piezasGuardadas(); const p = lista[i];
    if (!p || !piezaValida(p.t, x, z, r)) return false;
    p.x = x; p.z = z; p.r = r; guardarPiezas(lista); pintarPiezas(); return true;
  }
  function ponerJugador(x, z) {
    S.pos.x = x; S.pos.z = z; S.pos.y = (G.terreno ? G.terreno.height(x, z) : S.pos.y) + 0.12; S.vy = 0;
    const M = G.fisica && G.fisica.MOVE;
    if (M) { M.flying = false; M.vx = M.vz = 0; M.grounded = true; }
  }
  function entrar() {
    if (!casaOn() || !casa) return false;
    const p = puerta(casa); if (!p) return false;
    ponerJugador(p.dentroX, p.dentroZ);
    dentroCasa = true;
    if (G.camara && G.camara.interior) G.camara.interior({});
    pintarPiezas();
    return true;
  }
  function salir() {
    if (!casa) return false;
    const p = puerta(casa);
    if (p) ponerJugador(p.x, p.z);
    dentroCasa = false;
    if (G.camara && G.camara.interior) G.camara.interior(null);
    return true;
  }
  function centroVano(p) { return { x: p.x - p.nx * 0.7, z: p.z - p.nz * 0.7 }; }
  function holgura(I) {
    const p = puerta(I); if (!p || !G.solidos || !G.solidos.dentro) return 0;
    const c = centroVano(p), tx = -p.nz, tz = p.nx;
    const y = (G.terreno ? G.terreno.height(c.x, c.z) : p.y) + 0.9;
    const hasta = (s) => { let w = 0; for (let d = 0; d <= 0.8; d += 0.02) { if (G.solidos.dentro(c.x + tx * d * s, c.z + tz * d * s, y) > -Infinity) break; w = d; } return w; };
    return Math.round((hasta(1) + hasta(-1)) * 100) / 100;
  }
  function ensanchar(I) {
    I = I || casa;
    const p = puerta(I); if (!p || !G.solidos || !G.solidos.recortar) return null;
    const cuerpo = casaDat().cuerpo || 0.64, radio = cuerpo / 2;
    const c = centroVano(p), tx = -p.nz, tz = p.nx;
    if (!vanoHecho) {
      const y0 = (G.terreno ? G.terreno.height(c.x, c.z) : p.y);
      const celda = (G.solidos.CELL || 0.3);
      if (G.solidos.abrirPaso) G.solidos.abrirPaso(c.x, c.z, Math.atan2(p.nz, p.nx), 0.9, cuerpo + celda, y0 - 0.05, y0 + Math.max(1.7, p.alto) - 0.08);
      else G.solidos.recortar(c.x - 1.2, c.z - 1.2, c.x + 1.2, c.z + 1.2, (x, z) => {
        const dx = x - c.x, dz = z - c.z;
        return Math.abs(dx * p.nx + dz * p.nz) <= 0.45 && Math.abs(dx * tx + dz * tz) <= radio + celda / 2;
      }, y0 - 0.02);
      vanoHecho = true;
    }
    return { anchoMalla: p.ancho, anchoPaso: holgura(I), cuerpo };
  }
  function mueble() {
    if (!casa || !G.assets || !G.assets.loadGLB) return Promise.reject(new Error('sin casa'));
    if (muebleP) return muebleP;
    const I = casa;
    muebleP = G.assets.loadGLB('assets/models/entorno/bohio_interior.glb', {
      b64: () => (window.AV_ENTORNO_B64 || {}).bohio_interior,
      script: 'assets/models/entorno/bohio_interior_glb.js',
      base: 'assets/models/entorno/',
      error: 'interior de bohío no disponible',
    }).then(g => {
      muebleG = new THREE.Group(); muebleG.name = 'casa-mueble';
      g.scene.traverse(o => { if (o.isMesh) o.userData.sinSolido = true; });
      muebleG.add(g.scene);
      const e = I.escala / ESC_GLB;
      muebleG.scale.setScalar(e);
      muebleG.position.set(I.pos[0], I.pos[1], I.pos[2]);
      muebleG.rotation.y = I.rotY || 0;
      G.renderer.scene.add(muebleG);
      return muebleG;
    }).catch(e => { muebleP = null; throw e; });
    return muebleP;
  }
  function listoCasa() {
    if (!casaOn() || !casa) return false;
    if (casaLista) return true;
    const p = puerta(casa); if (!p) return false;
    casaLista = true;
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    // QA-245: Poner y Mover quedan donde se entra. Salir queda en el vano, más cerca de la puerta.
    G.interaccion.add({
      id: 'casa-entrar', x: p.x, z: p.z, r: 1.6,
      visible: () => casaOn() && !dentroCasa,
      label: () => L('Entrar', 'Enter'),
      use: () => entrar(),
    });
    G.interaccion.add({
      id: 'casa-poner', x: p.dentroX, z: p.dentroZ, r: 1.4,
      visible: () => dentroCasa && piezasGuardadas().length === 0,
      label: () => L('Poner banco', 'Place bench'),
      use: () => colocar('banco', 0.4, 0.2, 1),
    });
    G.interaccion.add({
      id: 'casa-mover', x: p.dentroX, z: p.dentroZ, r: 1.4,
      visible: () => dentroCasa && piezasGuardadas().length > 0,
      label: () => L('Mover', 'Move'),
      use: () => { const a = piezasGuardadas()[0]; if (a) mover(0, a.x > 0 ? -0.3 : 0.4, a.x > 0 ? 0.5 : 0.2, a.x > 0 ? 2 : 1); },
    });
    G.interaccion.add({
      id: 'casa-salir', x: p.x, z: p.z, r: 0.28,
      visible: () => dentroCasa,
      label: () => L('Salir', 'Exit'),
      use: () => salir(),
    });
    return true;
  }
  // QA-244: al jugar, no solo en la prueba. CG-126: también sin ?interiores=1.
  function casaJugando() {
    if (!casaOn() || !casa || !puerta(casa)) return;
    if (!casaLista) listoCasa();
    if (!vanoHecho && G.solidos && (G.solidos.recortar || G.solidos.abrirPaso)) ensanchar(casa);
  }
  G.on('update', casaJugando, 44);

  // KIMI-333 (Modo Escuela): los muebles de los bohíos se recorren y frustum-cullan cada cuadro aunque
  // estén dentro de la casa y no se vean nunca desde fuera. Fuera de 60 m el grupo entero se apaga
  // (visible=false poda el recorrido de la escena entero); cullPequenos ya los sacaba del dibujo a
  // >55 m, pero tres los visitaba igual. Solo con calidad.escuela (en medio/alto todo sigue como antes).
  const ESCUELA_R = 60;
  function aplicarVisibilidadEscuela() {
    const esc = R.calidad && R.calidad.escuela === true;
    for (const id in montadas) {
      const g = montadas[id];
      if (!g || !g.parent) continue;
      const I = g.userData.inst;
      if (!esc || !I || !I.pos) { if (!g.visible) g.visible = true; continue; }
      g.visible = Math.hypot(S.pos.x - I.pos[0], S.pos.z - I.pos[2]) <= ESCUELA_R;
    }
  }
  G.on('render', aplicarVisibilidadEscuela, 18); // antes del sync3D de actores (15) y del draw

  // QA-79: con la máquina cargada la búsqueda de puertas (solidos.cerrarVanos, por tramos) aún no acabó cuando la prueba mide
  async function esperarVanos(ms) {
    const t0 = performance.now(), listo = () => { const R = G.solidos && G.solidos.vanos && G.solidos.vanos.get(MODELO); return !!(R && R.listo); };
    while (!listo() && performance.now() - t0 < (ms || 60000)) { if (G.solidos && G.solidos.terminar) G.solidos.terminar(true); await new Promise(r => setTimeout(r, 100)); }
    return listo();
  }
  // QA-201: con la puerta más estrecha que el cuerpo (0,62 m frente a 0,64) los puntos del anillo tocan las jambas a ambos lados y
  // penetra() pasa de 3 sin que nada estorbe; el centro libre se mira aparte: ningún sólido en la columna del cuerpo (0,6–1,2 m sobre el pie)
  const centroLibre = (x, z, pie) => { const y = pie(x, z); return [0.6, 0.9, 1.2].every(h => !(G.solidos.dentro(x, z, y + h) > -Infinity)); };
  async function test() {
    const out = [];
    const ok = (n, c, d) => out.push({ name: n, ok: !!c, extra: d == null ? '' : String(d) });
    const px = S.pos.x, py = S.pos.y, pz = S.pos.z;
    const C = G.camara && G.camara.CAM;
    const dist0 = C && C.dist, h0 = C && C.height;
    try {
      const I = await preparar();
      const f = factor();
      const lista = casas();
      ok('Villa Raíz tiene sus 13 bohíos redondos', lista.length === 13, lista.length);
      ok('La escala es una de las tres pedidas', f === 1.25 || f === 1.5 || f === 1.75, f);
      const altos = lista.map(B => ALTO_MODELO * B.escala);
      const menor = Math.min.apply(null, altos);
      const mayor = Math.max.apply(null, altos);
      const menorOrig = menor / f;
      ok('×1,25 y ×1,5 dejan la puerta del más alto por debajo de Vittata', f === 1.75, 'factor ' + f + ' · pico ' + menor.toFixed(2) + '–' + mayor.toFixed(2) + ' · origen ' + menorOrig.toFixed(2));
      const ch = G.actores && G.actores.player3D;
      const escV = ch && ch.root ? ch.root.scale.y * (ch.height || ALTURA) : ALTURA;
      ok('Vittata no se achica', !ch || escV > ALTURA - 0.05, escV.toFixed(2));
      ok('Hay hamaca, tinaja y fogón', !!(G.interaccion.find('bohio-hamaca') && G.interaccion.find('bohio-tinaja') && G.interaccion.find('bohio-fogon')));
      if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
      await esperarVanos();
      const p = puerta(I);
      const infoV0 = G.solidos && G.solidos.vanos && G.solidos.vanos.get(MODELO);
      // QA-nuevo-br1-1: la búsqueda de puertas a veces da «sin vanos» para el mismo modelo (intermitente, 1 de 4 corridas el 9-nov);
      // el detalle (radio, rejilla, partes, triángulos, ms) queda en el rojo para poder comparar con una corrida verde
      const infoV = infoV0 && { motivo: infoV0.motivo + ' · radio ' + infoV0.radio + ' · rejilla ' + infoV0.nx + '×' + infoV0.nz + ' · partes ' + (infoV0.partes ? infoV0.partes.length : '?')
        + ' · tri ' + (infoV0.partes ? infoV0.partes.reduce((a, q) => a + ((q.geo.index ? q.geo.index.count : q.geo.attributes.position.count) / 3), 0) : '?') + ' · ' + infoV0.ms + ' ms' };
      ok('La puerta del bohío más alto supera 1,75 m y a ×1,5 no llegaba', !!(p && p.alto >= ALTURA && p.alto * 1.5 / f < ALTURA), p ? p.alto.toFixed(2) + ' m · ancho ' + p.ancho.toFixed(2) : (infoV && infoV.motivo));
      if (p && G.solidos && G.camara && G.camara.place) {
        let sitio = null;
        for (let d = 0.4; d <= 3.2 && !sitio; d += 0.2) {
          const x = p.x + p.nx * d, z = p.z + p.nz * d, y = G.terreno.height(x, z) + 0.12;
          if (G.solidos.penetra(x, z, y, 1.2) === 0) sitio = { x, z, y, d };
        }
        ok('Frente a la puerta hay sitio para estar de pie', !!sitio, sitio ? 'a ' + sitio.d.toFixed(1) + ' m' : 'sin hueco');
        if (sitio) {
          S.pos.x = sitio.x; S.pos.z = sitio.z; S.pos.y = sitio.y;
          if (C && dist0 != null) { C.dist = dist0; C.height = h0; }
          G.camara.yaw = Math.atan2(-p.nx, -p.nz);
          G.camara.place(true);
          const cp = G.renderer.camera.position;
          const den = G.solidos.dentro(cp.x, cp.z, cp.y);
          const distH = Math.hypot(cp.x - S.pos.x, cp.z - S.pos.z);
          ok('En la puerta la cámara no se mete en el muro', !(den > -Infinity), den === -Infinity ? 'fuera' : String(den));
          // BM6-7: todo el segmento cabeza-cámara, cada 0,15 m, sin tocar un muro
          const hy = S.pos.y + (C && C.look || 1.4), nSeg = Math.max(2, Math.ceil(Math.hypot(cp.x - S.pos.x, cp.y - hy, cp.z - S.pos.z) / 0.15));
          let tocado = 0; for (let i = 1; i <= nSeg; i++) { const t = i / nSeg; if (G.solidos.dentro(S.pos.x + (cp.x - S.pos.x) * t, S.pos.z + (cp.z - S.pos.z) * t, hy + (cp.y - hy) * t) > -Infinity) tocado++; }
          ok('Entre la cabeza y la cámara no hay muro (segmento entero)', tocado === 0, tocado + ' de ' + nSeg + ' puntos');
          ok('La cámara no se pega a Vittata', distH >= 2.5, distH.toFixed(2));
        }
      } else ok('La puerta del bohío está medida', false, infoV ? infoV.motivo : 'sin vano');
      // BM6-1: solo la amueblada tiene la puerta abierta; las otras, con panel (sólido) aunque la malla sea compartida
      if (p && G.solidos && G.solidos.penetra) {
        const pie = (x, z) => { const t = G.terreno.height(x, z), g = G.solidos.altoEn ? G.solidos.altoEn(x, z, t + 0.9) : -Infinity; return (g > t ? g : t) + 0.05; };
        const enPunto = (x, z) => G.solidos.penetra(x, z, pie(x, z), 1.2);
        const enVano = q => enPunto(q.x - q.nx * 0.7, q.z - q.nz * 0.7);
        const otras = lista.filter(B => B !== I && B.colocado && B.pos);
        const cerradas = otras.filter(B => { const q = puerta(B); return q && enVano(q) > enVano(p); });
        ok('Solo la puerta del bohío amueblado está abierta', enVano(p) <= 3 && otras.length > 0 && cerradas.length === otras.length, 'abierta ' + enVano(p).toFixed(2) + ' (el cuerpo de Vittata, anillo de 0,3 m, roza las jambas de 0,62 m; fisica.js deja pasar si no aumenta)' + ' · cerradas ' + cerradas.length + '/' + otras.length);
        const pd = enPunto(p.dentroX, p.dentroZ);
        ok('BM6-8: dentro del umbral no hay muebles que estorben (el centro queda libre)', pd < 3 || centroLibre(p.dentroX, p.dentroZ, pie), pd.toFixed(2) + ' · de fuera a dentro: ' + [0, 0.25, 0.5, 0.7, 0.95, 1.2, 1.5, 2].map(d => enPunto(p.x - p.nx * d, p.z - p.nz * d)).join(' '));
      }
      // BM13: una casa amueblada más en Caney del Meandro, Embarcadero y Puerto de La Mina
      const A = G.bohiosAmueblados || [];
      ok('BM13: hay una casa amueblada en cada una de las 3 aldeas', A.length === 3, A.map(a => a.zona.replace('kelvin_aldea_', '') + ' ' + a.escala.toFixed(2)).join(' · '));
      const montOtras = await montarOtras();
      ok('BM13: las 3 casas se montan con sus muebles', montOtras.length === 3 && montOtras.every(J => montadas[J.id] && G.interaccion.find('bohio-hamaca@' + J.zona) && G.interaccion.find('bohio-tinaja@' + J.zona) && G.interaccion.find('bohio-fogon@' + J.zona)), montOtras.length);
      if (G.solidos && G.solidos.terminar) G.solidos.terminar(true);
      await esperarVanos();
      const uniforme = B => { const e = B.m && B.m.elements; return !e || (Math.abs(Math.hypot(e[0], e[1], e[2]) / Math.hypot(e[4], e[5], e[6]) - 1) < 0.05 && Math.abs(e[5]) > 0.98 * Math.hypot(e[4], e[5], e[6])); }; // las matrices con escala desigual o inclinadas no sirven para medir la puerta
      for (const J of montOtras) {
        const q = puerta(J), nom = J.zona.replace('kelvin_aldea_', '');
        ok('BM13 ' + nom + ': la puerta supera 1,75 m', !!(q && q.alto >= ALTURA), q ? q.alto.toFixed(2) + ' m · ancho ' + q.ancho.toFixed(2) : 'sin vano');
        if (!q || !G.solidos || !G.solidos.penetra) continue;
        const pie = (x, z) => { const t = G.terreno.height(x, z), g = G.solidos.altoEn ? G.solidos.altoEn(x, z, t + 0.9) : -Infinity; return (g > t ? g : t) + 0.05; };
        const enPunto = (x, z) => G.solidos.penetra(x, z, pie(x, z), 1.2);
        const enVano = r => enPunto(r.x - r.nx * 0.7, r.z - r.nz * 0.7);
        const cerr = (G.mundo.streaming.instancias || []).filter(B => B.zona === J.zona && B.modelo === MODELO && B !== J && B.colocado && B.pos && B.escala >= 0.6 && uniforme(B)); // con escala menor la puerta (<0,45 m) es más estrecha que el cuerpo y no se puede comparar
        const cc = cerr.filter(B => { const r = puerta(B); return r && enVano(r) > enVano(q); });
        ok('BM13 ' + nom + ': solo su puerta está abierta', enVano(q) <= 3 && cc.length === cerr.length, 'abierta ' + enVano(q).toFixed(2) + ' · cerradas ' + cc.length + '/' + cerr.length);
        const pd = enPunto(q.dentroX, q.dentroZ);
        ok('BM13 ' + nom + ': dentro del umbral el centro queda libre', pd <= 3 || centroLibre(q.dentroX, q.dentroZ, pie), pd.toFixed(2) + ' (3 = el cuerpo roza las jambas)' + (pd > 3 ? ' · centro libre: ' + centroLibre(q.dentroX, q.dentroZ, pie) : ''));
        let sitio = false;
        for (let d = 0.4; d <= 3.2 && !sitio; d += 0.2) { const x = q.x + q.nx * d, z = q.z + q.nz * d; if (G.solidos.penetra(x, z, G.terreno.height(x, z) + 0.12, 1.2) === 0) sitio = true; }
        ok('BM13 ' + nom + ': frente a la puerta hay sitio para estar de pie', sitio);
      }
      const onCasa = G.interioresOn, int0 = S.interiores;
      try {
        await datosCasa();
        G.interioresOn = undefined;
        ok('CG-126 · sin bandera, la casa se usa', casaOn() && entrar() === true);
        salir();
        G.interioresOn = false;
        ok('Con la casa apagada no se entra', entrar() === false);
        G.interioresOn = true;
        const pCasa = puerta(casa);
        ok('Entrar deja a Vittata dentro del mismo bohío', !!(pCasa && entrar() && Math.hypot(S.pos.x - pCasa.dentroX, S.pos.z - pCasa.dentroZ) < 0.25 && Math.hypot(S.pos.x - I.pos[0], S.pos.z - I.pos[2]) < 4 && Math.abs(S.pos.y - I.pos[1]) < 4));
        ok('En la puerta, Acción dice Entrar', listoCasa() && G.interaccion.find('casa-entrar').label() === 'Entrar');
        salir();
        S.pos.x = pCasa.x; S.pos.z = pCasa.z;
        const enPuerta = G.interaccion.nearest();
        ok('Jugando, en la puerta Acción es Entrar', !!(enPuerta && enPuerta.id === 'casa-entrar'), enPuerta && enPuerta.id);
        entrar();
        S.pos.x = pCasa.dentroX; S.pos.z = pCasa.dentroZ;
        const dentroAcc = G.interaccion.nearest();
        ok('Dentro, Acción dice Poner banco y no Salir', !!(dentroAcc && dentroAcc.id === 'casa-poner' && dentroAcc.label() === 'Poner banco'), dentroAcc && (dentroAcc.id + ' · ' + dentroAcc.label()));
        const poner = G.interaccion.find('casa-poner');
        ok('Dentro, Acción pone el banco y lo guarda', !!(poner && poner.visible() && poner.label() === 'Poner banco' && (poner.use(), S.interiores && S.interiores.edificios.bohio_villa.piezas[0].t === 'banco' && S.interiores.edificios.bohio_villa.piezas[0].r === 1)));
        const m0 = dibujo.children[0];
        ok('La pieza queda dentro de la casa', !!(m0 && Math.hypot(m0.position.x - I.pos[0], m0.position.z - I.pos[2]) < 3));
        const mov = G.interaccion.find('casa-mover');
        ok('Acción Mover cambia el sitio guardado', !!(mov && mov.visible() && (mov.use(), S.interiores.edificios.bohio_villa.piezas[0].x === -0.3 && S.interiores.edificios.bohio_villa.piezas[0].r === 2)));
        salir();
        while (dibujo.children.length) dibujo.remove(dibujo.children[0]);
        ok('Salir la deja en la puerta, sin otro cuarto', Math.hypot(S.pos.x - pCasa.x, S.pos.z - pCasa.z) < 0.25 && !dentroCasa);
        ok('Al volver se ve la pieza guardada', entrar() && dibujo.children.length === 1 && S.interiores.edificios.bohio_villa.piezas[0].z === 0.5);
        const g = await mueble();
        ok('El mobiliario del bohío queda en la casa, a la escala de la fachada', !!(g && g.parent === G.renderer.scene && Math.abs(g.scale.x - I.escala / 1.75) < 0.02 && Math.hypot(g.position.x - I.pos[0], g.position.z - I.pos[2]) < 0.05));
        const anchoAntes = pCasa.ancho;
        const van = ensanchar(I);
        const pDespues = puerta(I);
        const c = centroVano(pDespues);
        const pie = G.terreno.height(c.x, c.z) + 0.05;
        const cabe = G.solidos.penetra(c.x, c.z, pie, 1.2);
        ok('El paso llega a 0,64 m y la malla del vano no cambia', !!(van && van.anchoPaso >= 0.64 && cabe === 0 && Math.abs(pDespues.ancho - anchoAntes) < 0.001), (van ? van.anchoPaso + ' m · malla ' + pDespues.ancho.toFixed(2) : 'sin vano') + ' · cuerpo ' + cabe);
        if (G.guardado && G.guardado.save && G.guardado.load) {
          G.guardado.save(true);
          S.interiores = null;
          G.guardado.load(true);
          ok('La partida devuelve el banco', !!(S.interiores && S.interiores.edificios && S.interiores.edificios.bohio_villa && S.interiores.edificios.bohio_villa.piezas[0].t === 'banco'));
        }
      } finally {
        salir(); G.interioresOn = onCasa; S.interiores = int0;
        if (G.camara && G.camara.interior) G.camara.interior(null);
      }
      const vis = vistas();
      ok('Hay encuadre de aire, camino y puerta', !!(vis && vis.aire && vis.camino && vis.puerta), vis && vis.casa && (vis.casa.id + ' alto ' + vis.casa.alto.toFixed(2)));
    } catch (e) {
      ok('La prueba del bohío corre', false, e && (e.stack || e.message) || e);
    } finally {
      S.pos.x = px; S.pos.y = py; S.pos.z = pz;
      if (C && dist0 != null) { C.dist = dist0; C.height = h0; }
    }
    return { ok: out.every(r => r.ok), passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  preparar().catch(() => {});
  vigilar();
  const api = { get listo() { return preparar(); }, get casa() { return casa; }, montadas, otras, montarOtras, puertaDe: puerta, vistas, donde, preparar, test, factor, entrar, salir, colocar, mover, ensanchar, mueble, listoCasa, piezas: piezasGuardadas };
  G.bohios = api;
  return api;
};
