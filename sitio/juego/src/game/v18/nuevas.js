/* Juego · V18.1 · nuevas cotorras para la bandada (Kelvin 5-nov: «las especies deben descubrirse y desbloquearse
   progresivamente; no entregar las 36 desde el inicio»). Seis más, cada una con su poder de V18_MATRIZ_36.md:
     ganar el primer duelo            → amazona de pico negro (agilis)        · Quiebro (ALAS)
     reparar el puente colgante       → loro corona azul (farinosa)           · Ala fuerte (ALAS)
     dispersar la Sombra de Tormenta  → cotorra cabeciamarilla (barbadensis)  · Lluvia de semillas (PICO)
     ganar el duelo con otra cotorra  → loro yucateco (xantholora)            · Ojo del cenote (OJOS)
     deshacer la Serpiente de la Maraña → loro de San Vicente (guildingii)    · Abanico de colores (PLUMAS)
     despertar al Sapo Encantado      → loro diadema (diadema)                · Semilla de río (PICO)
   Llegan solas al cumplir el hito (aviso y a «Mis cotorras»); en partidas viejas que ya lo cumplían, sin aviso.
   Solo cambia el poder del duelo y de la amenaza: el personaje del jugador se queda igual. Mara y Vela (martinicana,
   violacea) son consejeras en la temporada 1 y no entran aquí. Solo con la bandera V18.
   Prueba: AV.v18NuevasTest() (hitos y los 6 poderes en el duelo). */
window.AVV18Nuevas = function (G) {
  'use strict';
  if (G.v18nuevas) return G.v18nuevas;
  const V = G.v18, H = G.v18hab, S = G.S;
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 5200); } catch (e) { /* sin interfaz */ } };
  const rango = e => Math.max(0, V.ESTADOS.indexOf(e || 'no_descubierta'));
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
      txt: '¡El Sapo despertó y un loro diadema vino a ver qué pasaba! Su poder: Semilla de río.' }
  ];
  const TXT = { elige: 'Elígela en Pausa → Mis cotorras.', eligeM: 'Elígelo en Pausa → Mis cotorras.' }; // m: el aviso habla de «un loro»
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
    if (!ev || ev.tipo !== 'win' || ev.de !== 'jugador') return;
    const C = G.v18combate && G.v18combate.estado(), sp = C && C.j && C.j.especie;
    if (sp && sp !== 'vittata') V.otorgar('combate_otra', 'victoria_otra', 1);
    setTimeout(() => revisar(true), 3600); // después del aviso de victoria (antes lo tapaba al instante)
  });
  G.on('v18', ev => { if (ev && (ev.tipo === 'mundo' || ev.tipo === 'recompensa')) setTimeout(() => revisar(true), 4200); }); // tras «¡Puente reparado!» y el premio de la Sombra
  G.on('apply', () => setTimeout(() => revisar(false), 0), 97);
  setTimeout(() => revisar(false), 0);

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
      check('Cada una tiene su poder propio', H.poderDe('agilis') === 'quiebro' && H.poderDe('farinosa') === 'ala_fuerte' && H.poderDe('barbadensis') === 'lluvia_semillas' && H.poderDe('xantholora') === 'ojo_cenote' &&
        H.poderDe('guildingii') === 'abanico_colores' && H.poderDe('diadema') === 'semilla_rio',
        ids.map(H.poderDe).join(','));
      check('No avisa dos veces la misma', revisar(true).length === 0);
      check('Mara y Vela no se pueden elegir (consejeras en la temporada 1)', rango(V.estado('martinicana')) < 1 && rango(V.estado('violacea')) < 1);

      // ---- Los 6 poderes en el duelo, a paso fijo ----
      if (B && B.iniciar) {
        const C = B.estado(), corre = s => { for (let t = 0; t < s; t += 1 / 30) B.paso(1 / 30); };
        const quieta = dx => { C.r.pos.x = S.pos.x + dx; C.r.pos.z = S.pos.z; C.r.pos.y = G.terreno.height(C.r.pos.x, C.r.pos.z); /* la altura de donde se pone, no la de antes: la semilla apunta a esa altura */ C.r.pensar = 99; C.r.esquivaT = 99; C.r.poderT = 99; C.r.golpeT = 99; C.r.tiroT = 99; C.r.mov.t = 0; C.r.kb.t = 0; };
        const listo = () => { C.j.cd = {}; C.j.energia = 100; C.j.mareo = 0; C.r.mareo = 0; C.r.inv = 0; C.r.escudo = 0; C.r.marcada = 0; };
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
      } else check('El duelo está cargado', false);
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e); }
    try { if (B && B.estado().fase !== 'nada') B.salir(); } catch (e) { /* */ }
    G.ui.toast = toast0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.facing = fac0; S.inv = inv0;
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  G.v18nuevas = { HITOS, revisar, test };
  return G.v18nuevas;
};
