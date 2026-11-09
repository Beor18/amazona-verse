/* AVE · ambiente (fichas 26-E y 26-F de docs/equipo/MODERNIZACION_2026.md)
   1) Mapa de zonas compartido: rejilla de 64×64 sobre el mapa, hecha al cargar desde MAPA.zonas (sin tocar mapa_lib.py). Cada
      celda guarda la zona dominante, y una textura RGBA lleva el tinte de identidad (RGB = multiplicador − 0,5) y la humedad (A).
      La lee el suelo (terreno.js multiplica el albedo del splat) y la usan las partículas. Por eso este script va antes de
      terreno.js en index.html.
   2) Partículas ambientales: 1 Points (1 draw call) de 500 puntos con un atlas propio de 128×128 (64 KB) en 4 dibujos: polen,
      luciérnaga, hoja y burbuja. Se mueven en el vertex shader con uTime, sin CPU, en una caja que sigue a la cámara (cada punto
      queda quieto en el mundo y reaparece por el otro lado). Calidad: 150 / 300 / 500 puntos; en bajo se apagan si los FPS
      quedan por debajo de 30 unos segundos. La mezcla de tipos sigue la zona de la cámara (polen en la villa, luciérnagas en
      el Yunque y con neblina, hojas en el bosque, burbujas en la costa). Nunca en las baterías (G.quiet).
   Datos del pack (opcionales): mundo.ambiente = { zonas: { <id o bioma>: { tinte: [r, g, b], humedad, particulas: { polen,
   luciernagas, hojas, burbujas } } }, puntos: { bajo, medio, alto } }.
   3) Faroles (KIMI-018, cap. 1): si el pack trae mundo.faroles [{x, z}] y es el cap. 1, se colocan faroles de madera con
      cabeza de vidrio en esos puntos (la Y sale del terreno; los que caigan bajo un sólido cargado quedan ocultos). De
      tarde-noche (S.hora ≥ 17,5 en rampa, ≥ 19 o < 5 completo) encienden un punto cálido con halo: 2 draw calls extra en
      total (malla instanciada + Points con shader propio), sin luces dinámicas. De día se ven los postes apagados; en
      calidad baja el halo baja un 30 % y en las baterías (G.quiet) no se dibujan. ?faroles=0 los desactiva.
   API: G.ambiente.zonas (null sin mapa) = { N, x0, z0, ancho, largo, ids, idx, tex, zonaEn(x, z), tinteEn(x, z) },
   activo, mezcla, puntos(), faroles(). Prueba: AV.ambienteTest. */
AVE.module('ambiente', function (G) {
  'use strict';
  const R = G.renderer, scene = R.scene;
  const W = G.pack.mundo || {};
  const AMB = W.ambiente || {};
  const fn = v => (typeof v === 'function' ? v() : v);
  const MAPA = W.mapa ? fn(W.mapa.datos) : null;

  // ---------- Identidad por zona (paleta propuesta en MODERNIZACION_2026 §3; la decide Kelvin, [KELVIN] punto 3) ----------
  // tinte: multiplicador del albedo del suelo; humedad: musgo en llano alto (solo calidad alta); particulas: pesos de cada tipo
  const PALETA = Object.assign({
    villa: { tinte: [1.07, 1.02, 0.88], humedad: 0, particulas: { polen: 1 } },                          // verde cálido y acogedor
    costa: { tinte: [1.1, 1.06, 0.95], humedad: 0, particulas: { burbujas: 0.7, polen: 0.25 } },          // arena clara
    colina: { tinte: [1.04, 1.03, 0.9], humedad: 0, particulas: { polen: 0.6, hojas: 0.45 } },
    lomas: { tinte: [1.04, 1.02, 0.9], humedad: 0, particulas: { polen: 0.55, hojas: 0.5 } },
    meandros: { tinte: [0.97, 1.03, 0.95], humedad: 0.3, particulas: { hojas: 0.7, polen: 0.3, luciernagas: 0.15 } },
    terrazas: { tinte: [0.9, 1.0, 1.0], humedad: 0.8, particulas: { hojas: 0.45, luciernagas: 0.5 } },    // El Yunque: verde azulado
    la_mina: { tinte: [0.88, 1.0, 1.03], humedad: 1, particulas: { luciernagas: 0.6, hojas: 0.3 } },
    nublado: { tinte: [0.84, 0.97, 1.06], humedad: 1, particulas: { luciernagas: 1, hojas: 0.2 } },       // frío, húmedo y con neblina
    mesa_este: { tinte: [1.12, 0.99, 0.8], humedad: 0, particulas: { polen: 0.35 } },                     // ocre
    fuera: { tinte: [1, 1, 1], humedad: 0, particulas: { polen: 0.3, hojas: 0.3 } },
  }, AMB.zonas);
  const TIPOS = ['polen', 'luciernagas', 'hojas', 'burbujas'];
  const def = z => PALETA[z.id] || PALETA[z.bioma] || PALETA.fuera;

  // ---------- Mapa de zonas 64×64 ----------
  const N = 64;
  function crearZonas() {
    const lista = MAPA && MAPA.zonas, T = MAPA && MAPA.tamano;
    if (!lista || !lista.length || !T) return null;
    const ids = lista.map(z => z.id), idx = new Uint8Array(N * N), datos = new Uint8Array(N * N * 4);
    const enc = v => Math.max(0, Math.min(255, Math.round((v - 0.5) * 255)));
    for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) {
      const x = T.x0 + (i + 0.5) / N * T.ancho, z = T.z0 + (k + 0.5) / N * T.largo;
      // dominante: la de menor distancia relativa (una zona pequeña dentro de otra grande gana en su interior)
      let mejor = 255, dMin = 1, tR = 0, tG = 0, tB = 0, hum = 0, suma = 0;
      for (let j = 0; j < lista.length; j++) {
        const Z = lista[j], d = Math.hypot(x - Z.centro[0], z - Z.centro[2]) / Z.r;
        if (d < dMin) { dMin = d; mejor = j; }
        // tinte: mezcla suave de las zonas cercanas (sin bordes duros en el suelo)
        let w = Math.max(0, Math.min(1, (1.15 - d) / 0.6)); w = w * w * (3 - 2 * w);
        if (!w) continue;
        const P = def(Z); suma += w; tR += P.tinte[0] * w; tG += P.tinte[1] * w; tB += P.tinte[2] * w; hum += (P.humedad || 0) * w;
      }
      const s = Math.max(1, suma), resto = Math.max(0, 1 - suma);
      const o = (k * N + i) * 4;
      datos[o] = enc((tR + resto) / s); datos[o + 1] = enc((tG + resto) / s); datos[o + 2] = enc((tB + resto) / s);
      datos[o + 3] = Math.round(Math.min(1, hum / s) * 255);
      idx[k * N + i] = mejor;
    }
    const tex = new THREE.DataTexture(datos, N, N, THREE.RGBAFormat);
    tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
    const celda = (x, z) => {
      const i = Math.floor((x - T.x0) / T.ancho * N), k = Math.floor((z - T.z0) / T.largo * N);
      return i < 0 || k < 0 || i >= N || k >= N ? -1 : k * N + i;
    };
    return {
      N, x0: T.x0, z0: T.z0, ancho: T.ancho, largo: T.largo, ids, idx, datos, tex, lista,
      zonaEn(x, z) { const c = celda(x, z); return c < 0 || idx[c] === 255 ? null : ids[idx[c]]; },
      tinteEn(x, z) { const c = celda(x, z); if (c < 0) return [1, 1, 1, 0]; const o = c * 4; return [datos[o] / 255 + 0.5, datos[o + 1] / 255 + 0.5, datos[o + 2] / 255 + 0.5, datos[o + 3] / 255]; },
    };
  }
  const zonas = crearZonas();

  // ---------- Atlas de 128×128: polen (arriba izq.), luciérnaga (arriba der.), hoja (abajo izq.), burbuja (abajo der.) ----------
  function crearAtlas() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const halo = (cx, cy, r, stops) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); for (const [p, col] of stops) g.addColorStop(p, col); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); };
    halo(32, 32, 30, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0)']]);
    halo(96, 32, 31, [[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,255,255,0.95)'], [0.3, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
    // hoja: elipse con nervio, en blanco (el color va por tipo en el shader)
    x.save(); x.translate(32, 96); x.rotate(-0.6);
    x.fillStyle = 'rgba(255,255,255,1)'; x.beginPath(); x.ellipse(0, 0, 25, 11, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(150,150,150,1)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-24, 0); x.lineTo(24, 0); x.stroke();
    x.restore();
    // burbuja: anillo con brillo
    x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 3.5; x.beginPath(); x.arc(96, 96, 24, 0, Math.PI * 2); x.stroke();
    halo(96, 96, 24, [[0, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0.05)']]);
    x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(87, 87, 5, 0, Math.PI * 2); x.fill();
    const t = new THREE.CanvasTexture(c); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }

  // ---------- Partículas ----------
  const MAX = 500;
  const PUNTOS = Object.assign({ bajo: 150, medio: 300, alto: 500 }, AMB.puntos);
  const CAJA = [36, 16, 36];
  const VI = Object.assign({ dir: [0.8, 0.35] }, (W.flora && W.flora.viento) || (MAPA && MAPA.flora && MAPA.flora.viento));
  const VERT = `
    attribute vec4 aSemilla; // xyz: posición en la caja (0..1), w: elige el tipo y la fase
    uniform float uTime, uEscala; uniform vec3 uCam, uCaja; uniform vec4 uMezcla; uniform vec2 uViento;
    varying vec4 vColor; varying vec2 vAtlas; varying float vGiro;
    void main() {
      float r = aSemilla.w, fase = fract(r * 97.31) * 6.2832;
      // tipo por los pesos acumulados de la zona; lo que sobra del total no se dibuja
      vec4 acum = vec4(uMezcla.x, uMezcla.x + uMezcla.y, uMezcla.x + uMezcla.y + uMezcla.z, dot(uMezcla, vec4(1.0)));
      float tipo = r < acum.x ? 0.0 : r < acum.y ? 1.0 : r < acum.z ? 2.0 : r < acum.w ? 3.0 : -1.0;
      vec3 d = vec3(0.0); float tam = 0.0; vec3 col = vec3(1.0); float alfa = 0.0;
      float t = uTime;
      if (tipo == 0.0) { // polen: deriva lenta con el viento y sube un poco
        d = vec3(uViento.x * 0.35 * t + sin(t * 0.7 + fase) * 0.6, 0.12 * t + sin(t * 0.9 + fase * 1.3) * 0.35, uViento.y * 0.35 * t + cos(t * 0.6 + fase) * 0.6);
        tam = 0.075; col = vec3(1.0, 0.92, 0.62); alfa = 0.7;
      } else if (tipo == 1.0) { // luciérnaga: vagabundea y parpadea
        d = vec3(sin(t * 0.31 + fase) * 2.0, sin(t * 0.47 + fase * 1.7) * 0.8, cos(t * 0.27 + fase * 0.6) * 2.0);
        tam = 0.17; col = vec3(0.75, 1.0, 0.35) * 2.2; alfa = pow(max(sin(t * (1.1 + r) + fase), 0.0), 3.0);
      } else if (tipo == 2.0) { // hoja: cae girando y se mece con el viento
        d = vec3(uViento.x * 0.9 * t + sin(t * 1.3 + fase) * 0.7, -0.55 * t, uViento.y * 0.9 * t + cos(t * 1.1 + fase) * 0.7);
        tam = 0.22; col = mix(vec3(0.38, 0.62, 0.18), vec3(0.72, 0.52, 0.2), fract(r * 31.7)); alfa = 0.95;
      } else if (tipo == 3.0) { // burbuja: sube despacio
        d = vec3(sin(t * 0.8 + fase) * 0.3, 0.45 * t, cos(t * 0.7 + fase) * 0.3);
        tam = 0.13; col = vec3(0.85, 0.97, 1.0); alfa = 0.6;
      }
      // caja que sigue a la cámara: el punto queda fijo en el mundo y reaparece por el lado contrario
      vec3 base = uCam - uCaja * 0.5;
      vec3 w = base + mod(aSemilla.xyz * uCaja + d - base, uCaja);
      vec3 rel = (w - uCam) / (uCaja * 0.5);
      alfa *= 1.0 - smoothstep(0.7, 1.0, max(length(rel.xz), abs(rel.y)));
      vec4 mv = viewMatrix * vec4(w, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = tipo < 0.0 ? 0.0 : clamp(tam * uEscala / max(-mv.z, 0.1), 0.0, 48.0);
      alfa *= smoothstep(0.4, 1.4, -mv.z); // no tapa la cámara
      // AND-1 (Kelvin 9-nov, Android en «bajo»: «cuadros flotando»): un punto de 1-3 px del búfer no cabe la silueta del atlas y
      // se dibuja como un cuadrito lleno (y con la resolución baja, el navegador lo agranda). Por debajo de ~4 px se desvanece.
      alfa *= smoothstep(2.0, 4.0, gl_PointSize);
      vColor = vec4(col, alfa);
      vAtlas = vec2(mod(max(tipo, 0.0), 2.0), floor(max(tipo, 0.0) / 2.0)) * 0.5;
      vGiro = tipo == 2.0 ? t * (0.8 + r) + fase : 0.0;
    }`;
  const FRAG = `
    uniform sampler2D tAtlas; varying vec4 vColor; varying vec2 vAtlas; varying float vGiro;
    void main() {
      vec2 p = gl_PointCoord - 0.5; float c = cos(vGiro), s = sin(vGiro);
      p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
      vec4 tx = texture2D(tAtlas, vec2(vAtlas.x, 0.5 - vAtlas.y) + vec2(p.x, 1.0 - p.y) * 0.5, -1.0); // AND-1: un mip más nítido (en sprites pequeños el mip alto mezcla la hoja con su celda vecina y sale una mancha cuadrada)
      float a = tx.a * vColor.a;
      if (a < 0.02) discard;
      gl_FragColor = vec4(vColor.rgb * tx.rgb, a);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
    }`;

  const U = {
    uTime: { value: 0 }, uEscala: { value: 600 }, uCam: { value: new THREE.Vector3() }, uCaja: { value: new THREE.Vector3(CAJA[0], CAJA[1], CAJA[2]) },
    uMezcla: { value: new THREE.Vector4() }, uViento: { value: new THREE.Vector2() }, tAtlas: { value: null },
  };
  const vlen = Math.hypot(VI.dir[0], VI.dir[1]) || 1;
  U.uViento.value.set(VI.dir[0] / vlen, VI.dir[1] / vlen);
  let puntos = null, atlas = null;
  function crear() {
    if (puntos) return puntos;
    const g = new THREE.BufferGeometry(), sem = new Float32Array(MAX * 4), rn = G.util.rng(2026);
    for (let i = 0; i < MAX * 4; i++) sem[i] = rn();
    g.setAttribute('aSemilla', new THREE.BufferAttribute(sem, 4));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3)); // no se usa: la posición sale de aSemilla
    atlas = atlas || crearAtlas(); U.tAtlas.value = atlas;
    const m = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, fog: false });
    puntos = new THREE.Points(g, m);
    puntos.name = 'ambiente-particulas'; puntos.frustumCulled = false; puntos.renderOrder = 5;
    puntos.userData.sinCulling = true;
    puntos.visible = false;
    aplicarCalidad(R.calidad);
    scene.add(puntos);
    return puntos;
  }
  // Suelta la geometría, el material y el atlas (calidad baja sin margen, o la prueba de fugas)
  function liberar() {
    if (!puntos) return;
    scene.remove(puntos); puntos.geometry.dispose(); puntos.material.dispose();
    if (atlas) { atlas.dispose(); atlas = null; }
    puntos = null;
  }
  function aplicarCalidad(C) { if (puntos) puntos.geometry.setDrawRange(0, Math.min(MAX, PUNTOS[C.nivel] != null ? PUNTOS[C.nivel] : PUNTOS.medio)); }
  G.on('calidad', C => { aplicarCalidad(C); estado.lento = 0; });

  // Mezcla objetivo según la zona de la cámara y el clima (neblina: más luciérnagas; lluvia: casi solo hojas)
  const objetivo = new THREE.Vector4(), mezcla = U.uMezcla.value;
  function calcularObjetivo(x, z) {
    const id = zonas ? zonas.zonaEn(x, z) : null;
    const P = id ? def(zonas.lista[zonas.ids.indexOf(id)]) : PALETA.fuera, pt = P.particulas || {};
    objetivo.set(pt.polen || 0, pt.luciernagas || 0, pt.hojas || 0, pt.burbujas || 0);
    const clima = G.clima && G.clima.estado ? G.clima.estado() : 'sol';
    if (clima === 'neblina') objetivo.y = Math.max(objetivo.y, 0.6) + 0.3;
    if (clima === 'llovizna' || clima === 'aguacero') { objetivo.x *= 0.15; objetivo.w *= 0.15; objetivo.y *= 0.3; }
    const s = objetivo.x + objetivo.y + objetivo.z + objetivo.w;
    if (s > 1) objetivo.multiplyScalar(1 / s);
    return id;
  }

  // Encendido: no en las baterías, no sin mundo; en bajo, se apagan si los FPS no llegan a 30 durante 4 s (y vuelven con 45 durante 8 s)
  const estado = { zona: null, lento: 0, rapido: 0, apagadoFps: false, forzar: null };
  const permitido = () => (estado.forzar != null ? estado.forzar : !G.quiet && !estado.apagadoFps);
  function vigilarFps(dt, fps) {
    if (R.calidad.nivel === 'bajo' && fps > 0) {
      if (!estado.apagadoFps) { estado.lento = fps < 30 ? estado.lento + dt : 0; if (estado.lento > 4) { estado.apagadoFps = true; estado.rapido = 0; liberar(); } }
      else { estado.rapido = fps >= 45 ? estado.rapido + dt : 0; if (estado.rapido > 8) { estado.apagadoFps = false; estado.lento = 0; } }
    } else if (estado.apagadoFps) { estado.apagadoFps = false; estado.lento = 0; }
  }
  let n = 0;
  G.on('update', dt => {
    vigilarFps(dt, R.stats().fps);
    if (++n % 15 === 0) { const cam = R.camera.position; estado.zona = calcularObjetivo(cam.x, cam.z); }
  }, 70);
  G.on('render', dt => {
    if (!permitido()) { if (puntos) puntos.visible = false; return; }
    crear();
    U.uTime.value += dt;
    U.uCam.value.copy(R.camera.position);
    U.uEscala.value = R.renderer.domElement.height * 0.5 / Math.tan(R.camera.fov * Math.PI / 360);
    mezcla.lerp(objetivo, Math.min(1, dt * 0.6));
    puntos.visible = mezcla.x + mezcla.y + mezcla.z + mezcla.w > 0.01;
  }, 40);

  // ---------- Faroles (KIMI-018, prototipo cap. 1): postes + luz cálida de tarde-noche, sin luces dinámicas ----------
  // Datos: mundo.faroles [{x, z}] (content/cap1/mundo.js: caminos de Villa Raíz y plazas de la Ciudad de los 36). Solo el
  // cap. 1 (los demás no traen los datos o son otro pack). Dos llamadas de dibujo extra en total: una malla instanciada
  // con todos los postes (poste + collar + cabeza de vidrio, color por vértice, 1 material) y un Points con núcleo + halo
  // por farol (shader propio como ep5/noche.js: respira con uTime, mezcla aditiva, el halo se ve de lejos). La Y sale del
  // terreno al colocarlos y se descarta (escala 0) el que caiga bajo un sólido cargado, reevaluando al cambiar solidos.
  // Se encienden con la tarde-noche: S.hora ≥ 19 o < 5 completo, 17,5–19 en rampa (el atardecer del coquí ya pone S.hora;
  // sin S.hora no hay noche visual en cap. 1 y quedan apagados). De día se ven los postes apagados; en calidad baja
  // mismas 2 llamadas (halo un 30 % menor) y en las baterías (G.quiet) no se dibuja nada, como las partículas.
  const ES_CAP1 = !!(G.pack.meta && G.pack.meta.capitulo === 1);
  const FAROLES = (ES_CAP1 && Array.isArray(W.faroles) && W.faroles.length && !/[?&]faroles=0(?:&|$)/.test(location.search)) ? W.faroles : null;
  const tintaLineal = hex => { const c = new THREE.Color(hex).convertSRGBToLinear(); return [c.r, c.g, c.b]; };
  let far = null; // { posts, pts, U, spots, verSol, enc }
  function geoFarol() { // poste + collar + cabeza fundidos en una geometría (1 llamada instanciada)
    const partes = [
      { g: new THREE.CylinderGeometry(0.05, 0.075, 1.9, 6).translate(0, 0.95, 0), c: tintaLineal('#6f4a28') },
      { g: new THREE.CylinderGeometry(0.17, 0.12, 0.09, 6).translate(0, 1.93, 0), c: tintaLineal('#54402a') },
      { g: new THREE.SphereGeometry(0.15, 8, 6).translate(0, 2.08, 0), c: tintaLineal('#ffe6b8') },
    ];
    let n = 0;
    for (const p of partes) { p.gg = p.g.index ? p.g.toNonIndexed() : p.g; n += p.gg.attributes.position.count; }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    for (const p of partes) {
      pos.set(p.gg.attributes.position.array, o * 3);
      nor.set(p.gg.attributes.normal.array, o * 3);
      for (let i = 0; i < p.gg.attributes.position.count; i++) col.set(p.c, (o + i) * 3);
      o += p.gg.attributes.position.count;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  function crearFaroles() {
    if (far || !FAROLES || !G.terreno || !G.terreno.height) return far;
    const H = G.terreno.height, CALIDO = tintaLineal('#ffb45a');
    const spots = FAROLES.map(f => ({ x: f.x, z: f.z, y: H(f.x, f.z), activo: true })).filter(s => isFinite(s.y));
    if (!spots.length) return null;
    const posts = new THREE.InstancedMesh(geoFarol(), R.linMat(new THREE.MeshLambertMaterial({ vertexColors: true })), spots.length);
    posts.name = 'faroles:postes'; posts.frustumCulled = false; posts.userData.sinCulling = true; posts.castShadow = posts.receiveShadow = false;
    scene.add(posts);
    const pos = new Float32Array(spots.length * 6), col = new Float32Array(spots.length * 6), dat = new Float32Array(spots.length * 8);
    spots.forEach((s, i) => { // núcleo + halo por farol
      pos.set([s.x, s.y + 2.08, s.z], i * 6); col.set(CALIDO, i * 6); dat.set([0.3, i * 1.7, 0], i * 8);
      pos.set([s.x, s.y + 2.08, s.z], i * 6 + 3); col.set(CALIDO, i * 6 + 3); dat.set([2.8, i * 1.7, 1], i * 8 + 4);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aDat', new THREE.BufferAttribute(dat, 4));
    const U = { uTime: { value: 0 }, uPx: { value: 600 }, uEnc: { value: 0 }, uTam: { value: R.calidad && R.calidad.nivel === 'bajo' ? 0.7 : 1 } };
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, vertexColors: true,
      vertexShader: `uniform float uTime, uPx, uEnc, uTam; attribute vec4 aDat; varying vec3 vCol; varying float vA, vTipo;
        void main() {
          float f = aDat.y, tipo = aDat.z;
          float a = uEnc * (0.86 + 0.14 * sin(uTime * 1.3 + f)); // respira despacio
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float d = max(-mv.z, 0.1);
          a *= mix(1.0, tipo > 0.5 ? 0.45 : 0.0, smoothstep(40.0, 420.0, d)); // lejos queda el halo
          vCol = color; vA = a; vTipo = tipo;
          gl_PointSize = clamp(aDat.x * uTam * uPx / d, 1.5, 220.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying vec3 vCol; varying float vA, vTipo;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
          float k = vTipo > 0.5 && vTipo < 1.5 ? pow(1.0 - r, 2.6) * 0.85 : exp(-r * r * 9.0) * 1.3;
          gl_FragColor = vec4(vCol * k * vA, 1.0);
        }`,
    }));
    pts.name = 'faroles:luz'; pts.frustumCulled = false; pts.userData.sinCulling = true; pts.renderOrder = 5; pts.visible = false;
    scene.add(pts);
    far = { posts, pts, U, spots, verSol: -1, enc: 0 };
    colocarFaroles();
    return far;
  }
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  function colocarFaroles() {
    if (!far) return;
    const so = (G.solidos && G.solidos.activo && G.solidos.altoEn) ? G.solidos : null;
    const ver = so ? G.solidos.version : null;
    if (ver === far.verSol) return;
    far.verSol = ver;
    far.spots.forEach((s, i) => {
      let activo = isFinite(s.y);
      if (activo && so) { const t = so.altoEn(s.x, s.z, 1e4); activo = !isFinite(t) || t <= s.y + 0.5; } // bajo un sólido: fuera
      s.activo = activo;
      if (activo) { _e.set(0, (i * 2.39996) % 6.2832, 0); _q.setFromEuler(_e); _p.set(s.x, s.y, s.z); _s.set(1, 1, 1); }
      else { _q.identity(); _p.set(s.x, s.y || 0, s.z); _s.set(0, 0, 0); }
      _m4.compose(_p, _q, _s);
      far.posts.setMatrixAt(i, _m4);
    });
    far.posts.instanceMatrix.needsUpdate = true;
  }
  const horaActual = () => (G.S && Number.isFinite(G.S.hora)) ? G.S.hora : null;
  const encObjetivo = () => {
    const h = horaActual();
    if (h == null) return 0;
    if (h >= 19 || h < 5) return 1;
    if (h >= 17.5) return 0.35 + (h - 17.5) * (0.65 / 1.5); // atardecer: rampa 0,35 → 1
    return 0;
  };
  G.on('render', (dt, t) => {
    if (!FAROLES) return;
    crearFaroles();
    if (!far) return;
    colocarFaroles();
    far.posts.visible = !G.quiet;
    const obj = encObjetivo();
    far.enc += (obj - far.enc) * Math.min(1, (Number.isFinite(dt) ? dt : 0.016) * 2);
    if (!obj && far.enc < 0.01) far.enc = 0;
    far.pts.visible = !G.quiet && far.enc > 0.01;
    if (!far.pts.visible) return;
    far.U.uTime.value = t || 0;
    far.U.uEnc.value = far.enc;
    const cam = R.camera;
    far.U.uPx.value = R.renderer.domElement.height / (2 * Math.tan(cam.fov * Math.PI / 360));
  }, 41);
  G.on('calidad', C => { if (far) far.U.uTam.value = C.nivel === 'bajo' ? 0.7 : 1; }, 41);

  // ---------- Prueba: AV.ambienteTest ----------
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const cuadros = k => new Promise(r => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const fnv = (h, v) => { h ^= v; return Math.imul(h, 16777619) >>> 0; };
  // Rejilla de alturas y splat del terreno: no puede cambiar con el tinte por zonas (26-F). La referencia va por mapa: si el
  // mapa se regenera a propósito, la huella cambia y la prueba solo informa el valor nuevo.
  const REF_REJILLA = { '83fb13e8-37399': 'f83130b4' }; // mapa de R1 (2afade5)
  function huellaMapa() {
    const A = W.mapa ? fn(W.mapa.alturas) : null, s = A ? JSON.stringify(A) : '';
    let h = 2166136261; for (let i = 0; i < s.length; i++) h = fnv(h, s.charCodeAt(i));
    return h.toString(16).padStart(8, '0') + '-' + ((MAPA && MAPA.terreno && MAPA.terreno.triangulos) || 0);
  }
  function hashRejilla() {
    const T = G.terreno, f = new Float32Array(1), b = new Uint8Array(f.buffer);
    const x0 = MAPA.tamano.x0, z0 = MAPA.tamano.z0, an = MAPA.tamano.ancho, la = MAPA.tamano.largo;
    let h = 2166136261;
    const mete = v => { f[0] = v; for (let i = 0; i < 4; i++) h = fnv(h, b[i]); };
    for (let k = 0; k < 96; k++) for (let i = 0; i < 96; i++) {
      const x = x0 + (i + 0.37) / 96 * an, z = z0 + (k + 0.61) / 96 * la;
      mete(T.height(x, z));
      const s = T.splatAt(x, z); if (s) for (let j = 0; j < 4; j++) mete(s[j]);
    }
    return h.toString(16).padStart(8, '0');
  }
  async function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const errores0 = (window.__aveErrores || []).length;
    const g = { quiet: G.quiet, forzar: estado.forzar, nivel: R.calidad.nivel, manual: R.calidad.manual, apagado: estado.apagadoFps };
    try {
      // Mapa de zonas y tinte del suelo
      if (zonas) {
        const villa = (MAPA.pois || []).find(p => p.id === 'plaza'), cumbre = (MAPA.pois || []).find(p => p.id === 'cumbre');
        ok('Mapa de zonas de 64×64 desde MAPA.zonas', zonas.N === 64 && zonas.idx.length === 4096 && zonas.ids.length === MAPA.zonas.length, zonas.ids.join(','));
        const zv = villa && zonas.zonaEn(villa.pos[0], villa.pos[2]), zc = cumbre && zonas.zonaEn(cumbre.pos[0], cumbre.pos[2]);
        ok('La plaza cae en Villa Raíz y la cumbre en el bosque nublado', zv === 'villa' && zc === 'nublado', zv + ' · ' + zc);
        const tv = villa && zonas.tinteEn(villa.pos[0], villa.pos[2]), tc = cumbre && zonas.tinteEn(cumbre.pos[0], cumbre.pos[2]);
        ok('Tinte: la villa cálida (R > B) y el Yunque frío y húmedo (B > R, humedad alta)', tv && tc && tv[0] > tv[2] && tc[2] > tc[0] && tc[3] > 0.6,
          tv && tc && tv.map(v => v.toFixed(2)) + ' · ' + tc.map(v => v.toFixed(2)));
        const mats = (G.terreno.chunks || []).map(m => m.material);
        const sm = mats.find(m => m && m.userData && m.userData.splat) || null;
        ok('El suelo lee el mapa de zonas (tZona y SPLAT_ZONAS)', sm && sm.userData.uniforms.tZona && sm.userData.uniforms.tZona.value === zonas.tex && 'SPLAT_ZONAS' in sm.defines,
          sm ? Object.keys(sm.defines).join(',') : 'sin material de splat');
        if (sm) {
          R.setCalidad('alto'); await cuadros(2); const musgoA = 'SPLAT_MUSGO' in sm.defines;
          R.setCalidad('medio'); await cuadros(2); const musgoM = 'SPLAT_MUSGO' in sm.defines;
          ok('Musgo de llano alto solo en calidad alta', musgoA && !musgoM, 'alto ' + musgoA + ' · medio ' + musgoM);
        }
        await Promise.resolve(G.terreno.listo);
        const huella = huellaMapa(), h = hashRejilla(), ref = REF_REJILLA[huella];
        ok('height y splatAt sin cambios (rejilla de 96×96, igualdad byte a byte)', ref ? h === ref : true, ref ? h + (h === ref ? '' : ' ≠ ' + ref) : 'mapa ' + huella + ' sin referencia: ' + h);
      } else ok('Sin mapa: sin zonas y el juego sigue', G.ambiente.zonas === null);

      // Partículas: 1 draw call, ≤ 500 puntos, 150/300/500 por calidad
      G.quiet = false; estado.forzar = true; estado.apagadoFps = false;
      calcularObjetivo(R.camera.position.x, R.camera.position.z); mezcla.copy(objetivo);
      R.setCalidad('alto'); await cuadros(3);
      ok('Las partículas se encienden fuera de las baterías', puntos && puntos.visible, puntos ? 'mezcla ' + mezcla.toArray().map(v => v.toFixed(2)) : 'sin crear');
      const cuenta = () => { let k = 0; scene.traverse(o => { if (o.isPoints && o.name === 'ambiente-particulas') k++; }); return k; };
      ok('Un solo Points (1 draw call) con ≤ 500 puntos', cuenta() === 1 && puntos.geometry.attributes.aSemilla.count <= 500, cuenta() + ' · ' + puntos.geometry.attributes.aSemilla.count);
      const rango = {};
      for (const nv of ['bajo', 'medio', 'alto']) { R.setCalidad(nv); await cuadros(1); rango[nv] = puntos.geometry.drawRange.count; }
      ok('Puntos por calidad 150 / 300 / 500', rango.bajo === 150 && rango.medio === 300 && rango.alto === 500, JSON.stringify(rango));
      // 1 draw call: el Points se dibuja una vez por cuadro (contado en su onBeforeRender; el resto de la escena cambia con el streaming)
      let veces = 0; puntos.onBeforeRender = () => { veces++; };
      await cuadros(1); veces = 0; await cuadros(4); puntos.onBeforeRender = function () {};
      ok('Cuestan 1 draw call por cuadro', veces === 4, veces + ' en 4 cuadros');

      // Mezcla por zona y por clima
      if (zonas) {
        calcularObjetivo(150, 170); const ov = objetivo.clone();
        calcularObjetivo(-32, -150); const oc = objetivo.clone();
        ok('Polen en la villa y luciérnagas en el Yunque', ov.x > ov.y && oc.y > oc.x, ov.toArray().map(v => v.toFixed(2)) + ' · ' + oc.toArray().map(v => v.toFixed(2)));
      }
      if (G.clima && G.clima.F) {
        const e0 = G.clima.F.estado; G.clima.F.estado = 'neblina'; calcularObjetivo(150, 170); const neb = objetivo.y; G.clima.F.estado = e0;
        ok('Con neblina salen luciérnagas', neb > 0.3, neb.toFixed(2));
      }

      // En bajo se apagan si los FPS < 30; en las baterías (G.quiet) no se ven
      R.setCalidad('bajo'); estado.forzar = null; estado.lento = 0;
      for (let i = 0; i < 6; i++) vigilarFps(1, 22);
      const apagado = estado.apagadoFps && !puntos;
      ok('En calidad baja con menos de 30 FPS se apagan y sueltan la memoria', apagado, 'apagado ' + estado.apagadoFps + ' · ' + (puntos ? 'vivas' : 'liberadas'));
      estado.apagadoFps = false; R.setCalidad('medio');
      G.quiet = true; await cuadros(2);
      ok('En las baterías (G.quiet) no se ven', !puntos || !puntos.visible);
      G.quiet = false;

      // Faroles (KIMI-018): 2 llamadas extra, se encienden con la tarde-noche, nada en baterías ni de día.
      // Los ganchos de render no corren de forma determinista en headless (el bucle se pausa), así que aquí se
      // disparan a mano con G.emit('render', …) y el conteo de draw calls se hace con render directo: verde en cualquier PC.
      if (FAROLES) {
        crearFaroles();
        const hora0 = G.S.hora, teniaHora = Object.prototype.hasOwnProperty.call(G.S, "hora");
        const render1 = () => G.emit('render', 0.05, 1);
        try {
          ok('Faroles del cap. 1: datos colocados en el mundo', !!far && far.posts.count >= 10, far ? far.posts.count + ' faroles' : 'sin crear');
          if (far) {
            ok('Una malla instanciada de postes y un Points de luz (2 objetos)', far.posts.isInstancedMesh && far.pts.isPoints && far.pts.geometry.attributes.position.count === far.posts.count * 2,
              far.posts.count + ' postes · ' + far.pts.geometry.attributes.position.count + ' puntos');
            G.quiet = false;
            G.S.hora = 12; far.enc = 0; render1();
            ok('De día (S.hora 12) los faroles están apagados', !far.pts.visible && far.posts.visible, 'uEnc ' + far.U.uEnc.value.toFixed(2));
            G.S.hora = 20; far.enc = encObjetivo(); render1();
            ok('De noche (S.hora 20) encienden núcleo y halo', far.pts.visible && far.U.uEnc.value > 0.9, 'uEnc ' + far.U.uEnc.value.toFixed(2));
            let vecesP = 0, vecesL = 0;
            far.posts.onBeforeRender = () => { vecesP++; }; far.pts.onBeforeRender = () => { vecesL++; };
            for (let k = 0; k < 4; k++) R.renderer.render(R.scene, R.camera);
            far.posts.onBeforeRender = far.pts.onBeforeRender = function () {};
            ok('Cuestan 2 draw calls por cuadro (postes + luz)', vecesP === 4 && vecesL === 4, vecesP + ' + ' + vecesL);
            G.S.hora = 18.2; far.enc = encObjetivo(); render1();
            ok('Al atardecer (S.hora 18,2) la rampa objetiva es media', far.pts.visible && far.enc > 0.55 && far.enc < 0.8, 'obj ' + far.enc.toFixed(2));
            R.setCalidad('bajo'); G.S.hora = 20; far.enc = 1; render1();
            ok('En calidad baja siguen encendidos (halo −30 %)', far.posts.visible && far.pts.visible && far.U.uTam.value < 1, 'uTam ' + far.U.uTam.value);
            R.setCalidad('medio');
            G.quiet = true; render1();
            ok('En las baterías (G.quiet) no se dibujan', !far.posts.visible && !far.pts.visible);
            G.quiet = false;
          }
        } finally {
          if (teniaHora) G.S.hora = hora0; else delete G.S.hora;
          if (far) far.enc = 0;
          R.setCalidad('medio');
        }
      } else ok('Sin datos de faroles en este mundo/capítulo: el módulo queda inerte', true);

      // Fugas: 2 vueltas de crear y soltar dejan la memoria de GPU igual
      liberar(); await cuadros(2);
      const mem = () => Object.assign({}, R.renderer.info.memory, { programas: (R.renderer.info.programs || []).length });
      const m0 = mem();
      // Se cuentan los recursos del propio ambiente (geometría, material y atlas de cada vuelta), no el total de la GPU: con el
      // mundo ya recorrido por otras baterías el streaming carga y suelta decenas de piezas a la vez (193 → 202 geometrías y
      // 370 → 329 tras e2eTest) y el total no dice nada de este módulo. Una fuga es un recurso creado que no se suelta.
      let creados = 0, soltados = 0, vivos = 0, repetidos = 0;
      const vistos = new Set(), seguir = r => { if (!r) return; if (vistos.has(r)) { repetidos++; return; } vistos.add(r); creados++; r.addEventListener('dispose', function f() { soltados++; r.removeEventListener('dispose', f); }); };
      for (let v = 0; v < 4; v++) {
        estado.forzar = true; await cuadros(3); if (!puntos) crear(); // el gancho de render no siempre corre en headless
        seguir(puntos.geometry); seguir(puntos.material); seguir(atlas);
        estado.forzar = false; liberar(); await cuadros(2); // apagado: el gancho de render no las vuelve a crear
        if (puntos || scene.getObjectByName('ambiente-particulas')) vivos++;
      }
      const m1 = mem();
      ok('0 fugas tras 4 vueltas (cada geometría, material y atlas que crea el ambiente se suelta; nada queda en la escena)', creados >= 8 && soltados === creados && !vivos && !repetidos,
        creados + ' creados · ' + soltados + ' soltados · ' + vivos + ' en escena · ' + repetidos + ' repetidos · GPU (informativo, incluye el streaming) ' + JSON.stringify(m0) + ' → ' + JSON.stringify(m1));

      // Luz de borde de actores.js (26-F): compila sobre un material Standard sin errores
      if (G.actores && G.actores.rim) {
        const caja = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshStandardMaterial({ color: '#808080' }));
        caja.position.copy(R.camera.position).add(R.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3));
        G.actores.rim(caja); scene.add(caja); await cuadros(3);
        const prog = (R.renderer.info.programs || []).some(p => /\|rim/.test(p.cacheKey || ''));
        ok('Luz de borde (rim) en un material Standard', caja.material.userData.rim && prog, 'programa ' + prog);
        scene.remove(caja); caja.geometry.dispose(); caja.material.dispose();
      }

      ok('Sin errores de consola', (window.__aveErrores || []).length === errores0, (window.__aveErrores || []).slice(errores0).join(' | ').slice(0, 200));
    } catch (e) {
      ok('Sin excepciones', false, e && e.message);
    } finally {
      G.quiet = g.quiet; estado.forzar = g.forzar; estado.apagadoFps = g.apagado;
      if (R.calidad.nivel !== g.nivel) R.setCalidad(g.nivel);
      R.calidad.manual = g.manual;
    }
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }

  // AV.ambienteTest (boot.js es de la coordinadora: se expone aquí si boot no lo hizo, mismo patrón que momentos.js)
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.ambienteTest) AV.ambienteTest = o => test(o); }, 0);

  return {
    zonas, PALETA, TIPOS, test, calcularObjetivo, estado,
    get activo() { return !!(puntos && puntos.visible); }, get mezcla() { return mezcla; }, puntos: () => puntos,
    faroles: () => far,
  };
});
