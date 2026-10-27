/* Juego · Manga Toon Story Creator (G17, prototipo de Kelvin)
   Aparte de src/game/comic.js: no lo reemplaza. Se abre con ?manga=demo o AV.manga(), sin entrada en el menú.
   Seis viñetas salen de cámaras sobre la escena real (Vittata oficial, assets/models/vittata.glb). El post manga
   (color, tinta, líneas de velocidad) se hace en este lienzo: renderer.js no se toca.
   La historia de muestra es la de COMIC_MANGA_DIRECTIVA.md § 10. Quien juega reescribe título, globos y enseñanzas.
   No pide el nombre real, no inventa cotorras y no genera imágenes con IA.
   Prueba: AV.mangaTest(). */
window.AVManga = function (G) {
  'use strict';
  const S = G.S;
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const BEATS = [
    { id: 'comienzo', es: 'EL COMIENZO', en: 'THE START', lado: 'der', modo: 'vuelo', fov: 46, cam: [-3.4, 2.2, -6.8], mira: [0.4, 1.2, 1.4], lineas: 0.9, prop: 'salida', alto: 1 },
    { id: 'camino', es: 'EL CAMINO EQUIVOCADO', en: 'THE WRONG PATH', lado: 'der', modo: 'planeo', fov: 42, cam: [5.2, 1.35, -0.4], mira: [-0.3, 1.05, 1.4], lineas: 0.15, prop: 'cruce', alto: 1 },
    { id: 'confusion', es: 'LA CONFUSIÓN', en: 'THE MIX-UP', lado: 'aba', modo: 'sorpresa', fov: 28, cam: [1.45, 1.5, 3.05], mira: [0, 1.42, 0.15], lineas: 0, prop: 'dudas', alto: 0 },
    { id: 'intento', es: 'EL NUEVO INTENTO', en: 'TRYING AGAIN', lado: 'der', modo: 'vuelo', fov: 50, cam: [-2.2, 6.2, -9.2], mira: [1.6, 1.4, 7], lineas: 0.55, prop: null, alto: 0 },
    { id: 'velocidad', es: 'MÁS VELOCIDAD', en: 'MORE SPEED', lado: 'der', modo: 'vuelo', fov: 36, cam: [3.1, 1.2, 5.2], mira: [-0.3, 1.15, -2.2], lineas: 1, prop: 'viento', alto: 1 },
    { id: 'meta', es: '¡LA META!', en: 'THE FINISH!', lado: 'der', modo: 'celeb', fov: 34, cam: [2.3, 1.65, 4.6], mira: [0, 1.2, 0.2], lineas: 0.4, prop: 'meta', alto: 1, calido: 1 },
  ];
  function muestra() {
    return {
      titulo: L('¡Me perdí, pero lo logré!', 'I got lost, but I made it!'),
      nombre: 'Vittata',
      especie: 'vittata',
      cierre: L('Seguí intentando y llegué.', 'I kept trying and I arrived.'),
      aprendi: L('Aprendí que cuando me equivoco de camino puedo regresar, mirar mejor y encontrar una ruta que funcione.', 'I learned that when I take a wrong turn I can go back, look again and find a path that works.'),
      ensenanza: L('Equivocarte de camino no significa que hayas perdido tu destino.', 'Taking a wrong turn does not mean you lost your destination.'),
      globos: [
        L('¡Hoy voy a superar mi récord!', 'Today I am going to beat my record!'),
        L('Pensé que era por aquí… ¡pero me equivoqué!', 'I thought it was this way… but I was wrong!'),
        L('¿Y ahora para dónde voy?', 'Which way do I go now?'),
        L('Voy a regresar y buscar otra ruta. ¡No me rindo!', 'I will go back and look for another path. I am not giving up!'),
        L('¡Ahora sí! Estoy volando más rápido.', 'Now yes! I am flying faster.'),
        L('¡Lo logré! Aunque me perdí, seguí intentando y llegué a la meta.', 'I made it! I got lost, I kept trying and I reached the finish.'),
      ],
      sfx: L('¡FUUUSH!', 'WHOOSH!'),
    };
  }

  let raiz = null, estilo = null, estado = null, fotos = [], retrato = null, enPrueba = false, tomando = false;

  function desvio(canvas, paso) {
    const x = canvas.getContext('2d', { willReadFrequently: true });
    let data;
    try { data = x.getImageData(0, 0, canvas.width, canvas.height).data; }
    catch (e) { return { desv: 0, colores: 0, media: 0, tinta: false }; }
    paso = paso || 16;
    let n = 0, s = 0, s2 = 0;
    const colores = new Set();
    for (let i = 0; i < data.length; i += paso * 4) {
      const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      s += y; s2 += y * y; n++;
      colores.add((data[i] >> 4) << 8 | (data[i + 1] >> 4) << 4 | (data[i + 2] >> 4));
    }
    const m = n ? s / n : 0;
    return { desv: Math.sqrt(Math.max(0, s2 / n - m * m)), colores: colores.size, media: m };
  }

  // ---------- Post manga (BG3): color tropical, posterizado leve y tinta. No es un pase de renderer.js ----------
  function tratar(origen, w, h, opt) {
    opt = opt || {};
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(origen, 0, 0, w, h);
    let img;
    try { img = x.getImageData(0, 0, w, h); }
    catch (e) { return c; }
    const d = img.data, luma = new Float32Array(w * h);
    const sat = 1.38, con = 1.14, poster = 0.38, pasos = 6;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = y + (r - y) * sat; g = y + (g - y) * sat; b = y + (b - y) * sat;
      r = (r - 0.5) * con + 0.5; g = (g - 0.5) * con + 0.5; b = (b - 0.5) * con + 0.5;
      const pr = Math.round(clamp(r, 0, 1) * pasos) / pasos;
      const pg = Math.round(clamp(g, 0, 1) * pasos) / pasos;
      const pb = Math.round(clamp(b, 0, 1) * pasos) / pasos;
      r = r * (1 - poster) + pr * poster; g = g * (1 - poster) + pg * poster; b = b * (1 - poster) + pb * poster;
      if (opt.calido) { r = Math.min(1, r * 1.08 + 0.03); g = Math.min(1, g * 1.02); b *= 0.9; }
      d[i] = clamp(r, 0, 1) * 255; d[i + 1] = clamp(g, 0, 1) * 255; d[i + 2] = clamp(b, 0, 1) * 255;
      luma[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    }
    const umbral = 36, fuerza = 0.82;
    for (let y = 1; y < h - 1; y++) {
      for (let xx = 1; xx < w - 1; xx++) {
        const i = y * w + xx;
        const gx = -luma[i - w - 1] + luma[i - w + 1] - 2 * luma[i - 1] + 2 * luma[i + 1] - luma[i + w - 1] + luma[i + w + 1];
        const gy = -luma[i - w - 1] - 2 * luma[i - w] - luma[i - w + 1] + luma[i + w - 1] + 2 * luma[i + w] + luma[i + w + 1];
        const mag = Math.hypot(gx, gy);
        if (mag > umbral) {
          const k = Math.min(1, (mag - umbral) / 70) * fuerza;
          const o = i * 4;
          d[o] *= 1 - k; d[o + 1] *= 1 - k * 0.92; d[o + 2] *= 1 - k * 0.8;
        }
      }
    }
    x.putImageData(img, 0, 0);
    if (opt.lineas) lineas(x, w, h, opt.lineas);
    return c;
  }
  function lineas(x, w, h, k) {
    x.save();
    x.globalAlpha = 0.28 * k;
    x.strokeStyle = '#f7fbff';
    x.lineWidth = 3;
    x.translate(w * 0.15, h * 0.55);
    for (let i = -8; i <= 8; i++) {
      x.beginPath();
      x.moveTo(-w, i * 18);
      x.lineTo(w * 1.2, i * 7);
      x.stroke();
    }
    x.restore();
  }
  function props(x, w, h, tipo) {
    if (!tipo) return;
    x.save();
    x.lineJoin = 'round';
    x.font = '800 28px Trebuchet MS, Segoe UI, sans-serif';
    if (tipo === 'salida') {
      x.translate(18, h - 78);
      x.fillStyle = '#c4893d'; x.strokeStyle = '#2a1a0c'; x.lineWidth = 4;
      round(x, 0, 0, 132, 48, 8); x.fill(); x.stroke();
      x.fillStyle = '#2a1a0c'; x.fillText(L('Salida', 'Exit'), 16, 33);
    } else if (tipo === 'cruce') {
      x.translate(w - 118, h - 150);
      x.fillStyle = '#8a5a32'; x.fillRect(28, 20, 10, 120);
      x.fillStyle = '#f4f7fb'; x.strokeStyle = '#1a120c'; x.lineWidth = 4;
      round(x, 0, 0, 78, 36, 6); x.fill(); x.stroke();
      x.fillStyle = '#d12626'; x.font = '900 26px Trebuchet MS, Segoe UI, sans-serif'; x.fillText('← ✕', 10, 27);
    } else if (tipo === 'dudas') {
      x.fillStyle = '#ff9a1f'; x.strokeStyle = '#2a1604'; x.lineWidth = 6;
      x.font = '900 64px Trebuchet MS, Segoe UI, sans-serif';
      x.strokeText('???', w * 0.48, 86); x.fillText('???', w * 0.48, 86);
    } else if (tipo === 'viento') {
      x.strokeStyle = '#ffe56a'; x.lineWidth = 8;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(w * 0.28 + i * 36, h * 0.62, 16 + i * 8, 0.2, 1.3); x.stroke(); }
    } else if (tipo === 'meta') {
      const bw = 150, bh = 36, bx = w - bw - 16, by = 16;
      for (let i = 0; i < 8; i++) {
        x.fillStyle = i % 2 ? '#1a120c' : '#f4f4f4';
        x.fillRect(bx + i * (bw / 8), by, bw / 8 + 1, 14);
      }
      x.fillStyle = '#7a2ea8'; x.strokeStyle = '#ffd15c'; x.lineWidth = 3;
      round(x, bx, by + 16, bw, bh, 8); x.fill(); x.stroke();
      x.fillStyle = '#fff6d4'; x.font = '800 16px Trebuchet MS, Segoe UI, sans-serif';
      x.fillText(L('TU META', 'YOUR GOAL'), bx + 28, by + 40);
    }
    x.restore();
  }
  function round(x, a, b, w, h, r) {
    x.beginPath();
    if (x.roundRect) x.roundRect(a, b, w, h, r);
    else x.rect(a, b, w, h);
  }

  // ---------- Cámaras de viñeta sobre la escena real ----------
  function baseJugador() {
    const f = S.facing || { x: 0, z: -1 };
    const len = Math.hypot(f.x, f.z) || 1;
    const fx = f.x / len, fz = f.z / len;
    return { fx, fz, rx: fz, rz: -fx, x: S.pos.x, y: S.pos.y, z: S.pos.z };
  }
  function mundo(b, p) {
    return { x: b.x + b.rx * p[0] + b.fx * p[2], y: b.y + p[1], z: b.z + b.rz * p[0] + b.fz * p[2] };
  }
  function guardarPose(P) {
    const r = P.root && P.root.rotation;
    return {
      flying: P.flying, airborne: P.airborne, wingMode: P.wingMode, speed: P.speed,
      expression: P.expression, gait: P.gait, rx: r ? r.x : 0, ry: r ? r.y : 0, rz: r ? r.z : 0,
    };
  }
  function aplicarPose(P, modo) {
    const mapa = {
      vuelo: { flying: true, airborne: true, wingMode: 'fly', speed: 14, expression: 'happy', pitch: 0.38 },
      planeo: { flying: true, airborne: true, wingMode: 'glide', speed: 9, expression: 'curious', pitch: 0.22 },
      sorpresa: { flying: false, airborne: false, wingMode: 'idle', speed: 0, expression: 'surprised', pitch: 0 },
      celeb: { flying: false, airborne: false, wingMode: 'flap', speed: 0, expression: 'happy', pitch: -0.06 },
    };
    const m = mapa[modo] || mapa.sorpresa;
    P.flying = m.flying; P.airborne = m.airborne; P.wingMode = m.wingMode; P.speed = m.speed; P.expression = m.expression; P.gait = m.speed > 4 ? 2 : 0;
    if (P.root) P.root.rotation.x = m.pitch;
    if (typeof P.update === 'function') for (let i = 0; i < 8; i++) P.update(0.06);
  }
  function restaurarPose(P, g) {
    P.flying = g.flying; P.airborne = g.airborne; P.wingMode = g.wingMode || 'idle'; P.speed = g.speed || 0;
    P.expression = g.expression || 'neutral'; P.gait = g.gait || 0;
    if (P.root) { P.root.rotation.x = g.rx; P.root.rotation.y = g.ry; P.root.rotation.z = g.rz; }
    if (typeof P.update === 'function') P.update(0.05);
  }
  function leerLienzo() {
    const src = G.renderer.canvas;
    const out = document.createElement('canvas'); out.width = 640; out.height = 400;
    const ctx = out.getContext('2d', { willReadFrequently: true });
    const sw = src.width, sh = src.height, ar = 640 / 400;
    let cw = sw, ch = sw / ar;
    if (ch > sh) { ch = sh; cw = sh * ar; }
    ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 640, 400);
    return out;
  }
  function disparar(toma, extraY) {
    const R = G.renderer, cam = R && R.camera;
    if (!R || !cam || !R.canvas || R.canvas.width < 2 || !window.THREE) return null;
    const b = baseJugador();
    const c = mundo(b, toma.cam), m = mundo(b, toma.mira);
    c.y += extraY || 0;
    if (G.terreno && G.terreno.height) {
      const suelo = G.terreno.height(c.x, c.z);
      if (c.y < suelo + 1.35) c.y = suelo + 1.35;
    }
    const fov = cam.fov;
    cam.fov = toma.fov;
    cam.updateProjectionMatrix();
    cam.position.set(c.x, c.y, c.z);
    cam.lookAt(m.x, m.y, m.z);
    cam.updateMatrixWorld(true);
    if (typeof R.drawScene === 'function') R.drawScene();
    else R.renderer.render(R.scene, cam);
    const out = leerLienzo();
    cam.fov = fov;
    cam.updateProjectionMatrix();
    return out;
  }
  function fotografiar() {
    const R = G.renderer, cam = R && R.camera, P = G.actores && G.actores.player3D;
    if (!cam) return BEATS.map(() => null);
    const pos = cam.position.clone(), quat = cam.quaternion.clone(), fov = cam.fov;
    const pose0 = P ? guardarPose(P) : null;
    const quiet0 = G.quiet;
    G.quiet = true;
    const out = [];
    try {
      for (const toma of BEATS) {
        let foto = null;
        try {
          if (P) aplicarPose(P, toma.modo);
          foto = disparar(toma, 0);
          if (!foto || desvio(foto, 32).desv < 8) {
            const otra = disparar(toma, 6);
            if (otra && (!foto || desvio(otra, 32).desv > desvio(foto, 32).desv)) foto = otra;
          }
        } catch (e) { foto = null; }
        out.push(foto);
        if (P && pose0) restaurarPose(P, pose0);
      }
    } finally {
      G.quiet = quiet0;
      cam.fov = fov; cam.updateProjectionMatrix();
      cam.position.copy(pos); cam.quaternion.copy(quat); cam.updateMatrixWorld(true);
      if (P && pose0) restaurarPose(P, pose0);
    }
    return out;
  }

  async function hacerRetrato() {
    if (!window.AVCharacter || !AVCharacter.renderPortrait) return null;
    try {
      const base = (AVCharacter.defaultLook && AVCharacter.defaultLook()) || { species: 'vittata', accessories: {} };
      try {
        const p = G.creador && G.creador.profileLook && G.creador.profileLook(S.profile);
        if (p && p.accessories) base.accessories = p.accessories;
      } catch (e) { /* look de fábrica */ }
      base.species = 'vittata';
      const src = await AVCharacter.renderPortrait(base, 512, 'Welcome');
      if (!src) return null;
      const c = document.createElement('canvas'); c.width = c.height = 512;
      c.getContext('2d').drawImage(src, 0, 0);
      return c;
    } catch (e) { return null; }
  }

  function pintarVineta(canvas, i) {
    const b = BEATS[i], x = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const foto = fotos[i];
    if (foto) {
      const t = tratar(foto, w, h, { lineas: b.lineas, calido: b.calido });
      x.clearRect(0, 0, w, h);
      x.drawImage(t, 0, 0);
    } else {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#7ec8ff'); g.addColorStop(1, '#1f8a4d');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    props(x, w, h, b.prop);
  }

  // ---------- Página ----------
  const CSS = `
#av-manga{position:fixed;inset:0;z-index:10050;overflow:auto;background:radial-gradient(120% 70% at 50% -10%,#1d8a58,#0c4a62 42%,#071826);color:#1c140c;font-family:Trebuchet MS,Segoe UI,sans-serif}
#av-manga *{box-sizing:border-box}
#av-manga .mg-marco{min-height:100%}
#av-manga .mg-hoja{width:min(960px,calc(100% - 20px));margin:14px auto 28px;background:linear-gradient(#f6e6c4,#e7d2a2 40%,#f3e0b8);border:6px solid #1a120c;border-radius:22px;padding:12px 12px 16px;box-shadow:0 18px 50px rgba(0,0,0,.38)}
#av-manga .mg-top{display:flex;gap:10px;align-items:center;background:linear-gradient(#0e5f86,#0a3e5c);border:4px solid #082433;border-radius:16px;padding:8px 10px;color:#fff}
#av-manga .mg-logo{font-weight:900;letter-spacing:.04em;line-height:1;font-size:18px;text-shadow:0 2px 0 #062033}
#av-manga .mg-logo b{color:#ffd15c}
#av-manga .mg-placa{flex:1;background:linear-gradient(#e7b86a,#b47a34);color:#3a240d;border:3px solid #4a2c10;border-radius:12px;padding:6px 10px;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}
#av-manga .mg-placa strong{display:block;font-size:20px;letter-spacing:.04em}
#av-manga .mg-placa small{font-weight:700}
#av-manga .mg-pasos{display:flex;gap:6px}
#av-manga .mg-pasos div{width:74px;text-align:center;font-size:11px;font-weight:800;line-height:1.15}
#av-manga .mg-pasos i{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;color:#fff;font-style:normal;border:2px solid #fff}
#av-manga .mg-pasos div:nth-child(1) i{background:#e23b32}#av-manga .mg-pasos div:nth-child(2) i{background:#f0a202}#av-manga .mg-pasos div:nth-child(3) i{background:#2f9e44}#av-manga .mg-pasos div:nth-child(4) i{background:#7c3aed}
#av-manga .mg-datos{display:grid;grid-template-columns:1.4fr .8fr;gap:8px;margin:8px 0}
#av-manga label{font-size:12px;font-weight:800;color:#5c3b16}
#av-manga input,#av-manga .mg-globo,#av-manga .mg-sfx,#av-manga .mg-caja p{font:700 16px/1.25 Trebuchet MS,Segoe UI,sans-serif;color:#1a120c}
#av-manga input{width:100%;border:3px solid #1a120c;border-radius:12px;padding:8px 10px;background:#fff}
#av-manga .mg-nota{margin:0 0 8px;font-size:13px;font-weight:800;color:#6a4518}
#av-manga .mg-vinetas{display:grid;grid-template-columns:1.12fr .88fr;gap:8px}
#av-manga .mg-vin{position:relative;background:#111;border:4px solid #14110e;border-radius:8px;overflow:hidden;min-height:0}
#av-manga .mg-vin canvas{width:100%;height:100%;display:block;aspect-ratio:16/10}
#av-manga .mg-vin[data-alto="1"] canvas{aspect-ratio:16/11}
#av-manga .mg-rotulo{position:absolute;left:8px;top:8px;z-index:2;background:linear-gradient(#f0c27a,#c4843a);color:#3a240d;border:3px solid #2a1a0c;border-radius:8px;padding:2px 8px;font-size:13px;font-weight:900;box-shadow:2px 2px 0 #1a1008}
#av-manga .mg-globo{position:absolute;z-index:2;max-width:62%;margin:0;background:#fff;border:3px solid #1a120c;border-radius:16px;padding:8px 10px;box-shadow:3px 3px 0 rgba(0,0,0,.25)}
#av-manga .mg-globo:focus,#av-manga input:focus,#av-manga .mg-caja p:focus,#av-manga .mg-sfx:focus{outline:3px solid #ffd15c;outline-offset:1px}
#av-manga .mg-vin[data-lado="der"] .mg-globo{right:8px;top:22%}
#av-manga .mg-vin[data-lado="aba"] .mg-globo{left:8px;bottom:10px;top:auto}
#av-manga .mg-sfx{position:absolute;left:10px;bottom:12px;z-index:2;margin:0;color:#163a8a;font:900 28px/1 Trebuchet MS,Segoe UI,sans-serif;-webkit-text-stroke:2px #fff;text-shadow:3px 3px 0 #0b1e4a}
#av-manga .mg-cierre{display:grid;grid-template-columns:1fr 150px 1fr;gap:8px;margin-top:8px;align-items:stretch}
#av-manga .mg-caja{background:linear-gradient(#fffaf0,#f3e2c0);border:4px solid #8a5a28;border-radius:14px;padding:8px 10px;box-shadow:3px 3px 0 rgba(90,50,10,.25)}
#av-manga .mg-caja h3{margin:0 0 4px;font-size:16px;color:#6a3e12}
#av-manga .mg-caja p{margin:0;min-height:72px;background:transparent}
#av-manga .mg-hero{background:radial-gradient(circle at 50% 40%,#b7e38a,#2f8f4e 70%,#1c5c38);border:4px solid #1a120c;border-radius:16px;display:grid;place-items:center;min-height:140px}
#av-manga .mg-hero canvas{width:130px;height:130px}
#av-manga .mg-cierre-txt{grid-column:1 / -1;margin:0;font-weight:800;text-align:center}
#av-manga .mg-botones{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
#av-manga .mg-botones button,#av-manga .mg-volver{border:0;border-radius:12px;color:#fff;font:800 14px/1.2 Trebuchet MS,Segoe UI,sans-serif;min-height:48px;padding:8px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.25)}
#av-manga .mg-b1,#av-manga .mg-b2{background:#2f6fe0}#av-manga .mg-b3{background:#1faa4a}#av-manga .mg-b4{background:#7c3aed}
#av-manga .mg-volver{position:sticky;top:8px;float:right;background:#123;margin:0 0 8px 8px;min-height:40px;padding:8px 12px}
#av-manga.mg-movil{background:#041018}
#av-manga.mg-movil .mg-marco{width:375px;height:812px;min-height:0;max-height:812px;margin:10px auto;overflow:hidden;display:flex;flex-direction:column;background:#083048;box-shadow:0 0 0 10px #111;border-radius:28px}
#av-manga.mg-movil .mg-volver{float:none;align-self:flex-end;flex:none}
#av-manga.mg-movil .mg-hoja{width:auto;max-width:none;flex:1;min-height:0;overflow:auto;margin:0 8px 8px;border-width:4px;padding:8px}
#av-manga.mg-movil .mg-top{flex-wrap:wrap}
#av-manga.mg-movil .mg-pasos{width:100%;justify-content:space-between}
#av-manga.mg-movil .mg-pasos div{width:58px;font-size:10px}
#av-manga.mg-movil .mg-datos,#av-manga.mg-movil .mg-vinetas,#av-manga.mg-movil .mg-cierre{grid-template-columns:1fr}
#av-manga.mg-movil .mg-hero{min-height:120px}
#av-manga.mg-movil .mg-botones{grid-template-columns:1fr 1fr}
@media(max-width:420px){
#av-manga .mg-pasos div span{display:none}
#av-manga .mg-datos,#av-manga .mg-vinetas,#av-manga .mg-cierre{grid-template-columns:1fr}
#av-manga .mg-botones{grid-template-columns:1fr 1fr}
#av-manga .mg-top{flex-wrap:wrap}
}`;

  function leerCampo(el, max) {
    const t = (el.innerText != null && el.tagName !== 'INPUT' ? el.innerText : el.value).replace(/\s+/g, ' ').trim().slice(0, max);
    return t;
  }
  function atar(el, poner, max) {
    const ev = () => poner(leerCampo(el, max));
    el.addEventListener('input', ev);
    return ev;
  }
  function montar() {
    estado = muestra();
    if (estilo) estilo.remove();
    estilo = document.createElement('style'); estilo.id = 'av-manga-css'; estilo.textContent = CSS;
    document.head.appendChild(estilo);
    raiz = document.createElement('div'); raiz.id = 'av-manga';
    const pasos = [
      L('Escribe tu historia', 'Write your story'),
      L('Elige tus escenas', 'Pick your scenes'),
      L('Diseña tu cómic', 'Design your comic'),
      L('Descarga y comparte', 'Download and share'),
    ];
    const vinetas = BEATS.map((b, i) => `<article class="mg-vin" data-i="${i}" data-lado="${b.lado}" data-alto="${b.alto}">
      <canvas width="640" height="400"></canvas>
      <b class="mg-rotulo"><span>${i + 1}</span> ${esc(L(b.es, b.en))}</b>
      <p class="mg-globo" contenteditable="true" role="textbox" aria-label="${esc(L('Globo de la viñeta ' + (i + 1), 'Balloon of panel ' + (i + 1)))}"></p>
      ${b.prop === 'viento' ? `<p class="mg-sfx" contenteditable="true" role="textbox" aria-label="${esc(L('Onomatopeya', 'Sound effect'))}"></p>` : ''}
    </article>`).join('');
    raiz.innerHTML = `<div class="mg-marco"><button type="button" class="mg-volver">${esc(L('Volver al juego', 'Back to the game'))}</button>
      <div class="mg-hoja">
        <header class="mg-top">
          <div class="mg-logo">AMAZONA<br><b>VERSE</b></div>
          <div class="mg-placa"><strong>${esc(L('CREA TU CÓMIC', 'MAKE YOUR COMIC'))}</strong><small>${esc(L('Cuenta tu aventura con tus propias palabras', 'Tell your adventure in your own words'))}</small></div>
          <div class="mg-pasos">${pasos.map((t, i) => `<div><i>${i + 1}</i><span>${esc(t)}</span></div>`).join('')}</div>
        </header>
        <div class="mg-datos">
          <label>${esc(L('Título de mi aventura', 'Title of my adventure'))}<input id="mg-titulo" maxlength="60" autocomplete="off"></label>
          <label>${esc(L('Nombre de tu cotorra', 'Your parrot\'s name'))}<input id="mg-cotorra" maxlength="24" autocomplete="off" aria-label="${esc(L('Nombre de tu cotorra', 'Your parrot\'s name'))}"></label>
        </div>
        <p class="mg-nota">${esc(L('Muestra con escenas del juego. Tú escribes lo que pasó. Cotorra oficial: Vittata.', 'A sample made from game scenes. You write what happened. Official parrot: Vittata.'))}</p>
        <div class="mg-vinetas">${vinetas}</div>
        <section class="mg-cierre">
          <article class="mg-caja"><h3>📖 ${esc(L('¿Qué aprendí?', 'What did I learn?'))}</h3><p id="mg-aprendi" contenteditable="true" role="textbox" aria-label="${esc(L('¿Qué aprendí?', 'What did I learn?'))}"></p></article>
          <div class="mg-hero"><canvas id="mg-hero" width="512" height="512"></canvas></div>
          <article class="mg-caja"><h3>☀ ${esc(L('Mi enseñanza de vida', 'My life lesson'))}</h3><p id="mg-vida" contenteditable="true" role="textbox" aria-label="${esc(L('Mi enseñanza de vida', 'My life lesson'))}"></p></article>
          <p class="mg-cierre-txt" id="mg-cierre" contenteditable="true" role="textbox" aria-label="${esc(L('Cierre', 'Ending'))}"></p>
        </section>
        <div class="mg-botones">
          <button type="button" class="mg-b1">${esc(L('Ver mis escenas', 'See my scenes'))}</button>
          <button type="button" class="mg-b2">${esc(L('Editar mi cómic', 'Edit my comic'))}</button>
          <button type="button" class="mg-b3">${esc(L('Descargar PNG', 'Download PNG'))}</button>
          <button type="button" class="mg-b4">${esc(L('Compartir (con permisos)', 'Share (with permission)'))}</button>
          <button type="button" class="mg-b2 mg-vista">${esc(L('Vista móvil', 'Phone view'))}</button>
        </div>
      </div></div>`;
    document.body.appendChild(raiz);
    const q = s => raiz.querySelector(s);
    q('#mg-titulo').value = estado.titulo;
    q('#mg-cotorra').value = estado.nombre;
    q('#mg-aprendi').textContent = estado.aprendi;
    q('#mg-vida').textContent = estado.ensenanza;
    q('#mg-cierre').textContent = estado.cierre;
    raiz.querySelectorAll('.mg-globo').forEach((el, i) => { el.textContent = estado.globos[i]; });
    const sfx = q('.mg-sfx'); if (sfx) sfx.textContent = estado.sfx;
    atar(q('#mg-titulo'), v => { estado.titulo = v; }, 60);
    atar(q('#mg-cotorra'), v => { estado.nombre = v || 'Vittata'; }, 24);
    atar(q('#mg-aprendi'), v => { estado.aprendi = v; }, 240);
    atar(q('#mg-vida'), v => { estado.ensenanza = v; }, 180);
    atar(q('#mg-cierre'), v => { estado.cierre = v; }, 120);
    raiz.querySelectorAll('.mg-globo').forEach((el, i) => atar(el, v => { estado.globos[i] = v; }, 160));
    if (sfx) atar(sfx, v => { estado.sfx = v; }, 24);
    q('.mg-volver').addEventListener('click', () => cerrar());
    q('.mg-b1').addEventListener('click', () => { if (!tomando) refrescar(); raiz.querySelector('.mg-vinetas').scrollIntoView({ block: 'nearest' }); });
    q('.mg-b2').addEventListener('click', () => q('#mg-titulo').focus());
    q('.mg-b3').addEventListener('click', () => descargar());
    q('.mg-b4').addEventListener('click', () => compartir().catch(() => {}));
    q('.mg-vista').addEventListener('click', () => movil(!raiz.classList.contains('mg-movil')));
    BEATS.forEach((_, i) => pintarVineta(q(`.mg-vin[data-i="${i}"] canvas`), i));
  }
  function volcarRetrato() {
    const c = raiz && raiz.querySelector('#mg-hero'); if (!c) return;
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    if (retrato) x.drawImage(retrato, 0, 0, c.width, c.height);
    else if (fotos[5]) x.drawImage(fotos[5], 80, 40, 360, 280, 0, 0, c.width, c.height);
  }
  async function refrescar() {
    if (tomando) return;
    tomando = true;
    try { fotos = fotografiar(); }
    finally { tomando = false; }
    if (!raiz) return;
    BEATS.forEach((_, i) => pintarVineta(raiz.querySelector(`.mg-vin[data-i="${i}"] canvas`), i));
    volcarRetrato();
  }
  async function abrir() {
    if (raiz && document.body.contains(raiz)) return api;
    montar();
    await refrescar();
    retrato = await hacerRetrato();
    if (raiz) volcarRetrato();
    return api;
  }
  function cerrar() {
    if (raiz) { raiz.remove(); raiz = null; }
    if (estilo) { estilo.remove(); estilo = null; }
    fotos = []; retrato = null;
  }
  function movil(on) { if (raiz) raiz.classList.toggle('mg-movil', !!on); return !!(raiz && raiz.classList.contains('mg-movil')); }

  // ---------- PNG ----------
  function envolver(ctx, texto, max, fuente) {
    ctx.font = fuente;
    const palabras = String(texto || '').split(/\s+/), lineas = [];
    let linea = '';
    for (const p of palabras) {
      const t = linea ? linea + ' ' + p : p;
      if (ctx.measureText(t).width > max && linea) { lineas.push(linea); linea = p; }
      else linea = t;
    }
    if (linea) lineas.push(linea);
    return lineas.slice(0, 6);
  }
  function globo(ctx, texto, x, y, w) {
    const fuente = '700 26px Trebuchet MS, Segoe UI, sans-serif';
    const lineas = envolver(ctx, texto, w - 28, fuente);
    const h = 22 + lineas.length * 32;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a120c'; ctx.lineWidth = 4;
    round(ctx, x, y, w, h, 16); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 28, y + h); ctx.lineTo(x + 18, y + h + 16); ctx.lineTo(x + 52, y + h - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a120c'; ctx.font = fuente; ctx.textBaseline = 'top';
    lineas.forEach((ln, i) => ctx.fillText(ln, x + 14, y + 12 + i * 32));
    ctx.textBaseline = 'alphabetic';
    return h;
  }
  function pngSync() {
    const W = 1080, m = 36, gap = 14;
    const fila = [340, 310, 350];
    const header = 150, tituloH = 96, pie = 280, bot = 88;
    const H = m + header + 12 + tituloH + 8 + fila[0] + fila[1] + fila[2] + gap * 2 + 12 + pie + 12 + bot + m;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const cielo = x.createLinearGradient(0, 0, 0, H);
    cielo.addColorStop(0, '#148255'); cielo.addColorStop(0.45, '#0c4e68'); cielo.addColorStop(1, '#071826');
    x.fillStyle = cielo; x.fillRect(0, 0, W, H);
    x.fillStyle = '#f4e2bf'; round(x, 24, 24, W - 48, H - 48, 24); x.fill();
    x.strokeStyle = '#1a120c'; x.lineWidth = 8; x.stroke();
    x.fillStyle = '#0e5f86'; round(x, 40, 40, W - 80, header - 20, 16); x.fill();
    x.fillStyle = '#fff'; x.font = '900 28px Trebuchet MS, Segoe UI, sans-serif'; x.fillText('AMAZONA VERSE', 58, 88);
    x.fillStyle = '#e7b86a'; round(x, 340, 56, 420, 78, 12); x.fill();
    x.fillStyle = '#3a240d'; x.font = '900 28px Trebuchet MS, Segoe UI, sans-serif';
    x.fillText(L('CREA TU CÓMIC', 'MAKE YOUR COMIC'), 360, 92);
    x.font = '800 18px Trebuchet MS, Segoe UI, sans-serif';
    x.fillText(estado.titulo || '', 360, 118);
    let y = 40 + header + 8;
    x.fillStyle = '#fff'; x.strokeStyle = '#1a120c'; x.lineWidth = 4;
    round(x, 48, y, 640, 72, 12); x.fill(); x.stroke();
    round(x, 704, y, 320, 72, 12); x.fill(); x.stroke();
    x.fillStyle = '#1a120c'; x.font = '800 22px Trebuchet MS, Segoe UI, sans-serif';
    x.fillText(L('Título: ', 'Title: ') + (estado.titulo || ''), 64, y + 44);
    x.fillText(L('Cotorra: ', 'Parrot: ') + (estado.nombre || 'Vittata'), 720, y + 44);
    y += tituloH;
    const colW = [560, 420];
    const ix = [48, 48 + colW[0] + gap];
    for (let i = 0; i < 6; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const pw = col === 0 ? colW[0] : colW[1], ph = fila[row];
      const px = ix[col], py = y + (row === 0 ? 0 : fila[0] + gap + (row === 2 ? fila[1] + gap : 0));
      const cv = raiz && raiz.querySelector(`.mg-vin[data-i="${i}"] canvas`);
      x.save(); round(x, px, py, pw, ph, 8); x.clip();
      if (cv) x.drawImage(cv, px, py, pw, ph);
      x.restore();
      x.strokeStyle = '#14110e'; x.lineWidth = 6; round(x, px, py, pw, ph, 8); x.stroke();
      x.fillStyle = '#e7b86a'; round(x, px + 10, py + 10, Math.min(280, pw - 24), 32, 8); x.fill();
      x.fillStyle = '#3a240d'; x.font = '800 16px Trebuchet MS, Segoe UI, sans-serif';
      x.fillText((i + 1) + '  ' + L(BEATS[i].es, BEATS[i].en), px + 18, py + 32);
      const gw = Math.min(300, pw - 24);
      globo(x, estado.globos[i], px + pw - gw - 12, py + 52, gw);
      if (i === 4 && estado.sfx) {
        x.font = '900 42px Trebuchet MS, Segoe UI, sans-serif'; x.lineWidth = 6;
        x.strokeStyle = '#fff'; x.strokeText(estado.sfx, px + 16, py + ph - 28);
        x.fillStyle = '#163a8a'; x.fillText(estado.sfx, px + 16, py + ph - 28);
      }
    }
    y += fila[0] + fila[1] + fila[2] + gap * 2 + 16;
    function ficha(px, titulo, texto) {
      x.fillStyle = '#fff8ec'; x.strokeStyle = '#8a5a28'; x.lineWidth = 5;
      round(x, px, y, 420, pie - 20, 14); x.fill(); x.stroke();
      x.fillStyle = '#6a3e12'; x.font = '900 22px Trebuchet MS, Segoe UI, sans-serif';
      x.fillText(titulo, px + 16, y + 36);
      x.fillStyle = '#1a120c'; x.font = '700 20px Trebuchet MS, Segoe UI, sans-serif';
      envolver(x, texto, 388, x.font).forEach((ln, i) => x.fillText(ln, px + 16, y + 72 + i * 28));
    }
    ficha(48, L('¿Qué aprendí?', 'What did I learn?'), estado.aprendi);
    ficha(612, L('Mi enseñanza de vida', 'My life lesson'), estado.ensenanza);
    const hero = raiz && raiz.querySelector('#mg-hero');
    if (hero) {
      x.fillStyle = '#2f8f4e'; round(x, 480, y + 40, 120, 160, 16); x.fill();
      x.drawImage(hero, 490, y + 50, 100, 100);
    }
    x.fillStyle = '#1a120c'; x.font = '800 20px Trebuchet MS, Segoe UI, sans-serif'; x.textAlign = 'center';
    x.fillText((estado.cierre || '') + '  ·  ' + (estado.nombre || 'Vittata'), W / 2, y + pie - 8);
    x.textAlign = 'left';
    x.font = '700 16px Trebuchet MS, Segoe UI, sans-serif'; x.fillStyle = '#5c3b16';
    x.fillText(L('Muestra con escenas del juego. El nombre es el de tu cotorra.', 'Sample from game scenes. The name is your parrot\'s.'), 48, H - 40);
    return c;
  }
  function blobDe(canvas) {
    return new Promise(res => {
      if (canvas.toBlob) canvas.toBlob(b => res(b), 'image/png');
      else {
        try {
          const u = canvas.toDataURL('image/png').split(',')[1];
          const bin = atob(u), arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          res(new Blob([arr], { type: 'image/png' }));
        } catch (e) { res(null); }
      }
    });
  }
  async function png() {
    if (!raiz) await abrir();
    const c = pngSync();
    const blob = await blobDe(c);
    return { blob, w: c.width, h: c.height, canvas: c };
  }
  async function descargar() {
    const { blob } = await png();
    if (!blob) return 'vacio';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'amazona-verse-manga.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'descargado';
  }
  async function asegurarRecords() {
    if (G.recordsApi && G.recordsApi.puerta) return G.recordsApi;
    if (!window.AVE || !AVE.assets || !AVE.assets.script || !window.AVRecords) return null;
    try { await AVE.assets.script('src/game/records.js'); if (!G.recordsApi) window.AVRecords(G); }
    catch (e) { return null; }
    return G.recordsApi || null;
  }
  async function compartir(o) {
    o = o || {};
    const { blob } = await png();
    if (!blob) return 'vacio';
    let puerta = o.puerta;
    if (!puerta) {
      const rec = await asegurarRecords();
      puerta = rec && rec.puerta;
    }
    if (!puerta) return 'sin-puerta';
    if (!(await puerta(o))) return 'puerta';
    if (G.recordsApi && G.recordsApi.compartirArchivo && !o.puerta) return G.recordsApi.compartirArchivo(blob, 'amazona-verse-manga.png', { titulo: estado.titulo });
    return 'listo';
  }

  async function verificarPNG(blob, w, h) {
    if (!blob || blob.size < 64) return { ok: false, bytes: blob ? blob.size : 0 };
    const b = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
    const firma = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
    const ancho = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
    const alto = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
    return { ok: firma && ancho === w && alto === h, firma, ancho, alto, bytes: blob.size };
  }

  function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const cam = G.renderer && G.renderer.camera;
    const pos0 = cam ? cam.position.clone() : null;
    const nEv = (S.events && S.events.length) || 0;
    const posJ = S.pos ? { x: S.pos.x, y: S.pos.y, z: S.pos.z } : null;
    enPrueba = true;
    return (async () => {
      try {
        check('El cómic publicado sigue siendo comic.js', !!(G.comic && G.comic.exportComic && G.comic.comicLayout) && typeof G.comic.exportComic === 'function');
        const lay = G.comic && G.comic.comicLayout && G.comic.comicLayout(4, 'grid', 1080, 1520, 380);
        check('La cuadrícula del cómic anterior no cambió', lay && lay.length === 4 && lay[0].w > 0);
        await abrir();
        check('La página de muestra está abierta y no está en el menú de modos', !!raiz && !!document.getElementById('av-manga') && !document.querySelector('#title [data-manga], .modo-manga, [data-modo="manga"]'));
        check('Hay 6 viñetas', raiz.querySelectorAll('.mg-vin').length === 6 && fotos.length === 6);
        const reales = fotos.filter(f => f && desvio(f, 24).desv >= 8);
        check('Las 6 tomas son escenas del juego (no un lienzo plano)', reales.length === 6, reales.length + '/6');
        BEATS.forEach((_, i) => {
          const cv = raiz.querySelector(`.mg-vin[data-i="${i}"] canvas`);
          const d = cv && desvio(cv, 20);
          if (i === 0) check('La viñeta tratada tiene tinta y color (no es el cómic de cuadrícula plana)', d && d.desv > 12 && d.colores > 12, d ? 'desv ' + d.desv.toFixed(0) + ' · ' + d.colores : 'sin');
        });
        const hero = raiz.querySelector('#mg-hero');
        const dh = hero && desvio(hero, 8);
        check('El retrato del centro es la Vittata oficial (o su toma)', dh && dh.desv > 6, dh ? dh.desv.toFixed(0) : 'sin');
        check('La especie del prototipo es vittata', estado.especie === 'vittata');
        const texto = raiz.innerText || '';
        check('No pide el nombre real', !/nombre real|apellido|tu nombre completo/i.test(texto) && raiz.querySelector('#mg-cotorra').getAttribute('autocomplete') === 'off');
        const titulo = raiz.querySelector('#mg-titulo');
        titulo.value = 'Mi propia meta'; titulo.dispatchEvent(new Event('input', { bubbles: true }));
        check('El título se edita', estado.titulo === 'Mi propia meta');
        const g0 = raiz.querySelector('.mg-globo');
        g0.textContent = 'Yo decido el globo'; g0.dispatchEvent(new Event('input', { bubbles: true }));
        check('El globo se edita', estado.globos[0] === 'Yo decido el globo');
        check('Están las dos enseñanzas', !!raiz.querySelector('#mg-aprendi') && !!raiz.querySelector('#mg-vida') && /Qué aprendí|What did I learn/.test(texto) && /enseñanza de vida|life lesson/i.test(texto));
        movil(true);
        const marco = raiz.querySelector('.mg-marco');
        const caja = marco.getBoundingClientRect();
        const hoja = raiz.querySelector('.mg-hoja');
        check('La vista móvil mide 375×812', Math.round(caja.width) === 375 && Math.round(caja.height) === 812, Math.round(caja.width) + '×' + Math.round(caja.height));
        check('La hoja cabe en el ancho del móvil', hoja.scrollWidth <= hoja.clientWidth + 2, 'scroll ' + hoja.scrollWidth + '/' + hoja.clientWidth);
        movil(false);
        const img = await png();
        const ver = await verificarPNG(img.blob, img.w, img.h);
        check('El PNG mide lo que declara y trae la firma', ver.ok, (ver.ancho || 0) + '×' + (ver.alto || 0) + ' · ' + (ver.bytes || 0));
        const est = desvio(img.canvas, 40);
        check('El PNG no está en blanco', est.desv > 20 && est.colores > 20, 'desv ' + est.desv.toFixed(0) + ' · ' + est.colores);
        const puerta = await compartir({ puerta: () => Promise.resolve(false) });
        check('Sin la puerta de adultos no se comparte', puerta === 'puerta');
        check('Fotografiar no inventa eventos ni mueve a Vittata', (S.events ? S.events.length : 0) === nEv && posJ && Math.abs(S.pos.x - posJ.x) < 0.001 && Math.abs(S.pos.z - posJ.z) < 0.001);
        check('La cámara del juego vuelve a su sitio', pos0 && cam.position.distanceTo(pos0) < 0.05, cam && pos0 ? cam.position.distanceTo(pos0).toFixed(3) : 'sin');
        if (o.dejarAbierto) check('Se dejó abierto para la captura', true);
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally {
        enPrueba = false;
        if (!o.dejarAbierto) cerrar();
        if (cam && pos0) { cam.position.copy(pos0); cam.updateMatrixWorld(true); }
      }
      return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
    })();
  }

  const api = { abrir, cerrar, movil, png, compartir, fotografiar, test, get estado() { return estado; }, get fotos() { return fotos; } };
  return api;
};
