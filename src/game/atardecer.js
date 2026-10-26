/* Juego · atardecer (C9: el coquí canta al atardecer)
   Feedback real: los coquíes (Eleutherodactylus coqui) son nocturnos y cantan del atardecer al amanecer (USGS NAS, ficha de la
   especie: «These treefrogs are nocturnal insectivores»; el horario exacto «del atardecer al amanecer» queda por verificar con DRNA).
   La misión 3 «Co-quí» se jugaba a pleno sol porque el cielo del juego siempre es de día. Desde aquí, cuando empieza el coro
   (S.chorus) el mundo pasa en unos 8 s a atardecer y vuelve el día al terminar la misión del coquí (S.missions.m3; decisión de
   Kelvin, docs/DECISION_LOG.md, 26-oct).

   Cómo funciona (sin tocar renderer.js, clima.js ni look.js):
   - Un gancho de render con prioridad 95 (después del clima, que escribe en 'update' 45, y del look, que escribe en 'render' 90)
     funde cada valor de luz y cielo hacia su versión de atardecer: uCenit, uHorizonte y uSolCol del cielo vivo, la luz
     hemisférica y el sol (color e intensidad), la niebla (color sRGB y lineal de R.niebla), el agua y la exposición, y baja el
     sol (sunDir se comparte con el cielo, las nubes, las sombras y los rayos).
   - Cada valor lleva su «base» de día: si otro módulo lo reescribe (el clima en una transición, el look cada 90 cuadros), el valor
     deja de coincidir con el último que escribimos y la base se actualiza. Así el aguacero, la neblina y vibrant_toon mandan
     sobre el día y el atardecer se funde encima. Las paradas naranjas se escalan por la luminancia de la base: con lluvia o
     neblina el atardecer sale gris y apagado, no naranja chillón.
   - La hora: S.hora sube de 17,4 a 18,75 con el fundido; musica.js la lee y pasa de aves a coquíes y grillos (sin S.hora sigue
     siendo mediodía). Al volver al día S.hora se quita.
   - Luciérnagas: un THREE.Points alrededor de los arbustos de M3 (60 puntos; 24 en calidad «bajo»), parpadeo por color de vértice,
     mezcla aditiva, un solo draw call y solo mientras hay atardecer y la cámara está cerca.
   - Guardado: no guarda nada propio; al recargar, misiones.js carga este módulo si S.chorus y el estado se deduce de la partida.
   - En las baterías (G.quiet) queda apagado, salvo forzar(true). ?atardecer=1 lo fuerza al instante (capturas, Kelvin).
   API: G.atardecer = { activo(), k(), deseado(), forzar(true|false|null), avanzar(seg), estado(), test() }. Prueba: AV.atardecerTest(). */
(function () {
  'use strict';
  window.AVAtardecer = function (G) {
    if (G.atardecer) return G.atardecer;
    const S = G.S, R = G.renderer, scene = R.scene;
    const DUR = 8; // segundos del fundido (ida y vuelta)
    const HORA = [17.4, 18.75]; // de día pleno a casi noche: musica.js mezcla aves → coquíes entre 17:30 y 19:00
    const lin = h => new THREE.Color(h).convertSRGBToLinear();
    const lum = c => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
    // Paleta del atardecer (lineal). peso: cuánto se acerca cada valor a su color de atardecer con k = 1.
    const P = {
      cenit: { col: lin('#3a4c8e'), peso: 0.72 }, horizonte: { col: lin('#ff9a4a'), peso: 0.88 }, solCol: { col: lin('#ff7a2e'), peso: 0.9 },
      hemiCielo: { col: lin('#ffb27a'), peso: 0.7 }, hemiSuelo: { col: lin('#3a2a26'), peso: 0.55 }, sol: { col: lin('#ffa050'), peso: 0.85 },
      niebla: { col: new THREE.Color('#e9a878'), peso: 0.7 }, // sRGB: R.niebla.srgb; su lineal se deriva
      aguaSol: { col: lin('#ffa050'), peso: 0.85 },
    };
    const ESC = { solInt: 0.72, hemiInt: 0.78, exposicion: 0.93, solAltura: 0.16 }; // × la base; solAltura: seno de la altura del sol al final

    let forzado = null, k = 0, enMarcha = false, horaPuesta = false;
    const deseado = () => (forzado != null ? !!forzado : !G.quiet && !!S.chorus && !(S.missions && S.missions.m3) && !S.complete); // Kelvin: el día vuelve al terminar M3
    const skyU = R.sky ? R.sky.material.uniforms : null, aguaU = G.agua && G.agua.uniforms, fog = scene.fog;

    // ---------- Ranuras: cada valor con su base de día y lo último que escribimos ----------
    const ranuras = [];
    function color(obj, prop, pal, opts) {
      if (!obj || !obj[prop] || !obj[prop].isColor) return;
      ranuras.push(Object.assign({ tipo: 'color', obj, prop, pal, base: new THREE.Color(), ult: null, tmp: new THREE.Color() }, opts || {}));
    }
    function numero(obj, prop, esc) {
      if (!obj || typeof obj[prop] !== 'number') return;
      ranuras.push({ tipo: 'num', obj, prop, esc, base: 0, ult: null });
    }
    if (skyU) { color(skyU.uCenit, 'value', P.cenit, { lumRef: lum(skyU.uCenit.value) }); color(skyU.uHorizonte, 'value', P.horizonte, { lumRef: lum(skyU.uHorizonte.value) }); color(skyU.uSolCol, 'value', P.solCol, { lumRef: lum(skyU.uSolCol.value) }); }
    color(R.hemi, 'color', P.hemiCielo); color(R.hemi, 'groundColor', P.hemiSuelo); color(R.sun, 'color', P.sol);
    numero(R.sun, 'intensity', ESC.solInt); numero(R.hemi, 'intensity', ESC.hemiInt); numero(R.renderer, 'toneMappingExposure', ESC.exposicion);
    if (R.niebla) { color(R.niebla, 'srgb', P.niebla, { lumRef: lum(R.niebla.srgb) }); color(R.niebla, 'lin', { col: P.niebla.col.clone().convertSRGBToLinear(), peso: P.niebla.peso }, { lumRef: lum(R.niebla.lin) }); }
    if (fog && fog.color && !R.ATMOS) color(fog, 'color', P.niebla, { lumRef: lum(fog.color) }); // con niebla atmosférica, fog.color se copia de R.niebla (como hacen renderer.js y clima.js)
    if (aguaU) { color(aguaU.uCielo, 'value', P.cenit, { lumRef: aguaU.uCielo ? lum(aguaU.uCielo.value) : 1 }); color(aguaU.uHorizonte, 'value', P.horizonte, { lumRef: aguaU.uHorizonte ? lum(aguaU.uHorizonte.value) : 1 }); color(aguaU.uHemiCielo, 'value', P.hemiCielo); color(aguaU.uSolCol, 'value', P.aguaSol); }
    // El sol: sunDir es el mismo Vector3 que usan el cielo (uSolDir), las nubes, las sombras y los rayos; se baja en sitio
    const solDir = R.sunDir, solBase = solDir ? solDir.clone() : null, solUlt = new THREE.Vector3(), solAz = solBase ? Math.atan2(solBase.x, solBase.z) : 0;
    const solAltBase = solBase ? Math.asin(Math.max(-1, Math.min(1, solBase.y))) : 0, solAltFin = Math.asin(ESC.solAltura);
    let solEscrito = false;

    function escribir(k) {
      for (const r of ranuras) {
        const v = r.obj[r.prop];
        if (r.tipo === 'color') {
          if (!r.ult || !v.equals(r.ult)) { r.base.copy(v); r.ult = r.ult || new THREE.Color(); } // otro módulo lo escribió (o primera vez): base nueva
          r.tmp.copy(r.pal.col);
          if (r.lumRef) { const f = Math.min(1, lum(r.base) / Math.max(1e-4, r.lumRef)); r.tmp.multiplyScalar(f); } // con lluvia o neblina, apagado
          v.copy(r.base).lerp(r.tmp, r.pal.peso * k); r.ult.copy(v);
        } else {
          if (r.ult == null || v !== r.ult) r.base = v;
          const nv = r.base * (1 + (r.esc - 1) * k); r.obj[r.prop] = nv; r.ult = nv;
        }
      }
      if (solDir) {
        if (!solEscrito || !solDir.equals(solUlt)) { solBase.copy(solDir); }
        const alt = solAltBase + (solAltFin - solAltBase) * k, c = Math.cos(alt);
        solDir.set(Math.sin(solAz) * c, Math.sin(alt), Math.cos(solAz) * c).normalize(); solUlt.copy(solDir); solEscrito = true;
      }
      if (R.ATMOS && fog && R.niebla) fog.color.copy(R.post && R.post.activo ? R.niebla.lin : R.niebla.srgb);
    }
    function restaurar() {
      for (const r of ranuras) {
        const v = r.obj[r.prop];
        if (r.tipo === 'color') { if (r.ult && v.equals(r.ult)) v.copy(r.base); r.ult = null; }
        else { if (r.ult != null && v === r.ult) r.obj[r.prop] = r.base; r.ult = null; }
      }
      if (solDir && solEscrito) { if (solDir.equals(solUlt)) solDir.copy(solBase); solEscrito = false; }
      if (R.ATMOS && fog && R.niebla) fog.color.copy(R.post && R.post.activo ? R.niebla.lin : R.niebla.srgb);
      if (horaPuesta) { delete S.hora; horaPuesta = false; }
    }

    // ---------- Luciérnagas ----------
    let luc = null;
    function luciernagas() {
      if (luc) return luc;
      const nivel = R.calidad && R.calidad.nivel, N = nivel === 'bajo' ? 24 : 60;
      const bushes = (G.c && G.c.BUSHES) || G.pack.coquies || [];
      if (!bushes.length) return null;
      const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), H = G.terreno.height;
      const base = new THREE.Color('#d8ff6a').convertSRGBToLinear(), fase = new Float32Array(N), vel = new Float32Array(N), ori = new Float32Array(N * 3);
      let cx = 0, cz = 0;
      for (let i = 0; i < N; i++) {
        const b = bushes[i % bushes.length], a = Math.random() * Math.PI * 2, d = 1.5 + Math.random() * 6;
        const x = b.x + Math.cos(a) * d, z = b.z + Math.sin(a) * d, y = H(x, z) + 0.4 + Math.random() * 2.2;
        pos[i * 3] = ori[i * 3] = x; pos[i * 3 + 1] = ori[i * 3 + 1] = y; pos[i * 3 + 2] = ori[i * 3 + 2] = z;
        fase[i] = Math.random() * Math.PI * 2; vel[i] = 0.6 + Math.random() * 1.2;
      }
      for (const b of bushes) { cx += b.x / bushes.length; cz += b.z / bushes.length; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      // punto suave en un lienzo de 32 px (sin depender de fx.js)
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const x2 = c.getContext('2d'), gr = x2.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x2.fillStyle = gr; x2.fillRect(0, 0, 32, 32);
      const m = new THREE.PointsMaterial({ size: 0.28, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: true });
      const p = new THREE.Points(g, m); p.name = 'luciernagas'; p.frustumCulled = false; p.visible = false; p.renderOrder = 5; p.userData.sinCulling = true;
      R.linMat(m); scene.add(p);
      luc = { p, N, base, fase, vel, ori, col, pos, cx, cz, tiempo: 0 };
      return luc;
    }
    function moverLuciernagas(dt) {
      const L = luciernagas(); if (!L) return;
      const cam = R.camera.position, cerca = Math.hypot(cam.x - L.cx, cam.z - L.cz) < 140;
      const ver = k > 0.05 && cerca;
      L.p.visible = ver; if (!ver) return;
      L.tiempo += dt;
      const t = L.tiempo, fuerza = Math.min(1, (k - 0.05) / 0.5);
      for (let i = 0; i < L.N; i++) {
        const s = Math.sin(t * L.vel[i] + L.fase[i]), b = s > 0 ? s * s * s * fuerza : 0;
        L.col[i * 3] = L.base.r * b; L.col[i * 3 + 1] = L.base.g * b; L.col[i * 3 + 2] = L.base.b * b;
        L.pos[i * 3] = L.ori[i * 3] + Math.sin(t * 0.37 + L.fase[i]) * 0.6;
        L.pos[i * 3 + 1] = L.ori[i * 3 + 1] + Math.sin(t * 0.53 + L.fase[i] * 1.7) * 0.35;
        L.pos[i * 3 + 2] = L.ori[i * 3 + 2] + Math.cos(t * 0.41 + L.fase[i]) * 0.6;
      }
      L.p.geometry.attributes.color.needsUpdate = true; L.p.geometry.attributes.position.needsUpdate = true;
    }

    // ---------- Bucle ----------
    // Apagado del todo no cuesta nada; encendido escribe cada cuadro (el clima y el look reescriben sus valores cuando quieren)
    function paso(dt) {
      const obj = deseado() ? 1 : 0;
      if (k === 0 && obj === 0 && !enMarcha) return;
      enMarcha = true;
      if (obj > k) k = Math.min(1, k + dt / DUR); else if (obj < k) k = Math.max(0, k - dt / DUR);
      const s = k * k * (3 - 2 * k); // curva suave para los colores; k se guarda lineal
      if (k > 0) { escribir(s); S.hora = HORA[0] + (HORA[1] - HORA[0]) * s; horaPuesta = true; moverLuciernagas(dt); }
      else { restaurar(); if (luc) luc.p.visible = false; enMarcha = false; }
    }
    G.on('render', dt => { paso(Number.isFinite(dt) ? Math.min(0.1, dt) : 0.016); }, 95);
    G.on('calidad', () => { if (luc) { scene.remove(luc.p); luc.p.geometry.dispose(); luc.p.material.map.dispose(); luc.p.material.dispose(); luc = null; } }); // se rehacen con el presupuesto nuevo
    G.on('apply', () => { if (!deseado() && k > 0) { k = 0; restaurar(); enMarcha = false; } }, 95); // cargar otra partida: el estado se deduce de ella
    function avanzar(seg) { let t = Math.max(0, seg || 0); while (t > 0) { const dt = Math.min(0.05, t); t -= dt; paso(dt); } return k; }
    function forzar(v) { forzado = v == null ? null : !!v; return deseado(); }
    const estado = () => ({ activo: k > 0, k, deseado: deseado(), forzado, hora: S.hora, luciernagas: !!(luc && luc.p.visible), solY: solDir ? solDir.y : null });

    // ?atardecer=1: al instante (capturas y pruebas a mano); ?atardecer=0 lo apaga aunque la partida lo pida
    const url = new URLSearchParams(location.search).get('atardecer');
    if (url === '1' || url === 'si') { forzar(true); avanzar(DUR + 1); } else if (url === '0' || url === 'no') forzar(false);

    // ---------- Prueba ----------
    async function test() {
      const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const errores0 = (window.__aveErrores || []).length, forz0 = forzado, quiet0 = G.quiet, chorus0 = S.chorus, hora0 = S.hora, complete0 = S.complete, tieneComplete = 'complete' in S;
      const sky = skyU, ref = sky ? { h: sky.uHorizonte.value.clone(), c: sky.uCenit.value.clone(), s: sky.uSolCol.value.clone() } : null;
      const sol0 = R.sun.intensity, hemi0 = R.hemi.intensity, exp0 = R.renderer.toneMappingExposure, solY0 = solDir ? solDir.y : 0;
      const clima = G.clima, climaEst = clima && clima.F ? clima.F.estado : null;
      try {
        forzar(null); G.quiet = true; S.chorus = true; S.complete = false;
        const m3T = S.missions ? S.missions.m3 : undefined; if (S.missions) S.missions.m3 = false; // las baterías ya terminaron M3: aquí se prueba el coro en marcha
        check('En las baterías (G.quiet) no se enciende solo aunque el coro esté en marcha', !deseado());
        G.quiet = false;
        check('Con el coro en marcha (S.chorus) y el capítulo sin terminar, pide atardecer', deseado());
        { const nuevo = !S.missions, ms = S.missions || (S.missions = {}), m30 = ms.m3; ms.m3 = true; check('Al terminar la misión del coquí (M3) vuelve el día', !deseado()); if (nuevo) delete S.missions; else if (m30 === undefined) delete ms.m3; else ms.m3 = m30; }
        S.complete = true; check('Al terminar el capítulo vuelve el día', !deseado()); if (tieneComplete) S.complete = complete0; else delete S.complete;
        G.quiet = quiet0; S.chorus = chorus0; if (S.missions) { if (m3T === undefined) delete S.missions.m3; else S.missions.m3 = m3T; }
        forzar(true); const k1 = avanzar(DUR + 1);
        check('El fundido llega a 1 en ' + DUR + ' s', k1 === 1, k1);
        if (sky) {
          const h = sky.uHorizonte.value, c = sky.uCenit.value, s = sky.uSolCol.value;
          check('El horizonte se pone naranja (más rojo que azul) y el cenit se oscurece', h.r > h.b * 1.8 && h.r > ref.h.r * 0.9 && lum(c) < lum(ref.c) * 0.8, `h ${h.getHexString()} · c ${c.getHexString()}`);
          check('El sol del cielo se pone naranja', s.r > s.g && s.g > s.b, s.getHexString());
        }
        check('El sol baja y la luz es más baja y cálida', (!solDir || solDir.y < solY0 - 0.2) && R.sun.intensity < sol0 && R.hemi.intensity < hemi0 && R.sun.color.r > R.sun.color.b,
          `solY ${solY0.toFixed(2)} → ${solDir ? solDir.y.toFixed(2) : '-'} · sol ${sol0.toFixed(2)} → ${R.sun.intensity.toFixed(2)}`);
        check('La exposición no cae más de un 10 % (que el móvil no quede oscuro)', R.renderer.toneMappingExposure >= exp0 * 0.9);
        check('S.hora queda en el atardecer, casi de noche (18,75)', Math.abs((S.hora || 0) - HORA[1]) < 0.01, S.hora);
        if (G.musicaApi) { const a = G.musicaApi.calcularAmbiente({ hora: S.hora }); check('El ambiente suena a coquíes y grillos, casi sin aves', a.coquies > 0.85 && a.grillos > 0.5 && a.aves < 0.15, `coquíes ${a.coquies.toFixed(2)} · aves ${a.aves.toFixed(2)}`); }
        else check('Sin musica.js cargado: la hora (18,75) ya está lista para él', true);
        // Luciérnagas: cerca de los arbustos, un solo objeto y pocos puntos
        const cam = R.camera.position.clone(), L = luciernagas();
        if (L) { R.camera.position.set(L.cx, G.terreno.height(L.cx, L.cz) + 3, L.cz); moverLuciernagas(0.05); }
        check('Luciérnagas: un Points visible cerca de los arbustos, ≤ 60 puntos (24 en «bajo»)', L && L.p.visible && L.N <= (R.calidad.nivel === 'bajo' ? 24 : 60),
          L ? `${L.N} puntos · visible ${L.p.visible} · k ${k} · cám ${[R.camera.position.x, R.camera.position.z].map(v => v.toFixed(1))} · centro ${L.cx.toFixed(1)},${L.cz.toFixed(1)} · calidad ${R.calidad.nivel}` : 'sin arbustos');
        if (L) { R.camera.position.set(L.cx + 500, 50, L.cz + 500); moverLuciernagas(0.05); check('Lejos de los arbustos se apagan', !L.p.visible); R.camera.position.copy(cam); }
        // Con el clima: en aguacero el atardecer sale apagado (sigue la luz del clima)
        if (clima && clima.fijar && sky) {
          const solAt = sky.uSolCol.value.clone();
          const ok = clima.fijar('aguacero', { inmediato: true, forzar: true });
          if (ok) paso(0.05);
          check('Con aguacero el sol del cielo queda más apagado que en el atardecer con sol (el clima manda sobre la base)', !ok || lum(sky.uSolCol.value) < lum(solAt) * 0.7, `${lum(solAt).toFixed(3)} → ${lum(sky.uSolCol.value).toFixed(3)}`);
          clima.fijar(null); clima.fijar('sol', { inmediato: true, forzar: true }); clima.fijar(null); paso(0.05);
        }
        // Vuelta al día: todo exactamente como estaba
        forzar(false); const k0 = avanzar(DUR + 1);
        const igual = sky ? sky.uHorizonte.value.equals(ref.h) && sky.uCenit.value.equals(ref.c) && sky.uSolCol.value.equals(ref.s) : true;
        check('Al apagarlo vuelve el día exacto: cielo, luces, exposición y sol como antes, sin S.hora', k0 === 0 && igual && R.sun.intensity === sol0 && R.hemi.intensity === hemi0 && R.renderer.toneMappingExposure === exp0 && (!solDir || Math.abs(solDir.y - solY0) < 1e-6) && S.hora === undefined,
          `sol ${R.sun.intensity} · hemi ${R.hemi.intensity} · hora ${S.hora}`);
        check('Apagado, el gancho no escribe nada (ninguna ranura con valor propio)', ranuras.every(r => r.ult == null) && !solEscrito);
        check('Ningún error de JavaScript', (window.__aveErrores || []).length === errores0);
      } catch (e) {
        check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e);
      } finally {
        forzado = forz0; G.quiet = quiet0; S.chorus = chorus0; if (tieneComplete) S.complete = complete0; else delete S.complete; if (hora0 === undefined) delete S.hora; else S.hora = hora0;
        if (clima && climaEst && clima.F && clima.F.estado !== climaEst) { clima.fijar(climaEst, { inmediato: true, forzar: true }); clima.fijar(null); }
        if (!deseado() && k > 0) { k = 0; restaurar(); enMarcha = false; }
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = G.atardecer = { activo: () => k > 0, k: () => k, deseado, forzar, avanzar, estado, test, DUR };
    return api;
  };
})();
