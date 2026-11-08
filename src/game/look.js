/* Juego · Looks de color: «vibrant_toon» (Vibrant Toon Refinado, el look de fábrica desde el 26-oct por decisión de Kelvin),
   y las variantes de la prueba A/B («vibrante», «soleado», «toon») y el original («fabrica»: lo que había antes, para comparar).
   Lo carga boot.js al arrancar (window.AVLook(G)), antes del primer cuadro del mundo (la portada lo tapa). Sin look activo este
   módulo no cambia ni un byte de los shaders ni de los valores del pack; cada look guarda lo que pisa y lo devuelve al quitarse.
   Cómo se elige: ?look=vibrant_toon|fabrica|… en la URL (manda sobre todo), sessionStorage 'ave.look' (lo que se eligió en la
   pausa) o DEFECTO. La sección «Look» del menú de pausa está oculta (se ve con ?look=… o con localStorage 'ave.look.dev' = '1').
   Con un look activo la gradación de fábrica de renderer.js (W1: uSat/uCon/uTint del composer, o CustomToneMapping en bajo) se
   sustituye por la del look (no se suman); el cielo vivo (C1), el clima y el atardecer siguen mandando sobre sus uniformes.
   Qué toca cada look (todo en vivo, sin recargar):
   - Gradación global barata: saturación, contraste y calidez después del ACES, en el ShaderChunk tonemapping_fragment (afecta a
     todos los materiales con tone mapping, también al cielo y a las nubes; los sprites toneMapped = false quedan fuera). Son
     constantes del shader, así que al cambiar de look se recompilan los programas (un tirón de 0,5 a 2 s); la clave de caché de
     los programas lleva el nombre del look (Material.prototype.customProgramCacheKey) para que three no reutilice uno viejo.
   - Luz: sol más cálido, relleno hemisférico azulado (las sombras quedan con tinte azul, no grises), exposición.
   - Cielo y niebla: cenit y horizonte más azules y claros, niebla más lejos; el agua recibe los mismos colores de cielo.
   - Flora y terreno: saturación del splat del suelo (uSat) y tinte de las hojas.
   - toon: rampa suave en la luz directa de Phong (suelo, rocas, corteza) y Lambert (hojas, props); los materiales Standard y
     Physical (Vittata, personajes) no se tocan. Además, texturas del mundo a 512 px como máximo (más liviano).
   - ?tex=512 (o 256) fuerza ese tope de texturas con cualquier look, para medir.
   API: AV.look = { aplicar(nombre), quitar(), actual, LOOKS, medir(), DEFECTO }. Prueba: AV.lookTest(). */
window.AVLook = function (G) {
  'use strict';
  const R = G.renderer, W = G.pack.mundo || {}, $ = G.util.$;
  const SC = THREE.ShaderChunk;
  const ORIG = { tone: SC.tonemapping_fragment, pars: SC.tonemapping_pars_fragment, phong: SC.lights_phong_pars_fragment, lambert: SC.lights_lambert_vertex };
  const DEFECTO = 'vibrant_toon'; // ← el look de fábrica (decisión de Kelvin, 26-oct: docs/DECISION_LOG.md). ?look=fabrica muestra el original.
  const LOOKS = {
    vibrante: {
      titulo: 'Vibrante', exposicion: 0.82,
      grade: { sat: 1.3, con: 1.08, tint: [1.02, 1.0, 0.96] },
      cielo: { cenit: '#1b74e6', horizonte: '#a8e0ff', sol: '#fff4d6' },
      niebla: { color: '#b4e2ff', inicio: 70, fin: 1400 },
      luces: { cielo: '#9fcfff', suelo: '#4f7f2a', hemi: 0.8, sol: '#ffe6b8', solInt: 2.2 },
      terrenoSat: 1.25, hoja: [0.95, 1.1, 0.85],
    },
    soleado: {
      titulo: 'Soleado', exposicion: 0.8,
      grade: { sat: 1.15, con: 1.05, tint: [1.03, 1.0, 0.97] },
      cielo: { cenit: '#2a86de', horizonte: '#bfe6fb', sol: '#fff2cf' },
      niebla: { color: '#c2e6fb', inicio: 60, fin: 1200 },
      luces: { cielo: '#bcd8ff', suelo: '#4c6e2c', hemi: 0.72, sol: '#ffe9c0', solInt: 2.15 },
      terrenoSat: 1.1, hoja: [0.98, 1.05, 0.92],
    },
    toon: {
      titulo: 'Toon', exposicion: 0.84,
      grade: { sat: 1.35, con: 1.1, tint: [1.02, 1.0, 0.96] },
      cielo: { cenit: '#1b74e6', horizonte: '#a8e0ff', sol: '#fff4d6' },
      niebla: { color: '#b4e2ff', inicio: 70, fin: 1400 },
      luces: { cielo: '#a6d2ff', suelo: '#548a2c', hemi: 0.9, sol: '#ffe6b8', solInt: 1.9 },
      terrenoSat: 1.3, hoja: [0.95, 1.12, 0.85], toon: true, texMax: 512,
    },
    // «Vibrant Toon Refinado» (decisión de dirección de arte del 26-oct, docs/equipo/DECISION_VISUAL_2026.md): toon como base,
    // refinado. Prototipo: DEFECTO no cambia; Fernando decide la integración. Qué refina respecto a toon:
    // - gradación con rodilla: la saturación baja en las altas luces y hay un hombro suave (no quema cielo, agua ni plumas claras);
    // - rampa toon a medias (mezcla 40 % con el Lambert normal): rocas y ruinas conservan relieve;
    // - bosque con variación: tinte por especie (paleta por material de hoja, con límites) y por altura (copas más cálidas y
    //   claras, bajos más fríos), en el shader de la hoja;
    // - paleta unificada: rocas frías, corteza cálida, ruinas color piedra cálida, cielo y agua con el mismo azul, sombras azuladas;
    // - borde de luz (rim) en los personajes (mallas con esqueleto: Vittata, cotorras, bandada): un define AV_RIM en su material
    //   Standard; ni geometría, ni rig, ni texturas se tocan y al quitar el look el define desaparece.
    vibrant_toon: {
      // 28-oct (Kelvin: «muy saturado, con mucho brillo; equilibra la iluminación»): sat 1.24 → 1.12, contraste 1.07 → 1.05,
      // exposición 0.78 → 0.76, sol 2.05 → 1.95, terreno 1.1 → 1.05, hojas y tintes de especie con menos recorte de azul.
      titulo: 'Vibrant Toon', exposicion: 0.76,
      grade: { sat: 1.12, con: 1.05, tint: [1.01, 1.0, 0.975], rodilla: true },
      cielo: { cenit: '#1e78e8', horizonte: '#b4e4ff', sol: '#fff4d6' },
      niebla: { color: '#b8e4ff', inicio: 80, fin: 1500 },
      luces: { cielo: '#a8d4ff', suelo: '#4a7a34', hemi: 0.84, sol: '#ffe8c0', solInt: 1.95 },
      terrenoSat: 1.05, hoja: [0.97, 1.04, 0.9], toon: true, texMax: 512,
      refinado: {
        rampa: [-0.05, 0.6, 0.55],                                     // smoothstep(a, b) mezclado con saturate() al 55 %
        especies: [[1.0, 1.0, 1.0], [1.08, 1.03, 0.82], [0.86, 1.01, 1.0], [0.98, 1.06, 0.9], [1.1, 0.97, 0.86]], // por material de hoja
        altura: { bajo: [0.72, 0.9, 0.92], alto: [1.08, 1.04, 0.88], h0: 0.5, h1: 9 }, // tinte por altura local (m)
        tintes: { roca: [0.9, 0.93, 1.0], corteza: [1.06, 0.96, 0.86], 'av-hd-atlas': [1.02, 1.0, 0.94] },
        rim: { color: [0.75, 0.88, 1.0], int: 0.55, borde: [0.55, 1.0] }, // color (lineal), fuerza y rango del borde
      },
      // Noche permitida (cap. 5, mundo.cielo.permiso = 'noche'): misma gradación y mismo toon; cielo atmosférico, no un fondo plano.
      // BM127: la noche anterior (sol cálido 1,35 alto en el cielo, cenit #24366e) se veía de día en la Mac con GPU. Ahora es
      // luz de luna: fría y baja (la altura la da luces.solPos del pack), con cielo y niebla de noche. [KELVIN] valores de arte.
      // v2 (Kelvin 2-nov: «demasiado oscuro; misterio, pero que el jugador se oriente»): más relleno frío del cielo (las formas
      // del suelo y los caminos se leen), luna más clara, horizonte más claro que la niebla (las crestas se recortan contra él),
      // niebla más lejos, edificios con tinte de luna (no gris plano) y borde de luna en paredes, troncos y rocas.
      noche: {
        exposicion: 0.72,
        // QA-106/KIMI-111: el «sol» del cielo es la luna: disco más pequeño (0,5) y sin quemar (0,45 del ×3.2): el disco
        // blanco entero sobre las ruinas leía como un parche en la pared a Kelvin (iPad).
        cielo: { cenit: '#0d1840', horizonte: '#43588c', sol: '#c4cdea', disco: [0.5, 0.45] },
        niebla: { color: '#2f3f66', inicio: 60, fin: 900 },
        luces: { cielo: '#8299dc', suelo: '#28343f', hemi: 0.85, sol: '#c2d0ff', solInt: 1.0 },
        hoja: [0.66, 0.8, 0.98],                                                   // follaje de noche: verde frío, no el de mediodía
        tintes: { roca: [0.86, 0.93, 1.1], corteza: [0.92, 0.9, 0.98], 'av-hd-atlas': [0.84, 0.93, 1.18], edificio: [0.8, 0.88, 1.12], flora: [0.7, 0.82, 0.98] }, // edificio: mallas edificios*/estructura:; flora: flora:*
        rim: { color: [0.62, 0.78, 1.0], int: 0.75, borde: [0.5, 1.0] },           // personajes: el mismo borde, más frío y fuerte
        rimMundo: { color: [0.5, 0.64, 1.0], int: 0.55, borde: [0.45, 1.0] },     // Phong (suelo, rocas, edificios): solo caras de lado
      },    },
  };
  const NOMBRES = Object.keys(LOOKS);
  const NOCHE = !!(W.cielo && W.cielo.permiso === 'noche'); // el capítulo pide la noche del look (cap. 5)
  const nocheDe = L => (NOCHE && L && L.noche) || null;
  const q = new URLSearchParams(location.search);
  const TEX_URL = +q.get('tex') || 0;
  let actual = null;   // look activo (null = fábrica)
  // renderer.js expone niebla { srgb, lin } (los colores que repone fogColorFor); si una versión no lo trae, se usan propios
  const NB = R.niebla || { srgb: new THREE.Color((W.cielo && W.cielo.color) || '#bfe1d6'), lin: new THREE.Color((W.cielo && W.cielo.color) || '#bfe1d6').convertSRGBToLinear() };
  let base = null;     // lo que había antes del primer look (se guarda una vez, se devuelve al quitar)

  // ---------- Clave de caché de los programas: lleva el look (sin look, idéntica a la de three) ----------
  const keyProto = THREE.Material.prototype.customProgramCacheKey;
  const sufijo = () => (actual ? '|look:' + actual : '');
  THREE.Material.prototype.customProgramCacheKey = function () { return keyProto.call(this) + sufijo(); };
  const propias = new WeakMap(); // materiales con clave propia (splat, hoja, corteza…): se envuelve una vez
  function envolverClave(m) {
    if (!Object.prototype.hasOwnProperty.call(m, 'customProgramCacheKey') || propias.has(m)) return;
    const k = m.customProgramCacheKey; propias.set(m, k);
    // |ref: la hoja con el onBeforeCompile envuelto (refinado) no puede reutilizar el programa compilado antes de envolverla
    m.customProgramCacheKey = () => k() + sufijo() + (obcOriginal.has(m) && m.onBeforeCompile !== obcOriginal.get(m) ? '|ref' : '');
  }
  const claveOriginal = m => { const k = propias.get(m); return k ? k() : null; };

  // ---------- Shaders: gradación, rampa toon ----------
  const f = v => (Math.round(v * 1000) / 1000).toFixed(3);
  function chunkTone(L) {
    const g = L.grade, t = g.tint, Rf = L.refinado;
    // Con rodilla: la saturación cae hacia 1 en las altas luces (l > 0,78) y un hombro suave recorta lo que pasa de 0,9 (no quema)
    const satExpr = g.rodilla ? `mix( ${f(g.sat)}, 1.0, smoothstep( 0.78, 1.0, l ) )` : f(g.sat);
    const extra = [
      '\t{ vec3 c = sqrt( max( gl_FragColor.rgb, 0.0 ) ); float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );',
      `\t  c = mix( vec3( l ), c, ${satExpr} ); c = ( c - 0.5 ) * ${f(g.con)} + 0.5;`,
      g.rodilla ? '\t  c = c - 0.6 * max( c - 0.9, 0.0 );' : '',
      `\t  c = max( c * vec3( ${f(t[0])}, ${f(t[1])}, ${f(t[2])} ), 0.0 ); gl_FragColor.rgb = c * c; }`,
    ].filter(Boolean).join('\n');
    const linea = 'gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );';
    let out = ORIG.tone.includes(linea) ? ORIG.tone.replace(linea, linea + '\n' + extra) : ORIG.tone;
    // Borde de luz en los personajes: antes del tone mapping, solo en el shader físico (STANDARD) y solo si el material lleva
    // el define AV_RIM (lo ponen tocar() en las mallas con esqueleto). normal, vViewPosition y diffuseColor son los de meshphysical.
    const N = nocheDe(L);
    if (Rf && Rf.rim) {
      const r = (N && N.rim) || Rf.rim, c = r.color, b = r.borde;
      out = [
        '#if defined( STANDARD ) && defined( AV_RIM )',
        `\t{ float avRim = smoothstep( ${f(b[0])}, ${f(b[1])}, 1.0 - saturate( dot( normalize( vViewPosition ), normal ) ) );`,
        '\t  float avL = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );',
        `\t  gl_FragColor.rgb += vec3( ${f(c[0])}, ${f(c[1])}, ${f(c[2])} ) * ( avRim * ${f(r.int)} * ( 0.3 + 0.7 * smoothstep( 0.0, 0.4, avL ) ) ); }`,
        '#endif',
      ].join('\n') + '\n' + out;
    }
    // De noche, borde de luna en el mundo Phong (suelo, rocas, corteza, edificios): solo en las caras de lado (paredes, troncos,
    // laderas), no en el suelo plano, y teñido por el albedo; así las siluetas se separan del fondo oscuro. Unas pocas operaciones.
    if (N && N.rimMundo) {
      const r = N.rimMundo, c = r.color, b = r.borde;
      out = [
        '#if defined( PHONG )',
        `\t{ float avRimM = smoothstep( ${f(b[0])}, ${f(b[1])}, 1.0 - saturate( dot( normalize( vViewPosition ), normal ) ) );`,
        '\t  float avLado = 1.0 - abs( inverseTransformDirection( normal, viewMatrix ).y );',
        `\t  gl_FragColor.rgb += vec3( ${f(c[0])}, ${f(c[1])}, ${f(c[2])} ) * diffuseColor.rgb * ( avRimM * avLado * ${f(r.int)} ); }`,
        '#endif',
      ].join('\n') + '\n' + out;
    }
    return out;
  }
  // Rampa toon en la luz directa: toon = smoothstep puro; refinado = mezcla con el Lambert normal (conserva relieve)
  const RAMPA = 'smoothstep( -0.0'; // marca común a las dos rampas (para las pruebas)
  const rampaDe = L => L.refinado && L.refinado.rampa
    ? (x => { const [a, b, k] = L.refinado.rampa; return `mix( smoothstep( ${f(a)}, ${f(b)}, ${x} ), saturate( ${x} ), ${f(k)} )`; })
    : (x => `smoothstep( -0.05, 0.45, ${x} )`);
  const rampaLambert = (src, L) => { const r = rampaDe(L); return src.split('saturate( dotNL )').join(r('dotNL')).split('saturate( -dotNL )').join(r('-dotNL')); };
  // Gradación de fábrica de renderer.js (W1). Sin composer va dentro de CustomToneMapping (ACES + saturación y contraste): con un
  // look se deja en ACES puro, para que la del look la sustituya. Con composer, el pase de gradación tiene uSat/uCon/uTint: se
  // ponen a 1 (la viñeta y los rayos siguen). Al quitar el look vuelven los valores de fábrica (post.GRADO).
  const RE_CUSTOM = /vec3 CustomToneMapping\( vec3 color \) \{[^}]*\}/;
  const NEUTRO_PARS = ORIG.pars.replace(RE_CUSTOM, 'vec3 CustomToneMapping( vec3 color ) { return ACESFilmicToneMapping( color ); }');
  function gradoFabrica(L) {
    const g = R.post && R.post.grade, G0 = R.post && R.post.GRADO; if (!g || !g.uniforms || !g.uniforms.uSat || !G0) return;
    const u = g.uniforms;
    if (L) { u.uSat.value = 1; u.uCon.value = 1; u.uTint.value.set(1, 1, 1); }
    else { u.uSat.value = G0.sat; u.uCon.value = G0.con; u.uTint.value.set(G0.tint[0], G0.tint[1], G0.tint[2]); }
  }
  function aplicarChunks(L) {
    SC.tonemapping_fragment = L ? chunkTone(L) : ORIG.tone;
    SC.tonemapping_pars_fragment = L ? NEUTRO_PARS : ORIG.pars;
    SC.lights_phong_pars_fragment = L && L.toon ? ORIG.phong.replace('float dotNL = saturate( dot( geometry.normal, directLight.direction ) );', 'float dotNL = ' + rampaDe(L)('dot( geometry.normal, directLight.direction )') + ';') : ORIG.phong;
    SC.lights_lambert_vertex = L && L.toon ? rampaLambert(ORIG.lambert, L) : ORIG.lambert;
  }
  // Hoja (vegetacion.js): su onBeforeCompile envuelve el Lambert con una copia propia del chunk (sin la rampa) y vWPos; aquí se
  // envuelve una vez más para el refinado: rampa, y tinte por altura local (transformed.y × escala de la instancia) en el fragmento.
  function refinarHoja(sh, L) {
    const A = L.refinado.altura, lo = A.bajo, hi = A.alto;
    sh.vertexShader = rampaLambert(sh.vertexShader, L);
    const ancla = 'vWPos = mvPosition.xyz;';
    if (sh.vertexShader.includes(ancla) && sh.fragmentShader.includes('#include <color_fragment>')) {
      sh.vertexShader = 'varying float vAvAlt;\n' + sh.vertexShader.replace(ancla, ancla + ' vAvAlt = transformed.y * iesc;');
      sh.fragmentShader = 'varying float vAvAlt;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' +
        `  diffuseColor.rgb *= mix( vec3( ${f(lo[0])}, ${f(lo[1])}, ${f(lo[2])} ), vec3( ${f(hi[0])}, ${f(hi[1])}, ${f(hi[2])} ), smoothstep( ${f(A.h0)}, ${f(A.h1)}, vAvAlt ) );`);
    }
  }

  // ---------- Materiales: recompilar, saturación del suelo, tinte de hojas, texturas pequeñas ----------
  const tocados = new Set(), guardado = new WeakMap(), imagenes = new WeakMap();
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  function texturasDe(m, fn) {
    for (const k of ['map', 'normalMap', 'alphaMap', 'emissiveMap', 'specularMap', 'aoMap', 'roughnessMap', 'metalnessMap']) if (m[k] && m[k].isTexture) fn(m[k], k);
    const uu = m.uniforms || (m.userData && m.userData.uniforms); // ShaderMaterial o el splat del suelo (userData.uniforms)
    if (uu) for (const u in uu) { const v = uu[u] && uu[u].value; if (v && v.isTexture) fn(v, u); }
  }
  // BE5: el GLTFLoader sube las imágenes de la flora como CanvasTexture sobre un ImageBitmap, y antes se saltaban (el tope no
  // les llegaba). Las de la flora sí se encogen; los lienzos dibujados y las de personajes, no (las del kit de edificios
  // bajan solo en «bajo», topeK edificio). En medio y bajo la normal de la flora (corteza y roca) va a la mitad del tope.
  // QA-110 (7-nov): en «bajo» el mapa de la flora también baja a la mitad (512→256): son ~29 texturas de hoja/corteza/pasto
  // y ahorra ~30 MB de las 47 de flora en el iPhone; las hojas usan alfa y el toon enmascara el suavizado. En medio/alto, igual.
  // KIMI-218 (7-nov, encargo QA-110 «generadas a menor resolución en bajo»): en «bajo» las texturas del kit de
  // edificios (KB3D_*, AV_Restaurado_*, canoa — las «generadas» sin URL del volcado) bajan igual a la mitad
  // (512→256): ~21 texturas, −21 MB en la Ciudad de los 36. El atlas HD (avAtlas) sigue sin encogerse y
  // Vittata (personajes) queda fuera: el criterio es por familia de material, no por malla.
  const esBitmap = img => typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap;
  const KIT_EDIFICIO = /^(KB3D_|AV_Restaurado_|canoa)/;
  function topeK(max, k, flora, edificio) {
    if (!max) return max;
    if (flora) {
      if (k === 'normalMap') return R.calidad.nivel !== 'alto' ? max >> 1 : max;
      return R.calidad.nivel === 'bajo' ? max >> 1 : max;
    }
    if (edificio && R.calidad.nivel === 'bajo') return max >> 1;
    return max;
  }
  // KIMI-055: al conmutar la calidad, encoger recortaba TODAS las texturas de la escena dentro del
  // mismo evento (un lienzo + drawImage por textura: ~0,4-0,5 s de hilo a CPU ×4 en el flip, QA-53).
  // Con diferirRec el evento solo apunta el recorte y los cuadros siguientes lo reparten (tope de
  // tiempo por cuadro); el re-subido a la GPU lo drena después subirTexturas (renderer.js), que ya
  // recoge las «stale» por versión (KIMI-054). Aplicar/quitar look invalida la cola (recGen) para
  // no pisar un recorte más reciente.
  const colaRec = [], enCola = new Set();
  let diferirRec = false, recGen = 0;
  function recortarYa(t, max) {
    const o = imagenes.get(t);
    if (!o) return;
    if (t.image && t.image.width === max && t.image !== o) return;
    const c = document.createElement('canvas'); c.width = Math.min(max, o.width); c.height = Math.min(max, o.height);
    try { c.getContext('2d').drawImage(o, 0, 0, c.width, c.height); t.image = c; t.needsUpdate = true; } catch (e) { /* imagen sin leer: se queda */ }
  }
  function encoger(t, max, k, flora, edificio) {
    const img = t.image;
    // KIMI-218: el kit de edificios llega como CanvasTexture sobre ImageBitmap (igual que la flora, BE5);
    // sin la excepción el tope nunca les llega y se quedan a 512 en «bajo».
    if (t.isCanvasTexture && !imagenes.has(t) && !((flora || edificio) && esBitmap(img))) return;
    max = topeK(max, k, flora, edificio);
    if (!img || t.isDataTexture || t.isCompressedTexture || t.isCubeTexture || t.isVideoTexture || Array.isArray(img)) return;
    // El atlas HD (4096, celda 1024) no se encoge: a 512 la celda quedaría en 128 y la piedra se ve blanda.
    // ?tex= sigue pudiendo medirlo. La flora y el suelo sí bajan.
    const src = img.src || img.currentSrc || '';
    if (!TEX_URL && (t.userData && t.userData.avAtlas || /\/tex_hd\/hd_/.test(src))) return;
    if (!imagenes.has(t)) { if (!(img.width > max && img.height > max)) return; imagenes.set(t, img); }
    const o = imagenes.get(t);
    if (!max) { if (t.image !== o) { t.image = o; t.needsUpdate = true; } return; }
    if (diferirRec) { // KIMI-055: el flip apunta y la cola recorta por cuadros
      if (enCola.has(t)) for (let i = colaRec.length - 1; i >= 0; i--) if (colaRec[i].t === t) { colaRec[i].max = max; colaRec[i].gen = recGen; break; }
      else { colaRec.push({ t, max, gen: recGen }); enCola.add(t); }
      return;
    }
    recortarYa(t, max);
  }
  function pasarColaRec() {
    if (!colaRec.length) return;
    const t0 = performance.now(); let n = 0;
    while (colaRec.length && (n === 0 || performance.now() - t0 < 3)) {
      const e = colaRec.shift(); enCola.delete(e.t);
      if (e.gen !== recGen) continue;
      recortarYa(e.t, e.max); n++;
    }
  }
  // Especie de un material de hoja: índice estable (nombre de la textura o de su imagen; si no, orden de llegada) → paleta
  const especieDe = new WeakMap(); let especies = 0;
  function indiceEspecie(m) {
    if (!especieDe.has(m)) {
      const t = m.map, nom = t && (t.name || (t.image && (t.image.src || t.image.currentSrc))) || '';
      let h = 0; for (let i = 0; i < nom.length; i++) h = (h * 31 + nom.charCodeAt(i)) >>> 0;
      especieDe.set(m, nom ? h : especies++);
    }
    return especieDe.get(m);
  }
  const obcOriginal = new WeakMap(); // onBeforeCompile de la hoja antes de envolverlo (se repone al quitar)
  function tocar(m, L, esqueleto, forzar, flora, edificio) {
    envolverClave(m);
    const Rf = L && L.refinado, clave = claveOriginal(m);
    let recompilar = !!forzar; // al aplicar o quitar (cambia el chunk global) siempre; en el barrido, solo si cambia el programa
    if (!forzar && L) { // compilado antes del look (r128 guarda la clave en el programa): hay que recompilar; sin compilar aún: no
      const pr = R.renderer.properties.get(m), prog = pr && pr.currentProgram;
      if (prog && prog.cacheKey && !String(prog.cacheKey).includes('|look:' + actual)) recompilar = true;
    }
    const u = m.userData && m.userData.splat && m.userData.uniforms;
    if (u && u.uSat) { if (!guardado.has(u.uSat)) guardado.set(u.uSat, u.uSat.value.clone()); u.uSat.value.copy(guardado.get(u.uSat)).multiplyScalar(L ? L.terrenoSat : 1); }
    const tintes = (nocheDe(L) && nocheDe(L).tintes) || (Rf && Rf.tintes); // de noche, los tintes de luna (edificios, rocas)
    const tinte = L && (clave === 'hoja' ? (nocheDe(L) && nocheDe(L).hoja) || L.hoja : tintes && (tintes[clave] || (edificio && tintes.edificio) || (flora && tintes.flora)));
    if ((tinte || guardado.has(m)) && m.color) {
      if (!guardado.has(m)) guardado.set(m, m.color.clone());
      m.color.copy(guardado.get(m));
      if (tinte) m.color.multiply(new THREE.Color(tinte[0], tinte[1], tinte[2]));
      if (tinte && clave === 'hoja' && Rf && Rf.especies) { const p = Rf.especies[indiceEspecie(m) % Rf.especies.length]; m.color.multiply(new THREE.Color(p[0], p[1], p[2])); }
    }
    if (clave === 'hoja' && (Rf || obcOriginal.has(m))) {
      if (!obcOriginal.has(m)) obcOriginal.set(m, m.onBeforeCompile);
      const o = obcOriginal.get(m), antes = m.onBeforeCompile;
      m.onBeforeCompile = Rf ? sh => { if (o) o(sh); refinarHoja(sh, L); } : o;
      if (m.onBeforeCompile !== antes) recompilar = true;
    }
    // Borde de luz: define AV_RIM en los materiales Standard/Physical de las mallas con esqueleto (personajes). Solo el define.
    if (m.isMeshStandardMaterial && (esqueleto || (m.defines && m.defines.AV_RIM))) {
      const tenia = !!(m.defines && m.defines.AV_RIM);
      if (Rf && Rf.rim && esqueleto) { m.defines = m.defines || {}; m.defines.AV_RIM = 1; }
      else if (m.defines) delete m.defines.AV_RIM;
      if (tenia !== !!(m.defines && m.defines.AV_RIM)) recompilar = true;
    }
    const max = topeTex(L);
    texturasDe(m, (t, k) => encoger(t, max, k, flora, edificio));
    if (recompilar) m.needsUpdate = true;
    if (L) tocados.add(m); else tocados.delete(m);
  }
  // F0.6: el tope de la calidad (renderer: bajo 512, medio 1024) también recorta, con look y sin él (antes solo el suelo lo
  // respetaba); con look manda el menor de los dos y ?tex= manda sobre todo. Los atlas _hd siguen sin encogerse (encoger()).
  function topeTex(L) {
    if (TEX_URL) return TEX_URL;
    let a = (L && L.texMax) || 0; const b = R.calidad.texMax || 0;
    if (a && a < 1024 && R.calidad.nivel === "alto" && !(window.matchMedia && matchMedia('(pointer: coarse)').matches)) a = 1024;   // BM14: en alto de escritorio el look no encoge flora ni suelo por debajo de 1024
    return a && b ? Math.min(a, b) : a || b;
  }
  function recortar() { R.scene.traverse(o => { if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) texturasDe(m, (t, k) => encoger(t, topeTex(null), k, /^flora:/.test(o.name), edificioDe(o, m))); }); }
  function edificioDe(o, m) { return /^(edificios|edificiosInst|estructura:)/.test(o.name) || KIT_EDIFICIO.test((m && m.name) || ''); }
  function barrer(L, todos) {
    const max = topeTex(L);
    R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      const flora = /^flora:/.test(o.name);
      const edificio = edificioDe(o, m);
      if (todos || !tocados.has(m)) tocar(m, L, !!o.isSkinnedMesh, todos, flora, edificio);
      else if (max) texturasDe(m, (t, k) => encoger(t, max, k, flora, edificio)); // las imágenes llegan después del primer toque: se encogen al verlas
    } });
    if (!L) { for (const m of tocados) tocar(m, null, false, true); tocados.clear(); }
  }

  // ---------- Luces, cielo, niebla y agua ----------
  const hex = c => '#' + c.getHexString();
  // Lo de fábrica sale del pack (no de los valores vivos: el clima los mueve con lluvia o neblina). Las luces van con el color
  // tal cual, como las crea renderer.js; el cielo y el agua, en lineal, como sus uniformes.
  function guardarBase() {
    if (base) return;
    const Lp = W.luces || {}, Cp = W.cielo || {}, nb = Cp.niebla || [55, 165];
    const hemi = { color: new THREE.Color(Lp.cielo || '#fff4dc'), suelo: new THREE.Color(Lp.suelo || '#2f5a3a'), int: Lp.hemi != null ? Lp.hemi : 0.95 };
    const sol = { color: new THREE.Color(Lp.sol || '#ffe2b0'), int: Lp.solInt != null ? Lp.solInt : 0.75 };
    base = {
      exposicion: W.exposicion != null ? W.exposicion : 0.7, hemi, sol,
      sky: { cenit: lin(Cp.cenit || '#3d8fd6'), horizonte: lin(Cp.color || '#bfe1d6'), sol: lin(Cp.sol || '#fff2cf') },
      niebla: { srgb: new THREE.Color(Cp.color || '#bfe1d6'), near: R.ATMOS ? -nb[0] : nb[0], far: nb[1] },
      agua: { cielo: lin(Cp.cenit || '#3d8fd6'), horizonte: lin(Cp.color || '#bfe1d6'), hemiC: hemi.color.clone().multiplyScalar(hemi.int), hemiS: hemi.suelo.clone(), sol: sol.color.clone().multiplyScalar(sol.int) },
    };
    base.niebla.lin = base.niebla.srgb.clone().convertSRGBToLinear();
  }
  // Un capítulo con permiso «noche» usa la noche del look (misma calidad). El día usa el look tal cual.
  function ambienteDe(L) {
    if (!L) return null;
    const p = W.cielo && W.cielo.permiso;
    if (p === 'noche' && L.noche) {
      const n = L.noche;
      return { exposicion: n.exposicion, luces: n.luces, cielo: { cenit: n.cielo.cenit, horizonte: n.cielo.horizonte, sol: n.cielo.sol, disco: n.cielo.disco }, niebla: n.niebla };
    }
    return L;
  }
  let pausaAmbiente = false; // la tormenta del cap. 2 pide el cielo un rato; el barrido no se lo pisa
  function pausarAmbiente(v) {
    pausaAmbiente = !!v;
    if (!pausaAmbiente && actual) aplicarAmbiente(ambienteDe(LOOKS[actual]));
    return pausaAmbiente;
  }
  function aplicarAmbiente(L) {
    guardarBase(); gradoFabrica(L);
    const B = base, sky = R.sky && R.sky.material.uniforms, A = G.agua && G.agua.uniforms, fog = R.scene.fog;
    R.renderer.toneMappingExposure = L ? L.exposicion : B.exposicion;
    if (L) { R.hemi.color.set(L.luces.cielo); R.hemi.groundColor.set(L.luces.suelo); R.hemi.intensity = L.luces.hemi; R.sun.color.set(L.luces.sol); R.sun.intensity = L.luces.solInt; }
    else { R.hemi.color.copy(B.hemi.color); R.hemi.groundColor.copy(B.hemi.suelo); R.hemi.intensity = B.hemi.int; R.sun.color.copy(B.sol.color); R.sun.intensity = B.sol.int; }
    if (sky) {
      if (L) { sky.uCenit.value.copy(lin(L.cielo.cenit)); sky.uHorizonte.value.copy(lin(L.cielo.horizonte)); sky.uSolCol.value.copy(lin(L.cielo.sol)); }
      else { sky.uCenit.value.copy(B.sky.cenit); sky.uHorizonte.value.copy(B.sky.horizonte); sky.uSolCol.value.copy(B.sky.sol); }
      // QA-106/KIMI-111: de noche el disco es la luna (más pequeña y atenuada); de día, 1/1 (sol de siempre)
      const d = L && L.cielo && L.cielo.disco;
      sky.uDiscoRad.value = d ? d[0] : 1;
      sky.uDiscoInt.value = d ? d[1] : 1;
    }
    if (fog) {
      if (L) { NB.srgb.set(L.niebla.color); NB.lin.copy(NB.srgb).convertSRGBToLinear(); if (R.ATMOS) { fog.near = -L.niebla.inicio; fog.far = L.niebla.fin; } }
      else { NB.srgb.copy(B.niebla.srgb); NB.lin.copy(B.niebla.lin); fog.near = B.niebla.near; fog.far = B.niebla.far; }
      fog.color.copy(R.ATMOS && R.post.activo ? NB.lin : NB.srgb);
    }
    if (A) {
      if (L) { A.uCielo.value.copy(lin(L.cielo.cenit)); A.uHorizonte.value.copy(lin(L.cielo.horizonte)); A.uHemiCielo.value.copy(R.hemi.color).multiplyScalar(R.hemi.intensity); A.uHemiSuelo.value.copy(R.hemi.groundColor); A.uSolCol.value.copy(R.sun.color).multiplyScalar(R.sun.intensity); }
      else { A.uCielo.value.copy(B.agua.cielo); A.uHorizonte.value.copy(B.agua.horizonte); A.uHemiCielo.value.copy(B.agua.hemiC); A.uHemiSuelo.value.copy(B.agua.hemiS); A.uSolCol.value.copy(B.agua.sol); }
    }
  }

  // ---------- Aplicar y quitar ----------
  let barridoN = 0;
  function aplicar(nombre) {
    const L = LOOKS[nombre] || null;
    if (!L) { quitar(); try { sessionStorage.setItem('ave.look', 'fabrica'); } catch (e) { /* sin almacén */ } return null; } // «Fábrica» elegido a propósito: no vuelve el DEFECTO
    actual = nombre;
    recGen++; colaRec.length = 0; enCola.clear(); // KIMI-055: un look nuevo recorta ya de forma síncrona
    aplicarChunks(L); aplicarAmbiente(ambienteDe(L)); barrer(L, true);
    G.emit('contexto', true); // el atlas de impostores de la flora se repinta con el look
    try { sessionStorage.setItem('ave.look', nombre); } catch (e) { /* sin almacén */ }
    sincronizarMenu();
    return nombre;
  }
  function quitar() {
    if (!actual) return null;
    actual = null;
    recGen++; colaRec.length = 0; enCola.clear(); // KIMI-055
    aplicarChunks(null); aplicarAmbiente(null); barrer(null, true);
    G.emit('contexto', true);
    try { sessionStorage.removeItem('ave.look'); } catch (e) { /* sin almacén */ }
    sincronizarMenu();
    return null;
  }
  // Con un look activo, cada 90 cuadros se tocan los materiales nuevos (streaming, flora, módulos perezosos): compilan ya con
  // el look (el chunk es global); aquí reciben la saturación del suelo, el tinte de hoja, las texturas pequeñas y la clave
  // El clima (src/game/clima.js) escribe luz, niebla y cielo durante sus transiciones; al volver el sol deja sus valores de
  // fábrica, así que con el cielo quieto se repone el ambiente del look.
  const climaQuieto = () => !G.clima || (G.clima.F ? G.clima.F.estado === 'sol' && !G.clima.F.trans : G.clima.estado() === 'sol');
  // Además, en cuanto llega contenido nuevo (cambia el número de geometrías o texturas del renderer: streaming, flora, criadero)
  // se barre ese mismo cuadro, para que la hoja refinada y el rim compilen una sola vez (antes de su primer cuadro, no después).
  let huella = -1;
  const huellaDe = () => { const m = R.renderer.info.memory; return m.geometries * 4096 + m.textures; };
  G.on('render', () => {
    pasarColaRec(); // KIMI-055: reparte el recorte de texturas del flip en varios cuadros
    if (!actual) { const h = huellaDe(); if (h !== huella) { huella = h; recortar(); } return; } // fábrica: solo el tope de la calidad
    const h = huellaDe(), nuevo = h !== huella; huella = h;
    if (nuevo || ++barridoN % 90 === 0) { barrer(LOOKS[actual], false); gradoFabrica(LOOKS[actual]); if (!nuevo && !pausaAmbiente && climaQuieto()) aplicarAmbiente(ambienteDe(LOOKS[actual])); }
  }, 90);
  G.on('mundoListo', () => { if (actual) barrer(LOOKS[actual], false); });
  G.on('calidad', () => { // KIMI-055: el flip apunta los recortes; los cuadros siguientes los hacen
    diferirRec = true;
    try { if (actual) barrer(LOOKS[actual], false); else recortar(); }
    finally { diferirRec = false; }
  });

  // ---------- Medidas: FPS, draw calls, triángulos, programas y memoria de texturas (estimada desde las imágenes) ----------
  function medir() {
    const s = R.stats(), vistas = new Set(); let bytes = 0, n = 0, grandes = 0;
    let atlas = 0, mundo = 0;
    // W34: «mundo» = las grandes que encoger() puede bajar (mismo filtro); no cuentan Vittata ni los lienzos de edificios
    // (CanvasTexture del GLB), ni el atlas de impostores (render target sin imagen que dibujar). En «bajo» (texMax 512)
    // solo quedan esas por encima de 512 y la prueba del look daba rojo sin nada que encoger (4 → 4).
    const encogible = (t, flora) => { const img = t.image;
      if (!img || t.isDataTexture || t.isCompressedTexture || t.isCubeTexture || t.isVideoTexture || Array.isArray(img)) return false;
      if (t.isCanvasTexture && !imagenes.has(t) && !(flora && esBitmap(img))) return false;
      if (!imagenes.has(t) && !(img.height > 512)) return false; // encoger() solo baja las que pasan del tope en los dos lados
      const o = imagenes.get(t) || img; // lo que recortarYa() dibujaría: un objeto sin píxeles (impostores) no se puede bajar
      return esBitmap(o) || !!o.src || !!o.getContext; };
    // F0.6: desglose por origen (la URL de la imagen o el nombre de la malla) y las 10 texturas más pesadas
    const por = {}, top = [];
    const origen = (src, o) => /\/tex_hd\//.test(src) ? 'atlas_hd' : /\/tex\/entorno\/suelo/.test(src) ? 'suelo' : /\/models\/entorno\//.test(src) || /^flora:/.test(o.name) ? 'flora'
      : /^terreno/.test(o.name) ? 'suelo' : o.isSkinnedMesh ? 'personajes' : /\/(edificios|kelvin|ruinas|aldea)/i.test(src) ? 'edificios' : src ? 'otros' : 'generadas';
    R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) texturasDe(m, t => {
      if (vistas.has(t)) return; vistas.add(t);
      const img = t.image, w = img && (img.width || (img.data && img.width)) || 0, h = img && img.height || 0;
      if (!w) return; n++;
      const src = (img && (img.src || img.currentSrc)) || (imagenes.has(t) && imagenes.get(t).src) || '';
      const esAtlas = !!(t.userData && t.userData.avAtlas) || /\/tex_hd\/hd_/.test(src);
      if (w > 512) { grandes++; if (esAtlas) atlas++; else if (encogible(t, /^flora:/.test(o.name))) mundo++; }
      const b = w * h * 4 * (t.generateMipmaps ? 4 / 3 : 1), k = esAtlas ? 'atlas_hd' : origen(src, o);
      bytes += b; por[k] = (por[k] || 0) + b;
      top.push([(src.split('/').pop() || t.name || o.name || '?').slice(0, 48), w + '×' + h, Math.round(b / 104857.6) / 10]);
    }); });
    for (const k in por) por[k] = Math.round(por[k] / 104857.6) / 10;
    top.sort((a, b) => b[2] - a[2]); top.length = Math.min(10, top.length);
    const C = R.calidad, sombra = C.sombras ? C.sombras * C.sombras * 4 : 0;
    const dbs = R.renderer.getDrawingBufferSize(new THREE.Vector2()), post = R.post.activo ? dbs.x * dbs.y * 8 * 2.5 : 0;
    const pm = performance.memory, heapMB = pm && pm.usedJSHeapSize ? Math.round(pm.usedJSHeapSize / 1048576) : null;
    return { look: actual || 'fabrica', fps: s.fps, calls: s.calls, triangulos: s.triangulos, calidad: s.calidad, dpr: s.dpr, post: s.post,
      programas: R.renderer.info.programs.length, heapMB, geometrias: R.renderer.info.memory.geometries, texturasGPU: R.renderer.info.memory.textures, texturas: n, texturasGrandes: grandes, atlasGrandes: atlas, mundoGrandes: mundo, texturasMB: Math.round(bytes / 1048576 * 10) / 10,
      sombraMB: Math.round(sombra / 1048576 * 10) / 10, postMB: Math.round(post / 1048576 * 10) / 10, texturasPor: por, texturasTop: top };
  }

  // ---------- Sección oculta «Look» en el menú de pausa ----------
  const menu = $('pause');
  let sec = null;
  const DEV = q.has('look') || (() => { try { return localStorage.getItem('ave.look.dev') === '1'; } catch (e) { return false; } })();
  function montar() {
    if (!menu || menu.querySelector('.pause-look')) return;
    sec = document.createElement('section');
    sec.className = 'pause-look'; sec.setAttribute('aria-labelledby', 'look-titulo'); sec.hidden = !DEV;
    sec.innerHTML = '<h3 id="look-titulo">Look (prueba)</h3><div class="a11y-chips">' +
      ['fabrica'].concat(NOMBRES).map(n => `<button class="chip" type="button" data-look="${n}" aria-pressed="false">${n === 'fabrica' ? 'Fábrica' : LOOKS[n].titulo}</button>`).join('') +
      '</div><p class="note">Comparación de color para Kelvin. No se guarda en la partida.</p>';
    const tras = menu.querySelector('.pause-musica') || menu.querySelector('.pause-a11y') || menu.querySelector('.pause-grid');
    if (tras) tras.after(sec); else menu.appendChild(sec);
    sec.addEventListener('click', e => { const b = e.target.closest('button[data-look]'); if (b) aplicar(b.dataset.look); });
    sincronizarMenu();
  }
  function sincronizarMenu() { if (sec) for (const b of sec.querySelectorAll('button[data-look]')) b.setAttribute('aria-pressed', String((actual || 'fabrica') === b.dataset.look)); }
  montar();

  // ---------- Arranque: URL > sesión > DEFECTO ----------
  const pedido = q.get('look') || (() => { try { return sessionStorage.getItem('ave.look'); } catch (e) { return null; } })() || DEFECTO;
  if (LOOKS[pedido]) aplicar(pedido);
  else if (pedido !== 'fabrica' && LOOKS[DEFECTO]) aplicar(DEFECTO); // un nombre desconocido cae en el de fábrica actual

  // ---------- Prueba: AV.lookTest() ----------
  async function test() {
    const P = G.pruebas, { check, result } = P.runner();
    const antes = actual, errores = [], ce = console.error, e0 = (window.__aveErrores || []).length;
    console.error = function () { errores.push([].map.call(arguments, String).join(' ').slice(0, 160)); return ce.apply(console, arguments); };
    const cuadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    // QA-78: con la Mac cargada la fauna, los peces y la bandada entran entre medidas; se espera a 3 cuadros seguidos con los mismos draw calls (tope 10 s)
    // KIMI-103: y a que el precalentado haya enlazado todas las familias —al aplicar un look todas quedan pendientes y ocultarPendientes las quita del dibujo, así que una foto antes del drenado sale con la escena incompleta y el croma miente.
    // Con GPU por software (la nube, SwiftShader) enlazar por primera vez todas las familias de fábrica tarda más de 10 s: con el tope corto
    // la foto de fábrica salía con media escena oculta (92 → 117 draw calls y 21,9 % de píxeles distintos al volver). Allí se espera hasta 120 s.
    const software = !!(R.equipo && (R.equipo.motivos || []).some(m => /software/i.test(m))), topeAsentar = software ? 120000 : 10000;
    const asentar = async () => { const t0 = performance.now(); let ult = -1, n = 0, p = 0; while (n < 3 && performance.now() - t0 < topeAsentar) { await cuadro(); const c = R.stats().calls; p = R.precarga ? R.precarga.programas() : 0; n = (c === ult && p <= 0 && !colaRec.length) ? n + 1 : 1; ult = c; } return { ms: Math.round(performance.now() - t0), ok: n >= 3, p }; };
    const foto = () => {
      R.drawScene(R.camera); R.renderer.setRenderTarget(null);
      const gl = R.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let croma = 0, n = 0, quemado = 0;
      for (let i = 0; i < px.length; i += 16) { const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b); croma += mx - Math.min(r, g, b); if (mx >= 252 && Math.min(r, g, b) >= 236) quemado++; n++; }
      return { croma: croma / n, quemado: quemado / n, w, h, px }; // QA-176: se conservan píxeles y tamaño para la comparación diferencial
    };
    // QA-176: comparación diferencial sobre la escena congelada. El croma absoluto de la vista sembrada varía
    // entre corridas (evolución del mundo, DPR, calidad adaptativa), así que el umbral antiguo (c1 > c0*1.03) era
    // imposible de fijar: lo que debe cumplirse es que el look CAMBIE la imagen respecto a fábrica, y que al quitar
    // vuelva. Misma retícula de muestreo que foto() (1 de cada 4 píxeles); un píxel «distinto» suma >12 por canal.
    const delta = (A, B) => {
      if (!A || !B || A.w !== B.w || A.h !== B.h) return null;
      let distintos = 0, n = 0, suma = 0;
      for (let i = 0; i < A.px.length; i += 16) { const d = Math.abs(A.px[i] - B.px[i]) + Math.abs(A.px[i + 1] - B.px[i + 1]) + Math.abs(A.px[i + 2] - B.px[i + 2]); suma += d; if (d > 12) distintos++; n++; }
      return { distintos: distintos / n, medio: suma / n / 3 };
    };
    const firma = () => {
      const u = R.sky && R.sky.material.uniforms, fog = R.scene.fog;
      let sat = ''; R.scene.traverse(o => { const m = o.material; if (m && m.userData && m.userData.splat) sat += m.userData.uniforms.uSat.value.toArray().map(v => v.toFixed(3)).join(',') + ';'; });
      const pg = R.post && R.post.grade && R.post.grade.uniforms;
      return JSON.stringify({ tone: SC.tonemapping_fragment, pars: SC.tonemapping_pars_fragment, phong: SC.lights_phong_pars_fragment, lambert: SC.lights_lambert_vertex,
        grado: pg && [pg.uSat.value, pg.uCon.value, pg.uTint.value.toArray()],
        exp: R.renderer.toneMappingExposure, hemi: [hex(R.hemi.color), hex(R.hemi.groundColor), R.hemi.intensity], sol: [hex(R.sun.color), R.sun.intensity],
        sky: u && [hex(u.uCenit.value), hex(u.uHorizonte.value)], fog: fog && [hex(fog.color), fog.near, fog.far], sat, key: new THREE.MeshBasicMaterial().customProgramCacheKey() });
    };
    const quieta = G.pausa; if (quieta) quieta.set('prueba-look', true);
    if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true }); // sin transición de clima a mitad de la prueba
    // QA-176: la comparación de imágenes es diferencial sobre la escena congelada, así que nada puede moverla a mitad:
    // calidad adaptativa y resolución dinámica fijas, y el haz guía quieto en un instante (late con el reloj real aun
    // en pausa —mismo truco que contextTest, QA-30— y en la vista sembrada cruza el encuadre).
    const calManual0 = R.calidad.manual; R.calidad.manual = true;
    const pinDPR0 = R._dyn && R._dyn.pin; if (R._dyn) R._dyn.pin = true;
    const guia0 = G.fx && G.fx.guide; if (guia0) G.fx.guide = tg => guia0(tg, 0);
    try {
      if (actual) quitar();
      await cuadro(); const as0 = await asentar();
      const F0 = firma(), f0 = foto(), c0 = f0.croma, m0 = medir();
      check('Sin look («fabrica»): los ShaderChunks son los originales (los de three y la gradación W1 de renderer.js)', SC.tonemapping_fragment === ORIG.tone && SC.tonemapping_pars_fragment === ORIG.pars && SC.lights_phong_pars_fragment === ORIG.phong && SC.lights_lambert_vertex === ORIG.lambert);
      check('DEFECTO es «vibrant_toon» (decisión de Kelvin) y existe; ?look=fabrica o el chip «Fábrica» dejan ver el original', DEFECTO === 'vibrant_toon' && !!LOOKS[DEFECTO] && (q.get('look') === 'fabrica' ? antes === null : antes === (sessionStorage.getItem('ave.look') === 'fabrica' ? null : antes)), 'al entrar: ' + (antes || 'fabrica'));
      check('La gradación de fábrica (W1) se encuentra para sustituirla (CustomToneMapping en tonemapping_pars_fragment)', RE_CUSTOM.test(ORIG.pars) && NEUTRO_PARS !== ORIG.pars || !/CustomToneMapping[^}]*ACESFilmicToneMapping/.test(ORIG.pars), /ACESFilmicToneMapping/.test(ORIG.pars) ? 'W1 presente' : 'sin W1 (three a secas)');
      check('De fábrica: exposición y luces del pack', R.renderer.toneMappingExposure === (W.exposicion != null ? W.exposicion : 0.7) && (!W.luces || R.sun.intensity === W.luces.solInt),
        'exposición ' + R.renderer.toneMappingExposure + ' · sol ' + R.sun.intensity);
      check('De fábrica: la clave de los programas es la de three', new THREE.MeshBasicMaterial().customProgramCacheKey() === keyProto.call(new THREE.MeshBasicMaterial()));
      check('La gradación se inyecta tras el ACES (el chunk de r128 tiene la línea esperada)', ORIG.tone.includes('gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );'));
      check('La rampa toon encuentra sus líneas en Phong y Lambert', ORIG.phong.includes('float dotNL = saturate( dot( geometry.normal, directLight.direction ) );') && ORIG.lambert.includes('saturate( dotNL )'));
      check('Sección «Look» en la pausa, oculta salvo en modo prueba, con un chip por look', !!sec && menu.contains(sec) && sec.hidden === !DEV && sec.querySelectorAll('button[data-look]').length === NOMBRES.length + 1);
      for (const n of NOMBRES) {
        const t0 = performance.now(); aplicar(n); const tApl = performance.now() - t0;
        await cuadro(); await cuadro(); const as1 = await asentar();
        const f1 = foto(), c1 = f1.croma, m1 = medir(), L = LOOKS[n], d1 = delta(f0, f1);
        check(`Look «${n}»: se aplica (chunk, exposición, sol, cielo, niebla y clave de programas)`, actual === n && SC.tonemapping_fragment !== ORIG.tone && R.renderer.toneMappingExposure === L.exposicion &&
          R.sun.intensity === L.luces.solInt && (!R.sky || hex(R.sky.material.uniforms.uCenit.value) === hex(lin(L.cielo.cenit))) && (!R.ATMOS || R.scene.fog.far === L.niebla.fin) &&
          new THREE.MeshBasicMaterial().customProgramCacheKey().endsWith('|look:' + n), Math.round(tApl) + ' ms en aplicar');
        check(`Look «${n}»: la imagen cambia respecto a fábrica (QA-176: diferencial de píxeles sobre la escena congelada)`, !!d1 && d1.distintos >= 0.04 && d1.medio >= 1,
          d1 ? (d1.distintos * 100).toFixed(1) + ' % píxeles distintos · Δ medio ' + d1.medio.toFixed(1) + ' · croma ' + c0.toFixed(1) + ' → ' + c1.toFixed(1) : 'cambió el tamaño del lienzo (' + f0.w + '×' + f0.h + ' → ' + f1.w + '×' + f1.h + ')');
        check(`Look «${n}»: el chip de la pausa lo marca`, !!sec && sec.querySelector(`button[data-look="${n}"]`).getAttribute('aria-pressed') === 'true');
        { const pg = R.post && R.post.grade && R.post.grade.uniforms;
          check(`Look «${n}»: sustituye la gradación de fábrica en vez de sumarse (CustomToneMapping = ACES puro; uSat/uCon del composer = 1; viñeta intacta)`,
            /CustomToneMapping\( vec3 color \) \{ return ACESFilmicToneMapping\( color \); \}/.test(SC.tonemapping_pars_fragment) && (!pg || (pg.uSat.value === 1 && pg.uCon.value === 1 && pg.uTint.value.x === 1 && pg.uVig.value === (R.post.grade.uniforms.uVig.value))), pg ? 'composer' : 'sin composer'); }
        if (L.toon) {
          check(`Look «${n}»: la rampa suave está en Phong y Lambert y Standard/Physical (Vittata) no cambian`, SC.lights_phong_pars_fragment.includes(RAMPA) && SC.lights_lambert_vertex.includes(RAMPA) && !SC.lights_physical_pars_fragment.includes(RAMPA));
          const g0 = m0.mundoGrandes, g1 = m1.mundoGrandes;
          check(`Look «${n}»: las texturas grandes del mundo bajan a 512 px`, g1 < g0 || g0 === 0, m0.texturasGrandes + ' → ' + m1.texturasGrandes + ' (el atlas HD no se encoge: ' + (m1.atlasGrandes || 0) + '; del mundo, encogibles: ' + g0 + ' → ' + g1 + ') · ' + m0.texturasMB + ' → ' + m1.texturasMB + ' MB');
          { let cuantas = 0, mal = 0, maxW = 0; R.scene.traverse(o => { if (!o.material || !/^flora:/.test(o.name)) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) texturasDe(m, (t, k) => {
              if (!t.isCanvasTexture || !(imagenes.has(t) || esBitmap(t.image))) return; cuantas++; const tope = topeK(topeTex(L), k, true), w = t.image.width;
              if (k === 'normalMap') maxW = Math.max(maxW, w); if (tope && w > tope && t.image.height > tope) mal++; }); });
            check(`Look «${n}»: la flora del GLB respeta el tope de texturas (BE5; la normal, a la mitad en medio y bajo)`, !mal, cuantas + ' texturas de flora · ' + mal + ' por encima · normal más grande ' + maxW + ' px · calidad ' + R.calidad.nivel); }
        }
        if (L.refinado) {
          const hojas = new Set(), tintes = new Set(), rim = [], sinRim = [];
          R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            if (claveOriginal(m) === 'hoja') { hojas.add(m); tintes.add(hex(m.color)); }
            if (m.isMeshStandardMaterial) (o.isSkinnedMesh ? rim : sinRim).push(m);
          } });
          check(`Look «${n}»: rampa a medias (mezcla con el Lambert normal) en Phong, Lambert y en la hoja`, SC.lights_phong_pars_fragment.includes('saturate( dot( geometry.normal, directLight.direction ) ), ' + f(L.refinado.rampa[2])) && SC.lights_lambert_vertex.includes(', saturate( dotNL ), ') && [...hojas].every(m => obcOriginal.has(m) && m.onBeforeCompile !== obcOriginal.get(m)));
          check(`Look «${n}»: el bosque no es un bloque verde (tinte distinto por especie de hoja)`, hojas.size < 2 || tintes.size >= Math.min(2, hojas.size), hojas.size + ' materiales de hoja · ' + tintes.size + ' tintes');
          check(`Look «${n}»: borde de luz solo en los personajes (define AV_RIM en Standard de mallas con esqueleto, no en el resto)`, rim.length > 0 && rim.every(m => m.defines && m.defines.AV_RIM === 1) && sinRim.every(m => !(m.defines && m.defines.AV_RIM)) && SC.tonemapping_fragment.includes('AV_RIM'), rim.length + ' con rim · ' + sinRim.length + ' sin');
          check(`Look «${n}»: la gradación lleva rodilla y no quema más luces que fábrica`, SC.tonemapping_fragment.includes('smoothstep( 0.78, 1.0, l )') && f1.quemado <= f0.quemado * 1.5 + 0.01, 'quemado ' + (f0.quemado * 100).toFixed(2) + ' % → ' + (f1.quemado * 100).toFixed(2) + ' %');
          const hojaSh = { vertexShader: 'void main(){ vWPos = mvPosition.xyz; vLightFront += saturate( dotNL ) * d; }', fragmentShader: '#include <color_fragment>' }; refinarHoja(hojaSh, L);
          check(`Look «${n}»: el shader de la hoja recibe la variación por altura (vAvAlt) y la rampa`, hojaSh.vertexShader.includes('vAvAlt = transformed.y * iesc;') && hojaSh.fragmentShader.includes('vAvAlt )') && !hojaSh.vertexShader.includes('+= saturate( dotNL )'));
        }
        check(`Look «${n}»: mismo número de draw calls que de fábrica (±10 % o 8: la fauna, los peces, las partículas y la bandada van y vienen entre medidas)`, Math.abs(m1.calls - m0.calls) <= Math.max(8, m0.calls * 0.1), m0.calls + ' → ' + m1.calls + ' · ' + m0.triangulos + ' → ' + m1.triangulos + ' triángulos · programas ' + m0.programas + ' → ' + m1.programas + ' · asentado ' + JSON.stringify([as0, as1]));
      }
      quitar(); await cuadro(); await cuadro(); const as2 = await asentar();
      const F1 = firma(), f2 = foto(), c2 = f2.croma, m2 = medir(), d2 = delta(f0, f2);
      check('Al quitar el look todo vuelve a fábrica (chunks, exposición, luces, cielo, niebla, saturación del suelo, claves)', F0 === F1, F0 === F1 ? '' : 'difiere');
      check('Al quitar el look la imagen vuelve a la de fábrica (QA-176: diferencial; texturas y escena ya restauradas)', !!d2 && d2.distintos <= 0.08 && Math.abs(c2 - c0) < Math.max(2, c0 * 0.05),
        d2 ? (d2.distintos * 100).toFixed(1) + ' % píxeles distintos · croma ' + c0.toFixed(1) + ' → ' + c2.toFixed(1) + ' · asentado ' + JSON.stringify([as0, as2]) : 'cambió el tamaño del lienzo (' + f0.w + '×' + f0.h + ' → ' + f2.w + '×' + f2.h + ')');
      check('Al quitar el look las texturas vuelven a su tamaño (no quedan reducidas; si otros módulos cargan texturas durante la prueba, el total puede crecer)', m2.texturasGrandes >= m0.texturasGrandes && m2.texturasMB > m0.texturasMB - 0.5, m0.texturasMB + ' → ' + m2.texturasMB + ' MB');
      { let rim = 0, colores = 0, obc = 0; R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m.defines && m.defines.AV_RIM) rim++;
          if (guardado.has(m) && m.color && hex(m.color) !== hex(guardado.get(m))) colores++;
          if (obcOriginal.has(m) && m.onBeforeCompile !== obcOriginal.get(m)) obc++;
        } });
        check('Al quitar el look los personajes no llevan AV_RIM, los tintes de hoja, roca, corteza y ruinas vuelven y la hoja recupera su onBeforeCompile', !rim && !colores && !obc, rim + ' rim · ' + colores + ' tintes · ' + obc + ' hojas'); }
      const nuevos = (window.__aveErrores || []).slice(e0);
      check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      console.error = ce;
      if (antes) aplicar(antes);
      if (G.clima && G.clima.fijar) G.clima.fijar(null);
      R.calidad.manual = calManual0; if (R._dyn) R._dyn.pin = pinDPR0; if (guia0) G.fx.guide = guia0; // QA-176
      if (quieta) quieta.set('prueba-look', false);
    }
    return result();
  }

  // ---------- Prueba: AV.lookCapitulosTest() — frena la publicación si un pack se sale del estándar (BD1) ----------
  const DIA = {
    cielo: "cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] }",
    luces: "luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] }",
    post: 'post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 }',
    mar: "mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' }",
    exp: 'exposicion: 0.74',
  };
  const PACKS_DIA = [['cap1', 'content/cap1/mundo.js'], ['ep2', 'content/ep2/pack.js'], ['ep3', 'content/ep3/pack.js'], ['ep4', 'content/ep4/pack.js'], ['ep6', 'content/ep6/pack.js'], ['plantilla', 'content/plantilla/pack.js']];
  function revisarDia(id, src) {
    const falta = [];
    for (const k of Object.keys(DIA)) if (!src.includes(DIA[k])) falta.push(k);
    if (src.includes("permiso: 'noche'")) falta.push('noche-no-permitida');
    const rios = (src.match(/agua:\s*\{[^}]*\}/g) || []).filter(b => /\bancho:/.test(b));
    if (rios.some(b => !b.includes("color: '#5fe3d6'"))) falta.push('agua');
    return { ok: !falta.length, porque: falta.join(', ') };
  }
  function revisarNoche(src) {
    const n = LOOKS.vibrant_toon.noche, falta = [];
    if (!src.includes("permiso: 'noche'")) falta.push('permiso');
    if (!src.includes("cenit: '" + n.cielo.cenit + "'")) falta.push('cenit');
    if (!src.includes("color: '" + n.cielo.horizonte + "'")) falta.push('horizonte');
    if (!src.includes('niebla: [' + n.niebla.inicio + ', ' + n.niebla.fin + ']')) falta.push('niebla');
    if (!src.includes('solInt: ' + n.luces.solInt)) falta.push('sol');
    if (!src.includes('exposicion: ' + n.exposicion)) falta.push('exposicion');
    if (!src.includes('saturacion: 1.08')) falta.push('post');
    if (!src.includes("somero: '#1a7a86'")) falta.push('mar');
    if (src.includes(DIA.cielo)) falta.push('dia-de-mas');
    return { ok: !falta.length, porque: falta.join(', ') };
  }
  async function testCapitulos() {
    const P = G.pruebas, { check, result } = P.runner();
    const traer = async ruta => {
      const r = await fetch(ruta, { cache: 'no-store' });
      if (!r.ok) throw new Error(ruta + ' ' + r.status);
      return r.text();
    };
    try {
      for (const [id, ruta] of PACKS_DIA) {
        let src = '', mal = null;
        try { src = await traer(ruta); } catch (e) { mal = String(e && e.message || e); }
        const rev = mal ? { ok: false, porque: mal } : revisarDia(id, src);
        check('Pack «' + id + '» hereda el día del capítulo 1 (cielo atmosférico, luces, post, mar y agua)', rev.ok, rev.porque);
      }
      let ep5 = '', mal5 = null;
      try { ep5 = await traer('content/ep5/pack.js'); } catch (e) { mal5 = String(e && e.message || e); }
      const rn = mal5 ? { ok: false, porque: mal5 } : revisarNoche(ep5);
      check('El capítulo 5 es noche atmosférica del estándar (permiso «noche», misma saturación)', rn.ok, rn.porque);
      let ep2 = '';
      try { ep2 = await traer('content/ep2/pack.js'); } catch (e) { ep2 = ''; }
      check('La tormenta del capítulo 2 pide el cielo y lo devuelve (pausarAmbiente)', ep2.includes('pausarAmbiente(true)') && ep2.includes('pausarAmbiente(false)'));
      const falso = "mundo: { cielo: { color: '#ff66aa', niebla: [12, 40] }, luces: { solInt: 0.2 }, permisos: '' }";
      check('Un cielo rosa con niebla corta no pasa el estándar', !revisarDia('falso', falso).ok, revisarDia('falso', falso).porque);
      if (actual && !pausaAmbiente) aplicarAmbiente(ambienteDe(LOOKS[actual]));
      const esp = ambienteDe(LOOKS[DEFECTO]);
      const u = R.sky && R.sky.material.uniforms;
      check('En vivo el look de fábrica es vibrant_toon y el cielo es atmosférico', DEFECTO === 'vibrant_toon' && actual === 'vibrant_toon' && !!R.ATMOS && !!esp, 'look ' + (actual || 'fabrica'));
      check('En vivo la exposición, la niebla y el cenit son los del estándar de este capítulo', !!esp && R.renderer.toneMappingExposure === esp.exposicion && R.scene.fog && R.scene.fog.far === esp.niebla.fin && (!u || hex(u.uCenit.value) === hex(lin(esp.cielo.cenit))),
        'exposición ' + R.renderer.toneMappingExposure + ' · niebla ' + (R.scene.fog && R.scene.fog.far) + ' · cenit ' + (u ? hex(u.uCenit.value) : 'sin cielo'));
      check('El disco del cielo es el de siempre de día y la luna pequeña y atenuada de noche (QA-106/KIMI-111)', !!u && (esp && esp.cielo.disco ? (u.uDiscoRad.value === esp.cielo.disco[0] && u.uDiscoInt.value === esp.cielo.disco[1]) : (u.uDiscoRad.value === 1 && u.uDiscoInt.value === 1)),
        'rad ' + (u ? u.uDiscoRad.value : '-') + ' · int ' + (u ? u.uDiscoInt.value : '-'));
      // BM23: nada de vegetación ni de «pirámides» sobre el mar: ni conos de isla visibles con mapa, ni vértices del dosel bajo el nivel del mar
      if (G.terreno && G.terreno.mapa) {
        const conos = []; R.scene.traverse(o => { if (o.isMesh && o.visible && o.geometry && o.geometry.type === 'ConeGeometry' && o.geometry.parameters.radius >= 20) conos.push(o.position.toArray().map(Math.round).join(',')); });
        check('Sobre el mar no hay conos verdes de isla (BM23)', !conos.length, conos.join(' | '));
        const D = window.AV_DOSEL_CAP1;
        if (D && G.dosel && G.dosel.activo) {
          const u8 = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
          const q = new Uint16Array(u8(D.pos).buffer), o = D.origen, e = D.escala; let mar = 0;
          for (let i = 0; i < q.length; i += 3) { const x = o[0] + q[i] * e, z = o[2] + q[i + 2] * e; if (G.terreno.height(x, z) < -2) mar++; }
          check('El dosel no tiene vértices sobre el mar abierto (BM23)', mar === 0, mar + ' vértices');
        }
      }
    } catch (e) {
      check('La prueba de capítulos terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    }
    return result();
  }

  const api = { aplicar, quitar, get actual() { return actual; }, LOOKS, DEFECTO, medir, test, pausarAmbiente, ORIG };
  if (window.AV) { window.AV.look = api; window.AV.lookCapitulosTest = () => testCapitulos(); }
  return api;
};
