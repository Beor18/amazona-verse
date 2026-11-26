/* Escuela de vuelo del Guardián (CG-108 · CG-126 · Piloto, 16-nov). Cinco lecciones cortas que se pueden terminar:
   Despega, Sigue las hojas, Picada, Pósate en la percha y Carrera de nubes. Las marcas son nubes, hojas y una percha de verdad
   (sin anillos), con el haz de guía apuntando a la siguiente. Cada lección guarda su mejor tiempo y una estrella; con las cinco
   llega la insignia «Piloto de la isla» (unas conchitas, una sola vez, con el tope diario de la tienda).
   HUD arriba: lección n/5, qué hacer (táctil o teclado), tiempo, récord, 5 botones de lección (★ si está hecha) y «Salir».
   «Salir» y Esc salen; abierta desde «Más juegos», menu_modos.js vuelve a la portada al quitarse body.piloto-on.
   En táctil, mientras dura, el botón «Bajar» (mantener = C) baja sin aterrizar: Aterrizar queda para posarse.
   Guardado en el dispositivo: localStorage <almacen>.piloto = { v: 1, mejor: { id: segundos }, insignia: bool } (lo lee records.js).
   ?piloto=0 o G.piloto === false la apaga. Sin asignaciones por cuadro. API G.v18piloto. Prueba: AV.pilotoTest(). */
window.AVV18Piloto = function (G) {
  'use strict';
  if (G.v18piloto) return G.v18piloto;
  const S = G.S, M = G.fisica.MOVE, H = (x, z) => G.terreno.height(x, z);
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() && eng ? eng : es);
  const encendido = () => !/[?&]piloto=0\b/.test(location.search) && G.piloto !== false;
  const tactil = () => !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.piloto';
  const aguaEn = (x, z) => (G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity);
  // Lo más alto bajo el cielo en (x, z): terreno, tejados, copas, perchas o agua. Las marcas van por encima.
  const techo = (x, z) => { let y = H(x, z); try { y = Math.max(y, G.fisica.suelo(x, z, y + 60)); } catch (e) { /* sin sólidos */ } return Math.max(y, aguaEn(x, z)); };

  // ---------- Guardado ----------
  const D = { mejor: {}, insignia: false };
  function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && typeof d === 'object') { D.mejor = d.mejor && typeof d.mejor === 'object' ? d.mejor : {}; D.insignia = !!d.insignia; } } catch (e) { /* sin almacén */ } }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, mejor: D.mejor, insignia: D.insignia })); } catch (e) { /* sin almacén */ } }
  leer();

  // ---------- Lecciones ----------
  // marcas(o) → [{ tipo, x, y, z, r }] con o = { x, z, fx, fz } (origen y dirección de la vista). El orden de las marcas es el del recorrido.
  const LEC = [
    { id: 'despegar', es: 'Despega', en: 'Take off',
      tEs: 'Toca Volar y mantén Saltar para subir hasta la nube.', tEn: 'Tap Fly and hold Jump to climb up to the cloud.',
      kEs: 'Pulsa V y mantén Espacio para subir hasta la nube.', kEn: 'Press V and hold Space to climb up to the cloud.',
      marcas: o => [nube(o, 7, 0, 9)] },
    { id: 'hojas', es: 'Sigue las hojas', en: 'Follow the leaves',
      tEs: 'Vuela hacia la hoja que brilla. Hay 4.', tEn: 'Fly to the glowing leaf. There are 4.',
      kEs: 'Vuela hacia la hoja que brilla (W y el ratón). Hay 4.', kEn: 'Fly to the glowing leaf (W and the mouse). There are 4.',
      marcas: o => [hoja(o, 10, -4, 6), hoja(o, 18, 3, 7), hoja(o, 26, -3, 6), hoja(o, 34, 2, 8)] },
    { id: 'picada', es: 'Picada', en: 'Dive',
      tEs: 'Sube a la nube alta y mantén Bajar hasta la hoja de abajo.', tEn: 'Climb to the high cloud, then hold Down to reach the low leaf.',
      kEs: 'Sube a la nube alta y mantén C para bajar hasta la hoja.', kEn: 'Climb to the high cloud, then hold C to drop to the leaf.',
      marcas: o => [nube(o, 8, 0, 15), hoja(o, 18, 0, 2.2)] },
    { id: 'percha', es: 'Pósate en la percha', en: 'Land on the perch',
      tEs: 'Vuela sobre la hoja y toca Aterrizar para posarte.', tEn: 'Fly over the leaf and tap Land to perch.',
      kEs: 'Vuela sobre la hoja y pulsa X (o V) para posarte.', kEn: 'Fly over the leaf and press X (or V) to perch.',
      marcas: o => [percha(o)] },
    { id: 'carrera', es: 'Carrera de nubes', en: 'Cloud race',
      tEs: 'Pasa por las 6 nubes lo más rápido que puedas.', tEn: 'Fly through the 6 clouds as fast as you can.',
      kEs: 'Pasa por las 6 nubes lo más rápido que puedas.', kEn: 'Fly through the 6 clouds as fast as you can.',
      marcas: o => [0, 1, 2, 3, 4, 5].map(k => { const a = k / 6 * Math.PI * 2; return nube(o, 20 + Math.sin(a) * 16, Math.cos(a) * 16 - 16, 8 + (k % 2) * 3); }) },
  ];
  const punto = (o, ade, lado) => ({ x: o.x + o.fx * ade - o.fz * lado, z: o.z + o.fz * ade + o.fx * lado });
  function nube(o, ade, lado, alto) { const p = punto(o, ade, lado); return { tipo: 'nube', x: p.x, z: p.z, y: techo(p.x, p.z) + alto, r: 3.2 }; }
  function hoja(o, ade, lado, alto) { const p = punto(o, ade, lado); return { tipo: 'hoja', x: p.x, z: p.z, y: techo(p.x, p.z) + alto, r: 2.8 }; }
  // Una percha de verdad (rama, baranda, poste) entre 8 y 30 m, por delante; si no hay, un claro en el suelo
  function percha(o) {
    let mejor = null, md = 1e9;
    for (const p of (G.fisica.perchas || [])) {
      if ((p.when && !p.when()) || !isFinite(p.y)) continue;
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
      if (d < 8 || d > 30 || dx * o.fx + dz * o.fz < 0) continue;
      if (d < md) { md = d; mejor = p; }
    }
    if (mejor) return { tipo: 'percha', x: mejor.x, z: mejor.z, y: mejor.y, r: Math.max(1.6, (mejor.r || 0.5) + 1), real: true };
    const p = punto(o, 12, 0);
    return { tipo: 'percha', x: p.x, z: p.z, y: H(p.x, p.z), r: 2.4, real: false };
  }

  // ---------- Marcas: nubes y hojas (sprites con textura de canvas, sin assets) ----------
  function tex(dibuja) { const c = document.createElement('canvas'); c.width = c.height = 256; dibuja(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.anisotropy = 2; return t; }
  let texNube = null, texHoja = null, grupo = null;
  const sprites = []; // [{ s: [Sprite…], tipo }]: un hueco por marca (como mucho 6)
  function prepararMarcas() {
    if (grupo || !G.renderer || !window.THREE) return;
    // Nube de dibujo: bolas suaves que se solapan, blanca arriba y azulada abajo, con un halo dorado (marca, no nube del cielo)
    texNube = tex(g => {
      const halo = g.createRadialGradient(128, 136, 40, 128, 136, 128); halo.addColorStop(0, 'rgba(255,226,122,.55)'); halo.addColorStop(1, 'rgba(255,226,122,0)');
      g.fillStyle = halo; g.fillRect(0, 0, 256, 256);
      // Centradas: antes el bulto quedaba abajo del lienzo y, a 390, la marca se leía como una mancha en la arena.
      const bolas = [[78, 128, 48], [128, 108, 62], [178, 126, 50], [104, 150, 42], [156, 152, 44]];
      g.save(); g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 14;
      for (const [x, y, r] of bolas) { const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.2, x, y, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#f4f8ff'); gr.addColorStop(1, '#d6e4f5'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      g.restore();
    });
    texHoja = tex(g => {
      g.scale(2, 2);
      const r = g.createRadialGradient(64, 64, 10, 64, 64, 64); r.addColorStop(0, 'rgba(255,250,190,.65)'); r.addColorStop(1, 'rgba(255,250,190,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      g.translate(64, 64); g.rotate(-0.6);
      const v = g.createLinearGradient(-40, 0, 40, 0); v.addColorStop(0, '#2f8f3e'); v.addColorStop(0.5, '#7fd25a'); v.addColorStop(1, '#3fa84a'); g.fillStyle = v;
      g.beginPath(); g.moveTo(-44, 0); g.quadraticCurveTo(0, -30, 44, 0); g.quadraticCurveTo(0, 30, -44, 0); g.fill();
      g.strokeStyle = 'rgba(235,255,200,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-40, 0); g.lineTo(40, 0); g.stroke();
      g.lineWidth = 2; for (let k = -24; k <= 24; k += 12) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 10, -12); g.moveTo(k, 0); g.lineTo(k + 10, 12); g.stroke(); }
    });
    grupo = new THREE.Group(); grupo.name = 'piloto:marcas'; grupo.visible = false;
    for (let i = 0; i < 6; i++) {
      const h = { s: [], tipo: '' };
      for (let k = 0; k < 1; k++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNube, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
        sp.frustumCulled = false; sp.userData.sinCulling = true; grupo.add(sp); h.s.push(sp);
      }
      sprites.push(h);
    }
    G.renderer.scene.add(grupo);
  }
  function pintarMarcas(now) {
    if (!grupo) return;
    const ver = F.modo && F.marcas.length > 0 && !G.quiet;
    grupo.visible = ver;
    if (!ver) return;
    for (let i = 0; i < sprites.length; i++) {
      const h = sprites[i], m = F.marcas[i], hecha = !m || i < F.paso, act = i === F.paso, sig = i === F.paso + 1;
      for (let k = 0; k < 1; k++) {
        const sp = h.s[k];
        sp.visible = !!m && !hecha && (act || sig);
        if (!sp.visible) continue;
        const mat = sp.material, bob = Math.sin(now * 2 + i) * 0.25;
        if (m.tipo === 'nube') {
          if (mat.map !== texNube) { mat.map = texNube; mat.needsUpdate = true; }
          const esc = (act ? 5.4 : 3.2) * (1 + Math.sin(now * 2.5 + i) * 0.08);
          sp.position.set(m.x, m.y + bob, m.z); sp.scale.set(esc, esc, 1);
          mat.opacity = act ? 1 : 0.45; mat.color.setHex(0xffffff); // con halo dorado: no se confunde con las nubes del cielo
        } else {
          if (mat.map !== texHoja) { mat.map = texHoja; mat.needsUpdate = true; }
          const esc = (act ? 2.8 : 1.6) * (1 + Math.sin(now * 4) * 0.06);
          sp.position.set(m.x, m.y + (m.tipo === 'percha' ? 1.6 : 0) + bob, m.z); sp.scale.set(esc, esc, 1);
          mat.rotation = Math.sin(now * 1.5 + i) * 0.4; mat.opacity = act ? 1 : 0.45; mat.color.setHex(0xffffff);
        }
      }
    }
  }

  // ---------- Estado ----------
  const F = { modo: false, lec: 0, paso: 0, t: 0, marcas: [], res: null, resT: 0, origen: { x: 0, z: 0, fx: 0, fz: 1 }, toques: 0 };
  const hechas = () => LEC.filter(l => D.mejor[l.id] > 0).map(l => l.id);
  const estado = () => ({ fase: F.modo ? (F.res ? 'hecha' : 'leccion') : 'nada', visible: F.modo, leccion: F.modo ? LEC[F.lec].id : null, paso: F.paso, total: F.marcas.length, t: F.t,
    hechas: hechas(), mejor: Object.assign({}, D.mejor), insignia: D.insignia, marcas: F.marcas.map(m => ({ tipo: m.tipo, x: m.x, y: m.y, z: m.z, r: m.r })) });
  const reloj = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') + '.' + Math.floor((s % 1) * 10);

  function origen() {
    const c = G.renderer && G.renderer.camera; let fx = 0, fz = 1;
    if (c) { fx = S.pos.x - c.position.x; fz = S.pos.z - c.position.z; }
    const d = Math.hypot(fx, fz); if (d > 0.01) { fx /= d; fz /= d; } else if (S.facing) { fx = S.facing.x; fz = S.facing.z; }
    F.origen.x = S.pos.x; F.origen.z = S.pos.z; F.origen.fx = fx; F.origen.fz = fz;
  }
  function leccion(i, o) {
    if (!encendido()) return false;
    F.lec = Math.max(0, Math.min(LEC.length - 1, i | 0)); F.paso = 0; F.t = 0; F.res = null; F.resT = 0;
    if (!(o && o.mismoSitio)) origen();
    F.marcas = LEC[F.lec].marcas(F.origen);
    prepararMarcas(); pintarHud();
    try {
      const m0 = F.marcas[0];
      if (m0 && m0.tipo === 'nube' && !G.quiet && G.fx && G.fx.burst) G.fx.burst(m0.x, m0.y, m0.z, 'stars', 8);
    } catch (e) { /* sin fx */ }
    return true;
  }
  const miraEsc = { x: 0, z: 1 };
  let ibaVolando = false;
  // En el suelo, Vittata mira la marca: si se gira hacia la cámara, la nube queda a la espalda.
  function mirarMarca() {
    if (!F.modo || F.res) return;
    const M = G.fisica && G.fisica.MOVE;
    if (M && (M.flying || Math.hypot(M.vx || 0, M.vz || 0) > 0.35)) return;
    const m = F.marcas[F.paso]; if (!m) return;
    const dx = m.x - S.pos.x, dz = m.z - S.pos.z, n = Math.hypot(dx, dz) || 1;
    miraEsc.x = dx / n; miraEsc.z = dz / n; S.facing = miraEsc;
  }
  // Abre la escuela (desde «Más juegos», «¿Qué hay para hacer?» o la API). Empieza por la primera lección sin estrella.
  function jugar(o) {
    if (!encendido()) return false;
    o = o || {};
    F.modo = true; F.toques = 0;
    document.body.classList.add('piloto-on'); // antes de llevar: el «Descubriste» no tapa la lección ni Salir
    const lugar = sitio().inicio;
    if (o.llevar !== false && lugar && G.menuModos && G.menuModos.llevar) { try { G.menuModos.llevar(lugar.x, lugar.z, lugar.x + lugar.fx * 10, lugar.z + lugar.fz * 10); } catch (e) { /* sin menú */ } }
    hud().hidden = false; document.body.classList.add('piloto-on');
    try { if (G.menuModos && G.menuModos.encuadrar) G.menuModos.encuadrar(); } catch (e) { /* sin menú */ } // F20 r2: la cámara no sale metida en la ladera
    const sin = LEC.findIndex(l => !(D.mejor[l.id] > 0));
    leccion(o.leccion != null ? o.leccion : sin < 0 ? 0 : sin);
    ibaVolando = !!(G.fisica && G.fisica.MOVE && G.fisica.MOVE.flying);
    mirarMarca();
    return true;
  }
  const empezar = o => jugar(o); // nombre de antes (que_hacer.js, QA-246)
  function salir() {
    const estaba = F.modo;
    F.modo = false; F.marcas = []; F.res = null; F.paso = 0;
    if (grupo) grupo.visible = false;
    if (hudEl) { hudEl.hidden = true; }
    bajar(false); if (bBajar) bBajar.hidden = true;
    document.body.classList.remove('piloto-on', 'piloto-lec0');
    return estaba;
  }
  const activo = () => F.modo;
  // Sitio de la escuela: junto al puente de la villa (aire abierto sobre el río). Sin ese POI, donde esté la cotorra.
  function sitio() {
    const poi = G.terreno.poi && (G.terreno.poi('puente_villa') || G.terreno.poi('puente'));
    const x = poi ? poi.x : S.pos.x, z = poi ? poi.z : S.pos.z;
    const ini = { x: x - 6, z: z + 2, fx: 1, fz: 0 };
    return { inicio: ini, puente: { x: ini.x, z: ini.z, y: H(ini.x, ini.z) } };
  }

  function llegar(m) {
    const dx = S.pos.x - m.x, dz = S.pos.z - m.z, dh = Math.hypot(dx, dz);
    if (m.tipo === 'percha') {
      // Posada: sin volar, en la percha (a su altura) o en el suelo de al lado. Pasar volando por encima no cuenta.
      return !M.flying && !M.swimming && dh < m.r && Math.abs(S.pos.y - m.y) < (m.real ? 0.7 : 1.2);
    }
    const dy = S.pos.y + 0.6 - m.y;
    return Math.hypot(dh, dy) < m.r;
  }
  function completar() {
    const l = LEC[F.lec], t = F.t, prev = D.mejor[l.id] || 0, nuevo = !prev || t < prev;
    if (nuevo) D.mejor[l.id] = +t.toFixed(2);
    let insignia = false;
    if (!D.insignia && LEC.every(x => D.mejor[x.id] > 0)) { D.insignia = true; insignia = true; }
    guardar();
    F.res = { id: l.id, t, nuevo, record: prev && nuevo, insignia }; F.resT = 0;
    G.emit('record', { modo: 'piloto', leccion: l.id, segundos: t });
    if (insignia) {
      const ti = G.tienda; if (ti && ti.ganarLogro) { try { ti.ganarLogro('piloto-insignia', 3, { prueba: !!G.quiet, aviso: !G.quiet }); } catch (e) { /* sin tienda */ } }
    }
    if (!G.quiet) {
      try { G.audio.play('pickup', 2); } catch (e) { /* sin audio */ }
      try { G.audio.play('logro'); } catch (e) { /* sin audio */ }
      try { if (G.fx && G.fx.burst) G.fx.burst(S.pos.x, S.pos.y + 1.2, S.pos.z, 'stars', 14); } catch (e) { /* sin efectos */ }
      try { if (G.actores && G.actores.playEmote && !M.flying) G.actores.playEmote('celebrar'); } catch (e) { /* sin gesto */ }
    }
    pintarHud();
  }
  function paso(dt) {
    if (!F.modo) return;
    if (!encendido()) { salir(); return; }
    document.body.classList.toggle('piloto-lec0', !!(F.modo && !F.res && F.lec === 0));
    dt = Math.min(0.1, dt || 0.05);
    if (F.res) {
      F.resT += dt;
      if (F.resT > 3 && !F.res.insignia && F.lec < LEC.length - 1) leccion(F.lec + 1);
      return;
    }
    F.t += dt;
    mirarMarca();
    const fly = !!(G.fisica && G.fisica.MOVE && G.fisica.MOVE.flying);
    if (fly && !ibaVolando && !G.quiet) {
      try { G.audio.play('aleteo'); } catch (e) { /* sin audio */ }
      try { if (G.fx && G.fx.burst) G.fx.burst(S.pos.x, S.pos.y + 0.3, S.pos.z, 'feathers', 8); } catch (e) { /* sin efectos */ }
    }
    ibaVolando = fly;
    const m = F.marcas[F.paso];
    if (m && llegar(m)) {
      if (!G.quiet) { try { G.fx.burst(m.x, m.y, m.z, m.tipo === 'nube' ? 'stars' : 'gold', 10); } catch (e) { /* sin fx */ } try { G.audio.play(m.tipo === 'nube' ? 'aviso' : 'tick'); } catch (e) { /* sin audio */ } }
      F.paso++;
      if (F.paso >= F.marcas.length) completar(); else pintarHud();
    }
    if (hudEl && !hudEl.hidden && Math.floor((F.t - dt) * 5) !== Math.floor(F.t * 5)) pintarTiempo();
  }
  G.on('update', dt => paso(dt), 64);
  // El haz de guía apunta a la marca que toca (después de misiones.js, 60, y del Vuelo libre, 61)
  const guia = { x: 0, y: 0, z: 0 };
  G.on('render', () => {
    const now = performance.now() / 1000;
    pintarMarcas(now);
    if (!F.modo || !G.fx || !G.fx.guide) return;
    const m = !F.res && F.marcas[F.paso];
    if (m) { guia.x = m.x; guia.z = m.z; guia.y = m.tipo === 'percha' ? m.y + 1 : m.y; }
    G.fx.guide(m ? guia : null, now);
  }, 62);

  // ---------- HUD ----------
  let hudEl = null, bBajar = null, bajando = false;
  function hud() {
    if (hudEl) return hudEl;
    const st = document.createElement('style'); st.id = 'pil-css';
    st.textContent = '#pil-hud{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 10px);z-index:9;box-sizing:border-box;width:min(560px,calc(100vw - 24px));padding:8px 12px 10px;border-radius:18px;background:rgba(16,36,28,.88);color:#fff8e6;font:600 15px/1.3 Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);text-align:center}#pil-hud[hidden]{display:none}' +
      '#pil-hud .pil-t{display:flex;justify-content:space-between;align-items:baseline;gap:8px}#pil-hud .pil-t b{font-size:16px;text-align:left}#pil-hud .pil-reloj{font-variant-numeric:tabular-nums;white-space:nowrap}' +
      '#pil-hud .pil-pista{margin:4px 0 6px;font-weight:500;font-size:15px;color:#e8ffd8}#pil-hud .pil-pista.pil-ok{color:#ffe27a;font-weight:700}' +
      '#pil-hud .pil-bots{display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap}' +
      '#pil-hud button{min-height:44px;min-width:44px;padding:4px 10px;border-radius:22px;border:0;font:700 15px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;cursor:pointer}' +
      '#pil-hud button.pil-l{padding:0;width:44px}#pil-hud button.pil-l.hecha{background:#ffe27a}#pil-hud button.pil-l[aria-current="true"]{outline:3px solid #7fd25a;outline-offset:1px}' +
      '#pil-hud button.pil-salir{background:#ffd0c4;padding:4px 16px}#pil-hud button:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
      '#pil-bajar{position:fixed;z-index:8;width:64px;height:64px;border-radius:50%;border:0;background:rgba(255,243,214,.92);color:#3b2a14;font:700 14px Fredoka,system-ui,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.3);touch-action:none;user-select:none;-webkit-user-select:none}#pil-bajar[hidden]{display:none}#pil-bajar.on{background:#ffe27a}' +
      'body.piloto-on :is(#quest,#inv,#inv-cuenta,#modo-salir,#b-construir,#toast,#prompt,#minimapa,#v18-exp-poder,#v18-extra,#rio-visor,#fx-descubre,#rotulo-lugar){visibility:hidden!important}' +
      '@media (max-width:560px){#pil-hud{left:max(12px,env(safe-area-inset-left,0px));transform:none;width:min(560px,calc(100vw - 84px))}#pil-hud .pil-t b{font-size:14px;line-height:1.15}#pil-hud .pil-pista{font-size:14px}}' + // 390×844: la columna de Diario y Pausa no tapa «Salir»; el título no empuja el reloj
      'body.piloto-lec0 #b-fly,body.piloto-lec0 #b-jump{animation:pil-invita 1.1s ease-in-out infinite}@keyframes pil-invita{0%,100%{box-shadow:0 0 0 0 rgba(255,226,122,.2)}50%{box-shadow:0 0 0 6px rgba(255,226,122,.85)}}';
    document.head.appendChild(st);
    hudEl = document.createElement('div'); hudEl.id = 'pil-hud'; hudEl.hidden = true; hudEl.setAttribute('role', 'region');
    hudEl.innerHTML = '<div class="pil-t"><b data-k="t"></b><span class="pil-reloj" data-k="reloj"></span></div><div class="pil-pista" data-k="pista" role="status" aria-live="polite"></div><div class="pil-bots">' +
      LEC.map((l, i) => '<button type="button" class="pil-l" data-l="' + i + '"></button>').join('') + '<button type="button" class="pil-salir" data-a="salir"></button></div>';
    hudEl.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'salir') { salir(); return; }
      if (b.dataset.l != null) leccion(+b.dataset.l);
    });
    document.body.appendChild(hudEl);
    // «Bajar» en táctil: mantener = C (baja sin aterrizar). Al lado de Volar.
    bBajar = document.createElement('button'); bBajar.type = 'button'; bBajar.id = 'pil-bajar'; bBajar.hidden = true;
    bBajar.addEventListener('pointerdown', e => { e.preventDefault(); bajar(true); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) bBajar.addEventListener(ev, () => bajar(false));
    bBajar.addEventListener('contextmenu', e => e.preventDefault());
    document.body.appendChild(bBajar);
    addEventListener('resize', () => { if (F.modo) colocarBajar(); });
    return hudEl;
  }
  function bajar(on) {
    on = !!on && F.modo;
    if (on === bajando) return;
    bajando = on;
    const k = G.input && G.input.keys; if (k) { if (on) k.add('c'); else k.delete('c'); }
    if (bBajar) bBajar.classList.toggle('on', on);
  }
  function colocarBajar() {
    if (!bBajar) return;
    const fly = document.getElementById('b-fly'), r = fly && fly.getBoundingClientRect();
    // PULIR 3 (niño de 7 años): en el suelo «Bajar» no hace nada y se juntaban tres botones de subir y bajar: solo sale volando
    const M = G.fisica && G.fisica.MOVE, ver = F.modo && tactil() && !!r && r.width > 0 && !!(M && M.flying);
    if (!ver && bajando) bajar(false);
    if (bBajar.hidden !== !ver) bBajar.hidden = !ver;
    if (!ver) return;
    // Encima de Volar, centrado (a la izquierda chocaba con el aro del joystick)
    const x = Math.max(8, Math.min(innerWidth - 72, r.left + r.width / 2 - 32)), y = Math.max(8, r.top - 64 - 10);
    bBajar.style.left = x + 'px'; bBajar.style.top = y + 'px';
    bBajar.textContent = L('Bajar', 'Down'); bBajar.setAttribute('aria-label', L('Bajar (mantener)', 'Go down (hold)'));
  }
  function pintarTiempo() {
    if (!hudEl) return;
    const l = LEC[F.lec], m = D.mejor[l.id];
    hudEl.querySelector('[data-k="reloj"]').textContent = (F.res ? reloj(F.res.t) : reloj(F.t)) + (m ? L(' · récord ', ' · best ') + reloj(m) : '');
  }
  function pintarHud() {
    if (!hudEl) return;
    const l = LEC[F.lec], q = k => hudEl.querySelector('[data-k="' + k + '"]');
    q('t').textContent = L('Escuela de vuelo', 'Flight school') + ' · ' + (F.lec + 1) + '/' + LEC.length + ' ' + L(l.es, l.en);
    const p = q('pista');
    if (F.res) {
      const r = F.res;
      p.textContent = r.insignia ? L('¡Insignia de piloto! Hiciste las 5 lecciones.', 'Pilot badge! You did all 5 lessons.')
        : (r.record ? L('¡Nuevo récord! ', 'New record! ') : L('¡Lo lograste! ', 'You did it! ')) + reloj(r.t) + (F.lec < LEC.length - 1 ? L(' · Ahora: ', ' · Next: ') + L(LEC[F.lec + 1].es, LEC[F.lec + 1].en) : L(' · Elige otra lección o sal.', ' · Pick another lesson or exit.'));
      p.classList.add('pil-ok');
    } else {
      const tx = tactil() ? L(l.tEs, l.tEn) : L(l.kEs, l.kEn), n = F.marcas.length;
      p.textContent = tx + (n > 1 ? ' (' + F.paso + '/' + n + ')' : '');
      p.classList.remove('pil-ok');
    }
    hudEl.querySelectorAll('.pil-l').forEach(b => {
      const i = +b.dataset.l, x = LEC[i], h = D.mejor[x.id] > 0;
      b.textContent = h ? '★' : String(i + 1); b.classList.toggle('hecha', h); b.setAttribute('aria-current', String(i === F.lec));
      b.setAttribute('aria-label', L('Lección ', 'Lesson ') + (i + 1) + ': ' + L(x.es, x.en) + (h ? L(' (hecha)', ' (done)') : ''));
    });
    const sb = hudEl.querySelector('[data-a="salir"]'); sb.textContent = L('Salir', 'Exit'); sb.setAttribute('aria-label', L('Salir de la escuela de vuelo', 'Exit the flight school'));
    hudEl.setAttribute('aria-label', L('Escuela de vuelo', 'Flight school'));
    pintarTiempo(); colocarBajar();
  }
  G.on('aula', k => { if (k === 'idioma' && F.modo) pintarHud(); });
  G.on('vuelo', () => { if (F.modo) colocarBajar(); }); // PULIR 3: «Bajar» sale al despegar y se va al posarse
  // Esc sale (y no abre la Pausa: ui.js mira defaultPrevented)
  addEventListener('keydown', e => {
    if (!F.modo || e.key !== 'Escape' || e.repeat) return;
    if (document.getElementById('title') && document.getElementById('title').open) return;
    if (G.ui && G.ui.cardOpen) return; // primero se cierra la tarjeta abierta
    e.preventDefault(); e.stopImmediatePropagation(); salir();
  }, true);

  // ---------- Prueba ----------
  async function test() {
    const out = [], ok = (n, pass, extra) => out.push({ name: n, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const quiet0 = G.quiet, piloto0 = G.piloto, recorte0 = G.menuRecorte; G.quiet = true;
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fly0 = M.flying, land0 = M.landing, sp0 = M.speed, vy0 = S.vy, g0 = M.grounded;
    let guardado0 = null; try { guardado0 = localStorage.getItem(CLAVE); localStorage.removeItem(CLAVE); } catch (e) { /* */ }
    const D0 = { mejor: D.mejor, insignia: D.insignia }; D.mejor = {}; D.insignia = false;
    const ae = G.aula && G.aula.aj, idi0 = ae && ae.idioma;
    try {
      G.piloto = undefined; salir();
      // QA-246 · «¿Qué hay para hacer?» → Ir arranca la escuela (sin el recorte de T3, que ya no la quita)
      const abrirPanel = document.getElementById('b-que-hacer') || document.getElementById('b-que-hacer-title');
      if (abrirPanel) abrirPanel.click();
      const fila = document.querySelector('#que-hacer [data-qh="piloto"]'), btnIr = fila && fila.querySelector('.qh-ir');
      ok('«¿Qué hay para hacer?» enseña la Escuela de vuelo sin bandera', !!btnIr && !btnIr.disabled && !!fila.offsetParent);
      if (btnIr && !btnIr.disabled) btnIr.click();
      for (let k = 0; k < 50 && !F.modo; k++) await new Promise(r => setTimeout(r, 40));
      ok('QA-246 · Ir arranca la escuela con su HUD', F.modo && !!hudEl && !hudEl.hidden && document.body.classList.contains('piloto-on'));
      if (G.menuModos && G.menuModos.volver) { try { G.menuModos.volver(); } catch (e) { /* */ } }
      ok('Volver al menú cierra la escuela', !F.modo && (!hudEl || hudEl.hidden) && !document.body.classList.contains('piloto-on'));
      const pt = document.getElementById('title'); if (pt && pt.open) { pt.returnValue = ''; pt.close(); }
      await new Promise(r => setTimeout(r, 50));
      salir(); G.menuRecorte = recorte0;

      G.piloto = false;
      ok('CG-126 · ?piloto=0 o G.piloto en false la apaga', !encendido() && jugar({ llevar: false }) === false && !estado().visible);
      G.piloto = true;
      ok('Con la escuela encendida, jugar() abre la lección 1', jugar({ llevar: false }) === true && estado().leccion === 'despegar' && estado().fase === 'leccion');
      const rect = el => el.getBoundingClientRect();
      const bs = [...hudEl.querySelectorAll('button')];
      ok('HUD: 5 lecciones y «Salir», todos ≥ 44 px, dentro de la pantalla', bs.length === 6 && bs.every(b => rect(b).height >= 44 && rect(b).width >= 44) && rect(hudEl).left >= 0 && rect(hudEl).right <= innerWidth + 0.5 && rect(hudEl).top >= 0,
        bs.map(b => Math.round(rect(b).width) + 'x' + Math.round(rect(b).height)).join(' '));
      const choca = ['minimapa', 'inv-cuenta', 'quest', 'toast', 'v18-exp-poder'].filter(id => { const el = document.getElementById(id); if (!el || el.hidden || getComputedStyle(el).visibility === 'hidden') return false; const a = rect(el), h = rect(hudEl); return a.width > 0 && a.left < h.right && a.right > h.left && a.top < h.bottom && a.bottom > h.top; });
      ok('HUD: no tapa el minimapa, la patrulla, la misión ni avisos (se esconden mientras dura)', !choca.length, choca.join(','));
      ok('HUD estrecho: a 560 px deja la columna de botones libre', /100vw - 84px/.test(document.getElementById('pil-css').textContent) && (innerWidth > 560 || rect(hudEl).right <= (document.getElementById('b-menu') ? document.getElementById('b-menu').getBoundingClientRect().left + 1 : innerWidth)), Math.round(rect(hudEl).right));
      ok('HUD: dice qué hacer, el tiempo y «Salir»', /nube|cloud/i.test(hudEl.textContent) && /0:0/.test(hudEl.textContent) && /Salir|Exit/.test(hudEl.querySelector('[data-a="salir"]').textContent), hudEl.textContent.slice(0, 120));
      ok('Sin anillos: las marcas son nubes, hojas o una percha (sprites)', LEC.every((l, i) => { leccion(i, { mismoSitio: true }); return F.marcas.length > 0 && F.marcas.every(m => ['nube', 'hoja', 'percha'].includes(m.tipo)); }) && (!grupo || grupo.children.every(c => c.type === 'Sprite')));
      ok('Las marcas en el aire van por encima de lo que hay debajo (terreno, tejados, copas)', LEC.every((l, i) => { leccion(i, { mismoSitio: true }); return F.marcas.every(m => m.tipo === 'percha' || m.y > techo(m.x, m.z) + 1.5); }));

      // Cada lección se completa yendo a sus marcas (como lo haría la cotorra)
      const ir = (x, y, z) => { S.pos.x = x; S.pos.y = y; S.pos.z = z; };
      for (let i = 0; i < LEC.length; i++) {
        leccion(i, { mismoSitio: true });
        const l = LEC[i], n = F.marcas.length;
        let pasos = 0;
        for (const m of F.marcas.slice()) {
          if (m.tipo === 'percha') { ir(m.x, m.y, m.z); M.flying = false; M.landing = false; M.grounded = true; M.swimming = false; }
          else { ir(m.x, m.y - 0.6, m.z); M.flying = true; M.grounded = false; }
          paso(0.5); pasos++;
        }
        ok('Lección ' + (i + 1) + ' «' + l.es + '» se completa (' + n + ' marcas) y guarda su tiempo', F.res && F.res.id === l.id && D.mejor[l.id] > 0 && pasos === n, 'paso ' + F.paso + '/' + n);
        if (i < LEC.length - 1) { F.resT = 3; paso(0.1); ok('…y pasa sola a la siguiente lección', estado().leccion === LEC[i + 1].id && !F.res); }
      }
      ok('Con las 5 lecciones llega la insignia (y se queda en la lección)', D.insignia && F.res && F.res.insignia && estado().hechas.length === 5);
      let g = null; try { g = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { /* */ }
      ok('Guardado: récord por lección e insignia en el dispositivo', g && g.v === 1 && g.insignia === true && LEC.every(l => g.mejor[l.id] > 0), JSON.stringify(g));
      ok('Los botones de lección enseñan ★ al hacerla', [...hudEl.querySelectorAll('.pil-l')].every(b => b.textContent === '★'));
      // Una marca lejos no cuenta; la percha no cuenta pasando volando por encima
      leccion(3, { mismoSitio: true }); const pm = F.marcas[0];
      ir(pm.x, pm.y + 0.2, pm.z); M.flying = true; paso(0.1);
      ok('La percha no cuenta volando: hay que posarse (Aterrizar)', F.paso === 0 && !F.res);
      leccion(1, { mismoSitio: true }); ir(F.marcas[0].x + 20, F.marcas[0].y, F.marcas[0].z); paso(0.1);
      ok('Lejos de la hoja no cuenta', F.paso === 0);
      // Récord: un tiempo peor no lo pisa; uno mejor sí
      D.mejor.despegar = 5; const r0 = 5; leccion(0, { mismoSitio: true }); F.t = 9; ir(F.marcas[0].x, F.marcas[0].y - 0.6, F.marcas[0].z); M.flying = true; paso(0.1);
      const peor = D.mejor.despegar; leccion(0, { mismoSitio: true }); F.t = 1; ir(F.marcas[0].x, F.marcas[0].y - 0.6, F.marcas[0].z); paso(0.1);
      ok('El récord es el mejor tiempo de cada lección', peor === r0 && D.mejor.despegar < r0 && F.res.record, r0 + ' → ' + D.mejor.despegar);

      // Aterrizar no rebota: un segundo toque (o Saltar) mientras baja no vuelve a volar; al tocar suelo se posa
      ir(F.origen.x, H(F.origen.x, F.origen.z) + 8, F.origen.z); M.flying = true; M.landing = false; M.takeoff = 0; M.grounded = false; S.vy = 0;
      G.fisica.toggleFly(); const bajaba = M.landing;
      G.fisica.toggleFly(); G.fisica.toggleFly();
      const fb = document.getElementById('b-fly'), fb0 = fb && fb.textContent;
      if (fb) fb.textContent = 'Aterrizar'; // como volando; aterrizando, input.js no lo cambia a «Volar» (interaccion.js pinta «Aterrizando…»)
      if (G.input && G.input.syncSwimButtons) G.input.syncSwimButtons(false);
      ok('Aterrizar: el segundo y tercer toque no lo cancelan (sigue bajando)', bajaba && M.flying && M.landing, 'landing ' + M.landing);
      ok('Mientras aterriza, el botón no vuelve a decir «Volar» (no invita al segundo toque)', !fb || (fb.textContent !== 'Volar' && fb.textContent !== 'Fly'), fb && fb.textContent);
      if (fb && fb0 != null) fb.textContent = fb0;
      let n = 0; while (M.flying && n++ < 400) G.fisica.step(1 / 30);
      const posada = !M.flying, tras = n;
      const volar = () => (G.input && G.input.volar ? G.input.volar() : (G.fisica.toggleFly(), true));
      const reb = volar();
      ok('Al tocar suelo se posa y el toque que llega justo después (botón Volar o V) no la relanza', posada && !M.flying && reb === false, 'pasos ' + tras + ' · flying ' + M.flying);
      await new Promise(r => setTimeout(r, 520));
      volar();
      ok('Pasado el momento, Volar despega como siempre', M.flying);
      G.fisica.endFlight();

      // «Bajar» en táctil = mantener C, y se suelta al salir
      leccion(2, { mismoSitio: true }); bajar(true);
      ok('«Bajar» mantiene C y baja sin aterrizar', G.input.keys.has('c') && !M.landing);
      { const fl0 = M.flying; M.flying = false; colocarBajar(); const enSuelo = bBajar.hidden; M.flying = fl0; colocarBajar();
        ok('PULIR 3 · En el suelo no sale «Bajar» (solo volando)', enSuelo); }
      bajar(true);
      // Inglés
      if (ae) {
        ae.idioma = 'en'; pintarHud();
        ok('En inglés: «Flight school», la lección y «Exit»', /Flight school/.test(hudEl.textContent) && /Dive/.test(hudEl.textContent) && hudEl.querySelector('[data-a="salir"]').textContent === 'Exit', hudEl.textContent.slice(0, 120));
        ae.idioma = idi0; pintarHud();
      }
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
      const EN = window.AV_EN || {}, faltan = [];
      for (const l of LEC) for (const [es, eng] of [[l.es, l.en], [l.tEs, l.tEn], [l.kEs, l.kEn]]) if (EN[es] !== eng) faltan.push(es);
      ok('Los textos de las lecciones están en content/cap1/en.js', window.AV_EN && !faltan.length, faltan.slice(0, 3).join(' | ') || 'ok');
      // Salir y Esc
      hudEl.querySelector('[data-a="salir"]').click();
      ok('«Salir» cierra la escuela (HUD, marcas, clase y «Bajar»)', !F.modo && hudEl.hidden && !document.body.classList.contains('piloto-on') && !G.input.keys.has('c') && (!grupo || !grupo.visible));
      jugar({ llevar: false });
      const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); dispatchEvent(ev);
      ok('Esc sale de la escuela y no abre la Pausa', !F.modo && ev.defaultPrevented && !document.body.classList.contains('piloto-on'));
      // Desde la portada: la tarjeta de «Más juegos» abre la escuela y «Salir» vuelve al menú
      const mm = G.menuModos;
      if (mm && mm.elegir && pt) {
        await mm.elegir('piloto');
        for (let k = 0; k < 75 && !F.modo; k++) await new Promise(r => setTimeout(r, 40));
        const abierta = F.modo && !pt.open;
        hudEl.querySelector('[data-a="salir"]').click();
        for (let k = 0; k < 75 && !pt.open; k++) await new Promise(r => setTimeout(r, 40));
        ok('Desde «Más juegos»: abre la escuela y «Salir» vuelve al menú', abierta && pt.open && !F.modo, 'abierta ' + abierta + ' · portada ' + pt.open);
        if (pt.open) { pt.returnValue = ''; pt.close(); }
        await mm.elegir('piloto');
        for (let k = 0; k < 75 && !F.modo; k++) await new Promise(r => setTimeout(r, 40));
        dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        for (let k = 0; k < 75 && !pt.open; k++) await new Promise(r => setTimeout(r, 40));
        ok('Desde «Más juegos»: Esc también vuelve al menú', pt.open && !F.modo);
        if (pt.open) { pt.returnValue = ''; pt.close(); }
      }
    } catch (e) { ok('La prueba terminó', false, String(e && e.stack || e)); }
    finally {
      if (ae) ae.idioma = idi0;
      salir(); G.menuRecorte = recorte0; G.piloto = piloto0; G.quiet = quiet0;
      D.mejor = D0.mejor; D.insignia = D0.insignia;
      try { if (guardado0 == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, guardado0); } catch (e) { /* */ }
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.vy = vy0; M.flying = fly0; M.landing = land0; M.speed = sp0; M.grounded = g0;
    }
    return { passed: out.filter(x => x.ok).length, total: out.length, results: out };
  }
  const api = { jugar, empezar, leccion, paso, salir, activo, estado, sitio, test, LEC, get mejor() { return Object.assign({}, D.mejor); }, get insignia() { return D.insignia; } };
  G.v18piloto = api; // Ir de «¿Qué hay para hacer?» lee G.v18piloto; aDemanda no lo guarda (QA-246)
  return api;
};
