/* Juego · Amazona Maze (prototipo AB1, carril AB de docs/equipo/TAREAS_API.md; era la G13 del tablero)
   Laberinto de recolección de frutas en un cayo de arena frente a la playa, con vista superior en 3/4. Vittata (la original: modelo y
   rig intactos) camina por los pasillos y recoge los frutos de la palma de sierra y del tabonuco (las mismas mallas de banquete.js,
   leídas de su API, sin editar el archivo). Las paredes son troncos caídos, rocas con musgo y matas de bambú del kit de entorno; palmas
   alrededor. Tres «guardianes del musgo» (criaturas ficticias: una roca con musgo y dos ojos, nada de fantasmas ni marcas) la buscan sin
   prisa: si la alcanzan, «¡Te encontraron!», el combo vuelve a x1 y el guardián regresa a su claro. Nunca hay daño ni vidas.
   Oculto: ?mini=maze (al cerrar la portada) o AV.maze(); pruebas: AV.mazeTest().

   Cómo encaja (el patrón de src/game/flight.js y de retos.js, sin arquitectura paralela):
   - Entrar: instantánea de G.S, guardado suspendido, G.quiet; envolturas reversibles de G.ui.busy, G.fisica.step (aquí manda un
     movimiento por casillas propio), las acciones de vuelo, G.interaccion.action, G.fisica.suelo (dentro del cayo el suelo es su arena,
     para que actores.js anime el paso y apoye las patas) y la cámara (follow, fov, draw). Al salir se repone todo y la partida vuelve a
     como estaba (G.guardado.restaurar); el pool se libera.
   - Vittata: solo se escriben los valores que actores.js lee (S.pos, S.facing, MOVE.speed/vx/vz/grounded/groundY): camina con su clip.
   - Recorridos válidos garantizados: laberinto perfecto por DFS sobre una rejilla de 9×9 (siempre hay camino a cada casilla) y luego
     se abren algunos callejones (bucles para esquivar a los guardianes); la prueba lo comprueba con BFS para 40 semillas.
   - Puntuación: cada fruto da 10 (palma) o 25 (tabonuco, en los callejones) por el combo (x1 → x5, sube con cada fruto seguido sin que
     te encuentren); al recoger todos, un premio de rapidez. Récord en `<almacen>.retos` (clave maze: { mejor, jugadas }) y gancho
     retosResultado { modo: 'maze', puntos, frutos, ms } para «Mis récords».
   - Controles: flechas o WASD (PC); deslizar el dedo en cualquier dirección (móvil). La dirección se guarda y Vittata gira en el siguiente
     cruce que lo permita. Enter, Espacio o un toque en los resultados = «Otra vez».
   - Rendimiento: InstancedMesh creadas una vez al entrar (troncos, rocas, bambú, palmas, guardianes y ojos; frutos con la malla de
     banquete), solo cambia instanceMatrix; nada se crea por cuadro ni por reinicio (50 reinicios sin fugas en la prueba).
   window.AVMaze(G) → { DECL, abrir, salir, otraVez, activo, estado, test }. */
(function () {
  'use strict';
  window.AVMaze = function (G) {
    if (G.mazeApi) return G.mazeApi;
    const S = G.S, R = G.renderer, F = G.fisica, M = F.MOVE, scene = R.scene, $ = G.util.$;
    const REDUCED = !!R.REDUCED;
    const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const ALMACEN = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.retos';
    let claveRec = ALMACEN;
    const MAPA = window.AV_MAPA_CAP1 || null;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rate = (k, dt) => 1 - Math.exp(-dt * k);
    const H = (x, z) => G.terreno.height(x, z);
    const nivelAgua = (x, z) => { const w = G.agua.levelAt(x, z); return w > -1e8 ? w : -Infinity; };
    const A_ = G.audio;
    if (A_ && A_.define && !A_.has('mz_encontrada')) {
      A_.define('mz_encontrada', (t, n, X) => { X.tone(660, t, 0.12, { type: 'sine', to: 520, gain: 0.1 }); X.tone(440, t + 0.13, 0.22, { type: 'triangle', to: 330, gain: 0.09 }); });
      A_.define('mz_fin', (t, n, X) => { for (let i = 0; i < 5; i++) X.tone(X.pent(i * 2 + 2, 523.25), t + i * 0.08, 0.26, { type: 'sine', gain: 0.1 }); });
    }
    const sonar = (n, a) => { try { if (A_ && (!A_.has || A_.has(n) || /^(tick|land|unlock|splash|jump)$/.test(n))) A_.play(n, a); else A_.play('tick', a); } catch (e) { /* sin audio */ } };

    // ---------- Declaración del minijuego (docs/equipo/MINIJUEGOS.md §4) ----------
    const DECL = {
      id: 'maze', nombre: 'Amazona Maze', nombreEn: 'Amazona Maze',
      descripcion: 'Recorre el laberinto del cayo y recoge todos los frutos. Los guardianes del musgo te buscan: si te encuentran, el combo vuelve a x1.',
      recursos: { kit: ['tronco_caido', 'roca_musgo_a', 'roca_musgo_b', 'bambu', 'palma_sierra_joven'], frutos: 'banquete.js (palma de sierra y tabonuco)', personaje: 'vittata (original)', zona: 'cayo de arena frente a la playa' },
      camara: 'superior en 3/4 (desde el sur, sigue a Vittata; en vertical más alta y con más campo)',
      controles: { pc: 'flechas o WASD: dirección (se guarda hasta el siguiente cruce)', movil: 'deslizar el dedo: dirección', resultados: 'Enter, Espacio o un toque: otra vez' },
      inicio: 'la primera dirección arranca', victoria: 'recoger todos los frutos', derrota: null,
      persecucion: 'tres guardianes del musgo; si te alcanzan, «¡Te encontraron!» y el combo vuelve a x1 (sin daño, sin vidas)',
      puntuacion: 'frutos × combo + premio de rapidez', musica: 'retos/carreras (sin reiniciar)',
      resultados: ['puntos', 'mejor', 'nuevoRecord', 'tiempo', 'encontrada'], records: { clave: 'maze', campos: ['mejor', 'jugadas'], gancho: 'retosResultado' },
      oculto: true,
    };

    // ---------- Parámetros (metros, segundos, casillas) ----------
    const P = {
      n: 9,                 // casillas por lado
      celda: 2.6,           // m por casilla (pasillo de ~1,9 m entre troncos)
      vel: 4.6,             // m/s de Vittata (camina con su clip: por debajo de la carrera de fisica.js)
      velG: [0.6, 0.66, 0.72], // velocidad de cada guardián, en fracción de la de Vittata
      salidaG: [1.5, 5, 9], // s tras empezar en que sale cada guardián de su claro
      alcance: 0.45,        // casillas: un guardián a menos de esto la encuentra
      gracia: 2.2,          // s en que no la pueden volver a encontrar
      vuelta: 2.0,          // s que tarda el guardián en volver a salir de su claro
      frutos: 14,           // frutos por partida
      puntosPalma: 10, puntosTabonuco: 25, comboMax: 5,
      rapidez: 150,         // s: premio de rapidez = 3 × (rapidez − s) si se acaba antes
      abrir: 0.45,          // fracción de callejones que se abren (bucles)
      finEspera: 0.6,       // s antes de aceptar «otra vez» en los resultados
    };
    const DX = [0, 1, 0, -1], DZ = [-1, 0, 1, 0], BIT = [1, 2, 4, 8]; // 0 norte (−z), 1 este, 2 sur (+z, hacia la cámara), 3 oeste
    const opuesto = d => (d + 2) % 4;

    // ---------- Dónde se juega: un cayo de arena sobre el mar frente a la playa ----------
    function arena() {
      const p = MAPA && (MAPA.pois || []).find(q => q.id === 'playa');
      const c = p ? { x: p.pos[0], z: p.pos[2] + 46 } : { x: G.guardado.spawn.x, z: G.guardado.spawn.z };
      const L = P.n * P.celda / 2 + 2; let alto = -Infinity;
      for (let x = -L; x <= L; x += 2) for (let z = -L; z <= L; z += 2) alto = Math.max(alto, H(c.x + x, c.z + z), nivelAgua(c.x + x, c.z + z));
      return { x: c.x, z: c.z, piso: (isFinite(alto) ? alto : 0) + 0.35, L };
    }
    const mundoX = gx => st.A.x + (gx - (P.n - 1) / 2) * P.celda;
    const mundoZ = gz => st.A.z + (gz - (P.n - 1) / 2) * P.celda;
    const dentroCayo = (x, z) => st.A && Math.abs(x - st.A.x) <= st.A.L && Math.abs(z - st.A.z) <= st.A.L;

    // ---------- Estado ----------
    const st = { activo: false, fase: 'nada', snap: null, quiet: false, creador: false, env: null, ui: null, listo: null, A: null, msgT: 0 };
    const J = { gx: 0, gz: 0, d: -1, quiere: -1, t: 0, puntos: 0, combo: 1, racha: 0, recogidos: 0, encontrada: 0, gracia: 0, finT: 0, mejor: 0, nuevo: false, antes: 0, bono: 0, semilla: 1 };
    const lab = { paredes: null, frutos: [], casa: 0, inicio: 0, abiertos: 0 };
    const guard = [];   // { gx, gz, d, v, salida, fuera, vuelta, modo, tinte, hop }
    let rnd = G.util.rng(1);

    // ---------- Pool de instancias (al entrar; solo cambia instanceMatrix) ----------
    const KIT = { base: 'assets/models/entorno/', b64: 'AV_ENTORNO_B64' };
    const CAP = { tronco: 2 * P.n * (P.n + 1), roca: (P.n + 1) * (P.n + 1), bambu: 24, palma: 20, guardian: 3, ojo: 6, pupila: 6, fpalma: 24, ftabonuco: 24 };
    const MODELO = { tronco: 'tronco_caido', roca: 'roca_musgo_a', bambu: 'bambu', palma: 'palma_sierra_joven', guardian: 'roca_musgo_b' };
    const pool = {};
    const propios = []; // geometrías y materiales propios (se liberan al salir; los de banquete.js no)
    const raiz = new THREE.Group(); raiz.name = 'maze'; raiz.visible = false;
    const lin = c => new THREE.Color(c).convertSRGBToLinear();
    function materialDe(src) {
      const hoja = /^HOJA/.test(src.name || ''), roca = /^ROCA/.test(src.name || '');
      const m = hoja ? new THREE.MeshLambertMaterial({ map: src.map || null, side: THREE.DoubleSide, alphaTest: src.alphaTest || 0.5, transparent: false, color: lin('#e6f0d8') })
        : new THREE.MeshPhongMaterial({ map: src.map || null, normalMap: src.normalMap || null, shininess: roca ? 10 : 6, specular: new THREE.Color(0x0c0c0c), color: roca ? new THREE.Color(0.92, 0.92, 0.9) : new THREE.Color(0.78, 0.74, 0.7) });
      m.name = 'maze:' + (src.name || 'mat'); return m;
    }
    function cargarModelo(nombre) {
      return G.assets.loadGLB(KIT.base + nombre + '.glb', { b64: () => (window[KIT.b64] || {})[nombre], script: KIT.base + nombre + '_glb.js', base: KIT.base, error: 'pieza no disponible: ' + nombre })
        .then(g => {
          g.scene.updateMatrixWorld(true);
          const prims = [], box = new THREE.Box3();
          g.scene.traverse(o => {
            if (!o.isMesh) return;
            const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
            if (geo.getAttribute('color')) geo.deleteAttribute('color'); // en el kit el color de vértice es AO/viento, no color
            geo.computeBoundingBox(); box.union(geo.boundingBox);
            prims.push({ geo, src: o.material });
          });
          return { prims, box };
        });
    }
    function nuevoPool(tipo, prims, box, propio) {
      const size = new THREE.Vector3(); box.getSize(size);
      const eje = size.x >= size.y && size.x >= size.z ? 'x' : size.z >= size.y ? 'z' : 'y';
      const p = { mallas: [], libres: [], box, size, eje, largo: size[eje], propio };
      for (const pr of prims) {
        const im = new THREE.InstancedMesh(pr.geo, pr.mat || materialDe(pr.src), CAP[tipo]);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.count = CAP[tipo]; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
        im.userData.sinCulling = true; im.userData.sinSolido = true; im.name = 'maze:' + tipo;
        _m.makeScale(0, 0, 0); for (let i = 0; i < CAP[tipo]; i++) im.setMatrixAt(i, _m);
        raiz.add(im); p.mallas.push(im);
      }
      for (let i = CAP[tipo] - 1; i >= 0; i--) p.libres.push(i);
      pool[tipo] = p; return p;
    }
    // Frutos: las mallas de banquete.js (su API: G.banquete._dev.mundo.mallas), compartidas y sin tocar; si no está, una bolita propia
    function cargarBanquete() {
      if (G.banquete) return Promise.resolve(G.banquete);
      return G.AVE.assets.script('src/game/banquete.js').then(() => window.AVBanquete(G), () => null);
    }
    function crearPool() {
      if (st.listo) return st.listo;
      st.listo = Promise.all([cargarBanquete()].concat(Object.keys(MODELO).map(tipo => cargarModelo(MODELO[tipo]).then(m => {
        const p = nuevoPool(tipo, m.prims, m.box, true);
        if (tipo === 'tronco') p.grosor = (p.eje === 'x' ? p.size.y + p.size.z : p.eje === 'z' ? p.size.x + p.size.y : p.size.x + p.size.z) / 2;
        if (tipo === 'guardian') for (const im of p.mallas) for (let i = 0; i < CAP.guardian; i++) im.setColorAt(i, new THREE.Color(1, 1, 1));
      })))).then(([bq]) => {
        const mallas = bq && bq._dev && bq._dev.mundo && bq._dev.mundo.mallas;
        for (const t of ['palma', 'tabonuco']) {
          const src = mallas && mallas[t];
          let geo, mat;
          if (src && src.geometry && src.material) { geo = src.geometry; mat = src.material; }
          else { geo = new THREE.SphereGeometry(0.16, 10, 8); mat = new THREE.MeshLambertMaterial({ color: t === 'palma' ? '#7a2a52' : '#b8c84a', emissive: '#3a2a10' }); propios.push(geo, mat); }
          geo.computeBoundingBox();
          nuevoPool('f' + t, [{ geo, mat }], geo.boundingBox.clone(), false);
        }
        // Ojos de los guardianes (esferas propias) y el suelo del cayo
        const ojoG = new THREE.SphereGeometry(0.13, 12, 8), pupG = new THREE.SphereGeometry(0.065, 10, 6);
        const ojoM = new THREE.MeshLambertMaterial({ color: '#fbfbf2', emissive: '#3a3a30' }), pupM = new THREE.MeshBasicMaterial({ color: '#1d2a22' });
        propios.push(ojoG, pupG, ojoM, pupM);
        nuevoPool('ojo', [{ geo: ojoG, mat: ojoM }], new THREE.Box3(), false); nuevoPool('pupila', [{ geo: pupG, mat: pupM }], new THREE.Box3(), false);
        const lado = P.n * P.celda + 3.2, pisoG = new THREE.BoxGeometry(lado, 0.8, lado), pisoM = new THREE.MeshLambertMaterial({ color: lin('#d8c79a') });
        const bordeG = new THREE.BoxGeometry(lado + 2.4, 0.5, lado + 2.4), bordeM = new THREE.MeshLambertMaterial({ color: lin('#e8dcb4') });
        propios.push(pisoG, pisoM, bordeG, bordeM);
        st.piso = new THREE.Mesh(pisoG, pisoM); st.borde = new THREE.Mesh(bordeG, bordeM);
        for (const m of [st.piso, st.borde]) { m.name = 'maze:piso'; m.receiveShadow = false; m.castShadow = false; m.userData.sinSolido = true; raiz.add(m); }
        if (!raiz.parent) scene.add(raiz);
        return pool;
      }, e => { st.listo = null; throw e; });
      return st.listo;
    }
    const tomar = tipo => (pool[tipo] && pool[tipo].libres.length ? pool[tipo].libres.pop() : -1);
    const vivas = () => { let n = 0; for (const t in pool) n += CAP[t] - pool[t].libres.length; return n; };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _o = new THREE.Vector3();
    function poner(tipo, i, x, y, z, rx, ry, rz, sx, sy, sz) {
      const p = pool[tipo]; if (!p || i < 0) return;
      _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s);
      for (const im of p.mallas) im.setMatrixAt(i, _m);
    }
    function esconder(tipo, i) { const p = pool[tipo]; if (!p || i < 0) return; _m.makeScale(0, 0, 0); for (const im of p.mallas) im.setMatrixAt(i, _m); }
    function soltarTodo() { for (const t in pool) { const p = pool[t]; p.libres.length = 0; for (let i = CAP[t] - 1; i >= 0; i--) { esconder(t, i); p.libres.push(i); } } }
    function subir(tipos) { for (const t of tipos || Object.keys(pool)) { const p = pool[t]; if (!p) continue; for (const im of p.mallas) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } } }
    // Un tronco tumbado a lo largo de una pared (su eje largo a X o a Z), apoyado en la arena, con el grosor pedido
    function tumbado(i, xw, zw, aLoLargoX, largo, grosor, vuelta) {
      const p = pool.tronco; if (!p || i < 0) return;
      const k = largo / Math.max(0.3, p.largo), g = grosor / Math.max(0.1, p.grosor);
      const rz = p.eje === 'y' ? Math.PI / 2 : 0, base = p.eje === 'z' ? (aLoLargoX ? Math.PI / 2 : 0) : (aLoLargoX ? 0 : Math.PI / 2);
      _e.set(0, base + (vuelta ? Math.PI : 0), rz); _q.setFromEuler(_e);
      _s.set(p.eje === 'x' ? k : g, p.eje === 'y' ? k : g, p.eje === 'z' ? k : g);
      const c = p.box.getCenter(new THREE.Vector3()); _o.set(c.x * _s.x, c.y * _s.y, c.z * _s.z).applyQuaternion(_q);
      const alto = (p.eje === 'y' ? p.size.x : p.size.y) * g;
      _p.set(xw - _o.x, st.A.piso + alto / 2 - 0.08 - _o.y, zw - _o.z); _m.compose(_p, _q, _s);
      for (const im of p.mallas) im.setMatrixAt(i, _m);
    }

    // ---------- Laberinto: DFS (perfecto, siempre hay camino) + callejones abiertos (bucles) ----------
    const idx = (x, z) => z * P.n + x;
    const abierto = (c, d) => !(lab.paredes[c] & BIT[d]);
    function generarLab() {
      const n = P.n, W = new Uint8Array(n * n).fill(15), visto = new Uint8Array(n * n);
      const pila = [idx(0, n - 1)]; visto[pila[0]] = 1;
      while (pila.length) {
        const c = pila[pila.length - 1], x = c % n, z = (c / n) | 0, op = [];
        for (let d = 0; d < 4; d++) { const nx = x + DX[d], nz = z + DZ[d]; if (nx >= 0 && nz >= 0 && nx < n && nz < n && !visto[idx(nx, nz)]) op.push(d); }
        if (!op.length) { pila.pop(); continue; }
        const d = op[Math.floor(rnd() * op.length)], c2 = idx(x + DX[d], z + DZ[d]);
        W[c] &= ~BIT[d]; W[c2] &= ~BIT[opuesto(d)]; visto[c2] = 1; pila.push(c2);
      }
      lab.paredes = W;
      // Claro de los guardianes: la casilla central y sus cuatro vecinas, abiertas entre sí
      const cc = (n - 1) / 2; lab.casa = idx(cc, cc);
      for (let d = 0; d < 4; d++) quitar(lab.casa, d);
      // Callejones: se abren hacia una vecina (no el borde) una fracción de ellos → bucles para esquivar
      lab.abiertos = 0;
      for (let c = 0; c < n * n; c++) {
        if (paredesDe(c) !== 3 || rnd() > P.abrir) continue;
        const x = c % n, z = (c / n) | 0, op = [];
        for (let d = 0; d < 4; d++) { const nx = x + DX[d], nz = z + DZ[d]; if (!abierto(c, d) && nx >= 0 && nz >= 0 && nx < n && nz < n) op.push(d); }
        if (op.length) { quitar(c, op[Math.floor(rnd() * op.length)]); lab.abiertos++; }
      }
      // Siempre hay bucles para esquivar: si salieron pocos, se abren paredes interiores lejos del claro hasta tener ≥ 5 pasillos más que un árbol
      const extra = () => { let ar = 0; for (let c = 0; c < n * n; c++) for (const d of [1, 2]) if (abierto(c, d)) ar++; return ar - (n * n - 1); };
      for (let intentos = 0; extra() < 5 && intentos < 400; intentos++) {
        const x = 1 + Math.floor(rnd() * (n - 2)), z = 1 + Math.floor(rnd() * (n - 2)), d = Math.floor(rnd() * 4), c = idx(x, z);
        if (abierto(c, d) || Math.abs(x - cc) + Math.abs(z - cc) < 3) continue;
        quitar(c, d); lab.abiertos++;
      }
      lab.inicio = idx(0, n - 1);
    }
    function quitar(c, d) { const x = c % P.n, z = (c / P.n) | 0, nx = x + DX[d], nz = z + DZ[d]; if (nx < 0 || nz < 0 || nx >= P.n || nz >= P.n) return; lab.paredes[c] &= ~BIT[d]; lab.paredes[idx(nx, nz)] &= ~BIT[opuesto(d)]; }
    function paredesDe(c) { let k = 0; for (let d = 0; d < 4; d++) if (!abierto(c, d)) k++; return k; }
    // Distancias por los pasillos desde la casilla c (BFS)
    function distancias(c0) {
      const n = P.n, D = new Int16Array(n * n).fill(-1), cola = [c0]; D[c0] = 0;
      for (let h = 0; h < cola.length; h++) {
        const c = cola[h], x = c % n, z = (c / n) | 0;
        for (let d = 0; d < 4; d++) { if (!abierto(c, d)) continue; const c2 = idx(x + DX[d], z + DZ[d]); if (D[c2] < 0) { D[c2] = D[c] + 1; cola.push(c2); } }
      }
      return D;
    }
    // Frutos: los callejones primero (tabonuco, 25), luego casillas repartidas (palma, 10); nunca en la salida ni en el claro
    function ponerFrutos() {
      lab.frutos = [];
      const D = distancias(lab.inicio), casa = new Set([lab.casa]);
      for (let d = 0; d < 4; d++) { const x = lab.casa % P.n + DX[d], z = ((lab.casa / P.n) | 0) + DZ[d]; casa.add(idx(x, z)); }
      const cand = []; for (let c = 0; c < P.n * P.n; c++) if (D[c] >= 3 && !casa.has(c)) cand.push(c);
      for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
      cand.sort((a, b) => (paredesDe(b) === 3) - (paredesDe(a) === 3));
      const lejos = (c, k) => lab.frutos.every(f => Math.abs(f.c % P.n - c % P.n) + Math.abs(((f.c / P.n) | 0) - ((c / P.n) | 0)) >= k);
      for (const k of [2, 1]) for (const c of cand) { if (lab.frutos.length >= P.frutos) break; if (!lab.frutos.some(f => f.c === c) && lejos(c, k)) lab.frutos.push({ c, tipo: paredesDe(c) === 3 && lab.frutos.filter(f => f.tipo === 'tabonuco').length < 5 ? 'tabonuco' : 'palma', activo: true, i: -1, fase: rnd() * 6 }); }
      for (const f of lab.frutos) f.i = tomar('f' + f.tipo);
    }
    // Paredes, postes, bambú y palmas del cayo (se colocan una vez por partida)
    function construir() {
      const n = P.n, c2 = P.celda / 2, postes = new Set();
      const pared = (x0, z0, x1, z1) => { // de poste a poste
        const i = tomar('tronco'); tumbado(i, (mundoX(x0) + mundoX(x1)) / 2 - c2, (mundoZ(z0) + mundoZ(z1)) / 2 - c2, z0 === z1, P.celda * 1.12, 0.62, rnd() < 0.5);
        postes.add(x0 + ',' + z0); postes.add(x1 + ',' + z1);
      };
      for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
        const c = idx(x, z);
        if (!abierto(c, 0)) pared(x, z, x + 1, z);              // norte
        if (!abierto(c, 3)) pared(x, z, x, z + 1);              // oeste
        if (z === n - 1 && !abierto(c, 2)) pared(x, z + 1, x + 1, z + 1); // sur (borde)
        if (x === n - 1 && !abierto(c, 1)) pared(x + 1, z, x + 1, z + 1); // este (borde)
      }
      const pr = pool.roca, anchoR = pr ? (pr.size.x + pr.size.z) / 2 : 1;
      for (const k of postes) {
        const [px, pz] = k.split(',').map(Number), xw = mundoX(px) - c2, zw = mundoZ(pz) - c2, s = (0.78 + rnd() * 0.25) / anchoR;
        poner('roca', tomar('roca'), xw, st.A.piso - 0.12, zw, 0, rnd() * 6.28, 0, s, s * 0.85, s);
        if (rnd() < 0.18) poner('bambu', tomar('bambu'), xw + 0.15, st.A.piso - 0.1, zw - 0.1, 0, rnd() * 6.28, 0, 0.3, 0.32 + rnd() * 0.12, 0.3);
      }
      // Palmas en el borde del cayo (norte, este y oeste: el sur queda libre hacia la cámara)
      const L = n * P.celda / 2 + 1.3;
      for (let k = 0; k < 6; k++) {
        const t = -L + (k + 0.5) * (2 * L / 6), s = 0.75 + rnd() * 0.35;
        poner('palma', tomar('palma'), st.A.x + t, st.A.piso - 0.15, st.A.z - L, 0, rnd() * 6.28, 0, s, s, s);
        poner('palma', tomar('palma'), st.A.x - L, st.A.piso - 0.15, st.A.z + t * 0.8 - 2, 0, rnd() * 6.28, 0, s, s, s);
        poner('palma', tomar('palma'), st.A.x + L, st.A.piso - 0.15, st.A.z + t * 0.8 - 2, 0, rnd() * 6.28, 0, s, s, s);
      }
      st.piso.position.set(st.A.x, st.A.piso - 0.4, st.A.z); st.borde.position.set(st.A.x, st.A.piso - 0.55, st.A.z);
    }

    // ---------- Movimiento por casillas (Vittata y guardianes): avanza dist casillas; en cada centro elige(e, c) da la dirección ----------
    function mover(e, dist, elegir) {
      let vueltas = 0;
      while (dist > 1e-7 && vueltas++ < 12) {
        const cx = Math.round(e.gx), cz = Math.round(e.gz);
        if (Math.abs(e.gx - cx) < 1e-6 && Math.abs(e.gz - cz) < 1e-6) { e.gx = cx; e.gz = cz; e.d = elegir(e, idx(cx, cz)); if (e.d < 0) return; }
        else if (e.d < 0) return;
        const d = e.d, tx = DX[d] ? (DX[d] > 0 ? Math.floor(e.gx + 1e-6) + 1 : Math.ceil(e.gx - 1e-6) - 1) : e.gx, tz = DZ[d] ? (DZ[d] > 0 ? Math.floor(e.gz + 1e-6) + 1 : Math.ceil(e.gz - 1e-6) - 1) : e.gz;
        const resto = Math.abs(tx - e.gx) + Math.abs(tz - e.gz), paso = Math.min(dist, resto);
        e.gx += DX[d] * paso; e.gz += DZ[d] * paso; dist -= paso;
      }
    }
    const celdaDe = e => idx(clamp(Math.round(e.gx), 0, P.n - 1), clamp(Math.round(e.gz), 0, P.n - 1));
    function elegirVittata(e, c) {
      if (J.quiere >= 0 && abierto(c, J.quiere)) return J.quiere;
      if (e.d >= 0 && abierto(c, e.d)) return e.d;
      return -1;
    }
    // Guardianes: en cada cruce eligen la salida (sin dar media vuelta salvo en un callejón) que más acerca a su objetivo:
    // «directo» va a por Vittata, «adelante» a 2 casillas delante de ella, «paseo» a veces va donde quiere
    function elegirGuardian(e, c) {
      const atras = e.d >= 0 ? opuesto(e.d) : -1, op = []; for (let d = 0; d < 4; d++) if (abierto(c, d) && d !== atras) op.push(d);
      if (!op.length) { for (let d = 0; d < 4; d++) if (abierto(c, d)) op.push(d); }
      if (op.length === 1) return op[0];
      if (e.modo === 'paseo' && rnd() < 0.45) return op[Math.floor(rnd() * op.length)];
      let obj = celdaDe(J);
      if (e.modo === 'adelante' && J.d >= 0) { const x = clamp(Math.round(J.gx) + 2 * DX[J.d], 0, P.n - 1), z = clamp(Math.round(J.gz) + 2 * DZ[J.d], 0, P.n - 1); obj = idx(x, z); }
      const D = distancias(obj), x = c % P.n, z = (c / P.n) | 0;
      let mejor = op[0], md = 1e9;
      for (const d of op) { const v = D[idx(x + DX[d], z + DZ[d])] + rnd() * 0.5; if (v < md) { md = v; mejor = d; } }
      return mejor;
    }

    // ---------- Simulación (un paso de dt s; determinista con rnd) ----------
    function paso(dt) {
      if (st.fase === 'listo') { for (const g of guard) g.hop += dt; return; }
      if (st.fase === 'fin') { J.finT += dt; for (const g of guard) g.hop += dt; return; }
      J.t += dt; J.gracia = Math.max(0, J.gracia - dt); st.msgT = Math.max(0, st.msgT - dt);
      if (J.quiere >= 0 && J.d >= 0 && J.quiere === opuesto(J.d)) J.d = J.quiere; // media vuelta en el pasillo: siempre se puede
      mover(J, P.vel * dt / P.celda, elegirVittata);
      // Frutos: se recogen al pasar por su casilla
      for (const f of lab.frutos) {
        if (!f.activo) continue;
        const fx = f.c % P.n, fz = (f.c / P.n) | 0;
        if (Math.abs(J.gx - fx) + Math.abs(J.gz - fz) < 0.4) recoger(f);
      }
      // Guardianes
      for (const g of guard) {
        g.hop += dt;
        if (!g.fuera) { if (J.t >= g.salida) { g.fuera = true; g.d = -1; } else continue; }
        if (g.vuelta > 0) { g.vuelta -= dt; if (g.vuelta <= 0) { g.gx = g.gx0; g.gz = g.gz0; g.d = -1; } continue; }
        mover(g, P.vel * g.v * dt / P.celda, elegirGuardian);
        if (J.gracia <= 0 && Math.hypot(g.gx - J.gx, g.gz - J.gz) < P.alcance) encontrada(g);
      }
      if (lab.frutos.every(f => !f.activo)) fin();
    }
    function recoger(f) {
      f.activo = false; esconder('f' + f.tipo, f.i);
      J.racha++; J.combo = Math.min(P.comboMax, 1 + Math.floor(J.racha / 2));
      const base = f.tipo === 'tabonuco' ? P.puntosTabonuco : P.puntosPalma, pts = base * J.combo;
      J.puntos += pts; J.recogidos++;
      sonar(f.tipo === 'tabonuco' ? 'bq_copa' : 'bq_fruto', J.combo);
      if (!REDUCED && !st.sinFx && G.fx) { try { (G.fx.recoger || G.fx.burst)(mundoX(f.c % P.n), st.A.piso + 1, mundoZ((f.c / P.n) | 0), 'gold', 8, st.A.piso + 3); } catch (e) { /* sin fx */ } }
      pintar(true);
    }
    // «¡Te encontraron!»: sin daño; el combo vuelve a x1, el guardián vuelve a su claro y hay unos segundos de gracia
    function encontrada(g) {
      J.encontrada++; J.racha = 0; J.combo = 1; J.gracia = P.gracia;
      g.vuelta = P.vuelta; g.gx = g.gx0; g.gz = g.gz0; g.d = -1;
      st.msgT = 1.6; sonar('mz_encontrada');
      if (!REDUCED && !st.sinFx && G.fx && G.fx.burst) { try { G.fx.burst(S.pos.x, S.pos.y + 0.6, S.pos.z, 'stars', 8, S.pos.y + 2.4); } catch (e) { /* sin fx */ } }
      if (!REDUCED && G.camara.shake) G.camara.shake(0.06, 0.2);
      pintar(false); mensaje(true);
    }
    function fin() {
      st.fase = 'fin'; J.finT = 0;
      J.bono = Math.max(0, Math.round(3 * (P.rapidez - J.t))); J.puntos += J.bono;
      const rec = leerRec(), m = rec.maze; J.antes = m.mejor || 0;
      m.jugadas = (m.jugadas || 0) + 1;
      J.nuevo = J.puntos > 0 && (!m.mejor || J.puntos > m.mejor);
      if (J.nuevo) m.mejor = J.puntos;
      J.mejor = m.mejor || 0;
      guardarRec(rec);
      G.emit('retosResultado', { modo: 'maze', puntos: J.puntos, frutos: J.recogidos, ms: Math.round(J.t * 1000), prueba: claveRec !== ALMACEN });
      sonar(J.nuevo ? 'unlock' : 'mz_fin');
      setTimeout(() => { if (st.activo && st.fase === 'fin') resultados(); }, REDUCED ? 0 : 500);
    }

    // ---------- Dibujar (cada cuadro) ----------
    function sincronizar() {
      const A = st.A; if (!A) return;
      S.pos.x = mundoX(J.gx); S.pos.z = mundoZ(J.gz); S.pos.y = A.piso; S.vy = 0;
      const d = J.d >= 0 ? J.d : J.ultima;
      if (d >= 0) { S.facing = { x: DX[d], z: DZ[d] }; J.ultima = d; }
      const v = st.fase === 'juego' && J.d >= 0 ? P.vel : 0;
      M.flying = false; M.landing = false; M.takeoff = 0; M.swimming = false; M.grounded = true; M.dashT = 0; M.posado = ''; M.fase = '';
      M.vx = S.facing.x * v; M.vz = S.facing.z * v; M.speed = v; M.groundY = A.piso;
      const pj = G.actores.player3D; if (pj) pj.root.visible = !(J.gracia > 0 && !REDUCED && Math.floor(J.gracia * 8) % 2 === 1); // parpadeo de gracia
    }
    function colocar(dt) {
      if (!st.A) return;
      const piso = st.A.piso;
      for (const f of lab.frutos) {
        if (!f.activo) continue;
        f.fase += dt;
        const x = mundoX(f.c % P.n), z = mundoZ((f.c / P.n) | 0), s = 1.7, cuelga = f.tipo === 'palma' ? 0.8 * s : 0.15 * s;
        poner('f' + f.tipo, f.i, x, piso + 0.55 + cuelga + Math.sin(f.fase * 2) * 0.1, z, 0, f.fase * 0.8, 0, s, s, s);
      }
      const pg = pool.guardian, anchoG = pg ? (pg.size.x + pg.size.z) / 2 : 1, altoG = pg ? pg.size.y : 1;
      guard.forEach((g, k) => {
        const oculto = g.vuelta > 0;
        if (oculto) { esconder('guardian', k); for (const t of ['ojo', 'pupila']) { esconder(t, 2 * k); esconder(t, 2 * k + 1); } return; }
        const x = mundoX(g.gx), z = mundoZ(g.gz), salto = Math.abs(Math.sin(g.hop * (g.fuera ? 7 : 3.5))) * 0.22, s = 1.0 / anchoG, y = piso + salto;
        const d = g.d >= 0 ? g.d : 2, fx = DX[d], fz = DZ[d] + 0.9, fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl; // los ojos miran adonde va y un poco a la cámara
        poner('guardian', k, x, y - (pg ? pg.box.min.y * s * 0.9 : 0), z, 0, g.hop * 0.3, 0, s, s * 0.9, s);
        const hy = y + altoG * s * 0.9 * 0.72, rx = -uz, rz = ux;
        for (let o = 0; o < 2; o++) {
          const sx = (o ? 1 : -1) * 0.2, ex = x + ux * 0.42 + rx * sx, ez = z + uz * 0.42 + rz * sx;
          poner('ojo', 2 * k + o, ex, hy, ez, 0, 0, 0, 1, 1, 1);
          poner('pupila', 2 * k + o, ex + ux * 0.09, hy, ez + uz * 0.09, 0, 0, 0, 1, 1, 1);
        }
      });
      subir(['fpalma', 'ftabonuco', 'guardian', 'ojo', 'pupila']);
    }
    function update(dt) {
      if (!st.activo || G.pausa.activa()) return;
      paso(Math.min(dt, 0.05));
      sincronizar(); colocar(dt);
      if (st.ui && st.msgT <= 0 && !st.ui.msg.hidden) mensaje(false);
    }
    G.on('update', dt => update(dt), 46);

    // ---------- Cámara superior en 3/4: desde el sur, sigue a Vittata; en vertical (móvil) más alta y con más campo ----------
    const CAMS = { ancho: { alto: 12.5, atras: 8, fov: 50, mira: -1.4 }, vertical: { alto: 15.5, atras: 7.5, fov: 60, mira: -2.6 } };
    const cam = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), asp: 0, prev: '' };
    function aspecto() { if (cam.asp) return cam.asp; const el = R.renderer && R.renderer.domElement, w = el ? el.clientWidth : innerWidth, h = el ? el.clientHeight : innerHeight; return h > 0 ? w / h : 1.6; }
    const modoCam = () => (aspecto() < 1 ? 'vertical' : 'ancho');
    function camObjetivo(out) { const c = CAMS[modoCam()]; return out.set(S.pos.x, st.A.piso + c.alto, S.pos.z + c.atras); }
    function camMira() { const c = CAMS[modoCam()]; return cam.mira.set(S.pos.x, st.A.piso + 0.6, S.pos.z + c.mira); }
    function reencuadrar() { if (!st.activo) return; const f = CAMS[modoCam()].fov; if (Math.abs(R.camera.fov - f) > 0.01) { R.camera.fov = f; R.camera.updateProjectionMatrix(); } }
    addEventListener('resize', reencuadrar);
    function camFollow(dt) { const m = modoCam(); if (m !== cam.prev) { cam.prev = m; dt = null; } camObjetivo(cam.pos); if (dt == null) R.camera.position.copy(cam.pos); else R.camera.position.lerp(cam.pos, rate(5, dt)); }
    function camDraw(dt) {
      reencuadrar(); R.camera.lookAt(camMira());
      const j = G.camara.juice; let sx = 0, sz = 0;
      if (j && j.shake > 0) { j.shake -= dt; const a = j.amp * Math.min(1, Math.max(0, j.shake) / 0.2); sx = (Math.random() - 0.5) * a; sz = (Math.random() - 0.5) * a; R.camera.position.x += sx; R.camera.position.z += sz; if (j.shake <= 0) j.amp = 0; }
      if (R.drawScene) R.drawScene(R.camera); else R.renderer.render(scene, R.camera);
      R.camera.position.x -= sx; R.camera.position.z -= sz;
    }

    // ---------- Récords (almacén de Retos, clave maze) ----------
    function leerRec() {
      let d = null; try { d = JSON.parse(localStorage.getItem(claveRec) || 'null'); } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || d.v !== 1) d = { v: 1, carrera: {}, tormenta: {}, rio: {}, banquete: {} };
      if (!d.maze || typeof d.maze !== 'object') d.maze = { mejor: null, jugadas: 0 };
      return d;
    }
    function guardarRec(d) { try { localStorage.setItem(claveRec, JSON.stringify(d)); return true; } catch (e) { return false; } }

    // ---------- Interfaz (estilos propios con los tokens de tokens.css; ui.css no se toca) ----------
    const CSS = `
body.maze-on #top, body.maze-on #b-diary, body.maze-on #b-emotes, body.maze-on #b-nido, body.maze-on #prompt, body.maze-on #toast, body.maze-on #keyhint,
body.maze-on #tag, body.maze-on #emotes, body.maze-on #acts, body.maze-on #stick, body.maze-on #quest-toggle, body.maze-on #guia-hud, body.maze-on #minimapa, body.maze-on #retos { display: none !important; }
html body.maze-on #pause .pause-grid > :not(#b-sound) { display: none !important; }
#maze { position: fixed; inset: 0; z-index: var(--z-card, 30); font-family: var(--font-display, system-ui, sans-serif); color: var(--c-text, #f4f7f1); pointer-events: none; }
#maze [hidden] { display: none !important; }
#maze .mz-toque { position: absolute; inset: 0; pointer-events: auto; touch-action: none; -webkit-user-select: none; user-select: none; }
#maze .mz-hud { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); left: 12px; right: 96px; display: flex; gap: 8px; flex-wrap: wrap; }
#maze .mz-chip { background: var(--c-surface, rgba(10,30,20,.85)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-pill, 999px); padding: 5px 14px; display: flex; align-items: baseline; gap: 6px;
  font: 700 22px/1.1 var(--font-display, system-ui); box-shadow: 0 4px 14px rgba(0,0,0,.3); font-variant-numeric: tabular-nums; white-space: nowrap; }
#maze .mz-chip small { font-size: 12px; color: var(--c-text-muted, #b8c7bd); font-weight: 600; }
#maze .mz-chip.pop { animation: mz-pop .25s ease-out; } @keyframes mz-pop { 0% { transform: scale(1.18); } 100% { transform: scale(1); } }
#maze .mz-combo { color: var(--gold, #ffd84a); }
#maze .mz-salir { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); right: calc(env(safe-area-inset-right, 0px) + 12px); pointer-events: auto; }
#maze .mz-pista, #maze .mz-msg { position: absolute; left: 50%; transform: translateX(-50%); text-align: center; font: 700 clamp(20px, 4.5vw, 30px)/1.2 var(--font-display, system-ui); text-shadow: 0 2px 10px rgba(0,0,0,.65); width: min(92vw, 560px); }
#maze .mz-pista { bottom: 16%; } #maze .mz-pista small, #maze .mz-msg small { display: block; font-size: .58em; font-weight: 600; opacity: .92; margin-top: 4px; }
#maze .mz-msg { top: 26%; color: var(--gold, #ffd84a); animation: mz-pop .3s ease-out; }
#maze .mz-fin { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(5, 18, 12, .35); }
#maze .mz-panel { pointer-events: auto; background: var(--c-surface, rgba(10,30,20,.92)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-lg, 18px); padding: 22px 26px; width: min(92vw, 420px); text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
#maze .mz-panel h2 { margin: 0 0 6px; font-size: 28px; } #maze .mz-panel p { margin: 4px 0 10px; color: var(--c-text-muted, #b8c7bd); }
#maze .mz-num { font: 800 60px/1 var(--font-display, system-ui); color: var(--gold, #ffd84a); margin: 6px 0; }
#maze .mz-nuevo { color: var(--gold, #ffd84a); font-weight: 800; margin-bottom: 8px; }
#maze .mz-fila { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
#maze .mz-tecla { font-size: 12px; opacity: .75; margin-left: 6px; }
@media (prefers-reduced-motion: reduce) { #maze .mz-chip.pop, #maze .mz-msg { animation: none; } }`;
    function montarUI() {
      if (st.ui) return st.ui;
      const css = document.createElement('style'); css.id = 'maze-css'; css.textContent = CSS; document.head.appendChild(css);
      const el = document.createElement('div'); el.id = 'maze'; el.hidden = true;
      el.innerHTML = `
<div class="mz-toque" aria-label="Desliza para guiar a Vittata"></div>
<div class="mz-hud"><div class="mz-chip mz-c-frutos"><span class="mz-frutos">0/0</span><small>frutos</small></div><div class="mz-chip mz-c-puntos"><span class="mz-puntos">0</span><small class="mz-mejor"></small></div><div class="mz-chip"><span class="mz-combo">x1</span><small>combo</small></div></div>
<button class="btn ghost secondary mz-salir" type="button" data-salir data-icon="close" aria-label="Salir de Amazona Maze">Salir</button>
<div class="mz-pista">${TACTIL ? '¡Desliza para caminar!' : '¡Flechas o WASD para caminar!'}<small>Recoge todos los frutos. Los guardianes del musgo te buscan: si te encuentran, el combo vuelve a x1.</small></div>
<div class="mz-msg" role="status" hidden>¡Te encontraron!<small>El combo vuelve a x1. ¡Sigue buscando frutos!</small></div>
<div class="mz-fin" hidden><div class="mz-panel" role="dialog" aria-labelledby="mz-fin-t">
  <h2 id="mz-fin-t">¡Laberinto completo!</h2>
  <p class="mz-resumen"></p>
  <div class="mz-num">0</div>
  <div class="mz-nuevo" hidden>¡Nuevo récord!</div>
  <p class="mz-rec"></p>
  <div class="mz-fila">
    <button class="btn xl" type="button" data-otra data-icon="reset">Otra vez<span class="mz-tecla">${TACTIL ? '' : 'Enter'}</span></button>
    <button class="btn ghost secondary" type="button" data-salir data-icon="close">Volver a la historia</button>
  </div>
</div></div>`;
      document.body.appendChild(el);
      const q = s => el.querySelector(s);
      st.ui = { el, toque: q('.mz-toque'), frutos: q('.mz-frutos'), puntos: q('.mz-puntos'), mejor: q('.mz-mejor'), combo: q('.mz-combo'), cPuntos: q('.mz-c-puntos'), pista: q('.mz-pista'), msg: q('.mz-msg'), fin: q('.mz-fin'), resumen: q('.mz-resumen'), num: q('.mz-num'), nuevo: q('.mz-nuevo'), rec: q('.mz-rec') };
      // Deslizar el dedo: cada 22 px de recorrido fija la dirección (se puede ir girando sin levantar el dedo); un toque en los resultados = otra vez
      let ini = null;
      st.ui.toque.addEventListener('pointerdown', e => { e.preventDefault(); ini = { x: e.clientX, y: e.clientY }; if (st.fase === 'fin' && J.finT >= P.finEspera) otraVez(); });
      st.ui.toque.addEventListener('pointermove', e => {
        if (!ini) return; const dx = e.clientX - ini.x, dy = e.clientY - ini.y;
        if (Math.hypot(dx, dy) < 22) return;
        dirigir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); ini = { x: e.clientX, y: e.clientY };
      });
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) st.ui.toque.addEventListener(ev, () => { ini = null; });
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-otra')) otraVez(); else if (b.hasAttribute('data-salir')) salir(); });
      // Teclado (antes de input.js, en captura): flechas o WASD; en los resultados, Enter o Espacio
      const TECLAS = { ArrowUp: 0, w: 0, W: 0, ArrowRight: 1, d: 1, D: 1, ArrowDown: 2, s: 2, S: 2, ArrowLeft: 3, a: 3, A: 3 };
      addEventListener('keydown', e => {
        if (!st.activo || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.closest && e.target.closest('#maze button, input, select, textarea, #pause')) return;
        if (G.pausa.activa()) return;
        if (st.fase === 'fin') { if (!e.repeat && (e.key === 'Enter' || e.key === ' ') && J.finT >= P.finEspera) { e.preventDefault(); otraVez(); } return; }
        if (e.key in TECLAS) { e.preventDefault(); e.stopPropagation(); dirigir(TECLAS[e.key]); }
        else if (e.key === ' ') e.preventDefault();
      }, true);
      return st.ui;
    }
    function dirigir(d) {
      if (!st.activo || st.fase === 'fin') return false;
      J.quiere = d;
      if (st.fase === 'listo') { st.fase = 'juego'; J.t = 0; if (st.ui) st.ui.pista.hidden = true; }
      return true;
    }
    function pintar(pop) {
      const u = st.ui; if (!u) return;
      u.frutos.textContent = J.recogidos + '/' + lab.frutos.length; u.puntos.textContent = String(J.puntos); u.combo.textContent = 'x' + J.combo;
      u.mejor.textContent = J.mejor ? 'mejor ' + J.mejor : '';
      if (pop) { u.cPuntos.classList.remove('pop'); void u.cPuntos.offsetWidth; u.cPuntos.classList.add('pop'); }
    }
    function mensaje(si) { if (st.ui) st.ui.msg.hidden = !si; }
    const reloj = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    function resultados() {
      const u = st.ui; if (!u) return;
      u.resumen.textContent = 'Todos los frutos en ' + reloj(J.t) + (J.bono ? ' · premio de rapidez +' + J.bono : '') + (J.encontrada ? ' · te encontraron ' + (J.encontrada === 1 ? '1 vez' : J.encontrada + ' veces') : ' · ¡nadie te encontró!');
      u.num.textContent = String(J.puntos); u.nuevo.hidden = !J.nuevo;
      u.rec.textContent = 'Tu mejor: ' + J.mejor;
      u.fin.hidden = false;
      const b = u.fin.querySelector('[data-otra]'); if (b) b.focus({ preventScroll: true });
    }

    // ---------- Entrar, jugar, salir (envolturas reversibles) ----------
    function libre() {
      const creadorNuevo = !$('creator').hidden && !(S.profile && S.profile.created);
      return !(G.dialogo.open() || G.ui.cardOpen || !$('end').hidden || !$('comic').hidden || (!$('creator').hidden && !creadorNuevo));
    }
    const ACCIONES = ['tryJump', 'releaseJump', 'tryDash', 'toggleFly', 'land', 'startFlying'];
    function entrar() {
      if (st.activo) return true;
      st.snap = G.guardado.instantanea();
      G.guardado.suspender(true);
      st.quiet = G.quiet; G.quiet = true;
      S.event = null; G.fx.rain.visible = false;
      const C = G.camara, cam3 = R.camera;
      const env = st.env = { busy: G.ui.busy, step: F.step, suelo: F.suelo, action: G.interaccion.action, follow: C.follow, fov: C.fov, draw: C.draw, manual: C.manual, camFov: cam3.fov,
        companero: G.actores.companion3D ? G.actores.companion3D.root.visible : null };
      for (const k of ACCIONES) env[k] = F[k];
      G.ui.busy = () => true;
      F.step = () => false;
      F.suelo = function (x, z) { return dentroCayo(x, z) ? st.A.piso : env.suelo.apply(F, arguments); }; // en el cayo el suelo es su arena
      for (const k of ACCIONES) F[k] = () => {};
      G.interaccion.action = () => {};
      C.follow = dt => camFollow(dt); C.fov = () => {}; C.draw = dt => camDraw(dt); C.manual = () => {};
      if (G.actores.companion3D) G.actores.companion3D.root.visible = false;
      if (M.flying && F.endFlight) F.endFlight(); // si entraba volando, camina
      document.body.classList.add('maze-on', 'retos-on'); // retos-on: musica.js elige la pista de Retos
      st.A = arena();
      raiz.visible = true; if (!raiz.parent) scene.add(raiz);
      st.activo = true;
      return true;
    }
    function iniciar(semilla) {
      soltarTodo();
      rnd = G.util.rng(J.semilla = semilla || ((Date.now() ^ (Math.random() * 1e9)) >>> 0) || 1);
      generarLab(); construir(); ponerFrutos();
      const x0 = lab.inicio % P.n, z0 = (lab.inicio / P.n) | 0, cc = (P.n - 1) / 2;
      Object.assign(J, { gx: x0, gz: z0, d: -1, quiere: -1, ultima: 2, t: 0, puntos: 0, combo: 1, racha: 0, recogidos: 0, encontrada: 0, gracia: 0, finT: 0, nuevo: false, bono: 0, mejor: leerRec().maze.mejor || 0 });
      guard.length = 0;
      const modos = ['directo', 'adelante', 'paseo'], tintes = [[0.75, 1, 0.75], [0.7, 0.95, 1], [1, 0.92, 0.65]], sal = [[cc, cc], [cc - 1, cc], [cc + 1, cc]];
      for (let k = 0; k < 3; k++) {
        guard.push({ gx: sal[k][0], gz: sal[k][1], gx0: sal[k][0], gz0: sal[k][1], d: -1, v: P.velG[k], salida: P.salidaG[k], fuera: false, vuelta: 0, modo: modos[k], hop: k * 0.7 });
        if (pool.guardian) for (const im of pool.guardian.mallas) im.setColorAt(k, _c.setRGB(tintes[k][0], tintes[k][1], tintes[k][2]));
      }
      st.fase = 'listo'; st.msgT = 0;
      const u = st.ui; if (u) { u.el.hidden = false; u.fin.hidden = true; u.pista.hidden = false; u.msg.hidden = true; pintar(false); }
      sincronizar(); colocar(0); subir();
      camFollow(null); G.camara.place(true);
    }
    const _c = new THREE.Color();
    function otraVez() { if (!st.activo) return false; iniciar(); return true; }
    function abrir() {
      montarUI();
      if (!st.activo && !libre()) { G.ui.toast('Termina lo que estás haciendo y vuelve a probar Amazona Maze.', 3200); return Promise.resolve(false); }
      if (!$('creator').hidden) { st.creador = true; G.creador.close(); }
      if (!st.listo) G.ui.toast('Cargando Amazona Maze…', 5000);
      return crearPool().then(() => { entrar(); iniciar(); return true; }, e => { G.ui.toast('No se pudo cargar Amazona Maze. Prueba otra vez.', 3000); console.error('maze:', e); return false; });
    }
    function salir() {
      if (!st.activo) { if (st.ui) st.ui.el.hidden = true; document.body.classList.remove('maze-on', 'retos-on'); return; }
      const env = st.env, C = G.camara, cam3 = R.camera;
      soltarTodo(); subir(); raiz.visible = false; st.fase = 'nada';
      G.ui.busy = env.busy; F.step = env.step; F.suelo = env.suelo; G.interaccion.action = env.action;
      for (const k of ACCIONES) F[k] = env[k];
      C.follow = env.follow; C.fov = env.fov; C.draw = env.draw; C.manual = env.manual;
      cam3.fov = env.camFov; cam3.updateProjectionMatrix();
      if (G.actores.companion3D && env.companero != null) G.actores.companion3D.root.visible = env.companero;
      document.body.classList.remove('maze-on', 'retos-on');
      M.vx = M.vz = 0; M.speed = 0; M.dashT = 0; M.fase = '';
      G.guardado.restaurar(st.snap); st.snap = null;
      G.guardado.suspender(false); G.quiet = st.quiet;
      if (st.creador && !(S.profile && S.profile.created)) G.creador.open(true); st.creador = false;
      const pj = G.actores.player3D; if (pj) pj.root.visible = true;
      G.camara.place(true);
      if (st.ui) st.ui.el.hidden = true;
      st.activo = false; st.env = null; st.A = null;
      liberarPool();
    }
    function liberarPool() {
      for (const t in pool) {
        for (const im of pool[t].mallas) {
          raiz.remove(im);
          if (pool[t].propio) { im.geometry.dispose(); for (const k of ['map', 'normalMap']) if (im.material[k]) im.material[k].dispose(); im.material.dispose(); }
          im.dispose();
        }
        delete pool[t];
      }
      for (const m of [st.piso, st.borde]) if (m) raiz.remove(m);
      for (const o of propios) o.dispose(); propios.length = 0; st.piso = st.borde = null;
      if (raiz.parent) scene.remove(raiz);
      st.listo = null;
    }

    // ---------- Pruebas: AV.mazeTest() ----------
    function test(o) {
      o = o || {};
      const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
      const comparable = s => JSON.stringify(s, (k, v) => (k === 'clock' || k === 'playTime' || k === 't' ? undefined : v));
      const recReal = leer(ALMACEN);
      if (st.activo) salir();
      const busy0 = G.ui.busy, step0 = F.step, suelo0 = F.suelo, follow0 = G.camara.follow, draw0 = G.camara.draw, quiet0 = G.quiet, fov0 = R.camera.fov;
      const mem = () => ({ g: R.renderer.info.memory.geometries, t: R.renderer.info.memory.textures });
      claveRec = ALMACEN + '.prueba';
      try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
      let emitido = null; const emit0 = G.emit; G.emit = function (n, d) { if (n === 'retosResultado') emitido = d; return emit0.apply(G, arguments); };
      // Robot: va por el camino más corto al fruto más cercano (BFS); los guardianes siguen jugando (encontrarla no termina la partida)
      const robot = (maxS, dt) => {
        dt = dt || 1 / 30; let t = 0;
        while (st.fase === 'juego' && t < maxS) {
          { // decide en la casilla a la que va (la siguiente del pasillo, o la actual si está en su centro)
            const enC = Math.abs(J.gx - Math.round(J.gx)) < 1e-6 && Math.abs(J.gz - Math.round(J.gz)) < 1e-6, d0 = J.d;
            const c = enC || d0 < 0 ? celdaDe(J) : idx(DX[d0] ? (DX[d0] > 0 ? Math.floor(J.gx + 1e-6) + 1 : Math.ceil(J.gx - 1e-6) - 1) : Math.round(J.gx), DZ[d0] ? (DZ[d0] > 0 ? Math.floor(J.gz + 1e-6) + 1 : Math.ceil(J.gz - 1e-6) - 1) : Math.round(J.gz));
            const vivos = lab.frutos.filter(f => f.activo);
            if (vivos.length) {
              let obj = vivos[0].c, md = 1e9; const D0 = distancias(c);
              for (const f of vivos) if (D0[f.c] >= 0 && D0[f.c] < md) { md = D0[f.c]; obj = f.c; }
              const D = distancias(obj), x = c % P.n, z = (c / P.n) | 0;
              for (let d = 0; d < 4; d++) if (abierto(c, d) && D[idx(x + DX[d], z + DZ[d])] === D[c] - 1) { J.quiere = d; break; }
            }
          }
          paso(dt); t += dt;
        }
        return { t, fase: st.fase, recogidos: J.recogidos, encontrada: J.encontrada, puntos: J.puntos };
      };
      let sAntes = null;
      return (async () => {
        try {
          await crearPool(); sAntes = comparable(S);
          check('Declaración completa (id, nombre, recursos, cámara, controles, inicio, victoria, persecución, puntuación, música, resultados, récords) y oculto', ['id', 'nombre', 'descripcion', 'recursos', 'camara', 'controles', 'inicio', 'victoria', 'persecucion', 'puntuacion', 'musica', 'resultados', 'records'].every(k => DECL[k] != null) && DECL.oculto === true);
          const ok = await abrir();
          check('Entra con el mundo libre y el pool cargado (kit, frutos de banquete.js, guardianes)', ok === true && st.activo && raiz.parent === scene && ['tronco', 'roca', 'bambu', 'palma', 'guardian', 'fpalma', 'ftabonuco', 'ojo', 'pupila'].every(t => pool[t]), Object.keys(pool).join(','));
          const bqM = G.banquete && G.banquete._dev && G.banquete._dev.mundo && G.banquete._dev.mundo.mallas;
          check('Los frutos son las mallas de banquete.js (misma geometría y material, sin copiar)', !!bqM && pool.fpalma.mallas[0].geometry === bqM.palma.geometry && pool.ftabonuco.mallas[0].material === bqM.tabonuco.material);
          check('Envolturas: la historia ve el mundo ocupado, fisica no manda, suelo del cayo y cámara propia', G.ui.busy() === true && F.step !== step0 && F.suelo !== suelo0 && F.suelo(S.pos.x, S.pos.z, S.pos.y) === st.A.piso && G.camara.follow !== follow0 && G.camara.draw !== draw0);
          check('Clases maze-on y retos-on, HUD y pista visibles, fase listo', document.body.classList.contains('maze-on') && document.body.classList.contains('retos-on') && !st.ui.el.hidden && !st.ui.pista.hidden && st.fase === 'listo');
          check('Vittata camina en la salida (esquina suroeste), sobre la arena y sin volar', M.flying === false && M.grounded === true && Math.abs(S.pos.y - st.A.piso) < 1e-6 && celdaDe(J) === lab.inicio);
          // ---------- Recorridos válidos (40 semillas) ----------
          let conexos = 0, frutosOk = 0, bucles = 0, lejosCasa = 0, sinPisar = 0;
          for (let s = 1; s <= 40; s++) {
            rnd = G.util.rng(s * 7919); generarLab();
            const D = distancias(lab.inicio); if (Array.prototype.every.call(D, v => v >= 0)) conexos++;
            soltarTodo(); ponerFrutos();
            if (lab.frutos.length === P.frutos && lab.frutos.every(f => D[f.c] >= 3)) frutosOk++;
            if (lab.frutos.every(f => f.c !== lab.casa && f.c !== lab.inicio)) sinPisar++;
            let aristas = 0; for (let c = 0; c < P.n * P.n; c++) for (const d of [1, 2]) if (abierto(c, d)) aristas++;
            if (aristas - (P.n * P.n - 1) >= 4) bucles++; // más pasillos que un árbol: hay bucles para esquivar
            if (D[lab.casa] >= 6) lejosCasa++;
          }
          check('40 laberintos: desde la salida se llega a todas las casillas (recorridos válidos garantizados)', conexos === 40, conexos + '/40');
          check('40 laberintos: ' + P.frutos + ' frutos, todos alcanzables y a ≥ 3 casillas de la salida; ninguno en la salida ni en el claro', frutosOk === 40 && sinPisar === 40, frutosOk + '/' + sinPisar);
          check('40 laberintos: con bucles (≥ 4 pasillos más que un árbol) y el claro de los guardianes a ≥ 6 casillas de la salida', bucles === 40 && lejosCasa === 40, bucles + '/' + lejosCasa);
          iniciar(12345);
          check('Paredes, postes y frutos colocados con instancias del pool', CAP.tronco - pool.tronco.libres.length > 40 && CAP.roca - pool.roca.libres.length > 30 && lab.frutos.every(f => f.i >= 0), (CAP.tronco - pool.tronco.libres.length) + ' troncos · ' + (CAP.roca - pool.roca.libres.length) + ' rocas');
          // ---------- Movimiento ----------
          { const c = lab.inicio; const dOk = [0, 1, 2, 3].find(d => abierto(c, d)), dNo = [0, 1, 2, 3].find(d => !abierto(c, d));
            dirigir(dNo); paso(0.3);
            check('Contra una pared no avanza; la primera dirección arranca la partida', st.fase === 'juego' && celdaDe(J) === c && Math.abs(J.gx - Math.round(J.gx)) + Math.abs(J.gz - Math.round(J.gz)) < 1e-6);
            dirigir(dOk); const g0 = { x: J.gx, z: J.gz }; paso(0.2);
            check('Por un pasillo abierto avanza a ' + P.vel + ' m/s y Vittata mira hacia allí con su paso (MOVE.speed)', Math.abs(Math.hypot(J.gx - g0.x, J.gz - g0.z) * P.celda - P.vel * 0.2) < 0.02 && (sincronizar(), M.speed === P.vel && S.facing.x === DX[dOk] && S.facing.z === DZ[dOk]));
            dirigir(opuesto(dOk)); paso(0.1);
            check('Media vuelta en el pasillo, sin esperar al cruce', J.d === opuesto(dOk)); }
          { let atraviesa = false; J.gx = 0; J.gz = P.n - 1; J.d = -1;
            for (let k = 0; k < 600 && !atraviesa; k++) { J.quiere = Math.floor(rnd() * 4); const c0 = celdaDe(J), x0 = Math.round(J.gx), z0 = Math.round(J.gz); paso(1 / 30); const x1 = Math.round(J.gx), z1 = Math.round(J.gz); if (x1 !== x0 || z1 !== z0) { const d = [0, 1, 2, 3].find(q => x0 + DX[q] === x1 && z0 + DZ[q] === z1); if (d == null || !abierto(c0, d)) atraviesa = true; } }
            check('Paseo al azar de 20 s: nunca atraviesa una pared ni sale de la rejilla', !atraviesa && J.gx >= 0 && J.gz >= 0 && J.gx <= P.n - 1 && J.gz <= P.n - 1); }
          // ---------- Frutos y puntuación ----------
          st.sinFx = true; iniciar(777); dirigir(-1); st.fase = 'juego';
          for (const g of guard) g.salida = 1e9; // sin guardianes para medir la puntuación
          { const f1 = lab.frutos.find(f => f.tipo === 'palma'), f2 = lab.frutos.filter(f => f.tipo === 'palma')[1] || lab.frutos[1], p0 = J.puntos;
            J.gx = f1.c % P.n; J.gz = (f1.c / P.n) | 0; J.d = -1; J.quiere = -1; paso(1 / 60);
            check('Pasar por un fruto lo recoge: desaparece y suma 10 × combo', !f1.activo && J.puntos === p0 + P.puntosPalma && J.recogidos === 1 && pool.fpalma.mallas[0].count === CAP.fpalma, J.puntos);
            J.gx = f2.c % P.n; J.gz = (f2.c / P.n) | 0; paso(1 / 60);
            check('El combo sube con frutos seguidos (x2 al segundo)', J.combo === 2 && J.recogidos === 2, 'x' + J.combo);
            const ft = lab.frutos.find(f => f.activo && f.tipo === 'tabonuco');
            if (ft) { const p1 = J.puntos; J.gx = ft.c % P.n; J.gz = (ft.c / P.n) | 0; paso(1 / 60); check('El tabonuco (en los callejones) vale 25 × combo', J.puntos - p1 === P.puntosTabonuco * J.combo, J.puntos - p1); }
            else check('El tabonuco (en los callejones) vale 25 × combo', false, 'sin tabonuco'); }
          // ---------- Persecución ----------
          { iniciar(4242); st.fase = 'juego'; J.racha = 4; J.combo = 3; const g = guard[0]; g.salida = 0; g.fuera = true;
            const pista = (st.ui.pista.hidden = true);
            g.gx = J.gx + 0.3; g.gz = J.gz; g.d = -1; const pts = J.puntos; paso(1 / 60);
            check('Si un guardián la alcanza: «¡Te encontraron!», el combo vuelve a x1, los puntos se quedan y no hay daño ni vidas', pista && J.encontrada === 1 && J.combo === 1 && J.racha === 0 && J.puntos === pts && st.fase === 'juego' && !st.ui.msg.hidden && /Te encontraron/.test(st.ui.msg.textContent) && !('vidas' in J), st.ui.msg.textContent);
            check('El guardián vuelve a su claro y hay gracia (no la encuentran otra vez enseguida)', g.vuelta > 0 && J.gracia > 0 && (g.gx === g.gx0 && g.gz === g.gz0));
            const g2 = guard[1]; g2.salida = 0; g2.fuera = true; g2.gx = J.gx; g2.gz = J.gz; paso(1 / 60);
            check('Durante la gracia otro guardián no la encuentra', J.encontrada === 1);
            g2.fuera = false; g2.salida = 1e9; g2.gx = g2.gx0; g2.gz = g2.gz0; guard[2].salida = 1e9;
            for (let k = 0; k < 200; k++) paso(1 / 60);
            check('Pasada la gracia el aviso se va y el guardián vuelve a salir', st.msgT === 0 && g.vuelta <= 0 && J.gracia === 0); }
          { iniciar(99); st.fase = 'juego'; J.quiere = -1;
            for (const g of guard) g.salida = 1e9; const g = guard[0]; g.salida = 0; g.fuera = false;
            const D0 = distancias(celdaDe(J))[celdaDe(g)]; let t = 0;
            while (J.encontrada === 0 && t < 40) { paso(1 / 30); t += 1 / 30; }
            check('Persecución: el guardián «directo» encuentra a Vittata quieta por los pasillos (' + D0 + ' casillas)', J.encontrada === 1 && t < D0 * P.celda / (P.vel * g.v) + 4, t.toFixed(1) + ' s');
            check('Los guardianes son más lentos que Vittata (se les puede esquivar)', P.velG.every(v => v < 0.8)); }
          // ---------- Partida completa con robot, récord y «Mis récords» ----------
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
          const partidas = [];
          for (const s of [3, 17, 58]) { iniciar(s); dirigir(0); partidas.push(robot(400)); if (s !== 58) { st.fase = 'nada'; } }
          check('Robot (camino más corto al fruto más cercano, con los guardianes jugando): recoge todos los frutos en 3 laberintos', partidas.every(r => r.fase === 'fin' && r.recogidos === P.frutos), partidas.map(r => r.recogidos + ' frutos/' + r.t.toFixed(0) + ' s/' + r.encontrada + ' enc.').join(' · '));
          const rec1 = leerRec();
          check('Récord en el almacén de Retos (clave maze: mejor y jugadas) y nuevo récord avisado', rec1.maze.mejor === Math.max(...partidas.map(r => r.puntos)) && rec1.maze.jugadas === 3, JSON.stringify(rec1.maze));
          check('«Mis récords» recibe retosResultado { modo: maze, puntos, frutos, ms, prueba }', emitido && emitido.modo === 'maze' && emitido.puntos === J.puntos && emitido.frutos === P.frutos && emitido.ms > 1000 && emitido.prueba === true, JSON.stringify(emitido));
          check('Premio de rapidez: 3 × (' + P.rapidez + ' − s)', J.bono === Math.max(0, Math.round(3 * (P.rapidez - J.t))), J.bono);
          await new Promise(r => setTimeout(r, 600));
          check('Resultados a la vista con «Otra vez»', !st.ui.fin.hidden && st.ui.num.textContent === String(J.puntos) && /Todos los frutos/.test(st.ui.resumen.textContent));
          check('Enter justo al terminar no reinicia; pasado finEspera sí', (J.finT = 0, document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), st.fase === 'fin') && (J.finT = P.finEspera, document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), st.fase === 'listo' && J.puntos === 0 && st.ui.fin.hidden));
          // ---------- Cámara: escritorio y móvil vertical (375×812) ----------
          const vista = asp => {
            const a0 = cam.asp; cam.asp = asp;
            const c = new THREE.PerspectiveCamera(CAMS[modoCam()].fov, asp, 0.1, 500); camObjetivo(c.position); c.lookAt(camMira()); c.updateMatrixWorld(true);
            const pr = (x, y, z) => new THREE.Vector3(x, y, z).project(c);
            const root = G.actores.player3D && G.actores.player3D.root, bb = root ? new THREE.Box3().setFromObject(root) : null, hv = bb && !bb.isEmpty() && bb.max.y - bb.min.y > 0.3 && bb.max.y - bb.min.y < 5 ? bb.max.y - bb.min.y : 1.2;
            const v0 = pr(S.pos.x, S.pos.y, S.pos.z), v1 = pr(S.pos.x, S.pos.y + hv, S.pos.z);
            const izq = pr(S.pos.x - 1.5 * P.celda, st.A.piso, S.pos.z), der = pr(S.pos.x + 1.5 * P.celda, st.A.piso, S.pos.z), arr = pr(S.pos.x, st.A.piso, S.pos.z - 3 * P.celda), abj = pr(S.pos.x, st.A.piso, S.pos.z + 1.2 * P.celda);
            cam.asp = a0; return { V: v0, tam: Math.abs(v1.y - v0.y) / 2, izq, der, arr, abj, hv };
          };
          const en = p => p.z > 0 && p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
          J.gx = (P.n - 1) / 2 - 1; J.gz = (P.n - 1) / 2 + 2; sincronizar();
          const vd = vista(16 / 9), vm = vista(375 / 812);
          check('Escritorio: Vittata cerca del centro, ≥ 6 % del alto, y se ven 1,5 casillas a cada lado, 3 delante y 1 detrás', en(vd.V) && Math.abs(vd.V.x) < 0.2 && vd.tam >= 0.06 && en(vd.izq) && en(vd.der) && en(vd.arr) && en(vd.abj), 'V ' + vd.V.x.toFixed(2) + ',' + vd.V.y.toFixed(2) + ' tam ' + (vd.tam * 100).toFixed(1) + '% (alto ' + vd.hv.toFixed(2) + ' m)');
          check('Móvil vertical 375×812: Vittata ≥ 4 % del alto y centrada; 1,5 casillas a cada lado, 3 delante y 1 detrás a la vista', en(vm.V) && Math.abs(vm.V.x) < 0.2 && vm.tam >= 0.04 && en(vm.izq) && en(vm.der) && en(vm.arr) && en(vm.abj), 'V ' + vm.V.x.toFixed(2) + ',' + vm.V.y.toFixed(2) + ' tam ' + (vm.tam * 100).toFixed(1) + '% · izq ' + vm.izq.x.toFixed(2) + ' der ' + vm.der.x.toFixed(2) + ' arr ' + vm.arr.y.toFixed(2) + ' abj ' + vm.abj.y.toFixed(2));
          // ---------- 50 reinicios: sin fugas ----------
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m0 = mem(), capOk = [];
          for (let i = 0; i < 50; i++) {
            otraVez(); dirigir(i % 4); robot(3 + (i % 5));
            capOk.push(Object.keys(pool).every(t => pool[t].libres.length >= 0 && new Set(pool[t].libres).size === pool[t].libres.length) && vivas() <= Object.values(CAP).reduce((a, b) => a + b, 0));
          }
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m1 = mem();
          check('50 reinicios: geometrías y texturas del renderer no crecen (sin fugas)', m1.g <= m0.g && m1.t <= m0.t, JSON.stringify(m0) + ' → ' + JSON.stringify(m1));
          check('50 reinicios: el pool nunca se desborda ni duplica huecos', capOk.every(Boolean));
          // ---------- Salir ----------
          salir();
          check('Al salir se quitan las envolturas (también el suelo) y la cámara vuelve', G.ui.busy === busy0 && F.step === step0 && F.suelo === suelo0 && G.camara.follow === follow0 && G.camara.draw === draw0 && R.camera.fov === fov0 && !document.body.classList.contains('maze-on') && !document.body.classList.contains('retos-on'));
          check('Al salir G.quiet vuelve y la partida de la historia (G.S) queda intacta', G.quiet === quiet0 && comparable(S) === sAntes);
          check('Récords reales intactos', leer(ALMACEN) === recReal);
          check('Nada del laberinto queda en la escena (pool liberado)', raiz.visible === false && !raiz.parent && Object.keys(pool).length === 0 && propios.length === 0);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m2 = mem();
          check('Al salir las geometrías del renderer bajan de las de la partida y las texturas no suben', m2.g < m0.g && m2.t <= m0.t, JSON.stringify(m0) + ' → ' + JSON.stringify(m2));
        } catch (e) {
          check('Sin excepciones', false, (e && e.stack) || String(e));
          try { salir(); } catch (e2) { /* ya fuera */ }
        } finally {
          G.emit = emit0; st.sinFx = false;
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
          claveRec = ALMACEN;
        }
        const passed = out.filter(x => x.ok).length;
        if (!o.silencioso) console.log('AV.mazeTest: ' + passed + '/' + out.length + (passed === out.length ? ' ✓' : ' · ' + out.filter(x => !x.ok).map(x => x.name + (x.extra ? ' (' + x.extra + ')' : '')).join(' | ')));
        return { passed, total: out.length, results: out };
      })();
    }

    G.mazeApi = { DECL, P, abrir, salir, otraVez, dirigir, liberar: () => { if (st.activo) salir(); else liberarPool(); },
      _dev: { J, st, lab, guard, pool, cam, CAMS, paso, distancias, generarLab, abierto }, get activo() { return st.activo; }, get fase() { return st.fase; },
      estado: () => ({ fase: st.fase, puntos: J.puntos, combo: J.combo, frutos: lab.frutos.filter(f => !f.activo).length + '/' + lab.frutos.length, encontrada: J.encontrada, t: J.t, instancias: vivas(), semilla: J.semilla }), test };
    return G.mazeApi;
  };
})();
