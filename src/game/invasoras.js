/* Juego · Patrulla invasora (ENCENDIDA para todos desde el 9-nov, Kelvin la aprobó; bandera propia G.INVASORAS, ?invasoras=0 la apaga).
   Cuatro especies invasoras reales de Puerto Rico en su hábitat del mapa del cap. 1: la iguana verde tomando el sol en la orilla del
   río junto al puente de Villa Raíz, un grupo de tilapias en el río junto a la villa, dos plecos pegados al fondo río arriba y dos peces
   león en el arrecife de la playa. NUNCA son enemigos: no se atacan, no se cazan, no se tocan. Se observan y se reportan a la Estación
   de Conservación de Villa Raíz.
   - Avistar = a menos del radio de la especie (7–10 m), despacio (menos de 4 m/s), 1,5 s; o «Foto» (G.emit('foto')) a 1,5 radios o menos.
     La primera vez: flash de cámara, aviso «reporte enviado a la Estación (n/4)», su ficha en la sección «Patrulla invasora» del Diario
     (con fuente y enlace) y G.emit('aprendizaje', { tipo: 'invasora', id }). Con las 4: «¡Patrulla completa!».
     La primera vez a menos de 22 m de una sin avistar sale una pista corta («acércate despacio…»).
   - Guardado en el dispositivo, aparte de la partida: <almacen>.invasoras = { v: 1, vistos: [ids], completa }.
   - Datos y fuentes: content/cap1/invasoras.js (USGS NAS y DRNA; literales anotados allí). Nada inventado.
   - Bajo el agua: de lejos el agua los tapa; a menos de 1,6 radios se ven claros a través de ella («visor», como rio_vivo.js).
   - Arte: mallas hechas aquí, sin modelos 3D nuevos (la iguana, suave y animada: ver iguanaVerde; los peces, con primitivas);
     4 InstancedMesh, 4 draw calls como mucho, sin sombras,
     apagadas a más de 70 m. boot.js la carga al primer gesto sin ?expansion=1 (ya no hay bandera de expansión). Con ?invasoras=0
     (G.INVASORAS = false) no se carga; si se carga igual, nada se ve y la sección del Diario queda vacía. Nada se ve en las baterías
     (G.quiet) salvo dentro de su propia prueba.
   [KELVIN] 9-nov: aprobada con capturas (iguana caricatura incluida: «me gusta cómo se ve»); se enciende para todos.
   window.AVInvasoras(G) → Promise de G.invasoras = { estado, activo, avistar, paso, test, … }. Prueba: AV.invasorasTest(). */
(function () {
  'use strict';
  // ===== IGUANA-INICIO · Iguana verde (Iguana iguana): malla suave hecha aquí, sin modelos nuevos =====
  // Cuerpo y cola: un tubo sobre una columna CatmullRom (marcos de transporte paralelo); cabeza, ojos, papada y escama subtimpánica:
  // esferas esculpidas con normales suaves calculadas sobre la deformación; patas: tubos con codo/rodilla; cresta, dedos y uñas: conos.
  // Origen en el suelo, +Z hacia delante, +Y arriba; ≈ 1,3 m con la cola. Un solo InstancedMesh (1 draw call), ≈ 3,6k triángulos, sin
  // sombras. Color por vértice (vientre claro, bandas oscuras de la cola, iris dorado…) × textura de escamas dibujada en un canvas (y
  // como relieve). Vida en el vertex shader según aMarca: 0 cuerpo (respira; el cuello sigue a la cabeza), 1 cabeza (cabeceo de iguana
  // en ráfagas y mirada lenta), 2 cola (vaivén lento), 3 párpados (parpadeo), 4 papada (se abre al cabecear), 5 patas (quietas).
  function iguanaVerde(uT) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z), C = h => new THREE.Color(h).convertSRGBToLinear();
    const mez = (a, b, t) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));
    const suave = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const pos = [], nor = [], uvs = [], col = [], mk = [], esc = [], idx = [];
    const vert = (p, n, u, v, c, m, e) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); uvs.push(u, v); col.push(c.r, c.g, c.b); mk.push(m); esc.push(e); return pos.length / 3 - 1; };
    const perp = n => (Math.abs(n.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).cross(n).normalize();
    // Pieza: geometría base deformada por f(q) (q = vértice original); la normal sale de la deformación (sin costuras ni facetas)
    function pieza(g, f, color, marca, e, uvK) {
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, base = pos.length / 3, eps = 1e-3;
      for (let i = 0; i < p.count; i++) {
        const q = V(p.getX(i), p.getY(i), p.getZ(i)), n0 = V(n.getX(i), n.getY(i), n.getZ(i)).normalize(), e1 = perp(n0), e2 = n0.clone().cross(e1);
        const r = f(q), a = f(q.clone().addScaledVector(e1, eps)).sub(r), b = f(q.clone().addScaledVector(e2, eps)).sub(r);
        let nn = a.cross(b); if (nn.lengthSq() < 1e-14) nn = f(q.clone().addScaledVector(n0, eps)).sub(r);
        nn.normalize(); if (nn.dot(f(q.clone().addScaledVector(n0, eps)).sub(r)) < 0) nn.negate();
        vert(r, nn, uvK ? u.getX(i) * uvK[0] : 0, uvK ? u.getY(i) * uvK[1] : 0, typeof color === 'function' ? color(q, r) : color, typeof marca === 'function' ? marca(r) : marca, e);
      }
      const ix = g.index; for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
    }
    const esf = (w, h) => new THREE.SphereGeometry(1, w, h), cono = () => new THREE.ConeGeometry(1, 1, 4, 1, true);
    // Tubo a lo largo de una curva. perfil(s, d) → [w, h] semiejes lateral/vertical (s 0..1, d en metros); color(s, d, ang, p)
    function tubo(puntos, nSeg, nRad, perfil, color, marca, e, uvK, arriba, panza) {
      const curva = new THREE.CatmullRomCurve3(puntos, false, 'centripetal'), L = curva.getLength(), P = curva.getSpacedPoints(nSeg), T = [];
      for (let i = 0; i <= nSeg; i++) T.push(curva.getTangentAt(i / nSeg).normalize());
      const N = [], B = [], W = [];
      let n = (arriba || V(0, 1, 0)).clone(); n.addScaledVector(T[0], -n.dot(T[0])).normalize();
      const grid = [];
      for (let i = 0; i <= nSeg; i++) {
        if (i) { const ax = T[i - 1].clone().cross(T[i]), sa = ax.length(); if (sa > 1e-7) n.applyAxisAngle(ax.normalize(), Math.atan2(sa, T[i - 1].dot(T[i]))); n.addScaledVector(T[i], -n.dot(T[i])).normalize(); }
        const b = T[i].clone().cross(n).normalize(), s = i / nSeg, wh = perfil(s, s * L); N.push(n.clone()); B.push(b); W.push(wh);
        const fila = [];
        for (let j = 0; j <= nRad; j++) { const a = (j / nRad) * Math.PI * 2, sn = Math.sin(a); fila.push(P[i].clone().addScaledVector(b, Math.cos(a) * wh[0]).addScaledVector(n, sn * wh[1] * (sn < 0 ? (panza || 1) : 1))); }
        grid.push(fila);
      }
      const base = pos.length / 3;
      for (let i = 0; i <= nSeg; i++) for (let j = 0; j <= nRad; j++) {
        const jj = j % nRad, ga = grid[i][(jj + 1) % nRad].clone().sub(grid[i][(jj + nRad - 1) % nRad]);
        const gs = grid[Math.min(nSeg, i + 1)][j].clone().sub(grid[Math.max(0, i - 1)][j]), rad = grid[i][j].clone().sub(P[i]);
        let nn = ga.cross(gs); if (nn.lengthSq() < 1e-16) nn = rad.clone(); if (nn.lengthSq() < 1e-16) nn = T[i].clone();
        nn.normalize(); if (nn.dot(rad) < 0) nn.negate();
        const a = (j / nRad) * Math.PI * 2, s = i / nSeg, p = grid[i][j];
        vert(p, nn, (j / nRad) * uvK[0], s * L * uvK[1], color(s, s * L, a, p), typeof marca === 'function' ? marca(p) : marca, e);
      }
      // sentido de los triángulos hacia fuera
      const g0 = grid[1][0], g1 = grid[1][1], g2 = grid[2][0], cara = g1.clone().sub(g0).cross(g2.clone().sub(g0)), fuera = cara.dot(g0.clone().sub(P[1])) > 0;
      for (let i = 0; i < nSeg; i++) for (let j = 0; j < nRad; j++) {
        const a = base + i * (nRad + 1) + j, b = a + 1, c = a + nRad + 1, d = c + 1;
        if (fuera) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
      }
      return { P, T, N, B, W, L, nSeg };
    }
    const interp = (tabla, d) => { // tabla [[d, ...valores]] lineal suavizada
      if (d <= tabla[0][0]) return tabla[0].slice(1);
      for (let i = 1; i < tabla.length; i++) if (d <= tabla[i][0]) { const a = tabla[i - 1], b = tabla[i], t = (d - a[0]) / (b[0] - a[0]), k = t * t * (3 - 2 * t); return a.slice(1).map((v, j) => v + (b[j + 1] - v) * k); }
      return tabla[tabla.length - 1].slice(1);
    };
    // ---- Paleta (verde iguana con tonos gris y naranja; bandas casi negras en la cola) ----
    const K = { lomo: C('#3b7322'), flanco: C('#548f32'), vientre: C('#a3bb6a'), raya: C('#46722a'), banda: C('#2e3622'), colaClara: C('#948f58'),
      naranja: C('#c98b3e'), cabeza: C('#457e27'), labio: C('#a6b874'), escudo: C('#a3b585'), borde: C('#6f8f4a'), tímpano: C('#56663c'),
      iris: C('#d9a441'), pupila: C('#0d0d0b'), anillo: C('#2a2c1c'), brillo: C('#ffffff'), papada: C('#6a9a40'), papadaBorde: C('#b3bf78'),
      espina: C('#4f7f2e'), punta: C('#aab56c'), pata: C('#4b7e2d'), uña: C('#2b2820'), boca: C('#3d5226') };
    const mancha = (c, p) => { const r = Math.sin(p.x * 91.7 + p.y * 47.3 + p.z * 133.1) * 43758.5453, f = r - Math.floor(r); return c.clone().multiplyScalar(0.9 + 0.13 * f); }; // variación orgánica
    // ---- Cuerpo + cola (de la nuca a la punta de la cola) ----
    const columna = [V(0, 0.146, 0.280), V(0, 0.124, 0.200), V(0, 0.088, 0.100), V(0, 0.074, -0.020), V(0, 0.068, -0.150), V(0.025, 0.048, -0.280),
      V(0.090, 0.032, -0.420), V(0.170, 0.024, -0.560), V(0.200, 0.020, -0.720), V(0.140, 0.016, -0.870), V(0.020, 0.013, -0.980), V(-0.090, 0.011, -1.040)];
    const PERFIL = [[0, 0.032, 0.034], [0.08, 0.042, 0.050], [0.17, 0.058, 0.070], [0.28, 0.070, 0.082], [0.38, 0.066, 0.076], [0.45, 0.050, 0.058],
      [0.52, 0.038, 0.046], [0.70, 0.026, 0.033], [0.95, 0.015, 0.019], [1.20, 0.007, 0.009], [1.36, 0.002, 0.002]];
    const COLA = 0.47; // d donde empieza la cola
    const cuerpo = tubo(columna, 56, 12, (s, d) => interp(PERFIL, d), (s, d, a, p) => {
      const sn = Math.sin(a), lado = Math.abs(Math.cos(a));
      let c = mez(K.flanco, K.lomo, suave(0.15, 0.85, sn));
      c = mez(c, K.vientre, suave(-0.15, -0.75, sn));
      if (d > 0.10 && d < COLA) { const f = (d / 0.075) % 1; c = mez(c, K.raya, 0.55 * (1 - suave(0.0, 0.35, Math.abs(f - 0.5) * 2)) * suave(-0.35, 0.1, sn) * lado); } // rayas verticales tenues
      if (d < 0.20) c = mez(c, K.naranja, 0.18 * suave(-0.2, -0.8, sn)); // garganta y pecho algo naranja
      if (d > COLA) { // cola: verde → gris tostado, con anillos oscuros
        const t = (d - COLA) / 0.9; c = mez(c, K.colaClara, t * 0.85);
        const f = ((d - COLA) / 0.085) % 1, anillo = 1 - suave(0.18, 0.32, Math.abs(f - 0.3) * 2);
        c = mez(c, K.banda, anillo * (0.55 + 0.4 * suave(0, 0.3, t)) * (sn < -0.4 ? 0.55 : 1));
      }
      return mancha(c, p);
    }, p => (p.z < -0.22 ? 2 : 0), 1, [6, 13], V(0, 1, 0), 0.72);
    // ---- Cabeza (esfera esculpida: cráneo plano, mejillas anchas, hocico redondeado) ----
    const ojo = V(), CAB = V(0, 0.152, 0.300), rot = new THREE.Matrix4().makeRotationX(0.13);
    const enCab = (x, y, z) => V(x, y, z).applyMatrix4(rot).add(CAB);
    const forma = q => {
      const k = (q.z + 1) / 2, w = 0.049 * (1 - 0.42 * Math.pow(k, 1.6)), h = 0.042 * (1 - 0.30 * k);
      let x = q.x * w, y = q.y * h; const z = q.z * 0.076;
      if (q.y > 0) { y *= 0.80; x *= 1 - 0.18 * q.y * q.y; }                    // cráneo plano, lados casi rectos
      if (q.y < 0) x *= 1 + 0.22 * (1 - k) * -q.y;
      y -= 0.006 * k * k;
      return enCab(x, y, z);
    };
    pieza(esf(18, 12), forma, q => {
      let c = mez(K.flanco, K.cabeza, suave(-0.1, 0.6, q.y));
      c = mez(c, K.labio, suave(-0.28, -0.5, q.y) * suave(-0.6, 0.0, q.z));
      c = mez(c, K.boca, 0.75 * (1 - suave(0.0, 0.06, Math.abs(q.y + 0.259))) * suave(-0.75, -0.2, q.z)); // comisura de la boca
      return mancha(mez(c, K.vientre, suave(-0.55, -0.9, q.y)), q);
    }, 1, 1, [6, 3]);
    const sup = (x, y, z) => forma(V(x, y, z).normalize()), radial = p => { const a = CAB.clone().sub(p); a.y *= 0.6; return a.negate().normalize(); };
    const disco = (p, n, r, grosor) => { const qn = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), n); return q => V(q.x * grosor, q.y * r, q.z * r).applyQuaternion(qn).add(p); };
    for (const s of [1, -1]) {
      // ojo: polo de la esfera hacia fuera → anillos nítidos de pupila e iris; medio hundido en la cabeza
      const pO = sup(s * 0.80, 0.42, 0.30), dir = radial(pO).add(V(0, 0.12, 0.22)).normalize(), cO = pO.clone().addScaledVector(dir, -0.0052);
      const qO = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
      if (s > 0) ojo.copy(cO);
      pieza(esf(10, 8), q => q.clone().applyQuaternion(qO).multiplyScalar(0.0108).add(cO), q => (q.y > 0.88 ? K.pupila : q.y > 0.5 ? K.iris : K.anillo), 1, 0);
      pieza(esf(4, 3), q => q.clone().multiplyScalar(0.0021).add(cO).addScaledVector(dir, 0.0098).add(V(0, 0.0035, 0.002)), K.brillo, 1, 0); // brillo del ojo
      pieza(esf(8, 6), q => q.clone().multiplyScalar(0.0122).add(cO), K.cabeza, 3, 1, [1, 1]);                                   // párpado (crece al parpadear)
      const pC = sup(s * 0.62, 0.78, 0.30); pieza(esf(6, 4), q => enCab(q.x * 0.007, q.y * 0.003, q.z * 0.016).sub(CAB).add(pC).addScaledVector(radial(pC), -0.0012), K.cabeza, 1, 1, [1, 1]); // ceja
      const pT = sup(s * 0.86, 0.22, -0.60); pieza(esf(6, 4), disco(pT.clone().addScaledVector(radial(pT), -0.001), radial(pT), 0.0085, 0.0018), K.tímpano, 1, 0); // tímpano
      const pE = sup(s * 0.90, -0.40, -0.22), nE = V(s, -0.12, 0.08).applyMatrix4(new THREE.Matrix4().extractRotation(rot)).normalize(); // escama subtimpánica: disco grande y claro, casi a ras
      pieza(esf(10, 6), disco(pE.clone().addScaledVector(nE, -0.0019), nE, 0.0165, 0.0028), q => mez(K.escudo, K.borde, suave(0.55, 0.95, Math.hypot(q.y, q.z))), 1, 0);
      const pN = sup(s * 0.40, 0.40, 0.94); pieza(esf(4, 3), disco(pN, radial(pN), 0.0024, 0.0012), K.pupila, 1, 0); // narina
    }
    // ---- Papada (abanico fino bajo la barbilla) con espinitas en el borde delantero ----
    const fondo = []; for (let i = 0; i <= 16; i++) { const qz = -1 + i / 8, p = forma(V(0, -Math.sqrt(Math.max(0, 1 - qz * qz)), qz)); fondo.push([p.z, p.y]); } // barbilla y quijada
    const PZ0 = 0.175, PZ1 = fondo[15][0], papY = z => (z < fondo[2][0] ? 0.090 + (fondo[2][1] + 0.004 - 0.090) * suave(PZ0, fondo[2][0], z) : interp(fondo, z)[0] + 0.004);
    const papHondo = u => { u = Math.max(0, Math.min(1, u)); return 0.046 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(u, 1.15))), 0.9); };
    pieza(esf(12, 8), q => {
      const z = (PZ0 + PZ1) / 2 + q.z * (PZ1 - PZ0) / 2, u = (z - PZ0) / (PZ1 - PZ0), v = (q.y + 1) / 2;
      return V(q.x * 0.0045 * (0.35 + 0.65 * v), papY(z) - (1 - v) * papHondo(u), z);
    }, q => mez(K.papada, K.papadaBorde, suave(-0.55, -0.95, q.y)), 4, 0.7, [4, 3]);
    for (let i = 0; i < 5; i++) {
      const u = 0.62 + i * 0.07, z = PZ0 + u * (PZ1 - PZ0), b = V(0, papY(z) - papHondo(u) + 0.004, z), dir = V(0, -0.45, 1).normalize();
      pieza(cono(), q => { const t = q.y + 0.5; return b.clone().addScaledVector(dir, 0.012 * t).add(V(q.x * 0.0015, 0, q.z * 0.003)); }, q => mez(K.papadaBorde, K.punta, q.y + 0.5), 4, 0);
    }
    // ---- Cresta dorsal: espinas en láminas, altas en la nuca, menguan por el lomo y siguen en la primera parte de la cola ----
    for (let d = 0.02; d < 0.95; d += d < 0.45 ? 0.028 : 0.042) {
      const i = Math.round((d / cuerpo.L) * cuerpo.nSeg), P = cuerpo.P[i], T = cuerpo.T[i], N = cuerpo.N[i], Bv = cuerpo.B[i], hT = cuerpo.W[i][1];
      const alto = 0.011 + 0.034 * (1 - suave(0.05, 0.55, d)) * suave(-0.04, 0.06, d) + 0.006 * (1 - suave(0.45, 0.9, d)), base = P.clone().addScaledVector(N, hT * 0.9);
      const dir = N.clone().addScaledVector(T, 0.55).normalize(), lb = 0.007 + 0.004 * (1 - suave(0.3, 0.8, d));
      pieza(cono(), q => { const t = q.y + 0.5; return base.clone().addScaledVector(dir, alto * t).addScaledVector(T, q.z * lb).addScaledVector(Bv, q.x * 0.0016); },
        q => mez(K.espina, K.punta, (q.y + 0.5) * 1.1), d > COLA - 0.12 ? 2 : 0, 0);
    }
    // ---- Patas: hombro/cadera → codo/rodilla → muñeca/tobillo, abiertas a los lados; mano y pie de 5 dedos largos con uñas ----
    const pata = (pts, r0, r1, r2) => tubo(pts, 8, 6, s => { const r = s < 0.5 ? r0 + (r1 - r0) * s * 2 : r1 + (r2 - r1) * (s - 0.5) * 2; return [r, r]; },
      (s, d, a) => mez(mez(K.pata, K.lomo, suave(0.2, 0.9, Math.sin(a))), K.vientre, 0.35 * suave(-0.3, -0.9, Math.sin(a))), 5, 1, [3, 24], V(0, 0, 1));
    const dedos = (c, rumbo, largos, abre, grosor) => {
      for (let k = 0; k < 5; k++) {
        const ang = rumbo + (k - 2) * abre, dir = V(Math.sin(ang), -0.12, Math.cos(ang)).normalize(), lado = V(Math.cos(ang), 0, -Math.sin(ang)), L = largos[k];
        pieza(cono(), q => { const t = q.y + 0.5; return c.clone().addScaledVector(dir, L * t).addScaledVector(lado, q.x * grosor).add(V(0, q.z * grosor * 0.7 + 0.004 * Math.sin(Math.PI * t), 0)); },
          q => (q.y > 0.22 ? K.uña : K.pata), 5, 0);
      }
      pieza(esf(6, 4), q => V(c.x + q.x * grosor * 2.2, c.y + q.y * 0.006, c.z + q.z * grosor * 2.2), K.pata, 5, 1, [1, 1]);
    };
    for (const s of [1, -1]) {
      pata([V(s * 0.035, 0.076, 0.085), V(s * 0.080, 0.078, 0.090), V(s * 0.108, 0.062, 0.100), V(s * 0.118, 0.030, 0.115), V(s * 0.120, 0.011, 0.125)], 0.020, 0.014, 0.009);
      dedos(V(s * 0.121, 0.008, 0.129), s * 0.55, [0.014, 0.020, 0.025, 0.027, 0.017], 0.38, 0.0035);
      pata([V(s * 0.040, 0.064, -0.150), V(s * 0.095, 0.072, -0.140), V(s * 0.130, 0.056, -0.150), V(s * 0.142, 0.028, -0.185), V(s * 0.145, 0.011, -0.200)], 0.026, 0.017, 0.010);
      dedos(V(s * 0.146, 0.008, -0.205), s * 2.05, [0.026, 0.046, 0.034, 0.026, 0.018], 0.30, 0.0038);
    }
    // ---- Geometría ----
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aMarca', new THREE.Float32BufferAttribute(mk, 1));
    g.setAttribute('aEsc', new THREE.Float32BufferAttribute(esc, 1));
    g.setIndex(idx); g.computeBoundingSphere();
    // ---- Textura de escamas (canvas 128 px: escamas redondas en filas alternas; también como relieve) ----
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x2 = cv.getContext('2d');
    x2.fillStyle = '#cbcbcb'; x2.fillRect(0, 0, 128, 128);
    for (let fy = 0; fy < 8; fy++) for (let fx = 0; fx < 8; fx++) for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) {
      const cx = fx * 16 + (fy % 2 ? 8 : 0) + ox, cy = fy * 16 + 8 + oy, gr = x2.createRadialGradient(cx - 2, cy - 3, 1, cx, cy, 9.5);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#f4f4f4'); gr.addColorStop(1, '#d2d2d2');
      x2.fillStyle = gr; x2.beginPath(); x2.ellipse(cx, cy, 8.8, 9.4, 0, 0, Math.PI * 2); x2.fill();
    }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: 0.55, metalness: 0, transparent: true, opacity: 1 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = uT;
      sh.vertexShader = 'uniform float uT;\nattribute float aMarca;\nattribute float iFase;\nattribute float aEsc;\nvarying float vEsc;\n' +
        'mat3 rX(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }\n' +
        'mat3 rY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }\n' +
        'vec3 iguana(vec3 p, inout vec3 n) {\n' +
        '  float t = uT + iFase;\n' +
        '  float c = mod(t, 7.3), bob = c < 2.1 ? pow(abs(sin(c * 4.488)), 1.4) * (1.0 - c / 2.6) : 0.0;\n' + // ráfaga de 3 cabeceos y pausa
        '  if (aMarca > 3.5 && aMarca < 4.5) { float hon = 1.0 + 0.35 * bob; p.y = 0.118 + (p.y - 0.118) * hon; }\n' + // la papada se despliega
        `  if (aMarca > 2.5 && aMarca < 3.5) { float b = mod(t + 1.7, 4.9); float cierra = 1.0 - smoothstep(0.0, 0.07, abs(b - 0.12)); vec3 cO = vec3(sign(p.x) * ${ojo.x.toFixed(4)}, ${ojo.y.toFixed(4)}, ${ojo.z.toFixed(4)});\n` +
        '    p = cO + (p - cO) * mix(0.84, 1.04, cierra); }\n' +
        '  if (aMarca < 0.5) { float tor = smoothstep(-0.24, -0.12, p.z) * (1.0 - smoothstep(0.05, 0.14, p.z)); float r = 0.5 + 0.5 * sin(t * 1.5);\n' +
        '    p.x *= 1.0 + 0.045 * r * tor; p.y = 0.08 + (p.y - 0.08) * (1.0 + 0.025 * r * tor); }\n' +
        '  if (aMarca > 1.5 && aMarca < 2.5) { float k = clamp((-p.z - 0.25) / 0.75, 0.0, 1.0); p.x += sin(t * 0.8 + p.z * 2.6) * 0.07 * k * k; p.z += sin(t * 0.8 + p.z * 2.6 + 1.2) * 0.012 * k * k; }\n' +
        '  float w = (aMarca > 0.5 && aMarca < 1.5) || (aMarca > 2.5 && aMarca < 4.5) ? 1.0 : (aMarca < 0.5 ? smoothstep(0.12, 0.23, p.z) : 0.0);\n' +
        '  if (w > 0.0) { mat3 R = rY(0.32 * sin(t * 0.21) * w) * rX(-0.15 * bob * w); vec3 pv = vec3(0.0, 0.115, 0.18); p = pv + R * (p - pv); n = R * n; }\n' +
        '  return p;\n}\n' +
        sh.vertexShader
          .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(normal);\nvec3 iguP = iguana(vec3(position), objectNormal);\nvEsc = aEsc;')
          .replace('#include <begin_vertex>', 'vec3 transformed = iguP;');
      sh.fragmentShader = 'varying float vEsc;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#ifdef USE_MAP\n vec4 texelColor = mapTexelToLinear(texture2D(map, vUv));\n diffuseColor.rgb *= mix(vec3(1.0), texelColor.rgb, vEsc);\n#endif');

    };
    mat.customProgramCacheKey = () => 'invasoras:iguana-v2';
    return { geo: g, mat, tris: idx.length / 3 };
  }
  // ===== IGUANA-FIN =====
  window.AVInvasoras = function (G) {
    if (G.invasoras) return Promise.resolve(G.invasoras);
    const datos = window.AV_INVASORAS ? Promise.resolve() : window.AVE.assets.script('content/cap1/invasoras.js');
    return datos.then(() => (G.invasoras = G.invasoras || crear(G)));
  };

  function crear(G) {
    const S = G.S, scene = G.renderer.scene, M = G.fisica.MOVE, D = window.AV_INVASORAS || { especies: [], album: {} };
    const H = (x, z) => G.terreno.height(x, z);
    const nivelAgua = (x, z) => (G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity);
    const MAPA = G.terreno.mapa || window.AV_MAPA_CAP1 || null, RIO = MAPA && MAPA.agua && MAPA.agua.rio && MAPA.agua.rio.puntos;
    const APAGA = 70, LENTO = 4, OBS_T = 1.5, PISTA_R = 22, VISOR = 1.6;
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' && en ? en : es);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.invasoras';
    const F = { prueba: false, t: 0, pistas: {}, cerca: {}, flash: null };
    const uT = { value: 0 };
    let oyenteTest = null;
    G.on('aprendizaje', d => { if (oyenteTest) oyenteTest(d); });

    // ---------- Bandera y guardado ----------
    const activo = () => G.INVASORAS !== false || F.prueba;
    let mem = { v: 1, vistos: [], completa: false };
    function leer() { try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && Array.isArray(d.vistos)) mem = { v: 1, vistos: d.vistos.filter(x => typeof x === 'string'), completa: !!d.completa }; } catch (e) { /* sin almacén */ } }
    function guardar() { if (F.prueba) return; try { localStorage.setItem(CLAVE, JSON.stringify(mem)); } catch (e) { /* sin almacén */ } }
    leer();
    const especies = () => (D.especies || []).filter(e => e.estado === 'verificado');
    const espDe = id => especies().find(e => e.id === id);

    // ---------- Geometría (no indexada, color por vértice, una marca por vértice: 1 = cabeza que cabecea, 2 = cola que ondula) ----------
    function Constructor() {
      const pos = [], col = [], mk = [];
      const c3 = h => { const c = new THREE.Color(h).convertSRGBToLinear(); return [c.r, c.g, c.b]; }; // colores de vértice en lineal: si no, salen lavados
      const api = {
        geo(g, color, marca, fn) {
          g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const v = fn ? fn(p.getX(i), p.getY(i), p.getZ(i)) : [p.getX(i), p.getY(i), p.getZ(i)];
            pos.push(v[0], v[1], v[2]); const k = c3(typeof color === 'function' ? color(v) : color); col.push(k[0], k[1], k[2]);
            mk.push(typeof marca === 'function' ? marca(v) : marca || 0);
          }
          return api;
        },
        tri(a, b, c, color, marca) { const k = c3(color); for (const v of [a, b, c]) { pos.push(...v); col.push(...k); mk.push(marca || 0); } return api; },
        fin() {
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
          g.setAttribute('aMarca', new THREE.Float32BufferAttribute(mk, 1));
          g.computeVertexNormals(); return g;
        },
      };
      return api;
    }
    const elip = (sx, sy, sz, x, y, z) => (px, py, pz) => [px * sx + x, py * sy + y, pz * sz + z];
    const esfera = (w, h) => new THREE.SphereGeometry(1, w || 10, h || 8);
    const cola = z => (z < 0 ? 2 : 0);

    // Iguana: malla suave propia (iguanaVerde, arriba), con su material y su animación
    const iguana = iguanaVerde(uT);

    // Pez genérico: cuerpo fusiforme a partir de una esfera (+Z hacia delante); bandas(z) da el color.
    function cuerpoPez(b, largo, ancho, alto, color, aplana) {
      b.geo(esfera(12, 8), color, cola, (x, y, z) => {
        const afina = z < 0 ? 1 + z * 0.75 : 1 - Math.max(0, z - 0.4) * 0.9;
        return [x * ancho * afina, y * alto * afina * (aplana && y < 0 ? 0.35 : 1), z * largo * 0.5];
      });
    }
    // Tilapia (≈ 0,3 m): cuerpo alto, gris oliva con barras verticales tenues
    const geoTilapia = (() => {
      const b = Constructor(), lomo = '#67745e', barra = '#4e5a48', aleta = '#5b5a48';
      cuerpoPez(b, 0.3, 0.045, 0.085, v => (Math.floor((v[2] + 0.2) / 0.04) % 2 ? barra : lomo));
      b.geo(esfera(6, 4), '#111', 0, elip(0.009, 0.009, 0.009, 0.03, 0.02, 0.1)).geo(esfera(6, 4), '#111', 0, elip(0.009, 0.009, 0.009, -0.03, 0.02, 0.1));
      b.tri([0, 0, -0.13], [0, 0.07, -0.21], [0, -0.07, -0.21], aleta, 2).tri([0, 0, -0.13], [0, -0.07, -0.21], [0, 0.07, -0.21], aleta, 2);
      b.tri([0, 0.07, 0.07], [0, 0.11, -0.04], [0, 0.06, -0.13], aleta, 2).tri([0, 0.07, 0.07], [0, 0.06, -0.13], [0, 0.11, -0.04], aleta, 2);
      return b.fin();
    })();
    // Pleco (≈ 0,45 m): alargado y chato por debajo, pardo oscuro con manchas, gran aleta de vela
    const geoPleco = (() => {
      const b = Constructor(), pardo = '#5a4630', mancha = '#2e2418', vela = '#4a3a28';
      cuerpoPez(b, 0.45, 0.07, 0.055, v => ((Math.floor(v[0] * 60) + Math.floor(v[2] * 30)) % 3 === 0 ? mancha : pardo), true);
      b.geo(esfera(8, 4), mancha, 0, elip(0.05, 0.012, 0.035, 0, -0.02, 0.19)); // boca de ventosa (disco por debajo)
      for (let i = 0; i < 6; i++) { const z0 = 0.08 - i * 0.035; b.tri([0, 0.04, z0], [0, 0.14 - i * 0.012, z0 - 0.02], [0, 0.04, z0 - 0.035], i % 2 ? mancha : vela); b.tri([0, 0.04, z0], [0, 0.04, z0 - 0.035], [0, 0.14 - i * 0.012, z0 - 0.02], i % 2 ? mancha : vela); }
      b.tri([0, 0, -0.2], [0, 0.07, -0.3], [0, -0.04, -0.3], vela, 2).tri([0, 0, -0.2], [0, -0.04, -0.3], [0, 0.07, -0.3], vela, 2);
      for (const s of [1, -1]) b.tri([s * 0.05, -0.02, 0.1], [s * 0.13, -0.03, 0.03], [s * 0.05, -0.02, -0.02], vela).tri([s * 0.05, -0.02, 0.1], [s * 0.05, -0.02, -0.02], [s * 0.13, -0.03, 0.03], vela);
      return b.fin();
    })();
    // Pez león (≈ 0,3 m): rayas rojizas y blancas, aletas pectorales en abanico y espinas largas en el lomo
    const geoLeon = (() => {
      const b = Constructor(), rojo = '#b8442e', blanco = '#f3e6d6';
      cuerpoPez(b, 0.28, 0.045, 0.07, v => (Math.floor((v[2] + 0.2) / 0.025) % 2 ? rojo : blanco));
      b.geo(esfera(6, 4), '#111', 0, elip(0.008, 0.008, 0.008, 0.03, 0.025, 0.1)).geo(esfera(6, 4), '#111', 0, elip(0.008, 0.008, 0.008, -0.03, 0.025, 0.1));
      for (let i = 0; i < 9; i++) { const z = 0.08 - i * 0.025, h = 0.16 - Math.abs(i - 3) * 0.012; // espinas del lomo
        b.geo(new THREE.ConeGeometry(0.004, h, 3), i % 2 ? rojo : blanco, cola(z), (x, y, zz) => [x, y + 0.05 + h / 2, zz + z]); }
      for (const s of [1, -1]) for (let i = 0; i < 7; i++) { // abanicos pectorales: radios rayados
        const a0 = -0.9 + i * 0.28, a1 = a0 + 0.28, r = 0.17, c = [s * 0.04, -0.01, 0.05];
        const p = (a, rr) => [c[0] + s * Math.cos(a) * rr * 0.7, c[1] + Math.sin(a) * rr * 0.5, c[2] - Math.cos(a) * rr * 0.6 - rr * 0.25];
        const col = i % 2 ? rojo : blanco;
        b.tri(c, p(a0, r), p(a1, r), col).tri(c, p(a1, r), p(a0, r), col);
      }
      b.tri([0, 0, -0.12], [0, 0.06, -0.2], [0, -0.06, -0.2], rojo, 2).tri([0, 0, -0.12], [0, -0.06, -0.2], [0, 0.06, -0.2], rojo, 2);
      return b.fin();
    })();

    // Material: Lambert con colores por vértice; la cola ondula (marca 2) y la cabeza cabecea (marca 1); iFase por instancia
    function material(nombre, amp, frec, bob) {
      const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 1 }); // opaca en la pasada transparente (la opaca no la dibujaba en las capturas)
      m.onBeforeCompile = sh => {
        sh.uniforms.uT = uT;
        sh.vertexShader = 'uniform float uT;\nattribute float aMarca;\nattribute float iFase;\n' + sh.vertexShader.replace('#include <begin_vertex>',
          'vec3 transformed = vec3(position);\n' +
          `if (aMarca > 1.5) transformed.x += sin(uT * ${frec.toFixed(2)} + iFase + position.z * 6.0) * ${amp.toFixed(3)} * clamp(-position.z * 4.0, 0.0, 1.0);\n` +
          `if (aMarca > 0.5 && aMarca < 1.5) transformed.y += max(0.0, sin(uT * 1.7 + iFase)) * ${bob.toFixed(3)};`);
      };
      m.customProgramCacheKey = () => 'invasoras:' + nombre;
      return m;
    }
    const MAXI = 4, mallas = {};
    function instanciada(id, geo, mat) {
      geo.setAttribute('iFase', new THREE.InstancedBufferAttribute(new Float32Array(MAXI), 1));
      const im = new THREE.InstancedMesh(geo, mat, MAXI);
      im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.count = 0; im.visible = false; im.name = 'invasoras:' + id;
      im.userData.sinCulling = true; im.userData.sinSolido = true;
      scene.add(im); mallas[id] = im; return im;
    }
    instanciada('iguana', iguana.geo, iguana.mat);
    instanciada('tilapia', geoTilapia, material('tilapia', 0.03, 8.0, 0));
    instanciada('pleco', geoPleco, material('pleco', 0.015, 3.0, 0));
    instanciada('pezleon', geoLeon, material('pezleon', 0.012, 2.0, 0));

    // ---------- Dónde viven (sacado del mapa al cargar) ----------
    const hogar = {}; // id → { x, z, y, yaw, n, individuos: [] }
    function puntoRio(cerca, minProf) { // el punto del río más cercano a «cerca» con agua de minProf m o más
      let mejor = null, md = Infinity;
      for (const p of RIO || []) {
        const d = Math.hypot(p[0] - cerca.x, p[1] - cerca.z); if (d >= md) continue;
        const l = nivelAgua(p[0], p[1]); if (!(l > -Infinity) || l - H(p[0], p[1]) < minProf) continue;
        mejor = p; md = d;
      }
      return mejor;
    }
    function direccionRio(p) { const i = RIO.indexOf(p), a = RIO[Math.max(0, i - 1)], b = RIO[Math.min(RIO.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1], h = Math.hypot(dx, dz) || 1; return { dx: dx / h, dz: dz / h }; }
    function ubicar() {
      for (const e of especies()) {
        const c = e.cerca || { x: 0, z: 0 }; let h = null;
        if (e.donde === 'orilla' && RIO) {
          const p = puntoRio(c, 0.2);
          if (p) {
            const d = direccionRio(p), nx = -d.dz, nz = d.dx; let best = null;
            for (let r = 2; r < 18 && !best; r += 0.5) for (const s of [1, -1]) { // la orilla seca más cercana, del lado de Villa Raíz primero
              const x = p[0] + nx * s * r, z = p[1] + nz * s * r, l = nivelAgua(x, z), g = H(x, z);
              const llano = [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]].every(([u, w]) => Math.abs(H(x + u, z + w) - g) < 0.3); // suelo llano: la malla del terreno no la tapa
              if ((!(l > -Infinity) || g > l + 0.3) && llano) { best = { x, z, y: g + 0.04, yaw: Math.atan2(-nx * s, -nz * s) }; break; }
            }
            if (best) h = Object.assign(best, { n: 1 });
          }
        } else if ((e.donde === 'rio' || e.donde === 'fondo') && RIO) {
          const p = puntoRio(c, e.donde === 'fondo' ? 0.45 : 0.55);
          if (p) { const d = direccionRio(p), l = nivelAgua(p[0], p[1]); h = { x: p[0], z: p[1], y: l, yaw: Math.atan2(d.dx, d.dz), n: e.donde === 'rio' ? 4 : 2, agua: l }; }
        } else if (e.donde === 'arrecife') {
          let best = null, md = Infinity; // el fondo de arrecife (1,2 a 3,5 m bajo el mar) más cercano al punto pedido
          for (let r = 0; r <= 60; r += 2) for (let k = 0; k < Math.max(1, Math.round(r * 0.8)); k++) {
            const a = (k / Math.max(1, Math.round(r * 0.8))) * Math.PI * 2, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
            const l = nivelAgua(x, z), g = H(x, z), prof = l - g;
            if (l > -Infinity && prof >= 1.2 && prof <= 3.5 && r < md) { md = r; best = { x, z, y: l, yaw: a, n: 2, agua: l }; }
            if (best) break;
          }
          h = best;
        }
        if (!h) continue;
        h.individuos = [];
        for (let i = 0; i < h.n; i++) h.individuos.push({ fase: i * 2.1 + 0.4, a: i * (6.283 / h.n), x: h.x, y: h.y, z: h.z, yaw: h.yaw });
        hogar[e.id] = h;
      }
    }
    ubicar();

    // ---------- Movimiento de cada individuo ----------
    const dummy = new THREE.Object3D();
    function mover(id, h) {
      const t = F.t;
      for (let i = 0; i < h.individuos.length; i++) {
        const v = h.individuos[i];
        if (id === 'iguana') { v.x = h.x; v.z = h.z; v.y = h.y - 0.035; v.yaw = h.yaw; } // tomando el sol: quieta (la vida va en su shader)
        else if (id === 'tilapia') { // nadan en grupo, en círculo lento
          const a = v.a + t * 0.35, r = 0.9 + 0.25 * Math.sin(t * 0.5 + v.fase);
          v.x = h.x + Math.cos(a) * r; v.z = h.z + Math.sin(a) * r; v.y = Math.max(H(v.x, v.z) + 0.15, h.agua - 0.3 - 0.08 * i);
          v.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
        } else if (id === 'pleco') { // pegados al fondo, casi quietos
          const off = (i - 0.5) * 1.2, x = h.x + Math.cos(h.yaw) * off, z = h.z - Math.sin(h.yaw) * off;
          v.x = x; v.z = z; v.y = H(x, z) + 0.04; v.yaw = h.yaw + 0.5 * i + Math.sin(t * 0.1 + v.fase) * 0.05;
        } else { // pez león: flota sobre el fondo y gira despacio
          const off = (i - 0.5) * 1.6, x = h.x + Math.cos(h.yaw) * off + Math.sin(t * 0.2 + v.fase) * 0.25, z = h.z + Math.sin(h.yaw) * off;
          v.x = x; v.z = z; v.y = Math.min(h.agua - 0.5, H(x, z) + 0.6 + Math.sin(t * 0.7 + v.fase) * 0.06); v.yaw = h.yaw + Math.sin(t * 0.15 + v.fase) * 0.6;
        }
      }
    }
    function dibujar() {
      const cam = G.renderer.camera && G.renderer.camera.position, ver = activo() && (!G.quiet || F.prueba);
      for (const e of especies()) {
        const im = mallas[e.id], h = hogar[e.id]; if (!im) continue;
        if (!h || !ver || (Math.min(cam ? Math.hypot(h.x - cam.x, h.z - cam.z) : Infinity, Math.hypot(h.x - S.pos.x, h.z - S.pos.z)) > APAGA && !F.prueba)) { im.visible = false; continue; }
        mover(e.id, h);
        const fases = im.geometry.attributes.iFase;
        h.individuos.forEach((v, i) => { dummy.position.set(v.x, v.y, v.z); dummy.rotation.set(0, v.yaw, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); fases.setX(i, v.fase); });
        im.count = h.individuos.length; im.instanceMatrix.needsUpdate = true; fases.needsUpdate = true; im.visible = true;
        if (e.donde !== 'orilla') { // «visor»: bajo el agua solo se distinguen de cerca; lejos el agua los tapa (se dibujan antes que ella)
          const mira = Math.hypot(S.pos.x - h.x, S.pos.z - h.z) < (e.radio || 8) * VISOR && S.pos.y - h.y < 14;
          im.material.depthTest = !mira; im.renderOrder = mira ? 10 : -1; h.visor = mira;
        }
      }
    }

    // ---------- Avistar, reportar y la sección del Diario ----------
    function flash() {
      if (G.quiet || F.prueba) return;
      try {
        if (!F.flash) { F.flash = document.createElement('div'); F.flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:60;transition:opacity .45s ease-out'; document.body.appendChild(F.flash); }
        const d = F.flash; d.style.transition = 'none'; d.style.opacity = '0.75'; void d.offsetWidth; d.style.transition = 'opacity .45s ease-out'; d.style.opacity = '0';
      } catch (e) { /* sin DOM */ }
    }
    function avisar(texto, ms) { if (G.quiet && !F.prueba) return; try { G.ui.toast(texto, ms || 3600); } catch (e) { /* sin HUD */ } }
    function avistar(id) {
      if (!activo() || !espDe(id) || mem.vistos.includes(id)) return false;
      mem.vistos.push(id);
      const e = espDe(id), n = mem.vistos.length, total = especies().length;
      G.emit('aprendizaje', { tipo: 'invasora', id });
      flash();
      animarReporte(n, total);
      pintarCuenta();
      avisar(L(`¡Avistamiento! ${e.nombre}: reporte enviado a la Estación de Conservación (${n}/${total}). Mira su ficha en el Diario.`,
        `Sighting! ${e.nombreEn}: report sent to the Conservation Station (${n}/${total}). See its card in the Journal.`), 4200);
      if (n >= total && !mem.completa) {
        mem.completa = true;
        const fin = () => avisar(L('¡Patrulla completa! La Estación ya sabe dónde buscar a las 4 especies. ¡Gracias, guardiana!',
          'Patrol complete! The Station now knows where to look for all 4 species. Thank you, guardian!'), 4800);
        if (F.prueba) fin(); else setTimeout(fin, 4300);
      }
      guardar();
      try { if (!G.quiet && !F.prueba && G.guardado) G.guardado.autosave(); } catch (err) { /* sin guardado */ }
      return true;
    }
    const lenta = () => M.posado || ((M.speed || 0) < LENTO);
    function distA(id) { const h = hogar[id]; return h ? Math.hypot(S.pos.x - h.x, S.pos.z - h.z) : Infinity; }
    function revisar(dt, libre) {
      for (const e of especies()) {
        if (mem.vistos.includes(e.id) || !hogar[e.id]) { F.cerca[e.id] = 0; continue; }
        const d = distA(e.id), alto = S.pos.y - hogar[e.id].y;
        if (d < PISTA_R && !F.pistas[e.id] && libre) {
          F.pistas[e.id] = true;
          avisar(L(`Algo se mueve por aquí… ${e.pista} Acércate despacio para avistarla.`, `Something is moving around here… ${e.pistaEn} Get closer slowly to spot it.`), 3800);
        }
        F.cerca[e.id] = d < (e.radio || 8) && alto < 12 && lenta() && libre ? (F.cerca[e.id] || 0) + dt : 0;
        if (F.cerca[e.id] >= OBS_T) avistar(e.id);
      }
    }
    G.on('foto', () => {
      if (!activo()) return;
      for (const e of especies()) if (!mem.vistos.includes(e.id) && hogar[e.id] && distA(e.id) < (e.radio || 8) * 1.5) avistar(e.id);
    });

    const SILUETA = {
      iguana: '<ellipse cx="26" cy="22" rx="12" ry="5"/><ellipse cx="41" cy="19" rx="6" ry="4"/><path d="M14 22 Q4 24 1 33" stroke-width="3" fill="none"/><path d="M18 17 l2 -4 l2 4 l2 -4 l2 4 l2 -4 l2 4" stroke-width="1.5" fill="none"/>',
      tilapia: '<ellipse cx="30" cy="20" rx="17" ry="10"/><path d="M13 20 L3 11 L3 29 Z"/><path d="M22 10 Q32 4 40 11" stroke-width="2" fill="none"/>',
      pleco: '<ellipse cx="32" cy="24" rx="20" ry="6"/><path d="M14 24 L3 17 L3 30 Z"/><path d="M22 19 L28 7 L40 9 L42 19 Z"/>',
      pezleon: '<ellipse cx="34" cy="21" rx="12" ry="7"/><path d="M22 21 L12 14 L12 28 Z"/><path d="M28 15 L22 2 M32 14 L30 1 M36 14 L38 1 M40 15 L46 3" stroke-width="1.5" fill="none"/><path d="M34 24 Q20 40 12 34 Q24 30 30 22" />',
    };
    function htmlAlbum() {
      if (!activo()) return '';
      const v = mem.vistos, lista = especies(), A = D.album || {};
      const cards = lista.map(e => {
        const ok = v.includes(e.id), col = esc(e.color || '#6b5a3e');
        const svg = `<svg viewBox="0 0 60 40" width="60" height="40" aria-hidden="true" fill="${ok ? col : '#555'}" stroke="${ok ? col : '#555'}">${SILUETA[e.silueta] || ''}</svg>`;
        if (!ok) return `<li class="fauna-tarjeta fauna-falta inv-tarjeta">${svg}<span><b>???</b><small>${esc(L(e.pista, e.pistaEn))}</small></span></li>`;
        return `<li class="fauna-tarjeta inv-tarjeta" data-inv="${esc(e.id)}">${svg}<span><b>${esc(L(e.nombre, e.nombreEn))}</b> <i>${esc(e.cientifico)}</i><small>${esc(L(e.texto, e.textoEn))}</small>` +
          `<small class="fauna-fuente">${esc(L('Fuente', 'Source'))}: <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.fuente)}</a></small></span></li>`;
      }).join('');
      return `<span class="lbl inv-lbl">${esc(L(A.titulo, A.tituloEn))} (${lista.filter(e => v.includes(e.id)).length}/${lista.length})</span>` +
        `<small class="inv-intro">${esc(L(A.intro, A.introEn))}</small><ul class="fauna-album inv-album">${cards}</ul><small class="inv-nota">${esc(L(A.nota, A.notaEn))}</small>`;
    }
    if (!document.getElementById('invasoras-css')) {
      const st = document.createElement('style'); st.id = 'invasoras-css';
      st.textContent = '.inv-album{list-style:none;margin:.3em 0 .4em;padding:0;display:grid;gap:.45em}' +
        '.inv-album .fauna-tarjeta{display:flex;gap:.6em;align-items:flex-start;padding:.45em .55em;border-radius:10px;background:rgba(255,255,255,.07)}' +
        '.inv-album .fauna-tarjeta svg{flex:none}.inv-album .fauna-tarjeta span{display:flex;flex-direction:column;gap:.15em;min-width:0}' +
        '.inv-album small{opacity:.9;line-height:1.35}.inv-album i{opacity:.8;font-size:.9em}.inv-album .fauna-fuente a{color:inherit;text-decoration:underline;word-break:break-word}' +
        '.inv-album .fauna-fuente a:focus-visible{outline:3px solid #ffe066;outline-offset:2px}' +
        '.inv-album .fauna-falta{opacity:.6}.inv-intro,.inv-nota{display:block;opacity:.85;line-height:1.35;margin:.2em 0 .5em}' +
        '#inv-cuenta{position:fixed;left:max(12px,env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 78px);z-index:var(--z-hud,5);' +
        'min-height:44px;display:flex;align-items:center;padding:0 14px;border-radius:999px;background:#243a28;color:#f4ffe8;border:2px solid #d7e7a8;' +
        'font:700 16px/1 var(--font-display,sans-serif);box-shadow:0 3px 0 rgba(0,0,0,.28);pointer-events:none}' +
        '#inv-cuenta[hidden]{display:none}' +
        '#inv-reporte{position:fixed;left:50%;top:30%;z-index:70;min-height:44px;display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:16px;' +
        'background:#fff8e8;color:#2b2118;font:700 18px/1.2 var(--font-display,sans-serif);box-shadow:0 6px 0 #d9c7a3;pointer-events:none;opacity:0}' +
        '#inv-reporte.inv-on{animation:inv-rep 1.25s ease-out both}' +
        '@keyframes inv-rep{0%{opacity:0;transform:translate(-50%,-20%) scale(.72)}20%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}72%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-90%) scale(.96)}}' +
        '@media (prefers-reduced-motion:reduce){#inv-reporte.inv-on{animation:inv-rep-suave .4s ease-out both}@keyframes inv-rep-suave{0%{opacity:0}30%{opacity:1}100%{opacity:0}}}';
      document.head.appendChild(st);
    }
    if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'invasoras', html: htmlAlbum });

    // Marca de zona (no el sitio exacto del animal): 32 m aparte, para el mapa y para Acción.
    function zonaDe(e) {
      const h = hogar[e.id]; if (!h) return null;
      const ang = { iguana: 0.7, tilapia: 2.4, pleco: 3.9, pezleon: 5.2 }[e.id] || 1;
      return { x: h.x + Math.cos(ang) * 32, z: h.z + Math.sin(ang) * 32 };
    }
    if (G.interaccion) for (const e of especies()) {
      const z = zonaDe(e); if (!z) continue;
      G.interaccion.add({
        id: 'invzona_' + e.id, x: z.x, z: z.z, r: 5,
        visible: () => (activo() && (!G.quiet || F.prueba) && !mem.vistos.includes(e.id)),
        label: () => L('Buscar en esta zona', 'Search this area'),
        use: () => avisar(L(`${e.pista} No es el sitio exacto: mira alrededor.`, `${e.pistaEn} This is not the exact spot: look around.`), 3600),
      });
    }
    function cuentaEl() {
      if (F.cuenta) return F.cuenta;
      const d = document.createElement('div'); d.id = 'inv-cuenta'; d.className = 'hud'; d.setAttribute('role', 'status'); d.hidden = true;
      document.body.appendChild(d); return (F.cuenta = d);
    }
    function pintarCuenta() {
      const el = cuentaEl(), n = mem.vistos.length, t = especies().length || 4;
      const txt = L(`Patrulla ${n}/${t}`, `Patrol ${n}/${t}`);
      if (el.textContent !== txt) el.textContent = txt;
      el.hidden = !(activo() && (!G.quiet || F.prueba));
    }
    function animarReporte(n, total) {
      if (G.quiet && !F.prueba) return;
      let el = F.reporte;
      if (!el) {
        el = document.createElement('div'); el.id = 'inv-reporte'; el.setAttribute('role', 'status');
        document.body.appendChild(el); F.reporte = el;
      }
      el.textContent = L(`Reporte enviado ${n}/${total}`, `Report sent ${n}/${total}`);
      el.dataset.n = String(n);
      el.classList.remove('inv-on'); void el.offsetWidth; el.classList.add('inv-on');
    }
    pintarCuenta();

    // ---------- Bucle ----------
    function paso(dt, busy) {
      dt = Math.min(dt, 0.1); F.t += dt; uT.value += dt;
      if (activo()) revisar(dt, !busy);
      pintarCuenta();
      dibujar();
    }
    G.on('update', (dt, busy) => { if (!F.prueba) paso(dt, busy); }, 88);
    if (activo() && !mem.vistos.length && !G.quiet) setTimeout(() => avisar(L(`${D.album.titulo}: ${D.album.intro}`, `${D.album.tituloEn}: ${D.album.introEn}`), 5200), 2500);
    const estado = () => ({ activo: activo(), vistos: mem.vistos.slice(), completa: mem.completa, hogar: Object.keys(hogar),
      draw: Object.values(mallas).filter(m => m.visible).length });

    // =====================================================================================================================
    // Prueba (AV.invasorasTest)
    // =====================================================================================================================
    async function test() {
      const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
      const cuadros = n => new Promise(r => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const g0 = { pos: Object.assign({}, S.pos), vy: S.vy, speed: M.speed, flying: M.flying, posado: M.posado, exp: G.INVASORAS, mem: JSON.parse(JSON.stringify(mem)), quiet: G.quiet };
      let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
      const toast0 = G.ui.toast, textos = []; G.ui.toast = t => { textos.push(String(t)); };
      const idioma0 = G.aula && G.aula.aj && G.aula.aj.idioma;
      if (G.aula && G.aula.aj) G.aula.aj.idioma = 'es';
      const aprend = []; oyenteTest = d => { if (d && d.tipo === 'invasora') aprend.push(d.id); };
      const quietaEn = (x, z) => { S.pos.x = x; S.pos.z = z; S.pos.y = Math.max(H(x, z), nivelAgua(x, z)) + 0.1; S.vy = 0; M.speed = 0; M.flying = false; M.posado = ''; };
      const simular = seg => { for (let t = 0; t < seg - 1e-6; t += 0.1) paso(0.1, false); };
      const visibles = () => Object.values(mallas).filter(m => m.visible).length;
      try {
        // 1. Encendida para todos (Kelvin 9-nov): sin ?expansion=1 boot.js la carga y está activa; con ?invasoras=0 (G.INVASORAS = false) nada se ve
        ok('Disponible sin bandera: sin ?expansion=1 boot.js carga la patrulla y está activa', g0.exp !== false && G.invasorasAuto === true && activo(),
          'INVASORAS ' + G.INVASORAS + ' · cargada al arrancar ' + !!G.invasorasAuto);
        G.INVASORAS = false; F.prueba = false; mem = { v: 1, vistos: [], completa: false };
        const h0 = hogar.iguana; if (h0) quietaEn(h0.x + 1, h0.z); G.quiet = false; paso(0.1, false); simular(2.5); G.quiet = g0.quiet;
        ok('Apagada a mano (?invasoras=0): ninguna malla visible, sección del Diario vacía, nada se avista ni se avisa', visibles() === 0 && htmlAlbum() === '' && !mem.vistos.length && !textos.length && !avistar('iguana'),
          visibles() + ' visibles · ' + mem.vistos.length + ' vistos · ' + textos.length + ' avisos');
        // 2. Datos: 4 especies verificadas, ES + EN, fuente oficial con URL https
        const oficial = /^https:\/\/([a-z0-9-]+\.)*(usgs\.gov|drna\.pr\.gov|noaa\.gov|fws\.gov)\//;
        const E = especies();
        ok('4 especies (iguana, tilapia, pleco, pez león), todas verificadas', E.length === 4 && ['iguana', 'tilapia', 'pleco', 'pezleon'].every(id => espDe(id)), E.map(e => e.id).join(','));
        ok('Cada ficha: nombre y texto en español e inglés, nombre científico, fuente y URL oficial (USGS, DRNA, NOAA o USFWS)',
          E.every(e => e.nombre && e.nombreEn && e.texto && e.textoEn && e.cientifico && e.fuente && oficial.test(e.url) && e.pista && e.pistaEn));
        ok('Ningún texto las presenta como enemigos ni habla de atacarlas', !E.some(e => /atac|mata|caza|enemig|destru|attack|kill|hunt|enemy/i.test(e.texto + e.textoEn + e.pista + e.pistaEn)));
        // 3. Hábitats: iguana en la orilla seca, peces bajo el agua del río, pez león en el mar del arrecife
        const hi = hogar.iguana, ht = hogar.tilapia, hp = hogar.pleco, hl = hogar.pezleon;
        ok('Cada especie tiene su sitio en el mapa', !!(hi && ht && hp && hl), Object.keys(hogar).join(','));
        if (hi && ht && hp && hl) {
          F.prueba = true; G.INVASORAS = true; simular(0.3);
          const lI = nivelAgua(hi.x, hi.z);
          ok('Iguana en tierra seca junto al río (a 18 m o menos de un punto del cauce)', !(lI > hi.y + 0.1) && RIO.some(p => Math.hypot(p[0] - hi.x, p[1] - hi.z) < 18 + p[3]), 'y ' + hi.y.toFixed(2) + ' · agua ' + lI);
          const bajo = (h, v) => v.y < nivelAgua(v.x, v.z) - 0.05 && v.y >= H(v.x, v.z) - 0.01;
          ok('Tilapias bajo el agua del río y sobre el fondo', ht.individuos.length === 4 && ht.individuos.every(v => bajo(ht, v)), ht.individuos.map(v => (nivelAgua(v.x, v.z) - v.y).toFixed(2)).join(','));
          ok('Plecos en el fondo del río, bajo el agua', hp.individuos.every(v => bajo(hp, v) && v.y - H(v.x, v.z) < 0.1));
          ok('Peces león en el mar (arrecife de la playa), bajo el agua', Math.abs(hl.agua - ((MAPA.agua.mar && MAPA.agua.mar.nivel) || 0)) < 0.3 && hl.individuos.every(v => bajo(hl, v)), 'prof ' + (hl.agua - H(hl.x, hl.z)).toFixed(2));
          quietaEn(ht.x + 3, ht.z); paso(0.05, false); const visorCerca = ht.visor && mallas.tilapia.renderOrder === 10;
          quietaEn(ht.x + 30, ht.z); paso(0.05, false);
          ok('Visor: las tilapias se ven claras a 3 m y el agua las tapa a 30 m', visorCerca && !ht.visor && mallas.tilapia.renderOrder === -1 && mallas.tilapia.material.depthTest);
          ok('Con la bandera: 4 mallas visibles cerca (4 draw calls como mucho)', visibles() === 4 && Object.keys(mallas).length === 4);
          // 4. Actividad: lejos no cuenta; de paso rápido no cuenta; despacio 1,5 s cerca sí, una vez
          mem = { v: 1, vistos: [], completa: false }; F.pistas = {}; F.cerca = {}; textos.length = 0; aprend.length = 0;
          quietaEn(hi.x + 40, hi.z); simular(3);
          ok('Lejos (40 m) no se avista nada', !mem.vistos.length);
          quietaEn(hi.x + 15, hi.z); simular(0.2);
          ok('A 15 m sale una pista una sola vez', textos.length === 1 && /despacio/.test(textos[0]), textos.join(' | ')); simular(1);
          ok('…y no se repite', textos.length === 1);
          quietaEn(hi.x + 2, hi.z); M.speed = 9; M.flying = true; simular(2); M.speed = 0; M.flying = false;
          ok('Pasar volando rápido junto a ella no la avista', !mem.vistos.includes('iguana'));
          F.cerca = {}; quietaEn(hi.x + 2, hi.z); simular(1.0);
          const antes = mem.vistos.includes('iguana'); simular(0.7);
          ok('Despacio a 2 m: se avista a los 1,5 s, no antes', !antes && mem.vistos.includes('iguana') && aprend.filter(i => i === 'iguana').length === 1);
          ok('Aviso de reporte a la Estación con la cuenta (1/4)', textos.some(t => /Estación de Conservación \(1\/4\)/.test(t)), textos.slice(-1)[0]);
          const rep = document.getElementById('inv-reporte'), cnt = document.getElementById('inv-cuenta');
          ok('El reporte enviado se anima y el contador visible pasa a 1/4', !!(rep && rep.classList.contains('inv-on') && /Reporte enviado 1\/4/.test(rep.textContent) && cnt && /Patrulla 1\/4/.test(cnt.textContent) && !cnt.hidden), (rep && rep.textContent) + ' · ' + (cnt && cnt.textContent));
          const zonas = especies().map(e => G.interaccion.find('invzona_' + e.id));
          ok('El mapa marca la zona, no el sitio exacto (a 18 m o más del animal)', zonas.every(z => z && hogar[z.id.slice(8)] && Math.hypot(z.x - hogar[z.id.slice(8)].x, z.z - hogar[z.id.slice(8)].z) >= 18), zonas.map(z => z && Math.hypot(z.x - hogar[z.id.slice(8)].x, z.z - hogar[z.id.slice(8)].z).toFixed(0)).join(','));
          ok('La marca no dice coordenadas y, ya avistada la iguana, su marca se esconde', zonas.every(z => z && !/\d{2,}/.test(z.label())) && !!(zonas[0] && !zonas[0].visible()), zonas[0] && zonas[0].label());
          simular(2); ok('Quedarse más no lo cuenta otra vez', aprend.filter(i => i === 'iguana').length === 1);
          // Foto: a 1,5 radios cuenta al instante
          quietaEn(ht.x + (espDe('tilapia').radio * 1.3), ht.z); G.emit('foto', { gesto: 'saludar' });
          ok('«Foto» cerca de las tilapias las avista al instante', mem.vistos.includes('tilapia'));
          for (const [id, h] of [['pleco', hp], ['pezleon', hl]]) { F.cerca = {}; quietaEn(h.x + 1.5, h.z); simular(1.8); }
          ok('Las 4 avistadas: patrulla completa y aviso final', mem.completa && mem.vistos.length === 4 && textos.some(t => /Patrulla completa/.test(t)), mem.vistos.join(','));
          // 5. Diario: 4 fichas con fuente y enlace; sin avistar solo la pista; en inglés
          const div = document.createElement('div'); div.innerHTML = htmlAlbum();
          const tarjetas = Array.from(div.querySelectorAll('.inv-tarjeta'));
          ok('Diario: 4 fichas con «Fuente» y enlace https', tarjetas.length === 4 && tarjetas.every(t => /Fuente/.test(t.textContent) && t.querySelector('a[href^="https://"]')) && /\(4\/4\)/.test(div.textContent));
        const hojaI = (document.getElementById('invasoras-css') || {}).textContent || '';
        ok('Las fuentes se pueden enfocar y reducir movimiento no desplaza el reporte', [...div.querySelectorAll('a')].length === 4 && [...div.querySelectorAll('a')].every(a => a.tabIndex >= 0) && /fauna-fuente a:focus-visible/.test(hojaI) && /prefers-reduced-motion/.test(hojaI) && !/translate/.test(hojaI.slice(hojaI.indexOf('prefers-reduced-motion'))));
          ok('La sección está registrada en el Diario', !!(G.diario && G.diario.seccion));
          if (G.aula && G.aula.aj) {
            G.aula.aj.idioma = 'en'; div.innerHTML = htmlAlbum();
            ok('En inglés (idioma en): título, fichas y «Source»', /Invasive species patrol/.test(div.textContent) && /Lionfish/.test(div.textContent) && /Source/.test(div.textContent) && !/Fuente/.test(div.textContent));
            G.aula.aj.idioma = idioma0;
          }
          mem = { v: 1, vistos: [], completa: false }; div.innerHTML = htmlAlbum();
          ok('Sin avistar: 4 fichas con «???» y la pista, sin texto ni enlace', div.querySelectorAll('.fauna-falta').length === 4 && !div.querySelector('a'));
          // 6. Silencio de baterías y distancia
          F.prueba = false; G.quiet = true; paso(0.05, false);
          ok('En las baterías (G.quiet) no se ve ninguna', visibles() === 0);
          G.quiet = false; quietaEn(hi.x + 300, hi.z); G.renderer.camera.position.set(hi.x + 300, hi.y + 5, hi.z); paso(0.05, false);
          const lejos = !mallas.iguana.visible; G.quiet = g0.quiet;
          ok('A más de 70 m la iguana se apaga', lejos);
          F.prueba = true;
          await cuadros(2);
        }
      } finally {
        oyenteTest = null; G.ui.toast = toast0; if (G.aula && G.aula.aj && idioma0 !== undefined) G.aula.aj.idioma = idioma0;
        F.prueba = false; G.INVASORAS = g0.exp; G.quiet = g0.quiet; mem = g0.mem; F.cerca = {}; F.pistas = {};
        Object.assign(S.pos, g0.pos); S.vy = g0.vy; M.speed = g0.speed; M.flying = g0.flying; M.posado = g0.posado;
        try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
        paso(0.01, false);
      }
      return { passed: results.filter(r => r.ok).length, total: results.length, results };
    }

    return { estado, activo, avistar, paso, test, F, hogar, mallas, htmlAlbum, get vistos() { return mem.vistos.slice(); } };
  }
})();
