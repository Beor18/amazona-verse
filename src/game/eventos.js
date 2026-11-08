/* Juego · eventos narrativos (NARRATIVE_EVENT_SCHEMA.md)
   Registro de lo que pasa en la partida, sin datos personales. Lo usan el cómic, las pruebas y los disparadores "evento:".
   Datos del pack: eventos { defs: { Clave: { type, loc, chars, scene } }, extra(def, data) → { location, choice } },
   meta.capitulo. */
AVE.module('eventos', function (G) {
  'use strict';
  const S = G.S, E = G.pack.eventos || {};
  const SCHEMA = 1;
  const defs = E.defs || {};
  const chapter = (G.pack.meta && G.pack.meta.capitulo) || 1;
  // saveId explícito para poder migrar partidas viejas sin tocar G.S
  function make(key, data, seq, t, saveId) {
    const def = defs[key] || { type: key, loc: null, chars: [], scene: null };
    data = data || {};
    const id = saveId != null ? saveId : S.saveId;
    const x = E.extra ? E.extra(def, data) : { location: def.loc, choice: data.choice || null };
    return {
      id: id + '-' + seq, schemaVersion: SCHEMA, saveId: id,
      type: def.type, key, chapter, seq, t,
      location: x.location, characters: def.chars.slice(), choice: x.choice, outcome: data.outcome || null,
      sceneTemplate: def.scene, locKey: 'evt.' + key, meta: data,
    };
  }
  function log(key, data) {
    S.events.push(make(key, data, S.events.length + 1, Math.round(S.clock * 10) / 10));
    if (CAPTURA[key]) pedirCaptura(CAPTURA[key], key);
  }
  function had(key) { return S.events.some(e => e.key === key); }
  // Fondo del cómic nuevo (G17f). Solo estos momentos, en baja, en memoria y en IndexedDB.
  // No se sube nada. No hay evento de «nuevo intento»: ese hueco sigue vacío.
  // No usa snapshot(): ese encuadre mueve la cámara (renderer.js, AJ1).
  const CAPTURA = {
    PlayerCharacterCreated: 'inicio',
    LandSelected: 'ruta', ShelterRelocated: 'ruta', LumaChoice: 'ruta',
    ListenChoice: 'ruta', HelmChosen: 'ruta', TradeoffSeen: 'ruta',
    FragmentsOrdered: 'ruta', PlanMade: 'ruta',
    FirstHardLanding: 'choque', FirstSplash: 'choque', ShelterFlooded: 'choque',
    FirstChallengeRecord: 'record',
    ChapterCompleted: 'meta',
  };
  // CM (8-nov): sin render extra ni lectura síncrona. Antes cada captura volvía a dibujar la escena y leía el lienzo en el
  // hilo (drawImage del lienzo WebGL espera a que la GPU acabe: un cuadro entero de más por evento; BM15 solo lo movía a un
  // rato libre). Ahora se toma el cuadro que el bucle ya dibuja: el gancho 'render' (antes del dibujo) encola una
  // microtarea, que corre al acabar ese cuadro, en la misma tarea, con la imagen aún en el lienzo (sin preserveDrawingBuffer).
  // Ahí, en WebGL2, la GPU reduce el centro 16:9 a 320×180 (blits a mitad de tamaño, filtro de caja) y lo copia a un búfer
  // (PBO) con una valla; se recoge cuando la GPU avisa, sin esperarla. El brillo y el JPEG (mismo 320×180 y calidad 0,62:
  // el cómic lo recibe igual) van en un rato libre, y el JPEG sobre ese lienzo pequeño. Sin WebGL2: drawImage como antes.
  // Si el mundo no se dibuja (creador, carga) la petición espera al primer cuadro con el mundo a la vista.
  const W = 320, H = 180;
  let pedidos = [], enCola = false, codificando = 0;
  function pedirCaptura(momento, key) {
    if (!momento) return;
    pedidos = pedidos.filter(p => p.momento !== momento); // el último evento de cada momento manda, como antes
    pedidos.push({ momento, key });
  }
  G.on('render', () => {
    if (!pedidos.length || enCola || codificando) return;
    enCola = true;
    const lote = pedidos; pedidos = [];
    queueMicrotask(() => { enCola = false; copiarCuadro(lote); });
  }, 99);
  const luego = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 1000 }) : setTimeout(f, 50));
  function lienzo() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
  function corteDe(sw, sh) {
    const ar = W / H;
    let cw = sw, ch = sw / ar;
    if (ch > sh) { ch = sh; cw = sh * ar; }
    return [Math.round((sw - cw) / 2), Math.round((sh - ch) / 2), Math.round(cw), Math.round(ch)];
  }
  function copiarCuadro(lote) {
    const R = G.renderer, src = R && R.canvas;
    if (!src || src.width < 2) return;
    codificando++;
    let ok = false;
    try { ok = leerGPU(R, src, lote); } catch (e) { ok = false; }
    if (ok) return;
    try { // sin WebGL2 (o si falló): copia síncrona, como antes
      const k = corteDe(src.width, src.height), c = lienzo();
      c.getContext('2d').drawImage(src, k[0], k[1], k[2], k[3], 0, 0, W, H);
      luego(() => codificar(c, lote));
    } catch (e) { codificando--; } // sin fondo de partida la viñeta usa el mapa
  }
  function leerGPU(R, src, lote) {
    const gl = R.renderer && R.renderer.getContext && R.renderer.getContext();
    if (!gl || typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext) || gl.isContextLost()) return false;
    const sw = gl.drawingBufferWidth, sh = gl.drawingBufferHeight;
    if (sw < W || sh < H) return false;
    const k = corteDe(sw, sh);
    const prev = { r: gl.getParameter(gl.READ_FRAMEBUFFER_BINDING), d: gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING),
      rb: gl.getParameter(gl.RENDERBUFFER_BINDING), pb: gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING), sc: gl.isEnabled(gl.SCISSOR_TEST) };
    const fbs = [], rbs = [];
    const destino = (w, h, fmt) => {
      const rb = gl.createRenderbuffer(), fb = gl.createFramebuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, fmt || gl.RGBA8, w, h);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb); gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
      fbs.push(fb); rbs.push(rb); return fb;
    };
    let pbo = null, valla = null;
    try {
      if (prev.sc) gl.disable(gl.SCISSOR_TEST);
      // 1) el lienzo entero (con antialias es multimuestra: solo se resuelve a su mismo tamaño, sitio y formato; sin alfa es RGB8)
      const at = gl.getContextAttributes() || {};
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      let fb = destino(sw, sh, at.alpha === false ? gl.RGB8 : gl.RGBA8), x0 = k[0], y0 = k[1], w = k[2], h = k[3];
      gl.blitFramebuffer(0, 0, sw, sh, 0, 0, sw, sh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      // 2) el corte 16:9, en mitades con filtro lineal (= caja 2×2) hasta quedar a menos del doble; 3) el último paso, a 320×180
      while (w >= W * 2 && h >= H * 2) {
        const w2 = w >> 1, h2 = h >> 1;
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb); fb = destino(w2, h2);
        gl.blitFramebuffer(x0, y0, x0 + w2 * 2, y0 + h2 * 2, 0, 0, w2, h2, gl.COLOR_BUFFER_BIT, gl.LINEAR);
        x0 = y0 = 0; w = w2; h = h2;
      }
      if (w !== W || h !== H) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb); fb = destino(W, H);
        gl.blitFramebuffer(x0, y0, x0 + w, y0 + h, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.LINEAR);
      }
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, fb);
      pbo = gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, W * H * 4, gl.STREAM_READ);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, 0);
      valla = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
    } finally {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prev.r); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prev.d);
      gl.bindRenderbuffer(gl.RENDERBUFFER, prev.rb); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, prev.pb);
      if (prev.sc) gl.enable(gl.SCISSOR_TEST);
      fbs.forEach(f => gl.deleteFramebuffer(f)); rbs.forEach(r => gl.deleteRenderbuffer(r));
      if (!valla && pbo) gl.deleteBuffer(pbo);
    }
    if (!valla) return false;
    let vueltas = 0;
    const recoger = () => {
      try {
        if (gl.isContextLost()) { codificando--; return; }
        if (gl.getSyncParameter(valla, gl.SYNC_STATUS) !== gl.SIGNALED) {
          if (++vueltas < 120) { setTimeout(recoger, 16); return; }
          gl.deleteSync(valla); gl.deleteBuffer(pbo); codificando--; return;
        }
        gl.deleteSync(valla);
        const px = new Uint8Array(W * H * 4), pb = gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pb);
        gl.deleteBuffer(pbo);
        luego(() => {
          try {
            const c = lienzo(), x = c.getContext('2d', { willReadFrequently: true }), img = x.createImageData(W, H), fila = W * 4;
            for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * fila, (H - y) * fila), y * fila); // GL va de abajo arriba
            for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255; // el lienzo es opaco al verse: el JPEG igual
            x.putImageData(img, 0, 0);
            codificar(c, lote);
          } catch (e) { codificando--; }
        });
      } catch (e) { codificando--; }
    };
    setTimeout(recoger, 16);
    return true;
  }
  function codificar(c, lote) {
    try {
      const pix = c.getContext('2d').getImageData(0, 0, W, H).data;
      let s = 0, n = 0;
      for (let i = 0; i < pix.length; i += 64) { s += pix[i] + pix[i + 1] + pix[i + 2]; n++; }
      if (!n || s / n < 18) { codificando--; reintentar(lote); return; }
      // 320×180 en CPU: ~1–2 ms. toBlob se descartó: Chrome lo codifica en tareas ociosas y con el bucle a tope tardaba decenas de s
      const jpeg = c.toDataURL('image/jpeg', 0.62);
      codificando--;
      guardar(lote, jpeg);
    } catch (e) { codificando--; }
  }
  // Una emisión de 'render' a mano (pruebas) fuera del bucle deja el lienzo vacío: se prueba en otro cuadro, hasta 4 veces
  function reintentar(lote) {
    lote.forEach(p => {
      p.n = (p.n || 0) + 1;
      if (p.n < 4 && !pedidos.some(q => q.momento === p.momento)) pedidos.push(p);
    });
  }
  function guardar(lote, jpeg) {
    if (typeof jpeg !== 'string' || jpeg.length < 800 || jpeg.length > 120000) return;
    G.mangaFondos = G.mangaFondos || {};
    const t = Date.now(), filas = lote.map(p => ({ momento: p.momento, evento: p.key, jpeg: jpeg, t: t }));
    filas.forEach(row => { G.mangaFondos[row.momento] = row; });
    try {
      const req = indexedDB.open('amazonaverse.manga', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('fondos')) db.createObjectStore('fondos', { keyPath: 'momento' });
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction('fondos', 'readwrite');
          filas.forEach(row => tx.objectStore('fondos').put(row));
          tx.oncomplete = () => db.close();
        } catch (e) { try { req.result.close(); } catch (e2) { /* sigue en memoria */ } }
      };
    } catch (e) { /* sigue en memoria */ }
  }
  return { SCHEMA, defs, make, log, had };
});
