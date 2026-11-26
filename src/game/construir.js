/* Juego · Construir libre (expansión tras la temporada 1; ROADMAP «Después de la temporada 1», Kelvin 9-nov)
   Amplía el modo construir del cap. 1 (hoy solo el refugio: content/cap1/historia.js «Modo construir» y el fantasma de
   content/cap1/mundo.js) a un rincón propio: nido, techo de hojas y decoración. Mismo gesto que el refugio: un fantasma delante de
   Vittata (verde si cabe, rojo si no), Acción coloca y suena un tac de madera (G.audio «tac»).
   ENCENDIDO PARA TODOS (Kelvin 9-nov: «Piezas aprobadas»): ya no depende de ?expansion=1 (esa bandera ya no existe).
   Bandera propia G.CONSTRUIR (boot.js): encendida por defecto, ?construir=0 la apaga; boot.js carga este archivo al arrancar.
   Piezas: 7 tipos procedurales y estilizados (sin modelos nuevos), de todos desde el principio, y 6 más del Mercadito del río
   (helecho, cerca, farol, comedero, mesa de dominó y hamaca; src/game/tienda.js, se compran con conchitas de la pesca a precio fijo). Cada tipo es UNA geometría fundida con colores de vértice y un
   InstancedMesh: una llamada de dibujo por tipo que tenga piezas (13 como mucho), con 40 piezas o con 1. Presupuesto: 40 piezas (24 en calidad «bajo» y Modo Escuela);
   sin dinero real ni cajas sorpresa: las 7 de siempre desde el principio y las del Mercadito por su precio fijo.
   Controles: teclado 1–9 pieza (en el orden de la barra) · R / Q girar · Z deshacer · Supr o Retroceso quitar la pieza bajo el fantasma · E/Enter colocar ·
   Esc o B salir (B también entra). Táctil: la barra de piezas y herramientas de arriba, un gesto horizontal sobre Girar, y el botón Acción («Colocar»).
   Cuadrícula opcional (el fantasma se acerca suave a la casilla de 1 m). Foto del rincón: PNG en el dispositivo, sin subirlo. Deshacer se marca cuando hay algo que deshacer.
   Guardado: S.construir = { v: 1, piezas: [{ t, x, z, r }] } en la partida (content/cap1/pack.js, clave «construir»). r = giro en
   pasos de 45°. Lo que no se entiende (dañado, otra versión, tipos que no existen, números raros) se lee como vacío o se descarta.
   Textos en español; el inglés en content/cap1/en.js (idioma.js los traduce en pantalla).
   API (G.construir): empezar(), salir(), activo(), elegir(tipo), girar(d), colocar(), deshacer(), quitar(), piezas(), aplicar(d),
   presupuesto(), forzar(bool) (solo pruebas). Prueba: AV.construirTest(). */
(function () {
  'use strict';
  window.AVConstruir = function (G) {
    if (G.construir) return G.construir;
    const S = G.S, $ = G.util.$;
    const CAPACIDAD = 40, PRESUPUESTO_BAJO = 24, PASO = Math.PI / 4, DIST = 3.0;
    const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
    const H = (x, z) => G.terreno.height(x, z);
    const agua = (x, z) => { try { return G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity; } catch (e) { return -Infinity; } };
    const bajo = () => { const c = G.renderer && G.renderer.calidad; return !!c && (c.nivel === 'bajo' || c.escuela === true); };
    const presupuesto = () => {
      if (ctx) { const tope = bajo() ? 8 : 12; return Math.min(tope, ctx.tope || tope); }
      // F3: las piezas apartadas por la bandera apagada (caja nido) siguen siendo tuyas y ocupan su sitio: así nunca se pierden al guardar
      return Math.max(0, (bajo() ? PRESUPUESTO_BAJO : CAPACIDAD) - apartadas.length);
    };
    let forzado = false, ctx = null;
    const habilitado = () => G.CONSTRUIR !== false || forzado;
    const sonar = (n, a) => { if (G.quiet || !G.audio) return; try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
    const aviso = (t, ms) => { if (!G.quiet && G.ui) G.ui.toast(t, ms || 2600); };

    // ---------- Piezas: geometría procedural fundida (posición, normal y color por vértice) ----------
    const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), ARRIBA = new THREE.Vector3(0, 1, 0);
    let semilla = 7;
    const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
    // o: { p: [x,y,z], r: [rx,ry,rz] | dir: [x,y,z] (el eje Y de la pieza apunta ahí), s: [sx,sy,sz], tapa: color de las caras planas }
    function parte(geo, color, o) {
      o = o || {};
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      geo.dispose();
      if (o.dir) _q.setFromUnitVectors(ARRIBA, _p.set(o.dir[0], o.dir[1], o.dir[2]).normalize());
      else _q.setFromEuler(_e.set(o.r ? o.r[0] : 0, o.r ? o.r[1] : 0, o.r ? o.r[2] : 0));
      const n = g.attributes.position.count, col = new Float32Array(n * 3), nor = g.attributes.normal;
      // T39: coordenadas de textura (escaladas por o.uv) y material de la parte (o.m: 'tablas', 'piedra', 'paja'; sin o.m, color liso)
      const uv = new Float32Array(n * 2), uvA = g.attributes.uv, su = o.uv ? o.uv[0] : 1, sv = o.uv ? o.uv[1] : 1;
      if (uvA) for (let i = 0; i < n; i++) { uv[i * 2] = uvA.getX(i) * su; uv[i * 2 + 1] = uvA.getY(i) * sv; }
      const k = 0.9 + azar() * 0.2, c = lin(color).multiplyScalar(k), ct = o.tapa ? lin(o.tapa) : c;
      for (let i = 0; i < n; i++) { const cc = o.tapa && Math.abs(nor.getY(i)) > 0.9 ? ct : c; col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
      const p = o.p || [0, 0, 0], s = o.s || [1, 1, 1];
      g.applyMatrix4(_m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2])));
      const r = { pos: g.attributes.position.array, nor: g.attributes.normal.array, col, uv, m: o.m || '' };
      g.dispose();
      return r;
    }
    // T39: las partes se ordenan por material y cada material es un grupo de la geometría (el InstancedMesh lleva un material por
    // grupo: una pieza con tablas y color liso son 2 llamadas de dibujo). Sin texturas, un solo grupo, como antes.
    function fundir(partes) {
      const orden = MATS.filter(m => partes.some(p => p.m === m));
      partes = orden.reduce((a, m) => a.concat(partes.filter(p => p.m === m)), []);
      let n = 0; for (const p of partes) n += p.pos.length;
      const pos = new Float32Array(n), nor = new Float32Array(n), col = new Float32Array(n), uv = new Float32Array(n / 3 * 2);
      let o = 0; for (const p of partes) { pos.set(p.pos, o); nor.set(p.nor, o); col.set(p.col, o); uv.set(p.uv, o / 3 * 2); o += p.pos.length; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      let v = 0;
      for (const m of orden) { const c = partes.filter(p => p.m === m).reduce((k, p) => k + p.pos.length / 3, 0); g.addGroup(v, c, MATS.indexOf(m)); v += c; }
      g.userData.mats = orden;
      g.computeBoundingSphere();
      return g;
    }
    // Texturas del kit de edificios que ya está en el repo (assets/models/edificios/tex, 512 px): se cargan solo al usarlas
    const MATS = ['', 'tablas', 'piedra', 'paja'];
    const TEX = { tablas: 'kb3d_woodplanks', piedra: 'kb3d_wallm', paja: 'kb3d_roofthatched' };
    // Banderín: triángulo con sus dos caras (sin DoubleSide en el material compartido)
    function triangulo(an, al) {
      const g = new THREE.BufferGeometry(), a = an / 2;
      g.setAttribute('position', new THREE.Float32BufferAttribute([-a, 0, 0, a, 0, 0, 0, -al, 0, a, 0, 0, -a, 0, 0, 0, -al, 0], 3));
      g.computeVertexNormals();
      return g;
    }
    const C = THREE;
    const TIPOS = {
      // Nido de ramitas: cama de paja y un aro de ramitas cruzadas
      nido: { r: 0.75, sobre: false, hacer() {
        const P = [parte(new C.CylinderGeometry(0.66, 0.5, 0.26, 12), '#c9a25a', { p: [0, 0.13, 0], tapa: '#a8813f' }),
          parte(new C.CylinderGeometry(0.48, 0.48, 0.04, 12), '#6e4a28', { p: [0, 0.27, 0] })];
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * Math.PI * 2, t = [-Math.sin(a), (i % 2 ? 0.25 : -0.2), Math.cos(a)];
          P.push(parte(new C.CylinderGeometry(0.035, 0.03, 0.95, 5), i % 3 ? '#7b5430' : '#9a6b3c', { p: [Math.cos(a) * 0.62, 0.24 + (i % 2) * 0.07, Math.sin(a) * 0.62], dir: t }));
        }
        return P;
      } },
      // Techo de hojas: cuatro horcones y un techo de pencas de palma (como un ranchito)
      techo: { r: 1.0, sobre: true, hacer() {
        const P = [];
        for (const [x, z] of [[0.8, 0.8], [-0.8, 0.8], [0.8, -0.8], [-0.8, -0.8]]) P.push(parte(new C.CylinderGeometry(0.05, 0.065, 1.95, 6), '#6b4a2b', { p: [x, 0.97, z] }));
        P.push(parte(new C.ConeGeometry(1.45, 0.85, 8, 1, true), '#5a8a36', { p: [0, 2.3, 0] }));
        P.push(parte(new C.ConeGeometry(1.5, 0.12, 8), '#4d7a2e', { p: [0, 1.85, 0], r: [Math.PI, 0, 0] }));
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2 + 0.2;
          P.push(parte(new C.BoxGeometry(0.34, 0.035, 1.05), i % 2 ? '#6fa544' : '#7db54c', { p: [Math.cos(a) * 1.05, 1.95, Math.sin(a) * 1.05], r: [0.45, -a + Math.PI / 2, 0] }));
        }
        P.push(parte(new C.ConeGeometry(0.16, 0.3, 6), '#8a6236', { p: [0, 2.85, 0] }));
        return P;
      } },
      // Bromelia: roseta de hojas y la bráctea roja del centro
      bromelia: { r: 0.4, sobre: false, hacer() {
        const P = [];
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * Math.PI * 2, abre = i % 2 ? 0.75 : 0.45;
          P.push(parte(new C.ConeGeometry(0.1, 0.75, 4), i % 2 ? '#4f9a3c' : '#62ad49', { p: [Math.cos(a) * 0.15, 0.3, Math.sin(a) * 0.15], dir: [Math.cos(a) * abre, 1, Math.sin(a) * abre], s: [1, 1, 0.35] }));
        }
        P.push(parte(new C.ConeGeometry(0.09, 0.5, 6), '#e0412f', { p: [0, 0.4, 0] }));
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; P.push(parte(new C.ConeGeometry(0.05, 0.32, 4), '#f0623a', { p: [Math.cos(a) * 0.07, 0.36, Math.sin(a) * 0.07], dir: [Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5] })); }
        return P;
      } },
      // Flores: matita con cinco flores de colores
      flores: { r: 0.4, sobre: false, hacer() {
        const P = [], COL = ['#e2363b', '#f4c430', '#f07fb0', '#f08a24', '#e2363b'];
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2, d = i ? 0.22 : 0, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.42 + (i % 3) * 0.1;
          P.push(parte(new C.CylinderGeometry(0.015, 0.02, h, 4), '#3f7d2c', { p: [x, h / 2, z] }));
          P.push(parte(new C.ConeGeometry(0.06, 0.22, 4), '#4f9a3c', { p: [x + 0.06, h * 0.4, z], dir: [1, 0.6, 0], s: [1, 1, 0.3] }));
          for (let k = 0; k < 5; k++) { const b = k / 5 * Math.PI * 2; P.push(parte(new C.SphereGeometry(0.07, 6, 4), COL[i], { p: [x + Math.cos(b) * 0.07, h, z + Math.sin(b) * 0.07], s: [1, 0.45, 1] })); }
          P.push(parte(new C.SphereGeometry(0.035, 6, 4), '#ffe08a', { p: [x, h + 0.02, z] }));
        }
        return P;
      } },
      // Piedras: tres piedras de río con un poco de musgo
      piedra: { r: 0.5, sobre: false, hacer() {
        return [parte(new C.DodecahedronGeometry(0.4), '#8d8f88', { p: [0, 0.18, 0], s: [1, 0.6, 0.85], r: [0, 0.4, 0] }),
          parte(new C.DodecahedronGeometry(0.27), '#7c7f78', { p: [0.42, 0.12, 0.18], s: [1, 0.65, 1], r: [0.3, 0, 0] }),
          parte(new C.DodecahedronGeometry(0.2), '#9a9b93', { p: [-0.32, 0.09, 0.3], s: [1, 0.7, 1] }),
          parte(new C.DodecahedronGeometry(0.22), '#5f8a3a', { p: [0.02, 0.37, -0.05], s: [1, 0.25, 0.9] })];
      } },
      // Tronco-banco: para sentarse junto al nido
      tronco: { r: 0.8, sobre: false, hacer() {
        return [parte(new C.CylinderGeometry(0.28, 0.3, 1.5, 10), '#6b4a2b', { p: [0, 0.29, 0], r: [0, 0, Math.PI / 2], tapa: '#d9b27a' }),
          parte(new C.CylinderGeometry(0.05, 0.07, 0.35, 5), '#5c3f24', { p: [0.3, 0.6, 0.05], dir: [0.3, 1, 0.2] }),
          parte(new C.SphereGeometry(0.12, 6, 4), '#5f8a3a', { p: [-0.4, 0.55, 0], s: [1.4, 0.4, 1] })];
      } },
      // Banderines de colores (decoración de fiesta; no es la bandera)
      banderines: { r: 1.3, sobre: true, hacer() {
        const P = [], COL = ['#f4c430', '#2fb5a8', '#f08a24', '#5fbf4a', '#e85d8f', '#4a90e2'];
        for (const x of [-1.25, 1.25]) P.push(parte(new C.CylinderGeometry(0.04, 0.055, 1.85, 6), '#7b5430', { p: [x, 0.92, 0] }));
        const y0 = 1.78, ym = 1.58;
        for (const sg of [-1, 1]) {
          const dx = 1.25, dy = y0 - ym, L = Math.hypot(dx, dy);
          P.push(parte(new C.CylinderGeometry(0.012, 0.012, L, 4), '#f5f0e0', { p: [sg * dx / 2, (y0 + ym) / 2, 0], dir: [sg * dx, dy, 0] }));
        }
        for (let i = 0; i < 6; i++) {
          const x = -1.05 + i * 0.42, y = ym + (y0 - ym) * Math.abs(x) / 1.25 - 0.01;
          P.push(parte(triangulo(0.3, 0.36), COL[i], { p: [x, y, 0] }));
        }
        return P;
      } },
      // ---- Del Mercadito del río (src/game/tienda.js): se compran con conchitas de la pesca; misma técnica que las de arriba ----
      // Helecho: matita de frondas arqueadas
      helecho: { r: 0.4, sobre: false, hacer() {
        const P = [];
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * Math.PI * 2, h = 0.5 + (i % 3) * 0.08, abre = 0.9 + (i % 2) * 0.35;
          P.push(parte(new C.ConeGeometry(0.09, h, 4), i % 2 ? '#3f8a35' : '#55a644', { p: [Math.cos(a) * 0.16, h * 0.42, Math.sin(a) * 0.16], dir: [Math.cos(a) * abre, 1, Math.sin(a) * abre], s: [1, 1, 0.28] }));
          P.push(parte(new C.ConeGeometry(0.06, h * 0.55, 4), '#6fbf52', { p: [Math.cos(a) * 0.36, h * 0.66, Math.sin(a) * 0.36], dir: [Math.cos(a) * 1.6, 0.4, Math.sin(a) * 1.6], s: [1, 1, 0.25] }));
        }
        P.push(parte(new C.SphereGeometry(0.12, 7, 5), '#2f6e2a', { p: [0, 0.06, 0], s: [1.3, 0.5, 1.3] }));
        return P;
      } },
      // Cerca de bambú: siete cañas con sus nudos y dos travesaños atados
      cerca: { r: 0.9, sobre: false, hacer() {
        const P = [];
        for (let i = 0; i < 7; i++) {
          const x = -0.84 + i * 0.28, h = 0.82 + (i % 2) * 0.12, c = i % 2 ? '#b8a248' : '#c9b25a';
          P.push(parte(new C.CylinderGeometry(0.045, 0.05, h, 7), c, { p: [x, h / 2, 0], tapa: '#8f7a30' }));
          for (const y of [0.28, 0.58]) P.push(parte(new C.CylinderGeometry(0.054, 0.054, 0.03, 7), '#8f7a30', { p: [x, y, 0] }));
        }
        for (const y of [0.34, 0.66]) P.push(parte(new C.CylinderGeometry(0.03, 0.03, 1.86, 6), '#a08c3a', { p: [0, y, 0.06], r: [0, 0, Math.PI / 2] }));
        return P;
      } },
      // Farol: poste con brazo y un farol de luz cálida
      farol: { r: 0.35, sobre: false, hacer() {
        return [parte(new C.CylinderGeometry(0.16, 0.2, 0.08, 10), '#3b332c', { p: [0, 0.04, 0] }),
          parte(new C.CylinderGeometry(0.04, 0.05, 1.75, 8), '#3b332c', { p: [0, 0.9, 0] }),
          parte(new C.BoxGeometry(0.34, 0.04, 0.04), '#3b332c', { p: [0.15, 1.7, 0] }),
          parte(new C.CylinderGeometry(0.012, 0.012, 0.12, 4), '#3b332c', { p: [0.29, 1.63, 0] }),
          parte(new C.CylinderGeometry(0.1, 0.12, 0.05, 8), '#2a2420', { p: [0.29, 1.56, 0] }),
          parte(new C.CylinderGeometry(0.095, 0.095, 0.22, 8), '#ffd27a', { p: [0.29, 1.42, 0] }),
          parte(new C.SphereGeometry(0.06, 8, 6), '#fff1b8', { p: [0.29, 1.42, 0] }),
          parte(new C.CylinderGeometry(0.11, 0.09, 0.04, 8), '#2a2420', { p: [0.29, 1.29, 0] }),
          parte(new C.ConeGeometry(0.13, 0.1, 8), '#2a2420', { p: [0.29, 1.62, 0] })];
      } },
      // Comedero de aves: casita sobre un poste, con su bandeja de semillas
      comedero: { r: 0.4, sobre: false, hacer() {
        const P = [parte(new C.CylinderGeometry(0.04, 0.05, 1.25, 6), '#6b4a2b', { p: [0, 0.62, 0] }),
          parte(new C.BoxGeometry(0.46, 0.04, 0.36), '#8a5a32', { p: [0, 1.26, 0] }),
          parte(new C.BoxGeometry(0.28, 0.26, 0.22), '#d9a35a', { p: [0, 1.41, 0] }),
          parte(new C.CylinderGeometry(0.045, 0.045, 0.02, 10), '#3b2a1a', { p: [0, 1.43, 0.112], r: [Math.PI / 2, 0, 0] })];
        for (const sg of [-1, 1]) P.push(parte(new C.BoxGeometry(0.24, 0.03, 0.32), '#a4472f', { p: [sg * 0.1, 1.6, 0], r: [0, 0, -sg * 0.62] }));
        for (const z of [-0.17, 0.17]) P.push(parte(new C.BoxGeometry(0.46, 0.05, 0.02), '#8a5a32', { p: [0, 1.3, z] }));
        for (const x of [-0.22, 0.22]) P.push(parte(new C.BoxGeometry(0.02, 0.05, 0.36), '#8a5a32', { p: [x, 1.3, 0] }));
        for (let i = 0; i < 7; i++) P.push(parte(new C.SphereGeometry(0.025, 5, 3), '#e3c27a', { p: [-0.18 + (i % 4) * 0.035, 1.29, (i < 4 ? 0.1 : -0.1) + (i % 2) * 0.02] }));
        return P;
      } },
      // Mesa de dominó: mesa cuadrada, dos banquitos y fichas blancas sobre la mesa
      domino: { r: 1.0, sobre: false, hacer() {
        const P = [parte(new C.BoxGeometry(0.9, 0.06, 0.9), '#8a5a32', { p: [0, 0.74, 0], tapa: '#2f7a4a' })];
        for (const [x, z] of [[0.38, 0.38], [-0.38, 0.38], [0.38, -0.38], [-0.38, -0.38]]) P.push(parte(new C.BoxGeometry(0.06, 0.72, 0.06), '#6b4a2b', { p: [x, 0.36, z] }));
        for (const sg of [-1, 1]) {
          P.push(parte(new C.CylinderGeometry(0.2, 0.2, 0.06, 12), '#a8743f', { p: [sg * 0.78, 0.46, 0] }));
          for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; P.push(parte(new C.CylinderGeometry(0.025, 0.03, 0.44, 5), '#6b4a2b', { p: [sg * 0.78 + Math.cos(a) * 0.13, 0.22, Math.sin(a) * 0.13] })); }
        }
        const FICHAS = [[-0.24, -0.1, 0], [-0.12, -0.1, 0], [0, -0.1, 0], [0.12, -0.04, 0.6], [0.2, 0.08, 1.57], [-0.3, 0.22, 0.3], [0.25, -0.28, 1.2]];
        for (const [x, z, r] of FICHAS) {
          P.push(parte(new C.BoxGeometry(0.1, 0.022, 0.05), '#f7f3ea', { p: [x, 0.782, z], r: [0, r, 0] }));
          P.push(parte(new C.BoxGeometry(0.004, 0.024, 0.04), '#2b2b2b', { p: [x, 0.783, z], r: [0, r, 0] }));
        }
        return P;
      } },
      // Hamaca: dos horcones y una hamaca de rayas que cuelga entre ellos
      hamaca: { r: 1.4, sobre: false, hacer() {
        const P = [];
        for (const x of [-1.35, 1.35]) {
          P.push(parte(new C.CylinderGeometry(0.06, 0.08, 1.7, 7), '#6b4a2b', { p: [x, 0.85, 0] }));
          P.push(parte(new C.SphereGeometry(0.075, 6, 4), '#5c3f24', { p: [x, 1.7, 0] }));
        }
        const N = 14, X0 = -1.05, X1 = 1.05, yA = 1.32, yB = 0.72, RAYAS = ['#e85d3a', '#f4c430', '#2fb5a8', '#f4c430', '#e85d3a'];
        const y = t => yB + (yA - yB) * Math.pow(2 * t - 1, 2);
        for (let i = 0; i < N; i++) {
          const t0 = i / N, t1 = (i + 1) / N, xa = X0 + (X1 - X0) * t0, xb = X0 + (X1 - X0) * t1, ya = y(t0), yb = y(t1);
          const L = Math.hypot(xb - xa, yb - ya), ancho = 0.18 + 0.5 * Math.sin(Math.PI * (t0 + t1) / 2);
          for (let k = 0; k < RAYAS.length; k++) {
            const z = (k - (RAYAS.length - 1) / 2) * ancho / RAYAS.length, curva = Math.abs(z) * 0.35;
            P.push(parte(new C.BoxGeometry(L + 0.01, 0.025, ancho / RAYAS.length + 0.004), RAYAS[k], { p: [(xa + xb) / 2, (ya + yb) / 2 + curva, z], r: [0, 0, Math.atan2(yb - ya, xb - xa)] }));
          }
        }
        for (const sg of [-1, 1]) {
          const xa = sg * 1.05, xb = sg * 1.33, ya = yA, yb = 1.58, L = Math.hypot(xb - xa, yb - ya);
          P.push(parte(new C.CylinderGeometry(0.012, 0.012, L, 4), '#f5f0e0', { p: [(xa + xb) / 2, (ya + yb) / 2, 0], dir: [xb - xa, yb - ya, 0] }));
        }
        return P;
      } },
      // ---- T39 · Para armar una casita (de todos desde el principio): piezas de 2 m que encajan con imán (iman) y llevan las
      // texturas del kit de edificios (tablas, piedra y paja). La pared y el muro miden 2 m a lo largo de su eje X.
      // Piso de tablas: 2 × 2 m, un poco levantado sobre cuatro tacos
      piso: { r: 1.0, sobre: false, iman: 'piso', hacer() {
        const P = [parte(new C.BoxGeometry(2.0, 0.12, 2.0), '#e6d2b4', { p: [0, 0.16, 0], m: 'tablas', uv: [2, 2] }),
          parte(new C.BoxGeometry(2.04, 0.06, 0.12), '#c9a77c', { p: [0, 0.2, 0.96], m: 'tablas', uv: [2, 0.12] }),
          parte(new C.BoxGeometry(2.04, 0.06, 0.12), '#c9a77c', { p: [0, 0.2, -0.96], m: 'tablas', uv: [2, 0.12] })];
        for (const [x, z] of [[0.85, 0.85], [-0.85, 0.85], [0.85, -0.85], [-0.85, -0.85]]) P.push(parte(new C.BoxGeometry(0.16, 0.14, 0.16), '#6b4a2b', { p: [x, 0.05, z] }));
        return P;
      } },
      // Pared de tablas: dos horcones, tablas y una viga arriba
      pared: { r: 1.0, sobre: true, iman: 'pared', hacer() {
        const P = [parte(new C.BoxGeometry(1.84, 1.5, 0.08), '#ead7b8', { p: [0, 0.97, 0], m: 'tablas', uv: [1.8, 1.5] })];
        for (const x of [-0.94, 0.94]) P.push(parte(new C.BoxGeometry(0.14, 1.9, 0.14), '#d2b48c', { p: [x, 0.95, 0], m: 'tablas', uv: [0.15, 1.8] }));
        P.push(parte(new C.BoxGeometry(2.04, 0.12, 0.16), '#c9a77c', { p: [0, 1.86, 0], m: 'tablas', uv: [2, 0.12] }));
        P.push(parte(new C.BoxGeometry(1.84, 0.08, 0.1), '#b08a5c', { p: [0, 0.26, 0], m: 'tablas', uv: [2, 0.1] }));
        return P;
      } },
      // T59 · Pared con puerta: horcones, viga, tablas a los lados y arriba, y el hueco de la puerta en el centro (con su marco)
      puerta: { r: 1.0, sobre: true, iman: 'pared', hacer() {
        const P = [];
        for (const x of [-0.94, 0.94]) P.push(parte(new C.BoxGeometry(0.14, 1.9, 0.14), '#d2b48c', { p: [x, 0.95, 0], m: 'tablas', uv: [0.15, 1.8] }));
        P.push(parte(new C.BoxGeometry(2.04, 0.12, 0.16), '#c9a77c', { p: [0, 1.86, 0], m: 'tablas', uv: [2, 0.12] }));
        for (const sg of [-1, 1]) P.push(parte(new C.BoxGeometry(0.5, 1.5, 0.08), '#ead7b8', { p: [sg * 0.62, 0.97, 0], m: 'tablas', uv: [0.5, 1.5] }));
        P.push(parte(new C.BoxGeometry(0.74, 0.3, 0.08), '#ead7b8', { p: [0, 1.57, 0], m: 'tablas', uv: [0.74, 0.3] }));
        for (const sg of [-1, 1]) P.push(parte(new C.BoxGeometry(0.08, 1.3, 0.12), '#8a6236', { p: [sg * 0.37, 0.72, 0], m: 'tablas', uv: [0.1, 1.3] }));
        P.push(parte(new C.BoxGeometry(0.82, 0.08, 0.12), '#8a6236', { p: [0, 1.4, 0], m: 'tablas', uv: [0.8, 0.1] }));
        return P;
      } },
      // T59 · Pared con ventana: como la pared, con una ventana con su marco y dos postigos abiertos
      ventana: { r: 1.0, sobre: true, iman: 'pared', hacer() {
        const P = [];
        for (const x of [-0.94, 0.94]) P.push(parte(new C.BoxGeometry(0.14, 1.9, 0.14), '#d2b48c', { p: [x, 0.95, 0], m: 'tablas', uv: [0.15, 1.8] }));
        P.push(parte(new C.BoxGeometry(2.04, 0.12, 0.16), '#c9a77c', { p: [0, 1.86, 0], m: 'tablas', uv: [2, 0.12] }));
        P.push(parte(new C.BoxGeometry(1.84, 0.62, 0.08), '#ead7b8', { p: [0, 0.53, 0], m: 'tablas', uv: [1.8, 0.6] }));
        P.push(parte(new C.BoxGeometry(1.84, 0.36, 0.08), '#ead7b8', { p: [0, 1.54, 0], m: 'tablas', uv: [1.8, 0.36] }));
        for (const sg of [-1, 1]) P.push(parte(new C.BoxGeometry(0.42, 0.52, 0.08), '#ead7b8', { p: [sg * 0.71, 1.1, 0], m: 'tablas', uv: [0.42, 0.52] }));
        for (const sg of [-1, 1]) P.push(parte(new C.BoxGeometry(0.06, 0.6, 0.12), '#8a6236', { p: [sg * 0.5, 1.1, 0], m: 'tablas', uv: [0.06, 0.6] }));
        for (const y of [0.84, 1.36]) P.push(parte(new C.BoxGeometry(1.06, 0.06, 0.12), '#8a6236', { p: [0, y, 0], m: 'tablas', uv: [1, 0.06] }));
        for (const sg of [-1, 1]) P.push(parte(new C.BoxGeometry(0.3, 0.5, 0.04), '#3f8f6a', { p: [sg * 0.66, 1.1, 0.16], r: [0, sg * 0.9, 0] }));
        return P;
      } },
      // Muro de piedra: bloques de piedra con su remate
      muro: { r: 1.0, sobre: true, iman: 'pared', hacer() {
        return [parte(new C.BoxGeometry(2.0, 0.95, 0.34), '#f2ebe0', { p: [0, 0.48, 0], m: 'piedra', uv: [2, 1] }),
          parte(new C.BoxGeometry(2.08, 0.12, 0.42), '#d9d0c2', { p: [0, 1.0, 0], m: 'piedra', uv: [2, 0.25] }),
          parte(new C.DodecahedronGeometry(0.14), '#5f8a3a', { p: [0.6, 1.08, 0.05], s: [1.4, 0.35, 1] })];
      } },
      // Tejado de paja a dos aguas sobre cuatro horcones (va encima de un piso: encaja en su centro)
      tejado: { r: 1.2, sobre: true, iman: 'tejado', hacer() {
        const P = [];
        for (const [x, z] of [[0.92, 0.92], [-0.92, 0.92], [0.92, -0.92], [-0.92, -0.92]]) P.push(parte(new C.CylinderGeometry(0.06, 0.075, 2.0, 7), '#6b4a2b', { p: [x, 1.0, z] }));
        for (const sg of [-1, 1]) P.push(parte(new C.BoxGeometry(2.6, 0.12, 1.62), '#efe0b0', { p: [0, 2.32, sg * 0.66], r: [sg * 0.62, 0, 0], m: 'paja', uv: [2, 1.4] }));
        P.push(parte(new C.CylinderGeometry(0.07, 0.07, 2.7, 7), '#6b4a2b', { p: [0, 2.82, 0], r: [0, 0, Math.PI / 2] }));
        for (const x of [-0.92, 0.92]) P.push(parte(new C.BoxGeometry(0.08, 0.08, 2.0), '#5c3f24', { p: [x, 1.98, 0] }));
        return P;
      } },
      // Maceta con heliconia (adorno): maceta de barro y las brácteas rojas y amarillas
      maceta: { r: 0.35, sobre: false, hacer() {
        const P = [parte(new C.CylinderGeometry(0.26, 0.19, 0.38, 12), '#b5562f', { p: [0, 0.19, 0] }),
          parte(new C.CylinderGeometry(0.28, 0.28, 0.06, 12), '#c96a3d', { p: [0, 0.39, 0] }),
          parte(new C.CylinderGeometry(0.23, 0.23, 0.02, 12), '#4a3220', { p: [0, 0.4, 0] })];
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2, h = 0.75 + (i % 2) * 0.2;
          P.push(parte(new C.ConeGeometry(0.11, h, 4), i % 2 ? '#3f8a35' : '#4f9a3c', { p: [Math.cos(a) * 0.08, 0.4 + h / 2, Math.sin(a) * 0.08], dir: [Math.cos(a) * 0.35, 1, Math.sin(a) * 0.35], s: [1, 1, 0.3] }));
        }
        for (let k = 0; k < 5; k++) P.push(parte(new C.ConeGeometry(0.06, 0.2, 4), k % 2 ? '#f4c430' : '#e2363b', { p: [0.04 * (k % 2 ? 1 : -1), 0.95 + k * 0.1, 0.02], r: [0, 0, (k % 2 ? 1 : -1) * 1.1] }));
        return P;
      } },
      // ---- C9 · Más piezas del kit (de todos desde el principio): mismas texturas del kit (tablas, piedra, paja) y encaje con imán.
      // Familias nuevas de imán: 'borde' (por fuera del borde de un piso, mirando hacia fuera; «fuera» = metros desde el borde hasta
      // el centro de la pieza) y 'esquina' (en las esquinas de un piso). La baranda y la cerca de tablas encajan como la pared.
      // Escalera de tablas: tres escalones que suben hasta el piso (bajan hacia +Z), zancas y pasamanos
      escalera: { r: 0.6, sobre: true, iman: 'borde', fuera: 0.4, hacer() {
        const P = [];
        for (const [h, z0, z1] of [[0.22, -0.4, -0.13], [0.15, -0.13, 0.14], [0.075, 0.14, 0.4]]) {
          P.push(parte(new C.BoxGeometry(1.1, h, z1 - z0), '#e6d2b4', { p: [0, h / 2, (z0 + z1) / 2], m: 'tablas', uv: [1.1, 0.3] }));
          P.push(parte(new C.BoxGeometry(1.14, 0.025, 0.05), '#b08a5c', { p: [0, h - 0.012, z1 - 0.025], m: 'tablas', uv: [1.1, 0.05] }));
        }
        const L = Math.hypot(0.8, 0.22), inc = Math.atan2(0.22, 0.8);
        for (const sg of [-1, 1]) {
          P.push(parte(new C.BoxGeometry(0.07, 0.12, L), '#c9a77c', { p: [sg * 0.585, 0.13, 0], r: [inc, 0, 0], m: 'tablas', uv: [0.1, L] }));
          P.push(parte(new C.BoxGeometry(0.08, 0.95, 0.08), '#8a6236', { p: [sg * 0.585, 0.475, 0.34], m: 'tablas', uv: [0.08, 0.9] }));
          P.push(parte(new C.BoxGeometry(0.08, 1.05, 0.08), '#8a6236', { p: [sg * 0.585, 0.745, -0.36], m: 'tablas', uv: [0.08, 1] }));
          const Lp = Math.hypot(0.7, 0.32);
          P.push(parte(new C.BoxGeometry(0.07, 0.06, Lp + 0.08), '#c9a77c', { p: [sg * 0.585, 1.11, -0.01], r: [Math.atan2(0.32, 0.7), 0, 0], m: 'tablas', uv: [0.1, Lp] }));
          for (const z of [0.34, -0.36]) P.push(parte(new C.SphereGeometry(0.055, 8, 6), '#6b4a2b', { p: [sg * 0.585, z > 0 ? 0.97 : 1.29, z] }));
        }
        return P;
      } },
      // Baranda de tablas: 2 m, tres postes con remate, pasamanos, zócalo y balaustres
      baranda: { r: 1.0, sobre: true, iman: 'pared', hacer() {
        const P = [];
        for (const x of [-0.94, 0, 0.94]) {
          P.push(parte(new C.BoxGeometry(0.11, 1.0, 0.11), '#c9a77c', { p: [x, 0.5, 0], m: 'tablas', uv: [0.12, 1] }));
          P.push(parte(new C.ConeGeometry(0.09, 0.12, 4), '#8a6236', { p: [x, 1.06, 0], r: [0, Math.PI / 4, 0] }));
        }
        P.push(parte(new C.BoxGeometry(2.0, 0.07, 0.13), '#d2b48c', { p: [0, 0.97, 0], m: 'tablas', uv: [2, 0.1] }));
        P.push(parte(new C.BoxGeometry(1.9, 0.06, 0.08), '#b08a5c', { p: [0, 0.22, 0], m: 'tablas', uv: [2, 0.08] }));
        for (let i = 0; i < 10; i++) {
          const x = -0.83 + i * 0.184 + (i >= 5 ? 0.02 : 0); if (Math.abs(x) < 0.08) continue;
          P.push(parte(new C.CylinderGeometry(0.025, 0.03, 0.72, 6), '#e6d2b4', { p: [x, 0.6, 0] }));
        }
        return P;
      } },
      // Techo a dos aguas de tablas rojizas, con sus dos hastiales cerrados, cumbrera y cuatro horcones (encaja en el centro de un piso)
      dosaguas: { r: 1.2, sobre: true, iman: 'tejado', hacer() {
        const P = [];
        for (const [x, z] of [[0.94, 0.94], [-0.94, 0.94], [0.94, -0.94], [-0.94, -0.94]]) P.push(parte(new C.BoxGeometry(0.12, 1.92, 0.12), '#8a6236', { p: [x, 0.96, z], m: 'tablas', uv: [0.12, 1.9] }));
        for (const z of [-0.94, 0.94]) P.push(parte(new C.BoxGeometry(2.0, 0.1, 0.12), '#8a6236', { p: [0, 1.92, z], m: 'tablas', uv: [2, 0.1] }));
        const inc = 0.6, ala = 1.36;
        for (const sg of [-1, 1]) {
          P.push(parte(new C.BoxGeometry(2.5, 0.08, ala), '#d0745a', { p: [0, 2.3, sg * 0.58], r: [sg * inc, 0, 0], m: 'tablas', uv: [2.5, 1.3] }));
          P.push(parte(new C.BoxGeometry(2.54, 0.12, 0.05), '#f2ebe0', { p: [0, 2.3 - Math.sin(inc) * ala / 2 - 0.02, sg * (0.58 + Math.cos(inc) * ala / 2)], m: 'tablas', uv: [2.5, 0.1] }));
        }
        const sh = new C.Shape(); sh.moveTo(-1.0, 0); sh.lineTo(1.0, 0); sh.lineTo(0, 0.7); sh.lineTo(-1.0, 0);
        for (const x of [-1.0, 1.0]) P.push(parte(new C.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }), '#ead7b8', { p: [x - 0.03, 1.97, 0], r: [0, Math.PI / 2, 0], m: 'tablas', uv: [1, 1] }));
        for (const x of [-1.0, 1.0]) P.push(parte(new C.BoxGeometry(0.1, 0.06, 0.2), '#2a2420', { p: [x * 1.01, 2.25, 0] }));
        P.push(parte(new C.BoxGeometry(2.6, 0.1, 0.14), '#8a6236', { p: [0, 2.69, 0], m: 'tablas', uv: [2.6, 0.1] }));
        return P;
      } },
      // Farol de piedra: pedestal de piedra, poste de tablas y farol de luz cálida con su techito (encaja en las esquinas del piso)
      farolito: { r: 0.3, sobre: false, iman: 'esquina', hacer() {
        return [parte(new C.BoxGeometry(0.36, 0.5, 0.36), '#f2ebe0', { p: [0, 0.25, 0], m: 'piedra', uv: [0.4, 0.5] }),
          parte(new C.BoxGeometry(0.44, 0.07, 0.44), '#d9d0c2', { p: [0, 0.53, 0], m: 'piedra', uv: [0.45, 0.1] }),
          parte(new C.BoxGeometry(0.1, 0.95, 0.1), '#8a6236', { p: [0, 1.04, 0], m: 'tablas', uv: [0.1, 1] }),
          parte(new C.BoxGeometry(0.26, 0.04, 0.26), '#2a2420', { p: [0, 1.52, 0] }),
          parte(new C.CylinderGeometry(0.1, 0.1, 0.26, 8), '#ffd27a', { p: [0, 1.67, 0] }),
          parte(new C.SphereGeometry(0.065, 8, 6), '#fff1b8', { p: [0, 1.67, 0] }),
          ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => parte(new C.BoxGeometry(0.025, 0.28, 0.025), '#2a2420', { p: [a * 0.11, 1.67, b * 0.11] })),
          parte(new C.ConeGeometry(0.21, 0.16, 4), '#2a2420', { p: [0, 1.88, 0], r: [0, Math.PI / 4, 0] }),
          parte(new C.SphereGeometry(0.03, 6, 4), '#2a2420', { p: [0, 1.97, 0] })];
      } },
      // Cerca de tablas encaladas: 2 m, dos postes, dos travesaños y nueve tablitas en punta (encaja como la pared)
      valla: { r: 1.0, sobre: true, iman: 'pared', hacer() {
        const P = [];
        for (const x of [-0.94, 0.94]) {
          P.push(parte(new C.BoxGeometry(0.11, 0.98, 0.11), '#c9a77c', { p: [x, 0.49, 0], m: 'tablas', uv: [0.12, 1] }));
          P.push(parte(new C.ConeGeometry(0.09, 0.12, 4), '#8a6236', { p: [x, 1.04, 0], r: [0, Math.PI / 4, 0] }));
        }
        for (const y of [0.28, 0.66]) P.push(parte(new C.BoxGeometry(1.9, 0.07, 0.04), '#b08a5c', { p: [0, y, -0.05], m: 'tablas', uv: [2, 0.07] }));
        for (let i = 0; i < 9; i++) {
          const x = -0.76 + i * 0.19, h = 0.74 + (i % 2 ? 0 : 0.04);
          P.push(parte(new C.BoxGeometry(0.13, h, 0.03), '#f6f1e6', { p: [x, 0.08 + h / 2, 0], m: 'tablas', uv: [0.13, h] }));
          P.push(parte(new C.ConeGeometry(0.092, 0.1, 4), '#f6f1e6', { p: [x, 0.13 + h, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 0.24] }));
        }
        return P;
      } },
      // Banco de tablas sobre dos patas de piedra, con respaldo (por fuera del borde de un piso, de espaldas a la casa)
      banco: { r: 0.75, sobre: false, iman: 'borde', fuera: 0.3, hacer() {
        const P = [];
        for (const x of [-0.52, 0.52]) {
          P.push(parte(new C.BoxGeometry(0.14, 0.4, 0.38), '#f2ebe0', { p: [x, 0.2, 0.02], m: 'piedra', uv: [0.4, 0.4] }));
          P.push(parte(new C.BoxGeometry(0.07, 0.42, 0.07), '#8a6236', { p: [x, 0.62, -0.18], r: [-0.12, 0, 0], m: 'tablas', uv: [0.07, 0.4] }));
        }
        for (const z of [-0.1, 0.06, 0.2]) P.push(parte(new C.BoxGeometry(1.4, 0.05, 0.14), '#e6d2b4', { p: [0, 0.43, z], m: 'tablas', uv: [1.4, 0.14] }));
        for (const y of [0.62, 0.78]) P.push(parte(new C.BoxGeometry(1.4, 0.1, 0.035), '#d2b48c', { p: [0, y, -0.2 - (y - 0.45) * 0.12], r: [-0.12, 0, 0], m: 'tablas', uv: [1.4, 0.1] }));
        return P;
      } },
      // Huerto: cajón de tablas con tierra, una fila de lechugas, una de ajíes rojos y amarillos, y su letrerito
      huerto: { r: 0.95, sobre: false, iman: 'borde', fuera: 0.5, hacer() {
        const P = [];
        for (const sg of [-1, 1]) {
          P.push(parte(new C.BoxGeometry(1.8, 0.3, 0.06), '#d2b48c', { p: [0, 0.15, sg * 0.42], m: 'tablas', uv: [1.8, 0.3] }));
          P.push(parte(new C.BoxGeometry(0.06, 0.3, 0.78), '#d2b48c', { p: [sg * 0.87, 0.15, 0], m: 'tablas', uv: [0.78, 0.3] }));
        }
        for (const [x, z] of [[0.87, 0.42], [-0.87, 0.42], [0.87, -0.42], [-0.87, -0.42]]) P.push(parte(new C.BoxGeometry(0.1, 0.36, 0.1), '#8a6236', { p: [x, 0.18, z], m: 'tablas', uv: [0.1, 0.36] }));
        P.push(parte(new C.BoxGeometry(1.68, 0.06, 0.78), '#4a3220', { p: [0, 0.25, 0] }));
        for (let i = 0; i < 5; i++) {
          const x = -0.64 + i * 0.32;
          for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + i; P.push(parte(new C.SphereGeometry(0.075, 7, 5), k % 2 ? '#7cc24f' : '#5ea83c', { p: [x + Math.cos(a) * 0.05, 0.33, -0.18 + Math.sin(a) * 0.05], s: [1, 0.7, 1] })); }
          P.push(parte(new C.SphereGeometry(0.06, 7, 5), '#a8db7a', { p: [x, 0.37, -0.18] }));
          P.push(parte(new C.CylinderGeometry(0.012, 0.016, 0.26, 4), '#3f7d2c', { p: [x, 0.4, 0.17] }));
          for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + i * 0.7; P.push(parte(new C.ConeGeometry(0.05, 0.14, 4), '#4f9a3c', { p: [x + Math.cos(a) * 0.06, 0.46, 0.17 + Math.sin(a) * 0.06], dir: [Math.cos(a), 0.7, Math.sin(a)], s: [1, 1, 0.3] })); }
          for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + i; P.push(parte(new C.ConeGeometry(0.022, 0.08, 6), (i + k) % 3 ? '#e2363b' : '#f4c430', { p: [x + Math.cos(a) * 0.07, 0.39, 0.17 + Math.sin(a) * 0.07], r: [Math.PI, 0, 0] })); }
        }
        P.push(parte(new C.BoxGeometry(0.04, 0.42, 0.04), '#8a6236', { p: [0.95, 0.33, 0.3], m: 'tablas', uv: [0.04, 0.4] }));
        P.push(parte(new C.BoxGeometry(0.22, 0.14, 0.03), '#e6d2b4', { p: [0.95, 0.56, 0.32], m: 'tablas', uv: [0.22, 0.14] }));
        return P;
      } },
      // ---- F3 · Pieza nueva (detrás de la bandera G.F3PIEZAS, apagada: Kelvin la aprueba por foto antes de encenderla) ----
      // Caja nido en poste: la misma forma que la del cartel del Rescate (src/game/rescate.js): poste, caja de tablas con su agujero
      // redondo, techito inclinado y una perchita delante del agujero. Es una pieza de juego: no añade ningún dato (F3_CONSTRUIR_2 § 3).
      cajanido: { r: 0.4, sobre: false, hacer() {
        return [parte(new C.CylinderGeometry(0.09, 0.11, 2.6, 8), '#6b4a2e', { p: [0, 1.3, 0] }),
          parte(new C.BoxGeometry(0.62, 0.7, 0.62), '#e6c79a', { p: [0, 2.95, 0], m: 'tablas', uv: [0.62, 0.7] }),
          parte(new C.BoxGeometry(0.66, 0.06, 0.66), '#8a6236', { p: [0, 2.62, 0], m: 'tablas', uv: [0.66, 0.06] }),
          parte(new C.BoxGeometry(0.78, 0.07, 0.78), '#6b4a2e', { p: [0, 3.34, 0], r: [0.12, 0, 0], m: 'tablas', uv: [0.78, 0.78] }),
          parte(new C.CircleGeometry(0.15, 16), '#1d140b', { p: [0, 3.02, 0.312] }),
          parte(new C.TorusGeometry(0.155, 0.02, 5, 16), '#8a6236', { p: [0, 3.02, 0.312] }),
          parte(new C.CylinderGeometry(0.025, 0.025, 0.7, 6), '#6b4a2e', { p: [0, 2.72, 0.42], r: [0, 0, Math.PI / 2] }),
          parte(new C.CylinderGeometry(0.02, 0.02, 0.14, 5), '#6b4a2e', { p: [0, 2.68, 0.36], r: [Math.PI / 2, 0, 0] })];
      } },
    };
    // BASE: las 7 de siempre, de todos desde el principio. EXTRA: las del Mercadito del río (pack.tienda.construir), solo cuando se compran.
    const BASE = ['nido', 'techo', 'bromelia', 'flores', 'piedra', 'tronco', 'banderines'];
    const CASA = ['piso', 'pared', 'puerta', 'ventana', 'muro', 'tejado', 'maceta']; // T39: de todos desde el principio, detrás de las 7 de siempre
    const KIT = ['escalera', 'baranda', 'dosaguas', 'farolito', 'valla', 'banco', 'huerto']; // C9: de todos desde el principio, detrás de la casita
    const EXTRA = ['helecho', 'cerca', 'farol', 'comedero', 'domino', 'hamaca'];
    // F3 · Piezas nuevas de «Construir 2.0» (docs/diseno/F3_CONSTRUIR_2.md § 4): solo con la bandera G.F3PIEZAS (boot.js, ?f3piezas=1),
    // apagada por defecto hasta que Kelvin las apruebe por foto. Apagada: no salen en la barra ni en las plantillas, y las que hubiera en
    // una partida se apartan sin dibujarse y se vuelven a guardar tal cual (nada se pierde).
    const NUEVAS = ['cajanido'];
    const nuevas = () => G.F3PIEZAS === true;
    const ORDEN = BASE.concat(CASA, KIT, EXTRA, NUEVAS);
    const NOMBRE = { nido: 'Nido de ramitas', techo: 'Techo de hojas', bromelia: 'Bromelia', flores: 'Flores', piedra: 'Piedras', tronco: 'Tronco', banderines: 'Banderines',
      piso: 'Piso de tablas', pared: 'Pared de tablas', puerta: 'Pared con puerta', ventana: 'Pared con ventana', muro: 'Muro de piedra', tejado: 'Tejado de paja', maceta: 'Maceta con heliconia',
      escalera: 'Escalera', baranda: 'Baranda', dosaguas: 'Techo a dos aguas', farolito: 'Farol de piedra', valla: 'Cerca de tablas', banco: 'Banco', huerto: 'Huerto',
      helecho: 'Helecho', cerca: 'Cerca de bambú', farol: 'Farol', comedero: 'Comedero de aves', domino: 'Mesa de dominó', hamaca: 'Hamaca',
      cajanido: 'Caja nido' };
    // Una pieza del Mercadito es tuya si está en S.tienda.compras (src/game/tienda.js la valida al cargar; aquí solo se lee)
    const compradas = () => { try { if (G.tienda && G.tienda.compradas) return G.tienda.compradas(); const t = S.tienda; return esObj(t) && Array.isArray(t.compras) ? t.compras : []; } catch (e) { return []; } };
    const tiene = t => BASE.includes(t) || CASA.includes(t) || KIT.includes(t) || (EXTRA.includes(t) && compradas().includes(t)) || (NUEVAS.includes(t) && nuevas());
    const disponibles = () => ORDEN.filter(tiene);

    // ---------- Datos: leer (tolerante) y guardar ----------
    function leer(d, ap) {
      if (!esObj(d) || d.v !== 1 || !Array.isArray(d.piezas)) return [];
      const out = [];
      for (const p of d.piezas) {
        if (out.length + (ap ? ap.length : 0) >= CAPACIDAD) break;
        if (!esObj(p) || !TIPOS[p.t] || typeof p.x !== 'number' || typeof p.z !== 'number' || !isFinite(p.x) || !isFinite(p.z) || Math.abs(p.x) > 5000 || Math.abs(p.z) > 5000) continue;
        const r = Number.isInteger(p.r) && p.r >= 0 && p.r < 8 ? p.r : 0;
        if (NUEVAS.includes(p.t) && !nuevas()) { if (ap) ap.push({ t: p.t, x: p.x, z: p.z, r }); continue; } // F3: bandera apagada
        out.push({ t: p.t, x: p.x, z: p.z, r });
      }
      return out;
    }
    let lista = [], apartadas = [];
    const r2 = v => Math.round(v * 100) / 100;
    const piezasDe = () => lista.map(p => ({ t: p.t, x: r2(p.x), z: r2(p.z), r: p.r }));
    function guardar() {
      if (ctx && ctx.id) {
        const prev = esObj(S.interiores) && S.interiores.v === 1 && esObj(S.interiores.edificios) ? S.interiores.edificios : {};
        const edificios = Object.assign({}, prev);
        const antes = esObj(edificios[ctx.id]) ? edificios[ctx.id] : {};
        edificios[ctx.id] = { piezas: piezasDe(), estado: antes.estado || null };
        const alguno = Object.keys(edificios).some(id => { const e = edificios[id]; return e && ((e.piezas && e.piezas.length) || e.estado); });
        S.interiores = alguno ? { v: 1, edificios } : null;
      } else S.construir = lista.length || apartadas.length ? { v: 1, piezas: apartadas.concat(piezasDe()) } : null;
      if (G.guardado && G.guardado.autosave) G.guardado.autosave();
      avisarCambio('guardar');
    }
    // F3 · «Obras que traen vida» (src/game/obras.js) escucha este aviso: al guardar, colocar o quitar (y al cargar una partida)
    function avisarCambio(motivo) { try { if (G.emit) G.emit('construirCambio', { motivo, interior: !!(ctx && ctx.id) }); } catch (e) { console.warn('construirCambio', e); } }
    function mundoDe(p) {
      if (!ctx) return { x: p.x, z: p.z, y: H(p.x, p.z) };
      return { x: (ctx.ox || 0) + p.x, z: (ctx.oz || 0) + p.z, y: ctx.piso };
    }
    function enZona(x, z) {
      const zn = ctx && ctx.zona; if (!zn) return true;
      if (typeof zn.r === 'number') return Math.hypot(x - zn.x, z - zn.z) <= zn.r + 1e-6;
      if (!Array.isArray(zn) || zn.length < 3) return true;
      let dentro = false;
      for (let i = 0, j = zn.length - 1; i < zn.length; j = i++) {
        const a = zn[i], b = zn[j];
        if (((a.z > z) !== (b.z > z)) && (x < (b.x - a.x) * (z - a.z) / ((b.z - a.z) || 1e-9) + a.x)) dentro = !dentro;
      }
      return dentro;
    }

    // ---------- Escena: un InstancedMesh por tipo (se crea solo si la bandera está encendida) ----------
    let grupo = null, mat = null, fantasma = null, matF = null, anillo = null, matsT = null;
    // PULIR 7: el aro del fantasma (más opaco que la pieza: se distingue de las ya colocadas) y el aro rojo que parpadea en la pieza que choca
    let matA = null, aroC = null, matC = null;
    const cargadas = {};
    function texturaDe(t) {
      if (!matsT || !geos[t]) return;
      for (const k of geos[t].userData.mats) {
        if (!k || cargadas[k]) continue;
        cargadas[k] = true; const mt = matsT[MATS.indexOf(k)];
        try {
          new THREE.TextureLoader().load('assets/models/edificios/tex/' + TEX[k] + '.jpg', tx => {
            tx.encoding = THREE.sRGBEncoding; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 4;
            if (matsT && matsT[MATS.indexOf(k)] === mt) { mt.map = tx; mt.needsUpdate = true; } else tx.dispose();
          }, undefined, () => { /* sin textura: se queda el color */ });
        } catch (e) { /* sin cargador */ }
      }
    }
    const mallas = {}, geos = {};
    function asegurarEscena() {
      if (grupo) return;
      grupo = new THREE.Group(); grupo.name = 'construir';
      // renderer.js cullPequenos mide la caja de cada hijo de la escena: la de un InstancedMesh es la de su geometría en el origen, no la de
      // sus instancias, y el grupo se daba por «pequeño y lejos» (capa 31: invisible). Las piezas ya se limitan a 40 y van sin recorte.
      grupo.userData.sinCulling = true; grupo.frustumCulled = false;
      mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      // T39: un material por grupo (MATS); los de textura empiezan sin imagen y la cargan la primera vez que se ven (texturaDe)
      matsT = MATS.map(k => (k ? new THREE.MeshLambertMaterial({ vertexColors: true }) : mat));
      for (const t of ORDEN) {
        semilla = 7 + ORDEN.indexOf(t) * 13;
        geos[t] = fundir(TIPOS[t].hacer());
        const m = new THREE.InstancedMesh(geos[t], geos[t].userData.mats.some(Boolean) ? matsT : mat, CAPACIDAD);
        m.name = 'construir_' + t; m.count = 0; m.visible = false; m.frustumCulled = false; m.receiveShadow = true;
        mallas[t] = m; grupo.add(m);
      }
      matF = new THREE.MeshBasicMaterial({ color: lin('#7fd38f'), transparent: true, opacity: 0.5, depthWrite: false });
      fantasma = new THREE.Mesh(geos.nido, matF); fantasma.name = 'construir_fantasma'; fantasma.visible = false; fantasma.renderOrder = 2;
      matA = new THREE.MeshBasicMaterial({ color: lin('#7fd38f'), transparent: true, opacity: 0.95, depthWrite: false, depthTest: false });
      anillo = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.06, 32), matA); anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.05; anillo.renderOrder = 3; fantasma.add(anillo);
      grupo.add(fantasma);
      matC = new THREE.MeshBasicMaterial({ color: lin('#ff4a3a'), transparent: true, opacity: 0.9, depthWrite: false, depthTest: false });
      aroC = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.2, 32), matC); aroC.name = 'construir_choque'; aroC.rotation.x = -Math.PI / 2; aroC.renderOrder = 3; aroC.visible = false; aroC.frustumCulled = false;
      grupo.add(aroC);
      G.renderer.scene.add(grupo);
    }
    function quitarEscena() {
      if (!grupo) return;
      G.renderer.scene.remove(grupo);
      for (const t of ORDEN) { geos[t].dispose(); delete geos[t]; delete mallas[t]; }
      anillo.geometry.dispose(); mat.dispose(); matF.dispose(); matA.dispose(); aroC.geometry.dispose(); matC.dispose();
      for (const m of matsT) if (m !== mat) { if (m.map) m.map.dispose(); m.dispose(); }
      for (const k in cargadas) delete cargadas[k];
      grupo = mat = matF = fantasma = anillo = matsT = matA = aroC = matC = null;
    }
    const _o = new THREE.Object3D();
    function pintar() {
      if (!grupo) return;
      for (const t of ORDEN) mallas[t].count = 0;
      for (const p of lista) {
        const m = mallas[p.t]; if (!m || m.count >= CAPACIDAD) continue;
        const w = mundoDe(p);
        _o.position.set(w.x, w.y, w.z); _o.rotation.set(0, p.r * PASO, 0); _o.updateMatrix();
        m.setMatrixAt(m.count++, _o.matrix);
      }
      const sombra = !bajo();
      for (const t of ORDEN) { const m = mallas[t]; m.visible = m.count > 0; m.castShadow = sombra; m.instanceMatrix.needsUpdate = true; if (m.count) texturaDe(t); }
    }
    function aplicar(d) { apartadas = []; lista = leer(d, apartadas); historial.length = 0; rehacerPila.length = 0; if (habilitado()) { asegurarEscena(); pintar(); } avisarCambio('cargar'); return lista.length; }
    const HABITACIONES = {
      descanso: [{ t: 'nido', x: -0.6, z: 0.4, r: 1 }, { t: 'flores', x: 0.8, z: -0.3, r: 0 }],
    };
    function contexto(c) {
      guardar();
      historial.length = 0; rehacerPila.length = 0;
      if (!c) { ctx = null; apartadas = []; lista = leer(S.construir, apartadas); if (habilitado()) { asegurarEscena(); pintar(); } avisarCambio('cargar'); return null; }
      ctx = {
        id: String(c.id || 'cuarto'),
        zona: c.zona || null,
        piso: typeof c.piso === 'number' ? c.piso : H(S.pos.x, S.pos.z),
        protegidos: Array.isArray(c.protegidos) ? c.protegidos : [],
        tope: c.tope,
        ox: typeof c.ox === 'number' ? c.ox : S.pos.x,
        oz: typeof c.oz === 'number' ? c.oz : S.pos.z,
      };
      const ed = S.interiores && S.interiores.edificios && S.interiores.edificios[ctx.id];
      lista = leer({ v: 1, piezas: ed && ed.piezas });
      if (habilitado()) { asegurarEscena(); pintar(); }
      return { id: ctx.id, piso: ctx.piso };
    }
    // T50 · «Casita rápida»: de un toque, delante de Vittata y mirando hacia ella, dos pisos de tablas, el tejado de paja, tres
    // paredes (fondo y un lado) y una maceta, ya encajados como con el imán. Lo que no cabe se salta; se deshace con un solo
    // «Deshacer». Solo fuera de los cuartos (dentro ya hay sus paredes).
    // C10 · Plantillas de un toque, igual que la casita: cada receta es [tipo, a, b, giro], con a a lo ancho (eje X de la plantilla) y b
    // hacia el fondo (lejos de Vittata), en metros desde el punto que mira Vittata; el giro se suma al de la plantilla (pasos de 45°).
    // Todo cae donde caería con el imán: un piso mide 2 m, la pared va en su borde (±1), la escalera, el banco y el huerto por fuera
    // (1 + fuera) y el farol de piedra en la esquina (±1,2). Respeta el presupuesto y validar(); un Deshacer quita la plantilla entera
    // y Quitar, pieza a pieza.
    const PLANTILLAS = {
      casita: [['piso', -1, 1, 0], ['piso', 1, 1, 0], ['tejado', -1, 1, 0], ['pared', -1, 2, 0], ['pared', 1, 2, 0], ['pared', -2, 1, 2], ['maceta', 1.7, -0.2, 0]],
      bohio: [['piso', 0, 1, 0], ['tejado', 0, 1, 0], ['pared', 0, 2, 0], ['ventana', -1, 1, 2], ['ventana', 1, 1, 2], ['puerta', 0, 0, 0], ['escalera', 0, -0.4, 4], ['huerto', 1.5, 1, 2], ['banco', -1.3, 1, 6]],
      torre: [['piso', 0, 1, 0], ['dosaguas', 0, 1, 0], ['muro', 0, 2, 0], ['muro', -1, 1, 2], ['muro', 1, 1, 2], ['escalera', 0, -0.4, 4], ['farolito', -1.2, -0.2, 0], ['farolito', 1.2, -0.2, 0]],
      puente: [['piso', -2, 1, 0], ['piso', 0, 1, 0], ['piso', 2, 1, 0], ['baranda', -2, 0, 0], ['baranda', 0, 0, 0], ['baranda', 2, 0, 0], ['baranda', -2, 2, 0], ['baranda', 0, 2, 0], ['baranda', 2, 2, 0], ['escalera', -3.4, 1, 6], ['escalera', 3.4, 1, 2]],
      nidogrande: [['nido', 0, 1, 0], ['techo', 0, 1, 0], ['bromelia', -1.35, 0.3, 0], ['flores', 1.35, 0.3, 0], ['flores', -1.35, 1.7, 0], ['bromelia', 1.35, 1.7, 0], ['tronco', 0, -0.4, 0], ['farolito', 0, 2.15, 0]],
    };
    // F3 · Plantilla nueva «Merendero» (F3_CONSTRUIR_2 § 5), detrás de la misma bandera que las piezas nuevas (G.F3PIEZAS): el comedero
    // en el centro, dos matas de flores y una bromelia alrededor (a menos de 3 m: comedero «mejor» y Jardín de mariposas) y un tronco
    // para sentarse. Aún no hay percha ni bebedero (fases siguientes): van flores en su lugar. El comedero es del Mercadito: sin él,
    // pone lo demás (como todas las plantillas, solo lo que es tuyo).
    const PLANTILLAS_F3 = {
      merendero: [['comedero', 0, 1.2, 0], ['flores', -1.2, 0.7, 0], ['flores', 1.2, 0.7, 0], ['bromelia', 0, 2.4, 0], ['tronco', 0, -0.4, 0]],
    };
    const plantillasVer = () => Object.keys(PLANTILLAS).concat(nuevas() ? Object.keys(PLANTILLAS_F3) : []);
    const NOMBRE_PL = { casita: 'Casita rápida', bohio: 'Bohío', torre: 'Torre de vigía', puente: 'Puente pequeño', nidogrande: 'Nido grande', merendero: 'Merendero' };
    function plantilla(nombre) {
      const receta = PLANTILLAS[nombre] || (nuevas() && PLANTILLAS_F3[nombre]); if (!receta) return false;
      const casa = nombre === 'casita';
      if (ctx) { aviso(casa ? 'Aquí dentro ya hay paredes: la casita va fuera.' : 'Las plantillas van fuera, no dentro de un cuarto.'); return false; }
      if (lista.length >= presupuesto()) { aviso('Ya usaste todas tus piezas. Quita alguna para seguir.'); sonar('wrong'); return false; }
      const f = S.facing || { x: 0, z: 1 }, rr = ((Math.round(Math.atan2(f.x, f.z) / PASO) % 8) + 8) % 8;
      const c = crudo(), X = ejeX(rr), Z = ejeZ(rr), en = (a, b) => ({ x: c.x + X.x * a + Z.x * b, z: c.z + X.z * a + Z.z * b });
      const antes = copia();
      for (const [t, a, b, dr] of receta) {
        if (lista.length >= presupuesto() || !tiene(t)) continue;
        const w = en(a, b);
        if (validar(t, w.x, w.z)) continue;
        lista.push({ t, x: r2(w.x), z: r2(w.z), r: (rr + dr) % 8 });
      }
      if (lista.length === antes.length) { aviso(casa ? 'Aquí no cabe la casita: busca un sitio más llano y despejado.' : 'Aquí no cabe: busca un sitio más llano y despejado.'); sonar('wrong'); return false; }
      anotar({ op: 'lote', antes, despues: copia() });
      pintar(); guardar(); pintarHud(); sonar('pieza'); actualizar();
      const todo = lista.length - antes.length === receta.length;
      aviso(casa ? (todo ? '¡Casita lista! Cámbiala a tu gusto o toca Deshacer.' : 'Puse lo que cabía. Cámbialo a tu gusto o toca Deshacer.')
        : (todo ? '¡Listo! Cámbialo a tu gusto o toca Deshacer.' : 'Puse lo que cabía. Cámbialo a tu gusto o toca Deshacer.'), 3200);
      return true;
    }
    const casita = () => plantilla('casita');
    function habitacion(nombre) {
      const receta = HABITACIONES[nombre];
      if (!receta) return false;
      const antes = copia();
      const ox = ctx ? 0 : S.pos.x, oz = ctx ? 0 : S.pos.z;
      for (const p of receta) {
        if (lista.length >= presupuesto() || !tiene(p.t)) continue;
        const x = ox + p.x, z = oz + p.z;
        const wx = ctx ? (ctx.ox || 0) + x : x, wz = ctx ? (ctx.oz || 0) + z : z;
        if (validar(p.t, wx, wz)) continue;
        lista.push({ t: p.t, x: r2(x), z: r2(z), r: p.r || 0 });
      }
      if (lista.length === antes.length) return false;
      anotar({ op: 'lote', antes, despues: copia() });
      pintar(); guardar(); pintarHud(); sonar('pieza'); actualizar();
      return true;
    }

    // ---------- Modo construir: toma la acción mientras está activo (como el del refugio) ----------
    let activo = false, tipo = 'nido', giro = 0, modo0 = null, rejilla = false;
    const historial = [], rehacerPila = [];
    const COL_F = { bien: lin('#7fd38f'), iman: lin('#ffd27a'), mal: lin('#d6403a') }; // PULIR 7: sin un color nuevo por cuadro
    const vista = { x: 0, z: 0, listo: false };
    const REJ = 1;
    const est = { x: 0, z: 0, r: 0, iman: false, valido: false, motivo: '' };
    const modo = { activo: () => activo, accion: () => colocar(), aviso: () => (est.valido ? 'Acción: colocar la pieza' : est.motivo), verbo: 'Colocar' };
    let choque = null; // PULIR 7: la pieza con la que choca la última validación («Muy cerca de otra pieza»), para señalarla
    function validar(t, x, z) {
      const T = TIPOS[t];
      choque = null;
      if (lista.length >= presupuesto()) return 'Ya usaste todas tus piezas. Quita alguna para seguir.';
      if (ctx) {
        if (!enZona(x, z)) return 'Aquí no';
        if ((ctx.protegidos || []).some(p => Math.hypot(x - p.x, z - p.z) < (p.r || 1.2))) return 'Esto se queda libre';
      } else {
        const y = H(x, z);
        if (!isFinite(y) || y < agua(x, z) + 0.05) return 'En el agua no se puede construir';
      }
      const col = (G.fisica && G.fisica.colliders) || [];
      if (col.some(c => c.r > 0 && Math.hypot(x - c.x, z - c.z) < c.r + T.r * 0.5)) return 'Aquí no cabe: choca con algo';
      if (!T.sobre) { const p = lista.find(q => { const w = mundoDe(q); return !TIPOS[q.t].sobre && Math.hypot(x - w.x, z - w.z) < (T.r + TIPOS[q.t].r) * 0.6; }); if (p) { choque = p; return 'Muy cerca de otra pieza'; } }
      return '';
    }
    // T39 · Encaje con imán: cerca (≤ IMAN m) de un sitio donde la pieza encaja, el fantasma salta ahí, toma el giro que toca y se
    // pone dorado. Piso con piso (al lado), pared o muro en el borde de un piso, en la punta de otra pared o en su esquina, y el
    // tejado en el centro de un piso. Todo en metros del mundo (en un interior, mundoDe suma su origen).
    const IMAN = 1.0, ESQ = 1.2;
    const ejeX = r => ({ x: Math.cos(r * PASO), z: -Math.sin(r * PASO) }), ejeZ = r => ({ x: Math.sin(r * PASO), z: Math.cos(r * PASO) });
    function imanes(t) {
      const fam = TIPOS[t] && TIPOS[t].iman, out = []; if (!fam) return out;
      const add = (w, dx, dz, r) => out.push({ x: w.x + dx, z: w.z + dz, r: ((r % 8) + 8) % 8 });
      for (const p of lista) {
        const f = TIPOS[p.t].iman; if (!f) continue;
        const w = mundoDe(p), X = ejeX(p.r), Z = ejeZ(p.r);
        if (fam === 'piso' && f === 'piso') for (const k of [-2, 2]) { add(w, X.x * k, X.z * k, p.r); add(w, Z.x * k, Z.z * k, p.r); }
        else if (fam === 'pared' && f === 'piso') for (const k of [-1, 1]) { add(w, X.x * k, X.z * k, p.r + 2); add(w, Z.x * k, Z.z * k, p.r); }
        else if (fam === 'pared' && f === 'pared') {
          for (const k of [-2, 2]) add(w, X.x * k, X.z * k, p.r);
          for (const a of [-1, 1]) for (const b of [-1, 1]) add(w, X.x * a + Z.x * b, X.z * a + Z.z * b, p.r + 2);
        } else if (fam === 'tejado' && f === 'piso') add(w, 0, 0, p.r);
        else if (fam === 'borde' && f === 'piso') { // C9: por fuera de cada borde, mirando hacia fuera (su +Z sale del piso)
          const d = 1 + (TIPOS[t].fuera || 0.4);
          add(w, Z.x * d, Z.z * d, p.r); add(w, -Z.x * d, -Z.z * d, p.r + 4); add(w, X.x * d, X.z * d, p.r + 2); add(w, -X.x * d, -X.z * d, p.r + 6);
        } else if (fam === 'esquina' && f === 'piso') for (const a of [-1, 1]) for (const b of [-1, 1]) add(w, (X.x * a + Z.x * b) * ESQ, (X.z * a + Z.z * b) * ESQ, p.r);
      }
      // sin repetir lo que ya está puesto (misma pieza en el mismo sitio)
      return out.filter(c => !lista.some(p => { const w = mundoDe(p); return TIPOS[p.t].iman === fam && Math.hypot(w.x - c.x, w.z - c.z) < 0.3; }));
    }
    function crudo() {
      const f = S.facing || { x: 0, z: 1 }, fl = Math.hypot(f.x, f.z) || 1;
      return { x: S.pos.x + f.x / fl * DIST, z: S.pos.z + f.z / fl * DIST };
    }
    function actualizar() {
      if (!activo || !fantasma) return;
      const c = crudo();
      if (rejilla) {
        const tx = Math.round(c.x / REJ) * REJ, tz = Math.round(c.z / REJ) * REJ;
        if (!vista.listo) { vista.x = c.x; vista.z = c.z; vista.listo = true; }
        vista.x += (tx - vista.x) * 0.5; vista.z += (tz - vista.z) * 0.5;
        est.x = vista.x; est.z = vista.z;
      } else { vista.listo = false; est.x = c.x; est.z = c.z; }
      const antes = est.iman; est.iman = false; est.r = giro;
      let bd = IMAN; for (const k of imanes(tipo)) { const d = Math.hypot(k.x - est.x, k.z - est.z); if (d < bd) { bd = d; est.x = k.x; est.z = k.z; est.r = k.r; est.iman = true; } }
      if (est.iman && !antes) sonar('encaje'); // T45: encaja en su sitio (Suno)
      est.motivo = validar(tipo, est.x, est.z); est.valido = !est.motivo;
      fantasma.geometry = geos[tipo];
      fantasma.position.set(est.x, ctx ? ctx.piso : H(est.x, est.z), est.z); fantasma.rotation.set(0, est.r * PASO, 0);
      anillo.scale.setScalar(TIPOS[tipo].r);
      const col = !est.valido ? COL_F.mal : est.iman ? COL_F.iman : COL_F.bien; // dorado: encaja con imán
      matF.color.copy(col); matA.color.copy(col);
      // PULIR 7: el fantasma late un poco (se distingue de las piezas puestas); con «Reducir movimiento», quieto y algo más opaco
      const quieto = !!(G.renderer && G.renderer.REDUCED), tt = performance.now() / 1000;
      matF.opacity = quieto ? 0.62 : 0.5 + 0.16 * (0.5 + 0.5 * Math.sin(tt * 5));
      const pc = !est.valido && choque;
      aroC.visible = !!pc;
      if (pc) { // la pieza que estorba: aro rojo que parpadea a sus pies (fijo con «Reducir movimiento»)
        const w = mundoDe(pc);
        aroC.position.set(w.x, w.y + 0.06, w.z); aroC.scale.setScalar(TIPOS[pc.t].r);
        matC.opacity = quieto ? 0.9 : 0.3 + 0.65 * (Math.sin(tt * 9) > 0 ? 1 : 0.25);
      }
      texturaDe(tipo);
    }
    function colocar() {
      if (!activo) return false;
      actualizar();
      const x = rejilla && !est.iman ? Math.round(crudo().x / REJ) * REJ : est.x, z = rejilla && !est.iman ? Math.round(crudo().z / REJ) * REJ : est.z, rg = est.iman ? est.r : giro;
      const motivo = validar(tipo, x, z);
      if (motivo) { aviso(motivo); sonar('wrong'); return false; }
      const p = ctx ? { t: tipo, x: r2(x - (ctx.ox || 0)), z: r2(z - (ctx.oz || 0)), r: rg } : { t: tipo, x, z, r: rg };
      lista.push(p); anotar({ op: '+', p });
      pintar(); guardar(); pintarHud();
      const w = mundoDe(p);
      if (G.audio && G.audio.play) { try { G.audio.play('pieza'); } catch (e) { /* sin audio */ } } // T45: pieza de madera (Suno; mientras carga, «tac»)
      if (G.fx && G.fx.burst && !G.quiet && !bajo()) try { G.fx.burst(w.x, w.y + 0.6, w.z, 'feathers', 8); } catch (e) { /* sin fx */ }
      return true;
    }
    function girar(d) { giro = (giro + (d < 0 ? 7 : 1)) % 8; sonar('tick'); actualizar(); pintarHud(); return giro; }
    function cuadrícula(on) {
      rejilla = on == null ? !rejilla : !!on;
      vista.listo = false;
      const b = hudEl && hudEl.querySelector('[data-cl="rejilla"]');
      if (b) b.setAttribute('aria-pressed', String(rejilla));
      sonar('tick'); actualizar(); pintarHud();
      return rejilla;
    }
    async function foto(o) {
      if (!G.renderer || !G.renderer.snapshot) { aviso('Ahora no se puede sacar la foto'); return null; }
      if (o && o.obra) return fotoObra();
      let x = S.pos.x, z = S.pos.z;
      if (lista.length) { x = 0; z = 0; for (const p of lista) { x += p.x; z += p.z; } x /= lista.length; z /= lista.length; }
      const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, f0 = { x: (S.facing && S.facing.x) || 0, z: (S.facing && S.facing.z) || 1 };
      S.pos.x = x; S.pos.z = z + 6; S.pos.y = (ctx ? ctx.piso : H(S.pos.x, S.pos.z)) + 1.6; S.facing = { x: 0, z: -1 };
      // T40: la cámara no seguía a Vittata antes de la foto (salía lo de antes): se coloca detrás, mirando al rincón, y vuelve después
      const cam = G.camara, yaw0 = cam ? cam.yaw : 0, ponCam = () => { if (cam && cam.place) try { cam.place(true); } catch (e) { /* cámara */ } };
      if (cam) { cam.yaw = 0; ponCam(); }
      // y Vittata no tapa el rincón: se esconde solo durante la foto
      const pj = G.actores && G.actores.player3D, raiz = pj && pj.root, vis0 = raiz ? raiz.visible : true;
      if (raiz) raiz.visible = false;
      let url = null;
      try {
        const r = G.renderer.snapshot(960, 540, 0.8);
        url = r && typeof r.then === 'function' ? await r : r;
      } catch (e) { url = null; }
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = f0;
      if (raiz) raiz.visible = vis0;
      if (cam) { cam.yaw = yaw0; ponCam(); }
      if (typeof url === 'string' && url.indexOf('data:image/jpeg') === 0) {
        try {
          const im = new Image(); im.src = url; await im.decode();
          const cv = document.createElement('canvas'); cv.width = im.naturalWidth || 960; cv.height = im.naturalHeight || 540;
          cv.getContext('2d').drawImage(im, 0, 0); url = cv.toDataURL('image/png');
        } catch (e) { url = null; }
      }
      return guardarFoto(url);
    }
    async function guardarFoto(url) {
      if (typeof url !== 'string' || url.indexOf('data:image/png') !== 0) { aviso('No se pudo sacar la foto'); return null; }
      if (!G.quiet) {
        const a = document.createElement('a');
        a.href = url; a.download = 'rincon-vittata.png'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
        aviso('La foto quedó en tu teléfono o computadora. No se sube a ningún sitio.', 3200);
      }
      return url;
    }
    function elegir(t) {
      if (!TIPOS[t]) return false;
      if (!tiene(t)) { aviso('Esa pieza está en el Mercadito del río.'); return false; }
      tipo = t; sonar('boton'); actualizar(); pintarHud();
      const b = hudEl && hudEl.querySelector('[data-cl-tipo="' + t + '"]');
      if (b) {
        const f = b.parentElement;
        if (f && b.offsetLeft < f.scrollLeft) f.scrollLeft = b.offsetLeft;
        else if (f && b.offsetLeft + b.offsetWidth > f.scrollLeft + f.clientWidth - 36) f.scrollLeft = b.offsetLeft + b.offsetWidth - f.clientWidth + 36;
        b.classList.remove('cl-pop'); void b.offsetWidth; b.classList.add('cl-pop');
      }
      return true;
    }
    function anotar(h) { historial.push(h); rehacerPila.length = 0; }
    function copia() { return lista.map(p => ({ t: p.t, x: p.x, z: p.z, r: p.r })); }
    function haciaAtras(h) {
      if (h.op === 'lote') lista = h.antes.map(p => ({ t: p.t, x: p.x, z: p.z, r: p.r }));
      else if (h.op === '+') { const i = lista.lastIndexOf(h.p); if (i >= 0) lista.splice(i, 1); }
      else lista.splice(Math.min(h.i, lista.length), 0, h.p);
    }
    function haciaAdelante(h) {
      if (h.op === 'lote') lista = h.despues.map(p => ({ t: p.t, x: p.x, z: p.z, r: p.r }));
      else if (h.op === '+') lista.push(h.p);
      else lista.splice(h.i, 1);
    }
    function deshacer() {
      const h = historial.pop();
      if (!h) { aviso('No hay nada que deshacer'); return false; }
      haciaAtras(h); rehacerPila.push(h);
      pintar(); guardar(); pintarHud(); sonar('tick'); actualizar();
      return true;
    }
    function rehacer() {
      const h = rehacerPila.pop();
      if (!h) { aviso('No hay nada que rehacer'); return false; }
      haciaAdelante(h); historial.push(h);
      pintar(); guardar(); pintarHud(); sonar('tick'); actualizar();
      return true;
    }
    function quitar() {
      if (activo) actualizar();
      const x = activo ? est.x : S.pos.x, z = activo ? est.z : S.pos.z;
      let mejor = -1, bd = 1.4;
      lista.forEach((p, i) => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; mejor = i; } });
      if (mejor < 0) { aviso('No hay ninguna pieza cerca para quitar'); return false; }
      const p = lista.splice(mejor, 1)[0]; anotar({ op: '-', p, i: mejor });
      pintar(); guardar(); pintarHud(); sonar('pieza', 0.85); actualizar();
      return true;
    }
    function empezar() {
      try { G.audio.precargar(['pieza', 'encaje']); } catch (e) { /* sin audio */ } // T45
      if (!habilitado()) return false;
      if (activo) return true;
      if (G.interaccion.modo && G.interaccion.modo !== modo && G.interaccion.modo.activo && G.interaccion.modo.activo()) { aviso('Termina lo que estás haciendo y vuelve a probar.'); return false; }
      asegurarEscena(); pintar();
      modo0 = G.interaccion.modo; G.interaccion.modo = modo;
      activo = true; fantasma.visible = true; vista.listo = false;
      sesion.h0 = historial.length; finVisita();
      camaraConstruir(true);
      hud(true); actualizar(); pintarHud();
      const primero = hudEl && hudEl.querySelector('button[data-cl-tipo]');
      const enfocarPieza = () => { if (activo && primero && primero.isConnected) try { primero.focus({ preventScroll: true }); } catch (e) { /* */ } };
      enfocarPieza(); setTimeout(enfocarPieza, 0); // la pausa suelta el foco en body un instante después
      aviso('¡Arma tu rincón! Elige una pieza, gírala y toca Acción para ponerla.', 4200);
      return true;
    }
    function salir(listo) {
      if (!activo) return false;
      activo = false;
      if (fantasma) fantasma.visible = false;
      if (aroC) aroC.visible = false;
      camaraConstruir(false);
      // PULIR 7 · «¡Mira lo que hice!»: al tocar Listo con 3 piezas o más y algo hecho en esta vuelta, Iguaca viene a verlo
      const obra = hayObra(listo);
      if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
      modo0 = null; verPlantillas(false); hud(false);
      if (obra) miraLoQueHice(); else if (lista.length) aviso('Tu rincón quedó guardado.');
      return true;
    }
    // PULIR 7: cámara del modo (no del motor): más alta y un poco más atrás, para ver a Vittata, el fantasma y la obra a la vez.
    // Solo cambia el ajuste de siempre (G.camara.CAM, como la pesca y el minigolf); su seguimiento suave hace la transición.
    const CAM_CONSTRUIR = { height: 5.9, dist: 8.9 };
    let cam0 = null;
    function camaraConstruir(on) {
      const C = G.camara && G.camara.CAM; if (!C) return;
      if (on && !cam0 && !ctx) { finVisita(); cam0 = {}; for (const k in CAM_CONSTRUIR) cam0[k] = C[k]; Object.assign(C, CAM_CONSTRUIR); }
      else if (!on && cam0) { for (const k in cam0) if (C[k] === CAM_CONSTRUIR[k]) C[k] = cam0[k]; cam0 = null; }
    }
    const sesion = { h0: 0 };
    const hayObra = listo => listo === true && lista.length >= 3 && historial.length > sesion.h0 && !ctx;
    // ---------- PULIR 7 · «¡Mira lo que hice!» ----------
    // Iguaca (su mismo dibujo del mundo, sin arte nuevo) llega volando, se posa encima de la obra y da dos saltitos de alegría;
    // Vittata hace su gesto Celebrar (el clip del rig). Iguaca dice una frase al azar y el aviso ofrece la foto de la obra (la
    // Foto de siempre: se guarda en el dispositivo, no se sube). Con «Reducir movimiento» aparece ya posada y sin saltos.
    // Tono de las frases: pendiente del visto bueno de Kelvin (docs/equipo/TAREAS_WEB.md).
    // Ronda 2 (ciclo de noche): un encuadre corto (sube, aleja y gira la cámara hacia la obra, con Vittata fuera del techo e Iguaca
    // en la pieza más alta), la frase en un bocadillo con la cara de Iguaca (abajo, no la tapa) y, después, el aviso con la Foto.
    // «¡Yo también salgo!»: en la Foto de mi obra Iguaca se cuela delante; si se repite, se aparta («Esta vez sí, toda tuya»).
    const FRASES_IGUACA = ['¡Wepa! Esto aguanta hasta un aguacero… creo.', 'Me quedo a vivir aquí. ¿Tiene hamaca?', '¡Qué obra! Hasta las hormigas se quieren mudar.', 'Lo miro de arriba, lo miro de abajo… ¡me encanta!'];
    const TXT_OBRA = { quien: 'Iguaca', foto: 'Foto de mi obra', salgo: '¡Yo también salgo!', tuya: 'Esta vez sí, toda tuya' };
    const VIS = { on: false, t: 0, sp: null, npc: null, vis0: true, de: new THREE.Vector3(), a: new THREE.Vector3(), va: new THREE.Vector3(), frase: '', dicho: false, ofrecida: false, fotos: 0, foto: false };
    const DUR = { llega: 1.6, posada: 9, va: 1.4 };
    const movQuieto = () => !!((G.renderer && G.renderer.REDUCED) || document.documentElement.classList.contains('mov-reducido'));
    const imgIguaca = () => { try { return (G.c && G.c.IMG && G.c.IMG.L) || (G.dialogo && G.dialogo.img && G.dialogo.img('Iguaca')) || ''; } catch (e) { return ''; } };
    const decir = texto => { try { if (G.dialogo && G.dialogo.say) { G.dialogo.say([{ who: TXT_OBRA.quien, img: imgIguaca(), text: texto }], null, { libre: true }); return true; } } catch (e) { /* sin diálogo */ } aviso(texto); return false; };
    // Se posa encima de la pieza más alta de la obra (el techo, si hay: antes la última puesta, a veces fuera de cuadro)
    function cimaDeLaObra(out) {
      let mejor = null, my = -Infinity;
      for (const p of lista) {
        const w = mundoDe(p), g = geos[p.t];
        if (g && !g.boundingBox) g.computeBoundingBox();
        const y = w.y + (g && g.boundingBox ? g.boundingBox.max.y : 1);
        if (y > my + 1e-3) { my = y; mejor = w; }
      }
      if (!mejor) return out.set(S.pos.x, S.pos.y + 1, S.pos.z);
      return out.set(mejor.x, my + 0.9, mejor.z);
    }
    // Centro y radio de la obra (sobre el suelo)
    function huellaObra() {
      let x = 0, z = 0; for (const p of lista) { const w = mundoDe(p); x += w.x; z += w.z; } x /= lista.length; z /= lista.length;
      let r = 0; for (const p of lista) { const w = mundoDe(p); r = Math.max(r, Math.hypot(w.x - x, w.z - z) + ((TIPOS[p.t] && TIPOS[p.t].r) || 0.8)); }
      return { x, z, r };
    }
    // Encuadre corto: la cámara del modo (G.camara.CAM, como camaraConstruir) sube y se aleja, y mira desde el lado de Vittata
    // hacia la obra con un giro de tres cuartos (Vittata no tapa a Iguaca). Si Vittata quedó debajo del techo, sale al borde de la
    // obra por su mismo lado. Vuelve al ajuste de antes al acabar la visita.
    const CAM_OBRA = { height: 6.4, dist: 11 };
    let camObra0 = null;
    function encuadrar(on) {
      const cam = G.camara, C = cam && cam.CAM;
      if (!on) { if (camObra0 && C) { for (const k in camObra0) if (C[k] === camObra0.puesto[k]) C[k] = camObra0[k]; } camObra0 = null; return null; }
      if (!lista.length || ctx) return null;
      const h = huellaObra(), M = G.fisica && G.fisica.MOVE, vuela = !!(M && M.flying);
      let dx = S.pos.x - h.x, dz = S.pos.z - h.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { const yw = cam ? cam.yaw : 0; dx = Math.sin(yw); dz = Math.cos(yw); d = 1; }
      dx /= d; dz /= d;
      let movida = false;
      if (!vuela && d < h.r + 0.6) { // debajo del techo o dentro de la obra: sale al borde (primero por su lado; si no, prueba otros 7) a un sitio seco y llano
        const y0 = H(S.pos.x, S.pos.z), a0 = Math.atan2(dx, dz);
        for (let i = 0; i < 8 && !movida; i++) {
          const a = a0 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 4, ux = Math.sin(a), uz = Math.cos(a);
          const nx = h.x + ux * (h.r + 1.4), nz = h.z + uz * (h.r + 1.4), ny = H(nx, nz);
          const seco = ny > agua(nx, nz) + 0.2, llano = Math.abs(ny - y0) < 2.5;
          if (seco && llano) { S.pos.x = nx; S.pos.z = nz; S.pos.y = ny + 0.05; if (S.vy != null) S.vy = 0; S.facing = { x: -ux, z: -uz }; dx = ux; dz = uz; movida = true; }
        }
      }
      if (!C) return { movida };
      const top = cimaDeLaObra(new THREE.Vector3()).y - S.pos.y;
      const puesto = { height: Math.min(8, Math.max(CAM_OBRA.height, top * 0.95)), dist: Math.min(15, Math.max(CAM_OBRA.dist, 8 + h.r * 1.6)) };
      if (!camObra0) { camObra0 = { puesto }; for (const k in puesto) camObra0[k] = C[k]; }
      camObra0.puesto = puesto; Object.assign(C, puesto);
      // La cámara detrás de Vittata, de tres cuartos, mirando a la obra. Si detrás hay un árbol o un tejado (el taller), el motor
      // la acerca y la sube y no se ve nada: se prueban unos giros y se queda el que deja la cámara más lejos (vista libre),
      // prefiriendo el de tres cuartos. Es un corte directo (también vale para «Reducir movimiento»).
      const a0 = Math.atan2(dx, dz), ojo = G.renderer && G.renderer.camera;
      let mejor = null;
      if (cam.place && ojo) {
        for (const off of [0.5, -0.5, 0, 0.9, -0.9, 1.3, -1.3]) {
          cam.yaw = a0 + off;
          try { cam.place(true); } catch (e) { mejor = null; break; }
          const dd = Math.hypot(ojo.position.x - S.pos.x, ojo.position.z - S.pos.z), sc = dd * (0.55 + 0.45 * Math.cos(off));
          if (!mejor || sc > mejor.sc + 1e-6) mejor = { yaw: a0 + off, sc, dd };
        }
      }
      cam.yaw = mejor ? mejor.yaw : a0 + 0.5;
      if (cam.place) { try { cam.place(true); } catch (e) { /* cámara */ } }
      return { movida, vuela, yaw: cam.yaw, puesto, libre: mejor ? +mejor.dd.toFixed(2) : null };
    }
    function presentarIguaca(posada) {
      const n = G.actores && G.actores.npc && G.actores.npc('luma');
      cimaDeLaObra(VIS.a);
      if (n && n.sp && !VIS.sp) {
        if (n.sp.userData.cargarMapa) { n.sp.userData.cargarMapa(); delete n.sp.userData.cargarMapa; } // su dibujo de siempre
        VIS.sp = new THREE.Sprite(n.sp.material); VIS.sp.name = 'construir_iguaca'; VIS.sp.scale.copy(n.sp.scale).multiplyScalar(0.8); VIS.sp.renderOrder = 4; VIS.sp.frustumCulled = false;
        VIS.npc = n; VIS.vis0 = n.sp.visible; n.sp.visible = false; if (n.sh) n.sh.visible = false; // una sola Iguaca a la vez
        grupo.add(VIS.sp);
      }
      VIS.de.set(VIS.a.x - 10, VIS.a.y + 9, VIS.a.z - 6); VIS.va.set(VIS.a.x + 10, VIS.a.y + 11, VIS.a.z - 8);
      if (VIS.sp) VIS.sp.position.copy(posada || movQuieto() ? VIS.a : VIS.de);
      VIS.on = true; VIS.t = posada || movQuieto() || !VIS.sp ? DUR.llega : 0;
    }
    function miraLoQueHice(forzar) {
      if ((G.quiet && !forzar) || !lista.length || !grupo) return false;
      finVisita();
      VIS.frase = FRASES_IGUACA[Math.floor(Math.random() * FRASES_IGUACA.length)]; VIS.dicho = false; VIS.ofrecida = false; VIS.fotos = 0;
      VIS.enc = encuadrar(true);
      presentarIguaca(false);
      return true;
    }
    function decirObra() {
      VIS.dicho = true;
      try { if (G.actores && G.actores.playEmote && !G.fisica.MOVE.flying) G.actores.playEmote('celebrar'); } catch (e) { /* sin gesto */ }
      sonar('unlock');
      // La frase en un bocadillo con la cara de Iguaca (abajo, no tapa la obra ni el HUD); el aviso con la Foto sale al acabar
      if (!decir(VIS.frase) || !(G.dialogo && G.dialogo.libre && G.dialogo.libre())) ofrecerFoto();
    }
    function ofrecerFoto() {
      if (VIS.ofrecida) return; VIS.ofrecida = true;
      const e = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      const html = `<button type="button" class="btn" data-cl-mi-obra>${e(TXT_OBRA.foto)}</button>`;
      if (G.ui && G.ui.toastHTML) G.ui.toastHTML(html, 6500, { ya: true });
    }
    // «¡Yo también salgo!»: justo antes del flash Iguaca da sus dos saltitos, se pone delante de la cámara y sale en primer plano.
    // La segunda vez (y las siguientes) se aparta a su sitio encima de la obra: «Esta vez sí, toda tuya». Con «Reducir movimiento»
    // aparece ya en su sitio, sin saltos. La foto es la del encuadre (Vittata a la vista), en el dispositivo, sin subirla.
    const SALTITOS_S = 0.9;
    async function fotoObra() {
      if (VIS.foto) return null; VIS.foto = true;
      try {
        if (!VIS.on && lista.length && grupo) { encuadrar(true); presentarIguaca(true); VIS.dicho = true; VIS.ofrecida = true; }
        VIS.t = Math.min(VIS.t, DUR.llega + 0.01); // se queda posada mientras dura la foto
        const cam = G.renderer && G.renderer.camera, sp = VIS.sp, primera = VIS.fotos === 0;
        VIS.fotos++;
        decir(primera ? TXT_OBRA.salgo : TXT_OBRA.tuya);
        if (sp && cam && primera) {
          sonar('unlock');
          // delante: entre la cámara y Vittata, algo por debajo de la vista y a un lado (no tapa a Vittata)
          const ojo = new THREE.Vector3(S.pos.x, S.pos.y + 1.2, S.pos.z), delante = new THREE.Vector3().lerpVectors(cam.position, ojo, 0.42);
          const lado = new THREE.Vector3().subVectors(ojo, cam.position).cross(cam.up).normalize().multiplyScalar(-0.9);
          delante.add(lado); delante.y -= 0.25;
          VIS.delante = delante;
          if (!movQuieto() && !G.quiet) {
            const de = sp.position.clone(), t0 = performance.now();
            await new Promise(res => {
              const paso = () => {
                const k = Math.min(1, (performance.now() - t0) / 1000 / SALTITOS_S);
                sp.position.lerpVectors(de, delante, k); sp.position.y += Math.abs(Math.sin(k * Math.PI * 2)) * 0.35; // los dos saltitos de siempre
                if (k < 1) requestAnimationFrame(paso); else res();
              };
              requestAnimationFrame(paso);
            });
          }
          sp.position.copy(delante);
        } else if (sp) { sp.position.copy(VIS.a); VIS.delante = null; }
        let url = null;
        try { const r = G.renderer.snapshot(960, 540, 0.8); url = r && typeof r.then === 'function' ? await r : r; } catch (e) { url = null; }
        if (typeof url === 'string' && url.indexOf('data:image/jpeg') === 0) {
          try {
            const im = new Image(); im.src = url; await im.decode();
            const cv = document.createElement('canvas'); cv.width = im.naturalWidth || 960; cv.height = im.naturalHeight || 540;
            cv.getContext('2d').drawImage(im, 0, 0); url = cv.toDataURL('image/png');
          } catch (e) { url = null; }
        }
        if (sp && VIS.sp === sp) sp.position.copy(VIS.a); // vuelve a su sitio encima de la obra
        return await guardarFoto(url);
      } finally { VIS.foto = false; }
    }
    function finVisita() {
      if (VIS.sp) { if (VIS.sp.parent) VIS.sp.parent.remove(VIS.sp); VIS.sp = null; } // el material es el de Iguaca: no se libera
      if (VIS.npc) { VIS.npc.sp.visible = VIS.vis0; if (VIS.npc.sh) VIS.npc.sh.visible = VIS.vis0; VIS.npc = null; }
      if (VIS.on || camObra0) encuadrar(false);
      VIS.on = false;
    }
    function pasoVisita(dt) {
      if (!VIS.on) return;
      if (VIS.foto) return; // mientras se saca la foto, Iguaca no se va
      VIS.t += Math.min(dt, 0.1);
      const quieto = movQuieto(), t = VIS.t, sp = VIS.sp;
      if (t >= DUR.llega && !VIS.dicho) decirObra();
      if (VIS.dicho && !VIS.ofrecida && !(G.dialogo && G.dialogo.libre && G.dialogo.libre())) ofrecerFoto();
      if (sp) {
        if (t < DUR.llega) { const k = t / DUR.llega, e = 1 - (1 - k) * (1 - k); sp.position.lerpVectors(VIS.de, VIS.a, e); sp.position.y += Math.sin(k * Math.PI) * 1.2; }
        else if (t < DUR.llega + DUR.posada) { sp.position.copy(VIS.a); const u = t - DUR.llega; if (!quieto && u < 1.2) sp.position.y += Math.abs(Math.sin(u * Math.PI * 2 / 1.2 * 2)) * 0.35; }
        else if (t < DUR.llega + DUR.posada + DUR.va && !quieto) { const k = (t - DUR.llega - DUR.posada) / DUR.va; sp.position.lerpVectors(VIS.a, VIS.va, k * k); }
        else { finVisita(); return; }
      } else if (t >= DUR.llega + DUR.posada) finVisita();
    }
    G.on('update', (dt, busy) => { if (VIS.on && !busy) pasoVisita(dt); }, 89);
    G.on('apply', () => finVisita(), 61);
    // El botón del aviso hace la Foto de mi obra (con Iguaca colándose; en el dispositivo, no se sube a ningún sitio)
    document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('#toast [data-cl-mi-obra]'); if (!b) return; e.preventDefault(); try { G.ui.hideToast(); } catch (er) { /* */ } foto({ obra: true }); });
    G.on('update', (dt, busy) => { if (activo && fantasma) { fantasma.visible = !busy; if (!busy) actualizar(); } }, 89);
    G.on('escape', () => { if (activo && !(G.ui && G.ui.busy && G.ui.busy())) salir(); }); // con una tarjeta abierta (el Mercadito), Esc solo la cierra
    G.on('apply', () => { if (activo) salir(); if (ctx && ctx.id) { lista = leer({ v: 1, piezas: (S.interiores && S.interiores.edificios && S.interiores.edificios[ctx.id] && S.interiores.edificios[ctx.id].piezas) || [] }); historial.length = 0; rehacerPila.length = 0; pintar(); } else aplicar(S.construir); }, 60);

    // ---------- Teclado (captura: mientras se construye, estas teclas no hacen su otra función) ----------
    // B no es de fábrica de nadie, pero el remapeo (src/engine/input.js) deja ponerla a volar, aterrizar…: entonces B es de esa acción
    const bOcupada = () => { try { const m = G.input && G.input.mapa; return !!m && Object.keys(m).some(a => m[a] === 'b'); } catch (e) { return false; } };
    addEventListener('keydown', e => {
      if (!habilitado() || e.ctrlKey || e.metaKey || e.altKey) return;
      const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'SELECT' || tg.tagName === 'TEXTAREA')) return;
      if ((G.pausa && G.pausa.activa()) || (G.ui && G.ui.busy && G.ui.busy())) return;
      const portada = $('title'); if (portada && portada.open) return;
      const k = e.key.toLowerCase();
      let hecho = true;
      if (k === 'b' && !e.repeat && !bOcupada()) { if (activo) salir(true); else empezar(); }
      else if (!activo) hecho = false;
      else if (/^[1-9]$/.test(k)) { const d = disponibles(); if (d[+k - 1]) elegir(d[+k - 1]); }
      else if (k === 'r') girar(1);
      else if (k === 'q') girar(-1);
      else if (k === 'z' && !e.shiftKey) deshacer();
      else if (k === 'y' || (k === 'z' && e.shiftKey)) rehacer();
      else if (k === 'delete' || k === 'backspace') quitar();
      else if (k === 't') verPlantillas();
      else if (k === 'escape' && hudEl && hudEl.classList.contains('cl-pl-abierta')) verPlantillas();
      else if (k === 'escape' && !e.repeat) salir(true); // revisión F3: preventDefault, así ui.js no abre además la Pausa (con la Pausa abierta no llegan visitas)
      else hecho = false;
      if (hecho) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

    // ---------- Interfaz: barra de piezas, botón del HUD y tarjeta del menú (solo con la bandera) ----------
    const SVG = {
      nido: '<ellipse cx="16" cy="20" rx="12" ry="6" fill="#c9a25a"/><path d="M4 18q12 8 24 0M5 21l22-4M6 16l20 5" stroke="#7b5430" stroke-width="2" fill="none" stroke-linecap="round"/>',
      techo: '<path d="M2 15L16 5l14 10z" fill="#5a8a36"/><path d="M4 15l-2 4M10 15l-1 4M22 15l1 4M28 15l2 4" stroke="#7db54c" stroke-width="2.4" stroke-linecap="round"/><path d="M7 15v13M25 15v13" stroke="#6b4a2b" stroke-width="2.4"/>',
      bromelia: '<path d="M16 28L6 10M16 28l10-18M16 28L3 18M16 28l13-10M16 28V8" stroke="#4f9a3c" stroke-width="3" stroke-linecap="round"/><path d="M16 22l-3-9h6z" fill="#e0412f"/>',
      flores: '<path d="M10 28V16M22 28V13M16 28V19" stroke="#3f7d2c" stroke-width="2"/><circle cx="10" cy="14" r="4.5" fill="#e2363b"/><circle cx="22" cy="11" r="4.5" fill="#f4c430"/><circle cx="16" cy="18" r="4" fill="#f07fb0"/><circle cx="10" cy="14" r="1.6" fill="#ffe08a"/><circle cx="22" cy="11" r="1.6" fill="#fff3c4"/>',
      piedra: '<path d="M3 26q1-9 9-10 7 0 9 10z" fill="#8d8f88"/><path d="M17 26q1-7 7-7 6 1 6 7z" fill="#7c7f78"/><path d="M7 18q4-3 8-1" stroke="#5f8a3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
      tronco: '<rect x="3" y="14" width="24" height="10" rx="5" fill="#6b4a2b"/><ellipse cx="27" cy="19" rx="3.5" ry="5" fill="#d9b27a"/><path d="M12 14l-2-5" stroke="#5c3f24" stroke-width="2.4" stroke-linecap="round"/>',
      // T39
      piso: '<path d="M2 20l14-7 14 7-14 7z" fill="#c9a77c"/><path d="M6 18l14 7M10 16l14 7M14 14l14 7" stroke="#8a6236" stroke-width="1.2"/><path d="M2 20v3l14 7 14-7v-3" fill="none" stroke="#6b4a2b" stroke-width="2"/>',
      pared: '<rect x="5" y="8" width="22" height="18" fill="#d9bc8f"/><path d="M5 13h22M5 18h22M5 23h22" stroke="#8a6236" stroke-width="1.2"/><path d="M5 5v24M27 5v24" stroke="#6b4a2b" stroke-width="3"/><path d="M3 6h26" stroke="#8a6236" stroke-width="2.6"/>',
      puerta: '<rect x="5" y="8" width="22" height="18" fill="#d9bc8f"/><rect x="12" y="13" width="8" height="13" fill="#5a3a22"/><path d="M12 13h8v13" stroke="#8a6236" stroke-width="1.6" fill="none"/><path d="M5 5v24M27 5v24" stroke="#6b4a2b" stroke-width="3"/><path d="M3 6h26" stroke="#8a6236" stroke-width="2.6"/>',
      ventana: '<rect x="5" y="8" width="22" height="18" fill="#d9bc8f"/><rect x="11" y="12" width="10" height="8" fill="#9ed0ff"/><path d="M11 12h10v8H11zM16 12v8" stroke="#8a6236" stroke-width="1.4" fill="none"/><path d="M7 12l4 1v6l-4 1zM25 12l-4 1v6l4 1z" fill="#3f8f6a"/><path d="M5 5v24M27 5v24" stroke="#6b4a2b" stroke-width="3"/><path d="M3 6h26" stroke="#8a6236" stroke-width="2.6"/>',
      muro: '<path d="M3 14h26v14H3z" fill="#cfc4b2"/><path d="M3 21h26M10 14v7M20 14v7M6 21v7M15 21v7M24 21v7" stroke="#8d8577" stroke-width="1.4"/><path d="M2 12h28v3H2z" fill="#b5ab9b"/>',
      tejado: '<path d="M2 16L16 5l14 11z" fill="#d9c48a"/><path d="M6 13l3 3M12 9l3 4M18 9l2 4M24 12l2 3" stroke="#a88e4f" stroke-width="1.4"/><path d="M7 16v13M25 16v13" stroke="#6b4a2b" stroke-width="2.4"/><path d="M2 16h28" stroke="#8a6236" stroke-width="1.6"/>',
      maceta: '<path d="M9 19h14l-2 10H11z" fill="#b5562f"/><path d="M8 18h16v2H8z" fill="#c96a3d"/><path d="M16 18V6M16 18l-6-9M16 18l6-10" stroke="#3f8a35" stroke-width="2.4" stroke-linecap="round"/><path d="M14 8l4-2-1 4zM10 12l3-1v3zM19 11l3 1-2 2z" fill="#e2363b"/>',
      helecho: '<path d="M16 28C12 20 6 16 2 15M16 28c4-8 10-12 14-13M16 28C14 18 10 10 7 5M16 28c2-10 6-18 9-23M16 28V6" stroke="#4f9a3c" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M6 14l2 3M9 9l2 3M22 9l-2 3M26 14l-2 3M14 12l2 2M18 16l-2 2" stroke="#6fbf52" stroke-width="2" stroke-linecap="round"/>',
      cerca: '<path d="M5 28V8M11 28V5M17 28V8M23 28V5M29 28V8" stroke="#c9b25a" stroke-width="3.4" stroke-linecap="round"/><path d="M2 14h29M2 22h29" stroke="#a08c3a" stroke-width="2.2" stroke-linecap="round"/><path d="M3.6 17h3M9.6 12h3M15.6 17h3M21.6 12h3M27.6 17h3" stroke="#8f7a30" stroke-width="1.4"/>',
      farol: '<path d="M9 29V5h9" stroke="#3b332c" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M5 29h8" stroke="#3b332c" stroke-width="3" stroke-linecap="round"/><path d="M18 5v3" stroke="#3b332c" stroke-width="1.6"/><path d="M14 9h8l-1 2H15z" fill="#2a2420"/><rect x="15" y="11" width="6" height="8" rx="1.5" fill="#ffd27a"/><circle cx="18" cy="15" r="2" fill="#fff1b8"/><path d="M14.5 19h7l-1 2h-5z" fill="#2a2420"/>',
      comedero: '<path d="M16 29V18" stroke="#6b4a2b" stroke-width="2.6" stroke-linecap="round"/><path d="M7 18h18v-2H7z" fill="#8a5a32"/><rect x="11" y="10" width="10" height="7" fill="#d9a35a"/><path d="M8 11l8-6 8 6" stroke="#a4472f" stroke-width="3" fill="none" stroke-linejoin="round"/><circle cx="16" cy="13" r="1.6" fill="#3b2a1a"/><circle cx="9.5" cy="15" r="1" fill="#e3c27a"/><circle cx="22.5" cy="15" r="1" fill="#e3c27a"/>',
      domino: '<path d="M3 14h26v3H3z" fill="#8a5a32"/><path d="M3 14h26" stroke="#2f7a4a" stroke-width="2"/><path d="M6 17v11M26 17v11" stroke="#6b4a2b" stroke-width="2.4"/><rect x="8" y="9" width="7" height="4" rx="1" fill="#f7f3ea" stroke="#2b2b2b" stroke-width=".6"/><rect x="17" y="9" width="7" height="4" rx="1" fill="#f7f3ea" stroke="#2b2b2b" stroke-width=".6"/><path d="M11.5 9v4M20.5 9v4" stroke="#2b2b2b" stroke-width=".7"/><circle cx="9.8" cy="11" r=".8" fill="#2b2b2b"/><circle cx="22.2" cy="11" r=".8" fill="#2b2b2b"/>',
      hamaca: '<path d="M3 29V6M29 29V6" stroke="#6b4a2b" stroke-width="2.6" stroke-linecap="round"/><path d="M3 9l4 4M29 9l-4 4" stroke="#f5f0e0" stroke-width="1.2"/><path d="M7 13q9 12 18 0" stroke="#e85d3a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M7.5 15q8.5 10 17 0" stroke="#f4c430" stroke-width="2" fill="none"/><path d="M8 17q8 8 16 0" stroke="#2fb5a8" stroke-width="2" fill="none"/>',
      // C9
      escalera: '<path d="M4 27h8v-6h8v-6h8v12z" fill="#d9bc8f"/><path d="M4 27h24M12 21h8M20 15h8M12 21v6M20 15v6" stroke="#8a6236" stroke-width="1.4"/><path d="M5 26V14M27 13V4" stroke="#6b4a2b" stroke-width="2.4" stroke-linecap="round"/><path d="M5 14L27 4" stroke="#c9a77c" stroke-width="2.4" stroke-linecap="round"/>',
      baranda: '<path d="M3 11h26" stroke="#c9a77c" stroke-width="3.2" stroke-linecap="round"/><path d="M3 24h26" stroke="#b08a5c" stroke-width="2.2"/><path d="M8 12v12M12 12v12M20 12v12M24 12v12" stroke="#e6d2b4" stroke-width="2"/><path d="M4 9v19M16 9v19M28 9v19" stroke="#8a6236" stroke-width="3.2"/><path d="M2.5 9l1.5-2 1.5 2M14.5 9l1.5-2 1.5 2M26.5 9l1.5-2 1.5 2" fill="#6b4a2b"/>',
      dosaguas: '<path d="M16 4L2 15h4l10-7.6L26 15h4z" fill="#d0745a"/><path d="M6 15L16 7.4 26 15z" fill="#ead7b8"/><path d="M9 12.6l14 0M11.7 10.5h8.6" stroke="#c9a77c" stroke-width="1"/><path d="M7 15v14M25 15v14" stroke="#8a6236" stroke-width="2.4"/><path d="M6 15h20" stroke="#8a6236" stroke-width="1.8"/><path d="M2 15h4M26 15h4" stroke="#f2ebe0" stroke-width="1.4"/>',
      farolito: '<rect x="11" y="21" width="10" height="8" fill="#cfc4b2"/><path d="M11 25h10M16 21v4" stroke="#8d8577" stroke-width="1"/><path d="M10 21h12" stroke="#b5ab9b" stroke-width="2"/><path d="M16 20v-6" stroke="#8a6236" stroke-width="2.6"/><rect x="12.5" y="7" width="7" height="7" rx="1" fill="#ffd27a" stroke="#2a2420" stroke-width="1.2"/><circle cx="16" cy="10.5" r="2" fill="#fff1b8"/><path d="M11 7l5-4 5 4z" fill="#2a2420"/>',
      valla: '<path d="M2 13h28M2 22h28" stroke="#b08a5c" stroke-width="2"/><path d="M6 28V9l2-3 2 3v19zM14 28V9l2-3 2 3v19zM22 28V9l2-3 2 3v19z" fill="#f6f1e6" stroke="#a8916a" stroke-width=".8"/><path d="M3 28V10M29 28V10" stroke="#8a6236" stroke-width="2.6"/>',
      banco: '<path d="M4 17h24v3H4z" fill="#d9bc8f"/><path d="M5 9h22v2.6H5zM5 13h22v2.4H5z" fill="#c9a77c"/><path d="M8 9l-1 8M24 9l1 8" stroke="#8a6236" stroke-width="2"/><rect x="6" y="20" width="5" height="8" fill="#cfc4b2"/><rect x="21" y="20" width="5" height="8" fill="#cfc4b2"/>',
      huerto: '<path d="M3 20h26v8H3z" fill="#c9a77c"/><path d="M3 24h26" stroke="#8a6236" stroke-width="1.2"/><path d="M4 20h24v-1H4z" fill="#4a3220"/><circle cx="8" cy="16" r="3.2" fill="#5ea83c"/><circle cx="8" cy="15.4" r="1.6" fill="#a8db7a"/><circle cx="16" cy="16" r="3.2" fill="#7cc24f"/><circle cx="16" cy="15.4" r="1.6" fill="#a8db7a"/><path d="M24 19V11M24 14l-3-2M24 13l3-2" stroke="#3f7d2c" stroke-width="1.6" stroke-linecap="round"/><path d="M21 13l1 3.5 1-3z" fill="#e2363b"/><path d="M26 12l1 3.5 1-3z" fill="#f4c430"/>',
      cajanido: '<path d="M16 29V19" stroke="#6b4a2e" stroke-width="3" stroke-linecap="round"/><rect x="9" y="8" width="14" height="12" fill="#d9b27a"/><path d="M9 12h14M9 16h14" stroke="#a8783f" stroke-width="1"/><path d="M7 8.5l18-3v3L7 11z" fill="#6b4a2e"/><circle cx="16" cy="13" r="2.8" fill="#1d140b"/><path d="M11 18.5h10" stroke="#6b4a2e" stroke-width="1.6" stroke-linecap="round"/>',
      banderines: '<path d="M3 6v22M29 6v22" stroke="#7b5430" stroke-width="2.4"/><path d="M3 8q13 8 26 0" stroke="#f5f0e0" stroke-width="1.4" fill="none"/><path d="M6 10l3 7 3-5z" fill="#f4c430"/><path d="M13 12l3 7 3-6z" fill="#2fb5a8"/><path d="M20 12l3 6 3-7z" fill="#e85d8f"/>',
    };
    // C10 · iconos de las plantillas
    const SVG_PL = {
      casita: '<path d="M3 16L13 7l10 9z" fill="#d9c48a"/><path d="M5 16h16v12H5z" fill="#d9bc8f"/><path d="M5 20h16M5 24h16" stroke="#a8916a" stroke-width=".9"/><path d="M5 16v12M21 16v12" stroke="#6b4a2b" stroke-width="2"/><path d="M24 22h6l-1 6h-4z" fill="#b5562f"/><path d="M27 22v-7M27 22l-3-5M27 22l3-5" stroke="#3f8a35" stroke-width="1.6" stroke-linecap="round"/><path d="M26 15l2-1-.5 2z" fill="#e2363b"/><path d="M2 29h28" stroke="#8a6236" stroke-width="2"/>',
      bohio: '<path d="M1 15L16 4l15 11z" fill="#d9c48a"/><path d="M5 13l2 3M10 9l2 4M16 7v5M22 9l-2 4M27 13l-2 3" stroke="#a88e4f" stroke-width="1.2"/><path d="M5 15h22v11H5z" fill="#d9bc8f"/><rect x="13" y="18" width="6" height="8" fill="#5a3a22"/><rect x="7" y="18" width="4" height="4" fill="#9ed0ff" stroke="#8a6236" stroke-width=".9"/><rect x="21" y="18" width="4" height="4" fill="#9ed0ff" stroke="#8a6236" stroke-width=".9"/><path d="M12 26h8v1.6h1.5V29h-11v-1.4H12z" fill="#c9a77c"/><path d="M2 29h28" stroke="#8a6236" stroke-width="1.6"/>',
      torre: '<path d="M16 3L4 12h24z" fill="#d0745a"/><path d="M8 12h16" stroke="#8a6236" stroke-width="1.6"/><path d="M8 12v8M24 12v8" stroke="#8a6236" stroke-width="2"/><path d="M5 19h22v10H5z" fill="#cfc4b2"/><path d="M5 23h22M11 19v4M21 19v4M8 23v6M16 23v6M24 23v6" stroke="#8d8577" stroke-width="1"/><path d="M4 18h24v2H4z" fill="#b5ab9b"/><rect x="1" y="21" width="3" height="4" rx=".8" fill="#ffd27a" stroke="#2a2420" stroke-width=".8"/><rect x="28" y="21" width="3" height="4" rx=".8" fill="#ffd27a" stroke="#2a2420" stroke-width=".8"/>',
      puente: '<path d="M1 26l4-3h22l4 3z" fill="#c9a77c"/><path d="M5 23h22v2H5z" fill="#d9bc8f"/><path d="M5 23v-8M12 23v-8M20 23v-8M27 23v-8" stroke="#8a6236" stroke-width="2.2"/><path d="M4 15h24" stroke="#c9a77c" stroke-width="2.4" stroke-linecap="round"/><path d="M8.5 16v7M16 16v7M23.5 16v7" stroke="#e6d2b4" stroke-width="1.4"/><path d="M2 29q14-4 28 0" stroke="#4a90e2" stroke-width="2" fill="none" opacity=".8"/>',
      nidogrande: '<path d="M2 12L16 3l14 9z" fill="#5a8a36"/><path d="M4 12l-2 3M10 12l-1 3M22 12l1 3M28 12l2 3" stroke="#7db54c" stroke-width="2" stroke-linecap="round"/><path d="M7 12v16M25 12v16" stroke="#6b4a2b" stroke-width="2"/><ellipse cx="16" cy="24" rx="8" ry="4" fill="#c9a25a"/><path d="M8 22q8 6 16 0M9 25l14-3" stroke="#7b5430" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="3" cy="25" r="2" fill="#e2363b"/><circle cx="29" cy="25" r="2" fill="#f4c430"/><path d="M3 27v2M29 27v2" stroke="#3f7d2c" stroke-width="1.4"/>',
      merendero: '<path d="M7 29V17" stroke="#6b4a2b" stroke-width="2.2"/><path d="M2 17h10" stroke="#8a5a32" stroke-width="2"/><rect x="4" y="11" width="6" height="5" fill="#d9a35a"/><path d="M2.5 12L7 8l4.5 4" stroke="#a4472f" stroke-width="2" fill="none"/><path d="M19 29v-6M25 29v-7" stroke="#3f7d2c" stroke-width="1.6"/><circle cx="19" cy="21" r="3" fill="#e2363b"/><circle cx="25" cy="20" r="3" fill="#f4c430"/><circle cx="19" cy="21" r="1.1" fill="#ffe08a"/><circle cx="25" cy="20" r="1.1" fill="#fff3c4"/><rect x="12" y="25" width="10" height="4" rx="2" fill="#6b4a2b"/>',
    };
    const ICONO_HUD = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M3 20.5 13.6 9.9l1.5 1.5L4.5 22zM12.4 4.2l3-1.7 6.1 6.1-1.7 3-2.1-2.1-1.6 1.6-3.8-3.8 1.6-1.6z"/></svg>') + '")';
    let hudEl = null, estilo = null;
    function css() {
      if (estilo) return;
      estilo = document.createElement('style'); estilo.id = 'cl-estilo';
      estilo.textContent = '#cl-hud{left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 142px);display:flex;flex-direction:column;align-items:center;gap:6px;max-width:clamp(320px,calc(100vw - 720px),calc(100vw - 32px))}' +
        '#cl-hud .cl-piezas,#cl-hud .cl-plantillas{flex-wrap:wrap;justify-content:center}#cl-hud .cl-piezas small{display:none}' +
        '#cl-hud .cl-fila{display:flex;gap:6px;align-items:center;background:rgba(16,36,28,.82);border-radius:16px;padding:6px;box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:100%;overflow-x:auto;scrollbar-width:none}' +
        '#cl-hud button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:44px;min-height:44px;padding:4px 6px;border-radius:12px;color:#fff8e6;font:600 12px/1.1 system-ui,sans-serif;cursor:pointer;text-align:center;background:rgba(255,255,255,.08);touch-action:manipulation}' +
        '#cl-hud button:hover{background:rgba(255,255,255,.18)}#cl-hud button:focus-visible{outline:3px solid #ffd27a;outline-offset:1px}' +
        '#cl-hud button[aria-pressed="true"]{background:#ffd27a;color:#10241c;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}' +
        '#cl-hud svg{width:30px;height:30px}#cl-hud .cl-cuenta{color:#fff8e6;font:700 13px system-ui,sans-serif;padding:0 8px;white-space:nowrap}' +
        '#cl-hud .cl-ahora{color:#ffd27a;font:800 13px system-ui,sans-serif;padding:0 6px;white-space:nowrap;max-width:6.2em;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;min-width:0}' +
        '#cl-hud .cl-carril{position:relative;max-width:100%;min-width:0;display:flex;align-items:center;gap:4px}' +
        '#cl-hud .cl-carril .cl-piezas{flex:1 1 auto;min-width:0;scroll-padding-inline-end:12px}' +
        '#cl-hud [data-cl="mas"]{position:static;transform:none;flex:0 0 auto;background:#ffd27a;color:#10241c;font:800 22px/1 system-ui,sans-serif;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.35)}' +
        '@keyframes cl-mas{50%{transform:translateX(4px)}}#cl-hud [data-cl="mas"]{animation:cl-mas 1.1s ease-in-out infinite}' +
        '@keyframes cl-pop{0%{transform:scale(1)}40%{transform:scale(1.16)}100%{transform:scale(1)}}#cl-hud button.cl-pop{animation:cl-pop .28s ease}' +
        '@keyframes cl-brillo{50%{box-shadow:0 0 0 4px rgba(255,210,122,.9)}}#cl-hud .cl-piezas button[aria-pressed="true"]{animation:cl-brillo 1.5s ease-in-out infinite}' +
        '#cl-hud kbd{font:600 10px system-ui,sans-serif;opacity:.7}' +
        '#cl-hud .cl-herr button{flex-direction:row;font-size:13px;padding:4px 10px;white-space:nowrap}' +
        // F20: los botones de herramientas no se encogen por debajo de su texto (en inglés «Quick builds T» se montaba sobre el
        // siguiente): la fila salta a otra línea; y tienen forma de botón (antes parecían texto suelto)
        '#cl-hud .cl-herr{flex-wrap:wrap;justify-content:center;overflow:visible}#cl-hud .cl-herr button{flex:0 0 auto;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,248,230,.3)}' +
        '#cl-hud .cl-plantillas{display:none}#cl-hud.cl-pl-abierta .cl-plantillas{display:flex}#cl-hud.cl-pl-abierta .cl-piezas{display:none}#cl-hud.cl-pl-abierta .cl-carril{display:none}' +
        '#cl-hud .cl-plantillas button{width:74px;flex:0 0 auto}#cl-hud .cl-plantillas small{font-size:11px;line-height:1.1}' +
        '#cl-hud [data-cl="plantillas"][aria-expanded="true"]{background:#ffd27a;color:#10241c}' +
        '#cl-hud .cl-deshacer.cl-hay{background:#ffd27a;color:#10241c;box-shadow:0 0 0 3px rgba(255,210,122,.7);min-width:84px;font-weight:800}' +
        '#cl-hud .cl-deshacer[aria-disabled="true"]{opacity:.5;box-shadow:none}' +
        'body:has(#title[open]) #cl-hud,body:has(#creator:not([hidden])) #cl-hud{visibility:hidden}' +
        '@media (max-width:700px),(pointer:coarse){#cl-hud .cl-ahora{display:none}#cl-hud{left:12px;transform:none;align-items:flex-start;top:calc(env(safe-area-inset-top,0px) + 226px);max-width:calc(100vw - 84px)}' +
        '#cl-hud .cl-fila{gap:4px;padding:4px}#cl-hud .cl-piezas small,#cl-hud kbd{display:none}#cl-hud .cl-piezas button[aria-pressed="true"] small{display:block;font-size:10px;line-height:1.05;max-width:64px;white-space:normal}#cl-hud button{min-width:44px;min-height:44px;padding:2px}#cl-hud svg{width:26px;height:26px}' +
        '#cl-hud .cl-herr button{padding:2px 7px;font-size:12px}#cl-hud .cl-cuenta{font-size:12px;padding:0 4px}' +
        '#cl-hud .cl-herr{flex-wrap:wrap;overflow:visible}#cl-hud .cl-piezas{flex-wrap:nowrap;justify-content:flex-start}#cl-hud .cl-plantillas{overflow:visible}' +
        '#cl-hud .cl-plantillas button{width:56px;padding:2px 1px;gap:1px}#cl-hud .cl-plantillas svg{width:18px;height:18px}#cl-hud .cl-plantillas small{font-size:10px;line-height:1}' +
        'body:has(#emotes:not([hidden])) #cl-hud{top:calc(env(safe-area-inset-top,0px) + 72px);max-width:calc(100vw - 24px)}' +
        // PULIR 2 (p23): construyendo en el teléfono, el aviso no va entre la barra y Vittata.
        // PULIR 6: tampoco encima del objetivo ni de los contadores (madera, piedra… hacen falta para construir): va en el hueco entre
        // ellos y la barra, a lo ancho y compacto (--cl-av-top y --cl-av-max los mide avisoSitio() con la pantalla real)
        // PULIR 7: ese hueco a veces no existía (el aviso de «Descubriste…» quedaba encima de las piezas): el aviso va abajo, en el sitio de
        // la línea «Acción: …» (que se esconde mientras el aviso se ve; el botón «Colocar» dice lo mismo), entre la barra y los botones
        '@media (max-width:560px){body:has(#cl-hud:not([hidden])) #toast{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 206px);left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));margin-inline:0;width:auto;max-width:none;min-height:0;max-height:var(--cl-av-max,84px);padding:6px 12px;font-size:calc(13px * var(--fs-k,1));line-height:1.3;overflow:hidden}' +
        'body:has(#cl-hud:not([hidden])) #toast::before{display:none}body:has(#cl-hud:not([hidden])) #toast b{font-size:calc(14px * var(--fs-k,1));line-height:1.2}body:has(#cl-hud:not([hidden])):has(#toast:not([hidden])) #prompt{visibility:hidden}}' +
        // PULIR 2 (p23): la última pieza quedaba cortada en el borde sin señal de que la fila se desliza: el borde derecho se desvanece
        '#cl-hud .cl-piezas{padding-right:28px;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 30px),rgba(0,0,0,.15));mask-image:linear-gradient(90deg,#000 calc(100% - 30px),rgba(0,0,0,.15))}}' +
        // C10: teléfono en horizontal (844×390): la barra va al centro, entre el joystick y los botones de acción, bajo el HUD de arriba
        '@media (orientation:landscape) and (max-height:500px){#cl-hud .cl-ahora{display:none}#cl-hud .cl-carril{gap:12px}#cl-hud .cl-piezas button[aria-pressed="true"] small{display:block;font-size:10px;line-height:1.05;max-width:72px;white-space:normal}#cl-hud,body:has(#emotes:not([hidden])) #cl-hud{left:50%;transform:translateX(-50%);align-items:center;top:calc(env(safe-area-inset-top,0px) + 150px);max-width:calc(100vw - 400px)}#cl-hud .cl-herr{flex-wrap:wrap;justify-content:center;overflow:visible}#cl-hud .cl-piezas{flex-wrap:nowrap;justify-content:flex-start}#cl-hud .cl-plantillas{overflow:visible}#cl-hud .cl-fila{gap:4px;padding:4px}#cl-hud .cl-piezas small,#cl-hud kbd{display:none}#cl-hud button{padding:2px}#cl-hud svg{width:26px;height:26px}#cl-hud .cl-herr button{padding:2px 7px;font-size:12px}#cl-hud .cl-plantillas button{width:56px;padding:2px 1px;gap:1px}#cl-hud .cl-plantillas svg{width:18px;height:18px}#cl-hud .cl-plantillas small{font-size:10px;line-height:1}' +
        // PULIR 6: en horizontal el aviso tapaba los contadores (arriba a la derecha; no hay hueco entre el objetivo, los botones y la
        // barra). Construyendo va abajo, entre el palo y los botones de acción, bajo la barra, en el sitio de la línea «Acción: …»
        // (que se esconde mientras el aviso está a la vista: el botón «Colocar» dice lo mismo)
        'body:has(#cl-hud:not([hidden])) #toast{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);left:max(160px,calc(env(safe-area-inset-left,0px) + 160px));right:max(210px,calc(env(safe-area-inset-right,0px) + 210px));margin-inline:auto;width:fit-content;max-width:none;max-height:var(--cl-av-max,64px);padding:6px 12px;font-size:calc(13px * var(--fs-k,1));line-height:1.3;overflow:hidden}' +
        'body:has(#cl-hud:not([hidden])) #toast::before{display:none}body:has(#cl-hud:not([hidden])):has(#toast:not([hidden])) #prompt{visibility:hidden}}' +
        // PULIR 7 · escritorio (1280×720): la barra iba arriba en el centro y tapaba a Vittata y el sitio de la pieza. Va abajo, compacta
        // (las piezas en una fila que se desliza), entre la ayuda de teclas y «Controles»; la línea «Acción: …» sube encima de la barra
        // (--cl-hud-alto lo mide avisoSitio) y la ayuda de teclas se esconde mientras (la barra ya lleva sus teclas)
        '@media (min-width:701px) and (min-height:501px) and (pointer:fine){#cl-hud{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);max-width:min(980px,calc(100vw - 340px))}' +
        '#cl-hud .cl-piezas{flex-wrap:nowrap;justify-content:flex-start;padding-right:28px;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 30px),rgba(0,0,0,.15));mask-image:linear-gradient(90deg,#000 calc(100% - 30px),rgba(0,0,0,.15))}' +
        'body:has(#cl-hud:not([hidden])) #keyhint{visibility:hidden}body:has(#cl-hud:not([hidden])) #prompt{bottom:calc(env(safe-area-inset-bottom,0px) + var(--cl-hud-alto,140px) + 28px)}}' +
        '@media (prefers-reduced-motion:reduce){#cl-hud,#cl-hud *{animation:none;transition:none}}';
      document.head.appendChild(estilo);
    }
    function hud(ver) {
      if (!ver) { if (hudEl) hudEl.hidden = true; return; }
      css();
      if (!hudEl) {
        hudEl = document.createElement('div'); hudEl.id = 'cl-hud'; hudEl.className = 'hud'; hudEl.setAttribute('role', 'toolbar'); hudEl.setAttribute('aria-label', 'Para construir');
        const tecla = window.matchMedia && matchMedia('(pointer: coarse)').matches ? () => '' : k => `<kbd>${k}</kbd>`;
        hudEl.innerHTML = '<div class="cl-carril"><div class="cl-fila cl-piezas">' + filaPiezas() + '</div><button type="button" data-cl="mas" aria-label="Más piezas" hidden>›</button></div>' +
          '<div class="cl-fila cl-plantillas" id="cl-plantillas" role="group" aria-label="Plantillas">' + filaPlantillas() + '</div>' +
          `<div class="cl-fila cl-herr"><span class="cl-cuenta" aria-live="polite"></span><span class="cl-ahora"></span><button type="button" class="cl-deshacer" data-cl="deshacer" aria-disabled="true" aria-label="Deshacer" aria-keyshortcuts="Z"><span class="cl-etiq">Deshacer</span> ${tecla('Z')}</button><button type="button" data-cl="girar" aria-label="Girar" aria-keyshortcuts="R">Girar ${tecla('R')}</button>` +
          `<button type="button" data-cl="rejilla" aria-pressed="false" aria-label="Cuadritos">Cuadritos</button><button type="button" data-cl="plantillas" aria-expanded="false" aria-controls="cl-plantillas" aria-label="Plantillas" aria-keyshortcuts="T">Plantillas ${tecla('T')}</button><button type="button" data-cl="foto" aria-label="Foto">Foto</button>` +
          `<button type="button" data-cl="quitar" aria-label="Quitar" aria-keyshortcuts="Delete">Quitar ${tecla('Supr')}</button><button type="button" data-cl="listo" aria-label="Listo" aria-keyshortcuts="Escape">Listo ${tecla('Esc')}</button>` +
          (G.tienda && G.tienda.disponible && G.tienda.disponible() ? '<button type="button" data-cl="tienda" aria-label="Mercadito">Mercadito</button>' : '') + '</div>';
        let gesto = null, gestoYa = false;
        hudEl.addEventListener('pointerdown', e => {
          if (!activo || (e.button && e.button > 0)) return;
          const b = e.target.closest && e.target.closest('button');
          if (b && b.dataset.clTipo) return;
          gesto = { id: e.pointerId, x: e.clientX, y: e.clientY, hecho: false };
        });
        hudEl.addEventListener('pointermove', e => {
          if (!gesto || e.pointerId !== gesto.id || gesto.hecho) return;
          const dx = e.clientX - gesto.x, dy = e.clientY - gesto.y;
          if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy)) return;
          gesto.hecho = true; gestoYa = true; girar(dx > 0 ? 1 : -1);
        });
        const finGesto = e => { if (gesto && e.pointerId === gesto.id) gesto = null; };
        hudEl.addEventListener('pointerup', finGesto);
        hudEl.addEventListener('pointercancel', finGesto);
        hudEl.addEventListener('click', e => {
          const b = e.target.closest && e.target.closest('button'); if (!b) return;
          if (b.dataset.clTipo) elegir(b.dataset.clTipo);
          else if (b.dataset.cl === 'mas') { masPiezas(); return; }
          else if (b.dataset.cl === 'girar') { if (gestoYa) gestoYa = false; else girar(1); }
          else if (b.dataset.cl === 'deshacer') deshacer();
          else if (b.dataset.cl === 'rejilla') cuadrícula();
          else if (b.dataset.cl === 'foto') foto();
          else if (b.dataset.cl === 'casita') casita();
          else if (b.dataset.cl === 'plantillas') { verPlantillas(); return; }
          else if (b.dataset.clPl) { verPlantillas(false); plantilla(b.dataset.clPl); }
          else if (b.dataset.cl === 'quitar') quitar();
          else if (b.dataset.cl === 'listo') salir(true);
          else if (b.dataset.cl === 'tienda') { if (G.tienda) G.tienda.abrir('construir', b); return; }
          if (b.blur) b.blur(); // que Espacio y Enter vuelvan al juego
        });
        document.body.appendChild(hudEl);
        if (window.ResizeObserver) { const ro = new ResizeObserver(avisoSitio); ro.observe(hudEl); if (document.getElementById('top')) ro.observe(document.getElementById('top')); }
        const tt = document.getElementById('toast'); if (tt) new MutationObserver(avisoSitio).observe(tt, { attributes: true, attributeFilter: ['hidden'] });
        addEventListener('resize', avisoSitio);
      }
      hudEl.hidden = false;
      avisoSitio();
    }
    // PULIR 6: dónde cabe el aviso mientras se construye en el teléfono (ver css()): en vertical, del borde de abajo del objetivo y los
    // contadores (#top) hasta la barra; en horizontal, del borde de abajo de la barra hasta el pie de la pantalla
    function avisoSitio() {
      if (!hudEl || hudEl.hidden) return;
      const raiz = document.documentElement, top = document.getElementById('top'), h = hudEl.getBoundingClientRect();
      if (!h.height) return;
      let tb = 0; // el borde de abajo de lo que se ve en #top (el objetivo, los contadores y lo que se les añada)
      if (top && top.getClientRects().length) for (const e of [top, ...top.children]) { const r = e.getBoundingClientRect(); if (r.height && getComputedStyle(e).visibility !== 'hidden') tb = Math.max(tb, Math.ceil(r.bottom)); }
      // PULIR 7: en vertical el aviso va abajo (a 206 px del borde, el sitio de «Acción: …»): su alto, hasta la barra y como mucho 96 px
      const arriba = Math.max(tb + 6, 0), hueco = innerWidth <= 560 ? Math.min(96, innerHeight - 206 - Math.ceil(h.bottom) - 8) : innerHeight - Math.ceil(h.bottom) - 14;
      const a = arriba + 'px', m = Math.max(40, hueco) + 'px', al = Math.ceil(h.height) + 'px';
      if (raiz.style.getPropertyValue('--cl-av-top') !== a) raiz.style.setProperty('--cl-av-top', a);
      if (raiz.style.getPropertyValue('--cl-av-max') !== m) raiz.style.setProperty('--cl-av-max', m);
      if (raiz.style.getPropertyValue('--cl-hud-alto') !== al) raiz.style.setProperty('--cl-hud-alto', al);
    }
    // C10 · El botón «Plantillas» cambia la fila de piezas por la de plantillas (en el mismo sitio: no tapa más pantalla) y al revés
    function verPlantillas(on) {
      if (!hudEl) return false;
      const abre = on == null ? !hudEl.classList.contains('cl-pl-abierta') : !!on;
      hudEl.classList.toggle('cl-pl-abierta', abre);
      const b = hudEl.querySelector('[data-cl="plantillas"]'); if (b) b.setAttribute('aria-expanded', String(abre));
      if (on == null) {
        sonar('tick');
        const dest = abre ? hudEl.querySelector('[data-cl-pl]') : b;
        if (dest) try { dest.focus({ preventScroll: true }); } catch (e) { /* */ }
      }
      verMas();
      return abre;
    }
    // La fila de piezas: las 7 de siempre y las del Mercadito que ya son tuyas (teclas 1–9 en ese orden)
    function filaPiezas() { return disponibles().map((t, i) => `<button type="button" data-cl-tipo="${t}" aria-pressed="${t === tipo}" aria-label="${NOMBRE[t]}" title="${NOMBRE[t]}"${i < 9 ? ` aria-keyshortcuts="${i + 1}"` : ''}><svg viewBox="0 0 32 32" aria-hidden="true">${SVG[t]}</svg><small>${NOMBRE[t]}</small></button>`).join(''); }
    // Tras una compra en el Mercadito (src/game/tienda.js) la barra se rehace con la pieza nueva
    function filaPlantillas() { return plantillasVer().map(k => `<button type="button" data-cl-pl="${k}" aria-label="${NOMBRE_PL[k]}"><svg viewBox="0 0 32 32" aria-hidden="true">${SVG_PL[k]}</svg><small>${NOMBRE_PL[k]}</small></button>`).join(''); }
    function refrescar() {
      if (!tiene(tipo)) tipo = 'nido';
      if (!hudEl) return;
      const f = hudEl.querySelector('.cl-piezas'); if (f) f.innerHTML = filaPiezas();
      const fp = hudEl.querySelector('.cl-plantillas'); if (fp && fp.children.length !== plantillasVer().length) fp.innerHTML = filaPlantillas(); // F3: con la bandera, el Merendero
      pintarHud();
    }
    let cuentaTxt = '';
    function pintarHud() {
      if (!hudEl || hudEl.hidden) return;
      hudEl.querySelectorAll('[data-cl-tipo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clTipo === tipo)));
      const c = hudEl.querySelector('.cl-cuenta'), t = `Piezas: ${lista.length}/${presupuesto()}`;
      if (c && t !== cuentaTxt) { cuentaTxt = t; c.textContent = t; }
      const nom = hudEl.querySelector('.cl-ahora'), n = NOMBRE[tipo] || '';
      if (nom && nom.dataset.es !== n) { nom.dataset.es = n; nom.textContent = n; }
      verMas();
      const d = hudEl.querySelector('[data-cl="deshacer"]');
      if (d) {
        const n = historial.length, et = d.querySelector('.cl-etiq');
        d.classList.toggle('cl-hay', n > 0);
        d.setAttribute('aria-disabled', n ? 'false' : 'true');
        if (et) et.textContent = n ? 'Deshacer · ' + n : 'Deshacer';
      }
    }
    function verMas() {
      const f = hudEl && hudEl.querySelector('.cl-piezas');
      const b = hudEl && hudEl.querySelector('[data-cl="mas"]');
      if (!f || !b) return;
      b.hidden = hudEl.classList.contains('cl-pl-abierta') || f.scrollWidth <= f.clientWidth + 2;
    }
    function masPiezas() {
      const f = hudEl && hudEl.querySelector('.cl-piezas');
      if (!f) return;
      const paso = Math.max(80, f.clientWidth - 48);
      const fin = f.scrollLeft + f.clientWidth >= f.scrollWidth - 4;
      const suave = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      f.scrollTo({ left: fin ? 0 : f.scrollLeft + paso, behavior: suave ? 'smooth' : 'auto' });
      sonar('boton');
    }
    try { G.on('aula', k => { if (k !== 'idioma' || !hudEl) return; const a = hudEl.querySelector('.cl-ahora'); if (a) a.dataset.es = ''; pintarHud(); }); } catch (e) { /* sin aula */ }
    // Botón del HUD (junto a Pausa) y tarjeta «Construir» en «¿Cómo quieres jugar?» (no lleva data-modo: menu_modos.js no la cuenta)
    let botonHud = null, tarjeta = null;
    // T17: el botón del HUD no sale con un minijuego o un modo de la portada en marcha (salía encima de Pesca, Minigolf, Carreras…)
    function enMinijuego() {
      const fn = (o, n) => { try { return !!(o && typeof o[n] === 'function' && o[n]()); } catch (e) { return false; } };
      const cl = document.body && document.body.classList;
      if (cl && ['retos-on', 'v18-pesca-on', 'v18-golf-on', 'duelo-on'].some(c => cl.contains(c))) return true;
      if (fn(G.menuModos, 'ocupado') || fn(G.rescate, 'activo') || fn(G.banqueteApi, 'activo')) return true;
      const dm = G.menuModos && G.menuModos.desdeMenu ? G.menuModos.desdeMenu() : null;
      return !!dm && dm !== 'libre';
    }
    setInterval(() => {
      if (!botonHud) return;
      const ocultar = !activo && enMinijuego();
      if (botonHud.hidden !== ocultar) { botonHud.hidden = ocultar; botonHud.style.display = ocultar ? 'none' : ''; }
    }, 400);
    function entradas(ver) {
      if (!ver) { if (botonHud) { botonHud.remove(); botonHud = null; } if (tarjeta) { tarjeta.remove(); tarjeta = null; } return; }
      const sys = $('sys'), menu = $('b-menu');
      if (sys && !botonHud) {
        botonHud = document.createElement('button');
        botonHud.className = 'btn ghost hud-btn'; botonHud.id = 'b-construir'; botonHud.type = 'button'; botonHud.dataset.icon = 'construir';
        botonHud.style.setProperty('--icon', ICONO_HUD); botonHud.setAttribute('aria-label', 'Construir'); botonHud.textContent = 'Construir';
        botonHud.onclick = () => { botonHud.blur(); if (activo) salir(); else empezar(); };
        sys.insertBefore(botonHud, menu && menu.parentNode === sys ? menu : null);
      }
      const form = $('modos'), libre = form && form.querySelector('[data-modo="libre"]');
      if (form && !tarjeta) {
        tarjeta = document.createElement('button');
        tarjeta.className = 'btn tile modo'; tarjeta.type = 'button'; tarjeta.id = 'b-construir-menu'; tarjeta.dataset.construir = '1';
        tarjeta.innerHTML = '<svg class="modo-img" viewBox="0 0 32 32" aria-hidden="true">' + SVG.techo + '</svg><b>Construir</b><small>Tu nido, tu refugio y decoración</small>';
        tarjeta.onclick = desdeMenu;
        if (libre && libre.parentNode) libre.parentNode.insertBefore(tarjeta, libre.nextSibling); else form.appendChild(tarjeta);
      }
    }
    // Desde el menú: entra como «Vuelo libre» (sin misiones) y empieza a construir cuando el mundo está a la vista
    function desdeMenu() {
      const portada = $('title'), cr = $('creator');
      const p = G.menuModos && G.menuModos.elegir ? G.menuModos.elegir('libre') : Promise.resolve(portada && portada.open && (portada.returnValue = '', portada.close()));
      let n = 0;
      const t = () => {
        const libreYa = !(portada && portada.open) && !(cr && !cr.hidden) && !(G.carga && G.carga.activa) && !G.cargaPendiente && !G.ui.busy();
        if (libreYa) { empezar(); return; }
        if (++n < 240) setTimeout(t, 250);
      };
      Promise.resolve(p).then(t, t);
    }

    // ---------- Arranque ----------
    function encender() { asegurarEscena(); aplicar(S.construir); entradas(true); }
    if (G.CONSTRUIR !== false) encender();
    function forzar(v) {
      forzado = !!v;
      if (habilitado()) encender();
      else { salir(); entradas(false); quitarEscena(); if (hudEl) { hudEl.remove(); hudEl = null; cuentaTxt = ''; } }
      return habilitado();
    }

    // ---------- Prueba: AV.construirTest() ----------
    async function test() {
      const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const espera = ms => new Promise(r => setTimeout(r, ms));
      const antes = { construir: S.construir ? JSON.parse(JSON.stringify(S.construir)) : S.construir, interiores: S.interiores ? JSON.parse(JSON.stringify(S.interiores)) : S.interiores, tienda: S.tienda ? JSON.parse(JSON.stringify(S.tienda)) : S.tienda, pos: Object.assign({}, S.pos), facing: Object.assign({}, S.facing),
        modo: G.interaccion.modo, quiet: G.quiet, forzado, nivel: G.renderer.calidad && G.renderer.calidad.nivel };
      const sinApagar = G.CONSTRUIR !== false;
      const enEscena = () => { let n = 0; G.renderer.scene.traverse(o => { if (o.name && o.name.indexOf('construir') === 0) n++; }); return n; };
      try {
        G.quiet = true;
        // 1. Encendido para todos (Kelvin 9-nov): sin ?expansion=1 ya están la tarjeta del menú, el botón junto a Pausa y la tecla B
        check('Sin bandera (sin ?expansion=1) Construir está encendido', sinApagar && habilitado(), 'CONSTRUIR ' + G.CONSTRUIR);
        const tj = $('b-construir-menu'), bh = $('b-construir'), sysEl = $('sys');
        check('Sin bandera: tarjeta «Construir» en «¿Cómo quieres jugar?»', !!tj && !!tj.closest('#modos') && !tj.hidden, tj ? tj.textContent : 'sin tarjeta');
        check('Sin bandera: botón del martillo junto a Pausa', !!bh && !!sysEl && bh.parentNode === sysEl && !bh.hidden);
        check('Sin bandera: la tecla B está libre en el mapa de teclas (ninguna acción la usa de fábrica)', !Object.values((G.input && G.input.DEFECTO) || {}).includes('b') && !bOcupada(), JSON.stringify(G.input && G.input.mapa));
        const portada0 = $('title'), libreB = !(portada0 && portada0.open) && !G.ui.busy() && !(G.pausa && G.pausa.activa());
        if (libreB) {
          dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true })); dispatchEvent(new KeyboardEvent('keyup', { key: 'b', bubbles: true }));
          const abre = activo && !!hudEl && !hudEl.hidden;
          dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true })); dispatchEvent(new KeyboardEvent('keyup', { key: 'b', bubbles: true }));
          check('Sin bandera: la tecla B abre Construir y otra B lo cierra', abre && !activo && G.interaccion.modo === antes.modo);
        } else check('Tecla B (no se prueba: hay una pantalla encima)', true, 'portada/ocupado');
        // 2. Encendida a la fuerza (solo la prueba): escena, entradas y modo
        forzar(true);
        S.construir = null; aplicar(null);
        check('Encendida: 7 piezas de siempre, 7 de la casita (T39 y T59: puerta y ventana), 7 del kit (C9) y 6 del Mercadito, un InstancedMesh por tipo (solo se dibujan los que tienen piezas)', BASE.length === 7 && CASA.length === 7 && KIT.length === 7 && EXTRA.length === 6 && ORDEN.every(t => mallas[t] && mallas[t].isInstancedMesh) && grupo.children.filter(o => o.isInstancedMesh).length === ORDEN.length && ORDEN.every(t => !mallas[t].visible));
        check('Encendida: botón del HUD y tarjeta del menú', !!$('b-construir') && !!$('b-construir-menu'));
        {
          const cl = document.body.classList, tenia = cl.contains('duelo-on');
          cl.add('duelo-on'); await new Promise(r => setTimeout(r, 900));
          const oculto = $('b-construir').hidden;
          if (!tenia) cl.remove('duelo-on'); await new Promise(r => setTimeout(r, 900));
          check('T17 · Con un minijuego en marcha el botón «Construir» del HUD no sale, y vuelve al terminar', oculto && !$('b-construir').hidden, JSON.stringify({ oculto, despues: $('b-construir').hidden }));
        }
        // Un sitio libre para construir: se busca alrededor de la aparición y de donde está Vittata
        const sitios = [[S.pos.x, S.pos.z], [G.guardado.spawn.x, G.guardado.spawn.z], [0, 0], [-20, 10], [15, -15], [30, 30]];
        let ok = false;
        for (const [x, z] of sitios) {
          for (let a = 0; a < 16 && !ok; a++) {
            S.pos.x = x; S.pos.z = z; S.pos.y = H(x, z); S.facing = { x: Math.sin(a / 16 * Math.PI * 2), z: Math.cos(a / 16 * Math.PI * 2) };
            const fx = x + S.facing.x * DIST, fz = z + S.facing.z * DIST;
            ok = !validar('nido', fx, fz) && !validar('tronco', x - S.facing.x * DIST, z - S.facing.z * DIST) && !validar('techo', fx, fz);
          }
          if (ok) break;
        }
        check('Hay un sitio libre en tierra para probar', ok, `${S.pos.x.toFixed(1)}, ${S.pos.z.toFixed(1)}`);
        check('empezar() entra y toma la acción («Colocar»)', empezar() && activo && G.interaccion.modo === modo && modo.verbo === 'Colocar');
        check('PULIR 7 · La cámara de construir sube y se aleja un poco (ajuste del modo, no del motor)', !G.camara || !G.camara.CAM || (G.camara.CAM.height === CAM_CONSTRUIR.height && G.camara.CAM.dist === CAM_CONSTRUIR.dist && !!cam0 && cam0.height < CAM_CONSTRUIR.height), G.camara && G.camara.CAM && [G.camara.CAM.height, G.camara.CAM.dist].join('/'));
        { // PULIR 7 · escritorio 1280×720: la barra va abajo y compacta, sin tapar el centro (Vittata y el sitio de la pieza)
          const fino = !!(window.matchMedia && matchMedia('(pointer:fine)').matches);
          const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
          fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:720px;border:0';
          fr.srcdoc = `<!doctype html><html><head><style>${(estilo && estilo.textContent) || ''}body{margin:0}#cl-hud{position:fixed}</style></head><body>${hudEl.outerHTML}</body></html>`;
          document.body.appendChild(fr);
          await new Promise(r => { fr.addEventListener('load', r, { once: true }); setTimeout(r, 2500); });
          const raiz = fr.contentDocument && fr.contentDocument.getElementById('cl-hud'), c = raiz ? raiz.getBoundingClientRect() : null;
          fr.remove();
          check('PULIR 7 · En 1280×720 la barra va abajo (sin tapar el centro de la pantalla) y compacta, entre la ayuda de teclas y «Controles»', !fino || (!!c && c.top > 720 * 0.6 && c.bottom <= 720 - 8 && c.height <= 200 && c.left >= 160 && c.right <= 1120), c ? [Math.round(c.left), Math.round(c.top), Math.round(c.right), Math.round(c.bottom)].join(',') : (fino ? 'sin barra' : 'puntero táctil: no aplica'));
        }
        { // PULIR 6: el aviso tiene su hueco medido (en el teléfono, entre el objetivo/contadores y la barra, o bajo la barra en horizontal)
          await espera(50); avisoSitio();
          const rz = document.documentElement.style, tA = parseFloat(rz.getPropertyValue('--cl-av-top')), mA = parseFloat(rz.getPropertyValue('--cl-av-max'));
          const tb = $('top') && $('top').getClientRects().length ? $('top').getBoundingClientRect().bottom : 0, txt = (estilo && estilo.textContent) || '';
          check('PULIR 6/7 · Construyendo, el aviso tiene su sitio medido (en el teléfono, abajo en el sitio de «Acción: …», y nunca arriba del todo tapando los contadores)', tA >= tb && mA >= 40 && mA <= Math.max(96, innerHeight) && txt.indexOf('bottom:calc(env(safe-area-inset-bottom,0px) + 206px)') >= 0 && txt.indexOf('top:calc(env(safe-area-inset-top,0px) + 12px);bottom:auto;max-height:200px') < 0, JSON.stringify({ tA, mA, tb: Math.round(tb) }));
        }
        check('Al abrir, el foco entra en la primera pieza y no queda en body', !!hudEl && document.activeElement === hudEl.querySelector('button[data-cl-tipo]'));
        await espera(60);
        check('La barra de piezas se ve con las 7 de siempre (y las compradas) y la cuenta', !!hudEl && !hudEl.hidden && BASE.every(t => hudEl.querySelector('[data-cl-tipo="' + t + '"]')) && hudEl.querySelectorAll('[data-cl-tipo]').length === disponibles().length && /Piezas: 0\/\d+/.test(hudEl.querySelector('.cl-cuenta').textContent), hudEl && hudEl.querySelector('.cl-cuenta').textContent);
        check('La pieza elegida dice su nombre', (hudEl.querySelector('.cl-ahora') || {}).textContent === 'Nido de ramitas');
        elegir('flores');
        check('Elegir otra pieza dice su nombre y da un salto', (hudEl.querySelector('.cl-ahora') || {}).textContent === 'Flores' && !!(hudEl.querySelector('[data-cl-tipo="flores"]') || {}).classList.contains('cl-pop') && !!(hudEl.querySelector('[data-cl="mas"]')));
        elegir('nido');
        const botonesA = [...hudEl.querySelectorAll('button')], hojaA = (document.getElementById('cl-estilo') || {}).textContent || '';
        check('Cada botón tiene nombre para el lector, mide 44 px y el foco se ve', botonesA.length >= 8 && botonesA.every(b => (b.getAttribute('aria-label') || '').trim().length > 1 && parseFloat(getComputedStyle(b).minWidth) >= 44 && parseFloat(getComputedStyle(b).minHeight) >= 44) && /:focus-visible/.test(hojaA) && /prefers-reduced-motion/.test(hojaA), botonesA.map(b => b.getAttribute('aria-label')).join(','));
        {
          const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
          fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0';
          const emotes = '#emotes{position:fixed;top:50%;right:72px;transform:translateY(-50%);width:min(280px,calc(100vw - 96px));height:220px;background:#123}';
          fr.srcdoc = `<!doctype html><html><head><style>${hojaA}body{margin:0}${emotes}</style></head><body>${hudEl.outerHTML}<div id="emotes" hidden></div></body></html>`;
          document.body.appendChild(fr);
          await new Promise(r => { fr.addEventListener('load', r, { once: true }); setTimeout(r, 2500); });
          const doc = fr.contentDocument, mal = [];
          const dentro = (sel) => {
            const b = doc && doc.querySelector(sel); if (!b) { mal.push('falta ' + sel); return; }
            const r = b.getBoundingClientRect();
            if (r.right > 390 || r.left < 0 || r.bottom > 844 || r.top < 0) mal.push(`${sel} ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}`);
          };
          const sels = ['[aria-label="Quitar"]', '[aria-label="Listo"]', '[aria-label="Cuadritos"]', '[aria-label="Plantillas"]'].concat(hudEl.querySelector('[aria-label="Mercadito"]') ? ['[aria-label="Mercadito"]'] : []);
          sels.forEach(dentro);
          const emo = doc && doc.getElementById('emotes'), piezas = doc && doc.querySelector('.cl-piezas');
          if (emo && piezas) {
            emo.hidden = false;
            const a = piezas.getBoundingClientRect(), c = emo.getBoundingClientRect();
            const choca = a.right > c.left + 1 && a.bottom > c.top + 1 && a.top < c.bottom - 1 && a.left < c.right - 1;
            if (choca) mal.push('gestos tapan las piezas');
            emo.hidden = true;
          }
          // C10: con «Plantillas» abierta, su fila ocupa el sitio de la de piezas (no más alta) y sus 5 botones caben enteros en 390
          const raiz = doc && doc.getElementById('cl-hud');
          if (raiz && piezas) {
            const hA = raiz.getBoundingClientRect().height; raiz.classList.add('cl-pl-abierta');
            const hB = raiz.getBoundingClientRect().height, bs = [...doc.querySelectorAll('[data-cl-pl]')];
            if (getComputedStyle(piezas).display !== 'none') mal.push('la fila de piezas sigue con plantillas abiertas');
            if (hB > hA + 1) mal.push(`plantillas más alta ${Math.round(hA)}→${Math.round(hB)}`);
            if (bs.length !== 5) mal.push('plantillas: ' + bs.length);
            bs.forEach(b => { const r = b.getBoundingClientRect(); if (r.left < 0 || r.right > 390 - 12 || r.width < 44 || r.height < 44) mal.push(`${b.dataset.clPl} ${Math.round(r.left)}–${Math.round(r.right)} ${Math.round(r.width)}×${Math.round(r.height)}`); });
          }
          fr.remove();
          check('En 390 se ven Quitar, Listo, Plantillas y Mercadito, los gestos no tapan las piezas y las 5 plantillas caben (C10)', !mal.length, mal.join(' · '));
        }
        {
          // C10 · teléfono en horizontal (844×390): la barra queda en el centro, entre el joystick (izquierda) y los botones de acción
          // (derecha), bajo el HUD de arriba, sin cortar ningún botón, con las piezas o con las plantillas abiertas
          const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
          fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:844px;height:390px;border:0';
          fr.srcdoc = `<!doctype html><html><head><style>${hojaA}body{margin:0}#cl-hud{position:fixed}</style></head><body>${hudEl.outerHTML}</body></html>`;
          document.body.appendChild(fr);
          await new Promise(r => { fr.addEventListener('load', r, { once: true }); setTimeout(r, 2500); });
          const doc = fr.contentDocument, raiz = doc && doc.getElementById('cl-hud'), mal = [];
          const mide = et => {
            const c = raiz.getBoundingClientRect();
            if (c.top < 149 || c.bottom > 330 || c.left < 199 || c.right > 645) mal.push(`${et} caja ${Math.round(c.left)},${Math.round(c.top)}–${Math.round(c.right)},${Math.round(c.bottom)}`);
            raiz.querySelectorAll('.cl-herr button, .cl-plantillas button').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && (r.left < c.left - 1 || r.right > c.right + 1)) mal.push(et + ' cortado ' + b.getAttribute('aria-label')); });
          };
          if (raiz) { mide('piezas'); raiz.classList.add('cl-pl-abierta'); mide('plantillas'); } else mal.push('sin barra');
          fr.remove();
          check('C10 · en 844×390 la barra va al centro, entre el joystick y los botones de acción, y no corta nada', !mal.length, mal.join(' · '));
        }
        elegir('nido'); actualizar();
        check('Fantasma visible y verde donde cabe', fantasma.visible && est.valido && matF.color.g > matF.color.r, est.motivo);
        // 3. Colocar, girar, deshacer y quitar
        const yAntes = fantasma.rotation.y;
        check('Acción coloca un nido (por G.interaccion.action, como el botón)', ((G.ui.busy() ? modo.accion() : G.interaccion.action()), lista.length === 1 && lista[0].t === 'nido' && mallas.nido.count === 1 && mallas.nido.visible));
        await espera(900);
        check('Las piezas no caen en el recorte de objetos pequeños (capa 0, visibles)', grupo.userData.sinCulling === true && mallas.nido.layers.mask === 1 && fantasma.layers.mask === 1, mallas.nido.layers.mask);
        girar(1); girar(1);
        check('Girar: dos pasos de 45° (R)', giro === 2 && Math.abs(fantasma.rotation.y - yAntes - Math.PI / 2) < 1e-6, giro);
        girar(-1);
        check('Girar al revés (Q)', giro === 1);
        dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
        check('La tecla R gira mientras se construye', giro === 2, giro);
        dispatchEvent(new KeyboardEvent('keydown', { key: '6', bubbles: true }));
        check('La tecla 6 elige el tronco', tipo === 'tronco');
        S.facing = { x: -S.facing.x, z: -S.facing.z }; actualizar();
        check('Coloca un tronco girado', colocar() && lista.length === 2 && lista[1].r === 2 && mallas.tronco.count === 1, est.motivo);
        check('Colocar suena la pieza de madera (T45)', !!(G.audio && G.audio.log && G.audio.log.includes('pieza')));
        check('El tronco queda al ras del suelo', Math.abs(new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(mallas.tronco.instanceMatrix.array, 0)).y - H(lista[1].x, lista[1].z)) < 1e-3);
        check('Deshacer quita el último (Z)', (dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true })), lista.length === 1 && mallas.tronco.count === 0 && !mallas.tronco.visible));
        S.facing = { x: -S.facing.x, z: -S.facing.z }; actualizar();
        {
          const oidos = [], play0 = G.audio && G.audio.play, q0 = G.quiet; let quito = false;
          try { if (play0) G.audio.play = (n, a) => { oidos.push(n + ':' + a); return false; }; G.quiet = false; quito = quitar(); } finally { if (play0) G.audio.play = play0; G.quiet = q0; }
          check('Quitar borra la pieza bajo el fantasma', quito && lista.length === 0 && !mallas.nido.visible);
          check('F21: quitar suena «pieza» más grave (0,85), una vez y sin el «pickup» de antes', oidos.join() === 'pieza:0.85', oidos.join());
        }
        check('Deshacer devuelve la pieza quitada', deshacer() && lista.length === 1 && lista[0].t === 'nido');
        check('No se puede poner otra pieza encima del nido', (actualizar(), !est.valido && /cerca/.test(est.motivo)), est.motivo);
        { // PULIR 7: «Muy cerca de otra pieza» señala cuál: un aro rojo que parpadea a sus pies; el fantasma lleva su aro opaco
          const w = choque && mundoDe(choque);
          check('PULIR 7 · La pieza que estorba se señala con un aro rojo (y el fantasma se distingue: aro opaco, pieza translúcida)', !!aroC && aroC.visible && !!w && Math.hypot(aroC.position.x - w.x, aroC.position.z - w.z) < 1e-6 && choque.t === 'nido' && matA.opacity > matF.opacity && anillo.material === matA, choque && choque.t);
        }
        elegir('techo'); actualizar();
        check('El techo de hojas sí va sobre el nido', est.valido && colocar() && lista.length === 2, est.motivo);
        check('PULIR 7 · Sin choque, el aro rojo se va', (actualizar(), !aroC.visible));
        { // PULIR 7 · «¡Mira lo que hice!»: Iguaca llega, se posa encima de la obra, Vittata celebra y sale la frase con la Foto
          const t0 = G.ui.toastHTML, e0 = G.actores && G.actores.playEmote, dichos = [], gestos = [], say0 = G.dialogo && G.dialogo.say, bocas = [];
          const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, f0 = S.facing, CAMv = G.camara && G.camara.CAM, camV0 = CAMv ? { height: CAMv.height, dist: CAMv.dist } : null, yawV0 = G.camara ? G.camara.yaw : 0;
          if (G.dialogo) G.dialogo.say = (ls, d, o) => { for (const l of ls) bocas.push({ who: l.who, text: l.text, img: l.img, libre: !!(o && o.libre) }); };
          const n = G.actores && G.actores.npc && G.actores.npc('luma'), vis0 = n ? n.sp.visible : null;
          G.ui.toastHTML = h => { dichos.push(String(h)); };
          if (G.actores) G.actores.playEmote = g => { gestos.push(g); return true; };
          try {
            check('PULIR 7 · Listo con menos de 3 piezas no llama a Iguaca', hayObra(true) === false);
            lista.push({ t: 'piedra', x: est.x + 4, z: est.z + 4, r: 0 });
            const h0 = sesion.h0; sesion.h0 = historial.length;
            const sinCambios = hayObra(true); sesion.h0 = Math.max(0, historial.length - 1);
            check('PULIR 7 · Con 3 piezas y algo hecho en esta vuelta, «Listo» (no otras salidas) llama a Iguaca', hayObra(true) === true && hayObra() === false && sinCambios === false);
            sesion.h0 = h0;
            // Ronda 2: Vittata debajo del techo (en el centro de la obra) → el encuadre la saca al borde y la cámara sube, se aleja y mira a la obra
            const hu = huellaObra(); S.pos.x = hu.x + 0.1; S.pos.z = hu.z + 0.1; S.pos.y = H(S.pos.x, S.pos.z);
            const ok = miraLoQueHice(true), cima = cimaDeLaObra(new THREE.Vector3()), enc = VIS.enc || {};
            const llega = !!VIS.sp && VIS.sp.parent === grupo && (!n || !n.sp.visible);
            if (!ctx) {
              const dV = Math.hypot(S.pos.x - hu.x, S.pos.z - hu.z), cy = G.camara ? G.camara.yaw : 0;
              const lado = ((Math.sin(cy) * (S.pos.x - hu.x) + Math.cos(cy) * (S.pos.z - hu.z)) / Math.max(1e-6, dV));
              check('PULIR 7 r2 · «¡Mira lo que hice!» encuadra la obra: Vittata sale de debajo del techo y la cámara sube, se aleja y mira desde su lado hacia la obra', dV >= hu.r - 1e-6 && (!CAMv || (CAMv.height >= CAM_OBRA.height && CAMv.dist >= CAM_OBRA.dist && lado > 0.25)), JSON.stringify({ dV: +dV.toFixed(2), r: +hu.r.toFixed(2), h: CAMv && CAMv.height, d: CAMv && CAMv.dist, lado: +lado.toFixed(2), enc: { movida: enc.movida, vuela: enc.vuela } }));
              const techo = lista.find(p => p.t === 'techo'), wt = techo && mundoDe(techo);
              check('PULIR 7 r2 · Iguaca se posa en la pieza más alta (el techo), no en la última puesta', !techo || (Math.hypot(cima.x - wt.x, cima.z - wt.z) < 1e-6), JSON.stringify({ cima: [cima.x, cima.z], techo: wt && [wt.x, wt.z] }));
            }
            let posada = false, maxY = -Infinity;
            for (let i = 0; i < 160 && VIS.on; i++) { pasoVisita(0.1); if (VIS.sp && VIS.t > DUR.llega && VIS.t < DUR.llega + DUR.posada) { maxY = Math.max(maxY, VIS.sp.position.y); if (Math.hypot(VIS.sp.position.x - cima.x, VIS.sp.position.z - cima.z) < 1e-6) posada = true; } }
            const txt = dichos.join(' ');
            check('PULIR 7 · Iguaca llega volando y se posa encima de la obra (sin dos Iguacas a la vez)', ok && (!n || (llega && posada && maxY >= cima.y - 1e-6)), JSON.stringify({ ok, llega, posada, npc: !!n }));
            check('PULIR 7 · Vittata hace su gesto Celebrar y sale una frase de Iguaca con el botón de la Foto', gestos.includes('celebrar') && bocas.some(b => FRASES_IGUACA.includes(b.text)) && /data-cl-mi-obra/.test(txt) && txt.indexOf(TXT_OBRA.foto) >= 0, txt.slice(0, 160));
            check('PULIR 7 r2 · la frase de Iguaca va en un bocadillo con su cara (no en el aviso de la tuerca, que solo lleva la Foto)', bocas.some(b => b.who === 'Iguaca' && b.libre && FRASES_IGUACA.includes(b.text) && !!b.img) && !FRASES_IGUACA.some(f => txt.indexOf(f.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))) >= 0), JSON.stringify(bocas).slice(0, 160));
            check('PULIR 7 · Al terminar, Iguaca se va y vuelve a su sitio de siempre', !VIS.on && !VIS.sp && !grupo.children.some(o => o.name === 'construir_iguaca') && (!n || n.sp.visible === vis0));
            check('PULIR 7 r2 · al irse Iguaca, la cámara vuelve a su ajuste de antes', !CAMv || (CAMv.height === camV0.height && CAMv.dist === camV0.dist), CAMv && JSON.stringify({ h: CAMv.height, d: CAMv.dist, antes: camV0 }));
            { // «¡Yo también salgo!»: en la Foto de mi obra Iguaca se pone delante y sale en primer plano; repetida, se aparta
              miraLoQueHice(true); for (let i = 0; i < 20; i++) pasoVisita(0.1);
              bocas.length = 0;
              const snapR = G.renderer.snapshot, camR = G.renderer.camera, rz = G.actores && G.actores.player3D && G.actores.player3D.root, medidas = [];
              G.renderer.snapshot = function () { const sp = VIS.sp; medidas.push({ iguaca: sp && camR ? camR.position.distanceTo(sp.position) : null, vittata: camR ? camR.position.distanceTo(new THREE.Vector3(S.pos.x, S.pos.y + 1.2, S.pos.z)) : null, enObra: sp ? sp.position.distanceTo(VIS.a) < 1e-6 : null, vVisible: rz ? rz.visible : true }); return snapR.apply(this, arguments); };
              let u1 = null, u2 = null;
              try { u1 = await foto({ obra: true }); u2 = await foto({ obra: true }); } finally { G.renderer.snapshot = snapR; }
              const [m1, m2] = medidas;
              check('PULIR 7 r2 · «¡Yo también salgo!»: en la Foto de mi obra Iguaca se cuela delante de Vittata (primer plano), Vittata se ve y dice su frase', !!m1 && (!VIS.sp && !n || (m1.iguaca != null && m1.iguaca < m1.vittata && m1.enObra === false)) && m1.vVisible && bocas[0] && bocas[0].text === TXT_OBRA.salgo && typeof u1 === 'string' && u1.indexOf('data:image/png') === 0, JSON.stringify({ m1, b: bocas[0] }));
              check('PULIR 7 r2 · repetida la foto, Iguaca se aparta a su sitio encima de la obra: «Esta vez sí, toda tuya»', !!m2 && (!n || m2.enObra === true) && bocas[1] && bocas[1].text === TXT_OBRA.tuya && typeof u2 === 'string', JSON.stringify({ m2, b: bocas[1] }));
              check('PULIR 7 r2 · tras la foto Iguaca vuelve a su sitio encima de la obra', !VIS.sp || VIS.sp.position.distanceTo(VIS.a) < 1e-6);
              finVisita();
              document.documentElement.classList.add('mov-reducido');
              try { miraLoQueHice(true); check('PULIR 7 r2 · con «Reducir movimiento» Iguaca aparece ya posada en el encuadre, sin vuelo ni saltos', VIS.t >= DUR.llega && (!VIS.sp || VIS.sp.position.distanceTo(VIS.a) < 1e-6)); } finally { document.documentElement.classList.remove('mov-reducido'); finVisita(); }
            }
            if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
            const D = window.AV_EN || {}, faltan = FRASES_IGUACA.concat([TXT_OBRA.foto, TXT_OBRA.quien, TXT_OBRA.salgo, TXT_OBRA.tuya]).filter(t => !D[t]);
            check('PULIR 7 · Las frases de Iguaca y «Foto de mi obra» tienen su inglés en content/cap1/en.js', !faltan.length, faltan.join(' | '));
          } finally {
            lista.pop(); finVisita(); pintar();
            G.ui.toastHTML = t0; if (G.actores) G.actores.playEmote = e0; if (G.dialogo && say0) G.dialogo.say = say0;
            S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = f0; if (G.camara) G.camara.yaw = yawV0;
          }
        }
        // CG-78: cuadrícula suave, gesto de giro, foto local y Deshacer visible
        const btnDes = hudEl.querySelector('[data-cl="deshacer"]');
        check('Deshacer se marca cuando hay algo que deshacer', !!btnDes && btnDes.classList.contains('cl-hay') && btnDes.getAttribute('aria-disabled') === 'false' && /Deshacer · [1-9]/.test(btnDes.textContent), btnDes && btnDes.textContent);
        const g0 = giro, zona = hudEl.querySelector('[data-cl="girar"]');
        zona.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 40, pointerId: 7 }));
        zona.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 80, clientY: 44, pointerId: 7 }));
        zona.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 80, clientY: 44, pointerId: 7 }));
        check('Un gesto horizontal sobre Girar gira la pieza', giro === (g0 + 1) % 8, giro + ' desde ' + g0);
        girar(-1);
        check('La cuadrícula empieza apagada', cuadrícula(false) === false && hudEl.querySelector('[data-cl="rejilla"]').getAttribute('aria-pressed') === 'false');
        cuadrícula(true);
        for (let i = 0; i < 14; i++) actualizar();
        const meta = crudo();
        check('Con la cuadrícula el fantasma se acerca a la casilla de 1 m', Math.abs(est.x - Math.round(meta.x)) < 0.05 && Math.abs(est.z - Math.round(meta.z)) < 0.05, est.x.toFixed(3) + ',' + est.z.toFixed(3));
        const nAntes = lista.length, cabe = !validar(tipo, Math.round(meta.x), Math.round(meta.z));
        if (cabe) {
          check('La pieza colocada cae en la cuadrícula', colocar() && Math.abs(lista[lista.length - 1].x - Math.round(meta.x)) < 1e-6 && Math.abs(lista[lista.length - 1].z - Math.round(meta.z)) < 1e-6, lista[lista.length - 1].x + ',' + lista[lista.length - 1].z);
          deshacer();
          check('Deshacer quita esa pieza de la cuadrícula', lista.length === nAntes);
        } else check('La casilla de la cuadrícula no estaba libre (el acercamiento ya se midió)', true, est.motivo);
        cuadrícula(false); actualizar();
        const suelto = crudo();
        check('Sin cuadrícula el fantasma vuelve a seguir a Vittata', Math.abs(est.x - suelto.x) < 1e-6 && Math.abs(est.z - suelto.z) < 1e-6);
        const camF = G.camara, yawF = camF && camF.yaw, rzF = G.actores && G.actores.player3D && G.actores.player3D.root, visF = rzF && rzF.visible;
        let yawDentro = null, ocultaDentro = null; const snap0 = G.renderer.snapshot;
        G.renderer.snapshot = function () { yawDentro = camF ? camF.yaw : null; ocultaDentro = rzF ? !rzF.visible : null; return snap0.apply(this, arguments); };
        // Lo que «vuelve como estaba» se mide al volver (la última colocación de la cámara en foto()): mientras se pasa a PNG corren
        // cuadros y la cámara sigue a Vittata como siempre, así que comparar al final daba rojos de cadena (también antes de F3)
        const place0 = camF && camF.place; let yawTras = null, visTras = null;
        if (place0) camF.place = function () { yawTras = camF.yaw; visTras = rzF ? rzF.visible : null; return place0.apply(this, arguments); };
        let urlFoto; try { urlFoto = await foto(); } finally { G.renderer.snapshot = snap0; if (place0) camF.place = place0; }
        check('T40 · la foto pone la cámara detrás, mirando al rincón, sin Vittata delante, y luego todo vuelve como estaba',
          (!camF || (yawDentro === 0 && yawTras === yawF)) && (!rzF || (ocultaDentro === true && rzF.visible === visF && (!place0 || visTras === visF))), JSON.stringify({ yawDentro, yawF, yawTras, ocultaDentro }));
        check('La foto del rincón es un PNG local y no deja un enlace para subirlo', typeof urlFoto === 'string' && urlFoto.indexOf('data:image/png') === 0 && urlFoto.length > 200 && !document.querySelector('a[download="rincon-vittata.png"]'), urlFoto ? urlFoto.slice(0, 22) + '… ' + urlFoto.length : 'sin foto');
        // 3b. Piezas del Mercadito del río: sin comprarlas no salen en la barra ni se eligen; compradas, sí (teclas 1–9 en el orden de la barra)
        S.tienda = { v: 1, conchitas: 0, ganadas: 0, compras: [] }; refrescar();
        const nLibres = BASE.length + CASA.length + KIT.length;
        check('Sin comprarla, el farol no está en la barra ni se puede elegir', !hudEl.querySelector('[data-cl-tipo="farol"]') && !elegir('farol') && tipo !== 'farol' && disponibles().length === nLibres);
        S.tienda = { v: 1, conchitas: 0, ganadas: 40, compras: ['farol'] }; refrescar();
        dispatchEvent(new KeyboardEvent('keydown', { key: '8', bubbles: true }));
        const t8 = tipo; hudEl.querySelector('[data-cl-tipo="farol"]').click();
        check('Comprado, el farol sale en la barra (detrás de las libres), se elige tocándolo y la tecla 8 es la 8.ª de la barra (el piso)', !!hudEl.querySelector('[data-cl-tipo="farol"]') && disponibles().length === nLibres + 1 && t8 === disponibles()[7] && tipo === 'farol', t8 + ' → ' + tipo);
        S.facing = { x: -S.facing.x, z: -S.facing.z }; actualizar();
        check('El farol comprado se coloca como las demás (su propio InstancedMesh)', colocar() && lista.length === 3 && lista[2].t === 'farol' && mallas.farol.count === 1 && mallas.farol.visible, est.motivo);
        deshacer(); S.facing = { x: -S.facing.x, z: -S.facing.z };
        check('Las 6 piezas del Mercadito se construyen (geometría con color de vértice y sin NaN)', EXTRA.every(t => geos[t] && geos[t].attributes.color && Array.from(geos[t].attributes.position.array).every(Number.isFinite)));
        S.tienda = antes.tienda; refrescar(); elegir('techo');
        // 4. Guardado y recarga (la partida serializada vuelve a pintar lo mismo); datos dañados = vacío
        const d = JSON.parse(G.guardado.serialize(true));
        check('La partida guarda S.construir (v1, 2 piezas)', d.construir && d.construir.v === 1 && d.construir.piezas.length === 2 && G.guardado.KEYS.includes('construir'), JSON.stringify(d.construir).slice(0, 120));
        salir(); aplicar(null);
        check('Vaciar quita todo', lista.length === 0 && ORDEN.every(t => mallas[t].count === 0));
        aplicar(d.construir);
        check('Al recargar vuelven las mismas piezas', lista.length === 2 && mallas.nido.count === 1 && mallas.techo.count === 1 && lista[0].x === d.construir.piezas[0].x);
        const malos = ['basura', 42, [], { v: 2, piezas: [{ t: 'nido', x: 0, z: 0 }] }, { v: 1 }, { v: 1, piezas: 'x' }];
        check('Un guardado dañado o de otra versión se lee vacío', malos.every(m => aplicar(m) === 0));
        check('Las piezas raras se descartan y las buenas quedan', aplicar({ v: 1, piezas: [{ t: 'nave', x: 1, z: 1 }, { t: 'nido', x: NaN, z: 0 }, null, { t: 'flores', x: 1, z: 2, r: 99 }, { t: 'piedra', x: '3', z: 1 }] }) === 1 && lista[0].r === 0);
        // T39 · la casita: texturas por grupo y encaje con imán (piso con piso, pared en el borde, tejado en el centro)
        {
          aplicar(null); empezar(); giro = 0; rejilla = false;
          const pIni = { x: S.pos.x, z: S.pos.z }, f0 = S.facing;
          // un sitio libre cerca (sin agua ni sólidos donde van los dos pisos y la pared)
          let p0 = pIni;
          for (let k = 0; k < 24; k++) {
            const q = { x: pIni.x + (k % 6) * 6 - 15, z: pIni.z + Math.floor(k / 6) * 6 - 9 };
            if ([0, 2].every(d => !validar('piso', q.x + 3 + d, q.z)) && !validar('pared', q.x + 3, q.z + 1)) { p0 = q; break; }
          }
          S.pos.x = p0.x; S.pos.z = p0.z;
          S.facing = { x: 1, z: 0 }; elegir('piso'); actualizar();
          const c0 = { x: est.x, z: est.z }, motivo0 = est.motivo, puso = colocar();
          S.pos.x = p0.x + 2.35; elegir('piso'); actualizar();
          const imanPiso = { iman: est.iman, dx: +(est.x - c0.x).toFixed(3), dz: +(est.z - c0.z).toFixed(3), r: est.r, dorado: matF.color.equals(lin('#ffd27a')) };
          const puso2 = colocar();
          S.pos.x = p0.x + 0.3; S.pos.z = p0.z + 0.75; elegir('pared'); actualizar();
          const imanPared = { iman: est.iman, dx: +(est.x - c0.x).toFixed(3), dz: +(est.z - c0.z).toFixed(3), r: est.r };
          const puso3 = colocar();
          S.pos.x = p0.x + 0.3; S.pos.z = p0.z + 0.2; elegir('tejado'); actualizar();
          const imanTejado = { iman: est.iman, dx: +(est.x - c0.x).toFixed(3), dz: +(est.z - c0.z).toFixed(3) };
          S.pos.x = p0.x - 4; S.pos.z = p0.z; elegir('pared'); actualizar(); const sinIman = !est.iman && est.r === giro;
          check('T39 · imán: un piso encaja al lado de otro (2 m), la pared en su borde y el tejado en su centro; lejos, sin imán',
            puso && puso2 && puso3 && imanPiso.iman && Math.abs(imanPiso.dx - 2) < 1e-3 && Math.abs(imanPiso.dz) < 1e-3 && imanPiso.dorado &&
            imanPared.iman && Math.abs(imanPared.dx) < 1e-3 && Math.abs(imanPared.dz - 1) < 1e-3 && imanPared.r === 0 && imanTejado.iman && Math.abs(imanTejado.dx) < 1e-3 && Math.abs(imanTejado.dz) < 1e-3 && sinIman,
            JSON.stringify({ puso, motivo0, puso2, puso3, imanPiso, imanPared, imanTejado, sinIman, motivo: est.motivo }));
          S.pos.x = p0.x + 0.3; S.pos.z = p0.z - 0.75; elegir('puerta'); actualizar();
          check('T59 · la pared con puerta y la de ventana encajan como la pared (borde del piso) y llevan tablas', est.iman && Math.abs(est.z - (c0.z - 1)) < 1e-3 && geos.puerta.userData.mats.includes('tablas') && geos.ventana.userData.mats.includes('tablas') && imanes('ventana').length > 0, JSON.stringify({ iman: est.iman, dz: +(est.z - c0.z).toFixed(3) }));
          const g = geos.pared, gp = geos.piso, ms = mallas.piso.material;
          check('T39 · las piezas de la casita llevan texturas del kit (tablas, piedra, paja), un grupo por material, y se piden al usarlas',
            Array.isArray(ms) && gp.groups.length === 2 && g.groups.length === 1 && geos.muro.userData.mats.includes('piedra') && geos.tejado.userData.mats.includes('paja') && !!cargadas.tablas &&
            CASA.every(t => geos[t].attributes.uv && Array.from(geos[t].attributes.position.array).every(Number.isFinite)) && !Array.isArray(mallas.nido.material),
            JSON.stringify({ piso: gp.groups.length, pared: g.groups.length, cargadas }));
          // T50: Casita rápida, de un toque y con un solo Deshacer
          aplicar(null); S.pos.x = p0.x; S.pos.z = p0.z; S.facing = { x: 1, z: 0 }; actualizar();
          const hizoC = casita(), tiposC = lista.map(p => p.t).sort().join(','), nC = lista.length;
          const unDeshacer = deshacer() && lista.length === 0;
          const enCuarto = (ctx = { id: 'x' }, !casita()); ctx = null;
          check('T50 · «Casita rápida»: dos pisos, tejado y tres paredes (y la maceta si cabe) de un toque; un Deshacer la quita; dentro de un cuarto no',
            hizoC && (tiposC === 'maceta,pared,pared,pared,piso,piso,tejado' || tiposC === 'pared,pared,pared,piso,piso,tejado') && unDeshacer && enCuarto && !!(hudEl && hudEl.querySelector('[data-cl-pl="casita"]')), JSON.stringify({ hizoC, nC, tiposC, unDeshacer, enCuarto }));
          // C9 · cada pieza nueva lleva texturas del kit, icono y nombre, encaja con imán donde toca (piso en P, giro 0) y se coloca
          {
            aplicar(null); empezar(); giro = 0; S.pos.x = p0.x; S.pos.z = p0.z; S.facing = { x: 1, z: 0 }; elegir('piso'); actualizar();
            const P = { x: est.x, z: est.z }, conPiso = colocar(), mal = [];
            const META = { escalera: [0, 1.4, 0], baranda: [0, 1, 0], dosaguas: [0, 0, 0], farolito: [1.2, 1.2, 0], valla: [0, 1, 0], banco: [1.3, 0, 2], huerto: [-1.5, 0, 6] };
            for (const t of KIT) {
              const [dx, dz, r] = META[t] || [9, 9, 0];
              S.pos.x = P.x + dx - DIST + 0.2; S.pos.z = P.z + dz + 0.15; elegir(t); actualizar();
              const g = geos[t], kitTex = g.userData.mats.some(m => m === 'tablas' || m === 'piedra' || m === 'paja');
              const okT = est.iman && Math.abs(est.x - P.x - dx) < 1e-3 && Math.abs(est.z - P.z - dz) < 1e-3 && est.r === r && kitTex && !!SVG[t] && !!NOMBRE[t] &&
                Array.from(g.attributes.position.array).every(Number.isFinite) && !!(hudEl && hudEl.querySelector('[data-cl-tipo="' + t + '"]'));
              const n0 = lista.length, puso = okT && colocar() && lista.length === n0 + 1 && lista[n0].t === t && mallas[t].count === 1;
              if (!puso) mal.push(t + ' ' + JSON.stringify({ iman: est.iman, dx: +(est.x - P.x).toFixed(2), dz: +(est.z - P.z).toFixed(2), r: est.r, kitTex, motivo: est.motivo }));
              if (puso) deshacer();
            }
            check('C9 · escalera, baranda, techo a dos aguas, farol de piedra, cerca de tablas, banco y huerto: texturas del kit, icono, y encajan con imán junto a un piso y se colocan', conPiso && !mal.length, mal.join(' · ') || 'P ' + P.x.toFixed(1) + ',' + P.z.toFixed(1));
            aplicar(null);
          }
          // C10 · plantillas de un toque: se colocan (lo que cabe), cuentan piezas, un Deshacer las quita enteras y Quitar va pieza a pieza
          {
            empezar(); elegir('flores'); const res = {}, malP = [];
            for (const k of Object.keys(PLANTILLAS)) {
              aplicar(null); S.pos.x = p0.x; S.pos.z = p0.z; S.facing = { x: 1, z: 0 }; actualizar();
              const hizo = plantilla(k), n = lista.length, tipos = lista.every(p => PLANTILLAS[k].some(r => r[0] === p.t));
              const cuenta = (pintarHud(), hudEl.querySelector('.cl-cuenta').textContent === 'Piezas: ' + n + '/' + presupuesto());
              const unoMenos = n > 1 ? (S.pos.x = lista[n - 1].x - DIST, S.pos.z = lista[n - 1].z, actualizar(), quitar() && lista.length === n - 1) : true;
              const todo = (n > 1 ? deshacer() : true) && deshacer() && lista.length === 0 && rehacer() && lista.length === n;
              res[k] = n;
              if (!(hizo && n >= Math.min(3, PLANTILLAS[k].length) && tipos && cuenta && unoMenos && todo)) malP.push(k + ' ' + JSON.stringify({ hizo, n, tipos, cuenta, unoMenos, todo }));
            }
            check('C10 · Casita rápida, Bohío, Torre de vigía, Puente pequeño y Nido grande se colocan de un toque, cuentan piezas, Quitar va pieza a pieza y un Deshacer quita la plantilla entera', !malP.length, malP.join(' · ') || JSON.stringify(res));
            // límite de piezas: con 2 libres pone 2 y lo dice; lleno no pone nada; dentro de un cuarto no
            aplicar(null); S.pos.x = p0.x; S.pos.z = p0.z; S.facing = { x: 1, z: 0 };
            const top = presupuesto();
            for (let i = 0; i < top - 2; i++) lista.push({ t: 'flores', x: r2(p0.x + 300 + i * 2), z: r2(p0.z + 300), r: 0 });
            actualizar();
            const parcial = plantilla('bohio') && lista.length === top, lleno = !plantilla('torre') && lista.length === top;
            aplicar(null);
            const enCuartoP = (ctx = { id: 'x' }, !plantilla('nidogrande')); ctx = null;
            check('C10 · las plantillas respetan el límite de piezas (con 2 libres pone 2; lleno, ninguna) y no van dentro de un cuarto', parcial && lleno && enCuartoP, JSON.stringify({ parcial, lleno, enCuartoP, top }));
            // la barra: «Plantillas» cambia la fila de piezas por la de plantillas; T la abre, Esc la cierra; un toque coloca y la cierra
            const bP = hudEl.querySelector('[data-cl="plantillas"]'), filaP = hudEl.querySelector('.cl-plantillas'), filaZ = hudEl.querySelector('.cl-piezas');
            bP.click();
            const abierta = hudEl.classList.contains('cl-pl-abierta') && bP.getAttribute('aria-expanded') === 'true' && getComputedStyle(filaP).display !== 'none' && getComputedStyle(filaZ).display === 'none' && filaP.querySelectorAll('button[data-cl-pl]').length === 5 && document.activeElement === filaP.querySelector('button');
            // las teclas solo llegan sin nada encima (como la B de arriba): si quedó un diálogo de la isla, se cierra antes
            const encimaK = { dlg: !!G.dialogo.open(), card: !!G.ui.cardOpen, busy: !!G.ui.busy(), pausa: !!(G.pausa && G.pausa.activa()), portada: !!($("title") && $("title").open) };
            try { if (G.dialogo.open()) G.dialogo.clear(); if (G.ui.cardOpen) G.ui.hideCard(); } catch (e) { /* */ }
            const portadaK = $('title'), libreK = !(portadaK && portadaK.open) && !G.ui.busy() && !(G.pausa && G.pausa.activa());
            let cerrada = true, conT = true;
            if (libreK) {
              // desde el botón con el foco, como una tecla de verdad (en window mismo, input.js la vería antes por ir en el destino)
              (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
              cerrada = !hudEl.classList.contains('cl-pl-abierta') && activo && getComputedStyle(filaZ).display !== 'none';
              (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true, cancelable: true }));
              conT = hudEl.classList.contains('cl-pl-abierta');
            } else { if (!activo) empezar(); verPlantillas(false); verPlantillas(true); }
            S.pos.x = p0.x; S.pos.z = p0.z; S.facing = { x: 1, z: 0 }; actualizar();
            filaP.querySelector('[data-cl-pl="nidogrande"]').click();
            const toque = lista.length > 0 && lista.some(p => p.t === 'nido') && !hudEl.classList.contains('cl-pl-abierta');
            check('C10 · el botón «Plantillas» cambia la fila de piezas por la de plantillas (T la abre, Esc la cierra sin salir) y un toque coloca y vuelve a las piezas', abierta && cerrada && conT && toque, JSON.stringify({ abierta, cerrada, conT, toque, teclas: libreK ? 'probadas' : 'pantalla encima: no se prueban', encimaK }));
            // Revisión F3 · Esc sale de Construir y se queda la tecla (preventDefault): ui.js ya no abre además la Pausa
            let escSale = 'no se prueba';
            if (libreK && activo && !G.ui.busy()) { const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); (document.activeElement || document.body).dispatchEvent(ev); escSale = !activo && ev.defaultPrevented; }
            check('Esc sale de Construir sin abrir la Pausa (la tecla queda tomada)', escSale !== false, String(escSale));
            aplicar(null);
          }
          salir(); S.pos.x = pIni.x; S.pos.z = pIni.z; S.facing = f0; aplicar(null);
        }
        // 5. Presupuesto
        const muchas = { v: 1, piezas: Array.from({ length: CAPACIDAD + 12 }, (_, i) => ({ t: ORDEN[i % 7], x: S.pos.x + 200 + i, z: S.pos.z + 200, r: i % 8 })) };
        check(`Nunca más de ${CAPACIDAD} piezas (capacidad de las mallas)`, aplicar(muchas) === CAPACIDAD && ORDEN.reduce((s, t) => s + mallas[t].count, 0) === CAPACIDAD);
        empezar(); elegir('flores'); actualizar();
        check('Con el presupuesto lleno no se coloca y lo dice', !colocar() && lista.length === CAPACIDAD && /todas tus piezas/.test(est.motivo), est.motivo);
        G.renderer.calidad.nivel = 'bajo';
        check(`Calidad «bajo» / Modo Escuela: presupuesto de ${PRESUPUESTO_BAJO} y sin sombras de las piezas`, presupuesto() === PRESUPUESTO_BAJO && (pintar(), ORDEN.every(t => !mallas[t].castShadow)));
        G.renderer.calidad.nivel = antes.nivel;
        // CG-115: dentro de un cuarto, la zona, lo protegido, el piso, rehacer y una habitación
        const ox = Math.round(S.pos.x), oz = Math.round(S.pos.z), piso = H(ox, oz) + 3;
        contexto({ id: 'prueba', zona: { x: ox, z: oz, r: 4 }, piso, protegidos: [{ x: ox + 1, z: oz, r: 0.6 }], ox, oz });
        S.facing = { x: 0, z: 1 }; elegir('piedra'); actualizar();
        const fuera = { x: ox + 6, z: oz };
        check('CG-115 · fuera de la zona no se construye', validar('piedra', fuera.x, fuera.z) === 'Aquí no');
        check('CG-115 · lo protegido se queda libre', validar('piedra', ox + 1, oz) === 'Esto se queda libre');
        S.pos.x = ox; S.pos.z = oz - 3; S.facing = { x: 0, z: 1 }; actualizar();
        const ySuelo = H(est.x, est.z);
        check('CG-115 · la pieza queda a la altura del piso del cuarto', colocar() && lista.length === 1 && Math.abs(new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(mallas.piedra.instanceMatrix.array, 0)).y - piso) < 1e-3 && Math.abs(piso - ySuelo) > 0.2, est.motivo);
        check('CG-115 · deshacer y rehacer', deshacer() && lista.length === 0 && rehacer() && lista.length === 1 && lista[0].t === 'piedra');
        deshacer();
        const nHab = lista.length;
        check('CG-115 · la habitación entra de un golpe', habitacion('descanso') && lista.length > nHab);
        const tras = lista.length;
        check('CG-115 · deshacer la habitación la quita entera', deshacer() && lista.length === nHab && rehacer() && lista.length === tras);
        const cal = G.renderer.calidad, esc0 = cal && cal.escuela;
        if (cal) { cal.escuela = false; cal.nivel = 'medio'; }
        check('CG-115 · dentro, el tope es 12 (8 en bajo)', presupuesto() === 12);
        if (cal) cal.nivel = 'bajo';
        check('CG-115 · en bajo el tope del cuarto es 8', presupuesto() === 8);
        if (cal) { cal.nivel = antes.nivel; cal.escuela = esc0; }
        const guardado = S.interiores && S.interiores.edificios && S.interiores.edificios.prueba;
        contexto(null);
        check('CG-115 · al salir del cuarto el rincón de fuera vuelve y el interior queda guardado', lista.length === CAPACIDAD && guardado && guardado.piezas.length === tras, (guardado && guardado.piezas.length) + ' piezas');
        salir();
        check('Listo/Esc devuelve la acción a quien la tenía', !activo && G.interaccion.modo === antes.modo && hudEl.hidden);
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
      } finally {
        // 6. Limpieza: la partida y el mundo como estaban
        if (G.renderer.calidad) G.renderer.calidad.nivel = antes.nivel;
        ctx = null; salir();
        S.construir = antes.construir; S.interiores = antes.interiores; S.tienda = antes.tienda; refrescar(); Object.assign(S.pos, antes.pos); S.facing = antes.facing;
        forzar(antes.forzado); aplicar(S.construir); G.interaccion.modo = antes.modo;
        G.quiet = antes.quiet;
      }
      if (sinApagar) check('Limpieza: la tarjeta y el botón siguen ahí (encendido para todos)', !!$('b-construir') && !!$('b-construir-menu') && !activo);
      check('Limpieza: la partida queda como estaba', JSON.stringify(S.construir) === JSON.stringify(antes.construir) && JSON.stringify(S.interiores) === JSON.stringify(antes.interiores));
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = { empezar, salir, activo: () => activo, elegir, girar, colocar, deshacer, rehacer, quitar, cuadrícula, foto, casita, plantilla, verPlantillas, PLANTILLAS: Object.keys(PLANTILLAS), rejilla: () => rejilla, piezas: () => lista.map(p => Object.assign({}, p)), aplicar, presupuesto, contexto, habitacion,
      forzar, test, TIPOS: ORDEN.slice(), BASE: BASE.slice(), EXTRA: EXTRA.slice(), KIT: KIT.slice(), NUEVAS: NUEVAS.slice(), nuevas, PLANTILLAS_F3: Object.keys(PLANTILLAS_F3), NOMBRE_PL, SVG, NOMBRE, tiene, disponibles, refrescar, CAPACIDAD, _escena: () => ({ grupo, fantasma, est: Object.assign({}, est) }) };
    G.construir = api;
    return api;
  };
})();
