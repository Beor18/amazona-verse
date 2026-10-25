/* AVE · cargador de assets
   - AVE.assets.loadGLB: cargador único "primero el .glb; si el host no lo sirve, la copia base64 de un .js que asigna un global".
     Lo usan el mundo (islas), character.js (modelo y ropa) y cualquier pack. En el artifact de Claude el .glb puede dar 404
     y entonces se usa el base64; los .js de datos se cargan con <script src> relativo (sin fetch a otros dominios).
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

  // [Auditoría de motores, rama auditoria-motores] Dos mejoras medidas (docs/auditoria/ENGINE_AUDIT.md M-1 y M-2):
  // 1) Sondeo único: la primera carga decide si el host sirve .glb (en el artifact no). Las demás esperan esa respuesta
  //    (el primer evento de progreso o el error) y van directo al camino correcto: un 404 en vez de uno por modelo.
  // 2) La cadena base64 se borra de su global (window.AV_*) después de decodificarla: no queda residente en el heap.
  //    Quien vuelva a pedir el mismo modelo lo tiene en su caché (character, mundo, vegetación); si no, se recarga el _glb.js.
  let gate = null;          // Promise<boolean>: ¿el host sirve .glb?
  function liberar(s) {
    if (!s) return;
    for (const k of Object.keys(window)) {
      if (k.slice(0, 3) !== 'AV_') continue;
      const v = window[k];
      if (v === s) { try { delete window[k]; } catch (e) { window[k] = undefined; } return; }
      if (v && typeof v === 'object') for (const kk of Object.keys(v)) if (v[kk] === s) { delete v[kk]; return; }
    }
  }
  // o = { b64: () => cadena base64 o undefined, script: ruta del _glb.js que define el global, base: ruta de recursos, error: texto }
  function loadGLB(url, o) {
    o = o || {};
    return new Promise((resolve, reject) => {
      if (!THREE.GLTFLoader) { reject(new Error('GLTFLoader no disponible')); return; }
      const fromB64 = () => {
        const parse = () => {
          const s = o.b64(), bin = atob(s), buf = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          liberar(s);
          new THREE.GLTFLoader().parse(buf.buffer, o.base || '', resolve, reject);
        };
        if (o.b64 && o.b64()) { parse(); return; }
        if (!o.script) { reject(new Error(o.error || 'no disponible: ' + url)); return; }
        // Sin caché de script: si el global no quedó definido, cada intento vuelve a pedirlo (como antes)
        const sc = document.createElement('script'); sc.src = o.script;
        sc.onload = parse; sc.onerror = () => reject(new Error(o.error || 'no disponible: ' + url)); document.head.appendChild(sc);
      };
      if (!gate) {
        let abrir; gate = new Promise(r => { abrir = r; });
        new THREE.GLTFLoader().load(url, g => { abrir(true); resolve(g); },
          e => { const st = e && e.target && e.target.status; if (st >= 200 && st < 300) abrir(true); }, // ya llegan bytes del .glb
          () => { abrir(false); fromB64(); });
        return;
      }
      gate.then(ok => ok ? new THREE.GLTFLoader().load(url, resolve, undefined, fromB64) : fromB64());
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
