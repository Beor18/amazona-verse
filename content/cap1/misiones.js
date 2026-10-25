/* Content pack cap1 · misiones de habilidad (GDD_CAP1 §3)
   Cada misión es un objeto de datos (pasos con disparadores "hasta" y una recompensa por hito, ver src/game/misiones.js);
   lo que no cabe en datos (el Simon del coquí) es un minijuego de este pack en preparar(G).
   La M2 de anillos de vuelo se quitó (la rechazó el fundador): su lugar es el hueco "educativa". */
(function () {
  'use strict';
  // M3 "Co-quí": tres coquíes escondidos; cada uno canta un patrón corto (co = grave, quí = agudo)
  const BUSHES = [
    { id: 'coqui1', x: -20, z: -6, song: ['co', 'qui'] },
    { id: 'coqui2', x: -1, z: 16, song: ['co', 'qui', 'qui'] },
    { id: 'coqui3', x: 15, z: -13, song: ['qui', 'co', 'qui'] },
  ];

  AVE.registerPack({
    id: 'cap1',
    coquies: BUSHES,
    misiones: [
      { id: 'm1', titulo: 'Fondo del río', hud: 'Río: bucear',
        pasos: [{ texto: 'Bucea hasta la pieza de metal del fondo de la poza', hasta: { recogido: 'c1' } }],
        recompensa: { hito: 'm1' } },
      // ---------- HUECO: misión educativa (M2) ----------
      // La llena el rol Educativo siguiendo docs/equipo/EDUCATIVO.md ("La ruta de la gota").
      // Mientras "pasos" esté vacío el motor la ignora: no sale en el HUD, no guía y no se completa.
      // Su recompensa ya está reservada: la pava jíbara (coleccionables.js, hito 'educativa').
      // Para llenarla: pasos [{ texto, hasta, guia? }] con disparadores de src/game/misiones.js; lo que no quepa en datos
      // (perchas, preguntas) va como minijuego en un preparar(G) de este pack, como el Simon de M3. Los datos de lecciones
      // deben ir en un .js que asigne un global (como dialogos_cap1.js): el artifact no permite fetch del .json.
      // Referencia: EDUCATIVO.md §6 reutiliza como perchas las coordenadas de los antiguos anillos (y = metros sobre el suelo).
      { id: 'educativa', titulo: 'Misión educativa', hud: null, pasos: [], recompensa: { hito: 'educativa' },
        referencia: { anillos: [{ x: 10, z: -8, y: 6 }, { x: 18, z: -16, y: 8 }, { x: 27, z: -12, y: 9 }, { x: 32, z: -2, y: 10 },
          { x: 30, z: 9, y: 10 }, { x: 24, z: 15, y: 9 }, { x: 19, z: 8, y: 8 }] } },
      { id: 'm3', titulo: 'Co-quí', hud: S => `Coquíes ${S.coquis.length}/${BUSHES.length}`,
        pasos: [
          { texto: 'Pide voz para el transmisor', hasta: { marca: 'chorus' } },
          { texto: 'Repite el canto de los 3 coquíes escondidos', hasta: { cuenta: ['coquis', BUSHES.length] } },
        ],
        recompensa: { hito: 'm3' },
        alCompletar: G => setTimeout(() => { if (G.S.missions.m3 && !G.S.transmitterOn) G.ui.toast('¡El coro de coquíes está listo! Vuelve al transmisor.', 4000); }, 4300) },
    ],

    preparar(G) {
      const S = G.S, scene = G.renderer.scene, H = G.terreno.height, $ = G.util.$;
      const IMG = G.c.IMG;
      G.audio.define('co', (t, a, A) => A.tone(1150, t, 0.14, { type: 'sine', to: 1020, gain: 0.28, bus: 'voice' }));
      G.audio.define('qui', (t, a, A) => A.tone(1650, t, 0.22, { type: 'sine', to: 2350, gain: 0.28, bus: 'voice' }));
      G.audio.define('chorus', (t, a, A) => { for (let k = 0; k < 6; k++) { A.tone(1150, t + k * 0.22, 0.12, { type: 'sine', to: 1030, gain: 0.16, bus: 'voice' }); A.tone(1700, t + k * 0.22 + 0.12, 0.16, { type: 'sine', to: 2350, gain: 0.16, bus: 'voice' }); } });

      // ---------- M3: coro de coquíes ----------
      // Arbustos de los coquíes (brillan durante la misión del coro)
      const bushMeshes = {};
      for (const b of BUSHES) {
        const g = new THREE.Group(), y = H(b.x, b.z);
        const leaf = new THREE.MeshLambertMaterial({ color: '#3f8f3a' });
        for (const [dx, dy, dz, s] of [[0, 0.5, 0, 0.75], [0.45, 0.35, 0.2, 0.5], [-0.4, 0.38, -0.15, 0.55]]) {
          const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), leaf); m.position.set(dx, dy, dz); g.add(m);
        }
        const glow = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), new THREE.MeshBasicMaterial({ color: '#c8ff7a', transparent: true, opacity: 0.22, depthWrite: false }));
        glow.position.y = 0.5; glow.visible = false; g.add(glow);
        const frog = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshLambertMaterial({ color: '#c98a3a' }));
        frog.position.set(0.25, 1.05, 0.45); frog.visible = false; g.add(frog);
        g.position.set(b.x, y, b.z); scene.add(g);
        bushMeshes[b.id] = { g, glow, frog };
        G.fisica.colliders.push({ x: b.x, z: b.z, r: 0.7, kind: 'obj' });
      }
      G.on('render', () => {
        const now = performance.now() / 1000;
        for (const b of BUSHES) {
          const bm = bushMeshes[b.id], live = S.chorus && !S.missions.m3 && !S.coquis.includes(b.id);
          bm.glow.visible = live; bm.frog.visible = S.coquis.includes(b.id) || S.missions.m3;
          if (live) { const k = 1 + Math.sin(now * 3 + b.x) * 0.08; bm.glow.scale.setScalar(k); bm.glow.material.opacity = 0.18 + Math.sin(now * 3 + b.x) * 0.06; }
        }
      }, 50);
      function startChorus() {
        if (S.chorus) { G.ui.toast(`El transmisor necesita voz: faltan ${BUSHES.length - S.coquis.length} coquíes que brillan`, 3000); return; }
        S.chorus = true; G.misiones.renderQuest(); G.guardado.autosave();
        G.dialogo.say([
          { who: 'Vittata', img: IMG.V, text: 'Ya casi está, pero este transmisor no tiene voz. Necesita un canto fuerte.', mood: 'idea' },
          { who: 'Luma', img: IMG.L, text: '¡Los coquíes! Hay tres escondidos en los arbustos que brillan. Tú imitas cualquier canto, ¿verdad?', mood: 'happy' },
        ], () => G.dialogo.choose({ who: 'Luma', text: '¿Cómo los vas a convencer de cantar?' }, [
          { label: 'Cantando yo primero: ¡co-quí!', value: 'cantar', reply: { who: 'Luma', img: IMG.L, text: '¡Eso, nena! Si cantas bonito, te van a contestar.', mood: 'happy' } },
          { label: 'Escuchando con paciencia', value: 'escuchar', reply: { who: 'Luma', img: IMG.L, text: 'Buena idea. Primero se escucha y después se canta.', mood: 'idea' } },
        ], o => { G.eventos.log('LumaChoice', { choice: o.value }); G.dialogo.say([o.reply], () => G.ui.toast('Busca los 3 coquíes que brillan y repite su canto', 3500)); }));
      }
      // Simon de 2–3 notas: el coquí canta, Vittata repite (co = grave, quí = agudo). "Pasar" aparece tras 2 fallos.
      let simon = null, simonTimers = [];
      function startSimon(b) { simon = { b, i: 0, fails: 0 }; renderSimon('Escucha al coquí y repite su canto.'); playSong(); }
      function playSong() {
        simonTimers.forEach(clearTimeout); simonTimers = [];
        if (!simon) return;
        simon.b.song.forEach((n, k) => simonTimers.push(setTimeout(() => {
          if (!simon) return;
          G.audio.play(n);
          const d = document.getElementById('sd-' + k); if (d) { d.classList.add('sing', 'sing-' + n); simonTimers.push(setTimeout(() => d.classList.remove('sing', 'sing-' + n), 340)); }
        }, 350 + k * 480)));
      }
      function renderSimon(msg) {
        const b = simon.b;
        const dots = b.song.map((n, k) => `<span class="sdot${k < simon.i ? ' ok ' + n : ''}" id="sd-${k}">${k < simon.i ? (n === 'co' ? 'co' : 'quí') : ''}</span>`).join('');
        G.ui.showCard(`<h2>Coquí escondido</h2><p>${msg}</p><p class="note">[Canta un coquí: ${b.song.length} notas. Grave = círculo grande abajo, agudo = pequeño arriba]</p>
      <div class="sdots" aria-hidden="true">${dots}</div>
      <div class="row"><button class="btn" id="s-co" type="button">Co (grave)</button><button class="btn" id="s-qui" type="button">Quí (agudo)</button>
      <button class="btn ghost" id="s-again" type="button">Escuchar otra vez</button>${simon.fails >= 2 ? '<button class="btn ghost" id="s-skip" type="button">Pasar</button>' : ''}</div>`);
        $('s-co').onclick = () => simonPress('co'); $('s-qui').onclick = () => simonPress('qui');
        $('s-again').onclick = () => { simon.i = 0; renderSimon('Escucha otra vez.'); playSong(); };
        if ($('s-skip')) $('s-skip').onclick = () => simonWin();
      }
      function simonPress(n) {
        if (!simon) return false;
        G.audio.play(n);
        if (n === simon.b.song[simon.i]) {
          simon.i++;
          if (simon.i >= simon.b.song.length) { simonWin(); return true; }
          renderSimon('¡Bien! Sigue…');
        } else {
          simon.fails++; simon.i = 0; G.audio.play('wrong');
          renderSimon(simon.fails >= 2 ? 'Casi. Escucha otra vez, o pulsa Pasar.' : 'Casi. Escucha otra vez.');
          simonTimers.push(setTimeout(playSong, 400));
        }
        return true;
      }
      function simonWin() {
        const b = simon.b;
        G.ui.hideCard();
        if (!S.coquis.includes(b.id)) S.coquis.push(b.id);
        G.audio.play('chorus'); G.fx.burst(b.x, H(b.x, b.z) + 1.2, b.z, 'gold', 20);
        G.misiones.check(); // con los 3 coquíes se completa M3 (datos de la misión)
        if (!G.misiones.done('m3')) G.ui.toast(`¡Coquí ${S.coquis.length} de ${BUSHES.length}! Busca los otros arbustos que brillan.`, 3000);
      }
      G.on('cardHidden', () => { simon = null; simonTimers.forEach(clearTimeout); simonTimers = []; });
      for (const b of BUSHES) G.interaccion.add({ id: b.id, x: b.x, z: b.z, r: 2.2, visible: () => S.chorus && !S.missions.m3 && !S.coquis.includes(b.id), label: () => 'Escuchar al coquí escondido', use: () => startSimon(b) });

      Object.assign(G.c, { BUSHES, startChorus, simonPress, simon: () => simon });
    },
  });
})();
