/* Juego · D13 · «Semillas al vuelo» (minijuego corto de «Más juegos», 75 segundos).
   Caen semillas del cielo alrededor de Vittata; se atrapan volando o andando hasta su sombra en el suelo (aviso de dónde caerán).
   Semilla con brote: 1. Semilla dorada (más rápida y escasa): 5. Hoja seca (cae en zigzag): quita 1 segundo del reloj.
   Lo que llega al suelo espera un momento y se va. Al terminar: panel con las semillas, el récord, «Otra vez» y «Salir».
   Nada de anillos: los objetivos son las semillas. Geometría propia y ligera (esferas y formas con colores por vértice, sin
   modelos nuevos ni texturas): 4 mallas instanciadas (semilla, dorada, hoja, sombra), un grupo fijo de 18 sin asignaciones por cuadro.
   Sonidos de T45 por G.audio: semilla (el tono sube con la racha), encaje (dorada), frenada (hoja), aviso (10 y 5 s), panel_final, logro.
   El mundo sigue (Vittata se mueve con el teclado o el joystick); la portada o la pausa congelan el reloj (dt = 0).
   Récord en este dispositivo (localStorage, clave <almacen>.semillas, { v: 1, mejor }), sin cuentas; lo lee «Mis récords».
   API: window.AVSemillas(G) → G.semillasApi = { jugar, salir, activo, paso, estado, test }. Lo abre menu_modos.js. Prueba: AV.semillasTest(). */
window.AVSemillas = function (G) {
  'use strict';
  if (G.semillasApi) return G.semillasApi;
  const S = G.S, R = G.renderer;
  const H = (x, z) => G.terreno.height(x, z);
  const nivelAgua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -1e9; return w > -1e8 ? w : -Infinity; };
  const superficie = (x, z) => Math.max(H(x, z), nivelAgua(x, z));
  const ALM = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.semillas';
  const DUR = 75, N = 18, ALC = 1.8, ALC_Y = 2.0, EN_SUELO = 1.6;
  const PTS = { semilla: 1, dorada: 5 };
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const reloj = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor < 10000 ? d.mejor : 0; } catch (e) { return 0; } };
  const guardarRec = n => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor: n })); } catch (e) { /* sin almacén */ } };
  const sonar = (n, a) => { try { if (!G.quiet && G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  let azarS = 0; const azar = () => { if (!azarS) return Math.random(); azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };
  const rnd = (a, b) => a + azar() * (b - a);

  // ---------- Geometría: piezas con color por vértice, unidas en una sola malla por tipo ----------
  const lin = c => new THREE.Color(c).convertSRGBToLinear();
  function unir(partes) {
    const pos = [], nor = [], col = [], idx = []; let off = 0;
    for (const [g, c] of partes) {
      const gg = g.index ? g : (() => { const n = g.attributes.position.count, a = []; for (let i = 0; i < n; i++) a.push(i); g.setIndex(a); return g; })();
      const k = lin(c), n = gg.attributes.position.count;
      pos.push(...gg.attributes.position.array); nor.push(...gg.attributes.normal.array);
      for (let i = 0; i < n; i++) col.push(k.r, k.g, k.b);
      for (const i of gg.index.array) idx.push(i + off);
      off += n; gg.dispose();
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    m.setIndex(idx); m.computeBoundingSphere();
    return m;
  }
  function geoSemilla(cuerpo, punta) {
    const c = new THREE.SphereGeometry(0.2, 14, 10); c.scale(0.86, 1.12, 0.86);
    const raya = new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, Math.PI * 0.44, Math.PI * 0.12); raya.scale(0.88, 1.14, 0.88); // una franja más oscura, como la semilla de verdad
    const p = new THREE.SphereGeometry(0.06, 8, 6); p.translate(0, 0.215, 0);
    const tallo = new THREE.CylinderGeometry(0.014, 0.02, 0.15, 6); tallo.translate(0, 0.3, 0);
    const hoja = s => { const h = new THREE.SphereGeometry(0.07, 10, 6); h.scale(1.7, 0.32, 0.85); h.rotateZ(s * 0.55); h.translate(s * 0.085, 0.38, 0); return h; };
    return unir([[c, cuerpo], [raya, punta], [p, punta], [tallo, '#4f9a3a'], [hoja(1), '#74c94e'], [hoja(-1), '#62b443']]);
  }
  function geoHoja() {
    const f = new THREE.Shape();
    f.moveTo(0, -0.36); f.quadraticCurveTo(0.26, -0.12, 0.17, 0.12); f.quadraticCurveTo(0.08, 0.3, 0, 0.38);
    f.quadraticCurveTo(-0.08, 0.3, -0.17, 0.12); f.quadraticCurveTo(-0.26, -0.12, 0, -0.36);
    const lam = new THREE.ShapeGeometry(f, 8);
    const nervio = new THREE.BoxGeometry(0.022, 0.72, 0.012); nervio.translate(0, 0.01, 0.006);
    const rabo = new THREE.CylinderGeometry(0.012, 0.016, 0.16, 5); rabo.translate(0, -0.43, 0);
    return unir([[lam, '#c27b34'], [nervio, '#7a4a1e'], [rabo, '#6b4220']]);
  }
  const matBase = o => R.linMat(new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, o)));
  const MALLAS = {
    semilla: new THREE.InstancedMesh(geoSemilla('#93602e', '#5e3a1a'), matBase({ emissive: '#2a1808', emissiveIntensity: 0.5 }), N),
    dorada: new THREE.InstancedMesh(geoSemilla('#ffd23f', '#e09a16'), matBase({ emissive: '#8a5a00', emissiveIntensity: 0.55 }), N),
    hoja: new THREE.InstancedMesh(geoHoja(), matBase({ side: THREE.DoubleSide }), N),
    sombra: (() => { const g = new THREE.CircleGeometry(0.5, 20); g.rotateX(-Math.PI / 2); return new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#16240f', transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), N); })(),
  };
  for (const k in MALLAS) { const m = MALLAS[k]; m.count = 0; m.visible = false; m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.name = 'semillas:' + k; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); R.scene.add(m); }
  MALLAS.sombra.renderOrder = 1;
  const dummy = new THREE.Object3D();

  // ---------- Estado ----------
  const pool = []; for (let i = 0; i < N; i++) pool.push({ on: false, tipo: 'semilla', x: 0, y: 0, z: 0, x0: 0, z0: 0, vy: 0, fase: 0, giro: 0, suelo: 0, sup: 0, amp: 0 });
  const E = { fase: 'nada', t: 0, penal: 0, puntos: 0, semillas: 0, doradas: 0, hojas: 0, mejor: leerRec(), nuevo: false, prox: 0, racha: 0, ultimaT: -9, avisos: 0, msgT: 0 };
  const restante = () => Math.max(0, DUR - E.t - E.penal);
  function soltar(tipo) {
    const s = pool.find(p => !p.on); if (!s) return null;
    const a = rnd(0, Math.PI * 2), d = rnd(2.5, 12);
    s.on = true; s.tipo = tipo || (azar() < 0.1 ? 'dorada' : azar() < 0.2 ? 'hoja' : 'semilla');
    s.x = s.x0 = S.pos.x + Math.cos(a) * d; s.z = s.z0 = S.pos.z + Math.sin(a) * d;
    s.sup = superficie(s.x, s.z);
    s.y = Math.max(s.sup, S.pos.y) + rnd(7, 11);
    s.vy = s.tipo === 'dorada' ? rnd(2.5, 2.9) : s.tipo === 'hoja' ? rnd(1.1, 1.4) : rnd(1.6, 2.2);
    s.amp = s.tipo === 'hoja' ? rnd(0.9, 1.4) : rnd(0.1, 0.25); s.fase = rnd(0, 6.28); s.giro = rnd(0, 6.28); s.suelo = 0;
    return s;
  }
  function vaciar() { for (const s of pool) s.on = false; pintar(); }
  function pintar() {
    const n = { semilla: 0, dorada: 0, hoja: 0, sombra: 0 };
    for (const s of pool) {
      if (!s.on) continue;
      const fuera = s.suelo > EN_SUELO ? Math.max(0, 1 - (s.suelo - EN_SUELO) / 0.4) : 1;
      const esc = (s.tipo === 'dorada' ? 2.0 : s.tipo === 'hoja' ? 1.5 : 1.7) * fuera;
      dummy.position.set(s.x, s.y, s.z);
      if (s.tipo === 'hoja') dummy.rotation.set(Math.sin(s.fase * 1.3) * 0.9, s.giro, Math.sin(s.fase) * 0.7);
      else dummy.rotation.set(Math.sin(s.fase) * 0.25, s.giro, Math.cos(s.fase * 0.8) * 0.25);
      dummy.scale.setScalar(esc); dummy.updateMatrix();
      MALLAS[s.tipo].setMatrixAt(n[s.tipo]++, dummy.matrix);
      if (s.tipo !== 'hoja' && s.suelo === 0) { // la sombra dice dónde caerá; crece al acercarse
        const k = Math.max(0.35, Math.min(1.1, 1.25 - (s.y - s.sup) / 12));
        dummy.position.set(s.x, s.sup + 0.06, s.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(k * (s.tipo === 'dorada' ? 1.2 : 1)); dummy.updateMatrix();
        MALLAS.sombra.setMatrixAt(n.sombra++, dummy.matrix);
      }
    }
    const ver = E.fase === 'juego';
    for (const k in MALLAS) { const m = MALLAS[k]; m.count = n[k]; m.visible = ver && n[k] > 0; m.instanceMatrix.needsUpdate = true; }
  }
  function atrapar(s) {
    s.on = false;
    const seguidas = E.t - E.ultimaT < 2.5; E.ultimaT = E.t; E.racha = seguidas ? E.racha + 1 : 0;
    try { if (G.fx && G.fx.burst) G.fx.burst(s.x, s.y, s.z, s.tipo === 'hoja' ? 'leaves' : 'gold', s.tipo === 'dorada' ? 20 : 8); } catch (e) { /* sin fx */ }
    if (s.tipo === 'hoja') { E.hojas++; E.penal += 1; E.racha = 0; sonar('frenada'); aviso(L('Hoja seca: −1 s', 'Dry leaf: −1 s'), 'malo'); }
    else {
      E.puntos += PTS[s.tipo]; if (s.tipo === 'dorada') { E.doradas++; sonar('encaje'); sonar('semilla', 9); aviso(L('¡Dorada! +5', 'Golden! +5'), 'oro'); } else { E.semillas++; sonar('semilla', E.racha); }
    }
    pintarHud();
  }
  function paso(dt) {
    if (E.fase !== 'juego' || !(dt > 0)) return;
    E.t += dt;
    if (E.msgT > 0 && (E.msgT -= dt) <= 0 && hudEl) { const m = hudEl.querySelector('[data-k="msg"]'); m.textContent = ''; m.className = ''; }
    const prog = Math.min(1, E.t / DUR);
    E.prox -= dt;
    if (E.prox <= 0) { soltar(); E.prox = 0.85 - prog * 0.4; }
    const vx = S.pos.x, vy = S.pos.y + 0.6, vz = S.pos.z;
    for (const s of pool) {
      if (!s.on) continue;
      s.fase += dt * (s.tipo === 'hoja' ? 2.4 : 1.6); s.giro += dt * (s.tipo === 'dorada' ? 2.6 : 0.9);
      if (s.suelo > 0) { s.suelo += dt; if (s.suelo > EN_SUELO + 0.4) { s.on = false; continue; } }
      else {
        s.y -= s.vy * dt;
        s.x = s.x0 + Math.sin(s.fase) * s.amp; s.z = s.z0 + Math.cos(s.fase * 0.7) * s.amp * 0.6;
        if (s.y <= s.sup + 0.2) { s.y = s.sup + 0.2; s.suelo = dt; }
      }
      const dx = s.x - vx, dz = s.z - vz;
      if (dx * dx + dz * dz < ALC * ALC && Math.abs(s.y - vy) < ALC_Y) atrapar(s);
    }
    const r = restante();
    if (E.avisos === 0 && r <= 10) { E.avisos = 1; sonar('aviso'); }
    if (E.avisos === 1 && r <= 5) { E.avisos = 2; sonar('aviso'); }
    pintar();
    if (r <= 0) { fin(); return; }
    if (hudEl && Math.floor((E.t - dt) * 4) !== Math.floor(E.t * 4)) pintarHud();
  }
  G.on('update', (dt, busy) => { if (!G.quiet && !busy) paso(Math.min(0.05, dt || 0)); });

  // ---------- HUD y panel final ----------
  let hudEl = null, finEl = null;
  const ICONO = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><ellipse cx="12" cy="15" rx="6" ry="7.5" fill="#93602e"/><path d="M6.2 14.5q5.8 2 11.6 0" stroke="#5e3a1a" stroke-width="1.6" fill="none"/><path d="M12 7.5V4" stroke="#4f9a3a" stroke-width="1.6"/><ellipse cx="8.8" cy="4" rx="3" ry="1.3" fill="#74c94e" transform="rotate(25 8.8 4)"/><ellipse cx="15.2" cy="4" rx="3" ry="1.3" fill="#62b443" transform="rotate(-25 15.2 4)"/></svg>';
  function css() {
    if (document.getElementById('sem-css')) return;
    const st = document.createElement('style'); st.id = 'sem-css';
    st.textContent = '#sem-hud{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 10px);z-index:60;display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 24px);box-sizing:border-box;padding:6px 8px 6px 14px;border-radius:20px;background:rgba(16,36,28,.86);color:#fff8e6;font:600 15px Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}#sem-hud[hidden],#sem-fin[hidden]{display:none}' +
      '#sem-hud .sem-n{display:flex;align-items:center;gap:4px;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}#sem-hud .sem-t{font-variant-numeric:tabular-nums;font-size:18px;font-weight:700;min-width:3.2ch;text-align:center}#sem-hud .sem-t.poco{color:#ffb4a2}#sem-hud .sem-r{opacity:.85;font-size:14px}' +
      '#sem-hud [data-k="msg"]{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;padding:4px 12px;border-radius:999px;font-weight:700;pointer-events:none}#sem-hud [data-k="msg"]:empty{display:none}#sem-hud [data-k="msg"].oro{background:#ffd23f;color:#3b2a14}#sem-hud [data-k="msg"].malo{background:#ffd0c4;color:#5a1e10}' +
      '#sem-hud button,#sem-fin button{min-height:44px;min-width:44px;padding:4px 16px;border-radius:22px;border:0;font:700 16px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}#sem-hud button.salir,#sem-fin button.salir{background:#ffd0c4}#sem-hud button:focus-visible,#sem-fin button:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}' +
      '#sem-fin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(380px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;padding:18px 18px 16px;border-radius:24px;background:rgba(16,36,28,.94);color:#fff8e6;font-family:Fredoka,system-ui,sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.45);display:flex;flex-direction:column;align-items:center;gap:8px}' +
      '#sem-fin h2{margin:0;font-size:26px}#sem-fin .sem-gran{display:flex;align-items:center;gap:8px;font-size:44px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}#sem-fin .sem-gran svg{width:40px;height:40px}#sem-fin p{margin:0;font-size:17px;font-weight:600}#sem-fin .sem-det{font-size:15px;opacity:.85;font-weight:500}#sem-fin .sem-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}' +
      '@media (orientation:landscape) and (max-height:500px){#sem-fin{padding:12px 16px;gap:4px}#sem-fin h2{font-size:21px}#sem-fin .sem-gran{font-size:34px}}' +
      'body.semillas-on :is(#quest,#inv,#modo-salir){visibility:hidden!important}' +
      // F20 r2: el aviso de las instrucciones va debajo de la barra del juego (se cruzaban y no se leía ninguno) y se esconde con el panel final
      '@media (orientation:landscape){body.semillas-on #toast{top:calc(env(safe-area-inset-top,0px) + 74px)!important;bottom:auto!important}}' +
      'body.semillas-on:has(#sem-fin:not([hidden])) #toast{visibility:hidden!important}' +
      // F22: el panel final es modal: el HUD del mundo y el del juego se apartan (como en Planeo y Rescate rápido)
      'body.semillas-fin :is(#minimapa,#guia-hud,#keyhint,#acts,#stick,#emotes,#tag,#sys,#sys button,#b-diary,#b-emotes,#b-nido,#b-menu,#b-dive,#v18-exp-poder,#sem-hud){visibility:hidden!important}';
    document.head.appendChild(st);
  }
  function montar() {
    if (hudEl) return;
    css();
    hudEl = document.createElement('div'); hudEl.id = 'sem-hud'; hudEl.hidden = true; hudEl.setAttribute('role', 'status');
    hudEl.innerHTML = '<b data-k="t" class="sem-tit"></b><span class="sem-n">' + ICONO + '<span data-k="n"></span></span><span class="sem-t" data-k="r"></span><span class="sem-r" data-k="rec"></span><span data-k="msg" aria-live="polite"></span><button type="button" class="salir" data-a="salir"></button>';
    finEl = document.createElement('div'); finEl.id = 'sem-fin'; finEl.hidden = true; finEl.setAttribute('role', 'dialog'); finEl.setAttribute('aria-modal', 'true'); finEl.setAttribute('aria-labelledby', 'sem-fin-t');
    finEl.innerHTML = '<h2 id="sem-fin-t" data-k="ft"></h2><div class="sem-gran">' + ICONO + '<span data-k="fn"></span></div><p data-k="fmsg" aria-live="polite"></p><p class="sem-det" data-k="fdet"></p><div class="sem-bots"><button type="button" data-a="otra"></button><button type="button" class="salir" data-a="salir"></button></div>';
    const clic = e => { const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; e.preventDefault(); if (b.dataset.a === 'otra') jugar(); else salir(); };
    hudEl.addEventListener('click', clic); finEl.addEventListener('click', clic);
    document.body.appendChild(hudEl); document.body.appendChild(finEl);
  }
  const q = (el, k) => el.querySelector('[data-k="' + k + '"]');
  // En el teléfono (estrecho) el título sobra: el HUD queda en una sola fila y no tapa los botones de arriba
  const estrecho = () => innerWidth < 600;
  function pintarHud() {
    if (!hudEl) return;
    const t = q(hudEl, 't'); t.textContent = L('Semillas al vuelo', 'Seeds on the wing'); t.hidden = estrecho();
    q(hudEl, 'n').textContent = String(E.puntos); q(hudEl, 'n').parentNode.setAttribute('aria-label', L('Semillas: ', 'Seeds: ') + E.puntos);
    const r = q(hudEl, 'r'); r.textContent = reloj(restante()); r.classList.toggle('poco', restante() <= 10);
    q(hudEl, 'rec').textContent = E.mejor ? L('Récord ', 'Best ') + E.mejor : '';
    hudEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }
  function aviso(txt, cls) { if (!hudEl) return; const m = q(hudEl, 'msg'); m.textContent = txt; m.className = cls || ''; E.msgT = 1.2; }
  function pintarFin() {
    if (!finEl) return;
    const n = E.puntos;
    q(finEl, 'ft').textContent = L('¡Tiempo!', 'Time’s up!');
    q(finEl, 'fn').textContent = String(n);
    q(finEl, 'fmsg').textContent = E.nuevo ? L(`¡Nuevo récord: ${n} ${n === 1 ? 'semilla' : 'semillas'}!`, `New record: ${n} ${n === 1 ? 'seed' : 'seeds'}!`)
      : L(`Atrapaste ${n} ${n === 1 ? 'semilla' : 'semillas'}. Récord: ${E.mejor}`, `You caught ${n} ${n === 1 ? 'seed' : 'seeds'}. Best: ${E.mejor}`);
    q(finEl, 'fdet').textContent = L(`Doradas: ${E.doradas} · Hojas secas: ${E.hojas}`, `Golden: ${E.doradas} · Dry leaves: ${E.hojas}`);
    finEl.querySelector('[data-a="otra"]').textContent = L('Otra vez', 'Play again');
    finEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }

  // ---------- Partida ----------
  function jugar(o) {
    o = o || {};
    azarS = o.semilla || 0;
    montar(); vaciar();
    Object.assign(E, { fase: 'juego', t: 0, penal: 0, puntos: 0, semillas: 0, doradas: 0, hojas: 0, nuevo: false, prox: 0.6, racha: 0, ultimaT: -9, avisos: 0, msgT: 0 });
    E.mejor = leerRec();
    for (let i = 0; i < 4; i++) { const s = soltar(i === 3 ? 'dorada' : 'semilla'); if (s) s.y -= i * 1.6; } // que no empiece con el cielo vacío
    hudEl.hidden = false; finEl.hidden = true; q(hudEl, 'msg').textContent = '';
    document.body.classList.add('semillas-on'); document.body.classList.remove('semillas-fin');
    try { if (G.menuModos && G.menuModos.encuadrar) G.menuModos.encuadrar(); } catch (e) { /* sin menú */ } // F20 r2: sin ladera ni techo delante de la cámara
    pintarHud(); pintar();
    if (!o.callado && G.ui && G.ui.toast) G.ui.toast(L('¡Semillas al vuelo! Atrápalas antes de que lleguen al suelo. Las doradas valen 5 y las hojas secas te quitan 1 segundo.', 'Seeds on the wing! Catch them before they reach the ground. Golden ones are worth 5, and dry leaves take 1 second off.'), 3200);
    sonar('boton');
    return true;
  }
  function fin() {
    E.fase = 'fin'; vaciar();
    E.nuevo = E.puntos > E.mejor; if (E.nuevo) { E.mejor = E.puntos; guardarRec(E.puntos); }
    try { G.emit('record', { modo: 'semillas', puntos: E.puntos }); } catch (e) { /* */ }
    sonar('panel_final'); if (E.nuevo && E.puntos > 0) setTimeout(() => sonar('logro'), 700);
    pintarHud(); pintarFin(); finEl.hidden = false; document.body.classList.add('semillas-fin');
    const otra = finEl.querySelector('[data-a="otra"]'); setTimeout(() => { try { if (!finEl.hidden) otra.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
  }
  const activo = () => E.fase !== 'nada';
  function salir() {
    if (!activo()) return false;
    E.fase = 'nada'; vaciar();
    if (hudEl) { hudEl.hidden = true; finEl.hidden = true; [hudEl, finEl].forEach(el => el.querySelectorAll('[data-k]').forEach(x => { x.textContent = ''; })); } // sin texto viejo (ni en otro idioma)
    document.body.classList.remove('semillas-on', 'semillas-fin');
    return true;
  }
  addEventListener('keydown', e => {
    if (activo() && E.fase === 'fin' && e.key === 'Tab' && finEl && !finEl.hidden && !(G.ui && G.ui.cardOpen)) { // F22: el foco no sale del panel, da la vuelta entre sus botones
      e.preventDefault(); e.stopImmediatePropagation();
      const bs = [...finEl.querySelectorAll('button')], i = bs.indexOf(document.activeElement), n = bs.length;
      const j = e.shiftKey ? (i <= 0 ? n - 1 : i - 1) : (i < 0 || i >= n - 1 ? 0 : i + 1);
      try { bs[j].focus({ preventScroll: true }); } catch (er) { /* */ }
      return;
    }
    if (!activo() || e.key !== 'Escape' || e.repeat) return;
    if (G.ui && G.ui.cardOpen) return; // una tarjeta abierta encima se cierra primero
    e.preventDefault(); e.stopImmediatePropagation(); salir();
  }, true);

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })(), pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ }
      jugar({ semilla: 11, callado: true });
      const vivas = () => pool.filter(s => s.on);
      check('Se abre con el HUD (semillas, reloj 1:15 y «Salir» de ≥ 44 px) y semillas cayendo, una dorada', activo() && !hudEl.hidden && finEl.hidden && q(hudEl, 'n').textContent === '0' && q(hudEl, 'r').textContent === '1:15' && hudEl.querySelector('[data-a="salir"]').getBoundingClientRect().height >= 44 && vivas().length === 4 && vivas().some(s => s.tipo === 'dorada') && document.body.classList.contains('semillas-on'),
        q(hudEl, 'r').textContent + ' · ' + vivas().length);
      check('Las semillas se dibujan con mallas instanciadas (sombra donde caerán)', MALLAS.semilla.visible && MALLAS.semilla.count >= 1 && MALLAS.dorada.count === 1 && MALLAS.sombra.count >= 4, ['semilla', 'dorada', 'hoja', 'sombra'].map(k => k + ':' + MALLAS[k].count).join(' '));
      const y0 = vivas()[0].y; paso(0.05); paso(0.05); for (let i = 0; i < 12; i++) paso(0.05);
      check('Caen con el tiempo y salen más', vivas()[0] && vivas()[0].y < y0 && vivas().length >= 5, y0.toFixed(1) + ' → ' + (vivas()[0] ? vivas()[0].y.toFixed(1) : '-'));
      // Atrapar: Vittata justo en la semilla (sin soltar más mientras tanto)
      E.prox = 1e9;
      const lejos = () => { S.pos.x = pos0.x + 500; S.pos.z = pos0.z + 500; };
      const ir = s => { S.pos.x = s.x; S.pos.z = s.z; S.pos.y = s.y - 0.6; };
      vaciar(); const s1 = soltar('semilla'); ir(s1); paso(0.016); lejos();
      check('Atrapar una semilla suma 1', E.puntos === 1 && !s1.on && q(hudEl, 'n').textContent === '1', E.puntos);
      vaciar(); const s2 = soltar('dorada'); ir(s2); paso(0.016); lejos();
      check('Una dorada suma 5 y lo dice', E.puntos === 6 && E.doradas === 1 && /\+5/.test(q(hudEl, 'msg').textContent), E.puntos + ' · ' + q(hudEl, 'msg').textContent);
      vaciar(); const r0 = restante(), s3 = soltar('hoja'); ir(s3); paso(0.016); lejos();
      check('Una hoja seca quita 1 segundo (no resta semillas)', Math.abs((r0 - restante()) - 1.016) < 0.01 && E.puntos === 6 && E.hojas === 1 && /−1 s/.test(q(hudEl, 'msg').textContent), (r0 - restante()).toFixed(3));
      vaciar(); const s4 = soltar('semilla'); lejos(); s4.x0 = s4.x = pos0.x; s4.z0 = s4.z = pos0.z; s4.sup = superficie(s4.x, s4.z); s4.y = s4.sup + 1; s4.amp = 0;
      for (let i = 0; i < 20; i++) paso(0.05);
      const enSuelo = s4.on && s4.suelo > 0; for (let i = 0; i < 50; i++) paso(0.05);
      check('Lo que llega al suelo espera un momento y se va', enSuelo && !s4.on);
      // El reloj termina: panel con récord, «Otra vez» y «Salir»
      lejos(); E.t = DUR - E.penal - 0.1; paso(0.2);
      check('El reloj termina: panel final con semillas, «¡Nuevo récord!», «Otra vez» y «Salir»', E.fase === 'fin' && !finEl.hidden && q(finEl, 'fn').textContent === '6' && /Nuevo récord: 6 semillas/.test(q(finEl, 'fmsg').textContent) && !!finEl.querySelector('[data-a="otra"]') && !!finEl.querySelector('[data-a="salir"]') && !MALLAS.semilla.visible, q(finEl, 'fmsg').textContent);
      check('El récord se guarda en este dispositivo', leerRec() === 6);
      const bots = [...finEl.querySelectorAll('button'), hudEl.querySelector('button')].map(b => b.getBoundingClientRect());
      const fr = finEl.getBoundingClientRect(), hr = hudEl.getBoundingClientRect();
      check('Cabe en la pantalla: panel y HUD dentro, botones ≥ 44 px', bots.every(b => b.height >= 44 && b.width >= 44) && fr.left >= 0 && fr.right <= innerWidth && fr.top >= 0 && fr.bottom <= innerHeight && hr.left >= 0 && hr.right <= innerWidth && hr.bottom < innerHeight * 0.3, `${innerWidth}×${innerHeight} · panel ${Math.round(fr.width)}×${Math.round(fr.height)} · HUD ${Math.round(hr.width)}×${Math.round(hr.height)}`);
      { // F22: el panel final es modal (aria-modal, el foco da la vuelta entre sus dos botones y el HUD de detrás no se ve)
        const vis = id => { const el = document.getElementById(id); return !!el && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0; };
        finEl.querySelector('[data-a="otra"]').focus(); const enPanel = [];
        for (let i = 0; i < 3; i++) { const t = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); dispatchEvent(t); enPanel.push(t.defaultPrevented && finEl.contains(document.activeElement)); }
        const tS = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); dispatchEvent(tS); enPanel.push(finEl.contains(document.activeElement));
        const fuera = ['b-diary', 'b-menu', 'b-emotes', 'minimapa', 'sem-hud', 'acts', 'stick'].filter(vis);
        check('El panel final es modal: aria-modal, Tab no sale de «Otra vez»/«Salir» y el HUD de detrás no se ve', finEl.getAttribute('aria-modal') === 'true' && enPanel.every(Boolean) && !fuera.length && document.body.classList.contains('semillas-fin'), enPanel.join(',') + (fuera.length ? ' · se ve ' + fuera.join(',') : '')); }
      finEl.querySelector('[data-a="otra"]').click();
      check('«Otra vez» empieza de nuevo (0 semillas, 1:15, sin panel)', E.fase === 'juego' && E.puntos === 0 && finEl.hidden && q(hudEl, 'r').textContent === '1:15' && /Récord 6/.test(q(hudEl, 'rec').textContent), q(hudEl, 'rec').textContent);
      lejos(); E.t = DUR; paso(0.1);
      check('Sin superar el récord: «Atrapaste 0 semillas. Récord: 6»', /Atrapaste 0 semillas\. Récord: 6/.test(q(finEl, 'fmsg').textContent) && leerRec() === 6, q(finEl, 'fmsg').textContent);
      const ae = G.aula && G.aula.aj, idi0 = ae ? ae.idioma : null;
      if (ae) { ae.idioma = 'en'; pintarHud(); pintarFin(); check('En inglés: «Time’s up!», «Play again», «Exit» y «Best»', q(finEl, 'ft').textContent === 'Time’s up!' && finEl.querySelector('[data-a="otra"]').textContent === 'Play again' && hudEl.querySelector('[data-a="salir"]').textContent === 'Exit' && /You caught 0 seeds\. Best: 6/.test(q(finEl, 'fmsg').textContent)); ae.idioma = idi0; pintarHud(); pintarFin(); }
      finEl.querySelector('[data-a="salir"]').click();
      check('«Salir» lo quita todo (HUD, panel, clase y semillas)', !activo() && hudEl.hidden && finEl.hidden && !document.body.classList.contains('semillas-on') && pool.every(s => !s.on) && Object.values(MALLAS).every(m => !m.visible));
      jugar({ semilla: 3, callado: true });
      const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); dispatchEvent(ev);
      check('Esc en plena partida también sale', !activo() && ev.defaultPrevented && hudEl.hidden);
      check('Sonidos de assets/audio/sfx (semilla, encaje, frenada, aviso, panel_final)', !G.audio || !G.audio.has || ['semilla', 'encaje', 'frenada', 'aviso', 'panel_final'].every(n => G.audio.has(n)));
    } catch (e) { check('Sin errores', false, e && (e.stack || e.message)); }
    finally {
      salir(); G.quiet = q0; azarS = 0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ } E.mejor = leerRec();
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  G.semillasApi = { jugar, salir, activo, paso, test, estado: () => ({ fase: E.fase, puntos: E.puntos, restante: restante(), mejor: E.mejor, vivas: pool.filter(s => s.on).length }) };
  return G.semillasApi;
};
