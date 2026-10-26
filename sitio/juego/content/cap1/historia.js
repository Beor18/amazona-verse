/* Content pack cap1 · historia "El día que el cielo se rompió" (guion de Kelvin García, v1.0)
   Los 8 pasos del capítulo son datos (texto, progreso, guía y, si avanzan solos, su disparador "hasta");
   las escenas con decisiones (terrenos, construir, la crecida, el Guardián, el transmisor y el mirador) son scripts del pack
   que avanzan la historia con G.misiones.advanceTo(n). Las líneas salen de dialogos_cap1.js; las de respaldo están aquí.
   Escenas en pantalla del paquete B (CAP1_PENDIENTE): apertura (negro + viento → taller con luz → brillo y onda → negro), sonido de
   construir y de la crecida, retrato neutro de la Voz y final del mirador (plano del bote y luz que parpadea tres veces).
   Diversión primero (docs/equipo/DIVERSION_CAP1.md, mejoras 1, 3 y 4): Iguaca llama desde la copa del flamboyán de la plaza y el
   primer paso es volar hasta ella (el taller va después); la narración y los comentarios salen en bocadillos libres
   (G.dialogo.say(..., { libre: true })) y solo bloquean las charlas y las decisiones; la crecida dura 20 s y arrastra tres cosas
   que se agarran en vuelo y se sueltan a salvo (sin castigo). Las líneas del guion no cambian.
   Lo que depende de Kelvin (canon o arte) queda marcado en el código con «[KELVIN-n]» y listado en PENDIENTES_KELVIN. */
(function () {
  'use strict';
  // Marcadores para Kelvin: escenas del guion que no se hacen sin una decisión de canon o sin arte nuevo. Se buscan en content/cap1 con «[KELVIN-n]».
  // Mientras tanto el juego usa lo neutro (retrato de señal, luz sin color de personaje, dibujo genérico de bote).
  const PENDIENTES_KELVIN = [
    { id: 'KELVIN-1', que: 'Identidad del Guardián (¿cotorra, humano u otra forma?): retrato, sprite y modelo 3D', donde: 'mundo.js (npcs), pack.js (retratos)', bloquea: 'arte del Guardián (P2-5)' },
    { id: 'KELVIN-2', que: 'Orden del Guardián: el guion lo hace llegar antes de construir y ayudar (p.7-8); el juego lo hace llegar tras la crecida', donde: 'historia.js (talkGuardian, applyGuardianLook)', bloquea: 'p.8: el Guardián sostiene una pieza (P1-2)' },
    { id: 'KELVIN-3', que: 'Medalla del Guardián igual a una pieza del emblema (NARRATIVA «Giro»): ¿es canon? Una línea más y un detalle en su figura', donde: 'historia.js (useTransmitter), mundo.js (npcs)', bloquea: 'giro de la escena p.11' },
    { id: 'KELVIN-4', que: 'Cara de la Voz del transmisor (silueta, onda o ninguna) y si es alguien del pacto de los 36 sin nombrarlo', donde: 'pack.js (RETRATO_VOZ)', bloquea: 'retrato definitivo' },
    { id: 'KELVIN-5', que: 'Familia de Iguaca entrando al refugio (SCRIPT p.9): ni arte ni diseño de los personajes', donde: 'historia.js (afterRain), mundo.js (npcs)', bloquea: 'P1-2, recompensa emocional del refugio' },
    { id: 'KELVIN-6', que: 'Diseño de la máquina experimental y del transmisor antiguo, y engranaje visible en el techo del refugio', donde: 'mundo.js (preparar, objetos del taller)', bloquea: 'P1-6 y P2-2, modelos en Blender' },
    { id: 'KELVIN-7', que: 'Diseño del bote: el plano es un dibujo genérico (casco, mástil y dos velas) hasta el episodio 2', donde: 'historia.js (drawBlueprint)', bloquea: 'plano definitivo' },
    { id: 'KELVIN-8', que: 'Quién contesta con la luz de la niebla: no se revela en el cap. 1 y la luz es neutra', donde: 'mundo.js (luzMirador)', bloquea: 'cliffhanger al cap. 2' },
  ];
  const NEEDS = { madera: 4, piedra: 2, componente: 1 };
  const REFUGE_COST = { madera: 3, piedra: 2 };
  const REPAIR_COST = { madera: 1, componente: 1 };
  // Recolección recortada 1 min (DECISION_LOG, "La ruta de la gota"): la familia de Iguaca aporta 3 tablas de su árbol partido.
  // Quedan 4 recogidas (1 madera, 2 piedras y la pieza de la poza) en vez de 7: ~50 m de ruta guiada en vez de ~113 m.
  // La construcción no cambia (REFUGE_COST).
  const REGALO_LUMA = { madera: 3 };
  const at = (G, id) => G.misiones.at(id);

  AVE.registerPack({
    id: 'cap1',
    historia: {
      pasos: [
        // Mejora 1: al despertar, Iguaca llama desde la copa del flamboyán de la plaza (o el techo del taller): hay que despegar y posarse
        { id: 'luma', texto: (S, G) => 'Vuela hasta Iguaca, en ' + (G.c.luma ? G.c.luma.donde() : 'la copa del flamboyán'),
          guia: G => (G.c.luma ? G.c.luma.guia() : at(G, 'luma')) },
        // Revisar el taller avanza solo al examinar la máquina y el transmisor (también vale si se revisaron antes de subir con Iguaca)
        { id: 'taller', texto: 'Revisa tu taller dañado',
          progreso: S => ` (${(S.examined.maquina ? 1 : 0) + (S.examined.transmisor ? 1 : 0)}/2)`,
          hasta: { marca: ['examined.maquina', 'examined.transmisor'] },
          guia: G => at(G, !G.S.examined.maquina ? 'maquina' : 'transmisor') },
        { id: 'recolectar', texto: 'Recolecta 4 madera, 2 piedras y 1 pieza de metal',
          progreso: S => {
            const got = type => Math.min(NEEDS[type], S.inv[type]);
            return ` (${got('madera')}/4 · ${got('piedra')}/2 · ${got('componente')}/1)`;
          },
          hasta: { tiene: NEEDS },
          alCompletar: G => { G.eventos.log('ResourcesCollected', { ...G.S.inv }); G.dialogo.say(G.dialogo.L('evento:ResourcesCollected'), null, { libre: true }); },
          guia: G => G.misiones.needItems(NEEDS) },
        // La misión educativa "La ruta de la gota" (educativa.js) es este paso: observar, predecir y volver con evidencia.
        // Incluye ver los dos terrenos desde arriba (S.evaluated); al terminarla se elige el terreno.
        { id: 'terrenos', texto: (S, G) => G.c.edu ? G.c.edu.textoPaso() : 'Inspecciona los dos terrenos',
          hasta: { marca: ['evaluated.A', 'evaluated.B'], mision: 'educativa' },
          guia: G => (G.c.edu && G.c.edu.guia()) || at(G, !G.S.evaluated.A ? 'postA' : 'postB') },
        // Mejora 4: durante la crecida el objetivo es salvar lo que arrastra el río (la guía apunta a lo que flota o a tierra seca)
        { id: 'refugio', texto: S => (S.event ? '¡Crecida! Agarra al vuelo lo que arrastra el río y ponlo a salvo' : 'Elige un terreno y construye el refugio'),
          guia: G => { const S = G.S; return S.event ? (G.c.crecida ? G.c.crecida.guia() : null) : S.refuge && S.refuge.damaged ? at(G, 'refuge') : S.refuge ? null : G.misiones.closest([at(G, 'postA'), at(G, 'postB')]); } },
        { id: 'guardian', texto: 'Habla con el Guardián Constructor', guia: G => at(G, 'guardian') },
        { id: 'transmisor', texto: 'Repara y activa el transmisor',
          progreso: (S, G) => S.chorus && !S.missions.m3 ? ` (coquíes ${S.coquis.length}/${G.c.BUSHES.length})` : '',
          guia: G => { const S = G.S; return !G.objetos.has(REPAIR_COST) ? G.misiones.needItems(REPAIR_COST) : S.chorus && !S.missions.m3 ? G.misiones.closest(G.c.BUSHES.filter(b => !S.coquis.includes(b.id))) : at(G, 'transmisor'); } },
        { id: 'mirador', texto: 'Sube al mirador de la colina', guia: G => at(G, 'mirador') },
      ],
      guiaBloqueada: G => !!G.c.build(),
      // Antes de la crecida los indicadores no se conocen: «por descubrir» en vez de «—» (UI v21 P3)
      indicadores: S => { const I = S.indicators, v = x => (x && x !== '—' ? x : 'por descubrir'); return S.refuge ? `Seguridad del refugio: <b>${v(I.seguridad)}</b> · Acceso: <b>${v(I.acceso)}</b> · Hábitat: <b>${v(I.habitat)}</b>` : ''; },
      fin: S => (S.refuge && S.refuge.parcel === 'B' ? 'El refugio de la colina protege a la familia de Iguaca.' : 'El refugio quedó junto al río y la crecida lo dañó.') +
        ' El transmisor reveló el símbolo de los 36 y desbloqueaste el plano de una embarcación. Continuará…',
    },
    costos: { NEEDS, REFUGE_COST, REPAIR_COST, REGALO_LUMA },

    // Gancho del capítulo (SCRIPT p.1-3 · NARRATIVA «Gancho»), antes de dar el control:
    //   inicio:capitulo  pantalla negra y viento (Narrador)
    //   inicio:taller    corte al taller lleno de luz (fundido) y el VMMMM del mecanismo (Vittata)
    //   inicio:ruptura   las nubes brillan, ZZZT, la cámara tiembla y una onda cruza el cielo; luego silencio negro (Narrador)
    // Después Vittata abre los ojos: fundido desde el negro y aviso. Las capas son DOM del pack (G.c.apertura, ver preparar()):
    // sin ellas el gancho es el de siempre. Las líneas van en bocadillos libres (mejora 3): el gancho se ve y se oye igual, pero
    // no hay que pulsar «Seguir» seis veces y el control llega con el fundido.
    inicio(G) {
      const L = G.dialogo.L, A = G.c.apertura, cap = L('inicio:capitulo'), tal = L('inicio:taller'), rupt = L('inicio:ruptura');
      const al = (l, f) => { if (l) l.onShow = f; };
      if (A) A.negro();
      G.audio.play('viento');
      al(cap[1], () => G.audio.play('viento'));
      al(tal[0], () => { if (A) A.claro(2400); G.audio.play('vmmm'); });
      al(rupt[0], () => { G.camara.shake(0.6, 1.2); G.audio.play('zzzt'); if (A) A.ruptura(); });
      al(rupt[1], () => { G.audio.play('onda'); if (A) A.negro(900); });
      G.dialogo.say([...cap, ...tal, ...rupt], () => {
        if (A) A.claro(2200);
        G.ui.toast('La Gran Ruptura dañó el taller. ¡Iguaca te llama desde ' + (G.c.luma ? G.c.luma.donde() : 'la copa del flamboyán') + '! Despega y pósate a su lado.', 5000);
      }, { libre: true });
    },

    preparar(G) {
      const S = G.S, H = G.terreno.height, $ = G.util.$, C = G.c, IMG = C.IMG;
      const PLACES = C.PLACES, MAQ = C.MAQ, TRX = C.TRX, MIRADOR = C.MIRADOR;
      const L = G.dialogo.L, say = G.dialogo.say, log = G.eventos.log;
      const toast = G.ui.toast, toastHTML = G.ui.toastHTML, hideToast = G.ui.hideToast;
      const { has, pay, missingText } = G.objetos;
      const advanceTo = n => G.misiones.advanceTo(n), checkProgress = () => G.misiones.check();
      // Las fotos del cómic salen sin el haz y la flecha de la guía (se vuelven a dibujar en el siguiente cuadro)
      const capture = k => { G.fx.guide(null, 0); G.comic.capture(k); };
      const WATER_BASE = G.terreno.waterBase, FLOOD_LEVEL = C.FLOOD_LEVEL;
      const guardian = G.actores.npc('guardian');
      G.audio.define('zzzt', (t, a, A) => { A.noise(t, 1.0, { freq: 200, to: 4200, q: 6, gain: 0.28 }); A.tone(110, t, 1.0, { type: 'sawtooth', to: 40, gain: 0.1 }); });

      // ---------- Capas DOM de las escenas: apertura y plano del bote ----------
      // Las inyecta el pack (ni index.html ni ui.css): pointer-events: none, encima del HUD (z 5-6) y debajo del diálogo y la tarjeta (z 10).
      // Con «reducir movimiento» no hay onda ni deslizamiento, solo fundidos y un brillo suave; el brillo no parpadea (sin destellos rápidos).
      const REDUCIDO = G.renderer.REDUCED;
      const quitar = id => { const e = document.getElementById(id); if (e) e.remove(); };
      function estilos() {
        if (document.getElementById('c1-escenas-css')) return;
        const st = document.createElement('style'); st.id = 'c1-escenas-css';
        st.textContent =
          '#c1-fade{position:fixed;inset:0;z-index:9;background:#000;pointer-events:none;opacity:0}' +
          '#c1-ruptura{position:fixed;inset:0;z-index:8;pointer-events:none;overflow:hidden}' +
          '#c1-ruptura .brillo{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(176,255,228,.72),rgba(176,255,228,0) 62%);mix-blend-mode:screen;opacity:0;animation:c1-brillo 3.4s ease-out forwards}' +
          '#c1-ruptura .onda{position:absolute;left:50%;top:36%;width:30vmax;height:30vmax;margin:-15vmax 0 0 -15vmax;border-radius:50%;border:.8vmax solid rgba(214,255,242,.85);' +
          'box-shadow:0 0 5vmax rgba(160,255,225,.7),inset 0 0 5vmax rgba(160,255,225,.5);opacity:0;animation:c1-onda 2.7s cubic-bezier(.2,.6,.3,1) .5s forwards}' +
          '@keyframes c1-brillo{0%{opacity:0}30%{opacity:1}100%{opacity:0}}' +
          '@keyframes c1-onda{0%{transform:scale(.1);opacity:0}15%{opacity:.9}100%{transform:scale(3.4);opacity:0}}' +
          '@media (prefers-reduced-motion:reduce){#c1-ruptura .onda{display:none}#c1-ruptura .brillo{animation-duration:2.2s}}' +
          '#c1-plano{position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top,0px) + 6vh);z-index:9;display:flex;justify-content:center;pointer-events:none;transition:opacity .25s ease}' +
          '#c1-plano.sale{opacity:0}' +
          '#c1-plano canvas{width:min(78vw,440px,70vh);height:auto;filter:drop-shadow(0 10px 24px rgba(0,0,0,.45));animation:c1-plano-in .7s cubic-bezier(.2,1.2,.4,1) both}' +
          '@keyframes c1-plano-in{from{opacity:0;transform:translateY(24px) rotate(-3deg) scale(.9)}to{opacity:1;transform:none}}' +
          '@media (prefers-reduced-motion:reduce){#c1-plano canvas{animation:c1-plano-op .4s ease both}@keyframes c1-plano-op{from{opacity:0}to{opacity:1}}}';
        document.head.appendChild(st);
      }
      let tFade = 0, tRupt = 0, tPlano = 0;
      const dur = ms => (REDUCIDO ? Math.min(ms, 500) : ms);
      const apertura = {
        // Pantalla negra: sin ms es un corte seco; con ms, un fundido hasta el negro
        negro(ms) {
          estilos(); clearTimeout(tFade);
          let f = document.getElementById('c1-fade');
          if (!f) { f = document.createElement('div'); f.id = 'c1-fade'; f.setAttribute('aria-hidden', 'true'); document.body.appendChild(f); }
          f.style.transition = ms ? 'opacity ' + dur(ms) + 'ms ease' : 'none';
          void f.offsetWidth; // reflow: la transición arranca desde el valor actual
          f.style.opacity = '1';
        },
        // Fundido desde el negro; la capa se quita cuando termina
        claro(ms) {
          const f = document.getElementById('c1-fade'); if (!f) return;
          clearTimeout(tFade); const d = dur(ms || 1600);
          f.style.transition = 'opacity ' + d + 'ms ease'; void f.offsetWidth; f.style.opacity = '0';
          tFade = setTimeout(() => quitar('c1-fade'), d + 250);
        },
        // Las nubes brillan y una onda luminosa cruza el cielo (la cámara tiembla y suena ZZZT en historia.inicio)
        ruptura() {
          estilos(); quitar('c1-ruptura'); clearTimeout(tRupt);
          const r = document.createElement('div'); r.id = 'c1-ruptura'; r.setAttribute('aria-hidden', 'true');
          r.innerHTML = '<div class="brillo"></div><div class="onda"></div>';
          document.body.appendChild(r);
          tRupt = setTimeout(() => quitar('c1-ruptura'), 4300);
        },
        fin() { clearTimeout(tFade); clearTimeout(tRupt); quitar('c1-fade'); quitar('c1-ruptura'); },
      };

      // Plano del bote (SCRIPT p.12): lo dibuja Vittata en el mirador. Canvas como el símbolo de los 36; cuadro de 100×70 unidades.
      // También decora la última viñeta del cómic (pack.js, comic.decorar).
      // [KELVIN-7] El diseño del bote es provisional (casco, mástil y dos velas genéricos, sin números ni bandera) hasta el episodio 2.
      function drawBlueprint(ctx, x, y, w) {
        const u = w / 100, TINTA = '#e8f6ff', ORO = '#ffd27a', AGUA = '#7fd3c8';
        ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
        const rr = (a, b, c, d, r) => { ctx.beginPath(); ctx.moveTo(a + r, b); ctx.arcTo(a + c, b, a + c, b + d, r); ctx.arcTo(a + c, b + d, a, b + d, r); ctx.arcTo(a, b + d, a, b, r); ctx.arcTo(a, b, a + c, b, r); ctx.closePath(); };
        // papel azul con cuadrícula
        rr(0, 0, 100, 70, 3); ctx.fillStyle = '#134a73'; ctx.fill();
        ctx.save(); ctx.clip(); ctx.lineWidth = 0.25;
        for (let i = 5; i < 100; i += 5) { ctx.strokeStyle = i % 25 ? 'rgba(191,232,255,.13)' : 'rgba(191,232,255,.26)'; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 70); ctx.stroke(); }
        for (let j = 5; j < 70; j += 5) { ctx.strokeStyle = j % 25 ? 'rgba(191,232,255,.13)' : 'rgba(191,232,255,.26)'; ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(100, j); ctx.stroke(); }
        ctx.restore();
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        rr(1.2, 1.2, 97.6, 67.6, 2.4); ctx.strokeStyle = 'rgba(232,246,255,.7)'; ctx.lineWidth = 0.6; ctx.stroke();
        // eje central (trazo y punto) y casco en vista lateral
        ctx.strokeStyle = 'rgba(232,246,255,.45)'; ctx.lineWidth = 0.4; ctx.setLineDash([3, 1.2, 0.6, 1.2]);
        ctx.beginPath(); ctx.moveTo(52, 7); ctx.lineTo(52, 57); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = TINTA; ctx.lineWidth = 0.9; ctx.fillStyle = 'rgba(232,246,255,.1)';
        ctx.beginPath(); ctx.moveTo(16, 40); ctx.lineTo(84, 40); ctx.bezierCurveTo(82, 49, 71, 54, 57, 54); ctx.lineTo(34, 54); ctx.bezierCurveTo(23, 54, 17.5, 48, 16, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(30, 45, 1.5, 0, Math.PI * 2); ctx.arc(40, 45, 1.5, 0, Math.PI * 2); ctx.stroke();
        // mástil y botavara; vela mayor y foque en oro
        ctx.beginPath(); ctx.moveTo(52, 40); ctx.lineTo(52, 9); ctx.moveTo(52, 36); ctx.lineTo(74, 36); ctx.stroke();
        ctx.strokeStyle = ORO; ctx.fillStyle = 'rgba(255,210,122,.2)';
        ctx.beginPath(); ctx.moveTo(53.5, 11); ctx.lineTo(53.5, 34.5); ctx.lineTo(73, 34.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(50.5, 13); ctx.lineTo(50.5, 34.5); ctx.lineTo(33, 34.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        // línea de flotación y una fila de olas
        ctx.strokeStyle = AGUA; ctx.lineWidth = 0.6; ctx.setLineDash([2.2, 1.6]);
        ctx.beginPath(); ctx.moveTo(8, 47); ctx.lineTo(92, 47); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = 14 + k * 12; ctx.moveTo(a, 58); ctx.quadraticCurveTo(a + 3, 56, a + 6, 58); ctx.quadraticCurveTo(a + 9, 60, a + 12, 58); } ctx.stroke();
        // cotas: largo arriba y alto a la izquierda, con flechas (sin números: no hay medidas inventadas)
        ctx.strokeStyle = 'rgba(255,210,122,.85)'; ctx.lineWidth = 0.5;
        const cota = (x1, y1, x2, y2) => {
          const a = Math.atan2(y2 - y1, x2 - x1);
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          for (const [px, py, s] of [[x1, y1, 1], [x2, y2, -1]]) { ctx.moveTo(px, py); ctx.lineTo(px + s * 1.7 * Math.cos(a - 0.4), py + s * 1.7 * Math.sin(a - 0.4)); ctx.moveTo(px, py); ctx.lineTo(px + s * 1.7 * Math.cos(a + 0.4), py + s * 1.7 * Math.sin(a + 0.4)); }
          ctx.stroke();
        };
        ctx.beginPath(); ctx.moveTo(16, 3); ctx.lineTo(16, 38); ctx.moveTo(84, 3); ctx.lineTo(84, 38); ctx.moveTo(6, 9); ctx.lineTo(50, 9); ctx.moveTo(6, 40); ctx.lineTo(14, 40); ctx.stroke();
        cota(16, 5.5, 84, 5.5); cota(8, 9, 8, 40);
        // vista desde arriba (un casco puntiagudo) y cajetín
        ctx.strokeStyle = TINTA; ctx.lineWidth = 0.6; ctx.fillStyle = 'rgba(232,246,255,.1)';
        ctx.beginPath(); ctx.moveTo(6, 64.2); ctx.bezierCurveTo(12, 59.5, 24, 59.5, 31, 64.2); ctx.bezierCurveTo(24, 68.8, 12, 68.8, 6, 64.2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, 64.2); ctx.lineTo(31, 64.2); ctx.stroke();
        rr(66, 60.5, 31, 7.5, 1); ctx.strokeStyle = 'rgba(232,246,255,.6)'; ctx.stroke();
        ctx.fillStyle = ORO; ctx.font = '700 3.3px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PLANO · BOTE', 81.5, 64.4);
        ctx.restore();
        return w * 0.7;
      }
      // Muestra u oculta el plano (sale con un fundido corto; cada vez que se muestra se dibuja de nuevo y su animación arranca)
      function mostrarPlano(on) {
        clearTimeout(tPlano);
        if (!on) { const p = document.getElementById('c1-plano'); if (p) { p.classList.add('sale'); tPlano = setTimeout(() => quitar('c1-plano'), 320); } return; }
        estilos(); quitar('c1-plano');
        const p = document.createElement('div'); p.id = 'c1-plano';
        const c = document.createElement('canvas'); c.width = 720; c.height = 504;
        c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Plano de un bote: casco, mástil y dos velas');
        p.appendChild(c); document.body.appendChild(p);
        drawBlueprint(c.getContext('2d'), 0, 0, c.width);
      }
      const planoVisible = () => { const p = document.getElementById('c1-plano'); return !!p && !p.classList.contains('sale'); };
      G.on('apply', () => { apertura.fin(); clearTimeout(tPlano); quitar('c1-plano'); }, 50);

      // ---------- Interactuables ----------
      const add = G.interaccion.add;
      add({ id: 'maquina', x: MAQ.x, z: MAQ.z, r: 2.2, label: () => 'Examinar la máquina experimental', use: () => examine('maquina') });
      add({ id: 'transmisor', x: TRX.x, z: TRX.z, r: 2.2, label: () => S.step === 6 ? 'Reparar y activar el transmisor' : 'Examinar el transmisor', use: useTransmitter });
      // (ids internos «luma», LumaHelped, lumaK…: históricos; el personaje se llama Iguaca)
      // Iguaca: su x/z y su visibilidad las lleva el módulo «Iguaca llama desde arriba» (abajo): en la copa solo se le habla posada a su lado
      add({ id: 'luma', x: G.actores.npc('luma').def.x, z: G.actores.npc('luma').def.z, r: 2.4, label: () => 'Hablar con Iguaca', use: talkLuma });
      add({ id: 'mirador', x: MIRADOR.x, z: MIRADOR.z, r: 3.2, label: () => S.step === 7 ? 'Mirar el horizonte desde el mirador' : 'Asomarte al mirador', use: useMirador });
      add({ id: 'guardian', x: guardian.def.x, z: guardian.def.z, r: 2.6, visible: () => guardian.sp.visible, label: () => 'Hablar con el Guardián', use: talkGuardian });
      const refugeIt = add({ id: 'refuge', x: 0, z: 0, r: 2.6, visible: () => !!(S.refuge && S.refuge.damaged && !S.event && !S.complete), label: () => 'Desarmar el refugio y recuperar materiales', use: dismantle });
      for (const k of ['A', 'B']) {
        const p = PLACES[k];
        add({ id: 'post' + k, x: p.post.x, z: p.post.z, r: 2.2, label: () => 'Inspeccionar terreno: ' + p.name, use: () => openParcelCard(k) });
      }
      function syncRefugeInteractable() { if (S.refuge) { refugeIt.x = S.refuge.x; refugeIt.z = S.refuge.z; } }
      function applyGuardianLook() { guardian.setVisible(S.builds.length > 0 && !S.event); }

      // ---------- Acciones de la historia ----------
      const LIBRE = { libre: true };
      function examine(what) {
        const firstTime = !S.examined[what];
        S.examined[what] = true;
        // La escena de la máquina (evento:WorkshopExplored) se cuenta al examinarla; el transmisor tiene la suya. Son comentarios
        // de Vittata: van en bocadillos libres (se puede seguir moviéndose); el paso «taller» avanza solo con los dos revisados.
        const lines = what === 'maquina'
          ? L('evento:WorkshopExplored', [{ who: 'Vittata', img: IMG.V, text: 'Mi máquina… Si consigo repararla, todavía podemos…' }])
          : L('interact:transmisor', [{ who: 'Vittata', img: IMG.V, text: 'Este transmisor llevaba años sin funcionar. Ahora además tiene la antena doblada.' }]);
        say(lines, null, LIBRE);
        if (firstTime && S.examined.maquina && S.examined.transmisor && !G.eventos.had('WorkshopExplored')) {
          log('WorkshopExplored'); capture('workshop');
          if (S.step >= 1) toast('Taller revisado. Ahora, a juntar los materiales del refugio.', 3500);
        }
        checkProgress();
      }
      // La llamada de Iguaca desde arriba (interact:luma_inicio): suena al acercarse a la copa, en bocadillos; si la charla
      // empieza antes de que termine, lo que faltaba se funde en la charla para no cambiar el orden del guion
      const LLAMADA = () => L('interact:luma_inicio', [{ who: 'Iguaca', img: IMG.L, text: '¡Vittata! ¡Necesitamos ayuda!', mood: 'surprised' }, { who: 'Iguaca', img: IMG.L, text: 'Mi familia no tiene dónde quedarse. Nuestro árbol se partió.' }]);
      function talkLuma() {
        if (S.step === 0) {
          // La charla de la misión, posada junto a Iguaca en la copa (bloquea: es la conversación, no narración):
          // interact:luma_inicio → evento:LumaHelped (Vittata acepta ayuda) → interact:materiales → las tres tablas
          const inicio = C.luma.llamo() ? G.dialogo.cancelarLibre() : LLAMADA();
          C.luma.llamado();
          say([
            ...inicio,
            ...L('evento:LumaHelped', [{ who: 'Vittata', img: IMG.V, text: 'Entonces tendremos que construir algo nuevo.' }]),
            ...L('interact:materiales', [{ who: 'Iguaca', img: IMG.L, text: 'No tenemos suficientes materiales.' }]),
            { who: 'Iguaca', img: IMG.L, text: 'Solo pudimos salvar tres tablas del árbol partido. Tómalas.' },
            { who: 'Vittata', img: IMG.V, text: 'Con eso empezamos. Faltan una madera, dos piedras y una pieza de metal. ¡Una cayó al fondo del río!' },
          ], () => {
            for (const k in REGALO_LUMA) S.inv[k] += REGALO_LUMA[k];
            G.objetos.renderInv(); G.audio.play('pickup', 2);
            log('LumaHelped'); advanceTo(1);
            toast(S.step >= 2 ? '+3 madera de la familia de Iguaca. Ahora, a juntar los materiales.' : '+3 madera de la familia de Iguaca. Pasa por tu taller: revisa la máquina y el transmisor.', 4500);
          });
          return;
        }
        // Pistas de Iguaca (una línea): bocadillos libres, no paran a la cotorra. [KELVIN] la del paso «taller» es provisional.
        if (S.step === 1) { say([{ who: 'Iguaca', img: IMG.L, text: 'Revisa tu taller: la máquina y el transmisor. Después buscamos los materiales.' }], null, LIBRE); return; }
        if (S.step === 2 && !S.collected.includes('c1')) { say([{ who: 'Iguaca', img: IMG.L, text: 'La pieza de metal cayó en la poza del río. Nada hasta las burbujas y bucea con C (o el botón Bucear).' }], null, LIBRE); return; }
        if (S.step === 3 && C.edu && !S.missions.educativa) { say([C.edu.lineaLuma()], null, LIBRE); return; }
        if (S.step <= 3) { say([{ who: 'Iguaca', img: IMG.L, text: 'Hay dos terrenos: junto al río (estacas naranja) y en la colina (estacas rojas). Mira bien los dos.' }], null, LIBRE); return; }
        if (S.refuge && S.refuge.damaged) { say([{ who: 'Iguaca', img: IMG.L, text: 'El agua llegó otra vez… Si desarmas el refugio recuperas los materiales y podemos llevarlo a la colina.' }], null, LIBRE); return; }
        say([{ who: 'Iguaca', img: IMG.L, text: S.complete ? 'Pensé que hoy lo habíamos perdido todo.' : '¡Gracias, Vittata! Mi familia ya tiene un techo.' }], null, LIBRE);
      }
      function openParcelCard(k) {
        const p = PLACES[k];
        const first = !S.evaluated[k];
        S.evaluated[k] = true;
        if (first) log('LandInspected', { parcel: k });
        const canBuild = S.step >= 4 && !S.refuge && !S.event && !S.complete;
        const rows = Object.entries(p.info).map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
        const buildBtn = canBuild ? `<button class="btn" id="c-build" type="button">Construir refugio aquí (${REFUGE_COST.madera} madera, ${REFUGE_COST.piedra} piedras)</button>` : '';
        const note = S.step < 4 ? '<p class="note">Inspecciona los dos terrenos y junta los materiales para poder construir.</p>' : '';
        G.ui.showCard(`<h2>${p.name}</h2><dl>${rows}</dl>${note}<div class="row">${buildBtn}<button class="btn ghost" id="c-close" type="button">Cerrar</button></div>`);
        const b = document.getElementById('c-build');
        if (b) b.onclick = () => { if (!has(REFUGE_COST)) { toast('Te falta ' + missingText(REFUGE_COST)); return; } G.ui.hideCard(); startBuild(k); };
        document.getElementById('c-close').onclick = () => {
          G.ui.hideCard();
          if (first) {
            const line = k === 'A'
              ? [...L('evento:LandInspected', [{ who: 'Vittata', img: IMG.V, text: 'Aquí construiríamos mucho más rápido.' }]),
                 ...L('interact:marcas_agua', [{ who: 'Iguaca', img: IMG.L, text: 'Pero mira esas marcas en los árboles: el río llegó hasta aquí durante la tormenta.' }])]
              : L('interact:colina', [{ who: 'Iguaca', img: IMG.L, text: 'Allá arriba parece más seguro.' }]);
            checkProgress(); say(line, null, LIBRE); // comentarios al salir de la tarjeta: en bocadillos, mientras se sigue
          } else checkProgress();
        };
      }

      // ---------- Modo construir: toma la acción mientras está activo ----------
      let build = null;
      const ghost = C.ghost;
      function startBuild(k) {
        build = { parcel: k, gx: 0, gz: 0, valid: false, reason: '' };
        ghost.visible = true;
        toastHTML('Modo construcción: muévete y pulsa <b>Acción</b> para colocar. <button class="btn ghost" id="t-cancel" type="button">Cancelar</button>', 0);
        const c = document.getElementById('t-cancel');
        if (c) c.onclick = cancelBuild;
      }
      function cancelBuild() { build = null; ghost.visible = false; hideToast(); }
      function updateGhost() {
        if (!build) return;
        const p = PLACES[build.parcel];
        const gx = S.pos.x + S.facing.x * 2.6, gz = S.pos.z + S.facing.z * 2.6;
        build.gx = gx; build.gz = gz;
        let reason = '';
        if (Math.abs(gx - p.x) > p.half - 1.1 || Math.abs(gz - p.z) > p.half - 1.1) reason = 'Fuera del terreno elegido';
        else if (G.fisica.colliders.some(c => c.kind !== 'refuge' && c.r > 0 && Math.hypot(gx - c.x, gz - c.z) < c.r + 1.3)) reason = 'Choca con algo';
        build.valid = !reason; build.reason = reason;
        ghost.position.set(gx, H(gx, gz), gz);
        ghost.traverse(m => { if (m.material && m.material.color) m.material.color.set(build.valid ? '#7fd38f' : '#d6403a').convertSRGBToLinear(); });
      }
      function placeRefuge() {
        if (!build || !build.valid) { toast(build ? build.reason : 'No hay nada que colocar'); return false; }
        if (!has(REFUGE_COST)) { toast('Te falta ' + missingText(REFUGE_COST)); return false; }
        pay(REFUGE_COST);
        S.refuge = { parcel: build.parcel, x: build.gx, z: build.gz, damaged: false };
        S.builds.push(build.parcel);
        log('LandSelected', { parcel: build.parcel, attempt: S.builds.length });
        log('ShelterConstructed', { parcel: build.parcel, attempt: S.builds.length });
        build = null; ghost.visible = false; hideToast();
        C.placeRefugeMesh(); syncRefugeInteractable();
        G.audio.play('construir'); G.fx.burst(S.refuge.x, H(S.refuge.x, S.refuge.z) + 2, S.refuge.z, 'feathers', 24); // golpes de martillo y un acorde corto
        say(L('evento:ShelterConstructed', [{ who: 'Iguaca', img: IMG.L, text: '¡Lo logramos! …¿Oyes eso? Viene más lluvia.' }]), null, LIBRE);
        // La crecida dura 20 s (mejora 4): el río sube 12 s, se queda y baja; mientras, arrastra tres cosas que se pueden salvar
        S.event = { t: 0, dur: 20 };
        crecida.empezar();
        applyGuardianLook();
        return true;
      }
      G.interaccion.modo = { activo: () => !!build, accion: placeRefuge, aviso: () => build.valid ? 'Acción: colocar refugio' : build.reason, verbo: 'Colocar' };
      G.on('escape', () => { if (build) cancelBuild(); });
      G.on('update', updateGhost, 45);

      // ---------- La crecida: lluvia, el río sube y el refugio del terreno A se inunda ----------
      // Sonido de la crecida (CAP1_PENDIENTE P1-4): lluvia continua (se vuelve a tocar cada segundo y se solapa), un trueno lejano al
      // empezar y el rugido del río al subir. Corre con el tiempo del juego (e.t), así que se puede probar con tick().
      const suena = { t: 0, lluvia: 0, trueno: false, crecida: false };
      function sonidoCrecida(e) {
        if (e.t < suena.t) { suena.lluvia = 0; suena.trueno = suena.crecida = false; } // evento nuevo
        suena.t = e.t;
        if (e.t >= suena.lluvia) { suena.lluvia = e.t + 1; G.audio.play('lluvia'); }
        if (!suena.trueno && e.t > 0.8) { suena.trueno = true; G.audio.play('trueno'); }
        if (!suena.crecida && e.t > e.dur * 0.3) { suena.crecida = true; G.audio.play('crecida'); }
      }
      G.on('update', dt => {
        if (!S.event) return;
        const e = S.event; e.t += dt;
        sonidoCrecida(e);
        const k = Math.min(1, e.t / (e.dur * 0.6));
        const fall = e.t > e.dur * 0.8 ? Math.min(1, (e.t - e.dur * 0.8) / (e.dur * 0.2)) : 0;
        G.agua.setLevel(WATER_BASE + (FLOOD_LEVEL - WATER_BASE) * k * (1 - fall * 0.85));
        G.fx.rain.visible = true;
        if (e.t > 1 && e.t < e.dur * 0.6) G.camara.shake(0.07, 0.1); // la crecida hace temblar la cámara
        crecida.flotar(dt, e);
        if (e.t >= e.dur) { S.event = null; G.fx.rain.visible = false; crecida.terminar(); finishRainEvent(); }
      }, 20);
      // Al terminar: la escena de Iguaca va en bocadillos y la historia sigue en el acto (afterRain); si se salvó algo, Iguaca lo agradece
      // y lo que se llevó el río se da por recuperado después (sin castigo). [KELVIN] las dos frases de Iguaca sobre el rescate son provisionales.
      function finishRainEvent() {
        const gracias = crecida.salvados.length ? [{ who: 'Iguaca', img: IMG.L, text: '¡Salvaste ' + crecida.nombres(crecida.salvados) + '! Mi familia te lo agradece.', mood: 'happy' }] : [];
        const rio = crecida.perdidos.length ? [{ who: 'Iguaca', img: IMG.L, text: 'El río se llevó ' + crecida.nombres(crecida.perdidos) + '. Tranquila: aparecerá río abajo y lo recogemos después.' }] : [];
        if (S.refuge.parcel === 'A') {
          S.refuge.damaged = true;
          S.indicators = { seguridad: 'baja', acceso: 'corto', habitat: 'nidos de ribera alterados' };
          log('ShelterFlooded', { parcel: 'A' });
          C.placeRefugeMesh();
          capture('shelter');
          say([...L('evento:ShelterFlooded', [{ who: 'Iguaca', img: IMG.L, text: 'El río subió y el refugio se inundó…' }]), ...gracias, ...rio], null, LIBRE);
          toast('Si desarmas el refugio recuperas los materiales', 3500); afterRain();
        } else {
          S.indicators = { seguridad: 'alta', acceso: 'largo, cuesta arriba', habitat: 'nidos de ribera intactos' };
          if (S.builds.includes('A')) log('ShelterRelocated', { from: 'A', to: 'B' });
          capture('shelter');
          say([...L('evento:ShelterRelocated', [
            { who: 'Iguaca', img: IMG.L, text: 'La colina aguantó la crecida. Mi familia está a salvo.' },
            { who: 'Vittata', img: IMG.V, text: 'Construir rápido no sirve de mucho si después tenemos que empezar otra vez.' },
          ]), ...gracias, ...rio], null, LIBRE);
          afterRain();
        }
      }
      function afterRain() {
        // [KELVIN-5] SCRIPT p.9: aquí entraría la familia de Iguaca al refugio («Pensé que hoy lo habíamos perdido todo»). Sin arte ni
        // diseño de la familia no se puede hacer; hoy solo habla Iguaca (ver PENDIENTES_KELVIN).
        applyGuardianLook();
        if (S.step === 4) { advanceTo(5); toast('Alguien te observa desde el sendero del sur', 3500); }
        else checkProgress();
      }
      function dismantle() {
        S.inv.madera += REFUGE_COST.madera; S.inv.piedra += REFUGE_COST.piedra;
        log('ShelterDismantled', { parcel: S.refuge.parcel });
        S.refuge = null; C.placeRefugeMesh();
        S.indicators = { seguridad: '—', acceso: '—', habitat: '—' };
        say(L('evento:ShelterDismantled'), () => toast('Recuperaste 3 madera y 2 piedras. Ve al letrero de la colina para construir de nuevo.', 3500), LIBRE);
        checkProgress();
      }

      // ---------- Guardián, transmisor y mirador ----------
      function talkGuardian() {
        // [KELVIN-2] El guion (p.7-8) lo hace llegar antes de construir y sostener una pieza con Vittata; aquí llega tras la crecida.
        if (S.step === 5) {
          const present = S.refuge && !S.refuge.damaged
            ? L('interact:guardian_refugio', [{ who: 'Guardián', img: IMG.G, text: 'Buen lugar. Un hogar no es solamente lo que construimos. También es lo que cuidamos.' }])
            : [{ who: 'Guardián', img: IMG.G, text: 'Lo levantaste rápido, pero quedó en el agua. Todavía puedes moverlo: un error a tiempo también enseña.' }];
          // El Guardián narra (mejora 3): sus líneas van en bocadillos y el banco se desbloquea en el acto
          say([
            ...L('evento:GuardianMet', [
              { who: 'Guardián', img: IMG.G, text: 'Veo que todavía quedan constructores por aquí.' },
              { who: 'Guardián', img: IMG.G, text: 'Alguien que construyó muchas cosas… y perdió algunas de las más importantes.' },
            ]),
            { who: 'Vittata', img: IMG.V, text: 'Entonces quizás pueda ayudarnos. Este es nuestro refugio.' },
            ...present,
            ...L('evento:WorkshopUpgradeUnlocked', [{ who: 'Guardián', img: IMG.G, text: 'Te dejo mi viejo banco de trabajo en tu taller. Con él podrás reparar ese transmisor.' }]),
          ], null, LIBRE);
          S.guardianMet = true; S.benchUnlocked = true;
          log('GuardianMet', { refugeSafe: !!(S.refuge && !S.refuge.damaged) });
          log('WorkshopUpgradeUnlocked', { upgrade: 'banco de trabajo' });
          C.applyTallerLook();
          toast('Mejora del taller desbloqueada: banco de trabajo', 3000);
          advanceTo(6);
          return;
        }
        say([{ who: 'Guardián', img: IMG.G, text: S.step > 5 ? 'El transmisor está en tu taller. Veamos si todavía habla.' : '¿Segura de que funcionará? Bien. Entonces vamos a comprobarlo.' }], null, LIBRE);
      }
      function useTransmitter() {
        if (S.step !== 6) { examine('transmisor'); return; }
        if (!has(REPAIR_COST)) { toast('Para repararlo te falta ' + missingText(REPAIR_COST)); return; }
        // M3: el transmisor necesita voz; el coro de coquíes lo enciende
        if (!S.missions.m3) { C.startChorus(); return; }
        pay(REPAIR_COST);
        S.transmitterOn = true;
        C.applyTallerLook();
        log('TransmitterActivated');
        G.audio.play('chorus'); G.audio.play('bip'); G.camara.shake(0.15, 0.6); G.fx.burst(TRX.x, H(TRX.x, TRX.z) + 1.6, TRX.z, 'gold', 30);
        showSymbol(true);
        // La Voz no es el Guardián (CAP1_PENDIENTE P0-2): retrato neutro de señal y estática de radio bajo su primera línea
        const voz = L('evento:TransmitterActivated', [{ who: 'Voz', img: IMG.VOZ, text: 'Si alguien puede escucharme… …el pacto…' }]);
        if (voz[0]) voz[0].onShow = () => G.audio.play('estatica');
        // La Voz y el Guardián narran (mejora 3): bocadillos con el símbolo en pantalla; al terminar se retira el símbolo.
        // La historia pasa al mirador en el acto (el aviso de hacia dónde ir sale cuando se retira el símbolo).
        say([
          { who: 'Vittata', img: IMG.V, text: '¡Ese transmisor llevaba años sin funcionar!' },
          ...voz,
          ...L('interact:simbolo', [{ who: 'Vittata', img: IMG.V, text: '¿Qué pacto? Mira: un símbolo dividido en 36 fragmentos.' }]),
          // [KELVIN-3] Aquí iría la medalla del Guardián igual a una pieza del emblema (NARRATIVA «Giro»), si es canon: hoy solo reconoce el símbolo y calla.
          ...L('interact:simbolo_guardian', [{ who: 'Guardián', img: IMG.G, text: 'No veía ese símbolo desde hace mucho tiempo. Significa que esta historia es mucho más grande de lo que imaginamos.' }]),
        ], () => {
          showSymbol(false);
          toast('Sube al mirador de la colina, al norte del refugio de la loma', 4000);
        }, LIBRE);
        advanceTo(7);
      }
      function useMirador() {
        if (S.step !== 7) { say([{ who: 'Vittata', img: IMG.V, text: 'Desde aquí se ve todo el daño de la Ruptura… y a lo lejos, otras islas.' }]); return; }
        // Final (SCRIPT p.12 · NARRATIVA «Final»): la cámara mira a la isla de la luz; Vittata abre el plano del bote (tarjeta en pantalla
        // y chispa de sonido); al seguir, la luz de la niebla parpadea tres veces como respuesta a la señal; el Guardián calla y habla el Narrador.
        const luz = C.luzMirador, I0 = luz ? luz.isla : G.terreno.islas[0];
        if (I0) G.camara.yaw = Math.atan2(MIRADOR.x - I0.x, MIRADOR.z - I0.z);
        const bote = L('evento:BoatBlueprintUnlocked', [{ who: 'Vittata', img: IMG.V, text: 'Si los caminos desaparecieron, construiremos otros. Empezando por una embarcación.' }]);
        const aviso = L('evento:LocationDiscoveredMirador', [
          { who: 'Iguaca', img: IMG.L, text: 'Mira, Vittata. Esa luz en la niebla…' },
          { who: 'Iguaca', img: IMG.L, text: '¡Parpadeó tres veces! Alguien contesta.' },
        ]);
        if (bote[0]) bote[0].onShow = () => { mostrarPlano(true); G.audio.play('nido_chispa'); };
        if (aviso[0]) aviso[0].onShow = () => { mostrarPlano(false); if (luz) luz.parpadear(3); };
        // El final es narración (Guardián y Narrador, mejora 3): bocadillos con el plano y la luz en su momento; la cotorra puede
        // mirar alrededor mientras; el panel final llega al terminar el último bocadillo
        say([
          { who: 'Vittata', img: IMG.V, text: 'Allá están las otras islas, separadas por esa niebla luminosa.' },
          { who: 'Iguaca', img: IMG.L, text: '¿Y cómo vamos a llegar si los caminos desaparecieron?' },
          ...bote,
          ...aviso,
          ...L('evento:ChapterCompleted', [{ who: 'Narrador', img: IMG.N, text: 'Y así comenzó la aventura que volvería a conectar los mundos. Continuará…' }]),
        ], () => {
          mostrarPlano(false);
          S.boatPlan = true;
          log('BoatBlueprintUnlocked');
          log('LocationDiscoveredMirador');
          if (luz) luz.destello(); // la foto de la última viñeta lleva la luz en su punto más brillante
          capture('final');
          S.complete = true;
          log('ChapterCompleted', { refugeParcel: S.refuge ? S.refuge.parcel : null });
          advanceTo(G.misiones.DONE);
          G.misiones.showEnd();
        }, LIBRE);
      }

      // ---------- Iguaca llama desde arriba (DIVERSION_CAP1, mejora 1) ----------
      // Al despertar, Iguaca está en la copa del flamboyán de la plaza (sin mapa, en el techo del taller): para hablarle hay que
      // despegar y posarse a su lado (una percha de fisica sostiene a Vittata en la copa, y queda para siempre como percha de la
      // plaza). Al acercarse, Iguaca llama desde arriba (interact:luma_inicio, bocadillos); la charla de la misión es en la copa y
      // después Iguaca baja a su sitio de la plaza. Sigue siendo el sprite con flota: true de mundo.js.
      // [KELVIN] si Iguaca vuela o solo flota: hoy baja en línea recta en 1,4 s, sin alas ni animación.
      const MAPA_C1 = window.AV_MAPA_CAP1 || null;
      const lumaN = G.actores.npc('luma'), lumaIt = G.interaccion.find('luma');
      const LUMA_SUELO = { x: lumaN.def.x, z: lumaN.def.z };
      const percha = (() => {
        const p = G.terreno.poi && G.terreno.poi('flamboyan_plaza');
        if (p) {
          const hero = ((((MAPA_C1 || {}).flora || {}).heroes) || []).find(h => h.especie === 'flamboyan' && Math.hypot(h.pos[0] - p.x, h.pos[2] - p.z) < 0.5);
          return { x: p.x, z: p.z, y: H(p.x, p.z) + 7, r: 1.7, esc: (hero && hero.escala) || 1, arbol: true, nombre: 'la copa del flamboyán de la plaza' };
        }
        const T = C.T; return { x: T.x, z: T.z, y: T.base + 3.9, r: 1.6, esc: 1, arbol: false, nombre: 'el techo del taller' };
      })();
      // Altura de la copa: la del modelo del flamboyán por su escala en el mapa, cuando carga la flora (hasta entonces, 7 m)
      if (percha.arbol && G.vegetacion && G.vegetacion.listo) G.vegetacion.listo.then(() => {
        const inf = G.vegetacion.info && G.vegetacion.info.flamboyan;
        if (inf && inf.alto) percha.y = H(percha.x, percha.z) + Math.max(5, inf.alto * percha.esc * 0.92);
      }).catch(() => {});
      G.fisica.addPercha({ x: percha.x, z: percha.z, r: percha.r, get y() { return percha.y; } });
      const lumaArriba = () => S.step === 0 && !S.complete;
      let lumaK = lumaArriba() ? 0 : 1; // 0 = en la percha, 1 = en su sitio de la plaza
      let llamo = false;
      // Posada junto a Iguaca: a su altura y dentro de la percha (desde el suelo, bajo la copa, no se le puede hablar)
      const juntoALuma = () => Math.abs(S.pos.y - percha.y) < 1.6;
      lumaIt.visible = () => !lumaArriba() || juntoALuma();
      G.on('render', (dt, t) => {
        const want = lumaArriba() ? 0 : 1;
        lumaK = want > lumaK ? Math.min(1, lumaK + dt / 1.4) : want; // baja en 1,4 s; al cargar una partida se coloca de golpe
        const gy = H(LUMA_SUELO.x, LUMA_SUELO.z), e = lumaK * lumaK * (3 - 2 * lumaK);
        const x = percha.x + (LUMA_SUELO.x - percha.x) * e, z = percha.z + (LUMA_SUELO.z - percha.z) * e, y = percha.y + (gy - percha.y) * e;
        lumaIt.x = x; lumaIt.z = z; lumaN.collider.x = x; lumaN.collider.z = z; lumaN.collider.r = lumaK < 1 ? 0 : (lumaN.visible ? 0.6 : 0);
        if (lumaK >= 1) { lumaN.sp.position.x = x; lumaN.sp.position.z = z; lumaN.sh.position.set(x, gy + 0.03, z); return; } // la altura la pone actores (flota)
        lumaN.sp.position.set(x, y + 1.0 + Math.sin(t * 2) * 0.05, z); lumaN.sh.position.set(x, y + 0.03, z);
      }, 12);
      // La llamada: al acercarse a la copa (18 m; desde el taller no se oye) con Iguaca arriba y sin otra cosa en pantalla, en bocadillos
      G.on('update', (dt, busy) => {
        if (llamo || !lumaArriba() || busy || G.dialogo.activo() || S.clock < 0.5) return; // el gancho del capítulo arranca antes del medio segundo
        if (Math.hypot(S.pos.x - percha.x, S.pos.z - percha.z) < 18) { llamo = true; say(LLAMADA(), null, LIBRE); }
      }, 46);
      G.on('apply', () => { llamo = false; lumaK = lumaArriba() ? 0 : 1; }, 36);
      const lumaAPI = {
        percha, arriba: lumaArriba, junto: juntoALuma, llamo: () => llamo, llamado: () => { llamo = true; }, donde: () => percha.nombre,
        guia: () => (lumaArriba() ? { x: percha.x, z: percha.z, y: percha.y + 0.6 } : { x: lumaIt.x, z: lumaIt.z }),
      };

      // ---------- La crecida se juega (DIVERSION_CAP1, mejora 4) ----------
      // Mientras el río sube, el agua de la zona de la crecida arrastra tres cosas: las tablas de Iguaca, un coquí en su hoja y un
      // hallazgo del Diario (el más cercano sin encontrar). Se agarran en vuelo (Acción cerca; G.agarre, las lleva en las patas) y
      // se sueltan donde el agua no llegue: una copa, el techo del taller, la colina o cualquier suelo seco. Sin castigo: lo que no
      // se salva se da por recuperado después (el hallazgo sigue en su sitio). Lo salvado queda en el registro (evento FloodRescue)
      // y el hallazgo entra al Diario.
      const ZONA = (MAPA_C1 && MAPA_C1.agua && MAPA_C1.agua.crecida && MAPA_C1.agua.crecida.zona) || { x: PLACES.A.x, z: PLACES.A.z, r: 16 };
      const RIO_A = (G.terreno.poi && G.terreno.poi('rio_terrenoA')) || null;
      const scene = G.renderer.scene;
      // La corriente: en el mapa, la polilínea del río ([x, z, nivel, medioAncho]) hacia donde baja el nivel, a 1,2 m/s y a flote desde
      // el primer segundo (salen de la orilla junto al terreno A); sin mapa, un remolino dentro de la zona de la crecida
      const RIO = (MAPA_C1 && MAPA_C1.agua && MAPA_C1.agua.rio && MAPA_C1.agua.rio.puntos && MAPA_C1.agua.rio.puntos.length > 1) ? MAPA_C1.agua.rio.puntos : null;
      const RIO_DIR = RIO ? (RIO[RIO.length - 1][2] <= RIO[0][2] ? 1 : -1) : 1;
      const CORRIENTE = 1.2;
      function rioIdx(x, z) { let b = 0, bd = Infinity; for (let i = 0; i < RIO.length - 1; i++) { const d = Math.hypot(RIO[i][0] - x, RIO[i][1] - z); if (d < bd) { bd = d; b = i; } } return b; }
      // Punto del río en la posición k (índice + fracción) desplazado lat × medio ancho hacia un lado
      function puntoRio(k, lat) {
        const i = Math.max(0, Math.min(RIO.length - 2, Math.floor(k))), f = Math.min(1, Math.max(0, k - i));
        const a = RIO[i], b = RIO[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
        const w = (a[3] + (b[3] - a[3]) * f) * lat;
        return { x: a[0] + dx * f - dz / len * w, z: a[1] + dz * f + dx / len * w, len };
      }
      const kRio = k => Math.max(0, Math.min(RIO.length - 1.001, k));
      const objs = [], salvados = [], perdidos = [];
      const mat = c => new THREE.MeshLambertMaterial({ color: c }); // en sRGB: G.renderer.linearize los pasa a lineal una sola vez
      function mallaTablas() {
        const g = new THREE.Group(), m = mat('#a8743f');
        for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.3), m); t.position.set(0, 0.05 + i * 0.1, (i - 1) * 0.12); t.rotation.y = (i - 1) * 0.12; t.castShadow = true; g.add(t); }
        return g;
      }
      function mallaCoqui() {
        const g = new THREE.Group();
        const hoja = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.04, 14), mat('#3f8f3a')); hoja.position.y = 0.02; g.add(hoja);
        const cuerpo = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat('#b07a3c')); cuerpo.scale.set(1, 0.8, 1.25); cuerpo.position.y = 0.14; g.add(cuerpo);
        for (const s of [-1, 1]) { const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat('#1a1208')); ojo.position.set(s * 0.07, 0.22, 0.11); g.add(ojo); }
        return g;
      }
      function hallazgoCercano() {
        const DI = G.diario; if (!DI || !DI.entries) return null;
        let best = null, bd = Infinity;
        for (const f of DI.entries) { if (f.agua || S.field.includes(f.id)) continue; const d = Math.hypot(f.x - ZONA.x, f.z - ZONA.z); if (d < bd) { bd = d; best = f; } }
        return best;
      }
      function crear(id, nombre, obj, extra) {
        const o = Object.assign({ id, nombre, obj, fase: 'flota', ang: 0, rad: 9, bob: Math.random() * 6 }, extra);
        // Un interactuable por cosa, reutilizado en cada crecida (sus funciones se vuelven a enlazar al objeto nuevo)
        o.it = G.interaccion.find('crecida_' + id) || G.interaccion.add({ id: 'crecida_' + id, x: 0, z: 0, r: 2.4 });
        o.it.label = () => 'Agarrar ' + o.nombre; o.it.use = () => agarrar(o);
        o.it.visible = () => o.fase === 'flota' && !!S.event && !(G.agarre && G.agarre.lleva());
        return o;
      }
      function agarrar(o) {
        if (!G.agarre || !G.agarre.agarrar) { toast('Sin el modelo 3D no se puede agarrar', 2500); return; }
        if (!G.agarre.agarrar(o.obj, { id: o.id })) toast('Acércate un poco más y vuelve a pulsar Acción', 2200);
      }
      // Superficie donde flota algo en (x, z): el agua (río o crecida) o el suelo si el agua todavía no llegó
      const flotaY = (x, z) => { const lv = G.agua.levelAt(x, z); return Math.max(lv > -Infinity ? lv : -Infinity, H(x, z)) + 0.08; };
      const aFlote = (x, z) => G.agua.levelAt(x, z) > H(x, z) + 0.02;
      function colocar(o) {
        let x, z;
        if (RIO) { const p = puntoRio(o.k, o.lat); x = p.x; z = p.z; } else { x = ZONA.x + Math.cos(o.ang) * o.rad; z = ZONA.z + Math.sin(o.ang) * o.rad; }
        o.obj.position.set(x, flotaY(x, z) + Math.sin(S.clock * 1.6 + o.bob) * 0.05, z);
        o.obj.rotation.set(Math.sin(S.clock * 1.1 + o.bob) * 0.06, o.ang + Math.PI / 2, Math.cos(S.clock * 1.4 + o.bob) * 0.06);
        o.it.x = x; o.it.z = z;
      }
      function empezar() {
        limpiar();
        salvados.length = 0; perdidos.length = 0;
        const f = hallazgoCercano();
        const lista = [
          crear('tablas', 'las tablas de Iguaca', mallaTablas()),
          crear('coqui', 'el coquí', mallaCoqui()),
        ];
        if (f && G.diario.meshes[f.id]) {
          const m = G.diario.meshes[f.id].clone(); const sp = m.getObjectByName('spark'); if (sp) m.remove(sp);
          lista.push(crear('hallazgo', f.nombre, m, { hallazgo: f }));
        }
        // Salen del río junto al terreno A (a flote, uno tras otro) y la corriente se los lleva río abajo; sin mapa, un remolino en la zona
        const a0 = RIO_A ? Math.atan2(RIO_A.z - ZONA.z, RIO_A.x - ZONA.x) : 0;
        const k0 = RIO ? rioIdx(RIO_A ? RIO_A.x : ZONA.x, RIO_A ? RIO_A.z : ZONA.z) + 0.5 : 0;
        lista.forEach((o, i) => {
          if (RIO) { o.k = kRio(k0 - RIO_DIR * i * 0.6); o.lat = [0.35, -0.3, 0.5][i] || 0; }
          else { o.ang = a0 + (i - 1) * 0.75; o.rad = Math.min(ZONA.r - 4, 9 + (i % 2) * 1.5); }
          G.renderer.linearize(o.obj); scene.add(o.obj); colocar(o); objs.push(o);
        });
        toastHTML('¡El río crece y se lleva las cosas de Iguaca! <b>Agárralas al vuelo</b> (Acción cerca) y suéltalas donde el agua no llegue.', 6000);
        G.misiones.renderQuest(); // el objetivo del HUD pasa a «¡Crecida! …»
      }
      function flotar(dt) {
        for (const o of objs) {
          if (o.fase !== 'flota') continue;
          if (aFlote(o.obj.position.x, o.obj.position.z)) { // a flote: la corriente lo lleva
            if (RIO) o.k = kRio(o.k + RIO_DIR * dt * CORRIENTE / puntoRio(o.k, o.lat).len); else o.ang += dt * 0.14;
          }
          colocar(o);
        }
      }
      function nombres(ids) { const n = ids.map(id => (objs.find(o => o.id === id) || {}).nombre).filter(Boolean); return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n[0] || ''; }
      function salvar(o, pos) {
        o.fase = 'salvado'; salvados.push(o.id);
        log('FloodRescue', { item: o.id });
        const p = pos || o.obj.getWorldPosition(new THREE.Vector3());
        G.fx.burst(p.x, p.y + 0.8, p.z, 'stars', 18); G.camara.hitStop(0.05);
        if (o.id === 'coqui') { G.audio.play('co'); setTimeout(() => G.audio.play('qui'), 260); } else G.audio.play('pickup', 3);
        if (o.hallazgo) { scene.remove(o.obj); G.diario.found(o.hallazgo); } // el hallazgo entra al Diario (su tarjeta lo cuenta)
        else toast('¡Salvaste ' + o.nombre + '! A salvo del agua.', 3500);
        G.misiones.renderQuest();
      }
      function reflotar(o, pos) {
        const dx = pos.x - ZONA.x, dz = pos.z - ZONA.z, d = Math.hypot(dx, dz);
        if (RIO) { o.k = kRio(rioIdx(pos.x, pos.z) + 0.5); o.lat = 0.2; } else { o.ang = Math.atan2(dz, dx); o.rad = Math.max(4, Math.min(ZONA.r - 3, d)); }
        o.fase = 'flota';
        toast('Ahí el agua lo alcanza: llévalo a una copa, un techo o tierra seca', 3200);
      }
      // Está a salvo donde no llega el agua: dentro de la zona inundada, por encima del nivel de la crecida (rama, techo);
      // fuera, en cualquier sitio sin agua (o sobre ella: una rama del río)
      function aSalvo(pos) {
        const gy = H(pos.x, pos.z), lv = G.agua.levelAt(pos.x, pos.z);
        if (Math.hypot(pos.x - ZONA.x, pos.z - ZONA.z) < ZONA.r + 1) return pos.y >= FLOOD_LEVEL + 0.5 || gy >= FLOOD_LEVEL + 0.3;
        return !(lv > -Infinity) || gy > lv + 0.05 || pos.y > lv + 0.6;
      }
      G.on('agarrado', id => { const o = objs.find(x => x.id === id); if (o && o.fase === 'flota') { o.fase = 'llevado'; toast('¡Lo tienes! Suéltalo con Acción donde el agua no llegue.', 3000); } });
      G.on('soltado', (id, obj, pos) => {
        const o = objs.find(x => x.id === id); if (!o || o.fase !== 'llevado') return;
        if (!S.event || aSalvo(pos)) salvar(o, pos); else reflotar(o, pos);
      });
      function terminar() {
        for (const o of objs) {
          if (o.fase === 'llevado') salvar(o);                       // todavía en las patas al bajar el agua: a salvo
          else if (o.fase === 'flota') { o.fase = 'perdido'; perdidos.push(o.id); scene.remove(o.obj); } // río abajo; se recupera después
        }
        G.misiones.renderQuest();
      }
      function limpiar() { for (const o of objs) if (o.obj.parent === scene) scene.remove(o.obj); objs.length = 0; }
      // Lugares secos y altos para la guía mientras se lleva algo: la copa de Iguaca, el techo del taller y la colina
      const altos = () => [{ x: percha.x, z: percha.z, y: percha.y }, { x: C.T.x, z: C.T.z, y: C.T.base + 3.9 }, { x: PLACES.B.x, z: PLACES.B.z, y: PLACES.B.base }].filter(p => p.y >= FLOOD_LEVEL + 0.5);
      const crecida = {
        objetos: () => objs.slice(), salvados, perdidos, nombres, ZONA, altos, aSalvo, empezar, flotar, terminar, limpiar,
        guia: () => {
          if (G.agarre && G.agarre.lleva()) return G.misiones.closest(altos());
          const f = objs.filter(o => o.fase === 'flota').map(o => ({ x: o.it.x, z: o.it.z, y: o.obj.position.y + 1 }));
          return G.misiones.closest(f);
        },
      };
      G.on('apply', () => { limpiar(); salvados.length = 0; perdidos.length = 0; }, 36);

      // ---------- Símbolo de los 36 fragmentos (también decora la última viñeta del cómic) ----------
      const FRAG_COLORS = ['#2f8f4e', '#d6403a', '#f2a03d', '#3d8fb0', '#7fd38f', '#c9a227'];
      function drawSymbol(ctx, cx, cy, r) {
        ctx.save();
        for (let i = 0; i < 36; i++) {
          const a0 = (i / 36) * Math.PI * 2 - Math.PI / 2 + 0.012, a1 = ((i + 1) / 36) * Math.PI * 2 - Math.PI / 2 - 0.012;
          const ri = r * (i % 2 ? 0.55 : 0.62);
          ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.arc(cx, cy, ri, a1, a0, true); ctx.closePath();
          ctx.fillStyle = FRAG_COLORS[i % FRAG_COLORS.length]; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fillStyle = '#10241c'; ctx.fill();
        ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = Math.max(2, r * 0.04); ctx.stroke();
        ctx.fillStyle = '#ffd27a'; ctx.font = `700 ${Math.round(r * 0.32)}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('36', cx, cy + r * 0.02);
        ctx.restore();
      }
      function showSymbol(on) {
        $('symbol').hidden = !on;
        if (on) { const c = $('symbol-canvas'), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); drawSymbol(x, c.width / 2, c.height / 2, c.width * 0.45); }
      }

      // ---------- Al cargar o reiniciar ----------
      G.on('apply', () => { C.placeRefugeMesh(); syncRefugeInteractable(); C.applyTallerLook(); applyGuardianLook(); }, 35);
      G.on('apply', () => { build = null; ghost.visible = false; }, 42);
      G.on('apply', () => showSymbol(false), 50);

      Object.assign(C, { build: () => build, startBuild, cancelBuild, placeRefuge, openParcelCard, syncRefugeInteractable, applyGuardianLook, drawSymbol, showSymbol, examine,
        apertura, drawBlueprint, mostrarPlano, planoVisible, luma: lumaAPI, crecida, pendientesKelvin: PENDIENTES_KELVIN });
    },
  });
})();
