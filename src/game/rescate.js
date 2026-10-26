/* Juego · «Save the Parrot»: rescate del pichón (V9 bosque vivo, ficha 3 de docs/equipo/BOSQUE_VIVO_DISENO.md)
   Reto repetible de 2–3 minutos en el mundo libre (no en el Modo Retos), con reloj, medalla y «Otra vez». Se activa tras la
   crecida (S.step ≥ 6) en un cartel con caja nido junto al nido del criadero; desde entonces siempre está disponible.
   Un pichón se cayó del nido y hay que devolverlo a la caja nido. Sin enemigos: el «peligro» es cómico.
   Fases: cuenta 3-2-1 → buscar (el pichón pía cada 2 s en uno de 3 sitios al azar: Poza Honda, techo del taller o Charca de
   las Nubes; haz de guía) → agarrar (giro 1: la primera vez da un saltito y se aparta, cree que es un juego; a la segunda se
   deja; G.agarre lo lleva en la mano o, al volar, en las patas) → llevar (giro 2: un zorzal pardo curioso vuela al lado; si
   Vittata vuela recta más de 4 s con él, el pichón pía fuerte y hay que ladear o picar para que el zorzal se aburra y se vaya;
   nunca ataca ni quita nada) → giro 3, solo si existe G.clima: bajo la lluvia el pichón se esconde bajo el ala y llegar con
   menos de 10 s de lluvia da «bono seco» → fin (se suelta a menos de 1,5 m de la caja nido: plumas, tarjeta con tiempo,
   récord, medalla oro < 90 s, plata < 120 s, bronce al llegar; «Otra vez» y «Seguir»). El tiempo no cuenta para la historia.
   Criadero: cada rescate emite 'aprendizaje' { tipo: 'rescate', id: 'pichon-n' } (20 XP de cuidar, solo los 3 primeros de la
   partida) y 'rescates' (n) para que el criadero revise la cápsula «Pichón rescatado» (huevos.js, { rescates: 5 }).
   Récord: 'retosResultado' { modo: 'rescate', llego, ms, medalla, prueba } → records.js (libro de la casa); mejor tiempo
   propio en `<almacen>.rescate`. En la partida solo se escribe S.rescates (contador; S.rescate es memoria del reto en curso).
   Banquete (src/game/banquete.js): no arranca si el banquete está activo (G.banqueteApi.activo() o S.banquete) ni si Vittata
   lleva frutos; mientras dura, G.interaccion.modo toma la acción junto a la caja nido. El banquete puede consultar G.rescate.activo().
   [KELVIN] quién es el pichón, si el zorzal pardo puede salir (aquí: curioso, nunca malo) y el nombre en pantalla (aquí:
   «¡Salva al pichón!», en inglés «Save the Parrot»). Carga perezosa desde boot.js.
   window.AVRescate(G) → { jugar, salir, otraVez, agarrar, soltar, activo, estado, test }. Prueba: AV.rescateTest(). */
window.AVRescate = function (G) {
  'use strict';
  if (G.rescate) return G.rescate;
  const S = G.S, Rr = G.renderer, scene = Rr.scene, F = G.fisica, M = F.MOVE, AVE = window.AVE, $ = G.util.$;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -1e9; return w > -1e8 ? w : -Infinity; };
  const seco = (x, z) => H(x, z) > nivelAgua(x, z) + 0.15;
  const ALM = (G.pack.meta && G.pack.meta.almacen) || G.pack.id, ALMACEN = ALM + '.rescate';
  const CFG = Object.assign({
    paso: 6,
    sitios: [{ id: 'poza_honda', fuera: 9.5 }, { id: 'taller', techo: true }, { id: 'charca_nubes', fuera: 8.5 }],
    medallas: { oro: 90000, plata: 120000 }, xpMax: 3, capsula: 5,
  }, G.pack.rescate || {});
  const ALTURA = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
  const NIDO_R = 1.5, AGARRE_R = 2.2, DEJAR_R = 2.4, SALTO = 3.2, PIO_CADA = 2, RECTA_MAX = 4, GIRO_MIN = 0.52;
  const TXT = {
    titulo: '¡Salva al pichón!',
    cartel: 'Leer el cartel: ¡Salva al pichón!',
    inicio: '¡Un pichón se cayó del nido! Está piando por ahí. ¡Rápido, antes de que llueva!',
    salto: '¡Pío, pío! El pichón da un saltito: cree que es un juego. ¡Otra vez!',
    agarrado: '¡Lo tienes! Llévalo volando a la caja nido del cartel.',
    zorzal: 'Un zorzal pardo vino a curiosear. Si vuelas recto mucho rato, el pichón se pone nervioso.',
    susto: '¡PÍO! El pichón se asustó. Ladea o pica una vez para que el zorzal se aburra.',
    seVa: 'El zorzal se aburrió y se fue a buscar frutas.',
    lluvia: 'Llueve: el pichón se esconde bajo tu ala.',
    suelo: 'El pichón está en el suelo. Agárralo otra vez y llévalo a la caja nido.',
    ocupado: 'Termina primero el banquete: deja los frutos en el nido.',
    llevas: 'Tienes las patas ocupadas: suelta lo que llevas primero.',
  };
  // Dato real para el cartel (Wikipedia EN, «Puerto Rican amazon», consultada el 25-oct-2026; por verificar en USFWS/DRNA)
  const DATO = {
    texto: 'La cotorra puertorriqueña anida en huecos de árboles, sobre todo de palo colorado, y también en cajas nido de madera del programa de recuperación. Los pichones salen del nido a los 60–65 días.',
    fuente: 'Wikipedia (en): Puerto Rican amazon, consultada el 25 de octubre de 2026 (por verificar en USFWS/DRNA)',
    url: 'https://en.wikipedia.org/wiki/Puerto_Rican_amazon',
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lm = m => Rr.linMat ? Rr.linMat(m) : m; // recibe el material (QA-36: linMat no acepta un texto de color)
  const MS = o => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85 }, o, o.color ? { color: new THREE.Color(o.color) } : {}));
  const reloj = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const leerJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const escribir = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacén */ } };
  const propio = () => { const d = leerJSON(ALMACEN); return d && d.v === 1 ? d : { v: 1, mejor: null, jugadas: 0 }; };

  // ---------- Sonidos (sintéticos) ----------
  const A = G.audio;
  if (A && A.define && !A.has('pio')) {
    A.define('pio', (t, n, X) => { X.tone(2100, t, 0.1, { type: 'sine', to: 2600, gain: 0.07 }); X.tone(2500, t + 0.13, 0.12, { type: 'sine', to: 1900, gain: 0.06 }); });
    A.define('pio_fuerte', (t, n, X) => { for (let i = 0; i < 3; i++) X.tone(2400, t + i * 0.11, 0.09, { type: 'square', to: 3000, gain: 0.05 }); });
    A.define('rs_salto', (t, n, X) => { X.tone(700, t, 0.12, { type: 'triangle', to: 1300, gain: 0.08 }); });
    A.define('rs_fin', (t, n, X) => { for (let i = 0; i < 5; i++) X.tone(X.pent(i * 2 + 3, 523.25), t + i * 0.08, 0.25, { type: 'sine', gain: 0.1 }); });
    A.define('rs_cuenta', (t, n, X) => { X.tone(n ? 880 : 660, t, 0.14, { type: 'sine', gain: 0.1 }); });
  }
  const sonar = (n, a) => { try { if (A && A.play) A.play(n, a); } catch (e) { /* sin audio */ } };

  // ---------- Cartel con caja nido (junto al nido del criadero, o en la plaza) ----------
  function sitioCartel() {
    const it = G.interaccion.find('nido_criadero');
    let x, z;
    if (it) { x = it.x + 3.6; z = it.z - 1.8; } else { const p = G.terreno.poi && G.terreno.poi('plaza'); x = p ? p.x - 4 : 0; z = p ? p.z + 3 : 0; }
    return { x, z, y: H(x, z) };
  }
  function letrero(txt) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; const g = cv.getContext('2d');
    g.fillStyle = '#8a5a2b'; g.fillRect(0, 0, 512, 192); g.strokeStyle = '#5a3818'; g.lineWidth = 12; g.strokeRect(6, 6, 500, 180);
    g.fillStyle = '#fbf1dc'; g.font = 'bold 62px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 82, 470);
    g.font = '600 30px Fredoka, sans-serif'; g.fillStyle = '#ffd27a'; g.fillText('Save the Parrot', 256, 146, 470);
    const tex = new THREE.CanvasTexture(cv); if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const cartel = { g: null, x: 0, z: 0, y: 0, nido: null, it: null };
  function construirCartel() {
    if (cartel.g) return;
    const p = sitioCartel(), g = new THREE.Group(); g.name = 'rescate_cartel';
    const madera = MS({ color: '#6b4a2e', roughness: 0.95 }), clara = MS({ color: '#a8783f' });
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 8), madera); poste.position.y = 1.3; g.add(poste);
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.06), new THREE.MeshStandardMaterial({ map: letrero(TXT.titulo), roughness: 0.9 }));
    tabla.position.set(0, 1.35, 0.13); g.add(tabla);
    // Caja nido de madera (como las del programa de recuperación), con su agujero redondo
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.62), clara); caja.position.y = 2.95; g.add(caja);
    const techo = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.07, 0.78), madera); techo.position.y = 3.34; techo.rotation.x = 0.12; g.add(techo);
    const hueco = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), lm(new THREE.MeshBasicMaterial({ color: '#1d140b' }))); hueco.position.set(0, 3.02, 0.315); g.add(hueco);
    const percha = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), madera); percha.rotation.z = Math.PI / 2; percha.position.set(0, 2.72, 0.42); g.add(percha);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(p.x, p.y, p.z); g.visible = false; scene.add(g);
    Object.assign(cartel, { g, x: p.x, z: p.z, y: p.y, nido: { x: p.x, y: p.y + 2.75, z: p.z + 0.42 } });
    cartel.it = G.interaccion.add({ id: 'rescate_cartel', x: p.x, z: p.z, r: 2.6, visible: () => disponible() && !R.activo,
      label: () => TXT.cartel, use: () => abrirCartel() });
    // Percha de la caja: aterrizar encima ayuda a dejarlo (fisica.js)
    if (F.addPercha) cartel.percha = F.addPercha({ x: p.x, z: p.z, r: 0.5, y: p.y + 3.38, when: () => disponible() });
  }
  function recolocarCartel() {
    if (!cartel.g) return;
    const p = sitioCartel(); cartel.x = p.x; cartel.z = p.z; cartel.y = p.y;
    cartel.g.position.set(p.x, p.y, p.z); cartel.nido = { x: p.x, y: p.y + 2.75, z: p.z + 0.42 };
    if (cartel.it) { cartel.it.x = p.x; cartel.it.z = p.z; }
    if (cartel.percha) { cartel.percha.x = p.x; cartel.percha.z = p.z; cartel.percha.y = p.y + 3.38; }
  }
  const disponible = () => (S.step || 0) >= CFG.paso;
  function abrirCartel() {
    estilo();
    const d = propio();
    G.ui.showCard(`<div class="rs-card"><h2>${TXT.titulo}</h2><p>Un pichón se cayó de su nido. Búscalo por su pío, agárralo y devuélvelo a esta caja nido lo antes posible.</p>
      <p class="rs-dato">${DATO.texto}</p><p class="note">Fuente: <a href="${DATO.url}" target="_blank" rel="noopener">${DATO.fuente}</a></p>
      ${d.mejor ? `<p class="rs-rec">Tu mejor tiempo: <b>${reloj(d.mejor / 1000)}</b></p>` : ''}
      <div class="row"><button class="btn" id="rs-vamos" type="button">¡Vamos!</button><button class="btn sec" id="rs-luego" type="button">Ahora no</button></div></div>`);
    const b = $('rs-vamos'), c = $('rs-luego');
    if (b) { b.addEventListener('click', () => { G.ui.hideCard(); jugar(); }); b.focus({ preventScroll: true }); }
    if (c) c.addEventListener('click', () => G.ui.hideCard());
  }

  // ---------- Pichón: la cría del criadero en etapa bebé (sin tocar el rig); si no hay modelo, una figura sencilla ----------
  const pichon = { root: null, ch: null, vest: null, listo: null, saltando: null, base: { x: 0, y: 0, z: 0 } };
  function figura() {
    const g = new THREE.Group(), verde = MS({ color: '#3fae4a', roughness: 0.7 }), rojo = MS({ color: '#c8322a' }), pico = MS({ color: '#e8dcc0' });
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), verde); cuerpo.scale.set(1, 1.15, 1); cuerpo.position.y = 0.24; g.add(cuerpo);
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), verde); cabeza.position.set(0, 0.5, 0.05); g.add(cabeza);
    const frente = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), rojo); frente.position.set(0, 0.55, 0.16); g.add(frente);
    const pk = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 8), pico); pk.rotation.x = Math.PI / 2; pk.position.set(0, 0.48, 0.2); g.add(pk);
    for (const s of [1, -1]) { const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), MS({ color: '#111111' })); ojo.position.set(s * 0.07, 0.53, 0.13); g.add(ojo); }
    return g;
  }
  function crearPichon() {
    if (pichon.listo) return pichon.listo;
    return (pichon.listo = (async () => {
      let root = null;
      try {
        if (window.AVCharacter) {
          const ch = await window.AVCharacter.create();
          const E = window.AV_HUEVOS && window.AV_HUEVOS.etapas && window.AV_HUEVOS.etapas.find(e => e.id === 'bebe');
          const esc = (E && E.proporciones && E.proporciones.escala) || 0.5;
          ch.root.scale.setScalar(ALTURA * esc / ch.height);
          const info = { id: 'clasico', etapa: 'bebe', look: { species: 'vittata', accessories: {} }, escala: esc };
          try { pichon.vest = G.criadero && G.criadero.vestir ? G.criadero.vestir(ch, info) : null; } catch (e) { pichon.vest = null; }
          if (!pichon.vest) ch.applyLook(info.look);
          if (ch.clips && ch.clips.Idle) ch.play('Idle');
          ch.root.userData.sinCulling = true;
          pichon.ch = ch; root = ch.root;
        }
      } catch (e) { root = null; pichon.ch = null; }
      if (!root) root = figura();
      root.name = 'pichon'; root.visible = false; scene.add(root); pichon.root = root;
      return root;
    })());
  }
  function ponerPichon(x, y, z) {
    const r = pichon.root; if (!r) return;
    if (r.parent !== scene) scene.attach(r);
    pichon.base = { x, y, z }; r.position.set(x, y, z); r.visible = true;
  }
  const posPichon = () => (pichon.root ? pichon.root.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3());

  // ---------- Zorzal pardo (Margarops fuscatus): malla simple, curioso, nunca ataca ----------
  const zorzal = { g: null, alas: [], estado: 'off', t: 0, recta: 0, giro: 0, rumbo: null, visto: false, susto: false };
  function crearZorzal() {
    if (zorzal.g) return zorzal.g;
    const g = new THREE.Group(), pardo = MS({ color: '#6e5a48' }), pecho = MS({ color: '#d9cdb8' });
    const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), pardo); cuerpo.scale.set(0.9, 0.85, 1.5); g.add(cuerpo);
    const panza = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), pecho); panza.scale.set(0.8, 0.75, 1.2); panza.position.set(0, -0.03, 0.03); g.add(panza);
    const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), pardo); cabeza.position.set(0, 0.07, 0.19); g.add(cabeza);
    const pico = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.1, 6), MS({ color: '#e9d9a8' })); pico.rotation.x = Math.PI / 2; pico.position.set(0, 0.06, 0.3); g.add(pico);
    for (const s of [1, -1]) { // ojo claro, el rasgo del zorzal pardo («pearly-eyed thrasher»)
      const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), MS({ color: '#f3ecc8' })); ojo.position.set(s * 0.055, 0.09, 0.24); g.add(ojo);
      const ala = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.16), pardo); ala.geometry.translate(s * 0.15, 0, 0); ala.position.set(s * 0.06, 0.03, 0); g.add(ala); zorzal.alas.push(ala);
    }
    const cola = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.2), pardo); cola.position.set(0, 0, -0.24); g.add(cola);
    g.scale.setScalar(1.6); g.visible = false; g.name = 'zorzal'; scene.add(g); zorzal.g = g;
    return g;
  }
  const lado = () => ({ x: -S.facing.z, z: S.facing.x }); // a la derecha de Vittata
  function zorzalLlega() {
    crearZorzal(); const l = lado();
    Object.assign(zorzal, { estado: 'llega', t: 0, recta: 0, giro: 0, rumbo: Math.atan2(S.facing.x, S.facing.z), visto: true, susto: false });
    zorzal.g.position.set(S.pos.x + l.x * 9 + S.facing.x * 6, S.pos.y + 3, S.pos.z + l.z * 9 + S.facing.z * 6); zorzal.g.visible = true;
    G.ui.toast(TXT.zorzal, 3600);
    G.emit('rescateZorzal', 'llega');
  }
  function zorzalSeVa() {
    if (zorzal.estado === 'off' || zorzal.estado === 'seva') return;
    zorzal.estado = 'seva'; zorzal.t = 0; G.ui.toast(TXT.seVa, 2400); G.emit('rescateZorzal', 'seva');
  }
  function pasoZorzal(dt) {
    const z = zorzal; if (z.estado === 'off' || !z.g) return;
    z.t += dt;
    const l = lado(), obj = { x: S.pos.x + l.x * 2, y: S.pos.y + 1.2, z: S.pos.z + l.z * 2 };
    const p = z.g.position;
    if (z.estado === 'seva') {
      p.x += (p.x - S.pos.x) * dt * 1.5; p.z += (p.z - S.pos.z) * dt * 1.5; p.y += dt * 4; // se aleja hacia arriba
      if (z.t > 1.6) { z.estado = 'off'; z.g.visible = false; }
    } else {
      const k = Math.min(1, dt * (z.estado === 'llega' ? 2.2 : 5));
      p.x += (obj.x - p.x) * k; p.y += (obj.y - p.y) * k; p.z += (obj.z - p.z) * k;
      if (z.estado === 'llega' && Math.hypot(p.x - obj.x, p.z - obj.z) < 0.6) z.estado = 'junto';
      // Rumbo: «recto» mientras el giro acumulado sea pequeño; un giro > 30° o un picado cuentan como maniobra
      const rumbo = Math.atan2(S.facing.x, S.facing.z);
      let d = rumbo - z.rumbo; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      z.rumbo = rumbo; z.giro += Math.abs(d);
      const picado = M.flying && S.vy < -4;
      if (z.estado === 'junto') {
        if (z.susto) { if (z.giro >= GIRO_MIN || picado) zorzalSeVa(); }
        else if (M.flying) {
          if (Math.abs(d) < 0.02) z.recta += dt; else if (z.giro > 0.35) { z.recta = 0; z.giro = 0; }
          if (z.recta > RECTA_MAX) { z.susto = true; z.giro = 0; sonar('pio_fuerte'); G.ui.toast(TXT.susto, 3600); G.emit('rescateZorzal', 'susto'); }
        }
        if (!z.susto && z.t > 14) zorzalSeVa(); // se aburre solo
      }
    }
    z.g.lookAt(S.pos.x + S.facing.x * 30, p.y, S.pos.z + S.facing.z * 30);
    const ab = Math.sin(performance.now() / 1000 * 22) * 0.7;
    z.alas[0].rotation.z = ab; z.alas[1].rotation.z = -ab;
  }

  // ---------- Estado del reto ----------
  const R = { activo: false, fase: '', t: 0, cuenta: 0, sitio: null, intentos: 0, pio: 0, lluvia: 0, bono: false, llevaT: 0, prueba: false, resultado: null };
  const banqueteActivo = () => !!((G.banqueteApi && G.banqueteApi.activo && G.banqueteApi.activo()) || S.banquete);
  const frutosEnPatas = () => { try { return !!(G.banquete && G.banquete.estado && G.banquete.estado().llevo > 0); } catch (e) { return false; } };
  const lleva = () => (G.agarre && G.agarre.lleva ? G.agarre.lleva() : null);
  const llevaPichon = () => { const h = lleva(); return !!(h && h.id === 'pichon'); };
  const lloviendo = () => { try { return !!(G.clima && (G.clima.lloviendo ? G.clima.lloviendo() : /llovizna|aguacero/.test(G.clima.estado && G.clima.estado().tipo))); } catch (e) { return false; } };

  function sitioPichon(s) {
    const p = G.terreno.poi ? G.terreno.poi(s.id) : null; if (!p) return null;
    if (s.techo) { const y = F.suelo(p.x, p.z, H(p.x, p.z) + 40); return { id: s.id, x: p.x, z: p.z, y }; }
    const a0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < 16; i++) {
      const a = a0 + i * Math.PI / 8, x = p.x + Math.cos(a) * (s.fuera || 6), z = p.z + Math.sin(a) * (s.fuera || 6);
      if (seco(x, z)) return { id: s.id, x, z, y: H(x, z) };
    }
    return { id: s.id, x: p.x + (s.fuera || 6), z: p.z, y: Math.max(H(p.x + (s.fuera || 6), p.z), nivelAgua(p.x, p.z)) };
  }
  async function jugar(o) {
    o = o || {};
    if (R.activo) return false;
    if (!o.forzar && !disponible()) return false;
    if (banqueteActivo() || frutosEnPatas()) { G.ui.toast(TXT.ocupado, 3000); return false; }
    if (lleva()) { G.ui.toast(TXT.llevas, 3000); return false; }
    construirCartel();
    const lista = CFG.sitios.map(sitioPichon).filter(Boolean);
    const sitio = o.sitio ? lista.find(s => s.id === o.sitio) : lista[Math.floor(Math.random() * lista.length)];
    if (!sitio) return false;
    Object.assign(R, { activo: true, fase: 'carga', t: 0, cuenta: o.sinCuenta ? 0 : 3.2, sitio, intentos: 0, pio: 0, lluvia: 0, bono: false, llevaT: 0, prueba: !!o.prueba, resultado: null });
    S.rescate = { sitio: sitio.id };
    zorzal.estado = 'off'; zorzal.visto = false; if (zorzal.g) zorzal.g.visible = false;
    G.interaccion.modo = modo;
    estilo(); hud(true);
    await crearPichon();
    if (!R.activo) return false; // salió mientras cargaba el modelo
    ponerPichon(sitio.x, sitio.y, sitio.z);
    if (!o.sinCuenta) G.ui.toast(TXT.inicio, 3600);
    R.fase = R.cuenta > 0 ? 'cuenta' : 'buscar'; pintarHud();
    return true;
  }
  function limpiar() {
    R.activo = false; S.rescate = null;
    if (G.interaccion.modo === modo) G.interaccion.modo = null;
    if (zorzal.g) zorzal.g.visible = false; zorzal.estado = 'off';
    hud(false);
  }
  function salir() {
    if (!R.activo) return false;
    if (llevaPichon()) G.agarre.soltar({ instantaneo: true });
    if (pichon.root) pichon.root.visible = false;
    limpiar(); R.fase = '';
    return true;
  }
  // Giro 1: la primera vez se aparta de un saltito; la segunda se deja agarrar
  function agarrar() {
    if (!R.activo || (R.fase !== 'buscar' && R.fase !== 'suelo') || !pichon.root || llevaPichon()) return false;
    const p = posPichon();
    if (R.intentos === 0) {
      R.intentos = 1;
      let dx = p.x - S.pos.x, dz = p.z - S.pos.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      let tx = p.x + dx * SALTO, tz = p.z + dz * SALTO;
      if (!seco(tx, tz)) { tx = p.x - dz * SALTO; tz = p.z + dx * SALTO; }
      const ty = R.sitio && R.sitio.techo ? F.suelo(tx, tz, p.y + 1) : H(tx, tz);
      pichon.saltando = { de: { x: p.x, y: p.y, z: p.z }, a: { x: tx, y: ty, z: tz }, t: 0 };
      ponerPichon(tx, ty, tz); pichon.root.position.set(p.x, p.y, p.z);
      sonar('rs_salto'); sonar('pio'); G.ui.toast(TXT.salto, 2800); G.emit('rescateSalto');
      return false;
    }
    pichon.saltando = null; ponerPichon(p.x, p.y, p.z);
    const ok = G.agarre.agarrar(pichon.root, { id: 'pichon' });
    if (ok) { R.fase = 'llevar'; R.intentos++; sonar('pio'); G.ui.toast(TXT.agarrado, 3000); }
    return ok;
  }
  const distNido = (x, z) => (cartel.nido ? Math.hypot(x - cartel.nido.x, z - cartel.nido.z) : Infinity);
  function soltar(o) {
    o = o || {};
    if (!llevaPichon()) return false;
    const enNido = distNido(S.pos.x, S.pos.z) <= DEJAR_R;
    G.agarre.soltar({ en: enNido ? cartel.nido : undefined, instantaneo: !!o.instantaneo });
    return true;
  }
  // La acción junto a la caja nido (con el pichón en las patas) es «Dejar»; en el resto, la de siempre
  const modo = {
    activo: () => R.activo && llevaPichon() && distNido(S.pos.x, S.pos.z) <= DEJAR_R,
    accion: () => soltar(), aviso: () => 'Acción: Dejar al pichón en la caja nido', verbo: 'Dejar',
  };
  G.on('soltado', (id, obj, pos) => {
    if (id !== 'pichon' || !R.activo) return;
    if (pos && distNido(pos.x, pos.z) < NIDO_R) terminar();
    else { R.fase = 'suelo'; G.ui.toast(TXT.suelo, 2600); }
  });
  // Interactuable del pichón (se mueve con él)
  const itPichon = G.interaccion.add({ id: 'pichon', x: 0, z: 0, r: AGARRE_R, visible: () => R.activo && (R.fase === 'buscar' || R.fase === 'suelo') && !llevaPichon() && !pichon.saltando,
    label: () => 'Agarrar al pichón', use: () => agarrar() });

  function medallaDe(ms) { return ms < CFG.medallas.oro ? 'oro' : ms < CFG.medallas.plata ? 'plata' : 'bronce'; }
  async function terminar() {
    const ms = Math.max(1000, Math.round(R.t * 1000)), medalla = medallaDe(ms);
    R.fase = 'fin';
    const n = S.rescates = (S.rescates || 0) + 1;
    const companero = (() => { try { return G.criadero && G.criadero.companero ? G.criadero.companero() : null; } catch (e) { return null; } })();
    const d = propio(), nuevo = !R.prueba && (!d.mejor || ms < d.mejor);
    if (!R.prueba) { d.jugadas++; if (nuevo) d.mejor = ms; escribir(ALMACEN, d); }
    R.resultado = { ms, medalla, n, nuevo, mejor: d.mejor, bono: R.bono, companero: !!companero };
    if (pichon.root && cartel.nido) ponerPichon(cartel.nido.x, cartel.nido.y + 0.3, cartel.nido.z - 0.2);
    limpiar(); R.fase = 'fin';
    sonar('rs_fin'); setTimeout(() => sonar('pio'), 400);
    if (cartel.nido) G.fx.burst(cartel.nido.x, cartel.nido.y + 0.6, cartel.nido.z, 'feathers', 26);
    if (G.actores && G.actores.playEmote) { try { G.actores.playEmote('celebrar'); } catch (e) { /* sin gesto */ } }
    if (n <= CFG.xpMax) G.emit('aprendizaje', { tipo: 'rescate', id: 'pichon-' + n });
    G.emit('rescates', n);
    G.emit('rescateFin', R.resultado);
    try { if (!G.recordsApi && !window.AVRecords) await AVE.assets.script('src/game/records.js'); if (window.AVRecords) window.AVRecords(G); } catch (e) { /* sin récords */ }
    G.emit('retosResultado', { modo: 'rescate', llego: true, ms, medalla, prueba: R.prueba });
    tarjeta();
    return R.resultado;
  }
  function tarjeta() {
    const r = R.resultado; if (!r) return;
    estilo();
    const med = { oro: 'Oro', plata: 'Plata', bronce: 'Bronce' }[r.medalla];
    G.ui.showCard(`<div class="rs-card rs-fin"><h2>¡Pichón a salvo!</h2>
      <div class="rs-res"><span class="rs-med ${r.medalla}" aria-hidden="true">★</span><div><b>${reloj(r.ms / 1000)}</b><small>Medalla de ${med}</small></div></div>
      <p>${r.nuevo ? '¡Nuevo récord de la casa!' : r.mejor ? 'Récord de la casa: <b>' + reloj(r.mejor / 1000) + '</b>' : ''}${r.bono ? ' · ¡Bono seco!' : ''}</p>
      ${r.companero ? '<p>Tu cría también vino a ver al pichón: ¡dos pichones en el nido!</p>' : ''}
      <p class="note">Rescates: ${r.n}. Oro en menos de ${CFG.medallas.oro / 1000} s, plata en menos de ${CFG.medallas.plata / 1000} s.</p>
      <div class="row"><button class="btn" id="rs-otra" type="button">Otra vez</button><button class="btn sec" id="rs-seguir" type="button">Seguir</button></div></div>`);
    const b = $('rs-otra'), c = $('rs-seguir');
    if (b) { b.addEventListener('click', () => otraVez()); b.focus({ preventScroll: true }); }
    if (c) c.addEventListener('click', () => G.ui.hideCard());
  }
  function otraVez(o) {
    if (G.ui.cardOpen) G.ui.hideCard();
    if (R.activo) salir();
    return jugar(Object.assign({ prueba: R.prueba }, o));
  }

  // ---------- HUD: reloj del reto ----------
  let hudEl = null;
  function hud(on) {
    if (!on) { if (hudEl) hudEl.hidden = true; return; }
    if (!hudEl) {
      hudEl = document.createElement('div'); hudEl.id = 'rs-hud'; hudEl.setAttribute('role', 'status');
      hudEl.innerHTML = '<span class="rs-t">' + TXT.titulo + '</span><b class="rs-reloj">0:00</b><button class="rs-salir" type="button">Salir</button>';
      hudEl.querySelector('.rs-salir').addEventListener('click', () => salir());
      document.body.appendChild(hudEl);
    }
    hudEl.hidden = false; pintarHud();
  }
  function pintarHud() {
    if (!hudEl || hudEl.hidden) return;
    const el = hudEl.querySelector('.rs-reloj'), t = R.fase === 'cuenta' ? (Math.ceil(R.cuenta - 0.2) > 0 ? String(Math.ceil(R.cuenta - 0.2)) : '¡Ya!') : reloj(R.t);
    if (el.textContent !== t) el.textContent = t;
  }
  let estiloListo = false;
  function estilo() {
    if (estiloListo) return; estiloListo = true;
    const st = document.createElement('style'); st.id = 'rs-estilo';
    st.textContent = `#rs-hud{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%);z-index:30;display:flex;gap:10px;align-items:center;
      background:var(--c-panel,#fff8ec);color:var(--c-ink,#2b2116);border-radius:999px;padding:6px 8px 6px 16px;box-shadow:0 4px 14px rgba(0,0,0,.25);font:600 16px Fredoka,system-ui,sans-serif}
      #rs-hud .rs-reloj{font-size:22px;min-width:3.2em;text-align:center;font-variant-numeric:tabular-nums}
      #rs-hud .rs-salir{border:0;border-radius:999px;padding:6px 12px;background:var(--c-accent-soft,#f2e2c4);color:inherit;font:inherit;cursor:pointer;min-height:36px}
      .rs-card h2{margin-top:0}.rs-card .rs-dato{background:rgba(63,174,74,.12);border-radius:10px;padding:8px 10px}
      .rs-res{display:flex;gap:14px;align-items:center;margin:8px 0}.rs-res b{font-size:34px;display:block;font-variant-numeric:tabular-nums}
      .rs-med{display:inline-grid;place-items:center;width:56px;height:56px;border-radius:50%;font-size:28px;color:#fff;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}
      .rs-med.oro{background:#e6b422}.rs-med.plata{background:#9aa6ad}.rs-med.bronce{background:#b87333}`;
    document.head.appendChild(st);
  }

  // ---------- Bucle ----------
  G.on('update', (dt, busy) => {
    if (disponible() && !cartel.g) construirCartel();
    if (cartel.g) cartel.g.visible = disponible();
    if (pichon.root && pichon.root.visible && !llevaPichon()) { const p = posPichon(); itPichon.x = p.x; itPichon.z = p.z; }
    const s = pichon.saltando; // el saltito del giro 1 va con el tiempo del juego (0,5 s), no con el cuadro
    if (s && pichon.root) {
      s.t += dt / 0.5; const k = Math.min(1, s.t), r = pichon.root.position;
      r.set(s.de.x + (s.a.x - s.de.x) * k, s.de.y + (s.a.y - s.de.y) * k + Math.sin(k * Math.PI) * 1.1, s.de.z + (s.a.z - s.de.z) * k);
      if (k >= 1) pichon.saltando = null;
    }
    if (!R.activo || busy || R.fase === 'carga') return;
    if (R.fase === 'cuenta') {
      const antes = Math.ceil(R.cuenta - 0.2); R.cuenta -= dt; const ahora = Math.ceil(R.cuenta - 0.2);
      if (ahora !== antes) sonar('rs_cuenta', ahora > 0 ? 1 : 0);
      if (R.cuenta <= 0) { R.fase = 'buscar'; }
      pintarHud(); return;
    }
    R.t += dt;
    if (R.fase === 'buscar' || R.fase === 'suelo') { R.pio += dt; if (R.pio >= PIO_CADA) { R.pio = 0; sonar('pio'); } }
    if (R.fase === 'llevar') {
      R.llevaT += dt;
      if (!zorzal.visto && M.flying && R.llevaT > 3) zorzalLlega();
      if (lloviendo()) { if (R.lluvia === 0) G.ui.toast(TXT.lluvia, 2400); R.lluvia += dt; }
      R.bono = !!G.clima && R.lluvia > 0 && R.lluvia < 10;
    }
    pasoZorzal(dt);
    pintarHud();
  });
  G.on('render', dt => {
    if (R.activo && R.fase !== 'cuenta' && R.fase !== 'carga') G.fx.guide(llevaPichon() ? cartel.nido : (pichon.root ? posPichon() : null), performance.now() / 1000);
    if (pichon.saltando) { /* el saltito lo mueve el update */ } else if (pichon.root && pichon.root.visible && !llevaPichon() && R.activo) {
      pichon.root.position.y = pichon.base.y + Math.abs(Math.sin(performance.now() / 1000 * 5)) * 0.06; // saltitos de espera
      pichon.root.rotation.y = Math.atan2(S.pos.x - pichon.root.position.x, S.pos.z - pichon.root.position.z);
    }
    if (pichon.ch && pichon.root && pichon.root.visible) {
      const v = pichon.vest;
      try { if (v) v.antes(); pichon.ch.update(Math.min(dt, 0.05)); if (v) v.despues(); } catch (e) { /* sin animación */ }
    }
  }, 65); // después de misiones.js (60), que también usa el haz de guía
  G.on('apply', () => { if (R.activo) salir(); if (pichon.root) pichon.root.visible = false; recolocarCartel(); }, 96);
  // Si el criadero recoloca su nido, el cartel lo sigue
  G.on('companero', () => recolocarCartel());

  // =====================================================================================================================
  // Prueba (AV.rescateTest)
  // =====================================================================================================================
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const SV = G.guardado, claves = ['', '.tmp', '.prev'].map(s => SV.KEY + s);
    const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const comparable = d => { const o = {}; for (const k of SV.KEYS) if (k !== 'rescates' && k !== 'clock' && k !== 'marcador') o[k] = d && d[k]; return JSON.stringify(o); }; // clock y el cronómetro del marcador avanzan con cada tick de la prueba
    const realAntes = claves.map(leer), sAntes = comparable(S), propioAntes = leer(ALMACEN), errores0 = (window.__aveErrores || []).length;
    const guard = { quiet: G.quiet, step: S.step, rescates: S.rescates, pos: Object.assign({}, S.pos), facing: Object.assign({}, S.facing), flying: M.flying, grounded: M.grounded, swimming: M.swimming, pausa: G.pausa.activa(), banq: G.banqueteApi, sbanq: S.banquete };
    const ce = console.error, errores = []; console.error = function () { errores.push(Array.from(arguments).join(' ')); return ce.apply(console, arguments); };
    const estCri = G.criadero && G.criadero.estado ? G.criadero.estado() : null, criBackup = estCri ? JSON.parse(JSON.stringify(estCri)) : null, criKey = G.criadero && G.criadero.KEY, criLS = criKey ? leer(criKey) : null;
    let casaKey = null, casaLS = null;
    const apartados = ['dialog', 'end', 'comic'].filter(id => $(id) && !$(id).hidden); apartados.forEach(id => { $(id).hidden = true; });
    if (G.ui.cardOpen) G.ui.hideCard();
    const tick = (s, dt) => { dt = dt || 0.05; for (let i = 0, n = Math.ceil(s / dt); i < n; i++) Rr.update(dt); };
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const ir = (x, z, y, vuela) => { S.pos.x = x; S.pos.z = z; S.pos.y = y != null ? y : H(x, z); M.flying = !!vuela; M.grounded = !vuela; M.swimming = false; };
    try {
      G.quiet = true; if (SV.suspender) SV.suspender(true); // sin autoguardado durante la prueba (el marcador guarda cada tanto)
      if (!window.AVRecords) await AVE.assets.script('src/game/records.js');
      if (!window.AV_HUEVOS) await AVE.assets.script('content/comun/huevos.js');
      const REC = window.AVRecords(G); casaKey = REC.CLAVE.casa; casaLS = leer(casaKey);
      S.banquete = null; G.banqueteApi = null;
      // 1. Cartel desde S.step 6; jugar() pone S.rescate, el pichón en uno de los 3 sitios y el reloj a 0
      S.step = 5; tick(0.05);
      check('Antes de la crecida (S.step 5) no hay cartel', !disponible() && !(cartel.g && cartel.g.visible) && (await jugar()) === false);
      S.step = 6; tick(0.05);
      check('Con S.step 6 aparece el cartel con su caja nido', cartel.g && cartel.g.visible && !!G.interaccion.find('rescate_cartel') && cartel.it.visible());
      ir(cartel.x, cartel.z + 1); tick(0.05);
      const cerca = G.interaccion.nearest();
      check('Junto al cartel, Acción dice «Leer el cartel»', cerca && cerca.id === 'rescate_cartel', cerca && cerca.id);
      const ok1 = await jugar({ prueba: true });
      check('jugar() empieza: S.rescate, pichón en uno de los 3 sitios y reloj a 0', ok1 && R.activo && S.rescate && ['poza_honda', 'taller', 'charca_nubes'].includes(R.sitio.id) && R.t === 0 && pichon.root.visible, R.sitio && R.sitio.id);
      const sitios = CFG.sitios.map(sitioPichon);
      check('Los 3 sitios existen y quedan en tierra seca o en el techo del taller', sitios.every(s => s && isFinite(s.x + s.y + s.z)) && sitios.filter(s => s.id !== 'taller').every(s => seco(s.x, s.z)), sitios.map(s => s && s.id + '@' + s.y.toFixed(1)).join(' '));
      check('El HUD muestra la cuenta y luego el reloj', hudEl && !hudEl.hidden && /^[123]$/.test(hudEl.querySelector('.rs-reloj').textContent), hudEl && hudEl.querySelector('.rs-reloj').textContent);
      tick(3.4);
      check('Tras la cuenta, el reloj corre (fase buscar)', R.fase === 'buscar' && R.t > 0 && /^\d:\d\d$/.test(hudEl.querySelector('.rs-reloj').textContent), R.fase + ' ' + R.t.toFixed(2));
      // 2. Primer «Agarrar»: se aparta ≥ 2,5 m; el segundo: lo lleva
      const p0 = posPichon(); ir(p0.x - 1, p0.z, p0.y); S.facing = { x: 1, z: 0 }; tick(0.05);
      const near = G.interaccion.nearest();
      check('Junto al pichón, Acción dice «Agarrar al pichón»', near && near.id === 'pichon', near && near.id);
      const r1 = agarrar(); await espera(30); tick(0.6);
      const p1 = posPichon(), salto = Math.hypot(p1.x - p0.x, p1.z - p0.z);
      check('El primer «Agarrar» no lo agarra: da un saltito y se aparta ≥ 2,5 m', r1 === false && !llevaPichon() && salto >= 2.5, salto.toFixed(2) + ' m');
      ir(p1.x - 1, p1.z, p1.y); tick(0.05);
      const r2 = agarrar();
      check('El segundo «Agarrar» sí: G.agarre.lleva().id === "pichon"', r2 && lleva() && lleva().id === 'pichon' && R.fase === 'llevar', lleva() && lleva().id);
      tick(0.6);
      // 4. Zorzal: volar recto 4,5 s con él al lado → pío fuerte; ladear > 30° → se va en < 2 s
      let susto = 0, seva = 0; const onZ = e => { if (e === 'susto') susto++; if (e === 'seva') seva++; }; G.on('rescateZorzal', onZ);
      ir(S.pos.x, S.pos.z, S.pos.y + 20, true); S.facing = { x: 1, z: 0 }; R.llevaT = 3.1; zorzal.visto = false; tick(0.1);
      check('Al volar con el pichón llega el zorzal pardo curioso', zorzal.estado === 'llega' || zorzal.estado === 'junto', zorzal.estado);
      for (let i = 0; i < 40 && zorzal.estado === 'llega'; i++) { S.pos.y = H(S.pos.x, S.pos.z) + 20; M.flying = true; tick(0.1); }
      for (let i = 0; i < 48 && !susto; i++) { S.pos.x += 0.6; S.pos.y = H(S.pos.x, S.pos.z) + 20; M.flying = true; tick(0.1); }
      check('Volar recto más de 4 s con el zorzal al lado: el pichón pía fuerte', susto === 1 && zorzal.susto, 'susto ' + susto + ', recta ' + zorzal.recta.toFixed(1));
      const zd = zorzal.g.position, cercaZ = Math.hypot(zd.x - S.pos.x, zd.z - S.pos.z);
      check('El zorzal va al lado (≈ 2 m) y nunca toca al pichón', cercaZ < 3.5 && llevaPichon(), cercaZ.toFixed(2) + ' m');
      S.facing = { x: Math.cos(0.7), z: Math.sin(0.7) }; M.flying = true; tick(0.1);
      let tVa = 0; for (; tVa < 2 && zorzal.estado !== 'off'; tVa += 0.1) { M.flying = true; tick(0.1); }
      check('Ladear (> 30°) aburre al zorzal y se va en menos de 2 s', seva === 1 && zorzal.estado === 'off' && tVa < 2, tVa.toFixed(1) + ' s');
      // 3. A 1 m de la caja nido, soltar() → fin, retosResultado rescate, aprendizaje rescate, S.rescates 1
      S.rescates = 0;
      let res = null, apr = null; const onR = r => { if (r && r.modo === 'rescate') res = r; }, onA = d => { if (d && d.tipo === 'rescate') apr = d; };
      G.on('retosResultado', onR); G.on('aprendizaje', onA);
      ir(cartel.nido.x - 1, cartel.nido.z, cartel.nido.y); S.facing = { x: 1, z: 0 }; tick(0.05);
      check('Junto a la caja nido con el pichón, Acción dice «Dejar»', G.interaccion.modo === modo && modo.activo() && G.input.actBtn.textContent === 'Dejar', G.input.actBtn.textContent);
      soltar({ instantaneo: true }); await espera(60);
      check('Soltarlo a menos de 1,5 m de la caja nido termina el reto (fase fin)', R.fase === 'fin' && !R.activo && !S.rescate && !llevaPichon(), R.fase);
      check('Emite retosResultado { modo: "rescate", llego, ms, medalla, prueba }', res && res.llego === true && res.ms >= 1000 && ['oro', 'plata', 'bronce'].includes(res.medalla) && res.prueba === true, JSON.stringify(res));
      check('Emite aprendizaje { tipo: "rescate" } y S.rescates === 1', apr && apr.id === 'pichon-1' && S.rescates === 1, JSON.stringify(apr) + ' / ' + S.rescates);
      check('La tarjeta muestra tiempo, medalla y «Otra vez» / «Seguir»', G.ui.cardOpen && !!$('rs-otra') && !!$('rs-seguir') && /Medalla de/.test($('card').textContent));
      const ana = { profile: { created: true, name: 'Prueba Rescate', look: { species: 'vittata' } }, events: [], field: [] };
      const anotado = REC.anotar({ modo: 'rescate', llego: true, ms: res ? res.ms : 80000, medalla: res ? res.medalla : 'oro' }, ana);
      const libro = leerJSON(casaKey), ent = libro && libro.jugadores && libro.jugadores['Prueba Rescate'];
      check('records.js guarda el rescate (mejor, medalla, jugadas 1) en el libro de la casa', anotado && ent && ent.rescate && ent.rescate.jugadas === 1 && ent.rescate.mejor > 0, ent && JSON.stringify(ent.rescate));
      check('Un resultado de prueba no se anota', REC.anotar({ modo: 'rescate', llego: true, ms: 5000, medalla: 'oro', prueba: true }, ana) === false);
      // 6. «Otra vez» reinicia en < 1 s sin tocar step ni misiones
      const step0 = S.step, mis0 = JSON.stringify(S.missions), t0 = performance.now();
      $('rs-otra').click(); await espera(30);
      check('«Otra vez» reinicia en menos de 1 s sin tocar S.step ni S.missions', R.activo && R.fase === 'cuenta' && performance.now() - t0 < 1000 && S.step === step0 && JSON.stringify(S.missions) === mis0, (performance.now() - t0).toFixed(0) + ' ms');
      // 5. Con el banquete activo, jugar() devuelve false; y el banquete puede consultar G.rescate.activo()
      check('Mientras dura, G.rescate.activo() es true (para que el banquete no arranque)', api.activo() === true);
      salir();
      G.banqueteApi = { activo: () => true };
      check('Con G.banqueteApi.activo() en true, jugar() devuelve false con aviso', (await jugar({ prueba: true })) === false && !R.activo && /banquete/.test($('toast').textContent), $('toast').textContent);
      G.banqueteApi = null;
      // 7. 5 rescates → cápsula «Pichón rescatado»
      const H5 = window.AV_HUEVOS && window.AV_HUEVOS.huevos.find(h => h.id === 'rescatado');
      check('huevos.js trae la cápsula «Pichón rescatado» con { rescates: 5 }', H5 && H5.obtener && H5.obtener.defecto && H5.obtener.defecto.rescates === 5, H5 && JSON.stringify(H5.obtener));
      if (estCri) delete estCri.capsulas.rescatado;
      S.rescates = 4; G.emit('rescates', 4);
      const antes5 = !!(estCri && estCri.capsulas.rescatado);
      S.rescates = 5; G.emit('rescates', 5);
      check('A los 5 rescates la cápsula aparece en criadero.estado()', estCri && !antes5 && estCri.capsulas.rescatado && estCri.capsulas.rescatado.estado, estCri && JSON.stringify(estCri.capsulas.rescatado));
      // 8. Compañero: si hay cría, la tarjeta lo cuenta
      const conCompa = await jugar({ prueba: true, sinCuenta: true, forzar: true });
      const pp = posPichon(); ir(pp.x - 1, pp.z, pp.y); R.intentos = 1; agarrar();
      ir(cartel.nido.x - 0.5, cartel.nido.z, cartel.nido.y); soltar({ instantaneo: true }); await espera(60);
      const tieneCompa = !!(G.criadero && G.criadero.companero && G.criadero.companero());
      check('Segunda partida completa; la tarjeta menciona la cría si hay compañero', conCompa && R.fase === 'fin' && R.resultado.companero === tieneCompa && (/dos pichones/.test($('card').textContent) === tieneCompa), 'compañero ' + tieneCompa);
      check('Solo los 3 primeros rescates dan XP (el 6.º no emite aprendizaje)', S.rescates === 6 && apr && apr.id === 'pichon-1');
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
    } finally {
      try { salir(); } catch (e) { /* ya fuera */ }
      if (pichon.root) pichon.root.visible = false;
      if (G.ui.cardOpen) G.ui.hideCard();
      G.ui.hideToast(); G.fx.guide(null, 0);
      if (estCri && criBackup) { for (const k of Object.keys(estCri)) delete estCri[k]; Object.assign(estCri, criBackup); try { if (criLS == null) localStorage.removeItem(criKey); else localStorage.setItem(criKey, criLS); } catch (e) { /* sin almacén */ } }
      try { if (casaKey) { if (casaLS == null) localStorage.removeItem(casaKey); else localStorage.setItem(casaKey, casaLS); } } catch (e) { /* sin almacén */ }
      try { if (propioAntes == null) localStorage.removeItem(ALMACEN); else localStorage.setItem(ALMACEN, propioAntes); } catch (e) { /* sin almacén */ }
      S.step = guard.step; S.rescates = guard.rescates; S.banquete = guard.sbanq; G.banqueteApi = guard.banq;
      Object.assign(S.pos, guard.pos); S.facing = guard.facing; M.flying = guard.flying; M.grounded = guard.grounded; M.swimming = guard.swimming;
      R.fase = ''; R.resultado = null; tick(0.05);
      if (SV.suspender) SV.suspender(false); G.quiet = guard.quiet; console.error = ce;
      apartados.forEach(id => { $(id).hidden = false; });
    }
    check('La partida (G.S) queda intacta salvo S.rescates', comparable(S) === sAntes && S.rescates === guard.rescates);
    check('El almacén de la partida no se escribió', claves.every((k, i) => leer(k) === realAntes[i]));
    check('El mundo no queda en pausa', G.pausa.activa() === guard.pausa);
    const nuevos = (window.__aveErrores || []).slice(errores0);
    check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  const api = G.rescate = { jugar, salir, otraVez, agarrar, soltar, test, activo: () => R.activo,
    estado: () => ({ activo: R.activo, fase: R.fase, t: R.t, sitio: R.sitio && R.sitio.id, intentos: R.intentos, zorzal: zorzal.estado, rescates: S.rescates || 0, resultado: R.resultado }),
    _dev: { R, pichon, zorzal, cartel, CFG, sitioPichon, abrirCartel } };
  return api;
};
