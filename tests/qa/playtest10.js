/* QA · playtest automático de 10 minutos (AV.playtest10) · no toca el juego, solo lo juega
   Un niño nuevo en un iframe del mismo origen con el almacenamiento vacío (la partida de la pestaña se respalda y se devuelve):
     1 menú de modos y creador corto · 2 vuelo · 3 coquí (neblina) · 3b coquí al atardecer · 3c bahía de noche ·
     4 comer un fruto · 5 lluvia · 6 rescate «Save the Parrot» · 7 río y peces con el visor · 7b edificios completos ·
     8 foto para el cómic (PNG) · 9 guardar y reabrir.
   Atajos, siempre dichos: AV.teleport (en vez de caminar), el tiempo es el del juego (T.tick, 0,05 s por cuadro), no el reloj de pared.
   Por tramo mide: segundos de juego, ms de pared, ms por cuadro (→ FPS sintéticos; el iframe no se pinta al frente), memoria del
   heap, errores de consola y «segundos sin acción» (cuadros de 0,5 s sin que el jugador se mueva ni pase algo del juego).
   Salida: AV.playtest10() → { passed, total, results, tramos, md } (md es el texto de docs/equipo/PLAYTEST10.md, sin las mejoras,
   que se escriben a mano a la vista de los números). Carga: inyectar este archivo y  await AV.playtest10(). */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 80); }
    return null;
  }
  const r1 = v => Math.round(v * 10) / 10;
  const s = v => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };
  const mb = () => { try { return performance.memory ? r1(performance.memory.usedJSHeapSize / 1048576) : null; } catch (e) { return null; } };

  async function playtest10(opts) {
    opts = opts || {};
    const out = [], tramos = [], bugs = [];
    const check = (name, ok, extra) => out.push({ name, ok: ok === true, extra: s(extra == null ? '' : extra).slice(0, 500) });
    const pack = (window.AV && window.AV.G && window.AV.G.pack) || {};
    const prefijo = (pack.meta && pack.meta.almacen) || 'amazonaverse';
    const respaldo = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(prefijo)) respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
    const limpiar = () => { try { for (const k of Object.keys(localStorage)) if (k.startsWith(prefijo)) localStorage.removeItem(k); } catch (e) { /* */ } };
    limpiar();
    const fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
    const url = new URL(location.href); url.search = ''; url.hash = '';
    let W = null, G, S, T, $;
    const abrir = async (viejo) => {
      const w = await until(() => { const x = fr.contentWindow; return x && !(viejo && x.__avViejo) && x.AV && x.AV.G && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x; }, opts.timeout || 180000, 100);
      if (w) await sleep(1000);
      return w;
    };
    const enlazar = () => { G = W.AV.G; S = G.S; T = G.pruebas; $ = id => W.document.getElementById(id); };
    fr.src = url.href; document.body.appendChild(fr);

    // ---------- Tramos ----------
    let tr = null, erroresVistos = 0;
    const errs = () => (W && W.__aveErrores) || [];
    const eventos = { n: 0 };
    const empezar = nombre => {
      cerrar();
      tr = { nombre, simS: 0, paredMs: 0, cuadros: 0, cuadroMs: 0, peorMs: 0, idleS: 0, idleMax: 0, _racha: 0, acciones: 0, heap0: mb(), heap1: null, errores: [], notas: [] };
      tr._t0 = performance.now(); tr._ev0 = eventos.n; erroresVistos = errs().length;
    };
    const cerrar = () => {
      if (!tr) return;
      tr.paredMs = Math.round(performance.now() - tr._t0); tr.heap1 = mb(); tr.errores = errs().slice(erroresVistos).map(e => String(e).slice(0, 160));
      tr.acciones += eventos.n - tr._ev0;
      tr.fps = tr.cuadros ? Math.round(1000 / (tr.cuadroMs / tr.cuadros)) : null;
      tr.cuadroMs = tr.cuadros ? r1(tr.cuadroMs / tr.cuadros) : null; tr.simS = r1(tr.simS); tr.idleS = r1(tr.idleS); tr.idleMax = r1(tr.idleMax);
      delete tr._t0; delete tr._ev0; delete tr._racha; tramos.push(tr); tr = null;
    };
    const nota = t => { if (tr) tr.notas.push(t); };
    const accion = () => { if (tr) tr.acciones++; };
    // Avanza el mundo `segs` segundos de juego en cuadros de 0,5 s. `mueve(i)` (opcional) hace lo que haría el jugador en ese cuadro.
    // Un cuadro de 0,5 s es «sin acción» si la cotorra no se movió ni pasó nada del juego (eventos) ni se llamó a accion().
    async function jugar(segs, mueve) {
      const n = Math.ceil(segs / 0.5);
      for (let i = 0; i < n; i++) {
        const p0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, ev0 = eventos.n, ac0 = tr.acciones;
        if (mueve) mueve(i, n);
        for (let k = 0; k < 10; k++) { const t = performance.now(); G.renderer.update(0.05); const d = performance.now() - t; tr.cuadros++; tr.cuadroMs += d; if (d > tr.peorMs) tr.peorMs = d; }
        tr.simS += 0.5;
        const quieto = Math.hypot(S.pos.x - p0.x, S.pos.y - p0.y, S.pos.z - p0.z) < 0.05 && eventos.n === ev0 && tr.acciones === ac0;
        if (quieto) { tr.idleS += 0.5; tr._racha += 0.5; if (tr._racha > tr.idleMax) tr.idleMax = tr._racha; } else tr._racha = 0;
        if (i % 8 === 7) await sleep(0);
      }
    }
    const tecla = (tipo, k) => W.dispatchEvent(new W.KeyboardEvent(tipo, { key: k, code: k === ' ' ? 'Space' : k, bubbles: true }));
    // Va hasta (x,z) con las teclas de verdad (W, Mayús al correr), girando la cámara hacia el destino como hace el niño con el ratón.
    // `max` segundos de juego como mucho; devuelve si llegó a 3 m. Volando, quien llama mantiene Espacio.
    const hacia = async (x, z, max, corre, mantener, tol) => {
      let guard = 0, llego = false;
      if (corre !== false) tecla('keydown', 'Shift');
      tecla('keydown', 'w');
      const lim = Math.ceil((max || 40) / 0.5);
      while (guard++ < lim) {
        const dx = x - S.pos.x, dz = z - S.pos.z;
        if (Math.hypot(dx, dz) < (tol || 3)) { llego = true; break; }
        G.camara.yaw = Math.atan2(-dx, -dz);
        if (mantener) mantener();
        await jugar(0.5);
        if (tr && guard % 6 === 1 && (tr.nombre[0] === '7' || tr.nombre[0] === '4')) nota('traza: ' + [S.pos.x, S.pos.y, S.pos.z].map(r1).join(',') + ' fly=' + G.fisica.MOVE.flying + ' v=' + r1(G.fisica.MOVE.speed) + ' yaw=' + r1(G.camara.yaw) + ' teclas=' + [...G.input.keys].join('+') + ' ocupado=' + G.ui.busy() + ' diálogo=' + (G.dialogo.activo && G.dialogo.activo()) + ' tarjeta=' + (W.document.querySelector('#card:not([hidden])') ? 'sí' : 'no') + ' obj=' + r1(x) + ',' + r1(z));
      }
      tecla('keyup', 'w'); tecla('keyup', 'Shift'); if (mantener) tecla('keyup', ' ');
      await jugar(0.5);
      return llego || Math.hypot(x - S.pos.x, z - S.pos.z) < (tol || 3);
    };
    const paso = async (nombre, fn) => {
      empezar(nombre);
      try { await fn(); } catch (e) { check(nombre + ' · sin excepción', false, (e && e.stack || e)); bugs.push({ tramo: nombre, que: 'excepción: ' + String(e && e.message || e).slice(0, 200), donde: String(e && e.stack || '').split('\n').slice(1, 3).join(' ').replace(/https?:\/\/[^/]+\//g, '').slice(0, 200) }); }
      cerrar();
    };
    const ir = (x, z, fx, fz) => { T.teleport(x, z, fx, fz); const M = G.fisica.MOVE; M.vx = 0; M.vz = 0; S.vy = 0; };   // atajo dicho: sin caminar; se quita el impulso que traía
    const lugar = (nombre, d) => { const p = G.terreno.places && G.terreno.places[nombre]; return p ? { x: p.x, z: p.z } : d; };

    try {
      W = await abrir();
      if (!W) { check('0 · La build arranca', false, 'no arrancó'); return fin(); }
      enlazar();
      G.on('aprendizaje', () => eventos.n++); G.on('banquete', () => eventos.n++);
      check('0 · La build arranca limpia', !S.profile.created, { version: W.AVE && W.AVE.version });

      // ---------- 1. Menú de modos y creador corto ----------
      await paso('1 · Menú de modos', async () => {
        const MM = G.menuModos;
        check('1 · Existe el menú «¿Cómo quieres jugar?» y la portada está abierta', !!MM && !!$('title') && $('title').open, { portada: $('title') && $('title').open, tarjetas: W.document.querySelectorAll('#modos [name=modo], #modos button, #modos input').length });
        if (!MM) return;
        await jugar(3);   // el niño mira las tarjetas
        const p = MM.elegir('libre');
        accion();
        await jugar(1);
        const creador = !$('creator').hidden;
        check('1 · Elegir «Mundo libre» abre el creador corto (primera vez)', creador, { creador, corto: $('creator').classList.contains('creator-corto') });
        const sel = $('p-species'), na = $('p-name-a'), nb = $('p-name-b');
        if (na && nb) { na.selectedIndex = 1 % na.options.length; nb.selectedIndex = 1 % nb.options.length; for (const e of [na, nb]) e.dispatchEvent(new W.Event('change', { bubbles: true })); }
        await jugar(4);   // elige nombre y plumaje
        $('p-save').click(); accion();
        await Promise.race([p, sleep(8000)]);
        await jugar(2);
        check('1 · Tras guardar el creador se juega: perfil creado, creador y portada cerrados', S.profile.created && $('creator').hidden && !$('title').open, { creado: S.profile.created, nombre: S.profile.name });
        if (G.dialogo.activo && G.dialogo.activo()) { nota('un diálogo abierto tras entrar al mundo libre'); T.drain(); }
        // El primer gesto del niño (tecla) dispara las cargas diferidas (banquete, minimapa…); clima, rescate y río llegan por temporizador
        W.dispatchEvent(new W.KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', bubbles: true })); W.dispatchEvent(new W.KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', bubbles: true }));
        const t0 = performance.now();
        const modulos = await until(() => G.clima && G.rescate && G.rioVivo && G.banquete, 30000, 250);
        const seg = r1((performance.now() - t0) / 1000);
        check('1 · Tras el primer gesto llegan clima, rescate, río y banquete (carga diferida)', !!modulos, { segundos: seg, clima: !!G.clima, rescate: !!G.rescate, rioVivo: !!G.rioVivo, banquete: !!G.banquete });
        nota('módulos diferidos listos a los ' + seg + ' s de pared tras el primer gesto');
        const look = W.AV && W.AV.look;
        check('1 · El look de fábrica es el toon (vibrant_toon), sin pedirlo en la URL', !!look && look.actual === 'vibrant_toon', look && look.actual);
        const cielo = G.renderer.scene && G.renderer.scene.getObjectByName('cielo');
        const nubes = G.renderer.scene && G.renderer.scene.getObjectByName('cielo-nubes');
        check('1 · El cielo vivo está en la escena (degradado y nubes)', !!cielo && !!nubes, { cielo: !!cielo, nubes: !!nubes, calidad: G.renderer.calidad && G.renderer.calidad.nivel });
      });

      // ---------- 2. Vuelo ----------
      await paso('2 · Vuelo', async () => {
        const v0 = lugar('villa', { x: S.pos.x, z: S.pos.z });
        ir(v0.x, v0.z + 4, 0, 1); await jugar(1);
        const M = G.fisica.MOVE, y0 = S.pos.y;
        tecla('keydown', ' '); accion(); await jugar(2.5); tecla('keyup', ' ');   // salto + doble toque = vuelo, como el niño
        tecla('keydown', ' '); await jugar(0.5); tecla('keyup', ' ');
        nota('vuelo tras Espacio ×2: ' + M.flying + ' · fase ' + M.fase);
        if (!M.flying) { G.fisica.startFlying && G.fisica.startFlying(); nota('el doble Espacio no despegó: se fuerza startFlying'); }
        S.pos.y += 12; tecla('keydown', ' ');   // se mantiene Espacio: sube y se sostiene
        const lejos = ['taller', 'A', 'B', 'mirador', 'villa'].map(n => lugar(n, null)).filter(p => p && Math.hypot(p.x - v0.x, p.z - v0.z) > 80).sort((a, b) => Math.hypot(a.x - v0.x, a.z - v0.z) - Math.hypot(b.x - v0.x, b.z - v0.z))[0];
        const dest = lejos || { x: v0.x + 100, z: v0.z };
        const dist = Math.hypot(dest.x - S.pos.x, dest.z - S.pos.z);
        const llego = await hacia(dest.x, dest.z, 45, false);
        nota('vuelo de ' + Math.round(dist) + ' m en ' + tr.simS + ' s de juego');
        check('2 · Vuela a otro lugar sin errores y llega en 45 s', llego && errs().length === erroresVistos, { alto: r1(S.pos.y - y0), llego, falta: r1(Math.hypot(S.pos.x - dest.x, S.pos.z - dest.z)), volando: M.flying });
        await jugar(3);
        tecla('keyup', ' '); tecla('keydown', 'x');   // X = aterrizar (se mantiene hasta tocar suelo)
        for (let i = 0; i < 80 && M.flying; i++) await jugar(0.5);
        tecla('keyup', 'x'); nota('aterrizó tras ' + r1(tr.simS) + ' s de juego en el tramo (desde ~60 m)');
        await jugar(2);
        check('2 · Aterriza (no queda volando)', !M.flying, { grounded: M.grounded });
      });

      // ---------- 3. Coquí ----------
      await paso('3 · Coquí', async () => {
        const cl = G.clima;
        if (cl && cl.fijar) { cl.fijar('neblina', { inmediato: true }); }
        else nota('sin G.clima: el coquí solo se ve con la misión M3');
        const z = (G.pack.datos && G.pack.datos.zonas && G.pack.datos.zonas.coquiHojas) || { x: -10, z: -185 };
        const arb = (G.c && G.c.BUSHES && G.c.BUSHES[0]) || z;
        ir(arb.x + 1.9, arb.z + 0.3, -1, 0); S.pos.y = G.terreno.height(S.pos.x, S.pos.z); await jugar(1);   // el coquí está a 0,7 m del arbusto y se observa a menos de 4 m
        nota('diag: teclas=' + [...G.input.keys].join(',') + ' · vuela=' + G.fisica.MOVE.flying + ' · nada=' + G.fisica.MOVE.swimming + ' · pos=' + [S.pos.x, S.pos.y, S.pos.z].map(r1).join(',') + ' · arbusto=' + [arb.x, arb.z].join(','));
        nota('antes de mirar: ocupado=' + G.ui.busy() + ' · diálogo=' + (G.dialogo.activo && G.dialogo.activo()) + ' · posada=' + G.fisica.MOVE.posado + ' · vel=' + r1(G.fisica.MOVE.speed) + ' · a ' + r1(Math.hypot(S.pos.x - arb.x, S.pos.z - arb.z)) + ' m del arbusto ' + (arb.id || ''));
        const antes = (S.fauna || []).slice();
        await jugar(10);   // quieta y mirando, como haría un niño
        const nuevos = (S.fauna || []).filter(x => !antes.includes(x));
        check('3 · Quieta junto al coquí con neblina lo observa (S.fauna)', nuevos.includes('coqui') || (S.fauna || []).includes('coqui'), { fauna: S.fauna, clima: cl && cl.estado && s(cl.estado()) });
        if (!(S.fauna || []).includes('coqui')) bugs.push({ tramo: '3 · Coquí', que: 'quieta 8 s junto al arbusto con neblina fijada y no se observa el coquí (¿arbusto fuera de la zona o clima no aplicado?)', donde: 'src/game/fauna.js:280 coquiVisible / :294 observar' });
      });

      // ---------- 3b. Coquí al atardecer (C9): sin neblina, con el atardecer forzado y M3 hecha ----------
      await paso('3b · Coquí al atardecer', async () => {
        const cl = G.clima;
        if (cl && cl.fijar) cl.fijar('sol', { inmediato: true, forzar: true });
        const cargar = W.AV && W.AV.atardecer;
        if (typeof cargar !== 'function') { check('3b · Se puede cargar el atardecer', false, 'sin AV.atardecer'); return; }
        const A = G.atardecer || await cargar();
        if (!A || !A.forzar) { check('3b · El atardecer expone forzar', false, 'no cargó'); return; }
        const m3 = !!(S.missions && S.missions.m3);
        S.missions = S.missions || {}; S.missions.m3 = true; // atajo dicho: tras M3 el coquí solo sale de tarde
        A.forzar(true); A.avanzar((A.DUR || 8) + 1); await jugar(1);
        nota('atardecer activo=' + A.activo() + ' · hora=' + S.hora + ' · k=' + (A.k && r1(A.k())));
        const z = (G.pack.datos && G.pack.datos.zonas && G.pack.datos.zonas.coquiHojas) || { x: -10, z: -185 };
        const arb = (G.c && G.c.BUSHES && G.c.BUSHES[0]) || z;
        ir(arb.x + 1.9, arb.z + 0.3, -1, 0); S.pos.y = G.terreno.height(S.pos.x, S.pos.z);
        if (Array.isArray(S.fauna)) { const i = S.fauna.indexOf('coqui'); if (i >= 0) S.fauna.splice(i, 1); } // se vuelve a observar: el de la neblina no cuenta
        const antes = (S.fauna || []).slice();
        if (G.camara.place) G.camara.place(true);
        if (G.renderer.render) G.renderer.render(0.05, false);
        await jugar(8);
        if (G.camara.place) G.camara.place(true);
        if (G.renderer.render) G.renderer.render(0.05, false);
        const vio = (S.fauna || []).includes('coqui') && !antes.includes('coqui');
        const est = A.estado ? A.estado() : {};
        check('3b · Con sol y atardecer, quieta junto al arbusto, observa al coquí', vio && A.activo(), { fauna: S.fauna, hora: S.hora, antes, clima: cl && cl.estado && s(cl.estado()) });
        check('3b · Hay luciérnagas del atardecer cerca del arbusto', !!est.luciernagas, est);
        nota('peor cuadro del atardecer: ' + Math.round(tr.peorMs) + ' ms');
        if (!vio) bugs.push({ tramo: '3b · Coquí al atardecer', que: 'con sol, M3 hecha y atardecer forzado no se observa el coquí', donde: 'src/game/fauna.js coquiVisible / src/game/atardecer.js' });
        A.forzar(false); A.avanzar((A.DUR || 8) + 1); A.forzar(null);
        if (m3) S.missions.m3 = true; else delete S.missions.m3;
        if (cl && cl.fijar) { cl.fijar('sol', { inmediato: true, forzar: true }); cl.fijar(null); }
      });

      // ---------- 3c. Bahía bioluminiscente de noche (G5) ----------
      await paso('3c · Bahía de noche', async () => {
        const esperar = async () => { const t0 = performance.now(); while (performance.now() - t0 < 8000) { if (G.maravillas) return G.maravillas; await sleep(100); } return G.maravillas || null; };
        const M = await esperar();
        if (!M || !M.bahia) { check('3c · Maravillas cargadas y la caleta está en el mapa', false, 'sin G.maravillas'); return; }
        const hora0 = S.hora, tenia = Object.prototype.hasOwnProperty.call(S, 'hora');
        S.hora = 21;
        ir(M.bahia.x, M.bahia.z, 0, -1); S.pos.y = G.terreno.height(S.pos.x, S.pos.z) + 3;
        await jugar(3);
        const chi = G.renderer.scene && G.renderer.scene.getObjectByName('bahia_bio');
        const n = chi && chi.geometry && chi.geometry.drawRange ? chi.geometry.drawRange.count : 0;
        check('3c · De noche, en la caleta, se ven las chispas azules', !!(chi && chi.visible && n > 0), { fase: M.fase && M.fase(S.clock || 0), n, visible: chi && chi.visible, hora: S.hora, pos: [r1(S.pos.x), r1(S.pos.z)] });
        nota('bahía en ' + [r1(M.bahia.x), r1(M.bahia.z)].join(',') + ' · chispas ' + n + ' · peor cuadro ' + Math.round(tr.peorMs) + ' ms');
        if (!(chi && chi.visible && n > 0)) bugs.push({ tramo: '3c · Bahía de noche', que: 'de noche en la caleta no se dibujan las chispas', donde: 'src/game/maravillas.js faseDe / chispas' });
        if (tenia) S.hora = hora0; else delete S.hora;
      });

      // ---------- 4. Comer un fruto ----------
      await paso('4 · Comer un fruto', async () => {
        const B = G.banquete;
        if (!B) { check('4 · Existe el Banquete', false, 'sin G.banquete'); return; }
        const d = B._dev; let fr = null;
        for (let i = 0; i < 8 && !fr; i++) { const act = d.mundo.lista.filter(f => f.activo); fr = act[0]; if (!fr) await jugar(3); }
        if (!fr) { check('4 · Hay un fruto a la vista', false, B.estado()); return; }
        // 4a. Volando se recoge al pasar: el niño lo intenta con varios (un tronco o una rama puede cerrar el paso)
        let hecho = false, intentos = 0; const l0 = B.estado().llevo;
        const cand = d.mundo.lista.filter(f => f.activo).sort((p, q) => Math.hypot(p.x - S.pos.x, p.z - S.pos.z) - Math.hypot(q.x - S.pos.x, q.z - S.pos.z)).slice(0, 6);
        for (const f of cand) {
          if (hecho) break; intentos++;
          ir(f.x + 9, f.z, -1, 0); await jugar(0.5);
          G.fisica.startFlying(); S.pos.y = f.y - 3.8; accion();   // el despegue la sube ~4 m
          await hacia(f.x, f.z, 4, false, null, 0.8);   // sin Espacio: planea hacia el fruto
          hecho = B.estado().llevo > l0 || !f.activo; fr = f;
          nota('fruto en ' + [f.x, f.y, f.z].map(r1).join(',') + ' · cotorra en ' + [S.pos.x, S.pos.y, S.pos.z].map(r1).join(',') + ' · queda a ' + r1(Math.hypot(f.x - S.pos.x, f.z - S.pos.z)) + ' m en planta y ' + r1(S.pos.y - f.y) + ' m de alto · vuela=' + G.fisica.MOVE.flying + ' · listo=' + B.listo);
        }
        check('4 · Volando contra un fruto se recoge (el Banquete lo lleva)', hecho, { intentos, llevo: [l0, B.estado().llevo], listo: B.listo });
        nota('frutos intentados hasta recoger uno: ' + intentos);
        // 4b. Posada junto a otro fruto la Acción dice «Comer» (atajo dicho: se coloca la cotorra en la rama)
        const fr2 = d.mundo.lista.find(f => f.activo && f !== fr);
        if (!fr2) { nota('no hay un segundo fruto activo para comer'); return; }
        G.fisica.endFlight(); G.fisica.MOVE.grounded = true;
        S.pos.x = fr2.x + 0.5; S.pos.z = fr2.z; S.pos.y = fr2.y - 0.7; G.emit('update', 0.016, false, false);
        const cerca = G.interaccion.nearest(), c0 = B.estado().comidos;
        if (cerca && cerca.id === 'bq_fruto') G.interaccion.action();
        accion(); await jugar(3);
        try { const dd = B._dev.destino(); if (dd) { ir(dd.x + 1, dd.z, -1, 0); await jugar(1); B.entregar(dd); await jugar(1); } nota('al entregar al nido: llevo=' + B.estado().llevo + ' · entregados=' + B.estado().entregados); if (B.estado().llevo > 0) { B._dev.B.llevo = 0; nota('atajo: no se pudo entregar en la prueba; se vacían las patas a mano para que el rescate no diga «ocupado»'); } } catch (e) { nota('entregar: ' + e.message); }   // lo que lleva se entrega al nido: así el rescate no lo encuentra «ocupado»
        check('4 · Posada junto al fruto, Acción = «Comer» y cuenta (comidos +1)', !!cerca && cerca.id === 'bq_fruto' && B.estado().comidos === c0 + 1, { cerca: cerca && cerca.id, estado: B.estado() });
        if (!(cerca && cerca.id === 'bq_fruto')) bugs.push({ tramo: '4 · Comer', que: 'posada junto a un fruto con uno en las patas, la Acción no ofrece «Comer»', donde: 'src/game/banquete.js:272 itAccion' });
      });

      // ---------- 5. Lluvia ----------
      await paso('5 · Lluvia', async () => {
        const cl = G.clima;
        if (!cl) { check('5 · Existe el clima', false, 'sin G.clima (la prueba sigue)'); return; }
        const t = performance.now(); cl.fijar('aguacero', { inmediato: true, forzar: true }); await jugar(10);
        const e = cl.estado();
        check('5 · La lluvia entra y no baja de 15 FPS sintéticos', s(e).includes('aguacero') && (1000 / (tr.cuadroMs / tr.cuadros)) > 15, e);
        nota('lluvia: ' + r1(tr.cuadroMs / tr.cuadros) + ' ms por cuadro');
        cl.fijar('sol', { inmediato: true }); await jugar(2);
      });

      // ---------- 6. Rescate «Save the Parrot» ----------
      await paso('6 · Rescate', async () => {
        const R = G.rescate;
        if (!R) { check('6 · Existe el rescate', false, 'sin G.rescate'); return; }
        ir(S.pos.x, S.pos.z, 0, 1); S.pos.y = G.terreno.height(S.pos.x, S.pos.z);
        const ok = await R.jugar({ forzar: true, sinCuenta: true });
        accion();
        await jugar(2);
        const e0 = R.estado();
        check('6 · «Save the Parrot» arranca', !!ok && e0.activo, e0);
        if (!e0.activo) return;
        // el niño busca al pichón: va hacia él y lo agarra
        const pi = R._dev.pichon, sitio = R._dev.R.sitio;
        const pos = (pi && pi.g && pi.g.position) || sitio;
        await hacia(pos.x, pos.z, 40, true);
        let g = false; try { g = R.agarrar(); } catch (e) { nota('agarrar lanzó: ' + e.message); }
        accion(); await jugar(4);
        const e1 = R.estado();
        check('6 · Se juega el rescate (agarra al pichón o sigue en curso sin error)', !errs().length, { g, e0: e0.fase, e1 });
        await jugar(20);   // lo que tarde el niño en volver a la rama; si hay cuenta atrás se ve aquí
        const e2 = R.estado();
        nota('fase tras 26 s: ' + e2.fase + ' · intentos ' + e2.intentos);
        try { R.salir(); } catch (e) { /* ya fuera */ }
        await jugar(2);
        check('6 · Se puede salir del rescate y el mundo queda libre', !R.activo(), R.estado());
      });

      // ---------- 7. Río y peces con el visor ----------
      await paso('7 · Río y peces', async () => {
        const RV = G.rioVivo;
        if (!RV) { check('7 · Existe el río vivo', false, 'sin G.rioVivo'); return; }
        const bs = RV.bancos; const bancos = typeof bs === 'function' ? bs() : bs;
        const b = (bancos || [])[0];
        if (!b) { check('7 · Hay bancos de peces', false, 'sin bancos'); return; }
        const M = G.fisica.MOVE;
        // vuelo bajo sobre el agua (visor automático): se sostiene a ~2 m del agua tocando Espacio solo si baja de eso
        const niv = (x, z) => { const l = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity; return Number.isFinite(l) ? l : G.terreno.height(x, z); };
        ir(b.x + 25, b.z, -1, 0); await jugar(1);
        G.fisica.startFlying(); S.pos.y = niv(b.x + 25, b.z) + 2; accion();
        let visor = false, mir = null;
        const vistos0 = RV.estado().vistos.length;
        let altMin = 1e9, altMax = -1e9;
        const sostener = () => { const al = S.pos.y - niv(S.pos.x, S.pos.z); altMin = Math.min(altMin, al); altMax = Math.max(altMax, al); const bajo = al < 1.0; tecla(bajo ? 'keydown' : 'keyup', ' '); const e = RV.estado(); visor = visor || e.visor; mir = e.mirando || mir; };
        await hacia(b.x, b.z, 30, false, sostener);
        for (let i = 0; i < 24 && (S.peces || []).length === vistos0; i++) { sostener(); await jugar(0.5); }
        tecla('keyup', ' ');
        if ((S.peces || []).length === vistos0) {   // el niño aterriza en la orilla y se queda quieto mirando
          tecla('keydown', 'x'); for (let i = 0; i < 40 && G.fisica.MOVE.flying; i++) await jugar(0.5); tecla('keyup', 'x');
          for (let i = 0; i < 24 && (S.peces || []).length === vistos0; i++) { visor = visor || RV.estado().visor; await jugar(0.5); }
          nota('sin pez volando: se aterrizó y se esperó quieta; pez observado: ' + ((S.peces || []).length > vistos0));
        }
        nota('altura sobre el agua: ' + r1(altMin) + ' a ' + r1(altMax) + ' m · agua en ' + r1(niv(b.x, b.z)) + ' · cerca del banco: ' + r1(Math.hypot(S.pos.x - b.x, S.pos.z - b.z)) + ' m');
        const e = RV.estado();
        check('7 · Volando bajo sobre el río se enciende el visor', visor || e.visor || (S.peces || []).length > vistos0, { visor: e.visor, mirando: mir });
        check('7 · Se observa un pez y entra al álbum (S.peces)', (S.peces || []).length > vistos0, { vistos: e.vistos, peces: S.peces });
        if (!((S.peces || []).length > vistos0)) bugs.push({ tramo: '7 · Peces', que: 'volando a 2,5 m sobre un banco y 12 s de juego no se observa ningún pez', donde: 'src/game/rio_vivo.js:178 observar / :250 visorPosible' });
        tecla('keydown', 'x'); for (let i = 0; i < 40 && G.fisica.MOVE.flying; i++) await jugar(0.5); tecla('keyup', 'x'); await jugar(1);
      });

      // ---------- 7b. Edificios completos (kit HD) en la zona con más casas ----------
      await paso('7b · Edificios', async () => {
        const ST = (G.mundo && G.mundo.streaming) || (G.streaming && G.streaming.gestor) || null;
        if (!ST || !ST.zonas) { check('7b · Hay streaming de edificios', false, ST ? 'sin zonas' : 'sin gestor'); return; }
        const zs = Object.values(ST.zonas);
        if (!zs.length) { check('7b · El mapa tiene zonas de edificios', false, '0 zonas'); return; }
        const Z = zs.slice().sort((a, b) => (b.inst || []).length - (a.inst || []).length)[0];
        const cal0 = G.renderer.calidad && G.renderer.calidad.nivel;
        if (G.renderer.setCalidad) G.renderer.setCalidad('alto', true);
        ir(Z.cx + Math.min(Z.r || 20, 40) + 25, Z.cz, -1, 0); await jugar(1);
        ir(Z.cx, Z.cz, 0, -1); S.pos.y = G.terreno.height(S.pos.x, S.pos.z) + 6;
        if (G.camara.place) G.camara.place(true);
        if (ST.revisar) ST.revisar(S.pos.x, S.pos.z);
        if (G.renderer.render) G.renderer.render(0.05, false);
        let st = ST.stats ? ST.stats() : null;
        for (let i = 0; i < 16; i++) { await jugar(0.5); st = ST.stats ? ST.stats() : st; if (st && st.visiblesHD > 0 && st.descargando === 0 && st.trabajos === 0) break; }
        const peorLlegada = tr.peorMs;
        if (ST.terminar) { try { await ST.terminar(); } catch (e) { nota('terminar: ' + e.message); } }
        await jugar(2);
        st = ST.stats ? ST.stats() : st;
        check('7b · Junto a la zona más llena se dibuja el edificio completo', !!(st && st.hd && st.visiblesHD > 0), { zona: Z.id, inst: (Z.inst || []).length, stats: st, calidad: G.renderer.calidad && G.renderer.calidad.nivel });
        nota('zona ' + Z.id + ' · HD visibles ' + (st && st.visiblesHD) + ' · modelos HD ' + (st && st.modelosHD) + ' · peor al llegar ' + Math.round(peorLlegada) + ' ms · peor del tramo ' + Math.round(tr.peorMs) + ' ms');
        if (!(st && st.visiblesHD > 0)) bugs.push({ tramo: '7b · Edificios', que: 'en la zona con más casas, en calidad alta, no hay ninguna malla _hd a la vista', donde: 'src/engine/streaming.js hd' });
        if (peorLlegada >= 100) bugs.push({ tramo: '7b · Edificios', que: 'al entrar en la zona el peor cuadro fue ' + Math.round(peorLlegada) + ' ms (meta < 100)', donde: 'src/engine/streaming.js' });
        if (G.renderer.setCalidad && cal0) G.renderer.setCalidad(cal0, false);
      });

      // ---------- 8. Foto para el cómic ----------
      await paso('8 · Foto para el cómic', async () => {
        const C = G.comic;
        if (!C) { check('8 · Existe el cómic', false, 'sin G.comic'); return; }
        const casa = lugar('villa', { x: S.pos.x, z: S.pos.z });
        ir(casa.x, casa.z + 4, 0, 1); await jugar(1);
        let img = null; try { img = G.renderer.snapshot(480, 360, 0.72); } catch (e) { nota('snapshot lanzó ' + e.message); }
        accion();
        check('8 · La foto del mundo se toma (snapshot no nulo)', !!img, img ? (img.length || 'ok') : 'null: el iframe no se pinta o el lienzo no tiene tamaño');
        let png = null;
        try { if (C.pngSinRegistro) png = await C.pngSinRegistro(); } catch (e) { nota('pngSinRegistro: ' + e.message); }
        check('8 · El cómic se exporta a PNG', !!png && (png.size > 2000 || png.length > 2000 || png instanceof W.Blob), png ? (png.size || png.length) : 'sin PNG');
        await jugar(2);
      });

      // ---------- 8b. Paseo por el mapa hasta completar 10 minutos de juego (FPS y memoria sostenidos) ----------
      await paso('8b · Paseo hasta los 10 min', async () => {
        const hecho = () => tramos.reduce((a, x) => a + x.simS, 0) + tr.simS;
        const sitios = Object.entries(G.terreno.places || {}).map(([n, p]) => ({ n, x: p.x, z: p.z }));
        const M = G.fisica.MOVE; let i = 0, tramosHechos = 0, sinLlegar = 0;
        const h0 = mb();
        while (hecho() < 600 && sitios.length && i < 60) {
          const s1 = sitios[i++ % sitios.length];
          if (G.dialogo.activo && G.dialogo.activo()) T.drain();
          G.fisica.startFlying();   // en vuelo, a ~8 m del suelo (a pie se topa con troncos y agua y la prueba no mediría el juego)
          const ok = await hacia(s1.x, s1.z, 40, true, () => tecla(S.pos.y - G.terreno.height(S.pos.x, S.pos.z) < 8 ? 'keydown' : 'keyup', ' '), 4);
          tecla('keyup', ' ');
          tecla('keyup', 'w'); tecla('keyup', 'Shift');
          tramosHechos++; if (!ok) sinLlegar++;
          await jugar(2);   // mira alrededor
        }
        const total = hecho();
        check('8b · Se completan 10 min de juego sin errores', total >= 600 && errs().length === erroresVistos, { minutos: r1(total / 60), tramos: tramosHechos, sinLlegar });
        const h1 = mb();
        check('8b · La memoria no crece más de 60 MB en el paseo', h0 == null || h1 == null || h1 - h0 < 60, { heap: h0 + '→' + h1 + ' MB' });
        nota('paseo: ' + tramosHechos + ' destinos, ' + sinLlegar + ' sin llegar en 40 s · heap ' + h0 + '→' + h1);
      });

      // ---------- 9. Guardar y reabrir ----------
      await paso('9 · Guardar y reabrir', async () => {
        const antes = { nombre: S.profile.name, fauna: (S.fauna || []).slice(), peces: (S.peces || []).slice(), rescates: S.rescates || 0 };
        const guardo = G.guardado.save(true); accion();
        await jugar(1);
        errs().length && nota('errores acumulados antes de recargar: ' + errs().length);
        W.__avViejo = true; fr.contentWindow.location.reload();
        W = await abrir(true);
        if (!W) { check('9 · Reabrir el juego', false, 'no volvió a arrancar'); return; }
        enlazar();
        const des = { nombre: S.profile.name, fauna: (S.fauna || []).slice(), peces: (S.peces || []).slice(), rescates: S.rescates || 0 };
        check('9 · Al reabrir la partida sigue (nombre, fauna, peces, rescates)', guardo !== false && s(des) === s(antes), { guardo, antes, des });
        const t = $('title');
        check('9 · Al reabrir se ve la portada de modos (no cae en la historia sin avisar)', !!t && t.open, { portada: t && t.open });
        if (t && t.open && G.menuModos) { G.menuModos.elegir('libre'); await sleep(1500); }
        check('9 · «Mundo libre» entra directo sin creador', $('creator').hidden && !$('title').open, { creador: !$('creator').hidden });
      });
      cerrar();
    } catch (e) {
      check('Playtest sin excepción global', false, e && e.stack || e);
    }
    return fin();

    function fin() {
      cerrar();
      const erroresTotal = tramos.reduce((a, t) => a + t.errores.length, 0);
      check('0 · Cero errores de consola en todo el recorrido', erroresTotal === 0, tramos.filter(t => t.errores.length).map(t => t.nombre + ': ' + t.errores[0]).join(' | '));
      try { if (fr.parentNode) fr.remove(); } catch (e) { /* */ }
      try { limpiar(); for (const [k, v] of Object.entries(respaldo)) localStorage.setItem(k, v); } catch (e) { /* */ }
      const tot = tramos.reduce((a, t) => ({ sim: a.sim + t.simS, idle: a.idle + t.idleS }), { sim: 0, idle: 0 });
      const md = ['| Tramo | Juego (s) | Pared (s) | ms/cuadro | FPS sint. | Peor cuadro | Sin acción (s) | Racha mayor (s) | Heap MB | Errores |', '|---|---|---|---|---|---|---|---|---|---|']
        .concat(tramos.map(t => `| ${t.nombre} | ${t.simS} | ${r1(t.paredMs / 1000)} | ${t.cuadroMs} | ${t.fps} | ${Math.round(t.peorMs)} ms | ${t.idleS} | ${t.idleMax} | ${t.heap0}→${t.heap1} | ${t.errores.length} |`))
        .concat(['', `Total: ${r1(tot.sim)} s de juego (${r1(tot.sim / 60)} min), ${r1(tot.idle)} s sin acción.`]);
      const datos = { tramos, bugs, md: md.join('\n') };
      out.push({ name: 'DATOS (informe)', ok: true, extra: s(datos) });   // el ejecutor de baterías solo devuelve results: los datos van aquí, sin recortar
      return Object.assign({ passed: out.filter(o => o.ok).length, total: out.length, results: out }, datos);
    }
  }

  const AV = (window.AV = window.AV || {});
  AV.playtest10 = playtest10;
  AV.playtest10Test = playtest10; // solo corre si este archivo se inyecta; test.sh no lo inyecta
})();
