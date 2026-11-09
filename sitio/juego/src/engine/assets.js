/* AVE · cargador de assets
   - AVE.assets.loadGLB: cargador único "primero el .glb; si el host no lo sirve, la copia base64 de un .js que asigna un global".
     Lo usan el mundo (islas), character.js (modelo y ropa) y cualquier pack. En el artifact de Claude el .glb puede dar 404
     y entonces se usa el base64; los .js de datos se cargan con <script src> relativo (sin fetch a otros dominios).
     La build publicada (<meta name="ave:sin-glb">) va directo al base64, y la cadena se suelta en cuanto se decodifica.
     La build comprime la geometría con gltfpack (EXT_meshopt_compression + KHR_mesh_quantization; docs/equipo/BUILD.md):
     se decodifica con MeshoptDecoder (assets/vendor/meshopt) y los atributos cuantizados pasan a Float32 al cargar, así el
     resto del motor (vegetación, sólidos, colisiones, streaming) lee las mismas posiciones, normales y colores que antes.
   - AVE.assets.image: imágenes en caché (resuelve null si fallan).
   - Módulo G.assets: además, texturas repetibles para el mundo. */
(function () {
  'use strict';

  // Una sola descarga por imagen. three r128 deja THREE.Cache apagado (encenderlo también retendría
  // cada .glb de FileLoader). En Chrome el glTF usa ImageBitmapLoader, no ImageLoader: cada modelo _hd
  // volvía a bajar el atlas. El bitmap se comparte; quien lo suelta no llama a close() si sigue aquí.
  const imagenes = new Map();
  const bitmaps = new Map();
  function retenida(img) {
    if (!img) return false;
    for (const s of imagenes.values()) if (s.listo === img) return true;
    for (const s of bitmaps.values()) if (s.listo === img) return true;
    return false;
  }
  function cacheCarga(mapa, Clase) {
    const origen = Clase.prototype.load;
    Clase.prototype.load = function (url, onLoad, onProgress, onError) {
      let abs = url;
      if (this.path !== undefined) abs = this.path + url;
      abs = this.manager.resolveURL(abs);
      const ya = mapa.get(abs);
      if (ya && ya.listo) {
        const img = ya.listo, mgr = this.manager;
        mgr.itemStart(abs);
        setTimeout(() => { if (onLoad) onLoad(img); mgr.itemEnd(abs); }, 0);
        return ya.el;
      }
      if (ya) {
        this.manager.itemStart(abs);
        ya.wait.push({ onLoad, onError, manager: this.manager });
        return ya.el;
      }
      const slot = { listo: null, el: null, wait: [] };
      mapa.set(abs, slot);
      const el = origen.call(this, url, img => {
        slot.listo = img;
        const ws = slot.wait.splice(0);
        if (onLoad) onLoad(img);
        for (const w of ws) { try { if (w.onLoad) w.onLoad(img); } finally { w.manager.itemEnd(abs); } }
      }, onProgress, err => {
        mapa.delete(abs);
        if (onError) onError(err);
        const ws = slot.wait.splice(0);
        for (const w of ws) { try { if (w.onError) w.onError(err); } finally { w.manager.itemEnd(abs); } }
      });
      slot.el = el;
      return el;
    };
  }
  if (window.THREE && THREE.ImageLoader) cacheCarga(imagenes, THREE.ImageLoader);
  if (window.THREE && THREE.ImageBitmapLoader) cacheCarga(bitmaps, THREE.ImageBitmapLoader);

  const scripts = {};
  // Carga un .js clásico por ruta relativa (una vez por ruta)
  function script(src) {
    if (scripts[src]) return scripts[src];
    scripts[src] = new Promise((resolve, reject) => {
      const sc = document.createElement('script'); sc.src = src; sc.charset = 'utf-8';
      sc.onload = () => resolve(src); sc.onerror = () => { delete scripts[src]; reject(new Error('no se pudo cargar ' + src)); };
      document.head.appendChild(sc);
    });
    return scripts[src];
  }

  // Base64 → bytes. Uint8Array.fromBase64 (Chrome 140, Safari 18.2, Firefox 133) no crea la copia intermedia de atob.
  function bytesB64(s) {
    if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(s);
    const bin = atob(s), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf;
  }
  // Un *_glb.js deja su cadena en window.AV_<KIT>_B64: la cadena sola (vittata, isla) o un registro { nombre: cadena }.
  // Ya decodificada se suelta: si no, ~15 MB de base64 se quedan en el heap toda la partida. Si el modelo se vuelve a
  // pedir (streaming, otra zona), el global ya no está y loadGLB inyecta otra vez su _glb.js.
  const REGISTRO_B64 = /^AV_[A-Z0-9_]*_B64$/;
  function soltarB64(s) {
    for (const k of Object.keys(window)) {
      if (!REGISTRO_B64.test(k)) continue;
      const v = window[k];
      if (v === s) { try { delete window[k]; } catch (e) { window[k] = undefined; } return; }
      if (v && typeof v === 'object') for (const n of Object.keys(v)) if (v[n] === s) { delete v[n]; return; }
    }
  }
  // La build publicada (tools/build/build.sh) no trae .glb y lo marca con <meta name="ave:sin-glb">: se va directo al
  // _glb.js, sin una petición .glb con 404 por modelo. En desarrollo (sin la marca) primero se prueba el .glb.
  let sinGLB = null;
  const buildSinGLB = () => (sinGLB != null ? sinGLB : (sinGLB = !!document.querySelector('meta[name="ave:sin-glb"]')));

  // Atributos enteros (cuantizados por gltfpack) → Float32 con su valor real: normalizados se dividen por el máximo del tipo
  // (getX de r128 no desnormaliza) y los enteros sin normalizar (posiciones -vpi) conservan su valor, con la escala en el nodo.
  // skinIndex se queda entero (son índices de hueso). Sin cuantizar no hace nada.
  const MAXN = [[Int8Array, 127], [Uint8Array, 255], [Int16Array, 32767], [Uint16Array, 65535]];
  function aFloat(a) {
    if (!a || a.array instanceof Float32Array) return a;
    const fila = MAXN.find(([T]) => a.array instanceof T), k = a.normalized && fila ? 1 / fila[1] : 1;
    const signo = !!(a.normalized && fila && (fila[0] === Int8Array || fila[0] === Int16Array));
    const n = a.count, s = a.itemSize, out = new Float32Array(n * s), get = [a.getX, a.getY, a.getZ, a.getW];
    for (let i = 0; i < n; i++) for (let c = 0; c < s && c < 4; c++) { const v = get[c].call(a, i) * k; out[i * s + c] = signo ? Math.max(v, -1) : v; }
    return new THREE.BufferAttribute(out, s);
  }
  function descuantizar(gltf) {
    const hechas = new Set();
    gltf.scene.traverse(o => {
      const g = o.geometry; if (!g || hechas.has(g)) return; hechas.add(g);
      for (const k in g.attributes) if (k !== 'skinIndex') { const a = g.attributes[k], f = aFloat(a); if (f !== a) g.setAttribute(k, f); }
      for (const k in g.morphAttributes) g.morphAttributes[k] = g.morphAttributes[k].map(aFloat);
    });
    return gltf;
  }
  // KIMI-177: normal plana 2×2 (RGB 128,128,255) en data URI. En «bajo» sustituye a la normal gigante del kit
  // de la ciudad (JPEG de ~14 MB referenciado por URI dentro de los GLB cerca/lejos: GLTFLoader la pedía al
  // parsear aunque el material propio se descartara al fusionarse con el atlas AV_HD). Mismo criterio que el
  // atlas («el relieve va en el atlas, solo en alta», streaming.js): a DPR 0,75 no se aprecia. El predicado
  // de calidad lo fija streaming.js; si la calidad sube, el gancho 'calidad' engancha la normal verdadera.
  const NORMAL_PLANA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGNoaPgPRAwQCgA19gf9SShDzAAAAABJRU5ErkJggg==';
  let normalPlanaBaja = () => false;
  // KIMI-204/KIMI-250: sufijo del JPEG ligero del difuso del atlas ('_lq1024' en el móvil de pantalla
  // pequeña — el tope que reducirAtlas ya le aplicaba por canvas —, '_lq' 2048² en el resto). Lo fija
  // streaming.js. KIMI-250: en medio/alto lo usa también el arranque (el parse de los GLB referencia el
  // 4096² por URI interna) hasta que el atlas real sube en background (~20 s, streaming.js).
  let sufijoLQDifuso = () => '_lq';
  // KIMI-250: por kit (ancient|savage), si el 4096 real ya se pidió en background. Mientras no, el
  // URLModifier sirve el JPEG LQ de arranque en cualquier calidad; al ponerse a true, los parses siguientes
  // piden el 4096 (caché HTTP: sin bytes nuevos de red) y los materiales nuevos nacen sin marca de LQ.
  const atlasHDListo = {};
  function setAtlasHDListo(kit, v) { atlasHDListo[kit] = !!v; }
  function atlasHDListoEs(kit) { return !!atlasHDListo[kit]; }
  // KIMI-207 (QA-201): en «medio/alto» la normal del atlas que los GLB referencian por URI interna
  // (templo_*_lejos, _hd del kit…) se sirve como el JPEG horneado 2048² hd_<kit>_n_lq.jpg (~1,7 MB frente
  // a ~14 MB del 4096²), mismo criterio que materialAtlas de streaming.js. El predicado lo fija streaming.js.
  let normalLQMedia = () => true;
  const TEX_HD_NORMAL = /\/tex_hd\/hd_(ancient|savage)_n\.jpg([?#].*)?$/;
  // KIMI-202/KIMI-250: los GLB lejanos/_hd del kit de la ciudad referencian el difuso del atlas 4096² por URI
  // interna (templo_*_lejos, complejo_ruinas_*, muro_templo_*, ruina_torre_* → hd_ancient; los _hd del kit
  // savage → hd_savage) y GLTFLoader las pide al parsear aunque la fusión descarte el material propio: en
  // «bajo» se sirve el JPEG ligero 2048² horneado (hd_<kit>_lq.jpg, misma resolución que ya aplicaba
  // reducirAtlas). KIMI-250: en medio/alto igual mientras el kit no esté «listo» (eran 9,5 MB de los 61,4 de
  // la carga de arranque medidos con GPU real, KIMI-244, tope 28 incumplido); al subir el real en background
  // (~20 s) el flag por kit devuelve el 4096 a los parses siguientes (caché HTTP, sin bytes nuevos).
  const TEX_HD_DIFUSO = /\/tex_hd\/hd_(ancient|savage)\.jpg([?#].*)?$/;
  // «Texturas optimizadas» (Modo Escuela, QA-181; memoria del iPhone, QA-110; Kelvin 8-nov: KTX2 solo en «bajo» y con
  // calidad.escuela). El difuso LQ del atlas (hd_<kit>_lq.jpg / _lq1024.jpg, 21 MB de GPU el 2048²) se usa como KTX2 Basis
  // ETC1S (.ktx2 junto al JPEG, que sigue siendo la fuente) y la GPU lo recibe ya comprimido (ETC2/ETC1/BC1/PVRTC: 0,5 B/px,
  // ~2,7 MB con mipmaps). KTX2Loader y WorkerPool de three r136 (los últimos examples/js clásicos; compatibles con el núcleo
  // r128) y su transcoder (basis_universal 7f0a00a = el basisu 1.15 de la build). docs/equipo/BUILD.md, tabla por textura.
  // La build lista en <meta name="ave:ktx2"> los JPEG con .ktx2 al día; sin la marca (desarrollo), sin formato de GPU útil o
  // si el transcoder falla, se queda el JPEG de hoy. El transcoder (~0,55 MB) se carga solo en esos modos. Mientras llega, el
  // parse del GLB recibe un 2×2 del color medio del kit en vez del JPEG (no se baja dos veces) y streaming.js
  // (ajustarComprimida) pone el KTX2 al llegar, o el JPEG si algo falla. Medio/alto sin escuela: exactamente como antes.
  const KTX2_DIR = 'assets/vendor/three/examples/js/libs/basis/';
  const PLANO_KIT = {
    ancient: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR42mOc25HGwMDAxMDAwMDAAAAS5QGP7xo2eAAAAABJRU5ErkJggg==',
    savage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR42mNMCHJmYGBgYmBgYGBgAAALwwD5xvKY5wAAAABJRU5ErkJggg=='
  };
  let comprimidaActiva = () => false, rendererKTX2 = null, soporteKTX2, registroKTX2 = null, ktx2Loader = null, ktx2Pend = 0, soltarKTX2 = 0;
  const absURL = u => { try { return new URL(u, document.baseURI).href; } catch (e) { return String(u); } };
  function setComprimida(f, renderer) { comprimidaActiva = typeof f === 'function' ? f : () => !!f; if (renderer) rendererKTX2 = renderer; }
  // Formatos de GPU a los que el transcoder lleva ETC1S (por orden: ETC2, ETC1, BC1, PVRTC). BC7 se descarta para ETC1S
  // (1 B/px, el doble que BC1 sin ganar calidad). Sin ninguno, se queda el JPEG: transcodificar a RGBA32 no ahorra memoria.
  function configKTX2() {
    if (soporteKTX2 !== undefined) return soporteKTX2;
    const r = typeof rendererKTX2 === 'function' ? rendererKTX2() : rendererKTX2; if (!r || !r.extensions) return null;
    const has = e => { try { return !!r.extensions.has(e); } catch (er) { return false; } };
    const c = { astcSupported: has('WEBGL_compressed_texture_astc'), bptcSupported: false,
      etc2Supported: has('WEBGL_compressed_texture_etc'), etc1Supported: has('WEBGL_compressed_texture_etc1') && !(r.capabilities && r.capabilities.isWebGL2),
      dxtSupported: has('WEBGL_compressed_texture_s3tc'), pvrtcSupported: has('WEBGL_compressed_texture_pvrtc') || has('WEBKIT_WEBGL_compressed_texture_pvrtc') };
    return (soporteKTX2 = c.etc2Supported || c.etc1Supported || c.dxtSupported || c.pvrtcSupported ? c : null);
  }
  function ktx2De(url) {
    if (!url || ktx2Roto || !comprimidaActiva() || !configKTX2()) return null;
    if (!registroKTX2) {
      const m = document.querySelector('meta[name="ave:ktx2"]');
      registroKTX2 = new Set(((m && m.getAttribute('content')) || '').split(/\s+/).filter(Boolean).map(absURL));
    }
    const a = absURL(url).replace(/[?#].*$/, '');
    return registroKTX2.has(a) ? a.replace(/\.(jpe?g|png|webp)$/i, '.ktx2') : null;
  }
  // Carga el .ktx2 de una imagen registrada: ok(CompressedTexture) o falla(error). A los 15 s sin cargas pendientes se
  // sueltan el loader y su worker (el wasm no se queda en memoria; los dos kits llegan con segundos de diferencia y
  // comparten el mismo transcoder; si hace falta otra vez, sale de la caché HTTP).
  // QA-nuevo-edif-android (9-nov, Kelvin en Android: «los edificios se ven rotos de nuevo», cajas beige planas): mientras
  // el .ktx2 no llega, el atlas es el 2×2 del color del kit (PLANO_KIT) y los edificios se ven lisos. Antes cada material
  // nuevo del atlas (al soltarse la última zona que lo usaba y volver a entrar en otra, o el kit Ancient al llegar volando a
  // las Atalayas) esperaba otra vez transcoder + worker + transcodificación, y si el worker no contestaba nunca (wasm o
  // worker caídos en el móvil: WorkerPool de r136 no tiene onerror) se quedaba plano para siempre, sin el JPEG de respaldo.
  // Ahora: (1) la textura transcodificada se guarda por URL (≈0,7 MB de CPU por kit; la GPU la vuelve a subir si un
  // material la soltó) y ktx2Listo(url) la da al momento; (2) peticiones simultáneas de la misma URL comparten una;
  // (3) a los KTX2_ESPERA ms sin respuesta, falla (el streaming pone el JPEG) y la sesión deja el KTX2 (ktx2De → null);
  // (4) y si la GPU no lo muestra bien, igual (ktx2Correcto, abajo).
  const KTX2_ESPERA = 12000;
  const listosKTX2 = new Map(), enCursoKTX2 = new Map();
  let ktx2Roto = false, ultimaKTX2 = null;
  const planoKit = kit => PLANO_KIT[kit] || PLANO_KIT.ancient;
  // (4) Comprobación en la GPU del equipo: se dibuja el último mip del .ktx2 (el color medio del atlas) en un píxel y se lee.
  // Si no se parece a la media del kit (formato que la GPU no muestra, cadena de mips incompleta → negro o basura), el .ktx2
  // se descarta igual que si hubiera fallado: JPEG y la sesión sin KTX2. La media de cada kit es la del JPEG LQ (= PLANO_KIT).
  const MEDIA_KIT = { ancient: [157, 136, 102], savage: [96, 82, 67] };
  function ktx2Correcto(t, k) {
    const r = typeof rendererKTX2 === 'function' ? rendererKTX2() : rendererKTX2, m = /hd_(ancient|savage)_/.exec(k), media = m && MEDIA_KIT[m[1]];
    if (!r || !media || !r.readRenderTargetPixels || !(r.capabilities && r.capabilities.isWebGL2)) return { ok: true }; // WebGL1: sin textureLod
    let rt = null, geo = null, mat = null;
    try {
      if (r.getContext && r.getContext().isContextLost && r.getContext().isContextLost()) return { ok: true };
      rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });
      geo = new THREE.PlaneGeometry(2, 2);
      mat = new THREE.ShaderMaterial({ uniforms: { t: { value: t } }, depthTest: false, depthWrite: false,
        vertexShader: 'void main() { gl_Position = vec4( position.xy, 0.0, 1.0 ); }',
        fragmentShader: 'uniform sampler2D t; void main() { gl_FragColor = vec4( textureLod( t, vec2( 0.5 ), 20.0 ).rgb, 1.0 ); }' });
      const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), malla = new THREE.Mesh(geo, mat);
      malla.frustumCulled = false; sc.add(malla);
      const antes = r.getRenderTarget(), px = new Uint8Array(4);
      r.setRenderTarget(rt); r.render(sc, cam); r.readRenderTargetPixels(rt, 0, 0, 1, 1, px); r.setRenderTarget(antes);
      const dif = Math.max(Math.abs(px[0] - media[0]), Math.abs(px[1] - media[1]), Math.abs(px[2] - media[2]));
      return { ok: dif <= 48, px: Array.from(px.slice(0, 3)), dif };
    } catch (e) { return { ok: true, error: e && e.message }; } finally { if (rt) rt.dispose(); if (geo) geo.dispose(); if (mat) mat.dispose(); }
  }
  const estadoKTX2 = () => ({ roto: ktx2Roto, listos: listosKTX2.size, ultima: ultimaKTX2 });
  function ktx2Listo(url) { const k = ktx2De(url); return (k && listosKTX2.get(k)) || null; }
  function texKTX2(url, ok, falla) {
    const k = ktx2De(url);
    if (!k) { falla(new Error('sin variante .ktx2: ' + url)); return; }
    const hecha = listosKTX2.get(k);
    if (hecha) { ok(hecha); return; }
    const espera = enCursoKTX2.get(k);
    if (espera) { espera.push({ ok, falla }); return; }
    const lista = [{ ok, falla }];
    enCursoKTX2.set(k, lista);
    ktx2Pend++;
    clearTimeout(soltarKTX2);
    let cerrada = false;
    const fin = () => { if (--ktx2Pend === 0) soltarKTX2 = setTimeout(() => { if (ktx2Pend === 0 && ktx2Loader) { try { ktx2Loader.dispose(); } catch (e) { /* ya suelto */ } ktx2Loader = null; } }, 15000); };
    const cerrar = (t, e) => {
      if (cerrada) { if (t) { try { t.dispose(); } catch (er) { /* r128 */ } } return; }
      cerrada = true; clearTimeout(reloj); enCursoKTX2.delete(k); fin();
      if (t) {
        const v = ktx2Correcto(t, k);
        ultimaKTX2 = Object.assign({ url: k }, v);
        if (v.ok) listosKTX2.set(k, t);
        else { ktx2Roto = true; try { t.dispose(); } catch (er) { /* r128 */ } e = new Error('el .ktx2 no se ve bien en esta GPU (media ' + v.px + ', dif ' + v.dif + '): ' + k); t = null; }
      }
      for (const c of lista) { try { t ? c.ok(t) : c.falla(e); } catch (er) { console.warn('AVE assets: ktx2', er && er.message || er); } }
    };
    const reloj = setTimeout(() => { ktx2Roto = true; cerrar(null, new Error('el .ktx2 no llegó en ' + KTX2_ESPERA / 1000 + ' s: ' + k)); }, KTX2_ESPERA);
    script('assets/vendor/three/examples/js/utils/WorkerPool.js')
      .then(() => script('assets/vendor/three/examples/js/loaders/KTX2Loader.js'))
      .then(() => {
        if (!ktx2Loader) { ktx2Loader = new THREE.KTX2Loader(); ktx2Loader.setTranscoderPath(KTX2_DIR).setWorkerLimit(1); ktx2Loader.workerConfig = configKTX2(); }
        ktx2Loader.load(k, t => cerrar(t), undefined, e => cerrar(null, e));
      }).catch(e => cerrar(null, e));
  }
  function setNormalPlanaBaja(f) { normalPlanaBaja = typeof f === 'function' ? f : () => !!f; }
  function setSufijoLQDifuso(f) { sufijoLQDifuso = typeof f === 'function' ? f : () => String(f || '_lq'); }
  function setNormalLQMedia(f) { normalLQMedia = typeof f === 'function' ? f : () => !!f; }
  function cargador() {
    const mgr = new THREE.LoadingManager();
    mgr.setURLModifier(url => {
      if (TEX_HD_NORMAL.test(url)) {
        if (normalPlanaBaja()) return NORMAL_PLANA;
        if (normalLQMedia()) return url.replace(/hd_(ancient|savage)_n\.jpg/, 'hd_$1_n_lq.jpg');
        return url;
      }
      const mD = TEX_HD_DIFUSO.exec(url);
      if (mD && (normalPlanaBaja() || !atlasHDListo[mD[1]])) {
        const lq = url.replace(/hd_(ancient|savage)\.jpg/, 'hd_$1' + sufijoLQDifuso() + '.jpg');
        return ktx2De(lq) ? PLANO_KIT[mD[1]] : lq; // «texturas optimizadas»: el .ktx2 lo pone streaming.js
      }
      return url;
    });
    const L = new THREE.GLTFLoader(mgr);
    if (window.MeshoptDecoder && L.setMeshoptDecoder) L.setMeshoptDecoder(window.MeshoptDecoder);
    return L;
  }

  // o = { b64: () => cadena base64 o undefined, script: ruta del _glb.js que define el global, base: ruta de recursos, error: texto }
  function loadGLB(url, o) {
    o = o || {};
    return new Promise((ok, reject) => {
      // r128 resuelve el gltf con `parser`, que retiene el GLB crudo entero (GLTFBinaryExtension.body) y las
      // estructuras del parse: QA-152/153 (heap retenido jugando). Nada del juego lo usa: se suelta al resolver
      // para que el cuerpo binario se libere deterministamente en cuanto el parse acaba (el gltf vivo —Vittata,
      // islas, ropa— queda sin el body; el resto ya era basura, pero esta referencia la retenía hasta el GC).
      const resolve = gltf => { try { if (gltf && gltf.parser) gltf.parser = null; ok(descuantizar(gltf)); } catch (e) { reject(e); } };
      if (!THREE.GLTFLoader) { reject(new Error('GLTFLoader no disponible')); return; }
      const falla = () => reject(new Error(o.error || 'no disponible: ' + url));
      const parse = () => {
        const s = o.b64 && o.b64();
        if (!s) { falla(); return; }
        try {
          const buf = bytesB64(s);
          soltarB64(s);
          cargador().parse(buf.buffer, o.base || '', resolve, reject);
        } catch (e) { reject(e); }
      };
      const fromB64 = () => {
        if (o.b64 && o.b64()) { parse(); return; }
        if (!o.script) { falla(); return; }
        // Sin caché de script: si el global no está (no cargó o ya se soltó), cada intento vuelve a pedirlo
        const sc = document.createElement('script'); sc.src = o.script;
        sc.onload = () => { sc.remove(); parse(); }; sc.onerror = () => { sc.remove(); falla(); };
        document.head.appendChild(sc);
      };
      if (buildSinGLB() && (o.script || (o.b64 && o.b64()))) fromB64();
      else cargador().load(url, resolve, undefined, fromB64);
    });
  }

  const imgCache = {};
  function image(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache[src]) return imgCache[src];
    imgCache[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    return imgCache[src];
  }

  // La build marca <meta name="ave:build">. El service worker cachea modelos y tex_hd con ese sha:
  // la primera vez se bajan al pedirlos; las visitas siguientes los leen de caché si el sha no cambió.
  function registrarCache() {
    if (!('serviceWorker' in navigator)) return;
    let sha = '';
    try {
      const m = document.querySelector('meta[name="ave:build"]');
      sha = m && (m.getAttribute('content') || '').trim().split(/\s+/).pop() || '';
    } catch (e) { return; }
    if (!sha) return;
    const u = new URL('sw.js', document.baseURI);
    u.searchParams.set('b', sha);
    navigator.serviceWorker.register(u.href).catch(() => {});
  }
  registrarCache();

  window.AVE = window.AVE || {};
  AVE.assets = { script, loadGLB, image, imagenRetenida: retenida, setNormalPlanaBaja, setSufijoLQDifuso, setNormalLQMedia, setComprimida, ktx2De, texKTX2, ktx2Listo, estadoKTX2, planoKit };

  AVE.module('assets', function () {
    const loader = new THREE.TextureLoader();
    // Textura del mundo con repetición (ruta relativa al documento)
    function tex(path, cb) {
      const t = loader.load(path, cb);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
      return t;
    }
    return { script, loadGLB, image, tex, loader, setNormalPlanaBaja, setSufijoLQDifuso, setNormalLQMedia, setAtlasHDListo, atlasHDListoEs, setComprimida, ktx2De, texKTX2, ktx2Listo, estadoKTX2, planoKit };
  });
})();
