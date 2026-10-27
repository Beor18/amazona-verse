/* Juego · Manga Toon Story Creator (G17d, prototipo de Kelvin)
   Aparte de src/game/comic.js: no lo reemplaza. Se abre con ?manga=demo o AV.manga(), sin entrada en el menú.
   La interfaz sigue docs/img/referencia_manga_toon.webp. Las viñetas componen láminas de Blender
   (tools/blender/manga_laminas.py) del modelo oficial assets/models/vittata.glb: cel shading, contorno,
   poses de vuelo y fondos del mapa (selva, ruinas, cascada, mar y río). Globos, onomatopeyas,
   estela y líneas de velocidad se dibujan en este lienzo.
   renderer.js no se toca. No pide el nombre real, no inventa cotorras y no genera imágenes con IA.
   Prueba: AV.mangaTest(). */
window.AVManga = function (G) {
  'use strict';
  const S = G.S;
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BEATS = [
    { id: 'comienzo', es: 'EL COMIENZO', en: 'THE START', lado: 'der', modo: 'vuelo', fov: 42, quiere: 0.36, lineas: 0, radial: 1, prop: 'salida', alto: 1 },
    { id: 'camino', es: 'EL CAMINO EQUIVOCADO', en: 'THE WRONG PATH', lado: 'der', modo: 'planeo', fov: 48, quiere: 0.26, lineas: 0.1, prop: 'cruce', alto: 1, pensar: 1 },
    { id: 'confusion', es: 'LA CONFUSIÓN', en: 'THE MIX-UP', lado: 'aba', modo: 'sorpresa', fov: 26, quiere: 0.62, lineas: 0, prop: 'dudas', alto: 0 },
    { id: 'intento', es: 'EL NUEVO INTENTO', en: 'TRYING AGAIN', lado: 'der', modo: 'vuelo', fov: 52, quiere: 0.18, lineas: 0.3, prop: null, alto: 0 },
    { id: 'velocidad', es: 'MÁS VELOCIDAD', en: 'MORE SPEED', lado: 'der', modo: 'vuelo', fov: 38, quiere: 0.42, lineas: 0, radial: 1, prop: 'viento', alto: 1 },
    { id: 'meta', es: '¡LA META!', en: 'THE FINISH!', lado: 'der', modo: 'celeb', fov: 36, quiere: 0.4, lineas: 0.2, prop: 'meta', alto: 1, calido: 1 },
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

  const LAMINAS = [
    'assets/manga/laminas/01_comienzo.jpg',
    'assets/manga/laminas/02_camino.jpg',
    'assets/manga/laminas/03_confusion.jpg',
    'assets/manga/laminas/04_intento.jpg',
    'assets/manga/laminas/05_velocidad.jpg',
    'assets/manga/laminas/06_meta.jpg',
  ];
  const HERO = 'assets/manga/laminas/07_hero.jpg';
  let raiz = null, estilo = null, estado = null, fotos = [], retrato = null, hero = null, enPrueba = false, tomando = false, camDelta = null;

  function cargarLamina(url) {
    return new Promise(resolve => {
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas');
        c.width = 960; c.height = 600;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(im, 0, 0, 960, 600);
        resolve(c);
      };
      im.onerror = () => resolve(null);
      im.src = url;
    });
  }

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

  function lineasRadiales(x, w, h) {
    x.save();
    x.translate(w * 0.5, h * 0.46);
    x.lineCap = 'round';
    const n = 20;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.08;
      const hueco = Math.min(w, h) * (0.24 + (i % 3) * 0.025);
      const largo = Math.max(w, h);
      x.strokeStyle = i % 2 ? '#ffffff' : '#e7f7ff';
      x.globalAlpha = 0.92;
      x.lineWidth = i % 4 === 0 ? 7 : 3;
      x.beginPath();
      x.moveTo(Math.cos(a) * hueco, Math.sin(a) * hueco);
      x.lineTo(Math.cos(a) * largo, Math.sin(a) * largo);
      x.stroke();
    }
    x.restore();
  }
  function estela(x, w, h, fuerte) {
    x.save();
    x.translate(w * 0.16, h * 0.64);
    x.strokeStyle = '#ffe14a';
    x.lineWidth = fuerte ? 9 : 6;
    x.lineCap = 'round';
    x.globalAlpha = 0.95;
    const n = fuerte ? 4 : 3;
    for (let i = 0; i < n; i++) {
      x.beginPath();
      x.arc(i * 44, -i * 5, 13 + i * 8, -0.15, 1.2);
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
  function solido(x, y, z) {
    const SO = G.solidos;
    if (!SO || !SO.dentro || !SO.activo) return false;
    try { return SO.dentro(x, z, y) > -Infinity; } catch (e) { return false; }
  }
  function tapa(c, px, py, pz) {
    const dx = px - c.x, dy = py - c.y, dz = pz - c.z;
    for (let i = 1; i <= 8; i++) {
      const t = i / 10;
      if (solido(c.x + dx * t, c.y + dy * t, c.z + dz * t)) return true;
    }
    return false;
  }
  // Elige un punto libre, con Vittata en cuadro y sin un techo entre la lente y ella. Una sola foto por viñeta.
  function elegirToma(cam, b, toma) {
    const quiere = toma.quiere || 0.32;
    const pecho = { x: b.x, y: b.y + 1.15, z: b.z };
    const radios = toma.modo === 'sorpresa' ? [2.2, 3, 4] : [5.5, 8, 11];
    const altos = toma.modo === 'sorpresa' ? [1.25, 1.6, 2.1] : [2.4, 4.2, 6.5];
    const angs = [0.4, -0.5, 1.1, -1.2, 2.2, 3.14, 0];
    let mejor = null, nota = -1e9;
    cam.fov = toma.fov;
    cam.updateProjectionMatrix();
    for (const r of radios) for (const alt of altos) for (const a of angs) {
      const off = [Math.sin(a) * r, alt, Math.cos(a) * r];
      const c = mundo(b, off);
      if (G.terreno && G.terreno.height) {
        const suelo = G.terreno.height(c.x, c.z);
        if (c.y < suelo + 1.4) c.y = suelo + 1.4;
      }
      if (solido(c.x, c.y, c.z) || tapa(c, pecho.x, pecho.y, pecho.z)) continue;
      cam.position.set(c.x, c.y, c.z);
      cam.lookAt(pecho.x, pecho.y, pecho.z);
      cam.updateMatrixWorld(true);
      const pies = new THREE.Vector3(b.x, b.y + 0.15, b.z).project(cam);
      const cabeza = new THREE.Vector3(b.x, b.y + 1.7, b.z).project(cam);
      if (pies.z <= 0 || pies.z >= 1 || cabeza.z <= 0 || cabeza.z >= 1) continue;
      const cx = (pies.x + cabeza.x) / 2, cy = (pies.y + cabeza.y) / 2;
      if (Math.abs(cx) > 0.72 || Math.abs(cy) > 0.72) continue;
      const alto = Math.abs(cabeza.y - pies.y);
      if (alto < 0.08) continue;
      const dx = c.x - b.x, dz = c.z - b.z;
      const frente = (dx * b.fx + dz * b.fz) / (Math.hypot(dx, dz) || 1);
      const cara = toma.modo === 'sorpresa' || toma.modo === 'celeb' ? 0.55 : 0.18;
      const p = 1 - Math.abs(alto - quiere) - Math.abs(cx) * 0.15 - Math.abs(cy) * 0.1 + frente * cara;
      if (p > nota) { nota = p; mejor = { x: c.x, y: c.y, z: c.z }; }
    }
    return mejor;
  }
  function fotografiar() {
    const R = G.renderer, cam = R && R.camera, P = G.actores && G.actores.player3D;
    if (!cam || !window.THREE || !R.canvas || R.canvas.width < 2) return BEATS.map(() => null);
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
          const b = baseJugador();
          const sitio = elegirToma(cam, b, toma);
          const pechoY = b.y + 1.15;
          if (sitio) {
            cam.fov = toma.fov;
            cam.updateProjectionMatrix();
            cam.position.set(sitio.x, sitio.y, sitio.z);
            cam.lookAt(b.x, pechoY, b.z);
            cam.updateMatrixWorld(true);
          }
          if (typeof R.drawScene === 'function') R.drawScene();
          else R.renderer.render(R.scene, cam);
          foto = leerLienzo();
        } catch (e) { foto = null; }
        out.push(foto);
        if (P && pose0) restaurarPose(P, pose0);
      }
    } finally {
      G.quiet = quiet0;
      cam.fov = fov; cam.updateProjectionMatrix();
      cam.position.copy(pos); cam.quaternion.copy(quat); cam.updateMatrixWorld(true);
      if (P && pose0) restaurarPose(P, pose0);
      camDelta = cam.position.distanceTo(pos);
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
    x.clearRect(0, 0, w, h);
    if (foto) x.drawImage(foto, 0, 0, w, h);
    else {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1a6fe0'); g.addColorStop(0.55, '#19a8c4'); g.addColorStop(1, '#0e7a38');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    if (b.radial) {
      lineasRadiales(x, w, h);
      estela(x, w, h, b.id === 'velocidad');
    }
    props(x, w, h, b.prop);
  }

  // ---------- Página ----------
  const CSS = `
#av-manga{position:fixed;inset:0;z-index:10050;overflow:auto;background:
  radial-gradient(ellipse at 12% 0%, #ffe56a 0 28px, transparent 70px),
  radial-gradient(circle at 2% 18%, #146b32 0 110px, transparent 112px),
  radial-gradient(circle at 0 48%, #0c4e28 0 160px, transparent 162px),
  radial-gradient(circle at 100% 8%, #1a7a3a 0 140px, transparent 142px),
  radial-gradient(circle at 98% 42%, #0d5c40 0 120px, transparent 122px),
  radial-gradient(circle at 8% 92%, #084428 0 90px, transparent 92px),
  radial-gradient(circle at 92% 88%, #0a3d32 0 100px, transparent 102px),
  linear-gradient(180deg, #1f9a48 0%, #0e7a62 28%, #0c628c 58%, #0a3d66 100%);color:#1c140c;font-family:Trebuchet MS,Segoe UI,sans-serif}
#av-manga *{box-sizing:border-box}
#av-manga .mg-marco{min-height:100%}
#av-manga .mg-hoja{width:min(980px,calc(100% - 20px));margin:14px auto 28px;background:linear-gradient(#fff8ea,#f3e2c2 55%,#f7edd4);border:6px solid #1a120c;border-radius:22px;padding:12px 12px 16px;box-shadow:0 18px 50px rgba(0,0,0,.38)}
#av-manga .mg-top{display:flex;gap:10px;align-items:center;background:linear-gradient(#1486b8,#0c5f92);border:4px solid #08324a;border-radius:16px;padding:8px 10px;color:#fff}
#av-manga .mg-logo{display:flex;flex-direction:column;font-family:Impact,"Arial Black",sans-serif;letter-spacing:.04em;line-height:.82;font-size:16px;text-shadow:2px 3px 0 #06283c}
#av-manga .mg-logo span{color:#ffb020}
#av-manga .mg-logo b{color:#3ec8ff;font-size:28px;letter-spacing:.02em}
#av-manga .mg-placa{position:relative;flex:1;background:linear-gradient(#e8b56a,#c4843a 55%,#a86a28);color:#3a240d;border:4px solid #5a3412;border-radius:14px;padding:6px 36px 6px 12px;box-shadow:inset 0 2px 0 rgba(255,255,255,.45), 0 3px 0 #6a3e12}
#av-manga .mg-placa strong{display:block;font-size:22px;letter-spacing:.06em}
#av-manga .mg-placa small{font-weight:700}
#av-manga .mg-lapiz{display:inline-block;width:16px;height:16px;margin-left:6px;background:linear-gradient(#f2d15a,#e0a020);border:2px solid #3a240d;border-radius:2px 2px 8px 2px;transform:rotate(-35deg);vertical-align:middle}
#av-manga .mg-placa>.mg-lapiz{position:absolute;right:12px;top:14px}
#av-manga .mg-pasos{display:flex;gap:6px}
#av-manga .mg-pasos div{width:78px;text-align:center;font-size:11px;font-weight:800;line-height:1.15}
#av-manga .mg-pasos i{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;color:#fff;font-style:normal;border:2px solid #fff;box-shadow:0 2px 0 rgba(0,0,0,.25)}
#av-manga .mg-pasos div:nth-child(1) i{background:#f08a12}#av-manga .mg-pasos div:nth-child(2) i{background:#2f6fe0}#av-manga .mg-pasos div:nth-child(3) i{background:#2f9e44}#av-manga .mg-pasos div:nth-child(4) i{background:#7c3aed}
#av-manga .mg-datos{display:grid;grid-template-columns:1.4fr .9fr;gap:8px;margin:8px 0}
#av-manga .mg-ficha{display:flex;flex-direction:column;gap:4px;background:#fffdf8;border:3px solid #1a120c;border-radius:14px;padding:6px 8px;font-size:12px;font-weight:800;color:#5c3b16;box-shadow:0 3px 0 rgba(90,50,10,.18)}
#av-manga .mg-ficha-ave{flex-direction:row;align-items:center;gap:8px}
#av-manga .mg-ficha-ave canvas{width:54px;height:54px;border-radius:10px;background:#dff3ff;border:2px solid #1a120c;flex:none}
#av-manga .mg-ave-txt{flex:1;min-width:0}
#av-manga .mg-fila{display:flex;align-items:center}
#av-manga label{font-size:12px;font-weight:800;color:#5c3b16}
#av-manga input,#av-manga .mg-globo,#av-manga .mg-sfx,#av-manga .mg-caja p{font:700 16px/1.25 Trebuchet MS,Segoe UI,sans-serif;color:#1a120c}
#av-manga input{width:100%;border:0;border-radius:8px;padding:6px 4px;background:transparent}
#av-manga .mg-vinetas{display:grid;grid-template-columns:1.22fr .78fr;gap:8px;background:#fffdf6;border:7px solid #0c0906;border-radius:6px;padding:8px}
#av-manga .mg-vin{position:relative;background:#111;border:8px solid #0c0906;border-radius:2px;overflow:hidden;min-height:0}
#av-manga .mg-vin[data-i="0"]{clip-path:polygon(0 0,100% 0,86% 100%,0 100%)}
#av-manga .mg-vin[data-i="1"]{clip-path:polygon(14% 0,100% 0,100% 100%,0 100%)}
#av-manga .mg-vin[data-i="2"]{clip-path:polygon(0 0,100% 7%,100% 100%,0 93%)}
#av-manga .mg-vin[data-i="3"]{clip-path:polygon(0 8%,100% 0,100% 92%,0 100%)}
#av-manga .mg-vin[data-i="4"]{clip-path:polygon(0 0,100% 10%,100% 100%,0 100%)}
#av-manga .mg-vin[data-i="5"]{clip-path:polygon(0 0,100% 0,100% 100%,12% 88%)}
#av-manga .mg-vin canvas{width:100%;height:100%;display:block;aspect-ratio:16/10;filter:saturate(1.18) contrast(1.05)}
#av-manga .mg-vin[data-alto="1"] canvas{aspect-ratio:16/11}
#av-manga .mg-rotulo{position:absolute;left:8px;top:8px;z-index:2;display:inline-flex;align-items:center;gap:6px;background:#ffe14a;color:#3a2208;border:3px solid #1a120c;border-radius:8px;padding:3px 10px 3px 4px;font-size:14px;font-weight:900;box-shadow:3px 3px 0 #1a1008;letter-spacing:.02em}
#av-manga .mg-rotulo span{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#f08a12;color:#fff;border:2px solid #1a120c;font-size:13px}
#av-manga .mg-globo{position:absolute;z-index:2;max-width:62%;margin:0;background:#fff;border:3px solid #1a120c;border-radius:18px;padding:8px 10px;box-shadow:3px 3px 0 rgba(0,0,0,.25)}
#av-manga .mg-globo:after{content:"";position:absolute;left:22px;bottom:-12px;border:8px solid transparent;border-top-color:#1a120c}
#av-manga .mg-pensar{border-radius:46%;min-width:42%}
#av-manga .mg-pensar:after{left:18px;bottom:-18px;width:14px;height:14px;border:3px solid #1a120c;border-radius:50%;background:#fff}
#av-manga .mg-globo:focus,#av-manga input:focus,#av-manga .mg-caja p:focus,#av-manga .mg-sfx:focus{outline:3px solid #ffd15c;outline-offset:1px}
#av-manga .mg-vin[data-lado="der"] .mg-globo{right:8px;top:22%}
#av-manga .mg-vin[data-lado="aba"] .mg-globo{left:8px;bottom:10px;top:auto}
#av-manga .mg-sfx{position:absolute;left:6px;bottom:10px;z-index:2;margin:0;color:#123a9a;font:900 52px/1 Impact,"Arial Black",Trebuchet MS,sans-serif;-webkit-text-stroke:7px #fff;paint-order:stroke fill;text-shadow:4px 5px 0 #07183f;transform:rotate(-16deg);transform-origin:left bottom;letter-spacing:.02em}
#av-manga .mg-cierre{display:grid;grid-template-columns:1fr 220px 1fr;gap:8px;margin-top:8px;align-items:stretch}
#av-manga .mg-caja{position:relative;background:
  radial-gradient(circle at 0 18%, #2f9e44 0 9px, transparent 11px),
  radial-gradient(circle at 100% 78%, #248a38 0 11px, transparent 13px),
  linear-gradient(#f6d7a4,#e4ac5e 42%,#c47a32);border:6px solid #5c320e;border-radius:16px;padding:10px 12px 12px;box-shadow:inset 0 2px 0 rgba(255,255,255,.45), 4px 4px 0 rgba(70,36,8,.35)}
#av-manga .mg-caja h3{margin:0 0 6px;font-size:18px;color:#4a2808;letter-spacing:.04em;text-transform:uppercase}
#av-manga .mg-libro,#av-manga .mg-sol{display:inline-block;width:28px;height:24px;margin-right:6px;vertical-align:-4px;border:3px solid #4a2808;background:#fff6d8}
#av-manga .mg-libro{border-radius:2px 6px 6px 2px}
#av-manga .mg-sol{border-radius:50%;background:#ffe14a;box-shadow:0 0 0 3px #f08a12}
#av-manga .mg-caja-vida p:before{content:"“ ";font-weight:900;font-size:1.3em}
#av-manga .mg-cora{position:absolute;right:12px;bottom:10px;width:22px;height:22px;background:#e23b4a;border:2px solid #6a1020;border-radius:50% 50% 4px 4px;transform:rotate(45deg)}
#av-manga .mg-folia{position:absolute;width:26px;height:16px;background:#2f9e44;border:2px solid #145c28;border-radius:0 80% 0 80%;left:-6px;top:14px;transform:rotate(-28deg)}
#av-manga .mg-folia-b{left:auto;top:auto;right:-4px;bottom:12px;transform:rotate(36deg);background:#3cb054}
#av-manga .mg-caja p{margin:0;min-height:88px;background:transparent;font:700 22px/1.3 "Segoe Print","Comic Sans MS",cursive}
#av-manga .mg-hero{background:radial-gradient(circle at 50% 42%,#d2f0a4,#2f9e44 62%,#145c32);border:5px solid #1a120c;border-radius:18px;display:grid;place-items:center;min-height:200px}
#av-manga .mg-hero canvas{width:200px;height:200px}
#av-manga .mg-cierre-txt{grid-column:1 / -1;margin:0;font-weight:800;text-align:center}
#av-manga .mg-botones{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
#av-manga .mg-botones button,#av-manga .mg-volver{border:0;border-radius:12px;color:#fff;font:800 14px/1.2 Trebuchet MS,Segoe UI,sans-serif;min-height:48px;padding:8px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.25)}
#av-manga .mg-b1,#av-manga .mg-b2{background:#2f6fe0}#av-manga .mg-b3{background:#1faa4a}#av-manga .mg-b4{background:#7c3aed}
#av-manga .mg-volver,#av-manga .mg-vista{position:sticky;top:8px;float:right;background:#123;margin:0 0 8px 8px;min-height:40px;padding:8px 12px;border-radius:12px;color:#fff;font:800 14px/1.2 Trebuchet MS,Segoe UI,sans-serif;border:0;cursor:pointer}
#av-manga.mg-movil{background:#041018}
#av-manga.mg-movil .mg-marco{width:375px;height:812px;min-height:0;max-height:812px;margin:10px auto;overflow:hidden;display:flex;flex-direction:column;background:#083048;box-shadow:0 0 0 10px #111;border-radius:28px}
#av-manga.mg-movil .mg-volver,#av-manga.mg-movil .mg-vista{float:none;align-self:flex-end;flex:none}
#av-manga.mg-movil .mg-hoja{width:auto;max-width:none;flex:1;min-height:0;overflow:auto;margin:0 8px 8px;border-width:4px;padding:8px}
#av-manga.mg-movil .mg-top{flex-wrap:wrap}
#av-manga.mg-movil .mg-pasos{width:100%;justify-content:space-between}
#av-manga.mg-movil .mg-pasos div{width:58px;font-size:10px}
#av-manga.mg-movil .mg-datos,#av-manga.mg-movil .mg-vinetas,#av-manga.mg-movil .mg-cierre{grid-template-columns:1fr}
#av-manga.mg-movil .mg-hero{min-height:150px}
#av-manga.mg-movil .mg-hero canvas{width:140px;height:140px}
#av-manga.mg-movil .mg-caja p{font-size:18px}
#av-manga.mg-movil .mg-sfx{font-size:36px;-webkit-text-stroke-width:4px}
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
      <p class="mg-globo${b.pensar ? ' mg-pensar' : ''}" contenteditable="true" role="textbox" aria-label="${esc(L('Globo de la viñeta ' + (i + 1), 'Balloon of panel ' + (i + 1)))}"></p>
      ${b.prop === 'viento' ? `<p class="mg-sfx" contenteditable="true" role="textbox" aria-label="${esc(L('Onomatopeya', 'Sound effect'))}"></p>` : ''}
    </article>`).join('');
    raiz.innerHTML = `<div class="mg-marco"><button type="button" class="mg-volver">${esc(L('Volver al juego', 'Back to the game'))}</button><button type="button" class="mg-vista">${esc(L('Vista móvil', 'Phone view'))}</button>
      <div class="mg-hoja">
        <header class="mg-top">
          <div class="mg-logo"><span>AMAZONA</span><b>VERSE</b></div>
          <div class="mg-placa"><strong>${esc(L('CREA TU CÓMIC', 'MAKE YOUR COMIC'))}</strong><i class="mg-lapiz" aria-hidden="true"></i><small>${esc(L('Cuenta tu aventura con tus propias palabras', 'Tell your adventure in your own words'))}</small></div>
          <div class="mg-pasos">${pasos.map((t, i) => `<div><i>${i + 1}</i><span>${esc(t)}</span></div>`).join('')}</div>
        </header>
        <div class="mg-datos">
          <label class="mg-ficha"><span>${esc(L('Título de mi aventura:', 'Title of my adventure:'))}</span><span class="mg-fila"><input id="mg-titulo" maxlength="60" autocomplete="off"><i class="mg-lapiz" aria-hidden="true"></i></span></label>
          <label class="mg-ficha mg-ficha-ave"><canvas id="mg-mini" width="96" height="96"></canvas><span class="mg-ave-txt"><span>${esc(L('Mi cotorra:', 'My parrot:'))}</span><span class="mg-fila"><input id="mg-cotorra" maxlength="24" autocomplete="off" aria-label="${esc(L('Nombre de tu cotorra', 'Your parrot\'s name'))}"><i class="mg-lapiz" aria-hidden="true"></i></span></span></label>
        </div>
        <div class="mg-vinetas">${vinetas}</div>
        <section class="mg-cierre">
          <article class="mg-caja"><i class="mg-folia" aria-hidden="true"></i><i class="mg-folia mg-folia-b" aria-hidden="true"></i><h3><i class="mg-libro" aria-hidden="true"></i> ${esc(L('¿Qué aprendí?', 'What did I learn?'))}</h3><p id="mg-aprendi" contenteditable="true" role="textbox" aria-label="${esc(L('¿Qué aprendí?', 'What did I learn?'))}"></p></article>
          <div class="mg-hero"><canvas id="mg-hero" width="512" height="512"></canvas></div>
          <article class="mg-caja mg-caja-vida"><i class="mg-folia" aria-hidden="true"></i><i class="mg-folia mg-folia-b" aria-hidden="true"></i><h3><i class="mg-sol" aria-hidden="true"></i> ${esc(L('Mi enseñanza de vida', 'My life lesson'))}</h3><p id="mg-vida" contenteditable="true" role="textbox" aria-label="${esc(L('Mi enseñanza de vida', 'My life lesson'))}"></p><i class="mg-cora" aria-hidden="true"></i></article>
          <p class="mg-cierre-txt" id="mg-cierre" contenteditable="true" role="textbox" aria-label="${esc(L('Cierre', 'Ending'))}"></p>
        </section>
        <div class="mg-botones">
          <button type="button" class="mg-b1">${esc(L('Ver mis escenas', 'See my scenes'))}</button>
          <button type="button" class="mg-b2">${esc(L('Editar mi cómic', 'Edit my comic'))}</button>
          <button type="button" class="mg-b3">${esc(L('Descargar PNG / PDF', 'Download PNG / PDF'))}</button>
          <button type="button" class="mg-b4">${esc(L('Compartir (con permisos)', 'Share (with permission)'))}</button>
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
    const src = hero || retrato || fotos[5] || fotos[0];
    if (src) x.drawImage(src, 0, 0, c.width, c.height);
    const mini = raiz.querySelector('#mg-mini');
    const miniSrc = retrato || src;
    if (mini && miniSrc) mini.getContext('2d').drawImage(miniSrc, 0, 0, mini.width, mini.height);
  }
  async function refrescar() {
    if (tomando) return;
    tomando = true;
    try {
      const tomadas = fotografiar();
      const plates = await Promise.all(LAMINAS.map(cargarLamina));
      fotos = plates.map((p, i) => p || tomadas[i]);
      hero = await cargarLamina(HERO);
    } finally { tomando = false; }
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
    fotos = []; retrato = null; hero = null;
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
      x.strokeStyle = '#0c0906'; x.lineWidth = 8; round(x, px, py, pw, ph, 8); x.stroke();
      x.fillStyle = '#ffe14a'; round(x, px + 10, py + 10, Math.min(300, pw - 24), 36, 8); x.fill();
      x.strokeStyle = '#1a120c'; x.lineWidth = 3; x.stroke();
      x.fillStyle = '#f08a12'; x.beginPath(); x.arc(px + 28, py + 28, 12, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#1a120c'; x.lineWidth = 2; x.stroke();
      x.fillStyle = '#fff'; x.font = '900 14px Trebuchet MS, Segoe UI, sans-serif'; x.textAlign = 'center';
      x.fillText(String(i + 1), px + 28, py + 33);
      x.textAlign = 'left';
      x.fillStyle = '#3a2208'; x.font = '900 15px Trebuchet MS, Segoe UI, sans-serif';
      x.fillText(L(BEATS[i].es, BEATS[i].en), px + 46, py + 33);
      const gw = Math.min(300, pw - 24);
      globo(x, estado.globos[i], px + pw - gw - 12, py + 52, gw);
      if (i === 4 && estado.sfx) {
        x.save();
        x.translate(px + 18, py + ph - 30);
        x.rotate(-0.28);
        x.font = '900 58px Impact, Arial Black, Trebuchet MS, sans-serif';
        x.lineWidth = 10; x.lineJoin = 'round';
        x.strokeStyle = '#fff'; x.strokeText(estado.sfx, 0, 0);
        x.fillStyle = '#123a9a'; x.fillText(estado.sfx, 0, 0);
        x.restore();
      }
    }
    y += fila[0] + fila[1] + fila[2] + gap * 2 + 16;
    function ficha(px, titulo, texto) {
      x.fillStyle = '#e8b15a'; x.strokeStyle = '#5c320e'; x.lineWidth = 7;
      round(x, px, y, 420, pie - 20, 14); x.fill(); x.stroke();
      x.fillStyle = '#2f9e44'; x.beginPath(); x.ellipse(px + 18, y + 22, 14, 8, -0.5, 0, 7); x.fill();
      x.beginPath(); x.ellipse(px + 400, y + pie - 48, 14, 8, 0.6, 0, 7); x.fill();
      x.fillStyle = '#4a2808'; x.font = '900 22px Trebuchet MS, Segoe UI, sans-serif';
      x.fillText(titulo, px + 16, y + 40);
      x.fillStyle = '#1a120c'; x.font = '700 22px "Segoe Print", "Comic Sans MS", cursive';
      envolver(x, texto, 388, x.font).forEach((ln, i) => x.fillText(ln, px + 16, y + 78 + i * 30));
    }
    ficha(48, L('¿Qué aprendí?', 'What did I learn?'), estado.aprendi);
    ficha(612, L('Mi enseñanza de vida', 'My life lesson'), estado.ensenanza);
    const hero = raiz && raiz.querySelector('#mg-hero');
    if (hero) {
      x.fillStyle = '#1f8a3c'; round(x, 468, y + 28, 144, 190, 16); x.fill();
      x.strokeStyle = '#1a120c'; x.lineWidth = 5; x.stroke();
      x.drawImage(hero, 476, y + 36, 128, 128);
    }
    x.fillStyle = '#1a120c'; x.font = '800 20px Trebuchet MS, Segoe UI, sans-serif'; x.textAlign = 'center';
    x.fillText((estado.cierre || '') + '  ·  ' + (estado.nombre || 'Vittata'), W / 2, y + pie - 8);
    x.textAlign = 'left';
    x.font = '700 16px Trebuchet MS, Segoe UI, sans-serif'; x.fillStyle = '#5c3b16';
    x.fillText(L('Láminas del modelo oficial. El nombre es el de tu cotorra.', 'Plates of the official model. The name is your parrot\'s.'), 48, H - 40);
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
        check('Las 6 láminas tienen color (no un lienzo plano)', reales.length === 6, reales.length + '/6');
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
        check('Están las dos enseñanzas', !!raiz.querySelector('#mg-aprendi') && !!raiz.querySelector('#mg-vida') && /qu[eé] aprend[ií]|what did i learn/i.test(texto) && /ense[nñ]anza de vida|life lesson/i.test(texto));
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
        check('La cámara del juego vuelve a su sitio', camDelta != null && camDelta < 0.05, camDelta == null ? 'sin' : camDelta.toFixed(3));
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

  const api = { abrir, cerrar, movil, png, compartir, fotografiar, test, get estado() { return estado; }, get fotos() { return fotos; }, get camDelta() { return camDelta; } };
  return api;
};
