/* Juego · Expansión · Minijuego de pesca, «Pesca en el muelle» (G.v18pesca). Kelvin, 8-nov (ROADMAP, «Después de la temporada 1»:
   minijuego de pesca para la expansión). Diversión primero: lanzar, esperar el pique, recoger y soltar. Sin monedas, tienda ni azar
   de pago: los puntos solo cuentan en la ronda y el récord es local.
   - Bandera: SOLO con ?expansion=1 (o localStorage amazonaverse.expansion = '1'; G.EXPANSION en boot.js). Apagada por defecto:
     sin tarjeta en el menú, sin botón en la Pausa, sin piezas y sin carga del script. Nada se publica sin el visto bueno de Kelvin.
   - Dónde: al final del muelle de Villa Raíz (lugar «muelle» del mapa; pieza propia del mapa, piso a 1,3 m de z ≈ 200 a 232), mirando
     a la bahía (agua a nivel 0 desde z ≈ 206). Medido en el juego con el streaming cargado. No se añade ningún edificio: la caña, el
     sedal, el corcho, la onda y el pez son piezas simples (primitivas de Three.js, flatShading), visibles solo mientras se pesca.
   - Cómo se juega (una ronda de 2 min 30 s):
       1 Lanzar: mantener Espacio (o el botón Lanzar) y soltar; la fuerza sube y baja: más fuerza, más lejos (5 a 16 m). ← → apuntan.
       2 Esperar: el corcho flota; a veces solo pican de lado (tiembla). Cuando se hunde: «¡Pica!».
       3 Clavar: pulsar en el momento (1,6 s de margen). Si no, el pez se va y se vuelve a lanzar.
       4 Recoger: mantener para subir el anzuelo y soltar para que baje; dentro de la zona verde (el pez) se llena la barra. Si el pez se
         cansa (12 s), la zona se agranda: nadie se queda atascado.
       5 Foto y soltar: la ficha del pez (nombre, nombre científico, un dato y su fuente) y «Soltar» (vuelve al agua). Las invasoras no
         se sueltan: «Reportar al DRNA» (sin matar a nadie; aviso G.emit('expansion:invasora') por si el módulo de invasoras escucha).
     Computadora: Espacio / E / Intro (mantener y soltar) · ← → apuntar · Esc salir · R otra ronda (al final).
     Táctil: botón grande (Lanzar / Recoger / Soltar), ◀ ▶ y Salir (≥ 52 px).
   - Peces (datos verificables, ver FUENTES): pargo prieto, róbalo, anguila americana y sábalo (nativos de la costa y los estuarios de
     Puerto Rico) y la tilapia de Mozambique (invasora). Lejos se pican más los grandes (sábalo, róbalo); cerca, el pargo y la anguila.
   - Modo Escuela / calidad «baja»: sin onda en el agua ni burbujas; el resto igual.
   - Récord: por sesión y el mejor en el progreso V18 (G.v18.mundo('pesca_muelle') = { mejor, vistos }) si está cargado.
   API: irYJugar(), iniciar(o), salir(), estado(), paso(dt), PECES, SITIO, disponible(), test(o). Prueba: AV.v18PescaTest(). */
window.AVV18Pesca = function (G) {
  'use strict';
  if (G.v18pesca) return G.v18pesca;
  const S = G.S, F = G.fisica, M = F && F.MOVE, scene = G.renderer.scene;
  const V = () => G.v18 || null;
  const ID = 'pesca_muelle';
  // Final del muelle de Villa Raíz (medido: piso a 1,3 m hasta z ≈ 232; agua a nivel 0 delante)
  const SITIO = { x: 150, z: 229, yaw: Math.PI };
  const RONDA = 150, VENTANA = 1.6, CANSADO = 12, D_MIN = 5, D_MAX = 16, GIRO_MAX = 0.6, PING = 1.2;
  // Fuentes (consultadas el 9-nov-2026; el texto corto de cada una sale en la ficha):
  //   flmnh    floridamuseum.ufl.edu/discover-fish/species-profiles/ (lutjanus-griseus, common-snook, tarpon): hábitat del pargo prieto,
  //            vejiga natatoria del sábalo que se llena de aire tragado en la superficie
  //   fao      fao.org/docrep/pdf/009/ac481e/ac481e24.pdf: «Pargo prieto», nombre local de Lutjanus griseus en Puerto Rico
  //   mote     mote.org/animal-encyclopedia/common-snook/: el róbalo es hermafrodita protándrico (de macho a hembra)
  //   usfws    fws.gov/species/american-eel-anguilla-rostrata: la anguila americana nace en el mar de los Sargazos
  //   usfws18  fws.gov/rivers/sites/default/files/documents/caribbean-fish-spanish.pdf: anguila y olivo, «alta necesidad de conservación»
  //   seagrant repository.library.noaa.gov/view/noaa/56567: DRNA (feb-2004), el sábalo pescado se devuelve al agua (obligatorio); foto con el
  //            pez en el agua y poco tiempo fuera (consejo de la ficha)
  //   nemesis  invasions.si.edu/nemesis/species_summary/170015: tilapia de Mozambique llevada a PR en 1958; en 1988, la más abundante en tres estuarios
  // Peces. peso: cuánto pica (cerca / lejos); dif: zona del pez en la barra (más estrecha, más difícil); vel: lo que se mueve
  const FUENTES = {
    flmnh: 'Florida Museum of Natural History, Discover Fishes',
    fao: 'FAO, guía de especies del Atlántico centro-occidental',
    mote: 'Mote Marine Laboratory, Common snook',
    usfws: 'U.S. Fish & Wildlife Service, American eel',
    usfws18: 'USFWS, «Peces de agua dulce del Caribe» (2018)',
    seagrant: 'Neal, Allen y Correa, Sea Grant / NOAA, «Response of Atlantic Tarpon to catch-and-release angling in Puerto Rico»',
    nemesis: 'Smithsonian Environmental Research Center, NEMESIS, Oreochromis mossambicus'
  };
  const PECES = [
    { id: 'pargo', nombre: 'Pargo prieto', cient: 'Lutjanus griseus', pts: 10, peso: [5, 2], zona: 0.34, vel: 0.6, color: '#8a6a5a', panza: '#d9b8a0', largo: 0.5,
      dato: 'De pequeño crece entre las yerbas marinas y los mangles; de grande se va a canales más hondos.', fuente: [FUENTES.flmnh, FUENTES.fao] },
    { id: 'robalo', nombre: 'Róbalo', cient: 'Centropomus undecimalis', pts: 20, peso: [2, 4], zona: 0.28, vel: 0.9, color: '#b8c4b0', panza: '#f2f2e6', largo: 0.75, raya: true,
      dato: 'Vive en los mangles y la orilla. Muchos róbalos nacen machos y de grandes se vuelven hembras.', fuente: [FUENTES.mote, FUENTES.flmnh] },
    { id: 'anguila', nombre: 'Anguila americana', cient: 'Anguilla rostrata', pts: 20, peso: [3, 1], zona: 0.28, vel: 1.1, color: '#6b6a3a', panza: '#c9c08a', largo: 0.85, anguila: true,
      dato: 'Nace en el mar de los Sargazos, en medio del Atlántico, y sus larvas llegan con las corrientes. En Puerto Rico necesita protección.', fuente: [FUENTES.usfws, FUENTES.usfws18] },
    { id: 'sabalo', nombre: 'Sábalo', cient: 'Megalops atlanticus', pts: 40, peso: [1, 3], zona: 0.22, vel: 1.3, color: '#9fb6c8', panza: '#eef4f8', largo: 1.1,
      dato: 'Traga aire en la superficie y lo guarda en su vejiga natatoria, como un pulmón. En Puerto Rico, desde 2004, todo sábalo pescado se devuelve al agua.', fuente: [FUENTES.flmnh, FUENTES.seagrant] },
    { id: 'tilapia', nombre: 'Tilapia de Mozambique', cient: 'Oreochromis mossambicus', pts: 15, peso: [1.5, 0.8], zona: 0.32, vel: 0.7, color: '#5c6b5a', panza: '#a8b09a', largo: 0.45, invasora: true,
      dato: 'La trajeron a Puerto Rico en 1958 para limpiar de algas los canales de riego. En 1988 ya era el pez más abundante en tres estuarios de la isla.', fuente: [FUENTES.nemesis] }
  ];
  const PEZ = {}; for (const p of PECES) PEZ[p.id] = p;
  const TXT = {
    nombre: 'Pesca en el muelle', label: 'Pescar en el muelle',
    empieza: '¡A pescar! Mantén pulsado para lanzar y suelta. Tienes 2 minutos y medio.',
    guia: 'Mantén Espacio y suelta para lanzar · ← → apuntar', guiaT: 'Mantén Lanzar y suelta · ◀ ▶ apuntar',
    pEspera: 'Espera a que el corcho se hunda…', pMordisco: 'Solo está mordisqueando… espera.', pPronto: '¡Muy pronto! Espera a que se hunda del todo.',
    pPica: '¡Pica! ¡Ahora!', pTira: 'Mantén para subir el anzuelo y suelta para bajarlo: quédate en la zona verde.', pCansado: 'El pez se está cansando: ¡ya casi!',
    escapo: 'Se llevó la carnada… ¡lanza otra vez!', seFue: '¡Se escapó! Ya volverá. Lanza otra vez.', tierra: 'Muy cerca: lanza con más fuerza.',
    lanzar: 'Lanzar', soltarB: 'Soltar', recoger: '¡Recoge!', clavar: '¡Clava!', esperarB: 'Esperar', soltarPez: 'Soltarlo', reportar: 'Reportar al DRNA',
    salir: 'Salir', otra: 'Otra ronda', menu: 'Volver al menú', seguir: 'Seguir explorando', izq: 'Apuntar a la izquierda', der: 'Apuntar a la derecha',
    fuerza: 'Fuerza', tiempo: 'Tiempo', peces: 'Peces', puntos: 'Puntos', record: 'Récord',
    foto: '¡Foto para tu álbum!', fuente: 'Fuente', nativo: 'Nativo de Puerto Rico', invasora: 'Especie invasora',
    consejo: 'Consejo de pescador: la foto, rápida y con el pez cerca del agua.',
    alAgua: '¡Al agua! Nada feliz otra vez.', reportado: '¡Gracias! Las invasoras no se devuelven al agua: avisar al DRNA ayuda a los peces nativos.',
    invasoraNo: 'Las especies invasoras no se devuelven al agua. Repórtala al DRNA.',
    fin: '¡Se acabó el tiempo!', nuevo: '¡Nuevo récord!', album: 'Tu álbum de hoy', nada: 'Hoy no picó nada. ¡Otra ronda!',
    sale: '¡Hasta luego! El muelle te espera en Villa Raíz.', cerrado: 'La pesca todavía no está abierta.'
  };
  const tiempoTxt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const pecesTxt = n => 'Peces: ' + n, puntosTxt = n => 'Puntos: ' + n, recordTxt = n => 'Récord: ' + n, tiempoEt = s => 'Tiempo: ' + tiempoTxt(s);
  const masTxt = n => '+' + n + ' puntos', finTxt = (n, p) => (n === 1 ? '1 pez' : n + ' peces') + ' · ' + p + ' puntos';
  const fuenteTxt = f => 'Fuente: ' + f.join(' · ');
  const atrapado = nom => '¡Atrapaste: ' + nom + '!';

  // ---------- Utilidades ----------
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 2400); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { if (barato()) return; try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18pesca', ev); } catch (e) { /* sin oyentes */ } };
  const barato = () => { const c = G.renderer && G.renderer.calidad; return !!c && (c.nivel === 'bajo' || !!c.escuela); };
  let _mmF = null, _mm = null;
  const tactil = () => { const f = window.matchMedia; if (!f) return false; if (f !== _mmF) { _mmF = f; _mm = matchMedia('(pointer: coarse)'); } return !!(_mm && _mm.matches); };
  const nivelAgua = (x, z) => { let l = -Infinity; try { if (G.agua && G.agua.levelAt) l = G.agua.levelAt(x, z); } catch (e) { /* sin agua */ } return l; };
  const suelo = (x, z) => { try { return G.terreno.surfaceY ? G.terreno.surfaceY(x, z, 5) : G.terreno.height(x, z); } catch (e) { return 0; } };
  const disponible = () => !!G.EXPANSION && !!(G.pack && G.pack.id === 'cap1');
  // Semilla propia (la prueba la fija): qué pez pica, cuándo y cómo se mueve
  let semilla = (Date.now() % 2147483646) + 1;
  const azar = () => { semilla = semilla * 16807 % 2147483647; return (semilla - 1) / 2147483646; };

  // ---------- Piezas (simples, solo mientras se pesca) ----------
  let P = null;
  function piezas() {
    if (P) return P;
    const T = window.THREE, g = new T.Group(); g.name = 'pesca:muelle'; g.visible = false;
    const lam = c => new T.MeshLambertMaterial({ color: c, flatShading: true });
    const cana = new T.Mesh(new T.CylinderGeometry(0.018, 0.035, 2.4, 6), lam('#7a5230')); cana.name = 'pesca:caña';
    const mango = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.4, 6), lam('#2f2a26')); mango.position.y = -1.0; cana.add(mango);
    const carrete = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.06, 10), lam('#d8d2c4')); carrete.rotation.z = Math.PI / 2; carrete.position.set(0.06, -0.7, 0); cana.add(carrete);
    const N = 14, posL = new Float32Array(N * 3), lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(posL, 3));
    const sedal = new T.Line(lg, new T.LineBasicMaterial({ color: '#ffffff' })); sedal.frustumCulled = false; sedal.name = 'pesca:sedal';
    const corcho = new T.Group(); corcho.name = 'pesca:corcho';
    const arriba = new T.Mesh(new T.SphereGeometry(0.12, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lam('#e8402e'));
    const abajo = new T.Mesh(new T.SphereGeometry(0.12, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lam('#f7f3ea'));
    const palito = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.14, 5), lam('#ffd84a')); palito.position.y = 0.17;
    corcho.add(arriba, abajo, palito); corcho.scale.setScalar(1.7);
    const onda = new T.Mesh(new T.RingGeometry(0.22, 0.3, 24), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    onda.rotation.x = -Math.PI / 2; onda.name = 'pesca:onda';
    // Pez estilizado: cuerpo (esfera estirada), cola y aleta; se recolorea según la especie
    const pez = new T.Group(); pez.name = 'pesca:pez'; pez.visible = false;
    const cuerpoM = lam('#888'), panzaM = lam('#ccc');
    const cuerpo = new T.Mesh(new T.SphereGeometry(0.5, 10, 7), cuerpoM); cuerpo.scale.set(1, 0.42, 0.22);
    const panza = new T.Mesh(new T.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), panzaM); panza.scale.set(0.96, 0.42, 0.23);
    const cola = new T.Mesh(new T.ConeGeometry(0.22, 0.32, 4), cuerpoM); cola.rotation.z = Math.PI / 2; cola.position.x = -0.6; cola.scale.set(1, 1, 0.25);
    const aleta = new T.Mesh(new T.ConeGeometry(0.12, 0.24, 3), cuerpoM); aleta.position.set(0.02, 0.24, 0); aleta.scale.set(1.4, 1, 0.2);
    const ojo = new T.Mesh(new T.SphereGeometry(0.045, 6, 4), new T.MeshBasicMaterial({ color: '#111' })); ojo.position.set(0.36, 0.06, 0.1);
    const ojo2 = ojo.clone(); ojo2.position.z = -0.1;
    pez.add(cuerpo, panza, cola, aleta, ojo, ojo2);
    g.add(cana, sedal, corcho, onda, pez);
    scene.add(g);
    P = { g, cana, sedal, posL, N, corcho, onda, pez, cuerpo, cola, aleta, cuerpoM, panzaM, punta: new T.Vector3() };
    return P;
  }
  function vestirPez(p) {
    const Q = piezas();
    Q.cuerpoM.color.set(p.color); Q.panzaM.color.set(p.panza);
    const L = p.largo; Q.pez.scale.set(L, L * (p.anguila ? 0.45 : 1), L);
    Q.cuerpo.scale.set(p.anguila ? 1.6 : 1, 0.42, 0.22); Q.aleta.visible = !p.anguila;
  }

  // ---------- Estado ----------
  const A = { fase: 'nada', manual: false, tiempo: RONDA, t: 0, carga: 0, cargaT: 0, cargando: false, giro: 0, ang: 0, dist: 0, esperaT: 0, mordT: 0, picaT: 0,
    corcho: { x: 0, y: 0, z: 0, x0: 0, z0: 0 }, vuelo: 0, pez: null, forzar: null, marca: 0.2, vmarca: 0, zona: 0.5, zonaV: 0, zonaObj: 0.5, prog: 0, tiraT: 0, cansado: false,
    sosteniendo: false, peces: 0, puntos: 0, album: {}, record: 0, nuevo: false, ultimo: null, aviso: '', fotoT: 0, sueltaT: 0, desdeMenu: false };
  let recordSesion = 0;
  const recordGuardado = () => { const v = V(); const r = v && v.mundo ? v.mundo(ID) : null; return r && typeof r === 'object' && r.mejor > 0 ? r.mejor : 0; };
  const recordVer = () => Math.max(recordSesion, recordGuardado());
  function guardarRecord(p) {
    const v = V(); if (!v || !v.cambiarMundo) return;
    const r = v.mundo(ID), vistos = r && Array.isArray(r.vistos) ? r.vistos.slice() : [];
    for (const k in A.album) if (!vistos.includes(k)) vistos.push(k);
    try { v.cambiarMundo(ID, { mejor: Math.max(p, recordGuardado()), vistos }); } catch (e) { /* sin progreso */ }
  }
  // Hacia dónde se lanza: la mirada de la cámara, con ← → (o arrastrar) hasta ±0,6 rad del frente del muelle
  // SESGO: el lanzamiento sale un poco a la derecha de la cámara para que Vittata no tape el corcho
  const SESGO = -0.2, dirLanzar = () => { const y = SITIO.yaw + A.ang + SESGO; return { x: -Math.sin(y), z: -Math.cos(y) }; };
  const pie = () => ({ x: SITIO.x, y: suelo(SITIO.x, SITIO.z), z: SITIO.z });

  function otroActivo() {
    for (const o of [G.v18combate, G.v18amenaza, G.v18serpiente, G.v18sapo, G.v18duelo2, G.v18minigolf, G.v18chispa, G.v18moon, G.v18guardian]) {
      try { const f = o && !o.diferido && o.estado && o.estado().fase; if (f && f !== 'nada' && f !== 'disuelve' && f !== 'deshace' && f !== 'despierta') return true; } catch (e) { /* */ }
    }
    return false;
  }
  function libre() {
    const $ = id => document.getElementById(id), oculto = id => !$(id) || $(id).hidden;
    try {
      if ($('c1-fade') || (G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return false;
      return oculto('end') && oculto('comic') && oculto('creator');
    } catch (e) { return false; }
  }

  // ---------- Partida ----------
  const FRENTE = { x: 0, z: 1 };
  function colocarVittata() {
    const p = pie();
    S.pos.x = p.x; S.pos.z = p.z; S.pos.y = p.y + 0.02; S.vy = 0; if (M) { M.vx = M.vz = 0; M.swimming = false; }
    S.facing = FRENTE;
  }
  function iniciar(o) {
    o = o || {};
    if (A.fase !== 'nada') return false;
    if (!disponible()) return false;
    if (!o.forzar && (!libre() || otroActivo())) return false;
    if (M && M.flying && F.endFlight) { try { F.endFlight(); } catch (e) { /* ya en el suelo */ } }
    colocarVittata();
    A.desdeMenu = !!(G.menuModos && G.menuModos.desdeMenu && G.menuModos.desdeMenu());
    A.ang = 0; G.camara.yaw = SITIO.yaw;
    nuevaRonda();
    focoPrevio = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    enganchar(); montarHud(); llenarHud(); hud.el.hidden = false; hud.vista = null;
    piezas().g.visible = true; P.pez.visible = false; P.onda.visible = false;
    try { G.camara.place(true); } catch (e) { /* cámara */ }
    paneles(); pintar(true);
    toast(TXT.empieza, 3600);
    emitir({ tipo: 'empieza' });
    return true;
  }
  function nuevaRonda() {
    Object.assign(A, { fase: 'listo', tiempo: RONDA, t: 0, carga: 0, cargaT: 0, cargando: false, sosteniendo: false, pez: null, prog: 0, peces: 0, puntos: 0, album: {}, nuevo: false, aviso: '', resultado: null, pistaTxt: '', sueltaT: 0 });
    A.record = recordVer();
    if (P) { P.pez.visible = false; P.onda.visible = false; }
  }
  function otraRonda() { if (A.fase !== 'fin') return false; nuevaRonda(); hud.vista = null; paneles(); pintar(true); toast(TXT.empieza, 3000); emitir({ tipo: 'otra' }); return true; }
  function salir(motivo) {
    if (A.fase === 'nada') return false;
    A.fase = 'nada'; A.cargando = false; A.sosteniendo = false; soltarControles();
    if (hud) {
      const dentro = hud.el.contains(document.activeElement); hud.el.hidden = true; hud.vista = null;
      if (dentro) { const f = focoPrevio; if (f && document.contains(f) && f.getClientRects().length && !hud.el.contains(f)) try { f.focus({ preventScroll: true }); } catch (e) { /* */ } else try { document.activeElement.blur(); } catch (e) { /* */ } }
      vaciarHud();
    }
    focoPrevio = null;
    if (P) { P.g.visible = false; P.pez.visible = false; P.onda.visible = false; }
    if (motivo) toast(motivo, 2600);
    emitir({ tipo: 'sale' });
    return true;
  }
  // Botón principal (Espacio, E, Intro o el botón grande): apretar y soltar
  function apretar() {
    if (A.fase === 'nada') return false;
    A.sosteniendo = true;
    if (A.fase === 'listo') { A.fase = 'carga'; A.cargando = true; A.cargaT = 0; A.carga = 0; A.aviso = ''; pintar(true); return true; }
    if (A.fase === 'espera') { A.aviso = 'pronto'; pista(TXT.pPronto); return true; }
    if (A.fase === 'pica') { clavar(); return true; }
    if (A.fase === 'foto') { soltarPez(); return true; }
    return false;
  }
  function aflojar(cancelado) {
    A.sosteniendo = false;
    if (A.fase === 'carga') { A.cargando = false; if (cancelado) { A.fase = 'listo'; A.carga = 0; pintar(true); return false; } return lanzar(Math.max(0.05, A.carga)); }
    return false;
  }
  function lanzar(p) {
    if (A.fase !== 'carga' && A.fase !== 'listo') return false;
    const d = dirLanzar(), dist = D_MIN + (D_MAX - D_MIN) * Math.max(0, Math.min(1, p)), q = pie();
    A.dist = dist; A.carga = 0; A.cargando = false;
    Object.assign(A.corcho, { x0: q.x + d.x * 0.6, z0: q.z + d.z * 0.6, x: q.x + d.x * dist, z: q.z + d.z * dist });
    A.fase = 'vuela'; A.vuelo = 0; A.aviso = '';
    sonar('dash'); emitir({ tipo: 'lanza', dist: +dist.toFixed(2), p }); pintar(true);
    return true;
  }
  function elegirPez() {
    if (A.forzar && PEZ[A.forzar]) { const f = PEZ[A.forzar]; A.forzar = null; return f; }
    const lejos = Math.max(0, Math.min(1, (A.dist - D_MIN) / (D_MAX - D_MIN)));
    let tot = 0; const w = PECES.map(p => { const v = p.peso[0] * (1 - lejos) + p.peso[1] * lejos; tot += v; return v; });
    let r = azar() * tot; for (let i = 0; i < PECES.length; i++) { r -= w[i]; if (r <= 0) return PECES[i]; }
    return PECES[0];
  }
  function cae() {
    const c = A.corcho, lv = nivelAgua(c.x, c.z);
    if (!(lv > suelo(c.x, c.z) - 0.05)) { A.fase = 'listo'; pista(TXT.tierra); emitir({ tipo: 'tierra' }); pintar(true); return; } // no cayó al agua
    c.y = lv; A.fase = 'espera'; A.esperaT = 1.8 + azar() * 3.2; A.mordT = 0.6 + azar() * 1.2; A.pez = elegirPez();
    sonar('splash', 0.4); fx('bubbles', c.x, lv + 0.05, c.z, 6); ondear(1);
    pista(TXT.pEspera); emitir({ tipo: 'cae', x: +c.x.toFixed(2), z: +c.z.toFixed(2) }); pintar(true);
  }
  function picar() { A.fase = 'pica'; A.picaT = VENTANA; sonar('splash', 0.9); sonar('ring', 3); fx('bubbles', A.corcho.x, A.corcho.y, A.corcho.z, 10); ondear(1.6); pista(TXT.pPica); emitir({ tipo: 'pica', pez: A.pez.id }); pintar(true); }
  function clavar() {
    if (A.fase !== 'pica') return false;
    const p = A.pez; A.fase = 'tira'; A.prog = 0.3; A.marca = 0.25; A.vmarca = 0; A.zona = 0.5; A.zonaObj = 0.5; A.zonaV = 0; A.tiraT = 0; A.cansado = false; A.ancho = p.zona;
    sonar('pickup', 2); pista(TXT.pTira); emitir({ tipo: 'clava', pez: p.id }); pintar(true);
    return true;
  }
  function escapa(txt, tipo) { A.fase = 'listo'; A.pez = null; A.sosteniendo = false; pista(txt); sonar('wrong'); emitir({ tipo }); pintar(true); }
  function atrapa() {
    const p = A.pez; A.fase = 'foto'; A.fotoT = 0; A.peces++; A.puntos += p.pts; A.album[p.id] = (A.album[p.id] || 0) + 1; A.sosteniendo = false;
    vestirPez(p); P.pez.visible = true; flash();
    sonar('unlock'); toast(atrapado(p.nombre) + ' ' + masTxt(p.pts), 2200);
    emitir({ tipo: 'atrapa', pez: p.id, puntos: A.puntos }); hud.vista = null; paneles(); pintar(true);
  }
  function soltarPez() {
    if (A.fase !== 'foto') return false;
    const p = A.pez;
    if (p.invasora) {
      toast(TXT.reportado, 3600); sonar('descubrir');
      try { G.emit('expansion:invasora', { id: p.id, cient: p.cient, origen: 'pesca', accion: 'reportar' }); } catch (e) { /* sin oyentes */ }
      P.pez.visible = false; emitir({ tipo: 'reporta', pez: p.id });
    } else {
      toast(TXT.alAgua, 2000); A.sueltaT = 0.9; emitir({ tipo: 'suelta', pez: p.id });
    }
    A.fase = 'listo'; A.pez = p.invasora ? null : p; hud.vista = null; paneles(); pintar(true);
    if (A.tiempo <= 0) terminar();
    return true;
  }
  function terminar() {
    if (A.fase === 'fin' || A.fase === 'nada') return false;
    A.fase = 'fin'; A.cargando = false; A.sosteniendo = false; if (P) P.pez.visible = false;
    const prev = recordVer();
    A.nuevo = A.puntos > 0 && A.puntos > prev;
    recordSesion = Math.max(recordSesion, A.puntos); if (A.puntos > 0) guardarRecord(A.puntos);
    A.record = recordVer(); A.ultimo = A.resultado = { peces: A.peces, puntos: A.puntos, nuevo: A.nuevo, album: Object.assign({}, A.album) };
    sonar(A.peces ? 'unlock' : 'tick'); toast(TXT.fin, 2400);
    emitir({ tipo: 'fin', peces: A.peces, puntos: A.puntos, nuevo: A.nuevo }); hud.vista = null; paneles(); pintar(true);
    return true;
  }

  // ---------- Cada cuadro ----------
  function paso(dt) {
    if (A.fase === 'nada') return;
    A.t += dt;
    colocarVittata();
    if (A.giro) A.ang = Math.max(-GIRO_MAX, Math.min(GIRO_MAX, A.ang + A.giro * 1.1 * dt));
    if (['listo', 'carga'].includes(A.fase)) G.camara.yaw = SITIO.yaw + A.ang;
    const corre = A.fase !== 'foto' && A.fase !== 'fin';
    if (corre) A.tiempo = Math.max(0, A.tiempo - dt);
    switch (A.fase) {
      case 'carga': { A.cargaT += dt; const u = (A.cargaT / PING) % 2; A.carga = u <= 1 ? u : 2 - u; break; }
      case 'vuela': A.vuelo += dt / 0.7; if (A.vuelo >= 1) cae(); break;
      case 'espera':
        A.esperaT -= dt; A.mordT -= dt;
        if (A.mordT <= 0 && A.esperaT > 0.6) { A.mordT = 0.8 + azar() * 1.4; A.mord = 0.35; sonar('tick'); if (A.aviso !== 'pronto') pista(TXT.pMordisco); }
        if (A.esperaT <= 0) picar();
        break;
      case 'pica': A.picaT -= dt; if (A.picaT <= 0) escapa(TXT.escapo, 'escapo'); break;
      case 'tira': tirar(dt); break;
      default: break;
    }
    if (A.mord > 0) A.mord = Math.max(0, A.mord - dt);
    if (A.tiempo <= 0 && (A.fase === 'listo' || A.fase === 'carga' || A.fase === 'vuela' || A.fase === 'espera' || A.fase === 'pica')) terminar();
    dibujar(dt);
    if (hud && !hud.el.hidden) pintar();
  }
  // Recoger: la marca (el anzuelo) sube mientras se mantiene y baja al soltar; la zona del pez se mueve sola
  function tirar(dt) {
    const p = A.pez; A.tiraT += dt;
    if (!A.cansado && A.tiraT > CANSADO) { A.cansado = true; pista(TXT.pCansado); }
    if (A.cansado) A.ancho = Math.min(0.6, A.ancho + 0.03 * dt);
    A.vmarca += (A.sosteniendo ? 2.4 : -2.0) * dt; A.vmarca = Math.max(-1.1, Math.min(1.1, A.vmarca));
    A.marca += A.vmarca * dt; if (A.marca < 0) { A.marca = 0; A.vmarca = Math.max(0, -A.vmarca * 0.3); } if (A.marca > 1) { A.marca = 1; A.vmarca = Math.min(0, -A.vmarca * 0.3); }
    if (Math.abs(A.zonaObj - A.zona) < 0.03 || azar() < dt * 0.5) A.zonaObj = A.ancho / 2 + azar() * (1 - A.ancho);
    A.zonaV += ((A.zonaObj - A.zona) * 3 - A.zonaV * 2.2) * dt * p.vel * (A.cansado ? 0.5 : 1); A.zona = Math.max(A.ancho / 2, Math.min(1 - A.ancho / 2, A.zona + A.zonaV * dt));
    const dentro = Math.abs(A.marca - A.zona) <= A.ancho / 2;
    A.prog += (dentro ? 0.3 - 0.06 * (p.pts >= 40 ? 1 : 0) : -0.14) * dt;
    if (A.prog >= 1) atrapa();
    else if (A.prog <= 0) escapa(TXT.seFue, 'seFue');
  }
  function ondear(f) { if (barato() || !P) return; P.onda.visible = true; P.onda.userData.t = 0; P.onda.userData.f = f; P.onda.position.set(A.corcho.x, (A.corcho.y || 0) + 0.02, A.corcho.z); }
  function dibujar(dt) {
    if (!P) return;
    const q = pie(), d = dirLanzar(), lado = { x: -d.z, z: d.x };
    // la caña sale junto a Vittata (a su derecha), inclinada hacia el agua
    const base = { x: q.x + lado.x * 0.45 + d.x * 0.2, y: q.y + 0.75, z: q.z + lado.z * 0.45 + d.z * 0.2 };
    const tira = A.fase === 'tira', cab = tira ? 0.25 + 0.2 * Math.sin(A.t * 9) * (A.sosteniendo ? 1 : 0.4) : 0;
    const inc = 0.95 - cab; // de vertical (0) hacia delante
    P.cana.position.set(base.x + d.x * Math.sin(inc) * 1.2, base.y + Math.cos(inc) * 1.2, base.z + d.z * Math.sin(inc) * 1.2);
    P.cana.rotation.set(0, 0, 0); P.cana.rotateY(Math.atan2(d.x, d.z)); P.cana.rotateX(inc);
    P.punta.set(base.x + d.x * Math.sin(inc) * 2.4, base.y + Math.cos(inc) * 2.4, base.z + d.z * Math.sin(inc) * 2.4);
    // el corcho
    const c = A.corcho; let cx, cy, cz, vis = true;
    if (A.fase === 'vuela') {
      const u = Math.min(1, A.vuelo); cx = c.x0 + (c.x - c.x0) * u; cz = c.z0 + (c.z - c.z0) * u;
      const y1 = Math.max(0, nivelAgua(c.x, c.z)); cy = P.punta.y + (y1 - P.punta.y) * u + Math.sin(u * Math.PI) * (1.5 + A.dist * 0.18);
    } else if (['espera', 'pica', 'tira'].includes(A.fase)) {
      cx = c.x; cz = c.z; const lv = nivelAgua(c.x, c.z); cy = (isFinite(lv) ? lv : 0) + 0.04 * Math.sin(A.t * 2.2);
      if (A.mord > 0) cy -= 0.05 * Math.sin(A.mord * 40);
      if (A.fase === 'pica') cy -= 0.16 + 0.04 * Math.sin(A.t * 30);
      if (tira) { const s = (A.zona - 0.5) * 2.4; cx += lado.x * s; cz += lado.z * s; cy -= 0.12; const ac = 1 - A.prog * 0.6; cx = q.x + (cx - q.x) * ac; cz = q.z + (cz - q.z) * ac; }
    } else { cx = P.punta.x; cy = P.punta.y - 0.5; cz = P.punta.z; vis = A.fase === 'listo' || A.fase === 'carga'; }
    P.corcho.position.set(cx, cy, cz); P.corcho.visible = vis;
    // el sedal: de la punta al corcho, con una curva que cuelga (tenso al recoger)
    const pl = P.posL, N = P.N, caida = tira ? 0.05 : A.fase === 'vuela' ? 0.2 : 0.6;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      pl[i * 3] = P.punta.x + (cx - P.punta.x) * u; pl[i * 3 + 2] = P.punta.z + (cz - P.punta.z) * u;
      pl[i * 3 + 1] = P.punta.y + (cy + 0.12 - P.punta.y) * u - Math.sin(u * Math.PI) * caida;
    }
    P.sedal.geometry.attributes.position.needsUpdate = true; P.sedal.visible = vis;
    // la onda en el agua
    if (P.onda.visible) {
      const od = P.onda.userData; od.t = (od.t || 0) + dt;
      const s = 1 + od.t * 3 * (od.f || 1); P.onda.scale.set(s, s, s); P.onda.material.opacity = Math.max(0, 0.7 - od.t * 0.7);
      if (od.t > 1) P.onda.visible = false;
    }
    // el pez: en la foto, delante de Vittata, coleteando; al soltarlo, salta de vuelta al agua
    if (A.fase === 'foto' && P.pez.visible) {
      A.fotoT += dt;
      // a la izquierda de Vittata (la caña está a su derecha), de lado a la cámara y por encima de la ficha
      P.pez.position.set(q.x - lado.x * 1.1 + d.x * 0.4, q.y + 1.9 + 0.06 * Math.sin(A.t * 3), q.z - lado.z * 1.1 + d.z * 0.4);
      P.pez.rotation.set(0, Math.atan2(-lado.z, lado.x) + 0.25 * Math.sin(A.t * 1.5), 0.25 * Math.sin(A.t * 6));
      P.cola.rotation.y = 0.5 * Math.sin(A.t * 12);
    } else if (A.sueltaT > 0 && A.pez && P.pez.visible) {
      A.sueltaT -= dt; const u = 1 - Math.max(0, A.sueltaT) / 0.9;
      const x0 = q.x - lado.x * 1.1 + d.x * 0.4, z0 = q.z - lado.z * 1.1 + d.z * 0.4, x1 = q.x - lado.x * 2 + d.x * 4, z1 = q.z - lado.z * 2 + d.z * 4, y1 = Math.max(0, nivelAgua(x1, z1));
      P.pez.position.set(x0 + (x1 - x0) * u, q.y + 1.9 + (y1 - q.y - 1.9) * u + Math.sin(u * Math.PI) * 1.2, z0 + (z1 - z0) * u);
      P.pez.rotation.z = -1.2 * u;
      if (A.sueltaT <= 0) { P.pez.visible = false; sonar('splash', 0.6); fx('bubbles', x1, y1 + 0.05, z1, 10); A.corcho.x = x1; A.corcho.z = z1; A.corcho.y = y1; ondear(1.2); if (A.fase === 'listo') A.pez = null; }
    } else if (A.fase !== 'foto') P.pez.visible = false;
  }
  function flash() {
    if (!hud || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const f = hud.q('flash'); if (!f) return; f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  }

  // ---------- Entrada ----------
  const modo = { activo: () => A.fase !== 'nada', accion: () => { if (A.fase === 'fin') otraRonda(); else if (!A.sosteniendo) { apretar(); if (A.fase !== 'tira') aflojar(); } }, aviso: () => '', get verbo() { return verboPrincipal(); } };
  const TRAGAR = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' ', 'e', 'enter', 'escape', 'r', 'g', 'f', 'v', 'x', 'c', 'q']);
  const pausa = () => !!(G.pausa && G.pausa.activa && G.pausa.activa());
  let enganchado = false, modo0 = null, teclasGiro = { izq: false, der: false }, cam0 = null;
  const giroTeclas = () => { A.giro = (teclasGiro.izq ? 1 : 0) - (teclasGiro.der ? 1 : 0); };
  const CAM_PESCA = { height: 4.4, dist: 6.4 };
  function teclaAbajo(e) {
    if (!enganchado || pausa() || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.nodeName))) return;
    const k = (e.key || '').toLowerCase(); if (!TRAGAR.has(k)) return;
    // Enter o Espacio sobre un botón del panel con el foco (Otra ronda, Salir, Soltar…) lo pulsa como cualquier botón
    const bf = e.target && e.target.closest && hud && hud.el.contains(e.target) ? e.target.closest('button[data-a]') : null;
    if (bf && (k === 'enter' || k === ' ') && !/^(accion|izq|der)$/.test(bf.dataset.a)) { e.stopImmediatePropagation(); return; }
    e.stopImmediatePropagation(); e.preventDefault();
    if (k === 'arrowleft' || k === 'a') { teclasGiro.izq = true; giroTeclas(); }
    else if (k === 'arrowright' || k === 'd') { teclasGiro.der = true; giroTeclas(); }
    if (e.repeat) return;
    if (k === 'escape') salir(TXT.sale);
    else if (A.fase === 'fin') { if (k === 'r' || k === ' ' || k === 'enter' || k === 'e') otraRonda(); }
    else if (k === ' ' || k === 'e' || k === 'enter') apretar();
  }
  function teclaArriba(e) {
    if (!enganchado) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'arrowleft' || k === 'a') { teclasGiro.izq = false; giroTeclas(); }
    else if (k === 'arrowright' || k === 'd') { teclasGiro.der = false; giroTeclas(); }
    else if (k === ' ' || k === 'e' || k === 'enter') aflojar();
  }
  function enganchar() {
    if (enganchado) return; enganchado = true;
    modo0 = G.interaccion.modo; G.interaccion.modo = modo;
    addEventListener('keydown', teclaAbajo, true); addEventListener('keyup', teclaArriba, true);
    const keys = G.input && G.input.keys; if (keys) for (const k of ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'c', 'q', 'r', 'g', ' ']) keys.delete(k);
    document.body.classList.add('v18-pesca-on');
    const C = G.camara && G.camara.CAM; if (C && !cam0) { cam0 = {}; for (const k in CAM_PESCA) cam0[k] = C[k]; Object.assign(C, CAM_PESCA); }
  }
  function soltarControles() {
    if (!enganchado) return; enganchado = false;
    if (G.interaccion.modo === modo) G.interaccion.modo = modo0;
    removeEventListener('keydown', teclaAbajo, true); removeEventListener('keyup', teclaArriba, true);
    teclasGiro = { izq: false, der: false }; A.giro = 0;
    document.body.classList.remove('v18-pesca-on');
    const C = G.camara && G.camara.CAM; if (C && cam0) { for (const k in cam0) if (C[k] === CAM_PESCA[k]) C[k] = cam0[k]; cam0 = null; }
  }
  G.on('update', (dt, busy) => { if (A.manual || (busy && A.fase !== 'nada')) return; paso(Math.min(dt, 0.25)); }, 75);
  G.on('apply', () => { if (A.fase !== 'nada') salir(); }, 51);
  G.on('render', () => { if (A.fase !== 'nada' && G.fx && G.fx.guide) G.fx.guide(null, 0); }, 61);

  // ---------- HUD ----------
  let hud = null, focoPrevio = null;
  function estilo() {
    if (document.getElementById('v18-pesca-css')) return;
    const st = document.createElement('style'); st.id = 'v18-pesca-css';
    st.textContent = '#v18-pesca{position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 12px);margin-inline:auto;width:min(520px,calc(100vw - 32px));z-index:40;' +
      'font-family:Fredoka,system-ui,sans-serif;color:#fff8ea;text-shadow:0 1px 2px #0008;pointer-events:none}' +
      'body.v18-pesca-on #acts,body.v18-pesca-on #stick,body.v18-pesca-on #quest,body.v18-pesca-on #inv,body.v18-pesca-on #keyhint{visibility:hidden}' +
      'body.v18-pesca-on #prompt,body.v18-pesca-on #guia-pista,body.v18-pesca-on #guia-panel{display:none!important}' +
      '#v18-pesca .vp-caja{background:rgba(18,44,58,.82);border-radius:16px;padding:8px 12px}' +
      '#v18-pesca .vp-info{display:flex;flex-wrap:wrap;gap:4px 14px;justify-content:space-between;font-size:15px;font-weight:600}' +
      '#v18-pesca .vp-info [data-k="tiempo"].poco{color:#ffb35a}' +
      '#v18-pesca .vp-barra{position:relative;height:12px;border-radius:6px;background:#0006;overflow:hidden;margin:7px 0 2px}#v18-pesca .vp-barra>b{display:block;height:100%;width:0;background:linear-gradient(90deg,#8fe08a,#ffd27a,#ff9a5a)}' +
      '#v18-pesca .vp-et{font-size:11px;opacity:.85}' +
      '#v18-pesca .vp-tira{position:relative;height:30px;border-radius:15px;background:linear-gradient(90deg,#0b3f5c,#14678a);margin:8px 0 4px;overflow:hidden;box-shadow:inset 0 2px 6px #0007}' +
      '#v18-pesca .vp-zona{position:absolute;top:3px;bottom:3px;border-radius:12px;background:rgba(122,230,120,.55);border:2px solid #b8ffb0;box-sizing:border-box}' +
      '#v18-pesca .vp-zona.dentro{background:rgba(150,255,140,.85)}' +
      '#v18-pesca .vp-marca{position:absolute;top:0;bottom:0;width:8px;margin-left:-4px;border-radius:4px;background:#ffd84a;box-shadow:0 0 0 2px #3b2a14}' +
      '#v18-pesca .vp-prog{height:8px;border-radius:4px;background:#0006;overflow:hidden}#v18-pesca .vp-prog b{display:block;height:100%;width:0;background:#8fe08a}' +
      '#v18-pesca .vp-bot{display:grid;grid-template-columns:1fr 2fr 1fr;gap:8px;margin-top:8px}#v18-pesca .vp-bot2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}' +
      '#v18-pesca button{pointer-events:auto;font:inherit;font-size:16px;font-weight:600;min-height:52px;padding:6px 10px;border-radius:26px;border:0;background:#fff3d6;color:#3b2a14;box-shadow:0 2px 6px #0005;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;display:inline-flex;align-items:center;justify-content:center}' +
      '#v18-pesca button[hidden]{display:none}#v18-pesca button:focus-visible{outline:4px solid var(--c-focus,#ffe066);outline-offset:2px}' +
      '#v18-pesca button.vp-principal{background:#ffd27a;font-size:19px}#v18-pesca button.vp-principal.pica{background:#ff7a4a;color:#fff;animation:vpLate .35s ease-in-out infinite alternate}#v18-pesca button.on{outline:3px solid #8fe08a}' +
      '#v18-pesca button kbd{display:inline-block;margin-left:8px;font:700 13px/1 Fredoka,system-ui,sans-serif;min-width:22px;padding:4px 6px;border-radius:7px;background:#3b2a14;color:#fff3d6;box-shadow:0 2px 0 #0007}' +
      '#v18-pesca.tactil button kbd{display:none}' +
      '#v18-pesca .vp-guia{margin:8px auto 0;width:max-content;max-width:100%;min-height:1.4em;background:rgba(255,227,154,.95);color:#3b2a14;text-shadow:none;font-weight:600;font-size:15px;padding:5px 14px;border-radius:16px;text-align:center;box-sizing:border-box}' +
      '#v18-pesca .vp-guia:empty{visibility:hidden}' +
      '#v18-pesca .vp-ficha,#v18-pesca .vp-fin{text-align:center}#v18-pesca .vp-ficha p,#v18-pesca .vp-fin p{margin:3px 0}' +
      '#v18-pesca .vp-ficha .vp-t{font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#ffe39a}#v18-pesca .vp-ficha .vp-n{font-size:22px;font-weight:700}' +
      '#v18-pesca .vp-ficha .vp-c{font-style:italic;font-size:14px;opacity:.9}#v18-pesca .vp-ficha .vp-d{font-size:15px;line-height:1.3}' +
      '#v18-pesca .vp-ficha .vp-f{font-size:11px;opacity:.8}#v18-pesca .vp-ficha .vp-k{font-size:12px;opacity:.85}' +
      '#v18-pesca .vp-chapa{display:inline-block;font-size:12px;font-weight:700;padding:2px 10px;border-radius:10px;background:#3f8f4a}#v18-pesca .vp-chapa.inv{background:#b5452c}' +
      '#v18-pesca .vp-fin .vp-g{font-size:20px;font-weight:700}#v18-pesca .vp-fin .vp-nuevo{color:#ffd84a;font-size:18px;font-weight:700}' +
      '#v18-pesca .vp-alb{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 10px;font-size:14px;font-weight:600;margin:4px 0}' +
      '#v18-pesca .vp-flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none}#v18-pesca .vp-flash.on{animation:vpFlash .45s ease-out}' +
      '@keyframes vpFlash{from{opacity:.75}to{opacity:0}}@keyframes vpLate{from{transform:scale(1)}to{transform:scale(1.06)}}' +
      '@media (prefers-reduced-motion:reduce){#v18-pesca .vp-flash.on,#v18-pesca button.vp-principal.pica{animation:none}}' +
      // móvil: el panel deja libre la columna de Diario / Gestos / Pausa de la derecha (tapaba la fila de tiempo y la ficha)
      '@media (max-width:760px){#v18-pesca{margin-inline:16px auto;width:calc(100vw - 96px)}#v18-pesca .vp-info{font-size:14px;gap:2px 10px}#v18-pesca button kbd{display:none}body.v18-pesca-on #toast{top:calc(env(safe-area-inset-top,0px) + 12px);bottom:auto}body.v18-pesca-on #minimapa{visibility:hidden}#v18-pesca .vp-ficha .vp-d{font-size:14px}}' +
      '@media (min-width:761px) and (pointer:fine){#v18-pesca{bottom:16px}}';
    document.head.appendChild(st);
  }
  function montarHud() {
    if (hud) return hud;
    estilo();
    const el = document.createElement('div'); el.id = 'v18-pesca'; el.hidden = true;
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', TXT.nombre);
    const boton = e => e.target.closest && e.target.closest('button[data-a]');
    el.addEventListener('pointerdown', e => {
      const b = boton(e); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      try { b.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
      const a = b.dataset.a; b.classList.add('on');
      if (a === 'izq') A.giro = 1; else if (a === 'der') A.giro = -1;
      else if (a === 'accion') apretar();
      else accion(a);
    });
    const accion = a => {
      if (a === 'salir') salir(TXT.sale);
      else if (a === 'otra') otraRonda();
      else if (a === 'soltar') soltarPez();
      else if (a === 'accion') { apretar(); aflojar(); }
    };
    el.addEventListener('click', e => { const b = boton(e); if (!b || e.detail !== 0) return; e.preventDefault(); accion(b.dataset.a); });
    const suelta = e => {
      const b = boton(e); if (!b) return; b.classList.remove('on');
      const a = b.dataset.a;
      if (a === 'izq' || a === 'der') giroTeclas();
      else if (a === 'accion') aflojar(e.type === 'pointercancel');
    };
    for (const t of ['pointerup', 'pointercancel']) el.addEventListener(t, suelta);
    el.addEventListener('contextmenu', e => e.preventDefault());
    document.body.appendChild(el);
    const qs = {};
    hud = { el, qs, lleno: false, q: k => qs[k] || (qs[k] = el.querySelector('[data-k="' + k + '"]')), vista: null };
    return hud;
  }
  // El contenido se crea al empezar y se vacía al salir: un panel oculto no guarda texto en español (idiomaTest lee lo oculto)
  function llenarHud() {
    if (!hud || hud.lleno) return;
    const k = t => `<kbd aria-hidden="true">${t}</kbd>`;
    const b = (a, txt, tecla, extra) => `<button type="button" data-a="${a}"${extra || ''}><span data-k="t-${a}">${txt}</span>${tecla ? k(tecla) : ''}</button>`;
    hud.el.innerHTML = `<div class="vp-flash" data-k="flash"></div><div class="vp-caja"><div class="vp-info"><span data-k="tiempo"></span><span data-k="peces"></span><span data-k="puntos"></span><span data-k="record"></span></div>` +
      `<div data-k="juego"><div data-k="cargaW"><div class="vp-barra"><b data-k="carga"></b></div><div class="vp-et">${TXT.fuerza}</div></div>` +
      `<div data-k="tiraW" hidden><div class="vp-tira"><div class="vp-zona" data-k="zona"></div><div class="vp-marca" data-k="marca"></div></div><div class="vp-prog"><b data-k="prog"></b></div></div>` +
      `<div class="vp-bot">${b('izq', '◀', '←', ` aria-label="${TXT.izq}"`)}${b('accion', TXT.lanzar, 'Espacio', ' class="vp-principal"')}${b('der', '▶', '→', ` aria-label="${TXT.der}"`)}</div>` +
      `<div class="vp-bot2" style="grid-template-columns:1fr">${b('salir', TXT.salir, 'Esc')}</div><div class="vp-guia" data-k="guia" role="status"></div></div>` +
      `<div class="vp-ficha" data-k="ficha" role="status" hidden><p class="vp-t">${TXT.foto}</p><p class="vp-n" data-k="fn"></p><p class="vp-c" data-k="fc" data-no-tr></p>` +
      `<p><span class="vp-chapa" data-k="fchapa"></span></p><p class="vp-d" data-k="fd"></p><p class="vp-f" data-k="ff" data-no-tr></p><p class="vp-k" data-k="fk"></p>` +
      `<div class="vp-bot2" style="grid-template-columns:1fr">${b('soltar', TXT.soltarPez, 'Espacio', ' class="vp-principal"')}</div></div>` +
      `<div class="vp-fin" data-k="fin" role="status" hidden><p class="vp-g" data-k="fin1"></p><p data-k="fin2"></p><p class="vp-nuevo" data-k="fin3"></p><p class="vp-et" data-k="fin4">${TXT.album}</p><div class="vp-alb" data-k="alb"></div>` +
      `<div class="vp-bot2">${b('otra', TXT.otra, 'R')}<button type="button" data-a="salir"><span data-k="t-bsalir">${TXT.salir}</span>${k('Esc')}</button></div></div></div>`;
    for (const kq in hud.qs) delete hud.qs[kq];
    hud.lleno = true; PK.firma = '';
  }
  function vaciarHud() { if (!hud || !hud.lleno) return; hud.el.textContent = ''; hud.lleno = false; for (const kq in hud.qs) delete hud.qs[kq]; }
  const texto = (k, t) => { const e = hud.q(k); if (e && e.dataset.t !== t) { e.dataset.t = t; e.textContent = t; } };
  function pista(t) { A.pistaTxt = t; if (hud && hud.lleno) texto('guia', t); }
  function verboPrincipal() {
    switch (A.fase) {
      case 'carga': return TXT.soltarB;
      case 'vuela': case 'espera': return TXT.esperarB;
      case 'pica': return TXT.clavar;
      case 'tira': return TXT.recoger;
      default: return TXT.lanzar;
    }
  }
  function paneles() {
    if (!hud || !hud.lleno) return;
    const foto = A.fase === 'foto', fin = A.fase === 'fin';
    hud.q('juego').hidden = foto || fin; hud.q('ficha').hidden = !foto; hud.q('fin').hidden = !fin;
    if (foto && A.pez) {
      const p = A.pez;
      texto('fn', p.nombre); texto('fc', p.cient); texto('fchapa', p.invasora ? TXT.invasora : TXT.nativo); hud.q('fchapa').classList.toggle('inv', !!p.invasora);
      texto('fd', p.dato); texto('ff', fuenteTxt(p.fuente)); texto('fk', p.invasora ? TXT.invasoraNo : TXT.consejo); texto('t-soltar', p.invasora ? TXT.reportar : TXT.soltarPez);
    }
    if (fin && A.resultado) {
      const r = A.resultado;
      texto('fin1', TXT.fin); texto('fin2', finTxt(r.peces, r.puntos)); texto('fin3', r.nuevo ? TXT.nuevo : recordTxt(A.record));
      hud.q('alb').innerHTML = ''; const ks = Object.keys(r.album);
      if (!ks.length) { const s = document.createElement('span'); s.textContent = TXT.nada; hud.q('alb').appendChild(s); }
      for (const id of ks) { const s = document.createElement('span'), n = document.createElement('b'), c = document.createElement('i'); n.textContent = PEZ[id].nombre; c.textContent = ' × ' + r.album[id]; c.setAttribute('data-no-tr', ''); s.append(n, c); hud.q('alb').appendChild(s); }
      texto('t-bsalir', A.desdeMenu ? TXT.menu : TXT.salir);
    }
    enfocar(foto ? 'soltar' : fin ? 'otra' : 'accion');
  }
  function enfocar(a) {
    if (!hud || hud.el.hidden || hud.vista === a) return;
    hud.vista = a;
    const act = document.activeElement, enJuego = !act || act === document.body || hud.el.contains(act) || (focoPrevio && act === focoPrevio);
    if (!enJuego) return;
    const b = hud.el.querySelector('button[data-a="' + a + '"]'); if (b && b.getClientRects().length) try { b.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
  }
  const PK = { firma: '' };
  function pintar(forzar) {
    if (!hud || !hud.lleno) return;
    const tt = tactil(); hud.el.classList.toggle('tactil', tt);
    texto('tiempo', tiempoEt(A.tiempo)); hud.q('tiempo').classList.toggle('poco', A.tiempo <= 20);
    texto('peces', pecesTxt(A.peces)); texto('puntos', puntosTxt(A.puntos)); texto('record', recordTxt(Math.max(A.record, 0)));
    if (A.fase === 'foto' || A.fase === 'fin') return;
    const tira = A.fase === 'tira';
    hud.q('cargaW').hidden = tira; hud.q('tiraW').hidden = !tira;
    if (tira) {
      const z = hud.q('zona'); z.style.left = ((A.zona - A.ancho / 2) * 100).toFixed(1) + '%'; z.style.width = (A.ancho * 100).toFixed(1) + '%';
      z.classList.toggle('dentro', Math.abs(A.marca - A.zona) <= A.ancho / 2);
      hud.q('marca').style.left = (A.marca * 100).toFixed(1) + '%'; hud.q('prog').style.width = (Math.max(0, Math.min(1, A.prog)) * 100).toFixed(1) + '%';
    } else hud.q('carga').style.width = (A.carga * 100).toFixed(1) + '%';
    const verbo = verboPrincipal(); texto('t-accion', verbo);
    const pr = hud.el.querySelector('button[data-a="accion"]'); if (pr) pr.classList.toggle('pica', A.fase === 'pica');
    const apunta = A.fase === 'listo' || A.fase === 'carga';
    for (const a of ['izq', 'der']) { const bb = hud.el.querySelector('button[data-a="' + a + '"]'); if (bb) bb.style.visibility = apunta ? '' : 'hidden'; }
    if (forzar || !A.pistaTxt) { if (A.fase === 'listo' && (!A.pistaTxt || forzar && ![TXT.tierra, TXT.escapo, TXT.seFue].includes(A.pistaTxt))) A.pistaTxt = tt ? TXT.guiaT : TXT.guia; texto('guia', A.pistaTxt || ''); }
  }

  // ---------- Entrar desde el menú o la Pausa ----------
  function irYJugar() {
    if (!disponible() || A.fase !== 'nada' || otroActivo()) return false;
    return iniciar({ forzar: true });
  }
  {
    let tile = null;
    const menu = G.ui.$ && G.ui.$('pause');
    if (menu) menu.addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return;
      const grid = menu.querySelector('.pause-grid'); if (!grid) return;
      if (!tile && disponible()) {
        tile = document.createElement('button');
        tile.className = 'btn tile'; tile.id = 'b-v18-pesca'; tile.type = 'button';
        tile.setAttribute('data-icon', 'star'); tile.setAttribute('popovertarget', 'pause'); tile.setAttribute('popovertargetaction', 'hide');
        tile.textContent = 'Pesca';
        tile.addEventListener('click', () => setTimeout(irYJugar, 0));
        grid.appendChild(tile);
      }
      if (tile) tile.hidden = !(disponible() && A.fase === 'nada' && !otroActivo());
    });
  }

  // ---------- Prueba ----------
  async function test(o) {
    o = o || {};
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const antes = o.antes || {};
    const exp0 = G.EXPANSION, semilla0 = semilla, pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, fly0 = M && M.flying, yaw0 = G.camara.yaw;
    const CAM = G.camara.CAM, cam00 = CAM ? { height: CAM.height, dist: CAM.dist } : null;
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = t => { toasts.push(String(t)); };
    const errores = [], cerr0 = console.error; console.error = function () { errores.push([...arguments].map(String).join(' ').slice(0, 200)); return cerr0.apply(console, arguments); };
    const onErr = e => errores.push('error: ' + (e.message || e)); addEventListener('error', onErr);
    const susp = G.guardado && G.guardado.suspender; if (susp) susp(true);
    const v = V(); let crudo = null; try { crudo = v && v.clave ? localStorage.getItem(v.clave()) : null; } catch (e) { /* */ }
    const eventos = []; const oye = ev => eventos.push(ev); G.on('v18pesca', oye);
    const invasoras = []; const oyeInv = ev => invasoras.push(ev); G.on('expansion:invasora', oyeInv);
    const correr = (s, dt) => { dt = dt || 1 / 60; for (let t = 0; t < s; t += dt) paso(dt); };
    const hasta = (cond, s, dt) => { dt = dt || 1 / 60; for (let t = 0; t < (s || 30) && !cond(); t += dt) paso(dt); return cond(); };
    const tecla = (tipo, key) => { const ev = new KeyboardEvent(tipo, { key, bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); return ev; };
    const bot = a => hud && hud.el.querySelector('button[data-a="' + a + '"]');
    const toque = (b, tipo, id) => { const r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent(tipo, { bubbles: true, cancelable: true, pointerId: id || 41, pointerType: 'touch', isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); };
    // Recoger como un jugador: mantener cuando el anzuelo está por debajo de la zona y soltar cuando está por encima
    const recogerCon = (bajar, subir, s) => { let abajo = false; for (let t = 0; t < (s || 30) && A.fase === 'tira'; t += 1 / 60) { const q = A.marca < A.zona - 0.03 || (A.marca < A.zona + 0.03 && A.vmarca < 0); if (q && !abajo) { bajar(); abajo = true; } else if (!q && abajo) { subir(); abajo = false; } paso(1 / 60); } if (abajo) subir(); return A.fase; };
    const ficha = () => hud && !hud.q('ficha').hidden ? { n: hud.q('fn').textContent, c: hud.q('fc').textContent, d: hud.q('fd').textContent, f: hud.q('ff').textContent, b: hud.q('t-soltar').textContent } : null;
    try {
      // 0. Bandera apagada: nada a la vista
      const tarjeta = document.querySelector('#modos [data-modo="pesca"]');
      if (!antes.exp) {
        check('Bandera apagada (sin ?expansion=1): el script no se había cargado antes de la prueba', antes.cargado === false, JSON.stringify(antes));
        try { if (G.menuModos && G.menuModos.mostrar) G.menuModos.mostrar(); } catch (e) { /* sin menú */ }
        check('Bandera apagada: la tarjeta «Pesca» del menú está oculta', !!tarjeta && tarjeta.hidden && getComputedStyle(tarjeta).display === 'none', tarjeta ? 'hidden ' + tarjeta.hidden : 'sin tarjeta');
        G.EXPANSION = false;
        check('Bandera apagada: no se puede empezar (irYJugar y iniciar forzado dicen que no) y no hay HUD', irYJugar() === false && iniciar({ forzar: true }) === false && A.fase === 'nada' && !(hud && !hud.el.hidden) && !document.body.classList.contains('v18-pesca-on'));
        check('Bandera apagada: ninguna pieza de la pesca en la escena a la vista', !P || !P.g.visible);
        check('Bandera apagada: sin botón «Pesca» en la Pausa', !document.getElementById('b-v18-pesca') || document.getElementById('b-v18-pesca').hidden);
      } else check('Bandera encendida en esta sesión (?expansion=1): las comprobaciones de «apagada» no aplican', true, 'G.EXPANSION = true');
      // 1. Con la bandera: la tarjeta del menú se ve y la partida empieza en el muelle
      G.EXPANSION = true;
      try { if (G.menuModos && G.menuModos.mostrar) G.menuModos.mostrar(); } catch (e) { /* sin menú */ }
      check('Con la bandera la tarjeta «Pesca» del menú se ve', !!tarjeta && !tarjeta.hidden);
      if (G.EXPANSION && !antes.exp) { G.EXPANSION = false; try { G.menuModos.mostrar(); } catch (e) { /* */ } G.EXPANSION = true; }
      check('Los peces: 4 nativos y 1 invasora, cada uno con nombre, nombre científico, dato y fuente', PECES.length === 5 && PECES.filter(p => p.invasora).length === 1 && PECES.every(p => p.nombre && /^[A-Z][a-z]+ [a-z]+$/.test(p.cient) && p.dato.length > 30 && p.fuente.length >= 1 && p.fuente.every(f => f.length > 10)));
      const lv = nivelAgua(SITIO.x, SITIO.z + 8), sueloM = suelo(SITIO.x, SITIO.z);
      check('El sitio es el final del muelle de Villa Raíz: piso del muelle sobre el agua y agua delante', sueloM > 0.8 && sueloM < 2 && lv > suelo(SITIO.x, SITIO.z + 8) - 0.05, JSON.stringify({ suelo: +sueloM.toFixed(2), agua: lv }));
      A.manual = true; semilla = 12345;
      const forzar = !libre() || otroActivo();
      const empezo = forzar ? iniciar({ forzar: true }) : irYJugar();
      check('Empieza: Vittata en el muelle, HUD de la pesca, 2:30 de ronda y controles propios', empezo && A.fase === 'listo' && A.tiempo === RONDA && hud && !hud.el.hidden && document.body.classList.contains('v18-pesca-on') &&
        G.interaccion.modo === modo && Math.hypot(S.pos.x - SITIO.x, S.pos.z - SITIO.z) < 0.05 && P.g.visible && toasts.includes(TXT.empieza), forzar ? 'forzado (había un diálogo o tarjeta abiertos)' : '');
      const evW = tecla('keydown', 'w'); const tieneW = !!(G.input && G.input.keys && G.input.keys.has('w')); tecla('keyup', 'w');
      check('Mientras se pesca, las teclas de mover no llegan al juego', evW.defaultPrevented && !tieneW);
      // 2. Ronda con teclado: lanzar, esperar, clavar, recoger, foto y soltar
      A.forzar = 'pargo'; tecla('keydown', ' '); const cargando = A.fase === 'carga'; correr(0.9); const c1 = A.carga; tecla('keyup', ' ');
      check('Teclado: mantener Espacio carga la fuerza (sube y baja) y al soltar se lanza', cargando && c1 > 0.5 && A.fase === 'vuela' && A.dist > D_MIN, JSON.stringify({ carga: +c1.toFixed(2), dist: +A.dist.toFixed(2) }));
      hasta(() => A.fase !== 'vuela', 2);
      const enAgua = A.fase === 'espera' && Math.abs(P.corcho.position.y - nivelAgua(A.corcho.x, A.corcho.z)) < 0.2;
      check('El corcho cae al agua delante del muelle y flota', enAgua, JSON.stringify({ fase: A.fase, y: +P.corcho.position.y.toFixed(2), z: +A.corcho.z.toFixed(1) }));
      tecla('keydown', ' '); tecla('keyup', ' ');
      check('Pulsar antes del pique solo da una pista («¡Muy pronto!») y se sigue esperando', A.fase === 'espera' && A.pistaTxt === TXT.pPronto);
      hasta(() => A.fase === 'pica', 8);
      check('Pica: el corcho se hunde, suena y el botón dice «¡Clava!»', A.fase === 'pica' && P.corcho.position.y < nivelAgua(A.corcho.x, A.corcho.z) - 0.05 && hud.q('t-accion').textContent === TXT.clavar && eventos.some(e => e.tipo === 'pica'));
      tecla('keydown', ' ');
      check('Teclado: pulsar a tiempo clava el anzuelo y empieza a recoger (barra con la zona del pez)', A.fase === 'tira' && !hud.q('tiraW').hidden);
      tecla('keyup', ' ');
      const pez1 = A.pez, fin1 = recogerCon(() => tecla('keydown', ' '), () => tecla('keyup', ' '), 40);
      const f1 = ficha();
      check('Teclado: manteniendo el anzuelo en la zona verde se atrapa el pez y sale su ficha (nombre, nombre científico, dato y fuente)', fin1 === 'foto' && A.peces === 1 && A.puntos === pez1.pts && f1 && f1.n === pez1.nombre && f1.c === pez1.cient && f1.d === pez1.dato && /^Fuente: /.test(f1.f), JSON.stringify({ fase: fin1, pez: pez1 && pez1.id, ficha: f1 }));
      const t0 = A.tiempo; correr(1);
      check('Con la ficha abierta el reloj de la ronda se para', A.tiempo === t0);
      tecla('keydown', ' '); tecla('keyup', ' ');
      check('Teclado: «Soltarlo» devuelve el pez al agua y se vuelve a lanzar', A.fase === 'listo' && A.album[pez1.id] === 1 && eventos.some(e => e.tipo === 'suelta' && e.pez === pez1.id) && toasts.includes(TXT.alAgua));
      correr(1.2);
      check('El pez salta de vuelta al agua y desaparece', !P.pez.visible);
      // 3. Un pique que no se clava: el pez se va
      lanzar(0.6); hasta(() => A.fase === 'pica', 10); correr(VENTANA + 0.2);
      check('Si no se clava a tiempo (1,6 s), el pez se lleva la carnada y se vuelve a lanzar', A.fase === 'listo' && A.peces === 1 && A.pistaTxt === TXT.escapo);
      // 4. Si no se recoge, el pez se escapa
      lanzar(0.6); hasta(() => A.fase === 'pica', 10); clavar(); A.sosteniendo = false; hasta(() => A.fase !== 'tira', 20);
      check('Si no se recoge, el pez se escapa (sin castigo: se vuelve a lanzar)', A.fase === 'listo' && A.peces === 1 && A.pistaTxt === TXT.seFue);
      // 5. Lejos pican más los grandes (sábalo y róbalo); cerca, el pargo y la anguila
      const cuenta = d => { const r = {}; A.dist = d; for (let i = 0; i < 400; i++) { const p = elegirPez(); r[p.id] = (r[p.id] || 0) + 1; } return r; };
      const cerca = cuenta(D_MIN), lejos = cuenta(D_MAX);
      check('Lejos pican más sábalos y róbalos; cerca, más pargos y anguilas', (lejos.sabalo || 0) > (cerca.sabalo || 0) * 2 && (cerca.pargo || 0) > (lejos.pargo || 0), JSON.stringify({ cerca, lejos }));
      // 6. Invasora: no se suelta, se reporta al DRNA
      A.forzar = 'tilapia'; lanzar(0.5); hasta(() => A.fase === 'pica', 10); clavar(); recogerCon(() => apretar(), () => aflojar(), 40);
      const f2 = ficha();
      check('Invasora (tilapia de Mozambique): ficha «Especie invasora» y el botón dice «Reportar al DRNA»', A.fase === 'foto' && A.pez.id === 'tilapia' && f2 && f2.b === TXT.reportar && hud.q('fchapa').textContent === TXT.invasora && hud.q('fk').textContent === TXT.invasoraNo, JSON.stringify(f2));
      soltarPez();
      check('Al reportarla no vuelve al agua: aviso de gracias y evento para el módulo de invasoras', A.fase === 'listo' && !P.pez.visible && toasts.includes(TXT.reportado) && invasoras.length === 1 && invasoras[0].id === 'tilapia' && !eventos.some(e => e.tipo === 'suelta' && e.pez === 'tilapia'));
      // 7. Fin de la ronda: resultados, récord y álbum
      const pts = A.puntos; A.tiempo = 0.05; correr(0.2);
      const r1 = { fin1: hud.q('fin1').textContent, fin2: hud.q('fin2').textContent, fin3: hud.q('fin3').textContent, alb: hud.q('alb').textContent };
      check('Se acaba el tiempo: resultados con peces, puntos, récord y el álbum de hoy', A.fase === 'fin' && !hud.q('fin').hidden && hud.q('juego').hidden && r1.fin1 === TXT.fin && r1.fin2 === finTxt(2, pts) && r1.fin3 === TXT.nuevo && r1.alb.includes('Tilapia de Mozambique') && r1.alb.includes(pez1.nombre), JSON.stringify(r1));
      const g = v && v.mundo ? v.mundo(ID) : null;
      check('El récord queda en la sesión y en el progreso (pesca_muelle: mejor y especies vistas)', recordVer() === pts && (!v || (g && g.mejor === pts && g.vistos.includes('tilapia'))), JSON.stringify(g));
      tecla('keydown', 'r'); tecla('keyup', 'r');
      check('Teclado: R empieza otra ronda (2:30, 0 peces, récord a la vista)', A.fase === 'listo' && A.tiempo === RONDA && A.peces === 0 && hud.q('record').textContent === recordTxt(pts));
      tecla('keydown', 'Escape');
      check('Teclado: Esc sale de la pesca', A.fase === 'nada' && hud.el.hidden);
      // 8. Ronda táctil completa
      const mm0 = window.matchMedia;
      window.matchMedia = q => (/pointer:\s*coarse/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm0.call(window, q));
      try {
        iniciar({ forzar: true }); pintar(true);
        check('Táctil: los botones no enseñan teclas y la guía habla de botones', hud.el.classList.contains('tactil') && hud.q('guia').textContent === TXT.guiaT, hud.q('guia').textContent);
        const yawA = A.ang; toque(bot('izq'), 'pointerdown', 42); correr(0.3); toque(bot('izq'), 'pointerup', 42);
        check('Táctil: ◀ apunta mientras se mantiene', A.ang > yawA + 0.2 && A.giro === 0);
        const pa = bot('accion'); toque(pa, 'pointerdown', 43); correr(0.7); const ct = A.fase === 'carga' && A.carga > 0.3; toque(pa, 'pointerup', 43);
        check('Táctil: mantener «Lanzar» carga y al soltar se lanza', ct && A.fase === 'vuela');
        hasta(() => A.fase === 'pica', 10);
        toque(pa, 'pointerdown', 44);
        check('Táctil: tocar «¡Clava!» en el pique clava el anzuelo', A.fase === 'tira');
        toque(pa, 'pointerup', 44);
        const pt = A.pez, ft = recogerCon(() => toque(pa, 'pointerdown', 45), () => toque(pa, 'pointerup', 45), 40);
        check('Táctil: manteniendo y soltando «¡Recoge!» se atrapa el pez', ft === 'foto' && A.peces === 1, JSON.stringify({ fase: ft, pez: pt.id }));
        { const bl = bot('soltar'); toque(bl, 'pointerdown', 46); toque(bl, 'pointerup', 46); }
        check('Táctil: el botón «Soltarlo» devuelve el pez al agua', A.fase === 'listo');
        // pointercancel durante la carga no lanza
        toque(pa, 'pointerdown', 47); correr(0.3); toque(pa, 'pointercancel', 47);
        check('Táctil: si el sistema cancela el toque (pointercancel), no se lanza', A.fase === 'listo' && !A.cargando);
        A.tiempo = 0.05; correr(0.2);
        check('Táctil: al acabar el tiempo salen los resultados', A.fase === 'fin');
        // maqueta a 390 × 844 con las hojas reales: botones ≥ 44 px y dentro de la pantalla
        const fr = document.createElement('iframe'); fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
        fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:390px;height:844px;border:0';
        const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
        fr.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}${document.getElementById('v18-pesca-css').outerHTML}</head><body class="v18-pesca-on">${hud.el.outerHTML}</body></html>`;
        document.body.appendChild(fr);
        await new Promise(r => { fr.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
        const md = fr.contentDocument, mal = [];
        const panel = vis => {
          const e = md.getElementById('v18-pesca'); e.hidden = false;
          for (const k of ['juego', 'ficha', 'fin']) e.querySelector('[data-k="' + k + '"]').hidden = k !== vis;
          const bs = [...e.querySelectorAll('[data-k="' + vis + '"] button')].filter(b => b.style.visibility !== 'hidden'); if (!bs.length) mal.push(vis + ': sin botones');
          for (const b of bs) { const r = b.getBoundingClientRect(); if (r.width < 44 || r.height < 44 || r.left < 0 || r.right > 390 || r.bottom > 844 || r.top < 0) mal.push(`${vis} «${b.textContent.trim()}» ${Math.round(r.width)}×${Math.round(r.height)}`); }
          if (md.documentElement.scrollWidth > 390) mal.push(vis + ': scroll horizontal');
        };
        if (!md || !md.getElementById('v18-pesca')) mal.push('la maqueta no cargó'); else { panel('juego'); panel('ficha'); panel('fin'); }
        fr.remove();
        check('Móvil (390 × 844): todos los botones (pescar, ficha y resultados) miden ≥ 44 px y caben en la pantalla', !mal.length, mal.join(' · '));
        { const bo = bot('otra'); toque(bo, 'pointerdown', 48); toque(bo, 'pointerup', 48); }
        check('Táctil: «Otra ronda» empieza de nuevo', A.fase === 'listo' && A.peces === 0);
        { const bs = bot('salir'); toque(bs, 'pointerdown', 49); if (bs.isConnected) toque(bs, 'pointerup', 49); }
        check('Táctil: «Salir» deja la pesca', A.fase === 'nada');
      } catch (e) { check('Táctil: sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
      window.matchMedia = mm0;
      if (A.fase !== 'nada') salir();
      // 9. Limpieza al salir
      const evW2 = tecla('keydown', 'w'); tecla('keyup', 'w');
      check('Al salir todo se limpia: HUD oculto y vacío, piezas ocultas, controles y cámara de siempre', A.fase === 'nada' && hud.el.hidden && !/\p{L}/u.test(hud.el.textContent) && !P.g.visible && !document.body.classList.contains('v18-pesca-on') &&
        G.interaccion.modo !== modo && !evW2.defaultPrevented && (!cam00 || (CAM.height === cam00.height && CAM.dist === cam00.dist)), JSON.stringify({ texto: hud.el.textContent.slice(0, 40), cam: CAM && [CAM.height, CAM.dist] }));
      // 10. Calidad baja / Modo Escuela: sin onda
      const cal = G.renderer.calidad, niv0 = cal && cal.nivel;
      if (cal) { cal.nivel = 'bajo'; iniciar({ forzar: true }); lanzar(0.5); hasta(() => A.fase !== 'vuela', 2); const sinOnda = !P.onda.visible; salir(); cal.nivel = niv0; check('Calidad baja / Modo Escuela: sin onda ni burbujas al caer el corcho', sinOnda); }
      // 11. Inglés: cada texto del minijuego tiene su entrada en content/cap1/en.js
      try {
        const en = await (await fetch('content/cap1/en.js', { cache: 'no-store' })).text();
        const falta = [];
        const ver = s => { if (!en.includes(JSON.stringify(s))) falta.push(s); };
        for (const k in TXT) ver(TXT[k]);
        for (const p of PECES) { ver(p.nombre); ver(p.dato); }
        for (const s of ['Tiempo: {}', 'Peces: {}', 'Puntos: {}', 'Récord: {}', '+{} puntos', '¡Atrapaste: {}!', '{} peces · {} puntos', '1 pez · {} puntos', 'Pesca', 'Lanza, espera el pique y suelta el pez']) ver(s);
        check('Inglés: todos los textos del minijuego están en content/cap1/en.js', !falta.length, falta.slice(0, 6).join(' | '));
      } catch (e) { check('Inglés: se pudo leer content/cap1/en.js', false, e); }
      check('Sin errores de consola durante la prueba', !errores.length, errores.slice(0, 3).join(' | '));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' ') : e); }
    try { if (A.fase !== 'nada') salir(); } catch (e) { /* ya fuera */ }
    A.manual = false; semilla = semilla0; A.forzar = null; recordSesion = 0;
    G.EXPANSION = exp0; try { if (G.menuModos && G.menuModos.mostrar) G.menuModos.mostrar(); } catch (e) { /* */ }
    G.ui.toast = toast0; console.error = cerr0; removeEventListener('error', onErr);
    try { G.off && G.off('v18pesca', oye); G.off && G.off('expansion:invasora', oyeInv); } catch (e) { /* */ }
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = fac0; if (M) { M.flying = fly0; M.vx = M.vz = 0; } G.camara.yaw = yaw0;
    try { G.camara.place(true); } catch (e) { /* cámara */ }
    try { if (v && v.clave) { if (crudo == null) localStorage.removeItem(v.clave()); else localStorage.setItem(v.clave(), crudo); if (v.recargar) v.recargar(); } } catch (e) { /* */ }
    if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18pesca = { ID, SITIO, PECES, RONDA, irYJugar, iniciar, salir, otraRonda, apretar, aflojar, lanzar, clavar, soltarPez, terminar, paso, disponible,
    estado: () => A, record: recordVer, test };
  return G.v18pesca;
};
