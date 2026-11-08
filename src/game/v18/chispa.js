/* Juego · V18.3 fase 5 · Chispa, la shiba piloto (rival amistosa y cómica): «Carrera con Chispa» (G.v18chispa).
   Directiva docs/DIRECTIVA_V18_3_RESOLUCION.md §6D y §12; sistema de personajes docs/equipo/V18_3_DISENO.md §1 (src/game/v18/npc.js,
   fila de datos 'chispa' en content/comun/personajes_v18.js). Contenido opcional del mundo abierto: no toca los capítulos ni sus misiones.
   - Dónde: en la plaza de Los Portales del Río, un claro llano sin edificios, lejos del Puerto de La Mina, del minigolf y de la
     explanada del duelo (Villa Raíz). Sitio fijo medido en el mapa y en el juego (terreno, agua, colisiones, troncos de la flora y
     sólidos): SITIO más abajo. La prueba vuelve a medirlo.
   - Chispa sale con el sistema único de NPC: carga diferida (el .glb no se pide hasta que Vittata está a < 90 m), máx. 2 a la vez.
   - La carrera: Acción junto a Chispa → reto corto → cuenta 3-2-1 → 4 banderines y la meta (vuelta a la salida), en orden. Se corre o se
     vuela (los puntos cuentan hasta 14 m sobre el suelo). Chispa corre a velocidad fija (5,4 m/s, menos que Vittata andando deprisa o
     volando) y en el segundo banderín se para a celebrar antes de tiempo (gag). Gana quien llega antes a la meta; si Chispa llega
     primero, la carrera acaba. Alejarse más de 70 m la cancela. Nada de violencia ni de presión: «¿Otra?» y ya.
   - Progreso V18 (G.v18.mundo('carrera_chispa') = { mejor (ms, la mejor carrera ganada), ganadas, jugadas, xp }). 30 XP de G.v18evo
     una sola vez, al ganar la primera (también si evolucion.js llega después). «Comenzar de cero» lo borra con el resto de la V18.
   - Minimapa: marcador propio (rayo naranja, con nombre) en Chispa; durante la carrera, en el siguiente banderín (minimapa.js, mapa()).
   Solo con la bandera V18 (src/boot.js). Prueba: AV.v18ChispaTest(). */
window.AVV18Chispa = function (G) {
  'use strict';
  if (G.v18chispa) return G.v18chispa;
  const V = G.v18 || window.AVV18Progreso(G);
  const N = G.v18npc || window.AVV18Npc(G);
  const S = G.S, T = G.terreno, F = G.fisica, scene = G.renderer.scene;
  const ID = 'carrera_chispa', NPC = 'chispa', XP_GANAR = 30;
  const V_CHISPA = 5.4, R_PUNTO = 3.2, ALTO_MAX = 14, CUENTA_S = 3, GAG = { punto: 2, s: 1.4 }, R_SALE = 70;
  // Medido en el mapa real y en el juego (sonda de terreno, agua, colisiones, troncos y sólidos; ver la prueba, check 5)
  // (rejilla de 1 m, ±40 m alrededor de la plaza 37,8, 52,3; troncos y colisiones a ≥ 0,9 m; a ≥ 3,4 m de los 3 toldos; pendiente ≤ 0,5 m/m;
  // sólidos de casas y ramas ya cargados (postes, barandas, cumbreras); vuelta sencilla de 5 tramos y 70 m). Salida al este de la plaza, mirando al centro.
  // QA-202: con la siembra de flora restaurada (KIMI-203 revertido) la vuelta vieja (35.8, 56.3) → (23.8, 72.3) → (37.8, 72.3) → (43.8, 64.3)
  // cruzaba matorrales y troncos (libre -0,09 m, 2 sólidos): Vittata se atascaba en el banderín 3 y Chispa ganaba. Los 4 banderines pasan
  // a pasillos libres medidos con la misma sonda en el juego (rejilla de 1 m: libre ≥ 1,7 m en cada tramo, en seco, sin sólidos, pendiente ≤ 0,2).
  // Misma salida y misma vuelta de 5 tramos y 70 m, con el primer banderín en la plaza. Sin tocar modelos ni vegetación.
  // QA-203: esa sonda se hizo con lo que había cargado en una sesión nueva, sin el streaming de Los Portales del Río. Con la zona
  // kelvin_aldea_rio_este_3 cargada (lo que ve el jugador al llegar) el tramo hacia el banderín 3 (45,8, 78,3) cruzaba el portal de
  // madera (portal_madera_b #2: libre -0,01 m, 7 sólidos de techo y baranda), y junto a (29, 57) hay un toldo bajo con su poste donde
  // Vittata se atasca. Vuelta nueva medida con todo cargado (streaming terminado, sólidos de casas y flora rasterizados; rejilla de
  // 0,5 m, pasillo de ±1,2 m sin sólidos ni toldos bajo el cuerpo, libre ≥ 1,7 m en el eje de cada tramo, en seco, pendiente ≤ 0,5).
  // La salida se corre 4 m al oeste, a la plaza; vuelta de 5 tramos y 72 m.
  const SITIO = { salida: { x: 45.8, z: 54.3, rotY: -1.74 }, puntos: [{ x: 41.8, z: 62.3 }, { x: 19.8, z: 60.3 }, { x: 23.8, z: 68.3 }, { x: 37.8, z: 70.3 }] };
  const RUTA = SITIO.puntos.concat([{ x: SITIO.salida.x, z: SITIO.salida.z, meta: true }]);
  const TXT = {
    nombre: 'Carrera con Chispa', label: 'Echar una carrera con Chispa',
    reto: ['¡Hola, plumitas! Soy Chispa, la más veloz de los Portales. ¿Una carrerita?', '¡Cuatro banderines y de vuelta aquí! El que llegue último… ¡lava mis gafas!'],
    revancha: ['¿Otra vez tú? ¡Esta vez voy a correr con las dos orejas!'],
    cuenta: '¡Pasa por los 4 banderines en orden y vuelve a la meta!',
    ya: '¡Ya!', punto: 'Banderín {}/4', meta: '¡A la meta!', siguiente: 'Siguiente banderín', tiempo: 'Tiempo', record: 'Récord',
    gag: '¡Gané, gané! … ¿Eh? ¿Todavía faltan banderines?',
    gana: ['¡Guau! ¡Me ganaste! Mis patas iban rapidísimo… pero tus alas, más.', 'Toma, te presto mis gafas. ¡Mentira! ¿Otra?'],
    pierde: ['¡Gané! ¡Soy un rayo con cola!', 'Si quieres la revancha, aquí te espero. Prometo no presumir… tanto.'],
    nuevo: '¡Nuevo récord: {}!', xp: 'Tu aventura cuenta: +{} XP para tu cotorra.',
    lejos: 'Te alejaste: la carrera con Chispa queda para otro rato.',
    // Cómo se juega, sin leer párrafos (Kelvin 8-nov, como en el duelo): meta siempre a la vista, teclas, pistas y resultado claro
    metaTxt: 'Gánale a Chispa: ve al banderín naranja', rival: 'Chispa: banderín {}/4', rivalMeta: 'Chispa: ¡a la meta!',
    kCorrer: 'Correr', kRapido: 'Más rápido', kVolar: 'Volar', kAun: 'Aún más rápido', tVolar: 'Volar', tImpulso: 'Impulso',
    pDelante: '¡Chispa va delante! Vuela con {}: ¡es más rápido!', pDelanteT: '¡Chispa va delante! Pulsa Volar: ¡es más rápido!',
    pMapa: 'El banderín naranja también sale en el minimapa',
    fGana: '¡Le ganaste a Chispa!', fPierde: '¡Chispa llegó primero!', fTiempo: 'Tu tiempo: {}', fOtra: 'Otra vez: vuela para ir más rápido'
  };
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 2600); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18chispa', ev); } catch (e) { /* sin oyentes */ } };
  const H = (x, z) => T.height(x, z);
  const reloj = s => (Math.max(0, s)).toFixed(1).replace('.', ',') + ' s';

  const A = { fase: 'nada', t: 0, cuenta: 0, sig: 0, cx: SITIO.salida.x, cz: SITIO.salida.z, cr: 0, ci: 0, gagT: 0, gagHecho: false, forzar: false, manual: false, ultimo: null, xpT: 0 };
  const activa = () => !!((G.V18 && G.pack && G.pack.id === 'cap1') || A.forzar); // QA-192: la actividad es de Villa Raíz; la prueba la fuerza con A.forzar

  // ---------- Progreso ----------
  function record() { const r = V.mundo(ID); return r && typeof r === 'object' ? r : null; }
  function pagarXP() {
    const r = record();
    if (!r || !(r.ganadas > 0) || r.xp || !G.v18evo || !G.v18evo.dar) return 0;
    V.cambiarMundo(ID, Object.assign({}, r, { xp: true })); // primero se marca: nunca dos veces
    const n = G.v18evo.dar(V.seleccionada ? V.seleccionada() || 'vittata' : 'vittata', XP_GANAR, 'chispa') || 0;
    if (n) toast(TXT.xp.replace('{}', n), 2800);
    return n;
  }

  // ---------- Banderines (se crean la primera vez que se corre) ----------
  let gBand = null;
  const mats = {};
  function montarBanderines() {
    if (gBand) return;
    const lin = h => new THREE.Color(h).convertSRGBToLinear();
    mats.asta = new THREE.MeshStandardMaterial({ color: lin('#e9e4da'), roughness: 0.5, metalness: 0.2 });
    mats.tela = new THREE.MeshStandardMaterial({ color: lin('#27c6d9'), roughness: 0.6, side: THREE.DoubleSide });
    mats.sig = new THREE.MeshStandardMaterial({ color: lin('#ff8a1f'), emissive: lin('#ff6a00'), emissiveIntensity: 0.55, roughness: 0.5, side: THREE.DoubleSide });
    mats.meta = new THREE.MeshStandardMaterial({ color: lin('#ffd23f'), emissive: lin('#ffb000'), emissiveIntensity: 0.25, roughness: 0.5, side: THREE.DoubleSide });
    mats.brillo = new THREE.MeshBasicMaterial({ color: lin('#ffb347'), transparent: true, opacity: 0.35, depthWrite: false });
    const gAsta = new THREE.CylinderGeometry(0.05, 0.06, 2.4, 8), gBola = new THREE.SphereGeometry(0.11, 10, 8);
    const gTela = new THREE.BufferGeometry();
    gTela.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.35, 0, 0, 1.65, 0, 0.95, 2.02, 0], 3)); gTela.computeVertexNormals();
    const gBrillo = new THREE.CircleGeometry(1.2, 24);
    gBand = new THREE.Group(); gBand.name = 'v18chispa:banderines'; gBand.visible = false;
    RUTA.forEach((p, i) => {
      const b = new THREE.Group(); b.position.set(p.x, H(p.x, p.z), p.z);
      const asta = new THREE.Mesh(gAsta, mats.asta); asta.position.y = 1.2;
      const tela = new THREE.Mesh(gTela, p.meta ? mats.meta : mats.tela);
      const bola = new THREE.Mesh(gBola, mats.meta); bola.position.y = 2.45;
      const brillo = new THREE.Mesh(gBrillo, mats.brillo); brillo.rotation.x = -Math.PI / 2; brillo.position.y = 0.06; brillo.visible = false;
      b.add(asta, tela, bola, brillo); b.userData = { tela, brillo, meta: !!p.meta, i };
      gBand.add(b);
    });
    scene.add(gBand);
  }
  function pintarBanderines(t) {
    if (!gBand) return;
    gBand.visible = A.fase === 'cuenta' || A.fase === 'carrera';
    for (const b of gBand.children) {
      const u = b.userData, es = u.i === A.sig;
      b.visible = u.i >= A.sig;
      u.tela.material = es ? mats.sig : u.meta ? mats.meta : mats.tela;
      u.brillo.visible = es;
      u.tela.rotation.y = Math.sin(t * 3 + u.i) * 0.25;
      if (es) u.brillo.scale.setScalar(1 + Math.sin(t * 5) * 0.12);
    }
  }

  // ---------- HUD ----------
  let hud = null;
  function montarHud() {
    if (hud) return hud;
    if (!document.getElementById('v18-chispa-css')) {
      const st = document.createElement('style'); st.id = 'v18-chispa-css';
      st.textContent = '#v18-chispa{position:fixed;top:calc(env(safe-area-inset-top,0px) + 92px);left:0;right:0;margin-inline:auto;width:min(340px,calc(100vw - 32px));z-index:40;' +
        'pointer-events:none;text-align:center;color:#fff;font:inherit;background:rgba(20,32,60,.78);border:2px solid #ff8a1f;border-radius:16px;padding:8px 12px;box-shadow:0 3px 12px rgba(0,0,0,.35)}' +
        '#v18-chispa .vc-t{font-size:calc(13px * var(--fs-k,1));opacity:.9;letter-spacing:.02em}#v18-chispa .vc-l{display:flex;justify-content:space-between;gap:10px;font-size:calc(17px * var(--fs-k,1));font-weight:700;margin-top:2px}' +
        '#v18-chispa .vc-n{font-size:calc(46px * var(--fs-k,1));font-weight:800;line-height:1.1;color:#ffd23f;text-shadow:0 2px 0 #b35a00}#v18-chispa .vc-r{font-size:calc(12px * var(--fs-k,1));opacity:.85;margin-top:2px}' +
        // Cómo se juega (8-nov, patrón del duelo): meta, rival, chips de tecla, pista breve y resultado
        '#v18-chispa .vc-m{font-size:calc(14px * var(--fs-k,1));font-weight:700;color:#ffe39a;line-height:1.25;margin-top:2px}#v18-chispa .vc-c{font-size:calc(13px * var(--fs-k,1));color:#ffb46b;font-weight:700;margin-top:1px}' +
        '#v18-chispa .vc-k{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;margin-top:5px;font-size:calc(13px * var(--fs-k,1))}#v18-chispa .vc-k span{display:inline-flex;align-items:center;gap:4px}' +
        '#v18-chispa kbd{font:700 calc(12px * var(--fs-k,1))/1 Fredoka,system-ui,sans-serif;min-width:20px;padding:3px 6px;border-radius:6px;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 0 #0007;text-align:center}' +
        '#v18-chispa .vc-pi{margin:6px auto 0;background:rgba(255,227,154,.96);color:#3b2a14;font-weight:600;font-size:calc(14px * var(--fs-k,1));padding:4px 10px;border-radius:14px;animation:vcPista .25s ease-out}#v18-chispa [hidden]{display:none}' +
        '@keyframes vcPista{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}' +
        '#v18-chispa.fin:not([hidden]){display:flex;flex-direction:column}#v18-chispa.fin .vc-t{order:-2}#v18-chispa.fin .vc-n{order:-1}' +
        '#v18-chispa.fin .vc-n{font-size:calc(28px * var(--fs-k,1));line-height:1.15}#v18-chispa.fin .vc-l,#v18-chispa.fin .vc-k,#v18-chispa.fin .vc-c,#v18-chispa.fin .vc-pi{display:none}' +
        // pul3 (QA V18.3): también en escritorio el panel de misiones de la historia no se ve durante la carrera; vuelve al salir (como en el Guardián)
        'body.v18-chispa-on #quest,body.v18-chispa-on #quest-toggle{visibility:hidden}' +
        // pul3 (accesibilidad): en el teléfono con texto grande el reloj ya no se sale del panel: la fila (banderín · reloj) puede bajar a dos líneas
        // QA móvil: el panel (centrado, 300 px) tapaba el objetivo, el reloj, los contadores y medio minimapa. En el teléfono, como el duelo y la
        // Sombra, el objetivo se oculta durante la carrera y el panel va a la izquierda, sin llegar al minimapa (que sigue: marca el banderín)
        '@media (max-width:760px){body.v18-chispa-on #quest{display:none}#v18-chispa{top:calc(env(safe-area-inset-top,0px) + 58px);left:16px;right:auto;margin:0;width:min(300px,calc(100vw - 190px));padding:6px 10px}#v18-chispa .vc-n{font-size:calc(30px * var(--fs-k,1));line-height:1}#v18-chispa .vc-l{flex-wrap:wrap;justify-content:center;column-gap:8px;row-gap:0}' +
        '#v18-chispa .vc-m{font-size:calc(13px * var(--fs-k,1))}#v18-chispa.fin .vc-n{font-size:calc(22px * var(--fs-k,1))}}'; // W29a: más compacto, para que el aviso (bajo el minimapa) no tape la última fila
      document.head.appendChild(st);
    }
    const el = document.createElement('div'); el.id = 'v18-chispa'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    // W35 · lector de pantalla: el panel se nombra con su título; el reloj (cambia cada décima) y el récord no se anuncian solos
    el.setAttribute('aria-labelledby', 'vc-t');
    el.innerHTML = '<div class="vc-t" id="vc-t"></div><div class="vc-m"></div><div class="vc-n" hidden></div><div class="vc-l"><span class="vc-p"></span><span class="vc-s" aria-live="off"></span></div>' +
      '<div class="vc-c" aria-live="off"></div><div class="vc-r" aria-live="off"></div><div class="vc-k" aria-hidden="true"></div><div class="vc-pi" hidden></div>';
    document.body.appendChild(el);
    const q = c => el.querySelector(c);
    hud = { el, t: q('.vc-t'), m: q('.vc-m'), n: q('.vc-n'), p: q('.vc-p'), s: q('.vc-s'), c: q('.vc-c'), r: q('.vc-r'), k: q('.vc-k'), pi: q('.vc-pi'), cache: {} };
    hud.t.textContent = TXT.nombre;
    return hud;
  }
  // Chips de tecla (las teclas reales de G.input.mapa; en táctil, el nombre del botón de la pantalla). Cada texto, su propio nodo (se traduce solo)
  function pintarChips() {
    if (!hud) return;
    const m = (G.input && G.input.mapa) || {}, tk = k => (k === ' ' ? 'Espacio' : String(k || '').toUpperCase());
    const mover = ['arriba', 'izquierda', 'abajo', 'derecha'].map(a => tk(m[a] || { arriba: 'w', izquierda: 'a', abajo: 's', derecha: 'd' }[a])).join('');
    // en táctil, volando el botón Volar pasa a decir «Aterrizar»: entonces solo queda el chip de impulso
    const chips = TACTIL ? [[TXT.tImpulso, TXT.kRapido]].concat(F.MOVE.flying ? [] : [[TXT.tVolar, TXT.kAun]]) : [[mover, TXT.kCorrer], ['Shift', TXT.kRapido], [tk(m.volar || 'v'), TXT.kVolar]];
    const clave = chips.map(c => c.join(':')).join('|');
    if (hud.cache.k === clave) return; hud.cache.k = clave;
    hud.k.textContent = '';
    for (const [k, t] of chips) { const sp = document.createElement('span'), kb = document.createElement('kbd'), b = document.createElement('b'); kb.textContent = k; b.textContent = t; sp.append(kb, b); hud.k.appendChild(sp); }
  }
  // Pistas breves: una cada 5 s como mucho y cada una, una vez por carrera
  const pista = { t: 0, vis: 0, vistas: 0, sinBand: 0 };
  function mostrarPista(txt) { if (!hud) return; hud.pi.textContent = txt; hud.pi.hidden = false; pista.vis = 3; pista.t = 5; }
  function pasoPista(dt) {
    if (!hud) return;
    if (pista.vis > 0 && (pista.vis -= dt) <= 0) hud.pi.hidden = true;
    if (A.fase !== 'carrera') return;
    pista.sinBand += dt;
    if ((pista.t -= dt) > 0) return;
    const tecla = (k => (k === ' ' ? 'Espacio' : String(k || 'v').toUpperCase()))(((G.input && G.input.mapa) || {}).volar);
    if (!(pista.vistas & 1) && A.ci > A.sig && A.t > 3 && !F.MOVE.flying) { pista.vistas |= 1; mostrarPista(TACTIL ? TXT.pDelanteT : TXT.pDelante.replace('{}', tecla)); }
    else if (!(pista.vistas & 2) && pista.sinBand > 9) { pista.vistas |= 2; mostrarPista(TXT.pMapa); }
  }
  // Resultado: el panel se queda ~4 s con «¡Ganaste!» o «¡Chispa llegó primero!» y el tiempo (desde el menú se vuelve a los 3,5 s)
  let finT = 0;
  function mostrarFin(gana, ms) {
    if (!hud) return;
    clearTimeout(finT);
    hud.el.classList.add('fin'); hud.el.hidden = false; hud.pi.hidden = true;
    pon('n', gana ? TXT.fGana : TXT.fPierde); hud.n.hidden = false;
    pon('m', gana ? TXT.fTiempo.replace('{}', reloj(ms / 1000)) : TXT.fOtra);
    document.body.classList.add('v18-chispa-on'); // el panel de misiones sigue oculto mientras se ve el resultado (en el teléfono se solapaban)
    finT = setTimeout(ocultarFin, 4200);
  }
  function ocultarFin() { clearTimeout(finT); finT = 0; if (!hud) return; hud.el.classList.remove('fin'); if (A.fase === 'nada') { hud.el.hidden = true; document.body.classList.remove('v18-chispa-on'); } }
  const pon = (k, txt) => { if (hud.cache[k] !== txt) { hud.cache[k] = txt; hud[k].textContent = txt; } };
  function pintarHud() {
    if (!hud) return;
    const on = A.fase === 'cuenta' || A.fase === 'carrera';
    if (on && finT) ocultarFin();
    if (!finT) hud.el.hidden = !on;
    document.body.classList.toggle('v18-chispa-on', on || !!finT); if (!on) return;
    const n = A.fase === 'cuenta' ? String(Math.max(1, Math.ceil(A.cuenta))) : A.t < 0.8 ? TXT.ya : '';
    hud.n.hidden = !n; pon('n', n);
    pon('m', TXT.metaTxt); pintarChips();
    pon('c', A.ci >= RUTA.length - 1 ? TXT.rivalMeta : TXT.rival.replace('{}', Math.min(A.ci + 1, RUTA.length - 1)));
    pon('p', A.sig >= RUTA.length - 1 ? TXT.meta : TXT.punto.replace('{}', A.sig + 1));
    pon('s', reloj(A.fase === 'carrera' ? A.t : 0));
    const r = record(); pon('r', r && r.mejor ? TXT.record + ': ' + reloj(r.mejor / 1000) : '');
  }

  // ---------- Chispa (instancia del sistema de NPC) ----------
  function ponerChispa() {
    const inst = N.instancia(NPC); if (!inst) return;
    inst.x = A.cx; inst.z = A.cz; inst.meta = null; inst.giro = A.cr;
    inst.raiz.position.set(A.cx, H(A.cx, A.cz), A.cz); inst.raiz.rotation.y = A.cr;
  }
  function colocarEnSalida() {
    N.colocar(NPC, { x: SITIO.salida.x, z: SITIO.salida.z, rotY: SITIO.salida.rotY, aparece: activa, comenta: true });
    N.alUsar(NPC, { label: () => TXT.label, use: invitar, visible: () => A.fase === 'nada' && activa() });
  }

  // ---------- Carrera ----------
  function invitar() {
    if (A.fase !== 'nada') return false;
    const r = record();
    return N.decir(NPC, r && r.jugadas ? TXT.revancha : TXT.reto, () => empezar());
  }
  function empezar(o) {
    o = o || {};
    if (A.fase !== 'nada' || (!activa() && !o.forzar)) return false;
    montarBanderines(); montarHud();
    const s = SITIO.salida, p = RUTA[0], dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz) || 1, nx = -dz / d, nz = dx / d;
    Object.assign(A, { fase: 'cuenta', t: 0, cuenta: CUENTA_S, sig: 0, ci: 0, gagT: 0, gagHecho: false, ultimo: null });
    Object.assign(pista, { t: 2, vis: 0, vistas: 0, sinBand: 0 }); hud.pi.hidden = true;
    A.salidaJ = { x: s.x + nx * 1.6, z: s.z + nz * 1.6 };
    A.cx = s.x - nx * 1.6; A.cz = s.z - nz * 1.6; A.cr = Math.atan2(dx, dz);
    N.colocar(NPC, { comenta: false, anim: 'idle' });
    ponerChispa();
    sujetar();
    if (S.facing) { S.facing.x = dx / d; S.facing.z = dz / d; }
    try { G.camara.yaw = Math.atan2(-dx, -dz); if (G.camara.place) G.camara.place(true); } catch (e) { /* sin cámara */ }
    toast(TXT.cuenta, 2800); sonar('tick');
    emitir({ tipo: 'empieza' });
    pintarHud();
    return true;
  }
  function sujetar() { // durante la cuenta, Vittata espera en la línea de salida
    const p = A.salidaJ, M = F.MOVE;
    S.pos.x = p.x; S.pos.z = p.z; S.pos.y = H(p.x, p.z) + 0.02; S.vy = 0; M.vx = M.vz = 0; M.flying = false; M.swimming = false; M.grounded = true;
  }
  function terminar(gana) {
    const ms = Math.round(A.t * 1000), r0 = record() || {}, r = { mejor: r0.mejor || 0, ganadas: r0.ganadas || 0, jugadas: (r0.jugadas || 0) + 1, xp: !!r0.xp };
    let nuevo = false;
    if (gana) { r.ganadas++; if (!r.mejor || ms < r.mejor) { r.mejor = ms; nuevo = true; } }
    V.cambiarMundo(ID, r);
    A.fase = 'nada'; A.ultimo = { gana, ms, nuevo, chispa: A.ci };
    pintarHud(); pintarBanderines(0); mostrarFin(gana, ms);
    // Chispa vuelve andando a su sitio (si ganó, ya está en la meta: celebra)
    ponerChispa();
    N.colocar(NPC, { x: SITIO.salida.x, z: SITIO.salida.z, rotY: SITIO.salida.rotY, caminar: true, comenta: true, anim: undefined });
    if (gana) { sonar('unlock'); fx('gold', S.pos.x, S.pos.y + 1.2, S.pos.z, 14); if (nuevo) toast(TXT.nuevo.replace('{}', reloj(ms / 1000)), 3000); }
    else { sonar('ring'); N.animar(NPC, 'celebrar'); fx('stars', A.cx, H(A.cx, A.cz) + 1.4, A.cz, 10); }
    if (gana) pagarXP();
    emitir({ tipo: 'fin', gana, ms, nuevo });
    N.decir(NPC, gana ? TXT.gana : TXT.pierde);
    return A.ultimo;
  }
  function cancelar(motivo) {
    if (A.fase === 'nada') return false;
    A.fase = 'nada'; pintarHud(); pintarBanderines(0);
    ponerChispa();
    N.colocar(NPC, { x: SITIO.salida.x, z: SITIO.salida.z, rotY: SITIO.salida.rotY, caminar: true, comenta: true, anim: undefined });
    if (motivo !== 'sale') toast(TXT.lejos, 2600); // con Esc no hay aviso de «te alejaste» (no lo es; falta un texto propio con su inglés en content/cap1/en.js)
    emitir({ tipo: 'cancela', motivo: motivo || 'lejos' });
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
  // W35 · teclado: Esc deja la carrera (como alejarse, sin contar partida) y no abre además la Pausa (ui.js mira defaultPrevented)
  function teclaEsc(e) {
    if (e.key !== 'Escape' || e.repeat || (A.fase !== 'cuenta' && A.fase !== 'carrera')) return;
    if ((e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName)) || (G.pausa && G.pausa.activa && G.pausa.activa()) || otraCapaEsc()) return;
    e.preventDefault(); e.stopImmediatePropagation(); cancelar('sale');
  }
  addEventListener('keydown', teclaEsc, true);
  function moverChispa(dt) {
    if (A.gagT > 0) { if ((A.gagT -= dt) <= 0) N.animar(NPC, 'correr'); return false; }
    let paso = V_CHISPA * dt;
    while (paso > 0) {
      const p = RUTA[A.ci], dx = p.x - A.cx, dz = p.z - A.cz, d = Math.hypot(dx, dz);
      if (d > 1e-4) A.cr = Math.atan2(dx, dz);
      if (d > paso) { A.cx += dx / d * paso; A.cz += dz / d * paso; break; }
      A.cx = p.x; A.cz = p.z; paso -= d; A.ci++;
      if (A.ci >= RUTA.length) return true; // llegó a la meta
      if (A.ci === GAG.punto && !A.gagHecho) { // gag: celebra antes de tiempo
        A.gagHecho = true; A.gagT = GAG.s; N.animar(NPC, 'celebrar');
        try { G.dialogo.say([{ who: N.nombre(NPC), img: N.retrato(NPC), text: TXT.gag }], null, { libre: true, caja: false }); } catch (e) { /* sin diálogo */ }
        break;
      }
    }
    return false;
  }
  let reloj3d = 0;
  function paso(dt) {
    reloj3d += dt;
    if (A.fase === 'nada') {
      if ((A.xpT -= dt) <= 0) { A.xpT = 2; if (activa()) pagarXP(); }
      return;
    }
    if (A.fase === 'cuenta') {
      sujetar(); ponerChispa();
      if ((A.cuenta -= dt) <= 0) { A.fase = 'carrera'; A.t = 0; N.colocar(NPC, { anim: 'correr' }); ponerChispa(); sonar('dash'); }
    } else if (A.fase === 'carrera') {
      A.t += dt;
      const p = RUTA[A.sig], d = Math.hypot(S.pos.x - p.x, S.pos.z - p.z);
      if (d < R_PUNTO && S.pos.y - H(S.pos.x, S.pos.z) < ALTO_MAX) {
        A.sig++; pista.sinBand = 0; sonar('pickup'); fx('stars', p.x, H(p.x, p.z) + 2.2, p.z, 8);
        if (A.sig >= RUTA.length) { terminar(true); return; }
      }
      if (moverChispa(dt)) { ponerChispa(); terminar(false); return; }
      ponerChispa();
      if (Math.hypot(S.pos.x - SITIO.salida.x, S.pos.z - SITIO.salida.z) > R_SALE) { cancelar(); return; }
    }
    pasoPista(dt); pintarBanderines(reloj3d); pintarHud();
  }
  G.on('update', (dt, busy) => { if (A.manual) return; if (busy && A.fase === 'nada') return; paso(Math.min(dt, 0.1)); }, 48);
  G.on('apply', () => { if (A.fase !== 'nada') { A.fase = 'nada'; pintarHud(); pintarBanderines(0); colocarEnSalida(); } }, 52);
  colocarEnSalida();

  const mapa = () => {
    if (!activa()) return null;
    if (A.fase === 'cuenta' || A.fase === 'carrera') { const p = RUTA[A.sig]; return { x: p.x, z: p.z, nombre: TXT.siguiente }; }
    return { x: SITIO.salida.x, z: SITIO.salida.z, nombre: TXT.nombre };
  };
  const textos = () => { const d = N.def(NPC) || {}, l = [TXT.nombre, TXT.label, TXT.cuenta, TXT.ya, TXT.punto, TXT.meta, TXT.siguiente, TXT.tiempo, TXT.record, TXT.gag, TXT.nuevo, TXT.xp, TXT.lejos,
    TXT.metaTxt, TXT.rival, TXT.rivalMeta, TXT.kCorrer, TXT.kRapido, TXT.kVolar, TXT.kAun, TXT.pDelante, TXT.pDelanteT, TXT.pMapa, TXT.fGana, TXT.fPierde, TXT.fTiempo, TXT.fOtra].concat(TXT.reto, TXT.revancha, TXT.gana, TXT.pierde);
    for (const e in d.porEstado || {}) l.push(...(d.porEstado[e].dialogo || []));
    if (d.nombre) l.push(d.nombre.es); return l; };

  // ---------- W35 · teclado y lector de pantalla (lo llaman esta prueba y AV.accesibilidadTest) ----------
  function teclado() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    if (A.fase !== 'nada') return out;
    const nombre = el => (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(x => x.textContent.trim()).join(' ') || el.getAttribute('aria-label') || '';
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing && { x: S.facing.x, z: S.facing.z }, yaw0 = G.camara.yaw, man0 = A.manual, toast0 = G.ui.toast, r0 = JSON.stringify(record());
    const foco0 = document.activeElement;
    G.ui.toast = () => {}; A.manual = true;
    try {
      empezar({ forzar: true });
      const el = hud.el;
      check('W35 · Chispa: el panel de la carrera se anuncia (role=status, aria-live) con nombre; el reloj y el récord no se leen a cada décima',
        !el.hidden && el.getAttribute('role') === 'status' && el.getAttribute('aria-live') === 'polite' && !!nombre(el) && hud.s.getAttribute('aria-live') === 'off' && hud.r.getAttribute('aria-live') === 'off', nombre(el));
      check('W35 · Chispa: el panel no roba el foco (la carrera se juega con las teclas de siempre)', document.activeElement === foco0 && !el.querySelector('button, [tabindex]'));
      const gp = G.guiaControles && G.guiaControles.prueba, forz0 = gp && gp.forzado;
      if (gp) gp.forzado = 'teclado';
      if (gp && gp.mostrar(true)) {
        const kg = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.body.dispatchEvent(kg);
        const cerrada = gp.el.panel.hidden && !gp.panelAbierto, fase = A.fase;
        if (!cerrada) gp.cerrar();
        check('W35 · Chispa: con la guía de controles abierta, Esc cierra la guía y no deja la carrera', cerrada && fase !== 'nada' && !kg.defaultPrevented, JSON.stringify({ cerrada, fase, esc: kg.defaultPrevented }));
      } else check('W35 · Chispa: con la guía de controles abierta, Esc cierra la guía y no deja la carrera', !gp, gp ? 'la guía no se abrió' : 'sin guía de teclado (sin cargar)');
      if (gp) gp.forzado = forz0;
      const kd = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); document.body.dispatchEvent(kd);
      document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }));
      const pz = document.getElementById('pause'); let pausa = false; try { pausa = !!(pz && pz.matches(':popover-open')); if (pausa) pz.hidePopover(); } catch (e) { /* sin popover */ }
      check('W35 · Chispa: Esc deja la carrera (sin contar partida) y no abre la Pausa', A.fase === 'nada' && kd.defaultPrevented && el.hidden && !pausa && JSON.stringify(record()) === r0, JSON.stringify({ fase: A.fase, esc: kd.defaultPrevented, pausa }));
    } catch (e) { check('W35 · Chispa: teclado sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    finally {
      if (A.fase !== 'nada') { A.fase = 'nada'; pintarHud(); pintarBanderines(0); }
      A.manual = man0; G.ui.toast = toast0;
      S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; } G.camara.yaw = yaw0;
      colocarEnSalida();
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
    const recursos = () => (performance.getEntriesByType('resource') || []).map(r => r.name).filter(n => /models\/personajes\/chispa/.test(n));
    // QA-203: el sitio se mide con el entorno cargado del todo, como lo encuentra el jugador al llegar (y no con lo que una
    // prueba anterior dejó a medias): se fuerza el streaming de edificios alrededor, se espera a que su cola termine, a que
    // solidos.js recoja los edificios nuevos (lo hace cada 2 s) y se rasteriza todo lo pendiente (edificios y flora)
    const asentar = async (x, z) => { ir(x, z); correr(0.05); const ST = G.mundo && G.mundo.streaming;
      if (ST && ST.alrededor) { try { await Promise.race([ST.alrededor(x, z), esperar(60000)]); if (ST.terminar) await ST.terminar({ topeMs: 60000 }); } catch (e) { /* */ } }
      await esperar(2300); try { if (G.solidos && G.solidos.terminar) G.solidos.terminar(); } catch (e) { /* */ } };
    const cerrar = () => { try { G.dialogo.clear(); } catch (e) { /* */ } try { G.dialogo.cancelarLibre && G.dialogo.cancelarLibre(); } catch (e) { /* */ } };
    // corre la carrera entera: con «jugar» Vittata corre (Mayús + W) hacia el siguiente banderín, como un jugador con teclado
    const carrera = (jugar) => {
      const r = { pasos: 0, sig: [] };
      if (!empezar({ forzar: true })) return null;
      const h = 1 / 30;
      try {
        for (let k = 0; k < 2400 && A.fase !== 'nada'; k++) {
          if (jugar && A.fase === 'carrera') {
            keys.add('w'); if (jugar !== 'andar') keys.add('shift');
            const p = RUTA[A.sig]; G.camara.yaw = Math.atan2(-(p.x - S.pos.x), -(p.z - S.pos.z));
          }
          if (A.fase === 'carrera') F.step(h, false);
          N.paso(h, false); paso(h); r.pasos++;
          if (r.sig[r.sig.length - 1] !== A.sig) r.sig.push(A.sig);
        }
      } finally { keys.delete('w'); keys.delete('shift'); }
      r.ultimo = A.ultimo; return r;
    };
    try {
      check('1 · Con la bandera apagada (?v18=0) no se cargó nada: ni chispa.js ni el modelo de Chispa', antes.v18 ? true : (!antes.chispa && !antes.glb), antes.v18 ? 'bandera puesta en esta sesión (por defecto; la carga se comprueba con ?v18=0)' : JSON.stringify(antes));
      cancelar(); A.forzar = false; V.cambiarMundo(ID, null);
      // 2 · sin bandera (y sin forzar), aunque Vittata esté al lado, no aparece nada
      // (la V18 va encendida por defecto desde el 6-nov: se apaga G.V18 solo durante este bloque, como con ?v18=0, y se deja como estaba)
      const v18bk = G.V18; let sinBandera = false;
      G.V18 = false;
      try { ir(SITIO.salida.x + 4, SITIO.salida.z + 4); correr(0.3); await esperar(200); correr(0.1);
        sinBandera = !N.instancia(NPC) && N.activos().indexOf(NPC) < 0 && mapa() === null && !empezar(); } finally { G.V18 = v18bk; }
      check('2 · Sin la bandera V18 no aparece Chispa, ni su marcador, ni se puede empezar la carrera', sinBandera, N.activos().join(','));
      // 2b · QA-192: con la V18 encendida pero fuera del cap. 1 (packs 2-6) tampoco aparece
      const packBk = G.pack && G.pack.id; let fueraPack = false;
      if (packBk) { G.pack.id = 'ep4';
        try { ir(SITIO.salida.x + 4, SITIO.salida.z + 4); correr(0.3); await esperar(200); correr(0.1);
          fueraPack = !N.instancia(NPC) && N.activos().indexOf(NPC) < 0 && mapa() === null && !empezar(); } finally { G.pack.id = packBk; } }
      check('2b · Con la V18 encendida fuera del cap. 1 (pack ep4) no aparece Chispa ni su marcador ni la carrera (QA-192)', packBk ? fueraPack : true, 'pack ' + packBk + ' · activos ' + N.activos().join(','));
      A.forzar = true;
      // 3 · lejos: carga diferida
      const villa = (T.mapa && T.mapa.lugares && T.mapa.lugares.villa) || { x: 150, z: 170 };
      for (const id of N.activos()) N.liberar(id);
      const rec0 = recursos().length, ped0 = N.stats().pedidos.filter(p => /chispa/.test(p)).length;
      ir(villa.x, villa.z); correr(0.3); await esperar(300); correr(0.1);
      check('3 · Carga diferida: lejos (> 150 m) no está Chispa ni se pidió su modelo', Math.hypot(villa.x - SITIO.salida.x, villa.z - SITIO.salida.z) > 150 && !N.instancia(NPC) && recursos().length === rec0 && N.stats().pedidos.filter(p => /chispa/.test(p)).length === ped0,
        'dist ' + Math.hypot(villa.x - SITIO.salida.x, villa.z - SITIO.salida.z).toFixed(0) + ' m · Δrecursos ' + (recursos().length - rec0));
      // 4 · cerca: aparece con su modelo (chispa.glb), máximo 2 personajes a la vez
      ir(SITIO.salida.x + 10, SITIO.salida.z + 10); correr(0.2);
      for (let i = 0; i < 100 && !N.instancia(NPC); i++) { await esperar(100); correr(0.05); }
      const inst = N.instancia(NPC);
      check('4 · Cerca (< 90 m) aparece Chispa con su modelo propio y sus acciones (Idle, Correr, Celebrar); máx. 2 personajes', !!inst && !inst.provisional && ['Idle', 'Correr', 'Celebrar'].every(n => inst.acciones[n]) && N.activos().length <= N.MAX_ACTIVOS && N.stats().pedidos.some(p => /chispa\.glb/.test(p)),
        inst ? Object.keys(inst.acciones).join(',') + ' · activos ' + N.activos().join(',') : 'sin instancia');
      // 5 · el sitio: en seco, sin troncos, colisiones ni sólidos en la ruta; lejos del puerto, del minigolf y de la explanada del duelo
      for (const p of RUTA) await asentar(p.x, p.z); // QA-203: lo que ve el jugador allí: streaming de la zona cargado del todo y sus sólidos (casas, ramas) rasterizados
      const VG = G.vegetacion, P = VG && VG.instancias, inf = VG && VG.info, tr = [];
      if (P && inf) for (const m in P) { const I = inf[m], PM = P[m]; if (!I || !PM) continue; const roca = /roca|piedra|tronco/.test(m); if (!roca && !(I.tronco >= 0.05)) continue;
        for (let i = 0; i < PM.n; i++) { const x = PM.pos[i * 4], z = PM.pos[i * 4 + 2], sc = PM.pos[i * 4 + 3]; if (Math.hypot(x - SITIO.salida.x, z - SITIO.salida.z) < 45) tr.push({ x, z, r: roca ? Math.max(0.5, (I.ancho || 1) * 0.5 * sc) : Math.max(0.2, I.tronco * sc) }); } }
      const cols = (F.colliders || []).filter(c => c && c.x != null && Math.hypot(c.x - SITIO.salida.x, c.z - SITIO.salida.z) < 50 && !/^v18npc/.test(c.id || ''));
      const dCol = (x, z, c) => c.hx ? Math.hypot(Math.max(0, Math.abs(x - c.x) - c.hx), Math.max(0, Math.abs(z - c.z) - c.hz)) : Math.hypot(x - c.x, z - c.z) - (c.r || 0);
      let peor = '', mT = 99, mojado = 0, solido = 0, largo = 0, pend = 0;
      for (let i = 0; i < RUTA.length; i++) { const a = i ? RUTA[i - 1] : SITIO.salida, b = RUTA[i], L = Math.hypot(b.x - a.x, b.z - a.z); largo += L; let hp = H(a.x, a.z);
        for (let s = 0; s <= L; s += 0.5) { const x = a.x + (b.x - a.x) * s / L, z = a.z + (b.z - a.z) * s / L, h = H(x, z);
          pend = Math.max(pend, Math.abs(h - hp) / 0.5); hp = h;
          if (G.agua && G.agua.levelAt(x, z) > h - 0.3) mojado++;
          for (const t of tr) { const d = Math.hypot(x - t.x, z - t.z) - t.r; if (d < mT) { mT = d; peor = 'tronco'; } }
          for (const c of cols) { const d = dCol(x, z, c); if (d < mT) { mT = d; peor = c.id || c.kind || '?'; } }
          if (G.solidos && G.solidos.activo && [0.3, 0.9, 1.5, 2.5].some(y => G.solidos.dentro(x, z, h + y) > -Infinity)) solido++; } }
      const puerto = { x: 73.6, z: -75.2 }, golf = G.v18minigolf && G.v18minigolf.sitio, duelo = G.v18combate && G.v18combate.sitio;
      const dist = q => q ? Math.hypot(q.x - SITIO.salida.x, q.z - SITIO.salida.z) : Infinity;
      const lejos = { puerto: dist(puerto), villa: dist(villa), golf: dist(golf), duelo: dist(duelo) };
      check('5 · Sitio abierto: ruta de ' + RUTA.length + ' puntos en seco, sin troncos, colisiones ni sólidos; lejos del puerto, del minigolf y del duelo (> 120 m)',
        !mojado && !solido && mT >= 0.8 && pend < 0.9 && Math.min(lejos.puerto, lejos.villa, lejos.golf, lejos.duelo) > 120 && (!G.zonas || !G.zonas.zonaEn || !G.zonas.zonaEn(SITIO.salida.x, SITIO.salida.z)),
        'largo ' + largo.toFixed(0) + ' m · libre ' + mT.toFixed(2) + ' m' + (mT < 0.8 ? ' (' + peor + ')' : '') + ' · pendiente ' + pend.toFixed(2) + ' · mojado ' + mojado + ' · sólidos ' + solido + ' · ' + Object.keys(lejos).map(k => k + ' ' + (isFinite(lejos[k]) ? lejos[k].toFixed(0) : '—')).join(' '));
      // 6 · minimapa
      const mm = mapa();
      check('6 · Marcador del minimapa en Chispa, con nombre', mm && mm.nombre === TXT.nombre && Math.hypot(mm.x - SITIO.salida.x, mm.z - SITIO.salida.z) < 0.1);
      // 7 · ganar con teclas simuladas (Mayús + W hacia cada banderín)
      ir(SITIO.salida.x, SITIO.salida.z);
      const it = N.instancia(NPC) && G.interaccion.nearest && G.interaccion.nearest();
      check('7a · Junto a Chispa, Acción ofrece la carrera', it && it.id === 'v18npc_' + NPC && it.label() === TXT.label, it && it.id);
      const g1 = carrera(true); cerrar();
      const tChispa = (largo / V_CHISPA + GAG.s) * 1000;
      check('7 · Con input simulado (correr hacia cada banderín) se gana: 4 banderines y la meta en orden, antes que Chispa', g1 && g1.ultimo && g1.ultimo.gana && g1.sig.join('') === '012345' && g1.ultimo.ms < tChispa,
        g1 ? JSON.stringify({ ms: g1.ultimo && g1.ultimo.ms, chispa: Math.round(tChispa), orden: g1.sig.join(''), pasos: g1.pasos }) : 'no empezó');
      const r1 = record();
      check('8 · Resultado y récord en el progreso V18 (mundo.carrera_chispa)', r1 && r1.ganadas === 1 && r1.jugadas === 1 && r1.mejor === g1.ultimo.ms && g1.ultimo.nuevo && toasts.some(t => t === TXT.nuevo.replace('{}', reloj(r1.mejor / 1000))), JSON.stringify(r1));
      check('9 · 30 XP al ganar la primera vez', xpDado.length === 1 && xpDado[0][1] === XP_GANAR && r1.xp === true, JSON.stringify(xpDado));
      // 10 · perder sin tocar nada
      correr(1); ir(SITIO.salida.x, SITIO.salida.z);
      const p1 = carrera(false); cerrar();
      const r2 = record();
      check('10 · Sin input se pierde: Chispa llega primero (celebra antes de tiempo en el banderín 2 y aun así gana)', p1 && p1.ultimo && !p1.ultimo.gana && p1.ultimo.chispa === RUTA.length && A.gagHecho && toasts.length >= 1,
        p1 ? JSON.stringify(p1.ultimo) : 'no empezó');
      check('11 · Perder no cambia el récord ni da XP; cuenta la partida', r2.mejor === r1.mejor && r2.ganadas === 1 && r2.jugadas === 2 && xpDado.length === 1, JSON.stringify(r2));
      // 12 · persiste tras recargar; la XP no se repite (ni con otra victoria)
      V.recargar(); G.emit('apply'); await esperar(50);
      const r3 = record();
      check('12 · Tras recargar siguen el récord, las victorias y las partidas', r3 && r3.mejor === r1.mejor && r3.ganadas === 1 && r3.jugadas === 2 && r3.xp === true, JSON.stringify(r3));
      correr(1); ir(SITIO.salida.x, SITIO.salida.z);
      const g2 = carrera('andar'); cerrar();
      check('13 · Andando (sin Mayús) también se gana; la XP es una sola vez: otra victoria (y pagarXP tras recargar) no la repite', g2 && g2.ultimo && g2.ultimo.gana && pagarXP() === 0 && xpDado.length === 1 && record().ganadas === 2, JSON.stringify(xpDado) + ' · andando ' + (g2 && g2.ultimo && g2.ultimo.ms) + ' ms');
      // 14 · alejarse cancela; durante la carrera el minimapa marca el siguiente banderín
      ir(SITIO.salida.x, SITIO.salida.z); empezar({ forzar: true }); correr(CUENTA_S + 0.2);
      const mmC = mapa();
      ir(SITIO.salida.x + R_SALE + 10, SITIO.salida.z); correr(0.1);
      check('14 · En carrera el minimapa marca el banderín siguiente; alejarse > 70 m cancela sin contar partida', mmC && mmC.nombre === TXT.siguiente && Math.hypot(mmC.x - RUTA[0].x, mmC.z - RUTA[0].z) < 0.1 && A.fase === 'nada' && record().jugadas === 3 && toasts.includes(TXT.lejos));
      cerrar();
      // 17 · pul3 (QA V18.3): también en escritorio el panel de misiones de la historia (#quest) se oculta durante la carrera y vuelve al
      // salir por cualquier vía: dejarla (Esc) o alejarse
      const qEl = document.getElementById('quest'), qVis = () => !!qEl && getComputedStyle(qEl).visibility !== 'hidden' && getComputedStyle(qEl).display !== 'none';
      ocultarFin(); // el panel del resultado de la partida anterior (mantiene oculto #quest unos segundos) no cuenta aquí
      const q0 = qVis();
      ir(SITIO.salida.x, SITIO.salida.z); empezar({ forzar: true }); correr(0.1);
      const qCuenta = qVis(); correr(CUENTA_S + 0.2);
      const qDentro = qVis(); cancelar('sale');
      const qSale = qVis();
      ir(SITIO.salida.x, SITIO.salida.z); empezar({ forzar: true }); correr(CUENTA_S + 0.2);
      ir(SITIO.salida.x + R_SALE + 10, SITIO.salida.z); correr(0.1);
      const qLejos = qVis(), lejosOk = A.fase === 'nada';
      check('17 · Durante la carrera (también en escritorio) no se ve el panel de misiones de la historia (#quest) y vuelve al salir', !qCuenta && !qDentro && qSale === q0 && lejosOk && qLejos === q0,
        JSON.stringify({ ancho: innerWidth, q0, qCuenta, qDentro, qSale, qLejos, lejosOk }));
      cerrar();
      // 18 · Cómo se juega (Kelvin 8-nov: «no se entiende cómo hacer los movimientos»): meta a la vista, rival, chips con tecla, pista y resultado
      {
        const rG = V.mundo(ID);
        ir(SITIO.salida.x, SITIO.salida.z); empezar({ forzar: true });
        correr(0.1);
        const chips = [...hud.k.querySelectorAll('span')].map(sp => sp.querySelector('kbd').textContent + '=' + sp.querySelector('b').textContent);
        const mapaT = (G.input && G.input.mapa) || {}, volarK = String(mapaT.volar || 'v').toUpperCase();
        check('18a · En la cuenta: la meta se ve en el panel y los chips dicen las teclas reales (correr, más rápido, volar)',
          !hud.el.hidden && hud.m.textContent === TXT.metaTxt && hud.c.textContent === TXT.rival.replace('{}', 1) &&
          (TACTIL ? chips.join('|') === TXT.tImpulso + '=' + TXT.kRapido + '|' + TXT.tVolar + '=' + TXT.kAun : chips.length === 3 && chips[1] === 'Shift=' + TXT.kRapido && chips[2] === volarK + '=' + TXT.kVolar && /^[A-Z]{4}=/.test(chips[0])),
          JSON.stringify({ m: hud.m.textContent, c: hud.c.textContent, chips }));
        correr(CUENTA_S + 0.1); correr(4); // quieta: Chispa se adelanta
        const pd = hud.pi.hidden ? '' : hud.pi.textContent;
        check('18b · Si Chispa va delante sale una pista breve con la tecla de volar; el panel dice por qué banderín va Chispa',
          pd === (TACTIL ? TXT.pDelanteT : TXT.pDelante.replace('{}', volarK)) && A.ci >= 1 && hud.c.textContent === (A.ci >= RUTA.length - 1 ? TXT.rivalMeta : TXT.rival.replace('{}', Math.min(A.ci + 1, RUTA.length - 1))),
          JSON.stringify({ pd, ci: A.ci, c: hud.c.textContent }));
        terminar(true); cerrar();
        const fG = { vis: !hud.el.hidden, fin: hud.el.classList.contains('fin'), n: hud.n.textContent, m: hud.m.textContent };
        ocultarFin(); const ocultoG = hud.el.hidden;
        ir(SITIO.salida.x, SITIO.salida.z); empezar({ forzar: true }); const sinFin = !hud.el.classList.contains('fin') && hud.m.textContent === TXT.metaTxt;
        correr(CUENTA_S + 0.1); terminar(false); cerrar();
        const fP = { vis: !hud.el.hidden, n: hud.n.textContent, m: hud.m.textContent };
        ocultarFin();
        check('18c · Al terminar, el panel dice claro qué pasó: «¡Le ganaste a Chispa!» con tu tiempo o «¡Chispa llegó primero!»; se va solo y no se queda en la siguiente',
          fG.vis && fG.fin && fG.n === TXT.fGana && /^Tu tiempo: \d/.test(fG.m) && ocultoG && sinFin && fP.vis && fP.n === TXT.fPierde && fP.m === TXT.fOtra && hud.el.hidden,
          JSON.stringify({ fG, fP, ocultoG, sinFin }));
        V.cambiarMundo(ID, rG);
      }
      for (const r of teclado()) out.push(r); // W35
      // 15 · textos
      if (!window.AV_EN) { try { await AVE.assets.script('content/cap1/en.js'); } catch (e) { /* sin diccionario */ } }
      const D = window.AV_EN || {}, pats = Object.keys(D).filter(k => k.indexOf('{}') >= 0).map(k => new RegExp('^' + k.split('{}').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$'));
      const tx = textos(), faltan = tx.filter(t => !D[t] && !pats.some(re => re.test(t)));
      check('15 · Todos los textos de Chispa tienen inglés en content/cap1/en.js', !faltan.length, faltan.slice(0, 6).join(' | '));
      check('15b · Ningún texto ni dato menciona el nombre del modelador (directiva V18.3 §1)', !/\x66eix/i.test(tx.join(' ') + JSON.stringify(N.def(NPC))));
      check('16 · No toca el inventario del capítulo', JSON.stringify(S.inv || {}) === inv0);
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    // restaurar
    cerrar(); if (A.fase !== 'nada') { A.fase = 'nada'; pintarHud(); pintarBanderines(0); }
    keys.delete('w'); keys.delete('shift');
    A.manual = false; A.forzar = false; A.ultimo = null;
    if (evo0 === undefined) delete G.v18evo; else G.v18evo = evo0;
    G.ui.toast = toast0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; if (fac0 && S.facing) { S.facing.x = fac0.x; S.facing.z = fac0.z; } G.camara.yaw = yaw0;
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); colocarEnSalida(); N.paso(0.01, false);
    if (titAbierta) tit.open = true; if (cre) cre.hidden = creOculto; try { G.pausa.sincronizar(); } catch (e) { /* sin pausa */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18chispa = { ID, SITIO, RUTA, V_CHISPA, XP_GANAR, empezar, cancelar, invitar, paso, record, pagarXP, mapa, textos, teclado, estado: () => A, test };
  return G.v18chispa;
};
