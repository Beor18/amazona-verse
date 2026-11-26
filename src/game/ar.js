/* Amazona Verse · prototipo «Vittata en tu casa» (25-nov). Solo con ?ar=1.
   Android: WebXR immersive-ar + hit-test (la API del navegador; three r128 tiene la sesión, no el hit-test).
   iPhone: AR Quick Look con assets/ar/vittata.usdz (USDZExporter de Three.js r128, MIT, en src/vendor/).
   La cámara no se lee, no se guarda y no se sube.
   Vittata se usa tal cual (AVCharacter.create): ni el modelo ni el rig se tocan. */
(function () {
  const ALTO = 0.30; // metros: una cotorra de verdad, de pie
  const GESTOS = [
    { id: 'saluda', clip: 'Welcome', sfx: 'aviso' },
    { id: 'celebra', clip: 'Celebrate', sfx: 'logro' },
    { id: 'aletea', clip: '', sfx: 'aleteo', alas: 'flap' },
  ];

  window.AVAr = function (G) {
    if (G.ar) return G.ar;
    const $ = id => document.getElementById(id);
    const L = (es, en) => (G.idioma && G.idioma.activo && G.idioma.activo() ? en : es);
    const bandera = () => /[?&]ar=1\b/.test(location.search);
    const reducido = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const iphone = () => /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const usdz = () => !!(window.THREE && THREE.USDZExporter);
    const privacidad = { ubicacion: false, subeCamara: false, guardaFoto: false };
    const escalaDe = h => ALTO / (h > 0.05 ? h : 1);

    let dlg = null, overlay = null, renderer = null, sesion = null, hit = null, puesta = false, ch = null, grupo = null, aro = null, baseY = 0, gesto = 0, aleteoHasta = 0;
    let suya = false, asustada = false, escenaAR = null, semilla = null, mallaSemilla = null, gestoHecho = 0;
    const CERCA = 0.42;
    const llevarEn = (obj, dx, dy, yaw) => {
      const paso = 0.002, c = Math.cos(yaw), s = Math.sin(yaw);
      obj.position.x += (dx * c + dy * s) * paso;
      obj.position.z += (-dx * s + dy * c) * paso;
      return obj.position;
    };
    const girarEn = (y, d) => y + d;
    const miedoDe = (dist, ya) => {
      if (dist == null || !isFinite(dist) || dist >= CERCA) return { asustada: false, nuevo: false };
      if (ya) return { asustada: true, nuevo: false };
      return { asustada: true, nuevo: true, sfx: 'aviso', alas: 'flap' };
    };
    const nuevaSemilla = () => ({ t: 0, dur: 0.55, viva: true, atrapada: false, sfx: 'semilla', sfxLanzar: 'lanzar' });
    const avanzarSemilla = (s, dt) => { if (s.viva) { s.t += dt; if (s.t >= s.dur) { s.viva = false; s.atrapada = true; } } return s; };

    function estilo() {
      if ($('ar-css')) return;
      const s = document.createElement('style'); s.id = 'ar-css';
      s.textContent = '#ar-casa{border:0;padding:0;background:transparent;max-width:calc(100vw - 24px)}#ar-casa::backdrop{background:rgba(6,16,12,.78)}' +
        '#ar-casa .ar-caja{width:min(420px,calc(100vw - 32px));padding:22px;border-radius:22px;background:#132b21;color:#f4f7f1;border:2px solid rgba(127,211,143,.45);display:grid;gap:12px;box-shadow:0 18px 50px rgba(0,0,0,.45)}' +
        '#ar-casa h2{margin:0;font:700 1.45rem/1.2 system-ui,sans-serif}#ar-casa p{margin:0;line-height:1.4;font:500 1.05rem/1.4 system-ui,sans-serif}' +
        '#ar-casa .ar-aviso{font-weight:700;color:#ffd27a}#ar-casa .ar-fila{display:flex;flex-direction:column;gap:8px}' +
        '@keyframes ar-entra{from{transform:translateY(12px);opacity:.55}to{transform:none;opacity:1}}#ar-casa .ar-caja{animation:ar-entra .32s ease}' +
        '#ar-casa button,#ar-casa a[rel="ar"]{width:100%;box-sizing:border-box;white-space:normal;text-align:center}' +
        '#ar-casa button{min-height:44px;padding:10px 16px;border-radius:999px;border:0;font:700 1rem/1.2 system-ui,sans-serif;cursor:pointer}' +
        '#ar-casa [data-ar="entrar"]{background:#f0a202;color:#1a1204}#ar-casa [data-ar="seguir"],#ar-casa [data-ar="ok"]{background:transparent;color:#f4f7f1;border:2px solid rgba(244,247,241,.45)}' +
        '#ar-casa button:focus{outline:none}#ar-casa button:focus-visible,#ar-casa a[rel="ar"]:focus-visible{outline:3px solid #ffd27a;outline-offset:2px}' +
        '#ar-casa a[rel="ar"]{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:6px 16px 6px 6px;border-radius:999px;background:#1c6e8c;color:#fff;text-decoration:none;font:700 1rem/1.2 system-ui,sans-serif}#ar-casa a[rel="ar"] img{width:52px;height:52px;border-radius:14px;object-fit:contain;object-position:center 20%;background:#f6efe0}' +
        '#ar-overlay{position:fixed;inset:0;z-index:5;pointer-events:none}#ar-dedos{position:absolute;inset:0;pointer-events:auto;touch-action:none}' +
        '#ar-salir,#ar-colocar,#ar-semilla{pointer-events:auto;position:fixed;z-index:6;min-height:44px;padding:10px 16px;border:0;border-radius:999px;color:#fff;font:700 1rem/1 system-ui,sans-serif}' +
        '#ar-salir{top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));background:#1d5e33}' +
        '#ar-colocar{top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));background:#245c4a}' +
        '#ar-semilla{bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);background:#f0a202;color:#1a1204}' +
        '@media (prefers-reduced-motion:reduce){#ar-casa,#ar-casa .ar-caja{animation:none}}';
      document.head.appendChild(s);
    }

    function ponerTexto(sel, texto) { const e = dlg && dlg.querySelector(sel); if (e) e.textContent = texto; }
    function repintar() {
      if (!dlg) return;
      ponerTexto('#ar-t', L('Vittata en tu casa', 'Vittata in your home'));
      ponerTexto('.ar-aviso', L('Pide a un adulto que te acompañe · mira a tu alrededor', 'Ask a grown-up to stay with you · look around you'));
      ponerTexto('[data-ar="priv"]', L('La cámara no se guarda ni se envía. No usamos dónde estás.', 'The camera is not saved or sent. We do not use where you are.'));
      ponerTexto('[data-ar="entrar"]', L('Ver a Vittata aquí', 'See Vittata here'));
      ponerTexto('[data-ar="casa"]', L('Ver en tu casa', 'See her at home'));
      ponerTexto('[data-ar="seguir"]', L('Seguir en el juego', 'Keep playing'));
    }
    function trasIdioma() { setTimeout(repintar, 0); }
    try {
      G.on('aula', k => { if (k === 'idioma') trasIdioma(); });
      if (G.idioma && G.idioma.poner && !G.idioma.poner._ar) {
        const orig = G.idioma.poner.bind(G.idioma);
        const puesta = l => { const p = orig(l); if (p && p.then) p.then(trasIdioma, trasIdioma); else trasIdioma(); return p; };
        puesta._ar = 1;
        G.idioma.poner = puesta;
      }
    } catch (e) { /* sin idioma */ }
    function quitarAviso() {
      if (dlg) { try { if (dlg.open) dlg.close(); } catch (e) { /* ya cerrado */ } dlg.remove(); dlg = null; }
    }

    function aviso() {
      estilo();
      if (dlg && document.contains(dlg)) return dlg;
      dlg = document.createElement('dialog'); dlg.id = 'ar-casa'; dlg.setAttribute('data-no-tr', ''); dlg.setAttribute('aria-labelledby', 'ar-t');
      dlg.innerHTML = '<div class="ar-caja"><h2 id="ar-t"></h2>' +
        '<p class="ar-aviso"></p><p data-ar="priv"></p>' +
        '<div class="ar-fila"><button type="button" data-ar="entrar"></button>' +
        '<a rel="ar" href="assets/ar/vittata.usdz"><img alt="" src="assets/ar/vittata_poster.jpg"><span data-ar="casa"></span></a>' +
        '<button type="button" data-ar="seguir"></button></div>' +
        '<p data-ar="msg" hidden></p></div>';
      repintar();
      dlg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.ar === 'seguir' || b.dataset.ar === 'ok') quitarAviso();
        else if (b.dataset.ar === 'entrar') entrar().catch(() => fallo(L('No se pudo abrir. Seguimos en el juego.', 'It could not open. We will keep playing.')));
      });
      dlg.addEventListener('cancel', () => quitarAviso());
      document.body.appendChild(dlg);
      return dlg;
    }

    function fallo(texto) {
      const p = dlg && dlg.querySelector('[data-ar="msg"]');
      const ir = dlg && dlg.querySelector('[data-ar="entrar"]');
      if (ir) ir.hidden = true;
      if (!p) return texto;
      p.hidden = false; p.textContent = texto;
      const ok = dlg.querySelector('[data-ar="seguir"]');
      if (ok) ok.textContent = L('Seguir en el juego', 'Keep playing');
      return texto;
    }

    async function soporta(xr) {
      const x = xr === undefined ? navigator.xr : xr;
      if (!x || !x.isSessionSupported) return false;
      try { return await x.isSessionSupported('immersive-ar'); } catch (e) { return false; }
    }

    async function entrar(xrForzado) {
      if (!(await soporta(xrForzado))) {
        if (iphone()) return fallo(L('Toca «Ver en tu casa». Si no se abre, seguimos en el juego.', 'Tap “See her at home”. If it does not open, we will keep playing.'));
        return fallo(L('Este aparato todavía no puede mostrar a Vittata en tu casa. Seguimos en el juego.', 'This device cannot show Vittata in your home yet. We will keep playing.'));
      }
      try { await sesionAR(); } catch (e) { return fallo(L('No se pudo abrir la cámara. Seguimos en el juego.', 'The camera could not open. We will keep playing.')); }
      return '';
    }

    function prepararEscena() {
      const canvas = document.createElement('canvas'); canvas.id = 'ar-lienzo';
      const R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      R.setSize(window.innerWidth, window.innerHeight);
      R.outputEncoding = THREE.sRGBEncoding;
      R.xr.enabled = true;
      try { R.xr.setReferenceSpaceType('local'); } catch (e) { /* el aparato elige */ }
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#fff4e0', '#1c3a28', 1.1));
      const sol = new THREE.DirectionalLight('#fff', 0.9); sol.position.set(0.4, 1, 0.2); scene.add(sol);
      const cam = new THREE.PerspectiveCamera(50, window.innerWidth / Math.max(1, window.innerHeight), 0.01, 30);
      grupo = new THREE.Group(); grupo.name = 'ar-vittata'; grupo.visible = false; scene.add(grupo);
      aro = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd27a, side: THREE.DoubleSide, transparent: true, opacity: 0.92, depthWrite: false }));
      aro.matrixAutoUpdate = false; aro.visible = false; scene.add(aro);
      return { R, scene, cam };
    }

    function poseDe(frame) {
      if (!hit || !frame || !renderer) return null;
      const lista = frame.getHitTestResults(hit);
      if (!lista.length) return null;
      const ref = renderer.xr.getReferenceSpace(); if (!ref) return null;
      const pose = lista[0].getPose(ref); if (!pose) return null;
      return pose.transform.matrix;
    }

    function colocar(matriz) {
      if (!grupo) return;
      const m = new THREE.Matrix4().fromArray(matriz);
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      grupo.position.copy(p); grupo.visible = true; baseY = p.y; puesta = true;
      if (aro) aro.visible = false;
    }

    function mirar(cam) {
      if (!grupo || !puesta || !cam || suya) return;
      const v = new THREE.Vector3(); cam.getWorldPosition(v);
      grupo.rotation.y = Math.atan2(v.x - grupo.position.x, v.z - grupo.position.z);
    }
    function recolocar() {
      puesta = false; suya = false; asustada = false;
      if (grupo) grupo.visible = false;
      if (aro) aro.visible = false;
    }
    function asegurarSemilla() {
      if (mallaSemilla || !escenaAR) return;
      mallaSemilla = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf0a202 }));
      mallaSemilla.name = 'ar-semilla'; mallaSemilla.visible = false; escenaAR.scene.add(mallaSemilla);
    }
    function lanzarDesdeCamara() {
      if (!puesta || !grupo || !renderer || !escenaAR) return;
      asegurarSemilla();
      const cam = renderer.xr.getCamera(escenaAR.cam);
      const o = new THREE.Vector3(); cam.getWorldPosition(o);
      const d = grupo.position.clone(); d.y = baseY + 0.12;
      semilla = nuevaSemilla(); semilla.o = o; semilla.d = d; mallaSemilla.visible = true;
      try { if (G.audio && !G.quiet) G.audio.play('lanzar'); } catch (e) { /* sin sonido */ }
    }
    function pasoSemilla(dt) {
      if (!semilla || !semilla.viva || !mallaSemilla) return;
      avanzarSemilla(semilla, dt);
      const k = Math.min(1, semilla.t / semilla.dur);
      mallaSemilla.position.lerpVectors(semilla.o, semilla.d, k);
      mallaSemilla.position.y += Math.sin(k * Math.PI) * 0.12;
      if (!semilla.atrapada) return;
      mallaSemilla.visible = false;
      if (ch) { if (ch.clips && ch.clips.Celebrate) ch.play('Celebrate', true); ch.wingMode = 'flap'; aleteoHasta = performance.now() + 700; }
      try { if (G.audio && !G.quiet) G.audio.play('semilla'); } catch (e) { /* sin sonido */ }
    }
    function pasoMiedo(cam) {
      if (!puesta || !grupo || !cam) return;
      const ojo = new THREE.Vector3(); cam.getWorldPosition(ojo);
      const dist = ojo.distanceTo(grupo.position);
      const m = miedoDe(dist, asustada);
      if (!m.asustada) { asustada = false; return; }
      if (!m.nuevo) return;
      asustada = true;
      const lejos = grupo.position.clone().sub(ojo); lejos.y = 0;
      if (lejos.lengthSq() < 1e-6) lejos.set(0, 0, 1);
      grupo.position.add(lejos.normalize().multiplyScalar(reducido() ? 0.02 : 0.08));
      baseY = grupo.position.y;
      if (ch) ch.wingMode = 'flap';
      aleteoHasta = performance.now() + 800;
      try { if (G.audio && !G.quiet) G.audio.play(m.sfx); } catch (e) { /* sin sonido */ }
    }

    function respirar(t) {
      if (!grupo || !puesta || reducido()) return;
      grupo.position.y = baseY + Math.sin(t * 0.002) * 0.004;
    }

    function tocar() {
      if (!ch) return;
      const g = GESTOS[gesto % GESTOS.length]; gesto++;
      if (g.clip) ch.play(g.clip, true);
      ch.wingMode = g.alas || 'idle';
      if (g.alas) aleteoHasta = performance.now() + 1200;
      try { if (G.audio && !G.quiet) G.audio.play(g.sfx); } catch (e) { /* sin sonido */ }
    }

    function enEllas(cam) {
      if (!grupo || !puesta || !cam) return false;
      const ray = new THREE.Raycaster();
      const o = new THREE.Vector3(), d = new THREE.Vector3(0, 0, -1);
      cam.getWorldPosition(o); d.applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
      ray.set(o, d.normalize());
      const box = new THREE.Box3().setFromObject(grupo);
      return ray.ray.intersectsBox(box);
    }

    async function sesionAR() {
      const xr = navigator.xr;
      overlay = document.createElement('div'); overlay.id = 'ar-overlay';
      overlay.innerHTML = '<div id="ar-dedos"></div><button type="button" id="ar-salir">' + L('Salir', 'Exit') + '</button>' +
        '<button type="button" id="ar-colocar">' + L('Colocar', 'Place') + '</button>' +
        '<button type="button" id="ar-semilla">' + L('Semilla', 'Seed') + '</button>';
      document.body.appendChild(overlay);
      const opts = { requiredFeatures: ['hit-test'], optionalFeatures: ['local-floor', 'dom-overlay'] };
      opts.domOverlay = { root: overlay };
      sesion = await xr.requestSession('immersive-ar', opts);
      const escena = prepararEscena(); renderer = escena.R; escenaAR = escena;
      document.body.appendChild(escena.R.domElement);
      await renderer.xr.setSession(sesion);
      const visor = await sesion.requestReferenceSpace('viewer');
      hit = await sesion.requestHitTestSource({ space: visor });
      ch = await window.AVCharacter.create();
      ch.root.scale.setScalar(escalaDe(ch.height));
      Object.assign(ch, { speed: 0, gait: 0, airborne: false, flying: false, legsDown: 1, wingMode: 'idle', swimming: false, expression: 'happy', lookAt: null, emote: null, posado: '', agachada: 0 });
      if (ch.clips && ch.clips.Idle) ch.play('Idle');
      grupo.add(ch.root);
      const alSelect = () => {
        if (performance.now() - gestoHecho < 400) return;
        const cam = renderer.xr.getCamera(escena.cam);
        if (puesta && enEllas(cam)) { tocar(); return; }
        if (!aro || !aro.visible) return;
        suya = false; colocar(aro.matrix.elements);
      };
      sesion.addEventListener('select', alSelect);
      const dedos = overlay.querySelector('#ar-dedos');
      const pts = new Map();
      let movido = 0, angPrev = null;
      dedos.addEventListener('pointerdown', e => { try { dedos.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ } pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) movido = 0; });
      dedos.addEventListener('pointermove', e => {
        const p = pts.get(e.pointerId); if (!p || !puesta) return;
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        if (pts.size === 1) { movido += Math.hypot(dx, dy); llevarEn(grupo, dx, dy, grupo.rotation.y); baseY = grupo.position.y; suya = true; }
        else {
          const otro = [...pts.entries()].find(([id]) => id !== e.pointerId);
          if (otro) {
            const ang = Math.atan2(e.clientY - otro[1].y, e.clientX - otro[1].x);
            if (angPrev != null) { let d = ang - angPrev; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; grupo.rotation.y = girarEn(grupo.rotation.y, d); suya = true; }
            angPrev = ang;
          }
        }
        p.x = e.clientX; p.y = e.clientY;
      });
      dedos.addEventListener('pointerup', e => {
        pts.delete(e.pointerId);
        if (pts.size < 2) angPrev = null;
        if (pts.size === 0 && movido < 14 && puesta) {
          gestoHecho = performance.now();
          const cam = renderer.xr.getCamera(escena.cam);
          if (enEllas(cam)) tocar(); else lanzarDesdeCamara();
        }
      });
      overlay.querySelector('#ar-salir').addEventListener('click', () => { try { sesion.end(); } catch (e) { limpiar(); } });
      overlay.querySelector('#ar-colocar').addEventListener('click', () => recolocar());
      overlay.querySelector('#ar-semilla').addEventListener('click', () => lanzarDesdeCamara());
      sesion.addEventListener('end', limpiar);
      quitarAviso();
      renderer.setAnimationLoop((t, frame) => {
        const mat = poseDe(frame);
        if (mat && !puesta && aro) { aro.visible = true; aro.matrix.fromArray(mat); }
        const cam = renderer.xr.getCamera(escena.cam);
        if (ch && performance.now() > aleteoHasta) ch.wingMode = 'idle';
        try { if (ch && ch.update) ch.update(1 / 60); } catch (e) { if (ch && ch.mixer) ch.mixer.update(1 / 60); }
        respirar(t); mirar(cam); pasoSemilla(1 / 60); pasoMiedo(cam);
        renderer.render(escena.scene, escena.cam);
      });
    }

    function limpiar() {
      try { if (renderer) renderer.setAnimationLoop(null); } catch (e) { /* ya parado */ }
      try { if (hit && hit.cancel) hit.cancel(); } catch (e) { /* nada */ }
      hit = null; sesion = null; puesta = false; ch = null; semilla = null; suya = false; asustada = false; escenaAR = null;
      if (mallaSemilla) { if (mallaSemilla.parent) mallaSemilla.parent.remove(mallaSemilla); mallaSemilla = null; }
      if (renderer) { const c = renderer.domElement; try { renderer.dispose(); } catch (e) { /* contexto */ } if (c && c.parentNode) c.remove(); renderer = null; }
      if (overlay) { overlay.remove(); overlay = null; }
      grupo = null; aro = null;
    }

    function abrir() {
      if (!bandera()) return null;
      const d = aviso();
      try { if (!d.open) d.showModal(); } catch (e) { /* sin diálogo: se queda en el documento */ }
      try { if (G.audio && !G.quiet) G.audio.play('aleteo'); } catch (e) { /* sin sonido */ }
      return d;
    }

    async function retrato() {
      if (!window.AVCharacter || !window.THREE) return null;
      const escena = prepararEscena();
      const R = escena.R; R.setSize(640, 480); R.xr.enabled = false;
      escena.cam.position.set(0, 0.22, 0.7); escena.cam.lookAt(0, 0.12, 0);
      aro.matrixAutoUpdate = true; aro.visible = true; aro.position.set(0, 0, 0); aro.rotation.set(0, 0, 0);
      const modelo = await window.AVCharacter.create();
      modelo.root.scale.setScalar(escalaDe(modelo.height));
      Object.assign(modelo, { speed: 0, gait: 0, airborne: false, flying: false, legsDown: 1, wingMode: 'idle', swimming: false, expression: 'happy', lookAt: null, emote: null, posado: '', agachada: 0 });
      if (modelo.clips && modelo.clips.Idle) modelo.play('Idle');
      grupo.add(modelo.root); grupo.visible = true; grupo.position.set(0, 0, 0); baseY = 0; puesta = true;
      try { modelo.update(1 / 60); } catch (e) { if (modelo.mixer) modelo.mixer.update(1 / 60); }
      mirar(escena.cam);
      R.render(escena.scene, escena.cam);
      const url = R.domElement.toDataURL('image/png');
      try { R.dispose(); } catch (e) { /* contexto */ }
      grupo = null; aro = null; puesta = false;
      return url;
    }

    async function test() {
      const res = [], check = (n, ok, info) => res.push({ name: n, ok: !!ok, info: info == null ? '' : String(info) });
      const antes = dlg;
      try {
        if (!bandera()) check('Sin la bandera no aparece nada', !$('ar-casa'));
        const d = aviso();
        try { if (!d.open) d.showModal(); } catch (e) { /* headless */ }
        const txt = d.textContent || '';
        check('El aviso pide un adulto y mirar alrededor', txt.indexOf('Pide a un adulto que te acompañe') >= 0 && txt.indexOf('mira a tu alrededor') >= 0, txt.slice(0, 80));
        check('El aviso no está dentro de la portada', !d.closest('#title'));
        check('La cámara no se guarda ni se envía, y no hay ubicación', privacidad.ubicacion === false && privacidad.subeCamara === false && privacidad.guardaFoto === false && !/geolocation|getCurrentPosition/.test(entrar.toString() + sesionAR.toString()));
        check('Vittata queda a 30 cm', Math.abs(escalaDe(1) - 0.3) < 1e-9 && Math.abs(escalaDe(1.2) * 1.2 - 0.3) < 1e-9);
        check('Los gestos son saludar, celebrar y aletear, con sfx de Suno', GESTOS.map(g => g.id).join(',') === 'saluda,celebra,aletea' && GESTOS.every(g => G.audio && G.audio.has && G.audio.has(g.sfx)), GESTOS.map(g => g.sfx).join(','));
        const enlace = d.querySelector('a[rel="ar"]');
        check('«Ver en tu casa» es un enlace rel=ar y no está en la portada', !!enlace && enlace.getAttribute('href') === 'assets/ar/vittata.usdz' && enlace.textContent.indexOf('Ver en tu casa') >= 0 && !enlace.closest('#title'));
        const archivo = await fetch('assets/ar/vittata.usdz');
        const bytes = new Uint8Array(await archivo.arrayBuffer());
        check('El USDZ pesa 5 MB como mucho y es un zip', archivo.ok && bytes.length > 32 && bytes.length <= 5 * 1024 * 1024 && bytes[0] === 0x50 && bytes[1] === 0x4b, bytes.length);
        const msg = await entrar(null);
        check('Sin soporte: un mensaje amable y se vuelve al juego', /Seguimos en el juego/.test(msg) && !document.getElementById('ar-overlay'), msg);
        check('Sin soporte no guarda la cámara', !localStorage.getItem('amazonaverse.ar') && !localStorage.getItem('amazonaverse.ar.foto'));
        check('El aviso no lo parte el diccionario', d.getAttribute('data-no-tr') === '');
        if (G.idioma && G.idioma.poner) {
          const idi = G.idioma.actual ? G.idioma.actual() : 'es';
          await G.idioma.poner('en'); repintar();
          const enTxt = d.textContent || '';
          check('En inglés el aviso está entero', enTxt.indexOf('Ask a grown-up to stay with you') >= 0 && enTxt.indexOf('See Vittata here') >= 0 && enTxt.indexOf('See her at home') >= 0 && !/Continue en|un adult /.test(enTxt), enTxt.slice(0, 160));
          await G.idioma.poner(idi || 'es'); repintar();
        }
        const seguir = d.querySelector('[data-ar="seguir"]'); if (seguir) seguir.click();
        check('Cerrar el aviso lo quita', !$('ar-casa'));
        check('Hay botón Salir en la capa de la sesión', /id="ar-salir"/.test(sesionAR.toString()) && sesionAR.toString().indexOf('Salir') >= 0);
        const llevada = llevarEn({ position: { x: 0, y: 0, z: 0 } }, 100, 0, 0);
        check('Un dedo la lleva por el suelo', Math.abs(llevada.x - 0.2) < 1e-6 && llevada.z === 0, llevada.x);
        check('Dos dedos la giran', Math.abs(girarEn(0, Math.PI / 2) - Math.PI / 2) < 1e-6);
        const antesPuesta = puesta; recolocar();
        check('Se puede volver a colocar', puesta === false); puesta = antesPuesta;
        const miedo = miedoDe(0.2, false);
        check('Si el niño se acerca, se asusta con un sfx de Suno', miedo.nuevo === true && miedo.sfx === 'aviso' && G.audio.has('aviso') && miedoDe(1, true).asustada === false);
        const sem = avanzarSemilla(nuevaSemilla(), 0.6);
        check('Una semilla lanzada se atrapa con sfx de Suno', sem.atrapada && sem.sfx === 'semilla' && G.audio.has('semilla') && G.audio.has('lanzar'));
        check('La sesión ofrece Colocar y Semilla', sesionAR.toString().indexOf('ar-colocar') >= 0 && sesionAR.toString().indexOf('ar-semilla') >= 0);
      } catch (e) {
        check('Sin excepciones', false, e && e.message);
      } finally {
        quitarAviso();
        if (antes && bandera()) abrir();
      }
      return { passed: res.filter(r => r.ok).length, total: res.length, results: res, iphone: 'usdz' };
    }

    const api = { abrir, entrar, salir: () => { try { if (sesion) sesion.end(); } catch (e) { limpiar(); } quitarAviso(); }, test, retrato, escalaDe, GESTOS, privacidad, bandera, usdz, ALTO };
    G.ar = api;
    return api;
  };
})();
