/* AVE · vegetación instanciada (modo mapa)
   Lee la flora del mapa (mapa.flora: densidad por especie en celdas de 8 m, máscara "libre" de 2 m, héroes y modelos del kit)
   y la dibuja con una InstancedMesh por primitiva de cada modelo (hojas y corteza):
   - Viento en el vertex shader con el color de vértice del kit (R = AO, G = peso de viento, B = fase), en coordenadas de
     mundo y con ráfagas; las sombras usan el mismo viento.
   - Variación por instancia: escala, giro, leve inclinación y tinte (instanceColor).
   - Culling por celdas de 32 m (frustum) y por distancia; LOD: de cerca la malla, de lejos impostores (cada árbol del kit
     se renderiza al cargar en un atlas y se dibuja como tarjeta que mira a la cámara, todos en una llamada), con un fundido
     por tramado entre los dos. Plantas y rocas se apagan por distancia.
   - Pasto en tarjetas (pasto.glb) alrededor del jugador, donde el splat es pasto, fuera de senderos y agua.
   - Sombras: en 'alto' los árboles cercanos proyectan sombra real; en todos, una mancha suave bajo cada árbol los asienta.
   - Colisiones: troncos cercanos al jugador como colliders (se actualizan al moverse).
   - Fundido entre la cámara y Vittata: lo que queda dentro del cono cámara→Vittata (radio que crece hasta FUNDIDO.radio
     junto a ella) se vuelve translúcido por tramado, sin ordenar transparencias ni tocar las sombras.
   Datos del pack: mundo.flora { kit: { base, b64 }, viento: { dir: [x, z], fuerza }, distancias: { arbol, impostor, planta, roca } }.
   API: G.vegetacion.listo (promesa), stats(), instancias, especies, atlas (render target de los impostores; se repinta si se
   pierde el contexto WebGL). */
AVE.module('vegetacion', function (G) {
  'use strict';
  const T = G.terreno, MAPA = T.mapa, R = G.renderer, scene = R.scene, S = G.S;
  const FD = MAPA && MAPA.flora;
  if (!FD) return { listo: Promise.resolve(), stats: () => ({}) };
  const W = G.pack.mundo || {}, FL = W.flora || {};
  const KIT = Object.assign({ base: 'assets/models/entorno/', b64: 'AV_ENTORNO_B64' }, FL.kit);
  const VI = Object.assign({ dir: [0.8, 0.35], fuerza: 1 }, FL.viento);
  const DIST = Object.assign({ arbol: 110, impostor: 520, planta: 55, roca: 110, tronco: 80, hojarasca: 40, pasto: 34 }, FL.distancias);
  const PASTO_NIVEL = { bajo: { rad: 0.4, dens: 0.3 }, medio: { rad: 0.765 }, alto: { rad: 1 } }; // 26-D: 14 / 26 / 34 m; en bajo, poco
  const { rng } = G.util;
  const C = R.calidad;
  const lin = c => new THREE.Color(c).convertSRGBToLinear();

  // ---------- Modelos del kit por especie del mapa ----------
  const MODELOS = Object.assign({}, FD.modelos || {});
  const def = (k, kit, extra) => { if (!MODELOS[k]) MODELOS[k] = Object.assign({ kit }, extra); };
  def('palma_sierra', ['palma_sierra']); def('yagrumo', ['yagrumo']); def('tabonuco', ['tabonuco']); def('tabonuco_enano', ['tabonuco'], { escala: 0.55 });
  def('helecho_gigante', ['helecho_arboreo']); def('ceiba', ['ceiba']); def('flamboyan', ['flamboyan']); def('bambu', ['bambu']);
  def('heliconia', ['heliconia']); def('bromelia', ['bromelia']); def('helechos', ['helecho_suelo']);
  def('rocas', ['roca_musgo_a', 'roca_musgo_b', 'piedras_rio']); def('troncos', ['tronco_caido']);
  const ARB = new Set(['palma_sierra', 'yagrumo', 'tabonuco', 'helecho_arboreo', 'ceiba', 'flamboyan', 'bambu']);
  const baseDe = m => /^arbol_/.test(m) ? 'tabonuco' : m.replace(/_joven$/, '');
  const esArbol = m => ARB.has(baseDe(m));
  const ARBOLES = { has: esArbol, [Symbol.iterator]: function* () { for (const m in geos) if (esArbol(m)) yield m; } };
  const CAT = m => esArbol(m) ? 'arbol' : /roca|piedra/.test(m) ? 'roca' : m === 'tronco_caido' ? 'tronco' : m === 'hojarasca' ? 'hojarasca' : 'planta';
  // amplitud del viento por modelo (metros en las puntas) y frecuencia
  const VIENTO = { palma_sierra: [0.32, 1.1], yagrumo: [0.28, 0.9], tabonuco: [0.2, 0.7], helecho_arboreo: [0.22, 1.2], ceiba: [0.18, 0.55], flamboyan: [0.2, 0.8], bambu: [0.35, 1.3],
    heliconia: [0.1, 1.8], bromelia: [0.04, 2.0], helecho_suelo: [0.07, 2.1], pasto: [0.09, 2.4], hojarasca: [0, 1] };

  // ---------- Datos: densidad, máscara libre y lugar ----------
  const b64u8 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const LB = FD.libre ? Object.assign({}, FD.libre, { u8: b64u8(FD.libre.bits) }) : null;
  function libre(x, z) {
    if (!LB) return true;
    const ix = Math.floor((x - LB.x0) / LB.celda), iz = Math.floor((z - LB.z0) / LB.celda);
    if (ix < 0 || iz < 0 || ix >= LB.nx || iz >= LB.nz) return false;
    const i = ix + iz * LB.nx;
    return ((LB.u8[i >> 3] >> (i & 7)) & 1) === 1;
  }
  const dens = {};
  for (const k in FD.densidad || {}) dens[k] = b64u8(FD.densidad[k]);
  const enAgua = (x, z, y) => G.agua.levelAt(x, z) > y - 0.15;
  const cercaAgua = (x, z, r) => { for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (G.agua.levelAt(x + dx, z + dz) > -Infinity && G.agua.levelAt(x + dx, z + dz) > T.height(x + dx, z + dz) - 0.3) return true; return false; };

  // ---------- Carga de modelos ----------
  const geos = {};          // modelo -> [{ geo, mat, tipo }]
  const info = {};          // modelo -> { alto, ancho, tronco }
  function cargar(nombre) {
    if (geos[nombre]) return Promise.resolve(geos[nombre]);
    const url = KIT.base + nombre + '.glb';
    return G.assets.loadGLB(url, { b64: () => (window[KIT.b64] || {})[nombre], script: KIT.base + nombre + '_glb.js', base: KIT.base, error: 'flora no disponible: ' + nombre })
      .then(g => {
        g.scene.updateMatrixWorld(true);
        const prims = [];
        const box = new THREE.Box3();
        g.scene.traverse(o => {
          if (!o.isMesh) return;
          const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
          const c = geo.getAttribute('color');
          if (c) { geo.setAttribute('aViento', c); geo.deleteAttribute('color'); }
          else geo.setAttribute('aViento', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 4).fill(1), 4));
          geo.computeBoundingBox(); box.union(geo.boundingBox);
          const src = o.material, tipo = /^HOJA/.test(src.name) ? 'hoja' : /^ROCA/.test(src.name) ? 'roca' : 'corteza';
          prims.push({ geo, src, tipo });
        });
        // radio del tronco: distancia media al eje de los vértices de corteza entre 0,4 y 1,4 m
        let tr = 0, n = 0;
        for (const p of prims) if (p.tipo === 'corteza') {
          const a = p.geo.attributes.position;
          for (let i = 0; i < a.count; i++) { const y = a.getY(i); if (y > 0.4 && y < 1.4) { tr += Math.hypot(a.getX(i), a.getZ(i)); n++; } }
        }
        info[nombre] = { alto: box.max.y, ancho: Math.max(box.max.x - box.min.x, box.max.z - box.min.z), tronco: n ? tr / n : 0, box };
        geos[nombre] = prims;
        return prims;
      });
  }

  // ---------- Materiales con viento, AO, tinte y fundido ----------
  const U = { uTime: { value: 0 }, uSolDir: { value: R.sunDir }, uSolCol: { value: R.sun.color.clone().multiplyScalar(R.sun.intensity) },
    uOcluA: { value: new THREE.Vector4() }, uOcluB: { value: new THREE.Vector4() } }; // cámara (xyz, opacidad que se quita) / Vittata (xyz, radio)
  const FUNDIDO = Object.assign({ fuerza: 0.7, radio: 1.15, alto: 0.45 }, FL.fundido);
  const VIENTO_DIR = new THREE.Vector2(VI.dir[0], VI.dir[1]).normalize();
  const WIND_PARS = 'uniform float uTime; uniform vec4 uViento; uniform vec2 uFade; uniform vec3 uSolDir;\nattribute vec4 aViento;\nvarying float vAO; varying float vFadeD; varying float vTrans; varying vec3 vWPos;\n';
  const WIND_PROJECT = `
    vec4 mvPosition = vec4( transformed, 1.0 );
    vec3 ipos = vec3( 0.0 ); float iesc = 1.0;
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
      ipos = instanceMatrix[ 3 ].xyz; iesc = length( instanceMatrix[ 1 ].xyz );
    #endif
    float wg = aViento.g * aViento.g;
    float ph = aViento.b * 6.2832 + dot( ipos.xz, vec2( 0.31, 0.23 ) );
    float gust = 0.6 + 0.4 * sin( uTime * 0.37 + ipos.x * 0.019 + ipos.z * 0.013 );
    float sw = sin( uTime * uViento.w + ph ) * 0.7 + sin( uTime * uViento.w * 2.3 + ph * 1.7 ) * 0.3;
    gust *= 1.0 + uRafaga * 1.6; // ráfagas del clima
    mvPosition.xz += uViento.xy * ( sw * gust + ( 0.35 + uRafaga * 0.6 ) * gust ) * uViento.z * wg * iesc;
    mvPosition.y -= abs( sw ) * uViento.z * wg * iesc * 0.15;
    vAO = aViento.r; vWPos = mvPosition.xyz; // las mallas de flora están en el origen: esto ya es mundo
    vec3 camW = - ( vec4( viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz; // r128 no sube cameraPosition a Lambert
    vFadeD = distance( ipos, camW );
    vTrans = pow( max( dot( normalize( mvPosition.xyz - camW ), uSolDir ), 0.0 ), 3.0 );
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;
  `;
  const DITHER = 'float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }\n';
  const FADE_FRAG = `
    if ( uFade.y > 0.0 ) { float fd = smoothstep( uFade.x, uFade.y, vFadeD ); if ( fd > 0.0 && ign( gl_FragCoord.xy ) < fd ) discard; }
    if ( uOcluA.w > 0.0 ) {
      vec3 ab = uOcluB.xyz - uOcluA.xyz; float t = dot( vWPos - uOcluA.xyz, ab ) / max( dot( ab, ab ), 1e-4 );
      if ( t > 0.0 && t < 1.0 ) {
        float r = uOcluB.w * mix( 0.25, 1.0, t ), dl = distance( vWPos, uOcluA.xyz + ab * t );
        float k = ( 1.0 - smoothstep( r * 0.6, r, dl ) ) * smoothstep( 0.0, 0.08, 1.0 - t ) * uOcluA.w;
        if ( k > 0.0 && ign( gl_FragCoord.xy + 17.0 ) < k ) discard;
      }
    }
  `;
  const OCLU_PARS = 'uniform vec4 uOcluA; uniform vec4 uOcluB; varying vec3 vWPos;\n';
  const LAMBERT_WRAP = THREE.ShaderChunk.lights_lambert_vertex.replace(/dotNL = dot\( geometry\.normal, directLight\.direction \);/g, 'dotNL = dot( geometry.normal, directLight.direction ) * 0.72 + 0.28;');
  const mats = [];
  const RAFAGA = { value: 0 }; // 0–1: fuerza de la ráfaga del clima (aguacero), suavizada
  function windUniforms(nombre) {
    const v = VIENTO[nombre] || VIENTO[baseDe(nombre)] || [0.1, 1];
    return { uViento: { value: new THREE.Vector4(VIENTO_DIR.x, VIENTO_DIR.y, v[0] * VI.fuerza, v[1]) }, uFade: { value: new THREE.Vector2(0, 0) } };
  }
  function injectWind(sh, own) {
    Object.assign(sh.uniforms, U, own, { uRafaga: RAFAGA });
    sh.vertexShader = WIND_PARS + 'uniform float uRafaga;\n' + sh.vertexShader.replace('#include <project_vertex>', WIND_PROJECT);
  }
  function hojaMaterial(src, nombre, own) {
    const m = new THREE.MeshLambertMaterial({ map: src.map, alphaTest: 0.5, side: src.side, color: new THREE.Color(0.86, 0.88, 0.8) });
    m.onBeforeCompile = sh => {
      injectWind(sh, own);
      sh.vertexShader = 'varying float vPunta;\n' + sh.vertexShader.replace('#include <lights_lambert_vertex>', LAMBERT_WRAP)
        .replace('#include <fog_vertex>', '#include <fog_vertex>\n  vPunta = aViento.g;'); // peso del viento: 0 en la base, 1 en la punta
      sh.fragmentShader = 'uniform vec2 uFade; uniform vec3 uSolCol;\nvarying float vAO; varying float vFadeD; varying float vTrans;\n' + OCLU_PARS + DITHER + sh.fragmentShader
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FADE_FRAG)
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= mix( 0.22, 1.0, vAO ) * mix( vec3( 0.86, 0.9, 0.84 ), vec3( 1.1, 1.12, 0.92 ), vPunta );')
        .replace(/\( gl_FrontFacing \) \? vIndirectFront : vIndirectBack/g, 'vIndirectFront')
        .replace(/\( gl_FrontFacing \) \? vLightFront : vLightBack/g, 'vLightFront')
        .replace('#include <envmap_fragment>', '#include <envmap_fragment>\n  outgoingLight += mix( diffuseColor.rgb, vec3( 0.42, 0.62, 0.16 ), 0.45 ) * uSolCol * vTrans * vAO * mix( 0.4, 0.62, vPunta );');
      sh.fragmentShader = 'varying float vPunta;\n' + sh.fragmentShader;
    };
    m.customProgramCacheKey = () => 'hoja';
    return m;
  }
  function solidoMaterial(src, own, roca) {
    const m = new THREE.MeshPhongMaterial({ map: src.map, normalMap: src.normalMap || null, shininess: roca ? 10 : 6, specular: new THREE.Color(0x0c0c0c), side: THREE.FrontSide, color: roca ? new THREE.Color(0.9, 0.9, 0.88) : new THREE.Color(0.74, 0.72, 0.7) });
    if (m.normalMap) m.normalScale = new THREE.Vector2(1, roca ? 1 : -1).multiplyScalar(roca ? 1.0 : 0.9);
    m.onBeforeCompile = sh => {
      injectWind(sh, own);
      sh.fragmentShader = 'uniform vec2 uFade;\nvarying float vAO; varying float vFadeD; varying float vTrans;\n' + OCLU_PARS + DITHER + sh.fragmentShader
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + FADE_FRAG)
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= mix( 0.3, 1.0, vAO );');
    };
    m.customProgramCacheKey = () => roca ? 'roca' : 'corteza';
    return m;
  }
  function depthMaterial(src, own, hoja) {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: hoja ? src.map : null, alphaTest: hoja ? 0.5 : 0, side: hoja ? THREE.DoubleSide : THREE.FrontSide });
    m.onBeforeCompile = sh => { injectWind(sh, own); };
    m.customProgramCacheKey = () => hoja ? 'sombra-hoja' : 'sombra';
    return m;
  }

  // ---------- Instancias ----------
  // Cada instancia: modelo, posición, escala, giro y tinte. Se guardan matrices y colores en arreglos por modelo.
  const CELL = 32, X0 = MAPA.tamano.x0, Z0 = MAPA.tamano.z0, NCX = Math.ceil(MAPA.tamano.ancho / CELL), NCZ = Math.ceil(MAPA.tamano.largo / CELL);
  const porModelo = {};     // modelo -> { n, mat: Float32Array, col: Float32Array, pos: Float32Array (x,y,z,s), rank, celdas: [[idx]] }
  const arbolesLista = [];  // { x, z, r, h } para colliders y manchas
  let total = 0;
  function generar() {
    const rnd = rng(9137);
    const ocup = new Map(); // árboles: rejilla de 4 m para no encimarlos
    const libreDe = (x, z, r) => {
      const ix = Math.floor(x / 4), iz = Math.floor(z / 4);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = ocup.get((ix + a) * 8192 + iz + b);
        if (l) for (const o of l) if (Math.hypot(o.x - x, o.z - z) < (o.r + r) * 0.7) return false;
      }
      return true;
    };
    const marcar = (x, z, r) => { const k = Math.floor(x / 4) * 8192 + Math.floor(z / 4); let l = ocup.get(k); if (!l) ocup.set(k, l = []); l.push({ x, z, r }); };
    const lista = []; // { m, x, y, z, s, rot, tilt, tinte, rank }
    const add = (m, x, z, s, extra) => {
      const y = T.height(x, z);
      const it = Object.assign({ m, x, y, z, s, rot: rnd() * Math.PI * 2, tx: (rnd() - 0.5) * 0.06, tz: (rnd() - 0.5) * 0.06, h: rnd(), rank: rnd() }, extra);
      lista.push(it); return it;
    };
    // héroes primero (ocupan su sitio)
    for (const h of FD.heroes || []) {
      const md = MODELOS[h.especie]; if (!md) continue;
      const m = md.kit[0], s = (h.escala || 1) * (md.escala || 1);
      add(m, h.pos[0], h.pos[2], s, { heroe: true, rank: 0 });
      marcar(h.pos[0], h.pos[2], 4 * s);
    }
    // decoración puesta a mano por el level designer (rocas de La Mina, etc.)
    for (const d of MAPA.decoracion || []) {
      const it = add(d.kit, d.pos[0], d.pos[2], d.escala || 1, { rank: 0 });
      if (d.rotY != null) it.rot = d.rotY;
      if (d.pos[1] != null && Math.abs(d.pos[1] - it.y) < 3) it.y = Math.min(it.y, d.pos[1]);
    }
    // sitios que deben quedar despejados (objetos, hallazgos, coquíes, NPC): ni árboles ni matas encima
    const despejar = (typeof FL.evitar === 'function' ? FL.evitar(G.pack) : FL.evitar || []).concat(G.pack.npcs || []).filter(e => e && e.x != null);
    const tapado = (x, z, r) => despejar.some(e => Math.hypot(e.x - x, e.z - z) < (e.r || 0) + r);
    const cel = FD.celda, area = cel * cel / 100;
    for (const esp of FD.especies || []) {
      const d = dens[esp], md = MODELOS[esp];
      if (!d || !md) continue;
      const esArb = md.kit.some(k => esArbol(k));
      const radioArbol = { palma_sierra: 1.8, yagrumo: 1.8, tabonuco: 3.2, helecho_arboreo: 1.8, ceiba: 6, flamboyan: 4.5, bambu: 2.2 };
      for (let iz = 0; iz < FD.nz; iz++) for (let ix = 0; ix < FD.nx; ix++) {
        const v = d[ix + iz * FD.nx]; if (!v) continue;
        const exp = v / 10 * area;
        let n = Math.floor(exp); if (rnd() < exp - n) n++;
        for (let k = 0; k < n; k++) {
          let ok = false, x = 0, z = 0;
          for (let t = 0; t < 4 && !ok; t++) {
            x = FD.x0 + (ix + rnd()) * cel; z = FD.z0 + (iz + rnd()) * cel;
            ok = libre(x, z);
          }
          if (!ok) continue;
          const y = T.height(x, z);
          if (enAgua(x, z, y)) continue;
          if (tapado(x, z, esArb ? 3 : 1.6)) continue;
          if (!esArb && esp !== 'rocas' && T.normalAt(x, z).y < 0.62) continue; // matas: no en paredes de roca
          let m = md.kit[0];
          if (esp === 'rocas') m = cercaAgua(x, z, 3.5) && md.kit.includes('piedras_rio') ? 'piedras_rio' : md.kit[rnd() < 0.5 ? 0 : 1];
          else if (md.kit.length > 1) {
            const mz = md.mezcla == null ? null : typeof md.mezcla === 'number' ? md.mezcla : md.mezcla[md.kit[1]];
            m = mz != null ? md.kit[rnd() < mz ? 1 : 0] : md.kit[Math.floor(rnd() * md.kit.length)];
          }
          const s = (md.escala || 1) * (0.82 + rnd() * 0.36);
          if (esArb) {
            const nrm = T.normalAt(x, z);
            if (nrm.y < 0.72) continue;
            const r = (radioArbol[baseDe(m)] || 2) * s;
            if (!libreDe(x, z, r)) continue;
            marcar(x, z, r);
          }
          const it = add(m, x, z, s);
          // hojarasca bajo tabonucos y ceibas
          if ((m === 'tabonuco' || m === 'ceiba') && libre(x + 0.6, z + 0.4)) add('hojarasca', x + (rnd() - 0.5) * 1.2, z + (rnd() - 0.5) * 1.2, 0.9 + rnd() * 0.7 * (m === 'ceiba' ? 1.8 : 1));
          if (CAT(m) !== 'arbol' && CAT(m) !== 'roca') it.tx = it.tz = 0;
        }
      }
    }
    return lista;
  }
  function empaquetar(lista) {
    const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), m4 = new THREE.Matrix4(), c = new THREE.Color();
    const cuenta = {};
    for (const it of lista) cuenta[it.m] = (cuenta[it.m] || 0) + 1;
    for (const m in cuenta) {
      const n = cuenta[m];
      porModelo[m] = { n: 0, mat: new Float32Array(n * 16), col: new Float32Array(n * 3), pos: new Float32Array(n * 4), rank: new Float32Array(n), celdas: new Map() };
    }
    for (const it of lista) {
      const P = porModelo[it.m], i = P.n++;
      // tinte: verdes algo más amarillos u oscuros; rocas más grises; troncos más cálidos
      const cat = CAT(it.m), hh = it.h - 0.5;
      if (cat === 'roca') c.setRGB(0.9 + hh * 0.2, 0.92 + hh * 0.18, 0.94 + hh * 0.1);
      else c.setRGB(0.92 + hh * 0.22, 0.95 + hh * 0.12, 0.88 - hh * 0.12);
      const hundir = cat === 'arbol' ? 0.12 * it.s : cat === 'roca' ? 0.12 * it.s : 0.02;
      e.set(it.tx, it.rot, it.tz);
      m4.compose(ps.set(it.x, it.y - hundir, it.z), q.setFromEuler(e), sc.setScalar(it.s));
      m4.toArray(P.mat, i * 16); c.toArray(P.col, i * 3);
      P.pos[i * 4] = it.x; P.pos[i * 4 + 1] = it.y; P.pos[i * 4 + 2] = it.z; P.pos[i * 4 + 3] = it.s;
      P.rank[i] = it.rank;
      const k = Math.floor((it.x - X0) / CELL) + Math.floor((it.z - Z0) / CELL) * NCX;
      let l = P.celdas.get(k); if (!l) P.celdas.set(k, l = []); l.push(i);
    }
    total = lista.length;
  }

  // ---------- Mallas instanciadas por primitiva (cerca: con sombra real en 'alto'; medio: sin sombra) ----------
  const grupos = {}; // modelo -> { prims: [{ cerca, lejos }], cap }
  const BOXY = {}; // modelo -> alto para las celdas
  function crearMallas(m) {
    const P = porModelo[m], prims = geos[m]; if (!P || !prims) return;
    const own = windUniforms(m), cat = CAT(m);
    const g = { prims: [], cat, own };
    for (const p of prims) {
      const mat = p.tipo === 'hoja' ? hojaMaterial(p.src, m, own) : solidoMaterial(p.src, own, p.tipo === 'roca');
      const mk = (sombra) => {
        const im = new THREE.InstancedMesh(p.geo, mat, P.n);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(P.n * 3), 3);
        im.instanceColor.setUsage(THREE.DynamicDrawUsage);
        im.count = 0; im.visible = false; im.frustumCulled = false; im.receiveShadow = true; im.castShadow = sombra;
        if (sombra) im.customDepthMaterial = depthMaterial(p.src, own, p.tipo === 'hoja');
        im.name = 'flora:' + m + ':' + p.tipo + (sombra ? ':sombra' : '');
        scene.add(im);
        return im;
      };
      g.prims.push({ cerca: cat === 'arbol' ? mk(true) : null, lejos: mk(false) });
      mats.push(mat);
    }
    BOXY[m] = info[m] ? info[m].alto : 5;
    grupos[m] = g;
  }

  // ---------- Impostores: atlas con un render de cada árbol ----------
  const IMP = { tex: null, tile: {}, mesh: null, n: 0, rt: null, pintar: null };
  function hornearImpostores() {
    const lista = [...ARBOLES].filter(m => geos[m] && porModelo[m]);
    if (!lista.length) return;
    const TS = 256, cols = 4, rows = Math.pow(2, Math.ceil(Math.log2(Math.max(1, Math.ceil(lista.length / cols)))));
    const rt = new THREE.WebGLRenderTarget(TS * cols, TS * rows, { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, generateMipmaps: true });
    // El atlas solo vive en la GPU: si se pierde el contexto WebGL, se repinta al volver (gancho 'contexto', más abajo)
    const pintar = () => {
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(R.hemi.color, R.hemi.groundColor, R.hemi.intensity * 1.05));
      const dl = new THREE.DirectionalLight(R.sun.color, R.sun.intensity * 0.9); dl.position.set(0.4, 1, 0.8); sc.add(dl);
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      const r = R.renderer, prevRT = r.getRenderTarget(), prevClear = r.getClearColor(new THREE.Color()), prevA = r.getClearAlpha(), prevShadow = r.shadowMap.enabled;
      r.shadowMap.enabled = false;
      r.setRenderTarget(rt); r.setClearColor(0x6b8a5a, 0); r.clear();
      lista.forEach((m, k) => {
        const holder = new THREE.Group();
        for (const p of geos[m]) {
          const mat = p.tipo === 'hoja' ? new THREE.MeshLambertMaterial({ map: p.src.map, alphaTest: 0.5, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ map: p.src.map });
          holder.add(new THREE.Mesh(p.geo, mat));
        }
        sc.add(holder);
        const bx = info[m].box, w = Math.max(bx.max.x - bx.min.x, bx.max.z - bx.min.z) * 1.04, h = bx.max.y * 1.02;
        const half = Math.max(w, h) / 2;
        cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.near = 0.1; cam.far = 200;
        cam.position.set(0, half, 60); cam.lookAt(0, half, 0); cam.updateProjectionMatrix();
        const cx = k % cols, cy = Math.floor(k / cols);
        rt.viewport.set(cx * TS, (rows - 1 - cy) * TS, TS, TS); rt.scissor.copy(rt.viewport); rt.scissorTest = true;
        r.setRenderTarget(rt);
        r.render(sc, cam);
        sc.remove(holder);
        holder.traverse(o => { if (o.material) o.material.dispose(); });
        // tile en uv (u0, v0, du, dv) y tamaño del cuadro en metros
        IMP.tile[m] = { k, u: cx / cols, v: (rows - 1 - cy) / rows, du: 1 / cols, dv: 1 / rows, lado: half * 2 };
      });
      rt.scissorTest = false; rt.viewport.set(0, 0, TS * cols, TS * rows);
      r.setRenderTarget(prevRT); r.setClearColor(prevClear, prevA); r.shadowMap.enabled = prevShadow;
    };
    pintar();
    Object.assign(IMP, { rt, pintar });
    IMP.tex = rt.texture;
    // Malla: un cuadro por instancia, mirando a la cámara en el eje Y
    let cap = 0; for (const m of lista) cap += porModelo[m].n;
    const quad = new THREE.PlaneGeometry(1, 1); quad.translate(0, 0.5, 0);
    const ig = new THREE.InstancedBufferGeometry();
    ig.index = quad.index; ig.setAttribute('position', quad.attributes.position); ig.setAttribute('uv', quad.attributes.uv);
    const aP = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const aT = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage);
    const aC = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    ig.setAttribute('iPos', aP); ig.setAttribute('iTile', aT); ig.setAttribute('iCol', aC);
    ig.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), { tAtlas: { value: rt.texture }, uTime: U.uTime, uFade: { value: new THREE.Vector2(100, 110) } }),
      fog: true, transparent: false,
      vertexShader: `
        attribute vec4 iPos; attribute vec4 iTile; attribute vec3 iCol;
        uniform float uTime; varying vec2 vUv; varying vec3 vCol; varying float vD;
        #include <fog_pars_vertex>
        void main() {
          vec3 c = iPos.xyz; float lado = iPos.w;
          vec3 toCam = cameraPosition - c; toCam.y = 0.0; toCam = normalize(toCam);
          vec3 right = vec3(toCam.z, 0.0, -toCam.x);
          float sway = sin(uTime * 0.9 + c.x * 0.3 + c.z * 0.2) * 0.012 * position.y * position.y * lado;
          vec3 w = c + right * (position.x * lado + sway) + vec3(0.0, position.y * lado, 0.0) - toCam * lado * 0.15;
          vUv = iTile.xy + uv * iTile.zw; vCol = iCol; vD = distance(c, cameraPosition);
          vec4 mvPosition = viewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D tAtlas; uniform vec2 uFade; varying vec2 vUv; varying vec3 vCol; varying float vD;
        #include <fog_pars_fragment>
        float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
        void main() {
          vec4 t = texture2D(tAtlas, vUv);
          if (t.a < 0.5) discard;
          float fd = smoothstep(uFade.x, uFade.y, vD);
          if (ign(gl_FragCoord.xy) >= fd) discard;
          gl_FragColor = vec4(t.rgb * vCol, 1.0);
          #include <encodings_fragment>
          #include <fog_fragment>
        }`,
    });
    mat.toneMapped = false; // el atlas ya trae el tone mapping (r128 lo aplica al hornear)
    const mesh = new THREE.Mesh(ig, mat);
    mesh.frustumCulled = false; mesh.name = 'flora:impostores';
    scene.add(mesh);
    Object.assign(IMP, { mesh, aP, aT, aC, mat });
  }

  // ---------- Manchas de sombra bajo los árboles (una llamada) ----------
  let manchas = null;
  function crearManchas() {
    const lista = [];
    for (const m of ARBOLES) { const P = porModelo[m]; if (!P || !info[m]) continue; for (let i = 0; i < P.n; i++) lista.push([P.pos[i * 4], P.pos[i * 4 + 1], P.pos[i * 4 + 2], Math.min(7, info[m].ancho * 0.42) * P.pos[i * 4 + 3]]); }
    if (!lista.length) return;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.32, color: 0x000000,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    manchas = new THREE.InstancedMesh(geo, mat, lista.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), s = new THREE.Vector3(), p = new THREE.Vector3();
    lista.forEach((l, i) => {
      const nr = T.normalAt(l[0], l[2]); n.set(nr.x, nr.y, nr.z); q.setFromUnitVectors(up, n);
      m4.compose(p.set(l[0], l[1] + 0.06, l[2]), q, s.set(l[3], 1, l[3])); manchas.setMatrixAt(i, m4);
    });
    manchas.frustumCulled = false; manchas.renderOrder = 1; manchas.name = 'flora:manchas';
    scene.add(manchas);
  }

  // ---------- Pasto en tarjetas alrededor del jugador ----------
  const PASTO = { mesh: null, bloques: new Map(), n: 0 };
  function crearPasto() {
    const prims = geos.pasto; if (!prims) return;
    const p = prims[0], own = windUniforms('pasto');
    const mat = hojaMaterial(p.src, 'pasto', own);
    const cap = 6000;
    const im = new THREE.InstancedMesh(p.geo, mat, cap);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage);
    im.count = 0; im.frustumCulled = false; im.receiveShadow = true; im.name = 'flora:pasto';
    scene.add(im);
    PASTO.mesh = im; PASTO.cap = cap; PASTO.own = own;
  }
  const hash2 = (x, z) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const nTmp = {};
  // Candidatos de un bloque de 8 m (se calculan una vez): x, y, z, escala, giro, tinte
  function bloquePasto(bx, bz) {
    const key = bx * 8192 + bz;
    let b = PASTO.bloques.get(key);
    if (b) return b;
    b = [];
    const paso = 0.62;
    for (let i = 0; i < 13; i++) for (let k = 0; k < 13; k++) {
      const gx = bx * 13 + i, gz = bz * 13 + k;
      const x = gx * paso + hash2(gx, gz) * paso * 0.9, z = gz * paso + hash2(gz + 77, gx - 31) * paso * 0.9;
      if (!libre(x, z)) continue;
      const sp = T.splatAt(x, z); if (!sp) continue;
      const pasto = sp[0] - sp[1] * 0.6 - sp[2] - sp[3] * 1.5;
      const r = hash2(gx * 3 + 1, gz * 7 + 5);
      if (pasto < 0.25 + r * 0.45) continue;
      const y = T.height(x, z);
      if (G.agua.levelAt(x, z) > y - 0.05) continue;
      if (T.normalAt(x, z, nTmp).y < 0.82) continue; // nada de pasto en acantilados ni taludes
      b.push(x, y, z, 0.75 + hash2(gx + 9, gz + 3) * 0.6, hash2(gx - 5, gz + 11) * 6.283, r);
    }
    PASTO.bloques.set(key, b);
    if (PASTO.bloques.size > 400) { const it = PASTO.bloques.keys(); for (let j = 0; j < 100; j++) PASTO.bloques.delete(it.next().value); }
    return b;
  }
  const pastoUlt = { x: 1e9, z: 1e9, nivel: '' };
  function actualizarPasto(force) {
    const im = PASTO.mesh; if (!im) return;
    const PN = PASTO_NIVEL[C.nivel] || PASTO_NIVEL.medio, dens = C.pasto || PN.dens || 0;
    const rad = dens > 0 ? DIST.pasto * PN.rad : 0;
    if (rad <= 0 || !T.exacto) { im.count = 0; im.visible = false; return; }
    const px = S.pos.x, pz = S.pos.z;
    if (!force && Math.hypot(px - pastoUlt.x, pz - pastoUlt.z) < 1.6 && pastoUlt.nivel === C.nivel) return;
    pastoUlt.x = px; pastoUlt.z = pz; pastoUlt.nivel = C.nivel;
    const m = im.instanceMatrix.array, col = im.instanceColor.array, borde = rad * 0.35;
    let n = 0;
    const B = 8.06; // 13 × 0,62 m
    const b0x = Math.floor((px - rad) / B), b1x = Math.floor((px + rad) / B), b0z = Math.floor((pz - rad) / B), b1z = Math.floor((pz + rad) / B);
    for (let bx = b0x; bx <= b1x && n < PASTO.cap; bx++) for (let bz = b0z; bz <= b1z && n < PASTO.cap; bz++) {
      const b = bloquePasto(bx, bz);
      for (let j = 0; j < b.length && n < PASTO.cap; j += 6) {
        if (b[j + 5] > dens) continue;
        const dx = b[j] - px, dz = b[j + 2] - pz, d = Math.sqrt(dx * dx + dz * dz);
        if (d > rad) continue;
        const e = Math.min(1, (rad - d) / borde); // en el último 35 % del radio: tramado (se van quitando) y se encogen un poco
        if (e < 1 && hash2(j, b[j + 4] * 977) > e) continue;
        const s = b[j + 3] * (0.55 + 0.45 * e);
        if (s < 0.05) continue;
        const cr = Math.cos(b[j + 4]) * s, sr = Math.sin(b[j + 4]) * s, o = n * 16;
        m[o] = cr; m[o + 1] = 0; m[o + 2] = -sr; m[o + 3] = 0;
        m[o + 4] = 0; m[o + 5] = s; m[o + 6] = 0; m[o + 7] = 0;
        m[o + 8] = sr; m[o + 9] = 0; m[o + 10] = cr; m[o + 11] = 0;
        m[o + 12] = b[j]; m[o + 13] = b[j + 1] - 0.03; m[o + 14] = b[j + 2]; m[o + 15] = 1;
        const t = b[j + 5];
        col[n * 3] = 0.62 + t * 0.2; col[n * 3 + 1] = 0.78 + t * 0.1; col[n * 3 + 2] = 0.5 - t * 0.06;
        n++;
      }
    }
    im.count = n; im.visible = n > 0;
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
  }

  // ---------- Visibilidad: celdas en el frustum y distancia; cerca / lejos / impostor ----------
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), cbox = new THREE.Box3();
  const ult = { x: 1e9, y: 0, z: 1e9, rx: 0, ry: 0, frames: 0, nivel: '' };
  const camDir = new THREE.Vector3();
  function distancias(cat) {
    const f = C.floraDist;
    if (cat === 'arbol') return DIST.arbol * f;
    if (cat === 'roca') return DIST.roca * f;
    if (cat === 'tronco') return DIST.tronco * f;
    if (cat === 'hojarasca') return C.nivel === 'bajo' ? 0 : DIST.hojarasca * f;
    return DIST.planta * f;
  }
  function actualizar(force) {
    const cam = R.camera;
    cam.getWorldDirection(camDir);
    const moved = Math.hypot(cam.position.x - ult.x, cam.position.z - ult.z) + Math.abs(cam.position.y - ult.y) * 0.5;
    const turned = Math.abs(camDir.x - ult.rx) + Math.abs(camDir.z - ult.ry);
    ult.frames++;
    if (!force && moved < 1.5 && turned < 0.05 && ult.frames < 30 && ult.nivel === C.nivel) return;
    ult.x = cam.position.x; ult.y = cam.position.y; ult.z = cam.position.z; ult.rx = camDir.x; ult.ry = camDir.z; ult.frames = 0; ult.nivel = C.nivel;
    cam.updateMatrixWorld();
    pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const cx = cam.position.x, cz = cam.position.z;
    const sombraR = C.sombraFlora && C.sombras && C.nivel === 'alto' ? C.sombraRadio + 12 : 0;
    const impMax = DIST.impostor * Math.max(0.6, C.floraDist);
    let ni = 0;
    for (const m in grupos) {
      const g = grupos[m], P = porModelo[m], maxD = distancias(g.cat);
      const lejosMax = g.cat === 'arbol' && IMP.mesh ? impMax : maxD;
      const banda = Math.min(12, maxD * 0.15); // fundido entre malla e impostor
      const dens = g.cat === 'arbol' || g.cat === 'roca' ? 1 : C.flora;
      const cerca = [], lejos = [], imp = [];
      const c0x = Math.max(0, Math.floor((cx - lejosMax - X0) / CELL)), c1x = Math.min(NCX - 1, Math.floor((cx + lejosMax - X0) / CELL));
      const c0z = Math.max(0, Math.floor((cz - lejosMax - Z0) / CELL)), c1z = Math.min(NCZ - 1, Math.floor((cz + lejosMax - Z0) / CELL));
      for (let iz = c0z; iz <= c1z; iz++) for (let ix = c0x; ix <= c1x; ix++) {
        const l = P.celdas.get(ix + iz * NCX); if (!l) continue;
        cbox.min.set(X0 + ix * CELL - 8, -20, Z0 + iz * CELL - 8); cbox.max.set(X0 + (ix + 1) * CELL + 8, 140, Z0 + (iz + 1) * CELL + 8);
        if (!frustum.intersectsBox(cbox)) continue;
        for (const i of l) {
          if (P.rank[i] > dens) continue;
          const dx = P.pos[i * 4] - cx, dz = P.pos[i * 4 + 2] - cz, d = Math.sqrt(dx * dx + dz * dz);
          if (d > lejosMax) continue;
          if (d <= maxD) { if (d < sombraR) cerca.push(i); else lejos.push(i); }
          if (g.cat === 'arbol' && IMP.tile[m] && d > maxD - banda) imp.push(i);
        }
      }
      for (const pr of g.prims) {
        llenar(pr.cerca, P, sombraR ? cerca : []);
        llenar(pr.lejos, P, sombraR ? lejos : cerca.concat(lejos));
        const mt = pr.lejos.material; // fundido hacia el impostor
        g.own.uFade.value.set(g.cat === 'arbol' && IMP.mesh ? maxD - banda : 0, g.cat === 'arbol' && IMP.mesh ? maxD : 0);
        if (mt.userData.fade !== undefined) mt.userData.fade = g.own.uFade.value;
      }
      if (IMP.mesh && imp.length) {
        const tl = IMP.tile[m], lado = tl.lado;
        for (const i of imp) {
          IMP.aP.setXYZW(ni, P.pos[i * 4], P.pos[i * 4 + 1] - 0.2, P.pos[i * 4 + 2], lado * P.pos[i * 4 + 3]);
          IMP.aT.setXYZW(ni, tl.u, tl.v, tl.du, tl.dv);
          IMP.aC.setXYZ(ni, P.col[i * 3], P.col[i * 3 + 1], P.col[i * 3 + 2]);
          ni++;
        }
        IMP.mat.uniforms.uFade.value.set(maxD - banda, maxD);
      }
    }
    if (IMP.mesh) {
      IMP.mesh.geometry.instanceCount = ni; IMP.mesh.visible = ni > 0;
      IMP.aP.needsUpdate = IMP.aT.needsUpdate = IMP.aC.needsUpdate = true;
    }
  }
  function llenar(im, P, idx) {
    if (!im) return;
    const m = im.instanceMatrix.array, c = im.instanceColor.array;
    const n = idx.length;
    for (let j = 0; j < n; j++) {
      const i = idx[j];
      m.set(P.mat.subarray(i * 16, i * 16 + 16), j * 16);
      c[j * 3] = P.col[i * 3]; c[j * 3 + 1] = P.col[i * 3 + 1]; c[j * 3 + 2] = P.col[i * 3 + 2];
    }
    im.count = n; im.visible = n > 0;
    if (n) { im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; }
  }

  // ---------- Colliders de troncos cerca del jugador ----------
  const colUlt = { x: 1e9, z: 1e9 };
  const misColliders = [];
  function actualizarColliders(force) {
    const px = S.pos.x, pz = S.pos.z;
    if (!force && Math.hypot(px - colUlt.x, pz - colUlt.z) < 6) return;
    colUlt.x = px; colUlt.z = pz;
    const cols = G.fisica.colliders;
    for (const c of misColliders) { const i = cols.indexOf(c); if (i >= 0) cols.splice(i, 1); }
    misColliders.length = 0;
    const RAD = 40;
    for (const m of ARBOLES) {
      const P = porModelo[m], inf = info[m]; if (!P || !inf || inf.tronco < 0.08) continue;
      const c0x = Math.max(0, Math.floor((px - RAD - X0) / CELL)), c1x = Math.min(NCX - 1, Math.floor((px + RAD - X0) / CELL));
      const c0z = Math.max(0, Math.floor((pz - RAD - Z0) / CELL)), c1z = Math.min(NCZ - 1, Math.floor((pz + RAD - Z0) / CELL));
      for (let iz = c0z; iz <= c1z; iz++) for (let ix = c0x; ix <= c1x; ix++) {
        const l = P.celdas.get(ix + iz * NCX); if (!l) continue;
        for (const i of l) {
          const x = P.pos[i * 4], z = P.pos[i * 4 + 2], s = P.pos[i * 4 + 3];
          if (Math.abs(x - px) > RAD || Math.abs(z - pz) > RAD) continue;
          const c = { x, z, r: Math.max(0.2, inf.tronco * s * 0.95), h: inf.alto * s * 0.85, kind: 'arbol' };
          cols.push(c); misColliders.push(c);
        }
      }
    }
  }

  // ---------- Arranque: espera la malla del terreno (alturas exactas) y carga el kit ----------
  const necesarios = new Set(['pasto', 'hojarasca']);
  for (const esp of FD.especies || []) if (MODELOS[esp]) for (const k of MODELOS[esp].kit) necesarios.add(k);
  for (const h of FD.heroes || []) if (MODELOS[h.especie]) for (const k of MODELOS[h.especie].kit) necesarios.add(k);
  for (const d of MAPA.decoracion || []) if (d.kit) necesarios.add(d.kit);
  let listoRes = null;
  const listo = new Promise(res => { listoRes = res; });
  let activo = false;
  T.listo.then(() => Promise.all([...necesarios].map(n => cargar(n).catch(e => { console.warn('AVE flora:', e && e.message || e); return null; }))))
    .then(() => {
      const lista = generar().filter(it => geos[it.m]);
      empaquetar(lista);
      for (const m in porModelo) crearMallas(m);
      try { hornearImpostores(); } catch (e) { console.warn('AVE impostores:', e && e.message || e); }
      crearManchas();
      crearPasto();
      activo = true;
      actualizar(true); actualizarPasto(true); actualizarColliders(true);
      listoRes();
    }).catch(e => { console.warn('AVE vegetación:', e && e.message || e); listoRes(); });

  // Fundido: se apaga si no hay cámara de seguimiento normal (FUNDIDO.fuerza = 0 lo desactiva)
  function actualizarFundido() {
    const c = R.camera.position, a = U.uOcluA.value, b = U.uOcluB.value;
    b.set(S.pos.x, S.pos.y + FUNDIDO.alto, S.pos.z, FUNDIDO.radio);
    a.set(c.x, c.y, c.z, c.distanceTo(b) > FUNDIDO.radio * 1.5 ? FUNDIDO.fuerza : 0);
  }
  let rafagaObj = 0, rafagaT = 0;
  function actualizarRafaga(dt, t) {
    const cl = G.clima;
    if (t - rafagaT > 0.25) { rafagaT = t; const v = cl && cl.viento ? cl.viento(S.pos.x, S.pos.z, -1e4) : null; rafagaObj = v ? Math.min(1, Math.hypot(v.x, v.z) / 2.2) : 0; }
    RAFAGA.value += (rafagaObj - RAFAGA.value) * Math.min(1, (dt || 0) * 0.8);
  }
  G.on('render', (dt, t) => {
    U.uTime.value = t;
    actualizarRafaga(dt, t);
    if (!activo) return;
    actualizarFundido();
    actualizar(false);
    actualizarPasto(false);
  }, 22);
  G.on('update', () => { if (activo) actualizarColliders(false); }, 60);
  G.on('calidad', () => { if (activo) { actualizar(true); actualizarPasto(true); } });
  // Contexto WebGL recuperado: three vuelve a subir mallas, instancias y texturas desde sus arreglos; el atlas no tiene copia
  // en la CPU y se repinta aquí (el renderer emite 'contexto' antes de precalentar y de volver a dibujar)
  G.on('contexto', ok => { if (ok && IMP.pintar) try { IMP.pintar(); } catch (e) { console.warn('AVE impostores:', e && e.message || e); } });

  function stats() {
    const out = { fundido: U.uOcluA.value.w, total, mallas: 0, instanciasVisibles: 0, impostores: IMP.mesh ? IMP.mesh.geometry.instanceCount : 0, pasto: PASTO.mesh ? PASTO.mesh.count : 0, colliders: misColliders.length };
    for (const m in grupos) for (const p of grupos[m].prims) for (const im of [p.cerca, p.lejos]) if (im && im.visible) { out.mallas++; out.instanciasVisibles += im.count; }
    return out;
  }
  return { listo, stats, libre, get instancias() { return porModelo; }, get atlas() { return IMP.rt; }, info, rafaga: RAFAGA, fundido: FUNDIDO, fundir: actualizarFundido, actualizar: () => { actualizar(true); actualizarPasto(true); actualizarColliders(true); } };
});
