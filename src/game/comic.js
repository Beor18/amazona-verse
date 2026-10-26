/* Juego · cómic personal (dueño: Save & Cómic Engineer)
   - Viñetas de eventos reales: si un evento no ocurrió, su viñeta no existe. Cuando G.eventos registra un evento que tiene
     viñeta, el cómic guarda la apariencia del jugador de ese momento (S.comic.vinetas[id] = { look, seq }) y, si el pack
     no capturó el mundo para esa viñeta, lo captura. Cambiarse de ropa después no reescribe la historia. Las partidas
     viejas sin look usan el actual.
   - Viñetas del motor (cualquier pack; comic.vinetasMotor = false las quita, o se redefine una con su id): ganchos de otros
     sistemas que se vuelven eventos narrativos una vez por partida y nunca en las baterías (G.quiet):
       G.emit('posado', { tipo, que, altura }) (movimiento): techo o cumbrera → FirstRoofPerch; rama a 2,5 m o más →
         FirstHighBranchPerch.
       G.emit('criadero', 'nido') (Iguaca presenta el nido) → NestAppeared; G.emit('criadero', 'eclosion', { id, imagen? })
         → ChickHatched (con la foto de la escena del criadero; sin foto, el nido y la eclosión se ilustran).
     Las viñetas van en el orden en que pasaron.
   - Texto elegido de una lista (sin texto libre: seguridad infantil): S.comic.captions[id] = índice de la opción elegida
     (0 = el texto de la historia); S.comic.title = uno de los títulos.
   - Página de 1080×1520 (más alta si hay más de 4 viñetas): portada, viñetas en cuadrícula o tira (comicLayout, sin solapes) con marco de tinta y, en cada
     una, el retrato 3D del jugador con su look de ese momento (de busto si img = 'portrait'; si no, un medallón abajo a la
     izquierda, lejos de lo que dibuja decorar).
   - PNG fiable: canvas.toBlob (o toDataURL de respaldo), con la firma PNG y el IHDR (ancho y alto) verificados. Si el lienzo
     queda contaminado, se recompone solo con imágenes embebidas.
   - PDF de una página sin librerías (el JPEG del cómic con DCTDecode, ~60 líneas). Una librería como jsPDF (~300 KB) no
     aporta nada para una sola imagen y el visor de Claude solo deja cargar CDNs de la lista.
   - Entrega: capacidad 'downloads' del visor (await window.claude?.use?.('downloads')). Si no está, la imagen queda a la
     vista para guardarla (mantener pulsado o clic derecho), con los botones Abrir y Copiar imagen; en el visor se intenta
     copiarla al portapapeles. <a download> solo fuera del visor, porque dentro no funciona.
   Datos: pack.comic { marca, tituloDefecto, titulos?: [textos], archivo, pdfTitulo, pdfProductor, capturas: [claves],
     portadas: { valorDelSelect: claveDeCaptura },
     vinetas: [{ id, img: 'portrait'|claveDeCaptura, needs: ClaveDeEvento, texto: string | (S, G) => string, opciones?: [string | (S, G) => string] }],
     decorar?(ctx, viñeta, caja, altoImagen, G) }.
   Pruebas: AV.comicTest(): evento real → viñeta con el look → PNG válido de 1080×1520 y no en blanco → entrega. */
AVE.module('comic', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, C = G.pack.comic || {};
  const loadImg = G.assets.image;
  const FILE = C.archivo || 'mi-comic';
  const W = 1080, H = 1520, TOP = 380;
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const aviso = (t, ms) => { if (!G.quiet) G.ui.toast(t, ms); };
  const vin = () => (S.comic.vinetas && typeof S.comic.vinetas === 'object' ? S.comic.vinetas : (S.comic.vinetas = {}));

  // Captura del mundo. Si el lienzo no tiene tamaño (ventana 0×0, pestaña minimizada), snapshot() da null: no se guarda
  // y la captura queda pendiente hasta que el lienzo vuelva a tener tamaño (QA-21)
  const pendientes = new Set();
  const lienzoListo = () => { const c = G.renderer.canvas; return !!c && c.width > 0 && c.height > 0; };
  function capture(key) {
    let img = null;
    if (lienzoListo()) { try { img = G.renderer.snapshot(480, 360, 0.72); } catch (e) { img = null; } }
    if (typeof img === 'string' && /^data:image\/[a-z]+;base64,/.test(img) && img.length > 2000) { S.captures[key] = img; pendientes.delete(key); return true; }
    pendientes.add(key);
    return false;
  }
  // Encuadre de una posada (QA-32): la foto con la cámara del juego puede quedar tapada por un tronco. Se busca un punto de
  // cámara cerca de Vittata desde el que ningún sólido (tronco, pared, roca: G.solidos) tape su cabeza, se fotografía con la
  // cámara del juego y se devuelve la cámara a su sitio. null si no hay ángulo libre o no hay lienzo.
  function fotoPosada() {
    const R = G.renderer, cam = R.camera, SO = G.solidos;
    if (!lienzoListo() || !cam || !R.drawScene || !window.THREE) return null;
    const cab = new THREE.Vector3(S.pos.x, S.pos.y + 1.1, S.pos.z);
    const base = Math.atan2(cam.position.x - S.pos.x, cam.position.z - S.pos.z);
    const libre = q => {
      if (q.y < G.terreno.height(q.x, q.z) + 0.3) return false;
      if (!SO || !SO.activo || !SO.dentro) return true;
      for (let i = 0; i <= 11; i++) { const t = i / 14; if (SO.dentro(q.x + (cab.x - q.x) * t, q.z + (cab.z - q.z) * t, q.y + (cab.y - q.y) * t) > -Infinity) return false; }
      return true;
    };
    for (const d of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, Math.PI]) for (const [dist, dy] of [[3.0, 0.5], [3.8, -0.3]]) {
      const a = base + d, q = new THREE.Vector3(S.pos.x + Math.sin(a) * dist, S.pos.y + dy, S.pos.z + Math.cos(a) * dist);
      if (libre(q)) return fotoDesde(q, cab);
    }
    return null;
  }
  function fotoDesde(q, mira) {
    const R = G.renderer, cam = R.camera, pos = cam.position.clone(), rot = cam.quaternion.clone();
    try {
      cam.position.copy(q); cam.lookAt(mira); cam.updateMatrixWorld();
      R.drawScene();
      const src = R.canvas, sw = src.width, sh = src.height, c = document.createElement('canvas'); c.width = 480; c.height = 360;
      let cw = sw, ch = sw * 0.75; if (ch > sh) { ch = sh; cw = sh / 0.75; }
      c.getContext('2d').drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 480, 360);
      const url = c.toDataURL('image/jpeg', 0.72);
      return url.length > 2000 ? url : null;
    } catch (e) { return null; }
    finally { cam.position.copy(pos); cam.quaternion.copy(rot); cam.updateMatrixWorld(); }
  }
  // Las posadas se fotografían un instante después (el modelo ya quedó en su sitio). Sin ángulo libre: la viñeta con
  // ilustración la usa; si no tiene, se toma la captura normal.
  const posadas = [];
  function fotografiarPosadas(dt) {
    for (let i = posadas.length - 1; i >= 0; i--) {
      const P = posadas[i]; if ((P.t -= dt) > 0) continue;
      posadas.splice(i, 1);
      if (S.captures[P.v.img]) continue;
      const f = fotoPosada();
      if (f) S.captures[P.v.img] = f; else if (!P.v.ilustracion) capture(P.v.img);
      G.guardado.autosave();
    }
  }
  G.on('update', dt => { if (posadas.length) fotografiarPosadas(dt); }, 79);
  let esperaCaptura = 0;
  G.on('update', dt => {
    if (!pendientes.size || (esperaCaptura -= dt) > 0) return;
    esperaCaptura = 0.5;
    if (!lienzoListo()) return;
    for (const k of Array.from(pendientes)) if (S.captures[k] || capture(k)) pendientes.delete(k);
    if (!pendientes.size) G.guardado.autosave();
  }, 79);

  // ---------- Viñetas que nacen de eventos reales, con la apariencia del jugador de ese momento ----------
  function lookActual() {
    try { return JSON.parse(JSON.stringify(G.creador.profileLook(S.profile))); }
    catch (e) { return S.profile && S.profile.look ? JSON.parse(JSON.stringify(S.profile.look)) : null; }
  }
  // Clave del look normalizado (dos looks equivalentes comparten retrato)
  function claveLook(look) {
    try { return JSON.stringify(window.AVCharacter.normalizeLook(look)); } catch (e) { return JSON.stringify(look || null); }
  }
  let vistos = 0;
  function revisarEventos() {
    const ev = S.events; if (!Array.isArray(ev)) return 0;
    if (vistos > ev.length) vistos = ev.length;
    let nuevas = 0;
    for (; vistos < ev.length; vistos++) {
      const e = ev[vistos];
      for (const v of VINETAS) {
        if (v.needs !== e.key || vin()[v.id]) continue;
        vin()[v.id] = { look: lookActual(), seq: e.seq };
        if (v.encuadre === 'posada' && !S.captures[v.img]) posadas.push({ v, t: 0.25 }); // QA-32
        else if (v.img && v.img !== 'portrait' && !v.sinCaptura && !S.captures[v.img]) capture(v.img); // sin WebGL o sin tamaño: queda pendiente
        nuevas++;
      }
    }
    if (nuevas) G.guardado.autosave();
    return nuevas;
  }
  G.on('update', () => { if (Array.isArray(S.events) && S.events.length !== vistos) revisarEventos(); }, 79);

  // ---------- Viñetas del motor: eventos de sistemas que sirven a cualquier pack (movimiento y criadero) ----------
  const VIT = (G.pack.jugador && G.pack.jugador.nombre) || 'Vittata';
  const EV_MOTOR = {
    FirstRoofPerch: { type: 'LocationDiscovered', loc: null, chars: ['vittata'], scene: 'perch' },
    FirstHighBranchPerch: { type: 'LocationDiscovered', loc: null, chars: ['vittata'], scene: 'perch' },
    NestAppeared: { type: 'LocationDiscovered', loc: null, chars: ['vittata'], scene: 'nest' },
    ChickHatched: { type: 'CharacterMet', loc: null, chars: ['vittata'], scene: 'hatch' },
  };
  if (G.eventos.defs) for (const [k, d] of Object.entries(EV_MOTOR)) if (!G.eventos.defs[k]) G.eventos.defs[k] = d;
  const VMOTOR = [
    { id: 'techo', img: 'techo', needs: 'FirstRoofPerch', encuadre: 'posada',
      texto: () => L(`${VIT} aterrizó en un techo por primera vez. ¡Desde arriba todo se ve distinto!`, `${VIT} landed on a roof for the first time. Everything looks different from above!`),
      opciones: [() => L('Desde el techo se veía todo alrededor.', 'From the roof we could see everything around.'),
        () => L('Aprendimos a aterrizar con calma, sin prisa.', 'We learned to land calmly, without rushing.'),
        () => L('Allá arriba el viento nos despeinó las plumas.', 'Up there the wind ruffled our feathers.')] },
    { id: 'rama', img: 'rama', needs: 'FirstHighBranchPerch', encuadre: 'posada', ilustracion: 'rama',
      texto: () => L(`${VIT} se posó en una rama alta por primera vez, como las cotorras del bosque.`, `${VIT} perched on a high branch for the first time, like the forest parrots.`),
      opciones: [() => L('Desde la rama mirábamos el bosque.', 'From the branch we watched the forest.'),
        () => L('Agarrarse bien a una rama también se aprende.', 'Holding on to a branch is something you learn too.'),
        () => L('Allá arriba el bosque sonaba distinto.', 'Up there the forest sounded different.')] },
    { id: 'nido', img: 'nido', needs: 'NestAppeared', sinCaptura: true, ilustracion: 'nido',
      texto: () => L('Encontramos un nido con una cápsula. Lo que aprenda le dará calor.', 'We found a nest with a capsule. What I learn will keep it warm.'),
      opciones: [() => L('Un nido nuevo nos esperaba cerca del camino.', 'A new nest was waiting for us near the path.'),
        () => L('Cada cosa que aprendo ayuda a mi cotorrita.', 'Everything I learn helps my little parrot.'),
        () => L('Prometí visitar el nido muy seguido.', 'I promised to visit the nest often.')] },
    { id: 'eclosion', img: 'eclosion', needs: 'ChickHatched', sinCaptura: true, ilustracion: 'eclosion',
      texto: () => L('¡Nació mi cotorrita! Creció con todo lo que aprendí.', 'My little parrot hatched! It grew with everything I learned.'),
      opciones: [() => L('Le di la bienvenida a mi cotorrita.', 'I welcomed my little parrot.'),
        () => L('La cuidaré y seguiré aprendiendo para que crezca.', 'I will care for it and keep learning so it grows.'),
        () => L('Un día volará libre en el bosque.', 'One day it will fly free in the forest.')] },
  ];
  const VINETAS = (C.vinetas || []).concat(C.vinetasMotor === false ? [] : VMOTOR.filter(v => !(C.vinetas || []).some(p => p.id === v.id)));

  // Ganchos de otros sistemas → eventos narrativos (una vez por partida; nunca en las baterías: G.quiet)
  const RAMA_ALTA = 2.5; // m sobre el terreno
  function registrar(key, datos) {
    if (G.quiet || C.vinetasMotor === false || G.eventos.had(key)) return false;
    G.eventos.log(key, datos || {});
    revisarEventos(); // la viñeta nace en este instante, con la apariencia de ahora
    return true;
  }
  function alPosarse(info) {
    if (!info || typeof info !== 'object') return false;
    const alt = Math.round((Number(info.altura) || 0) * 10) / 10;
    if (info.que === 'techo' || info.que === 'cumbrera') return registrar('FirstRoofPerch', { superficie: info.que, altura: alt });
    if (info.que === 'rama' && alt >= RAMA_ALTA) return registrar('FirstHighBranchPerch', { superficie: 'rama', altura: alt });
    return false;
  }
  G.on('posado', info => alPosarse(info));
  G.on('criadero', (tipo, datos) => {
    if (tipo === 'nido') registrar('NestAppeared', {});
    else if (tipo === 'eclosion') {
      if (G.quiet || C.vinetasMotor === false || G.eventos.had('ChickHatched')) return;
      const im = datos && datos.imagen; // foto de la escena del criadero (si la da)
      if (typeof im === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(im) && im.length > 2000 && im.length < 800000) S.captures.eclosion = im;
      registrar('ChickHatched', { cria: datos && typeof datos.id === 'string' ? datos.id.slice(0, 24) : null });
    }
  });

  // ---------- Selección narrativa ----------
  const TITULOS = (C.titulos && C.titulos.length ? C.titulos : [C.tituloDefecto || 'Mi cómic']).slice();
  const val = (f) => (typeof f === 'function' ? f(S, G) : f);
  // Textos que se pueden elegir para una viñeta: el de la historia y sus opciones
  const opcionesDe = v => [v.texto].concat(v.opciones || []).map(val);
  // Índice elegido (las partidas viejas guardaban texto libre: solo vale si coincide con una opción)
  function eleccion(v, ops) {
    const c = S.comic.captions[v.id];
    if (typeof c === 'number' && c >= 0 && c < ops.length) return c;
    const i = typeof c === 'string' ? ops.indexOf(c) : -1;
    return i >= 0 ? i : 0;
  }
  function comicPanels() {
    revisarEventos();
    const seqDe = key => { const e = S.events.find(ev => ev.key === key); return e && e.seq ? e.seq : Infinity; };
    // En el orden en que pasaron (a igual orden, el de la definición)
    return VINETAS.filter(v => G.eventos.had(v.needs)).map((v, k) => {
      const ops = opcionesDe(v), i = eleccion(v, ops), r = vin()[v.id];
      return { id: v.id, img: v.img, needs: v.needs, ilustracion: v.ilustracion || null, text: ops[i], opciones: ops, eleccion: i, look: (r && r.look) || null, seq: seqDe(v.needs), k };
    }).sort((a, b) => a.seq - b.seq || a.k - b.k);
  }
  const tituloValido = t => (TITULOS.includes(t) ? t : TITULOS[0]);
  function orderedPanels() {
    const panels = comicPanels();
    const order = S.comic.order.filter(i => i < panels.length);
    for (let i = 0; i < panels.length; i++) if (!order.includes(i)) order.push(i);
    return order.map(i => panels[i]);
  }
  function coverFit(ctx, img, x, y, w, h) {
    const ar = img.width / img.height, tr = w / h;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ar > tr) { sw = img.height * tr; sx = (img.width - sw) / 2; } else { sh = img.width / tr; sy = (img.height - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }
  function wrapLines(ctx, text, maxW) {
    const words = String(text).split(/\s+/); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  }
  // Calcula las cajas de las viñetas (probado en selfTest y comicTest: sin solapes y dentro de la página)
  function comicLayout(n, layout, W, H, top) {
    const boxes = [], g = 20;
    if (layout === 'strip') {
      const ph = (H - top - g * (n + 1)) / n;
      for (let i = 0; i < n; i++) boxes.push({ x: g, y: top + g + i * (ph + g), w: W - 2 * g, h: ph });
    } else {
      const rows = Math.ceil(n / 2), pw = (W - 3 * g) / 2, ph = (H - top - g * (rows + 1)) / rows;
      for (let i = 0; i < n; i++) {
        const lastAlone = n % 2 === 1 && i === n - 1;
        boxes.push({ x: lastAlone ? g : g + (i % 2) * (pw + g), y: top + g + Math.floor(i / 2) * (ph + g), w: lastAlone ? W - 2 * g : pw, h: ph });
      }
    }
    return boxes;
  }

  // ---------- Retratos por look (AVCharacter.renderPortrait reutiliza su lienzo: se copia y se llama en secuencia) ----------
  const retratos = new Map(); // clave del look + tamaño → lienzo (solo retratos 3D; LRU de 8)
  function fondoRetrato(x, s) {
    const g = x.createRadialGradient(s * 0.5, s * 0.38, s * 0.05, s * 0.5, s * 0.5, s * 0.72);
    g.addColorStop(0, '#2d5a43'); g.addColorStop(1, '#10241c'); x.fillStyle = g; x.fillRect(0, 0, s, s);
  }
  // fondo = false: el pájaro sin fondo, sobre el degradado de la viñeta de presentación
  async function retratoDe(look, size, fondo) {
    fondo = fondo !== false;
    const lk = look || lookActual();
    const k = claveLook(lk) + '@' + size + (fondo ? '' : '-sf');
    if (retratos.has(k)) { const c = retratos.get(k); retratos.delete(k); retratos.set(k, c); return c; }
    const out = document.createElement('canvas'); out.width = out.height = size;
    const x = out.getContext('2d');
    const perfil = Object.assign({}, S.profile, lk ? { look: lk } : {});
    if (window.AVCharacter && !G.actores.failed3D) {
      try {
        const cv = await window.AVCharacter.renderPortrait(G.creador.profileLook(perfil), size);
        if (fondo) fondoRetrato(x, size);
        x.drawImage(cv, 0, 0, size, size);
        retratos.set(k, out); while (retratos.size > 8) retratos.delete(retratos.keys().next().value);
        return out;
      } catch (e) { /* sin modelo: retrato 2D */ }
    }
    await G.creador.drawPortrait(x, size, perfil, fondo);
    return out;
  }

  // Alto de la página: 1520 hasta 4 viñetas; con más, crece para que cada viñeta conserve su tamaño
  function altoPagina(n, layout) { return Math.max(H, Math.round(layout === 'strip' ? 430 + n * 272.5 : 430 + Math.ceil(n / 2) * 545)); }

  // Ilustraciones del motor (sin foto del momento): el nido con su huevo y la eclosión
  function ilustrar(x, tipo, ix, iy, iw, ih) {
    const s = Math.min(iw * 0.62, ih * 1.1), cx = ix + iw * 0.6, cy = iy + ih * 0.56;
    const cielo = x.createLinearGradient(ix, iy, ix, iy + ih); cielo.addColorStop(0, '#cdeedb'); cielo.addColorStop(1, '#5d9e6c');
    x.fillStyle = cielo; x.fillRect(ix, iy, iw, ih);
    const luz = x.createRadialGradient(cx, cy - s * 0.2, s * 0.05, cx, cy - s * 0.2, s * 0.9);
    luz.addColorStop(0, 'rgba(255,248,214,.85)'); luz.addColorStop(1, 'rgba(255,248,214,0)'); x.fillStyle = luz; x.fillRect(ix, iy, iw, ih);
    for (let k = 0; k < 14; k++) { // hojas del dosel
      const hx = ix + iw * ((k * 0.173 + 0.05) % 1), hy = iy + ih * (0.04 + (k % 4) * 0.07), r = s * (0.16 + (k % 3) * 0.05);
      x.fillStyle = k % 2 ? 'rgba(36,104,60,.75)' : 'rgba(58,135,78,.7)';
      x.beginPath(); x.ellipse(hx, hy, r, r * 0.42, (k * 0.9) % Math.PI, 0, Math.PI * 2); x.fill();
    }
    x.lineCap = 'round'; x.strokeStyle = '#5b3a1e'; x.lineWidth = Math.max(6, s * 0.09); // rama
    x.beginPath(); x.moveTo(ix - 10, cy + s * 0.42); x.quadraticCurveTo(cx - s * 0.2, cy + s * 0.5, ix + iw + 10, cy + s * 0.28); x.stroke();
    if (tipo === 'rama') { // rama alta en el dosel, sin nido
      x.strokeStyle = '#6b4526'; x.lineWidth = Math.max(4, s * 0.05);
      x.beginPath(); x.moveTo(cx + s * 0.1, cy + s * 0.45); x.quadraticCurveTo(cx + s * 0.35, cy + s * 0.1, cx + s * 0.75, cy - s * 0.05); x.stroke();
      x.fillStyle = 'rgba(46,120,70,.85)';
      for (let k = 0; k < 7; k++) { x.beginPath(); x.ellipse(cx + s * (0.2 + k * 0.09), cy + s * (0.3 - k * 0.06), s * 0.09, s * 0.035, -0.6 + (k % 2) * 1.1, 0, Math.PI * 2); x.fill(); }
      return;
    }
    const nidoY = cy + s * 0.2;
    x.fillStyle = '#6e4a2a'; x.beginPath(); x.ellipse(cx, nidoY, s * 0.46, s * 0.2, 0, 0, Math.PI); x.fill(); // cuenco
    x.strokeStyle = '#a8793f'; x.lineWidth = Math.max(2, s * 0.018);
    for (let k = 0; k < 12; k++) { const t = k / 11; x.beginPath(); x.ellipse(cx, nidoY + t * s * 0.14, s * (0.46 - t * 0.1), s * (0.08 + t * 0.03), k % 2 ? 0.05 : -0.05, 0, Math.PI); x.stroke(); }
    const huevo = (ex, ey, rx, ry) => {
      const g = x.createRadialGradient(ex - rx * 0.35, ey - ry * 0.4, rx * 0.1, ex, ey, ry * 1.1);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9d2c2'); x.fillStyle = g;
      x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); x.fill();
    };
    if (tipo === 'eclosion') {
      // Cría asomando del cascarón partido, la otra mitad a un lado y destellos
      const ex = cx, ey = nidoY - s * 0.12, rx = s * 0.15, ry = s * 0.2;
      x.fillStyle = '#7fc35a'; x.beginPath(); x.arc(ex, ey - ry * 0.55, rx * 0.85, 0, Math.PI * 2); x.fill(); // cabeza
      x.fillStyle = '#9fd77a'; x.beginPath(); x.arc(ex - rx * 0.25, ey - ry * 0.75, rx * 0.35, 0, Math.PI * 2); x.fill(); // plumón
      x.fillStyle = '#f2a03d'; x.beginPath(); x.moveTo(ex + rx * 0.55, ey - ry * 0.6); x.lineTo(ex + rx * 1.05, ey - ry * 0.45); x.lineTo(ex + rx * 0.55, ey - ry * 0.3); x.closePath(); x.fill(); // pico
      x.fillStyle = '#10241c'; x.beginPath(); x.arc(ex + rx * 0.2, ey - ry * 0.65, rx * 0.12, 0, Math.PI * 2); x.fill(); // ojo
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + rx * 0.24, ey - ry * 0.69, rx * 0.04, 0, Math.PI * 2); x.fill();
      x.save(); x.beginPath(); x.moveTo(ex - rx, ey - ry * 0.05); // mitad de abajo con borde quebrado
      for (let k = 0; k <= 8; k++) x.lineTo(ex - rx + (2 * rx * k) / 8, ey - ry * (k % 2 ? 0.28 : 0.02));
      x.lineTo(ex + rx, ey + ry); x.lineTo(ex - rx, ey + ry); x.closePath(); x.clip(); huevo(ex, ey, rx, ry); x.restore();
      x.save(); x.translate(ex + rx * 2.1, ey + ry * 0.55); x.rotate(0.9); // mitad de arriba en el nido
      x.beginPath(); x.rect(-rx, -ry, 2 * rx, ry * 0.75); x.clip(); huevo(0, 0, rx, ry); x.restore();
      x.fillStyle = '#ffe27a';
      for (const [dx, dy, r] of [[-1.9, -1.4, 0.16], [1.6, -1.6, 0.12], [2.2, -0.6, 0.09], [-2.4, -0.3, 0.1]]) {
        const sx = ex + dx * rx, sy = ey + dy * ry * 0.7, R = r * s;
        x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? R * 0.35 : R; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } x.closePath(); x.fill();
      }
    } else huevo(cx, nidoY - s * 0.1, s * 0.14, s * 0.19);
  }

  // ---------- Composición ----------
  let ultimoRender = null;
  // opts.seguro: solo imágenes embebidas (data:), para un lienzo que no quede contaminado
  async function renderComic(target, opts) {
    opts = opts || {};
    const CM = S.comic;
    const panels = orderedPanels(), HP = altoPagina(panels.length, CM.layout);
    target.width = W; target.height = HP;
    const x = target.getContext('2d');
    try { await document.fonts.load('700 40px Fredoka'); await document.fonts.load('400 24px "Atkinson Hyperlegible"'); } catch (e) { /* fuente de respaldo */ }
    const propia = src => !!src && (!opts.seguro || /^data:/.test(src));
    const portrait = await retratoDe(null, 512);
    const vit = propia(G.actores.sprite) ? await loadImg(G.actores.sprite) : null;
    const imgs = {};
    for (const k of new Set((C.capturas || []).concat(panels.map(p => p.img).filter(k => k && k !== 'portrait')))) imgs[k] = propia(S.captures[k]) ? await loadImg(S.captures[k]) : null;
    // Retratos de cada viñeta, en secuencia (el renderizador de retratos es uno solo)
    const rets = [];
    for (const p of panels) rets.push(p.img === 'portrait' ? await retratoDe(p.look, 512, false) : await retratoDe(p.look, 320));
    x.fillStyle = '#10241c'; x.fillRect(0, 0, W, HP);
    // Portada
    x.save(); x.beginPath(); x.rect(20, 20, W - 40, TOP - 30); x.clip();
    const coverKey = (C.portadas || {})[CM.cover];
    const coverImg = coverKey ? imgs[coverKey] : null;
    if (coverImg) coverFit(x, coverImg, 20, 20, W - 40, TOP - 30);
    else {
      const g = x.createLinearGradient(0, 20, 0, TOP); g.addColorStop(0, '#2f8f4e'); g.addColorStop(1, '#10241c');
      x.fillStyle = g; x.fillRect(20, 20, W - 40, TOP - 30);
      if (CM.cover === 'personaje') x.drawImage(portrait, W - 380, 10, 360, 360); else if (vit) x.drawImage(vit, W - 400, 0, 380, 380);
    }
    const shade = x.createLinearGradient(0, 150, 0, TOP); shade.addColorStop(0, 'rgba(16,36,28,0)'); shade.addColorStop(1, 'rgba(16,36,28,.92)');
    x.fillStyle = shade; x.fillRect(20, 150, W - 40, TOP - 160); x.restore();
    x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    x.fillStyle = '#f2a03d'; x.font = '600 26px Fredoka, sans-serif'; x.fillText(C.marca || '', 52, 288);
    x.fillStyle = '#f4f7f1'; x.font = '700 58px Fredoka, sans-serif'; x.fillText(tituloValido(CM.title).slice(0, 32), 50, 346);
    // Viñetas
    const boxes = comicLayout(panels.length, CM.layout, W, HP - 30, TOP);
    const cameos = [], looks = {};
    panels.forEach((p, i) => {
      const b = boxes[i], ret = rets[i];
      const lk = p.look || lookActual();
      looks[p.id] = claveLook(lk);
      x.fillStyle = '#f4f7f1'; x.fillRect(b.x, b.y, b.w, b.h);
      x.font = '400 25px "Atkinson Hyperlegible", sans-serif';
      const lines = wrapLines(x, p.text, b.w - 64).slice(0, 4);
      const capH = 30 + lines.length * 33;
      const ih = b.h - capH - 20, ix = b.x + 10, iy = b.y + 10, iw = b.w - 20;
      x.save(); x.beginPath(); x.rect(ix, iy, iw, ih); x.clip();
      if (p.img === 'portrait') {
        const neckAcc = lk && lk.accessories && lk.accessories.neck, outfit = neckAcc && neckAcc.color ? neckAcc.color : '#2f8f4e';
        const g = x.createLinearGradient(b.x, b.y, b.x + b.w, b.y + ih); g.addColorStop(0, '#f4f7f1'); g.addColorStop(1, outfit);
        x.fillStyle = g; x.fillRect(ix, iy, iw, ih);
        const s = Math.min(iw, ih); x.drawImage(ret, b.x + (b.w - s) / 2, iy + (ih - s) / 2, s, s);
      } else {
        if (imgs[p.img]) coverFit(x, imgs[p.img], ix, iy, iw, ih);
        else if (p.ilustracion) ilustrar(x, p.ilustracion, ix, iy, iw, ih);
        else { x.fillStyle = '#4f9a4c'; x.fillRect(ix, iy, iw, ih); }
      }
      if (C.decorar) C.decorar(x, p, b, ih, G);
      if (p.img !== 'portrait') {
        // Medallón del jugador con el look de ese momento
        const s = Math.round(Math.min(ih * 0.62, iw * 0.3, 200)), cx = ix + 12, cy = iy + ih - s - 12, r = s / 2;
        x.save(); x.beginPath(); x.arc(cx + r, cy + r, r, 0, Math.PI * 2);
        x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 12; x.fillStyle = '#10241c'; x.fill(); x.shadowBlur = 0;
        x.clip(); x.drawImage(ret, ret.width * 0.13, ret.height * 0.04, ret.width * 0.74, ret.height * 0.74, cx, cy, s, s); x.restore(); // busto
        x.beginPath(); x.arc(cx + r, cy + r, r - 2, 0, Math.PI * 2); x.lineWidth = 5; x.strokeStyle = '#f4f7f1'; x.stroke();
        cameos.push({ id: p.id, x: cx, y: cy, s });
      }
      x.restore();
      x.lineWidth = 4; x.strokeStyle = '#10241c'; x.strokeRect(ix, iy, iw, ih); // marco de tinta
      x.fillStyle = '#10241c'; x.font = '600 22px Fredoka, sans-serif'; x.fillText(String(i + 1), b.x + 16, b.y + ih + 46);
      x.font = '400 25px "Atkinson Hyperlegible", sans-serif';
      lines.forEach((l, k) => x.fillText(l, b.x + 44, b.y + ih + 46 + k * 33));
    });
    x.fillStyle = '#a9c2b1'; x.font = '400 18px "Atkinson Hyperlegible", sans-serif';
    x.fillText(L('Cómic personal generado con ', 'Personal comic made from ') + S.events.length + L(' eventos reales de tu partida', ' real events of your game'), 24, HP - 10);
    ultimoRender = { target, boxes, panels, cameos, looks };
    return ultimoRender;
  }

  // ---------- PNG y PDF ----------
  function dataUrlBytes(url) { const b = atob(url.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function dataUrlABlob(url) { const m = /^data:([^;,]*)(;base64)?,/.exec(url || ''); return m && m[2] ? new Blob([dataUrlBytes(url)], { type: m[1] || 'application/octet-stream' }) : null; }
  function blobADataUrl(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); }); }
  // toBlob con respaldo en toDataURL; null si el lienzo está contaminado o el navegador no puede
  function aBlob(cv, tipo, calidad) {
    return new Promise(res => {
      let listo = false; const fin = b => { if (!listo) { listo = true; res(b); } };
      try { cv.toBlob(b => fin(b), tipo, calidad); } catch (e) { fin(null); }
      setTimeout(() => fin(null), 10000);
    }).then(b => {
      if (b && b.size) return b;
      try { return dataUrlABlob(cv.toDataURL(tipo, calidad)); } catch (e) { return null; }
    });
  }
  // Firma PNG + IHDR con el ancho y el alto esperados
  async function verificarPNG(blob, w, h) {
    if (!blob || blob.size < 64) return { ok: false, bytes: blob ? blob.size : 0 };
    const u = new Uint8Array(await blob.slice(0, 24).arrayBuffer()), dv = new DataView(u.buffer);
    const firma = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => u[i] === v);
    const ihdr = String.fromCharCode(u[12], u[13], u[14], u[15]) === 'IHDR';
    const ancho = dv.getUint32(16), alto = dv.getUint32(20);
    return { ok: firma && ihdr && ancho === w && alto === h, firma, ancho, alto, bytes: blob.size };
  }
  // Píxeles de una región reducida: desviación de la luminancia y colores distintos (una imagen en blanco da casi 0)
  function estadisticas(fuente, reg) {
    reg = reg || { x: 0, y: 0, w: fuente.width, h: fuente.height };
    const c = document.createElement('canvas'); c.width = Math.max(8, Math.min(120, Math.round(reg.w))); c.height = Math.max(8, Math.min(168, Math.round(reg.h)));
    const x = c.getContext('2d'); x.drawImage(fuente, reg.x, reg.y, reg.w, reg.h, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0, s = 0, s2 = 0; const colores = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; s2 += l * l; n++;
      colores.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
    }
    const media = s / n;
    return { desviacion: Math.sqrt(Math.max(0, s2 / n - media * media)), colores: colores.size, media };
  }
  const enBlanco = e => !e || e.desviacion < 4 || e.colores < 12;
  // PDF de una página con el JPEG del cómic (sin librerías). jpeg: Uint8Array o data URL
  function buildPdf(jpeg, pxW, pxH) {
    const jpg = typeof jpeg === 'string' ? dataUrlBytes(jpeg) : jpeg;
    const ptW = 612, ptH = Math.round(612 * pxH / pxW);
    const enc = s => new TextEncoder().encode(s);
    const parts = [], offsets = [];
    let len = 0;
    const push = u => { parts.push(u); len += u.length; };
    push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
    const ascii = t => String(t).normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
    const objs = [
      `<< /Type /Catalog /Pages 2 0 R >>`,
      `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      null,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      `<< /Title (${ascii(C.pdfTitulo || 'Mi comic')}) /Producer (${ascii(C.pdfProductor || 'Amazona Verse Engine')}) >>`,
    ];
    objs.forEach((o, i) => {
      offsets.push(len);
      if (o === null) {
        push(enc(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`));
        push(jpg); push(enc('\nendstream\nendobj\n'));
      } else push(enc(`${i + 1} 0 obj\n${o}\nendobj\n`));
    });
    const xref = len;
    let xs = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) xs += String(o).padStart(10, '0') + ' 00000 n \n';
    xs += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(enc(xs));
    return new Blob(parts, { type: 'application/pdf' });
  }

  // ---------- Formulario ----------
  function syncComicForm() {
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    S.comic.title = tituloValido(S.comic.title);
    $('c-title').innerHTML = TITULOS.map(t => `<option>${esc(t)}</option>`).join('');
    $('c-title').value = S.comic.title; $('c-cover').value = S.comic.cover; $('c-layout').value = S.comic.layout;
    const panels = orderedPanels();
    $('c-panels').innerHTML = panels.map((p, i) => `<li><div class="pn">Viñeta ${i + 1}</div>
      <select id="cap-${p.id}" data-id="${p.id}" aria-label="Texto de la viñeta ${i + 1}">${p.opciones.map((o, k) => `<option value="${k}"${k === p.eleccion ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>
      <div class="pm"><button class="btn ghost sm" type="button" data-mv="-1" data-i="${i}" aria-label="Subir viñeta ${i + 1}">↑</button><button class="btn ghost sm" type="button" data-mv="1" data-i="${i}" aria-label="Bajar viñeta ${i + 1}">↓</button></div></li>`).join('');
  }
  function moveComicPanel(i, dir) {
    const n = comicPanels().length;
    const order = orderedPanels().map(p => comicPanels().findIndex(q => q.id === p.id));
    const j = i + dir; if (j < 0 || j >= n) return false;
    [order[i], order[j]] = [order[j], order[i]];
    S.comic.order = order; return true;
  }
  $('c-panels').addEventListener('click', e => {
    const b = e.target.closest('button[data-mv]'); if (!b) return;
    if (moveComicPanel(+b.dataset.i, +b.dataset.mv)) { syncComicForm(); refreshComic(); G.guardado.autosave(); }
  });
  $('c-panels').addEventListener('change', e => {
    const sel = e.target.closest('select[data-id]'); if (!sel) return;
    const i = parseInt(sel.value, 10);
    if (i > 0) S.comic.captions[sel.dataset.id] = i; else delete S.comic.captions[sel.dataset.id];
    refreshComic(); G.guardado.autosave();
  });
  for (const id of ['c-title', 'c-cover', 'c-layout']) $(id).addEventListener('change', () => {
    S.comic.title = tituloValido($('c-title').value);
    S.comic.cover = $('c-cover').value; S.comic.layout = $('c-layout').value;
    refreshComic(); G.guardado.autosave();
  });
  async function openComic() {
    $('end').hidden = true; $('comic').hidden = false;
    $('c-export').hidden = true;
    syncComicForm();
    await refreshComic();
  }
  async function refreshComic() { return renderComic($('comic-canvas')); }

  // ---------- Entrega del archivo ----------
  const enVisor = () => !!window.claude; // en el visor de Claude, <a download> no funciona
  let promesaDescargas = null, descargas = null, descargasPrueba = null;
  async function obtenerDescargas() {
    if (descargas) return descargas;
    if (!promesaDescargas) promesaDescargas = (async () => { try { return (await window.claude?.use?.('downloads')) || null; } catch (e) { return null; } })();
    const d = await Promise.race([promesaDescargas, new Promise(r => setTimeout(() => r(null), 4000))]);
    if (d) descargas = d;
    return d;
  }
  if (enVisor()) obtenerDescargas(); // la consulta se adelanta; responde más tarde
  async function copiarImagen(blob) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) return false;
      await navigator.clipboard.write([new window.ClipboardItem({ [blob.type || 'image/png']: blob })]);
      return true;
    } catch (e) { return false; }
  }
  const mostrado = { blob: null, url: null, enlace: null, formato: null };
  function botonesExtra() {
    let abrir = $('c-open'), copiar = $('c-copy');
    if (!abrir) {
      abrir = document.createElement('button'); abrir.id = 'c-open'; abrir.type = 'button'; abrir.className = 'btn ghost'; abrir.setAttribute('data-icon', 'book');
      copiar = document.createElement('button'); copiar.id = 'c-copy'; copiar.type = 'button'; copiar.className = 'btn ghost'; copiar.setAttribute('data-icon', 'save');
      $('c-download').after(abrir, copiar);
      abrir.onclick = () => abrirArchivo();
      copiar.onclick = async () => { aviso(mostrado.blob && await copiarImagen(mostrado.blob) ? L('Imagen copiada al portapapeles.', 'Image copied to the clipboard.')
        : L('No se pudo copiar aquí. Mantén presionada la imagen (o clic derecho) y elige Guardar imagen.', 'Could not copy here. Press and hold the image (or right-click) and choose Save image.'), 3500); };
    }
    return { abrir, copiar };
  }
  function abrirArchivo() {
    if (!mostrado.blob) return false;
    const u = URL.createObjectURL(mostrado.blob);
    let w = null; try { w = window.open(u, '_blank'); } catch (e) { w = null; }
    setTimeout(() => URL.revokeObjectURL(u), 60000);
    if (!w) aviso(L('Este navegador no abrió otra pestaña. Mantén presionada la imagen (o clic derecho) y elige Guardar imagen.', 'This browser did not open a new tab. Press and hold the image (or right-click) and choose Save image.'), 4500);
    return !!w;
  }
  function mostrarExportado(format, blob, url) {
    mostrado.blob = blob; mostrado.url = url; mostrado.formato = format;
    if (mostrado.enlace) URL.revokeObjectURL(mostrado.enlace);
    mostrado.enlace = URL.createObjectURL(blob); // blob: en el enlace (un data: de más de 2 MB no descarga en Chrome)
    const png = format === 'png', a = $('c-download'), b = botonesExtra();
    $('c-export-img').hidden = !png; if (png) $('c-export-img').src = url;
    a.href = mostrado.enlace; a.download = FILE + '.' + format; a.textContent = png ? L('Descargar PNG', 'Download PNG') : L('Descargar PDF', 'Download PDF');
    a.hidden = enVisor();
    b.abrir.textContent = png ? L('Abrir imagen', 'Open image') : L('Abrir PDF', 'Open PDF');
    b.copiar.textContent = L('Copiar imagen', 'Copy image'); b.copiar.hidden = !png;
    $('c-export-note').textContent = png
      ? (enVisor() ? L('Guárdala con la ventana de descarga. Si no aparece: mantén presionada la imagen (o clic derecho) y elige Guardar imagen, o usa Abrir o Copiar.',
        'Save it with the download window. If it does not appear: press and hold the image (or right-click) and choose Save image, or use Open or Copy.')
        : L('En computadora: Descargar PNG. En iPhone o Android: mantén presionada la imagen y elige Guardar.', 'On a computer: Download PNG. On iPhone or Android: press and hold the image and choose Save.'))
      : L('PDF listo. Si no se descarga aquí, usa Abrir PDF o exporta el PNG.', 'PDF ready. If it does not download here, use Open PDF or export the PNG.');
    $('c-export').hidden = false;
  }
  // → 'guardado' | 'rechazado' | 'espera' | 'copiado' | 'enlace' | 'manual'
  async function entregar(format, blob, o) {
    o = o || {};
    const nombre = FILE + '.' + format;
    const d = descargasPrueba || await obtenerDescargas();
    if (d && typeof d.save === 'function') {
      try {
        const r = await d.save({ filename: nombre, data: blob });
        if (!r || r.status !== 'delivered') aviso(L('Listo: tu cómic se guardó.', 'Done: your comic was saved.'));
        return 'guardado';
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') { aviso(L('Descarga cancelada', 'Download cancelled')); return 'rechazado'; }
        if (code === 'rate_limited') { aviso(L('Hay otra descarga abierta; inténtalo en un momento.', 'Another download is open; try again in a moment.')); return 'espera'; }
        // unavailable, too_large, etc.: plan B
      }
    }
    if (!(o.visor != null ? o.visor : enVisor())) return 'enlace'; // fuera del visor queda el enlace Descargar
    if (format === 'png' && await (o.copiar || copiarImagen)(blob)) {
      aviso(L('Imagen copiada al portapapeles. También puedes mantenerla presionada o usar Abrir imagen para guardarla.', 'Image copied to the clipboard. You can also press and hold it or use Open image to save it.'), 5000);
      return 'copiado';
    }
    aviso(format === 'png' ? L('Mantén presionada la imagen (o clic derecho) y elige Guardar imagen.', 'Press and hold the image (or right-click) and choose Save image.')
      : L('Usa Abrir PDF para verlo y guardarlo.', 'Use Open PDF to view and save it.'), 4500);
    return 'manual';
  }
  const ultimo = { png: null, pdf: null, pdfUrl: null };
  // Compone la página y la codifica; el PNG se verifica (firma + ancho y alto). Sin avisos, eventos ni guardado:
  // lo usan exportComic y pngSinRegistro (el botón «Compartir», src/game/records.js)
  async function blobDelComic(cv, tipo, calidad) {
    await renderComic(cv);
    let blob = await aBlob(cv, tipo, calidad);
    if (!blob) { await renderComic(cv, { seguro: true }); blob = await aBlob(cv, tipo, calidad); } // lienzo contaminado
    if (blob && tipo === 'image/png' && !(await verificarPNG(blob, cv.width, cv.height)).ok) {
      try { blob = dataUrlABlob(cv.toDataURL('image/png')); } catch (e) { blob = null; }
      if (blob && !(await verificarPNG(blob, cv.width, cv.height)).ok) blob = null;
    }
    return blob;
  }
  const pngSinRegistro = () => blobDelComic($('comic-canvas'), 'image/png');
  async function exportComic(format, fromUser) {
    const cv = $('comic-canvas'), pdf = format === 'pdf';
    const tipo = pdf ? 'image/jpeg' : 'image/png', calidad = pdf ? 0.9 : undefined;
    let blob = await blobDelComic(cv, tipo, calidad);
    if (!blob) { aviso(L('Este navegador no pudo crear la imagen del cómic.', 'This browser could not create the comic image.'), 4000); return null; }
    let url;
    if (pdf) {
      blob = buildPdf(new Uint8Array(await blob.arrayBuffer()), cv.width, cv.height);
      if (ultimo.pdfUrl) URL.revokeObjectURL(ultimo.pdfUrl);
      url = ultimo.pdfUrl = URL.createObjectURL(blob); ultimo.pdf = blob;
    } else { ultimo.png = blob; url = await blobADataUrl(blob); }
    mostrarExportado(format, blob, url);
    G.eventos.log('ComicExported', { format, bytes: blob.size });
    G.guardado.autosave();
    if (fromUser) await entregar(format, blob);
    return url;
  }
  $('b-comic').onclick = openComic;
  // Con la partida terminada el cómic también se abre desde el menú de pausa («Mi cómic»), para quien eligió «Seguir explorando».
  // Al cerrarlo vuelve al panel final solo si ese panel sigue pendiente (S.explorando = ya lo cerró).
  const bMenu = $('b-comic-menu');
  if (bMenu) {
    bMenu.onclick = openComic;
    const verMenu = () => { bMenu.hidden = !S.complete; };
    G.on('apply', verMenu, 65); verMenu();
    if ($('pause')) $('pause').addEventListener('toggle', verMenu);
  }
  $('c-close').onclick = () => { $('comic').hidden = true; if (S.complete && !S.explorando) $('end').hidden = false; };
  $('c-refresh').onclick = refreshComic;
  $('c-png').onclick = () => exportComic('png', true);
  $('c-pdf').onclick = () => exportComic('pdf', true);
  G.on('apply', () => {
    vistos = Array.isArray(S.events) ? S.events.length : 0; $('comic').hidden = true; posadas.length = 0;
    pendientes.clear();
    for (const k of Object.keys(S.captures || {})) if (!S.captures[k]) delete S.captures[k]; // partidas con capturas nulas (QA-21)
  }, 60);

  // =====================================================================================================================
  // AV.comicTest(): un evento real del juego genera su viñeta con la apariencia actual del jugador; la página se compone
  // y se exporta a PNG válido (firma, IHDR, 1080×1520, se decodifica y no está en blanco); entrega con y sin 'downloads'.
  // G.S y el guardado real quedan como estaban.
  // =====================================================================================================================
  async function test(opts) {
    opts = opts || {};
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const SV = G.guardado, snap = SV.instantanea(), quiet = G.quiet, abierto = !$('comic').hidden;
    SV.suspender(true); G.quiet = true;
    try {
      const defs = C.vinetas || [];
      const def = defs.find(v => v.img && v.img !== 'portrait') || defs[0];
      check('El pack define viñetas ligadas a eventos', !!def, defs.length + ' viñetas');
      if (!def) throw new Error('sin viñetas');
      // Apariencia de la prueba, distinta de la habitual
      let look = null;
      try { look = G.creador.profileLook({ preset: 'agilis', outfit: 'morado', accessory: 'gafas' }); } catch (e) { look = null; }
      S.profile = Object.assign({}, S.profile, { created: true, look });
      // El evento no ha ocurrido todavía: no hay viñeta
      S.events = S.events.filter(e => e.key !== def.needs); delete vin()[def.id];
      if (def.img !== 'portrait') delete S.captures[def.img];
      vistos = S.events.length;
      check('Sin el evento no hay viñeta', !comicPanels().some(p => p.id === def.id));
      // Evento real por el mismo camino que el juego (G.eventos.log) y un cuadro del bucle
      G.eventos.log(def.needs, {});
      G.renderer.update(0.05);
      const reg = vin()[def.id], p = comicPanels().find(q => q.id === def.id);
      check('Evento real → viñeta', !!p && G.eventos.had(def.needs) && !!reg, `${def.needs} → ${def.id}`);
      check('La viñeta guarda la apariencia del jugador de ese momento', reg && claveLook(reg.look) === claveLook(lookActual()), reg && reg.look ? reg.look.species : 'sin look');
      if (def.img !== 'portrait') {
        if (lienzoListo()) check('El mundo se capturó para la viñeta', /^data:image\//.test(S.captures[def.img] || ''), def.img);
        else check('Lienzo sin tamaño: la captura no guarda null y queda pendiente', !(def.img in S.captures) && pendientes.has(def.img), 'ventana 0×0');
      }
      // Componer y exportar a PNG
      S.comic.layout = 'grid'; S.comic.order = [];
      const url = await exportComic('png');
      const HP = altoPagina(ultimoRender.panels.length, 'grid'), blob = ultimo.png, v = await verificarPNG(blob, W, HP);
      check(`PNG válido: firma, IHDR y ${W}×${HP}`, v.ok && typeof url === 'string' && url.startsWith('data:image/png'), `${v.ancho}×${v.alto} · ${Math.round((v.bytes || 0) / 1024)} KB`);
      const im = url ? await loadImg(url) : null;
      check('El PNG se decodifica con esas dimensiones', im && im.width === W && im.height === HP, im ? im.width + '×' + im.height : 'no carga');
      const eT = im && estadisticas(im);
      check('El PNG no está en blanco', eT && !enBlanco(eT), eT ? `desv. ${eT.desviacion.toFixed(1)} · ${eT.colores} colores` : '');
      const R = ultimoRender, i = R ? R.panels.findIndex(q => q.id === def.id) : -1, caja = i >= 0 ? R.boxes[i] : null;
      const eV = im && caja && estadisticas(im, caja);
      check('La viñeta del evento está en la página y tiene imagen', !!caja && eV && !enBlanco(eV), eV ? `desv. ${eV.desviacion.toFixed(1)} · ${eV.colores} colores` : 'sin caja');
      check('La viñeta se dibujó con el look de su momento', R && reg && R.looks[def.id] === claveLook(reg.look));
      if (def.img !== 'portrait') {
        const cam = R.cameos.find(c => c.id === def.id), eC = im && cam && estadisticas(im, { x: cam.x, y: cam.y, w: cam.s, h: cam.s });
        check('El retrato del jugador aparece en la viñeta', !!cam && eC && !enBlanco(eC), cam ? `${cam.s} px · desv. ${eC.desviacion.toFixed(1)}` : 'sin retrato');
      }
      // Cambiarse de ropa después no reescribe esa viñeta
      try { S.profile = Object.assign({}, S.profile, { look: G.creador.profileLook({ preset: 'oratrix', outfit: 'amarillo', accessory: 'gorra' }) }); } catch (e) { /* sin modelo */ }
      const p2 = comicPanels().find(q => q.id === def.id);
      check('Cambiar de apariencia después no cambia esa viñeta', p2 && claveLook(p2.look) === claveLook(reg.look) && claveLook(lookActual()) !== claveLook(reg.look));
      // Viñetas del motor por sus ganchos: techo/cumbrera y rama alta (movimiento), nido y eclosión (criadero)
      if (C.vinetasMotor !== false) {
        const foto = (() => { const c = document.createElement('canvas'); c.width = 480; c.height = 360; const g = c.getContext('2d');
          const gr = g.createLinearGradient(0, 0, 480, 360); gr.addColorStop(0, '#2d5a43'); gr.addColorStop(1, '#f2a03d'); g.fillStyle = gr; g.fillRect(0, 0, 480, 360);
          g.fillStyle = '#7fc35a'; g.beginPath(); g.arc(240, 180, 90, 0, 7); g.fill(); return c.toDataURL('image/jpeg', 0.8); })();
        const casos = [
          { id: 'techo', key: 'FirstRoofPerch', look: { preset: 'albifrons', outfit: 'naranja', accessory: 'gorra' }, disparar: () => G.emit('posado', { tipo: 'alto', que: 'cumbrera', altura: 4.2 }) },
          { id: 'rama', key: 'FirstHighBranchPerch', look: { preset: 'versicolor', outfit: 'azul', accessory: 'medalla' }, disparar: () => G.emit('posado', { tipo: 'fino', que: 'rama', altura: 3.1 }) },
          { id: 'nido', key: 'NestAppeared', look: { preset: 'festiva', outfit: 'rojo', accessory: 'ninguno' }, disparar: () => G.emit('criadero', 'nido') },
          { id: 'eclosion', key: 'ChickHatched', look: { preset: 'guildingii', outfit: 'amarillo', accessory: 'gafas' }, disparar: () => G.emit('criadero', 'eclosion', { id: 'h1', imagen: foto }) },
        ];
        for (const c of casos) { S.events = S.events.filter(e => e.key !== c.key); delete vin()[c.id]; delete S.captures[c.id]; }
        vistos = S.events.length;
        // Con G.quiet (baterías) los ganchos no crean nada; una rama baja, una roca o un poste tampoco cuentan
        G.emit('posado', { tipo: 'alto', que: 'techo', altura: 5 }); G.emit('criadero', 'nido');
        G.quiet = false;
        try { G.emit('posado', { tipo: 'fino', que: 'rama', altura: 1.2 }); G.emit('posado', { tipo: 'alto', que: 'roca', altura: 3 }); G.emit('posado', { tipo: 'fino', que: 'poste', altura: 3 }); }
        finally { G.quiet = true; }
        check('Con G.quiet, en una rama baja, una roca o un poste no hay viñeta', !casos.some(c => G.eventos.had(c.key)));
        for (const c of casos) {
          try { S.profile = Object.assign({}, S.profile, { look: G.creador.profileLook(c.look) }); } catch (e) { /* sin modelo */ }
          G.quiet = false; try { c.disparar(); } finally { G.quiet = true; }
          const r = vin()[c.id], pm = comicPanels().find(q => q.id === c.id);
          check(`Gancho → ${c.key} → viñeta «${c.id}» con la apariencia de ese momento`, G.eventos.had(c.key) && !!pm && r && claveLook(r.look) === claveLook(lookActual()), r && r.look ? r.look.species : 'sin look');
        }
        check('La eclosión usa la foto de la escena del criadero', S.captures.eclosion === foto);
        for (let i = 0; i < 8; i++) G.renderer.update(0.05); // las posadas se fotografían un instante después
        if (lienzoListo()) check('Techo y rama: foto encuadrada desde un ángulo libre (QA-32)', /^data:image\/jpeg/.test(S.captures.techo || '') && /^data:image\/jpeg/.test(S.captures.rama || ''));
        const solBk = G.solidos;
        try { G.solidos = { activo: true, dentro: () => 99 }; check('Si un sólido tapa todos los ángulos, no hay foto tapada (rama: ilustración)', fotoPosada() === null); }
        finally { G.solidos = solBk; }
        G.quiet = false; try { G.emit('criadero', 'nido'); G.emit('posado', { tipo: 'alto', que: 'techo', altura: 6 }); } finally { G.quiet = true; }
        check('Cada evento del motor cuenta una sola vez por partida', S.events.filter(e => e.key === 'NestAppeared' || e.key === 'FirstRoofPerch').length === 2);
        // Página con todas las viñetas: más alta si hace falta, PNG válido y cada viñeta nueva con contenido y en orden
        const url2 = await exportComic('png'), R2 = ultimoRender, alto = altoPagina(R2.panels.length, 'grid');
        const v2 = await verificarPNG(ultimo.png, W, alto), im2 = url2 ? await loadImg(url2) : null;
        check(`PNG con ${R2.panels.length} viñetas: válido y de ${W}×${alto}`, v2.ok && im2 && im2.width === W && im2.height === alto, `${v2.ancho}×${v2.alto}`);
        const vacias = casos.filter(c => { const j = R2.panels.findIndex(q => q.id === c.id), e = j >= 0 && im2 ? estadisticas(im2, R2.boxes[j]) : null; return !e || enBlanco(e); });
        check('Las 4 viñetas nuevas están en la página y no en blanco', vacias.length === 0, vacias.map(c => c.id).join(', ') || 'todas con imagen');
        check('Las viñetas van en el orden en que pasaron', R2.panels.every((q, j) => j === 0 || R2.panels[j - 1].seq <= q.seq));
      }
      // Diseños: sin solapes y dentro de la página
      let malos = 0;
      for (const lay of ['grid', 'strip']) for (let n = 1; n <= 6; n++) {
        const bx = comicLayout(n, lay, W, H - 30, TOP);
        const dentro = bx.every(b => b.x >= 0 && b.y >= TOP && b.x + b.w <= W && b.y + b.h <= H - 30 && b.w > 100 && b.h > 100);
        const solape = bx.some((a, j) => bx.some((b, k) => j < k && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
        if (!dentro || solape) malos++;
      }
      check('Diseños en cuadrícula y tira (1–6 viñetas) sin solapes y dentro de la página', malos === 0, malos + ' fallan');
      // Entrega con la capacidad 'downloads' (simulada), cancelada y ausente
      let recibido = null;
      descargasPrueba = { save: async r => { recibido = r; return { status: 'saved' }; } };
      const r1 = await entregar('png', blob);
      check('Con downloads: se ofrece el PNG con su nombre', r1 === 'guardado' && recibido && recibido.filename === FILE + '.png' && recibido.data === blob, recibido ? recibido.filename : 'sin llamada');
      descargasPrueba = { save: async () => { const e = new Error('no'); e.code = 'declined'; throw e; } };
      check('Si el niño cancela, no se reintenta', (await entregar('png', blob)) === 'rechazado');
      descargasPrueba = { save: async () => { const e = new Error('x'); e.code = 'unavailable'; throw e; } };
      const r3 = await entregar('png', blob, { visor: true, copiar: async () => true });
      const r4 = await entregar('png', blob, { visor: true, copiar: async () => false });
      check('Sin downloads en el visor: se copia la imagen o queda a la vista para guardarla', r3 === 'copiado' && r4 === 'manual' && !$('c-export-img').hidden && $('c-export-img').src.startsWith('data:image/png') && !!$('c-open'), `${r3} / ${r4}`);
      check('Fuera del visor queda el enlace de descarga; dentro se oculta', $('c-download').hidden === enVisor() && $('c-download').getAttribute('href').startsWith('blob:'));
      descargasPrueba = null;
      // PDF sin librerías
      if (opts.pdf !== false) {
        await exportComic('pdf');
        const pdf = ultimo.pdf;
        const cab = pdf ? new TextDecoder().decode(new Uint8Array(await pdf.slice(0, 8).arrayBuffer())) : '';
        const fin = pdf ? new TextDecoder().decode(new Uint8Array(await pdf.slice(pdf.size - 6).arrayBuffer())) : '';
        check('PDF de una página sin librerías (cabecera y cierre)', cab.startsWith('%PDF-1.4') && fin.includes('%%EOF') && pdf.size > 20000, pdf ? Math.round(pdf.size / 1024) + ' KB' : 'sin PDF');
      }
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      descargasPrueba = null;
      SV.restaurar(snap);
      SV.suspender(false); G.quiet = quiet;
      $('c-export').hidden = true; $('comic').hidden = !abierto;
    }
    check('G.S queda como estaba', JSON.stringify(SV.instantanea()) === JSON.stringify(snap));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  // AV.comicTest (boot.js es del coordinador: se expone aquí si boot no lo hizo)
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.comicTest) AV.comicTest = o => test(o); }, 0);

  return { titulos: TITULOS, capture, comicPanels, orderedPanels, comicLayout, renderComic, buildPdf, syncComicForm, moveComicPanel, openComic, refreshComic, exportComic, pngSinRegistro,
    revisarEventos, verificarPNG, estadisticas, entregar, test,
    get lastBlob() { return ultimo.pdf; }, get lastPng() { return ultimo.png; } };
});
