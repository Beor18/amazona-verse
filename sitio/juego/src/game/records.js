/* Juego · «Mis récords» y «Compartir» (cómic y récord de la carrera)
   Carga perezosa: boot.js lo pide al tocar «Mis récords» (pausa o portada) o «Compartir» (cómic), al correr AV.recordsTest y
   junto con el Modo Retos (para anotar cada resultado a nombre de la cotorra que jugó). window.AVRecords(G) devuelve la API:
   abrir({ desde: 'pausa'|'portada' }), cerrar(), compartirComic(), compartirRecord(), puerta(), test().

   TODO ES LOCAL, EN ESTE DISPOSITIVO. Nada de servidores, cuentas ni tablas en línea; solo el nombre inventado de la cotorra.
   La partida (`amazonaverse.save`) y el cómic no se tocan: el panel LEE y no escribe nada en G.S. Lo único que se guarda es el
   libro de la casa, en su propia clave `<almacen>.records` (cap1: amazonaverse.records):
     { v: 1, adoptado: bool, vistas: [id de especie], jugadores: { "<nombre de la cotorra>": { carrera: { mejor (ms), puesto,
       oros, jugadas }, tormenta: { mejor (puntos), jugadas }, rio: { mejor (ms), medalla, oros, jugadas } } } }
   Nada se borra desde aquí (no hay botón de borrar). «Nuevo estudiante» (equipo compartido) lo borra junto con los récords de
   Retos (boot.js); «Comenzar de cero» no, porque es lo que permite que la casa guarde a varias cotorras.

   QUÉ MUESTRA (todo de lo que ya existe, sin cambiar sus formatos)
   - Modo Retos: `<almacen>.retos` (src/game/retos.js): mejor tiempo, mejor puesto (la medalla sale del puesto: 1.º oro, 2.º plata,
     3.º bronce), mejor puntuación de la tormenta (oro desde 1500, plata desde 800), veces jugadas.
   - Historia: G.S.complete/step y el tiempo de juego hasta el evento ChapterCompleted (G.S.events[].t, en segundos de juego).
   - Diario: G.S.field contra pack.diario.entradas. Criadero: `<almacen>.criadero` (cápsulas: huevos, crías y crías libres).
   - Especies vistas: las que salen en el libro (`vistas`): la del plumaje del jugador, las rivales de cada carrera y las de las
     crías del criadero que tengan `especie` (content/comun/huevos.js). El nombre sale de content/comun/especies.js.
   - Récords de la casa: el mejor de cada nombre de cotorra. El gancho 'retosResultado' (retos.js) anota cada partida a nombre de
     la cotorra que jugaba; los récords que ya existían antes se adoptan una sola vez para la cotorra actual.

   COMPARTIR (sin subir nada a ningún servidor)
   - Puerta para adultos: «Pide ayuda a un adulto», una suma de dos cifras al azar con 3 opciones. Tres fallos cierran la puerta.
   - El PNG se prepara mientras el adulto resuelve la suma, así navigator.share se llama dentro del gesto del toque.
   - En el móvil (puntero táctil) y con navigator.canShare({ files }): menú de compartir del sistema con el PNG. En la computadora, o
     sin soporte: se descarga el PNG (en el visor de Claude, con su capacidad 'downloads').
   - Cómic: G.comic.pngSinRegistro() (el mismo PNG de 1080×1520 del botón Exportar). Récord: tarjeta de 1080×1350 con la medalla
     y el tiempo de la carrera (y la tormenta si hay), dibujada aquí; lleva el nombre de la cotorra solo si salió de la lista del creador.
   Textos en ES y EN según G.aula.aj.idioma. Estilos: se inyectan desde aquí (no se toca ui.css) con los tokens de tokens.css.
   Pruebas: AV.recordsTest() (test() al final). */
(function () {
  'use strict';
  window.AVRecords = function (G) {
    if (G.recordsApi) return G.recordsApi;
    const S = G.S, $ = G.util.$;
    const ALM = (G.pack.meta && G.pack.meta.almacen) || G.pack.id;
    // Claves del dispositivo (las pruebas las cambian un momento por claves `.prueba`)
    const CLAVE = { retos: ALM + '.retos', criadero: ALM + '.' + ((window.AV_HUEVOS && window.AV_HUEVOS.sufijo) || 'criadero'), casa: ALM + '.records' };
    const MAX_CASA = 24; // cotorras distintas en el libro
    const PARTICIPANTES_MAX = 9;
    const esObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
    const num = v => (typeof v === 'number' && isFinite(v) && v > 0 ? v : null);
    const ent = (v, max) => (Number.isInteger(v) && v > 0 ? Math.min(v, max || 1e6) : 0);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const idioma = () => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 'en' : 'es');
    const L = (es, en) => (idioma() === 'en' ? en : es);
    // m:ss.d con aritmética entera (igual que retos.js: el tiempo y el récord de la misma carrera se ven iguales)
    const reloj = t => { const d = Math.max(0, Math.round(t * 10)); return Math.floor(d / 600) + ':' + String(Math.floor(d / 10) % 60).padStart(2, '0') + '.' + (d % 10); };
    const ordinal = n => (idioma() === 'en' ? n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10 < 4 ? n % 10 : 0]) : n + (n === 1 || n === 3 ? '.er' : '.º'));
    const duracion = s => { s = Math.max(0, Math.round(s)); if (s < 60) return s + ' s'; const m = Math.round(s / 60); if (m < 60) return m + ' min'; return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); };

    // =================================================================================================================
    // Textos (ES / EN)
    // =================================================================================================================
    const TX = {
      titulo: ['Mis récords', 'My records'], cerrar: ['Cerrar', 'Close'],
      local: ['Todo se guarda solo en este dispositivo. No se envía nada a ningún servidor.', 'Everything is saved only on this device. Nothing is sent to any server.'],
      retos: ['Modo Retos', 'Challenge mode'], retosNota: ['Lo mejor de este dispositivo.', 'The best on this device.'],
      rio: ['Contrarreloj del río', 'River time trial'], carrera: ['Carrera en El Yunque', 'El Yunque race'], tormenta: ['¡Escapa de la tormenta!', 'Escape the storm!'],
      mejorTiempo: ['Mejor tiempo', 'Best time'], mejorPuntos: ['Mejor puntuación', 'Best score'], mejorPuesto: ['Mejor puesto', 'Best place'], ganadas: ['Carreras ganadas', 'Races won'],
      jugadas: ['Veces jugado', 'Times played'], puntos: ['puntos', 'points'], aguantado: ['Más tiempo aguantado', 'Longest time'],
      sinRecord: ['Aún sin récord. ¡Prueba este reto!', 'No record yet. Try this challenge!'],
      oro: ['Oro', 'Gold'], plata: ['Plata', 'Silver'], bronce: ['Bronce', 'Bronze'], meta: ['Llegaste a la meta', 'You finished'],
      historia: ['Mi historia', 'My story'], terminado: ['Terminado', 'Finished'], enCamino: ['En camino', 'In progress'],
      tiempoFin: ['Tiempo en terminarlo', 'Time to finish it'], tiempoJuego: ['Tiempo de juego hasta ahora', 'Play time so far'],
      paso: ['Paso', 'Step'], de: ['de', 'of'],
      diario: ['Diario de Campo', 'Field Journal'], hallazgos: ['hallazgos', 'finds'],
      especies: ['Especies vistas', 'Species seen'], sinEspecies: ['Aún ninguna.', 'None yet.'],
      criadero: ['Criadero', 'Hatchery'], huevos: ['Huevos', 'Eggs'], crias: ['Crías', 'Chicks'], libres: ['En libertad', 'Set free'],
      sinCriadero: ['Aún no hay huevos. ¡Abre el criadero!', 'No eggs yet. Open the hatchery!'],
      casa: ['Récords de la casa', 'House records'], tu: ['tú', 'you'], casaNota: ['Cuando jueguen varias cotorras en este dispositivo, aquí verás el mejor récord de cada una.', 'When several parrots play on this device, you will see each one\'s best record here.'],
      carreraCorta: ['Carrera', 'Race'], tormentaCorta: ['Tormenta', 'Storm'],
      rescate: ['¡Salva al pichón!', 'Save the Parrot'], // src/game/rescate.js
      banquete: ['¡Banquete!', 'Feast!'], frutos: ['Frutos en una partida', 'Fruit in one round'],
      flight: ['Amazona Flight', 'Amazona Flight'], obstaculos: ['Obstáculos superados', 'Obstacles passed'], // src/game/flight.js (C14, oculto hasta la fase 3)
      tren: ['El tren de Vittata', "Vittata's Train"], // src/game/tren.js (C16, publicado)
      rio_rush: ['River Rush', 'River Rush'], contrarreloj: ['Contrarreloj hasta el mar', 'Time trial to the sea'], // src/game/river_rush.js (AC2, publicado)
      maze: ['Amazona Maze', 'Amazona Maze'], // src/game/maze.js (AB1, publicado en BI2)
      compartirRecord: ['Compartir mi récord', 'Share my record'], compartir: ['Compartir', 'Share'],
      rankTitulo: ['Publicar en el ranking', 'Post to the leaderboard'], rankTexto: ['Elige tu apodo de animal. No se guarda nada personal: solo el apodo y tu marca.', 'Pick your animal nickname. Nothing personal is saved: just the nickname and your score.'],
      rankAnimal: ['Animal', 'Animal'], rankAdj: ['Cualidad', 'Quality'], rankNum: ['Número', 'Number'], rankAzar: ['Otro al azar', 'Another at random'], rankPub: ['Publicar', 'Post'],
      rankEnviando: ['Enviando…', 'Sending…'], rankPuesto: ['¡Quedaste en el puesto {}!', 'You are number {}!'], rankListo: ['¡Marca publicada!', 'Score posted!'], rankVer: ['Ver el top', 'See the top'],
      rankMal: ['No se pudo publicar ahora. Tu marca sigue guardada; prueba más tarde.', 'Could not post right now. Your score is still saved; try again later.'],
      rankSinRed: ['Parece que no hay conexión. Tu marca sigue guardada; prueba más tarde.', 'There seems to be no connection. Your score is still saved; try again later.'],
      rankInverosimil: ['Esa marca no se pudo validar. ¡Prueba otra partida!', 'That score could not be checked. Try another round!'], rankMucho: ['Has publicado muchas veces. Vuelve un poco más tarde.', 'You have posted a lot. Come back a little later.'], cerrar: ['Cerrar', 'Close'],
      sellos: ['Mis sellos', 'My stickers'], sellosNota: ['uno por cada medalla que consigas', 'one for every medal you earn'], sinSello: ['aún sin conseguir', 'not earned yet'],
      sinVuelo: ['Pasa un obstáculo en Amazona Flight para compartir tu récord.', 'Pass an obstacle in Amazona Flight to share your record.'],
      sinCarrera: ['Termina una carrera para compartir tu récord.', 'Finish a race to share your record.'],
      puertaTitulo: ['Pide ayuda a un adulto', 'Ask an adult for help'], puertaTexto: ['Para compartir hace falta un adulto. Resuelve esta suma:', 'Sharing needs a grown-up. Solve this sum:'],
      puertaMal: ['Esa no es. Prueba con esta otra suma.', 'Not that one. Try this new sum.'],
      puertaFin: ['Pide a un adulto que te ayude e inténtalo otra vez.', 'Ask an adult to help you and try again.'],
      ahoraNo: ['Ahora no', 'Not now'], opciones: ['Respuestas', 'Answers'],
      preparando: ['Preparando tu imagen…', 'Getting your image ready…'],
      compartido: ['Listo: ya la compartiste.', 'Done: you shared it.'], descargado: ['Listo: tu imagen se descargó.', 'Done: your image was downloaded.'],
      errImagen: ['Este navegador no pudo crear la imagen.', 'This browser could not create the image.'],
      tituloComic: ['Mi cómic de Amazona Verse', 'My Amazona Verse comic'], tituloRecord: ['Mi récord en Amazona Verse', 'My record in Amazona Verse'],
      lema: ['Vuela, explora y salva tu isla con Vittata', 'Fly, explore and save your island with Vittata'],
      miMejor: ['MI MEJOR TIEMPO', 'MY BEST TIME'], medallaDe: ['Medalla de', 'Medal:'],
    };
    const tx = k => TX[k][idioma() === 'en' ? 1 : 0];

    // =================================================================================================================
    // Almacén (local; si el navegador lo bloquea, el libro vive en memoria durante la sesión)
    // =================================================================================================================
    const mem = {};
    function leerRaw(k) { try { const v = localStorage.getItem(k); if (v != null) return v; } catch (e) { /* sin almacén */ } return mem[k] == null ? null : mem[k]; }
    function escribirRaw(k, v) { try { localStorage.setItem(k, v); delete mem[k]; return true; } catch (e) { mem[k] = v; return false; } }
    function leerJSON(k) { try { const d = JSON.parse(leerRaw(k) || 'null'); return esObj(d) ? d : null; } catch (e) { return null; } }
    const limpiarNombre = n => { const f = G.guardado && G.guardado.limpiarTexto; const s = f ? f(n, 24) : String(n == null ? '' : n).replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 24); return s || null; };

    // =================================================================================================================
    // Lectura (sin escribir nada en la partida)
    // =================================================================================================================
    let simulada = null; // pruebas: { S } con una partida de ejemplo en lugar de G.S
    const fuenteS = () => (simulada && simulada.S) || S;
    const nombreDe = s => (s && s.profile && s.profile.created ? limpiarNombre(s.profile.name) : null);
    const especieDe = s => { const sp = s && s.profile && s.profile.look && s.profile.look.species; return typeof sp === 'string' && /^[a-z]{3,24}$/.test(sp) ? sp : null; };

    const MEDALLAS_RIO = ['oro', 'plata', 'bronce'];
    const rescateLimpio = z => ({ mejor: num(z.mejor), medalla: MEDALLAS_RIO.includes(z.medalla) ? z.medalla : null, oros: ent(z.oros), jugadas: ent(z.jugadas) }); // src/game/rescate.js
    function retosDe(d) {
      const ok = esObj(d) && d.v === 1, c = ok && esObj(d.carrera) ? d.carrera : {}, q = ok && esObj(d.tormenta) ? d.tormenta : {}, w = ok && esObj(d.rio) ? d.rio : {}, b = ok && esObj(d.banquete) ? d.banquete : {};
      const f = ok && esObj(d.flight) ? d.flight : null; // src/game/flight.js: solo si se jugó
      const tn = ok && esObj(d.tren) ? d.tren : null; // src/game/tren.js (C16): solo si se jugó
      const rr = ok && esObj(d.rio_rush) ? d.rio_rush : null; // src/game/river_rush.js (AC1): solo si se jugó
      const mz = ok && esObj(d.maze) ? d.maze : null; // src/game/maze.js: solo si se jugó
      return {
        flight: f ? { mejor: num(f.mejor), jugadas: ent(f.jugadas) } : null,
        tren: tn ? { mejor: num(tn.mejor), jugadas: ent(tn.jugadas) } : null,
        rio_rush: rr ? { mejor: num(rr.mejor), jugadas: ent(rr.jugadas), reloj: num(rr.reloj), medallaReloj: ['bronce', 'plata', 'oro'].includes(rr.medallaReloj) ? rr.medallaReloj : null, jugadasReloj: ent(rr.jugadasReloj) } : null, // AC2: + contrarreloj (ms y medalla)
        maze: mz ? { mejor: num(mz.mejor), jugadas: ent(mz.jugadas) } : null,
        banquete: { mejor: num(b.mejor), frutos: ent(b.frutos), jugadas: ent(b.jugadas) }, // src/game/banquete.js
        carrera: { mejor: num(c.mejor), puesto: Number.isInteger(c.puesto) && c.puesto >= 1 && c.puesto <= PARTICIPANTES_MAX ? c.puesto : null, oros: ent(c.oros), jugadas: ent(c.jugadas) },
        tormenta: { mejor: num(q.mejor), tiempo: num(q.tiempo), jugadas: ent(q.jugadas) },
        rio: { mejor: num(w.mejor), medalla: MEDALLAS_RIO.includes(w.medalla) ? w.medalla : null, oros: ent(w.oros), jugadas: ent(w.jugadas) },
      };
    }
    const medallaCarrera = p => (!p ? null : p === 1 ? 'oro' : p === 2 ? 'plata' : p === 3 ? 'bronce' : 'meta');
    const medallaTormenta = pts => (!pts ? null : pts >= 1500 ? 'oro' : pts >= 800 ? 'plata' : null);

    function historiaDe(s) {
      const ev = Array.isArray(s.events) ? s.events.find(e => e && e.key === 'ChapterCompleted') : null;
      const meta = G.pack.meta || {};
      return { capitulo: meta.capitulo || 1, titulo: meta.titulo || '', terminada: !!s.complete, paso: ent(s.step), pasos: (G.misiones && G.misiones.DONE) || 0,
        tiempo: s.complete && ev ? num(ev.t) : null, jugado: num(s.clock) };
    }
    function diarioDe(s) {
      const D = G.pack.diario || {}, ent_ = D.entradas || [], campo = new Set(Array.isArray(s.field) ? s.field : []);
      const cats = D.categorias || {};
      return { n: ent_.filter(e => campo.has(e.id)).length, total: ent_.length,
        cats: Object.keys(cats).map(c => ({ id: c, nombre: cats[c].nombre || c, n: ent_.filter(e => e.cat === c && campo.has(e.id)).length, total: ent_.filter(e => e.cat === c).length })) };
    }
    function huevoDef(id) { const H = window.AV_HUEVOS; return H && (H.huevos || []).find(h => h.id === id) || null; }
    function criaderoDe(d) {
      const caps = esObj(d) && esObj(d.capsulas) ? d.capsulas : {}, H = window.AV_HUEVOS;
      // Rareza de la cría (src/game/rareza.js; crías de partidas viejas = común): colección por rareza en el panel
      const RZ = G.rareza, RC = H && H.rarezaCria, rzDe = c => (RZ ? RZ.de(c) : 'comun');
      const r = { huevos: 0, crias: 0, libres: 0, lista: [], total: 0, rarezas: Object.fromEntries(((RC && RC.niveles) || [{ id: 'comun' }]).map(n => [n.id, 0])) };
      for (const [id, c] of Object.entries(caps)) {
        if (!esObj(c) || !huevoDef(id)) continue;
        r.total++;
        if (c.estado === 'liberada') r.libres++;
        else if (c.estado === 'nacida') r.crias++;
        else r.huevos++;
        if (c.estado === 'nacida' || c.estado === 'liberada') {
          let nivel = 0, etapa = null;
          try { nivel = G.criadero.nivelDe(c.xp || 0); const e = G.criadero.etapaDe(c); etapa = (H.etapas.find(x => x.id === e) || {}).nombre || null; } catch (e) { /* sin criadero */ }
          const rareza = rzDe(c), rzD = RC && (RC.niveles || []).find(n => n.id === rareza);
          if (rareza in r.rarezas) r.rarezas[rareza]++;
          r.lista.push({ id, cria: huevoDef(id).cria, libre: c.estado === 'liberada', nivel, etapa, rareza, rarezaNombre: rzD ? rzD.nombre : null, rarezaColor: rzD ? rzD.color : null });
        }
      }
      return r;
    }
    const catalogo = () => { const E = window.AV_ESPECIES; return { vivas: (E && E.especies) || [], todas: Object.fromEntries(((E && E.especies) || []).concat((E && E.extintas) || []).map(e => [e.id, e])) }; };
    function nombreEspecie(id, cat) {
      const e = cat.todas[id]; if (!e) return id;
      const c = e.comun || {};
      return c[idioma()] || c.es || c.en || e.cientifico || id;
    }
    function casaDe(d) {
      const out = { adoptado: false, vistas: [], jugadores: {} };
      if (!esObj(d) || d.v !== 1) return out;
      out.adoptado = d.adoptado === true;
      if (Array.isArray(d.vistas)) out.vistas = [...new Set(d.vistas.filter(x => typeof x === 'string' && /^[a-z]{3,24}$/.test(x)))].slice(0, 80);
      for (const [n, e] of Object.entries(esObj(d.jugadores) ? d.jugadores : {})) {
        const nombre = limpiarNombre(n); if (!nombre || !esObj(e) || out.jugadores[nombre] || Object.keys(out.jugadores).length >= MAX_CASA) continue;
        const r = retosDe({ v: 1, carrera: e.carrera, tormenta: e.tormenta, rio: e.rio, banquete: e.banquete });
        out.jugadores[nombre] = { banquete: r.banquete, carrera: { mejor: r.carrera.mejor, puesto: r.carrera.puesto, oros: r.carrera.oros, jugadas: r.carrera.jugadas }, tormenta: { mejor: r.tormenta.mejor, jugadas: r.tormenta.jugadas }, rio: { mejor: r.rio.mejor, medalla: r.rio.medalla, oros: r.rio.oros, jugadas: r.rio.jugadas } };
        if (esObj(e.rescate)) out.jugadores[nombre].rescate = rescateLimpio(e.rescate); // src/game/rescate.js
        if (esObj(e.flight)) out.jugadores[nombre].flight = { mejor: num(e.flight.mejor), jugadas: ent(e.flight.jugadas) }; // src/game/flight.js
        if (esObj(e.tren)) out.jugadores[nombre].tren = { mejor: num(e.tren.mejor), jugadas: ent(e.tren.jugadas) }; // src/game/tren.js (C16)
        if (esObj(e.rio_rush)) out.jugadores[nombre].rio_rush = retosDe({ v: 1, rio_rush: e.rio_rush }).rio_rush; // src/game/river_rush.js (AC2)
        if (esObj(e.maze)) out.jugadores[nombre].maze = { mejor: num(e.maze.mejor), jugadas: ent(e.maze.jugadas) }; // src/game/maze.js
      }
      return out;
    }
    const leerCasa = () => casaDe(leerJSON(CLAVE.casa));
    const guardarCasa = c => escribirRaw(CLAVE.casa, JSON.stringify({ v: 1, adoptado: !!c.adoptado, vistas: c.vistas, jugadores: c.jugadores }));
    // Orden de la casa: mejor tiempo de carrera, luego mejor puntuación de tormenta, luego nombre
    const ordenCasa = (a, b) => ((a[1].carrera.mejor || 1e12) - (b[1].carrera.mejor || 1e12)) || ((b[1].tormenta.mejor || 0) - (a[1].tormenta.mejor || 0)) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

    // Todo lo que muestra el panel, leído de los almacenes y de G.S (o de la simulación de las pruebas)
    function leer() {
      const s = fuenteS(), cat = catalogo(), casa = leerCasa();
      const propia = especieDe(s), cr = criaderoDe(leerJSON(CLAVE.criadero));
      const vistas = new Set(casa.vistas); if (propia) vistas.add(propia);
      for (const id of especiesDeCrias(leerJSON(CLAVE.criadero))) vistas.add(id);
      const ids = cat.vivas.map(e => e.id).concat(Object.keys(cat.todas).filter(id => !cat.vivas.some(e => e.id === id)));
      return {
        nombre: nombreDe(s), retos: retosDe(leerJSON(CLAVE.retos)), historia: historiaDe(s), diario: diarioDe(s), criadero: cr,
        rescate: (casa.jugadores[nombreDe(s)] || {}).rescate || null, // src/game/rescate.js
        especies: { total: cat.vivas.length, vistas: ids.filter(id => vistas.has(id)).map(id => ({ id, nombre: nombreEspecie(id, cat) })) },
        casa: Object.entries(casa.jugadores).sort(ordenCasa).map(([nombre, e]) => ({ nombre, carrera: e.carrera, tormenta: e.tormenta })),
      };
    }
    function especiesDeCrias(d) {
      const caps = esObj(d) && esObj(d.capsulas) ? d.capsulas : {}, out = [];
      for (const [id, c] of Object.entries(caps)) { const h = huevoDef(id); if (esObj(c) && h && h.especie && (c.estado === 'nacida' || c.estado === 'liberada')) out.push(h.especie); }
      return out;
    }

    // =================================================================================================================
    // Escritura del libro de la casa (clave propia; nunca la partida)
    // =================================================================================================================
    const entradaDe = (libro, nombre) => libro.jugadores[nombre] || (Object.keys(libro.jugadores).length < MAX_CASA
      ? (libro.jugadores[nombre] = { carrera: { mejor: null, puesto: null, oros: 0, jugadas: 0 }, tormenta: { mejor: null, jugadas: 0 }, rio: { mejor: null, medalla: null, oros: 0, jugadas: 0 }, banquete: { mejor: null, frutos: 0, jugadas: 0 } }) : null);
    const banqueteDe = e => e.banquete || (e.banquete = { mejor: null, frutos: 0, jugadas: 0 }); // entradas de antes del banquete
    // Une un récord con otro quedándose con lo mejor de cada cosa (los contadores, con el mayor)
    function unir(e, r) {
      const c = e.carrera, q = e.tormenta;
      if (r.carrera.mejor && (!c.mejor || r.carrera.mejor < c.mejor)) c.mejor = r.carrera.mejor;
      if (r.carrera.puesto && (!c.puesto || r.carrera.puesto < c.puesto)) c.puesto = r.carrera.puesto;
      c.oros = Math.max(c.oros, r.carrera.oros); c.jugadas = Math.max(c.jugadas, r.carrera.jugadas);
      if (r.tormenta.mejor && (!q.mejor || r.tormenta.mejor > q.mejor)) q.mejor = r.tormenta.mejor;
      q.jugadas = Math.max(q.jugadas, r.tormenta.jugadas);
      const w = e.rio;
      if (r.rio.mejor && (!w.mejor || r.rio.mejor < w.mejor)) w.mejor = r.rio.mejor;
      if (r.rio.medalla && (!w.medalla || MEDALLAS_RIO.indexOf(r.rio.medalla) < MEDALLAS_RIO.indexOf(w.medalla))) w.medalla = r.rio.medalla;
      w.oros = Math.max(w.oros, r.rio.oros); w.jugadas = Math.max(w.jugadas, r.rio.jugadas);
      const b = banqueteDe(e), rb = r.banquete || { mejor: null, frutos: 0, jugadas: 0 };
      if (rb.mejor && (!b.mejor || rb.mejor > b.mejor)) b.mejor = rb.mejor;
      b.frutos = Math.max(b.frutos, rb.frutos); b.jugadas = Math.max(b.jugadas, rb.jugadas);
    }
    function sumarVistas(libro, ids) {
      const cat = catalogo(); let cambio = false;
      for (const id of ids) if (typeof id === 'string' && cat.todas[id] && !libro.vistas.includes(id) && libro.vistas.length < 80) { libro.vistas.push(id); cambio = true; }
      return cambio;
    }
    // Pone al día el libro con lo que ya se sabe de la cotorra actual: su especie, las crías con especie y, una sola vez,
    // los récords de Retos que ya había antes de este panel
    function sincronizar() {
      const s = fuenteS(), libro = leerCasa(), nombre = nombreDe(s);
      let cambio = sumarVistas(libro, [especieDe(s)].concat(especiesDeCrias(leerJSON(CLAVE.criadero))));
      if (!libro.adoptado && nombre) {
        libro.adoptado = true; cambio = true;
        const r = retosDe(leerJSON(CLAVE.retos));
        if (r.carrera.mejor || r.carrera.jugadas || r.tormenta.mejor || r.tormenta.jugadas || r.rio.mejor || r.rio.jugadas || r.banquete.mejor || r.banquete.jugadas) { const e = entradaDe(libro, nombre); if (e) unir(e, r); }
      }
      if (cambio) guardarCasa(libro);
      return libro;
    }
    // Un resultado de Retos (gancho 'retosResultado') a nombre de la cotorra que jugó. sOpc: partida de ejemplo (pruebas)
    function anotar(r, sOpc) {
      if (!esObj(r) || r.prueba === true) return false;
      const nombre = nombreDe(sOpc || fuenteS()); if (!nombre) return false;
      const libro = leerCasa(), e = entradaDe(libro, nombre); if (!e) return false;
      if (r.modo === 'carrera') {
        const c = e.carrera; c.jugadas++;
        const ms = typeof r.ms === 'number' && r.ms >= 1000 && r.ms <= 36e5 ? Math.round(r.ms) : null, p = Number.isInteger(r.puesto) && r.puesto >= 1 && r.puesto <= PARTICIPANTES_MAX ? r.puesto : null;
        if (r.llego === true && ms && p) { if (!c.mejor || ms < c.mejor) c.mejor = ms; c.puesto = Math.min(c.puesto || 99, p); if (p === 1) c.oros++; }
        if (Array.isArray(r.rivales)) sumarVistas(libro, r.rivales);
      } else if (r.modo === 'tormenta') {
        const q = e.tormenta; q.jugadas++;
        const pts = typeof r.puntos === 'number' && r.puntos > 0 && r.puntos <= 1e5 ? Math.round(r.puntos) : null;
        if (pts && (!q.mejor || pts > q.mejor)) q.mejor = pts;
      } else if (r.modo === 'rio') {
        const w = e.rio; w.jugadas++;
        const ms = typeof r.ms === 'number' && r.ms >= 1000 && r.ms <= 36e5 ? Math.round(r.ms) : null;
        if (r.llego === true && ms) {
          if (!w.mejor || ms < w.mejor) w.mejor = ms;
          if (MEDALLAS_RIO.includes(r.medalla)) { if (!w.medalla || MEDALLAS_RIO.indexOf(r.medalla) < MEDALLAS_RIO.indexOf(w.medalla)) w.medalla = r.medalla; if (r.medalla === 'oro') w.oros++; }
        }
      } else if (r.modo === 'banquete') {
        const b = banqueteDe(e); b.jugadas++;
        const pts = typeof r.puntos === 'number' && r.puntos > 0 && r.puntos <= 1e5 ? Math.round(r.puntos) : null, fr = Number.isInteger(r.frutos) && r.frutos > 0 && r.frutos <= 999 ? r.frutos : 0;
        if (pts && (!b.mejor || pts > b.mejor)) b.mejor = pts;
        b.frutos = Math.max(b.frutos, fr);
      } else if (r.modo === 'rescate') { // src/game/rescate.js (como el río: mejor tiempo y mejor medalla)
        const z = e.rescate || (e.rescate = rescateLimpio({})); z.jugadas++;
        const ms = typeof r.ms === 'number' && r.ms >= 1000 && r.ms <= 36e5 ? Math.round(r.ms) : null;
        if (r.llego === true && ms) {
          if (!z.mejor || ms < z.mejor) z.mejor = ms;
          if (MEDALLAS_RIO.includes(r.medalla)) { if (!z.medalla || MEDALLAS_RIO.indexOf(r.medalla) < MEDALLAS_RIO.indexOf(z.medalla)) z.medalla = r.medalla; if (r.medalla === 'oro') z.oros++; }
        }
      } else if (r.modo === 'flight') { // src/game/flight.js (C14): mejor cuenta de obstáculos superados
        const f = e.flight || (e.flight = { mejor: null, jugadas: 0 }); f.jugadas++;
        const pts = Number.isInteger(r.puntos) && r.puntos > 0 && r.puntos <= 1e5 ? r.puntos : null;
        if (pts && (!f.mejor || pts > f.mejor)) f.mejor = pts;
      } else if (r.modo === 'tren') { // src/game/tren.js (C16): mejor puntuación de un turno
        const z = e.tren || (e.tren = { mejor: null, jugadas: 0 }); z.jugadas++;
        const pts = Number.isInteger(r.puntos) && r.puntos > 0 && r.puntos <= 1e5 ? r.puntos : null;
        if (pts && (!z.mejor || pts > z.mejor)) z.mejor = pts;
      } else if (r.modo === 'rio_rush') { // src/game/river_rush.js (AC1): mejor puntuación
        const z = e.rio_rush || (e.rio_rush = { mejor: null, jugadas: 0 });
        if (r.reloj) { // AC2: contrarreloj (y contra tu fantasma): mejor tiempo en ms y la mejor medalla
          z.jugadasReloj = (Number.isInteger(z.jugadasReloj) ? z.jugadasReloj : 0) + 1;
          const ms = Number.isInteger(r.ms) && r.ms > 0 && r.ms < 36e5 ? r.ms : null, ord = ['bronce', 'plata', 'oro'];
          if (ms && (!z.reloj || ms < z.reloj)) z.reloj = ms;
          if (ord.indexOf(r.medalla) > ord.indexOf(z.medallaReloj)) z.medallaReloj = r.medalla;
        } else {
          z.jugadas++;
          const pts = Number.isInteger(r.puntos) && r.puntos > 0 && r.puntos <= 1e5 ? r.puntos : null;
          if (pts && (!z.mejor || pts > z.mejor)) z.mejor = pts;
        }
      } else if (r.modo === 'maze') { // src/game/maze.js (AB1): mejor puntuación del laberinto
        const z = e.maze || (e.maze = { mejor: null, jugadas: 0 }); z.jugadas++;
        const pts = Number.isInteger(r.puntos) && r.puntos > 0 && r.puntos <= 1e5 ? r.puntos : null;
        if (pts && (!z.mejor || pts > z.mejor)) z.mejor = pts;
      } else return false;
      sumarVistas(libro, [especieDe(sOpc || fuenteS())]);
      guardarCasa(libro);
      if (abierto) pintar();
      return true;
    }
    G.on('retosResultado', r => anotar(r));

    // =================================================================================================================
    // Estilos (inyectados desde aquí; usan los tokens de src/ui/tokens.css)
    // =================================================================================================================
    const CSS = `
:root { --i-share: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round' d='M12 15V4M8 8l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6'/%3E%3C/svg%3E"); }
[data-icon="share"] { --icon: var(--i-share); }
#records { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: var(--sp-3) max(var(--sp-3), env(safe-area-inset-right, 0px)) max(var(--sp-3), env(safe-area-inset-bottom, 0px)) max(var(--sp-3), env(safe-area-inset-left, 0px));
  background: var(--c-scrim); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); touch-action: none; }
#records .rec-box { display: flex; flex-direction: column; width: min(780px, 100%); max-height: 100%; padding: 0; overflow: hidden; animation: pop-in var(--dur-3) var(--ease-pop); }
#records .rec-box:focus { outline: none; }
#records .rec-head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-4) var(--sp-5) var(--sp-3); border-bottom: 3px dotted var(--c-paper-edge); }
#records h2 { display: flex; align-items: center; gap: var(--sp-2); margin: 0; font: 700 var(--fs-2xl)/1.1 var(--font-display); color: var(--c-ink); min-width: 0; }
#records h2::before { content: ""; flex: none; width: 30px; height: 30px; background: var(--leaf); -webkit-mask: var(--i-trophy) center / contain no-repeat; mask: var(--i-trophy) center / contain no-repeat; }
#records .rec-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; padding: var(--sp-4) var(--sp-5); }
#records .rec-nota { margin: 0 0 var(--sp-3); font-size: var(--fs-sm); color: var(--c-ink-muted); }
#records .rec-sec { margin: 0 0 var(--sp-5); }
#records .rec-sec > h3 { display: flex; align-items: baseline; flex-wrap: wrap; gap: var(--sp-1) var(--sp-3); margin: 0 0 var(--sp-3); font: 700 var(--fs-lg)/1.2 var(--font-display); color: var(--c-ink); }
#records .rec-sec > h3 small { font: 400 var(--fs-sm)/1.2 var(--font-body); color: var(--c-ink-muted); }
#records .rec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: var(--sp-3); }
#records .rec-grid.rec-dos { grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); }
#records .rec-card { min-width: 0; padding: var(--sp-3) var(--sp-4); background: #fffaf0; border: 2px solid var(--c-paper-edge); border-radius: var(--r-md); overflow-wrap: anywhere; }
#records .rec-card h4 { margin: 0 0 var(--sp-2); font: 700 var(--fs-md)/1.2 var(--font-display); color: var(--c-ink); }
#records .rec-card p { margin: 0; font-size: var(--fs-sm); color: var(--c-ink-muted); }
#records .rec-grande { display: flex; align-items: center; gap: var(--sp-3); margin: 0 0 var(--sp-2); }
#records .rec-num { display: block; font: 700 var(--fs-3xl)/1 var(--font-display); color: var(--c-ink); font-variant-numeric: tabular-nums; }
#records .rec-num small { font: 700 var(--fs-md)/1 var(--font-display); color: var(--c-ink-muted); }
#records .rec-grande small, #records .rec-card dt { font: 400 var(--fs-sm)/1.3 var(--font-body); color: var(--c-ink-muted); }
#records .rec-card dl { display: grid; gap: 2px; margin: 0; }
#records .rec-card dl > div { display: flex; justify-content: space-between; gap: var(--sp-3); }
#records .rec-card dd { margin: 0; font: 700 var(--fs-sm)/1.3 var(--font-display); color: var(--c-ink); text-align: right; font-variant-numeric: tabular-nums; }
#records .rec-m { flex: none; display: grid; place-items: center; width: 48px; height: 48px; border-radius: 50%; font: 700 var(--fs-xl)/1 var(--font-display); color: #4a2a05;
  background: radial-gradient(circle at 35% 30%, #fff8d8, var(--m1) 45%, var(--m2)); box-shadow: 0 0 0 3px #fff, 0 3px 0 3px rgba(0, 0, 0, .18); }
#records .rec-sellos-t { margin: var(--sp-4) 0 var(--sp-2); font: 700 var(--fs-md)/1.2 var(--font-display); color: var(--c-ink); } #records .rec-sellos-t small { font: 500 var(--fs-xs)/1.2 var(--font-body); color: var(--c-ink-muted); }
#records .rec-sellos { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: var(--sp-2); }
#records .rec-sellos li { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm); background: rgba(255, 255, 255, .55); }
#records .rec-sellos .rs-m { display: inline-flex; gap: 6px; } #records .rec-sellos .rec-m { width: 30px; height: 30px; font-size: var(--fs-sm); box-shadow: 0 0 0 2px #fff; } #records .rec-sellos .rec-m.falta { --m1: #e6e0d2; --m2: #cfc7b4; box-shadow: none; opacity: .6; }
#records .rec-m.oro { --m1: #ffd24a; --m2: #c98a10; } #records .rec-m.plata { --m1: #e4ecf2; --m2: #8a9aa8; } #records .rec-m.bronce { --m1: #f0a86a; --m2: #9a5a24; } #records .rec-m.meta { --m1: #bfe7c8; --m2: #3f9a55; }
#records .progress { margin: var(--sp-2) 0; background: rgba(107, 82, 54, .18); }
#records .rec-chips { display: flex; flex-wrap: wrap; gap: var(--sp-1) var(--sp-2); margin: var(--sp-2) 0 0; padding: 0; list-style: none; }
#records .rec-chips li { padding: 3px var(--sp-3); font: 600 var(--fs-xs)/1.3 var(--font-body); color: var(--c-ink); background: #e3f6e6; border: 1px solid #9fd8aa; border-radius: var(--r-pill); }
#records .rec-chips li.libre { background: #fff0cf; border-color: #e0bd78; }
#records .rec-chips li.rz { border-color: var(--rz, #9fd8aa); box-shadow: 0 0 0 1px color-mix(in srgb, var(--rz, #9fd8aa) 50%, transparent), 0 0 8px color-mix(in srgb, var(--rz, #9fd8aa) 45%, transparent); }
#records .rec-coleccion { margin: var(--sp-2) 0 0; font: 600 var(--fs-xs)/1.5 var(--font-body); color: var(--c-ink-muted); }
#records .rec-coleccion span { display: inline-block; padding: 0 var(--sp-2); border-radius: var(--r-pill); border: 1px solid var(--rz, #9fd8aa); color: var(--c-ink); background: color-mix(in srgb, var(--rz, #9fd8aa) 22%, #fff); }
#records .rec-casa { display: grid; gap: var(--sp-2); margin: 0; padding: 0; list-style: none; }
#records .rec-casa li { display: grid; grid-template-columns: minmax(0, 1.2fr) repeat(2, minmax(0, 1fr)); gap: var(--sp-1) var(--sp-3); align-items: center; padding: var(--sp-2) var(--sp-3); background: #fffaf0; border: 2px solid var(--c-paper-edge); border-radius: var(--r-md); font-size: var(--fs-sm); overflow-wrap: anywhere; }
#records .rec-casa li[aria-current] { background: #e3f6e6; border-color: #9fd8aa; }
#records .rec-casa b { font-family: var(--font-display); font-variant-numeric: tabular-nums; }
#records .rec-casa .rec-m { width: 26px; height: 26px; font-size: var(--fs-xs); display: inline-grid; vertical-align: middle; margin-right: 4px; box-shadow: 0 0 0 2px #fff; }
#records .rec-casa em { font-style: normal; font-size: var(--fs-xs); color: var(--c-ink-muted); }
#records .rec-pie { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--sp-2) var(--sp-3); padding: var(--sp-3) var(--sp-5) max(var(--sp-3), env(safe-area-inset-bottom, 0px)); border-top: 3px dotted var(--c-paper-edge); }
#records .rec-estado { flex: 1 1 200px; min-width: 0; margin: 0; font-size: var(--fs-sm); color: var(--c-ink-muted); }
#records .rec-pie .btn[aria-disabled="true"] { filter: grayscale(.6); opacity: .6; }
#rec-puerta { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: var(--sp-3); background: rgba(6, 16, 12, .78); touch-action: none; }
#rec-puerta .rp-box { width: min(420px, 100%); max-height: 100%; overflow: auto; padding: var(--sp-5); text-align: center; animation: pop-in var(--dur-3) var(--ease-pop); }
#rec-rank[hidden] { display: none; }
#rec-rank { position: fixed; inset: 0; z-index: 61; display: grid; place-items: center; padding: var(--sp-3); background: rgba(6, 16, 12, .78); }
#rec-rank .rk-box { width: min(440px, 100%); max-height: 100%; overflow: auto; padding: var(--sp-5); text-align: center; animation: pop-in var(--dur-3) var(--ease-pop); } #rec-rank .rk-box:focus { outline: none; }
#rec-rank h2 { margin: 0 0 var(--sp-2); font: 700 var(--fs-xl)/1.2 var(--font-display); color: var(--c-ink); } #rec-rank p { margin: 0 0 var(--sp-3); color: var(--c-ink-muted); }
#rec-rank .rk-sel { display: grid; grid-template-columns: 1fr 1fr 70px; gap: var(--sp-2); margin-bottom: var(--sp-2); } #rec-rank .rk-sel label { display: grid; gap: 4px; text-align: left; font: 600 var(--fs-xs)/1.2 var(--font-body); color: var(--c-ink-muted); } #rec-rank select { min-height: 44px; font: 600 var(--fs-md)/1 var(--font-body); }
#rec-rank .rk-alias { font: 700 var(--fs-lg)/1.2 var(--font-display); color: var(--c-ink); } #rec-rank .rk-fila { display: flex; flex-wrap: wrap; gap: var(--sp-2); justify-content: center; align-items: center; margin-bottom: var(--sp-3); }
#rec-rank .rk-res { margin-bottom: var(--sp-3); color: var(--c-ink); } #rec-rank .rk-top { list-style: none; margin: var(--sp-2) 0 0; padding: 0; display: grid; gap: 4px; text-align: left; }
#rec-puerta .rp-box:focus { outline: none; }
#rec-puerta h2 { margin: 0 0 var(--sp-2); font: 700 var(--fs-xl)/1.2 var(--font-display); color: var(--c-ink); }
#rec-puerta p { margin: 0 0 var(--sp-3); color: var(--c-ink-muted); }
#rec-puerta .rp-suma { margin: var(--sp-2) 0 var(--sp-4); font: 700 var(--fs-3xl)/1.1 var(--font-display); color: var(--c-ink); font-variant-numeric: tabular-nums; }
#rec-puerta .rp-opciones { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-3); margin: 0 0 var(--sp-3); }
#rec-puerta .rp-opciones .btn { min-height: 64px; padding: 0 var(--sp-2); font-size: var(--fs-2xl); font-variant-numeric: tabular-nums; }
#rec-puerta .rp-err { margin: 0 0 var(--sp-3); font-weight: 700; color: #a3261f; }
#rec-puerta .rp-box.mal { animation: rec-tiembla .35s; }
@keyframes rec-tiembla { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
@media (max-width: 560px) { #records .rec-head { padding: var(--sp-3) var(--sp-4) var(--sp-2); } #records h2 { font-size: var(--fs-xl); } #records .rec-body { padding: var(--sp-3) var(--sp-4); }
  #records .rec-pie { padding-left: var(--sp-4); padding-right: var(--sp-4); } #records .rec-pie .btn { flex: 1 1 140px; } #records .rec-casa li { grid-template-columns: 1fr 1fr; } #records .rec-casa li > :first-child { grid-column: 1 / -1; font-weight: 700; } }
@media (prefers-reduced-motion: reduce) { #records .rec-box, #rec-puerta .rp-box, #rec-puerta .rp-box.mal { animation: none; } }
`;
    if (!document.getElementById('records-css')) { const st = document.createElement('style'); st.id = 'records-css'; st.textContent = CSS; document.head.appendChild(st); }

    // =================================================================================================================
    // Panel «Mis récords»
    // =================================================================================================================
    let root = null, box = null, abierto = false, origen = null, titulo_inert = false, pausado = false;
    const pausar = on => { if (on === pausado) return; pausado = on; if (G.pausa) G.pausa.set('records', on); };
    const medalla = (m, n) => (m ? `<span class="rec-m ${m}" role="img" aria-label="${esc(m === 'meta' ? tx('meta') : tx(m))}">${n == null ? '' : esc(n)}</span>` : '');
    const medallaTxt = m => (m ? (m === 'meta' ? tx('meta') : tx(m)) : '');
    const dato = (k, v) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`;

    function htmlRetos(d) {
      const c = d.retos.carrera, q = d.retos.tormenta, w = d.retos.rio, mc = medallaCarrera(c.puesto), mq = medallaTormenta(q.mejor);
      const rio = w.mejor
        ? `<div class="rec-grande">${medalla(w.medalla, w.medalla ? '★' : null)}<div><b class="rec-num">${reloj(w.mejor / 1000)}</b><small>${esc(tx('mejorTiempo'))}${w.medalla ? ' · ' + esc(tx(w.medalla)) : ''}</small></div></div>
           <dl>${dato(tx('jugadas'), w.jugadas)}</dl>`
        : `<p>${esc(tx('sinRecord'))}</p>${w.jugadas ? `<dl>${dato(tx('jugadas'), w.jugadas)}</dl>` : ''}`;
      const carrera = c.mejor
        ? `<div class="rec-grande">${medalla(mc, c.puesto <= 3 ? c.puesto : '★')}<div><b class="rec-num">${reloj(c.mejor / 1000)}</b><small>${esc(tx('mejorTiempo'))} · ${esc(medallaTxt(mc))}</small></div></div>
           <dl>${dato(tx('mejorPuesto'), esc(ordinal(c.puesto || 1)))}${dato(tx('ganadas'), c.oros)}${dato(tx('jugadas'), c.jugadas)}</dl>`
        : `<p>${esc(tx('sinRecord'))}</p>${c.jugadas ? `<dl>${dato(tx('jugadas'), c.jugadas)}</dl>` : ''}`;
      const tormenta = q.mejor
        ? `<div class="rec-grande">${medalla(mq, '★')}<div><b class="rec-num">${q.mejor} <small>${esc(tx('puntos'))}</small></b><small>${esc(tx('mejorPuntos'))}${mq ? ' · ' + esc(medallaTxt(mq)) : ''}</small></div></div>
           <dl>${q.tiempo ? dato(tx('aguantado'), q.tiempo + ' s') : ''}${dato(tx('jugadas'), q.jugadas)}</dl>`
        : `<p>${esc(tx('sinRecord'))}</p>${q.jugadas ? `<dl>${dato(tx('jugadas'), q.jugadas)}</dl>` : ''}`;
      const b = d.retos.banquete || { mejor: null, frutos: 0, jugadas: 0 }, mb = !b.mejor ? null : b.mejor >= 1200 ? 'oro' : b.mejor >= 600 ? 'plata' : 'bronce';
      const banquete = b.mejor
        ? `<div class="rec-grande">${medalla(mb, '★')}<div><b class="rec-num">${b.mejor} <small>${esc(tx('puntos'))}</small></b><small>${esc(tx('mejorPuntos'))}${mb ? ' · ' + esc(medallaTxt(mb)) : ''}</small></div></div>
           <dl>${b.frutos ? dato(tx('frutos'), b.frutos) : ''}${dato(tx('jugadas'), b.jugadas)}</dl>`
        : `<p>${esc(tx('sinRecord'))}</p>${b.jugadas ? `<dl>${dato(tx('jugadas'), b.jugadas)}</dl>` : ''}`;
      const z = d.rescate; // src/game/rescate.js
      const rescate = z && z.mejor
        ? `<div class="rec-grande">${medalla(z.medalla, z.medalla ? '★' : null)}<div><b class="rec-num">${reloj(z.mejor / 1000)}</b><small>${esc(tx('mejorTiempo'))}${z.medalla ? ' · ' + esc(tx(z.medalla)) : ''}</small></div></div>
           <dl>${dato(tx('jugadas'), z.jugadas)}</dl>`
        : `<p>${esc(tx('sinRecord'))}</p>${z && z.jugadas ? `<dl>${dato(tx('jugadas'), z.jugadas)}</dl>` : ''}`;
      const f = d.retos.flight || { mejor: null, jugadas: 0 }; // src/game/flight.js (publicado: la tarjeta sale siempre)
      const flight = !f ? '' : `<article class="rec-card"><h4>${esc(tx('flight'))}</h4>${f.mejor
        ? `<div class="rec-grande">${medalla(f.mejor >= 60 ? 'oro' : f.mejor >= 25 ? 'plata' : 'bronce', '★')}<div><b class="rec-num">${f.mejor}</b><small>${esc(tx('obstaculos'))}</small></div></div><dl>${dato(tx('jugadas'), f.jugadas)}</dl>`
        : `<p>${esc(tx('sinRecord'))}</p>${f.jugadas ? `<dl>${dato(tx('jugadas'), f.jugadas)}</dl>` : ''}`}</article>`;
      const tn = d.retos.tren || { mejor: null, jugadas: 0 }; // src/game/tren.js (C16). 29-oct: el tren está fuera del menú hasta que Kelvin decida; la tarjeta solo sale si ya se jugó
      const tren = !(tn.mejor || tn.jugadas) ? '' : `<article class="rec-card"><h4>${esc(tx('tren'))}</h4>${tn.mejor ? `<div class="rec-grande">${medalla(tn.mejor >= 650 ? 'oro' : tn.mejor >= 450 ? 'plata' : tn.mejor >= 250 ? 'bronce' : '', '★')}<div><b class="rec-num">${tn.mejor}</b><small>${esc(tx('puntos'))}</small></div></div>` : `<p>${esc(tx('sinRecord'))}</p>`}<dl>${dato(tx('jugadas'), tn.jugadas)}</dl></article>`;
      const rr = d.retos.rio_rush || { mejor: null, jugadas: 0, reloj: null, medallaReloj: null, jugadasReloj: 0 }; // src/game/river_rush.js (AC2, publicado: la tarjeta sale siempre)
      const rioRush = `<article class="rec-card"><h4>${esc(tx('rio_rush'))}</h4>${rr.mejor ? `<div class="rec-grande">${medalla(rr.mejor >= 250 ? 'oro' : rr.mejor >= 120 ? 'plata' : rr.mejor >= 40 ? 'bronce' : '', '★')}<div><b class="rec-num">${rr.mejor}</b><small>${esc(tx('puntos'))}</small></div></div>` : `<p>${esc(tx('sinRecord'))}</p>`}<dl>${dato(tx('jugadas'), rr.jugadas)}${rr.reloj ? dato(tx('contrarreloj'), `${rr.medallaReloj ? medalla(rr.medallaReloj, '★') + ' ' : ''}${esc(reloj(rr.reloj / 1000))}`) : ''}</dl></article>`;
      const mz = d.retos.maze || { mejor: null, jugadas: 0 }; // src/game/maze.js (BI2, publicado: la tarjeta sale siempre)
      const maze = `<article class="rec-card"><h4>${esc(tx('maze'))}</h4>${mz.mejor ? `<div class="rec-grande">${medalla(mz.mejor >= 900 ? 'oro' : mz.mejor >= 500 ? 'plata' : mz.mejor >= 200 ? 'bronce' : '', '★')}<div><b class="rec-num">${mz.mejor}</b><small>${esc(tx('puntos'))}</small></div></div>` : `<p>${esc(tx('sinRecord'))}</p>`}<dl>${dato(tx('jugadas'), mz.jugadas)}</dl></article>`;
      return `<section class="rec-sec" aria-labelledby="rec-h-retos"><h3 id="rec-h-retos">${esc(tx('retos'))} <small>${esc(tx('retosNota'))}</small></h3><div class="rec-grid">
        <article class="rec-card"><h4>${esc(tx('carrera'))}</h4>${carrera}</article><article class="rec-card"><h4>${esc(tx('tormenta'))}</h4>${tormenta}</article><article class="rec-card"><h4>${esc(tx('rio'))}</h4>${rio}</article><article class="rec-card"><h4>${esc(tx('banquete'))}</h4>${banquete}</article><article class="rec-card"><h4>${esc(tx('rescate'))}</h4>${rescate}</article>${flight}${tren}${rioRush}${maze}</div>${sellos(d)}</section>`;
    }
    // Sellos (pegatinas cosméticas): uno por medalla lograda en cada reto, sacados de los récords guardados. Solo habilidad: sin compras, cajas ni azar.
    function sellos(d) {
      const R = d.retos, ord = ['bronce', 'plata', 'oro'], por = (v, a, b) => (!v ? -1 : v >= b ? 2 : v >= a ? 1 : v > 0 ? 0 : -1);
      const nivel = {
        carrera: R.carrera.puesto ? (R.carrera.puesto === 1 ? 2 : R.carrera.puesto === 2 ? 1 : R.carrera.puesto === 3 ? 0 : -1) : -1,
        tormenta: R.tormenta.mejor ? (R.tormenta.mejor >= 1500 ? 2 : R.tormenta.mejor >= 800 ? 1 : 0) : -1,
        rio: ord.indexOf(R.rio.medalla), banquete: por(R.banquete.mejor, 600, 1200), flight: R.flight ? por(R.flight.mejor, 25, 60) : -1, tren: R.tren ? por(R.tren.mejor, 450, 650) : -1, maze: R.maze ? por(R.maze.mejor, 500, 900) : -1, // tren (C16): bronce 250; maze (BI2): bronce 200
      };
      if (R.flight && R.flight.mejor && R.flight.mejor < 10 && nivel.flight === 0) nivel.flight = -1;
      if (R.tren && R.tren.mejor && R.tren.mejor < 250 && nivel.tren === 0) nivel.tren = -1; // src/game/tren.js (C16)
      if (R.maze && R.maze.mejor && R.maze.mejor < 200 && nivel.maze === 0) nivel.maze = -1; // src/game/maze.js (BI2)
      { const z = R.rio_rush || {}, p = z.mejor >= 250 ? 2 : z.mejor >= 120 ? 1 : z.mejor >= 40 ? 0 : -1; nivel.rio_rush = Math.max(p, ord.indexOf(z.medallaReloj)); } // River Rush (AC2): la mejor de puntos y contrarreloj
      const filas = ['carrera', 'tormenta', 'rio', 'banquete', 'flight', 'tren', 'rio_rush', 'maze'].filter(k => k !== 'tren' || (R.tren && (R.tren.mejor || R.tren.jugadas))).map(k => `<li><span class="rs-n">${esc(tx(k))}</span><span class="rs-m">${ord.map((m, i) => `<span class="rec-m ${i <= nivel[k] ? m : 'falta'}" role="img" aria-label="${esc(tx(m))}${i <= nivel[k] ? '' : ' · ' + esc(tx('sinSello'))}">${i <= nivel[k] ? '★' : ''}</span>`).join('')}</span></li>`).join('');
      return `<h4 class="rec-sellos-t">${esc(tx('sellos'))} <small>${esc(tx('sellosNota'))}</small></h4><ul class="rec-sellos">${filas}</ul>`;
    }
    function htmlHistoria(d) {
      const h = d.historia, di = d.diario, es = d.especies, cr = d.criadero;
      const hist = h.terminada
        ? `<p><b>✓ ${esc(tx('terminado'))}</b></p><dl>${h.tiempo ? dato(tx('tiempoFin'), esc(duracion(h.tiempo))) : ''}</dl>`
        : `<p><b>${esc(tx('enCamino'))}</b>${h.pasos ? ` · ${esc(tx('paso'))} ${Math.min(h.paso + 1, h.pasos)} ${esc(tx('de'))} ${h.pasos}` : ''}</p><dl>${h.jugado ? dato(tx('tiempoJuego'), esc(duracion(h.jugado))) : ''}</dl>`;
      const cats = di.cats.map(c => `${esc(c.nombre)} ${c.n}/${c.total}`).join(' · ');
      const diario = `<div class="rec-grande"><b class="rec-num">${di.n}/${di.total}</b><small>${esc(tx('hallazgos'))}</small></div><div class="progress" style="--value:${di.total ? di.n / di.total : 0}" role="progressbar" aria-valuemin="0" aria-valuemax="${di.total}" aria-valuenow="${di.n}" aria-label="${esc(tx('diario'))}"></div>${cats ? `<p>${cats}</p>` : ''}`;
      const especies = `<div class="rec-grande"><b class="rec-num">${es.vistas.length} <small>${esc(tx('de'))} ${es.total}</small></b></div>${es.vistas.length
        ? `<ul class="rec-chips">${es.vistas.map(e => `<li>${esc(e.nombre)}</li>`).join('')}</ul>` : `<p>${esc(tx('sinEspecies'))}</p>`}`;
      // Cada cría lleva el color de su rareza (rareza.js); debajo, la colección por rareza
      const crias = cr.lista.length ? `<ul class="rec-chips">${cr.lista.map(c => `<li class="${c.libre ? 'libre' : ''}${c.rareza ? ' rz' : ''}"${c.rarezaColor ? ` style="--rz:${esc(c.rarezaColor)}"` : ''}>${esc(L(c.cria.es, c.cria.en))}${c.rarezaNombre ? ' · ' + esc(L(c.rarezaNombre.es, c.rarezaNombre.en)) : ''}${c.libre ? ' · ' + esc(tx('libres').toLowerCase()) : c.etapa ? ' · ' + esc(L(c.etapa.es, c.etapa.en)) : ''}</li>`).join('')}</ul>` : '';
      const RC = window.AV_HUEVOS && window.AV_HUEVOS.rarezaCria, nivelesRz = (RC && RC.niveles) || [];
      const coleccion = cr.lista.length && cr.rarezas && nivelesRz.length ? `<p class="rec-coleccion">${esc(L('Colección', 'Collection'))}: ${nivelesRz.map(n => `<span style="--rz:${esc(n.color)}">${esc(L(n.nombre.es, n.nombre.en))} ${cr.rarezas[n.id] || 0}</span>`).join(' · ')}</p>` : '';
      const criadero = cr.total
        ? `<dl>${dato(tx('huevos'), cr.huevos)}${dato(tx('crias'), cr.crias)}${dato(tx('libres'), cr.libres)}</dl>${crias}${coleccion}` : `<p>${esc(tx('sinCriadero'))}</p>`;
      const t = h.titulo ? `${esc(L('Capítulo', 'Chapter'))} ${h.capitulo} · ${esc(h.titulo)}` : esc(tx('historia'));
      return `<section class="rec-sec" aria-labelledby="rec-h-juego"><h3 id="rec-h-juego">${esc(tx('historia'))}</h3><div class="rec-grid rec-dos">
        <article class="rec-card"><h4>${t}</h4>${hist}</article><article class="rec-card"><h4>${esc(tx('diario'))}</h4>${diario}</article>
        <article class="rec-card"><h4>${esc(tx('especies'))}</h4>${especies}</article><article class="rec-card"><h4>${esc(tx('criadero'))}</h4>${criadero}</article></div></section>`;
    }
    function htmlCasa(d) {
      const lista = d.casa.length >= 2
        ? `<ol class="rec-casa">${d.casa.map(j => {
          const mc = medallaCarrera(j.carrera.puesto), mq = medallaTormenta(j.tormenta.mejor), yo = d.nombre && j.nombre === d.nombre;
          return `<li${yo ? ' aria-current="true"' : ''}><span>${esc(j.nombre)}${yo ? ` <em>(${esc(tx('tu'))})</em>` : ''}</span>
            <span>${esc(tx('carreraCorta'))}: ${j.carrera.mejor ? `${medalla(mc, mc === 'meta' ? '★' : j.carrera.puesto)}<b>${reloj(j.carrera.mejor / 1000)}</b>` : '—'}</span>
            <span>${esc(tx('tormentaCorta'))}: ${j.tormenta.mejor ? `${medalla(mq, '★')}<b>${j.tormenta.mejor}</b>` : '—'}</span></li>`;
        }).join('')}</ol>` : `<p class="rec-nota">${esc(tx('casaNota'))}</p>`;
      return `<section class="rec-sec" aria-labelledby="rec-h-casa"><h3 id="rec-h-casa">${esc(tx('casa'))}</h3>${lista}</section>`;
    }
    function pintar() {
      if (!root) return;
      const d = leer(), hay = !!d.retos.carrera.mejor;
      root.querySelector('#rec-titulo').textContent = tx('titulo');
      root.querySelectorAll('[data-rec-cerrar]').forEach(b => { b.textContent = tx('cerrar'); });
      root.querySelector('.rec-body').innerHTML = `<p class="rec-nota">${esc(tx('local'))}</p>${htmlRetos(d)}${htmlHistoria(d)}${G.marcador ? G.marcador.htmlRecords() : ''}${htmlCasa(d)}`;
      const b = root.querySelector('#rec-compartir');
      b.textContent = tx('compartirRecord'); b.setAttribute('aria-disabled', String(!hay));
      b.title = hay ? '' : tx('sinCarrera');
    }
    function montar() {
      if (root) return;
      root = document.createElement('div'); root.id = 'records'; root.hidden = true;
      root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'rec-titulo');
      root.innerHTML = `<div class="rec-box paper" tabindex="-1"><header class="rec-head"><h2 id="rec-titulo"></h2>
        <button class="btn ghost sm" type="button" data-rec-cerrar data-icon="close"></button></header><div class="rec-body"></div>
        <footer class="rec-pie"><p class="rec-estado" id="rec-estado" role="status" aria-live="polite"></p>
        <button class="btn" type="button" id="rec-compartir" data-icon="share"></button><button class="btn ghost" type="button" data-rec-cerrar data-icon="close"></button></footer></div>`;
      document.body.appendChild(root);
      box = root.querySelector('.rec-box');
      root.addEventListener('click', e => {
        if (e.target === root || e.target.closest('[data-rec-cerrar]')) { cerrar(); return; }
        if (e.target.closest('#rec-compartir')) compartirRecord();
      });
    }
    function estado(txt) { if (root) { const el = root.querySelector('#rec-estado'); if (el) el.textContent = txt || ''; } }
    // Avisos: dentro del panel si está abierto (el aviso del juego queda detrás), si no, el aviso del juego
    function avisar(txt, ms) { if (abierto) estado(txt); else if (G.ui && G.ui.toast) G.ui.toast(txt, ms || 3500); }
    function abrir(o) {
      o = o || {};
      if (abierto) return true;
      montar(); sincronizar();
      origen = { desde: o.desde || null, foco: document.activeElement };
      estado(''); pintar();
      root.hidden = false; abierto = true;
      const tit = $('title'); if (tit && tit.open && !tit.inert) { tit.inert = true; titulo_inert = true; }
      pausar(true);
      document.addEventListener('keydown', teclas, true);
      box.focus({ preventScroll: true });
      return true;
    }
    function cerrar() {
      if (!abierto) return false;
      if (puertaAbierta) cerrarPuerta(false);
      root.hidden = true; abierto = false;
      document.removeEventListener('keydown', teclas, true);
      if (titulo_inert) { const tit = $('title'); if (tit) tit.inert = false; titulo_inert = false; }
      pausar(false);
      const desde = origen && origen.desde, foco = origen && origen.foco; origen = null;
      let enfocado = false;
      if (desde === 'pausa') { const p = $('pause'); try { if (p && p.showPopover && !p.matches(':popover-open')) { p.showPopover(); enfocado = true; } } catch (e) { /* sin popover */ } }
      if (!enfocado) { const b = desde === 'portada' ? $('b-records-title') : null; const f = b || foco; if (f && f.focus && document.contains(f)) f.focus({ preventScroll: true }); }
      return true;
    }
    function enfocables(raiz) {
      return [...raiz.querySelectorAll('button, [href], input, select, textarea, [tabindex]')].filter(el => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length);
    }
    function teclas(e) {
      if (!abierto) return;
      const capa = puertaAbierta ? $('rec-puerta') : root;
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (puertaAbierta) cerrarPuerta(false); else cerrar();
        return;
      }
      if (e.key === 'Tab' && capa) {
        const f = enfocables(capa); if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
      }
    }
    G.on('aula', () => { etiquetas(); if (abierto) pintar(); });
    G.on('apply', () => { etiquetas(); if (abierto) pintar(); });

    // Etiquetas de los botones que están en index.html (en español); aquí siguen el idioma elegido
    function etiquetas() {
      const poner = (id, txt) => { const b = $(id); if (b) b.textContent = txt; };
      poner('b-records', tx('titulo')); poner('b-records-title', tx('titulo')); poner('c-share', tx('compartir'));
    }
    etiquetas();

    // =================================================================================================================
    // Puerta para adultos
    // =================================================================================================================
    let puertaAbierta = false, puertaFin = null, puertaFoco = null;
    function montarPuerta() {
      let p = $('rec-puerta'); if (p) return p;
      p = document.createElement('div'); p.id = 'rec-puerta'; p.hidden = true;
      p.setAttribute('role', 'alertdialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-labelledby', 'rp-t'); p.setAttribute('aria-describedby', 'rp-q');
      p.innerHTML = `<div class="rp-box paper" tabindex="-1"><h2 id="rp-t"></h2><p id="rp-texto"></p><p class="rp-suma" id="rp-q"></p>
        <div class="rp-opciones" role="group" id="rp-opciones"></div><p class="rp-err" id="rp-err" role="alert" hidden></p>
        <button class="btn ghost" type="button" id="rp-no"></button></div>`;
      document.body.appendChild(p);
      p.addEventListener('click', e => {
        const b = e.target.closest('[data-v]');
        if (b) { elegir(+b.dataset.v); return; }
        if (e.target === p || e.target.closest('#rp-no')) cerrarPuerta(false);
      });
      return p;
    }
    let respuesta = 0, fallos = 0, azarPuerta = Math.random;
    // Suma de dos cifras (21 a 79, sin decenas redondas) y 3 opciones: la buena y dos que se parecen
    function nuevaSuma() {
      const r = n => Math.floor(azarPuerta() * n), dos = () => { let n; do { n = 21 + r(59); } while (n % 10 === 0); return n; };
      const a = dos(), b = dos(); respuesta = a + b;
      const malas = new Set();
      const cand = [10, -10, 1, -1, 2, -2, 11, -11, 9, -9];
      while (malas.size < 2) { const v = respuesta + cand[r(cand.length)]; if (v > 0 && v !== respuesta) malas.add(v); }
      const ops = [respuesta, ...malas];
      for (let i = ops.length - 1; i > 0; i--) { const j = r(i + 1); [ops[i], ops[j]] = [ops[j], ops[i]]; }
      const p = $('rec-puerta');
      p.querySelector('#rp-q').textContent = `${a} + ${b} = ?`;
      p.querySelector('#rp-opciones').innerHTML = ops.map(v => `<button class="btn secondary" type="button" data-v="${v}">${v}</button>`).join('');
      p.querySelector('#rp-opciones').setAttribute('aria-label', tx('opciones'));
    }
    function elegir(v) {
      const p = $('rec-puerta'); if (!p || !puertaAbierta) return;
      if (v === respuesta) { cerrarPuerta(true); return; }
      fallos++;
      const caja = p.querySelector('.rp-box'); caja.classList.remove('mal'); void caja.offsetWidth; caja.classList.add('mal');
      if (fallos >= 3) { avisar(tx('puertaFin'), 4500); cerrarPuerta(false); return; }
      const err = p.querySelector('#rp-err'); err.textContent = tx('puertaMal'); err.hidden = false;
      nuevaSuma();
      const primero = p.querySelector('[data-v]'); if (primero) primero.focus();
    }
    function cerrarPuerta(ok) {
      if (!puertaAbierta) return;
      puertaAbierta = false; $('rec-puerta').hidden = true;
      if (!abierto) document.removeEventListener('keydown', teclas, true);
      const f = puertaFin; puertaFin = null;
      const foco = puertaFoco; puertaFoco = null; if (foco && foco.focus && document.contains(foco)) foco.focus({ preventScroll: true });
      if (f) f(!!ok);
    }
    // → Promise<boolean>: true solo si el adulto acierta la suma. o.azar: función 0..1 (pruebas)
    function puerta(o) {
      o = o || {};
      if (puertaAbierta) return Promise.resolve(false);
      const p = montarPuerta();
      azarPuerta = typeof o.azar === 'function' ? o.azar : Math.random; fallos = 0;
      p.querySelector('#rp-t').textContent = tx('puertaTitulo'); p.querySelector('#rp-texto').textContent = tx('puertaTexto'); p.querySelector('#rp-no').textContent = tx('ahoraNo');
      p.querySelector('#rp-err').hidden = true;
      nuevaSuma();
      puertaAbierta = true; puertaFoco = document.activeElement; p.hidden = false;
      if (!abierto) document.addEventListener('keydown', teclas, true);
      p.querySelector('.rp-box').focus({ preventScroll: true });
      return new Promise(res => { puertaFin = res; });
    }

    // =================================================================================================================
    // Ranking global (tools/supabase, función amazona-records): apodo «Animal Adjetivo NN» de listas fijas (sin texto libre),
    // id de dispositivo aleatorio y nada personal. Las partidas de prueba nunca publican (salvo con o.fetch simulado).
    // =================================================================================================================
    const RANK_URL = 'https://muxxdjyxwjxaoziczkcz.supabase.co/functions/v1/amazona-records', RANK_VER = 'https://amazonaverse.com/#top-records';
    const ANIMALES = ['Cotorra', 'Coquí', 'Guaraguao', 'Colibrí', 'Iguaca', 'Tinglar', 'Manatí', 'Reinita', 'Múcaro', 'Lagartijo'];
    const ADJETIVOS = ['Veloz', 'Valiente', 'Curioso', 'Brillante', 'Alegre', 'Audaz', 'Sabio', 'Feliz', 'Ágil', 'Sereno'];
    const RANK_RETOS = ['carrera', 'rio', 'tormenta', 'banquete', 'flight', 'rio_rush', 'tren']; // rio_rush: River Rush clásico, por puntos (AC2)
    const claveAlias = ALM + '.rankalias', claveDisp = ALM + '.rankdisp';
    const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin almacén: el apodo no se recuerda */ } };
    function dispositivo() {
      let d = lsGet(claveDisp);
      if (!d || !/^[a-f0-9]{32}$/.test(d)) {
        const a = new Uint8Array(16); try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256); }
        d = Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); lsSet(claveDisp, d);
      }
      return d;
    }
    const aliasDe = x => ANIMALES[x.a] + ' ' + ADJETIVOS[x.j] + ' ' + x.n;
    const aliasAzar = () => ({ a: Math.floor(Math.random() * ANIMALES.length), j: Math.floor(Math.random() * ADJETIVOS.length), n: 1 + Math.floor(Math.random() * 99) });
    function aliasGuardado() {
      try { const x = JSON.parse(lsGet(claveAlias) || 'null'); if (x && Number.isInteger(x.a) && ANIMALES[x.a] && Number.isInteger(x.j) && ADJETIVOS[x.j] && Number.isInteger(x.n) && x.n >= 1 && x.n <= 99) return x; } catch (e) { /* dañado */ }
      return aliasAzar();
    }
    let rankAbierto = false, rankFin = null, rankFoco = null, rankDatos = null, rankFetch = null, rankOk = false;
    function montarRank() {
      let p = $('rec-rank'); if (p) return p;
      p = document.createElement('div'); p.id = 'rec-rank'; p.hidden = true;
      p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-labelledby', 'rk-t');
      p.innerHTML = `<div class="rk-box paper" tabindex="-1"><h2 id="rk-t"></h2><p id="rk-texto"></p>
        <div class="rk-sel" id="rk-sel"><label><span id="rk-la"></span><select id="rk-a" data-no-tr></select></label><label><span id="rk-lj"></span><select id="rk-j" data-no-tr></select></label><label><span id="rk-ln"></span><select id="rk-n"></select></label></div>
        <p class="rk-alias" id="rk-alias" aria-live="polite" data-no-tr></p>
        <div class="rk-fila" id="rk-fila"><button class="btn secondary" type="button" id="rk-azar"></button><button class="btn" type="button" id="rk-pub"></button></div>
        <div class="rk-res" id="rk-res" role="status" aria-live="polite" hidden></div>
        <div class="rk-fila"><a id="rk-ver" target="_blank" rel="noopener noreferrer"></a><button class="btn ghost" type="button" id="rk-no"></button></div></div>`;
      document.body.appendChild(p);
      const sa = p.querySelector('#rk-a'), sj = p.querySelector('#rk-j'), sn = p.querySelector('#rk-n');
      sa.innerHTML = ANIMALES.map((x, i) => `<option value="${i}">${esc(x)}</option>`).join('');
      sj.innerHTML = ADJETIVOS.map((x, i) => `<option value="${i}">${esc(x)}</option>`).join('');
      sn.innerHTML = Array.from({ length: 99 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
      const pintar = () => { p.querySelector('#rk-alias').textContent = aliasDe(elegido()); };
      p.addEventListener('change', e => { if (e.target.closest('select')) { lsSet(claveAlias, JSON.stringify(elegido())); pintar(); } });
      p.addEventListener('click', e => {
        if (e.target === p || e.target.closest('#rk-no')) { cerrarRank(); return; }
        if (e.target.closest('#rk-azar')) { ponerAlias(aliasAzar()); return; }
        if (e.target.closest('#rk-pub')) enviarRank();
      });
      p.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cerrarRank(); } }, true);
      return p;
    }
    const elegido = () => ({ a: +$('rk-a').value, j: +$('rk-j').value, n: +$('rk-n').value });
    function ponerAlias(x) {
      $('rk-a').value = String(x.a); $('rk-j').value = String(x.j); $('rk-n').value = String(x.n);
      lsSet(claveAlias, JSON.stringify(x)); $('rk-alias').textContent = aliasDe(x);
    }
    function cerrarRank() {
      if (!rankAbierto) return;
      rankAbierto = false; $('rec-rank').hidden = true; $('rec-rank').remove(); // se vuelve a montar al abrir (con el idioma de ese momento)
      const f = rankFin, ok = rankOk; rankFin = null; const foco = rankFoco; rankFoco = null;
      if (foco && foco.focus && document.contains(foco)) foco.focus({ preventScroll: true });
      if (f) f(ok ? 'publicado' : 'cerrado');
    }
    const valorRank = (reto, v) => (reto === 'carrera' || reto === 'rio' ? reloj(v / 1000) : String(v));
    async function enviarRank() {
      const p = $('rec-rank'), D = rankDatos, res = p.querySelector('#rk-res'), bt = p.querySelector('#rk-pub');
      if (!D || bt.disabled) return;
      bt.disabled = true; res.hidden = false; res.textContent = tx('rankEnviando');
      const x = elegido(); lsSet(claveAlias, JSON.stringify(x));
      let ok = false, msg = tx('rankMal'), cuerpo = null;
      try {
        const ctl = typeof AbortController === 'function' ? new AbortController() : null, t = setTimeout(() => { if (ctl) ctl.abort(); }, 8000);
        try {
          const r = await (rankFetch || window.fetch.bind(window))(RANK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined,
            body: JSON.stringify({ reto: D.reto, valor: Math.round(D.valor), dur_ms: Math.round(D.dur_ms), alias: aliasDe(x), dispositivo: dispositivo() }) });
          cuerpo = await r.json().catch(() => null);
          if (r.ok && cuerpo && cuerpo.ok) ok = true;
          else if (cuerpo && cuerpo.error === 'inverosimil') msg = tx('rankInverosimil');
          else if (r.status === 429) msg = tx('rankMucho');
        } finally { clearTimeout(t); }
      } catch (e) { msg = tx('rankSinRed'); }
      if (!ok) { res.textContent = msg; bt.disabled = false; return; }
      rankOk = true;
      const top = (Array.isArray(cuerpo.top) ? cuerpo.top : []).slice(0, 3);
      res.innerHTML = `<b>${esc(cuerpo.puesto ? tx('rankPuesto').replace('{}', cuerpo.puesto) : tx('rankListo'))}</b>` +
        (top.length ? `<ol class="rk-top">${top.map(f => `<li><span>${esc(f.puesto)}.</span> ${esc(f.alias)} · <b>${esc(valorRank(D.reto, f.valor))}</b></li>`).join('')}</ol>` : '');
      p.querySelector('#rk-fila').hidden = true;
      p.querySelector('#rk-no').textContent = tx('cerrar');
    }
    // o: { reto, valor, dur_ms, prueba, fetch } → Promise<'publicado'|'cerrado'|'prueba'|'invalido'>. Una partida de prueba nunca publica (salvo con fetch simulado)
    function publicarRanking(o) {
      o = o || {};
      if (o.prueba && typeof o.fetch !== 'function') return Promise.resolve('prueba');
      if (!RANK_RETOS.includes(o.reto) || !(o.valor > 0) || !(o.dur_ms >= 0)) return Promise.resolve('invalido');
      if (rankAbierto) return Promise.resolve('cerrado');
      const p = montarRank();
      rankDatos = { reto: o.reto, valor: o.valor, dur_ms: o.dur_ms }; rankFetch = typeof o.fetch === 'function' ? o.fetch : null; rankOk = false;
      const T = (id, k) => { p.querySelector(id).textContent = tx(k); };
      T('#rk-t', 'rankTitulo'); T('#rk-texto', 'rankTexto'); T('#rk-la', 'rankAnimal'); T('#rk-lj', 'rankAdj'); T('#rk-ln', 'rankNum'); T('#rk-azar', 'rankAzar'); T('#rk-pub', 'rankPub'); T('#rk-no', 'ahoraNo');
      const ver = p.querySelector('#rk-ver'); ver.textContent = tx('rankVer'); ver.href = RANK_VER;
      p.querySelector('#rk-res').hidden = true; p.querySelector('#rk-res').textContent = ''; p.querySelector('#rk-fila').hidden = false; p.querySelector('#rk-pub').disabled = false;
      ponerAlias(aliasGuardado());
      rankAbierto = true; rankFoco = document.activeElement; p.hidden = false;
      p.querySelector('#rk-pub').focus({ preventScroll: true });
      return new Promise(res => { rankFin = res; });
    }

    // =================================================================================================================
    // Compartir: menú del sistema en el móvil, descarga en la computadora
    // =================================================================================================================
    const esMovil = () => {
      try {
        return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
          || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      } catch (e) { return false; }
    };
    async function descargar(blob, nombre, o) {
      o = o || {};
      // En el visor de Claude <a download> no funciona: se usa su capacidad 'downloads' (igual que el cómic)
      let d = o.descargas || null;
      if (!d && window.claude && window.claude.use) { try { d = await Promise.race([window.claude.use('downloads'), new Promise(r => setTimeout(() => r(null), 3000))]); } catch (e) { d = null; } }
      if (d && typeof d.save === 'function') {
        try { await d.save({ filename: nombre, data: blob }); return 'descargado'; }
        catch (e) { if (e && e.code === 'declined') return 'cancelado'; }
      }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = nombre; a.rel = 'noopener'; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return 'descargado';
    }
    // → 'compartido' | 'cancelado' | 'descargado'. o.nav / o.movil / o.descargar: pruebas
    async function compartirArchivo(blob, nombre, meta, o) {
      o = o || {};
      const nav = o.nav || navigator, movil = o.movil != null ? o.movil : esMovil();
      if (movil && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
        let archivo = null; try { archivo = new File([blob], nombre, { type: 'image/png' }); } catch (e) { archivo = null; }
        let puede = false; try { puede = !!archivo && nav.canShare({ files: [archivo] }); } catch (e) { puede = false; }
        if (puede) {
          try { await nav.share({ files: [archivo], title: meta.title, text: meta.text }); return 'compartido'; }
          catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; /* el sistema no pudo: se descarga */ }
        }
      }
      return (o.descargar || descargar)(blob, nombre, o);
    }
    function resultado(r) {
      if (r === 'compartido') avisar(tx('compartido'));
      else if (r === 'descargado') avisar(tx('descargado'));
    }
    const nombreComic = () => ((G.pack.comic && G.pack.comic.archivo) || 'amazona-verse-mi-comic') + '.png';
    // Cómic: el PNG se prepara mientras el adulto resuelve la suma. o.preparar / o.registrar: pruebas
    let compartiendo = false;
    async function compartirComic(o) {
      o = o || {};
      if (compartiendo) return 'ocupado';
      compartiendo = true;
      try {
        const preparar = Promise.resolve().then(o.preparar || (() => G.comic.pngSinRegistro())); preparar.catch(() => {});
        if (!(await puerta(o))) return 'puerta';
        avisar(tx('preparando'), 6000);
        const blob = await preparar.catch(() => null);
        if (!blob) { avisar(tx('errImagen'), 4000); return 'error'; }
        const r = await compartirArchivo(blob, nombreComic(), { title: tx('tituloComic'), text: tx('tituloComic') + ' · amazona-verse.vercel.app' }, o);
        resultado(r);
        if (o.registrar !== false && (r === 'compartido' || r === 'descargado')) { G.eventos.log('ComicExported', { format: 'png', bytes: blob.size, via: 'compartir' }); G.guardado.autosave(); }
        return r;
      } finally { compartiendo = false; }
    }

    // Tarjeta del récord (1080×1350): medalla y tiempo de la carrera, y la tormenta si hay
    const TARJETA = { w: 1080, h: 1350 };
    const COLOR_MEDALLA = { oro: ['#ffd24a', '#c98a10'], plata: ['#e4ecf2', '#8a9aa8'], bronce: ['#f0a86a', '#9a5a24'], meta: ['#bfe7c8', '#3f9a55'] };
    function aBlobPNG(cv) {
      return new Promise(res => {
        let listo = false; const fin = b => { if (!listo) { listo = true; res(b); } };
        try { cv.toBlob(b => fin(b), 'image/png'); } catch (e) { fin(null); }
        setTimeout(() => fin(null), 10000);
      }).then(b => {
        if (b && b.size) return b;
        try { const m = /^data:([^;,]*);base64,(.*)$/.exec(cv.toDataURL('image/png')); const bin = atob(m[2]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: 'image/png' }); } catch (e) { return null; }
      });
    }
    async function tarjetaPNG(d, modo) {
      d = d || leer(); const vuelo = modo === 'flight', fv = d.retos.flight || { mejor: null }; // Amazona Flight: misma tarjeta con sus puntos
      const W = TARJETA.w, H = TARJETA.h, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const x = cv.getContext('2d'), c = d.retos.carrera, q = d.retos.tormenta;
      try { await Promise.all([document.fonts.load('700 100px Fredoka'), document.fonts.load('700 30px "Atkinson Hyperlegible"')]); } catch (e) { /* fuentes del sistema */ }
      const F = (peso, px) => `${peso} ${px}px Fredoka, "Trebuchet MS", system-ui, sans-serif`, B = (peso, px) => `${peso} ${px}px "Atkinson Hyperlegible", system-ui, sans-serif`;
      // Cielo del título y selva
      let g = x.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1b1550'); g.addColorStop(0.3, '#3b2c8f'); g.addColorStop(0.55, '#7a55c9'); g.addColorStop(0.78, '#f08a5d'); g.addColorStop(1, '#ffc46b');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      g = x.createRadialGradient(W / 2, 560, 40, W / 2, 560, 560); g.addColorStop(0, 'rgba(255,246,213,.55)'); g.addColorStop(1, 'rgba(255,210,122,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = '#2c6b45'; x.beginPath(); x.moveTo(0, 1130); x.bezierCurveTo(250, 1070, 450, 1100, 640, 1120); x.bezierCurveTo(840, 1140, 960, 1090, W, 1110); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.fillStyle = '#1b4a30'; x.beginPath(); x.moveTo(0, 1200); x.bezierCurveTo(260, 1150, 520, 1190, 760, 1200); x.bezierCurveTo(900, 1206, 1000, 1180, W, 1190); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.fillStyle = '#0f2e1e'; x.fillRect(0, 1262, W, H - 1262);
      // Nombre del juego
      x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
      x.font = F(700, 116); x.lineWidth = 22; x.strokeStyle = '#2b1405'; x.strokeText('AMAZONA VERSE', W / 2, 168);
      g = x.createLinearGradient(0, 70, 0, 170); g.addColorStop(0, '#fff8cf'); g.addColorStop(0.5, '#ffcb3d'); g.addColorStop(1, '#ee7a12'); x.fillStyle = g; x.fillText('AMAZONA VERSE', W / 2, 168);
      // Rótulo de la carrera
      const rotulo = vuelo ? tx('flight') : tx('carrera');
      x.font = F(600, 44); const rw = Math.min(x.measureText(rotulo).width + 80, W - 120);
      x.fillStyle = 'rgba(20,12,60,.6)'; x.beginPath(); x.roundRect ? x.roundRect(W / 2 - rw / 2, 206, rw, 70, 35) : x.rect(W / 2 - rw / 2, 206, rw, 70); x.fill();
      x.fillStyle = '#fff'; x.fillText(rotulo, W / 2, 256);
      // Medalla
      const m = vuelo ? (fv.mejor >= 60 ? 'oro' : fv.mejor >= 25 ? 'plata' : 'bronce') : medallaCarrera(c.puesto) || 'meta', col = COLOR_MEDALLA[m], cx = W / 2, cy = 582, r = 185;
      x.save(); x.translate(cx, cy - r + 20);
      for (const [dx, ang, color] of [[-70, -0.32, '#d6403a'], [70, 0.32, '#3d8fb0']]) { x.save(); x.translate(dx, -30); x.rotate(ang); x.fillStyle = color; x.fillRect(-42, -90, 84, 190); x.restore(); }
      x.restore();
      x.shadowColor = 'rgba(255,210,122,.9)'; x.shadowBlur = 60; x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, cy, r + 14, 0, 7); x.fill(); x.shadowBlur = 0;
      g = x.createRadialGradient(cx - 60, cy - 70, 10, cx, cy, r); g.addColorStop(0, '#fff8d8'); g.addColorStop(0.45, col[0]); g.addColorStop(1, col[1]);
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
      x.lineWidth = 10; x.strokeStyle = 'rgba(74,42,5,.25)'; x.beginPath(); x.arc(cx, cy, r - 30, 0, 7); x.stroke();
      x.fillStyle = '#4a2a05'; x.font = F(700, m === 'meta' ? 150 : 230); x.textBaseline = 'middle';
      x.fillText(vuelo || m === 'meta' ? '★' : String(c.puesto), cx, cy + 12); x.textBaseline = 'alphabetic';
      // Tiempo
      x.font = B(700, 36); x.fillStyle = '#ffe9a8'; x.lineWidth = 8; x.strokeStyle = 'rgba(27,21,80,.8)';
      const miMejor = (vuelo ? tx('mejorPuntos').toUpperCase() : tx('miMejor')).split('').join(String.fromCharCode(8202)); x.strokeText(miMejor, cx, 832); x.fillText(miMejor, cx, 832);
      const tiempo = vuelo ? String(fv.mejor || '—') : c.mejor ? reloj(c.mejor / 1000) : '—';
      x.font = F(700, 190); x.lineWidth = 26; x.strokeStyle = '#1b1550'; x.strokeText(tiempo, cx, 992); x.fillStyle = '#fff'; x.fillText(tiempo, cx, 992);
      x.font = F(600, 46); x.lineWidth = 12;
      const linea = vuelo ? `${tx('obstaculos')} · ${medallaTxt(m)}` : `${tx('mejorPuesto')}: ${ordinal(c.puesto || 1)} · ${medallaTxt(m)}`;
      x.strokeText(linea, cx, 1056); x.fillStyle = '#ffe9a8'; x.fillText(linea, cx, 1056);
      if (!vuelo && q.mejor) { const l2 = `${tx('tormentaCorta')}: ${q.mejor} ${tx('puntos')}`; x.font = F(600, 40); x.lineWidth = 10; x.strokeText(l2, cx, 1110); x.fillStyle = '#fff'; x.fillText(l2, cx, 1110); }
      // Vittata, la cotorra de la casa y el lema
      try { const im = await G.AVE.assets.image('assets/vittata.png'); if (im) { const s = 330; x.drawImage(im, W - s - 30, H - s - 8, s, s); } } catch (e) { /* sin imagen */ }
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = B(700, 34);
      const cot = d.nombre && G.creador && G.creador.esNombreDeLista && G.creador.esNombreDeLista(d.nombre) ? d.nombre : null;
      if (cot) { x.font = F(600, 42); x.fillStyle = '#ffe9a8'; x.fillText(cot, 56, 1236); }
      x.font = B(700, 28); x.fillStyle = '#fff'; x.fillText(tx('lema'), 56, 1288, 640);
      x.font = F(600, 34); x.fillStyle = '#ffd27a'; x.fillText(vuelo ? 'amazonaverse.com' : 'amazona-verse.vercel.app', 56, 1328);
      return aBlobPNG(cv);
    }
    // Récord: la misma puerta; la tarjeta se prepara mientras se resuelve la suma
    async function compartirRecord(o) {
      o = o || {};
      if (compartiendo) return 'ocupado';
      const d = leer();
      const vuelo = o.modo === 'flight'; // Amazona Flight (src/game/flight.js): misma puerta y misma tarjeta, con sus puntos
      if (vuelo ? !(d.retos.flight && d.retos.flight.mejor) : !d.retos.carrera.mejor) { avisar(vuelo ? tx('sinVuelo') : tx('sinCarrera'), 4000); return 'sin-record'; }
      compartiendo = true;
      try {
        const preparar = Promise.resolve().then(() => (o.preparar ? o.preparar(d) : tarjetaPNG(d, o.modo))); preparar.catch(() => {});
        if (!(await puerta(o))) return 'puerta';
        avisar(tx('preparando'), 6000);
        const blob = await preparar.catch(() => null);
        if (!blob) { avisar(tx('errImagen'), 4000); return 'error'; }
        const r = await compartirArchivo(blob, vuelo ? 'amazona-flight-mi-record.png' : 'amazona-verse-mi-record.png', { title: tx('tituloRecord'), text: vuelo ? 'Amazona Verse · Amazona Flight · ' + d.retos.flight.mejor + ' ' + tx('obstaculos') + ' · amazonaverse.com' : tx('tituloRecord') + ' · ' + reloj(d.retos.carrera.mejor / 1000) + ' · amazona-verse.vercel.app' }, o);
        resultado(r);
        return r;
      } finally { compartiendo = false; }
    }

    // =================================================================================================================
    // AV.recordsTest(): lee récords de ejemplo (claves .prueba), la casa con 2 nombres, la puerta de adultos, compartir con y sin
    // navigator.share (simulado) y que la partida queda intacta. Los almacenes reales no se tocan.
    // =================================================================================================================
    async function test(opts) {
      opts = opts || {};
      const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
      const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < (ms || 3000)) { if (f()) return true; await new Promise(r => setTimeout(r, 20)); } return !!f(); };
      // Lo que la partida guarda; el reloj, la posición y el agua cambian solos con el juego en marcha
      const VOLATIL = ['clock', 'pos', 'vy', 'facing', 'water', 'event', 'marcador']; // marcador: el cronómetro sigue contando mientras corre la prueba
      const comparable = () => JSON.stringify(Object.fromEntries(Object.entries(S).filter(([k]) => !VOLATIL.includes(k))));
      const raw = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
      const claves = [G.guardado.KEY, G.guardado.KEY + '.tmp', G.guardado.KEY + '.prev', CLAVE.retos, CLAVE.criadero, CLAVE.casa, G.pack.aula && G.pack.aula.clave].filter(Boolean);
      const antes = claves.map(raw), sAntes = comparable();
      const orig = Object.assign({}, CLAVE), idiomaAntes = G.aula && G.aula.aj ? G.aula.aj.idioma : null;
      const pruebas = { retos: orig.retos + '.prueba', criadero: orig.criadero + '.prueba', casa: orig.casa + '.prueba' };
      const quitar = () => { for (const k of Object.values(pruebas)) { try { localStorage.removeItem(k); } catch (e) { /* sin almacén */ } delete mem[k]; } };
      const cerrarTodo = () => { if (puertaAbierta) cerrarPuerta(false); if (abierto) cerrar(); };
      const nuevoS = (nombre, extra) => Object.assign({ profile: { created: true, name: nombre, look: { species: 'oratrix' } }, complete: false, step: 2, clock: 600, events: [], field: [] }, extra);
      const campo = ((G.pack.diario && G.pack.diario.entradas) || []).map(e => e.id);
      const sFin = nuevoS('Nube Azul', { complete: true, step: (G.misiones && G.misiones.DONE) || 8, clock: 4100, events: [{ key: 'ChapterCompleted', t: 3125.4 }], field: campo.slice(0, 7) });
      const pngPrueba = async () => { const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const k = cv.getContext('2d'); k.fillStyle = '#2f8f4e'; k.fillRect(0, 0, 64, 64); k.fillStyle = '#ffd27a'; k.fillRect(8, 8, 32, 32); return aBlobPNG(cv); };
      const pulsar = id => { const b = $(id); if (b) b.click(); return !!b; };
      const suma = () => { const m = /(\d+) \+ (\d+)/.exec(($('rp-q') || {}).textContent || ''); return m ? +m[1] + +m[2] : null; };
      const botonesPuerta = () => [...document.querySelectorAll('#rec-puerta [data-v]')];
      const acertar = async () => { await espera(() => puertaAbierta && suma() != null); const ok = botonesPuerta().find(b => +b.dataset.v === suma()); if (ok) ok.click(); return !!ok; };
      let disp = null;
      const quieta = G.quiet; G.guardado.suspender(true); G.quiet = true; // el guardado automático no escribe mientras dura la prueba
      try {
        quitar(); simulada = { S: sFin };
        Object.assign(CLAVE, pruebas);
        // ---------- Lectura de récords de ejemplo ----------
        localStorage.setItem(pruebas.retos, JSON.stringify({ v: 1, carrera: { mejor: 65300, puesto: 1, oros: 2, jugadas: 5 }, tormenta: { mejor: 1620, tiempo: 90, jugadas: 3 } }));
        localStorage.setItem(pruebas.criadero, JSON.stringify({ v: 1, capsulas: { clasico: { estado: 'nacida', xp: 200 }, tropical: { estado: 'incubando', xp: 30 }, playa: { estado: 'disponible', xp: 0 }, bosque: { estado: 'liberada', xp: 1500 } }, fuentes: { aprender: 0, explorar: 0, cuidar: 0 } }));
        localStorage.setItem(pruebas.casa, JSON.stringify({ v: 1, adoptado: true, vistas: [], jugadores: {} }));
        const d = leer();
        check('Lee los récords de Retos de la clave aparte', d.retos.carrera.mejor === 65300 && d.retos.carrera.puesto === 1 && d.retos.carrera.oros === 2 && d.retos.tormenta.mejor === 1620 && d.retos.tormenta.jugadas === 3);
        check('Historia terminada con su tiempo, Diario n/12 y criadero', d.historia.terminada && d.historia.tiempo === 3125.4 && d.diario.n === 7 && d.diario.total === 12 && d.criadero.huevos === 2 && d.criadero.crias === 1 && d.criadero.libres === 1,
          `${d.historia.tiempo} s · ${d.diario.n}/${d.diario.total} · ${d.criadero.huevos}/${d.criadero.crias}/${d.criadero.libres}`);
        check('Las claves del libro y de Retos no son la de la partida', CLAVE.casa !== G.guardado.KEY && orig.casa === ALM + '.records' && orig.casa !== orig.retos, orig.casa);
        const malo = retosDe({ v: 1, carrera: { mejor: -5, puesto: 99, oros: 'x', jugadas: 2.5 }, tormenta: null });
        check('Datos dañados no rompen la lectura', malo.carrera.mejor === null && malo.carrera.puesto === null && malo.carrera.oros === 0 && malo.carrera.jugadas === 0 && malo.tormenta.mejor === null && retosDe('basura').carrera.mejor === null);
        // ---------- Panel ----------
        const enPausa = () => !!(G.pausa && G.pausa.motivos && G.pausa.motivos.has('records')), pausaAntes = enPausa();
        check('El panel abre', abrir({ desde: 'portada' }) && abierto && !root.hidden && root.getAttribute('aria-modal') === 'true');
        const txt = root.textContent;
        check('Muestra mejor tiempo, medalla, puntos y veces jugadas', /1:05\.3/.test(txt) && /Oro/.test(txt) && /1620/.test(txt) && /Veces jugado/.test(txt) && root.querySelector('.rec-m.oro'), '1:05.3 · 1620');
        check('Muestra historia (terminada, 52 min), Diario 7/12, criadero y especies', /Terminado/.test(txt) && /52 min/.test(txt) && /7\/12/.test(txt) && /Huevos/.test(txt) && /Iguaca/.test(txt) && root.querySelectorAll('.rec-chips li').length >= 2);
        check('El mundo queda en pausa y el foco entra al panel', (!G.pausa || enPausa()) && root.contains(document.activeElement));
        const grande = [...root.querySelectorAll('button')].filter(b => b.getClientRects().length && b.offsetHeight < 44);
        check('Los botones del panel miden 44 px o más', grande.length === 0, grande.length + ' pequeños');
        const rb = root.querySelector('.rec-box'), cuerpo = root.querySelector('.rec-body');
        check('Nada se desborda a lo ancho', rb.scrollWidth <= rb.clientWidth + 1 && cuerpo.scrollWidth <= cuerpo.clientWidth + 1 && rb.getBoundingClientRect().right <= innerWidth + 1, `${cuerpo.scrollWidth}/${cuerpo.clientWidth} en ${innerWidth}`);
        if (G.aula && G.aula.aj) {
          G.aula.aj.idioma = 'en'; pintar();
          const en = root.textContent;
          check('También en inglés', /Challenge mode/.test(en) && /Best time/.test(en) && /Gold/.test(en) && /Finished/.test(en) && /Field Journal/.test(en) && /Share my record/.test(root.querySelector('#rec-compartir').textContent));
          G.aula.aj.idioma = idiomaAntes; pintar();
        }
        // ---------- La casa ----------
        check('Con una sola cotorra la casa explica que aquí saldrán las demás', /varias cotorras/.test(root.textContent) && !root.querySelector('.rec-casa'));
        const ana = nuevoS('Ana Luna'), beto = nuevoS('Beto Mar'), tel = nuevoS('Cielo 787 555 0123');
        check('Anota la contrarreloj del río (mejor tiempo y mejor medalla) a nombre de la cotorra', anotar({ modo: 'rio', llego: true, ms: 64000, medalla: 'plata' }, ana) && anotar({ modo: 'rio', llego: true, ms: 70000, medalla: 'oro' }, ana) && (() => { const w = leerCasa().jugadores['Ana Luna'].rio; return w.mejor === 64000 && w.medalla === 'oro' && w.oros === 1 && w.jugadas === 2; })() && retosDe({ v: 1, rio: { mejor: 5000, medalla: 'madera' } }).rio.medalla === null);
        check('Anota una carrera a nombre de la cotorra', anotar({ modo: 'carrera', llego: true, puesto: 2, ms: 70100, rivales: ['oratrix', 'versicolor', 'albifrons'] }, ana) && leerCasa().jugadores['Ana Luna'].carrera.mejor === 70100);
        anotar({ modo: 'tormenta', sobrevivio: true, puntos: 900 }, ana);
        anotar({ modo: 'carrera', llego: true, puesto: 1, ms: 61000, rivales: [] }, beto);
        anotar({ modo: 'carrera', llego: true, puesto: 3, ms: 80000, rivales: [] }, beto);
        anotar({ modo: 'tormenta', sobrevivio: false, puntos: 400 }, beto);
        anotar({ modo: 'carrera', llego: true, puesto: 4, ms: 95000, rivales: [] }, tel);
        const libro = leerCasa(), cb = libro.jugadores['Beto Mar'], ca = libro.jugadores['Ana Luna'];
        check('La casa guarda el mejor de cada una (un tiempo peor no lo cambia)', cb.carrera.mejor === 61000 && cb.carrera.puesto === 1 && cb.carrera.oros === 1 && cb.carrera.jugadas === 2 && cb.tormenta.mejor === 400 && ca.tormenta.mejor === 900, JSON.stringify(cb.carrera));
        check('Un teléfono en el nombre no entra al libro y solo hay números y nombres', !Object.keys(libro.jugadores).some(n => /\d/.test(n)) && /^\{"v":1,"adoptado":(true|false),"vistas":\[[^\]]*\],"jugadores":\{[^]*\}\}$/.test(raw(pruebas.casa)) && !/[@]|http/.test(raw(pruebas.casa)), Object.keys(libro.jugadores).join(', '));
        check('Resultados de la prueba de Retos (prueba: true) no se anotan', anotar({ modo: 'carrera', llego: true, puesto: 1, ms: 1500, prueba: true }, ana) === false && leerCasa().jugadores['Ana Luna'].carrera.mejor === 70100);
        check('Las rivales y la especie propia quedan como vistas', ['oratrix', 'versicolor', 'albifrons'].every(id => libro.vistas.includes(id)), libro.vistas.join(','));
        simulada = { S: nuevoS('Ana Luna', { complete: false, step: 3 }) }; pintar();
        const filas = [...root.querySelectorAll('.rec-casa li')];
        check('Los récords de la casa muestran a cada cotorra, la más rápida primero y «tú» en la actual',
          filas.length === 3 && /Beto Mar/.test(filas[0].textContent) && /1:01\.0/.test(filas[0].textContent) && /Ana Luna/.test(filas[1].textContent) && /\(tú\)/.test(filas[1].textContent) && filas[1].hasAttribute('aria-current') && /1:10\.1/.test(filas[1].textContent),
          filas.map(f => f.textContent.replace(/\s+/g, ' ').slice(0, 40)).join(' | '));
        check('En el panel de Ana: «En camino · Paso 4 de…»', /En camino/.test(root.textContent) && /Paso 4/.test(root.textContent));
        // Adopta el récord que ya existía una sola vez, sin duplicar lo anotado
        quitar(); localStorage.setItem(pruebas.retos, JSON.stringify({ v: 1, carrera: { mejor: 65300, puesto: 1, oros: 2, jugadas: 5 }, tormenta: { mejor: 1620, tiempo: 90, jugadas: 3 } }));
        simulada = { S: sFin }; sincronizar();
        const adop = leerCasa();
        check('Adopta una sola vez los récords que ya había para la cotorra actual', adop.adoptado && adop.jugadores['Nube Azul'] && adop.jugadores['Nube Azul'].carrera.mejor === 65300 && adop.jugadores['Nube Azul'].tormenta.mejor === 1620 && adop.vistas.includes('oratrix'));
        localStorage.setItem(pruebas.retos, JSON.stringify({ v: 1, carrera: { mejor: 1000 + 59000, puesto: 1, oros: 9, jugadas: 9 }, tormenta: {} }));
        simulada = { S: nuevoS('Otra Cotorra') }; sincronizar();
        check('Después no se vuelve a adoptar para otra cotorra', !leerCasa().jugadores['Otra Cotorra']);
        simulada = { S: sFin };
        localStorage.setItem(pruebas.retos, JSON.stringify({ v: 1, carrera: { mejor: 65300, puesto: 1, oros: 2, jugadas: 5 }, tormenta: { mejor: 1620, tiempo: 90, jugadas: 3 } }));
        pintar();
        cerrarTodo();
        check('Cerrar oculta el panel y quita su pausa', !abierto && root.hidden && enPausa() === pausaAntes);
        // Esc cierra el panel y no llega al juego
        abrir({}); let llego = false; const sonda = () => { llego = true; }; window.addEventListener('keydown', sonda);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        window.removeEventListener('keydown', sonda);
        check('Esc cierra el panel sin pasar al juego', !abierto && !llego);
        // ---------- Puerta para adultos ----------
        let sec = [0.1, 0.9, 0.2, 0.7, 0.3, 0.5, 0.8, 0.4, 0.6, 0.15, 0.95], si = 0; const azar = () => sec[si++ % sec.length];
        abrir({}); let resP = null; puerta({ azar }).then(v => { resP = v; });
        await espera(() => puertaAbierta && suma() != null);
        const pu = $('rec-puerta'), ops = botonesPuerta();
        check('La puerta pide ayuda a un adulto con una suma de dos cifras y 3 opciones', !pu.hidden && /Pide ayuda a un adulto/.test(pu.textContent) && /^\d\d \+ \d\d = \?$/.test($('rp-q').textContent) && ops.length === 3 && new Set(ops.map(b => b.dataset.v)).size === 3 && ops.some(b => +b.dataset.v === suma()), $('rp-q').textContent);
        check('Las opciones de la puerta miden 44 px o más', ops.every(b => b.offsetHeight >= 44 && b.offsetWidth >= 44), ops.map(b => b.offsetHeight).join(','));
        const s1 = $('rp-q').textContent;
        botonesPuerta().find(b => +b.dataset.v !== suma()).click();
        check('Fallar muestra el aviso y cambia la suma sin abrir la puerta', !$('rp-err').hidden && $('rp-q').textContent !== s1 && resP === null && puertaAbierta);
        await acertar(); await espera(() => resP !== null);
        check('Acertar abre la puerta (true) y la cierra', resP === true && pu.hidden && !puertaAbierta);
        resP = null; puerta({ azar }).then(v => { resP = v; });
        for (let i = 0; i < 3; i++) { await espera(() => puertaAbierta && botonesPuerta().length === 3); const m = botonesPuerta().find(b => +b.dataset.v !== suma()); if (m) m.click(); }
        await espera(() => resP !== null);
        check('Tres fallos cierran la puerta (false)', resP === false && !puertaAbierta);
        resP = null; puerta({ azar }).then(v => { resP = v; }); await espera(() => puertaAbierta); $('rp-no').click(); await espera(() => resP !== null);
        check('«Ahora no» cierra la puerta (false)', resP === false);
        resP = null; puerta({ azar }).then(v => { resP = v; }); await espera(() => puertaAbierta);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); await espera(() => resP !== null);
        check('Esc cierra solo la puerta y deja el panel', resP === false && abierto);
        cerrarTodo();
        // ---------- Compartir con y sin navigator.share ----------
        const llamadas = [], descargas = [];
        const navOk = { share: async d => { llamadas.push(d); }, canShare: d => !!(d && d.files && d.files.length) };
        const descargarFalso = async (b, n) => { descargas.push({ b, n }); return 'descargado'; };
        const blobPNG = await pngPrueba();
        const lanzar = (fn, o) => { const p = fn(Object.assign({ azar, descargar: descargarFalso, registrar: false, preparar: () => blobPNG }, o)); return p; };
        let p = lanzar(compartirComic, { nav: navOk, movil: true }); await acertar(); let r = await p;
        check('Móvil con navigator.share: comparte el PNG del cómic (files) y no descarga', r === 'compartido' && llamadas.length === 1 && llamadas[0].files[0].type === 'image/png' && /\.png$/.test(llamadas[0].files[0].name) && llamadas[0].files[0].size === blobPNG.size && !descargas.length, llamadas[0] && llamadas[0].files[0].name);
        p = lanzar(compartirComic, { nav: navOk, movil: false }); await acertar(); r = await p;
        check('En la computadora descarga el PNG aunque haya navigator.share', r === 'descargado' && llamadas.length === 1 && descargas.length === 1 && descargas[0].b === blobPNG);
        p = lanzar(compartirComic, { nav: {}, movil: true }); await acertar(); r = await p;
        check('Sin navigator.share (móvil sin soporte) descarga el PNG', r === 'descargado' && descargas.length === 2);
        p = lanzar(compartirComic, { nav: { share: async () => { throw new Error('x'); }, canShare: () => false }, movil: true }); await acertar(); r = await p;
        check('Si canShare no permite archivos descarga el PNG', r === 'descargado' && descargas.length === 3);
        p = lanzar(compartirComic, { nav: { share: async () => { const e = new Error('cancelado'); e.name = 'AbortError'; throw e; }, canShare: () => true }, movil: true }); await acertar(); r = await p;
        check('Si el niño cierra el menú de compartir no se descarga nada', r === 'cancelado' && descargas.length === 3);
        p = lanzar(compartirComic, { nav: { share: async () => { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; }, canShare: () => true }, movil: true }); await acertar(); r = await p;
        check('Si el sistema no pudo compartir (error), descarga el PNG', r === 'descargado' && descargas.length === 4);
        // Sin pasar la puerta no se prepara nada que salga
        const n0 = llamadas.length + descargas.length; p = lanzar(compartirComic, { nav: navOk, movil: true }); await espera(() => puertaAbierta); $('rp-no').click(); r = await p;
        check('Sin pasar la puerta de adultos no se comparte ni se descarga', r === 'puerta' && llamadas.length + descargas.length === n0);
        // La descarga por defecto crea un enlace con blob: y lo pulsa (sin salir de la página)
        const clics = [], clicOrig = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () { clics.push({ href: this.href, download: this.download }); };
        try { const rd = await descargar(blobPNG, 'prueba.png'); check('Descarga por defecto: enlace blob: con el nombre del archivo', rd === 'descargado' && clics.length === 1 && /^blob:/.test(clics[0].href) && clics[0].download === 'prueba.png'); }
        finally { HTMLAnchorElement.prototype.click = clicOrig; }
        const guardados = []; const rv = await descargar(blobPNG, 'visor.png', { descargas: { save: async x => { guardados.push(x); } } });
        check('En el visor de Claude usa su capacidad «downloads»', rv === 'descargado' && guardados.length === 1 && guardados[0].filename === 'visor.png' && guardados[0].data === blobPNG);
        // ---------- Tarjeta del récord ----------
        const tj = await tarjetaPNG(leer()), vt = await G.comic.verificarPNG(tj, TARJETA.w, TARJETA.h);
        check('La tarjeta del récord es un PNG válido de 1080×1350', vt.ok, `${vt.ancho}×${vt.alto} · ${Math.round((vt.bytes || 0) / 1024)} KB`);
        const imT = await new Promise(res => { const u = URL.createObjectURL(tj), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => res(null); im.src = u; });
        const est = imT && G.comic.estadisticas(imT), estMedalla = imT && G.comic.estadisticas(imT, { x: 340, y: 390, w: 400, h: 400 }), estTiempo = imT && G.comic.estadisticas(imT, { x: 200, y: 850, w: 680, h: 160 });
        check('La tarjeta no está en blanco y la medalla y el tiempo se dibujan', !!est && est.desviacion > 20 && est.colores > 40 && estMedalla.desviacion > 15 && estTiempo.desviacion > 15, est ? `desv. ${est.desviacion.toFixed(0)} · ${est.colores} colores` : 'no carga');
        p = lanzar(compartirRecord, { nav: navOk, movil: true, preparar: undefined }); await acertar(); r = await p;
        check('«Compartir mi récord» pasa la puerta y comparte la tarjeta PNG', r === 'compartido' && llamadas.length === 2 && llamadas[1].files[0].name === 'amazona-verse-mi-record.png' && /1:05\.3/.test(llamadas[1].text), llamadas[1] && llamadas[1].text);
        localStorage.removeItem(pruebas.retos);
        r = await compartirRecord({ azar });
        check('Sin récord de carrera no hay nada que compartir (y no abre la puerta)', r === 'sin-record' && !puertaAbierta);
        // ---------- Ganchos en la página ----------
        disp = { tile: !!$('b-records'), portada: !!$('b-records-title'), share: !!$('c-share') };
        check('Los botones «Mis récords» (pausa y portada) y «Compartir» (cómic) están en la página', disp.tile && disp.portada && disp.share, JSON.stringify(disp));
        check('El cómic ofrece pngSinRegistro (el PNG de 1080×1520 sin avisos ni eventos)', typeof G.comic.pngSinRegistro === 'function');
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
      } finally {
        cerrarTodo();
        Object.assign(CLAVE, orig); simulada = null; quitar();
        G.guardado.suspender(false); G.quiet = quieta;
        if (G.aula && G.aula.aj && idiomaAntes) G.aula.aj.idioma = idiomaAntes;
        etiquetas();
      }
      const cambiadas = claves.filter((k, i) => raw(k) !== antes[i]);
      check('La partida (G.S), el cómic y los almacenes reales quedan intactos', !cambiadas.length && comparable() === sAntes, cambiadas.length ? 'cambió ' + cambiadas.join(', ') : comparable() === sAntes ? '' : 'G.S cambió');
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = { publicarRanking, abrirRank: () => rankAbierto, cerrarRank, aliasDe, ANIMALES, ADJETIVOS, abrir, cerrar, abierto: () => abierto, leer, sincronizar, anotar, puerta, compartirComic, compartirRecord, compartirArchivo, descargar, tarjetaPNG, etiquetas, test, CLAVE, reloj, _dev: { retosDe } };
    G.recordsApi = api;
    return api;
  };
})();
