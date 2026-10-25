/* AVE · renderer
   WebGL, color (sRGB + ACES, igual que el creador y el retrato), escena, luces, cielo, niebla, sombras, post-proceso,
   calidad adaptativa y bucle principal.
   Bucle: update(dt) = reloj + G.fisica.step + gancho 'update'; render(dt) = G.camara.follow + gancho 'render' + G.camara.draw
   (que llama a drawScene: post-proceso si está activo, si no render directo).
   Calidad: presets bajo / medio / alto (calidad, setCalidad). Se elige por GPU y se ajusta por FPS; cada cambio emite el gancho
   'calidad' (G.on('calidad', C => …)) para que terreno, vegetación y agua bajen o suban su detalle. ?calidad=bajo fija uno.
   Datos del pack: mundo.cielo { color (horizonte), cenit, sol, niebla: [inicio, extincion], nieblaAltura: [h0, escala] },
   mundo.luces { cielo, suelo, hemi, sol, solInt, solPos }, mundo.exposicion, mundo.post { saturacion, contraste, bloom }.
   Sin cielo.cenit se usa el fondo plano de antes (plantillas viejas). */
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
  // sombras: tamaño del mapa (0 = sin sombras); post: 0 nada, 2 bloom + gradación; flora: densidad; floraDist: distancia relativa
  const PRESETS = {
    bajo: { nivel: 'bajo', sombras: 0, sombraRadio: 0, sombraTerreno: false, post: 0, normalesSuelo: false, dosEscalas: false, texMax: 512, flora: 0.5, floraDist: 0.55, pasto: 0, sombraFlora: false, agua: 0, particulas: 0.4 },
    medio: { nivel: 'medio', sombras: 1024, sombraRadio: 22, sombraTerreno: false, post: 0, normalesSuelo: true, dosEscalas: false, texMax: 1024, flora: 0.8, floraDist: 0.8, pasto: 0.6, sombraFlora: true, agua: 1, particulas: 0.7 },
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
  const fromUrl = new URLSearchParams(location.search).get('calidad');
  const inicial = NIVELES.includes(fromUrl) ? fromUrl : SOFTWARE ? 'bajo' : MODEST ? 'medio' : 'alto';
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

  function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (post.composer) post.resize(); }
  addEventListener('resize', resize);

  // ---------- Post-proceso opcional (alto): bloom suave + gradación, con EffectComposer de r128 ----------
  // El render target es multisample (WebGL2) y de media precisión: guarda el color ya con ACES (r128 lo aplica en cada material)
  // en lineal; el último pase gradúa y codifica a sRGB, así el color final es el mismo que sin post.
  const PP = W.post || {};
  // Scripts del post (three r128 examples/js): primero la copia local del repo (assets/vendor/three/examples/js/, sin
  // peticiones a terceros; ver docs/equipo/SEGURIDAD_INFANTIL.md); si no está, jsDelivr con versión exacta, salvo que
  // AVE.config.sinTerceros esté activo (entonces no hay post).
  const LOCAL = 'assets/vendor/three/examples/js/', CDN = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/';
  const POST_JS = ['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js',
    'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'];
  const post = { activo: false, composer: null, cargando: null, bloom: null, grade: null, origen: null };
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
        const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), PP.bloom != null ? PP.bloom : 0.22, 0.45, 0.9);
        comp.addPass(bloom);
        const grade = new THREE.ShaderPass({
          uniforms: { tDiffuse: { value: null }, uSat: { value: PP.saturacion != null ? PP.saturacion : 1.08 }, uCon: { value: PP.contraste != null ? PP.contraste : 1.04 },
            uTint: { value: new THREE.Vector3(1.0, 0.995, 0.985) }, uVig: { value: PP.vineta != null ? PP.vineta : 0.18 } },
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
        post.resize = () => { comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(innerWidth, innerHeight); };
        post.resize();
      });
    return post.cargando;
  }
  G.on('dpr', () => { if (post.composer) post.resize(); });
  function aplicarPost(C) {
    const want = C.post > 0 && renderer.capabilities.isWebGL2 && ATMOS;
    if (!want) { post.activo = false; fogColorFor(false); return; }
    cargarPost().then(() => { post.activo = calidad.post > 0; fogColorFor(post.activo); }).catch(e => { console.warn('AVE post:', e && e.message || e); post.activo = false; fogColorFor(false); });
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
  const fpsM = { ms: 16.7, t: 0, bajo: 0, alto: 0, bloqueo: 0, subidas: 0, warm: Infinity };
  G.on('mundoListo', () => { Promise.resolve(G.vegetacion && G.vegetacion.listo).then(() => requestAnimationFrame(() => { precalentar(); fpsM.warm = 3000; })); });
  // Un solo controlador a la vez: cuando la resolución dinámica del TA cambia el DPR, los presets esperan a que se asiente
  G.on('dpr', () => { fpsM.bajo = 0; fpsM.alto = 0; fpsM.warm = Math.max(fpsM.warm, 2500); });
  // Precalentar: compila los programas y sube todas las texturas del mundo en un render fuera de pantalla (32×32), con todo
  // visible y sin frustum culling, antes de que el jugador mire alrededor (sin esto cada vista nueva daba tirones: QA-20)
  function precalentar() {
    const rt = new THREE.WebGLRenderTarget(32, 32), guardado = [];
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
    if (!(raw > 0 && raw < 120) || calidad.manual) return;
    if (fpsM.warm > 0) { fpsM.warm -= raw; return; }
    if (G.ui && G.ui.worldHidden && G.ui.worldHidden()) return;   // portada o creador: el mundo no se dibuja
    fpsM.ms += (raw - fpsM.ms) * 0.04; fpsM.t += raw; fpsM.bloqueo = Math.max(0, fpsM.bloqueo - raw);
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
  function frame(now) {
    cuenta.ultimo = { calls: cuenta.calls, tris: cuenta.tris }; cuenta.calls = cuenta.tris = 0;
    adaptDPR(now - last);
    adaptCalidad(now - last);
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
  function start() { requestAnimationFrame(frame); }

  // Foto del mundo desde la cámara colocada al instante, recortada a w×h (JPEG en data URL; null si falla). Sin post: directo al lienzo.
  function snapshot(w, h, quality) {
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

  return { renderer, scene, camera, canvas, MOBILE, DEVICE_DPR, REDUCED, linMat, linearize, resize, update, render, start, snapshot, drawScene,
    sun, hemi, sky, sunDir, calidad, setCalidad, PRESETS, stats, post, ATMOS, get t() { return t; } };
});
