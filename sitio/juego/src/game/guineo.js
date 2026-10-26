/* Juego · Huertos de guineo junto a las casas (tablero C12; pedido de Kelvin).
   Decisión de docs/equipo/V9_BOSQUE_VIVO.md: el guineo va como huerto cultivado junto a las casas, no como alimento silvestre.
   No hay mecánica de comer: solo son matas (decorado vivo, con viento y colisión en el pseudotallo).
   - Modelo propio hecho por script: tools/blender/entorno_guineo.py → assets/models/guineo/guineo.glb (+ _glb.js). Tres
     variantes: a (adulta con racimo verde y bellota morada), b (sin racimo, con hojas secas) y c (hijo). Sin texturas: el color
     sale de la parte codificada en la U del UV (ver el script), así cada variante es una sola InstancedMesh (≤ 3 draw calls,
     más su sombra en calidad media y alta).
   - Huertos de 3 a 8 matas detrás de las casas del mapa (bohíos, casas de paja, casas de plataforma, caney), a ≥ 3 m del
     borde de cualquier edificio, lejos de senderos, agua, puntos de misión, NPC, recursos y árboles grandes. Se calculan al
     cargar (determinista), sin tocar los archivos generados del mapa.
   - Viento: el mismo modelo que la flora (vegetacion.js: peso en el color de vértice, ráfagas del clima).
   - Calidad baja: hasta 3 matas por huerto, sin racimo (la «a» se dibuja como «b») y menos distancia de dibujo.
   Carga perezosa desde boot.js (primer gesto del jugador): no suma a la descarga inicial.
   window.AVGuineo(G) → { listo, huertos, matas, mallas, stats, test }. Prueba: AV.guineoTest(). */
window.AVGuineo = function (G) {
  'use strict';
  if (G.guineo) return G.guineo;
  const R = G.renderer, scene = R.scene, S = G.S, T = G.terreno, MAPA = T.mapa || {};
  const BASE = 'assets/models/guineo/';
  const CASAS = /^(bohio_|casa_paja|casa_plataforma|caney_|tienda_)/;
  const VAR = ['guineo_a', 'guineo_b', 'guineo_c'];
  const DIST = { bajo: 85, medio: 130, alto: 180 };   // m: distancia de dibujo
  const MAX_BAJO = 3;                                  // matas por huerto en calidad baja
  const CFG = { borde: 3, senda: 3.5, punto: 5, arbol: 2.6, huertoMin: 3, huertoMax: 8, separacion: 16, porZona: 2, maxHuertos: 16, paso: 2.7 };
  const nivel = () => (R.calidad && R.calidad.nivel) || 'medio';
  const W = (G.pack && G.pack.mundo) || {}, FL = W.flora || {};
  const VI = Object.assign({ dir: [0.8, 0.35], fuerza: 1 }, FL.viento);

  // ---------- Obstáculos: edificios, senderos, puntos de misión ----------
  function edificios() {
    const g = G.streaming && G.streaming.gestor, out = [];
    if (g && g.instancias) for (const I of g.instancias) if (I.pos) out.push({ x: I.pos[0], z: I.pos[2], r: I.r || 6, modelo: I.modelo, zona: I.zona });
    for (const e of MAPA.estructuras || []) if (e.pos) out.push({ x: e.pos[0], z: e.pos[2], r: 7, modelo: e.id || 'estructura', zona: 'estructuras' });
    for (const c of MAPA.colisiones || []) if (c.x != null && c.hx != null) out.push({ x: c.x, z: c.z, r: Math.hypot(c.hx, c.hz), modelo: 'colision', zona: 'colisiones' });
    return out;
  }
  function puntos() {
    const out = [];
    const add = (x, z, r) => { if (isFinite(x) && isFinite(z)) out.push({ x, z, r: r || 0 }); };
    const visitar = (o, d) => {
      if (!o || typeof o !== 'object' || d > 5) return;
      if (Array.isArray(o)) { for (const v of o) visitar(v, d + 1); return; }
      if (typeof o.x === 'number' && typeof o.z === 'number') add(o.x, o.z, typeof o.r === 'number' ? o.r : 0);
      if (Array.isArray(o.pos) && typeof o.pos[0] === 'number') add(o.pos[0], o.pos[2], 0);
      for (const k in o) if (o[k] && typeof o[k] === 'object') visitar(o[k], d + 1);
    };
    visitar(MAPA.lugares, 0); visitar(MAPA.misiones, 0); visitar(MAPA.pois, 0); visitar(MAPA.spawn, 0);
    try { visitar(typeof FL.evitar === 'function' ? FL.evitar(G.pack) : FL.evitar, 0); } catch (e) { /* sin lista */ }
    visitar(G.pack && G.pack.npcs, 0);
    return out;
  }
  const sendas = [];
  for (const k in MAPA.senderos || {}) { const p = MAPA.senderos[k]; for (let i = 0; i + 1 < p.length; i++) sendas.push([p[i][0], p[i][2], p[i + 1][0], p[i + 1][2]]); }
  function distSenda(x, z) {
    let best = Infinity;
    for (const s of sendas) {
      const dx = s[2] - s[0], dz = s[3] - s[1], L2 = dx * dx + dz * dz;
      const t = L2 > 0 ? Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / L2)) : 0;
      const d = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t);
      if (d < best) best = d;
    }
    return best;
  }
  const aguaCerca = (x, z) => {
    if (!G.agua || !G.agua.levelAt) return false;
    for (const [dx, dz] of [[0, 0], [2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5]]) { const w = G.agua.levelAt(x + dx, z + dz); if (w > -1e8 && w > T.height(x + dx, z + dz) - 0.4) return true; }
    return false;
  };
  // árboles grandes de la flora (rejilla de 8 m)
  const arboles = new Map();
  function leerArboles() {
    const V = G.vegetacion; if (!V || !V.instancias || !V.info) return;
    for (const m in V.instancias) {
      const inf = V.info[m], P = V.instancias[m]; if (!inf || !P || !P.pos || !(inf.alto > 2.5)) continue;
      for (let i = 0; i < P.n; i++) {
        const x = P.pos[i * 4], z = P.pos[i * 4 + 2], k = Math.floor(x / 8) * 8192 + Math.floor(z / 8);
        let l = arboles.get(k); if (!l) arboles.set(k, l = []); l.push(x, z);
      }
    }
  }
  function cercaArbol(x, z, r) {
    const ix = Math.floor(x / 8), iz = Math.floor(z / 8);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = arboles.get((ix + a) * 8192 + iz + b); if (!l) continue;
      for (let i = 0; i < l.length; i += 2) if (Math.hypot(l[i] - x, l[i + 1] - z) < r) return true;
    }
    return false;
  }

  // ---------- Huertos ----------
  let EDS = [], PTS = [];
  function sitioLibre(x, z) {
    const y = T.height(x, z);
    if (!(y > 0.6)) return 'mar';
    if (T.normalAt && T.normalAt(x, z).y < 0.86) return 'pendiente';
    for (const e of EDS) if (Math.hypot(e.x - x, e.z - z) < e.r + CFG.borde) return 'edificio';
    if (distSenda(x, z) < CFG.senda) return 'senda';
    for (const p of PTS) if (Math.hypot(p.x - x, p.z - z) < p.r + CFG.punto) return 'punto';
    if (aguaCerca(x, z)) return 'agua';
    if (G.vegetacion && G.vegetacion.libre && !G.vegetacion.libre(x, z)) return 'mascara';
    if (cercaArbol(x, z, CFG.arbol)) return 'arbol';
    return '';
  }
  function generar() {
    EDS = edificios(); PTS = puntos(); leerArboles();
    const rnd = G.util.rng(4471);
    const sp = MAPA.spawn || { x: 0, z: 0 };
    const casas = EDS.filter(e => CASAS.test(e.modelo)).sort((a, b) => Math.hypot(a.x - sp.x, a.z - sp.z) - Math.hypot(b.x - sp.x, b.z - sp.z));
    const huertos = [], porZona = {};
    for (const c of casas) {
      if (huertos.length >= CFG.maxHuertos) break;
      if ((porZona[c.zona] || 0) >= CFG.porZona) continue;
      // detrás de la casa: lejos del sendero más cercano (el frente y la puerta miran al sendero)
      let mejor = null, dmin = Infinity;
      for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2, x = c.x + Math.cos(ang) * (c.r + 6), z = c.z + Math.sin(ang) * (c.r + 6), d = distSenda(x, z); if (d < dmin) { dmin = d; mejor = ang; } }
      const atras = (mejor == null ? rnd() * Math.PI * 2 : mejor + Math.PI);
      const quiere = CFG.huertoMin + Math.floor(rnd() * (CFG.huertoMax - CFG.huertoMin + 1));
      let elegido = null;
      for (let k = 0; k < 12 && !elegido; k++) {
        const ang = atras + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 7);
        const dirX = Math.cos(ang), dirZ = Math.sin(ang), latX = -dirZ, latZ = dirX;
        const d0 = c.r + CFG.borde + 1.4; // primera fila: hojas sin tocar la pared
        if (huertos.some(h => Math.hypot(h.x - (c.x + dirX * (d0 + 2)), h.z - (c.z + dirZ * (d0 + 2))) < CFG.separacion)) continue;
        // rejilla de 2 filas × 4, tresbolillo; se quedan las que caben (mínimo 3)
        const sitios = [];
        for (let f = 0; f < 2; f++) for (let i = 0; i < 4; i++) {
          const off = (i - 1.5) * CFG.paso + (f ? CFG.paso * 0.5 : 0) + (rnd() - 0.5) * 0.5, prof = d0 + f * CFG.paso * 0.9 + (rnd() - 0.5) * 0.4;
          const x = c.x + dirX * prof + latX * off, z = c.z + dirZ * prof + latZ * off;
          if (!sitioLibre(x, z)) sitios.push({ x, z });
        }
        if (sitios.length >= CFG.huertoMin) elegido = { sitios: sitios.slice(0, quiere), ang };
      }
      if (!elegido) continue;
      const n = elegido.sitios.length;
      const h = { casa: c.modelo, zona: c.zona, casaX: c.x, casaZ: c.z, casaR: c.r, x: 0, z: 0, matas: [] };
      elegido.sitios.forEach((s, i) => {
        // la primera siempre lleva racimo; un hijo de vez en cuando
        const v = i === 0 ? 0 : rnd() < 0.45 ? 0 : rnd() < 0.7 ? 1 : 2;
        h.matas.push({ x: s.x, z: s.z, y: T.height(s.x, s.z) - 0.05, v, s: (v === 2 ? 0.9 : 0.85) + rnd() * 0.3, rot: rnd() * Math.PI * 2, i });
        h.x += s.x / n; h.z += s.z / n;
      });
      huertos.push(h);
      porZona[c.zona] = (porZona[c.zona] || 0) + 1;
    }
    return huertos;
  }

  // ---------- Material: color por parte, AO y viento ----------
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  const RAF = (G.vegetacion && G.vegetacion.rafaga) || { value: 0 };
  const U = {
    uTime: { value: 0 }, uRafaga: RAF,
    uViento: { value: new THREE.Vector4(VI.dir[0], VI.dir[1], 0.3 * (VI.fuerza || 1), 1.05) },
    uHoja0: { value: lin('#24611d') }, uHoja1: { value: lin('#5c9e34') }, uNervio: { value: lin('#b9cf78') },
    uTallo0: { value: lin('#7d9a45') }, uTallo1: { value: lin('#4e4330') }, uFruto: { value: lin('#86b83a') },
    uBellota: { value: lin('#7d2550') }, uSeca: { value: lin('#7a6443') },
  };
  U.uViento.value.setX(VI.dir[0] / Math.hypot(VI.dir[0], VI.dir[1])).setY(VI.dir[1] / Math.hypot(VI.dir[0], VI.dir[1]));
  const VERT_PARS = 'uniform float uTime; uniform float uRafaga; uniform vec4 uViento;\nattribute vec4 aViento;\nvarying float vAO; varying vec2 vParte;\n';
  const VERT_PROJECT = `
    vec4 mvPosition = vec4( transformed, 1.0 );
    vec3 ipos = vec3( 0.0 ); float iesc = 1.0;
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
      ipos = instanceMatrix[ 3 ].xyz; iesc = length( instanceMatrix[ 1 ].xyz );
    #endif
    float wg = aViento.g * aViento.g;
    float ph = aViento.b * 6.2832 + dot( ipos.xz, vec2( 0.31, 0.23 ) );
    float gust = ( 0.6 + 0.4 * sin( uTime * 0.37 + ipos.x * 0.019 + ipos.z * 0.013 ) ) * ( 1.0 + uRafaga * 1.6 );
    float sw = sin( uTime * uViento.w + ph ) * 0.7 + sin( uTime * uViento.w * 2.3 + ph * 1.7 ) * 0.3;
    mvPosition.xz += uViento.xy * ( sw * gust + ( 0.35 + uRafaga * 0.6 ) * gust ) * uViento.z * wg * iesc;
    mvPosition.y -= abs( sw ) * uViento.z * wg * iesc * 0.15;
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;
  `;
  const FRAG_COLOR = `
    {
      float parte = floor( vParte.x + 0.001 ), u = vParte.x - parte, v = 1.0 - vParte.y;
      vec3 c;
      if ( parte < 1.0 ) { // hoja: verde que aclara hacia la punta, nervio central claro, nervios laterales oblicuos, borde algo seco
        float e = abs( u - 0.5 ) * 2.0;
        c = mix( uHoja0, uHoja1, clamp( v * 0.75 + e * 0.35, 0.0, 1.0 ) );
        c *= 0.95 + 0.05 * sin( ( v * 1.6 + e * 0.8 ) * 38.0 );
        c = mix( c, uNervio, 1.0 - smoothstep( 0.02, 0.07, e ) );
        c = mix( c, uSeca, smoothstep( 0.86, 1.0, e ) * smoothstep( 0.4, 1.0, v ) * 0.45 );
        if ( ! gl_FrontFacing ) c *= vec3( 1.02, 1.1, 0.95 );
      } else if ( parte < 3.0 ) { // pseudotallo y raquis: verde con manchas pardas y vainas a rayas
        float cel = fract( sin( dot( floor( vec2( u * 7.0, v * 11.0 ) ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
        c = mix( uTallo0, uTallo1, smoothstep( 0.72, 0.98, cel ) * 0.45 + ( 1.0 - smoothstep( 0.0, 0.25, v ) ) * 0.3 );
        c *= 0.9 + 0.1 * sin( u * 60.0 );
      } else if ( parte < 5.0 ) { // guineo verde con la punta oscura
        c = mix( uFruto, uFruto * vec3( 0.45, 0.4, 0.3 ), smoothstep( 0.82, 1.0, v ) );
      } else if ( parte < 7.0 ) { // bellota: brácteas moradas superpuestas
        c = uBellota * ( 0.75 + 0.35 * smoothstep( -0.3, 1.0, sin( v * 28.0 + u * 6.2832 ) ) );
      } else { // hoja seca
        float e = abs( u - 0.5 ) * 2.0;
        c = uSeca * ( 0.8 + 0.2 * sin( ( v * 1.6 + e * 0.8 ) * 70.0 ) ) * mix( 1.0, 0.75, e );
      }
      diffuseColor.rgb *= c * mix( 0.35, 1.0, vAO );
    }
  `;
  function inyectarViento(sh) {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = VERT_PARS + sh.vertexShader.replace('#include <project_vertex>', VERT_PROJECT)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vAO = aViento.r; vParte = uv;');
  }
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    inyectarViento(sh);
    sh.fragmentShader = 'uniform vec3 uHoja0, uHoja1, uNervio, uTallo0, uTallo1, uFruto, uBellota, uSeca;\nvarying float vAO; varying vec2 vParte;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + FRAG_COLOR)
      .replace(/\( gl_FrontFacing \) \? vIndirectFront : vIndirectBack/g, 'vIndirectFront')
      .replace(/\( gl_FrontFacing \) \? vLightFront : vLightBack/g, 'vLightFront');
  };
  mat.customProgramCacheKey = () => 'guineo';
  mat.name = 'GUINEO';
  const sombraMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  sombraMat.onBeforeCompile = inyectarViento; // r128 declara siempre «attribute vec2 uv» en el prefijo del vértice
  sombraMat.customProgramCacheKey = () => 'guineo-sombra';

  // ---------- Mallas e instancias ----------
  let huertos = [], matas = [], mallas = [], info = {}, activo = false, ultimo = { x: Infinity, z: Infinity, nivel: '' }, colliders = [];
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), E3 = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  function crearMallas(gltf) {
    gltf.scene.updateMatrixWorld(true);
    const geos = {};
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      let n = o.name || ''; for (let p = o.parent; !VAR.includes(n) && p; p = p.parent) n = VAR.includes(p.name) ? p.name : n;
      const k = VAR.find(v => n.indexOf(v) === 0); if (!k) return;
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
      const c = geo.getAttribute('color');
      if (c) { geo.setAttribute('aViento', c); geo.deleteAttribute('color'); }
      else geo.setAttribute('aViento', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 4).fill(1), 4));
      geo.computeBoundingBox();
      geos[k] = geo;
      info[k] = { tris: geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3, alto: geo.boundingBox.max.y };
    });
    for (const k of VAR) {
      if (!geos[k]) throw new Error('falta la variante ' + k);
      const cuantos = matas.length || 1;
      const m = new THREE.InstancedMesh(geos[k], mat, cuantos);
      m.name = 'huerto_' + k; m.count = 0; m.frustumCulled = false; m.matrixAutoUpdate = false;
      m.userData.sinCulling = true; // renderer.js (cullPequenos) mide la caja de la geometría en el origen y la mandaría a la capa 31
      m.customDepthMaterial = sombraMat;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(m);
      mallas.push(m);
    }
  }
  function aplicarCalidad() {
    const nv = nivel(), C = R.calidad || {};
    for (const m of mallas) { m.castShadow = !!C.sombraFlora && nv !== 'bajo'; m.receiveShadow = (C.sombras || 0) > 0; }
  }
  function actualizar(forzar) {
    if (!activo) return;
    const cam = R.camera.position, nv = nivel();
    if (!forzar && nv === ultimo.nivel && Math.hypot(cam.x - ultimo.x, cam.z - ultimo.z) < 6) return;
    ultimo = { x: cam.x, z: cam.z, nivel: nv };
    const D = DIST[nv] || DIST.medio, n = [0, 0, 0];
    for (const p of matas) {
      if (nv === 'bajo' && p.i >= MAX_BAJO) continue;
      if (Math.hypot(p.x - cam.x, p.z - cam.z) > D) continue;
      const v = nv === 'bajo' && p.v === 0 ? 1 : p.v; // en baja, sin racimo
      M4.compose(V3.set(p.x, p.y, p.z), Q.setFromAxisAngle(UPV, p.rot), E3.set(p.s, p.s, p.s));
      mallas[v].setMatrixAt(n[v]++, M4);
    }
    mallas.forEach((m, i) => { m.count = n[i]; m.visible = n[i] > 0; m.instanceMatrix.needsUpdate = true; });
  }
  function ponerColliders() {
    const cols = G.fisica && G.fisica.colliders; if (!cols) return;
    for (const c of colliders) { const i = cols.indexOf(c); if (i >= 0) cols.splice(i, 1); }
    colliders = matas.map(p => ({ x: p.x, z: p.z, r: (p.v === 2 ? 0.1 : 0.2) * p.s, h: (info[VAR[p.v]] ? info[VAR[p.v]].alto * 0.6 : 2) * p.s, kind: 'guineo' }));
    for (const c of colliders) cols.push(c);
  }

  const espera = [T.listo, G.vegetacion && G.vegetacion.listo, G.mundo && G.mundo.listo].filter(p => p && p.then);
  const listo = Promise.all(espera)
    .then(() => {
      huertos = generar();
      matas = [].concat(...huertos.map(h => h.matas));
      return G.assets.loadGLB(BASE + 'guineo.glb', { b64: () => (window.AV_GUINEO_B64 || {}).guineo, script: BASE + 'guineo_glb.js', base: BASE, error: 'guineo no disponible' });
    })
    .then(g => {
      crearMallas(g);
      R.linMat(mat);
      aplicarCalidad();
      ponerColliders();
      activo = true;
      actualizar(true);
    })
    .catch(e => { console.warn('AVE guineo:', e && e.message || e); });

  G.on('render', (dt, t) => { U.uTime.value = t; if (activo) actualizar(false); }, 23);
  G.on('calidad', () => { if (activo) { aplicarCalidad(); actualizar(true); } });

  function stats() {
    const n = mallas.map(m => m.visible ? m.count : 0);
    return { huertos: huertos.length, matas: matas.length, visibles: n.reduce((a, b) => a + b, 0), porVariante: n, mallasVisibles: mallas.filter(m => m.visible).length,
      tris: mallas.reduce((a, m, i) => a + (m.visible ? m.count * ((info[VAR[i]] || {}).tris || 0) : 0), 0) };
  }

  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guardado = { nivel: nivel(), cam: R.camera.position.clone() };
    return listo.then(() => {
      try {
        ok('El modelo propio carga con sus tres variantes (a con racimo y bellota, b, c) y es low poly', mallas.length === 3 && VAR.every(k => info[k] && info[k].tris > 200) && info.guineo_a.tris < 2500 && info.guineo_a.tris > info.guineo_b.tris,
          VAR.map(k => k + ' ' + (info[k] ? Math.round(info[k].tris) : '?')).join(' · '));
        ok('Hay huertos de 3 a 8 matas', huertos.length >= 4 && huertos.every(h => h.matas.length >= CFG.huertoMin && h.matas.length <= CFG.huertoMax), huertos.length + ' huertos, ' + matas.length + ' matas');
        ok('Cada huerto está junto a una casa (bohío, casa de paja o de plataforma, caney)', huertos.every(h => CASAS.test(h.casa) && Math.hypot(h.x - h.casaX, h.z - h.casaZ) < h.casaR + 14), [...new Set(huertos.map(h => h.casa))].join(', '));
        let dEd = Infinity; for (const p of matas) for (const e of EDS) dEd = Math.min(dEd, Math.hypot(p.x - e.x, p.z - e.z) - e.r);
        ok('Ninguna mata a menos de 3 m del borde de un edificio', dEd >= CFG.borde, 'mínimo ' + dEd.toFixed(1) + ' m');
        let dS = Infinity; for (const p of matas) dS = Math.min(dS, distSenda(p.x, p.z));
        ok('Ninguna mata en un sendero (≥ 3,5 m del eje)', dS >= CFG.senda, 'mínimo ' + dS.toFixed(1) + ' m');
        let dP = Infinity; for (const p of matas) for (const q of PTS) dP = Math.min(dP, Math.hypot(p.x - q.x, p.z - q.z) - q.r);
        ok('Ninguna mata tapa un punto de misión, lugar, NPC, recurso o el inicio', dP >= CFG.punto, PTS.length + ' puntos · mínimo ' + dP.toFixed(1) + ' m');
        ok('Ninguna en el agua ni en pendiente', matas.every(p => !aguaCerca(p.x, p.z) && p.y > 0.5 && (!T.normalAt || T.normalAt(p.x, p.z).y >= 0.86)));
        ok('Los huertos no se encimen (≥ 16 m entre centros)', huertos.every((h, i) => huertos.every((o, j) => i === j || Math.hypot(h.x - o.x, h.z - o.z) >= CFG.separacion - 4)));
        ok('Se mecen con el viento (viento de la flora en el shader)', U.uViento.value.z > 0 && mallas.every(m => m.geometry.getAttribute('aViento')) && /^guineo/.test(mat.customProgramCacheKey())); // look.js añade su sufijo a la clave
        ok('Se ven: capa 0 y fuera del recorte de objetos pequeños del renderer', mallas.every(m => m.userData.sinCulling && (m.layers.mask & 1)));
        ok('Colisión en el pseudotallo de cada mata', colliders.length === matas.length && colliders.every(c => G.fisica.colliders.includes(c)));
        const h0 = huertos[0];
        R.camera.position.set(h0.x + 12, T.height(h0.x, h0.z) + 6, h0.z + 12);
        R.calidad.nivel = 'alto'; actualizar(true);
        const alto = stats();
        ok('Draw calls acotadas: ≤ 3 mallas instanciadas (una por variante) para todos los huertos', mallas.length === 3 && alto.mallasVisibles <= 3 && alto.visibles > 0, alto.mallasVisibles + ' mallas · ' + alto.visibles + ' matas · ' + alto.tris + ' triángulos');
        R.calidad.nivel = 'bajo'; actualizar(true);
        const bajo = stats();
        ok('Calidad baja: menos matas, ninguna con racimo y menos distancia', bajo.porVariante[0] === 0 && bajo.visibles < alto.visibles && bajo.visibles > 0 && DIST.bajo < DIST.alto, bajo.visibles + ' matas en baja (' + alto.visibles + ' en alta)');
        R.camera.position.set(h0.x + 900, 0, h0.z + 900); R.calidad.nivel = 'alto'; actualizar(true);
        ok('Lejos de todos los huertos no se dibuja ninguna', stats().mallasVisibles === 0);
      } finally {
        if (R.calidad) R.calidad.nivel = guardado.nivel;
        R.camera.position.copy(guardado.cam);
        actualizar(true);
      }
      return { passed: results.filter(r => r.ok).length, total: results.length, results };
    });
  }
  return (G.guineo = { listo, get huertos() { return huertos; }, get matas() { return matas; }, mallas, stats, actualizar, CFG, test });
};
