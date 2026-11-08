/* Juego · V18.1 «El mundo que cambia contigo» (Kelvin 5-nov) · frente D, D14: «sistemas conectados».
   Une los cuatro módulos del ciclo sin crear un sistema de eventos nuevo (solo escucha G.on('v18') y G.on('v18combate')):
     descubrir arausiaca (descubrir.js) → desbloquearla con su reto → elegirla → duelo contra la Campeona (combate.js) →
     2 maderas y 1 piedra en S.inv → reparar el puente colgante (reparar.js) → pista de un segundo objetivo opcional.
   - Tras la primera victoria que paga, si el puente sigue roto: la bandera verde del minimapa (G.minimapa.fijarDestino) señala
     la cabecera del puente; el aviso de victoria (combate.js) dice para qué sirven los materiales. Al repararlo se quita.
   - Segundo objetivo opcional (directiva V18.1, decisión 8 «pista clara de un segundo objetivo»), con lo que ya existe:
       · si todavía no tienes la cotorra de Dominica: «Dicen que en el bosque canta una cotorra de otra isla…» y la bandera a su rama;
       · si ya la tienes: «Reto extra: gana a la Campeona con la otra cotorra» (otro poder, otro duelo) y la bandera a la explanada.
     Cada victoria se apunta por especie con G.v18.otorgar('duelo_gana_<especie>') (idempotente, sin premio nuevo); con dos
     especies distintas el reto extra queda cumplido, una sola vez ('reto_dos_cotorras').
     La pista sale unos segundos después de reparar y, en otra sesión, al volver al puente (una vez por sesión).
   Solo con la bandera V18 (src/boot.js). Prueba integral del ciclo entero: AV.v18CicloTest(). */
window.AVV18Ciclo = function (G) {
  'use strict';
  if (G.v18ciclo) return G.v18ciclo;
  const V = G.v18, S = G.S;
  const PUENTE = 'puente_villa', DOMINICA = 'arausiaca', PISTA_S = 5, R_VOLVER = 22;
  const TXT = {
    pistaDominica: 'Dicen que en el bosque canta una cotorra de otra isla. Encuéntrala, síguela y prueba su poder en el duelo: la bandera verde del mapa te lleva.',
    pistaOtra: 'Reto extra: gana otra vez a la Campeona, ahora con esta cotorra: {}. Cámbiala en Mis cotorras; con otro poder el duelo se juega distinto.',
    cumplido: '¡Reto extra cumplido! Le ganaste a la Campeona con dos cotorras distintas.'
  };
  const NOMBRES = { vittata: 'Cotorra puertorriqueña', arausiaca: 'Cotorra de Dominica' };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 5200); } catch (e) { /* sin interfaz */ } };
  const reparado = () => V.mundo(PUENTE) === 'reparado';
  const rango = e => Math.max(0, V.ESTADOS.indexOf(e || 'no_descubierta'));
  const tieneDominica = () => rango(V.estado(DOMINICA)) >= rango('seleccionable');
  function nombre(id) {
    if (NOMBRES[id]) return NOMBRES[id];
    const E = window.AV_ESPECIES, e = E && Array.isArray(E.especies) && E.especies.find(x => x.id === id);
    return (e && e.comun && e.comun.es) || id;
  }
  // texto con un dato: el traductor (idioma.js) busca la plantilla con {} y la rellena igual en inglés
  const rellenar = (t, v) => t.replace('{}', v);

  // ---------- Dónde está cada cosa (lo dicen los propios módulos) ----------
  function puntoPuente() {
    const it = G.interaccion.list.find(i => i.id === 'v18_reparar_puente');
    return it ? { x: it.x, z: it.z } : null;
  }
  const puntoRival = () => (G.v18combate && G.v18combate.sitio ? { x: G.v18combate.sitio.x, z: G.v18combate.sitio.z } : null);
  const puntoDominica = () => { const p = G.v18descubrir && G.v18descubrir.P && G.v18descubrir.P[0]; return p ? { x: p.x, z: p.z } : null; };
  const seleccionables = () => (G.v18descubrir && G.v18descubrir.seleccionables ? G.v18descubrir.seleccionables() : [V.seleccionada()].filter(Boolean));

  // ---------- Guía: la bandera verde del minimapa ----------
  // Se recuerda aquí y se pone en cuanto el minimapa existe (se carga perezoso); solo se quita si sigue siendo la nuestra.
  const guia = { para: null, x: 0, z: 0, puesta: false };
  function guiar(para, p) {
    if (!p) return false;
    Object.assign(guia, { para, x: p.x, z: p.z, puesta: false });
    ponerGuia();
    return true;
  }
  function ponerGuia() {
    if (!guia.para || guia.puesta || !G.minimapa || !G.minimapa.fijarDestino) return;
    try { G.minimapa.fijarDestino(guia.x, guia.z); guia.puesta = true; } catch (e) { /* sin minimapa */ }
  }
  function destinoMapa() {
    try { return (G.minimapa && G.minimapa.marcadores ? G.minimapa.marcadores() : []).find(m => m.tipo === 'dest' && !m.auto) || null; } catch (e) { return null; }
  }
  function soltarGuia(para) {
    if (!guia.para || (para && guia.para !== para)) return false;
    const d = destinoMapa();
    if (d && Math.abs(d.x - guia.x) < 1 && Math.abs(d.z - guia.z) < 1) { try { G.minimapa.quitarDestino(); } catch (e) { /* sin minimapa */ } }
    guia.para = null; guia.puesta = false;
    return true;
  }

  // ---------- Segundo objetivo opcional ----------
  const ganoCon = sp => V.otorgado('duelo_gana_' + sp);
  // { texto, para, punto } o null si no queda nada que proponer (o el puente aún no está reparado)
  function pistaExtra() {
    if (!reparado() || V.otorgado('reto_dos_cotorras')) return null;
    if (!tieneDominica()) return { texto: TXT.pistaDominica, para: 'dominica', punto: puntoDominica() };
    const otra = seleccionables().find(sp => !ganoCon(sp));
    if (!otra) return null;
    return { texto: rellenar(TXT.pistaOtra, nombre(otra)), plantilla: TXT.pistaOtra, para: 'rival', punto: puntoRival(), especie: otra };
  }
  const E = { pistaT: 0, pistaSesion: false, ultimaPista: null, avisoTO: 0 };
  function darPista() {
    const p = pistaExtra(); if (!p) return null;
    E.pistaSesion = true; E.ultimaPista = p;
    toast(p.texto, 6500);
    guiar(p.para, p.punto);
    return p;
  }
  function alGanar() {
    const C = G.v18combate && G.v18combate.estado && G.v18combate.estado();
    const sp = C && C.j && C.j.especie; if (!sp) return;
    V.otorgar('duelo_gana_' + sp, 'victoria_' + sp, 1); // marca idempotente por especie (sin premio)
    const distintas = seleccionables().filter(ganoCon).length;
    if (distintas >= 2 && reparado() && V.otorgar('reto_dos_cotorras', 'reto_extra', 1)) {
      soltarGuia('rival');
      clearTimeout(E.avisoTO); E.avisoTO = setTimeout(() => toast(TXT.cumplido, 5000), 3400); // después del aviso de victoria
    }
  }

  // ---------- Conexiones ----------
  G.on('v18', ev => {
    if (!ev) return;
    // primera victoria que paga: si el puente sigue roto, la bandera verde va a su cabecera
    if (ev.tipo === 'recompensa' && ev.rewardKey === 'combate_1' && !reparado()) guiar('puente', puntoPuente());
    if (ev.tipo === 'mundo' && ev.id === PUENTE && ev.estado === 'reparado') { soltarGuia('puente'); E.pistaT = PISTA_S; E.pistaSesion = true; } // la pista sale una vez, después del «¡Puente reparado!» (4,5 s), no encima
    if (ev.tipo === 'especie' && ev.id === DOMINICA && tieneDominica()) soltarGuia('dominica');
  });
  G.on('v18combate', ev => { if (ev && ev.tipo === 'win') alGanar(); });
  // QA-212: tampoco con una actividad V18 en marcha (la cuenta atrás del duelo…; G.menuModos.ocupado, la de menu_modos.js) ni con la
  // portada (el menú de modos) o la pausa abiertas: no se puede ir a buscarla y tapa lo que hay en pantalla
  const otraCosa = () => {
    try {
      const t = document.getElementById('title'), p = document.getElementById('pause');
      return !!(G.menuModos && G.menuModos.ocupado && G.menuModos.ocupado()) || !!(t && t.open) || !!(p && p.matches && p.matches(':popover-open'));
    } catch (e) { return false; }
  };
  function paso(dt) {
    ponerGuia();
    // QA-212: con otra cosa en pantalla la pista espera (vuelve a mirar al segundo) en vez de salir encima
    if (E.pistaT > 0 && (E.pistaT -= dt) <= 0) { if (otraCosa()) E.pistaT = 1; else darPista(); }
    // al volver al puente (otra sesión), una vez: recuerda el reto extra
    if (!E.pistaSesion && reparado() && !otraCosa()) {
      const p = puntoPuente() || (G.v18Reparar && G.v18Reparar.P && G.v18Reparar.P.eje && { x: G.v18Reparar.P.eje.ax, z: G.v18Reparar.P.eje.az });
      if (p && Math.hypot(S.pos.x - p.x, S.pos.z - p.z) < R_VOLVER) { if (!darPista()) E.pistaSesion = true; }
    }
  }
  G.on('update', (dt, busy) => { if (!busy) paso(Math.min(dt, 0.1)); }, 48);

  // ---------- Prueba integral: el ciclo entero por la API pública de los módulos ----------
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const D = G.v18descubrir, Cb = G.v18combate, R = G.v18Reparar, F = G.fisica, M = F && F.MOVE;
    const clave = V.clave();
    let crudo = null; try { crudo = localStorage.getItem(clave); } catch (e) { /* sin almacenamiento */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, fac0 = S.facing, fly0 = M && M.flying, inv0 = Object.assign({}, S.inv);
    const guia0 = Object.assign({}, guia), E0 = Object.assign({}, E);
    const toasts = [], toast0 = G.ui.toast;
    G.ui.toast = (t, ms) => { toasts.push(String(t)); return toast0.call(G.ui, t, ms); };
    // errores de consola durante la prueba
    const errores = [], cerr0 = console.error;
    console.error = function () { errores.push(Array.from(arguments).map(String).join(' ')); return cerr0.apply(console, arguments); };
    const onErr = e => errores.push('error: ' + (e && (e.message || (e.reason && e.reason.message) || e.reason)));
    addEventListener('error', onErr); addEventListener('unhandledrejection', onErr);
    const evPoder = []; let mudo = false;
    G.on('v18poder', e => { if (!mudo) evPoder.push(e); });
    // cuadros reales del juego (física, módulos, dibujo) con dt fijo; si no hay renderer, el paso de cada módulo
    const cuadros = n => { for (let i = 0; i < n; i++) { try { G.renderer.render(0.05, false); } catch (e) { errores.push('cuadro: ' + e.message); break; } } };
    const ir = (p, dy) => { S.pos.x = p.x; S.pos.z = p.z; S.pos.y = (p.y != null ? p.y : G.terreno.height(p.x, p.z)) + (dy || 0); S.vy = 0; if (M) { M.vx = M.vz = 0; } };
    const usarIt = id => { const it = G.interaccion.list.find(i => i.id === id); if (!it || (it.visible && !it.visible())) return false; it.use(); return true; };
    try {
      if (!D || !Cb || !R) throw new Error('faltan módulos: ' + [!D && 'descubrir', !Cb && 'combate', !R && 'reparar'].filter(Boolean).join(', '));
      await D.listo;
      for (let i = 0; i < 60 && !(R.aplicar() && R.P.rotoIdx); i++) await new Promise(r => setTimeout(r, 250));
      // 0. Progreso limpio: sin especies nuevas, sin materiales, puente roto, sin guía
      try { Cb.salir(); } catch (e) { /* sin duelo abierto */ }
      V.borrar(); V.recargar(); R.aplicar(); soltarGuia(); E.pistaT = 0; E.pistaSesion = true;
      if (D.R) D.R.activo = false;
      S.inv.madera = 0; S.inv.piedra = 0;
      const perfil = V.seleccionada();
      check('Progreso limpio: Dominica sin descubrir, puente roto, sin materiales', V.estado(DOMINICA) === 'no_descubierta' && R.estado() === 'roto' && !V.otorgado('combate_1') && S.inv.madera === 0, 'perfil ' + perfil);

      // 1. Descubrir: Vittata se acerca a la copa donde canta (en el suelo, bajo el árbol)
      const P0 = D.P[0];
      ir({ x: P0.x + 5, z: P0.z + 3 }); cuadros(2); D.paso(0.1);
      check('1 · Descubrir: al acercarse a su árbol, arausiaca queda descubierta', V.estado(DOMINICA) === 'descubierta' && toasts.some(t => /Descubriste una cotorra de Dominica/.test(t)), V.estado(DOMINICA));

      // 2. Desbloquear: su reto (seguirla volando de copa en copa)
      toasts.length = 0;
      const okReto = usarIt('v18_cotorra_dominica');
      let saltos = 0;
      for (let k = 1; k <= D.P.length - 1 && D.R.activo; k++) {
        for (let t = 0; t < 0.6; t += 0.1) D.paso(0.1);
        ir(D.P[k], 1.5); if (M) M.flying = true; D.paso(0.1); saltos++;
      }
      check('2 · Desbloquear: con Acción empieza el reto y seguirla por las copas la desbloquea', okReto && V.estado(DOMINICA) === 'seleccionable' && toasts.some(t => /ya vuela contigo/.test(t)), 'saltos ' + saltos + ', ' + V.estado(DOMINICA));
      if (M) M.flying = false;
      for (let t = 0; t < 4; t += 0.1) D.paso(0.1); // vuelve a su rama

      // 3. Elegirla en la tarjeta, como el jugador
      ir({ x: P0.x + 4, z: P0.z }); D.paso(0.1);
      const ids = D.abrirSeleccion(), bt = G.ui.$('card').querySelector('[data-v18sp="' + DOMINICA + '"]');
      check('3 · La tarjeta muestra el poder real de cada una', bt && /Escudo de plumas/.test(bt.textContent) && !/Columna de nube|Ráfaga doble/.test(G.ui.$('card').textContent), bt && bt.textContent);
      if (bt) bt.click();
      check('3 · Seleccionarla: arausiaca es la cotorra del duelo', V.seleccionada() === DOMINICA && V.estado(DOMINICA) === 'seleccionada' && !G.ui.cardOpen, ids.join(','));

      // 4. Duelo: ir a la explanada y retar a la Campeona hablando con ella (rival de arausiaca = ventralis: su poder es el que le da habilidades.js,
      // Grito del Yunque o, con nuevas.js cargado —siempre con la V18 por defecto—, Eco de la Cordillera)
      const sitio = Cb.sitio;
      for (let i = 0; i < 40 && !G.interaccion.list.find(it => it.id === 'v18_rival' && it.visible()); i++) await new Promise(r => setTimeout(r, 250)); // el modelo de la rival carga aparte
      ir({ x: sitio.x - 2, z: sitio.z }); cuadros(2);
      toasts.length = 0; evPoder.length = 0;
      const retada = usarIt('v18_rival');
      const C = Cb.estado();
      check('4 · El duelo usa el poder de la especie elegida (Escudo de plumas); la rival grita',
        retada && C.j.especie === DOMINICA && C.j.poder === 'escudo_plumas' && C.r.poder === G.v18hab.poderDe(C.r.especie) && ['grito_yunque', 'eco_cordillera'].indexOf(C.r.poder) >= 0 && C.fase === 'cuenta', C.j && (C.j.especie + ' / ' + C.j.poder + ' vs ' + C.r.especie + ' / ' + C.r.poder));
      for (let t = 0; t < 4 && C.fase === 'cuenta'; t += 0.05) Cb.paso(0.05);
      // Pelea con la API pública del duelo: escudo cuando la rival está cerca, ala a tiro, semilla lejos. Si se pierde, «Otra vez».
      let intentos = 1, escudosJ = 0;
      for (let t = 0; t < 180 && C.resultado !== 'win'; t += 0.05) {
        if (C.fase === 'fin') { if (C.resultado === 'loss') { intentos++; Cb.otraVez(); continue; } break; }
        if (C.fase !== 'lucha') { Cb.paso(0.05); continue; }
        const d = Math.hypot(C.r.pos.x - S.pos.x, C.r.pos.z - S.pos.z);
        S.facing = { x: (C.r.pos.x - S.pos.x) / (d || 1), z: (C.r.pos.z - S.pos.z) / (d || 1) };
        if (d < 3.5 && C.j.escudo <= 0) { /* se cubre cuando la rival llega encima */ if (Cb.usar(C.j, 'escudo_plumas').ok) escudosJ++; }
        if (d < 2.3) Cb.usar(C.j, 'golpe_ala');
        else if (d > 5 && C.j.energia > 60 && escudosJ > 0) Cb.usar(C.j, 'semilla'); /* semillas tras probar el escudo: si no, se gana de lejos sin que llegue */
        Cb.paso(0.05);
      }
      check('4 · Se gana a la Campeona', C.resultado === 'win', 'intentos ' + intentos + ', plumas ' + (C.j && C.j.plumas) + '-' + (C.r && C.r.plumas));
      check('4 · El jugador usó su Escudo de plumas en el duelo (v18poder del jugador)', escudosJ > 0 && evPoder.some(e => e.id === 'escudo_plumas' && e.de === 'jugador'), 'escudos ' + escudosJ + ', bloqueos ' + C.stats.bloqueos);
      const hudC = document.querySelector('#v18-duelo [data-k="centro"]');
      for (let t = 0; t < 2.2; t += 0.05) Cb.paso(0.05);
      check('4 · El aviso del centro se borra solo al terminar', !hudC || hudC.textContent === '', hudC && JSON.stringify(hudC.textContent));

      // 5. Recompensa: 2 maderas y 1 piedra en el inventario del juego; el aviso dice para qué y la guía señala el puente
      const pp = puntoPuente();
      check('5 · Recibe 2 maderas y 1 piedra (S.inv)', S.inv.madera === 2 && S.inv.piedra === 1 && V.otorgado('combate_1'), 'madera ' + S.inv.madera + ', piedra ' + S.inv.piedra);
      check('5 · El aviso de victoria dice que sirven para el puente y señala la bandera del mapa', toasts.some(t => /puente/.test(t) && /bandera verde/.test(t)), toasts.join(' | '));
      const dm = destinoMapa();
      check('5 · Guía al puente: la bandera verde (destino del minimapa) está en la cabecera del puente', pp && guia.para === 'puente' && Math.hypot(guia.x - pp.x, guia.z - pp.z) < 1 && (!G.minimapa || (dm && Math.hypot(dm.x - pp.x, dm.z - pp.z) < 1)),
        (G.minimapa ? 'minimapa ' + JSON.stringify(dm) : 'minimapa sin cargar') + ' · puente ' + (pp && Math.round(pp.x) + ',' + Math.round(pp.z)));

      // 6. Reparar: salir de la explanada caminando hacia el puente y usar la cabecera
      ir({ x: sitio.x - 30, z: sitio.z }); Cb.paso(0.05);
      check('6 · Al alejarse, el duelo se cierra solo', C.fase === 'nada');
      ir(pp); cuadros(2);
      // QA-212: con una actividad V18 en marcha (G.menuModos.ocupado) la pista del reto extra espera y no se pierde
      {
        const sapoBk = G.v18sapo; G.v18sapo = { estado: () => ({ fase: 'cuenta' }) };
        const t0 = E.pistaT, n0 = toasts.length; E.pistaT = 0.05; paso(0.1); const espero = E.pistaT > 0 && toasts.length === n0;
        if (sapoBk === undefined) delete G.v18sapo; else G.v18sapo = sapoBk;
        E.pistaT = t0;
        check('QA-212 · La pista del reto extra no sale con una actividad V18 en marcha: espera', !G.menuModos || espero, 'pistaT ' + E.pistaT + ' · ' + toasts.slice(n0).join(' | '));
      }
      toasts.length = 0; E.pistaSesion = false; // como en una partida real: el recordatorio de «volver al puente» está armado
      const rep = usarIt('v18_reparar_puente');
      check('6 · Reparar el puente gasta exactamente 2 maderas y 1 piedra', rep && R.estado() === 'reparado' && S.inv.madera === 0 && S.inv.piedra === 0 && R.P.piso.when() === true, 'madera ' + S.inv.madera + ', piedra ' + S.inv.piedra);
      check('6 · Al reparar se quita la guía del puente', guia.para !== 'puente' && (!G.minimapa || !destinoMapa()));
      toasts.length = 0; paso(0.1);
      check('6 · Recién reparado, el «Reto extra» no pisa al aviso «¡Puente reparado!»', !toasts.some(t => /Reto extra/.test(t)) && E.pistaT > 4, toasts.join(' | '));
      for (let t = 0; t < PISTA_S + 0.5; t += 0.1) paso(0.1);
      const pista = E.ultimaPista;
      check('7 · Pista del segundo objetivo opcional (reto extra con la otra cotorra) y bandera a la explanada',
        pista && pista.para === 'rival' && pista.especie === (perfil || 'vittata') && toasts.some(t => /Reto extra/.test(t)) && guia.para === 'rival', toasts.join(' | '));

      // 7. Recargar y volver a aplicar: especie, materiales gastados y puente siguen
      V.recargar(); R.P.malla.geometry.index.array.set(R.P.rotoIdx); R.aplicar();
      const igual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
      check('8 · Tras recargar: arausiaca sigue elegida, materiales gastados, puente reparado (malla y piso)',
        V.seleccionada() === DOMINICA && S.inv.madera === 0 && S.inv.piedra === 0 && R.estado() === 'reparado' && R.P.piso.when() === true && igual(Array.from(R.P.malla.geometry.index.array), Array.from(R.P.idx0)));
      let guardado = null; try { guardado = JSON.parse(localStorage.getItem(clave)); } catch (e) { /* sin almacenamiento */ }
      check('8 · Guardado <almacen>.v18 coherente', guardado && guardado.sel === DOMINICA && guardado.mundo[PUENTE] === 'reparado' && guardado.otorgados.combate_1 && guardado.otorgados['duelo_gana_' + DOMINICA], clave);

      // 8. Ganar otra vez no paga; con la otra cotorra se cumple el reto extra
      ir({ x: sitio.x - 2, z: sitio.z }); toasts.length = 0;
      D.elegir(perfil || 'vittata');
      Cb.iniciar({ sinCuenta: true });
      const quieta = () => { C.r.pensar = 99; C.r.esquivaT = 99; C.r.poderT = 99; C.r.mov.t = 0; C.r.pos.x = S.pos.x + 1.2; C.r.pos.z = S.pos.z; };
      // aviso de la rival tras un golpe al escudo (frente A): sale «¡Bloqueado!» y se borra solo aunque el duelo no avance
      quieta(); const rEsc = Cb.usar(C.r, 'escudo_plumas'), rGolpe = Cb.usar(C.j, 'golpe_ala');
      const txtBloq = hudC && hudC.textContent;
      await new Promise(r => setTimeout(r, 1500));
      check('9 · Tras un golpe al escudo, el aviso «¡Bloqueado!» de la rival se borra solo (sin quedarse en pantalla)',
        rEsc.ok && rGolpe.ok && !rGolpe.acierto && /Bloquead|Blocked/.test(txtBloq || '') && hudC.textContent === '', JSON.stringify({ antes: txtBloq, despues: hudC && hudC.textContent }));
      C.r.plumas = 1; C.r.escudo = 0; C.r.inv = 0; C.j.cd.golpe_ala = 0; quieta();
      Cb.usar(C.j, 'golpe_ala');
      check('9 · Ganar otra vez no da materiales', C.resultado === 'win' && S.inv.madera === 0 && S.inv.piedra === 0 && toasts.some(t => /ya te los llevaste/.test(t)), 'madera ' + S.inv.madera + ' · ' + toasts.join(' | '));
      check('9 · Con dos cotorras distintas el reto extra queda cumplido (una vez)', V.otorgado('reto_dos_cotorras') && guia.para !== 'rival' && !pistaExtra());
      Cb.salir();
      cuadros(3);
      check('Sin errores de consola en todo el ciclo', errores.length === 0, errores.slice(0, 3).join(' | '));
    } catch (e) { check('Sin excepciones', false, e && (e.stack || e.message)); }
    // dejarlo todo como estaba
    mudo = true;
    try { Cb && Cb.salir(); } catch (e) { /* ya fuera */ }
    try { if (G.ui.cardOpen) G.ui.hideCard(); } catch (e) { /* sin tarjeta */ }
    G.ui.toast = toast0; console.error = cerr0;
    removeEventListener('error', onErr); removeEventListener('unhandledrejection', onErr);
    soltarGuia(); Object.assign(guia, guia0); Object.assign(E, E0); E.ultimaPista = null;
    Object.assign(S.pos, pos0); S.facing = fac0; if (M) { M.flying = fly0; M.vx = M.vz = 0; }
    for (const k of Object.keys(S.inv)) if (!(k in inv0)) delete S.inv[k];
    Object.assign(S.inv, inv0); try { G.objetos.renderInv(); } catch (e) { /* sin HUD */ }
    try { if (crudo == null) localStorage.removeItem(clave); else localStorage.setItem(clave, crudo); } catch (e) { /* sin almacenamiento */ }
    V.recargar();
    try { R && R.aplicar(); } catch (e) { /* sin puente */ }
    clearTimeout(E.avisoTO);
    try { if (D) { D.R.activo = false; D.B.vuelo = null; Object.assign(D.B.pos, { x: D.P[0].x, y: D.P[0].y, z: D.P[0].z }); } } catch (e) { /* sin cotorra */ }
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.v18ciclo = { TXT, pistaExtra, darPista, guia, paso, test };
  return G.v18ciclo;
};
