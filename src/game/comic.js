/* Juego · cómic personal
   Capturas del mundo en momentos clave, viñetas que salen solo de eventos reales (si un evento no ocurrió, la viñeta no existe),
   texto editable, orden, portada, diseño en cuadrícula o tira, y exportación a PNG y PDF de una página sin librerías.
   Datos: pack.comic { marca, tituloDefecto, archivo, pdfTitulo, pdfProductor, capturas: [claves], portadas: { valorDelSelect: claveDeCaptura },
     vinetas: [{ id, img: 'portrait'|claveDeCaptura, needs: ClaveDeEvento, texto: string | (S, G) => string }], decorar?(ctx, viñeta, caja, altoImagen, G) }. */
AVE.module('comic', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, C = G.pack.comic || {};
  const loadImg = G.assets.image;
  const FILE = C.archivo || 'mi-comic';

  function capture(key) { S.captures[key] = G.renderer.snapshot(480, 360, 0.72); }

  // Selección narrativa: cada viñeta sale de eventos reales
  function comicPanels() {
    const all = (C.vinetas || []).map(v => ({ id: v.id, img: v.img, needs: v.needs, text: typeof v.texto === 'function' ? v.texto(S, G) : v.texto }));
    return all.filter(x => G.eventos.had(x.needs)).map(x => Object.assign(x, { text: (S.comic.captions[x.id] || x.text) }));
  }
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
  // Calcula las cajas de las viñetas (probado en selfTest: sin solapes y dentro de la página)
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
  async function renderComic(target) {
    const W = 1080, H = 1520, TOP = 380;
    target.width = W; target.height = H;
    const x = target.getContext('2d');
    try { await document.fonts.load('700 40px Fredoka'); await document.fonts.load('400 24px "Atkinson Hyperlegible"'); } catch (e) { /* fuente de respaldo */ }
    const CM = S.comic;
    const panels = orderedPanels();
    const portrait = await G.creador.portraitCanvasFor(512, true);
    const vit = await loadImg(G.actores.sprite);
    const imgs = {};
    for (const k of C.capturas || []) imgs[k] = await loadImg(S.captures[k]);
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
    x.fillStyle = '#f4f7f1'; x.font = '700 58px Fredoka, sans-serif'; x.fillText((CM.title || C.tituloDefecto || '').slice(0, 32), 50, 346);
    // Viñetas
    const boxes = comicLayout(panels.length, CM.layout, W, H - 30, TOP);
    panels.forEach((p, i) => {
      const b = boxes[i];
      x.fillStyle = '#f4f7f1'; x.fillRect(b.x, b.y, b.w, b.h);
      x.font = '400 25px "Atkinson Hyperlegible", sans-serif';
      const lines = wrapLines(x, p.text, b.w - 64).slice(0, 4);
      const capH = 30 + lines.length * 33;
      const ih = b.h - capH - 20;
      x.save(); x.beginPath(); x.rect(b.x + 10, b.y + 10, b.w - 20, ih); x.clip();
      if (p.img === 'portrait') {
        const neckAcc = G.creador.profileLook(S.profile).accessories.neck, outfit = neckAcc ? neckAcc.color : '#2f8f4e';
        const g = x.createLinearGradient(b.x, b.y, b.x + b.w, b.y + ih); g.addColorStop(0, '#f4f7f1'); g.addColorStop(1, outfit);
        x.fillStyle = g; x.fillRect(b.x + 10, b.y + 10, b.w - 20, ih);
        const s = Math.min(b.w - 20, ih); x.drawImage(portrait, b.x + (b.w - s) / 2, b.y + 10 + (ih - s) / 2, s, s);
      }
      else if (imgs[p.img]) coverFit(x, imgs[p.img], b.x + 10, b.y + 10, b.w - 20, ih);
      else { x.fillStyle = '#4f9a4c'; x.fillRect(b.x + 10, b.y + 10, b.w - 20, ih); }
      if (C.decorar) C.decorar(x, p, b, ih, G);
      x.restore();
      x.fillStyle = '#10241c'; x.font = '600 22px Fredoka, sans-serif'; x.fillText(String(i + 1), b.x + 16, b.y + ih + 46);
      x.font = '400 25px "Atkinson Hyperlegible", sans-serif';
      lines.forEach((l, k) => x.fillText(l, b.x + 44, b.y + ih + 46 + k * 33));
    });
    x.fillStyle = '#a9c2b1'; x.font = '400 18px "Atkinson Hyperlegible", sans-serif';
    x.fillText('Cómic personal generado con ' + S.events.length + ' eventos reales de tu partida', 24, H - 10);
    return { target, boxes, panels };
  }

  // PDF de una página con la imagen JPEG del cómic (sin librerías externas)
  function dataUrlBytes(url) { const b = atob(url.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function buildPdf(jpegUrl, pxW, pxH) {
    const jpg = dataUrlBytes(jpegUrl);
    const ptW = 612, ptH = Math.round(612 * pxH / pxW);
    const enc = s => new TextEncoder().encode(s);
    const parts = [], offsets = [];
    let len = 0;
    const push = u => { parts.push(u); len += u.length; };
    push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
    const objs = [
      `<< /Type /Catalog /Pages 2 0 R >>`,
      `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      null,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      `<< /Title (${C.pdfTitulo || 'Mi comic'}) /Producer (${C.pdfProductor || 'Amazona Verse Engine'}) >>`,
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

  function syncComicForm() {
    $('c-title').value = S.comic.title; $('c-cover').value = S.comic.cover; $('c-layout').value = S.comic.layout;
    const panels = orderedPanels();
    $('c-panels').innerHTML = panels.map((p, i) => `<li><div class="pn">Viñeta ${i + 1}</div>
      <input id="cap-${p.id}" data-id="${p.id}" type="text" maxlength="120" aria-label="Texto de la viñeta ${i + 1}">
      <div class="pm"><button class="btn ghost sm" type="button" data-mv="-1" data-i="${i}" aria-label="Subir viñeta ${i + 1}">↑</button><button class="btn ghost sm" type="button" data-mv="1" data-i="${i}" aria-label="Bajar viñeta ${i + 1}">↓</button></div></li>`).join('');
    panels.forEach(p => { $('cap-' + p.id).value = p.text; });
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
    const inp = e.target.closest('input[data-id]'); if (!inp) return;
    const v = inp.value.trim().slice(0, 120);
    if (v) S.comic.captions[inp.dataset.id] = v; else delete S.comic.captions[inp.dataset.id];
    refreshComic(); G.guardado.autosave();
  });
  for (const id of ['c-title', 'c-cover', 'c-layout']) $(id).addEventListener('change', () => {
    S.comic.title = $('c-title').value.trim().slice(0, 32) || C.tituloDefecto || '';
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
  let lastPdfUrl = null;
  // Descargas oficiales del visor de Claude (capacidad "downloads"); fuera del visor queda en null
  let downloads = null;
  try { if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {}); } catch (e) { /* sin visor */ }
  async function offerFile(filename, blob) {
    if (!downloads) return false;
    try { await downloads.save({ filename, data: blob }); G.ui.toast('Archivo guardado'); return true; }
    catch (e) {
      if (e && e.code === 'declined') G.ui.toast('Descarga cancelada');
      else if (e && e.code === 'rate_limited') G.ui.toast('Espera un momento y vuelve a intentarlo');
      else G.ui.toast('No se pudo guardar aquí. Mantén presionada la imagen para guardarla.');
      return false;
    }
  }
  async function exportComic(format, fromUser) {
    await refreshComic();
    const cv = $('comic-canvas');
    let url, bytes;
    if (format === 'pdf') {
      const blob = buildPdf(cv.toDataURL('image/jpeg', 0.9), cv.width, cv.height);
      if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
      url = lastPdfUrl = URL.createObjectURL(blob); bytes = blob.size;
      $('c-export-img').hidden = true;
      $('c-download').href = url; $('c-download').download = FILE + '.pdf'; $('c-download').textContent = 'Descargar PDF';
      $('c-export-note').textContent = 'PDF listo. Si tu navegador no lo descarga aquí, usa Exportar PNG y guarda la imagen.';
      exportComic.lastBlob = blob;
    } else {
      url = cv.toDataURL('image/png'); bytes = url.length;
      $('c-export-img').src = url; $('c-export-img').hidden = false;
      $('c-download').href = url; $('c-download').download = FILE + '.png'; $('c-download').textContent = 'Descargar PNG';
      $('c-export-note').textContent = 'En iPhone o Android: mantén presionada la imagen y elige Guardar. En computadora: usa el enlace.';
    }
    $('c-export').hidden = false;
    $('c-download').hidden = !!downloads;
    G.eventos.log('ComicExported', { format, bytes });
    G.guardado.autosave();
    if (fromUser && downloads) {
      const blob = format === 'pdf' ? exportComic.lastBlob : await (await fetch(url)).blob();
      await offerFile(FILE + '.' + format, blob);
    }
    return url;
  }
  $('b-comic').onclick = openComic;
  $('c-close').onclick = () => { $('comic').hidden = true; if (S.complete) $('end').hidden = false; };
  $('c-refresh').onclick = refreshComic;
  $('c-png').onclick = () => exportComic('png', true);
  $('c-pdf').onclick = () => exportComic('pdf', true);
  G.on('apply', () => { $('comic').hidden = true; }, 60);

  return { capture, comicPanels, orderedPanels, comicLayout, renderComic, buildPdf, syncComicForm, moveComicPanel, openComic, refreshComic, exportComic, get lastBlob() { return exportComic.lastBlob; } };
});
