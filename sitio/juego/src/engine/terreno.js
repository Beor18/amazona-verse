/* AVE · terreno y mundo base
   Dos modos, según los datos del pack (pack.mundo):
   1) Mapa (mundo.mapa): mapa hecho en Blender por el level designer (formato de assets/data/mapa_cap1.js).
      - Altura: heightmap Uint16 (mapa.alturas) al arrancar; cuando cargan los trozos .glb del terreno, consulta exacta por
        triángulo sobre una rejilla de 4 m (misma malla que se ve: los pies no flotan ni se hunden).
      - Suelo: trozos .glb con splat en el color de vértice (R pasto/musgo, G tierra, B roca, A arena) y shader propio:
        4 texturas repetibles con sus normales, mezcla por altura de textura, roca por pendiente, arena junto al mar,
        macro-variación contra la repetición y detalle (normales) solo de cerca. Ver splatMaterial().
      - Pisos del mapa (muelle, cubiertas, puentes, rampas, plataformas): addPlatform con forma círculo, rect, rampa o puente.
        Son de una vía: sostienen a quien llega desde arriba (y >= tope - tol). Sin y, solo los bajos (<= 1,4 m sobre el suelo).
      - POIs del mapa por id: poi(id) y places[id].
   2) Analítico (sin mundo.mapa, p. ej. content/plantilla): relieve con ondas y relieves, zonas planas, árboles y palmas.
   Esquema analítico: tamano, segmentos, lugares { id: { x, z, r, ... } },
     terreno { ondas: [{ fn: 'sin'|'cos', x, z, xz, amp }], relieves: [{ tipo: 'colina', x, z, alto, ancho } | { tipo: 'cauce', x, mitad, pendiente }], planos: [ids de lugares] },
     plataformas [{ lugar | x, z, r, alto }], rio { x }, agua { x, ancho, nivel: { x, z, sobre } },
     arboles { cantidad, semilla, copaCada, margenRio, extra: [{ x, z, s, copa }], evitar: [{ x, z, r }] },
     islas { lista: [{ x, z, r }], modelo: { url, b64, script, base } }, bruma { dentro, fuera, color, opacidad, y }, texturas {}.
   Esquema mapa: mapa { datos: () => AV_MAPA_*, alturas: () => AV_MAPA_*_ALTURA, b64: 'AV_MAPA_B64' }, suelo { capas: [4 × { tex, normal, escala, tinte }] },
     reubicar(pack, datos) (mueve en sitio las posiciones del contenido al mapa), pois [{ id, x, y, z, nombre }], nivelBase, islas. */
AVE.module('terreno', function (G) {
  'use strict';
  const W = G.pack.mundo || {};
  const { clamp01, rng, mergeGeos } = G.util;
  const R = G.renderer, scene = R.scene;
  const TX = Object.assign({ pasto: 'assets/tex/pasto.jpg', suelo: 'assets/tex/suelo.jpg', palmaHoja: 'assets/tex/palma_hoja.png', palmaTronco: 'assets/tex/palma_tronco.jpg' }, W.texturas);
  const fn = v => (typeof v === 'function' ? v() : v);
  const MAPA = W.mapa ? fn(W.mapa.datos) : null;
  const ALT = MAPA ? fn(W.mapa.alturas) : null;
  // El contenido se mueve al mapa antes de que lo lean los módulos de juego (objetos, Diario, misiones, guardado)
  if (MAPA && typeof W.reubicar === 'function') W.reubicar(G.pack, MAPA);
  const WORLD = MAPA ? Math.min(MAPA.tamano.ancho, MAPA.tamano.largo) / 2 - 6 : (W.tamano || 70);

  // ---------- Lugares y POIs ----------
  const places = W.lugares || {};
  const pois = {};
  if (MAPA) {
    for (const p of MAPA.pois || []) pois[p.id] = { id: p.id, nombre: p.nombre, x: p.pos[0], y: p.pos[1], z: p.pos[2] };
    for (const p of fn(W.pois) || []) pois[p.id] = Object.assign({ id: p.id }, p);
    for (const id in pois) if (!places[id]) places[id] = Object.assign({ r: 4, poi: true }, pois[id]);
  }
  function poi(id) {
    const p = pois[id] || places[id];
    if (!p) return null;
    return { id, nombre: p.nombre || p.name || id, x: p.x, y: p.y != null ? p.y : height(p.x, p.z), z: p.z, r: p.r };
  }

  // ---------- Relieve analítico (modo plantilla) ----------
  const TR = W.terreno || {};
  const ondas = TR.ondas || [], relieves = TR.relieves || [];
  const FN = { sin: Math.sin, cos: Math.cos };
  function analytic(x, z) {
    let h = 0;
    for (const o of ondas) h += FN[o.fn || 'sin'](o.xz != null ? (x + z) * o.xz : x * (o.x || 0) + z * (o.z || 0)) * o.amp;
    for (const r of relieves) {
      if (r.tipo === 'cauce') { const dr = Math.abs(x - r.x); if (dr < r.mitad) h -= (r.mitad - dr) * r.pendiente; }
      else { const d = Math.hypot(x - r.x, z - r.z); h += r.alto * Math.exp(-(d * d) / r.ancho); }
    }
    return h;
  }
  const FLATS = MAPA ? [] : (TR.planos || []).map(k => ({ k, x: places[k].x, z: places[k].z, r: places[k].r, base: analytic(places[k].x, places[k].z) }));
  for (const f of FLATS) places[f.k].base = f.base;

  // ---------- Altura del mapa: heightmap y consulta exacta por triángulo ----------
  let HM = null;
  if (ALT) {
    let h = ALT.alturas;
    if (!h && ALT.datos) { // por si el .js de alturas no decodificó
      const bin = atob(ALT.datos), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const u16 = new Uint16Array(u8.buffer), k = (ALT.max - ALT.min) / 65535;
      h = new Float32Array(u16.length); for (let i = 0; i < u16.length; i++) h[i] = ALT.min + u16[i] * k;
    }
    HM = { h, nx: ALT.nx, nz: ALT.nz, x0: ALT.x0, z0: ALT.z0, paso: ALT.paso };
  }
  function hmHeight(x, z) {
    const A = HM;
    let fx = (x - A.x0) / A.paso, fz = (z - A.z0) / A.paso;
    fx = Math.max(0, Math.min(A.nx - 1.001, fx)); fz = Math.max(0, Math.min(A.nz - 1.001, fz));
    const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, o = iz * A.nx + ix, h = A.h;
    return (h[o] * (1 - tx) + h[o + 1] * tx) * (1 - tz) + (h[o + A.nx] * (1 - tx) + h[o + A.nx + 1] * tx) * tz;
  }
  // Rejilla de triángulos de la malla del terreno (CSR): celda -> lista de triángulos que la tocan
  const TG = { ready: false, cell: 4, pos: null, col: null, tri: null, start: null, list: null, nx: 0, nz: 0, x0: 0, z0: 0 };
  function buildTriGrid(geos) {
    let nv = 0, nt = 0;
    for (const g of geos) { nv += g.attributes.position.count; nt += (g.index ? g.index.count : g.attributes.position.count) / 3; }
    const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 4), tri = new Uint32Array(nt * 3);
    let vo = 0, to = 0;
    for (const g of geos) {
      const p = g.attributes.position, c = g.attributes.splat;
      for (let i = 0; i < p.count; i++) {
        pos[(vo + i) * 3] = p.getX(i); pos[(vo + i) * 3 + 1] = p.getY(i); pos[(vo + i) * 3 + 2] = p.getZ(i);
        if (c) { col[(vo + i) * 4] = c.getX(i); col[(vo + i) * 4 + 1] = c.getY(i); col[(vo + i) * 4 + 2] = c.getZ(i); col[(vo + i) * 4 + 3] = c.itemSize > 3 ? c.getW(i) : 0; }
      }
      const n = g.index ? g.index.count : p.count;
      for (let i = 0; i < n; i++) tri[to * 3 + i] = (g.index ? g.index.getX(i) : i) + vo;
      to += n / 3; vo += p.count;
    }
    const T = MAPA.tamano, cell = TG.cell, nx = Math.ceil(T.ancho / cell) + 1, nz = Math.ceil(T.largo / cell) + 1;
    const cnt = new Uint32Array(nx * nz + 1);
    const each = (t, f) => {
      const a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2];
      const ax = pos[a * 3], az = pos[a * 3 + 2], bx = pos[b * 3], bz = pos[b * 3 + 2], cx = pos[c * 3], cz = pos[c * 3 + 2];
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - T.x0) / cell)), i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - T.x0) / cell));
      const k0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - T.z0) / cell)), k1 = Math.min(nz - 1, Math.floor((Math.max(az, bz, cz) - T.z0) / cell));
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) f(k * nx + i);
    };
    return new Promise(resolve => {
      let t = 0, fase = 'contar', list = null, fill = null;
      const luego = fn => (window.requestIdleCallback ? window.requestIdleCallback(() => fn(), { timeout: 50 }) : setTimeout(fn, 0));
      const paso = () => {
        const t0 = performance.now();
        if (fase === 'contar') {
          while (t < nt && performance.now() - t0 < 8) each(t++, ci => cnt[ci + 1]++);
          if (t < nt) return luego(paso);
          for (let i = 1; i < cnt.length; i++) cnt[i] += cnt[i - 1];
          list = new Uint32Array(cnt[cnt.length - 1]); fill = cnt.slice(0, nx * nz); t = 0; fase = 'llenar';
        }
        while (t < nt && performance.now() - t0 < 8) { const k = t++; each(k, ci => { list[fill[ci]++] = k; }); }
        if (t < nt) return luego(paso);
        Object.assign(TG, { pos, col, tri, start: cnt, list, nx, nz, x0: T.x0, z0: T.z0, ready: true });
        resolve();
      };
      paso();
    });
  }
  // Triángulo bajo (x, z): devuelve la altura (el más alto si hay varios) o NaN; deja vértices y pesos en hit
  const hit = { a: 0, b: 0, c: 0, wa: 0, wb: 0, wc: 0 };
  function triQuery(x, z) {
    const ix = Math.floor((x - TG.x0) / TG.cell), iz = Math.floor((z - TG.z0) / TG.cell);
    if (ix < 0 || iz < 0 || ix >= TG.nx || iz >= TG.nz) return NaN;
    const ci = iz * TG.nx + ix, pos = TG.pos, tri = TG.tri;
    let best = NaN;
    for (let n = TG.start[ci], e = TG.start[ci + 1]; n < e; n++) {
      const t = TG.list[n], a = tri[t * 3], b = tri[t * 3 + 1], c = tri[t * 3 + 2];
      const x0 = pos[a * 3], z0 = pos[a * 3 + 2], x1 = pos[b * 3], z1 = pos[b * 3 + 2], x2 = pos[c * 3], z2 = pos[c * 3 + 2];
      const d = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);
      if (Math.abs(d) < 1e-9) continue;
      const wa = ((z1 - z2) * (x - x2) + (x2 - x1) * (z - z2)) / d, wb = ((z2 - z0) * (x - x2) + (x0 - x2) * (z - z2)) / d, wc = 1 - wa - wb;
      if (wa < -1e-5 || wb < -1e-5 || wc < -1e-5) continue;
      const y = wa * pos[a * 3 + 1] + wb * pos[b * 3 + 1] + wc * pos[c * 3 + 1];
      if (!(y <= best)) { best = y; hit.a = a; hit.b = b; hit.c = c; hit.wa = wa; hit.wb = wb; hit.wc = wc; }
    }
    return best;
  }
  function height(x, z) {
    if (!MAPA) {
      let h = analytic(x, z);
      for (const f of FLATS) {
        const d = Math.hypot(x - f.x, z - f.z);
        const t = Math.min(1, Math.max(0, (f.r + 4 - d) / 4));
        h = h + (f.base - h) * t * t * (3 - 2 * t);
      }
      return h;
    }
    if (TG.ready) { const y = triQuery(x, z); if (y === y) return y; }
    return HM ? hmHeight(x, z) : 0;
  }
  const rawHeight = MAPA ? height : analytic;
  // Pesos del splat bajo (x, z) en el modo mapa: [pasto, tierra, roca, arena]; null si la malla aún no cargó
  const splatOut = [0, 0, 0, 0];
  function splatAt(x, z) {
    if (!TG.ready) return null;
    const y = triQuery(x, z);
    if (!(y === y)) return null;
    const c = TG.col;
    for (let k = 0; k < 4; k++) splatOut[k] = c[hit.a * 4 + k] * hit.wa + c[hit.b * 4 + k] * hit.wb + c[hit.c * 4 + k] * hit.wc;
    return splatOut;
  }
  function normalAt(x, z, out) {
    const e = 0.7, dx = height(x + e, z) - height(x - e, z), dz = height(x, z + e) - height(x, z - e), l = Math.hypot(dx, 2 * e, dz);
    out = out || {}; out.x = -dx / l; out.y = 2 * e / l; out.z = -dz / l; return out;
  }
  if (MAPA) for (const k in places) { const p = places[k]; if (p.base == null) p.base = p.y != null && !p.poi ? p.y : height(p.x, p.z); }

  // ---------- Pisos (plataformas): círculo, rect girado, rampa o puente ----------
  const plataformas = [];
  const SIN_Y_MAX = 1.4; // sin y, solo cuentan los pisos de una vía que están a <= 1,4 m del terreno
  function addPlatform(p) {
    const L = places[p.lugar] || p;
    const pl = { tipo: p.tipo || 'circulo', x: L.x, z: L.z, r: p.r || 0, unaVia: p.unaVia != null ? !!p.unaVia : p.tipo != null, tol: p.tol != null ? p.tol : 0.6, when: p.when || null, id: p.id || null };
    if (pl.tipo === 'rect') Object.assign(pl, { hx: p.hx, hz: p.hz, c: Math.cos(p.rotY || 0), s: Math.sin(p.rotY || 0), r: Math.hypot(p.hx, p.hz) });
    if (pl.tipo === 'rampa' || pl.tipo === 'puente') {
      const a = p.a, b = p.b;
      Object.assign(pl, { ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2], ancho: p.ancho || 1.5, comba: p.comba || 0 });
      pl.x = (a[0] + b[0]) / 2; pl.z = (a[2] + b[2]) / 2; pl.r = Math.hypot(b[0] - a[0], b[2] - a[2]) / 2 + pl.ancho;
    }
    pl.top = p.top != null ? p.top : p.y != null ? p.y : height(pl.x, pl.z) + (p.alto || 0);
    plataformas.push(pl);
    return pl;
  }
  function removePlatform(pl) { const i = plataformas.indexOf(pl); if (i >= 0) plataformas.splice(i, 1); }
  // Altura del piso en (x, z) o NaN si queda fuera
  function platformTop(p, x, z) {
    const dx = x - p.x, dz = z - p.z;
    if (dx * dx + dz * dz > p.r * p.r) return NaN;
    if (p.tipo === 'circulo') return p.top;
    if (p.tipo === 'rect') { const lx = dx * p.c - dz * p.s, lz = dx * p.s + dz * p.c; return Math.abs(lx) <= p.hx && Math.abs(lz) <= p.hz ? p.top : NaN; }
    const ux = p.bx - p.ax, uz = p.bz - p.az, L2 = ux * ux + uz * uz || 1;
    const t = ((x - p.ax) * ux + (z - p.az) * uz) / L2;
    if (t < -0.02 || t > 1.02) return NaN;
    const tc = Math.min(1, Math.max(0, t)), px = p.ax + ux * tc, pz = p.az + uz * tc;
    if (Math.hypot(x - px, z - pz) > p.ancho / 2) return NaN;
    return p.ay + (p.by - p.ay) * tc - p.comba * 4 * tc * (1 - tc);
  }
  for (const p of W.plataformas || []) addPlatform(p);
  function surfaceY(x, z, y) {
    let g = height(x, z);
    const ground = g;
    for (let i = 0; i < plataformas.length; i++) {
      const p = plataformas[i];
      const top = platformTop(p, x, z);
      if (!(top === top) || (p.when && !p.when())) continue;
      if (p.unaVia) {
        if (y != null) { if (y < top - p.tol) continue; }
        else if (top - ground > SIN_Y_MAX) continue;
      }
      if (top > g) g = top;
    }
    return g;
  }
  const nivel = W.agua && W.agua.nivel;
  const waterBase = MAPA ? (W.nivelBase != null ? W.nivelBase : MAPA.misiones && MAPA.misiones.POOL ? MAPA.misiones.POOL.nivel : 0)
    : nivel ? analytic(nivel.x, nivel.z) + nivel.sobre : -Infinity;
  const riverX = !MAPA && W.rio ? W.rio.x : null;

  // ---------- Texturas ----------
  const anis = Math.min(8, R.renderer.capabilities.getMaxAnisotropy ? R.renderer.capabilities.getMaxAnisotropy() : 4);
  // Textura repetible; si maxPx, se reduce en un lienzo (equipos modestos: menos memoria de GPU)
  function texRep(path, maxPx) {
    const t = new THREE.Texture();
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = anis;
    G.assets.image(path).then(img => {
      if (!img) return;
      if (maxPx && img.width > maxPx) {
        const c = document.createElement('canvas'); c.width = c.height = maxPx;
        c.getContext('2d').drawImage(img, 0, 0, maxPx, maxPx); t.image = c;
      } else t.image = img;
      t.needsUpdate = true;
    });
    return t;
  }
  // Ruido de valor repetible 256×256 (R: manchas grandes, G: medias, B: finas, A: muy grandes) para variar color y romper la repetición
  let macroTex = null;
  function macroNoise() {
    if (macroTex) return macroTex;
    const N = 256, acc = new Float32Array(N * N * 4), r = rng(1234);
    const layer = (cells, ch, amp) => {
      const g = []; for (let i = 0; i < cells * cells; i++) g.push(r());
      const at = (i, k) => g[((k + cells) % cells) * cells + ((i + cells) % cells)];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const fx = x / N * cells, fy = y / N * cells, i = Math.floor(fx), k = Math.floor(fy);
        let tx = fx - i, ty = fy - k; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        acc[(y * N + x) * 4 + ch] += ((at(i, k) * (1 - tx) + at(i + 1, k) * tx) * (1 - ty) + (at(i, k + 1) * (1 - tx) + at(i + 1, k + 1) * tx) * ty) * amp;
      }
    };
    layer(4, 0, 0.6); layer(11, 0, 0.4); layer(8, 1, 0.6); layer(23, 1, 0.4); layer(19, 2, 0.6); layer(53, 2, 0.4); layer(3, 3, 1);
    const data = new Uint8Array(N * N * 4);
    for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, Math.round(acc[i] * 255)));
    macroTex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    macroTex.wrapS = macroTex.wrapT = THREE.RepeatWrapping; macroTex.magFilter = THREE.LinearFilter;
    macroTex.minFilter = THREE.LinearMipmapLinearFilter; macroTex.generateMipmaps = true; macroTex.needsUpdate = true;
    return macroTex;
  }

  // ---------- Material del suelo con splat (modo mapa) ----------
  // capas: [pasto/musgo, tierra, roca, arena] = { tex, normal, escala (repeticiones por metro), tinte }
  const SPLAT_VERT = 'attribute vec4 splat;\nvarying vec4 vSplat;\nvarying vec3 vWPos;\nvarying vec3 vWNor;\n';
  const SPLAT_FRAG_PARS = [
    'uniform sampler2D tA0, tA1, tA2, tA3, tN0, tN1, tN2, tN3, tMacro;',
    'uniform vec4 uEsc, uSat; uniform vec3 uTint0, uTint1, uTint2, uTint3; uniform float uMar;',
    'uniform sampler2D tZona; uniform vec4 uZona;', // mapa de zonas de ambiente.js (RGB = tinte − 0,5, A = humedad); uZona = x0, z0, 1/ancho, 1/largo
    'varying vec4 vSplat; varying vec3 vWPos; varying vec3 vWNor;',
    'uniform sampler2D tOrilla; uniform vec4 uOrilla;', // BB1: orilla del río y las pozas (1 = borde del agua, 0 = a 4,5 m o más)
    'vec3 lin3(vec3 c) { return c * (c * (c * 0.305306011 + 0.682171111) + 0.012522878); }', // sRGB -> lineal
    'vec2 rotUv(vec2 p, float a) { float c = cos(a), s = sin(a); return vec2(c * p.x - s * p.y, s * p.x + c * p.y); }',
  ].join('\n');
  // Albedo: mezcla por altura de textura con los pesos del splat corregidos por pendiente (roca) y altura (arena)
  const SPLAT_ALBEDO = `
  vec2 wp = vWPos.xz;
  float camD = length(vWPos - cameraPosition);
  vec3 nG = normalize(vWNor);
  vec4 mac = texture2D(tMacro, wp * 0.0071);
  vec4 mac2 = texture2D(tMacro, wp * 0.043 + 0.37);
  vec4 w = clamp(vSplat, 0.0, 1.0);
  float steep = smoothstep(0.80, 0.56, nG.y + (mac2.g - 0.5) * 0.12);
  w.z = max(w.z, steep);
  w.x *= 1.0 - steep * 0.9; w.y *= 1.0 - steep * 0.5; w.w *= 1.0 - steep;
  float playa = (1.0 - smoothstep(uMar + 0.25, uMar + 1.4 + mac.g * 0.8, vWPos.y)) * (1.0 - steep);
  w.w = max(w.w, playa);
  #ifdef SPLAT_ORILLA
    // BB1: la orilla del río y de las pozas es una franja de arena y barro, no un corte de roca gris
    float ori = texture2D(tOrilla, (wp - uOrilla.xy) * uOrilla.zw).r * smoothstep(0.25, 0.5, nG.y);
    ori *= smoothstep(0.15, 0.45, ori + (mac2.g - 0.5) * 0.35);
    w.z *= 1.0 - ori * 0.9; w.x *= 1.0 - ori * 0.75; w.y *= 1.0 - ori * 0.4;
    w.w = max(w.w, ori);
  #endif
  w.y += (mac.r - 0.5) * 0.25 * (w.x + w.y);
  vec2 uv0 = wp * uEsc.x, uv1 = wp * uEsc.y, uv2 = wp * uEsc.z, uv3 = wp * uEsc.w;
  vec4 a0 = texture2D(tA0, uv0), a1 = texture2D(tA1, uv1), a2 = texture2D(tA2, uv2), a3 = texture2D(tA3, uv3);
  #ifdef SPLAT_TRIPLANAR
    // roca triplanar: en acantilados la proyección desde arriba se estira; aquí se proyecta por los tres ejes
    vec3 tpB = pow(abs(nG), vec3(4.0)); tpB /= dot(tpB, vec3(1.0));
    vec2 uvRX = vWPos.zy * uEsc.z, uvRZ = vWPos.xy * uEsc.z;
    if (tpB.y < 0.98) a2 = texture2D(tA2, uvRX) * tpB.x + a2 * tpB.y + texture2D(tA2, uvRZ) * tpB.z;
  #endif
  #ifdef SPLAT_DOS_ESCALAS
    float far = smoothstep(14.0, 70.0, camD);
    float k2 = clamp(far * 0.75 + (mac2.b - 0.5) * 0.6, 0.0, 1.0);
    a0 = mix(a0, texture2D(tA0, rotUv(uv0, 1.1) * 0.29), k2);
    a1 = mix(a1, texture2D(tA1, rotUv(uv1, 2.3) * 0.31), k2);
    a2 = mix(a2, texture2D(tA2, rotUv(uv2, 0.7) * 0.27), k2);
    a3 = mix(a3, texture2D(tA3, rotUv(uv3, 1.9) * 0.33), k2);
  #endif
  vec4 hgt = vec4(dot(a0.rgb, vec3(0.33)), dot(a1.rgb, vec3(0.33)), dot(a2.rgb, vec3(0.33)), dot(a3.rgb, vec3(0.33)));
  vec4 on = step(0.002, w);
  vec4 hw = w + hgt * 0.55 * on;
  float hm = max(max(hw.x, hw.y), max(hw.z, hw.w)) - 0.22;
  vec4 bw = max(hw - hm, 0.0) * on;
  bw /= max(dot(bw, vec4(1.0)), 1e-4);
  vec3 c0 = lin3(a0.rgb) * uTint0, c1 = lin3(a1.rgb) * uTint1, c2 = lin3(a2.rgb) * uTint2, c3 = lin3(a3.rgb) * uTint3;
  const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
  c0 = mix(vec3(dot(c0, LUM)), c0, uSat.x); c1 = mix(vec3(dot(c1, LUM)), c1, uSat.y);
  c2 = mix(vec3(dot(c2, LUM)), c2, uSat.z); c3 = mix(vec3(dot(c3, LUM)), c3, uSat.w);
  // musgo: manchas de verde hondo, verde amarillento y pasto seco, a dos escalas
  c0 *= mix(vec3(0.72, 0.86, 0.7), vec3(1.18, 1.08, 0.72), smoothstep(0.25, 0.75, mac.b)) * (0.8 + mac2.r * 0.36);
  c0 = mix(c0, c1 * vec3(1.1, 1.0, 0.8), smoothstep(0.62, 0.85, mac.a * 0.6 + mac2.g * 0.5) * 0.35);
  c1 *= 0.86 + mac.g * 0.3;
  c2 *= mix(vec3(0.9, 0.92, 0.95), vec3(1.08, 1.03, 0.95), mac.r);
  // acantilados: oclusión en las grietas (la luminancia de la roca hace de altura) y musgo en las repisas que miran arriba
  c2 *= mix(0.55, 1.08, smoothstep(0.15, 0.6, hgt.z));
  float musgoRoca = smoothstep(0.42, 0.78, nG.y + (mac2.r - 0.5) * 0.45) * smoothstep(0.35, 0.65, mac.g + mac2.b * 0.3);
  c2 = mix(c2, c0 * 0.78, musgoRoca * 0.75);
  vec3 alb = c0 * bw.x + c1 * bw.y + c2 * bw.z + c3 * bw.w;
  #ifdef SPLAT_ORILLA
    alb = mix(alb, c3 * vec3(0.62, 0.52, 0.4), smoothstep(0.55, 0.95, ori) * bw.w * 0.6); // barro húmedo junto al agua
  #endif
  alb *= 1.0 - 0.25 * (1.0 - smoothstep(uMar + 0.05, uMar + 0.6, vWPos.y)) * (1.0 - steep);
  #ifdef SPLAT_ZONAS
    // identidad por zona (ficha 26-F): la villa cálida, el Yunque verde azulado, la costa clara, la mesa del este ocre; la roca, a medias
    vec4 zn = texture2D(tZona, (wp - uZona.xy) * uZona.zw);
    alb *= mix(vec3(1.0), zn.rgb + 0.5, 1.0 - bw.z * 0.5);
    #ifdef SPLAT_MUSGO
      // musgo húmedo en los llanos altos (pendiente < 15°, más de 60 m) de las zonas húmedas
      float musgo = zn.a * smoothstep(0.955, 0.975, nG.y) * smoothstep(56.0, 64.0, vWPos.y) * smoothstep(0.3, 0.6, mac.g + mac2.r * 0.4);
      alb = mix(alb, c0 * vec3(0.62, 0.9, 0.66), musgo * 0.6);
    #endif
  #endif
  diffuseColor.rgb *= alb;
`;
  // Normales de las 4 capas en el espacio tangente de la proyección planar (T = +x, B = +z), fuertes de cerca y suaves de lejos
  const SPLAT_NORMAL = `
  #ifdef SPLAT_NORMALES
  {
    vec3 n0 = texture2D(tN0, uv0).xyz * 2.0 - 1.0, n1 = texture2D(tN1, uv1).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(tN2, uv2).xyz * 2.0 - 1.0, n3 = texture2D(tN3, uv3).xyz * 2.0 - 1.0;
    vec3 nt = n0 * bw.x + n1 * bw.y + n2 * bw.z + n3 * bw.w;
    nt.xy *= mix(1.1, 0.25, smoothstep(10.0, 80.0, camD));
    vec3 T = normalize(vec3(1.0, 0.0, 0.0) - nG * nG.x);
    vec3 B = cross(T, nG);
    vec3 nW = normalize(T * nt.x - B * nt.y + nG * max(nt.z, 0.05));
    #ifdef SPLAT_TRIPLANAR
      if (tpB.y < 0.98 && bw.z > 0.01) {
        // normales de la roca por los tres ejes (mezcla tipo UDN) para las caras verticales
        vec3 tX = texture2D(tN2, uvRX).xyz * 2.0 - 1.0, tZ = texture2D(tN2, uvRZ).xyz * 2.0 - 1.0;
        vec3 nR = normalize(vec3(0.0, tX.y, tX.x) * tpB.x + vec3(n2.x, 0.0, -n2.y) * tpB.y + vec3(tZ.x, tZ.y, 0.0) * tpB.z + nG);
        nW = normalize(mix(nW, nR, bw.z * (1.0 - tpB.y)));
      }
    #endif
    normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);
  }
  #endif
`;
  // BB1: textura de orilla (1 canal, 1 texel cada 2 m) con la distancia al borde del río, la quebrada y las pozas de
  // mapa.agua: 1 en el borde del agua y 0 a 4,5 m o más. El shader pone ahí arena y barro en vez de roca o pasto.
  const ORILLA = (() => {
    const DA = MAPA && MAPA.agua, TM = MAPA && MAPA.tamano;
    if (!DA || !TM || (W.suelo && W.suelo.orilla === false)) return null;
    const paso = 2, BANDA = 4.5, nx = Math.ceil(TM.ancho / paso) + 1, nz = Math.ceil(TM.largo / paso) + 1;
    const dist = new Float32Array(nx * nz).fill(BANDA);
    const marca = (x0, x1, z0, z1, f) => {
      const i0 = Math.max(0, Math.floor((x0 - TM.x0) / paso)), i1 = Math.min(nx - 1, Math.ceil((x1 - TM.x0) / paso));
      const k0 = Math.max(0, Math.floor((z0 - TM.z0) / paso)), k1 = Math.min(nz - 1, Math.ceil((z1 - TM.z0) / paso));
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
        const d = f(TM.x0 + i * paso, TM.z0 + k * paso);
        if (d < dist[k * nx + i]) dist[k * nx + i] = d;
      }
    };
    for (const P of [DA.rio && DA.rio.puntos, DA.quebrada && DA.quebrada.puntos]) {
      if (!P) continue;
      for (let j = 0; j < P.length - 1; j++) {
        const p = P[j], q = P[j + 1], dx = q[0] - p[0], dz = q[1] - p[1], L2 = dx * dx + dz * dz || 1, e = Math.max(p[3], q[3]) + BANDA;
        marca(Math.min(p[0], q[0]) - e, Math.max(p[0], q[0]) + e, Math.min(p[1], q[1]) - e, Math.max(p[1], q[1]) + e, (x, z) => {
          const t = Math.max(0, Math.min(1, ((x - p[0]) * dx + (z - p[1]) * dz) / L2));
          return Math.hypot(x - p[0] - t * dx, z - p[1] - t * dz) - (p[3] + t * (q[3] - p[3]));
        });
      }
    }
    for (const o of DA.pozas || []) marca(o.x - o.r - BANDA, o.x + o.r + BANDA, o.z - o.r - BANDA, o.z + o.r + BANDA, (x, z) => Math.hypot(x - o.x, z - o.z) - o.r);
    const u8 = new Uint8Array(nx * nz);
    for (let i = 0; i < u8.length; i++) { const t = clamp01(1 - (dist[i] + 0.5) / BANDA); u8[i] = Math.round(255 * t * t * (3 - 2 * t)); }
    const tex = new THREE.DataTexture(u8, nx, nz, THREE.LuminanceFormat, THREE.UnsignedByteType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    return { tex, v: new THREE.Vector4(TM.x0 - paso / 2, TM.z0 - paso / 2, 1 / (nx * paso), 1 / (nz * paso)) };
  })();
  const splatMats = [];
  const ZONAS = G.ambiente && G.ambiente.zonas; // src/engine/ambiente.js (va antes en index.html); null sin mapa
  function splatMaterial(capas, q) {
    q = q || {};
    const maxPx = q.texMax || 0;
    const L = capas.map(c => ({ a: texRep(c.tex, maxPx), n: c.normal ? texRep(c.normal, maxPx) : null, e: c.escala || 0.45, t: new THREE.Color(c.tinte || '#ffffff'), s: c.saturacion != null ? c.saturacion : 1 }));
    const m = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x080808, shininess: 14 });
    const U = {
      tA0: { value: L[0].a }, tA1: { value: L[1].a }, tA2: { value: L[2].a }, tA3: { value: L[3].a },
      tN0: { value: L[0].n }, tN1: { value: L[1].n }, tN2: { value: L[2].n }, tN3: { value: L[3].n },
      tMacro: { value: macroNoise() }, uEsc: { value: new THREE.Vector4(L[0].e, L[1].e, L[2].e, L[3].e) },
      uTint0: { value: L[0].t }, uTint1: { value: L[1].t }, uTint2: { value: L[2].t }, uTint3: { value: L[3].t },
      uMar: { value: q.mar || 0 }, uSat: { value: new THREE.Vector4(L[0].s, L[1].s, L[2].s, L[3].s) },
      tOrilla: { value: ORILLA ? ORILLA.tex : null }, uOrilla: { value: ORILLA ? ORILLA.v : new THREE.Vector4() },
      tZona: { value: ZONAS ? ZONAS.tex : null }, uZona: { value: ZONAS ? new THREE.Vector4(ZONAS.x0, ZONAS.z0, 1 / ZONAS.ancho, 1 / ZONAS.largo) : new THREE.Vector4() },
    };
    m.defines = {};
    m.userData.splat = true; m.userData.uniforms = U;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = SPLAT_VERT + sh.vertexShader.replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vSplat = splat;',
        'vec4 wPos4 = modelMatrix * vec4(transformed, 1.0); vWPos = wPos4.xyz;',
        'vWNor = normalize(mat3(modelMatrix) * objectNormal);',
      ].join('\n'));
      sh.fragmentShader = SPLAT_FRAG_PARS + '\n' + sh.fragmentShader
        .replace('#include <map_fragment>', SPLAT_ALBEDO)
        .replace('#include <normal_fragment_maps>', SPLAT_NORMAL)
        // sin brillo plástico (ficha 26-F): la roca y la tierra casi no reflejan; el musgo y la arena húmeda, algo
        .replace('#include <specularmap_fragment>', '#include <specularmap_fragment>\n  specularStrength *= 1.0 - bw.z * 0.8 - bw.y * 0.4;');
    };
    m.customProgramCacheKey = () => 'splat:' + Object.keys(m.defines).join(',');
    splatMats.push(m);
    calidadSplat(m, R.calidad);
    return m;
  }
  function calidadSplat(m, C) {
    const d = {};
    if (ORILLA) d.SPLAT_ORILLA = '';
    if (C.normalesSuelo) { d.SPLAT_NORMALES = ''; d.SPLAT_TRIPLANAR = ''; }
    if (C.dosEscalas) d.SPLAT_DOS_ESCALAS = '';
    if (ZONAS) { d.SPLAT_ZONAS = ''; if (C.nivel === 'alto') d.SPLAT_MUSGO = ''; }
    if (Object.keys(d).join() !== Object.keys(m.defines).join()) { m.defines = d; m.needsUpdate = true; }
  }
  G.on('calidad', C => { for (const m of splatMats) calidadSplat(m, C); });

  // ---------- Suelo analítico (modo plantilla) e islas: UV de mundo, color de vértice r = arena, g = tierra ----------
  let tPasto = null, tSuelo = null;
  function groundMaterial(scale) {
    if (!tPasto) { tPasto = G.assets.tex(TX.pasto); tSuelo = G.assets.tex(TX.suelo); }
    const m = new THREE.MeshLambertMaterial({ vertexColors: true });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { tPasto: { value: tPasto }, tSuelo: { value: tSuelo }, uScale: { value: scale } });
      sh.vertexShader = 'varying vec2 vTUv;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  vTUv = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = 'uniform sampler2D tPasto, tSuelo; uniform float uScale; varying vec2 vTUv;\n' + sh.fragmentShader.replace('#include <color_fragment>', [
        'vec3 gP = pow(texture2D(tPasto, vTUv * 0.22 * uScale).rgb * 1.5, vec3(2.2));',
        'vec3 gS = pow(texture2D(tSuelo, vTUv * 0.3 * uScale).rgb * 1.15, vec3(2.2));',
        'vec3 sand = pow(vec3(0.86, 0.77, 0.55) * (0.88 + 0.2 * pow(gS.g, 0.4545)), vec3(2.2));',
        'diffuseColor.rgb *= mix(mix(gP, gS, vColor.g), sand, vColor.r);',
      ].join('\n'));
    };
    return m;
  }

  const colliders = G.fisica.colliders;
  const allTrees = [];
  const chunks = [];
  let listo = Promise.resolve();

  if (MAPA) {
    // ---------- Trozos del terreno del mapa ----------
    const SU = W.suelo || {};
    const capas = SU.capas || [
      { tex: 'assets/tex/entorno/suelo_musgo.jpg', normal: 'assets/tex/entorno/suelo_musgo_n.jpg', escala: 1 / 2.8, tinte: '#d2dcc0', saturacion: 0.72 },
      { tex: 'assets/tex/entorno/suelo_tierra_hojarasca.jpg', normal: 'assets/tex/entorno/suelo_tierra_hojarasca_n.jpg', escala: 1 / 2.6, tinte: '#f0e6dc', saturacion: 0.92 },
      { tex: 'assets/tex/entorno/suelo_roca.jpg', normal: 'assets/tex/entorno/suelo_roca_n.jpg', escala: 1 / 5, tinte: '#e8e2da', saturacion: 0.8 },
      { tex: 'assets/tex/entorno/suelo_arena_rio.jpg', normal: 'assets/tex/entorno/suelo_arena_rio_n.jpg', escala: 1 / 3, tinte: '#fff8ec', saturacion: 0.9 },
    ];
    const sueloMat = splatMaterial(capas, { mar: 0, texMax: R.calidad.texMax });
    const B64 = (W.mapa && W.mapa.b64) || 'AV_MAPA_B64';
    const trozos = (MAPA.terreno && MAPA.terreno.trozos) || [];
    listo = Promise.all(trozos.map(t => G.assets.loadGLB(t.glb, {
      b64: () => (window[B64] || {})[t.id], script: t.glb.replace(/\.glb$/, '_glb.js'), base: '', error: 'terreno no disponible: ' + t.id,
    }).then(g => {
      g.scene.updateMatrixWorld(true);
      let geo = null;
      g.scene.traverse(o => { if (o.isMesh && !geo) geo = o.geometry.clone().applyMatrix4(o.matrixWorld); });
      if (!geo) return null;
      const c = geo.getAttribute('color');
      if (c) { geo.setAttribute('splat', c); geo.deleteAttribute('color'); }
      else geo.setAttribute('splat', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 4).fill(0.25), 4));
      if (!geo.getAttribute('normal')) geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, sueloMat);
      mesh.name = 'terreno:' + t.id; mesh.receiveShadow = true; mesh.castShadow = !!R.calidad.sombraTerreno;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      scene.add(mesh); chunks.push(mesh);
      return geo;
    }).catch(e => { console.warn('AVE terreno:', e && e.message || e); return null; })))
      .then(geos => {
        const ok = geos.filter(Boolean);
        const fin = () => G.emit('terrenoListo');
        if (!ok.length) { fin(); return; }
        return buildTriGrid(ok).then(fin);
      });
    G.on('calidad', C => { for (const m of chunks) m.castShadow = !!C.sombraTerreno; });
  } else {
    // ---------- Suelo analítico ----------
    const tGeo = new THREE.PlaneGeometry(WORLD * 2 + 20, WORLD * 2 + 20, W.segmentos || 110, W.segmentos || 110);
    tGeo.rotateX(-Math.PI / 2);
    const tp = tGeo.attributes.position, colors = [];
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i), y = height(x, z);
      tp.setY(i, y);
      let dirt = Math.max(0, Math.sin(x * 0.21 + Math.cos(z * 0.17) * 2) * Math.cos(z * 0.13 - x * 0.05) - 0.1) * 1.6;
      for (const f of FLATS) dirt = Math.max(dirt, clamp01((f.r + 1 - Math.hypot(x - f.x, z - f.z)) / 3) * 0.8);
      const sand = riverX == null ? 0 : clamp01((waterBase + 0.5 - y) / 0.9) * clamp01((15 - Math.abs(x - riverX)) / 4);
      colors.push(sand, clamp01(dirt), 0);
    }
    tGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    tGeo.computeVertexNormals();
    const ground = new THREE.Mesh(tGeo, groundMaterial(1)); ground.receiveShadow = true;
    scene.add(ground); chunks.push(ground);

    // ---------- Árboles y palmas (modo plantilla) ----------
    const A = W.arboles || {};
    const evitar = () => [].concat(typeof A.evitar === 'function' ? A.evitar(G.pack) : A.evitar || []);
    if (A.cantidad) {
      const Rn = rng(A.semilla || 7);
      const pick = (G.pack.recursos || []).map(r => ({ x: r.x, z: r.z, r: A.margenObjetos || 3 }));
      const clear = pick.concat(evitar().map(e => ({ x: e.x, z: e.z, r: e.r || 3 })));
      for (let tries = 0; allTrees.length < A.cantidad && tries < 4000; tries++) {
        const x = (Rn() * 2 - 1) * WORLD, z = (Rn() * 2 - 1) * WORLD;
        if (riverX != null && Math.abs(x - riverX) < (A.margenRio || 7)) continue;
        if (FLATS.some(f => Math.hypot(x - f.x, z - f.z) < f.r + 3)) continue;
        if (clear.some(r => Math.hypot(x - r.x, z - r.z) < r.r)) continue;
        allTrees.push({ x, z, s: 0.8 + Rn() * 0.7 });
      }
    }
    for (const t of A.extra || []) allTrees.push(Object.assign({}, t));
    const every = A.copaCada || 3;
    const broad = allTrees.filter((t, i) => i % every === every - 1 || t.copa);
    const palms = allTrees.filter(t => !broad.includes(t));
    const m4 = new THREE.Matrix4();
    if (broad.length) {
      const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.35, 3, 6), new THREE.MeshLambertMaterial({ color: '#7a5634' }), broad.length);
      const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshLambertMaterial({ color: A.copaColor || '#2f7d43' }), broad.length);
      broad.forEach((t, i) => {
        const y = height(t.x, t.z);
        m4.makeScale(t.s, t.s, t.s).setPosition(t.x, y + 1.5 * t.s, t.z); trunks.setMatrixAt(i, m4);
        m4.makeScale(t.s * 1.2, t.s, t.s * 1.2).setPosition(t.x, y + 3.4 * t.s, t.z); crowns.setMatrixAt(i, m4);
      });
      trunks.castShadow = crowns.castShadow = true;
      scene.add(trunks, crowns);
    }
    for (const t of allTrees) colliders.push({ x: t.x, z: t.z, r: 0.6 * t.s, kind: 'tree' });
    const PALM_H = 4.2;
    const palmFronds = () => {
      const parts = [], N = 8;
      for (let k = 0; k < N; k++) {
        const len = 2.8 + (k % 3) * 0.35;
        const g = new THREE.PlaneGeometry(len, 0.9, 8, 1);
        g.translate(len / 2, 0, 0); g.rotateX(-Math.PI / 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const u = p.getX(i) / len; p.setY(i, u * 0.7 - u * u * (1.5 + (k % 2) * 0.4)); }
        g.computeVertexNormals();
        g.rotateY(k * Math.PI * 2 / N + (k % 2) * 0.2);
        g.translate(0, PALM_H, 0);
        parts.push(g);
      }
      return mergeGeos(parts);
    };
    if (palms.length) {
      const tHoja = G.assets.loader.load(TX.palmaHoja), tTronco = G.assets.tex(TX.palmaTronco);
      tTronco.repeat.set(1, 4);
      const palmTrunkGeo = new THREE.CylinderGeometry(0.15, 0.27, PALM_H, 7, 1); palmTrunkGeo.translate(0, PALM_H / 2, 0);
      const palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, new THREE.MeshLambertMaterial({ map: tTronco }), palms.length);
      const palmLeaves = new THREE.InstancedMesh(palmFronds(), new THREE.MeshLambertMaterial({ map: tHoja, alphaTest: 0.45, side: THREE.DoubleSide }), palms.length);
      const pQ = new THREE.Quaternion(), pE = new THREE.Euler(), pS = new THREE.Vector3(), pP = new THREE.Vector3();
      palms.forEach((t, i) => {
        pE.set(Math.sin(t.x * 3.1) * 0.12, t.x * 7.3 + t.z * 1.7, Math.cos(t.z * 2.3) * 0.12);
        m4.compose(pP.set(t.x, height(t.x, t.z) - 0.1, t.z), pQ.setFromEuler(pE), pS.setScalar(t.s * 1.05));
        palmTrunks.setMatrixAt(i, m4); palmLeaves.setMatrixAt(i, m4);
      });
      palmTrunks.castShadow = palmLeaves.castShadow = true;
      scene.add(palmTrunks, palmLeaves);
    }
    const B = W.bruma;
    if (B) {
      const mist = new THREE.Mesh(new THREE.RingGeometry(B.dentro, B.fuera, 48), new THREE.MeshBasicMaterial({ color: B.color || '#fff3d6', transparent: true, opacity: B.opacidad != null ? B.opacidad : 0.35, side: THREE.DoubleSide, depthWrite: false }));
      mist.rotation.x = -Math.PI / 2; mist.position.y = B.y != null ? B.y : 1.5; scene.add(mist);
    }
  }

  // ---------- Islas lejanas: relieve .glb del mapa original (o conos de respaldo) ----------
  const ISL = W.islas || {};
  const islas = ISL.lista || [];
  const O = W.oceano || {};
  const seaY = MAPA ? 0 : O.y != null ? O.y : -2.6;
  const islandCones = islas.map(I => {
    const isl = new THREE.Mesh(new THREE.ConeGeometry(I.r, I.r * 0.7, 9), new THREE.MeshLambertMaterial({ color: '#4f8a52' }));
    isl.position.set(I.x, seaY + I.r * (MAPA ? 0.12 : 0.3), I.z); scene.add(isl);
    return isl;
  });
  // El relieve de las islas se pide cuando la cotorra se acerca a una (a menos de ISLA_VER m de su orilla): hasta entonces
  // se ven los conos de respaldo y no entra en la descarga inicial. Sin posición todavía, espera.
  const ISLA_VER = 420;
  let islasPedidas = false;
  const cercaDeIsla = () => { const P = G.S && G.S.pos; return !!P && islas.some(I => Math.hypot(P.x - I.x, P.z - I.z) - I.r <= ISLA_VER); };
  const pedirIslas = () => {
    if (islasPedidas) return; islasPedidas = true;
    const M = ISL.modelo;
    G.assets.loadGLB(M.url, { b64: () => window[M.b64], script: M.script, base: M.base, error: 'isla no disponible' }).then(g => {
      let mesh = null; g.scene.updateMatrixWorld(true);
      g.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
      if (!mesh) throw new Error('sin malla');
      return mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    }).then(geo => {
      geo.computeBoundingBox();
      const bb = geo.boundingBox, c = bb.getCenter(new THREE.Vector3()), w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
      geo.translate(-c.x, -bb.min.y, -c.z); geo.scale(1 / w, 1 / w, 1 / w);
      const hMax = (bb.max.y - bb.min.y) / w, p = geo.attributes.position, col = [];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), d = Math.hypot(x, z) * 2;
        const edge = 0.78 + 0.1 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 7 + 2.1);
        if (d > edge) p.setY(i, p.getY(i) - (d - edge) * 0.6);
        const hn = p.getY(i) / hMax;
        col.push(clamp01((0.06 - hn) / 0.06 + (d > edge ? 1 : 0)), clamp01((hn - 0.35) * 2.5), 0);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.computeVertexNormals();
      const mat = groundMaterial(0.6);
      islas.forEach((I, k) => {
        const m = new THREE.Mesh(geo, mat);
        const s = I.r * (MAPA ? 2.6 : 3.6);
        m.scale.set(s, s * (MAPA ? 0.9 : 1.8), s); m.rotation.y = k * 2.1 + 0.4;
        m.position.set(I.x, seaY - (MAPA ? 1.5 : 0.4), I.z);
        scene.add(m); islandCones[k].visible = false;
      });
    }).catch(() => {});
  };
  if (islas.length && ISL.modelo) {
    // Solo tras el primer gesto del jugador (Jugar, una tecla o un toque): el relieve de las islas no es parte de la descarga inicial
    let n = 0, jugable = false;
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { jugable = true; }, { once: true, passive: true });
    G.on('update', () => { if (jugable && !islasPedidas && ++n % 20 === 0 && cercaDeIsla()) pedirIslas(); });
  }

  return {
    WORLD, places, pois, poi, rawHeight, height, surfaceY, normalAt, splatAt, addPlatform, removePlatform, plataformas, platformTop,
    flats: FLATS, waterBase, riverX, islas, trees: allTrees, groundMaterial, splatMaterial, macroNoise, texRep,
    mapa: MAPA, chunks, get listo() { return listo; }, get exacto() { return TG.ready; }, hmHeight: HM ? hmHeight : null,
  };
});
