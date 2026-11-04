/* Álbum de las 36 · el ave TAL COMO LA DIBUJA EL JUEGO (canon, Kelvin 1-nov: docs/CANON_REGISTRY.md; look vibrant_toon).
   Lo inyecta tools/album/retratos.js en el juego ya arrancado (index.html?look=vibrant_toon&calidad=alto&clima=sol, tras
   Jugar → Empezar). No hay luces ni gradación propias: se usa el renderer del juego (G.renderer: ACES, exposición, gradación y
   borde de luz de look.js, composer con bloom) con su sol y su cielo hemisférico. Solo se pone una cámara de retrato:
   - una Vittata nueva (AVCharacter.create, el mismo modelo y rig) con la piel de la especie (AVE.pieles), en la posición del
     jugador (dentro de la sombra del sol), pose Idle (t = 0,3);
   - la cámara se gira con el sol: el sol del juego queda arriba a la izquierda y por delante (la «clave» de la receta), así
     las 36 salen con la misma luz aunque el sol del juego cambie un poco;
   - durante el dibujo se ocultan el mundo, el cielo y el jugador (solo quedan las luces y el ave), sin viñeta ni rayos del
     composer (la tarjeta lleva su propio acabado), y el fondo se saca por diferencia (dibujo sobre negro y sobre gris).
   window.AVRetratoAve(o, w, h) → canvas w×h con el ave sobre transparente (lo usa componer.js).
   window.AVRetratoJuego(w, h) → dataURL del jugador de verdad en el mundo, con la misma cámara (para la comparación). */
(function () {
  'use strict';
  const AV = window.AV, G = AV.G, R = G.renderer;
  let ch = null, caja = null;
  const sigFrame = () => new Promise(r => requestAnimationFrame(() => r()));
  const frames = async n => { for (let i = 0; i < n; i++) await sigFrame(); };

  async function rig(o) {
    if (!ch) {
      ch = await AVCharacter.create(); ch.root.userData.sinCulling = true; R.scene.add(ch.root);
      await AVCharacter.preloadRopa();
    }
    ch.applyLook(AVCharacter.normalizeLook({ species: 'vittata', accessories: {} }));
    if (o.piel) await AVE.pieles.aplicar(ch, o.piel);
    await AVE.pieles.listo(ch);
    const S = G.S; ch.root.position.set(S.pos.x, S.pos.y + 0.02, S.pos.z);
    await frames(6); // look.js barre lo nuevo (borde de luz) y el renderer lo enlaza antes de dibujarlo
    return ch;
  }

  // Cámara de retrato (la receta de tools/album/README.md), girada para que el sol haga de luz clave.
  function camara(o, w, h) {
    const sol = R.sun, d = new THREE.Vector3().subVectors(sol.position, sol.target.position).normalize();
    const KEY = o.clave || [-0.55, 0.75, 0.6];                       // clave de la receta, con la cámara en +z
    const th = Math.atan2(d.x, d.z) - Math.atan2(KEY[0], KEY[2]);     // giro de todo el conjunto alrededor del ave
    ch.mixer.stopAllAction();
    const clip = ch.clips[o.pose || 'Idle'] || ch.clips.Idle;
    ch.mixer.clipAction(clip).reset().play(); ch.mixer.setTime(clip.duration * (o.t == null ? 0.3 : o.t));
    ch.clothes();
    const P = ch.root.position.clone();
    if (!caja) { ch.root.rotation.set(0, 0, 0); ch.root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(ch.root); caja = { b, P: P.clone() }; window.CAJA = [b.min.toArray(), b.max.toArray()]; }
    ch.root.rotation.set(0, (o.yaw || 0) + th, 0); ch.root.updateMatrixWorld(true);
    const b = caja.b.clone().translate(P.clone().sub(caja.P)), H = b.max.y - b.min.y, E = o.encuadre;
    const tgt = new THREE.Vector3(P.x, b.min.y + H * E.tf, P.z);
    const cam = new THREE.PerspectiveCamera(E.fov, w / h, 0.01, 200);
    const dist = (H * E.alto / 2) / Math.tan(THREE.MathUtils.degToRad(E.fov / 2));
    const az = (E.az || 0) + th;
    cam.position.set(tgt.x + dist * Math.sin(az), tgt.y + dist * Math.sin(E.el || 0), tgt.z + dist * Math.cos(az));
    cam.lookAt(tgt); cam.updateMatrixWorld(true);
    return { cam, th, sol: d.toArray() };
  }

  // Un dibujo del juego (composer si lo hay) con otra cámara y otro tamaño; se devuelve una copia 2D. Síncrono.
  function dibujar(cam, w, h, fondo, soloAve) {
    const r = R.renderer, P = R.post, pr = r.getPixelRatio(), cv = R.canvas || r.domElement;
    const cssW = cv.clientWidth || cv.width / pr, cssH = cv.clientHeight || cv.height / pr;
    const ocultos = [], bg = R.scene.background, cc = r.getClearColor(new THREE.Color()).getHex(), ca = r.getClearAlpha();
    const vig = P && P.grade ? P.grade.uniforms.uVig.value : null, ray = P && P.grade ? P.grade.uniforms.uRayos.value : null;
    const rp = P && P.composer ? P.composer.passes.find(p => p.camera && p.scene === R.scene) : null, rpCam = rp && rp.camera;
    try {
      if (soloAve) {
        for (const o of R.scene.children) if (o !== ch.root && !o.isLight && o !== R.sun.target && o.visible) { ocultos.push(o); o.visible = false; }
        R.scene.background = null;
        if (P && P.grade) { P.grade.uniforms.uVig.value = 0; P.grade.uniforms.uRayos.value = 0; }
      } else if (ch) { ocultos.push(ch.root); ch.root.visible = false; }
      r.setPixelRatio(w / cssW); if (P && P.resize) P.resize(); r.setClearColor(fondo, 1);
      if (rp) rp.camera = cam;
      const ah = cam.aspect; cam.aspect = cssW / cssH; cam.updateProjectionMatrix();
      // el lienzo del juego tiene el aspecto de la ventana (retratos.js la pone a 4:5); se dibuja y se copia entero
      R.drawScene(cam);
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      out.getContext('2d').drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, w, h);
      cam.aspect = ah; cam.updateProjectionMatrix();
      return out;
    } finally {
      if (rp) rp.camera = rpCam;
      for (const o of ocultos) o.visible = true;
      R.scene.background = bg; r.setClearColor(cc, ca);
      if (P && P.grade) { P.grade.uniforms.uVig.value = vig; P.grade.uniforms.uRayos.value = ray; }
      r.setPixelRatio(pr); if (P && P.resize) P.resize();
    }
  }

  // Fondo por diferencia: el ave sobre negro y sobre gris medio (no blanco: el bloom del juego haría brillar un fondo blanco y
  // se colaría sobre el ave). El gris del fondo se mide en una esquina; a = 1 − (gris − negro) / fondo; color = negro / a.
  function matte(n, b) {
    const w = n.width, h = n.height, A = n.getContext('2d').getImageData(0, 0, w, h), B = b.getContext('2d').getImageData(0, 0, w, h);
    const k = B.data[0] + B.data[1] + B.data[2] - (A.data[0] + A.data[1] + A.data[2]);
    const out = document.createElement('canvas'); out.width = w; out.height = h; const x = out.getContext('2d'), O = x.createImageData(w, h);
    for (let i = 0; i < A.data.length; i += 4) {
      const dd = B.data[i] + B.data[i + 1] + B.data[i + 2] - (A.data[i] + A.data[i + 1] + A.data[i + 2]);
      const a = Math.max(0, Math.min(1, 1 - dd / k));
      if (a < 0.01) continue;
      O.data[i] = Math.min(255, A.data[i] / a); O.data[i + 1] = Math.min(255, A.data[i + 1] / a); O.data[i + 2] = Math.min(255, A.data[i + 2] / a); O.data[i + 3] = Math.round(a * 255);
    }
    x.putImageData(O, 0, 0); return out;
  }

  // Un sitio al sol (nada entre el ave y el sol en 60 m), cerca del jugador: así la comparación con el mundo no sale a la sombra.
  function alSol() {
    const S = G.S, d = new THREE.Vector3().subVectors(R.sun.position, R.sun.target.position).normalize(), rc = new THREE.Raycaster();
    const tapan = []; R.scene.traverse(o => { if (o.isMesh && o.visible && o !== R.sky && !(ch && o.parent && ch.root.getObjectById(o.id)) && !o.isSkinnedMesh) tapan.push(o); });
    for (let r = 0; r <= 40; r += 4) for (let k = 0; k < (r ? 12 : 1); k++) {
      const a = k / 12 * Math.PI * 2, x = S.pos.x + r * Math.cos(a), z = S.pos.z + r * Math.sin(a), y = G.terreno.height(x, z);
      let tapado = false;
      for (const h of [0.3, 1.0, 1.6]) { rc.set(new THREE.Vector3(x, y + h, z), d); rc.far = 60; if (rc.intersectObjects(tapan, false).length) { tapado = true; break; } }
      if (!tapado) return { x, y, z };
    }
    return { x: S.pos.x, y: S.pos.y, z: S.pos.z };
  }

  window.AVRetratoAve = async function (o, w, h) {
    await rig(o);
    const { cam } = camara(o, w, h);
    const negro = dibujar(cam, w, h, 0x000000, true), gris = dibujar(cam, w, h, 0x808080, true);
    return matte(negro, gris);
  };
  // Para la comparación: el jugador de verdad (su Vittata del juego, en el mundo y con su cielo) con la misma cámara.
  window.AVRetratoJuego = async function (o, w, h) {
    await rig(o);
    const S = G.S, pos0 = Object.assign({}, S.pos), sol = alSol();
    Object.assign(S.pos, sol); ch.root.position.set(sol.x, sol.y + 0.02, sol.z); ch.root.updateMatrixWorld(true);
    const pj = G.actores.player3D, { cam, th } = camara(o, w, h);
    const p = pj.root, pos = p.position.clone(), rot = p.rotation.y;
    try {
      p.position.copy(ch.root.position); p.rotation.y = ch.root.rotation.y; p.updateMatrixWorld(true);
      const s = p.scale.x; // el jugador va a su altura del creador: la cámara se acerca o se aleja en proporción
      cam.position.sub(ch.root.position).multiplyScalar(s / ch.root.scale.x).add(ch.root.position); cam.updateMatrixWorld(true);
      return { url: dibujar(cam, w, h, 0x000000, false).toDataURL('image/png'), th, escala: s };
    } finally { p.position.copy(pos); p.rotation.y = rot; p.updateMatrixWorld(true); Object.assign(S.pos, pos0); }
  };
  // Rectángulo del jugador en pantalla (px CSS), para medir su verde en el cuadro real.
  window.AVRetratoCaja = function () {
    const b = new THREE.Box3().setFromObject(G.actores.player3D.root), c = R.camera, cv = R.canvas || R.renderer.domElement, W = cv.clientWidth, H = cv.clientHeight;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) { const v = new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(c);
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return [x0 / W, y0 / H, x1 / W, y1 / H];
  };
  window.READY = true;
})();
