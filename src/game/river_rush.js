/* Juego · River Rush (prototipo AC1, carril AC de la API, 26-oct-2026; oculto: ?mini=river o AV.riverRush(), pruebas AV.riverTest())
   Descenso en canoa por el río Amazonas del mapa: Vittata (la original, modelo y rig intactos) va sentada en la canoa del kit de
   edificios (`canoa`, la misma de las 32 decorativas del mapa) y baja el cauce desde el nacimiento hasta el mar. Se esquivan troncos
   y rocas (piezas que YA existen en el kit de entorno: tronco_caido, roca_musgo_b, piedras_rio) y se recogen racimos de palma de
   sierra (el fruto que más come la cotorra, como en el Banquete) para sumar puntos. Chocar es un «¡Uy!» amable (nunca daño) y se
   vuelve a empezar con un toque. Llegar al mar es la meta.
   Cómo encaja con lo que hay (patrón de src/game/flight.js y retos.js; docs/equipo/MINIJUEGOS.md §5):
   - El cauce: mapa.agua.rio.puntos ([x, z, nivel, medioAncho], > 300 puntos, ~1,4 km) como spline Catmull-Rom centrípeta muestreada
     cada metro (como construirRuta de retos.js). Cada muestra guarda el nivel del agua (G.agua.levelAt, suavizado: los saltos de 1 m
     del mapa son rápidos cortos) y el ancho navegable a cada lado, medido contra el terreno (la orilla manda, no el ancho nominal).
   - Coordenadas del cauce: la canoa vive en (s, lado) = metros río abajo y metros a la derecha del centro. Los obstáculos y los
     racimos también, así que chocar es exacto y no depende de las curvas.
   - Entrar/salir = Flight: instantánea de G.S, guardado suspendido, G.quiet, envolturas reversibles (G.ui.busy, fisica, acciones,
     cámara), clases river-on y retos-on (música de Retos). Al salir se repone todo y la partida vuelve a como estaba.
   - Vittata: solo los valores que actores.js lee (S.pos, S.facing, MOVE: posada en algo fino = agachada y agarrada a la borda).
   - Generación JUSTA por filas: cada fila deja un hueco libre (≥ 2,2 m) alcanzable desde el anterior con la velocidad lateral real
     (80 % de seguridad y 0,3 s de reacción); lo comprueba riverTest con un robot que baja el río entero con 3 semillas.
   - Dificultad: la velocidad sube de 6 a 13 m/s en los primeros 800 m, las filas se acercan y los huecos se estrechan.
   - Pool: InstancedMesh creadas una vez al entrar (solo cambia instanceMatrix); al salir se libera todo.
   - Puntos: 1 por cada 10 m, 10 por racimo y 50 al llegar al mar. Récord en `<almacen>.retos` (clave rio_rush: { mejor, jugadas })
     y gancho retosResultado { modo: 'rio_rush', puntos } → «Mis récords» (src/game/records.js).
   - Controles: un dedo (arrastrar a izquierda o derecha, en cualquier sitio de la pantalla) o teclas ← → / A D. Enter, Espacio o un
     toque en los resultados = «Otra vez». Esc abre la pausa.
   AC2 (completo, publicado): tarjeta en «¿Cómo quieres jugar?» y en Retos, medallas por puntos (bronce 40, plata 120, oro 250),
   el «casi» y la siguiente meta, ranking global (reto 'rio_rush', solo el clásico) e inglés (content/cap1/en.js). Dos modalidades más:
   - Contrarreloj: hasta el mar contra el reloj; chocar no termina, frena la canoa un momento y aparta lo que se tocó. La bajada es
     siempre la misma (semilla fija) para que se aprenda. Medallas por tiempo sobre la bajada perfecta (oro +4 s, plata +12 s).
   - Contra tu fantasma: la contrarreloj con tu mejor bajada al lado; el fantasma es el de Retos (mismo formato, una muestra cada
     0,1 s en decímetros por diferencias en base 36, y la misma cotorra translúcida), aquí en coordenadas del cauce (s, lado).
   window.AVRiverRush(G) → { DECL, abrir(modo), salir, otraVez, activo, estado, test }. */
(function () {
  'use strict';
  window.AVRiverRush = function (G) {
    if (G.riverRushApi) return G.riverRushApi;
    const S = G.S, R = G.renderer, F = G.fisica, M = F.MOVE, scene = R.scene, $ = G.util.$;
    const REDUCED = !!R.REDUCED;
    const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const ALMACEN = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.retos';
    let claveRec = ALMACEN;
    const MAPA = window.AV_MAPA_CAP1 || (G.terreno && G.terreno.mapa) || null;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const rate = (k, dt) => 1 - Math.exp(-dt * k);
    const H = (x, z) => G.terreno.height(x, z);
    const nivelAgua = (x, z) => { const w = G.agua.levelAt(x, z); return w > -1e8 ? w : -Infinity; };
    const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };

    // ---------- Declaración del minijuego (docs/equipo/MINIJUEGOS.md §4) ----------
    const DECL = {
      id: 'rio_rush', nombre: 'River Rush', nombreEn: 'River Rush',
      descripcion: 'Baja el río Amazonas en canoa. Esquiva troncos y rocas, recoge racimos de palma y llega al mar.',
      recursos: { kit: ['canoa', 'tronco_caido', 'roca_musgo_b', 'piedras_rio'], personaje: 'vittata (original)', zona: 'río Amazonas del mapa (mapa.agua.rio)' },
      camara: 'detrás y por encima de la canoa, siguiendo el cauce (encuadre propio en vertical)',
      controles: { pc: '← → o A D: a un lado y al otro', movil: 'arrastrar un dedo a izquierda o derecha', resultados: 'Enter, Espacio o un toque: otra vez' },
      inicio: 'el primer toque, arrastre o tecla arranca', victoria: 'llegar al mar', derrota: 'tocar un tronco o una roca («¡Uy!», sin daño)',
      puntuacion: '1 por cada 10 m, 10 por racimo, 50 al llegar al mar', musica: 'retos (sin reiniciar por obstáculo)',
      resultados: ['puntos', 'mejor', 'nuevoRecord', 'metros', 'racimos'], records: { clave: 'rio_rush', campos: ['mejor', 'jugadas'], gancho: 'retosResultado' },
      modos: { puntos: 'clásico: hasta chocar, por puntos', reloj: 'contrarreloj hasta el mar (chocar frena)', fantasma: 'contrarreloj contra tu mejor bajada' },
      oculto: false, // AC2: tarjeta en «¿Cómo quieres jugar?» y en Retos (también ?mini=river y AV.riverRush())
    };

    // ---------- Parámetros (metros y segundos; el generador los usa para que cada hueco sea alcanzable) ----------
    const P = {
      vel0: 6, vel1: 13, rampa: 800, // velocidad río abajo al empezar y a los 800 m
      vLat: 6, accLat: 12,           // velocidad lateral máxima (m/s) y su respuesta (1/s)
      arrastre: 9,                   // m de lado por un arrastre de todo el ancho de la pantalla
      largo: 1.55, ancho: 0.42,      // medio largo y medio ancho de la canoa para chocar (algo menos que el modelo: 1,9 × 0,48)
      orilla: 0.2,                   // m que se deja hasta la orilla
      hueco0: 1.6, hueco1: 1.1,      // medio ancho del hueco libre de cada fila (al empezar y al máximo)
      fila0: 24, fila1: 13,          // m entre filas
      despeje: 5,                    // m de fila que la canoa tarda en cruzar entera (largo + obstáculo)
      reaccion: 0.3, seguridad: 0.8, // el generador supone 0,3 s de reacción y solo el 80 % de la velocidad lateral
      inicio: 12, finMargen: 14,     // m desde el nacimiento al empezar y antes del mar para la meta
      primeraFila: 34,               // m hasta la primera fila
      adelante: 80, atras: 2.8,      // filas vivas: hasta 80 m delante; lo que queda 2,8 m detrás de la canoa se esconde
      finEspera: 0.45, bonoMeta: 50, puntosRacimo: 10, metrosPunto: 10,
      radioRacimo: 0.75,
    };
    // ---------- Modalidades (AC2) y medallas ----------
    const MODOS = ['puntos', 'reloj', 'fantasma'];
    const SEMILLA_RELOJ = 36;               // la contrarreloj baja siempre el mismo río: se aprende y el fantasma compite en igualdad
    const UY = { t: 1.6, k: 0.1 };          // contrarreloj: s que dura el frenazo de un choque y fracción de la velocidad que queda
    const ORDEN = ['bronce', 'plata', 'oro'], ART = { oro: 'el oro', plata: 'la plata', bronce: 'el bronce' };
    const MEDALLAS_P = [['bronce', 40], ['plata', 120], ['oro', 250]]; // puntos del clásico (los mismos en retos.js y records.js)
    let ideal = 0; // s de la bajada perfecta (sin choques) a la velocidad del río
    const tiempoIdeal = () => { if (!ideal && C) { for (let s = P.inicio; s < sFin(); s += 0.5) ideal += 0.5 / velocidadEn(s + 0.25); } return ideal; };
    // Contrarreloj: oro hasta 4 s y plata hasta 12 s por encima de la bajada perfecta (en segundos enteros); bronce, llegar al mar
    const limitesReloj = () => { const b = Math.ceil(tiempoIdeal()); return { oro: (b + 4) * 1000, plata: (b + 12) * 1000 }; };
    const medallaReloj = ms => { const l = limitesReloj(); return !(ms > 0) ? null : ms <= l.oro ? 'oro' : ms <= l.plata ? 'plata' : 'bronce'; };
    const medallaPuntos = p => { let m = null; for (const [n, v] of MEDALLAS_P) if (p >= v) m = n; return m; };
    const relojTxt = t => { const d = Math.max(0, Math.round(t * 10)); return Math.floor(d / 600) + ':' + String(Math.floor(d / 10) % 60).padStart(2, '0') + '.' + (d % 10); };
    const ingles = () => !!(G.idioma && G.idioma.actual && G.idioma.actual() === 'en');
    const dec = x => (Math.round(x * 10) / 10).toString().replace('.', ingles() ? '.' : ',');
    const esReloj = () => st.modo !== 'puntos';

    // ---------- El cauce: spline por mapa.agua.rio.puntos, muestreada cada metro ----------
    let C = null; // { N, X, Z, Y, TX, TZ, lo, hi, largo }
    function construirCauce() {
      if (C) return C;
      const PR = MAPA && MAPA.agua && MAPA.agua.rio && MAPA.agua.rio.puntos;
      if (!PR || PR.length < 10) return null;
      const curva = new THREE.CatmullRomCurve3(PR.map(p => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
      const pts = curva.getSpacedPoints(Math.max(40, Math.ceil(curva.getLength()))), N = pts.length;
      const X = new Float32Array(N), Z = new Float32Array(N), Yr = new Float32Array(N), Y = new Float32Array(N), TX = new Float32Array(N), TZ = new Float32Array(N), Wn = new Float32Array(N);
      let k = 0;
      for (let i = 0; i < N; i++) {
        X[i] = pts[i].x; Z[i] = pts[i].z;
        // Punto del mapa más cercano (avanza con el cauce): nivel nominal y medio ancho
        let bd = Infinity; for (let j = Math.max(0, k - 3); j < Math.min(PR.length, k + 12); j++) { const d = (PR[j][0] - X[i]) ** 2 + (PR[j][1] - Z[i]) ** 2; if (d < bd) { bd = d; k = j; } }
        const w = nivelAgua(X[i], Z[i]); Yr[i] = w > -Infinity ? w : PR[k][2]; Wn[i] = PR[k][3] || 4;
      }
      for (let i = 0; i < N; i++) {
        const a = Math.max(0, i - 2), b = Math.min(N - 1, i + 2), tx = X[b] - X[a], tz = Z[b] - Z[a], l = Math.hypot(tx, tz) || 1; TX[i] = tx / l; TZ[i] = tz / l;
        let s = 0, c = 0; for (let j = Math.max(0, i - 6); j <= Math.min(N - 1, i + 6); j++) { s += Yr[j]; c++; } Y[i] = Math.max(Yr[i] - 0.6, Math.min(Yr[i] + 0.6, s / c)); // los saltos de 1 m se vuelven rápidos de ~12 m
      }
      // Ancho navegable a cada lado: desde el centro hacia fuera mientras haya agua (terreno por debajo del nivel); mínimo de ±2 m de cauce
      const lo0 = new Float32Array(N), hi0 = new Float32Array(N), lo = new Float32Array(N), hi = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const nx = -TZ[i], nz = TX[i], lim = Math.min(9, Wn[i] + 1.5);
        const borde = sg => { let d = 0.5; for (; d <= lim; d += 0.25) { const x = X[i] + nx * d * sg, z = Z[i] + nz * d * sg; if (H(x, z) > Math.min(Yr[i], Y[i]) - 0.05) break; } return d - 0.25; };
        hi0[i] = Math.max(1.2, borde(1)); lo0[i] = -Math.max(1.2, borde(-1));
      }
      for (let i = 0; i < N; i++) { let a = -Infinity, b = Infinity; for (let j = Math.max(0, i - 2); j <= Math.min(N - 1, i + 2); j++) { a = Math.max(a, lo0[j]); b = Math.min(b, hi0[j]); } lo[i] = a + P.orilla; hi[i] = b - P.orilla; }
      C = { N, X, Z, Y, Yr, TX, TZ, lo, hi, largo: N - 1 };
      return C;
    }
    // Posición, tangente (río abajo), derecha y bordes a una distancia s del cauce (interpolado)
    function enCauce(s, out) {
      out = out || {};
      const f = clamp(s, 0, C.largo), i = Math.min(C.N - 2, Math.floor(f)), k = f - i;
      out.x = lerp(C.X[i], C.X[i + 1], k); out.z = lerp(C.Z[i], C.Z[i + 1], k); out.y = lerp(C.Y[i], C.Y[i + 1], k);
      const tx = lerp(C.TX[i], C.TX[i + 1], k), tz = lerp(C.TZ[i], C.TZ[i + 1], k), l = Math.hypot(tx, tz) || 1;
      out.tx = tx / l; out.tz = tz / l; out.nx = -out.tz; out.nz = out.tx; // derecha (vista río abajo)
      out.lo = lerp(C.lo[i], C.lo[i + 1], k); out.hi = lerp(C.hi[i], C.hi[i + 1], k);
      out.pend = (C.Y[i + 1] - C.Y[i]); // m por m (negativa río abajo)
      return out;
    }
    const mundo = (q, lado, o) => { o = o || {}; o.x = q.x + q.nx * lado; o.z = q.z + q.nz * lado; o.y = q.y; return o; };

    // ---------- Estado ----------
    const st = { activo: false, fase: 'nada', snap: null, quiet: false, creador: false, env: null, ui: null, listo: null, golpe: null, hitStop: 0, modo: 'puntos', fan: null, grab: null };
    const J = { s: 0, lado: 0, vl: 0, objetivo: null, v: P.vel0, t: 0, finT: 0, puntos: 0, racimos: 0, metros: 0, mejor: 0, nuevo: false, choque: '', golpeado: null, semilla: 1, izq: false, der: false, arr: null, giro: 0, rv: 0,
      uy: 0, choques: 0, ms: 0, mejorR: 0, ventaja: null };
    const filas = [];  // { s, g, hg, obst: [{ tipo: 'roca'|'piedras'|'tronco', s, l, r, l0, l1, i }] }
    const racimos = []; // { s, l, i, cogido }
    let rnd = G.util.rng(1);

    // ---------- Pool de instancias (una vez al entrar) y la canoa ----------
    const KIT_E = { base: 'assets/models/entorno/', b64: 'AV_ENTORNO_B64' }, KIT_B = { base: 'assets/models/edificios/', b64: 'AV_EDIFICIOS_B64' };
    const MODELO = { tronco: ['tronco_caido', KIT_E], roca: ['roca_musgo_b', KIT_E], piedras: ['piedras_rio', KIT_E] };
    const CAP = { tronco: 18, roca: 30, piedras: 24, racimo: 40 };
    const pool = {}; // tipo -> { mallas, libres, box, size, eje, largo, rt, rm }
    const raiz = new THREE.Group(); raiz.name = 'river_rush'; raiz.visible = false;
    let canoa = null; // { malla, box }
    const lin = c => new THREE.Color(c).convertSRGBToLinear();
    function materialDe(src, canoaMat) {
      const hoja = /^HOJA/.test(src.name || ''), roca = /^ROCA/.test(src.name || '');
      const m = hoja ? new THREE.MeshLambertMaterial({ map: src.map || null, side: THREE.DoubleSide, alphaTest: src.alphaTest || 0.5, color: lin('#e6f0d8') })
        : new THREE.MeshPhongMaterial({ map: src.map || null, normalMap: src.normalMap || null, shininess: roca ? 10 : 6, specular: new THREE.Color(0x0c0c0c), side: canoaMat ? THREE.DoubleSide : THREE.FrontSide,
          color: canoaMat ? new THREE.Color(1, 1, 1) : roca ? new THREE.Color(0.92, 0.92, 0.9) : new THREE.Color(0.78, 0.74, 0.7) });
      m.name = 'river:' + (src.name || 'mat'); m.userData.river = true;
      return m;
    }
    function cargarModelo(nombre, kit) {
      return G.assets.loadGLB(kit.base + nombre + '.glb', { b64: () => (window[kit.b64] || {})[nombre], script: kit.base + nombre + '_glb.js', base: kit.base, error: 'pieza no disponible: ' + nombre })
        .then(g => {
          g.scene.updateMatrixWorld(true);
          const prims = [], box = new THREE.Box3();
          g.scene.traverse(o => {
            if (!o.isMesh) return;
            const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
            if (geo.getAttribute('color')) geo.deleteAttribute('color'); // en el kit el color de vértice es AO/viento/fase, no color
            geo.computeBoundingBox(); box.union(geo.boundingBox);
            prims.push({ geo, src: o.material });
          });
          return { prims, box };
        });
    }
    // Racimo de palma de sierra (bolitas moradas colgando de un tallo; el mismo dibujo que el del Banquete), flotando
    function geoRacimo() {
      const partes = [], bola = (x, y, z, r) => { const g = new THREE.SphereGeometry(r, 7, 5); g.translate(x, y, z); partes.push(g); };
      const tallo = new THREE.CylinderGeometry(0.03, 0.04, 0.55, 5); tallo.translate(0, 0.25, 0); partes.push(tallo);
      for (let i = 0; i < 10; i++) { const a = i * 2.4, r = 0.09 + (i % 3) * 0.045, y = -0.05 - (i % 4) * 0.13; bola(Math.cos(a) * r * 1.3, y, Math.sin(a) * r * 1.3, 0.085 + (i % 2) * 0.025); }
      bola(0, -0.55, 0, 0.1);
      return G.util.mergeGeos(partes);
    }
    function crearPool() {
      if (st.listo) return st.listo;
      if (!construirCauce()) return Promise.reject(new Error('este mapa no tiene río (mapa.agua.rio)'));
      const tareas = Object.keys(MODELO).map(tipo => cargarModelo(MODELO[tipo][0], MODELO[tipo][1]).then(m => {
        const size = new THREE.Vector3(); m.box.getSize(size);
        const eje = size.x >= size.y && size.x >= size.z ? 'x' : size.z >= size.y ? 'z' : 'y';
        const p = { mallas: [], libres: [], box: m.box, size, eje, largo: size[eje] };
        p.rt = (eje === 'y' ? size.x + size.z : eje === 'x' ? size.y + size.z : size.x + size.y) / 4; // radio del tronco (medio grosor real)
        p.rm = (size.x + size.z) / 4; // radio de la planta de la roca
        for (const pr of m.prims) {
          const im = new THREE.InstancedMesh(pr.geo, materialDe(pr.src), CAP[tipo]);
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = 'river:' + tipo;
          raiz.add(im); p.mallas.push(im);
        }
        for (let i = CAP[tipo] - 1; i >= 0; i--) p.libres.push(i);
        pool[tipo] = p;
      }));
      tareas.push(cargarModelo('canoa', KIT_B).then(m => {
        const g = new THREE.Group(); g.name = 'river:canoa';
        for (const pr of m.prims) { const ms = new THREE.Mesh(pr.geo, materialDe(pr.src, true)); ms.castShadow = false; ms.receiveShadow = false; ms.frustumCulled = false; g.add(ms); }
        canoa = { grupo: g, box: m.box }; raiz.add(g);
      }));
      st.listo = Promise.all(tareas).then(() => {
        const rac = { mallas: [], libres: [], box: null };
        const geoR = geoRacimo(); geoR.computeBoundingBox(); rac.box = geoR.boundingBox.clone();
        const im = new THREE.InstancedMesh(geoR, R.linMat ? R.linMat(new THREE.MeshLambertMaterial({ color: '#7a2a52', emissive: '#5a1a40', emissiveIntensity: 0.55 })) : new THREE.MeshLambertMaterial({ color: 0x7a2a52 }), CAP.racimo);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; im.frustumCulled = false; im.name = 'river:racimo'; raiz.add(im); rac.mallas.push(im);
        for (let i = CAP.racimo - 1; i >= 0; i--) rac.libres.push(i);
        pool.racimo = rac;
        if (!raiz.parent) scene.add(raiz);
        return pool;
      }, e => { st.listo = null; throw e; });
      return st.listo;
    }
    const tomar = tipo => (pool[tipo] && pool[tipo].libres.length ? pool[tipo].libres.pop() : -1);
    const soltar = (tipo, i) => { if (i >= 0 && pool[tipo]) pool[tipo].libres.push(i); };
    const vivas = () => { let n = 0; for (const t in pool) n += CAP[t] - pool[t].libres.length; return n; };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _o = new THREE.Vector3(), _c = new THREE.Vector3();
    function esconder(tipo, i) { const p = pool[tipo]; if (!p || i < 0) return; _m.makeScale(0, 0, 0); for (const im of p.mallas) im.setMatrixAt(i, _m); }
    function subirMatrices() { for (const t in pool) for (const im of pool[t].mallas) { im.count = CAP[t]; im.instanceMatrix.needsUpdate = true; } }
    // Coloca la instancia con el centro de su caja en (x, ·, z) y su base (o su centro, si centroY) a la altura y
    function poner(tipo, i, x, y, z, rx, ry, rz, sx, sy, sz, centroY) {
      const p = pool[tipo]; if (!p || i < 0) return;
      _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _s.set(sx, sy, sz);
      p.box.getCenter(_c); _o.set(_c.x * sx, (centroY ? _c.y : p.box.min.y) * sy, _c.z * sz).applyQuaternion(_q);
      _p.set(x - _o.x, y - _o.y, z - _o.z); _m.compose(_p, _q, _s);
      for (const im of p.mallas) im.setMatrixAt(i, _m);
    }
    // Tronco tumbado de través: eje largo a lo largo de la derecha del cauce (n), largo len, centro en (x, y, z)
    function ponerTronco(i, x, y, z, nx, nz, len, giro) {
      const p = pool.tronco; if (!p || i < 0) return;
      const k = len / Math.max(0.5, p.largo), rotY = p.eje === 'x' ? Math.atan2(-nz, nx) : p.eje === 'z' ? Math.atan2(nx, nz) : 0;
      if (p.eje === 'y') { _e.set(0, Math.atan2(nx, nz), Math.PI / 2, 'YXZ'); } else _e.set(0, rotY, 0, 'YXZ');
      _q.setFromEuler(_e); if (p.eje !== 'y') { const r = new THREE.Quaternion().setFromAxisAngle(_o.set(nx, 0, nz), giro); _q.premultiply(r); }
      _s.set(p.eje === 'x' ? k : 1, p.eje === 'y' ? k : 1, p.eje === 'z' ? k : 1);
      p.box.getCenter(_c); _o.set(_c.x * _s.x, _c.y * _s.y, _c.z * _s.z).applyQuaternion(_q);
      _p.set(x - _o.x, y - _o.y, z - _o.z); _m.compose(_p, _q, _s);
      for (const im of p.mallas) im.setMatrixAt(i, _m);
    }

    // ---------- Generador por filas (justo: el hueco de cada fila se alcanza desde el anterior) ----------
    const dificultad = s => clamp((s - P.inicio) / P.rampa, 0, 1);
    const velocidadEn = s => lerp(P.vel0, P.vel1, dificultad(s));
    const sFin = () => C.largo - P.finMargen;
    // Lo que la canoa puede moverse de lado entre dos filas separadas ds (con reacción y seguridad)
    const alcanceLateral = (ds, v) => P.seguridad * P.vLat * Math.max(0, Math.max(0, ds - P.despeje) / v - P.reaccion);
    function generarFila() {
      const prev = filas.length ? filas[filas.length - 1] : (st.ultimaFila || { s: J.s + P.primeraFila - P.fila0, g: J.lado, hg: 9 });
      const k = dificultad(prev.s), ds = lerp(P.fila0, P.fila1, k) * (0.85 + rnd() * 0.3), s = prev.s + ds;
      if (s > sFin() - 20) return false;
      const q = enCauce(s, {}), lo = q.lo, hi = q.hi, hg = lerp(P.hueco0, P.hueco1, k), gmin = lo + hg, gmax = hi - hg;
      const reach = alcanceLateral(ds, velocidadEn(s)), a = Math.max(gmin, prev.g - reach), b = Math.min(gmax, prev.g + reach);
      const f = { s, g: clamp(prev.g, lo + P.ancho, hi - P.ancho), hg: 9, obst: [], libre: true };
      if (b - a >= 0) { // hay hueco alcanzable: obstáculos a los lados (al principio solo a un lado)
        f.g = lerp(a, b, rnd()); f.hg = hg; f.libre = false;
        const lados = k < 0.15 ? [rnd() < 0.5 ? -1 : 1] : [-1, 1];
        for (const sg of lados) {
          const borde = sg < 0 ? f.g - hg : f.g + hg, orilla = sg < 0 ? lo - 0.6 : hi + 0.6, w = Math.abs(orilla - borde);
          if (w < 0.5) continue;
          if (w >= 1.2 && rnd() < 0.35 && pool.tronco && pool.tronco.libres.length) { // tronco de la orilla hasta el borde del hueco
            const rt = pool.tronco.rt, l0 = Math.min(borde + sg * rt, orilla + sg * 0.8), l1 = Math.max(borde + sg * rt, orilla + sg * 0.8);
            f.obst.push({ tipo: 'tronco', s, l0: Math.min(l0, l1), l1: Math.max(l0, l1), r: rt, i: tomar('tronco'), giro: rnd() * 6.28 });
          } else { // rocas desde el borde del hueco hacia la orilla (hasta 3)
            let l = borde;
            for (let n = 0; n < 3 && Math.abs(orilla - l) > 0.35; n++) {
              const r = lerp(0.45, 0.85, rnd()), c = l + sg * r, tipo = r > 0.62 ? 'roca' : 'piedras';
              if (!pool[tipo] || !pool[tipo].libres.length) break;
              f.obst.push({ tipo, s: s + (rnd() - 0.5) * 0.8, l: c, r, i: tomar(tipo), giro: rnd() * 6.28 });
              l = c + sg * (r + 0.15 + rnd() * 0.5);
            }
          }
        }
      }
      // Racimos entre la fila anterior y esta, por la línea segura (y alguno suelto)
      const n = rnd() < 0.6 ? 3 : 1;
      for (let j = 0; j < n; j++) {
        const t = n === 1 ? 0.5 : 0.35 + j * 0.15, sr = prev.s + ds * t; if (sr < J.s + 8) continue;
        const qr = enCauce(sr, {}), l = clamp(lerp(prev.g, f.g, t), qr.lo + 0.3, qr.hi - 0.3), i = tomar('racimo'); if (i < 0) break;
        racimos.push({ s: sr, l, i, cogido: false, fase: rnd() * 6.28 });
      }
      filas.push(f); st.ultimaFila = f;
      return true;
    }
    function reciclarFila(f) { for (const o of f.obst) { esconder(o.tipo, o.i); soltar(o.tipo, o.i); } f.obst.length = 0; }
    function vaciar() {
      while (filas.length) reciclarFila(filas.pop());
      while (racimos.length) { const r = racimos.pop(); esconder('racimo', r.i); soltar('racimo', r.i); }
      st.ultimaFila = null;
    }
    function llenar() { while (true) { const u = filas.length ? filas[filas.length - 1].s : (st.ultimaFila ? st.ultimaFila.s : -Infinity); if (u >= J.s + P.adelante || !generarFila()) break; } }

    // ---------- Choques en coordenadas del cauce (exactos con lo que se ve) ----------
    // Canoa = segmento a lo largo del cauce [s − largo, s + largo] con medio ancho P.ancho
    function golpe(o, s, lado) {
      if (o.tipo === 'tronco') {
        const ds = Math.max(0, Math.abs(o.s - s) - P.largo), dl = Math.max(0, Math.max(0, o.l0 - lado, lado - o.l1) - P.ancho); // la canoa es un rectángulo largo × ancho
        return Math.hypot(ds, dl) < o.r ? 'tronco' : '';
      }
      const ds = o.s - clamp(o.s, s - P.largo, s + P.largo), dl = Math.max(0, Math.abs(o.l - lado) - P.ancho), rc = o.r * 0.9; // la roca, a su planta visible (algo de perdón en la orilla redonda)
      return ds * ds + dl * dl < rc * rc ? 'roca' : '';
    }
    function choca() {
      for (const f of filas) {
        if (Math.abs(f.s - J.s) > P.largo + 3) continue;
        for (const o of f.obst) { if (o.fuera) continue; const c = golpe(o, J.s, J.lado); if (c) { J.golpeado = o; return c; } }
      }
      return '';
    }

    // ---------- Simulación (paso determinista de dt s) ----------
    function arrancar() { if (st.fase === 'listo') { st.fase = 'juego'; J.t = 0; ocultarPista(); if (st.ui) st.ui.modos.hidden = true; return true; } return false; }
    function paso(dt) {
      const q = enCauce(J.s, st.q || (st.q = {}));
      if (st.fase === 'listo') { J.t += dt; return; }
      if (st.fase === 'fin') { J.finT += dt; J.s = Math.max(P.inicio, J.s - J.rv * dt); J.rv *= Math.exp(-4 * dt); return; }
      J.t += dt;
      J.v = velocidadEn(J.s);
      if (J.uy > 0) { J.uy = Math.max(0, J.uy - dt); J.v *= lerp(1, UY.k, J.uy / UY.t); } // contrarreloj: tras un choque la canoa arranca otra vez
      // Lado: teclas = velocidad lateral; arrastre = va hacia el punto pedido (sin pasar de vLat)
      const tecla = (J.der ? 1 : 0) - (J.izq ? 1 : 0);
      const quiere = tecla ? tecla * P.vLat : J.objetivo != null ? clamp((J.objetivo - J.lado) * 8, -P.vLat, P.vLat) : 0;
      J.vl += (quiere - J.vl) * rate(P.accLat, dt);
      J.lado += J.vl * dt;
      const a = q.lo + P.ancho, b = q.hi - P.ancho;
      if (J.lado < a) { J.lado = a; J.vl = Math.max(0, J.vl); } else if (J.lado > b) { J.lado = b; J.vl = Math.min(0, J.vl); } // la orilla frena, no choca
      if (J.objetivo != null) J.objetivo = clamp(J.objetivo, a - 1, b + 1);
      J.s += J.v * dt;
      J.metros = Math.max(0, J.s - P.inicio);
      grabar(dt);
      llenar();
      while (filas.length && filas[0].s < J.s - P.largo - 4) reciclarFila(filas.shift());
      for (let k = racimos.length - 1; k >= 0; k--) {
        const r = racimos[k];
        if (!r.cogido && Math.abs(r.s - J.s) < P.largo + 0.2 && Math.abs(r.l - J.lado) < P.ancho + P.radioRacimo) { r.cogido = true; J.racimos++; sonar(G.audio && G.audio.has && G.audio.has('bq_fruto') ? 'bq_fruto' : 'tick', J.racimos); st.pop = 0.25; }
        if (r.cogido || r.s < J.s - P.largo - 3) { esconder('racimo', r.i); soltar('racimo', r.i); racimos.splice(k, 1); }
      }
      contar();
      if (J.s >= sFin()) { fin('meta'); return; }
      const c = choca(); if (c) { if (esReloj()) uy(); else fin(c); }
    }
    // Contrarreloj: el choque no termina; frena la canoa y aparta lo que se tocó (mientras dura el frenazo, lo demás también se aparta)
    function uy() {
      const o = J.golpeado; if (o) { o.fuera = true; esconder(o.tipo, o.i); }
      if (J.uy > 0) return;
      J.uy = UY.t; J.choques++; J.vl *= 0.3; st.golpe = { o, t: 0 }; sonar('land');
      if (!REDUCED && !st.sinFx && G.agua && G.agua.spray) { try { G.agua.spray(S.pos.x, S.pos.y + 0.3, S.pos.z); } catch (e) { /* sin agua */ } }
      if (!REDUCED && G.camara.shake) G.camara.shake(0.08, 0.2);
      if (st.ui) { const a = st.ui.aviso; a.hidden = false; a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop'); clearTimeout(st.avisoT); st.avisoT = setTimeout(() => { a.hidden = true; }, 900); }
    }
    function contar() { const p = Math.floor(J.metros / P.metrosPunto) + J.racimos * P.puntosRacimo + (J.choque === 'meta' ? P.bonoMeta : 0); if (p !== J.puntos) { J.puntos = p; pintarPuntos(); } }
    function fin(como) {
      st.fase = 'fin'; J.finT = 0; J.choque = como; J.vl = 0; J.objetivo = null; J.arr = null;
      contar();
      if (como !== 'meta') {
        J.rv = 1.6; st.hitStop = REDUCED ? 0 : 0.15; st.golpe = { o: J.golpeado, t: 0 }; sonar('land');
        if (!REDUCED && !st.sinFx && G.agua && G.agua.spray) { try { G.agua.spray(S.pos.x, S.pos.y + 0.3, S.pos.z); } catch (e) { /* sin agua */ } }
        if (!REDUCED) G.camara.shake && G.camara.shake(0.12, 0.25);
      } else { J.rv = 0; sonar('unlock'); }
      if (esReloj()) { finReloj(); return; }
      const rec = leerRec(), f = rec.rio_rush; J.antes = f.mejor || 0;
      f.jugadas = (f.jugadas || 0) + 1;
      J.nuevo = J.puntos > 0 && (!f.mejor || J.puntos > f.mejor);
      if (J.nuevo) f.mejor = J.puntos;
      J.mejor = f.mejor || 0; J.medalla = medallaPuntos(J.puntos);
      guardarRec(rec);
      G.emit('retosResultado', { modo: 'rio_rush', puntos: J.puntos, metros: Math.round(J.metros), racimos: J.racimos, llego: como === 'meta', prueba: claveRec !== ALMACEN });
      if (J.nuevo && como !== 'meta') sonar('unlock');
      setTimeout(() => { if (st.activo && st.fase === 'fin') resultados(); }, REDUCED ? 0 : 450);
    }
    // Contrarreloj y fantasma: solo se termina llegando al mar. Mejor tiempo, medalla y, si es tu mejor bajada, el nuevo fantasma
    function finReloj() {
      J.ms = Math.round(J.t * 1000);
      const rec = leerRec(), f = rec.rio_rush, m = medallaReloj(J.ms);
      J.antesR = f.reloj || 0; J.medAntes = f.medallaReloj || null;
      f.jugadasReloj = (f.jugadasReloj || 0) + 1;
      J.nuevo = !f.reloj || J.ms < f.reloj;
      if (J.nuevo) f.reloj = J.ms;
      if (ORDEN.indexOf(m) > ORDEN.indexOf(f.medallaReloj)) f.medallaReloj = m;
      J.mejorR = f.reloj; J.medalla = m;
      guardarRec(rec);
      if (J.nuevo && st.grab && st.grab.m.length >= 6) { st.grab.m.push(J.s, J.lado, 0); guardarFantasma(st.grab.m, J.ms); }
      st.grab = null;
      G.emit('retosResultado', { modo: 'rio_rush', reloj: true, ms: J.ms, medalla: m, choques: J.choques, racimos: J.racimos, llego: true, fantasma: st.modo === 'fantasma', prueba: claveRec !== ALMACEN });
      setTimeout(() => { if (st.activo && st.fase === 'fin') resultados(); }, REDUCED ? 0 : 450);
    }

    // ---------- Colocar todo en el mundo (cada cuadro) ----------
    const _w = {}, _qq = {};
    function colocar(dt) {
      if (!C) return;
      for (const f of filas) for (const o of f.obst) {
        if (o.fuera || (o.s < J.s - P.atras && st.fase !== 'fin')) { esconder(o.tipo, o.i); continue; } // lo que ya pasó (o se apartó) no tapa la cámara
        const q = enCauce(o.s, _qq);
        if (o.tipo === 'tronco') { const lc = (o.l0 + o.l1) / 2, w = mundo(q, lc, _w); ponerTronco(o.i, w.x, q.y + 0.05, w.z, q.nx, q.nz, o.l1 - o.l0 + o.r * 2, o.giro); }
        else { const p = pool[o.tipo], k = o.r / Math.max(0.1, p.rm), w = mundo(q, o.l, _w), h = o.tipo === 'roca' ? 0.75 : 1.0; poner(o.tipo, o.i, w.x, q.y - 0.35 * k * p.size.y * h, w.z, 0, o.giro, 0, k, k * h, k); }
      }
      const tt = performance.now() / 1000;
      for (const r of racimos) {
        const q = enCauce(r.s, _qq), w = mundo(q, r.l, _w), b = REDUCED ? 0 : Math.sin(tt * 2.4 + r.fase) * 0.08;
        poner('racimo', r.i, w.x, q.y + 0.75 + b, w.z, 0, REDUCED ? r.fase : tt * 1.2 + r.fase, 0, 1.25, 1.25, 1.25, true);
      }
      colocarCanoa(dt);
      subirMatrices();
    }
    function colocarCanoa(dt) {
      if (!canoa) return;
      const q = enCauce(J.s, _qq), w = mundo(q, J.lado, _w), g = canoa.grupo;
      const giro = clamp(J.vl / Math.max(4, J.v), -0.35, 0.35); J.giro += (giro - J.giro) * rate(8, dt || 1 / 60);
      const c = Math.cos(J.giro), sn = Math.sin(J.giro), fx = q.tx * c - q.nx * sn, fz = q.tz * c - q.nz * sn; // la proa gira hacia donde va
      // Modelo de la canoa: largo en X, base en y = 0. Proa río abajo, cabeceo con la pendiente, alabeo leve al girar, un balanceo suave
      const bal = REDUCED ? 0 : Math.sin(J.t * 2.1) * 0.025;
      g.rotation.set(-J.giro * 0.25 + bal, Math.atan2(-fz, fx), Math.atan(q.pend), 'YZX');
      g.position.set(w.x, q.y - 0.14, w.z);
      J.fx = fx; J.fz = fz;
    }
    // Lo que actores.js lee para animar a Vittata: posada (agachada, agarrada) en la canoa, mirando río abajo
    function sincronizar() {
      if (!C) return;
      const q = enCauce(J.s, _qq), w = mundo(q, J.lado, _w), fx = J.fx != null ? J.fx : q.tx, fz = J.fz != null ? J.fz : q.tz;
      S.pos.x = w.x - fx * 0.35; S.pos.z = w.z - fz * 0.35; S.pos.y = q.y + 0.12; S.vy = 0;
      S.facing = { x: fx, z: fz };
      M.flying = false; M.landing = false; M.takeoff = 0; M.swimming = false; M.grounded = true; M.dashT = 0; M.posado = 'fino';
      M.vx = 0; M.vz = 0; M.speed = 0; M.fase = ''; M.groundY = S.pos.y;
    }
    function update(dt) {
      if (!st.activo || G.pausa.activa()) return;
      if (st.hitStop > 0) { st.hitStop -= dt; sincronizar(); colocar(dt); return; }
      paso(Math.min(dt, 0.05));
      if (st.golpe) st.golpe.t += dt;
      if (st.pop > 0) st.pop -= dt;
      colocar(dt);
      sincronizar();
      dibujarFantasma(dt);
      if (esReloj()) pintarReloj();
    }

    // ---------- Fantasma (AC2): el de Retos (retos.js), con el mismo formato y la misma cotorra translúcida ----------
    // { v: 1, dt: 0.1, ms, cauce: 1, p: 's0 l0 0 ds dl 0 …' }: muestras [s, lado, 0] del cauce en decímetros enteros, por diferencias en base 36
    const FAN_DT = 0.1, FAN_MAX = 6000;
    const claveFantasma = () => claveRec + '.fantasma.rio_rush';
    function codificarFantasma(m) {
      const q = m.map(v => Math.round(v * 10)), o = [];
      for (let i = 0; i < q.length; i++) o.push((i < 3 ? q[i] : q[i] - q[i - 3]).toString(36));
      return o.join(' ');
    }
    function decodificarFantasma(txt) {
      const t = String(txt).split(' ').map(v => parseInt(v, 36));
      if (!t.length || t.length % 3 || t.some(v => !isFinite(v))) return null;
      const out = new Float32Array(t.length);
      for (let i = 0; i < t.length; i++) { if (i >= 3) t[i] += t[i - 3]; out[i] = t[i] / 10; }
      return out;
    }
    function leerFantasma() {
      try {
        const d = JSON.parse(localStorage.getItem(claveFantasma()) || 'null');
        if (d && d.v === 1 && d.cauce === 1 && d.dt === FAN_DT && typeof d.p === 'string') { const p = decodificarFantasma(d.p); if (p && p.length >= 6) return { ms: d.ms, p, n: p.length / 3 }; }
      } catch (e) { /* sin almacén o dañado */ }
      return null;
    }
    function guardarFantasma(m, ms) { try { localStorage.setItem(claveFantasma(), JSON.stringify({ v: 1, dt: FAN_DT, ms, cauce: 1, p: codificarFantasma(m) })); return true; } catch (e) { return false; } }
    // Grabación: una muestra cada 0,1 s mientras corre el reloj (solo en la contrarreloj y contra el fantasma)
    function grabar(dt) {
      const g = st.grab; if (!g) return;
      if (!g.m.length) g.m.push(J.s, J.lado, 0);
      g.acc += dt;
      while (g.acc >= FAN_DT && g.m.length < FAN_MAX * 3) { g.acc -= FAN_DT; g.m.push(J.s, J.lado, 0); }
    }
    let fanListo = null;
    function crearFantasma() {
      if (fanListo) return fanListo;
      if (!window.AVCharacter) return Promise.resolve(null);
      return (fanListo = window.AVCharacter.create().then(ch => {
        ch.applyLook({ species: 'vittata' });
        const alto = (G.pack.jugador && G.pack.jugador.altura) || 1.75; ch.root.scale.setScalar(alto / ch.height);
        ch.root.userData.sinCulling = true; ch.root.visible = false; ch.root.rotation.order = 'YXZ'; ch.play('Idle');
        ch.root.traverse(o => {
          if (!o.material) return;
          const tr = m => { const c = m.clone(); c.transparent = true; c.opacity = 0.38; c.depthWrite = false; c.userData.riverFan = true; return c; };
          o.material = Array.isArray(o.material) ? o.material.map(tr) : tr(o.material);
          o.renderOrder = Math.max(o.renderOrder, 7);
        });
        return ch;
      }).catch(() => (fanListo = null)));
    }
    function montarFantasma() {
      quitarFantasma();
      if (st.modo !== 'fantasma') return Promise.resolve(false);
      const g = leerFantasma(); if (!g) return Promise.resolve(false);
      return crearFantasma().then(ch => {
        if (!ch || !st.activo || st.modo !== 'fantasma') return false;
        if (!st.fan) { st.fan = Object.assign({ ch }, g); raiz.add(ch.root); ch.root.visible = true; dibujarFantasma(0); }
        return true;
      });
    }
    function quitarFantasma() { if (st.fan) { st.fan.ch.root.visible = false; raiz.remove(st.fan.ch.root); } st.fan = null; J.ventaja = null; }
    function soltarFantasma() { // al salir: fuera de la escena y liberado (menos lo que comparte con la Vittata del jugador)
      quitarFantasma();
      const p = fanListo; fanListo = null; if (!p) return;
      p.then(ch => {
        if (!ch) return;
        const geo = new Set(), tex = new Set(), pj = G.actores.player3D;
        if (pj) pj.root.traverse(o => { if (o.geometry) geo.add(o.geometry); for (const m of [].concat(o.material || [])) for (const k in m) if (m[k] && m[k].isTexture) tex.add(m[k]); });
        ch.root.traverse(o => {
          if (o.geometry && !geo.has(o.geometry)) o.geometry.dispose();
          for (const m of [].concat(o.material || [])) { for (const k in m) if (m[k] && m[k].isTexture && !tex.has(m[k])) m[k].dispose(); if (m.userData && m.userData.riverFan) m.dispose(); }
        });
      });
    }
    // Posición del fantasma a los t segundos (interpolada entre muestras; al acabar se queda en la última)
    function fanEn(f, t, out) {
      const u = Math.max(0, t / FAN_DT), i = Math.min(f.n - 1, Math.floor(u)), j = Math.min(f.n - 1, i + 1), k = Math.min(1, u - i), p = f.p;
      out.s = lerp(p[i * 3], p[j * 3], k); out.l = lerp(p[i * 3 + 1], p[j * 3 + 1], k); out.fin = u >= f.n - 1;
      return out;
    }
    const _fq = {}, _fc = {}, _fw = {};
    function dibujarFantasma(dt) {
      const f = st.fan; if (!f) return;
      const t = st.fase === 'listo' ? 0 : st.fase === 'fin' ? J.t + J.finT : J.t;
      fanEn(f, t, _fq);
      const q = enCauce(_fq.s, _fc), w = mundo(q, _fq.l, _fw), root = f.ch.root;
      root.position.set(w.x, q.y + 0.9, w.z); root.rotation.set(0.35, Math.atan2(q.tx, q.tz), 0);
      const quieto = _fq.fin || st.fase === 'listo';
      Object.assign(f.ch, { speed: quieto ? 1 : J.v, gait: 0, airborne: true, flying: true, legsDown: quieto ? 0.65 : 0, swimming: false, diving: false,
        wingMode: quieto ? 'hover' : 'fly', expression: 'happy', mouth: null, lookAt: null, emote: null, posado: '', agachada: 0, groundY: q.y, groundAt: null });
      f.ch.update(dt || 0);
      J.ventaja = st.fase === 'juego' ? J.s - _fq.s : null;
    }
    G.on('update', dt => update(dt), 46);

    // ---------- Cámara: detrás y por encima de la canoa, sobre el cauce; en vertical, más cerca y más alta ----------
    const CAMS = {
      ancho: { atras: 8, alto: 3.8, adelante: 7, mY: 0.5, fov: 52 },
      vertical: { atras: 6.6, alto: 4.2, adelante: 5.5, mY: 0.15, fov: 62 },
    };
    const cam = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), asp: null, prev: '' };
    function aspecto() { if (cam.asp) return cam.asp; const el = R.renderer && R.renderer.domElement, w = el ? el.clientWidth : innerWidth, h = el ? el.clientHeight : innerHeight; return h > 0 ? w / h : 1.6; }
    const modoCam = () => (aspecto() < 1 ? 'vertical' : 'ancho');
    function reencuadrar() { if (!st.activo) return; const f = CAMS[modoCam()].fov; if (Math.abs(R.camera.fov - f) > 0.01) { R.camera.fov = f; R.camera.updateProjectionMatrix(); } }
    addEventListener('resize', reencuadrar); addEventListener('orientationchange', () => { reencuadrar(); setTimeout(reencuadrar, 350); });
    const _cq = {}, _cw = {}, _ct = {};
    // Metros del techo (malla del terreno o puente) sobre el agua, en el centro del cauce. QA-49: un triángulo de pasto que cruza el río, o un puente, deja la cámara debajo y tapa la pantalla.
    function techoEn(s) {
      const q = enCauce(s, _ct);
      let top = H(q.x, q.z);
      const sy = G.terreno.surfaceY;
      if (sy) top = Math.max(top, sy(q.x, q.z, top + 40));
      return top - q.y;
    }
    function camObjetivo(out) {
      const c = CAMS[modoCam()], q = enCauce(J.s - c.atras, _cq), l = clamp(J.lado * 0.7, q.lo + 0.3, q.hi - 0.3), w = mundo(q, l, _cw);
      const agua = enCauce(J.s, _qq).y;
      let y = Math.max(q.y, agua) + c.alto;
      y = Math.max(y, H(w.x, w.z) + 1.2);
      let techo = -Infinity;
      for (let ds = -c.atras; ds <= c.adelante + 4; ds += 3) {
        const sobre = techoEn(J.s + ds);
        if (sobre > 2.5) techo = Math.max(techo, agua + sobre);
      }
      if (techo > -Infinity) y = Math.min(Math.max(y, techo + 1.35), y + 14);
      return out.set(w.x, y, w.z);
    }
    function camMira(out) { const c = CAMS[modoCam()], q = enCauce(J.s + c.adelante, _cq), w = mundo(q, J.lado * 0.85, _cw); return out.set(w.x, enCauce(J.s, _qq).y + c.mY, w.z); }
    function camFollow(dt) {
      const me = modoCam() + Math.round(aspecto() * 10); if (me !== cam.prev) { cam.prev = me; dt = null; }
      camObjetivo(cam.pos); if (dt == null) R.camera.position.copy(cam.pos); else R.camera.position.lerp(cam.pos, rate(7, dt));
    }
    function camDraw(dt) {
      reencuadrar();
      R.camera.lookAt(camMira(cam.mira));
      const j = G.camara.juice; let sx = 0, sy = 0, sz = 0;
      if (j && j.shake > 0) { j.shake -= dt; const a = j.amp * Math.min(1, Math.max(0, j.shake) / 0.2); sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; sz = (Math.random() - 0.5) * a; R.camera.position.x += sx; R.camera.position.y += sy; R.camera.position.z += sz; if (j.shake <= 0) j.amp = 0; }
      if (R.drawScene) R.drawScene(R.camera); else R.renderer.render(scene, R.camera);
      R.camera.position.x -= sx; R.camera.position.y -= sy; R.camera.position.z -= sz;
    }

    // ---------- Récords (almacén de Retos, clave rio_rush) ----------
    function leerRec() {
      let d = null; try { d = JSON.parse(localStorage.getItem(claveRec) || 'null'); } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || d.v !== 1) d = { v: 1, carrera: {}, tormenta: {}, rio: {}, banquete: {} };
      if (!d.rio_rush || typeof d.rio_rush !== 'object') d.rio_rush = { mejor: null, jugadas: 0 }; // + reloj (ms), medallaReloj, jugadasReloj y modo (AC2)
      return d;
    }
    function guardarRec(d) { try { localStorage.setItem(claveRec, JSON.stringify(d)); return true; } catch (e) { return false; } }

    // ---------- Interfaz (estilos propios con los tokens de tokens.css; no se toca ui.css) ----------
    const CSS = `
body.river-on #top, body.river-on #b-diary, body.river-on #b-emotes, body.river-on #b-nido, body.river-on #prompt, body.river-on #toast, body.river-on #keyhint,
body.river-on #tag, body.river-on #bocadillos, body.river-on #emotes, body.river-on #acts, body.river-on #stick, body.river-on #quest-toggle, body.river-on #guia-hud, body.river-on #minimapa, body.river-on #retos { display: none !important; }
html body.river-on #pause .pause-grid > :not(#b-sound) { display: none !important; }
#riverrush { position: fixed; inset: 0; z-index: var(--z-card, 30); font-family: var(--font-display, system-ui, sans-serif); color: var(--c-text, #f4f7f1); pointer-events: none; }
#riverrush [hidden] { display: none !important; }
#riverrush .rr-toque { position: absolute; inset: 0; pointer-events: auto; touch-action: none; -webkit-user-select: none; user-select: none; cursor: ew-resize; }
#riverrush .rr-hud { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
#riverrush .rr-chip { background: var(--c-surface, rgba(10,30,20,.85)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-pill, 999px); padding: 6px 16px; display: flex; align-items: baseline; gap: 6px;
  font: 700 24px/1.1 var(--font-display, system-ui); box-shadow: 0 4px 14px rgba(0,0,0,.3); font-variant-numeric: tabular-nums; white-space: nowrap; }
#riverrush .rr-chip small { font-size: 13px; color: var(--c-text-muted, #b8c7bd); font-weight: 600; }
#riverrush .rr-chip.pop { animation: rr-pop .25s ease-out; } @keyframes rr-pop { 0% { transform: scale(1.16); } 100% { transform: scale(1); } }
#riverrush .rr-barra { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 58px); left: 50%; transform: translateX(-50%); width: min(60vw, 260px); height: 6px; border-radius: 3px; background: rgba(0,0,0,.35); overflow: hidden; }
#riverrush .rr-barra i { display: block; height: 100%; width: 0; background: var(--gold, #ffd84a); }
#riverrush .rr-salir { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); right: calc(env(safe-area-inset-right, 0px) + 12px); pointer-events: auto; }
#riverrush .rr-pista { position: absolute; left: 50%; bottom: 18%; transform: translateX(-50%); width: min(90vw, 520px); text-align: center; font: 700 clamp(20px, 4vw, 30px)/1.2 var(--font-display, system-ui); text-shadow: 0 2px 10px rgba(0,0,0,.65); animation: rr-late 1.4s ease-in-out infinite; }
#riverrush .rr-pista small { display: block; font-size: .6em; font-weight: 600; opacity: .92; margin-top: 4px; }
@keyframes rr-late { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
#riverrush .rr-fin { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(5, 18, 12, .35); }
#riverrush .rr-panel { pointer-events: auto; background: var(--c-surface, rgba(10,30,20,.92)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-lg, 18px); padding: 22px 26px; width: min(92vw, 420px); text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
#riverrush .rr-panel h2 { margin: 0 0 6px; font-size: 30px; } #riverrush .rr-panel p { margin: 4px 0 12px; color: var(--c-text-muted, #b8c7bd); }
#riverrush .rr-num { font: 800 64px/1 var(--font-display, system-ui); color: var(--gold, #ffd84a); margin: 6px 0; }
#riverrush .rr-nuevo { color: var(--gold, #ffd84a); font-weight: 800; margin-bottom: 8px; }
#riverrush .rr-fila { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
#riverrush .rr-tecla { font-size: 12px; opacity: .75; margin-left: 6px; }
#riverrush .rr-modos { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; pointer-events: auto; }
#riverrush .rr-modos-hud { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 74px); left: 50%; transform: translateX(-50%); width: min(94vw, 520px); }
#riverrush .rr-modos button { min-height: 44px; padding: 6px 12px; font-size: 15px; }
#riverrush .rr-modos button[aria-pressed="true"] { background: var(--gold, #ffd84a); color: var(--ink, #10241a); border-color: var(--gold, #ffd84a); }
#riverrush .rr-modos button:disabled { opacity: .5; cursor: not-allowed; }
#riverrush .rr-dif { font-size: 16px; }
#riverrush .rr-aviso { position: absolute; left: 50%; top: 34%; transform: translateX(-50%); font: 800 clamp(26px, 6vw, 40px)/1 var(--font-display, system-ui); color: var(--gold, #ffd84a); text-shadow: 0 2px 10px rgba(0,0,0,.7); }
#riverrush .rr-aviso.pop { animation: rr-pop .3s ease-out; }
#riverrush .rr-dato { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 0 0 6px; color: var(--c-text-muted, #b8c7bd); font-weight: 600; }
#riverrush .rr-medalla { font-weight: 800; margin: 0 0 6px; }
#riverrush .rr-medalla.oro { color: var(--gold, #ffd84a); } #riverrush .rr-medalla.plata { color: #dfe7ee; } #riverrush .rr-medalla.bronce { color: #e3a46b; }
#riverrush .rr-meta { margin: 0 0 10px; display: grid; gap: 4px; font-weight: 700; color: var(--gold, #ffd84a); }
#riverrush .rr-rank { margin: 0 0 10px; }
#riverrush .rr-panel .rr-modos { margin-top: 12px; }
@media (max-height: 520px) { #riverrush .rr-modos-hud { top: calc(env(safe-area-inset-top, 0px) + 66px); } #riverrush .rr-panel { padding: 14px 18px; } #riverrush .rr-num { font-size: 48px; } }
@media (prefers-reduced-motion: reduce) { #riverrush .rr-pista, #riverrush .rr-chip.pop, #riverrush .rr-aviso.pop { animation: none; } }`;
    function montarUI() {
      if (st.ui) return st.ui;
      const css = document.createElement('style'); css.id = 'riverrush-css'; css.textContent = CSS; document.head.appendChild(css);
      const el = document.createElement('div'); el.id = 'riverrush'; el.hidden = true;
      el.innerHTML = `
<div class="rr-toque" aria-label="Arrastra a la izquierda o a la derecha para guiar la canoa"></div>
<div class="rr-hud"><div class="rr-chip"><span class="rr-puntos">0</span><small class="rr-mejor"></small></div><div class="rr-chip rr-dif" hidden></div></div>
<div class="rr-barra" aria-hidden="true"><i></i></div>
<div class="rr-modos rr-modos-hud" role="group" aria-label="Modalidad">${botonesModo()}</div>
<button class="btn ghost secondary rr-salir" type="button" data-salir data-icon="close" aria-label="Salir de River Rush">Salir</button>
<div class="rr-aviso" aria-hidden="true" hidden>¡Uy!</div>
<div class="rr-pista"><span class="rr-pista-t"></span><small class="rr-pista-s"></small></div>
<div class="rr-fin" hidden><div class="rr-panel" role="dialog" aria-labelledby="rr-fin-t">
  <h2 id="rr-fin-t">¡Uy!</h2>
  <p class="rr-como"></p>
  <p class="rr-dato"></p>
  <div class="rr-num">0</div>
  <div class="rr-nuevo" hidden>¡Nuevo récord!</div>
  <p class="rr-medalla" hidden></p>
  <p class="rr-rec"></p>
  <p class="rr-meta" hidden></p>
  <div class="rr-rank" hidden><button class="btn" type="button" data-ranking data-icon="trophy">Publicar en el ranking</button></div>
  <div class="rr-fila">
    <button class="btn xl" type="button" data-otra data-icon="reset">Otra vez<span class="rr-tecla">${TACTIL ? '' : 'Enter'}</span></button>
    <button class="btn ghost secondary" type="button" data-salir data-icon="close">Volver a la historia</button>
  </div>
  <div class="rr-modos" role="group" aria-label="Modalidad">${botonesModo()}</div>
</div></div>`;
      document.body.appendChild(el);
      const q = s => el.querySelector(s);
      const u = st.ui = { el, toque: q('.rr-toque'), chip: q('.rr-chip'), puntos: q('.rr-puntos'), mejor: q('.rr-mejor'), dif: q('.rr-dif'), barra: q('.rr-barra i'), pista: q('.rr-pista'), pistaT: q('.rr-pista-t'), pistaS: q('.rr-pista-s'),
        modos: q('.rr-modos-hud'), aviso: q('.rr-aviso'), fin: q('.rr-fin'), titulo: q('#rr-fin-t'), como: q('.rr-como'), dato: q('.rr-dato'), num: q('.rr-num'), nuevo: q('.rr-nuevo'), medalla: q('.rr-medalla'), rec: q('.rr-rec'), meta: q('.rr-meta'), rank: q('.rr-rank') };
      // Un dedo: arrastrar en cualquier sitio. El lado pedido es relativo al punto donde se apoyó el dedo
      u.toque.addEventListener('pointerdown', e => { e.preventDefault(); toqueEn(e.clientX, e.pointerId); try { u.toque.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ } });
      u.toque.addEventListener('pointermove', e => { if (J.arr && J.arr.id === e.pointerId) arrastrar(e.clientX); });
      const soltarDedo = e => { if (J.arr && J.arr.id === e.pointerId) J.arr = null; };
      u.toque.addEventListener('pointerup', soltarDedo); u.toque.addEventListener('pointercancel', soltarDedo);
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-otra')) otraVez(); else if (b.dataset.rrModo) cambiarModo(b.dataset.rrModo); else if (b.hasAttribute('data-ranking')) publicar(b); else if (b.hasAttribute('data-salir')) salir(); });
      const teclaLado = k => (k === 'ArrowLeft' || k === 'a' || k === 'A' ? 'izq' : k === 'ArrowRight' || k === 'd' || k === 'D' ? 'der' : '');
      addEventListener('keydown', e => {
        if (!st.activo || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.closest && e.target.closest('#riverrush button, input, select, textarea, #pause')) return;
        if (G.pausa.activa()) return;
        const k = e.key, lado = teclaLado(k);
        if (st.fase === 'fin') { if (!e.repeat && (k === 'Enter' || k === ' ') && J.finT >= P.finEspera) { e.preventDefault(); otraVez(); } return; }
        if (lado) { e.preventDefault(); J[lado] = true; J.objetivo = null; arrancar(); }
        else if (!e.repeat && (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'w' || k === 'W')) { e.preventDefault(); arrancar(); }
      }, true);
      addEventListener('keyup', e => { const lado = teclaLado(e.key); if (lado) J[lado] = false; }, true);
      addEventListener('blur', () => { J.izq = J.der = false; J.arr = null; });
      return u;
    }
    function toqueEn(x, id) {
      if (!st.activo) return false;
      if (st.fase === 'fin') { if (J.finT >= P.finEspera) { otraVez(); return true; } return false; }
      J.arr = { id: id == null ? 1 : id, x0: x, l0: J.objetivo != null ? J.objetivo : J.lado }; J.objetivo = J.arr.l0;
      arrancar(); return true;
    }
    function arrastrar(x) { if (!J.arr || st.fase === 'fin') return; const w = (R.renderer && R.renderer.domElement && R.renderer.domElement.clientWidth) || innerWidth || 1; J.objetivo = J.arr.l0 + (x - J.arr.x0) / w * P.arrastre; }
    // ---------- Modalidades: botones, cambio y textos ----------
    const NOMBRE_MODO = { puntos: 'Clásico', reloj: 'Contrarreloj', fantasma: 'Contra tu fantasma' };
    function botonesModo() { return MODOS.map(m => `<button class="btn ghost secondary" type="button" data-rr-modo="${m}" aria-pressed="false">${NOMBRE_MODO[m]}</button>`).join(''); }
    function pintarModos() {
      const u = st.ui; if (!u) return;
      const hayFan = !!leerFantasma();
      for (const b of u.el.querySelectorAll('[data-rr-modo]')) {
        const m = b.dataset.rrModo; b.setAttribute('aria-pressed', String(m === st.modo));
        b.disabled = m === 'fantasma' && !hayFan; b.title = b.disabled ? 'Termina una contrarreloj para tener tu fantasma.' : '';
      }
      u.modos.hidden = st.fase !== 'listo';
      const PISTA = {
        puntos: [TACTIL ? '¡Arrastra para guiar la canoa!' : '¡Usa ← → para guiar la canoa!', TACTIL ? 'Desliza el dedo a un lado o al otro. Esquiva troncos y rocas y recoge racimos.' : 'También A y D, o arrastra con el ratón. Esquiva troncos y rocas y recoge racimos.'],
        reloj: ['¡Contrarreloj hasta el mar!', 'Chocar no termina, pero frena la canoa. El río es siempre el mismo: apréndetelo.'],
        fantasma: ['¡Contra tu fantasma!', 'La cotorra transparente es tu mejor bajada. ¡Gánale hasta el mar!'],
      }[st.modo];
      u.pistaT.textContent = PISTA[0]; u.pistaS.textContent = PISTA[1];
    }
    function cambiarModo(m) {
      if (!MODOS.includes(m) || !st.activo) return false;
      if (m === 'fantasma' && !leerFantasma()) { G.ui.toast('Termina una contrarreloj para tener tu fantasma.', 3000); return false; }
      st.modo = m; const rec = leerRec(); rec.rio_rush.modo = m; guardarRec(rec);
      iniciar(); return true;
    }
    function pintarReloj() {
      const u = st.ui; if (!u || !esReloj()) return;
      const t = relojTxt(st.fase === 'fin' ? J.ms / 1000 : J.t); if (u.puntos.textContent !== t) u.puntos.textContent = t;
      const dif = J.ventaja == null ? '' : Math.abs(J.ventaja) < 1 ? 'Junto a tu fantasma' : 'Vas ' + Math.round(Math.abs(J.ventaja)) + ' m ' + (J.ventaja > 0 ? 'por delante' : 'por detrás');
      if (st.difUlt !== dif) { st.difUlt = dif; u.dif.textContent = dif; u.dif.hidden = !dif; } // (en inglés el texto visible ya va traducido: se compara con lo último escrito)
      const w = (100 * clamp(J.metros / Math.max(1, sFin() - P.inicio), 0, 1)).toFixed(1) + '%'; if (u.barra.style.width !== w) u.barra.style.width = w;
    }
    function pintarPuntos() {
      const u = st.ui; if (!u) return;
      if (esReloj()) { u.mejor.textContent = J.mejorR ? 'mejor ' + relojTxt(J.mejorR / 1000) : ''; pintarReloj(); return; }
      u.puntos.textContent = String(J.puntos); u.mejor.textContent = J.mejor ? 'mejor ' + J.mejor : '';
      if (C) u.barra.style.width = (100 * clamp(J.metros / Math.max(1, sFin() - P.inicio), 0, 1)).toFixed(1) + '%';
      if (st.pop > 0 || J.racimos !== st.racimosPintados) { st.racimosPintados = J.racimos; u.chip.classList.remove('pop'); void u.chip.offsetWidth; u.chip.classList.add('pop'); }
    }
    function ocultarPista() { if (st.ui) st.ui.pista.hidden = true; }
    const COMO = {
      tronco: '¡Uy! La canoa chocó con un tronco. Vittata se agarra fuerte y se ríe.',
      roca: '¡Uy! La canoa tocó una roca. Vittata se sacude el agua y se ríe.',
      meta: '¡Llegaste al mar! Bajaste todo el río Amazonas.',
    };
    // Ganas de seguir, sin presión: el sello nuevo, el «casi» y la siguiente meta (como Amazona Flight y Retos)
    function metaLineas() {
      const L = [];
      if (!esReloj()) {
        const v = J.puntos, best = J.mejor || 0, tope = Math.max(v, best), nom = n => n + (n === 1 ? ' punto' : ' puntos'), nivel = x => MEDALLAS_P.filter(m => x >= m[1]).length;
        if (v > 0 && v < best && best - v <= Math.max(3, Math.round(best * 0.2))) L.push('¡A solo ' + nom(best - v) + ' del récord!');
        if (nivel(J.mejor) > nivel(J.antes || 0)) L.unshift('¡Nuevo sello de ' + MEDALLAS_P[nivel(J.mejor) - 1][0] + ' en Mis récords!');
        const sig = MEDALLAS_P.find(m => m[1] > tope);
        L.push(sig ? 'Te faltan ' + nom(sig[1] - tope) + ' para ' + ART[sig[0]] : '¡Tienes todas las medallas! Intenta superar tu récord.');
        return L;
      }
      const t = J.ms, tb = J.mejorR || t, lim = limitesReloj();
      if (ORDEN.indexOf(J.medalla) > ORDEN.indexOf(J.medAntes)) L.push('¡Nuevo sello de ' + J.medalla + ' en Mis récords!');
      if (!J.nuevo && t > tb && t - tb <= 2000) L.push('¡A solo ' + dec((t - tb) / 1000) + ' s de tu récord!');
      if (tb <= lim.oro) L.push('¡Tienes el oro! Intenta superar tu récord.');
      else { const m = tb <= lim.plata ? 'oro' : 'plata'; L.push('Te faltan ' + dec((tb - lim[m]) / 1000) + ' s para ' + ART[m]); }
      return L;
    }
    const NOMBRE_MEDALLA = { oro: 'Medalla de oro', plata: 'Medalla de plata', bronce: 'Medalla de bronce' };
    function resultados() {
      const u = st.ui; if (!u) return;
      const reloj = esReloj();
      u.titulo.textContent = J.choque === 'meta' ? '¡Lo lograste!' : '¡Uy!';
      u.como.textContent = COMO[J.choque] || '';
      const dato = [Math.round(J.metros) + ' m', J.racimos === 1 ? '1 racimo' : J.racimos + ' racimos'];
      if (reloj) dato[0] = J.choques === 0 ? 'Sin choques' : J.choques === 1 ? '1 choque' : J.choques + ' choques';
      u.dato.innerHTML = dato.map(t => '<span>' + t + '</span>').join('');
      u.num.textContent = reloj ? relojTxt(J.ms / 1000) : String(J.puntos);
      u.nuevo.hidden = !J.nuevo;
      u.medalla.className = 'rr-medalla ' + (J.medalla || ''); u.medalla.textContent = J.medalla ? '★ ' + NOMBRE_MEDALLA[J.medalla] : ''; u.medalla.hidden = !J.medalla;
      u.rec.textContent = reloj ? (J.mejorR ? 'Tu mejor: ' + relojTxt(J.mejorR / 1000) : '') : J.mejor ? 'Tu mejor: ' + J.mejor + ' puntos' : 'Baja un poco más para tener tu primer récord.';
      const ls = metaLineas(); u.meta.innerHTML = ls.map(t => '<span>' + t + '</span>').join(''); u.meta.hidden = !ls.length;
      u.rank.hidden = !(!reloj && J.nuevo && claveRec === ALMACEN && J.puntos > 0); // el ranking global es del clásico (reto rio_rush, por puntos)
      pintarModos();
      u.fin.hidden = false;
      const b = u.fin.querySelector('[data-otra]'); if (b) b.focus({ preventScroll: true });
    }
    // Ranking global (panel y envío en records.js). Una partida de prueba nunca publica
    function publicar(btn, fetchSim) {
      if (esReloj() || !(J.puntos > 0)) return Promise.resolve('invalido');
      const ir = G.recordsApi ? Promise.resolve(G.recordsApi) : G.AVE.assets.script('src/game/records.js').then(() => window.AVRecords(G));
      return ir.then(rk => rk.publicarRanking({ reto: 'rio_rush', valor: J.puntos, dur_ms: Math.round(J.t * 1000), prueba: claveRec !== ALMACEN, fetch: fetchSim }), () => { G.ui.toast('No se pudo cargar. Prueba otra vez.', 3000); return 'error'; })
        .then(r => { if (r === 'publicado' && btn) btn.parentNode.hidden = true; return r; });
    }

    // ---------- Entrar, jugar, salir (envolturas reversibles; la partida vuelve a como estaba) ----------
    function libre() {
      const creadorNuevo = !$('creator').hidden && !(S.profile && S.profile.created);
      return !(G.dialogo.open() || G.ui.cardOpen || !$('end').hidden || !$('comic').hidden || (!$('creator').hidden && !creadorNuevo));
    }
    function entrar() {
      if (st.activo) return true;
      st.snap = G.guardado.instantanea();
      G.guardado.suspender(true);
      st.quiet = G.quiet; G.quiet = true;
      S.event = null; if (G.fx && G.fx.rain) G.fx.rain.visible = false;
      const Cm = G.camara, cam3 = R.camera;
      st.env = { busy: G.ui.busy, step: F.step, action: G.interaccion.action, follow: Cm.follow, fov: Cm.fov, draw: Cm.draw, manual: Cm.manual, camFov: cam3.fov,
        tryJump: F.tryJump, releaseJump: F.releaseJump, tryDash: F.tryDash, toggleFly: F.toggleFly, land: F.land, startFlying: F.startFlying,
        companero: G.actores.companion3D ? G.actores.companion3D.root.visible : null };
      G.ui.busy = () => true;
      F.step = () => false;
      for (const k of ['tryJump', 'releaseJump', 'tryDash', 'toggleFly', 'land', 'startFlying']) F[k] = () => {};
      G.interaccion.action = () => {};
      Cm.follow = dt => camFollow(dt); Cm.fov = () => {}; Cm.draw = dt => camDraw(dt); Cm.manual = () => {};
      cam3.fov = CAMS[modoCam()].fov; cam3.updateProjectionMatrix();
      if (G.actores.companion3D) G.actores.companion3D.root.visible = false;
      document.body.classList.add('river-on', 'retos-on'); // retos-on: musica.js elige la pista de Retos
      raiz.visible = true; if (!raiz.parent) scene.add(raiz);
      st.activo = true;
      return true;
    }
    function iniciar() {
      vaciar();
      if (st.modo === 'fantasma' && !leerFantasma()) st.modo = 'reloj'; // sin fantasma aún: contrarreloj (graba el primero)
      rnd = G.util.rng(J.semilla = esReloj() ? SEMILLA_RELOJ : (Date.now() ^ (Math.random() * 1e9)) >>> 0 || 1);
      const q0 = enCauce(P.inicio, {}), r0 = leerRec().rio_rush;
      Object.assign(J, { s: P.inicio, lado: clamp(0, q0.lo + P.ancho, q0.hi - P.ancho), vl: 0, objetivo: null, v: P.vel0, t: 0, finT: 0, puntos: 0, racimos: 0, metros: 0, nuevo: false, choque: '', golpeado: null, izq: false, der: false, arr: null, giro: 0, rv: 0, fx: null, fz: null, mejor: r0.mejor || 0,
        uy: 0, choques: 0, ms: 0, mejorR: r0.reloj || 0, medalla: null, medAntes: null, antes: 0, ventaja: null });
      st.fase = 'listo'; st.hitStop = 0; st.golpe = null; st.pop = 0; st.racimosPintados = 0; st.difUlt = null;
      st.grab = esReloj() ? { m: [], acc: 0 } : null;
      const u = st.ui; if (u) { u.el.hidden = false; u.fin.hidden = true; u.pista.hidden = false; u.aviso.hidden = true; u.dif.hidden = true; u.dif.textContent = ''; pintarModos(); pintarPuntos(); u.chip.classList.remove('pop'); }
      montarFantasma();
      llenar(); colocar(0); sincronizar();
      camFollow(null); G.camara.place(true);
      if (G.actores.player3D) G.actores.player3D.root.visible = true;
    }
    function otraVez() { if (!st.activo) return false; iniciar(); return true; }
    function abrir(modo) {
      montarUI();
      if (!st.activo) { const m = MODOS.includes(modo) ? modo : leerRec().rio_rush.modo; st.modo = MODOS.includes(m) ? m : 'puntos'; } // la última modalidad jugada
      if (!st.activo && !libre()) { G.ui.toast('Termina lo que estás haciendo y vuelve a probar River Rush.', 3200); return Promise.resolve(false); }
      if (!$('creator').hidden) { st.creador = true; G.creador.close(); }
      if (!st.listo) G.ui.toast('Cargando River Rush…', 5000);
      return crearPool().then(() => { entrar(); iniciar(); return true; }, e => { G.ui.toast('No se pudo cargar River Rush. Prueba otra vez.', 3000); console.error('river_rush:', e); return false; });
    }
    function salir() {
      if (!st.activo) { if (st.ui) st.ui.el.hidden = true; document.body.classList.remove('river-on', 'retos-on'); return; }
      const env = st.env, Cm = G.camara, cam3 = R.camera;
      vaciar(); subirMatrices(); soltarFantasma(); raiz.visible = false; st.fase = 'nada'; st.grab = null;
      G.ui.busy = env.busy; F.step = env.step; G.interaccion.action = env.action;
      for (const k of ['tryJump', 'releaseJump', 'tryDash', 'toggleFly', 'land', 'startFlying']) F[k] = env[k];
      Cm.follow = env.follow; Cm.fov = env.fov; Cm.draw = env.draw; Cm.manual = env.manual;
      cam3.fov = env.camFov; cam3.updateProjectionMatrix();
      if (G.actores.companion3D && env.companero != null) G.actores.companion3D.root.visible = env.companero;
      document.body.classList.remove('river-on', 'retos-on');
      M.posado = ''; M.vx = M.vz = 0; M.speed = 0; M.dashT = 0; M.landing = false; M.takeoff = 0; M.fase = '';
      G.guardado.restaurar(st.snap); st.snap = null;
      G.guardado.suspender(false); G.quiet = st.quiet;
      if (st.creador && !(S.profile && S.profile.created)) G.creador.open(true); st.creador = false;
      const pj = G.actores.player3D; if (pj) pj.root.visible = true;
      G.camara.place(true);
      if (st.ui) st.ui.el.hidden = true;
      st.activo = false; st.env = null; J.izq = J.der = false; J.arr = null;
      liberarPool();
    }
    function liberarPool() {
      for (const t in pool) { for (const im of pool[t].mallas) { raiz.remove(im); im.geometry.dispose(); for (const k of ['map', 'normalMap']) if (im.material[k]) im.material[k].dispose(); im.material.dispose(); im.dispose(); } delete pool[t]; }
      if (canoa) { raiz.remove(canoa.grupo); for (const ms of canoa.grupo.children) { ms.geometry.dispose(); if (ms.material.map) ms.material.map.dispose(); ms.material.dispose(); } canoa = null; }
      if (raiz.parent) scene.remove(raiz);
      st.listo = null;
    }

    // ---------- Pruebas: AV.riverTest() ----------
    function test(o) {
      o = o || {};
      const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
      const comparable = s => JSON.stringify(s, (k, v) => (k === 'clock' || k === 'playTime' || k === 't' ? undefined : v));
      const recReal = leer(ALMACEN);
      if (st.activo) salir();
      const busy0 = G.ui.busy, step0 = F.step, follow0 = G.camara.follow, draw0 = G.camara.draw, quiet0 = G.quiet, pausa0 = G.pausa.activa(), fov0 = R.camera.fov;
      const mem = () => ({ g: R.renderer.info.memory.geometries, t: R.renderer.info.memory.textures });
      claveRec = ALMACEN + '.prueba';
      try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
      let emitido = null; const emit0 = G.emit; G.emit = function (n, d) { if (n === 'retosResultado') emitido = d; return emit0.apply(G, arguments); };
      const sigFila = () => filas.find(f => f.s + P.largo + 1 >= J.s);
      // Robot: va hacia el hueco de la siguiente fila con las mismas teclas que un jugador (velocidad lateral y respuesta reales)
      const robot = (dt, max) => {
        dt = dt || 1 / 60; let n = 0;
        while (st.fase === 'juego' && n++ < (max || 1e6)) {
          const f = sigFila(), obj = f ? f.g : J.lado, d = obj - J.lado;
          J.der = d > 0.12; J.izq = d < -0.12; J.objetivo = null;
          paso(dt);
        }
        J.izq = J.der = false;
        return { fase: st.fase, choque: J.choque, metros: Math.round(J.metros), racimos: J.racimos };
      };
      const dosCuadros = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      let sAntes = null;
      return (async () => {
        try {
          await crearPool(); sAntes = comparable(S);
          check('Declaración completa (id rio_rush, recursos, cámara, controles, inicio, victoria, derrota, puntuación, récords, modalidades) y publicada', ['id', 'nombre', 'descripcion', 'recursos', 'camara', 'controles', 'inicio', 'victoria', 'derrota', 'puntuacion', 'musica', 'resultados', 'records', 'modos'].every(k => DECL[k] != null) && DECL.id === 'rio_rush' && DECL.records.clave === 'rio_rush' && DECL.oculto === false && MODOS.every(m => DECL.modos[m]));
          // ---------- El cauce ----------
          const PR = MAPA.agua.rio.puntos;
          let lejos = 0, sinAgua = 0, nivelMal = 0, orillaMal = 0, maxD = 0, estrecho = Infinity;
          for (let s = 0; s <= C.largo; s += 5) {
            const q = enCauce(s, {});
            let bd = Infinity; for (let j = 0; j < PR.length - 1; j++) { const ax = PR[j][0], az = PR[j][1], bx = PR[j + 1][0], bz = PR[j + 1][1], vx = bx - ax, vz = bz - az, t = clamp(((q.x - ax) * vx + (q.z - az) * vz) / (vx * vx + vz * vz || 1), 0, 1); bd = Math.min(bd, Math.hypot(ax + vx * t - q.x, az + vz * t - q.z)); }
            maxD = Math.max(maxD, bd); if (bd > 1.5) lejos++;
            const w = nivelAgua(q.x, q.z); if (w === -Infinity) sinAgua++; else if (Math.abs(q.y - w) > 0.7) nivelMal++;
            for (const l of [q.lo, q.hi]) { const p = mundo(q, l, {}); if (H(p.x, p.z) > q.y + 0.05) orillaMal++; }
            estrecho = Math.min(estrecho, q.hi - q.lo);
          }
          check('El cauce sigue mapa.agua.rio.puntos (spline a ≤ 1,5 m de la polilínea en todo el río, ' + Math.round(C.largo) + ' m)', C.largo > 1000 && lejos === 0, 'máx ' + maxD.toFixed(2) + ' m');
          check('Todo el cauce tiene agua y la canoa va a su nivel (±0,7 m; los saltos de 1 m del mapa son rápidos suaves)', sinAgua === 0 && nivelMal === 0, sinAgua + ' sin agua · ' + nivelMal + ' fuera de nivel');
          check('Los bordes navegables quedan sobre agua (la orilla manda) y el cauce más estrecho deja pasar la canoa', orillaMal === 0 && estrecho > P.ancho * 2 + 0.5, orillaMal + ' bordes en tierra · más estrecho ' + estrecho.toFixed(1) + ' m');
          // ---------- Entrar ----------
          const ok = await abrir();
          check('Entra con el mundo libre, el pool y la canoa del kit de edificios', ok === true && st.activo && raiz.parent === scene && ['tronco', 'roca', 'piedras', 'racimo'].every(t => pool[t]) && !!canoa && canoa.box.getSize(new THREE.Vector3()).x > 3, Object.keys(pool).join(','));
          check('Envolturas: la historia ve el mundo ocupado, fisica no manda y la cámara es la del río', G.ui.busy() === true && F.step !== step0 && G.camara.follow !== follow0 && G.camara.draw !== draw0);
          check('Clases river-on y retos-on, HUD y pista a la vista', document.body.classList.contains('river-on') && document.body.classList.contains('retos-on') && !st.ui.el.hidden && !st.ui.pista.hidden);
          check('Filas y racimos generados delante con instancias del pool', filas.length >= 2 && racimos.length >= 1 && vivas() > 0, filas.length + ' filas · ' + racimos.length + ' racimos · ' + vivas() + ' instancias');
          check('Vittata va posada en la canoa (no vuela ni nada), mirando río abajo y sobre el agua', M.flying === false && M.swimming === false && M.posado === 'fino' && S.facing.x * enCauce(J.s, {}).tx + S.facing.z * enCauce(J.s, {}).tz > 0.9 && nivelAgua(S.pos.x, S.pos.z) > -Infinity && Math.abs(S.pos.y - nivelAgua(S.pos.x, S.pos.z)) < 0.8);
          // ---------- Cámara: detrás y por encima; Vittata y la canoa grandes desde el primer cuadro ----------
          await dosCuadros();
          const vista = asp => {
            const a0 = cam.asp; cam.asp = asp;
            const c = new THREE.PerspectiveCamera(CAMS[modoCam()].fov, asp, 0.1, 500); camObjetivo(c.position); c.lookAt(camMira(new THREE.Vector3())); c.updateMatrixWorld(true);
            const pr = (x, y, z) => new THREE.Vector3(x, y, z).project(c);
            const root = G.actores.player3D && G.actores.player3D.root, bb = root ? new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()) : null, hv = bb && bb.y > 0.3 && bb.y < 6 ? bb.y : 1.2;
            const t1 = pr(S.pos.x, S.pos.y + hv, S.pos.z), t0 = pr(S.pos.x, S.pos.y, S.pos.z);
            canoa.grupo.updateMatrixWorld(true); const cb = new THREE.Box3().setFromObject(canoa.grupo), xs = [], ys = [];
            for (const x of [cb.min.x, cb.max.x]) for (const y of [cb.min.y, cb.max.y]) for (const z of [cb.min.z, cb.max.z]) { const p = pr(x, y, z); xs.push(p.x); ys.push(p.y); }
            const detras = (() => { const q = enCauce(J.s, {}), dx = c.position.x - S.pos.x, dz = c.position.z - S.pos.z, l = Math.hypot(dx, dz) || 1; return -(dx * q.tx + dz * q.tz) / l; })();
            cam.asp = a0;
            return { V: t0, tam: Math.abs(t1.y - t0.y) / 2, canoa: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }, detras, alto: c.position.y - S.pos.y, hv };
          };
          const enV = p => p.z > 0 && p.z < 1 && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95, canoaEnV = v => v.canoa.x0 > -1 && v.canoa.x1 < 1 && v.canoa.y0 > -1 && v.canoa.y1 < 1;
          const vm = vista(390 / 844), vd = vista(16 / 9);
          check('Cámara detrás (río arriba) y por encima de la canoa', vm.detras > 0.8 && vd.detras > 0.8 && vm.alto > 2 && vd.alto > 2, 'detrás ' + vd.detras.toFixed(2) + ' · alto ' + vd.alto.toFixed(1) + ' m');
          check('Móvil vertical (390×844), primer cuadro: Vittata ≥ 12 % del alto, la canoa entera a la vista y ≥ 25 % del ancho', enV(vm.V) && vm.tam >= 0.12 && canoaEnV(vm) && (vm.canoa.x1 - vm.canoa.x0) / 2 >= 0.25, 'Vittata ' + (vm.tam * 100).toFixed(0) + '% (' + vm.hv.toFixed(2) + ' m) · canoa ' + ((vm.canoa.x1 - vm.canoa.x0) * 50).toFixed(0) + '% del ancho');
          check('Escritorio (16:9): Vittata ≥ 8 % del alto y la canoa entera a la vista', enV(vd.V) && vd.tam >= 0.08 && canoaEnV(vd), 'Vittata ' + (vd.tam * 100).toFixed(0) + '%');
          // QA-49: donde el centro del cauce tiene un techo (pasto o puente), la cámara queda por encima y no se ve la losa
          { const s0 = J.s, l0 = J.lado, pos = new THREE.Vector3(); let mal = 0, peor = 0, en = 0, techos = 0;
            for (let s = 0; s <= C.largo; s += 4) {
              const q = enCauce(s, {});
              let top = H(q.x, q.z); if (G.terreno.surfaceY) top = Math.max(top, G.terreno.surfaceY(q.x, q.z, top + 40));
              if (!(top > q.y + 2.5)) continue;
              techos++; J.s = s; J.lado = 0; camObjetivo(pos);
              if (pos.y < top + 0.8) { mal++; peor = Math.max(peor, top - pos.y); en = s; }
            }
            J.s = s0; J.lado = l0;
            check('QA-49: donde el cauce tiene techo, la cámara queda por encima (no pasa bajo la losa)', mal === 0, techos + ' techos · ' + mal + ' sin despejar · peor ' + peor.toFixed(1) + ' m en s=' + Math.round(en)); }
          // ---------- Control: teclas y un dedo ----------
          st.sinFx = true;
          check('Antes de mover nada la canoa espera (fase listo)', st.fase === 'listo' && (paso(0.5), st.fase === 'listo' && J.s === P.inicio));
          const l0 = J.lado; J.der = true; arrancar(); for (let k = 0; k < 12; k++) paso(1 / 60); J.der = false;
          check('La tecla → (o D) arranca y lleva la canoa a la derecha', st.fase === 'juego' && J.lado > l0 + 0.3 && J.s > P.inicio, (J.lado - l0).toFixed(2) + ' m');
          J.vl = 0; const l1 = J.lado; toqueEn(200, 7); arrastrar(200 - ((R.renderer.domElement.clientWidth || innerWidth) * 0.15)); for (let k = 0; k < 30; k++) paso(1 / 60);
          check('Un dedo: arrastrar a la izquierda lleva la canoa a la izquierda (sin pasar de la velocidad lateral)', J.lado < l1 - 0.5 && Math.abs(J.vl) <= P.vLat + 1e-6, (J.lado - l1).toFixed(2) + ' m');
          J.arr = null; J.objetivo = null; J.vl = 0;
          J.der = true; for (let k = 0; k < 120; k++) paso(1 / 60); J.der = false;
          { const q = enCauce(J.s, {}); check('La orilla frena la canoa (no se sale del agua ni choca)', Math.abs(J.lado - (q.hi - P.ancho)) < 0.05 && st.fase === 'juego', J.lado.toFixed(2) + ' / ' + (q.hi - P.ancho).toFixed(2)); }
          // ---------- Dificultad ----------
          check('La dificultad sube con la velocidad: de ' + P.vel0 + ' a ' + P.vel1 + ' m/s, filas más juntas y huecos más estrechos', velocidadEn(P.inicio) === P.vel0 && velocidadEn(P.inicio + P.rampa + 1) === P.vel1 && velocidadEn(400) > velocidadEn(100) && lerp(P.fila0, P.fila1, 1) < P.fila0 && P.hueco1 < P.hueco0);
          // ---------- Generador justo y robot por el río entero ----------
          const robots = [], todas = [];
          for (const semilla of [11, 23, 42]) {
            vaciar(); rnd = G.util.rng(semilla); Object.assign(J, { s: P.inicio, lado: 0, vl: 0, objetivo: null, puntos: 0, racimos: 0, metros: 0, choque: '', izq: false, der: false }); st.fase = 'juego';
            const q0 = enCauce(P.inicio, {}); J.lado = clamp(0, q0.lo + P.ancho, q0.hi - P.ancho);
            const lista = []; const gen0 = generarFila; // registra cada fila al generarse
            const r = (() => { let ult = null; const res = robot(1 / 60); for (const f of filas) if (f !== ult) lista.push(f); return res; })();
            robots.push(r); todas.push(lista.length); void gen0;
          }
          check('Robot (mismas teclas que un jugador): baja el río entero sin chocar y llega al mar (3 semillas)', robots.every(r => r.fase === 'fin' && r.choque === 'meta'), robots.map(r => r.choque + ' ' + r.metros + ' m ' + r.racimos + ' rac').join(' · '));
          check('Recoger racimos suma puntos (10 cada uno) y llegar al mar suma 50', robots.every(r => r.racimos > 5) && J.puntos === Math.floor(J.metros / P.metrosPunto) + J.racimos * P.puntosRacimo + P.bonoMeta, J.puntos + ' puntos');
          // Huecos: libres de verdad y alcanzables con la seguridad del generador
          vaciar(); rnd = G.util.rng(7); J.s = P.inicio; J.lado = 0; st.fase = 'juego';
          const gen = []; while (generarFila()) { const f = filas[filas.length - 1]; gen.push({ s: f.s, g: f.g, hg: f.hg, libre: f.libre, obst: f.obst.map(x => Object.assign({}, x)) }); reciclarFila(filas.shift()); }
          let libres = 0, alcanzables = 0, conObst = 0;
          for (let i = 0; i < gen.length; i++) {
            const f = gen[i]; if (!f.libre) conObst++;
            if (f.obst.every(x => !golpe(x, f.s, f.g) && !golpe(x, f.s + 1, f.g) && !golpe(x, f.s - 1, f.g))) libres++;
            if (i === 0 || f.libre || Math.abs(f.g - gen[i - 1].g) <= alcanceLateral(f.s - gen[i - 1].s, velocidadEn(f.s)) + 1e-6) alcanzables++;
          }
          check('Todas las filas del río (' + gen.length + ', ' + conObst + ' con obstáculos) dejan su hueco libre y cada hueco se alcanza desde el anterior', gen.length > 40 && conObst > 30 && libres === gen.length && alcanzables === gen.length, libres + '/' + alcanzables + '/' + gen.length);
          vaciar();
          // ---------- Choques ----------
          const fila = (obs) => { vaciar(); st.fase = 'juego'; J.choque = ''; const f = { s: 200, g: 0, hg: 1, obst: obs, libre: false }; filas.push(f); st.ultimaFila = { s: 1e9, g: 0 }; return f; };
          const q200 = enCauce(200, {}), lc = (q200.lo + q200.hi) / 2;
          fila([{ tipo: 'roca', s: 200, l: lc, r: 0.7, i: -1 }]); J.s = 200 - P.largo - 0.7 * 0.9 - 0.3; J.lado = lc; J.vl = 0; J.der = J.izq = false; J.objetivo = null;
          for (let k = 0; k < 20 && st.fase === 'juego'; k++) paso(1 / 60);
          check('Una roca delante = «¡Uy!» (fin, sin daño), con su causa', st.fase === 'fin' && J.choque === 'roca', J.choque);
          check('Al chocar: hit-stop corto y la canoa rebota un poco río arriba', (REDUCED || st.hitStop > 0.1) && J.rv > 0 && (() => { const s0 = J.s; for (let k = 0; k < 10; k++) paso(1 / 60); return J.s < s0; })());
          { const r = 0.7 * 0.9 + P.ancho, ob = { tipo: 'roca', s: 200, l: lc, r: 0.7 };
            check('Rozando la roca por fuera (1 cm) NO choca; 5 cm dentro, sí', golpe(ob, 200, lc + r + 0.01) === '' && golpe(ob, 200, lc + r - 0.05) === 'roca' && golpe(ob, 200 - P.largo - 0.7 * 0.9 - 0.01, lc) === '' && golpe(ob, 200 - P.largo - 0.7 * 0.9 + 0.05, lc) === 'roca'); }
          { const ob = { tipo: 'tronco', s: 200, l0: lc - 1, l1: lc + 1, r: pool.tronco.rt };
            check('Tronco de través: delante choca; por el lado libre (1 cm fuera) no', golpe(ob, 200, lc) === 'tronco' && golpe(ob, 200, lc + 1 + ob.r + P.ancho + 0.01) === '' && golpe(ob, 200 - P.largo - ob.r - 0.01, lc) === '', 'radio ' + ob.r.toFixed(2) + ' m'); }
          fila([{ tipo: 'tronco', s: 200, l0: lc - 1, l1: lc + 1, r: pool.tronco.rt, i: -1 }]); J.s = 199; J.lado = lc; paso(1 / 60);
          check('Chocar con un tronco también termina', st.fase === 'fin' && J.choque === 'tronco');
          fila([{ tipo: 'roca', s: 200, l: lc - 2, r: 0.6, i: -1 }]); J.s = 199; J.lado = lc + 0.5; paso(1 / 60);
          check('Por el hueco se pasa sin chocar', st.fase === 'juego' && !J.choque);
          { const u = st.ui; J.choque = 'roca'; resultados(); const a = /roca/.test(u.como.textContent); J.choque = 'tronco'; resultados(); const b = /tronco/.test(u.como.textContent); J.choque = 'meta'; resultados(); const c = /mar/.test(u.como.textContent) && /lograste/.test(u.titulo.textContent); u.fin.hidden = true;
            check('El resultado dice qué pasó (roca, tronco o el mar)', a && b && c); }
          // Racimo
          vaciar(); st.fase = 'juego'; J.choque = ''; st.ultimaFila = { s: 1e9, g: 0 }; J.racimos = 0; J.s = 300; J.lado = lc; J.metros = J.s - P.inicio; contar(); const p0 = J.puntos;
          { const i = tomar('racimo'); racimos.push({ s: 301, l: lc + 0.3, i, cogido: false, fase: 0 }); } paso(1 / 60);
          check('Recoger un racimo suma 10 puntos y desaparece', J.racimos === 1 && J.puntos >= p0 + P.puntosRacimo && racimos.length === 0, J.puntos - p0);
          // ---------- Récord y «Mis récords» ----------
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
          vaciar(); st.fase = 'juego'; J.racimos = 2; J.s = 500; J.metros = J.s - P.inicio; J.choque = ''; contar(); fin('roca');
          const rec1 = leerRec();
          check('Récord en el almacén de Retos (clave rio_rush: mejor y jugadas) y nuevo récord avisado', rec1.rio_rush.mejor === J.puntos && rec1.rio_rush.jugadas === 1 && J.nuevo === true, JSON.stringify(rec1.rio_rush));
          check('«Mis récords» recibe retosResultado { modo: rio_rush, puntos, prueba }', emitido && emitido.modo === 'rio_rush' && emitido.puntos === J.puntos && emitido.prueba === true, JSON.stringify(emitido));
          { const ra = G.recordsApi || (window.AVRecords ? window.AVRecords(G) : null); const d = ra && ra._dev && ra._dev.retosDe ? ra._dev.retosDe(rec1) : null;
            check('records.js lee la clave rio_rush (Mis récords)', !ra || !ra._dev || !ra._dev.retosDe || (d && d.rio_rush && d.rio_rush.mejor === rec1.rio_rush.mejor), d ? JSON.stringify(d.rio_rush) : 'sin _dev'); }
          await new Promise(r => setTimeout(r, 520));
          check('Resultados a la vista con «Otra vez»', !st.ui.fin.hidden && st.ui.num.textContent === String(J.puntos));
          check('Un toque reflejo justo tras el choque no reinicia; pasado finEspera sí', (J.finT = 0, toqueEn(10, 3) === false && st.fase === 'fin') && (J.finT = P.finEspera, toqueEn(10, 3) === true && st.fase === 'listo'));
          check('Reinicio: puntos 0, fase listo, filas nuevas delante', J.puntos === 0 && st.fase === 'listo' && filas.length >= 2 && st.ui.fin.hidden);
          // ---------- 50 reinicios: sin fugas ----------
          colocar(1 / 60); await dosCuadros();
          const m0 = mem(), capOk = [];
          for (let i = 0; i < 50; i++) {
            otraVez(); arrancar(); robot(1 / 30, 300 + (i % 7) * 20); colocar(1 / 30);
            capOk.push(Object.keys(pool).every(t => pool[t].libres.length >= 0 && pool[t].libres.length <= CAP[t] && new Set(pool[t].libres).size === pool[t].libres.length));
            if (st.fase === 'juego') fin('roca');
          }
          await dosCuadros();
          const m1 = mem();
          check('50 reinicios: geometrías y texturas del renderer no crecen (sin fugas)', m1.g <= m0.g && m1.t <= m0.t, JSON.stringify(m0) + ' → ' + JSON.stringify(m1));
          check('50 reinicios: el pool nunca se desborda ni duplica huecos', capOk.every(Boolean));
          // ---------- AC2 · clásico: medallas, el «casi», la siguiente meta y el ranking (reto rio_rush) ----------
          st.modo = 'puntos';
          check('Medallas por puntos: bronce 40, plata 120, oro 250', medallaPuntos(39) === null && medallaPuntos(40) === 'bronce' && medallaPuntos(120) === 'plata' && medallaPuntos(250) === 'oro');
          Object.assign(J, { puntos: 100, mejor: 110, antes: 110 }); { const ls = metaLineas(); check('El «casi» y la siguiente meta (clásico)', ls[0] === '¡A solo 10 puntos del récord!' && ls[1] === 'Te faltan 10 puntos para la plata', ls.join(' | ')); }
          Object.assign(J, { puntos: 130, mejor: 130, antes: 110 }); { const ls = metaLineas(); check('Sello nuevo solo si la medalla sube (de bronce a plata)', ls[0] === '¡Nuevo sello de plata en Mis récords!' && ls[1] === 'Te faltan 120 puntos para el oro', ls.join(' | ')); }
          otraVez(); arrancar(); J.racimos = 3; J.s = 400; J.metros = J.s - P.inicio; contar(); fin('roca'); resultados();
          check('Resultados del clásico: medalla de la partida y metas a la vista', st.ui.medalla.textContent === '★ Medalla de bronce' && !st.ui.meta.hidden && st.ui.dato.children.length === 2, st.ui.medalla.textContent + ' · ' + st.ui.meta.textContent);
          { const f0 = window.fetch; let net = 0; window.fetch = function (u) { if (!/\.(glb|js|json|png|jpe?g|webp|css|mp3|ogg|wasm)(\?|$)/i.test(String(u && u.url || u))) net++; return f0.apply(this, arguments); }; let rp; try { rp = await publicar(null); } finally { window.fetch = f0; }
            check('Ranking: en partida de prueba el botón no sale y publicar() nunca llama a la red', st.ui.rank.hidden === true && rp === 'prueba' && net === 0, rp + '/' + net); }
          { const envios = []; const sim = (url, op) => { envios.push(JSON.parse(op.body)); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, puesto: 1, top: [] }) }); };
            const p1 = publicar(null, sim); await new Promise(r => setTimeout(r, 60)); const panel = document.getElementById('rec-rank');
            if (panel) { panel.querySelector('#rk-pub').click(); await new Promise(r => setTimeout(r, 80)); panel.querySelector('#rk-no').click(); }
            const r1 = await p1;
            check('Ranking: records.js acepta el reto rio_rush y envía la marca del clásico', !!panel && envios.length === 1 && envios[0].reto === 'rio_rush' && envios[0].valor === J.puntos && envios[0].dur_ms >= 0 && (r1 === 'publicado' || r1 === 'cerrado'), JSON.stringify(envios[0] || null) + ' · ' + r1); }
          // ---------- AC2 · contrarreloj ----------
          { const m = [12.34, -1.25, 0, 13.1, -1.04, 0, 14.0, 0.5, 0], d = decodificarFantasma(codificarFantasma(m));
            check('Fantasma: el formato de Retos (decímetros, diferencias en base 36) va y vuelve', d && d.length === m.length && m.every((v, i) => Math.abs(v - d[i]) <= 0.051)); }
          try { localStorage.removeItem(claveFantasma()); } catch (e) { /* sin almacén */ }
          check('Sin fantasma guardado, «Contra tu fantasma» está apagado y no se puede elegir', cambiarModo('fantasma') === false && st.ui.el.querySelector('[data-rr-modo="fantasma"]').disabled === true);
          check('Elegir Contrarreloj reinicia en esa modalidad, con la misma bajada (semilla fija) y el reloj en el marcador', cambiarModo('reloj') === true && st.modo === 'reloj' && J.semilla === SEMILLA_RELOJ && st.fase === 'listo' && !!st.grab && /^\d+:\d\d\.\d$/.test(st.ui.puntos.textContent) && !st.ui.modos.hidden && st.ui.el.querySelector('[data-rr-modo="reloj"]').getAttribute('aria-pressed') === 'true', st.ui.puntos.textContent);
          check('La modalidad elegida se recuerda (récords de Retos: rio_rush.modo)', leerRec().rio_rush.modo === 'reloj');
          { const f = fila([{ tipo: 'tronco', s: 200, l0: lc - 1, l1: lc + 1, r: pool.tronco.rt, i: -1 }, { tipo: 'roca', s: 201.5, l: lc, r: 0.6, i: -1 }]); J.s = 199; J.lado = lc; J.vl = 0; J.der = J.izq = false; J.objetivo = null; J.choques = 0; J.uy = 0; J.t = 0; paso(1 / 60);
            check('Contrarreloj: chocar NO termina; frena la canoa y aparta el tronco', st.fase === 'juego' && J.choques === 1 && J.uy > 0 && f.obst[0].fuera === true, J.choques + ' · uy ' + J.uy.toFixed(2));
            const s0 = J.s; for (let k = 0; k < 30; k++) paso(1 / 60);
            check('Durante el frenazo la canoa va más lenta y lo demás que toca se aparta sin otro choque', J.s - s0 < velocidadEn(J.s) * 0.5 * 0.75 && J.choques === 1 && f.obst[1].fuera === true && st.fase === 'juego', (J.s - s0).toFixed(2) + ' m en 0,5 s'); }
          otraVez(); arrancar();
          { const r = robot(1 / 60), rec2 = leerRec().rio_rush, fan = leerFantasma(), id = tiempoIdeal();
            check('Contrarreloj: el robot llega al mar y el tiempo es el de la bajada perfecta (' + relojTxt(id) + ')', r.choque === 'meta' && J.choques === 0 && Math.abs(J.ms / 1000 - id) < 1.5, relojTxt(J.ms / 1000));
            check('Récord de la contrarreloj (ms), medalla de oro (sin choques) y nuevo récord', rec2.reloj === J.ms && rec2.medallaReloj === 'oro' && rec2.jugadasReloj === 1 && J.nuevo === true && J.medalla === 'oro', JSON.stringify(rec2));
            check('«Mis récords» recibe retosResultado { modo: rio_rush, reloj, ms, medalla }', emitido && emitido.modo === 'rio_rush' && emitido.reloj === true && emitido.ms === J.ms && emitido.medalla === 'oro' && emitido.prueba === true, JSON.stringify(emitido));
            check('La mejor bajada se guarda como fantasma (una muestra cada 0,1 s, ' + (fan ? fan.n : 0) + ' muestras)', fan && fan.ms === J.ms && Math.abs(fan.n - J.ms / 100) < 4 && Math.abs(fan.p[(fan.n - 1) * 3] - J.s) < 0.2, fan ? fan.n + ' muestras · ' + (localStorage.getItem(claveFantasma()) || '').length + ' B' : 'sin fantasma');
            const ra = G.recordsApi || (window.AVRecords ? window.AVRecords(G) : null), d = ra && ra._dev && ra._dev.retosDe ? ra._dev.retosDe(leerRec()) : null;
            check('records.js lee la contrarreloj (mejor tiempo y medalla)', !d || (d.rio_rush && d.rio_rush.reloj === J.ms && d.rio_rush.medallaReloj === 'oro'), d ? JSON.stringify(d.rio_rush) : 'sin _dev'); }
          { Object.assign(J, { ms: limitesReloj().oro + 2500, mejorR: limitesReloj().oro + 1500, nuevo: false, medalla: 'plata', medAntes: 'plata' }); const ls = metaLineas();
            check('El «casi» y la siguiente meta de la contrarreloj (en segundos)', ls[0] === '¡A solo 1,0 s de tu récord!'.replace('1,0', dec(1)) && ls[1] === 'Te faltan ' + dec(1.5) + ' s para el oro', ls.join(' | ')); }
          // ---------- AC2 · contra tu fantasma ----------
          check('Con fantasma guardado se puede elegir «Contra tu fantasma»', cambiarModo('fantasma') === true && st.modo === 'fantasma' && J.semilla === SEMILLA_RELOJ && st.ui.el.querySelector('[data-rr-modo="fantasma"]').disabled === false);
          const okFan = await montarFantasma(); await dosCuadros();
          check('El fantasma es la cotorra translúcida de Retos y sale junto a la canoa', okFan === true && st.fan && st.fan.ch.root.visible && st.fan.ch.root.parent === raiz && (() => { let tr = true; st.fan.ch.root.traverse(o => { if (o.material) for (const m of [].concat(o.material)) if (!(m.transparent && m.opacity < 0.5)) tr = false; }); return tr; })() && st.fan.ch.root.position.distanceTo(new THREE.Vector3(S.pos.x, S.pos.y, S.pos.z)) < 4);
          arrancar(); for (let k = 0; k < 180; k++) { const f = sigFila(), dd = (f ? f.g : J.lado) - J.lado; J.der = dd > 0.12; J.izq = dd < -0.12; paso(1 / 60); dibujarFantasma(1 / 60); } J.der = J.izq = false; sincronizar(); pintarReloj();
          check('El fantasma avanza con tu bajada y el marcador dice cuánto le sacas', J.ventaja != null && Math.abs(J.ventaja) < 1.5 && /Junto a tu fantasma|Vas \d+ m por (delante|detrás)/.test(st.ui.dif.textContent) && !st.ui.dif.hidden && st.fan.ch.root.position.distanceTo(new THREE.Vector3(S.pos.x, S.pos.y, S.pos.z)) < 4, 'ventaja ' + (J.ventaja == null ? '-' : J.ventaja.toFixed(2)) + ' · ' + st.ui.dif.textContent + ' · dist ' + st.fan.ch.root.position.distanceTo(new THREE.Vector3(S.pos.x, S.pos.y, S.pos.z)).toFixed(2) + ' · oculto ' + st.ui.dif.hidden);
          { const r = robot(1 / 60); check('Contra tu fantasma: misma bajada, mismo tiempo; sin récord nuevo no se pisa el fantasma', r.choque === 'meta' && J.nuevo === false && leerFantasma().ms === leerRec().rio_rush.reloj && emitido.fantasma === true, relojTxt(J.ms / 1000)); }
          // ---------- AC2 · inglés y tarjetas ----------
          { const id = G.idioma, lang0 = id && id.actual();
            if (id) { await id.poner('en'); await id.listo; }
            const t = id ? id.tr : s => s;
            const lista = ['Clásico', 'Contrarreloj', 'Contra tu fantasma', '¡Contrarreloj hasta el mar!', 'Chocar no termina, pero frena la canoa. El río es siempre el mismo: apréndetelo.', '¡Contra tu fantasma!', 'La cotorra transparente es tu mejor bajada. ¡Gánale hasta el mar!',
              '¡Arrastra para guiar la canoa!', '¡Usa ← → para guiar la canoa!', 'Termina una contrarreloj para tener tu fantasma.', 'Vas 12 m por delante', 'Vas 3 m por detrás', 'Junto a tu fantasma', 'Sin choques', '1 choque', '4 choques', '1 racimo', '7 racimos',
              '¡Uy! La canoa chocó con un tronco. Vittata se agarra fuerte y se ríe.', '¡Uy! La canoa tocó una roca. Vittata se sacude el agua y se ríe.', '¡Llegaste al mar! Bajaste todo el río Amazonas.', '¡Lo lograste!', 'Tu mejor: 2:10.4', 'Tu mejor: 85 puntos', 'Baja un poco más para tener tu primer récord.',
              '★ Medalla de oro', '★ Medalla de plata', '★ Medalla de bronce', '¡A solo 1.2 s de tu récord!', 'Te faltan 3.5 s para el oro', 'Te faltan 10 puntos para la plata', '¡A solo 4 puntos del récord!', '¡Nuevo sello de plata en Mis récords!', 'Salir de River Rush',
              'Baja el río en canoa: contrarreloj y fantasma', 'Baja el río Amazonas en canoa. Esquiva troncos y rocas, recoge racimos y llega al mar. Clásico, contrarreloj o contra tu fantasma.', 'Récord: 85 puntos', 'Contrarreloj: 2:10.4', 'Cargando River Rush…'];
            const mal = lista.filter(s => !(t(s) !== s && !/[¡¿áéíóú]/i.test(t(s))));
            check('Inglés: los textos de River Rush, sus modalidades y sus tarjetas se traducen', id && mal.length === 0, id ? mal.slice(0, 4).join(' | ') || t('Vas 12 m por delante') : 'sin idioma');
            if (id) { await id.poner(lang0 || 'es'); await id.listo; } }
          { const tarj = document.querySelector('#modos [data-modo="river"]');
            check('Menú «¿Cómo quieres jugar?»: tarjeta River Rush con subtítulo y es submit', !!tarj && tarj.type === 'submit' && tarj.value === 'river' && !!tarj.querySelector('svg.modo-img') && /canoa/.test(tarj.querySelector('small').textContent)); }
          { const rt = G.retosApi; const u = rt && rt.pruebas && rt.pruebas.ui ? rt.pruebas.ui() : null;
            check('Retos: tarjeta de River Rush con su récord', !rt || (u && !!u.menu.querySelector('[data-jugar="rio_rush"]') && !!u.menu.querySelector('[data-rec="rio_rush"]'))); }
          // ---------- Salir ----------
          await dosCuadros(); // (el fantasma se dibuja: el recuento de memoria necesita cuadros antes de salir)
          const mFin = mem();
          salir();
          check('Al salir se quitan las envolturas y la cámara vuelve', G.ui.busy === busy0 && F.step === step0 && G.camara.follow === follow0 && G.camara.draw === draw0 && R.camera.fov === fov0 && !document.body.classList.contains('river-on') && !document.body.classList.contains('retos-on'));
          check('Al salir G.quiet vuelve y el mundo no queda en pausa', G.quiet === quiet0 && G.pausa.activa() === pausa0);
          check('La partida de la historia (G.S) queda intacta', comparable(S) === sAntes);
          check('Récords reales intactos', leer(ALMACEN) === recReal);
          check('Nada del río queda en la escena: pool y canoa liberados', raiz.visible === false && !raiz.parent && Object.keys(pool).length === 0 && !canoa && filas.length === 0 && racimos.length === 0);
          const m2 = mem();
          // QA-51: se compara con el momento de salir, no con el principio de la prueba. El streaming del mundo suma geometrías mientras el robot baja el río y un «m2 < m0» sale en rojo aunque el río sí se libere.
          check('Al salir las geometrías y texturas bajan de las de la partida', m2.g < mFin.g && m2.t <= mFin.t, JSON.stringify(mFin) + ' → ' + JSON.stringify(m2));
        } catch (e) {
          check('Sin excepciones', false, (e && e.stack) || String(e));
          try { salir(); } catch (e2) { /* ya fuera */ }
        } finally {
          G.emit = emit0; st.sinFx = false;
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
          claveRec = ALMACEN;
        }
        const passed = out.filter(x => x.ok).length;
        if (!o.silencioso) console.log('AV.riverTest: ' + passed + '/' + out.length + (passed === out.length ? ' ✓' : ' · ' + out.filter(x => !x.ok).map(x => x.name + (x.extra ? ' (' + x.extra + ')' : '')).join(' | ')));
        return { passed, total: out.length, results: out };
      })();
    }

    G.riverRushApi = { DECL, P, MODOS, MEDALLAS_P, abrir, salir, otraVez, cambiarModo, liberar: () => (st.activo ? salir() : liberarPool()),
      _dev: { J, st, cam, CAMS, filas, racimos, pool, paso, generarFila, vaciar, enCauce, golpe, toqueEn, arrastrar, metaLineas, limitesReloj, tiempoIdeal, leerFantasma, get cauce() { return C; } },
      get activo() { return st.activo; }, get fase() { return st.fase; }, get modo() { return st.modo; },
      estado: () => ({ modo: st.modo, fase: st.fase, puntos: J.puntos, mejor: J.mejor, reloj: J.ms, mejorReloj: J.mejorR, choques: J.choques, ventaja: J.ventaja, metros: Math.round(J.metros), racimos: J.racimos, s: J.s, lado: J.lado, v: J.v, filas: filas.length, instancias: vivas(), semilla: J.semilla }), test };
    return G.riverRushApi;
  };
})();
