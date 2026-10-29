/* QA · prueba E2E de aceptación (AV.e2eTest) · validador independiente
   Recorre el CAPÍTULO 1 de principio a fin en un iframe del mismo origen con el almacenamiento del juego vacío (build limpia)
   y sin tocar la partida de la pestaña: se guarda al empezar y se devuelve igual al terminar.
     0. Portada → creador (la build arranca limpia y el creador se abre).
     1. Elegir cotorra en el creador sin cambiar su diseño (mismo modelo, huesos y vértices; solo cambia el plumaje).
     2. Equipar un accesorio, guardar y ver la escena de inicio del capítulo (el gancho se juega, no se salta).
     3. Obtener un huevo en el criadero y ver la animación de patitas en la eclosión (BLOQUEADO si no hay criadero).
     4. Las 8 etapas de la historia con las acciones del jugador (Acción, botones de tarjetas y diálogos, buceo con C):
        4.2 Iguaca llama desde la copa (el primer vuelo del capítulo: se mide cuándo llega) · 4.1 taller · 4.3 recolección y M1 (bucear) ·
        4.4 «La ruta de la gota» p1–p8 y «Iguaca te pregunta» · 4.5 construir y la crecida (se agarra al vuelo algo que arrastra el río
        y se suelta en seco) · 4.6 corregir (rama A) o reubicar · 4.7 Guardián · 4.8 transmisor y M3 (Simon de coquíes) ·
        4.9 mirador y pantalla final (con «Seguir explorando» si el pack lo ofrece) · 4.10 objetivo y guía en cada paso.
        Los bocadillos libres (G.dialogo.say(..., { libre: true }), DIVERSION_CAP1 mejora 3) se cuentan aparte: no paran el juego.
     5. Guardar a mitad del capítulo, recargar el iframe y verificar que todo persiste (y se sigue jugando tras recargar).
     6. Eventos narrativos → viñetas del cómic (con el nombre del jugador) → exportar PNG (se decodifica; 1080×1520 hasta 4 viñetas).
     7. Guardar al final, recargar y verificar que el capítulo sigue completo.
     T. Duración: mínimo automático del recorrido (ver el modelo más abajo; NO sustituye medir con jugadores).
   Cada paso da ok / falla / BLOQUEADO con su evidencia. Atajos permitidos, siempre dichos en la evidencia: AV.teleport (en vez
   de caminar), volar a un punto en la ruta de la gota, XP de prueba en el criadero. Lo que NO se salta: cada avance de la
   historia sale de G.interaccion.action() ante el objeto real (o del botón real de la tarjeta o del diálogo); no se llama a
   advanceTo() ni se escribe en S.step, S.missions o S.refuge.
   Opciones: { rama: 'A' (defecto: construir junto al río, ver la crecida y corregir en la colina) | 'B' (colina directa),
               keep: true (deja el iframe), timeout: ms de espera de arranque }.
   Modelo de duración (todo se mide en la propia prueba; las constantes están abajo):
     tiempo mínimo = segundos de juego simulados (esperas del juego: crecida, vapor, gota, buceo…)
                   + trayectos (distancia de los teleports / velocidad de carrera o de vuelo del juego)
                   + (líneas de diálogo + clics en botones de tarjetas) × 0,8 s (solo pulsar, sin leer).
     «Leyendo» cambia las líneas por sus caracteres / 15 por segundo (~180 palabras por minuto, un adulto que lee); el texto de las
     tarjetas no se cuenta, así que ambas cifras son cotas inferiores.
   Carga: tests/qa/qa.js lo inyecta solo (?qa=1); a mano: inyectar este archivo y  await AV.e2eTest(). */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 80); }
    return null;
  }
  const s = v => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };
  const SEG_POR_PULSACION = 0.8;   // pulsar «Seguir» o el botón de una tarjeta, sin leer
  const CAR_POR_SEG = 15;      // lectura de un adulto (~180 palabras por minuto)
  const fmt = seg => { seg = Math.round(seg); const m = Math.floor(seg / 60); return m ? m + ' min ' + (seg % 60) + ' s' : seg + ' s'; };

  async function e2eTest(opts) {
    opts = opts || {};
    const rama = String(opts.rama || 'A').toUpperCase() === 'B' ? 'B' : 'A';
    const out = [], t0 = performance.now(); let tUlt = t0;
    // ms: tiempo real (de pared) desde el resultado anterior; tAcum: segundos desde el inicio. Dicen cuánto tarda cada paso y dónde se corta
    const check = (paso, nombre, estado, evidencia, max) => { const ahora = performance.now(); out.push({ paso, name: paso + ' · ' + nombre, ok: estado === true, estado: estado === true ? 'ok' : estado === 'bloqueado' ? 'BLOQUEADO' : 'falla', extra: s(evidencia).slice(0, max || 400), ms: Math.round(ahora - tUlt), tAcum: Math.round((ahora - t0) / 100) / 10 }); tUlt = ahora; };
    const pack = (window.AV && window.AV.G && window.AV.G.pack) || {};
    const prefijo = (pack.meta && pack.meta.almacen) || 'amazonaverse';
    // Respaldo de todo lo del juego en localStorage (partida, criadero, aula, sonido…)
    const respaldo = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefijo)) respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
    const limpiar = () => { try { for (const k of Object.keys(localStorage)) if (k.startsWith(prefijo)) localStorage.removeItem(k); } catch (e) { /* */ } };
    limpiar();
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
    const url = new URL(location.href); url.search = ''; url.hash = '';
    const abrir = async (viejo) => {
      const W = await until(() => { const w = fr.contentWindow; return w && !(viejo && w.__avViejo) && w.AV && w.AV.G && (w.AV.G.actores.player3D || w.AV.G.actores.failed3D) && w; }, opts.timeout || 180000, 100);   // con la máquina cargada (otros agentes) el arranque tarda más de 60 s
      if (W) { await sleep(800); const t = W.document.getElementById('title'); if (t && t.open) { const b = t.querySelector('button'); if (b) b.click(); else t.close(); } await sleep(300); }
      return W;
    };
    fr.src = url.href;
    document.body.appendChild(fr);

    let W = null, G, S, T, $, errores0 = 0, duracion = null, ultimoCercano = null;
    const erroresAcum = [];
    const enlazar = () => { G = W.AV.G; S = G.S; T = G.pruebas; $ = id => W.document.getElementById(id); };
    const cerrarVentana = () => { erroresAcum.push(...(W.__aveErrores || []).slice(errores0)); errores0 = 0; };

    // ---------- Reloj de la prueba (modelo de duración) ----------
    const reloj = { sim: 0, suelo: 0, aire: 0, lineas: 0, car: 0, clics: 0, acciones: 0, libres: 0, carLibres: 0 }; // libres: bocadillos que no paran el juego (no suman al mínimo)
    let primerVuelo = null;   // cuándo llega el primer vuelo del recorrido (DIVERSION_CAP1, mejora 1: antes de 90 s)
    const intrusos = [], vistas = [];   // vistas: quién habla y con qué retrato en cada línea de diálogo
    const fasesHechas = []; let faseAct = null;
    const velSuelo = () => (G && G.fisica && G.fisica.RUN_SPEED) || 10.5, velAire = () => (G && G.fisica && G.fisica.FLY_SPEED) || 12;
    const seg = (d, lectura) => d.sim + d.suelo / velSuelo() + d.aire / velAire() + d.clics * SEG_POR_PULSACION + (lectura ? d.car / CAR_POR_SEG : d.lineas * SEG_POR_PULSACION);
    const cerrarFase = () => { if (!faseAct) return; const a = faseAct.ini, d = {}; for (const k of Object.keys(a)) d[k] = reloj[k] - a[k]; fasesHechas.push({ nombre: faseAct.nombre, d }); faseAct = null; };
    const fase = nombre => { cerrarFase(); faseAct = { nombre, ini: Object.assign({}, reloj) }; };

    // ---------- Acciones del jugador (lo que se hace con el teclado, el ratón o el dedo) ----------
    const tick = secs => { T.tick(secs); reloj.sim += Math.ceil(secs / 0.05) * 0.05; };
    // Pulsar «Seguir» hasta cerrar el diálogo, contando líneas y caracteres que leería el niño. Los bocadillos libres también se
    // pasan (así llegan sus «done»), pero se cuentan aparte: la cotorra sigue jugando mientras salen
    const drain = () => {
      let n = 0;
      while (G.dialogo.activo() && n++ < 150) {
        const a = G.dialogo.actual();
        if (a.libre) { reloj.libres++; reloj.carLibres += (a.text || '').length; } else { reloj.lineas++; reloj.car += (a.text || '').length; }
        vistas.push({ who: a.who, img: a.img || '', libre: !!a.libre });
        if (a.libre) G.dialogo.next(); else $('d-next').click();
      }
      return n;
    };
    const click = id => { const b = $(id); if (b && !b.disabled && !(b.closest && b.closest('[hidden]'))) { b.click(); reloj.clics++; return true; } return false; };
    const ir = (x, z, fx, fz) => { reloj.suelo += Math.hypot(x - S.pos.x, z - S.pos.z); T.teleport(x, z, fx, fz); };
    const volar = (x, y, z, seguir) => { if (!seguir) reloj.aire += Math.hypot(x - S.pos.x, y - S.pos.y, z - S.pos.z); S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; G.fisica.MOVE.flying = true; };
    // Un diálogo o una tarjeta suelta (p. ej. Iguaca presenta el nido) taparía la acción: se cierra y se anota
    const despejar = quien => {
      if (G.dialogo.open()) { const t = ($('d-who').textContent || '?') + ': ' + ($('d-text').textContent || '').slice(0, 50); drain(); intrusos.push((quien || '') + ' → ' + t); }
      if (!$('card').hidden) { intrusos.push((quien || '') + ' → tarjeta: ' + ($('card').textContent || '').slice(0, 40)); G.ui.hideCard(); }
    };
    // Acción ante un objeto real: se acerca (teleport), se verifica que es el más cercano y se pulsa Acción
    const useAt = (id, ox, oz) => {
      despejar(id);
      const it = G.interaccion.find(id); if (!it) { ultimoCercano = 'no existe ' + id; return false; }
      reloj.suelo += Math.hypot(it.x + (ox || 0.9) - S.pos.x, it.z + (oz || 0) - S.pos.z); reloj.sim += 0.1; reloj.acciones++;
      const ok = T.useAt(id, ox, oz);
      if (!ok) { const nb = G.interaccion.nearest(); ultimoCercano = nb ? nb.id : 'ninguno'; }
      return ok;
    };
    const had = k => G.eventos.had(k);
    const hudAhora = () => { const li = W.document.querySelector('#steps li.now'); return li ? li.textContent.trim() : ''; };
    const guias = [];
    const muestraGuia = () => { let g = null; try { g = G.misiones.guideTarget(); } catch (e) { g = null; } guias.push({ paso: S.step, hud: hudAhora().slice(0, 40), guia: !!g && typeof g === 'object' }); };
    const hitoRopa = h => (G.pack.ropa || []).filter(u => u.hito === h).map(u => u.clave);
    const ropaOk = h => hitoRopa(h).every(k => S.unlocked.includes(k));
    // Frena el recorrido si una etapa clave falla: lo que sigue depende de ella
    const corte = (paso, ok, que) => { if (ok) return false; check('!', 'El recorrido no puede seguir tras ' + paso, false, que || 'etapa anterior fallida'); return true; };

    try {
      W = await abrir();
      if (!W) { check('0', 'La build arranca limpia en un iframe', false, 'sin window.AV en ' + Math.round((opts.timeout || 180000) / 1000) + ' s'); return fin(); }
      enlazar();
      errores0 = (W.__aveErrores || []).length;
      check('0', 'La build arranca limpia (sin partida guardada, el creador se abre)', !$('creator').hidden && !S.profile.created, { creador: !$('creator').hidden, version: W.AVE.version, modulos: W.AVE.modules().length });

      // ---------- 1. Elegir cotorra sin cambiar su diseño ----------
      const firma = ch => { let v = 0, m = 0, b = []; ch.root.traverse(o => { if (o.isBone) b.push(o.name); if ((o.isMesh || o.isSkinnedMesh) && !o.userData.isAccessory) { m++; v += o.geometry.attributes.position.count; } }); return { vertices: v, mallas: m, huesos: b.length, nombres: b.join(',').length }; };
      const ref = firma(await W.AVCharacter.create());
      const sel = $('p-species');
      const opciones = sel ? [...sel.options].map(o => o.value) : [];
      const especie = opciones.find(v => v && v !== sel.value) || opciones[0];
      if (sel && especie) { sel.value = especie; sel.dispatchEvent(new W.Event('change', { bubbles: true })); sel.dispatchEvent(new W.Event('input', { bubbles: true })); }
      await sleep(600);
      const showcase = W.AVShowcase && W.AVShowcase.status ? W.AVShowcase.status() : 'sin showcase';
      check('1', 'El creador ofrece cotorras y se elige una', !!especie, { opciones, elegida: especie, showcase });

      // ---------- 2. Equipar un accesorio, guardar y ver el gancho del capítulo ----------
      const thumbs = [...W.document.querySelectorAll('#creator button.thumb:not([disabled])')].filter(b => b.dataset.id && !/^nada$|^none$/i.test(b.dataset.id));
      const pieza = thumbs.find(b => /gorra|sombrero|lentes|gafas/.test(b.dataset.id)) || thumbs[0];
      if (pieza) pieza.click();
      await sleep(400);
      // Nombre: de las listas (seguridad infantil, sin texto libre) si existen; si no, el campo de texto de siempre
      const na = $('p-name-a'), nb = $('p-name-b'), nombre = $('p-name');
      if (na && nb) { na.selectedIndex = 1 % na.options.length; nb.selectedIndex = 1 % nb.options.length; for (const e of [na, nb]) e.dispatchEvent(new W.Event('change', { bubbles: true })); }
      else if (nombre && 'value' in nombre && nombre.tagName === 'INPUT') { nombre.value = 'Nube E2E'; nombre.dispatchEvent(new W.Event('input', { bubbles: true })); }
      $('p-save').click();                                          // sin G.quiet: el gancho del capítulo se juega como lo vería el niño
      const hayInicio = await until(() => G.dialogo.activo(), 45000, 50);   // el temporizador de 300 ms llega tarde si la máquina está cargada
      fase('Inicio');
      const a0 = hayInicio ? G.dialogo.actual() : null, quien0 = a0 ? a0.who : '', texto0 = a0 ? a0.text : '', inicioLibre = !!a0 && a0.libre && !G.ui.busy();
      const nInicio = drain();
      const toastInicio = !$('toast').hidden ? $('toast').textContent : '';
      await sleep(200);
      const look = S.profile && S.profile.look ? S.profile.look : {};
      const accs = Object.values(look.accessories || {}).map(a => a.id);
      check('2', 'Equipar un accesorio y guardar (creador cerrado, perfil con la pieza)', S.profile.created && $('creator').hidden && !!pieza && accs.includes(pieza.dataset.id),
        { pieza: pieza && pieza.dataset.id, especie: look.species, accesorios: accs, nombre: S.profile.name });
      check('4.0', 'Inicio del capítulo: al empezar se juega el gancho (Narrador y Vittata, en bocadillos que no paran el juego) y queda el objetivo «Vuela hasta Iguaca»', !!hayInicio && inicioLibre && nInicio >= 3 && S.step === 0 && !S.complete && /Iguaca/i.test(hudAhora()),
        { lineas: nInicio, libre: inicioLibre, primera: quien0 + ': ' + texto0.slice(0, 60), aviso: toastInicio.slice(0, 60), paso: S.step, hud: hudAhora() });
      // El jugador nunca cambia de modelo: misma firma que el modelo base (solo plumaje y accesorios)
      const comp = G.actores.companion3D, prota = G.actores.player3D;
      const fComp = comp ? firma(comp) : null, fProta = prota ? firma(prota) : null;
      check('1', 'Sin cambiar su diseño: mismo modelo, huesos y vértices que la cotorra base', !!fProta && s(fProta) === s(ref) && (!fComp || s(fComp) === s(ref)) && look.species === especie,
        { base: ref, protagonista: fProta, companero: fComp || 'sin compañero 3D', especie: look.species });
      T.drain();

      // ---------- 3a. Obtener un huevo (criadero) ----------
      const CR = G.criadero;
      // Juego normal (sin ?criadero=1): antes de la primera misión no hay nido en el mundo ni botón «Nido» (d4a7a45)
      const nidoMundo = () => G.renderer.scene.getObjectByName('nido_criadero');
      const nidoAntes = { boton: !!$('b-nido') && !$('b-nido').hidden, nido: !!(nidoMundo() && nidoMundo().visible) };
      if (!CR) check('3', 'Obtener un huevo y ver las patitas en la eclosión', 'bloqueado', 'el criadero no está integrado en esta build (G.criadero no existe)');
      else {
        await CR.abrir();
        await until(() => CR.estado().capsulas && Object.keys(CR.estado().capsulas).length, 5000);
        const est = CR.estado(), id = est.activa || 'clasico', cap = est.capsulas[id];
        check('3', 'Se obtiene un huevo al abrir el criadero (cápsula de nido incubando)', !!cap && /incubando|lista/.test(cap.estado), { activa: id, estado: cap && cap.estado, xp: cap && cap.xp });
        CR.cerrar && CR.cerrar();
      }
      const xpAntes = CR ? (CR.estado().capsulas[CR.estado().activa || 'clasico'] || {}).xp || 0 : 0;

      // ====================================================================================================================
      // 4. EL CAPÍTULO, ETAPA POR ETAPA (pasos de la historia 0–7 de content/cap1/historia.js)
      // ====================================================================================================================
      despejar('inicio'); muestraGuia();                                        // paso 0

      // ---------- 4.2 Iguaca llama desde la copa del flamboyán: el primer vuelo del capítulo (DIVERSION_CAP1, mejora 1) ----------
      fase('Iguaca');
      const LU = G.c.luma, perchaL = LU ? LU.percha : null, H0 = G.terreno.height;
      const desdeSuelo = LU ? useAt('luma') : null;                              // bajo la copa, desde el suelo, no se le puede hablar
      const guiaLuma = G.misiones.guideTarget();
      primerVuelo = { seg: Math.round(seg(reloj, false)), segLeyendo: Math.round(seg(reloj, true) + reloj.carLibres / CAR_POR_SEG), alturaPercha: perchaL ? +(perchaL.y - H0(perchaL.x, perchaL.z)).toFixed(1) : null, donde: LU ? LU.donde() : null };
      let posada = false, llamada = null, charla = false, lumaOk = false;
      if (perchaL) {
        volar(perchaL.x + 0.6, perchaL.y + 1.6, perchaL.z); G.fisica.MOVE.flying = false; tick(1.2);   // despegar, llegar y posarse a su lado
        posada = LU.junto() && !G.fisica.MOVE.flying;
        llamada = G.dialogo.libre() ? G.dialogo.actual() : null;                 // Iguaca llamó desde arriba al acercarse (bocadillo)
        const nbL = G.interaccion.nearest(); lumaOk = !!nbL && nbL.id === 'luma';
        if (lumaOk) { G.interaccion.action(); reloj.acciones++; }
        charla = G.dialogo.open(); drain();
      }
      check('4.2', 'Iguaca llama desde la copa: desde el suelo no se le habla; hay que despegar, posarse a su lado y hablar (la llamada en bocadillo, la charla en la caja; Vittata acepta ayudar y recibe 3 tablas)',
        !!LU && desdeSuelo === false && !!guiaLuma && guiaLuma.y != null && posada && !!llamada && llamada.who === 'Iguaca' && lumaOk && charla && S.step >= 1 && had('LumaHelped') && S.inv.madera >= 3 && !LU.arriba(),
        { desdeSuelo, guia: guiaLuma && { y: +guiaLuma.y.toFixed(1) }, posada, llamada: llamada && llamada.text.slice(0, 30), charla, lumaOk, paso: S.step, madera: S.inv.madera, arriba: LU && LU.arriba(), cercano: lumaOk ? null : ultimoCercano, atajo: 'vuelo directo a la percha de la copa' }, 700);
      check('4.2', 'El primer vuelo del capítulo llega antes de 90 s (medida de DIVERSION_CAP1, mejora 1)', !!primerVuelo && primerVuelo.seg < 90 && primerVuelo.segLeyendo < 90, primerVuelo);
      if (corte('4.2', S.step >= 1)) return fin();

      // ---------- 4.1 Taller: examinar la máquina y el transmisor (comentarios en bocadillos; el paso avanza solo) ----------
      fase('Taller'); muestraGuia();
      const m1ok = useAt('maquina'); const cercM = ultimoCercano; const libreM = !!G.dialogo.libre() && !G.ui.busy(); drain();
      const tx1ok = useAt('transmisor'); const cercT = ultimoCercano; drain();
      check('4.1', 'Taller: examinar la máquina y el transmisor (Acción) con los comentarios de Vittata en bocadillos libres; queda la foto y el paso pasa a «Recolectar»', m1ok && tx1ok && libreM && S.step === 2 && S.examined.maquina && S.examined.transmisor && had('WorkshopExplored') && !!S.captures.workshop,
        { maquina: m1ok, transmisor: tx1ok, bocadillo: libreM, paso: S.step, cercano: m1ok && tx1ok ? null : [cercM, cercT], foto: !!S.captures.workshop });
      if (corte('4.1', S.step === 2)) return fin();

      // ---------- 4.3 Recolectar (1 madera, 2 piedras) y bucear por la pieza del fondo (M1) ----------
      fase('Recolección y M1'); muestraGuia();
      const NEEDS = (G.pack.costos && G.pack.costos.NEEDS) || { madera: 4, piedra: 2, componente: 1 };
      for (const r of G.objetos.recursos) {
        if (r.fondo || S.collected.includes(r.id) || !NEEDS[r.tipo] || S.inv[r.tipo] >= NEEDS[r.tipo] || !G.objetos.available(r)) continue;
        useAt(r.id, 0.5, 0); tick(0.2);
      }
      const c1 = G.objetos && G.objetos.find ? G.objetos.find('c1') : null;
      const poza = (G.terreno.poi && G.terreno.poi('poza_honda')) || c1 || (G.terreno.places && G.terreno.places.pozaRio);
      if (poza) {
        despejar('poza'); ir(poza.x, poza.z); tick(0.5);
        const keys = G.input.keys;
        keys.add('c'); for (let i = 0; i < 120 && !S.collected.includes('c1'); i++) tick(0.1); keys.delete('c');   // buceo con la tecla C
        tick(0.5);
      }
      const dialogoRecursos = G.dialogo.activo() ? (G.dialogo.libre() ? 'bocadillo' : 'caja') : false; drain();
      check('4.3', 'Recolectar madera y piedras (Acción) y bucear (C) hasta la pieza del fondo: M1 «Fondo del río» y paso «Recolectar» completos', !!poza && S.collected.includes('c1') && !!S.missions.m1 && S.step === 3 && had('ResourcesCollected') && Object.keys(NEEDS).every(k => S.inv[k] >= NEEDS[k]),
        { poza: poza && [Math.round(poza.x), Math.round(poza.z)], inv: S.inv, paso: S.step, m1: !!S.missions.m1, escena: dialogoRecursos, ropaM1: ropaOk('m1') ? 'desbloqueada' : 'falta ' + hitoRopa('m1').filter(k => !S.unlocked.includes(k)).join(','), atajo: 'teleport a la poza; el buceo es con la tecla C simulada' });
      if (corte('4.3', S.step === 3)) return fin();
      const inv3 = Object.assign({}, S.inv);                                    // inventario al empezar la ruta de la gota
      if (CR) {
        tick(2.5); despejar('nido');
        const n = nidoMundo(), est = G.terreno.poi && G.terreno.poi('estacion');
        const dEst = n && est ? Math.round(Math.hypot(n.position.x - est.x, n.position.z - est.z) * 10) / 10 : null;
        check('3', 'Juego normal: sin misión no hay nido ni botón; tras la primera misión aparecen el nido junto a la Estación y el botón «Nido»',
          !nidoAntes.boton && !nidoAntes.nido && !!n && n.visible && !$('b-nido').hidden && dEst != null && dEst < 25,
          { antes: nidoAntes, despues: { nido: !!(n && n.visible), boton: !$('b-nido').hidden, donde: n && n.userData.donde, metrosEstacion: dEst }, presentacionDeLuma: intrusos.filter(x => /nido/i.test(x)).length });
      }

      // ---------- 4.4 «La ruta de la gota» (paso «terrenos»): p1–p8 y «Iguaca te pregunta» ----------
      fase('La ruta de la gota'); muestraGuia();
      const ruta = await rutaGota();
      for (const [nombreP, ok, ev] of ruta.pasos) check('4.4', nombreP, ok === true, ev);
      check('4.4', 'Misión «La ruta de la gota» completa: la historia pasa a «Elige un terreno» y se desbloquea su ropa', !!S.missions.educativa && S.step === 4 && ropaOk('educativa') && S.evaluated.A && S.evaluated.B,
        { paso: S.step, hud: hudAhora(), ropa: hitoRopa('educativa'), evaluados: S.evaluated, formativa: Object.keys(S.edu.formativa || {}).length });
      if (corte('4.4', S.step === 4 && !!S.missions.educativa, ruta.error)) return fin();

      // ---------- 4.5 Construir (cartel del terreno → «Construir refugio aquí» → fantasma verde → Acción) y la crecida ----------
      fase('Construir y crecida'); muestraGuia();
      const colocar = k => {
        const abre = useAt('post' + k, 1, 1);
        const tarjeta = !$('card').hidden && /Construir refugio aquí/.test($('card').textContent);
        click('c-build');
        const modo = !!G.c.build(), P = G.terreno.places[k];
        let valido = false, razon = '';
        const cand = [[0, -1.5], [0, -3], [3, -1.5], [-3, -1.5], [0, 1.5], [3, -3], [-3, -3], [5, 0], [-5, 0]];
        for (const [dx, dz] of cand) { ir(P.x + dx, P.z + dz, 0, 1); tick(0.1); const b = G.c.build(); if (b && b.valid) { valido = true; break; } razon = b ? b.reason : 'sin modo construir'; }
        const antesMat = Object.assign({}, S.inv);
        if (valido) { G.interaccion.action(); reloj.acciones++; }
        return { abre, tarjeta, modo, valido, razon, antesMat };
      };
      const costoR = (G.pack.costos && G.pack.costos.REFUGE_COST) || { madera: 3, piedra: 2 };
      const c1b = colocar(rama);
      const crecidaLibre = !!S.event && !G.ui.busy();                           // «¡Lo logramos! … viene más lluvia» en bocadillos: la crecida ya corre
      drain();
      // Mejora 4: la crecida se juega. El río arrastra tres cosas; se agarra una al vuelo (Acción cerca) y se suelta donde el agua no llega
      const CRE = G.c.crecida, accionesAntes = reloj.acciones;
      tick(1);
      const flotan = CRE ? CRE.objetos().filter(o => o.fase === 'flota') : [];
      const puedeAgarrar = !!(G.agarre && G.agarre.agarrar && G.actores.player3D && G.actores.player3D.anchors);
      const rescate = { flotan: flotan.map(o => o.id), agarrado: null, soltadoEn: null, salvado: false, guiaAlgoFlota: null, guiaLlevando: null };
      if (flotan.length && puedeAgarrar) {
        const o = flotan[0];
        rescate.guiaAlgoFlota = G.misiones.guideTarget();
        volar(o.it.x + 0.8, o.obj.position.y + 1.4, o.it.z); tick(0.3);          // hasta lo que flota, en vuelo
        despejar('crecida');                                                      // p. ej. Iguaca presenta el nido (criadero) justo ahora: Acción la pasaría en vez de agarrar
        const nbF = G.interaccion.nearest();
        if (nbF && nbF.id === o.it.id) { G.interaccion.action(); reloj.acciones++; }
        // Los gestos de agarrar y soltar corren en los cuadros de dibujo (gancho render), no en update: en el iframe oculto no hay
        // requestAnimationFrame, así que se dibujan cuadros a mano (0,05 s cada uno) hasta que el gesto termina
        const cuadros = (n, fin) => { for (let i = 0; i < n && !fin(); i++) G.renderer.render(0.05, false); return fin(); };
        const llevado = cuadros(40, () => !!G.agarre.lleva() && G.agarre.lleva().id === o.id && o.fase === 'llevado');
        rescate.agarrado = llevado ? o.id : (nbF ? nbF.id : 'nada cerca');
        if (llevado) {
          rescate.guiaLlevando = G.misiones.guideTarget();
          const alto = G.misiones.closest(CRE.altos()); rescate.soltadoEn = alto && { x: Math.round(alto.x), y: +alto.y.toFixed(1), z: Math.round(alto.z) };
          volar(alto.x, alto.y + 1.6, alto.z); G.fisica.MOVE.flying = false; tick(1.2);   // a tierra seca (copa, techo o colina) y posarse
          despejar('crecida-soltar');
          if (!G.interaccion.nearest()) { G.interaccion.action(); reloj.acciones++; } else { G.agarre.soltar(); reloj.acciones++; }   // sin nada cerca, Acción suelta
          rescate.salvado = cuadros(40, () => o.fase === 'salvado');
        }
      }
      tick(4);
      const subio = S.water > G.terreno.waterBase + 0.5;
      check('4.5', 'Construir el refugio en el terreno ' + rama + ' desde el cartel (tarjeta, fantasma verde, Acción) gastando los materiales; llega la lluvia (sin parar el juego) y el río sube',
        c1b.abre && c1b.tarjeta && c1b.modo && c1b.valido && !!S.refuge && S.refuge.parcel === rama && S.inv.madera === c1b.antesMat.madera - costoR.madera && S.inv.piedra === c1b.antesMat.piedra - costoR.piedra && had('ShelterConstructed') && subio && crecidaLibre,
        { terreno: rama, cartel: c1b.abre, tarjeta: c1b.tarjeta, modoConstruir: c1b.modo, valido: c1b.valido, razon: c1b.razon, refugio: S.refuge, inv: S.inv, agua: +(S.water - G.terreno.waterBase).toFixed(2), libre: crecidaLibre, atajo: 'teleport al terreno; el fantasma sigue a Vittata' });
      if (corte('4.5', !!S.refuge)) return fin();
      for (let i = 0; i < 40 && S.event; i++) tick(1);                        // fin de la crecida (20 s) y su escena
      drain();
      const accionesCrecida = reloj.acciones - accionesAntes;
      if (!CRE) check('4.5', 'Crecida jugable (DIVERSION_CAP1, mejora 4)', 'bloqueado', 'este pack no tiene G.c.crecida');
      else if (!puedeAgarrar) check('4.5', 'Crecida jugable: agarrar al vuelo lo que arrastra el río', 'bloqueado', 'sin modelo 3D con anclas (G.agarre necesita player3D.anchors); flotaban: ' + rescate.flotan.join());
      else check('4.5', 'Crecida jugable: el río arrastra 3 cosas (tablas, coquí, hallazgo); se agarra una al vuelo con Acción, se suelta en seco y queda salvada (FloodRescue); lo demás se recupera después, sin castigo',
        flotan.length === 3 && rescate.salvado && had('FloodRescue') && !!rescate.guiaAlgoFlota && !!rescate.guiaLlevando && CRE.perdidos.length === 2 && accionesCrecida >= 2,
        { flotan: rescate.flotan.join(','), agarrado: rescate.agarrado, guias: [!!rescate.guiaAlgoFlota, !!rescate.guiaLlevando], soltadoEn: rescate.soltadoEn, salvado: rescate.salvado, salvados: CRE.salvados.join(','), perdidos: CRE.perdidos.join(','), evento: had('FloodRescue'), acciones: accionesCrecida, atajo: 'vuelo directo hasta lo que flota y hasta tierra seca' }, 900);
      if (rama === 'A') {
        check('4.5', 'Crecida: el refugio del río queda dañado y aparece el Guardián (paso «Habla con el Guardián»)', !!S.refuge && S.refuge.damaged && had('ShelterFlooded') && G.actores.npc('guardian').sp.visible && S.step === 5 && !!S.captures.shelter && S.indicators.seguridad === 'baja',
          { refugio: S.refuge, paso: S.step, guardian: G.actores.npc('guardian').sp.visible, indicadores: S.indicators, foto: !!S.captures.shelter });
        // ---------- 4.6 Corregir: desarmar y volver a construir en la colina ----------
        fase('Corregir y reubicar'); muestraGuia();
        G.c.syncRefugeInteractable();
        const desarma = useAt('refuge', 1.6, 0); const cercR = ultimoCercano; drain();
        check('4.6', 'Corregir: desarmar el refugio dañado devuelve los materiales (3 madera y 2 piedras)', desarma && !S.refuge && had('ShelterDismantled') && S.inv.madera === inv3.madera && S.inv.piedra === inv3.piedra, { inv: S.inv, esperado: inv3, cercano: desarma ? null : cercR });
        const c2b = colocar('B');
        drain(); for (let i = 0; i < 40 && S.event; i++) tick(1); drain();  // segunda crecida (20 s): lo que flota se recupera después
        check('4.6', 'Reconstruir en la colina: el refugio aguanta la crecida y queda a salvo', c2b.valido && !!S.refuge && S.refuge.parcel === 'B' && !S.refuge.damaged && had('ShelterRelocated') && S.indicators.seguridad === 'alta' && S.builds.join() === 'A,B',
          { refugio: S.refuge, construcciones: S.builds, indicadores: S.indicators, valido: c2b.valido, razon: c2b.razon, paso: S.step });
      } else {
        tick(3); drain();
        check('4.5', 'Crecida: el refugio de la colina aguanta y queda a salvo; aparece el Guardián', !!S.refuge && !S.refuge.damaged && S.refuge.parcel === 'B' && G.actores.npc('guardian').sp.visible && S.step === 5 && S.indicators.seguridad === 'alta' && !!S.captures.shelter,
          { refugio: S.refuge, paso: S.step, guardian: G.actores.npc('guardian').sp.visible, indicadores: S.indicators });
      }
      if (corte('4.5 y 4.6', !!S.refuge && !S.refuge.damaged && S.step === 5, { refugio: S.refuge, paso: S.step })) return fin();

      // ---------- 3b. Eclosión con patitas (criadero) ----------
      if (CR) {
        const id = CR.estado().activa || 'clasico';
        const xpTras = (CR.estado().capsulas[id] || {}).xp || 0;
        let atajoXP = 0;
        if ((CR.estado().capsulas[id] || {}).estado !== 'lista') { for (let i = 0; i < 6 && (CR.estado().capsulas[id] || {}).estado !== 'lista'; i++) atajoXP += CR.dar('mision', 'e2e-' + i) || 0; }
        await CR.abrir(); await sleep(400);
        const boton = W.document.querySelector('#criadero [data-cr="eclosion"]');
        if (boton && !boton.closest('[hidden]')) boton.click();
        // El botón solo arranca la eclosión si la escena 3D ya armó la cápsula; con la máquina cargada puede tardar: si no arranca, se fuerza por la API de depuración
        let arranco = await until(() => CR.debug.hatch().on, 6000, 50), atajoEcl = false;
        if (!arranco && CR.debug && CR.debug.eclosion) { atajoEcl = true; await CR.debug.eclosion(id); arranco = await until(() => CR.debug.hatch().on, 6000, 50); }
        // Se buscan las patitas en TODOS los objetos «huevo» de la escena de la cría (el nido del mundo también tiene uno). El bucle del criadero
        // avanza la línea de tiempo en tiempo real mientras carga el modelo de la cría: se sostiene en 1 s hasta tener las patitas a la vista
        const buscar = () => {
          const cr = CR.debug && CR.debug.cria && CR.debug.cria(); let raiz = cr && cr.holder; while (raiz && raiz.parent) raiz = raiz.parent;
          const huevos = []; if (raiz) raiz.traverse(o => { if (o.name === 'huevo') huevos.push(o); });
          const con = huevos.find(h => h.children.some(o => o.isGroup && o.children.length === 2));
          return { cria: !!cr, raiz: raiz ? raiz.type : null, huevos: huevos.map(h => h.type + '[' + h.children.map(c => c.type + ':' + c.children.length).join(',') + ']@' + (h.parent ? h.parent.name || h.parent.type : '-')), patas: con ? con.children.find(o => o.isGroup && o.children.length === 2) : null };
        };
        let hallado = buscar();
        for (let i = 0; i < 250 && !hallado.patas && arranco; i++) { CR.debug.irA(1.0); await sleep(80); hallado = buscar(); }
        const patas = hallado.patas;
        const escala = () => { if (!patas) return null; const v = new W.THREE.Vector3(); patas.children[0].getWorldScale(v); return +v.x.toFixed(3); };
        CR.debug.irA(1.0); const e1 = escala();
        CR.debug.irA(6.0); const e6 = escala();
        CR.debug.irA(9.6); await sleep(300);                         // terminarEclosion corre con T > 9,4
        const tras = CR.estado().capsulas[id] || {};
        check('3', 'Eclosión: las patitas salen del huevo (escala ~0 a 1 s, visible a 6 s)', patas && e1 < 0.05 && e6 > 0.5, { escala1s: e1, escala6s: e6, xpPorJugar: xpTras - xpAntes, xpDePrueba: atajoXP, boton: !!boton, arranco: !!arranco, atajo: atajoEcl ? 'la eclosión se forzó con CR.debug.eclosion' : 'botón de eclosión del criadero', cria: hallado.cria, huevos: hallado.huevos });
        check('3', 'Tras la eclosión la cápsula queda nacida', tras.estado === 'nacida', { estado: tras.estado, xp: tras.xp });
        CR.cerrar && CR.cerrar();
        despejar('eclosión');
      }

      // ---------- 5. Guardar a mitad del capítulo, recargar y verificar persistencia ----------
      // Eventos tras recargar: los de antes de guardar siguen todos, en el mismo orden y con su seq. La ventana vieja sigue
      // jugando en tiempo real hasta que la recarga la descarga (con la máquina cargada, segundos): un evento con reloj (p. ej.
      // la presentación del nido tras 1,5 s de juego libre → NestAppeared) puede registrarse en ese hueco y el guardado de
      // pagehide lo escribe, como haría con un niño que cierra la pestaña. Eso no pierde ni duplica nada: se acepta solo como
      // cola nueva (seq consecutivos), nunca como un cambio de lo que ya había.
      const firmaEv = () => S.events.map(e => e.key + '#' + e.seq);
      const colaEv = (a, b) => b.length >= a.length && a.every((k, i) => k === b[i]) && b.slice(a.length).every((k, i) => +k.split('#').pop() === a.length + i + 1) ? b.slice(a.length) : null;
      const instantanea = () => ({ nombre: S.profile.name, especie: S.profile.look && S.profile.look.species, accs: Object.values((S.profile.look || {}).accessories || {}).map(a => a.id),
        paso: S.step, misiones: s(S.missions), edu: s(S.edu.hecho), refugio: s(S.refuge), construcciones: s(S.builds), inv: s(S.inv), eventos: S.events.length, ropa: s(S.unlocked.slice().sort()), guardian: S.guardianMet, banco: S.benchUnlocked,
        criadero: G.criadero ? s((G.criadero.estado().capsulas || {})[G.criadero.estado().activa || 'clasico']) : null });
      const antes = instantanea(), ev0 = firmaEv();
      const guardo = G.guardado.save(true);
      cerrarVentana();
      fr.contentWindow.__avViejo = true;   // marca la ventana vieja: la nueva no la tiene
      fr.contentWindow.location.reload();
      W = await abrir(true);
      if (!W) { check('5', 'Recargar la build', false, 'no volvió a arrancar'); return fin(); }
      enlazar();
      const despues = instantanea();
      const nuevos5 = colaEv(ev0, firmaEv());
      const iguales = Object.keys(antes).filter(k => k === 'eventos' ? !nuevos5 : s(antes[k]) !== s(despues[k]));
      check('5', 'Guardar a mitad del capítulo, recargar y todo persiste (perfil, paso, misiones, ruta de la gota, refugio, inventario, ropa, eventos, criadero)', guardo !== false && !iguales.length && $('creator').hidden && S.profile.created && $('end').hidden, { distintos: iguales, eventosNuevos: nuevos5, antes, despues });
      despejar('recarga');

      // ---------- 4.7 El Guardián presenta el refugio y regala el banco ----------
      fase('Guardián'); muestraGuia();
      const guardOk = useAt('guardian', 1.4, 0); const cercG = ultimoCercano; drain();
      check('4.7', 'Guardián (tras recargar): hablar con él, reconoce el refugio y regala el banco de trabajo', guardOk && had('GuardianMet') && S.benchUnlocked && G.c.bench.visible && S.step === 6 && had('WorkshopUpgradeUnlocked'),
        { paso: S.step, banco: G.c.bench.visible, cercano: guardOk ? null : cercG });
      if (corte('4.7', S.step === 6)) return fin();

      // ---------- 4.8 Transmisor: pide voz, M3 «Co-quí» (Simon de 3 coquíes) y el símbolo de los 36 fragmentos ----------
      fase('Transmisor y coquíes'); muestraGuia();
      const costoRep = (G.pack.costos && G.pack.costos.REPAIR_COST) || { madera: 1, componente: 1 };
      const tienePiezas = G.objetos.has(costoRep);
      const invFinal = {}; for (const k of Object.keys(S.inv)) invFinal[k] = S.inv[k] - (costoRep[k] || 0);
      const t1 = useAt('transmisor'); const cercX = ultimoCercano; drain();     // Vittata y Iguaca: el transmisor no tiene voz
      const opcionesCoro = $('card').hidden ? 0 : $('card').querySelectorAll('button[id^="ch-"]').length;
      click('ch-1'); drain();                                                   // elección con Iguaca («Escuchando con paciencia»)
      check('4.8', 'Transmisor sin voz: Iguaca propone los coquíes y se elige cómo convencerlos (2 opciones)', tienePiezas && t1 && S.chorus && opcionesCoro === 2 && had('LumaChoice'), { piezas: tienePiezas, inv: S.inv, opciones: opcionesCoro, coro: S.chorus, cercano: t1 ? null : cercX });
      const BUSHES = G.c.BUSHES, detalle = [];
      for (const [i, b] of BUSHES.entries()) {
        const abre = useAt(b.id, 1.3, 0), tarjeta = !$('card').hidden && /Coquí escondido/.test($('card').textContent);
        let pasar = null;
        if (i === 1) {                                                          // dos fallos seguidos: aparece «Pasar» (accesibilidad)
          const mala = b.song[0] === 'co' ? 's-qui' : 's-co';
          click(mala); click(mala);
          pasar = !!$('s-skip'); click('s-skip');
        } else for (const n of b.song) click(n === 'co' ? 's-co' : 's-qui');    // los botones reales «Co (grave)» y «Quí (agudo)»
        detalle.push({ id: b.id, abre, tarjeta, pasar, cantados: S.coquis.length });
      }
      tick(0.3); drain();
      check('4.8', 'M3 «Co-quí»: se repite el canto de 2 coquíes con los botones y el otro se pasa tras 2 fallos; la misión se completa y da su ropa', S.coquis.length === BUSHES.length && !!S.missions.m3 && ropaOk('m3') && detalle.every(d => d.abre && d.tarjeta) && detalle[1].pasar === true,
        { coquis: S.coquis, detalle, m3: !!S.missions.m3, ropa: hitoRopa('m3') });
      const t2 = useAt('transmisor'); const cercX2 = ultimoCercano;
      const simboloVisible = !$('symbol').hidden;
      drain();
      check('4.8', 'Reparar y activar el transmisor: aparece el símbolo de 36 fragmentos, suena la Voz y la historia pasa al mirador', t2 && simboloVisible && $('symbol').hidden && S.transmitterOn && had('TransmitterActivated') && S.step === 7 && s(S.inv) === s(invFinal),
        { simbolo: simboloVisible, simboloCerrado: $('symbol').hidden, paso: S.step, inv: S.inv, esperado: invFinal, cercano: t2 ? null : cercX2 });
      // La Voz del transmisor no debe llevar la cara del Guardián (CAP1_PENDIENTE P0-2): informativa mientras QA-34 esté abierto
      const imgVoz = (vistas.find(l => l.who === 'Voz') || {}).img, imgGuardian = (vistas.find(l => l.who === 'Guardián') || {}).img;
      const vozIgual = !!imgVoz && imgVoz === imgGuardian;
      check('4.8', vozIgual ? 'La Voz del transmisor lleva un retrato distinto al del Guardián (informativa: QA-34 ABIERTO, hoy usa el mismo)' : 'La Voz del transmisor lleva un retrato distinto al del Guardián (QA-34 corregido)', !!imgVoz, { voz: imgVoz ? imgVoz.slice(0, 60) : 'la Voz no habló', guardian: imgGuardian ? imgGuardian.slice(0, 60) : 'el Guardián no habló', igual: vozIgual });
      if (corte('4.8', S.step === 7)) return fin();

      // ---------- 4.9 Mirador: el final del capítulo ----------
      fase('Mirador y final'); muestraGuia();
      const alto = G.c.mirador.position.y > G.terreno.places.villa.base + 2;
      const mirOk = useAt('mirador', 2.4, 0); const cercMi = ultimoCercano; drain();
      const botonesFin = [...W.document.querySelectorAll('#end button')].filter(b => !b.closest('[hidden]')).map(b => (b.id || '?') + '=' + b.textContent.trim());
      check('4.9', 'Mirador: subir y mirar el horizonte desbloquea el plano de la embarcación y completa el capítulo (panel final con «Crear mi cómic»)', alto && mirOk && S.boatPlan && S.complete && had('BoatBlueprintUnlocked') && had('LocationDiscoveredMirador') && had('ChapterCompleted') && S.step === G.misiones.DONE && !$('end').hidden && !!$('b-comic') && !!S.captures.final,
        { paso: S.step, miradorAlto: alto, botones: botonesFin, foto: !!S.captures.final, cercano: mirOk ? null : cercMi });
      if (corte('4.9', S.complete)) return fin();
      cerrarFase();

      // Panel final: «Comenzar de cero» (antes «Jugar de nuevo») no debe borrar nada con un toque (solo se pulsa si el pack ya pregunta antes: #end-confirm)
      const botonSeguir = () => [...W.document.querySelectorAll('#end button')].find(b => b.id === 'b-seguir' || /seguir explorando|keep exploring/i.test(b.textContent));
      if ($('end-confirm') && $('b-again')) {
        $('b-again').click();
        const pregunta = !$('end-confirm').hidden, intacto = S.complete && S.profile.created && S.step === G.misiones.DONE;
        const no = $('b-again-no'); if (no) no.click();
        check('4.9', '«Comenzar de cero» (antes «Jugar de nuevo») pregunta antes de borrar la partida y «No, volver» la conserva', pregunta && intacto && !!no && $('end-confirm').hidden && S.complete && !$('end').hidden, { pregunta, intacto, boton_no: !!no, confirmacionCerrada: $('end-confirm').hidden });
      } else check('4.9', '«Comenzar de cero» pregunta antes de borrar (informativa: este build no tiene #end-confirm; no se pulsa para no perder la partida; ver BUGS.md)', true, 'sin confirmación en el panel final: un toque en el botón de reinicio (#b-again) borraría la partida');

      // ---------- 6. Cómic: abrirlo desde el panel final y exportar ----------
      click('b-comic');
      const comicAbierto = await until(() => !$('comic').hidden, 4000, 50);
      const CM = G.comic;
      const paneles = CM.comicPanels ? CM.comicPanels() : [];
      const ids = paneles.map(p => p.id);
      const conNombre = !!S.profile.name && paneles.some(p => String(p.text || '').includes(S.profile.name));
      const textoRefugio = (paneles.find(p => p.id === 'refugio') || {}).text || '';
      const esperadoRefugio = rama === 'B' ? /^Elegí construir en la colina/ : /^Mi primera idea no era segura/;
      check('6', 'Los eventos narrativos del capítulo se convierten en viñetas (intro, taller, refugio y final) con el nombre del jugador', !!comicAbierto && ['intro', 'taller', 'refugio', 'final'].every(i => ids.includes(i)) && conNombre && esperadoRefugio.test(textoRefugio),
        { abierto: !!comicAbierto, nombre: S.profile.name, vinetas: paneles.map(p => p.id + ': ' + String(p.text || '').slice(0, 50)), refugio: textoRefugio.slice(0, 80) });
      let png = '';
      try { png = await CM.exportComic('png'); } catch (e) { png = 'error: ' + e.message; }
      const im = png.startsWith('data:image/png') ? await new Promise(r => { const i = new W.Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = png; }) : null;
      // Página de 1080×1520 hasta 4 viñetas; con más (el nido y la eclosión también cuentan) crece (src/game/comic.js, altoPagina)
      const nV = CM.orderedPanels().length, lay = S.comic.layout === 'strip' ? 'strip' : 'grid', altoEsp = Math.max(1520, Math.round(lay === 'strip' ? 430 + nV * 272.5 : 430 + Math.ceil(nV / 2) * 545));
      check('6', 'Exportar el cómic a PNG (se decodifica; 1080 de ancho y 1520 de alto hasta 4 viñetas, más alto con más)', !!im && im.width === 1080 && im.height === altoEsp, { kb: Math.round(png.length / 1024), medida: im ? im.width + '×' + im.height : png.slice(0, 60), vinetas: nV, diseno: lay, esperado: '1080×' + altoEsp });
      click('c-close'); if (!$('comic').hidden) $('comic').hidden = true;

      // ---------- «Seguir explorando» (si el pack lo ofrece) ----------
      const bs = botonSeguir();
      if (bs) {
        const pos0 = { x: S.pos.x, z: S.pos.z };
        bs.click();
        tick(0.2);
        let movio = 0;
        for (const tecla of ['w', 'd', 's', 'a']) {
          G.input.keys.add(tecla); tick(1); G.input.keys.delete(tecla); tick(0.2);
          movio = Math.hypot(S.pos.x - pos0.x, S.pos.z - pos0.z);
          if (movio > 0.5) break;
        }
        check('4.9', '«Seguir explorando» cierra el panel final y deja el mundo libre (Vittata se mueve) con el capítulo terminado', $('end').hidden && !G.ui.busy() && movio > 0.5 && S.complete && S.step === G.misiones.DONE, { panelOculto: $('end').hidden, ocupado: G.ui.busy(), metros: +movio.toFixed(1), explorando: S.explorando });
      } else check('4.9', '«Seguir explorando» (informativa: este build no lo ofrece; el panel final bloquea el juego; ver BUGS.md)', true, { botones: botonesFin, ocupado: G.ui.busy() });

      // ---------- Objetivo y guía en cada paso ----------
      const porPaso = {}; for (const g of guias) porPaso[g.paso] = g;
      check('4.10', 'En cada paso de la historia (0–7) el HUD muestra el objetivo y hay una guía hacia él', [0, 1, 2, 3, 4, 5, 6, 7].every(p => porPaso[p] && porPaso[p].hud && porPaso[p].guia), Object.values(porPaso).map(g => g.paso + ':' + (g.guia ? 'guía' : 'SIN GUÍA') + ':' + (g.hud || 'SIN HUD')));

      // ---------- Inglés del HUD y del panel final (QA-65) ----------
      if (G.idioma && G.idioma.poner && G.idioma.faltan) {
        const idAntes = G.idioma.actual();
        G.idioma.poner('en'); await (G.idioma.listo || sleep(50)); await sleep(60);
        const rotulo = () => { try { return W.getComputedStyle($('steps'), '::after').content.replace(/^"|"$/g, ''); } catch (e) { return ''; } };
        const hudEN = rotulo(), textosFin = [$('end-text'), ...W.document.querySelectorAll('#end h1,#end h2,#end button,#end p')].filter(Boolean).map(n => n.textContent.replace(/\s+/g, ' ').trim()).filter(t => /\p{L}{2}/u.test(t));
        const sinTr = G.idioma.faltan(textosFin);
        check('4.10', 'En inglés el HUD y el panel final no dicen nada en español (rótulo del objetivo «Chapter complete!», panel final traducido)', /^Chapter complete!?$|^Goal /.test(hudEN) && !sinTr.length, { rotulo: hudEN, sinTraducir: sinTr.slice(0, 8) });
        G.idioma.poner(idAntes || 'es'); await (G.idioma.listo || sleep(50));
      }

      // ---------- Orden de los eventos del capítulo y materiales ----------
      const clave = S.events.map(e => e.key);
      const esperados = ['PlayerCharacterCreated', 'LumaHelped', 'WorkshopExplored', 'ResourcesCollected', 'LandInspected', 'LandInspected', 'LandSelected', 'ShelterConstructed']
        .concat(rama === 'A' ? ['ShelterFlooded', 'ShelterDismantled', 'LandSelected', 'ShelterConstructed', 'ShelterRelocated'] : [])
        .concat(['GuardianMet', 'WorkshopUpgradeUnlocked', 'TransmitterActivated', 'BoatBlueprintUnlocked', 'LocationDiscoveredMirador', 'ChapterCompleted']);
      let kEv = 0; for (const c of clave) if (kEv < esperados.length && c === esperados[kEv]) kEv++;
      const sinHacer = ['m1', 'educativa', 'm3'].filter(m => !S.missions[m]);
      check('4.10', 'El capítulo deja los eventos en el orden de la historia, las 3 misiones hechas y el inventario cuadrado (sin materiales perdidos ni duplicados)', kEv === esperados.length && !sinHacer.length && s(S.inv) === s(invFinal),
        { ordenOk: kEv + '/' + esperados.length, falta: esperados[kEv] || null, misionesFaltan: sinHacer, inv: S.inv, esperado: invFinal, eventos: clave.length });

      // ---------- 7. Guardar al final, recargar y verificar que el capítulo sigue completo ----------
      const resumenFin = () => ({ paso: S.step, complete: S.complete, misiones: s(S.missions), refugio: s(S.refuge), explorando: !!S.explorando, eventos: S.events.length, ropa: s(S.unlocked.slice().sort()), plano: S.boatPlan, transmisor: S.transmitterOn });
      const fin0 = resumenFin(), evFin0 = firmaEv();
      const guardo2 = G.guardado.save(true);
      cerrarVentana();
      fr.contentWindow.__avViejo = true;   // marca la ventana vieja: la nueva no la tiene
      fr.contentWindow.location.reload();
      W = await abrir(true);
      if (!W) { check('7', 'Recargar la build al final', false, 'no volvió a arrancar'); return fin(); }
      enlazar();
      const fin1 = resumenFin();
      const nuevos7 = colaEv(evFin0, firmaEv());
      const distintos = Object.keys(fin0).filter(x => x === 'eventos' ? !nuevos7 : s(fin0[x]) !== s(fin1[x]));
      check('7', 'Guardar al final, recargar y el capítulo sigue completo (paso final, misiones, refugio, plano, transmisor, ropa y eventos)', guardo2 !== false && !distintos.length && S.complete && S.step === G.misiones.DONE, { distintos, eventosNuevos: nuevos7, antes: fin0, despues: fin1 });
      // Tras recargar: con «Seguir explorando» el panel no vuelve a tapar el mundo; sin él, se reabre (y bloquea)
      const panel = !$('end').hidden;
      if (bs) check('7', 'Tras recargar con el capítulo terminado y «Seguir explorando» elegido, el panel final no vuelve a abrirse y se puede jugar', !panel && !G.ui.busy() && !!S.explorando, { panel, ocupado: G.ui.busy(), explorando: S.explorando });
      else check('7', 'Tras recargar con el capítulo terminado (informativa: sin «Seguir explorando» el panel final se reabre y bloquea el juego)', true, { panel, ocupado: G.ui.busy() });

      // ---------- Duración (sin el creador, el criadero ni el cómic) ----------
      const tot = { sim: 0, suelo: 0, aire: 0, lineas: 0, car: 0, clics: 0, acciones: 0, libres: 0, carLibres: 0 };
      for (const f of fasesHechas) for (const kk of Object.keys(tot)) tot[kk] += f.d[kk] || 0;
      const min1 = seg(tot, false), min2 = seg(tot, true), tray = tot.suelo / velSuelo() + tot.aire / velAire();
      const porFase = fasesHechas.map(f => f.nombre + ' ' + Math.round(seg(f.d, false)) + ' s (' + Math.round(f.d.sim) + ' sim + ' + Math.round(f.d.suelo / velSuelo() + f.d.aire / velAire()) + ' trayecto + ' + f.d.lineas + ' líneas + ' + f.d.clics + ' clics' + (f.d.libres ? ' + ' + f.d.libres + ' bocadillos' : '') + ')').join(' · ');
      // Segundos parados por diálogo (ui.busy): solo las líneas de la caja; los bocadillos libres salen mientras se juega
      const bloqueadoLeyendo = Math.round(tot.car / CAR_POR_SEG), bloqueadoSinLeer = Math.round(tot.lineas * SEG_POR_PULSACION);
      duracion = { rama, minimoSinLeerSeg: Math.round(min1), minimoLeyendoSeg: Math.round(min2), simSeg: Math.round(tot.sim), trayectoSeg: Math.round(tray), metrosSuelo: Math.round(tot.suelo), metrosAire: Math.round(tot.aire), lineas: tot.lineas, caracteres: tot.car, acciones: tot.acciones, clics: tot.clics,
        bocadillosLibres: tot.libres, caracteresLibres: tot.carLibres, bloqueadoPorDialogoSeg: { leyendo: bloqueadoLeyendo, sinLeer: bloqueadoSinLeer }, primerVuelo,
        fases: fasesHechas.map(f => ({ fase: f.nombre, seg: Math.round(seg(f.d, false)), sim: Math.round(f.d.sim), lineas: f.d.lineas, libres: f.d.libres })), intrusos };
      const resumen = 'MÍNIMO AUTOMÁTICO ' + fmt(min1) + ' sin leer (' + Math.round(min1) + ' s) · ' + fmt(min2) + ' leyendo a ' + CAR_POR_SEG + ' car/s · juego simulado ' + fmt(tot.sim) + ' + trayectos ' + fmt(tray) +
        ' (' + Math.round(tot.suelo) + ' m a pie a ' + velSuelo() + ' m/s, ' + Math.round(tot.aire) + ' m en vuelo a ' + velAire() + ' m/s) + ' + tot.lineas + ' líneas de diálogo que paran el juego (' + tot.car + ' caracteres = ' + bloqueadoLeyendo + ' s leyendo, ' + bloqueadoSinLeer + ' s solo pulsando) y ' + tot.clics + ' clics en tarjetas, a ' + SEG_POR_PULSACION + ' s cada pulsación · ' +
        tot.libres + ' bocadillos libres (' + tot.carLibres + ' caracteres) que salen mientras se juega, sin sumar · primer vuelo a los ' + (primerVuelo ? primerVuelo.seg + ' s (' + primerVuelo.segLeyendo + ' s leyendo)' : '—') + ' · ' + tot.acciones + ' Acciones · rama ' + rama +
        ' · SIN el creador, el criadero ni el cómic · NO sustituye medir con jugadores reales · fases: ' + porFase + (intrusos.length ? ' · diálogos sueltos cerrados: ' + intrusos.join(' | ') : '');
      check('T', 'Duración simulada del capítulo 1 (mínimo del recorrido automático; informativa)', true, resumen, 2400);

      const errs = erroresAcum.concat((W.__aveErrores || []).slice(0));
      check('·', 'Sin errores de JavaScript en todo el recorrido', !errs.length, errs.slice(0, 3).join(' | ') || 'ninguno');
      return fin();
    } catch (e) {
      check('!', 'El recorrido no lanza excepciones', false, (e && e.stack) || String(e), 800);
      return fin();
    }

    // «La ruta de la gota» p1–p8 y las preguntas de Iguaca, con las acciones del jugador (misma ruta que AV.eduTest, sin sus asertos de texto)
    async function rutaGota() {
      const r = { pasos: [], error: '' };
      const add = (nombreP, ok, ev) => r.pasos.push([nombreP, !!ok, ev]);
      try {
        const E = G.c.edu, F = G.fisica, H = G.terreno.height, AU = G.aula;
        if (!E || !AU || !AU.LEC) { r.error = 'sin misión educativa (G.c.edu / G.aula)'; add('La misión educativa está disponible', false, r.error); return r; }
        const paso = id => AU.LEC.mision_educativa.pasos.find(p => p.id === id);
        const card = () => ($('card').hidden ? '' : $('card').textContent);
        const nopc = () => ($('card').hidden ? 0 : $('card').querySelectorAll('.edu-opt').length);
        // p1 Predecir
        const usa1 = useAt('marcas_agua', 0.5, 0); const habla = G.dialogo.open(); drain();
        const pregunta = nopc(); click('ch-1'); drain();
        add('Ruta de la gota p1: en las marcas Iguaca pregunta de dónde salió el agua y se elige una predicción (3 opciones, sin juicio)', usa1 && habla && pregunta === 3 && S.edu.hecho.p1 && !!S.edu.pred1, { opciones: pregunta, pred: S.edu.pred1, cercano: usa1 ? null : ultimoCercano });
        // p2 capas (perchas) y p3 cadena alimentaria en el dosel
        const capas = [];
        for (const p of E.PERCHAS) {
          const def = paso('p2').perchas.find(x => x.capa === p.capa);
          volar(p.x, p.y + 1.6, p.z); G.fisica.MOVE.flying = false; tick(1);
          const nbp = G.interaccion.nearest(), posado = !!(E.posado(p) && nbp && nbp.id === 'percha_' + p.capa);
          G.interaccion.action(); reloj.acciones++;
          click('ch-' + def.correcta);
          let cadena = '';
          if (p.capa === 'dosel') {
            tick(1); drain();
            const I = paso('p3').interaccion, seq = AU.aj.grado === '5-6' ? I.grados_5_6 : I.grados_3_4;
            const tarjetas = $('card').querySelectorAll('.edu-cadena li').length;
            seq.forEach((kk, i) => click('ch-' + i));
            cadena = tarjetas === seq.length ? ' + cadena de ' + seq.length + ' tarjetas' : ' + CADENA ' + tarjetas + '/' + seq.length;
            click('edu-seguir');
          }
          capas.push(p.capa + (posado ? ':ok' : ':SIN POSARSE') + cadena);
        }
        drain();
        add('Ruta de la gota p2 y p3: posarse en las 4 capas del bosque (Observar) y ordenar la cadena alimentaria en el dosel', S.edu.hecho.p2 && S.edu.hecho.p3 && Object.keys(S.edu.perchas).length === 4 && capas.every(c => !/SIN|CADENA/.test(c)), { capas, perchas: S.edu.perchas, atajo: 'volar a cada percha' });
        // p4 Ojos de cotorra: ver los dos terrenos desde arriba
        for (const k of ['A', 'B']) { const p = E.L[k]; volar(p.x, H(p.x, p.z) + 6, p.z); tick(0.2); }
        tick(1.5);
        const op4 = nopc(); click('ch-0'); drain();
        add('Ruta de la gota p4: tras ver los dos terrenos desde arriba se pregunta cuál está más bajo y quedan evaluados', S.edu.vistos.A && S.edu.vistos.B && op4 === 2 && S.edu.hecho.p4 && S.evaluated.A && S.evaluated.B && had('LandInspected'), { opciones: op4, vistos: S.edu.vistos, evaluados: S.evaluated, atajo: 'volar sobre cada terreno' });
        // p5 Nace la gota: el vapor de la poza sube a la nube
        const pz = E.L.poza; volar(pz.x + 3, Math.max(G.agua.levelAt(pz.x, pz.z), H(pz.x, pz.z)) + 2, pz.z); tick(0.3);
        const vapor = E.estado().voluta;
        for (let i = 0; i < 900 && E.estado().vapor < 1; i++) { const v = E.volutaPos(); if (!v) break; volar(v.x + 1, v.y, v.z, true); tick(0.1); }
        const nu = E.nube(); volar(nu.x, nu.y, nu.z); tick(0.3);
        const op5 = nopc(); click('ch-0'); drain();
        add('Ruta de la gota p5: en la poza sube el vapor, se acompaña hasta la nube y se hace la 2.ª predicción (3 opciones); empieza a llover', vapor && op5 === 3 && S.edu.hecho.p5 && !!E.estado().gota, { vapor, opciones: op5, gota: E.estado().gota, atajo: 'volar siguiendo el vapor' });
        // p6 Sigue la gota hasta el río
        for (let i = 0; i < 1800; i++) { const st = E.estado(); if (!st.gota || st.gota.parada) break; const g = E.gotaPos(); volar(g.x + 1, Math.max(g.y, H(g.x, g.z)) + 1.5, g.z, true); tick(0.1); }
        tick(2.5);
        const op6 = nopc(), rioSube = S.water > G.agua.base + 0.2; click('ch-0'); drain();
        add('Ruta de la gota p6: la gota corre al río, el río crece y se pregunta dónde se juntó el agua (2 opciones)', rioSube && op6 === 2 && S.edu.hecho.p6, { opciones: op6, rio: +(S.water - G.agua.base).toFixed(2), atajo: 'volar siguiendo a la gota' });
        // p7 La poza: bucear y encontrar la gota y la marca de la crecida
        for (let i = 0; i < 900 && E.estado().gota; i++) { const g = E.gotaPos(); if (!g) break; volar(g.x + 1, Math.max(g.y + 1, S.water + 2), g.z, true); tick(0.1); }
        const fg = E.fondo.gota(); ir(fg.x, fg.z); G.fisica.MOVE.flying = false; S.pos.y = H(fg.x, fg.z) + 0.3; tick(0.2);
        const gotaFondo = !!S.edu.poza.gota;
        const fo = E.fondo.roca(); ir(fo.x + 1.2, fo.z); S.pos.y = S.water - 0.3; tick(0.2);
        const marca = !!S.edu.poza.marca;
        drain(); tick(6);
        add('Ruta de la gota p7: en el fondo de la poza se encuentra la gota y la marca de la crecida; el ciclo se cierra y el río vuelve a su nivel', gotaFondo && marca && S.edu.hecho.p7 && Math.abs(S.water - G.agua.base) < 0.05, { gota: gotaFondo, marca, rio: +(S.water - G.agua.base).toFixed(3), atajo: 'teleport al fondo (el buceo ya se probó en M1)' });
        // p8 Explícale a Iguaca
        const usa8 = useAt('marcas_agua', 0.5, 0); const op8 = nopc();
        for (let i = 0; i < 5; i++) click('ch-' + i);
        const contraste = /Predije|I predicted/.test(card());
        click('edu-seguir'); drain();
        add('Ruta de la gota p8: explicarle el ciclo a Iguaca ordenando 5 frases y ver la predicción frente a la evidencia', usa8 && op8 === 5 && contraste, { opciones: op8, contraste });
        // Iguaca te pregunta (formativa)
        const ids = E.idsFormativa(), vistas = [];
        for (let i = 0; i < 12; i++) {
          const cur = AU.enCurso(); if (!cur) break;
          const q = cur.q; vistas.push(q.id);
          if (q.tipo === 'ordenar') q.correcta.forEach(j => click('ch-' + j)); else click('ch-' + q.correcta);
          click('edu-seguir');
        }
        drain();
        add('Ruta de la gota: «Iguaca te pregunta» (' + ids.length + ' preguntas) con retroalimentación inmediata; con la última se cierra p8 y la misión', vistas.join() === ids.join() && ids.every(id => S.edu.formativa[id]) && S.edu.hecho.p8, { esperadas: ids, vistas, p8: S.edu.hecho.p8 });
      } catch (e) { r.error = (e && e.stack) || String(e); add('La ruta de la gota se recorre sin excepciones', false, r.error.slice(0, 300)); }
      return r;
    }

    function fin() {
      try { const G2 = fr.contentWindow && fr.contentWindow.AV && fr.contentWindow.AV.G; if (G2) { G2.renderer.renderer.dispose(); G2.renderer.renderer.forceContextLoss(); } } catch (e) { /* ya cerrado */ }
      if (!opts.keep) fr.remove();
      limpiar();
      try { for (const [k, v] of Object.entries(respaldo)) localStorage.setItem(k, v); } catch (e) { /* */ }
      // Informe por paso: tiempo real de cada tramo (suma de sus comprobaciones) y primer paso que falla. Va como una comprobación
      // más (informativa, siempre ok) para que salga en el informe de test.sh; el fallo en sí lo dan las comprobaciones rojas
      const porPaso = [], vistos = {};
      for (const o of out) { const k = o.paso; if (!vistos[k]) { vistos[k] = { paso: k, seg: 0, n: 0, falla: 0 }; porPaso.push(vistos[k]); } vistos[k].seg += o.ms / 1000; vistos[k].n++; if (o.estado === 'falla') vistos[k].falla++; }
      const primera = out.find(o => o.estado === 'falla');
      out.push({ paso: 'R', name: 'R · Resumen por paso: ' + (primera ? 'FALLA EN EL PASO ' + primera.paso + ' («' + primera.name.slice(0, 60) + '»)' : 'sin fallos'), ok: true, estado: 'ok',
        extra: s(porPaso.map(p => p.paso + ': ' + p.seg.toFixed(1) + ' s' + (p.falla ? ' [' + p.falla + ' fallan]' : '')).join(' · ') + ' · total ' + Math.round((performance.now() - t0) / 1000) + ' s').slice(0, 600), ms: 0, tAcum: Math.round((performance.now() - t0) / 100) / 10 });
      const bloqueados = out.filter(o => o.estado === 'BLOQUEADO').length;
      return { porPaso: porPaso.map(p => ({ paso: p.paso, seg: Math.round(p.seg * 10) / 10, comprobaciones: p.n, fallan: p.falla })), primerFallo: primera ? primera.name : null, passed: out.filter(o => o.ok).length, total: out.length, bloqueados, segundos: Math.round((performance.now() - t0) / 1000), build: location.origin, rama, duracion, results: out };
    }
  }

  window.AVQA_E2E = e2eTest;
  const poner = () => { if (window.AV) { window.AV.e2eTest = o => e2eTest(o); return true; } return false; };
  if (!poner()) { const t = setInterval(() => { if (poner()) clearInterval(t); }, 200); setTimeout(() => clearInterval(t), 120000); }
})();
