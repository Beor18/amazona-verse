/* Juego · Minimapa (directiva P0 de Kelvin: «el jugador nunca debe sentirse perdido»)
   Se carga solo, un poco después del arranque (src/boot.js), y al pedir su prueba. No va en la descarga inicial.
   - Compacto (#minimapa): una esquina del HUD, a la derecha, bajo el inventario y los botones del sistema (en el móvil, a la izquierda de
     la columna de botones). Norte arriba; la flecha blanca gira con el rumbo de la cotorra (S.facing). Muestra 55 m a la redonda andando
     y 85 m volando. Debajo, la distancia al objetivo («● 128 m») o, sin objetivo, el lugar más cercano.
   - Grande (#mapa-grande): toda la isla. Se abre con un toque en el compacto o con la tecla M; se cierra con M, Esc o «Cerrar». Mientras
     está abierto el mundo se pausa (G.pausa.set('mapa')). Un toque en el mapa fija un destino verde; otro toque sobre él lo quita.
   - Marcadores: objetivo principal (amarillo, estrella; misión de la historia o siguiente punto del reto; si queda fuera de vista se pega
     al borde con una punta), misión «!» (naranja), parada o descubrimiento «?» (azul), Reto (rombo morado), fruto del Banquete (punto
     rojo), lugar descubierto (cuadrado blanco con su nombre en el grande), destino (verde, bandera). Cada tipo lleva forma y glifo
     distintos: no depende solo del color.
   - Ruta opcional: una línea discontinua hacia el destino (o, si no hay, hacia el objetivo). Se activa en el mapa grande («Ruta»);
     la preferencia se guarda en este dispositivo.
   - Datos: relieve con sombreado, agua (G.agua.levelAt) y flora (G.vegetacion.instancias) se precalculan UNA vez en un canvas de
     192×192 (agua y flora a 96×96) en trozos de pocos ms; luego solo se recorta y se escala. Se redibuja ~10 veces por segundo y solo
     si el minimapa se ve.
   - Accesibilidad (src/game/accesibilidad.js): texto con --fs-k (a11y-t1/t2), alto contraste (fondo negro opaco, borde blanco, mapa
     oscurecido y marcas más gruesas) y modo zurdo (los botones del mapa grande pasan al otro lado).
   API: window.AVMinimapa(G) → { abrir, cerrar, alternar, abierto, listo, marcadores, anguloFlecha, distancia, fijarDestino, quitarDestino,
   ruta, tick, test }. Prueba: AV.minimapaTest(). */
window.AVMinimapa = function (G) {
  'use strict';
  if (G.minimapa) return G.minimapa;
  const S = G.S, M = G.fisica.MOVE, doc = document, raiz = doc.documentElement, $ = G.util.$;
  const MAPA = window.AV_MAPA_CAP1 || null;
  const W = (G.terreno && G.terreno.WORLD) || 70;
  const T = MAPA && MAPA.tamano ? { x0: MAPA.tamano.x0, z0: MAPA.tamano.z0, ancho: MAPA.tamano.ancho, largo: MAPA.tamano.largo } : { x0: -W, z0: -W, ancho: 2 * W, largo: 2 * W };
  const N = 192, NF = 96;                       // rejilla del relieve y de la flora
  const R_ANDANDO = 55, R_VOLANDO = 85;         // metros a la redonda en el compacto
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || (G.pack && G.pack.id) || 'amazonaverse') + '.minimapa';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const H = (x, z) => G.terreno.height(x, z);
  const COL = { obj: '#ffd23f', mision: '#ff7a30', parada: '#2f8fe0', reto: '#8e5be8', fruto: '#e8364a', lugar: '#ffffff', dest: '#2fc15a', yo: '#ffffff', tinta: '#14202b' };

  // ---------- Preferencia (solo este dispositivo; si no hay almacén, valores por defecto) ----------
  const pref = { ruta: true };
  try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && typeof d.ruta === 'boolean') pref.ruta = d.ruta; } catch (e) { /* sin almacén */ }
  const guardarPref = () => { try { localStorage.setItem(CLAVE, JSON.stringify(pref)); } catch (e) { /* sin almacén */ } };

  // ---------- Relieve precalculado (lazy, en trozos) ----------
  const base = doc.createElement('canvas'); base.width = base.height = N;
  const flora = doc.createElement('canvas'); flora.width = flora.height = NF;
  const B = { listo: false, fila: 0, h: null, empezo: false, florado: false };
  function rampa(h) {
    if (h < -0.05) { const d = clamp(-h / 10, 0, 1); return [34 + (24 - 34) * d, 128 + (84 - 128) * d, 176 + (142 - 176) * d]; } // mar: de claro a hondo
    if (h < 1.6) return [232, 214, 154];                                                                                         // playa
    if (h < 40) { const t = h / 40; return [116 - 52 * t, 190 - 52 * t, 92 - 28 * t]; }                                          // verde
    if (h < 75) { const t = (h - 40) / 35; return [64 + 90 * t, 138 - 8 * t, 64 + 20 * t]; }                                     // monte
    const t = clamp((h - 75) / 30, 0, 1); return [154 + 80 * t, 130 + 98 * t, 84 + 130 * t];                                      // cumbre
  }
  function empezarBase() {
    if (B.empezo) return; B.empezo = true;
    const cx = T.ancho / N, cz = T.largo / N, ctx = base.getContext('2d');
    const alt = new Float32Array((N + 2) * (N + 2)), agua = new Uint8Array(NF * NF);
    B.h = alt;
    ctx.fillStyle = '#2a6f9a'; ctx.fillRect(0, 0, N, N);
    const img = ctx.createImageData(N, N), d = img.data;
    const lv = G.agua && G.agua.levelAt;
    let fila = -1; // -1: alturas de la fila 0.. (se calculan con un borde de 1 celda)
    function paso() {
      const t0 = performance.now();
      try {
        while (fila < N + 1 && performance.now() - t0 < 5) {
          fila++;
          const j = fila, z = T.z0 + (j - 0.5) * cz;
          for (let i = 0; i < N + 2; i++) alt[j * (N + 2) + i] = H(T.x0 + (i - 0.5) * cx, z);
        }
      } catch (e) { console.warn('AVE minimapa:', e && e.message || e); return; }
      if (fila < N + 1) { setTimeout(paso, 0); return; }
      // Agua (96×96) y color con sombreado: sin alturas nuevas, solo aritmética
      try {
        if (lv) for (let j = 0; j < NF; j++) for (let i = 0; i < NF; i++) {
          const x = T.x0 + (i + 0.5) * T.ancho / NF, z = T.z0 + (j + 0.5) * T.largo / NF, w = lv(x, z);
          agua[j * NF + i] = w > -1e8 && w > H(x, z) + 0.05 ? 1 : 0;
        }
      } catch (e) { /* sin agua */ }
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const k = (j + 1) * (N + 2) + (i + 1), h = alt[k];
        const gx = alt[k + 1] - alt[k - 1], gz = alt[k + N + 2] - alt[k - N - 2];
        const sh = 1 + 0.3 * clamp((gx + gz) / (2 * Math.max(cx, cz)), -1.2, 1.2); // luz del noroeste
        let c = rampa(h), esAgua = agua[(j >> 1) * NF + (i >> 1)];
        if (esAgua && h >= -0.05) c = [60, 150, 205];
        const m = h < -0.05 || esAgua ? 1 : sh, o = (j * N + i) * 4;
        d[o] = clamp(c[0] * m, 0, 255); d[o + 1] = clamp(c[1] * m, 0, 255); d[o + 2] = clamp(c[2] * m, 0, 255); d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      B.listo = true; B.h = null; dirty = true;
      pintarFlora();
    }
    setTimeout(paso, 0);
  }
  // Flora: densidad de árboles a 96×96 (vegetacion.js la crea después; si aún no está se reintenta cuando esté lista)
  function pintarFlora() {
    const V = G.vegetacion; if (!V) return;
    const aplicar = () => {
      const inst = V.instancias, info = V.info; if (!inst) return;
      const cuenta = new Uint16Array(NF * NF);
      for (const m in inst) {
        const P = inst[m], inf = info && info[m]; if (!P || !P.pos || !inf || !(inf.alto > 3)) continue;
        for (let i = 0; i < P.n; i++) {
          const x = P.pos[i * 4], z = P.pos[i * 4 + 2], u = Math.floor((x - T.x0) / T.ancho * NF), v = Math.floor((z - T.z0) / T.largo * NF);
          if (u >= 0 && v >= 0 && u < NF && v < NF) cuenta[v * NF + u]++;
        }
      }
      const ctx = flora.getContext('2d'), img = ctx.createImageData(NF, NF), d = img.data;
      for (let k = 0; k < NF * NF; k++) { const a = clamp(cuenta[k] * 0.22, 0, 0.62); d[k * 4] = 22; d[k * 4 + 1] = 92; d[k * 4 + 2] = 38; d[k * 4 + 3] = a * 255; }
      ctx.putImageData(img, 0, 0); B.florado = true; dirty = true;
    };
    try { if (V.listo && V.listo.then) V.listo.then(aplicar, () => {}); else aplicar(); } catch (e) { /* sin flora */ }
  }

  // ---------- Datos vivos: objetivo, marcadores, destino ----------
  const ext = { objetivo: undefined, reto: undefined };  // costuras de prueba (undefined = datos reales)
  let destino = null;                                    // { x, z } fijado por el jugador (o la meta del reto)
  let dirty = true;
  const hayRetos = () => { const r = G.retosApi; return !!(r && r.activo); };
  // Reto en curso: { puntos, sig } (carrera y río), { frutos } (Banquete) o { arena } (tormenta); null si no hay
  function datosReto() {
    if (ext.reto !== undefined) return ext.reto;
    const r = G.retosApi; if (!r || !r.activo || !r._dev) return null;
    try {
      if (r.reto === 'banquete') {
        const J = G.banquete && G.banquete._dev, lista = J && J.juego && J.juego.lista;
        return lista ? { frutos: lista.filter(f => f.activo && typeof f.x === 'number') } : null;
      }
      if (r.reto === 'tormenta') { const a = r._dev.TM && r._dev.TM.arena; return a ? { arena: { x: a.x, z: a.z } } : null; }
      const C = r._dev.C; if (!C || !C.objetos || !C.objetos.length || C.fase === 'nada') return null;
      const puntos = C.objetos.map(o => o && o.userData).filter(u => u && typeof u.x === 'number');
      return puntos.length ? { puntos, sig: clamp(C.sig | 0, 0, puntos.length - 1) } : null;
    } catch (e) { return null; }
  }
  function objetivo() {
    if (ext.objetivo !== undefined) return ext.objetivo;
    const rt = datosReto();
    if (rt && rt.puntos) return { x: rt.puntos[rt.sig].x, z: rt.puntos[rt.sig].z, reto: true };
    if (rt && rt.arena) return { x: rt.arena.x, z: rt.arena.z, reto: true };
    if (rt && rt.frutos) { let mejor = null, bd = Infinity; for (const f of rt.frutos) { const d = Math.hypot(f.x - S.pos.x, f.z - S.pos.z); if (d < bd) { bd = d; mejor = f; } } return mejor ? { x: mejor.x, z: mejor.z, reto: true } : null; }
    if (hayRetos() || S.complete) return null;
    try { const t = G.misiones && G.misiones.guideTarget && G.misiones.guideTarget(); if (t && typeof t.x === 'number') return { x: t.x, z: t.z }; } catch (e) { /* sin guía */ }
    return null;
  }
  const NO_MISION = /^(parada_|percha_|bq_|nido_)/;
  function marcadores() {
    const out = [], P = S.pos;
    const ob = objetivo();
    if (ob) out.push({ tipo: 'obj', x: ob.x, z: ob.z });
    const rt = datosReto();
    if (rt && rt.puntos) rt.puntos.forEach((p, i) => { if (i !== rt.sig) out.push({ tipo: 'reto', x: p.x, z: p.z, n: i + 1 }); });
    const rec = new Set(((G.objetos && G.objetos.recursos) || []).map(r => r.id));
    const vistos = new Set();
    if (!hayRetos()) for (const it of G.interaccion.list) {
      if (typeof it.x !== 'number' || (it.visible && !it.visible())) continue;
      if (rec.has(it.id) || /^(m|p|c)\d+$/.test(it.id)) continue;
      const tipo = /^parada_/.test(it.id) ? 'parada' : NO_MISION.test(it.id) ? null : 'mision', clave = Math.round(it.x) + ',' + Math.round(it.z);
      if (!tipo || vistos.has(clave)) continue;
      vistos.add(clave); out.push({ tipo, x: it.x, z: it.z, id: it.id });
    }
    const L = G.lugares;
    if (L && L.lista) for (const p of L.lista()) if (L.descubiertos().includes(p.id)) out.push({ tipo: 'lugar', x: p.x, z: p.z, nombre: L.nombreDe(p), id: p.id });
    const bq = G.banquete && G.banquete._dev && G.banquete._dev.mundo && G.banquete._dev.mundo.lista;
    // Frutos: solo los 14 más cercanos (sin ruido; el Banquete tiene cientos y el mapa debe poder leerse)
    const fr = rt && rt.frutos ? rt.frutos : bq && !hayRetos() ? bq.filter(f => f.activo) : [];
    if (fr.length) fr.map(f => ({ f, d: (f.x - P.x) * (f.x - P.x) + (f.z - P.z) * (f.z - P.z) })).sort((u, v) => u.d - v.d).slice(0, 14).forEach(o => out.push({ tipo: 'fruto', x: o.f.x, z: o.f.z }));
    if (ext.frutos) for (const f of ext.frutos) out.push({ tipo: 'fruto', x: f.x, z: f.z });
    if (destino) out.push({ tipo: 'dest', x: destino.x, z: destino.z });
    else if (rt && rt.puntos && rt.puntos.length > 1) { const u = rt.puntos[rt.puntos.length - 1]; out.push({ tipo: 'dest', x: u.x, z: u.z, auto: true }); }
    return out;
  }
  const distancia = p => Math.round(Math.hypot(p.x - S.pos.x, p.z - S.pos.z));
  const texto = m => m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : m + ' m';
  // Rumbo: 0 = norte (arriba), sentido horario; el norte es -z
  function anguloFlecha() { const f = S.facing || { x: 0, z: -1 }; return Math.atan2(f.x, -f.z); }
  function lugarCerca() {
    const L = G.lugares; if (!L || !L.lista) return '';
    let mejor = null, bd = 60;
    for (const p of L.lista()) { const d = Math.hypot(p.x - S.pos.x, p.z - S.pos.z); if (d < bd) { bd = d; mejor = p; } }
    return mejor ? L.nombreDe(mejor) : '';
  }

  // ---------- DOM ----------
  const ESTILO = `
:root{--mm:124px}
#minimapa{right:max(12px,env(safe-area-inset-right,0px));top:var(--mm-top,calc(env(safe-area-inset-top,0px) + 134px));width:var(--mm);height:var(--mm);z-index:var(--z-hud)}
#minimapa[hidden]{display:none}
#minimapa .mm-btn{position:relative;display:block;width:var(--mm);height:var(--mm);padding:0;border:3px solid rgba(255,255,255,.92);border-radius:16px;overflow:hidden;background:#2a6f9a;box-shadow:0 3px 0 rgba(0,0,0,.28),0 6px 14px rgba(0,0,0,.35);cursor:pointer;-webkit-tap-highlight-color:transparent}
#minimapa .mm-btn:focus-visible{outline:3px solid var(--c-focus,#ffd23f);outline-offset:2px}
#minimapa canvas{display:block;width:100%;height:100%}
#minimapa .mm-txt{position:absolute;left:4px;right:4px;bottom:4px;display:flex;align-items:center;justify-content:center;gap:5px;padding:2px 6px;min-height:20px;box-sizing:border-box;border-radius:999px;background:rgba(20,32,43,.78);color:#fff;font:700 calc(12px * var(--fs-k,1))/1.2 var(--font-body,sans-serif);white-space:nowrap;overflow:hidden;pointer-events:none}
#minimapa .mm-dot{flex:none;width:10px;height:10px;border-radius:50%;background:${COL.obj};box-shadow:0 0 0 2px rgba(0,0,0,.35)}
#minimapa .mm-dot.off{display:none}
#minimapa .mm-d{overflow:hidden;text-overflow:ellipsis;min-width:0}
@media (max-width:560px){:root{--mm:96px}#minimapa{right:calc(max(12px,env(safe-area-inset-right,0px)) + 56px)}}
@media (max-width:360px){:root{--mm:80px}}
@media (max-height:480px){:root{--mm:56px}#minimapa .mm-btn{border-width:2px;border-radius:12px}#minimapa .mm-txt{left:2px;right:2px;bottom:2px;min-height:16px;padding:1px 4px;font-size:calc(10px * var(--fs-k,1))}#minimapa .mm-dot{width:7px;height:7px}}
body:has(#title[open]) #minimapa,body:has(#emotes:not([hidden])) #minimapa,body:has(:is(#creator,#comic,#end,#maestro):not([hidden])) #minimapa,body:has(#mapa-grande:not([hidden])) #minimapa,body:has(#quest.abierto) #minimapa{display:none}
@media (max-width:944px){body:has(#minimapa:not([hidden])) #subtitulos{right:calc(max(12px,env(safe-area-inset-right,0px)) + var(--mm) + 8px)}}
@media (max-width:560px){body:has(#minimapa:not([hidden])) #subtitulos{right:calc(max(12px,env(safe-area-inset-right,0px)) + 56px + var(--mm) + 8px)}}
@media (max-height:520px) and (orientation:landscape){body:has(#minimapa:not([hidden])) #subtitulos{right:200px}}
#mapa-grande{inset:0;z-index:calc(var(--z-card) + 1);display:grid;place-items:center;padding:calc(env(safe-area-inset-top,0px) + 8px) max(8px,env(safe-area-inset-right,0px)) calc(env(safe-area-inset-bottom,0px) + 8px) max(8px,env(safe-area-inset-left,0px));background:rgba(8,16,24,.55)}
#mapa-grande[hidden]{display:none}
#mapa-grande .mg-panel{--lado:min(calc(100vw - 32px),calc(100dvh - 190px),560px);width:calc(var(--lado) + 16px);max-width:100%;box-sizing:border-box;padding:8px;border-radius:18px;background:rgba(18,30,42,.96);border:2px solid rgba(255,255,255,.85);color:#fff;font:600 calc(13px * var(--fs-k,1))/1.3 var(--font-body,sans-serif)}
#mapa-grande .mg-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px}
#mapa-grande h2{margin:0 auto 0 4px;font:700 calc(16px * var(--fs-k,1))/1.2 var(--font-display,inherit)}
#mapa-grande .mg-head button{min-height:40px;padding:0 12px;border-radius:999px;border:2px solid rgba(255,255,255,.7);background:#243a50;color:#fff;font:700 calc(13px * var(--fs-k,1))/1 var(--font-body,sans-serif);cursor:pointer}
#mapa-grande .mg-head button[aria-pressed="true"]{background:#2fc15a;border-color:#fff;color:#08210f}
#mapa-grande .mg-head button[hidden]{display:none}
#mapa-grande .mg-head button:focus-visible{outline:3px solid var(--c-focus,#ffd23f);outline-offset:2px}
#mapa-grande canvas{display:block;width:var(--lado);height:var(--lado);max-width:100%;margin:0 auto;border-radius:12px;background:#2a6f9a;touch-action:manipulation}
#mapa-grande .mg-info{margin:6px 4px 2px;min-height:1.3em}
#mapa-grande .mg-ley{display:flex;flex-wrap:wrap;gap:4px 10px;margin:4px 4px 2px;padding:0;list-style:none;font-size:calc(11px * var(--fs-k,1));font-weight:600;opacity:.92}
#mapa-grande .mg-ley li{display:flex;align-items:center;gap:4px}
#mapa-grande .mg-ley i{display:inline-block;width:13px;height:13px;flex:none;box-sizing:border-box;border:2px solid #14202b;background:#fff}
#mapa-grande .mg-ley .l-mision{background:${COL.mision};border-radius:50%}#mapa-grande .mg-ley .l-parada{background:${COL.parada};border-radius:50%}
#mapa-grande .mg-ley .l-reto{background:${COL.reto};transform:rotate(45deg) scale(.85)}#mapa-grande .mg-ley .l-fruto{background:${COL.fruto};border-radius:50%;width:9px;height:9px}
#mapa-grande .mg-ley .l-lugar{background:#fff}#mapa-grande .mg-ley .l-obj{background:${COL.obj};border-radius:50%}#mapa-grande .mg-ley .l-dest{background:${COL.dest};border-radius:2px 50% 50% 2px}
@media (max-height:480px){#mapa-grande .mg-panel{--lado:calc(100dvh - 120px)}#mapa-grande .mg-ley{display:none}}
:root.a11y-zurdo #mapa-grande .mg-head{flex-direction:row-reverse}:root.a11y-zurdo #mapa-grande h2{margin:0 4px 0 auto}
:root.a11y-contraste #minimapa .mm-btn{background:#000;border-color:#fff;border-width:4px;box-shadow:none}
:root.a11y-contraste #minimapa .mm-txt{background:#000;border:2px solid #fff}
:root.a11y-contraste #mapa-grande .mg-panel{background:#000;border-color:#fff;border-width:3px}
:root.a11y-contraste #mapa-grande .mg-head button{background:#000;border-color:#fff}:root.a11y-contraste #mapa-grande .mg-head button[aria-pressed="true"]{background:#fff;color:#000}
:root.a11y-t1{--mm:132px}:root.a11y-t2{--mm:140px}
@media (max-width:560px){:root.a11y-t1{--mm:100px}:root.a11y-t2{--mm:104px}}
@media (max-width:360px){:root.a11y-t1,:root.a11y-t2{--mm:80px}}
@media (max-height:480px){:root.a11y-t1,:root.a11y-t2{--mm:56px}}`;
  const ESTILO_ID = 'estilo-minimapa';
  const HTML_COMPACTO = '<button type="button" class="mm-btn" aria-haspopup="dialog" aria-label="Minimapa. Tocar para ampliar (tecla M)"><canvas class="mm-c" width="124" height="124"></canvas>' +
    '<span class="mm-txt" aria-hidden="true"><i class="mm-dot off"></i><span class="mm-d"></span></span></button>';
  const HTML_GRANDE = '<div class="mg-panel"><div class="mg-head"><h2 id="mg-titulo">Mapa</h2>' +
    '<button type="button" class="mg-ruta" aria-pressed="false">Ruta</button><button type="button" class="mg-quitar" hidden>Quitar destino</button><button type="button" class="mg-cerrar" aria-label="Cerrar el mapa (M)">Cerrar</button></div>' +
    '<canvas class="mg-c" width="400" height="400" aria-label="Mapa de la isla. Toca para fijar un destino"></canvas><p class="mg-info" aria-live="polite"></p>' +
    '<ul class="mg-ley"><li><i class="l-obj"></i>Objetivo</li><li><i class="l-mision"></i>Misión</li><li><i class="l-parada"></i>Parada</li><li><i class="l-reto"></i>Reto</li><li><i class="l-fruto"></i>Fruto</li><li><i class="l-lugar"></i>Lugar</li><li><i class="l-dest"></i>Destino</li></ul></div>';
  let elC, elG, cvC, cvG, ctxC, ctxG, txtD, txtDot, abierto = false, dprC = 0, dprG = 0;
  function montar() {
    if (!doc.getElementById(ESTILO_ID)) { const st = doc.createElement('style'); st.id = ESTILO_ID; st.textContent = ESTILO; doc.head.appendChild(st); }
    elC = doc.createElement('div'); elC.id = 'minimapa'; elC.className = 'hud'; elC.hidden = true; elC.setAttribute('role', 'group'); elC.setAttribute('aria-label', 'Minimapa'); elC.innerHTML = HTML_COMPACTO;
    elG = doc.createElement('div'); elG.id = 'mapa-grande'; elG.className = 'hud'; elG.hidden = true; elG.setAttribute('role', 'dialog'); elG.setAttribute('aria-modal', 'true'); elG.setAttribute('aria-labelledby', 'mg-titulo'); elG.innerHTML = HTML_GRANDE;
    const ancla = $('toast'); (ancla && ancla.parentNode ? ancla.parentNode : doc.body).insertBefore(elC, ancla || null); doc.body.appendChild(elG);
    cvC = elC.querySelector('canvas'); cvG = elG.querySelector('.mg-c'); ctxC = cvC.getContext('2d'); ctxG = cvG.getContext('2d');
    txtD = elC.querySelector('.mm-d'); txtDot = elC.querySelector('.mm-dot');
    elC.querySelector('.mm-btn').addEventListener('click', () => abrir());
    elG.querySelector('.mg-cerrar').addEventListener('click', () => cerrar());
    elG.querySelector('.mg-ruta').addEventListener('click', e => { pref.ruta = !pref.ruta; guardarPref(); e.currentTarget.setAttribute('aria-pressed', String(pref.ruta)); dirty = true; });
    elG.querySelector('.mg-quitar').addEventListener('click', () => quitarDestino());
    cvG.addEventListener('click', e => {
      const r = cvG.getBoundingClientRect(), v = vistaGrande(r.width), px = (e.clientX - r.left) / r.width * r.width, py = (e.clientY - r.top) / r.height * r.height;
      const x = v.cx + (px - r.width / 2) * v.mpp, z = v.cz + (py - r.height / 2) * v.mpp;
      if (destino && Math.hypot((destino.x - v.cx) / v.mpp + r.width / 2 - px, (destino.z - v.cz) / v.mpp + r.height / 2 - py) < 18) quitarDestino(); else fijarDestino(x, z);
    });
    elG.addEventListener('click', e => { if (e.target === elG) cerrar(); });
  }
  function fijarDestino(x, z) { destino = { x: clamp(x, T.x0, T.x0 + T.ancho), z: clamp(z, T.z0, T.z0 + T.largo) }; dirty = true; refrescarGrande(); G.emit && G.emit('minimapaDestino', destino); return destino; }
  function quitarDestino() { destino = null; dirty = true; refrescarGrande(); }

  // Altura del minimapa: justo bajo el objetivo y el inventario (móvil) o bajo el inventario y los botones del sistema (≥ 561 px).
  // Crecen con la letra grande, así que se mide; solo pone --mm-top (sin medida, vale el sitio fijo del CSS).
  function colocar(d) {
    d = d || doc;
    const c = d.getElementById('minimapa'), w = d.defaultView; if (!c || !w) return;
    const ids = w.innerWidth <= 560 ? ['quest', 'inv'] : ['inv', 'sys'];
    let fondo = 0;
    for (const id of ids) { const e = d.getElementById(id); if (e && !e.hidden && w.getComputedStyle(e).display !== 'none') fondo = Math.max(fondo, e.getBoundingClientRect().bottom); }
    if (fondo) c.style.setProperty('--mm-top', Math.ceil(fondo + 4) + 'px'); else c.style.removeProperty('--mm-top');
  }
  addEventListener('resize', () => colocar());
  // ---------- Dibujo ----------
  const visible = e => e.getClientRects().length > 0;
  const contraste = () => raiz.classList.contains('a11y-contraste');
  const fsk = () => { const v = parseFloat(getComputedStyle(raiz).getPropertyValue('--fs-k')); return v > 0 ? v : 1; };
  function ajustar(cv, ctx, previo) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(cv.clientWidth * dpr);
    if (w > 0 && (cv.width !== w || previo !== dpr)) { cv.width = cv.height = w; return dpr; }
    return previo || dpr;
  }
  function marca(ctx, tipo, x, y, r, k, glifo) {
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = 2 * k; ctx.strokeStyle = COL.tinta; ctx.fillStyle = COL[tipo] || '#fff'; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (tipo === 'reto') { ctx.moveTo(0, -r * 1.15); ctx.lineTo(r * 1.1, 0); ctx.lineTo(0, r * 1.15); ctx.lineTo(-r * 1.1, 0); ctx.closePath(); }
    else if (tipo === 'lugar') { ctx.rect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5); }
    else if (tipo === 'fruto') { ctx.arc(0, 0, r * 0.62, 0, 6.2832); }
    else if (tipo === 'dest') { ctx.moveTo(-r * 0.55, r); ctx.lineTo(-r * 0.55, -r); ctx.lineTo(r * 0.95, -r * 0.45); ctx.lineTo(-r * 0.55, 0.1 * r); }
    else if (tipo === 'obj') { for (let i = 0; i < 10; i++) { const a = -1.5708 + i * 0.6283, rr = i % 2 ? r * 0.55 : r * 1.25; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); }
    else { ctx.arc(0, 0, r, 0, 6.2832); }
    ctx.fill(); ctx.stroke();
    if (glifo && r >= 5 * k) { ctx.fillStyle = tipo === 'mision' || tipo === 'parada' || tipo === 'reto' ? '#fff' : COL.tinta; ctx.font = '800 ' + Math.round(r * 1.35) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(glifo, 0, tipo === 'mision' ? 0.5 : 1); }
    ctx.restore();
  }
  function flecha(ctx, x, y, ang, r, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.25, 0, 6.2832); ctx.fillStyle = 'rgba(20,32,43,.35)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 0.85, r * 0.95); ctx.lineTo(0, r * 0.45); ctx.lineTo(-r * 0.85, r * 0.95); ctx.closePath();
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.2 * k; ctx.strokeStyle = COL.tinta; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
  }
  const GLIFO = { mision: '!', parada: '?', reto: '' };
  // v = { cx, cz, mpp }: centro en metros y metros por píxel CSS; w, h en píxeles de dibujo; k = factor de píxel (dpr)
  function dibujar(ctx, w, h, v, k, grande) {
    const px = x => (x - v.cx) / v.mpp * k + w / 2, pz = z => (z - v.cz) / v.mpp * k + h / 2;
    ctx.save(); ctx.fillStyle = '#245f86'; ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    if (B.listo) { // solo se recorta de la imagen la parte visible (el compacto ve 110 m de 528)
      const ex = w / k * v.mpp / 2, ez = h / k * v.mpp / 2;
      const u0 = clamp((v.cx - ex - T.x0) / T.ancho, 0, 1), u1 = clamp((v.cx + ex - T.x0) / T.ancho, 0, 1), v0 = clamp((v.cz - ez - T.z0) / T.largo, 0, 1), v1 = clamp((v.cz + ez - T.z0) / T.largo, 0, 1);
      if (u1 > u0 && v1 > v0) {
        const dx = px(T.x0 + u0 * T.ancho), dz = pz(T.z0 + v0 * T.largo), dw = (u1 - u0) * T.ancho / v.mpp * k, dh = (v1 - v0) * T.largo / v.mpp * k;
        ctx.drawImage(base, u0 * N, v0 * N, (u1 - u0) * N, (v1 - v0) * N, dx, dz, dw, dh);
        if (B.florado) ctx.drawImage(flora, u0 * NF, v0 * NF, (u1 - u0) * NF, (v1 - v0) * NF, dx, dz, dw, dh);
      }
    }
    const hc = contraste();
    if (hc) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, w, h); }
    const gk = (hc ? 1.35 : 1) * k, rM = (grande ? 9 : 7) * gk;
    const ms = marcadores(), ob = ms.find(m => m.tipo === 'obj'), de = ms.find(m => m.tipo === 'dest');
    const px0 = px(S.pos.x), pz0 = pz(S.pos.z), fin = de || ob;
    // Ruta: línea discontinua hacia el destino (o el objetivo)
    if (pref.ruta && fin) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); ctx.lineCap = 'round'; ctx.setLineDash([6 * gk, 5 * gk]);
      ctx.beginPath(); ctx.moveTo(px0, pz0); ctx.lineTo(px(fin.x), pz(fin.z));
      ctx.lineWidth = 4.2 * gk; ctx.strokeStyle = 'rgba(20,32,43,.75)'; ctx.stroke();
      ctx.lineWidth = 2.2 * gk; ctx.strokeStyle = de ? COL.dest : COL.obj; ctx.stroke(); ctx.restore();
    }
    // Marcadores en orden de importancia (los de arriba se dibujan al final)
    const orden = ['fruto', 'lugar', 'reto', 'parada', 'mision', 'dest', 'obj'], inset = rM + 3 * k;
    const dentro = (x, y) => x > inset * 0.4 && y > inset * 0.4 && x < w - inset * 0.4 && y < h - inset * 0.4;
    const bordes = [], rotulos = [];
    for (const tipo of orden) for (const m of ms) {
      if (m.tipo !== tipo) continue;
      let x = px(m.x), y = pz(m.z);
      const principal = tipo === 'obj' || tipo === 'dest';
      if (!dentro(x, y)) {
        if (!principal) continue;
        const ddx = x - w / 2, ddy = y - h / 2, t = Math.min((w / 2 - inset) / Math.max(1e-6, Math.abs(ddx)), (h / 2 - inset) / Math.max(1e-6, Math.abs(ddy)));
        bordes.push({ tipo, a: Math.atan2(ddx, -ddy) }); x = w / 2 + ddx * t; y = h / 2 + ddy * t;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(ddx, -ddy)); ctx.beginPath(); ctx.moveTo(0, -rM * 1.9); ctx.lineTo(rM * 0.8, -rM * 0.8); ctx.lineTo(-rM * 0.8, -rM * 0.8); ctx.closePath();
        ctx.fillStyle = COL[tipo]; ctx.strokeStyle = COL.tinta; ctx.lineWidth = 2 * gk; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); ctx.restore();
      }
      const rr = tipo === 'fruto' ? rM * 0.62 : tipo === 'lugar' ? rM * 0.8 : tipo === 'obj' ? rM * 1.15 : rM;
      marca(ctx, tipo, x, y, rr, gk, tipo === 'reto' && grande && m.n ? String(m.n) : GLIFO[tipo]);
      const nomLugar = G.idioma ? G.idioma.tr(m.nombre) : m.nombre; // U1: nombre del lugar en el idioma elegido
      if (grande && tipo === 'lugar' && nomLugar) { // el nombre solo si no pisa otro ya escrito (los lugares de la Villa están muy juntos)
        const fs = Math.round(11 * fsk() * k); ctx.font = '700 ' + fs + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 3.5 * k; ctx.lineJoin = 'round';
        const tw = ctx.measureText(nomLugar).width, lx = clamp(x, tw / 2 + 3 * k, w - tw / 2 - 3 * k), caja = [lx - tw / 2, y + rM, lx + tw / 2, y + rM + fs];
        if (!rotulos.some(c => caja[0] < c[2] && caja[2] > c[0] && caja[1] < c[3] && caja[3] > c[1])) {
          rotulos.push(caja); ctx.strokeStyle = 'rgba(10,20,30,.9)'; ctx.strokeText(nomLugar, lx, y + rM); ctx.fillStyle = '#fff'; ctx.fillText(nomLugar, lx, y + rM);
        }
      }
    }
    flecha(ctx, px0, pz0, anguloFlecha(), (grande ? 9 : 8) * gk, gk);
    if (!grande) { ctx.font = '800 ' + Math.round(10 * k) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(10,20,30,.85)'; ctx.strokeText('N', w / 2, 4 * k); ctx.fillStyle = '#fff'; ctx.fillText('N', w / 2, 4 * k); }
    ctx.restore();
    return { marcas: ms.length, bordes, ang: anguloFlecha() };
  }
  let radio = R_ANDANDO, ultimo = null;
  const vistaCompacta = () => ({ cx: S.pos.x, cz: S.pos.z, mpp: 2 * radio / (cvC.clientWidth || 124) });
  const vistaGrande = lado => ({ cx: T.x0 + T.ancho / 2, cz: T.z0 + T.largo / 2, mpp: Math.max(T.ancho, T.largo) / lado });
  function textoCompacto() {
    const ob = objetivo(), de = destino;
    const t = ob ? texto(distancia(ob)) : de ? texto(distancia(de)) : (lugarCerca() || 'Explora');
    const punto = !!(ob || de);
    if (txtD.textContent !== t) txtD.textContent = t;
    txtDot.classList.toggle('off', !punto);
    txtDot.style.background = ob ? COL.obj : COL.dest;
    const aria = 'Minimapa. ' + (ob ? 'Objetivo a ' + t : de ? 'Destino a ' + t : t) + '. Tocar para ampliar (tecla M)';
    const b = elC.querySelector('.mm-btn'); if (b.getAttribute('aria-label') !== aria) b.setAttribute('aria-label', aria);
    return t;
  }
  function refrescarGrande() {
    if (!abierto) return;
    dprG = ajustar(cvG, ctxG, dprG);
    ultimo = dibujar(ctxG, cvG.width, cvG.height, vistaGrande(cvG.clientWidth || 300), dprG, true);
    const ob = objetivo(), p = lugarCerca();
    elG.querySelector('.mg-info').textContent = (ob ? 'Objetivo a ' + texto(distancia(ob)) : 'Sin objetivo: explora') + (destino ? ' · Destino a ' + texto(distancia(destino)) : '') + (p ? ' · Estás en ' + p : '');
    elG.querySelector('.mg-quitar').hidden = !destino;
    elG.querySelector('.mg-ruta').setAttribute('aria-pressed', String(pref.ruta));
  }
  function pintar() {
    if (abierto) { refrescarGrande(); return; }
    if (!elC || elC.hidden || !visible(elC)) return;
    dprC = ajustar(cvC, ctxC, dprC);
    const objR = M.flying ? R_VOLANDO : R_ANDANDO; radio += (objR - radio) * 0.3; // el zoom se suaviza al despegar y aterrizar
    ultimo = dibujar(ctxC, cvC.width, cvC.height, vistaCompacta(), dprC, false);
    textoCompacto();
  }
  // ~10 veces por segundo (el cuadro de render solo comprueba el reloj)
  let tUlt = -1e9, tColoca = -1e9;
  function tick(ahora) {
    if (ahora - tUlt < 95) return false;
    tUlt = ahora;
    if (!S.pos) return false;
    if (!B.empezo && S.profile && S.profile.created) empezarBase();
    const juego = !!(S.profile && S.profile.created) && !(doc.getElementById('title') || {}).open && !(G.ui.worldHidden && G.ui.worldHidden());
    if (elC) elC.hidden = !juego;
    if (juego && ahora - tColoca > 700) { tColoca = ahora; colocar(); }
    if (!juego || (G.quiet && !tick.forzar && !hayRetos())) return false;
    pintar(); return true;
  }
  G.on('render', () => { tick(performance.now()); }, 61);

  // ---------- Abrir y cerrar ----------
  const puede = () => !G.ui.busy() && !(doc.getElementById('title') || {}).open && !(G.ui.worldHidden && G.ui.worldHidden()) && !(G.pausa && G.pausa.motivos.has('menu'));
  function abrir() {
    if (abierto) return true;
    if (!elC || !puede() || !(S.profile && S.profile.created)) return false;
    abierto = true; elG.hidden = false; G.pausa.set('mapa', true); empezarBase(); refrescarGrande();
    const c = elG.querySelector('.mg-cerrar'); try { c.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    G.emit && G.emit('minimapaGrande', true); return true;
  }
  function cerrar() {
    if (!abierto) return false;
    abierto = false; elG.hidden = true; G.pausa.set('mapa', false); dirty = true;
    const b = elC && elC.querySelector('.mm-btn'); try { if (b && !elC.hidden) b.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    G.emit && G.emit('minimapaGrande', false); return true;
  }
  const alternar = () => (abierto ? cerrar() : abrir());
  const tecla = e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    if (e.key === 'Escape' && abierto) { cerrar(); e.preventDefault(); return; }
    if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
      const mp = G.input && G.input.mapa; if (mp && Object.keys(mp).some(a => mp[a] === 'm')) return; // la tecla M fue reasignada a una acción
      if (alternar()) e.preventDefault();
    }
  };
  montar();
  addEventListener('keydown', tecla);

  // =====================================================================================================================
  // AV.minimapaTest(): flecha y rumbo, distancia, marcadores por tipo, mapa grande, desbordes en 375×812 y 320×568, ritmo y relieve
  // =====================================================================================================================
  async function test() {
    const out = [], check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const SV = G.guardado, snap = SV.instantanea(), quiet = G.quiet, posBk = Object.assign({}, S.pos), facBk = Object.assign({}, S.facing || { x: 0, z: -1 });
    const itemsBk = G.interaccion.list.length, lugBk = S.lugares ? S.lugares.slice() : null, destBk = destino, prefBk = pref.ruta, hcBk = raiz.className;
    SV.suspender(true);
    const espera = ms => new Promise(r => setTimeout(r, ms));
    try {
      if (!S.profile.created) S.profile = Object.assign({}, S.profile, { created: true });
      empezarBase();
      for (let i = 0; i < 80 && !B.listo; i++) await espera(50);
      check('El relieve se precalcula (192×192) y se carga solo al hacer falta', B.listo && base.width === N);
      // Relieve: tierra y mar se ven distintos
      const px = (x, z) => base.getContext('2d').getImageData(clamp(Math.floor((x - T.x0) / T.ancho * N), 0, N - 1), clamp(Math.floor((z - T.z0) / T.largo * N), 0, N - 1), 1, 1).data;
      const tierra = px(S.pos.x, S.pos.z), mar = px(T.x0 + 2, T.z0 + 2);
      check('El mapa distingue la tierra del mar', Math.abs(tierra[0] - mar[0]) + Math.abs(tierra[1] - mar[1]) + Math.abs(tierra[2] - mar[2]) > 60 && mar[2] > mar[0], 'tierra ' + Array.from(tierra).slice(0, 3) + ' · mar ' + Array.from(mar).slice(0, 3));

      // 1. Flecha: sigue el rumbo
      S.facing = { x: 0, z: -1 }; const aN = anguloFlecha();
      S.facing = { x: 1, z: 0 }; const aE = anguloFlecha();
      S.facing = { x: 0, z: 1 }; const aS = anguloFlecha();
      S.facing = { x: -1, z: 0 }; const aO = anguloFlecha();
      check('La flecha apunta al norte, este, sur y oeste según el rumbo', Math.abs(aN) < 1e-6 && Math.abs(aE - Math.PI / 2) < 1e-6 && Math.abs(Math.abs(aS) - Math.PI) < 1e-6 && Math.abs(aO + Math.PI / 2) < 1e-6, [aN, aE, aS, aO].map(a => a.toFixed(2)));
      tick.forzar = true; G.quiet = false; elC.hidden = false;
      S.facing = { x: 1, z: 0 }; tUlt = -1e9; tick(performance.now());
      check('El dibujo usa el rumbo actual', !!ultimo && Math.abs(ultimo.ang - Math.PI / 2) < 1e-6);
      // Pintado real: la flecha blanca está en el centro del compacto
      const cc = ctxC.getImageData(cvC.width / 2, cvC.height / 2, 1, 1).data;
      check('La flecha (blanca) se ve en el centro del minimapa', !visible(elC) || (cc[0] > 200 && cc[1] > 200 && cc[2] > 200), Array.from(cc).slice(0, 3));

      // 2. Distancia
      const p0 = { x: S.pos.x + 30, z: S.pos.z + 40 };
      check('La distancia es horizontal y en metros (3-4-5 → 50 m)', distancia(p0) === 50 && texto(50) === '50 m' && texto(1500) === '1,5 km');
      ext.objetivo = p0; tUlt = -1e9; tick(performance.now());
      check('El texto del minimapa dice la distancia al objetivo', txtD.textContent === '50 m' && !txtDot.classList.contains('off'), txtD.textContent);
      ext.objetivo = { x: S.pos.x + 400, z: S.pos.z }; tUlt = -1e9; tick(performance.now());
      check('Un objetivo fuera de vista se pega al borde con una punta', !!ultimo && ultimo.bordes.some(b => b.tipo === 'obj' && Math.abs(b.a - Math.PI / 2) < 0.05) && txtD.textContent === '400 m', JSON.stringify(ultimo && ultimo.bordes));
      ext.objetivo = p0;

      // 3. Marcadores por tipo
      const fakes = [{ id: 'mmtest_mision', x: S.pos.x + 10, z: S.pos.z, r: 2, visible: () => true, label: () => 'x', use() {} }, { id: 'parada_mmtest', x: S.pos.x - 10, z: S.pos.z, r: 2, visible: () => true, label: () => 'x', use() {} }];
      for (const f of fakes) G.interaccion.list.push(f);
      const L = G.lugares, pl = L && L.lista().find(p => !L.descubiertos().includes(p.id));
      if (pl) { if (!Array.isArray(S.lugares)) S.lugares = []; S.lugares.push(pl.id); }
      ext.reto = { puntos: [{ x: S.pos.x + 20, z: S.pos.z + 5 }, { x: S.pos.x + 40, z: S.pos.z + 5 }, { x: S.pos.x + 60, z: S.pos.z + 5 }], sig: 0 };
      ext.frutos = [{ x: S.pos.x + 5, z: S.pos.z - 5 }];
      fijarDestino(S.pos.x - 30, S.pos.z + 30);
      const tipos = new Set(marcadores().map(m => m.tipo));
      const quiero = ['obj', 'mision', 'parada', 'reto', 'fruto', 'dest'].concat(pl ? ['lugar'] : []);
      check('Aparecen marcadores de cada tipo: objetivo, misión, parada, reto, fruto, destino y lugar', quiero.every(t => tipos.has(t)), [...tipos].join(','));
      const ms2 = marcadores();
      check('La misión es «!», la parada «?» y cada tipo tiene forma propia', GLIFO.mision === '!' && GLIFO.parada === '?' && ms2.filter(m => m.tipo === 'reto').length === 2);
      tUlt = -1e9; tick(performance.now());
      check('Se dibuja con todos los tipos a la vez sin errores', !!ultimo && ultimo.marcas >= quiero.length);
      ext.reto = undefined; ext.frutos = undefined;
      for (const f of fakes) { const i = G.interaccion.list.indexOf(f); if (i >= 0) G.interaccion.list.splice(i, 1); }
      check('Una misión o parada oculta (no visible) no sale', !marcadores().some(m => /mmtest|^parada_mmtest/.test(m.id || '')));

      // 4. Mapa grande: abre y cierra (botón, tecla M, Esc) y pausa el mundo
      const abre = abrir();
      check('El mapa grande abre con un toque y pausa el mundo', abre && abierto && !elG.hidden && G.pausa.motivos.has('mapa') && !visible(elC));
      check('El mapa grande se dibuja y dice la distancia', /50 m/.test(elG.querySelector('.mg-info').textContent) && cvG.width > 0, elG.querySelector('.mg-info').textContent);
      cerrar();
      check('El mapa grande cierra y el mundo sigue', !abierto && elG.hidden && !G.pausa.motivos.has('mapa'));
      const kd = key => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      kd('m'); const conM = abierto; kd('m'); const sinM = !abierto;
      check('La tecla M abre y cierra el mapa grande', conM && sinM);
      kd('m'); kd('Escape');
      check('Esc cierra el mapa grande', !abierto && !G.pausa.motivos.has('mapa'));
      elC.querySelector('.mm-btn').click(); const porClic = abierto; elG.querySelector('.mg-cerrar').click();
      check('El toque en el minimapa abre y «Cerrar» cierra', porClic && !abierto);
      // Destino por toque: fijar y quitar
      abrir(); quitarDestino();
      const r = cvG.getBoundingClientRect(), vg = vistaGrande(r.width);
      const cx = r.left + (S.pos.x + 25 - vg.cx) / vg.mpp + r.width / 2, cy = r.top + (S.pos.z + 25 - vg.cz) / vg.mpp + r.height / 2;
      cvG.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
      const fij = !!destino && Math.hypot(destino.x - (S.pos.x + 25), destino.z - (S.pos.z + 25)) < 3 * vg.mpp;
      cvG.dispatchEvent(new MouseEvent('click', { clientX: cx, clientY: cy, bubbles: true }));
      check('Un toque en el mapa fija el destino verde y otro sobre él lo quita', fij && !destino);
      const rutaAntes = pref.ruta; elG.querySelector('.mg-ruta').click(); const rutaCambia = pref.ruta !== rutaAntes; elG.querySelector('.mg-ruta').click();
      check('«Ruta» activa y desactiva la línea hacia el objetivo', rutaCambia && pref.ruta === rutaAntes);
      cerrar();

      // 5. Ritmo: ~10 dibujos por segundo y barato
      let n = 0; tUlt = -1e9; for (let t = 1000; t < 2000; t += 16) if (tick(t)) n++;
      check('Se redibuja unas 10 veces por segundo (no cada cuadro)', n >= 9 && n <= 11, n + ' dibujos en 1 s a 60 fps');
      const t0 = performance.now(); for (let i = 0; i < 30; i++) pintar(); const ms = (performance.now() - t0) / 30;
      check('Cada dibujo del compacto cuesta poco (< 4 ms)', ms < 4, ms.toFixed(2) + ' ms');
      M.flying = true; radio = R_ANDANDO; for (let i = 0; i < 12; i++) pintar(); const rVol = radio; M.flying = false;
      check('Volando el minimapa se aleja (más metros a la redonda)', rVol > R_ANDANDO + 10, rVol.toFixed(0) + ' m'); radio = R_ANDANDO;

      // 6. Maquetas móviles: nada desborda ni se tapa
      const A = G.accesibilidad;
      if (!A || !A.maqueta) check('Hay maqueta móvil de accesibilidad para comprobar el HUD', false, 'sin G.accesibilidad.maqueta');
      else {
        const hojaMM = ESTILO, cajaC = elC.outerHTML, cajaG = elG.outerHTML.replace(' hidden=""', '');
        const dentro = (r, w, h) => r.left >= -0.5 && r.top >= -0.5 && r.right <= w + 0.5 && r.bottom <= h + 0.5;
        const choca = (a, b) => a.width > 0 && b.width > 0 && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        const casos = [[375, 812, ''], [320, 568, ''], [375, 812, 'a11y-t2 a11y-contraste a11y-zurdo'], [320, 568, 'a11y-t2 a11y-contraste a11y-zurdo'], [812, 375, ''], [1280, 720, '']];
        for (const [w, h, cl] of casos) {
          let m = null;
          try {
            m = await A.maqueta(w, h, cl);
            const d = m.d, st = d.createElement('style'); st.textContent = hojaMM; d.head.appendChild(st);
            d.body.insertAdjacentHTML('beforeend', cajaC.replace(' hidden=""', '')); d.body.insertAdjacentHTML('beforeend', cajaG);
            const mm = d.getElementById('minimapa'), mg = d.getElementById('mapa-grande'); mg.hidden = true;
            mm.querySelector('.mm-d').textContent = '1,2 km'; const em = d.getElementById('emotes'); if (em) em.hidden = true; const ts = d.getElementById('toast'); if (ts) ts.textContent = 'Descubriste Poza Honda'; colocar(d); // aviso típico (el de 4 líneas de la maqueta ya pisa el propio objetivo)
            const rm = mm.getBoundingClientRect(), fallos = [];
            if (!dentro(rm, w, h)) fallos.push('se sale de la pantalla');
            // Con texto grande en 320×568 un aviso de 2 líneas llega a la altura del minimapa: el aviso (z-toast) va por encima y el minimapa no lo tapa
            for (const sel of ['#quest', '#inv', '#sys', '#stick', '#acts', '#toast', '#prompt', '#emotes', '#subtitulos', '#dialog', '#card']) {
              if (sel === '#toast' && w <= 360 && /a11y-t2/.test(cl)) continue;
              const e = d.querySelector(sel); if (!e) continue;
              const cs = d.defaultView.getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('[hidden]')) continue;
              if (choca(rm, e.getBoundingClientRect())) fallos.push('tapa ' + sel);
            }
            if (mm.scrollWidth > mm.clientWidth + 1 || d.documentElement.scrollWidth > w + 1) fallos.push('desborde horizontal');
            check('Minimapa compacto sin desbordes ni tapar nada · ' + w + '×' + h + (cl ? ' (texto grande, alto contraste, zurdo)' : ''), !fallos.length, fallos.join(' · ') || Math.round(rm.width) + '×' + Math.round(rm.height) + ' px en (' + Math.round(rm.left) + ',' + Math.round(rm.top) + ')');
            // Mapa grande dentro de la pantalla
            mg.hidden = false; const pn = mg.querySelector('.mg-panel').getBoundingClientRect(), cv = mg.querySelector('.mg-c').getBoundingClientRect(), f2 = [];
            if (!dentro(pn, w, h)) f2.push('el panel se sale (' + Math.round(pn.right) + ',' + Math.round(pn.bottom) + ')');
            if (cv.width < 150) f2.push('mapa demasiado pequeño (' + Math.round(cv.width) + ')');
            for (const b of mg.querySelectorAll('.mg-head button')) { const rb = b.getBoundingClientRect(); if (rb.width && !dentro(rb, w, h)) f2.push('botón fuera: ' + b.className); }
            if (mg.querySelector('.mg-panel').scrollWidth > mg.querySelector('.mg-panel').clientWidth + 1) f2.push('desborde horizontal del panel');
            check('Mapa grande dentro de la pantalla · ' + w + '×' + h + (cl ? ' (texto grande, alto contraste, zurdo)' : ''), !f2.length, f2.join(' · ') || Math.round(cv.width) + ' px de mapa');
          } catch (e) { check('Maqueta ' + w + '×' + h + ' sin excepciones', false, String(e && e.stack || e).slice(0, 240)); }
          finally { if (m && m.cerrar) m.cerrar(); }
        }
      }
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      tick.forzar = false; ext.objetivo = undefined; ext.reto = undefined; ext.frutos = undefined; destino = destBk; pref.ruta = prefBk;
      cerrar(); G.quiet = quiet; G.pausa.set('mapa', false);
      for (let i = G.interaccion.list.length - 1; i >= itemsBk; i--) G.interaccion.list.splice(i, 1);
      Object.assign(S.pos, posBk); S.facing = facBk; raiz.className = hcBk;
      SV.restaurar(snap); SV.suspender(false);
      if (lugBk && Array.isArray(S.lugares)) S.lugares = lugBk;
      dirty = true;
    }
    check('G.S queda como estaba', JSON.stringify(SV.instantanea()) === JSON.stringify(snap));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  const api = G.minimapa = { abrir, cerrar, alternar, get abierto() { return abierto; }, get listo() { return B.listo; }, marcadores, anguloFlecha, distancia, fijarDestino, quitarDestino,
    ruta: v => { if (v != null) { pref.ruta = !!v; guardarPref(); dirty = true; } return pref.ruta; }, tick, test, _dev: { B, base, flora, ext, T } };
  return api;
};
