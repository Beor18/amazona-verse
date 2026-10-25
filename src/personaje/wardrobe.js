/* Amazona Verse · Ropero modular (gorras, ropa, zapatos y objetos)
   Ideas visuales: AmazonaVerse/03_Traits_y_Fondos/Traits_PNG_2026-10-24 (láminas conceptuales, no modelos).
   Dos tipos de pieza:
   - De montaje (hats/gafas/espalda): se construyen en metros relativos a su punto de montaje y character.js las cuelga del hueso.
   - Ajustadas (fit): se construyen en metros del modelo en reposo, partidas por hueso, para que doblen con la columna,
     los brazos y las patas. Medidas tomadas del modelo (tools/blender, body.py / head.py). */
(function () {
  'use strict';

  // ---------- Estampados (CanvasTexture, en caché por estilo+color) ----------
  const PR = { red: '#e8112d', blue: '#0a50a1', white: '#ffffff' };
  const texCache = {};
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return [c, c.getContext('2d')]; }
  function star(g, x, y, r, color) {
    g.fillStyle = color; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  // Bandera de Puerto Rico en un rectángulo: cinco franjas y triángulo azul con estrella blanca
  function prFlag(g, x, y, w, h) {
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? PR.white : PR.red; g.fillRect(x, y + i * h / 5, w, h / 5 + 0.5); }
    g.fillStyle = PR.blue; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.43, y + h / 2); g.lineTo(x, y + h); g.closePath(); g.fill();
    star(g, x + w * 0.15, y + h / 2, h * 0.16, PR.white);
  }
  function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function flower(g, x, y, r, petal, center) {
    g.fillStyle = petal;
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.5, r * 0.32, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = center; g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
  }
  // u = vuelta alrededor del cuerpo con el FRENTE en el centro (x = W/2); v = de abajo (0) a arriba (1)
  function pattern(style, color) {
    const key = style + color;
    if (texCache[key]) return texCache[key];
    const W = 512, H = 256, [c, g] = canvas(W, H), R = rng(7);
    g.fillStyle = color; g.fillRect(0, 0, W, H);
    // tejido sutil
    g.globalAlpha = 0.06; for (let i = 0; i < 1400; i++) { g.fillStyle = R() > 0.5 ? '#000' : '#fff'; g.fillRect(R() * W, R() * H, 2, 2); } g.globalAlpha = 1;
    if (style === 'pr') {
      prFlag(g, W * 0.25, H * 0.12, W * 0.5, H * 0.76);
      star(g, W * 0.0 + 30, H * 0.5, 22, PR.white); star(g, W - 30, H * 0.5, 22, PR.white);
    } else if (style === 'hawaiana' || style === 'flores') {
      for (let i = 0; i < 26; i++) {
        const x = R() * W, y = R() * H;
        g.fillStyle = '#1f7a3a'; g.beginPath(); g.ellipse(x + 14, y + 10, 22, 8, R() * 3, 0, Math.PI * 2); g.fill();
        flower(g, x, y, 18 + R() * 10, ['#ffffff', '#ffd84a', '#ff7a59', '#ff4f8b'][i % 4], '#f2a03d');
      }
    } else if (style === 'camuflaje') {
      const cols = ['#4b5d2e', '#7a6a3a', '#2f3b22', '#8f8a55'];
      for (let i = 0; i < 70; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.ellipse(R() * W, R() * H, 18 + R() * 30, 10 + R() * 18, R() * 3, 0, Math.PI * 2); g.fill(); }
    } else if (style === 'caribe') {
      for (let i = 0; i < 40; i++) {
        const x = R() * W, y = R() * H;
        g.fillStyle = ['#ffd84a', '#ffffff', '#2fb5c8', '#ff7a59'][i % 4];
        if (i % 3 === 0) { g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 12, y + 10); g.lineTo(x - 12, y + 10); g.fill(); }
        else if (i % 3 === 1) { g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill(); }
        else { g.fillRect(x - 10, y - 3, 20, 6); }
      }
    } else if (style === 'guayabera') {
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3;
      for (const dx of [-70, -52, 52, 70, 180, 198, -180, -198]) { g.beginPath(); g.moveTo(W / 2 + dx, 0); g.lineTo(W / 2 + dx, H); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2, H); g.stroke();
      for (const [x, y] of [[-110, 0.3], [110, 0.3], [-110, 0.68], [110, 0.68]]) { g.strokeRect(W / 2 + x - 30, H * (1 - y) - 20, 60, 42); }
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(W / 2 + 8, 30 + i * 46, 4, 0, Math.PI * 2); g.fill(); }
    } else if (style === 'deportiva') {
      g.fillStyle = '#ffffff'; g.fillRect(0, H * 0.82, W, 14);
      g.font = 'bold 92px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 8; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText('787', W / 2, H * 0.5); g.fillText('787', W / 2, H * 0.5);
      g.font = 'bold 70px sans-serif'; g.strokeText('PR', 0, H * 0.5); g.fillText('PR', 0, H * 0.5); g.strokeText('PR', W, H * 0.5); g.fillText('PR', W, H * 0.5);
    } else if (style === 'chaleco') {
      g.fillStyle = '#f2ece0'; g.fillRect(W / 2 - 34, 0, 68, H);  // camisa blanca por la abertura
      g.fillStyle = 'rgba(0,0,0,.22)';
      for (const x of [-95, 95]) { g.fillRect(W / 2 + x - 34, H * 0.45, 68, 52); g.fillRect(W / 2 + x - 34, H * 0.12, 68, 40); }
      g.fillStyle = 'rgba(255,255,255,.5)'; for (const x of [-95, 95]) g.fillRect(W / 2 + x - 34, H * 0.45, 68, 6);
    } else if (style === 'cargo') {
      g.fillStyle = 'rgba(0,0,0,.2)'; for (const x of [W * 0.25, W * 0.75]) { g.fillRect(x - 40, H * 0.35, 80, 70); }
      g.fillStyle = 'rgba(255,255,255,.25)'; for (const x of [W * 0.25, W * 0.75]) g.fillRect(x - 40, H * 0.35, 80, 8);
    } else if (style === 'mezclilla') {
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; for (let i = -H; i < W; i += 6) { g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke(); }
      g.strokeStyle = '#e0a640'; g.setLineDash([6, 5]); g.lineWidth = 2; for (const x of [W * 0.25, W * 0.75]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      g.setLineDash([]);
    } else if (style === 'coqui') {
      // Coquíes: ranitas verdes con ojos, sobre el color base
      for (let i = 0; i < 18; i++) {
        const x = (i % 6) * (W / 6) + 40 + (Math.floor(i / 6) % 2) * 40, y = Math.floor(i / 6) * (H / 3) + 40;
        g.fillStyle = '#5fae3a'; g.beginPath(); g.ellipse(x, y, 20, 14, 0, 0, Math.PI * 2); g.fill();
        for (const [dx, dy] of [[-18, 12], [18, 12], [-14, -10], [14, -10]]) { g.beginPath(); g.ellipse(x + dx, y + dy, 8, 4, dx > 0 ? 0.6 : -0.6, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#ffffff'; for (const dx of [-8, 8]) { g.beginPath(); g.arc(x + dx, y - 12, 6, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#1b1b1b'; for (const dx of [-8, 8]) { g.beginPath(); g.arc(x + dx, y - 12, 3, 0, Math.PI * 2); g.fill(); }
      }
    } else if (style === 'paja') {
      g.fillStyle = color; g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 * 8; x < W; x += 16) { g.fillStyle = 'rgba(120,80,20,.22)'; g.fillRect(x, y, 8, 8); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
    texCache[key] = t; return t;
  }
  const matCache = {};
  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache[key]) { matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.02 }, opts || {})); matCache[key].userData.shared = true; }
    return matCache[key];
  }
  // Material con CanvasTexture dibujada una sola vez (bandera, mapa, parche)
  function sharedMat(key, draw, opts) {
    key = 'canvas' + key;
    if (!matCache[key]) {
      const t = new THREE.CanvasTexture(draw()); texCache[key] = t;
      matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ map: t }, opts)); matCache[key].userData.shared = true;
    }
    return matCache[key];
  }
  function cloth(style, color) {
    const key = 'cloth' + style + color;
    if (!matCache[key]) {
      const plain = !style || style === 'liso';
      matCache[key] = new THREE.MeshStandardMaterial(plain ? { color, roughness: 0.85 } : { map: pattern(style, color), roughness: 0.85 });
      matCache[key].side = THREE.DoubleSide; matCache[key].userData.shared = true;
    }
    return matCache[key];
  }

  // ---------- Geometrías ajustadas ----------
  // Anillos elípticos a lo largo de Y: perfil [[y, rx, cz, rz], ...]; UV con el frente en u = 0.5
  function tube(profile, margin, seg) {
    seg = seg || 28;
    const pos = [], uv = [], idx = [];
    const y0 = profile[0][0], y1 = profile[profile.length - 1][0];
    profile.forEach(([y, rx, cz, rz], j) => {
      for (let i = 0; i <= seg; i++) {
        const u = i / seg, a = u * Math.PI * 2 - Math.PI;
        pos.push(Math.sin(a) * (rx + margin), y, cz + Math.cos(a) * (rz + margin));
        uv.push(u, (y - y0) / (y1 - y0));
      }
    });
    for (let j = 0; j < profile.length - 1; j++) for (let i = 0; i < seg; i++) {
      const a = j * (seg + 1) + i, b = a + seg + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // Tubo entre dos puntos (manga, pernera, caña de bota): radios r0 en a y r1 en b
  function limb(a, b, r0, r1, material, seg) {
    const A = new THREE.Vector3().fromArray(a), Bv = new THREE.Vector3().fromArray(b), len = A.distanceTo(Bv);
    const geo = new THREE.CylinderGeometry(r1, r0, len, seg || 18, 1, true);
    const m = new THREE.Mesh(geo, material);
    m.position.copy(A).add(Bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
    return m;
  }
  // Perfil del torso medido (y, medio ancho, centro z, medio fondo), sin la cola
  const TORSO = [[0.30, 0.158, 0.013, 0.148], [0.34, 0.176, 0.008, 0.186], [0.38, 0.183, 0.0, 0.21], [0.42, 0.188, 0.015, 0.215],
    [0.46, 0.206, 0.03, 0.21], [0.505, 0.21, 0.045, 0.2], [0.54, 0.205, 0.054, 0.19], [0.58, 0.188, 0.062, 0.178], [0.62, 0.158, 0.053, 0.166], [0.665, 0.128, 0.04, 0.155], [0.70, 0.112, 0.03, 0.14]];
  // (arriba más holgado que lo medido: las plumas del pecho y la nuca sobresalen del contorno liso)
  const HIPS = [[0.235, 0.135, 0.01, 0.1], [0.27, 0.15, 0.012, 0.13], [0.30, 0.158, 0.013, 0.148], [0.345, 0.176, 0.008, 0.188]];
  const LEG = { hip: [0.1404, 0.3191, 0.0619], knee: [0.1697, 0.2373, 0.0454], ankleTop: [0.174, 0.1894, -0.0167], ankle: [0.1951, 0.0416, 0.0013] };
  const ARM = { shoulder: [0.1623, 0.6696, 0.0171], elbow: [0.3797, 0.6443, 0.0103], hand: [0.70, 0.688, 0.05] };
  const mirror = p => [-p[0], p[1], p[2]];
  const split = (prof, a, b) => prof.filter(r => r[0] >= a - 1e-6 && r[0] <= b + 1e-6);
  const asGroup = (...objs) => { const g = new THREE.Group(); objs.forEach(o => g.add(o)); return g; };

  function shirtParts(color, style) {
    const M = cloth(style, color), sleeve = cloth(style === 'chaleco' ? 'liso' : style, style === 'chaleco' ? '#f2ece0' : style === 'pr' ? PR.red : style === 'deportiva' ? color : color);
    const lower = new THREE.Mesh(tube(split(TORSO, 0.30, 0.505), 0.025), M);
    const upper = new THREE.Mesh(tube(split(TORSO, 0.505, 0.70), 0.025), M);
    // Mangas cortas en el brazo (pose T de reposo); el chaleco no tiene mangas propias (son de la camisa blanca)
    const sl = (side) => {
      const s = side === 'L' ? (p => p) : mirror;
      const a = s(ARM.shoulder), e = s(ARM.elbow);
      const mid = a.map((v, i) => v + (e[i] - v) * 0.55);
      return limb(s([0.11, 0.665, 0.02]), mid, 0.085, 0.07, sleeve);
    };
    return [{ bone: 'espalda1', obj: lower }, { bone: 'espalda2', obj: upper }, { bone: 'armL1', obj: sl('L') }, { bone: 'armL1001', obj: sl('R') }];
  }
  function pantsParts(color, style) {
    const M = cloth(style, color), long = style === 'mezclilla';
    const band = new THREE.Mesh(tube(HIPS, 0.022), M);
    const parts = [{ bone: 'espalda1', obj: band }];
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? (p => p) : mirror, suf = side === 'L' ? '' : '001';
      parts.push({ bone: 'pieL1' + suf, obj: limb(s(LEG.hip), s(LEG.knee), 0.068, 0.058, M) });
      if (long) {
        parts.push({ bone: 'pieL2' + suf, obj: limb(s(LEG.knee), s(LEG.ankleTop), 0.058, 0.052, M) });
        parts.push({ bone: 'pieL3' + suf, obj: limb(s(LEG.ankleTop), s([0.195, 0.07, 0.0]), 0.052, 0.05, M) });
      }
    }
    return parts;
  }
  // Botas: caña alrededor del tarso y zapato que cubre los dedos (dos adelante y dos atrás, como en las cotorras)
  const BOOTS = {
    aventura: ['#6b4423', '#3a2412', '#c9a227'], constructor: ['#b07a3a', '#2b2016', '#9aa0a3'], militar: ['#2f3324', '#151515', '#555'],
    tenis: ['#d6403a', '#f4f4f0', '#ffffff'], tenis_pr: ['#f4f4f0', '#0a50a1', '#e8112d'], espacial: ['#eef2f5', '#9aa0a3', '#3d8fb0'], buzo: ['#2f6fd1', '#1d2a44', '#f2a03d'],
    chancletas: ['#2fb5c8', '#f2a03d', '#ffffff'],
  };
  function bootParts(color, style) {
    const [main, sole, accent] = BOOTS[style] || BOOTS.aventura;
    const parts = [];
    for (const side of ['L', 'R']) {
      const s = side === 'L' ? (p => p) : mirror, suf = side === 'L' ? '' : '001';
      const g = new THREE.Group(), x = s([0.195, 0, 0])[0];
      const soleM = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.025, 0.4), mat(sole)); soleM.position.set(x, 0.0125, 0.04); g.add(soleM);
      if (style === 'chancletas') {
        const strap = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16, Math.PI), mat(main)); strap.position.set(x, 0.03, 0.08); strap.rotation.y = Math.PI / 2; g.add(strap);
      } else {
        const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), style === 'tenis_pr' ? cloth('pr', PR.red) : mat(style === 'tenis' ? color : main));
        shoe.scale.set(0.085, 0.11, 0.2); shoe.position.set(x, 0.022, 0.04); g.add(shoe);
        const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(accent, { metalness: style === 'constructor' ? 0.6 : 0.05 }));
        toe.scale.set(0.075, 0.075, 0.075); toe.position.set(x, 0.024, 0.165); g.add(toe);
        g.add(limb(s([0.195, 0.02, 0.0]), s([0.178, 0.165, -0.014]), 0.05, 0.047, mat(style === 'tenis' || style === 'tenis_pr' ? '#f4f4f0' : main)));
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.01, 6, 18), mat(accent)); cuff.position.fromArray(s([0.178, 0.16, -0.014])); cuff.rotation.x = Math.PI / 2; g.add(cuff);
      }
      parts.push({ bone: 'pieL3' + suf, obj: g });
    }
    return parts;
  }
  // Objetos en la mano izquierda (pose T: la mano apunta a +X; el agarre va hacia adelante +Z)
  function handParts(color, style) {
    const h = ARM.hand, g = new THREE.Group(); g.position.fromArray(h);
    if (style === 'bandera') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), mat('#8a6a3a')); pole.position.y = 0.18; g.add(pole);
      // Texturas de bandera, mapa y parche en caché (antes se creaba una CanvasTexture nueva en cada montaje)
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2, 8, 1), sharedMat('flag', () => { const [c, gg] = canvas(240, 160); prFlag(gg, 0, 0, 240, 160); return c; }, { side: THREE.DoubleSide, roughness: 0.8 }));
      flag.position.set(0, 0.38, 0.15); flag.rotation.y = -Math.PI / 2; g.add(flag);
    } else if (style === 'maracas') {
      for (const dz of [0, 0.08]) {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), mat(color)); head.position.set(0, 0.16, dz); head.scale.y = 1.2; g.add(head);
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.16, 8), mat('#8a6a3a')); stick.position.set(0, 0.06, dz); g.add(stick);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 16), mat('#ffd84a')); band.position.set(0, 0.16, dz); band.rotation.x = Math.PI / 2; g.add(band);
      }
    } else if (style === 'linterna') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 12), mat(color)); body.rotation.x = Math.PI / 2; body.position.z = 0.05; g.add(body);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.05, 14), mat('#fff6c8', { emissive: '#ffe08a', emissiveIntensity: 0.6 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.17; g.add(lens);
    } else if (style === 'martillo') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.3, 8), mat('#8a6a3a')); handle.position.y = 0.1; g.add(handle);
      const headM = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), mat('#9aa0a3', { metalness: 0.7, roughness: 0.35 })); headM.position.y = 0.25; g.add(headM);
    } else if (style === 'coqui') {
      // Coquí de peluche: cuerpo, ojos saltones y patitas
      const green = mat('#5fae3a', { roughness: 0.95 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), green); body.scale.set(1, 0.8, 1.1); body.position.set(0, 0.06, 0.06); g.add(body);
      for (const x of [-0.035, 0.035]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mat('#ffffff')); eye.position.set(x, 0.115, 0.1); g.add(eye);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#1b1b1b')); pupil.position.set(x, 0.118, 0.122); g.add(pupil);
        const leg = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), green); leg.scale.set(1.6, 0.6, 1); leg.position.set(x * 2, 0.02, 0.1); g.add(leg);
      }
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat('#ff8fa3')); cheek.position.set(0.05, 0.075, 0.12); g.add(cheek);
    }
    // En pose T el puño agarra a lo largo de +Z; con el brazo abajo, los objetos largos quedan apuntando al frente
    if (style === 'bandera' || style === 'maracas' || style === 'martillo') g.rotation.x = Math.PI / 2 - 0.35;
    if (style === 'mapa') {
      const map = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.17), sharedMat('mapa', () => {
        const [c, gg] = canvas(200, 140); gg.fillStyle = '#efe2b8'; gg.fillRect(0, 0, 200, 140); gg.strokeStyle = '#7a5634'; gg.lineWidth = 3;
        gg.beginPath(); gg.moveTo(20, 110); gg.bezierCurveTo(60, 20, 120, 120, 180, 30); gg.stroke(); gg.fillStyle = '#d6403a'; gg.font = 'bold 30px sans-serif'; gg.fillText('X', 150, 50);
        return c;
      }, { side: THREE.DoubleSide }));
      map.position.set(0, 0.04, 0.12); map.rotation.x = -0.9; g.add(map);
    }
    return [{ bone: 'armL2', obj: g }];
  }

  // ---------- Piezas de montaje (metros relativos al punto de montaje; Y arriba, Z al frente) ----------
  const HEAD_TOP = [0, 1.3752, 0.0781]; // mount_head_top en reposo
  const rel = (x, y, z) => [x - HEAD_TOP[0], y - HEAD_TOP[1], z - HEAD_TOP[2]];
  function capGroup(color, style) {
    const g = new THREE.Group();
    const crownMat = style === 'pr' ? cloth('pr', PR.red) : style === 'criolla' ? cloth('paja', '#d9b56a') : style === 'playera' ? cloth('caribe', color) : mat(color, { roughness: 0.85 });
    // Domo que abraza la parte alta de la cabeza (medida: ancho ±0.235, frente z 0.2, nuca z -0.26 a la altura 1.29)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), crownMat);
    dome.scale.set(0.25, 0.16, 0.255); dome.position.fromArray(rel(0, 1.265, -0.03)); g.add(dome);
    const visorMat = style === 'trucker' ? mat('#2b2b2b') : mat(style === 'pr' ? PR.blue : color, { roughness: 0.8 });
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.014, 24, 1, false, -Math.PI / 2, Math.PI), visorMat);
    visor.scale.set(1, 1, 0.95); visor.position.fromArray(rel(0, 1.28, 0.17)); visor.rotation.x = 0.12;
    if (style === 'reves') { visor.rotation.y = Math.PI; visor.position.fromArray(rel(0, 1.28, -0.22)); visor.rotation.x = -0.12; }
    g.add(visor);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), visorMat); button.position.fromArray(rel(0, 1.425, -0.03)); g.add(button);
    if (style === 'trucker') {
      const front = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, -Math.PI / 3.2, Math.PI / 1.6, 0, Math.PI / 2), mat('#f4f4f0'));
      front.scale.set(0.255, 0.165, 0.26); front.position.fromArray(rel(0, 1.265, -0.03)); g.add(front);
    }
    if (style !== 'pr') {
      // Parche frontal con la bandera de Puerto Rico
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.066), sharedMat('parche', () => { const [c, gg] = canvas(150, 100); prFlag(gg, 0, 0, 150, 100); return c; }, { roughness: 0.8 }));
      const front = style === 'reves' ? -1 : 1;
      patch.position.fromArray(rel(0, 1.34, -0.03 + front * 0.205)); patch.rotation.x = -0.55 * front; if (front < 0) patch.rotation.y = Math.PI;
      g.add(patch);
    }
    return g;
  }
  // Pava jíbara: ala ancha y plana de paja con copa baja y pico al frente; cinta de color
  function pavaGroup(color) {
    const g = new THREE.Group(), straw = cloth('paja', '#d9b56a');
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.015, 40), straw); brim.position.fromArray(rel(0, 1.31, -0.02)); g.add(brim);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.17, 28, 1, true), straw); crown.position.fromArray(rel(0, 1.4, -0.02)); g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.212, 0.232, 0.04, 28, 1, true), mat(color)); band.position.fromArray(rel(0, 1.345, -0.02)); g.add(band);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 6, 40), straw); rim.rotation.x = Math.PI / 2; rim.position.fromArray(rel(0, 1.31, -0.02)); g.add(rim);
    return g;
  }
  function brimHat(color, style) {
    const g = new THREE.Group();
    const straw = style === 'paja' || style === 'tropical';
    const M = straw ? cloth('paja', '#e3c27a') : mat(color, { roughness: 0.85 });
    const crownH = style === 'vaquero' ? 0.2 : style === 'pescador' ? 0.14 : 0.16;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.245, crownH, 28), M); crown.position.fromArray(rel(0, 1.31 + crownH / 2, -0.02)); g.add(crown);
    const brimR = style === 'pescador' ? 0.33 : style === 'vaquero' ? 0.48 : 0.42;
    const brim = new THREE.Mesh(style === 'pescador' ? new THREE.CylinderGeometry(0.26, brimR, 0.08, 32, 1, true) : new THREE.CylinderGeometry(brimR, brimR, 0.016, 36), M);
    brim.position.fromArray(rel(0, style === 'pescador' ? 1.29 : 1.31, -0.02)); g.add(brim);
    if (style === 'vaquero') {
      for (const s of [-1, 1]) { const curl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.016, 16, 1, false, 0, Math.PI), M); curl.position.fromArray(rel(s * 0.4, 1.36, -0.02)); curl.rotation.set(0, s > 0 ? -Math.PI / 2 : Math.PI / 2, s * 0.9); g.add(curl); }
      const dent = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.3), mat('#00000033')); dent.position.fromArray(rel(0, 1.51, -0.02)); g.add(dent);
    }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.035, 28, 1, true), mat(straw ? color : '#2b2016')); band.position.fromArray(rel(0, 1.34, -0.02)); g.add(band);
    if (style === 'tropical') for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.4, x = Math.sin(a) * 0.245, z = Math.cos(a) * 0.245 - 0.02;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(['#ff4f8b', '#ffd84a', '#ff7a59', '#ffffff', '#ff4f8b'][i])); fl.position.fromArray(rel(x, 1.35, z)); fl.scale.set(1, 0.6, 1); g.add(fl);
    }
    return g;
  }
  function hardHat(color, style) {
    const g = new THREE.Group();
    if (style === 'marinero') {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.13, 28), mat('#f4f4f0')); top.position.fromArray(rel(0, 1.37, -0.02)); g.add(top);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.05, 28, 1, true), mat(color)); band.position.fromArray(rel(0, 1.33, -0.02)); g.add(band);
      return g;
    }
    if (style === 'pirata') {
      const M = mat('#1d1d1d', { roughness: 0.9 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.245, 0.14, 24), M); crown.position.fromArray(rel(0, 1.38, -0.02)); g.add(crown);
      for (let i = 0; i < 3; i++) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.02), M); const a = i * Math.PI * 2 / 3; side.position.fromArray(rel(Math.sin(a) * 0.2, 1.38, Math.cos(a) * 0.2 - 0.02)); side.rotation.set(-0.35, a, 0); g.add(side); }
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat('#f4f4f0')); skull.position.fromArray(rel(0, 1.4, 0.25)); g.add(skull);
      return g;
    }
    // casco de constructor
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { roughness: 0.4 }));
    shell.scale.set(0.265, 0.19, 0.275); shell.position.fromArray(rel(0, 1.27, -0.03)); g.add(shell);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 32), mat(color, { roughness: 0.4 })); brim.scale.set(1, 1, 1.05); brim.position.fromArray(rel(0, 1.275, -0.01)); g.add(brim);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.42), mat(color, { roughness: 0.4 })); ridge.position.fromArray(rel(0, 1.45, -0.03)); g.add(ridge);
    return g;
  }
  // Gafas de sol / deportivas / máscara de buceo (metros relativos a mount_eyes, ojos a ±0.15)
  function shades(color, style) {
    const g = new THREE.Group();
    const dark = new THREE.MeshPhysicalMaterial({ color: style === 'buceo' ? '#bfe8ff' : '#1b2430', transparent: true, opacity: style === 'buceo' ? 0.35 : 0.82, roughness: 0.05, metalness: 0.3 });
    if (style === 'buceo') {
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 28), mat(color)); frame.scale.set(1.45, 0.75, 1); frame.position.set(0, 0.0, 0.06); g.add(frame);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.16, 28), dark); glass.scale.set(1.45, 0.75, 1); glass.position.set(0, 0, 0.07); g.add(glass);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 30), mat('#2b2b2b')); strap.rotation.x = Math.PI / 2; strap.scale.set(0.95, 1.15, 1); strap.position.set(0, 0, -0.14); g.add(strap);
      const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.35, 8), mat('#f2a03d')); snorkel.position.set(0.25, 0.08, -0.02); g.add(snorkel);
      return g;
    }
    const round = style === 'redondas';
    for (const x of [-0.15, 0.15]) {
      const lens = new THREE.Mesh(new THREE.CircleGeometry(round ? 0.075 : 0.085, 24), dark); lens.position.set(x, 0, 0.07); if (!round) lens.scale.set(1.15, 0.8, 1); g.add(lens);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(round ? 0.075 : 0.085, 0.012, 6, 24), mat(color, { metalness: 0.5, roughness: 0.3 })); rim.position.set(x, 0, 0.07); if (!round) rim.scale.set(1.15, 0.8, 1); g.add(rim);
    }
    if (style === 'deportivas') { const band = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.02), mat(color)); band.position.set(0, 0.07, 0.075); g.add(band); }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.014), mat(color)); bridge.position.set(0, 0.03, 0.075); g.add(bridge);
    return g;
  }
  // Mochilas especiales (metros relativos a mount_back; Z+ sale de la espalda)
  function backItem(color, style) {
    const g = new THREE.Group();
    if (style === 'cuatro') {
      // Cuatro puertorriqueño: caja con forma de violín, mástil y clavijero
      const wood = mat('#a8692d', { roughness: 0.5 }), dark = mat('#4a2c14');
      for (const [y, r] of [[-0.08, 0.13], [0.08, 0.1]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.06, 24), wood); b.rotation.x = Math.PI / 2; b.position.set(0, y, -0.06); g.add(b); }
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), dark); hole.position.set(0, 0.02, -0.025); g.add(hole);
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.32, 0.03), dark); neck.position.set(0, 0.32, -0.06); g.add(neck);
      const peg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.03), dark); peg.position.set(0, 0.5, -0.06); g.add(peg);
      g.rotation.z = 0.5; g.position.z = -0.03;
      return g;
    }
    if (style === 'mochila_pr') {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.16), cloth('pr', PR.red)); bag.position.set(0, 0, -0.1); g.add(bag);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.12, 0.17), mat(PR.blue)); flap.position.set(0, 0.13, -0.1); g.add(flap);
      const st = new THREE.Mesh(new THREE.CircleGeometry(0.035, 5), mat(PR.white)); st.position.set(0, 0.12, -0.186); st.rotation.y = Math.PI; g.add(st);
      return g;
    }
    if (style === 'tanques') {
      for (const x of [-0.07, 0.07]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 16), mat(color, { metalness: 0.5, roughness: 0.3 })); t.position.set(x, 0, -0.08); g.add(t);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(color, { metalness: 0.5, roughness: 0.3 })); cap.position.set(x, 0.17, -0.08); g.add(cap);
      }
      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), mat('#2b2b2b')); valve.rotation.z = Math.PI / 2; valve.position.set(0, 0.2, -0.08); g.add(valve);
      return g;
    }
    // jetpack ligero
    for (const x of [-0.08, 0.08]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.28, 16), mat('#d9dde0', { metalness: 0.6, roughness: 0.3 })); t.position.set(x, 0, -0.09); g.add(t);
      const nz = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 14, 1, true), mat('#2b2b2b')); nz.position.set(x, -0.18, -0.09); nz.rotation.x = Math.PI; g.add(nz);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 10), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.8 })); flame.position.set(x, -0.27, -0.09); flame.rotation.x = Math.PI; flame.userData.flame = true; g.add(flame);
    }
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.03), mat(color)); plate.position.set(0, 0.02, -0.03); g.add(plate);
    return g;
  }

  // ---------- Catálogo (se suma a los accesorios de character.js) ----------
  const COL = ['#d6403a', '#3d8fb0', '#2f8f4e', '#2b2b2b', '#f2a03d', '#7a4fb3', '#e8c32a', '#f4f4f0'];
  const defs = [
    { id: 'gorra', slot: 'head', mount: 'mount_head_top', name: 'Gorra', colors: COL, styles: [['liso', 'Clásica'], ['pr', 'Bandera PR'], ['criolla', 'Criolla de paja'], ['playera', 'Playera'], ['reves', 'Hacia atrás'], ['trucker', 'Trucker']], glb: { reves: 'gorra_reves', trucker: 'gorra_trucker', '*': 'gorra' }, build: capGroup },
    { id: 'pava', slot: 'head', mount: 'mount_head_top', name: 'Pava jíbara (PR)', colors: ['#d6403a', '#0a50a1', '#2b2b2b', '#2f8f4e'], glb: 'pava', build: pavaGroup },
    { id: 'sombrero2', slot: 'head', mount: 'mount_head_top', name: 'Sombreros', colors: ['#8a6a3a', '#5a3a22', '#d6403a', '#3d8fb0', '#2f8f4e', '#2b2b2b'], styles: [['paja', 'De paja'], ['tropical', 'Tropical'], ['vaquero', 'Vaquero'], ['pescador', 'Pescador']], glb: { paja: 'sombrero_paja', tropical: 'sombrero_tropical', vaquero: 'sombrero_vaquero', pescador: 'sombrero_pescador' }, build: brimHat },
    { id: 'casco', slot: 'head', mount: 'mount_head_top', name: 'Cascos', colors: ['#f2c21a', '#f2a03d', '#f4f4f0', '#3d8fb0', '#d6403a'], styles: [['constructor', 'Constructor'], ['marinero', 'Marinero'], ['pirata', 'Pirata']], glb: { constructor: 'casco_constructor', marinero: 'casco_marinero', pirata: 'casco_pirata' }, build: hardHat },
    { id: 'lentes', slot: 'eyes', mount: 'mount_eyes', name: 'Lentes', colors: ['#2b2b2b', '#c9a227', '#d6403a', '#3d8fb0', '#f4f4f0'], styles: [['sol', 'De sol'], ['redondas', 'Redondas'], ['deportivas', 'Deportivas'], ['buceo', 'Máscara de buceo']], glb: { sol: 'lentes_sol', redondas: 'lentes_redondas', deportivas: 'lentes_deportivas', buceo: 'lentes_buceo' }, build: shades },
    { id: 'camisa', slot: 'torso', fit: shirtParts, glb: 'camisa', name: 'Camisa', colors: ['#f4f4f0', '#d6403a', '#3d8fb0', '#2f8f4e', '#f2a03d', '#2b2b2b', '#7a4fb3', '#e8c32a'],
      styles: [['liso', 'Lisa'], ['pr', 'Bandera PR'], ['hawaiana', 'Hawaiana'], ['guayabera', 'Guayabera'], ['deportiva', 'Deportiva 787'], ['camuflaje', 'Camuflaje'], ['chaleco', 'Chaleco explorador']] },
    { id: 'pantalon', slot: 'legs', fit: pantsParts, name: 'Pantalón', colors: ['#3d6fa8', '#8a6a3a', '#2f8f4e', '#2b2b2b', '#d6403a', '#f2a03d'],
      styles: [['liso', 'Corto'], ['flores', 'De playa'], ['cargo', 'Cargo'], ['camuflaje', 'Militar'], ['mezclilla', 'Mezclilla largo']] },
    { id: 'botas', slot: 'feet', fit: bootParts, name: 'Calzado', colors: ['#d6403a', '#3d8fb0', '#2f8f4e', '#2b2b2b'],
      styles: [['aventura', 'Aventura'], ['constructor', 'Constructor'], ['militar', 'Militares'], ['tenis', 'Tenis'], ['espacial', 'Espaciales'], ['buzo', 'De buzo'], ['tenis_pr', 'Tenis PR'], ['chancletas', 'Chancletas']] },
    { id: 'equipo', slot: 'back', mount: 'mount_back', name: 'Equipo', colors: ['#3d8fb0', '#d6403a', '#2f8f4e', '#9aa0a3'], styles: [['mochila_pr', 'Mochila PR'], ['cuatro', 'Cuatro puertorriqueño'], ['tanques', 'Tanques de oxígeno'], ['jetpack', 'Jetpack ligero']], build: backItem },
    { id: 'mano', slot: 'hand', fit: handParts, name: 'En la mano', colors: ['#d6403a', '#f2a03d', '#2f8f4e', '#3d8fb0'], styles: [['bandera', 'Bandera de PR'], ['maracas', 'Maracas'], ['linterna', 'Linterna'], ['martillo', 'Martillo'], ['mapa', 'Mapa'], ['coqui', 'Coquí de peluche']] },
  ];
  window.AVWardrobe = { defs, pattern, prFlag, cloth, SLOTS_EXTRA: ['torso', 'legs', 'feet', 'hand'] };
})();
