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
      titulo: 'Vibrant Toon', exposicion: 0.78,
      grade: { sat: 1.24, con: 1.07, tint: [1.02, 1.0, 0.96], rodilla: true },
      cielo: { cenit: '#1e78e8', horizonte: '#b4e4ff', sol: '#fff4d6' },
      niebla: { color: '#b8e4ff', inicio: 80, fin: 1500 },
      luces: { cielo: '#a8d4ff', suelo: '#4a7a34', hemi: 0.84, sol: '#ffe4b0', solInt: 2.05 },
      terrenoSat: 1.1, hoja: [0.96, 1.08, 0.84], toon: true, texMax: 512,
      refinado: {
        rampa: [-0.08, 0.5, 0.4],                                      // smoothstep(a, b) mezclado con saturate() al 40 %
        especies: [[1.0, 1.0, 1.0], [1.12, 1.04, 0.72], [0.8, 1.02, 1.0], [0.98, 1.1, 0.84], [1.14, 0.96, 0.8]], // por material de hoja (±20 % por canal)
        altura: { bajo: [0.72, 0.9, 0.92], alto: [1.12, 1.06, 0.8], h0: 0.5, h1: 9 }, // tinte por altura local (m)
        tintes: { roca: [0.9, 0.93, 1.0], corteza: [1.06, 0.96, 0.86], 'av-hd-atlas': [1.06, 1.0, 0.9] },
        rim: { color: [0.75, 0.88, 1.0], int: 0.55, borde: [0.55, 1.0] }, // color (lineal), fuerza y rango del borde
      },
    },
  };
  const NOMBRES = Object.keys(LOOKS);
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
    if (Rf && Rf.rim) {
      const r = Rf.rim, c = r.color, b = r.borde;
      out = [
        '#if defined( STANDARD ) && defined( AV_RIM )',
        `\t{ float avRim = smoothstep( ${f(b[0])}, ${f(b[1])}, 1.0 - saturate( dot( normalize( vViewPosition ), normal ) ) );`,
        '\t  float avL = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );',
        `\t  gl_FragColor.rgb += vec3( ${f(c[0])}, ${f(c[1])}, ${f(c[2])} ) * ( avRim * ${f(r.int)} * ( 0.3 + 0.7 * smoothstep( 0.0, 0.4, avL ) ) ); }`,
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
    for (const k of ['map', 'normalMap', 'alphaMap', 'emissiveMap', 'specularMap', 'aoMap', 'roughnessMap', 'metalnessMap']) if (m[k] && m[k].isTexture) fn(m[k]);
    const uu = m.uniforms || (m.userData && m.userData.uniforms); // ShaderMaterial o el splat del suelo (userData.uniforms)
    if (uu) for (const u in uu) { const v = uu[u] && uu[u].value; if (v && v.isTexture) fn(v); }
  }
  function encoger(t, max) {
    const img = t.image;
    if (!img || t.isDataTexture || t.isCompressedTexture || t.isCubeTexture || t.isCanvasTexture || t.isVideoTexture || Array.isArray(img)) return;
    // El atlas HD (2048, celda 512) no se encoge: a 512 la celda quedaría en 128 y la piedra se ve blanda.
    // ?tex= sigue pudiendo medirlo. La flora y el suelo sí bajan.
    const src = img.src || img.currentSrc || '';
    if (!TEX_URL && /\/tex_hd\/hd_/.test(src)) return;
    if (!imagenes.has(t)) { if (!(img.width > max && img.height > max)) return; imagenes.set(t, img); }
    const o = imagenes.get(t);
    if (!max) { if (t.image !== o) { t.image = o; t.needsUpdate = true; } return; }
    if (t.image && t.image.width === max && t.image !== o) return;
    const c = document.createElement('canvas'); c.width = Math.min(max, o.width); c.height = Math.min(max, o.height);
    try { c.getContext('2d').drawImage(o, 0, 0, c.width, c.height); t.image = c; t.needsUpdate = true; } catch (e) { /* imagen sin leer: se queda */ }
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
  function tocar(m, L, esqueleto, forzar) {
    envolverClave(m);
    const Rf = L && L.refinado, clave = claveOriginal(m);
    let recompilar = !!forzar; // al aplicar o quitar (cambia el chunk global) siempre; en el barrido, solo si cambia el programa
    if (!forzar && L) { // compilado antes del look (r128 guarda la clave en el programa): hay que recompilar; sin compilar aún: no
      const pr = R.renderer.properties.get(m), prog = pr && pr.currentProgram;
      if (prog && prog.cacheKey && !String(prog.cacheKey).includes('|look:' + actual)) recompilar = true;
    }
    const u = m.userData && m.userData.splat && m.userData.uniforms;
    if (u && u.uSat) { if (!guardado.has(u.uSat)) guardado.set(u.uSat, u.uSat.value.clone()); u.uSat.value.copy(guardado.get(u.uSat)).multiplyScalar(L ? L.terrenoSat : 1); }
    const tinte = L && (clave === 'hoja' ? L.hoja : Rf && Rf.tintes && Rf.tintes[clave]);
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
    const max = L ? TEX_URL || L.texMax || 0 : 0;
    texturasDe(m, t => encoger(t, max));
    if (recompilar) m.needsUpdate = true;
    if (L) tocados.add(m); else tocados.delete(m);
  }
  function barrer(L, todos) {
    const max = L ? TEX_URL || L.texMax || 0 : 0;
    R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (todos || !tocados.has(m)) tocar(m, L, !!o.isSkinnedMesh, todos);
      else if (max) texturasDe(m, t => encoger(t, max)); // las imágenes llegan después del primer toque: se encogen al verlas
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
  function aplicarAmbiente(L) {
    guardarBase(); gradoFabrica(L);
    const B = base, sky = R.sky && R.sky.material.uniforms, A = G.agua && G.agua.uniforms, fog = R.scene.fog;
    R.renderer.toneMappingExposure = L ? L.exposicion : B.exposicion;
    if (L) { R.hemi.color.set(L.luces.cielo); R.hemi.groundColor.set(L.luces.suelo); R.hemi.intensity = L.luces.hemi; R.sun.color.set(L.luces.sol); R.sun.intensity = L.luces.solInt; }
    else { R.hemi.color.copy(B.hemi.color); R.hemi.groundColor.copy(B.hemi.suelo); R.hemi.intensity = B.hemi.int; R.sun.color.copy(B.sol.color); R.sun.intensity = B.sol.int; }
    if (sky) {
      if (L) { sky.uCenit.value.copy(lin(L.cielo.cenit)); sky.uHorizonte.value.copy(lin(L.cielo.horizonte)); sky.uSolCol.value.copy(lin(L.cielo.sol)); }
      else { sky.uCenit.value.copy(B.sky.cenit); sky.uHorizonte.value.copy(B.sky.horizonte); sky.uSolCol.value.copy(B.sky.sol); }
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
    aplicarChunks(L); aplicarAmbiente(L); barrer(L, true);
    G.emit('contexto', true); // el atlas de impostores de la flora se repinta con el look
    try { sessionStorage.setItem('ave.look', nombre); } catch (e) { /* sin almacén */ }
    sincronizarMenu();
    return nombre;
  }
  function quitar() {
    if (!actual) return null;
    actual = null;
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
    if (!actual) return;
    const h = huellaDe(), nuevo = h !== huella; huella = h;
    if (nuevo || ++barridoN % 90 === 0) { barrer(LOOKS[actual], false); gradoFabrica(LOOKS[actual]); if (!nuevo && climaQuieto()) aplicarAmbiente(LOOKS[actual]); }
  }, 90);
  G.on('mundoListo', () => { if (actual) barrer(LOOKS[actual], false); });

  // ---------- Medidas: FPS, draw calls, triángulos, programas y memoria de texturas (estimada desde las imágenes) ----------
  function medir() {
    const s = R.stats(), vistas = new Set(); let bytes = 0, n = 0, grandes = 0;
    let atlas = 0;
    R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) texturasDe(m, t => {
      if (vistas.has(t)) return; vistas.add(t);
      const img = t.image, w = img && (img.width || (img.data && img.width)) || 0, h = img && img.height || 0;
      if (!w) return; n++;
      const esAtlas = /\/tex_hd\/hd_/.test((img && (img.src || img.currentSrc)) || '');
      if (w > 512) { grandes++; if (esAtlas) atlas++; }
      bytes += w * h * 4 * (t.generateMipmaps ? 4 / 3 : 1);
    }); });
    const C = R.calidad, sombra = C.sombras ? C.sombras * C.sombras * 4 : 0;
    const dbs = R.renderer.getDrawingBufferSize(new THREE.Vector2()), post = R.post.activo ? dbs.x * dbs.y * 8 * 2.5 : 0;
    const pm = performance.memory, heapMB = pm && pm.usedJSHeapSize ? Math.round(pm.usedJSHeapSize / 1048576) : null;
    return { look: actual || 'fabrica', fps: s.fps, calls: s.calls, triangulos: s.triangulos, calidad: s.calidad, dpr: s.dpr, post: s.post,
      programas: R.renderer.info.programs.length, heapMB, geometrias: R.renderer.info.memory.geometries, texturasGPU: R.renderer.info.memory.textures, texturas: n, texturasGrandes: grandes, atlasGrandes: atlas, texturasMB: Math.round(bytes / 1048576 * 10) / 10,
      sombraMB: Math.round(sombra / 1048576 * 10) / 10, postMB: Math.round(post / 1048576 * 10) / 10 };
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
    const foto = () => {
      R.drawScene(R.camera); R.renderer.setRenderTarget(null);
      const gl = R.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let croma = 0, n = 0, quemado = 0;
      for (let i = 0; i < px.length; i += 16) { const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b); croma += mx - Math.min(r, g, b); if (mx >= 252 && Math.min(r, g, b) >= 236) quemado++; n++; }
      return { croma: croma / n, quemado: quemado / n }; // croma medio (0–255) y fracción de píxeles casi blancos (quemados)
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
    try {
      if (actual) quitar();
      await cuadro();
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
        await cuadro(); await cuadro();
        const f1 = foto(), c1 = f1.croma, m1 = medir(), L = LOOKS[n];
        check(`Look «${n}»: se aplica (chunk, exposición, sol, cielo, niebla y clave de programas)`, actual === n && SC.tonemapping_fragment !== ORIG.tone && R.renderer.toneMappingExposure === L.exposicion &&
          R.sun.intensity === L.luces.solInt && (!R.sky || hex(R.sky.material.uniforms.uCenit.value) === hex(lin(L.cielo.cenit))) && (!R.ATMOS || R.scene.fog.far === L.niebla.fin) &&
          new THREE.MeshBasicMaterial().customProgramCacheKey().endsWith('|look:' + n), Math.round(tApl) + ' ms en aplicar');
        check(`Look «${n}»: la imagen tiene más color que la de fábrica`, c1 > c0 * 1.03, 'croma medio ' + c0.toFixed(1) + ' → ' + c1.toFixed(1));
        check(`Look «${n}»: el chip de la pausa lo marca`, !!sec && sec.querySelector(`button[data-look="${n}"]`).getAttribute('aria-pressed') === 'true');
        { const pg = R.post && R.post.grade && R.post.grade.uniforms;
          check(`Look «${n}»: sustituye la gradación de fábrica en vez de sumarse (CustomToneMapping = ACES puro; uSat/uCon del composer = 1; viñeta intacta)`,
            /CustomToneMapping\( vec3 color \) \{ return ACESFilmicToneMapping\( color \); \}/.test(SC.tonemapping_pars_fragment) && (!pg || (pg.uSat.value === 1 && pg.uCon.value === 1 && pg.uTint.value.x === 1 && pg.uVig.value === (R.post.grade.uniforms.uVig.value))), pg ? 'composer' : 'sin composer'); }
        if (L.toon) {
          check(`Look «${n}»: la rampa suave está en Phong y Lambert y Standard/Physical (Vittata) no cambian`, SC.lights_phong_pars_fragment.includes(RAMPA) && SC.lights_lambert_vertex.includes(RAMPA) && !SC.lights_physical_pars_fragment.includes(RAMPA));
          const g0 = m0.texturasGrandes - (m0.atlasGrandes || 0), g1 = m1.texturasGrandes - (m1.atlasGrandes || 0);
          check(`Look «${n}»: las texturas grandes del mundo bajan a 512 px`, g1 < g0 || g0 === 0, m0.texturasGrandes + ' → ' + m1.texturasGrandes + ' (el atlas HD no se encoge: ' + (m1.atlasGrandes || 0) + ') · ' + m0.texturasMB + ' → ' + m1.texturasMB + ' MB');
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
        check(`Look «${n}»: mismo número de draw calls que de fábrica (±10 % o 8: la fauna, los peces, las partículas y la bandada van y vienen entre medidas)`, Math.abs(m1.calls - m0.calls) <= Math.max(8, m0.calls * 0.1), m0.calls + ' → ' + m1.calls + ' · ' + m0.triangulos + ' → ' + m1.triangulos + ' triángulos · programas ' + m0.programas + ' → ' + m1.programas);
      }
      quitar(); await cuadro(); await cuadro();
      const F1 = firma(), c2 = foto().croma, m2 = medir();
      check('Al quitar el look todo vuelve a fábrica (chunks, exposición, luces, cielo, niebla, saturación del suelo, claves)', F0 === F1, F0 === F1 ? '' : 'difiere');
      check('Al quitar el look la imagen vuelve a la de fábrica', Math.abs(c2 - c0) < Math.max(1.5, c0 * 0.04), 'croma ' + c0.toFixed(1) + ' → ' + c2.toFixed(1));
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
      if (quieta) quieta.set('prueba-look', false);
    }
    return result();
  }

  const api = { aplicar, quitar, get actual() { return actual; }, LOOKS, DEFECTO, medir, test, ORIG };
  if (window.AV) window.AV.look = api;
  return api;
};
