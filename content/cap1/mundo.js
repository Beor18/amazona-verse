/* Content pack cap1 · mundo: El Yunque (mapa del level designer) o, si no cargó su .js, la Villa Raíz analítica de antes
   - Mapa: assets/data/mapa_cap1.js (AV_MAPA_CAP1) y mapa_cap1_altura.js. Lugares, POIs, agua, colisiones, flora y edificios
     salen de ahí; aquí quedan la ambientación (cielo, luz, niebla, post), la escala de los edificios de Kelvin con la cotorra,
     y reubicar(pack): mueve en sitio recursos, Diario, coquíes y aparición a las coordenadas del mapa (por id).
   - Piezas propias del capítulo construidas en preparar(G): taller de Vittata (bohío y toldo del kit de Kelvin), máquina,
     transmisor, banco, estacas de los terrenos, marcas de agua, mirador (marcador) y el refugio que construye el jugador.
   Las piezas que necesita la historia quedan en G.c (espacio privado del pack). */
(function () {
  'use strict';
  const D = window.AV_MAPA_CAP1 || null;      // mapa de El Yunque (null: mundo analítico de respaldo)
  const M = (D && D.misiones) || {};
  const INFO_A = { Área: '64 m²', Elevación: 'baja, a la orilla del río', Acceso: 'corto, cerca de Villa Raíz', 'Señal de riesgo': 'marcas de agua a 1 m en los árboles', Hábitat: 'nidos de ribera cerca' };
  const INFO_B = { Área: '64 m²', Elevación: 'alta, sobre la colina', Acceso: 'largo, cuesta arriba', 'Señal de riesgo': 'ninguna visible', Hábitat: 'bosque seco, sin nidos' };
  const POOL = M.POOL ? { x: M.POOL.x, z: M.POOL.z } : { x: 30, z: -18 }; // poza honda del río (misión de buceo)
  const DL = D ? D.lugares : null;
  const LUGARES = D ? {
    taller: { x: DL.taller.x, z: DL.taller.z, r: DL.taller.r || 7 },
    villa: { x: DL.villa.x, z: DL.villa.z, r: DL.villa.r || 8 },
    A: { x: DL.A.x, z: DL.A.z, r: DL.A.r || 7, half: DL.A.half || 4, name: 'Junto al río', info: INFO_A },
    B: { x: DL.B.x, z: DL.B.z, r: DL.B.r || 7, half: DL.B.half || 4, name: 'La colina', info: INFO_B },
    mirador: { x: DL.mirador.x, z: DL.mirador.z, r: 2.5 },
  } : {
    taller: { x: -9, z: -7, r: 7 }, villa: { x: 3, z: 1, r: 6 },
    A: { x: 20, z: 6, r: 7, half: 4, name: 'Junto al río', info: INFO_A },
    B: { x: -24, z: 20, r: 7, half: 4, name: 'La colina', info: INFO_B },
    mirador: { x: -30, z: 33, r: 2.5 },
  };
  // Árboles con marcas de agua junto al río (señal de riesgo del terreno A): en el mapa son tabonucos héroe
  const MARK_TREES = D && M.markTrees ? M.markTrees.map(t => ({ x: t.x, z: t.z, s: t.s || 1, copa: true })) : [{ x: 16.5, z: 11.5, s: 1.1, copa: true }, { x: 24.5, z: 1.2, s: 1, copa: true }];

  // POIs que pide la misión educativa ("La ruta de la gota") y que salen de los datos del mapa
  function poisExtra() {
    if (!D) return [];
    const out = [], P = (id, nombre, x, y, z) => out.push({ id, nombre, x, y, z });
    if (M.markTrees && M.markTrees[0]) P('marcas_agua', 'Árbol con marcas de agua', M.markTrees[0].x, null, M.markTrees[0].z);
    for (const p of M.perchas || []) P('percha_' + p.id, 'Percha · ' + p.id, p.x, p.y, p.z);
    const RG = M.rutaGota || {};
    if (RG.nube) P('nube_lluvia', 'Nube sobre la cumbre', RG.nube.x, RG.nube.y, RG.nube.z);
    const dosel = (M.perchas || []).find(p => p.id === 'dosel');
    if (dosel) P('bromelia_dosel', 'Bromelia en el dosel', dosel.x + 0.6, dosel.y + 0.4, dosel.z);
    if (M.POOL) P('gota_poza', 'Fondo de la Poza Honda', M.POOL.x, M.POOL.nivel - M.POOL.profundidad + 0.3, M.POOL.z);
    if (RG.marcaCrecida) P('roca_crecida', 'Roca con la marca de crecida', RG.marcaCrecida.x, RG.marcaCrecida.y, RG.marcaCrecida.z);
    // orilla del río más cercana al terreno A
    const A = LUGARES.A, rio = D.agua && D.agua.rio && D.agua.rio.puntos;
    if (rio) {
      let best = null, bd = 1e9;
      for (const q of rio) { const d = Math.hypot(q[0] - A.x, q[1] - A.z); if (d < bd) { bd = d; best = q; } }
      if (best) { const k = (best[3] + 1.2) / Math.max(bd, 1e-3); P('rio_terrenoA', 'Orilla del río junto al terreno A', best[0] + (A.x - best[0]) * k, null, best[1] + (A.z - best[1]) * k); }
    }
    const plaza = (D.pois || []).find(p => p.id === 'plaza');
    const fls = ((D.flora && D.flora.heroes) || []).filter(h => h.especie === 'flamboyan');
    if (plaza && fls.length) {
      fls.sort((a, b) => Math.hypot(a.pos[0] - plaza.pos[0], a.pos[2] - plaza.pos[2]) - Math.hypot(b.pos[0] - plaza.pos[0], b.pos[2] - plaza.pos[2]));
      P('flamboyan_plaza', 'Flamboyán de la plaza', fls[0].pos[0], null, fls[0].pos[2]);
    }
    return out;
  }
  // Plaza y props de cada asentamiento (AY2, MAPA_PLAN_COMPLETO F2.3). Generado por tools/build/plazas_asentamientos.py: el
  // hueco que dejó el layout de Kelvin (ninguna pieza suya se mueve), plano, en seco y lejos de lo jugable. props =
  // [modelo del kit, x, y, z, rotY]; entran en la escena como piezas de su zona (reubicar) y el suelo pasa a tierra bajo la
  // plaza y alrededor de cada pieza (sueloPlazas → mundo.suelo.plazas de terreno.js).
  // 28-oct: en las 12 aldeas de madera la losa_piedra (una caja de piso Ancient de 8,5 × 1,7 m, suelta en el claro) se leía
  // como un bloque blanco; pasa a toldo_pequeno, del kit Savage. Las dos ruinas de piedra conservan sus losas.
  const PLAZAS = [
    { id: 'kelvin_ruinas_yunque', plaza: { x: -33.9, z: -144.5, r: 8.7 }, props: [['losa_piedra', -36.9, 97.3, -141.5, 2.36], ['toldo_pequeno', -42.9, 97.5, -146.0, 1.4], ['losa_piedra', -38.4, 97.4, -132.5, 2.78], ['toldo_pequeno', -44.4, 97.2, -138.5, 2.09]] },
    { id: 'kelvin_aldea_rio_este', plaza: { x: 108.9, z: 94.7, r: 11.2 }, props: [['toldo_pequeno', 99.9, 8.9, 99.2, 2.04], ['toldo_pequeno', 108.9, 8.5, 94.7, 2.73], ['toldo_pequeno', 99.9, 9.2, 90.2, 1.11], ['toldo_pequeno', 104.4, 8.4, 103.7, 2.68]] },
    { id: 'kelvin_aldea_rio_oeste', plaza: { x: -128.4, z: 7.7, r: 8.9 }, props: [['canoa', -120.9, 14.1, 6.2, 4.69], ['toldo_pequeno', -135.9, 16.1, 4.7, 1.19], ['toldo_pequeno', -128.4, 16.0, 7.7, 3.93], ['toldo_pequeno', -131.4, 16.3, 0.2, 0.38]] },
    { id: 'kelvin_aldea_lomas', plaza: { x: -69.2, z: 68.4, r: 6.2 }, props: [['toldo_pequeno', -64.7, 16.6, 65.4, 5.3], ['toldo_pequeno', -85.7, 17.2, 56.4, 0.94], ['toldo_pequeno', -72.2, 17.1, 63.9, 0.59], ['toldo_pequeno', -78.2, 18.8, 60.9, 0.88]] },
    { id: 'kelvin_aldea_rio_este_2', plaza: { x: 123.9, z: 6.9, r: 12 }, props: [['toldo_pequeno', 114.9, 23.9, 12.9, 2.16], ['toldo_pequeno', 123.9, 21.9, 2.4, 0.0], ['toldo_pequeno', 114.9, 23.1, 0.9, 0.98]] },
    { id: 'kelvin_aldea_mina', plaza: { x: 73.6, z: -75.2, r: 6.2 }, props: [['canoa', 75.1, 5.7, -69.2, 2.23], ['toldo_pequeno', 75.1, 4.6, -76.7, 5.52], ['toldo_pequeno', 88.6, 12.5, -70.7, 4.42]] },
    { id: 'kelvin_aldea_meandros', plaza: { x: -14.3, z: 16.7, r: 6.6 }, props: [['canoa', -8.3, 11.6, 3.2, 2.25], ['toldo_pequeno', -12.8, 12.3, 10.7, 6.04], ['toldo_pequeno', -15.8, 13.0, 18.2, 2.36]] },
    { id: 'kelvin_ruinas_yunque_2', plaza: { x: -60.6, z: -146.9, r: 6 }, props: [['losa_piedra', -51.6, 96.4, -146.9, 4.72], ['toldo_pequeno', -57.6, 93.5, -151.4, 5.7], ['losa_piedra', -45.6, 97.4, -127.4, 3.8]] },
    { id: 'kelvin_aldea_colina', plaza: { x: 5.0, z: 103.8, r: 6.2 }, props: [['toldo_pequeno', 5.0, 25.3, 97.8, 0.0], ['toldo_pequeno', 14.0, 22.3, 93.3, 5.58], ['toldo_pequeno', 2.0, 23.4, 91.8, 0.25]] },
    { id: 'kelvin_aldea_mina_2', plaza: { x: 98.1, z: -56.8, r: 9.1 }, props: [['canoa', 80.1, 7.0, -65.8, 2.16], ['toldo_pequeno', 105.6, 11.3, -59.8, 5.09], ['toldo_pequeno', 98.1, 10.4, -56.8, 3.26]] },
    { id: 'kelvin_aldea_rio_este_3', plaza: { x: 37.8, z: 52.3, r: 12 }, props: [['toldo_pequeno', 28.8, 21.8, 58.3, 2.16], ['toldo_pequeno', 37.8, 20.6, 52.3, 4.07], ['toldo_pequeno', 43.8, 21.7, 43.3, 5.69]] },
    { id: 'kelvin_aldea_rio_oeste_2', plaza: { x: -141.6, z: -31.5, r: 6.3 }, props: [['canoa', -149.1, 15.6, -36.0, 1.3], ['toldo_pequeno', -144.6, 16.6, -27.0, 2.56], ['toldo_pequeno', -137.1, 18.7, -24.0, 3.68]] },
    { id: 'kelvin_aldea_yunque', plaza: { x: -15.0, z: -77.8, r: 11.2 }, props: [['toldo_pequeno', -6.0, 25.1, -73.3, 4.25], ['toldo_pequeno', -13.5, 23.4, -79.3, 5.48]] },
    { id: 'kelvin_aldea_meandros_2', plaza: { x: -77.3, z: -72.9, r: 6.4 }, props: [['toldo_pequeno', -77.3, 32.7, -78.9, 6.28], ['toldo_pequeno', -83.3, 33.4, -74.4, 1.32]] },
  ];
  function sueloPlazas(MD) {
    const out = [], EK = MD.escenaKelvin;
    for (const P of PLAZAS) if (P.plaza) out.push({ x: P.plaza.x, z: P.plaza.z, r: P.plaza.r, f: 0.9 });
    // tierra pisada alrededor de cada pieza (menos en las ruinas de piedra, y sin canoas ni puentes, que van sobre el agua)
    for (const e of (EK && EK.compacto) || []) {
      if (/^(canoa|puente_madera)$/.test(e.modelo)) continue;
      const piedra = /^(templo|ruina|muro_templo|plataforma|bloque|losa|complejo)/.test(e.modelo);
      for (const v of e.inst) out.push({ x: v.length >= 16 ? v[12] : v[0], z: v.length >= 16 ? v[14] : v[2], r: piedra ? 3 : 4.5, f: piedra ? 0.45 : 0.75 });
    }
    return out;
  }
  // Mueve el contenido de los otros archivos del pack a las coordenadas del mapa (por id; lo que no está en el mapa no se toca)
  function reubicar(pack, MD) {
    const MS = MD.misiones || {};
    const by = arr => { const o = {}; for (const e of arr || []) o[e.id] = e; return o; };
    const RS = by(MS.RESOURCES), FI = by(MS.FIELD), BU = by(MS.BUSHES);
    // Fuera de las huellas de los edificios (cajas y cilindros del mapa, con 1 m de margen): si un hallazgo o un objeto cae
    // dentro de un edificio sólido, se saca al borde más cercano para que se pueda alcanzar a pie.
    const solidos = (MD.colisiones || []).filter(c => c.tipo === 'caja' || c.tipo === 'cilindro');
    const afuera = o => {
      for (let pass = 0; pass < 3; pass++) for (const c of solidos) {
        const m = 1.0;
        if (c.tipo === 'cilindro') {
          const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), r = c.r + m;
          if (d < r) { const k = d > 1e-3 ? r / d : 1; o.x = c.x + (d > 1e-3 ? dx : r) * k; o.z = c.z + (d > 1e-3 ? dz : 0) * k; }
        } else {
          const cs = Math.cos(c.rotY || 0), sn = Math.sin(c.rotY || 0), dx = o.x - c.x, dz = o.z - c.z;
          let lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
          const hx = c.hx + m, hz = c.hz + m;
          if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
            if (hx - Math.abs(lx) < hz - Math.abs(lz)) lx = Math.sign(lx || 1) * hx; else lz = Math.sign(lz || 1) * hz;
            o.x = c.x + lx * cs + lz * sn; o.z = c.z - lx * sn + lz * cs;
          }
        }
      }
      return o;
    };
    for (const r of pack.recursos || []) { const n = RS[r.id]; if (n) { r.x = n.x; r.z = n.z; afuera(r); } }
    for (const f of (pack.diario && pack.diario.entradas) || []) { const n = FI[f.id]; if (n) { f.x = n.x; f.z = n.z; if (n.r) f.r = n.r; if (!f.agua) afuera(f); } }
    for (const b of pack.coquies || []) { const n = BU[b.id]; if (n) { b.x = n.x; b.z = n.z; afuera(b); } }
    if (MD.spawn && pack.jugador) pack.jugador.aparicion = { x: MD.spawn.x, z: MD.spawn.z };
    // AY2: los props de las plazas, como piezas más de la escena de Kelvin en su zona (una vez: el mapa es global)
    const EK = MD.escenaKelvin;
    if (EK && EK.compacto && !EK.plazasAY2) {
      EK.plazasAY2 = true;
      for (const P of PLAZAS) for (const [modelo, x, y, z, rotY] of P.props) EK.compacto.push({ grupo: P.id, modelo, inst: [[x, y, z, rotY, 0.8366]], orientar: false, yExacta: false, escalaPack: false });
    }
  }

  // Materiales compartidos de los objetos (se crean al primer uso, cuando THREE ya está)
  let resMat = null;
  const mats = () => resMat || (resMat = { madera: new THREE.MeshLambertMaterial({ color: '#8a5a2b' }), piedra: new THREE.MeshLambertMaterial({ color: '#9aa0a3' }), componente: new THREE.MeshLambertMaterial({ color: '#c9d4d9', emissive: '#1d3a46' }) });

  const MUNDO_MAPA = D && {
    mapa: { datos: () => window.AV_MAPA_CAP1, alturas: () => window.AV_MAPA_CAP1_ALTURA, b64: 'AV_MAPA_B64' },
    lugares: LUGARES, pois: poisExtra, reubicar,
    suelo: { plazas: sueloPlazas }, // AY2: tierra en las plazas y bajo las piezas de los asentamientos
    nivelBase: M.POOL ? M.POOL.nivel : 3,
    // Ambiente de El Yunque a media mañana: cielo tropical, sol cálido alto desde el sudoeste, niebla ligera que sube del valle
    exposicion: 0.74,
    cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
    luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
    post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
    mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
    aguaRio: { claro: '#56c8f0', hondo: '#1c62d6', turbio: '#8c6c3e' }, // BB1 y BE2: azul cobalto del render de 2022, borde cian
    flora: { viento: { dir: [0.85, 0.35], fuerza: 1 }, evitar: pack => [POOL, ...(pack.coquies || []), ...(pack.recursos || []), ...((pack.diario || {}).entradas || [])] },
    // Edificios de Kelvin a escala con la cotorra (1,75 m de alto en el juego): el kit está hecho para una persona de 1,8 m,
    // así que las casas van a 0,95 (puertas de ~1,95 m) y lo monumental (templos, ruinas) a 1. Factor uniforme, sin deformar.
    edificios: {
      escala: { defecto: 0.95, templo_grande: 1, templo_mediano: 1, ruina_torre: 1, ruina_mirador: 1, ruina_pilar: 1, ruina_portal: 1, ruina_altar: 1, muelle_troncos: 1, puente_madera: 1, canoa: 1 },
      // G27: los 13 bohíos redondos de Villa Raíz salen del export a 1,3–1,7 m. En el más alto,
      // la puerta mide 1,39 m a ×1,25 y 1,67 m a ×1,5: las dos quedan bajo Vittata (1,75 m). A ×1,75 la puerta
      // llega a 1,95 m. ?bohioEsc=1.25|1.5|1.75 solo para las capturas. Vittata no se achica.
      escalaVilla: { zona: 'kelvin_aldea_rio_este', modelo: 'bohio_redondo', factor: 1.75 },
      // BM13: una casa más por aldea con puerta abierta y mobiliario (bohios.js), a la escala de la amueblada de Villa Raíz
      aldeasBohio: { modelo: 'bohio_redondo', factor: 1.75, zonas: ['kelvin_aldea_meandros', 'kelvin_aldea_rio_oeste', 'kelvin_aldea_mina'] },
      frente: {}, orientar: true, noOrientar: ['empalizada', 'canoa', 'ruina_pilar', 'ruina_altar', 'muelle_troncos', 'puente_madera'], propias: ['puente'],
      kit: 'assets/models/edificios/kit.js', // manifiesto del kit web (64 modelos, ver docs/EDIFICIOS.md)
    },
    islas: {
      lista: (M.ISLANDS || []).map(i => ({ x: i.x, z: i.z, r: i.r })),
      modelo: { url: 'assets/models/isla_mapa.glb', b64: 'AV_ISLA_B64', script: 'assets/models/isla_mapa_glb.js', base: 'assets/models/' },
    },
  };
  // Mundo único (MUNDO_UNICO.md, BM111): los capítulos 2–6 usan este mismo mapa real, cada uno en su zona. Lo toman de aquí y
  // ponen sus propios lugares, pois y reubicar (los de abajo son del cap. 1).
  if (MUNDO_MAPA) AVE.mundoReal = MUNDO_MAPA;
  const MUNDO_ANALITICO = {
    tamano: 70, segmentos: 110,
    exposicion: 0.74,
    cielo: { color: '#c3e2f0', cenit: '#2a7fd4', sol: '#fff1cf', niebla: [40, 1000], nieblaAltura: [8, 70] },
    luces: { cielo: '#cfe6ff', suelo: '#45602e', hemi: 0.66, sol: '#fff0d6', solInt: 2.0, solPos: [-42, 70, 46] },
    post: { saturacion: 1.08, contraste: 1.04, bloom: 0.2, vineta: 0.16 },
    mar: { laguna: '#86e3cf', somero: '#1fa9ad', hondo: '#0b4f86' },
    lugares: LUGARES,
    terreno: {
      ondas: [{ fn: 'sin', x: 0.06, amp: 1.2 }, { fn: 'cos', z: 0.05, amp: 1.0 }, { fn: 'sin', xz: 0.03, amp: 1.5 }],
      relieves: [
        { tipo: 'colina', x: -24, z: 20, alto: 6, ancho: 260 }, { tipo: 'cauce', x: 30, mitad: 9, pendiente: 0.5 },
        { tipo: 'colina', x: -30, z: 33, alto: 6, ancho: 70 }, { tipo: 'colina', x: POOL.x, z: POOL.z, alto: -3.2, ancho: 14 },
      ],
      planos: ['villa', 'taller', 'A', 'B', 'mirador'],
    },
    plataformas: [{ lugar: 'mirador', r: 2.3, alto: 0.4 }],
    rio: { x: 30 },
    agua: { x: 28, ancho: 32, color: '#5fe3d6', nivel: { x: 30, z: 0, sobre: 1.2 } },
    arboles: {
      cantidad: 110, semilla: 7, copaCada: 3, margenRio: 7, extra: MARK_TREES,
      evitar: pack => [POOL, ...(pack.coquies || []), ...((pack.diario || {}).entradas || []).filter(f => !f.agua), { x: 0, z: -11, r: 4 }, { x: -30, z: 33, r: 5 }],
    },
    oceano: { color: '#3a87a8', y: -2.6 },
    islas: {
      lista: [{ x: -95, z: 70, r: 14 }, { x: -40, z: 105, r: 10 }, { x: -110, z: 10, r: 9 }],
      modelo: { url: 'assets/models/isla_mapa.glb', b64: 'AV_ISLA_B64', script: 'assets/models/isla_mapa_glb.js', base: 'assets/models/' },
    },
    bruma: { dentro: 84, fuera: 128, color: '#fff3d6', opacidad: 0.35, y: 1.5 },
  };
  const LUMA = M.LUMA || { x: 4, z: -1 }, GUARD = M.GUARD || { x: 0, z: -11 };

  // <objetos-historia> (hito 28: una página de render puede leer este bloque tal cual entre los dos marcadores; no los cambies)
  // ---------- Objetos de la historia: máquina experimental, transmisor, banco y coquí, en geometría de three.js ----------
  // Modelos hechos en código (sin .glb): torno (Lathe), extrusión con bisel (Extrude), tubos (Tube), aros (Torus) y grupos.
  // Cada objeto funde sus piezas por material (una malla por material: pocos draw calls) y queda por debajo de ~3k triángulos.
  // Materiales Phong como los edificios del kit (src/engine/mundo.js): el look vibrant_toon les pone la rampa toon; el brillo
  // (shininess) hace de rugosidad: madera áspera 4-8, latón y cobre 26-40. Colores en sRGB; linMat (G.renderer.linMat) los pasa a
  // lineal una sola vez y los marca, así el linearize() de la escena (core.js) no los vuelve a convertir; el engranaje que se crea
  // después (techo del refugio) queda igual que el de la máquina.
  // [KELVIN-6] Diseño provisional de la máquina y del transmisor (CAP1_PENDIENTE, decisión 6): se cambia aquí sin tocar la historia.
  function objetosHistoria(linMat) {
    const PI = Math.PI, cache = {};
    const mat = (color, brillo, espec) => {
      const k = color + '|' + brillo + '|' + espec;
      return cache[k] || (cache[k] = linMat(new THREE.MeshPhongMaterial({ color: color, specular: espec || '#0d0a07', shininess: brillo || 5 })));
    };
    const MAT = {
      madera: () => mat('#a8743f', 6, '#1c140c'),      // la madera del taller (mismo tono que las tablas)
      maderaClara: () => mat('#c99a5b', 6, '#1c140c'),  // el banco de antes
      maderaOsc: () => mat('#6e4728', 7, '#1a110a'),
      barniz: () => mat('#7a4a26', 18, '#3a2614'),      // gabinete del radio: madera barnizada
      cobre: () => mat('#c46e3e', 34, '#7a4a2e'),
      cobreOsc: () => mat('#8e4a2a', 24, '#4a2a18'),
      laton: () => mat('#c8a24a', 40, '#6a5424'),
      hierro: () => mat('#4c4b4e', 22, '#2c2c30'),
      tela: () => mat('#3b2c20', 3, '#000000'),
      pintura: () => mat('#e8913a', 10, '#2a1a0a'),     // aspa pintada (el naranja del aspa de antes)
      baquelita: () => mat('#2e2420', 30, '#3a3430'),
    };
    const v2 = (r, y) => new THREE.Vector2(r, y);
    const torno = (pts, seg) => new THREE.LatheGeometry(pts.map(p => v2(p[0], p[1])), seg || 12);
    const geos = {};
    // Caja con los bordes biselados: un rectángulo extruido con bisel de 1 segmento (28 triángulos)
    function caja(w, h, d, b) {
      b = b == null ? Math.min(w, h, d) * 0.15 : b;
      const k = 'c' + [w, h, d, b].join();
      if (geos[k]) return geos[k];
      const x = w / 2 - b, y = h / 2 - b, s = new THREE.Shape();
      s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y);
      const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-3, d - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1 });
      g.translate(0, 0, -(d - 2 * b) / 2);
      return (geos[k] = g);
    }
    // Una figura 2D extruida con bisel, centrada en z
    function extruir(shape, d, b, curvas) {
      const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-3, d - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: curvas || 6 });
      g.translate(0, 0, -(d - 2 * b) / 2);
      return g;
    }
    const _o = new THREE.Object3D();
    const mx = (pos, rot, esc) => {
      _o.position.set(...(pos || [0, 0, 0])); _o.rotation.set(...(rot || [0, 0, 0]));
      if (esc == null) _o.scale.set(1, 1, 1); else if (typeof esc === 'number') _o.scale.setScalar(esc); else _o.scale.set(...esc);
      _o.updateMatrix(); return _o.matrix.clone();
    };
    // Constructor: piezas (geometría, material, matriz) → una malla por material con las geometrías fundidas
    function Piezas() {
      const partes = [];
      const api = {
        add(geo, m, pos, rot, esc) { partes.push([geo, m, mx(pos, rot, esc)]); return api; },
        addM(geo, m, M) { partes.push([geo, m, M]); return api; },
        // pieza estirada entre dos puntos (patas, dedos): la geometría unitaria se alinea de a a b con grosor r
        seg(geo, m, a, b, r) {
          const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
          partes.push([geo, m, new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(r, L / 2, r))]); return api;
        },
        fin(nombre) {
          const g = new THREE.Group(), porMat = new Map();
          for (const [geo, m, M] of partes) { if (!porMat.has(m)) porMat.set(m, []); porMat.get(m).push([geo, M]); }
          for (const [m, lista] of porMat) {
            let n = 0;
            const piezas = lista.map(([geo, M]) => { const p = (geo.index ? geo.toNonIndexed() : geo.clone()); p.applyMatrix4(M); n += p.attributes.position.count; return p; });
            const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
            let o = 0;
            for (const p of piezas) { pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3); o += p.attributes.position.count; p.dispose(); }
            const bg = new THREE.BufferGeometry();
            bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
            bg.computeBoundingSphere();
            const mesh = new THREE.Mesh(bg, m); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
          }
          if (nombre) g.name = nombre;
          return g;
        },
      };
      return api;
    }
    const sombras = o => { o.traverse(m => { if (m.isMesh) m.castShadow = true; }); return o; };
    // Esfera de un indicador: fondo crema con marcas (CanvasTexture de 128 px)
    let texEsfera = null;
    function esferaTex() {
      if (texEsfera) return texEsfera;
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const c = cv.getContext('2d');
      c.fillStyle = '#f1e2bd'; c.beginPath(); c.arc(64, 64, 64, 0, PI * 2); c.fill();
      c.strokeStyle = '#4a3020'; c.lineCap = 'round';
      for (let i = 0; i <= 10; i++) {
        const a = PI * (0.8 + i * 0.14), r0 = i % 5 ? 44 : 36;
        c.lineWidth = i % 5 ? 4 : 7; c.beginPath(); c.moveTo(64 + Math.cos(a) * r0, 64 + Math.sin(a) * r0); c.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); c.stroke();
      }
      c.strokeStyle = '#c0442c'; c.lineWidth = 7; c.beginPath(); c.arc(64, 64, 52, PI * 2.0, PI * 2.2); c.stroke();
      texEsfera = new THREE.CanvasTexture(cv); texEsfera.encoding = THREE.sRGBEncoding;
      return texEsfera;
    }
    // Indicador redondo: aro de latón, esfera con marcas y aguja (la esfera es su propia malla para poder iluminarla)
    function indicador(r) {
      const g = new THREE.Group();
      const cara = new THREE.Mesh(new THREE.CircleGeometry(r, 18), linMat(new THREE.MeshPhongMaterial({ map: esferaTex(), color: 0xffffff, specular: '#202020', shininess: 20, emissive: 0x000000, emissiveMap: esferaTex() })));
      cara.name = 'esfera';
      const p = Piezas()
        .add(new THREE.TorusGeometry(r, r * 0.16, 4, 18), MAT.laton())
        .add(caja(r * 0.1, r * 0.82, r * 0.06, r * 0.02), mat('#b8321e', 10), [r * 0.22, r * 0.28, r * 0.05], [0, 0, -0.62])
        .add(new THREE.CylinderGeometry(r * 0.12, r * 0.12, r * 0.1, 8), MAT.laton(), [0, 0, r * 0.05], [PI / 2, 0, 0]);
      g.add(cara, p.fin());
      return g;
    }

    // Engranaje de latón: dientes, cubo y agujeros de aligerado (eje: Y). Es el que Vittata sube al techo del refugio.
    function engranaje(r) {
      const n = 10, ro = r * 1.17, ri = r * 0.97, d = PI * 2 / n, s = new THREE.Shape();
      for (let i = 0; i < n; i++) {
        const a = i * d, pts = [[ri, a], [ro, a + d * 0.2], [ro, a + d * 0.46], [ri, a + d * 0.66]];
        pts.forEach(([rr, aa], k) => { const x = Math.cos(aa) * rr, y = Math.sin(aa) * rr; if (!i && !k) s.moveTo(x, y); else s.lineTo(x, y); });
      }
      const eje = new THREE.Path(); eje.absarc(0, 0, r * 0.2, 0, PI * 2, true); s.holes.push(eje);
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4, h = new THREE.Path(); h.absarc(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, r * 0.17, 0, PI * 2, true); s.holes.push(h); }
      const geo = extruir(s, r * 0.24, 0, 4); geo.rotateX(-PI / 2); // sin bisel: a 3-6 m no se ve y cuesta 300 triángulos
      const p = Piezas().add(geo, MAT.laton())
        .add(torno([[r * 0.2, -r * 0.21], [r * 0.3, -r * 0.2], [r * 0.32, -r * 0.16], [r * 0.32, r * 0.16], [r * 0.3, r * 0.2], [r * 0.2, r * 0.21]], 10), MAT.hierro());
      return sombras(p.fin('engranaje'));
    }

    // ---------- Máquina experimental de Vittata: caldera de cobre sobre una tarima de madera, aspa, manivela y luces ----------
    // Hecha a mano y dañada por la Ruptura (SCRIPT p.4): una aspa doblada, un parche remachado y una luz fundida.
    // Frente: +Z (indicador y luces). Engranaje a +X (pieza aparte: engMaquina) y manivela a -X.
    function maquina() {
      const g = new THREE.Group(), p = Piezas();
      // tarima: dos tablones con patas cortas
      p.add(caja(1.04, 0.09, 0.4, 0.02), MAT.madera(), [0, 0.135, -0.205]).add(caja(1.04, 0.09, 0.4, 0.02), MAT.madera(), [0, 0.135, 0.205], [0, 0.03, 0]);
      for (const [x, z] of [[-0.42, -0.3], [0.42, -0.3], [-0.42, 0.3], [0.42, 0.3]]) p.add(caja(0.14, 0.1, 0.14, 0.02), MAT.maderaOsc(), [x, 0.05, z]);
      // caldera de cobre (torno), con dos aros de latón y la tapa con su chimenea
      p.add(torno([[0, 0.18], [0.3, 0.18], [0.35, 0.22], [0.37, 0.32], [0.37, 0.6], [0.35, 0.7], [0.28, 0.78], [0.14, 0.83], [0, 0.84]], 16), MAT.cobre());
      p.add(new THREE.TorusGeometry(0.372, 0.022, 4, 16), MAT.laton(), [0, 0.27, 0], [PI / 2, 0, 0]).add(new THREE.TorusGeometry(0.372, 0.022, 4, 16), MAT.laton(), [0, 0.64, 0], [PI / 2, 0, 0]);
      p.add(torno([[0.06, 0.8], [0.06, 0.96], [0.1, 1.02], [0.085, 1.04], [0.05, 1.0]], 10), MAT.laton(), [-0.12, 0, -0.08]);
      // parche remachado (atrás a la izquierda) y caño de cobre con su llave
      p.add(caja(0.17, 0.15, 0.03, 0.01), MAT.cobreOsc(), [-0.24, 0.47, -0.28], [0, Math.atan2(-0.24, -0.28), 0]);
      const cano = new THREE.CatmullRomCurve3([[-0.2, 0.74, -0.24], [-0.36, 0.78, -0.3], [-0.48, 0.6, -0.3], [-0.46, 0.3, -0.26], [-0.4, 0.2, -0.2]].map(v => new THREE.Vector3(...v)));
      p.add(new THREE.TubeGeometry(cano, 12, 0.026, 5, false), MAT.cobre());
      p.add(new THREE.TorusGeometry(0.042, 0.014, 3, 10), MAT.laton(), [-0.475, 0.46, -0.29], [PI / 2, 0, 0]);
      // mástil y aspa de tres palas (una doblada), mirando al frente
      p.add(new THREE.CylinderGeometry(0.022, 0.03, 0.42, 6), MAT.hierro(), [0.06, 1.02, 0.02]);
      p.add(torno([[0, -0.05], [0.05, -0.04], [0.06, 0], [0.04, 0.05], [0, 0.07]], 10), MAT.laton(), [0.06, 1.25, 0.06], [PI / 2, 0, 0]);
      const pala = new THREE.Shape();
      pala.moveTo(-0.03, 0.05); pala.quadraticCurveTo(-0.1, 0.25, -0.05, 0.42); pala.quadraticCurveTo(0, 0.46, 0.05, 0.42); pala.quadraticCurveTo(0.08, 0.22, 0.03, 0.05);
      const palaGeo = extruir(pala, 0.03, 0.008, 4);
      const centro = new THREE.Matrix4().makeTranslation(0.06, 1.25, 0.1);
      [[0.2, 0.35, 0], [2.29, 0.35, 0], [4.38, 0.8, 0.45]].forEach(([a, giro, doblez]) => {
        const M = centro.clone().multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeRotationX(doblez)).multiply(new THREE.Matrix4().makeRotationY(giro));
        p.addM(palaGeo, MAT.pintura(), M);
      });
      // placa de madera al frente: indicador y tres luces con su aro
      p.add(caja(0.46, 0.3, 0.1, 0.015), MAT.maderaOsc(), [0, 0.46, 0.345]);
      for (const y of [0.37, 0.46, 0.55]) p.add(new THREE.TorusGeometry(0.034, 0.011, 4, 10), MAT.laton(), [0.14, y, 0.4]);
      // eje del engranaje (a +X) con su soporte, y manivela (a -X)
      p.add(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8), MAT.hierro(), [0.48, 0.55, 0], [0, 0, PI / 2]);
      p.add(caja(0.04, 0.2, 0.16, 0.012), MAT.hierro(), [0.375, 0.55, 0]);
      p.add(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), MAT.hierro(), [-0.42, 0.46, 0.04], [0, 0, PI / 2]);
      p.add(caja(0.035, 0.24, 0.055, 0.012), MAT.hierro(), [-0.5, 0.548, 0.088], [0.5, 0, 0]);
      p.add(torno([[0, -0.08], [0.028, -0.075], [0.036, -0.03], [0.03, 0.03], [0.036, 0.07], [0, 0.085]], 8), MAT.maderaOsc(), [-0.6, 0.644, 0.14], [0, 0, PI / 2]);
      g.add(p.fin('maquina_cuerpo'));
      const ind = indicador(0.085); ind.position.set(-0.08, 0.46, 0.4); g.add(ind);
      // luces: verde y ámbar encendidas, la de abajo fundida (dañada)
      const luces = [['#46d866', 0.55], ['#ffab1f', 0.46], ['#4a2a22', 0.37]].map(([c, y]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), linMat(new THREE.MeshBasicMaterial({ color: c })));
        m.position.set(0.14, y, 0.405); g.add(m); return m;
      });
      g.userData.luces = luces;
      return sombras(g);
    }
    // Hueco del engranaje: el eje queda pelado, con el aro oscuro donde iba el cubo
    function huecoEngranaje() {
      const p = Piezas()
        .add(torno([[0.05, -0.03], [0.085, -0.03], [0.09, 0], [0.085, 0.03], [0.05, 0.03]], 12), mat('#2b2b2b', 8))
        .add(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 8), mat('#6a6058', 10));
      return p.fin('hueco_engranaje');
    }

    // ---------- Transmisor antiguo: radio de mesa grande, de madera barnizada y metal ----------
    // Gabinete de arco, altavoz con rejilla de listones, dial, dos perillas, piloto (luz) y antena telescópica que se endereza.
    // Frente: +Z. La antena es un grupo con el pivote en su base (rotation.z: 0,5 caída, 0 derecha).
    function transmisor() {
      const g = new THREE.Group(), p = Piezas();
      const W = 0.42, H0 = 0.12, HC = 0.84, RY = 0.28, D = 0.62;
      const arco = (w, y0, yc, ry) => { const s = new THREE.Shape(); s.moveTo(-w, y0); s.lineTo(w, y0); s.lineTo(w, yc); s.absellipse(0, yc, w, ry, 0, PI, false); s.lineTo(-w, y0); return s; };
      p.add(extruir(arco(W - 0.03, H0, HC, RY - 0.03), D, 0.03, 10), MAT.barniz());
      // frente de madera clara (un poco salido) y base con patas torneadas
      p.add(extruir(arco(W - 0.08, H0 + 0.06, HC, RY - 0.08), 0.03, 0.008, 10), MAT.madera(), [0, 0, D / 2 + 0.004]);
      p.add(caja(0.9, 0.06, 0.66, 0.02), MAT.maderaOsc(), [0, H0 - 0.02, 0]);
      for (const [x, z] of [[-0.36, -0.24], [0.36, -0.24], [-0.36, 0.24], [0.36, 0.24]]) p.add(torno([[0, 0], [0.04, 0], [0.05, 0.04], [0.035, 0.07], [0.045, 0.09], [0, 0.09]], 8), MAT.maderaOsc(), [x, 0, z]);
      // altavoz: tela oscura, aro de latón y cinco listones
      const yA = 0.7, zF = D / 2 + 0.022;
      p.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), MAT.tela(), [0, yA, zF - 0.004], [PI / 2, 0, 0]);
      p.add(new THREE.TorusGeometry(0.205, 0.018, 4, 22), MAT.laton(), [0, yA, zF + 0.006]);
      for (let i = -2; i <= 2; i++) { const hh = 2 * Math.sqrt(0.195 * 0.195 - (i * 0.07) ** 2); p.add(caja(0.028, hh, 0.02, 0.008), MAT.barniz(), [i * 0.07, yA, zF + 0.01]); }
      // perillas (baquelita) y placa de metal bajo el dial
      for (const x of [-0.25, 0.25]) p.add(torno([[0, 0], [0.05, 0], [0.052, 0.03], [0.04, 0.05], [0, 0.055]], 10), MAT.baquelita(), [x, 0.34, zF], [PI / 2, 0, 0]);
      p.add(caja(0.3, 0.035, 0.015, 0.005), MAT.laton(), [0, 0.205, zF + 0.002]);
      // esquineros de metal y la base de la antena
      for (const x of [-W + 0.005, W - 0.005]) for (const y of [H0 + 0.06, HC - 0.04]) p.add(caja(0.03, 0.1, 0.1, 0.008), MAT.hierro(), [x, y, D / 2 - 0.04]);
      const xA = 0.24, yTop = HC + RY * Math.sqrt(1 - (xA / W) ** 2) - 0.02;
      p.add(torno([[0, 0], [0.06, 0], [0.055, 0.03], [0.03, 0.05], [0, 0.06]], 10), MAT.hierro(), [xA, yTop, -0.06]);
      g.add(p.fin('transmisor_cuerpo'));
      // dial (su esfera se ilumina al encender) y piloto
      const dial = indicador(0.105); dial.position.set(0, 0.34, zF + 0.002); g.add(dial);
      const luz = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshBasicMaterial({ color: '#4a4a4a' }));
      luz.position.set(0, HC + RY - 0.12, zF - 0.01); g.add(luz);
      const bisel = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.014, 4, 14), MAT.laton()); bisel.position.copy(luz.position); bisel.position.z += 0.01; g.add(bisel);
      // antena telescópica: tres tramos de metal y una bolita en la punta
      const ant = new THREE.Group(); ant.name = 'antena'; ant.position.set(xA, yTop + 0.05, -0.06);
      const pa = Piezas();
      [[0.022, 0.42, 0.21], [0.016, 0.42, 0.62], [0.011, 0.4, 1.02]].forEach(([r, l, y]) => pa.add(new THREE.CylinderGeometry(r, r, l, 6), mat('#a9afb2', 36, '#5a5e60'), [0, y, 0]).add(new THREE.CylinderGeometry(r * 1.4, r * 1.4, 0.03, 6), MAT.hierro(), [0, y - l / 2 + 0.015, 0]));
      pa.add(new THREE.SphereGeometry(0.03, 8, 6), mat('#a9afb2', 36, '#5a5e60'), [0, 1.23, 0]);
      ant.add(pa.fin());
      g.add(ant);
      g.userData = { antena: ant, luz, dial: dial.getObjectByName('esfera').material };
      return sombras(g);
    }

    // ---------- Banco de trabajo tallado (regalo del Guardián) ----------
    // 1,8 × 0,9 × 0,8 m como la caja de antes (su colisión no cambia). Tablero de dos tablones, patas torneadas, faldón tallado con
    // festones y una roseta, entrepaño abajo, prensa de madera a la derecha y un mazo encima. Origen en el suelo.
    function banco() {
      const p = Piezas(), A = 0.9;
      p.add(caja(1.8, 0.09, 0.395, 0.025), MAT.maderaClara(), [0, A - 0.045, -0.2]).add(caja(1.8, 0.09, 0.395, 0.025), MAT.maderaClara(), [0, A - 0.045, 0.2]);
      const pata = torno([[0, 0], [0.06, 0], [0.065, 0.04], [0.045, 0.1], [0.05, 0.3], [0.065, 0.36], [0.045, 0.42], [0.052, 0.62], [0.068, 0.7], [0.06, 0.81], [0, 0.81]], 8);
      for (const [x, z] of [[-0.78, -0.3], [0.78, -0.3], [-0.78, 0.3], [0.78, 0.3]]) p.add(pata, MAT.madera(), [x, 0, z]);
      // faldón tallado: borde de abajo en festones (tres arcos) y una roseta en medio
      const f = new THREE.Shape(), L = 0.72, h = 0.16;
      f.moveTo(-L, h / 2); f.lineTo(L, h / 2); f.lineTo(L, -h / 2);
      for (let i = 0; i < 3; i++) { const x0 = L - i * (2 * L / 3), x1 = x0 - 2 * L / 3; f.quadraticCurveTo((x0 + x1) / 2, -h / 2 + 0.09, x1, -h / 2); }
      f.lineTo(-L, h / 2);
      const faldon = extruir(f, 0.04, 0.008, 6);
      p.add(faldon, MAT.madera(), [0, A - 0.17, 0.3]).add(faldon, MAT.madera(), [0, A - 0.17, -0.3]);
      p.add(caja(0.04, 0.14, 0.56, 0.01), MAT.madera(), [-0.78, A - 0.16, 0]).add(caja(0.04, 0.14, 0.56, 0.01), MAT.madera(), [0.78, A - 0.16, 0]);
      p.add(new THREE.TorusGeometry(0.045, 0.014, 4, 12), MAT.maderaOsc(), [0, A - 0.15, 0.325]).add(new THREE.CylinderGeometry(0.02, 0.025, 0.02, 8), MAT.maderaOsc(), [0, A - 0.15, 0.325], [PI / 2, 0, 0]);
      for (const s of [-1, 1]) p.add(torno([[0, 0], [0.02, 0.003], [0.024, 0.012], [0, 0.016]], 6), MAT.maderaOsc(), [s * 0.3, A - 0.15, 0.32], [PI / 2, 0, 0]);
      // entrepaño
      p.add(caja(1.5, 0.04, 0.6, 0.012), MAT.maderaOsc(), [0, 0.2, 0]);
      // prensa: quijada de madera, tornillo de hierro y su barra
      p.add(caja(0.26, 0.2, 0.06, 0.015), MAT.maderaOsc(), [0.62, A - 0.12, 0.44]);
      p.add(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), MAT.hierro(), [0.62, A - 0.12, 0.48], [PI / 2, 0, 0]);
      p.add(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 6), MAT.hierro(), [0.62, A - 0.12, 0.58], [0, 0, PI / 2]);
      for (const s of [-1, 1]) p.add(new THREE.SphereGeometry(0.022, 6, 4), MAT.maderaOsc(), [0.62 + s * 0.13, A - 0.12, 0.58]);
      // mazo de madera y un tablón por cepillar encima
      p.add(torno([[0, -0.1], [0.055, -0.095], [0.06, 0], [0.055, 0.095], [0, 0.1]], 10), MAT.maderaOsc(), [-0.45, A + 0.06, 0.1], [0, 0, PI / 2]);
      p.add(new THREE.CylinderGeometry(0.016, 0.02, 0.3, 6), MAT.madera(), [-0.45, A + 0.03, -0.06], [PI / 2 - 0.2, 0, 0]);
      p.add(caja(0.7, 0.04, 0.14, 0.01), MAT.madera(), [0.15, A + 0.02, -0.15], [0, 0.12, 0]);
      return sombras(p.fin('banco'));
    }

    // ---------- Coquí (Eleutherodactylus coqui) ----------
    // Ranita sentada, de frente a +Z: parda grisácea por encima (con dos franjas claras dorsolaterales, un patrón común en la
    // especie) y crema por debajo; ojos grandes de iris bronce; dedos sin membrana con discos (almohadillas) en la punta.
    // Fuente: USGS NAS, ficha de Eleutherodactylus coqui (coloración y discos digitales). Tamaño de juego (≈ 0,26 m) para leerse
    // a 3-6 m; el animal real mide 3-6 cm (misma ficha).
    function coqui() {
      const p = Piezas(), piel = mat('#7d6248', 14, '#2a2018'), vientre = mat('#cdbf9f', 8, '#1a1610'), franja = mat('#a88a64', 12, '#2a2018'), disco = mat('#9a8064', 10, '#20180f');
      const bola = (w, h) => new THREE.SphereGeometry(1, w, h);
      const b10 = bola(12, 8), b8 = bola(8, 6), b6 = bola(6, 4), b5 = bola(5, 3);
      p.add(b10, piel, [0, 0.07, -0.01], [-0.5, 0, 0], [0.062, 0.05, 0.085]);               // cuerpo, inclinado hacia arriba
      p.add(b10, vientre, [0, 0.06, 0.0], [-0.5, 0, 0], [0.05, 0.036, 0.07]);           // vientre (asoma abajo)
      p.add(b8, vientre, [0, 0.1, 0.075], [-0.2, 0, 0], [0.044, 0.026, 0.04]);              // garganta
      p.add(b10, piel, [0, 0.122, 0.07], [-0.2, 0, 0], [0.058, 0.04, 0.056]);               // cabeza ancha y hocico redondo
      const D = (x, y, z) => [x, y, z];
      for (const s of [-1, 1]) {
        p.add(b6, franja, [s * 0.036, 0.104, -0.02], [-0.5, s * 0.15, 0], [0.011, 0.008, 0.06]); // franja dorsolateral clara
        p.add(b8, piel, [s * 0.031, 0.148, 0.076], 0, 0.027);                                // párpado (bulto del ojo)
        // pata delantera: brazo y antebrazo; cuatro dedos sin membrana, cada uno con su disco
        const mano = D(s * 0.058, 0.008, 0.092);
        p.seg(b6, piel, [s * 0.04, 0.075, 0.045], [s * 0.06, 0.038, 0.06], 0.013).seg(b6, piel, [s * 0.06, 0.038, 0.06], mano, 0.01);
        for (let k = 0; k < 4; k++) {
          const a = s * 0.25 + (k - 1.5) * 0.5, tip = [mano[0] + Math.sin(a) * 0.024, 0.006, mano[2] + Math.cos(a) * 0.024];
          p.seg(b5, piel, mano, tip, 0.0045).add(b5, disco, tip, 0, [0.0075, 0.004, 0.0075]);
        }
        // pata trasera plegada: muslo, pierna y pie; cinco dedos largos con disco
        const rodilla = D(s * 0.092, 0.042, -0.002), tobillo = D(s * 0.072, 0.016, -0.072), pie = D(s * 0.095, 0.008, 0.008);
        p.seg(b8, piel, [s * 0.045, 0.05, -0.07], rodilla, 0.022).seg(b6, piel, rodilla, tobillo, 0.016).seg(b6, piel, tobillo, pie, 0.01);
        for (let k = 0; k < 5; k++) {
          const a = s * (0.05 + k * 0.32), tip = [pie[0] + Math.sin(a) * 0.03, 0.006, pie[2] + Math.cos(a) * 0.03];
          p.seg(b5, piel, pie, tip, 0.0045).add(b5, disco, tip, 0, [0.0075, 0.004, 0.0075]);
        }
      }
      const g = p.fin('coqui');
      // ojos: globo bronce, pupila negra horizontal y un brillo (piezas sueltas por el MeshBasic del brillo)
      const brillo = linMat(new THREE.MeshBasicMaterial({ color: '#fffaf0' })), ojo = Piezas(), iris = mat('#8a5a26', 40, '#5a5048'), pupila = mat('#0e0a08', 60, '#8a8a8a');
      for (const s of [-1, 1]) {
        const c = new THREE.Vector3(s * 0.033, 0.152, 0.082), dir = new THREE.Vector3(s * 0.5, 0.25, 0.83).normalize();
        ojo.add(b8, iris, c.toArray(), 0, 0.024);
        ojo.add(b8, pupila, c.clone().addScaledVector(dir, 0.021).toArray(), [-0.25, s * 0.54, 0], [0.013, 0.0075, 0.006]);
        ojo.add(b6, brillo, c.clone().addScaledVector(dir, 0.023).add(new THREE.Vector3(0, 0.007, 0)).toArray(), 0, 0.0045);
      }
      g.add(ojo.fin());
      return sombras(g);
    }

    // Triángulos de un objeto (mallas visibles y no visibles)
    function triangulos(o) { let n = 0; o.traverse(m => { if (m.isMesh) { const gg = m.geometry; n += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } }); return n; }
    return { engranaje, maquina, huecoEngranaje, transmisor, banco, coqui, triangulos, MAT };
  }
  // </objetos-historia>

  AVE.registerPack({
    id: 'cap1',
    mundo: MUNDO_MAPA || MUNDO_ANALITICO,
    // Iguaca y el Guardián son sprites 2D de renders sustitutos (CANON_REGISTRY: PROVISIONALES), junto a una Vittata 3D.
    // [KELVIN-1] Identidad del Guardián (¿cotorra, humano u otra forma?): decide su retrato, su sprite y su modelo 3D.
    // [KELVIN-3] Medalla del Guardián igual a una pieza del emblema (NARRATIVA «Giro»): si es canon, falta un detalle visible en su figura.
    // Familia de Iguaca (SCRIPT p.9, decidido por Kelvin el 1-nov): la Abuela y el Papá entran al refugio de la colina. Ver historia.js, familiaLlega().
    npcs: [
      // id histórico 'luma' (partidas guardadas, escenas c1_luma_*, LumaHelped): el personaje se llama Iguaca
      { id: 'luma', nombre: 'Iguaca', sprite: 'assets/luma.png', x: LUMA.x, z: LUMA.z, escala: 2.0, flota: true },
      { id: 'guardian', nombre: 'Guardián', sprite: 'assets/guardian.png', x: GUARD.x, z: GUARD.z, escala: 2.6 },
      // La familia de Iguaca (Kelvin, 1-nov: la Abuela y el Papá del cap. 2): salen tras la crecida, si el refugio está en la colina
      { id: 'abuela', nombre: 'Abuela', sprite: 'assets/abuela.png', x: LUGARES.B.x + 1.5, z: LUGARES.B.z + 2.2, escala: 1.8 },
      { id: 'papa', nombre: 'Papá', sprite: 'assets/papa.png', x: LUGARES.B.x - 1.5, z: LUGARES.B.z + 2.2, escala: 1.8 },
    ],
    objetos: {
      madera: { nombre: 'madera', modelo: () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 7), mats().madera); m.rotation.z = Math.PI / 2; m.position.y = 0.3; return m; } },
      piedra: { nombre: 'piedra', modelo: () => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), mats().piedra); m.position.y = 0.35; return m; } },
      componente: { nombre: 'pieza de metal', modelo: () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 6, 10), mats().componente); m.position.y = 0.7; return m; } },
    },
    // En el mapa, reubicar() pone estas coordenadas en las de misiones.RESOURCES (mismos ids)
    recursos: [
      { id: 'm1', tipo: 'madera', x: -3, z: 7 }, { id: 'm2', tipo: 'madera', x: 7, z: 9 },
      { id: 'm3', tipo: 'madera', x: -14, z: 2 }, { id: 'm4', tipo: 'madera', x: 10, z: -9 },
      { id: 'm5', tipo: 'madera', x: -17, z: -13 },
      { id: 'p1', tipo: 'piedra', x: 12, z: -2 }, { id: 'p2', tipo: 'piedra', x: -6, z: 13 },
      { id: 'p3', tipo: 'piedra', x: 4, z: -15 }, { id: 'p4', tipo: 'piedra', x: -15, z: 8 },
      // M1 "Fondo del río": la pieza c1 cayó al fondo de la poza del río; solo se alcanza buceando (C o Bucear)
      { id: 'c1', tipo: 'componente', x: POOL.x, z: POOL.z, fondo: true, burbujas: 2, avisoFondo: 'La pieza está en el fondo de la poza: mantén C (o Bucear) para bajar' },
      // c2 aparece después de la recolección: así la pieza de metal del paso 3 sale del río (M1)
      { id: 'c2', tipo: 'componente', x: 9, z: 14, desdePaso: 3 },
    ],
    pozaRio: POOL,

    preparar(G) {
      const S = G.S, scene = G.renderer.scene, colliders = G.fisica.colliders, H = G.terreno.height;
      const PLACES = G.terreno.places, T = PLACES.taller;
      const MAPA = !!G.terreno.mapa;
      Object.assign(G.fisica.alturas, { taller: 3.8, bench: 1, refuge: 2.6 });
      // Retratos de las líneas escritas en el código del pack y nivel de la crecida sobre el terreno A
      // VOZ y N: retratos neutros de la Voz del transmisor y del Narrador (pack.js); nunca la cara del Guardián ni la de Vittata
      const RET = (G.pack.dialogos && G.pack.dialogos.retratos) || {};
      G.c.IMG = { V: 'assets/vittata.png', L: 'assets/luma.png', G: 'assets/guardian.png', VOZ: RET.Voz || '', N: RET.Narrador || '' };
      G.c.FLOOD_LEVEL = PLACES.A.base + 1.1;
      // Marcas de agua a 1 m en los árboles junto al río (en el mapa, ajustadas al tronco real cuando carga la flora)
      // Colores en sRGB: G.renderer.linMat los pasa a lineal UNA vez y los marca (antes lin() + linearize() de core.js los convertía dos veces)
      const bandMat = G.renderer.linMat(new THREE.MeshLambertMaterial({ color: '#3b5f6e', side: THREE.DoubleSide }));
      const bands = MARK_TREES.map(t => {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 14, 1, true), bandMat);
        band.position.set(t.x, H(t.x, t.z) + 1.0, t.z); band.visible = !MAPA;
        scene.add(band); return band;
      });
      if (MAPA && G.vegetacion && G.vegetacion.listo) G.vegetacion.listo.then(() => {
        const inf = G.vegetacion.info.tabonuco;
        bands.forEach((b, i) => { const t = MARK_TREES[i], r = inf ? Math.max(0.3, inf.tronco * t.s * 1.0) : 0.6; b.scale.set(r / 0.4, 1, r / 0.4); b.position.y = H(t.x, t.z) + 1.0; b.visible = true; });
      });
      // Estacas y letrero de cada terreno
      const madera = G.renderer.linMat(new THREE.MeshLambertMaterial({ color: '#8a5e34' }));
      function parcelMarker(p, color) {
        const g = new THREE.Group();
        const mat = G.renderer.linMat(new THREE.MeshLambertMaterial({ color: color }));
        const h = p.half;
        // estacas y sus topes de color: dos mallas instanciadas (2 draw calls por terreno)
        const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), madera, 4), caps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), mat, 4);
        const m4 = new THREE.Matrix4();
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i) => {
          const x = p.x + sx * h, z = p.z + sz * h, y = H(x, z);
          posts.setMatrixAt(i, m4.makeTranslation(x, y + 0.5, z)); caps.setMatrixAt(i, m4.makeTranslation(x, y + 1.1, z));
        });
        posts.castShadow = true; posts.frustumCulled = caps.frustumCulled = false; g.add(posts, caps);
        const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([sx, sz]) => new THREE.Vector3(p.x + sx * h, H(p.x + sx * h, p.z + sz * h) + 0.85, p.z + sz * h));
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), G.renderer.linMat(new THREE.LineBasicMaterial({ color: color }))));
        const sx = p.x - h - 1.2, sz = p.z - h, sy = H(sx, sz);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.1), G.renderer.linMat(new THREE.MeshLambertMaterial({ color: '#e8d7a8' })));
        sign.position.set(sx, sy + 1.4, sz); sign.castShadow = true;
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), madera);
        stick.position.set(sx, sy + 0.7, sz);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.14, 0.11), mat); stripe.position.set(sx, sy + 1.62, sz);
        g.add(sign, stick, stripe);
        p.post = { x: sx, z: sz };
        colliders.push({ x: p.post.x, z: p.post.z, r: 0.35, kind: 'post' });
        scene.add(g);
      }
      parcelMarker(PLACES.A, '#f2a03d');
      parcelMarker(PLACES.B, '#d6403a');

      // Mirador: en el mapa es el mirador escalonado de Kelvin (src/engine/mundo.js); aquí queda el marcador de la historia
      const MIRADOR = PLACES.mirador;
      const mirador = new THREE.Group();
      if (!MAPA) {
        const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.4, 10), new THREE.MeshLambertMaterial({ color: '#a8743f' }));
        deck.position.y = 0.2; mirador.add(deck);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2; const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), new THREE.MeshLambertMaterial({ color: '#7a5634' }));
          post.position.set(Math.cos(a) * 2.1, 0.8, Math.sin(a) * 2.1); mirador.add(post);
        }
      }
      mirador.position.set(MIRADOR.x, H(MIRADOR.x, MIRADOR.z), MIRADOR.z); scene.add(mirador);

      // ---------- Taller de Vittata ----------
      // Mapa: bohío redondo del kit de Kelvin con un toldo de trabajo; la Ruptura tumbó el toldo y regó tablas.
      // Analítico: la caseta de primitivas de antes.
      const taller = new THREE.Group();
      const tY = T.base;
      const wood = G.renderer.linMat(new THREE.MeshLambertMaterial({ color: '#a8743f' }));
      const windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), G.renderer.linMat(new THREE.MeshBasicMaterial({ color: '#3a2a1a' })));
      const debris = new THREE.Group();
      const tablas = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 0.12, 0.35), wood, 5);
      for (let i = 0; i < 5; i++) {
        const o = new THREE.Object3D(); o.position.set(-2 + i * 0.9, 0.08, 3.6 + (i % 2) * 0.6); o.rotation.y = i * 0.7; o.updateMatrix();
        tablas.setMatrixAt(i, o.matrix);
      }
      tablas.castShadow = true; tablas.frustumCulled = false; debris.add(tablas);
      let roofL = null, roofR = null, toldo = null;
      // el taller mira hacia la plaza
      const facing = Math.atan2(PLACES.villa.x - T.x, PLACES.villa.z - T.z);
      if (MAPA && G.mundo && G.mundo.edificio) {
        taller.rotation.y = facing;
        windowGlow.position.set(0, 1.25, 2.95); windowGlow.visible = false;
        G.mundo.edificio('bohio_redondo', { agregar: false, escala: 0.95 }).then(g => { taller.add(g); }).catch(() => {});
        G.mundo.edificio('toldo_pequeno', { agregar: false, escala: 0.95 }).then(g => { toldo = g; g.position.set(-3.9, 0, 2.4); taller.add(g); applyTallerLook(); }).catch(() => {});
        taller.add(windowGlow, debris);
      } else {
        const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 4), wood);
        walls.position.y = 1.3;
        const roofMat = new THREE.MeshLambertMaterial({ color: '#7c3b2a', side: THREE.DoubleSide });
        roofL = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3), roofMat);
        roofR = roofL.clone();
        roofL.position.set(0, 3.3, -1); roofL.rotation.set(-Math.PI / 2 + 0.55, 0, 0);
        windowGlow.position.set(0, 1.5, 2.01);
        debris.position.z = -0.8;
        taller.add(walls, roofL, roofR, windowGlow, debris);
      }
      taller.position.set(T.x, tY, T.z);
      scene.add(taller);
      // r es el radio para comprobar construcciones; hx/hz es la caja real de las paredes para chocar
      if (MAPA) colliders.push({ x: T.x, z: T.z, r: 2.9, kind: 'taller' });
      else colliders.push({ x: T.x, z: T.z, r: 2.6, hx: 2.55, hz: 2.05, kind: 'taller' });

      // Objetos del taller: máquina experimental, transmisor y banco de trabajo (mejora), al frente del taller
      // Modelos de objetosHistoria() (hito 28). El engranaje de la máquina se ve en el techo del refugio y la máquina queda con el
      // hueco (S.gearRoof, BM24). Las posiciones, las colisiones y los nombres que usa la historia no cambian.
      const OBJ = objetosHistoria(G.renderer.linMat);
      G.c.objetos = OBJ; // misiones.js (coquíes del coro) y las pruebas
      const fx = Math.sin(facing), fz = Math.cos(facing), rx = Math.cos(facing), rz = -Math.sin(facing);
      const MAQ = MAPA ? { x: T.x + fx * 4.4 - rx * 2.4, z: T.z + fz * 4.4 - rz * 2.4 } : { x: T.x - 2.6, z: T.z + 3.4 };
      const TRX = MAPA ? { x: T.x + fx * 4.2 + rx * 3.0, z: T.z + fz * 4.2 + rz * 3.0 } : { x: T.x + 3.4, z: T.z + 2.6 };
      const maquina = OBJ.maquina();
      // Engranaje de la máquina (NARRATIVA «Cierre»): Vittata lo sacrifica para el techo del refugio (S.gearRoof); entonces queda el hueco
      const hacerEngranaje = OBJ.engranaje;
      const engMaquina = hacerEngranaje(0.26);
      engMaquina.rotation.z = Math.PI / 2; engMaquina.position.set(0.58, 0.55, 0);
      const huecoMaquina = OBJ.huecoEngranaje();
      huecoMaquina.rotation.z = Math.PI / 2; huecoMaquina.position.set(0.57, 0.55, 0);
      maquina.add(engMaquina, huecoMaquina);
      const aplicarEngranaje = () => { engMaquina.visible = !S.gearRoof; huecoMaquina.visible = !!S.gearRoof; };
      aplicarEngranaje(); G.on('apply', aplicarEngranaje, 37);
      maquina.position.set(MAQ.x, H(MAQ.x, MAQ.z), MAQ.z);
      if (MAPA) maquina.rotation.y = facing; // el indicador y las luces miran a la plaza, como el transmisor
      scene.add(maquina);
      colliders.push({ x: MAQ.x, z: MAQ.z, r: 0.6, kind: 'obj' });
      const trx = OBJ.transmisor();
      const trxAnt = trx.userData.antena, trxLight = trx.userData.luz, trxDial = trx.userData.dial;
      trx.position.set(TRX.x, H(TRX.x, TRX.z), TRX.z);
      if (MAPA) trx.rotation.y = facing;
      scene.add(trx);
      colliders.push({ x: TRX.x, z: TRX.z, r: 0.6, kind: 'obj' });
      const BEN = MAPA ? { x: T.x - rx * 4.6 + fx * 1.2, z: T.z - rz * 4.6 + fz * 1.2 } : { x: T.x - 3.6, z: T.z + 0.2 };
      const bench = OBJ.banco();
      bench.position.set(BEN.x, H(BEN.x, BEN.z), BEN.z);
      if (MAPA) bench.rotation.y = facing;
      colliders.push({ x: BEN.x, z: BEN.z, r: 1, hx: 0.95, hz: 0.45, kind: 'bench', when: () => bench.visible });
      scene.add(bench);

      function applyTallerLook() {
        if (S.transmitterOn) {
          if (roofR) { roofR.rotation.set(-Math.PI / 2 - 0.55, 0, 0); roofR.position.set(0, 3.3, 1); }
          if (toldo) { toldo.rotation.set(0, 0.3, 0); toldo.position.y = 0; }
          debris.visible = false; windowGlow.material.color.set('#ffd27a').convertSRGBToLinear(); windowGlow.visible = true;
          trxAnt.rotation.z = 0; trxLight.material.color.set('#7fd38f').convertSRGBToLinear(); trxDial.emissive.set('#ffcf7a').convertSRGBToLinear().multiplyScalar(0.55);
        } else {
          if (roofR) { roofR.rotation.set(-0.3, 0.2, 0.9); roofR.position.set(2.6, 0.6, 1.8); }
          if (toldo) { toldo.rotation.set(0.15, 0.9, 1.25); toldo.position.y = 0.55; } // la Ruptura lo tumbó
          debris.visible = true; windowGlow.material.color.set('#3a2a1a').convertSRGBToLinear(); windowGlow.visible = !MAPA;
          trxAnt.rotation.z = 0.5; trxLight.material.color.set('#4a4a4a').convertSRGBToLinear(); trxDial.emissive.setRGB(0, 0, 0); trxLight.scale.setScalar(1);
        }
        bench.visible = S.benchUnlocked;
      }

      // ---------- Refugio: fantasma del modo construir y el refugio construido ----------
      // Mapa: bohío pequeño del kit de Kelvin (cuando carga); antes, y en el mundo analítico, la choza de primitivas.
      let modeloRefugio = null;
      if (MAPA && G.mundo && G.mundo.edificio) G.mundo.edificio('bohio_redondo', { agregar: false, escala: 0.7 }).then(g => { modeloRefugio = g; refrescarFantasma(); if (S.refuge) placeRefugeMesh(); }).catch(() => {});
      function hutMesh(opacity) {
        const g = new THREE.Group();
        const transparent = opacity < 1;
        if (modeloRefugio) {
          const m = modeloRefugio.clone(true);
          m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = transparent; o.material.opacity = opacity; o.material.depthWrite = !transparent; o.castShadow = !transparent; } });
          g.add(m);
          return g;
        }
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), new THREE.MeshLambertMaterial({ color: '#c99a5b', transparent, opacity }));
        body.position.y = 0.8;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), new THREE.MeshLambertMaterial({ color: '#5e8f3a', transparent, opacity }));
        roof.position.y = 2.2; roof.rotation.y = Math.PI / 4;
        g.add(body, roof);
        return G.renderer.linearize(g);
      }
      const ghost = new THREE.Group(); ghost.visible = false; scene.add(ghost);
      function refrescarFantasma() { ghost.clear(); ghost.add(hutMesh(0.5)); }
      refrescarFantasma();
      let refugeMesh = null;
      function placeRefugeMesh() {
        if (refugeMesh) { scene.remove(refugeMesh); refugeMesh = null; }
        G.fisica.removeColliders('refuge');
        if (!S.refuge) return;
        refugeMesh = hutMesh(1);
        refugeMesh.position.set(S.refuge.x, H(S.refuge.x, S.refuge.z), S.refuge.z);
        if (S.refuge.damaged) {
          refugeMesh.rotation.z = 0.18;
          // dañado: barro y humedad oscurecen la madera y la paja
          refugeMesh.traverse(o => { if (o.isMesh && o.material && o.material.color) o.material.color.multiply(new THREE.Color(0.55, 0.5, 0.42)); });
        }
        if (S.gearRoof) { // el engranaje de la máquina, sobre el techo
          const cj = new THREE.Box3().setFromObject(refugeMesh), eng = hacerEngranaje(0.3);
          eng.position.set(0, cj.max.y - refugeMesh.position.y + 0.12, 0); eng.name = 'engranaje_techo'; refugeMesh.add(eng);
        }
        scene.add(refugeMesh);
        colliders.push({ x: S.refuge.x, z: S.refuge.z, r: modeloRefugio ? 1.9 : 1.4, kind: 'refuge' }); // bohío de 4,4 m (pared de 1,6 m: a escala con la cotorra)
      }
      // El transmisor encendido late; mientras habla la Voz, el piloto parpadea rápido y el dial titila con la estática.
      // La luz ámbar de la máquina dañada falla de vez en cuando (la verde queda fija y la de abajo está fundida).
      const vozHabla = () => { try { const a = G.dialogo && G.dialogo.actual && G.dialogo.actual(); return !!a && /^(Voz|Voice)$/.test(String(a.who).trim()); } catch (err) { return false; } };
      const luzAmbar = maquina.userData.luces[1].material, ambar = luzAmbar.color.clone();
      G.on('render', (dt, t) => {
        luzAmbar.color.copy(ambar).multiplyScalar(Math.sin(t * 9.1) * Math.sin(t * 2.3) > 0.55 ? 0.25 : 1);
        if (!S.transmitterOn) return;
        if (vozHabla()) {
          const on = Math.sin(t * 23) + Math.sin(t * 37) > -0.3;
          trxLight.scale.setScalar(on ? 1.3 : 0.85); trxDial.emissiveIntensity = on ? 1.5 : 0.6;
        } else { trxLight.scale.setScalar(1 + Math.sin(t * 6) * 0.25); trxDial.emissiveIntensity = 1; }
      }, 35);

      // ---------- Luz en la niebla (SCRIPT p.12 · NARRATIVA «Final») ----------
      // Desde el mirador, una luz lejana parpadea tres veces, como respuesta a la señal. Es un sprite aditivo sin niebla puesto en la
      // isla del centro; solo existe desde esa escena (S.boatPlan) y luego queda encendida con un pulso lento. El tamaño sale de la
      // distancia (unos 5° en pantalla) y el parpadeo corre en el gancho update (con el tiempo del juego), así que se puede probar con tick().
      // [KELVIN-8] Quién contesta (¿la Voz?, ¿el pacto de los 36?) no se revela en el cap. 1: la luz es neutra, sin color de personaje.
      const luzMirador = (() => {
        const islas = G.terreno.islas || [];
        if (!islas.length) return null;
        const I = islas[Math.min(1, islas.length - 1)];
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        const cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,252,235,1)'); gr.addColorStop(0.1, 'rgba(255,238,175,0.95)'); gr.addColorStop(0.3, 'rgba(255,214,130,0.4)'); gr.addColorStop(1, 'rgba(255,214,130,0)');
        cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
        const sp = new THREE.Sprite(G.renderer.linMat(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 })));
        // En la orilla de la isla que mira al mirador y a unos metros sobre el mar
        const d = Math.hypot(I.x - MIRADOR.x, I.z - MIRADOR.z) || 1, k = (d - I.r * 0.5) / d;
        const dist = d * k, esc = dist * 0.1;
        sp.position.set(MIRADOR.x + (I.x - MIRADOR.x) * k, (MAPA ? 0 : -2.6) + I.r * 0.34, MIRADOR.z + (I.z - MIRADOR.z) * k);
        sp.scale.set(esc, esc, 1); sp.visible = false; sp.renderOrder = 5; scene.add(sp);
        const L = { sprite: sp, isla: I, seq: null, fijo: false, destellos: 0, brillo: 0 };
        // 3 destellos de 0,5 s, uno por segundo, tras 0,4 s de espera; al terminar la luz queda encendida
        L.parpadear = (veces) => { L.seq = { t: 0, n: veces || 3, ultimo: -1 }; L.destellos = 0; sp.visible = true; };
        L.reposo = () => { L.seq = null; L.fijo = true; sp.visible = true; };
        L.destello = () => { sp.visible = true; sp.material.opacity = 1; L.brillo = 1; }; // brillo máximo hasta el siguiente cuadro (foto de la última viñeta)
        L.apagar = () => { L.seq = null; L.fijo = false; L.destellos = 0; L.brillo = 0; sp.visible = false; sp.material.opacity = 0; };
        G.on('update', dt => {
          if (!sp.visible) return;
          let b = 0;
          if (L.seq) {
            const q = L.seq, u = (q.t += dt) - 0.4;
            if (u >= 0) {
              const i = Math.floor(u), f = u - i;
              if (i < q.n) {
                b = f < 0.5 ? Math.pow(Math.sin(Math.PI * f / 0.5), 2) : 0;
                if (i !== q.ultimo) { q.ultimo = i; L.destellos = i + 1; G.audio.play('parpadeo', i); }
              } else if (u > q.n + 0.2) L.reposo();
            }
          }
          if (!L.seq && L.fijo) b = 0.28 + 0.06 * Math.sin(S.clock * 1.3);
          L.brillo = b; sp.material.opacity = Math.min(1, b);
          sp.visible = !!L.seq || L.fijo;
        }, 36);
        // Al cargar o reiniciar: encendida con pulso lento solo si el plano del bote ya se desbloqueó
        G.on('apply', () => { L.apagar(); if (S.boatPlan) L.reposo(); }, 36);
        return L;
      })();

      Object.assign(G.c, { aplicarEngranaje, engMaquina, maquina, trx, PLACES, T, MAQ, TRX, MIRADOR, mirador, bench, ghost, applyTallerLook, placeRefugeMesh, refugeMesh: () => refugeMesh, luzMirador });
    },
  });
})();
