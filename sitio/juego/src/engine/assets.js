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
  // KIMI-204: sufijo del JPEG ligero del difuso del atlas en «bajo» ('_lq' 2048² en escritorio/tablet,
  // '_lq1024' en el móvil de pantalla pequeña — el tope que reducirAtlas ya le aplicaba por canvas).
  // Lo fija streaming.js según calidad y dispositivo.
  let sufijoLQDifuso = () => '_lq';
  // KIMI-207 (QA-201): en «medio/alto» la normal del atlas que los GLB referencian por URI interna
  // (templo_*_lejos, _hd del kit…) se sirve como el JPEG horneado 2048² hd_<kit>_n_lq.jpg (~1,7 MB frente
  // a ~14 MB del 4096²), mismo criterio que materialAtlas de streaming.js. El predicado lo fija streaming.js.
  let normalLQMedia = () => true;
  const TEX_HD_NORMAL = /\/tex_hd\/hd_(ancient|savage)_n\.jpg([?#].*)?$/;
  // KIMI-202: los GLB lejanos/_hd del kit de la ciudad referencian el difuso del atlas 4096² por URI interna
  // (templo_*_lejos, complejo_ruinas_*, muro_templo_*, ruina_torre_* → hd_ancient; los _hd del kit savage →
  // hd_savage). GLTFLoader las pide al parsear aunque la fusión descarte el material propio: en «bajo» se
  // sirve el JPEG ligero 2048² horneado (hd_<kit>_lq.jpg, misma resolución que ya aplicaba reducirAtlas).
  const TEX_HD_DIFUSO = /\/tex_hd\/hd_(ancient|savage)\.jpg([?#].*)?$/;
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
      if (!normalPlanaBaja()) return url;
      if (TEX_HD_DIFUSO.test(url)) return url.replace(/hd_(ancient|savage)\.jpg/, 'hd_$1' + sufijoLQDifuso() + '.jpg');
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
  AVE.assets = { script, loadGLB, image, imagenRetenida: retenida, setNormalPlanaBaja, setSufijoLQDifuso, setNormalLQMedia };

  AVE.module('assets', function () {
    const loader = new THREE.TextureLoader();
    // Textura del mundo con repetición (ruta relativa al documento)
    function tex(path, cb) {
      const t = loader.load(path, cb);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
      return t;
    }
    return { script, loadGLB, image, tex, loader, setNormalPlanaBaja, setSufijoLQDifuso, setNormalLQMedia };
  });
})();
