/* Episodio 5 · luces de la noche (decoración; no toca la misión). Kelvin 2-nov: «quiero misterio, pero que el jugador pueda
   orientarse». Sin luces reales (no cambia ningún shader del mundo ni las sombras), en tres llamadas de dibujo:
   - Faroles: un punto cálido con halo en cada sitio del capítulo (taller y transmisor, las cinco alturas de la cadena, las cinco
     ruinas, la niebla y el Guardián en la Puerta del Yunque) y un charco de luz en el suelo debajo. La ruina ya leída baja su
     farol; la estación puesta lo sube (la cadena de luz se ve encendida).
   - Cucubanos: puntitos verdes que se encienden y se apagan, espaciados a lo largo de los caminos entre el taller y cada sitio.
   Todo se mueve en el vertex shader (uTime), sin trabajo de CPU por cuadro. Solo con la noche del look (mundo.cielo.permiso).
   - Estrellas: un domo de puntos que sigue a la cámara (más densas hacia el cenit, titilan suave salvo con reduced motion).
   Estado: G.c.ep5noche = { faroles, cucubanos, estrellas, llamadas }. */
(function () {
  'use strict';
  AVE.registerPack({ id: 'ep5', preparar(G) {
    const W = G.pack.mundo || {}, D = window.AV_EP5 || {}, sc = G.renderer.scene, H = G.terreno.height;
    if (!(W.cielo && W.cielo.permiso === 'noche') || !D.taller || !D.estaciones) return;
    const S = G.S, X = D.sitiosNoche || {};
    const agua = (x, z) => { const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity; return isFinite(w) && w > H(x, z) - 0.2; };
    const col = c => { const k = new THREE.Color(c); return [k.r, k.g, k.b]; };
    const CALIDO = col('#ffb45a'), DORADO = col('#ffd27a'), CUCUBANO = col('#b8ff5c');
    // ---------- Sitios: [x, z, alto del farol, color, tamaño del halo (m), clave del estado] ----------
    const sitios = [];
    const poner = (p, alto, c, tam, clave) => { if (!p || sitios.some(s => Math.hypot(s[0] - p.x, s[1] - p.z) < 1.5)) return; sitios.push([p.x, p.z, alto, c, tam, clave || '']); };
    if (X.trx) poner(X.trx, 1.7, CALIDO, 3.2);
    for (const e of D.estaciones) poner(e, 3.0, CALIDO, 3.4, 'est_' + e.id);
    for (const r of D.ruinas || []) poner(r, 3.0, CALIDO, 3.4, 'cls_' + r.id);
    poner(D.niebla, 3.4, DORADO, 6.5);
    if (X.guardian) poner({ x: X.guardian.x + 1.6, z: X.guardian.z + 0.4 }, 2.6, CALIDO, 3.6);
    // ---------- Caminos: del taller a cada sitio y la cadena en orden (taller → loma → torre → mirador → niebla) ----------
    const est = id => D.estaciones.find(e => e.id === id), rui = id => (D.ruinas || []).find(r => r.id === id);
    const tramos = [[X.inicio, D.taller], [D.taller, est('loma')], [est('loma'), est('torre')], [est('torre'), est('mirador')], [est('mirador'), D.niebla],
      [est('loma'), est('otra')], [est('otra'), rui('portal')], [D.taller, rui('altar')], [D.taller, est('pilar')], [D.taller, X.guardian]].filter(t => t[0] && t[1]);
    const rr = G.util.rng(505), bichos = [];
    for (const [a, b] of tramos) {
      const l = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.round(l / 2.4)), nx = -(b.z - a.z) / (l || 1), nz = (b.x - a.x) / (l || 1);
      for (let i = 1; i < n; i++) {
        const t = (i + (rr() - 0.5) * 0.6) / n, lado = (rr() - 0.5) * 3.2, x = a.x + (b.x - a.x) * t + nx * lado, z = a.z + (b.z - a.z) * t + nz * lado;
        if (!isFinite(H(x, z)) || agua(x, z)) continue;
        bichos.push([x, z, 0.5 + rr() * 1.3]);
      }
    }
    // ---------- Puntos: faroles (núcleo + halo) y cucubanos, en una sola malla ----------
    const N = sitios.length * 2 + bichos.length;
    const pos = new Float32Array(N * 3), color = new Float32Array(N * 3), dat = new Float32Array(N * 4); // dat: tamaño, fase, tipo, brillo
    let k = 0;
    const punto = (x, y, z, c, tam, fase, tipo, brillo) => { pos.set([x, y, z], k * 3); color.set(c, k * 3); dat.set([tam, fase, tipo, brillo], k * 4); k++; };
    const brilloDe = clave => (!clave ? 1 : clave.startsWith('est_') ? (S.collected.includes(clave) ? 1.35 : 0.85) : S.collected.includes(clave) ? 0.4 : 1);
    for (const [x, z, alto, c, tam, clave] of sitios) {
      const y = H(x, z) + alto, f = rr() * 6.28, b = brilloDe(clave);
      punto(x, y, z, c, 0.32, f, 0, b);      // núcleo
      punto(x, y, z, c, tam * 1.3, f, 1, b); // halo
    }
    for (const [x, z, alto] of bichos) punto(x, H(x, z) + alto, z, CUCUBANO, 0.45, rr() * 6.28, 2, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    g.setAttribute('aDat', new THREE.BufferAttribute(dat, 4));
    g.computeBoundingSphere();
    const U = { uTime: { value: 0 }, uPx: { value: 600 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, vertexColors: true,
      vertexShader: `uniform float uTime, uPx; attribute vec4 aDat; varying vec3 vCol; varying float vA, vTipo;
        void main() {
          vec3 p = position; float f = aDat.y, tipo = aDat.z;
          float a = aDat.w;
          if (tipo > 1.5) { // cucubano: deriva lenta y destello (encendido ~35 % del tiempo)
            p += vec3(sin(uTime * 0.31 + f * 3.0), sin(uTime * 0.53 + f) * 0.35, cos(uTime * 0.27 + f * 2.0)) * 0.6;
            a *= 0.15 + 0.85 * pow(max(sin(uTime * 0.9 + f * 5.0), 0.0), 3.0);
          } else a *= 0.86 + 0.14 * sin(uTime * 1.3 + f); // farol: respira despacio
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          a *= mix(1.0, tipo > 1.5 ? 0.0 : 0.45, smoothstep(40.0, tipo > 1.5 ? 200.0 : 420.0, d)); // lejos: menos (el halo se ve de lejos)
          vCol = color; vA = a; vTipo = tipo;
          gl_PointSize = clamp(aDat.x * uPx / max(d, 0.1), tipo > 1.5 ? 2.0 : 1.5, 220.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vCol; varying float vA, vTipo;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
          float k = vTipo > 0.5 && vTipo < 1.5 ? pow(1.0 - r, 2.6) * 0.85 : exp(-r * r * 9.0) * 1.3;
          gl_FragColor = vec4(vCol * k * vA, 1.0);
        }`,
    });
    const puntos = new THREE.Points(g, mat);
    puntos.name = 'ep5-noche-luces'; puntos.frustumCulled = false; puntos.userData.sinCulling = true; puntos.renderOrder = 5;
    sc.add(puntos);
    // ---------- Charcos de luz en el suelo: una rejilla pequeña que sigue la ladera, debajo de cada farol ----------
    const RJ = 6, vp = [], va = [], ix = [];
    for (const [x, z, , c, tam, clave] of sitios) {
      const r = Math.min(4.5, tam * 0.9), base = vp.length / 3, b = brilloDe(clave);
      for (let j = 0; j <= RJ; j++) for (let i = 0; i <= RJ; i++) {
        const u = i / RJ * 2 - 1, v = j / RJ * 2 - 1, px = x + u * r, pz = z + v * r;
        vp.push(px, H(px, pz) + 0.12, pz); va.push(c[0], c[1], c[2], u, v, b);
      }
      for (let j = 0; j < RJ; j++) for (let i = 0; i < RJ; i++) { const a = base + j * (RJ + 1) + i; ix.push(a, a + RJ + 1, a + 1, a + 1, a + RJ + 1, a + RJ + 2); }
    }
    const gs = new THREE.BufferGeometry();
    gs.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3));
    const aS = new Float32Array(va), ib = new THREE.InterleavedBuffer(aS, 6); // color (3) y u, v, brillo (3)
    gs.setAttribute('aSuelo', new THREE.InterleavedBufferAttribute(ib, 3, 0));
    gs.setAttribute('aUV', new THREE.InterleavedBufferAttribute(ib, 3, 3));
    gs.setIndex(ix); gs.computeBoundingSphere();
    const suelo = new THREE.Mesh(gs, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      vertexShader: `attribute vec3 aSuelo, aUV; varying vec3 vCol; varying vec3 vUV; varying float vLejos;
        void main() { vCol = aSuelo; vUV = aUV; vec4 mv = modelViewMatrix * vec4(position, 1.0); vLejos = smoothstep(60.0, 300.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vCol; varying vec3 vUV; varying float vLejos;
        void main() { float r = length(vUV.xy); float k = pow(max(1.0 - r, 0.0), 1.8) * 0.5 * vUV.z * (1.0 - 0.6 * vLejos); gl_FragColor = vec4(vCol * k, 1.0); }`,
    }));
    suelo.name = 'ep5-noche-suelo'; suelo.frustumCulled = false; suelo.userData.sinCulling = true; suelo.renderOrder = 4;
    sc.add(suelo);
    // ---------- Estado de la misión: ruina leída, farol más bajo; estación puesta, más alto ----------
    function brillos() {
      let i = 0;
      for (const s of sitios) { const b = brilloDe(s[5]); dat[i * 4 + 3] = b; dat[(i + 1) * 4 + 3] = b; i += 2; }
      g.attributes.aDat.needsUpdate = true;
      for (let s = 0; s < sitios.length; s++) for (let v = 0; v < (RJ + 1) * (RJ + 1); v++) aS[(s * (RJ + 1) * (RJ + 1) + v) * 6 + 5] = brilloDe(sitios[s][5]);
      ib.needsUpdate = true;
    }
    G.on('apply', brillos, 82);
    const tam = new THREE.Vector2();
    G.on('render', (dt, t) => {
      U.uTime.value = t || 0;
      const cam = G.renderer.camera; G.renderer.renderer.getDrawingBufferSize(tam);
      U.uPx.value = tam.y / (2 * Math.tan((cam.fov || 55) * Math.PI / 360));
    }, 60);
    // ---------- Cielo estrellado (Kelvin: «no hay estrellas»): puntos en el domo que sigue a la cámara, una llamada, sin texturas.
    // Más densas hacia el cenit, se apagan cerca del horizonte; titilan suave (sin titilar con prefers-reduced-motion). Detrás de
    // las nubes (renderOrder) y tapadas por el relieve (prueba de profundidad). La luna es el disco del cielo en la dirección de la luz.
    const NE = 2400, ep = new Float32Array(NE * 3), ed = new Float32Array(NE * 3), rs = G.util.rng(913), RAD = (G.renderer.camera.far || 1600) * 0.72;
    for (let i = 0; i < NE; i++) {
      const y = Math.sqrt(rs()) * 0.98 + 0.02, a = rs() * Math.PI * 2, r = Math.sqrt(1 - y * y);
      ep.set([Math.cos(a) * r * RAD, y * RAD, Math.sin(a) * r * RAD], i * 3);
      const m = rs(); ed.set([m < 0.8 ? 1.1 + rs() * 1.0 : 2.2 + rs() * 1.4, rs() * 6.28, rs()], i * 3); // tamaño (px), fase, tono
    }
    const ge = new THREE.BufferGeometry();
    ge.setAttribute('position', new THREE.BufferAttribute(ep, 3)); ge.setAttribute('aEst', new THREE.BufferAttribute(ed, 3));
    const suave = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const UE = { uTime: U.uTime, uDpr: { value: 1 }, uTitila: { value: suave ? 0 : 1 }, uRad: { value: RAD } };
    const estrellas = new THREE.Points(ge, new THREE.ShaderMaterial({
      uniforms: UE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `uniform float uTime, uDpr, uTitila, uRad; attribute vec3 aEst; varying float vA; varying vec3 vCol;
        void main() {
          float h = position.y / uRad;
          vA = smoothstep(0.03, 0.3, h) * (0.55 + 0.45 * smoothstep(0.3, 0.9, h));
          vA *= mix(1.0, 0.55 + 0.45 * sin(uTime * (1.2 + aEst.z * 2.3) + aEst.y), uTitila * 0.7);
          vCol = mix(vec3(0.75, 0.84, 1.0), vec3(1.0, 0.92, 0.78), step(0.8, aEst.z));
          vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.z = max(mv.z, -uRad * 1.02);
          gl_PointSize = aEst.x * uDpr; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; varying vec3 vCol;
        void main() { float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; gl_FragColor = vec4(vCol * vA * (1.0 - r * r) * 1.25, 1.0); }`,
    }));
    estrellas.name = 'ep5-noche-estrellas'; estrellas.frustumCulled = false; estrellas.renderOrder = -95; estrellas.userData.sinCulling = true;
    sc.add(estrellas);
    G.on('render', () => { const c = G.renderer.camera.position; estrellas.position.copy(c); UE.uDpr.value = G.renderer.renderer.getPixelRatio(); }, 61);
    G.c.ep5noche = { faroles: sitios.length, cucubanos: bichos.length, estrellas: NE, llamadas: 3, puntos, suelo, estrellas3D: estrellas };
  } });
})();
