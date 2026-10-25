/* AVE · actores
   Jugador (modelo 3D de src/personaje/character.js o sprite de respaldo), aprendiz que lo sigue (el personaje del niño),
   NPC como sprites con sombra y collider, gestos (teclas 1–7 o menú Gestos) y la sincronía cuerpo/animación de cada cuadro.
   Datos del pack: jugador { nombre, sprite, especie, altura, acompanante: { altura } }, npcs [{ id, nombre, sprite, x, z, escala, flota }]. */
AVE.module('actores', function (G) {
  'use strict';
  const S = G.S, scene = G.renderer.scene, $ = G.util.$;
  const J = Object.assign({ nombre: 'Vittata', sprite: 'assets/vittata.png', especie: 'vittata', altura: 1.75 }, G.pack.jugador);
  const H = (x, z) => G.terreno.height(x, z);

  // Sprites (renders oficiales como sustitutos)
  const loader = new THREE.TextureLoader();
  function spriteFrom(url, scale) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: loader.load(url), transparent: true, alphaTest: 0.05 }));
    sp.scale.set(scale, scale, 1);
    return sp;
  }
  function blob(radius) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.25, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  const player = spriteFrom(J.sprite, 2.4); scene.add(player);
  const pShadow = blob(0.6); scene.add(pShadow);

  // NPC: sprite, sombra y collider; setVisible los oculta a la vez (el collider queda con radio 0)
  const npcs = {};
  function spawnNpc(def) {
    const sp = spriteFrom(def.sprite, def.escala || 2); sp.position.set(def.x, H(def.x, def.z) + 1.0, def.z); scene.add(sp);
    const sh = blob(0.55); sh.position.set(def.x, H(def.x, def.z) + 0.03, def.z); scene.add(sh);
    const collider = { x: def.x, z: def.z, r: 0.6, kind: 'npc', id: def.id };
    G.fisica.colliders.push(collider);
    const n = { def, sp, sh, collider, setVisible(show) { sp.visible = sh.visible = show; collider.r = show ? 0.6 : 0; }, get visible() { return sp.visible; } };
    npcs[def.id] = n;
    return n;
  }

  // Personaje del jugador real: aprendiz que acompaña al protagonista
  const portraitCanvas = document.createElement('canvas'); portraitCanvas.width = portraitCanvas.height = 256;
  const companionTex = new THREE.CanvasTexture(portraitCanvas);
  const companion = new THREE.Sprite(new THREE.SpriteMaterial({ map: companionTex, transparent: true, alphaTest: 0.05 }));
  companion.scale.set(1.7, 1.7, 1); companion.visible = false; scene.add(companion);
  const cShadow = blob(0.45); cShadow.visible = false; scene.add(cShadow);
  const companionPos = { x: 0, z: 0 };
  // Personajes 3D con esqueleto (si el modelo carga); si no, se usan los sprites
  let player3D = null, companion3D = null, failed3D = false;
  const anim3D = { player: '', companion: '' };
  async function init3D() {
    if (!window.AVCharacter) { failed3D = true; return; }
    try {
      const [a, b] = await Promise.all([window.AVCharacter.create(), window.AVCharacter.create()]);
      a.applyLook({ species: J.especie, accessories: Object.assign({}, S.wear) });
      a.root.scale.setScalar(J.altura / a.height); b.root.scale.setScalar(((J.acompanante && J.acompanante.altura) || 1.4) / b.height);
      b.root.visible = false;
      a.root.userData.sinCulling = b.root.userData.sinCulling = true; // siempre cerca de la cámara: el culling de objetos pequeños no los toca
      scene.add(a.root, b.root);
      player3D = a; companion3D = b;
      player.visible = false; companion.visible = false;
      refreshCompanion();
    } catch (e) { failed3D = true; }
  }
  // Ropa puesta en el protagonista (S.wear)
  function applyWear() { if (player3D) player3D.applyLook({ species: J.especie, accessories: Object.assign({}, S.wear) }); }

  // Gestos (teclas 1–7 o botón Gestos): clips del modelo o poses procedurales de character.js
  const EMOTES = G.pack.gestos || {
    saludar: { label: 'Saludar', clip: 'Welcome', face: 'happy', secs: 2 },
    celebrar: { label: 'Celebrar', clip: 'Celebrate', face: 'happy', secs: 1.6 },
    bailar: { label: 'Bailar', pose: 'dance', face: 'happy', secs: 8 },
    idea: { label: 'Idea', pose: 'idea', face: 'idea', secs: 2.2 },
    enojo: { label: 'Enojarse', pose: 'angry', face: 'angry', secs: 2.6 },
    pelea: { label: 'Pelear', pose: 'fight', face: 'fight', secs: 6 },
    molestia: { label: 'Molestia', pose: 'annoyed', face: 'annoyed', secs: 4 },
  };
  const EMOTE_KEYS = Object.keys(EMOTES);
  const emote = { name: '', until: 0 };
  function playEmote(name) {
    if (!EMOTES[name] || G.ui.busy() || G.fisica.MOVE.flying) return;
    if (S.pos.y > G.fisica.suelo(S.pos.x, S.pos.z, S.pos.y) + 0.01) return;
    emote.name = name; emote.until = performance.now() + EMOTES[name].secs * 1000;
    if (player3D && EMOTES[name].clip) { player3D.play(EMOTES[name].clip, true); anim3D.player = 'emote'; }
  }
  function stopEmote() { emote.name = ''; anim3D.player = ''; }
  // Foco de "idea" sobre la cabeza
  const ideaBulb = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 54, 6, 64, 54, 60); grd.addColorStop(0, 'rgba(255,240,150,1)'); grd.addColorStop(1, 'rgba(255,220,80,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffe36b'; g.beginPath(); g.arc(64, 52, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#9aa0a3'; g.fillRect(52, 76, 24, 16); g.fillStyle = '#6b7073'; g.fillRect(52, 82, 24, 3); g.fillRect(52, 88, 24, 3);
    g.strokeStyle = '#fff6c8'; g.lineWidth = 4; g.beginPath(); g.arc(56, 46, 10, Math.PI, Math.PI * 1.5); g.stroke();
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    s.scale.set(0.9, 0.9, 1); s.visible = false; scene.add(s); return s;
  })();
  // Menú de gestos (celular y ratón)
  const emoteMenu = $('emotes');
  emoteMenu.innerHTML = EMOTE_KEYS.map((k, i) => `<button class="btn" type="button" data-emote="${k}">${i + 1} · ${EMOTES[k].label}</button>`).join('');
  emoteMenu.addEventListener('click', e => { const b = e.target.closest('[data-emote]'); if (!b) return; emoteMenu.hidden = true; playEmote(b.dataset.emote); });
  $('b-emotes').addEventListener('click', () => { emoteMenu.hidden = !emoteMenu.hidden; });

  // ---------- Pico sincronizado con el diálogo ----------
  // Fuente de la boca, por orden: la voz que lee la línea (speechSynthesis), la máquina de escribir de src/ui/ui.js (#d-type) o nada.
  // Un cursor recorre el texto; cada sílaba que empieza abre el pico según su vocal (a/o más, i/u menos), las consonantes
  // labiales (m, b, p) lo cierran antes y la puntuación lo cierra. Como mucho MOUTH.maxHz aperturas por segundo: a 45 letras/s
  // el pico no vibra, aletea a ritmo de sílabas. Si un módulo emite G.emit('voz', { charIndex }) en cada palabra, se corrige el cursor.
  const MOUTH = { maxHz: 9, voiceCps: 13, hold: 0.07, rest: 0.12 };
  const VOWEL = { a: 1, á: 1, o: 0.9, ó: 0.9, e: 0.75, é: 0.75, i: 0.5, í: 0.5, u: 0.45, ú: 0.45, y: 0.4 };
  const mouth = { text: '', cur: 0, last: -1, open: 0, t: 0, pulse: 0, src: '', vStart: 0, vChar: null };
  G.on('voz', ev => { if (ev && ev.charIndex != null) mouth.vChar = ev.charIndex; });
  function mouthFor(dt, mine) {
    const dlg = $('dialog');
    if (!mine || !dlg || dlg.hidden) { mouth.src = ''; mouth.open = 0; return null; }
    const text = ($('d-text') && $('d-text').textContent) || '';
    if (text !== mouth.text) { mouth.text = text; mouth.cur = 0; mouth.last = -1; mouth.t = 1; mouth.vStart = 0; mouth.vChar = null; } // la primera sílaba abre ya
    let speaking = false; try { speaking = !!(window.speechSynthesis && speechSynthesis.speaking); } catch (e) { speaking = false; }
    const tw = document.querySelector('#d-type > span'), typing = dlg.classList.contains('is-typing');
    let cur = null;
    if (speaking) {
      if (!mouth.vStart) mouth.vStart = performance.now();
      cur = mouth.vChar != null ? mouth.vChar + 1 : (performance.now() - mouth.vStart) / 1000 * MOUTH.voiceCps;
      mouth.src = 'voz';
    } else if (typing && tw) { cur = tw.textContent.length; mouth.src = 'texto'; }
    else { mouth.src = ''; mouth.vStart = 0; if (!tw) return undefined; } // sin máquina de escribir ni voz: ritmo genérico
    mouth.t += dt; mouth.pulse = Math.max(0, mouth.pulse - dt);
    if (cur == null || cur >= text.length + 1) { mouth.open = 0; return 0; }
    // ¿Empezó una sílaba nueva entre el cursor anterior y este? (vocal precedida de consonante, espacio o inicio)
    let target = mouth.pulse > 0 ? mouth.open : MOUTH.rest * (/[\s.,;:!?…¡¿]/.test(text[Math.floor(cur) - 1] || ' ') ? 0 : 1);
    for (let i = Math.max(0, mouth.last + 1); i < Math.min(text.length, Math.floor(cur)); i++) {
      const ch = text[i].toLowerCase(), prev = (text[i - 1] || ' ').toLowerCase();
      if (VOWEL[ch] && !VOWEL[prev] && mouth.t >= 1 / MOUTH.maxHz) {
        target = VOWEL[ch] * (/[mbp]/.test(prev) ? 0.85 : 1); mouth.pulse = MOUTH.hold; mouth.t = 0;
      }
    }
    mouth.last = Math.floor(cur) - 1;
    mouth.open = target;
    return mouth.open;
  }
  // Ladeo en las curvas y giro: se mide la velocidad de giro real del cuerpo
  const turn = { yaw: null, rate: 0 };
  // Recoger algo: un saltito de alegría (sin tocar objetos.js: se nota en S.collected)
  const joy = { n: -1, t: 0 };

  function sync3D(dt, moving, snap) {
    const F = G.fisica, MOVE = F.MOVE, keys = G.input.keys, talk = G.dialogo.talk, jumpHeld = G.input.jumpHeld;
    if (player3D) {
      const P = player3D, root = P.root;
      root.rotation.order = 'YXZ'; // giro, luego inclinación sobre su propio eje lateral, luego ladeo (con XYZ, de lado se tumbaba de costado)
      root.position.set(S.pos.x, S.pos.y, S.pos.z);
      // Giro suave hacia donde mira (camino más corto)
      const want3 = Math.atan2(S.facing.x, S.facing.z), r = root.rotation;
      const dA = Math.atan2(Math.sin(want3 - r.y), Math.cos(want3 - r.y));
      const prevY = r.y;
      r.y = snap ? want3 : r.y + dA * Math.min(1, dt * (MOVE.flying ? 8 : 14));
      const yawRate = dt > 0 ? Math.atan2(Math.sin(r.y - prevY), Math.cos(r.y - prevY)) / dt : 0;
      turn.rate += (yawRate - turn.rate) * Math.min(1, dt * 6);
      const sp = MOVE.speed || 0, base = root.userData.s || (root.userData.s = root.scale.x);
      const fase = MOVE.fase || '';
      // Inclinación (pitch): corriendo e impulsándose hacia adelante; volando según la velocidad, recta al subir, de pico al
      // bajar; cernida casi derecha; al aterrizar se echa atrás para frenar con las alas
      const diving = MOVE.swimming && keys.has('c');
      const swimLean = diving ? 1.35 : 1.1 + Math.min(1, sp / F.SWIM_SPEED) * 0.1;
      const flyLean = fase === 'aterrizaje' ? (S.pos.y - MOVE.groundY < F.TUNING.flareHeight ? -0.3 : 0.1)
        : fase === 'despegue' ? 0.05 : fase === 'cernido' ? 0.12 + Math.min(1, sp / 2.5) * 0.1
        : 0.2 + Math.min(1, sp / F.FLY_SPEED) * 0.55 - Math.max(0, S.vy) * 0.05 + Math.max(0, -S.vy) * 0.03;
      const lean = MOVE.flying ? flyLean : MOVE.swimming ? swimLean : Math.min(0.35, sp / F.RUN_SPEED * 0.12 + (MOVE.dashT > 0 ? 0.25 : 0));
      r.x += (lean - r.x) * Math.min(1, dt * 8);
      // Ladeo (roll): volando se inclina hacia dentro de la curva como un ave; corriendo, apenas; en el agua, meceo
      const bank = MOVE.flying ? Math.max(-0.65, Math.min(0.65, -turn.rate * Math.min(1, sp / F.FLY_SPEED) * 0.45))
        : !MOVE.swimming && MOVE.grounded ? Math.max(-0.12, Math.min(0.12, -turn.rate * sp / F.RUN_SPEED * 0.05)) : 0;
      if (MOVE.swimming && !diving) r.z = Math.sin(performance.now() / 590) * 0.06;
      else r.z += (bank - r.z) * Math.min(1, dt * 5);
      if (MOVE.swimming && !diving) root.position.y += Math.sin(performance.now() / 430) * 0.035;
      // Aplastón al aterrizar, proporcional al golpe (aterrizar volando: suave)
      const sq = MOVE.land > 0 ? Math.sin(MOVE.land / F.TUNING.squashTime * Math.PI) * (0.06 + 0.16 * (MOVE.impact || 0)) : 0;
      // Estirón al despegar o saltar (anticipa y sigue el impulso)
      const st = !MOVE.grounded && !MOVE.flying && !MOVE.swimming && S.vy > 3 ? Math.min(0.06, (S.vy - 3) * 0.015) : fase === 'despegue' ? 0.05 : 0;
      root.scale.set(base * (1 + sq * 0.5 - st * 0.4), base * (1 - sq + st), base * (1 + sq * 0.5 - st * 0.4));
      const air = !MOVE.grounded && !MOVE.swimming && S.pos.y > F.suelo(S.pos.x, S.pos.z, S.pos.y) + 0.01;
      const run = sp > (F.SPEED + F.RUN_SPEED) / 2;
      // Clip base: Walk caminando (su fase la marca la velocidad, en character.js); corriendo a saltitos, Idle
      const want = moving && !air && !MOVE.swimming && !run ? 'Walk' : 'Idle';
      const clipEmote = emote.name && EMOTES[emote.name].clip && !moving && !air;
      if (!clipEmote && anim3D.player !== want && P.play(want)) anim3D.player = want;
      P.speed = sp;
      P.gait = MOVE.swimming ? (moving ? 2 : 1) : air || !moving ? 0 : run ? 2 : 1; // nadando patalea siempre
      P.airborne = air; P.flying = MOVE.flying; P.posado = MOVE.posado || ''; P.agachada = MOVE.agachada || 0;
      P.legsDown = fase === 'aterrizaje' ? 1 : fase === 'cernido' ? 0.65 : fase === 'despegue' ? 0.8 : 0;
      P.swimming = MOVE.swimming; P.diving = diving;
      P.swimRate = moving ? 1.3 : 0.55;
      // IK de patas: el suelo bajo cada pie (terreno, pisos y perchas)
      P.groundY = MOVE.groundY; P.groundAt = MOVE.grounded ? groundAt : null;
      if (MOVE.shake) { P.shakeT = 0.7; MOVE.shake = false; }
      // Habla y expresión en diálogos; si escucha a otro, lo mira y atiende con curiosidad
      const inDialog = G.dialogo.open(), mine = inDialog && talk.who === J.nombre;
      const m = mouthFor(dt, mine);
      if (m === undefined) { P.mouth = null; P.talking = mine && performance.now() < talk.until; }
      else { P.mouth = mine ? m : null; P.talking = mine && mouth.src !== ''; }
      P.lookAt = inDialog ? speakerPos(mine ? null : talk.who) : (G.agarre && G.agarre.mira) || null;
      // Un gesto se cancela al moverse, saltar, volar o abrir un diálogo
      if (emote.name && (moving || air || inDialog)) stopEmote();
      if (emote.name && performance.now() > emote.until) stopEmote();
      P.emote = emote.name && EMOTES[emote.name].pose || null;
      // Alegría al recoger: saltito, cara feliz y un aleteo corto
      const nCol = (S.collected || []).length;
      if (joy.n < 0 || snap) joy.n = nCol;
      if (nCol > joy.n && !inDialog) joy.t = 0.6;
      joy.n = nCol; joy.t = Math.max(0, joy.t - dt);
      if (joy.t > 0 && MOVE.grounded) root.position.y += Math.sin((0.6 - joy.t) / 0.6 * Math.PI) * 0.12;
      P.expression = emote.name ? EMOTES[emote.name].face
        : !inDialog ? (joy.t > 0 ? 'happy' : MOVE.land > 0 && MOVE.impact > 0.4 ? 'surprised' : MOVE.flying || MOVE.swimming ? 'happy' : 'neutral')
        : mine ? talk.mood : talk.mood === 'sad' ? 'sad' : 'curious';
      P.wingMode = MOVE.swimming ? (diving ? 'dive' : 'swim')
        : MOVE.flying ? (fase === 'despegue' ? 'takeoff' : fase === 'aterrizaje' ? (S.pos.y - MOVE.groundY < F.TUNING.flareHeight + 0.5 ? 'land' : 'glide')
          : jumpHeld ? 'flap' : fase === 'cernido' ? 'hover' : S.vy < -0.2 && sp > F.FLY_SPEED * 0.7 ? 'glide' : 'fly')
        : MOVE.dashT > 0 ? 'glide' : joy.t > 0.3 ? 'flap' : !air ? (moving ? 'walk' : 'idle') : S.vy > 0 ? 'flap' : jumpHeld ? 'glide' : 'flap';
      ideaBulb.visible = emote.name === 'idea';
      if (ideaBulb.visible) ideaBulb.position.set(S.pos.x, S.pos.y + 2.55 + Math.sin(performance.now() / 180) * 0.06, S.pos.z);
      P.update(dt);
    }
    if (companion3D && companion3D.root.visible) followCompanion(dt, snap);
    updateTag(dt);
  }
  // ---------- Compañero: la cría del criadero (o, sin criadero, el aprendiz del niño) ----------
  // Bebé: va a saltitos detrás (1,2 m), no vuela (salta y aletea). Juvenil: camina detrás (1,6 m). Adulto (y aprendiz): 1,9 m y
  // vuela junto a Vittata. Si se queda a más de COMPA.lejos m, reaparece detrás de ella. Mira a Vittata cuando habla.
  const COMPA = { dist: { bebe: 1.2, juvenil: 1.6, adulto: 1.9 }, lado: 0.9, vel: 12, acel: 7, lejos: 25, alturaVuelo: 0.4 };
  const cmp = { vx: 0, vz: 0, y: null, vy: 0, joy: 0 };
  function followCompanion(dt, snap) {
    const F = G.fisica, MOVE = F.MOVE, C = companion3D, etapa = compa.info ? compa.info.etapa : 'adulto';
    const vuela = etapa !== 'bebe' && etapa !== 'juvenil';
    const d = COMPA.dist[etapa] || 1.9;
    const tx = S.pos.x - S.facing.x * d + S.facing.z * COMPA.lado, tz = S.pos.z - S.facing.z * d - S.facing.x * COMPA.lado;
    let ex = tx - companionPos.x, ez = tz - companionPos.z;
    const far = Math.hypot(ex, ez);
    // Muy lejos (Vittata voló o se teletransportó): reaparece detrás de ella cuando vuelve a pisar suelo
    if (snap || (far > COMPA.lejos && (MOVE.grounded || MOVE.swimming || vuela))) { companionPos.x = tx; companionPos.z = tz; cmp.vx = cmp.vz = 0; cmp.y = null; ex = ez = 0; }
    // Velocidad: llega al punto de seguimiento con frenada suave (sin teletransportarse ni pasarse)
    const want = Math.min(COMPA.vel * (etapa === 'bebe' ? 0.85 : 1), Math.hypot(ex, ez) * 3.2), el = Math.hypot(ex, ez) || 1;
    const k = Math.min(1, dt * COMPA.acel);
    cmp.vx += (ex / el * want - cmp.vx) * k; cmp.vz += (ez / el * want - cmp.vz) * k;
    companionPos.x += cmp.vx * dt; companionPos.z += cmp.vz * dt;
    for (const c of F.colliders) F.pushOut(companionPos, c, 0.4);
    const ground = Math.max(G.terreno.surfaceY(companionPos.x, companionPos.z, S.pos.y), G.agua.levelAt(companionPos.x, companionPos.z) - F.SWIM_DEPTH);
    // Altura: en el suelo, o volando junto a Vittata (solo la adulta); el bebé y el juvenil saltan si ella salta cerca
    const flyY = vuela && MOVE.flying ? Math.max(ground, S.pos.y + COMPA.alturaVuelo) : ground;
    if (cmp.y == null) cmp.y = flyY;
    if (vuela && (MOVE.flying || cmp.y > ground + 0.05)) { cmp.y += (flyY - cmp.y) * Math.min(1, dt * 3); if (cmp.y < ground) cmp.y = ground; cmp.vy = 0; }
    else {
      if (cmp.y <= ground + 0.01 && MOVE.jumping && S.vy > 3 && Math.hypot(S.pos.x - companionPos.x, S.pos.z - companionPos.z) < 4) cmp.vy = etapa === 'bebe' ? 4 : 5.5;
      cmp.vy -= 22 * dt; cmp.y += cmp.vy * dt;
      if (cmp.y <= ground) { cmp.y = ground; cmp.vy = 0; }
    }
    const air = cmp.y > ground + 0.05, flying = vuela && air && MOVE.flying;
    C.root.position.set(companionPos.x, cmp.y, companionPos.z);
    if (compa.vest && compa.vest.pies) C.root.position.y -= compa.vest.pies();
    const sp = Math.hypot(cmp.vx, cmp.vz);
    if (sp > 0.6) { const want3 = Math.atan2(cmp.vx, cmp.vz), r = C.root.rotation, dA = Math.atan2(Math.sin(want3 - r.y), Math.cos(want3 - r.y)); r.y += dA * Math.min(1, dt * 10); }
    else if (G.dialogo.open() || sp < 0.2) { const want3 = Math.atan2(S.pos.x - companionPos.x, S.pos.z - companionPos.z), r = C.root.rotation, dA = Math.atan2(Math.sin(want3 - r.y), Math.cos(want3 - r.y)); r.y += dA * Math.min(1, dt * 3); }
    C.root.rotation.order = 'YXZ';
    C.root.rotation.x += ((flying ? 0.2 + Math.min(1, sp / F.FLY_SPEED) * 0.5 : 0) - C.root.rotation.x) * Math.min(1, dt * 6);
    const moving = sp > 0.6;
    const clip = moving && !air && etapa !== 'bebe' && sp < (F.SPEED + F.RUN_SPEED) / 2 ? 'Walk' : 'Idle';
    if (anim3D.companion !== clip && C.play(clip)) anim3D.companion = clip;
    C.speed = sp; C.airborne = air; C.flying = flying; C.legsDown = flying && sp < 2.5 ? 0.6 : 0;
    // Bebé: siempre a saltitos (patas juntas) y aleteando al saltar; juvenil y adulto caminan o corren
    C.gait = !moving || air ? 0 : etapa === 'bebe' || sp > (F.SPEED + F.RUN_SPEED) / 2 ? 2 : 1;
    C.wingMode = flying ? (sp < 2.5 ? 'hover' : 'fly') : air ? 'flap' : moving ? 'walk' : 'idle';
    C.groundY = ground; C.groundAt = !air ? groundAt : null;
    // Mira a Vittata cuando ella habla; se alegra cuando ella recoge algo
    C.lookAt = G.dialogo.open() && G.dialogo.talk.who === J.nombre && player3D ? player3D.root.position.clone().setY(player3D.root.position.y + 1.4) : null;
    C.expression = joy.t > 0 ? 'happy' : G.dialogo.open() ? 'curious' : flying ? 'happy' : 'neutral';
    if (compa.vest) compa.vest.antes();
    C.update(dt);
    if (compa.vest) compa.vest.despues();
    cShadow.position.set(companionPos.x, H(companionPos.x, companionPos.z) + 0.03, companionPos.z);
  }
  // Suelo bajo un pie (terreno, pisos de una vía y perchas) para el IK de patas
  function groundAt(x, z) { return G.fisica.suelo(x, z, S.pos.y + 0.05); }
  // Dónde mirar en un diálogo: al NPC que habla (por nombre) o, si habla Vittata, al NPC visible más cercano (a menos de 7 m)
  const speakTarget = new THREE.Vector3();
  function speakerPos(who) {
    let best = null, bd = 7;
    for (const id in npcs) {
      const n = npcs[id]; if (!n.visible) continue;
      if (who) { if (n.def.nombre === who || id === String(who).toLowerCase()) { best = n; break; } continue; }
      const d = Math.hypot(n.def.x - S.pos.x, n.def.z - S.pos.z); if (d < bd) { bd = d; best = n; }
    }
    if (!best) return null;
    return speakTarget.set(best.sp.position.x, best.sp.position.y + 0.4, best.sp.position.z);
  }
  // Aprendiz: modelo 3D con su look, o retrato 2D como sprite si no hay modelo
  // Datos del compañero: con criadero, su cría nacida (sin cría nacida no hay compañero); sin criadero, el aprendiz del niño
  const compa = { key: null, info: null, vest: null };
  // Letrero con el nombre de la cría ("Iguaca · Bebé · nivel 3", de G.criadero.etiqueta): papel claro y tinta oscura,
  // sobre la cabeza y con fundido cuando Vittata está a 3 m o menos. Nunca lleva texto escrito por el niño.
  const tag = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 112;
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    // Tamaño fijo en pantalla (UI_SYSTEM.md ítem 1): sin atenuación por distancia y escalado cada cuadro a TAG_PX de alto
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, sizeAttenuation: false }));
    sp.visible = false; sp.renderOrder = 10; sp.userData.sinCulling = true; sp.name = 'letrero_compa'; scene.add(sp);
    return { c, tex, sp, text: '', a: 0, w: 512 };
  })();
  function drawTag(text) {
    tag.text = text || '';
    const g = tag.c.getContext('2d'), css = getComputedStyle(document.documentElement), v = (k, d) => (css.getPropertyValue(k) || '').trim() || d;
    const font = v('--font-display', '"Fredoka", system-ui, sans-serif');
    g.clearRect(0, 0, tag.c.width, tag.c.height);
    if (!tag.text) { tag.tex.needsUpdate = true; return; }
    g.font = '600 44px ' + font;
    const w = Math.min(tag.c.width - 8, g.measureText(tag.text).width + 56), x0 = (tag.c.width - w) / 2, r = 26;
    g.beginPath(); g.moveTo(x0 + r, 6); g.arcTo(x0 + w, 6, x0 + w, 106, r); g.arcTo(x0 + w, 106, x0, 106, r); g.arcTo(x0, 106, x0, 6, r); g.arcTo(x0, 6, x0 + w, 6, r); g.closePath();
    g.fillStyle = v('--c-paper', '#f6ecd2'); g.fill(); g.lineWidth = 5; g.strokeStyle = v('--c-paper-edge', '#d9bf8a'); g.stroke();
    g.fillStyle = v('--c-ink', '#2b2116'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tag.text, tag.c.width / 2, 58, w - 40);
    tag.tex.needsUpdate = true;
    // Solo la parte usada del lienzo (sin deformar el texto): ancho w de 512 centrado
    tag.w = w; tag.tex.repeat.set(w / tag.c.width, 1); tag.tex.offset.set((tag.c.width - w) / 2 / tag.c.width, 0);
  }
  const TAG_PX = 36; // alto del letrero en píxeles de pantalla (CSS)
  function updateTag(dt) {
    const show = companion3D && companion3D.root.visible && !!tag.text && Math.hypot(S.pos.x - companionPos.x, S.pos.z - companionPos.z) <= 3;
    tag.a += ((show ? 1 : 0) - tag.a) * Math.min(1, dt * 6);
    tag.sp.visible = tag.a > 0.02; tag.sp.material.opacity = tag.a;
    if (tag.sp.visible) {
      const r = companion3D.root.position, h = J.altura * ((compa.info && compa.info.escala) || 1); tag.sp.position.set(r.x, r.y + h + 0.35, r.z);
      // sizeAttenuation false: alto en NDC = escala × P[5]; px = NDC × alto/2 → escala = 2·px / (alto del lienzo × P[5])
      const cam = G.renderer.camera, H = G.renderer.canvas.clientHeight || innerHeight, k = 2 / (H * cam.projectionMatrix.elements[5]);
      tag.sp.scale.set(TAG_PX * k * tag.w / tag.c.height, TAG_PX * k, 1);
    }
  }
  function setCompa(info) {
    const key = info ? info.id + ':' + info.etapa : '';
    if (key === compa.key && (!info || companion3D.root.visible)) return;
    if (compa.vest) { compa.vest.quitar(); compa.vest = null; }
    compa.key = key; compa.info = info;
    let txt = ''; try { txt = info && G.criadero.etiqueta ? G.criadero.etiqueta(info) : ''; } catch (e) { txt = ''; }
    drawTag(txt);
    if (!info) { companion3D.root.visible = false; cShadow.visible = companion.visible = false; return; }
    const altura = J.altura * (info.escala || 1);
    companion3D.root.scale.setScalar(altura / companion3D.height);
    companion3D.root.userData.s = companion3D.root.scale.x;
    try { compa.vest = G.criadero.vestir(companion3D, info); } catch (e) { compa.vest = null; companion3D.applyLook(info.look); }
    if (!compa.vest) companion3D.applyLook(info.look);
    companion3D.root.visible = true; cShadow.visible = true; companion.visible = false;
    companionPos.x = S.pos.x - S.facing.x * 1.6; companionPos.z = S.pos.z - S.facing.z * 1.6; cmp.y = null;
  }
  G.on('companero', info => { if (companion3D) { compa.key = null; setCompa(info || null); } }); // también rehace el letrero (etapa, nivel)
  async function refreshCompanion() {
    const CR = G.criadero && G.criadero.companero ? G.criadero : null;
    if (CR) {
      let info = null; try { info = CR.companero(); } catch (e) { info = null; }
      if (companion3D) { compa.key = null; setCompa(info); return; }
      companion.visible = cShadow.visible = false; // sin modelo 3D, la cría no se dibuja como sprite
      return;
    }
    if (!S.profile.created) { companion.visible = cShadow.visible = false; if (companion3D) companion3D.root.visible = false; return; }
    if (companion3D) {
      companion3D.root.scale.setScalar(((J.acompanante && J.acompanante.altura) || 1.4) / companion3D.height);
      companion3D.applyLook(G.creador.profileLook(S.profile));
      companion3D.root.visible = true; cShadow.visible = true; companion.visible = false;
      companionPos.x = S.pos.x - 1.5; companionPos.z = S.pos.z + 1; cmp.y = null;
      return;
    }
    await G.creador.drawPortrait(portraitCanvas.getContext('2d'), 256, S.profile, false);
    companionTex.needsUpdate = true;
    companion.visible = cShadow.visible = true;
    companionPos.x = S.pos.x - 1.5; companionPos.z = S.pos.z + 1;
  }

  // ---------- Posición de los sprites (la cámara llama a estas al colocarse) ----------
  function placePlayerSprite(bob) {
    player.position.set(S.pos.x, S.pos.y + 1.05 + bob, S.pos.z);
    pShadow.position.set(S.pos.x, G.fisica.suelo(S.pos.x, S.pos.z, S.pos.y) + 0.03, S.pos.z);
  }
  function snapCompanionSprite() {
    if (!companion.visible) return;
    companionPos.x = S.pos.x - S.facing.x * 1.8 + S.facing.z * 1.1; companionPos.z = S.pos.z - S.facing.z * 1.8 - S.facing.x * 1.1;
    companion.position.set(companionPos.x, H(companionPos.x, companionPos.z) + 0.75, companionPos.z);
    cShadow.position.set(companionPos.x, H(companionPos.x, companionPos.z) + 0.03, companionPos.z);
  }
  // El sprite de respaldo mira hacia donde se mueve
  function flipSprite(ix) {
    const map = player.material.map;
    if (ix < -0.1) map.repeat.x = -1; else if (ix > 0.1) map.repeat.x = 1;
    map.offset.x = map.repeat.x < 0 ? 1 : 0;
  }

  for (const def of G.pack.npcs || []) spawnNpc(def);

  G.on('render', (dt, t, moving) => {
    const bob = moving && S.pos.y <= G.fisica.suelo(S.pos.x, S.pos.z, S.pos.y) + 0.01 ? Math.abs(Math.sin(t * 12)) * 0.12 : 0;
    player.position.set(S.pos.x, S.pos.y + 1.05 + bob, S.pos.z);
    player.material.rotation = G.input.jumpHeld && S.vy < 0 ? Math.sin(t * 6) * 0.08 : 0;
    pShadow.position.set(S.pos.x, G.fisica.suelo(S.pos.x, S.pos.z, S.pos.y) + 0.03, S.pos.z);
  }, 5);
  G.on('render', (dt, t) => { for (const id in npcs) { const n = npcs[id]; if (n.def.flota) n.sp.position.y = H(n.def.x, n.def.z) + 1.0 + Math.sin(t * 2) * 0.05; } }, 10);
  G.on('render', (dt, t, moving) => {
    if (!companion.visible) return;
    const tx = S.pos.x - S.facing.x * 1.8 + S.facing.z * 1.1, tz = S.pos.z - S.facing.z * 1.8 - S.facing.x * 1.1;
    const k = Math.min(1, dt * 3);
    companionPos.x += (tx - companionPos.x) * k; companionPos.z += (tz - companionPos.z) * k;
    const cy = H(companionPos.x, companionPos.z);
    companion.position.set(companionPos.x, cy + 0.75 + Math.abs(Math.sin(t * 9)) * (moving ? 0.1 : 0), companionPos.z);
    cShadow.position.set(companionPos.x, cy + 0.03, companionPos.z);
  }, 12);
  G.on('render', (dt, t, moving) => sync3D(dt, moving, false), 15);
  G.on('apply', applyWear, 30);
  G.on('apply', () => refreshCompanion(), 95);

  return {
    player, pShadow, companion, cShadow, companionPos, npcs, npc: id => npcs[id], spawnNpc, spriteFrom, blob,
    get player3D() { return player3D; }, get companion3D() { return companion3D; }, get failed3D() { return failed3D; },
    init3D, applyWear, refreshCompanion, EMOTES, EMOTE_KEYS, emote, playEmote, stopEmote, sync3D,
    placePlayerSprite, snapCompanionSprite, flipSprite, nombre: J.nombre, sprite: J.sprite, especie: J.especie,
  };
});
