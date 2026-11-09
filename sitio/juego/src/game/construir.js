/* Juego · Construir libre (expansión tras la temporada 1; ROADMAP «Después de la temporada 1», Kelvin 9-nov)
   Amplía el modo construir del cap. 1 (hoy solo el refugio: content/cap1/historia.js «Modo construir» y el fantasma de
   content/cap1/mundo.js) a un rincón propio: nido, techo de hojas y decoración. Mismo gesto que el refugio: un fantasma delante de
   Vittata (verde si cabe, rojo si no), Acción coloca y suena el martillo (G.audio.martillar).
   ENCENDIDO PARA TODOS (Kelvin 9-nov: «Piezas aprobadas»): ya no depende de ?expansion=1 (G.EXPANSION sigue solo para la pesca).
   Bandera propia G.CONSTRUIR (boot.js): encendida por defecto, ?construir=0 la apaga; boot.js carga este archivo al arrancar.
   Piezas: 7 tipos procedurales y estilizados (sin modelos nuevos). Cada tipo es UNA geometría fundida con colores de vértice y un
   InstancedMesh: 7 llamadas de dibujo como mucho, con 40 piezas o con 1. Presupuesto: 40 piezas (24 en calidad «bajo» y Modo Escuela);
   sin compras, sin cajas sorpresa: todas las piezas desde el principio.
   Controles: teclado 1–7 pieza · R / Q girar · Z deshacer · Supr o Retroceso quitar la pieza bajo el fantasma · E/Enter colocar ·
   Esc o B salir (B también entra). Táctil: la barra de piezas y herramientas de arriba y el botón Acción («Colocar»).
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
    const presupuesto = () => (bajo() ? PRESUPUESTO_BAJO : CAPACIDAD);
    let forzado = false;
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
      const k = 0.9 + azar() * 0.2, c = lin(color).multiplyScalar(k), ct = o.tapa ? lin(o.tapa) : c;
      for (let i = 0; i < n; i++) { const cc = o.tapa && Math.abs(nor.getY(i)) > 0.9 ? ct : c; col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
      const p = o.p || [0, 0, 0], s = o.s || [1, 1, 1];
      g.applyMatrix4(_m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2])));
      const r = { pos: g.attributes.position.array, nor: g.attributes.normal.array, col };
      g.dispose();
      return r;
    }
    function fundir(partes) {
      let n = 0; for (const p of partes) n += p.pos.length;
      const pos = new Float32Array(n), nor = new Float32Array(n), col = new Float32Array(n);
      let o = 0; for (const p of partes) { pos.set(p.pos, o); nor.set(p.nor, o); col.set(p.col, o); o += p.pos.length; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeBoundingSphere();
      return g;
    }
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
    };
    const ORDEN = ['nido', 'techo', 'bromelia', 'flores', 'piedra', 'tronco', 'banderines'];
    const NOMBRE = { nido: 'Nido de ramitas', techo: 'Techo de hojas', bromelia: 'Bromelia', flores: 'Flores', piedra: 'Piedras', tronco: 'Tronco', banderines: 'Banderines' };

    // ---------- Datos: leer (tolerante) y guardar ----------
    function leer(d) {
      if (!esObj(d) || d.v !== 1 || !Array.isArray(d.piezas)) return [];
      const out = [];
      for (const p of d.piezas) {
        if (out.length >= CAPACIDAD) break;
        if (!esObj(p) || !TIPOS[p.t] || typeof p.x !== 'number' || typeof p.z !== 'number' || !isFinite(p.x) || !isFinite(p.z) || Math.abs(p.x) > 5000 || Math.abs(p.z) > 5000) continue;
        const r = Number.isInteger(p.r) && p.r >= 0 && p.r < 8 ? p.r : 0;
        out.push({ t: p.t, x: p.x, z: p.z, r });
      }
      return out;
    }
    let lista = [];
    const r2 = v => Math.round(v * 100) / 100;
    function guardar() {
      S.construir = lista.length ? { v: 1, piezas: lista.map(p => ({ t: p.t, x: r2(p.x), z: r2(p.z), r: p.r })) } : null;
      if (G.guardado && G.guardado.autosave) G.guardado.autosave();
    }

    // ---------- Escena: un InstancedMesh por tipo (se crea solo si la bandera está encendida) ----------
    let grupo = null, mat = null, fantasma = null, matF = null, anillo = null;
    const mallas = {}, geos = {};
    function asegurarEscena() {
      if (grupo) return;
      grupo = new THREE.Group(); grupo.name = 'construir';
      // renderer.js cullPequenos mide la caja de cada hijo de la escena: la de un InstancedMesh es la de su geometría en el origen, no la de
      // sus instancias, y el grupo se daba por «pequeño y lejos» (capa 31: invisible). Las piezas ya se limitan a 40 y van sin recorte.
      grupo.userData.sinCulling = true; grupo.frustumCulled = false;
      mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      for (const t of ORDEN) {
        semilla = 7 + ORDEN.indexOf(t) * 13;
        geos[t] = fundir(TIPOS[t].hacer());
        const m = new THREE.InstancedMesh(geos[t], mat, CAPACIDAD);
        m.name = 'construir_' + t; m.count = 0; m.visible = false; m.frustumCulled = false; m.receiveShadow = true;
        mallas[t] = m; grupo.add(m);
      }
      matF = new THREE.MeshBasicMaterial({ color: lin('#7fd38f'), transparent: true, opacity: 0.5, depthWrite: false });
      fantasma = new THREE.Mesh(geos.nido, matF); fantasma.name = 'construir_fantasma'; fantasma.visible = false; fantasma.renderOrder = 2;
      anillo = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 24), matF); anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.04; fantasma.add(anillo);
      grupo.add(fantasma);
      G.renderer.scene.add(grupo);
    }
    function quitarEscena() {
      if (!grupo) return;
      G.renderer.scene.remove(grupo);
      for (const t of ORDEN) { geos[t].dispose(); delete geos[t]; delete mallas[t]; }
      anillo.geometry.dispose(); mat.dispose(); matF.dispose();
      grupo = mat = matF = fantasma = anillo = null;
    }
    const _o = new THREE.Object3D();
    function pintar() {
      if (!grupo) return;
      for (const t of ORDEN) mallas[t].count = 0;
      for (const p of lista) {
        const m = mallas[p.t]; if (!m || m.count >= CAPACIDAD) continue;
        _o.position.set(p.x, H(p.x, p.z), p.z); _o.rotation.set(0, p.r * PASO, 0); _o.updateMatrix();
        m.setMatrixAt(m.count++, _o.matrix);
      }
      const sombra = !bajo();
      for (const t of ORDEN) { const m = mallas[t]; m.visible = m.count > 0; m.castShadow = sombra; m.instanceMatrix.needsUpdate = true; }
    }
    function aplicar(d) { lista = leer(d); historial.length = 0; if (habilitado()) { asegurarEscena(); pintar(); } return lista.length; }

    // ---------- Modo construir: toma la acción mientras está activo (como el del refugio) ----------
    let activo = false, tipo = 'nido', giro = 0, modo0 = null;
    const historial = [];
    const est = { x: 0, z: 0, valido: false, motivo: '' };
    const modo = { activo: () => activo, accion: () => colocar(), aviso: () => (est.valido ? 'Acción: colocar la pieza' : est.motivo), verbo: 'Colocar' };
    function validar(t, x, z) {
      const T = TIPOS[t];
      if (lista.length >= presupuesto()) return 'Ya usaste todas tus piezas. Quita alguna para seguir.';
      const y = H(x, z);
      if (!isFinite(y) || y < agua(x, z) + 0.05) return 'En el agua no se puede construir';
      const col = (G.fisica && G.fisica.colliders) || [];
      if (col.some(c => c.r > 0 && Math.hypot(x - c.x, z - c.z) < c.r + T.r * 0.5)) return 'Aquí no cabe: choca con algo';
      if (!T.sobre && lista.some(p => !TIPOS[p.t].sobre && Math.hypot(x - p.x, z - p.z) < (T.r + TIPOS[p.t].r) * 0.6)) return 'Muy cerca de otra pieza';
      return '';
    }
    function actualizar() {
      if (!activo || !fantasma) return;
      const f = S.facing || { x: 0, z: 1 }, fl = Math.hypot(f.x, f.z) || 1;
      est.x = S.pos.x + f.x / fl * DIST; est.z = S.pos.z + f.z / fl * DIST;
      est.motivo = validar(tipo, est.x, est.z); est.valido = !est.motivo;
      fantasma.geometry = geos[tipo];
      fantasma.position.set(est.x, H(est.x, est.z), est.z); fantasma.rotation.set(0, giro * PASO, 0);
      anillo.scale.setScalar(TIPOS[tipo].r);
      matF.color.copy(lin(est.valido ? '#7fd38f' : '#d6403a'));
    }
    function colocar() {
      if (!activo) return false;
      actualizar();
      if (!est.valido) { aviso(est.motivo); sonar('wrong'); return false; }
      const p = { t: tipo, x: est.x, z: est.z, r: giro };
      lista.push(p); historial.push({ op: '+', p });
      pintar(); guardar(); pintarHud();
      if (G.audio && G.audio.martillar && !G.quiet) G.audio.martillar(lista.length === 1 ? 3 : 1);
      if (G.fx && G.fx.burst && !G.quiet && !bajo()) try { G.fx.burst(p.x, H(p.x, p.z) + 0.6, p.z, 'feathers', 8); } catch (e) { /* sin fx */ }
      return true;
    }
    function girar(d) { giro = (giro + (d < 0 ? 7 : 1)) % 8; sonar('tick'); actualizar(); pintarHud(); return giro; }
    function elegir(t) { if (!TIPOS[t]) return false; tipo = t; sonar('tick'); actualizar(); pintarHud(); return true; }
    function deshacer() {
      const h = historial.pop();
      if (!h) { aviso('No hay nada que deshacer'); return false; }
      if (h.op === '+') { const i = lista.lastIndexOf(h.p); if (i >= 0) lista.splice(i, 1); } else lista.splice(Math.min(h.i, lista.length), 0, h.p);
      pintar(); guardar(); pintarHud(); sonar('tick'); actualizar();
      return true;
    }
    function quitar() {
      if (activo) actualizar();
      const x = activo ? est.x : S.pos.x, z = activo ? est.z : S.pos.z;
      let mejor = -1, bd = 1.4;
      lista.forEach((p, i) => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; mejor = i; } });
      if (mejor < 0) { aviso('No hay ninguna pieza cerca para quitar'); return false; }
      const p = lista.splice(mejor, 1)[0]; historial.push({ op: '-', p, i: mejor });
      pintar(); guardar(); pintarHud(); sonar('pickup', 1); actualizar();
      return true;
    }
    function empezar() {
      if (!habilitado()) return false;
      if (activo) return true;
      if (G.interaccion.modo && G.interaccion.modo !== modo && G.interaccion.modo.activo && G.interaccion.modo.activo()) { aviso('Termina lo que estás haciendo y vuelve a probar.'); return false; }
      asegurarEscena(); pintar();
      modo0 = G.interaccion.modo; G.interaccion.modo = modo;
      activo = true; fantasma.visible = true;
      hud(true); actualizar(); pintarHud();
      aviso('¡Construye tu rincón! Elige una pieza, gírala y pulsa Acción para colocarla.', 4200);
      return true;
    }
    function salir() {
      if (!activo) return false;
      activo = false;
      if (fantasma) fantasma.visible = false;
      if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
      modo0 = null; hud(false);
      if (lista.length) aviso('Tu rincón quedó guardado.');
      return true;
    }
    G.on('update', (dt, busy) => { if (activo && fantasma) { fantasma.visible = !busy; if (!busy) actualizar(); } }, 89);
    G.on('escape', () => { if (activo) salir(); });
    G.on('apply', () => { if (activo) salir(); aplicar(S.construir); }, 60);

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
      if (k === 'b' && !e.repeat && !bOcupada()) { if (activo) salir(); else empezar(); }
      else if (!activo) hecho = false;
      else if (/^[1-7]$/.test(k)) elegir(ORDEN[+k - 1]);
      else if (k === 'r') girar(1);
      else if (k === 'q') girar(-1);
      else if (k === 'z') deshacer();
      else if (k === 'delete' || k === 'backspace') quitar();
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
      banderines: '<path d="M3 6v22M29 6v22" stroke="#7b5430" stroke-width="2.4"/><path d="M3 8q13 8 26 0" stroke="#f5f0e0" stroke-width="1.4" fill="none"/><path d="M6 10l3 7 3-5z" fill="#f4c430"/><path d="M13 12l3 7 3-6z" fill="#2fb5a8"/><path d="M20 12l3 6 3-7z" fill="#e85d8f"/>',
    };
    const ICONO_HUD = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M3 20.5 13.6 9.9l1.5 1.5L4.5 22zM12.4 4.2l3-1.7 6.1 6.1-1.7 3-2.1-2.1-1.6 1.6-3.8-3.8 1.6-1.6z"/></svg>') + '")';
    let hudEl = null, estilo = null;
    function css() {
      if (estilo) return;
      estilo = document.createElement('style'); estilo.id = 'cl-estilo';
      estilo.textContent = '#cl-hud{left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 142px);display:flex;flex-direction:column;align-items:center;gap:6px;max-width:calc(100vw - 32px)}' +
        '#cl-hud .cl-fila{display:flex;gap:6px;align-items:center;background:rgba(16,36,28,.82);border-radius:16px;padding:6px;box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:100%;overflow-x:auto;scrollbar-width:none}' +
        '#cl-hud button{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:48px;min-height:48px;padding:4px 6px;border-radius:12px;color:#fff8e6;font:600 12px/1.1 system-ui,sans-serif;cursor:pointer;text-align:center;background:rgba(255,255,255,.08);touch-action:manipulation}' +
        '#cl-hud button:hover{background:rgba(255,255,255,.18)}#cl-hud button:focus-visible{outline:3px solid #ffd27a;outline-offset:1px}' +
        '#cl-hud button[aria-pressed="true"]{background:#ffd27a;color:#10241c;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}' +
        '#cl-hud svg{width:30px;height:30px}#cl-hud .cl-cuenta{color:#fff8e6;font:700 13px system-ui,sans-serif;padding:0 8px;white-space:nowrap}' +
        '#cl-hud kbd{font:600 10px system-ui,sans-serif;opacity:.7}' +
        '#cl-hud .cl-herr button{flex-direction:row;font-size:13px;padding:4px 10px}' +
        'body:has(#title[open]) #cl-hud,body:has(#creator:not([hidden])) #cl-hud{visibility:hidden}' +
        '@media (max-width:700px),(pointer:coarse){#cl-hud{left:12px;transform:none;align-items:flex-start;top:calc(env(safe-area-inset-top,0px) + 226px);max-width:calc(100vw - 84px)}' +
        '#cl-hud .cl-fila{gap:4px;padding:4px}#cl-hud .cl-piezas small,#cl-hud kbd{display:none}#cl-hud button{min-width:40px;min-height:44px;padding:2px}#cl-hud svg{width:26px;height:26px}' +
        '#cl-hud .cl-herr button{padding:2px 7px;font-size:12px}#cl-hud .cl-cuenta{font-size:12px;padding:0 4px}}';
      document.head.appendChild(estilo);
    }
    function hud(ver) {
      if (!ver) { if (hudEl) hudEl.hidden = true; return; }
      css();
      if (!hudEl) {
        hudEl = document.createElement('div'); hudEl.id = 'cl-hud'; hudEl.className = 'hud'; hudEl.setAttribute('role', 'toolbar'); hudEl.setAttribute('aria-label', 'Modo construir');
        const tecla = window.matchMedia && matchMedia('(pointer: coarse)').matches ? () => '' : k => `<kbd>${k}</kbd>`;
        hudEl.innerHTML = '<div class="cl-fila cl-piezas">' + ORDEN.map((t, i) => `<button type="button" data-cl-tipo="${t}" aria-pressed="false" title="${NOMBRE[t]} (${i + 1})"><svg viewBox="0 0 32 32" aria-hidden="true">${SVG[t]}</svg><small>${NOMBRE[t]}</small></button>`).join('') + '</div>' +
          `<div class="cl-fila cl-herr"><span class="cl-cuenta" aria-live="polite"></span><button type="button" data-cl="girar">Girar ${tecla('R')}</button><button type="button" data-cl="deshacer">Deshacer ${tecla('Z')}</button>` +
          `<button type="button" data-cl="quitar">Quitar ${tecla('Supr')}</button><button type="button" data-cl="listo">Listo ${tecla('Esc')}</button></div>`;
        hudEl.addEventListener('click', e => {
          const b = e.target.closest && e.target.closest('button'); if (!b) return;
          if (b.dataset.clTipo) elegir(b.dataset.clTipo);
          else if (b.dataset.cl === 'girar') girar(1);
          else if (b.dataset.cl === 'deshacer') deshacer();
          else if (b.dataset.cl === 'quitar') quitar();
          else if (b.dataset.cl === 'listo') salir();
          if (b.blur) b.blur(); // que Espacio y Enter vuelvan al juego
        });
        document.body.appendChild(hudEl);
      }
      hudEl.hidden = false;
    }
    let cuentaTxt = '';
    function pintarHud() {
      if (!hudEl || hudEl.hidden) return;
      hudEl.querySelectorAll('[data-cl-tipo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clTipo === tipo)));
      const c = hudEl.querySelector('.cl-cuenta'), t = `Piezas: ${lista.length}/${presupuesto()}`;
      if (c && t !== cuentaTxt) { cuentaTxt = t; c.textContent = t; }
    }
    // Botón del HUD (junto a Pausa) y tarjeta «Construir» en «¿Cómo quieres jugar?» (no lleva data-modo: menu_modos.js no la cuenta)
    let botonHud = null, tarjeta = null;
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
      const antes = { construir: S.construir ? JSON.parse(JSON.stringify(S.construir)) : S.construir, pos: Object.assign({}, S.pos), facing: Object.assign({}, S.facing),
        modo: G.interaccion.modo, quiet: G.quiet, forzado, nivel: G.renderer.calidad && G.renderer.calidad.nivel };
      const conBandera = !!G.EXPANSION, sinApagar = G.CONSTRUIR !== false;
      const enEscena = () => { let n = 0; G.renderer.scene.traverse(o => { if (o.name && o.name.indexOf('construir') === 0) n++; }); return n; };
      try {
        G.quiet = true;
        // 1. Encendido para todos (Kelvin 9-nov): sin ?expansion=1 ya están la tarjeta del menú, el botón junto a Pausa y la tecla B
        if (!conBandera) check('Sin ?expansion=1 (G.EXPANSION apagada) Construir está encendido', !G.EXPANSION && sinApagar && habilitado(), 'EXPANSION ' + G.EXPANSION + ' · CONSTRUIR ' + G.CONSTRUIR);
        else check('Con ?expansion=1 Construir también está encendido', sinApagar && habilitado(), 'CONSTRUIR ' + G.CONSTRUIR);
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
        check('Encendida: 7 tipos, un InstancedMesh por tipo (7 llamadas de dibujo como mucho)', ORDEN.every(t => mallas[t] && mallas[t].isInstancedMesh) && grupo.children.filter(o => o.isInstancedMesh).length === 7);
        check('Encendida: botón del HUD y tarjeta del menú', !!$('b-construir') && !!$('b-construir-menu'));
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
        await espera(60);
        check('La barra de piezas se ve con 7 piezas y la cuenta', !!hudEl && !hudEl.hidden && hudEl.querySelectorAll('[data-cl-tipo]').length === 7 && /Piezas: 0\/\d+/.test(hudEl.querySelector('.cl-cuenta').textContent), hudEl && hudEl.querySelector('.cl-cuenta').textContent);
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
        check('El tronco queda al ras del suelo', Math.abs(new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(mallas.tronco.instanceMatrix.array, 0)).y - H(lista[1].x, lista[1].z)) < 1e-3);
        check('Deshacer quita el último (Z)', (dispatchEvent(new KeyboardEvent('keydown', { key: 'z', bubbles: true })), lista.length === 1 && mallas.tronco.count === 0 && !mallas.tronco.visible));
        S.facing = { x: -S.facing.x, z: -S.facing.z }; actualizar();
        check('Quitar borra la pieza bajo el fantasma', quitar() && lista.length === 0 && !mallas.nido.visible);
        check('Deshacer devuelve la pieza quitada', deshacer() && lista.length === 1 && lista[0].t === 'nido');
        check('No se puede poner otra pieza encima del nido', (actualizar(), !est.valido && /cerca/.test(est.motivo)), est.motivo);
        elegir('techo'); actualizar();
        check('El techo de hojas sí va sobre el nido', est.valido && colocar() && lista.length === 2, est.motivo);
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
        // 5. Presupuesto
        const muchas = { v: 1, piezas: Array.from({ length: CAPACIDAD + 12 }, (_, i) => ({ t: ORDEN[i % 7], x: S.pos.x + 200 + i, z: S.pos.z + 200, r: i % 8 })) };
        check(`Nunca más de ${CAPACIDAD} piezas (capacidad de las mallas)`, aplicar(muchas) === CAPACIDAD && ORDEN.reduce((s, t) => s + mallas[t].count, 0) === CAPACIDAD);
        empezar(); elegir('flores'); actualizar();
        check('Con el presupuesto lleno no se coloca y lo dice', !colocar() && lista.length === CAPACIDAD && /todas tus piezas/.test(est.motivo), est.motivo);
        G.renderer.calidad.nivel = 'bajo';
        check(`Calidad «bajo» / Modo Escuela: presupuesto de ${PRESUPUESTO_BAJO} y sin sombras de las piezas`, presupuesto() === PRESUPUESTO_BAJO && (pintar(), ORDEN.every(t => !mallas[t].castShadow)));
        G.renderer.calidad.nivel = antes.nivel;
        salir();
        check('Listo/Esc devuelve la acción a quien la tenía', !activo && G.interaccion.modo === antes.modo && hudEl.hidden);
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
      } finally {
        // 6. Limpieza: la partida y el mundo como estaban
        if (G.renderer.calidad) G.renderer.calidad.nivel = antes.nivel;
        salir();
        S.construir = antes.construir; Object.assign(S.pos, antes.pos); S.facing = antes.facing;
        forzar(antes.forzado); aplicar(S.construir); G.interaccion.modo = antes.modo;
        G.quiet = antes.quiet;
      }
      if (sinApagar) check('Limpieza: la tarjeta y el botón siguen ahí (encendido para todos)', !!$('b-construir') && !!$('b-construir-menu') && !activo);
      check('Limpieza: la partida queda como estaba', JSON.stringify(S.construir) === JSON.stringify(antes.construir));
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = { empezar, salir, activo: () => activo, elegir, girar, colocar, deshacer, quitar, piezas: () => lista.map(p => Object.assign({}, p)), aplicar, presupuesto,
      forzar, test, TIPOS: ORDEN.slice(), CAPACIDAD, _escena: () => ({ grupo, fantasma, est: Object.assign({}, est) }) };
    G.construir = api;
    return api;
  };
})();
