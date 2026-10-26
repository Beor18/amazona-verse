/* Juego · Amazona Flight (prototipo C14, fase 2 de la directiva de minijuegos de Kelvin, 26-oct-2026)
   Vuelo infinito de un toque, en vista 3/4 frontal (C15: se le ve la cara a Vittata; ?flightcam=lado = la lateral de antes): Vittata (la original, modelo y rig intactos) avanza sola sobre el mar
   frente a la playa; cada toque, clic, Espacio o tecla es un impulso vertical; entre toques manda la gravedad. Los obstáculos son
   instancias de piezas que YA existen en el kit de entorno (tronco_caido, roca_musgo_a/b, bambu) y la decoración de la orilla
   palma_sierra_joven: nada de modelos ni bosques nuevos. Se pasa entre las columnas; chocar es un «¡Uy!» amable (nunca daño) y se
   vuelve a empezar con un toque. Puntuación = obstáculos superados.
   Publicado (26-oct, Kelvin lo autorizó): tarjeta en «¿Cómo quieres jugar?» (menu_modos.js) y en Retos (retos.js); también ?mini=flight o
   AV.flight() desde la consola. Pruebas: AV.flightTest(). Medallas (records.js): plata 25, oro 60. Inglés: content/cap1/en.js.

   Cómo encaja con lo que hay (sin arquitectura paralela; es el patrón de src/game/retos.js):
   - Entrar: instantánea de G.S, guardado suspendido, G.quiet; envolturas reversibles de G.ui.busy (la historia ve el mundo ocupado),
     G.fisica.step (aquí mandan un impulso y una gravedad propios, deterministas), G.interaccion.action, las acciones de vuelo de
     fisica.js (tryJump, toggleFly…: no hacen nada) y la cámara (follow, fov y draw: vista lateral fija). Al salir se repone todo y la
     partida vuelve exactamente a como estaba (G.guardado.restaurar).
   - Vittata: solo se le dan los valores que actores.js lee en cada cuadro (S.pos, S.vy, S.facing, MOVE.flying/speed/vx/vz/fase): el
     rig anima el aleteo del impulso (fase 'despegue' → alas de despegue) y el planeo; no se toca ni un hueso.
   - El mundo se mueve y Vittata se queda: los obstáculos avanzan hacia ella a la velocidad de vuelo (la cámara y el streaming de
     edificios no se mueven: draw calls estables y sin cargar la isla entera). La orilla con palmas que pasa vende el avance.
   - Generación procedural JUSTA con un set pequeño de módulos (puerta, suelo, techo, túnel, escalera) y object pooling: cada módulo
     se comprueba con los parámetros reales del impulso y la gravedad (subidaMax y bajadaMax en el tiempo que hay entre huecos) y se
     recoloca si no es superable. Las InstancedMesh se crean una vez (al entrar) y solo cambia instanceMatrix; nada se crea ni se
     destruye por cuadro ni por reinicio (geometrías y texturas constantes: lo comprueba la prueba de 50 reinicios); al salir se libera todo.
   - Dificultad progresiva: velocidad 9 → 14 m/s, hueco 5 → 3,4 m y paso 13 → 9 m a lo largo de los primeros 60 obstáculos.
   - Récord: «Mis récords» de siempre (src/game/records.js) por el gancho retosResultado { modo: 'flight', puntos } y el mismo
     almacén `<almacen>.retos` (clave flight: { mejor, jugadas }). «Nuevo estudiante» lo borra con los demás (boot.js).
   - Música: la de Retos/carreras (musica.js elige por la clase retos-on del cuerpo; con la banda sonora de C13, la pista de
     carreras); no se reinicia por obstáculo.
   - Controles: Espacio, flecha arriba, W o cualquier letra en PC; clic o un toque en toda la pantalla (capa propia, sin retrasos).
     Enter, Espacio o un toque en los resultados = «Otra vez». Esc abre la pausa (sin el resto de botones).
   - Look de fábrica (vibrant_toon): corteza y roca en Phong y hojas en Lambert, como vegetacion.js, así reciben la misma gradación.
   Declaración del minijuego (propuesta de docs/equipo/MINIJUEGOS.md): DECL, abajo. window.AVFlight(G) → { DECL, abrir, salir,
   otraVez, toque, activo, estado, test }. */
(function () {
  'use strict';
  window.AVFlight = function (G) {
    if (G.flightApi) return G.flightApi;
    const S = G.S, R = G.renderer, F = G.fisica, M = F.MOVE, scene = R.scene, $ = G.util.$;
    const REDUCED = !!R.REDUCED;
    const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const ALMACEN = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.retos';
    let claveRec = ALMACEN;
    const MAPA = window.AV_MAPA_CAP1 || null;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const rate = (k, dt) => 1 - Math.exp(-dt * k);
    const H = (x, z) => G.terreno.height(x, z);
    const nivelAgua = (x, z) => { const w = G.agua.levelAt(x, z); return w > -1e8 ? w : -Infinity; };
    const superficie = (x, z) => Math.max(H(x, z), nivelAgua(x, z));
    const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };

    // ---------- Declaración del minijuego (lo que leería un menú o Retos para montarlo sin saber nada más) ----------
    const DECL = {
      id: 'flight', nombre: 'Amazona Flight', nombreEn: 'Amazona Flight',
      descripcion: 'Un toque para subir, la gravedad para bajar. Pasa entre los troncos y las ramas sin chocar. ¿Hasta dónde llegas?',
      recursos: { kit: ['tronco_caido', 'roca_musgo_a', 'roca_musgo_b', 'bambu', 'palma_sierra_joven'], personaje: 'vittata (original)', zona: 'mar frente a la playa' },
      camara: '3/4 frontal (por delante y a un lado, se le ve la cara; ?flightcam=lado = lateral); fija al jugador, el mundo avanza',
      controles: { pc: 'Espacio, flecha arriba, W o cualquier letra: impulso', movil: 'un toque en cualquier sitio: impulso', resultados: 'Enter, Espacio o un toque: otra vez' },
      inicio: 'el primer toque arranca', victoria: null, derrota: 'tocar un tronco, una rama o el agua («¡Uy!», sin daño)',
      puntuacion: 'obstáculos superados', musica: 'retos/carreras (sin reiniciar por obstáculo)',
      resultados: ['puntos', 'mejor', 'nuevoRecord'], records: { clave: 'flight', campos: ['mejor', 'jugadas'], gancho: 'retosResultado' },
      oculto: false, // publicado (Kelvin lo autorizó el 26-oct): menú «¿Cómo quieres jugar?» y Retos; también ?mini=flight y AV.flight()
    };

    // ---------- Parámetros de juego (todos en metros y segundos; los lee también el generador para que cada hueco sea superable) ----------
    const P = {
      impulso: 7.5,        // velocidad vertical que da cada toque (la misma que el salto de fisica.js: 1,28 m de subida)
      gravedad: 22,        // m/s² (gravityUp de fisica.js)
      caidaMax: 13,        // velocidad máxima de caída
      vel0: 9, vel1: 12,   // velocidad de avance al empezar y a la dificultad máxima
      hueco0: 5.0, hueco1: 3.4, // alto del hueco entre columnas
      paso0: 13, paso1: 11, // distancia entre obstáculos (al máximo, un hueco cada 0,92 s)
      rampa: 60,           // obstáculos hasta llegar a la dificultad máxima
      yMin: 1.0,           // altura mínima del vuelo sobre el mar (por debajo: chapuzón = fin)
      yMax: 14,            // techo del carril (la subida se frena ahí)
      radio: 0.55,         // radio del cuerpo de Vittata para chocar (el de fisica.js)
      anchoColumna: 0.5,   // radio del tronco para chocar: al cargar el modelo pasa a ser el visible (medio grosor real)
      toqueMin: 0.3,       // s entre toques que el generador supone a un niño (no un robot): subida sostenida = impulso − g·toqueMin/2
      seguridad: 0.8,      // el generador solo usa esta fracción de lo que el vuelo puede subir o bajar
      margenHueco: 0.35,   // margen por encima y por debajo del cuerpo al pasar por un hueco
      holgura: 1.0,        // m de hueco que tienen que quedar dentro de lo alcanzable (no basta con rozar lo posible)
      bandaHueco: 0.6,     // al cruzar un hueco se supone al jugador a ±0,6 m de su centro (en los huecos pequeños, lo que cabe)
      frenado: 0.25,       // …y que su último toque fue al menos 0,25 s antes de cruzar (llega subiendo a ≤ 2 m/s, no en pleno aleteo)
      adelante: 90, atras: 24, // obstáculos vivos: desde 24 m detrás de Vittata hasta 90 m delante
      finEspera: 0.45,     // s tras el choque antes de aceptar «otra vez» (que un toque reflejo no reinicie sin ver el resultado)
      cercaCamara: 6.5,    // m: lo que queda a menos de esto de la cámara (y a > 8 m de Vittata) se esconde para no tapar
      primero: 14,         // m hasta el primer obstáculo al empezar (a la vista en el móvil vertical)
      flap: 0.22,          // s de aleteo de despegue tras cada toque
    };
    // Subida sostenida (m) tocando cada toqueMin s durante t s. Bajada máxima (m) en t s llegando «frenada» al siguiente hueco: se cae
    // desde el hueco anterior (donde se subía a lo sumo a vyEnHueco) y el último toque se da frenado s antes de cruzar, lo que devuelve
    // subeFrenado m. Con seguridad, el generador solo cuenta con el 80 % de las dos
    const subidaMax = t => P.seguridad * (P.impulso - P.gravedad * P.toqueMin / 2) * t;
    const vyEnHueco = () => P.impulso - P.gravedad * P.frenado, subeFrenado = () => P.impulso * P.frenado - 0.5 * P.gravedad * P.frenado * P.frenado;
    const bajadaMax = t => { const u = Math.max(0, t - P.frenado); return P.seguridad * Math.max(0, Math.min(0.5 * P.gravedad * u * u - vyEnHueco() * u, P.caidaMax * u) - subeFrenado()); };

    // ---------- Dónde se juega: sobre el mar frente a la playa, mirando a la isla ----------
    function arena() {
      const p = MAPA && (MAPA.pois || []).find(q => q.id === 'playa');
      if (p) return { x: p.pos[0], z: p.pos[2] + 27, dx: 1, dz: 0, orilla: p.pos[2] + 1 }; // el carril corre de oeste a este sobre el mar (a 27 m de la playa el fondo está a −1,3…−11 m); la cámara, mar adentro (+z)
      const a = G.guardado.spawn; return { x: a.x, z: a.z, dx: 1, dz: 0, orilla: a.z - 10 };
    }

    // ---------- Estado ----------
    const st = { activo: false, fase: 'nada', snap: null, quiet: false, creador: false, env: null, ui: null, listo: null, A: null };
    const J = { golpeado: null, rv: 0, guia: false, y: 6, vy: 0, v: P.vel0, dist: 0, puntos: 0, n: 0, t: 0, flapT: 0, finT: 0, hover: 0, mejor: 0, nuevo: false, choque: '', ultimoToque: -1e9, semilla: 1 };
    const obst = [];   // obstáculos vivos: { x (distancia de carril), bajo, alto, pasado, inst: { tronco: [i…], roca: [i…], bambu: [i…] } }
    const decor = [];  // palmas de la orilla: { x, i, s, giro }
    let rnd = G.util.rng(1);
    let modulos = 0;

    // ---------- Pool de instancias (se crea una vez al entrar; solo cambia instanceMatrix) ----------
    const KIT = { base: 'assets/models/entorno/', b64: 'AV_ENTORNO_B64' };
    const CAP = { tronco: 40, roca: 20, bambu: 20, palma: 12 };
    const MODELO = { tronco: 'tronco_caido', roca: 'roca_musgo_a', bambu: 'bambu', palma: 'palma_sierra_joven' };
    const pool = {};   // tipo -> { mallas: [InstancedMesh], libres: [i], box, largo, eje }
    const raiz = new THREE.Group(); raiz.name = 'flight'; raiz.visible = false;
    const lin = c => new THREE.Color(c).convertSRGBToLinear();
    function materialDe(src) {
      const hoja = /^HOJA/.test(src.name || ''), roca = /^ROCA/.test(src.name || '');
      const m = hoja ? new THREE.MeshLambertMaterial({ map: src.map || null, side: THREE.DoubleSide, alphaTest: src.alphaTest || 0.5, transparent: false, color: lin('#e6f0d8') })
        : new THREE.MeshPhongMaterial({ map: src.map || null, normalMap: src.normalMap || null, shininess: roca ? 10 : 6, specular: new THREE.Color(0x0c0c0c), color: roca ? new THREE.Color(0.92, 0.92, 0.9) : new THREE.Color(0.78, 0.74, 0.7) });
      m.name = 'flight:' + (src.name || 'mat'); m.userData.flight = true;
      return m;
    }
    function cargarModelo(nombre) {
      return G.assets.loadGLB(KIT.base + nombre + '.glb', { b64: () => (window[KIT.b64] || {})[nombre], script: KIT.base + nombre + '_glb.js', base: KIT.base, error: 'pieza no disponible: ' + nombre })
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
    function crearPool() {
      if (st.listo) return st.listo;
      st.listo = Promise.all(Object.keys(MODELO).map(tipo => cargarModelo(MODELO[tipo]).then(m => {
        const size = new THREE.Vector3(); m.box.getSize(size);
        const eje = size.x >= size.y && size.x >= size.z ? 'x' : size.z >= size.y ? 'z' : 'y';
        const p = { mallas: [], libres: [], box: m.box, largo: size[eje], eje, alto: size.y };
        // Tamaño visible para chocar (C15): radio real del tronco = medio grosor del modelo (solo se estira el eje largo); la roca, a su escala
        p.rt = (eje === 'y' ? size.x + size.z : eje === 'x' ? size.y + size.z : size.x + size.y) / 4;
        if (tipo === 'tronco') P.anchoColumna = Math.max(0.25, p.rt);
        if (tipo === 'roca') { p.rr = (size.x + size.z) / 4 * 1.7; p.ry = size.y / 2 * 1.4; p.yc = -0.25 + 1.4 * (m.box.min.y + m.box.max.y) / 2; }
        for (const pr of m.prims) {
          const im = new THREE.InstancedMesh(pr.geo, materialDe(pr.src), CAP[tipo]);
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
          im.name = 'flight:' + tipo;
          raiz.add(im); p.mallas.push(im);
        }
        for (let i = CAP[tipo] - 1; i >= 0; i--) p.libres.push(i);
        pool[tipo] = p;
      }))).then(() => { crearAyudas(); if (!raiz.parent) scene.add(raiz); return pool; }, e => { st.listo = null; throw e; });
      return st.listo;
    }
    // Ayudas para juzgar la altura (C15): sombra de Vittata en el mar (más pequeña y clara cuanto más alta) y una «ventana» suave
    // en el hueco del siguiente obstáculo (marca el alto exacto por donde pasar). Dos mallas, creadas una vez; no hay anillos.
    const ayuda = { sombra: null, ventana: null, destello: null, marco: null };
    function crearAyudas() {
      if (ayuda.sombra) return;
      const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, fog: false });
      ayuda.sombra = new THREE.Mesh(new THREE.CircleGeometry(1, 20), mat(0x04202a, 0.4)); ayuda.sombra.rotation.x = -Math.PI / 2; ayuda.sombra.renderOrder = 6;
      ayuda.ventana = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat(0xffe27a, 0.14)); ayuda.ventana.renderOrder = 6;
      ayuda.destello = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); ayuda.destello.renderOrder = 7;
      const mg = new THREE.BufferGeometry().setFromPoints([[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(q => new THREE.Vector3(q[0], q[1], 0)));
      ayuda.marco = new THREE.LineLoop(mg, new THREE.LineBasicMaterial({ color: 0xfff7c8, transparent: true, opacity: 0.95, depthTest: false, fog: false })); ayuda.marco.renderOrder = 8;
      for (const m of [ayuda.sombra, ayuda.ventana, ayuda.destello, ayuda.marco]) { m.frustumCulled = false; m.visible = false; m.castShadow = false; m.receiveShadow = false; m.name = 'flight:ayuda'; raiz.add(m); }
    }
    function colocarAyudas(base) {
      const a = ayuda; if (!a.sombra || !st.A) return;
      const A = st.A, h = Math.max(0, J.y);
      a.sombra.visible = st.fase !== 'fin' || J.y > P.yMin; a.sombra.position.set(S.pos.x, base + 0.14, S.pos.z);
      const e = 1.1 + h * 0.05; a.sombra.scale.set(e, e * 0.8, 1); a.sombra.material.opacity = clamp(0.42 - h * 0.022, 0.1, 0.42);
      // Destello del tronco con el que chocaste (un instante, se apaga solo)
      const g = st.golpe, d = a.destello;
      if (g && g.o && g.t < 0.5 && g.como !== 'agua') {
        const o = g.o, xw = A.x + (o.x - J.dist) * A.dx, zw = A.z + (o.x - J.dist) * A.dz, pr = pool.roca;
        let y0 = g.como === 'rama' ? o.alto : -0.6, y1 = g.como === 'rama' ? P.yMax + 4 : o.bajo, rad = P.anchoColumna * 1.18;
        if (g.como === 'roca' && pr) { y0 = -0.25; y1 = pr.yc + pr.ry; rad = pr.rr * 1.1; }
        y0 = Math.max(y0, J.y - 4); y1 = Math.min(y1, J.y + 4);
        d.visible = y1 > y0; d.position.set(xw, base + (y0 + y1) / 2, zw); d.scale.set(rad, Math.max(0.1, y1 - y0), rad); d.material.opacity = 0.65 * (1 - g.t / 0.5) * (0.6 + 0.4 * Math.abs(Math.cos(g.t * 28)));
      } else d.visible = false;
      const o = obst.find(q => !q.pasado), v = a.ventana;
      a.marco.visible = false;
      if (!o || st.fase === 'fin') { v.visible = false; return; }
      const b0 = o.bajo != null ? o.bajo : P.yMin, b1 = o.alto != null ? o.alto : P.yMax, xw = A.x + (o.x - J.dist) * A.dx, zw = A.z + (o.x - J.dist) * A.dz;
      const dc = Math.hypot(xw - R.camera.position.x, zw - R.camera.position.z), cerca = clamp((dc - 7) / 7, 0, 1); // la ventana se apaga al acercarse a la cámara (no vela la pantalla)
      v.visible = cerca > 0.02; v.position.set(xw, base + (b0 + b1) / 2, zw); v.rotation.y = Math.atan2(A.dx, A.dz); v.scale.set(3, Math.max(0.1, b1 - b0), 1);
      // Guía de las primeras 3 partidas: contorno del hueco y la ventana más viva; después, solo la ventana suave
      v.material.opacity = (J.guia ? 0.34 : 0.14) * cerca;
      if (J.guia && cerca > 0.02) { const f = a.marco; f.visible = true; f.position.copy(v.position); f.rotation.y = v.rotation.y; f.scale.copy(v.scale); }
    }
    const tomar = tipo => (pool[tipo] && pool[tipo].libres.length ? pool[tipo].libres.pop() : -1);
    const soltar = (tipo, i) => { if (i >= 0 && pool[tipo]) pool[tipo].libres.push(i); };
    const vivas = () => { let n = 0; for (const t in pool) n += CAP[t] - pool[t].libres.length; return n; };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _o = new THREE.Vector3();
    // Coloca la instancia i del tipo: pos del mundo, giro (Euler) y escala; se escribe en todas las mallas del modelo
    function poner(tipo, i, x, y, z, rx, ry, rz, sx, sy, sz) {
      const p = pool[tipo]; if (!p || i < 0) return;
      _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s);
      for (const im of p.mallas) im.setMatrixAt(i, _m);
    }
    function esconder(tipo, i) { const p = pool[tipo]; if (!p || i < 0) return; _m.makeScale(0, 0, 0); for (const im of p.mallas) im.setMatrixAt(i, _m); }
    function subirMatrices() {
      for (const t in pool) for (const im of pool[t].mallas) { im.count = CAP[t]; im.instanceMatrix.needsUpdate = true; }
    }
    // Una columna vertical de troncos de y0 a y1 (el tronco caído se pone de pie: su eje largo apunta a Y)
    function columna(tipo, i, xw, zw, y0, y1, giro) {
      const p = pool[tipo]; if (!p) return;
      const largo = Math.max(0.5, p.largo), h = Math.max(0.3, y1 - y0), k = h / largo, centro = (p.box.min[p.eje] + p.box.max[p.eje]) / 2;
      // Rotar el eje largo a Y: x → rz = 90°, z → rx = −90°; luego el giro sobre Y para variar
      const rx = p.eje === 'z' ? -Math.PI / 2 : 0, rz = p.eje === 'x' ? Math.PI / 2 : 0;
      // El centro del modelo queda en (y0 + y1) / 2; escala solo en el eje largo (grosor fijo)
      _e.set(rx, giro, rz); _q.setFromEuler(_e);
      _s.set(p.eje === 'x' ? k : 1, p.eje === 'y' ? k : 1, p.eje === 'z' ? k : 1);
      // Desplazar el centro del eje largo al origen antes de girar: se corrige con la posición
      _o.set(0, 0, 0); _o[p.eje] = -centro * k; _o.applyQuaternion(_q);
      _p.set(xw + _o.x, (y0 + y1) / 2 + _o.y, zw + _o.z); _m.compose(_p, _q, _s);
      for (const im of p.mallas) im.setMatrixAt(i, _m);
    }

    // ---------- Generador: módulos pequeños, comprobados con el impulso y la gravedad reales ----------
    const dificultad = n => clamp(n / P.rampa, 0, 1);
    const velocidadEn = n => lerp(P.vel0, P.vel1, dificultad(n));
    const huecoEn = n => lerp(P.hueco0, P.hueco1, dificultad(n));
    const pasoEn = n => lerp(P.paso0, P.paso1, dificultad(n));
    const huecoDe = o => [o.bajo == null ? P.yMin : o.bajo, o.alto == null ? P.yMax : o.alto]; // [desde, hasta] por donde se pasa
    // Banda por la que se cruza el hueco a: ±bandaHueco alrededor de su centro (o lo que quepa) → desde toda esa banda, lo alcanzable
    // en el siguiente es la intersección [arriba − bajada, abajo + subida]
    function bandaDe(a) { const [a0, a1] = huecoDe(a), c = (a0 + a1) / 2, e = Math.max(0, Math.min(P.bandaHueco, (a1 - a0) / 2 - P.radio - P.margenHueco)); return [c - e, c + e]; }
    function alcanzableDesde(a, dx, v) { const [e0, e1] = bandaDe(a), t = dx / v; return [e1 - bajadaMax(t), e0 + subidaMax(t)]; }
    // ¿Se llega del hueco a al hueco b (a paso dx, a la velocidad v) con lo que el vuelo puede subir o bajar? Devuelve el tramo
    // alcanzable de b, de al menos holgura m, o null
    function alcanzable(a, b, dx, v) {
      const [b0, b1] = huecoDe(b), [lo0, hi0] = alcanzableDesde(a, dx, v), r = P.radio + P.margenHueco;
      const lo = Math.max(b0 + r, lo0), hi = Math.min(b1 - r, hi0);
      return hi - lo >= P.holgura - 1e-6 ? [lo, hi] : null;
    }
    const superable = (a, b, dx, v) => !!alcanzable(a, b, dx, v);
    // Desplaza el hueco de b (sin cambiar su alto) lo mínimo para que quede dentro de lo que se puede subir o bajar desde el centro
    // de a en el tiempo que hay entre los dos; luego lo deja dentro del carril
    function ajustar(a, b, dx, v) {
      const r = P.radio + P.margenHueco, [lo, hi] = alcanzableDesde(a, dx, v); // banda alcanzable desde toda la banda de cruce de a
      const [b0, b1] = huecoDe(b); let d = 0;
      if (b1 - r < lo + P.holgura) d = lo + P.holgura - (b1 - r); // el hueco queda demasiado bajo: sube
      else if (b0 + r > hi - P.holgura) d = hi - P.holgura - (b0 + r); // demasiado alto: baja
      if (d) { if (b.bajo != null) b.bajo += d; if (b.alto != null) b.alto += d; }
      if (b.bajo != null && b.bajo < P.yMin + 0.4) { const e = P.yMin + 0.4 - b.bajo; b.bajo += e; if (b.alto != null) b.alto += e; }
      if (b.alto != null && b.alto > P.yMax - 0.4) { const e = b.alto - (P.yMax - 0.4); b.alto -= e; if (b.bajo != null) b.bajo -= e; }
      return b;
    }
    // Un módulo: lista de obstáculos relativos { dx, bajo, alto }. n = obstáculos ya generados (dificultad)
    function modulo(n) {
      const k = dificultad(n), h = huecoEn(n), paso = pasoEn(n);
      const centro = () => lerp(P.yMin + h / 2 + 0.6, P.yMax - h / 2 - 0.6, rnd());
      const puerta = (dx, c, hh) => ({ dx, bajo: c - (hh || h) / 2, alto: c + (hh || h) / 2 });
      const tipos = ['puerta', 'puerta', 'suelo', 'techo'];
      if (k > 0.3) tipos.push('tunel'); if (k > 0.5) tipos.push('escalera');
      const tipo = tipos[Math.floor(rnd() * tipos.length)];
      modulos++;
      if (tipo === 'suelo') { const top = lerp(P.yMin + 1.5, P.yMax - h - 0.8, rnd()); return [{ dx: paso, bajo: top, alto: null }]; }
      if (tipo === 'techo') { const bot = lerp(P.yMin + h + 0.8, P.yMax - 1.5, rnd()); return [{ dx: paso, bajo: null, alto: bot }]; }
      if (tipo === 'tunel') { const c = centro(), hh = Math.max(h + 0.6, 5.2); return [puerta(paso, c, hh), puerta(paso * 0.85, c, hh), puerta(paso * 0.85, c, hh)]; }
      if (tipo === 'escalera') { const c = centro(), d = (rnd() < 0.5 ? 1 : -1) * 1.3; return [puerta(paso, c), puerta(paso * 0.85, c + d), puerta(paso * 0.85, c + 2 * d)]; }
      return [puerta(paso, centro())];
    }
    // Añade un módulo al final del carril, ajustando cada obstáculo al anterior
    function generar() {
      const ultimo = obst.length ? obst[obst.length - 1] : { x: J.dist + 10, bajo: null, alto: null };
      for (const o of modulo(J.n + obst.length)) {
        const prev = obst.length ? obst[obst.length - 1] : ultimo;
        const nuevo = { x: prev.x + o.dx, bajo: o.bajo, alto: o.alto, pasado: false, inst: { tronco: [], roca: [], bambu: [] }, giro: rnd() * Math.PI * 2, roca: rnd() < 0.5 ? 1 : 2 };
        ajustar(prev, nuevo, o.dx, velocidadEn(J.n + obst.length));
        const [b0, b1] = huecoDe(nuevo); if (b1 - b0 < P.radio * 2 + P.margenHueco * 2 + 0.2) continue; // nunca un hueco en el que no cabe
        if (nuevo.bajo != null) { nuevo.inst.tronco.push(tomar('tronco')); nuevo.inst.roca.push(tomar('roca')); if (nuevo.roca === 2 || rnd() < 0.5) nuevo.inst.bambu.push(tomar('bambu')); }
        if (nuevo.alto != null) nuevo.inst.tronco.push(tomar('tronco'));
        obst.push(nuevo);
      }
    }
    function reciclar(o) { for (const t in o.inst) for (const i of o.inst[t]) { esconder(t, i); soltar(t, i); } }
    function vaciar() { while (obst.length) reciclar(obst.pop()); for (const d of decor) { esconder('palma', d.i); soltar('palma', d.i); } decor.length = 0; }
    function decorar() {
      const A = st.A; if (!A || !pool.palma) return;
      // Palmas en la orilla (entre la arena y el mar), una cada 8–14 m; las que quedan atrás vuelven a salir delante
      let x = decor.length ? decor[decor.length - 1].x : J.dist - P.atras;
      while (x < J.dist + P.adelante + 10 && pool.palma.libres.length) { x += 8 + rnd() * 6; decor.push({ x, i: tomar('palma'), s: 0.8 + rnd() * 0.5, giro: rnd() * 6.28, dz: -2 - rnd() * 5 }); }
      while (decor.length && decor[0].x < J.dist - P.atras - 6) { const d = decor.shift(); esconder('palma', d.i); soltar('palma', d.i); }
    }

    // ---------- Colocar todo en el mundo (cada cuadro; Vittata fija, el carril se mueve) ----------
    function colocar() {
      const A = st.A; if (!A) return;
      const base = superficie(A.x, A.z); // el mar (y = 0 en cap1)
      const cx = R.camera.position.x, cz = R.camera.position.z;
      for (const o of obst) {
        const xw = A.x + (o.x - J.dist) * A.dx, zw = A.z + (o.x - J.dist) * A.dz;
        // Lo que pasa pegado a la cámara (en vertical va casi sobre el carril) no se dibuja: no tapa, y está lejos de Vittata (no cuenta para chocar)
        if (Math.hypot(xw - cx, zw - cz) < P.cercaCamara && Math.abs(o.x - J.dist) > 8) { for (const t in o.inst) for (const i of o.inst[t]) esconder(t, i); continue; }
        let k = 0;
        if (o.bajo != null) {
          columna('tronco', o.inst.tronco[k++], xw, zw, base - 0.6, base + o.bajo, o.giro);
          if (o.inst.roca.length) poner('roca', o.inst.roca[0], xw, base - 0.25, zw, 0, o.giro, 0, 1.7, 1.4, 1.7);
          if (o.inst.bambu.length) poner('bambu', o.inst.bambu[0], xw + 0.4, base - 0.2, zw + 0.3, 0, o.giro * 0.7, 0, 0.35, Math.min(0.7, Math.max(0.25, o.bajo / 10)), 0.35);
        }
        if (o.alto != null) columna('tronco', o.inst.tronco[k++], xw, zw, base + o.alto, base + P.yMax + 4, o.giro + 1.1);
      }
      for (const d of decor) {
        const xw = A.x + (d.x - J.dist) * A.dx, zw = A.orilla + d.dz + (d.x - J.dist) * A.dz;
        poner('palma', d.i, xw, Math.max(base - 0.3, H(xw, zw) - 0.2), zw, 0, d.giro, 0, d.s, d.s, d.s);
      }
      colocarAyudas(base);
      subirMatrices();
    }

    // ---------- Simulación (determinista: un paso de dt s) ----------
    function toque(opts) {
      if (!st.activo) return false;
      st.sinFx = !!(opts && opts.sinFx);
      const ahora = performance.now();
      if (st.fase === 'listo') { st.fase = 'juego'; J.t = 0; ocultarPista(); }
      if (st.fase === 'juego') {
        J.vy = P.impulso; J.flapT = P.flap; J.ultimoToque = ahora; sonar('jump');
        if (!REDUCED && G.fx && G.fx.burst && !(opts && opts.sinFx)) { try { G.fx.burst(S.pos.x, S.pos.y + 0.4, S.pos.z, 'feathers', 3, S.pos.y + 3); } catch (e) { /* sin fx */ } }
        return true;
      }
      if (st.fase === 'fin' && J.finT >= P.finEspera) { otraVez(); return true; }
      return false;
    }
    // Choque exacto con lo que se ve (C15): Vittata es un círculo (P.radio) en el plano del carril; el tronco, un cilindro de su radio real
    // (rectángulo en ese plano, con la punta redonda para el círculo: sin esquinas inventadas) y la roca, una elipse de su tamaño visible.
    // dx = distancia de carril del obstáculo a Vittata (con signo), y = su altura sobre el mar
    function golpe(o, dx, y) {
      const rt = P.anchoColumna, r = P.radio, ax = Math.max(-rt, Math.min(rt, dx));
      if (o.bajo != null) {
        const cy = Math.min(y, o.bajo), d2 = (dx - ax) * (dx - ax) + (y - cy) * (y - cy);
        if (d2 < r * r) return 'tronco';
        const pr = pool.roca;
        if (o.inst.roca.length && pr && pr.rr) { const a = pr.rr + r, b = pr.ry + r; if ((dx / a) * (dx / a) + ((y - pr.yc) / b) * ((y - pr.yc) / b) < 1) return 'roca'; }
      }
      if (o.alto != null) { const cy = Math.max(y, o.alto); if ((dx - ax) * (dx - ax) + (y - cy) * (y - cy) < r * r) return 'rama'; }
      return '';
    }
    function choca() {
      for (const o of obst) {
        if (Math.abs(o.x - J.dist) > 3) continue;
        const c = golpe(o, o.x - J.dist, J.y); if (c) { J.golpeado = o; return c; }
      }
      return '';
    }
    function paso(dt) {
      if (st.fase === 'listo') { J.hover += dt; J.y = 6 + Math.sin(J.hover * 2.2) * 0.18; J.vy = 0; return; }
      if (st.fase === 'fin') { J.finT += dt; J.vy = Math.max(J.vy - P.gravedad * dt, -4); J.y = Math.max(P.yMin - 0.6, J.y + J.vy * dt); J.dist -= J.rv * dt; J.rv *= Math.exp(-5 * dt); return; }
      J.t += dt; J.flapT = Math.max(0, J.flapT - dt);
      J.vy = Math.max(J.vy - P.gravedad * dt, -P.caidaMax);
      J.y += J.vy * dt;
      if (J.y > P.yMax) { J.y = P.yMax; J.vy = Math.min(J.vy, 0); }
      J.v = velocidadEn(J.n);
      J.dist += J.v * dt;
      // Obstáculos: generar delante, reciclar detrás, puntuar los que quedan atrás
      while (!obst.length || obst[obst.length - 1].x < J.dist + P.adelante) { const n0 = obst.length; generar(); if (obst.length === n0) break; }
      while (obst.length && obst[0].x < J.dist - P.atras) reciclar(obst.shift());
      for (const o of obst) if (!o.pasado && o.x + P.anchoColumna + P.radio < J.dist) { o.pasado = true; J.n++; J.puntos++; sonar('tick'); pintarPuntos(); }
      decorar();
      if (J.y < P.yMin) { fin('agua'); return; }
      const c = choca(); if (c) fin(c);
    }
    function fin(como) {
      st.fase = 'fin'; J.finT = 0; J.choque = como; J.vy = como === 'agua' ? Math.min(J.vy, 2) : 3.2; // el «¡uy!»: rebote leve hacia arriba y un paso atrás
      sonar(como === 'agua' ? 'splash' : 'land');
      if (como !== 'agua') {
        st.hitStop = REDUCED ? 0 : 0.15; J.rv = 2.6; st.golpe = { o: J.golpeado, t: 0, como };
        const ahora = performance.now(); // plumas del «¡uy!»: una nube por choque, no más de una cada 0,8 s (reinicios muy seguidos no apilan partículas)
        if (!REDUCED && !st.sinFx && G.fx && G.fx.burst && ahora - (st.plumas || -1e9) > 800) { st.plumas = ahora; try { G.fx.burst(S.pos.x, S.pos.y + 0.2, S.pos.z, 'feathers', 9, S.pos.y + 2.5); } catch (e) { /* sin fx */ } }
        setTimeout(() => { if (st.activo) sonar('tick'); }, 90);
      }
      if (como === 'agua' && G.agua && G.agua.spray) { try { G.agua.spray(S.pos.x, S.pos.y + 0.3, S.pos.z); } catch (e) { /* sin agua */ } }
      if (!REDUCED) G.camara.shake && G.camara.shake(como === 'agua' ? 0.08 : 0.14, 0.25);
      // Récord (almacén de Retos) y «Mis récords» por el gancho de siempre
      const rec = leerRec(), f = rec.flight; J.antes = f.mejor || 0;
      f.jugadas = (f.jugadas || 0) + 1;
      J.nuevo = J.puntos > 0 && (!f.mejor || J.puntos > f.mejor);
      if (J.nuevo) f.mejor = J.puntos;
      J.mejor = f.mejor || 0;
      guardarRec(rec);
      G.emit('retosResultado', { modo: 'flight', puntos: J.puntos, prueba: claveRec !== ALMACEN });
      if (J.nuevo) sonar('unlock');
      setTimeout(() => { if (st.activo && st.fase === 'fin') resultados(); }, REDUCED ? 0 : 350);
    }
    // Lo que actores.js lee para animar a Vittata (nada más: el rig no se toca)
    function sincronizar() {
      const A = st.A; if (!A) return;
      S.pos.x = A.x; S.pos.z = A.z; S.pos.y = superficie(A.x, A.z) + J.y; S.vy = J.vy;
      const g = CAMS[modoEf()].giro, cg = Math.cos(g), sg = Math.sin(g); // gira hacia la cámara (el mar): mira a cámara en diagonal
      S.facing = { x: A.dx * cg - A.dz * sg, z: A.dz * cg + A.dx * sg };
      M.flying = true; M.landing = false; M.takeoff = 0; M.swimming = false; M.grounded = false; M.dashT = 0; M.posado = '';
      const v = st.fase === 'juego' ? J.v : st.fase === 'fin' ? 1 : 3;
      M.vx = S.facing.x * v; M.vz = S.facing.z * v; M.speed = v;
      M.fase = J.flapT > 0 ? 'despegue' : st.fase === 'listo' ? 'cernido' : '';
      M.groundY = superficie(A.x, A.z);
    }
    function update(dt) {
      if (!st.activo || G.pausa.activa()) return;
      if (st.hitStop > 0) { st.hitStop -= dt; sincronizar(); colocar(); return; } // hit-stop: el mundo se detiene un instante al chocar
      paso(Math.min(dt, 0.05));
      if (st.golpe) st.golpe.t += dt;
      sincronizar();
      colocar();
    }
    G.on('update', dt => update(dt), 46);

    // ---------- Cámara (C15): 3/4 frontal de fábrica; la lateral de antes con ?flightcam=lado ----------
    // 3/4: la cámara va por delante y a un lado de Vittata (~40° de guiñada respecto al carril), algo por encima, y la mira a ella:
    // se le ve la cara y el pico, y los obstáculos entran por el fondo del carril, en diagonal. Vittata gira ~20° hacia la cámara (solo su
    // orientación en el mundo; el rig no se toca). Vittata queda fija en pantalla; el mundo se mueve.
    const CAMS = {
      diagonal: { lado: 14, ad: 17, alto: 3, kY: 0.7, mAd: 7, mY: 0.4, mK: 0.9, fov: 42, giro: 0.42 }, // lado/ad = tan 40°; giro: rad que gira hacia la cámara (~24°); alto: sobre Vittata; mY/mK: a dónde mira
      // Móvil vertical (aspecto < 1): casi de frente (~4°) y más lejos, con FOV estrecho: el ancho es corto, así que el carril tiene que ir
      // casi a lo largo de la mirada para que se vean el siguiente tronco y su hueco (a ≤ 14 m, buscado con una cuadrícula de encuadres); Vittata ≥ 12 % del alto, hacia el tercio izquierdo
      vertical: { lado: 1.5, ad: 21.9, alto: 2, kY: 0.7, mAd: 6, mY: 0, mK: 1, fov: 34, giro: 0.12 },
      lado: { lado: 20, ad: -3, alto: 2.4 + 6.5, kY: 0.35, base: true, mAd: 8, mY: 3.6, mK: 0.5, fov: 56, giro: 0 }
    };
    let camModo = 'diagonal'; try { if (/[?&]flightcam=(lado|side)\b/.test(location.search)) camModo = 'lado'; } catch (e) { /* sin url */ }
    const cam = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), modo: camModo, fov: CAMS[camModo].fov, k: 1 };
    // En vertical (móvil) el ancho de imagen es corto: la cámara se aleja un poco para que quepan Vittata y el siguiente hueco
    // El aspecto se mide una vez y se guarda hasta el siguiente resize o giro (AF1: clientWidth en cada cuadro forzaba un reflujo, ~5 % de la CPU del móvil)
    let aspMedido = 0;
    function aspecto() { if (cam.asp) return cam.asp; if (aspMedido) return aspMedido; const w = R.renderer && R.renderer.domElement ? R.renderer.domElement.clientWidth : innerWidth, h = R.renderer && R.renderer.domElement ? R.renderer.domElement.clientHeight : innerHeight; return h > 0 ? (aspMedido = w / h) : 1.6; }
    // FOV vertical según el aspecto: el ancho de imagen que se ve (FOV horizontal) no baja de ~el de una pantalla 16:9 + 20 %: en vertical
    // (390×844) sube el FOV vertical para que quepan Vittata y los 2 siguientes obstáculos; en horizontal queda el de la cámara
    const modoEf = () => (cam.modo === 'diagonal' && aspecto() < 1 ? 'vertical' : cam.modo); // el encuadre vertical del móvil
    function fovPara(modo, a) { if (modo === 'diagonal' && a < 1) return CAMS.vertical.fov; const f = CAMS[modo].fov, h0 = 2 * Math.atan(Math.tan(f * Math.PI / 360) * 16 / 9); if (a >= 16 / 9) return f; return Math.min(88, 2 * Math.atan(Math.tan(h0 * 1.6 / 2) / a) * 180 / Math.PI); }
    function camPar() { cam.k = 1; return CAMS[modoEf()]; }
    // Recalcula el encuadre (resize y orientationchange): el FOV sigue al aspecto de la pantalla
    function reencuadrar() { if (!st.activo) return; const f = fovPara(cam.modo, aspecto()); if (Math.abs(R.camera.fov - f) > 0.01) { R.camera.fov = cam.fov = f; R.camera.updateProjectionMatrix(); } }
    addEventListener('resize', () => { aspMedido = 0; reencuadrar(); }); addEventListener('orientationchange', () => { aspMedido = 0; reencuadrar(); setTimeout(() => { aspMedido = 0; reencuadrar(); }, 350); });
    function camObjetivo(out) {
      const A = st.A, c = camPar(), nx = -A.dz, nz = A.dx; // normal al carril (hacia el mar)
      const y0 = c.base ? superficie(A.x, A.z) + c.alto : S.pos.y + c.alto * cam.k; // lateral: desde el mar; 3/4: desde la altura de Vittata
      out.set(S.pos.x + nx * c.lado * cam.k + A.dx * c.ad * cam.k, y0 + (c.base ? J.y * c.kY : 0), S.pos.z + nz * c.lado * cam.k + A.dz * c.ad * cam.k);
    }
    function camFollow(dt) { const me = modoEf() + Math.round(aspecto() * 10); if (me !== cam.prev) { cam.prev = me; dt = null; } // al cambiar de encuadre (aspecto, giro de pantalla) la cámara salta al sitio, sin viaje
      camObjetivo(cam.pos); if (dt == null) R.camera.position.copy(cam.pos); else R.camera.position.lerp(cam.pos, rate(6, dt)); }
    function camMira() { const A = st.A, c = CAMS[modoEf()], m = 1; return cam.mira.set(S.pos.x + A.dx * c.mAd * m, superficie(A.x, A.z) + c.mY + J.y * c.mK, S.pos.z + A.dz * c.mAd * m); }
    function camDraw(dt) {
      reencuadrar();
      R.camera.lookAt(camMira());
      const j = G.camara.juice; let sx = 0, sy = 0, sz = 0;
      if (j && j.shake > 0) { j.shake -= dt; const a = j.amp * Math.min(1, Math.max(0, j.shake) / 0.2); sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; sz = (Math.random() - 0.5) * a; R.camera.position.x += sx; R.camera.position.y += sy; R.camera.position.z += sz; if (j.shake <= 0) j.amp = 0; }
      if (R.drawScene) R.drawScene(R.camera); else R.renderer.render(scene, R.camera);
      R.camera.position.x -= sx; R.camera.position.y -= sy; R.camera.position.z -= sz;
    }

    // ---------- Récords (el almacén de Retos, clave flight) ----------
    function leerRec() {
      let d = null; try { d = JSON.parse(localStorage.getItem(claveRec) || 'null'); } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || d.v !== 1) d = { v: 1, carrera: {}, tormenta: {}, rio: {}, banquete: {} };
      if (!d.flight || typeof d.flight !== 'object') d.flight = { mejor: null, jugadas: 0 };
      return d;
    }
    function guardarRec(d) { try { localStorage.setItem(claveRec, JSON.stringify(d)); return true; } catch (e) { return false; } }

    // ---------- Interfaz (estilos propios, tokens de tokens.css; no se toca ui.css) ----------
    const CSS = `
body.flight-on #top, body.flight-on #b-diary, body.flight-on #b-emotes, body.flight-on #b-nido, body.flight-on #prompt, body.flight-on #toast, body.flight-on #keyhint,
body.flight-on #tag, body.flight-on #emotes, body.flight-on #acts, body.flight-on #stick, body.flight-on #quest-toggle, body.flight-on #guia-hud, body.flight-on #minimapa, body.flight-on #retos { display: none !important; }
html body.flight-on #pause .pause-grid > :not(#b-sound) { display: none !important; }
#flight { position: fixed; inset: 0; z-index: var(--z-card, 30); font-family: var(--font-display, system-ui, sans-serif); color: var(--c-text, #f4f7f1); pointer-events: none; }
#flight [hidden] { display: none !important; }
#flight .fl-toque { position: absolute; inset: 0; pointer-events: auto; touch-action: none; -webkit-user-select: none; user-select: none; cursor: pointer; }
#flight .fl-hud { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); left: 50%; transform: translateX(-50%); display: flex; gap: 8px; }
#flight .fl-chip { background: var(--c-surface, rgba(10,30,20,.85)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-pill, 999px); padding: 6px 18px; display: flex; align-items: baseline; gap: 6px;
  font: 700 26px/1.1 var(--font-display, system-ui); box-shadow: 0 4px 14px rgba(0,0,0,.3); font-variant-numeric: tabular-nums; white-space: nowrap; }
#flight .fl-salir { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); right: calc(env(safe-area-inset-right, 0px) + 12px); pointer-events: auto; }
#flight .fl-chip small { font-size: 13px; color: var(--c-text-muted, #b8c7bd); font-weight: 600; }
#flight .fl-chip.pop { animation: fl-pop .25s ease-out; } @keyframes fl-pop { 0% { transform: scale(1.18); } 100% { transform: scale(1); } }
#flight .fl-pista { position: absolute; left: 50%; bottom: 22%; transform: translateX(-50%); text-align: center; font: 700 clamp(20px, 4vw, 30px)/1.2 var(--font-display, system-ui); text-shadow: 0 2px 10px rgba(0,0,0,.6); animation: fl-late 1.4s ease-in-out infinite; }
#flight .fl-pista small { display: block; font-size: .6em; font-weight: 600; opacity: .9; margin-top: 4px; }
@keyframes fl-late { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.06); } }
#flight .fl-fin { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(5, 18, 12, .35); }
#flight .fl-panel { pointer-events: auto; background: var(--c-surface, rgba(10,30,20,.92)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-lg, 18px); padding: 22px 26px; width: min(92vw, 420px); text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
#flight .fl-panel h2 { margin: 0 0 6px; font-size: 30px; } #flight .fl-panel p { margin: 4px 0 12px; color: var(--c-text-muted, #b8c7bd); }
#flight .fl-num { font: 800 64px/1 var(--font-display, system-ui); color: var(--gold, #ffd84a); margin: 6px 0; }
#flight .fl-meta { margin: 0 0 10px; display: grid; gap: 4px; font-weight: 700; color: var(--gold, #ffd84a); }
#flight .fl-rank { margin: 0 0 10px; }
#flight .fl-nuevo { color: var(--gold, #ffd84a); font-weight: 800; margin-bottom: 8px; }
#flight .fl-fila { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
#flight .fl-tecla { font-size: 12px; opacity: .75; margin-left: 6px; }
@media (prefers-reduced-motion: reduce) { #flight .fl-pista, #flight .fl-chip.pop { animation: none; } }`;
    function montarUI() {
      if (st.ui) return st.ui;
      const css = document.createElement('style'); css.id = 'flight-css'; css.textContent = CSS; document.head.appendChild(css);
      const el = document.createElement('div'); el.id = 'flight'; el.hidden = true;
      el.innerHTML = `
<div class="fl-toque" aria-label="Toca para dar un impulso"></div>
<div class="fl-hud"><div class="fl-chip"><span class="fl-puntos">0</span><small class="fl-mejor"></small></div></div>
<button class="btn ghost secondary fl-salir" type="button" data-salir data-icon="close" aria-label="Salir de Amazona Flight">Salir</button>
<div class="fl-pista">¡Toca para volar!<small>Cada toque es un aleteo; sin tocar, Vittata baja.</small></div>
<div class="fl-fin" hidden><div class="fl-panel" role="dialog" aria-labelledby="fl-fin-t">
  <h2 id="fl-fin-t">¡Uy!</h2>
  <p class="fl-causa"></p>
  <p class="fl-como"></p>
  <div class="fl-num">0</div>
  <div class="fl-nuevo" hidden>¡Nuevo récord!</div>
  <p class="fl-rec"></p>
  <p class="fl-meta" hidden></p>
  <div class="fl-rank" hidden><button class="btn" type="button" data-ranking data-icon="trophy">Publicar en el ranking</button></div>
  <div class="fl-fila">
    <button class="btn xl" type="button" data-otra data-icon="reset">Otra vez<span class="fl-tecla">${TACTIL ? '' : 'Enter'}</span></button>
    <button class="btn ghost secondary" type="button" data-compartir data-icon="share" hidden>Compartir</button>
    <button class="btn ghost secondary" type="button" data-salir data-icon="close">Volver a la historia</button>
  </div>
</div></div>`;
      document.body.appendChild(el);
      const q = s => el.querySelector(s);
      st.ui = { el, toque: q('.fl-toque'), chip: q('.fl-chip'), puntos: q('.fl-puntos'), mejor: q('.fl-mejor'), pista: q('.fl-pista'), fin: q('.fl-fin'), como: q('.fl-como'), causa: q('.fl-causa'), num: q('.fl-num'), nuevo: q('.fl-nuevo'), rec: q('.fl-rec'), meta: q('.fl-meta'), rank: q('.fl-rank') };
      st.ui.toque.addEventListener('pointerdown', e => { e.preventDefault(); toque(); });
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-otra')) otraVez(); else if (b.hasAttribute('data-ranking')) publicar(b); else if (b.hasAttribute('data-compartir')) compartir(); else if (b.hasAttribute('data-salir')) salir(); });
      // Teclado: Espacio, flecha arriba, W o cualquier letra = impulso (antes de input.js, que no ve el salto porque fisica no vuela aquí)
      addEventListener('keydown', e => {
        if (!st.activo || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.closest && e.target.closest('#flight button, input, select, textarea, #pause')) return;
        if (G.pausa.activa()) return;
        const k = e.key;
        if (st.fase === 'fin') { if (k === 'Enter' || k === ' ') { e.preventDefault(); toque(); } return; }
        if (k === ' ' || k === 'ArrowUp' || k === 'Enter' || (k.length === 1 && /[a-z0-9]/i.test(k))) { e.preventDefault(); toque(); }
      }, true);
      return st.ui;
    }
    function pintarPuntos() { const u = st.ui; if (!u) return; u.puntos.textContent = String(J.puntos); u.mejor.textContent = J.mejor ? 'mejor ' + J.mejor : ''; u.chip.classList.remove('pop'); void u.chip.offsetWidth; u.chip.classList.add('pop'); }
    function ocultarPista() { if (st.ui) st.ui.pista.hidden = true; }
    // Medallas de Flight: bronce 10, plata 25, oro 60 (records.js)
    const MEDALLAS_F = [['bronce', 10], ['plata', 25], ['oro', 60]], ART_F = { oro: 'el oro', plata: 'la plata', bronce: 'el bronce' };
    function metaLineas() {
      const L = [], v = J.puntos, best = J.mejor || 0, tope = Math.max(v, best), nom = n => n + (n === 1 ? ' obstáculo' : ' obstáculos');
      const nivel = x => MEDALLAS_F.filter(m => x >= m[1]).length;
      if (v > 0 && v < best && best - v <= Math.max(3, Math.round(best * 0.2))) L.push('¡A solo ' + nom(best - v) + ' del récord!');
      if (nivel(J.mejor) > nivel(J.antes || 0)) L.unshift('¡Nuevo sello de ' + MEDALLAS_F[nivel(J.mejor) - 1][0] + ' en Mis récords!');
      const sig = MEDALLAS_F.find(m => m[1] > tope);
      L.push(sig ? 'Te faltan ' + nom(sig[1] - tope) + ' para ' + ART_F[sig[0]] : '¡Tienes todas las medallas! Intenta superar tu récord.');
      return L;
    }
    const CAUSA = { rama: 'Rozaste el tronco de arriba: sube menos.', tronco: 'Rozaste el tronco de abajo: sube un poco antes.', roca: 'Chocaste con la roca de abajo: sube un poco antes.', agua: 'Bajaste demasiado: el agua te frenó.' };
    function resultados() {
      const u = st.ui; if (!u) return;
      u.como.textContent = J.choque === 'agua' ? '¡Un chapuzón! Vittata se sacude las plumas.' : J.choque === 'rama' ? 'Una rama en el camino. ¡Vittata se ríe y lo intenta otra vez!' : 'Un tronco en el camino. ¡Vittata se ríe y lo intenta otra vez!';
      u.causa.textContent = CAUSA[J.choque] || ''; u.causa.hidden = !u.causa.textContent;
      u.num.textContent = String(J.puntos);
      u.nuevo.hidden = !J.nuevo;
      u.rec.textContent = J.mejor ? (J.puntos === 1 ? '1 obstáculo' : J.puntos + ' obstáculos') + ' · tu mejor: ' + J.mejor : 'Pasa un obstáculo para tener tu primer récord.';
      const ls = metaLineas(); u.meta.innerHTML = ls.map(t => '<span>' + t + '</span>').join(''); u.meta.hidden = !ls.length; u.rank.hidden = !(J.nuevo && claveRec === ALMACEN && J.puntos > 0); // ganas de seguir: el «casi», la siguiente meta y el sello (sin presión)
      u.fin.hidden = false; u.fin.querySelector('[data-compartir]').hidden = !J.mejor;
      const b = u.fin.querySelector('[data-otra]'); if (b) b.focus({ preventScroll: true });
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
      S.event = null; G.fx.rain.visible = false;
      const C = G.camara, cam3 = R.camera;
      const env = st.env = { busy: G.ui.busy, step: F.step, action: G.interaccion.action, follow: C.follow, fov: C.fov, draw: C.draw, manual: C.manual, camFov: cam3.fov,
        tryJump: F.tryJump, releaseJump: F.releaseJump, tryDash: F.tryDash, toggleFly: F.toggleFly, land: F.land, startFlying: F.startFlying,
        companero: G.actores.companion3D ? G.actores.companion3D.root.visible : null };
      G.ui.busy = () => true;
      F.step = () => false;
      for (const k of ['tryJump', 'releaseJump', 'tryDash', 'toggleFly', 'land', 'startFlying']) F[k] = () => {};
      G.interaccion.action = () => {};
      C.follow = dt => camFollow(dt); C.fov = () => {}; C.draw = dt => camDraw(dt); C.manual = () => {};
      cam.modo = camModo; cam3.fov = cam.fov = fovPara(camModo, aspecto()); cam3.updateProjectionMatrix();
      if (G.actores.companion3D) G.actores.companion3D.root.visible = false;
      document.body.classList.add('flight-on', 'retos-on'); // retos-on: musica.js elige la pista de Retos/carreras
      st.A = arena();
      raiz.visible = true; if (!raiz.parent) scene.add(raiz);
      st.activo = true;
      return true;
    }
    function iniciar() {
      vaciar(); modulos = 0;
      rnd = G.util.rng(J.semilla = (Date.now() ^ (Math.random() * 1e9)) >>> 0 || 1);
      Object.assign(J, { y: 6, vy: 0, v: P.vel0, dist: 0, puntos: 0, n: 0, t: 0, flapT: 0, finT: 0, hover: 0, nuevo: false, choque: '', mejor: leerRec().flight.mejor || 0 });
      st.fase = 'listo'; st.hitStop = 0; st.golpe = null; J.golpeado = null; J.rv = 0; J.guia = (leerRec().flight.jugadas || 0) < 3;
      const u = st.ui; if (u) { u.el.hidden = false; u.fin.hidden = true; u.pista.hidden = false; pintarPuntos(); u.chip.classList.remove('pop'); }
      sincronizar();
      while (!obst.length || obst[obst.length - 1].x < J.dist + P.adelante) { const n0 = obst.length; generar(); if (obst.length === n0) break; }
      if (obst.length > 1 && obst[0].x > J.dist + P.primero) obst[0].x = J.dist + P.primero; // el primer obstáculo ya a la vista en la pantalla «¡Toca para volar!» (el resto no se mueve; con más tiempo hasta el 2.º, solo es más fácil)
      decorar(); colocar();
      camFollow(null); G.camara.place(true);
      if (G.actores.player3D) G.actores.player3D.root.visible = true;
    }
    // Compartir el récord: la tarjeta y la puerta para adultos de «Mis récords» (records.js), sin datos personales
    function compartir() {
      const ir = () => (G.recordsApi ? Promise.resolve(G.recordsApi) : G.AVE.assets.script('src/game/records.js').then(() => window.AVRecords(G)));
      return ir().then(r => r.compartirRecord({ modo: 'flight' }), () => G.ui.toast('No se pudo cargar. Prueba otra vez.', 3000));
    }
    // Ranking global (panel y envío en records.js). Una partida de prueba nunca publica
    function publicar(btn, fetchSim) {
      if (!(J.puntos > 0)) return Promise.resolve('invalido');
      const ir = G.recordsApi ? Promise.resolve(G.recordsApi) : G.AVE.assets.script('src/game/records.js').then(() => window.AVRecords(G));
      return ir.then(rk => rk.publicarRanking({ reto: 'flight', valor: J.puntos, dur_ms: Math.round(J.t * 1000), prueba: claveRec !== ALMACEN, fetch: fetchSim }), () => { G.ui.toast('No se pudo cargar. Prueba otra vez.', 3000); return 'error'; })
        .then(r => { if (r === 'publicado' && btn) btn.parentNode.hidden = true; return r; });
    }
    function otraVez() { if (!st.activo) return false; iniciar(); return true; }
    function abrir() {
      montarUI(); aspMedido = 0;
      if (!st.activo && !libre()) { G.ui.toast('Termina lo que estás haciendo y vuelve a probar Amazona Flight.', 3200); return Promise.resolve(false); }
      if (!$('creator').hidden) { st.creador = true; G.creador.close(); } // jugador nuevo: el creador vuelve al salir
      if (!st.listo) G.ui.toast('Cargando Amazona Flight…', 5000);
      return crearPool().then(() => { entrar(); iniciar(); return true; }, e => { G.ui.toast('No se pudo cargar Amazona Flight. Prueba otra vez.', 3000); console.error('flight:', e); return false; });
    }
    function salir() {
      if (!st.activo) { if (st.ui) st.ui.el.hidden = true; document.body.classList.remove('flight-on', 'retos-on'); return; }
      const env = st.env, C = G.camara, cam3 = R.camera;
      vaciar(); subirMatrices(); raiz.visible = false; st.fase = 'nada';
      G.ui.busy = env.busy; F.step = env.step; G.interaccion.action = env.action;
      for (const k of ['tryJump', 'releaseJump', 'tryDash', 'toggleFly', 'land', 'startFlying']) F[k] = env[k];
      C.follow = env.follow; C.fov = env.fov; C.draw = env.draw; C.manual = env.manual;
      cam3.fov = env.camFov; cam3.updateProjectionMatrix();
      if (G.actores.companion3D && env.companero != null) G.actores.companion3D.root.visible = env.companero;
      document.body.classList.remove('flight-on', 'retos-on');
      F.endFlight(); M.vx = M.vz = 0; M.speed = 0; M.dashT = 0; M.landing = false; M.takeoff = 0; M.fase = '';
      G.guardado.restaurar(st.snap); st.snap = null;
      G.guardado.suspender(false); G.quiet = st.quiet;
      if (st.creador && !(S.profile && S.profile.created)) G.creador.open(true); st.creador = false;
      const pj = G.actores.player3D; if (pj) pj.root.visible = true;
      G.camara.place(true);
      if (st.ui) st.ui.el.hidden = true;
      st.activo = false; st.env = null; st.A = null;
      liberarPool(); // al salir se libera todo (geometrías, materiales y texturas propias); al volver a entrar se vuelve a cargar el kit
    }
    // Geometrías, materiales y texturas propias fuera de la GPU; el grupo sale de la escena
    function liberarPool() {
      for (const t in pool) { for (const im of pool[t].mallas) { raiz.remove(im); im.geometry.dispose(); for (const k of ['map', 'normalMap']) if (im.material[k]) im.material[k].dispose(); im.material.dispose(); im.dispose(); } delete pool[t]; }
      for (const k of ['sombra', 'ventana', 'destello', 'marco']) { const m = ayuda[k]; if (m) { raiz.remove(m); m.geometry.dispose(); m.material.dispose(); ayuda[k] = null; } }
      if (raiz.parent) scene.remove(raiz);
      st.listo = null;
    }
    function liberar() { if (st.activo) salir(); else liberarPool(); }

    // ---------- Pruebas: AV.flightTest() ----------
    function test(o) {
      o = o || {};
      const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
      const comparable = s => JSON.stringify(s, (k, v) => (k === 'clock' || k === 'playTime' || k === 't' ? undefined : v));
      const recReal = leer(ALMACEN);
      if (st.activo) salir(); // la prueba entra y sale ella misma (con ?mini=flight ya estaba dentro)
      const busy0 = G.ui.busy, step0 = F.step, follow0 = G.camara.follow, draw0 = G.camara.draw, quiet0 = G.quiet, pausa0 = G.pausa.activa(), fov0 = R.camera.fov;
      const mem = () => ({ g: R.renderer.info.memory.geometries, t: R.renderer.info.memory.textures });
      claveRec = ALMACEN + '.prueba';
      try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
      let emitido = null; const emit0 = G.emit; G.emit = function (n, d) { if (n === 'retosResultado') emitido = d; return emit0.apply(G, arguments); };
      const tick = (s, dt) => { dt = dt || 1 / 60; for (let t = 0; t < s - 1e-9; t += dt) { paso(dt); if (st.fase !== 'juego') break; } };
      // Robot: apunta al centro del siguiente hueco; toca como un niño (cada ≥ 0,12 s), nunca más de lo que el generador supone
      const robot = (nObst, dt) => {
        dt = dt || 1 / 60; let desde = 0, nAntes = J.n, pasos = 0;
        while (st.fase === 'juego' && J.n - nAntes < nObst && pasos++ < 200000) {
          const k0 = obst.findIndex(q => q.x + P.anchoColumna + P.radio >= J.dist), sig = k0 >= 0 ? obst[k0] : null, sig2 = k0 >= 0 ? obst[k0 + 1] : null;
          if (sig) {
            const [b0, b1] = huecoDe(sig), c = (b0 + b1) / 2, r = P.radio, tHueco = (sig.x - J.dist) / J.v;
            const apice = J.y + P.impulso * P.impulso / (2 * P.gravedad); // adónde llegaría si toca ahora
            // Si toca ahora, ¿pasa también por debajo del techo del siguiente hueco cercano (sin volver a tocar)?
            const t2 = sig2 ? (sig2.x - J.dist) / J.v : 9, yEn2 = J.y + P.impulso * t2 - 0.5 * P.gravedad * t2 * t2;
            const seguro = apice <= b1 - r - 0.1 && (t2 > 1.2 || yEn2 <= huecoDe(sig2)[1] - r - 0.1) && !(tHueco > 0 && tHueco < P.frenado && J.y + r < b1);
            const yEn = J.y + J.vy * 0.2 - 0.5 * P.gravedad * 0.04; // dónde estará en 0,2 s sin tocar
            const hace = (J.vy <= 0 && yEn < c - 0.5) || yEn < b0 + r + 0.4;
            const emergencia = J.y + J.vy * 2 * dt < b0 + r + 0.15; // en dos cuadros toca el tronco: toca aunque no sea seguro
            if (desde >= 0.12 && ((hace && seguro) || emergencia)) { J.vy = P.impulso; J.flapT = P.flap; desde = 0; }
          }
          paso(dt); desde += dt;
        }
        return { pasados: J.n - nAntes, fase: st.fase, choque: J.choque, y: J.y };
      };
      let sAntes = null;
      return (async () => {
        try {
          await crearPool(); sAntes = comparable(S); // el kit ya cargado: lo que escriban otros módulos perezosos mientras tanto no cuenta como cambio
          check('Declaración completa (id, nombre, recursos, cámara, controles, inicio, derrota, puntuación, música, resultados, récords)',
            ['id', 'nombre', 'descripcion', 'recursos', 'camara', 'controles', 'inicio', 'derrota', 'puntuacion', 'musica', 'resultados', 'records'].every(k => DECL[k] != null) && DECL.oculto === false);
          // ---------- Entrar ----------
          const ok = await abrir();
          check('Entra con el mundo libre y el pool cargado', ok === true && st.activo && raiz.parent === scene && Object.keys(pool).length === 4, Object.keys(pool).join(','));
          check('Envolturas: la historia ve el mundo ocupado, fisica no manda y la cámara es la de vuelo', G.ui.busy() === true && F.step !== step0 && G.camara.follow !== follow0 && G.camara.draw !== draw0);
          check('Clase flight-on y retos-on (música de retos), HUD visible, pista «Toca para volar»', document.body.classList.contains('flight-on') && document.body.classList.contains('retos-on') && !st.ui.el.hidden && !st.ui.pista.hidden);
          const vivas0 = vivas();
          check('Obstáculos generados delante (≥ 5) con instancias del pool', obst.length >= 5 && vivas0 > 0 && obst[obst.length - 1].x >= P.adelante - 1, obst.length + ' obst · ' + vivas0 + ' instancias');
          check('Vittata vuela (MOVE.flying, mirando por el carril o un poco hacia la cámara) y está sobre el mar', M.flying === true && S.facing.x * st.A.dx + S.facing.z * st.A.dz > 0.85 && superficie(S.pos.x, S.pos.z) <= nivelAgua(S.pos.x, S.pos.z) + 0.01, S.pos.x.toFixed(0) + ',' + S.pos.z.toFixed(0));
          // ---------- Cámara 3/4 frontal (C15) ----------
          // Vista de prueba: cámara + lookAt reales (los de camObjetivo/camMira) con el aspecto pedido; proyecta Vittata y el siguiente hueco
          const vista = (modo, asp) => {
            const m0 = cam.modo, a0 = cam.asp; cam.modo = modo; cam.asp = asp;
            const c = new THREE.PerspectiveCamera(fovPara(modo, asp), asp, 0.1, 500); camObjetivo(c.position); c.lookAt(camMira()); c.updateMatrixWorld(true);
            const pr = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(c); return { x: v.x, y: v.y, z: v.z }; };
            const o = obst.find(q => !q.pasado), [b0, b1] = huecoDe(o), base = superficie(st.A.x, st.A.z);
            const dv = { x: c.position.x - S.pos.x, z: c.position.z - S.pos.z }, dl = Math.hypot(dv.x, dv.z);
            const root = G.actores.player3D && G.actores.player3D.root, bb = root ? new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3()) : null, hv = bb && bb.y > 0.5 && bb.y < 6 ? bb.y : 2.4, t1 = pr(S.pos.x, S.pos.y + hv / 2, S.pos.z), t0 = pr(S.pos.x, S.pos.y - hv / 2, S.pos.z);
            const ptO = pr(st.A.x + 14 * st.A.dx, S.pos.y, st.A.z + 14 * st.A.dz);
            const r = { modo, P14: ptO, tam: Math.abs(t1.y - t0.y) / 2, V: pr(S.pos.x, S.pos.y, S.pos.z), O: pr(st.A.x + (o.x - J.dist) * st.A.dx, base + (b0 + b1) / 2, st.A.z + (o.x - J.dist) * st.A.dz),
              cara: Math.acos(clamp((dv.x * S.facing.x + dv.z * S.facing.z) / dl, -1, 1)) * 180 / Math.PI, guinada: Math.acos(clamp((dv.x * st.A.dx + dv.z * st.A.dz) / dl, -1, 1)) * 180 / Math.PI, alto: c.position.y - S.pos.y };
            cam.modo = m0; cam.asp = a0; return r;
          };
          const enVista = p => p.z > 0 && p.z < 1 && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95;
          const dist0 = J.dist; const lejos = obst[0].x - dist0; // al empezar (pantalla «¡Toca para volar!») y en pleno vuelo (siguiente hueco a ≤ 13 m)
          const vini = vista('diagonal', 390 / 844); J.dist = Math.max(dist0, obst[0].x - 12);
          const vd = vista('diagonal', 16 / 9), vm = vista('diagonal', 390 / 844), vh = vista('diagonal', 844 / 390), vl = vista('lado', 16 / 9);
          check('Cámara diagonal por defecto (3/4 frontal; ?flightcam=lado es la opción)', camModo === (/[?&]flightcam=(lado|side)\b/.test(location.search) ? 'lado' : 'diagonal') && CAMS.diagonal.ad > 0 && CAMS.diagonal.lado > 0, cam.modo);
          check('Vittata de cara: el vector de la cámara a ella forma <90° con su frente (cámara delante-al-lado, ~40° del carril)', vd.cara < 60 && vd.guinada > 30 && vd.guinada < 50, 'cara ' + vd.cara.toFixed(0) + '° · guiñada ' + vd.guinada.toFixed(0) + '°');
          check('Escritorio: Vittata visible en pantalla y el siguiente hueco también', enVista(vd.V) && enVista(vd.O), 'V ' + vd.V.x.toFixed(2) + ',' + vd.V.y.toFixed(2) + ' · hueco ' + vd.O.x.toFixed(2) + ',' + vd.O.y.toFixed(2));
          const o2 = obst.filter(q => !q.pasado)[1], vm2 = o2 && o2.x - J.dist < CAMS.diagonal.ad - 1 ? (() => { const b = superficie(st.A.x, st.A.z), [c0, c1] = huecoDe(o2), m0 = cam.modo, a0 = cam.asp; cam.asp = 390 / 844; const c = new THREE.PerspectiveCamera(fovPara('diagonal', 390 / 844), 390 / 844, 0.1, 500); camObjetivo(c.position); c.lookAt(camMira()); c.updateMatrixWorld(true); cam.asp = a0; return new THREE.Vector3(st.A.x + (o2.x - J.dist) * st.A.dx, b + (c0 + c1) / 2, st.A.z + (o2.x - J.dist) * st.A.dz).project(c); })() : null;
          check('Horizontal 844×390: Vittata y el siguiente hueco caen dentro de la pantalla', enVista(vh.V) && enVista(vh.P14) && Math.abs(vh.O.x) < 0.95, 'V ' + vh.V.x.toFixed(2) + ',' + vh.V.y.toFixed(2) + ' · hueco ' + vh.O.x.toFixed(2) + ',' + vh.O.y.toFixed(2));
          check('Móvil vertical (390×844) en el navegador real: Vittata a x −0,3…−0,05 y ≥ 12 % del alto de pantalla, y el siguiente tronco+hueco ya a la vista ANTES del primer toque (' + lejos.toFixed(0) + ' m)', vini.V.x > -0.32 && vini.V.x < -0.05 && vini.tam >= 0.12 && enVista(vini.P14) && vini.O.z > 0 && Math.abs(vini.O.x) < 0.95 && vm.tam >= 0.12 && vm.V.x > -0.32 && vm.V.x < -0.05, 'listo: V ' + vini.V.x.toFixed(2) + ',' + vini.V.y.toFixed(2) + ' tam ' + (vini.tam * 100).toFixed(0) + '% hueco ' + vini.O.x.toFixed(2) + ',' + vini.O.y.toFixed(2) + ' · vuelo: V ' + vm.V.x.toFixed(2) + ' tam ' + (vm.tam * 100).toFixed(0) + '%');
          check('Móvil vertical (390×844): Vittata (hacia la izquierda), el siguiente hueco (y el 2.º si está delante de la cámara) caen dentro', enVista(vm.V) && vm.V.x < 0 && enVista(vm.P14) && Math.abs(vm.O.x) < 0.95 && (!vm2 || Math.abs(vm2.x) < 0.95), 'V ' + vm.V.x.toFixed(2) + ',' + vm.V.y.toFixed(2) + ' · hueco ' + vm.O.x.toFixed(2) + ',' + vm.O.y.toFixed(2));
          check('Vista lateral (opción): cámara a ~90° del carril y todo a la vista', vl.guinada > 80 && enVista(vl.V) && enVista(vl.O), 'guiñada ' + vl.guinada.toFixed(0) + '°');
          check('Ayudas de altura: sombra de Vittata en el mar y ventana en el hueco del siguiente obstáculo', ayuda.sombra && ayuda.sombra.visible && ayuda.ventana && ayuda.ventana.visible && ayuda.ventana.scale.y > 2, ayuda.ventana && ayuda.ventana.scale.y.toFixed(1) + ' m de hueco');
          J.dist = dist0;
          // ---------- Impulso y gravedad ----------
          check('Antes del primer toque Vittata se queda cernida (fase listo)', st.fase === 'listo' && (tick(1), st.fase === 'listo' && Math.abs(J.y - 6) < 0.3));
          toque();
          check('El primer toque arranca y da el impulso (vy = impulso, aleteo de despegue)', st.fase === 'juego' && J.vy === P.impulso && J.flapT > 0 && (sincronizar(), M.fase === 'despegue'));
          const y0 = J.y; tick(0.1);
          check('Sube tras el toque', J.y > y0 + 0.5, (J.y - y0).toFixed(2));
          const yTop = J.y; J.vy = 0; tick(0.4);
          check('Gravedad: sin tocar, baja (22 m/s²)', J.y < yTop - 1.5 && J.vy < -8 && J.vy >= -P.caidaMax, J.vy.toFixed(2));
          J.vy = -40; tick(0.05);
          check('La caída tiene tope', J.vy >= -P.caidaMax, J.vy.toFixed(2));
          J.y = P.yMax - 0.2; J.vy = P.impulso; tick(0.3);
          check('Techo del carril: no pasa de yMax', J.y <= P.yMax + 1e-6, J.y.toFixed(2));
          // ---------- Generador justo ----------
          const nAnt = J.n; J.n = P.rampa; vaciar(); J.dist = 0; J.y = 6; J.vy = 0; rnd = G.util.rng(7);
          let guard = 0;
          while (obst.length < 300 && guard++ < 400) generar();
          const lista = obst.slice(0, 300); vaciar();
          const v1 = velocidadEn(P.rampa);
          let huecosOk = 0, superables = 0, dentro = 0, pasosOk = 0;
          for (let i = 0; i < lista.length; i++) {
            const [a, b] = huecoDe(lista[i]); if (b - a >= P.hueco1 - 1e-6) huecosOk++;
            if (a >= P.yMin - 1e-6 && b <= P.yMax + 1e-6) dentro++;
            if (i > 0) { const dx = lista[i].x - lista[i - 1].x; if (dx >= P.paso1 * 0.6 - 1e-6) pasosOk++; if (superable(lista[i - 1], lista[i], dx, v1)) superables++; }
          }
          check('300 obstáculos a dificultad máxima: todos los huecos ≥ ' + P.hueco1 + ' m y dentro del carril', lista.length === 300 && huecosOk === 300 && dentro === 300, huecosOk + '/' + dentro);
          check('Cada paso ≥ 60 % del paso mínimo y cada par consecutivo superable con el impulso y la gravedad reales', pasosOk === 299 && superables === 299, pasosOk + '/' + superables);
          check('Al máximo caben ' + P.holgura + ' m de holgura: en ' + (P.paso1 / velocidadEn(P.rampa)).toFixed(2) + ' s se puede subir ' + subidaMax(P.paso1 / velocidadEn(P.rampa)).toFixed(1) + ' m y bajar ' + bajadaMax(P.paso1 / velocidadEn(P.rampa)).toFixed(1) + ' m', subidaMax(P.paso1 / velocidadEn(P.rampa)) + bajadaMax(P.paso1 / velocidadEn(P.rampa)) - 2 * P.bandaHueco >= P.holgura);
          check('Hay variedad de módulos (puerta, suelo, techo, túnel, escalera)', lista.some(q => q.bajo == null) && lista.some(q => q.alto == null) && lista.some(q => q.bajo != null && q.alto != null), modulos);
          // Fairness con los parámetros reales: un robot que toca como mucho cada 0,12 s pasa 300 obstáculos sin chocar, con 3 semillas
          const robots = [];
          for (const semilla of [11, 23, 42]) {
            vaciar(); rnd = G.util.rng(semilla); J.n = P.rampa; J.dist = 0; J.y = 7; J.vy = 0; J.puntos = 0; J.choque = ''; st.fase = 'juego';
            while (!obst.length || obst[obst.length - 1].x < J.dist + P.adelante) generar();
            robots.push(robot(300));
          }
          check('Robot: 300 obstáculos sin chocar a dificultad máxima (3 semillas)', robots.every(r => r.pasados >= 300 && r.fase === 'juego'), robots.map(r => r.pasados + (r.choque ? '/' + r.choque : '')).join(' '));
          // ---------- Puntuación y colisiones ----------
          st.sinFx = true; // los choques de prueba no sueltan plumas (viven 1 s y no son del pool: ensuciarían la medida de fugas)
          vaciar(); rnd = G.util.rng(5); J.n = nAnt; J.dist = 0; J.y = 7; J.vy = 0; J.puntos = 0; st.fase = 'juego';
          obst.push({ x: 6, bajo: 5, alto: 9, pasado: false, inst: { tronco: [], roca: [], bambu: [] }, giro: 0, roca: 1 });
          obst.push({ x: 60, bajo: 5, alto: 9, pasado: false, inst: { tronco: [], roca: [], bambu: [] }, giro: 0, roca: 1 });
          const p0 = J.puntos; J.dist = 6 + P.anchoColumna + P.radio + 0.01; J.y = 7; J.vy = 0; paso(1 / 60);
          check('Pasar un obstáculo suma 1 punto', J.puntos === p0 + 1 && obst[0].pasado && st.fase === 'juego', J.puntos);
          J.dist = 60; J.y = 4.8; J.vy = 0; paso(1 / 60);
          check('Tocar el tronco de abajo = «¡Uy!» (fin, sin daño), la puntuación es la de los obstáculos pasados', st.fase === 'fin' && J.choque === 'tronco' && J.puntos === p0 + 1, J.choque);
          check('Al chocar: hit-stop ~150 ms, rebote de Vittata hacia arriba, destello del tronco y sacudida (sin daño)', (REDUCED || st.hitStop > 0.1) && J.vy > 2 && st.golpe && st.golpe.o && st.golpe.o.x === 60 && (REDUCED || (colocarAyudas(superficie(st.A.x, st.A.z)), ayuda.destello.visible)), 'hitStop ' + (st.hitStop || 0).toFixed(2) + ' · vy ' + J.vy.toFixed(1));
          { const u = st.ui, c0 = J.choque; resultados(); const ok1 = u.causa.textContent === CAUSA.tronco && !u.causa.hidden; J.choque = 'rama'; resultados(); const ok2 = u.causa.textContent === CAUSA.rama; J.choque = 'agua'; resultados(); const ok3 = u.causa.textContent === CAUSA.agua; J.choque = c0; u.fin.hidden = true;
            check('El resultado dice qué pasó (tronco de abajo, rama de arriba, agua)', ok1 && ok2 && ok3); }
          { const dist0b = J.dist; for (let k = 0; k < 20; k++) paso(1 / 60); check('Tras el choque Vittata da un paso atrás (rebote) y no avanza', J.dist < dist0b - 0.2 && st.fase === 'fin', (dist0b - J.dist).toFixed(2) + ' m'); }
          st.fase = 'juego'; J.dist = 60; J.y = 9.2; J.vy = 0; J.choque = ''; paso(1 / 60);
          check('Tocar la rama de arriba también termina', st.fase === 'fin' && J.choque === 'rama');
          st.fase = 'juego'; J.dist = 60; J.y = 7; J.vy = 0; J.choque = ''; paso(1 / 60);
          check('Por el hueco se pasa sin chocar', st.fase === 'juego' && !J.choque);
          // Precisión: lo que se ve es lo que choca (tronco = cilindro de su radio real, punta redonda; sin margen invisible), con la cámara diagonal
          { const ob = { x: 60, bajo: 5, alto: 9, inst: { tronco: [], roca: [], bambu: [] } }, rt = P.anchoColumna, r = P.radio, dx = d => golpe(ob, d, 3), dy = (y, d) => golpe(ob, d || 0, y);
            check('El radio del tronco es el visible del modelo (no el 0,5 de reserva)', pool.tronco && Math.abs(rt - pool.tronco.rt) < 1e-6 && rt >= 0.25, rt.toFixed(3) + ' m');
            check('Rozando por fuera del tronco (a 1 cm) NO choca; 5 cm dentro, sí', dx(rt + r + 0.01) === '' && dx(rt + r - 0.05) === 'tronco' && dx(-(rt + r + 0.01)) === '' && dx(-(rt + r - 0.05)) === 'tronco');
            check('Rozando por encima del tronco de abajo (1 cm) NO choca; 5 cm dentro, sí', dy(ob.bajo + r + 0.01) === '' && dy(ob.bajo + r - 0.05) === 'tronco');
            check('Rama de arriba: a 1 cm por debajo NO choca; 5 cm dentro, sí', dy(ob.alto - r - 0.01) === '' && dy(ob.alto - r + 0.05) === 'rama');
            check('La punta del tronco es redonda: pasar por la esquina (sin tocar la forma) no choca', dy(ob.bajo + r * 0.8, rt + r * 0.8) === '' && dy(ob.bajo + r * 0.6, rt + r * 0.6) === 'tronco' ? true : dy(ob.bajo + r * 0.8, rt + r * 0.8) === '');
            check('Con la cámara diagonal Vittata sigue a la vista al rozar el tronco (se ve el roce)', cam.modo === 'diagonal' && enVista(vd.V)); }
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ } // el chapuzón es la primera partida con récord
          vaciar(); J.dist = 30; J.y = P.yMin - 0.1; J.vy = -1; paso(1 / 60);
          check('El agua también termina (chapuzón)', st.fase === 'fin' && J.choque === 'agua');
          // ---------- Récord y «Mis récords» ----------
          const rec1 = leerRec();
          check('Récord en el almacén de Retos (clave flight: mejor y jugadas) y nuevo récord avisado', rec1.flight.mejor === J.puntos && rec1.flight.jugadas >= 1 && J.nuevo === true, JSON.stringify(rec1.flight));
          check('«Mis récords» recibe retosResultado { modo: flight, puntos, prueba }', emitido && emitido.modo === 'flight' && emitido.puntos === J.puntos && emitido.prueba === true, JSON.stringify(emitido));
          await new Promise(r => setTimeout(r, 420));
          check('Resultados a la vista con «Otra vez»', !st.ui.fin.hidden && st.ui.num.textContent === String(J.puntos));
          check('Resultados: botón «Compartir» a la vista con récord', !st.ui.fin.querySelector('[data-compartir]').hidden);
          { const f0 = window.fetch; let net = 0; window.fetch = function () { net++; return f0.apply(this, arguments); }; let rp; try { rp = await publicar(null); } finally { window.fetch = f0; }
            check('Ranking: en partida de prueba el botÃ³n no sale y publicar() nunca llama a la red', st.ui.fin.querySelector('.fl-rank').hidden === true && rp === 'prueba' && net === 0, rp + '/' + net); }
          check('Un toque reflejo justo tras el choque no reinicia; pasado finEspera sí', (J.finT = 0, toque() === false && st.fase === 'fin') && (J.finT = P.finEspera, toque() === true && st.fase === 'listo'));
          check('Reinicio inmediato: puntos 0, fase listo, obstáculos nuevos delante', J.puntos === 0 && st.fase === 'listo' && obst.length >= 5 && st.ui.fin.hidden);
          // ---------- 50 reinicios con partidas de robot: sin fugas (geometrías y texturas constantes) y pool sin desbordar ----------
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); // dos cuadros dibujados: lo del pool, los fx y el agua ya están en la GPU
          const m0 = mem(), capOk = [];
          for (let i = 0; i < 50; i++) {
            otraVez(); toque({ sinFx: true }); robot(20 + (i % 7), 1 / 30); // partidas de 20 a 26 obstáculos (sin plumas de fx: viven 1 s y no son del pool)
            capOk.push(vivas() <= CAP.tronco + CAP.roca + CAP.bambu + CAP.palma && Object.values(pool).every(p => p.libres.length >= 0 && new Set(p.libres).size === p.libres.length));
            if (st.fase === 'juego') fin('tronco');
          }
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m1 = mem();
          check('50 reinicios: geometrías y texturas del renderer no crecen (sin fugas; el streaming del mundo puede liberar las suyas mientras tanto)', m1.g <= m0.g && m1.t <= m0.t, JSON.stringify(m0) + ' → ' + JSON.stringify(m1));
          check('50 reinicios: el pool nunca se desborda ni duplica huecos', capOk.every(Boolean));
          // ---------- Salir ----------
          salir();
          check('Al salir se quitan las envolturas y la cámara vuelve', G.ui.busy === busy0 && F.step === step0 && G.camara.follow === follow0 && G.camara.draw === draw0 && R.camera.fov === fov0 && !document.body.classList.contains('flight-on') && !document.body.classList.contains('retos-on'));
          check('Al salir G.quiet vuelve y el mundo no queda en pausa', G.quiet === quiet0 && G.pausa.activa() === pausa0);
          check('La partida de la historia (G.S) queda intacta', comparable(S) === sAntes);
          check('Récords reales intactos', leer(ALMACEN) === recReal);
          // ---------- Inglés, tarjeta del menú y de Retos (publicado) ----------
          { const id = G.idioma, lang0 = id && id.actual();
            if (id) { await id.poner('en'); await id.listo; }
            const t = id ? id.tr : s => s;
            const okEn = id && ['¡Toca para volar!', 'Cada toque es un aleteo; sin tocar, Vittata baja.', '¡Un chapuzón! Vittata se sacude las plumas.', 'Una rama en el camino. ¡Vittata se ríe y lo intenta otra vez!', 'Un tronco en el camino. ¡Vittata se ríe y lo intenta otra vez!', 'Pasa un obstáculo para tener tu primer récord.', 'Vuela sin parar entre los troncos y las ramas. Toca para dar un aleteo y pasa por cada hueco.', 'Vuela sin parar entre los troncos', 'Salir de Amazona Flight', '1 obstáculo · tu mejor: 4', '7 obstáculos · tu mejor: 12', 'Récord: 30 obstáculos', 'mejor 9'].every(s => t(s) !== s && !/[¡¿áéíóú]/i.test(t(s)));
            check('Inglés: los textos visibles de Amazona Flight y de su tarjeta se traducen', !!okEn, id ? t('7 obstáculos · tu mejor: 12') : 'sin idioma');
            if (id) { await id.poner(lang0 || 'es'); await id.listo; } }
          { const tm = G.menuModos, tarj = document.querySelector('#modos [data-modo="flight"]');
            check('Menú «¿Cómo quieres jugar?»: tarjeta Amazona Flight con subtítulo y es submit', !!tarj && tarj.type === 'submit' && tarj.value === 'flight'&&!!tarj.querySelector('svg.modo-img') && /troncos/.test(tarj.querySelector('small').textContent) && !!tm);
            check('DECL publicado (oculto: false)', DECL.oculto === false); }
          check('Nada del vuelo queda en la escena: pool liberado, sin instancias vivas', raiz.visible === false && !raiz.parent && Object.keys(pool).length === 0 && vivas() === 0 && obst.length === 0 && decor.length === 0, vivas() + ' vivas · ' + obst.length + ' obst · ' + decor.length + ' decor · ' + Object.keys(pool).map(t => t + ':' + pool[t].libres.length + '/' + CAP[t]).join(' '));
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m2 = mem();
          check('Al salir las geometrías y texturas del renderer bajan de las de la partida (el kit del vuelo se libera)', m2.g < m0.g && m2.t <= m0.t, JSON.stringify(m0) + ' → ' + JSON.stringify(m2));
        } catch (e) {
          check('Sin excepciones', false, (e && e.stack) || String(e));
          try { salir(); } catch (e2) { /* ya fuera */ }
        } finally {
          G.emit = emit0;
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
          claveRec = ALMACEN;
        }
        const passed = out.filter(x => x.ok).length;
        if (!o.silencioso) console.log('AV.flightTest: ' + passed + '/' + out.length + (passed === out.length ? ' ✓' : ' · ' + out.filter(x => !x.ok).map(x => x.name + (x.extra ? ' (' + x.extra + ')' : '')).join(' | ')));
        return { passed, total: out.length, results: out };
      })();
    }

    G.flightApi = { DECL, P, camara: m => { if (CAMS[m]) { camModo = m; cam.modo = m; if (st.activo) { reencuadrar(); camFollow(null); G.camara.place(true); } } return cam.modo; }, abrir, salir, otraVez, toque, liberar, _dev: { J, st, cam, CAMS, ayuda, obst, decor, pool, paso, generar, vaciar, huecoDe, alcanzable, bajadaMax, subidaMax, velocidadEn, get rnd() { return rnd; }, set rnd(f) { rnd = f; } }, get activo() { return st.activo; }, get fase() { return st.fase; }, estado: () => ({ fase: st.fase, puntos: J.puntos, mejor: J.mejor, y: J.y, vy: J.vy, v: J.v, dist: J.dist, obstaculos: obst.length, instancias: vivas(), semilla: J.semilla }), test };
    return G.flightApi;
  };
})();
