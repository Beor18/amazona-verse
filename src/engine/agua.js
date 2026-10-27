/* AVE · agua
   - Nivel: levelAt(x, z) = superficie del agua en ese punto (río, quebrada, pozas, mar o la crecida) o -Infinity.
     La z es opcional (si falta, la del jugador: así fisica.js sigue con levelAt(x)). S.water es el nivel del río junto a
     Villa Raíz en la partida (waterBase) y sube con la crecida (setLevel).
   - Mar: plano grande con oleaje suave en el vértice, color por profundidad (turquesa en la laguna, azul hondo afuera),
     reflejo del cielo con Fresnel, brillo del sol y espuma en la orilla, todo desde la altura del terreno en una textura.
     En el minijuego de la tormenta (tormenta(true)) ese corte no se dibuja: color, oleaje y claridad pasan a un solo
     cuerpo, con un ruido ancho, y la boca del río a nivel del mar deja de ser un segundo plano.
   - Río, quebrada y pozas (modo mapa): la cinta agua.glb del mapa con flujo (normales que avanzan por la v de la cinta,
     más rápido donde corre), espuma en las orillas, en los saltos y al pie de las cascadas; las cascadas caen con vetas.
   - Cascadas: rocío y neblina como partículas en la GPU (una sola llamada de dibujo para todas).
   - Efectos de juego: ripple, splash y spray (anillos y gotas de G.fx).
   Datos: modo mapa = mapa.agua { mar, rio, quebrada, pozas, cascadas, crecida } y mapa.terreno.agua (malla);
   modo plantilla = mundo.agua { x, ancho, nivel, color, textura } (franja de río) y mundo.oceano { color, y }. */
AVE.module('agua', function (G) {
  'use strict';
  const S = G.S, W = G.pack.mundo || {}, WA = W.agua, R = G.renderer, scene = R.scene;
  const T = G.terreno, MAPA = T.mapa, D = MAPA && MAPA.agua;
  const WORLD = T.WORLD, base = T.waterBase;
  const C = R.calidad;
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  const tNormal = G.assets.tex((WA && WA.textura) || 'assets/tex/agua_normal.jpg');

  // ---------- Nivel del agua ----------
  // Rejilla de 16 m con los tramos de río y quebrada que la tocan (cada consulta prueba pocos tramos)
  const segGrid = { cell: 16, map: new Map() };
  const segs = [];
  if (D) {
    for (const P of [D.rio && D.rio.puntos, D.quebrada && D.quebrada.puntos]) {
      if (!P) continue;
      for (let i = 0; i < P.length - 1; i++) {
        const p = P[i], q = P[i + 1], s = { p, q, k: segs.length };
        segs.push(s);
        const pad = Math.max(p[3], q[3]) + 1;
        const x0 = Math.floor((Math.min(p[0], q[0]) - pad) / 16), x1 = Math.floor((Math.max(p[0], q[0]) + pad) / 16);
        const z0 = Math.floor((Math.min(p[1], q[1]) - pad) / 16), z1 = Math.floor((Math.max(p[1], q[1]) + pad) / 16);
        for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) {
          const key = a * 4096 + b; let l = segGrid.map.get(key); if (!l) segGrid.map.set(key, l = []); l.push(s);
        }
      }
    }
  }
  const crecida = D && D.crecida && D.crecida.zona;
  const seaLevel = D && D.mar && D.mar.nivel != null ? D.mar.nivel : 0;
  function mapLevel(x, z) {
    let best = -Infinity;
    for (const p of D.pozas || []) if (Math.hypot(x - p.x, z - p.z) < p.r && p.nivel > best) best = p.nivel;
    const l = segGrid.map.get(Math.floor(x / 16) * 4096 + Math.floor(z / 16));
    if (l) for (const s of l) {
      const p = s.p, q = s.q, dx = q[0] - p[0], dz = q[1] - p[1], L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / L2));
      const d = Math.hypot(x - p[0] - t * dx, z - p[1] - t * dz);
      if (d < p[3] + t * (q[3] - p[3])) { const lv = t < 0.5 ? p[2] : q[2]; if (lv > best) best = lv; }
    }
    if (crecida && S.water > base + 0.01 && Math.hypot(x - crecida.x, z - crecida.z) < crecida.r && S.water > best) best = S.water;
    if (best === -Infinity && T.height(x, z) < seaLevel) return seaLevel;
    return best;
  }
  let strip = null, half = 0;
  function levelAt(x, z) {
    if (z == null) z = S.pos.z;
    if (MAPA) return mapLevel(x, z);
    return strip && Math.abs(x - strip.position.x) < half ? S.water : -Infinity;
  }

  // ---------- Altura del terreno como textura (profundidad del agua en el shader) ----------
  // WebGL2: media precisión en metros (R16F, filtrable). WebGL1: 8 bits normalizados (0,5 m de paso).
  let hTex = null; const hInfo = new THREE.Vector4(0, 0, 1, 1), hDec = new THREE.Vector2(1, 0);
  if (MAPA && T.hmHeight) {
    const A = window.AV_MAPA_CAP1_ALTURA || null;
    const nx = A ? A.nx : 265, nz = A ? A.nz : 265, x0 = A ? A.x0 : MAPA.tamano.x0, z0 = A ? A.z0 : MAPA.tamano.z0, paso = A ? A.paso : 2;
    const hmin = MAPA.tamano.altMin, hmax = MAPA.tamano.altMax;
    const toHalf = (() => { const f = new Float32Array(1), i = new Int32Array(f.buffer); return v => {
      f[0] = v; const x = i[0], s = (x >> 16) & 0x8000, e = ((x >> 23) & 0xff) - 112, m = x & 0x7fffff;
      if (e <= 0) return s; if (e > 30) return s | 0x7c00; return s | (e << 10) | (m >> 13); }; })();
    if (R.renderer.capabilities.isWebGL2) {
      const data = new Uint16Array(nx * nz);
      for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) data[k * nx + i] = toHalf(T.hmHeight(x0 + i * paso, z0 + k * paso));
      hTex = new THREE.DataTexture(data, nx, nz, THREE.RedFormat, THREE.HalfFloatType);
    } else {
      const data = new Uint8Array(nx * nz * 4);
      for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) data[(k * nx + i) * 4] = Math.round((T.hmHeight(x0 + i * paso, z0 + k * paso) - hmin) / (hmax - hmin) * 255);
      hTex = new THREE.DataTexture(data, nx, nz, THREE.RGBAFormat);
      hDec.set(hmax - hmin, hmin);
    }
    hTex.magFilter = hTex.minFilter = THREE.LinearFilter; hTex.wrapS = hTex.wrapT = THREE.ClampToEdgeWrapping; hTex.needsUpdate = true;
    // uv = (xz - origen) / tamaño, con medio texel de margen
    hInfo.set(x0 - paso / 2, z0 - paso / 2, nx * paso, nz * paso);
  }

  // ---------- Uniformes compartidos ----------
  const sunCol = R.sun.color.clone().multiplyScalar(R.sun.intensity);
  const U = {
    uTime: { value: 0 }, tNormal: { value: tNormal }, tAltura: { value: hTex }, uHInfo: { value: hInfo }, uHDec: { value: hDec },
    uSolDir: { value: R.sunDir }, uSolCol: { value: sunCol },
    uCielo: { value: lin((W.cielo && W.cielo.cenit) || '#3d8fd6') }, uHorizonte: { value: lin((W.cielo && W.cielo.color) || '#bfe1d6') },
    uHemiSuelo: { value: R.hemi.groundColor.clone() }, uHemiCielo: { value: R.hemi.color.clone().multiplyScalar(R.hemi.intensity) },
    uEstilo: { value: C.agua > 0 ? 1 : 0 }, // 26-C: espuma en bandas de borde duro y destellos del sol (medio y alto)
    uTormenta: { value: 0 }, // 1 mientras se juega «¡Escapa de la tormenta!»: un solo cuerpo de agua
  };
  const COMMON_FRAG = `
    uniform float uTime, uTormenta; uniform sampler2D tNormal, tAltura; uniform vec4 uHInfo; uniform vec2 uHDec;
    uniform vec3 uSolDir, uSolCol, uCielo, uHorizonte, uHemiSuelo, uHemiCielo; uniform float uEstilo;
    float alturaTerreno(vec2 xz) {
      #ifdef HAY_ALTURA
        vec2 uv = (xz - uHInfo.xy) / uHInfo.zw;
        if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -30.0;
        return texture2D(tAltura, uv).r * uHDec.x + uHDec.y;
      #else
        return -30.0;
      #endif
    }
    float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + 1.0), f.x), f.y); }
    vec3 skyRefl(vec3 r) { float h = clamp(r.y, 0.0, 1.0); return mix(uHorizonte, uCielo, pow(h, 0.5)); }
    vec3 saturar(vec3 c, float s) { return max(mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, s), 0.0); }
    // destellos del sol: el lóbulo ancho pow(60) solo donde el ruido deja puntos sueltos que titilan
    float destello(vec3 N, vec3 H, vec2 xz) {
      return pow(max(dot(N, H), 0.0), 60.0) * smoothstep(0.74, 0.9, vnoise(xz * 3.1 + N.xz * 9.0 + uTime * 0.7)) * uEstilo;
    }
  `;
  function waterMaterial(vert, frag, extra, defines) {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, extra || {}]),
      vertexShader: vert, fragmentShader: frag, fog: true, transparent: true, depthWrite: true, defines: defines || {},
    });
    // las texturas y vectores compartidos se pasan por referencia (merge los clona)
    for (const k in U) m.uniforms[k] = U[k];
    return m;
  }

  // ---------- Mar ----------
  const MAR_VERT = `
    uniform float uTime, uTormenta; varying vec3 vW; varying float vOla;
    #include <fog_pars_vertex>
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      float d = length(w.xz - cameraPosition.xz);
      float amp = 1.0 - smoothstep(60.0, 260.0, d);
      float o1 = sin(dot(w.xz, vec2(0.071, 0.043)) + uTime * 0.85);
      float o2 = sin(dot(w.xz, vec2(-0.052, 0.094)) + uTime * 1.27 + 1.3);
      float o3 = sin(dot(w.xz, vec2(0.19, -0.13)) + uTime * 2.1);
      vOla = o1 * 0.5 + o2 * 0.35 + o3 * 0.15;
      // La tormenta sube el oleaje en una onda larga: cambia de forma continua, sin un escalón.
      float mar = sin(dot(w.xz, vec2(0.02, 0.013)) + uTime * 0.45) * 0.5 + 0.5;
      float kOla = 1.0 + uTormenta * (0.18 + 0.32 * mar);
      w.y += (o1 * 0.07 + o2 * 0.05 + o3 * 0.02) * amp * kOla;
      vW = w.xyz;
      vec4 mvPosition = viewMatrix * w;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const MAR_FRAG = COMMON_FRAG + `
    uniform vec3 uSomero, uHondo, uLaguna;
    varying vec3 vW; varying float vOla;
    #include <fog_pars_fragment>
    void main() {
      vec2 xz = vW.xz;
      float hT = alturaTerreno(xz);
      float profReal = vW.y - hT;
      if (profReal < -0.05) discard;
      // Fuera de la tormenta, prof es la profundidad real (laguna turquesa, azul hondo).
      // En la tormenta, la caída del arrecife y el borde del mapa (altura -30 m de golpe) no pueden
      // leerse como dos planos: el color sale de un ruido de decenas de metros, no de ese escalón.
      float nA = vnoise(xz * 0.009) * 0.65 + vnoise(xz * 0.021 + vec2(8.0, 3.0)) * 0.35;
      float nB = vnoise(xz * 0.015 + vec2(2.0, 19.0)) * 0.6 + vnoise(xz * 0.037 + 5.0) * 0.4;
      // Familia del azul de tormenta (no vuelve a la laguna turquesa ni al vacío de -30 m
      // fuera del mapa). El ruido es ancho: el color no sigue el escalón del arrecife.
      float profMar = mix(4.3, 5.8, clamp(nA * 0.7 + nB * 0.3, 0.0, 1.0));
      float prof = mix(profReal, profMar, uTormenta);
      vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
      vec2 uv1 = xz * 0.045 + vec2(uTime * 0.012, uTime * 0.007), uv2 = xz * 0.083 + vec2(-uTime * 0.009, uTime * 0.015);
      vec3 n1 = texture2D(tNormal, uv1).xzy * 2.0 - 1.0, n2 = texture2D(tNormal, uv2).xzy * 2.0 - 1.0;
      float lejos = smoothstep(20.0, 260.0, dist);
      // tercera muestra muy grande y lenta: rompe la repetición de las otras dos a lo lejos
      vec3 n3 = texture2D(tNormal, xz * 0.0071 + vec2(uTime * 0.002, -uTime * 0.0013)).xzy * 2.0 - 1.0;
      vec2 nxz = (n1.xz + n2.xz) * mix(0.5, 0.04, lejos) + n3.xz * mix(0.15, 0.22, lejos);
      nxz *= mix(1.0, 0.9 + 0.45 * nB, uTormenta); // el chop del oleaje también cambia sin una recta
      vec3 N = normalize(vec3(nxz.x, 1.0, nxz.y));
      // color por profundidad: laguna turquesa, borde arenoso y azul hondo
      float k = 1.0 - exp(-max(prof, 0.0) * 0.28);
      vec3 col = mix(uLaguna, uSomero, smoothstep(0.0, 0.45, k));
      col = mix(col, uHondo, smoothstep(0.45, 1.0, k));
      col = saturar(col, 1.3); // turquesa más puro (26-C)
      // luz: cielo y suelo, sol
      float ndl = max(dot(N, uSolDir), 0.0);
      col *= uHemiCielo * 0.55 + uSolCol * ndl * 0.35 + 0.1;
      float fres = 0.03 + 0.9 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      col = mix(col, skyRefl(reflect(-V, N)), fres);
      vec3 Hh = normalize(uSolDir + V);
      col += uSolCol * pow(max(dot(N, Hh), 0.0), mix(320.0, 90.0, lejos)) * mix(3.0, 0.6, lejos);
      col += uSolCol * destello(N, Hh, xz) * 1.4 * (1.0 - lejos * 0.8);
      // espuma de orilla: bandas que llegan a la playa, rotas con ruido; en medio y alto con borde duro y una 2.ª banda fina más afuera
      float nz = vnoise(xz * 0.9 + uTime * 0.15) * 0.6 + vnoise(xz * 2.7 - uTime * 0.2) * 0.4;
      float orilla = 1.0 - smoothstep(0.0, 1.5, prof);
      float bandas = sin(prof * 5.5 - uTime * 1.4 + nz * 3.0 + vOla * 1.5) * 0.5 + 0.5;
      float espuma = orilla * smoothstep(mix(0.62, 0.685, uEstilo), mix(0.8, 0.71, uEstilo), bandas + nz * 0.35);
      float bandas2 = sin(prof * 2.6 - uTime * 0.9 + nz * 2.2 + vOla) * 0.5 + 0.5;
      espuma = max(espuma, uEstilo * (1.0 - smoothstep(0.9, 2.6, prof)) * smoothstep(0.4, 0.9, prof) * (smoothstep(0.86, 0.885, bandas2) - smoothstep(0.93, 0.955, bandas2)));
      float pie = 0.13 + nz * 0.15;
      espuma += 1.0 - smoothstep(mix(0.03, pie - 0.03, uEstilo), mix(pie + 0.09, pie, uEstilo), prof);
      espuma = clamp(espuma, 0.0, 1.0) * (1.0 - lejos);
      col = mix(col, uHemiCielo * 0.85 + uSolCol * 0.35, espuma * 0.85);
      float a = mix(0.55, 0.96, smoothstep(0.0, 1.6, prof));
      a = max(a, espuma * 0.9);
      a *= smoothstep(-0.05, 0.08, profReal); // la orilla real sigue fundiéndose con la arena
      // Casi opaca: si el fondo se viera, la arena y la caída del arrecife volverían a ser un corte
      float aMar = max(mix(0.95, 0.99, nB), espuma * 0.95) * smoothstep(-0.05, 0.55, profReal);
      a = mix(a, aMar, uTormenta);
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
    }`;
  const O = W.oceano || {};
  const seaY = MAPA ? seaLevel : O.y != null ? O.y : -2.6;
  let mar = null;
  {
    // Rejilla radial: densa cerca de la cámara (oleaje y orilla) y gruesa hasta el horizonte
    const RINGS = 56, SEG = 96, RMAX = R.camera.far * 0.85, pos = [0, 0, 0], idx = [];
    for (let r = 1; r <= RINGS; r++) {
      const rad = 2.5 * Math.pow(RMAX / 2.5, (r - 1) / (RINGS - 1));
      for (let s = 0; s < SEG; s++) { const a = s / SEG * Math.PI * 2; pos.push(Math.cos(a) * rad, 0, Math.sin(a) * rad); }
    }
    for (let s = 0; s < SEG; s++) idx.push(0, 1 + (s + 1) % SEG, 1 + s);
    for (let r = 1; r < RINGS; r++) for (let s = 0; s < SEG; s++) {
      const a = 1 + (r - 1) * SEG + s, b = 1 + (r - 1) * SEG + (s + 1) % SEG, c = a + SEG, d = b + SEG;
      idx.push(a, b, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const M = W.mar || {};
    const mat = waterMaterial(MAR_VERT, MAR_FRAG, {
      uSomero: { value: lin(M.somero || '#1fa5a8') }, uHondo: { value: lin(M.hondo || O.color || '#0d4f86') }, uLaguna: { value: lin(M.laguna || '#7fe0d0') },
    }, hTex ? { HAY_ALTURA: '' } : {});
    mar = new THREE.Mesh(g, mat);
    mar.name = 'mar'; mar.frustumCulled = false; mar.renderOrder = 2;
    mar.position.y = seaY;
    scene.add(mar);
  }

  // ---------- Río, quebrada, pozas y cascadas (modo mapa) ----------
  const RIO_VERT = `
    attribute vec4 color;
    uniform float uTime;
    varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec4 vC;
    #include <fog_pars_vertex>
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vC = color;
      vec4 mvPosition = viewMatrix * w;
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`;
  const RIO_FRAG = COMMON_FRAG + `
    uniform vec3 uClaro, uHondo, uTurbio; uniform float uTurbidez;
    uniform vec4 uPies[8];
    varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec4 vC;
    #include <fog_pars_fragment>
    void main() {
      vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;
      float cae = 1.0 - smoothstep(0.35, 0.75, abs(vN.y));     // cara vertical: salto de agua
      float vel = 0.35 + vC.g * 2.2;                            // G = velocidad (pozas lentas)
      float hT = alturaTerreno(vW.xz);
      float prof = vW.y - hT;
      vec2 fl = vec2(vUv.x * 0.22, vUv.y * 0.22 - uTime * vel * 0.32);
      vec2 fl2 = vec2(vUv.x * 0.37 + 0.31, vUv.y * 0.41 - uTime * vel * 0.55);
      vec3 n1 = texture2D(tNormal, fl).xzy * 2.0 - 1.0, n2 = texture2D(tNormal, fl2).xzy * 2.0 - 1.0;
      vec3 N = normalize(vec3((n1.x + n2.x) * 0.38, 1.0, (n1.z + n2.z) * 0.38));
      if (cae > 0.5) N = normalize(vN + vec3(n1.x, 0.0, n1.z) * 0.2);
      // BB1: azul turquesa brillante como el render de 2022, con un borde claro (cian) donde el agua es somera
      float k = 1.0 - exp(-max(prof, 0.0) * 0.6);
      vec3 col = mix(uClaro, uHondo, smoothstep(0.08, 0.75, k));
      col = mix(col, uTurbio, uTurbidez);
      col = saturar(col, 1.3);
      float ndl = max(dot(N, uSolDir), 0.0);
      col *= uHemiCielo * 0.75 + uSolCol * ndl * 0.32 + 0.22;
      float fres = 0.03 + 0.45 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      col = mix(col, mix(skyRefl(reflect(-V, N)), col, 0.35), fres * (1.0 - cae)); // el cielo se refleja teñido: no agrisa el río
      float borde = (1.0 - smoothstep(0.0, 0.55, prof)) * (1.0 - cae) * (1.0 - uTurbidez);
      col = mix(col, uClaro * (uHemiCielo * 0.9 + uSolCol * 0.35 + 0.25), borde * 0.75);
      col += uSolCol * pow(max(dot(N, normalize(uSolDir + V)), 0.0), 220.0) * 2.0 * (1.0 - cae);
      col += uSolCol * destello(N, normalize(uSolDir + V), vW.xz) * (1.0 - cae) * (1.0 - smoothstep(40.0, 160.0, dist));
      col = mix(col, uClaro * 0.75 * (uHemiCielo * 0.8 + 0.2), cae * 0.6); // la lámina que cae: verde claro translúcido
      // espuma: orillas (poca profundidad), saltos (R del color de vértice), cascadas con vetas y pie de las cascadas
      float nz = vnoise(vec2(vUv.x * 1.3, vUv.y * 0.8 - uTime * vel * 1.2)) * 0.65 + vnoise(vW.xz * 1.7 + uTime * 0.3) * 0.35;
      float ori = 0.3 + nz * 0.25;
      float esp = (1.0 - smoothstep(mix(0.05, ori - 0.04, uEstilo), mix(0.45 + nz * 0.25, ori, uEstilo), prof)) * 0.8 * (1.0 - cae); // orillas (no en la lámina que cae)
      esp = max(esp, vC.r * smoothstep(0.35, 0.6, nz + vC.r * 0.4) * (1.0 - cae * 0.7));
      // cascada: vetas finas y largas que caen (u = ancho de la cinta), sobre agua translúcida
      float s1 = vnoise(vec2(vUv.x * 5.5, vW.y * 0.18 + uTime * 2.6));
      float s2 = vnoise(vec2(vUv.x * 13.0 + 3.1, vW.y * 0.42 + uTime * 4.4));
      float vetas = s1 * 0.6 + s2 * 0.4;
      esp = max(esp, cae * smoothstep(0.44, 0.74, vetas));
      for (int i = 0; i < 8; i++) {
        vec4 p = uPies[i];
        if (p.w <= 0.0) continue;
        float dd = length(vW.xz - p.xz) / p.w;
        float ring = sin(dd * 9.0 - uTime * 3.0 + nz * 4.0) * 0.5 + 0.5;
        esp = max(esp, (1.0 - smoothstep(0.2, 1.0, dd)) * smoothstep(0.35, 0.8, ring * 0.6 + nz * 0.6) * step(abs(vW.y - p.y), 1.2));
      }
      esp = clamp(esp, 0.0, 1.0) * (1.0 - smoothstep(120.0, 260.0, dist));
      col = mix(col, uHemiCielo * 0.9 + uSolCol * 0.4, esp * 0.9);
      float a = mix(0.8, 0.97, k); // BB1: casi opaca, para que el fondo de roca no agrise el color
      a = max(a, max(esp * 0.95, borde * 0.85));
      a = mix(a, 0.5 + esp * 0.45, cae);
      a *= smoothstep(-0.25, 0.05, prof + cae);
      // Boca del río a nivel del mar: en la tormenta no es un segundo plano encima del mar
      a *= 1.0 - uTormenta * (1.0 - smoothstep(0.55, 1.35, vW.y));
      if (uTormenta > 0.0 && a < 0.02) discard;
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
    }`;
  let rio = null, rioMat = null, flood = null;
  const pies = [];
  if (MAPA) {
    for (const c of D.cascadas || []) if (pies.length < 8) pies.push(new THREE.Vector4(c.abajo[0], c.abajo[1], c.abajo[2], Math.max(2.5, c.caida * 0.6 + (c.ancho || 3) * 0.4)));
    while (pies.length < 8) pies.push(new THREE.Vector4(0, 0, 0, 0));
    const AG = (W.aguaRio || {});
    rioMat = waterMaterial(RIO_VERT, RIO_FRAG, {
      uClaro: { value: lin(AG.claro || '#5fe3d6') }, uHondo: { value: lin(AG.hondo || '#2b8fdc') }, uTurbio: { value: lin(AG.turbio || '#8a6b3d') },
      uTurbidez: { value: 0 }, uPies: { value: pies },
    }, hTex ? { HAY_ALTURA: '' } : {});
    const url = MAPA.terreno && MAPA.terreno.agua;
    if (url) {
      const B64 = (W.mapa && W.mapa.b64) || 'AV_MAPA_B64', id = url.split('/').pop().replace(/\.glb$/, '');
      G.assets.loadGLB(url, { b64: () => (window[B64] || {})[id], script: url.replace(/\.glb$/, '_glb.js'), base: '', error: 'agua no disponible' }).then(g => {
        g.scene.updateMatrixWorld(true);
        let geo = null;
        g.scene.traverse(o => { if (o.isMesh && !geo) geo = o.geometry.clone().applyMatrix4(o.matrixWorld); });
        if (!geo) return;
        if (!geo.getAttribute('color')) geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 4).fill(0.5), 4));
        if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        geo.computeBoundingSphere();
        rio = new THREE.Mesh(geo, rioMat);
        rio.name = 'rio'; rio.frustumCulled = false; rio.renderOrder = 3;
        scene.add(rio);
      }).catch(e => console.warn('AVE agua:', e && e.message || e));
    }
    // Crecida: lámina de agua turbia sobre el terreno A mientras S.water sube
    if (crecida) {
      const fg = new THREE.CircleGeometry(crecida.r + 2, 48); fg.rotateX(-Math.PI / 2);
      const n = fg.attributes.position.count, col = new Float32Array(n * 4), uv = fg.attributes.uv;
      for (let i = 0; i < n; i++) { col[i * 4 + 1] = 0.25; col[i * 4 + 3] = 1; uv.setXY(i, fg.attributes.position.getX(i), fg.attributes.position.getZ(i)); }
      fg.setAttribute('color', new THREE.BufferAttribute(col, 4));
      const fm = rioMat.clone();
      for (const k in U) fm.uniforms[k] = U[k];
      fm.uniforms.uPies.value = pies; fm.uniforms.uTurbidez.value = 0.65;
      flood = new THREE.Mesh(fg, fm); flood.name = 'crecida';
      flood.position.set(crecida.x, base, crecida.z); flood.visible = false; flood.renderOrder = 4;
      scene.add(flood);
    }
  } else if (WA) {
    // Franja de río de la plantilla
    tNormal.repeat.set(3, 18);
    strip = new THREE.Mesh(new THREE.PlaneGeometry(WA.ancho, WORLD * 2 + 20), new THREE.MeshPhongMaterial({
      color: WA.color || '#2f7f9f', transparent: true, opacity: 0.85, normalMap: tNormal, normalScale: new THREE.Vector2(0.5, 0.5),
      shininess: 40, specular: new THREE.Color('#5f8fa8') }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(WA.x, base, 0);
    scene.add(strip);
    half = WA.ancho / 2;
  }

  // ---------- Cascadas: rocío y neblina en la GPU ----------
  let rocio = null;
  if (MAPA && (D.cascadas || []).length) {
    const P = [], seed = [], kind = [];
    for (const c of D.cascadas) {
      const n = Math.round(14 + c.caida * 5 + (c.ancho || 3) * 2);
      for (let i = 0; i < n; i++) {
        P.push(c.abajo[0] + (Math.random() - 0.5) * (c.ancho || 3), c.abajo[1] + 0.1, c.abajo[2] + (Math.random() - 0.5) * (c.ancho || 3) * 0.6);
        seed.push(Math.random(), Math.random(), Math.random(), c.caida);
        kind.push(i % 4 === 0 ? 1 : 0); // 1 = neblina (grande y lenta)
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 4));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), { uTime: U.uTime, uEscala: { value: 1 }, uLuz: U.uHemiCielo, uCant: { value: 1 } }),
      transparent: true, depthWrite: false, fog: true,
      vertexShader: `
        attribute vec4 aSeed; attribute float aKind; uniform float uTime, uEscala, uCant; varying float vA; varying float vK;
        #include <fog_pars_vertex>
        void main() {
          float vida = mix(1.1, 3.2, aKind);
          float t = fract(uTime / vida + aSeed.x);
          float caida = aSeed.w;
          vec3 p = position;
          float ang = aSeed.y * 6.2832, sp = (0.8 + aSeed.z * 1.6) * (0.6 + caida * 0.08);
          p.x += cos(ang) * sp * t * (1.0 + aKind); p.z += sin(ang) * sp * t * (1.0 + aKind);
          p.y += (aKind > 0.5 ? (0.4 + caida * 0.18) * t : (2.4 + caida * 0.25) * t - 4.9 * t * t * 1.2);
          vA = sin(t * 3.1416) * mix(0.8, 0.42, aKind) * step(aSeed.z, uCant);
          vK = aKind;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = mix(0.22, 1.6 + caida * 0.12, aKind) * (1.0 + t) * uEscala / -mvPosition.z;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform vec3 uLuz; varying float vA; varying float vK;
        #include <fog_pars_fragment>
        void main() {
          vec2 q = gl_PointCoord - 0.5; float r = dot(q, q) * 4.0;
          float a = (1.0 - smoothstep(mix(0.5, 0.0, vK), 1.0, r)) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(uLuz * 0.95 + 0.25, a);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #include <fog_fragment>
        }`,
    });
    rocio = new THREE.Points(g, m); rocio.name = 'rocio'; rocio.frustumCulled = false; rocio.renderOrder = 6;
    scene.add(rocio);
  }
  function calidadAgua(Q) {
    if (rocio) rocio.material.uniforms.uCant.value = Q.particulas;
    U.uEstilo.value = Q.agua > 0 ? 1 : 0;
  }
  calidadAgua(C);
  G.on('calidad', calidadAgua);

  // ---------- Nivel en la partida ----------
  function setLevel(y) {
    S.water = y;
    if (strip) strip.position.y = y;
    if (flood) { flood.position.y = y; flood.visible = y > base + 0.03; }
  }

  // Efectos de agua: anillos que se expanden (salpicadura y ondas) y gotas con gravedad
  // Minijuego de la tormenta: un solo cuerpo de agua. Al salir vuelve el mar de siempre (uTormenta 0).
  function tormenta(on) { U.uTormenta.value = on ? 1 : 0; }
  function ripple(x, y, z, size) { G.fx.ringFx(x, y, z, size || 1.2, 0.9, 0.4); }
  function splash(x, y, z, s) {
    G.audio.play('splash');
    G.fx.ringFx(x, y, z, 2.2 * s, 0.75, 0.75); G.fx.ringFx(x, y, z, 1.2 * s, 0.5, 0.55);
    G.fx.drops(x, y, z, s, y);
  }
  function spray(x, y, z) { G.fx.drops(x, y, z, 0.7, y - 1.2); }

  const camP = new THREE.Vector3();
  G.on('render', (dt, t) => {
    U.uTime.value = t;
    if (strip) { tNormal.offset.y = t * 0.04; tNormal.offset.x = Math.sin(t * 0.3) * 0.05; }
    // el mar sigue a la cámara en pasos de 8 m (los vértices no "nadan": el oleaje se calcula en coordenadas de mundo)
    if (mar) { camP.copy(R.camera.position); mar.position.x = Math.round(camP.x / 8) * 8; mar.position.z = Math.round(camP.z / 8) * 8; }
    if (rocio) rocio.material.uniforms.uEscala.value = R.renderer.domElement.height * 0.5 / Math.tan(R.camera.fov * Math.PI / 360);
  }, 25);
  G.on('apply', () => setLevel(S.water), 40);

  return { base, mesh: strip, mar, get rio() { return rio; }, flood, levelAt, setLevel, tormenta, ripple, splash, spray, uniforms: U, alturaTex: hTex };
});
