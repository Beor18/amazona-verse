/* Juego · V18.1 · nuevas cotorras para la bandada (Kelvin 5-nov: «las especies deben descubrirse y desbloquearse
   progresivamente; no entregar las 36 desde el inicio»). Ocho más, cada una con su poder de V18_MATRIZ_36.md:
     ganar el primer duelo            → amazona de pico negro (agilis)        · Quiebro (ALAS)
     reparar el puente colgante       → loro corona azul (farinosa)           · Ala fuerte (ALAS)
     dispersar la Sombra de Tormenta  → cotorra cabeciamarilla (barbadensis)  · Lluvia de semillas (PICO)
     ganar el duelo con otra cotorra  → loro yucateco (xantholora)            · Ojo del cenote (OJOS)
     deshacer la Serpiente de la Maraña → loro de San Vicente (guildingii)    · Abanico de colores (PLUMAS)
     despertar al Sapo Encantado      → loro diadema (diadema)                · Semilla de río (PICO)
     primera medalla de oro en el minigolf → loro de Santa Lucía (versicolor) · Mirada del Pitón (OJOS)
     ganar 3 duelos en total          → amazona de pico amarillo (collaria)   · Ojo de sol (OJOS)
   Cuatro de coste M (V18_MATRIZ_36.md #3, #18, #31, #25), con hitos que ya existen:
     completar por primera vez el hoyo del minigolf → loro cubano (leucocephala) · Capa de palma (PLUMAS)
     ganar un duelo sin perder ninguna pluma         → loro frente blanca (albifrons) · Pluma rebote (PLUMAS)
     reparar el puente Y deshacer la Serpiente       → loro de cejas rojas (rhodocorytha) · Hojas que envuelven (PLUMAS)
     recoger las 2 piedras y las 2 fibras (reparar.js) → loro de Kawall (kawalli) · Ojo de selva (OJOS)
   Llegan solas al cumplir el hito (aviso y a «Mis cotorras»); en partidas viejas que ya lo cumplían, sin aviso.
   Tres más (KIMI-149, provisional hasta que Kelvin decida el hito: se consiguen descubriéndolas en el Álbum del Diario):
     descubrir en el Álbum → papagayo de cara roja (brasiliensis) · Ojo de manglar (OJOS)
     descubrir en el Álbum → loro de nuca amarilla (auropalliata) · Voz de volcán (PICO)
     descubrir en el Álbum → loro de las Tres Marías (tresmariae) · Viento de islas (ALAS)
   Tres más (KIMI-148, provisional igual: Álbum del Diario):
     descubrir en el Álbum → loro de cachetes azules (dufresniana) · Gota de lluvia (PLUMAS)
     descubrir en el Álbum → loro tamaulipeco (viridigenalis) · Chillido de bandada (PICO)
     descubrir en el Álbum → loro corona lila (finschi) · Ráfaga (ALAS)
   Tres más (KIMI-156, provisional igual: Álbum del Diario):
     descubrir en el Álbum → cotorra de La Española (ventralis) · Eco de la Cordillera (PICO)
     descubrir en el Álbum → loro de lomo rojo (festiva) · A ras del agua (ALAS)
     descubrir en el Álbum → loro real amazónico (ochrocephala) · Canto real (PICO)
   Cuatro más (KIMI-159, provisional igual: Álbum del Diario; las últimas de coste M sin dueño):
     descubrir en el Álbum → loro imperial (imperialis) · Columna de nube (ALAS)
     descubrir en el Álbum → loro de lores rojas (lilacina) · Plumas de manglar (PLUMAS)
     descubrir en el Álbum → loro mercenario (mercenarius) · Vuelo de niebla (ALAS)
     descubrir en el Álbum → loro de anteojos rojos (pretrei) · Vuelta de pino (ALAS)
   Tres más (KIMI-158, coste M, provisional igual: Álbum del Diario):
     descubrir en el Álbum → loro de cachetes amarillos (autumnalis) · Remolino (ALAS)
     descubrir en el Álbum → loro alisero (tucumana) · Plumas de aliso (PLUMAS)
     descubrir en el Álbum → loro vináceo (vinacea) · Semilla de piña (PICO)
   Una más (KIMI-160, la única de coste A, provisional igual: Álbum del Diario):
     descubrir en el Álbum → loro cabeza amarilla (oratrix) · Imitación (PICO)
   Solo cambia el poder del duelo y de la amenaza: el personaje del jugador se queda igual. Mara y Vela (martinicana,
   violacea) son consejeras en la temporada 1 y no entran aquí. Solo con la bandera V18.
   Prueba: AV.v18NuevasTest() (hitos, el desbloqueo por Álbum y los 25 poderes en el duelo). */
window.AVV18Nuevas = function (G) {
  'use strict';
  if (G.v18nuevas) return G.v18nuevas;
  const V = G.v18, H = G.v18hab, S = G.S;
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 5200); } catch (e) { /* sin interfaz */ } };
  const rango = e => Math.max(0, V.ESTADOS.indexOf(e || 'no_descubierta'));
  // Duelos ganados contra la rival (no cuenta el de 2 jugadores). Partidas viejas con la primera victoria ya pagada empiezan en 1.
  const duelosGanados = () => Number(V.mundo('duelos_ganados')) || (V.cuantos('victoria_duelo') > 0 ? 1 : 0);
  const RECOGIBLES = ['piedra_1', 'piedra_2', 'fibra_1', 'fibra_2']; // claves de G.v18.mundo que pone reparar.js al recogerlos
  const HITOS = [
    { id: 'agilis', cuando: () => V.cuantos('victoria_duelo') > 0,
      txt: '¡Una amazona de pico negro vio tu duelo y quiere volar contigo! Su poder: Quiebro.' },
    { id: 'farinosa', m: true, cuando: () => V.mundo('puente_villa') === 'reparado',
      txt: '¡Un loro corona azul cruzó tu puente y se une a tu bandada! Su poder: Ala fuerte.' },
    { id: 'barbadensis', cuando: () => V.mundo('sombra_tormenta') === 'dispersa',
      txt: '¡Con el cielo despejado llegó una cotorra cabeciamarilla! Su poder: Lluvia de semillas.' },
    { id: 'xantholora', m: true, cuando: () => V.cuantos('victoria_otra') > 0,
      txt: '¡Un loro yucateco vio cómo ganabas con otra cotorra! Su poder: Ojo del cenote.' },
    { id: 'guildingii', m: true, cuando: () => V.mundo('serpiente_marana') === 'deshecha',
      txt: '¡Sin la Maraña, un loro de San Vicente vino a lucir sus colores! Su poder: Abanico de colores.' },
    { id: 'diadema', m: true, cuando: () => V.mundo('sapo_encantado') === 'despierto',
      txt: '¡El Sapo despertó y un loro diadema vino a ver qué pasaba! Su poder: Semilla de río.' },
    { id: 'versicolor', m: true, cuando: () => V.otorgado('minigolf_villa_oro') || ((V.mundo('minigolf_villa') || {}).medalla === 'oro'),
      txt: '¡Un loro de Santa Lucía vio tu hoyo de oro y quiere volar contigo! Su poder: Mirada del Pitón.' },
    { id: 'collaria', cuando: () => duelosGanados() >= 3,
      txt: '¡Una amazona de pico amarillo vio tus 3 duelos ganados y se une a tu bandada! Su poder: Ojo de sol.' },
    { id: 'leucocephala', m: true, cuando: () => V.otorgado('minigolf_villa_completo'),
      txt: '¡Un loro cubano vio tu primer hoyo de minigolf y quiere volar contigo! Su poder: Capa de palma.' },
    { id: 'albifrons', m: true, cuando: () => V.cuantos('victoria_perfecta') > 0,
      txt: '¡Un loro frente blanca vio que ganaste sin perder ni una pluma! Su poder: Pluma rebote.' },
    { id: 'rhodocorytha', m: true, cuando: () => V.mundo('puente_villa') === 'reparado' && V.mundo('serpiente_marana') === 'deshecha',
      txt: '¡Con el puente arreglado y sin la Maraña, un loro de cejas rojas llegó al bosque! Su poder: Hojas que envuelven.' },
    { id: 'kawalli', m: true, cuando: () => RECOGIBLES.every(k => V.mundo(k) === 'recogida'),
      txt: '¡Un loro de Kawall te vio recoger todas las piedras y fibras y quiere volar contigo! Su poder: Ojo de selva.' }
  ];
  const TXT = { elige: 'Elígela en Pausa → Mis cotorras.', eligeM: 'Elígelo en Pausa → Mis cotorras.' }; // m: el aviso habla de «un loro»
  // KIMI-149/148/156/158/159/160 (provisional, hasta que Kelvin decida el hito): estas 17 llegan al descubrir su tarjeta en el Álbum del Diario.
  const ALBUM = [
    { id: 'brasiliensis', txt: '¡Descubriste al papagayo de cara roja en el Álbum! Su poder: Ojo de manglar.' },
    { id: 'auropalliata', txt: '¡Descubriste al loro de nuca amarilla en el Álbum! Su poder: Voz de volcán.' },
    { id: 'tresmariae', txt: '¡Descubriste al loro de las Tres Marías en el Álbum! Su poder: Viento de islas.' },
    { id: 'dufresniana', txt: '¡Descubriste al loro de cachetes azules en el Álbum! Su poder: Gota de lluvia.' },
    { id: 'viridigenalis', txt: '¡Descubriste al loro tamaulipeco en el Álbum! Su poder: Chillido de bandada.' },
    { id: 'finschi', txt: '¡Descubriste al loro corona lila en el Álbum! Su poder: Ráfaga.' },
    { id: 'ventralis', f: true, txt: '¡Descubriste a la cotorra de La Española en el Álbum! Su poder: Eco de la Cordillera.' },
    { id: 'festiva', txt: '¡Descubriste al loro de lomo rojo en el Álbum! Su poder: A ras del agua.' },
    { id: 'ochrocephala', txt: '¡Descubriste al loro real amazónico en el Álbum! Su poder: Canto real.' },
    { id: 'autumnalis', txt: '¡Descubriste al loro de cachetes amarillos en el Álbum! Su poder: Remolino.' },
    { id: 'tucumana', txt: '¡Descubriste al loro alisero en el Álbum! Su poder: Plumas de aliso.' },
    { id: 'vinacea', txt: '¡Descubriste al loro vináceo en el Álbum! Su poder: Semilla de piña.' },
    { id: 'imperialis', txt: '¡Descubriste al loro imperial en el Álbum! Su poder: Columna de nube.' },
    { id: 'lilacina', txt: '¡Descubriste al loro de lores rojas en el Álbum! Su poder: Plumas de manglar.' },
    { id: 'mercenarius', txt: '¡Descubriste al loro mercenario en el Álbum! Su poder: Vuelo de niebla.' },
    { id: 'pretrei', txt: '¡Descubriste al loro de anteojos rojos en el Álbum! Su poder: Vuelta de pino.' },
    { id: 'oratrix', txt: '¡Descubriste al loro cabeza amarilla en el Álbum! Su poder: Imitación.' },
    { id: 'guatemalae', txt: '¡Descubriste al loro harinoso del norte en el Álbum! Su poder: Vista de cumbre.' },
    { id: 'amazonica', txt: '¡Descubriste al loro guaro en el Álbum! Su poder: Ojo de bandada.' },
    { id: 'aestiva', txt: '¡Descubriste al loro hablador en el Álbum! Su poder: Cuento.' }
  ];
  // La tarjeta acaba de abrirse (evento del Álbum): desbloqueo inmediato con aviso
  function albumLlega(id, avisar) {
    const a = ALBUM.find(x => x.id === id);
    if (!a || rango(V.estado(id)) >= rango('seleccionable')) return false;
    V.descubrir(id); V.desbloquear(id);
    if (avisar !== false) toast(a.txt + ' ' + (a.f ? TXT.elige : TXT.eligeM)); // f: especie femenina («cotorra»)
    return true;
  }
  // Partidas viejas con la tarjeta ya abierta: quedan elegibles al cargar, sin aviso
  function revisarAlbum() {
    const nuevas = [];
    for (const a of ALBUM) {
      if (rango(V.estado(a.id)) >= rango('seleccionable')) continue;
      if (!(G.album && G.album.visto && G.album.visto(a.id))) continue;
      if (albumLlega(a.id, false)) nuevas.push(a.id);
    }
    return nuevas;
  }
  // Las que faltan y cómo llegan, con el mismo aviso que sale al conseguirlas (menú de inicio → Mis cotorras, menu_modos.js)
  function pendientes() {
    return HITOS.concat(ALBUM).filter(h => rango(V.estado(h.id)) < rango('seleccionable'))
      .map(h => ({ id: h.id, txt: h.txt, aviso: h.txt + ' ' + ((ALBUM.includes(h) ? !h.f : h.m) ? TXT.eligeM : TXT.elige), album: ALBUM.includes(h) }));
  }
  G.on('album', ev => { if (ev && ev.id) albumLlega(ev.id); }); // el Álbum emite al abrir cada tarjeta (album.js)
  function revisar(avisar) {
    const nuevas = [];
    for (const h of HITOS) {
      if (!h.cuando() || rango(V.estado(h.id)) >= rango('seleccionable')) continue;
      V.descubrir(h.id); V.desbloquear(h.id); nuevas.push(h.id);
      if (avisar) { const t = h.txt + ' ' + (h.m ? TXT.eligeM : TXT.elige), k = nuevas.length - 1; if (k) setTimeout(() => toast(t), k * 5400); else toast(t); } // en cola: no se pisan
    }
    return nuevas;
  }
  // Ganar el duelo con una cotorra que no es Vittata: su propia marca, idempotente
  G.on('v18combate', ev => {
    if (!ev || ev.tipo !== 'win' || ev.de !== 'jugador' || ev.duelo) return;
    V.cambiarMundo('duelos_ganados', duelosGanados() + 1); // el evento llega antes de que combate.js pague la primera
    const C = G.v18combate && G.v18combate.estado(), sp = C && C.j && C.j.especie;
    if (sp && sp !== 'vittata') V.otorgar('combate_otra', 'victoria_otra', 1);
    if (Number(ev.valor) >= ((C && C.j && C.j.plumasMax) || 5)) V.otorgar('combate_perfecto', 'victoria_perfecta', 1); // ganar sin perder ninguna pluma (valor = plumas que te quedan)
    setTimeout(() => revisar(true), 3600); // después del aviso de victoria (antes lo tapaba al instante)
  });
  G.on('v18', ev => { if (ev && (ev.tipo === 'mundo' || ev.tipo === 'recompensa')) setTimeout(() => revisar(true), 4200); }); // tras «¡Puente reparado!» y el premio de la Sombra
  G.on('v18minigolf', ev => { if (ev && ev.tipo === 'nido' && ev.medalla === 'oro') setTimeout(() => revisar(true), 5200); }); // tras el aviso del premio de oro
  G.on('apply', () => setTimeout(() => { revisar(false); revisarAlbum(); }, 0), 97);
  setTimeout(() => { revisar(false); revisarAlbum(); }, 0);

  // =====================================================================================================================
  function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = t => { toasts.push(String(t)); };
    const B = G.v18combate, pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, inv0 = Object.assign({}, S.inv || {});
    const susp = G.guardado.suspender; if (susp) susp(true);
    try {
      V.borrar(); V.recargar();
      const ids = HITOS.map(h => h.id);
      check('Al empezar, las ' + ids.length + ' nuevas no están (no se dan las 36 de golpe)', ids.every(id => rango(V.estado(id)) < rango('descubierta')));
      V.otorgar('combate_1', 'victoria_duelo', 1); revisar(true);
      check('Ganar el primer duelo trae la amazona de pico negro (Quiebro), con aviso', rango(V.estado('agilis')) >= rango('seleccionable') && toasts.some(t => /pico negro/.test(t)) && rango(V.estado('farinosa')) < 1);
      V.cambiarMundo('puente_villa', 'reparado'); revisar(true);
      check('Reparar el puente trae el loro corona azul (Ala fuerte)', rango(V.estado('farinosa')) >= rango('seleccionable'));
      V.cambiarMundo('sombra_tormenta', 'dispersa'); revisar(true);
      check('Dispersar la Sombra trae la cotorra cabeciamarilla (Lluvia de semillas)', rango(V.estado('barbadensis')) >= rango('seleccionable'));
      V.otorgar('combate_otra', 'victoria_otra', 1); revisar(true);
      check('Ganar con otra cotorra trae el loro yucateco (Ojo del cenote)', rango(V.estado('xantholora')) >= rango('seleccionable'));
      check('...y las otras dos aún no (cada una espera su hito)', rango(V.estado('guildingii')) < 1 && rango(V.estado('diadema')) < 1);
      V.cambiarMundo('serpiente_marana', 'deshecha'); revisar(true);
      check('Deshacer la Serpiente de la Maraña trae el loro de San Vicente (Abanico de colores), con aviso', rango(V.estado('guildingii')) >= rango('seleccionable') && toasts.some(t => /San Vicente/.test(t) && /Mis cotorras/.test(t)) && rango(V.estado('diadema')) < 1);
      V.cambiarMundo('sapo_encantado', 'despierto'); revisar(true);
      check('Despertar al Sapo Encantado trae el loro diadema (Semilla de río), con aviso', rango(V.estado('diadema')) >= rango('seleccionable') && toasts.some(t => /loro diadema/.test(t)));
      check('...y las de Santa Lucía y pico amarillo aún no (oro del minigolf; 3 duelos ganados)', rango(V.estado('versicolor')) < 1 && rango(V.estado('collaria')) < 1 && duelosGanados() === 1, 'duelos ' + duelosGanados());
      V.otorgar('minigolf_villa_oro', 'minigolf_oro', 1); revisar(true);
      check('La primera medalla de oro del minigolf trae el loro de Santa Lucía (Mirada del Pitón), con aviso', rango(V.estado('versicolor')) >= rango('seleccionable') &&
        toasts.some(t => /Santa Lucía/.test(t) && /Mirada del Pitón/.test(t) && /Mis cotorras/.test(t)) && rango(V.estado('collaria')) < 1);
      const B0 = G.v18combate; G.v18combate = null; // el oyente de victorias no mira el duelo real
      try {
        G.emit('v18combate', { tipo: 'win', de: 'j1', duelo: 2 }); G.emit('v18combate', { tipo: 'win', de: 'jugador', duelo: 2 }); G.emit('v18combate', { tipo: 'loss', de: 'rival' });
        const d1 = duelosGanados(); G.emit('v18combate', { tipo: 'win', de: 'jugador' }); revisar(true); const d2 = duelosGanados(), aun = rango(V.estado('collaria')) < 1;
        G.emit('v18combate', { tipo: 'win', de: 'jugador' }); revisar(true);
        check('Cada victoria contra la rival cuenta (no el duelo de 2 ni las derrotas); a los 3 duelos ganados llega la amazona de pico amarillo (Ojo de sol), con aviso',
          d1 === 1 && d2 === 2 && aun && duelosGanados() === 3 && rango(V.estado('collaria')) >= rango('seleccionable') && toasts.some(t => /pico amarillo/.test(t) && /Ojo de sol/.test(t)),
          'duelos ' + d1 + '→' + d2 + '→' + duelosGanados());
      } finally { G.v18combate = B0; }
      check('Cada una tiene su poder propio', H.poderDe('agilis') === 'quiebro' && H.poderDe('farinosa') === 'ala_fuerte' && H.poderDe('barbadensis') === 'lluvia_semillas' && H.poderDe('xantholora') === 'ojo_cenote' &&
        H.poderDe('guildingii') === 'abanico_colores' && H.poderDe('diadema') === 'semilla_rio' && H.poderDe('versicolor') === 'mirada_piton' && H.poderDe('collaria') === 'ojo_sol' &&
        H.poderDe('brasiliensis') === 'ojo_manglar' && H.poderDe('auropalliata') === 'voz_volcan' && H.poderDe('tresmariae') === 'viento_islas',
        ids.map(H.poderDe).join(','));
      check('No avisa dos veces la misma', revisar(true).length === 0);
      check('Mara y Vela no se pueden elegir (consejeras en la temporada 1)', rango(V.estado('martinicana')) < 1 && rango(V.estado('violacea')) < 1);
      // KIMI-149/KIMI-148: las tandas A y B se consiguen descubriéndolas en el Álbum (provisional hasta que Kelvin decida el hito)
      const ALBUM6 = ['brasiliensis', 'auropalliata', 'tresmariae', 'dufresniana', 'viridigenalis', 'finschi'];
      check('Las de tanda A y B (Álbum) empiezan sin descubrir', ALBUM6.every(id => rango(V.estado(id)) < rango('descubierta')));
      G.emit('album', { id: 'auropalliata', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro de nuca amarilla (Voz de volcán), con aviso',
        rango(V.estado('auropalliata')) >= rango('seleccionable') && toasts.some(t => /nuca amarilla/.test(t) && /Voz de volcán/.test(t) && /Mis cotorras/.test(t)));
      G.emit('album', { id: 'auropalliata', fuente: 'test' });
      check('El mismo descubrimiento no avisa dos veces', toasts.filter(t => /nuca amarilla/.test(t)).length === 1);
      G.emit('album', { id: 'finschi', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro corona lila (Ráfaga), con aviso',
        rango(V.estado('finschi')) >= rango('seleccionable') && toasts.some(t => /corona lila/.test(t) && /Ráfaga/.test(t) && /Mis cotorras/.test(t)));
      G.emit('album', { id: 'finschi', fuente: 'test' });
      check('El mismo descubrimiento no avisa dos veces (tanda A)', toasts.filter(t => /corona lila/.test(t)).length === 1);
      revisarAlbum(); // partidas viejas: tarjetas ya abiertas en el Álbum, sin aviso
      check('revisarAlbum no desbloquea tarjetas que aún no están abiertas en el Álbum',
        ['brasiliensis', 'tresmariae', 'dufresniana', 'viridigenalis'].every(id => rango(V.estado(id)) < 1));
      check('Las de tanda A tienen su poder propio', H.poderDe('dufresniana') === 'gota_lluvia' && H.poderDe('viridigenalis') === 'chillido_bandada' && H.poderDe('finschi') === 'rafaga',
        [H.poderDe('dufresniana'), H.poderDe('viridigenalis'), H.poderDe('finschi')].join(','));
      // KIMI-156: la tanda C se consigue igual (Álbum), con Elígela para la especie femenina (cotorra)
      const ALBUM3 = ['ventralis', 'festiva', 'ochrocephala'];
      check('Las de tanda C (Álbum) empiezan sin descubrir', ALBUM3.every(id => rango(V.estado(id)) < rango('descubierta')));
      G.emit('album', { id: 'ventralis', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible a la cotorra de La Española (Eco de la Cordillera), con aviso',
        rango(V.estado('ventralis')) >= rango('seleccionable') && toasts.some(t => /La Española/.test(t) && /Eco de la Cordillera/.test(t) && /Mis cotorras/.test(t)));
      G.emit('album', { id: 'ventralis', fuente: 'test' });
      check('El mismo descubrimiento no avisa dos veces (tanda C)', toasts.filter(t => /La Española/.test(t)).length === 1);
      check('Las 3 de tanda C tienen su poder propio', H.poderDe('ventralis') === 'eco_cordillera' && H.poderDe('festiva') === 'rasante' && H.poderDe('ochrocephala') === 'canto_real',
        ALBUM3.map(H.poderDe).join(','));
      revisarAlbum();
      check('revisarAlbum no desbloquea las tarjetas de tanda C que aún no están abiertas en el Álbum',
        ['festiva', 'ochrocephala'].every(id => rango(V.estado(id)) < 1));

      // KIMI-158: la tanda D (coste M) se consigue igual (Álbum del Diario, provisional)
      const ALBUMD = ['autumnalis', 'tucumana', 'vinacea'];
      check('Las de tanda D (Álbum, coste M) empiezan sin descubrir', ALBUMD.every(id => rango(V.estado(id)) < rango('descubierta')));
      G.emit('album', { id: 'autumnalis', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro de cachetes amarillos (Remolino), con aviso',
        rango(V.estado('autumnalis')) >= rango('seleccionable') && toasts.some(t => /cachetes amarillos/.test(t) && /Remolino/.test(t) && /Mis cotorras/.test(t)));
      G.emit('album', { id: 'autumnalis', fuente: 'test' });
      check('El mismo descubrimiento no avisa dos veces (tanda D)', toasts.filter(t => /cachetes amarillos/.test(t)).length === 1);
      check('Las 3 de tanda D tienen su poder propio', H.poderDe('autumnalis') === 'remolino' && H.poderDe('tucumana') === 'plumas_aliso' && H.poderDe('vinacea') === 'semilla_pina',
        ALBUMD.map(H.poderDe).join(','));
      revisarAlbum();
      check('revisarAlbum no desbloquea las tarjetas de tanda D que aún no están abiertas en el Álbum',
        ['tucumana', 'vinacea'].every(id => rango(V.estado(id)) < 1));
      // KIMI-159: la tanda E (#8, #22, #23, #34, las últimas de coste M) se consigue igual (Álbum del Diario, provisional)
      const ALBUME = ['imperialis', 'lilacina', 'mercenarius', 'pretrei'];
      check('Las de tanda E (Álbum, coste M) empiezan sin descubrir', ALBUME.every(id => rango(V.estado(id)) < rango('descubierta')));
      G.emit('album', { id: 'imperialis', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro imperial (Columna de nube), con aviso',
        rango(V.estado('imperialis')) >= rango('seleccionable') && toasts.some(t => /loro imperial/.test(t) && /Columna de nube/.test(t) && /Mis cotorras/.test(t)));
      G.emit('album', { id: 'imperialis', fuente: 'test' });
      check('El mismo descubrimiento no avisa dos veces (tanda E)', toasts.filter(t => /loro imperial/.test(t)).length === 1);
      check('Las 4 de tanda E tienen su poder propio', H.poderDe('imperialis') === 'columna_nube' && H.poderDe('lilacina') === 'plumas_manglar' &&
        H.poderDe('mercenarius') === 'vuelo_niebla' && H.poderDe('pretrei') === 'vuelta_pino', ALBUME.map(H.poderDe).join(','));
      revisarAlbum();
      check('revisarAlbum no desbloquea las tarjetas de tanda E que aún no están abiertas en el Álbum',
        ['lilacina', 'mercenarius', 'pretrei'].every(id => rango(V.estado(id)) < 1));
      // KIMI-160: la Imitación (oratrix, la única de coste A) se consigue igual (Álbum del Diario, provisional)
      check('La de coste A (oratrix, Imitación) empieza sin descubrir', rango(V.estado('oratrix')) < rango('descubierta'));
      G.emit('album', { id: 'oratrix', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro cabeza amarilla (Imitación), con aviso',
        rango(V.estado('oratrix')) >= rango('seleccionable') && toasts.some(t => /cabeza amarilla/.test(t) && /Imitación/.test(t) && /Mis cotorras/.test(t)));
      G.emit('album', { id: 'oratrix', fuente: 'test' });
      check('El mismo descubrimiento no avisa dos veces (Imitación)', toasts.filter(t => /cabeza amarilla/.test(t)).length === 1);
      check('La de coste A tiene su poder propio', H.poderDe('oratrix') === 'imitacion', H.poderDe('oratrix'));
      // La #20 Vista de cumbre (guatemalae, Álbum del Diario, provisional): completa la matriz salvo #30/#36 (necesitan IA expuesta)
      check('La Vista de cumbre (guatemalae) empieza sin descubrir', rango(V.estado('guatemalae')) < rango('descubierta'));
      G.emit('album', { id: 'guatemalae', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro harinoso del norte (Vista de cumbre), con aviso',
        rango(V.estado('guatemalae')) >= rango('seleccionable') && toasts.some(t => /harinoso del norte/.test(t) && /Vista de cumbre/.test(t) && /Mis cotorras/.test(t)));
      G.emit('album', { id: 'guatemalae', fuente: 'test' });
      check('El mismo descubrimiento no avisa dos veces (Vista de cumbre)', toasts.filter(t => /harinoso del norte/.test(t)).length === 1);
      check('La Vista de cumbre tiene su poder propio', H.poderDe('guatemalae') === 'vista_cumbre', H.poderDe('guatemalae'));
      // Las 2 últimas implementables (KIMI-163): #30 Ojo de bandada (amazonica) y #36 Cuento (aestiva), Álbum del Diario
      check('El Ojo de bandada (amazonica) empieza sin descubrir', rango(V.estado('amazonica')) < rango('descubierta'));
      G.emit('album', { id: 'amazonica', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro guaro (Ojo de bandada), con aviso',
        rango(V.estado('amazonica')) >= rango('seleccionable') && toasts.some(t => /guaro/.test(t) && /Ojo de bandada/.test(t) && /Mis cotorras/.test(t)));
      check('El Ojo de bandada tiene su poder propio', H.poderDe('amazonica') === 'ojo_bandada', H.poderDe('amazonica'));
      check('El Cuento (aestiva) empieza sin descubrir', rango(V.estado('aestiva')) < rango('descubierta'));
      G.emit('album', { id: 'aestiva', fuente: 'test' });
      check('Descubrir su tarjeta en el Álbum deja elegible al loro hablador (Cuento), con aviso',
        rango(V.estado('aestiva')) >= rango('seleccionable') && toasts.some(t => /hablador/.test(t) && /Cuento/.test(t) && /Mis cotorras/.test(t)));
      check('El Cuento tiene su poder propio', H.poderDe('aestiva') === 'cuento', H.poderDe('aestiva'));

      // ---- Las 4 de coste M: cada una con su hito, desde una partida nueva ----
      V.borrar(); V.recargar(); toasts.length = 0;
      const M4 = ['leucocephala', 'albifrons', 'rhodocorytha', 'kawalli'], esta = id => rango(V.estado(id)) >= rango('seleccionable'), ninguna = l => l.every(id => rango(V.estado(id)) < 1);
      check('Al empezar no están el loro cubano, el frente blanca, el de cejas rojas ni el de Kawall', ninguna(M4));
      V.otorgar('minigolf_villa_completo', 'minigolf_completo', 1); revisar(true);
      check('Completar el hoyo del minigolf la primera vez trae el loro cubano (Capa de palma), con aviso', esta('leucocephala') && ninguna(M4.slice(1)) &&
        toasts.some(t => /loro cubano/.test(t) && /Capa de palma/.test(t) && /Elígelo en Pausa → Mis cotorras/.test(t)));
      const B1 = G.v18combate; G.v18combate = null;
      try {
        G.emit('v18combate', { tipo: 'win', de: 'jugador', valor: 4 }); revisar(true); const conPerdida = esta('albifrons');
        G.emit('v18combate', { tipo: 'loss', de: 'rival', valor: 5 }); G.emit('v18combate', { tipo: 'win', de: 'j1', duelo: 2, valor: 5 }); revisar(true); const otras = esta('albifrons');
        G.emit('v18combate', { tipo: 'win', de: 'jugador', valor: 5 }); revisar(true);
        check('Ganar un duelo sin perder ninguna pluma trae el loro frente blanca (Pluma rebote); ganar perdiendo una, perder o el duelo de 2, no',
          !conPerdida && !otras && esta('albifrons') && toasts.some(t => /loro frente blanca/.test(t) && /Pluma rebote/.test(t) && /Mis cotorras/.test(t)), 'con pérdida ' + conPerdida + ', otras ' + otras);
      } finally { G.v18combate = B1; }
      V.cambiarMundo('puente_villa', 'reparado'); revisar(true); const soloPuente = esta('rhodocorytha');
      V.descubrir('guildingii'); V.desbloquear('guildingii'); // la de San Vicente ya probada arriba: así el aviso de esta no espera en la cola
      V.cambiarMundo('serpiente_marana', 'deshecha'); revisar(true);
      check('Reparar el puente y deshacer la Serpiente trae el loro de cejas rojas (Hojas que envuelven); solo el puente, no', !soloPuente && esta('rhodocorytha') &&
        toasts.some(t => /cejas rojas/.test(t) && /Hojas que envuelven/.test(t) && /Mis cotorras/.test(t)));
      for (const k of ['piedra_1', 'piedra_2', 'fibra_1']) V.cambiarMundo(k, 'recogida');
      revisar(true); const tres = esta('kawalli'); V.cambiarMundo('fibra_2', 'recogida'); revisar(true);
      check('Recoger las 2 piedras y las 2 fibras trae el loro de Kawall (Ojo de selva); con 3, aún no', !tres && esta('kawalli') &&
        toasts.some(t => /loro de Kawall/.test(t) && /Ojo de selva/.test(t) && /Mis cotorras/.test(t)));
      check('Las 4 tienen su poder propio', H.poderDe('leucocephala') === 'capa_palma' && H.poderDe('albifrons') === 'pluma_rebote' && H.poderDe('rhodocorytha') === 'hojas_envuelven' && H.poderDe('kawalli') === 'ojo_selva',
        M4.map(H.poderDe).join(','));
      check('...y no se avisan dos veces', revisar(true).length === 0);

      // ---- Los 8 poderes en el duelo, a paso fijo ----
      if (B && B.iniciar) {
        const C = B.estado(), corre = s => { for (let t = 0; t < s; t += 1 / 30) B.paso(1 / 30); };
        const quieta = dx => { C.r.pos.x = S.pos.x + dx; C.r.pos.z = S.pos.z; C.r.pos.y = G.terreno.height(C.r.pos.x, C.r.pos.z); /* la altura de donde se pone, no la de antes: la semilla apunta a esa altura */ C.r.pensar = 99; C.r.esquivaT = 99; C.r.poderT = 99; C.r.golpeT = 99; C.r.tiroT = 99; C.r.mov.t = 0; C.r.kb.t = 0; };
        const listo = () => { C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.mareo = 0; C.r.inv = 0; C.r.escudo = 0; C.r.marcada = 0; C.j.remolino = 0; C.r.remolino = 0; C.j.drena = 0; C.r.drena = 0; };
        S.facing = { x: 1, z: 0 };
        // Quiebro
        B.iniciar({ sinCuenta: true, especie: 'agilis' }); quieta(6); listo();
        const z0 = S.pos.z, rq = B.usar(C.j, 'quiebro'); corre(0.3);
        const lado = Math.abs(S.pos.z - z0);
        C.r.golpeT = 99; const pl0 = C.j.plumas; quieta(1.5);
        B.usar(C.r, 'golpe_ala');
        check('Quiebro: esquiva de lado y un momento sin que te den', rq.ok && lado > 1.2 && C.j.plumas === pl0, 'lado ' + lado.toFixed(2) + ' m, plumas ' + pl0 + '→' + C.j.plumas);
        B.salir();
        // Lluvia de semillas
        B.iniciar({ sinCuenta: true, especie: 'barbadensis' }); quieta(6); listo();
        const balas0 = C.balas.length, pr0 = C.r.plumas, rl = B.usar(C.j, 'lluvia_semillas'), n3 = C.balas.length - balas0; corre(0.8);
        check('Lluvia de semillas: 3 semillas en abanico; dan 1 pluma (no 3)', rl.ok && n3 === 3 && C.r.plumas === pr0 - 1, 'semillas ' + n3 + ', plumas ' + pr0 + '→' + C.r.plumas);
        B.salir();
        // Ojo del cenote: una semilla torcida busca a la marcada
        B.iniciar({ sinCuenta: true, especie: 'xantholora' }); quieta(8); listo();
        const ro = B.usar(C.j, 'ojo_cenote');
        check('Ojo del cenote: marca a la rival 4 s', ro.ok && C.r.marcada > 3.5);
        // la rival se aparta de lado mientras la semilla vuela: sin la marca falla; con la marca la semilla la sigue y le da
        const seAparta = marca => { C.j.cd = {}; C.j.energia = 100; C.r.inv = 0; quieta(8); C.r.marcada = marca; const p0 = C.r.plumas; B.usar(C.j, 'semilla'); C.r.mov.x = 0; C.r.mov.z = 9; C.r.mov.t = 0.6; corre(1.2); return p0 - C.r.plumas; };
        const conMarca = seAparta(4), sinMarca = seAparta(0);
        check('...y si se aparta de lado, la semilla la sigue y le da (sin la marca, falla)', conMarca === 1 && sinMarca === 0, 'con marca ' + conMarca + ', sin marca ' + sinMarca);
        S.facing = { x: 1, z: 0 }; B.salir();
        // Ala fuerte contra el Escudo de plumas
        B.iniciar({ sinCuenta: true, especie: 'farinosa' }); quieta(1.8); listo();
        C.r.cd = {}; C.r.energia = 100; B.usar(C.r, 'escudo_plumas'); const pe = C.r.plumas;
        B.usar(C.j, 'golpe_ala');
        const paro = C.r.plumas === pe;
        B.usar(C.r, 'escudo_plumas'); C.r.cd = {}; C.r.energia = 100; if (!(C.r.escudo > 0)) { C.r.cd = {}; B.usar(C.r, 'escudo_plumas'); }
        C.r.inv = 0; const conEscudo = C.r.escudo > 0; const ra = B.usar(C.j, 'ala_fuerte');
        check('Ala fuerte: el golpe básico se para en el escudo; Ala fuerte lo rompe y quita 1 pluma', paro && conEscudo && ra.ok && ra.acierto && C.r.escudo <= 0 && C.r.plumas === pe - 1, 'escudo ' + conEscudo + ', plumas ' + pe + '→' + C.r.plumas);
        C.j.cd = {}; C.j.energia = 100; quieta(5); C.r.inv = 0; const pf = C.r.plumas; const rf = B.usar(C.j, 'ala_fuerte');
        check('...pero de lejos (más de 2,6 m) no llega', rf.ok && !rf.acierto && C.r.plumas === pf);
        B.salir();
        // Abanico de colores: deslumbra 1 s (no puede atacar) y su siguiente tiro falla; el siguiente ya no
        B.iniciar({ sinCuenta: true, especie: 'guildingii' }); quieta(5); listo(); C.r.cd = {}; C.r.energia = 100; C.r.falla = 0; C.r.deslumbrada = 0;
        const rab = B.usar(C.j, 'abanico_colores'), atacaDeslumbrada = B.usar(C.r, 'golpe_ala').ok;
        check('Abanico de colores: la rival queda deslumbrada 1 s y no puede atacar', rab.ok && rab.acierto && C.r.deslumbrada > 0.9 && C.r.deslumbrada <= 1 && !atacaDeslumbrada && C.r.plumas === C.r.plumasMax,
          'deslumbrada ' + (C.r.deslumbrada || 0).toFixed(2) + ', ataca ' + atacaDeslumbrada);
        corre(1.1); const yaVe = !(C.r.deslumbrada > 0), fallaLista = C.r.falla > 0;
        const tiro = () => { C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; C.j.inv = 0; C.j.escudo = 0; C.j.mareo = 0; quieta(6); const p0 = C.j.plumas, ok = B.usar(C.r, 'semilla').ok; corre(1.0); return ok ? p0 - C.j.plumas : -1; };
        const t1 = tiro(), fallaGastada = !(C.r.falla > 0), t2 = tiro();
        check('...a los 1 s se le pasa; su siguiente semilla sale torcida y falla; la otra ya da', yaVe && fallaLista && t1 === 0 && fallaGastada && t2 === 1, 've ' + yaVe + ', tiro 1: ' + t1 + ', tiro 2: ' + t2);
        C.j.cd = {}; C.j.energia = 100; quieta(9.5); C.r.deslumbrada = 0; C.r.falla = 0; const rlej = B.usar(C.j, 'abanico_colores');
        check('...pero de lejos (más de 8 m) no la deslumbra', rlej.ok && !rlej.acierto && !(C.r.deslumbrada > 0) && !(C.r.falla > 0));
        B.salir();
        // Semilla de río: lenta y bota dos veces en el suelo
        B.iniciar({ sinCuenta: true, especie: 'diadema' }); quieta(9); listo();
        S.facing = { x: 0, z: 1 }; // mira a otro lado: la semilla no va hacia la rival (para verla botar entera)
        const rr = B.usar(C.j, 'semilla_rio'), sb = C.balas[C.balas.length - 1], vel = sb ? Math.hypot(sb.vx, sb.vz) : 0;
        let vive = 0, botes = 0; while (sb && C.balas.includes(sb) && vive < 4) { B.paso(1 / 30); vive += 1 / 30; botes = sb.boto || 0; }
        check('Semilla de río: lenta (9 m/s, la semilla va a 16) y bota 2 veces en el suelo antes de acabarse', rr.ok && vel > 8 && vel < 10 && botes === 2 && vive > 1.5 && vive < 3,
          'vel ' + vel.toFixed(1) + ', botes ' + botes + ', vuela ' + vive.toFixed(2) + ' s');
        S.facing = { x: 1, z: 0 }; C.j.cd = {}; C.j.energia = 100; C.r.inv = 0; quieta(9); const prr = C.r.plumas; B.usar(C.j, 'semilla_rio'); corre(2);
        check('...y si va hacia la rival, le da (1 pluma)', C.r.plumas === prr - 1, 'plumas ' + prr + '→' + C.r.plumas);
        B.salir();
        // Mirada del Pitón: 3 s en que la semilla y el grito de la rival van a la mitad; el golpe de ala, igual
        B.iniciar({ sinCuenta: true, especie: 'versicolor' }); quieta(8); listo();
        const rm = B.usar(C.j, 'mirada_piton');
        check('Mirada del Pitón: la rival queda 3 s frenada', rm.ok && C.r.lenta > 2.9 && C.r.lenta <= 3, 'lenta ' + (C.r.lenta || 0).toFixed(2));
        const avance = () => { C.r.cd = {}; C.r.energia = 100; C.j.inv = 0; C.j.escudo = 0; quieta(8); B.usar(C.r, 'semilla'); const sb = C.balas[C.balas.length - 1]; if (!sb) return 0;
          const x0 = sb.m.position.x, z0 = sb.m.position.z; for (let k = 0; k < 6; k++) B.paso(1 / 30); return Math.hypot(sb.m.position.x - x0, sb.m.position.z - z0); };
        const aL = avance(); const lenta0 = C.r.lenta; C.r.lenta = 0; const aN = avance(); C.r.lenta = lenta0;
        check('...su semilla avanza a la mitad (más tiempo para esquivar)', aN > 2.5 && aL > 0.3 * aN && aL < 0.65 * aN, 'en 0,2 s: ' + aL.toFixed(2) + ' m frenada, ' + aN.toFixed(2) + ' m normal');
        const pl1 = C.j.plumas; corre(1.6); const daAun = C.j.plumas < pl1;
        const gritoT = lenta => { C.r.poder = 'grito_yunque'; C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; C.r.lenta = lenta; quieta(5); C.timers.length = 0; const ok = B.usar(C.r, 'grito_yunque').ok; const t = ok && C.timers.length ? C.timers[C.timers.length - 1].t : -1; C.timers.length = 0; return t; };
        const gL = gritoT(2), gN = gritoT(0);
        check('...la semilla frenada aún da si no te apartas; el grito frenado tarda el doble en llegar', daAun && gN > 0 && Math.abs(gL - 2 * gN) < 0.02, 'da ' + daAun + ', grito ' + gN.toFixed(2) + ' s → ' + gL.toFixed(2) + ' s');
        C.r.lenta = 3; C.r.cd = {}; C.r.energia = 100; C.j.inv = 0; C.j.escudo = 0; C.j.mareo = 0; quieta(1.5); const pa = C.j.plumas, ga = B.usar(C.r, 'golpe_ala');
        check('...pero no frena los golpes de ala', ga.ok && ga.acierto && C.j.plumas === pa - 1, 'plumas ' + pa + '→' + C.j.plumas);
        corre(3.2); check('...y a los 3 s se le pasa', !(C.r.lenta > 0));
        B.salir();
        // Ojo de sol: marca 5 s; las semillas la siguen a la mitad de fuerza que con el Ojo del cenote
        B.iniciar({ sinCuenta: true, especie: 'collaria' }); quieta(8); listo();
        const rs = B.usar(C.j, 'ojo_sol');
        check('Ojo de sol: marca a la rival 5 s (más que el Ojo del cenote) y la sigue más suave', rs.ok && C.r.marcada > 4.5 && C.r.marcaK === 0.5, 'marcada ' + (C.r.marcada || 0).toFixed(2) + ', fuerza ' + C.r.marcaK);
        const tuerce = (marca, K, vz) => { C.j.cd = {}; C.j.energia = 100; C.r.inv = 0; quieta(8); C.r.marcada = marca; C.r.marcaK = K; const p0 = C.r.plumas; B.usar(C.j, 'semilla');
          const sb = C.balas[C.balas.length - 1]; C.r.mov.x = 0; C.r.mov.z = vz; C.r.mov.t = 0.6; let lat = 0; for (let k = 0; k < 7; k++) { B.paso(1 / 30); if (sb && C.balas.includes(sb)) lat = Math.abs(sb.vz); }
          corre(1.0); return { lat, n: p0 - C.r.plumas }; };
        const sol = tuerce(5, 0.5, 9), cen = tuerce(5, 1, 9), sin = tuerce(0, 1, 9);
        check('...la semilla se tuerce hacia ella menos que con el Ojo del cenote (y sin marca, nada)', sin.lat < 0.05 && sol.lat > 0.3 * cen.lat && sol.lat < 0.8 * cen.lat,
          'giro ' + sin.lat.toFixed(2) + ' / ' + sol.lat.toFixed(2) + ' / ' + cen.lat.toFixed(2) + ' m/s');
        const solP = tuerce(5, 0.5, 3), sinP = tuerce(0, 1, 3);
        check('...si se aparta un poco, la semilla la sigue y le da (sin la marca, falla)', solP.n === 1 && sinP.n === 0, 'con Ojo de sol ' + solP.n + ', sin marca ' + sinP.n);
        S.facing = { x: 1, z: 0 }; B.salir();

        // ---- Las 4 de coste M en el duelo, a paso fijo ----
        // La rival tira una semilla desde 7 m; devuelve cuántas plumas pierde cada una
        const tiroR = () => { C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; C.r.inv = 0; C.j.inv = 0; C.j.mareo = 0; C.j.escudo = 0; quieta(7);
          const pj = C.j.plumas, pr = C.r.plumas, ok = B.usar(C.r, 'semilla').ok; corre(1.4); return { ok, j: pj - C.j.plumas, r: pr - C.r.plumas }; };
        const poder = id => { C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; return B.usar(C.j, id); };
        // Capa de palma: por delante para una semilla y la devuelve; por detrás no; dura poco
        B.iniciar({ sinCuenta: true, especie: 'leucocephala' }); quieta(7); listo(); S.facing = { x: 1, z: 0 };
        const rcp = poder('capa_palma'), cp1 = tiroR(), gastada = !(C.j.capa > 0), cp2 = tiroR();
        check('Capa de palma: para la semilla que llega por delante y se la devuelve a la rival (le quita 1 pluma); solo una', rcp.ok && cp1.ok && cp1.j === 0 && cp1.r === 1 && gastada && cp2.j === 1,
          'tú −' + cp1.j + ', rival −' + cp1.r + ', siguiente: tú −' + cp2.j);
        S.facing = { x: -1, z: 0 }; poder('capa_palma'); const cpA = tiroR(); S.facing = { x: 1, z: 0 };
        C.j.cd = {}; poder('capa_palma'); corre(2); const cpT = tiroR();
        check('...por detrás no para nada, y a los 1,5 s ya no está', cpA.j === 1 && cpA.r === 0 && cpT.j === 1, 'detrás: tú −' + cpA.j + ', a los 2 s: tú −' + cpT.j);
        C.j.cd = {}; poder('capa_palma'); C.r.cd = {}; C.r.mareo = 0; C.j.inv = 0; quieta(1.5); const pcg = C.j.plumas, gcp = B.usar(C.r, 'golpe_ala');
        check('...ni los golpes de ala', gcp.ok && gcp.acierto && C.j.plumas === pcg - 1);
        B.salir();
        // Pluma rebote: 5 s, de cualquier lado, una semilla; la devuelta no rebota otra vez
        B.iniciar({ sinCuenta: true, especie: 'albifrons' }); quieta(7); listo(); S.facing = { x: -1, z: 0 }; // de espaldas: rebota igual
        const rpr = poder('pluma_rebote'), dura = C.j.rebote; corre(2); const pr1 = tiroR(), pr2 = tiroR();
        check('Pluma rebote: dura 5 s; la semilla que te da (aunque estés de espaldas) rebota a la rival; solo la primera', rpr.ok && dura > 4.9 && pr1.j === 0 && pr1.r === 1 && pr2.j === 1,
          'dura ' + (dura || 0).toFixed(1) + ' s; tú −' + pr1.j + ', rival −' + pr1.r + ', siguiente: tú −' + pr2.j);
        poder('pluma_rebote'); C.r.rebote = 5; const prD = tiroR(); C.r.rebote = 0;
        C.j.cd = {}; poder('pluma_rebote'); corre(5.2); const prT = tiroR(); S.facing = { x: 1, z: 0 };
        check('...un solo rebote (la rival con rebote no te la devuelve otra vez) y a los 5 s se acaba', prD.j === 0 && prD.r === 1 && prT.j === 1, 'rebote doble: rival −' + prD.r + '; a los 5,2 s: tú −' + prT.j);
        B.salir();
        // Hojas que envuelven: el siguiente golpe solo marea; el otro ya quita pluma; 3 s
        B.iniciar({ sinCuenta: true, especie: 'rhodocorytha' }); quieta(1.5); listo();
        const golpeR = () => { C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; C.j.inv = 0; C.j.mareo = 0; quieta(1.5); const p0 = C.j.plumas, g = B.usar(C.r, 'golpe_ala'); return { ok: g.ok && g.acierto, n: p0 - C.j.plumas, mareo: C.j.mareo }; };
        const rho = poder('hojas_envuelven'), h0 = C.j.hojas, hg1 = golpeR(), hg2 = golpeR();
        check('Hojas que envuelven: el siguiente golpe solo marea (no quita pluma); el otro ya sí', rho.ok && h0 > 2.9 && hg1.ok && hg1.n === 0 && hg1.mareo > 0.7 && !(C.j.hojas > 0) && hg2.n === 1,
          'golpe 1: −' + hg1.n + ' (mareo ' + hg1.mareo.toFixed(2) + '), golpe 2: −' + hg2.n);
        poder('hojas_envuelven'); const hs = tiroR(); C.j.cd = {}; poder('hojas_envuelven'); corre(3.2); const hT = golpeR();
        check('...también con una semilla (y no la devuelve); a los 3 s ya no protege', hs.j === 0 && hs.r === 0 && hT.n === 1, 'semilla: tú −' + hs.j + ', rival −' + hs.r + '; a los 3,2 s: −' + hT.n);
        B.salir();
        // Ojo de selva: brillo dorado 4 s sobre la rival, sin daño; su siguiente ataque se anuncia y llega 0,6 s después
        B.iniciar({ sinCuenta: true, especie: 'kawalli' }); quieta(1.5); listo();
        let oro = 0; const burst0 = G.fx && G.fx.burst;
        if (burst0) G.fx.burst = function (x, y, z, k) { if (k === 'gold' && Math.hypot(x - C.r.pos.x, z - C.r.pos.z) < 0.6) oro++; return burst0.apply(this, arguments); };
        let rk, oro1 = 0;
        try { rk = poder('ojo_selva'); corre(1); oro1 = oro; } finally { if (burst0) G.fx.burst = burst0; }
        check('Ojo de selva: la rival brilla en dorado 4 s y no le quita plumas', rk.ok && C.r.vista > 2.9 && C.r.plumas === C.r.plumasMax && oro1 >= 3, 'vista ' + (C.r.vista || 0).toFixed(2) + ' s, destellos ' + oro1);
        C.r.cd = {}; C.r.energia = 100; C.j.inv = 0; quieta(1.5); const pk = C.j.plumas, ga1 = B.usar(C.r, 'golpe_ala');
        const celC = document.querySelector('#v18-duelo [data-k="centro"]'), avisoTxt = celC ? celC.textContent : '', antes = C.j.plumas; corre(0.7);
        check('...su siguiente ataque se anuncia («¡Cuidado, va a atacar!») y llega un momento después', ga1.ok && ga1.avisada && /Cuidado/.test(avisoTxt) && antes === pk && C.j.plumas === pk - 1,
          'aviso «' + avisoTxt + '», plumas ' + pk + '→' + antes + '→' + C.j.plumas);
        C.r.cd = {}; C.j.inv = 0; quieta(1.5); const pk2 = C.j.plumas, ga2 = B.usar(C.r, 'golpe_ala');
        check('...solo el siguiente: el otro sale al momento', ga2.ok && !ga2.avisada && ga2.acierto && C.j.plumas === pk2 - 1);
        C.j.cd = {}; C.j.inv = 0; poder('ojo_selva'); C.r.cd = {}; C.r.energia = 100; quieta(1.5); const pk3 = C.j.plumas, ga3 = B.usar(C.r, 'golpe_ala');
        S.pos.x -= 5; corre(0.7); // con el aviso da tiempo a apartarse
        check('...con el aviso da tiempo a apartarse y el golpe falla', ga3.avisada && C.j.plumas === pk3, 'plumas ' + pk3 + '→' + C.j.plumas);
        corre(3.5); check('...y a los 4 s se acaba', !(C.r.vista > 0));
        B.salir();
        // ---- Los 3 de tanda B (KIMI-149, Álbum) en el duelo, a paso fijo ----
        // Mide el empujón real: espera a que la onda llegue (kb.t > 0), marca la posición y avanza 8 cuadros dentro
        // de la ventana de kb (la rival no puede re-acercarse mientras dura el mareo del golpe).
        const esperaEmpujon = () => {
          for (let k = 0; k < 150; k++) { B.paso(1 / 30); if (C.r.kb.t > 0) break; }
          if (!(C.r.kb.t > 0)) return { av: 0, mareo: C.r.mareo };
          const p0 = { x: C.r.pos.x, z: C.r.pos.z };
          for (let k = 0; k < 8; k++) B.paso(1 / 30);
          return { av: Math.hypot(C.r.pos.x - p0.x, C.r.pos.z - p0.z), mareo: C.r.mareo };
        };
        // Viento de islas: ráfaga ancha que empuja lejos SIN quitar plumas
        B.iniciar({ sinCuenta: true, especie: 'tresmariae' }); quieta(6); listo(); C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0;
        const pv0 = C.r.plumas;
        const rv = B.usar(C.j, 'viento_islas');
        const ev = esperaEmpujon();
        check('Viento de islas: empuja a la rival lejos SIN quitar plumas', rv.ok && ev.av > 2.5 && C.r.plumas === pv0, 'empujón ' + ev.av.toFixed(1) + ' m, plumas ' + pv0);
        B.salir();
        // Voz de volcán: 1 s de carga a la vista (pico abierto, sin empujar) y entonces el mayor empuje, sin plumas
        B.iniciar({ sinCuenta: true, especie: 'auropalliata' }); quieta(5); listo(); C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0;
        const pz0 = C.r.plumas;
        const rz = B.usar(C.j, 'voz_volcan');
        corre(0.5); const sinEmpujar = !(C.r.kb.t > 0) && C.j.picoT > 0; // la carga avisa: pico abierto y todavía no empuja
        const ez = esperaEmpujon();
        check('Voz de volcán: carga 1 s a la vista y luego el mayor empuje, sin plumas', rz.ok && sinEmpujar && ez.av > 3.5 && ez.mareo > 0.7 && C.r.plumas === pz0,
          'pico ' + C.j.picoT.toFixed(2) + ', empujón ' + ez.av.toFixed(1) + ' m (mareo ' + ez.mareo.toFixed(2) + '), plumas ' + pz0);
        B.salir();
        // Ojo de manglar: 3 s en que las semillas de la rival van a ×0,4 y se dibujan grandes (se esquivan)
        B.iniciar({ sinCuenta: true, especie: 'brasiliensis' }); quieta(6); listo();
        const rg = B.usar(C.j, 'ojo_manglar');
        check('Ojo de manglar: la rival queda 3 s con los tiros lentos (×0,4) y grandes', rg.ok && C.r.lenta > 2.9 && C.r.lenta <= 3 && C.r.grande > 2.9 && C.r.lentaK === 0.4,
          'lenta ' + (C.r.lenta || 0).toFixed(2) + ', grande ' + (C.r.grande || 0).toFixed(2) + ', K ' + C.r.lentaK);
        const avanzaBala = () => {
          C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; C.j.inv = 0; C.j.escudo = 0; quieta(8);
          B.usar(C.r, 'semilla'); const sb = C.balas[C.balas.length - 1];
          if (!sb) return { escala: 0, av: 0 };
          B.paso(1 / 30); const escala = sb.m.scale.x, x0 = sb.m.position.x, z0 = sb.m.position.z;
          for (let k = 0; k < 5; k++) B.paso(1 / 30);
          return { escala, av: C.balas.includes(sb) ? Math.hypot(sb.m.position.x - x0, sb.m.position.z - z0) : 99 };
        };
        const conOjo = avanzaBala(); // los 3 s aún corren: sus semillas salen lentas y grandes
        C.r.lenta = 0; C.r.lentaK = 0; C.r.grande = 0;
        const sinOjo = avanzaBala();
        check('...su semilla avanza menos de la mitad y la malla se dibuja ×1,8', conOjo.escala > 1.7 && sinOjo.av > 2.2 * conOjo.av,
          'avance ' + conOjo.av.toFixed(2) + ' m vs ' + sinOjo.av.toFixed(2) + ' m, escala ' + conOjo.escala.toFixed(2));
        S.facing = { x: 1, z: 0 }; B.salir();

        // ---- Los 3 de tanda A (KIMI-148, Álbum) en el duelo, a paso fijo ----
        // Gota de lluvia: escudo de 4,5 s; para un golpe de ala entero; contra el grito frena menos que el Escudo de plumas
        B.iniciar({ sinCuenta: true, especie: 'dufresniana' }); quieta(6); listo(); S.facing = { x: 1, z: 0 };
        const rgot = B.usar(C.j, 'gota_lluvia');
        check('Gota de lluvia: escudo de 4,5 s (dura casi el doble que el Escudo de plumas)', rgot.ok && C.j.escudo > 4.4 && C.j.escudo <= 4.5, 'escudo ' + (C.j.escudo || 0).toFixed(2));
        C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; C.j.inv = 0; const pg = C.j.plumas; B.usar(C.r, 'golpe_ala');
        check('...para un golpe de ala (sin perder plumas)', C.j.plumas === pg, 'plumas ' + pg + '→' + C.j.plumas);
        const empujonContra = escudoId => { // la rival grita con el jugador escudado: mide el empujón que recibe
          C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.j.escudo = 0; C.j.inv = 0; C.j.kb.t = 0; C.j.kb.x = C.j.kb.z = 0;
          B.usar(C.j, escudoId);
          C.r.poder = 'grito_yunque'; C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; C.r.lenta = 0; quieta(5); C.timers.length = 0;
          B.usar(C.r, 'grito_yunque');
          for (let k = 0; k < 150; k++) { B.paso(1 / 30); if (C.j.kb.t > 0) break; }
          const p0 = { x: S.pos.x, z: S.pos.z };
          for (let k = 0; k < 8; k++) B.paso(1 / 30);
          return Math.hypot(S.pos.x - p0.x, S.pos.z - p0.z);
        };
        const avGota = empujonContra('gota_lluvia');
        B.iniciar({ sinCuenta: true, especie: 'arausiaca' }); quieta(6); listo(); S.facing = { x: 1, z: 0 };
        const avEscudoP = empujonContra('escudo_plumas');
        check('...pero contra el grito frena menos que el Escudo de plumas', avGota > 1.15 * avEscudoP && avEscudoP > 0.15,
          'gota ' + avGota.toFixed(2) + ' m vs escudo ' + avEscudoP.toFixed(2) + ' m');
        B.salir();
        // Chillido de bandada: llega lejos (9,5 m, más que el alcance del Grito) y empuja poco, sin plumas
        B.iniciar({ sinCuenta: true, especie: 'viridigenalis' }); quieta(6); listo(); S.facing = { x: 1, z: 0 }; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0;
        const pchi = C.r.plumas;
        const rchi = B.usar(C.j, 'chillido_bandada');
        const ech = esperaEmpujon();
        check('Chillido de bandada: desde 9,5 m empuja poco (sin plumas) y corta un momento', rchi.ok && ech.av > 0.4 && ech.av < 2.4 && ech.mareo > 0.1 && C.r.plumas === pchi,
          'empujón ' + ech.av.toFixed(2) + ' m, mareo ' + ech.mareo.toFixed(2) + ', plumas ' + pchi);
        C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.inv = 0; C.r.mareo = 0; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0; quieta(12); C.timers.length = 0;
        B.usar(C.j, 'chillido_bandada');
        for (let k = 0; k < 150; k++) B.paso(1 / 30);
        check('...y desde 12 m (más de su alcance de 11 m) no llega', !(C.r.kb.t > 0) && C.r.plumas === pchi, 'plumas ' + pchi + '→' + C.r.plumas);
        B.salir();
        // Ráfaga: dos impulsos hacia delante (~5–6 m); el segundo empuja y quita 1 pluma si toca a la rival
        B.iniciar({ sinCuenta: true, especie: 'finschi' }); quieta(6); listo(); S.facing = { x: 1, z: 0 };
        const px0 = S.pos.x, prf = C.r.plumas;
        const rraf = B.usar(C.j, 'rafaga');
        for (let k = 0; k < 60; k++) B.paso(1 / 30);
        const cruce = S.pos.x - px0;
        check('Ráfaga: cruza ~5–6 m en dos impulsos y, al tocar a la rival (4,5 m), le quita 1 pluma', rraf.ok && cruce > 3.5 && cruce < 7 && C.r.plumas === prf - 1,
          'cruce ' + cruce.toFixed(1) + ' m, plumas ' + prf + '→' + C.r.plumas);
        C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.inv = 0; quieta(11); const prf2 = C.r.plumas; const px1 = S.pos.x;
        const rraf2 = B.usar(C.j, 'rafaga');
        for (let k = 0; k < 60; k++) B.paso(1 / 30);
        check('...y si no toca (rival a 11 m), solo cruza: no quita plumas', rraf2.ok && C.r.plumas === prf2 && S.pos.x - px1 > 3.5,
          'plumas ' + prf2 + ', cruce ' + (S.pos.x - px1).toFixed(1) + ' m');
        S.facing = { x: 1, z: 0 }; B.salir();

        // ---- Los 3 de tanda C (KIMI-156, Álbum) en el duelo, a paso fijo ----
        // Eco de la Cordillera: primera onda y, al rebotar en la rival, segunda más débil
        B.iniciar({ sinCuenta: true, especie: 'ventralis' }); quieta(5); listo(); S.facing = { x: 1, z: 0 }; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0;
        const pec = C.r.plumas;
        const rec2 = B.usar(C.j, 'eco_cordillera');
        const ec1 = esperaEmpujon();
        for (let k = 0; k < 10 && C.r.kb.t > 0; k++) B.paso(1 / 30); // que acabe el primer empujón antes de medir el eco
        const ec2 = esperaEmpujon();
        check('Eco de la Cordillera: dos golpes en uno — la onda que rebota es más débil y no quita plumas',
          rec2.ok && ec1.av > 0.8 && ec2.av > 0.3 && ec2.av < ec1.av * 0.75 && ec1.mareo > 0.45 && ec2.mareo < ec1.mareo && C.r.plumas === pec,
          'empujones ' + ec1.av.toFixed(2) + ' → ' + ec2.av.toFixed(2) + ' m, mareos ' + ec1.mareo.toFixed(2) + ' → ' + ec2.mareo.toFixed(2));
        C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.inv = 0; C.r.mareo = 0; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0; quieta(8); C.timers.length = 0;
        B.usar(C.j, 'eco_cordillera');
        for (let k = 0; k < 150; k++) B.paso(1 / 30);
        check('...y si la primera onda no alcanza (rival a 8 m, más de su alcance de 6 m), no vuelve nada', !(C.r.kb.t > 0) && C.r.plumas === pec);
        B.salir();
        // A ras del agua: vuelo rasante muy rápido; el choque se detecta mientras vuela y empuja sin plumas
        B.iniciar({ sinCuenta: true, especie: 'festiva' }); quieta(6); listo(); S.facing = { x: 1, z: 0 };
        C.j.kb = C.j.kb || { x: 0, z: 0, t: 0 }; C.j.kb.t = 0; C.j.kb.x = C.j.kb.z = 0; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0;
        const pras = C.r.plumas, x0r = S.pos.x;
        const rras = B.usar(C.j, 'rasante');
        let vioKbR = false;
        for (let k = 0; k < 22; k++) { B.paso(1 / 30); if (C.r.kb.t > 0) vioKbR = true; }
        const cruceR = S.pos.x - x0r;
        check('A ras del agua: vuelo rasante muy rápido (cruza ~7 m) y, al chocar, empuja sin plumas',
          rras.ok && cruceR > 5.5 && vioKbR && C.r.plumas === pras,
          'cruce ' + cruceR.toFixed(1) + ' m, plumas ' + pras);
        C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.inv = 0; C.r.mareo = 0; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0; quieta(6); C.r.pos.z += 5; C.timers.length = 0;
        const pras2 = C.r.plumas;
        const rras2 = B.usar(C.j, 'rasante');
        let vioKbR2 = false;
        for (let k = 0; k < 22; k++) { B.paso(1 / 30); if (C.r.kb.t > 0) vioKbR2 = true; }
        check('...y si no hay choque (rival fuera de la línea), solo cruza: no empuja ni quita plumas', rras2.ok && !vioKbR2 && C.r.plumas === pras2);
        B.salir();
        // Canto real: grito flojo que, si acierta, devuelve 20 de energía
        B.iniciar({ sinCuenta: true, especie: 'ochrocephala' }); quieta(5); listo(); S.facing = { x: 1, z: 0 }; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0;
        const rca = B.usar(C.j, 'canto_real');
        C.j.energia = 5; // medir el reembolso: al acertar entran 20
        let vioKbC = false;
        for (let k = 0; k < 40; k++) { B.paso(1 / 30); if (C.r.kb.t > 0) { vioKbC = true; break; } }
        const eHit = C.j.energia;
        check('Canto real: si la onda acierta, devuelve 20 de energía (y empuja poco, sin plumas)', rca.ok && vioKbC && eHit > 20,
          'energía tras acertar ' + eHit.toFixed(1));
        C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.inv = 0; C.r.mareo = 0; C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0; quieta(11); C.timers.length = 0;
        const rca2 = B.usar(C.j, 'canto_real');
        C.j.energia = 5;
        let vioKbC2 = false;
        for (let k = 0; k < 12; k++) { B.paso(1 / 30); if (C.r.kb.t > 0) { vioKbC2 = true; break; } }
        check('...y si falla (rival a 11 m), no devuelve nada', rca2.ok && !vioKbC2 && C.j.energia < 14, 'energía ' + C.j.energia.toFixed(1));
        B.salir();

        // ---- Los 3 de tanda D (KIMI-158, Álbum, coste M) en el duelo, a paso fijo ----
        // Remolino: deshace las semillas rivales que tenga cerca y empuja a la rival pegada, sin plumas; mientras giras no te mueves
        B.iniciar({ sinCuenta: true, especie: 'autumnalis' }); quieta(7); listo(); S.facing = { x: 1, z: 0 };
        C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; B.usar(C.r, 'semilla'); corre(0.25); // la semilla de la rival viene volando
        const balasAntes = C.balas.length, pjRem = C.j.plumas;
        const rrem = B.usar(C.j, 'remolino');
        check('Remolino: deshace las semillas rivales que tenga cerca (ninguna te da)', rrem.ok && C.balas.length < balasAntes && C.j.plumas === pjRem && C.j.remolino > 1,
          'balas ' + balasAntes + '→' + C.balas.length + ', remolino ' + (C.j.remolino || 0).toFixed(1));
        listo(); quieta(2.2); listo(); C.r.kb.t = 0; C.r.kb.x = C.r.kb.z = 0; const prRem = C.r.plumas;
        const rrem2 = B.usar(C.j, 'remolino');
        check('...y empuja a la rival pegada (≤3 m) sin quitarle plumas', rrem2.ok && (C.r.kb.t > 0 || C.r.mareo > 0) && C.r.plumas === prRem);
        const MOVE = G.fisica && G.fisica.MOVE; MOVE.vx = 5; MOVE.vz = 3; B.paso(1 / 30);
        check('...mientras giras no te mueves (el Remolino te deja quieta)', MOVE.vx === 0 && MOVE.vz === 0);
        corre(1.4); // se le pasa el remolino
        B.salir();
        // Plumas de aliso: la pluma que acierta se pega a la rival y le roba energía 3 s; sin quitar plumas
        B.iniciar({ sinCuenta: true, especie: 'tucumana' }); quieta(7); listo(); S.facing = { x: 1, z: 0 };
        const prA = C.r.plumas, ral = B.usar(C.j, 'plumas_aliso');
        for (let k = 0; k < 60 && !(C.r.drena > 0); k++) B.paso(1 / 30); // espera a que la pluma vuele (7 m a 13 m/s ≈ 0,54 s)
        const pego = C.r.drena > 0;
        C.r.energia = 50; corre(0.5); const robada = C.r.energia; // con la pluma pegada roba 7/s (la recarga da +12/s)
        C.r.drena = 0; C.r.energia = 50; corre(0.5); const control = C.r.energia;
        check('Plumas de aliso: la pluma que acierta se pega y le roba energía 3 s (7/s), sin quitar plumas',
          ral.ok && pego && C.r.plumas === prA && robada < control - 2 && robada < 54,
          'robo: ' + robada.toFixed(1) + ' vs control ' + control.toFixed(1) + ', plumas ' + prA);
        B.salir();
        // Semilla de piña: sale grande y en arco; al caer sin acertar se abre en tres pequeñas; si acierta, quita 1 pluma
        B.iniciar({ sinCuenta: true, especie: 'vinacea' }); quieta(9); listo(); S.facing = { x: 0, z: 1 }; // de espaldas a la rival: la piña cae sola
        const rpi = B.usar(C.j, 'semilla_pina');
        B.paso(1 / 30); // la escala la aplica pasoBalas: leerla tras un paso
        const grande = C.balas[C.balas.length - 1], escalaG = grande ? grande.m.scale.x : 0;
        let hijas = 0, tV = 0;
        while (tV < 3 && C.balas.length > 0) { B.paso(1 / 30); tV += 1 / 30; if (!hijas && C.balas.length >= 3) hijas = C.balas.length; }
        check('Semilla de piña: sale grande (×1,7) y, al caer sin acertar, se abre en tres pequeñas', rpi.ok && escalaG > 1.6 && hijas === 3,
          'escala ' + escalaG.toFixed(2) + ', hijas ' + hijas);
        S.facing = { x: 1, z: 0 }; B.salir();
        B.iniciar({ sinCuenta: true, especie: 'vinacea' }); quieta(6); listo(); S.facing = { x: 1, z: 0 };
        const ppi = C.r.plumas;
        const rpi2 = B.usar(C.j, 'semilla_pina');
        corre(1.5);
        check('...y si la grande acierta a la rival, le quita 1 pluma (y no se abre)', rpi2.ok && C.r.plumas === ppi - 1 && C.balas.length === 0,
          'plumas ' + ppi + '→' + C.r.plumas + ', balas ' + C.balas.length);
        B.salir();

        // ---- Los 4 de tanda E (KIMI-159, Álbum, coste M) en el duelo, a paso fijo ----
        // Columna de nube: sube 0,7 s y cae en picada donde está la rival: el mayor mareo (1,4 s), sin plumas
        B.iniciar({ sinCuenta: true, especie: 'imperialis' }); quieta(6); listo(); S.facing = { x: 1, z: 0 }; C.r.mareo = 5; // quieta de verdad mientras mide
        const pcol = C.r.plumas;
        const rcol = B.usar(C.j, 'columna_nube');
        corre(0.85);
        const dCol = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
        check('Columna de nube: cae en picada junto a la rival y la marea más (1,4 s) sin quitar plumas',
          rcol.ok && C.r.mareo > 1.15 && C.r.plumas === pcol && dCol < 1.5,
          'mareo ' + C.r.mareo.toFixed(2) + ', plumas ' + pcol + '→' + C.r.plumas + ', cae a ' + dCol.toFixed(2) + ' m');
        C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.mareo = 0; C.r.inv = 0; quieta(6); C.r.mareo = 5; C.r.mov.x = 0; C.r.mov.z = 8; C.r.mov.t = 0.6; C.timers.length = 0;
        const pcol2 = C.r.plumas, mareoAntes = C.r.mareo;
        const rcol2 = B.usar(C.j, 'columna_nube');
        for (let k = 0; k < 36; k++) B.paso(1 / 30);
        check('...pero es lenta en subir: si la rival se aparta mientras sube, la picada no la alcanza',
          rcol2.ok && C.r.plumas === pcol2 && C.r.mareo < mareoAntes - 0.5,
          'plumas ' + pcol2 + '→' + C.r.plumas + ', mareo ' + mareoAntes.toFixed(1) + '→' + C.r.mareo.toFixed(1));
        B.salir();
        // Plumas de manglar: 3 plumas en el suelo; la que pisa una queda lenta (la pluma se gasta)
        B.iniciar({ sinCuenta: true, especie: 'lilacina' }); quieta(6); listo(); S.facing = { x: 1, z: 0 };
        const rpm = B.usar(C.j, 'plumas_manglar');
        check('Plumas de manglar: siembra 3 plumas en el suelo', rpm.ok && C.trampas.length === 3);
        C.r.pos.x = S.pos.x + 8; C.r.pos.z = S.pos.z; C.r.pos.y = G.terreno.height(C.r.pos.x, C.r.pos.z); C.r.pensar = 99; C.r.mov.t = 0;
        C.trampas.push({ x: C.r.pos.x - 0.5, z: C.r.pos.z, t: 10, de: C.j }); // una pluma justo delante de ella
        B.paso(1 / 30);
        const peso = C.r.pesada, quedan = C.trampas.length;
        C.r.pesada = 0; C.trampas.length = 0; const cxN = C.r.pos.x;
        for (let k = 0; k < 45; k++) B.paso(1 / 30);
        const avanzaNormal = cxN - C.r.pos.x;
        C.r.pos.x = cxN; C.r.pos.y = G.terreno.height(C.r.pos.x, C.r.pos.z); C.r.pesada = 2.8;
        for (let k = 0; k < 45; k++) B.paso(1 / 30);
        const avanzaLenta = cxN - C.r.pos.x;
        check('...la rival que pisa una queda lenta ~2,8 s (se gasta la pluma) y anda menos de la mitad',
          peso > 2.5 && quedan === 3 && avanzaLenta > 0.5 && avanzaLenta < 0.5 * avanzaNormal,
          'pesada ' + peso.toFixed(1) + ' s, pluma gastada (' + quedan + ' quedan), paso ' + avanzaLenta.toFixed(2) + ' m vs ' + avanzaNormal.toFixed(2) + ' m');
        B.salir();
        // Vuelo de niebla: atraviesa a la rival y al pasar le quita 1 pluma; si falla, queda detrás y cansada
        B.iniciar({ sinCuenta: true, especie: 'mercenarius' }); quieta(6); listo(); S.facing = { x: 1, z: 0 }; C.r.mareo = 5;
        C.j.kb = C.j.kb || { x: 0, z: 0, t: 0 }; C.j.kb.t = 0; C.j.kb.x = C.j.kb.z = 0;
        const pvn = C.r.plumas, x0n = S.pos.x;
        const rvn = B.usar(C.j, 'vuelo_niebla');
        for (let k = 0; k < 25; k++) B.paso(1 / 30);
        const cruceN = S.pos.x - x0n;
        check('Vuelo de niebla: atraviesa a la rival (cruza ~6,5 m) y, al pasar junto a ella, le quita 1 pluma',
          rvn.ok && cruceN > 5 && C.r.plumas === pvn - 1,
          'cruce ' + cruceN.toFixed(1) + ' m, plumas ' + pvn + '→' + C.r.plumas);
        C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.mareo = 0; C.r.inv = 0; quieta(6); C.r.mareo = 5; C.r.pos.z += 5; C.timers.length = 0;
        C.j.kb.t = 0; C.j.kb.x = C.j.kb.z = 0;
        const pvn2 = C.r.plumas;
        const rvn2 = B.usar(C.j, 'vuelo_niebla');
        let cansa = 0;
        for (let k = 0; k < 25; k++) { B.paso(1 / 30); cansa = C.j.mareo; }
        check('...y si falla el roce (rival fuera de la línea), no quita plumas y queda cansada',
          rvn2.ok && C.r.plumas === pvn2 && cansa > 0.3,
          'plumas ' + pvn2 + '→' + C.r.plumas + ', mareo propio ' + cansa.toFixed(2));
        S.facing = { x: 1, z: 0 }; B.salir();
        // Vuelta de pino: salta hacia atrás ~3,5 m (esquiva por distancia, sin invulnerabilidad) y queda mirando a la rival
        B.iniciar({ sinCuenta: true, especie: 'pretrei' }); quieta(2.6); listo(); S.facing = { x: 1, z: 0 }; C.r.mareo = 5;
        C.j.kb = C.j.kb || { x: 0, z: 0, t: 0 }; C.j.kb.t = 0; C.j.kb.x = C.j.kb.z = 0;
        const d0p = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
        const rvp = B.usar(C.j, 'vuelta_pino');
        for (let k = 0; k < 14; k++) B.paso(1 / 30);
        const d1p = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
        const miraRival = (S.facing.x * (C.r.pos.x - S.pos.x) + S.facing.z * (C.r.pos.z - S.pos.z)) / Math.max(0.01, d1p);
        check('Vuelta de pino: salta hacia atrás (>2,4 m: fuera del golpe de ala) y queda mirando a la rival',
          rvp.ok && d1p > d0p + 2.4 && d1p > 4.5 && miraRival > 0.98,
          'dist ' + d0p.toFixed(1) + '→' + d1p.toFixed(1) + ' m, mira ' + miraRival.toFixed(3));
        B.salir();
        // Imitación (oratrix, coste A): copia el último poder NO básico que usó la rival, a media fuerza;
        // si la rival aún no ha usado nada, no gasta energía ni espera
        B.iniciar({ sinCuenta: true, especie: 'oratrix' }); quieta(6); listo(); S.facing = { x: 1, z: 0 }; C.r.mareo = 5;
        const e0i = C.j.energia;
        const rim0 = B.usar(C.j, 'imitacion');
        check('Imitación sin nada que copiar: falla sin gastar energía ni espera',
          !rim0.ok && rim0.motivo === 'nada que imitar' && C.j.energia === e0i && (C.j.cd.imitacion || 0) === 0,
          'ok=' + rim0.ok + ', energía ' + e0i.toFixed(0) + '→' + C.j.energia.toFixed(0));
        C.r.mareo = 0; C.r.pensar = 99; C.r.poderT = 99; C.r.esquivaT = 99; // la rival no actúa por su cuenta
        const poderR0 = C.r.poder; // arausiaca: escudo_plumas (montaneras: grito_yunque)
        const rur0 = B.usar(C.r, poderR0);
        check('La rival usa su poder y queda registrado para la Imitación', rur0.ok && C.r.ultPoder === poderR0, poderR0);
        listo(); C.j.cd = {}; C.j.energia = 100; C.r.mareo = 5; C.r.escudo = 0; C.j.escudo = 0;
        const rim = B.usar(C.j, 'imitacion');
        if (poderR0 === 'escudo_plumas') {
          check('Imitación copia a MEDIA FUERZA: el escudo de la rival dura la mitad (2,5 → 1,25 s)',
            rim.ok && rim.copia === 'escudo_plumas' && C.j.escudo > 1.0 && C.j.escudo <= 1.26,
            'escudo copiado ' + (C.j.escudo || 0).toFixed(2) + ' s');
          corre(1.4); // se le pasa el escudo copiado
        } else {
          C.r.mareo = 0; C.r.kb = { x: 0, z: 0, t: 0 };
          let golpeCopia = 0;
          for (let k = 0; k < 60 && !(C.r.mareo > 0); k++) { B.paso(1 / 30); golpeCopia = C.r.mareo; }
          check('Imitación copia a MEDIA FUERZA: el grito de la rival marea la mitad (1,1 → 0,55 s)',
            rim.ok && rim.copia === 'grito_yunque' && golpeCopia > 0.3 && golpeCopia <= 0.56,
            'mareo copiado ' + golpeCopia.toFixed(2) + ' s');
        }
        C.r.mareo = 0; C.r.cd.semilla = 0; C.r.energia = 100;
        B.usar(C.r, 'semilla'); // los básicos no se registran ni se imitan
        check('Los básicos (semilla, golpe de ala) no se registran para la Imitación', C.r.ultPoder === poderR0);
        // La reducción a media fuerza la aplica el propio efecto copiado (su «this» media), no un parche global:
        // imitar un poder sin escudo no debe tocar el escudo que ya tuviera puesta la imitadora
        C.j.escudo = 2; C.j.cd = {}; C.j.energia = 100; C.r.ultPoder = 'grito_yunque';
        const rim2 = B.usar(C.j, 'imitacion');
        check('Imitar un grito con el escudo propio puesto no lo toca (sigue 2 s, no 1)',
          rim2.ok && rim2.copia === 'grito_yunque' && Math.abs(C.j.escudo - 2) < 0.01,
          'escudo propio ' + (C.j.escudo || 0).toFixed(2) + ' s');
        C.j.escudo = 0;
        B.salir();
        // Vista de cumbre (guatemalae, V18_MATRIZ_36.md #20): 6 s en la cumbre — ves a la rival en el minimapa y tu
        // golpe de ala alcanza ×1,35; sin daño propio ni invulnerabilidad
        B.iniciar({ sinCuenta: true, especie: 'guatemalae' }); quieta(2.9); listo(); S.facing = { x: 1, z: 0 }; C.r.mareo = 5;
        const mapaSin = G.v18combate.mapa(); // sin el poder, la rival no se «ve»
        const pvg0 = C.r.plumas, golpeSin = B.usar(C.j, 'golpe_ala');
        check('...a 2,9 m (fuera del alcance normal de 2,4 m) el golpe de ala falla', golpeSin.ok && !golpeSin.acierto && C.r.plumas === pvg0,
          'plumas ' + pvg0 + '→' + C.r.plumas);
        const rvc = B.usar(C.j, 'vista_cumbre');
        const mapaCon = G.v18combate.mapa();
        listo(); C.j.cd.golpe_ala = 0; C.r.mareo = 5; const pvg1 = C.r.plumas, golpeCon = B.usar(C.j, 'golpe_ala');
        check('Vista de cumbre: 6 s en que ves a la rival en el minimapa y tu golpe de ala alcanza un poco más (acierta a 2,9 m)',
          rvc.ok && C.j.vistacumbre > 5.5 && mapaSin === null && mapaCon && Math.abs(mapaCon.x - C.r.pos.x) < 0.01 && golpeCon.ok && golpeCon.acierto && C.r.plumas === pvg1 - 1,
          'vistacumbre ' + (C.j.vistacumbre || 0).toFixed(1) + ' s, mapa ' + (mapaCon ? mapaCon.x.toFixed(1) + ',' + mapaCon.z.toFixed(1) : 'null') + ', plumas ' + pvg1 + '→' + C.r.plumas);
        corre(6.2); quieta(2.9); listo(); C.j.cd.golpe_ala = 0; C.r.mareo = 5; const pvg2 = C.r.plumas, golpeFin = B.usar(C.j, 'golpe_ala');
        check('...y a los 6 s se acaba: el mapa la pierde y el ala vuelve a 2,4 m (a 2,9 m falla otra vez)',
          !(C.j.vistacumbre > 0) && G.v18combate.mapa() === null && golpeFin.ok && !golpeFin.acierto && C.r.plumas === pvg2);
        B.salir();
        // Ojo de bandada (amazonica, V18_MATRIZ_36.md #30): 6 s en que el aviso salta cuando la rival usa su poder
        B.iniciar({ sinCuenta: true, especie: 'amazonica' }); quieta(6); listo(); S.facing = { x: 1, z: 0 };
        const poderRival = C.r.poder, avisos0 = (B.estado().stats || {}).avisos || 0;
        const rob = B.usar(C.j, 'ojo_bandada');
        C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0; B.usar(C.r, poderRival); // la rival usa su poder
        const avisos1 = (B.estado().stats || {}).avisos || 0;
        check('Ojo de bandada: 6 s en que el aviso salta cuando la rival usa su poder (información, sin daño)',
          rob.ok && C.j.ojobandada > 5.5 && avisos1 === avisos0 + 1,
          'ojobandada ' + (C.j.ojobandada || 0).toFixed(1) + ' s, avisos ' + avisos0 + '→' + avisos1 + ' (' + poderRival + ')');
        corre(6.2); listo(); C.r.cd = {}; C.r.energia = 100; C.r.mareo = 0;
        B.usar(C.r, poderRival);
        const avisos2 = (B.estado().stats || {}).avisos || 0;
        check('...y se le acaba a los 6 s: sin el ojo puesto, el mismo poder de la rival no avisa',
          !(C.j.ojobandada > 0) && avisos2 === avisos1, 'avisos ' + avisos1 + '→' + avisos2);
        B.salir();
        // Cuento (aestiva, #36): la IA se distrae 1,5 s — no ataca, no se defiende y no se acerca
        B.iniciar({ sinCuenta: true, especie: 'aestiva' }); quieta(2); listo(); S.facing = { x: 1, z: 0 };
        const pjCu0 = C.j.plumas, xrC = C.r.pos.x, zrC = C.r.pos.z;
        const rcu = B.usar(C.j, 'cuento');
        C.r.pensar = 0; C.r.golpeT = 0; // la única barrera entre la rival y el golpe debe ser la distracción
        corre(1.2);
        const movidaC = Math.hypot(C.r.pos.x - xrC, C.r.pos.z - zrC);
        check('Cuento: la rival queda distraída 1,5 s — a 2 m no ataca (0 plumas perdidas) ni se acerca',
          rcu.ok && C.r.distraida > 0.2 && C.j.plumas === pjCu0 && movidaC < 0.15,
          'distraída ' + (C.r.distraida || 0).toFixed(2) + ' s, plumas ' + pjCu0 + '→' + C.j.plumas + ', movida ' + movidaC.toFixed(2) + ' m');
        corre(1.4);
        check('...y a los 1,5 s se le pasa y vuelve a atacar sola', C.j.plumas === pjCu0 - 1, 'plumas ' + pjCu0 + '→' + C.j.plumas);
        B.salir();
      } else check('El duelo está cargado', false);
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e); }
    try { if (B && B.estado().fase !== 'nada') B.salir(); } catch (e) { /* */ }
    G.ui.toast = toast0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = fac0; S.inv = inv0;
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  // =====================================================================================================================
  // AV.v18PoderesTest(): los 34 poderes jugables, uno a uno (Kelvin, cierre: alcance cerrado a 34; Mara y Vela no tienen poder).
  // Para cada especie: (1) se desbloquea por la vía real (vittata desde el inicio; arausiaca con el reto de descubrir.js;
  // las 12 de hito y las 20 del Álbum de aquí) y una sola vez; (2) elegida en «Mis cotorras», en el duelo su poder sale con
  // la G y con el botón (mantener Impulso), gasta su energía, respeta la espera, produce su efecto y no deja invulnerable;
  // (3) tras guardar y recargar (progreso.js) sigue desbloqueada y elegida; (4) su nombre, su línea «Poder: …» y su aviso
  // tienen inglés. Devuelve también `tabla` (una fila por especie) para el informe.
  const NO_PODER = ['martinicana', 'violacea']; // consejeras de la temporada 1
  // Efecto medible de cada poder: d = distancia de la rival (quieta), t = segundos a paso fijo; mide(C, m) con m = lo visto
  // justo al activarlo (m.ya), durante la ventana (m.golpes de la jugadora a la rival, m.dMax) y m.ev (evento v18poder).
  const MIDE = {
    grito_yunque: { d: 4, golpe: 1 }, escudo_plumas: { ya: (C) => C.j.escudo > 0 },
    quiebro: { ya: (C) => C.j.inv > 0 && C.j.kb.t > 0 }, lluvia_semillas: { ya: (C, m) => C.balas.length === m.balas0 + 3 },
    ojo_cenote: { ya: (C) => C.r.marcada > 0 }, ala_fuerte: { d: 2, golpe: 1 },
    abanico_colores: { ya: (C) => C.r.deslumbrada > 0 && C.r.falla > 0 }, semilla_rio: { ya: (C, m) => C.balas.length === m.balas0 + 1 },
    mirada_piton: { ya: (C) => C.r.lenta > 0 }, ojo_sol: { ya: (C) => C.r.marcada > 0 && C.r.marcaK < 1 },
    capa_palma: { ya: (C) => C.j.capa > 0 }, pluma_rebote: { ya: (C) => C.j.rebote > 0 }, hojas_envuelven: { ya: (C) => C.j.hojas > 0 },
    ojo_selva: { ya: (C) => C.r.vista > 0 }, viento_islas: { d: 4, golpe: 1 }, voz_volcan: { d: 4, golpe: 1 },
    ojo_manglar: { ya: (C) => C.r.lenta > 0 && C.r.grande > 0 }, gota_lluvia: { ya: (C) => C.j.escudo > 0 },
    chillido_bandada: { d: 4, golpe: 1 }, rafaga: { d: 4.5, golpe: 1 }, eco_cordillera: { d: 4, golpe: 1 }, rasante: { d: 5, golpe: 1 },
    canto_real: { d: 4, golpe: 1 }, remolino: { d: 2.2, ya: (C) => C.j.remolino > 0, golpe: 1 },
    plumas_aliso: { d: 6, golpe: 1, ya: (C, m) => C.balas.length === m.balas0 + 1 }, semilla_pina: { ya: (C, m) => C.balas.length === m.balas0 + 1 },
    columna_nube: { d: 3, golpe: 1 }, plumas_manglar: { ya: (C) => C.trampas.length === 3 }, vuelo_niebla: { d: 4, golpe: 1 },
    vuelta_pino: { d: 2.6, aleja: 2.4 }, imitacion: { copia: true }, vista_cumbre: { ya: (C) => C.j.vistacumbre > 0 },
    ojo_bandada: { ya: (C) => C.j.ojobandada > 0 }, cuento: { ya: (C) => C.r.distraida > 0 }
  };
  let regPoderes = null; // oyentes únicos (G no tiene off): mudos fuera de la prueba
  G.on('v18', e => { if (regPoderes && e && e.tipo === 'especie' && e.estado === 'seleccionable') regPoderes.altas[e.id] = (regPoderes.altas[e.id] || 0) + 1; });
  G.on('v18poder', e => { if (regPoderes) regPoderes.poderEv.push(e); });
  G.on('v18combate', e => { if (regPoderes && e && e.tipo === 'hit' && e.de === 'jugador' && e.a === 'rival' && !e.bloqueado) regPoderes.golpes.push(e); });
  async function testPoderes() {
    const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); return !!ok; };
    const D = G.v18descubrir, B = G.v18combate;
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = t => { toasts.push(String(t)); };
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, inv0 = Object.assign({}, S.inv || {});
    const prof0 = S.profile, idioma0 = G.idioma && G.idioma.actual && G.idioma.actual();
    const susp = G.guardado.suspender; if (susp) susp(true);
    const altas = {}; // id → veces que llegó a «seleccionable» (evento de progreso.js)
    const fila = {}; // id → { poder, desbloqueo, activacion, guardado, ingles, nota }
    const poderEv = [], golpes = []; regPoderes = { altas, poderEv, golpes };
    const pn0 = Object.getOwnPropertyDescriptor(performance, 'now');
    try {
      if (!S.profile || !((S.profile.look && S.profile.look.species) || S.profile.species)) S.profile = Object.assign({}, S.profile || {}, { look: { species: 'vittata' } });
      V.borrar(); V.recargar();
      const ESP = H.lista().filter(h => !h.basico && h.especies).map(h => ({ sp: h.especies[0], id: h.id, h }));
      const ids = ESP.map(e => e.sp);
      check('Hay 34 poderes jugables, uno por especie, todos distintos', ESP.length === 34 && new Set(ids).size === 34 && new Set(ESP.map(e => e.id)).size === 34 &&
        ESP.every(e => H.poderDe(e.sp) === e.id), ESP.length + ' poderes');
      check('Mara y Vela (martinicana, violacea) no tienen poder propio ni se pueden elegir',
        NO_PODER.every(sp => !ids.includes(sp) && rango(V.estado(sp)) < 1));
      for (const e of ESP) fila[e.sp] = { poder: e.h.nombre, desbloqueo: false, activacion: false, guardado: false, ingles: false, nota: [] };
      const sel = id => rango(V.estado(id)) >= rango('seleccionable');

      // ---------- (1) Desbloqueo por la vía real ----------
      fila.vittata.desbloqueo = check('Vittata: elegible desde el inicio (partida nueva) y elegida por defecto', sel('vittata') && V.seleccionada() === 'vittata', V.estado('vittata'));
      check('Al empezar, ninguna de las otras 33 está', ids.filter(id => id !== 'vittata').every(id => rango(V.estado(id)) < 1),
        ids.filter(id => id !== 'vittata' && rango(V.estado(id)) >= 1).join(','));
      // arausiaca: descubrir.js (acercarse → reto de seguirla por las copas)
      if (D) {
        await D.listo; if (D.B && D.B.listo) await D.B.listo;
        const P = D.P, SALTOS = P.length - 1, ir = (p, dy) => { S.pos.x = p.x; S.pos.y = p.y + (dy || 0); S.pos.z = p.z; };
        const correr = s => { for (let t = 0; t < s; t += 0.1) D.paso(0.1); };
        D.R.activo = false;
        ir({ x: P[0].x + 4, y: P[0].y - 6, z: P[0].z + 3 }); correr(0.2);
        const desc = V.estado('arausiaca') === 'descubierta';
        D.empezarReto();
        for (let k = 1; k <= SALTOS && D.R.activo; k++) { correr(0.5); ir(P[k], 1.5); D.paso(0.1); }
        const ok1 = sel('arausiaca'), otra = D.empezarReto();
        fila.arausiaca.desbloqueo = check('Arausiaca: se descubre al acercarse y el reto de seguirla la desbloquea; no se puede repetir',
          desc && ok1 && !otra && altas.arausiaca === 1 && toasts.filter(t => /ya vuela contigo/.test(t)).length === 1,
          'descubierta ' + desc + ', elegible ' + ok1 + ', altas ' + altas.arausiaca);
      } else check('descubrir.js cargado', false);
      // Las 12 de hito: con los hitos reales del juego (duelos ganados de verdad, cambios de mundo y premios del minigolf)
      const aviso = h => toasts.filter(t => t.indexOf(h.txt) === 0).length;
      const ganar = (plumasJ) => {
        B.iniciar({ sinCuenta: true }); const C = B.estado();
        C.r.pos.x = S.pos.x + 1.5; C.r.pos.z = S.pos.z; C.r.pos.y = G.terreno.height(C.r.pos.x, C.r.pos.z); C.r.pensar = 99; C.r.esquivaT = 99; C.r.poderT = 99; C.r.golpeT = 99; C.r.tiroT = 99;
        S.facing = { x: 1, z: 0 }; C.r.plumas = 1; C.r.inv = 0; C.r.escudo = 0; C.j.plumas = plumasJ; C.j.cd = {};
        B.usar(C.j, 'golpe_ala'); const r = C.resultado, sp = C.j.especie; B.salir(); return r === 'win' ? sp : null;
      };
      const paso1 = (txt, hacer, esperadas, aun) => {
        hacer();
        const st0 = window.setTimeout; let nuevas, seg; // los avisos en cola (setTimeout) salen ya: se cuentan todos
        window.setTimeout = (fn, ms) => (ms > 1000 ? (fn(), 0) : st0(fn, ms));
        try { nuevas = revisar(true); seg = revisar(true); } finally { window.setTimeout = st0; }
        const ok = esperadas.every(sel) && aun.every(id => !sel(id)) && seg.length === 0;
        check(txt, ok, 'nuevas ' + nuevas.join(',') + (aun.length ? ' · aún no: ' + aun.join(',') : ''));
        for (const id of esperadas) { const h = HITOS.find(x => x.id === id); if (fila[id]) { fila[id].desbloqueo = ok && aviso(h) === 1 && altas[id] === 1; if (!fila[id].desbloqueo) fila[id].nota.push('desbloqueo: avisos ' + aviso(h) + ', altas ' + altas[id]); } }
      };
      paso1('Ganar un duelo (perdiendo una pluma) trae la de pico negro; aún no la frente blanca, el yucateco ni la de pico amarillo',
        () => ganar(4), ['agilis'], ['albifrons', 'xantholora', 'collaria']);
      paso1('Ganar sin perder ninguna pluma trae el loro frente blanca', () => ganar(5), ['albifrons'], ['xantholora', 'collaria']);
      paso1('Ganar con otra cotorra (pico negro) trae el yucateco y, con 3 duelos ganados, la de pico amarillo',
        () => { V.seleccionar('agilis'); ganar(4); V.seleccionar('vittata'); }, ['xantholora', 'collaria'], ['farinosa']);
      paso1('Reparar el puente trae el corona azul; el de cejas rojas aún no', () => V.cambiarMundo('puente_villa', 'reparado'), ['farinosa'], ['rhodocorytha']);
      paso1('Dispersar la Sombra trae la cabeciamarilla', () => V.cambiarMundo('sombra_tormenta', 'dispersa'), ['barbadensis'], ['guildingii']);
      paso1('Deshacer la Serpiente trae el de San Vicente y, con el puente, el de cejas rojas', () => V.cambiarMundo('serpiente_marana', 'deshecha'), ['guildingii', 'rhodocorytha'], ['diadema']);
      paso1('Despertar al Sapo trae el loro diadema', () => V.cambiarMundo('sapo_encantado', 'despierto'), ['diadema'], ['leucocephala']);
      paso1('Primer hoyo completo del minigolf trae el loro cubano; el de Santa Lucía aún no', () => V.otorgar('minigolf_villa_completo', 'minigolf_completo', 1), ['leucocephala'], ['versicolor']);
      paso1('Primer oro del minigolf trae el de Santa Lucía', () => V.otorgar('minigolf_villa_oro', 'minigolf_oro', 1), ['versicolor'], ['kawalli']);
      paso1('Con 3 de las 4 piedras y fibras, el de Kawall aún no', () => ['piedra_1', 'piedra_2', 'fibra_1'].forEach(k => V.cambiarMundo(k, 'recogida')), [], ['kawalli']);
      paso1('Con las 4, llega el de Kawall', () => V.cambiarMundo('fibra_2', 'recogida'), ['kawalli'], []);
      // Las 20 del Álbum: abrir su tarjeta (evento del Álbum), dos veces
      for (const a of ALBUM) {
        const antes = sel(a.id);
        revisarAlbum(); const sinAbrir = sel(a.id);
        G.emit('album', { id: a.id, fuente: 'test' }); G.emit('album', { id: a.id, fuente: 'test' });
        const n = toasts.filter(t => t.indexOf(a.txt) === 0).length;
        if (fila[a.id]) { fila[a.id].desbloqueo = !antes && !sinAbrir && sel(a.id) && n === 1 && altas[a.id] === 1; if (!fila[a.id].desbloqueo) fila[a.id].nota.push('desbloqueo: avisos ' + n + ', altas ' + altas[a.id]); }
      }
      const malAlbum = ALBUM.filter(a => !(fila[a.id] && fila[a.id].desbloqueo)).map(a => a.id);
      check('Las 20 del Álbum: llegan al abrir su tarjeta (no antes), con un solo aviso y una sola alta', malAlbum.length === 0 && ALBUM.length === 20, malAlbum.join(','));
      const noDos = ids.filter(id => id !== 'vittata' && altas[id] !== 1);
      check('Ninguna de las 33 se otorga dos veces (una sola alta cada una)', noDos.length === 0, noDos.map(id => id + '×' + (altas[id] || 0)).join(','));
      V.recargar();
      const perdidas = ids.filter(id => !sel(id));
      check('Tras recargar, las 34 siguen desbloqueadas', perdidas.length === 0, perdidas.join(','));

      // ---------- (4) Inglés: nombre del poder, la línea «Poder: …» de Mis cotorras y el aviso al llegar ----------
      if (G.idioma && G.idioma.poner) {
        await G.idioma.poner('en');
        const tr = G.idioma.tr, conEn = s => { const r = tr(s); return r !== s && !/Su poder|Elíge|Búscala|Descubriste|¡|Poder/.test(r); };
        // la línea «Poder: …» tal como sale en la tarjeta de Mis cotorras, ya traducida en pantalla
        D.abrirSeleccion(); await new Promise(r => setTimeout(r, 60));
        const card = G.ui.$('card'), lineaEn = sp => { const b = card && card.querySelector('[data-v18sp="' + sp + '"] small'); return b ? b.textContent.trim() : ''; };
        const AV_TXT = h => (HITOS.find(x => x.id === h) || ALBUM.find(x => x.id === h));
        for (const e of ESP) {
          const a = AV_TXT(e.sp), m = [];
          if (!conEn(e.h.nombre)) m.push('nombre');
          const li = lineaEn(e.sp); if (!/^Power: /.test(li) || li === 'Power: ' + e.h.nombre) m.push('«Poder: …» (' + li + ')');
          if (a) { const full = toasts.find(t => t.indexOf(a.txt) === 0); if (!full || !conEn(full)) m.push('aviso'); }
          if (e.sp === 'arausiaca') { const full = toasts.find(t => /ya vuela contigo/.test(t)); if (!full || !conEn(full)) m.push('aviso'); }
          fila[e.sp].ingles = !m.length; if (m.length) fila[e.sp].nota.push('sin EN: ' + m.join('/') + ' → ' + tr(e.h.nombre));
        }
        G.ui.hideCard(); await G.idioma.poner(idioma0 === 'en' ? 'en' : 'es');
        const sinEn = ESP.filter(e => !fila[e.sp].ingles);
        check('Los 34 tienen inglés (nombre, «Poder: …» y aviso de llegada)', sinEn.length === 0, sinEn.map(e => e.sp + ': ' + fila[e.sp].nota.join(' ')).join(' | '));
      } else check('idioma.js cargado', false);

      // ---------- (2) y (3): elegirla en Mis cotorras, guardar y recargar, y su poder en el duelo ----------
      const C = B.estado(), corre = s => { for (let t = 0; t < s; t += 1 / 30) B.paso(1 / 30); };
      const quieta = (dx, mareo) => { C.r.pos.x = S.pos.x + dx; C.r.pos.z = S.pos.z; C.r.pos.y = G.terreno.height(C.r.pos.x, C.r.pos.z);
        C.r.pensar = 99; C.r.esquivaT = 99; C.r.poderT = 99; C.r.golpeT = 99; C.r.tiroT = 99; C.r.mov.t = 0; C.r.kb.t = 0; C.r.mareo = mareo || 0;
        C.r.inv = 0; C.r.escudo = 0; S.facing = { x: 1, z: 0 }; };
      const teclaG = () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
      const soltarG = () => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
      const boton = () => { // mantener Impulso ≥ 450 ms (táctil): el reloj se adelanta sin esperar de verdad
        if (!G.dones || !G.dones.sostener) return false;
        G.dones.sostener(true); const t0 = performance.now();
        Object.defineProperty(performance, 'now', { configurable: true, value: () => t0 + 600 });
        try { G.dones.sostener(false); } finally { if (pn0) Object.defineProperty(performance, 'now', pn0); else delete performance.now; }
        return true;
      };
      for (const e of ESP) {
        const f = fila[e.sp], M = MIDE[e.id] || {}, nota = f.nota;
        // Mis cotorras: abrir la tarjeta y pulsar su botón
        const lista = D.abrirSeleccion(), btn = G.ui.$('card') && G.ui.$('card').querySelector('[data-v18sp="' + e.sp + '"]');
        if (btn) btn.click(); else G.ui.hideCard();
        const elegida = lista.includes(e.sp) && !!btn && V.seleccionada() === e.sp;
        // (3) guardar y recargar
        let guardada = null; try { guardada = JSON.parse(localStorage.getItem(V.clave()) || 'null'); } catch (x) { /* */ }
        V.recargar();
        f.guardado = elegida && !!guardada && guardada.sel === e.sp && rango(guardada.especies[e.sp]) >= rango('seleccionable') && V.estado(e.sp) === 'seleccionada' && V.seleccionada() === e.sp;
        if (!f.guardado) nota.push('guardado: elegida ' + elegida + ', sel ' + (guardada && guardada.sel) + ', estado ' + V.estado(e.sp));
        // (2) el duelo con la especie elegida (sin forzarla)
        B.iniciar({ sinCuenta: true }); toasts.length = 0;
        const h = H.ver(C.j, H.get(e.id)), m = { balas0: 0 };
        const dist = M.d || 3, quietaR = !!(M.golpe || M.aleja); // para medir el golpe, la rival no se mueve (mareada); el resto, normal
        quieta(dist, quietaR ? 5 : 0); C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0;
        if (M.copia) C.r.ultPoder = C.r.poder; // Imitación: la rival ya usó su poder
        let invMax = 0;
        const esSuyo = C.j.especie === e.sp && C.j.poder === e.id;
        m.balas0 = C.balas.length; const ev0 = poderEv.length, g0 = golpes.length, d0 = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
        teclaG(); soltarG();
        const gasto = 100 - C.j.energia, cd1 = C.j.cd[e.id] || 0;
        const ya = M.ya ? !!M.ya(C, m) : true;
        const evs = poderEv.slice(ev0).filter(x => x.de === 'jugador');
        invMax = Math.max(invMax, C.j.inv || 0);
        // la espera: otra G al momento no hace nada
        const eAntes = C.j.energia; teclaG(); soltarG();
        const respeta = poderEv.length === ev0 + evs.length && Math.abs(C.j.energia - eAntes) < 1e-6 && H.listo(C.j, e.id).motivo === 'espera';
        let dMax = d0;
        for (let t = 0; t < 1.5; t += 1 / 30) { B.paso(1 / 30); invMax = Math.max(invMax, C.j.inv || 0); dMax = Math.max(dMax, Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z)); }
        const nGolpes = golpes.length - g0;
        let efecto = ya && evs.length >= 1;
        if (M.golpe) efecto = efecto && nGolpes >= 1;
        if (M.aleja) efecto = efecto && dMax > d0 + M.aleja;
        if (M.copia) efecto = efecto && evs.some(x => x.copia === C.r.poder);
        // aún en espera justo antes de que se acabe; después vuelve con el botón
        for (let t = 1.5; t < h.cooldown - 0.25; t += 1 / 30) { B.paso(1 / 30); invMax = Math.max(invMax, C.j.inv || 0); }
        C.j.mareo = 0; const casi = H.listo(C.j, e.id).motivo;
        corre(0.5); C.j.mareo = 0; quieta(dist, quietaR ? 5 : 0); if (M.copia) C.r.ultPoder = C.r.poder;
        const ev1 = poderEv.length, hayBoton = boton();
        const conBoton = hayBoton && poderEv.length > ev1 && (C.j.cd[e.id] || 0) > h.cooldown - 0.05;
        // sin invulnerabilidad: pasado el poder, la rival le quita una pluma con un golpe de ala
        for (let t = 0; t < 7; t += 1 / 30) { B.paso(1 / 30); invMax = Math.max(invMax, C.j.inv || 0); }
        quieta(1.5); C.r.cd = {}; C.r.energia = 100; C.r.distraida = 0; C.r.deslumbrada = 0; C.r.falla = 0; C.j.mareo = 0;
        const pj0 = C.j.plumas, gr = B.usar(C.r, 'golpe_ala');
        const vulnerable = gr.ok && C.j.plumas === pj0 - 1 && invMax <= 0.65;
        f.activacion = esSuyo && Math.abs(gasto - h.coste) < 1e-6 && h.coste > 0 && Math.abs(cd1 - h.cooldown) < 1e-6 && respeta && casi === 'espera' && efecto && conBoton && vulnerable;
        if (!f.activacion) nota.push('duelo: pausa ' + (G.pausa && G.pausa.motivos ? Array.from(G.pausa.motivos).join('+') : '-') + ', suyo ' + esSuyo + ', gasto ' + gasto.toFixed(1) + '/' + h.coste + ', espera ' + cd1.toFixed(2) + '/' + h.cooldown + ' respeta ' + respeta + ' casi ' + casi +
          ', efecto ' + efecto + ' (ya ' + ya + ', ev ' + evs.length + ', golpes ' + nGolpes + ', aleja ' + (dMax - d0).toFixed(1) + '), botón ' + conBoton + ', vulnerable ' + vulnerable + ' (inv máx ' + invMax.toFixed(2) + ', ala ' + gr.ok + ' ' + pj0 + '→' + C.j.plumas + ')');
        B.salir();
        check(e.sp + ' · ' + e.h.nombre + ': elegida en Mis cotorras, guardada, y su poder con G y botón (energía, espera, efecto, sin invulnerabilidad)',
          f.desbloqueo && f.activacion && f.guardado && f.ingles, nota.join(' · '));
      }
      // al final, una recarga más: la última elegida sigue elegida y nada se perdió
      V.recargar();
      check('Tras la última recarga sigue elegida la última y las 34 desbloqueadas', V.seleccionada() === ESP[ESP.length - 1].sp && ids.every(sel));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e); }
    regPoderes = null;
    try { if (B && B.estado().fase !== 'nada') B.salir(); } catch (e) { /* */ }
    try { G.ui.hideCard(); } catch (e) { /* */ }
    G.ui.toast = toast0; S.profile = prof0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = fac0;
    if (S.inv) { for (const k of Object.keys(S.inv)) if (!(k in inv0)) delete S.inv[k]; Object.assign(S.inv, inv0); }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); if (susp) susp(false);
    const tabla = Object.keys(fila).map(sp => ({ especie: sp, poder: fila[sp].poder, desbloqueo: fila[sp].desbloqueo, activacion: fila[sp].activacion, guardado: fila[sp].guardado, ingles: fila[sp].ingles }));
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out, tabla };
  }
  G.v18nuevas = { HITOS, revisar, revisarAlbum, albumLlega, pendientes, test, testPoderes };
  return G.v18nuevas;
};
