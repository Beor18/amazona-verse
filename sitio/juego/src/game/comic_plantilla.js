/* Juego · página del cómic con la plantilla aprobada de Kelvin (3-nov-2026; guía: docs/equipo/COMIC_PLANTILLA_GUIA.md)
   Compone en un lienzo 2:3 la página de 6 viñetas (2 columnas × 3 filas) con las posiciones de la referencia
   assets/comic/plantilla/originales/99_REFERENCIA_FORMATO_ORIGINAL.png (1024×1536), escaladas ×1,5 → 1536×2304.
   Lo usa src/game/comic.js (renderComic), que reúne los datos reales de la partida; aquí solo se dibuja.
   Capas, de abajo arriba (un solo enfoque por componente):
     1. Fondo de selva y cielo (por programa: la referencia no se usa como página aplanada).
     2. Cabecera: logo OFICIAL 00 (archivo original, intacto), 07 «Crea tu cómic», 08 pasos, 09 campo con el título de la aventura,
        10 «Mi cotorra» con el retrato real del jugador y su nombre (piezas de capas/, sacadas de los recortes con tools/comic/capas.py).
     3. Página blanca y 6 viñetas inclinadas como en la referencia: captura real recortada a su máscara (cuadrilátero), borde de tinta,
        cintillo con número y título de escena, globo (diálogo o pensamiento; sin texto no hay globo), caja de narración, círculo con la
        cotorra del jugador en una pose real según el evento y decoraciones solo si el evento las justifica (¡FUUUSH!, ???, bandera,
        NUEVO RÉCORD con el tiempo real, y las pegatinas de pesca, Construir y Patrulla si la partida las tiene). Viñetas, cintillos, globos, cajas, círculos y decoraciones 42/44/45 se reconstruyen por
        programa: los recortes traen textos y siluetas de muestra (o salen cortados) y no sirven como capa limpia.
     4. Abajo: 11 «¿Qué aprendí?» y 12 «Mi enseñanza de vida» con su texto, el personaje central (pose real del jugador, con borde
        de pegatina, sobre una roca) y los 4 botones 14–17, que en el editor son acciones reales (comic.js: zonas()).
   Poses de acción (tools/poses/: mismos estados que jobs.json): modelo real (AVCharacter) con la especie, la piel, el traje y la
   corona del jugador, estado de animación puesto cuadro a cuadro y ch.update(dt) como actores.js. Un renderizador propio (perezoso);
   caché por look + pose mientras el cómic está abierto (limpiarCache() al cerrarlo). Sin WebGL: el retrato 2D del creador.
   API: G.comicPlantilla = { PAGINA, REF, K, SLOTS, LOGO, LOGO_SHA256, POSES, componer(canvas, datos, opts), pose(look, id, px),
     botones(), limpiarCache(), cargarCapas() }.
   datos = { titulo, nombre, look, retrato?, aprendi, ensenanza, botones (bool), vinetas: [6 × { id, falta?, sceneImage (img|null),
     escena?(ctx,x,y,w,h), sceneTitle, dialogueText, dialogueType ('dialogo'|'pensamiento'), captionText, effectId, recordValue,
     pegatina?: 'pesca'|'construir'|'patrulla', look, pose }] }. Textos ya en el idioma del jugador (comic.js los traduce).
     Las pegatinas se dibujan aquí (nada que subir). effectId con uno de esos tres nombres también las pinta. */
AVE.module('comicPlantilla', function (G) {
  'use strict';
  const BASE = 'assets/comic/plantilla/';
  const LOGO = BASE + 'originales/00_LOGO_OFICIAL_ORIGINAL_INTACTO.png';
  const LOGO_SHA256 = 'ecaccca93c2027358fdc497699d3ccb082fee50c47e739d735f1062b92d74763'; // el archivo de Kelvin, byte a byte
  const REF = { w: 1024, h: 1536 }, K = 1.5, PAGINA = { w: REF.w * K, h: REF.h * K };
  const INK = '#13161c';
  const en = () => !!(G.idioma && G.idioma.actual && G.idioma.actual() === 'en');
  const L = (es, ingl) => (en() ? ingl : es);

  // Piezas con transparencia (tools/comic/capas.py) y su sitio en la referencia: [x, y, w, h]
  const CAPAS = {
    cabecera: [280, 12, 357, 107], pasos: [647, 16, 367, 95], campo_titulo: [239, 117, 428, 90], campo_cotorra: [674, 118, 341, 93],
    que_aprendi: [13, 1162, 353, 255], ensenanza: [616, 1163, 399, 254], confusion: [254, 594, 135, 112],
    boton_escenas: [23, 1425, 252, 84], boton_editar: [285, 1426, 251, 83], boton_descargar: [549, 1421, 220, 88], boton_compartir: [776, 1426, 226, 83],
  };
  const BOTONES = [['escenas', 'boton_escenas'], ['editar', 'boton_editar'], ['descargar', 'boton_descargar'], ['compartir', 'boton_compartir']];

  // Las 6 viñetas medidas en la referencia (borde interior de la tinta). globo: elipse + punta de la cola; libre: zona sin globo
  // para las decoraciones; color: el del fondo de rayos de la plantilla (se ve cuando falta la captura).
  const SLOTS = [
    { quad: [[17, 226], [524, 226], [485, 527], [17, 522]], color: ['#3d8ff0', '#e4f4ff'], globo: { cx: 422, cy: 290, rx: 88, ry: 52, cola: [356, 366] }, circulo: { cx: 72, cy: 474, r: 53 }, caja: { x: 112, y: 474, w: 370, h: 46 }, libre: [250, 345] },
    { quad: [[541, 226], [1004, 226], [1005, 533], [504, 528]], color: ['#4fbf63', '#eefbe6'], globo: { cx: 887, cy: 300, rx: 106, ry: 60, cola: [792, 392] }, circulo: { cx: 569, cy: 476, r: 53 }, caja: { x: 620, y: 474, w: 378, h: 48 }, libre: [690, 370] },
    { quad: [[19, 538], [426, 541], [478, 776], [19, 775]], color: ['#8c6cf0', '#f1ebff'], globo: { cx: 248, cy: 722, rx: 84, ry: 40, cola: [150, 762] }, circulo: { cx: 71, cy: 770, r: 53 }, caja: { x: 110, y: 774, w: 362, h: 44 }, libre: [322, 640] },
    { quad: [[457, 537], [1004, 549], [1004, 814], [506, 827]], color: ['#3d8ff0', '#e4f4ff'], globo: { cx: 830, cy: 612, rx: 106, ry: 58, cola: [765, 702] }, circulo: { cx: 570, cy: 770, r: 53 }, caja: { x: 615, y: 774, w: 384, h: 44 }, libre: [640, 660] },
    { quad: [[20, 838], [507, 845], [454, 1139], [20, 1134]], color: ['#4fbf63', '#eefbe6'], globo: { cx: 400, cy: 914, rx: 84, ry: 60, cola: [345, 996] }, circulo: { cx: 72, cy: 1089, r: 54 }, caja: { x: 112, y: 1082, w: 368, h: 50 }, libre: [160, 960] },
    { quad: [[525, 839], [1004, 833], [1004, 1141], [474, 1137]], color: ['#f39a3a', '#fff2d8'], globo: { cx: 775, cy: 942, rx: 100, ry: 56, cola: [720, 1030] }, circulo: { cx: 569, cy: 1089, r: 54 }, caja: { x: 610, y: 1082, w: 388, h: 50 }, libre: [910, 950] },
  ];
  const PAGINA_BLANCA = { x: 6, y: 212, w: 1012, h: 940, r: 16 };
  const CENTRO = { x: 372, y: 1168, w: 252, h: 226, suelo: 1398 };

  // ---------- Imágenes ----------
  let capas = null;
  function cargarCapas() {
    if (capas) return capas;
    const img = src => G.assets.image(src).catch(() => null);
    capas = Promise.all([img(LOGO)].concat(Object.keys(CAPAS).map(k => img(BASE + 'capas/' + k + '.webp')))).then(arr => {
      const o = { logo: arr[0] }; Object.keys(CAPAS).forEach((k, i) => { o[k] = arr[i + 1]; });
      if (!o.logo) capas = null; // reintenta la próxima vez
      return o;
    });
    return capas;
  }

  // ---------- Poses de acción (tools/poses/jobs.json; t = el cuadro elegido en tools/poses/sel.json) ----------
  const vuelo = (ch, o) => Object.assign(ch, { airborne: true, flying: true, gait: 0, legsDown: 0, expression: 'happy' }, o);
  const POSES = {
    despegue: { t: 1.71, yaw: -0.5, cam: { az: 0.2, el: 0.12 }, st: (t, ch) => { vuelo(ch, { speed: 1, wingMode: 'takeoff', legsDown: 0.8 }); return { y: 1.0, pitch: 0.05, stretch: 0.05 }; } },
    crucero: { t: 1.69, yaw: -0.9, cam: { az: 0.1, el: 0.3 }, st: (t, ch) => { vuelo(ch, { speed: 12, wingMode: 'fly' }); return { y: 3, pitch: 0.75, roll: 0.12 }; } },
    impulso: { t: 1.69, yaw: -0.95, cam: { az: 0.1, el: 0.28 }, st: (t, ch) => { vuelo(ch, { speed: 19, wingMode: 'fly' }); return { y: 3, pitch: 0.75, roll: 0.25 }; } },
    aterrizaje: { t: 1.623, yaw: -1.0, cam: { az: 0.15, el: 0.1 }, st: (t, ch) => { vuelo(ch, { speed: 6.6, wingMode: 'land', legsDown: 1, landPre: 1, landFlare: 1, landReach: 1, landSettle: 0 }); return { y: 0.6, pitch: -0.6 }; } },
    posarse: { t: 1.44, yaw: -0.6, cam: { az: 0.1, el: 0.12 }, prop: 'rama', st: (t, ch) => {
      const tt = Math.max(0, t - 1.2), bal = Math.sin(tt * Math.PI * 2 * 2.2) * Math.exp(-tt * 3.4);
      Object.assign(ch, { airborne: false, flying: false, speed: 0, gait: 0, legsDown: 0, posado: 'fino', posarT: t >= 1.2 ? tt : -1, posarFuerza: 1, posarDur: 1.1, posarTipo: 'percha',
        posarBalanceo: t >= 1.2 ? bal : 0, wingMode: t >= 1.2 && tt < 0.5 ? 'posar' : 'idle', groundY: 1.2, groundAt: () => 1.2, expression: 'happy' });
      return { y: 1.2, perchY: 1.2, pitch: 0.16 * bal };
    } },
    // nadar: sin disco de agua. Ese plano transparente salía como un recuadro alrededor de la cotorra (CG-36).
    nadar: { t: 1.757, yaw: -0.9, cam: { az: 0.1, el: 0.3 }, st: (t, ch) => { Object.assign(ch, { airborne: false, flying: false, swimming: true, diving: false, speed: 4.5, gait: 2, swimRate: 1.3, wingMode: 'swim', expression: 'happy' }); return { y: -0.1, pitch: 1.2, roll: 0 }; } },
    // celebrar: el cuadro de Celebrate con las alas arriba en V (t 0,45); el de la hoja (0,9) tiene las alas en cruz y parece la pose T
    celebrar: { t: 0.45, yaw: -0.45, cam: { az: 0, el: 0.08 }, clip: 'Celebrate', st: (t, ch) => { Object.assign(ch, { airborne: false, flying: false, speed: 0, gait: 0, wingMode: 'idle', expression: 'happy', groundY: 0, groundAt: () => 0 }); return { y: 0 }; } },
  };
  let rig = null, rigProm = null;
  const cachePoses = new Map(); // clave look+pose+px → { canvas, bbox }
  async function rigPoses() {
    if (rig) return rig;
    if (rigProm) return rigProm;
    rigProm = (async () => {
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const hemi = new THREE.HemisphereLight('#ffe9c4', '#1f3a2c', 0.55); scene.add(hemi);
      const key = new THREE.DirectionalLight('#fff0d6', 2.4), fill = new THREE.DirectionalLight('#cfe3ff', 0.35), rim = new THREE.DirectionalLight('#ffffff', 2.4);
      scene.add(key, fill, rim);
      const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 100);
      const rama = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 3.2, 20), new THREE.MeshStandardMaterial({ color: '#7a5233', roughness: 0.85 }));
      rama.visible = false; scene.add(rama);
      const agua = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshStandardMaterial({ color: '#2fa7c9', roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.55, depthWrite: false }));
      agua.rotation.x = -Math.PI / 2; agua.visible = false; scene.add(agua);
      rig = { canvas, renderer, scene, camera, key, fill, rim, hemi, rama, agua, ch: null };
      return rig;
    })();
    try { return await rigProm; } finally { rigProm = null; }
  }
  const claveLook = look => { try { return JSON.stringify(window.AVCharacter.normalizeLook(look)); } catch (e) { return JSON.stringify(look || null); } };
  // Caja del dibujo (alfa > 8) para encuadrar la pose sin márgenes vacíos
  function cajaAlfa(cv) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: Math.max(0, x0 - 2), y: Math.max(0, y0 - 2), w: Math.min(w, x1 + 3) - Math.max(0, x0 - 2), h: Math.min(h, y1 + 3) - Math.max(0, y0 - 2) };
  }
  let colaPoses = Promise.resolve(); // un solo renderizador: en secuencia
  function pose(look, id, px) {
    px = px || 512;
    const P = POSES[id] ? id : 'celebrar', k = claveLook(look) + '|' + P + '|' + px;
    if (cachePoses.has(k)) return Promise.resolve(cachePoses.get(k));
    const tarea = colaPoses.then(() => (cachePoses.has(k) ? cachePoses.get(k) : renderPose(look, P, px).then(r => { cachePoses.set(k, r); return r; })));
    colaPoses = tarea.catch(() => null);
    return tarea;
  }
  async function renderPose(look, id, px) {
    const out = document.createElement('canvas'); out.width = out.height = px;
    const x = out.getContext('2d');
    if (window.AVCharacter && window.THREE && !(G.actores && G.actores.failed3D)) {
      try {
        const nl = window.AVCharacter.normalizeLook(look || G.creador.profileLook(G.S.profile));
        await window.AVCharacter.renderPortrait(nl, 64); // precarga la ropa de Blender de ese look (como el retrato)
        // Una cotorra nueva por pose, como tools/poses: la animación procedural (fase del aleteo, suavizados) no arrastra la pose anterior
        const R = await rigPoses(), o = POSES[id];
        if (R.ch) R.scene.remove(R.ch.root);
        const ch = R.ch = await window.AVCharacter.create(); R.scene.add(ch.root);
        ch.applyLook(nl);
        if (window.AVE && window.AVE.pieles) await window.AVE.pieles.listo(ch);
        const S = 1.75 / ch.height; ch.root.scale.setScalar(S);
        ch.mixer.stopAllAction(); ch.current = null; ch.play(o.clip || 'Idle');
        Object.assign(ch, { speed: 0, gait: 0, airborne: false, flying: false, legsDown: 0, wingMode: 'idle', swimming: false, diving: false, expression: 'happy',
          mouth: null, lookAt: null, emote: null, posado: '', agachada: 0, groundY: 0, groundAt: null, posarT: -1, landPre: 0, landFlare: 0, landReach: 0, landSettle: 0 });
        R.renderer.setSize(px, px, false);
        const r = ch.root.rotation; r.order = 'YXZ';
        const dt = 1 / 60; let s = {};
        for (let i = 0, t = 0; t <= o.t + 1e-6; i++, t = i * dt) {
          s = o.st(t, ch) || {};
          ch.root.position.set(0, s.y || 0, 0); r.set(s.pitch || 0, o.yaw || 0, s.roll || 0);
          const sy = s.stretch || 0; ch.root.scale.set(S * (1 - sy * 0.4), S * (1 + sy), S * (1 - sy * 0.4));
          ch.update(dt);
        }
        ch.root.updateMatrixWorld(true);
        const c = new THREE.Vector3(); (ch.bones.espalda1 || ch.root).getWorldPosition(c);
        R.rama.visible = o.prop === 'rama'; R.agua.visible = o.prop === 'agua';
        if (o.prop === 'rama') { R.rama.position.set(0, (s.perchY || 0) - 0.08, 0.02); R.rama.rotation.set(0, o.yaw || 0, Math.PI / 2); }
        if (o.prop === 'agua') R.agua.position.set(0, 0, 0);
        const C = o.cam, az = C.az || 0, el = C.el || 0.1, dist = 7.5, cam = R.camera;
        cam.fov = 24; cam.aspect = 1; cam.updateProjectionMatrix();
        cam.position.set(c.x + dist * Math.sin(az) * Math.cos(el), c.y + dist * Math.sin(el), c.z + dist * Math.cos(az) * Math.cos(el)); cam.lookAt(c);
        const rotY = v => new THREE.Vector3(...v).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), az).multiplyScalar(10);
        R.key.position.copy(rotY([-0.55, 0.75, 0.6])); R.fill.position.copy(rotY([0.8, 0.15, 0.6])); R.rim.position.copy(rotY([0.6, 0.6, -0.9]));
        R.renderer.toneMappingExposure = 0.78;
        R.scene.updateMatrixWorld(); // KIMI-145: dibujo directo fuera del cuadro (Scene.autoUpdate=false)
        R.renderer.render(R.scene, cam);
        x.drawImage(R.canvas, 0, 0, px, px);
        const bbox = cajaAlfa(out);
        if (bbox) return { canvas: out, bbox, real: true };
      } catch (e) { /* sin modelo: retrato 2D */ }
    }
    x.clearRect(0, 0, px, px);
    await G.creador.drawPortrait(x, px, Object.assign({}, G.S.profile, look ? { look } : {}), false);
    return { canvas: out, bbox: cajaAlfa(out) || { x: 0, y: 0, w: px, h: px }, real: false };
  }
  function limpiarCache() {
    cachePoses.clear();
    if (rig) { try { rig.renderer.dispose(); rig.renderer.forceContextLoss(); } catch (e) { /* ya perdido */ } rig = null; }
  }

  // ---------- Utilidades de dibujo ----------
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function poli(x, pts) { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.closePath(); }
  function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const FD = 'Fredoka, "Trebuchet MS", sans-serif', FB = '"Atkinson Hyperlegible", Verdana, sans-serif';
  function partir(x, texto, maxW, sinCortar) {
    const out = []; let linea = '';
    for (const w0 of String(texto || '').split(/\s+/).filter(Boolean)) {
      let w = w0;
      if (sinCortar && x.measureText(w).width > maxW) return null; // no cabe sin cortar la palabra
      while (x.measureText(w).width > maxW && w.length > 1) { // palabra más larga que la línea: se corta
        let n = w.length - 1; while (n > 1 && x.measureText(w.slice(0, n) + '-').width > maxW) n--;
        if (linea) { out.push(linea); linea = ''; }
        out.push(w.slice(0, n) + '-'); w = w.slice(n);
      }
      const t = linea ? linea + ' ' + w : w;
      if (linea && x.measureText(t).width > maxW) { out.push(linea); linea = w; } else linea = t;
    }
    if (linea) out.push(linea);
    return out;
  }
  // El tamaño más grande con el que el texto cabe en w×h (máx. maxL líneas). Si ni al mínimo cabe, se recorta con «…»
  function ajustar(x, texto, w, h, o) {
    const lh = o.lh || 1.18;
    for (const sinCortar of [true, false]) for (let s = o.max; s >= o.min; s -= 0.5) { // primero sin cortar palabras
      x.font = `${o.peso || 400} ${s}px ${o.fam || FB}`;
      const ls = partir(x, texto, w, sinCortar);
      if (ls && ls.length <= (o.lineas || 9) && ls.length * s * lh <= h) return { s, ls, lh };
    }
    const s = o.min; x.font = `${o.peso || 400} ${s}px ${o.fam || FB}`;
    let ls = partir(x, texto, w); const n = Math.max(1, Math.min(o.lineas || 9, Math.floor(h / (s * lh))));
    if (ls.length > n) { ls = ls.slice(0, n); let u = ls[n - 1]; while (u && x.measureText(u + '…').width > w) u = u.slice(0, -1); ls[n - 1] = u.replace(/\s+$/, '') + '…'; }
    return { s, ls, lh };
  }
  function texto(x, t, cx, cy, w, h, o) {
    const a = ajustar(x, t, w, h, o), alto = a.ls.length * a.s * a.lh;
    x.textAlign = o.alinear || 'center'; x.textBaseline = 'middle'; x.fillStyle = o.color || INK;
    const X = o.alinear === 'left' ? cx - w / 2 : cx;
    a.ls.forEach((l, i) => x.fillText(l, X, cy - alto / 2 + a.s * a.lh * (i + 0.5)));
    return a;
  }
  // x en el borde derecho de un cuadrilátero a la altura y
  function bordeDer(q, y) { const [a, b] = [q[1], q[2]]; return a[0] + (b[0] - a[0]) * ((y - a[1]) / (b[1] - a[1])); }
  function bordeIzq(q, y) { const [a, b] = [q[0], q[3]]; return a[0] + (b[0] - a[0]) * ((y - a[1]) / (b[1] - a[1])); }
  function caja(q) { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); const x0 = Math.min(...xs), y0 = Math.min(...ys); return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 }; }
  function cubrir(x, img, X, Y, w, h) {
    const iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight, ar = iw / ih, tr = w / h;
    let sw = iw, sh = ih, sx = 0, sy = 0;
    if (ar > tr) { sw = ih * tr; sx = (iw - sw) / 2; } else { sh = iw / tr; sy = (ih - sh) / 2; }
    x.drawImage(img, sx, sy, sw, sh, X, Y, w, h);
  }
  function contener(x, p, X, Y, w, h, abajo) { // pose (con su caja de alfa) dentro de w×h, centrada (o apoyada abajo)
    const b = p.bbox, s = Math.min(w / b.w, h / b.h), dw = b.w * s, dh = b.h * s;
    x.drawImage(p.canvas, b.x, b.y, b.w, b.h, X + (w - dw) / 2, abajo ? Y + h - dh : Y + (h - dh) / 2, dw, dh);
  }

  // ---------- Fondo: cielo y selva ----------
  function fronda(x, X, Y, largo, ang, curva, c1, c2, r) {
    // Hoja de palma: nervio curvo y folíolos a los dos lados, con tinta como la plantilla
    x.save(); x.translate(X, Y); x.rotate(ang);
    const n = 13, pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([t * largo, Math.sin(t * Math.PI * 0.9) * curva * largo * t]); }
    for (let i = 1; i < n; i++) {
      const [px, py] = pts[i], t = i / n, l = largo * 0.36 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 6, an = 0.75 + (r() - 0.5) * 0.2;
      for (const lado of [-1, 1]) {
        const ex = px + Math.cos(lado * an + 0.35) * l, ey = py + Math.sin(lado * an + 0.35) * l;
        x.beginPath(); x.moveTo(px - 4, py);
        x.quadraticCurveTo(px + (ex - px) * 0.4 + lado * 7, py + (ey - py) * 0.6 - lado * 7, ex, ey);
        x.quadraticCurveTo(px + (ex - px) * 0.7 - lado * 4, py + (ey - py) * 0.3 + lado * 5, px + 8, py);
        x.closePath(); x.fillStyle = lado > 0 ? c1 : c2; x.fill(); x.lineWidth = 1.3; x.strokeStyle = 'rgba(14,42,20,.85)'; x.stroke();
      }
    }
    x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.lineWidth = 2.4; x.strokeStyle = 'rgba(30,70,28,.95)'; x.stroke();
    x.restore();
  }
  function hoja(x, X, Y, l, ang, c1, c2) { // hoja ancha con nervio
    x.save(); x.translate(X, Y); x.rotate(ang);
    const g = x.createLinearGradient(0, -l * 0.3, 0, l * 0.3); g.addColorStop(0, c1); g.addColorStop(1, c2);
    x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(l * 0.25, -l * 0.42, l * 0.75, -l * 0.36, l, 0); x.bezierCurveTo(l * 0.75, l * 0.36, l * 0.25, l * 0.42, 0, 0); x.closePath();
    x.fillStyle = g; x.fill(); x.lineWidth = 1.6; x.strokeStyle = 'rgba(14,42,20,.9)'; x.stroke();
    x.beginPath(); x.moveTo(l * 0.04, 0); x.quadraticCurveTo(l * 0.5, -l * 0.04, l * 0.94, 0); x.lineWidth = 1.2; x.strokeStyle = 'rgba(20,60,24,.7)'; x.stroke();
    x.restore();
  }
  function nube(x, X, Y, s) {
    x.fillStyle = 'rgba(255,255,255,.9)';
    for (const [dx, dy, r] of [[0, 0, 1], [0.9, -0.35, 0.8], [1.7, 0, 0.9], [0.85, 0.2, 0.85], [2.4, 0.15, 0.6]]) { x.beginPath(); x.arc(X + dx * s, Y + dy * s, r * s, 0, Math.PI * 2); x.fill(); }
  }
  const VERDES = [['#7ccf4a', '#5fb33a'], ['#5cb546', '#3f9a36'], ['#8fdc5a', '#6cc24a'], ['#3f9a3c', '#2f7d31']];
  function fondo(x) {
    const r = rng(20261103);
    const cielo = x.createLinearGradient(0, 0, 0, REF.h); cielo.addColorStop(0, '#39a9ea'); cielo.addColorStop(0.1, '#7fd0f7'); cielo.addColorStop(0.7, '#bfe8fb'); cielo.addColorStop(1, '#9fd8f2');
    x.fillStyle = cielo; x.fillRect(0, 0, REF.w, REF.h);
    nube(x, 700, 150, 22); nube(x, 930, 196, 18); nube(x, 40, 195, 16);
    // Árbol de arriba a la izquierda (detrás del logo)
    x.lineCap = 'round'; x.strokeStyle = '#6b4424'; x.lineWidth = 16; x.beginPath(); x.moveTo(-10, 210); x.quadraticCurveTo(80, 150, 160, 160); x.stroke();
    x.lineWidth = 10; x.beginPath(); x.moveTo(60, 175); x.quadraticCurveTo(110, 110, 205, 95); x.stroke();
    x.lineWidth = 3; x.strokeStyle = 'rgba(30,18,8,.7)'; x.beginPath(); x.moveTo(-10, 218); x.quadraticCurveTo(80, 158, 160, 168); x.stroke();
    for (let i = 0; i < 46; i++) { const [c1, c2] = VERDES[i % 4]; hoja(x, r() * 290 - 20, r() * 225 - 15, 34 + r() * 26, r() * Math.PI * 2, c1, c2); }
    for (let i = 0; i < 10; i++) { const [c1, c2] = VERDES[(i + 1) % 4]; hoja(x, 960 + r() * 80, 150 + r() * 70, 30 + r() * 20, r() * Math.PI * 2, c1, c2); }
    // Abajo: claro de la selva con luz detrás del personaje, árboles y frondas
    const yb = 1150;
    const sel = x.createLinearGradient(0, yb, 0, REF.h); sel.addColorStop(0, '#3f9a48'); sel.addColorStop(0.55, '#2b7a35'); sel.addColorStop(1, '#174f22');
    x.fillStyle = sel; x.fillRect(0, yb, REF.w, REF.h - yb);
    const luz = x.createRadialGradient(497, 1260, 10, 497, 1270, 190); luz.addColorStop(0, 'rgba(214,244,255,1)'); luz.addColorStop(0.55, 'rgba(160,222,250,.95)'); luz.addColorStop(1, 'rgba(160,222,250,0)');
    x.fillStyle = luz; x.fillRect(300, yb, 400, 260);
    nube(x, 430, 1215, 15); nube(x, 545, 1250, 12);
    x.fillStyle = '#5aa84f'; // copas lejanas en el claro
    for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(330 + i * 42, 1335 + (i % 3) * 8, 34 + (i % 2) * 10, 0, Math.PI * 2); x.fill(); }
    x.strokeStyle = '#7a4f2a'; x.lineWidth = 9; for (const tx of [360, 640]) { x.beginPath(); x.moveTo(tx, 1440); x.lineTo(tx + (tx < 500 ? 18 : -18), 1190); x.stroke(); }
    for (let i = 0; i < 18; i++) { // frondas a los lados y abajo
      const izq = i % 2 === 0, X = izq ? -20 + r() * 90 : REF.w + 20 - r() * 90, Y = yb + 40 + r() * 330;
      const [c1, c2] = VERDES[i % 4]; fronda(x, X, Y, 150 + r() * 90, (izq ? -0.2 : Math.PI + 0.2) + (r() - 0.5) * 0.9, (izq ? -1 : 1) * 0.12, c1, c2, r);
    }
    for (let i = 0; i < 16; i++) { const [c1, c2] = VERDES[i % 4], X = r() * REF.w, Y = 1405 + r() * 60; fronda(x, X, Y, 90 + r() * 70, -Math.PI / 2 + (r() - 0.5) * 2.2, 0.1, c1, c2, r); }
    for (let i = 0; i < 26; i++) { const [c1, c2] = VERDES[(i + 2) % 4]; hoja(x, r() * REF.w, 1470 + r() * 80, 36 + r() * 30, -Math.PI / 2 + (r() - 0.5) * 2.6, c1, c2); }
  }
  // Roca del personaje central
  function roca(x) {
    const cx = 497, y = CENTRO.suelo;
    const g = x.createLinearGradient(0, y - 20, 0, y + 40); g.addColorStop(0, '#b68a5c'); g.addColorStop(1, '#6e4b2c');
    x.beginPath(); x.moveTo(cx - 135, y + 34); x.quadraticCurveTo(cx - 128, y - 8, cx - 60, y - 16); x.quadraticCurveTo(cx, y - 24, cx + 70, y - 15); x.quadraticCurveTo(cx + 132, y - 6, cx + 140, y + 34); x.closePath();
    x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = INK; x.stroke();
    x.strokeStyle = 'rgba(60,36,18,.6)'; x.lineWidth = 2;
    for (const [a, b, c] of [[-80, -2, -40], [20, 4, 70], [-20, 14, 30]]) { x.beginPath(); x.moveTo(cx + a, y + b); x.quadraticCurveTo(cx + (a + c) / 2, y + b - 6, cx + c, y + b + 2); x.stroke(); }
  }

  // ---------- Componentes de la viñeta ----------
  function rayos(x, s, b) { // fondo de rayos de la plantilla (se ve cuando no hay captura)
    const cx = b.x + b.w * 0.55, cy = b.y + b.h * 0.48, R = Math.hypot(b.w, b.h);
    const g = x.createRadialGradient(cx, cy, 10, cx, cy, R * 0.6); g.addColorStop(0, s.color[1]); g.addColorStop(1, s.color[0]);
    x.fillStyle = g; x.fillRect(b.x, b.y, b.w, b.h);
    x.fillStyle = 'rgba(255,255,255,.28)';
    for (let i = 0; i < 40; i += 2) { const a0 = i * Math.PI / 20, a1 = a0 + Math.PI / 40; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); x.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); x.closePath(); x.fill(); }
    const v = x.createRadialGradient(cx, cy, R * 0.12, cx, cy, R * 0.45); v.addColorStop(0, 'rgba(255,255,255,.75)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = v; x.fillRect(b.x, b.y, b.w, b.h);
  }
  function cintillo(x, s, n, titulo) {
    const [qx, qy] = s.quad[0], ancho = caja(s.quad).w;
    x.save();
    x.font = `700 23px ${FD}`;
    const maxB = Math.min(ancho * 0.62, 310), tw = x.measureText(titulo).width;
    const bw = Math.max(170, Math.min(maxB, tw + 50));
    const band = [[qx + 40, qy + 3], [qx + 40 + bw, qy + 3], [qx + 27 + bw, qy + 46], [qx + 36, qy + 48]];
    poli(x, band); const gy = x.createLinearGradient(0, qy, 0, qy + 48); gy.addColorStop(0, '#ffe04a'); gy.addColorStop(1, '#ffc214');
    x.fillStyle = gy; x.fill(); x.lineJoin = 'round'; x.lineWidth = 3.2; x.strokeStyle = INK; x.stroke();
    const caj = [[qx + 2, qy], [qx + 54, qy], [qx + 45, qy + 57], [qx + 2, qy + 57]];
    poli(x, caj); const go = x.createLinearGradient(0, qy, 0, qy + 57); go.addColorStop(0, '#f2692a'); go.addColorStop(1, '#d4410f');
    x.fillStyle = go; x.fill(); x.stroke();
    // número en cursiva, blanco con tinta
    x.save(); x.translate(qx + 27, qy + 30); x.transform(1, 0, -0.18, 1, 0, 0);
    x.font = `700 42px ${FD}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = INK; x.strokeText(String(n), 0, 2);
    x.fillStyle = '#ffffff'; x.fillText(String(n), 0, 2); x.restore();
    // título: cursiva, mayúsculas, ajustado al cintillo
    x.save(); x.translate(qx + 54, qy + 26); x.transform(1, 0, -0.16, 1, 0, 0);
    let fs = 23; x.font = `700 ${fs}px ${FD}`;
    while (fs > 13 && x.measureText(titulo).width > bw - 34) { fs -= 0.5; x.font = `700 ${fs}px ${FD}`; }
    x.textAlign = 'left'; x.textBaseline = 'middle'; x.lineWidth = 1.2; x.strokeStyle = INK; x.fillStyle = INK;
    x.strokeText(titulo, 0, 1); x.fillText(titulo, 0, 1); x.restore();
    x.restore();
  }
  function globo(x, s, t, tipo) {
    const g = s.globo;
    x.save();
    // tamaño según el texto, sin pasar del globo de la referencia
    const fit = ajustar(x, t, g.rx * 1.42, g.ry * 1.35, { max: 21, min: 12, lineas: 4, peso: 700, lh: 1.12 });
    x.font = `700 ${fit.s}px ${FB}`;
    const anchoT = Math.max(...fit.ls.map(l => x.measureText(l).width)), altoT = fit.ls.length * fit.s * fit.lh;
    const rx = Math.max(g.rx * 0.62, Math.min(g.rx, anchoT / 1.42 + 14)), ry = Math.max(g.ry * 0.6, Math.min(g.ry, altoT / 1.35 + 12));
    const cx = g.cx + (g.rx - rx) * 0.6, cy = g.cy;
    x.lineJoin = 'round'; x.lineWidth = 3.4; x.strokeStyle = INK; x.fillStyle = '#ffffff';
    if (tipo === 'pensamiento') {
      // nube: bultos alrededor de la elipse y burbujas hacia el círculo
      const nb = 12, nube = () => {
        x.beginPath();
        for (let i = 0; i < nb; i++) { const a = i / nb * Math.PI * 2, bx = cx + Math.cos(a) * rx * 0.8, by = cy + Math.sin(a) * ry * 0.74, r = Math.min(rx, ry) * 0.36 * (0.9 + (i % 3) * 0.07); x.moveTo(bx + r, by); x.arc(bx, by, r, 0, Math.PI * 2); }
        x.moveTo(cx + rx * 0.86, cy); x.ellipse(cx, cy, rx * 0.86, ry * 0.8, 0, 0, Math.PI * 2);
      };
      nube(); x.lineWidth = 6.8; x.stroke(); // la mitad exterior del trazo queda como contorno
      nube(); x.fill();
      x.lineWidth = 3.4;
      const [tx, ty] = g.cola;
      for (const [k, rad] of [[0.55, 9], [0.78, 6.5], [0.95, 4.5]]) { x.beginPath(); x.arc(cx + (tx - cx) * k, cy + ry * 0.7 + (ty - cy - ry * 0.7) * k, rad, 0, Math.PI * 2); x.fill(); x.stroke(); }
    } else {
      const [tx, ty] = g.cola, a1 = Math.atan2(ty - cy, tx - cx);
      const p1 = [cx + Math.cos(a1 - 0.32) * rx * 0.92, cy + Math.sin(a1 - 0.32) * ry * 0.92], p2 = [cx + Math.cos(a1 + 0.2) * rx * 0.92, cy + Math.sin(a1 + 0.2) * ry * 0.92];
      x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(p1[0], p1[1]); x.quadraticCurveTo((p1[0] + tx) / 2 + 6, (p1[1] + ty) / 2, tx, ty); x.quadraticCurveTo((p2[0] + tx) / 2 + 10, (p2[1] + ty) / 2 - 4, p2[0], p2[1]); x.closePath();
      x.fill(); x.stroke();
      x.beginPath(); x.ellipse(cx, cy, rx - 1.8, ry - 1.8, 0, a1 - 0.5, a1 + 0.38); x.lineWidth = 5; x.strokeStyle = '#ffffff'; x.stroke(); // tapa la junta de la cola
    }
    texto(x, t, cx, cy, rx * 1.42, ry * 1.35, { max: fit.s, min: fit.s, lineas: 4, peso: 700, lh: 1.12 });
    x.restore();
    return { cx, cy, rx, ry };
  }
  function cajaTexto(x, s, t, limiteDer) {
    const c = s.caja, right = Math.min(c.x + c.w, limiteDer != null ? limiteDer : Infinity, bordeDer(s.quad, c.y + c.h) - 8), w = right - c.x;
    x.save();
    rr(x, c.x, c.y, w, c.h, 14);
    const g = x.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, '#fff6e2'); g.addColorStop(1, '#fbe2ae');
    x.fillStyle = g; x.fill(); x.lineWidth = 2.6; x.strokeStyle = INK; x.stroke();
    // el círculo se come la esquina izquierda: el texto empieza después
    const x0 = c.x + 30, tw = w - 42;
    texto(x, t, x0 + tw / 2, c.y + c.h / 2, tw, c.h - 8, { max: 19, min: 12, lineas: 3, lh: 1.08 });
    x.restore();
    return { x: c.x, y: c.y, w, h: c.h };
  }
  function circulo(x, s, p) {
    const c = s.circulo;
    x.save();
    x.beginPath(); x.arc(c.cx, c.cy, c.r, 0, Math.PI * 2); x.fillStyle = '#ffffff'; x.fill(); x.lineWidth = 3; x.strokeStyle = INK; x.stroke();
    const ri = c.r - 8;
    x.beginPath(); x.arc(c.cx, c.cy, ri, 0, Math.PI * 2);
    const g = x.createRadialGradient(c.cx - ri * 0.3, c.cy - ri * 0.35, 4, c.cx, c.cy, ri); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfd8de');
    x.fillStyle = g; x.fill();
    x.save(); x.clip(); if (p) contener(x, p, c.cx - ri * 0.98, c.cy - ri * 0.98, ri * 1.96, ri * 1.96); x.restore();
    x.beginPath(); x.arc(c.cx, c.cy, ri, 0, Math.PI * 2); x.lineWidth = 2.6; x.strokeStyle = INK; x.stroke();
    x.restore();
  }
  function fuush(x, cx, cy) {
    x.save(); x.translate(cx, cy); x.rotate(-0.24); x.transform(1, 0, -0.2, 1, 0, 0);
    const t = L('¡FUUUSH!', 'WHOOSH!');
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 4; x.lineCap = 'round';
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-150, -30 + i * 20); x.lineTo(-110 + (i % 2) * 14, -30 + i * 20); x.stroke(); }
    let fs = 54; x.font = `700 ${fs}px ${FD}`; while (x.measureText(t).width > 210 && fs > 30) { fs -= 1; x.font = `700 ${fs}px ${FD}`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = 11; x.strokeStyle = INK; x.strokeText(t, 0, 0);
    const g = x.createLinearGradient(0, -fs / 2, 0, fs / 2); g.addColorStop(0, '#5fe0ff'); g.addColorStop(1, '#1462d6');
    x.fillStyle = g; x.fillText(t, 0, 0);
    x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.75)'; x.strokeText(t, -1.5, -2);
    x.restore();
  }
  function bandera(x, X, Y) { // bandera de meta a cuadros en su asta (X, Y = punta del asta)
    x.save();
    x.lineCap = 'round'; x.lineWidth = 9; x.strokeStyle = INK; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y + 150); x.stroke();
    x.lineWidth = 5; x.strokeStyle = '#d6a34a'; x.beginPath(); x.moveTo(X, Y); x.lineTo(X, Y + 150); x.stroke();
    x.fillStyle = '#f5c542'; x.beginPath(); x.arc(X, Y - 3, 7, 0, Math.PI * 2); x.fill(); x.lineWidth = 2.5; x.strokeStyle = INK; x.stroke();
    const w = 104, h = 70, cols = 6, filas = 4, ola = (u) => Math.sin(u * Math.PI * 1.6) * 7;
    const P = (u, v) => [X - 4 - u * w, Y + 6 + v * h + ola(u)];
    for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) {
      const a = P(i / cols, j / filas), b = P((i + 1) / cols, j / filas), c = P((i + 1) / cols, (j + 1) / filas), d = P(i / cols, (j + 1) / filas);
      poli(x, [a, b, c, d]); x.fillStyle = (i + j) % 2 ? '#ffffff' : '#16181d'; x.fill();
    }
    x.beginPath(); for (let i = 0; i <= cols; i++) { const p = P(i / cols, 0); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
    for (let i = cols; i >= 0; i--) { const p = P(i / cols, 1); x.lineTo(p[0], p[1]); } x.closePath();
    x.lineWidth = 3; x.strokeStyle = INK; x.stroke();
    x.restore();
  }
  function corona(x, cx, cy, s) {
    x.beginPath(); x.moveTo(cx - s, cy + s * 0.5);
    [[-s, -s * 0.35], [-s * 0.5, s * 0.1], [0, -s * 0.6], [s * 0.5, s * 0.1], [s, -s * 0.35], [s, s * 0.5]].forEach(p => x.lineTo(cx + p[0], cy + p[1]));
    x.closePath(); const g = x.createLinearGradient(0, cy - s, 0, cy + s); g.addColorStop(0, '#ffe36a'); g.addColorStop(1, '#e09a12');
    x.fillStyle = g; x.fill(); x.lineWidth = 2.4; x.strokeStyle = INK; x.lineJoin = 'round'; x.stroke();
  }
  function placaRecord(x, X, Y, valor) { // placa «NUEVO RÉCORD» con el tiempo real (X, Y = esquina de arriba a la izquierda, 172×112)
    x.save();
    corona(x, X + 86, Y + 6, 26);
    rr(x, X, Y + 22, 172, 90, 12); const g = x.createLinearGradient(0, Y + 22, 0, Y + 112); g.addColorStop(0, '#f8d256'); g.addColorStop(1, '#c98b17');
    x.fillStyle = g; x.fill(); x.lineWidth = 3; x.strokeStyle = INK; x.stroke();
    rr(x, X + 8, Y + 30, 156, 74, 8); const m = x.createLinearGradient(0, Y + 30, 0, Y + 104); m.addColorStop(0, '#a3201f'); m.addColorStop(1, '#6c1010');
    x.fillStyle = m; x.fill(); x.lineWidth = 2; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    let fs = 19; const t1 = L('NUEVO RÉCORD', 'NEW RECORD'); x.font = `700 ${fs}px ${FD}`; while (x.measureText(t1).width > 146 && fs > 12) { fs -= 0.5; x.font = `700 ${fs}px ${FD}`; }
    x.lineWidth = 4; x.strokeStyle = '#3a0808'; x.strokeText(t1, X + 86, Y + 50); x.fillStyle = '#fff1c4'; x.fillText(t1, X + 86, Y + 50);
    let f2 = 27; const t2 = String(valor || '--:--'); x.font = `700 ${f2}px ${FD}`; while (x.measureText(t2).width > 140 && f2 > 12) { f2 -= 0.5; x.font = `700 ${f2}px ${FD}`; }
    x.strokeText(t2, X + 86, Y + 82); x.fillStyle = '#ffffff'; x.fillText(t2, X + 86, Y + 82);
    x.restore();
  }
  // Pegatinas de lo nuevo (pesca, Construir, Patrulla). Se dibujan en el lienzo: no hay imagen que subir.
  // El borde izquierdo (14 px) queda del color plano para que la prueba lo pueda leer.
  const PEG_COLOR = { pesca: '#1478d4', construir: '#d07820', patrulla: '#1c8c46' };
  const PEG_W = 124, PEG_H = 44;
  function pegatinaActividad(x, X, Y, tipo) {
    const fondo = PEG_COLOR[tipo]; if (!fondo) return null;
    const t = tipo === 'pesca' ? L('¡PESCA!', 'CAUGHT!') : tipo === 'construir' ? L('¡ARMADO!', 'BUILT!') : L('¡AVISTÉ!', 'SPOTTED!');
    x.save();
    rr(x, X, Y, PEG_W, PEG_H, 12); x.fillStyle = fondo; x.fill(); x.lineWidth = 3; x.strokeStyle = '#ffffff'; x.stroke();
    x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
    x.save(); x.translate(X + 30, Y + PEG_H / 2);
    x.fillStyle = '#ffffff'; x.strokeStyle = INK; x.lineWidth = 1.6; x.lineJoin = 'round';
    if (tipo === 'pesca') {
      x.beginPath(); x.ellipse(-2, 0, 11, 6, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(8, 0); x.lineTo(16, -6); x.lineTo(16, 6); x.closePath(); x.fill(); x.stroke();
    } else if (tipo === 'construir') {
      x.beginPath(); x.moveTo(-12, 4); x.lineTo(0, -10); x.lineTo(12, 4); x.closePath(); x.fill(); x.stroke();
      x.fillRect(-8, 4, 16, 10); x.strokeRect(-8, 4, 16, 10);
    } else {
      x.beginPath(); x.arc(0, 1, 9, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(0, -12); x.quadraticCurveTo(8, -2, 0, 6); x.quadraticCurveTo(-8, -2, 0, -12); x.fillStyle = '#b6f0c4'; x.fill(); x.stroke();
    }
    x.restore();
    let fs = 16; x.font = `700 ${fs}px ${FD}`; x.textAlign = 'left'; x.textBaseline = 'middle';
    while (x.measureText(t).width > 72 && fs > 10) { fs -= 0.5; x.font = `700 ${fs}px ${FD}`; }
    x.lineWidth = 3; x.strokeStyle = INK; x.strokeText(t, X + 48, Y + PEG_H / 2 + 1);
    x.fillStyle = '#ffffff'; x.fillText(t, X + 48, Y + PEG_H / 2 + 1);
    x.fillStyle = fondo; x.fillRect(X + 4, Y + 4, 10, 10); // muestra plana, lejos del borde y del icono
    x.restore();
    return { tipo, x: X, y: Y, w: PEG_W, h: PEG_H, muestra: { x: X + 9, y: Y + 9 } };
  }
  // Tapa un texto de muestra de una pieza con el color del papel (degradado suave, sin bordes) — para escribir el dinámico encima
  function parche(x, X, Y, w, h, c0, c1) {
    const g = x.createRadialGradient(X + w / 2, Y + h / 2, 4, X + w / 2, Y + h / 2, Math.max(w, h) * 0.62);
    g.addColorStop(0, c0); g.addColorStop(0.8, c1); g.addColorStop(1, c1);
    x.save(); rr(x, X, Y, w, h, Math.min(16, h / 2)); x.fillStyle = g; x.shadowColor = c1; x.shadowBlur = 8; x.fill(); x.restore();
  }
  // Textos de las piezas raster en inglés (cabecera, pasos y botones). Se tapa el texto en español estirando una columna limpia
  // de la misma pieza (conserva el degradado del botón y la veta de la madera) y se escribe encima con el mismo estilo.
  // Medidas en píxeles de cada pieza (assets/comic/plantilla/capas/*.webp, dibujadas a su tamaño en la referencia).
  const EN_PIEZAS = {
    // tapar: { r: [x0, y0, x1, y1], cl, cr: columnas limpias a la izquierda y a la derecha del texto (se funden de una a otra), clip?: polígono }
    cabecera: { tapar: [
      { r: [25, 12, 287, 64], cl: 29, cr: 282, clip: [[25, 22], [287, 13], [287, 60], [25, 64]] },
      { r: [25, 59, 334, 89], cl: 28, cr: 330, clip: [[25, 63], [334, 59], [334, 81], [25, 88]] }], textos: [
      { t: 'CREATE YOUR COMIC', cx: 155, cy: 41, w: 252, s: 38, peso: 700, rot: -0.035, grueso: 1.3 },
      { t: 'Tell your adventure in your own words', cx: 178, cy: 73, w: 288, s: 15.5, peso: 700, rot: -0.03, grueso: 0.3 }] },
    pasos: { tapar: [{ r: [12, 50, 358, 87], cl: 94, cr: 268 }], textos: [
      { t: 'Write', cx: 50, cy: 61, w: 80, s: 14, peso: 700, color: '#fff' }, { t: 'your story', cx: 50, cy: 77, w: 84, s: 12.5, peso: 500, color: '#fff' },
      { t: 'Choose', cx: 141, cy: 61, w: 80, s: 14, peso: 700, color: '#fff' }, { t: 'your scenes', cx: 141, cy: 77, w: 84, s: 12.5, peso: 500, color: '#fff' },
      { t: 'Design', cx: 229, cy: 61, w: 80, s: 14, peso: 700, color: '#fff' }, { t: 'your comic', cx: 229, cy: 77, w: 84, s: 12.5, peso: 500, color: '#fff' },
      { t: 'Download', cx: 318, cy: 61, w: 80, s: 14, peso: 700, color: '#fff' }, { t: '& share', cx: 318, cy: 77, w: 84, s: 12.5, peso: 500, color: '#fff' }] },
    boton_escenas: { tapar: [{ r: [73, 15, 240, 67], cl: 74, cr: 236 }], textos: [{ t: 'SEE MY SCENES', cx: 156, cy: 41, w: 152, s: 21, peso: 700, color: '#fff', borde: '#0b3d8f' }] },
    boton_editar: { tapar: [{ r: [72, 14, 239, 66], cl: 73, cr: 235 }], textos: [{ t: 'EDIT MY COMIC', cx: 154, cy: 40, w: 150, s: 21, peso: 700, color: '#fff', borde: '#0b3d8f' }] },
    boton_descargar: { tapar: [{ r: [78, 14, 209, 72], cl: 79, cr: 204 }], textos: [{ t: 'DOWNLOAD', cx: 142, cy: 30, w: 116, s: 19, peso: 700, color: '#fff', borde: '#0d5a1c' },
      { t: 'PNG / PDF', cx: 142, cy: 54, w: 116, s: 19, peso: 700, color: '#fff', borde: '#0d5a1c' }] },
    boton_compartir: { tapar: [{ r: [73, 12, 214, 68], cl: 74, cr: 209 }], textos: [{ t: 'SHARE', cx: 143, cy: 29, w: 124, s: 21, peso: 700, color: '#fff', borde: '#3e1a7a' },
      { t: '(with permission)', cx: 143, cy: 52, w: 126, s: 15, peso: 700, color: '#fff', borde: '#3e1a7a' }] },
  };
  // Parche de una pieza: la columna cl estirada a lo ancho, fundida hacia la columna cr (sin costuras con el degradado de la pieza)
  function parchePieza(im, t) {
    const [x0, y0, x1, y1] = t.r, w = x1 - x0, h = y1 - y0;
    const a = document.createElement('canvas'); a.width = w; a.height = h;
    const ax = a.getContext('2d'); ax.drawImage(im, t.cl, y0, 1, h, 0, 0, w, h);
    const b = document.createElement('canvas'); b.width = w; b.height = h;
    const bx = b.getContext('2d'); bx.drawImage(im, t.cr, y0, 1, h, 0, 0, w, h);
    const g = bx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    bx.globalCompositeOperation = 'destination-in'; bx.fillStyle = g; bx.fillRect(0, 0, w, h);
    ax.drawImage(b, 0, 0);
    return a;
  }
  function textosEN(x, C) {
    for (const k of Object.keys(EN_PIEZAS)) {
      const im = C[k], p = CAPAS[k], e = EN_PIEZAS[k]; if (!im) continue;
      const sx = p[2] / (im.width || im.naturalWidth || p[2]), sy = p[3] / (im.height || im.naturalHeight || p[3]);
      x.save(); x.translate(p[0], p[1]); x.scale(sx, sy);
      for (const t of e.tapar) {
        x.save();
        if (t.clip) { x.beginPath(); t.clip.forEach(([X, Y], n) => (n ? x.lineTo(X, Y) : x.moveTo(X, Y))); x.closePath(); x.clip(); }
        x.drawImage(parchePieza(im, t), t.r[0], t.r[1]); x.restore();
      }
      for (const o of e.textos) {
        let f = o.s; x.font = `${o.peso} ${f}px ${FD}`; while (x.measureText(o.t).width > o.w && f > 8) { f -= 0.5; x.font = `${o.peso} ${f}px ${FD}`; }
        x.save(); x.translate(o.cx, o.cy); if (o.rot) x.rotate(o.rot);
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
        if (o.borde) { x.lineWidth = 3; x.strokeStyle = o.borde; x.strokeText(o.t, 0, 1); }
        if (o.grueso) { x.lineWidth = o.grueso; x.strokeStyle = o.color || INK; x.strokeText(o.t, 0, 0); } // más negra, como la letra de la pieza
        x.fillStyle = o.color || INK; x.fillText(o.t, 0, 0); x.restore();
      }
      x.restore();
    }
  }
  // Borde blanco de pegatina alrededor de una pose (personaje central)
  function pegatina(x, p, X, Y, w, h) {
    const b = p.bbox, s = Math.min(w / b.w, h / b.h), dw = b.w * s, dh = b.h * s, ox = X + (w - dw) / 2, oy = Y + h - dh;
    const pad = 12, t = document.createElement('canvas'); t.width = Math.ceil(dw + pad * 2); t.height = Math.ceil(dh + pad * 2);
    const tx = t.getContext('2d'); tx.drawImage(p.canvas, b.x, b.y, b.w, b.h, pad, pad, dw, dh);
    const blanco = document.createElement('canvas'); blanco.width = t.width; blanco.height = t.height;
    const bx = blanco.getContext('2d'); bx.drawImage(t, 0, 0); bx.globalCompositeOperation = 'source-in'; bx.fillStyle = '#ffffff'; bx.fillRect(0, 0, t.width, t.height);
    x.save();
    x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 10; x.shadowOffsetY = 4;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; x.drawImage(blanco, ox - pad + Math.cos(a) * 5, oy - pad + Math.sin(a) * 5); }
    x.shadowColor = 'transparent';
    x.drawImage(t, ox - pad, oy - pad);
    x.restore();
    return { x: ox, y: oy, w: dw, h: dh };
  }

  // ---------- Página ----------
  async function componer(cv, d, opts) {
    opts = opts || {};
    cv.width = PAGINA.w; cv.height = PAGINA.h;
    const x = cv.getContext('2d');
    try { await document.fonts.load(`700 40px Fredoka`); await document.fonts.load(`400 20px "Atkinson Hyperlegible"`); await document.fonts.load(`700 20px "Atkinson Hyperlegible"`); } catch (e) { /* respaldo */ }
    const C = (opts.capas || await cargarCapas()) || {};
    // Poses: una por viñeta (con el look de su momento) y la del centro (look actual), en secuencia y en caché
    const poses = [];
    for (const v of d.vinetas) poses.push(await pose(v.look || d.look, v.pose || 'celebrar', 384));
    const centro = await pose(d.look, d.poseCentro || 'celebrar', 640);
    x.setTransform(K, 0, 0, K, 0, 0); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    fondo(x);
    // Cabecera
    if (C.logo) {
      const bw = 262, bh = 110, s = Math.min(bw / C.logo.width, bh / C.logo.height), w = C.logo.width * s, h = C.logo.height * s;
      x.drawImage(C.logo, 12 + (bw - w) / 2, 8 + (bh - h) / 2, w, h); // proporción y transparencia originales
    }
    const pieza = k => { const im = C[k], p = CAPAS[k]; if (im) x.drawImage(im, p[0], p[1], p[2], p[3]); return !!im; };
    pieza('cabecera'); pieza('pasos'); pieza('campo_titulo'); pieza('campo_cotorra');
    if (en()) { // etiquetas de la plantilla en inglés (sobre el papel liso)
      parche(x, 258, 126, 172, 26, '#fff3d8', '#fdeecd'); parche(x, 768, 126, 120, 26, '#fff3d8', '#fdeecd');
      x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = INK; x.font = `700 17px ${FD}`;
      x.fillText('My adventure title:', 263, 139); x.fillText('My parrot:', 773, 139);
    }
    texto(x, d.titulo || '', 262 + 175, 173, 340, 34, { max: 23, min: 12, lineas: 1, peso: 700, fam: FD });
    texto(x, d.nombre || '', 862, 173, 172, 34, { max: 22, min: 11, lineas: 1, peso: 700, fam: FD });
    { // retrato del jugador en el campo «Mi cotorra» (tapa la silueta de la pieza)
      const X = 686, Y = 129, w = 71, h = 68;
      x.save(); rr(x, X, Y, w, h, 7); const g = x.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, '#e9f6ff'); g.addColorStop(1, '#bfe0f2'); x.fillStyle = g; x.fill(); x.clip();
      if (d.retrato) x.drawImage(d.retrato, d.retrato.width * 0.13, d.retrato.height * 0.04, d.retrato.width * 0.74, d.retrato.height * 0.74, X - 2, Y - 2, w + 4, h + 4);
      else contener(x, centro, X + 2, Y + 2, w - 4, h - 4);
      x.restore(); rr(x, X, Y, w, h, 7); x.lineWidth = 2.4; x.strokeStyle = INK; x.stroke();
    }
    // Página blanca
    const PB = PAGINA_BLANCA;
    rr(x, PB.x, PB.y, PB.w, PB.h, PB.r); x.fillStyle = '#f7fbff'; x.fill(); x.lineWidth = 4; x.strokeStyle = INK; x.stroke();
    const info = [], sellos = [];
    d.vinetas.forEach((v, i) => {
      const s = SLOTS[i], q = s.quad, b = caja(q);
      x.save(); poli(x, q); x.clip();
      let poseFoto = null;
      if (v.sceneImage) {
        cubrir(x, v.sceneImage, b.x, b.y, b.w, b.h);
        const sombra = x.createLinearGradient(0, b.y + b.h * 0.6, 0, b.y + b.h); sombra.addColorStop(0, 'rgba(0,0,0,0)'); sombra.addColorStop(1, 'rgba(0,0,0,.18)');
        x.fillStyle = sombra; x.fillRect(b.x, b.y, b.w, b.h);
        // La captura a veces no trae a Vittata: su pose de acción va en la zona libre, sin tapar el globo ni el texto.
        if (!v.falta && poses[i] && poses[i].bbox) {
          const pw = Math.min(118, b.w * 0.3), ph = Math.min(148, b.h * 0.46);
          let px = s.libre[0] - pw * 0.45, py = Math.min(s.libre[1], s.caja.y - 8) - ph;
          if (py < b.y + 8) py = b.y + 8;
          if (py + ph > s.caja.y - 4) py = s.caja.y - 4 - ph;
          if (px < b.x + 6) px = b.x + 6;
          if (px + pw > b.x + b.w - 6) px = b.x + b.w - 6 - pw;
          contener(x, poses[i], px, py, pw, ph, true);
          poseFoto = { x: px * K, y: py * K, w: pw * K, h: ph * K, dentro: py >= b.y - 1 && px >= b.x - 1 && px + pw <= b.x + b.w + 1 && py + ph <= s.caja.y + 2 };
        }
      } else if (v.escena) v.escena(x, b.x, b.y, b.w, b.h);
      else {
        rayos(x, s, b);
        if (!v.falta) contener(x, poses[i], b.x + b.w * 0.36, b.y + 58, b.w * 0.42, b.h - 120); // sin captura: la pose real sobre los rayos
      }
      if (v.falta) { // escena aún por descubrir: marcador claro, nada inventado
        x.setLineDash([10, 8]); rr(x, b.x + b.w * 0.18, b.y + b.h * 0.3, b.w * 0.64, b.h * 0.32, 18); x.lineWidth = 3; x.strokeStyle = 'rgba(19,22,28,.55)'; x.stroke(); x.setLineDash([]);
        texto(x, L('Escena por descubrir', 'Scene to discover'), b.x + b.w / 2, b.y + b.h * 0.42, b.w * 0.6, 34, { max: 26, min: 14, lineas: 1, peso: 700, fam: FD });
        texto(x, L('Sigue jugando para llenarla', 'Keep playing to fill it in'), b.x + b.w / 2, b.y + b.h * 0.53, b.w * 0.6, 26, { max: 18, min: 11, lineas: 1 });
      }
      x.restore();
      poli(x, q); x.lineJoin = 'round'; x.lineWidth = 4.5; x.strokeStyle = INK; x.stroke();
      // Decoraciones solo si el evento las justifica
      const ef = v.falta ? null : v.effectId;
      let limite = null;
      if (ef === 'record' || ef === 'fuush') { if (ef === 'fuush' || v.recordValue) fuush(x, s.libre[0], s.libre[1]); }
      if (ef === 'confusion' && C.confusion) { // junto al globo (arriba), lejos del centro de la captura donde suele estar la cotorra
        const p = CAPAS.confusion, k = 0.82, g = s.globo, w = p[2] * k, h = p[3] * k, arriba = g.cy - g.ry - b.y > h + 56;
        const X = arriba ? g.cx - w / 2 + 40 : Math.max(b.x + 60, g.cx - g.rx - w + 6), Y = arriba ? g.cy - g.ry - h - 2 : Math.max(b.y + 50, g.cy - g.ry - 10);
        x.drawImage(C.confusion, X, Y, p[2] * k, p[3] * k);
      }
      if (ef === 'bandera') bandera(x, bordeDer(q, b.y + 36) - 18, b.y + 34);
      if (ef === 'record') { const k = 0.8, Y = s.caja.y - 112 * k - 4, X = bordeDer(q, Y + 60) - 172 * k - 12; x.save(); x.translate(X, Y); x.scale(k, k); placaRecord(x, 0, 0, v.recordValue); x.restore(); }
      const pegTipo = v.falta ? null : (PEG_COLOR[v.pegatina] ? v.pegatina : (PEG_COLOR[ef] ? ef : null));
      let peg = null;
      if (pegTipo) {
        const X = Math.min(b.x + b.w - PEG_W - 12, Math.max(b.x + 8, s.libre[0] - 20));
        const Y = Math.min(s.caja.y - PEG_H - 8, Math.max(b.y + 34, s.libre[1] - PEG_H - 8));
        sellos.push({ X, Y, tipo: pegTipo, i });
        peg = { tipo: pegTipo, x: X * K, y: Y * K, w: PEG_W * K, h: PEG_H * K, muestra: { x: (X + 9) * K, y: (Y + 9) * K } };
      }
      cintillo(x, s, i + 1, v.falta ? L('POR DESCUBRIR', 'TO DISCOVER') : String(v.sceneTitle || '').toUpperCase());
      const gl = !v.falta && v.dialogueText ? globo(x, s, v.dialogueText, v.dialogueType) : null;
      const cj = cajaTexto(x, s, v.falta ? L('Esta escena aparecerá cuando ocurra en tu aventura.', 'This scene will appear when it happens in your adventure.') : (v.captionText || ''), limite);
      circulo(x, s, poses[i]);
      const c = s.circulo;
      info.push({ id: v.id, caja: { x: b.x * K, y: b.y * K, w: b.w * K, h: b.h * K }, circulo: { x: (c.cx - c.r) * K, y: (c.cy - c.r) * K, s: c.r * 2 * K },
        globo: gl, textoCaja: cj, efecto: ef, pegatina: peg, poseReal: !!poses[i].real, poseFoto });
    });
    // Encima de viñetas, globos y círculos: una pegatina no queda tapada por la viñeta de al lado.
    for (const sello of sellos) pegatinaActividad(x, sello.X, sello.Y, sello.tipo);
    // Abajo: «¿Qué aprendí?», personaje central y «Mi enseñanza de vida»
    roca(x);
    pieza('que_aprendi'); pieza('ensenanza');
    parche(x, 58, 1262, 270, 72, '#fffaee', '#fdf3d8'); // textos de muestra de las piezas 11 y 12
    parche(x, 690, 1262, 270, 72, '#fffaee', '#fdf2d6');
    if (en()) {
      parche(x, 104, 1166, 244, 50, '#ffd650', '#fdd24c'); parche(x, 698, 1168, 298, 46, '#ffd650', '#fdd24c');
      x.save(); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = INK; x.font = `700 25px ${FD}`;
      x.translate(116, 1192); x.transform(1, 0, -0.14, 1, 0, 0); x.fillText('WHAT I LEARNED', 0, 0); x.restore();
      x.save(); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = INK; x.font = `700 23px ${FD}`;
      x.translate(708, 1194); x.transform(1, 0, -0.14, 1, 0, 0); x.fillText('MY LIFE LESSON', 0, 0); x.restore();
    }
    texto(x, d.aprendi || '', 192, 1300, 262, 140, { max: 21, min: 12, lineas: 5 });
    texto(x, d.ensenanza || '', 826, 1294, 250, 96, { max: 21, min: 12, lineas: 4 });
    const ctr = pegatina(x, centro, CENTRO.x, CENTRO.y, CENTRO.w, CENTRO.h); // encima de los marcos, como la silueta de la referencia
    const botones = [];
    if (d.botones !== false) for (const [id, k] of BOTONES) { if (pieza(k)) { const p = CAPAS[k]; botones.push({ id, x: p[0] * K, y: p[1] * K, w: p[2] * K, h: p[3] * K }); } }
    if (en()) textosEN(x, d.botones !== false ? C : Object.assign({}, C, { boton_escenas: null, boton_editar: null, boton_descargar: null, boton_compartir: null }));
    x.setTransform(1, 0, 0, 1, 0, 0);
    return { vinetas: info, centro: { x: ctr.x * K, y: ctr.y * K, w: ctr.w * K, h: ctr.h * K, real: !!centro.real }, botones, logo: !!C.logo };
  }
  function botones() { return BOTONES.map(([id, k]) => { const p = CAPAS[k]; return { id, x: p[0] * K, y: p[1] * K, w: p[2] * K, h: p[3] * K }; }); }

  return { PAGINA, REF, K, SLOTS, LOGO, LOGO_SHA256, POSES, CAPAS, EN_PIEZAS, textosEN, componer, pose, botones, limpiarCache, cargarCapas };
});
