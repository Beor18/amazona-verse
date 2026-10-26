/* AVE · renderer
   WebGL, color (sRGB + ACES, igual que el creador y el retrato), escena, luces, cielo, niebla, sombras, post-proceso,
   calidad adaptativa y bucle principal.
   Bucle: update(dt) = reloj + G.fisica.step + gancho 'update'; render(dt) = G.camara.follow + gancho 'render' + G.camara.draw
   (que llama a drawScene: post-proceso si está activo, si no render directo).
   Calidad: presets bajo / medio / alto (calidad, setCalidad). Se elige por GPU, núcleos y memoria (perfilEquipo), baja en los primeros 3 s si no llega al objetivo (decidirArranque) y se ajusta por FPS; cada cambio emite el gancho
   'calidad' (G.on('calidad', C => …)) para que terreno, vegetación y agua bajen o suban su detalle. ?calidad=bajo fija uno. Prueba: calidadTest() (corre también dentro de contextTest).
   Datos del pack: mundo.cielo { color (horizonte), cenit, sol, niebla: [inicio, extincion], nieblaAltura: [h0, escala] },
   mundo.luces { cielo, suelo, hemi, sol, solInt, solPos }, mundo.exposicion, mundo.post { saturacion, contraste, bloom }.
   Sin cielo.cenit se usa el fondo plano de antes (plantillas viejas).
   Contexto WebGL: si se pierde, pausa con un aviso y al volver lo rehace todo sin tocar G.S (gancho 'contexto'; ver la sección
   «Contexto WebGL»). Prueba: contextTest() (AV.contextTest). */
AVE.module('renderer', function (G) {
  'use strict';
  const W = G.pack.mundo || {};
  const canvas = document.getElementById('game');
  // ── Color, antialias y resolución: dueño TA de personaje (docs/equipo/COORDINACION.md). El resto del archivo es del
  //    programador gráfico. Si se cambia algo de este bloque, avisar al TA: el color de la ropa y la nitidez dependen de esto.
  // MSAA siempre (sin él, ropa, plumas y estampados se veían en escalera en móviles de DPR 2 o más) y DPR máximo 1,5 en
  // pantallas táctiles, 2 en escritorio (CTO_PLAN §3.2). Resolución dinámica: si los FPS caen, el DPR baja en pasos de 0,25
  // hasta 1 y vuelve a subir cuando sobra margen (adaptDPR, al principio del bucle). Cada cambio emite el gancho 'dpr'
  // (G.on('dpr', pr => …)) para que un post-proceso (EffectComposer) ajuste su tamaño. Un render target de post debe ser
  // WebGLMultisampleRenderTarget (o llevar FXAA): un target normal anula el MSAA del lienzo.
  // snapshot() renderiza y lee el lienzo en la misma tarea, así que no hace falta preserveDrawingBuffer.
  const MOBILE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const DEVICE_DPR = window.devicePixelRatio || 1;
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  const DPR_MAX = Math.min(DEVICE_DPR, MOBILE ? 1.5 : 2), DPR_MIN = Math.min(1, DPR_MAX);
  renderer.setPixelRatio(DPR_MAX);
  const dyn = { ms: 16.7, t: 0, slow: 0, fast: 0, lock: 0 };
  function adaptDPR(raw) {
    if (!(raw > 0 && raw < 100)) return;                     // pestaña oculta o pausa larga: no cuenta
    dyn.ms += (raw - dyn.ms) * 0.05; dyn.t += raw; dyn.lock = Math.max(0, dyn.lock - raw);
    if (dyn.t < 1000) return;
    dyn.t = 0;
    dyn.slow = dyn.ms > 20.5 ? dyn.slow + 1 : 0;               // < ~49 FPS sostenido
    dyn.fast = dyn.ms < 17.6 ? dyn.fast + 1 : 0;               // a tope de refresco
    const pr = renderer.getPixelRatio();
    if (dyn.slow >= 2 && pr > DPR_MIN) { renderer.setPixelRatio(Math.max(DPR_MIN, pr - 0.25)); dyn.slow = 0; dyn.lock = 20000; }
    else if (dyn.fast >= 6 && !dyn.lock && pr < DPR_MAX) { renderer.setPixelRatio(Math.min(DPR_MAX, pr + 0.25)); dyn.fast = 0; dyn.lock = 6000; }
    else return;
    G.emit('dpr', renderer.getPixelRatio());
  }
  // Salida sRGB + ACES (igual en el creador, el retrato y las miniaturas). El personaje y la ropa ya llegan en lineal (AVColor en
  // src/personaje/wardrobe.js); los colores del mundo se escriben pensando en sRGB y linearize() los pasa a lineal una vez.
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = W.exposicion != null ? W.exposicion : 0.7; // ACES escala por 1/0,6
  const linDone = new WeakSet();
  function linMat(m) {
    if (!m || linDone.has(m)) return m;
    linDone.add(m);
    if (m.color) m.color.convertSRGBToLinear();
    if (m.emissive) m.emissive.convertSRGBToLinear();
    if (m.specular) m.specular.convertSRGBToLinear();
    if (m.map) m.map.encoding = THREE.sRGBEncoding;
    if (m.isSpriteMaterial) m.toneMapped = false; // renders oficiales: sin curva de tono
    return m;
  }
  function linearize(obj) { obj.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(linMat); }); return obj; }

  // ── Desde aquí: programador gráfico ──
  // ---------- Calidad: presets y elección inicial ----------
  // sombras: tamaño del mapa (0 = sin sombras); post: 0 solo gradación (en el tone mapping), 1 bloom a 1/4 + gradación + viñeta,
  // 2 bloom a 1/2 + gradación + viñeta; flora: densidad; floraDist: distancia relativa
  const PRESETS = {
    bajo: { nivel: 'bajo', sombras: 0, sombraRadio: 0, sombraTerreno: false, post: 0, normalesSuelo: false, dosEscalas: false, texMax: 512, flora: 0.5, floraDist: 0.55, pasto: 0, sombraFlora: false, agua: 0, particulas: 0.4 },
    medio: { nivel: 'medio', sombras: 1024, sombraRadio: 22, sombraTerreno: false, post: 1, normalesSuelo: true, dosEscalas: false, texMax: 1024, flora: 0.8, floraDist: 0.8, pasto: 0.6, sombraFlora: true, agua: 1, particulas: 0.7 },
    alto: { nivel: 'alto', sombras: 2048, sombraRadio: 30, sombraTerreno: true, post: 2, normalesSuelo: true, dosEscalas: true, texMax: 0, flora: 1, floraDist: 1, pasto: 1, sombraFlora: true, agua: 2, particulas: 1 },
  };
  const NIVELES = ['bajo', 'medio', 'alto'];
  const gl = renderer.getContext();
  const GPU = (() => {
    try { const e = gl.getExtension('WEBGL_debug_renderer_info'); return String(e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); }
    catch (e) { return ''; }
  })();
  const CHROMEOS = /CrOS/.test(navigator.userAgent);
  const SOFTWARE = /SwiftShader|llvmpipe|Software|Microsoft Basic/i.test(GPU);
  const MODEST = MOBILE || CHROMEOS || /Intel|Mali|Adreno|PowerVR|Apple GPU|Vivante/i.test(GPU) && !/Apple M\d|Iris\(R\) Xe|Arc/i.test(GPU);
  const OBJETIVO = MOBILE || CHROMEOS ? 30 : 55; // FPS mínimos que se defienden
  // Equipo modesto (A3): GPU, núcleos y memoria. Lo que el navegador no dice (Safari no da deviceMemory) no cuenta; un equipo
  // potente (GPU dedicada o Apple M, ≥ 6 núcleos, ≥ 8 GB) sigue en alto.
  function perfilEquipo(e) {
    const n = e.nucleos > 0 ? e.nucleos : 0, m = e.memoria > 0 ? e.memoria : 0, motivos = [];
    if (e.software) motivos.push('GPU por software');
    if (n && n <= 2) motivos.push(n + ' núcleos');
    if (m && m <= 2) motivos.push(m + ' GB');
    if (motivos.length) return { nivel: 'bajo', motivos };
    if ((e.movil || e.chromeos) && (n && n <= 4 || m && m <= 4)) return { nivel: 'bajo', motivos: [(e.chromeos ? 'Chromebook' : 'móvil') + ' con ' + (n || '?') + ' núcleos y ' + (m || '?') + ' GB'] };
    if (e.modesto) motivos.push(e.movil ? 'móvil' : e.chromeos ? 'Chromebook' : 'GPU integrada');
    if (n && n <= 4) motivos.push(n + ' núcleos');
    if (m && m <= 4) motivos.push(m + ' GB');
    return { nivel: motivos.length ? 'medio' : 'alto', motivos };
  }
  // Primeros segundos jugando (A3): si el equipo no llega al objetivo, baja enseguida sin esperar a la resolución dinámica.
  // Solo baja, una vez: por debajo de la mitad del objetivo va directo a bajo; por debajo del 85 %, un nivel.
  function decidirArranque(fps, nivel, objetivo) {
    const i = NIVELES.indexOf(nivel);
    if (!(fps > 0) || i <= 0) return nivel;
    if (fps < objetivo * 0.5) return 'bajo';
    return fps < objetivo * 0.85 ? NIVELES[i - 1] : nivel;
  }
  const EQUIPO = { gpu: GPU, software: SOFTWARE, modesto: MODEST, movil: MOBILE, chromeos: CHROMEOS, nucleos: navigator.hardwareConcurrency || 0, memoria: navigator.deviceMemory || 0 };
  const PERFIL = perfilEquipo(EQUIPO);
  const fromUrl = new URLSearchParams(location.search).get('calidad');
  const inicial = NIVELES.includes(fromUrl) ? fromUrl : PERFIL.nivel;
  const calidad = Object.assign({}, PRESETS[inicial], { manual: NIVELES.includes(fromUrl), gpu: GPU, objetivo: OBJETIVO });

  // ---------- Escena, cielo y niebla ----------
  const cielo = W.cielo || {};
  const scene = new THREE.Scene();
  const SKY = new THREE.Color(cielo.color || '#bfe1d6');
  const fogR = cielo.niebla || [55, 165];
  const ATMOS = !!cielo.cenit; // cielo con degradado, sol y niebla atmosférica (si no, el fondo plano de antes)
  const FAR = W.lejos || (ATMOS ? 1600 : 300);
  const camera = new THREE.PerspectiveCamera(55, 1, ATMOS ? 0.12 : 0.1, FAR);
  const L = W.luces || {};
  const sunDir = new THREE.Vector3(...(L.solPos || [-30, 50, 20])).normalize();
  // Niebla: con ATMOS, near negativo marca la fórmula atmosférica (inicio = -near, extinción = far), con altura y brillo del sol
  // (ShaderChunk de abajo). Sin ATMOS, la niebla lineal de three de siempre. El color de la niebla se mezcla después del
  // tone mapping y la codificación (r128): en pantalla va en sRGB y en el render target del post, en lineal (fogColorFor).
  const fogSRGB = SKY.clone();
  scene.fog = ATMOS ? new THREE.Fog(fogSRGB.clone(), -fogR[0], fogR[1]) : new THREE.Fog(SKY, fogR[0], fogR[1]);
  scene.background = ATMOS ? null : SKY;
  if (ATMOS) {
    const nh = cielo.nieblaAltura || [6, 55];
    const f = v => (Math.round(v * 1000) / 1000).toFixed(3);
    THREE.ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float fogDepth;\n\tvarying vec3 vFogWorld;\n#endif';
    // posición de mundo desde viewMatrix (r128 no sube cameraPosition a Lambert ni Basic): mundo = Rᵀ · (mv − t)
    THREE.ShaderChunk.fog_vertex = '#ifdef USE_FOG\n\tfogDepth = - mvPosition.z;\n\tvFogWorld = ( vec4( mvPosition.xyz - viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz;\n#endif';
    THREE.ShaderChunk.fog_pars_fragment = '#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float fogDepth;\n\tvarying vec3 vFogWorld;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n\t#endif\n#endif';
    THREE.ShaderChunk.fog_fragment = [
      '#ifdef USE_FOG',
      '\t#ifdef FOG_EXP2',
      '\t\tfloat fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );',
      '\t\tvec3 fogCol = fogColor;',
      '\t#else',
      '\t\tfloat fogFactor; vec3 fogCol = fogColor;',
      '\t\tif ( fogNear < 0.0 ) {',
      '\t\t\tvec3 fCam = - ( vec4( viewMatrix[ 3 ].xyz, 0.0 ) * viewMatrix ).xyz;',
      '\t\t\tvec3 fV = vFogWorld - fCam; float fD = length( fV );',
      `\t\t\tfloat fH = 0.5 * ( fCam.y + vFogWorld.y ) - ${f(nh[0])};`,
      `\t\t\tfloat fK = clamp( exp( - fH / ${f(nh[1])} ), 0.08, 1.6 );`,
      '\t\t\tfogFactor = 1.0 - exp( - max( fD + fogNear, 0.0 ) / fogFar * fK );',
      `\t\t\tfloat fSun = pow( max( dot( fV / max( fD, 1e-3 ), vec3( ${f(sunDir.x)}, ${f(sunDir.y)}, ${f(sunDir.z)} ) ), 0.0 ), 6.0 );`,
      '\t\t\tfogCol = mix( fogColor, fogColor * vec3( 1.16, 1.07, 0.9 ), fSun );',
      '\t\t} else fogFactor = smoothstep( fogNear, fogFar, fogDepth );',
      '\t#endif',
      '\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogFactor );',
      '#endif',
    ].join('\n');
  }
  // Cielo: degradado cenit → horizonte con un halo cálido alrededor del sol y su disco; sigue a la cámara
  let sky = null;
  const skyU = {
    uCenit: { value: new THREE.Color(cielo.cenit || '#3d8fd6').convertSRGBToLinear() },
    uHorizonte: { value: SKY.clone().convertSRGBToLinear() },
    uSolCol: { value: new THREE.Color(cielo.sol || '#fff2cf').convertSRGBToLinear() },
    uSolDir: { value: sunDir },
  };
  if (ATMOS) {
    sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: 'varying vec3 vDir;\nvoid main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: [
        'uniform vec3 uCenit, uHorizonte, uSolCol, uSolDir; varying vec3 vDir;',
        'void main() {',
        '  vec3 d = normalize(vDir);',
        '  float h = d.y;',
        '  float t = pow(clamp(h, 0.0, 1.0), 0.45);',
        '  vec3 c = mix(uHorizonte, uCenit, t);',
        '  c = mix(c, uHorizonte * 0.92, smoothstep(0.0, -0.25, h));',  // bajo el horizonte: el color del mar lejano
        '  float s = max(dot(d, uSolDir), 0.0);',
        '  c += uSolCol * (pow(s, 6.0) * 0.22 + pow(s, 48.0) * 0.45) * smoothstep(-0.1, 0.1, h);',
        '  c = mix(c, uSolCol * 3.2, smoothstep(0.9993, 0.9997, s));',
        '  gl_FragColor = vec4(c, 1.0);',
        '  #include <tonemapping_fragment>',
        '  #include <encodings_fragment>',
        '}',
      ].join('\n'),
    }));
    sky.name = 'cielo'; sky.frustumCulled = false; sky.renderOrder = -100; sky.scale.setScalar(FAR * 0.8);
    scene.add(sky);
  }
  // Nubes: cúmulos pintados en un lienzo, como tarjetas que miran a la cámara, todas en una llamada (mundo.cielo.nubes = n)
  const nubesU = { uTime: { value: 0 }, tNube: { value: null }, uSolDir: { value: sunDir }, uAlto: skyU.uSolCol, uBajo: { value: new THREE.Color(cielo.nubeSombra || '#a9bfd6').convertSRGBToLinear() } };
  if (ATMOS && cielo.nubes !== 0) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const x = cv.getContext('2d'), rr = G.util.rng(77);
    for (let i = 0; i < 26; i++) {
      const cx = 40 + rr() * 176, cy = 70 - Math.sin((cx - 40) / 176 * Math.PI) * 30 + rr() * 18, r = 18 + rr() * 26;
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    nubesU.tNube.value = new THREE.CanvasTexture(cv);
    const N = cielo.nubes || 16, q = new THREE.PlaneGeometry(1, 0.5), ig = new THREE.InstancedBufferGeometry();
    ig.index = q.index; ig.setAttribute('position', q.attributes.position); ig.setAttribute('uv', q.attributes.uv);
    const d = new Float32Array(N * 4); const rn = G.util.rng(311);
    for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + rn() * 0.4, r = FAR * (0.38 + rn() * 0.2); d.set([Math.cos(a) * r, 110 + rn() * 120, Math.sin(a) * r, 140 + rn() * 160], i * 4); }
    ig.setAttribute('iNube', new THREE.InstancedBufferAttribute(d, 4)); ig.instanceCount = N;
    const nubes = new THREE.Mesh(ig, new THREE.ShaderMaterial({
      uniforms: nubesU, transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute vec4 iNube; uniform float uTime; varying vec2 vUv; varying float vH;
        void main() {
          vec3 c = iNube.xyz; float ang = uTime * 0.004; c.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * c.xz;
          vec3 toCam = normalize(vec3(cameraPosition.x - c.x, 0.0, cameraPosition.z - c.z)); vec3 right = vec3(toCam.z, 0.0, -toCam.x);
          vec3 w = c + right * position.x * iNube.w + vec3(0.0, position.y * iNube.w, 0.0);
          vUv = uv; vH = uv.y;
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
        }`,
      fragmentShader: `uniform sampler2D tNube; uniform vec3 uAlto, uBajo; varying vec2 vUv; varying float vH;
        void main() {
          vec4 t = texture2D(tNube, vUv);
          vec3 c = mix(uBajo, uAlto * 0.42 + vec3(0.55), smoothstep(0.15, 0.8, vH));
          gl_FragColor = vec4(c, t.a * 0.9);
          #include <tonemapping_fragment>
          #include <encodings_fragment>
        }`,
    }));
    nubes.name = 'cielo-nubes'; nubes.frustumCulled = false; nubes.renderOrder = -90;
    scene.add(nubes);
  }

  // ---------- Luces ----------
  const hemi = new THREE.HemisphereLight(L.cielo || '#fff4dc', L.suelo || '#2f5a3a', L.hemi != null ? L.hemi : 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(L.sol || '#ffe2b0', L.solInt != null ? L.solInt : 0.75);
  sun.position.copy(sunDir).multiplyScalar(100);
  scene.add(sun, sun.target);
  // Sombras: mapa del sol con un frustum ortográfico ajustado al jugador y anclado a la rejilla de texeles (sin parpadeo)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.035;
  function aplicarSombras(C) {
    const on = C.sombras > 0;
    sun.castShadow = on;
    if (!on) return;
    if (sun.shadow.mapSize.x !== C.sombras) { sun.shadow.mapSize.set(C.sombras, C.sombras); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    const r = C.sombraRadio, cam = sun.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 1; cam.far = 320; cam.updateProjectionMatrix();
  }
  aplicarSombras(calidad);
  const lsR = new THREE.Vector3(), lsU = new THREE.Vector3(), lsC = new THREE.Vector3();
  function seguirSombra() {
    const S = G.S; if (!S || !S.pos) return;
    const C = calidad;
    if (!sun.castShadow) { sun.position.copy(sunDir).multiplyScalar(100).add(lsC.set(S.pos.x, S.pos.y, S.pos.z)); sun.target.position.set(S.pos.x, S.pos.y, S.pos.z); sun.target.updateMatrixWorld(); return; }
    const texel = 2 * C.sombraRadio / C.sombras;
    lsR.set(0, 1, 0).cross(sunDir).normalize(); lsU.copy(sunDir).cross(lsR).normalize();
    // centro un poco adelante de la cámara: la sombra cubre lo que se ve
    const fx = -Math.sin(G.camara.yaw) * C.sombraRadio * 0.35, fz = -Math.cos(G.camara.yaw) * C.sombraRadio * 0.35;
    lsC.set(S.pos.x + fx, S.pos.y, S.pos.z + fz);
    const u = Math.round(lsC.dot(lsR) / texel) * texel, v = Math.round(lsC.dot(lsU) / texel) * texel, w = lsC.dot(sunDir);
    lsC.copy(lsR).multiplyScalar(u).addScaledVector(lsU, v).addScaledVector(sunDir, w);
    sun.target.position.copy(lsC); sun.target.updateMatrixWorld();
    sun.position.copy(lsC).addScaledVector(sunDir, 160);
  }

  // Tamaño del lienzo: con la ventana en 0×0 (panel oculto, iframe plegado del visor) se conserva el último válido; si
  // nunca hubo uno, 1280×720. Así snapshot() (fotos del cómic) siempre tiene píxeles (QA-21).
  const tam = { w: 1280, h: 720 };
  function resize() {
    if (innerWidth > 0 && innerHeight > 0) { tam.w = innerWidth; tam.h = innerHeight; }
    renderer.setSize(tam.w, tam.h, false); camera.aspect = tam.w / tam.h; camera.updateProjectionMatrix();
    if (post.composer) post.resize();
  }
  addEventListener('resize', resize);

  // ---------- Post-proceso por niveles (ficha 26-A): bloom suave + gradación + viñeta, con EffectComposer de r128 ----------
  // El render target es multisample (WebGL2) y de media precisión: guarda el color ya con ACES (r128 lo aplica en cada material)
  // en lineal; el último pase gradúa y codifica a sRGB, así el color final es el mismo que sin post. Alto: bloom a 1/2 de la
  // resolución; medio: a 1/4 (umbral 0,9, fuerza 0,18). Bajo, o si el post no puede cargar: sin composer, la misma gradación
  // va gratis en el tone mapping de cada material (CustomToneMapping = ACES + gradación, sin viñeta).
  const PP = W.post || {};
  const GRADO = { sat: PP.saturacion != null ? PP.saturacion : 1.08, con: PP.contraste != null ? PP.contraste : 1.04, tint: [1.0, 0.995, 0.985] };
  const BLOOM = { 2: { escala: 1 / 2, fuerza: PP.bloom != null ? PP.bloom : 0.22 }, 1: { escala: 1 / 4, fuerza: PP.bloomMedio != null ? PP.bloomMedio : 0.18 } };
  const CUSTOM_TM = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
  {
    const g = GRADO, n = v => (Math.round(v * 1000) / 1000).toFixed(3);
    if (THREE.ShaderChunk.tonemapping_pars_fragment.includes(CUSTOM_TM)) THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(CUSTOM_TM, [
      'vec3 CustomToneMapping( vec3 color ) {',
      '\tvec3 c = sqrt( max( ACESFilmicToneMapping( color ), 0.0 ) ); float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );',
      `\tc = mix( vec3( l ), c, ${n(g.sat)} ); c = ( c - 0.5 ) * ${n(g.con)} + 0.5;`,
      `\tc = clamp( c * vec3( ${n(g.tint[0])}, ${n(g.tint[1])}, ${n(g.tint[2])} ), 0.0, 1.0 ); return c * c;`,
      '}'].join('\n'));
  }
  // El tone mapping entra en la clave del programa, pero r128 no recompila solo al cambiarlo: needsUpdate en lo que hay en escena
  function gradoEnTono(on) {
    const tm = on ? THREE.CustomToneMapping : THREE.ACESFilmicToneMapping;
    if (renderer.toneMapping === tm) return;
    renderer.toneMapping = tm;
    scene.traverse(o => { const m = o.material; if (m) for (const x of Array.isArray(m) ? m : [m]) x.needsUpdate = true; });
  }
  // Scripts del post (three r128 examples/js): primero la copia local del repo (assets/vendor/three/examples/js/, sin
  // peticiones a terceros; ver docs/equipo/SEGURIDAD_INFANTIL.md); si no está, jsDelivr con versión exacta, salvo que
  // AVE.config.sinTerceros esté activo (entonces no hay post).
  const LOCAL = 'assets/vendor/three/examples/js/', CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const POST_JS = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js',
    'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'];
  const post = { activo: false, composer: null, cargando: null, bloom: null, grade: null, origen: null, escala: 1 / 2, GRADO, BLOOM };
  const fogLin = fogSRGB.clone().convertSRGBToLinear();
  function fogColorFor(rt) { if (scene.fog && ATMOS) scene.fog.color.copy(rt ? fogLin : fogSRGB); }
  function cargarDesde(base) { return POST_JS.reduce((p, f) => p.then(() => AVE.assets.script(base + f)), Promise.resolve()).then(() => { post.origen = base; }); }
  function cargarPost() {
    if (post.cargando) return post.cargando;
    const sinTerceros = !!(AVE.config && AVE.config.sinTerceros);
    post.cargando = cargarDesde(LOCAL).catch(e => { if (sinTerceros) throw e; return cargarDesde(CDN); })
      .then(() => {
        const size = renderer.getDrawingBufferSize(new THREE.Vector2());
        const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
        const rt = new THREE.WebGLMultisampleRenderTarget(size.x, size.y, opts); rt.samples = 4;
        const comp = new THREE.EffectComposer(renderer, rt);
        comp.addPass(new THREE.RenderPass(scene, camera));
        const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), BLOOM[2].fuerza, 0.45, 0.9);
        // UnrealBloomPass trabaja a la mitad de lo que recibe: con 2 × escala, su primera cadena queda a 1/2 (alto) o 1/4 (medio)
        const tamBloom = bloom.setSize.bind(bloom);
        bloom.setSize = (w, h) => tamBloom(Math.max(2, Math.round(w * post.escala * 2)), Math.max(2, Math.round(h * post.escala * 2)));
        comp.addPass(bloom);
        const grade = new THREE.ShaderPass({
          uniforms: { tDiffuse: { value: null }, uSat: { value: GRADO.sat }, uCon: { value: GRADO.con },
            uTint: { value: new THREE.Vector3(...GRADO.tint) }, uVig: { value: PP.vineta != null ? PP.vineta : 0.18 } },
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: [
            'uniform sampler2D tDiffuse; uniform float uSat, uCon, uVig; uniform vec3 uTint; varying vec2 vUv;',
            'void main() {',
            '  vec3 c = LinearTosRGB(vec4(max(texture2D(tDiffuse, vUv).rgb, 0.0), 1.0)).rgb;',
            '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
            '  c = mix(vec3(l), c, uSat);',
            '  c = (c - 0.5) * uCon + 0.5;',
            '  c *= uTint;',
            '  vec2 q = vUv - 0.5; c *= 1.0 - uVig * smoothstep(0.25, 0.85, dot(q, q) * 2.2);',
            '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
            '}',
          ].join('\n'),
        });
        comp.addPass(grade);
        Object.assign(post, { composer: comp, bloom, grade });
        post.resize = () => { comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(tam.w, tam.h); };
        post.resize();
      });
    return post.cargando;
  }
  G.on('dpr', () => { if (post.composer) post.resize(); });
  // Mientras el composer carga, el tone mapping queda en ACES (sin compilar dos veces al arrancar); si falla, gradúa ahí
  function aplicarPost(C) {
    const want = C.post > 0 && renderer.capabilities.isWebGL2 && ATMOS;
    if (!want) { post.activo = false; fogColorFor(false); gradoEnTono(true); return; }
    gradoEnTono(false);
    cargarPost().then(() => {
      const B = BLOOM[calidad.post >= 2 ? 2 : 1];
      post.activo = calidad.post > 0; fogColorFor(post.activo); gradoEnTono(!post.activo);
      if (post.escala !== B.escala) { post.escala = B.escala; post.resize(); }
      post.bloom.strength = B.fuerza;
    }).catch(e => { console.warn('AVE post:', e && e.message || e); post.activo = false; fogColorFor(false); gradoEnTono(true); });
  }
  aplicarPost(calidad);

  // ---------- Culling de objetos pequeños lejanos ----------
  // Objetos de juego (hallazgos, recursos, marcadores, NPC) de menos de 4 m que quedan más lejos que la distancia del preset
  // pasan a la capa 31 (ni la cámara ni la sombra la dibujan). No toca .visible: esa la manda la lógica del juego.
  const PROPIOS = /^(terreno|flora|edificios|estructura|mar$|rio$|cielo|rocio$|crecida$)/;
  const DIST_PEQ = { bajo: 55, medio: 75, alto: 130 };
  const cullCache = new WeakMap(), cBox = new THREE.Box3(), cSph = new THREE.Sphere();
  let cullN = 0;
  function cullPequenos(cam) {
    if (++cullN % 10) return;
    const max = DIST_PEQ[calidad.nivel] || 100, cp = cam.position;
    for (const o of scene.children) {
      let c = cullCache.get(o);
      if (o.isLight || PROPIOS.test(o.name || '') || o.userData.sinCulling) {
        if (c && c.lejos) { c.lejos = false; for (const m of c.meshes) m.layers.set(0); }
        continue;
      }
      if (!c || cullN - c.n > 300) {
        cBox.setFromObject(o);
        if (cBox.isEmpty()) { cullCache.set(o, c = { n: cullN, r: Infinity }); continue; }
        cBox.getBoundingSphere(cSph);
        const meshes = []; let piel = false;
        o.traverse(m => { if (m.isSkinnedMesh) piel = true; if (m.isMesh || m.isSprite || m.isPoints || m.isLine) meshes.push(m); });
        // personajes con esqueleto: nunca (su caja cambia con la animación y el teleport)
        c = { n: cullN, r: piel ? Infinity : cSph.radius, off: cSph.center.clone().sub(o.position), meshes, lejos: false };
        cullCache.set(o, c);
      }
      if (!(c.r < 4)) continue;
      const lejos = cp.distanceTo(cSph.center.copy(o.position).add(c.off)) > max;
      if (lejos !== c.lejos) { c.lejos = lejos; for (const m of c.meshes) m.layers.set(lejos ? 31 : 0); }
    }
  }

  // Dibuja la escena del mundo (la cámara lo llama cada cuadro)
  function drawScene(cam) {
    nubesU.uTime.value = t;
    cullPequenos(cam || camera);
    seguirSombra();
    if (sky) sky.position.copy((cam || camera).position);
    if (post.activo && post.composer) post.composer.render();
    else renderer.render(scene, cam || camera);
  }

  // ---------- Calidad adaptativa por FPS ----------
  // No mide hasta que el mundo terminó de cargar (los GLB y la flora dan tirones al llegar) y 3 s más
  // quieta: contextTest la congela mientras compara fotos (con la máquina cargada bajaba un nivel entre una foto y otra; QA-30)
  const fpsM = { ms: 16.7, t: 0, bajo: 0, alto: 0, bloqueo: 0, subidas: 0, warm: Infinity, quieta: false, arranque: { t: 0, n: 0, hecho: false, fps: 0 } };
  G.on('mundoListo', () => { Promise.resolve(G.vegetacion && G.vegetacion.listo).then(() => requestAnimationFrame(() => { precalentar(); fpsM.warm = 3000; })); });
  // Un solo controlador a la vez: cuando la resolución dinámica del TA cambia el DPR, los presets esperan a que se asiente
  G.on('dpr', () => { fpsM.bajo = 0; fpsM.alto = 0; fpsM.warm = Math.max(fpsM.warm, 2500); });
  // Precalentar: compila los programas y sube todas las texturas del mundo en un render fuera de pantalla (32×32), con todo
  // visible y sin frustum culling, antes de que el jugador mire alrededor (sin esto cada vista nueva daba tirones: QA-20).
  // Incluye la capa 31 (objetos pequeños lejanos): tras perder el contexto WebGL también hay que volver a subir lo suyo.
  function precalentar() {
    const rt = new THREE.WebGLRenderTarget(32, 32), guardado = [], capa31 = (camera.layers.mask & (1 << 31)) !== 0;
    camera.layers.enable(31);
    scene.traverse(o => {
      if (!(o.isMesh || o.isPoints || o.isSprite)) return;
      const propio = /^(terreno|flora|edificios|estructura)/.test(o.name || '');
      guardado.push([o, o.frustumCulled, o.visible, o.isInstancedMesh ? o.count : null]);
      o.frustumCulled = false;
      if (propio) { o.visible = true; if (o.isInstancedMesh && o.count === 0) o.count = 1; }
    });
    try { renderer.setRenderTarget(rt); renderer.render(scene, camera); if (post.composer) post.composer.render(); }
    catch (e) { console.warn('AVE precalentar:', e && e.message || e); }
    renderer.setRenderTarget(null);
    if (!capa31) camera.layers.disable(31);
    for (const [o, fc, vis, n] of guardado) { o.frustumCulled = fc; o.visible = vis; if (n != null) o.count = n; }
    rt.dispose();
  }
  function setCalidad(nivel, manual) {
    if (!PRESETS[nivel]) return calidad;
    const keep = { manual: !!manual || calidad.manual, gpu: GPU, objetivo: OBJETIVO, texMax: calidad.texMax };
    Object.assign(calidad, PRESETS[nivel], keep);
    aplicarSombras(calidad); aplicarPost(calidad); manchaJugador();
    G.emit('calidad', calidad);
    return calidad;
  }
  // Con sombra real, la mancha bajo el jugador queda como oclusión de contacto (más suave)
  function manchaJugador() { const A = G.actores; if (A && A.pShadow) A.pShadow.material.opacity = sun.castShadow ? 0.16 : 0.25; }
  G.on('listo', manchaJugador);
  function adaptCalidad(raw) {
    if (!(raw > 0 && raw < 120) || calidad.manual || fpsM.quieta) return;
    if (fpsM.warm > 0) { fpsM.warm -= raw; return; }
    if (G.ui && G.ui.worldHidden && G.ui.worldHidden()) return;   // portada o creador: el mundo no se dibuja
    const A = fpsM.arranque;
    if (!A.hecho) {
      A.t += raw; A.n++;
      if (A.t < 3000) return;
      A.hecho = true; A.fps = A.n * 1000 / A.t;
      const nivel = decidirArranque(A.fps, calidad.nivel, OBJETIVO);
      if (nivel !== calidad.nivel) { setCalidad(nivel); fpsM.bloqueo = 60000; fpsM.warm = 2500; return; }
    }
    fpsM.ms +=(raw - fpsM.ms) * 0.04; fpsM.t += raw; fpsM.bloqueo = Math.max(0, fpsM.bloqueo - raw);
    if (fpsM.t < 1000) return;
    fpsM.t = 0;
    const fps = 1000 / fpsM.ms, i = NIVELES.indexOf(calidad.nivel);
    const dprAlMinimo = renderer.getPixelRatio() <= DPR_MIN + 0.01;
    // Baja solo si no llega al objetivo y la resolución dinámica del TA ya está en su mínimo (primero actúa ella)
    fpsM.bajo = fps < OBJETIVO * 0.85 && dprAlMinimo ? fpsM.bajo + 1 : 0;
    fpsM.alto = fps > Math.min(58, OBJETIVO * 1.6) && renderer.getPixelRatio() >= DPR_MAX - 0.01 ? fpsM.alto + 1 : 0;
    if (fpsM.bajo >= 3 && i > 0) { setCalidad(NIVELES[i - 1]); fpsM.bajo = 0; fpsM.bloqueo = 60000; fpsM.warm = 2500; }
    else if (fpsM.alto >= 12 && !fpsM.bloqueo && i < 2 && fpsM.subidas < 2) { setCalidad(NIVELES[i + 1]); fpsM.alto = 0; fpsM.subidas++; fpsM.bloqueo = 20000; fpsM.warm = 2500; }
  }
  const medidor = { fps: 0, ms: 0, frames: 0, t0: performance.now() };
  function stats() {
    return { fps: Math.round(medidor.fps), calls: cuenta.ultimo.calls, triangulos: cuenta.ultimo.tris, calidad: calidad.nivel, dpr: renderer.getPixelRatio(), post: post.activo, sombras: sun.castShadow, gpu: GPU };
  }

  resize();

  // ---------- Contexto WebGL: pérdida y recuperación ----------
  // En un Chromebook el contexto se pierde al suspender, al cambiar de pestaña o cuando falta memoria de GPU. Al perderse, el
  // bucle y la simulación se detienen (G.S no cambia) y un aviso para niños (ES/EN, el idioma del aula) tapa el lienzo.
  // Al volver, three r128 rehace su estado (programas, buffers, texturas y render targets, con los ajustes de sombra) y
  // vuelve a subir todo desde la CPU: geometrías, instancias, imágenes, lienzos y DataTextures. El composer, el bloom y el
  // mapa de sombras se repintan solos en cada cuadro. Lo que solo vivía en la GPU lo repinta su módulo en el gancho
  // 'contexto' (G.on('contexto', ok => …): false al perderse y true al volver; hoy, el atlas de impostores de la flora).
  // Después se precalienta (compila y sube todo de una vez) y el juego sigue donde iba. Si no vuelve en 5 s, el aviso
  // ofrece Recargar: guarda la partida y recarga la página, y el guardado la retoma.
  // Regla para quien sube cosas a la GPU: no liberar los arreglos ni las imágenes después de subirlos (nada de
  // onUpload(dispose), image = null ni canvas.width = 0), porque three los vuelve a subir desde ahí.
  const CTX = { perdido: false, perdidas: 0, restauradas: 0, fase: '', timer: 0, el: null, foco: null };
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); perderContexto(); }, false);
  canvas.addEventListener('webglcontextrestored', () => restaurarContexto(), false);
  function perderContexto() {
    const ya = CTX.perdido;
    CTX.perdido = true;
    if (!ya) { CTX.perdidas++; if (G.pausa) G.pausa.set('contexto', true); G.emit('contexto', false); }
    avisoContexto('perdido');
    clearTimeout(CTX.timer);
    CTX.timer = setTimeout(() => { if (CTX.perdido) avisoContexto('tarda'); }, 5000);
  }
  function restaurarContexto() {
    clearTimeout(CTX.timer);
    avisoContexto('volviendo');
    // Una pausa corta para que se vea "¡Ya casi!" antes de compilar (en un Chromebook puede tardar uno o dos segundos). Con
    // setTimeout y no con requestAnimationFrame: en una pestaña o un panel ocultos no hay cuadros y la vuelta se quedaba
    // esperando (QA-24); el bucle sí espera a que la pestaña se vea.
    setTimeout(() => {
      if (renderer.getContext().isContextLost()) return; // se volvió a perder: lo atiende webglcontextlost
      try { G.emit('contexto', true); precalentar(); }
      catch (e) { console.warn('AVE contexto:', e && e.message || e); }
      CTX.perdido = false; CTX.restauradas++;
      // el tirón de compilar no cuenta para la calidad adaptativa ni para la resolución dinámica
      fpsM.warm = Math.max(fpsM.warm, 3000); dyn.t = dyn.slow = dyn.fast = 0;
      if (G.pausa) G.pausa.set('contexto', false);
      avisoContexto(null);
      start();
    }, 60);
  }
  const AVISO = {
    perdido: { ojo: ['Un momento', 'One moment'], t: ['La selva tomó un respiro', 'The forest is taking a breather'],
      d: ['Tu computadora pausó los gráficos. Tu partida está a salvo y en seguida seguimos.', 'Your computer paused the graphics. Your game is safe, and we will keep going in a moment.'] },
    volviendo: { ojo: ['Un momento', 'One moment'], t: ['¡Ya casi!', 'Almost there!'], d: ['Estamos preparando la selva otra vez…', 'We are getting the forest ready again…'] },
    tarda: { ojo: ['Un momento', 'One moment'], t: ['Esto está tardando', 'This is taking a while'],
      d: ['Pulsa Recargar para seguir jugando. Antes guardamos tu partida.', 'Press Reload to keep playing. We will save your game first.'], b: ['Recargar', 'Reload'] },
    sinGuardar: { ojo: ['Un momento', 'One moment'], t: ['No pudimos guardar', 'We could not save'],
      d: ['Si recargas, sigues desde tu último guardado. También puedes esperar un poco más.', 'If you reload, you will continue from your last save. You can also wait a little longer.'], b: ['Recargar igual', 'Reload anyway'] },
  };
  const AVISO_CSS = `
#av-contexto { position: fixed; inset: 0; z-index: calc(var(--z-title, 40) + 20); display: none; place-items: center; box-sizing: border-box;
  width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: var(--sp-4, 16px); border: 0; overflow: auto;
  color: var(--c-text, #f4f7f1); background: rgba(16, 36, 28, 0.9); background: color-mix(in srgb, var(--c-bg, #10241c) 90%, transparent);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  font-family: var(--font-body, system-ui, sans-serif); }
#av-contexto.abierto { display: grid; }
#av-contexto::backdrop { background: transparent; }
#av-contexto .avx-panel { position: relative; box-sizing: border-box; width: min(440px, 100%); margin-top: 52px; padding: 68px var(--sp-6, 24px) var(--sp-6, 24px);
  text-align: center; outline: none; background: var(--c-surface-solid, #132b21) radial-gradient(130% 80% at 50% 0%, rgba(127, 211, 143, 0.16), transparent 60%);
  border: 2px solid var(--c-line, rgba(127, 211, 143, 0.28)); border-radius: var(--r-xl, 28px); box-shadow: var(--sh-3, 0 24px 60px rgba(0, 0, 0, 0.5));
  animation: pop-in var(--dur-3, 420ms) var(--ease-pop, ease-out); }
#av-contexto .avx-ave { position: absolute; left: 50%; top: -54px; width: 108px; height: 108px; margin-left: -54px; border-radius: 50%;
  background: var(--c-surface-raised, #21463a) url("assets/vittata.png") 56% 16% / 170% no-repeat; box-shadow: var(--sh-2, 0 10px 28px rgba(0, 0, 0, 0.35)); }
#av-contexto .avx-ave::after { content: ""; position: absolute; inset: -8px; border-radius: 50%; border: 5px solid rgba(244, 247, 241, 0.14);
  border-top-color: var(--beak, #f2a03d); border-right-color: var(--leaf-hi, #7fd38f); animation: spin 1.3s linear infinite; }
#av-contexto[data-fase="tarda"] .avx-ave::after, #av-contexto[data-fase="sinGuardar"] .avx-ave::after { animation-duration: 2.6s; }
#av-contexto .avx-ojo { margin: 0; }
#av-contexto h2 { margin: var(--sp-2, 8px) 0; font: 700 var(--fs-2xl, 28px)/1.15 var(--font-display, system-ui, sans-serif); color: var(--c-text, #f4f7f1); }
#av-contexto .avx-d { margin: 0; font-size: var(--fs-lg, 18px); line-height: var(--lh-body, 1.5); color: var(--c-text-muted, #a9c2b1); }
#av-contexto .btn { margin-top: var(--sp-5, 20px); }
#av-contexto .btn[hidden] { display: none; }
@media (max-width: 420px) { #av-contexto h2 { font-size: var(--fs-xl, 22px); } #av-contexto .avx-d { font-size: var(--fs-md, 16px); } }`;
  function crearAviso() {
    const st = document.createElement('style'); st.id = 'av-contexto-css'; st.textContent = AVISO_CSS; document.head.appendChild(st);
    const el = document.createElement('div');
    el.id = 'av-contexto';
    el.setAttribute('role', 'alertdialog'); el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'avx-t'); el.setAttribute('aria-describedby', 'avx-d');
    el.innerHTML = '<div class="avx-panel" tabindex="-1"><div class="avx-ave" aria-hidden="true"></div><p class="eyebrow avx-ojo"></p>' +
      '<h2 id="avx-t"></h2><p class="avx-d" id="avx-d" aria-live="polite"></p><button class="btn xl" type="button" data-icon="reset" hidden></button></div>';
    // Popover manual: entra en la capa superior, por encima del menú de pausa y de la portada
    if (el.showPopover) el.setAttribute('popover', 'manual');
    el.querySelector('button').addEventListener('click', () => {
      let ok = false;
      try { ok = G.guardado.save(true) !== false; } catch (e) { ok = false; }
      if (!ok && CTX.fase !== 'sinGuardar') { avisoContexto('sinGuardar'); return; }
      location.reload();
    });
    document.body.appendChild(el);
    return el;
  }
  function avisoContexto(fase) {
    CTX.fase = fase || '';
    if (!fase) {
      const el = CTX.el; if (!el || !el.classList.contains('abierto')) return;
      el.classList.remove('abierto');
      try { if (el.matches(':popover-open')) el.hidePopover(); } catch (e) { /* sin popover */ }
      const f = CTX.foco; CTX.foco = null;
      if (f && f.isConnected && f.focus) try { f.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
      return;
    }
    const el = CTX.el || (CTX.el = crearAviso()), T = AVISO[fase];
    const en = G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 1 : 0;
    if (!el.classList.contains('abierto')) CTX.foco = document.activeElement;
    el.lang = en ? 'en' : 'es'; el.dataset.fase = fase;
    el.querySelector('.avx-ojo').textContent = T.ojo[en];
    el.querySelector('h2').textContent = T.t[en];
    el.querySelector('.avx-d').textContent = T.d[en];
    const b = el.querySelector('button'); b.hidden = !T.b; if (T.b) b.textContent = T.b[en];
    el.classList.add('abierto');
    try { if (el.showPopover && !el.matches(':popover-open')) el.showPopover(); } catch (e) { /* sin popover: z-index */ }
    try { (T.b ? b : el.querySelector('.avx-panel')).focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
  }

  // ---------- Panel de rendimiento: solo con ?fps=1 en la URL o #fps (el artifact solo pasa el ancla) ----------
  // Arriba a la derecha, bajo la fila superior del HUD (no pisa el diálogo ni los controles táctiles), sin eventos de puntero: FPS medio y mínimo del último segundo, draw calls, triángulos, calidad,
  // resolución dinámica (DPR actual / máximo) y memoria JS (performance.memory: Chrome y Android). Sin el parámetro no existe.
  const PERF = /(?:^|[?&])fps=1(?:&|$)/.test(location.search) || /^#(?:.*[&,])?fps(?:=1)?(?:[&,]|$)/.test(location.hash) ? { el: null, ms: [], t: 0 } : null;
  function perfCuadro(now, raw) {
    const P = PERF;
    if (raw > 0 && raw < 1000) { P.ms.push([now, raw]); while (now - P.ms[0][0] > 1000) P.ms.shift(); }
    if (now - P.t < 250 || !P.ms.length) return;
    P.t = now;
    if (!P.el) {
      P.el = document.createElement('div'); P.el.id = 'av-fps'; P.el.setAttribute('aria-hidden', 'true');
      P.el.style.cssText = 'position:fixed;right:max(12px,env(safe-area-inset-right,0px));top:calc(env(safe-area-inset-top,0px) + 140px);z-index:35;' +
        'pointer-events:none;padding:3px 9px;border-radius:8px;background:rgba(8,20,14,.78);color:#f4f7f1;white-space:pre;text-align:right;' +
        'font:600 11px/1.35 ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums';
      document.body.appendChild(P.el);
    }
    let suma = 0, max = 0; for (const [, m] of P.ms) { suma += m; max = Math.max(max, m); }
    const k = v => (v >= 1e6 ? (v / 1e6).toFixed(1) + ' M' : v >= 1e3 ? Math.round(v / 1e3) + ' k' : String(v));
    const mem = performance.memory ? ' · JS ' + Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '';
    P.el.textContent = Math.round(1000 * P.ms.length / suma) + ' FPS · mín ' + Math.round(1000 / max) + '\n' +
      cuenta.ultimo.calls + ' draw calls · ' + k(cuenta.ultimo.tris) + ' triángulos\n' +
      calidad.nivel + ' · DPR ' + renderer.getPixelRatio().toFixed(2) + '/' + DPR_MAX.toFixed(2) + mem;
    // Debajo de lo más bajo de la fila superior del HUD (objetivo desplegado en el móvil, botones del sistema): QA-33
    let y = 140;
    for (const id of ['quest', 'inv', 'sys']) { const e = document.getElementById(id), r = e && e.getBoundingClientRect(); if (r && r.height) y = Math.max(y, r.bottom + 8); }
    P.el.style.top = Math.round(y) + 'px';
  }

  // ---------- Simulación y dibujo ----------
  function update(dt) {
    const S = G.S;
    S.clock += dt;
    const busy = G.ui.busy();
    const moving = G.fisica.step(dt, busy);
    G.emit('update', dt, busy, moving);
    return moving;
  }
  let t = 0;
  function render(dt, moving) {
    t += dt;
    G.camara.follow(dt);
    G.emit('render', dt, t, moving);
    G.camara.fov(dt);
    G.camara.draw(dt);
  }
  let last = performance.now();
  // Draw calls del cuadro entero (con post hay varios render() por cuadro). No se toca info.autoReset: en r128 info.reset()
  // avanza info.render.frame y los esqueletos solo se actualizan cuando cambia; un render extra (cómic, retratos) los necesita.
  const cuenta = { calls: 0, tris: 0, ultimo: { calls: 0, tris: 0 } };
  const renderCrudo = renderer.render.bind(renderer);
  renderer.render = function (sc, cam) { renderCrudo(sc, cam); cuenta.calls += renderer.info.render.calls; cuenta.tris += renderer.info.render.triangles; };
  let vivo = false, cuadros = 0;
  function frame(now) {
    if (CTX.perdido) { vivo = false; return; } // sin contexto ni se simula ni se dibuja; restaurarContexto() lo reanuda
    if (last == null) last = now;
    cuadros++;
    cuenta.ultimo = { calls: cuenta.calls, tris: cuenta.tris }; cuenta.calls = cuenta.tris = 0;
    adaptDPR(now - last);
    adaptCalidad(now - last);
    if (PERF) perfCuadro(now, now - last);
    medidor.frames++;
    if (now - medidor.t0 > 500) { medidor.fps = medidor.frames * 1000 / (now - medidor.t0); medidor.frames = 0; medidor.t0 = now; }
    let dt = Math.min(0.05, (now - last) / 1000); last = now;
    const juice = G.camara.juice;
    if (juice.hitStop > 0) { juice.hitStop -= dt; dt = 0; } // hit-stop de 60 ms al capturar
    const moving = update(dt);
    // Con un overlay opaco (el creador) el mundo no se dibuja: una sola escena por cuadro
    if (!G.ui.worldHidden()) render(dt, moving);
    requestAnimationFrame(frame);
  }
  // Un solo bucle: llamar a start() con el bucle vivo no hace nada; al reanudar, el primer cuadro tiene dt = 0
  function start() { if (vivo) return; vivo = true; last = null; requestAnimationFrame(frame); }

  // Foto del mundo desde la cámara colocada al instante, recortada a w×h (JPEG en data URL; null si falla). Sin post: directo al lienzo.
  // Sin contexto WebGL devuelve null (el cómic reintenta después).
  function snapshot(w, h, quality) {
    if (CTX.perdido || renderer.getContext().isContextLost()) return null;
    try {
      G.camara.place(true);
      fogColorFor(false); seguirSombra();
      if (sky) sky.position.copy(camera.position);
      renderer.render(scene, camera);
      fogColorFor(post.activo);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      const sw = canvas.width, sh = canvas.height, ar = w / h;
      let cw = sw, ch = sw / ar; if (ch > sh) { ch = sh; cw = sh * ar; }
      x.drawImage(canvas, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
      return c.toDataURL('image/jpeg', quality);
    } catch (e) { return null; }
  }

  // ---------- Prueba de calidad automática (A3): equipos simulados, sin tocar la calidad real; también corre en contextTest ----------
  function calidadTest() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const p = e => perfilEquipo(Object.assign({ software: false, modesto: false, movil: false, chromeos: false, nucleos: 0, memoria: 0 }, e));
    const casos = [
      ['Equipo potente (GPU dedicada, 12 núcleos, 8 GB) sigue en alto', { nucleos: 12, memoria: 8 }, 'alto'],
      ['Navegador que no dice núcleos ni memoria y GPU buena: alto', {}, 'alto'],
      ['Chromebook de 4 núcleos y 4 GB arranca en bajo', { chromeos: true, modesto: true, nucleos: 4, memoria: 4 }, 'bajo'],
      ['Móvil de 8 núcleos y 8 GB arranca en medio', { movil: true, modesto: true, nucleos: 8, memoria: 8 }, 'medio'],
      ['Móvil de 4 GB arranca en bajo', { movil: true, modesto: true, nucleos: 8, memoria: 4 }, 'bajo'],
      ['Portátil con GPU integrada arranca en medio', { modesto: true, nucleos: 8, memoria: 8 }, 'medio'],
      ['Escritorio de 4 núcleos arranca en medio', { nucleos: 4, memoria: 8 }, 'medio'],
      ['Equipo de 2 GB arranca en bajo', { nucleos: 8, memoria: 2 }, 'bajo'],
      ['GPU por software arranca en bajo', { software: true, nucleos: 16, memoria: 8 }, 'bajo'],
    ];
    for (const [nombre, e, nivel] of casos) { const r = p(e); check(nombre, r.nivel === nivel, r.nivel + (r.motivos.length ? ' (' + r.motivos.join(', ') + ')' : '')); }
    const d = (fps, n) => decidirArranque(fps, n, 55);
    check('Arranque: a 60 FPS no cambia la calidad', d(60, 'alto') === 'alto' && d(60, 'medio') === 'medio');
    check('Arranque: a 40 FPS baja un nivel', d(40, 'alto') === 'medio' && d(40, 'medio') === 'bajo');
    check('Arranque: a 20 FPS va directo a bajo', d(20, 'alto') === 'bajo');
    check('Arranque: nunca sube ni baja de bajo', d(10, 'bajo') === 'bajo' && d(0, 'alto') === 'alto');
    check('Este equipo: perfil coherente con la calidad inicial', calidad.manual || PRESETS[PERFIL.nivel] && inicial === PERFIL.nivel,
      PERFIL.nivel + ' · ' + (EQUIPO.nucleos || '?') + ' núcleos · ' + (EQUIPO.memoria || '?') + ' GB · ' + (GPU || 'GPU sin nombre').slice(0, 60) +
      (fpsM.arranque.hecho ? ' · arranque ' + Math.round(fpsM.arranque.fps) + ' FPS' : ''));
    // Post por niveles (26-A)
    check('Post por niveles: bajo sin composer, medio bloom a 1/4, alto bloom a 1/2', PRESETS.bajo.post === 0 && PRESETS.medio.post === 1 && PRESETS.alto.post === 2 &&
      BLOOM[1].escala === 0.25 && BLOOM[1].fuerza <= BLOOM[2].fuerza && BLOOM[2].escala === 0.5);
    check('Gradación en el tone mapping (sin composer): ACES + saturación y contraste', !THREE.ShaderChunk.tonemapping_pars_fragment.includes(CUSTOM_TM) &&
      /CustomToneMapping[^}]*ACESFilmicToneMapping/.test(THREE.ShaderChunk.tonemapping_pars_fragment));
    const quiere = calidad.post > 0 && renderer.capabilities.isWebGL2 && ATMOS;
    if (post.activo) {
      const bw = post.bloom.renderTargetBright.width, dw = renderer.getDrawingBufferSize(new THREE.Vector2()).x, B = BLOOM[calidad.post >= 2 ? 2 : 1];
      check(`Este equipo (${calidad.nivel}): composer con bloom a ${B.escala === 0.25 ? '1/4' : '1/2'}, viñeta y ACES sin gradar dos veces`,
        renderer.toneMapping === THREE.ACESFilmicToneMapping && Math.abs(bw - dw * B.escala) <= 2 && post.bloom.strength === B.fuerza && post.grade.uniforms.uVig.value > 0, bw + ' de ' + dw + ' px');
    } else if (!quiere || !post.cargando) check(`Este equipo (${calidad.nivel}): sin composer, gradación en el tone mapping`, renderer.toneMapping === THREE.CustomToneMapping);
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  // ---------- Prueba de pérdida de contexto: AV.contextTest({ rapido }) ----------
  // Pierde y recupera el contexto de verdad (WEBGL_lose_context) con el mundo quieto (pausa de prueba, dt = 0) y comprueba la
  // pausa y el aviso, el bucle detenido, Recargar a los 5 s (rapido: true lo salta), que al volver se dibuja el mismo mundo
  // (píxeles del lienzo antes y después: texturas, mallas e instancias), el atlas de impostores, el post y las sombras, G.S intacta
  // y la consola limpia.
  async function contextTest(opts) {
    opts = opts || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const fin = () => ({ passed: out.filter(o => o.ok).length, total: out.length, results: out });
    out.push(...calidadTest().results); // calidad automática (A3)
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const hasta = async (fn, ms) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) return false; await espera(40); } return true; };
    const enCuadros = async n => { const c0 = cuadros; await hasta(() => cuadros >= c0 + n, 5000); };
    const pct = v => (v * 100).toFixed(1) + ' %';
    const gl = renderer.getContext(), ext = gl.getExtension('WEBGL_lose_context');
    if (!ext || CTX.perdido) { check('Se puede simular la pérdida (WEBGL_lose_context, contexto vivo)', false, ext ? 'el contexto ya está perdido' : 'sin la extensión'); return fin(); }
    // Lienzo: dibuja el mundo y lee sus píxeles en la misma tarea (sin preserveDrawingBuffer)
    const foto = () => {
      drawScene(camera); renderer.setRenderTarget(null);
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return { w, h, px };
    };
    // caja: rectángulo (en % del lienzo, y hacia abajo) donde caen los píxeles distintos, para saber qué cambió si falla
    const comparar = (A, B) => {
      let n = 0, vivos = 0, vivosA = 0, distintos = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let i = 0; i < B.px.length; i += 12) {
        n++; const a = A.px, b = B.px;
        if (b[i] + b[i + 1] + b[i + 2] > 30) vivos++;
        if (a[i] + a[i + 1] + a[i + 2] > 30) vivosA++;
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 48) {
          distintos++; const p = i >> 2, x = p % B.w, y = B.h - 1 - Math.floor(p / B.w);
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      const caja = x1 < 0 ? '' : ' en x ' + Math.round(100 * x0 / B.w) + '–' + Math.round(100 * x1 / B.w) + ' %, y ' + Math.round(100 * y0 / B.h) + '–' + Math.round(100 * y1 / B.h) + ' %';
      return { vivos: vivos / n, vivosA: vivosA / n, distintos: A.w === B.w && A.h === B.h ? distintos / n : 1, caja };
    };
    const atlas = () => {
      const rt = G.vegetacion && G.vegetacion.atlas; if (!rt) return null;
      const px = new Uint8Array(rt.width * rt.height * 4); renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, px);
      let cubre = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 127) cubre++;
      return { w: rt.width, h: rt.height, px, cubre: cubre / (rt.width * rt.height) };
    };
    // Mundo asentado antes de cada foto (QA-30): después de otras baterías puede quedar streaming por colocar o sólidos por
    // añadir (la cámara choca con ellos). Termina lo pendiente y repite la foto hasta que dos seguidas (3 cuadros entre ellas)
    // coincidan. Se cuenta en cuadros y no en milisegundos: con la máquina cargada un cuadro tarda mucho más.
    // Si el jugador no se ha movido desde el inicio, el streaming deja a propósito modelos en cola hasta que se mueva y
    // terminar() no acaba nunca (la prueba se colgaba en una partida recién abierta): esa espera llega como mucho a 240 cuadros.
    const asentar = async () => {
      const ST = G.mundo && G.mundo.streaming;
      if (ST && ST.terminar) { let hecho = false; ST.terminar().then(() => { hecho = true; }); const c0 = cuadros; await hasta(() => hecho || cuadros >= c0 + 240, 60000); }
      if (G.solidos && G.solidos.terminar) G.solidos.terminar();
      await enCuadros(3);
      let f = foto(), ruido = 1;
      for (let i = 0; i < 10 && ruido >= 0.005; i++) {
        await enCuadros(3);
        const g = foto(); ruido = comparar(f, g).distintos; f = g;
      }
      return { f, ruido };
    };
    const errores = [], ce = console.error, e0 = (window.__aveErrores || []).length;
    console.error = function () { errores.push([].map.call(arguments, String).join(' ').slice(0, 160)); return ce.apply(console, arguments); };
    const idioma = G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 'en' : 'es';
    // Causa de QA-30: el haz guía y su flecha laten con el reloj real (misiones.js le pasa performance.now()) aunque el mundo
    // esté en pausa; con el haz cerca de la cámara cubre una franja del lienzo y entre la foto de antes y la de después su
    // brillo cambiaba hasta un 2,4 % de los píxeles. Durante la prueba quedan quietos en un instante fijo (se siguen dibujando).
    // La calidad adaptativa tampoco cambia a mitad de la prueba.
    const guia0 = G.fx && G.fx.guide;
    if (guia0) G.fx.guide = tg => guia0(tg, 0);
    fpsM.quieta = true;
    try {
      await Promise.resolve(G.vegetacion && G.vegetacion.listo);
      if (G.pausa) G.pausa.set('prueba-contexto', true);
      const { f: A, ruido } = await asentar();
      const atA = atlas(), estado = JSON.stringify(G.S), r0 = CTX.restauradas;
      const conPost = post.activo, conSombra = sun.castShadow;
      const t0 = performance.now();
      ext.loseContext();
      // Esperas largas por condición (pérdida y vuelta): con la máquina cargada, compilar al volver llegó a tardar 25 s
      check('Detecta la pérdida y pausa el juego', await hasta(() => CTX.perdido, 15000) && (!G.pausa || G.pausa.activa()), Math.round(performance.now() - t0) + ' ms');
      const el = CTX.el, abierto = () => !!el && el.classList.contains('abierto');
      check('Aviso para niños visible, en el idioma del juego', abierto() && el.lang === idioma && el.querySelector('h2').textContent.length > 5 &&
        el.getBoundingClientRect().width > 0, el ? idioma + ' · ' + el.querySelector('h2').textContent : 'sin aviso');
      const reloj = G.S.clock, n0 = cuadros; await espera(400);
      check('Sin contexto se detienen el bucle y la simulación', cuadros === n0 && G.S.clock === reloj, (cuadros - n0) + ' cuadros en 400 ms');
      check('Sin contexto snapshot() devuelve null (el cómic reintenta)', snapshot(64, 36, 0.8) === null);
      if (!opts.rapido) {
        await espera(5300);
        const b = el && el.querySelector('button');
        check('Si no vuelve en 5 s ofrece Recargar', CTX.fase === 'tarda' && b && !b.hidden && b.getBoundingClientRect().width > 0 && document.activeElement === b, b && b.textContent);
      }
      const t1 = performance.now();
      ext.restoreContext();
      check('El contexto vuelve, el juego sigue y el aviso se cierra', await hasta(() => CTX.restauradas > r0 && !CTX.perdido, 90000) && !abierto(),
        Math.round(performance.now() - t1) + ' ms');
      const B = (await asentar()).f, cmp = comparar(A, B);
      // Relativo a la foto de antes (una vista con sombra o cielo oscuro tiene menos píxeles claros; QA-30)
      check('Después se dibuja el mundo (píxeles no negros)', cmp.vivos > 0.5 && cmp.vivos >= cmp.vivosA - 0.02, pct(cmp.vivosA) + ' → ' + pct(cmp.vivos) + ' con color');
      check('El mundo se ve igual que antes de perderse', cmp.distintos < 0.02, pct(cmp.distintos) + ' de píxeles distintos' +
        (cmp.distintos >= 0.02 ? cmp.caja : '') + ' (ruido antes ' + pct(ruido) + ', calidad ' + calidad.nivel + ')');
      if (atA) {
        const atB = atlas(); let d = 0; for (let i = 0; i < atA.px.length; i += 16) if (Math.abs(atA.px[i] - atB.px[i]) > 8) d++;
        check('El atlas de impostores de la flora se repintó', atB.cubre > 0.05 && Math.abs(atB.cubre - atA.cubre) < 0.01 && d / (atA.px.length / 16) < 0.01,
          'cobertura ' + pct(atA.cubre) + ' → ' + pct(atB.cubre));
      }
      if (conPost) check('Vuelven el composer y el bloom', post.activo && !!renderer.properties.get(post.composer.renderTarget1.texture).__webglTexture);
      if (conSombra) check('Vuelven las sombras', renderer.shadowMap.enabled && sun.castShadow && !!sun.shadow.map && !!renderer.properties.get(sun.shadow.map.texture).__webglTexture);
      check('La partida (G.S) no cambia', JSON.stringify(G.S) === estado);
      const nuevos = (window.__aveErrores || []).slice(e0);
      check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      console.error = ce;
      if (guia0) G.fx.guide = guia0;
      fpsM.quieta = false;
      if (gl.isContextLost()) { try { ext.restoreContext(); } catch (e) { /* ya volvía */ } }
      await hasta(() => !CTX.perdido, 90000);
      if (G.pausa) G.pausa.set('prueba-contexto', false);
    }
    return fin();
  }

  return { renderer, scene, camera, canvas, MOBILE, DEVICE_DPR, REDUCED, linMat, linearize, resize, update, render, start, snapshot, drawScene,
    sun, hemi, sky, sunDir, calidad, setCalidad, PRESETS, stats, post, ATMOS, niebla: { srgb: fogSRGB, lin: fogLin }, get t() { return t; },
    contexto: { get perdido() { return CTX.perdido; }, get perdidas() { return CTX.perdidas; }, get restauradas() { return CTX.restauradas; } }, contextTest, calidadTest, equipo: PERFIL };
});
