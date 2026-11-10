/* Juego · cómic personal (dueño: Save & Cómic Engineer)
   - Viñetas de eventos reales: si un evento no ocurrió, su viñeta no existe. Cuando G.eventos registra un evento que tiene
     viñeta, el cómic guarda la apariencia del jugador de ese momento (S.comic.vinetas[id] = { look, seq }) y, si el pack
     no capturó el mundo para esa viñeta, lo captura. Cambiarse de ropa después no reescribe la historia. Las partidas
     viejas sin look usan el actual.
   - Viñetas del motor (cualquier pack; comic.vinetasMotor = false las quita, o se redefine una con su id): ganchos de otros
     sistemas que se vuelven eventos narrativos una vez por partida y nunca en las baterías (G.quiet):
       G.emit('posado', { tipo, que, altura }) (movimiento): techo o cumbrera → FirstRoofPerch; rama a 2,5 m o más →
         FirstHighBranchPerch.
       G.emit('criadero', 'nido') (Iguaca presenta el nido) → NestAppeared; G.emit('criadero', 'eclosion', { id, imagen? })
         → ChickHatched (con la foto de la escena del criadero; sin foto, el nido y la eclosión se ilustran).
     Las viñetas van en el orden en que pasaron.
   - Gags del pichón (DIVERSION_CAP1 mejoras 5 y 9): src/game/gags.js emite G.emit('criadero', 'gag', { gag, clave, foto() }) y
     src/game/momentos.js lo anota una vez por partida (ChickTumbled, ChickChasedButterfly, ChickNappedOnFind, ChickCopiedGesture)
     con su foto. Aquí, sin foto ni lienzo, cada gag tiene su ilustración (ilustracion: 'pichon_…'). Sin el gag, no hay viñeta.
   - «Foto» (actores.js: Gestos → Foto → un gesto; src/game/momentos.js la pone en el cómic): con Foto activa, las teclas 1–7
     (que ya hacen el gesto, input.js) también toman la foto.
   - Texto elegido de una lista (sin texto libre: seguridad infantil): S.comic.captions[id] = índice de la opción elegida
     (0 = el texto de la historia); S.comic.title = uno de los títulos.
   - Página de la plantilla aprobada de Kelvin (3-nov; src/game/comic_plantilla.js): 1536×2304 (2:3), 6 viñetas 2 × 3 con la
     captura real de cada momento, cintillo con título de escena (tipo de evento), globo, narración, círculo con la cotorra del
     jugador en una pose real según el evento (con su look de ese momento), decoraciones si el evento las justifica, «¿Qué aprendí?»,
     «Mi enseñanza de vida», el personaje central y los 4 botones (zonas de acción en el editor). Con más de 6 escenas el niño
     elige cuáles van (S.comic.ocultas); con menos, los huecos dicen «Escena por descubrir». comicLayout (la cuadrícula anterior)
     queda para manga.js.
   - PNG fiable: canvas.toBlob (o toDataURL de respaldo), con la firma PNG y el IHDR (ancho y alto) verificados. Si el lienzo
     queda contaminado, se recompone solo con imágenes embebidas.
   - PDF de una página sin librerías (el JPEG del cómic con DCTDecode, ~60 líneas). Una librería como jsPDF (~300 KB) no
     aporta nada para una sola imagen y el visor de Claude solo deja cargar CDNs de la lista.
   - Entrega: capacidad 'downloads' del visor (await window.claude?.use?.('downloads')). Si no está, la imagen queda a la
     vista para guardarla (mantener pulsado o clic derecho), con los botones Abrir y Copiar imagen; en el visor se intenta
     copiarla al portapapeles. <a download> solo fuera del visor, porque dentro no funciona.
   Datos: pack.comic { marca, tituloDefecto, titulos?: [textos], archivo, pdfTitulo, pdfProductor, capturas: [claves],
     portadas: { valorDelSelect: claveDeCaptura },
     vinetas: [{ id, img: 'portrait'|claveDeCaptura, needs: ClaveDeEvento, texto: string | (S, G) => string, opciones?: [string | (S, G) => string],
       gag?: 'caida'|'mariposa'|'siesta'|'imitar' (solo para la prueba), ilustracion?: 'nido'|'eclosion'|'rama'|'pichon_cae'|'pichon_mariposa'|'pichon_duerme'|'pichon_imita', sinCaptura?, encuadre? }],
     tipo?, pose?, dialogo?|pensamiento?, efecto?: 'fuush'|'confusion'|'bandera'|'record'|'pesca'|'construir'|'patrulla', marca?(S) (valor del récord) }],
     plantilla: { titulos: { tipo: texto }, aprendi: [{ needs, texto }], ensenanza: [{ needs, texto }] },
     decorar?(ctx, viñeta, caja, altoImagen, G) (de la página anterior; la plantilla no lo usa) }.
   Estado: S.comic { title, order, captions, vinetas, ocultas?: [ids fuera de la página], aprendi?: índice, ensenanza?: índice }.
   Pruebas: AV.comicTest(): evento real → viñeta con el look → PNG válido de 1536×2304 y no en blanco → entrega; y la prueba mínima
   de la plantilla (plantillaTest: logo original, 6 viñetas, dos cotorras, poses, decoraciones, botones, EN). */
AVE.module('comic', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, C = G.pack.comic || {};
  const loadImg = G.assets.image;
  const FILE = C.archivo || 'mi-comic';
  // Página de la plantilla (comic_plantilla.js): 1536×2304. comicLayout (la cuadrícula anterior) queda para manga.js y sus pruebas
  const PAG = (G.comicPlantilla && G.comicPlantilla.PAGINA) || { w: 1536, h: 2304 }, W = PAG.w, H = PAG.h;
  const LW = 1080, LH = 1520, TOP = 380;
  const L = (es, en) => ((G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || (G.aula && G.aula.aj && G.aula.aj.idioma === 'en') ? en : es);
  const enAhora = () => (G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || (G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  // CG-37: la plantilla de Kelvin en los caps. 2 a 6. No se editan los packs: la historia, los textos y las fichas se quedan.
  // «¿Qué aprendí?» es el dato ya verificado de lecciones.js (nada nuevo). La enseñanza sale de lo que pasa en el capítulo.
  const CG37 = {
    ep2: {
      titulos: ['Mi capítulo 2', 'Un lugar para todos'],
      aprendi: [
        { needs: 'SiteChosen', es: 'En pendientes más empinadas, el agua de lluvia puede correr con más fuerza y arrastrar más suelo.', en: 'On steeper slopes, rainwater can run with more force and carry away more soil.' },
        { needs: 'NestPlaced', es: 'El techo de dos aguas deja correr la lluvia hacia los dos lados. En la casa criolla de Puerto Rico, el techo solía ser de teja o de planchas de zinc.', en: 'A gable roof sheds rain to both sides. In Puerto Rico\'s criollo house, the roof was usually made of tile or zinc sheets.' },
      ],
      ensenanza: [
        { needs: 'ListenChoice', es: 'Pregunté antes de construir.', en: 'I asked before building.' },
        { needs: 'NestPlaced', es: 'La primera prueba falló. Lo cambié y volví a probar.', en: 'The first test failed. I changed it and tried again.' },
        { needs: 'PlayerCharacterCreated', es: 'Cada aventura empieza con un primer paso.', en: 'Every adventure starts with a first step.' },
      ],
      vinetas: {
        intro: { tipo: 'comienzo', pose: 'crucero' },
        sitio: { tipo: 'hallazgo', pose: 'posarse', dialogo: () => L('Miré los tres sitios.', 'I looked at the three places.') },
        escuchar: { tipo: 'desafio', pose: 'posarse', dialogo: () => L('Primero escuché.', 'I listened first.') },
        casa: { tipo: 'meta', pose: 'celebrar', dialogo: () => L('¡La casa aguantó!', 'The house held!'), efecto: 'bandera' },
      },
    },
    ep3: {
      titulos: ['Mi capítulo 3', 'Más allá de la bahía'],
      aprendi: [
        { needs: 'BoatLaunched', es: 'Un objeto flota si es menos denso que el agua; la forma del casco cambia cuánta agua aparta.', en: 'An object floats if it is less dense than water; the shape of a hull changes how much water it pushes aside.' },
        { needs: 'HelmChosen', es: 'De día el viento suele soplar del mar hacia la tierra, y de noche de la tierra hacia el mar.', en: 'By day the wind tends to blow from the sea to the land, and at night from the land to the sea.' },
      ],
      ensenanza: [
        { needs: 'BoatLaunched', es: 'La primera botadura falló. Cambié una parte y volví a probar.', en: 'The first launch failed. I changed one part and tried again.' },
        { needs: 'Chapter3Completed', es: 'En la otra orilla pregunté antes de contar.', en: 'On the other shore I asked before I told.' },
        { needs: 'PlayerCharacterCreated', es: 'Cada aventura empieza con un primer paso.', en: 'Every adventure starts with a first step.' },
      ],
      vinetas: {
        intro: { tipo: 'comienzo', pose: 'crucero' },
        bote: { tipo: 'solucion', pose: 'aterrizaje', dialogo: () => L('¡Esta vez flotó!', 'This time it floated!') },
        senales: { tipo: 'desafio', pose: 'posarse', dialogo: () => L('Acordamos las señales.', 'We agreed on the signals.') },
        llegada: { tipo: 'meta', pose: 'celebrar', dialogo: () => L('¡Llegamos!', 'We made it!'), efecto: 'bandera' },
      },
    },
    ep4: {
      titulos: ['Mi capítulo 4', 'El precio del progreso', 'El primer cruce'],
      aprendi: [
        { needs: 'ShoreSurveyed', es: 'Las raíces de los árboles de la orilla sujetan la tierra y ayudan a que el río no se la lleve.', en: 'The roots of riverside trees hold the soil and help keep the river from carrying it away.' },
        { needs: 'AgreementMade', es: 'Las hojas que caen al río son alimento para pequeños animales del agua.', en: 'Leaves that fall into the river are food for small water animals.' },
      ],
      ensenanza: [
        { needs: 'TradeoffSeen', es: 'Ninguna opción lo da todo: hay que decir qué se cuida.', en: 'No option gives everything: you have to say what you will take care of.' },
        { needs: 'AgreementMade', es: 'Decidimos con todas las voces, no solo con la mía.', en: 'We decided with every voice, not only mine.' },
        { needs: 'PlayerCharacterCreated', es: 'Cada aventura empieza con un primer paso.', en: 'Every adventure starts with a first step.' },
      ],
      vinetas: {
        intro: { tipo: 'comienzo', pose: 'crucero' },
        orilla: { tipo: 'hallazgo', pose: 'posarse', dialogo: () => L('Miré la orilla primero.', 'I looked at the bank first.') },
        balanza: { tipo: 'desafio', pose: 'posarse', pensamiento: () => L('¿Qué se gana y qué se pierde?', 'What is gained and what is lost?') },
        acuerdo: { tipo: 'solucion', pose: 'aterrizaje', dialogo: () => L('Lo decidimos juntos.', 'We decided it together.') },
        cruce: { tipo: 'meta', pose: 'celebrar', dialogo: () => L('¡La abuela cruzó!', 'Grandma crossed!'), efecto: 'bandera' },
      },
    },
    ep5: {
      titulos: ['Las voces olvidadas'],
      aprendi: [
        { needs: 'TwoVoicesHeard', es: 'El sonido puede rodear algunos obstáculos, por eso a veces oímos un tambor aunque no lo veamos. Al alejarnos suele escucharse más débil.', en: 'Sound can bend around some obstacles, so sometimes we hear a drum even when we cannot see it. As we move away, it usually sounds fainter.' },
        { needs: 'RuinsRead', es: 'Amazona martinicana (loro de Martinica) y Amazona violacea (amazona de Guadalupe) están extintas según la UICN. Se conocen por relatos: Labat, 1742, y Du Tertre, 1654. No hay restos. El juego no dice cuándo ni por qué dejaron de existir.', en: 'Amazona martinicana (Martinique amazon) and Amazona violacea (Guadeloupe amazon) are extinct according to the IUCN. They are known from accounts: Labat, 1742, and Du Tertre, 1654. There are no remains. The game does not say when or why they ceased to exist.' },
      ],
      ensenanza: [
        { needs: 'RelayBuilt', es: 'La primera prueba se cortó donde no había nadie. Pedí ayuda.', en: 'The first test stopped where nobody was. I asked for help.' },
        { needs: 'Chapter5Completed', es: 'No lo hice sola: la señal llegó cuando había estaciones y ayuda.', en: 'I did not do it alone: the signal arrived when there were stations and help.' },
        { needs: 'PlayerCharacterCreated', es: 'Cada aventura empieza con un primer paso.', en: 'Every adventure starts with a first step.' },
      ],
      vinetas: {
        intro: { tipo: 'comienzo', pose: 'crucero' },
        voces: { tipo: 'hallazgo', pose: 'posarse', pensamiento: () => L('¿Dos voces?', 'Two voices?') },
        mensaje: { tipo: 'desafio', pose: 'posarse', dialogo: () => L('Ya está en orden.', 'It is in order now.') },
        ruinas: { tipo: 'solucion', pose: 'aterrizaje', dialogo: () => L('El Guardián recuerda.', 'The Guardian remembers.') },
        relevo: { tipo: 'regreso', pose: 'crucero', dialogo: () => L('Tres estaciones.', 'Three stations.') },
        final: { tipo: 'meta', pose: 'celebrar', dialogo: () => L('¡Se oyeron enteras!', 'They were heard in full!'), efecto: 'bandera' },
      },
    },
    ep6: {
      titulos: ['El cierre de la temporada', 'Mi capítulo 6', 'El pacto de los 36', 'La tripulación'],
      aprendi: [
        { needs: 'RaisedTogether', es: 'Para mover una pieza larga o difícil de manejar, puede ser más seguro coordinarse y pedir ayuda, o usar equipo adecuado.', en: 'To move a long or awkward piece, it can be safer to work together and ask for help, or to use the right equipment.' },
        { needs: 'CircleFormed', es: '36 se reparte en filas iguales de cinco formas: 1×36, 2×18, 3×12, 4×9 y 6×6. 35 solo de dos: 1×35 y 5×7.', en: '36 splits into equal rows in five ways: 1×36, 2×18, 3×12, 4×9 and 6×6. 35 only in two: 1×35 and 5×7.' },
      ],
      ensenanza: [
        { needs: 'PlanStuck', es: 'En mi primer plan solo estaba yo. Hizo falta repartir el trabajo.', en: 'In my first plan it was only me. The work had to be shared.' },
        { needs: 'GroupsListened', es: 'Escuché a los dos grupos antes de proponer.', en: 'I listened to both groups before I proposed.' },
        { needs: 'Chapter6Completed', es: 'Los asientos vacíos esperan. El pacto sigue abierto.', en: 'The empty seats are waiting. The pact stays open.' },
        { needs: 'PlayerCharacterCreated', es: 'Cada aventura empieza con un primer paso.', en: 'Every adventure starts with a first step.' },
      ],
      vinetas: {
        intro: { tipo: 'comienzo', pose: 'crucero' },
        tarjetas: { tipo: 'hallazgo', pose: 'posarse', dialogo: () => L('Cada uno trae algo.', 'Everyone brings something.') },
        atasco: { tipo: 'desafio', pose: 'aterrizaje', pensamiento: () => L('¿Y si lo hago sola?', 'What if I do it alone?') },
        levantada: { tipo: 'solucion', pose: 'crucero', dialogo: () => L('¡Subió!', 'It went up!') },
        circulo: { tipo: 'regreso', pose: 'posarse', dialogo: () => L('Escuché a los dos.', 'I listened to both.') },
        pacto: { tipo: 'meta', pose: 'celebrar', dialogo: () => L('El pacto sigue.', 'The pact goes on.'), efecto: 'bandera' },
      },
    },
  };
  (function aplicarCG37() {
    const ex = CG37[G.pack && G.pack.id];
    if (!ex || (C.plantilla && C.plantilla.aprendi && C.plantilla.aprendi.length)) return;
    if (!C.titulos || !C.titulos.length) C.titulos = ex.titulos.slice();
    C.plantilla = {
      titulos: { comienzo: 'El comienzo', hallazgo: 'El hallazgo', desafio: 'El desafío', solucion: 'La solución', regreso: 'El regreso', meta: '¡La meta!' },
      aprendi: ex.aprendi.map(o => ({ needs: o.needs, texto: () => L(o.es, o.en) })),
      ensenanza: ex.ensenanza.map(o => ({ needs: o.needs, texto: () => L(o.es, o.en) })),
    };
    const hola = S0 => L('¡Hola! Me llamo ' + ((S0.profile && S0.profile.name) || '') + '.', 'Hi! My name is ' + ((S0.profile && S0.profile.name) || '') + '.');
    for (const v of C.vinetas || []) {
      const a = ex.vinetas[v.id];
      if (!a) continue;
      if (v.id === 'intro' && v.dialogo == null) v.dialogo = hola;
      for (const k of Object.keys(a)) if (v[k] == null) v[k] = a[k];
    }
  })();
  // QA-105: la casilla de «En la página» medía 22×48 (vacía) y #c-aprendi se salía de la maqueta.
  if (!document.getElementById('cg28-comic')) {
    const st = document.createElement('style'); st.id = 'cg28-comic';
    st.textContent = '#comic :is(#c-aprendi,#c-ensenanza,#c-title){width:100%;max-width:100%;min-width:0;box-sizing:border-box}' +
      '#comic #c-panels .pv input{width:44px;height:44px;min-width:44px;min-height:44px;box-sizing:border-box}';
    document.head.appendChild(st);
  }
  const aviso = (t, ms) => { if (!G.quiet) G.ui.toast(t, ms); };
  const vin = () => (S.comic.vinetas && typeof S.comic.vinetas === 'object' ? S.comic.vinetas : (S.comic.vinetas = {}));

  // Captura del mundo. snapshot() dibuja en el momento y devuelve una promesa: el JPEG se codifica 1–2 cuadros
  // después sin congelar el juego (CG-64, lectura diferida de la GPU). Si el lienzo no tiene tamaño (ventana 0×0,
  // pestaña minimizada) da null: no se guarda y la captura queda pendiente hasta que vuelva a haber tamaño (QA-21)
  const pendientes = new Set();
  const programadas = new Set(); // claves con una lectura de snapshot ya encolada (no duplicar)
  const FW = 640, FH = 480; // fotos del mundo a 640×480 (a 480×360 se veían borrosas en las viñetas a lo ancho)
  const lienzoListo = () => { const c = G.renderer.canvas; return !!c && c.width > 0 && c.height > 0; };
  const fotoValida = img => typeof img === 'string' && /^data:image\/[a-z]+;base64,/.test(img) && img.length > 2000;
  function capture(key) {
    if (S.captures[key]) { pendientes.delete(key); return true; }
    if (programadas.has(key)) return true; // ya encolada: la resuelve el .then de abajo
    let img = null;
    if (lienzoListo()) { try { img = G.renderer.snapshot(FW, FH, 0.72); } catch (e) { img = null; } }
    if (fotoValida(img)) { S.captures[key] = img; pendientes.delete(key); return true; }
    pendientes.add(key);
    if (img && typeof img.then === 'function') {
      programadas.add(key);
      img.then(url => {
        programadas.delete(key);
        if (fotoValida(url)) { S.captures[key] = url; pendientes.delete(key); G.guardado.autosave(); }
        else pendientes.add(key); // foto no válida: reintenta luego (lienzo 0×0, contexto perdido…)
      }).catch(() => { programadas.delete(key); pendientes.add(key); });
      return true;
    }
    return false;
  }
  // Encuadre de una posada (QA-32): la foto con la cámara del juego puede quedar tapada por un tronco. Se busca un punto de
  // cámara cerca de Vittata desde el que ningún sólido (tronco, pared, roca: G.solidos) tape su cabeza, se fotografía con la
  // cámara del juego y se devuelve la cámara a su sitio. null si no hay ángulo libre o no hay lienzo.
  let ultimaPosada = null; // punto de cámara de la última foto (para la prueba)
  function fotoPosada() {
    const R = G.renderer, cam = R.camera, SO = G.solidos;
    if (!lienzoListo() || !cam || !R.drawScene || !window.THREE) return null;
    // Nadando (chapuzón), S.pos queda bajo la superficie: se mira la cabeza, que asoma del agua, y la cámara va por encima del
    // agua (antes la foto salía desde debajo del agua: arena del fondo y sin la cotorra)
    const nivel = (x, z) => (G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity);
    const wY = nivel(S.pos.x, S.pos.z), nadando = wY > S.pos.y + 0.2;
    const cab = new THREE.Vector3(S.pos.x, nadando ? wY + 0.35 : S.pos.y + 1.1, S.pos.z);
    const y0 = nadando ? wY : S.pos.y, alturas = nadando ? [[3.0, 1.2], [3.6, 0.7], [2.6, 2.0], [4.2, 1.6]] : [[3.0, 0.5], [3.8, -0.3], [2.6, -1.0], [3.2, -1.8]];
    const base = Math.atan2(cam.position.x - S.pos.x, cam.position.z - S.pos.z);
    const libre = q => {
      if (q.y < G.terreno.height(q.x, q.z) + 0.3) return false;
      if (q.y < nivel(q.x, q.z) + 0.35) return false; // nunca desde dentro del agua
      if (G.camara.copaLibre && !G.camara.copaLibre(q, cab)) return false; // ni dentro de una copa ni con hojas delante
      // Vista libre, no solo la cabeza: rayos a la cabeza y a puntos a los lados y encima (media foto), sin sólidos ni ladera
      // delante (QA: una roca tapaba media viñeta de la meta aunque la cotorra se viera)
      const dx = cab.x - q.x, dz = cab.z - q.z, l = Math.hypot(dx, dz) || 1, lx = -dz / l, lz = dx / l;
      for (const [o, u] of [[0, 0], [1.6, 0.3], [-1.6, 0.3], [0, 1.3]]) {
        const tx = cab.x + lx * o, ty = cab.y + u, tz = cab.z + lz * o;
        for (let i = 1; i <= 11; i++) {
          const t = i / 14, px = q.x + (tx - q.x) * t, py = q.y + (ty - q.y) * t, pz = q.z + (tz - q.z) * t;
          if (G.terreno.height(px, pz) > py) return false;
          if (SO && SO.activo && SO.dentro && SO.dentro(px, pz, py) > -Infinity) return false;
        }
      }
      return true;
    };
    for (const d of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, Math.PI]) for (const [dist, dy] of alturas) {
      const a = base + d, q = new THREE.Vector3(S.pos.x + Math.sin(a) * dist, y0 + dy, S.pos.z + Math.cos(a) * dist);
      if (libre(q)) { ultimaPosada = { q: q.clone(), agua: nivel(q.x, q.z) }; return fotoDesde(q, cab); }
    }
    return null;
  }
  function fotoDesde(q, mira) {
    const R = G.renderer, cam = R.camera, pos = cam.position.clone(), rot = cam.quaternion.clone();
    try {
      cam.position.copy(q); cam.lookAt(mira); cam.updateMatrixWorld();
      // Dibujo directo, como snapshot() (renderer.js): con el posproceso, drawScene() dentro del bucle dejaba la foto en negro
      if (R.renderer && R.scene) { R.scene.updateMatrixWorld(); R.renderer.render(R.scene, cam); } else R.drawScene();
      const src = R.canvas, sw = src.width, sh = src.height;
      if (!sw || !sh || !R.leerLienzo) return null;
      let cw = sw, ch = sw * 0.75; if (ch > sh) { ch = sh; cw = sh / 0.75; }
      // Lectura diferida (CG-64): la promesa resuelve con el JPEG o con null. Una foto casi negra (lienzo sin
      // dibujo) no sirve: null, y la viñeta usa la captura normal o su ilustración
      return R.leerLienzo(cw, ch, FW, FH, 0.72, px => {
        let luz = 0;
        for (let i = 0; i < px.length; i += 4 * 97) luz = Math.max(luz, px[i] + px[i + 1] + px[i + 2]);
        return luz >= 40;
      });
    } catch (e) { return null; }
    finally { cam.position.copy(pos); cam.quaternion.copy(rot); cam.updateMatrixWorld(); }
  }
  // Las posadas se fotografían un instante después (el modelo ya quedó en su sitio). Sin ángulo libre: la viñeta con
  // ilustración la usa; si no tiene, se toma la captura normal.
  const posadas = [];
  function fotografiarPosadas(dt) {
    for (let i = posadas.length - 1; i >= 0; i--) {
      const P = posadas[i]; if ((P.t -= dt) > 0) continue;
      posadas.splice(i, 1);
      if (S.captures[P.v.img]) continue;
      const f = fotoPosada(); // Promise<string|null> | null: la lectura es diferida (CG-64)
      if (f && typeof f.then === 'function') {
        f.then(url => {
          if (url && !S.captures[P.v.img]) S.captures[P.v.img] = url;
          else if (!url && !P.v.ilustracion && !S.captures[P.v.img]) capture(P.v.img);
          G.guardado.autosave();
        }).catch(() => { if (!P.v.ilustracion && !S.captures[P.v.img]) capture(P.v.img); });
      } else {
        if (f) S.captures[P.v.img] = f; else if (!P.v.ilustracion) capture(P.v.img);
        G.guardado.autosave();
      }
    }
  }
  G.on('update', dt => { if (posadas.length) fotografiarPosadas(dt); }, 79);
  let esperaCaptura = 0, esperaBase = 0.5;
  G.on('update', dt => {
    if (!pendientes.size || (esperaCaptura -= dt) > 0) return;
    esperaCaptura = esperaBase;
    if (!lienzoListo()) { esperaBase = Math.min(esperaBase * 2, 30); return; } // sin lienzo: tanteo más espaciado (QA-157)
    const n = pendientes.size;
    for (const k of Array.from(pendientes)) if (S.captures[k] || capture(k)) pendientes.delete(k);
    if (!pendientes.size) { esperaBase = 0.5; G.guardado.autosave(); }
    else if (pendientes.size >= n) esperaBase = Math.min(esperaBase * 2, 30); // nada válido esta ronda: reintento más espaciado
  }, 79);

  // ---------- Viñetas que nacen de eventos reales, con la apariencia del jugador de ese momento ----------
  function lookActual() {
    try { return JSON.parse(JSON.stringify(G.creador.profileLook(S.profile))); }
    catch (e) { return S.profile && S.profile.look ? JSON.parse(JSON.stringify(S.profile.look)) : null; }
  }
  // Clave del look normalizado (dos looks equivalentes comparten retrato)
  function claveLook(look) {
    try { return JSON.stringify(window.AVCharacter.normalizeLook(look)); } catch (e) { return JSON.stringify(look || null); }
  }
  let vistos = 0;
  function revisarEventos() {
    const ev = S.events; if (!Array.isArray(ev)) return 0;
    if (vistos > ev.length) vistos = ev.length;
    let nuevas = 0;
    for (; vistos < ev.length; vistos++) {
      const e = ev[vistos];
      for (const v of VINETAS) {
        if (v.needs !== e.key || vin()[v.id]) continue;
        vin()[v.id] = { look: lookActual(), seq: e.seq };
        if (v.encuadre === 'posada' && !S.captures[v.img]) posadas.push({ v, t: 0.25 }); // QA-32
        else if (v.img && v.img !== 'portrait' && !v.sinCaptura && !S.captures[v.img]) capture(v.img); // sin WebGL o sin tamaño: queda pendiente
        nuevas++;
      }
    }
    if (nuevas) G.guardado.autosave();
    return nuevas;
  }
  G.on('update', () => { if (Array.isArray(S.events) && S.events.length !== vistos) revisarEventos(); }, 79);

  // ---------- Viñetas del motor: eventos de sistemas que sirven a cualquier pack (movimiento y criadero) ----------
  const VIT = (G.pack.jugador && G.pack.jugador.nombre) || 'Vittata';
  const EV_MOTOR = {
    FirstRoofPerch: { type: 'LocationDiscovered', loc: null, chars: ['vittata'], scene: 'perch' },
    FirstHighBranchPerch: { type: 'LocationDiscovered', loc: null, chars: ['vittata'], scene: 'perch' },
    NestAppeared: { type: 'LocationDiscovered', loc: null, chars: ['vittata'], scene: 'nest' },
    ChickHatched: { type: 'CharacterMet', loc: null, chars: ['vittata'], scene: 'hatch' },
  };
  if (G.eventos.defs) for (const [k, d] of Object.entries(EV_MOTOR)) if (!G.eventos.defs[k]) G.eventos.defs[k] = d;
  const VMOTOR = [
    { id: 'techo', img: 'techo', needs: 'FirstRoofPerch', encuadre: 'posada', tipo: 'altura', pose: 'aterrizaje', dialogo: () => L('¡Qué vista desde aquí!', 'What a view from up here!'),
      texto: () => L(`${VIT} aterrizó en un techo por primera vez. ¡Desde arriba todo se ve distinto!`, `${VIT} landed on a roof for the first time. Everything looks different from above!`),
      opciones: [() => L('Desde el techo se veía todo alrededor.', 'From the roof we could see everything around.'),
        () => L('Aprendimos a aterrizar con calma, sin prisa.', 'We learned to land calmly, without rushing.'),
        () => L('Allá arriba el viento nos despeinó las plumas.', 'Up there the wind ruffled our feathers.')] },
    { id: 'rama', img: 'rama', needs: 'FirstHighBranchPerch', encuadre: 'posada', ilustracion: 'rama', tipo: 'altura', pose: 'posarse', dialogo: () => L('¡Bien agarrada!', 'Holding on tight!'),
      texto: () => L(`${VIT} se posó en una rama alta por primera vez, como las cotorras del bosque.`, `${VIT} perched on a high branch for the first time, like the forest parrots.`),
      opciones: [() => L('Desde la rama mirábamos el bosque.', 'From the branch we watched the forest.'),
        () => L('Agarrarse bien a una rama también se aprende.', 'Holding on to a branch is something you learn too.'),
        () => L('Allá arriba el bosque sonaba distinto.', 'Up there the forest sounded different.')] },
    // El nido: foto real de la escena (Iguaca lo presenta en el mundo); la ilustración queda solo si no hay lienzo
    { id: 'nido', img: 'nido', needs: 'NestAppeared', ilustracion: 'nido', tipo: 'hallazgo', pose: 'posarse', pensamiento: () => L('¿Qué habrá en esa cápsula?', 'What could be in that capsule?'),
      texto: () => L('Encontramos un nido con una cápsula. Lo que aprenda le dará calor.', 'We found a nest with a capsule. What I learn will keep it warm.'),
      opciones: [() => L('Un nido nuevo nos esperaba cerca del camino.', 'A new nest was waiting for us near the path.'),
        () => L('Cada cosa que aprendo ayuda a mi cotorrita.', 'Everything I learn helps my little parrot.'),
        () => L('Prometí visitar el nido muy seguido.', 'I promised to visit the nest often.')] },
    { id: 'eclosion', img: 'eclosion', needs: 'ChickHatched', sinCaptura: true, ilustracion: 'eclosion', tipo: 'vida', pose: 'celebrar', dialogo: () => L('¡Bienvenida, cotorrita!', 'Welcome, little parrot!'),
      texto: () => L('¡Nació mi cotorrita! Creció con todo lo que aprendí.', 'My little parrot hatched! It grew with everything I learned.'),
      opciones: [() => L('Le di la bienvenida a mi cotorrita.', 'I welcomed my little parrot.'),
        () => L('La cuidaré y seguiré aprendiendo para que crezca.', 'I will care for it and keep learning so it grows.'),
        () => L('Un día volará libre en el bosque.', 'One day it will fly free in the forest.')] },
  ];
  const VINETAS = (C.vinetas || []).concat(C.vinetasMotor === false ? [] : VMOTOR.filter(v => !(C.vinetas || []).some(p => p.id === v.id)));
  // CG-45: el primer momento de cada sorpresa de la ciudad entra al cómic. En la prueba (d.prueba) y con G.quiet no se anota.
  G.on('momento', d => {
    if (!d || d.prueba || G.quiet || typeof d.id !== 'string') return;
    const id = 'ciu_' + d.id.replace(/[^\w]/g, '').slice(0, 24);
    const needs = 'CitySurprise_' + id;
    if (VINETAS.some(v => v.id === id) || G.eventos.had(needs)) return;
    if (G.eventos.defs && !G.eventos.defs[needs]) G.eventos.defs[needs] = { type: 'LocationDiscovered', loc: 'ciudad', chars: ['vittata'], scene: 'surprise' };
    const linea = typeof d.texto === 'string' ? d.texto : '';
    VINETAS.push({
      id, img: id, needs, tipo: 'hallazgo', pose: 'celebrar',
      dialogo: () => L('¡Mira eso!', 'Look at that!'),
      texto: () => linea,
    });
    G.eventos.log(needs, {});
    revisarEventos();
  });

  // Ganchos de otros sistemas → eventos narrativos (una vez por partida; nunca en las baterías: G.quiet)
  const RAMA_ALTA = 2.5; // m sobre el terreno
  function registrar(key, datos) {
    if (G.quiet || C.vinetasMotor === false || G.eventos.had(key)) return false;
    G.eventos.log(key, datos || {});
    revisarEventos(); // la viñeta nace en este instante, con la apariencia de ahora
    return true;
  }
  function alPosarse(info) {
    if (!info || typeof info !== 'object') return false;
    const alt = Math.round((Number(info.altura) || 0) * 10) / 10;
    if (info.que === 'techo' || info.que === 'cumbrera') return registrar('FirstRoofPerch', { superficie: info.que, altura: alt });
    if (info.que === 'rama' && alt >= RAMA_ALTA) return registrar('FirstHighBranchPerch', { superficie: 'rama', altura: alt });
    return false;
  }
  G.on('posado', info => alPosarse(info));
  G.on('criadero', (tipo, datos) => {
    if (tipo === 'nido') registrar('NestAppeared', {});
    else if (tipo === 'eclosion') {
      if (G.quiet || C.vinetasMotor === false || G.eventos.had('ChickHatched')) return;
      const im = datos && datos.imagen; // foto de la escena del criadero (si la da)
      if (typeof im === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(im) && im.length > 2000 && im.length < 800000) S.captures.eclosion = im;
      registrar('ChickHatched', { cria: datos && typeof datos.id === 'string' ? datos.id.slice(0, 24) : null });
    }
  });

  // Teclado: con «Foto» activa en Gestos, las teclas 1–7 hacen el gesto (input.js) y aquí, además, toman la foto
  function alTeclaFoto(e) {
    const A = G.actores;
    if (!A || !A.fotoModo || e.repeat || !/^[1-7]$/.test(e.key) || !A.EMOTE_KEYS) return false;
    const gesto = A.EMOTE_KEYS[+e.key - 1];
    setTimeout(() => {
      if (!A.fotoModo) return;
      A.modoFoto(false); const m = $('emotes'); if (m) m.hidden = true;
      const pausa = !!(G.pausa && G.pausa.activa && G.pausa.activa());
      if ((A.emote && A.emote.name === gesto) || (!pausa && A.playEmote(gesto))) G.emit('foto', { gesto });
      else aviso('Para la foto, posa en el suelo y quieta.', 2600);
    }, 0);
    return true;
  }
  window.addEventListener('keydown', alTeclaFoto);

  // ---------- Selección narrativa ----------
  const TITULOS = (C.titulos && C.titulos.length ? C.titulos : [C.tituloDefecto || 'Mi cómic']).slice();
  const val = (f) => (typeof f === 'function' ? f(S, G) : f);
  // Textos que se pueden elegir para una viñeta: el de la historia y sus opciones
  const opcionesDe = v => [v.texto].concat(v.opciones || []).map(val);
  // Índice elegido (las partidas viejas guardaban texto libre: solo vale si coincide con una opción)
  function eleccion(v, ops) {
    const c = S.comic.captions[v.id];
    if (typeof c === 'number' && c >= 0 && c < ops.length) return c;
    const i = typeof c === 'string' ? ops.indexOf(c) : -1;
    return i >= 0 ? i : 0;
  }
  function comicPanels() {
    revisarEventos();
    const seqDe = key => { const e = S.events.find(ev => ev.key === key); return e && e.seq ? e.seq : Infinity; };
    // En el orden en que pasaron (a igual orden, el de la definición)
    return VINETAS.filter(v => G.eventos.had(v.needs)).map((v, k) => {
      const ops = opcionesDe(v), i = eleccion(v, ops), r = vin()[v.id];
      return { id: v.id, img: v.img, needs: v.needs, ilustracion: v.ilustracion || null, text: ops[i], opciones: ops, eleccion: i, look: (r && r.look) || null, seq: seqDe(v.needs), k };
    }).sort((a, b) => a.seq - b.seq || a.k - b.k);
  }
  const tituloValido = t => (TITULOS.includes(t) ? t : TITULOS[0]);
  // Orden de la plantilla de Kelvin (sin orden propio del niño): EL COMIENZO, EL HALLAZGO, EL DESAFÍO/¡CHAPUZÓN!/…, LA SOLUCIÓN,
  // EL REGRESO/…, ¡LA META! (siempre la última). Cada hueco lo toma el primer evento de su tipo; los repetidos (un segundo hallazgo)
  // y los que no tienen hueco propio llenan los libres (antes el 5.º) o van antes de la meta.
  const HUECO = { comienzo: 0, hallazgo: 1, solucion: 3, regreso: 4, record: 4, vida: 4, meta: 5 };
  function ordenPlantilla(panels) {
    const hu = [null, null, null, null, null, null], resto = [];
    for (const p of panels) { const h = HUECO[tipoDe(VINETAS.find(v => v.id === p.id))]; const k = h == null ? 2 : h; if (!hu[k]) hu[k] = p; else resto.push(p); }
    for (const k of [4, 2, 1, 3, 0]) if (!hu[k] && resto.length) hu[k] = resto.shift();
    return hu.slice(0, 5).filter(Boolean).concat(resto, hu[5] ? [hu[5]] : []);
  }
  function orderedPanels() {
    const panels = comicPanels();
    if (!S.comic.order.length) return ordenPlantilla(panels);
    const order = S.comic.order.filter(i => i < panels.length);
    for (let i = 0; i < panels.length; i++) if (!order.includes(i)) order.push(i);
    return order.map(i => panels[i]);
  }
  // Calcula las cajas de las viñetas (probado en selfTest y comicTest: sin solapes y dentro de la página)
  function comicLayout(n, layout, W, H, top) {
    const boxes = [], g = 20;
    // Con 1 o 2 viñetas, la cuadrícula las apila a lo ancho: en media columna quedaban como tiras altas y la foto se recortaba
    if (layout === 'strip' || n <= 2) {
      const ph = (H - top - g * (n + 1)) / n;
      for (let i = 0; i < n; i++) boxes.push({ x: g, y: top + g + i * (ph + g), w: W - 2 * g, h: ph });
    } else {
      const rows = Math.ceil(n / 2), pw = (W - 3 * g) / 2, ph = (H - top - g * (rows + 1)) / rows;
      for (let i = 0; i < n; i++) {
        const lastAlone = n % 2 === 1 && i === n - 1;
        boxes.push({ x: lastAlone ? g : g + (i % 2) * (pw + g), y: top + g + Math.floor(i / 2) * (ph + g), w: lastAlone ? W - 2 * g : pw, h: ph });
      }
    }
    return boxes;
  }

  // ---------- Retratos por look (AVCharacter.renderPortrait reutiliza su lienzo: se copia y se llama en secuencia) ----------
  const retratos = new Map(); // clave del look + tamaño → lienzo (solo retratos 3D; LRU de 8)
  function fondoRetrato(x, s) {
    const g = x.createRadialGradient(s * 0.5, s * 0.38, s * 0.05, s * 0.5, s * 0.5, s * 0.72);
    g.addColorStop(0, '#2d5a43'); g.addColorStop(1, '#10241c'); x.fillStyle = g; x.fillRect(0, 0, s, s);
  }
  // fondo = false: el pájaro sin fondo, sobre el degradado de la viñeta de presentación
  async function retratoDe(look, size, fondo) {
    fondo = fondo !== false;
    const lk = look || lookActual();
    const k = claveLook(lk) + '@' + size + (fondo ? '' : '-sf');
    if (retratos.has(k)) { const c = retratos.get(k); retratos.delete(k); retratos.set(k, c); return c; }
    const out = document.createElement('canvas'); out.width = out.height = size;
    const x = out.getContext('2d');
    const perfil = Object.assign({}, S.profile, lk ? { look: lk } : {});
    if (window.AVCharacter && !G.actores.failed3D) {
      try {
        const cv = await window.AVCharacter.renderPortrait(G.creador.profileLook(perfil), size);
        if (fondo) fondoRetrato(x, size);
        x.drawImage(cv, 0, 0, size, size);
        retratos.set(k, out); while (retratos.size > 8) retratos.delete(retratos.keys().next().value);
        return out;
      } catch (e) { /* sin modelo: retrato 2D */ }
    }
    await G.creador.drawPortrait(x, size, perfil, fondo);
    return out;
  }


  // Ilustraciones del motor (sin foto del momento): el nido con su huevo y la eclosión
  function ilustrar(x, tipo, ix, iy, iw, ih) {
    const s = Math.min(iw * 0.62, ih * 1.1), cx = ix + iw * 0.6, cy = iy + ih * 0.56;
    const cielo = x.createLinearGradient(ix, iy, ix, iy + ih); cielo.addColorStop(0, '#cdeedb'); cielo.addColorStop(1, '#5d9e6c');
    x.fillStyle = cielo; x.fillRect(ix, iy, iw, ih);
    const luz = x.createRadialGradient(cx, cy - s * 0.2, s * 0.05, cx, cy - s * 0.2, s * 0.9);
    luz.addColorStop(0, 'rgba(255,248,214,.85)'); luz.addColorStop(1, 'rgba(255,248,214,0)'); x.fillStyle = luz; x.fillRect(ix, iy, iw, ih);
    for (let k = 0; k < 14; k++) { // hojas del dosel
      const hx = ix + iw * ((k * 0.173 + 0.05) % 1), hy = iy + ih * (0.04 + (k % 4) * 0.07), r = s * (0.16 + (k % 3) * 0.05);
      x.fillStyle = k % 2 ? 'rgba(36,104,60,.75)' : 'rgba(58,135,78,.7)';
      x.beginPath(); x.ellipse(hx, hy, r, r * 0.42, (k * 0.9) % Math.PI, 0, Math.PI * 2); x.fill();
    }
    if (/^pichon_/.test(tipo)) return ilustrarGag(x, tipo, ix, iy, iw, ih, s, cx);
    x.lineCap = 'round'; x.strokeStyle = '#5b3a1e'; x.lineWidth = Math.max(6, s * 0.09); // rama
    x.beginPath(); x.moveTo(ix - 10, cy + s * 0.42); x.quadraticCurveTo(cx - s * 0.2, cy + s * 0.5, ix + iw + 10, cy + s * 0.28); x.stroke();
    if (tipo === 'rama') { // rama alta en el dosel, sin nido
      x.strokeStyle = '#6b4526'; x.lineWidth = Math.max(4, s * 0.05);
      x.beginPath(); x.moveTo(cx + s * 0.1, cy + s * 0.45); x.quadraticCurveTo(cx + s * 0.35, cy + s * 0.1, cx + s * 0.75, cy - s * 0.05); x.stroke();
      x.fillStyle = 'rgba(46,120,70,.85)';
      for (let k = 0; k < 7; k++) { x.beginPath(); x.ellipse(cx + s * (0.2 + k * 0.09), cy + s * (0.3 - k * 0.06), s * 0.09, s * 0.035, -0.6 + (k % 2) * 1.1, 0, Math.PI * 2); x.fill(); }
      return;
    }
    const nidoY = cy + s * 0.2;
    x.fillStyle = '#6e4a2a'; x.beginPath(); x.ellipse(cx, nidoY, s * 0.46, s * 0.2, 0, 0, Math.PI); x.fill(); // cuenco
    x.strokeStyle = '#a8793f'; x.lineWidth = Math.max(2, s * 0.018);
    for (let k = 0; k < 12; k++) { const t = k / 11; x.beginPath(); x.ellipse(cx, nidoY + t * s * 0.14, s * (0.46 - t * 0.1), s * (0.08 + t * 0.03), k % 2 ? 0.05 : -0.05, 0, Math.PI); x.stroke(); }
    const huevo = (ex, ey, rx, ry) => {
      const g = x.createRadialGradient(ex - rx * 0.35, ey - ry * 0.4, rx * 0.1, ex, ey, ry * 1.1);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d9d2c2'); x.fillStyle = g;
      x.beginPath(); x.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); x.fill();
    };
    if (tipo === 'eclosion') {
      // Cría asomando del cascarón partido, la otra mitad a un lado y destellos
      const ex = cx, ey = nidoY - s * 0.12, rx = s * 0.15, ry = s * 0.2;
      x.fillStyle = '#7fc35a'; x.beginPath(); x.arc(ex, ey - ry * 0.55, rx * 0.85, 0, Math.PI * 2); x.fill(); // cabeza
      x.fillStyle = '#9fd77a'; x.beginPath(); x.arc(ex - rx * 0.25, ey - ry * 0.75, rx * 0.35, 0, Math.PI * 2); x.fill(); // plumón
      x.fillStyle = '#f2a03d'; x.beginPath(); x.moveTo(ex + rx * 0.55, ey - ry * 0.6); x.lineTo(ex + rx * 1.05, ey - ry * 0.45); x.lineTo(ex + rx * 0.55, ey - ry * 0.3); x.closePath(); x.fill(); // pico
      x.fillStyle = '#10241c'; x.beginPath(); x.arc(ex + rx * 0.2, ey - ry * 0.65, rx * 0.12, 0, Math.PI * 2); x.fill(); // ojo
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + rx * 0.24, ey - ry * 0.69, rx * 0.04, 0, Math.PI * 2); x.fill();
      x.save(); x.beginPath(); x.moveTo(ex - rx, ey - ry * 0.05); // mitad de abajo con borde quebrado
      for (let k = 0; k <= 8; k++) x.lineTo(ex - rx + (2 * rx * k) / 8, ey - ry * (k % 2 ? 0.28 : 0.02));
      x.lineTo(ex + rx, ey + ry); x.lineTo(ex - rx, ey + ry); x.closePath(); x.clip(); huevo(ex, ey, rx, ry); x.restore();
      x.save(); x.translate(ex + rx * 2.1, ey + ry * 0.55); x.rotate(0.9); // mitad de arriba en el nido
      x.beginPath(); x.rect(-rx, -ry, 2 * rx, ry * 0.75); x.clip(); huevo(0, 0, rx, ry); x.restore();
      x.fillStyle = '#ffe27a';
      for (const [dx, dy, r] of [[-1.9, -1.4, 0.16], [1.6, -1.6, 0.12], [2.2, -0.6, 0.09], [-2.4, -0.3, 0.1]]) {
        const sx = ex + dx * rx, sy = ey + dy * ry * 0.7, R = r * s;
        x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? R * 0.35 : R; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); } x.closePath(); x.fill();
      }
    } else huevo(cx, nidoY - s * 0.1, s * 0.14, s * 0.19);
  }

  function estrella(x, sx, sy, R, puntas) {
    puntas = puntas || 4; x.beginPath();
    for (let k = 0; k < puntas * 2; k++) { const a = k * Math.PI / puntas - Math.PI / 2, rr = k % 2 ? R * 0.38 : R; x.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
    x.closePath(); x.fill();
  }
  // Pichón de cotorra puertorriqueña (verde, frente roja, anillo blanco en el ojo, primarias azules, pico claro), de pie en
  // (0, 0) = sus patas. o: { giro, ala (levantada), dormido, mira (inclina la cabeza: + arriba) }
  function pichon(x, px, py, r, o) {
    o = o || {};
    x.save(); x.translate(px, py); x.rotate(o.giro || 0); x.translate(0, -r * 1.05);
    x.strokeStyle = '#d99a52'; x.lineWidth = Math.max(2, r * 0.1); x.lineCap = 'round'; // patas
    for (const dx of [-0.25, 0.22]) { x.beginPath(); x.moveTo(r * dx, r * 0.8); x.lineTo(r * dx, r * 1.05); x.lineTo(r * (dx + 0.18), r * 1.05); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0, r * 1.07, r * 0.75, r * 0.12, 0, 0, Math.PI * 2); x.fill(); // sombra
    let g = x.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.15); g.addColorStop(0, '#a6dc7e'); g.addColorStop(1, '#3f8f3a');
    x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, r * 0.82, r * 0.95, 0, 0, Math.PI * 2); x.fill(); // cuerpo
    x.fillStyle = 'rgba(225,246,196,.5)'; x.beginPath(); x.ellipse(r * 0.18, r * 0.22, r * 0.45, r * 0.58, 0, 0, Math.PI * 2); x.fill(); // pecho
    x.save(); x.translate(-r * 0.42, -r * 0.3); x.rotate(o.ala ? 2.55 : 0.3); // ala (levantada: hacia arriba y atrás)
    x.fillStyle = '#2f7a35'; x.beginPath(); x.ellipse(0, r * 0.38, r * 0.3, r * 0.58, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2f6fb8'; x.beginPath(); x.ellipse(0, r * 0.76, r * 0.2, r * 0.22, 0, 0, Math.PI * 2); x.fill(); x.restore();
    x.save(); x.translate(0, -r * 0.95); x.rotate(-(o.mira || 0)); // cabeza
    const hr = r * 0.64;
    g = x.createRadialGradient(-hr * 0.3, -hr * 0.35, hr * 0.1, 0, 0, hr * 1.2); g.addColorStop(0, '#b2e48c'); g.addColorStop(1, '#55a644');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, hr, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(200,240,170,.8)'; x.beginPath(); x.arc(-hr * 0.35, -hr * 0.8, hr * 0.22, 0, Math.PI * 2); x.fill(); // plumón
    x.fillStyle = '#d8352a'; x.beginPath(); x.ellipse(hr * 0.42, -hr * 0.5, hr * 0.36, hr * 0.15, 0.4, 0, Math.PI * 2); x.fill(); // frente roja
    const ex = hr * 0.3, ey = -hr * 0.06;
    x.fillStyle = '#fff'; x.beginPath(); x.arc(ex, ey, hr * 0.27, 0, Math.PI * 2); x.fill(); // anillo del ojo
    if (o.dormido) { x.strokeStyle = '#10241c'; x.lineWidth = Math.max(2, hr * 0.09); x.beginPath(); x.arc(ex, ey - hr * 0.03, hr * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); }
    else {
      x.fillStyle = '#10241c'; x.beginPath(); x.arc(ex + hr * 0.04, ey, hr * 0.15, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + hr * 0.1, ey - hr * 0.07, hr * 0.05, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = 'rgba(242,120,110,.35)'; x.beginPath(); x.arc(hr * 0.12, hr * 0.38, hr * 0.15, 0, Math.PI * 2); x.fill(); // cachete
    x.fillStyle = '#f1e2b2'; x.beginPath(); x.moveTo(hr * 0.74, -hr * 0.2); x.quadraticCurveTo(hr * 1.3, -hr * 0.05, hr * 0.84, hr * 0.38); x.lineTo(hr * 0.66, hr * 0.12); x.closePath(); x.fill(); // pico
    x.strokeStyle = 'rgba(120,96,50,.6)'; x.lineWidth = Math.max(1, hr * 0.04); x.stroke();
    x.restore(); x.restore();
  }
  // Escena de un gag del pichón (sin foto del momento): suelo del bosque y el pichón con su gag
  function ilustrarGag(x, tipo, ix, iy, iw, ih, s, cx) {
    const suelo = iy + ih * 0.8;
    x.fillStyle = '#3e7f3f'; x.beginPath(); x.moveTo(ix, suelo + ih * 0.04); x.quadraticCurveTo(ix + iw * 0.5, suelo - ih * 0.08, ix + iw, suelo); x.lineTo(ix + iw, iy + ih); x.lineTo(ix, iy + ih); x.closePath(); x.fill();
    x.strokeStyle = '#2d6a33'; x.lineWidth = 3; x.lineCap = 'round';
    for (let k = 0; k < 22; k++) { const hx = ix + iw * ((k * 0.137 + 0.03) % 1), hy = suelo + ih * (0.04 + (k % 3) * 0.04); x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx + 4 - (k % 3) * 4, hy - 12 - (k % 4) * 3); x.stroke(); }
    const r = Math.min(s * 0.24, ih * 0.2), py = suelo - ih * 0.01;
    x.fillStyle = '#ffe27a';
    if (tipo === 'pichon_cae') {
      // El borde del que se cayó, la trayectoria, el polvito y estrellitas (se sacude, no se hace daño)
      x.fillStyle = '#8b7558'; x.beginPath(); x.ellipse(cx + s * 0.62, iy + ih * 0.36, s * 0.3, s * 0.08, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#4f9a4c'; x.beginPath(); x.ellipse(cx + s * 0.62, iy + ih * 0.33, s * 0.3, s * 0.05, 0, 0, Math.PI * 2); x.fill();
      x.setLineDash([8, 10]); x.strokeStyle = 'rgba(16,36,28,.55)'; x.lineWidth = 4;
      x.beginPath(); x.moveTo(cx + s * 0.45, iy + ih * 0.3); x.quadraticCurveTo(cx + s * 0.2, iy + ih * 0.2, cx + r * 0.3, py - r * 2.4); x.stroke(); x.setLineDash([]);
      x.fillStyle = 'rgba(240,232,214,.85)';
      for (const [dx, rr] of [[-1.1, 0.32], [-0.6, 0.24], [0.9, 0.3], [1.3, 0.2]]) { x.beginPath(); x.arc(cx + dx * r, py - rr * r * 0.6, rr * r, 0, Math.PI * 2); x.fill(); }
      pichon(x, cx, py, r, { giro: -0.32, ala: true, mira: 0.2 });
      x.fillStyle = '#ffd34d';
      for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.4; estrella(x, cx - r * 0.55 + Math.cos(a) * r * 0.85, py - r * 2.75 + Math.sin(a) * r * 0.28, r * 0.2, 5); }
    } else if (tipo === 'pichon_mariposa') {
      // Mira hacia arriba, con un ala levantada; la mariposa va delante, dejando un rastro de puntos
      const bx = cx + s * 0.5, by = iy + ih * 0.28;
      x.setLineDash([3, 12]); x.strokeStyle = 'rgba(16,36,28,.5)'; x.lineWidth = 4;
      x.beginPath(); x.moveTo(cx - s * 0.5, iy + ih * 0.5); x.bezierCurveTo(cx - s * 0.1, iy + ih * 0.15, cx + s * 0.1, iy + ih * 0.65, bx - 10, by + 6); x.stroke(); x.setLineDash([]);
      pichon(x, cx - r * 0.2, py, r, { ala: true, mira: 0.45, giro: 0.08 });
      x.save(); x.translate(bx, by); x.rotate(-0.25);
      for (const lado of [-1, 1]) {
        x.fillStyle = '#f29a2e'; x.beginPath(); x.ellipse(lado * s * 0.07, -s * 0.03, s * 0.075, s * 0.055, lado * 0.5, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#f7c548'; x.beginPath(); x.ellipse(lado * s * 0.055, s * 0.045, s * 0.05, s * 0.038, -lado * 0.4, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#3a2410'; x.lineWidth = 2; x.beginPath(); x.ellipse(lado * s * 0.07, -s * 0.03, s * 0.075, s * 0.055, lado * 0.5, 0, Math.PI * 2); x.stroke();
      }
      x.fillStyle = '#3a2410'; x.beginPath(); x.ellipse(0, 0, s * 0.012, s * 0.06, 0, 0, Math.PI * 2); x.fill(); x.restore();
    } else if (tipo === 'pichon_duerme') {
      // Dormido encima del hallazgo, que brilla por debajo; las zetas suben
      const hy = py - r * 0.05, luz = x.createRadialGradient(cx, hy, r * 0.1, cx, hy, r * 1.9);
      luz.addColorStop(0, 'rgba(255,226,122,.95)'); luz.addColorStop(1, 'rgba(255,226,122,0)'); x.fillStyle = luz; x.fillRect(cx - r * 2, hy - r * 2, r * 4, r * 4);
      x.fillStyle = '#c9a24a'; x.beginPath(); x.ellipse(cx, hy, r * 0.95, r * 0.28, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffe9a3'; for (const [dx, dy] of [[-1.2, -0.3], [1.25, -0.5], [1.5, 0.05], [-1.5, 0.1]]) estrella(x, cx + dx * r, hy + dy * r, r * 0.16, 4);
      pichon(x, cx, py - r * 0.18, r, { dormido: true, mira: -0.15, giro: -0.04 });
      x.fillStyle = '#10241c'; x.textAlign = 'left';
      [[0.55, 0.26], [0.95, 0.34], [1.4, 0.44]].forEach(([d, t], k) => { x.font = `700 ${Math.round(r * t * 1.6)}px Fredoka, sans-serif`; x.fillText('z', cx + r * (0.5 + d * 0.6), py - r * (2.2 + k * 0.55)); });
    } else {
      // pichon_imita: con el ala arriba igual que el gesto, rayitas de movimiento y una estrella de «¡igualita!»
      pichon(x, cx, py, r, { ala: true, mira: 0.1 });
      x.strokeStyle = 'rgba(16,36,28,.6)'; x.lineWidth = 4; x.lineCap = 'round';
      for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(cx - r * 0.6, py - r * 2.0, r * (0.75 + k * 0.28), Math.PI * (1.05 + k * 0.02), Math.PI * 1.4); x.stroke(); }
      x.fillStyle = '#ffd34d'; estrella(x, cx + r * 1.25, py - r * 2.65, r * 0.3, 5); estrella(x, cx + r * 1.7, py - r * 2.05, r * 0.17, 5);
    }
  }

  // ---------- Composición: la plantilla aprobada de Kelvin (src/game/comic_plantilla.js) ----------
  // La página tiene 6 viñetas. Con más escenas, el niño elige cuáles (S.comic.ocultas: ids fuera de la página); sin elegir, van la
  // primera y la última y, entre medias, las de la historia del pack antes que las del motor y los momentos. Con menos de 6, los
  // huecos muestran «Escena por descubrir» (no se inventan eventos ni capturas).
  const MAXV = 6;
  const PL = C.plantilla || {};
  const T = t => (G.idioma && G.idioma.tr ? G.idioma.tr(t) : t);
  // CG-37: las narraciones que el pack arma con el nombre o con una rama, en EN, sin tocar el texto del capítulo.
  function cg37Narracion(t) {
    if (!enAhora() || typeof t !== 'string') return null;
    const fijo = {
      'Miré la pendiente, el suelo y el viento antes de elegir dónde construir.': 'I looked at the slope, the soil and the wind before choosing where to build.',
      'La primera tormenta encontró un fallo. Lo cambié, probé otra vez… ¡y la casa aguantó!': 'The first storm found a flaw. I changed it, tried again… and the house held!',
      'La primera botadura falló en una parte. La cambié… ¡y flotó!': 'The first launch failed in one part. I changed it… and it floated!',
      'Cruzamos la bahía. En Villa Mangle pregunté antes de contar.': 'We crossed the bay. In Villa Mangle I asked before I told.',
      'Acordamos señales. Yo llevé el timón y ella me cantó el agua.': 'We agreed on signals. I took the helm and she sang the water to me.',
      'Acordamos señales y le di el timón a quien sabe leer el agua.': 'We agreed on signals and I gave the helm to the one who can read the water.',
      'Antes de dibujar el puente, miré lo que ya vivía en la orilla.': 'Before drawing the bridge, I looked at what already lived on the bank.',
      'Decidimos juntos y cuidamos lo que costaba.': 'We decided together and took care of what it cost.',
      'La abuela cruzó primero. Ninguna opción lo daba todo, pero la elegimos con todos.': 'Grandma crossed first. No option gave everything, but we chose it with everyone.',
      'En el transmisor había dos ondas, no un eco.': 'In the transmitter there were two waves, not an echo.',
      'Ordené los pedazos: seguimos aquí, la torre que mira al mar, no lo hagas sola.': 'I put the pieces in order: we are still here, the tower that faces the sea, do not do it alone.',
      'En las piedras había un 36, dos cotorras y un camino de torres.': 'In the stones there was a 36, two parrots and a path of towers.',
      'Armé tres estaciones. La primera prueba se cortó donde no había nadie.': 'I set up three stations. The first test stopped where nobody was.',
      'Pedí ayuda. La señal cruzó hasta la niebla y las dos voces se oyeron enteras.': 'I asked for help. The signal crossed as far as the fog and both voices were heard in full.',
      'Cada uno trajo algo que sabe hacer y algo que necesita. Los presenté y se quedaron hablando.': 'Each one brought something they can do and something they need. I introduced them and they stayed talking.',
      'En mi primer plan solo estaba yo. La tabla se quedó a medio levantar.': 'In my first plan it was only me. The plank stayed halfway up.',
      'Repartimos el trabajo y el más nuevo ató el último nudo. La tabla subió.': 'We shared the work and the newest one tied the last knot. The plank went up.',
      'Repartimos el trabajo sin que nadie hiciera dos cosas. La tabla subió.': 'We shared the work so nobody did two jobs. The plank went up.',
      'Cada uno en lo suyo. La tabla subió rápido.': 'Each one did their part. The plank went up fast.',
      'Escuché a los dos grupos antes de proponer. Luego elegí cómo sentar a los 36.': 'I listened to both groups before I proposed. Then I chose how to seat the 36.',
      'Los asientos ocupados se encendieron. Los vacíos esperan. Anoté la tripulación.': 'The filled seats lit up. The empty ones are waiting. I wrote down the crew.',
    };
    if (fijo[t]) return fijo[t];
    let m;
    if ((m = /^Soy (.+) y vi venir otra tormenta\.$/.exec(t))) return 'I am ' + m[1] + ' and I saw another storm coming.';
    if ((m = /^Soy (.+)\. El plano del bote estaba en la mesa de todos\.$/.exec(t))) return 'I am ' + m[1] + '. The boat plan was on everyone\'s table.';
    if ((m = /^Soy (.+) y quería unir las dos orillas del río\.$/.exec(t))) return 'I am ' + m[1] + ' and I wanted to join the two banks of the river.';
    if ((m = /^Soy (.+) y oí dos voces a la vez\.$/.exec(t))) return 'I am ' + m[1] + ' and I heard two voices at once.';
    if ((m = /^Soy (.+)\. Al amanecer llegaron los primeros por la cadena de señales\.$/.exec(t))) return 'I am ' + m[1] + '. At dawn the first ones arrived along the signal chain.';
    if ((m = /^Pregunté antes de construir\. Y dije: «([\s\S]*)»$/.exec(t))) return 'I asked before building. And I said: «' + T(m[1]) + '»';
    if ((m = /^Escuché todas las voces y lo dije: «([\s\S]*)»$/.exec(t))) return 'I listened to every voice and I said: «' + T(m[1]) + '»';
    if ((m = /^Decidimos juntos: (.+), y cuidamos lo que costaba: «([\s\S]*)»\.$/.exec(t))) return 'We decided together: ' + T(m[1]) + ', and we took care of what it cost: «' + T(m[2]) + '».';
    return null;
  }
  // CG-36: el chapuzón habla de quien juega (la foto es su cotorra). ¡La meta! del cap. 1 se parte para no salir diminuta.
  // El cap. 5 también usa id «final»: su texto se queda (no es el del transmisor del cap. 1).
  function narracionDe(p) {
    if (p && p.id === 'chapuzon' && !p.eleccion) {
      const nom = (S.profile && S.profile.name) || L('yo', 'I');
      return L('¡Chapuzón! ' + nom + ' descubrió que el río está mojado. Muy mojado.',
        'Splash! ' + nom + ' found out the river is wet. Very wet.');
    }
    if (p && p.id === 'final' && !p.eleccion && typeof p.text === 'string' && p.text.indexOf('construiremos un bote') >= 0) {
      return L('El transmisor mostró 36 fragmentos. Desde el mirador vimos otras islas: haremos un bote.',
        'The transmitter showed 36 pieces. From the lookout we saw other islands: we will build a boat.');
    }
    const propia = cg37Narracion(p && p.text);
    if (propia) return propia;
    return T(p && p.text);
  }
  const TIT_DEF = { comienzo: 'El comienzo', hallazgo: 'El hallazgo', desafio: 'El desafío', solucion: 'La solución', regreso: 'El regreso', meta: '¡La meta!', vida: '¡Nueva vida!',
    record: '¡Nuevo récord!', chapuzon: '¡Chapuzón!', risa: '¡Qué risa!', pose: '¡Mi mejor pose!', amigos: 'Nuevos amigos', altura: '¡Desde lo alto!' };
  const TIT_ALT = { hallazgo: '¡Una sorpresa!', desafio: '¡Otro reto!', solucion: '¡Otra idea!', amigos: '¡Más amigos!', risa: '¡Otra risa!', altura: '¡Más alto!',
    vida: '¡Qué alegría!', record: '¡Otro récord!', pose: '¡Otra pose!', chapuzon: '¡Otro chapuzón!', comienzo: 'Y después…', regreso: 'Y después…', meta: 'Y después…' };
  // Pose de acción por tipo de evento (guía: vuelo o récord → crucero/impulso; llegada → aterrizaje; descubrimiento → posarse; final → celebrar; chapuzón → nadar)
  const POSE_DE = { comienzo: 'crucero', hallazgo: 'posarse', desafio: 'aterrizaje', solucion: 'aterrizaje', regreso: 'crucero', meta: 'celebrar', vida: 'celebrar',
    record: 'impulso', chapuzon: 'nadar', risa: 'celebrar', pose: 'celebrar', amigos: 'posarse', altura: 'aterrizaje' };
  const TIPO_EV = { LocationDiscovered: 'hallazgo', CharacterMet: 'amigos', SkillMoment: 'desafio', RecordAchieved: 'record', PhotoTaken: 'pose', CompanionMoment: 'risa' };
  function tipoDe(def) {
    if (def && def.tipo) return def.tipo;
    const d = G.eventos.defs && def && G.eventos.defs[def.needs];
    return (d && TIPO_EV[d.type]) || 'hallazgo';
  }
  // Pegatinas de lo nuevo: solo si la partida ya tiene esa actividad. Se dibujan en la plantilla (nada que subir).
  function actividadesComic() {
    const a = [];
    try {
      const est = G.v18pesca && G.v18pesca.estado && G.v18pesca.estado();
      const m = G.v18 && G.v18.mundo && G.v18.mundo('pesca_rio');
      const peces = est && ((est.peces > 0) || (est.album && Object.keys(est.album).length) || (est.record > 0));
      const visto = m && typeof m === 'object' && ((m.mejor > 0) || (Array.isArray(m.vistos) && m.vistos.length));
      if (peces || visto) a.push('pesca');
    } catch (e) { /* sin pesca */ }
    if (S.construir && Array.isArray(S.construir.piezas) && S.construir.piezas.length) a.push('construir');
    try {
      const inv = G.invasoras && G.invasoras.estado && G.invasoras.estado();
      if (inv && Array.isArray(inv.vistos) && inv.vistos.length) a.push('patrulla');
      else {
        const clave = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.invasoras';
        const d = JSON.parse(localStorage.getItem(clave) || 'null');
        if (d && Array.isArray(d.vistos) && d.vistos.length) a.push('patrulla');
      }
    } catch (e) { /* sin patrulla */ }
    return a;
  }
  const ocultasDe = () => (Array.isArray(S.comic.ocultas) ? S.comic.ocultas.filter(x => typeof x === 'string').slice(0, 64) : null);
  function enPagina(panels) {
    panels = panels || orderedPanels();
    const oc = ocultasDe();
    if (oc) return panels.filter(p => !oc.includes(p.id)).slice(0, MAXV);
    if (panels.length <= MAXV) return panels;
    const prio = p => { const i = (C.vinetas || []).findIndex(v => v.id === p.id); return i >= 0 ? i : 100 + VINETAS.findIndex(v => v.id === p.id); };
    const fijas = new Set([panels[0].id, panels[panels.length - 1].id]);
    const resto = panels.filter(p => !fijas.has(p.id)).sort((a, b) => prio(a) - prio(b)).slice(0, MAXV - fijas.size).map(p => p.id);
    return panels.filter(p => fijas.has(p.id) || resto.includes(p.id));
  }
  // «¿Qué aprendí?» y «Mi enseñanza de vida»: de las listas fijas del pack, solo las de eventos que pasaron; el niño elige (índice)
  const opcionesLeccion = k => (PL[k] || []).filter(o => !o.needs || G.eventos.had(o.needs)).map(o => val(o.texto));
  function leccion(k) {
    const l = opcionesLeccion(k), i = S.comic[k];
    if (!l.length) return k === 'aprendi' ? L('Juega el capítulo para descubrir lo que aprendiste.', 'Play the chapter to discover what you learned.') : L('Tu enseñanza aparecerá al jugar.', 'Your lesson will appear as you play.');
    return l[Number.isInteger(i) && i >= 0 && i < l.length ? i : 0];
  }
  // Datos de la página (los de la guía: por viñeta eventId, sceneImage, sceneTitle, dialogueText, captionText, effectId, timestamp)
  async function datosPagina(opts) {
    opts = opts || {};
    const propia = src => !!src && (!opts.seguro || /^data:/.test(src));
    const panels = enPagina();
    const imgs = {};
    for (const k of new Set(panels.map(p => p.img).filter(k => k && k !== 'portrait'))) imgs[k] = propia(S.captures[k]) ? await loadImg(S.captures[k]).catch(() => null) : null;
    const vinetas = [], usados = new Set(), acts = actividadesComic();
    let ai = 0;
    // Un título de escena no se repite en la página: el segundo del mismo tipo usa el alternativo (pack plantilla.titulosAlt)
    const reservaTit = ['Y después…', '¡Otra idea!', '¡Otro reto!', '¡Más alto!', 'Nuevos amigos', '¡Qué alegría!', '¡Una sorpresa!'];
    const titulo = tipo => {
      let t = (PL.titulos || {})[tipo] || TIT_DEF[tipo] || '';
      if (usados.has(t)) t = (PL.titulosAlt || {})[tipo] || TIT_ALT[tipo] || reservaTit[0];
      if (usados.has(t)) { for (const r of reservaTit) if (!usados.has(r)) { t = r; break; } }
      usados.add(t); return T(t);
    };
    for (let i = 0; i < MAXV; i++) {
      const p = panels[i];
      if (!p) { vinetas.push({ id: null, falta: true, look: null, pose: 'celebrar' }); continue; }
      const def = VINETAS.find(v => v.id === p.id) || {}, tipo = tipoDe(def), ev = S.events.find(e => e.key === p.needs);
      const gl = def.pensamiento ? val(def.pensamiento) : val(def.dialogo);
      const img = p.img && p.img !== 'portrait' ? imgs[p.img] : null;
      vinetas.push({ id: p.id, eventId: p.needs, timestamp: ev ? ev.t : null, sceneImage: img || null,
        escena: !img && p.ilustracion ? (x, X, Y, w, h) => ilustrar(x, p.ilustracion, X, Y, w, h) : null,
        sceneTitle: titulo(tipo), dialogueText: gl ? T(gl) : '', dialogueType: def.pensamiento ? 'pensamiento' : 'dialogo',
        captionText: narracionDe(p), effectId: val(def.efecto) || null, recordValue: val(def.marca) || null,
        pegatina: ai < acts.length ? acts[ai++] : null, look: p.look || lookActual(), pose: def.pose || POSE_DE[tipo] || 'celebrar' });
    }
    return { panels, datos: { chapterId: C.capitulo || null, titulo: T(tituloValido(S.comic.title)), nombre: S.profile.name, look: lookActual(), retrato: await retratoDe(null, 256),
      aprendi: T(leccion('aprendi')), ensenanza: T(leccion('ensenanza')), botones: opts.botones !== false, vinetas } };
  }
  let ultimoRender = null;
  // opts.seguro: solo imágenes embebidas (data:), para un lienzo que no quede contaminado; opts.botones = false: sin los 4 botones
  async function renderComic(target, opts) {
    opts = opts || {};
    const { panels, datos } = await datosPagina(opts);
    const R = await G.comicPlantilla.componer(target, datos);
    const looks = {}; panels.forEach(p => { looks[p.id] = claveLook(p.look || lookActual()); });
    const vs = R.vinetas.slice(0, panels.length);
    ultimoRender = { target, datos, panels, boxes: vs.map(v => v.caja), cameos: vs.map(v => ({ id: v.id, x: v.circulo.x, y: v.circulo.y, s: v.circulo.s })), looks, info: R };
    return ultimoRender;
  }

  // ---------- PNG y PDF ----------
  function dataUrlBytes(url) { const b = atob(url.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function dataUrlABlob(url) { const m = /^data:([^;,]*)(;base64)?,/.exec(url || ''); return m && m[2] ? new Blob([dataUrlBytes(url)], { type: m[1] || 'application/octet-stream' }) : null; }
  function blobADataUrl(b) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); }); }
  // toBlob con respaldo en toDataURL; null si el lienzo está contaminado o el navegador no puede
  function aBlob(cv, tipo, calidad) {
    return new Promise(res => {
      let listo = false; const fin = b => { if (!listo) { listo = true; res(b); } };
      try { cv.toBlob(b => fin(b), tipo, calidad); } catch (e) { fin(null); }
      setTimeout(() => fin(null), 10000);
    }).then(b => {
      if (b && b.size) return b;
      try { return dataUrlABlob(cv.toDataURL(tipo, calidad)); } catch (e) { return null; }
    });
  }
  // Firma PNG + IHDR con el ancho y el alto esperados
  async function verificarPNG(blob, w, h) {
    if (!blob || blob.size < 64) return { ok: false, bytes: blob ? blob.size : 0 };
    const u = new Uint8Array(await blob.slice(0, 24).arrayBuffer()), dv = new DataView(u.buffer);
    const firma = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => u[i] === v);
    const ihdr = String.fromCharCode(u[12], u[13], u[14], u[15]) === 'IHDR';
    const ancho = dv.getUint32(16), alto = dv.getUint32(20);
    return { ok: firma && ihdr && ancho === w && alto === h, firma, ancho, alto, bytes: blob.size };
  }
  // Píxeles de una región reducida: desviación de la luminancia y colores distintos (una imagen en blanco da casi 0).
  // Solo lo usan las pruebas. willReadFrequently: lienzo en CPU, así getImageData no espera a la GPU (con GPU por software,
  // cada lectura esperaba a que la GPU vaciara su cola). Mide lo mismo: la región reducida y sus estadísticas.
  function estadisticas(fuente, reg) {
    reg = reg || { x: 0, y: 0, w: fuente.width, h: fuente.height };
    const c = document.createElement('canvas'); c.width = Math.max(8, Math.min(120, Math.round(reg.w))); c.height = Math.max(8, Math.min(168, Math.round(reg.h)));
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(fuente, reg.x, reg.y, reg.w, reg.h, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0, s = 0, s2 = 0; const colores = new Set();
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; s2 += l * l; n++;
      colores.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
    }
    const media = s / n;
    return { desviacion: Math.sqrt(Math.max(0, s2 / n - media * media)), colores: colores.size, media };
  }
  const enBlanco = e => !e || e.desviacion < 4 || e.colores < 12;
  // PDF de una página con el JPEG del cómic (sin librerías). jpeg: Uint8Array o data URL
  function buildPdf(jpeg, pxW, pxH) {
    const jpg = typeof jpeg === 'string' ? dataUrlBytes(jpeg) : jpeg;
    const ptW = 612, ptH = Math.round(612 * pxH / pxW);
    const enc = s => new TextEncoder().encode(s);
    const parts = [], offsets = [];
    let len = 0;
    const push = u => { parts.push(u); len += u.length; };
    push(enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'));
    const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
    const ascii = t => String(t).normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
    const objs = [
      `<< /Type /Catalog /Pages 2 0 R >>`,
      `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      null,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
      `<< /Title (${ascii(C.pdfTitulo || 'Mi comic')}) /Producer (${ascii(C.pdfProductor || 'Amazona Verse Engine')}) >>`,
    ];
    objs.forEach((o, i) => {
      offsets.push(len);
      if (o === null) {
        push(enc(`${i + 1} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`));
        push(jpg); push(enc('\nendstream\nendobj\n'));
      } else push(enc(`${i + 1} 0 obj\n${o}\nendobj\n`));
    });
    const xref = len;
    let xs = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const o of offsets) xs += String(o).padStart(10, '0') + ' 00000 n \n';
    xs += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(enc(xs));
    return new Blob(parts, { type: 'application/pdf' });
  }

  // ---------- Editor ----------
  // Todo se elige de listas (sin texto libre: seguridad infantil): título, qué escenas van en la página (hasta 6), el texto de
  // cada una, su orden, «¿Qué aprendí?» y «Mi enseñanza de vida». Los 4 botones de la página son acciones reales (zonas del lienzo).
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function syncComicForm() {
    S.comic.title = tituloValido(S.comic.title);
    $('c-title').innerHTML = TITULOS.map(t => `<option value="${esc(t)}">${esc(T(t))}</option>`).join('');
    $('c-title').value = S.comic.title;
    for (const k of ['aprendi', 'ensenanza']) {
      const sel = $('c-' + k); if (!sel) continue;
      const ops = opcionesLeccion(k), i = Number.isInteger(S.comic[k]) && S.comic[k] < ops.length ? S.comic[k] : 0;
      sel.innerHTML = ops.length ? ops.map((o, j) => `<option value="${j}"${j === i ? ' selected' : ''}>${esc(T(o))}</option>`).join('') : `<option value="0">${esc(leccion(k))}</option>`;
      sel.disabled = ops.length < 2;
    }
    const panels = orderedPanels(), visibles = new Set(enPagina(panels).map(p => p.id)), llena = visibles.size >= MAXV;
    $('c-panels').innerHTML = panels.map((p, i) => { const v = visibles.has(p.id); return `<li class="${v ? 'en' : 'fuera'}"><div class="pn">${L('Escena', 'Scene')} ${i + 1}</div>
      <label class="pv"><input type="checkbox" data-ver="${p.id}"${v ? ' checked' : ''}${!v && llena ? ' disabled' : ''}> ${L('En la página', 'On the page')}</label>
      <select id="cap-${p.id}" data-id="${p.id}" aria-label="${L('Texto de la escena', 'Scene text')} ${i + 1}">${p.opciones.map((o, k) => `<option value="${k}"${k === p.eleccion ? ' selected' : ''}>${esc(T(o))}</option>`).join('')}</select>
      <div class="pm"><button class="btn ghost sm" type="button" data-mv="-1" data-i="${i}" aria-label="${L('Subir escena', 'Move scene up')} ${i + 1}">↑</button><button class="btn ghost sm" type="button" data-mv="1" data-i="${i}" aria-label="${L('Bajar escena', 'Move scene down')} ${i + 1}">↓</button></div></li>`; }).join('');
    const nota = $('c-escenas-nota');
    if (nota) nota.textContent = panels.length > MAXV ? L(`Tienes ${panels.length} escenas: en la página caben 6.`, `You have ${panels.length} scenes: 6 fit on the page.`)
      : panels.length < MAXV ? L(`Tienes ${panels.length} de 6 escenas. Las que faltan aparecen al jugar.`, `You have ${panels.length} of 6 scenes. The rest appear as you play.`) : L('Tus 6 escenas están en la página.', 'Your 6 scenes are on the page.');
  }
  function moveComicPanel(i, dir) {
    const n = comicPanels().length;
    const order = orderedPanels().map(p => comicPanels().findIndex(q => q.id === p.id));
    const j = i + dir; if (j < 0 || j >= n) return false;
    [order[i], order[j]] = [order[j], order[i]];
    S.comic.order = order; return true;
  }
  // Poner o quitar una escena de la página (como mucho 6). → false si no se pudo
  function verEscena(id, ver) {
    const panels = orderedPanels(), vis = enPagina(panels).map(p => p.id).filter(x => x !== id);
    if (ver) { if (vis.length >= MAXV) return false; vis.push(id); }
    S.comic.ocultas = panels.map(p => p.id).filter(x => !vis.includes(x));
    return true;
  }
  $('c-panels').addEventListener('click', e => {
    const b = e.target.closest('button[data-mv]'); if (!b) return;
    if (moveComicPanel(+b.dataset.i, +b.dataset.mv)) { syncComicForm(); refreshComic(); G.guardado.autosave(); }
  });
  $('c-panels').addEventListener('change', e => {
    const cb = e.target.closest('input[data-ver]');
    if (cb) {
      if (!verEscena(cb.dataset.ver, cb.checked)) { cb.checked = false; aviso(L('En la página caben 6 escenas: quita una primero.', '6 scenes fit on the page: remove one first.'), 3000); }
      syncComicForm(); refreshComic(); G.guardado.autosave(); return;
    }
    const sel = e.target.closest('select[data-id]'); if (!sel) return;
    const i = parseInt(sel.value, 10);
    if (i > 0) S.comic.captions[sel.dataset.id] = i; else delete S.comic.captions[sel.dataset.id];
    refreshComic(); G.guardado.autosave();
  });
  $('c-title').addEventListener('change', () => { S.comic.title = tituloValido($('c-title').value); refreshComic(); G.guardado.autosave(); });
  for (const k of ['aprendi', 'ensenanza']) if ($('c-' + k)) $('c-' + k).addEventListener('change', () => { S.comic[k] = parseInt($('c-' + k).value, 10) || 0; refreshComic(); G.guardado.autosave(); });
  // Botones de la página (14–17) y de la barra del editor: misma acción
  function verSeccion(id) {
    const el = $(id); if (!el) return false;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { el.scrollIntoView(); }
    el.classList.remove('destaca'); void el.offsetWidth; el.classList.add('destaca');
    return true;
  }
  function accionBoton(id) {
    if (id === 'escenas') return verSeccion('c-sec-escenas');
    if (id === 'editar') { verSeccion('c-sec-editar'); const t = $('c-title'); if (t) t.focus({ preventScroll: true }); return true; }
    if (id === 'descargar') { verSeccion('c-sec-descargar'); const b = $('c-png'); if (b) b.focus({ preventScroll: true }); return true; }
    if (id === 'compartir') { $('c-share').click(); return true; } // records.js: puerta para adultos
    return false;
  }
  function botonEn(ev) {
    const cv = $('comic-canvas'), r = cv.getBoundingClientRect(), R = ultimoRender && ultimoRender.target === cv ? ultimoRender.info : null;
    if (!R || !r.width) return null;
    const px = (ev.clientX - r.left) * cv.width / r.width, py = (ev.clientY - r.top) * cv.height / r.height;
    return R.botones.find(b => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) || null;
  }
  $('comic-canvas').addEventListener('click', ev => { const b = botonEn(ev); if (b) accionBoton(b.id); });
  $('comic-canvas').addEventListener('pointermove', ev => { $('comic-canvas').style.cursor = botonEn(ev) ? 'pointer' : ''; });
  for (const [id, a] of [['c-ver', 'escenas'], ['c-editar', 'editar']]) if ($(id)) $(id).addEventListener('click', () => accionBoton(a));
  async function openComic() {
    $('end').hidden = true; $('comic').hidden = false;
    $('c-export').hidden = true;
    syncComicForm();
    await refreshComic();
  }
  async function refreshComic() { return renderComic($('comic-canvas')); }

  // ---------- Entrega del archivo ----------
  const enVisor = () => !!window.claude; // en el visor de Claude, <a download> no funciona
  let promesaDescargas = null, descargas = null, descargasPrueba = null;
  async function obtenerDescargas() {
    if (descargas) return descargas;
    if (!promesaDescargas) promesaDescargas = (async () => { try { return (await window.claude?.use?.('downloads')) || null; } catch (e) { return null; } })();
    const d = await Promise.race([promesaDescargas, new Promise(r => setTimeout(() => r(null), 4000))]);
    if (d) descargas = d;
    return d;
  }
  if (enVisor()) obtenerDescargas(); // la consulta se adelanta; responde más tarde
  async function copiarImagen(blob) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) return false;
      await navigator.clipboard.write([new window.ClipboardItem({ [blob.type || 'image/png']: blob })]);
      return true;
    } catch (e) { return false; }
  }
  const mostrado = { blob: null, url: null, enlace: null, formato: null };
  function botonesExtra() {
    let abrir = $('c-open'), copiar = $('c-copy');
    if (!abrir) {
      abrir = document.createElement('button'); abrir.id = 'c-open'; abrir.type = 'button'; abrir.className = 'btn ghost'; abrir.setAttribute('data-icon', 'book');
      copiar = document.createElement('button'); copiar.id = 'c-copy'; copiar.type = 'button'; copiar.className = 'btn ghost'; copiar.setAttribute('data-icon', 'save');
      $('c-download').after(abrir, copiar);
      abrir.onclick = () => abrirArchivo();
      copiar.onclick = async () => { aviso(mostrado.blob && await copiarImagen(mostrado.blob) ? L('Imagen copiada al portapapeles.', 'Image copied to the clipboard.')
        : L('No se pudo copiar aquí. Mantén presionada la imagen (o clic derecho) y elige Guardar imagen.', 'Could not copy here. Press and hold the image (or right-click) and choose Save image.'), 3500); };
    }
    return { abrir, copiar };
  }
  function abrirArchivo() {
    if (!mostrado.blob) return false;
    const u = URL.createObjectURL(mostrado.blob);
    let w = null; try { w = window.open(u, '_blank'); } catch (e) { w = null; }
    setTimeout(() => URL.revokeObjectURL(u), 60000);
    if (!w) aviso(L('Este navegador no abrió otra pestaña. Mantén presionada la imagen (o clic derecho) y elige Guardar imagen.', 'This browser did not open a new tab. Press and hold the image (or right-click) and choose Save image.'), 4500);
    return !!w;
  }
  function mostrarExportado(format, blob, url) {
    mostrado.blob = blob; mostrado.url = url; mostrado.formato = format;
    if (mostrado.enlace) URL.revokeObjectURL(mostrado.enlace);
    mostrado.enlace = URL.createObjectURL(blob); // blob: en el enlace (un data: de más de 2 MB no descarga en Chrome)
    const png = format === 'png', a = $('c-download'), b = botonesExtra();
    $('c-export-img').hidden = !png; if (png) $('c-export-img').src = url;
    a.href = mostrado.enlace; a.download = FILE + '.' + format; a.textContent = png ? L('Descargar PNG', 'Download PNG') : L('Descargar PDF', 'Download PDF');
    a.hidden = enVisor();
    b.abrir.textContent = png ? L('Abrir imagen', 'Open image') : L('Abrir PDF', 'Open PDF');
    b.copiar.textContent = L('Copiar imagen', 'Copy image'); b.copiar.hidden = !png;
    $('c-export-note').textContent = png
      ? (enVisor() ? L('Guárdala con la ventana de descarga. Si no aparece: mantén presionada la imagen (o clic derecho) y elige Guardar imagen, o usa Abrir o Copiar.',
        'Save it with the download window. If it does not appear: press and hold the image (or right-click) and choose Save image, or use Open or Copy.')
        : L('En computadora: Descargar PNG. En iPhone o Android: mantén presionada la imagen y elige Guardar.', 'On a computer: Download PNG. On iPhone or Android: press and hold the image and choose Save.'))
      : L('PDF listo. Si no se descarga aquí, usa Abrir PDF o exporta el PNG.', 'PDF ready. If it does not download here, use Open PDF or export the PNG.');
    $('c-export').hidden = false;
  }
  // → 'guardado' | 'rechazado' | 'espera' | 'copiado' | 'enlace' | 'manual'
  async function entregar(format, blob, o) {
    o = o || {};
    const nombre = FILE + '.' + format;
    const d = descargasPrueba || await obtenerDescargas();
    if (d && typeof d.save === 'function') {
      try {
        const r = await d.save({ filename: nombre, data: blob });
        if (!r || r.status !== 'delivered') aviso(L('Listo: tu cómic se guardó.', 'Done: your comic was saved.'));
        return 'guardado';
      } catch (e) {
        const code = e && e.code;
        if (code === 'declined') { aviso(L('Descarga cancelada', 'Download cancelled')); return 'rechazado'; }
        if (code === 'rate_limited') { aviso(L('Hay otra descarga abierta; inténtalo en un momento.', 'Another download is open; try again in a moment.')); return 'espera'; }
        // unavailable, too_large, etc.: plan B
      }
    }
    if (!(o.visor != null ? o.visor : enVisor())) return 'enlace'; // fuera del visor queda el enlace Descargar
    if (format === 'png' && await (o.copiar || copiarImagen)(blob)) {
      aviso(L('Imagen copiada al portapapeles. También puedes mantenerla presionada o usar Abrir imagen para guardarla.', 'Image copied to the clipboard. You can also press and hold it or use Open image to save it.'), 5000);
      return 'copiado';
    }
    aviso(format === 'png' ? L('Mantén presionada la imagen (o clic derecho) y elige Guardar imagen.', 'Press and hold the image (or right-click) and choose Save image.')
      : L('Usa Abrir PDF para verlo y guardarlo.', 'Use Open PDF to view and save it.'), 4500);
    return 'manual';
  }
  const ultimo = { png: null, pdf: null, pdfUrl: null };
  // Compone la página y la codifica; el PNG se verifica (firma + ancho y alto). Sin avisos, eventos ni guardado:
  // lo usan exportComic y pngSinRegistro (el botón «Compartir», src/game/records.js)
  async function blobDelComic(cv, tipo, calidad) {
    await renderComic(cv);
    let blob = await aBlob(cv, tipo, calidad);
    if (!blob) { await renderComic(cv, { seguro: true }); blob = await aBlob(cv, tipo, calidad); } // lienzo contaminado
    if (blob && tipo === 'image/png' && !(await verificarPNG(blob, cv.width, cv.height)).ok) {
      try { blob = dataUrlABlob(cv.toDataURL('image/png')); } catch (e) { blob = null; }
      if (blob && !(await verificarPNG(blob, cv.width, cv.height)).ok) blob = null;
    }
    return blob;
  }
  const pngSinRegistro = () => blobDelComic($('comic-canvas'), 'image/png');
  async function exportComic(format, fromUser) {
    const cv = $('comic-canvas'), pdf = format === 'pdf';
    const tipo = pdf ? 'image/jpeg' : 'image/png', calidad = pdf ? 0.9 : undefined;
    let blob = await blobDelComic(cv, tipo, calidad);
    if (!blob) { aviso(L('Este navegador no pudo crear la imagen del cómic.', 'This browser could not create the comic image.'), 4000); return null; }
    let url;
    if (pdf) {
      blob = buildPdf(new Uint8Array(await blob.arrayBuffer()), cv.width, cv.height);
      if (ultimo.pdfUrl) URL.revokeObjectURL(ultimo.pdfUrl);
      url = ultimo.pdfUrl = URL.createObjectURL(blob); ultimo.pdf = blob;
    } else { ultimo.png = blob; url = await blobADataUrl(blob); }
    mostrarExportado(format, blob, url);
    G.eventos.log('ComicExported', { format, bytes: blob.size });
    G.guardado.autosave();
    if (fromUser) await entregar(format, blob);
    return url;
  }
  $('b-comic').onclick = openComic;
  // Con la partida terminada el cómic también se abre desde el menú de pausa («Mi cómic»), para quien eligió «Seguir explorando».
  // Al cerrarlo vuelve al panel final solo si ese panel sigue pendiente (S.explorando = ya lo cerró).
  const bMenu = $('b-comic-menu');
  if (bMenu) {
    bMenu.onclick = openComic;
    const verMenu = () => { bMenu.hidden = !S.complete; };
    G.on('apply', verMenu, 65); verMenu();
    if ($('pause')) $('pause').addEventListener('toggle', verMenu);
  }
  $('c-close').onclick = () => { $('comic').hidden = true; if (G.comicPlantilla.limpiarCache) G.comicPlantilla.limpiarCache(); if (S.complete && !S.explorando) $('end').hidden = false; };
  $('c-refresh').onclick = refreshComic;
  $('c-png').onclick = () => exportComic('png', true);
  $('c-pdf').onclick = () => exportComic('pdf', true);
  G.on('apply', () => {
    vistos = Array.isArray(S.events) ? S.events.length : 0; $('comic').hidden = true; posadas.length = 0;
    pendientes.clear();
    for (const k of Object.keys(S.captures || {})) if (!S.captures[k]) delete S.captures[k]; // partidas con capturas nulas (QA-21)
  }, 60);

  // =====================================================================================================================
  // AV.comicTest(): un evento real del juego genera su viñeta con la apariencia actual del jugador; la página se compone
  // y se exporta a PNG válido (firma, IHDR, 1080×1520, se decodifica y no está en blanco); entrega con y sin 'downloads'.
  // G.S y el guardado real quedan como estaban.
  // =====================================================================================================================
  async function cg37Comprobar(check) {
    const ids = ['ep2', 'ep3', 'ep4', 'ep5', 'ep6'];
    const tablaOk = ids.every(id => {
      const ex = CG37[id];
      if (!ex || !ex.titulos.length || ex.aprendi.length < 2 || ex.ensenanza.length < 3) return false;
      return ex.aprendi.every(o => o.es && o.en && o.es !== o.en && !/[ñ¿]/.test(o.en)) && ex.ensenanza.every(o => o.es && o.en && o.es !== o.en);
    });
    check('CG-37 · caps. 2 a 6 traen títulos, ¿Qué aprendí? y enseñanza en ES y EN', tablaOk, ids.map(id => id + ':' + CG37[id].vinetas && Object.keys(CG37[id].vinetas).length).join(' '));
    const ajena = narracionDe({ id: 'final', eleccion: 0, text: 'Pedí ayuda. La señal cruzó hasta la niebla y las dos voces se oyeron enteras.' });
    check('CG-37 · el final del cap. 5 no usa el texto de ¡La meta! del cap. 1', ajena.indexOf('haremos un bote') < 0 && ajena.indexOf('Pedí ayuda') >= 0, ajena);
    const ex = CG37[G.pack && G.pack.id];
    if (!ex) return;
    const defs = (C.vinetas || []).filter(v => ex.vinetas[v.id]);
    check('CG-37 · las viñetas de este capítulo tienen tipo, sin cambiar cuántas hay', defs.length === Object.keys(ex.vinetas).length && defs.every(v => v.tipo && v.pose), defs.map(v => v.id + ':' + v.tipo).join(' '));
    for (const o of ex.aprendi.concat(ex.ensenanza)) if (!G.eventos.had(o.needs)) G.eventos.log(o.needs, {});
    if (!(G.idioma && G.idioma.poner && G.idioma.actual)) return;
    const antes = G.idioma.actual();
    try {
      await G.idioma.poner('en');
      const r = await datosPagina();
      const tits = r.datos.vinetas.filter(v => !v.falta).map(v => v.sceneTitle);
      check('CG-37 · en inglés, los títulos y lo aprendido de este capítulo salen en EN', tits.every(t => t && !/[áéíóúñ¡¿]/i.test(t)) && !/[ñ¿]/.test(r.datos.aprendi) && r.datos.aprendi !== ex.aprendi[0].es, (tits.join(' | ') || 'sin títulos') + ' · ' + r.datos.aprendi);
    } finally { await G.idioma.poner(antes); }
  }
  async function test(opts) {
    opts = opts || {};
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const SV = G.guardado, snap = SV.instantanea(), quiet = G.quiet, abierto = !$('comic').hidden;
    SV.suspender(true); G.quiet = true;
    try {
      const defs = C.vinetas || [];
      const def = defs.find(v => v.img && v.img !== 'portrait') || defs[0];
      check('El pack define viñetas ligadas a eventos', !!def, defs.length + ' viñetas');
      if (!def) throw new Error('sin viñetas');
      // Apariencia de la prueba, distinta de la habitual
      let look = null;
      try { look = G.creador.profileLook({ preset: 'agilis', outfit: 'morado', accessory: 'gafas' }); } catch (e) { look = null; }
      S.profile = Object.assign({}, S.profile, { created: true, look });
      // El evento no ha ocurrido todavía: no hay viñeta
      S.events = S.events.filter(e => e.key !== def.needs); delete vin()[def.id];
      if (def.img !== 'portrait') delete S.captures[def.img];
      vistos = S.events.length;
      check('Sin el evento no hay viñeta', !comicPanels().some(p => p.id === def.id));
      // Evento real por el mismo camino que el juego (G.eventos.log) y un cuadro del bucle
      G.eventos.log(def.needs, {});
      G.renderer.update(0.05);
      // CG-64: la captura se dibuja en el momento pero el JPEG se codifica 1–2 cuadros después (sin congelar).
      // 0m: la espera da tiempo real de pared (en la nube la cerca puede tardar >300 ms y va por respaldo síncrono).
      if (def.img !== 'portrait' && lienzoListo()) { for (let i = 0; i < 100 && !S.captures[def.img]; i++) { G.renderer.update(0); await new Promise(r => setTimeout(r, 10)); } }
      const reg = vin()[def.id], p = comicPanels().find(q => q.id === def.id);
      check('Evento real → viñeta', !!p && G.eventos.had(def.needs) && !!reg, `${def.needs} → ${def.id}`);
      check('La viñeta guarda la apariencia del jugador de ese momento', reg && claveLook(reg.look) === claveLook(lookActual()), reg && reg.look ? reg.look.species : 'sin look');
      if (def.img !== 'portrait') {
        if (lienzoListo()) check('El mundo se capturó para la viñeta', /^data:image\//.test(S.captures[def.img] || ''), def.img);
        else check('Lienzo sin tamaño: la captura no guarda null y queda pendiente', !(def.img in S.captures) && pendientes.has(def.img), 'ventana 0×0');
      }
      // Componer y exportar a PNG
      S.comic.layout = 'grid'; S.comic.order = [];
      const url = await exportComic('png');
      const HP = H, blob = ultimo.png, v = await verificarPNG(blob, W, HP);
      check(`PNG válido: firma, IHDR y ${W}×${HP}`, v.ok && typeof url === 'string' && url.startsWith('data:image/png'), `${v.ancho}×${v.alto} · ${Math.round((v.bytes || 0) / 1024)} KB`);
      const im = url ? await loadImg(url) : null;
      check('El PNG se decodifica con esas dimensiones', im && im.width === W && im.height === HP, im ? im.width + '×' + im.height : 'no carga');
      const eT = im && estadisticas(im);
      check('El PNG no está en blanco', eT && !enBlanco(eT), eT ? `desv. ${eT.desviacion.toFixed(1)} · ${eT.colores} colores` : '');
      const R = ultimoRender, i = R ? R.panels.findIndex(q => q.id === def.id) : -1, caja = i >= 0 ? R.boxes[i] : null;
      const eV = im && caja && estadisticas(im, caja);
      check('La viñeta del evento está en la página y tiene imagen', !!caja && eV && !enBlanco(eV), eV ? `desv. ${eV.desviacion.toFixed(1)} · ${eV.colores} colores` : 'sin caja');
      check('La viñeta se dibujó con el look de su momento', R && reg && R.looks[def.id] === claveLook(reg.look));
      if (def.img !== 'portrait') {
        const cam = R.cameos.find(c => c.id === def.id), eC = im && cam && estadisticas(im, { x: cam.x, y: cam.y, w: cam.s, h: cam.s });
        check('El retrato del jugador aparece en la viñeta', !!cam && eC && !enBlanco(eC), cam ? `${cam.s} px · desv. ${eC.desviacion.toFixed(1)}` : 'sin retrato');
      }
      // Cambiarse de ropa después no reescribe esa viñeta
      try { S.profile = Object.assign({}, S.profile, { look: G.creador.profileLook({ preset: 'oratrix', outfit: 'amarillo', accessory: 'gorra' }) }); } catch (e) { /* sin modelo */ }
      const p2 = comicPanels().find(q => q.id === def.id);
      check('Cambiar de apariencia después no cambia esa viñeta', p2 && claveLook(p2.look) === claveLook(reg.look) && claveLook(lookActual()) !== claveLook(reg.look));
      // Viñetas del motor por sus ganchos: techo/cumbrera y rama alta (movimiento), nido y eclosión (criadero)
      if (C.vinetasMotor !== false) {
        const foto = (() => { const c = document.createElement('canvas'); c.width = 480; c.height = 360; const g = c.getContext('2d');
          const gr = g.createLinearGradient(0, 0, 480, 360); gr.addColorStop(0, '#2d5a43'); gr.addColorStop(1, '#f2a03d'); g.fillStyle = gr; g.fillRect(0, 0, 480, 360);
          g.fillStyle = '#7fc35a'; g.beginPath(); g.arc(240, 180, 90, 0, 7); g.fill(); return c.toDataURL('image/jpeg', 0.8); })();
        const casos = [
          { id: 'techo', key: 'FirstRoofPerch', look: { preset: 'albifrons', outfit: 'naranja', accessory: 'gorra' }, disparar: () => G.emit('posado', { tipo: 'alto', que: 'cumbrera', altura: 4.2 }) },
          { id: 'rama', key: 'FirstHighBranchPerch', look: { preset: 'versicolor', outfit: 'azul', accessory: 'medalla' }, disparar: () => G.emit('posado', { tipo: 'fino', que: 'rama', altura: 3.1 }) },
          { id: 'nido', key: 'NestAppeared', look: { preset: 'festiva', outfit: 'rojo', accessory: 'ninguno' }, disparar: () => G.emit('criadero', 'nido') },
          { id: 'eclosion', key: 'ChickHatched', look: { preset: 'guildingii', outfit: 'amarillo', accessory: 'gafas' }, disparar: () => G.emit('criadero', 'eclosion', { id: 'h1', imagen: foto }) },
        ];
        for (const c of casos) { S.events = S.events.filter(e => e.key !== c.key); delete vin()[c.id]; delete S.captures[c.id]; }
        vistos = S.events.length;
        // Con G.quiet (baterías) los ganchos no crean nada; una rama baja, una roca o un poste tampoco cuentan
        G.emit('posado', { tipo: 'alto', que: 'techo', altura: 5 }); G.emit('criadero', 'nido');
        G.quiet = false;
        try { G.emit('posado', { tipo: 'fino', que: 'rama', altura: 1.2 }); G.emit('posado', { tipo: 'alto', que: 'roca', altura: 3 }); G.emit('posado', { tipo: 'fino', que: 'poste', altura: 3 }); }
        finally { G.quiet = true; }
        check('Con G.quiet, en una rama baja, una roca o un poste no hay viñeta', !casos.some(c => G.eventos.had(c.key)));
        for (const c of casos) {
          try { S.profile = Object.assign({}, S.profile, { look: G.creador.profileLook(c.look) }); } catch (e) { /* sin modelo */ }
          G.quiet = false; try { c.disparar(); } finally { G.quiet = true; }
          const r = vin()[c.id], pm = comicPanels().find(q => q.id === c.id);
          check(`Gancho → ${c.key} → viñeta «${c.id}» con la apariencia de ese momento`, G.eventos.had(c.key) && !!pm && r && claveLook(r.look) === claveLook(lookActual()), r && r.look ? r.look.species : 'sin look');
        }
        check('La eclosión usa la foto de la escena del criadero', S.captures.eclosion === foto);
        for (let i = 0; i < 8; i++) G.renderer.update(0.05); // las posadas se fotografían un instante después
        if (lienzoListo()) for (let i = 0; i < 100 && !(S.captures.techo && S.captures.rama); i++) { G.renderer.update(0); await new Promise(r => setTimeout(r, 10)); } // CG-64: lectura diferida; 0m: espera con tiempo real (nube)
        if (lienzoListo()) check('Techo y rama: foto encuadrada desde un ángulo libre (QA-32)', /^data:image\/jpeg/.test(S.captures.techo || '') && /^data:image\/jpeg/.test(S.captures.rama || ''));
        const solBk = G.solidos;
        try { G.solidos = { activo: true, dentro: () => 99 }; check('Si un sólido tapa todos los ángulos, no hay foto tapada (rama: ilustración)', fotoPosada() === null); }
        finally { G.solidos = solBk; }
        const aguaBk = G.agua.levelAt;
        try { // nadando: la superficie queda por encima de S.pos; la cámara no puede quedar bajo el agua
          G.agua.levelAt = () => S.pos.y + 0.8; ultimaPosada = null; const f = fotoPosada();
          check('Chapuzón: la foto se toma desde encima del agua (no desde el fondo)', f === null || (ultimaPosada && ultimaPosada.q.y >= S.pos.y + 0.8 + 0.35), ultimaPosada ? ultimaPosada.q.y.toFixed(2) + ' / agua ' + (S.pos.y + 0.8).toFixed(2) : 'sin ángulo libre');
        const nomCg = (S.profile && S.profile.name) || 'yo';
        const txChap = narracionDe({ id: 'chapuzon', eleccion: 0, text: '¡Chapuzón! Vittata descubrió que el río está mojado. Muy mojado.' });
        const txMeta = narracionDe({ id: 'final', eleccion: 0, text: 'El transmisor nos mostró un símbolo de 36 fragmentos. Desde el mirador vimos otras islas: construiremos un bote.' });
        check('CG-36 · el chapuzón nombra al jugador y no dice «Vittata descubrió»', txChap.indexOf(nomCg) >= 0 && txChap.indexOf('Vittata descubrió') < 0, txChap);
        check('CG-36 · ¡La meta! cabe sin letra diminuta', txMeta.length > 20 && txMeta.length < 120 && !G.comicPlantilla.POSES.nadar.prop, txMeta.length + ' · agua ' + (G.comicPlantilla.POSES.nadar.prop || 'no'));
        } finally { G.agua.levelAt = aguaBk; }
        const copaBk = G.camara.copaLibre;
        try { G.camara.copaLibre = () => false; check('Posada dentro de una copa (hojas en todos los ángulos): sin foto, la rama usa su ilustración (QA-32)', fotoPosada() === null); }
        finally { G.camara.copaLibre = copaBk; }
        G.quiet = false; try { G.emit('criadero', 'nido'); G.emit('posado', { tipo: 'alto', que: 'techo', altura: 6 }); } finally { G.quiet = true; }
        check('Cada evento del motor cuenta una sola vez por partida', S.events.filter(e => e.key === 'NestAppeared' || e.key === 'FirstRoofPerch').length === 2);
        // Página con todas las viñetas: más alta si hace falta, PNG válido y cada viñeta nueva con contenido y en orden
        const url2 = await exportComic('png'), R2 = ultimoRender, alto = H;
        const v2 = await verificarPNG(ultimo.png, W, alto), im2 = url2 ? await loadImg(url2) : null;
        check(`PNG con ${R2.panels.length} viñetas: válido y de ${W}×${alto}`, v2.ok && im2 && im2.width === W && im2.height === alto, `${v2.ancho}×${v2.alto}`);
        const enLa = casos.filter(c => R2.panels.some(q => q.id === c.id));
        const vacias = enLa.filter(c => { const j = R2.panels.findIndex(q => q.id === c.id), e = j >= 0 && im2 ? estadisticas(im2, R2.boxes[j]) : null; return !e || enBlanco(e); });
        check('Las viñetas nuevas que van en la página (como mucho 6) no están en blanco', enLa.length > 0 && vacias.length === 0 && R2.panels.length <= 6, (vacias.map(c => c.id).join(', ') || enLa.map(c => c.id).join(', ')) + ' · ' + R2.panels.length + ' en la página');
        const tits = R2.datos.vinetas.filter(v => !v.falta).map(v => v.sceneTitle), jMeta = R2.panels.findIndex(q => tipoDe(VINETAS.find(v => v.id === q.id)) === 'meta');
        const jIntro = R2.panels.findIndex(q => q.id === 'intro');
        check('Las viñetas siguen la plantilla: el comienzo (si lo hay) primero, ¡La meta! (si la hay) en la última y sin títulos repetidos',
          jIntro <= 0 && (jMeta < 0 || jMeta === R2.panels.length - 1) && new Set(tits).size === tits.length, R2.panels.map(q => q.id).join(' · ') + ' | ' + tits.join(' · '));
        // ---- Plantilla de Kelvin (docs/equipo/COMIC_PLANTILLA_GUIA.md §7) ----
        await plantillaTest(check, im2, R2);
      }
      // Gags del pichón (mejora 9): el hecho real (gags.js → G.emit('criadero', 'gag', …), lo anota momentos.js) crea la viñeta
      // una vez, con la foto del momento o una captura del mundo; sin ninguna, su ilustración. Un gag que nadie conoce no hace nada.
      const gags = VINETAS.filter(v => v.gag);
      const gagEv = (v, extra) => G.emit('criadero', 'gag', Object.assign({ gag: v.gag, clave: v.needs, id: 'h1', etapa: 'bebe' }, extra || {}));
      if (gags.length && G.momentos && G.momentos.alGag) {
        const fotoGag = (() => { const c = document.createElement('canvas'); c.width = 480; c.height = 360; const g = c.getContext('2d');
          const gr = g.createLinearGradient(0, 0, 0, 360); gr.addColorStop(0, '#9fd3f0'); gr.addColorStop(1, '#3e7f3f'); g.fillStyle = gr; g.fillRect(0, 0, 480, 360);
          g.fillStyle = '#f29a2e'; g.beginPath(); g.arc(300, 120, 40, 0, 7); g.fill(); g.fillStyle = '#7fc35a'; g.beginPath(); g.arc(200, 250, 70, 0, 7); g.fill(); return c.toDataURL('image/jpeg', 0.8); })();
        S.profile = Object.assign({}, S.profile, { created: true });
        for (const v of gags) { S.events = S.events.filter(e => e.key !== v.needs); delete vin()[v.id]; delete S.captures[v.img]; pendientes.delete(v.img); delete S.comic.captions[v.id]; }
        vistos = S.events.length;
        check('Sin gags del pichón no hay sus viñetas (si el gag no existe, nunca salen)', !comicPanels().some(p => gags.some(v => v.id === p.id)), gags.map(v => v.gag).join(', '));
        check('Cada gag trae 3 textos graciosos a elegir, además del suyo', gags.every(v => (v.opciones || []).length === 3 && typeof v.texto === 'string'));
        for (const v of gags) gagEv(v, { foto: () => fotoGag });
        check('Con G.quiet (baterías) los gags no crean viñetas', !gags.some(v => G.eventos.had(v.needs)));
        const nEv = S.events.length;
        G.quiet = false;
        try { G.emit('criadero', 'gag', { gag: 'volarDeLado', clave: 'ChickFlewSideways', id: 'h1' }); G.emit('criadero', 'gag', null); } finally { G.quiet = true; }
        check('Un gag sin viñeta no registra nada', S.events.length === nEv);
        const conFoto = gags.filter((v, j) => j % 2 === 1), sinFoto = gags.filter((v, j) => j % 2 === 0);
        const lookGag = { preset: 'versicolor', outfit: 'rojo', accessory: 'gorra' };
        try { S.profile = Object.assign({}, S.profile, { look: G.creador.profileLook(lookGag) }); } catch (e) { /* sin modelo */ }
        G.quiet = false;
        try {
          for (const v of conFoto) gagEv(v, { foto: () => fotoGag }); // con la foto del momento (gags.js)
          for (const v of sinFoto) gagEv(v, { gesto: 'saludar', foto: () => null }); // sin foto: captura del mundo
          for (const v of gags) gagEv(v, { foto: () => fotoGag }); // otra vez
        } finally { G.quiet = true; }
        for (const v of gags) {
          const r = vin()[v.id], pg = comicPanels().find(q => q.id === v.id);
          check(`gag ${v.gag} → ${v.needs} → viñeta «${v.id}» con la apariencia de ese momento y 4 textos`, !!pg && r && claveLook(r.look) === claveLook(lookActual()) && pg.opciones.length === 4, pg ? pg.text : 'sin viñeta');
        }
        check('Cada gag cuenta una sola vez por partida', gags.every(v => S.events.filter(e => e.key === v.needs).length === 1));
        check('El gag con foto la usa en su viñeta', conFoto.every(v => S.captures[v.img] === fotoGag));
        if (lienzoListo()) for (let i = 0; i < 40 && !sinFoto.every(v => /^data:image\//.test(S.captures[v.img] || '')); i++) { G.renderer.update(0); await new Promise(r => setTimeout(r, 0)); } // CG-64: la captura se codifica 1–2 cuadros después
        if (lienzoListo()) check('El gag sin foto captura el mundo', sinFoto.every(v => /^data:image\//.test(S.captures[v.img] || '') && S.captures[v.img] !== fotoGag));
        else check('Gag sin foto con el lienzo sin tamaño: la captura queda pendiente', sinFoto.every(v => pendientes.has(v.img)));
        // Elegir un texto de la lista (sin texto libre)
        const g0 = gags[0]; S.comic.captions[g0.id] = 2;
        const pg0 = comicPanels().find(q => q.id === g0.id);
        check('Se elige uno de los textos graciosos de la lista', pg0 && pg0.text === pg0.opciones[2] && pg0.eleccion === 2, pg0 ? pg0.text : '');
        // Sin foto ni captura (sin WebGL): la ilustración del gag
        for (const v of sinFoto) { delete S.captures[v.img]; pendientes.delete(v.img); }
        // «Foto»: con Foto activa en Gestos, la tecla de un gesto (1–7) hace el gesto y pide la foto; momentos.js la pone en el cómic
        const A = G.actores, M = G.momentos;
        if (A && A.modoFoto && A.EMOTE_KEYS && M && M.tomarFoto) {
          check('Gestos: 7 gestos y el botón «Foto»', A.EMOTE_KEYS.length === 7 && document.querySelectorAll('#emotes [data-emote]').length === 7 && !!document.querySelector('#emotes [data-foto]'));
          // La tecla la recibe input.js (hace el gesto si Vittata puede posar en el suelo y quieta) y luego este módulo. Aquí se
          // simula lo de input.js con un playEmote de prueba y se llama al manejador de este módulo, sin tocar la pausa (el
          // cronómetro del marcador correría) ni depender de dónde está Vittata.
          let pedida = null; const emit = G.emit, jugar = A.playEmote;
          G.emit = function (n, a, b2, c2) { if (n === 'foto') pedida = a; return emit.call(this, n, a, b2, c2); };
          const tecla = async (k, puede, foto) => {
            pedida = null; A.playEmote = name => { if (!puede) return false; A.emote.name = name; return true; };
            A.modoFoto(!!foto);
            const pulsado = !foto || document.querySelector('#emotes [data-foto]').getAttribute('aria-pressed') === 'true';
            const ev = new KeyboardEvent('keydown', { key: k });
            A.playEmote(A.EMOTE_KEYS[+k - 1]); // lo que hace input.js con la tecla
            const atendida = alTeclaFoto(ev);
            await new Promise(r => setTimeout(r, 30));
            const r = { pulsado, atendida, sigue: A.fotoModo, pedida };
            A.playEmote = jugar; if (A.stopEmote) A.stopEmote();
            return r;
          };
          try {
            const g3 = A.EMOTE_KEYS[2], r1 = await tecla('3', true, true);
            check('Foto activa + tecla 3: hace el gesto, cierra Foto y pide la foto con ese gesto', r1.pulsado && r1.atendida && !r1.sigue && !!r1.pedida && r1.pedida.gesto === g3, r1.pedida ? r1.pedida.gesto : JSON.stringify(r1));
            const r2 = await tecla('1', false, true);
            check('Si no puede posar (volando o en el aire), no pide la foto y Foto se cierra', r2.pulsado && !r2.sigue && !r2.pedida, JSON.stringify(r2));
            const r3 = await tecla('2', true, false);
            check('Sin Foto activa, las teclas 1–7 solo hacen el gesto (sin foto)', !r3.atendida && !r3.pedida, JSON.stringify(r3));
          } finally { G.emit = emit; A.playEmote = jugar; A.modoFoto(false); if (A.stopEmote) A.stopEmote(); }
          S.events = S.events.filter(e => e.key !== 'PhotoTaken'); delete vin().foto; delete S.captures.foto;
          G.quiet = false;
          let okF = false; try { okF = lienzoListo() ? M.tomarFoto(A.EMOTE_KEYS[2]) : false; } finally { G.quiet = true; if (G.ui.hideToast) G.ui.hideToast(); const f = document.getElementById('foto-flash'); if (f) f.remove(); }
          if (lienzoListo() && okF) for (let i = 0; i < 100 && !comicPanels().some(q => q.id === 'foto'); i++) { G.renderer.update(0); await new Promise(r => setTimeout(r, 10)); } // CG-64: la foto se completa 1–2 cuadros después; 0m: espera con tiempo real (nube)
          if (lienzoListo()) check('La foto con pose entra al cómic como viñeta', okF && comicPanels().some(q => q.id === 'foto'));
        }
        const url3 = await exportComic('png'), R3 = ultimoRender, alto3 = H;
        const v3 = await verificarPNG(ultimo.png, W, alto3), im3 = url3 ? await loadImg(url3) : null;
        check(`PNG con los gags (${R3.panels.length} viñetas): válido y de ${W}×${alto3}`, v3.ok && im3 && im3.width === W && im3.height === alto3, `${v3.ancho}×${v3.alto}`);
        // En la página caben 6: se eligen los gags y la foto (como haría el niño en «Mis escenas») para verlos dibujados
        const ids = gags.map(v => v.id).concat(comicPanels().some(q => q.id === 'foto') ? ['foto'] : []).slice(0, 6);
        S.comic.ocultas = comicPanels().map(q => q.id).filter(id => !ids.includes(id));
        await exportComic('png'); const R3b = ultimoRender, im3b = ultimo.png ? await loadImg(await blobADataUrl(ultimo.png)) : null;
        check('«Mis escenas»: la página lleva justo las escenas elegidas', R3b.panels.length === ids.length && R3b.panels.every(q => ids.includes(q.id)), R3b.panels.map(q => q.id).join(', '));
        const vacias3 = ids.filter(id => { const j = R3b.panels.findIndex(q => q.id === id), e = j >= 0 && im3b ? estadisticas(im3b, R3b.boxes[j]) : null; return !e || enBlanco(e); });
        delete S.comic.ocultas;
        check('Las viñetas de los gags (foto, captura o ilustración) y la foto con pose no están en blanco', vacias3.length === 0, vacias3.join(', ') || ids.length + ' con imagen');
        if (opts.muestra) opts.muestra(url3);
      }
      // Diseños: sin solapes y dentro de la página
      let malos = 0;
      for (const lay of ['grid', 'strip']) for (let n = 1; n <= 6; n++) {
        const bx = comicLayout(n, lay, LW, LH - 30, TOP);
        const dentro = bx.every(b => b.x >= 0 && b.y >= TOP && b.x + b.w <= LW && b.y + b.h <= LH - 30 && b.w > 100 && b.h > 100);
        const solape = bx.some((a, j) => bx.some((b, k) => j < k && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
        if (!dentro || solape) malos++;
      }
      check('Cuadrícula anterior (comicLayout, la usa manga.js): 1–6 viñetas sin solapes y dentro', malos === 0, malos + ' fallan');
      // Entrega con la capacidad 'downloads' (simulada), cancelada y ausente
      let recibido = null;
      descargasPrueba = { save: async r => { recibido = r; return { status: 'saved' }; } };
      const r1 = await entregar('png', blob);
      check('Con downloads: se ofrece el PNG con su nombre', r1 === 'guardado' && recibido && recibido.filename === FILE + '.png' && recibido.data === blob, recibido ? recibido.filename : 'sin llamada');
      descargasPrueba = { save: async () => { const e = new Error('no'); e.code = 'declined'; throw e; } };
      check('Si el niño cancela, no se reintenta', (await entregar('png', blob)) === 'rechazado');
      descargasPrueba = { save: async () => { const e = new Error('x'); e.code = 'unavailable'; throw e; } };
      const r3 = await entregar('png', blob, { visor: true, copiar: async () => true });
      const r4 = await entregar('png', blob, { visor: true, copiar: async () => false });
      check('Sin downloads en el visor: se copia la imagen o queda a la vista para guardarla', r3 === 'copiado' && r4 === 'manual' && !$('c-export-img').hidden && $('c-export-img').src.startsWith('data:image/png') && !!$('c-open'), `${r3} / ${r4}`);
      check('Fuera del visor queda el enlace de descarga; dentro se oculta', $('c-download').hidden === enVisor() && $('c-download').getAttribute('href').startsWith('blob:'));
      descargasPrueba = null;
      // PDF sin librerías
      if (opts.pdf !== false) {
        await exportComic('pdf');
        const pdf = ultimo.pdf;
        const cab = pdf ? new TextDecoder().decode(new Uint8Array(await pdf.slice(0, 8).arrayBuffer())) : '';
        const fin = pdf ? new TextDecoder().decode(new Uint8Array(await pdf.slice(pdf.size - 6).arrayBuffer())) : '';
        check('PDF de una página sin librerías (cabecera y cierre)', cab.startsWith('%PDF-1.4') && fin.includes('%%EOF') && pdf.size > 20000, pdf ? Math.round(pdf.size / 1024) + ' KB' : 'sin PDF');
      }
      await cg37Comprobar(check);
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      descargasPrueba = null;
      SV.restaurar(snap);
      SV.suspender(false); G.quiet = quiet;
      $('c-export').hidden = true; $('comic').hidden = !abierto;
    }
    const ahora = SV.instantanea();
    check('G.S queda como estaba', JSON.stringify(ahora) === JSON.stringify(snap),
      Object.keys(Object.assign({}, snap, ahora)).filter(k => JSON.stringify(snap[k]) !== JSON.stringify(ahora[k])).join(', '));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  // Prueba mínima de la plantilla (guía §7): página 2:3 con 6 viñetas de eventos reales, logo original byte a byte, dos cotorras
  // distintas cambian los círculos y el personaje central, poses reales, decoraciones solo con su evento, botones como acciones.
  async function plantillaTest(check, im, R) {
    const PT = G.comicPlantilla;
    check(`Página de la plantilla: ${W}×${H} (2:3)`, im && im.width === W && im.height === H && W * 3 === H * 2, im ? im.width + '×' + im.height : 'sin imagen');
    let sha = '', bytes = 0;
    try {
      const buf = await (await fetch(PT.LOGO, { cache: 'no-store' })).arrayBuffer(); bytes = buf.byteLength;
      if (crypto.subtle) sha = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf))).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { sha = 'error: ' + e.message; }
    check('Logo: el archivo oficial 00 original, byte a byte (SHA-256), y dibujado en la página', R.info.logo && sha === PT.LOGO_SHA256, `${Math.round(bytes / 1024)} KB · ${sha.slice(0, 12)}…`);
    const d = R.datos, vs = d.vinetas;
    check('Seis viñetas (2 × 3) con sus datos: evento, escena, título, diálogo, narración, efecto', vs.length === 6 && vs.filter(v => !v.falta).every(v => v.eventId && G.eventos.had(v.eventId) && v.sceneTitle && v.captionText && 'dialogueText' in v && 'effectId' in v && 'sceneImage' in v),
      vs.map(v => v.falta ? '·' : v.id + ':' + v.sceneTitle).join(' | '));
    check('Las escenas que faltan (si hay menos de 6) muestran un marcador, no algo inventado', vs.every((v, i) => (i < R.panels.length) === !v.falta), R.panels.length + ' reales');
    const efOk = vs.filter(v => !v.falta).every(v => { const def = VINETAS.find(q => q.id === v.id) || {}; return (val(def.efecto) || null) === v.effectId; });
    check('Decoraciones solo si el evento las justifica (¡FUUUSH!, ???, bandera, récord)', efOk && R.info.vinetas.every((iv, i) => vs[i].falta ? !iv.efecto : iv.efecto === vs[i].effectId), vs.map(v => v.effectId || '-').join(','));
    const con3D = !!window.AVCharacter && !G.actores.failed3D;
    if (con3D) check('Círculos y personaje central: poses reales del modelo (no la silueta gris)', R.info.vinetas.every(v => v.poseReal) && R.info.centro.real);
    {
      const falsa = document.createElement('canvas'); falsa.width = 64; falsa.height = 40;
      const fx = falsa.getContext('2d'); fx.fillStyle = '#123a6b'; fx.fillRect(0, 0, 64, 40);
      const base = vs[0] && !vs[0].falta ? vs[0] : vs.find(v => !v.falta);
      const d2 = Object.assign({}, d, { vinetas: vs.map(v => v === base ? Object.assign({}, v, { sceneImage: falsa, falta: false }) : v) });
      const cv2 = document.createElement('canvas');
      const R2 = await PT.componer(cv2, d2);
      const i0 = vs.indexOf(base), iv = R2.vinetas[i0];
      const dentro = !!(iv && iv.poseFoto && iv.poseFoto.dentro);
      // Se miran los píxeles opacos de la pose (no un punto fijo de su caja: en vuelo, «crucero», el centro de abajo
      // queda vacío) llevados a la página como los coloca contener(..., abajo): tienen que verse sobre la foto falsa.
      let verde = 0, total = 0;
      if (dentro) {
        const P = await PT.pose(base.look || d.look, base.pose || 'celebrar', 384), pb = P.bbox, pf = iv.poseFoto;
        const sc = Math.min(pf.w / pb.w, pf.h / pb.h), dx = pf.x + (pf.w - pb.w * sc) / 2, dy = pf.y + pf.h - pb.h * sc;
        const al = P.canvas.getContext('2d').getImageData(pb.x, pb.y, pb.w, pb.h).data, pag = cv2.getContext('2d');
        const pix = pag.getImageData(0, 0, cv2.width, cv2.height).data, paso = Math.max(2, Math.round(Math.sqrt(pb.w * pb.h / 400)));
        for (let y = 0; y < pb.h; y += paso) for (let x = 0; x < pb.w; x += paso) {
          if (al[(y * pb.w + x) * 4 + 3] < 230) continue;
          const X = Math.round(dx + (x + 0.5) * sc), Y = Math.round(dy + (y + 0.5) * sc), i = (Y * cv2.width + X) * 4;
          total++;
          if (Math.abs(pix[i] - 0x12) + Math.abs(pix[i + 1] - 0x3a) + Math.abs(pix[i + 2] - 0x6b) > 48) verde++;
        }
      }
      check('La foto de la escena lleva a Vittata dentro del panel, sin tapar el texto', dentro && total >= 20 && verde >= total * 0.8, dentro ? `${verde}/${total} px de la pose a la vista` : 'sin pose');
    }
    check('Los 4 botones de la página son zonas de acción dentro de la página', R.info.botones.length === 4 && R.info.botones.every(b => b.x >= 0 && b.y >= 0 && b.x + b.w <= W && b.y + b.h <= H) && accionBoton('escenas') && accionBoton('editar'),
      R.info.botones.map(b => b.id).join(','));
    // Dos cotorras distintas (especie/piel, traje y corona): los círculos y el personaje central cambian
    const muestra = (cv, b) => { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d'); x.drawImage(cv, b.x, b.y, b.w, b.h, 0, 0, 24, 24); return x.getImageData(0, 0, 24, 24).data; };
    const dif = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; };
    const vin0 = JSON.parse(JSON.stringify(vin())), perfil0 = S.profile;
    const lookA = G.creador.profileLook({ preset: 'vittata', outfit: 'naranja', accessory: 'gorra' });
    const lookB = (() => { try { return window.AVCharacter.normalizeLook({ species: 'imperialis', accessories: { neck: { id: 'panuelo', color: '#7a4fb3', style: 'pr' }, head: { id: 'casco' } } }); } catch (e) { return G.creador.profileLook({ preset: 'agilis', outfit: 'morado', accessory: 'gafas' }); } })();
    const cvP = document.createElement('canvas'), zonas = [];
    for (const lk of [lookA, lookB]) {
      S.profile = Object.assign({}, perfil0, { look: lk }); for (const k of Object.keys(vin())) vin()[k].look = lk;
      const r = await renderComic(cvP);
      const c0 = r.cameos[0], ct = r.info.centro;
      zonas.push({ c: c0 ? muestra(cvP, { x: c0.x, y: c0.y, w: c0.s, h: c0.s }) : null, t: muestra(cvP, { x: 372 * 1.5, y: 1168 * 1.5, w: 252 * 1.5, h: 226 * 1.5 }), real: ct.real });
    }
    S.profile = perfil0; for (const [k, v] of Object.entries(vin0)) vin()[k] = v;
    const dc = zonas[0].c && zonas[1].c ? dif(zonas[0].c, zonas[1].c) : 0, dt = dif(zonas[0].t, zonas[1].t);
    check('Dos cotorras distintas: cambian los círculos y el personaje central', dc > 4 && dt > 4, `círculo Δ${dc.toFixed(1)} · centro Δ${dt.toFixed(1)}`);
    // Inglés: los textos dinámicos salen en EN (títulos de escena del diccionario)
    if (G.idioma && G.idioma.poner && G.idioma.actual) {
      const antes = G.idioma.actual();
      try { await G.idioma.poner('en'); const r = await datosPagina(); check('En inglés, los títulos de escena y las lecciones salen en EN', r.datos.vinetas.filter(v => !v.falta).every(v => !/[áéíóúñ¡¿]/i.test(v.sceneTitle)) && !/[ñ¿]/.test(r.datos.aprendi), r.datos.vinetas.map(v => v.sceneTitle || '·').join(' | ')); }
      finally { await G.idioma.poner(antes); }
    }
    // Pegatinas de pesca, Construir y Patrulla: se dibujan en el lienzo (sin imagen que subir) y salen si la partida las tiene.
    {
      const base = vs.find(v => !v.falta) || vs[0];
      const tipos = ['pesca', 'construir', 'patrulla'];
      const colores = { pesca: [0x14, 0x78, 0xd4], construir: [0xd0, 0x78, 0x20], patrulla: [0x1c, 0x8c, 0x46] };
      const vins = tipos.map(tipo => Object.assign({}, base, { id: 'peg-' + tipo, pegatina: tipo, effectId: null, falta: false, sceneImage: null }));
      while (vins.length < 6) vins.push({ falta: true, pose: 'celebrar', look: base && base.look });
      const cv = document.createElement('canvas');
      const R3 = await PT.componer(cv, Object.assign({}, d, { botones: false, vinetas: vins }));
      const pix = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      const okC = tipos.every(tipo => {
        const iv = R3.vinetas.find(v => v.pegatina && v.pegatina.tipo === tipo);
        if (!iv) return false;
        const X = Math.round(iv.pegatina.muestra.x), Y = Math.round(iv.pegatina.muestra.y);
        if (X < 0 || Y < 0 || X >= cv.width || Y >= cv.height) return false;
        const i = (Y * cv.width + X) * 4, c = colores[tipo];
        return Math.abs(pix[i] - c[0]) + Math.abs(pix[i + 1] - c[1]) + Math.abs(pix[i + 2] - c[2]) < 36;
      });
      check('Pegatinas de pesca, Construir y Patrulla dibujadas en la viñeta (local, sin subir)', okC, tipos.map(tipo => { const iv = R3.vinetas.find(v => v.pegatina && v.pegatina.tipo === tipo); return tipo + (iv ? ' sí' : ' no'); }).join(', '));
      const cons0 = S.construir;
      const claveInv = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.invasoras';
      let inv0; try { inv0 = localStorage.getItem(claveInv); } catch (e) { inv0 = undefined; }
      try {
        S.construir = { v: 1, piezas: [{ t: 'nido', x: 1, z: 1, r: 0 }] };
        localStorage.setItem(claveInv, JSON.stringify({ v: 1, vistos: ['iguana'], completa: false }));
        const r = await datosPagina({ botones: false });
        const pegs = r.datos.vinetas.map(v => v.pegatina).filter(Boolean);
        check('Si hay piezas construidas y un avistamiento, el cómic pone esas pegatinas', pegs.includes('construir') && pegs.includes('patrulla') && new Set(pegs).size === pegs.length, pegs.join(',') || 'ninguna');
      } finally {
        S.construir = cons0;
        try { if (inv0 == null) localStorage.removeItem(claveInv); else localStorage.setItem(claveInv, inv0); } catch (e) { /* sin almacén */ }
      }
    }
  }
  // AV.comicTest (boot.js es del coordinador: se expone aquí si boot no lo hizo)
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.comicTest) AV.comicTest = o => test(o); }, 0);

  return { titulos: TITULOS, PAGINA: PAG, capture, comicPanels, orderedPanels, enPagina, datosPagina, verEscena, accionBoton, comicLayout, renderComic, buildPdf, syncComicForm, moveComicPanel, openComic, refreshComic, exportComic, pngSinRegistro,
    revisarEventos, verificarPNG, estadisticas, entregar, test,
    get lastBlob() { return ultimo.pdf; }, get lastPng() { return ultimo.png; } };
});
