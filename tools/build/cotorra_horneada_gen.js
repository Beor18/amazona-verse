#!/usr/bin/env node
/* Amazona Verse · KIMI-122 · cotorra de la bandada, construida a mano (low-poly limpia, estilo del personaje del jugador).
   Regenera assets/data/cotorra_horneada.js (window.AV_COTORRA_HORNEADA), que dibuja src/game/bandada.js
   (bandada, residentes, comunidades y ciudad viva; 2 draw calls).

   Por qué no se hornea del GLB: el horneado de KIMI-056 (vittata_base_lod1.glb, malla de plumas realista) decimaba por
   celdas y clasificaba «ala» todo lo que tuviera |x| > 30 % de la caja: el 60 % del cuerpo aleteaba, no había cara, ojo ni
   pico legibles y todo salía de un solo verde → «bolas verdes arrugadas». Aquí cada parte es una pieza limpia con su color.

   Dos poses por vértice:
     - position/nor: en vuelo (cuerpo horizontal, pico al +Z, alas abiertas en ±X, patas recogidas).
     - pleg/plegN: posada de pie (cuerpo erguido ~60° contando el cabeceo típico de la instancia de -0,4 rad, alas plegadas
       a los lados, cola colgando, patas abiertas con los dedos sobre la percha a y = -0,13: la instancia va 0,13·esc por encima).
   Atributos: par (0 cuerpo/patas, 1 cabeza y ojos, 2 pico, 3 ala, 4 cola), col (color lineal), tin (x: 1 = se tiñe con el verde
   de la especie, 0 = color propio; y: máscara de la cabeza 0 frente … 1 nuca, 2 = no es cabeza; el color de la cabeza de la
   especie cubre donde máscara < cob).
   Uso: node tools/build/cotorra_horneada_gen.js            (sin dependencias)
*/
'use strict';
const fs = require('fs');
const path = require('path');
const SALIDA = path.join(__dirname, '..', '..', 'assets', 'data', 'cotorra_horneada.js');

// ---------- vectores ----------
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rotX = (p, a, c = [0, 0, 0]) => { const y = p[1] - c[1], z = p[2] - c[2], co = Math.cos(a), s = Math.sin(a); return [p[0], c[1] + y * co - z * s, c[2] + y * s + z * co]; };
const srgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); };

// ---------- paleta (lineal) ----------
const C = {
  blanco: srgb('#f4f1e8'), ojo: srgb('#1b1410'), brillo: srgb('#ffffff'),
  pico: srgb('#ffc414'), picoBajo: srgb('#eea70c'), pata: srgb('#d9a12a'),
  azul: srgb('#2c62c4'), colaPunta: srgb('#b9d23c'),
};

// ---------- dimensiones (vuelo; metros; largo total ≈ 0,8 como antes) ----------
const CUERPO = { c: [0, 0, 0], r: [0.108, 0.108, 0.2] };
const CABEZA = { c: [0, 0.085, 0.205], r: 0.1 };
const CUELLO = [0, 0.05, 0.15];            // pivote de la cabeza (vuelo)
const HOMBRO = [0.085, 0.045, 0.06];       // pivote del ala derecha (vuelo)
const CADERA = [0.042, -0.07, -0.01];      // arranque de la pata derecha (vuelo)
// posada: W = mundo con el cabeceo típico de la instancia (-0,4) ya aplicado; pleg = Rx(+0,4)·W
const INST = -0.4, ERGUIR = -0.92, CAB_REL = 0.85, PIE_Y = -0.13, PATA_VISTA = 0.018, COLA_REL = 0.3;
// punto más bajo del cuerpo ya erguido (para dejar las patas a la vista sobre la percha)
const BAJO = (() => { let m = 1e9; for (let i = 0; i < 64; i++) for (let j = 0; j <= 32; j++) { const th = Math.PI * j / 32, ph = 2 * Math.PI * i / 64; const p = [CUERPO.r[0] * Math.sin(th) * Math.cos(ph), CUERPO.r[1] * Math.sin(th) * Math.sin(ph), CUERPO.r[2] * Math.cos(th)]; m = Math.min(m, rotX(p, ERGUIR)[1]); } return m; })();

// ---------- constructor ----------
function Constructor() {
  const V = [], T = []; // V: {p, q, col, tin, m, par}
  let prims = [];
  return {
    V, T,
    // empieza una pieza; ref(p) = punto «interior» para orientar las caras hacia fuera
    pieza(par, pose, ref) { const b = { ini: V.length, tini: T.length, par, pose, ref }; prims.push(b); return b; },
    v(b, p, col, tin, m) { V.push({ p, q: b.pose(p), col, tin, m: m == null ? 2 : m, par: b.par, refp: b.ref(p) }); return V.length - 1; },
    t(a, b2, c) { T.push([a, b2, c]); },
    cerrar(b) {
      // orientación: que la normal de cara apunte lejos del punto interior (todas las de la pieza a la vez)
      let s = 0;
      for (let i = b.tini; i < T.length; i++) {
        const [a, b2, c] = T[i], pa = V[a].p, n = cross(sub(V[b2].p, pa), sub(V[c].p, pa));
        const cen = mul(add(add(pa, V[b2].p), V[c].p), 1 / 3), r = mul(add(add(V[a].refp, V[b2].refp), V[c].refp), 1 / 3);
        s += dot(n, sub(cen, r));
      }
      if (s < 0) for (let i = b.tini; i < T.length; i++) { const t = T[i]; T[i] = [t[0], t[2], t[1]]; }
      b.fin = V.length; b.tfin = T.length;
    },
    // copia espejo en x de una pieza (alas, ojos, patas)
    espejo(b) {
      const off = V.length - b.ini, nb = { ini: V.length, tini: T.length };
      for (let i = b.ini; i < b.fin; i++) { const v = V[i]; V.push(Object.assign({}, v, { p: [-v.p[0], v.p[1], v.p[2]], q: [-v.q[0], v.q[1], v.q[2]], refp: [-v.refp[0], v.refp[1], v.refp[2]] })); }
      for (let i = b.tini; i < b.tfin; i++) { const t = T[i]; T.push([t[0] + off, t[2] + off, t[1] + off]); }
      nb.fin = V.length; nb.tfin = T.length; return nb;
    },
  };
}

// elipsoide: centro, ejes (3 vectores con su radio), segmentos alrededor y de polo a polo
function elipsoide(K, b, c, ax, nu, nv, colf, tinf, mf) {
  const id = [];
  for (let j = 0; j <= nv; j++) {
    const th = Math.PI * j / nv, row = [];
    for (let i = 0; i < (j === 0 || j === nv ? 1 : nu); i++) {
      const ph = 2 * Math.PI * i / nu;
      const l = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; // y = polo
      const p = add(c, add(add(mul(ax[0], l[0]), mul(ax[1], l[1])), mul(ax[2], l[2])));
      row.push(K.v(b, p, colf(p, l), tinf(p, l), mf ? mf(p, l) : null));
    }
    id.push(row);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = id[j][j === 0 ? 0 : i], b2 = id[j][j === 0 ? 0 : (i + 1) % nu], c2 = id[j + 1][j + 1 === nv ? 0 : i], d = id[j + 1][j + 1 === nv ? 0 : (i + 1) % nu];
    if (j === 0) K.t(a, c2, d); else if (j + 1 === nv) K.t(a, c2, b2); else { K.t(a, c2, d); K.t(a, d, b2); }
  }
}
// tubo: secciones {c, u, v (vectores con radio)}, n lados; tapas planas (o punta si el radio es ~0)
function tubo(K, b, S, n, colf, tinf) {
  const id = S.map((s, k) => { const r = []; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; r.push(K.v(b, add(s.c, add(mul(s.u, Math.cos(a)), mul(s.v, Math.sin(a)))), colf(k, i), tinf(k, i))); } return r; });
  for (let k = 0; k + 1 < S.length; k++) for (let i = 0; i < n; i++) { const a = id[k][i], b2 = id[k][(i + 1) % n], c = id[k + 1][i], d = id[k + 1][(i + 1) % n]; K.t(a, c, d); K.t(a, d, b2); }
  for (const [k, sg] of [[0, 1], [S.length - 1, -1]]) {
    const ce = K.v(b, S[k].c, colf(k, 0), tinf(k, 0));
    for (let i = 0; i < n; i++) if (sg > 0) K.t(ce, id[k][(i + 1) % n], id[k][i]); else K.t(ce, id[k][i], id[k][(i + 1) % n]);
  }
}

function construir(cerca) {
  const K = Constructor();
  // ----- poses de posada -----
  const W2P = p => rotX(p, -INST);                       // de mundo (con cabeceo típico) a espacio de la instancia
  const caderaW0 = rotX(CADERA, ERGUIR);
  const T0 = [0, PIE_Y + PATA_VISTA - BAJO, -caderaW0[2]]; // el vientre queda PATA_VISTA sobre la percha y la cadera justo encima de los pies
  const cuerpoW = p => add(rotX(p, ERGUIR), T0);
  const posaCuerpo = p => W2P(cuerpoW(p));
  const posaCabeza = p => W2P(cuerpoW(rotX(p, CAB_REL, CUELLO)));
  const colaRaiz = [0, 0.01, -0.16];
  const posaCola = p => W2P(cuerpoW(rotX(p, COLA_REL, colaRaiz)));
  // ala plegada: el ala abierta (lado +x) se pliega contra el costado; la envergadura va hacia atrás y la cuerda hacia arriba
  const plegarAla = p => {
    const d = sub(p, HOMBRO), s = Math.max(0, d[0]);        // s: distancia a lo largo de la envergadura
    const zc = HOMBRO[2] + 0.02 - s * 0.78;                  // la punta llega sobre la cola
    const rx = CUERPO.r[0] * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(-1, Math.min(1, zc / (CUERPO.r[2] * 1.05))), 2)));
    const x = Math.max(0.03, rx * 0.86) + 0.006 + d[1] * 0.9; // pegada al cuerpo; el grosor del ala hacia fuera
    const y = HOMBRO[1] - 0.005 + d[2] * 0.62 - s * 0.05;    // borde de ataque arriba
    return [x, y, zc];
  };
  const posaAla = p => W2P(cuerpoW(plegarAla(p)));

  const fuera = c => () => c;
  // ----- cuerpo -----
  {
    const b = K.pieza(0, posaCuerpo, () => CUERPO.c);
    const nu = cerca ? 12 : 6, nv = cerca ? 9 : 5;
    const ax = [[CUERPO.r[0], 0, 0], [0, 0, CUERPO.r[2]], [0, CUERPO.r[1], 0]]; // polo a lo largo de z
    elipsoide(K, b, CUERPO.c, ax, nu, nv, (p, l) => {
      const vientre = sstep(0.2, -0.8, p[1] / CUERPO.r[1]);   // vientre algo más claro y amarillento
      return [lerp(0.92, 1.12, vientre), lerp(0.92, 1.1, vientre), lerp(0.92, 0.75, vientre)];
    }, () => 1);
    K.cerrar(b);
  }
  // ----- cabeza (con máscara para el color de la especie desde la frente) -----
  const frente = norm([0, 0.72, 0.69]);
  {
    const b = K.pieza(1, posaCabeza, () => CABEZA.c);
    const r = CABEZA.r, nu = cerca ? 12 : 6, nv = cerca ? 10 : 4;
    elipsoide(K, b, CABEZA.c, [[r, 0, 0], [0, r * 0.97, 0], [0, 0, r * 1.02]], nu, nv, fuera([1.04, 1.04, 1.0]), () => 1,
      (p, l) => Math.acos(Math.max(-1, Math.min(1, dot(norm(sub(p, CABEZA.c)), frente)))) / Math.PI);
    K.cerrar(b);
  }
  // ----- ojos: anillo blanco grande + ojo oscuro + brillo (estilo del personaje) -----
  {
    const e = norm([0.74, 0.3, 0.6]), u = norm(cross([0, 1, 0], e)), w = cross(e, u);
    const sobre = (k, rr) => add(CABEZA.c, mul(e, CABEZA.r * k + rr));
    const disco = (c, ra, rb, rz, nu, nv, col) => {
      const b = K.pieza(1, posaCabeza, () => sub(c, mul(e, 0.02)));
      elipsoide(K, b, c, [mul(u, ra), mul(e, rz), mul(w, rb)], nu, nv, fuera(col), () => 0);
      K.cerrar(b); return b;
    };
    const piezas = [disco(sobre(0.94, 0), 0.043, 0.047, 0.016, cerca ? 10 : 5, cerca ? 5 : 3, C.blanco),
      disco(sobre(0.94, 0.012), 0.024, 0.027, 0.012, cerca ? 8 : 4, cerca ? 4 : 2, C.ojo)];
    if (cerca) { const g = add(sobre(0.94, 0.022), add(mul(u, 0.008), mul(w, 0.01))); piezas.push(disco(g, 0.007, 0.007, 0.004, 5, 3, C.brillo)); }
    for (const pz of piezas) K.espejo(pz);
  }
  // ----- pico grande y amarillo: superior curvo con gancho + inferior -----
  {
    const base = add(CABEZA.c, [0, -0.012, 0.072]);
    const n = cerca ? 8 : 4, ks = cerca ? 7 : 3, S = [];
    for (let k = 0; k <= ks; k++) {
      const t = k / ks, c = add(base, [0, 0.014 * Math.sin(Math.PI * t * 0.8) - 0.08 * t * t, 0.112 * Math.sin(t * Math.PI * 0.45) / Math.sin(Math.PI * 0.45)]);
      const tg = norm([0, 0.014 * Math.PI * 0.8 * Math.cos(Math.PI * t * 0.8) - 0.16 * t, 0.112 * Math.PI * 0.45 * Math.cos(t * Math.PI * 0.45) / Math.sin(Math.PI * 0.45)]);
      const vy = norm(cross(tg, [1, 0, 0])), rw = 0.06 * Math.pow(1 - t, 0.7) + 0.004, rh = 0.054 * Math.pow(1 - t, 0.85) + 0.003;
      S.push({ c, u: [rw, 0, 0], v: mul(vy, -rh) });
    }
    const b = K.pieza(2, posaCabeza, p => { let m = S[0].c, dm = 1e9; for (const s of S) { const d = len(sub(p, s.c)); if (d < dm) { dm = d; m = s.c; } } return m; });
    tubo(K, b, S, n, k => lerp3(C.pico, C.picoBajo, k / ks * 0.5), () => 0);
    K.cerrar(b);
    const S2 = [], k2 = cerca ? 4 : 2;
    for (let k = 0; k <= k2; k++) {
      const t = k / k2, c = add(base, [0, -0.042 - 0.012 * t, 0.012 + 0.05 * t]);
      S2.push({ c, u: [0.038 * (1 - t) + 0.006, 0, 0], v: [0, 0.018 * (1 - t) + 0.004, -0.004] });
    }
    const b2 = K.pieza(2, posaCabeza, p => { let m = S2[0].c, dm = 1e9; for (const s of S2) { const d = len(sub(p, s.c)); if (d < dm) { dm = d; m = s.c; } } return m; });
    tubo(K, b2, S2, n, () => C.picoBajo, () => 0);
    K.cerrar(b2);
  }
  // ----- alas (lado +x; luego espejo): perfil de lente, barrida hacia atrás, primarias azules -----
  {
    const ns = cerca ? 8 : 3, n = cerca ? 6 : 4, S = [], SPAN = 0.36;
    for (let k = 0; k <= ns; k++) {
      const s = k / ns, x = HOMBRO[0] + SPAN * s;
      const le = HOMBRO[2] + 0.05 - 0.1 * Math.pow(s, 1.6);                 // borde de ataque
      const cu = lerp(0.16, 0.2, sstep(0, 0.4, s)) * (1 - 0.72 * sstep(0.45, 1, s)); // cuerda: ancha y punta redondeada
      const y = HOMBRO[1] + 0.025 * Math.sin(s * Math.PI) - 0.02 * s;           // arco suave
      S.push({ c: [x, y, le - cu / 2], u: [0, 0, cu / 2], v: [0, 0.014 * (1 - 0.6 * s) + 0.004, 0], s });
    }
    const b = K.pieza(3, posaAla, p => { let m = S[0].c, dm = 1e9; for (const s of S) { const d = Math.abs(p[0] - s.c[0]); if (d < dm) { dm = d; m = s.c; } } return m; });
    const azul = (k, i) => { const s = S[k].s, atras = Math.cos(2 * Math.PI * i / n) < 0.3 ? 1 : 0; return sstep(0.5, 0.8, s) * (0.55 + 0.45 * atras); };
    tubo(K, b, S, n, (k, i) => azul(k, i) > 0.5 ? C.azul : [0.86, 0.9, 0.86], (k, i) => azul(k, i) > 0.5 ? 0 : 1);
    K.cerrar(b);
    K.espejo(b);
  }
  // ----- cola: abanico ancho, punta amarillo-verdosa -----
  {
    const ks = cerca ? 5 : 2, n = cerca ? 6 : 4, S = [];
    for (let k = 0; k <= ks; k++) {
      const t = k / ks; S.push({ c: [0, 0.01 - 0.03 * t, -0.15 - 0.26 * t], u: [0.035 + 0.05 * t, 0, 0], v: [0, 0.016 * (1 - t) + 0.006, 0], t });
    }
    const b = K.pieza(4, posaCola, p => { let m = S[0].c, dm = 1e9; for (const s of S) { const d = Math.abs(p[2] - s.c[2]); if (d < dm) { dm = d; m = s.c; } } return m; });
    tubo(K, b, S, n, k => S[k].t > 0.75 ? C.colaPunta : [0.82, 0.86, 0.82], k => S[k].t > 0.75 ? 0 : 1);
    K.cerrar(b);
  }
  // ----- patas (lado +x; luego espejo): en vuelo recogidas dentro del vientre; posada, de pie con dos dedos delante y dos detrás -----
  {
    const caderaW = cuerpoW(CADERA), pieW = [CADERA[0] + 0.004, PIE_Y + 0.008, 0.0];
    const n = cerca ? 5 : 3;
    // geometría en W (posada) y la de vuelo = la misma, encogida y metida bajo el cuerpo
    const partes = [];
    partes.push([{ c: caderaW, u: [0.016, 0, 0], v: [0, 0, 0.016] }, { c: add(pieW, [0, 0.01, 0]), u: [0.011, 0, 0], v: [0, 0, 0.011] }]);
    const dedos = cerca ? [[0.012, 0.05], [-0.012, 0.05], [0.01, -0.04], [-0.01, -0.04]] : [];
    for (const [dx, dz] of dedos) partes.push([{ c: pieW, u: [0.009, 0, 0], v: [0, 0.008, 0] }, { c: add(pieW, [dx, -0.006, dz]), u: [0.006, 0, 0], v: [0, 0.005, 0] }]);
    const OFF = [CADERA[0] * 0.7, -0.05, -0.03], K_REC = 0.45;
    const recoger = q => add(mul(sub(q, pieW), K_REC), OFF), soltar = p => add(mul(sub(p, OFF), 1 / K_REC), pieW); // afín: vuelo ↔ posada
    for (const S of partes) {
      // secciones perpendiculares al eje de cada tubo (pata vertical, dedos horizontales)
      const eje = norm(sub(S[1].c, S[0].c)), u0 = Math.abs(eje[1]) > 0.7 ? [1, 0, 0] : [0, 1, 0];
      const ua = norm(cross(eje, u0)), va = cross(eje, ua);
      const SV = S.map(s => ({ c: recoger(s.c), u: mul(ua, len(s.u) * K_REC), v: mul(va, len(s.v) * K_REC) }));
      const A = SV[0].c, Dd = sub(SV[1].c, A);
      const b = K.pieza(0, p => W2P(soltar(p)), p => add(A, mul(Dd, Math.max(0, Math.min(1, dot(sub(p, A), Dd) / dot(Dd, Dd))))));
      tubo(K, b, SV, n, () => C.pata, () => 0);
      K.cerrar(b); K.espejo(b);
    }
  }
  return K;
}

// ---------- normales por pose y empaquetado ----------
function normales(V, T, k) {
  const N = V.map(() => [0, 0, 0]);
  for (const [a, b, c] of T) { const n = cross(sub(V[b][k], V[a][k]), sub(V[c][k], V[a][k])); for (const i of [a, b, c]) N[i] = add(N[i], n); }
  return N.map(norm);
}
const R3 = v => Math.round(v * 1000) / 1000;
function empaquetar(K) {
  const { V, T } = K, N = normales(V, T, 'p'), NP = normales(V, T, 'q');
  const o = { pos: [], nor: [], col: [], pleg: [], plegN: [], par: [], tin: [], idx: [] };
  V.forEach((v, i) => { o.pos.push(...v.p.map(R3)); o.nor.push(...N[i].map(R3)); o.col.push(...v.col.map(R3)); o.pleg.push(...v.q.map(R3)); o.plegN.push(...NP[i].map(R3)); o.par.push(v.par); o.tin.push(v.tin, R3(v.m)); });
  for (const t of T) o.idx.push(...t);
  return o;
}

const near = empaquetar(construir(true)), far = empaquetar(construir(false));
const W2P = p => rotX(p, -INST), cuerpoW = (() => { const c0 = rotX(CADERA, ERGUIR), T0 = [0, PIE_Y + PATA_VISTA - BAJO, -c0[2]]; return p => add(rotX(p, ERGUIR), T0); })();
const D = {
  version: 'KIMI-122', largo: 0.8,
  ala: HOMBRO.map(R3), cuello: CUELLO.map(R3), cuelloPleg: W2P(cuerpoW(CUELLO)).map(R3),
  tris: { near: near.idx.length / 3, far: far.idx.length / 3 }, near, far,
};
fs.writeFileSync(SALIDA, '/* KIMI-122 · cotorra de la bandada construida a mano (low-poly, estilo del personaje): cara blanca, ojo, pico amarillo,\n' +
  '   alas, cola y patas; pose de vuelo (pos) y posada de pie (pleg). Generado por tools/build/cotorra_horneada_gen.js; no editar a mano. */\n' +
  'window.AV_COTORRA_HORNEADA = ' + JSON.stringify(D) + ';\n');
console.log('cotorra_horneada.js:', D.tris, 'verts', near.pos.length / 3, far.pos.length / 3, (fs.statSync(SALIDA).size / 1024).toFixed(0) + ' KB');
