/* Juego · F2-2 · «Foto relámpago» (Snap Safari), minijuego corto de «Más juegos» (2 minutos). Diseño: docs/diseno/F2_MINIJUEGOS.md §2.
   Sale la tarjeta de un animal que ya vive en el mundo («Busca: mariposa cebra», con su silueta y una pista de lugar). La flecha de
   guía y la estrella del minimapa señalan dónde está. Acción (E, Enter o el botón Acción, que pasa a decir «Foto») abre la cámara:
   un marco en el centro y unas estrellas que se encienden en vivo. Otra vez Acción: *clic*. Más centrado, más cerca y más quieta,
   más estrellas (1–3). Acertar suma 10 s al reloj y sale la siguiente tarjeta, en otra zona. Cada tarjeta dura 25 s: si se acaba,
   el animal «se escapó» y sale otra (nunca castiga).
   Decisión: foto rápida de 1 estrella o acercarse despacio por las 3 (el lagartijo se esconde detrás del tronco si llegas
   deprisa: lo hace fauna.js; escondido, la foto es de 1 estrella).
   Dificultad: tarjetas 1–2 animales grandes y quietos (cotorras residentes, la boa); si no hay ninguno en la zona, los más fáciles
   que haya (la mariposa antes que los peces, y el lagartijo, que se esconde, nunca primero), con estrellas más generosas ·
   3–5 los que reaccionan (lagartijo, mariposas, peces del río, el coquí) · 6 en adelante, foto con condición (en vuelo, desde el
   suelo de verdad o con dos en el marco; nunca una imposible: los peces solo se ven volando bajo, así que «desde el suelo» no).
   Encuadre asistido: con la cámara abierta y el animal más o menos delante, la vista gira y sube o baja poco a poco hacia él
   (G.camara.yaw / inclina) y se acerca un poco (zoom con fovBonus, más para los pequeños). Los peces solo cuentan si se ven
   (el visor del río encendido); si no, el visor dice «vuela bajo sobre el agua».
   No se gana machacando: el disparo pide la cámara abierta un momento y, tras una foto fallida, 1,4 s de recarga.
   Animales: solo los que ya tienen ficha con fuente en el juego (fauna.js, rio_vivo.js, el Álbum de las 36 vía residentes.js);
   el minijuego no añade ningún dato. La primera foto de uno lo apunta en su sección del Diario (fauna.observar, rioVivo.observar,
   G.album.ver), como si se hubiera observado. Las fotos no se guardan (cero almacenamiento y cero privacidad que cuidar).
   La baraja solo saca animales a menos de 140 m del punto de salida (la zona ya cargada).
   Sin mallas nuevas ni texturas: todo es DOM encima del mundo. Nada se crea por cuadro (vectores y objetos fijos).
   Mientras se juega la música del mundo calla (musica.js lee body.foto-on), los avisos de la historia esperan
   (G.menuModos.ocupado()) y el HUD del mundo se oculta. El panel final es modal (G.pausa 'foto', no deja pasar teclas).
   «Reducir movimiento»: sin flash, sin chispas ni la estampa que salta; los avisos importantes también suenan.
   Récord en este dispositivo (localStorage, <almacen>.foto = { v: 1, mejor, perfecto, jugadas }); lo lee «Mis récords».
   API: window.AVFotoSafari(G) → G.fotoApi = { jugar, salir, activo, paso, estado, objetivo, test }. Prueba: AV.fotoTest(). */
window.AVFotoSafari = function (G) {
  'use strict';
  if (G.fotoApi) return G.fotoApi;
  const S = G.S, R = G.renderer;
  const MV = () => (G.fisica && G.fisica.MOVE) || {};
  const ALM = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.foto';
  const DUR = 120, CARTA = 25, BONO = 10, ZONA = 140, OTRA_ZONA = 15, ESPERA = 0.35, RECARGA = 0.6, RECARGA_FALLO = 1.4, MEDIR = 0.25;
  const MEDALLA = { bronce: 6, plata: 12, oro: 20 };
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const html = document.documentElement;
  const reducido = () => html.classList.contains('mov-reducido') || !!(R && R.REDUCED);
  const reloj = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const clamp = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const leerRec = () => { try { const d = JSON.parse(localStorage.getItem(ALM) || 'null'); return d && d.v === 1 && Number.isInteger(d.mejor) && d.mejor >= 0 && d.mejor < 100000 ? d : null; } catch (e) { return null; } };
  const guardarRec = (mejor, perfecto, jugadas) => { try { localStorage.setItem(ALM, JSON.stringify({ v: 1, mejor, perfecto, jugadas })); } catch (e) { /* sin almacén */ } };
  const sonar = (n, a) => { try { if (!G.quiet && G.audio && G.audio.play) G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  let azarS = 0; const azar = () => { if (!azarS) return Math.random(); azarS = (azarS * 16807) % 2147483647; return (azarS - 1) / 2147483646; };

  // ---------- Animales (los que ya viven en el mundo y tienen ficha con fuente) ----------
  // nivel 1: grandes y quietos · nivel 2: reaccionan. facil: orden para las primeras tarjetas si no hay de nivel 1 (0 el más fácil).
  // zoom: cuántos grados se cierra el campo de visión con la cámara abierta (más para los pequeños). dBien/dMax: a qué distancia de Vittata la foto sale «cerca» del todo / todavía vale.
  // grupo: puede haber dos en el marco (foto con condición «dos»).
  const TIPOS = [
    { id: 'cotorra', fuente: 'residentes', nivel: 1, facil: 0, zoom: 6, dBien: 5, dMax: 22, grupo: true, sil: 'cotorra' },
    { id: 'boa', fuente: 'fauna', nivel: 1, facil: 0, zoom: 6, dBien: 5, dMax: 20, grupo: false, sil: 'boa' },
    { id: 'lagartijo', fuente: 'fauna', nivel: 2, facil: 3, zoom: 16, dBien: 3, dMax: 12, grupo: false, sil: 'lagartijo' },
    { id: 'mariposa', fuente: 'fauna', nivel: 2, facil: 1, zoom: 16, dBien: 3, dMax: 12, grupo: true, sil: 'mariposa' },
    { id: 'coqui', fuente: 'fauna', nivel: 2, facil: 1, zoom: 16, dBien: 2.5, dMax: 9, grupo: false, sil: 'coqui' },
    { id: 'sirajo', fuente: 'rio', nivel: 2, facil: 2, zoom: 10, dBien: 3, dMax: 10, grupo: true, sil: 'pez' },
    { id: 'dajao', fuente: 'rio', nivel: 2, facil: 2, zoom: 10, dBien: 3, dMax: 10, grupo: true, sil: 'pez' },
    { id: 'guabina', fuente: 'rio', nivel: 2, facil: 2, zoom: 10, dBien: 3, dMax: 10, grupo: true, sil: 'pez' },
  ];
  const SIL = {
    cotorra: '<path d="M5 15q2-7 9-8 4 0 6 3l-3 1q2 3-1 6-5 3-11-2z" fill="#4caf50"/><path d="M14 7q4 0 6 3l-3 1z" fill="#e53935"/><circle cx="16.5" cy="9.5" r="1.2" fill="#fff"/><path d="M20 10l3 1.2-3 .8z" fill="#f2d16b"/><path d="M5 15l-3 4 5-2z" fill="#2e7d32"/><path d="M8 13q3-3 7-1" stroke="#1565c0" stroke-width="1.6" fill="none"/>',
    boa: '<path d="M3 18q4-6 9-2t9-3" stroke="#8a6d44" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M3 18q4-6 9-2t9-3" stroke="#3b2e1e" stroke-width="1.2" stroke-dasharray="1.5 2.5" fill="none"/><ellipse cx="21.2" cy="12.6" rx="2.4" ry="1.7" fill="#6b5a3e"/><circle cx="22" cy="12" r=".5" fill="#f2d16b"/>',
    lagartijo: '<path d="M2 20q6-2 9-6" stroke="#9c8a5c" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="14" cy="12" rx="4.6" ry="2.3" fill="#7d6c45" transform="rotate(-30 14 12)"/><ellipse cx="19" cy="8.2" rx="2.4" ry="1.6" fill="#7d6c45" transform="rotate(-30 19 8.2)"/><path d="M16 10.6q-1 4 2 4.4q.6-3-1-4.4z" fill="#f2c428" stroke="#e8742a" stroke-width=".7"/><path d="M11 13l-2 3M15 15l1 3M13 9l-2-2M17 11l2-2" stroke="#7d6c45" stroke-width="1.2"/>',
    mariposa: '<path d="M12 12L3 5q-2 6 3 8zM12 12l9-7q2 6-3 8zM12 12l-6 2q-1 5 4 4zM12 12l6 2q1 5-4 4z" fill="#1a1712"/><path d="M5 7l5 4M19 7l-5 4M7 15l4-2M17 15l-4-2" stroke="#f2cf3a" stroke-width="1.4"/><path d="M12 7v11" stroke="#1a1712" stroke-width="1.6"/>',
    coqui: '<ellipse cx="12" cy="20" rx="10" ry="2" fill="#3f7d34"/><ellipse cx="12" cy="14" rx="5.4" ry="4.4" fill="#b0773a"/><circle cx="9.6" cy="10.6" r="1.4" fill="#1b1b1b"/><circle cx="14.4" cy="10.6" r="1.4" fill="#1b1b1b"/><ellipse cx="12" cy="16.6" rx="2.6" ry="1.8" fill="#e9dcae"/><path d="M6 17l-3 2M18 17l3 2" stroke="#9a6230" stroke-width="1.6"/>',
    pez: '<path d="M2 12Q8 5 16 9L22 5 20.5 12 22 19 16 15Q8 19 2 12Z" fill="#4c6758"/><circle cx="6" cy="11" r="1" fill="#fff"/>',
  };
  const icono = (sil, cls) => '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '>' + (SIL[sil] || SIL.cotorra) + '</svg>';
  const ESTRELLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z"/></svg>';

  function nombreDe(t, sp) {
    try {
      if (t.fuente === 'fauna') { const e = ((G.pack && G.pack.fauna && G.pack.fauna.especies) || []).find(x => x.id === t.id); if (e) return L(e.nombre, e.nombreEn || e.nombre); }
      if (t.fuente === 'rio') { const e = ((G.rioVivo && G.rioVivo.especies) || []).find(x => x.id === t.id); if (e) return L(e.nombre, e.nombreEn || e.nombre); }
      if (t.fuente === 'residentes') { const A = window.AV_ESPECIES, e = A && A.especies && A.especies.find(x => x.id === sp); if (e) return (e.comun && e.comun[en() ? 'en' : 'es']) || e.cientifico; }
    } catch (e) { /* sin datos */ }
    return { cotorra: L('Cotorra', 'Parrot'), boa: L('Boa', 'Boa'), lagartijo: L('Lagartijo', 'Anole'), mariposa: L('Mariposa', 'Butterfly'), coqui: 'Coquí' }[t.id] || L('Pez del río', 'River fish');
  }
  // Pista: el lugar con nombre del mapa más cercano al animal (a 70 m o menos), y cómo se ve si hace falta
  function pistaDe(t, x, z) {
    let mejor = null, bd = 70 * 70;
    try { const P = G.terreno && G.terreno.pois; if (P) for (const k in P) { const p = P[k]; if (!p || !p.nombre) continue; const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z); if (d < bd) { bd = d; mejor = p; } } } catch (e) { /* sin mapa */ }
    const nom = mejor ? (en() && window.AV_EN && window.AV_EN[mejor.nombre]) || mejor.nombre : '';
    const extra = t.fuente === 'rio' ? L(' · vuela bajo sobre el agua', ' · fly low over the water') : t.id === 'lagartijo' ? L(' · en un tronco', ' · on a tree trunk') : t.id === 'boa' ? L(' · en una rama', ' · on a branch') : '';
    // lo importante primero («vuela bajo sobre el agua», «en un tronco»): si la línea se corta, se corta el lugar
    if (extra) return L('Pista: ', 'Hint: ') + extra.slice(3) + (nom ? L(' · cerca de ', ' · near ') + nom : '');
    return nom ? L('Pista: cerca de ', 'Hint: near ') + nom : L('Pista: sigue la flecha', 'Hint: follow the arrow');
  }

  // ---------- Estado (objetos fijos: nada se crea por cuadro) ----------
  const o1 = { x: 0, y: 0, z: 0, sp: '', oculto: false, ok: false, nove: false }, o2 = { x: 0, y: 0, z: 0, sp: '', oculto: false, ok: false, nove: false }; // nove: el pez no se ve (visor del río apagado)
  const guia = { x: 0, y: 0, z: 0 };
  const _v = new THREE.Vector3();
  const MED = { centro: 0, cerca: 0, quieta: 0, d: 0, enMarco: false, cond: true, s0: 0 }; // s0: estrellas sin mirar la condición
  const ROLLO = 14; const rollo = []; for (let i = 0; i < ROLLO; i++) rollo.push({ sil: '', s: 0 });
  const carta = { tipo: null, sp: '', t: 0, cond: '', nombre: '', pista: '', vivo: false, facil: false };
  const E = { fase: 'nada', t: 0, reloj: DUR, k: 0, estrellas: 0, fotos: 0, tres: 0, nr: 0, cam: false, camT: 0, recarga: 0, msgT: 0, estT: 0, avisos: 0, medirT: 0, buscarT: 0,
    vivo: -1, vcode: -1, x0: 0, z0: 0, ux: 1e9, uz: 1e9, ultimo: '', mejor: 0, perfecto: 0, jugadas: 0, nuevo: false, finP: 0, fichas: 0, pend: false, nopT: 0 }; // pend: foto pedida mientras la cámara se abre · nopT: «Un momento…» tras tocar en la recarga
  let prueba = null; // la prueba pone aquí su propio «dónde hay uno»
  function donde(t, sp, a, b) {
    a.nove = false; if (b) b.nove = false;
    if (prueba) return prueba(t, sp, a, b);
    const x = S.pos.x, z = S.pos.z;
    try {
      if (t.fuente === 'fauna') return G.fauna && G.fauna.cerca ? G.fauna.cerca(t.id, x, z, a, b) : null;
      if (t.fuente === 'rio') { // los peces solo se ven con el visor del río encendido (volando bajo o quieta en la orilla)
        const r = G.rioVivo && G.rioVivo.cerca ? G.rioVivo.cerca(t.id, x, z, a, b) : null;
        if (r && !G.rioVivo.visor) { a.nove = true; if (b) b.ok = false; }
        return r;
      }
      if (t.fuente === 'residentes') return G.residentes && G.residentes.cerca ? G.residentes.cerca(x, z, a, b, sp || null) : null;
    } catch (e) { return null; }
    return null;
  }

  // ---------- Medir el encuadre: proyección del animal a la pantalla (distancia al centro), distancia y quietud de Vittata ----------
  const lado = () => Math.min(innerWidth, innerHeight) * 0.52; // el marco (px), cuadrado y en el centro
  function enMarco(p) {
    const cam = R.camera; _v.set(p.x, p.y, p.z).project(cam);
    if (!(_v.z > -1 && _v.z < 1)) return -1; // detrás de la cámara
    const h = lado() / 2, sx = _v.x * innerWidth / 2, sy = _v.y * innerHeight / 2;
    return Math.abs(sx) < h && Math.abs(sy) < h ? Math.hypot(sx, sy) / h : -1;
  }
  function medir() {
    const t = carta.tipo, m = MV();
    const r = enMarco(o1);
    MED.enMarco = r >= 0; MED.centro = r >= 0 ? clamp(1 - r) : 0;
    MED.d = Math.hypot(o1.x - S.pos.x, o1.y - (S.pos.y + 0.6), o1.z - S.pos.z);
    MED.cerca = clamp((t.dMax - MED.d) / (t.dMax - t.dBien));
    const vel = Math.hypot(m.speed || 0, S.vy || 0); MED.quieta = clamp((5 - vel) / 3.8);
    MED.cond = carta.cond === 'vuela' ? !!m.flying : carta.cond === 'suelo' ? enSuelo() : carta.cond === 'dos' ? !!(o2.ok && enMarco(o2) >= 0) : true;
    MED.s0 = 0;
    if (o1.nove || !MED.enMarco || MED.d > t.dMax) return 0; // un pez que no se ve no da foto
    let s = 1;
    const c2 = carta.facil ? 0.35 : 0.45, c3 = carta.facil ? 0.6 : 0.72, k3 = carta.facil ? 0.7 : 0.85; // las primeras tarjetas, más generosas
    if (!o1.oculto && MED.centro >= c2 && MED.cerca >= c2 && MED.quieta >= 0.4) s = 2;
    if (s === 2 && MED.centro >= c3 && MED.cerca >= k3 && MED.quieta >= 0.8) s = 3;
    MED.s0 = s;
    return MED.cond ? s : 0; // sin la condición, las estrellas en vivo no se encienden (el visor dice qué falta)
  }

  // «Desde el suelo» de verdad: ni volando ni posada en una rama, y con las patas cerca del terreno
  function enSuelo() {
    const m = MV(); if (m.flying || m.posado) return false;
    try { return !G.terreno || !G.terreno.height || S.pos.y - G.terreno.height(S.pos.x, S.pos.z) < 1.2; } catch (e) { return true; }
  }

  // ---------- Tarjetas ----------
  function nuevaCarta() {
    carta.tipo = null; carta.vivo = false;
    const k = E.k, nivelQ = k < 2 ? 1 : 2;
    // las 2 primeras: el nivel 1 si lo hay en la zona; si no, el más fácil que haya (el lagartijo, que se esconde, el último)
    let mejor = null, mejorP = -1e9, sp = '';
    for (let i = 0; i < TIPOS.length; i++) {
      const t = TIPOS[i];
      if (!donde(t, '', o1, null)) continue;
      if (Math.hypot(o1.x - E.x0, o1.z - E.z0) > ZONA) continue; // solo la zona ya cargada alrededor del punto de salida
      const dV = Math.hypot(o1.x - S.pos.x, o1.z - S.pos.z), dU = Math.hypot(o1.x - E.ux, o1.z - E.uz);
      let p = azar() * 3 - dV * 0.02;
      if (k < 2) p += t.nivel === 1 ? 14 : 10 - 3 * t.facil; // el nivel que toca o, sin él, el más fácil
      else if (t.nivel === nivelQ) p += 10; // el nivel que toca
      if (t.id === E.ultimo) p -= 20; // no el mismo dos veces seguidas
      if (dU > OTRA_ZONA) p += 5; // en otra zona
      if (p > mejorP) { mejorP = p; mejor = t; sp = o1.sp || ''; }
    }
    if (!mejor) { pintarCarta(); return false; }
    donde(mejor, sp, o1, o2);
    carta.tipo = mejor; carta.sp = mejor.fuente === 'residentes' ? sp : ''; carta.t = CARTA; carta.vivo = true;
    carta.facil = k < 2;
    // nunca una condición imposible: los peces solo se ven volando bajo (nada de «desde el suelo»)
    carta.cond = k >= 5 ? (mejor.grupo && o2.ok && k % 3 === 2 ? 'dos' : k % 2 || mejor.fuente === 'rio' ? 'vuela' : 'suelo') : '';
    carta.nombre = nombreDe(mejor, carta.sp); carta.pista = pistaDe(mejor, o1.x, o1.z);
    E.ultimo = mejor.id; E.ux = o1.x; E.uz = o1.z; E.k = k + 1; E.vivo = -1; E.vcode = -1;
    guia.x = o1.x; guia.y = o1.y + 1.6; guia.z = o1.z;
    sonar('flecha'); pintarCarta(); pintarVisor();
    return true;
  }
  const textoCond = c => (c === 'vuela' ? L('En vuelo', 'In flight') : c === 'suelo' ? L('Desde el suelo', 'From the ground') : c === 'dos' ? L('Dos en el marco', 'Two in the frame') : '');
  function escapo() {
    sonar('aviso'); aviso(L('¡Se escapó! Otra tarjeta', 'It got away! Next card'), 'malo');
    cerrarCam(); nuevaCarta();
  }
  // La primera foto de un animal lo apunta en su sección del Diario (la ficha que ya existe). Devuelve el nombre de la sección
  // donde el niño la va a encontrar, o '' si no hay ficha nueva que ver (también si la ficha está oculta: fauna.js solo publica
  // las 'verificado'; el lagartijo y la mariposa siguen en 'parcial' y no salen en el Diario).
  let apuntarPrueba = null;
  const fichaVisible = id => { const e = ((G.pack && G.pack.fauna && G.pack.fauna.especies) || []).find(x => x.id === id); return !!(e && e.estado === 'verificado'); };
  function apuntar(t, sp) {
    if (apuntarPrueba) return apuntarPrueba(t, sp);
    if (prueba) return '';
    try {
      if (t.fuente === 'fauna' && G.fauna && G.fauna.observar) {
        const A = (G.pack && G.pack.fauna && G.pack.fauna.album) || {};
        return G.fauna.observar(t.id) && fichaVisible(t.id) ? L(A.titulo || 'Fauna de El Yunque', A.tituloEn || 'Wildlife of El Yunque') : '';
      }
      if (t.fuente === 'rio' && G.rioVivo && G.rioVivo.observar) return G.rioVivo.observar(t.id) ? L('Peces del río', 'River fish') : '';
      if (t.fuente === 'residentes' && G.album && G.album.ver && sp) return G.album.ver(sp, 'foto') ? L('el Álbum', 'the Album') : '';
    } catch (e) { /* sin Diario */ }
    return '';
  }

  // ---------- Cámara (el marco y las estrellas en vivo; la vista se acerca un poco) ----------
  let cam0 = null;
  const CAM_D = 3, CAM_F = 4, TAU = Math.PI * 2, ASIST_ANG = 1.3, ASIST_K = 3;
  function camara(on) {
    const K = G.camara, C = K && K.CAM; if (!C) return;
    if (on && !cam0) {
      cam0 = { dist: C.dist, distFly: C.distFly, inc: K.inclina || 0, zoom: 0 }; C.dist = Math.max(2.6, C.dist - CAM_D); C.distFly = Math.max(3, C.distFly - CAM_F); cam0.d = C.dist; cam0.f = C.distFly;
      cam0.zoom = carta.tipo && carta.tipo.zoom ? carta.tipo.zoom : 0; if (cam0.zoom && typeof K.fovBonus === 'number') K.fovBonus -= cam0.zoom; // zoom: el animal se ve más grande
    } else if (!on && cam0) {
      if (C.dist === cam0.d) C.dist = cam0.dist; if (C.distFly === cam0.f) C.distFly = cam0.distFly; // si otro módulo la cambió mientras tanto, no se pisa
      if (cam0.zoom && typeof K.fovBonus === 'number') K.fovBonus += cam0.zoom;
      try { K.inclina = cam0.inc; } catch (e) { /* */ }
      cam0 = null;
    }
  }
  // Encuadre asistido: con el animal más o menos delante (a menos de ~75° de donde mira la cámara), la vista gira y sube o baja
  // poco a poco hasta tenerlo en el marco. El niño solo tiene que mirar hacia él y acercarse; la cámara de siempre hace el resto.
  function asistir(dt) {
    const K = G.camara, C = K && K.CAM, t = carta.tipo;
    if (!C || !t || !carta.vivo || o1.nove || !(dt > 0)) return false;
    const dx = o1.x - S.pos.x, dz = o1.z - S.pos.z, dh = Math.hypot(dx, dz);
    if (dh < 0.4 || dh > t.dMax * 1.5) return false;
    let dy = Math.atan2(-dx, -dz) - K.yaw; dy = ((dy % TAU) + TAU * 1.5) % TAU - Math.PI; // la cámara al otro lado de Vittata
    if (Math.abs(dy) > ASIST_ANG) return false;
    const k = 1 - Math.exp(-ASIST_K * dt), fly = !!MV().flying;
    K.yaw += dy * k;
    const e0 = Math.atan2((fly ? C.heightFly : C.height) - C.look, typeof K.dist === 'function' ? K.dist() : (fly ? C.distFly : C.dist));
    const e = Math.atan2(S.pos.y + C.look - o1.y, dh); // la línea cámara → cabeza de Vittata llega a la altura del animal
    const i0 = K.inclina || 0; K.inclina = i0 + (e0 - e - i0) * k;
    return true;
  }
  // Mirando por la cámara, Vittata no tapa el marco: su modelo se oculta mientras (como en el vuelo libre) y vuelve al cerrar
  // (y su sombra, G.actores.pShadow). Se repite en cada dibujo: el vuelo libre la vuelve a mostrar al despegar o aterrizar.
  let ocultaV = null, ocultaS = null;
  function verVittata(on) {
    try {
      const A = G.actores, r = A && A.player3D && A.player3D.root, sh = A && A.pShadow;
      if (!on) {
        if (r && (r.visible || ocultaV)) { r.visible = false; ocultaV = r; }
        if (sh && (sh.visible || ocultaS)) { sh.visible = false; ocultaS = sh; }
      } else {
        if (ocultaV) { ocultaV.visible = true; ocultaV = null; }
        if (ocultaS) { ocultaS.visible = true; ocultaS = null; }
      }
    } catch (e) { /* sin modelo */ }
  }
  function abrirCam() {
    if (E.cam || E.fase !== 'juego' || !carta.tipo) return;
    E.cam = true; E.camT = 0; E.vivo = -1; E.vcode = -1; E.pend = false; camara(true); verVittata(false); sonar('boton');
    document.body.classList.add('foto-cam'); pintarVisor();
  }
  function cerrarCam() {
    if (!E.cam) return;
    E.cam = false; E.pend = false; camara(false); verVittata(true); document.body.classList.remove('foto-cam'); pintarVisor();
  }
  function disparar() {
    if (E.fase !== 'juego' || !carta.tipo) return;
    if (!E.cam) { abrirCam(); return; }
    if (E.camT < ESPERA) { E.pend = true; return; } // la cámara aún se abre: la foto sale en cuanto esté lista (no se pierde el toque)
    if (E.recarga > 0) { E.nopT = 0.6; pintarVisor(); return; } // machacar no sirve, pero el visor dice «Un momento…»
    carta.vivo = !!donde(carta.tipo, carta.sp, o1, o2);
    const s = carta.vivo ? medir() : 0;
    sonar('clic'); flash();
    if (!s && carta.vivo && MED.s0 && !MED.cond) { E.recarga = RECARGA_FALLO; aviso(L('Falta: ', 'Needed: ') + textoCond(carta.cond), 'malo'); return; }
    if (!s) { E.recarga = RECARGA_FALLO; aviso(carta.vivo && o1.nove ? L('No se ve: vuela bajo sobre el agua', "Can't see it: fly low over the water") : carta.vivo && MED.enMarco && MED.d > carta.tipo.dMax ? L('Acércate despacio…', 'Get closer, slowly…') : L('¡Casi! Ponlo dentro del marco', 'So close! Get it inside the frame'), 'malo'); return; }
    E.recarga = RECARGA; acierto(s);
  }
  function acierto(s) {
    const t = carta.tipo;
    E.estrellas += s; E.fotos++; if (s === 3) E.tres++; E.reloj += BONO;
    if (E.nr < ROLLO) { rollo[E.nr].sil = t.sil; rollo[E.nr].s = s; E.nr++; }
    const nueva = apuntar(t, carta.sp); if (nueva) E.fichas++;
    sonar(s === 3 ? 'logro' : 'encaje'); if (nueva && t.fuente !== 'residentes') sonar('descubrir'); // el Álbum ya suena 'descubrir' al apuntarla
    if (s === 3 && !reducido()) { try { if (G.fx && G.fx.burst) G.fx.burst(o1.x, o1.y + 0.4, o1.z, 'gold', 14); } catch (e) { /* sin fx */ } }
    // la de 1 estrella dice qué mejorar (movida, escondido, lejos o descentrada); la ficha nueva, en qué sección del Diario está
    const una = MED.quieta < 0.4 ? L('Salió movida', 'A bit blurry') : o1.oculto ? L('Se escondía', 'It was hiding') : MED.cerca < 0.45 ? L('Un poco lejos', 'A bit far') : L('Un poco descentrada', 'A bit off-center');
    aviso((s === 3 ? L('¡Fotaza!', 'Great shot!') : s === 2 ? L('Buena foto', 'Nice photo') : una) + ' +' + s + '★ · +' + BONO + ' s' + (nueva ? L(' · ¡Nueva en ', ' · New in ') + nueva + '!' : ''), s === 3 ? 'oro' : 'bien');
    estampa(t, s);
    cerrarCam(); nuevaCarta(); pintarHud();
  }

  // ---------- Paso ----------
  function paso(dt) {
    if (E.fase !== 'juego' || !(dt > 0)) return;
    E.t += dt; E.reloj -= dt;
    if (E.msgT > 0 && (E.msgT -= dt) <= 0 && hudEl) { const m = q(hudEl, 'msg'); m.textContent = ''; m.className = ''; }
    if (E.estT > 0 && (E.estT -= dt) <= 0 && estEl) estEl.hidden = true;
    if (E.recarga > 0) E.recarga -= dt;
    if (E.nopT > 0 && (E.nopT -= dt) <= 0) pintarVisor();
    if (!carta.tipo) { if ((E.buscarT -= dt) <= 0) { E.buscarT = 1; if (!nuevaCarta()) aviso(L('Buscando animales… vuela un poco por aquí', 'Looking for animals… fly around here'), ''); } }
    else {
      carta.t -= dt;
      if (E.cam || (E.medirT -= dt) <= 0) {
        E.medirT = MEDIR;
        carta.vivo = !!donde(carta.tipo, carta.sp, o1, o2);
        if (carta.vivo) { guia.x = o1.x; guia.y = o1.y + 1.6; guia.z = o1.z; }
      }
      if (E.cam) {
        E.camT += dt;
        verVittata(false);
        asistir(dt);
        if (E.pend && E.camT >= ESPERA) { E.pend = false; disparar(); if (!E.cam || !carta.tipo) return; }
        const s = carta.vivo ? medir() : 0;
        const c = s * 10 + vtxIdx(s);
        if (c !== E.vcode) { E.vcode = c; E.vivo = s; pintarVisor(); }
      }
      if (carta.t <= 0) escapo();
    }
    if (E.avisos === 0 && E.reloj <= 10) { E.avisos = 1; sonar('aviso'); }
    if (E.avisos === 1 && E.reloj <= 5) { E.avisos = 2; sonar('aviso'); }
    if (E.reloj > 10 && E.avisos) E.avisos = 0; // el bono de una foto lo vuelve a subir
    if (E.reloj <= 0) { fin(); return; }
    if (hudEl && Math.floor((E.t - dt) * 4) !== Math.floor(E.t * 4)) pintarHud();
  }
  G.on('update', (dt, busy) => { if (!G.quiet && !busy) paso(Math.min(0.05, dt || 0)); });
  // con la cámara abierta la flecha no entra en el marco, y con el panel final no queda detrás (misiones.js la pone en 60)
  const guiar = () => {
    verHud(); if (E.fase === 'nada' || !G.fx || !G.fx.guide) return;
    if (E.cam) verVittata(false);
    G.fx.guide(E.fase === 'juego' && !E.cam && carta.tipo && carta.vivo ? guia : null, performance.now() / 1000);
  };
  G.on('render', guiar, 61); // después de misiones.js (60): la flecha va al animal de la tarjeta
  G.on('pausa', () => verHud()); // al terminar la carga sale el HUD

  // ---------- Acción = «Foto» (G.interaccion.modo, como el rescate y el puerto) ----------
  const MODO = { activo: () => E.fase === 'juego', accion: () => disparar(), aviso: () => '', get verbo() { return L('Foto', 'Photo'); } };
  let modo0 = null;

  // ---------- HUD, visor y panel final ----------
  let hudEl = null, cartaEl = null, visorEl = null, finEl = null, flashEl = null, estEl = null;
  function css() {
    if (document.getElementById('fs-css')) return;
    const st = document.createElement('style'); st.id = 'fs-css';
    const caja = 'background:rgba(16,36,28,.88);color:#fff8e6;font-family:Fredoka,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);box-sizing:border-box;';
    st.textContent = '#fs-hud{position:fixed;left:12px;right:12px;margin-inline:auto;width:fit-content;top:calc(env(safe-area-inset-top,0px) + 10px);z-index:60;display:flex;align-items:center;gap:6px 12px;padding:6px 8px 6px 14px;border-radius:20px;' + caja + 'font-weight:600;font-size:15px}' +
      '#fs-hud[hidden],#fs-carta[hidden],#fs-visor[hidden],#fs-fin[hidden],#fs-est[hidden],#fs-foto[hidden]{display:none}' +
      '#fs-hud .fs-t{font-variant-numeric:tabular-nums;font-size:18px;font-weight:700;min-width:3.2ch;text-align:center}#fs-hud .fs-t.poco{color:#ffb4a2}#fs-hud .fs-p{display:flex;align-items:center;gap:3px;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}#fs-hud .fs-p svg{width:20px;height:20px;fill:#ffd23f}#fs-hud .fs-r{opacity:.85;font-size:14px}#fs-hud .fs-r:empty{display:none}' +
      '#fs-hud [data-k="msg"]{position:absolute;left:50%;top:calc(100% + 76px);transform:translateX(-50%);white-space:nowrap;max-width:calc(100vw - 24px);overflow:hidden;text-overflow:ellipsis;padding:4px 12px;border-radius:999px;font-weight:700;pointer-events:none;background:#fff3d6;color:#3b2a14}#fs-hud [data-k="msg"]:empty{display:none}#fs-hud [data-k="msg"].oro{background:#ffd23f}#fs-hud [data-k="msg"].malo{background:#ffd0c4;color:#5a1e10}#fs-hud [data-k="msg"].bien{background:#c8f0c0;color:#173d12}' +
      '#fs-carta{position:fixed;left:12px;right:12px;margin-inline:auto;width:fit-content;max-width:min(440px,calc(100vw - 24px));top:calc(env(safe-area-inset-top,0px) + 66px);z-index:60;display:flex;align-items:center;gap:10px;padding:6px 14px 6px 8px;border-radius:999px;' + caja + 'pointer-events:none}' +
      '#fs-carta svg{flex:none;width:40px;height:40px;padding:3px;border-radius:50%;background:#fff3d6}#fs-carta .fs-c{display:flex;flex-direction:column;min-width:0}#fs-carta b{font-size:17px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#fs-carta small{font-size:13px;line-height:1.2;opacity:.9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#fs-carta .fs-cond{color:#ffd23f}#fs-carta .fs-cond:empty{display:none}#fs-carta i{position:absolute;left:22px;right:22px;bottom:2px;height:3px;border-radius:2px;background:#7fe3a0;transform-origin:left}#fs-carta i.poco{background:#ffb4a2}' +
      '#fs-visor{position:fixed;inset:0;z-index:59;pointer-events:none}#fs-visor .fs-marco{position:absolute;left:50%;top:50%;width:52vmin;height:52vmin;transform:translate(-50%,-50%);border-radius:10px;box-shadow:0 0 0 200vmax rgba(0,0,0,.28)}' +
      '#fs-visor .fs-marco::before,#fs-visor .fs-marco::after{content:"";position:absolute;inset:0;border-radius:10px;border:4px solid #fff;clip-path:polygon(0 0,22% 0,22% 4px,4px 4px,4px 22%,0 22%,0 78%,4px 78%,4px calc(100% - 4px),22% calc(100% - 4px),22% 100%,78% 100%,78% calc(100% - 4px),calc(100% - 4px) calc(100% - 4px),calc(100% - 4px) 78%,100% 78%,100% 22%,calc(100% - 4px) 22%,calc(100% - 4px) 4px,78% 4px,78% 0,100% 0,100% 100%,0 100%)}' +
      '#fs-visor .fs-marco::after{border:0;inset:calc(50% - 9px);border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.75);clip-path:none}#fs-visor.s3 .fs-marco::before{border-color:#ffd23f}' +
      '#fs-visor .fs-est{position:absolute;left:50%;top:calc(50% + 26vmin + 10px);transform:translateX(-50%);display:flex;gap:6px;padding:4px 12px;border-radius:999px;background:rgba(16,36,28,.82)}#fs-visor .fs-est svg{width:30px;height:30px;fill:rgba(255,255,255,.28)}#fs-visor .fs-est svg.on{fill:#ffd23f}' +
      '#fs-visor .fs-vtx{position:absolute;left:50%;top:calc(50% - 26vmin + 8px);transform:translateX(-50%);width:max-content;max-width:calc(52vmin - 16px);text-align:center;line-height:1.2;padding:4px 12px;border-radius:14px;background:rgba(16,36,28,.82);color:#fff8e6;font:600 14px Fredoka,system-ui,sans-serif;box-sizing:border-box}#fs-visor .fs-vtx:empty{display:none}' +
      '#fs-visor button{position:absolute;right:calc(50% - 26vmin + 6px);top:calc(50% + 26vmin - 50px);padding:0;width:44px;font-size:20px;pointer-events:auto;background:rgba(255,243,214,.92)}' +
      '#fs-hud button,#fs-fin button,#fs-visor button,#fs-foto{min-height:44px;min-width:44px;padding:4px 16px;border-radius:22px;border:0;font:700 16px Fredoka,system-ui,sans-serif;background:#fff3d6;color:#3b2a14;box-shadow:0 3px 0 rgba(0,0,0,.25);cursor:pointer;touch-action:manipulation}' +
      '#fs-hud button.salir,#fs-fin button.salir{background:#ffd0c4}#fs-hud button:focus-visible,#fs-fin button:focus-visible,#fs-visor button:focus-visible,#fs-foto:focus-visible{outline:4px solid #ffd27a;outline-offset:2px}' +
      '#fs-foto{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);z-index:60;min-height:64px;min-width:64px;padding:6px 18px;border-radius:32px;display:flex;align-items:center;gap:8px;font-size:18px;background:#ffd23f}#fs-foto svg{width:26px;height:26px}' +
      '@media (hover:none) and (pointer:coarse){#fs-foto{display:none!important}}' + // en táctil dispara el botón Acción de siempre, que dice «Foto»
      '#fs-flash{position:fixed;inset:0;z-index:61;background:#fff;opacity:0;pointer-events:none;transition:opacity .4s ease-out}' +
      '#fs-est{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-4deg);z-index:61;display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 14px 8px;border-radius:8px;background:#fffdf4;color:#3b2a14;box-shadow:0 8px 24px rgba(0,0,0,.4);font:700 15px Fredoka,system-ui,sans-serif;pointer-events:none;animation:fs-pop .35s ease-out}#fs-est svg{width:64px;height:64px}#fs-est .fs-es{display:flex}#fs-est .fs-es svg{width:20px;height:20px;fill:#e0a400}' +
      '@keyframes fs-pop{from{transform:translate(-50%,-50%) rotate(-4deg) scale(1.5);opacity:0}}html.mov-reducido #fs-est{animation:none}@media (prefers-reduced-motion:reduce){#fs-est{animation:none}#fs-flash{transition:none}}' +
      '#fs-fin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:61;width:min(400px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;padding:18px 18px 16px;border-radius:24px;' + caja + 'background:rgba(16,36,28,.97);text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}#fs-fin:focus{outline:none}' +
      '#fs-fin h2{margin:0;font-size:26px}#fs-fin .fs-gran{display:flex;align-items:center;gap:8px;font-size:44px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}#fs-fin .fs-gran svg{width:42px;height:42px;fill:#ffd23f}#fs-fin p{margin:0;font-size:17px;font-weight:600}#fs-fin .fs-med{font-size:16px;padding:3px 12px;border-radius:999px;background:#fff3d6;color:#3b2a14}#fs-fin .fs-med:empty{display:none}#fs-fin .fs-det{font-size:15px;opacity:.85;font-weight:500}' +
      '#fs-fin .fs-rollo{display:flex;flex-wrap:wrap;justify-content:center;gap:4px}#fs-fin .fs-rollo:empty{display:none}#fs-fin .fs-rollo span{display:flex;flex-direction:column;align-items:center;padding:3px 4px 1px;border-radius:6px;background:#fffdf4;color:#e0a400;font-size:11px;line-height:1}#fs-fin .fs-rollo svg{width:26px;height:26px}#fs-fin .fs-bots{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:6px}#fs-fin button{min-height:54px;padding:4px 22px;font-size:18px}' +
      // teléfono en vertical: la pista puede ir en 2 líneas, el aviso va debajo de la tarjeta y el minimapa baja un poco (no se tapan)
      '@media (max-width:560px) and (orientation:portrait){#fs-carta small[data-k="pista"]{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}#fs-hud [data-k="msg"]{position:fixed;top:calc(env(safe-area-inset-top,0px) + 150px);max-width:calc(100vw - 24px - var(--mm,96px) - 68px);left:12px;transform:none;white-space:normal;text-align:center}body.foto-on #minimapa{top:max(var(--mm-top,0px),calc(env(safe-area-inset-top,0px) + 152px))!important}}' +
      // horizontal bajo: el aviso, debajo de la tarjeta a la izquierda (a la derecha tapaba Diario y Gestos)
      '@media (orientation:landscape) and (max-height:500px){#fs-carta{left:12px;right:auto;margin:0;top:calc(env(safe-area-inset-top,0px) + 10px);max-width:min(330px,calc(50vw - 24px))}#fs-hud{right:12px;left:auto;margin:0}#fs-hud [data-k="msg"]{position:fixed;top:calc(env(safe-area-inset-top,0px) + 80px);left:12px;right:auto;transform:none;max-width:min(330px,calc(50vw - 24px))}#fs-fin{padding:12px 16px;gap:4px}#fs-fin h2{font-size:21px}#fs-fin .fs-gran{font-size:34px}}' +
      // la historia no se mezcla con el minijuego: fuera el letrero, los avisos y bocadillos, la pista de Acción, los contadores
      'body.foto-on :is(#quest,#inv,#inv-cuenta,#inv-reporte,#modo-salir,#toast,#prompt,#bocadillos,#juice-chip,#juice-pop,#truco-chip,#fx-descubre,#v18-exp-poder,#v18-extra,#b-construir,#b-nido,#marcador,#retos,#pista-vuela){visibility:hidden!important}' +
      'body.foto-fin :is(#minimapa,#guia-hud,#keyhint,#acts,#stick,#emotes,#tag,#fs-foto,#sys){visibility:hidden!important}' + // ni los botones redondos del lateral detrás del panel
      'body.foto-on #rio-visor{display:none!important}' + // el visor del río sí se enciende (los peces se ven), pero sin su letrero: manda el de la cámara
      // en táctil el botón Acción dice «Foto» y lleva el icono de la cámara (no los destellos)
      'body.foto-on #b-act{--icon:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M4 7h3l2-2h6l2 2h3v12H4zm8 2.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z%27 fill-rule=%27evenodd%27/%3E%3C/svg%3E")}';
    document.head.appendChild(st);
  }
  function montar() {
    if (hudEl) return;
    css();
    hudEl = document.createElement('div'); hudEl.id = 'fs-hud'; hudEl.hidden = true; hudEl.setAttribute('role', 'status');
    hudEl.innerHTML = '<span class="fs-t" data-k="r"></span><span class="fs-p">' + ESTRELLA + '<span data-k="p"></span></span><span class="fs-r" data-k="rec"></span><span data-k="msg" aria-live="polite"></span><button type="button" class="salir" data-a="salir"></button>';
    cartaEl = document.createElement('div'); cartaEl.id = 'fs-carta'; cartaEl.hidden = true; cartaEl.setAttribute('aria-live', 'polite');
    cartaEl.innerHTML = '<span data-k="ic"></span><span class="fs-c"><b data-k="busca"></b><small data-k="pista"></small><small class="fs-cond" data-k="cond"></small></span><i data-k="barra"></i>';
    visorEl = document.createElement('div'); visorEl.id = 'fs-visor'; visorEl.hidden = true;
    visorEl.innerHTML = '<div class="fs-marco"></div><div class="fs-vtx" data-k="vtx"></div><div class="fs-est" data-k="est" role="img">' + ESTRELLA.repeat(3) + '</div><button type="button" data-a="cerrar"></button>';
    fotoEl = document.createElement('button'); fotoEl.type = 'button'; fotoEl.id = 'fs-foto'; fotoEl.hidden = true; fotoEl.dataset.a = 'foto';
    flashEl = document.createElement('div'); flashEl.id = 'fs-flash'; flashEl.setAttribute('aria-hidden', 'true');
    estEl = document.createElement('div'); estEl.id = 'fs-est'; estEl.hidden = true; estEl.setAttribute('aria-hidden', 'true');
    finEl = document.createElement('div'); finEl.id = 'fs-fin'; finEl.hidden = true; finEl.tabIndex = -1; finEl.setAttribute('role', 'dialog'); finEl.setAttribute('aria-modal', 'true'); finEl.setAttribute('aria-labelledby', 'fs-fin-t');
    finEl.innerHTML = '<h2 id="fs-fin-t" data-k="ft"></h2><div class="fs-gran">' + ESTRELLA + '<span data-k="fn"></span></div><p data-k="fmsg" aria-live="polite"></p><p class="fs-med" data-k="fmed"></p><div class="fs-rollo" data-k="frollo"></div><p class="fs-det" data-k="fdet"></p><div class="fs-bots"><button type="button" data-a="otra"></button><button type="button" class="salir" data-a="salir"></button></div>';
    const clic = e => {
      const b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return; e.preventDefault();
      const a = b.dataset.a; if (a === 'otra') jugar(); else if (a === 'salir') salir(); else if (a === 'cerrar') cerrarCam(); else if (a === 'foto') { disparar(); b.blur(); }
    };
    for (const el of [hudEl, visorEl, finEl, fotoEl]) { el.addEventListener('click', clic); document.body.appendChild(el); }
    document.body.appendChild(cartaEl); document.body.appendChild(flashEl); document.body.appendChild(estEl);
  }
  let fotoEl = null;
  const q = (el, k) => el.querySelector('[data-k="' + k + '"]');
  function pintarHud() {
    if (!hudEl) return;
    const r = q(hudEl, 'r'); r.textContent = reloj(E.reloj); r.classList.toggle('poco', E.reloj <= 10);
    q(hudEl, 'p').textContent = String(E.estrellas);
    q(hudEl, 'p').parentNode.setAttribute('aria-label', L(`${E.estrellas} estrellas`, `${E.estrellas} stars`));
    q(hudEl, 'rec').textContent = E.mejor && innerWidth >= 600 ? L('Récord ', 'Best ') + E.mejor : '';
    hudEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
    if (cartaEl && carta.tipo) { const b = q(cartaEl, 'barra'), f = clamp(carta.t / CARTA); b.style.transform = 'scaleX(' + f.toFixed(3) + ')'; b.classList.toggle('poco', carta.t <= 6); }
    if (fotoEl) { // solo cambia el texto, y solo si cambia (antes se rehacía el SVG 4 veces por segundo y un clic lento podía perderse)
      const tx = E.cam ? L('¡Foto!', 'Snap!') : L('Cámara', 'Camera');
      if (!fotoEl.firstChild) fotoEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z" fill="#3b2a14"/><circle cx="12" cy="13" r="3.6" fill="#ffd23f"/></svg><span></span>';
      if (fotoEl.lastChild.textContent !== tx) fotoEl.lastChild.textContent = tx;
    }
  }
  function pintarCarta() {
    if (!cartaEl) return;
    if (!carta.tipo) { q(cartaEl, 'ic').innerHTML = ''; q(cartaEl, 'busca').textContent = L('Buscando animales…', 'Looking for animals…'); q(cartaEl, 'pista').textContent = ''; q(cartaEl, 'cond').textContent = ''; return; }
    q(cartaEl, 'ic').innerHTML = icono(carta.tipo.sil);
    q(cartaEl, 'busca').textContent = L('Busca: ', 'Find: ') + carta.nombre;
    q(cartaEl, 'pista').textContent = carta.pista;
    q(cartaEl, 'cond').textContent = carta.cond ? L('Foto: ', 'Photo: ') + textoCond(carta.cond) : '';
  }
  function pintarVisor() {
    if (!visorEl) return;
    const v = E.fase === 'juego' && E.cam && !cargando(); if (visorEl.hidden === v) visorEl.hidden = !v;
    const s = Math.max(0, E.vivo), ics = q(visorEl, 'est').querySelectorAll('svg');
    for (let i = 0; i < 3; i++) ics[i].classList.toggle('on', i < s);
    visorEl.classList.toggle('s3', s === 3);
    q(visorEl, 'est').setAttribute('aria-label', L(`${s} de 3 estrellas`, `${s} of 3 stars`));
    const t = carta.tipo;
    const i = vtxIdx(s);
    q(visorEl, 'vtx').textContent = i === 0 ? '' : i === 1 ? L('Mira hacia el animal: la cámara te ayuda', 'Face the animal: the camera helps you') : i === 2 ? L('Acércate despacio…', 'Get closer, slowly…') : i === 3 ? L('Quieta…', 'Hold still…') : i === 4 ? L('Se escondió: espera quieta', 'It hid: wait, keep still') : i === 5 ? L('¡Ahora!', 'Now!')
      : i === 7 ? L('No se ve: vuela bajo sobre el agua', "Can't see it: fly low over the water") : i === 8 ? L('Falta: ', 'Needed: ') + textoCond(carta.cond) : i === 9 ? L('Un momento…', 'One moment…') : L('Al centro…', 'To the center…');
    const bc = visorEl.querySelector('[data-a="cerrar"]'); bc.textContent = '✕'; bc.setAttribute('aria-label', L('Cerrar la cámara', 'Close the camera'));
    pintarHud();
  }
  // qué dice el visor (0 nada · 1 busca · 2 acércate · 3 quieta · 4 escondido · 5 ¡ahora! · 6 al centro · 7 el pez no se ve ·
  // 8 falta la condición · 9 un momento, recargando); solo se repinta si cambia
  function vtxIdx(s) { const t = carta.tipo; return !E.cam || !t ? 0 : E.nopT > 0 ? 9 : carta.vivo && o1.nove ? 7 : !carta.vivo || !MED.enMarco ? 1 : MED.d > t.dMax || MED.cerca < 0.45 ? 2 : MED.s0 && !MED.cond ? 8 : MED.quieta < 0.8 ? 3 : o1.oculto ? 4 : s === 3 ? 5 : 6; }
  function aviso(txt, cls) { if (!hudEl) return; const m = q(hudEl, 'msg'); m.textContent = txt; m.className = cls || ''; E.msgT = 2; }
  let flashN = 0; // cuántos destellos van (lo lee la prueba)
  function flash() {
    if (!flashEl || G.quiet || reducido()) return; // con «Reducir movimiento», solo el clic
    flashN++; flashEl.style.transition = 'none'; flashEl.style.opacity = '0.7'; void flashEl.offsetWidth; flashEl.style.transition = ''; flashEl.style.opacity = '0';
  }
  function estampa(t, s) {
    if (!estEl) return;
    estEl.innerHTML = icono(t.sil) + '<span class="fs-es">' + ESTRELLA.repeat(s) + '</span><span></span>';
    estEl.lastChild.textContent = carta.nombre;
    estEl.hidden = false; E.estT = 1.3;
  }
  const medalla = p => (p >= MEDALLA.oro ? 'oro' : p >= MEDALLA.plata ? 'plata' : p >= MEDALLA.bronce ? 'bronce' : '');
  const perfecto = () => E.fotos >= 3 && E.tres === E.fotos;
  function pintarFin() {
    if (!finEl) return;
    const n = E.estrellas, m = medalla(n);
    q(finEl, 'ft').textContent = perfecto() ? L('¡Rollo perfecto!', 'Perfect roll!') : L('¡Rollo terminado!', 'Roll finished!');
    q(finEl, 'fn').textContent = String(n);
    q(finEl, 'fmsg').textContent = E.nuevo ? L(`¡Nuevo récord: ${n} estrellas!`, `New record: ${n} stars!`)
      : n > 0 ? L(`Hiciste ${n} estrellas. Récord: ${E.mejor}`, `You got ${n} stars. Best: ${E.mejor}`) : L('¡Casi! Sigue la flecha, abre la cámara y encuadra al animal', 'So close! Follow the arrow, open the camera and frame the animal');
    q(finEl, 'fmed').textContent = m === 'oro' ? L('Medalla de oro', 'Gold medal') : m === 'plata' ? L('Medalla de plata', 'Silver medal') : m === 'bronce' ? L('Medalla de bronce', 'Bronze medal') : '';
    let h = ''; for (let i = 0; i < E.nr; i++) h += '<span>' + icono(rollo[i].sil) + '★'.repeat(rollo[i].s) + '</span>';
    q(finEl, 'frollo').innerHTML = h;
    q(finEl, 'fdet').textContent = L(`Fotos: ${E.fotos} · De 3 estrellas: ${E.tres}`, `Photos: ${E.fotos} · 3-star: ${E.tres}`) + (E.fichas ? L(` · Fichas nuevas: ${E.fichas}`, ` · New cards: ${E.fichas}`) : '');
    finEl.querySelector('[data-a="otra"]').textContent = L('Otra vez', 'Play again');
    finEl.querySelector('[data-a="salir"]').textContent = L('Salir', 'Exit');
  }

  // ---------- Partida ----------
  function jugar(o) {
    o = o || {};
    azarS = o.semilla || 0;
    montar();
    const rec = leerRec();
    Object.assign(E, { fase: 'juego', t: 0, reloj: DUR, k: 0, estrellas: 0, fotos: 0, tres: 0, nr: 0, cam: false, camT: 0, recarga: 0, msgT: 0, estT: 0, avisos: 0, medirT: 0, buscarT: 1, vivo: -1, vcode: -1,
      x0: S.pos.x, z0: S.pos.z, ux: 1e9, uz: 1e9, ultimo: '', nuevo: false, finP: 0, fichas: 0,
      mejor: rec ? rec.mejor : 0, perfecto: rec && Number.isInteger(rec.perfecto) ? rec.perfecto : 0, jugadas: rec && Number.isInteger(rec.jugadas) ? rec.jugadas : 0 });
    camara(false); document.body.classList.remove('foto-cam');
    try { if (G.pausa && G.pausa.set) G.pausa.set('foto', false); } catch (e) { /* sin pausa */ }
    if (G.interaccion && G.interaccion.modo !== MODO) { modo0 = G.interaccion.modo; G.interaccion.modo = MODO; }
    finEl.hidden = true; estEl.hidden = true; q(hudEl, 'msg').textContent = '';
    document.body.classList.add('foto-on'); document.body.classList.remove('foto-fin');
    nuevaCarta(); pintarCarta(); pintarHud(); verHud();
    aviso(L('Encuentra al animal y sácale su mejor foto', 'Find the animal and take its best photo'), 'bien'); E.msgT = 4;
    sonar('boton');
    return true;
  }
  let logroId = 0;
  function fin() {
    if (E.fase !== 'juego') return;
    cerrarCam();
    E.fase = 'fin'; E.finP = performance.now() / 1000; E.reloj = 0;
    E.jugadas++;
    E.nuevo = E.estrellas > E.mejor; if (E.nuevo) E.mejor = E.estrellas;
    if (perfecto()) E.perfecto++;
    guardarRec(E.mejor, E.perfecto, E.jugadas);
    try { G.emit('record', { modo: 'foto', puntos: E.estrellas, fotos: E.fotos, perfecto: perfecto() }); } catch (e) { /* */ }
    sonar('panel_final'); if (E.nuevo && E.estrellas > 0) logroId = setTimeout(() => { logroId = 0; if (E.fase === 'fin') sonar('logro'); }, 700);
    pintarHud(); pintarFin(); finEl.hidden = false; hudEl.hidden = true; cartaEl.hidden = true; estEl.hidden = true; fotoEl.hidden = true; q(hudEl, 'msg').textContent = '';
    document.body.classList.add('foto-fin');
    try { if (G.pausa && G.pausa.set) G.pausa.set('foto', true); } catch (e) { /* sin pausa */ } // panel modal: el mundo se congela detrás
    // el foco va al panel (no a «Otra vez»): una tecla de los últimos segundos no arranca otra partida sin ver el resultado
    setTimeout(() => { try { if (E.fase === 'fin') finEl.focus({ preventScroll: true }); } catch (e) { /* */ } }, 0);
  }
  const activo = () => E.fase !== 'nada';
  // Durante la pantalla de carga (pausa 'carga') el HUD no sale encima: aparece cuando el mundo ya se ve
  const cargando = () => { try { return !!(G.pausa && G.pausa.motivos && G.pausa.motivos.has('carga')); } catch (e) { return false; } };
  function verHud() {
    if (!hudEl) return;
    const v = E.fase === 'juego' && !cargando();
    if (hudEl.hidden === v) hudEl.hidden = !v;
    if (cartaEl.hidden === v) cartaEl.hidden = !v;
    if (fotoEl.hidden === v) fotoEl.hidden = !v;
    const vv = v && E.cam; if (visorEl.hidden === vv) visorEl.hidden = !vv;
  }
  function salir() {
    if (!activo()) return false;
    cerrarCam();
    E.fase = 'nada'; carta.tipo = null; carta.vivo = false;
    if (logroId) { clearTimeout(logroId); logroId = 0; }
    if (G.interaccion && G.interaccion.modo === MODO) G.interaccion.modo = modo0; modo0 = null;
    if (hudEl) {
      for (const el of [hudEl, cartaEl, visorEl, finEl, estEl, fotoEl]) el.hidden = true;
      for (const el of [hudEl, cartaEl, finEl]) { el.querySelectorAll('[data-k]').forEach(x => { if (x.dataset.k !== 'barra') x.textContent = ''; }); el.querySelectorAll('button').forEach(b => { b.textContent = ''; }); } // sin texto viejo (ni en otro idioma)
    }
    document.body.classList.remove('foto-on', 'foto-fin', 'foto-cam');
    try { if (G.pausa && G.pausa.set) G.pausa.set('foto', false); } catch (e) { /* sin pausa */ }
    return true;
  }
  addEventListener('keydown', e => {
    if (!activo()) return;
    if (e.key === 'Escape') {
      if (e.repeat || (G.ui && G.ui.cardOpen)) return; // una tarjeta abierta encima se cierra primero
      e.preventDefault(); e.stopImmediatePropagation(); if (E.cam) cerrarCam(); else salir(); return; // con la cámara abierta, Esc solo la cierra
    }
    if (E.fase === 'fin') { // el panel final es modal: las teclas del mundo no pasan; Tab, Enter y Espacio van a sus botones (no en el primer segundo)
      if (e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
      const boton = (e.key === 'Enter' || e.key === ' ') && performance.now() / 1000 - E.finP > 1 && e.target && e.target.closest && e.target.closest('#fs-fin button');
      e.stopImmediatePropagation(); if (!boton) e.preventDefault();
    }
  }, true);
  addEventListener('resize', () => { if (activo()) pintarHud(); });

  // ---------- Prueba ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const q0 = G.quiet, rec0 = (() => { try { return localStorage.getItem(ALM); } catch (e) { return null; } })(), pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
    const m = MV(), mv0 = { speed: m.speed, flying: m.flying }, vy0 = S.vy;
    const C = G.camara && G.camara.CAM, camD0 = C ? [C.dist, C.distFly] : null;
    const cam = R.camera, fwd = new THREE.Vector3();
    const tecla = k => { const ev = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }); dispatchEvent(ev); dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true })); return ev; }; // con su keyup: que input.js no se quede con teclas pulsadas para las pruebas siguientes
    // Un animal de prueba delante de la cámara, a d m de Vittata (y otro al lado para «dos en el marco»)
    const sitio = { x: 0, y: 0, z: 0, oc: false, hay: true, dos: false, nove: false, sin: null, solo: null };
    const K = G.camara, yaw0 = K ? K.yaw : 0, fovB0 = K ? K.fovBonus : 0;
    const ponerDelante = (d, lado) => {
      cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert(); cam.getWorldDirection(fwd);
      S.pos.x = cam.position.x + fwd.x * 4; S.pos.y = cam.position.y + fwd.y * 4 - 0.6; S.pos.z = cam.position.z + fwd.z * 4;
      sitio.x = cam.position.x + fwd.x * (4 + d) + (lado || 0); sitio.y = cam.position.y + fwd.y * (4 + d); sitio.z = cam.position.z + fwd.z * (4 + d);
    };
    const quieta = () => { m.speed = 0; m.flying = false; S.vy = 0; };
    G.quiet = true;
    try {
      try { localStorage.removeItem(ALM); } catch (e) { /* */ }
      check('Las funciones «dónde hay uno ahora» existen y no fallan (fauna, ríos y cotorras residentes)', (!G.fauna || (typeof G.fauna.cerca === 'function' && (G.fauna.cerca('boa', 0, 0, o1, o2) === null || o1.x === o1.x))) &&
        (!G.rioVivo || (typeof G.rioVivo.cerca === 'function' && [null, o1].includes(G.rioVivo.cerca('dajao', S.pos.x, S.pos.z, o1, o2)))) &&
        (!G.residentes || (typeof G.residentes.cerca === 'function' && [null, o1].includes(G.residentes.cerca(S.pos.x, S.pos.z, o1, o2)))), [!!G.fauna, !!G.rioVivo, !!G.residentes].join(','));
      prueba = (t, sp, a, b) => {
        if (!sitio.hay || (sitio.sin && sitio.sin.includes(t.id)) || (sitio.solo && !sitio.solo.includes(t.id))) return null;
        a.x = sitio.x; a.y = sitio.y; a.z = sitio.z; a.oculto = sitio.oc; a.sp = 'vittata'; a.nove = sitio.nove;
        if (b) { b.ok = sitio.dos; b.x = sitio.x + 0.6; b.y = sitio.y; b.z = sitio.z; }
        return a;
      };
      ponerDelante(4);
      // En el mundo de verdad, cerca del punto de salida no suele haber cotorras residentes ni la boa: la primera tarjeta es
      // entonces la más fácil que haya (nunca el lagartijo, que se esconde) y con estrellas generosas
      sitio.sin = ['cotorra', 'boa'];
      { const ids = []; for (const sem of [5, 7, 11, 13, 17]) { jugar({ semilla: sem }); ids.push(carta.tipo && carta.tipo.id); salir(); }
        check('Sin cotorras ni boa en la zona, la primera tarjeta es de las más fáciles (nunca el lagartijo) y más generosa', ids.every(id => id === 'mariposa' || id === 'coqui') && (jugar({ semilla: 5 }), carta.facil), ids.join(','));
        salir(); }
      sitio.sin = ['cotorra', 'boa', 'mariposa', 'coqui']; jugar({ semilla: 5 });
      check('…y los peces del río antes que el lagartijo', carta.tipo && carta.tipo.fuente === 'rio', carta.tipo && carta.tipo.id); salir();
      sitio.sin = null;
      jugar({ semilla: 5 });
      const hb = hudEl.querySelector('[data-a="salir"]').getBoundingClientRect(), cr = cartaEl.getBoundingClientRect();
      check('Se abre con el reloj (2:00), las estrellas, «Salir» de ≥ 44 px y la tarjeta «Busca: …» con su pista', activo() && !hudEl.hidden && !cartaEl.hidden && finEl.hidden && q(hudEl, 'r').textContent === '2:00' && q(hudEl, 'p').textContent === '0' && hb.height >= 44 && /^Busca: \S/.test(q(cartaEl, 'busca').textContent) && /^Pista: /.test(q(cartaEl, 'pista').textContent) && document.body.classList.contains('foto-on'),
        q(cartaEl, 'busca').textContent + ' · ' + q(cartaEl, 'pista').textContent);
      check('Las primeras tarjetas son de animales grandes y quietos (cotorras o la boa)', carta.tipo && carta.tipo.nivel === 1, carta.tipo && carta.tipo.id);
      { const hr = hudEl.getBoundingClientRect(); check('El HUD y la tarjeta caben arriba (la tarjeta, 2 líneas como mucho)', hr.left >= 0 && hr.right <= innerWidth && hr.top >= 0 && hr.height <= 64 && cr.left >= 0 && cr.right <= innerWidth && cr.height <= 64, `${innerWidth}×${innerHeight} · HUD ${Math.round(hr.width)}×${Math.round(hr.height)} · tarjeta ${Math.round(cr.width)}×${Math.round(cr.height)}`); }
      { const mr = q(hudEl, 'msg').getBoundingClientRect(), choca = (a, b) => a.width > 0 && b.width > 0 && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        const otros = ['minimapa', 'sys'].map(id => document.getElementById(id)).filter(el => el && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none').map(el => el.getBoundingClientRect());
        const mm = document.getElementById('minimapa'), mmr = mm && getComputedStyle(mm).display !== 'none' ? mm.getBoundingClientRect() : null;
        check('El aviso no tapa la tarjeta, el minimapa ni los botones del lateral, y la tarjeta no tapa el minimapa', !choca(mr, cr) && otros.every(r => !choca(mr, r)) && (!mmr || !choca(cr, mmr)), `${innerWidth}×${innerHeight} · aviso ${Math.round(mr.left)},${Math.round(mr.top)} ${Math.round(mr.width)}×${Math.round(mr.height)}`); }
      check('La historia no se mezcla: cuenta como actividad (los avisos esperan) y el aviso, la pista de Acción, la misión y los bocadillos no se ven',
        (!G.menuModos || !G.menuModos.ocupado || G.menuModos.ocupado()) && ['toast', 'prompt', 'quest', 'inv-cuenta', 'bocadillos'].every(id => { const el = document.getElementById(id); return !el || getComputedStyle(el).visibility === 'hidden'; }));
      check('La flecha y la estrella del minimapa señalan al mismo animal', (() => { const g0 = G.fx && G.fx.guide; let visto = null; if (g0) { G.fx.guide = t => { visto = t; }; try { guiar(); } finally { G.fx.guide = g0; } } return (!g0 || (visto && visto.x === sitio.x && visto.z === sitio.z)) && (!G.minimapa || !G.minimapa.marcadores || G.minimapa.marcadores().some(k => k.tipo === 'obj' && k.x === guia.x && k.z === guia.z)); })());
      if (G.pausa && G.pausa.set && G.pausa.motivos) {
        const yaCarga = G.pausa.motivos.has('carga');
        G.pausa.set('carga', true); verHud(); const tapado = hudEl.hidden && cartaEl.hidden;
        if (!yaCarga) G.pausa.set('carga', false); verHud();
        check('Con la pantalla de carga el HUD espera y luego sale', tapado && (yaCarga || !hudEl.hidden));
      }
      check('El botón Acción pasa a decir «Foto», con el icono de la cámara', G.interaccion && G.interaccion.modo === MODO && MODO.verbo === 'Foto' && (!G.input || !G.input.actBtn || /svg/.test(getComputedStyle(G.input.actBtn).getPropertyValue('--icon'))));
      { const sv = fotoEl.firstChild; pintarHud(); pintarHud(); check('El botón «Cámara» no se rehace en cada repintado (el clic no se pierde)', !!sv && fotoEl.firstChild === sv && /Cámara/.test(fotoEl.textContent)); }
      // Teclado: Acción (E) abre la cámara y, un momento después, dispara
      quieta(); ponerDelante(4); const t0 = carta.tipo, rel0 = E.reloj;
      tecla('e');
      const abierta = E.cam && !visorEl.hidden && document.body.classList.contains('foto-cam');
      const pv = G.actores && G.actores.player3D && G.actores.player3D.root, psh = G.actores && G.actores.pShadow;
      check('Con teclado: Acción abre la cámara (marco y estrellas en vivo), la vista se acerca (y hace zoom) y Vittata no tapa el marco, ni su sombra', abierta && (!C || C.distFly < camD0[1]) && (!pv || !pv.visible) && (!psh || !psh.visible) && (!K || K.fovBonus === fovB0 - carta.tipo.zoom), E.cam + ' · fovBonus ' + (K && K.fovBonus));
      check('Con la cámara abierta, la flecha de guía no entra en el marco', (() => { const g0 = G.fx && G.fx.guide; if (!g0) return true; let visto = 1; G.fx.guide = t => { visto = t; }; try { guiar(); } finally { G.fx.guide = g0; } return visto === null; })());
      quieta(); paso(0.02); quieta(); paso(0.4);
      const vivas = q(visorEl, 'est').querySelectorAll('svg.on').length;
      check('Centrado, cerca y quieta: se encienden las 3 estrellas en vivo', E.vivo === 3 && vivas === 3, E.vivo + ' · centro ' + MED.centro.toFixed(2) + ' cerca ' + MED.cerca.toFixed(2) + ' quieta ' + MED.quieta.toFixed(2));
      quieta(); tecla('e');
      check('…y otra vez Acción: «¡Fotaza!», +3 estrellas, +10 s, sale la siguiente tarjeta y Vittata vuelve a verse (con su sombra y sin zoom)', (!pv || pv.visible) && (!psh || psh.visible) && (!K || K.fovBonus === fovB0) && E.estrellas === 3 && E.fotos === 1 && /Fotaza/.test(q(hudEl, 'msg').textContent) && Math.abs(E.reloj - rel0 - BONO) < 0.5 && E.k === 2 && !E.cam && !estEl.hidden, q(hudEl, 'msg').textContent + ' · ' + t0.id + ' → ' + (carta.tipo && carta.tipo.id));
      // Táctil: el botón Acción de siempre
      const act = G.input && G.input.actBtn;
      if (act) {
        const toque = () => act.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
        E.recarga = 0; quieta(); ponerDelante(4); toque(); quieta(); paso(0.4); quieta(); toque();
        check('Con táctil: el botón Acción abre la cámara y dispara (+1 foto)', E.fotos === 2 && E.estrellas >= 4, E.fotos + ' · ' + E.estrellas);
      }
      // Machacar no sirve: fuera del marco, 20 toques seguidos son una sola foto fallida
      E.recarga = 0; quieta(); ponerDelante(4, 60); disparar(); paso(0.4);
      const f0 = E.fotos, fl0 = flashN; let clics = 0, momento = false; const p0 = G.audio && G.audio.play; G.quiet = false; if (G.audio) G.audio.play = n => { if (n === 'clic') clics++; };
      try { for (let i = 0; i < 20; i++) { disparar(); paso(0.016); if (/Un momento/.test(q(visorEl, 'vtx').textContent)) momento = true; } } finally { if (G.audio) G.audio.play = p0; G.quiet = true; }
      check('Machacar no sirve: con el animal fuera del marco no suma, «¡Casi!», y la recarga deja una sola foto (y un flash) en 20 toques', E.fotos === f0 && (!G.audio || clics === 1) && flashN === fl0 + 1 && /Casi/.test(q(hudEl, 'msg').textContent), clics + ' · flash ' + (flashN - fl0) + ' · ' + q(hudEl, 'msg').textContent);
      check('…y tocar durante la recarga no queda mudo: el visor dice «Un momento…»', momento);
      // Lejos: «Acércate despacio…»
      E.recarga = 0; E.nopT = 0; quieta(); ponerDelante(carta.tipo.dMax + 6); paso(0.02);
      check('Muy lejos el visor pide «Acércate despacio…» y no hay estrellas', E.vivo === 0 && /Acércate despacio/.test(q(visorEl, 'vtx').textContent), q(visorEl, 'vtx').textContent);
      // Quieta pero lejos (no movida): 1 estrella y el aviso dice qué mejorar
      E.recarga = 0; quieta(); ponerDelante(carta.tipo.dMax - 0.5); paso(0.02); quieta(); disparar();
      check('Quieta pero lejos: 1 estrella y «Un poco lejos» (no «Salió movida»)', /Un poco lejos/.test(q(hudEl, 'msg').textContent) && rollo[E.nr - 1].s === 1, q(hudEl, 'msg').textContent);
      // Encuadre asistido: el animal a 40° de la vista → la cámara gira hacia él y sube la vista; a la espalda, no hace nada
      if (K) {
        E.recarga = 0; quieta(); ponerDelante(4); abrirCam();
        const ang = Math.atan2(-(sitio.x - S.pos.x), -(sitio.z - S.pos.z)), dif = () => Math.abs(((ang - K.yaw) % TAU + TAU * 1.5) % TAU - Math.PI);
        sitio.y = o1.y = S.pos.y + 2.5; // asistir() mira o1 (sin paso() no se copia de sitio: se quedaba en la línea de la cámara y la inclinación pedida era 0) · en una rama, 2,5 m más alto que Vittata (medido desde ella, no desde la línea de la cámara: si otra prueba deja la cámara mirando abajo, el animal quedaba por debajo)
        K.yaw = ang + 0.7; const d0 = dif(), i0 = K.inclina; for (let i = 0; i < 30; i++) asistir(1 / 30);
        const giro = dif() < d0 * 0.2, sube = K.inclina > i0 + 0.05;
        K.yaw = ang + 2.6; const y0 = K.yaw; asistir(0.1); const espalda = K.yaw === y0;
        K.yaw = ang; cerrarCam();
        check('Encuadre asistido: con el animal más o menos delante, la vista gira hacia él y sube a la rama; a la espalda, nada', giro && sube && espalda && (!C || C.dist === camD0[0]), `giro ${d0.toFixed(2)}→${(+dif()).toFixed(2)} · inclina ${i0.toFixed(2)}→${(+K.inclina).toFixed(2)}`);
      }
      // Foto pedida mientras la cámara se abre: no se pierde, sale en cuanto está lista
      E.recarga = 0; quieta(); ponerDelante(4); const fP = E.fotos; disparar(); disparar(); quieta(); paso(0.2); quieta(); const aun = E.fotos === fP; paso(0.2);
      check('Pulsar Foto justo al abrir la cámara no se pierde: la foto sale en cuanto está lista', aun && E.fotos === fP + 1, E.fotos - fP);
      // Un pez que no se ve (visor del río apagado) no da foto y el visor dice cómo verlo
      E.recarga = 0; quieta(); ponerDelante(4); sitio.nove = true; abrirCam(); quieta(); paso(0.4); quieta(); const fN = E.fotos, vtxN = q(visorEl, 'vtx').textContent; disparar();
      check('Un pez que no se ve no da foto: 0 estrellas y «No se ve: vuela bajo sobre el agua»', E.vivo === 0 && E.fotos === fN && /vuela bajo sobre el agua/.test(vtxN) && /No se ve/.test(q(hudEl, 'msg').textContent), vtxN + ' · ' + q(hudEl, 'msg').textContent);
      sitio.nove = false;
      // Foto rápida y movida: 1 estrella
      E.recarga = 0; ponerDelante(carta.tipo.dMax - 1); m.speed = 7; paso(0.02); m.speed = 7; disparar();
      check('Rápida y de lejos: 1 estrella, «Salió movida»', /Salió movida/.test(q(hudEl, 'msg').textContent) && rollo[E.nr - 1].s === 1, q(hudEl, 'msg').textContent);
      // El lagartijo escondido detrás del tronco: como mucho 1 estrella
      E.recarga = 0; carta.cond = ''; quieta(); ponerDelante(2); sitio.oc = true; abrirCam(); quieta(); paso(0.4); quieta();
      check('Escondido (el lagartijo detrás del tronco) no da más de 1 estrella', E.vivo === 1, E.vivo);
      sitio.oc = false; cerrarCam();
      // La tarjeta se acaba: «¡Se escapó!» y otra, sin castigo
      const eA = E.estrellas, kA = E.k; carta.t = 0.01; paso(0.05);
      check('Si se acaba la tarjeta (25 s): «¡Se escapó! Otra tarjeta», sin perder nada', E.estrellas === eA && E.k === kA + 1 && /Se escapó/.test(q(hudEl, 'msg').textContent) && Math.abs(carta.t - CARTA) < 0.1, q(hudEl, 'msg').textContent);
      // Tarjeta 6 en adelante: foto con condición
      E.k = 6; nuevaCarta(); carta.cond = 'vuela'; pintarCarta();
      E.recarga = 0; quieta(); ponerDelante(4); disparar(); quieta(); paso(0.4); quieta(); const fC = E.fotos; disparar();
      const condTxt = q(cartaEl, 'cond').textContent;
      check('Desde la tarjeta 6, foto con condición: «En vuelo» sin volar no vale («Falta: En vuelo») y no castiga', E.fotos === fC && /En vuelo/.test(condTxt) && /Falta: En vuelo/.test(q(hudEl, 'msg').textContent), condTxt + ' · ' + q(hudEl, 'msg').textContent);
      E.recarga = 0; quieta(); m.flying = true; paso(0.02); disparar(); m.flying = false;
      check('…y volando, sí', E.fotos === fC + 1, E.fotos);
      E.k = 7; nuevaCarta(); carta.cond = 'dos'; sitio.dos = false; E.recarga = 0; quieta(); ponerDelante(4); disparar(); quieta(); paso(0.4); quieta(); const fD = E.fotos; disparar();
      const sinDos = E.fotos === fD; E.recarga = 0; sitio.dos = true; quieta(); paso(0.02); disparar(); sitio.dos = false;
      check('«Dos en el marco» pide dos animales dentro del marco', sinDos && E.fotos === fD + 1, E.fotos);
      // Nunca una condición imposible; sin la condición no se encienden las estrellas en vivo
      sitio.solo = ['dajao']; E.k = 6; nuevaCarta(); const condRio = carta.cond; sitio.solo = null;
      check('Con un pez, nunca «Desde el suelo» (solo se ve volando bajo)', carta.tipo && carta.tipo.id === 'dajao' && condRio === 'vuela', condRio);
      E.recarga = 0; quieta(); ponerDelante(4); abrirCam(); quieta(); paso(0.4); quieta();
      check('Sin la condición, el visor no enciende estrellas y dice «Falta: En vuelo»', E.vivo === 0 && /Falta: En vuelo/.test(q(visorEl, 'vtx').textContent), q(visorEl, 'vtx').textContent);
      cerrarCam();
      { const ps0 = m.posado; m.posado = true; const enRama = enSuelo(); m.posado = ps0; check('«Desde el suelo» no vale posada en una rama', !enRama); }
      // La ficha nueva dice en qué sección está, y solo si se puede ver; la cotorra suena «descubrir» una sola vez (la pone el Álbum)
      { const au = G.audio, p2 = au && au.play, sons = [];
        apuntarPrueba = t => (t.fuente === 'residentes' ? L('el Álbum', 'the Album') : '');
        sitio.solo = ['cotorra']; E.k = 3; nuevaCarta(); sitio.solo = null; carta.cond = '';
        try { if (au) au.play = n => { sons.push(n); }; G.quiet = false; E.recarga = 0; quieta(); ponerDelante(4); abrirCam(); quieta(); paso(0.4); quieta(); disparar(); }
        finally { G.quiet = true; if (au) au.play = p2; apuntarPrueba = null; }
        check('Primera foto de una cotorra: «¡Nueva en el Álbum!» y el minijuego no repite «descubrir» (ya lo suena el Álbum)', /Nueva en el Álbum/.test(q(hudEl, 'msg').textContent) && !sons.includes('descubrir') && E.fichas >= 1, q(hudEl, 'msg').textContent + ' · ' + sons.join(','));
        const esp = (G.pack && G.pack.fauna && G.pack.fauna.especies) || [];
        check('Las fichas ocultas del Diario (las «parcial», como el lagartijo y la mariposa) no se anuncian como nuevas', esp.every(e => fichaVisible(e.id) === (e.estado === 'verificado')) && esp.filter(e => e.estado !== 'verificado').every(e => !fichaVisible(e.id)), esp.map(e => e.id + ':' + e.estado).join(','));
      }
      if (G.rioVivo && G.rioVivo.bancos && G.rioVivo.cerca) { // ríos: un banco recién activado (peces sin colocar) da su centro una sola vez
        const B = G.rioVivo.bancos, fb = { id: 'dajao', x: S.pos.x, z: S.pos.z, peces: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }] }, a = {}, b = {}; let r = null;
        B.push(fb); try { r = G.rioVivo.cerca('dajao', S.pos.x, S.pos.z, a, b); } finally { B.splice(B.indexOf(fb), 1); }
        check('Ríos: un banco con los peces sin colocar no cuenta como «dos en el marco» en el mismo punto', r === a && !(b.ok && b.x === a.x && b.z === a.z), JSON.stringify(b));
      }
      // Sin animal cerca: espera y busca, sin romperse
      sitio.hay = false; carta.t = 0.01; paso(0.05);
      check('Sin animales a la vista no se rompe: «Buscando animales…»', !carta.tipo && /Buscando animales/.test(q(cartaEl, 'busca').textContent));
      sitio.hay = true; E.buscarT = 0; paso(0.02);
      check('…y en cuanto hay uno, sale su tarjeta', !!carta.tipo);
      { // «Reducir movimiento»: sin flash ni chispas; los avisos importantes suenan
        const fx = G.fx, b0 = fx && fx.burst, au = G.audio, p1 = au && au.play; let chispas = 0; const sonidos = [];
        html.classList.add('mov-reducido'); const eR = E.estrellas, fR = E.fotos, nR = E.nr, kR = E.tres;
        try {
          if (fx) fx.burst = () => { chispas++; }; if (au) au.play = n => { sonidos.push(n); };
          G.quiet = false; carta.cond = '';
          const fl1 = flashN;
          E.recarga = 0; quieta(); ponerDelante(4); disparar(); quieta(); paso(0.4); quieta(); disparar();
          const op = flashN === fl1 ? '0' : '0.7';
          carta.t = 0.01; paso(0.05);
          const rr = E.reloj; E.reloj = 10.01; E.avisos = 0; paso(0.05);
          E.reloj = rr;
          check('Con «Reducir movimiento»: ni flash ni chispas en la fotaza, y «¡Se escapó!» y los últimos segundos suenan', chispas === 0 && op !== '0.7' && rollo[E.nr - 1].s === 3 && (!au || (sonidos.filter(n => n === 'aviso').length >= 2 && sonidos.includes('clic'))), 'chispas ' + chispas + ' · ' + sonidos.join(','));
        } finally { G.quiet = true; if (fx) fx.burst = b0; if (au) au.play = p1; html.classList.remove('mov-reducido'); E.estrellas = eR; E.fotos = fR; E.nr = nR; E.tres = kR; }
      }
      // El reloj termina: panel modal
      const total = E.estrellas, fotos = E.fotos; E.reloj = 0.01; paso(0.05);
      const fr = finEl.getBoundingClientRect(), bots = [...finEl.querySelectorAll('button')].map(b => b.getBoundingClientRect());
      check('El reloj termina: panel con estrellas, «¡Nuevo récord!», el rollo de fotos, «Otra vez» y «Salir»', E.fase === 'fin' && !finEl.hidden && hudEl.hidden && cartaEl.hidden && q(finEl, 'fn').textContent === String(total) && new RegExp('Nuevo récord: ' + total + ' estrellas').test(q(finEl, 'fmsg').textContent) && q(finEl, 'frollo').children.length === fotos && new RegExp('Fotos: ' + fotos).test(q(finEl, 'fdet').textContent), q(finEl, 'fmsg').textContent + ' · ' + q(finEl, 'fdet').textContent);
      check('Con el panel final no quedan pistas del mundo detrás (minimapa, pistas de vuelo ni los botones del lateral), ni la flecha', (() => { const g0 = G.fx && G.fx.guide; if (!g0) return true; let visto = 1; G.fx.guide = t => { visto = t; }; try { guiar(); } finally { G.fx.guide = g0; } return visto === null; })() && document.body.classList.contains('foto-fin') && ['minimapa', 'guia-hud', 'keyhint', 'sys'].every(id => { const el = document.getElementById(id); return !el || getComputedStyle(el).visibility === 'hidden'; }));
      check('El récord se guarda en este dispositivo', (() => { const r = leerRec(); return r && r.mejor === total && r.jugadas === 1; })(), JSON.stringify(leerRec()));
      check('Cabe en la pantalla: panel dentro y botones del final ≥ 54 px', bots.every(b => b.height >= 54 && b.width >= 54) && fr.left >= 0 && fr.right <= innerWidth && fr.top >= 0 && fr.bottom <= innerHeight, `${innerWidth}×${innerHeight} · ${Math.round(fr.width)}×${Math.round(fr.height)}`);
      await new Promise(r => setTimeout(r, 30));
      const tP = tecla('p'), tE = tecla('e');
      check('El panel es modal: el mundo queda en pausa, las teclas del mundo no pasan y el foco va al panel', (!G.pausa || !G.pausa.motivos || G.pausa.motivos.has('foto')) && tP.defaultPrevented && tE.defaultPrevented && E.fase === 'fin' && document.activeElement === finEl, document.activeElement && (document.activeElement.id || document.activeElement.tagName));
      const ae = G.aula && G.aula.aj;
      if (ae) {
        const idi0 = ae.idioma; ae.idioma = 'en'; pintarHud(); pintarFin(); pintarCarta(); E.cam = true; pintarVisor(); E.cam = false;
        const txt = hudEl.textContent + ' ' + finEl.textContent + ' ' + visorEl.textContent;
        check('En inglés no queda texto en español (Roll finished!, Play again, Exit, Photos)', /Roll finished!|Perfect roll!/.test(txt) && /Play again/.test(txt) && /Exit/.test(txt) && /Photos: \d/.test(txt) && !/[áéíóúñ¡]|Salir|Otra vez|Récord|Fotos|estrellas/.test(txt), txt.slice(0, 200));
        ae.idioma = idi0; pintarHud(); pintarFin(); pintarCarta(); pintarVisor();
      }
      finEl.querySelector('[data-a="otra"]').click();
      check('«Otra vez» empieza limpio (2:00, 0 estrellas, tarjeta nueva, sin panel, cámara ni pausa)', E.fase === 'juego' && E.estrellas === 0 && E.fotos === 0 && E.nr === 0 && E.k === 1 && finEl.hidden && !E.cam && q(hudEl, 'r').textContent === '2:00' && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('foto')));
      E.reloj = 0.01; paso(0.05);
      check('Sin estrellas, nunca castiga: «¡Casi!» y el récord sigue', /Casi/.test(q(finEl, 'fmsg').textContent) && leerRec().mejor === total && q(finEl, 'fmed').textContent === '', q(finEl, 'fmsg').textContent);
      finEl.querySelector('[data-a="salir"]').click();
      check('«Salir» lo quita todo (HUD, tarjeta, visor, panel, clases, pausa, Acción de siempre y cámara de siempre)', !activo() && hudEl.hidden && cartaEl.hidden && visorEl.hidden && finEl.hidden && !/foto-(on|fin|cam)/.test(document.body.className) && !(G.pausa && G.pausa.motivos && G.pausa.motivos.has('foto')) && (!G.interaccion || G.interaccion.modo !== MODO) && (!C || (C.dist === camD0[0] && C.distFly === camD0[1])));
      check('Sin mallas ni texturas nuevas en la escena', !R.scene.children.some(k => /^foto/.test(k.name || '')));
      jugar({ semilla: 3 }); disparar();
      const ev = tecla('Escape'), soloCam = activo() && !E.cam && visorEl.hidden && !hudEl.hidden && ev.defaultPrevented;
      const ev2 = tecla('Escape');
      check('Esc con la cámara abierta solo cierra la cámara (sigue la partida); otro Esc sale y devuelve la cámara', soloCam && !activo() && ev2.defaultPrevented && hudEl.hidden && visorEl.hidden && (!C || (C.dist === camD0[0] && C.distFly === camD0[1])));
      check('Sonidos que ya existen (clic, encaje, logro, aviso, flecha, descubrir, panel_final, boton)', !G.audio || !G.audio.has || ['clic', 'encaje', 'logro', 'aviso', 'flecha', 'descubrir', 'panel_final', 'boton'].every(n => G.audio.has(n)));
    } catch (e) { check('Sin errores', false, e && (e.stack || e.message)); }
    finally {
      salir(); prueba = null; apuntarPrueba = null; G.quiet = q0; if (K) { K.yaw = yaw0; K.fovBonus = fovB0; } azarS = 0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; m.speed = mv0.speed; m.flying = mv0.flying; S.vy = vy0;
      try { if (rec0 == null) localStorage.removeItem(ALM); else localStorage.setItem(ALM, rec0); } catch (e) { /* */ }
    }
    return { results: out, passed: out.filter(x => x.ok).length, total: out.length };
  }

  G.fotoApi = { jugar, salir, activo, paso, test, disparar,
    estado: () => ({ fase: E.fase, estrellas: E.estrellas, fotos: E.fotos, reloj: E.reloj, carta: carta.tipo ? carta.tipo.id : null, cam: E.cam, mejor: E.mejor }),
    objetivo: () => (E.fase === 'juego' && carta.tipo && carta.vivo ? guia : null), // lo lee el minimapa (minimapa.js objetivo()): la estrella marca el animal, como la flecha
    _dev: { E, carta, TIPOS } };
  return G.fotoApi;
};
