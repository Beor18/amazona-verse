/* AVE · AV.gestosTest (E17): los gestos de Vittata (src/engine/actores.js EMOTES + src/personaje/character.js emotePose).
   Se carga al pedir la prueba (boot.js), no en la descarga inicial. Comprueba:
   - Datos y menú: 10 gestos con su pose o clip, teclas 1–9 y 0, botones de 44 px o más.
   - Pose de verdad y sin acumular: dos Vittatas gemelas fuera de la escena (mismo azar, mismos cuadros); una hace el gesto y la
     otra no. Durante el gesto los huesos cambian de verdad (ángulos); al terminar, todos los huesos quedan igual que en la
     gemela (diferencia < 0,01 rad) y la raíz en su sitio. «Dormir» cierra los ojos. Con «Reducir movimiento» el susto salta menos.
   - En el juego: cada gesto nuevo empieza, suena (G.audio.alSonar, suene o no), pone su pose y termina; el baile toca su ritmo;
     «Dormir» saca los zzz y se corta al moverse (con un aleteo).
   Deja a Vittata, el sonido y el menú como estaban. Devuelve { passed, total, results }. */
window.AVGestosTest = function (G) {
  'use strict';
  const NUEVOS = ['bailar', 'saludo_pata', 'susto', 'dormir'];
  // Huesos que cada pose debe mover (al menos uno, más de MIN rad respecto a la gemela)
  const CLAVE = { dance: ['espalda1', 'armL1', 'armL1001', 'cabeza'], wave: ['pieL1', 'pieL2', 'pieL3'], scare: ['armL1', 'armL1001', 'cabeza'], sleep: ['cabeza', 'pieL2', 'pieL2001'] };
  const MIN = 0.15, TOL = 0.01, DT = 1 / 30;
  let oyente = null;
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const A = G.actores, S = G.S, M = G.fisica.MOVE;
    const fin = () => ({ passed: results.filter(r => r.ok).length, total: results.length, results });
    if (!A || !A.EMOTES) { ok('Gestos cargados', false, 'sin G.actores'); return fin(); }
    const E = A.EMOTES, K = A.EMOTE_KEYS;
    // ---------- 1. Datos, teclas y menú ----------
    ok('Hay 10 gestos y los nuevos tienen su pose (saludo de pata, susto, dormir; bailar mejorado)',
      K.length === 10 && E.saludo_pata && E.saludo_pata.pose === 'wave' && E.susto && E.susto.pose === 'scare' && E.dormir && E.dormir.pose === 'sleep' && E.bailar.pose === 'dance' && E.bailar.ritmo, K.join(','));
    ok('Todos los gestos tienen clip o pose (el pichón y el modo en línea los copian)', K.every(n => E[n].clip || E[n].pose));
    ok('Teclas: 1 → saludar, 8 → saludo de pata, 9 → susto, 0 → dormir', A.gestoDeTecla('1') === 'saludar' && A.gestoDeTecla('8') === 'saludo_pata' && A.gestoDeTecla('9') === 'susto' && A.gestoDeTecla('0') === 'dormir' && A.gestoDeTecla('x') === null);
    ok('Los gestos nuevos suenan con muestras de Suno (sfx) que existen', ['saludo_pata', 'susto', 'dormir'].every(n => (E[n].sfx || []).some(s => G.audio.muestras().includes(s))), ['saludo_pata', 'susto', 'dormir'].map(n => (E[n].sfx || []).join('+')).join(' · '));
    const menu = document.getElementById('emotes'), oculto = menu.hidden;
    menu.hidden = false;
    const bs = [...menu.querySelectorAll('[data-emote]')], tam = bs.map(b => ({ width: b.offsetWidth, height: b.offsetHeight })); // tamaño de maqueta (sin la escala de la animación pop-in)
    ok('El menú tiene los 10 botones numerados (… 8, 9 y 0)', bs.length === 10 && /^8\s·\s/.test(bs[7].textContent) && /^9\s·\s/.test(bs[8].textContent) && /^0\s·\s/.test(bs[9].textContent), bs.map(b => b.textContent).join(' | '));
    ok('Botones de gestos de 44 px o más', tam.length === 10 && tam.every(r => r.height >= 44 && r.width >= 44), tam.map(r => Math.round(r.width) + '×' + Math.round(r.height)).join(' '));
    const desb = bs.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent);
    ok('Ningún texto de gesto se sale de su botón', !desb.length, desb.join(' | '));
    // A 390 px: el número no se queda solo en su línea (espacio duro entre número y nombre)
    ok('El número del gesto va pegado a su nombre (no se queda solo en una línea)', bs.every(b => /^\d\u00a0·\u00a0/.test(b.textContent)), bs.map(b => JSON.stringify(b.textContent.slice(0, 4))).join(' '));
    menu.hidden = oculto;
    { // F22: el menú con teclado: aria-expanded/aria-controls en «Gestos», nombre del menú, Enter lo abre con el foco en el primer gesto y Esc lo cierra
      const bE = document.getElementById('b-emotes'), f0 = document.activeElement;
      menu.hidden = true; await new Promise(r => setTimeout(r, 0));
      const aria0 = bE.getAttribute('aria-controls') === 'emotes' && bE.getAttribute('aria-expanded') === 'false' && menu.getAttribute('role') === 'group' && !!menu.getAttribute('aria-label');
      bE.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
      const abierto = !menu.hidden && bE.getAttribute('aria-expanded') === 'true', seVe = menu.getClientRects().length > 0 && getComputedStyle(menu).visibility !== 'hidden';
      const foco1 = document.activeElement === menu.querySelector('button') || !seVe;
      const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }); if (seVe) dispatchEvent(ev); else menu.hidden = true;
      const cerrado = !seVe || (menu.hidden && ev.defaultPrevented && document.activeElement === bE);
      await new Promise(r => setTimeout(r, 0));
      ok('F22 · Menú de gestos con teclado: «Gestos» dice si está abierto, Enter lo abre con el foco en el primer gesto y Esc lo cierra (el foco vuelve)', aria0 && abierto && foco1 && cerrado && bE.getAttribute('aria-expanded') === 'false',
        JSON.stringify({ aria0, abierto, seVe, foco1, cerrado, exp: bE.getAttribute('aria-expanded') }));
      menu.hidden = oculto; try { if (f0 && f0.focus) f0.focus({ preventScroll: true }); } catch (e) { /* */ }
    }

    // ---------- 2. Gemelas: la pose cambia de verdad y al terminar todo vuelve exacto ----------
    if (!window.AVCharacter || A.failed3D) ok('Modelo 3D de Vittata', false, 'sin AVCharacter');
    else {
      const [a, b] = await Promise.all([window.AVCharacter.create(), window.AVCharacter.create()]);
      const semilla = n => () => { n = (n + 0x6D2B79F5) | 0; let t = Math.imul(n ^ (n >>> 15), 1 | n); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const rA = semilla(17), rB = semilla(17);
      for (const c of [a, b]) Object.assign(c, { wingMode: 'idle', expression: 'neutral', gait: 0, speed: 0, airborne: false, flying: false, posado: '', agachada: 0, groundY: 0, groundAt: () => 0, emote: null, emoteSuave: false });
      const paso = (c, rnd) => { const r0 = Math.random; Math.random = rnd; try { c.root.position.set(0, 0, 0); c.update(DT); } finally { Math.random = r0; } };
      const cuadros = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); paso(a, rA); paso(b, rB); } };
      const huesos = Object.keys(a.bones).filter(n => a.bones[n] && b.bones[n]);
      const dif = lista => { let m = 0, cual = ''; for (const n of lista || huesos) { const p = a.bones[n], q = b.bones[n]; if (!p || !q) continue; for (const ax of ['x', 'y', 'z']) { const d = Math.max(Math.abs(p.rotation[ax] - q.rotation[ax]), Math.abs(p.scale[ax] - q.scale[ax])); if (d > m) { m = d; cual = n + '.' + ax; } } } return { m, cual }; }; // rotación y escala (las puntas del ala que abre emoteAlas)
      // Cierre del párpado (0 abierto … 1 cerrado), deshaciendo character.js _lid()
      const cierre = l => { const F = l.userData && l.userData.fit; if (!F) return 0; const mg = 0.1, edge = -l.rotation.x - F.alpha; return ((F.th + mg) - edge) / (2 * F.th + 2 * mg); };
      const r3 = x => Math.round(x * 1000) / 1000;
      cuadros(30);
      const base = dif();
      ok('Gemelas: sin gesto las dos Vittatas son idénticas', base.m < 1e-6, r3(base.m));
      for (const nombre of NUEVOS) {
        const pose = E[nombre].pose, segs = Math.min(E[nombre].secs, 4);
        a.emote = pose; let pico = 0, cual = '', cerrados = false, alto = 0, cerrB = 1;
        cuadros(Math.round(segs / DT), i => {
          if (i > 6) { const d = dif(CLAVE[pose]); if (d.m > pico) { pico = d.m; cual = d.cual; } }
          alto = Math.max(alto, a.root.position.y - b.root.position.y);
          if (pose === 'sleep' && i * DT > 1.5) { cerrados = !!(a.lids && a.lids.length && a.lids.every(l => l.visible && cierre(l) > 0.9)); cerrB = Math.min(cerrB, ...(b.lids || []).map(cierre)); }
          a.expression = E[nombre].face;
        });
        ok(`${E[nombre].label}: la pose mueve los huesos de verdad (> ${MIN} rad)`, pico > MIN, `${r3(pico)} rad en ${cual}`);
        if (pose === 'sleep') ok('Dormir: los ojos se cierran (párpados abajo; la gemela despierta los tiene abiertos)', (cerrados && cerrB < 0.5) || !(a.lids && a.lids.length), a.lids ? `${a.lids.length} párpados · dormida ${r3(Math.min(...a.lids.map(cierre)))} · despierta ${r3(cerrB)}` : 'sin párpados');
        if (pose === 'scare') ok('¡Susto!: da un brinco (la raíz sube)', alto > 0.05 * a.root.scale.y, r3(alto));
        a.emote = null; a.expression = 'neutral';
        cuadros(Math.round(2.5 / DT));
        const d = dif(), dy = Math.abs(a.root.position.y - b.root.position.y);
        ok(`${E[nombre].label}: al terminar todos los huesos vuelven exactos (< ${TOL} rad) y la raíz a su sitio`, d.m < TOL && dy < 1e-4, `${r3(d.m)} rad (${d.cual}) · raíz ${r3(dy)}`);
      }
      // Bailar sin acumular: tres frases seguidas no tuercen nada (el «tic» del duelo)
      a.emote = 'dance'; cuadros(Math.round(12 / DT)); a.emote = null; cuadros(Math.round(2.5 / DT));
      const dl = dif(); ok('Bailar 12 s seguidos y parar: nada acumulado', dl.m < TOL, r3(dl.m) + ' ' + dl.cual);
      // Reducir movimiento: el susto salta menos y no tiembla
      const salto = suave => { a.emoteSuave = suave; a.emote = 'scare'; let m = 0; cuadros(Math.round(1 / DT), () => { m = Math.max(m, a.root.position.y - b.root.position.y); }); a.emote = null; cuadros(Math.round(2.5 / DT)); a.emoteSuave = false; return m; };
      const hN = salto(false), hS = salto(true);
      ok('Reducir movimiento: el susto salta la mitad o menos', hS < hN * 0.5 && hS >= 0, `${r3(hN)} → ${r3(hS)}`);
      // Cortar el susto en pleno abanico (a los 0,4 s, como al saltar o volar): las plumas se pliegan con el cuerpo
      a.emote = 'scare'; cuadros(12); const al0 = a.emoteAlas; a.emote = null; let alasMal = 0, al1 = 0;
      cuadros(Math.round(2.5 / DT), i => { alasMal = Math.max(alasMal, (a.emoteAlas || 0) - (a.eW || 0)); if (i === 9) al1 = a.emoteAlas; });
      ok('¡Susto! cortado a mitad: el abanico de plumas se pliega con el cuerpo (no sigue abierto)', al0 > 0.8 && alasMal < 1e-6 && al1 < 0.4, `${r3(al0)} → ${r3(al1)} a los 0,3 s`);
      // Repetir el mismo gesto (emoteN de actores.js) lo empieza otra vez desde el principio
      a.emote = 'scare'; cuadros(30); const t1 = a.emoteT; a.emoteN = (a.emoteN || 0) + 1; cuadros(1); const t2 = a.emoteT;
      a.emote = null; cuadros(Math.round(2.5 / DT));
      ok('Repetir el mismo gesto lo reinicia desde el principio', t1 > 0.9 && t2 < 0.1, `${r3(t1)} → ${r3(t2)}`);
      // Bandera, mapa o martillo en la mano (fitAdj.longHand): mientras se mece el ala izquierda se abre (el asta lejos del pico),
      // pero en el «¡wepa!» (golpes 5-6) las dos alas suben igual que sin objeto y en los saltitos no se mece
      const fa0 = a.fitAdj; a.fitAdj = Object.assign({}, fa0, { longHand: true });
      let dMece = 0, dWepa = 0, dSalto = 0;
      a.emote = b.emote = 'dance';
      cuadros(Math.round(4 / DT), i => { const t = i * DT, d = Math.abs(a.bones.armL1.rotation.z - b.bones.armL1.rotation.z);
        if (t > 1 && t < 1.6) dMece = Math.max(dMece, d); if (t > 2.3 && t < 2.8) dWepa = Math.max(dWepa, d); if (t > 3.3 && t < 3.8) dSalto = Math.max(dSalto, Math.abs(a.bones.armL1.rotation.x - b.bones.armL1.rotation.x)); });
      a.emote = b.emote = null; cuadros(Math.round(2.5 / DT)); a.fitAdj = fa0;
      ok('Bailar con un objeto largo en la mano: abre el ala al mecerse, pero en el «¡wepa!» y los saltitos va como sin objeto', dMece > 0.5 && dWepa < 0.15 && dSalto < 0.05, `mecer ${r3(dMece)} · wepa ${r3(dWepa)} · saltitos ${r3(dSalto)} rad`);
      const dl2 = dif(); ok('Tras bailar las dos, nada acumulado', dl2.m < TOL, r3(dl2.m) + ' ' + dl2.cual);
    }

    // ---------- 3. En el juego: empieza, suena, pone la pose, termina; dormir se corta al moverse ----------
    const P = A.player3D;
    if (!P) { ok('Vittata 3D en el mundo', false); return fin(); }
    // El humor físico se carga perezoso (boot.js, al primer gesto): se pide aquí para probar que no corta los gestos
    if (!G.humor && window.AVE && AVE.assets && AVE.assets.script) try { await AVE.assets.script('src/game/humor.js'); if (window.AVHumor) window.AVHumor(G); } catch (e) { /* sin humor */ }
    const oidos = [];
    if (!oyente) { oyente = n => { if (oyente.on) oidos.push(n); }; G.audio.alSonar((n, x) => oyente(n, x)); }
    const quiet0 = G.quiet, pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, vuela0 = M.flying;
    try {
      G.quiet = false; oyente.on = true;
      if (M.flying) M.flying = false;
      S.pos.y = G.fisica.suelo(S.pos.x, S.pos.z, S.pos.y + 0.5);
      const ui = G.ui.busy();
      for (const nombre of NUEVOS) {
        oidos.length = 0; A.stopEmote();
        const empezo = A.playEmote(nombre);
        const pasos = n => { for (let i = 0; i < n; i++) A.sync3D(DT, false, false); };
        pasos(3);
        const enPose = P.emote === E[nombre].pose && P.expression === E[nombre].face;
        const sfx = (E[nombre].sfx || []).filter(s => oidos.includes(s));
        if (nombre === 'bailar') {
          pasos(Math.round(3.2 / DT));
          const golpes = oidos.filter(n => n === 'gesto_ritmo').length;
          ok('Bailar: empieza, pone la pose y toca su ritmo (un golpe cada 0,5 s) con aleteos de Suno en el «¡wepa!»', empezo && enPose && golpes >= 6 && golpes <= 8 && oidos.includes('aleteo'), `golpes ${golpes} · ${[...new Set(oidos)].join(',')}`);
          A.stopEmote(); pasos(2);
          ok('Bailar: al parar se quita la pose', P.emote === null && A.emote.name === '');
          continue;
        }
        ok(`${E[nombre].label}: empieza, pone su pose y su cara, y suena (${(E[nombre].sfx || []).join(' + ')})`, empezo && enPose && sfx.length === (E[nombre].sfx || []).length, `${empezo ? 'empezó' : 'no empezó' + (ui ? ' (interfaz ocupada)' : '')} · pose ${P.emote} · cara ${P.expression} · oídos ${oidos.join(',')}`);
        if (nombre === 'dormir') {
          pasos(Math.round(2 / DT));
          const zzzVis = () => G.renderer.scene.children.filter(o => o.isSprite && o.visible && o.material && o.material.map && o.material.map.image && o.material.map.image.width === 128 && o.renderOrder === 5 && o.name === 'zzz_siesta').length;
          // Las dos ramas, sea cual sea el ajuste de la máquina: sin y con «Reducir movimiento»
          const red0 = G.renderer.REDUCED, aud0 = G.audio.reducido;
          let zN = -1, zR = -1;
          try { G.audio.reducido = null; G.renderer.REDUCED = false; pasos(1); zN = zzzVis(); G.renderer.REDUCED = true; pasos(1); zR = zzzVis(); } finally { G.renderer.REDUCED = red0; G.audio.reducido = aud0; }
          ok('Dormir: salen los zzz y suena el ronquido suave (sin zzz con «Reducir movimiento»)', zN === 3 && zR === 0 && oidos.includes('gesto_zzz'), `${zN} zzz · con Reducir ${zR} · ${oidos.join(',')}`);
          // El humor físico (humor.js: «Bostezo…» a los 20 s quieta, siesta a los 28 s) no corta el gesto: 30 s quieta y sigue dormida
          {
            const g0 = M.grounded, s0 = M.speed, sw0 = M.swimming;
            if (G.humor && G.humor.paso) try { M.grounded = true; M.speed = 0; M.swimming = false; for (let i = 0; i < 600; i++) G.humor.paso(0.05, true); } finally { M.grounded = g0; M.speed = s0; M.swimming = sw0; }
            ok('Dormir: 30 s quieta, el bostezo y la siesta del humor no la cambian a otro gesto', !!(G.humor && G.humor.paso) && A.emote.name === 'dormir', G.humor ? A.emote.name : 'sin humor.js');
          }
          ok('Dormir: sigue dormida mientras está quieta', A.emote.name === 'dormir' && P.emote === 'sleep');
          oidos.length = 0;
          A.sync3D(DT, true, false); // se mueve
          ok('Dormir: al moverse se despierta (se corta el gesto) con un aleteo', A.emote.name === '' && P.emote === null && oidos.includes('aleteo'), oidos.join(','));
          pasos(2);
          const zs2 = G.renderer.scene.children.filter(o => o.isSprite && o.visible && o.name === 'zzz_siesta' && o.material && o.material.map && o.material.map.image && o.material.map.image.width === 128);
          ok('Dormir: al despertar se van los zzz', zs2.length === 0, zs2.length);
        } else {
          pasos(9); // 0,4 s en total: aún no ha pasado su tiempo
          ok(`${E[nombre].label}: sigue en marcha mientras no pasa su tiempo (${E[nombre].secs} s)`, A.emote.name === nombre && P.emote === E[nombre].pose);
          A.emote.until = performance.now() - 1; pasos(2); // ya pasó su tiempo
          ok(`${E[nombre].label}: al terminar se quita la pose`, A.emote.name === '' && P.emote === null);
        }
      }
      // ¡Susto!: plumas al empezar, y sin plumas con «Reducir movimiento» (las dos ramas)
      if (G.fx && G.fx.burst) {
        const b0 = G.fx.burst, red0 = G.renderer.REDUCED, aud0 = G.audio.reducido, n = [0, 0];
        let k = 0;
        try {
          G.fx.burst = (x, y, z, tipo) => { if (tipo === 'feathers') n[k]++; };
          G.audio.reducido = null; G.renderer.REDUCED = false; A.stopEmote(); A.playEmote('susto');
          k = 1; G.renderer.REDUCED = true; A.stopEmote(); A.playEmote('susto');
        } finally { G.fx.burst = b0; G.renderer.REDUCED = red0; G.audio.reducido = aud0; A.stopEmote(); }
        ok('¡Susto!: suelta plumas, y ninguna con «Reducir movimiento»', n[0] === 1 && n[1] === 0, n.join(' / '));
      }
      // «Reducir movimiento» también para el pichón que imita y las cotorras en línea (comparten A.reducido)
      ok('«Reducir movimiento» se comparte (A.reducido) para el pichón y el modo en línea', typeof A.reducido === 'function');
      // Teclas: un guardado con una tecla que ahora es de gesto (0) solo pierde esa; el resto se conserva
      if (G.input && G.input.releer && G.input.CLAVE) {
        let crudo = null; try { crudo = localStorage.getItem(G.input.CLAVE); } catch (e) { /* */ }
        try {
          localStorage.setItem(G.input.CLAVE, JSON.stringify({ v: 1, mapa: { arriba: 'i', abajo: 'k', izquierda: 'j', derecha: 'l', volar: 'v', aterrizar: 'x', accion: 'e', poder: 'f', mapa: '0' } }));
          const m = G.input.releer();
          ok('Teclas: un guardado con la tecla 0 (ahora Dormir) conserva las demás y solo esa vuelve a la de fábrica', m.arriba === 'i' && m.abajo === 'k' && m.mapa !== '0' && /^[a-z]$/.test(m.mapa), JSON.stringify(m));
        } catch (e) { ok('Teclas: guardado viejo con la tecla 0', false, e && e.message); }
        finally { try { if (crudo == null) localStorage.removeItem(G.input.CLAVE); else localStorage.setItem(G.input.CLAVE, crudo); } catch (e) { /* */ } }
      }
    } finally {
      oyente.on = false; A.stopEmote(); G.quiet = quiet0; M.flying = vuela0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
    }
    return fin();
  }
  return { test };
};
