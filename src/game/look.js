/* Juego · Looks de color (A/B para Kelvin): «vibrante», «soleado» y «toon» frente al look de fábrica.
   Carga perezosa desde boot.js (window.AVLook(G)). El look de fábrica no se toca: sin look activo este módulo no cambia ni
   un byte de los shaders ni de los valores del pack; cada look guarda lo que pisa y lo devuelve al quitarse.
   Cómo se elige: ?look=vibrante en la URL (manda sobre todo), sessionStorage 'ave.look' (lo que se eligió en la pausa) o la
   sección oculta «Look» del menú de pausa (se ve con ?look=… o con localStorage 'ave.look.dev' = '1').
   Para fijar uno de fábrica el día que Kelvin decida: cambiar DEFECTO abajo (una línea).
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
  const ORIG = { tone: SC.tonemapping_fragment, phong: SC.lights_phong_pars_fragment, lambert: SC.lights_lambert_vertex };
  const DEFECTO = null; // ← el look de fábrica. Cuando Kelvin elija: 'vibrante', 'soleado' o 'toon'.
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
    m.customProgramCacheKey = () => k() + sufijo();
  }
  const claveOriginal = m => { const k = propias.get(m); return k ? k() : null; };

  // ---------- Shaders: gradación, rampa toon ----------
  const f = v => (Math.round(v * 1000) / 1000).toFixed(3);
  function chunkTone(L) {
    const g = L.grade, t = g.tint;
    const extra = [
      '\t{ vec3 c = sqrt( max( gl_FragColor.rgb, 0.0 ) ); float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );',
      `\t  c = mix( vec3( l ), c, ${f(g.sat)} ); c = ( c - 0.5 ) * ${f(g.con)} + 0.5;`,
      `\t  c = max( c * vec3( ${f(t[0])}, ${f(t[1])}, ${f(t[2])} ), 0.0 ); gl_FragColor.rgb = c * c; }`,
    ].join('\n');
    const linea = 'gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );';
    return ORIG.tone.includes(linea) ? ORIG.tone.replace(linea, linea + '\n' + extra) : ORIG.tone;
  }
  const RAMPA = 'smoothstep( -0.05, 0.45, ';
  function aplicarChunks(L) {
    SC.tonemapping_fragment = L ? chunkTone(L) : ORIG.tone;
    SC.lights_phong_pars_fragment = L && L.toon ? ORIG.phong.replace('float dotNL = saturate( dot( geometry.normal, directLight.direction ) );', 'float dotNL = ' + RAMPA + 'dot( geometry.normal, directLight.direction ) );') : ORIG.phong;
    SC.lights_lambert_vertex = L && L.toon ? ORIG.lambert.split('saturate( dotNL )').join(RAMPA + 'dotNL )').split('saturate( -dotNL )').join(RAMPA + '-dotNL )') : ORIG.lambert;
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
    if (!imagenes.has(t)) { if (!(img.width > max && img.height > max)) return; imagenes.set(t, img); }
    const o = imagenes.get(t);
    if (!max) { if (t.image !== o) { t.image = o; t.needsUpdate = true; } return; }
    if (t.image && t.image.width === max && t.image !== o) return;
    const c = document.createElement('canvas'); c.width = Math.min(max, o.width); c.height = Math.min(max, o.height);
    try { c.getContext('2d').drawImage(o, 0, 0, c.width, c.height); t.image = c; t.needsUpdate = true; } catch (e) { /* imagen sin leer: se queda */ }
  }
  function tocar(m, L) {
    envolverClave(m);
    const u = m.userData && m.userData.splat && m.userData.uniforms;
    if (u && u.uSat) { if (!guardado.has(u.uSat)) guardado.set(u.uSat, u.uSat.value.clone()); u.uSat.value.copy(guardado.get(u.uSat)).multiplyScalar(L ? L.terrenoSat : 1); }
    if (claveOriginal(m) === 'hoja' && m.color) { if (!guardado.has(m)) guardado.set(m, m.color.clone()); m.color.copy(guardado.get(m)); if (L) m.color.multiply(new THREE.Color(L.hoja[0], L.hoja[1], L.hoja[2])); }
    const max = L ? TEX_URL || L.texMax || 0 : 0;
    texturasDe(m, t => encoger(t, max));
    m.needsUpdate = true;
    if (L) tocados.add(m); else tocados.delete(m);
  }
  function barrer(L, todos) {
    const max = L ? TEX_URL || L.texMax || 0 : 0;
    R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (todos || !tocados.has(m)) tocar(m, L);
      else if (max) texturasDe(m, t => encoger(t, max)); // las imágenes llegan después del primer toque: se encogen al verlas
    } });
    if (!L) { for (const m of tocados) tocar(m, null); tocados.clear(); }
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
    guardarBase();
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
    if (!L) return quitar();
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
  G.on('render', () => { if (actual && ++barridoN % 90 === 0) { barrer(LOOKS[actual], false); if (climaQuieto()) aplicarAmbiente(LOOKS[actual]); } }, 90);
  G.on('mundoListo', () => { if (actual) barrer(LOOKS[actual], false); });

  // ---------- Medidas: FPS, draw calls, triángulos, programas y memoria de texturas (estimada desde las imágenes) ----------
  function medir() {
    const s = R.stats(), vistas = new Set(); let bytes = 0, n = 0, grandes = 0;
    R.scene.traverse(o => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) texturasDe(m, t => {
      if (vistas.has(t)) return; vistas.add(t);
      const img = t.image, w = img && (img.width || (img.data && img.width)) || 0, h = img && img.height || 0;
      if (!w) return; n++; if (w > 512) grandes++;
      bytes += w * h * 4 * (t.generateMipmaps ? 4 / 3 : 1);
    }); });
    const C = R.calidad, sombra = C.sombras ? C.sombras * C.sombras * 4 : 0;
    const dbs = R.renderer.getDrawingBufferSize(new THREE.Vector2()), post = R.post.activo ? dbs.x * dbs.y * 8 * 2.5 : 0;
    return { look: actual || 'fabrica', fps: s.fps, calls: s.calls, triangulos: s.triangulos, calidad: s.calidad, dpr: s.dpr, post: s.post,
      programas: R.renderer.info.programs.length, texturas: n, texturasGrandes: grandes, texturasMB: Math.round(bytes / 1048576 * 10) / 10,
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
  if (pedido && LOOKS[pedido]) aplicar(pedido);

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
      let croma = 0, n = 0;
      for (let i = 0; i < px.length; i += 16) { const r = px[i], g = px[i + 1], b = px[i + 2]; croma += Math.max(r, g, b) - Math.min(r, g, b); n++; }
      return croma / n;
    };
    const firma = () => {
      const u = R.sky && R.sky.material.uniforms, fog = R.scene.fog;
      let sat = ''; R.scene.traverse(o => { const m = o.material; if (m && m.userData && m.userData.splat) sat += m.userData.uniforms.uSat.value.toArray().map(v => v.toFixed(3)).join(',') + ';'; });
      return JSON.stringify({ tone: SC.tonemapping_fragment, phong: SC.lights_phong_pars_fragment, lambert: SC.lights_lambert_vertex,
        exp: R.renderer.toneMappingExposure, hemi: [hex(R.hemi.color), hex(R.hemi.groundColor), R.hemi.intensity], sol: [hex(R.sun.color), R.sun.intensity],
        sky: u && [hex(u.uCenit.value), hex(u.uHorizonte.value)], fog: fog && [hex(fog.color), fog.near, fog.far], sat, key: new THREE.MeshBasicMaterial().customProgramCacheKey() });
    };
    const quieta = G.pausa; if (quieta) quieta.set('prueba-look', true);
    if (G.clima && G.clima.fijar) G.clima.fijar('sol', { inmediato: true }); // sin transición de clima a mitad de la prueba
    try {
      if (actual) quitar();
      await cuadro();
      const F0 = firma(), c0 = foto(), m0 = medir();
      check('De fábrica: los ShaderChunks de three son los originales', SC.tonemapping_fragment === ORIG.tone && SC.lights_phong_pars_fragment === ORIG.phong && SC.lights_lambert_vertex === ORIG.lambert);
      check('De fábrica: exposición y luces del pack', R.renderer.toneMappingExposure === (W.exposicion != null ? W.exposicion : 0.7) && (!W.luces || R.sun.intensity === W.luces.solInt),
        'exposición ' + R.renderer.toneMappingExposure + ' · sol ' + R.sun.intensity);
      check('De fábrica: la clave de los programas es la de three', new THREE.MeshBasicMaterial().customProgramCacheKey() === keyProto.call(new THREE.MeshBasicMaterial()));
      check('La gradación se inyecta tras el ACES (el chunk de r128 tiene la línea esperada)', ORIG.tone.includes('gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );'));
      check('La rampa toon encuentra sus líneas en Phong y Lambert', ORIG.phong.includes('float dotNL = saturate( dot( geometry.normal, directLight.direction ) );') && ORIG.lambert.includes('saturate( dotNL )'));
      check('Sección «Look» en la pausa, oculta salvo en modo prueba, con un chip por look', !!sec && menu.contains(sec) && sec.hidden === !DEV && sec.querySelectorAll('button[data-look]').length === NOMBRES.length + 1);
      for (const n of NOMBRES) {
        const t0 = performance.now(); aplicar(n); const tApl = performance.now() - t0;
        await cuadro(); await cuadro();
        const c1 = foto(), m1 = medir(), L = LOOKS[n];
        check(`Look «${n}»: se aplica (chunk, exposición, sol, cielo, niebla y clave de programas)`, actual === n && SC.tonemapping_fragment !== ORIG.tone && R.renderer.toneMappingExposure === L.exposicion &&
          R.sun.intensity === L.luces.solInt && (!R.sky || hex(R.sky.material.uniforms.uCenit.value) === hex(lin(L.cielo.cenit))) && (!R.ATMOS || R.scene.fog.far === L.niebla.fin) &&
          new THREE.MeshBasicMaterial().customProgramCacheKey().endsWith('|look:' + n), Math.round(tApl) + ' ms en aplicar');
        check(`Look «${n}»: la imagen tiene más color que la de fábrica`, c1 > c0 * 1.03, 'croma medio ' + c0.toFixed(1) + ' → ' + c1.toFixed(1));
        check(`Look «${n}»: el chip de la pausa lo marca`, !!sec && sec.querySelector(`button[data-look="${n}"]`).getAttribute('aria-pressed') === 'true');
        if (L.toon) {
          check('Look «toon»: la rampa suave está en Phong y Lambert y Standard/Physical (Vittata) no cambian', SC.lights_phong_pars_fragment.includes(RAMPA) && SC.lights_lambert_vertex.includes(RAMPA) && !SC.lights_physical_pars_fragment.includes(RAMPA));
          check('Look «toon»: las texturas grandes del mundo bajan a 512 px', m1.texturasGrandes < m0.texturasGrandes || m0.texturasGrandes === 0, m0.texturasGrandes + ' → ' + m1.texturasGrandes + ' texturas de más de 512 px · ' + m0.texturasMB + ' → ' + m1.texturasMB + ' MB');
        }
        check(`Look «${n}»: mismo número de draw calls que de fábrica (±5 %)`, Math.abs(m1.calls - m0.calls) <= Math.max(3, m0.calls * 0.05), m0.calls + ' → ' + m1.calls + ' · ' + m0.triangulos + ' → ' + m1.triangulos + ' triángulos · programas ' + m0.programas + ' → ' + m1.programas);
      }
      quitar(); await cuadro(); await cuadro();
      const F1 = firma(), c2 = foto(), m2 = medir();
      check('Al quitar el look todo vuelve a fábrica (chunks, exposición, luces, cielo, niebla, saturación del suelo, claves)', F0 === F1, F0 === F1 ? '' : 'difiere');
      check('Al quitar el look la imagen vuelve a la de fábrica', Math.abs(c2 - c0) < Math.max(1.5, c0 * 0.04), 'croma ' + c0.toFixed(1) + ' → ' + c2.toFixed(1));
      check('Al quitar el look las texturas vuelven a su tamaño', m2.texturasGrandes === m0.texturasGrandes && Math.abs(m2.texturasMB - m0.texturasMB) < 0.5, m0.texturasMB + ' → ' + m2.texturasMB + ' MB');
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
