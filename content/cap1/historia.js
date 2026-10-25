/* Content pack cap1 · historia "El día que el cielo se rompió" (guion de Kelvin García, v1.0)
   Los 8 pasos del capítulo son datos (texto, progreso, guía y, si avanzan solos, su disparador "hasta");
   las escenas con decisiones (terrenos, construir, la crecida, el Guardián, el transmisor y el mirador) son scripts del pack
   que avanzan la historia con G.misiones.advanceTo(n). Las líneas salen de dialogos_cap1.js; las de respaldo están aquí. */
(function () {
  'use strict';
  const NEEDS = { madera: 4, piedra: 2, componente: 1 };
  const REFUGE_COST = { madera: 3, piedra: 2 };
  const REPAIR_COST = { madera: 1, componente: 1 };
  const at = (G, id) => G.misiones.at(id);

  AVE.registerPack({
    id: 'cap1',
    historia: {
      pasos: [
        { id: 'taller', texto: 'Examina tu taller dañado',
          progreso: S => ` (${(S.examined.maquina ? 1 : 0) + (S.examined.transmisor ? 1 : 0)}/2)`,
          guia: G => at(G, !G.S.examined.maquina ? 'maquina' : 'transmisor') },
        { id: 'luma', texto: 'Ayuda a Luma: habla con ella', guia: G => at(G, 'luma') },
        { id: 'recolectar', texto: 'Recolecta 4 madera, 2 piedras y 1 pieza de metal',
          progreso: (S, G) => {
            const got = type => Math.min(NEEDS[type], S.collected.filter(id => G.objetos.find(id).tipo === type).length);
            return ` (${got('madera')}/4 · ${got('piedra')}/2 · ${got('componente')}/1)`;
          },
          hasta: { tiene: NEEDS },
          alCompletar: G => { G.eventos.log('ResourcesCollected', { ...G.S.inv }); if (!G.dialogo.open()) G.dialogo.say(G.dialogo.L('evento:ResourcesCollected')); },
          guia: G => G.misiones.needItems(NEEDS) },
        { id: 'terrenos', texto: 'Inspecciona los dos terrenos',
          progreso: S => ` (${(S.evaluated.A ? 1 : 0) + (S.evaluated.B ? 1 : 0)}/2)`,
          hasta: { marca: ['evaluated.A', 'evaluated.B'] },
          guia: G => at(G, !G.S.evaluated.A ? 'postA' : 'postB') },
        { id: 'refugio', texto: 'Elige un terreno y construye el refugio',
          guia: G => { const S = G.S; return S.event ? null : S.refuge && S.refuge.damaged ? at(G, 'refuge') : S.refuge ? null : G.misiones.closest([at(G, 'postA'), at(G, 'postB')]); } },
        { id: 'guardian', texto: 'Habla con el Guardián Constructor', guia: G => at(G, 'guardian') },
        { id: 'transmisor', texto: 'Repara y activa el transmisor',
          progreso: (S, G) => S.chorus && !S.missions.m3 ? ` (coquíes ${S.coquis.length}/${G.c.BUSHES.length})` : '',
          guia: G => { const S = G.S; return !G.objetos.has(REPAIR_COST) ? G.misiones.needItems(REPAIR_COST) : S.chorus && !S.missions.m3 ? G.misiones.closest(G.c.BUSHES.filter(b => !S.coquis.includes(b.id))) : at(G, 'transmisor'); } },
        { id: 'mirador', texto: 'Sube al mirador de la colina', guia: G => at(G, 'mirador') },
      ],
      guiaBloqueada: G => !!G.c.build(),
      indicadores: S => { const I = S.indicators; return S.refuge ? `Seguridad del refugio: <b>${I.seguridad}</b> · Acceso: <b>${I.acceso}</b> · Hábitat: <b>${I.habitat}</b>` : ''; },
      fin: S => (S.refuge && S.refuge.parcel === 'B' ? 'El refugio de la colina protege a la familia de Luma.' : 'El refugio quedó junto al río y la crecida lo dañó.') +
        ' El transmisor reveló el símbolo de los 36 y desbloqueaste el plano de una embarcación. Continuará…',
    },
    costos: { NEEDS, REFUGE_COST, REPAIR_COST },

    // Gancho del capítulo (inicio:capitulo → inicio:taller → inicio:ruptura): la Ruptura sacude la cámara
    inicio(G) {
      const L = G.dialogo.L, rupt = L('inicio:ruptura');
      if (rupt[0]) rupt[0].onShow = () => { G.camara.shake(0.6, 1.2); G.audio.play('zzzt'); };
      G.dialogo.say([...L('inicio:capitulo'), ...L('inicio:taller'), ...rupt],
        () => G.ui.toast('La Gran Ruptura dañó el taller de Vittata. Examina la máquina y el transmisor.', 4500));
    },

    preparar(G) {
      const S = G.S, H = G.terreno.height, $ = G.util.$, C = G.c, IMG = C.IMG;
      const PLACES = C.PLACES, MAQ = C.MAQ, TRX = C.TRX, MIRADOR = C.MIRADOR;
      const L = G.dialogo.L, say = G.dialogo.say, log = G.eventos.log;
      const toast = G.ui.toast, toastHTML = G.ui.toastHTML, hideToast = G.ui.hideToast;
      const { has, pay, missingText } = G.objetos;
      const advanceTo = n => G.misiones.advanceTo(n), checkProgress = () => G.misiones.check();
      const capture = k => G.comic.capture(k);
      const WATER_BASE = G.terreno.waterBase, FLOOD_LEVEL = C.FLOOD_LEVEL;
      const guardian = G.actores.npc('guardian');
      G.audio.define('zzzt', (t, a, A) => { A.noise(t, 1.0, { freq: 200, to: 4200, q: 6, gain: 0.28 }); A.tone(110, t, 1.0, { type: 'sawtooth', to: 40, gain: 0.1 }); });

      // ---------- Interactuables ----------
      const add = G.interaccion.add;
      add({ id: 'maquina', x: MAQ.x, z: MAQ.z, r: 2.2, label: () => 'Examinar la máquina experimental', use: () => examine('maquina') });
      add({ id: 'transmisor', x: TRX.x, z: TRX.z, r: 2.2, label: () => S.step === 6 ? 'Reparar y activar el transmisor' : 'Examinar el transmisor', use: useTransmitter });
      add({ id: 'luma', x: G.actores.npc('luma').def.x, z: G.actores.npc('luma').def.z, r: 2.4, label: () => 'Hablar con Luma', use: talkLuma });
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
      function examine(what) {
        const firstTime = !S.examined[what];
        S.examined[what] = true;
        // La escena de la máquina (evento:WorkshopExplored) se cuenta al examinarla; el transmisor tiene la suya
        const lines = what === 'maquina'
          ? L('evento:WorkshopExplored', [{ who: 'Vittata', img: IMG.V, text: 'Mi máquina… Si consigo repararla, todavía podemos…' }])
          : L('interact:transmisor', [{ who: 'Vittata', img: IMG.V, text: 'Este transmisor llevaba años sin funcionar. Ahora además tiene la antena doblada.' }]);
        say(lines, () => {
          if (firstTime && S.step === 0 && S.examined.maquina && S.examined.transmisor) {
            log('WorkshopExplored'); capture('workshop');
            say([{ who: 'Luma', img: IMG.L, text: '¡Vittata! ¡Necesitamos ayuda!', mood: 'surprised' }], () => advanceTo(1));
          } else checkProgress();
        });
      }
      function talkLuma() {
        if (S.step === 0) { say([{ who: 'Luma', img: IMG.L, text: '¿Estás bien? Revisa tu taller y después ven, por favor.' }]); return; }
        if (S.step === 1) {
          // interact:luma_inicio → evento:LumaHelped (Vittata acepta ayuda) → interact:materiales
          say([
            ...L('interact:luma_inicio', [{ who: 'Luma', img: IMG.L, text: 'Mi familia no tiene dónde quedarse. Nuestro árbol se partió.' }]),
            ...L('evento:LumaHelped', [{ who: 'Vittata', img: IMG.V, text: 'Entonces tendremos que construir algo nuevo.' }]),
            ...L('interact:materiales', [{ who: 'Luma', img: IMG.L, text: 'No tenemos suficientes materiales.' }]),
            { who: 'Vittata', img: IMG.V, text: 'Busquemos madera, piedras y piezas de metal. ¡Una cayó al fondo del río!' },
          ], () => { log('LumaHelped'); advanceTo(2); });
          return;
        }
        if (S.step === 2 && !S.collected.includes('c1')) { say([{ who: 'Luma', img: IMG.L, text: 'La pieza de metal cayó en la poza del río. Nada hasta las burbujas y bucea con C (o el botón Bucear).' }]); return; }
        if (S.step <= 3) { say([{ who: 'Luma', img: IMG.L, text: 'Hay dos terrenos: junto al río (estacas naranja) y en la colina (estacas rojas). Mira bien los dos.' }]); return; }
        if (S.refuge && S.refuge.damaged) { say([{ who: 'Luma', img: IMG.L, text: 'El agua llegó otra vez… Si desarmas el refugio recuperas los materiales y podemos llevarlo a la colina.' }]); return; }
        say([{ who: 'Luma', img: IMG.L, text: S.complete ? 'Pensé que hoy lo habíamos perdido todo.' : '¡Gracias, Vittata! Mi familia ya tiene un techo.' }]);
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
                 ...L('interact:marcas_agua', [{ who: 'Luma', img: IMG.L, text: 'Pero mira esas marcas en los árboles: el río llegó hasta aquí durante la tormenta.' }])]
              : L('interact:colina', [{ who: 'Luma', img: IMG.L, text: 'Allá arriba parece más seguro.' }]);
            say(line, checkProgress);
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
        ghost.children.forEach(m => m.material.color.set(build.valid ? '#7fd38f' : '#d6403a').convertSRGBToLinear());
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
        G.audio.play('unlock'); G.fx.burst(S.refuge.x, H(S.refuge.x, S.refuge.z) + 2, S.refuge.z, 'feathers', 24);
        say(L('evento:ShelterConstructed', [{ who: 'Luma', img: IMG.L, text: '¡Lo logramos! …¿Oyes eso? Viene más lluvia.' }]));
        S.event = { t: 0, dur: 8 };
        applyGuardianLook();
        return true;
      }
      G.interaccion.modo = { activo: () => !!build, accion: placeRefuge, aviso: () => build.valid ? 'Acción: colocar refugio' : build.reason, verbo: 'Colocar' };
      G.on('escape', () => { if (build) cancelBuild(); });
      G.on('update', updateGhost, 45);

      // ---------- La crecida: lluvia, el río sube y el refugio del terreno A se inunda ----------
      G.on('update', dt => {
        if (!S.event) return;
        const e = S.event; e.t += dt;
        const k = Math.min(1, e.t / (e.dur * 0.6));
        const fall = e.t > e.dur * 0.8 ? Math.min(1, (e.t - e.dur * 0.8) / (e.dur * 0.2)) : 0;
        G.agua.setLevel(WATER_BASE + (FLOOD_LEVEL - WATER_BASE) * k * (1 - fall * 0.85));
        G.fx.rain.visible = true;
        if (e.t > 1 && e.t < e.dur * 0.6) G.camara.shake(0.07, 0.1); // la crecida hace temblar la cámara
        if (e.t >= e.dur) { S.event = null; G.fx.rain.visible = false; finishRainEvent(); }
      }, 20);
      function finishRainEvent() {
        if (S.refuge.parcel === 'A') {
          S.refuge.damaged = true;
          S.indicators = { seguridad: 'baja', acceso: 'corto', habitat: 'nidos de ribera alterados' };
          log('ShelterFlooded', { parcel: 'A' });
          C.placeRefugeMesh();
          capture('shelter');
          say(L('evento:ShelterFlooded', [{ who: 'Luma', img: IMG.L, text: 'El río subió y el refugio se inundó…' }]), () => {
            toast('Si desarmas el refugio recuperas los materiales', 3500); afterRain();
          });
        } else {
          S.indicators = { seguridad: 'alta', acceso: 'largo, cuesta arriba', habitat: 'nidos de ribera intactos' };
          if (S.builds.includes('A')) log('ShelterRelocated', { from: 'A', to: 'B' });
          capture('shelter');
          say(L('evento:ShelterRelocated', [
            { who: 'Luma', img: IMG.L, text: 'La colina aguantó la crecida. Mi familia está a salvo.' },
            { who: 'Vittata', img: IMG.V, text: 'Construir rápido no sirve de mucho si después tenemos que empezar otra vez.' },
          ]), afterRain);
        }
      }
      function afterRain() {
        applyGuardianLook();
        if (S.step === 4) { advanceTo(5); toast('Alguien te observa desde el sendero del sur', 3500); }
        else checkProgress();
      }
      function dismantle() {
        S.inv.madera += REFUGE_COST.madera; S.inv.piedra += REFUGE_COST.piedra;
        log('ShelterDismantled', { parcel: S.refuge.parcel });
        S.refuge = null; C.placeRefugeMesh();
        S.indicators = { seguridad: '—', acceso: '—', habitat: '—' };
        say(L('evento:ShelterDismantled'), () => toast('Recuperaste 3 madera y 2 piedras. Ve al letrero de la colina para construir de nuevo.', 3500));
        checkProgress();
      }

      // ---------- Guardián, transmisor y mirador ----------
      function talkGuardian() {
        if (S.step === 5) {
          const present = S.refuge && !S.refuge.damaged
            ? L('interact:guardian_refugio', [{ who: 'Guardián', img: IMG.G, text: 'Buen lugar. Un hogar no es solamente lo que construimos. También es lo que cuidamos.' }])
            : [{ who: 'Guardián', img: IMG.G, text: 'Lo levantaste rápido, pero quedó en el agua. Todavía puedes moverlo: un error a tiempo también enseña.' }];
          say([
            ...L('evento:GuardianMet', [
              { who: 'Guardián', img: IMG.G, text: 'Veo que todavía quedan constructores por aquí.' },
              { who: 'Guardián', img: IMG.G, text: 'Alguien que construyó muchas cosas… y perdió algunas de las más importantes.' },
            ]),
            { who: 'Vittata', img: IMG.V, text: 'Entonces quizás pueda ayudarnos. Este es nuestro refugio.' },
            ...present,
            ...L('evento:WorkshopUpgradeUnlocked', [{ who: 'Guardián', img: IMG.G, text: 'Te dejo mi viejo banco de trabajo en tu taller. Con él podrás reparar ese transmisor.' }]),
          ], () => {
            S.guardianMet = true; S.benchUnlocked = true;
            log('GuardianMet', { refugeSafe: !!(S.refuge && !S.refuge.damaged) });
            log('WorkshopUpgradeUnlocked', { upgrade: 'banco de trabajo' });
            C.applyTallerLook();
            toast('Mejora del taller desbloqueada: banco de trabajo', 3000);
            advanceTo(6);
          });
          return;
        }
        say([{ who: 'Guardián', img: IMG.G, text: S.step > 5 ? 'El transmisor está en tu taller. Veamos si todavía habla.' : '¿Segura de que funcionará? Bien. Entonces vamos a comprobarlo.' }]);
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
        G.audio.play('chorus'); G.camara.shake(0.15, 0.6); G.fx.burst(TRX.x, H(TRX.x, TRX.z) + 1.6, TRX.z, 'gold', 30);
        showSymbol(true);
        say([
          { who: 'Vittata', img: IMG.V, text: '¡Ese transmisor llevaba años sin funcionar!' },
          ...L('evento:TransmitterActivated', [{ who: 'Voz', img: IMG.G, text: 'Si alguien puede escucharme… …el pacto…' }]),
          ...L('interact:simbolo', [{ who: 'Vittata', img: IMG.V, text: '¿Qué pacto? Mira: un símbolo dividido en 36 fragmentos.' }]),
          ...L('interact:simbolo_guardian', [{ who: 'Guardián', img: IMG.G, text: 'No veía ese símbolo desde hace mucho tiempo. Significa que esta historia es mucho más grande de lo que imaginamos.' }]),
        ], () => {
          showSymbol(false);
          advanceTo(7);
          toast('Sube al mirador de la colina, al norte del refugio de la loma', 4000);
        });
      }
      function useMirador() {
        if (S.step !== 7) { say([{ who: 'Vittata', img: IMG.V, text: 'Desde aquí se ve todo el daño de la Ruptura… y a lo lejos, otras islas.' }]); return; }
        const I0 = G.terreno.islas[0];
        G.camara.yaw = Math.atan2(MIRADOR.x - I0.x, MIRADOR.z - I0.z);
        say([
          { who: 'Vittata', img: IMG.V, text: 'Allá están las otras islas, separadas por esa niebla luminosa.' },
          { who: 'Luma', img: IMG.L, text: '¿Y cómo vamos a llegar si los caminos desaparecieron?' },
          ...L('evento:BoatBlueprintUnlocked', [{ who: 'Vittata', img: IMG.V, text: 'Si los caminos desaparecieron, construiremos otros. Empezando por una embarcación.' }]),
          ...L('evento:LocationDiscoveredMirador'),
          ...L('evento:ChapterCompleted', [{ who: 'Narrador', img: IMG.V, text: 'Y así comenzó la aventura que volvería a conectar los mundos. Continuará…' }]),
        ], () => {
          S.boatPlan = true;
          log('BoatBlueprintUnlocked');
          log('LocationDiscoveredMirador');
          capture('final');
          S.complete = true;
          log('ChapterCompleted', { refugeParcel: S.refuge ? S.refuge.parcel : null });
          advanceTo(G.misiones.DONE);
          G.misiones.showEnd();
        });
      }

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

      Object.assign(C, { build: () => build, startBuild, cancelBuild, placeRefuge, openParcelCard, syncRefugeInteractable, applyGuardianLook, drawSymbol, showSymbol, examine });
    },
  });
})();
