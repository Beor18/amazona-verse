/* Juego · Amazona Flight (prototipo C14, fase 2 de la directiva de minijuegos de Kelvin, 26-oct-2026)
   Vuelo infinito de un toque, en vista lateral un poco 3D: Vittata (la original, modelo y rig intactos) avanza sola sobre el mar
   frente a la playa; cada toque, clic, Espacio o tecla es un impulso vertical; entre toques manda la gravedad. Los obstáculos son
   instancias de piezas que YA existen en el kit de entorno (tronco_caido, roca_musgo_a/b, bambu) y la decoración de la orilla
   palma_sierra_joven: nada de modelos ni bosques nuevos. Se pasa entre las columnas; chocar es un «¡Uy!» amable (nunca daño) y se
   vuelve a empezar con un toque. Puntuación = obstáculos superados.
   OCULTO (fase 3, pruebas reales, la deciden Kelvin y Fernando): no está en el menú ni en Retos. Se entra con ?mini=flight o con
   AV.flight() desde la consola. Pruebas: AV.flightTest().

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
      camara: 'lateral, un poco 3D (fija al jugador; el mundo avanza)',
      controles: { pc: 'Espacio, flecha arriba, W o cualquier letra: impulso', movil: 'un toque en cualquier sitio: impulso', resultados: 'Enter, Espacio o un toque: otra vez' },
      inicio: 'el primer toque arranca', victoria: null, derrota: 'tocar un tronco, una rama o el agua («¡Uy!», sin daño)',
      puntuacion: 'obstáculos superados', musica: 'retos/carreras (sin reiniciar por obstáculo)',
      resultados: ['puntos', 'mejor', 'nuevoRecord'], records: { clave: 'flight', campos: ['mejor', 'jugadas'], gancho: 'retosResultado' },
      oculto: true, // fase 3 (Kelvin y Fernando): hasta entonces solo ?mini=flight y AV.flight()
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
      anchoColumna: 0.5,   // medio ancho de una columna (tronco) para chocar
      toqueMin: 0.3,       // s entre toques que el generador supone a un niño (no un robot): subida sostenida = impulso − g·toqueMin/2
      seguridad: 0.8,      // el generador solo usa esta fracción de lo que el vuelo puede subir o bajar
      margenHueco: 0.35,   // margen por encima y por debajo del cuerpo al pasar por un hueco
      holgura: 1.0,        // m de hueco que tienen que quedar dentro de lo alcanzable (no basta con rozar lo posible)
      bandaHueco: 0.6,     // al cruzar un hueco se supone al jugador a ±0,6 m de su centro (en los huecos pequeños, lo que cabe)
      frenado: 0.25,       // …y que su último toque fue al menos 0,25 s antes de cruzar (llega subiendo a ≤ 2 m/s, no en pleno aleteo)
      adelante: 90, atras: 24, // obstáculos vivos: desde 24 m detrás de Vittata hasta 90 m delante
      finEspera: 0.45,     // s tras el choque antes de aceptar «otra vez» (que un toque reflejo no reinicie sin ver el resultado)
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
    const J = { y: 6, vy: 0, v: P.vel0, dist: 0, puntos: 0, n: 0, t: 0, flapT: 0, finT: 0, hover: 0, mejor: 0, nuevo: false, choque: '', ultimoToque: -1e9, semilla: 1 };
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
        for (const pr of m.prims) {
          const im = new THREE.InstancedMesh(pr.geo, materialDe(pr.src), CAP[tipo]);
          im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
          im.name = 'flight:' + tipo;
          raiz.add(im); p.mallas.push(im);
        }
        for (let i = CAP[tipo] - 1; i >= 0; i--) p.libres.push(i);
        pool[tipo] = p;
      }))).then(() => { if (!raiz.parent) scene.add(raiz); return pool; }, e => { st.listo = null; throw e; });
      return st.listo;
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
      for (const o of obst) {
        const xw = A.x + (o.x - J.dist) * A.dx, zw = A.z + (o.x - J.dist) * A.dz;
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
      subirMatrices();
    }

    // ---------- Simulación (determinista: un paso de dt s) ----------
    function toque(opts) {
      if (!st.activo) return false;
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
    function choca() {
      // Vittata es un círculo (radio P.radio) en el plano del carril, en x = J.dist; las columnas, cajas verticales
      for (const o of obst) {
        if (Math.abs(o.x - J.dist) > P.anchoColumna + P.radio) continue;
        if (o.bajo != null && J.y - P.radio < o.bajo) return 'tronco';
        if (o.alto != null && J.y + P.radio > o.alto) return 'rama';
      }
      return '';
    }
    function paso(dt) {
      if (st.fase === 'listo') { J.hover += dt; J.y = 6 + Math.sin(J.hover * 2.2) * 0.18; J.vy = 0; return; }
      if (st.fase === 'fin') { J.finT += dt; J.vy = Math.max(J.vy - P.gravedad * dt, -4); J.y = Math.max(P.yMin - 0.6, J.y + J.vy * dt); return; }
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
      st.fase = 'fin'; J.finT = 0; J.choque = como; J.vy = Math.min(J.vy, 2);
      sonar(como === 'agua' ? 'splash' : 'land');
      if (como === 'agua' && G.agua && G.agua.spray) { try { G.agua.spray(S.pos.x, S.pos.y + 0.3, S.pos.z); } catch (e) { /* sin agua */ } }
      if (!REDUCED) G.camara.shake && G.camara.shake(0.08, 0.2);
      // Récord (almacén de Retos) y «Mis récords» por el gancho de siempre
      const rec = leerRec(), f = rec.flight;
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
      S.facing = { x: A.dx, z: A.dz };
      M.flying = true; M.landing = false; M.takeoff = 0; M.swimming = false; M.grounded = false; M.dashT = 0; M.posado = '';
      const v = st.fase === 'juego' ? J.v : st.fase === 'fin' ? 1 : 3;
      M.vx = A.dx * v; M.vz = A.dz * v; M.speed = v;
      M.fase = J.flapT > 0 ? 'despegue' : st.fase === 'listo' ? 'cernido' : '';
      M.groundY = superficie(A.x, A.z);
    }
    function update(dt) {
      if (!st.activo || G.pausa.activa()) return;
      paso(Math.min(dt, 0.05));
      sincronizar();
      colocar();
    }
    G.on('update', dt => update(dt), 46);

    // ---------- Cámara lateral (un poco 3D): a un lado del carril, algo adelantada, mirando a Vittata ----------
    const cam = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), lado: 20, atrasC: 3, alto: 2.4, adelante: 8, fov: 56 }; // Vittata queda a la izquierda del centro: se ve lo que viene
    function camObjetivo(out) {
      const A = st.A, nx = -A.dz, nz = A.dx; // normal al carril (hacia el mar)
      out.set(S.pos.x + nx * cam.lado - A.dx * cam.atrasC, superficie(A.x, A.z) + 6.5 + cam.alto + J.y * 0.35, S.pos.z + nz * cam.lado - A.dz * cam.atrasC);
    }
    function camFollow(dt) { camObjetivo(cam.pos); if (dt == null) R.camera.position.copy(cam.pos); else R.camera.position.lerp(cam.pos, rate(6, dt)); }
    function camDraw(dt) {
      const A = st.A;
      cam.mira.set(S.pos.x + A.dx * cam.adelante, superficie(A.x, A.z) + 3.6 + J.y * 0.5, S.pos.z + A.dz * cam.adelante);
      R.camera.lookAt(cam.mira);
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
  <p class="fl-como"></p>
  <div class="fl-num">0</div>
  <div class="fl-nuevo" hidden>¡Nuevo récord!</div>
  <p class="fl-rec"></p>
  <div class="fl-fila">
    <button class="btn xl" type="button" data-otra data-icon="reset">Otra vez<span class="fl-tecla">${TACTIL ? '' : 'Enter'}</span></button>
    <button class="btn ghost secondary" type="button" data-salir data-icon="close">Volver a la historia</button>
  </div>
</div></div>`;
      document.body.appendChild(el);
      const q = s => el.querySelector(s);
      st.ui = { el, toque: q('.fl-toque'), chip: q('.fl-chip'), puntos: q('.fl-puntos'), mejor: q('.fl-mejor'), pista: q('.fl-pista'), fin: q('.fl-fin'), como: q('.fl-como'), num: q('.fl-num'), nuevo: q('.fl-nuevo'), rec: q('.fl-rec') };
      st.ui.toque.addEventListener('pointerdown', e => { e.preventDefault(); toque(); });
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-otra')) otraVez(); else if (b.hasAttribute('data-salir')) salir(); });
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
    function resultados() {
      const u = st.ui; if (!u) return;
      u.como.textContent = J.choque === 'agua' ? '¡Un chapuzón! Vittata se sacude las plumas.' : J.choque === 'rama' ? 'Una rama en el camino. ¡Vittata se ríe y lo intenta otra vez!' : 'Un tronco en el camino. ¡Vittata se ríe y lo intenta otra vez!';
      u.num.textContent = String(J.puntos);
      u.nuevo.hidden = !J.nuevo;
      u.rec.textContent = J.mejor ? (J.puntos === 1 ? '1 obstáculo' : J.puntos + ' obstáculos') + ' · tu mejor: ' + J.mejor : 'Pasa un obstáculo para tener tu primer récord.';
      u.fin.hidden = false;
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
      cam3.fov = cam.fov; cam3.updateProjectionMatrix();
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
      st.fase = 'listo';
      const u = st.ui; if (u) { u.el.hidden = false; u.fin.hidden = true; u.pista.hidden = false; pintarPuntos(); u.chip.classList.remove('pop'); }
      sincronizar();
      while (!obst.length || obst[obst.length - 1].x < J.dist + P.adelante) { const n0 = obst.length; generar(); if (obst.length === n0) break; }
      decorar(); colocar();
      camFollow(null); G.camara.place(true);
      if (G.actores.player3D) G.actores.player3D.root.visible = true;
    }
    function otraVez() { if (!st.activo) return false; iniciar(); return true; }
    function abrir() {
      montarUI();
      if (!st.activo && !libre()) { G.ui.toast('Termina lo que estás haciendo y vuelve a probar Amazona Flight.', 3200); return Promise.resolve(false); }
      if (!$('creator').hidden) { st.creador = true; G.creador.close(); } // jugador nuevo: el creador vuelve al salir
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
            ['id', 'nombre', 'descripcion', 'recursos', 'camara', 'controles', 'inicio', 'derrota', 'puntuacion', 'musica', 'resultados', 'records'].every(k => DECL[k] != null) && DECL.oculto === true);
          // ---------- Entrar ----------
          const ok = await abrir();
          check('Entra con el mundo libre y el pool cargado', ok === true && st.activo && raiz.parent === scene && Object.keys(pool).length === 4, Object.keys(pool).join(','));
          check('Envolturas: la historia ve el mundo ocupado, fisica no manda y la cámara es la lateral', G.ui.busy() === true && F.step !== step0 && G.camara.follow !== follow0 && G.camara.draw !== draw0);
          check('Clase flight-on y retos-on (música de retos), HUD visible, pista «Toca para volar»', document.body.classList.contains('flight-on') && document.body.classList.contains('retos-on') && !st.ui.el.hidden && !st.ui.pista.hidden);
          const vivas0 = vivas();
          check('Obstáculos generados delante (≥ 5) con instancias del pool', obst.length >= 5 && vivas0 > 0 && obst[obst.length - 1].x >= P.adelante - 1, obst.length + ' obst · ' + vivas0 + ' instancias');
          check('Vittata vuela (MOVE.flying, mirando por el carril) y está sobre el mar', M.flying === true && S.facing.x === st.A.dx && superficie(S.pos.x, S.pos.z) <= nivelAgua(S.pos.x, S.pos.z) + 0.01, S.pos.x.toFixed(0) + ',' + S.pos.z.toFixed(0));
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
          vaciar(); rnd = G.util.rng(5); J.n = nAnt; J.dist = 0; J.y = 7; J.vy = 0; J.puntos = 0; st.fase = 'juego';
          obst.push({ x: 6, bajo: 5, alto: 9, pasado: false, inst: { tronco: [], roca: [], bambu: [] }, giro: 0, roca: 1 });
          obst.push({ x: 60, bajo: 5, alto: 9, pasado: false, inst: { tronco: [], roca: [], bambu: [] }, giro: 0, roca: 1 });
          const p0 = J.puntos; J.dist = 6 + P.anchoColumna + P.radio + 0.01; J.y = 7; J.vy = 0; paso(1 / 60);
          check('Pasar un obstáculo suma 1 punto', J.puntos === p0 + 1 && obst[0].pasado && st.fase === 'juego', J.puntos);
          J.dist = 60; J.y = 4.8; J.vy = 0; paso(1 / 60);
          check('Tocar el tronco de abajo = «¡Uy!» (fin, sin daño), la puntuación es la de los obstáculos pasados', st.fase === 'fin' && J.choque === 'tronco' && J.puntos === p0 + 1, J.choque);
          st.fase = 'juego'; J.dist = 60; J.y = 9.2; J.vy = 0; J.choque = ''; paso(1 / 60);
          check('Tocar la rama de arriba también termina', st.fase === 'fin' && J.choque === 'rama');
          st.fase = 'juego'; J.dist = 60; J.y = 7; J.vy = 0; J.choque = ''; paso(1 / 60);
          check('Por el hueco se pasa sin chocar', st.fase === 'juego' && !J.choque);
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ } // el chapuzón es la primera partida con récord
          vaciar(); J.dist = 30; J.y = P.yMin - 0.1; J.vy = -1; paso(1 / 60);
          check('El agua también termina (chapuzón)', st.fase === 'fin' && J.choque === 'agua');
          // ---------- Récord y «Mis récords» ----------
          const rec1 = leerRec();
          check('Récord en el almacén de Retos (clave flight: mejor y jugadas) y nuevo récord avisado', rec1.flight.mejor === J.puntos && rec1.flight.jugadas >= 1 && J.nuevo === true, JSON.stringify(rec1.flight));
          check('«Mis récords» recibe retosResultado { modo: flight, puntos, prueba }', emitido && emitido.modo === 'flight' && emitido.puntos === J.puntos && emitido.prueba === true, JSON.stringify(emitido));
          await new Promise(r => setTimeout(r, 420));
          check('Resultados a la vista con «Otra vez»', !st.ui.fin.hidden && st.ui.num.textContent === String(J.puntos));
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
          check('50 reinicios: geometrías y texturas del renderer constantes (sin fugas)', m1.g === m0.g && m1.t === m0.t, JSON.stringify(m0) + ' → ' + JSON.stringify(m1));
          check('50 reinicios: el pool nunca se desborda ni duplica huecos', capOk.every(Boolean));
          // ---------- Salir ----------
          salir();
          check('Al salir se quitan las envolturas y la cámara vuelve', G.ui.busy === busy0 && F.step === step0 && G.camara.follow === follow0 && G.camara.draw === draw0 && R.camera.fov === fov0 && !document.body.classList.contains('flight-on') && !document.body.classList.contains('retos-on'));
          check('Al salir G.quiet vuelve y el mundo no queda en pausa', G.quiet === quiet0 && G.pausa.activa() === pausa0);
          check('La partida de la historia (G.S) queda intacta', comparable(S) === sAntes);
          check('Récords reales intactos', leer(ALMACEN) === recReal);
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

    G.flightApi = { DECL, P, abrir, salir, otraVez, toque, liberar, _dev: { J, st, obst, decor, pool, paso, generar, vaciar, huecoDe, alcanzable, bajadaMax, subidaMax, velocidadEn, get rnd() { return rnd; }, set rnd(f) { rnd = f; } }, get activo() { return st.activo; }, get fase() { return st.fase; }, estado: () => ({ fase: st.fase, puntos: J.puntos, mejor: J.mejor, y: J.y, vy: J.vy, v: J.v, dist: J.dist, obstaculos: obst.length, instancias: vivas(), semilla: J.semilla }), test };
    return G.flightApi;
  };
})();
