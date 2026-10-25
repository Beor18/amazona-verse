/* Amazona Verse · captura de video del pitch (herramienta del editor de video; NO es código del juego)
   Se inyecta desde fuera en index.html (tools/video/capturar.html lo hace solo, o a mano:
   const s = document.createElement('script'); s.src = 'tools/video/captura.js'; document.head.append(s)).
   No edita ningún archivo del juego: todo son parches en memoria de esta pestaña, y se deshacen con AVCAP.desinstalar().

   1. Tiempo virtual y determinista: performance.now y requestAnimationFrame quedan bajo control de la captura.
      Cada cuadro avanza el reloj exactamente 1/30 s y ejecuta los callbacks de rAF pendientes (el bucle del motor,
      la máquina de escribir de la UI, el taller del creador...). Math.random se siembra con el id de cada toma.
      El guardado en localStorage se desactiva en esta pestaña (no pisa la partida de nadie).
   2. Cámaras cinematográficas (se cuelgan de G.camara.follow/fov/draw): juego, seguimiento, orbita, primerPlano,
      dron (spline por puntos), fija. Parámetros numéricos aceptan [desde, hasta] (interpolado con curva suave).
   3. Guion de acciones de Vittata por tiempos: ruta, caminar, parar, saltar, planear, volar, subir, bajar, aterrizar,
      bucear, emerger, impulso, gesto, ropa, mirar, teleport, accion, clic, js.
   4. Salida: JPEG (calidad 0,92) por cuadro, POST /__save?name=pitch-<ver>-<toma>-<00000>.jpg (tests/out/), y un
      manifiesto pitch-<ver>-manifest.json al final. tools/video/mover_cuadros.py los mueve a _trabajo_claude/pitch/frames/.
      Render a 1920x1080 por defecto con supermuestreo 2x (el lienzo WebGL a 3840x2160 y reducción de alta calidad).
   5. HUD: sin HUD el cuadro es solo el lienzo 3D (y se apagan el haz y la flecha guía). Con "hud": true se rasteriza el
      DOM de la interfaz (SVG foreignObject con las fuentes Fredoka/Atkinson incrustadas) encima del cuadro.
   6. Gráficos: AVCAP.titulo() y AVCAP.logo() generan PNG transparentes con la tipografía del juego para el montaje.

   Formato del guion de captura (tools/video/guiones/*.json): ver docs/pitch/VIDEO.md. */
(function () {
  'use strict';
  if (window.AVCAP && window.AVCAP.desinstalar) window.AVCAP.desinstalar();

  const VERSION = 3;
  const CAP = { version: VERSION, status: { fase: 'cargada' }, log: [] };
  window.AVCAP = CAP;
  const say = (...a) => { const m = a.join(' '); CAP.log.push(m); if (CAP.log.length > 400) CAP.log.shift(); console.log('[AVCAP]', m); };

  // ───────────────────────── utilidades ─────────────────────────
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const DEG = Math.PI / 180;
  const ease = {
    lineal: k => k,
    suave: k => k * k * (3 - 2 * k),
    entrada: k => k * k * k,
    salida: k => 1 - Math.pow(1 - k, 3),
    inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  };
  // Valor que puede ser número o [desde, hasta] (o [a, b, c...] por tramos iguales)
  function val(v, p, def) {
    if (v == null) return def;
    if (!Array.isArray(v)) return v;
    if (v.length === 1) return v[0];
    const seg = (v.length - 1) * clamp(p, 0, 1), i = Math.min(v.length - 2, Math.floor(seg));
    return lerp(v[i], v[i + 1], seg - i);
  }
  function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // Ruido suave determinista para "cámara en mano" (suma de senos)
  function ruido(t, s) { return Math.sin(t * 1.31 + s) * 0.5 + Math.sin(t * 2.17 + s * 1.7) * 0.3 + Math.sin(t * 3.73 + s * 2.3) * 0.2; }
  const pad = (n, w) => String(n).padStart(w, '0');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ───────────────────────── 1. tiempo virtual ─────────────────────────
  const realNow = performance.now.bind(performance);
  const realRAF = window.requestAnimationFrame.bind(window);
  const realCAF = window.cancelAnimationFrame.bind(window);
  const realRandom = Math.random;
  const reloj = { virtual: false, t: 0, offset: 0, cola: new Map(), id: 1e7 };
  function ahora() { return reloj.virtual ? reloj.t : realNow() + reloj.offset; }
  function rafVirtual(cb) { const id = ++reloj.id; reloj.cola.set(id, cb); return id; }
  function cafVirtual(id) { if (!reloj.cola.delete(id)) realCAF(id); }
  let parcheadoTiempo = false;
  function parchearTiempo() {
    if (parcheadoTiempo) return;
    parcheadoTiempo = true;
    performance.now = ahora;
    // En tiempo real también se entrega ahora() y no la marca del navegador: tras una captura el reloj virtual puede ir por
    // delante del real, y el bucle del motor calcularía un dt negativo (la física diverge)
    window.requestAnimationFrame = cb => (reloj.virtual ? rafVirtual(cb) : realRAF(() => cb(ahora())));
    window.cancelAnimationFrame = cafVirtual;
  }
  // Pasa a tiempo virtual: los rAF ya pedidos al navegador migran a la cola en su próximo disparo
  async function tiempoVirtual() {
    parchearTiempo();
    if (reloj.virtual) return;
    reloj.t = realNow() + reloj.offset;
    reloj.virtual = true;
    // Dos cuadros reales: los callbacks pendientes se ejecutan una vez más y vuelven a pedir rAF (ya virtual)
    await new Promise(r => realRAF(() => realRAF(r)));
  }
  function tiempoReal() {
    if (!reloj.virtual) return;
    reloj.virtual = false;
    reloj.offset = Math.max(0, reloj.t - realNow()); // el reloj nunca retrocede
    const cola = reloj.cola; reloj.cola = new Map();
    for (const cb of cola.values()) realRAF(cb);
  }
  // Un cuadro: avanza el reloj y ejecuta todo lo que pidió rAF (bucle del motor incluido)
  function pasoReloj(dtMs) {
    reloj.t += dtMs;
    const cola = reloj.cola; reloj.cola = new Map();
    for (const cb of cola.values()) { try { cb(reloj.t); } catch (e) { CAP.status.error = String(e && e.stack || e); console.error(e); } }
  }

  // ───────────────────────── instalación ─────────────────────────
  let G = null, R = null, S = null, orig = null, instalado = false;
  const opt = { ancho: 1920, alto: 1080, ss: 2, calidad: 0.92, prefijo: 'pitch', version: 'v0', enVuelo: 6 };
  const salida = document.createElement('canvas');
  const sx = salida.getContext('2d', { alpha: false });

  function esperarJuego(timeout) {
    const t0 = realNow();
    return new Promise((res, rej) => {
      (function mira() {
        const A = window.AV && window.AV.G && window.AV.G.actores;
        if (A && (A.player3D || A.failed3D || realNow() - t0 > 20000)) return res();
        if (realNow() - t0 > (timeout || 60000)) return rej(new Error('el juego no arrancó (sin AV o sin Vittata 3D)'));
        setTimeout(mira, 150);
      })();
    });
  }

  async function instalar(o) {
    Object.assign(opt, o || {});
    await esperarJuego();
    G = window.AV.G; R = G.renderer; S = G.S;
    salida.width = opt.ancho; salida.height = opt.alto;
    sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = 'high';
    if (instalado) { tamano(); return CAP; }
    instalado = true;
    const r = R.renderer, cam = G.camara;
    orig = {
      follow: cam.follow, fov: cam.fov, draw: cam.draw, setPixelRatio: r.setPixelRatio, setSize: r.setSize,
      setItem: Storage.prototype.setItem, removeItem: Storage.prototype.removeItem, muted: G.audio.vol.muted,
    };
    // Guardado desactivado en esta pestaña: la partida compartida de localStorage no se toca
    const KEY = G.guardado.KEY;
    Storage.prototype.setItem = function (k, v) { if (String(k).startsWith(KEY) || String(k).startsWith('amazonaverse')) return; return orig.setItem.call(this, k, v); };
    Storage.prototype.removeItem = function (k) { if (String(k).startsWith(KEY) || String(k).startsWith('amazonaverse')) return; return orig.removeItem.call(this, k); };
    // Sin sonido mientras se captura (la música y los efectos los pone el ingeniero de sonido)
    G.audio.vol.muted = true; try { G.audio.apply(); } catch (e) { /* sin audio */ }
    // Resolución fija: nada de DPR dinámico ni de resize de la ventana durante la captura
    r.setPixelRatio = function () {};
    r.setSize = function () {};
    tamano();
    // Cámara: la toma activa decide; sin toma, la cámara del juego
    cam.follow = dt => { if (rig) rig.update(dt); else orig.follow(dt); };
    cam.fov = dt => { if (rig) { if (Math.abs(R.camera.fov - rig.fov) > 1e-3) { R.camera.fov = rig.fov; R.camera.updateProjectionMatrix(); } } else orig.fov(dt); };
    cam.draw = dt => {
      if (sinDibujo) return;
      tamano();
      if (rig && rig.tipo !== 'juego') {
        R.camera.position.copy(rig.pos); R.camera.up.set(0, 1, 0); R.camera.lookAt(rig.look);
        if (rig.roll) R.camera.rotateZ(rig.roll);
        r.render(R.scene, R.camera);
      } else orig.draw(dt);
    };
    // Expresión forzada por la toma (el motor la recalcula en cada cuadro; se fija justo antes de que el modelo la aplique)
    const p3 = G.actores.player3D;
    if (p3 && !p3.__avcap) {
      const upd = p3.update;
      p3.update = function (dt) { if (forzado.expresion) this.expression = forzado.expresion; return upd.call(this, dt); };
      p3.__avcap = upd;
    }
    // Sin HUD: fuera el haz y la flecha guía (son interfaz dentro del mundo)
    G.on('render', () => { if (toma && !toma.hud && G.fx.guide) G.fx.guide(null, 0); }, 61);
    // El vuelo guiado corrige la posición después de la física de cada cuadro
    G.on('update', dt => { if (toma) pasoVuelo(dt); }, 999);
    say('instalado v' + VERSION, opt.ancho + 'x' + opt.alto, 'ss', opt.ss);
    CAP.status = { fase: 'lista' };
    return CAP;
  }
  function tamano() {
    const r = R.renderer, w = opt.ancho * opt.ss, h = opt.alto * opt.ss;
    if (r.getPixelRatio() !== 1) orig.setPixelRatio.call(r, 1);
    const c = R.canvas;
    if (c.width !== w || c.height !== h) orig.setSize.call(r, w, h, false);
    const asp = opt.ancho / opt.alto;
    if (Math.abs(R.camera.aspect - asp) > 1e-4) { R.camera.aspect = asp; R.camera.updateProjectionMatrix(); }
  }
  function desinstalar() {
    tiempoReal();
    if (parcheadoTiempo) { performance.now = realNow; window.requestAnimationFrame = realRAF; window.cancelAnimationFrame = realCAF; parcheadoTiempo = false; }
    Math.random = realRandom;
    if (instalado && orig) {
      const r = R.renderer, cam = G.camara;
      cam.follow = orig.follow; cam.fov = orig.fov; cam.draw = orig.draw;
      r.setPixelRatio = orig.setPixelRatio; r.setSize = orig.setSize;
      Storage.prototype.setItem = orig.setItem; Storage.prototype.removeItem = orig.removeItem;
      G.audio.vol.muted = orig.muted; try { G.audio.apply(); } catch (e) { /* sin audio */ }
      const p3 = G.actores.player3D;
      if (p3 && p3.__avcap) { p3.update = p3.__avcap; delete p3.__avcap; if (p3.update === Object.getPrototypeOf(p3).update) delete p3.update; }
      R.resize();
      instalado = false;
    }
    rig = null; toma = null;
    CAP.status = { fase: 'desinstalada' };
  }

  // ───────────────────────── 2. cámaras ─────────────────────────
  let rig = null, toma = null, sinDibujo = false;
  const forzado = { expresion: null };
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const alturaSuelo = (x, z) => G.terreno.height(x, z);
  // Altura mínima de la cámara: sobre el suelo y, salvo bajoAgua, sobre la superficie del agua (la cámara bajo el plano
  // del agua solo ve azul)
  function noAtravesar(pos, def, margen) {
    const s = alturaSuelo(pos.x, pos.z) + margen;
    if (pos.y < s && !def.bajoSuelo) pos.y = s;
    if (!def.bajoAgua && G.agua && G.agua.levelAt) {
      const w = G.agua.levelAt(pos.x, pos.z);
      if (isFinite(w) && pos.y < w + 0.35) pos.y = w + 0.35;
    }
  }
  const rumbo = () => Math.atan2(S.facing.x, S.facing.z); // 0 = +z; el modelo mira hacia +z local
  // Punto del mundo: [x,y,z] | [x,z] (y = suelo + yDef) | { lugar|jugador|jugador0|xz, dx, dy, dz, suelo }
  function punto(p, ctx, yDef) {
    if (p == null) return null;
    if (Array.isArray(p)) {
      if (p.length === 2) return V3(p[0], alturaSuelo(p[0], p[1]) + (yDef || 0), p[1]);
      return ctx.sobreTerreno ? V3(p[0], alturaSuelo(p[0], p[2]) + p[1], p[2]) : V3(p[0], p[1], p[2]);
    }
    if (p === 'jugador') p = { jugador: true };
    if (typeof p === 'string') p = { poi: p };
    let bx, bz, by = null;
    if (p.poi || p.lugar) { const L = poi(p.poi || p.lugar); bx = L.x; bz = L.z; if (L.y != null && p.suelo === false) by = L.y; }
    else if (p.jugador0) { bx = ctx.p0.x; bz = ctx.p0.z; by = ctx.p0.y; }
    else if (p.jugador) { bx = S.pos.x; bz = S.pos.z; by = S.pos.y; }
    else if (p.xz) { bx = p.xz[0]; bz = p.xz[1]; }
    else throw new Error('punto no válido: ' + JSON.stringify(p));
    // Desplazamientos en el marco del rumbo del jugador (frente/lado) o del mundo (dx/dz)
    let x = bx + (p.dx || 0), z = bz + (p.dz || 0);
    if (p.frente || p.lado) {
      const h = p.jugador0 ? ctx.h0 : rumbo(), fx = Math.sin(h), fz = Math.cos(h);
      x += fx * (p.frente || 0) - fz * (p.lado || 0); z += fz * (p.frente || 0) + fx * (p.lado || 0);
    }
    const sueloY = p.suelo === false && by != null ? by : (by != null && !p.suelo ? by : alturaSuelo(x, z));
    return V3(x, sueloY + (p.dy != null ? p.dy : yDef || 0), z);
  }
  // POI por id: los del mapa (G.terreno.poi) o los lugares del pack; si el mundo activo no lo tiene, el respaldo del guion
  // (guion.respaldoPOI = { id: [x, z] | { x, z } | "otroId" }), así el mismo guion sirve antes y después del mapa nuevo
  let respaldoPOI = {};
  function poi(id) {
    const T = G.terreno;
    let q = T.poi ? T.poi(id) : null;
    if (!q && T.places && T.places[id]) q = T.places[id];
    if (!q && G.pack.mundo.lugares && G.pack.mundo.lugares[id]) q = G.pack.mundo.lugares[id];
    if (!q && G.actores.npc(id)) { const d = G.actores.npc(id).def; q = { x: d.x, z: d.z }; }
    if (!q && respaldoPOI[id] != null) { const r = respaldoPOI[id]; q = typeof r === 'string' ? poi(r) : Array.isArray(r) ? { x: r[0], z: r[r.length - 1] } : r; }
    if (!q) throw new Error('POI desconocido: ' + id);
    return { x: q.x, y: q.y, z: q.z };
  }
  function crearRig(def, dur) {
    def = Object.assign({ tipo: 'juego' }, def || {});
    const ctx = { sobreTerreno: !!def.sobreTerreno, p0: { x: S.pos.x, y: S.pos.y, z: S.pos.z }, h0: rumbo() };
    const r = { tipo: def.tipo, def, pos: V3(0, 0, 0), look: V3(0, 0, 0), fov: def.fov != null ? val(def.fov, 0) : 50, roll: 0, t: 0, primero: true };
    const curva = ease[def.curva || 'inOut'] || ease.inOut;
    const prog = () => curva(clamp(r.t / Math.max(1e-3, dur), 0, 1));
    const miraJugador = alto => V3(S.pos.x, S.pos.y + alto, S.pos.z);
    // Suavizado exponencial (tiempo característico en s)
    const sPos = V3(0, 0, 0), sLook = V3(0, 0, 0); let sRumbo = ctx.h0;
    function suavizar(pos, look, dt, tau, tauLook) {
      if (r.primero || !(tau > 0)) sPos.copy(pos); else sPos.lerp(pos, 1 - Math.exp(-dt / tau));
      if (r.primero || !(tauLook > 0)) sLook.copy(look); else sLook.lerp(look, 1 - Math.exp(-dt / tauLook));
      r.pos.copy(sPos); r.look.copy(sLook);
    }
    function pulso(p) {
      const a = val(def.pulso, p, 0);
      if (!a) return;
      const t = r.t, s = hash(toma ? toma.id : '') % 100;
      r.pos.x += ruido(t * 0.9, s) * a; r.pos.y += ruido(t * 0.8, s + 7) * a * 0.6; r.pos.z += ruido(t * 0.85, s + 13) * a;
      r.look.x += ruido(t * 0.7, s + 3) * a * 0.5; r.look.y += ruido(t * 0.6, s + 5) * a * 0.4;
    }
    let curvaDron = null, curvaMira = null;
    if (def.tipo === 'dron') {
      const pts = (def.puntos || []).map(p => punto(p, ctx, 0));
      if (pts.length < 2) throw new Error('dron: hacen falta 2 puntos o más');
      curvaDron = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      if (Array.isArray(def.mira) && def.mira.length && (Array.isArray(def.mira[0]) || typeof def.mira[0] === 'object')) {
        const mp = def.mira.map(p => punto(p, ctx, 0));
        curvaMira = mp.length > 1 ? new THREE.CatmullRomCurve3(mp, false, 'centripetal') : { getPointAt: () => mp[0] };
      }
    }
    r.update = function (dt) {
      const p = prog();
      r.fov = val(def.fov, p, r.fov);
      r.roll = val(def.roll, p, 0) * DEG;
      const tipo = def.tipo;
      if (tipo === 'juego') {
        if (r.primero && def.yaw != null) G.camara.yaw = def.yaw * DEG;
        if (def.giro) G.camara.yaw += def.giro * DEG * dt;
        orig.follow(dt);
        r.primero = false; return;
      }
      if (tipo === 'seguimiento') {
        // Detrás del jugador según su rumbo (suavizado) o con un rumbo fijo del mundo
        const hWant = def.rumbo != null ? val(def.rumbo, p) * DEG : rumbo() + val(def.giro, p, 0) * DEG;
        const dA = Math.atan2(Math.sin(hWant - sRumbo), Math.cos(hWant - sRumbo));
        sRumbo = r.primero ? hWant : sRumbo + dA * (1 - Math.exp(-dt / (def.suaveGiro || 0.6)));
        const fx = Math.sin(sRumbo), fz = Math.cos(sRumbo), dist = val(def.dist, p, 6), lado = val(def.lado, p, 0);
        const alto = val(def.alto, p, 2.2), mAlto = val(def.miraAlto, p, 1.1), adel = val(def.adelante, p, 1.5);
        const pos = V3(S.pos.x - fx * dist - fz * lado, S.pos.y + alto, S.pos.z - fz * dist + fx * lado);
        noAtravesar(pos, def, 0.6);
        const look = V3(S.pos.x + fx * adel, S.pos.y + mAlto, S.pos.z + fz * adel);
        suavizar(pos, look, dt, def.suave != null ? def.suave : 0.25, def.suaveMira != null ? def.suaveMira : 0.12);
      } else if (tipo === 'orbita' || tipo === 'primerPlano') {
        const cerca = tipo === 'primerPlano';
        const c = def.centro && def.centro !== 'jugador' ? punto(def.centro, ctx, 0) : V3(S.pos.x, S.pos.y, S.pos.z);
        // Ángulo: relativo al rumbo de Vittata (0 = de frente) en primer plano; absoluto (0 = +z) en órbita salvo relativo:true
        const base = cerca || def.relativo ? (def.rumboFijo ? ctx.h0 : rumbo()) : 0;
        const a = base + (val(def.ang, p, cerca ? 35 : 0) + (def.vel || 0) * r.t) * DEG;
        const rad = val(def.radio != null ? def.radio : def.dist, p, cerca ? 2.2 : 8), alto = val(def.alto, p, cerca ? 1.35 : 3);
        const pos = V3(c.x + Math.sin(a) * rad, c.y + alto, c.z + Math.cos(a) * rad);
        noAtravesar(pos, def, 0.4);
        const look = V3(c.x, c.y + val(def.miraAlto, p, cerca ? 1.25 : 1.1), c.z);
        if (def.miraLado) { look.x += Math.cos(a) * def.miraLado; look.z -= Math.sin(a) * def.miraLado; }
        suavizar(pos, look, dt, def.suave != null ? def.suave : cerca ? 0.15 : 0, def.suaveMira != null ? def.suaveMira : cerca ? 0.1 : 0);
      } else if (tipo === 'dron') {
        const pos = curvaDron.getPointAt(p);
        let look;
        if (curvaMira) look = curvaMira.getPointAt(p).clone();
        else if (def.mira === 'ruta') {
          const q = curvaDron.getPointAt(Math.min(1, p + 0.02)), d = q.clone().sub(pos);
          if (d.lengthSq() < 1e-6) d.copy(curvaDron.getTangentAt(Math.min(1, p)));
          look = pos.clone().add(d.normalize().multiplyScalar(10)); look.y -= val(def.picado, p, 2.5);
        } else if (def.mira && def.mira !== 'jugador') look = punto(def.mira, ctx, 0);
        else look = miraJugador(val(def.miraAlto, p, 1.1));
        noAtravesar(pos, def, def.margenSuelo != null ? def.margenSuelo : 1.0);
        suavizar(pos, look, dt, def.suave || 0, def.suaveMira != null ? def.suaveMira : 0.08);
      } else if (tipo === 'fija') {
        const pos = punto(def.pos, ctx, 1.6);
        const look = def.mira && def.mira !== 'jugador' ? punto(def.mira, ctx, 1) : miraJugador(val(def.miraAlto, p, 1.1));
        suavizar(pos, look, dt, 0, def.suaveMira != null ? def.suaveMira : 0.15);
      } else throw new Error('cámara desconocida: ' + tipo);
      pulso(p);
      r.primero = false;
    };
    return r;
  }

  // ───────────────────────── 3. guion de Vittata ─────────────────────────
  const ctrl = { dir: null, ruta: null, correr: false, salto: 0, bajar: 0, bucear: false, hacia: null };
  let pendientes = []; // promesas de acciones js (cargas de modelos, etc.): la toma espera a que terminen
  // Vuelo guiado (cinemático): Vittata recorre una spline con duración exacta; el motor la ve volando (alas, inclinación)
  let vuelo = null;
  function iniciarVuelo(a) {
    const ctx = { p0: { x: S.pos.x, y: S.pos.y, z: S.pos.z }, h0: rumbo(), sobreTerreno: false };
    const sobre = a.sobreSuelo != null ? a.sobreSuelo : 10;
    const pts = [];
    if (a.desdeAqui !== false) pts.push(V3(S.pos.x, S.pos.y, S.pos.z));
    for (const p of a.puntos || []) {
      if (Array.isArray(p) && p.length === 2) pts.push(V3(p[0], alturaSuelo(p[0], p[1]) + sobre, p[1]));
      else pts.push(punto(p, ctx, sobre));
    }
    if (pts.length < 2) throw new Error('vuelo: hacen falta 2 puntos');
    const curva = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    vuelo = { curva, dur: a.dur || 4, t: 0, ease: ease[a.curva || 'inOut'] || ease.inOut, largo: curva.getLength(), aterrizar: !!a.aterrizar, aleteo: a.aleteo != null ? a.aleteo : 1.2, prev: pts[0].clone() };
    G.fisica.MOVE.flying = true;
  }
  function pasoVuelo(dt) {
    if (!vuelo || !dt) return;
    const v = vuelo, M = G.fisica.MOVE;
    v.t += dt;
    const u = v.ease(clamp(v.t / v.dur, 0, 1)), p = v.curva.getPointAt(u);
    const vx = (p.x - v.prev.x) / dt, vy = (p.y - v.prev.y) / dt, vz = (p.z - v.prev.z) / dt;
    S.pos.x = p.x; S.pos.y = p.y; S.pos.z = p.z; v.prev.copy(p);
    const h = Math.hypot(vx, vz);
    if (h > 0.3) S.facing = { x: vx / h, z: vz / h };
    M.flying = true; M.vx = vx; M.vz = vz; M.speed = h; S.vy = vy;
    G.input.jumpHeld = vy > v.aleteo; // sube aleteando; en llano o bajando, planea
    if (v.t >= v.dur) { vuelo = null; G.input.jumpHeld = false; if (v.aterrizar) M.flying = false; }
  }
  function resetCtrl() {
    vuelo = null;
    Object.assign(ctrl, { dir: null, ruta: null, correr: false, salto: 0, bajar: 0, bucear: false, hacia: null });
    const k = G.input.keys; k.clear(); G.input.stick.x = 0; G.input.stick.y = 0; G.input.jumpHeld = false;
  }
  function rumboAVector(grados) { const h = grados * DEG; return { x: Math.sin(h), z: Math.cos(h) }; }
  // Convierte una dirección del mundo en el joystick, según el giro de la cámara del juego (fisica.step)
  function joystick(dx, dz, mag) {
    const yaw = G.camara.yaw, c = Math.cos(yaw), s = Math.sin(yaw), l = Math.hypot(dx, dz) || 1;
    const mx = dx / l, mz = dz / l;
    G.input.stick.x = (c * mx - s * mz) * mag; G.input.stick.y = (s * mx + c * mz) * mag;
  }
  function aplicarControl(dt) {
    const keys = G.input.keys;
    let dir = null, mag = 1;
    if (ctrl.ruta && ctrl.ruta.length) {
      const [x, z] = ctrl.ruta[0], dx = x - S.pos.x, dz = z - S.pos.z, d = Math.hypot(dx, dz);
      if (d < (ctrl.radio || 0.9)) { ctrl.ruta.shift(); if (!ctrl.ruta.length) { ctrl.ruta = null; if (ctrl.alLlegar) ctrl.alLlegar(); } }
      else dir = { x: dx, z: dz };
      if (dir && ctrl.frenar && ctrl.ruta && ctrl.ruta.length === 1) mag = clamp(d / ctrl.frenar, 0.36, 1);
    } else if (ctrl.dir) dir = ctrl.dir;
    if (dir) joystick(dir.x, dir.z, mag * (ctrl.mag || 1)); else { G.input.stick.x = 0; G.input.stick.y = 0; }
    if (ctrl.correr) keys.add('shift'); else keys.delete('shift');
    // Salto mantenido (planear / subir en vuelo) y C (bajar en vuelo / bucear)
    if (ctrl.salto > 0) { ctrl.salto -= dt; G.input.jumpHeld = true; if (ctrl.salto <= 0) G.input.jumpHeld = false; }
    const c = ctrl.bucear || ctrl.bajar > 0;
    if (ctrl.bajar > 0) ctrl.bajar -= dt;
    if (c) keys.add('c'); else keys.delete('c');
  }
  // Ropa: { slot: { id, color, style } | "clave del pack" | null }
  let ropasGuion = {};
  function ponerRopa(ropa, reemplazar) {
    if (typeof ropa === 'string') { if (!ropasGuion[ropa]) throw new Error('conjunto de ropa desconocido: ' + ropa); ropa = ropasGuion[ropa]; reemplazar = true; }
    if (reemplazar) for (const k of Object.keys(S.wear)) delete S.wear[k];
    for (const [slot, v] of Object.entries(ropa || {})) {
      if (v == null) { delete S.wear[slot]; continue; }
      if (typeof v === 'string') {
        const r = (G.pack.ropa || []).find(x => x.clave === v);
        if (!r) throw new Error('ropa desconocida: ' + v);
        S.wear[r.viste.slot] = { id: r.viste.id, color: r.viste.color, style: r.viste.style };
      } else S.wear[slot] = Object.assign({}, v);
    }
    G.actores.applyWear();
  }
  function ejecutar(a) {
    const F = G.fisica, M = F.MOVE;
    switch (a.a) {
      case 'ruta': ctrl.ruta = (a.puntos || []).map(p => (Array.isArray(p) ? p.slice() : (q => [q.x, q.z])(punto(p, { p0: S.pos, h0: rumbo() }, 0)))); ctrl.dir = null; ctrl.correr = !!a.correr; ctrl.radio = a.radio || 0.9; ctrl.frenar = a.frenar || 0; ctrl.mag = a.mag || 1; break;
      case 'caminar': ctrl.ruta = null; ctrl.dir = a.hacia ? { x: a.hacia[0] - S.pos.x, z: a.hacia[1] - S.pos.z } : rumboAVector(a.rumbo || 0); ctrl.correr = !!a.correr; ctrl.mag = a.mag || 1; break;
      case 'correr': ctrl.correr = a.si !== false; break;
      case 'parar': ctrl.ruta = null; ctrl.dir = null; ctrl.correr = false; break;
      case 'saltar': F.tryJump(); ctrl.salto = Math.max(ctrl.salto, a.mantener || 0.12); break;
      case 'planear': ctrl.salto = a.dur || 1; break;
      case 'volar': if (!M.flying) F.startFlying(); ctrl.salto = Math.max(ctrl.salto, a.subir || 0); break;
      case 'subir': ctrl.salto = a.dur || 1; break;
      case 'bajar': ctrl.bajar = a.dur || 1; break;
      case 'aterrizar': ctrl.bajar = a.dur || 3; break;
      case 'soltarVuelo': M.flying = false; vuelo = null; break;
      case 'vuelo': iniciarVuelo(a); break;
      case 'bucear': ctrl.bucear = true; break;
      case 'emerger': ctrl.bucear = false; break;
      case 'impulso': F.tryDash(); break;
      case 'gesto': G.actores.playEmote(a.nombre); break;
      case 'ropa':
        ponerRopa(a.ropa, a.reemplazar);
        if (a.chispas !== false) G.fx.burst(S.pos.x, S.pos.y + 1.0, S.pos.z, a.fx || 'feathers', a.n || 14);
        break;
      case 'mirar': {
        const v = Array.isArray(a.hacia) ? { x: a.hacia[0] - S.pos.x, z: a.hacia[1] - S.pos.z } : rumboAVector(a.rumbo || 0);
        const l = Math.hypot(v.x, v.z) || 1; S.facing = { x: v.x / l, z: v.z / l }; break;
      }
      case 'edu': eduHasta(a.hasta); break;
      case 'expresion': forzado.expresion = a.nombre || null; break;
      case 'mirarCamara': { const c = R.camera.position, dx = c.x - S.pos.x, dz = c.z - S.pos.z, l = Math.hypot(dx, dz) || 1; S.facing = { x: dx / l, z: dz / l }; break; }
      case 'teleport': G.pruebas.teleport(a.pos[0], a.pos[a.pos.length - 1]); if (a.pos.length === 3) S.pos.y = a.pos[1]; break;
      case 'accion': G.interaccion.action(); break;
      case 'clic': {
        const els = [...document.querySelectorAll(a.sel)].filter(el => !a.texto || el.textContent.includes(a.texto));
        if (els[0]) els[0].click(); else say('clic: no existe', a.sel, a.texto || ''); break;
      }
      case 'js': { const r = (new Function('G', 'AV', 'CAP', 'S', a.js))(G, window.AV, CAP, S); if (r && r.then) pendientes.push(r); break; }
      default: throw new Error('acción desconocida: ' + a.a);
    }
  }

  // Misión educativa "La ruta de la gota" hasta el paso pid (p1..p8), como PITCH.eduHasta del comité
  function eduHasta(pid) {
    if (!G.c.edu || !S.edu) return;
    if (S.step < 3) G.misiones.advanceTo(3);
    const orden = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'], n = orden.indexOf(pid);
    orden.forEach((k, i) => (S.edu.hecho[k] = i < n));
    if (n > 1) ['suelo', 'sotobosque', 'dosel', 'emergente'].forEach(c => (S.edu.perchas[c] = S.edu.perchas[c] || true));
    if (n > 3) { S.edu.vistos.A = S.edu.vistos.B = true; S.evaluated = S.evaluated || {}; S.evaluated.A = S.evaluated.B = true; }
    if (!S.edu.pred1 && n > 0) S.edu.pred1 = 'lluvia_montana';
    G.emit('apply');
  }

  // Estado inicial de la partida (una vez por guion) y de cada toma
  function estadoBase(b) {
    b = b || {};
    const fresh = G.guardado.freshState();
    const next = Object.assign(fresh, {
      profile: { created: b.aprendiz !== false, name: b.nombre || 'Nube Azul', look: b.lookAprendiz || null },
      step: b.paso != null ? b.paso : fresh.step,
    }, b.estado || {});
    // Cerrar lo que tape el mundo: portada, creador, diálogos, tarjetas, avisos
    const t = document.getElementById('title'); if (t && t.open) t.close();
    G.guardado.replace(next);
    G.emit('apply');
    try { G.creador.close(); } catch (e) { /* ya cerrado */ }
    cerrarUI();
    if (b.js) (new Function('G', 'AV', 'CAP', 'S', b.js))(G, window.AV, CAP, S);
  }
  function cerrarUI() {
    // Ventanas que tapan el mundo o se quedan abiertas de una toma a otra
    try { if (!document.getElementById('creator').hidden) G.creador.close(); } catch (e) { /* sin creador */ }
    try { if (G.aula && G.aula.maestroAbierto && G.aula.maestroAbierto()) G.aula.cerrarMaestro(); } catch (e) { /* sin aula */ }
    try { if (G.criadero && G.criadero.abierto && G.criadero.abierto()) G.criadero.cerrar(); } catch (e) { /* sin criadero */ }
    try { if (G.aula && G.aula.setAjuste && G.aula.aj && G.aula.aj.idioma !== 'es') G.aula.setAjuste('idioma', 'es'); } catch (e) { /* sin aula */ }
    const t = document.getElementById('title'); if (t && t.open) t.close();
    try { while (G.dialogo.open()) { if (G.dialogo.close) G.dialogo.close(); else { document.getElementById('dialog').hidden = true; break; } } } catch (e) { /* sin diálogo */ }
    if (G.ui.cardOpen) G.ui.hideCard();
    G.ui.hideToast();
    const pause = document.getElementById('pause'); try { if (pause && pause.matches(':popover-open')) pause.hidePopover(); } catch (e) { /* sin popover */ }
    const em = document.getElementById('emotes'); if (em) em.hidden = true;
  }
  function estadoToma(e) {
    e = e || {};
    const F = G.fisica, M = F.MOVE;
    resetCtrl();
    if (!e.mantenerUI) cerrarUI();
    G.actores.stopEmote();
    Object.assign(M, { vx: 0, vz: 0, dashT: 0, dashCd: 0, flying: false, swimming: false, wet: false, shake: false, land: 0, speed: 0 });
    S.vy = 0;
    // Pose limpia del modelo (inclinaciones y aplastón acumulados) y aprendiz junto a Vittata
    const p3 = G.actores.player3D;
    if (p3) { const b = p3.root.userData.s || p3.root.scale.x; p3.root.rotation.set(0, 0, 0); p3.root.scale.setScalar(b); }
    if (e.ropa !== undefined) ponerRopa(e.ropa || {}, true);
    if (p3 && e.ropa !== undefined) p3.update(0);
    if (e.en) { const q = punto(e.en, { p0: S.pos, h0: rumbo() }, 0); e = Object.assign({}, e, { pos: [q.x, q.z] }); }
    if (e.pos) {
      const x = e.pos[0], z = e.pos[e.pos.length - 1];
      S.pos.x = x; S.pos.z = z; S.pos.y = F.suelo(x, z, e.pos.length === 3 ? e.pos[1] : 999);
      if (e.pos.length === 3) S.pos.y = Math.max(S.pos.y, e.pos[1]);
    }
    if (e.rumbo != null) S.facing = rumboAVector(e.rumbo);
    if (e.mirarA) { const m = Array.isArray(e.mirarA) ? { x: e.mirarA[0], z: e.mirarA[1] } : punto(e.mirarA, { p0: S.pos, h0: rumbo() }, 0); const dx = m.x - S.pos.x, dz = m.z - S.pos.z, l = Math.hypot(dx, dz) || 1; S.facing = { x: dx / l, z: dz / l }; }
    if (e.volando) { M.flying = true; S.pos.y = Math.max(S.pos.y, F.suelo(S.pos.x, S.pos.z, S.pos.y) + (e.altura || 6)); }
    if (e.camYaw != null) G.camara.yaw = e.camYaw * DEG;
    if (e.edu) eduHasta(e.edu);
    forzado.expresion = e.expresion || null;
    if (e.aprendiz != null && !!S.profile.created !== !!e.aprendiz) { S.profile.created = !!e.aprendiz; G.actores.refreshCompanion(); }
    if (e.js) { const r = (new Function('G', 'AV', 'CAP', 'S', e.js))(G, window.AV, CAP, S); if (r && r.then) pendientes.push(r); }
    const cp = G.actores.companionPos;
    cp.x = S.pos.x - S.facing.x * 1.8 + S.facing.z * 1.1; cp.z = S.pos.z - S.facing.z * 1.8 - S.facing.x * 1.1;
    G.camara.place(true); // coloca la cámara del juego, el aprendiz y el modelo 3D al instante
  }

  // ───────────────────────── 4. salida ─────────────────────────
  const enVuelo = new Set();
  let errSubida = 0, bytes = 0;
  async function subir(nombre, blob) {
    while (enVuelo.size >= opt.enVuelo) await Promise.race(enVuelo);
    const p = (async () => {
      for (let intento = 0; intento < 4; intento++) {
        try {
          const r = await fetch('/__save?name=' + encodeURIComponent(nombre), { method: 'POST', body: blob });
          if (r.ok) { bytes += blob.size; return; }
          throw new Error('HTTP ' + r.status);
        } catch (e) { if (intento === 3) { errSubida++; say('fallo al subir', nombre, e.message); } else await sleep(300 * (intento + 1)); }
      }
    })();
    enVuelo.add(p); p.finally(() => enVuelo.delete(p));
  }
  async function vaciar() { while (enVuelo.size) await Promise.race(enVuelo); }
  // Codificación síncrona: toBlob depende de los periodos ociosos de Chrome y, con el reloj virtual (sin cuadros reales)
  // o con la pestaña oculta, tarda segundos por imagen; toDataURL tarda ~20 ms a 1080p
  function blobDe(canvas, tipo, q) {
    const url = canvas.toDataURL(tipo, q), b64 = url.slice(url.indexOf(',') + 1), bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return Promise.resolve(new Blob([u8], { type: tipo }));
  }

  // ───────────────────────── 5. HUD por DOM (SVG foreignObject) ─────────────────────────
  const hudCache = { css: null, fuentes: null, img: new Map(), ultima: null, sucio: true, obs: null };
  async function aDataURL(url) {
    if (!url || url.startsWith('data:')) return url;
    const abs = new URL(url, location.href).href;
    if (hudCache.img.has(abs)) return hudCache.img.get(abs);
    try {
      const b = await (await fetch(abs)).blob();
      const d = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
      hudCache.img.set(abs, d); return d;
    } catch (e) { hudCache.img.set(abs, ''); return ''; }
  }
  // @font-face de Google Fonts con los woff2 incrustados (solo latin y latin-ext: el español cabe ahí)
  async function fuentesCSS() {
    if (hudCache.fuentes != null) return hudCache.fuentes;
    let out = '';
    for (const link of document.querySelectorAll('link[rel=stylesheet][href*="fonts.googleapis"]')) {
      try {
        const css = await (await fetch(link.href)).text();
        const bloques = css.split('/*').slice(1).map(b => '/*' + b);
        for (const b of bloques) {
          if (!/^\/\* (latin|latin-ext) \*\//.test(b)) continue;
          let r = b; const urls = [...b.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]);
          for (const u of urls) r = r.replace(u, await aDataURL(u));
          out += r + '\n';
        }
      } catch (e) { say('fuentes: no se pudieron incrustar', e.message); }
    }
    hudCache.fuentes = out;
    return out;
  }
  async function hojaCSS() {
    if (hudCache.css != null) return hudCache.css;
    let css = '';
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; } // la de Google Fonts va aparte
      for (const r of rules) css += r.cssText + '\n';
    }
    // url() relativas → data URL
    const urls = [...new Set([...css.matchAll(/url\("?((?!data:)[^")]+)"?\)/g)].map(m => m[1]))];
    for (const u of urls) css = css.split(u).join(await aDataURL(u));
    hudCache.css = (await fuentesCSS()) + css +
      '\n*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' +
      '\nhtml,body{background:transparent!important;margin:0;overflow:hidden}\n#game{display:none!important}\n';
    return hudCache.css;
  }
  function observarDOM() {
    if (hudCache.obs) return;
    hudCache.obs = new MutationObserver(() => { hudCache.sucio = true; });
    hudCache.obs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
  }
  // Rasteriza la interfaz (sin el lienzo del mundo) a una imagen del tamaño de la salida
  async function rasterHUD(lienzos) {
    observarDOM();
    // takeRecords: los cambios del DOM de este mismo cuadro aún no llegaron al callback (es una microtarea)
    if (hudCache.obs.takeRecords().length) hudCache.sucio = true;
    if (!hudCache.sucio && hudCache.ultima && !lienzos.size) return hudCache.ultima;
    const css = await hojaCSS();
    // La interfaz se maqueta como en una pantalla de W x H (por defecto 1280x720, como un Chromebook) y se dibuja
    // vectorialmente a la salida: a 1080p el HUD real queda diminuto y no se lee en un video
    const k = opt.hudEscala || 1.5, W = Math.round(opt.ancho / k), H = Math.round(opt.alto / k);
    const clon = document.documentElement.cloneNode(true);
    clon.querySelectorAll('script, link, head').forEach(n => n.remove());
    // Estado vivo que el clon no copia: valores de formularios y lienzos
    const vivos = document.querySelectorAll('input, select, textarea, canvas'), clones = clon.querySelectorAll('input, select, textarea, canvas');
    const pend = [];
    vivos.forEach((el, i) => {
      const c = clones[i]; if (!c) return;
      if (el.tagName === 'INPUT') c.setAttribute('value', el.value);
      else if (el.tagName === 'TEXTAREA') c.textContent = el.value;
      else if (el.tagName === 'SELECT') { [...c.options].forEach((o, k) => { if (el.options[k] && el.options[k].selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); }); }
      else if (el.tagName === 'CANVAS') {
        if (el.id === 'game') { c.remove(); return; }
        const d = lienzos.get(el);
        if (!d) return;
        const img = document.createElement('img'); img.src = d;
        img.setAttribute('style', c.getAttribute('style') || ''); img.className = c.className; img.id = c.id;
        const cs = getComputedStyle(el); img.style.width = cs.width; img.style.height = cs.height; img.style.display = cs.display === 'none' ? 'none' : 'block';
        img.style.objectFit = 'cover';
        c.replaceWith(img);
      }
    });
    for (const im of clon.querySelectorAll('img')) { const s = im.getAttribute('src'); if (s && !s.startsWith('data:')) pend.push(aDataURL(s).then(d => im.setAttribute('src', d))); }
    await Promise.all(pend);
    const style = document.createElement('style'); style.textContent = css;
    clon.insertBefore(style, clon.firstChild);
    clon.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    clon.style.width = W + 'px'; clon.style.height = H + 'px';
    const xhtml = new XMLSerializer().serializeToString(clon);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${opt.ancho}" height="${opt.alto}" viewBox="0 0 ${W} ${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${xhtml}</foreignObject></svg>`;
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    try { await img.decode(); } catch (e) { say('HUD: no se pudo rasterizar', e.message); return hudCache.ultima; }
    hudCache.ultima = img; hudCache.sucio = false;
    return img;
  }
  // Copia síncrona (misma tarea que el render) de los lienzos WebGL visibles de la interfaz
  function copiarLienzos() {
    const m = new Map();
    for (const c of document.querySelectorAll('canvas')) {
      if (c.id === 'game' || !c.width || !c.height || !c.offsetParent) continue;
      try { m.set(c, c.toDataURL('image/png')); } catch (e) { /* lienzo contaminado */ }
    }
    return m;
  }

  // ───────────────────────── captura de una toma ─────────────────────────
  // toma = { id, dur, preroll?, hud?, estado?, camara, acciones?: [{ t, a, ... }] }
  // op = { version, guardar: true, paso: 1 (cada cuántos cuadros guardar), tiempos: [t...] (solo esos), prefijo }
  async function capturarToma(tm, op) {
    op = Object.assign({ version: opt.version, guardar: true, paso: 1, prefijo: opt.prefijo }, Object.fromEntries(Object.entries(op || {}).filter(([, v]) => v != null)));
    if (!/^[\w]+$/.test(tm.id || '')) throw new Error('id de toma no válido (solo letras, números y _): ' + tm.id);
    const fps = 30, dtMs = 1000 / fps;
    // Margen [antes, después]: cuadros de más alrededor de la toma para fundidos y ajustes de corte. Los tiempos de las
    // acciones y de la cámara cuentan desde el punto de entrada (t = 0), así que el margen previo va en negativo.
    const mg = tm.margen || op.margen || [0, 0], m0 = mg[0] || 0, m1 = mg[1] || 0;
    const n = Math.round((tm.dur + m0 + m1) * fps), pre = Math.round((tm.preroll != null ? tm.preroll : 1) * fps);
    await tiempoVirtual();
    Math.random = mulberry(hash(tm.id));
    toma = tm;
    rig = null;
    estadoToma(tm.estado);
    rig = crearRig(tm.camara, tm.dur);
    // Lejanía de la cámara y niebla solo para esta toma (planos aéreos muy altos)
    const cam = R.camera, guardaFar = cam.far, guardaNiebla = R.scene.fog;
    if (tm.camara && tm.camara.far) { cam.far = tm.camara.far; cam.updateProjectionMatrix(); }
    if (tm.camara && tm.camara.niebla !== undefined && guardaNiebla) {
      const nb = tm.camara.niebla;
      R.scene.fog = nb === false ? null : Object.assign(guardaNiebla.clone(), Array.isArray(nb) ? { near: nb[0], far: nb[1] } : {});
    }
    const acciones = (tm.acciones || []).map(a => Object.assign({}, a)).sort((a, b) => (a.t || 0) - (b.t || 0));
    let ai = 0;
    const quiere = new Set((op.tiempos || []).map(t => clamp(Math.round((t + m0) * fps), 0, n - 1)));
    const t0 = realNow();
    let guardados = 0;
    const prof = CAP.prof = { paso: 0, copia: 0, jpeg: 0, subir: 0 };
    for (let i = -pre; i < n; i++) {
      if (CAP.abortado) throw new Error('abortado');
      const t = i / fps - m0;
      while (ai < acciones.length && (acciones[ai].t || 0) <= t + 1e-6) {
        try { ejecutar(acciones[ai]); } catch (e) { say('toma', tm.id, 'acción', JSON.stringify(acciones[ai]), e.message); }
        ai++;
      }
      // Una acción asíncrona (abrir el criadero, cargar un modelo) detiene el reloj virtual hasta que termina
      // (mientras espera se siguen sirviendo los rAF con dt = 0: hay cargas que esperan a que se dibuje un cuadro)
      if (pendientes.length) {
        let listo = false; const p = Promise.all(pendientes); pendientes = [];
        p.then(r => { listo = true; say('toma', tm.id, 'js async ok', JSON.stringify(r)); }, e => { listo = true; say('toma', tm.id, 'js async', e && e.message); });
        const t0w = realNow();
        while (!listo && realNow() - t0w < 60000) { sinDibujo = true; pasoReloj(0); sinDibujo = false; await sleep(30); }
      }
      aplicarControl(1 / fps);
      rig.t = t;
      const graba = op.guardar && i >= 0 && (quiere.size ? quiere.has(i) : i % op.paso === 0);
      sinDibujo = !graba && !(i >= -2); // los últimos cuadros del preroll sí se dibujan (sombras y texturas listas)
      let q = realNow();
      pasoReloj(dtMs);
      prof.paso += realNow() - q;
      sinDibujo = false;
      if (!graba) continue;
      // Copia inmediata del lienzo (preserveDrawingBuffer = false) con reducción de supermuestreo. Con "lienzo" la toma
      // sale de otro canvas de la página (p. ej. el WebGL propio del criadero), recortado para llenar 16:9
      q = realNow();
      const fuente = tm.lienzo ? document.querySelector(tm.lienzo) : R.canvas;
      if (tm.lienzo && i === 0) say('lienzo', tm.lienzo, fuente ? fuente.width + 'x' + fuente.height + (fuente.offsetParent ? ' visible' : ' oculto') : 'no existe',
        G.criadero && G.criadero.abierto ? 'criadero abierto=' + G.criadero.abierto() : '');
      if (tm.lienzo && fuente && fuente.width) {
        const k = Math.max(opt.ancho / fuente.width, opt.alto / fuente.height), sw = opt.ancho / k, sh = opt.alto / k;
        sx.fillStyle = '#000'; sx.fillRect(0, 0, opt.ancho, opt.alto);
        sx.drawImage(fuente, (fuente.width - sw) / 2, (fuente.height - sh) / 2, sw, sh, 0, 0, opt.ancho, opt.alto);
      } else sx.drawImage(R.canvas, 0, 0, opt.ancho, opt.alto);
      if (tm.hud) {
        const img = await rasterHUD(copiarLienzos());
        if (img) sx.drawImage(img, 0, 0, opt.ancho, opt.alto);
      }
      prof.copia += realNow() - q; q = realNow();
      const blob = await blobDe(salida, 'image/jpeg', opt.calidad);
      prof.jpeg += realNow() - q; q = realNow();
      const nombre = `${op.prefijo}-${op.version}-${tm.id}-${pad(i, 5)}.jpg`;
      await subir(nombre, blob);
      if (op.tiempos) miniatura(`${tm.id} · ${t.toFixed(1)} s`);
      prof.subir += realNow() - q;
      guardados++;
      const seg = (realNow() - t0) / 1000;
      Object.assign(CAP.status, { toma: tm.id, cuadro: i + 1, de: n, fpsCaptura: +(guardados / Math.max(seg, 1e-3)).toFixed(2), mb: +(bytes / 1e6).toFixed(1) });
    }
    await vaciar();
    if (cam.far !== guardaFar) { cam.far = guardaFar; cam.updateProjectionMatrix(); }
    R.scene.fog = guardaNiebla;
    toma = null; rig = null; resetCtrl(); forzado.expresion = null;
    Math.random = realRandom;
    return { id: tm.id, cuadros: n, guardados, dur: tm.dur, margen: [m0, m1], hud: !!tm.hud, segundos: +((realNow() - t0) / 1000).toFixed(1) };
  }

  // Vista previa: miniaturas de cada cuadro guardado y hojas de contacto al final (pitch-<ver>-hoja-<n>.jpg)
  let miniaturas = [];
  function miniatura(etiqueta) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 360;
    const x = c.getContext('2d'); x.drawImage(salida, 0, 0, 640, 360);
    x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, 0, 640, 28); x.fillStyle = '#fff'; x.font = '600 18px system-ui'; x.fillText(etiqueta, 8, 20);
    miniaturas.push(c);
  }
  async function hojasContacto(version, prefijo) {
    const porHoja = 12, cols = 3;
    for (let h = 0; h * porHoja < miniaturas.length; h++) {
      const lote = miniaturas.slice(h * porHoja, (h + 1) * porHoja), filas = Math.ceil(lote.length / cols);
      const c = document.createElement('canvas'); c.width = cols * 640; c.height = filas * 360;
      const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
      lote.forEach((m, k) => x.drawImage(m, (k % cols) * 640, Math.floor(k / cols) * 360));
      await subir(`${prefijo}-${version}-hoja-${window.AV.pack}_${pad(h + 1, 2)}.jpg`, await blobDe(c, 'image/jpeg', 0.82));
    }
    miniaturas = [];
  }

  // ───────────────────────── guion completo ─────────────────────────
  async function cargarGuion(g) {
    if (typeof g === 'string') { const r = await fetch(g + (g.includes('?') ? '&' : '?') + 't=' + Date.now()); if (!r.ok) throw new Error('no se pudo leer ' + g); g = await r.json(); }
    return g;
  }
  // op = { version, solo: [ids], tiempos (vista previa), paso, sinManifiesto }
  async function guion(g, op) {
    op = Object.assign({}, op || {});
    g = await cargarGuion(g);
    await instalar(Object.assign({}, g.salida || {}, op.salida || {}));
    respaldoPOI = g.respaldoPOI || {};
    ropasGuion = g.ropas || {};
    const version = op.version || g.version || opt.version;
    CAP.abortado = false; errSubida = 0; bytes = 0; miniaturas = [];
    CAP.status = { fase: 'capturando', version, inicio: new Date().toISOString() };
    estadoBase(g.base);
    // Medio segundo real para que carguen ropa y texturas nuevas del estado base
    await sleep(op.espera != null ? op.espera : 1500);
    const pack = window.AV.pack, packBase = g.pack || 'cap1';
    const tomas = (g.tomas || []).filter(t => (!op.solo || op.solo.includes(t.id)) && (t.pack || packBase) === pack && !t.sinCaptura);
    const hechas = [];
    const t0 = realNow();
    try {
      for (const tm of tomas) {
        CAP.status.toma = tm.id;
        if (tm.base) { estadoBase(Object.assign({}, g.base, tm.base)); await sleep(800); }
        if (tm.precarga) { (new Function('G', 'AV', 'CAP', 'S', tm.precarga))(G, window.AV, CAP, S); await sleep(800); }
        const r = await capturarToma(tm, { version, paso: op.paso || 1, margen: g.margen, tiempos: op.tiempos ? (Array.isArray(op.tiempos) ? op.tiempos : [0, tm.dur / 2, tm.dur - 0.05]) : null, prefijo: op.prefijo });
        hechas.push(r);
        say('toma', r.id, r.guardados + ' cuadros', r.segundos + ' s');
      }
    } catch (e) {
      CAP.status.error = String(e && e.message || e); say('ERROR', CAP.status.error);
    } finally {
      tiempoReal();
    }
    const manifiesto = {
      version, fps: 30, ancho: opt.ancho, alto: opt.alto, ss: opt.ss, calidad: opt.calidad,
      tomas: hechas, errores: errSubida, error: CAP.status.error || null, mb: +(bytes / 1e6).toFixed(1), log: CAP.log.slice(-60),
      segundos: +((realNow() - t0) / 1000).toFixed(1), fin: new Date().toISOString(), juego: { commit: g.commit || null, pack: window.AV.pack },
      previa: !!op.tiempos,
    };
    if (op.tiempos) await hojasContacto(version, op.prefijo || opt.prefijo);
    if (!op.sinManifiesto) await subir(`${op.prefijo || opt.prefijo}-${version}-manifest.json`, new Blob([JSON.stringify(manifiesto, null, 1)], { type: 'application/json' }));
    await vaciar();
    CAP.status = Object.assign({ fase: CAP.status.error ? 'error' : 'terminada' }, manifiesto);
    return manifiesto;
  }

  // ───────────────────────── 6. gráficos (títulos y logo) ─────────────────────────
  async function fuentesListas() { try { await document.fonts.load('700 96px Fredoka'); await document.fonts.load('600 48px Fredoka'); await document.fonts.load('700 40px "Atkinson Hyperlegible"'); } catch (e) { /* sin fuentes */ } }
  // Texto con contorno suave y sombra, al estilo de la interfaz del juego
  function texto(x, ctx, s, px, py, o) {
    x.save();
    x.font = o.font; x.textAlign = o.align || 'center'; x.textBaseline = 'alphabetic';
    if (o.letter) x.letterSpacing = o.letter + 'px';
    x.shadowColor = 'rgba(10,30,20,0.55)'; x.shadowBlur = o.blur != null ? o.blur : 18; x.shadowOffsetY = o.sombra != null ? o.sombra : 4;
    if (o.stroke) { x.lineJoin = 'round'; x.lineWidth = o.stroke; x.strokeStyle = o.strokeColor || 'rgba(20,40,30,0.85)'; x.strokeText(s, px, py); x.shadowColor = 'transparent'; }
    x.fillStyle = o.fill || '#fffaf0'; x.fillText(s, px, py);
    x.restore();
  }
  // t = { id, texto, sub, eyebrow, estilo: 'centro' | 'tercio' | 'cierre' } → PNG 1920x1080 con alfa
  async function titulo(t, op) {
    op = Object.assign({ version: opt.version, prefijo: opt.prefijo }, op || {});
    await fuentesListas();
    const W = 1920, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const estilo = t.estilo || 'centro';
    if (estilo === 'navegador') {
      // Marco de navegador neutro (sin dirección ni dominio): la toma se coloca en el hueco [160, 120, 1600, 900]
      const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#173a2c'); bg.addColorStop(1, '#0c2219');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      const X0 = 160, Y0 = 44, X1 = 1760, Y1 = 1020, CY = 120;
      x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 40; x.shadowOffsetY = 12;
      x.fillStyle = '#dfe5e8'; x.beginPath(); x.roundRect(X0, Y0, X1 - X0, Y1 - Y0, 14); x.fill(); x.restore();
      x.fillStyle = '#cfd7db'; x.beginPath(); x.roundRect(X0, Y0, X1 - X0, 40, [14, 14, 0, 0]); x.fill();
      [['#ef6a5e', 0], ['#f4bf4f', 1], ['#61c454', 2]].forEach(([c, i]) => { x.fillStyle = c; x.beginPath(); x.arc(X0 + 24 + i * 22, Y0 + 20, 7, 0, 7); x.fill(); });
      x.fillStyle = '#f4f6f7'; x.beginPath(); x.roundRect(X0 + 100, Y0 + 6, 300, 34, [10, 10, 0, 0]); x.fill();
      x.fillStyle = '#2f9e5b'; x.beginPath(); x.arc(X0 + 122, Y0 + 23, 8, 0, 7); x.fill();
      x.fillStyle = '#26323a'; x.font = '600 19px "Atkinson Hyperlegible", system-ui'; x.textBaseline = 'middle'; x.fillText('Amazona Verse', X0 + 140, Y0 + 24);
      x.fillStyle = '#f4f6f7'; x.fillRect(X0, Y0 + 40, X1 - X0, CY - Y0 - 40);
      x.strokeStyle = '#7b878e'; x.lineWidth = 3; x.lineCap = 'round';
      const ico = (cx, d) => { x.beginPath(); x.moveTo(cx + 5 * d, Y0 + 50 + 8); x.lineTo(cx - 3 * d, Y0 + 58 + 8); x.lineTo(cx + 5 * d, Y0 + 66 + 8); x.stroke(); };
      ico(X0 + 30, 1); ico(X0 + 64, -1);
      x.beginPath(); x.arc(X0 + 104, Y0 + 66, 8, 0.6, 5.9); x.stroke();
      x.fillStyle = '#e4e9ec'; x.beginPath(); x.roundRect(X0 + 140, Y0 + 48, X1 - X0 - 200, 36, 18); x.fill();
      x.clearRect(160, 120, 1600, 900);
      const nombre = `${op.prefijo}-${op.version}-gfx-${t.id}.png`;
      await subir(nombre, await blobDe(c, 'image/png')); await vaciar();
      return nombre;
    }
    if (estilo === 'logo' || estilo === 'logoSub') {
      // El logo del juego como título (y debajo una línea, p. ej. "Hecho en Puerto Rico")
      const L = await logoCanvas(t.ancho || 1100), y0 = estilo === 'logoSub' ? H * 0.40 : H / 2;
      x.drawImage(L, (W - L.width) / 2, y0 - L.height / 2);
      if (t.sub) texto(x, null, t.sub, W / 2, y0 + L.height / 2 + 70, { font: '600 54px Fredoka', fill: '#fffaf0', stroke: 9 });
      const nombre = `${op.prefijo}-${op.version}-gfx-${t.id}.png`;
      await subir(nombre, await blobDe(c, 'image/png')); await vaciar();
      return nombre;
    }
    const ajustar = (s, font, max) => { x.font = font; return x.measureText(s).width > max; };
    if (estilo === 'chip') {
      // Para tomas con HUD: píldora arriba al centro, entre el panel de misión y el inventario (no tapa la interfaz)
      let size = 44; while (ajustar(t.texto, `700 ${size}px Fredoka`, 760) && size > 28) size -= 2;
      x.font = `700 ${size}px Fredoka`;
      const w = Math.min(820, x.measureText(t.texto).width + 72), h = size + 34, X = (W - w) / 2, Y = 40;
      x.save(); x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 18; x.shadowOffsetY = 4;
      x.fillStyle = 'rgba(14,38,28,0.88)'; x.beginPath(); x.roundRect(X, Y, w, h, h / 2); x.fill(); x.restore();
      x.strokeStyle = '#ffcb3d'; x.lineWidth = 3; x.beginPath(); x.roundRect(X + 1.5, Y + 1.5, w - 3, h - 3, h / 2); x.stroke();
      texto(x, null, t.texto, W / 2, Y + h / 2 + size * 0.36, { font: `700 ${size}px Fredoka`, blur: 0, sombra: 0 });
    } else if (estilo === 'tercio') {
      // Rótulo inferior izquierdo: barra dorada, antetítulo y título
      const X = 140, Y = H - 170;
      let size = 76; while (ajustar(t.texto, `700 ${size}px Fredoka`, 1300) && size > 40) size -= 2;
      const grd = x.createLinearGradient(0, Y - 140, 0, Y + 60); grd.addColorStop(0, 'rgba(8,28,20,0)'); grd.addColorStop(1, 'rgba(8,28,20,0)');
      x.fillStyle = '#ffcb3d'; x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 12;
      x.beginPath(); x.roundRect ? x.roundRect(X - 34, Y - size - (t.eyebrow ? 44 : 4), 10, size + (t.eyebrow ? 44 : 4) + (t.sub ? 54 : 14), 5) : x.rect(X - 34, Y - size - 44, 10, size + 100); x.fill();
      x.shadowColor = 'transparent';
      if (t.eyebrow) texto(x, null, t.eyebrow.toUpperCase(), X, Y - size - 12, { font: '700 30px "Atkinson Hyperlegible"', align: 'left', fill: '#ffe08a', letter: 4, blur: 10, sombra: 2 });
      texto(x, null, t.texto, X, Y, { font: `700 ${size}px Fredoka`, align: 'left', stroke: 10 });
      if (t.sub) texto(x, null, t.sub, X, Y + 54, { font: '600 38px Fredoka', align: 'left', fill: '#eaf6ef', blur: 12, sombra: 3, stroke: 6 });
    } else {
      const cy = estilo === 'cierre' ? H * 0.74 : H * 0.5;
      let size = estilo === 'cierre' ? 72 : 110; while (ajustar(t.texto, `700 ${size}px Fredoka`, 1600) && size > 48) size -= 2;
      if (t.eyebrow) texto(x, null, t.eyebrow.toUpperCase(), W / 2, cy - size * 0.95, { font: '700 34px "Atkinson Hyperlegible"', fill: '#ffe08a', letter: 6, blur: 12, sombra: 2 });
      texto(x, null, t.texto, W / 2, cy + size * 0.32, { font: `700 ${size}px Fredoka`, stroke: 12 });
      if (t.sub) texto(x, null, t.sub, W / 2, cy + size * 0.32 + 72, { font: '600 44px Fredoka', fill: '#eaf6ef', stroke: 7 });
    }
    const blob = await blobDe(c, 'image/png');
    const nombre = `${op.prefijo}-${op.version}-gfx-${t.id}.png`;
    await subir(nombre, blob); await vaciar();
    return nombre;
  }
  // Logo del juego (el SVG de la portada) a PNG transparente, con Fredoka incrustada
  async function logoCanvas(ancho) {
    const el = document.querySelector('#title-logo svg');
    if (!el) throw new Error('no está el logo en la portada');
    const fuentes = await fuentesCSS();
    const k = el.cloneNode(true);
    const W = ancho, H = Math.round(W * 260 / 640);
    k.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); k.setAttribute('width', W); k.setAttribute('height', H);
    k.querySelectorAll('.logo-shine').forEach(n => n.remove());
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = fuentes; k.insertBefore(st, k.firstChild);
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(k));
    await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
    return c;
  }
  async function logo(op) {
    op = Object.assign({ version: opt.version, prefijo: opt.prefijo, ancho: 1600 }, op || {});
    const el = document.querySelector('#title-logo svg');
    if (!el) throw new Error('no está el logo en la portada');
    const fuentes = await fuentesCSS();
    const k = el.cloneNode(true);
    const W = op.ancho, H = Math.round(W * 260 / 640);
    k.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); k.setAttribute('width', W); k.setAttribute('height', H);
    k.querySelectorAll('.logo-shine').forEach(n => n.remove());
    const st = document.createElementNS('http://www.w3.org/2000/svg', 'style'); st.textContent = fuentes; k.insertBefore(st, k.firstChild);
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(k));
    await img.decode();
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
    const nombre = `${op.prefijo}-${op.version}-gfx-logo.png`;
    await subir(nombre, await blobDe(c, 'image/png')); await vaciar();
    return nombre;
  }
  // Todos los gráficos de un guion: { graficos: [{ id, texto, sub, eyebrow, estilo }] } + logo
  async function graficos(g, op) {
    g = await cargarGuion(g);
    op = Object.assign({ version: (op && op.version) || g.version || opt.version }, op || {});
    const hechos = [await logo(op)];
    const lista = (g.graficos || []).slice();
    // Títulos del comité: cada toma de TOMAS.json con "titulo" da el gráfico t_<id> (los ajustes del guion mandan)
    if (g.titulos) {
      const T = await cargarGuion(g.titulos), ya = new Set(lista.map(x => x.id)), aj = {};
      for (const t of g.tomas || []) {
        if (t.hud) aj[t.id] = { estilo: 'chip' };        // con HUD, el rótulo inferior chocaría con la interfaz
        if (t.montaje && t.montaje.titulo) aj[t.id] = Object.assign(aj[t.id] || {}, t.montaje.titulo);
      }
      for (const t of T.tomas || []) {
        if (!t.titulo || !t.titulo.texto || ya.has('t_' + t.id)) continue;
        lista.push(Object.assign({ id: 't_' + t.id, texto: t.titulo.texto, estilo: t.titulo.estilo || 'tercio' }, aj[t.id] || {}));
      }
    }
    for (const t of lista) hechos.push(await titulo(t, op));
    return hechos;
  }

  // ───────────────────────── diagnóstico ─────────────────────────
  // Foto de cómo se ve una posición (para buscar encuadres): cámara libre pos→mira, guarda pitch-prev-<nombre>.jpg
  async function foto(nombre, pos, mira, fov) {
    await instalar();
    await tiempoVirtual();
    rig = { tipo: 'fija', pos: V3(...pos), look: V3(...mira), fov: fov || 50, roll: 0, update() {} };
    toma = { id: 'foto', hud: false };
    pasoReloj(1000 / 30);
    sx.drawImage(R.canvas, 0, 0, opt.ancho, opt.alto);
    rig = null; toma = null;
    tiempoReal();
    const n = `${opt.prefijo}-prev-${nombre}.jpg`;
    await subir(n, await blobDe(salida, 'image/jpeg', 0.85)); await vaciar();
    return n;
  }

  // Hoja de contacto de cuadros que aún estén en tests/out (para revisar encuadres de un vistazo)
  async function hoja(nombres, op) {
    op = Object.assign({ cols: 3, ancho: 640, nombre: 'hoja' }, op || {});
    const h = Math.round(op.ancho * 9 / 16), filas = Math.ceil(nombres.length / op.cols);
    const c = document.createElement('canvas'); c.width = op.cols * op.ancho; c.height = filas * (h + 26);
    const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    x.font = '600 18px system-ui'; x.fillStyle = '#fff';
    for (let i = 0; i < nombres.length; i++) {
      const img = new Image(); img.src = 'tests/out/' + nombres[i] + '?t=' + Date.now();
      try { await img.decode(); } catch (e) { continue; }
      const cx = (i % op.cols) * op.ancho, cy = Math.floor(i / op.cols) * (h + 26);
      x.drawImage(img, cx, cy + 26, op.ancho, h); x.fillText(nombres[i].replace(/^pitch-/, ''), cx + 6, cy + 19);
    }
    const n = `${opt.prefijo}-prev-${op.nombre}.jpg`;
    await subir(n, await blobDe(c, 'image/jpeg', 0.85)); await vaciar();
    return n;
  }

  Object.assign(CAP, {
    hoja, poi,
    instalar, desinstalar, guion, capturarToma, estadoBase, estadoToma, titulo, logo, graficos, foto, opt, reloj,
    abortar() { CAP.abortado = true; }, ejecutar, ponerRopa, crearRig,
  });
  say('cargada v' + VERSION);
})();
