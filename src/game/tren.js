/* Juego · El tren de Vittata (C16, pedido de Kelvin, 26-oct-2026; ?mini=tren o AV.tren(); pruebas AV.trenTest(). Fase 2: tarjeta en
   «¿Cómo quieres jugar?» (menu_modos.js, index.html), en Retos (retos.js) y récord «tren» en Mis récords (records.js))
   Un tren corto de carga por una vía que da la vuelta al llano del sureste del mapa, entre la costa y el bosque. Vittata (la original,
   modelo y rig intactos) va posada en el techo de la locomotora. Inspiración: el tren de Puerto Rico que a principios del siglo XX
   rodeaba casi toda la isla y llevaba la caña a las centrales azucareras (American Railroad Company of Porto Rico; datos en SABIAS, con
   fuente o «por verificar»). NO es un juego de carreras (el de karts lo hará Kelvin aparte).
   Cómo se juega: acelerar y frenar; en cada desvío se elige la vía (izquierda o derecha); se para en las estaciones para cargar y
   entregar (cada carga tiene su estación: la caña va a la Central, las tortuguitas a la Playa, los coquíes al Bosque…) antes de que se
   acabe el turno. En las curvas hay que bajar la velocidad: si vas muy rápido el tren se tambalea y se cae una caja (nunca descarrila
   ni hay daño). Un túnel y un puente largo son los momentos especiales. Puntos, medallas (bronce/plata/oro), mejor marca y «¡Casi!».
   Cómo encaja con lo que hay (patrón de src/game/flight.js y retos.js; docs/equipo/MINIJUEGOS.md §4):
   - El mundo es el de siempre: terreno (G.terreno.height), mar (G.agua.levelAt), vegetación, edificios por streaming. No hay modelo de
     tren en el kit: locomotora, vagones, vía, estaciones y túneles son primitivas (cajas, cilindros, anillos) en Vibrant Toon, unidas con
     G.util.mergeGeos (un draw call por vehículo) e InstancedMesh para la vía (traviesas, rieles, balasto, pilares, portales, señales).
   - La vía es un grafo: 6 tramos (splines Catmull-Rom sobre puntos del mapa, muestreados cada metro) y 4 nodos, dos de ellos desvíos
     con dos salidas. El perfil sigue al terreno suavizado (pendiente ≤ 15 %); donde la vía queda muy por encima hay pilares (puente),
     donde queda por debajo hay un túnel (tubo + portales). Todo se calcula al entrar y se libera al salir.
   - Entrar/salir = Flight: instantánea de G.S, guardado suspendido, G.quiet, envolturas reversibles (G.ui.busy, fisica, acciones,
     cámara), clases tren-on y retos-on (música de Retos). Al salir se repone todo y la partida vuelve a como estaba.
   - Vittata: solo los valores que actores.js lee (S.pos, S.facing, MOVE: posada en algo fino = agachada y agarrada).
   - Récord en `<almacen>.retos` (clave tren: { mejor, jugadas }) y gancho retosResultado { modo: 'tren', puntos } → «Mis récords»
     (src/game/records.js, fase 2). Textos ES y EN aquí mismo (TX; la raíz lleva data-no-tr para que idioma.js no los toque).
   - Controles: ↑/W o botón «¡Dale!» = acelerar; ↓/S o «Freno» = frenar; ←/→ o A/D o los botones del desvío = elegir vía. Enter,
     Espacio, R o un toque en los resultados = «Otra vez» (arranca ya, sin la pantalla de «Toca para arrancar»). Esc abre la pausa.
   - Pulido (AO1): ruedas con radios y bielas que giran con la distancia recorrida (InstancedMesh aparte del vehículo), humo que sale a
     golpes con cada vuelta de rueda (más al acelerar), sube, se abre y se deshace; las manchas de sombra de los árboles apartados de
     la vía también se apartan; en el túnel el farol se enciende (haz y faroles en las paredes), la cámara se acerca y retumba y suena
     el silbato con eco; en el puente largo la cámara sube y se aleja en grúa para verlo entero y suena el traqueteo del hierro.
   window.AVTren(G) → { DECL, P, abrir, salir, otraVez, activo, fase, estado, test }. */
(function () {
  'use strict';
  window.AVTren = function (G) {
    if (G.trenApi) return G.trenApi;
    const S = G.S, R = G.renderer, F = G.fisica, M = F.MOVE, scene = R.scene, $ = G.util.$;
    const REDUCED = !!R.REDUCED;
    const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const ALMACEN = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.retos';
    let claveRec = ALMACEN;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const rate = (k, dt) => 1 - Math.exp(-dt * k);
    const H = (x, z) => G.terreno.height(x, z);
    const nivelAgua = (x, z) => { const w = G.agua.levelAt(x, z); return w > -1e8 ? w : -Infinity; };
    const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
    const ingles = () => !!(G.idioma && G.idioma.actual && G.idioma.actual() === 'en');
    // Sonidos propios (sintéticos, por G.audio.define): silbato de dos notas, retumbe con eco del túnel y traqueteo del puente de hierro
    if (G.audio && G.audio.define && !G.audio.has('tren_silbato')) {
      G.audio.define('tren_silbato', (t0, a, A) => { for (const [f, d0, d] of [[587, 0, 0.3], [740, 0.34, 0.62]]) { A.tone(f, t0 + d0, d, { type: 'sawtooth', gain: 0.035 }); A.tone(f * 1.26, t0 + d0, d, { type: 'triangle', gain: 0.05 }); } A.noise(t0, 0.95, { freq: 2600, q: 2, gain: 0.035 }); });
      G.audio.define('tren_tunel', (t0, a, A) => { A.noise(t0, 0.5, { type: 'lowpass', freq: 230, gain: 0.24 }); A.noise(t0 + 0.14, 0.42, { type: 'lowpass', freq: 190, gain: 0.11 }); });
      G.audio.define('tren_puente', (t0, a, A) => { for (let k = 0; k < 4; k++) A.noise(t0 + k * 0.1, 0.07, { freq: 950 + k * 60, q: 3, gain: 0.07 }); });
    }

    // ---------- Declaración del minijuego (docs/equipo/MINIJUEGOS.md §4) ----------
    const DECL = {
      id: 'tren', nombre: 'El tren de Vittata', nombreEn: "Vittata's Train",
      descripcion: 'Conduce el tren de la caña por la costa y el bosque. Elige la vía en los desvíos, frena en las curvas y entrega cada carga en su estación.',
      recursos: { kit: [], personaje: 'vittata (original)', zona: 'llano del sureste (playa, costa este, la Central junto a las ruinas, bosque y lomas)', propio: 'tren, vía, estaciones y túneles con primitivas (Vibrant Toon)' },
      camara: 'detrás y por encima de la locomotora, siguiendo la vía (más cerca y con retumbe dentro de los túneles; plano grúa en el puente largo; encuadre propio en vertical)',
      controles: { pc: '↑/W acelera, ↓/S frena, ←/→ o A/D eligen la vía en el desvío', movil: 'botones ¡Dale! y Freno; ◀ ▶ para el desvío', resultados: 'Enter, Espacio o un toque: otra vez' },
      inicio: 'el primer toque o tecla arranca el turno', victoria: null, derrota: 'ninguna: el turno dura 2 min 30 s; en las curvas rápidas se cae una caja (sin daño)',
      puntuacion: '100 por entrega + hasta 50 si llega a tiempo; 60 si llega tarde', musica: 'retos (clase retos-on)',
      resultados: ['puntos', 'entregas', 'aTiempo', 'perdidas', 'mejor', 'nuevoRecord', 'medalla'], records: { clave: 'tren', campos: ['mejor', 'jugadas'], gancho: 'retosResultado' },
      oculto: false, // fase 2 (C16): tarjeta en «¿Cómo quieres jugar?» y en Retos; también ?mini=tren y AV.tren()
    };

    // ---------- Parámetros (metros y segundos) ----------
    const P = {
      duracion: 150,       // s de turno
      vMax: 16,            // m/s (58 km/h en el HUD)
      acel: 4.0, freno: 7.5, rozamiento: 0.6, // m/s²
      aCurva: 2.8,         // aceleración lateral (v²·curvatura) a partir de la que el tren se tambalea
      aPerder: 4.2,        // …y a partir de la que, sostenida perderT s, se cae una caja
      perderT: 0.35, perderEspera: 2.5,
      capacidad: 3,        // una caja por vagón
      paradaR: 6,          // m alrededor de la estación donde contar la parada
      vParada: 0.2,        // m/s: parado
      plazo: 75,           // s que tiene cada carga para llegar «a tiempo»
      puntosEntrega: 100, bonoTiempo: 50, puntosTarde: 60,
      reaparece: [8, 16],  // s hasta que una estación vuelve a tener carga
      avisoDesvio: 45, avisoEstacion: 40, avisoCurva: 32, // m de antelación de los avisos del HUD
      grado: 0.15, suavizado: 6, // perfil de la vía: pendiente máxima y medio ancho (m) de la media móvil
      puenteMin: 0.8, tunelMin: 1.2, tunelLargo: 4, // umbrales del perfil (m sobre/bajo el terreno) y largo mínimo de un túnel
      largoLoco: 4.4, largoVagon: 3.2, enganche: 0.5, // tamaños del tren
      finEspera: 0.45, finPanel: 0.35, // s hasta que se puede pedir «Otra vez» y hasta que salen los resultados
      rRueda: 0.42, manivela: 0.22, humoVuelta: 1.32, humoMax: 32, // radio de rueda, radio de la biela, m entre bocanadas (media vuelta: chu-chu), bocanadas a la vez
    };
    const MEDALLAS = [['bronce', 250], ['plata', 450], ['oro', 650]]; // calibradas con el robot de trenTest (turnos perfectos: 470–710 puntos, 6–8 entregas)

    // ---------- Textos (ES → EN); la raíz #tren lleva data-no-tr, así que aquí se traduce a mano ----------
    const TX = {
      'El tren de Vittata': "Vittata's Train",
      '¡Toca para arrancar!': 'Tap to start!',
      'Acelera, frena en las curvas y entrega cada carga en su estación.': 'Speed up, slow down on the curves and deliver each load to its station.',
      'Salir del tren': 'Leave the train', 'Salir': 'Leave', '¡Dale!': 'Go!', 'Freno': 'Brake',
      'Desvío': 'Switch', 'Estación': 'Station', 'Frena y para': 'Brake and stop', 'Curva: baja a': 'Curve: slow to',
      'Túnel': 'Tunnel', 'Puente': 'Bridge', 'Sin carga': 'No load', 'Caja esperando': 'Box waiting',
      '¡Entregada!': 'Delivered!', '¡A tiempo!': 'On time!', 'Tarde, pero llegó': 'Late, but it arrived',
      '¡Cargada!': 'Loaded!', '¡Se cayó una caja! Frena en las curvas.': 'A box fell off! Slow down on the curves.',
      '¡Uy, qué tambaleo! Frena en las curvas.': 'Whoa, wobbly! Slow down on the curves.',
      'Fin del turno': 'End of the shift', 'puntos': 'points', 'punto': 'point', 'entregas': 'deliveries', 'entrega': 'delivery',
      'a tiempo': 'on time', 'cajas caídas': 'boxes dropped', 'tu mejor': 'your best', 'Récord': 'Best',
      '¡Nuevo récord!': 'New record!', 'Otra vez': 'Again', 'Volver a la historia': 'Back to the story',
      'Haz una entrega para tener tu primer récord.': 'Make a delivery to get your first record.',
      '¡Tienes todas las medallas! Intenta superar tu récord.': 'You have every medal! Try to beat your record.',
      'Te faltan {} puntos para {}': 'You need {} more points for {}', 'el bronce': 'bronze', 'la plata': 'silver', 'el oro': 'gold',
      '¡A solo {} puntos del récord!': 'Only {} points short of your record!', '¡Nuevo sello de {} en Mis récords!': 'New {} seal in My Records!',
      bronce: 'bronze', plata: 'silver', oro: 'gold', '¿Sabías que…?': 'Did you know?', 'por verificar': 'to be verified',
      // Estaciones y cargas
      'Playa': 'Beach', 'Faro': 'Lighthouse', 'Mercado': 'Market', 'La Central': 'The Sugar Mill', 'Bosque': 'Forest', 'Cafetal': 'Coffee Farm',
      'caña': 'sugar cane', 'tortuguitas': 'baby turtles', 'coquíes': 'coquís', 'cartas': 'letters', 'frutas': 'fruit', 'semillas de café': 'coffee seeds',
      'La caña va a la Central.': 'Sugar cane goes to the Sugar Mill.', 'Las tortuguitas van a la Playa.': 'Baby turtles go to the Beach.',
      'Los coquíes van al Bosque.': 'Coquís go to the Forest.', 'Las cartas van al Faro.': 'Letters go to the Lighthouse.',
      'Las frutas van al Mercado.': 'Fruit goes to the Market.', 'Las semillas van al Cafetal.': 'Seeds go to the Coffee Farm.',
      'izquierda': 'left', 'derecha': 'right', 'por aquí': 'this way', '¡Vámonos!': "Let's go!",
    };
    const SABIAS = [
      ['A principios del siglo XX un tren de vía estrecha rodeaba casi toda la isla de Puerto Rico y llevaba la caña a las centrales azucareras. Fuente: American Railroad Company of Porto Rico (por verificar).',
        'In the early 1900s a narrow-gauge railway circled almost all of Puerto Rico and carried sugar cane to the mills. Source: American Railroad Company of Porto Rico (to be verified).'],
      ['El servicio de pasajeros del tren de la isla terminó a mediados del siglo XX; hoy quedan estaciones y puentes como recuerdo (por verificar).',
        'Passenger service on the island railway ended in the mid-1900s; today stations and bridges remain as a memory (to be verified).'],
    ];
    const t = s => (ingles() && TX[s] != null ? TX[s] : s);
    const tf = (s, ...a) => { let r = t(s); for (const v of a) r = r.replace('{}', v); return r; };

    // ---------- La vía: tramos sobre el mapa (x, z). Cada lista lleva un punto ANTES del nodo de salida y otro DESPUÉS del de llegada ----------
    // Nodos: C (85,180) oeste del llano · A (190,194) desvío de la playa · B (218,62) costa norte · D (178,40) desvío de la Central
    const SEGS = [
      { id: 'oeste', de: 'C', a: 'A', pts: [[90, 166], [85, 180], [90, 196], [110, 206], [140, 206], [165, 199], [190, 194], [212, 180]] }, // túnel bajo la colina y puente sobre la bahía del muelle
      { id: 'costa', de: 'A', a: 'B', pts: [[165, 199], [190, 194], [212, 180], [224, 150], [226, 120], [224, 90], [218, 62], [214, 42]] },
      { id: 'poza', de: 'A', a: 'B', pts: [[165, 199], [190, 194], [200, 165], [190, 140], [186, 118], [195, 95], [208, 75], [218, 62], [214, 42]] },
      { id: 'norte', de: 'B', a: 'D', pts: [[224, 90], [218, 62], [214, 42], [200, 36], [178, 40], [152, 46]] },
      { id: 'bosque', de: 'D', a: 'C', pts: [[200, 36], [178, 40], [152, 46], [128, 58], [108, 85], [100, 118], [96, 148], [90, 166], [85, 180], [90, 196]] },
      { id: 'lomas', de: 'D', a: 'C', pts: [[200, 36], [178, 40], [152, 46], [120, 42], [92, 55], [76, 90], [72, 125], [78, 152], [90, 166], [85, 180], [90, 196]] },
    ];
    // Estaciones: dónde (tramo y punto del mapa más cercano), a qué lado el andén y qué carga llega aquí
    const ESTS = [
      { id: 'playa', nombre: 'Playa', seg: 'oeste', xz: [166, 199], lado: 1, recibe: 'tortuguitas' },
      { id: 'faro', nombre: 'Faro', seg: 'costa', xz: [226, 120], lado: 1, recibe: 'cartas' },
      { id: 'mercado', nombre: 'Mercado', seg: 'poza', xz: [190, 140], lado: -1, recibe: 'frutas' },
      { id: 'central', nombre: 'La Central', seg: 'norte', xz: [200, 36], lado: 1, recibe: 'caña' },
      { id: 'bosque', nombre: 'Bosque', seg: 'bosque', xz: [100, 118], lado: -1, recibe: 'coquíes' },
      { id: 'cafetal', nombre: 'Cafetal', seg: 'lomas', xz: [72, 125], lado: 1, recibe: 'semillas de café' },
    ];
    const CARGAS = { 'caña': { color: 0xd9e04a, frase: 'La caña va a la Central.' }, 'tortuguitas': { color: 0x3fb6d8, frase: 'Las tortuguitas van a la Playa.' }, 'coquíes': { color: 0x4fc96a, frase: 'Los coquíes van al Bosque.' },
      'cartas': { color: 0x4a6cf0, frase: 'Las cartas van al Faro.' }, 'frutas': { color: 0xff8a3d, frase: 'Las frutas van al Mercado.' }, 'semillas de café': { color: 0x8a5a3c, frase: 'Las semillas van al Cafetal.' } };
    const destinoDe = tipo => (st.via ? st.via.ests : ESTS).find(e => e.recibe === tipo);

    // ---------- Estado ----------
    const st = { activo: false, fase: 'nada', snap: null, quiet: false, creador: false, env: null, ui: null, via: null, listo: false, hitStop: 0 };
    const J = { seg: 0, s: 0, v: 0, t: 0, resta: P.duracion, puntos: 0, entregas: 0, aTiempo: 0, perdidas: 0, carga: [], hist: [], desvio: {}, roll: 0, aLat: 0, sobreT: 0, perdioT: -1e9, parada: '', finT: 0, mejor: 0, antes: 0, nuevo: false, semilla: 1, humoT: 0, humoD: 0, dist: 0, zona: 0, ecoT: 0, aviso: '', avisoT: 0 };
    const held = { gas: false, freno: false };
    let rnd = G.util.rng(1);

    // ---------- Construcción de la vía ----------
    function catmull(p0, p1, p2, p3, u, out) {
      const u2 = u * u, u3 = u2 * u;
      for (let i = 0; i < 2; i++) out[i] = 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * u + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * u2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * u3);
      return out;
    }
    // Muestrea el tramo cada metro (entre pts[1] y pts[n-2]; pts[0] y pts[n-1] solo dan la tangente en los nodos)
    function muestrear(pts) {
      const fino = [], q = [0, 0];
      for (let i = 1; i < pts.length - 2; i++) {
        const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), k = Math.max(4, Math.ceil(L * 4));
        for (let j = 0; j < k; j++) { catmull(pts[i - 1], pts[i], pts[i + 1], pts[i + 2], j / k, q); fino.push([q[0], q[1]]); }
      }
      fino.push([pts[pts.length - 2][0], pts[pts.length - 2][1]]);
      const xs = [fino[0][0]], zs = [fino[0][1]]; let d = 0;
      for (let i = 1; i < fino.length; i++) {
        const a = fino[i - 1], b = fino[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!L) continue; d += L;
        while (d >= 1) { const u = 1 - (d - 1) / L; xs.push(a[0] + (b[0] - a[0]) * u); zs.push(a[1] + (b[1] - a[1]) * u); d -= 1; }
      }
      return { x: xs, z: zs };
    }
    function perfil(xs, zs) {
      const n = xs.length, h = new Array(n), raw = new Array(n), W = P.suavizado;
      for (let i = 0; i < n; i++) { const hh = H(xs[i], zs[i]), w = nivelAgua(xs[i], zs[i]); h[i] = hh; raw[i] = hh < w + 0.4 ? w + 1.2 : hh + 0.3; }
      let y = raw;
      for (let pasada = 0; pasada < 2; pasada++) { const y2 = new Array(n); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = Math.max(0, i - W); k <= Math.min(n - 1, i + W); k++) { s += y[k]; c++; } y2[i] = s / c; } y = y2; }
      for (let pasada = 0; pasada < 3; pasada++) { for (let i = 1; i < n; i++) y[i] = Math.min(y[i], y[i - 1] + P.grado); for (let i = n - 2; i >= 0; i--) y[i] = Math.min(y[i], y[i + 1] + P.grado); }
      return { h, y };
    }
    function construirVia() {
      const nodos = {};
      const segs = SEGS.map((d, idx) => {
        const m = muestrear(d.pts), n = m.x.length, pr = perfil(m.x, m.z);
        const sg = { idx, id: d.id, de: d.de, a: d.a, n, x: m.x, z: m.z, y: pr.y, h: pr.h, tx: new Array(n), tz: new Array(n), ty: new Array(n), kap: new Array(n), tipo: new Uint8Array(n), largo: n - 1 };
        for (const k of [d.de, d.a]) if (!nodos[k]) nodos[k] = { id: k, x: 0, z: 0, y: [], sal: [], ent: [] };
        nodos[d.de].sal.push(idx); nodos[d.a].ent.push(idx);
        nodos[d.de].x = m.x[0]; nodos[d.de].z = m.z[0]; nodos[d.de].y.push(pr.y[0]);
        nodos[d.a].x = m.x[n - 1]; nodos[d.a].z = m.z[n - 1]; nodos[d.a].y.push(pr.y[n - 1]);
        return sg;
      });
      // La altura de cada nodo es la media de sus tramos; cada tramo se ajusta a ella en sus últimos 25 m (las dos vías de un desvío empalman)
      for (const k in nodos) { const nd = nodos[k], hh = H(nd.x, nd.z), w = nivelAgua(nd.x, nd.z); nd.y = hh < w + 0.4 ? w + 1.2 : hh + 0.3; } // el nodo va a ras de suelo: los desvíos nunca caen dentro de un túnel
      for (const sg of segs) {
        const y0 = nodos[sg.de].y - sg.y[0], y1 = nodos[sg.a].y - sg.y[sg.n - 1], L = Math.min(25, Math.floor(sg.n / 2));
        for (let i = 0; i < sg.n; i++) { const w0 = clamp(1 - i / L, 0, 1), w1 = clamp(1 - (sg.n - 1 - i) / L, 0, 1); sg.y[i] += y0 * w0 + y1 * w1; }
        for (let i = 0; i < sg.n; i++) {
          const a = Math.max(0, i - 1), b = Math.min(sg.n - 1, i + 1), dx = sg.x[b] - sg.x[a], dz = sg.z[b] - sg.z[a], L2 = Math.hypot(dx, dz) || 1;
          sg.tx[i] = dx / L2; sg.tz[i] = dz / L2; sg.ty[i] = (sg.y[b] - sg.y[a]) / L2;
        }
        for (let i = 0; i < sg.n; i++) { // curvatura con signo (rad/m), suavizada sobre ±3 m: + gira a la izquierda (visto desde arriba)
          const a = Math.max(0, i - 3), b = Math.min(sg.n - 1, i + 3), cr = sg.tx[a] * sg.tz[b] - sg.tz[a] * sg.tx[b], dot = clamp(sg.tx[a] * sg.tx[b] + sg.tz[a] * sg.tz[b], -1, 1);
          sg.kap[i] = (cr >= 0 ? 1 : -1) * Math.acos(dot) / Math.max(1, b - a);
        }
        // Puente (pilares) donde la vía queda por encima del terreno; túnel donde queda por debajo durante al menos tunelLargo m
        for (let i = 0; i < sg.n; i++) sg.tipo[i] = sg.y[i] - sg.h[i] > P.puenteMin ? 1 : sg.h[i] - sg.y[i] > P.tunelMin ? 2 : 0;
        sg.tuneles = []; sg.puentes = [];
        for (let i = 0; i < sg.n;) { if (sg.tipo[i] !== 2) { i++; continue; } let j = i; while (j < sg.n && sg.tipo[j] === 2) j++; if (j - i >= P.tunelLargo) sg.tuneles.push([i, j - 1]); else for (let k = i; k < j; k++) sg.tipo[k] = 0; i = j; }
        for (let i = 0; i < sg.n;) { if (sg.tipo[i] !== 1) { i++; continue; } let j = i; while (j < sg.n && sg.tipo[j] === 1) j++; sg.puentes.push([i, j - 1]); i = j; }
        sg.esp = new Uint8Array(sg.n); // los momentos especiales: 2 = túnel, 1 = puente largo (≥ 20 m)
        for (const [i0, i1] of sg.tuneles) sg.esp.fill(2, i0, i1 + 1);
        for (const [i0, i1] of sg.puentes) if (i1 - i0 >= 20) sg.esp.fill(1, i0, i1 + 1);
      }
      // Desvíos: en cada nodo con dos salidas, cuál es la de la izquierda y cuál la de la derecha (vista desde el tren que llega)
      for (const k in nodos) {
        const nd = nodos[k]; if (nd.sal.length < 2) continue;
        const e = segs[nd.ent[0]], tx = e.tx[e.n - 1], tz = e.tz[e.n - 1];
        const lado = i => { const sg = segs[i], j = Math.min(sg.n - 1, 14), cr = tx * (sg.z[j] - nd.z) - tz * (sg.x[j] - nd.x); return cr; }; // z crece hacia el sur: cr < 0 = a la izquierda del rumbo
        nd.sal.sort((i, j) => lado(i) - lado(j)); // sal[0] = izquierda, sal[1] = derecha
      }
      // Estaciones: muestra más cercana a su punto del mapa
      const ests = ESTS.map(d => { const sg = segs.find(s => s.id === d.seg); let best = 0, bd = 1e9; for (let i = 8; i < sg.n - 8; i++) { const dd = Math.hypot(sg.x[i] - d.xz[0], sg.z[i] - d.xz[1]); if (dd < bd) { bd = dd; best = i; } } return Object.assign({ segIdx: sg.idx, s: best, espera: null, proxima: 0 }, d); });
      // Señales de curva: tramos donde la velocidad segura baja de 13 m/s; la señal va 22 m antes
      for (const sg of segs) { sg.curvas = []; for (let i = 0; i < sg.n;) { if (vSegura(sg, i) >= 13) { i++; continue; } let j = i; while (j < sg.n && vSegura(sg, j) < 13) j++; let vmin = 99; for (let k = i; k < j; k++) vmin = Math.min(vmin, vSegura(sg, k)); sg.curvas.push({ i0: i, i1: j - 1, v: Math.floor(vmin) }); i = j; } }
      return { segs, nodos, ests, largo: segs.reduce((a, s) => a + s.largo, 0) };
    }
    const vSegura = (sg, i) => Math.sqrt(P.aCurva / Math.max(1e-4, Math.abs(sg.kap[i])));
    const _w = { x: 0, y: 0, z: 0, tx: 0, tz: 0, ty: 0, i: 0 };
    // Punto de la vía a s metros del principio del tramo (interpolado)
    function enVia(sg, s, out) {
      out = out || _w; const n = sg.n, f = clamp(s, 0, sg.largo), i = Math.min(n - 2, Math.floor(f)), u = f - i, j = i + 1;
      out.x = sg.x[i] + (sg.x[j] - sg.x[i]) * u; out.z = sg.z[i] + (sg.z[j] - sg.z[i]) * u; out.y = sg.y[i] + (sg.y[j] - sg.y[i]) * u;
      out.tx = sg.tx[i] + (sg.tx[j] - sg.tx[i]) * u; out.tz = sg.tz[i] + (sg.tz[j] - sg.tz[i]) * u; out.ty = sg.ty[i] + (sg.ty[j] - sg.ty[i]) * u; out.i = Math.round(f);
      const L = Math.hypot(out.tx, out.tz) || 1; out.tx /= L; out.tz /= L;
      return out;
    }
    // (tramo, s) a d metros por detrás de la locomotora, por donde vino el tren
    function atras(d, out) {
      const V = st.via; let sg = V.segs[J.seg], s = J.s - d, k = J.hist.length - 1;
      while (s < 0 && k >= 0) { sg = V.segs[J.hist[k--]]; s += sg.largo; }
      while (s > sg.largo) { s -= sg.largo; sg = V.segs[siguienteSeg(V, sg)]; } // el morro ya asoma al siguiente tramo
      out = enVia(sg, Math.max(0, s), out); out.sg = sg; return out;
    }
    const siguienteSeg = (V, sg) => { const nd = V.nodos[sg.a]; if (nd.sal.length < 2) return nd.sal[0]; return nd.sal[J.desvio[nd.id] ? 1 : 0]; };

    // ---------- Escena: vía, estaciones, tren (primitivas; se crea al entrar y se libera al salir) ----------
    const raiz = new THREE.Group(); raiz.name = 'tren'; raiz.visible = false;
    const lin = c => new THREE.Color(c).convertSRGBToLinear();
    const MAT = {};
    const mat = (k, c, o) => MAT[k] || (MAT[k] = Object.assign(new THREE.MeshLambertMaterial(Object.assign({ color: lin(c) }, o || {})), { name: 'tren:' + k }));
    const E0 = () => ({ inst: {}, tuneles: [], carteles: [], tren: null, coches: [], vehiculos: [], cajas: [], cajasEst: [], caida: null, humo: null, humos: [], texturas: [], ruedas: null, ruedasDe: [], bielas: null, haz: null });
    const E = E0();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _up = new THREE.Vector3(0, 1, 0), _fw = new THREE.Vector3(), _rt = new THREE.Vector3(), _m3 = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _c = new THREE.Color();
    // Matriz con el eje Z local apuntando por (tx, ty, tz) y giro (roll) sobre ese eje
    function orientar(tx, ty, tz, roll) {
      _fw.set(tx, ty, tz).normalize(); _rt.crossVectors(_up, _fw).normalize(); const up = _p.crossVectors(_fw, _rt).normalize();
      _m3.makeBasis(_rt, up, _fw); _q.setFromRotationMatrix(_m3);
      if (roll) { _e.set(0, 0, roll); _q.multiply(_q2.setFromEuler(_e)); }
      return _q;
    }
    function instancia(k, geo, material, n) { const im = new THREE.InstancedMesh(geo, material, n); im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = 'tren:' + k; raiz.add(im); E.inst[k] = im; return im; }
    function ponerInst(im, x, y, z, q, sx, sy, sz) { _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, q, _s); im.setMatrixAt(im.count++, _m); }
    function caja(w, h, d, c, x, y, z, ry) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); colorear(g, c); return g; }
    function cil(r0, r1, h, c, x, y, z, rx, rz) { const g = new THREE.CylinderGeometry(r0, r1, h, 12); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); colorear(g, c); return g; }
    function colorear(g, c) { const col = lin(c), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
    function unir(geos) { const g = G.util.mergeGeos(geos); const col = []; for (const q of geos) col.push(...q.attributes.color.array); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); for (const q of geos) q.dispose(); return g; }
    function vehiculo(geos, nombre) { const m = new THREE.Mesh(unir(geos), mat('vehiculo', '#ffffff', { vertexColors: true })); m.name = 'tren:' + nombre; m.frustumCulled = false; m.castShadow = false; raiz.add(m); E.vehiculos.push(m); return m; }
    // Las ruedas no van en la malla del vehículo: se apuntan (coche, x, z) y giran en una InstancedMesh propia (colocar)
    function ruedas(k, largo) { for (const sx of [-0.85, 0.85]) for (const z of [-largo * 0.3, largo * 0.3]) E.ruedasDe.push([k, sx, z]); }
    function construirEscena() {
      const V = st.via, nT = V.largo + 8;
      // Vía: balasto, traviesas, rieles (instancias por metro), pilares, portales y señales
      const iBal = instancia('balasto', new THREE.BoxGeometry(3.0, 0.5, 1.02), mat('balasto', '#8c7b66'), nT);
      const iTra = instancia('traviesa', new THREE.BoxGeometry(2.1, 0.14, 0.32), mat('traviesa', '#6b4a2e'), nT);
      const iRie = instancia('riel', new THREE.BoxGeometry(0.12, 0.1, 1.02), mat('riel', '#5c6670'), nT * 2);
      const iPil = instancia('pilar', new THREE.BoxGeometry(0.6, 1, 0.6), mat('pilar', '#9aa39b'), Math.ceil(nT / 3));
      const iPor = instancia('portal', new THREE.RingGeometry(2.6, 4.0, 14), mat('portal', '#8d8a7c', { side: THREE.DoubleSide }), 24);
      const iSen = instancia('senal', new THREE.PlaneGeometry(0.7, 0.7), mat('senal', '#ffd23a', { side: THREE.DoubleSide }), 40);
      const iPos = instancia('poste', new THREE.BoxGeometry(0.1, 2.2, 0.1), mat('poste', '#4b4b4b'), 40);
      const tubo = mat('tunel', '#2a201b', { side: THREE.BackSide });
      const nFar = V.segs.reduce((a, sg) => a + sg.tuneles.reduce((b, tn) => b + Math.floor((tn[1] - tn[0]) / 6) + 1, 0), 0);
      const luz = MAT.luz || (MAT.luz = Object.assign(new THREE.MeshBasicMaterial({ color: lin('#ffd27a'), fog: false }), { name: 'tren:luz' }));
      const iFar = instancia('farol', new THREE.SphereGeometry(0.17, 8, 6), luz, Math.max(1, nFar));
      for (const sg of V.segs) {
        for (let i = 0; i < sg.n; i++) {
          const q = orientar(sg.tx[i], sg.ty[i], sg.tz[i], 0);
          ponerInst(iBal, sg.x[i], sg.y[i] - 0.25, sg.z[i], q, 1, 1, 1);
          ponerInst(iTra, sg.x[i], sg.y[i] + 0.07, sg.z[i], q, 1, 1, 1);
          for (const o of [-0.72, 0.72]) ponerInst(iRie, sg.x[i] + _rt.x * o, sg.y[i] + 0.19, sg.z[i] + _rt.z * o, q, 1, 1, 1);
          if (sg.tipo[i] === 1 && i % 3 === 0 && iPil.count < iPil.instanceMatrix.count) { const base = Math.min(sg.h[i], nivelAgua(sg.x[i], sg.z[i]) > -1e8 ? Math.min(sg.h[i], nivelAgua(sg.x[i], sg.z[i])) : sg.h[i]), alto = sg.y[i] - 0.5 - base + 0.4; _e.set(0, Math.atan2(sg.tx[i], sg.tz[i]), 0); ponerInst(iPil, sg.x[i], base - 0.4 + alto / 2, sg.z[i], _q.setFromEuler(_e), 1, alto, 1); }
        }
        for (const [i0, i1] of sg.tuneles) {
          const pts = []; for (let i = Math.max(0, i0 - 3); i <= Math.min(sg.n - 1, i1 + 3); i++) pts.push(new THREE.Vector3(sg.x[i], sg.y[i] + 2.3, sg.z[i]));
          const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(2, pts.length), 3.1, 10, false), m = new THREE.Mesh(g, tubo); m.frustumCulled = false; m.name = 'tren:tunel'; raiz.add(m); E.tuneles.push(m);
          for (const i of [Math.max(0, i0 - 3), Math.min(sg.n - 1, i1 + 3)]) if (iPor.count < iPor.instanceMatrix.count) ponerInst(iPor, sg.x[i], sg.y[i] + 2.3, sg.z[i], orientar(sg.tx[i], 0, sg.tz[i], 0), 1, 1, 1);
          for (let i = i0, k = 0; i <= i1 && iFar.count < iFar.instanceMatrix.count; i += 6, k++) { orientar(sg.tx[i], 0, sg.tz[i], 0); const o = k % 2 ? 2.6 : -2.6; ponerInst(iFar, sg.x[i] + _rt.x * o, sg.y[i] + 3.0, sg.z[i] + _rt.z * o, _q, 1, 1, 1); } // faroles en las paredes, a un lado y al otro
        }
        for (const c of sg.curvas) { const i = Math.max(0, c.i0 - 22); if (iSen.count >= iSen.instanceMatrix.count) break; const q = orientar(sg.tx[i], 0, sg.tz[i], 0); const x = sg.x[i] + _rt.x * 2.4, z = sg.z[i] + _rt.z * 2.4; ponerInst(iPos, x, sg.y[i] + 1.1, z, q, 1, 1, 1); _e.set(0, 0, Math.PI / 4); ponerInst(iSen, x, sg.y[i] + 2.5, z, _q2.copy(q).multiply(new THREE.Quaternion().setFromEuler(_e)), 1, 1, 1); }
      }
      for (const k in E.inst) E.inst[k].instanceMatrix.needsUpdate = true;
      // Estaciones: andén, techito con cuatro postes, cartel con el nombre y una caja de espera
      for (const e of V.ests) {
        const sg = V.segs[e.segIdx], i = e.s, q = orientar(sg.tx[i], 0, sg.tz[i], 0), ox = _rt.x * e.lado, oz = _rt.z * e.lado, y = sg.y[i];
        const g = [caja(10, 0.5, 2.4, '#c9b99a', 0, 0.25, 0), caja(6, 0.22, 2.4, '#d9534f', 0, 3.4, 0)]; for (const px of [-2.6, 2.6]) for (const pz of [-0.95, 0.95]) g.push(caja(0.18, 3.0, 0.18, '#6b4a2e', px, 1.9, pz));
        const m = new THREE.Mesh(unir(g), mat('vehiculo', '#ffffff', { vertexColors: true })); m.name = 'tren:estacion'; m.position.set(sg.x[i] + ox * 3.3, y, sg.z[i] + oz * 3.3); m.quaternion.copy(q); m.rotateY(Math.PI / 2); m.frustumCulled = false; raiz.add(m); E.vehiculos.push(m);
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const cx = cv.getContext('2d'); cx.fillStyle = '#fff6d8'; cx.fillRect(0, 0, 256, 64); cx.fillStyle = '#2b3a2e'; cx.font = 'bold 34px system-ui, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(e.nombre, 128, 34);
        const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; E.texturas.push(tex);
        const cartel = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: false })); cartel.name = 'tren:cartel'; cartel.position.set(sg.x[i] + ox * 4.4, y + 2.6, sg.z[i] + oz * 4.4); cartel.quaternion.copy(q); cartel.rotateY(e.lado > 0 ? -Math.PI / 2 : Math.PI / 2); cartel.frustumCulled = false; raiz.add(cartel); E.carteles.push(cartel);
        const cj = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshLambertMaterial({ color: lin('#ffffff') })); cj.name = 'tren:cajaEst'; cj.position.set(sg.x[i] + ox * 3.3 + sg.tx[i] * 3, y + 0.95, sg.z[i] + oz * 3.3 + sg.tz[i] * 3); cj.visible = false; raiz.add(cj); E.cajasEst.push(cj);
      }
      // El tren: locomotora roja con caldera, cabina y chimenea; tres vagones de plataforma con su caja
      const L = P.largoLoco, g = [caja(1.9, 0.5, L, '#4b3a30', 0, 0.75, 0), cil(0.75, 0.75, 2.4, '#d9342b', 0, 1.65, 0.7, Math.PI / 2), caja(1.7, 1.6, 1.3, '#d9342b', 0, 1.6, -1.2), caja(1.9, 0.18, 1.6, '#2b2b2b', 0, 2.45, -1.2),
        cil(0.22, 0.3, 0.9, '#2b2b2b', 0, 2.75, 1.5), cil(0.3, 0.3, 0.5, '#f2c14e', 0, 2.5, 0.4), caja(1.3, 0.4, 0.3, '#ffe9a8', 0, 1.9, -0.55), caja(1.6, 0.35, 0.5, '#8a2219', 0, 1.0, 2.05)];
      ruedas(0, L); E.tren = vehiculo(g, 'locomotora'); E.coches.push(E.tren);
      for (let k = 0; k < P.capacidad; k++) { const w = P.largoVagon, gv = [caja(1.9, 0.3, w, '#5a7f3b', 0, 0.85, 0), caja(2.0, 0.25, 0.3, '#3f5c2a', 0, 1.12, w / 2 - 0.15), caja(2.0, 0.25, 0.3, '#3f5c2a', 0, 1.12, -w / 2 + 0.15)]; ruedas(k + 1, w); E.coches.push(vehiculo(gv, 'vagon' + k));
        const cj = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.4), new THREE.MeshLambertMaterial({ color: lin('#ffffff') })); cj.name = 'tren:caja'; cj.visible = false; cj.frustumCulled = false; raiz.add(cj); E.cajas.push(cj); }
      E.caida = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.4), new THREE.MeshLambertMaterial({ color: lin('#ffffff') })); E.caida.name = 'tren:caida'; E.caida.visible = false; raiz.add(E.caida);
      // Ruedas con radios (se ve que giran) y las dos bielas de la locomotora, que dan vueltas con ellas (desfasadas un cuarto de vuelta)
      const r = P.rRueda, gR = unir([cil(r, r, 0.24, '#2b2b2b', 0, 0, 0, 0, Math.PI / 2), caja(0.27, r * 1.7, 0.11, '#e0b23c', 0, 0, 0), caja(0.27, 0.11, r * 1.7, '#e0b23c', 0, 0, 0), cil(0.1, 0.1, 0.3, '#e0b23c', 0, 0, 0, 0, Math.PI / 2)]);
      E.ruedas = instancia('rueda', gR, mat('vehiculo', '#ffffff', { vertexColors: true }), E.ruedasDe.length); E.ruedas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      E.bielas = instancia('biela', new THREE.BoxGeometry(0.08, 0.1, L * 0.6 + 0.3), mat('biela', '#c9d0d6'), 2); E.bielas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Farol de la locomotora y su haz (aditivo; solo se ve en los túneles)
      const farol = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12).rotateX(Math.PI / 2), luz); farol.position.set(0, 1.65, 1.92); farol.name = 'tren:farol'; E.tren.add(farol);
      const hazMat = MAT.haz = Object.assign(new THREE.MeshBasicMaterial({ color: lin('#fff1c2'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), { name: 'tren:haz' });
      E.haz = new THREE.Mesh(new THREE.ConeGeometry(2.4, 15, 16, 1, true).rotateX(-Math.PI / 2).translate(0, 0, 7.5), hazMat); E.haz.position.set(0, 1.65, 1.95); E.haz.visible = false; E.haz.name = 'tren:haz'; E.haz.frustumCulled = false; E.tren.add(E.haz);
      E.humo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 8, 6), mat('humo', '#ffffff'), P.humoMax); E.humo.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(P.humoMax * 3), 3);
      E.humo.count = 0; E.humo.frustumCulled = false; E.humo.name = 'tren:humo'; raiz.add(E.humo); E.humos = [];
      if (!raiz.parent) scene.add(raiz);
    }
    // Los árboles y matas que caen sobre la vía no se dibujan mientras dura el tren (vegetacion.js salta las instancias con rank > densidad);
    // al salir recuperan su rank. Solo se toca el rank: ni las mallas ni las InstancedMesh del mapa. Las manchas de sombra de esos árboles
    // (flora:manchas, una InstancedMesh fija de vegetacion.js) se encogen a 0 con el mismo criterio de celdas y se reponen al salir.
    const flora = [], manchas = [];
    function despejarFlora() {
      const V = st.via, veg = G.vegetacion && G.vegetacion.instancias; if (!V || !veg || flora.length) return;
      const celdas = new Set(), C = 4, k = (x, z) => Math.floor(x / C) + ',' + Math.floor(z / C);
      for (const sg of V.segs) for (let i = 0; i < sg.n; i++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) celdas.add(k(sg.x[i] + dx * C, sg.z[i] + dz * C));
      for (const m in veg) { const Pm = veg[m]; if (!Pm || !Pm.pos || !Pm.rank) continue; for (let i = 0; i < Pm.n; i++) if (celdas.has(k(Pm.pos[i * 4], Pm.pos[i * 4 + 2]))) { flora.push([Pm, i, Pm.rank[i]]); Pm.rank[i] = 99; } }
      const mm = scene.getObjectByName('flora:manchas');
      if (mm && mm.isInstancedMesh) {
        const a = mm.instanceMatrix.array; _m.makeScale(0, 0, 0);
        for (let i = 0; i < mm.count; i++) if (celdas.has(k(a[i * 16 + 12], a[i * 16 + 14]))) { manchas.push([mm, i, a.slice(i * 16, i * 16 + 16)]); mm.setMatrixAt(i, _m); }
        if (manchas.length) mm.instanceMatrix.needsUpdate = true;
      }
    }
    function reponerFlora() {
      for (const [Pm, i, r] of flora) Pm.rank[i] = r; flora.length = 0;
      for (const [mm, i, a] of manchas) { mm.instanceMatrix.array.set(a, i * 16); mm.instanceMatrix.needsUpdate = true; } manchas.length = 0;
    }
    function liberarEscena() {
      raiz.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); if (!(o.material && o.material.name && o.material.name.indexOf('tren:') === 0)) o.material.dispose(); if (o.isInstancedMesh) o.dispose(); } });
      for (const k in MAT) { MAT[k].dispose(); delete MAT[k]; }
      for (const tx of E.texturas) tx.dispose();
      while (raiz.children.length) raiz.remove(raiz.children[0]);
      Object.assign(E, E0());
      if (raiz.parent) scene.remove(raiz);
      st.via = null; st.listo = false;
    }
    // Coloca el tren (cada vehículo entre su punto delantero y trasero por la vía), las cajas y el humo
    const _f = { x: 0, y: 0, z: 0 }, _b = { x: 0, y: 0, z: 0 };
    function colocar(dt) {
      if (!st.via || !E.tren) return;
      let d = 0; const roll = J.roll;
      for (let k = 0; k < E.coches.length; k++) {
        const m = E.coches[k], L = k === 0 ? P.largoLoco : P.largoVagon;
        atras(d - L / 2, _f); atras(d + L / 2, _b);
        m.position.set((_f.x + _b.x) / 2, (_f.y + _b.y) / 2, (_f.z + _b.z) / 2);
        m.quaternion.copy(orientar(_f.x - _b.x, _f.y - _b.y, _f.z - _b.z, roll));
        if (k > 0) { const cj = E.cajas[k - 1], c = J.carga[k - 1]; cj.visible = !!c; if (c) { cj.material.color.copy(lin(CARGAS[c.tipo].color)); cj.position.copy(m.position).addScaledVector(_up, 1.5); cj.quaternion.copy(m.quaternion); } }
        d += L + P.enganche;
      }
      const V = st.via;
      for (let i = 0; i < V.ests.length; i++) { const e = V.ests[i], cj = E.cajasEst[i]; cj.visible = !!e.espera; if (e.espera) cj.material.color.copy(lin(CARGAS[e.espera.tipo].color)); }
      if (E.caida.visible) { const c = E.caida.userData; c.t += dt || 0; c.vy -= 12 * (dt || 0); E.caida.position.x += c.vx * (dt || 0); E.caida.position.z += c.vz * (dt || 0); E.caida.position.y = Math.max(c.suelo, E.caida.position.y + c.vy * (dt || 0)); E.caida.rotation.x += 2 * (dt || 0); if (c.t > 2.5) E.caida.visible = false; }
      // Ruedas: giran lo que el tren avanzó (ángulo = distancia / radio); bielas: barra horizontal que sigue la manivela de las ruedas
      const ang = J.dist / P.rRueda, rw = E.ruedas; rw.count = 0; _s.set(1, 1, 1);
      for (const [k, x, z] of E.ruedasDe) { const m = E.coches[k]; _m.compose(m.position, m.quaternion, _s); _m2.makeRotationX(ang).setPosition(x, P.rRueda, z); rw.setMatrixAt(rw.count++, _m.multiply(_m2)); }
      rw.instanceMatrix.needsUpdate = true;
      const bl = E.bielas, lo = E.tren; bl.count = 0;
      for (const [sx, fase] of [[-1.03, 0], [1.03, Math.PI / 2]]) { const a = ang + fase; _m.compose(lo.position, lo.quaternion, _s); _m2.makeTranslation(sx, P.rRueda + P.manivela * Math.cos(a), P.manivela * Math.sin(a)); bl.setMatrixAt(bl.count++, _m.multiply(_m2)); }
      bl.instanceMatrix.needsUpdate = true;
      // Haz del farol: se enciende al entrar en el túnel (lo que la cámara ya sabe: cam.tun) y parpadea un poco con el traqueteo
      const luzT = cam.tun; E.haz.visible = luzT > 0.02; if (E.haz.visible) E.haz.material.opacity = luzT * (0.15 + 0.02 * Math.sin(J.dist * 2.1));
      // Humo: bocanadas que salen de la chimenea, suben frenando, se abren y se deshacen (escala y color por instancia: una InstancedMesh)
      const hm = E.humo, dd = dt || 0; hm.count = 0;
      for (let i = E.humos.length - 1; i >= 0; i--) {
        const h = E.humos[i]; h.t += dd; if (h.t > 1.8) { E.humos.splice(i, 1); continue; }
        const u = h.t / 1.8; h.y += (2.8 - 2.0 * u) * dd; h.x += h.vx * dd; h.z += h.vz * dd;
        const e = h.s * (0.45 + 1.6 * Math.sqrt(u)) * (u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1);
        _p.set(h.x, h.y, h.z); _s.set(e, e * 0.85, e); _m.compose(_p, _q.set(0, 0, 0, 1), _s); hm.setMatrixAt(hm.count, _m);
        hm.setColorAt(hm.count++, _c.setScalar(lerp(0.55, 1, Math.min(1, u * 2.2))));
      }
      hm.instanceMatrix.needsUpdate = true; hm.instanceColor.needsUpdate = true; _s.set(1, 1, 1);
    }
    function humear(fuerte) {
      if (REDUCED || !E.tren || E.humos.length >= P.humoMax) return;
      const m = E.tren; _p.set(0, 3.2, 1.5).applyQuaternion(m.quaternion).add(m.position);
      E.humos.push({ x: _p.x, y: _p.y, z: _p.z, t: 0, s: fuerte ? 1.25 : 0.85, vx: 0.5 + (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 0.6 }); // Math.random: el humo no gasta la semilla de las cargas
    }

    // ---------- Carga y estaciones ----------
    function nuevaCarga(est) { const tipos = Object.keys(CARGAS).filter(k => destinoDe(k).id !== est.id); const tipo = tipos[Math.floor(rnd() * tipos.length)]; est.espera = { tipo, destino: destinoDe(tipo).id, t0: J.t }; }
    function repartirCargas() { for (const e of st.via.ests) { e.espera = null; e.proxima = 0; nuevaCarga(e); } }
    function estacionCerca() { const V = st.via; for (const e of V.ests) if (e.segIdx === J.seg && Math.abs(e.s - J.s) <= P.paradaR) return e; return null; }
    function parada(e) {
      const u = st.ui; let txt = [];
      for (let i = J.carga.length - 1; i >= 0; i--) {
        const c = J.carga[i]; if (c.destino !== e.id) continue;
        const resta = P.plazo - (J.t - c.t0), aTiempo = resta >= 0, pts = aTiempo ? P.puntosEntrega + Math.round(P.bonoTiempo * clamp(resta / P.plazo, 0, 1)) : P.puntosTarde;
        J.carga.splice(i, 1); J.puntos += pts; J.entregas++; if (aTiempo) J.aTiempo++;
        txt.push(t('¡Entregada!') + ' +' + pts + ' · ' + t(aTiempo ? '¡A tiempo!' : 'Tarde, pero llegó'));
        if (!REDUCED && G.fx && G.fx.burst && !st.sinFx) { try { G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'gold', 10, S.pos.y + 4); } catch (err) { /* sin fx */ } }
      }
      if (txt.length) sonar('unlock');
      if (e.espera && J.carga.length < P.capacidad) { J.carga.push(e.espera); txt.push(t('¡Cargada!') + ' ' + t(e.espera.tipo) + ' → ' + t(destinoDe(e.espera.tipo).nombre)); e.espera = null; e.proxima = J.t + lerp(P.reaparece[0], P.reaparece[1], rnd()); sonar('pickup', J.carga.length); }
      if (txt.length) { avisar(txt.join(' · '), 2.6); pintar(); }
      if (u) u.chip.classList.add('pop');
    }
    function avisar(texto, s) { J.aviso = texto; J.avisoT = s || 2; if (st.ui) { st.ui.aviso.textContent = texto; st.ui.aviso.hidden = false; } }

    // ---------- Simulación (determinista: un paso de dt s) ----------
    function paso(dt) {
      const V = st.via; if (!V) return;
      if (st.fase === 'listo') { J.humoT += dt; return; }
      if (st.fase === 'fin') { J.finT += dt; J.v = Math.max(0, J.v - P.freno * dt); avanzar(dt); return; }
      J.t += dt; J.resta = Math.max(0, P.duracion - J.t);
      const sg = V.segs[J.seg], q = enVia(sg, J.s);
      // Velocidad: acelerador, freno y rozamiento; la pendiente ayuda o frena un poco
      let a = held.gas ? P.acel : 0; if (held.freno) a -= P.freno; a -= P.rozamiento * (J.v > 0 ? 1 : 0) + q.ty * 2.5;
      J.v = clamp(J.v + a * dt, 0, P.vMax);
      // Curvas: aceleración lateral; tambaleo y, sostenida, se cae una caja (el tren sigue en la vía)
      const kap = sg.kap[q.i]; J.aLat = J.v * J.v * Math.abs(kap);
      const rollObj = clamp((J.aLat - P.aCurva * 0.6) / P.aPerder, 0, 1) * 0.22 * (kap >= 0 ? 1 : -1);
      J.roll += (rollObj - J.roll) * rate(6, dt);
      if (J.aLat > P.aPerder) { J.sobreT += dt; if (J.sobreT >= P.perderT && J.t - J.perdioT > P.perderEspera) perderCaja(kap); } else J.sobreT = Math.max(0, J.sobreT - dt * 2);
      avanzar(dt);
      // Estaciones: parado dentro del radio = carga y entrega (una vez por parada)
      const e = estacionCerca();
      if (e && J.v <= P.vParada) { if (J.parada !== e.id) { J.parada = e.id; parada(e); } } else if (!e || J.v > 1) J.parada = '';
      for (const es of V.ests) if (!es.espera && es.proxima && J.t >= es.proxima) { nuevaCarga(es); es.proxima = 0; }
      // Humo a golpes: una bocanada por media vuelta de rueda en marcha (más gorda al acelerar) y una tranquila cada 0,9 s parado
      J.humoT += dt; if (J.v > 0.5 ? J.humoD >= P.humoVuelta : J.humoT > 0.9) { J.humoT = 0; J.humoD = J.humoD >= P.humoVuelta ? Math.min(J.humoD - P.humoVuelta, P.humoVuelta / 2) : 0; humear(held.gas); }
      // Túnel y puente largo: silbato al entrar y, dentro, retumbe con eco (túnel) o traqueteo de hierro (puente) al ritmo de la marcha
      const sgZ = V.segs[J.seg], zona = sgZ.esp[enVia(sgZ, J.s).i];
      if (zona !== J.zona) { if (zona) sonar('tren_silbato'); J.zona = zona; J.ecoT = 0; }
      if (zona && J.v > 2) { J.ecoT += dt; if (J.ecoT > clamp(7 / J.v, 0.45, 1.6)) { J.ecoT = 0; sonar(zona === 2 ? 'tren_tunel' : 'tren_puente'); } }
      if (J.avisoT > 0) { J.avisoT -= dt; if (J.avisoT <= 0 && st.ui) st.ui.aviso.hidden = true; }
      if (J.resta <= 0) fin();
    }
    function avanzar(dt) {
      const V = st.via; J.s += J.v * dt; J.dist += J.v * dt; J.humoD += J.v * dt;
      let sg = V.segs[J.seg];
      while (J.s >= sg.largo) { J.s -= sg.largo; J.hist.push(J.seg); if (J.hist.length > 4) J.hist.shift(); J.seg = siguienteSeg(V, sg); sg = V.segs[J.seg]; }
    }
    function perderCaja(kap) {
      J.perdioT = J.t; J.sobreT = 0;
      const m = E.coches[Math.min(E.coches.length - 1, J.carga.length)];
      if (J.carga.length) {
        const c = J.carga.pop(); J.perdidas++;
        const cd = E.caida; cd.visible = true; cd.material.color.copy(lin(CARGAS[c.tipo].color)); if (m) { cd.position.copy(m.position).addScaledVector(_up, 1.5); cd.quaternion.copy(m.quaternion); }
        _rt.set(1, 0, 0).applyQuaternion(E.tren.quaternion); const lado = kap >= 0 ? 1 : -1; // hacia fuera de la curva
        cd.userData = { t: 0, vx: _rt.x * 3.5 * lado + (E.tren ? 0 : 0), vz: _rt.z * 3.5 * lado, vy: 2.5, suelo: H(cd.position.x + _rt.x * 2 * lado, cd.position.z + _rt.z * 2 * lado) + 0.5 };
        avisar(t('¡Se cayó una caja! Frena en las curvas.'), 2.8); sonar('wrong');
      } else { avisar(t('¡Uy, qué tambaleo! Frena en las curvas.'), 2.2); sonar('land'); }
      J.v = Math.min(J.v, Math.sqrt(P.aCurva / Math.max(1e-4, Math.abs(kap))) * 0.9);
      if (!REDUCED) { st.hitStop = 0.08; G.camara.shake && G.camara.shake(0.12, 0.3); }
      pintar();
    }
    function fin() {
      st.fase = 'fin'; J.finT = 0; held.gas = held.freno = false;
      const rec = leerRec(), f = rec.tren; J.antes = f.mejor || 0;
      f.jugadas = (f.jugadas || 0) + 1;
      J.nuevo = J.puntos > 0 && (!f.mejor || J.puntos > f.mejor);
      if (J.nuevo) f.mejor = J.puntos;
      J.mejor = f.mejor || 0;
      guardarRec(rec);
      G.emit('retosResultado', { modo: 'tren', puntos: J.puntos, prueba: claveRec !== ALMACEN });
      sonar(J.nuevo ? 'unlock' : 'tick');
      setTimeout(() => { if (st.activo && st.fase === 'fin') resultados(); }, REDUCED ? 0 : P.finPanel * 1000);
    }
    // Lo que actores.js lee para animar a Vittata (posada en el techo de la locomotora; el rig no se toca)
    function sincronizar() {
      const m = E.tren; if (!m) return;
      _p.set(0, 2.6, -1.1).applyQuaternion(m.quaternion).add(m.position);
      S.pos.x = _p.x; S.pos.y = _p.y; S.pos.z = _p.z; S.vy = 0;
      _fw.set(0, 0, 1).applyQuaternion(m.quaternion); const L = Math.hypot(_fw.x, _fw.z) || 1; S.facing = { x: _fw.x / L, z: _fw.z / L };
      M.flying = false; M.landing = false; M.takeoff = 0; M.swimming = false; M.grounded = true; M.dashT = 0; M.posado = 'fino';
      M.vx = 0; M.vz = 0; M.speed = 0; M.fase = ''; M.groundY = S.pos.y;
    }
    function update(dt) {
      if (!st.activo || G.pausa.activa()) return;
      if (st.hitStop > 0) { st.hitStop -= dt; colocar(0); sincronizar(); return; }
      paso(Math.min(dt, 0.05));
      colocar(dt); sincronizar(); pintarVivo();
    }
    G.on('update', dt => update(dt), 46);

    // ---------- Cámara: detrás y por encima, siguiendo la vía (más cerca en los túneles; más alta y lejos en vertical) ----------
    // cam.tun y cam.pte (0 a 1) mezclan sin saltos el plano normal con el del túnel (cerca y bajo) y el lateral del puente largo
    const cam = { pos: new THREE.Vector3(), mira: new THREE.Vector3(), fov: 50, asp: 0, k: 0, tun: 0, pte: 0, lado: 1 };
    let aspMedido = 0;
    function aspecto() { if (cam.asp) return cam.asp; if (aspMedido) return aspMedido; const el = R.renderer && R.renderer.domElement, w = el ? el.clientWidth : innerWidth, h = el ? el.clientHeight : innerHeight; return h > 0 ? (aspMedido = w / h) : 1.6; }
    const vertical = () => aspecto() < 1;
    function fovPara(a) { return a < 1 ? 62 : a < 1.4 ? 56 : 50; }
    function camObjetivo(out) {
      if (st.aerea) return out.set(150, 190, 125);
      if (!st.via) return out.set(S.pos.x, S.pos.y + 6, S.pos.z);
      const dN = vertical() ? 16 : 14, hN = vertical() ? 8.5 : 6, d = lerp(dN, 6.5, cam.tun), h = lerp(hN, 1.9, cam.tun);
      atras(lerp(d, PTE.d, cam.pte), _b);
      const lat = cam.pte * PTE.lat * cam.lado; // plano grúa del puente: más atrás, más alto y algo hacia el lado abierto (z crece hacia el sur: la derecha es (-tz, tx))
      out.set(_b.x - _b.tz * lat, _b.y + lerp(h, PTE.h, cam.pte), _b.z + _b.tx * lat); return out;
    }
    // Plano del puente largo: no se abre de lado sobre el mar (en la costa hay sitios donde el mundo se dibuja en negro, también en HEAD), sino en grúa
    const PTE = { d: 21, h: 10, lat: 5, fov: 6 };
    // A qué plano tiende la cámara: túnel si la locomotora o la cámara están dentro; puente si la locomotora va por un puente largo
    function camZonas(dt) {
      const sg = st.via && st.via.segs[J.seg]; if (!sg) return;
      const q0 = enVia(sg, J.s), i0 = q0.i, q1 = atras(vertical() ? 16 : 14, _b), tun = sg.tipo[i0] === 2 || q1.sg.tipo[q1.i] === 2 ? 1 : 0;
      let pte = sg.esp[i0] === 1 && st.fase !== 'listo' ? 1 : 0;
      if (pte) { // del lado más abierto (el más bajo) y solo si ese sitio está libre: sobre el suelo y fuera de rocas y edificios (solidos.js)
        const b = atras(PTE.d, _b), L = PTE.lat, sitio = s => { const x = b.x - b.tz * L * s, z = b.z + b.tx * L * s, y = b.y + PTE.h, suelo = H(x, z); return y > suelo + 1 && !(G.solidos && G.solidos.activo && G.solidos.dentro(x, z, y) > -Infinity) ? suelo : null; };
        if (cam.pte < 0.02) { const a = sitio(1), c = sitio(-1); cam.lado = a == null ? -1 : c == null ? 1 : a <= c ? 1 : -1; }
        if (sitio(cam.lado) == null) pte = 0; // sin sitio libre: el plano normal
      }
      if (dt == null) { cam.tun = tun; cam.pte = pte; return; }
      cam.tun += (tun - cam.tun) * rate(4, dt); cam.pte += (pte - cam.pte) * rate(1.4, dt);
    }
    function camMira() { if (st.aerea) return cam.mira.set(150, 0, 124); const m = E.tren; if (!m) return cam.mira.set(S.pos.x, S.pos.y, S.pos.z); _fw.set(0, 0, 1).applyQuaternion(m.quaternion); const ad = lerp(vertical() ? 5 : 9, 12, cam.pte); return cam.mira.set(m.position.x + _fw.x * ad, m.position.y + 1.4, m.position.z + _fw.z * ad); }
    function camFollow(dt) { camZonas(dt); camObjetivo(cam.pos); if (dt == null) R.camera.position.copy(cam.pos); else R.camera.position.lerp(cam.pos, rate(5, dt)); }
    function reencuadrar() { if (!st.activo) return; const f = fovPara(aspecto()) + PTE.fov * cam.pte; if (Math.abs(R.camera.fov - f) > 0.01) { R.camera.fov = cam.fov = f; R.camera.updateProjectionMatrix(); } }
    addEventListener('resize', () => { aspMedido = 0; reencuadrar(); }); addEventListener('orientationchange', () => { aspMedido = 0; reencuadrar(); setTimeout(() => { aspMedido = 0; reencuadrar(); }, 350); });
    function camDraw(dt) {
      reencuadrar();
      R.camera.lookAt(camMira());
      const j = G.camara.juice; let sx = 0, sy = 0, sz = 0;
      if (j && j.shake > 0) { j.shake -= dt; const a = j.amp * Math.min(1, Math.max(0, j.shake) / 0.2); sx = (Math.random() - 0.5) * a; sy = (Math.random() - 0.5) * a; sz = (Math.random() - 0.5) * a; R.camera.position.x += sx; R.camera.position.y += sy; R.camera.position.z += sz; if (j.shake <= 0) j.amp = 0; }
      else if (!REDUCED && cam.tun > 0.5 && J.v > 3 && st.fase === 'juego') { const a = 0.035 * cam.tun * J.v / P.vMax; sx = Math.sin(J.dist * 7.3) * a; sy = Math.sin(J.dist * 11.1) * a; R.camera.position.x += sx; R.camera.position.y += sy; } // retumbe del túnel
      if (R.drawScene) R.drawScene(R.camera); else R.renderer.render(scene, R.camera);
      R.camera.position.x -= sx; R.camera.position.y -= sy; R.camera.position.z -= sz;
    }

    // ---------- Récords (el almacén de Retos, clave tren) ----------
    function leerRec() {
      let d = null; try { d = JSON.parse(localStorage.getItem(claveRec) || 'null'); } catch (e) { d = null; }
      if (!d || typeof d !== 'object' || d.v !== 1) d = { v: 1, carrera: {}, tormenta: {}, rio: {}, banquete: {} };
      if (!d.tren || typeof d.tren !== 'object') d.tren = { mejor: null, jugadas: 0 };
      return d;
    }
    function guardarRec(d) { try { localStorage.setItem(claveRec, JSON.stringify(d)); return true; } catch (e) { return false; } }

    // ---------- Interfaz (estilos propios con los tokens de tokens.css) ----------
    const CSS = `
body.tren-on #top, body.tren-on #b-diary, body.tren-on #b-emotes, body.tren-on #b-nido, body.tren-on #prompt, body.tren-on #toast, body.tren-on #keyhint,
body.tren-on #tag, body.tren-on #bocadillos, body.tren-on #emotes, body.tren-on #acts, body.tren-on #stick, body.tren-on #quest-toggle, body.tren-on #guia-hud, body.tren-on #minimapa, body.tren-on #retos { display: none !important; }
html body.tren-on #pause .pause-grid > :not(#b-sound) { display: none !important; }
#tren { position: fixed; inset: 0; z-index: var(--z-card, 30); font-family: var(--font-display, system-ui, sans-serif); color: var(--c-text, #f4f7f1); pointer-events: none; }
#tren [hidden] { display: none !important; }
#tren .tr-toque { position: absolute; inset: 0; pointer-events: auto; touch-action: none; -webkit-user-select: none; user-select: none; }
#tren .tr-hud { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 10px); left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center; }
#tren .tr-chip { background: var(--c-surface, rgba(10,30,20,.85)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-pill, 999px); padding: 5px 14px; display: flex; align-items: baseline; gap: 6px;
  font: 700 22px/1.1 var(--font-display, system-ui); box-shadow: 0 4px 14px rgba(0,0,0,.3); font-variant-numeric: tabular-nums; white-space: nowrap; }
#tren .tr-chip small { font-size: 12px; color: var(--c-text-muted, #b8c7bd); font-weight: 600; }
#tren .tr-chip.pop { animation: tr-pop .25s ease-out; } @keyframes tr-pop { 0% { transform: scale(1.18); } 100% { transform: scale(1); } }
#tren .tr-salir { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 10px); right: calc(env(safe-area-inset-right, 0px) + 10px); pointer-events: auto; }
#tren .tr-aviso { position: absolute; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 58px); transform: translateX(-50%); max-width: min(92vw, 520px); text-align: center; font: 700 clamp(15px, 2.6vw, 20px)/1.25 var(--font-display, system-ui); background: var(--c-surface, rgba(10,30,20,.85)); border-radius: var(--r-md, 12px); padding: 6px 14px; box-shadow: 0 4px 14px rgba(0,0,0,.3); }
#tren .tr-pista { position: absolute; left: 50%; bottom: 30%; transform: translateX(-50%); text-align: center; width: min(92vw, 560px); font: 700 clamp(20px, 4vw, 30px)/1.2 var(--font-display, system-ui); text-shadow: 0 2px 10px rgba(0,0,0,.6); animation: tr-late 1.4s ease-in-out infinite; }
#tren .tr-pista small { display: block; font-size: .6em; font-weight: 600; opacity: .9; margin-top: 4px; }
@keyframes tr-late { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.06); } }
#tren .tr-abajo { position: absolute; left: 0; right: 0; bottom: calc(env(safe-area-inset-bottom, 0px) + 12px); display: grid; gap: 10px; justify-items: center; padding: 0 12px; }
#tren .tr-cargas { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
#tren .tr-carga { display: grid; gap: 3px; min-width: 96px; background: var(--c-surface, rgba(10,30,20,.85)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-md, 12px); padding: 6px 10px; font: 700 13px/1.15 var(--font-display, system-ui); }
#tren .tr-carga.vacia { opacity: .45; }
#tren .tr-carga i { display: block; height: 4px; border-radius: 2px; background: var(--gold, #ffd84a); transform-origin: left; }
#tren .tr-carga b { display: flex; align-items: center; gap: 6px; } #tren .tr-carga b::before { content: ''; width: 12px; height: 12px; border-radius: 3px; background: var(--col, #fff); }
#tren .tr-fila { display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; }
#tren .tr-btn { pointer-events: auto; touch-action: none; -webkit-user-select: none; user-select: none; min-width: 108px; min-height: 56px; font: 800 20px/1 var(--font-display, system-ui); }
#tren .tr-btn.on { filter: brightness(1.25); transform: scale(.96); }
#tren .tr-desvio { display: flex; gap: 6px; align-items: center; background: var(--c-surface, rgba(10,30,20,.85)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-pill, 999px); padding: 4px 6px; font: 700 14px/1.1 var(--font-display, system-ui); }
#tren .tr-desvio button { pointer-events: auto; min-width: 44px; min-height: 40px; }
#tren .tr-desvio button.on { outline: 3px solid var(--gold, #ffd84a); }
#tren .tr-desvio .pista { color: var(--gold, #ffd84a); }
#tren .tr-fin { position: absolute; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(5, 18, 12, .35); overflow: auto; }
#tren .tr-panel { pointer-events: auto; background: var(--c-surface, rgba(10,30,20,.92)); border: 1px solid var(--c-line, rgba(255,255,255,.2)); border-radius: var(--r-lg, 18px); padding: 18px 22px; width: min(92vw, 440px); text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
#tren .tr-panel h2 { margin: 0 0 4px; font-size: 28px; } #tren .tr-panel p { margin: 4px 0 10px; color: var(--c-text-muted, #b8c7bd); }
#tren .tr-num { font: 800 58px/1 var(--font-display, system-ui); color: var(--gold, #ffd84a); margin: 4px 0; }
#tren .tr-meta { margin: 0 0 8px; display: grid; gap: 4px; font-weight: 700; color: var(--gold, #ffd84a); }
#tren .tr-medalla { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: 800; margin-bottom: 6px; background: rgba(255,255,255,.1); }
#tren .tr-medalla.oro { background: #d4a017; color: #2b1d00; } #tren .tr-medalla.plata { background: #c0c7cf; color: #1d2328; } #tren .tr-medalla.bronce { background: #b87333; color: #2b1400; }
#tren .tr-nuevo { color: var(--gold, #ffd84a); font-weight: 800; margin-bottom: 6px; }
#tren .tr-sabias { font-size: 13px; text-align: left; background: rgba(255,255,255,.06); border-radius: var(--r-md, 12px); padding: 8px 10px; margin: 8px 0 4px; } #tren .tr-sabias b { display: block; margin-bottom: 2px; }
#tren .tr-botones { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
#tren .tr-tecla { font-size: 12px; opacity: .75; margin-left: 6px; }
@media (prefers-reduced-motion: reduce) { #tren .tr-pista, #tren .tr-chip.pop { animation: none; } }
@media (max-height: 520px) { #tren .tr-pista { bottom: 38%; } }
@media (max-width: 520px) { #tren .tr-hud { left: 10px; transform: none; gap: 6px; } #tren .tr-chip { font-size: 17px; padding: 4px 10px; } #tren .tr-chip small { font-size: 11px; } #tren .tr-aviso { top: calc(env(safe-area-inset-top, 0px) + 50px); } }`;
    function montarUI() {
      if (st.ui) return st.ui;
      const css = document.createElement('style'); css.id = 'tren-css'; css.textContent = CSS; document.head.appendChild(css);
      const el = document.createElement('div'); el.id = 'tren'; el.hidden = true; el.setAttribute('data-no-tr', '');
      el.innerHTML = `
<div class="tr-toque"></div>
<div class="tr-hud"><div class="tr-chip"><span class="tr-puntos">0</span><small class="tr-mejor"></small></div><div class="tr-chip tr-reloj"><span class="tr-tiempo">2:30</span></div><div class="tr-chip"><span class="tr-vel">0</span><small>km/h</small></div></div>
<button class="btn ghost secondary tr-salir" type="button" data-salir data-icon="close"></button>
<div class="tr-aviso" hidden></div>
<div class="tr-pista"></div>
<div class="tr-abajo">
  <div class="tr-cargas"></div>
  <div class="tr-desvio" hidden><button class="btn secondary" type="button" data-via="0">◀ <span class="tr-izq"></span></button><span class="tr-dlabel"></span><button class="btn secondary" type="button" data-via="1"><span class="tr-der"></span> ▶</button></div>
  <div class="tr-fila"><button class="btn secondary tr-btn" type="button" data-freno></button><button class="btn tr-btn" type="button" data-gas></button></div>
</div>
<div class="tr-fin" hidden><div class="tr-panel" role="dialog" aria-labelledby="tr-fin-t">
  <h2 id="tr-fin-t"></h2>
  <div class="tr-medalla" hidden></div>
  <div class="tr-num">0</div>
  <div class="tr-nuevo" hidden></div>
  <p class="tr-rec"></p>
  <p class="tr-meta" hidden></p>
  <div class="tr-sabias"><b></b><span></span></div>
  <div class="tr-botones">
    <button class="btn xl" type="button" data-otra data-icon="reset"></button>
    <button class="btn ghost secondary" type="button" data-salir data-icon="close"></button>
  </div>
</div></div>`;
      document.body.appendChild(el);
      const q = s => el.querySelector(s);
      st.ui = { el, toque: q('.tr-toque'), chip: q('.tr-chip'), puntos: q('.tr-puntos'), mejor: q('.tr-mejor'), tiempo: q('.tr-tiempo'), vel: q('.tr-vel'), aviso: q('.tr-aviso'), pista: q('.tr-pista'), cargas: q('.tr-cargas'), desvio: q('.tr-desvio'), izq: q('.tr-izq'), der: q('.tr-der'), dlabel: q('.tr-dlabel'),
        gas: q('[data-gas]'), freno: q('[data-freno]'), fin: q('.tr-fin'), num: q('.tr-num'), medalla: q('.tr-medalla'), nuevo: q('.tr-nuevo'), rec: q('.tr-rec'), meta: q('.tr-meta'), sabias: q('.tr-sabias') };
      const u = st.ui;
      u.toque.addEventListener('pointerdown', e => { e.preventDefault(); toque(); });
      for (const [b, k] of [[u.gas, 'gas'], [u.freno, 'freno']]) {
        const on = e => { e.preventDefault(); if (st.fase === 'listo') toque(); held[k] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ } };
        const off = () => { held[k] = false; b.classList.remove('on'); };
        b.addEventListener('pointerdown', on); for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, off);
      }
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-otra')) otraVez(); else if (b.hasAttribute('data-via')) elegir(+b.getAttribute('data-via')); else if (b.hasAttribute('data-salir')) salir(); });
      const tecla = (e, abajo) => {
        if (!st.activo || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target && e.target.closest && e.target.closest('#tren button, input, select, textarea, #pause')) return;
        if (G.pausa.activa()) return;
        const k = e.key, K = k.length === 1 ? k.toLowerCase() : k;
        if (st.fase === 'fin') { if (abajo && !e.repeat && (k === 'Enter' || k === ' ' || K === 'r')) { e.preventDefault(); toque(); } return; }
        if (K === 'ArrowUp' || K === 'w' || k === ' ') { e.preventDefault(); if (abajo && st.fase === 'listo') toque(); held.gas = abajo; }
        else if (K === 'ArrowDown' || K === 's') { e.preventDefault(); if (abajo && st.fase === 'listo') toque(); held.freno = abajo; }
        else if (abajo && !e.repeat && (K === 'ArrowLeft' || K === 'a')) { e.preventDefault(); elegir(0); }
        else if (abajo && !e.repeat && (K === 'ArrowRight' || K === 'd')) { e.preventDefault(); elegir(1); }
        else if (abajo && !e.repeat && k === 'Enter' && st.fase === 'listo') { e.preventDefault(); toque(); }
      };
      addEventListener('keydown', e => tecla(e, true), true); addEventListener('keyup', e => tecla(e, false), true); addEventListener('blur', () => { held.gas = held.freno = false; });
      G.on('aula', (k) => { if (k === 'idioma' && st.activo) { textos(); pintar(); if (st.fase === 'fin') resultados(); } });
      textos();
      return st.ui;
    }
    // Textos fijos (ES/EN) del HUD y los resultados
    function textos() {
      const u = st.ui; if (!u) return;
      u.el.querySelector('.tr-salir').setAttribute('aria-label', t('Salir del tren')); u.el.querySelector('.tr-salir').textContent = t('Salir');
      u.pista.innerHTML = '<span></span><small></small>'; u.pista.firstChild.textContent = t('¡Toca para arrancar!'); u.pista.lastChild.textContent = t('Acelera, frena en las curvas y entrega cada carga en su estación.');
      u.gas.textContent = t('¡Dale!'); u.freno.textContent = t('Freno'); u.dlabel.textContent = t('Desvío');
      u.el.querySelector('#tr-fin-t').textContent = t('Fin del turno'); u.nuevo.textContent = t('¡Nuevo récord!');
      u.el.querySelector('[data-otra]').innerHTML = ''; u.el.querySelector('[data-otra]').append(t('Otra vez')); if (!TACTIL) { const s = document.createElement('span'); s.className = 'tr-tecla'; s.textContent = 'Enter'; u.el.querySelector('[data-otra]').append(s); }
      u.el.querySelector('.tr-botones [data-salir]').textContent = t('Volver a la historia');
      u.sabias.firstElementChild.textContent = t('¿Sabías que…?');
    }
    const reloj = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    function pintar() {
      const u = st.ui; if (!u) return;
      u.puntos.textContent = String(J.puntos); u.mejor.textContent = J.mejor ? t('tu mejor') + ' ' + J.mejor : '';
      u.chip.classList.remove('pop'); void u.chip.offsetWidth; u.chip.classList.add('pop');
      let html = '';
      for (let i = 0; i < P.capacidad; i++) { const c = J.carga[i]; html += c ? `<div class="tr-carga" style="--col:#${CARGAS[c.tipo].color.toString(16).padStart(6, '0')}"><b>${t(c.tipo)}</b><span>→ ${t(destinoDe(c.tipo).nombre)}</span><i></i></div>` : `<div class="tr-carga vacia"><b>${t('Sin carga')}</b><span>&nbsp;</span><i style="transform:scaleX(0)"></i></div>`; }
      u.cargas.innerHTML = html;
    }
    // Lo que cambia cada cuadro: reloj, velocidad, barras de plazo, aviso de estación/desvío/curva
    function pintarVivo() {
      const u = st.ui, V = st.via; if (!u || !V) return;
      const rl = reloj(J.resta), vl = String(Math.round(J.v * 3.6)); if (rl !== u.tiempoTxt) u.tiempo.textContent = u.tiempoTxt = rl; if (vl !== u.velTxt) u.vel.textContent = u.velTxt = vl;
      const barras = u.cargas.querySelectorAll('.tr-carga i'); for (let i = 0; i < J.carga.length; i++) { const c = J.carga[i], k = clamp(1 - (J.t - c.t0) / P.plazo, 0, 1); if (barras[i]) { barras[i].style.transform = 'scaleX(' + k.toFixed(3) + ')'; barras[i].style.background = k > 0.3 ? '' : '#ff7a59'; } }
      if (st.fase !== 'juego') { u.desvio.hidden = true; return; }
      // Desvío a la vista: las dos vías y, si una carga va a una estación de una de ellas, «por aquí»
      const sg = V.segs[J.seg], nd = V.nodos[sg.a], dNodo = sg.largo - J.s;
      if (nd.sal.length >= 2 && dNodo <= P.avisoDesvio) {
        if (u.desvio.hidden || u.desvio.dataset.nodo !== nd.id) { u.desvio.hidden = false; u.desvio.dataset.nodo = nd.id; const nom = i => { const e = V.ests.find(q => q.segIdx === nd.sal[i]); return e ? t(e.nombre) : t(i ? 'derecha' : 'izquierda'); }; u.izq.textContent = nom(0); u.der.textContent = nom(1); }
        const bs = u.desvio.querySelectorAll('[data-via]'), el = J.desvio[nd.id] ? 1 : 0; bs[0].classList.toggle('on', el === 0); bs[1].classList.toggle('on', el === 1);
        const ideal = J.carga.length ? nd.sal.findIndex(i => J.carga.some(c => V.ests.find(q => q.id === c.destino).segIdx === i)) : -1;
        for (let i = 0; i < 2; i++) bs[i].classList.toggle('pista', ideal === i);
      } else u.desvio.hidden = true;
      if (J.avisoT > 0) return;
      // Aviso de estación próxima (frena y para) o de curva (baja a N)
      let txt = '';
      for (const e of V.ests) if (e.segIdx === J.seg && e.s - J.s > -P.paradaR && e.s - J.s < P.avisoEstacion) { const lleva = J.carga.some(c => c.destino === e.id), hay = !!e.espera && J.carga.length < P.capacidad; txt = t('Estación') + ': ' + t(e.nombre) + (lleva || hay ? ' · ' + t('Frena y para') : ''); break; }
      if (!txt) for (const c of sg.curvas) if (c.i0 - J.s > -2 && c.i0 - J.s < P.avisoCurva && J.v > c.v) { txt = t('Curva: baja a') + ' ' + Math.round(c.v * 3.6) + ' km/h'; break; }
      if (!txt) { const q = enVia(sg, J.s); if (sg.esp[q.i] === 2) txt = t('Túnel'); else if (sg.esp[q.i] === 1) txt = t('Puente'); }
      if (txt !== u.aviso.textContent || u.aviso.hidden === !!txt) { u.aviso.textContent = txt; u.aviso.hidden = !txt; }
    }
    function elegir(i) { const V = st.via; if (!V || !st.activo) return; const nd = V.nodos[V.segs[J.seg].a]; if (nd.sal.length < 2) return; J.desvio[nd.id] = i ? 1 : 0; sonar('tick'); pintarVivo(); }
    function toque() {
      if (!st.activo) return false;
      if (st.fase === 'listo') { st.fase = 'juego'; J.t = 0; if (st.ui) st.ui.pista.hidden = true; sonar('jump'); return true; }
      if (st.fase === 'fin' && J.finT >= P.finEspera) { otraVez(); return true; }
      return false;
    }
    const ART = { oro: 'el oro', plata: 'la plata', bronce: 'el bronce' };
    const medallaDe = p => { let m = ''; for (const [n, v] of MEDALLAS) if (p >= v) m = n; return m; };
    function metaLineas() {
      const L = [], v = J.puntos, best = J.mejor || 0, tope = Math.max(v, best), nivel = x => MEDALLAS.filter(m => x >= m[1]).length;
      if (v > 0 && v < best && best - v <= Math.max(40, Math.round(best * 0.2))) L.push(tf('¡A solo {} puntos del récord!', best - v));
      if (nivel(J.mejor) > nivel(J.antes || 0)) L.unshift(tf('¡Nuevo sello de {} en Mis récords!', t(MEDALLAS[nivel(J.mejor) - 1][0])));
      const sig = MEDALLAS.find(m => m[1] > tope);
      L.push(sig ? tf('Te faltan {} puntos para {}', sig[1] - tope, t(ART[sig[0]])) : t('¡Tienes todas las medallas! Intenta superar tu récord.'));
      return L;
    }
    function resultados() {
      const u = st.ui; if (!u) return;
      u.num.textContent = String(J.puntos);
      const m = medallaDe(J.puntos); u.medalla.hidden = !m; u.medalla.className = 'tr-medalla ' + m; u.medalla.textContent = m ? '★ ' + t(m) : '';
      u.nuevo.hidden = !J.nuevo;
      u.rec.textContent = J.entregas ? J.entregas + ' ' + t(J.entregas === 1 ? 'entrega' : 'entregas') + ' · ' + J.aTiempo + ' ' + t('a tiempo') + (J.perdidas ? ' · ' + J.perdidas + ' ' + t('cajas caídas') : '') + (J.mejor ? ' · ' + t('tu mejor') + ': ' + J.mejor : '') : t('Haz una entrega para tener tu primer récord.');
      const ls = metaLineas(); u.meta.innerHTML = ls.map(x => '<span>' + x + '</span>').join(''); u.meta.hidden = !ls.length;
      const sb = SABIAS[J.semilla % SABIAS.length]; u.sabias.lastElementChild.textContent = ingles() ? sb[1] : sb[0];
      u.fin.hidden = false; u.desvio.hidden = true; u.aviso.hidden = true;
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
      cam3.fov = cam.fov = fovPara(aspecto()); cam3.updateProjectionMatrix();
      if (G.actores.companion3D) G.actores.companion3D.root.visible = false;
      document.body.classList.add('tren-on', 'retos-on');
      if (!st.via) { st.via = construirVia(); construirEscena(); st.listo = true; }
      despejarFlora();
      raiz.visible = true; if (!raiz.parent) scene.add(raiz);
      st.activo = true;
      return true;
    }
    function iniciar(semilla) {
      const V = st.via;
      rnd = G.util.rng(J.semilla = semilla || ((Date.now() ^ (Math.random() * 1e9)) >>> 0 || 1));
      const e0 = V.ests.find(e => e.id === 'playa'), sg0 = V.segs[e0.segIdx];
      Object.assign(J, { seg: e0.segIdx, s: e0.s, v: 0, t: 0, resta: P.duracion, puntos: 0, entregas: 0, aTiempo: 0, perdidas: 0, carga: [], hist: [V.nodos[sg0.de].ent[0]], desvio: {}, roll: 0, aLat: 0, sobreT: 0, perdioT: -1e9, parada: '', finT: 0, nuevo: false, humoT: 0, humoD: 0, zona: 0, ecoT: 0, aviso: '', avisoT: 0, mejor: leerRec().tren.mejor || 0 });
      held.gas = held.freno = false; st.fase = 'listo'; st.hitStop = 0; E.humos.length = 0; if (E.caida) E.caida.visible = false;
      repartirCargas();
      const u = st.ui; if (u) { u.el.hidden = false; u.fin.hidden = true; u.pista.hidden = false; u.aviso.hidden = true; u.desvio.hidden = true; pintar(); u.chip.classList.remove('pop'); pintarVivo(); }
      colocar(0); sincronizar();
      camFollow(null); G.camara.place(true);
      if (G.actores.player3D) G.actores.player3D.root.visible = true;
    }
    // «Otra vez» rápido: el turno nuevo arranca ya (sin la pantalla de «Toca para arrancar»), con el silbato
    function otraVez() {
      if (!st.activo) return false;
      iniciar(); st.fase = 'juego'; J.t = 0; if (st.ui) st.ui.pista.hidden = true;
      avisar(t('¡Vámonos!'), 1.2); sonar('tren_silbato');
      return true;
    }
    function abrir() {
      montarUI(); aspMedido = 0;
      if (!st.activo && !libre()) { G.ui.toast(ingles() ? "Finish what you're doing and try the train again." : 'Termina lo que estás haciendo y vuelve a probar el tren.', 3200); return Promise.resolve(false); }
      if (!$('creator').hidden) { st.creador = true; G.creador.close(); }
      const ir = () => (G.mundo && G.mundo.listo ? Promise.resolve(G.mundo.listo) : Promise.resolve()); // el terreno exacto ya cargado: la vía se calcula con él
      return ir().then(() => { entrar(); iniciar(); return true; }, e => { G.ui.toast('No se pudo abrir el tren. Prueba otra vez.', 3000); console.error('tren:', e); return false; });
    }
    function salir() {
      if (!st.activo) { if (st.ui) st.ui.el.hidden = true; document.body.classList.remove('tren-on', 'retos-on'); return; }
      const env = st.env, C = G.camara, cam3 = R.camera;
      raiz.visible = false; st.fase = 'nada'; held.gas = held.freno = false;
      G.ui.busy = env.busy; F.step = env.step; G.interaccion.action = env.action;
      for (const k of ['tryJump', 'releaseJump', 'tryDash', 'toggleFly', 'land', 'startFlying']) F[k] = env[k];
      C.follow = env.follow; C.fov = env.fov; C.draw = env.draw; C.manual = env.manual;
      cam3.fov = env.camFov; cam3.updateProjectionMatrix();
      if (G.actores.companion3D && env.companero != null) G.actores.companion3D.root.visible = env.companero;
      document.body.classList.remove('tren-on', 'retos-on');
      F.endFlight(); M.vx = M.vz = 0; M.speed = 0; M.dashT = 0; M.landing = false; M.takeoff = 0; M.fase = ''; M.posado = '';
      G.guardado.restaurar(st.snap); st.snap = null;
      G.guardado.suspender(false); G.quiet = st.quiet;
      if (st.creador && !(S.profile && S.profile.created)) G.creador.open(true); st.creador = false;
      const pj = G.actores.player3D; if (pj) pj.root.visible = true;
      G.camara.place(true);
      if (st.ui) st.ui.el.hidden = true;
      st.activo = false; st.env = null;
      reponerFlora(); liberarEscena();
    }
    function liberar() { if (st.activo) salir(); else liberarEscena(); }

    // ---------- Pruebas: AV.trenTest() ----------
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
      const tick = (s, dt) => { dt = dt || 1 / 30; for (let x = 0; x < s - 1e-9; x += dt) { paso(dt); if (st.fase !== 'juego') break; } };
      const irA = (segId, s) => { const V = st.via, sg = V.segs.find(q => q.id === segId); J.hist = [V.nodos[sg.de].ent[0]]; J.seg = sg.idx; J.s = s; J.v = 0; J.parada = ''; };
      // Robot: acelera, frena para las curvas y las estaciones donde tiene algo que hacer, y elige en el desvío la vía de su primera carga
      const robot = (segundos, dt) => {
        dt = dt || 1 / 30; const V = st.via; let pasos = 0;
        while (st.fase === 'juego' && pasos++ < segundos / dt) {
          const sg = V.segs[J.seg]; let vObj = P.vMax;
          for (const c of sg.curvas) { const d = c.i0 - J.s; if (d > -1 && d < 40) vObj = Math.min(vObj, c.v); }
          const q = enVia(sg, J.s); vObj = Math.min(vObj, vSegura(sg, q.i) * 0.98);
          for (const e of V.ests) if (e.segIdx === J.seg) { const d = e.s - J.s, util = J.carga.some(c => c.destino === e.id) || (e.espera && J.carga.length < P.capacidad); if (util && d > -1 && d < 45 && J.parada !== e.id) vObj = Math.min(vObj, Math.max(0, Math.sqrt(2 * (P.freno - 1) * Math.max(0, d - 1.5)))); }
          const nd = V.nodos[sg.a]; if (nd.sal.length >= 2 && J.carga.length) { const dest = V.ests.find(e => e.id === J.carga[0].destino); const i = nd.sal.indexOf(dest.segIdx); if (i >= 0) J.desvio[nd.id] = i; }
          held.gas = J.v < vObj - 0.3; held.freno = J.v > vObj + 0.3;
          paso(dt);
        }
        held.gas = held.freno = false;
        return { puntos: J.puntos, entregas: J.entregas, aTiempo: J.aTiempo, perdidas: J.perdidas };
      };
      let sAntes = null;
      return (async () => {
        try {
          sAntes = comparable(S);
          check('Declaración completa (id, nombre, recursos, cámara, controles, inicio, derrota, puntuación, música, resultados, récords)', ['id', 'nombre', 'descripcion', 'recursos', 'camara', 'controles', 'inicio', 'derrota', 'puntuacion', 'musica', 'resultados', 'records'].every(k => DECL[k] != null));
          // ---------- Entrar ----------
          const ok = await abrir();
          const V = st.via;
          check('Entra con el mundo libre y la vía construida en la escena', ok === true && st.activo && raiz.parent === scene && V && V.segs.length === 6, V && V.largo + ' m de vía');
          check('Envolturas: la historia ve el mundo ocupado, fisica no manda y la cámara es la del tren', G.ui.busy() === true && F.step !== step0 && G.camara.follow !== follow0 && G.camara.draw !== draw0);
          check('Clases tren-on y retos-on, HUD a la vista y pista «Toca para arrancar»', document.body.classList.contains('tren-on') && document.body.classList.contains('retos-on') && !st.ui.el.hidden && !st.ui.pista.hidden);
          // ---------- La vía ----------
          const nTun = V.segs.reduce((a, s) => a + s.tuneles.length, 0), nPue = V.segs.reduce((a, s) => a + s.puentes.filter(p => p[1] - p[0] >= 20).length, 0);
          check('La vía da la vuelta: cada tramo empalma con el siguiente (misma altura en los nodos) y suma más de 500 m', V.largo > 500 && V.segs.every(sg => Math.abs(sg.y[0] - V.nodos[sg.de].y) < 0.05 && Math.abs(sg.y[sg.n - 1] - V.nodos[sg.a].y) < 0.05), V.largo + ' m');
          check('Pendiente ≤ ' + (P.grado * 100) + ' % en toda la vía (salvo el empalme de los nodos)', V.segs.every(sg => sg.ty.every((g, i) => i < 26 || i > sg.n - 27 || Math.abs(g) <= P.grado + 0.02)));
          check('Hay al menos un túnel y un puente largo (≥ 20 m), los momentos especiales', nTun >= 1 && nPue >= 1, nTun + ' túneles · ' + nPue + ' puentes largos');
          check('Dos desvíos con dos vías cada uno (izquierda y derecha) y los demás nodos con una salida', Object.values(V.nodos).filter(n => n.sal.length === 2).length === 2 && Object.values(V.nodos).every(n => n.sal.length >= 1 && n.sal.length <= 2));
          { const nd = V.nodos.A, izq = V.segs[nd.sal[0]], der = V.segs[nd.sal[1]]; check('En el desvío de la playa la vía de la izquierda es la del interior (poza) y la de la derecha la de la costa', izq.id === 'poza' && der.id === 'costa', izq.id + '/' + der.id); }
          check('Seis estaciones, cada una en su tramo y con una carga esperando; cada carga tiene su estación de destino', V.ests.length === 6 && V.ests.every(e => e.espera && destinoDe(e.espera.tipo) && destinoDe(e.espera.tipo).id !== e.id && V.segs[e.segIdx].id === e.seg));
          check('Hay señales de curva (vía con velocidad segura < 13 m/s) y la vía tiene curvatura con signo', V.segs.some(sg => sg.curvas.length) && V.segs.some(sg => sg.kap.some(k => k > 0.004)) && V.segs.some(sg => sg.kap.some(k => k < -0.004)));
          check('Vittata va posada en la locomotora (no vuela ni nada) mirando por la vía', M.flying === false && M.swimming === false && M.posado === 'fino' && Math.hypot(S.pos.x - E.tren.position.x, S.pos.z - E.tren.position.z) < 2 && S.pos.y > E.tren.position.y + 1.5, S.pos.x.toFixed(0) + ',' + S.pos.z.toFixed(0));
          // ---------- Cámara: escritorio y móvil vertical 375×812 ----------
          const vista = asp => { const a0 = cam.asp; cam.asp = asp; const c = new THREE.PerspectiveCamera(fovPara(asp), asp, 0.1, 500); camObjetivo(c.position); c.lookAt(camMira()); c.updateMatrixWorld(true); cam.asp = a0;
            const pr = (x, y, z) => { const v = new THREE.Vector3(x, y, z).project(c); return { x: v.x, y: v.y, z: v.z }; }; const m = E.tren; _fw.set(0, 0, 1).applyQuaternion(m.quaternion);
            return { T: pr(m.position.x, m.position.y + 1, m.position.z), A: pr(m.position.x + _fw.x * 25, m.position.y, m.position.z + _fw.z * 25) }; };
          const enVista = p => p.z > 0 && p.z < 1 && Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95;
          const vd = vista(16 / 9), vm = vista(375 / 812);
          check('Escritorio: la locomotora y la vía 25 m por delante caen en pantalla', enVista(vd.T) && enVista(vd.A), 'T ' + vd.T.x.toFixed(2) + ',' + vd.T.y.toFixed(2) + ' · A ' + vd.A.x.toFixed(2) + ',' + vd.A.y.toFixed(2));
          check('Móvil vertical 375×812: la locomotora (mitad inferior) y la vía 25 m por delante caen en pantalla', enVista(vm.T) && vm.T.y < 0.1 && enVista(vm.A), 'T ' + vm.T.x.toFixed(2) + ',' + vm.T.y.toFixed(2) + ' · A ' + vm.A.x.toFixed(2) + ',' + vm.A.y.toFixed(2));
          // ---------- Arrancar, acelerar, frenar ----------
          check('Antes del primer toque el tren espera en la Playa (fase listo, parado)', st.fase === 'listo' && J.v === 0 && V.segs[J.seg].id === 'oeste' && (tick(1), st.fase === 'listo'));
          toque();
          check('El primer toque arranca el turno (fase juego, reloj en marcha)', st.fase === 'juego' && J.t === 0 && (tick(0.5), J.t > 0.4 && J.resta < P.duracion));
          held.gas = true; tick(3); const v1 = J.v, s1 = J.s; held.gas = false;
          check('Acelerar: a los 3 s va a más de 8 m/s y avanzó por la vía', v1 > 8 && J.s > s1 - 1 && J.s > 0, v1.toFixed(1) + ' m/s');
          held.freno = true; tick(3); held.freno = false;
          check('Frenar: se detiene en menos de 3 s y nunca va hacia atrás', J.v === 0 && J.s >= s1);
          held.gas = true; tick(12); const vTope = J.v; held.gas = false;
          check('Tope de velocidad ' + P.vMax + ' m/s', vTope <= P.vMax + 1e-6 && vTope > P.vMax * 0.7, vTope.toFixed(1));
          // ---------- Ruedas, bielas y humo animados ----------
          { colocar(0); const r0 = E.ruedas.instanceMatrix.array.slice(0, 16), b0 = E.bielas.instanceMatrix.array.slice(0, 16), d0 = J.dist; E.humos.length = 0; J.humoD = 0;
            held.gas = true; tick(1); held.gas = false; colocar(1 / 30);
            const r1 = E.ruedas.instanceMatrix.array, b1 = E.bielas.instanceMatrix.array, dif = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 1e-3);
            check('Las ruedas (' + E.ruedasDe.length + ', con radios) giran y las bielas se mueven con la distancia recorrida', E.ruedas.count === 4 * E.coches.length && E.bielas.count === 2 && J.dist > d0 + 5 && dif(r0, r1) && dif(b0, b1), (J.dist - d0).toFixed(1) + ' m');
            check('El humo sale a golpes de la chimenea al ritmo de las ruedas (una bocanada por media vuelta) y se dibuja con su escala y color', REDUCED || (E.humos.length >= Math.floor((J.dist - d0) / P.humoVuelta) - 2 && E.humos.length >= 3 && E.humo.count === E.humos.length && E.humo.instanceColor.array[0] > 0), E.humos.length + ' bocanadas'); }
          // ---------- Estación: parar, cargar, llevar y entregar ----------
          const nRec = J.t; irA('oeste', V.ests.find(e => e.id === 'playa').s - 2); J.carga = []; J.t = nRec;
          const esp = V.ests.find(e => e.id === 'playa'); if (!esp.espera) nuevaCarga(esp); const tipo0 = esp.espera.tipo, dest0 = destinoDe(tipo0);
          J.v = 0; J.parada = ''; tick(0.1);
          check('Parar en una estación carga la caja que espera (sale del andén, sube al vagón) y el HUD la enseña con su destino', J.carga.length === 1 && J.carga[0].tipo === tipo0 && !esp.espera && esp.proxima > J.t && st.ui.cargas.querySelectorAll('.tr-carga:not(.vacia)').length === 1 && new RegExp(destinoDe(tipo0).nombre).test(st.ui.cargas.textContent), tipo0 + ' → ' + dest0.nombre);
          check('Pasar por la estación sin parar no carga ni entrega', (J.parada = '', J.v = 6, tick(0.2), J.carga.length === 1 && J.v > 0));
          { const p0 = J.puntos, e0 = J.entregas; irA(V.segs[dest0.segIdx].id, dest0.s + 1); dest0.espera = null; dest0.proxima = 0; J.v = 0; tick(0.1);
            check('Entregar en la estación de destino: +' + P.puntosEntrega + ' y hasta +' + P.bonoTiempo + ' a tiempo; la caja sale del tren', J.carga.length === 0 && J.entregas === e0 + 1 && J.aTiempo >= 1 && J.puntos >= p0 + P.puntosEntrega && J.puntos <= p0 + P.puntosEntrega + P.bonoTiempo, '+' + (J.puntos - p0)); }
          { const e2 = V.ests.find(e => e.id === 'faro'); irA('costa', e2.s + 1); e2.espera = null; e2.proxima = 0; J.carga = [{ tipo: 'cartas', destino: 'faro', t0: J.t - P.plazo - 5 }]; const p0 = J.puntos; J.v = 0; J.parada = ''; tick(0.1);
            check('Una entrega tarde vale ' + P.puntosTarde + ' (siempre cuenta)', J.carga.length === 0 && J.puntos === p0 + P.puntosTarde, '+' + (J.puntos - p0)); }
          { const e3 = V.ests.find(e => e.id === 'bosque'); irA('bosque', e3.s + 1); e3.espera = { tipo: 'caña', destino: 'central', t0: J.t }; J.carga = [{ tipo: 'frutas', destino: 'mercado', t0: J.t }, { tipo: 'cartas', destino: 'faro', t0: J.t }, { tipo: 'tortuguitas', destino: 'playa', t0: J.t }]; J.v = 0; J.parada = ''; tick(0.1);
            check('Con los ' + P.capacidad + ' vagones llenos no se carga más (la caja sigue esperando)', J.carga.length === P.capacidad && !!e3.espera); }
          { const e3 = V.ests.find(e => e.id === 'bosque'); e3.espera = null; e3.proxima = J.t + 1; tick(1.2); check('La estación vuelve a tener carga pasados unos segundos', !!e3.espera && e3.proxima === 0); }
          // ---------- Desvío ----------
          { irA('oeste', V.segs[0].largo - 20); J.carga = []; J.desvio = {}; J.v = 10; held.gas = true; tick(4); held.gas = false; const tomada0 = V.segs[J.seg].id;
            irA('oeste', V.segs[0].largo - 20); elegir(1); J.v = 10; held.gas = true; tick(4); held.gas = false; const tomada1 = V.segs[J.seg].id;
            check('En el desvío de la playa, ◀ lleva a la poza (por defecto) y ▶ a la costa', tomada0 === 'poza' && tomada1 === 'costa' && J.desvio.A === 1, tomada0 + ' / ' + tomada1);
            check('Los vagones siguen por donde vino el tren (historial de tramos) y el tren queda entero', J.hist.length >= 1 && V.segs[J.hist[J.hist.length - 1]].id === 'oeste' && (colocar(0), E.coches.every((m, i) => i === 0 || m.position.distanceTo(E.coches[i - 1].position) < P.largoLoco + P.largoVagon)), J.hist.map(i => V.segs[i].id).join('>')); }
          { pintarVivo(); irA('oeste', V.segs[0].largo - 30); J.carga = [{ tipo: 'cartas', destino: 'faro', t0: J.t }]; st.fase = 'juego'; pintarVivo();
            check('A 45 m del desvío el HUD enseña las dos vías con su estación y marca «por aquí» la del destino de la carga', !st.ui.desvio.hidden && st.ui.izq.textContent === 'Mercado' && st.ui.der.textContent === 'Faro' && st.ui.desvio.querySelector('[data-via="1"]').classList.contains('pista'), st.ui.izq.textContent + '|' + st.ui.der.textContent); }
          // ---------- Túnel y puente: silbato, eco, farol y cámara ----------
          { const oidos = [], play0 = G.audio.play; G.audio.play = function (n) { oidos.push(n); return play0.apply(this, arguments); };
            const cuadros = (s, v) => { for (let k = 0; k < s * 30 && st.fase === 'juego'; k++) { J.v = Math.max(J.v, v); paso(1 / 30); camFollow(1 / 30); colocar(1 / 30); } };
            try {
              const sgT = V.segs.find(sg => sg.tuneles.length), tn = sgT.tuneles[0]; irA(sgT.id, Math.max(0, tn[0] - 12)); J.carga = []; J.zona = 0; camFollow(null);
              cuadros(Math.min(4, (12 + (tn[1] - tn[0]) / 2) / 8), 8); const dCam = R.camera.position.distanceTo(E.tren.position);
              check('Túnel: silbato al entrar, retumbe con eco dentro, farol encendido (haz a la vista) y cámara cerca y baja', J.zona === 2 && oidos.includes('tren_silbato') && oidos.includes('tren_tunel') && cam.tun > 0.6 && E.haz.visible && E.haz.material.opacity > 0.05 && dCam < 10 && E.inst.farol.count >= 1, 'cámara a ' + dCam.toFixed(1) + ' m · ' + E.inst.farol.count + ' faroles · ' + oidos.join(','));
              let sgP = null, pt = null; for (const sg of V.segs) for (const p of sg.puentes) if (p[1] - p[0] >= 20 && (!pt || p[1] - p[0] > pt[1] - pt[0])) { sgP = sg; pt = p; }
              oidos.length = 0; irA(sgP.id, Math.max(0, pt[0] - 6)); J.zona = 0; camFollow(null); cuadros(Math.min(3, (pt[1] - pt[0]) / 8), 8);
              const lat = (() => { const q = enVia(sgP, J.s); return Math.abs((R.camera.position.x - q.x) * -q.tz + (R.camera.position.z - q.z) * q.tx); })(), vp = vista(16 / 9);
              check('Puente largo: silbato, traqueteo de hierro y plano grúa (la cámara sube, se aleja y se abre hacia el lado libre; el tren sigue a la vista)', J.zona === 1 && oidos.includes('tren_silbato') && oidos.includes('tren_puente') && cam.pte > 0.6 && lat > 2.5 && R.camera.position.y - E.tren.position.y > 6 && enVista(vp.T), 'lateral ' + lat.toFixed(1) + ' m · alto ' + (R.camera.position.y - E.tren.position.y).toFixed(1) + ' m · pte ' + cam.pte.toFixed(2) + ' · ' + sgP.id + '@' + pt[0] + '-' + pt[1]);
            } finally { G.audio.play = play0; J.v = 0; camFollow(null); } }
          // ---------- Curva con exceso de velocidad: tambaleo, una caja al suelo, sin descarrilar ----------
          { let sgC = null, cv = null; for (const sg of V.segs) for (const c of sg.curvas) if (!cv || c.v < cv.v) { sgC = sg; cv = c; }
            irA(sgC.id, Math.max(0, cv.i0 - 3)); J.carga = [{ tipo: 'frutas', destino: 'mercado', t0: J.t }]; J.perdidas = 0; J.perdioT = -1e9; J.sobreT = 0; J.roll = 0; st.sinFx = true;
            const vIn = P.vMax; J.v = vIn; held.gas = true; let rollMax = 0; for (let k = 0; k < 90 && st.fase === 'juego'; k++) { paso(1 / 30); rollMax = Math.max(rollMax, Math.abs(J.roll)); } held.gas = false;
            const sg2 = V.segs[J.seg], q = enVia(sg2, J.s);
            check('A ' + vIn + ' m/s en la curva de ' + cv.v + ' m/s el tren se tambalea (roll > 0,08 rad) y pierde la caja', rollMax > 0.08 && J.perdidas === 1 && J.carga.length === 0 && E.caida.visible, 'roll ' + rollMax.toFixed(2) + ' · ' + sgC.id + '@' + cv.i0);
            check('…pero no descarrila: sigue en la vía, frenado a la velocidad segura, y el turno continúa', st.fase === 'juego' && J.v <= vIn - 3 && Math.abs(q.x - sg2.x[q.i]) < 1.5 && !isNaN(J.s) && J.s >= 0, J.v.toFixed(1) + ' m/s');
            check('Tras perder una caja hay ' + P.perderEspera + ' s de gracia (no se pierde otra enseguida)', (J.carga = [{ tipo: 'caña', destino: 'central', t0: J.t }], J.v = vIn, J.s = Math.max(0, cv.i0 - 3), J.seg = sgC.idx, held.gas = true, tick(0.5), held.gas = false, J.carga.length === 1));
            irA(sgC.id, Math.max(0, cv.i0 - 3)); J.carga = []; J.perdioT = -1e9; J.v = cv.v * 0.95; held.gas = false; tick(2);
            check('A la velocidad de la señal se pasa la curva sin perder nada ni tambalearse de más', J.perdidas === 1 && Math.abs(J.roll) < 0.1 && st.fase === 'juego', J.roll.toFixed(2)); }
          // ---------- Fin del turno, récord y «Mis récords» ----------
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
          J.puntos = 330; J.entregas = 3; J.aTiempo = 2; J.t = P.duracion - 0.2; tick(0.5);
          check('Al acabar el tiempo termina el turno (fase fin) y el tren frena solo', st.fase === 'fin' && (function () { for (let k = 0; k < 90; k++) paso(1 / 30); return J.v === 0; })());
          const rec1 = leerRec();
          check('Récord en el almacén de Retos (clave tren: mejor y jugadas) y nuevo récord avisado', rec1.tren.mejor === 330 && rec1.tren.jugadas >= 1 && J.nuevo === true, JSON.stringify(rec1.tren));
          check('«Mis récords» recibe retosResultado { modo: tren, puntos, prueba }', emitido && emitido.modo === 'tren' && emitido.puntos === 330 && emitido.prueba === true, JSON.stringify(emitido));
          await new Promise(r => setTimeout(r, 780));
          check('Resultados a la vista: puntos, medalla de bronce, entregas y la siguiente meta («Te faltan…»)', !st.ui.fin.hidden && st.ui.num.textContent === '330' && st.ui.medalla.classList.contains('bronce') && /3 entregas/.test(st.ui.rec.textContent) && new RegExp('Te faltan ' + (MEDALLAS[1][1] - 330) + ' puntos para la plata').test(st.ui.meta.textContent), st.ui.meta.textContent);
          check('Medallas: bronce ' + MEDALLAS[0][1] + ', plata ' + MEDALLAS[1][1] + ', oro ' + MEDALLAS[2][1], medallaDe(MEDALLAS[0][1] - 1) === '' && medallaDe(MEDALLAS[0][1]) === 'bronce' && medallaDe(MEDALLAS[1][1]) === 'plata' && medallaDe(MEDALLAS[2][1]) === 'oro');
          check('El «¿Sabías que…?» lleva fuente o «por verificar»', SABIAS.every(s => /verificar|Fuente/.test(s[0]) && /verified|Source/.test(s[1])));
          check('Un toque reflejo justo al acabar no reinicia; pasado finEspera sí', (J.finT = 0, toque() === false && st.fase === 'fin') && (J.finT = P.finEspera, toque() === true && st.fase === 'juego'));
          check('«Otra vez» rápido: resultados a los ' + P.finPanel + ' s y el turno nuevo arranca ya (sin «Toca para arrancar»): puntos 0, tren en la Playa, 6 cargas esperando, resultados ocultos', P.finPanel <= 0.4 && J.puntos === 0 && st.fase === 'juego' && st.ui.pista.hidden && V.segs[J.seg].id === 'oeste' && V.ests.every(e => e.espera) && st.ui.fin.hidden);
          // ---------- Robot: turnos enteros con 3 semillas (calibración de medallas y estabilidad) ----------
          const rob = [];
          for (const sem of [11, 23, 42]) { iniciar(sem); toque(); rob.push(robot(P.duracion + 1)); if (st.fase === 'juego') fin(); }
          check('Robot: 3 turnos enteros sin fallos; entrega al menos 3 cargas por turno y llega al bronce', rob.every(r => r.entregas >= 3 && r.puntos >= MEDALLAS[0][1]), rob.map(r => r.puntos + 'p/' + r.entregas + 'e/' + r.perdidas + 'c').join(' '));
          // ---------- 30 reinicios: sin fugas ----------
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m0 = mem(), nHijos = raiz.children.length;
          for (let i = 0; i < 30; i++) { otraVez(); toque(); held.gas = true; tick(2 + (i % 3)); held.gas = false; if (st.fase === 'juego') fin(); }
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m1 = mem();
          check('30 reinicios: nada nuevo en la escena del tren y las geometrías del renderer no crecen (±4: el streaming del mundo carga y libera las suyas)', raiz.children.length === nHijos && E.humos.length <= P.humoMax && m1.g <= m0.g + 4 && m1.t <= m0.t + 1, JSON.stringify(m0) + ' → ' + JSON.stringify(m1) + ' · ' + raiz.children.length + ' hijos');
          check('La flora que caía sobre la vía está apartada (rank) y se repone al salir', flora.length > 0 && flora.every(f => f[0].rank[f[1]] === 99), flora.length + ' instancias');
          const mmEsc = scene.getObjectByName('flora:manchas'), muestra = manchas[0] && [manchas[0][0], manchas[0][1], manchas[0][2][0]];
          check('Las manchas de sombra de los árboles apartados también se apartan (escala 0) y se reponen al salir', !mmEsc || (manchas.length > 0 && manchas.every(([mm, i]) => mm.instanceMatrix.array[i * 16] === 0 && mm.instanceMatrix.array[i * 16 + 5] === 0)), mmEsc ? manchas.length + ' manchas' : 'sin flora:manchas en la escena');
          // ---------- Inglés ----------
          { const id = G.idioma, lang0 = id && id.actual();
            if (id) { await id.poner('en'); await id.listo; }
            otraVez(); textos(); pintar(); J.puntos = 120; J.entregas = 1; J.aTiempo = 1; st.fase = 'fin'; resultados();
            const okEn = !id || (st.ui.pista.textContent.indexOf('Tap to start') === 0 && st.ui.gas.textContent === 'Go!' && st.ui.freno.textContent === 'Brake' && /1 delivery/.test(st.ui.rec.textContent) && /You need|every medal/.test(st.ui.meta.textContent) && /Did you know/.test(st.ui.sabias.textContent) && st.ui.cargas.textContent.indexOf('No load') >= 0);
            check('Inglés: HUD, botones, cargas y resultados se traducen (diccionario propio, raíz con data-no-tr)', okEn && st.ui.el.hasAttribute('data-no-tr'), st.ui.rec.textContent);
            if (id) { await id.poner(lang0 || 'es'); await id.listo; } textos(); st.ui.fin.hidden = true; }
          // ---------- Salir ----------
          salir();
          check('Al salir se quitan las envolturas y la cámara vuelve', G.ui.busy === busy0 && F.step === step0 && G.camara.follow === follow0 && G.camara.draw === draw0 && R.camera.fov === fov0 && !document.body.classList.contains('tren-on') && !document.body.classList.contains('retos-on'));
          check('Al salir G.quiet vuelve, el mundo no queda en pausa, Vittata ya no está posada y la flora recupera su rank', G.quiet === quiet0 && G.pausa.activa() === pausa0 && M.posado === '' && flora.length === 0 && manchas.length === 0 && (!muestra || muestra[0].instanceMatrix.array[muestra[1] * 16] === muestra[2]));
          check('La partida de la historia (G.S) queda intacta', comparable(S) === sAntes);
          check('Récords reales intactos', leer(ALMACEN) === recReal);
          { const tarj = document.querySelector('#modos [data-modo="tren"]');
            check('Fase 2: tarjeta «El tren de Vittata» en «¿Cómo quieres jugar?» (submit, con icono y subtítulo) y DECL publicado', !!tarj && tarj.type === 'submit' && tarj.value === 'tren' && !!tarj.querySelector('svg.modo-img') && /desvíos/.test(tarj.querySelector('small').textContent) && DECL.oculto === false, tarj ? tarj.querySelector('small').textContent : 'sin tarjeta'); }
          check('Nada del tren queda en la escena: grupo fuera, vía y tren liberados', !raiz.parent && raiz.children.length === 0 && !st.via && !E.tren && Object.keys(MAT).length === 0);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m2 = mem();
          check('Al salir las geometrías y texturas del renderer bajan de las de la partida (todo se libera)', m2.g < m0.g && m2.t <= m0.t, JSON.stringify(m0) + ' → ' + JSON.stringify(m2));
        } catch (e) {
          check('Sin excepciones', false, (e && e.stack) || String(e));
          try { salir(); } catch (e2) { /* ya fuera */ }
        } finally {
          G.emit = emit0; st.sinFx = false; held.gas = held.freno = false;
          try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
          claveRec = ALMACEN;
        }
        const passed = out.filter(x => x.ok).length;
        if (!o.silencioso) console.log('AV.trenTest: ' + passed + '/' + out.length + (passed === out.length ? ' ✓' : ' · ' + out.filter(x => !x.ok).map(x => x.name + (x.extra ? ' (' + x.extra + ')' : '')).join(' | ')));
        return { passed, total: out.length, results: out };
      })();
    }

    G.trenApi = { DECL, P, MEDALLAS, abrir, salir, otraVez, toque, elegir, liberar, held, _dev: { J, st, E, cam, paso, enVia, atras, iniciar, fin, nuevaCarga, get via() { return st.via; }, get rnd() { return rnd; }, set rnd(f) { rnd = f; } }, get activo() { return st.activo; }, get fase() { return st.fase; },
      estado: () => ({ fase: st.fase, puntos: J.puntos, entregas: J.entregas, perdidas: J.perdidas, v: J.v, seg: st.via ? st.via.segs[J.seg].id : '', s: J.s, resta: J.resta, carga: J.carga.map(c => c.tipo + '>' + c.destino), semilla: J.semilla }), test };
    return G.trenApi;
  };
})();
