/* Fondos del Álbum de las 36 (canvas 2D, vectorial y con semilla: el mismo fondo cada vez).
   Un fondo por región, todos con la misma receta para que el juego de 36 se vea uniforme:
   degradado de cielo · motivo lejano de la región (desenfocado, poco contraste) · halo detrás de la cabeza · bokeh de hojas.
   Regiones (agrupación visual sacada del campo «distribucion» de content/comun/especies.js; ver tools/album/README.md):
   caribe · centro (México y Centroamérica) · amazonia · andes · atlantico (bosque atlántico y sur de Sudamérica). */
window.AVFondos = (function () {
  'use strict';
  // cielo: [cenit, horizonte] (más saturado arriba, claro en el horizonte: perspectiva aérea)
  const REG = {
    caribe:   { cielo: ['#4fb8dc', '#e4f6f1'], lejos: '#7fc2b3', medio: '#3f9a86', agua: ['#56c2cf', '#1f7f99'], halo: '#fff6dc', hoja: '#2f7d62', sol: '#fff3c9' },
    centro:   { cielo: ['#f0a562', '#fdebc9'], lejos: '#d79a78', medio: '#a9785e', agua: null, halo: '#fff4dc', hoja: '#5f7d3a', sol: '#fff0c4' },
    amazonia: { cielo: ['#d9b45c', '#f7f0cf'], lejos: '#9fbf86', medio: '#6f9d62', agua: ['#efe0ad', '#c4a970'], halo: '#fffbe6', hoja: '#3f7a43', sol: '#fff6d2' },
    andes:    { cielo: ['#7493dc', '#e9edf9'], lejos: '#9fafd9', medio: '#7b8cc0', agua: null, halo: '#ffffff', hoja: '#55707a', sol: '#ffffff' },
    atlantico:{ cielo: ['#8db9cf', '#eef3ee'], lejos: '#a9c9b5', medio: '#6f9f84', agua: null, halo: '#fffbea', hoja: '#3d6f55', sol: '#fff8dc' },
  };

  function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const lin = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([k, c]) => g.addColorStop(k, c)); return g; };
  function hex(c, a) { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

  // siluetas lejanas, en coordenadas 0..1 (x a lo ancho, y desde arriba)
  function cordillera(x, W, H, base, amp, picos, r, color, nieve) {
    x.beginPath(); x.moveTo(0, H);
    const pts = []; for (let i = 0; i <= picos * 2; i++) { const u = i / (picos * 2); const alto = i % 2 ? amp * (0.6 + 0.4 * r()) : amp * (0.1 + 0.25 * r()); pts.push([u * W, (base - alto) * H]); }
    x.lineTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.lineTo(W, H); x.closePath(); x.fillStyle = color; x.fill();
    if (nieve) { x.save(); x.clip(); x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 1; i < pts.length; i += 2) { const [px, py] = pts[i]; x.beginPath(); x.moveTo(px, py); x.lineTo(px - W * 0.05, py + H * 0.045); x.lineTo(px + W * 0.05, py + H * 0.045); x.closePath(); x.fill(); } x.restore(); }
  }
  function colinas(x, W, H, base, amp, n, r, color) {
    x.beginPath(); x.moveTo(0, H); x.lineTo(0, base * H);
    for (let i = 0; i < n; i++) { const u0 = i / n, u1 = (i + 1) / n, a = amp * (0.5 + 0.5 * r()); x.quadraticCurveTo((u0 + u1) / 2 * W, (base - a * 2) * H, u1 * W, (base - amp * 0.2 * r()) * H); }
    x.lineTo(W, H); x.closePath(); x.fillStyle = color; x.fill();
  }
  function isla(x, W, H, cx, base, ancho, alto, color) {
    x.beginPath(); x.moveTo((cx - ancho / 2) * W, base * H);
    x.bezierCurveTo((cx - ancho / 4) * W, (base - alto) * H, (cx + ancho / 6) * W, (base - alto * 1.1) * H, (cx + ancho / 2) * W, base * H);
    x.closePath(); x.fillStyle = color; x.fill();
  }
  function palma(x, W, H, px, py, s, color) { // palma esbelta, solo silueta
    x.save(); x.translate(px * W, py * H); x.scale(s * W, s * W); x.fillStyle = color; x.strokeStyle = color;
    x.lineWidth = 0.035; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(0.08, -0.5, 0.02, -1); x.stroke();
    for (let k = 0; k < 7; k++) { const ang = -Math.PI / 2 + (k - 3) * 0.48; x.beginPath(); x.moveTo(0.02, -1);
      x.quadraticCurveTo(0.02 + Math.cos(ang) * 0.3, -1 + Math.sin(ang) * 0.3 - 0.08, 0.02 + Math.cos(ang) * 0.5, -1 + Math.sin(ang) * 0.5 + 0.18);
      x.quadraticCurveTo(0.02 + Math.cos(ang) * 0.28, -1 + Math.sin(ang) * 0.28 - 0.0, 0.02, -1); x.fill(); }
    x.restore();
  }
  function araucaria(x, W, H, px, py, s, color) { // pino paraná: tronco recto y copa plana en candelabro
    x.save(); x.translate(px * W, py * H); x.scale(s * W, s * W); x.fillStyle = color; x.strokeStyle = color; x.lineCap = 'round';
    x.lineWidth = 0.03; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -1); x.stroke();
    for (let k = -3; k <= 3; k++) { const bx = k * 0.09; x.lineWidth = 0.018; x.beginPath(); x.moveTo(0, -0.82); x.quadraticCurveTo(bx * 1.6, -0.92, bx * 3, -1.02 - 0.04 * (3 - Math.abs(k))); x.stroke();
      x.beginPath(); x.ellipse(bx * 3, -1.05 - 0.04 * (3 - Math.abs(k)), 0.12, 0.045, 0, 0, Math.PI * 2); x.fill(); }
    x.restore();
  }
  function copa(x, W, H, base, r, color, n) { // dosel de selva: fila de copas redondas
    x.fillStyle = color; x.beginPath(); x.moveTo(0, H); x.lineTo(0, base * H);
    for (let i = 0; i <= n; i++) { const u = i / n; x.arc(u * W, base * H, (0.05 + 0.04 * r()) * W, Math.PI, 0); }
    x.lineTo(W, H); x.closePath(); x.fill();
  }
  function volcan(x, W, H, cx, base, ancho, alto, color) {
    x.beginPath(); x.moveTo((cx - ancho / 2) * W, base * H); x.quadraticCurveTo((cx - ancho * 0.12) * W, (base - alto * 0.8) * H, (cx - ancho * 0.06) * W, (base - alto) * H);
    x.lineTo((cx + ancho * 0.06) * W, (base - alto) * H); x.quadraticCurveTo((cx + ancho * 0.12) * W, (base - alto * 0.8) * H, (cx + ancho / 2) * W, base * H); x.closePath(); x.fillStyle = color; x.fill();
  }

  function motivo(x, W, H, reg, P, r) {
    if (reg === 'caribe') {
      x.fillStyle = lin(x, 0, 0.62 * H, 0, H, [[0, P.agua[0]], [1, P.agua[1]]]); x.fillRect(0, 0.62 * H, W, 0.38 * H);
      x.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 14; i++) { const y = (0.65 + 0.3 * r()) * H, w = (0.04 + 0.1 * r()) * W; x.fillRect(r() * W, y, w, H * 0.004); }
      isla(x, W, H, 0.16, 0.625, 0.5, 0.11, P.lejos); isla(x, W, H, 0.86, 0.625, 0.42, 0.075, P.lejos);
      palma(x, W, H, 0.07, 0.6, 0.12, P.medio); palma(x, W, H, 0.13, 0.605, 0.09, P.medio); palma(x, W, H, 0.93, 0.61, 0.1, P.medio);
    } else if (reg === 'centro') {
      volcan(x, W, H, 0.2, 0.66, 0.62, 0.24, P.lejos); volcan(x, W, H, 0.84, 0.66, 0.5, 0.17, P.lejos);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(0.25 * W, 0.44 * H, 0.09 * W, 0.012 * H, 0, 0, Math.PI * 2); x.fill();
      colinas(x, W, H, 0.7, 0.05, 5, r, P.medio); copa(x, W, H, 0.82, r, hex(P.hoja, 0.45), 9);
    } else if (reg === 'amazonia') {
      copa(x, W, H, 0.62, r, P.lejos, 11);
      x.fillStyle = lin(x, 0, 0.66 * H, 0, H, [[0, P.agua[0]], [1, P.agua[1]]]);
      x.beginPath(); x.moveTo(0.62 * W, 0.635 * H); x.bezierCurveTo(1.05 * W, 0.68 * H, 0.55 * W, 0.78 * H, 0.7 * W, H); x.lineTo(1.0 * W, H); x.lineTo(W, 0.72 * H);
      x.bezierCurveTo(0.86 * W, 0.68 * H, 0.95 * W, 0.65 * H, 0.7 * W, 0.635 * H); x.closePath(); x.fill();
      copa(x, W, H, 0.9, r, hex(P.hoja, 0.4), 7);
    } else if (reg === 'andes') {
      cordillera(x, W, H, 0.62, 0.26, 4, r, P.lejos, true); cordillera(x, W, H, 0.72, 0.16, 5, r, P.medio, false);
      colinas(x, W, H, 0.84, 0.04, 4, r, hex(P.hoja, 0.35));
    } else if (reg === 'atlantico') {
      colinas(x, W, H, 0.64, 0.06, 4, r, P.lejos);
      araucaria(x, W, H, 0.09, 0.72, 0.3, P.medio); araucaria(x, W, H, 0.24, 0.69, 0.2, P.lejos); araucaria(x, W, H, 0.84, 0.71, 0.27, P.medio); araucaria(x, W, H, 0.95, 0.69, 0.18, P.lejos);
      colinas(x, W, H, 0.78, 0.04, 5, r, hex(P.hoja, 0.4));
    }
  }

  function pintar(x, W, H, reg, acento, semilla) {
    const P = REG[reg] || REG.caribe, r = rnd(semilla);
    x.fillStyle = lin(x, 0, 0, 0, H, [[0, P.cielo[0]], [0.6, P.cielo[1]], [1, P.cielo[1]]]); x.fillRect(0, 0, W, H);
    // sol de la luz clave (arriba a la izquierda, como en el render)
    let s = x.createRadialGradient(0.12 * W, 0.06 * H, 0, 0.12 * W, 0.06 * H, 0.7 * W);
    s.addColorStop(0, hex(P.sol, 0.85)); s.addColorStop(0.35, hex(P.sol, 0.3)); s.addColorStop(1, hex(P.sol, 0)); x.fillStyle = s; x.fillRect(0, 0, W, H);
    // motivo lejano: desenfocado y velado por bruma (profundidad de campo)
    x.save(); x.filter = `blur(${Math.round(W * 0.006)}px)`; x.translate(0, 0.08 * H); motivo(x, W, H, reg, P, r); x.restore(); // horizonte bajo: el motivo asoma a los lados del ave
    x.fillStyle = lin(x, 0, 0.45 * H, 0, H, [[0, hex(P.cielo[1], 0)], [0.5, hex(P.cielo[1], 0.12)], [1, hex(P.cielo[1], 0)]]); x.fillRect(0, 0, W, H);
    // halo cálido detrás de la cabeza, apenas teñido con el color propio de la especie
    let g = x.createRadialGradient(0.52 * W, 0.3 * H, 0, 0.52 * W, 0.3 * H, 0.58 * W);
    g.addColorStop(0, hex(P.halo, 0.75)); g.addColorStop(0.5, hex(P.halo, 0.3)); g.addColorStop(1, hex(P.halo, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (acento) { g = x.createRadialGradient(0.5 * W, 0.36 * H, 0.18 * W, 0.5 * W, 0.36 * H, 0.75 * W); g.addColorStop(0, hex(acento, 0)); g.addColorStop(0.6, hex(acento, 0.10)); g.addColorStop(1, hex(acento, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    // nubes suaves (desenfocadas), arriba a los lados
    x.save(); x.filter = `blur(${Math.round(W * 0.014)}px)`; x.fillStyle = 'rgba(255,255,255,.55)';
    const nube = (cx, cy, s) => { for (const [dx, dy, rr] of [[-0.9, 0.1, 0.5], [-0.3, -0.15, 0.7], [0.4, -0.05, 0.6], [1.0, 0.12, 0.45]]) { x.beginPath(); x.ellipse((cx + dx * s) * W, (cy + dy * s) * H, rr * s * W, rr * s * 0.55 * W, 0, 0, Math.PI * 2); x.fill(); } x.fillRect((cx - 1.1 * s) * W, cy * H, 2.2 * s * W, 0.12 * s * W); };
    nube(0.14, 0.2, 0.1); nube(0.9, 0.12, 0.08);
    x.restore();
  }
  function sombra(x, ave, W, H) { // sombra proyectada suave (abajo a la derecha, opuesta a la luz clave)
    x.save(); x.filter = `blur(${Math.round(W * 0.025)}px) brightness(0)`; x.globalAlpha = 0.22; x.drawImage(ave, W * 0.03, H * 0.02); x.restore();
  }
  function acabado(x, W, H) {
    const g = x.createRadialGradient(0.5 * W, 0.42 * H, 0.35 * W, 0.5 * W, 0.5 * H, 0.95 * W);
    g.addColorStop(0, 'rgba(10,30,25,0)'); g.addColorStop(1, 'rgba(10,30,25,.28)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  return { REG, pintar, sombra, acabado };
})();
