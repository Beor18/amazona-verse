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

  function sync3D(dt, moving, snap) {
    const F = G.fisica, MOVE = F.MOVE, keys = G.input.keys, talk = G.dialogo.talk, jumpHeld = G.input.jumpHeld;
    if (player3D) {
      player3D.root.position.set(S.pos.x, S.pos.y, S.pos.z);
      // Giro suave hacia donde mira (camino más corto)
      const want3 = Math.atan2(S.facing.x, S.facing.z), r = player3D.root.rotation;
      const dA = Math.atan2(Math.sin(want3 - r.y), Math.cos(want3 - r.y));
      r.y = snap ? want3 : r.y + dA * Math.min(1, dt * 14);
      // Inclinación al correr / impulsarse y aplastón al aterrizar
      const sp = MOVE.speed || 0, base = player3D.root.userData.s || (player3D.root.userData.s = player3D.root.scale.x);
      // Volando: el cuerpo se tumba hacia adelante según la velocidad, y se endereza al subir
      const flyLean = MOVE.flying ? 0.2 + Math.min(1, sp / F.FLY_SPEED) * 0.55 - Math.max(0, S.vy) * 0.05 : 0;
      // Nadando: casi horizontal como un ave que flota (pecho hundido); buceando, de cabeza
      const diving = MOVE.swimming && keys.has('c');
      const swimLean = diving ? 1.35 : 1.1 + Math.min(1, sp / F.SWIM_SPEED) * 0.1;
      r.x += ((MOVE.flying ? flyLean : MOVE.swimming ? swimLean : Math.min(0.35, sp / F.RUN_SPEED * 0.12 + (MOVE.dashT > 0 ? 0.25 : 0))) - r.x) * Math.min(1, dt * 8);
      // Meceo en el agua: sube y baja suave y se balancea de lado
      r.z = MOVE.swimming && !diving ? Math.sin(performance.now() / 590) * 0.06 : r.z * 0.9;
      if (MOVE.swimming && !diving) player3D.root.position.y += Math.sin(performance.now() / 430) * 0.035;
      const sq = MOVE.land > 0 ? Math.sin(MOVE.land / 0.2 * Math.PI) * 0.18 : 0;
      player3D.root.scale.set(base * (1 + sq * 0.5), base * (1 - sq), base * (1 + sq * 0.5));
      const air = S.pos.y > G.fisica.suelo(S.pos.x, S.pos.z, S.pos.y) + 0.01 && !MOVE.swimming;
      const want = moving && !air && !MOVE.swimming ? 'Walk' : 'Idle';
      const clipEmote = emote.name && EMOTES[emote.name].clip && !moving && !air;
      if (!clipEmote && anim3D.player !== want && player3D.play(want)) anim3D.player = want;
      if (player3D.current && !clipEmote) player3D.current.timeScale = want === 'Walk' ? Math.max(0.8, sp / F.SPEED) : 1;
      player3D.gait = MOVE.swimming ? (moving ? 2 : 1) : air || !moving ? 0 : sp > (F.SPEED + F.RUN_SPEED) / 2 ? 2 : 1; // nadando patalea siempre
      player3D.airborne = air;
      player3D.swimming = MOVE.swimming; player3D.diving = diving;
      player3D.swimRate = moving ? 1.3 : 0.55;
      if (MOVE.shake) { player3D.shakeT = 0.7; MOVE.shake = false; }
      // Habla y expresión en diálogos; si escucha a otro, atiende con curiosidad
      const inDialog = G.dialogo.open(), mine = inDialog && talk.who === J.nombre;
      player3D.talking = mine && performance.now() < talk.until;
      // Un gesto se cancela al moverse, saltar, volar o abrir un diálogo
      if (emote.name && (moving || air || inDialog)) stopEmote();
      if (emote.name && performance.now() > emote.until) stopEmote();
      player3D.emote = emote.name && EMOTES[emote.name].pose || null;
      player3D.expression = emote.name ? EMOTES[emote.name].face
        : !inDialog ? (MOVE.land > 0 ? 'surprised' : MOVE.flying || MOVE.swimming ? 'happy' : 'neutral') : mine ? talk.mood : talk.mood === 'sad' ? 'sad' : 'curious';
      player3D.wingMode = MOVE.swimming ? (diving ? 'dive' : 'swim') : MOVE.flying ? (jumpHeld ? 'flap' : 'fly') : MOVE.dashT > 0 ? 'glide' : !air ? (moving ? 'walk' : 'idle') : S.vy > 0 ? 'flap' : jumpHeld ? 'glide' : 'flap';
      ideaBulb.visible = emote.name === 'idea';
      if (ideaBulb.visible) ideaBulb.position.set(S.pos.x, S.pos.y + 2.55 + Math.sin(performance.now() / 180) * 0.06, S.pos.z);
      player3D.update(dt);
    }
    if (companion3D && companion3D.root.visible) {
      const tx = S.pos.x - S.facing.x * 1.8 + S.facing.z * 1.1, tz = S.pos.z - S.facing.z * 1.8 - S.facing.x * 1.1;
      const k = snap ? 1 : Math.min(1, dt * 3);
      const dx = (tx - companionPos.x) * k, dz = (tz - companionPos.z) * k;
      companionPos.x += dx; companionPos.z += dz;
      for (const c of F.colliders) F.pushOut(companionPos, c, 0.4);
      companion3D.root.position.set(companionPos.x, Math.max(G.terreno.surfaceY(companionPos.x, companionPos.z, S.pos.y), G.agua.levelAt(companionPos.x, companionPos.z) - F.SWIM_DEPTH), companionPos.z);
      const sp = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
      if (sp > 0.6) companion3D.root.rotation.y = Math.atan2(dx, dz);
      const want = sp > 0.6 && !snap ? 'Walk' : 'Idle';
      if (anim3D.companion !== want && companion3D.play(want)) anim3D.companion = want;
      companion3D.wingMode = want === 'Walk' ? 'walk' : 'idle';
      companion3D.gait = want === 'Walk' ? (sp > (F.SPEED + F.RUN_SPEED) / 2 ? 2 : 1) : 0;
      companion3D.update(dt);
      cShadow.position.set(companionPos.x, H(companionPos.x, companionPos.z) + 0.03, companionPos.z);
    }
  }
  // Aprendiz: modelo 3D con su look, o retrato 2D como sprite si no hay modelo
  async function refreshCompanion() {
    if (!S.profile.created) { companion.visible = cShadow.visible = false; if (companion3D) companion3D.root.visible = false; return; }
    if (companion3D) {
      companion3D.applyLook(G.creador.profileLook(S.profile));
      companion3D.root.visible = true; cShadow.visible = true; companion.visible = false;
      companionPos.x = S.pos.x - 1.5; companionPos.z = S.pos.z + 1;
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
