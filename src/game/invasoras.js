/* Juego · Patrulla invasora (EXPANSIÓN, detrás de la bandera: solo con ?expansion=1 o localStorage amazonaverse.expansion = '1').
   Cuatro especies invasoras reales de Puerto Rico en su hábitat del mapa del cap. 1: la iguana verde tomando el sol en la orilla del
   río junto al puente de Villa Raíz, un grupo de tilapias en el río junto a la villa, dos plecos pegados al fondo río arriba y dos peces
   león en el arrecife de la playa. NUNCA son enemigos: no se atacan, no se cazan, no se tocan. Se observan y se reportan a la Estación
   de Conservación de Villa Raíz.
   - Avistar = a menos del radio de la especie (7–10 m), despacio (menos de 4 m/s), 1,5 s; o «Foto» (G.emit('foto')) a 1,5 radios o menos.
     La primera vez: flash de cámara, aviso «reporte enviado a la Estación (n/4)», su ficha en la sección «Patrulla invasora» del Diario
     (con fuente y enlace) y G.emit('aprendizaje', { tipo: 'invasora', id }). Con las 4: «¡Patrulla completa!».
     La primera vez a menos de 22 m de una sin avistar sale una pista corta («acércate despacio…»).
   - Guardado en el dispositivo, aparte de la partida: <almacen>.invasoras = { v: 1, vistos: [ids], completa }.
   - Datos y fuentes: content/cap1/invasoras.js (USGS NAS y DRNA; literales anotados allí). Nada inventado.
   - Bajo el agua: de lejos el agua los tapa; a menos de 1,6 radios se ven claros a través de ella («visor», como rio_vivo.js).
   - Arte: mallas estilizadas hechas aquí con primitivas (sin modelos 3D nuevos); 4 InstancedMesh, 4 draw calls como mucho, sin sombras,
     apagadas a más de 70 m. Con la bandera apagada boot.js NO carga este archivo; si se carga para la prueba, nada se ve y la sección
     del Diario queda vacía mientras G.expansion no sea true. Nada se ve en las baterías (G.quiet) salvo dentro de su propia prueba.
   [KELVIN] Todo esto necesita su visto bueno con capturas antes de salir sin bandera (regla: nada 3D nuevo sin su OK).
   window.AVInvasoras(G) → Promise de G.invasoras = { estado, activo, avistar, paso, test, … }. Prueba: AV.invasorasTest(). */
(function () {
  'use strict';
  window.AVInvasoras = function (G) {
    if (G.invasoras) return Promise.resolve(G.invasoras);
    const datos = window.AV_INVASORAS ? Promise.resolve() : window.AVE.assets.script('content/cap1/invasoras.js');
    return datos.then(() => (G.invasoras = G.invasoras || crear(G)));
  };

  function crear(G) {
    const S = G.S, scene = G.renderer.scene, M = G.fisica.MOVE, D = window.AV_INVASORAS || { especies: [], album: {} };
    const H = (x, z) => G.terreno.height(x, z);
    const nivelAgua = (x, z) => (G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity);
    const MAPA = G.terreno.mapa || window.AV_MAPA_CAP1 || null, RIO = MAPA && MAPA.agua && MAPA.agua.rio && MAPA.agua.rio.puntos;
    const APAGA = 70, LENTO = 4, OBS_T = 1.5, PISTA_R = 22, VISOR = 1.6;
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' && en ? en : es);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.invasoras';
    const F = { prueba: false, t: 0, pistas: {}, cerca: {}, flash: null };
    const uT = { value: 0 };
    let oyenteTest = null;
    G.on('aprendizaje', d => { if (oyenteTest) oyenteTest(d); });

    // ---------- Bandera y guardado ----------
    const activo = () => G.expansion === true || F.prueba;
    let mem = { v: 1, vistos: [], completa: false };
    function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && Array.isArray(d.vistos)) mem = { v: 1, vistos: d.vistos.filter(x => typeof x === 'string'), completa: !!d.completa }; } catch (e) { /* sin almacén */ } }
    function guardar() { if (F.prueba) return; try { localStorage.setItem(CLAVE, JSON.stringify(mem)); } catch (e) { /* sin almacén */ } }
    leer();
    const especies = () => (D.especies || []).filter(e => e.estado === 'verificado');
    const espDe = id => especies().find(e => e.id === id);

    // ---------- Geometría (no indexada, color por vértice, una marca por vértice: 1 = cabeza que cabecea, 2 = cola que ondula) ----------
    function Constructor() {
      const pos = [], col = [], mk = [];
      const c3 = h => { const c = new THREE.Color(h).convertSRGBToLinear(); return [c.r, c.g, c.b]; }; // colores de vértice en lineal: si no, salen lavados
      const api = {
        geo(g, color, marca, fn) {
          g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const v = fn ? fn(p.getX(i), p.getY(i), p.getZ(i)) : [p.getX(i), p.getY(i), p.getZ(i)];
            pos.push(v[0], v[1], v[2]); const k = c3(typeof color === 'function' ? color(v) : color); col.push(k[0], k[1], k[2]);
            mk.push(typeof marca === 'function' ? marca(v) : marca || 0);
          }
          return api;
        },
        tri(a, b, c, color, marca) { const k = c3(color); for (const v of [a, b, c]) { pos.push(...v); col.push(...k); mk.push(marca || 0); } return api; },
        fin() {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
          g.setAttribute('aMarca', new THREE.Float32BufferAttribute(mk, 1));
          g.computeVertexNormals(); return g;
        },
      };
      return api;
    }
    const elip = (sx, sy, sz, x, y, z) => (px, py, pz) => [px * sx + x, py * sy + y, pz * sz + z];
    const esfera = (w, h) => new THREE.SphereGeometry(1, w || 10, h || 8);
    const cola = z => (z < 0 ? 2 : 0);

    // Iguana (≈ 1,3 m con la cola). +Z hacia delante, +Y arriba. Verde con bandas oscuras en la cola, cresta de espinas y papada.
    const geoIguana = (() => {
      const b = Constructor(), verde = '#5f9a3a', claro = '#8cc152', oscuro = '#33562a';
      b.geo(esfera(), verde, 0, elip(0.11, 0.08, 0.26, 0, 0.11, 0.02));                      // cuerpo
      b.geo(esfera(), claro, 0, elip(0.085, 0.05, 0.2, 0, 0.075, 0.02));                     // vientre
      b.geo(esfera(), verde, 1, elip(0.065, 0.06, 0.1, 0, 0.17, 0.3));                       // cabeza
      b.geo(esfera(6, 4), '#e7d45a', 1, elip(0.03, 0.03, 0.03, 0, 0.13, 0.27));              // escama redonda bajo la oreja (subtimpánica)
      b.geo(esfera(6, 4), '#141414', 1, elip(0.012, 0.012, 0.012, 0.05, 0.19, 0.33)).geo(esfera(6, 4), '#141414', 1, elip(0.012, 0.012, 0.012, -0.05, 0.19, 0.33));
      // papada: un triángulo bajo la barbilla
      b.tri([0, 0.12, 0.36], [0, 0.04, 0.3], [0, 0.11, 0.22], claro, 1).tri([0, 0.11, 0.22], [0, 0.04, 0.3], [0, 0.12, 0.36], claro, 1);
      // cresta: espinas del cuello a la cola
      for (let i = 0; i < 11; i++) { const z = 0.3 - i * 0.065, h = 0.05 - i * 0.003, y = (z > 0.2 ? 0.22 : 0.18) - Math.max(0, -z) * 0.15;
        b.geo(new THREE.ConeGeometry(0.012, h, 4), oscuro, z > 0.2 ? 1 : cola(z), (x, yy, zz) => [x, yy + y + h / 2, zz + z]); }
      // cola larga con bandas
      const nB = 8;
      for (let i = 0; i < nB; i++) {
        const z0 = -0.2 - i * 0.09, r = 0.055 * (1 - i / nB) + 0.01;
        b.geo(new THREE.CylinderGeometry(r * 0.85, r, 0.095, 7, 1, true), i % 2 ? oscuro : verde, 2, (x, y, z) => [x, z + 0.1 - (z0 + 0.2) * 0.25, -y + z0]);
      }
      // patas
      for (const [sx, sz] of [[1, 0.17], [-1, 0.17], [1, -0.14], [-1, -0.14]]) b.geo(new THREE.BoxGeometry(0.14, 0.035, 0.04), verde, 0, (x, y, z) => [x + sx * 0.12, y + 0.04, z + sz]);
      return b.fin();
    })();

    // Pez genérico: cuerpo fusiforme a partir de una esfera (+Z hacia delante); bandas(z) da el color.
    function cuerpoPez(b, largo, ancho, alto, color, aplana) {
      b.geo(esfera(12, 8), color, cola, (x, y, z) => {
        const afina = z < 0 ? 1 + z * 0.75 : 1 - Math.max(0, z - 0.4) * 0.9;
        return [x * ancho * afina, y * alto * afina * (aplana && y < 0 ? 0.35 : 1), z * largo * 0.5];
      });
    }
    // Tilapia (≈ 0,3 m): cuerpo alto, gris oliva con barras verticales tenues
    const geoTilapia = (() => {
      const b = Constructor(), lomo = '#67745e', barra = '#4e5a48', aleta = '#5b5a48';
      cuerpoPez(b, 0.3, 0.045, 0.085, v => (Math.floor((v[2] + 0.2) / 0.04) % 2 ? barra : lomo));
      b.geo(esfera(6, 4), '#111', 0, elip(0.009, 0.009, 0.009, 0.03, 0.02, 0.1)).geo(esfera(6, 4), '#111', 0, elip(0.009, 0.009, 0.009, -0.03, 0.02, 0.1));
      b.tri([0, 0, -0.13], [0, 0.07, -0.21], [0, -0.07, -0.21], aleta, 2).tri([0, 0, -0.13], [0, -0.07, -0.21], [0, 0.07, -0.21], aleta, 2);
      b.tri([0, 0.07, 0.07], [0, 0.11, -0.04], [0, 0.06, -0.13], aleta, 2).tri([0, 0.07, 0.07], [0, 0.06, -0.13], [0, 0.11, -0.04], aleta, 2);
      return b.fin();
    })();
    // Pleco (≈ 0,45 m): alargado y chato por debajo, pardo oscuro con manchas, gran aleta de vela
    const geoPleco = (() => {
      const b = Constructor(), pardo = '#5a4630', mancha = '#2e2418', vela = '#4a3a28';
      cuerpoPez(b, 0.45, 0.07, 0.055, v => ((Math.floor(v[0] * 60) + Math.floor(v[2] * 30)) % 3 === 0 ? mancha : pardo), true);
      b.geo(esfera(8, 4), mancha, 0, elip(0.05, 0.012, 0.035, 0, -0.02, 0.19)); // boca de ventosa (disco por debajo)
      for (let i = 0; i < 6; i++) { const z0 = 0.08 - i * 0.035; b.tri([0, 0.04, z0], [0, 0.14 - i * 0.012, z0 - 0.02], [0, 0.04, z0 - 0.035], i % 2 ? mancha : vela); b.tri([0, 0.04, z0], [0, 0.04, z0 - 0.035], [0, 0.14 - i * 0.012, z0 - 0.02], i % 2 ? mancha : vela); }
      b.tri([0, 0, -0.2], [0, 0.07, -0.3], [0, -0.04, -0.3], vela, 2).tri([0, 0, -0.2], [0, -0.04, -0.3], [0, 0.07, -0.3], vela, 2);
      for (const s of [1, -1]) b.tri([s * 0.05, -0.02, 0.1], [s * 0.13, -0.03, 0.03], [s * 0.05, -0.02, -0.02], vela).tri([s * 0.05, -0.02, 0.1], [s * 0.05, -0.02, -0.02], [s * 0.13, -0.03, 0.03], vela);
      return b.fin();
    })();
    // Pez león (≈ 0,3 m): rayas rojizas y blancas, aletas pectorales en abanico y espinas largas en el lomo
    const geoLeon = (() => {
      const b = Constructor(), rojo = '#b8442e', blanco = '#f3e6d6';
      cuerpoPez(b, 0.28, 0.045, 0.07, v => (Math.floor((v[2] + 0.2) / 0.025) % 2 ? rojo : blanco));
      b.geo(esfera(6, 4), '#111', 0, elip(0.008, 0.008, 0.008, 0.03, 0.025, 0.1)).geo(esfera(6, 4), '#111', 0, elip(0.008, 0.008, 0.008, -0.03, 0.025, 0.1));
      for (let i = 0; i < 9; i++) { const z = 0.08 - i * 0.025, h = 0.16 - Math.abs(i - 3) * 0.012; // espinas del lomo
        b.geo(new THREE.ConeGeometry(0.004, h, 3), i % 2 ? rojo : blanco, cola(z), (x, y, zz) => [x, y + 0.05 + h / 2, zz + z]); }
      for (const s of [1, -1]) for (let i = 0; i < 7; i++) { // abanicos pectorales: radios rayados
        const a0 = -0.9 + i * 0.28, a1 = a0 + 0.28, r = 0.17, c = [s * 0.04, -0.01, 0.05];
        const p = (a, rr) => [c[0] + s * Math.cos(a) * rr * 0.7, c[1] + Math.sin(a) * rr * 0.5, c[2] - Math.cos(a) * rr * 0.6 - rr * 0.25];
        const col = i % 2 ? rojo : blanco;
        b.tri(c, p(a0, r), p(a1, r), col).tri(c, p(a1, r), p(a0, r), col);
      }
      b.tri([0, 0, -0.12], [0, 0.06, -0.2], [0, -0.06, -0.2], rojo, 2).tri([0, 0, -0.12], [0, -0.06, -0.2], [0, 0.06, -0.2], rojo, 2);
      return b.fin();
    })();

    // Material: Lambert con colores por vértice; la cola ondula (marca 2) y la cabeza cabecea (marca 1); iFase por instancia
    function material(nombre, amp, frec, bob) {
      const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 1 }); // opaca en la pasada transparente (la opaca no la dibujaba en las capturas)
      m.onBeforeCompile = sh => {
        sh.uniforms.uT = uT;
        sh.vertexShader = 'uniform float uT;\nattribute float aMarca;\nattribute float iFase;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          'vec3 transformed = vec3(position);\n' +
          `if (aMarca > 1.5) transformed.x += sin(uT * ${frec.toFixed(2)} + iFase + position.z * 6.0) * ${amp.toFixed(3)} * clamp(-position.z * 4.0, 0.0, 1.0);\n` +
          `if (aMarca > 0.5 && aMarca < 1.5) transformed.y += max(0.0, sin(uT * 1.7 + iFase)) * ${bob.toFixed(3)};`);
      };
      m.customProgramCacheKey = () => 'invasoras:' + nombre;
      return m;
    }
    const MAXI = 4, mallas = {};
    function instanciada(id, geo, mat) {
      geo.setAttribute('iFase', new THREE.InstancedBufferAttribute(new Float32Array(MAXI), 1));
      const im = new THREE.InstancedMesh(geo, mat, MAXI);
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; im.visible = false; im.name = 'invasoras:' + id;
      im.userData.sinCulling = true; im.userData.sinSolido = true;
      scene.add(im); mallas[id] = im; return im;
    }
    instanciada('iguana', geoIguana, material('iguana', 0.04, 1.3, 0.03));
    instanciada('tilapia', geoTilapia, material('tilapia', 0.03, 8.0, 0));
    instanciada('pleco', geoPleco, material('pleco', 0.015, 3.0, 0));
    instanciada('pezleon', geoLeon, material('pezleon', 0.012, 2.0, 0));

    // ---------- Dónde viven (sacado del mapa al cargar) ----------
    const hogar = {}; // id → { x, z, y, yaw, n, individuos: [] }
    function puntoRio(cerca, minProf) { // el punto del río más cercano a «cerca» con agua de minProf m o más
      let mejor = null, md = Infinity;
      for (const p of RIO || []) {
        const d = Math.hypot(p[0] - cerca.x, p[1] - cerca.z); if (d >= md) continue;
        const l = nivelAgua(p[0], p[1]); if (!(l > -Infinity) || l - H(p[0], p[1]) < minProf) continue;
        mejor = p; md = d;
      }
      return mejor;
    }
    function direccionRio(p) { const i = RIO.indexOf(p), a = RIO[Math.max(0, i - 1)], b = RIO[Math.min(RIO.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1], h = Math.hypot(dx, dz) || 1; return { dx: dx / h, dz: dz / h }; }
    function ubicar() {
      for (const e of especies()) {
        const c = e.cerca || { x: 0, z: 0 }; let h = null;
        if (e.donde === 'orilla' && RIO) {
          const p = puntoRio(c, 0.2);
          if (p) {
            const d = direccionRio(p), nx = -d.dz, nz = d.dx; let best = null;
            for (let r = 2; r < 18 && !best; r += 0.5) for (const s of [1, -1]) { // la orilla seca más cercana, del lado de Villa Raíz primero
              const x = p[0] + nx * s * r, z = p[1] + nz * s * r, l = nivelAgua(x, z), g = H(x, z);
              const llano = [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]].every(([u, w]) => Math.abs(H(x + u, z + w) - g) < 0.3); // suelo llano: la malla del terreno no la tapa
              if ((!(l > -Infinity) || g > l + 0.3) && llano) { best = { x, z, y: g + 0.04, yaw: Math.atan2(-nx * s, -nz * s) }; break; }
            }
            if (best) h = Object.assign(best, { n: 1 });
          }
        } else if ((e.donde === 'rio' || e.donde === 'fondo') && RIO) {
          const p = puntoRio(c, e.donde === 'fondo' ? 0.45 : 0.55);
          if (p) { const d = direccionRio(p), l = nivelAgua(p[0], p[1]); h = { x: p[0], z: p[1], y: l, yaw: Math.atan2(d.dx, d.dz), n: e.donde === 'rio' ? 4 : 2, agua: l }; }
        } else if (e.donde === 'arrecife') {
          let best = null, md = Infinity; // el fondo de arrecife (1,2 a 3,5 m bajo el mar) más cercano al punto pedido
          for (let r = 0; r <= 60; r += 2) for (let k = 0; k < Math.max(1, Math.round(r * 0.8)); k++) {
            const a = (k / Math.max(1, Math.round(r * 0.8))) * Math.PI * 2, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
            const l = nivelAgua(x, z), g = H(x, z), prof = l - g;
            if (l > -Infinity && prof >= 1.2 && prof <= 3.5 && r < md) { md = r; best = { x, z, y: l, yaw: a, n: 2, agua: l }; }
            if (best) break;
          }
          h = best;
        }
        if (!h) continue;
        h.individuos = [];
        for (let i = 0; i < h.n; i++) h.individuos.push({ fase: i * 2.1 + 0.4, a: i * (6.283 / h.n), x: h.x, y: h.y, z: h.z, yaw: h.yaw });
        hogar[e.id] = h;
      }
    }
    ubicar();

    // ---------- Movimiento de cada individuo ----------
    const dummy = new THREE.Object3D();
    function mover(id, h) {
      const t = F.t;
      for (let i = 0; i < h.individuos.length; i++) {
        const v = h.individuos[i];
        if (id === 'iguana') { v.x = h.x; v.z = h.z; v.y = h.y + 0.02; v.yaw = h.yaw + Math.sin(t * 0.2) * 0.15; }
        else if (id === 'tilapia') { // nadan en grupo, en círculo lento
          const a = v.a + t * 0.35, r = 0.9 + 0.25 * Math.sin(t * 0.5 + v.fase);
          v.x = h.x + Math.cos(a) * r; v.z = h.z + Math.sin(a) * r; v.y = Math.max(H(v.x, v.z) + 0.15, h.agua - 0.3 - 0.08 * i);
          v.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
        } else if (id === 'pleco') { // pegados al fondo, casi quietos
          const off = (i - 0.5) * 1.2, x = h.x + Math.cos(h.yaw) * off, z = h.z - Math.sin(h.yaw) * off;
          v.x = x; v.z = z; v.y = H(x, z) + 0.04; v.yaw = h.yaw + 0.5 * i + Math.sin(t * 0.1 + v.fase) * 0.05;
        } else { // pez león: flota sobre el fondo y gira despacio
          const off = (i - 0.5) * 1.6, x = h.x + Math.cos(h.yaw) * off + Math.sin(t * 0.2 + v.fase) * 0.25, z = h.z + Math.sin(h.yaw) * off;
          v.x = x; v.z = z; v.y = Math.min(h.agua - 0.5, H(x, z) + 0.6 + Math.sin(t * 0.7 + v.fase) * 0.06); v.yaw = h.yaw + Math.sin(t * 0.15 + v.fase) * 0.6;
        }
      }
    }
    function dibujar() {
      const cam = G.renderer.camera && G.renderer.camera.position, ver = activo() && (!G.quiet || F.prueba);
      for (const e of especies()) {
        const im = mallas[e.id], h = hogar[e.id]; if (!im) continue;
        if (!h || !ver || (Math.min(cam ? Math.hypot(h.x - cam.x, h.z - cam.z) : Infinity, Math.hypot(h.x - S.pos.x, h.z - S.pos.z)) > APAGA && !F.prueba)) { im.visible = false; continue; }
        mover(e.id, h);
        const fases = im.geometry.attributes.iFase;
        h.individuos.forEach((v, i) => { dummy.position.set(v.x, v.y, v.z); dummy.rotation.set(0, v.yaw, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); fases.setX(i, v.fase); });
        im.count = h.individuos.length; im.instanceMatrix.needsUpdate = true; fases.needsUpdate = true; im.visible = true;
        if (e.donde !== 'orilla') { // «visor»: bajo el agua solo se distinguen de cerca; lejos el agua los tapa (se dibujan antes que ella)
          const mira = Math.hypot(S.pos.x - h.x, S.pos.z - h.z) < (e.radio || 8) * VISOR && S.pos.y - h.y < 14;
          im.material.depthTest = !mira; im.renderOrder = mira ? 10 : -1; h.visor = mira;
        }
      }
    }

    // ---------- Avistar, reportar y la sección del Diario ----------
    function flash() {
      if (G.quiet || F.prueba) return;
      try {
        if (!F.flash) { F.flash = document.createElement('div'); F.flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:60;transition:opacity .45s ease-out'; document.body.appendChild(F.flash); }
        const d = F.flash; d.style.transition = 'none'; d.style.opacity = '0.75'; void d.offsetWidth; d.style.transition = 'opacity .45s ease-out'; d.style.opacity = '0';
      } catch (e) { /* sin DOM */ }
    }
    function avisar(texto, ms) { if (G.quiet && !F.prueba) return; try { G.ui.toast(texto, ms || 3600); } catch (e) { /* sin HUD */ } }
    function avistar(id) {
      if (!activo() || !espDe(id) || mem.vistos.includes(id)) return false;
      mem.vistos.push(id);
      const e = espDe(id), n = mem.vistos.length, total = especies().length;
      G.emit('aprendizaje', { tipo: 'invasora', id });
      flash();
      avisar(L(`¡Avistamiento! ${e.nombre}: reporte enviado a la Estación de Conservación (${n}/${total}). Mira su ficha en el Diario.`,
        `Sighting! ${e.nombreEn}: report sent to the Conservation Station (${n}/${total}). See its card in the Journal.`), 4200);
      if (n >= total && !mem.completa) {
        mem.completa = true;
        const fin = () => avisar(L('¡Patrulla completa! La Estación ya sabe dónde buscar a las 4 especies. ¡Gracias, guardiana!',
          'Patrol complete! The Station now knows where to look for all 4 species. Thank you, guardian!'), 4800);
        if (F.prueba) fin(); else setTimeout(fin, 4300);
      }
      guardar();
      try { if (!G.quiet && !F.prueba && G.guardado) G.guardado.autosave(); } catch (err) { /* sin guardado */ }
      return true;
    }
    const lenta = () => M.posado || ((M.speed || 0) < LENTO);
    function distA(id) { const h = hogar[id]; return h ? Math.hypot(S.pos.x - h.x, S.pos.z - h.z) : Infinity; }
    function revisar(dt, libre) {
      for (const e of especies()) {
        if (mem.vistos.includes(e.id) || !hogar[e.id]) { F.cerca[e.id] = 0; continue; }
        const d = distA(e.id), alto = S.pos.y - hogar[e.id].y;
        if (d < PISTA_R && !F.pistas[e.id] && libre) {
          F.pistas[e.id] = true;
          avisar(L(`Algo se mueve por aquí… ${e.pista} Acércate despacio para avistarla.`, `Something is moving around here… ${e.pistaEn} Get closer slowly to spot it.`), 3800);
        }
        F.cerca[e.id] = d < (e.radio || 8) && alto < 12 && lenta() && libre ? (F.cerca[e.id] || 0) + dt : 0;
        if (F.cerca[e.id] >= OBS_T) avistar(e.id);
      }
    }
    G.on('foto', () => {
      if (!activo()) return;
      for (const e of especies()) if (!mem.vistos.includes(e.id) && hogar[e.id] && distA(e.id) < (e.radio || 8) * 1.5) avistar(e.id);
    });

    const SILUETA = {
      iguana: '<ellipse cx="26" cy="22" rx="12" ry="5"/><ellipse cx="41" cy="19" rx="6" ry="4"/><path d="M14 22 Q4 24 1 33" stroke-width="3" fill="none"/><path d="M18 17 l2 -4 l2 4 l2 -4 l2 4 l2 -4 l2 4" stroke-width="1.5" fill="none"/>',
      tilapia: '<ellipse cx="30" cy="20" rx="17" ry="10"/><path d="M13 20 L3 11 L3 29 Z"/><path d="M22 10 Q32 4 40 11" stroke-width="2" fill="none"/>',
      pleco: '<ellipse cx="32" cy="24" rx="20" ry="6"/><path d="M14 24 L3 17 L3 30 Z"/><path d="M22 19 L28 7 L40 9 L42 19 Z"/>',
      pezleon: '<ellipse cx="34" cy="21" rx="12" ry="7"/><path d="M22 21 L12 14 L12 28 Z"/><path d="M28 15 L22 2 M32 14 L30 1 M36 14 L38 1 M40 15 L46 3" stroke-width="1.5" fill="none"/><path d="M34 24 Q20 40 12 34 Q24 30 30 22" />',
    };
    function htmlAlbum() {
      if (!activo()) return '';
      const v = mem.vistos, lista = especies(), A = D.album || {};
      const cards = lista.map(e => {
        const ok = v.includes(e.id), col = esc(e.color || '#6b5a3e');
        const svg = `<svg viewBox="0 0 60 40" width="60" height="40" aria-hidden="true" fill="${ok ? col : '#555'}" stroke="${ok ? col : '#555'}">${SILUETA[e.silueta] || ''}</svg>`;
        if (!ok) return `<li class="fauna-tarjeta fauna-falta inv-tarjeta">${svg}<span><b>???</b><small>${esc(L(e.pista, e.pistaEn))}</small></span></li>`;
        return `<li class="fauna-tarjeta inv-tarjeta" data-inv="${esc(e.id)}">${svg}<span><b>${esc(L(e.nombre, e.nombreEn))}</b> <i>${esc(e.cientifico)}</i><small>${esc(L(e.texto, e.textoEn))}</small>` +
          `<small class="fauna-fuente">${esc(L('Fuente', 'Source'))}: <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.fuente)}</a></small></span></li>`;
      }).join('');
      return `<span class="lbl inv-lbl">${esc(L(A.titulo, A.tituloEn))} (${lista.filter(e => v.includes(e.id)).length}/${lista.length})</span>` +
        `<small class="inv-intro">${esc(L(A.intro, A.introEn))}</small><ul class="fauna-album inv-album">${cards}</ul><small class="inv-nota">${esc(L(A.nota, A.notaEn))}</small>`;
    }
    if (!document.getElementById('invasoras-css')) {
      const st = document.createElement('style'); st.id = 'invasoras-css';
      st.textContent = '.inv-album{list-style:none;margin:.3em 0 .4em;padding:0;display:grid;gap:.45em}' +
        '.inv-album .fauna-tarjeta{display:flex;gap:.6em;align-items:flex-start;padding:.45em .55em;border-radius:10px;background:rgba(255,255,255,.07)}' +
        '.inv-album .fauna-tarjeta svg{flex:none}.inv-album .fauna-tarjeta span{display:flex;flex-direction:column;gap:.15em;min-width:0}' +
        '.inv-album small{opacity:.9;line-height:1.35}.inv-album i{opacity:.8;font-size:.9em}.inv-album .fauna-fuente a{color:inherit;text-decoration:underline;word-break:break-word}' +
        '.inv-album .fauna-falta{opacity:.6}.inv-intro,.inv-nota{display:block;opacity:.85;line-height:1.35;margin:.2em 0 .5em}';
      document.head.appendChild(st);
    }
    if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'invasoras', html: htmlAlbum });

    // ---------- Bucle ----------
    function paso(dt, busy) {
      dt = Math.min(dt, 0.1); F.t += dt; uT.value += dt;
      if (activo()) revisar(dt, !busy);
      dibujar();
    }
    G.on('update', (dt, busy) => { if (!F.prueba) paso(dt, busy); }, 88);
    if (activo() && !mem.vistos.length && !G.quiet) setTimeout(() => avisar(L(`${D.album.titulo}: ${D.album.intro}`, `${D.album.tituloEn}: ${D.album.introEn}`), 5200), 2500);
    const estado = () => ({ activo: activo(), vistos: mem.vistos.slice(), completa: mem.completa, hogar: Object.keys(hogar),
      draw: Object.values(mallas).filter(m => m.visible).length });

    // =====================================================================================================================
    // Prueba (AV.invasorasTest)
    // =====================================================================================================================
    async function test() {
      const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
      const cuadros = n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const g0 = { pos: Object.assign({}, S.pos), vy: S.vy, speed: M.speed, flying: M.flying, posado: M.posado, exp: G.expansion, mem: JSON.parse(JSON.stringify(mem)), quiet: G.quiet };
      let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
      const toast0 = G.ui.toast, textos = []; G.ui.toast = t => { textos.push(String(t)); };
      const idioma0 = G.aula && G.aula.aj && G.aula.aj.idioma;
      if (G.aula && G.aula.aj) G.aula.aj.idioma = 'es';
      const aprend = []; oyenteTest = d => { if (d && d.tipo === 'invasora') aprend.push(d.id); };
      const quietaEn = (x, z) => { S.pos.x = x; S.pos.z = z; S.pos.y = Math.max(H(x, z), nivelAgua(x, z)) + 0.1; S.vy = 0; M.speed = 0; M.flying = false; M.posado = ''; };
      const simular = seg => { for (let t = 0; t < seg - 1e-6; t += 0.1) paso(0.1, false); };
      const visibles = () => Object.values(mallas).filter(m => m.visible).length;
      try {
        // 1. Bandera apagada: boot.js no carga el módulo, nada se ve, sección del Diario vacía, nada se avista
        ok('Bandera apagada por defecto: sin ?expansion=1 boot.js no carga la patrulla', G.expansionAuto !== true || G.expansion === true, 'expansion ' + G.expansion + ' · cargada al arrancar ' + !!G.expansionAuto);
        G.expansion = false; F.prueba = false; mem = { v: 1, vistos: [], completa: false };
        const h0 = hogar.iguana; if (h0) quietaEn(h0.x + 1, h0.z); G.quiet = false; paso(0.1, false); simular(2.5); G.quiet = g0.quiet;
        ok('Bandera apagada: ninguna malla visible, sección del Diario vacía, nada se avista ni se avisa', visibles() === 0 && htmlAlbum() === '' && !mem.vistos.length && !textos.length && !avistar('iguana'),
          visibles() + ' visibles · ' + mem.vistos.length + ' vistos · ' + textos.length + ' avisos');
        // 2. Datos: 4 especies verificadas, ES + EN, fuente oficial con URL https
        const oficial = /^https:\/\/([a-z0-9-]+\.)*(usgs\.gov|drna\.pr\.gov|noaa\.gov|fws\.gov)\//;
        const E = especies();
        ok('4 especies (iguana, tilapia, pleco, pez león), todas verificadas', E.length === 4 && ['iguana', 'tilapia', 'pleco', 'pezleon'].every(id => espDe(id)), E.map(e => e.id).join(','));
        ok('Cada ficha: nombre y texto en español e inglés, nombre científico, fuente y URL oficial (USGS, DRNA, NOAA o USFWS)',
          E.every(e => e.nombre && e.nombreEn && e.texto && e.textoEn && e.cientifico && e.fuente && oficial.test(e.url) && e.pista && e.pistaEn));
        ok('Ningún texto las presenta como enemigos ni habla de atacarlas', !E.some(e => /atac|mata|caza|enemig|destru|attack|kill|hunt|enemy/i.test(e.texto + e.textoEn + e.pista + e.pistaEn)));
        // 3. Hábitats: iguana en la orilla seca, peces bajo el agua del río, pez león en el mar del arrecife
        const hi = hogar.iguana, ht = hogar.tilapia, hp = hogar.pleco, hl = hogar.pezleon;
        ok('Cada especie tiene su sitio en el mapa', !!(hi && ht && hp && hl), Object.keys(hogar).join(','));
        if (hi && ht && hp && hl) {
          F.prueba = true; G.expansion = true; simular(0.3);
          const lI = nivelAgua(hi.x, hi.z);
          ok('Iguana en tierra seca junto al río (a 18 m o menos de un punto del cauce)', !(lI > hi.y + 0.1) && RIO.some(p => Math.hypot(p[0] - hi.x, p[1] - hi.z) < 18 + p[3]), 'y ' + hi.y.toFixed(2) + ' · agua ' + lI);
          const bajo = (h, v) => v.y < nivelAgua(v.x, v.z) - 0.05 && v.y >= H(v.x, v.z) - 0.01;
          ok('Tilapias bajo el agua del río y sobre el fondo', ht.individuos.length === 4 && ht.individuos.every(v => bajo(ht, v)), ht.individuos.map(v => (nivelAgua(v.x, v.z) - v.y).toFixed(2)).join(','));
          ok('Plecos en el fondo del río, bajo el agua', hp.individuos.every(v => bajo(hp, v) && v.y - H(v.x, v.z) < 0.1));
          ok('Peces león en el mar (arrecife de la playa), bajo el agua', Math.abs(hl.agua - ((MAPA.agua.mar && MAPA.agua.mar.nivel) || 0)) < 0.3 && hl.individuos.every(v => bajo(hl, v)), 'prof ' + (hl.agua - H(hl.x, hl.z)).toFixed(2));
          quietaEn(ht.x + 3, ht.z); paso(0.05, false); const visorCerca = ht.visor && mallas.tilapia.renderOrder === 10;
          quietaEn(ht.x + 30, ht.z); paso(0.05, false);
          ok('Visor: las tilapias se ven claras a 3 m y el agua las tapa a 30 m', visorCerca && !ht.visor && mallas.tilapia.renderOrder === -1 && mallas.tilapia.material.depthTest);
          ok('Con la bandera: 4 mallas visibles cerca (4 draw calls como mucho)', visibles() === 4 && Object.keys(mallas).length === 4);
          // 4. Actividad: lejos no cuenta; de paso rápido no cuenta; despacio 1,5 s cerca sí, una vez
          mem = { v: 1, vistos: [], completa: false }; F.pistas = {}; F.cerca = {}; textos.length = 0; aprend.length = 0;
          quietaEn(hi.x + 40, hi.z); simular(3);
          ok('Lejos (40 m) no se avista nada', !mem.vistos.length);
          quietaEn(hi.x + 15, hi.z); simular(0.2);
          ok('A 15 m sale una pista una sola vez', textos.length === 1 && /despacio/.test(textos[0]), textos.join(' | ')); simular(1);
          ok('…y no se repite', textos.length === 1);
          quietaEn(hi.x + 2, hi.z); M.speed = 9; M.flying = true; simular(2); M.speed = 0; M.flying = false;
          ok('Pasar volando rápido junto a ella no la avista', !mem.vistos.includes('iguana'));
          F.cerca = {}; quietaEn(hi.x + 2, hi.z); simular(1.0);
          const antes = mem.vistos.includes('iguana'); simular(0.7);
          ok('Despacio a 2 m: se avista a los 1,5 s, no antes', !antes && mem.vistos.includes('iguana') && aprend.filter(i => i === 'iguana').length === 1);
          ok('Aviso de reporte a la Estación con la cuenta (1/4)', textos.some(t => /Estación de Conservación \(1\/4\)/.test(t)), textos.slice(-1)[0]);
          simular(2); ok('Quedarse más no lo cuenta otra vez', aprend.filter(i => i === 'iguana').length === 1);
          // Foto: a 1,5 radios cuenta al instante
          quietaEn(ht.x + (espDe('tilapia').radio * 1.3), ht.z); G.emit('foto', { gesto: 'saludar' });
          ok('«Foto» cerca de las tilapias las avista al instante', mem.vistos.includes('tilapia'));
          for (const [id, h] of [['pleco', hp], ['pezleon', hl]]) { F.cerca = {}; quietaEn(h.x + 1.5, h.z); simular(1.8); }
          ok('Las 4 avistadas: patrulla completa y aviso final', mem.completa && mem.vistos.length === 4 && textos.some(t => /Patrulla completa/.test(t)), mem.vistos.join(','));
          // 5. Diario: 4 fichas con fuente y enlace; sin avistar solo la pista; en inglés
          const div = document.createElement('div'); div.innerHTML = htmlAlbum();
          const tarjetas = Array.from(div.querySelectorAll('.inv-tarjeta'));
          ok('Diario: 4 fichas con «Fuente» y enlace https', tarjetas.length === 4 && tarjetas.every(t => /Fuente/.test(t.textContent) && t.querySelector('a[href^="https://"]')) && /\(4\/4\)/.test(div.textContent));
          ok('La sección está registrada en el Diario', !!(G.diario && G.diario.seccion));
          if (G.aula && G.aula.aj) {
            G.aula.aj.idioma = 'en'; div.innerHTML = htmlAlbum();
            ok('En inglés (idioma en): título, fichas y «Source»', /Invasive species patrol/.test(div.textContent) && /Lionfish/.test(div.textContent) && /Source/.test(div.textContent) && !/Fuente/.test(div.textContent));
            G.aula.aj.idioma = idioma0;
          }
          mem = { v: 1, vistos: [], completa: false }; div.innerHTML = htmlAlbum();
          ok('Sin avistar: 4 fichas con «???» y la pista, sin texto ni enlace', div.querySelectorAll('.fauna-falta').length === 4 && !div.querySelector('a'));
          // 6. Silencio de baterías y distancia
          F.prueba = false; G.quiet = true; paso(0.05, false);
          ok('En las baterías (G.quiet) no se ve ninguna', visibles() === 0);
          G.quiet = false; quietaEn(hi.x + 300, hi.z); G.renderer.camera.position.set(hi.x + 300, hi.y + 5, hi.z); paso(0.05, false);
          const lejos = !mallas.iguana.visible; G.quiet = g0.quiet;
          ok('A más de 70 m la iguana se apaga', lejos);
          F.prueba = true;
          await cuadros(2);
        }
      } finally {
        oyenteTest = null; G.ui.toast = toast0; if (G.aula && G.aula.aj && idioma0 !== undefined) G.aula.aj.idioma = idioma0;
        F.prueba = false; G.expansion = g0.exp; G.quiet = g0.quiet; mem = g0.mem; F.cerca = {}; F.pistas = {};
        Object.assign(S.pos, g0.pos); S.vy = g0.vy; M.speed = g0.speed; M.flying = g0.flying; M.posado = g0.posado;
        try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
        paso(0.01, false);
      }
      return { passed: results.filter(r => r.ok).length, total: results.length, results };
    }

    return { estado, activo, avistar, paso, test, F, hogar, mallas, htmlAlbum, get vistos() { return mem.vistos.slice(); } };
  }
})();
