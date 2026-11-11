/* Juego · V18.3 fase 5 · Maestro Moon, gato mentor (entrenamiento amistoso): «Entrenamiento de esquiva» (G.v18moon).
   Directiva docs/DIRECTIVA_V18_3_RESOLUCION.md §6E y §12; sistema de personajes docs/equipo/V18_3_DISENO.md §1 (src/game/v18/npc.js,
   fila de datos 'maestromoon' en content/comun/personajes_v18.js). Contenido opcional del mundo abierto: no toca los capítulos ni sus misiones.
   - Dónde: un claro llano de las Lomas del Oeste (junto a la casita), lejos del Puerto de La Mina, del minigolf, de la
     explanada del duelo, de la carrera con Chispa y del puente roto. Sitio fijo sin edificios medido en el mapa y en el juego con
     todo cargado (terreno, agua, colisiones y sólidos); la flora del círculo se despeja al activarse, como en el duelo. La prueba
     vuelve a medirlo (check 5).
   - Moon sale con el sistema único de NPC: carga diferida (el .glb no se pide hasta que Vittata está a < 90 m), máx. 2 a la vez.
   - El entrenamiento: Acción junto a Moon → reto → cuenta 3-2-1 → 30 s esquivando bolas de luz lentas que Moon lanza desde su
     sitio hacia donde estaba Vittata al lanzarlas. Menos de 3 toques al final = victoria; al tercer toque el entreno acaba.
     Sin violencia: las bolas son luz, no hacen daño; Moon anima y celebra. Alejarse > 45 m o volar alto (> 11 m del suelo 3 s)
     lo cancela. Nada de presión: «¿Otra ronda?» y ya.
   - Progreso V18 (G.v18.mundo('entreno_moon') = { mejor (mínimo de toques en un entreno ganado), victorias, jugadas, xp }).
     30 XP de G.v18evo una sola vez, al ganar la primera (también si evolucion.js llega después). «Comenzar de cero» lo borra con el resto de la V18.
   - Minimapa: marcador propio (luna creciente, con nombre) en Moon mientras dure el módulo (minimapa.js, mapa()).
   Solo con la bandera V18 (src/boot.js). Prueba: AV.v18MoonTest(). */
window.AVV18Moon = function (G) {
  'use strict';
  if (G.v18moon) return G.v18moon;
  const V = G.v18 || window.AVV18Progreso(G);
  const N = G.v18npc || window.AVV18Npc(G);
  const S = G.S, T = G.terreno, F = G.fisica, scene = G.renderer.scene;
  const ID = 'entreno_moon', NPC = 'maestromoon', XP_GANAR = 30;
  const DUR_S = 30, CUENTA_S = 3, MAX_TOQUES = 3, V_ORB = 4.2, CADENCIA_S = 2.6, PRIMERA_S = 1.6;
  const R_ORB = 0.26, R_HIT = 0.8, GRACIA_S = 0.45, MERCY_S = 1.2, VIDA_S = 4.5, R_SALE = 45, ALTO_MAX = 11, ALTO_T_S = 3;
  // Medido en el mapa real y en el juego (sonda de terreno, agua, colisiones, troncos y sólidos; ver la prueba, check 5)
  // (plano a ≤ 1,1 m en el círculo de 11 m; h ≈ 16; a > 115 m de puerto/villa/golf/duelo/chispa/misterio).
  // QA-201: en (-150.5, 14) había matorrales y una raíz dentro del círculo (sólidos en (-149.4, 16.8), (-161.5, 14) y (-154.7, 3.8);
  // tronco a -0,16 m): Moon entrenaba entre la flora. Se corre 14,6 m al NNE, al claro de verdad medido con la misma sonda
  // (libre 1,8 m, pendiente 0,056, en seco y sin sólidos).
  // QA-203: esa sonda midió sin la zona kelvin_aldea_rio_oeste cargada. Con todo cargado (lo que ve el jugador) el círculo caía
  // sobre monumento_b #0 (en -147,4, 30,6: libre -6,4 m, 16 sólidos): Moon entrenaba dentro de un edificio. Con todo cargado no
  // hay en el mapa ningún círculo de 11 m llano y sin troncos que no sea un solar de edificio, así que, como la explanada del duelo
  // (precedente aprobado por Kelvin, DECISIONES C4), se despeja solo la flora del claro (despejarSitio, abajo). Sitio nuevo en las
  // Lomas del Oeste, a 42 m de la casita: sin edificios, muros, colliders ni sólidos a < 14 m del círculo en los datos del mapa
  // (huellas de escena_kelvin_cap1.json, colisiones, estructuras, plazas y props) y medido en el juego con todo cargado (check 5:
  // libre 1,96 m tras despejar 52 instancias de flora, pendiente 0,04, en seco, 0 sólidos; a 288 m de la villa y 318 m del puerto).
  // Otros candidatos medidos igual (flora a despejar / pendiente): (-172, 166) 54 / 0,025; (-186, 142) 44 / 0,046 (a ~40 m del
  // acantilado del oeste); (-214, 128) 51 / 0,026 (a 16 m del acantilado). Se elige el más céntrico y accesible a pie.
  const SITIO = { x: -138, z: 162, rotY: 1.57 };
  const TXT = {
    nombre: 'Entrenamiento con Moon', label: 'Entrenar la esquiva con Moon',
    reto: ['Bienvenida a mi claro, pequeña cotorra. Yo soy Moon: aquí se entrena la esquiva, paso a paso.', 'Lanzaré bolas de luz MUY lentas. Aguanta 30 s con menos de 3 toques y el entreno es tuyo. ¿Empezamos?'],
    revancha: ['¿Otra ronda? Recuerda: no persigas la bola, deja que pase y aparta el cuerpo.'],
    cuenta: '¡Esquiva las bolas de luz! Menos de 3 toques en 30 s.',
    ya: '¡Ya!', quedan: 'Quedan {} s', toques: 'Toques {}/' + MAX_TOQUES, record: 'Mejor marca',
    gana: ['¡Bien hecho! Tu cuerpo respondió antes que tu cabeza. Eso es la esquiva.', 'Vuelve cuando quieras: la práctica hace al vuelo.'],
    pierde: ['Tres toques. No pasa nada: hasta las águilas aprenden cayendo.', 'Descansa un momento y lo intentamos otra vez.'],
    nuevo: '¡Nuevo récord: solo {} toques!',
    xp: 'Tu aventura cuenta: +{} XP para tu cotorra.',
    lejos: 'Te alejaste del claro: el entrenamiento con Moon queda para otro rato.',
    alto: 'El entreno es en el suelo: baja a entrenar la esquiva de verdad.',
    esquiva: 'Esquivar', esquivaA: 'Acción: esquivar con un impulso',
    // Cómo se juega, sin leer párrafos (Kelvin 8-nov, como en el duelo): meta siempre a la vista, teclas, pistas y resultado claro
    metaTxt: 'Esquiva las bolas de luz: 3 toques y se acaba', kMover: 'Moverte', kImpulso: 'Impulso', tImpulso: 'Impulso',
    pViene: '¡Ahí viene! Apártate de lado', pToque: '¡Te tocó! Muévete de lado o pulsa {} para un impulso', pToqueT: '¡Te tocó! Muévete de lado o pulsa Impulso',
    fGana: '¡Entreno superado!', fPierde: '¡Tres toques!', fToques: 'Toques: {} de 3', fOtra: 'Otra vez: no te quedes quieta',
    salir: 'Salir' // ya está en content/cap1/en.js («Leave»); no invento otra frase
  };
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 2600); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18moon', ev); } catch (e) { /* sin oyentes */ } };
  const H = (x, z) => T.height(x, z);
  const reloj = s => (Math.max(0, s)).toFixed(1).replace('.', ',') + ' s';

  const A = { fase: 'nada', t: 0, cuenta: 0, toques: 0, mercy: 0, lanzarEn: 0, altoT: 0, orbs: [], forzar: false, manual: false, ultimo: null, xpT: 0 };
  const activa = () => !!((G.V18 && G.pack && G.pack.id === 'cap1') || A.forzar); // QA-192: la actividad es de Villa Raíz; la prueba la fuerza con A.forzar

  // ---------- Progreso ----------
  function record() { const r = V.mundo(ID); return r && typeof r === 'object' ? r : null; }
  function pagarXP() {
    const r = record();
    if (!r || !(r.victorias > 0) || r.xp || !G.v18evo || !G.v18evo.dar) return 0;
    V.cambiarMundo(ID, Object.assign({}, r, { xp: true })); // primero se marca: nunca dos veces
    const n = G.v18evo.dar(V.seleccionada ? V.seleccionada() || 'vittata' : 'vittata', XP_GANAR, 'moon') || 0;
    if (n) toast(TXT.xp.replace('{}', n), 2800);
    return n;
  }

  // ---------- Bolas de luz (pool fijo: 0 assets, ≤3 vivas) ----------
  const gOrbs = new THREE.Group(); gOrbs.name = 'v18moon:orbs'; gOrbs.visible = false; scene.add(gOrbs);
  const mOrb = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd76a').convertSRGBToLinear() });
  const mGlowCv = document.createElement('canvas'); mGlowCv.width = mGlowCv.height = 64;
  (() => { const g = mGlowCv.getContext('2d'), gr = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,236,170,.95)'); gr.addColorStop(0.45, 'rgba(255,214,106,.45)'); gr.addColorStop(1, 'rgba(255,214,106,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); })();
  const mGlow = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mGlowCv), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const POOL = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(R_ORB, 12, 10), mOrb);
    const sp = new THREE.Sprite(mGlow); sp.scale.set(1.6, 1.6, 1); m.add(sp);
    m.visible = false; gOrbs.add(m); POOL.push(m);
  }
  function lanzar() {
    const o = POOL.find(p => !p.visible); if (!o) return false;
    const ox = A.mx, oy = H(A.mx, A.mz) + 1.05, oz = A.mz; // de la «mano» de Moon, a la altura del pecho de Vittata
    const tx = S.pos.x, ty = S.pos.y + 0.6, tz = S.pos.z;
    let dx = tx - ox, dy = ty - oy, dz = tz - oz; const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    o.position.set(ox, oy, oz); o.visible = true;
    A.orbs.push({ m: o, vx: dx * V_ORB, vy: dy * V_ORB, vz: dz * V_ORB, t: 0 });
    N.animar(NPC, 'senalar'); // telegrafo: Moon «apunta» al lanzar
    if (!(pista.vistas & 1)) { pista.vistas |= 1; mostrarPista(TXT.pViene); }
    fx('gold', ox, oy, oz, 4); sonar('tick');
    return true;
  }
  function matarOrbs() { for (const o of A.orbs) o.m.visible = false; A.orbs.length = 0; gOrbs.visible = false; }
  function pasoOrbs(dt) {
    gOrbs.visible = A.orbs.length > 0;
    for (let i = A.orbs.length - 1; i >= 0; i--) {
      const o = A.orbs[i];
      o.t += dt;
      o.m.position.x += o.vx * dt; o.m.position.y += o.vy * dt; o.m.position.z += o.vz * dt;
      const p = o.m.position, suelo = H(p.x, p.z);
      let muerta = o.t > VIDA_S || p.y < suelo + 0.12;
      if (p.y < suelo + 0.12) fx('dust', p.x, suelo + 0.1, p.z, 5);
      const d = Math.hypot(S.pos.x - p.x, (S.pos.y + 0.6) - p.y, S.pos.z - p.z);
      if (!muerta && o.t > GRACIA_S && A.mercy <= 0 && d < R_HIT) {
        muerta = true; A.toques++; A.mercy = MERCY_S;
        fx('stars', p.x, p.y, p.z, 10); sonar('pickup');
        toast(TXT.toques.replace('{}', A.toques), 1400);
        if (A.toques < MAX_TOQUES && !(pista.vistas & 2)) { pista.vistas |= 2; mostrarPista(TACTIL ? TXT.pToqueT : TXT.pToque.replace('{}', teclaDe('accion', 'e'))); }
        emitir({ tipo: 'toque', toques: A.toques });
      }
      if (muerta) { o.m.visible = false; A.orbs.splice(i, 1); }
    }
  }

  // ---------- HUD ----------
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    if (!document.getElementById('v18-moon-css')) {
      const st = document.createElement('style'); st.id = 'v18-moon-css';
      st.textContent = '#v18-moon{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(340px,calc(100vw - 32px));z-index:40;' +
        'pointer-events:none;text-align:center;color:#fff;font:inherit;background:rgba(24,26,58,.8);border:2px solid #b9a7ff;border-radius:16px;padding:8px 12px;box-shadow:0 3px 12px rgba(0,0,0,.35)}' +
        '#v18-moon .vm-h{display:flex;align-items:center;justify-content:center;gap:8px}#v18-moon .vm-x{pointer-events:auto;flex:none;min-width:44px;min-height:44px;padding:0 12px;border:0;border-radius:22px;background:#fff3d6;color:#3b2a14;font:inherit;font-size:calc(14px * var(--fs-k,1));font-weight:700}' +
        '#v18-moon .vm-t{font-size:calc(13px * var(--fs-k,1));opacity:.9;letter-spacing:.02em}#v18-moon .vm-l{display:flex;justify-content:space-between;gap:10px;font-size:calc(17px * var(--fs-k,1));font-weight:700;margin-top:2px}' +
        '#v18-moon .vm-n{font-size:calc(46px * var(--fs-k,1));font-weight:800;line-height:1.1;color:#ffd76a;text-shadow:0 2px 0 #6a4dc9}#v18-moon .vm-r{font-size:calc(12px * var(--fs-k,1));opacity:.85;margin-top:2px}' +
        // Cómo se juega (8-nov, patrón del duelo): meta, chips de tecla, pista breve y resultado
        '#v18-moon .vm-m{font-size:calc(14px * var(--fs-k,1));font-weight:700;color:#ffe39a;line-height:1.25;margin-top:2px}' +
        '#v18-moon .vm-k{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;margin-top:5px;font-size:calc(13px * var(--fs-k,1))}#v18-moon .vm-k span{display:inline-flex;align-items:center;gap:4px}' +
        '#v18-moon kbd{font:700 calc(12px * var(--fs-k,1))/1 Fredoka,system-ui,sans-serif;min-width:20px;padding:3px 6px;border-radius:6px;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 0 #0007;text-align:center}' +
        '#v18-moon .vm-pi{margin:6px auto 0;background:rgba(255,227,154,.96);color:#3b2a14;font-weight:600;font-size:calc(14px * var(--fs-k,1));padding:4px 10px;border-radius:14px;animation:vmPista .25s ease-out}#v18-moon [hidden]{display:none}' +
        '@keyframes vmPista{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}' +
        '#v18-moon.fin:not([hidden]){display:flex;flex-direction:column}#v18-moon.fin .vm-h{order:-2}#v18-moon.fin .vm-x{display:none}#v18-moon.fin .vm-n{order:-1}' +
        '#v18-moon.fin .vm-n{font-size:calc(28px * var(--fs-k,1));line-height:1.15}#v18-moon.fin .vm-l,#v18-moon.fin .vm-k,#v18-moon.fin .vm-r,#v18-moon.fin .vm-pi{display:none}' +
        'body:has(#v18-moon:not([hidden])) #toast{z-index:41}' + // auditoría de la otra cuenta (7-nov): el aviso, encima del panel, como en el puerto (W29a: estaba dentro de la regla de #v18-moon, anidada, y no llegaba a #toast)
        // pul3 (QA V18.3): también en escritorio el panel de misiones de la historia no se ve durante el entreno; vuelve al salir (como en el Guardián)
        'body.v18-moon-on #quest,body.v18-moon-on #quest-toggle{visibility:hidden}' +
        // pul3 (accesibilidad): en el teléfono con texto grande el reloj ya no se sale del panel: la fila baja a dos líneas en vez de ir en una sola (antes nowrap)
        // W29a (móvil): el panel, centrado y de 300 px, tapaba el objetivo, los contadores y medio minimapa (Toques 0/3 bajo el mapa). Como en la carrera de Chispa:
        // el objetivo se oculta durante el entreno y el panel va a la izquierda, sin llegar al minimapa
        '@media (max-width:760px){body.v18-moon-on #quest{display:none}#v18-moon{top:calc(env(safe-area-inset-top,0px) + 58px);left:16px;right:auto;margin:0;width:min(300px,calc(100vw - 190px));padding:6px 10px}#v18-moon .vm-n{font-size:calc(30px * var(--fs-k,1));line-height:1}#v18-moon .vm-l{font-size:calc(14px * var(--fs-k,1));flex-wrap:wrap;justify-content:center;column-gap:6px;row-gap:0}' +
        '#v18-moon .vm-m{font-size:calc(13px * var(--fs-k,1))}#v18-moon.fin .vm-n{font-size:calc(22px * var(--fs-k,1))}}';
      document.head.appendChild(st);
    }
    const el = document.createElement('div'); el.id = 'v18-moon'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    // W35 · lector de pantalla: el panel se nombra con su título; los segundos que quedan y el reloj no se anuncian solos (los toques sí)
    el.setAttribute('aria-labelledby', 'vm-t');
    el.innerHTML = '<div class="vm-h"><div class="vm-t" id="vm-t"></div><button type="button" class="vm-x">Salir</button></div><div class="vm-m"></div><div class="vm-n" hidden></div><div class="vm-l"><span class="vm-p" aria-live="off"></span><span class="vm-s"></span></div><div class="vm-r" aria-live="off"></div>' +
      '<div class="vm-k" aria-hidden="true"></div><div class="vm-pi" hidden></div>';
    // CG-123: sin teclado no había un Salir a la vista (solo Esc o alejarse). ≥ 44 px, en PC y en táctil.
    const bx = el.querySelector('.vm-x');
    bx.textContent = TXT.salir;
    bx.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); cancelar('sale'); });
    bx.addEventListener('click', e => { if (e.detail !== 0) return; e.preventDefault(); cancelar('sale'); });
    document.body.appendChild(el);
    const q = c => el.querySelector(c);
    hud = { el, t: q('.vm-t'), m: q('.vm-m'), n: q('.vm-n'), p: q('.vm-p'), s: q('.vm-s'), r: q('.vm-r'), k: q('.vm-k'), pi: q('.vm-pi'), cache: {} };
    hud.t.textContent = TXT.nombre;
    return hud;
  }
  const teclaDe = (a, def) => { const k = ((G.input && G.input.mapa) || {})[a] || def; return k === ' ' ? 'Espacio' : String(k).toUpperCase(); };
  // Chips de tecla (las teclas reales de G.input.mapa; en táctil, el nombre del botón de la pantalla). Cada texto, su propio nodo (se traduce solo)
  function pintarChips() {
    if (!hud) return;
    const mover = [['arriba', 'w'], ['izquierda', 'a'], ['abajo', 's'], ['derecha', 'd']].map(([a, d]) => teclaDe(a, d)).join('');
    const chips = TACTIL ? [[TXT.tImpulso, TXT.esquiva]] : [[mover, TXT.kMover], [teclaDe('accion', 'e'), TXT.kImpulso]];
    const clave = chips.map(c => c.join(':')).join('|');
    if (hud.cache.k === clave) return; hud.cache.k = clave;
    hud.k.textContent = '';
    for (const [k, t] of chips) { const sp = document.createElement('span'), kb = document.createElement('kbd'), b = document.createElement('b'); kb.textContent = k; b.textContent = t; sp.append(kb, b); hud.k.appendChild(sp); }
  }
  // Pistas breves (la primera bola y el primer toque), una vez por entreno
  const pista = { vis: 0, vistas: 0 };
  function mostrarPista(txt) { if (!hud) return; hud.pi.textContent = txt; hud.pi.hidden = false; pista.vis = 3; }
  function pasoPista(dt) { if (hud && pista.vis > 0 && (pista.vis -= dt) <= 0) hud.pi.hidden = true; }
  // Resultado: el panel se queda ~4 s con «¡Entreno superado!» o «¡Tres toques!» (desde el menú se vuelve a los 3,5 s)
  let finT = 0;
  function mostrarFin(gana, toques) {
    if (!hud) return;
    clearTimeout(finT);
    hud.el.classList.add('fin'); hud.el.hidden = false; hud.pi.hidden = true;
    pon('n', gana ? TXT.fGana : TXT.fPierde); hud.n.hidden = false;
    pon('m', gana ? TXT.fToques.replace('{}', toques) : TXT.fOtra);
    document.body.classList.add('v18-moon-on'); // el panel de misiones sigue oculto mientras se ve el resultado (en el teléfono se solapaban)
    finT = setTimeout(ocultarFin, 4200);
  }
  function ocultarFin() { clearTimeout(finT); finT = 0; if (!hud) return; hud.el.classList.remove('fin'); if (A.fase === 'nada') { hud.el.hidden = true; document.body.classList.remove('v18-moon-on'); } }
  const pon = (k, txt) => { if (hud.cache[k] !== txt) { hud.cache[k] = txt; hud[k].textContent = txt; } };
  function pintarHud() {
    if (!hud) return;
    const on = A.fase === 'cuenta' || A.fase === 'entreno';
    if (on && finT) ocultarFin();
    if (!finT) hud.el.hidden = !on;
    document.body.classList.toggle('v18-moon-on', on || !!finT); enganche(on); if (!on) return;
    const n = A.fase === 'cuenta' ? String(Math.max(1, Math.ceil(A.cuenta))) : A.fase === 'entreno' && A.t < 0.8 ? TXT.ya : '';
    hud.n.hidden = !n; pon('n', n);
    pon('m', TXT.metaTxt); pintarChips();
    pon('p', TXT.quedan.replace('{}', String(Math.max(0, Math.ceil(DUR_S - A.t)))));
    pon('s', TXT.toques.replace('{}', String(A.toques)));
    const r = record(); pon('r', r && r.mejor != null ? TXT.record + ': ' + r.mejor + ' · ' + reloj(A.t) : reloj(A.t));
  }

  // QA V18.3: mientras dura el entreno se toma Acción con G.interaccion.modo (patrón de combate.js), para que no diga «Aquí no hay
  // nada para usar»: Acción esquiva con un impulso (el mismo del botón Impulso). Al acabar se devuelve.
  const modo = { activo: () => A.fase === 'cuenta' || A.fase === 'entreno', accion: () => { try { F.tryDash(); } catch (e) { /* sin física */ } }, aviso: () => TXT.esquivaA, verbo: TXT.esquiva };
  let modo0 = null, enganchado = false;
  function enganche(on) {
    if (on === enganchado) return; enganchado = on;
    if (on) { modo0 = G.interaccion.modo; G.interaccion.modo = modo; } else if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
  }

  // ---------- El claro: se despeja solo la flora del círculo (como la explanada del duelo, combate.js despejarSitio) ----------
  // QA-203: con todo cargado no hay en el mapa ningún círculo de 11 m llano, en seco y sin troncos que no sea el solar de un
  // edificio. Precedente aprobado por Kelvin (DECISIONES C4, árboles quitados en el círculo del duelo): se quitan en marcha las
  // instancias de flora con el pie a < 13 m del centro y los árboles cuya copa entra más de 2 m en el círculo. Edificios, muros
  // y modelos no se tocan (el sitio se eligió sin ninguno: check 5).
  const R_DESP = 13, despeje = { n: 0, ultimo: 0 };
  const enDespeje = (cx, cz) => (x, z, m, inf, sc) => {
    const copa = inf && inf.ancho ? 0.4 * inf.ancho * (sc || 1) : 0, d = Math.hypot(x - cx, z - cz);
    return d < R_DESP || d - copa < 9;
  };
  function despejarEn(cx, cz) {
    const VG = G.vegetacion;
    if (!VG || !VG.despejar || !VG.instancias || !Object.keys(VG.instancias).length) return 0;
    const L = R_DESP + 12, n = VG.despejar(cx - L, cz - L, cx + L, cz + L, enDespeje(cx, cz)) || 0;
    return n;
  }
  function despejarSitio() { const n = despejarEn(SITIO.x, SITIO.z); despeje.n += n; despeje.ultimo = n; return n; }

  // ---------- Moon (instancia del sistema de NPC) ----------
  function colocarEnSitio() {
    if (activa()) despejarSitio();
    N.colocar(NPC, { x: SITIO.x, z: SITIO.z, rotY: SITIO.rotY, aparece: activa, comenta: true });
    N.alUsar(NPC, { label: () => TXT.label, use: invitar, visible: () => A.fase === 'nada' && activa() });
  }
  const ponerMoon = () => {
    const inst = N.instancia(NPC); if (!inst) return;
    inst.x = SITIO.x; inst.z = SITIO.z; inst.giro = SITIO.rotY; inst.meta = null;
    inst.raiz.position.set(SITIO.x, H(SITIO.x, SITIO.z), SITIO.z); inst.raiz.rotation.y = SITIO.rotY;
  };

  // ---------- Entrenamiento ----------
  function invitar() {
    if (A.fase !== 'nada') return false;
    const r = record();
    return N.decir(NPC, r && r.jugadas ? TXT.revancha : TXT.reto, () => empezar());
  }
  function empezar(o) {
    o = o || {};
    if (A.fase !== 'nada' || (!activa() && !o.forzar)) return false;
    montarHud(); despejarSitio();
    A.mx = SITIO.x; A.mz = SITIO.z;
    Object.assign(A, { fase: 'cuenta', t: 0, cuenta: CUENTA_S, toques: 0, mercy: 0, lanzarEn: PRIMERA_S, altoT: 0, ultimo: null });
    pista.vis = 0; pista.vistas = 0; hud.pi.hidden = true;
    matarOrbs();
    N.colocar(NPC, { comenta: false, anim: 'idle' });
    ponerMoon();
    toast(TXT.cuenta, 2800); sonar('tick');
    emitir({ tipo: 'empieza' });
    pintarHud();
    return true;
  }
  function terminar(gana) {
    const r0 = record() || {}, r = { mejor: r0.mejor == null ? null : r0.mejor, victorias: r0.victorias || 0, jugadas: (r0.jugadas || 0) + 1, xp: !!r0.xp };
    let nuevo = false;
    if (gana) { r.victorias++; if (r.mejor == null || A.toques < r.mejor) { r.mejor = A.toques; nuevo = true; } }
    V.cambiarMundo(ID, r);
    A.fase = 'nada'; A.ultimo = { gana, toques: A.toques, nuevo };
    matarOrbs(); pintarHud(); mostrarFin(gana, A.toques);
    N.colocar(NPC, { x: SITIO.x, z: SITIO.z, rotY: SITIO.rotY, comenta: true, anim: undefined });
    ponerMoon();
    if (gana) { sonar('unlock'); fx('gold', S.pos.x, S.pos.y + 1.2, S.pos.z, 14); fx('stars', S.pos.x, S.pos.y + 1.8, S.pos.z, 16); toast(TXT.fGana, 2400); if (nuevo) toast(TXT.nuevo.replace('{}', A.toques), 3000); }
    else { sonar('ring'); N.animar(NPC, 'hablar'); }
    if (gana) pagarXP();
    emitir({ tipo: 'fin', gana, toques: A.toques, nuevo });
    N.decir(NPC, gana ? TXT.gana : TXT.pierde);
    return A.ultimo;
  }
  function cancelar(causa) {
    if (A.fase === 'nada') return false;
    A.fase = 'nada'; matarOrbs(); pintarHud();
    N.colocar(NPC, { x: SITIO.x, z: SITIO.z, rotY: SITIO.rotY, comenta: true, anim: undefined });
    ponerMoon();
    if (causa !== 'sale') toast(causa === 'alto' ? TXT.alto : TXT.lejos, 2600); // con Esc no hay aviso (falta un texto propio con su inglés en content/cap1/en.js)
    emitir({ tipo: 'cancela', causa: causa || 'lejos' });
    return true;
  }
  // Esc cede a cualquier capa con su propio Esc (diálogo, tarjeta, overlays, guía de controles, mapa grande, paneles): la actividad no se lo queda
  function otraCapaEsc() {
    const abierta = id => { const x = document.getElementById(id); return !!x && !x.hidden; };
    try {
      if ((G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return true;
      return ['dialog', 'card', 'end', 'comic', 'creator', 'guia-panel', 'guia-leyenda', 'mapa-grande', 'familia', 'criadero', 'maestro'].some(abierta);
    } catch (e) { return true; }
  }
  // W35 · teclado: Esc lo deja (como alejarse, sin contar partida) y no abre además la Pausa (ui.js mira defaultPrevented)
  function teclaEsc(e) {
    if (e.key !== 'Escape' || e.repeat || !(A.fase === 'cuenta' || A.fase === 'entreno')) return;
    if ((e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName)) || (G.pausa && G.pausa.activa && G.pausa.activa()) || otraCapaEsc()) return;
    e.preventDefault(); e.stopImmediatePropagation(); cancelar('sale');
  }
  addEventListener('keydown', teclaEsc, true);
  let reloj3d = 0;
  function paso(dt) {
    reloj3d += dt;
    if (A.fase === 'nada') {
      if ((A.xpT -= dt) <= 0) { A.xpT = 2; if (activa()) { pagarXP(); despejarSitio(); } } // el claro, en cuanto la flora existe (y si se regenera)
      return;
    }
    A.mercy = Math.max(0, A.mercy - dt);
    if (A.fase === 'cuenta') {
     
      if ((A.cuenta -= dt) <= 0) { A.fase = 'entreno'; A.t = 0; A.lanzarEn = PRIMERA_S; sonar('dash'); }
    } else if (A.fase === 'entreno') {
      A.t += dt;
      if ((A.lanzarEn -= dt) <= 0) { A.lanzarEn += CADENCIA_S; lanzar(); }
      pasoOrbs(dt);
      if (A.toques >= MAX_TOQUES) { terminar(false); return; }
      if (A.t >= 20 && !(pista.vistas & 2)) { pista.vistas |= 2; mostrarPista(TACTIL ? TXT.pToqueT : TXT.pToque.replace('{}', teclaDe('accion', 'e'))); }
      if (A.t >= DUR_S) { terminar(true); return; }
      const alej = Math.hypot(S.pos.x - A.mx, S.pos.z - A.mz);
      const alto = S.pos.y - H(S.pos.x, S.pos.z);
      A.altoT = alto > ALTO_MAX ? A.altoT + dt : 0;
      if (alej > R_SALE) { cancelar('lejos'); return; }
      if (A.altoT > ALTO_T_S) { cancelar('alto'); return; }
    } else pasoOrbs(dt); // los restos mueren aunque acabe de cambiar de fase
    pasoPista(dt); pintarHud();
  }
  G.on('update', (dt, busy) => { if (A.manual) return; if (busy && A.fase === 'nada') return; paso(Math.min(dt, 0.1)); }, 48);
  G.on('apply', () => { if (A.fase !== 'nada') { A.fase = 'nada'; matarOrbs(); pintarHud(); } }, 52);
  colocarEnSitio();

  const mapa = () => {
    if (!activa()) return null;
    return { x: SITIO.x, z: SITIO.z, nombre: TXT.nombre };
  };
  const textos = () => { const d = N.def(NPC) || {}, l = [TXT.nombre, TXT.label, TXT.cuenta, TXT.ya, TXT.quedan, TXT.toques, TXT.record, TXT.nuevo, TXT.xp, TXT.lejos, TXT.alto, TXT.salir, TXT.esquiva, TXT.esquivaA,
    TXT.metaTxt, TXT.kMover, TXT.kImpulso, TXT.pViene, TXT.pToque, TXT.pToqueT, TXT.fGana, TXT.fPierde, TXT.fToques, TXT.fOtra].concat(TXT.reto, TXT.revancha, TXT.gana, TXT.pierde);
    for (const e in d.porEstado || {}) l.push(...(d.porEstado[e].dialogo || []));
    if (d.nombre) l.push(d.nombre.es); return l; };

  // ---------- W35 · teclado y lector de pantalla (lo llaman esta prueba y AV.accesibilidadTest) ----------
  function teclado() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    if (A.fase !== 'nada') return out;
    const nombre = el => (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(x => x.textContent.trim()).join(' ') || el.getAttribute('aria-label') || '';
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z }, yaw0 = G.camara.yaw, man0 = A.manual, toast0 = G.ui.toast, r0 = JSON.stringify(record());
    const foco0 = document.activeElement;
    const esc = () => {
      const kd = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.body.dispatchEvent(kd);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }));
      const pz = document.getElementById('pause'); let pausa = false; try { pausa = !!(pz && pz.matches(':popover-open')); if (pausa) pz.hidePopover(); } catch (e) { /* sin popover */ }
      return { prev: kd.defaultPrevented, pausa };
    };
    G.ui.toast = () => {}; A.manual = true;
    try {
      empezar({ forzar: true });
      const el = hud.el;
      check('W35 · Moon: el panel se anuncia (role=status, aria-live) con nombre; el reloj y los segundos que quedan no se leen solos',
        !el.hidden && el.getAttribute('role') === 'status' && el.getAttribute('aria-live') === 'polite' && !!nombre(el) && hud.p.getAttribute('aria-live') === 'off' && hud.r.getAttribute('aria-live') === 'off' && hud.s.getAttribute('aria-live') !== 'off', nombre(el));
      const bx = el.querySelector('.vm-x'), rbtn = bx.getBoundingClientRect();
      check('W35 · Moon: el panel no roba el foco; «Salir» es un botón de al menos 44 px, con nombre, en PC y en táctil',
        document.activeElement === foco0 && bx.tagName === 'BUTTON' && bx.type === 'button' && bx.textContent.trim() === TXT.salir && bx.tabIndex === 0 && rbtn.width >= 44 && rbtn.height >= 44 && getComputedStyle(bx).display !== 'none',
        Math.round(rbtn.width) + '×' + Math.round(rbtn.height));
      bx.focus(); bx.click();
      check('W35 · Moon: Enter o Espacio sobre «Salir» deja el entreno (sin contar partida)', A.fase === 'nada' && el.hidden, A.fase);
      if (document.activeElement === bx) bx.blur();
      empezar({ forzar: true });
      const gp = G.guiaControles && G.guiaControles.prueba, forz0 = gp && gp.forzado;
      if (gp) gp.forzado = 'teclado';
      if (gp && gp.mostrar(true)) {
        const kg = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.body.dispatchEvent(kg);
        const cerrada = gp.el.panel.hidden && !gp.panelAbierto, fase = A.fase;
        if (!cerrada) gp.cerrar();
        check('W35 · Moon: con la guía de controles abierta, Esc cierra la guía y no deja el entreno', cerrada && fase !== 'nada' && !kg.defaultPrevented, JSON.stringify({ cerrada, fase, esc: kg.defaultPrevented }));
      } else check('W35 · Moon: con la guía de controles abierta, Esc cierra la guía y no deja el entreno', !gp, gp ? 'la guía no se abrió' : 'sin guía de teclado (sin cargar)');
      if (gp) gp.forzado = forz0;
      const r = esc();
      check('W35 · Moon: Esc lo deja (sin contar partida) y no abre la Pausa', A.fase === 'nada' && r.prev && el.hidden && !r.pausa && JSON.stringify(record()) === r0, JSON.stringify({ fase: A.fase, esc: r.prev, pausa: r.pausa }));
    } catch (e) { check('W35 · Moon: teclado sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    finally {
      if (A.fase !== 'nada') { A.fase = 'nada'; matarOrbs(); pintarHud(); }
      A.manual = man0; G.ui.toast = toast0;
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; } G.camara.yaw = yaw0;
      colocarEnSitio();
    }
    return out;
  }

  // ---------- Prueba ----------
  async function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const esperar = ms => new Promise(r => setTimeout(r, ms));
    const antes = o.antes || {};
    try { await G.mundo.listo; } catch (e) { /* sin mundo */ }
    const tit = document.getElementById('title'), titAbierta = !!(tit && tit.open), cre = document.getElementById('creator'), creOculto = cre ? cre.hidden : true;
    if (titAbierta) tit.open = false; if (cre) cre.hidden = true; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const MV = F.MOVE, keys = G.input.keys;
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z }, yaw0 = G.camara.yaw, inv0 = JSON.stringify(S.inv || {});
    const toast0 = G.ui.toast, toasts = []; G.ui.toast = t => { toasts.push(String(t)); };
    const susp = G.guardado.suspender; if (susp) susp(true);
    const evo0 = G.v18evo, xpDado = [];
    G.v18evo = { dar: (sp, n, f) => { xpDado.push([sp, n, f]); return n; } }; // espía: no toca la XP de la partida
    A.manual = true;
    const correr = (s, h) => { h = h || 1 / 30; for (let t = 0; t < s; t += h) { N.paso(h, false); paso(h); } };
    const ir = (x, z) => { S.pos.x = x; S.pos.z = z; S.pos.y = H(x, z) + 0.02; S.vy = 0; MV.flying = false; MV.swimming = false; MV.grounded = true; MV.vx = MV.vz = 0; };
    const recursos = () => (performance.getEntriesByType('resource') || []).map(r => r.name).filter(n => /models\/personajes\/maestro_moon/.test(n));
    // QA-203: el sitio se mide con el entorno cargado del todo, como lo encuentra el jugador al llegar (y no con lo que una
    // prueba anterior dejó a medias): se fuerza el streaming de edificios alrededor, se espera a que su cola termine, a que
    // solidos.js recoja los edificios nuevos (lo hace cada 2 s) y se rasteriza todo lo pendiente (edificios y flora)
    const asentar = async (x, z) => { ir(x, z); correr(0.05); const ST = G.mundo && G.mundo.streaming;
      if (ST && ST.alrededor) { try { await Promise.race([ST.alrededor(x, z), esperar(60000)]); if (ST.terminar) await ST.terminar({ topeMs: 60000 }); } catch (e) { /* */ } }
      await esperar(2300); try { if (G.solidos && G.solidos.terminar) G.solidos.terminar(); } catch (e) { /* */ } };
    const cerrar = () => { try { G.dialogo.clear(); } catch (e) { /* */ } try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) { /* */ } };
    // corre el entreno entero: «jugar» orbita a Moon a 9 m (las bolas vuelan rectas: esquivar = no estar donde apuntaban)
    const entreno = (jugar) => {
      const r = { pasos: 0, maxOrbs: 0, toques: [] };
      if (!empezar({ forzar: true })) return null;
      const h = 1 / 30;
      for (let k = 0; k < 1500 && A.fase !== 'nada'; k++) {
        if (jugar && A.fase === 'entreno') {
          const a = k * h * 0.55; // órbita lenta, ~5 m/s: esquivable andando deprisa
          ir(A.mx + Math.cos(a) * 9, A.mz + Math.sin(a) * 9);
        }
        paso(h); r.pasos++; r.maxOrbs = Math.max(r.maxOrbs, A.orbs.length);
        if (A.toques !== r.toques[r.toques.length - 1]) r.toques.push(A.toques);
      }
      r.ultimo = A.ultimo; return r;
    };
    try {
      check('1 · Con la bandera apagada (?v18=0) no se cargó nada: ni moon.js ni el modelo de Moon', antes.v18 ? true : (!antes.moon && !antes.glb), antes.v18 ? 'bandera puesta en esta sesión (por defecto; la carga se comprueba con ?v18=0)' : JSON.stringify(antes));
      cancelar(); A.forzar = false; V.cambiarMundo(ID, null);
      // 2 · sin bandera (y sin forzar), aunque Vittata esté al lado, no aparece nada
      // (la V18 va encendida por defecto desde el 6-nov: se apaga G.V18 solo durante este bloque, como con ?v18=0, y se deja como estaba)
      const v18bk = G.V18; let sinBandera = false;
      G.V18 = false;
      try { ir(SITIO.x + 4, SITIO.z + 4); correr(0.3); await esperar(200); correr(0.1);
        sinBandera = !N.instancia(NPC) && N.activos().indexOf(NPC) < 0 && mapa() === null && !empezar(); } finally { G.V18 = v18bk; }
      check('2 · Sin la bandera V18 no aparece Moon, ni su marcador, ni se puede empezar el entreno', sinBandera, N.activos().join(','));
      // 2b · QA-192: con la V18 encendida pero fuera del cap. 1 (packs 2-6) tampoco aparece
      const packBk = G.pack && G.pack.id; let fueraPack = false;
      if (packBk) { G.pack.id = 'ep4';
        try { ir(SITIO.x + 4, SITIO.z + 4); correr(0.3); await esperar(200); correr(0.1);
          fueraPack = !N.instancia(NPC) && N.activos().indexOf(NPC) < 0 && mapa() === null && !empezar(); } finally { G.pack.id = packBk; } }
      check('2b · Con la V18 encendida fuera del cap. 1 (pack ep4) no aparece Moon ni su marcador ni el entreno (QA-192)', packBk ? fueraPack : true, 'pack ' + packBk + ' · activos ' + N.activos().join(','));
      A.forzar = true;
      // 3 · lejos: carga diferida
      const villa = (T.mapa && T.mapa.lugares && T.mapa.lugares.villa) || { x: 150, z: 170 };
      for (const id of N.activos()) N.liberar(id);
      const rec0 = recursos().length, ped0 = N.stats().pedidos.filter(p => /maestro_moon/.test(p)).length;
      ir(villa.x, villa.z); correr(0.3); await esperar(300); correr(0.1);
      check('3 · Carga diferida: lejos (> 150 m) no está Moon ni se pidió su modelo', Math.hypot(villa.x - SITIO.x, villa.z - SITIO.z) > 150 && !N.instancia(NPC) && recursos().length === rec0 && N.stats().pedidos.filter(p => /maestro_moon/.test(p)).length === ped0,
        'dist ' + Math.hypot(villa.x - SITIO.x, villa.z - SITIO.z).toFixed(0) + ' m · Δrecursos ' + (recursos().length - rec0));
      // 4 · cerca: aparece con su modelo (maestro_moon.glb), máximo 2 personajes a la vez
      ir(SITIO.x + 10, SITIO.z + 10); correr(0.2);
      for (let i = 0; i < 100 && !N.instancia(NPC); i++) { await esperar(100); correr(0.05); }
      const inst = N.instancia(NPC);
      check('4 · Cerca (< 90 m) aparece Moon con su modelo propio y sus acciones (Idle, Hablar, Señalar); máx. 2 personajes', !!inst && !inst.provisional && ['Idle', 'Hablar', 'Señalar'].every(n => inst.acciones[n]) && N.activos().length <= N.MAX_ACTIVOS && N.stats().pedidos.some(p => /maestro_moon\.glb/.test(p)),
        inst ? Object.keys(inst.acciones).join(',') + ' · activos ' + N.activos().join(',') : 'sin instancia');
      // 5 · el sitio: seco, sin troncos, colisiones ni sólidos en el círculo; lejos de las demás actividades V18 (> 100 m)
      // QA-203: lo que ve el jugador allí: streaming de la zona cargado del todo, la flora del claro despejada (como el duelo)
      // y los sólidos rasterizados. Flora que se despeja no cuenta; edificios, muros, colliders y sólidos que quedan, sí (cero).
      const medir = async (cx, cz) => {
        await asentar(cx, cz);
        const quitadas = despejarEn(cx, cz); try { if (G.solidos && G.solidos.terminar) G.solidos.terminar(); } catch (e) { /* */ }
        const VG = G.vegetacion, P = VG && VG.instancias, inf = VG && VG.info, tr = [];
        if (P && inf) for (const m in P) { const I = inf[m], PM = P[m]; if (!I || !PM) continue; const roca = /roca|piedra|tronco/.test(m); if (!roca && !(I.tronco >= 0.05)) continue;
          for (let i = 0; i < PM.n; i++) { const x = PM.pos[i * 4], z = PM.pos[i * 4 + 2], sc = PM.pos[i * 4 + 3]; if (sc > 0 && Math.hypot(x - cx, z - cz) < 45) tr.push({ x, z, r: roca ? Math.max(0.5, (I.ancho || 1) * 0.5 * sc) : Math.max(0.2, I.tronco * sc) }); } }
        const cols = (F.colliders || []).filter(c => c && c.x != null && Math.hypot(c.x - cx, c.z - cz) < 50 && !/^v18npc/.test(c.id || ''));
        const dCol = (x, z, c) => c.hx ? Math.hypot(Math.max(0, Math.abs(x - c.x) - c.hx), Math.max(0, Math.abs(z - c.z) - c.hz)) : Math.hypot(x - c.x, z - c.z) - (c.r || 0);
        const r = { quitadas, peor: '', mT: 99, mojado: 0, solido: 0, pend: 0 };
        for (let a = 0; a < 16; a++) for (const rr of [3, 7, 11]) { const x = cx + Math.cos(a / 16 * 6.2832) * rr, z = cz + Math.sin(a / 16 * 6.2832) * rr, h = H(x, z);
          r.pend = Math.max(r.pend, Math.abs(h - H(cx, cz)) / Math.max(1, rr));
          if (G.agua && G.agua.levelAt && G.agua.levelAt(x, z) > h - 0.3) r.mojado++;
          for (const t of tr) { const d = Math.hypot(x - t.x, z - t.z) - t.r; if (d < r.mT) { r.mT = d; r.peor = 'tronco'; } }
          for (const c of cols) { const d = dCol(x, z, c); if (d < r.mT) { r.mT = d; r.peor = c.id || c.kind || '?'; } }
          if (G.solidos && G.solidos.activo && [0.3, 0.9, 1.5, 2.5].some(y => G.solidos.dentro(x, z, h + y) > h + 0.15)) r.solido++; } // QA-201: un sólido de flora con el tope a ras del suelo (raíz o rama enterrada) no estorba; dentro() lo cuenta por su margen de 0,4 m
        return r;
      };
      // diagnóstico: AV.v18MoonTest({ sondear: [[x, z], …] }) mide otros sitios igual (despeja su flora en esta sesión)
      if (o.sondear) { const sd = []; for (const [cx, cz] of o.sondear) { const r = await medir(cx, cz); sd.push(cx + ',' + cz + ': quita ' + r.quitadas + ' libre ' + r.mT.toFixed(2) + ' ' + r.peor + ' pend ' + r.pend.toFixed(3) + ' moj ' + r.mojado + ' sol ' + r.solido); }
        check('5z · sondeo', true, sd.join(' | ')); }
      const m5 = await medir(SITIO.x, SITIO.z);
      const puerto = { x: 73.6, z: -75.2 }, golf = G.v18minigolf && G.v18minigolf.sitio, duelo = G.v18combate && G.v18combate.sitio, chispa = G.v18chispa && G.v18chispa.SITIO && (G.v18chispa.SITIO.salida || G.v18chispa.SITIO), /* el SITIO de Chispa es { salida, puntos } */ misterio = G.v18Misterio && G.v18Misterio.sitio && G.v18Misterio.sitio();
      const dist = q => q ? Math.hypot(q.x - SITIO.x, q.z - SITIO.z) : Infinity;
      const lejos = { puerto: dist(puerto), villa: dist(villa), golf: dist(golf), duelo: dist(duelo), chispa: dist(chispa), misterio: dist(misterio) };
      check('5 · Sitio abierto: círculo de 11 m en seco, sin edificios, colisiones ni sólidos (la flora del claro se despeja, como en el duelo); lejos de puerto, golf, duelo, Chispa y el misterio (> 100 m)',
        !m5.mojado && !m5.solido && m5.mT >= 0.8 && m5.pend < 0.09 && [lejos.puerto, lejos.golf, lejos.duelo, lejos.chispa, lejos.misterio].every(d => d > 100),
        'libre ' + m5.mT.toFixed(2) + ' m' + (m5.mT < 0.8 ? ' (' + m5.peor + ')' : '') + ' · pendiente ' + m5.pend.toFixed(2) + ' · mojado ' + m5.mojado + ' · sólidos ' + m5.solido + ' · flora despejada ' + (despeje.n + m5.quitadas) + ' · ' + Object.keys(lejos).map(k => k + ' ' + (isFinite(lejos[k]) ? lejos[k].toFixed(0) : '—')).join(' '));
      // 6 · minimapa
      const mm = mapa();
      check('6 · Marcador del minimapa en Moon, con nombre', mm && mm.nombre === TXT.nombre && Math.hypot(mm.x - SITIO.x, mm.z - SITIO.z) < 0.1);
      // 7 · ganar esquivando (órbita lenta a 9 m)
      ir(SITIO.x, SITIO.z);
      const it = N.instancia(NPC) && G.interaccion.nearest && G.interaccion.nearest();
      check('7a · Junto a Moon, Acción ofrece el entrenamiento', it && it.id === 'v18npc_' + NPC && it.label() === TXT.label, it && it.id);
      const g1 = entreno(true); cerrar();
      check('7 · Esquivando (órbita a 9 m) se gana: 30 s con menos de 3 toques', g1 && g1.ultimo && g1.ultimo.gana && g1.ultimo.toques < MAX_TOQUES,
        g1 ? JSON.stringify({ toques: g1.ultimo && g1.ultimo.toques, pasos: g1.pasos, maxOrbs: g1.maxOrbs }) : 'no empezó');
      const r1 = record();
      check('8 · Resultado y récord en el progreso V18 (mundo.entreno_moon)', r1 && r1.victorias === 1 && r1.jugadas === 1 && r1.mejor === g1.ultimo.toques && g1.ultimo.nuevo, JSON.stringify(r1));
      check('9 · 30 XP al ganar la primera vez', xpDado.length === 1 && xpDado[0][1] === XP_GANAR && r1.xp === true, JSON.stringify(xpDado));
      // 10 · perder dejándose tocar (quieta al lado, a ~6 m)
      correr(1); ir(SITIO.x + 6, SITIO.z);
      const p1 = entreno(false); cerrar();
      const r2 = record();
      check('10 · Quieta sin moverse pierde: 3 toques y el entreno acaba antes de los 30 s', p1 && p1.ultimo && !p1.ultimo.gana && p1.ultimo.toques >= MAX_TOQUES && p1.pasos * (1 / 30) < DUR_S,
        p1 ? JSON.stringify(p1.ultimo) + ' · ' + (p1.pasos / 30).toFixed(1) + ' s' : 'no empezó');
      check('11 · Perder no cambia el récord ni da XP; cuenta la partida', r2.mejor === r1.mejor && r2.victorias === 1 && r2.jugadas === 2 && xpDado.length === 1, JSON.stringify(r2));
      // 12 · persiste tras recargar; la XP no se repite
      V.recargar(); G.emit('apply'); await esperar(50);
      const r3 = record();
      check('12 · Tras recargar siguen el récord, las victorias y las partidas', r3 && r3.mejor === r1.mejor && r3.victorias === 1 && r3.jugadas === 2 && r3.xp === true, JSON.stringify(r3));
      correr(1); ir(SITIO.x, SITIO.z);
      const g2 = entreno(true); cerrar();
      check('13 · Otra victoria no repite la XP: pagarXP tras recargar no da nada', g2 && g2.ultimo && g2.ultimo.gana && pagarXP() === 0 && xpDado.length === 1 && record().victorias === 2, JSON.stringify(xpDado));
      // 14 · alejarse cancela; volar alto cancela
      ir(SITIO.x, SITIO.z); empezar({ forzar: true }); correr(CUENTA_S + 0.3);
      ir(SITIO.x + R_SALE + 10, SITIO.z); correr(0.1);
      const canceloLejos = A.fase === 'nada' && record().jugadas === 3 && toasts.includes(TXT.lejos);
      ir(SITIO.x, SITIO.z); empezar({ forzar: true }); correr(CUENTA_S + 0.3);
      S.pos.y = H(S.pos.x, S.pos.z) + ALTO_MAX + 2; correr(ALTO_T_S + 0.2);
      check('14 · Alejarse > 45 m cancela sin contar partida; volar > 11 m durante 3 s también cancela', canceloLejos && A.fase === 'nada' && record().jugadas === 3 && toasts.includes(TXT.alto), 'jugadas ' + record().jugadas);
      cerrar();
      // 17 · QA V18.3 (coordinadora): Acción durante el entreno decía «Aquí no hay nada para usar». Ahora esquiva con un impulso; al acabar se suelta
      ir(SITIO.x + 9, SITIO.z); empezar({ forzar: true }); correr(CUENTA_S + 0.3);
      const nT = toasts.length; MV.dashCd = 0; MV.dashT = 0;
      try { G.interaccion.action(); } catch (e) { /* lo dice el check */ }
      const nada = toasts.slice(nT).filter(t => /nada para usar/.test(t)), esquiva = MV.dashT > 0;
      cancelar('sale'); MV.dashT = 0; MV.dashCd = 0;
      const suelta = !(G.interaccion.modo && G.interaccion.modo.activo());
      check('17 · Acción durante el entreno no dice «Aquí no hay nada para usar»: esquiva con un impulso; al acabar se suelta Acción', !nada.length && esquiva && suelta,
        JSON.stringify({ nada, esquiva, verbo: G.interaccion.modo && G.interaccion.modo.verbo }));
      cerrar();
      // 18 · pul3 (QA V18.3): también en escritorio el panel de misiones de la historia (#quest) se oculta durante el entreno y vuelve al
      // salir por cualquier vía: dejarlo (Salir/Esc) o acabar (quieta, Moon gana con 3 toques)
      const qEl = document.getElementById('quest'), qVis = () => !!qEl && getComputedStyle(qEl).visibility !== 'hidden' && getComputedStyle(qEl).display !== 'none';
      ocultarFin(); // el panel del resultado de la partida anterior (mantiene oculto #quest unos segundos) no cuenta aquí
      const q0 = qVis();
      ir(SITIO.x + 9, SITIO.z); empezar({ forzar: true }); correr(0.1);
      const qCuenta = qVis(); correr(CUENTA_S + 0.3);
      const qDentro = qVis(); cancelar('sale');
      const qSale = qVis();
      ir(SITIO.x, SITIO.z); empezar({ forzar: true }); correr(CUENTA_S + 0.3);
      for (let k = 0; k < 40 * 30 && A.fase !== 'nada'; k++) correr(1 / 30);
      const qPanelFin = qVis(), finOk = A.fase === 'nada'; ocultarFin(); const qFin = qVis();
      check('18 · Durante el entreno (también en escritorio) no se ve el panel de misiones de la historia (#quest) y vuelve al salir o al acabar (tras el panel del resultado)', !qCuenta && !qDentro && qSale === q0 && finOk && !qPanelFin && qFin === q0,
        JSON.stringify({ ancho: innerWidth, q0, qCuenta, qDentro, qSale, qPanelFin, qFin, finOk }));
      cerrar();
      // 19 · Cómo se juega (Kelvin 8-nov: «no se entiende cómo hacer los movimientos»): meta a la vista, chips con tecla, pistas y resultado
      {
        const rG = V.mundo(ID);
        ir(SITIO.x + 6, SITIO.z); empezar({ forzar: true });
        correr(0.1);
        const chips = [...hud.k.querySelectorAll('span')].map(sp => sp.querySelector('kbd').textContent + '=' + sp.querySelector('b').textContent);
        const accK = teclaDe('accion', 'e');
        check('19a · En la cuenta: la meta se ve en el panel y los chips dicen las teclas reales (moverte, impulso)',
          !hud.el.hidden && hud.m.textContent === TXT.metaTxt && (TACTIL ? chips.join('|') === TXT.tImpulso + '=' + TXT.esquiva : chips.length === 2 && /^[A-Z]{4}=/.test(chips[0]) && chips[1] === accK + '=' + TXT.kImpulso),
          JSON.stringify({ m: hud.m.textContent, chips }));
        correr(CUENTA_S + PRIMERA_S + 0.1);
        const pv = hud.pi.hidden ? '' : hud.pi.textContent;
        for (let k = 0; k < 8 * 30 && A.toques < 1 && A.fase === 'entreno'; k++) correr(1 / 30);
        const pt = hud.pi.hidden ? '' : hud.pi.textContent;
        check('19b · Pistas breves: con la primera bola «¡Ahí viene!» y con el primer toque cómo esquivar (con la tecla de impulso)',
          pv === TXT.pViene && A.toques === 1 && pt === (TACTIL ? TXT.pToqueT : TXT.pToque.replace('{}', accK)), JSON.stringify({ pv, pt, toques: A.toques }));
        terminar(true); cerrar();
        const fG = { vis: !hud.el.hidden, fin: hud.el.classList.contains('fin'), n: hud.n.textContent, m: hud.m.textContent };
        ocultarFin(); const ocultoG = hud.el.hidden;
        ir(SITIO.x + 6, SITIO.z); empezar({ forzar: true }); const sinFin = !hud.el.classList.contains('fin') && hud.m.textContent === TXT.metaTxt && hud.pi.hidden;
        correr(CUENTA_S + 0.1); terminar(false); cerrar();
        const fP = { vis: !hud.el.hidden, n: hud.n.textContent, m: hud.m.textContent };
        ocultarFin();
        check('19c · Al terminar, el panel dice claro qué pasó: «¡Entreno superado!» con los toques o «¡Tres toques!»; se va solo y no se queda en el siguiente',
          fG.vis && fG.fin && fG.n === TXT.fGana && fG.m === TXT.fToques.replace('{}', 1) && ocultoG && sinFin && fP.vis && fP.n === TXT.fPierde && fP.m === TXT.fOtra && hud.el.hidden,
          JSON.stringify({ fG, fP, ocultoG, sinFin }));
        V.cambiarMundo(ID, rG);
      }
      for (const r of teclado()) out.push(r); // W35
      // 15 · textos
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
      const D = window.AV_EN || {}, pats = Object.keys(D).filter(k => k.indexOf('{}') >= 0).map(k => new RegExp('^' + k.split('{}').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'));
      const tx = textos(), faltan = tx.filter(t => !D[t] && !pats.some(re => re.test(t)));
      check('15 · Todos los textos de Moon tienen inglés en content/cap1/en.js', !faltan.length, faltan.slice(0, 6).join(' | '));
      check('15b · Ningún texto ni dato menciona el nombre del modelador (directiva V18.3 §1)', !/\x66eix/i.test(tx.join(' ') + JSON.stringify(N.def(NPC))));
      check('16 · No toca el inventario del capítulo', JSON.stringify(S.inv || {}) === inv0);
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    // restaurar
    cerrar(); if (A.fase !== 'nada') { A.fase = 'nada'; matarOrbs(); pintarHud(); }
    A.manual = false; A.forzar = false; A.ultimo = null;
    if (evo0 === undefined) delete G.v18evo; else G.v18evo = evo0;
    G.ui.toast = toast0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; } G.camara.yaw = yaw0;
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); colocarEnSitio(); N.paso(0.01, false);
    if (titAbierta) tit.open = true; if (cre) cre.hidden = creOculto; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18moon = { ID, SITIO, DUR_S, MAX_TOQUES, XP_GANAR, empezar, cancelar, invitar, paso, record, pagarXP, mapa, textos, teclado, estado: () => A, test };
  return G.v18moon;
};
