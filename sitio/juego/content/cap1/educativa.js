/* Content pack cap1 · misión educativa M2 "La ruta de la gota" (docs/equipo/EDUCATIVO.md §2, datos en lecciones.js)
   p1 predecir con Luma en las marcas de agua · p2 subir volando por las 4 capas del bosque posándose en perchas ·
   p3 cadena alimentaria en el dosel · p4 ver los dos terrenos desde arriba (S.evaluated) · p5 seguir el vapor de la poza
   a la nube · p6 seguir la gota (precipitación, infiltración, escorrentía) · p7 bucear en la poza hasta la gota y la marca
   de la crecida · p8 explicarle el ciclo a Luma, comparar predicción y evidencia, y "Luma te pregunta" (formativa).
   Al terminar se desbloquea la pava y la historia pasa a elegir terreno (la elección sigue libre).
   Sin tiempo, sin oxígeno y sin fallar: la gota y el vapor esperan si el jugador se aleja.

   Lugares por id de POI (nunca coordenadas fijas). Se resuelven al arrancar, en este orden:
     0. G.terreno.poi(id) (API del programador gráfico para los POIs de assets/data/mapa_cap1.js);
     1. mundo.pois del pack o, si el mapa nuevo (assets/data/mapa_cap1.js) es el mundo activo, sus POIs (AV_MAPA_CAP1.pois);
     2. mundo.lugares (y, en el mundo viejo, los alias terrenoA → A, terrenoB → B, plaza → villa, poza_honda → pozaRio);
     3. con el mapa nuevo activo, los datos de misión del level designer (AV_MAPA_CAP1.misiones: perchas con y absoluta,
        markTrees y rutaGota: vapor, nube, lluvia, escorrentía hasta la Poza Honda y marcaCrecida);
     4. una posición PROVISIONAL relativa a otro POI (tabla POI_PROVISIONAL).
   POIs que el mapa todavía no tiene (los crea el rol de mapa/flora con estos ids y la misión los usa sin tocar código):
     marcas_agua (árbol con marcas de agua junto al terreno A), percha_suelo, percha_sotobosque, percha_dosel, percha_emergente
     (flora de cada capa: tabonuco, helecho gigante, palma de sierra/yagrumo, ceiba), nube_lluvia (nube de la cumbre),
     bromelia_dosel (donde cae la gota), rio_terrenoA (orilla del río junto al terreno A), gota_poza y roca_crecida (fondo de la
     poza honda) y flamboyan_plaza (hallazgo opcional). Mientras no existan se ven marcadores temporales (brillo + ícono).
   Verificación (DECISION_LOG): solo se publican fichas verificadas; lo POR VERIFICAR no se muestra ni se pregunta, y los textos
   que dependen de un dato sin validar usan su alternativa (frutos del bosque en la cadena, caída neutra en la bromelia). */
(function () {
  'use strict';

  // ---------- Datos de la misión ----------
  const POI_PROVISIONAL = {
    marcas_agua: [{ de: 'terrenoA', dx: -1, dz: 3 }], // a 3,5 m del árbol con marcas, fuera de su copa
    percha_suelo: [{ de: 'terrenoA', dx: -10, dz: 14 }],
    percha_sotobosque: [{ de: 'terrenoA', dx: -7.5, dz: 16.5 }],
    percha_dosel: [{ de: 'terrenoA', dx: -5, dz: 19 }],
    percha_emergente: [{ de: 'terrenoA', dx: -2.5, dz: 22 }],
    nube_lluvia: [{ de: 'cumbre', dx: 0, dz: 0 }, { de: 'terrenoB', dx: -3, dz: 6 }],
    bromelia_dosel: [{ de: 'nube_lluvia', dx: 5, dz: -4 }],
    rio_terrenoA: [{ de: 'terrenoA', dx: 4.5, dz: 0 }],
    gota_poza: [{ de: 'poza_honda', dx: 1, dz: 1 }],
    roca_crecida: [{ de: 'poza_honda', dx: -2.6, dz: -2 }],
    flamboyan_plaza: [{ de: 'plaza', dx: 3, dz: 4 }],
  };
  const RUTA = {
    marcas: 'marcas_agua',
    // alto = metros sobre el suelo de la percha (provisional hasta que la flora tenga sus ramas)
    perchas: [
      { capa: 'suelo', poi: 'percha_suelo', alto: 0.2, r: 1.5 },
      { capa: 'sotobosque', poi: 'percha_sotobosque', alto: 3, r: 1.2 },
      { capa: 'dosel', poi: 'percha_dosel', alto: 8, r: 1.2 },
      { capa: 'emergente', poi: 'percha_emergente', alto: 13, r: 1.3 },
    ],
    terrenos: { A: 'terrenoA', B: 'terrenoB', alto: 8, sobre: 4, r: 7 },
    poza: 'poza_honda',
    nube: { poi: 'nube_lluvia', alto: 14, r: 5 },
    bromelia: { poi: 'bromelia_dosel', alto: 7 },
    rio: 'rio_terrenoA',
    gota: 'gota_poza', roca: 'roca_crecida',
    flamboyan: 'flamboyan_plaza',
    velocidad: { vapor: 6, lluvia: 7, suelo: 7, rio: 6 }, espera: 16, crecidaRio: 0.45,
  };
  const ALIAS_VIEJO = { terrenoA: 'A', terrenoB: 'B', plaza: 'villa' };
  const PROCESOS = {
    evaporacion: { es: 'Evaporación', en: 'Evaporation' }, condensacion: { es: 'Condensación', en: 'Condensation' },
    precipitacion: { es: 'Precipitación', en: 'Precipitation' }, infiltracion: { es: 'Infiltración', en: 'Infiltration' },
    escorrentia: { es: 'Escorrentía', en: 'Runoff' },
  };
  // lecciones_cap1.json trae la secuencia de p6 solo en español: aquí su versión en inglés (pendiente de que Educativo la valide)
  const SECUENCIA_EN = [
    'The raindrop falls into a bromeliad in the canopy, and some of the water stays there.',
    'On the hill, the water soaks into the soil between the roots (infiltration).',
    'The rest runs downhill through the ravine to the river, which rises next to site A (runoff).',
  ];
  // Alternativas mientras un dato siga POR VERIFICAR
  const ALT = {
    // cotorra_alimento sin validar: la cadena usa "frutos del bosque" (EDUCATIVO, requiere_validacion de p3)
    palma_sierra: { es: 'Plantas con frutos del bosque (productor)', en: 'Forest fruit plants (producer)' },
    // bromelia sin validar: la gota cae sin decir que la bromelia guarda agua
    caida: { es: 'La gota cae de la nube sobre las hojas del dosel.', en: 'The raindrop falls from the cloud onto the canopy leaves.' },
  };
  const TX = {
    hud: { es: 'Ruta de la gota', en: "Raindrop's path" },
    mirar: { es: 'Mirar las marcas de agua', en: 'Look at the water marks' },
    explicar: { es: 'Explicarle a Luma el viaje de la gota', en: "Tell Luma the raindrop's trip" },
    observar: { es: 'Observar', en: 'Observe' }, capa: { es: 'Capa del bosque', en: 'Forest layer' }, de: { es: 'de', en: 'of' },
    predice: { es: 'Predice', en: 'Predict' }, sinMala: { es: 'No hay respuesta mala: es tu predicción.', en: "There's no wrong answer: it's your prediction." },
    otraVez: { es: 'Mira otra vez a tu alrededor.', en: 'Look around again.' },
    bien: { es: 'observado', en: 'observed' },
    cadena: { es: 'Cadena alimentaria', en: 'Food chain' }, cadenaQ: { es: '¿De dónde viene la energía?', en: 'Where does the energy come from?' },
    ordena: { es: 'Toca las tarjetas en orden, empezando por el Sol.', en: 'Tap the cards in order, starting with the Sun.' },
    resuelta: { es: 'Así queda la cadena.', en: 'This is the chain.' },
    ojos: { es: 'Ojos de cotorra', en: 'Parrot eyes' }, visto: { es: 'visto desde arriba', en: 'seen from above' }, terreno: { es: 'Terreno', en: 'Site' },
    vistaPista: { es: 'Mira otra vez desde arriba: ¿cuál está junto al río?', en: 'Look again from above: which one is next to the river?' },
    nace: { es: 'Nace la gota', en: 'A raindrop is born' }, sigue: { es: 'Sigue la gota', en: 'Follow the raindrop' },
    gotaHallada: { es: '¡Encontraste la gota!', en: 'You found the raindrop!' }, marcaHallada: { es: '¡Encontraste la marca de la crecida en la roca!', en: 'You found the flood mark on the rock!' },
    explicale: { es: 'Explícale a Luma', en: 'Explain it to Luma' }, tuExplicacion: { es: 'Tu explicación', en: 'Your explanation' },
    despues: { es: 'Esa frase va más adelante. ¿Qué pasó antes?', en: 'That sentence comes later. What happened before?' },
    brilla: { es: 'Pista: la frase que sigue brilla.', en: 'Hint: the next sentence is glowing.' },
    predijeVi: { es: 'Predije y vi', en: 'I predicted, I saw' }, predije: { es: 'Predije', en: 'I predicted' }, vi: { es: 'Vi', en: 'I saw' },
    agua: { es: '¿De dónde salió el agua?', en: 'Where did the water come from?' }, vapor: { es: '¿Qué pasa con el vapor?', en: 'What happens to the vapor?' },
    sinPred: { es: '(sin predicción)', en: '(no prediction)' },
    lumaPregunta: { es: 'Luma te pregunta', en: 'Luma asks you' },
    introFormativa: { es: 'Antes de elegir dónde construir, quiero estar segura de que lo entendimos bien. ¿Me ayudas con unas preguntas?', en: 'Before we choose where to build, I want to be sure we understood it. Will you help me with a few questions?' },
    finFormativa: { es: '¡Eso es pensar con ciencia! Ahora sí sabemos lo que dice el agua.', en: "That's thinking like a scientist! Now we know what the water is telling us." },
    lumaVe: { es: 'Antes de construir, ve a las marcas de agua junto al río. Quiero mostrarte algo.', en: 'Before we build, go to the water marks by the river. I want to show you something.' },
    lumaSigue: { es: 'Sigue la ruta de la gota y después vuelve a las marcas a contarme lo que viste.', en: 'Follow the raindrop, then come back to the marks and tell me what you saw.' },
    lumaCuenta: { es: '¡Volviste! Ven a las marcas de agua y cuéntame el viaje de la gota.', en: "You're back! Come to the water marks and tell me the raindrop's trip." },
  };

  // ---------- Utilidades de dibujo (marcadores temporales: brillo + ícono) ----------
  function lienzo(w, h, dibujar) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; dibujar(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  const GLIFOS = {
    hoja(g) { g.save(); g.translate(64, 66); g.rotate(-0.6); g.beginPath(); g.ellipse(0, 0, 18, 34, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -28); g.lineTo(0, 30); g.stroke(); g.restore(); },
    ojo(g) { g.beginPath(); g.moveTo(26, 64); g.quadraticCurveTo(64, 26, 102, 64); g.quadraticCurveTo(64, 102, 26, 64); g.fill(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(64, 64, 14, 0, Math.PI * 2); g.fill(); },
    gota(g) { g.beginPath(); g.moveTo(64, 24); g.bezierCurveTo(72, 44, 92, 60, 92, 78); g.arc(64, 78, 28, 0, Math.PI, false); g.bezierCurveTo(36, 60, 56, 44, 64, 24); g.fill(); },
    vapor(g) { g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = g.fillStyle; for (const x of [44, 64, 84]) { g.beginPath(); g.moveTo(x, 98); g.bezierCurveTo(x - 14, 82, x + 14, 62, x, 44); g.stroke(); } g.beginPath(); g.moveTo(52, 40); g.lineTo(64, 24); g.lineTo(76, 40); g.stroke(); },
    nube(g) { for (const [x, y, r] of [[46, 70, 20], [66, 58, 26], [86, 70, 20], [64, 78, 22]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } },
    habla(g) { g.beginPath(); g.moveTo(30, 40); g.quadraticCurveTo(30, 30, 40, 30); g.lineTo(88, 30); g.quadraticCurveTo(98, 30, 98, 40); g.lineTo(98, 74); g.quadraticCurveTo(98, 84, 88, 84); g.lineTo(56, 84); g.lineTo(40, 100); g.lineTo(44, 84); g.lineTo(40, 84); g.quadraticCurveTo(30, 84, 30, 74); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.5)'; for (const x of [48, 64, 80]) { g.beginPath(); g.arc(x, 57, 6, 0, Math.PI * 2); g.fill(); } },
    flor(g) { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20, 15, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(64, 64, 11, 0, Math.PI * 2); g.fill(); },
    roca(g) { g.beginPath(); g.moveTo(30, 92); g.lineTo(40, 52); g.lineTo(62, 36); g.lineTo(88, 46); g.lineTo(98, 92); g.closePath(); g.fill(); g.fillStyle = '#2d5f7a'; g.fillRect(36, 62, 58, 9); },
    casa(g) { g.beginPath(); g.moveTo(26, 64); g.lineTo(64, 30); g.lineTo(102, 64); g.lineTo(92, 64); g.lineTo(92, 98); g.lineTo(36, 98); g.lineTo(36, 64); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(56, 74, 16, 24); },
    check(g) { g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(38, 66); g.lineTo(56, 84); g.lineTo(92, 44); g.stroke(); },
  };
  const iconos = {};
  function icono(nombre, color) {
    const k = nombre + color;
    return iconos[k] || (iconos[k] = lienzo(128, 128, g => {
      g.fillStyle = 'rgba(16,36,28,.45)'; g.beginPath(); g.arc(64, 68, 58, 0, Math.PI * 2); g.fill();
      g.fillStyle = color; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.fill();
      g.lineWidth = 6; g.strokeStyle = '#fff8e6'; g.stroke();
      g.fillStyle = '#ffffff'; (GLIFOS[nombre] || GLIFOS.ojo)(g);
    }));
  }
  let brilloTex = null;
  const brillo = () => brilloTex || (brilloTex = lienzo(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  }));
  function etiquetaTex(texto) {
    return lienzo(512, 128, g => {
      g.font = '700 54px Fredoka, "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = Math.min(500, g.measureText(texto).width + 70);
      g.fillStyle = 'rgba(16,36,28,.82)'; g.beginPath(); g.roundRect ? g.roundRect(256 - w / 2, 18, w, 92, 46) : g.rect(256 - w / 2, 18, w, 92); g.fill();
      g.lineWidth = 5; g.strokeStyle = '#ffd84a'; g.stroke();
      g.fillStyle = '#fff8e6'; g.fillText(texto, 256, 66);
    });
  }

  AVE.registerPack({
    id: 'cap1',
    rutaGota: { POI_PROVISIONAL, RUTA },

    preparar(G) {
      const S = G.S, $ = G.util.$, C = G.c, AU = G.aula, scene = G.renderer.scene, H = G.terreno.height;
      const LEC = (AU && AU.LEC) || window.AV_LECCIONES_CAP1 || {};
      const M = LEC.mision_educativa;
      if (!M || !AU || !AU.activo) return;
      const t = AU.t, tc = AU.tc, esc = AU.esc, u = k => t(TX[k]);
      const paso = id => M.pasos.find(p => p.id === id);
      const IMG = C.IMG || { V: 'assets/vittata.png', L: 'assets/luma.png' };
      const linMat = m => G.renderer.linMat(m);
      const E = () => S.edu;
      const PASOS = M.pasos.map(p => p.id);
      const actual = () => PASOS.find(id => !E().hecho[id]) || null;
      const enMision = () => S.step === 3 && !S.missions.educativa;
      // Las perchas existen desde la predicción hasta ver los terrenos desde arriba (después se vuela)
      const perchasActivas = () => enMision() && S.edu.hecho.p1 && !S.edu.hecho.p4;
      const nivelAgua = (x, z) => G.agua.levelAt(x, z);

      // ---------- Lugares por POI ----------
      const places = G.terreno.places, MAPA = window.AV_MAPA_CAP1;
      const mapaActivo = !!(MAPA && MAPA.lugares && MAPA.lugares.A && places.A && Math.abs(places.A.x - MAPA.lugares.A.x) < 1 && Math.abs(places.A.z - MAPA.lugares.A.z) < 1);
      // Datos de misión del level designer (solo si su mapa es el mundo activo)
      const MM = mapaActivo && MAPA.misiones ? MAPA.misiones : null, RG = (MM && MM.rutaGota) || null;
      const xyz = a => (Array.isArray(a) ? { x: a[0], y: a[1], z: a[2] } : a);
      const DEL_MAPA = {};
      if (MM) {
        const A0 = MAPA.lugares.A, mt = (MM.markTrees || []).slice().sort((a, b) => Math.hypot(a.x - A0.x, a.z - A0.z) - Math.hypot(b.x - A0.x, b.z - A0.z))[0];
        if (mt) DEL_MAPA.marcas_agua = { x: mt.x + 1.3, z: mt.z - 0.9 };
        for (const q of MM.perchas || []) DEL_MAPA['percha_' + q.id] = { x: q.x, z: q.z, y: q.y };
        if (RG && RG.nube) DEL_MAPA.nube_lluvia = { x: RG.nube.x, z: RG.nube.z, y: RG.nube.y, r: RG.nube.r };
        if (RG && RG.lluvia && RG.lluvia.length) DEL_MAPA.bromelia_dosel = xyz(RG.lluvia[RG.lluvia.length - 1]);
        if (RG && RG.marcaCrecida) DEL_MAPA.roca_crecida = { x: RG.marcaCrecida.x, z: RG.marcaCrecida.z };
      }
      const origen = {}, cache = {};
      function poi(id, pila) {
        if (cache[id]) return cache[id];
        pila = pila || [];
        if (pila.includes(id)) return null;
        let p = null, de = '';
        if (typeof G.terreno.poi === 'function') {
          try { const q = G.terreno.poi(id); if (q && isFinite(q.x) && isFinite(q.z)) { p = q; de = 'terreno.poi'; } } catch (e) { /* POI desconocido */ }
        }
        const W = G.pack.mundo || {}, lista = W.pois || (mapaActivo ? MAPA.pois : null);
        if (!p && lista) {
          const q = Array.isArray(lista) ? lista.find(x => x.id === id) : lista[id];
          if (q) { p = q.pos ? { x: q.pos[0], z: q.pos[2] } : { x: q.x, z: q.z }; de = 'mapa'; }
        }
        if (!p && places[id]) { p = places[id]; de = 'lugar'; }
        if (!p && !mapaActivo && ALIAS_VIEJO[id] && places[ALIAS_VIEJO[id]]) { p = places[ALIAS_VIEJO[id]]; de = 'lugar:' + ALIAS_VIEJO[id]; }
        if (!p && !mapaActivo && id === 'poza_honda' && G.pack.pozaRio) { p = G.pack.pozaRio; de = 'pozaRio'; }
        if (!p && DEL_MAPA[id]) { p = DEL_MAPA[id]; de = 'mapa.misiones'; }
        if (!p) for (const pr of POI_PROVISIONAL[id] || []) {
          const b = poi(pr.de, pila.concat(id));
          if (b) { p = { x: b.x + pr.dx, z: b.z + pr.dz }; de = 'provisional(' + pr.de + ')'; break; }
        }
        if (!p) return null;
        cache[id] = { x: p.x, z: p.z }; origen[id] = de;
        if (DEL_MAPA[id] && de === 'mapa.misiones') { if (DEL_MAPA[id].y != null) cache[id].y = DEL_MAPA[id].y; if (DEL_MAPA[id].r != null) cache[id].r = DEL_MAPA[id].r; }
        return cache[id];
      }
      const L = {
        marcas: poi(RUTA.marcas), poza: poi(RUTA.poza), nube: poi(RUTA.nube.poi), bromelia: poi(RUTA.bromelia.poi),
        rio: poi(RUTA.rio), gota: poi(RUTA.gota), roca: poi(RUTA.roca), flamboyan: poi(RUTA.flamboyan),
        A: poi(RUTA.terrenos.A), B: poi(RUTA.terrenos.B),
      };
      // y absoluta si el mapa la da; si no, alto sobre el suelo
      const PERCHAS = RUTA.perchas.map(p => { const q = poi(p.poi); return Object.assign({}, p, { x: q.x, z: q.z, y: q.y != null ? q.y : H(q.x, q.z) + p.alto }); });
      const NUBE_Y = L.nube.y != null ? L.nube.y : H(L.nube.x, L.nube.z) + RUTA.nube.alto;
      const NUBE_R = L.nube.r || RUTA.nube.r;
      const BASE_AGUA = () => (isFinite(G.agua.base) ? G.agua.base : G.terreno.waterBase);
      const capaNombre = capa => {
        const izq = ((LEC.preguntas || []).find(q => q.id === 'q3') || {}).opciones;
        const i = RUTA.perchas.findIndex(p => p.capa === capa);
        return izq && izq.izquierda && izq.izquierda[i] ? t(izq.izquierda[i]) : capa;
      };

      // ---------- Marcadores temporales ----------
      function marcador(o) {
        const g = new THREE.Group();
        const glow = new THREE.Sprite(linMat(new THREE.SpriteMaterial({ map: brillo(), color: o.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
        glow.scale.setScalar(o.brillo || 3.2); glow.position.y = o.altoIcono || 1.8; g.add(glow);
        const ico = new THREE.Sprite(linMat(new THREE.SpriteMaterial({ map: icono(o.icono, o.color), transparent: true, depthWrite: false })));
        ico.scale.setScalar(o.escala || 1.1); ico.position.y = o.altoIcono || 1.8; ico.renderOrder = 3; g.add(ico);
        let anillo = null;
        if (o.anillo !== false) {
          anillo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.25, 40), linMat(new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })));
          anillo.rotation.x = -Math.PI / 2; anillo.position.y = 0.06; g.add(anillo);
        }
        g.position.set(o.x, o.y, o.z); g.visible = false; scene.add(g);
        const base = { ico: ico.position.y };
        return {
          g, glow, ico, anillo,
          set icono(n) { ico.material.map = icono(n, o.color); ico.material.needsUpdate = true; },
          animar(now, k) {
            ico.position.y = base.ico + Math.sin(now * 2.4 + o.x) * 0.12;
            glow.material.opacity = 0.55 + Math.sin(now * 3 + o.z) * 0.2;
            glow.scale.setScalar((o.brillo || 3.2) * (1 + Math.sin(now * 3 + o.z) * 0.06) * (k || 1));
            if (anillo) { const s = 1 + ((now * 0.6) % 1) * 0.6; anillo.scale.setScalar(s); anillo.material.opacity = 0.65 * (1 - ((now * 0.6) % 1)); }
          },
        };
      }
      const yS = p => H(p.x, p.z);
      const mkMarcas = marcador({ x: L.marcas.x, y: yS(L.marcas), z: L.marcas.z, icono: 'habla', color: '#f2a03d', altoIcono: 2.3 });
      // Perchas: rama provisional (disco) + aro brillante + ícono + nombre de la capa
      const perchaVis = PERCHAS.map((p, i) => {
        const g = new THREE.Group();
        const disco = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 0.8, 0.22, 24), linMat(new THREE.MeshLambertMaterial({ color: i === 0 ? '#7a5634' : '#8a6a3a' })));
        disco.position.y = -0.11; g.add(disco);
        const hojas = new THREE.Mesh(new THREE.TorusGeometry(p.r * 0.95, 0.16, 6, 18), linMat(new THREE.MeshLambertMaterial({ color: '#3f8f3a' })));
        hojas.rotation.x = Math.PI / 2; g.add(hojas);
        const aro = new THREE.Mesh(new THREE.TorusGeometry(p.r + 0.12, 0.06, 6, 40), linMat(new THREE.MeshBasicMaterial({ color: '#ffe680', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })));
        aro.rotation.x = Math.PI / 2; aro.position.y = 0.05; g.add(aro);
        const m = marcador({ x: 0, y: 0, z: 0, icono: 'hoja', color: '#3f9f5a', altoIcono: 2.2, anillo: false, brillo: 2.6 });
        scene.remove(m.g); m.g.visible = true; g.add(m.g);
        const lbl = new THREE.Sprite(linMat(new THREE.SpriteMaterial({ map: etiquetaTex(capaNombre(p.capa)), transparent: true, depthWrite: false })));
        lbl.scale.set(2.6, 0.65, 1); lbl.position.y = 3.15; lbl.renderOrder = 3; g.add(lbl);
        g.position.set(p.x, p.y, p.z); g.visible = false; scene.add(g);
        const plat = G.fisica.addPercha({ x: p.x, z: p.z, r: p.r, y: p.y, when: () => perchasActivas() });
        return { g, aro, m, lbl, plat, disco };
      });
      const mkTerreno = {
        A: marcador({ x: L.A.x, y: H(L.A.x, L.A.z) + RUTA.terrenos.alto, z: L.A.z, icono: 'ojo', color: '#3d8fb0', escala: 1.6, brillo: 5, altoIcono: 0, anillo: false }),
        B: marcador({ x: L.B.x, y: H(L.B.x, L.B.z) + RUTA.terrenos.alto, z: L.B.z, icono: 'ojo', color: '#3d8fb0', escala: 1.6, brillo: 5, altoIcono: 0, anillo: false }),
      };
      const aguaPoza = () => Math.max(nivelAgua(L.poza.x, L.poza.z), H(L.poza.x, L.poza.z));
      const mkPoza = marcador({ x: L.poza.x, y: aguaPoza(), z: L.poza.z, icono: 'vapor', color: '#5aa9d6', altoIcono: 2.2, brillo: 4 });
      // Nube de la cumbre
      const nube = new THREE.Group();
      const nubeMat = linMat(new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#6b7f8c', transparent: true, opacity: 0.92 }));
      for (const [x, y, z, r] of [[0, 0, 0, 2.6], [2.4, -0.4, 0.6, 2], [-2.3, -0.3, -0.4, 2.1], [0.8, 1.2, -0.8, 1.8], [-0.9, 0.9, 1.1, 1.7], [1.6, 0.2, -2, 1.6], [-1.4, -0.6, 2.1, 1.5]]) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), nubeMat); s.position.set(x, y, z); nube.add(s);
      }
      const nubeGlow = new THREE.Sprite(linMat(new THREE.SpriteMaterial({ map: brillo(), color: '#cfeaff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
      nubeGlow.scale.setScalar(13); nube.add(nubeGlow);
      nube.position.set(L.nube.x, NUBE_Y, L.nube.z); nube.scale.setScalar(Math.max(1, NUBE_R / RUTA.nube.r)); nube.visible = false; scene.add(nube);
      // Vapor (voluta) y gota
      function cuerpoBrillante(color, r, suave) {
        const g = new THREE.Group();
        const core = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), linMat(new THREE.MeshBasicMaterial({ color, transparent: !!suave, opacity: suave ? 0.45 : 1, depthWrite: !suave })));
        g.add(core);
        const gl = new THREE.Sprite(linMat(new THREE.SpriteMaterial({ map: brillo(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
        gl.scale.setScalar(r * (suave ? 10 : 7)); g.add(gl);
        // El vapor es una nubecita: tres esferas translúcidas alrededor del centro
        if (suave) for (const [x, y, z, k] of [[0.45, 0.1, 0.1, 0.7], [-0.4, 0.2, -0.15, 0.65], [0.05, 0.45, -0.3, 0.55]]) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(r * k, 12, 8), core.material); m.position.set(x * r * 2, y * r * 2, z * r * 2); g.add(m);
        }
        g.visible = false; scene.add(g);
        return g;
      }
      const voluta = cuerpoBrillante('#f2fbff', 0.55, true);
      const gota = cuerpoBrillante('#4fb6ff', 0.42);
      const punta = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.6, 14), linMat(new THREE.MeshBasicMaterial({ color: '#4fb6ff' })));
      punta.position.y = 0.48; gota.add(punta);
      // Bocanadas de vapor: sprites suaves que suben, crecen y se desvanecen (estela de la voluta y de la poza)
      const PUFFS = Array.from({ length: 24 }, () => {
        const sp = new THREE.Sprite(linMat(new THREE.SpriteMaterial({ map: brillo(), color: '#f4fbff', transparent: true, opacity: 0, depthWrite: false })));
        sp.visible = false; scene.add(sp); return { sp, t: 0, vida: 0 };
      });
      let puffI = 0;
      function bocanada(x, y, z, tam) {
        const p = PUFFS[puffI++ % PUFFS.length];
        p.sp.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
        p.t = 0; p.vida = 1.6; p.tam = tam || 1.4; p.sp.visible = true;
      }
      G.on('render', dt => {
        for (const p of PUFFS) {
          if (!p.sp.visible) continue;
          p.t += dt; const k = p.t / p.vida;
          if (k >= 1) { p.sp.visible = false; continue; }
          p.sp.position.y += dt * 0.9;
          p.sp.scale.setScalar(p.tam * (0.6 + k * 1.4));
          p.sp.material.opacity = Math.sin(k * Math.PI) * 0.7;
        }
      }, 54);
      G.fx.PALETTE.vapor = ['#ffffff', '#e6f7ff'];
      // Poza: gota del fondo y roca con la marca de la crecida
      const yGotaFondo = H(L.gota.x, L.gota.z) + 0.4;
      // El ícono flota sobre el agua para ver desde la superficie dónde bucear; la gota brilla en el fondo
      const mkGotaPoza = marcador({ x: L.gota.x, y: yGotaFondo, z: L.gota.z, icono: 'gota', color: '#3d8fb0', altoIcono: Math.max(1, aguaPoza() - yGotaFondo + 1.1), anillo: false, brillo: 2.4 });
      const roca = new THREE.Group();
      const yRoca = H(L.roca.x, L.roca.z), altoRoca = Math.max(2.2, aguaPoza() - yRoca + 1.4);
      const rocaM = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), linMat(new THREE.MeshPhongMaterial({ color: '#8f8a80', flatShading: true, shininess: 8 })));
      rocaM.scale.set(1.1, altoRoca / 2, 1.0); rocaM.position.y = altoRoca / 2 - 0.2; roca.add(rocaM);
      const marca = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.16, 16, 1, true), linMat(new THREE.MeshBasicMaterial({ color: '#2d5f7a', side: THREE.DoubleSide })));
      marca.position.y = Math.min(altoRoca - 0.4, aguaPoza() - yRoca + 0.7); roca.add(marca);
      roca.position.set(L.roca.x, yRoca, L.roca.z); roca.visible = false; scene.add(roca);
      const mkRoca = marcador({ x: L.roca.x, y: yRoca + altoRoca, z: L.roca.z, icono: 'roca', color: '#7a6a52', altoIcono: 0.8, anillo: false, brillo: 2.4 });
      // Hallazgo opcional: flamboyán (nativas e introducidas); solo si su ficha está publicada
      const mkFlamboyan = marcador({ x: L.flamboyan.x, y: yS(L.flamboyan), z: L.flamboyan.z, icono: 'flor', color: '#d6403a', altoIcono: 1.9 });

      // ---------- Estado transitorio (no se guarda: al cargar se retoma desde el inicio del paso) ----------
      const T = { voluta: null, gota: null, rioObjetivo: null, pendiente: null, fichasT: 0 };
      let tarjeta = null; // tarjeta de la misión abierta: { reabrir }
      function abrir(html, enlazar, reabrir) {
        tarjeta = { reabrir: reabrir || null };
        G.ui.showCard(html);
        enlazar($('card'));
      }
      function cerrar() { tarjeta = null; G.ui.hideCard(); }
      G.on('cardHidden', () => {
        if (tarjeta && tarjeta.reabrir) T.pendiente = { t: 1.4, fn: tarjeta.reabrir };
        tarjeta = null;
      });
      const say = (lineas, fin) => G.dialogo.say(lineas.map(l => Object.assign({ lang: AU.aj.idioma }, l)), fin);
      const linea = (l, extra) => Object.assign({ who: l.personaje, img: l.personaje === 'Luma' ? IMG.L : IMG.V, text: t(l), lang: AU.aj.idioma }, extra || {});
      const aviso = (txt, ms) => { G.ui.toast(txt, ms || 4500); AU.auto(txt); };
      const opcionesHTML = (ops, orden) => `<div class="row edu-opts">${orden.map(i => `<button class="btn secondary edu-opt" id="ch-${i}" type="button" data-i="${i}">${esc(t(ops[i]))}</button>`).join('')}</div>`;
      const cabecera = (eyebrow, titulo, cara) => `<div class="edu-head">${cara ? `<img class="edu-cara" src="${cara}" alt="">` : ''}<div><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(titulo)}</h2></div></div>`;
      const enfocar = card => { const b = card.querySelector('.edu-opt:not([disabled]), #edu-seguir'); if (b) b.focus(); };

      // ---------- Registro del aula y objetivos ----------
      const OBJ_ORDEN = (LEC.objetivos || []).map(o => o.id);
      function objetivos() {
        const e = E(), f = e.formativa || {}, ok = id => f[id] && f[id] <= 2, preguntado = id => f[id] != null;
        const perchasOk = RUTA.perchas.every(p => e.perchas[p.capa] && e.perchas[p.capa] <= 2);
        const res = [];
        if (perchasOk && (!preguntado('q3') || ok('q3'))) res.push('O1');
        if (e.cadena && e.cadena <= 2 && (!preguntado('q4') || ok('q4'))) res.push('O2');
        if (e.explicacion && e.explicacion <= 2 && ok('q2')) res.push('O3');
        if (ok('q5') && AU.tieneFicha('yagrumo') && AU.tieneFicha('cotorra_nidos')) res.push('O4');
        if (ok('q6')) res.push('O5');
        if (e.contraste && S.builds.length > 0) res.push('O6');
        return OBJ_ORDEN.filter(o => res.includes(o));
      }
      function registrar() {
        const e = E();
        if (!e.inicio && e.inicio !== 0) return;
        const pregs = {};
        for (const id of (LEC.formativa && LEC.formativa.seleccion && LEC.formativa.seleccion['5-6']) || []) pregs[id] = (e.formativa || {})[id] || '';
        AU.registrar({
          pasos_completados: PASOS.filter(id => e.hecho[id]),
          perchas_observadas: RUTA.perchas.filter(p => e.perchas[p.capa]).length,
          cadena_correcta_intento: e.cadena || '',
          prediccion_registrada: !!e.pred1,
          prediccion_coincidio: e.contraste ? e.pred1 === 'lluvia_montana' : '',
          explicacion_ciclo_intento: e.explicacion || '',
          preguntas: pregs,
          objetivos_logrados: objetivos(),
          minutos_mision: e.fin != null ? Math.max(1, Math.round((e.fin - e.inicio) / 60)) : '',
        });
      }
      function hecho(id) {
        const e = E();
        if (e.hecho[id]) return;
        e.hecho[id] = true;
        G.emit('aprendizaje', { tipo: 'paso', id: 'educativa.' + id });
        G.audio.play('unlock');
        AU.desbloquear((paso(id) || {}).diario || []);
        registrar();
        G.misiones.check();
      }

      // ---------- p1 Predecir (y p8: explicar) en las marcas de agua ----------
      function empezar() {
        const e = E();
        if (e.inicio == null) { e.inicio = S.clock; AU.desbloquear(fichasDePaso('inicio')); }
        registrar();
      }
      function predecir(def, guarda, fin) {
        const ops = def.interaccion.opciones, orden = AU.mezclar(ops.length, guarda.length * 7 + 3);
        const pregunta = def.linea || def.interaccion.pregunta;
        const texto = def.linea ? t(def.linea) : t(def.interaccion.pregunta);
        const html = `<div class="edu" lang="${AU.aj.idioma}">${cabecera(u('predice') + ' · ' + t(LEC.meta.titulo), def.linea ? def.linea.personaje : u('nace'), def.linea ? IMG.L : null)}
          <p class="edu-q">${esc(texto)}</p>${opcionesHTML(ops, orden)}<p class="note">${esc(u('sinMala'))}</p>
          <div class="row edu-pie">${AU.btnLeer(texto + ' ' + ops.map(o => t(o)).join('. '))}</div></div>`;
        const reabrir = () => predecir(def, guarda, fin);
        abrir(html, card => {
          for (const b of card.querySelectorAll('.edu-opt')) b.onclick = () => {
            const i = +b.dataset.i;
            E()[guarda] = ops[i].id || String(i);
            E()[guarda + 'i'] = i;
            G.eventos.log('LumaChoice', { choice: guarda + ':' + (ops[i].id || i) });
            cerrar(); fin(i);
          };
          enfocar(card);
        }, reabrir);
        AU.auto(texto);
        return pregunta;
      }
      function usarMarcas() {
        const e = E();
        if (!e.hecho.p1) {
          empezar();
          const p1 = paso('p1');
          say([linea(p1.linea, { mood: 'curious' })], () => predecir(p1, 'pred1', () => {
            say([linea(p1.respuesta, { mood: 'happy' })], () => {
              hecho('p1');
              aviso(tc(paso('p2').instruccion, paso('p2').corto), 5000);
            });
          }));
          return;
        }
        if (e.hecho.p7 && !e.hecho.p8) { explicar(); return; }
        say([{ who: 'Luma', img: IMG.L, text: u('lumaSigue'), mood: 'idea' }]);
      }
      G.interaccion.add({ id: 'marcas_agua', x: L.marcas.x, z: L.marcas.z, r: 2.4,
        visible: () => enMision() && (!E().hecho.p1 || (E().hecho.p7 && !E().hecho.p8)),
        label: () => (E().hecho.p1 ? t(TX.explicar) : t(TX.mirar)), use: usarMarcas });

      // ---------- p2 Capas del bosque (perchas) y p3 cadena en el dosel ----------
      const perchaActual = () => {
        const e = E();
        if (!enMision() || !e.hecho.p1) return null;
        for (const p of PERCHAS) {
          if (!e.perchas[p.capa]) return p;
          if (p.capa === 'dosel' && !e.hecho.p3) return p;
        }
        return null;
      };
      const posado = p => Math.hypot(S.pos.x - p.x, S.pos.z - p.z) < p.r + 0.2 && Math.abs(S.pos.y - p.y) < 0.4 && !G.fisica.MOVE.flying;
      const perchaIntentos = {};
      function observar(p) {
        const e = E();
        if (e.perchas[p.capa]) { if (p.capa === 'dosel' && !e.hecho.p3) cadena(); return; }
        const def = paso('p2').perchas.find(x => x.capa === p.capa), i0 = PERCHAS.indexOf(p);
        const orden = AU.mezclar(def.opciones.length, i0 * 13 + 5, def.correcta);
        perchaIntentos[p.capa] = perchaIntentos[p.capa] || { n: 1, malas: [] };
        const pi = perchaIntentos[p.capa];
        const pintar = msg => {
          const intro = i0 === 0 ? `<p>${esc(tc(paso('p2').instruccion, paso('p2').corto))}</p>` : '';
          abrir(`<div class="edu" lang="${AU.aj.idioma}">${cabecera(`${u('capa')} ${i0 + 1} ${u('de')} ${PERCHAS.length}`, capaNombre(p.capa))}${intro}
            <p class="edu-q">${esc(t(def.observa))}</p>
            <div class="row edu-opts">${orden.map(i => `<button class="btn secondary edu-opt${pi.malas.includes(i) ? ' bad' : ''}" id="ch-${i}" type="button" data-i="${i}"${pi.malas.includes(i) ? ' disabled' : ''}>${esc(t(def.opciones[i]))}</button>`).join('')}</div>
            ${msg ? `<p class="edu-retro pista" role="status">${esc(msg)}</p>` : ''}
            <div class="row edu-pie">${AU.btnLeer(t(def.observa) + ' ' + def.opciones.map(o => t(o)).join('. '))}</div></div>`, card => {
            for (const b of card.querySelectorAll('.edu-opt')) b.onclick = () => elegir(+b.dataset.i);
            enfocar(card);
          });
        };
        function elegir(i) {
          if (i !== def.correcta) {
            pi.malas.push(i); pi.n++; G.audio.play('wrong');
            pintar(t(paso('p2').retro_incorrecta || TX.otraVez)); AU.auto(t(paso('p2').retro_incorrecta || TX.otraVez));
            return;
          }
          e.perchas[p.capa] = Math.min(3, pi.n);
          cerrar();
          G.audio.play('pickup', i0 * 2 + 2); G.camara.hitStop(0.05);
          G.fx.burst(p.x, p.y + 1, p.z, 'gold', 18);
          const nuevas = AU.desbloquear(def.diario || []);
          if (!nuevas.length) aviso(`✓ ${capaNombre(p.capa)} ${u('bien')} (${RUTA.perchas.filter(x => e.perchas[x.capa]).length}/${PERCHAS.length})`, 3000);
          registrar(); G.misiones.renderQuest(); G.guardado.autosave();
          if (p.capa === 'dosel' && !e.hecho.p3) { T.pendiente = { t: 0.6, fn: cadena }; return; }
          if (RUTA.perchas.every(x => e.perchas[x.capa])) {
            hecho('p2');
            say([{ who: 'Vittata', img: IMG.V, text: t(paso('p2').perchas[3].opciones[0]) + '. ' + tc(paso('p4').instruccion, paso('p4').corto), mood: 'happy' }]);
          }
        }
        pintar();
        AU.auto(t(def.observa));
      }
      for (const p of PERCHAS) G.interaccion.add({ id: 'percha_' + p.capa, x: p.x, z: p.z, r: p.r + 0.4,
        visible: () => perchaActual() === p && posado(p),
        label: () => `${u('observar')}: ${capaNombre(p.capa)}`, use: () => observar(p) });

      // p3: cadena alimentaria (3 tarjetas en 3.º–4.º, 5 con descomponedores en 5.º–6.º)
      const alimentoVerificado = () => AU.verificada(AU.ficha('cotorra_alimento'));
      function etiquetaEslabon(k) { const I = paso('p3').interaccion; return k === 'palma_sierra' && !alimentoVerificado() ? ALT.palma_sierra : I.etiquetas[k]; }
      function cadena() {
        const def = paso('p3'), I = def.interaccion;
        const seq = AU.aj.grado === '5-6' ? I.grados_5_6 : I.grados_3_4;
        const orden = AU.mezclar(seq.length, 11, 0).map(k => seq[k]);
        const s = { puestos: [], intento: 1, hecho: false, msg: '', cls: '' };
        const pintar = () => {
          const lista = (s.hecho ? seq : s.puestos).concat(Array(seq.length).fill(null)).slice(0, seq.length);
          abrir(`<div class="edu" lang="${AU.aj.idioma}">${cabecera(u('cadena'), u('cadenaQ'), IMG.V)}
            <p>${esc(tc(TX.ordena, def.corto))}</p>
            <ol class="edu-seq edu-cadena">${lista.map(k => `<li class="${k ? 'ok' : ''}">${k ? esc(t(etiquetaEslabon(k))) : '…'}</li>`).join('')}</ol>
            ${s.hecho ? '' : `<div class="row edu-opts">${orden.filter(k => !s.puestos.includes(k)).map(k => `<button class="btn secondary edu-opt" id="ch-${seq.indexOf(k)}" type="button" data-k="${k}">${esc(t(etiquetaEslabon(k)))}</button>`).join('')}</div>`}
            ${s.msg ? `<p class="edu-retro ${s.cls}" role="status">${esc(s.msg)}</p>` : ''}
            <div class="row edu-pie">${AU.btnLeer(t(TX.cadenaQ) + ' ' + seq.map(k => t(etiquetaEslabon(k))).join(', '))}${s.hecho ? `<button class="btn" id="edu-seguir" type="button" data-icon="play">${esc(AU.u('seguir'))}</button>` : ''}</div></div>`, card => {
            for (const b of card.querySelectorAll('.edu-opt')) b.onclick = () => tocar(b.dataset.k);
            const sg = card.querySelector('#edu-seguir'); if (sg) sg.onclick = terminar;
            enfocar(card);
          }, () => cadena());
        };
        function tocar(k) {
          if (s.hecho) return;
          if (seq[s.puestos.length] === k) {
            s.puestos.push(k); G.audio.play('pickup', s.puestos.length); s.msg = '';
            if (s.puestos.length === seq.length) { s.hecho = true; s.msg = t(I.retro_correcta); s.cls = 'ok'; AU.auto(s.msg); }
            pintar(); return;
          }
          G.audio.play('wrong'); s.puestos = [];
          if (s.intento >= 2) { s.intento = 3; s.hecho = true; s.msg = u('resuelta') + ' ' + t(I.retro_correcta); s.cls = 'asi'; }
          else { s.intento = 2; s.msg = t(I.retro_incorrecta); s.cls = 'pista'; }
          AU.auto(s.msg); pintar();
        }
        function terminar() {
          E().cadena = s.intento;
          cerrar(); hecho('p3');
          G.fx.burst(PERCHAS[2].x, PERCHAS[2].y + 1, PERCHAS[2].z, 'feathers', 20);
          aviso(tc(paso('p2').instruccion, paso('p2').corto), 3500);
        }
        say([linea(def.linea, { mood: 'happy' })], () => { pintar(); AU.auto(t(TX.cadenaQ)); });
      }

      // ---------- p4 Ojos de cotorra ----------
      function verTerreno(k) {
        const e = E();
        e.vistos[k] = true;
        if (!S.evaluated[k]) { S.evaluated[k] = true; G.eventos.log('LandInspected', { parcel: k, desde: 'aire' }); }
        mkTerreno[k].icono = 'check';
        G.audio.play('ring', k === 'A' ? 2 : 4);
        aviso(`${u('terreno')} ${k} · ${G.terreno.places[k] ? G.terreno.places[k].name : ''}: ${u('visto')} (${(e.vistos.A ? 1 : 0) + (e.vistos.B ? 1 : 0)}/2)`, 3000);
        G.misiones.renderQuest(); G.guardado.autosave();
        if (e.vistos.A && e.vistos.B) T.pendiente = { t: 0.9, fn: preguntaTerrenos };
      }
      function preguntaSimple(def, ojo, fin, pista) {
        const I = def.interaccion, orden = AU.mezclar(I.opciones.length, ojo.length + 2, I.correcta), s = { n: 1, malas: [] };
        const pintar = msg => abrir(`<div class="edu" lang="${AU.aj.idioma}">${cabecera(t(LEC.meta.titulo), ojo, IMG.V)}
          <p class="edu-q">${esc(t(I.pregunta))}</p>
          <div class="row edu-opts">${orden.map(i => `<button class="btn secondary edu-opt${s.malas.includes(i) ? ' bad' : ''}" id="ch-${i}" type="button" data-i="${i}"${s.malas.includes(i) ? ' disabled' : ''}>${esc(t(I.opciones[i]))}</button>`).join('')}</div>
          ${msg ? `<p class="edu-retro pista" role="status">${esc(msg)}</p>` : ''}<div class="row edu-pie">${AU.btnLeer(t(I.pregunta) + ' ' + I.opciones.map(o => t(o)).join('. '))}</div></div>`, card => {
          for (const b of card.querySelectorAll('.edu-opt')) b.onclick = () => {
            const i = +b.dataset.i;
            if (i === I.correcta) { cerrar(); fin(Math.min(3, s.n)); return; }
            s.malas.push(i); s.n++; G.audio.play('wrong'); pintar(pista); AU.auto(pista);
          };
          enfocar(card);
        }, () => preguntaSimple(def, ojo, fin, pista));
        pintar(); AU.auto(t(I.pregunta));
      }
      function preguntaTerrenos() {
        const e = E();
        if (e.hecho.p4 || !e.vistos.A || !e.vistos.B) return;
        if (G.ui.busy()) { T.pendiente = { t: 0.8, fn: preguntaTerrenos }; return; }
        preguntaSimple(paso('p4'), t(TX.ojos), n => {
          e.vista = n; hecho('p4');
          aviso(tc(paso('p5').instruccion, paso('p5').corto), 5000);
        }, t(TX.vistaPista));
      }

      // ---------- p5 Nace la gota: vapor de la poza a la nube ----------
      function ruta(puntos) {
        const seg = []; let total = 0;
        for (let i = 0; i < puntos.length - 1; i++) { const a = puntos[i], b = puntos[i + 1], d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); seg.push({ a, b, d }); total += d; }
        return { puntos, seg, total, en(dist) {
          let r = Math.max(0, Math.min(total, dist));
          for (const s of seg) { if (r <= s.d || s === seg[seg.length - 1]) { const k = s.d ? Math.min(1, r / s.d) : 1; return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k, z: s.a.z + (s.b.z - s.a.z) * k }; } r -= s.d; }
          return puntos[puntos.length - 1];
        } };
      }
      // Velocidad de un tramo: las rutas largas del mapa nuevo van más rápido, sin pasar la del vuelo (12 m/s)
      const velTramo = (r, base) => Math.min(11, Math.max(base, r.total / 20));
      function rutaVapor() {
        const p0 = { x: L.poza.x, y: aguaPoza() + 0.3, z: L.poza.z }, p3 = { x: L.nube.x, y: NUBE_Y, z: L.nube.z };
        if (RG && RG.vapor && RG.vapor.length > 1) return ruta([p0, ...RG.vapor.slice(1, -1).map(xyz), p3]);
        const pts = [];
        for (let k = 0; k <= 24; k++) {
          const s = k / 24, e = s * s * (3 - 2 * s);
          const x = p0.x + (p3.x - p0.x) * e, z = p0.z + (p3.z - p0.z) * e;
          const base = p0.y + (p3.y - p0.y) * Math.sqrt(s);
          pts.push({ x, y: Math.max(base, H(x, z) + 3), z });
        }
        return ruta(pts);
      }
      function iniciarVapor() { const r = rutaVapor(); T.voluta = { r, vel: velTramo(r, RUTA.velocidad.vapor), d: 0, llego: false, humo: 0 }; voluta.visible = true; nube.visible = true; aviso(`${t(PROCESOS.evaporacion)}: ${tc(paso('p5').instruccion, paso('p5').corto)}`, 5000); }
      function enNube() {
        const e = E();
        if (e.hecho.p5) return;
        T.voluta = null; voluta.visible = false;
        G.fx.burst(L.nube.x, NUBE_Y, L.nube.z, 'vapor', 30);
        aviso(`${t(PROCESOS.condensacion)}: ${t(paso('p8').interaccion.frases[1])}`, 4000);
        predecir(paso('p5'), 'pred2', () => { hecho('p5'); iniciarGota(); });
      }

      // ---------- p6 Sigue la gota y p7 la poza ----------
      function iniciarGota() {
        const seg = (puntos, fase, vel, alFinal, texto) => { const r = ruta(puntos); return { r, fase, vel: velTramo(r, vel), alFinal, texto }; };
        const yB = H(L.bromelia.x, L.bromelia.z);
        const nubeP = { x: L.nube.x, y: NUBE_Y - 1.5, z: L.nube.z }, brom = { x: L.bromelia.x, y: yB + RUTA.bromelia.alto, z: L.bromelia.z };
        let suelo = { x: L.bromelia.x, y: yB + 0.5, z: L.bromelia.z };
        let lluvia = [nubeP, brom], corr = [suelo];
        T.restoRio = null;
        if (RG && RG.lluvia && RG.escorrentia && RG.escorrentia.length > 2) {
          // Mapa nuevo: la gota llueve sobre las bromelias, corre por la quebrada y el río (escorrentía) y se para junto al terreno A
          lluvia = [nubeP, ...RG.lluvia.map(xyz).map(q => ({ x: q.x, y: q.y + 0.4, z: q.z }))];
          // Se infiltra justo debajo de la última bromelia (nunca en línea recta a través de la montaña)
          const ul = lluvia[lluvia.length - 1];
          suelo = { x: ul.x, y: H(ul.x, ul.z) + 0.5, z: ul.z };
          const esc = RG.escorrentia.map(xyz).map(q => ({ x: q.x, y: q.y + 0.4, z: q.z }));
          const A0 = L.A; let k = 0, best = Infinity;
          esc.forEach((q, i) => { const d = Math.hypot(q.x - A0.x, q.z - A0.z); if (d < best) { best = d; k = i; } });
          corr = [suelo, ...esc.slice(0, k + 1)].map(q => ({ x: q.x, y: Math.max(q.y, H(q.x, q.z) + 0.3), z: q.z }));
          T.restoRio = esc.slice(k);
        } else {
          const n = Math.max(2, Math.ceil(Math.hypot(L.rio.x - suelo.x, L.rio.z - suelo.z) / 3));
          for (let k = 1; k <= n; k++) { const x = suelo.x + (L.rio.x - suelo.x) * k / n, z = suelo.z + (L.rio.z - suelo.z) * k / n; corr.push({ x, y: Math.max(H(x, z), nivelAgua(x, z)) + 0.5, z }); }
        }
        const sec = paso('p6').secuencia, en = AU.aj.idioma === 'en';
        const bromeliaOK = AU.verificada(AU.ficha('bromelia'));
        const cap = (i, alt) => (en ? SECUENCIA_EN[i] : sec[i]) && (i !== 0 || bromeliaOK) ? (en ? SECUENCIA_EN[i] : sec[i]) : t(alt);
        T.gota = { i: 0, d: 0, espera: 0, tramos: [
          seg(lluvia, 'precipitacion', RUTA.velocidad.lluvia, null, () => `${t(PROCESOS.precipitacion)}: ${cap(0, ALT.caida)}`),
          seg([lluvia[lluvia.length - 1], suelo], 'infiltracion', 2.2, null, () => `${t(PROCESOS.infiltracion)}: ${cap(1)}`),
          seg(corr, 'escorrentia', RUTA.velocidad.suelo, () => crecida(), () => `${t(PROCESOS.escorrentia)}: ${cap(2)}`),
        ] };
        gota.visible = true; nube.visible = true;
        G.fx.rain.visible = true; T.lluvia = 4;
        mostrarTramo();
      }
      function mostrarTramo() { const tr = T.gota && T.gota.tramos[T.gota.i]; if (tr && tr.texto) aviso(tr.texto(), 5000); }
      function crecida() {
        T.rioObjetivo = BASE_AGUA() + RUTA.crecidaRio;
        T.gota.parada = true;
        T.pendiente = { t: 1.6, fn: preguntaRio };
      }
      function preguntaRio() {
        const e = E();
        if (e.hecho.p6) return;
        if (G.ui.busy()) { T.pendiente = { t: 0.8, fn: preguntaRio }; return; }
        preguntaSimple(paso('p6'), t(TX.sigue), n => { e.rio = n; hecho('p6'); bajarAPoza(); }, t(TX.otraVez));
      }
      function bajarAPoza() {
        const a = { x: L.rio.x, y: Math.max(H(L.rio.x, L.rio.z), nivelAgua(L.rio.x, L.rio.z)) + 0.4, z: L.rio.z };
        const b = { x: L.poza.x, y: aguaPoza() + 0.3, z: L.poza.z }, c = { x: L.gota.x, y: yGotaFondo, z: L.gota.z };
        const rr = ruta(T.restoRio && T.restoRio.length ? [...T.restoRio, b, c] : [a, b, c]);
        T.gota = { i: 0, d: 0, tramos: [{ r: rr, fase: 'poza', vel: velTramo(rr, RUTA.velocidad.rio), alFinal: () => { T.gota = null; gota.position.set(L.gota.x, yGotaFondo, L.gota.z); }, texto: () => tc(paso('p7').instruccion, paso('p7').corto) }] };
        gota.visible = true; nube.visible = false;
        mostrarTramo();
      }
      function hallazgoPoza(k) {
        const e = E();
        if (e.poza[k]) return;
        e.poza[k] = true;
        G.audio.play('pickup', k === 'gota' ? 4 : 6); G.camara.hitStop(0.05);
        const p = k === 'gota' ? L.gota : L.roca;
        G.fx.burst(p.x, k === 'gota' ? yGotaFondo + 0.5 : yRoca + altoRoca, p.z, 'bubbles', 16, S.water);
        aviso(u(k === 'gota' ? 'gotaHallada' : 'marcaHallada'), 3000);
        G.guardado.autosave();
        if (e.poza.gota && e.poza.marca) {
          // La gota brilla, sube como vapor y el ciclo se cierra
          T.subida = { t: 0 };
          say([linea(paso('p7').linea, { mood: 'happy' })], () => {
            hecho('p7'); T.rioObjetivo = BASE_AGUA();
            aviso(u('lumaCuenta'), 4500);
          });
        }
      }

      // ---------- p8 Explícale a Luma, Predije / Vi y "Luma te pregunta" ----------
      const expl = { puestas: [], fallos: 0 };
      function explicar() {
        const e = E();
        if (e.explicacion) { contraste(); return; }
        const I = paso('p8').interaccion, fr = I.frases, orden = AU.mezclar(fr.length, 23, I.correcta[0]);
        const pintar = msg => {
          const sig = I.correcta[expl.puestas.length];
          abrir(`<div class="edu" lang="${AU.aj.idioma}">${cabecera(u('explicale'), 'Luma', IMG.L)}
            <p>${esc(t(I.instruccion))}</p>
            <ol class="edu-seq" aria-label="${esc(u('tuExplicacion'))}">${expl.puestas.map(i => `<li class="ok">${esc(t(fr[i]))}</li>`).join('')}</ol>
            <div class="row edu-opts">${orden.filter(i => !expl.puestas.includes(i)).map(i => `<button class="btn secondary edu-opt${expl.fallos >= 2 && i === sig ? ' brilla' : ''}" id="ch-${i}" type="button" data-i="${i}">${esc(t(fr[i]))}</button>`).join('')}</div>
            ${msg ? `<p class="edu-retro pista" role="status">${esc(msg)}</p>` : ''}
            <div class="row edu-pie">${AU.btnLeer(t(I.instruccion))}</div></div>`, card => {
            for (const b of card.querySelectorAll('.edu-opt')) b.onclick = () => elegir(+b.dataset.i);
            enfocar(card);
          });
        };
        function elegir(i) {
          if (I.correcta[expl.puestas.length] === i) {
            expl.puestas.push(i); G.audio.play('pickup', expl.puestas.length);
            if (expl.puestas.length === fr.length) {
              e.explicacion = expl.fallos === 0 ? 1 : expl.fallos <= 2 ? 2 : 3;
              cerrar(); registrar(); G.guardado.autosave();
              G.fx.burst(S.pos.x, S.pos.y + 1.5, S.pos.z, 'gold', 24);
              contraste();
              return;
            }
            pintar(); return;
          }
          expl.fallos++; G.audio.play('wrong');
          const msg = expl.fallos >= 2 ? u('brilla') : u('despues');
          pintar(msg); AU.auto(msg);
        }
        pintar();
        AU.auto(t(I.instruccion));
      }
      function textoPrediccion(def, i) { return i != null && def.interaccion.opciones[i] ? t(def.interaccion.opciones[i]) : u('sinPred'); }
      function contraste() {
        const e = E(), I = paso('p8').interaccion, fr = I.frases;
        const acerto = e.pred1 === 'lluvia_montana';
        const luma = acerto ? I.contraste_prediccion.si_acerto : I.contraste_prediccion.si_no;
        const vi1 = t(fr[2]) + ' ' + t(fr[3]), vi2 = t(fr[1]);
        const fila = (q, pred, vi) => `<div class="edu-cmp-fila"><b>${esc(q)}</b><p><span>${esc(u('predije'))}</span>${esc(pred)}</p><p><span>${esc(u('vi'))}</span>${esc(vi)}</p></div>`;
        abrir(`<div class="edu" lang="${AU.aj.idioma}">${cabecera(t(LEC.meta.titulo), u('predijeVi'), IMG.L)}
          <div class="edu-cmp">${fila(u('agua'), textoPrediccion(paso('p1'), e.pred1i), vi1)}${fila(u('vapor'), textoPrediccion(paso('p5'), e.pred2i), vi2)}</div>
          <p class="edu-luma">${esc(t(luma))}</p>
          <div class="row edu-pie">${AU.btnLeer(t(luma))}<button class="btn" id="edu-seguir" type="button" data-icon="play">${esc(AU.u('seguir'))}</button></div></div>`, card => {
          card.querySelector('#edu-seguir').onclick = () => { e.contraste = true; registrar(); cerrar(); formativa(); };
          enfocar(card);
        });
        AU.auto(t(luma));
      }
      function idsFormativa() {
        const sel = (LEC.formativa && LEC.formativa.seleccion && LEC.formativa.seleccion[AU.aj.grado]) || [];
        // q7 (nativas e introducidas) se abre con el hallazgo opcional del flamboyán
        return sel.filter(id => AU.preguntaPublicable(AU.pregunta(id)) && (id !== 'q7' || AU.tieneFicha('flamboyan')));
      }
      function formativa() {
        const e = E(), ids = idsFormativa();
        const todas = ids.every(id => (e.formativa || {})[id]);
        const cab = (i, n) => `${cabecera(t(LEC.meta.titulo), u('lumaPregunta'), IMG.L)}<div class="edu-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<span class="${k < i ? 'ok' : k === i ? 'now' : ''}"></span>`).join('')}</div>`;
        const correr = () => AU.serie(ids, { cabecera: cab, alResponder: () => registrar(), alTerminar: () => {
          G.ui.hideCard();
          say([{ who: 'Luma', img: IMG.L, text: u('finFormativa'), mood: 'happy' }, linea(paso('p8').cierre, { mood: 'idea' })], terminarMision);
        } });
        if (todas) { correr(); return; }
        say([{ who: 'Luma', img: IMG.L, text: u('introFormativa'), mood: 'curious' }], correr);
      }
      function terminarMision() {
        const e = E();
        e.fin = S.clock;
        hecho('p8'); // completa la misión (pava) y la historia pasa a elegir terreno
        registrar();
      }

      // ---------- Fichas que llegan con la historia (después de la misión) ----------
      const FICHAS = LEC.diario || [];
      const fichasDePaso = p => FICHAS.filter(f => f.paso === p).map(f => f.id);
      const MOMENTOS = [
        { paso: 'construir refugio', hay: () => G.eventos.had('ShelterConstructed') && !S.event },
        { paso: 'crecida', hay: () => G.eventos.had('ShelterFlooded') || G.eventos.had('ShelterRelocated') || (S.builds.length > 0 && !S.event && G.eventos.had('ShelterConstructed') && S.refuge && !S.refuge.damaged && S.step >= 5) },
        { paso: 'mirador', hay: () => G.eventos.had('LocationDiscoveredMirador') },
      ];

      // Distancia del jugador a la voluta o a la gota; si va bajo tierra (infiltración) se mide contra la superficie
      const distA = p => Math.hypot(S.pos.x - p.x, S.pos.y - Math.max(p.y, H(p.x, p.z) + 0.5), S.pos.z - p.z);

      // ---------- Bucle de la misión ----------
      G.on('update', (dt, busy) => {
        const e = E();
        if (T.pendiente && !busy) { T.pendiente.t -= dt; if (T.pendiente.t <= 0) { const f = T.pendiente.fn; T.pendiente = null; f(); } }
        if (T.lluvia > 0) { T.lluvia -= dt; if (T.lluvia <= 0 && !S.event) G.fx.rain.visible = false; }
        // Nivel del río: sube con la escorrentía (p6) y baja al cerrar el ciclo (p7)
        if (T.rioObjetivo != null && !S.event) {
          const y = S.water + (T.rioObjetivo - S.water) * Math.min(1, dt * 1.2);
          G.agua.setLevel(Math.abs(y - T.rioObjetivo) < 0.005 ? T.rioObjetivo : y);
          if (S.water === T.rioObjetivo && T.rioObjetivo === BASE_AGUA()) T.rioObjetivo = null;
        }
        // Fichas por momentos de la historia y el flamboyán
        if ((T.fichasT -= dt) <= 0 && !busy) {
          T.fichasT = 0.5;
          if (e.inicio != null) for (const m of MOMENTOS) if (m.hay()) { const n = AU.desbloquear(fichasDePaso(m.paso)); if (n.length) { registrar(); break; } }
        }
        if (!busy && AU.publicada(AU.ficha('flamboyan')) && !AU.tieneFicha('flamboyan') && Math.hypot(S.pos.x - L.flamboyan.x, S.pos.z - L.flamboyan.z) < 2.2) {
          AU.desbloquear(['flamboyan']); G.fx.burst(L.flamboyan.x, yS(L.flamboyan) + 1.2, L.flamboyan.z, 'feathers', 18);
        }
        if (!enMision() || busy) return;
        // p4: ver los terrenos desde arriba
        if (e.hecho.p2 && e.hecho.p3 && !e.hecho.p4) for (const k of ['A', 'B']) {
          const p = L[k];
          if (!e.vistos[k] && Math.hypot(S.pos.x - p.x, S.pos.z - p.z) < RUTA.terrenos.r && S.pos.y - H(p.x, p.z) > RUTA.terrenos.sobre) verTerreno(k);
        }
        // p5: acercarse a la poza suelta el vapor; la voluta espera si el jugador se aleja
        if (e.hecho.p4 && !e.hecho.p5) {
          if (!T.voluta && Math.hypot(S.pos.x - L.poza.x, S.pos.z - L.poza.z) < 8) iniciarVapor();
          const V = T.voluta;
          if (V) {
            const p = V.r.en(V.d), lejos = distA(p) > RUTA.espera;
            if (!lejos && V.d < V.r.total) V.d += V.vel * dt;
            const q = V.r.en(V.d); voluta.position.set(q.x, q.y, q.z);
            if ((V.humo -= dt) <= 0) { V.humo = 0.15; bocanada(q.x, q.y - 0.4, q.z, 2.2); G.fx.burst(q.x, q.y - 0.3, q.z, 'bubbles', 3); }
            if (V.d >= V.r.total && Math.hypot(S.pos.x - L.nube.x, S.pos.y - NUBE_Y, S.pos.z - L.nube.z) < NUBE_R + 1.5) enNube();
          }
        }
        // p6–p7: la gota recorre sus tramos y espera al jugador
        const Gt = T.gota;
        if (Gt && !Gt.parada) {
          const tr = Gt.tramos[Gt.i], p = tr.r.en(Gt.d);
          const lejos = distA(p) > RUTA.espera;
          if (!lejos) Gt.d += tr.vel * dt;
          const q = tr.r.en(Gt.d); gota.position.set(q.x, q.y, q.z);
          if ((Gt.rastro = (Gt.rastro || 0) - dt) <= 0) { Gt.rastro = 0.3; G.fx.burst(q.x, q.y, q.z, tr.fase === 'precipitacion' ? 'vapor' : 'bubbles', 3); }
          if (Gt.d >= tr.r.total) {
            if (tr.alFinal) tr.alFinal();
            if (T.gota === Gt && !Gt.parada) { Gt.i++; Gt.d = 0; if (Gt.i >= Gt.tramos.length) T.gota = null; else mostrarTramo(); }
          }
        }
        // p7: bucear hasta la gota y la marca de la crecida
        if (e.hecho.p6 && !e.hecho.p7 && !T.gota) {
          if (!e.poza.gota && Math.hypot(S.pos.x - L.gota.x, S.pos.z - L.gota.z) < 1.9 && S.pos.y - H(L.gota.x, L.gota.z) < 1.8) hallazgoPoza('gota');
          if (!e.poza.marca && Math.hypot(S.pos.x - L.roca.x, S.pos.z - L.roca.z) < 2.8 && S.pos.y < S.water + 1.2) hallazgoPoza('marca');
        }
      }, 47);

      // ---------- Visibilidad y animación de los marcadores ----------
      G.on('render', (dt, tt) => {
        const e = E(), now = performance.now() / 1000, mis = enMision();
        mkMarcas.g.visible = mis && (!e.hecho.p1 || (e.hecho.p7 && !e.hecho.p8));
        const pa = perchaActual(), activas = perchasActivas();
        perchaVis.forEach((v, i) => {
          const p = PERCHAS[i], hechaP = !!e.perchas[p.capa] && !(p.capa === 'dosel' && !e.hecho.p3);
          v.g.visible = activas;
          if (!activas) return;
          const yo = pa === p;
          v.m.g.visible = yo || hechaP; v.m.icono = hechaP ? 'check' : 'hoja';
          v.m.ico.scale.setScalar(hechaP ? 0.7 : 1.1); v.m.glow.visible = !hechaP;
          v.aro.material.opacity = yo ? 0.55 + Math.sin(now * 4) * 0.3 : hechaP ? 0.35 : 0.12;
          v.lbl.visible = yo; // el nombre de la capa solo sobre la percha que toca
          if (yo) v.m.animar(now);
        });
        for (const k of ['A', 'B']) { const m = mkTerreno[k]; m.g.visible = mis && e.hecho.p3 && e.hecho.p2 && !e.hecho.p4; if (m.g.visible) m.animar(now); }
        mkPoza.g.visible = mis && e.hecho.p4 && !e.hecho.p5 && !T.voluta;
        if (mkPoza.g.visible && dt > 0 && Math.random() < dt * 4) bocanada(L.poza.x + (Math.random() - 0.5) * 3, aguaPoza() + 0.2, L.poza.z + (Math.random() - 0.5) * 3, 1.2);
        nube.visible = mis && e.hecho.p4 && !e.hecho.p6 && (!!T.voluta || e.hecho.p5 || T.gota != null);
        if (nube.visible) {
          nube.rotation.y += dt * 0.05;
          const lluvia = e.hecho.p5;
          nubeMat.color.setRGB(lluvia ? 0.55 : 1, lluvia ? 0.6 : 1, lluvia ? 0.66 : 1);
          nubeGlow.material.opacity = 0.35 + Math.sin(now * 2) * 0.1;
        }
        if (voluta.visible) voluta.scale.setScalar(1 + Math.sin(now * 5) * 0.12);
        if (gota.visible) { gota.rotation.y += dt * 2; gota.children[1].material.opacity = 0.7 + Math.sin(now * 6) * 0.25; }
        const p7 = mis && e.hecho.p6 && !e.hecho.p7 && !T.gota;
        roca.visible = mis && e.hecho.p6 && !e.hecho.p8;
        mkGotaPoza.g.visible = p7 && !e.poza.gota; mkRoca.g.visible = p7 && !e.poza.marca;
        if (p7 && !T.subida) gota.visible = !e.poza.gota;
        if (T.subida && e.hecho.p6) {
          T.subida.t += dt;
          const k = Math.min(1, T.subida.t / 2.5);
          gota.visible = k < 1; gota.position.set(L.gota.x, yGotaFondo + k * 9, L.gota.z);
          if (Math.random() < 0.3) G.fx.burst(L.gota.x, yGotaFondo + k * 9, L.gota.z, 'vapor', 3);
          if (k >= 1) T.subida = null;
        }
        for (const m of [mkMarcas, mkPoza, mkGotaPoza, mkRoca]) if (m.g.visible) m.animar(now);
        mkFlamboyan.g.visible = AU.publicada(AU.ficha('flamboyan')) && !AU.tieneFicha('flamboyan');
        if (mkFlamboyan.g.visible) mkFlamboyan.animar(now);
      }, 53);

      // Al cargar o reiniciar: lo transitorio vuelve al inicio del paso actual
      G.on('apply', () => {
        tarjeta = null; Object.assign(T, { voluta: null, gota: null, rioObjetivo: null, pendiente: null, subida: null, lluvia: 0, restoRio: null });
        voluta.visible = gota.visible = false; expl.puestas = []; expl.fallos = 0;
        for (const k in perchaIntentos) delete perchaIntentos[k];
        const e = E();
        for (const k of ['A', 'B']) mkTerreno[k].icono = e.vistos && e.vistos[k] ? 'check' : 'ojo';
        if (e.hecho && e.hecho.p5 && !e.hecho.p6) T.pendiente = { t: 0.3, fn: () => { if (enMision() && E().hecho.p5 && !E().hecho.p6 && !T.gota) iniciarGota(); } };
        if (e.hecho && e.hecho.p6 && !e.hecho.p7) T.pendiente = { t: 0.3, fn: () => { if (enMision() && E().hecho.p6 && !E().hecho.p7 && !T.gota) bajarAPoza(); } };
        // Una pregunta automática que quedó sin contestar al guardar se vuelve a hacer
        if (e.hecho && e.vistos && e.vistos.A && e.vistos.B && !e.hecho.p4) T.pendiente = { t: 0.5, fn: preguntaTerrenos };
      }, 48);
      // El idioma cambia los nombres de las capas sobre las perchas
      G.on('aula', k => {
        if (k !== 'idioma') return;
        perchaVis.forEach((v, i) => { v.lbl.material.map = etiquetaTex(capaNombre(PERCHAS[i].capa)); v.lbl.material.needsUpdate = true; });
      });

      // ---------- HUD, guía y API para la historia y las pruebas ----------
      function hud() { return `${u('hud')} ${PASOS.filter(id => E().hecho[id]).length}/${PASOS.length}`; }
      function textoPaso() {
        const id = actual() || 'p8', e = E(), def = paso(id);
        let extra = '';
        if (id === 'p2' || (id === 'p3' && !e.perchas.dosel)) extra = ` (${RUTA.perchas.filter(p => e.perchas[p.capa]).length}/${PERCHAS.length})`;
        if (id === 'p4') extra = ` (${(e.vistos.A ? 1 : 0) + (e.vistos.B ? 1 : 0)}/2)`;
        const shown = id === 'p3' && !e.perchas.dosel ? paso('p2') : def;
        return `${t(LEC.meta.titulo)}: ${t(shown.corto)}${extra}`;
      }
      function guia() {
        if (!enMision()) return null;
        const e = E(), id = actual();
        if (!id) return null;
        if (id === 'p1' || id === 'p8') return e.hecho.p7 || id === 'p1' ? { x: L.marcas.x, z: L.marcas.z } : null;
        if (id === 'p2' || id === 'p3') { const p = perchaActual(); return p ? { x: p.x, z: p.z, y: p.y + 0.4 } : null; }
        if (id === 'p4') { const k = !e.vistos.A && !e.vistos.B ? (Math.hypot(S.pos.x - L.A.x, S.pos.z - L.A.z) < Math.hypot(S.pos.x - L.B.x, S.pos.z - L.B.z) ? 'A' : 'B') : !e.vistos.A ? 'A' : 'B'; const p = L[k]; return { x: p.x, z: p.z, y: H(p.x, p.z) + RUTA.terrenos.alto }; }
        if (id === 'p5') { if (!T.voluta) return { x: L.poza.x, z: L.poza.z }; const q = T.voluta.r.en(T.voluta.d); return T.voluta.d >= T.voluta.r.total ? { x: L.nube.x, z: L.nube.z, y: NUBE_Y } : { x: q.x, z: q.z, y: q.y }; }
        if (id === 'p6' || (id === 'p7' && T.gota)) { const g = gota.visible ? gota.position : null; return g ? { x: g.x, z: g.z, y: Math.max(g.y, H(g.x, g.z) + 0.5) } : { x: L.rio.x, z: L.rio.z }; }
        if (id === 'p7') { const p = !e.poza.gota ? L.gota : L.roca; return { x: p.x, z: p.z, y: !e.poza.gota ? yGotaFondo + 0.5 : yRoca + altoRoca }; }
        return null;
      }
      function lineaLuma() {
        const e = E();
        return { who: 'Luma', img: IMG.L, lang: AU.aj.idioma, mood: 'idea', text: !e.hecho.p1 ? u('lumaVe') : e.hecho.p7 ? u('lumaCuenta') : u('lumaSigue') };
      }

      C.edu = {
        L, PERCHAS, origen, mapaActivo, poi, actual, hud, textoPaso, guia, lineaLuma, objetivos, idsFormativa,
        usarMarcas, observar, cadena, explicar, contraste, formativa, posado, perchaActual,
        estado: () => ({ actual: actual(), voluta: !!T.voluta, vapor: T.voluta ? T.voluta.d / T.voluta.r.total : 0,
          gota: T.gota ? { tramo: T.gota.i, fase: T.gota.tramos[T.gota.i].fase, parada: !!T.gota.parada } : null, agua: S.water, tarjeta: !!tarjeta }),
        nube: () => ({ x: L.nube.x, y: NUBE_Y, z: L.nube.z, r: NUBE_R }),
        mapa: () => !!MM,
        gotaPos: () => (gota.visible ? { x: gota.position.x, y: gota.position.y, z: gota.position.z } : null),
        volutaPos: () => (voluta.visible ? { x: voluta.position.x, y: voluta.position.y, z: voluta.position.z } : null),
        fondo: { gota: () => ({ x: L.gota.x, y: yGotaFondo, z: L.gota.z }), roca: () => ({ x: L.roca.x, y: yRoca, z: L.roca.z }) },
        visual: { mkMarcas, perchaVis, mkTerreno, mkPoza, nube, voluta, gota, roca, mkFlamboyan },
        marcador, // marcador temporal (brillo + ícono) para otras piezas del pack, p. ej. las paradas de aprendizaje
      };
    },
  });
})();
