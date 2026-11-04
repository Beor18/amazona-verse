/* Álbum de las 36 · composición de la tarjeta (fondo de la región + ave + acabado) y codificación WebP.
   Lo inyecta tools/album/retratos.js en el juego, después de fondos.js y en_juego.js (que da window.AVRetratoAve: el ave tal
   como la dibuja el juego, sobre transparente). */
(function () {
  'use strict';
  function encode(cv, type, maxKB, q0) {
    let q = q0, url;
    for (; q >= 0.4; q -= 0.04) { url = cv.toDataURL(type, q); if (url.length * 0.75 / 1024 <= maxKB) break; }
    return { url, q: +q.toFixed(2), kb: +(url.length * 0.75 / 1024).toFixed(1) };
  }
  function reducir(src, w, h) { // reducción por pasos de ½ (más nítida que un solo drawImage)
    let c = src;
    while (c.width / 2 >= w) { const n = document.createElement('canvas'); n.width = c.width / 2; n.height = c.height / 2; const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n; }
    if (c.width !== w) { const n = document.createElement('canvas'); n.width = w; n.height = h; const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, h); c = n; }
    return c;
  }
  const tam = o => ({ W: o.w2 || 512, H: o.h2 || 640, SS: o.ss || 2 });
  // Tarjeta completa: fondo de la región + ave + acabado. Devuelve @2x y 1x codificadas.
  window.retrato = async function (o) {
    const { W, H, SS } = tam(o);
    const a = await window.AVRetratoAve(o, W * SS, H * SS);
    const cv = document.createElement('canvas'); cv.width = W * SS; cv.height = H * SS; const x = cv.getContext('2d');
    AVFondos.pintar(x, cv.width, cv.height, o.region, o.acento, o.semilla || 1);
    AVFondos.acabado(x, cv.width, cv.height);              // viñeta, solo sobre el fondo: el ave queda con el color del juego
    AVFondos.sombra(x, a, cv.width, cv.height);           // sombra suave del ave sobre el fondo (despega la figura)
    x.drawImage(a, 0, 0);
    const c2 = reducir(cv, W, H), c1 = reducir(c2, W / 2, H / 2);
    const t = o.formato === 'jpg' ? 'image/jpeg' : 'image/webp';
    return { x2: encode(c2, t, o.maxKB2 || 60, 0.94), x1: encode(c1, t, o.maxKB1 || 25, 0.94) };
  };
  // Silueta de las tarjetas cerradas: la misma ave, en la misma pose y encuadre, rellena de un gris liso sobre papel claro.
  // Es igual para las 36 (mismo modelo, misma pose), así que no delata la especie. Sin texto.
  window.silueta = async function (o) {
    const { W, H, SS } = tam(o);
    const a = await window.AVRetratoAve(o, W * SS, H * SS);
    const cv = document.createElement('canvas'); cv.width = W * SS; cv.height = H * SS; const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, '#eee9df'); g.addColorStop(1, '#d9d2c4');
    x.fillStyle = g; x.fillRect(0, 0, cv.width, cv.height);
    const h = x.createRadialGradient(cv.width * 0.5, cv.height * 0.34, 0, cv.width * 0.5, cv.height * 0.34, cv.width * 0.62);
    h.addColorStop(0, 'rgba(255,255,255,.55)'); h.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = h; x.fillRect(0, 0, cv.width, cv.height);
    const m = document.createElement('canvas'); m.width = cv.width; m.height = cv.height; const y = m.getContext('2d');
    y.drawImage(a, 0, 0); y.globalCompositeOperation = 'source-in';
    const f = y.createLinearGradient(0, 0, 0, cv.height); f.addColorStop(0, '#9a9fa4'); f.addColorStop(1, '#7c8186'); // #8a8f94 de media
    y.fillStyle = f; y.fillRect(0, 0, cv.width, cv.height);
    x.drawImage(m, 0, 0);
    AVFondos.acabado(x, cv.width, cv.height);
    const c2 = reducir(cv, W, H), c1 = reducir(c2, W / 2, H / 2);
    return { x2: encode(c2, 'image/webp', o.maxKB2 || 60, 0.94), x1: encode(c1, 'image/webp', o.maxKB1 || 25, 0.94) };
  };

  // Comparación (docs/img/retratos/comparacion_juego.jpg): 4 paneles con su rótulo y el verde medio del cuerpo de cada uno
  // (mediana de los píxeles verdes saturados del centro de la imagen, donde está el ave).
  const cargar = u => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('no carga')); i.src = u; });
  function verde(img, q) { // q: rectángulo [x0, y0, x1, y1] en fracciones (por defecto, el pecho del retrato)
    q = q || [0.25, 0.55, 0.75, 0.95];
    const c = document.createElement('canvas'); c.width = 512; c.height = 640; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 512, 640);
    const d = x.getImageData(Math.round(q[0] * 512), Math.round(q[1] * 640), Math.max(1, Math.round((q[2] - q[0]) * 512)), Math.max(1, Math.round((q[3] - q[1]) * 640))).data, R = [], G = [], B = [];
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (g === mx && g > 110 && (mx - mn) / mx > 0.45 && g > r * 1.25 && g > b * 1.25) { R.push(r); G.push(g); B.push(b); } }
    const med = a => { a.sort((p, q) => p - q); return a.length ? a[a.length >> 1] : 0; };
    const h = v => v.toString(16).padStart(2, '0');
    return R.length ? '#' + h(med(R)) + h(med(G)) + h(med(B)) : '—';
  }
  window.AVComparar = async function (a) {
    const P = [['En el juego (cuadro real, vibrant_toon)', a.real, a.caja], ['En el juego: misma cámara del retrato', a.juego], ['Retrato nuevo (render del juego)', a.nuevo], ['Retrato anterior (luz propia)', a.viejo]].filter(p => p[1]);
    const W = 512, H = 640, top = 54, pad = 16, cv = document.createElement('canvas');
    cv.width = P.length * W + (P.length + 1) * pad; cv.height = H + top + pad + 34; const x = cv.getContext('2d');
    x.fillStyle = '#fbf1dc'; x.fillRect(0, 0, cv.width, cv.height);
    const medidas = {};
    for (let i = 0; i < P.length; i++) {
      const img = await cargar(P[i][1]), X = pad + i * (W + pad), v = P[i][2] ? null : verde(img); if (v) medidas[P[i][0]] = v;
      x.drawImage(img, X, top, W, H);
      if (P[i][2]) { const q = P[i][2]; x.strokeStyle = '#ffd34d'; x.lineWidth = 3; x.strokeRect(X + q[0] * W - 4, top + q[1] * H - 4, (q[2] - q[0]) * W + 8, (q[3] - q[1]) * H + 8); }
      x.fillStyle = '#3b2a17'; x.font = '700 22px system-ui, sans-serif'; x.fillText(P[i][0], X, 34);
      x.font = '18px system-ui, sans-serif'; x.fillText(v ? 'verde del cuerpo ' + v : 'Vittata en el recuadro (la mide el panel de al lado)', X, top + H + 26);
      if (v && v !== '—') { x.fillStyle = v; x.fillRect(X + W - 60, top + H + 8, 60, 22); }
    }
    return { url: cv.toDataURL('image/jpeg', 0.88), medidas };
  };
  window.AVComponer = { encode, reducir };
})();
