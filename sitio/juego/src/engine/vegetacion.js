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
   - Bosque lleno (AW2): relleno hasta ~7 000 árboles con la máscara de Kelvin (assets/data/bosque_cap1.js), con tope de
     árboles en malla por calidad (300/600/1 200, los más cercanos) y sombra real solo a menos de 30 m.
   - Colisiones: troncos a menos de 40 m del jugador como colliders (se actualizan al moverse).
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
  // F1 (AW2, MAPA_PLAN_COMPLETO.md): bosque lleno. Se rellena con árboles hasta `objetivo` donde la máscara de MultiScatter de
  // Kelvin (trees.psd → assets/data/bosque_cap1.js, tools/blender/bosque_mascara.py) tenía bosque, en el suelo libre del mapa.
  // De cerca, como mucho TOPE_ARBOLES árboles visibles en malla (los más cercanos); el resto, impostor. Sombra real solo a
  // menos de SOMBRA_MAX y troncos sólidos solo a menos de COL_RAD. mundo.flora.bosque: false lo apaga.
  const MAPA_CAP1 = window.AV_MAPA_CAP1;
  const BOSQUE = FL.bosque === false ? null : Object.assign({ src: 'assets/data/bosque_cap1.js', global: 'AV_BOSQUE_CAP1', objetivo: 7000, semilla: 7351 }, FL.bosque);
  const usarBosque = !!(BOSQUE && (FL.bosque || (MAPA_CAP1 && MAPA.nombre === MAPA_CAP1.nombre)));
  const TOPE_ARBOLES = Object.assign({ bajo: 300, medio: 600, alto: 1200 }, FL.topeArboles);
  // y como mucho estos triángulos de árboles en malla (los del kit tienen 1 000–5 700): con 300/600/1 200 árboles no cabría
  // en el presupuesto de MAPA_PLAN_COMPLETO.md § 3 (250 k / 450 k / 1,2 M el cuadro entero). Medido en las 12 vistas: con
  // 110/200/550 k el móvil (medio) pasaba de 450 k en aerea_sur y s_villa; con esto no crece respecto a antes de AW2.
  const TOPE_TRIS = Object.assign({ bajo: 60e3, medio: 120e3, alto: 300e3 }, FL.topeTris);
  const SOMBRA_MAX = 30, COL_RAD = 40;
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
  // BE7: tinte pardo de la corteza; con el de antes (0,74) los troncos claros del kit se leían como «palitos» blancos a media distancia
  const CORTEZA_TINTE = new THREE.Color(0.5, 0.45, 0.39);
  function solidoMaterial(src, own, roca) {
    const m = new THREE.MeshPhongMaterial({ map: src.map, normalMap: src.normalMap || null, shininess: roca ? 10 : 6, specular: new THREE.Color(0x0c0c0c), side: THREE.FrontSide, color: roca ? new THREE.Color(0.9, 0.9, 0.88) : CORTEZA_TINTE.clone() });
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
    const radioArbol = { palma_sierra: 1.8, yagrumo: 1.8, tabonuco: 3.2, helecho_arboreo: 1.8, ceiba: 6, flamboyan: 4.5, bambu: 2.2 };
    for (const esp of FD.especies || []) {
      const d = dens[esp], md = MODELOS[esp];
      if (!d || !md) continue;
      const esArb = md.kit.some(k => esArbol(k));
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
    // F0.4, cumbre verde: la meseta de El Yunque (97 m) y las terrazas altas quedaban casi peladas (en el mapa la palma de
    // sierra llega a 80 m y el tabonuco enano sale ralo). Palma de sierra y tabonuco enano en el suelo libre por encima de
    // `desde`, con su propia semilla para no mover el resto de la flora; mundo.flora.cumbre { desde, n, palma } (n: 0 la apaga).
    const CU = Object.assign({ desde: 82, n: 220, palma: 0.6 }, FL.cumbre);
    const altas = [];
    if (CU.n > 0) for (let iz = 0; iz < FD.nz; iz++) for (let ix = 0; ix < FD.nx; ix++) {
      if (T.height(FD.x0 + (ix + 0.5) * cel, FD.z0 + (iz + 0.5) * cel) > CU.desde - 4) altas.push(ix + iz * FD.nx);
    }
    const r2 = rng(5821);
    for (let t = 0, n = 0; altas.length && n < CU.n && t < CU.n * 12; t++) {
      const c = altas[Math.floor(r2() * altas.length)];
      const x = FD.x0 + (c % FD.nx + r2()) * cel, z = FD.z0 + (Math.floor(c / FD.nx) + r2()) * cel;
      const palma = r2() < CU.palma, md = MODELOS[palma ? 'palma_sierra' : 'tabonuco_enano'];
      const s = (md.escala || 1) * (0.8 + r2() * 0.4), r = (palma ? 1.8 : 3.2) * s;
      const y = T.height(x, z);
      if (y < CU.desde || !libre(x, z) || enAgua(x, z, y) || tapado(x, z, 3) || T.normalAt(x, z).y < 0.72 || !libreDe(x, z, r)) continue;
      marcar(x, z, r);
      add(md.kit[0], x, z, s, { rank: r2() });
      n++;
    }
    // F1.1 (AW2), bosque lleno: de ~1 900 árboles a BOSQUE.objetivo, en las celdas de 4 m con bosque en la máscara de Kelvin
    // y fuera de sendas, agua, edificios y sitios despejados (libre/tapado), sin encimarse (libreDe). Tres especies por
    // ambiente según la altura: tabonuco en el llano y los meandros, palma de sierra en las terrazas, bosque enano en lo
    // nublado. Semilla propia: el resto de la flora no se mueve.
    const MB = usarBosque && window[BOSQUE.global];
    bosquePos.length = 0;
    const especie = (h, u) => h > 64 ? (u < 0.55 ? 'tabonuco_enano' : u < 0.9 ? 'palma_sierra' : 'helecho_gigante')
      : h > 24 ? (u < 0.55 ? 'palma_sierra' : u < 0.85 ? 'tabonuco' : 'yagrumo')
      : (u < 0.6 ? 'tabonuco' : u < 0.8 ? 'yagrumo' : 'palma_sierra');
    if (MB && MB.bits) {
      const mb = b64u8(MB.bits), r3 = rng(BOSQUE.semilla), celdas = [];
      for (let i = 0; i < MB.nx * MB.nz; i++) if ((mb[i >> 3] >> (i & 7)) & 1) celdas.push(i);
      for (let i = celdas.length - 1; i > 0; i--) { const j = Math.floor(r3() * (i + 1)), t = celdas[i]; celdas[i] = celdas[j]; celdas[j] = t; }
      let n = lista.reduce((a, it) => a + (CAT(it.m) === 'arbol' ? 1 : 0), 0);
      for (let pasada = 0; pasada < 10 && n < BOSQUE.objetivo; pasada++) for (const c of celdas) {
        if (n >= BOSQUE.objetivo) break;
        const x = MB.x0 + (c % MB.nx + r3()) * MB.celda, z = MB.z0 + (Math.floor(c / MB.nx) + r3()) * MB.celda;
        const md = MODELOS[especie(T.height(x, z), r3())], u = r3(), s0 = r3(), rk = r3();
        if (!md || !libre(x, z)) continue;
        const y = T.height(x, z);
        if (y < 0.8 || enAgua(x, z, y) || T.normalAt(x, z).y < 0.72 || tapado(x, z, 3)) continue;
        const m = md.kit[Math.floor(u * md.kit.length)], s = (md.escala || 1) * (0.8 + s0 * 0.4), r = (radioArbol[baseDe(m)] || 2) * s * 0.8; // dosel cerrado: las copas del relleno se tocan algo más
        if (!libreDe(x, z, r)) continue;
        marcar(x, z, r);
        add(m, x, z, s, { rank: rk, bosque: true });
        n++; bosquePos.push(x, z);
      }
    }
    // BL1, selva del tepuy (T.selvaTepuy, como en el render de 2022): árboles en la cima y en las laderas alrededor de la gran
    // ciudad, también en las paredes que el relleno evita (hasta ~72°, hundidos en la ladera: de lejos, selva colgada del risco), con la probabilidad de la
    // elipse. Fuera de las piezas de la ciudad (escenaKelvin de las ruinas), de sendas, agua y sitios despejados. Semilla
    // propia y después del relleno: lo demás no se mueve. Cuentan aparte (tepuyPos).
    tepuyPos.length = 0;
    const ST = T.selvaTepuy && T.selvaTepuy.zona;
    if (ST) {
      const r4 = rng(4127), piezas = [], EK = MAPA.escenaKelvin || {};
      for (const g of EK.compacto || []) if (/ruinas/.test(g.grupo || '')) for (const t of g.inst || []) piezas.push(t.length >= 16 ? [t[12], t[14]] : [t[0], t[2]]);
      const enCiudad = (x, z, r) => piezas.some(p => Math.hypot(p[0] - x, p[1] - z) < ST.ciudad + r);
      const objetivo = ST.arboles || 1800;
      for (let t = 0, n = 0; n < objetivo && t < objetivo * 12; t++) {
        const x = ST.x + (r4() * 2 - 1) * ST.rx, z = ST.z + (r4() * 2 - 1) * ST.rz, w = T.selvaTepuy(x, z);
        if (r4() >= w || !libre(x, z)) continue;
        const y = T.height(x, z), ny = T.normalAt(x, z).y, md = MODELOS[especie(y, r4())], u = r4(), s0 = r4();
        if (!md || y < 4 || ny < 0.3 || enAgua(x, z, y) || tapado(x, z, 3)) continue;
        const m = md.kit[Math.floor(u * md.kit.length)], s = (md.escala || 1) * (0.75 + s0 * 0.4), r = (radioArbol[baseDe(m)] || 2) * s * 0.75;
        if (enCiudad(x, z, r) || !libreDe(x, z, r)) continue;
        marcar(x, z, r);
        const it = add(m, x, z, s, { rank: r4(), bosque: true });
        it.y -= (1 - ny) * 4; // en la ladera, el pie del lado de abajo no queda en el aire
        n++; tepuyPos.push(x, z);
      }
      // Revisión 11:10: las copas de 8–11 m se leían como nenúfares y solo caían en el borde
      // (el centro de la meseta no es «libre»: lo ocupan las piezas). Aquí son copas chicas, también
      // entre los edificios. El risco vertical no lleva copa.
      copasCima.length = 0;
      const pasoC = 3.3, rC = rng(9051);
      for (let z = ST.z - ST.rz; z <= ST.z + ST.rz; z += pasoC) for (let x = ST.x - ST.rx; x <= ST.x + ST.rx; x += pasoC) {
        const jx = x + (rC() - 0.5) * pasoC * 0.65, jz = z + (rC() - 0.5) * pasoC * 0.65;
        if (T.selvaTepuy(jx, jz) < 0.55) continue;
        const y = T.height(jx, jz), nyC = T.normalAt(jx, jz).y;
        if (y < 78 || nyC < 0.78 || enAgua(jx, jz, y) || tapado(jx, jz, 1.4) || enCiudad(jx, jz, -2)) continue;
        copasCima.push({ x: jx, y, z: jz, ny: nyC, s: 2.6 + rC() * 1.5, h: 2.8 + rC() * 1.3, tono: rC() });
      }
    }
    return lista;
  }
  const bosquePos = []; // x, z de los árboles de relleno (floraTest)
  const tepuyPos = []; // y los de la selva del tepuy (BL1)
  const copasCima = []; // copas sueltas de la meseta (G19), entre los edificios
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
    const g = { prims: [], cat, own, tris: 0 };
    for (const p of prims) g.tris += (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count) / 3;
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
          const mat = p.tipo === 'hoja' ? new THREE.MeshLambertMaterial({ map: p.src.map, alphaTest: 0.5, side: THREE.DoubleSide }) : new THREE.MeshLambertMaterial({ map: p.src.map, color: CORTEZA_TINTE });
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
        uniform float uTime; varying vec2 vUv; varying vec2 vLoc; varying vec3 vCol; varying float vD; varying float vAereo;
        #include <fog_pars_vertex>
        void main() {
          vec3 c = iPos.xyz; float lado = iPos.w;
          vec3 d3 = cameraPosition - c, toCam = normalize(vec3(d3.x, 0.0, d3.z));
          vec3 right = vec3(toCam.z, 0.0, -toCam.x);
          // F0.3: desde el aire el cuadro se recuesta hacia atrás (hasta ~63°) y la copa se ve; a pie y en vuelo bajo sigue de pie
          float elev = atan(d3.y, length(d3.xz));
          float inc = clamp(elev - 0.3, 0.0, 1.1);
          // G19: no agrandar el cuadro. A 1,7× la altura del árbol la copa era una hoja de varios metros
          // y, en render2022, tapaba la cámara. El tinte de copa solo entra lejos.
          float distC = length(d3);
          float aereo = smoothstep(0.28, 0.62, elev) * smoothstep(36.0, 72.0, distC);
          vec3 up = vec3(0.0, cos(inc), 0.0) - toCam * sin(inc);
          float ladoX = lado;
          float ladoY = lado;
          float sway = sin(uTime * 0.9 + c.x * 0.3 + c.z * 0.2) * 0.012 * position.y * position.y * lado;
          vec3 w = c + right * (position.x * ladoX + sway) + up * (position.y * ladoY) - toCam * lado * 0.15;
          vUv = iTile.xy + uv * iTile.zw; vLoc = uv; vCol = iCol; vD = distance(c, cameraPosition); vAereo = aereo;
          vec4 mvPosition = viewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform sampler2D tAtlas; uniform vec2 uFade; varying vec2 vUv; varying vec2 vLoc; varying vec3 vCol; varying float vD; varying float vAereo;
        #include <fog_pars_fragment>
        float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
        void main() {
          vec4 t = texture2D(tAtlas, vUv);
          float a = vAereo;
          if (a > 0.2) {
            // copa chica en lo alto del cuadro (unos 4 m), no un disco del tamaño del árbol entero
            vec2 q = (vLoc - vec2(0.5, 0.72)) * vec2(2.15, 2.4);
            float rad = length(q);
            float mascara = smoothstep(0.58, 0.26, rad);
            if (a > 0.8 && mascara < 0.06) discard;
            float n = fract(sin(dot(vLoc * vec2(19.0, 13.0) + vCol.xy, vec2(12.9898, 78.233))) * 43758.5453);
            float n2 = fract(sin(dot(floor(vLoc * 6.0) + vCol.yz, vec2(39.3, 11.7))) * 24634.634);
            vec3 osc = vec3(0.045, 0.09, 0.03);
            vec3 med = vec3(0.10, 0.18, 0.05);
            vec3 cla = vec3(0.18, 0.28, 0.07);
            vec3 copa = mix(osc, mix(med, cla, n2), 0.3 + 0.7 * mascara) * (0.8 + n * 0.4);
            float tronco = smoothstep(0.58, 0.2, vLoc.y);
            t.rgb = mix(t.rgb, copa, a * mix(0.78, 1.0, tronco));
            t.a = max(t.a, mascara * a);
          }
          if (t.a < 0.5) discard;
          float fd = smoothstep(uFade.x, uFade.y, vD);
          if (ign(gl_FragCoord.xy) >= fd) discard;
          gl_FragColor = vec4(t.rgb * mix(vCol, vec3(1.0), a * 0.7), 1.0);
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
    // F0.3: mancha de copa más ancha y densa, verde muy oscuro en vez de negro: desde el aire el bosque se lee como dosel
    // G19: la mancha cubre el hueco entre copas (antes una palma dejaba un círculo chico y el pasto se veía desde el aire)
    for (const m of ARBOLES) { const P = porModelo[m]; if (!P || !info[m]) continue; for (let i = 0; i < P.n; i++) lista.push([P.pos[i * 4], P.pos[i * 4 + 1], P.pos[i * 4 + 2], Math.min(6.2, Math.max(2.6, (info[m].ancho || 3) * 0.5)) * P.pos[i * 4 + 3]]); }
    if (!lista.length) return;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.66, color: 0x122616,
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

  // ---------- Copas de la cima (G19): entre los edificios, donde no cabe un tronco ----------
  // Tres planos cruzados, no un disco horizontal: la vista ciudad_tepuy mira unos 22° hacia abajo y un disco se vería de canto.
  let copasMesh = null;
  function crearCopasCima() {
    if (!copasCima.length) return;
    const partes = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.PlaneGeometry(1, 1);
      p.translate(0, 0.42, 0);
      p.rotateY(i * Math.PI / 3);
      partes.push(p);
    }
    let nv = 0, ni = 0;
    for (const p of partes) { nv += p.attributes.position.count; ni += p.index.count; }
    const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const p of partes) {
      pos.set(p.attributes.position.array, vo * 3);
      uv.set(p.attributes.uv.array, vo * 2);
      const ix = p.index.array;
      for (let k = 0; k < ix.length; k++) idx[io + k] = ix[k] + vo;
      vo += p.attributes.position.count; io += ix.length;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(32, 28, 2, 32, 32, 30);
    gr.addColorStop(0, '#8fbc5c'); gr.addColorStop(0.42, '#3f7a38'); gr.addColorStop(0.78, '#1c4622'); gr.addColorStop(1, 'rgba(8,20,10,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(32, 32, 30, 24, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 12; i++) {
      g.fillStyle = i % 2 ? 'rgba(150, 190, 70, 0.3)' : 'rgba(6, 18, 8, 0.45)';
      g.beginPath(); g.arc(14 + (i * 19) % 36, 14 + (i * 11) % 34, 3 + (i % 3), 0, 6.3); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.3, side: THREE.DoubleSide, color: 0xffffff });
    copasMesh = new THREE.InstancedMesh(geo, mat, copasCima.length);
    const cols = new Float32Array(copasCima.length * 3);
    copasMesh.instanceColor = new THREE.InstancedBufferAttribute(cols, 3);
    const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), eje = new THREE.Vector3(0, 1, 0), scv = new THREE.Vector3(), pv = new THREE.Vector3();
    copasCima.forEach((k, i) => {
      m4.compose(pv.set(k.x, k.y, k.z), qq.setFromAxisAngle(eje, k.tono * Math.PI * 2), scv.set(k.s, k.h, k.s));
      copasMesh.setMatrixAt(i, m4);
      cols[i * 3] = 0.78 + k.tono * 0.28; cols[i * 3 + 1] = 0.86 + (1 - k.tono) * 0.16; cols[i * 3 + 2] = 0.72;
    });
    copasMesh.frustumCulled = false; copasMesh.castShadow = false; copasMesh.receiveShadow = true; copasMesh.name = 'flora:copas-cima';
    scene.add(copasMesh);
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
    const sombraR = C.sombraFlora && C.sombras && C.nivel === 'alto' ? Math.min(SOMBRA_MAX, C.sombraRadio + 12) : 0;
    // F0.3: 520 m en todas las calidades (4 tris por árbol); antes 312–416 en bajo y medio. Con el dosel por celdas (AW3, dosel.js), 250 m
    const impMax = G.dosel && G.dosel.activo ? Math.min(DIST.impostor, G.dosel.impostorMax) : DIST.impostor;
    const maxArb = topeArbol(cx, cz, distancias('arbol'));
    let ni = 0, nMalla = 0, trisMalla = 0, dSombra = 0;
    for (const m in grupos) {
      const g = grupos[m], P = porModelo[m], maxD = g.cat === 'arbol' ? maxArb : distancias(g.cat);
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
          if (d <= maxD) { if (d < sombraR) { cerca.push(i); if (d > dSombra) dSombra = d; } else lejos.push(i); }
          if (g.cat === 'arbol' && IMP.tile[m] && d > maxD - banda) imp.push(i);
        }
      }
      if (g.cat === 'arbol') { nMalla += cerca.length + lejos.length; trisMalla += (cerca.length + lejos.length) * g.tris; }
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
    Object.assign(ULT, { arbolesMalla: nMalla, trisArboles: trisMalla, topeTris: TOPE_TRIS[C.nivel] || 0, dArbol: maxArb, dSombra, sombraR, tope: TOPE_ARBOLES[C.nivel] || 0 });
  }
  // F1.3 (AW2): distancia hasta la que van en malla los árboles para que no pasen de TOPE_ARBOLES[nivel] ni de TOPE_TRIS[nivel]
  // en pantalla (los más cercanos; el resto pasa al impostor con el mismo fundido). Si caben todos, la distancia de la calidad.
  const ULT = {};
  let dTope = new Float32Array(0), tTope = new Float32Array(0), iTope = new Uint32Array(0);
  function topeArbol(cx, cz, maxD) {
    const tope = TOPE_ARBOLES[C.nivel], topeT = TOPE_TRIS[C.nivel] || Infinity;
    if (!(tope > 0)) return maxD;
    if (dTope.length < total) { dTope = new Float32Array(total); tTope = new Float32Array(total); iTope = new Uint32Array(total); }
    let n = 0, tris = 0;
    const c0x = Math.max(0, Math.floor((cx - maxD - X0) / CELL)), c1x = Math.min(NCX - 1, Math.floor((cx + maxD - X0) / CELL));
    const c0z = Math.max(0, Math.floor((cz - maxD - Z0) / CELL)), c1z = Math.min(NCZ - 1, Math.floor((cz + maxD - Z0) / CELL));
    for (const m in grupos) {
      if (grupos[m].cat !== 'arbol') continue;
      const P = porModelo[m], tm = grupos[m].tris;
      for (let iz = c0z; iz <= c1z; iz++) for (let ix = c0x; ix <= c1x; ix++) {
        const l = P.celdas.get(ix + iz * NCX); if (!l) continue;
        cbox.min.set(X0 + ix * CELL - 8, -20, Z0 + iz * CELL - 8); cbox.max.set(X0 + (ix + 1) * CELL + 8, 140, Z0 + (iz + 1) * CELL + 8);
        if (!frustum.intersectsBox(cbox)) continue;
        for (const i of l) { const d = Math.hypot(P.pos[i * 4] - cx, P.pos[i * 4 + 2] - cz); if (d <= maxD) { dTope[n] = d; tTope[n] = tm; iTope[n] = n; n++; tris += tm; } }
      }
    }
    if (n <= tope && tris <= topeT) return maxD;
    const idx = iTope.subarray(0, n).sort((a, b) => dTope[a] - dTope[b]);
    let k = 0, t = 0;
    while (k < n && k < tope && t + tTope[idx[k]] <= topeT) t += tTope[idx[k++]];
    // corte a medio camino entre el último que entra y el primero que no (los que empatan en distancia no se cuelan)
    return k ? Math.max(4, (dTope[idx[k - 1]] + dTope[idx[k]]) / 2) : 4;
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
    const RAD = COL_RAD; // F1.5: solo troncos a menos de 40 m (en círculo)
    for (const m of ARBOLES) {
      const P = porModelo[m], inf = info[m]; if (!P || !inf || inf.tronco < 0.08) continue;
      const c0x = Math.max(0, Math.floor((px - RAD - X0) / CELL)), c1x = Math.min(NCX - 1, Math.floor((px + RAD - X0) / CELL));
      const c0z = Math.max(0, Math.floor((pz - RAD - Z0) / CELL)), c1z = Math.min(NCZ - 1, Math.floor((pz + RAD - Z0) / CELL));
      for (let iz = c0z; iz <= c1z; iz++) for (let ix = c0x; ix <= c1x; ix++) {
        const l = P.celdas.get(ix + iz * NCX); if (!l) continue;
        for (const i of l) {
          const x = P.pos[i * 4], z = P.pos[i * 4 + 2], s = P.pos[i * 4 + 3];
          if ((x - px) * (x - px) + (z - pz) * (z - pz) > RAD * RAD) continue;
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
  const mascara = () => usarBosque && !window[BOSQUE.global] ? G.assets.script(BOSQUE.src).catch(e => console.warn('AVE bosque:', e && e.message || e)) : null;
  T.listo.then(() => Promise.all([mascara(), ...[...necesarios].map(n => cargar(n).catch(e => { console.warn('AVE flora:', e && e.message || e); return null; }))]))
    .then(() => {
      const lista = generar().filter(it => geos[it.m]);
      empaquetar(lista);
      for (const m in porModelo) crearMallas(m);
      try { hornearImpostores(); } catch (e) { console.warn('AVE impostores:', e && e.message || e); }
      crearManchas();
      crearCopasCima();
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
    let arboles = 0;
    for (const m of ARBOLES) if (porModelo[m]) arboles += porModelo[m].n;
    return Object.assign(out, { arboles, bosque: bosquePos.length / 2, tepuy: tepuyPos.length / 2, copasCima: copasCima.length }, ULT);
  }

  // ---------- floraTest (AW2): bosque lleno, tope por calidad, sombras, colisión y triángulos por vista ----------
  const PRESUPUESTO_TRIS = { bajo: 250e3, medio: 450e3, alto: 1.2e6 }; // MAPA_PLAN_COMPLETO.md § 3, el cuadro entero
  function trisFlora() {
    let t = 0;
    for (const m in grupos) for (const p of grupos[m].prims) {
      const g = p.lejos.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3;
      for (const im of [p.cerca, p.lejos]) if (im && im.visible) t += im.count * n;
    }
    if (IMP.mesh && IMP.mesh.visible) t += IMP.mesh.geometry.instanceCount * 2;
    if (manchas) t += manchas.count * 2;
    if (copasMesh && copasMesh.visible) t += copasMesh.count * (copasMesh.geometry.index.count / 3);
    return t;
  }
  async function test() {
    const P = G.pruebas, { check, result } = P.runner();
    await listo;
    if (!activo) { check('Flora del mapa cargada', !FD, 'sin flora'); return result(); }
    const st = stats(), cam = R.camera, c0 = cam.position.clone(), q0 = cam.quaternion.clone();
    const cal0 = { nivel: C.nivel, manual: !!C.manual }, xo = S.pos.x, zo = S.pos.z;
    const r1 = v => Math.round(v * 10) / 10;
    try {
      // 1. Cuántos árboles y dónde (F1.1)
      // (sin contar la selva del tepuy de BL1, que va aparte y se comprueba abajo)
      const nArb = st.arboles - st.tepuy;
      check('Bosque lleno: entre 6 000 y 8 000 árboles', !usarBosque || (nArb >= 6000 && nArb <= 8000), nArb + ' árboles (' + st.bosque + ' de relleno), ' + total + ' instancias');
      // BL1: la selva del tepuy cae en su elipse, en suelo libre y fuera de la ciudad
      const ST = T.selvaTepuy && T.selvaTepuy.zona;
      if (ST) {
        let fueraT = 0, noLibreT = 0;
        for (let i = 0; i < tepuyPos.length; i += 2) {
          if (!(T.selvaTepuy(tepuyPos[i], tepuyPos[i + 1]) > 0)) fueraT++;
          if (!libre(tepuyPos[i], tepuyPos[i + 1])) noLibreT++;
        }
        check('Selva del tepuy (BL1): más de 800 árboles alrededor de la ciudad, en su elipse y en suelo libre', st.tepuy > 800 && !fueraT && !noLibreT, st.tepuy + ' árboles, ' + fueraT + ' fuera de la elipse, ' + noLibreT + ' en suelo no libre');
        let malC = 0, grandes = 0;
        for (const c of copasCima) {
          if (!(T.selvaTepuy(c.x, c.z) > 0.4) || c.ny < 0.75 || c.y < 74 || c.s > 4.6) malC++;
          if (c.s > 4.6) grandes++;
        }
        check('Copas de la cima (G19): chicas, en la meseta, no en el risco', copasCima.length >= 50 && !malC && !grandes, copasCima.length + ' copas, ' + malC + ' fuera de sitio, ' + grandes + ' de más de 4,6 m');
      }
      const MB = usarBosque && window[BOSQUE.global];
      if (MB) {
        const mb = b64u8(MB.bits);
        let fuera = 0, noLibre = 0;
        for (let i = 0; i < bosquePos.length; i += 2) {
          const x = bosquePos[i], z = bosquePos[i + 1], k = Math.floor((x - MB.x0) / MB.celda) + Math.floor((z - MB.z0) / MB.celda) * MB.nx;
          if (!((mb[k >> 3] >> (k & 7)) & 1)) fuera++;
          if (!libre(x, z)) noLibre++;
        }
        check('El relleno cae en el bosque de Kelvin (trees.psd) y en suelo libre (sin sendas, agua ni edificios)', st.bosque > 0 && !fuera && !noLibre, st.bosque + ' árboles, ' + fuera + ' fuera de la máscara, ' + noLibre + ' en suelo no libre');
      }
      // 2. Por calidad, a pie en el inicio y desde el aire: tope de árboles en malla, sombras a < 30 m, tris de la flora
      const sp = MAPA.spawn || { x: xo, z: zo }, yS = T.height(sp.x, sp.z);
      const vistas = [['a pie', [sp.x, yS + 2.2, sp.z + 6], [sp.x, yS + 1.5, sp.z - 30]], ['aire 250 m', [0, 250, 230], [0, 0, 0]], ['aire 90 m', [sp.x, yS + 90, sp.z + 90], [sp.x, yS, sp.z - 40]]];
      for (const nivel of ['bajo', 'medio', 'alto']) {
        if (R.setCalidad) R.setCalidad(nivel, true);
        for (const [nom, p, mira] of vistas) {
          cam.position.set(p[0], p[1], p[2]); cam.lookAt(mira[0], mira[1], mira[2]); cam.updateMatrixWorld();
          actualizar(true);
          const tr = trisFlora(), s = stats();
          check(nivel + ', ' + nom + ': árboles en malla ≤ ' + s.tope + ' y ≤ ' + (s.topeTris / 1e3) + ' k tris, sombras < ' + SOMBRA_MAX + ' m, flora ≤ ' + (PRESUPUESTO_TRIS[nivel] / 1e3) + ' k tris',
            s.arbolesMalla <= s.tope && s.trisArboles <= s.topeTris && s.dSombra < SOMBRA_MAX && (nivel === 'alto' || !s.sombraR) && tr <= PRESUPUESTO_TRIS[nivel],
            s.arbolesMalla + ' en malla (' + Math.round(s.trisArboles / 1e3) + ' k tris) hasta ' + r1(s.dArbol) + ' m, ' + s.impostores + ' impostores, sombra hasta ' + r1(s.dSombra) + ' m, ' + Math.round(tr / 1e3) + ' k tris de flora');
        }
      }
      // 3. Colisión: solo troncos a menos de 40 m, y todos los de ese radio (F1.5)
      P.teleport(sp.x, sp.z); actualizarColliders(true);
      const lejos = misColliders.filter(c => Math.hypot(c.x - S.pos.x, c.z - S.pos.z) > COL_RAD).length;
      let cerca = 0;
      for (const m of ARBOLES) { const PM = porModelo[m], inf = info[m]; if (!PM || !inf || inf.tronco < 0.08) continue; for (let i = 0; i < PM.n; i++) if (Math.hypot(PM.pos[i * 4] - S.pos.x, PM.pos[i * 4 + 2] - S.pos.z) <= COL_RAD) cerca++; }
      check('Colisión: solo los troncos a menos de ' + COL_RAD + ' m, y todos ellos', !lejos && misColliders.length === cerca, misColliders.length + ' troncos sólidos de ' + cerca + ' a < ' + COL_RAD + ' m, ' + lejos + ' más lejos; ' + st.arboles + ' árboles en total');
    } finally {
      if (R.setCalidad) { R.setCalidad(cal0.nivel); C.manual = cal0.manual; }
      cam.position.copy(c0); cam.quaternion.copy(q0); cam.updateMatrixWorld();
      P.teleport(xo, zo); actualizarColliders(true); actualizar(true);
    }
    return result();
  }
  return { listo, stats, test, libre, get instancias() { return porModelo; }, get atlas() { return IMP.rt; }, info, rafaga: RAFAGA, fundido: FUNDIDO, fundir: actualizarFundido, actualizar: () => { actualizar(true); actualizarPasto(true); actualizarColliders(true); } };
});
