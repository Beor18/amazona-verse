/* Juego · Bandada de cotorras (carril M, M1: «un mundo con vida»)
   12 a 20 cotorras de pieles de distintas especies (AVE.pieles) que cruzan el cielo de El Yunque en bandada. Salen en estos momentos:
   al despertar (la partida empieza o se carga: pasan a lo lejos), al terminar una misión (G.emit('aprendizaje', { tipo: 'mision' }),
   pasan más cerca), de vez en cuando por la tarde (cada 2,5 a 5 min de juego) y cuando la cría legendaria canta
   (G.on('canto') → pedir('canto', { en: 1 })). Si Vittata se acerca (menos de 30 m), la bandada
   la acompaña unos 18 s dando vueltas a su alrededor y luego se va. Nunca en las baterías (G.quiet) ni antes de crear el personaje.
   - Se carga al pedirlo (boot.js la trae tras 'listo'): no suma a la descarga inicial. window.AVBandada(G) → { pedir, estado, test }.
   - Rendimiento: una sola malla instanciada por nivel de detalle (dos draw calls en total): la cotorra real horneada
     a mano (KIMI-122, assets/data/cotorra_horneada.js de tools/build/cotorra_horneada_gen.js; ~1,4 k tris de cerca y ~0,3 k a más de 55 m;
     sin el dato, esferas de ~110 tris como antes). El aleteo va en el vertex shader. Respeta la calidad automática de
     renderer.js: bajo = 6 (QA-110: el iPhone arranca en bajo y el mundo no debe quedar vacío; nunca más de 6, ni la de
     20 de M3), medio = 12, alto = 20; se reajusta sola con G.on('calidad'). Sin sombras y sin tocar el terreno ni el mundo.
   - Color: el verde del cuerpo y el color de la cabeza de la piel de cada especie (G.album.colores: tabla medida sobre
     assets/textures/pieles, sin descargar ninguna textura); ≤ 6 especies vivas por bandada (las extintas nunca vuelan aquí), y
     siempre del hábitat de su ruta (residentes.js especiesEn; docs/equipo/MUNDO_VIVO_ECOLOGIA.md): sobre Villa Raíz, puertorriqueñas.
   «Mundo vivo» (etapa 1):
   - Viajes entre zonas: por la tarde, 3 de cada 5 salidas son un viaje a una zona con nombre del mapa (G.lugares) a la vista
     de Vittata; la mitad de las veces la bandada se posa allí en grupo (copas, ramas y techos: perchas()) 25–45 s, picotea y
     mira alrededor, y luego despega y se va. Si Vittata se acerca a menos de 4 m de una posada, despegan antes.
   - Las mismas dos mallas dibujan las cotorras residentes (src/game/residentes.js, que se carga desde aquí), las comunidades y
     la ciudad viva (comunidades.js, ciudad_viva.js; RES_MAX = 74 instancias para todas: hasta 48 de la ciudad viva
     KIMI-081 + 26 de residentes/comunidades): todo junto sigue en 2 draw calls. Por instancia: fase del aleteo, pose (alas abiertas/plegadas, cabeceo y giro de
     la cabeza) y el color de la cabeza (iAcento, cob).
   Prueba: AV.bandadaTest(); con los residentes y el álbum, AV.vivoTest() (src/game/album.js). */
window.AVBandada = function (G) {
  'use strict';
  if (G.bandada && G.bandada.api) return G.bandada.api; // una sola bandada aunque la pidan boot.js y AV.vivoTest
  const S = G.S, scene = G.renderer.scene, AVE = window.AVE;
  const H = (x, z) => G.terreno.height(x, z);
  const NIVEL_N = { bajo: 6, medio: 12, alto: 20 };
  const VELO = 13, ACOMPANA_S = 18, CERCA = 30, LOD_LEJOS = 55, RES_MAX = 74, POSA_MIN = 25, POSA_VAR = 20, VIAJE_P = 0.6;
  const TARDE_MIN = 150, TARDE_VAR = 150;
  const PALETA = ['#3c9a45', '#5fae3c', '#2f8a4f', '#7bb83e', '#c9a227', '#3f8f6a']; // si no hay pieles

  // ---------- Geometría: cotorra con el pico al +Z, alas en ±X ----------
  function malla(detalle) {
    // parte de cada vértice (aParte): 0 cuerpo, 1 cabeza, 2 pico, 3 ala, 4 cola (el shader pliega las alas y gira la cabeza)
    const pos = [], col = [], par = [];
    let parte = 0;
    const tri = (a, b, c, k) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) { col.push(k, k, k); par.push(parte); } };
    const quad = (a, b, c, d, k) => { tri(a, b, c, k); tri(a, c, d, k); };
    const elipsoide = (sx, sy, sz, x, y, z, ws, hs, k) => {
      const g = new THREE.SphereGeometry(1, ws, hs).toNonIndexed(), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { pos.push(p.getX(i) * sx + x, p.getY(i) * sy + y, p.getZ(i) * sz + z); col.push(k, k, k); par.push(parte); }
    };
    const f = detalle ? 1 : 0;
    parte = 0; elipsoide(0.085, 0.09, 0.2, 0, 0, 0, f ? 8 : 5, f ? 6 : 3, 1);          // cuerpo
    parte = 1; elipsoide(0.062, 0.062, 0.07, 0, 0.07, 0.2, f ? 7 : 4, f ? 5 : 3, 1.12); // cabeza
    parte = 2; if (f) elipsoide(0.025, 0.03, 0.04, 0, 0.055, 0.27, 5, 4, 0.45);          // pico
    parte = 4; quad([-0.05, 0.01, -0.16], [0.05, 0.01, -0.16], [0.035, -0.02, -0.5], [-0.035, -0.02, -0.5], 0.7); // cola
    parte = 3;
    for (const s of [-1, 1]) {                                               // alas: la punta (|x| grande) es la que bate
      const alaIn = [[0.07, 0.03, 0.09], [0.07, 0.03, -0.12], [0.24, 0.045, -0.13], [0.24, 0.045, 0.07]];
      const alaOut = [[0.24, 0.045, 0.07], [0.24, 0.045, -0.13], [0.45, 0.06, -0.2], [0.44, 0.06, 0.0]];
      for (const [q, k] of f ? [[alaIn, 0.9], [alaOut, 0.6]] : [[[alaIn[0], alaIn[1], alaOut[2], alaOut[3]], 0.75]]) {
        const v = q.map(p => [p[0] * s * 0.8, p[1], p[2] * 0.8]);
        if (s < 0) quad(v[3], v[2], v[1], v[0], k); else quad(v[0], v[1], v[2], v[3], k);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aParte', new THREE.Float32BufferAttribute(par, 1));
    g.computeVertexNormals();
    return g;
  }
  const uT = { value: 0 };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // iPose = (alas 0 plegadas … 1 batiendo, cabeceo de la cabeza en rad (+ = abajo), giro de la cabeza en rad, cob del color
  // de la cabeza 0…1); iAcento = color de la cabeza (lineal). Con alas = 1 y sin giro es el aleteo de siempre.
  mat.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'uniform float uT;\nattribute float iFase;\nattribute vec4 iPose;\nattribute vec3 iAcento;\nattribute float aParte;\n' + sh.vertexShader
      .replace('#include <color_vertex>', `#include <color_vertex>
  if (aParte > 0.5 && aParte < 1.5 && iPose.w > 0.01) vColor.xyz = mix(vColor.xyz, color.xyz * iAcento, smoothstep(0.275 - 0.15 * iPose.w, 0.295 - 0.15 * iPose.w, position.z + (position.y - 0.07) * 0.5 * (1.0 - iPose.w)));
  if (aParte > 1.5 && aParte < 2.5) vColor.xyz = vec3(0.62, 0.58, 0.48);`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
  if (aParte > 2.5 && aParte < 3.5) {
    float ax = abs(position.x), sx = sign(position.x), w = max(ax - 0.056, 0.0), s = sin(uT * 13.0 + iFase);
    vec3 abierta = vec3(position.x - sx * (1.0 - cos(s * 0.5)) * ax * 0.6, position.y + s * ax * 1.1, position.z);
    vec3 plegada = vec3(sx * (0.06 + w * 0.08), position.y + 0.025 + w * 0.04, position.z * 0.5 - 0.02 - w * 0.85);
    transformed = mix(plegada, abierta, iPose.x);
  }
  if (aParte > 0.5 && aParte < 2.5) {
    vec3 q = transformed - vec3(0.0, 0.03, 0.12);
    float cy = cos(iPose.z), sy = sin(iPose.z), cp = cos(iPose.y), sp = sin(iPose.y);
    q = vec3(cy * q.x + sy * q.z, q.y, -sy * q.x + cy * q.z);
    q = vec3(q.x, cp * q.y - sp * q.z, sp * q.y + cp * q.z);
    transformed = q + vec3(0.0, 0.03, 0.12);
  }`);
  };
  const MAXN = NIVEL_N.alto + RES_MAX; // la bandada (hasta 20) + residentes/comunidades/ciudad viva (hasta RES_MAX) en las mismas mallas
  function instanciada(geo) {
    const im = new THREE.InstancedMesh(geo, mat, MAXN);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 3).fill(1), 3);
    geo.setAttribute('iFase', new THREE.InstancedBufferAttribute(new Float32Array(MAXN), 1));
    geo.setAttribute('iPose', new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 4), 4));
    geo.setAttribute('iAcento', new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 3).fill(1), 3));
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; im.visible = false; im.name = 'bandada'; im.userData.sinCulling = true; // renderer.js cullPequenos: la caja de la malla no sigue a las instancias
    return im;
  }
  const cerca = instanciada(malla(true)), lejos = instanciada(malla(false));
  scene.add(cerca); scene.add(lejos);

  // ---------- KIMI-122 · cotorra de verdad: malla low-poly hecha a mano (assets/data/cotorra_horneada.js) ----------
  // La genera tools/build/cotorra_horneada_gen.js (antes, KIMI-056, se horneaba de vittata_base_lod1.glb y salían bolas arrugadas).
  // Cada vértice trae dos poses: vuelo (position/normal) y posada de pie con las alas plegadas (aPleg/aPlegN); iPose.x funde
  // una con otra. Color: aTin.x = 1 se tiñe con el verde de la especie (instanceColor), 0 = color propio (cara blanca, ojo,
  // pico amarillo, patas, primarias azules); aTin.y = máscara de la cabeza (0 frente … 1 nuca): el color de la cabeza de la
  // especie cubre donde máscara < cob (iPose.w). Mismos InstancedMesh y API; si el dato no carga, se quedan las esferas.
  const uPivAla = { value: new THREE.Vector3(0.085, 0.045, 0.06) }, uPivCuello = { value: new THREE.Vector3(0, 0.05, 0.15) }, uPivCuelloP = { value: new THREE.Vector3(0, 0.05, 0.15) };
  const matReal = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  matReal.onBeforeCompile = sh => {
    sh.uniforms.uT = uT; sh.uniforms.uPivotAla = uPivAla; sh.uniforms.uPivotCuello = uPivCuello; sh.uniforms.uPivotCuelloP = uPivCuelloP;
    sh.vertexShader = 'uniform float uT;\nuniform vec3 uPivotAla;\nuniform vec3 uPivotCuello;\nuniform vec3 uPivotCuelloP;\nattribute float iFase;\nattribute vec4 iPose;\nattribute vec3 iAcento;\nattribute float aParte;\nattribute vec3 aPleg;\nattribute vec3 aPlegN;\nattribute vec2 aTin;\n' + sh.vertexShader
      .replace('#include <color_vertex>', `#include <color_vertex>
  vColor.xyz = mix(color.xyz, vColor.xyz, aTin.x);
  if (aTin.y < 1.5) vColor.xyz = mix(vColor.xyz, color.xyz * iAcento, (1.0 - smoothstep(iPose.w - 0.05, iPose.w + 0.03, aTin.y)) * step(0.01, iPose.w));`)
      .replace('#include <beginnormal_vertex>', `float des = clamp(iPose.x, 0.0, 1.0);
  vec3 avP = mix(aPleg, position, des);
  vec3 objectNormal = normalize(mix(aPlegN, normal, des));
  if (aParte > 2.5 && aParte < 3.5) {
    // aleteo en el hombro; la punta se dobla un poco más (onda)
    float sx = sign(position.x), fl = sin(uT * 13.0 + iFase);
    vec3 piv = vec3(sx * uPivotAla.x, uPivotAla.y, uPivotAla.z);
    float ang = sx * fl * 0.62 * des * (1.0 + 0.5 * smoothstep(0.2, 0.42, abs(position.x)));
    float c = cos(ang), s = sin(ang);
    vec3 q = avP - piv;
    avP = vec3(q.x * c - q.y * s, q.x * s + q.y * c, q.z) + piv;
    objectNormal = vec3(objectNormal.x * c - objectNormal.y * s, objectNormal.x * s + objectNormal.y * c, objectNormal.z);
  }
  if (aParte > 0.5 && aParte < 2.5) {
    // cabeza (con ojos y pico): giro y cabeceo en el cuello de la pose actual
    vec3 pc = mix(uPivotCuelloP, uPivotCuello, des), q = avP - pc;
    float cy = cos(iPose.z), sy = sin(iPose.z), cp = cos(iPose.y), sp = sin(iPose.y);
    q = vec3(cy * q.x + sy * q.z, q.y, -sy * q.x + cy * q.z);
    q = vec3(q.x, cp * q.y - sp * q.z, sp * q.y + cp * q.z);
    avP = q + pc;
    vec3 n = objectNormal;
    n = vec3(cy * n.x + sy * n.z, n.y, -sy * n.x + cy * n.z);
    objectNormal = vec3(n.x, cp * n.y - sp * n.z, sp * n.y + cp * n.z);
  }`)
      .replace('#include <begin_vertex>', 'vec3 transformed = avP;');
  };
  function geoHorneada(d) {
    const g = new THREE.BufferGeometry(), n = d.pos.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(d.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(d.col, 3));
    g.setAttribute('aPleg', new THREE.Float32BufferAttribute(d.pleg, 3));
    g.setAttribute('aPlegN', new THREE.Float32BufferAttribute(d.plegN || d.nor, 3));
    g.setAttribute('aParte', new THREE.Float32BufferAttribute(d.par, 1));
    g.setAttribute('aTin', new THREE.Float32BufferAttribute(d.tin || new Array(n * 2).fill(1).map((v, i) => (i % 2 ? 2 : 1)), 2));
    g.setIndex(d.idx);
    return g;
  }
  function usarMallaReal(D) {
    for (const [im, d] of [[cerca, D.near], [lejos, D.far]]) {
      const geo = geoHorneada(d);
      geo.setAttribute('iFase', new THREE.InstancedBufferAttribute(new Float32Array(MAXN), 1));
      geo.setAttribute('iPose', new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 4), 4));
      geo.setAttribute('iAcento', new THREE.InstancedBufferAttribute(new Float32Array(MAXN * 3).fill(1), 3));
      im.geometry.dispose(); im.geometry = geo; im.material = matReal;
    }
    uPivAla.value.set(D.ala[0], D.ala[1], D.ala[2]);
    uPivCuello.value.set(D.cuello[0], D.cuello[1], D.cuello[2]);
    const cp = D.cuelloPleg || D.cuello; uPivCuelloP.value.set(cp[0], cp[1], cp[2]);
    G.bandada.real = true;
  }
  if (window.AVE && AVE.assets) AVE.assets.script('assets/data/cotorra_horneada.js')
    .then(() => { if (window.AV_COTORRA_HORNEADA && window.AV_COTORRA_HORNEADA.near) usarMallaReal(window.AV_COTORRA_HORNEADA); })
    .catch(e => console.warn('bandada real: ' + (e && e.message)));

  // ---------- Especies y colores (G.album.colores: tabla medida sobre las pieles; solo especies vivas) ----------
  let colores = []; // [{ id: especie, c: THREE.Color lineal (cuerpo), a: THREE.Color lineal (cabeza), cob }]
  const lin = h => new THREE.Color(h).convertSRGBToLinear();
  const vivas = () => { const E = window.AV_ESPECIES; return E && Array.isArray(E.especies) ? E.especies.map(e => e.id) : []; };
  function colorDe(id) {
    const p = G.album && G.album.colores ? G.album.colores(id) : null;
    return p ? { id, c: lin(p.cuerpo), a: lin(p.cabeza), cob: p.cob } : null;
  }
  // Ecología (docs/equipo/MUNDO_VIVO_ECOLOGIA.md): la bandada lleva las especies del hábitat del lugar al que va o por donde pasa
  // (G.residentes.especiesEn: el lugar con colonia más cercano). Sin residentes todavía: cotorras puertorriqueñas.
  function poolEn(x, z) {
    const R = G.residentes, v = vivas();
    const p = R && R.especiesEn && x != null ? R.especiesEn(x, z) : [];
    return p.length ? p : v.filter(id => id === 'vittata');
  }
  function preparar(x, z) {
    if (colores.length) return Promise.resolve(colores);
    const ids = poolEn(x != null ? x : S.pos.x, z != null ? z : S.pos.z).slice().sort(() => Math.random() - 0.5).slice(0, 6);
    colores = ids.map(colorDe).filter(Boolean);
    if (!colores.length) colores = PALETA.map((h, i) => ({ id: 'pal' + i, c: lin(h), a: lin(h), cob: 0 }));
    return Promise.resolve(colores);
  }
  const mezclar = (x, z) => { colores = []; return preparar(x, z); }; // otra mezcla de especies para la siguiente salida

  // ---------- Perchas cerca de un punto: techos y ramas (G.solidos), copas (árboles de G.fisica.colliders) y suelo ----------
  function perchas(cx, cz, r, n, o) {
    o = o || {};
    const out = [], SO = G.solidos, A = G.agua, k0 = (o.semilla || 0) * 7.13;
    const conSuelo = o.suelo !== false, conAlto = o.alto !== false;
    if (conAlto && SO && SO.activo && SO.altoEn) {
      const m = Math.max(12, n * 5);
      for (let k = 0; k < m && out.length < n; k++) {
        const ang = k * 2.39996 + k0, rr = r * Math.sqrt((k + 0.5) / m), x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr, h = H(x, z);
        const g = SO.altoEn(x, z, h + 45);
        if (g > h + 1.6 && g < h + 40) out.push({ x, z, y: g, tipo: SO.fino && SO.fino(x, z, g + 0.01) ? 'rama' : 'techo' });
      }
    }
    if (conAlto) for (const c of (G.fisica && G.fisica.colliders) || []) {
      if (out.length >= n) break;
      if (c.kind !== 'arbol' || !(c.h > 3) || Math.hypot(c.x - cx, c.z - cz) > r) continue;
      const a = (c.x * 3.7 + c.z * 1.3 + k0) % 6.283, x = c.x + Math.cos(a) * 0.8, z = c.z + Math.sin(a) * 0.8;
      out.push({ x, z, y: H(c.x, c.z) + c.h * 0.95, tipo: 'copa' });
    }
    if (conSuelo) {
      const m = Math.max(8, n * 3);
      for (let k = 0, q = 0; k < m && q < Math.max(3, Math.ceil(n / 2)); k++) {
        const ang = k * 2.39996 + 1.1 + k0, rr = r * 0.85 * Math.sqrt((k + 0.5) / m), x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr, h = H(x, z);
        if (A && A.levelAt && A.levelAt(x, z) > h - 0.05) continue;                 // agua: no
        if (SO && SO.activo && SO.altoEn && SO.altoEn(x, z, h + 3) > h + 0.3) continue; // dentro de una casa o bajo un tronco: no
        out.push({ x, z, y: h, tipo: 'suelo' }); q++;
      }
    }
    return out;
  }
  // Zonas con nombre para los viajes (src/game/lugares.js; sin él, los pois del mapa)
  function zonas() {
    const l = G.lugares && G.lugares.lista ? G.lugares.lista() : Object.values((G.terreno && G.terreno.pois) || {});
    return l.filter(p => p && typeof p.x === 'number' && typeof p.z === 'number' && !/^percha_|^parada_|^gota_|^nube_|^bromelia_/.test(p.id || ''))
      .map(p => ({ id: p.id, x: p.x, z: p.z, nombre: G.lugares && G.lugares.nombreDe ? G.lugares.nombreDe(p) : (p.nombre || p.id) }));
  }

  // ---------- Bandada ----------
  const F = { estado: 'off', motivo: '', t: 0, n: 0, lider: { x: 0, y: 0, z: 0, vx: 0, vz: 1 }, aves: [], giro: 0, tAcompana: 0 };
  const dummy = new THREE.Object3D(); dummy.rotation.order = 'YXZ';
  const nivel = () => G.renderer.calidad.nivel;
  const cuentaPara = n => NIVEL_N[n] != null ? NIVEL_N[n] : 12;
  const permitido = () => !G.quiet && !!(S.profile && S.profile.created);
  const rnd = (a, b) => a + Math.random() * (b - a);

  function crearAves(n) {
    F.aves = [];
    for (let i = 0; i < n; i++) {
      const fila = 1 + Math.floor(i / 2), lado = i % 2 ? 1 : -1;
      F.aves.push({ x: 0, y: 0, z: 0, vx: 0, vz: 1, vy: 0, yaw: 0, lado: lado * (fila * 2.4 + rnd(-0.8, 0.8)), atras: fila * 1.9 + rnd(-0.7, 0.7), arriba: rnd(-1.4, 1.4),
        fase: rnd(0, 6.28), sp: i % Math.max(1, colores.length), esc: rnd(0.9, 1.2) * 1.5, ala: 1, cab: 0, gir: 0, posada: false, perch: null });
    }
    F.n = n;
  }
  const colocar = (a, escala) => {
    const L = F.lider, h = Math.hypot(L.vx, L.vz) || 1, fx = L.vx / h, fz = L.vz / h;
    a.tx = L.x + (-fz) * a.lado * escala - fx * a.atras * escala; a.tz = L.z + fx * a.lado * escala - fz * a.atras * escala;
    a.ty = L.y + a.arriba + Math.sin(F.t * 1.3 + a.fase) * 0.6;
  };
  function aparecer(motivo, o) {
    o = o || {};
    const tope = nivel() === 'bajo' && (!o.forzar || o.minima) ? cuentaPara('bajo') : Infinity; // QA-110: en bajo, la mínima (también la de 20 de M3); las pruebas forzadas, completas
    const n = Math.min(o.n != null ? o.n : cuentaPara(nivel()), tope);
    if (n <= 0 || F.estado !== 'off') return false;
    if (!o.forzar && (!permitido() || cuentaPara(nivel()) === 0)) return false;
    F.pasadas = o.pasadas || 1; F.opts = o;
    if (o.destino) mezclar(o.destino.x, o.destino.z); else if (!o.mismas) mezclar(S.pos.x, S.pos.z); // especies del hábitat de su ruta
    if (o.destino) return aparecerViaje(motivo, o, n);
    const dist = o.dist != null ? o.dist : motivo === 'despertar' ? rnd(190, 230) : rnd(150, 190), lado = rnd(55, motivo === 'mision' ? 45 : 110);
    const ang = o.ang != null ? o.ang : rnd(0, Math.PI * 2), L = F.lider;
    L.x = S.pos.x + Math.cos(ang) * dist; L.z = S.pos.z + Math.sin(ang) * dist;
    // rumbo: hacia un punto a `lado` metros de Vittata, de modo que pasen por un costado y se alejen
    const px = S.pos.x - Math.sin(ang) * lado, pz = S.pos.z + Math.cos(ang) * lado, dx = px - L.x, dz = pz - L.z, h = Math.hypot(dx, dz) || 1;
    L.vx = dx / h * VELO; L.vz = dz / h * VELO; L.y = H(L.x, L.z) + 38;
    crearAves(Math.min(n, NIVEL_N.alto)); F.t = 0; F.tAcompana = 0; F.estado = 'pasa'; F.motivo = motivo; F.dur = 0;
    for (const a of F.aves) { colocar(a, 1); a.x = a.tx; a.z = a.tz; a.y = a.ty; a.vx = L.vx; a.vz = L.vz; }
    return true;
  }
  // Viaje a una zona con nombre: sale a 150–200 m de ella, en la dirección contraria a Vittata, y vuela hacia allí
  function aparecerViaje(motivo, o, n) {
    const D = o.destino, L = F.lider, a0 = Math.atan2(D.z - S.pos.z, D.x - S.pos.x) + rnd(-0.7, 0.7), dist = o.dist != null ? o.dist : rnd(150, 200);
    L.x = D.x + Math.cos(a0) * dist; L.z = D.z + Math.sin(a0) * dist;
    const dx = D.x - L.x, dz = D.z - L.z, h = Math.hypot(dx, dz) || 1;
    L.vx = dx / h * VELO; L.vz = dz / h * VELO; L.y = H(L.x, L.z) + 34;
    crearAves(Math.min(n, NIVEL_N.alto)); F.t = 0; F.tAcompana = 0; F.estado = 'viaja'; F.motivo = motivo; F.dur = 0; F.destino = D; F.posar = !!o.posar;
    for (const a of F.aves) { colocar(a, 1); a.x = a.tx; a.z = a.tz; a.y = a.ty; a.vx = L.vx; a.vz = L.vz; }
    return true;
  }
  const terminar = () => { F.estado = 'off'; F.aves = []; F.n = 0; F.destino = null; if (!EXTRA.length) { cerca.count = lejos.count = 0; cerca.visible = lejos.visible = false; } };

  // Fin natural de una pasada: si quedan pasadas (BM20: las 20 cotorras de M3 cruzan dos veces), vuelve por el lado contrario
  function fin() {
    const o = F.opts || {}, m = F.motivo, quedan = (F.pasadas || 1) - 1; terminar();
    if (quedan > 0) aparecer(m, Object.assign({}, o, { mismas: true, pasadas: quedan, ang: (o.ang != null ? o.ang : 0) + Math.PI * 0.8 + rnd(-0.3, 0.3), forzar: true, dist: 150 }));
  }
  function mover(dt) {
    if (F.estado === 'off') return;
    dt = Math.min(dt, 0.1); F.t += dt; F.dur += dt;
    const L = F.lider, px = S.pos.x, pz = S.pos.z, dP = Math.hypot(L.x - px, L.z - pz);
    let tx, tz, vel = VELO, ty;
    if (F.estado === 'pasa') {
      if (dP < CERCA) { F.estado = 'acompana'; F.tAcompana = 0; F.giro = Math.atan2(L.z - pz, L.x - px); }
      else if (F.dur > 20 && dP > 280 || F.dur > 90) return fin();
    }
    if (F.estado === 'viaja') {
      const D = F.destino, dD = Math.hypot(D.x - L.x, D.z - L.z);
      tx = D.x; tz = D.z; vel = dD < 40 ? Math.max(6, VELO * dD / 40) : VELO; ty = H(L.x, L.z) + (dD < 60 ? 14 + dD * 0.3 : 34);
      if (dP < CERCA * 0.6 && !F.posar) { F.estado = 'acompana'; F.tAcompana = 0; F.giro = Math.atan2(L.z - pz, L.x - px); }
      else if (dD < 14) {
        if (F.posar && empezarPosa()) return dibujar();
        F.estado = 'pasa'; F.dur = 25; // sigue de largo y se va
      } else if (F.dur > 120) return fin();
    }
    if (F.estado === 'posa') return moverPosa(dt);
    if (F.estado === 'acompana') {
      F.tAcompana += dt; F.giro += dt * 0.32;
      tx = px + Math.cos(F.giro) * 13; tz = pz + Math.sin(F.giro) * 13; vel = 15;
      ty = Math.max(S.pos.y + 5, H(L.x, L.z) + 10);
      if (F.tAcompana > ACOMPANA_S) { F.estado = 'sale'; F.dur = 0; }
    }
    if (F.estado === 'sale') {
      const h = Math.hypot(L.x - px, L.z - pz) || 1; tx = L.x + (L.x - px) / h * 100; tz = L.z + (L.z - pz) / h * 100; vel = 17; ty = H(L.x, L.z) + 45;
      if (dP > 260 || F.dur > 40) return fin();
    }
    if (tx != null) {
      const dx = tx - L.x, dz = tz - L.z, h = Math.hypot(dx, dz) || 1, k = Math.min(1, dt * 1.4);
      L.vx += (dx / h * vel - L.vx) * k; L.vz += (dz / h * vel - L.vz) * k;
    }
    L.x += L.vx * dt; L.z += L.vz * dt;
    const yObj = ty != null ? ty : H(L.x, L.z) + 38; L.y += (yObj - L.y) * Math.min(1, dt * 0.8);
    const esc = F.estado === 'acompana' ? 0.6 : 1, k = 1 - Math.exp(-dt * 2.2);
    for (const a of F.aves) {
      colocar(a, esc);
      const ox = a.x, oy = a.y, oz = a.z;
      a.x += (a.tx - a.x) * k; a.z += (a.tz - a.z) * k; a.y += (a.ty - a.y) * k;
      a.y = Math.max(a.y, H(a.x, a.z) + 3);
      a.vx += ((a.x - ox) / dt - a.vx) * 0.15; a.vz += ((a.z - oz) / dt - a.vz) * 0.15; a.vy += ((a.y - oy) / dt - a.vy) * 0.15;
    }
    dibujar();
  }
  // ---------- Posarse en grupo en la zona de destino ----------
  function empezarPosa() {
    const D = F.destino, sem = Math.random() * 10;
    let P = [];
    for (let k = 0; k < 3 && P.length < F.aves.length; k++) { const q = perchas(D.x, D.z, 26 + k * 8, F.aves.length + 4, { suelo: false, semilla: sem + k }); if (q.length > P.length) P = q; }
    if (P.length < Math.max(4, Math.ceil(F.aves.length * 0.4))) return false; // sin árboles ni techos: sigue de largo (varias comparten percha si hacen falta)
    P.sort(() => Math.random() - 0.5);
    F.aves.forEach((a, i) => { a.perch = P[i % P.length]; a.posada = false; a.ox = a.x; a.oy = a.y; a.oz = a.z; a.prog = 0; a.dVuelo = Math.max(4, Math.hypot(a.perch.x - a.x, a.perch.y - a.y, a.perch.z - a.z)); a.prox = rnd(1, 4); a.accion = ''; });
    F.estado = 'posa'; F.dur = 0; F.posaS = POSA_MIN + Math.random() * POSA_VAR;
    return true;
  }
  function moverPosa(dt) {
    const px = S.pos.x, pz = S.pos.z;
    let susto = false;
    for (const a of F.aves) {
      const p = a.perch, oy = a.y, ox = a.x, oz = a.z;
      if (!a.posada) {
        a.prog = Math.min(1, a.prog + dt * 9 / a.dVuelo);
        const e = a.prog * a.prog * (3 - 2 * a.prog), arco = Math.sin(a.prog * Math.PI) * Math.min(6, a.dVuelo * 0.2);
        a.x = a.ox + (p.x - a.ox) * e; a.z = a.oz + (p.z - a.oz) * e; a.y = a.oy + (p.y + 0.14 * a.esc - a.oy) * e + arco;
        a.ala = 1; a.cab = 0; a.gir = 0;
        if (a.prog >= 1) { a.posada = true; a.ala = 0; }
      } else {
        a.ala = Math.max(0, a.ala - dt * 4); a.prox -= dt;
        if (a.prox <= 0) { a.accion = Math.random() < 0.45 ? 'come' : Math.random() < 0.5 ? 'mira' : ''; a.giroObj = rnd(-1.2, 1.2); a.prox = rnd(1.5, 4); }
        a.gir += ((a.giroObj || 0) - a.gir) * Math.min(1, dt * 4);
        a.cab = a.accion === 'come' ? 0.45 + Math.max(0, Math.sin(F.dur * 9 + a.fase)) * 0.5 : 0;
        if (Math.hypot(a.x - px, a.z - pz) < 4 && Math.abs(a.y - S.pos.y) < 3) susto = true;
      }
      if (dt > 0) { a.vx = (a.x - ox) / dt; a.vz = (a.z - oz) / dt; a.vy = (a.y - oy) / dt; }
    }
    if (susto || F.dur > F.posaS + 12) { // despegan juntas y se van por donde no está Vittata
      const L = F.lider, h = Math.hypot(L.x - px, L.z - pz) || 1;
      L.x = F.destino.x; L.z = F.destino.z; L.y = H(L.x, L.z) + 12; L.vx = (L.x - px) / h * 8; L.vz = (L.z - pz) / h * 8;
      for (const a of F.aves) { a.posada = false; a.ala = 1; a.cab = 0; a.gir = 0; }
      F.estado = 'sale'; F.dur = 0; F.destino = null;
    }
    dibujar();
  }

  // ---------- Dibujo: la bandada y los residentes (EXTRA, de residentes.js) en las mismas dos mallas ----------
  const EXTRA = []; // [{ x, y, z, yaw, pitch, roll, esc, c, a, cob, fase, ala, cab, gir }]
  const cam = G.renderer.camera;
  let pintadas = 0;
  function dibujar() {
    let nc = 0, nl = 0;
    const gc = cerca.geometry.attributes, gl = lejos.geometry.attributes;
    const poner = (x, y, z, rx, ry, rz, esc, cl, ac, cob, fase, ala, cab, gir) => {
      dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.setScalar(esc); dummy.updateMatrix();
      const dx = x - cam.position.x, dy = y - cam.position.y, dz = z - cam.position.z;
      const im = dx * dx + dy * dy + dz * dz < LOD_LEJOS * LOD_LEJOS ? cerca : lejos, ga = im === cerca ? gc : gl;
      const i = im === cerca ? nc++ : nl++;
      if (i >= MAXN) return;
      im.setMatrixAt(i, dummy.matrix); im.instanceColor.setXYZ(i, cl.r, cl.g, cl.b);
      ga.iFase.setX(i, fase); ga.iPose.setXYZW(i, ala, cab, gir, cob); ga.iAcento.setXYZ(i, ac.r, ac.g, ac.b);
    };
    if (F.estado !== 'off') for (const a of F.aves) {
      const k = colores[a.sp % colores.length], vel = Math.hypot(a.vx, a.vz) || 1;
      let yaw = Math.atan2(a.vx, a.vz), pitch = -Math.atan2(a.vy, vel) * 0.8;
      if (a.posada) { yaw = a.yawPosada != null ? a.yawPosada : (a.yawPosada = a.yawAnt != null ? a.yawAnt : yaw); pitch = -0.5 + a.cab * 0.5; }
      else a.yawPosada = null;
      const banco = a.posada ? 0 : Math.max(-0.5, Math.min(0.5, (a.yawAnt != null ? ((yaw - a.yawAnt + 9.42) % 6.2832 - 3.1416) : 0) * -4));
      a.yawAnt = yaw;
      poner(a.x, a.y, a.z, pitch, yaw, banco, a.esc, k.c, k.a, k.cob, a.fase, a.ala != null ? a.ala : 1, a.posada ? a.cab * 0.6 : 0, a.posada ? a.gir : 0);
    }
    for (const r of EXTRA) poner(r.x, r.y, r.z, r.pitch, r.yaw, r.roll, r.esc, r.c, r.a, r.cob, r.fase, r.ala, r.cab, r.gir);
    nc = Math.min(nc, MAXN); nl = Math.min(nl, MAXN);
    for (const [im, n, ga] of [[cerca, nc, gc], [lejos, nl, gl]]) {
      im.count = n; im.visible = n > 0; im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      ga.iFase.needsUpdate = true; ga.iPose.needsUpdate = true; ga.iAcento.needsUpdate = true;
    }
    pintadas = nc + nl;
  }

  // ---------- Disparadores ----------
  let pend = null, proxTarde = S.clock + rnd(TARDE_MIN, TARDE_MIN + TARDE_VAR);
  const pedir = (motivo, o) => { if (!(o && o.forzar) && !permitido()) return false; pend = { motivo, en: o && o.en != null ? o.en : 0, o, espera: 0 }; return true; };
  G.on('apply', () => { terminar(); pend = null; proxTarde = S.clock + rnd(TARDE_MIN, TARDE_MIN + TARDE_VAR); if (permitido()) pedir('despertar', { en: 6 }); }, 90);
  G.on('aprendizaje', d => { if (d && d.tipo === 'mision') pedir('mision', d.id === 'm3' ? { en: 3, n: NIVEL_N.alto, pasadas: 2, ang: rnd(0, 6.28) } : { en: 3 }); }); // BM20: al terminar M3 «Co-quí», 20 cotorras en dos pasadas
  G.on('canto', () => pedir('canto', { en: 1 })); // rareza.js: la cría legendaria llama a la bandada al despegar
  const alCalidad = C => { const n = cuentaPara(C.nivel); if (n === 0 || (F.estado !== 'off' && F.n > n)) terminar(); };
  G.on('calidad', alCalidad);
  G.on('update', (dt, busy) => {
    if (pend) {
      pend.en -= dt; pend.espera += dt;
      if (pend.en <= 0 && !busy) { const p = pend; if (aparecer(p.motivo, Object.assign({}, p.o, { en: undefined })) || F.estado !== 'off' || p.espera > 90) pend = null; }
    } else if (F.estado === 'off' && S.clock >= proxTarde) {
      proxTarde = S.clock + rnd(TARDE_MIN, TARDE_MIN + TARDE_VAR);
      if (!busy) { if (motivoTarde() === 'viaje' && pedirViaje()) { /* viaje entre zonas */ } else pedir('tarde'); }
    }
    uT.value += Math.min(dt, 0.1);
    if (F.estado !== 'off') mover(dt); else if (EXTRA.length || pintadas) dibujar();
  }, 88);
  // Horario de la tarde: 3 de cada 5 salidas son un viaje a una zona con nombre a la vista de Vittata (40–170 m)
  function motivoTarde() { return Math.random() < VIAJE_P ? 'viaje' : 'tarde'; }
  function pedirViaje(o) {
    const Z = zonas().filter(z => { const d = Math.hypot(z.x - S.pos.x, z.z - S.pos.z); return d > 40 && d < 170; });
    if (!Z.length) return false;
    const D = Z[Math.floor(Math.random() * Z.length)];
    return pedir('viaje', Object.assign({ destino: D, posar: Math.random() < 0.5 }, o));
  }

  // ---------- Prueba ----------
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guardado = { quiet: G.quiet, pos: Object.assign({}, S.pos), calidad: nivel(), clock: S.clock, pend, prox: proxTarde };
    const espera = ms => new Promise(r => setTimeout(r, ms)), cuadros = n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    try {
      terminar(); pend = null;
      ok('Cantidad por calidad: bajo 6, medio 12, alto 20', cuentaPara('bajo') === 6 && cuentaPara('medio') === 12 && cuentaPara('alto') === 20);
      ok('Con calidad baja sale la mínima: como mucho 6, también si piden 20 (QA-110)', (() => { const q = G.renderer.calidad.nivel; G.renderer.calidad.nivel = 'bajo'; const r = aparecer('prueba', { forzar: true, minima: true, n: 20 }); const nAves = F.aves.length; terminar(); G.renderer.calidad.nivel = q; return r !== false && nAves > 0 && nAves <= 6 && F.estado === 'off'; })());
      G.quiet = true; S.profile = S.profile || { created: false };
      ok('En las baterías (G.quiet) los disparadores no sacan la bandada', pedir('mision') === false && aparecer('tarde') === false && F.estado === 'off');
      ok('«pedir» forzado deja el aviso pendiente', pedir('despertar', { forzar: true, en: 5 }) === true && pend && pend.motivo === 'despertar'); pend = null;
      // Salida lejana: 20 aves, dos mallas como mucho, sin NaN y sobre el suelo
      S.pos.x = 0; S.pos.z = 0;
      aparecer('prueba', { forzar: true, n: 20, dist: 200, ang: 0.7 }); await preparar(); if (F.estado === 'off') aparecer('prueba', { forzar: true, n: 20, dist: 200, ang: 0.7 });
      mover(0.05);
      const extraN = (G.bandada.EXTRA || []).length; // QA-178: las 2 mallas son compartidas con residentes/comunidades/ciudad viva (EXTRA): se restan sus instancias
      ok('Salen 20 cotorras visibles en 1 o 2 mallas instanciadas', F.n === 20 && cerca.count + lejos.count === 20 + extraN && [cerca, lejos].filter(m => m.visible).length <= 2, (cerca.count + lejos.count) + ' en las mallas (' + extraN + ' de residentes/ciudad) · cerca ' + cerca.count + ' · lejos ' + lejos.count);
      const dist = Math.hypot(F.lider.x - S.pos.x, F.lider.z - S.pos.z);
      ok('Sale a lo lejos (más de 150 m)', dist > 150, Math.round(dist) + ' m');
      ok('Usan 3 o más especies (colores distintos)', new Set(F.aves.map(a => colores[a.sp % colores.length].id)).size >= 3 || colores.length < 3, colores.length + ' colores');
      // QA-51: el material no tiene «visible». stats() mezcla el streaming de otros cuadros, así que se dibuja la escena dos veces seguidas, con las mallas apagadas y encendidas.
      const ver = on => { cerca.visible = !!on && cerca.count > 0; lejos.visible = !!on && lejos.count > 0; };
      const info = G.renderer.renderer.info, cam3 = G.renderer.camera, sc = G.renderer.scene;
      const una = () => { G.renderer.renderer.render(sc, cam3); return info.render.calls; };
      ver(false); const base = una();
      ver(true); const con = una();
      ok('Suma 2 draw calls o menos', con - base >= 1 && con - base <= 2, base + ' → ' + con + ' · cerca ' + cerca.count + ' · lejos ' + lejos.count);
      let minD = 1e9, bien = true, pasos = 0, acompano = false;
      for (; F.estado !== 'off' && pasos < 3000; pasos++) {
        mover(0.1);
        if (F.estado === 'acompana') acompano = true;
        for (const a of F.aves) if (!(isFinite(a.x + a.y + a.z)) || a.y < H(a.x, a.z) + 2.9) bien = false;
        if (F.aves.length) minD = Math.min(minD, F.aves[0] ? Math.hypot(F.aves[0].x - S.pos.x, F.aves[0].z - S.pos.z) : 1e9);
      }
      ok('Pasa, se va sola y termina (máx. 5 min simulados)', F.estado === 'off' && pasos < 3000, (pasos / 10).toFixed(0) + ' s');
      ok('Sin posiciones inválidas ni por debajo del suelo', bien);
      // Acompañar: Vittata en la ruta
      S.pos.x = 40; S.pos.z = 40;
      aparecer('prueba', { forzar: true, n: 12, dist: 170, ang: 2.2 });
      let cerc = 0; acompano = false;
      for (pasos = 0; F.estado !== 'off' && pasos < 2000; pasos++) {
        if (F.estado === 'pasa') { S.pos.x = F.lider.x + F.lider.vx * 1.5; S.pos.z = F.lider.z + F.lider.vz * 1.5; } // la bandada se le cruza
        mover(0.1);
        if (F.estado === 'acompana') { acompano = true; if (F.tAcompana > 8 && F.tAcompana < 8.25) cerc = F.aves.filter(a => Math.hypot(a.x - S.pos.x, a.z - S.pos.z) < 40).length; }
      }
      ok('Si Vittata se acerca, la acompañan (todas a menos de 40 m a los 8 s)', acompano && cerc === 12, cerc + '/12');
      ok('Después se van y la bandada termina', F.estado === 'off');
      // Reacciona a la calidad
      aparecer('prueba', { forzar: true, n: 20, dist: 200, ang: 0.3 }); alCalidad({ nivel: 'bajo' });
      dibujar(); // QA-178: terminar no repinta en caliente (el repintado corre en el update): forzar el recuento real tras la retirada
      ok('Si la calidad baja a «bajo», se retira', F.estado === 'off' && cerca.count + lejos.count === (G.bandada.EXTRA || []).length); // QA-178: con EXTRA activas las mallas siguen (terminar no las apaga), pero la bandada se va
      // Disparadores reales con el personaje creado
      G.quiet = false; const creado = S.profile.created; S.profile.created = true;
      G.emit('aprendizaje', { tipo: 'mision', id: 'x' }); const trasMision = pend && pend.motivo; pend = null;
      G.emit('aprendizaje', { tipo: 'hallazgo', id: 'x' }); const trasOtra = pend; pend = null;
      G.emit('canto', { poder: 'canto', rareza: 'legendaria' });
      const trasCanto = !!(pend && pend.motivo === 'canto' && pend.en <= 1 && pend.en > 0); pend = null;
      G.quiet = true; G.emit('canto', { poder: 'canto' }); const cantoQuieto = !pend;
      S.profile.created = creado; G.quiet = true;
      // BM20: al terminar M3 salen 20 cotorras en dos pasadas
      G.quiet = false; S.profile.created = true; G.emit('aprendizaje', { tipo: 'mision', id: 'm3' }); const m3p = pend && pend.o; pend = null; S.profile.created = creado; G.quiet = true;
      ok('Terminar M3 «Co-quí» pide 20 cotorras en dos pasadas', m3p && m3p.n === 20 && m3p.pasadas === 2, JSON.stringify(m3p));
      aparecer('mision', { forzar: true, n: 20, pasadas: 2, dist: 160, ang: 1 }); await preparar(); if (F.estado === 'off') aparecer('mision', { forzar: true, n: 20, pasadas: 2, dist: 160, ang: 1 });
      let pasadasVistas = 0, estAnt = '', guardia = 0; for (; F.estado !== 'off' && guardia < 6000; guardia++) { if (F.pasadas === 2 && estAnt !== 'p2') { estAnt = 'p2'; pasadasVistas = 1; } if (F.pasadas === 1 && estAnt === 'p2') { estAnt = 'p1'; pasadasVistas = 2; } mover(0.1); }
      ok('Las 20 cruzan dos veces y luego terminan', pasadasVistas === 2 && F.estado === 'off' && guardia < 6000, pasadasVistas + ' pasadas, ' + (guardia / 10).toFixed(0) + ' s');
      ok('Terminar una misión la pide; otros aprendizajes no', trasMision === 'mision' && !trasOtra);
      ok('El canto de la cría pide la bandada (1 s) y en las baterías no', trasCanto && cantoQuieto, `${trasCanto}/${cantoQuieto}`);
    } finally {
      terminar(); G.quiet = guardado.quiet; Object.assign(S.pos, guardado.pos); pend = guardado.pend; proxTarde = guardado.prox;
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  const api = { pedir, estado: () => ({ estado: F.estado, motivo: F.motivo, n: F.n }), test, get meshes() { return [cerca, lejos]; }, aparecer, mover, F };
  G.bandada = { pedir, estado: () => ({ estado: F.estado, motivo: F.motivo, n: F.n, pasadas: F.pasadas, destino: F.destino && F.destino.id }), aparecer, mover, F, test, api,
    terminar, zonas, perchas, colorDe, EXTRA, dibujar, motivoTarde, pedirViaje, especies: () => colores.map(c => c.id), mezclar, poolEn, meshes: [cerca, lejos], MAXN, RES_MAX, uT };
  // Cotorras residentes (src/game/residentes.js): se cargan con la bandada y dibujan en sus mallas
  G.bandada.residentes = window.AVE && AVE.assets ? AVE.assets.script('src/game/residentes.js').then(() => window.AVResidentes(G, G.bandada), e => { console.warn('residentes: ' + (e && e.message)); return null; }) : Promise.resolve(null);
  return api;
};
