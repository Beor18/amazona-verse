/* Juego · Música y ambiente (todo sintetizado con WebAudio: sin archivos ni música de nadie)
   Carga perezosa: boot.js lo pide con AVE.assets.script tras el primer gesto del jugador (pointerdown o tecla), así no suma a la descarga inicial.
   window.AVMusica(G) devuelve la API y se guarda en G.musicaApi. No crea ningún AudioContext: usa el de src/engine/audio.js (G.audio.ctx), que el
   navegador solo deja sonar tras un gesto. Música y ambiente tienen su propio volumen y cuelgan del mismo master que los efectos, así que el botón
   «Sonido» del menú de pausa (G.audio.vol.muted) los calla sin más. Con el sonido apagado, la pestaña oculta o el volumen en 0, el bus se desconecta
   del master: WebAudio no procesa lo que no llega al destino, y el módulo no programa notas.

   MÚSICA (5 pistas, un planificador con tiempo de adelanto; cada pista tiene su compás, su tempo y sus propias voces):
   - alegre   · portada y creador. Sol mayor, 108 BPM, sabor caribeño: clave de son 3-2, güiro, congas, bajo de tumbao, cuatro rasgueado y marimba.
   - explora  · el mundo libre. Re mayor, 70 BPM: colchón suave, arpegio de pulsos, un flautín de vez en cuando.
   - retos    · Modo Retos (cuerpo con clase retos-on o G.retosApi.activo). La menor, 132 BPM: bombo, palmadas, clave, güiro en semicorcheas y gancho.
   - tension  · crecida (S.event) o lluvia sostenida. Re menor, 54 BPM: pedal grave, latido, gotas y un trueno lejano. Suave. Sale 5 s después.
   - final    · panel de fin de capítulo (#end). Re mayor, 64 BPM: cuerdas con vibrato, arpegio y una melodía que sube.
   Prioridad: final > portada o creador > retos > tensión > explora. Un cambio pide 0,7 s seguidos (un parpadeo no cambia nada) y los cambios son
   fundidos cruzados de 1,2 a 3,5 s; nadie pisa a nadie. Cada pista lleva su nivel para que todas suenen parecido (~0,05 de nivel medio).
   Armonías y melodías propias (escritas aquí, en notas MIDI); no copian ninguna canción.

   BANDA SONORA (C13): los temas de Kelvin (hechos con Suno) mandan sobre las pistas sintéticas. La tabla BANDA_SONORA (abajo) dice qué
   pista suena en cada momento del juego (momentos → pista) y, de cada tema, su archivo, nivel, punto de bucle y alternativa sintética.
   - exploracion · mundo libre (Aventura y Vuelo libre) y lluvia;  carrera · Retos: carrera contra las cotorras, río, banquete y su menú;
     criadero · el criadero abierto (la eclosión baja la música; su efecto va aparte, en los SFX);  tormenta · «¡Escapa de la tormenta!» y
     la crecida del capítulo 1;  arena · registrada para Amazona Arena (el modo aún no existe: nada la elige).
   - Portada, creador y final del capítulo siguen con sus pistas sintéticas (alegre y final).
   - Un tema se pide (streaming con <audio> + MediaElementSource) solo cuando toca, tras el primer gesto, y nunca en la descarga inicial.
     Mientras carga sigue lo que sonaba; si tarda más de esperaCarga, o falla, suena su alternativa sintética (y entra el tema al cargar).
   - Una pista a la vez: fundido cruzado de BANDA_SONORA.fundido s; el bucle es un fundido de igual potencia dentro del mismo tema
     (docs/equipo/BANDA_SONORA.md: puntos de bucle elegidos por similitud). Volver a un tema antes de «recordar» s sigue donde iba.

   AMBIENTE (capas siempre encendidas, con su nivel suavizado; se oye discreto):
   - aves de día (silbidos, trinos y, de vez en cuando, una cotorra) y coquíes de noche («co-quí» de un coro de ranas) más grillos;
   - el río (y el mar, más grave y con olas) según la cercanía al agua: 33 consultas a G.agua.levelAt cada 0,4 s;
   - viento según la altura sobre el suelo y sobre el mar.
   La hora sale de S.hora (0 a 24) si algún día el mundo tiene ciclo de día y noche (de día de 6:30 a 17:30, de noche de 19:00 a 5:00,
   con un atardecer y un amanecer suaves); mientras el cielo sea siempre de día, el ambiente es de día.
   Las ranas callan 9 s si suena el Simon de los coquíes (sonidos co, qui y chorus) para no confundir el juego. La música baja mientras habla la voz
   del Aula (gancho 'voz') y, a 0,6, mientras haya un diálogo abierto (G.dialogo.activo()).

   CPU: tres modos según G.renderer.calidad y el equipo. completo (escritorio): 28 voces y eco; ligero (pantalla táctil o 4 núcleos o menos): 8 voces,
   rasgueos de 2 notas, sin eco, sin vibrato; simple (calidad «bajo»): sin música, solo ambiente con 3 capas y sin paneo. Volver de «simple» tarda 15 s
   de calidad estable. Un fallo del módulo nunca llega al juego: a los 5 fallos se apaga solo.

   AJUSTES: sección «Música y ambiente» en el menú de pausa (dos deslizadores 0 a 100 en pasos de 5). Se guardan en la partida como los de
   accesibilidad: S.profile.mezcla = { musica, ambiente } (por defecto 55 y 50); «Comenzar de cero» y cargar una partida vieja conservan lo
   elegido en esta sesión; «Nuevo estudiante» lo olvida. No tocan el volumen de los efectos. Estilos propios dentro de este archivo.

   API: estado(), leer(), set(clave, valor), elegir(entradas, previa), evaluar(entradas, ms), simular(entradas|null) para oír una pista a mano
   (p. ej. AV.G.musicaApi.simular({ fin: true })), hora(h|null), calcularAmbiente(entradas), renderizar(pista, seg, modo), test().
   PRUEBAS: AV.musicaTest() (carga el módulo si hace falta). Sin altavoces: la lógica es pura y el sonido se comprueba con OfflineAudioContext. */
(function () {
  'use strict';

  // =====================================================================
  // Utilidades puras
  // =====================================================================
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const semilla = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const esObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  // 'paso:nota MIDI:duración en pasos' → { paso: [nota, duración] }
  const notas = s => { const o = {}; for (const x of s.split(' ')) { const [p, m, d] = x.split(':').map(Number); o[p] = [m, d]; } return o; };

  const DEF = { musica: 55, ambiente: 50 }; // volúmenes de fábrica (0 a 100)
  const nivelDe = (v, def) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v / 5) * 5, 0, 100) : def);
  const ganancia = pct => Math.pow(pct / 100, 2); // curva cuadrática: la mitad del deslizador es -12 dB

  // calidad «bajo» → solo ambiente simple; pantalla táctil o equipo pequeño → ligero; el resto → completo
  const modoDe = (nivel, tactil, nucleos) => (nivel === 'bajo' ? 'simple' : tactil || (nucleos && nucleos <= 4) ? 'ligero' : 'completo');

  // 0 de día … 1 de noche, con atardecer (17:30 a 19:00) y amanecer (5:00 a 6:30)
  const noche = h => (h >= 12 ? suave(17.5, 19, h) : 1 - suave(5, 6.5, h));

  // =====================================================================
  // BANDA SONORA: la tabla pista ↔ momentos (cámbiala aquí; docs/equipo/BANDA_SONORA.md explica cada campo)
  // =====================================================================
  const BANDA_SONORA = {
    fundido: 1.5,        // s del fundido cruzado entre dos pistas (de 1 a 2)
    fundidoBucle: 2.5,   // s del fundido de igual potencia en el punto de bucle (dentro del mismo tema)
    esperaCarga: 4,      // s que se espera a que un tema cargue antes de tocar su alternativa sintética
    recordar: 120,       // s: si se vuelve a un tema antes de esto, sigue donde iba; si no, empieza desde el principio
    eclosion: 0.35,      // factor de la música mientras un huevo eclosiona (el efecto de la eclosión no baja)
    // Temas de Kelvin (Suno). dur y bucle en s: el bucle salta de bucle[1] a bucle[0] con un fundido de fundidoBucle centrado en bucle[1].
    // nivel: ganancia para que suenen como las sintéticas (~0,05 de nivel medio). alternativa: pista sintética si el archivo no está.
    pistas: {
      exploracion: { archivo: 'assets/audio/musica/exploracion.m4a', titulo: 'El Yunque Awakens', dur: 177.2, bucle: [59.81, 152.93], nivel: 0.42, alternativa: 'explora' },
      carrera: { archivo: 'assets/audio/musica/carrera.m4a', titulo: 'Carrera sobre El Yunque', dur: 167.24, bucle: [59.66, 138.62], nivel: 0.46, alternativa: 'retos' },
      criadero: { archivo: 'assets/audio/musica/criadero.m4a', titulo: 'The Golden Hatch', dur: 167.16, bucle: [23.8, 135.93], nivel: 0.38, alternativa: 'explora' },
      tormenta: { archivo: 'assets/audio/musica/tormenta.m4a', titulo: 'Guardians of Borikén', dur: 162.16, bucle: [59.65, 133.07], nivel: 0.41, alternativa: 'tension' },
      // Amazona Arena: registrada como pista futura. Sin archivo publicado hasta que exista el modo (el .m4a ya está en el repo, junto a los
      // otros; la build no lo lleva porque nada lo nombra). Ese día se le pone su ruta en archivo, como a los demás (docs/equipo/BANDA_SONORA.md).
      arena: { archivo: null, futura: true, titulo: 'El Yunque battle', dur: 153.6, bucle: [59.27, 128.38], nivel: 0.43, alternativa: 'retos' },
    },
    // Momento del juego → pista (un tema de arriba o una sintética: alegre, explora, retos, tension, final). La prioridad es el orden de MOMENTOS.
    momentos: {
      final: 'final', criadero: 'criadero', portada: 'alegre', creador: 'alegre', arena: 'arena',
      retosTormenta: 'tormenta', retosCarrera: 'carrera', retosRio: 'carrera', retosBanquete: 'carrera', retosMenu: 'carrera',
      crecida: 'tormenta', lluvia: 'exploracion', mundo: 'exploracion',
    },
  };
  const MOMENTOS = ['final', 'criadero', 'portada', 'creador', 'arena', 'retosTormenta', 'retosCarrera', 'retosRio', 'retosBanquete', 'retosMenu', 'crecida', 'lluvia', 'mundo'];
  const RETO_MOMENTO = { tormenta: 'retosTormenta', carrera: 'retosCarrera', rio: 'retosRio', banquete: 'retosBanquete' };

  // Qué momento es (prioridad: final > criadero > portada o creador > arena > retos > crecida > lluvia > mundo) y qué pista le toca
  function momentoDe(e, previa) {
    if (e.fin || (e.comic && previa === BANDA_SONORA.momentos.final)) return 'final';
    if (e.criadero) return 'criadero';
    if (e.portada) return 'portada';
    if (e.creador) return 'creador';
    if (e.arena) return 'arena';
    if (e.retos) return RETO_MOMENTO[e.reto] || 'retosMenu';
    if (e.evento) return 'crecida';
    if (e.lluvia) return 'lluvia';
    return 'mundo';
  }
  function elegir(e, previa) { return BANDA_SONORA.momentos[momentoDe(e, previa)] || 'explora'; }

  // Niveles 0 a 1 de cada capa del ambiente a partir de dónde está la cotorra y qué hora es
  function calcularAmbiente(e) {
    const n = noche(e.hora == null ? 12 : e.hora), dia = 1 - n;
    const tormenta = !!(e.evento || e.lluvia);
    const f = e.portada || e.creador ? 0.35 : e.retos ? 0.7 : 1; // detrás de la portada o en una carrera, más bajito
    const alto = clamp(((e.sobreSuelo || 0) - 6) / 24, 0, 1) * 0.75 + clamp(((e.y || 0) - 35) / 50, 0, 1) * 0.5;
    return {
      rio: clamp(e.rio || 0, 0, 1) * f,
      mar: clamp(e.mar || 0, 0, 1) * f,
      viento: clamp(0.1 + alto + (e.volando ? 0.1 : 0) + (tormenta ? 0.35 : 0), 0, 1) * f,
      // BM34: bosque (hojas) donde no hay agua ni altura; cede ante el río y el mar y se funde al cruzar la orilla. Lluvia continua en la crecida o el aguacero.
      bosque: clamp(1 - clamp(e.rio || 0, 0, 1) * 1.25 - clamp(e.mar || 0, 0, 1) - alto * 0.8, 0, 1) * (tormenta ? 0.6 : 1) * f,
      lluvia: tormenta ? f : 0,
      aves: dia * (tormenta ? 0.15 : 1) * f,
      coquies: n * (tormenta ? 0.5 : 1) * f,
      grillos: n * 0.8 * f,
      noche: n,
    };
  }

  // =====================================================================
  // Motor de síntesis (sirve con un AudioContext en vivo o con uno sin conexión para las pruebas)
  // =====================================================================
  const ruidos = new WeakMap();
  function ruidoDe(c) {
    let b = ruidos.get(c);
    if (!b) {
      const n = Math.floor(c.sampleRate * 1.5), d = (b = c.createBuffer(1, n, c.sampleRate)).getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      ruidos.set(c, b);
    }
    return b;
  }

  // ---- Tablas de ritmo (16 pasos por compás) ----
  const CLAVE = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0]; // clave de son 3-2
  const GUIRO = [2, 0, 1, 1, 0, 0, 1, 0, 2, 0, 1, 1, 0, 0, 1, 0]; // 2 = raspado largo hacia abajo, 1 = corto
  const CONGA = { 6: 190, 10: 250, 12: 340, 14: 250 };
  const BAJO_A = { 0: [0, 3], 6: [7, 2], 8: [0, 3], 12: [7, 2], 14: [12, 2] }; // [semitonos sobre la raíz, pasos]
  const RASGUEO = { 0: [1, true, true], 3: [0.55, false, false], 6: [0.75, true, true], 8: [0.95, true, true], 11: [0.5, false, false], 14: [0.65, false, true] }; // [fuerza, hacia abajo, también en ligero]
  const BAJO_R = { 0: [0, 2], 3: [0, 1], 6: [7, 2], 8: [0, 2], 11: [7, 1], 14: [12, 2] };
  const ESTAB = { 3: 0.6, 6: 0.8, 10: 0.7, 14: 0.55 };
  const PAT = [[0, 2, 4, 2, 1, 3, 5, 3], [0, 1, 2, 4, 2, 1, 3, 2], [1, 3, 2, 4, 5, 3, 2, 1]];
  const ARP_F = [0, 2, 1, 3, 2, 4, 3, 2];
  const GOTAS = [74, 77, 79, 81, 84];

  // ---- Armonía y melodía de cada pista (r = raíz del bajo, c = acorde del cuatro, p = colchón, a = arpegio, m = melodía) ----
  const AL = [ // Sol mayor: G | Em | C | D | G | Em | Am | D
    { r: 43, c: [55, 59, 62, 67], m: notas('0:71:2 3:74:1 4:76:2 7:74:1 8:71:2 10:69:1 12:67:4') },
    { r: 40, c: [52, 59, 64, 67], m: notas('0:76:2 3:74:1 4:71:2 7:69:1 8:71:3 12:74:2 14:76:2') },
    { r: 48, c: [55, 60, 64, 67], m: notas('0:79:2 3:76:1 4:74:2 7:76:1 8:79:2 10:76:1 12:74:4') },
    { r: 50, c: [57, 62, 66, 69], m: notas('0:69:2 3:71:1 4:74:2 7:71:1 8:69:4 14:71:2') },
    { r: 43, c: [55, 59, 62, 67], m: notas('0:74:2 3:71:1 4:79:2 7:76:1 8:74:2 10:71:1 12:67:4') },
    { r: 40, c: [52, 59, 64, 67], m: notas('0:76:2 3:74:1 4:71:2 7:76:1 8:79:3 12:76:2 14:74:2') },
    { r: 45, c: [57, 60, 64, 69], m: notas('0:76:2 3:72:1 4:69:2 7:72:1 8:76:2 10:74:1 12:72:4') },
    { r: 50, c: [57, 62, 66, 69], m: notas('0:71:2 3:69:1 4:66:2 7:69:1 8:74:6') },
  ];
  const EX = [ // Re mayor: Dmaj7 | Bm7 | Gmaj7 | A | D | Bm7 | Em7 | A
    { r: 38, p: [50, 57, 61, 66], a: [62, 66, 69, 73, 74, 78] },
    { r: 47, p: [54, 57, 59, 62], a: [59, 62, 66, 69, 71, 74] },
    { r: 43, p: [50, 55, 59, 66], a: [55, 59, 62, 66, 67, 71, 74] },
    { r: 45, p: [52, 57, 61, 64], a: [57, 61, 64, 69, 71, 73, 76] },
    { r: 38, p: [50, 57, 62, 66], a: [62, 66, 69, 74, 78] },
    { r: 47, p: [54, 57, 59, 62], a: [59, 62, 66, 69, 71, 74] },
    { r: 40, p: [55, 59, 62, 64], a: [59, 62, 64, 67, 71, 74] },
    { r: 45, p: [52, 57, 61, 64], a: [57, 61, 64, 69, 71, 73, 76] },
  ];
  const RT = [ // La menor: Am | F | C | G | Am | F | G | E7
    { r: 45, c: [57, 60, 64, 69], m: notas('0:69:1 1:72:1 2:76:2 4:74:1 5:72:1 6:69:2 8:76:2 10:79:1 11:76:1 12:74:2 14:72:2') },
    { r: 41, c: [57, 60, 65, 69], m: notas('0:69:1 1:72:1 2:77:2 4:76:1 5:72:1 6:69:2 8:72:2 10:69:1 11:72:1 12:77:4') },
    { r: 48, c: [55, 60, 64, 67], m: notas('0:67:1 1:72:1 2:76:2 4:79:2 6:76:2 8:74:2 10:72:2 12:76:4') },
    { r: 43, c: [55, 59, 62, 67], m: notas('0:71:2 2:74:2 4:79:2 6:74:2 8:71:2 10:69:1 11:67:1 12:69:2 14:71:2') },
    { r: 45, c: [57, 60, 64, 69], m: notas('0:76:2 2:81:1 3:79:1 4:76:2 6:72:2 8:69:2 10:72:1 11:76:1 12:81:4') },
    { r: 41, c: [57, 60, 65, 69], m: notas('0:77:2 2:76:1 3:72:1 4:69:2 6:72:2 8:77:2 10:76:1 11:72:1 12:69:4') },
    { r: 43, c: [55, 59, 62, 67], m: notas('0:74:2 2:71:2 4:67:2 6:71:2 8:74:2 10:79:2 12:74:2 14:71:2') },
    { r: 40, c: [56, 59, 62, 64], m: notas('0:76:2 2:80:2 4:83:2 6:80:2 8:76:6 14:71:2') },
  ];
  const TN = [ // Re menor con si bemol, luego sol menor con sexta (4 compases cada uno)
    { r: 38, p: [45, 50, 53, 58] },
    { r: 43, p: [50, 55, 58, 64] },
  ];
  const FN = [ // Re mayor: D | F#m | G | D/F# | Em7 | A | Bm | A
    { r: 38, p: [50, 57, 62, 66], a: [62, 66, 69, 74, 78], m: notas('0:74:8 8:78:6 14:76:2') },
    { r: 42, p: [54, 57, 61, 66], a: [61, 66, 69, 73, 78], m: notas('0:73:8 8:69:4 12:73:4') },
    { r: 43, p: [55, 59, 62, 67], a: [59, 62, 67, 71, 74], m: notas('0:71:6 6:74:2 8:79:8') },
    { r: 42, p: [50, 57, 62, 66], a: [62, 66, 69, 74, 78], m: notas('0:78:6 6:76:2 8:74:8') },
    { r: 40, p: [52, 59, 62, 67], a: [55, 59, 62, 64, 67, 71], m: notas('0:71:8 8:76:4 12:74:4') },
    { r: 45, p: [52, 57, 61, 64], a: [57, 61, 64, 69, 73, 76], m: notas('0:73:6 6:76:2 8:81:6 14:76:2') },
    { r: 47, p: [54, 59, 62, 66], a: [59, 62, 66, 71, 74, 78], m: notas('0:74:8 8:78:6 14:76:2') },
    { r: 45, p: [52, 57, 61, 64], a: [57, 61, 64, 69, 73, 76], m: notas('0:76:4 4:73:4 8:69:4 12:73:4') },
  ];

  const PISTAS = {
    alegre: {
      bpm: 108, compases: 8, fade: 2.2, retardo: 0.75, nivel: 1.1,
      paso(P, n, t) {
        const k = n % 16, a = AL[Math.floor(n / 16) % 8], d = P.d;
        const bj = BAJO_A[k]; if (bj) P.v.bajo(P.suelo, t, a.r + bj[0], 0.17, bj[1] * d * 0.9);
        const ml = a.m[k]; if (ml) P.v.marimba(P.cuerdas, t + P.hum(), ml[0], 0.11, ml[1] * d * 0.95 + 0.12);
        if (CLAVE[k]) P.x.clave(P.perc, t, k === 0 ? 0.09 : 0.07);
        const rs = RASGUEO[k]; if (rs && (!P.ligero || rs[2])) P.rasgueo(t, a.c, rs[0], rs[1]);
        if (GUIRO[k] && (!P.ligero || GUIRO[k] === 2)) P.x.guiro(P.perc, t, GUIRO[k] === 2, GUIRO[k] === 2 ? 0.05 : 0.035);
        if (!P.ligero && CONGA[k]) P.x.conga(P.perc, t, CONGA[k], 0.075);
      },
    },
    explora: {
      bpm: 70, compases: 8, fade: 3, retardo: 0.75, nivel: 0.5,
      paso(P, n, t) {
        const k = n % 16, b = Math.floor(n / 16) % 8, a = EX[b], d = P.d;
        if (k === 0) {
          P.v.pad(P.suelo, t, P.ligero ? [a.p[1], a.p[3]] : a.p, 0.05, 16 * d + 0.5, 1.3, P.ligero ? 1 : 1.6);
          P.v.bajo(P.suelo, t, a.r, 0.14, 14 * d);
        }
        if (k === 8) P.v.bajo(P.suelo, t, a.r + 7, 0.07, 6 * d);
        if (k % 2 === 0) {
          const i = PAT[b % 3][k / 2];
          if (P.rng() < 0.8) P.v.pluck(P.cuerdas, t + P.hum(), a.a[i % a.a.length], k % 4 ? 0.045 : 0.065, P.ligero ? 0.55 : 0.9);
        }
        if (b % 2 === 1 && (k === 2 || k === 6 || k === 10) && P.rng() < 0.85) P.v.flauta(P.cuerdas, t, a.a[a.a.length - 1 - Math.floor(P.rng() * 2)], 0.05, (k === 10 ? 5 : 3) * d);
      },
    },
    retos: {
      bpm: 132, compases: 8, fade: 1.2, retardo: 0.75, nivel: 0.9,
      paso(P, n, t) {
        const k = n % 16, b = Math.floor(n / 16) % 8, a = RT[b], d = P.d;
        const bj = BAJO_R[k]; if (bj) P.v.bajo(P.suelo, t, a.r + bj[0], 0.18, bj[1] * d * 0.9);
        const ml = a.m[k]; if (ml) P.v.marimba(P.cuerdas, t + P.hum(), ml[0], 0.1, ml[1] * d + 0.08);
        if (CLAVE[k]) P.x.clave(P.perc, t, 0.07);
        if (k % 4 === 0) P.x.bombo(P.perc, t, k % 8 === 0 ? 0.26 : 0.18);
        if (k === 4 || k === 12) P.x.palmada(P.perc, t, 0.07);
        if (ESTAB[k]) P.rasgueo(t, a.c, ESTAB[k], k % 2 === 0);
        if (k % 2 === 0) P.x.guiro(P.perc, t, false, k % 4 === 0 ? 0.034 : 0.026);
        else if (!P.ligero) P.x.guiro(P.perc, t, false, 0.014);
        if (b === 7 && k >= 12) P.x.palmada(P.perc, t, 0.05); // relleno antes de volver a empezar
      },
    },
    tension: {
      bpm: 54, compases: 8, fade: 2.5, retardo: 1, filtro: 700, nivel: 0.85,
      paso(P, n, t) {
        const k = n % 16, b = Math.floor(n / 16) % 8, a = TN[b < 4 ? 0 : 1], d = P.d;
        if (k === 0) {
          P.v.pad(P.suelo, t, a.p, 0.032, 16 * d + 0.6, 1.8, 2.2, 'sawtooth');
          P.v.bajo(P.suelo, t, a.r, 0.12, 15 * d);
          if (b === 4) P.x.trueno(P.perc, t + 0.3, 0.14); // un trueno lejano por vuelta
        }
        if (k === 0 || k === 8) P.x.latido(P.perc, t, 0.17);
        if (k === 3 || k === 11) P.x.latido(P.perc, t, 0.1);
        if (k % 4 === 2 && P.rng() < 0.4) P.v.gota(P.cuerdas, t, GOTAS[Math.floor(P.rng() * GOTAS.length)], 0.035);
      },
    },
    final: {
      bpm: 64, compases: 8, fade: 3.5, retardo: 0.75, vib: true, nivel: 0.65,
      paso(P, n, t) {
        const k = n % 16, b = Math.floor(n / 16) % 8, a = FN[b], d = P.d;
        if (k === 0) {
          P.v.pad(P.suelo, t, P.ligero ? [a.p[0], a.p[2]] : a.p, 0.05, 16 * d + 0.5, 1.0, P.ligero ? 1 : 1.6);
          P.v.bajo(P.suelo, t, a.r, 0.13, 13 * d);
          if (b % 2 === 0) P.v.marimba(P.cuerdas, t, a.p[2] + 12, 0.04, 0.9);
        }
        if (k % 2 === 0) P.v.pluck(P.cuerdas, t + P.hum(), a.a[ARP_F[k / 2] % a.a.length], k % 4 ? 0.032 : 0.048, P.ligero ? 0.55 : 0.8);
        const ml = a.m[k]; if (ml) P.v.cuerda(P.cuerdas, t, ml[0], 0.075, ml[1] * d * 0.97, P.vib);
      },
    },
  };

  function crearMotor(c, modo, salida) {
    const ligero = modo !== 'completo';
    const LIM = ligero ? 8 : 28; // voces a la vez (osciladores y ruidos)
    const ocupadas = []; let maxVoces = 0;
    // Cuenta por instantes (no por eventos 'ended'): vale igual en vivo que en una renderización sin conexión. Cada voz es [inicio, fin].
    function voz(t, fin) {
      let n = 0;
      for (let i = ocupadas.length - 1; i >= 0; i--) { const o = ocupadas[i]; if (o[1] <= t) ocupadas.splice(i, 1); else if (o[0] <= t) n++; }
      if (n >= LIM) return false;
      ocupadas.push([t, fin]); if (n + 1 > maxVoces) maxVoces = n + 1;
      return true;
    }
    const ruido = ruidoDe(c);
    const onda = p => c.createPeriodicWave(new Float32Array(p.length), Float32Array.from(p));
    const ONDAS = { pluck: onda([0, 1, 0.55, 0.32, 0.2, 0.12, 0.07, 0.04]), marimba: onda([0, 1, 0, 0, 0.3, 0, 0, 0, 0, 0.06]), bajo: onda([0, 1, 0.4, 0.15, 0.06]) };

    // Un tono. o = { onda | tipo, vol, ata, rel (sostenido) | sin rel: decae hasta dur, hasta/glide (deslizamiento), cents, vib }
    function tono(d, t, dur, f, o) {
      const ata = o.ata || 0.004, h = t + Math.max(dur, ata + 0.002), fin = o.rel != null ? h + o.rel : t + dur;
      if (!(f > 20 && f < 12000) || !voz(t, fin)) return;
      const s = c.createOscillator(), g = c.createGain(), v = Math.max(0.0002, o.vol);
      if (o.onda) s.setPeriodicWave(o.onda); else s.type = o.tipo || 'sine';
      s.frequency.setValueAtTime(f, t);
      if (o.hasta) s.frequency.exponentialRampToValueAtTime(o.hasta, t + (o.glide || Math.min(dur, 0.2)));
      if (o.cents) s.detune.value = o.cents;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + ata);
      if (o.rel != null) { g.gain.setValueAtTime(v, h); g.gain.exponentialRampToValueAtTime(0.0001, fin); } else g.gain.exponentialRampToValueAtTime(0.0001, fin);
      s.connect(g); g.connect(d);
      if (o.vib) { o.vib.connect(s.detune); s.onended = () => { try { o.vib.disconnect(s.detune); } catch (e) { /* ya suelto */ } }; }
      s.start(t); s.stop(fin + 0.03);
    }
    // Un soplo de ruido filtrado. o = { f, hasta, q, tipo, vol, ata, picos: [[dt, fuerza]…] (golpecitos seguidos, como el güiro) }
    function soplo(d, t, dur, o) {
      const fin = t + dur;
      if (!voz(t, fin)) return;
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), v = Math.max(0.0002, o.vol);
      s.buffer = ruido; s.loop = true; f.type = o.tipo || 'bandpass'; f.Q.value = o.q || 1; f.frequency.setValueAtTime(o.f, t);
      if (o.hasta) f.frequency.exponentialRampToValueAtTime(o.hasta, fin);
      g.gain.setValueAtTime(0.0001, t);
      if (o.picos) {
        o.picos.forEach(([dt, k], i) => {
          const a = t + dt, sig = i + 1 < o.picos.length ? t + o.picos[i + 1][0] : fin;
          g.gain.setValueAtTime(0.0001, a); g.gain.linearRampToValueAtTime(v * k, a + 0.002);
          g.gain.exponentialRampToValueAtTime(0.0001, Math.min(a + 0.02, sig - 0.002 > a + 0.003 ? sig - 0.002 : a + 0.003));
        });
      } else { g.gain.exponentialRampToValueAtTime(v, t + (o.ata || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, fin); }
      s.connect(f); f.connect(g); g.connect(d); s.start(t, Math.random() * 1.2); s.stop(fin + 0.03);
    }

    const x = { // percusión
      bombo(d, t, vol) { tono(d, t, 0.22, 125, { hasta: 45, glide: 0.13, vol, ata: 0.003 }); },
      latido(d, t, vol) { tono(d, t, 0.28, 100, { hasta: 46, glide: 0.18, vol, ata: 0.008, onda: ONDAS.bajo }); },
      conga(d, t, f, vol) { tono(d, t, 0.17, f * 1.35, { hasta: f, glide: 0.05, vol, ata: 0.002 }); soplo(d, t, 0.04, { f: 2200, q: 0.8, vol: vol * 0.5 }); },
      clave(d, t, vol) { tono(d, t, 0.09, 2350, { vol, ata: 0.001 }); if (!ligero) tono(d, t, 0.07, 1580, { vol: vol * 0.45, ata: 0.001 }); },
      guiro(d, t, largo, vol) {
        if (largo) soplo(d, t, 0.2, { f: 5400, hasta: 4200, q: 2.4, vol, picos: [[0, 1], [0.03, 0.9], [0.06, 0.85], [0.09, 0.8], [0.12, 0.7], [0.15, 0.6]] });
        else soplo(d, t, 0.08, { f: 4300, hasta: 6200, q: 2.4, vol, picos: [[0, 0.8], [0.032, 1]] });
      },
      palmada(d, t, vol) { soplo(d, t, 0.14, { f: 1700, q: 0.9, vol, picos: [[0, 1], [0.016, 0.8], [0.032, 0.6], [0.05, 0.35]] }); },
      trueno(d, t, vol) { soplo(d, t, 2.4, { tipo: 'lowpass', f: 300, hasta: 80, q: 0.7, vol, ata: 0.25 }); tono(d, t, 1.8, 62, { hasta: 36, glide: 1.6, vol: vol * 0.6, ata: 0.15 }); },
    };
    const v = { // voces con melodía
      pluck(d, t, m, vol, dur) { tono(d, t, dur || 0.5, mtof(m), { onda: ONDAS.pluck, vol, ata: 0.003 }); },
      marimba(d, t, m, vol, dur) { tono(d, t, dur || 0.32, mtof(m), { onda: ONDAS.marimba, vol, ata: 0.002 }); },
      bajo(d, t, m, vol, dur) { tono(d, t, dur, mtof(m), { onda: ONDAS.bajo, vol, ata: 0.006 }); },
      pad(d, t, ms, vol, dur, ata, rel, tipo) {
        for (const m of ms) {
          const f = mtof(m);
          tono(d, t, dur, f, { tipo: tipo || 'triangle', vol, ata, rel, cents: -6 });
          if (!ligero) tono(d, t, dur, f, { tipo: tipo || 'triangle', vol, ata, rel, cents: 6 });
        }
      },
      flauta(d, t, m, vol, dur) { tono(d, t, dur, mtof(m), { vol, ata: 0.07, rel: 0.3 }); },
      cuerda(d, t, m, vol, dur, vib) { tono(d, t, dur, mtof(m), { tipo: 'triangle', vol, ata: 0.12, rel: 0.4, vib }); },
      gota(d, t, m, vol) { tono(d, t, 0.6, mtof(m), { vol, ata: 0.004 }); },
    };

    // Una pista: su propio nodo de ganancia (para los fundidos), sus buses y su planificador de pasos de semicorchea
    function pista(nombre, t0, fundido) {
      const def = PISTAS[nombre], d = 60 / def.bpm / 4;
      const g = c.createGain(), cuerdas = c.createGain(), suelo = c.createGain(), pc = c.createGain(), bajos = c.createBiquadFilter();
      const nodos = [g, cuerdas, suelo, pc, bajos], fuentes = [];
      g.gain.value = fundido ? 0.0001 : def.nivel || 1;
      bajos.type = 'lowpass'; bajos.frequency.value = def.filtro || 2200; bajos.Q.value = 0.5;
      suelo.connect(bajos); bajos.connect(g); cuerdas.connect(g); pc.connect(g); g.connect(salida);
      if (!ligero) { // eco con puntillo, solo para lo que suena con melodía
        const ret = c.createDelay(1.5), fb = c.createGain(), lp = c.createBiquadFilter(), env = c.createGain();
        ret.delayTime.value = Math.min(1.4, def.retardo * 60 / def.bpm); fb.gain.value = 0.3; env.gain.value = 0.3;
        lp.type = 'lowpass'; lp.frequency.value = 2400;
        cuerdas.connect(env); env.connect(ret); ret.connect(lp); lp.connect(fb); fb.connect(ret); lp.connect(g);
        nodos.push(ret, fb, lp, env);
      }
      let vib = null;
      if (def.vib && !ligero) { // vibrato lento para las cuerdas (cents sobre el detune de cada nota)
        const lfo = c.createOscillator(); vib = c.createGain();
        lfo.frequency.value = 5.2; vib.gain.value = 9; lfo.connect(vib); lfo.start(Math.max(0, t0)); fuentes.push(lfo); nodos.push(vib);
      }
      const rng = semilla(nombre.length * 7919 + 13);
      const P = {
        c, d, ligero, rng, x, v, vib, cuerdas, suelo, perc: pc,
        hum: () => (rng() - 0.5) * 0.014,
        rasgueo(t, acorde, fuerza, abajo) {
          let ns = ligero ? [acorde[1], acorde[3]] : acorde.slice();
          if (!abajo) ns = ns.slice(-3).reverse();
          ns.forEach((m, i) => v.pluck(cuerdas, t + i * 0.012 + P.hum(), m, 0.085 * fuerza, 0.5));
        },
      };
      let n = 0, prox = t0;
      return {
        nombre, g, def, nivel: def.nivel || 1, fin: Infinity,
        programar(hasta) { let k = 0; while (prox < hasta && k++ < 2000) { def.paso(P, n, prox); prox += d; n++; } },
        ajustar(ahora) { if (prox < ahora - 0.02) { n = Math.ceil(n / 16) * 16; prox = ahora + 0.06; } }, // si se atrasó (pausa, pestaña oculta), sigue en el próximo compás
        get paso() { return n; },
        cerrar() {
          for (const o of fuentes) { try { o.stop(); } catch (e) { /* ya parada */ } }
          for (const nd of nodos) { try { nd.disconnect(); } catch (e) { /* ya suelto */ } }
        },
      };
    }
    // Fundido cruzado: la nueva sube deprisa (constante fade/4,5) y la anterior baja más despacio (fade/2,5), así no queda un hueco mientras entran
    // las primeras notas de la nueva. Todo con setTargetAtTime: nunca un salto.
    return { pista, cruzar, maxVoces: () => maxVoces, LIM, ligero };
  }
  // (fuera del motor: lo usa también el reproductor de temas en archivo)
  function cruzar(ant, nueva, t, fade) {
    const tauIn = fade / 4.5, tauOut = fade / 2.5;
    if (ant) {
      const val = ant.g.gain.value;
      ant.g.gain.cancelScheduledValues(t); ant.g.gain.setValueAtTime(Math.max(val, 0.0001), t); ant.g.gain.setTargetAtTime(0, t, tauOut);
      ant.fin = t + fade * 3;
    }
    nueva.g.gain.cancelScheduledValues(t); nueva.g.gain.setValueAtTime(0.0001, t); nueva.g.gain.setTargetAtTime(nueva.nivel, t, tauIn);
  }

  // =====================================================================
  // Reproductor: UNA pista a la vez (sintética o tema en archivo), fundidos, bucles, carga perezosa y alternativa si el tema falla.
  // o = { c (AudioContext), salida (bus de música), sintetica(nombre, t) → pista del motor, crearAudio() → <audio>, ahora() → ms,
  //       mem: { fallo: {id: motivo}, pos: {id: { t, salio }}, bloqueo } (sobrevive a rehacer el motor), tabla (BANDA_SONORA) }.
  // Las pruebas lo montan con un contexto y un <audio> de mentira: no depende del juego.
  // =====================================================================
  function crearReproductor(o) {
    const c = o.c, T = o.tabla || BANDA_SONORA, mem = o.mem;
    let real = null, cargando = null, cargandoDesde = 0, salientes = [], cambios = 0, vivos = 0, bucles = 0;
    const curva = sube => { const n = 33, a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (sube ? i : n - 1 - i) / (n - 1); a[i] = Math.sin(x * Math.PI / 2); } return a; };
    function crearArchivo(id) {
      const def = T.pistas[id], g = c.createGain(); g.gain.value = 0.0001; g.connect(o.salida);
      const pos = mem.pos[id], desde = pos && o.ahora() - pos.salio < T.recordar * 1000 && pos.t < def.dur - 3 ? pos.t : 0;
      const p = { nombre: id, archivo: true, def, g, nivel: def.nivel, fin: Infinity, estado: 'cargando', error: '', voces: [], actual: null, sig: null, cruce: null, sonando: false, bloqueada: false, bucles: 0 };
      function voz(t0, vol) {
        const el = o.crearAudio(), vg = c.createGain(), v = { el, g: vg, src: null, t0, lista: false };
        vg.gain.value = vol; vg.connect(g);
        el.preload = 'auto';
        el.addEventListener('loadedmetadata', () => { if (t0 > 0) { try { el.currentTime = t0; } catch (e) { /* aún no se puede saltar */ } } });
        el.addEventListener('canplay', () => { v.lista = true; if (v === p.actual && p.estado === 'cargando') p.estado = 'lista'; });
        el.addEventListener('error', () => { p.estado = 'fallo'; p.error = 'no carga ' + def.archivo + (el.error && el.error.code ? ' (código ' + el.error.code + ')' : ''); });
        try { v.src = c.createMediaElementSource(el); v.src.connect(vg); } catch (e) { p.estado = 'fallo'; p.error = String((e && e.message) || e); }
        el.src = (o.base || '') + def.archivo;
        p.voces.push(v); vivos++;
        return v;
      }
      function tocar(v) {
        let pr; try { pr = v.el.play(); } catch (e) { pr = Promise.reject(e); }
        if (pr && pr.catch) pr.catch(e => {
          if (e && e.name === 'NotAllowedError') { mem.bloqueo = true; p.bloqueada = true; } // el navegador pide un gesto (iOS): sigue la alternativa
          else if (!(e && e.name === 'AbortError')) { p.estado = 'fallo'; p.error = String((e && e.message) || e); }
        });
      }
      function soltarVoz(v) {
        try { v.el.pause(); } catch (e) { /* ya parada */ }
        try { if (v.src) v.src.disconnect(); v.g.disconnect(); } catch (e) { /* ya suelto */ }
        try { v.el.removeAttribute('src'); v.el.load(); } catch (e) { /* sin recurso */ } // suelta el búfer del navegador
        const i = p.voces.indexOf(v); if (i >= 0) { p.voces.splice(i, 1); vivos--; }
      }
      p.actual = voz(desde, 1);
      p.arrancar = () => { p.sonando = true; tocar(p.actual); };
      p.pausar = () => { for (const v of p.voces) { try { v.el.pause(); } catch (e) { /* ya parada */ } } };
      p.reanudar = () => {
        if (!p.sonando || p.bloqueada) return;
        for (const v of [p.actual, p.cruce && p.cruce.viejo]) if (v && v.el.paused && !v.el.ended) tocar(v);
      };
      p.desbloquear = () => { if (!p.bloqueada) return; p.bloqueada = false; if (p.sonando) tocar(p.actual); }; // dentro de un gesto
      p.ajustar = () => {};
      // El bucle: 12 s antes se precarga otra voz del mismo tema en bucle[0] − X/2; en bucle[1] − X/2 entra con un fundido de igual potencia
      p.programar = () => {
        if (!p.sonando || p.bloqueada) return;
        const a = p.actual, ct = a.el.currentTime || 0, b0 = def.bucle[0], b1 = def.bucle[1], X = T.fundidoBucle, t = c.currentTime;
        if (!p.sig && !p.cruce && ct >= b1 - X / 2 - 12) p.sig = voz(Math.max(0, b0 - X / 2), 0);
        if (p.sig && !p.cruce && ((p.sig.lista && ct >= b1 - X / 2) || a.el.ended)) {
          const v = p.sig; p.sig = null; tocar(v);
          a.g.gain.cancelScheduledValues(t); a.g.gain.setValueCurveAtTime(curva(false), t, X);
          v.g.gain.cancelScheduledValues(t); v.g.gain.setValueCurveAtTime(curva(true), t, X);
          p.cruce = { viejo: a, hasta: t + X + 0.05 }; p.actual = v; p.bucles++; bucles++;
        }
        if (p.cruce && t >= p.cruce.hasta) { soltarVoz(p.cruce.viejo); p.cruce = null; }
        else if (!p.cruce && !p.sig && a.el.ended) { try { a.el.currentTime = b0; } catch (e) { /* sin salto */ } tocar(a); } // red de seguridad
      };
      p.posicion = () => (p.actual ? p.actual.el.currentTime || 0 : 0);
      p.cerrar = () => {
        if (p.sonando) mem.pos[id] = { t: p.posicion(), salio: o.ahora() };
        for (const v of p.voces.slice()) soltarVoz(v);
        try { g.disconnect(); } catch (e) { /* ya suelto */ }
        p.sig = p.cruce = null; p.estado = 'cerrada'; p.sonando = false;
      };
      return p;
    }
    function soltar(p) { if (p) p.cerrar(); }
    // Qué suena de verdad para la pista pedida: el tema si está listo; si no, lo que ya sonaba (null) o, tras esperar, su alternativa
    function resolver(id) {
      const def = T.pistas[id];
      if (!def) return id;
      if (real && real.nombre === id) {
        if (real.estado === 'fallo') { mem.fallo[id] = real.error || 'fallo'; return def.alternativa; }
        return real.bloqueada ? def.alternativa : id;
      }
      if (mem.fallo[id] || mem.bloqueo || !def.archivo) return def.alternativa; // sin archivo (Arena, pista futura): la alternativa
      if (!cargando || cargando.nombre !== id) { soltar(cargando); cargando = crearArchivo(id); cargandoDesde = o.ahora(); }
      if (cargando.estado === 'fallo') { mem.fallo[id] = cargando.error || 'fallo'; soltar(cargando); cargando = null; return def.alternativa; }
      if (cargando.estado === 'lista') return id;
      return o.ahora() - cargandoDesde > T.esperaCarga * 1000 ? def.alternativa : null;
    }
    function apurar(s, t) { // una saliente que aún suena se va del todo en ~0,3 s: nunca más de una pista entrando y una saliendo
      const v = s.g.gain.value; s.g.gain.cancelScheduledValues(t); s.g.gain.setValueAtTime(Math.max(v, 0.0001), t); s.g.gain.setTargetAtTime(0, t, 0.06);
      s.fin = Math.min(s.fin, t + 0.4);
    }
    function cambiar(q) {
      const t = c.currentTime;
      let nueva;
      if (T.pistas[q]) { nueva = cargando; cargando = null; nueva.arrancar(); } else nueva = o.sintetica(q, t + 0.08);
      const fade = nueva.archivo || (real && real.archivo) || !PISTAS[q] ? T.fundido : PISTAS[q].fade;
      for (const s of salientes) apurar(s, t);
      cruzar(real, nueva, t, fade);
      if (real) salientes.push(real);
      real = nueva; cambios++;
    }
    function poner(id) {
      if (cargando && cargando.nombre !== id) { soltar(cargando); cargando = null; } // solo se pide el tema que toca
      const q = resolver(id);
      if (q == null || (real && real.nombre === q)) return;
      cambiar(q);
    }
    function paso() {
      const t = c.currentTime;
      if (real) { real.ajustar(t); real.programar(t + 0.4); }
      salientes = salientes.filter(s => { if (t > s.fin) { s.cerrar(); return false; } if (s.archivo) s.programar(); return true; });
    }
    const archivos = () => [real, cargando].concat(salientes).filter(p => p && p.archivo);
    return {
      poner, paso,
      pausar() { for (const p of archivos()) p.pausar(); },
      reanudar() { if (real && real.archivo) real.reanudar(); },
      gesto() { mem.bloqueo = false; for (const p of archivos()) p.desbloquear(); },
      cerrar() { for (const p of [real, cargando].concat(salientes)) if (p) p.cerrar(); real = cargando = null; salientes = []; },
      get real() { return real; }, get salientes() { return salientes.slice(); },
      estado: () => ({ sonando: real ? real.nombre : null, archivo: !!(real && real.archivo), cargando: cargando ? cargando.nombre : null,
        salientes: salientes.map(s => s.nombre), elementos: vivos, cambios, bucles, posicion: real && real.archivo ? Math.round(real.posicion() * 10) / 10 : null,
        fallos: Object.assign({}, mem.fallo), bloqueo: !!mem.bloqueo, pasos: real && !real.archivo ? real.paso : 0 }),
    };
  }

  // =====================================================================
  // Ambiente: capas continuas de ruido filtrado + aves y coquíes sueltos
  // =====================================================================
  function crearAmbiente(c, dest, modo) {
    const simple = modo === 'simple', ruido = ruidoDe(c);
    const fuentes = [], nodos = [], capas = {};
    const lazo = () => { const s = c.createBufferSource(); s.buffer = ruido; s.loop = true; s.start(0, Math.random() * 1.4); fuentes.push(s); return s; };
    const cap = () => { const g = c.createGain(); g.gain.value = 0; g.connect(dest); nodos.push(g); return g; };
    const filtro = (tipo, f, q) => { const b = c.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q || 0.7; nodos.push(b); return b; };
    const lfo = (hz, prof, param) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = hz; g.gain.value = prof; o.connect(g); g.connect(param); o.start(); fuentes.push(o); nodos.push(g); };
    capas.rio = cap(); { const f = filtro('bandpass', 1000, 0.5); lazo().connect(f); f.connect(capas.rio); }
    capas.mar = cap(); {
      const f = filtro('lowpass', 520, 0.6); lazo().connect(f);
      if (simple) f.connect(capas.mar); else { const am = c.createGain(); am.gain.value = 0.55; nodos.push(am); lfo(0.11, 0.45, am.gain); f.connect(am); am.connect(capas.mar); } // olas
    }
    capas.viento = cap(); { const f = filtro('bandpass', 520, 1.1); lazo().connect(f); f.connect(capas.viento); if (!simple) lfo(0.07, 260, f.frequency); }
    capas.bosque = cap(); { const f = filtro('bandpass', simple ? 2600 : 3100, 0.8); lazo().connect(f); if (simple) f.connect(capas.bosque); else { const am = c.createGain(); am.gain.value = 0.6; nodos.push(am); lfo(0.17, 0.35, am.gain); lfo(0.05, 500, f.frequency); f.connect(am); am.connect(capas.bosque); } } // hojas movidas por la brisa
    capas.lluvia = cap(); { const f = filtro('highpass', 2300, 0.4); lazo().connect(f); f.connect(capas.lluvia); }
    if (!simple) { // grillos: ruido agudo que pulsa unas 31 veces por segundo
      capas.grillos = cap(); const f = filtro('bandpass', 4700, 14), am = c.createGain(); am.gain.value = 0.5; nodos.push(am);
      lfo(31, 0.5, am.gain); lazo().connect(f); f.connect(am); am.connect(capas.grillos);
    }
    capas.aves = cap(); capas.coquies = cap();
    const K = { rio: 0.22, mar: 0.45, viento: 0.3, grillos: 0.1, bosque: 0.14, lluvia: 0.2, aves: 2.2, coquies: 1 }; // ganancia interna de cada capa (se calibra con renderizar)
    const pan = d => { if (simple || !c.createStereoPanner) return d; const p = c.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8; p.connect(d); return p; };
    function pio(d, t, f0, f1, dur, vol, tipo) {
      const s = c.createOscillator(), g = c.createGain(); s.type = tipo || 'sine';
      s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(g); g.connect(d); s.start(t); s.stop(t + dur + 0.03);
    }
    function ave(t) {
      const d = pan(capas.aves), r = Math.random(), base = 2300 + Math.random() * 1700;
      if (r < 0.4) { pio(d, t, base, base * 1.28, 0.17, 0.06); pio(d, t + 0.2, base * 1.15, base * 0.8, 0.2, 0.05); } // silbido que sube y baja
      else if (r < 0.8) { const n = 3 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) pio(d, t + i * 0.095, base * (i % 2 ? 1.06 : 1), base * (i % 2 ? 1 : 1.08), 0.055, 0.045); } // trino
      else { // cotorra: dos graznidos nasales
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 3; f.connect(d);
        for (let i = 0; i < 2; i++) pio(f, t + i * 0.3, 800, 1250, 0.22, 0.09, 'sawtooth');
      }
    }
    function coqui(t) { // «co» grave y «quí» agudo; cada rana con su afinación
      const d = pan(capas.coquies), p = 0.9 + Math.random() * 0.22, n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { const a = t + i * (0.85 + Math.random() * 0.2); pio(d, a, 1060 * p, 1150 * p, 0.11, 0.07); pio(d, a + 0.15, 1850 * p, 2300 * p, 0.22, 0.09); }
    }
    let proxAve = 0, proxCoqui = 0, nEventos = 0;
    const lento = simple || modo === 'ligero' ? 1.6 : 1; // en equipos justos, menos eventos
    return {
      aplicar(niv, t) { for (const k in capas) capas[k].gain.setTargetAtTime((niv[k] || 0) * (K[k] || 1), t, 0.8); },
      eventos(t, niv, ranasCallan) {
        if (niv.aves > 0.04 && t >= proxAve) { ave(t + 0.05); nEventos++; proxAve = t + lento * (2 + Math.random() * 5) / (0.35 + niv.aves); }
        if (niv.coquies > 0.04 && !ranasCallan && t >= proxCoqui) { coqui(t + 0.05); nEventos++; proxCoqui = t + lento * (1 + Math.random() * 2.2) / (0.35 + niv.coquies); }
      },
      get capas() { return Object.keys(capas); }, get eventosSonados() { return nEventos; },
      cerrar() {
        for (const o of fuentes) { try { o.stop(); } catch (e) { /* ya parada */ } }
        for (const nd of nodos) { try { nd.disconnect(); } catch (e) { /* ya suelto */ } }
      },
    };
  }

  // Mide una renderización sin conexión: pico, nivel medio (RMS), muestras raras y el mayor salto entre muestras
  function analizar(buf, desde, hasta) {
    const d = buf.getChannelData(0), sr = buf.sampleRate, i0 = Math.floor((desde || 0) * sr), i1 = Math.min(d.length, Math.floor((hasta == null ? d.length / sr : hasta) * sr));
    let pico = 0, suma = 0, nan = 0, salto = 0;
    for (let i = i0; i < i1; i++) {
      const w = d[i];
      if (!(w === w) || w === Infinity || w === -Infinity) { nan++; continue; }
      const a = Math.abs(w); if (a > pico) pico = a;
      suma += w * w; if (i > i0) { const s = Math.abs(w - d[i - 1]); if (s > salto) salto = s; }
    }
    return { pico, rms: Math.sqrt(suma / Math.max(1, i1 - i0)), nan, salto };
  }
  const OC = () => window.OfflineAudioContext || window.webkitOfflineAudioContext;

  // =====================================================================
  // El módulo del juego
  // =====================================================================
  window.AVMusica = function (G) {
    if (G.musicaApi) return G.musicaApi;
    const S = G.S, A = G.audio, $ = G.util.$, R = G.renderer;
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const NUCLEOS = navigator.hardwareConcurrency || 4;
    let guardarAlCambiar = true;
    let ultimo = null; // lo último elegido en esta sesión: sobrevive a «Comenzar de cero» y a cargar una partida sin ajustes

    // ---------- Ajustes (S.profile.mezcla) ----------
    function leer() {
      const m = esObj(S.profile && S.profile.mezcla) ? S.profile.mezcla : {};
      return { musica: nivelDe(m.musica, DEF.musica), ambiente: nivelDe(m.ambiente, DEF.ambiente) };
    }
    function set(k, v, soloMemoria) {
      if (k !== 'musica' && k !== 'ambiente') return;
      const m = leer(); m[k] = nivelDe(Number(v), DEF[k]);
      ultimo = Object.assign({}, m);
      S.profile = Object.assign({}, S.profile, { mezcla: m });
      sync();
      if (!soloMemoria && guardarAlCambiar && S.profile.created && G.guardado) G.guardado.save(true);
    }

    // ---------- Qué pista toca ----------
    const st = { pista: null, mom: null, desde: 0, cand: null, desdeCand: 0, cambios: 0, historial: [] };
    let sim = null; // entradas simuladas (pruebas o para oír una pista a mano)
    let lluviaDesde = 0, ranasHasta = 0, hablaHasta = 0, eclosionAhora = false, horaForzada = null, fallos = 0, ultimoFallo = '', muerto = false;
    const BASE_E = { portada: false, creador: false, fin: false, comic: false, retos: false, reto: null, evento: false, lluvia: false, criadero: false, eclosion: false, arena: false };
    function leerEntradas() {
      if (sim) return Object.assign({}, BASE_E, sim);
      const ahora = performance.now(), llueve = !!(G.fx && G.fx.rain && G.fx.rain.visible);
      if (!llueve) lluviaDesde = 0; else if (!lluviaDesde) lluviaDesde = ahora;
      const vis = id => { const e = $(id); return !!e && !e.hidden; };
      const tit = $('title'), cr = G.criadero, rt = G.retosApi;
      const criadero = !!(cr && typeof cr.abierto === 'function' && cr.abierto());
      const saltar = criadero && document.querySelector('#criadero .cr-skip'); // «Saltar» solo se ve mientras un huevo eclosiona
      return {
        portada: !!(tit && tit.open), creador: vis('creator'), fin: vis('end'), comic: vis('comic'),
        retos: document.body.classList.contains('retos-on') || !!(rt && rt.activo), reto: (rt && rt.reto) || null,
        evento: !!S.event, lluvia: llueve && ahora - lluviaDesde > 5000, // la lluvia de una demostración de 4 s no cuenta
        criadero, eclosion: !!(saltar && !saltar.hidden), arena: document.body.classList.contains('arena-on'), // arena-on: el día que exista el modo
      };
    }
    // Decide la pista con calma: un cambio pide 0,7 s seguidos (así un parpadeo, como el de la portada al abrir Retos, no hace dos fundidos);
    // salir de la crecida pide 5 s seguidos de calma. Cambiar de momento sin cambiar de pista (puntos de control, otro huevo, «Otra vez»,
    // el menú de Retos → la carrera) no toca nada: la pista sigue sonando.
    function evaluar(e, ahora) {
      const m = momentoDe(e, st.pista), c = BANDA_SONORA.momentos[m] || 'explora';
      if (c !== st.cand) { st.cand = c; st.desdeCand = ahora; }
      let quiere = st.pista;
      if (!st.pista) quiere = c;
      else if (c !== st.pista && ahora - st.desdeCand >= (st.mom === 'crecida' ? 5000 : 700)) quiere = c;
      if (quiere !== st.pista) { st.pista = quiere; st.desde = ahora; st.cambios++; st.historial.push(quiere); if (st.historial.length > 20) st.historial.shift(); }
      if (c === st.pista) st.mom = m;
      return st.pista;
    }

    // ---------- Modo según la calidad y el equipo ----------
    let modoFijo = null, modoDesde = 0, modoCand = null;
    function modoActual() {
      const m = modoDe(R && R.calidad && R.calidad.nivel, TACTIL, NUCLEOS), ahora = performance.now();
      if (!modoFijo) { modoFijo = m; modoDesde = ahora; }
      else if (m !== modoFijo) {
        if (m === 'simple') { modoFijo = m; modoCand = null; } // bajar es inmediato
        else if (modoCand !== m) { modoCand = m; modoDesde = ahora; } // subir, tras 15 s estables
        else if (ahora - modoDesde > 15000) { modoFijo = m; modoCand = null; }
      } else modoCand = null;
      return modoFijo;
    }

    // ---------- Motor en vivo ----------
    let eng = null, niv = calcularAmbiente({}), cuenta = 0;
    const memBanda = { fallo: {}, pos: {}, bloqueo: false }; // sobrevive a rehacer el motor (cambio de calidad o de contexto)
    function desmontar() {
      if (!eng) return;
      try { eng.rep.cerrar(); eng.ambiente.cerrar(); eng.musicaBus.disconnect(); eng.ambBus.disconnect(); } catch (e) { /* ya suelto */ }
      eng = null;
    }
    function preparar() {
      const c = A.ctx; if (!c || !A.master) return false;
      const modo = modoActual();
      if (eng && eng.c === c && eng.modo === modo) return true;
      desmontar();
      const musicaBus = c.createGain(), ambBus = c.createGain();
      musicaBus.gain.value = 0; ambBus.gain.value = 0;
      const motor = crearMotor(c, modo, musicaBus);
      const rep = crearReproductor({ c, salida: musicaBus, mem: memBanda, tabla: BANDA_SONORA, ahora: () => performance.now(),
        crearAudio: () => new Audio(), sintetica: (nombre, t) => motor.pista(nombre, t, true) });
      eng = { c, modo, musicaBus, ambBus, motor, rep, ambiente: crearAmbiente(c, ambBus, modo), conectado: { m: false, a: false }, nuevo: true };
      return true;
    }
    function conectar(bus, clave, quiere) {
      if (eng.conectado[clave] === quiere) return;
      try { if (quiere) bus.connect(A.master); else bus.disconnect(); } catch (e) { /* sin master */ }
      eng.conectado[clave] = quiere;
    }

    // Cuántas consultas de agua hace falta: 33 cada 0,4 s. Separa el río del mar por el nivel del agua en cada punto.
    function entornoAgua() {
      const lv = G.agua && G.agua.levelAt; if (!lv) return { rio: 0, mar: 0 };
      const T = G.terreno, M = T && T.mapa, nivelMar = (M && M.agua && M.agua.mar && M.agua.mar.nivel) || 0;
      let rio = 0, mar = 0;
      const probar = (px, pz, w) => {
        const l = lv(px, pz); if (!(l > -1e8)) return;
        if (Math.abs(l - nivelMar) < 0.02 && T.height(px, pz) < nivelMar) { if (w > mar) mar = w; } else if (w > rio) rio = w;
      };
      const x = S.pos.x, z = S.pos.z;
      probar(x, z, 1);
      for (const [r, w] of [[4, 0.85], [9, 0.6], [16, 0.38], [26, 0.18]]) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + r; probar(x + Math.cos(a) * r, z + Math.sin(a) * r, w); }
      const alto = Math.max(0, S.pos.y - T.height(x, z)), f = clamp(1 - Math.max(0, alto - 5) / 45, 0.15, 1); // desde lo alto, el agua suena lejos
      return { rio: rio * f, mar: mar * f };
    }
    function horaActual() {
      if (horaForzada != null) return horaForzada;
      if (Number.isFinite(S.hora)) return ((S.hora % 24) + 24) % 24;
      return 12; // el cielo del juego es siempre de día: sin S.hora, ambiente de día (nada de coquíes con sol)
    }
    function entradasAmbiente(e) {
      const a = entornoAgua(), M = G.fisica && G.fisica.MOVE;
      return { hora: horaActual(), rio: a.rio, mar: a.mar, sobreSuelo: Math.max(0, S.pos.y - G.terreno.height(S.pos.x, S.pos.z)), y: S.pos.y, volando: !!(M && M.flying),
        evento: e.evento, lluvia: e.lluvia, retos: e.retos, portada: e.portada, creador: e.creador };
    }

    // ---------- Volumen ----------
    const DIALOGO_DUCK = 0.6;
    const MBASE = 1.8, ABASE = 1.4; // con las pistas normalizadas a ~0,05 de nivel medio, el valor de fábrica (55 %) queda ~-33 dBFS
    // La voz del Aula tapa menos; mientras un huevo eclosiona, la música se aparta (el efecto de la eclosión va por el bus de efectos)
    // Diálogo (caja o bocadillo de G.dialogo): la música baja a 0,6 para que se lea tranquilo; vuelve suave al cerrarlo
    const enDialogo = () => { try { return !!(G.dialogo && G.dialogo.activo && G.dialogo.activo()); } catch (e) { return false; } };
    const duck = () => Math.min(hablaHasta > performance.now() ? 0.45 : 1, eclosionAhora ? BANDA_SONORA.eclosion : 1, enDialogo() ? DIALOGO_DUCK : 1);
    let gM = -1, gA = -1;
    function aplicarVolumen() { // solo escribe en el bus si el valor cambió: menos eventos de automatización
      if (!eng) return;
      const t = eng.c.currentTime, m = leer(), nm = MBASE * ganancia(m.musica) * duck(), na = ABASE * ganancia(m.ambiente);
      if (eng.nuevo || Math.abs(nm - gM) > 0.002) { eng.musicaBus.gain.setTargetAtTime(nm, t, nm < gM ? 0.1 : 0.3); gM = nm; } // baja deprisa, vuelve suave
      if (eng.nuevo || Math.abs(na - gA) > 0.002) { eng.ambBus.gain.setTargetAtTime(na, t, 0.08); gA = na; }
      eng.nuevo = false;
    }

    function tick() {
      if (muerto) return;
      try {
        const e = leerEntradas(), ahora = performance.now();
        evaluar(e, ahora); eclosionAhora = !!e.eclosion;
        if (!preparar()) return; // sin AudioContext (aún no hubo gesto): no hay nada que sonar
        const c = eng.c, m = leer();
        const sonable = c.state === 'running' && !A.vol.muted && !document.hidden && !G.quiet; // G.quiet: en las baterías no suena nada
        const quiereMusica = sonable && m.musica > 0 && eng.modo !== 'simple', quiereAmb = sonable && m.ambiente > 0;
        conectar(eng.musicaBus, 'm', quiereMusica); conectar(eng.ambBus, 'a', quiereAmb);
        if (!quiereMusica) eng.rep.pausar(); // con el sonido apagado, la música a 0 o la pestaña oculta, los temas en archivo se pausan (no bajan datos)
        if (!quiereMusica && !quiereAmb) return;
        aplicarVolumen();
        if (quiereMusica) { eng.rep.reanudar(); eng.rep.poner(st.pista); eng.rep.paso(); }
        if (quiereAmb) {
          if (cuenta++ % 4 === 0) { niv = calcularAmbiente(entradasAmbiente(e)); eng.ambiente.aplicar(niv, c.currentTime); }
          eng.ambiente.eventos(c.currentTime, niv, ranasHasta > ahora);
        }
      } catch (err) {
        fallos++; ultimoFallo = String(err && err.message || err);
        if (fallos >= 5) { muerto = true; clearInterval(timer); desmontar(); }
      }
    }

    // ---------- Sección «Música y ambiente» en el menú de pausa ----------
    const menu = $('pause');
    let sec = null;
    const CSS = `.pause-musica { padding: var(--sp-4); border-radius: var(--r-lg); background: rgba(244, 247, 241, 0.05); border: 1px solid rgba(244, 247, 241, 0.1); }
.pause-musica h3 { margin: 0 0 var(--sp-3); font: 700 var(--fs-xs)/1.2 var(--font-body); text-transform: uppercase; letter-spacing: var(--tracking-caps); color: var(--c-eyebrow); }
.mz-fila { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2) var(--sp-3); min-width: 0; }
.mz-fila + .mz-fila { margin-top: var(--sp-2); }
.mz-lbl { flex: 0 0 5.5rem; font-size: var(--fs-sm); color: var(--c-text-muted); }
.mz-fila input[type=range] { flex: 1 1 6rem; min-width: 0; min-height: 44px; margin: 0; accent-color: var(--beak); cursor: pointer; }
.mz-val { flex: 0 0 3.2ch; text-align: right; font-size: var(--fs-sm); font-variant-numeric: tabular-nums; color: var(--c-text); }
.pause-musica .note { margin: var(--sp-2) 0 0; }
.pause-musica .note:empty { display: none; }
:root.a11y-contraste .pause-musica { background: #000; border-color: rgba(255, 255, 255, 0.6); }
:root.a11y-contraste .mz-fila input[type=range] { accent-color: #fff; }`;
    function montar() {
      if (!menu || menu.querySelector('.pause-musica')) return;
      if (!document.getElementById('musica-css')) { const e = document.createElement('style'); e.id = 'musica-css'; e.textContent = CSS; document.head.appendChild(e); }
      sec = document.createElement('section');
      sec.className = 'pause-musica'; sec.setAttribute('aria-labelledby', 'mz-titulo');
      sec.innerHTML = '<h3 id="mz-titulo"></h3>' + ['musica', 'ambiente'].map(k =>
        `<div class="mz-fila"><label class="mz-lbl" for="mz-${k}"></label><input id="mz-${k}" type="range" min="0" max="100" step="5" data-mz="${k}"><output class="mz-val" for="mz-${k}"></output></div>`).join('') +
        '<p class="note" id="mz-nota" aria-live="polite"></p>';
      const tras = menu.querySelector('.pause-a11y') || menu.querySelector('.pause-aula') || menu.querySelector('.pause-grid');
      if (tras) tras.after(sec); else menu.appendChild(sec);
      sec.addEventListener('input', e => { const i = e.target.closest && e.target.closest('input[data-mz]'); if (i) set(i.dataset.mz, +i.value, true); }); // al arrastrar: se oye ya, sin escribir el guardado
      sec.addEventListener('change', e => { const i = e.target.closest && e.target.closest('input[data-mz]'); if (i) set(i.dataset.mz, +i.value, false); }); // al soltar: se guarda
      menu.addEventListener('toggle', sync);
      const bs = $('b-sound'); if (bs) bs.addEventListener('click', () => setTimeout(sync, 0));
    }
    function rotular() {
      if (!sec) return;
      sec.querySelector('#mz-titulo').textContent = L('Música y ambiente', 'Music and ambience');
      sec.querySelector('label[for=mz-musica]').textContent = L('Música', 'Music');
      sec.querySelector('label[for=mz-ambiente]').textContent = L('Ambiente', 'Ambience');
      sync();
    }
    function sync() {
      if (!sec) return;
      const m = leer();
      for (const k of ['musica', 'ambiente']) {
        const i = sec.querySelector('#mz-' + k), o = sec.querySelector(`output[for=mz-${k}]`);
        if (+i.value !== m[k]) i.value = m[k];
        o.textContent = m[k]; i.setAttribute('aria-valuetext', m[k] + L(' por ciento', ' percent'));
      }
      const nota = sec.querySelector('#mz-nota'), modo = eng ? eng.modo : modoDe(R && R.calidad && R.calidad.nivel, TACTIL, NUCLEOS);
      nota.textContent = A.vol.muted ? L('Con «Sonido: no» no se oye nada.', 'With “Sound: off” you hear nothing.')
        : modo === 'simple' ? L('Tu equipo va justo: solo suena el ambiente, para que el juego corra fluido.', 'Your device is working hard: only the ambience plays so the game runs smoothly.') : '';
      aplicarVolumen();
    }

    // ---------- Enganches al juego ----------
    G.on('apply', () => { // cargar, reiniciar o restaurar: se aplica lo guardado; si la partida no trae nada, queda lo de la sesión
      const p = S.profile || {};
      if (esObj(p.mezcla)) ultimo = leer();
      else if (ultimo) S.profile = Object.assign({}, p, { mezcla: Object.assign({}, ultimo) });
      sync();
    }, 50);
    G.on('nuevoEstudiante', () => { ultimo = null; }); // equipo compartido: el siguiente niño empieza con los volúmenes de fábrica
    G.on('aula', k => { if (k === 'idioma') rotular(); });
    G.on('voz', e => { hablaHasta = e && e.fin ? 0 : performance.now() + 1500; });
    if (A.alSonar) A.alSonar(n => { if (n === 'co' || n === 'qui' || n === 'chorus') ranasHasta = performance.now() + 9000; });
    // El navegador solo deja sonar tras un gesto; audio.js ya crea el contexto en pointerdown y keydown. Aquí se reintenta también al soltar y
    // en touchend (iOS), mientras el contexto no esté sonando. No se llama sin gesto: así no hay avisos de autoplay.
    // Un tema en archivo que el navegador no dejó sonar sin gesto (iOS) se vuelve a tocar aquí, dentro del gesto.
    const desbloquear = () => {
      try { if (!A.ctx || A.ctx.state !== 'running') A.ensure(); } catch (e) { /* sin audio */ }
      try { if (eng && memBanda.bloqueo) eng.rep.gesto(); } catch (e) { /* sin audio */ }
    };
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'keydown']) addEventListener(ev, desbloquear, { passive: true, capture: true });
    document.addEventListener('visibilitychange', () => { if (!muerto) tick(); });

    montar(); rotular();
    const timer = setInterval(tick, 100);
    tick();

    // ---------- Pruebas ----------
    async function renderizar(nombre, seg, modo, antes) {
      const C = OC(); if (!C) return null;
      const sr = 22050, c = new C(2, Math.ceil(sr * seg), sr), sal = c.createGain(); sal.connect(c.destination);
      const mo = crearMotor(c, modo || 'completo', sal), p = mo.pista(nombre, 0.05, false);
      p.programar(seg - 0.05);
      let extra = null;
      if (antes) extra = antes(c, mo, p, sal); // las pruebas añaden aquí un fundido, por ejemplo
      const buf = await c.startRendering();
      return Object.assign(analizar(buf), { voces: mo.maxVoces(), LIM: mo.LIM, buf, extra });
    }
    async function renderizarAmbiente(nivel, seg, modo) {
      const C = OC(); if (!C) return null;
      const sr = 22050, c = new C(2, Math.ceil(sr * seg), sr), sal = c.createGain(); sal.connect(c.destination);
      const am = crearAmbiente(c, sal, modo || 'completo');
      am.aplicar(nivel, 0);
      for (let t = 1.5; t < seg - 0.4; t += 0.1) am.eventos(t, nivel, false); // como el reloj de tick(): cada 0,1 s
      const buf = await c.startRendering();
      return Object.assign(analizar(buf, 1.5), { eventos: am.eventosSonados, capas: am.capas });
    }

    // Pruebas de la banda sonora: la tabla, los archivos de verdad (solo sus metadatos) y el reproductor con un contexto y un <audio> de mentira
    async function probarBanda(check) {
      const BS = BANDA_SONORA, ids = Object.keys(BS.pistas);
      // a) La tabla
      const malasP = ids.filter(id => { const d = BS.pistas[id]; return !((d.futura ? d.archivo === null : /^assets\/audio\/musica\/[a-z]+\.m4a$/.test(d.archivo)) && d.dur > 60 && d.bucle[0] > 0 && d.bucle[0] < d.bucle[1] - 20 && d.bucle[1] < d.dur - 1 && d.nivel > 0 && d.nivel <= 1 && PISTAS[d.alternativa] && d.titulo); });
      check('Tabla: los 5 temas (exploración, carrera, criadero, tormenta y arena) con archivo, duración, bucle, nivel y alternativa sintética',
        JSON.stringify(ids) === '["exploracion","carrera","criadero","tormenta","arena"]' && !malasP.length, malasP.join(', '));
      const destinos = Object.values(BS.momentos), malosM = MOMENTOS.filter(m => !(BS.pistas[BS.momentos[m]] || PISTAS[BS.momentos[m]]));
      check('Tabla: cada momento del juego tiene una pista que existe y el orden de prioridad los nombra a todos', !malosM.length && MOMENTOS.length === Object.keys(BS.momentos).length && MOMENTOS.every(m => m in BS.momentos), malosM.join(', '));
      check('Tabla: los cuatro temas en uso salen de algún momento; Arena queda solo registrada (pista futura sin archivo publicado: ningún modo la pide hoy)',
        ['exploracion', 'carrera', 'criadero', 'tormenta'].every(id => destinos.includes(id)) && BS.pistas.arena.futura && !BS.pistas.arena.archivo && destinos.filter(d => d === 'arena').length === 1 && !document.body.classList.contains('arena-on'));
      check('Tabla: fundido cruzado ajustable de 1 a 2 s y bucle con su propio fundido', BS.fundido >= 1 && BS.fundido <= 2 && BS.fundidoBucle >= 1 && BS.fundidoBucle <= 4 && BS.esperaCarga > 0 && BS.recordar > 0, BS.fundido + ' / ' + BS.fundidoBucle);
      // b) Fuera de la descarga inicial: sin sonido en marcha, ningún .m4a se ha pedido
      const pedidos = (performance.getEntriesByType ? performance.getEntriesByType('resource') : []).filter(r => /\/musica\/[a-z]+\.m4a/.test(r.name));
      const sonando = !!(A.ctx && A.ctx.state === 'running');
      check('Los temas no van en la descarga inicial: sin gesto ni sonido, no se pidió ningún .m4a', sonando || !pedidos.length, pedidos.length + ' pedidos');
      // c) Los archivos de verdad: el navegador lee sus metadatos y la duración cuadra con la tabla
      const aac = (() => { try { return document.createElement('audio').canPlayType('audio/mp4; codecs="mp4a.40.2"'); } catch (e) { return ''; } })();
      if (!aac) check('Este navegador reproduce AAC (.m4a)', false, 'canPlayType vacío');
      else {
        const usados = ids.filter(id => BS.pistas[id].archivo);
        const meta = await Promise.all(usados.map(id => new Promise(res => {
          const el = new Audio(), fin = r => { clearTimeout(to); el.removeAttribute('src'); try { el.load(); } catch (e) { /* nada */ } res(r); };
          const to = setTimeout(() => fin({ id, error: 'tiempo' }), 15000);
          el.preload = 'metadata'; el.muted = true;
          el.addEventListener('loadedmetadata', () => fin({ id, dur: el.duration }), { once: true });
          el.addEventListener('error', () => fin({ id, error: 'código ' + (el.error && el.error.code) }), { once: true });
          el.src = BS.pistas[id].archivo;
        })));
        const mal = meta.filter(m => m.error || Math.abs(m.dur - BS.pistas[m.id].dur) > 0.5);
        check('Los 4 temas en uso (.m4a) existen, el navegador los abre y su duración cuadra con la tabla (±0,5 s)', !mal.length, mal.length ? JSON.stringify(mal) : meta.map(m => m.id + ' ' + m.dur.toFixed(1)).join(' · '));
      }
      // d) El reproductor con dobles: una pista a la vez, fundidos, bucle, silencio, salida, alternativa
      const montar = opciones => {
        const op = opciones || {}, els = [], sints = [];
        const param = v => ({ value: v, objetivo: v, tau: null,
          setValueAtTime(x) { this.value = x; this.objetivo = x; }, setTargetAtTime(x, t, tau) { this.objetivo = x; this.tau = tau; },
          cancelScheduledValues() {}, setValueCurveAtTime(cu) { this.objetivo = cu[cu.length - 1]; this.curva = cu; } });
        const nodo = () => ({ gain: param(1), con: 0, connect() { this.con++; }, disconnect() { this.con = 0; } });
        const c = { currentTime: 0, createGain: nodo, createMediaElementSource: () => nodo() };
        const audio = () => {
          const oy = {}, el = { preload: '', src: '', paused: true, ended: false, currentTime: 0, error: null, veces: 0,
            addEventListener(t, f) { (oy[t] = oy[t] || []).push(f); }, emitir(t) { (oy[t] || []).forEach(f => f()); },
            play() { this.veces++; if (op.rechazo) { const e = new Error('sin gesto'); e.name = op.rechazo; return Promise.reject(e); } this.paused = false; return Promise.resolve(); },
            pause() { this.paused = true; }, removeAttribute(k) { if (k === 'src') this.src = ''; }, load() {} };
          els.push(el); return el;
        };
        let ms = 0;
        const mem = { fallo: {}, pos: {}, bloqueo: false };
        const rep = crearReproductor({ c, salida: nodo(), mem, tabla: BS, ahora: () => ms, crearAudio: audio,
          sintetica: (n) => { const s = { nombre: n, g: nodo(), nivel: 1, fin: Infinity, paso: 0, programar() {}, ajustar() {}, cerrar() { s.cerrada = true; } }; s.g.gain.value = 0.0001; sints.push(s); return s; } });
        const listo = el => { el.emitir('loadedmetadata'); el.emitir('canplay'); };
        return { c, els, sints, mem, rep, listo, avanzar(s) { ms += s * 1000; c.currentTime += s; } };
      };
      const espera = () => new Promise(r => setTimeout(r, 0));
      const P = montar(), R = P.rep, X = BS.fundidoBucle;
      const subiendo = () => [R.real].concat(R.salientes).filter(p => p && p.g.gain.objetivo > 0.001).length;
      R.poner('exploracion');
      const mientrasCarga = R.estado().sonando === null && P.els.length === 1 && P.els[0].src === BS.pistas.exploracion.archivo && P.els[0].paused;
      P.listo(P.els[0]); R.poner('exploracion'); R.paso();
      const expl = P.els[0];
      check('Un tema se pide solo cuando toca y suena al poder: mientras carga no hay salto ni silencio forzado', mientrasCarga && R.estado().sonando === 'exploracion' && !expl.paused && R.real.g.gain.objetivo === BS.pistas.exploracion.nivel, JSON.stringify(R.estado()));
      expl.currentTime = 42.5;
      P.avanzar(30); R.poner('carrera'); R.paso();
      const sigueExpl = R.estado().sonando === 'exploracion' && R.estado().cargando === 'carrera';
      P.listo(P.els[1]); R.poner('carrera'); R.paso();
      const car = P.els[1];
      check('Al cambiar de pista: mientras la nueva carga sigue la anterior, luego un fundido cruzado y una sola pista subiendo',
        sigueExpl && R.estado().sonando === 'carrera' && JSON.stringify(R.estado().salientes) === '["exploracion"]' && subiendo() === 1 && R.salientes[0].g.gain.objetivo === 0, JSON.stringify(R.estado()));
      check('El fundido cruzado dura lo que dice la tabla (' + BS.fundido + ' s)', Math.abs(R.real.g.gain.tau - BS.fundido / 4.5) < 1e-9 && Math.abs(R.salientes[0].g.gain.tau - BS.fundido / 2.5) < 1e-9 && R.salientes[0].fin === P.c.currentTime + BS.fundido * 3);
      // «Otra vez» o el mismo modo: la misma pista sigue, sin otro <audio> ni reinicio
      car.currentTime = 33;
      for (let i = 0; i < 5; i++) { P.avanzar(1); R.poner('carrera'); R.paso(); }
      check('Repetir el modo («Otra vez») no reinicia la pista: el mismo <audio> sigue donde iba', R.estado().cambios === 2 && car.veces === 1 && car.currentTime === 33 && P.els.length === 2);
      // Al salir del modo, lo que sale se para y suelta su búfer
      check('La pista que sale se para y suelta el archivo al terminar su fundido', R.estado().salientes.length === 0 && expl.paused && expl.src === '' && R.estado().elementos === 1, JSON.stringify(R.estado()));
      // Volver antes de «recordar»: sigue donde iba
      R.poner('exploracion'); const expl2 = P.els[2]; expl2.emitir('loadedmetadata');
      check('Volver a la exploración enseguida sigue donde iba (no vuelve a empezar)', expl2 && expl2.currentTime === 42.5, expl2 && expl2.currentTime);
      expl2.emitir('canplay'); R.poner('exploracion'); R.paso(); P.avanzar(6); R.paso();
      check('Al salir de Retos la carrera para con fundido y vuelve la exploración', R.estado().sonando === 'exploracion' && car.paused && car.src === '' && R.estado().elementos === 1, JSON.stringify(R.estado()));
      // Silencio del jugador: se pausa todo; al volver, sigue la misma pista
      R.pausar();
      const todoParado = P.els.every(el => el.paused);
      R.reanudar();
      check('Con «Sonido: no» (o la música a 0, o la pestaña oculta) el tema se pausa; al volver sigue', todoParado && !expl2.paused && expl2.veces === 2);
      // El bucle: otra voz del mismo tema, fundido de igual potencia, y la vieja se suelta
      const [b0, b1] = BS.pistas.exploracion.bucle;
      expl2.currentTime = b1 - X / 2 - 11; R.paso();
      const sig = P.els[3], precarga = !!sig && sig.paused;
      if (sig) { sig.emitir('loadedmetadata'); sig.emitir('canplay'); }
      expl2.currentTime = b1 - X / 2 + 0.05; R.paso();
      const cruzando = sig && !sig.paused && Math.abs(sig.currentTime - (b0 - X / 2)) < 1e-6 && R.real.g.gain.objetivo > 0 && R.estado().bucles === 1;
      P.avanzar(X + 0.2); R.paso();
      check('Bucle sin corte: 12 s antes se precarga, en el punto de bucle entra con un fundido de ' + X + ' s y la voz vieja se suelta',
        precarga && cruzando && expl2.paused && expl2.src === '' && R.estado().elementos === 1 && R.estado().sonando === 'exploracion', JSON.stringify(R.estado()));
      // Solo una pista a la vez aunque se cambie deprisa
      R.poner('alegre'); P.avanzar(0.3); R.poner('final'); P.avanzar(0.3); R.poner('explora');
      check('Cambios seguidos y rápidos: nunca más de una pista subiendo; las anteriores se apuran', subiendo() === 1 && R.salientes.every(s => s.g.gain.objetivo === 0) && R.salientes.filter(s => s.fin > P.c.currentTime + 1).length <= 1, subiendo());
      R.cerrar();
      check('Cerrar el reproductor suelta todos los <audio>', R.estado().elementos === 0 && P.els.every(el => el.paused));
      // Alternativa: un tema que no carga → su pista sintética, y no se vuelve a pedir
      const Q = montar();
      Q.rep.poner('tormenta'); Q.els[0].emitir('error'); Q.rep.poner('tormenta'); Q.avanzar(2); Q.rep.poner('tormenta');
      check('Si un tema no carga, el juego sigue con su alternativa sintética (tormenta → tensión) y no lo pide más', Q.rep.estado().sonando === 'tension' && Q.mem.fallo.tormenta && Q.els.length === 1, JSON.stringify(Q.rep.estado()));
      const Q2 = montar();
      Q2.rep.poner('criadero'); Q2.avanzar(BS.esperaCarga + 0.5); Q2.rep.poner('criadero');
      const porTiempo = Q2.rep.estado().sonando === 'explora';
      Q2.listo(Q2.els[0]); Q2.rep.poner('criadero');
      check('Si un tema tarda más de ' + BS.esperaCarga + ' s suena la alternativa, y el tema entra en cuanto carga', porTiempo && Q2.rep.estado().sonando === 'criadero' && Q2.rep.estado().salientes[0] === 'explora', JSON.stringify(Q2.rep.estado()));
      const Q3 = montar({ rechazo: 'NotAllowedError' });
      Q3.rep.poner('exploracion'); Q3.listo(Q3.els[0]); Q3.rep.poner('exploracion'); await espera(); Q3.rep.poner('exploracion');
      const bloq = Q3.rep.estado().sonando === 'explora' && Q3.mem.bloqueo;
      Q3.rep.gesto();
      check('Si el navegador no deja sonar el <audio> sin gesto (iOS), suena la sintética y el siguiente gesto lo desbloquea', bloq && !Q3.mem.bloqueo, JSON.stringify(Q3.rep.estado()));
      Q.rep.cerrar(); Q2.rep.cerrar(); Q3.rep.cerrar();
      // e) En vivo (si hay sonido): el reproductor del juego existe y respeta el silencio
      if (eng) {
        const m0 = A.vol.muted; A.vol.muted = true; tick();
        const parado = eng.rep.estado() && [eng.rep.real].filter(p => p && p.archivo).every(p => p.voces.every(v => v.el.paused));
        A.vol.muted = m0; tick();
        check('En vivo: con «Sonido: no» el tema en archivo queda en pausa', parado);
      }
    }

    async function test() {
      const out = [];
      const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const errores0 = (window.__aveErrores || []).length, perfil0 = S.profile, ultimo0 = ultimo, mudo0 = A.vol.muted, sim0 = sim, horaF0 = horaForzada;
      const ctxAntes = !!A.ctx, vol0 = JSON.stringify({ sfx: A.vol.sfx, master: A.vol.master, voice: A.vol.voice });
      const tit = $('title'), fin = $('end'), crea = $('creator'), com = $('comic');
      const hidden0 = [fin && fin.hidden, crea && crea.hidden, com && com.hidden], ev0 = S.event, clase0 = document.body.classList.contains('retos-on');
      const stGuardado = { pista: st.pista, mom: st.mom, desde: st.desde, cand: st.cand, desdeCand: st.desdeCand, cambios: st.cambios, historial: st.historial.slice() };
      guardarAlCambiar = false;
      try {
        // 1. Peso y arranque
        const idx = await fetch('index.html').then(r => r.text()).catch(() => null);
        check('El módulo no va en la descarga inicial (index.html no lo lista)', idx == null || !/musica\.js/.test(idx));
        check('La API está completa', ['estado', 'leer', 'set', 'elegir', 'momentoDe', 'evaluar', 'simular', 'calcularAmbiente', 'renderizar', 'test'].every(k => typeof api[k] === 'function'));
        tick(); tick();
        check('El módulo no crea ningún AudioContext por su cuenta (sin gesto no hay aviso de autoplay)', !!A.ctx === ctxAntes);
        check('Sin interacción: el estado lo dice y no hay errores', api.estado().contexto === (A.ctx ? A.ctx.state : 'sin') && api.estado().fallos === 0 && (window.__aveErrores || []).length === errores0, api.estado().contexto);

        // 2. La pista según el momento
        const base = Object.assign({}, BASE_E);
        const casos = [
          ['portada', { portada: true }, 'alegre'], ['creador', { creador: true }, 'alegre'], ['mundo libre (Aventura y Vuelo libre)', {}, 'exploracion'],
          ['menú de Retos', { retos: true }, 'carrera'], ['carrera contra las cotorras', { retos: true, reto: 'carrera' }, 'carrera'],
          ['contrarreloj del río', { retos: true, reto: 'rio' }, 'carrera'], ['banquete', { retos: true, reto: 'banquete' }, 'carrera'],
          ['¡Escapa de la tormenta!', { retos: true, reto: 'tormenta' }, 'tormenta'], ['crecida del cap. 1', { evento: true }, 'tormenta'],
          ['lluvia sostenida', { lluvia: true }, 'exploracion'], ['criadero', { criadero: true }, 'criadero'], ['eclosión (criadero)', { criadero: true, eclosion: true }, 'criadero'],
          ['criadero encima de la portada (Mi nido)', { criadero: true, portada: true }, 'criadero'],
          ['final del capítulo', { fin: true }, 'final'], ['final con Retos abierto', { fin: true, retos: true }, 'final'],
          ['portada con crecida', { portada: true, evento: true }, 'alegre'], ['Retos con crecida', { retos: true, reto: 'carrera', evento: true }, 'carrera'],
        ];
        const malos = casos.filter(([, e, esp]) => elegir(Object.assign({}, base, e), 'exploracion') !== esp).map(c => c[0] + ' → ' + elegir(Object.assign({}, base, c[1]), 'exploracion'));
        check('Cada momento elige su pista: mundo exploración, Retos carrera, tormenta y crecida tormenta, criadero, portada y creador alegre, final', !malos.length, malos.join(', '));
        check('El cómic abierto tras el final sigue con la música del final; sin final, no', elegir(Object.assign({}, base, { comic: true }), 'final') === 'final' && elegir(Object.assign({}, base, { comic: true }), 'exploracion') === 'exploracion');
        check('Hay cinco pistas con compás, tempo y fundido propios', Object.keys(PISTAS).length === 5 && Object.values(PISTAS).every(p => p.bpm > 40 && p.compases === 8 && p.fade >= 1 && typeof p.paso === 'function'));

        // 3. Los cambios con calma y fundido
        st.pista = null; st.cand = null; st.cambios = 0; st.historial = [];
        evaluar(base, 0); evaluar({ ...base, evento: true }, 1000); evaluar({ ...base, evento: true }, 1800); evaluar(base, 2000); evaluar(base, 5000); evaluar(base, 7100);
        check('La crecida entra en menos de un segundo y sale tras 5 s de calma', JSON.stringify(st.historial) === '["exploracion","tormenta","exploracion"]' && st.pista === 'exploracion', JSON.stringify(st.historial));
        st.pista = null; st.cand = null; st.cambios = 0; st.historial = [];
        evaluar({ ...base, portada: true }, 0); evaluar({ ...base, creador: true }, 100); evaluar(base, 200); evaluar(base, 1000); evaluar({ ...base, retos: true }, 1100); evaluar({ ...base, retos: true }, 1900); evaluar({ ...base, fin: true }, 2000); evaluar({ ...base, fin: true }, 2800);
        // Un parpadeo (la portada se cierra y Retos aún no ha abierto) no cambia de pista
        evaluar(base, 3000); evaluar({ ...base, retos: true }, 3200); evaluar({ ...base, retos: true }, 3400);
        check('Portada → creador sigue alegre; luego exploración, carrera y final, y un parpadeo de 0,2 s no cambia nada', JSON.stringify(st.historial) === '["alegre","exploracion","carrera","final"]', JSON.stringify(st.historial));
        // Cambios pequeños no reinician: menú de Retos → carrera → resultados → «Otra vez»; elegir otro huevo o eclosionar en el criadero
        st.pista = null; st.cand = null; st.cambios = 0; st.historial = [];
        evaluar({ ...base, retos: true }, 0); evaluar({ ...base, retos: true, reto: 'carrera' }, 900); evaluar({ ...base, retos: true, reto: 'carrera' }, 5000); evaluar({ ...base, retos: true, reto: 'carrera' }, 9000);
        evaluar({ ...base, retos: true, reto: 'rio' }, 9500); evaluar({ ...base, retos: true, reto: 'rio' }, 12000);
        const sinCambio = st.cambios === 1;
        evaluar({ ...base, criadero: true }, 13000); evaluar({ ...base, criadero: true }, 14000); evaluar({ ...base, criadero: true, eclosion: true }, 15000); evaluar({ ...base, criadero: true }, 25000);
        check('Menú de Retos → carrera → «Otra vez» → río no cambia de pista; el criadero con su eclosión es una sola entrada', sinCambio && JSON.stringify(st.historial) === '["carrera","criadero"]', JSON.stringify(st.historial));
        evaluar(base, 26000); evaluar(base, 26800);
        check('Al salir del criadero (o de Retos) vuelve la exploración', st.pista === 'exploracion', st.pista);
        // El estado real del juego (sin tocar la partida: se enciende y se apaga en el mismo instante)
        st.pista = null; st.cand = null;
        if (fin) fin.hidden = false; const eFin = leerEntradas(); if (fin) fin.hidden = hidden0[0];
        if (crea) crea.hidden = false; const eCrea = leerEntradas(); if (crea) crea.hidden = hidden0[1];
        document.body.classList.add('retos-on'); const eRetos = leerEntradas(); if (!clase0) document.body.classList.remove('retos-on');
        S.event = { t: 0, dur: 20 }; const eEv = leerEntradas(); S.event = ev0;
        const eLibre = leerEntradas();
        check('Lee el panel final, el creador, el Modo Retos y la crecida del juego', eFin.fin && eCrea.creador && eRetos.retos && eEv.evento && !eLibre.fin && !eLibre.evento && eLibre.portada === !!(tit && tit.open), JSON.stringify([eFin.fin, eCrea.creador, eRetos.retos, eEv.evento]));
        { // Qué reto se juega y si el criadero está abierto (con dobles por un instante; las APIs de verdad vuelven en el finally)
          const rt0 = G.retosApi, cr0 = G.criadero;
          let eTor = null, eCri = null;
          try {
            G.retosApi = { activo: true, reto: 'tormenta' }; eTor = leerEntradas();
            G.retosApi = rt0; G.criadero = Object.assign({}, cr0 || {}, { abierto: () => true }); eCri = leerEntradas();
          } finally { G.retosApi = rt0; G.criadero = cr0; }
          check('Lee qué reto se juega (la tormenta) y si el criadero está abierto', eTor.retos && eTor.reto === 'tormenta' && elegir(eTor, 'exploracion') === 'tormenta' && eCri.criadero && elegir(eCri, 'exploracion') === 'criadero' && !leerEntradas().arena, JSON.stringify([eTor.reto, eCri.criadero]));
        }

        // 4. Ambiente por zona y hora
        const noche0 = calcularAmbiente({ hora: 22 }), dia0 = calcularAmbiente({ hora: 12 }), rio0 = calcularAmbiente({ hora: 12, rio: 1 }), alto0 = calcularAmbiente({ hora: 12, sobreSuelo: 40, y: 90 });
        check('De día suenan aves y no coquíes; de noche, coquíes y grillos y no aves', dia0.aves > 0.9 && dia0.coquies === 0 && dia0.grillos === 0 && noche0.coquies > 0.9 && noche0.grillos > 0.5 && noche0.aves === 0, `día ${dia0.aves.toFixed(2)}/${dia0.coquies.toFixed(2)} · noche ${noche0.aves.toFixed(2)}/${noche0.coquies.toFixed(2)}`);
        const atardecer = calcularAmbiente({ hora: 18.25 });
        check('El atardecer mezcla las dos cosas poco a poco', atardecer.aves > 0.05 && atardecer.aves < 0.95 && atardecer.coquies > 0.05 && Math.abs(atardecer.aves + atardecer.coquies - 1) < 0.001 && noche(5.75) > 0.05 && noche(5.75) < 0.95, atardecer.aves.toFixed(2));
        check('El río se oye cerca del agua y no lejos; el mar es otra capa', rio0.rio === 1 && dia0.rio === 0 && calcularAmbiente({ mar: 1 }).mar === 1 && calcularAmbiente({ mar: 1 }).rio === 0);
        check('El viento sube con la altura (en el suelo es una brisa)', alto0.viento > 0.9 && dia0.viento > 0.05 && dia0.viento < 0.2 && calcularAmbiente({ evento: true }).viento > dia0.viento + 0.3, `${dia0.viento.toFixed(2)} → ${alto0.viento.toFixed(2)}`);
        const tormenta0 = calcularAmbiente({ hora: 12, evento: true });
        { // BM34: bosque lejos del agua, río cerca del agua, lluvia en la crecida, martillo al construir, nada con G.quiet
          const bos0 = calcularAmbiente({ hora: 12, sobreSuelo: 1 }), orilla0 = calcularAmbiente({ hora: 12, rio: 1 }), cielo0 = calcularAmbiente({ hora: 12, sobreSuelo: 60, y: 90 });
          check('Bosque donde no hay agua; el río lo desplaza y a 60 m de altura casi no se oye', bos0.bosque > 0.9 && orilla0.bosque === 0 && orilla0.rio === 1 && bos0.rio === 0 && cielo0.bosque < 0.1, [bos0.bosque, orilla0.bosque, cielo0.bosque].map(v => v.toFixed(2)).join(' · '));
          check('La lluvia suena en la crecida y el aguacero, y no con sol', tormenta0.lluvia > 0.9 && calcularAmbiente({ lluvia: true }).lluvia > 0.9 && bos0.lluvia === 0);
          const q0 = G.quiet;
          try {
            G.quiet = true; const sinSonido = A.martillar(4);
            G.quiet = false; const conSonido = A.martillar(4);
            check('El martillo da 4 golpes, 1 con «Reducir movimiento» y ninguno con G.quiet', sinSonido === 0 && (conSonido === 4 || (G.renderer.REDUCED && conSonido === 1)) && A.has('martillo'), `${sinSonido}/${conSonido}`);
          } finally { G.quiet = q0; }
        }
        check('En la tormenta casi no hay aves; detrás de la portada todo baja', tormenta0.aves < 0.2 && calcularAmbiente({ hora: 12, portada: true }).aves < 0.4 && calcularAmbiente({ hora: 12, rio: 1, retos: true }).rio < 0.8);
        check('La hora sale de S.hora si existe; sin ella, de día como el cielo', (() => { const h = S.hora; S.hora = 21.5; const a = horaActual(); S.hora = 3; const b = horaActual(); if (h === undefined) delete S.hora; else S.hora = h; const r = horaActual(); return a === 21.5 && b === 3 && (h !== undefined || r === 12); })());
        check('noche(): día de 6:30 a 17:30, noche de 19 a 5', noche(12) === 0 && noche(7) === 0 && noche(20) === 1 && noche(2) === 1 && noche(0) === 1 && noche(23.9) === 1);

        // 5. Ajustes
        S.profile = Object.assign({}, perfil0, { mezcla: undefined }); ultimo = null;
        const d0 = leer();
        check('De fábrica: música 55 y ambiente 50', d0.musica === 55 && d0.ambiente === 50);
        set('musica', 30); set('ambiente', 85);
        const ser = JSON.parse(G.guardado.serialize(true));
        check('Los volúmenes se guardan en la partida (S.profile.mezcla), como los de accesibilidad', ser.profile.mezcla && ser.profile.mezcla.musica === 30 && ser.profile.mezcla.ambiente === 85, JSON.stringify(ser.profile.mezcla));
        S.profile = Object.assign({}, perfil0, { mezcla: { musica: 0, ambiente: 0 } }); G.emit('apply');
        check('Al cargar una partida se aplican los volúmenes que trae', leer().musica === 0 && leer().ambiente === 0);
        S.profile = ser.profile; G.emit('apply');
        check('Cargar la partida guardada devuelve 30 y 85', leer().musica === 30 && leer().ambiente === 85);
        S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
        check('«Comenzar de cero» conserva lo elegido en esta sesión', leer().musica === 30 && leer().ambiente === 85);
        G.emit('nuevoEstudiante'); S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
        check('«Nuevo estudiante» vuelve a los de fábrica', leer().musica === 55 && leer().ambiente === 50);
        set('musica', 999); set('ambiente', -4); set('otro', 5);
        check('Los valores se acotan a 0 a 100 y lo desconocido se ignora', leer().musica === 100 && leer().ambiente === 0 && !('otro' in leer()));
        S.profile = Object.assign({}, perfil0, { mezcla: { musica: 'alto', ambiente: NaN } });
        check('Un valor dañado vuelve al de fábrica', leer().musica === 55 && leer().ambiente === 50);
        set('musica', 42);
        check('Se redondea a pasos de 5', leer().musica === 40);
        check('Los volúmenes de música y ambiente son independientes de los efectos', JSON.stringify({ sfx: A.vol.sfx, master: A.vol.master, voice: A.vol.voice }) === vol0);
        check('La curva sube sin saltos y 0 es silencio', ganancia(0) === 0 && ganancia(100) === 1 && ganancia(50) < ganancia(70) && ganancia(55) < 0.31);

        // 6. El menú de pausa
        const filaM = sec && sec.querySelector('#mz-musica'), filaA = sec && sec.querySelector('#mz-ambiente');
        check('Sección «Música y ambiente» en la pausa, con dos deslizadores etiquetados', !!sec && !!menu && menu.contains(sec) && filaM && filaA && sec.querySelectorAll('label[for]').length === 2 && filaM.getAttribute('aria-valuetext') != null);
        set('musica', 65); set('ambiente', 25);
        check('Los deslizadores muestran lo elegido', +filaM.value === 65 && +filaA.value === 25 && sec.querySelector('output[for=mz-musica]').textContent === '65');
        filaM.value = '80'; filaM.dispatchEvent(new Event('input', { bubbles: true }));
        check('Mover el deslizador cambia el volumen al instante', leer().musica === 80);
        S.profile = perfil0;

        // 7. Silencio, modos y plantas de CPU
        const silencio0 = A.vol.muted; A.vol.muted = true; tick();
        check('Con el botón «Sonido: no» el módulo no suena ni programa nada', api.estado().audible === false && api.estado().silencio === true);
        if (api.estado().buses) check('Con el sonido apagado los buses de música y ambiente se sueltan del master (WebAudio no los procesa)', api.estado().buses.m === false && api.estado().buses.a === false, JSON.stringify(api.estado().buses));
        A.vol.muted = silencio0;
        check('Calidad «bajo» → ambiente simple (sin música); táctil o 4 núcleos o menos → ligero; el resto → completo',
          modoDe('bajo', false, 16) === 'simple' && modoDe('bajo', true, 2) === 'simple' && modoDe('medio', true, 8) === 'ligero' && modoDe('alto', false, 4) === 'ligero' && modoDe('alto', false, 8) === 'completo');
        check('El modo del juego sale de la calidad del renderizador (en «bajo», solo ambiente)', R.calidad.nivel === 'bajo' ? api.estado().modo === 'simple' : api.estado().modo !== 'simple', R.calidad.nivel + ' → ' + api.estado().modo);

        // 8. Sonido real (sin conexión)
        const C = OC();
        if (!C) check('OfflineAudioContext disponible', false, 'sin soporte');
        else {
          const r = {}, flojas = [];
          for (const n of Object.keys(PISTAS)) {
            r[n] = await renderizar(n, 9, 'completo');
            if (!(r[n].nan === 0 && r[n].rms > 0.004 && r[n].pico < 0.9 && r[n].rms < 0.25)) flojas.push(`${n}: pico ${r[n].pico.toFixed(2)} · rms ${r[n].rms.toFixed(3)} · raros ${r[n].nan}`);
          }
          check('Las 5 pistas suenan: ni mudas ni saturadas ni con muestras raras', !flojas.length, flojas.join(' | ') || Object.entries(r).map(([n, v]) => n + ' ' + v.rms.toFixed(3)).join(' · '));
          check('Modo completo: nunca más de 28 voces a la vez', Object.values(r).every(v => v.voces <= v.LIM && v.LIM === 28), Object.entries(r).map(([n, v]) => n + ' ' + v.voces).join(' · '));
          const rl = {}; for (const n of Object.keys(PISTAS)) rl[n] = await renderizar(n, 7, 'ligero');
          check('Modo ligero: pocas voces (8 como mucho) y todas siguen sonando', Object.values(rl).every(v => v.voces <= 8 && v.LIM === 8 && v.nan === 0 && v.rms > 0.003), Object.entries(rl).map(([n, v]) => n + ' ' + v.voces + '/' + v.rms.toFixed(3)).join(' · '));
          check('Sin chasquidos: ningún salto brusco entre muestras seguidas', Object.values(r).every(v => v.salto < 0.35), Object.entries(r).map(([n, v]) => n + ' ' + v.salto.toFixed(2)).join(' · '));
          // Fundido cruzado entre dos pistas: sin huecos ni saltos
          const f = await renderizar('explora', 12, 'completo', (c, mo, p) => { const nueva = mo.pista('tension', 5, true); mo.cruzar(p, nueva, 5, 2.5); nueva.programar(11.9); });
          const sr = f.buf.sampleRate; let minimo = 1; const a0 = analizar(f.buf, 2.5, 4.5).rms, a1 = analizar(f.buf, 9, 11.5).rms;
          for (let t = 4.5; t < 9; t += 0.5) minimo = Math.min(minimo, analizar(f.buf, t, t + 0.5).rms);
          check('El fundido entre explora y tensión no deja huecos ni chasquidos', f.nan === 0 && a0 > 0.01 && a1 > 0.01 && minimo > 0.4 * Math.min(a0, a1) && f.salto < 0.35, `antes ${a0.toFixed(3)} · después ${a1.toFixed(3)} · mínimo ${minimo.toFixed(3)} · salto ${f.salto.toFixed(2)}`);
          // Ambiente
          const aguas = await renderizarAmbiente({ rio: 1, viento: 0.5 }, 5), callado = await renderizarAmbiente({}, 5), noch = await renderizarAmbiente({ coquies: 1, grillos: 1 }, 6), dia = await renderizarAmbiente({ aves: 1 }, 8), simp = await renderizarAmbiente({ rio: 1, mar: 1, viento: 1 }, 5, 'simple');
          check('El ambiente suena cuando hay río y viento, y calla con todo a 0', aguas.rms > 0.005 && aguas.nan === 0 && callado.pico < 0.0005, `río ${aguas.rms.toFixed(3)} · callado ${callado.pico.toFixed(4)}`);
          check('Hay aves de día y coquíes de noche', dia.eventos >= 1 && noch.eventos >= 1 && noch.rms > 0.0005 && dia.rms > 0.0005, `aves ${dia.eventos}/${dia.rms.toFixed(4)} · coquíes ${noch.eventos}/${noch.rms.toFixed(4)}`);
          check('Ambiente simple: 3 capas de agua, mar y viento (sin grillos) y suena', simp.rms > 0.005 && !simp.capas.includes('grillos'), simp.capas.join());
          check('El ambiente no se pasa de volumen (pico bajo 0,6 con todo al máximo)', aguas.pico < 0.6 && simp.pico < 0.6 && noch.pico < 0.6 && dia.pico < 0.6, [aguas, simp, noch, dia].map(v => v.pico.toFixed(2)).join(' · '));
        }

        // 10. Banda sonora (los temas de Kelvin)
        await probarBanda(check);

        // 9. Otros enganches
        const ranas0 = ranasHasta; ranasHasta = 0;
        if (A.has('co')) { A.play('co'); check('Si suena el Simon de los coquíes, las ranas del ambiente callan', ranasHasta > performance.now() + 5000); }
        ranasHasta = ranas0;
        G.emit('voz', { charIndex: 3 }); const baja = duck(); G.emit('voz', { fin: true, texto: '' });
        check('La música baja mientras habla la voz del Aula y vuelve al terminar', baja < 1 && duck() === 1);
        const dlg0 = G.dialogo; G.dialogo = { activo: () => true }; const bajaDlg = duck(); G.dialogo = dlg0;
        check('La música baja durante un diálogo y vuelve al cerrarlo', bajaDlg === DIALOGO_DUCK && duck() === 1, bajaDlg);
        if (A.esSuave) { const r0 = A.reducido; A.reducido = true; const suaves = ['trueno', 'crecida', 'construir'].every(A.esSuave) && !A.esSuave('pickup'); A.reducido = false; const normal = !A.esSuave('trueno'); A.reducido = r0;
          check('Con «Reducir movimiento» trueno, crecida y martillazos suenan a la mitad; sin él, normal', suaves && normal); }
        const ecl0 = eclosionAhora; eclosionAhora = true; const bajaHuevo = duck(); eclosionAhora = ecl0;
        check('Mientras un huevo eclosiona la música baja (el efecto de la eclosión no: va por el bus de efectos)', bajaHuevo === BANDA_SONORA.eclosion && bajaHuevo < 0.5 && duck() === 1, bajaHuevo);
        check('Ningún fallo interno y ningún error de JavaScript de la página', fallos === 0 && (window.__aveErrores || []).length === errores0, ultimoFallo);
      } catch (e) {
        check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e);
      } finally {
        S.profile = perfil0; ultimo = ultimo0; A.vol.muted = mudo0; sim = sim0; horaForzada = horaF0; guardarAlCambiar = true;
        S.event = ev0; if (fin) fin.hidden = hidden0[0]; if (crea) crea.hidden = hidden0[1]; if (com) com.hidden = hidden0[2];
        if (!clase0) document.body.classList.remove('retos-on');
        Object.assign(st, stGuardado); ranasHasta = 0; hablaHasta = 0; sync();
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    function estado() {
      const c = A.ctx, b = eng ? eng.rep.estado() : null;
      return {
        pista: st.pista, momento: st.mom, modo: eng ? eng.modo : modoDe(R && R.calidad && R.calidad.nivel, TACTIL, NUCLEOS), contexto: c ? c.state : 'sin',
        silencio: !!A.vol.muted, audible: !!(c && c.state === 'running' && !A.vol.muted && !document.hidden && leer().musica + leer().ambiente > 0),
        sonando: b ? b.sonando : null, banda: b, mezcla: leer(), ambiente: niv, hora: horaActual(), historial: st.historial.slice(), cambios: st.cambios,
        voces: eng ? eng.motor.maxVoces() : 0, buses: eng ? Object.assign({}, eng.conectado) : null, pasos: b ? b.pasos : 0, fallos, ultimoFallo, muerto,
      };
    }
    const api = G.musicaApi = {
      estado, leer, set, elegir, momentoDe, banda: BANDA_SONORA, evaluar: (e, ms) => evaluar(Object.assign({}, BASE_E, e), ms == null ? performance.now() : ms),
      simular(e) { sim = e || null; tick(); return estado(); }, hora(h) { horaForzada = h == null ? null : h; return horaActual(); },
      calcularAmbiente, renderizar, renderizarAmbiente, tick, test,
    };
    return api;
  };
})();
