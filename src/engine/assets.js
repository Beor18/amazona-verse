/* AVE · cargador de assets
   - AVE.assets.loadGLB: cargador único "primero el .glb; si el host no lo sirve, la copia base64 de un .js que asigna un global".
     Lo usan el mundo (islas), character.js (modelo y ropa) y cualquier pack. En el artifact de Claude el .glb puede dar 404
     y entonces se usa el base64; los .js de datos se cargan con <script src> relativo (sin fetch a otros dominios).
     La build publicada (<meta name="ave:sin-glb">) va directo al base64, y la cadena se suelta en cuanto se decodifica.
   - AVE.assets.image: imágenes en caché (resuelve null si fallan).
   - Módulo G.assets: además, texturas repetibles para el mundo. */
(function () {
  'use strict';

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

  // o = { b64: () => cadena base64 o undefined, script: ruta del _glb.js que define el global, base: ruta de recursos, error: texto }
  function loadGLB(url, o) {
    o = o || {};
    return new Promise((resolve, reject) => {
      if (!THREE.GLTFLoader) { reject(new Error('GLTFLoader no disponible')); return; }
      const falla = () => reject(new Error(o.error || 'no disponible: ' + url));
      const parse = () => {
        const s = o.b64 && o.b64();
        if (!s) { falla(); return; }
        try {
          const buf = bytesB64(s);
          soltarB64(s);
          new THREE.GLTFLoader().parse(buf.buffer, o.base || '', resolve, reject);
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
      else new THREE.GLTFLoader().load(url, resolve, undefined, fromB64);
    });
  }

  const imgCache = {};
  function image(src) {
    if (!src) return Promise.resolve(null);
    if (imgCache[src]) return imgCache[src];
    imgCache[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    return imgCache[src];
  }

  window.AVE = window.AVE || {};
  AVE.assets = { script, loadGLB, image };

  AVE.module('assets', function () {
    const loader = new THREE.TextureLoader();
    // Textura del mundo con repetición (ruta relativa al documento)
    function tex(path) {
      const t = loader.load(path);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
      return t;
    }
    return { script, loadGLB, image, tex, loader };
  });
})();
