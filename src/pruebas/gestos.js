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
    ok('El menú tiene los 10 botones numerados (… 8, 9 y 0)', bs.length === 10 && /^8 · /.test(bs[7].textContent) && /^9 · /.test(bs[8].textContent) && /^0 · /.test(bs[9].textContent), bs.map(b => b.textContent).join(' | '));
    ok('Botones de gestos de 44 px o más', tam.length === 10 && tam.every(r => r.height >= 44 && r.width >= 44), tam.map(r => Math.round(r.width) + '×' + Math.round(r.height)).join(' '));
    const desb = bs.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent);
    ok('Ningún texto de gesto se sale de su botón', !desb.length, desb.join(' | '));
    menu.hidden = oculto;

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
      const dif = lista => { let m = 0, cual = ''; for (const n of lista || huesos) { const p = a.bones[n], q = b.bones[n]; if (!p || !q) continue; for (const ax of ['x', 'y', 'z']) { const d = Math.abs(p.rotation[ax] - q.rotation[ax]); if (d > m) { m = d; cual = n + '.' + ax; } } } return { m, cual }; };
      const r3 = x => Math.round(x * 1000) / 1000;
      cuadros(30);
      const base = dif();
      ok('Gemelas: sin gesto las dos Vittatas son idénticas', base.m < 1e-6, r3(base.m));
      for (const nombre of NUEVOS) {
        const pose = E[nombre].pose, segs = Math.min(E[nombre].secs, 4);
        a.emote = pose; let pico = 0, cual = '', cerrados = false, alto = 0;
        cuadros(Math.round(segs / DT), i => {
          if (i > 6) { const d = dif(CLAVE[pose]); if (d.m > pico) { pico = d.m; cual = d.cual; } }
          alto = Math.max(alto, a.root.position.y - b.root.position.y);
          if (pose === 'sleep' && i * DT > 1.5) cerrados = !!(a.lids && a.lids.length && a.lids.every(l => l.visible) && a.lids.every(l => Math.abs(l.rotation.x - a.lids[0].rotation.x) < 1e-6));
          a.expression = E[nombre].face;
        });
        ok(`${E[nombre].label}: la pose mueve los huesos de verdad (> ${MIN} rad)`, pico > MIN, `${r3(pico)} rad en ${cual}`);
        if (pose === 'sleep') ok('Dormir: los ojos se cierran (párpados abajo)', cerrados || !(a.lids && a.lids.length), a.lids ? a.lids.length + ' párpados' : 'sin párpados');
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
      // Repetir el mismo gesto (emoteN de actores.js) lo empieza otra vez desde el principio
      a.emote = 'scare'; cuadros(30); const t1 = a.emoteT; a.emoteN = (a.emoteN || 0) + 1; cuadros(1); const t2 = a.emoteT;
      a.emote = null; cuadros(Math.round(2.5 / DT));
      ok('Repetir el mismo gesto lo reinicia desde el principio', t1 > 0.9 && t2 < 0.1, `${r3(t1)} → ${r3(t2)}`);
    }

    // ---------- 3. En el juego: empieza, suena, pone la pose, termina; dormir se corta al moverse ----------
    const P = A.player3D;
    if (!P) { ok('Vittata 3D en el mundo', false); return fin(); }
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
          const reducido = !!(G.renderer && G.renderer.REDUCED);
          const zs = G.renderer.scene.children.filter(o => o.isSprite && o.visible && o.material && o.material.map && o.material.map.image && o.material.map.image.width === 128 && o.renderOrder === 5 && o.name === 'zzz_siesta');
          ok('Dormir: salen los zzz y suena el ronquido suave (sin zzz con «Reducir movimiento»)', (reducido ? zs.length === 0 : zs.length === 3) && oidos.includes('gesto_zzz'), `${zs.length} zzz · ${oidos.join(',')}`);
          ok('Dormir: sigue dormida mientras está quieta', A.emote.name === 'dormir' && P.emote === 'sleep');
          oidos.length = 0;
          A.sync3D(DT, true, false); // se mueve
          ok('Dormir: al moverse se despierta (se corta el gesto) con un aleteo', A.emote.name === '' && P.emote === null && oidos.includes('aleteo'), oidos.join(','));
          pasos(2);
          const zs2 = G.renderer.scene.children.filter(o => o.isSprite && o.visible && o.name === 'zzz_siesta' && o.material && o.material.map && o.material.map.image && o.material.map.image.width === 128);
          ok('Dormir: al despertar se van los zzz', zs2.length === 0, zs2.length);
        } else {
          const queda = (A.emote.until - performance.now()) / 1000;
          ok(`${E[nombre].label}: dura su tiempo (${E[nombre].secs} s) y luego termina solo`, Math.abs(queda - E[nombre].secs) < 1.2, queda.toFixed(2) + ' s');
          A.emote.until = performance.now() - 1; pasos(2); // ya pasó su tiempo
          ok(`${E[nombre].label}: al terminar se quita la pose`, A.emote.name === '' && P.emote === null);
        }
      }
    } finally {
      oyente.on = false; A.stopEmote(); G.quiet = quiet0; M.flying = vuela0; S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z;
    }
    return fin();
  }
  return { test };
};
