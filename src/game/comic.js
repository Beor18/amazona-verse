/* Juego · cómic personal (dueño: Save & Cómic Engineer)
   - Viñetas de eventos reales: si un evento no ocurrió, su viñeta no existe. Cuando G.eventos registra un evento que tiene
     viñeta, el cómic guarda la apariencia del jugador de ese momento (S.comic.vinetas[id] = { look, seq }) y, si el pack
     no capturó el mundo para esa viñeta, lo captura. Cambiarse de ropa después no reescribe la historia. Las partidas
     viejas sin look usan el actual.
   - Texto elegido de una lista (sin texto libre: seguridad infantil): S.comic.captions[id] = índice de la opción elegida
     (0 = el texto de la historia); S.comic.title = uno de los títulos.
   - Página de 1080×1520: portada, viñetas en cuadrícula o tira (comicLayout, sin solapes) con marco de tinta y, en cada
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

  function capture(key) { S.captures[key] = G.renderer.snapshot(480, 360, 0.72); }

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
      for (const v of C.vinetas || []) {
        if (v.needs !== e.key || vin()[v.id]) continue;
        vin()[v.id] = { look: lookActual(), seq: e.seq };
        if (v.img && v.img !== 'portrait' && !S.captures[v.img]) { try { capture(v.img); } catch (er) { /* sin WebGL: la viñeta usa su fondo */ } }
        nuevas++;
      }
    }
    if (nuevas) G.guardado.autosave();
    return nuevas;
  }
  G.on('update', () => { if (Array.isArray(S.events) && S.events.length !== vistos) revisarEventos(); }, 79);

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
    return (C.vinetas || []).filter(v => G.eventos.had(v.needs)).map(v => {
      const ops = opcionesDe(v), i = eleccion(v, ops), r = vin()[v.id];
      return { id: v.id, img: v.img, needs: v.needs, text: ops[i], opciones: ops, eleccion: i, look: (r && r.look) || null };
    });
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

  // ---------- Composición ----------
  let ultimoRender = null;
  // opts.seguro: solo imágenes embebidas (data:), para un lienzo que no quede contaminado
  async function renderComic(target, opts) {
    opts = opts || {};
    target.width = W; target.height = H;
    const x = target.getContext('2d');
    try { await document.fonts.load('700 40px Fredoka'); await document.fonts.load('400 24px "Atkinson Hyperlegible"'); } catch (e) { /* fuente de respaldo */ }
    const CM = S.comic;
    const panels = orderedPanels();
    const propia = src => !!src && (!opts.seguro || /^data:/.test(src));
    const portrait = await retratoDe(null, 512);
    const vit = propia(G.actores.sprite) ? await loadImg(G.actores.sprite) : null;
    const imgs = {};
    for (const k of C.capturas || []) imgs[k] = propia(S.captures[k]) ? await loadImg(S.captures[k]) : null;
    // Retratos de cada viñeta, en secuencia (el renderizador de retratos es uno solo)
    const rets = [];
    for (const p of panels) rets.push(p.img === 'portrait' ? await retratoDe(p.look, 512, false) : await retratoDe(p.look, 320));
    x.fillStyle = '#10241c'; x.fillRect(0, 0, W, H);
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
    const boxes = comicLayout(panels.length, CM.layout, W, H - 30, TOP);
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
    x.fillText(L('Cómic personal generado con ', 'Personal comic made from ') + S.events.length + L(' eventos reales de tu partida', ' real events of your game'), 24, H - 10);
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
  async function exportComic(format, fromUser) {
    const cv = $('comic-canvas'), pdf = format === 'pdf';
    const tipo = pdf ? 'image/jpeg' : 'image/png', calidad = pdf ? 0.9 : undefined;
    await renderComic(cv);
    let blob = await aBlob(cv, tipo, calidad);
    if (!blob) { await renderComic(cv, { seguro: true }); blob = await aBlob(cv, tipo, calidad); } // lienzo contaminado
    if (blob && !pdf && !(await verificarPNG(blob, cv.width, cv.height)).ok) {
      try { blob = dataUrlABlob(cv.toDataURL('image/png')); } catch (e) { blob = null; }
      if (blob && !(await verificarPNG(blob, cv.width, cv.height)).ok) blob = null;
    }
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
  $('c-close').onclick = () => { $('comic').hidden = true; if (S.complete) $('end').hidden = false; };
  $('c-refresh').onclick = refreshComic;
  $('c-png').onclick = () => exportComic('png', true);
  $('c-pdf').onclick = () => exportComic('pdf', true);
  G.on('apply', () => { vistos = Array.isArray(S.events) ? S.events.length : 0; $('comic').hidden = true; }, 60);

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
      if (def.img !== 'portrait') check('El mundo se capturó para la viñeta', /^data:image\//.test(S.captures[def.img] || ''), def.img);
      // Componer y exportar a PNG
      S.comic.layout = 'grid';
      const url = await exportComic('png');
      const blob = ultimo.png, v = await verificarPNG(blob, W, H);
      check('PNG válido: firma, IHDR y 1080×1520', v.ok && typeof url === 'string' && url.startsWith('data:image/png'), `${v.ancho}×${v.alto} · ${Math.round((v.bytes || 0) / 1024)} KB`);
      const im = url ? await loadImg(url) : null;
      check('El PNG se decodifica con esas dimensiones', im && im.width === W && im.height === H, im ? im.width + '×' + im.height : 'no carga');
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

  return { titulos: TITULOS, capture, comicPanels, orderedPanels, comicLayout, renderComic, buildPdf, syncComicForm, moveComicPanel, openComic, refreshComic, exportComic,
    revisarEventos, verificarPNG, estadisticas, entregar, test,
    get lastBlob() { return ultimo.pdf; }, get lastPng() { return ultimo.png; } };
});
