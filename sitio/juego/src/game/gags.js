/* Juego · gags del pichón en el mundo (DIVERSION_CAP1 mejora 9: «Pichón con gags en el mundo»). Dueño: criadero.
   Fuera del overlay del nido, la cría que sigue a Vittata (compañero de actores.js, vestido por criadero.vestir) hace cosas
   graciosas. Nunca castiga ni asusta: nada se pierde, nadie se hace daño y el pichón siempre vuelve contento.
     caida     se cae de un borde (una caída de 0,9 m o más del bebé o el juvenil): ¡plop!, aplastón, estrellitas de mareo,
               se sacude las plumas y da un saltito de «aquí no pasó nada»
     mariposa  con Vittata quieta 5 s, aparece una mariposa cebra: el pichón la persigue a saltitos, salta sin alcanzarla, ella se
               le posa en la cabeza (ojos de sorpresa) y se va; el pichón se despide con el ala
     siesta    si Vittata lleva 6 s cerca (3,5–12 m) de un hallazgo del Diario que aún no encontró, el pichón va hasta él, bosteza
               y se duerme encima (zetas); así lo señala. Se despierta de un brinco cuando Vittata llega o lo recoge
     imitar    cuando Vittata hace un gesto (teclas 1–7 o el menú Gestos), el pichón lo copia medio segundo tarde; el bebé termina
               sentado de sopetón, los mayores con un saltito orgulloso
   - Cada gag es un hecho para el cómic, una vez por gag (comic.js y el pack no se tocan aquí):
       G.emit('criadero', 'gag', { gag, clave, id, etapa, gesto?, hallazgo?, foto() })
         gag      'caida' | 'mariposa' | 'siesta' | 'imitar'
         clave    nombre de evento propuesto: ChickTumbled | ChickChasedButterfly | ChickNappedOnFind | ChickCopiedGesture
         id       cápsula de la cría (clasico, pr…); etapa: bebe | juvenil | adulto
         gesto    (imitar) clave del gesto de Vittata: saludar, celebrar, bailar, idea, enojo, pelea, molestia
         hallazgo (siesta) id de la entrada del Diario sobre la que se durmió
         foto()   instantánea del mundo en ese momento (data URL JPEG 480×360) o null; quien escucha decide si la toma
     Para darles viñeta, momentos.js (dueño del cómic) puede escuchar G.on('criadero', (tipo, d) => tipo === 'gag' …) y registrar
     d.clave como hace con 'brinco' → ChickJumped.
   - Cuándo: solo con el compañero visible, sin diálogo ni tarjeta abierta, fuera del nido y de los retos, sin modo foto y nunca en
     las baterías (G.quiet). Entre gags espontáneos hay 28 s; la caída y la imitación responden a lo que pasa.
   - Reducir movimiento (G.renderer.REDUCED o prefers-reduced-motion): sin aplastón, sin sacudida ni estrellitas, persecución
     corta y a paso, la mariposa aletea lento y las zetas no suben.
   - Sin texto en pantalla (nada que traducir). Sin tocar actores.js ni character.js: criadero.vestir() llama a antes(ch, k, info)
     antes de ch.update y a despues(ch, k, info) después (las rotaciones con ch.rot se deshacen solas en el cuadro siguiente).
   Carga perezosa desde criadero.js (no va en index.html): window.AVGags(G, api) → G.gags.
   API: G.gags = { antes, despues, quitar, paso, forzar, estado, TIPOS, CLAVES, test }. Prueba: AV.gagsTest(). */
(function () {
  'use strict';
  window.AVGags = function (G, api) {
    if (G.gags) return G.gags;
    api = api || {};
    const S = G.S;
    const CFG = Object.assign({
      primero: 20, pausa: 28, quietaMariposa: 5, siestaEspera: 6, radioHallazgo: 12, radioMin: 3.5, caidaMin: 0.9,
      siestaMax: 45, despiertaCerca: 2.2, lejos: 20, imitarRadio: 7, retraso: 0.45,
    }, (G.pack.criadero && G.pack.criadero.gags) || {});
    const TIPOS = ['caida', 'mariposa', 'siesta', 'imitar'];
    const CLAVES = { caida: 'ChickTumbled', mariposa: 'ChickChasedButterfly', siesta: 'ChickNappedOnFind', imitar: 'ChickCopiedGesture' };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const suave = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    const angulo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
    const reducido = () => (est.reducido != null ? est.reducido : !!(G.renderer && G.renderer.REDUCED) || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches));

    const est = {
      ch: null, k: null, info: null, etapa: 'bebe', capId: null, escala: 1,
      gag: null, cool: CFG.primero, coolCaida: 0, quieta: 0, revisar: 0, cerca: 0, candidato: null, senalados: new Set(),
      emoteVisto: '', aireMax: null, ult: null, reducido: null, manual: false,
      base: { x: 0, y: 0, z: 0, ok: false }, p: { x: 0, z: 0 }, suelta: false, oy: 0, yaw: 0, giro: false, vel: 0,
      ala: null, expr: null, mira: null, pose: null, sq: 0, sentado: 0, cabX: 0, cabZ: 0, torsoX: 0, torsoZ: 0, pico: 0, parpados: 0,
      vistos: { caida: 0, mariposa: 0, siesta: 0, imitar: 0 }, total: 0, eventos: [], nAntes: 0,
    };
    const _v = new THREE.Vector3(), _w = new THREE.Vector3(), mira = new THREE.Vector3();

    // ---------- Sonido: un pío corto (el pichón se despierta, se sacude, se despide) ----------
    if (G.audio && G.audio.define) G.audio.define('gagPio', (t, a, A) => { A.tone(1850, t, 0.06, { type: 'sine', gain: 0.045 }); A.tone(2350, t + 0.075, 0.08, { type: 'sine', gain: 0.04 }); });
    const pio = () => { try { if (!G.quiet && G.audio) G.audio.play('gagPio'); } catch (e) { /* sin audio */ } };

    // ---------- Mariposa cebra (Heliconius charithonia, la de fauna.js): negra con franjas amarillas ----------
    const escena = G.renderer.scene;
    const mariposa = (() => {
      const g = new THREE.Group(); g.name = 'gag_mariposa'; g.userData.sinCulling = true;
      const negro = new THREE.Color('#1a1712'), amarillo = new THREE.Color('#f2cf3a');
      const ala = s => {
        const pos = [], col = [];
        const quad = (a, b, c, d, k) => { for (const p of [a, b, c, a, c, d]) { pos.push(p[0] * s, p[1], p[2]); col.push(k.r, k.g, k.b); } };
        // Ala anterior larga y estrecha (z > 0) y posterior corta y redonda (z < 0), en franjas a lo largo de la envergadura
        const delante = [[0.004, 0.03, 0.004], [0.03, 0.044, 0.002], [0.055, 0.05, 0.0], [0.08, 0.05, 0.004], [0.1, 0.04, 0.012], [0.112, 0.028, 0.02]];
        for (let i = 0; i < delante.length - 1; i++) {
          const [x0, f0, b0] = delante[i], [x1, f1, b1] = delante[i + 1];
          quad([x0, 0, f0], [x1, 0, f1], [x1, 0, b1], [x0, 0, b0], i % 2 ? amarillo : negro);
        }
        const detras = [[0.004, -0.004, -0.03], [0.03, -0.002, -0.046], [0.055, 0.0, -0.05], [0.072, 0.004, -0.036]];
        for (let i = 0; i < detras.length - 1; i++) {
          const [x0, f0, b0] = detras[i], [x1, f1, b1] = detras[i + 1];
          quad([x0, 0, f0], [x1, 0, f1], [x1, 0, b1], [x0, 0, b0], i === 1 ? amarillo : negro);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        geo.computeVertexNormals();
        return geo;
      };
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
      const izq = new THREE.Mesh(ala(1), mat), der = new THREE.Mesh(ala(-1), mat);
      const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.004, 0.07, 6).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#1a1712' }));
      const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), cuerpo.material); cabeza.position.z = 0.038;
      g.add(izq, der, cuerpo, cabeza);
      g.scale.setScalar(1.6); g.visible = false; escena.add(g);
      return { g, izq, der, pos: new THREE.Vector3(), vel: new THREE.Vector3(), t: 0, posada: false, a: 1 };
    })();
    function pasoMariposa(dt) {
      const m = mariposa; if (!m.g.visible) return;
      m.t += dt;
      const red = reducido();
      const aleteo = m.posada ? 0.55 + Math.sin(m.t * 2.2) * (red ? 0.15 : 0.35) : Math.sin(m.t * (red ? 6 : 17)) * (red ? 0.5 : 0.95);
      m.izq.rotation.z = aleteo; m.der.rotation.z = -aleteo;
      m.g.position.copy(m.pos);
      if (m.vel.lengthSq() > 1e-4 && !m.posada) m.g.rotation.y = Math.atan2(m.vel.x, m.vel.z);
      m.g.scale.setScalar(1.6 * m.a);
    }

    // ---------- Zetas de la siesta y estrellitas del mareo (sprites dibujados, sin texto de idioma) ----------
    function lienzo(w, h, dib) { const c = document.createElement('canvas'); c.width = w; c.height = h; dib(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
    const zetas = (() => {
      const tex = lienzo(128, 128, (g) => {
        g.lineJoin = 'round'; g.lineCap = 'round';
        const z = (x, y, s) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x + s, y + s); g.lineWidth = s * 0.42; g.strokeStyle = '#2b2116'; g.stroke(); g.lineWidth = s * 0.2; g.strokeStyle = '#f6ecd2'; g.stroke(); };
        z(14, 74, 30); z(52, 40, 38); z(92, 10, 26);
      });
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
      sp.name = 'gag_zetas'; sp.visible = false; sp.renderOrder = 9; sp.userData.sinCulling = true; sp.scale.set(0.42, 0.42, 1); escena.add(sp);
      return { sp, t: 0 };
    })();
    const estrellas = (() => {
      const tex = lienzo(64, 64, (g) => {
        g.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 27, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r); }
        g.closePath(); g.fillStyle = '#ffd84a'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#7a4b12'; g.stroke();
      });
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const l = [0, 1, 2].map(() => { const s = new THREE.Sprite(mat); s.visible = false; s.renderOrder = 9; s.userData.sinCulling = true; s.scale.set(0.14, 0.14, 1); escena.add(s); return s; });
      return { l, t: 0, on: false, c: new THREE.Vector3() };
    })();

    // ---------- Mundo ----------
    const M = () => G.fisica.MOVE;
    function suelo(x, z) {
      const F = G.fisica, y0 = S.pos.y;
      let g = G.terreno.surfaceY(x, z, y0);
      const w = G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) - (F.SWIM_DEPTH || 0) : -Infinity;
      return Math.max(g, w);
    }
    const sobreAgua = (x, z) => !!(G.agua && G.agua.levelAt) && G.agua.levelAt(x, z) > G.terreno.surfaceY(x, z, S.pos.y) + 0.05;
    function empujar(p, y) { const F = G.fisica; if (!F || !F.colliders) return; const q = { x: p.x, z: p.z, y }; for (const c of F.colliders) F.pushOut(q, c, 0.35); p.x = q.x; p.z = q.z; }
    // ¿Se puede ir a saltitos de (x0, z0) a (x1, z1)? Sin sólidos, colisionadores, agua ni escalones de más de 0,8 m.
    function caminoLibre(x0, z0, x1, z1) {
      const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(d / 0.5)), SO = G.solidos;
      let prev = suelo(x0, z0);
      for (let i = 1; i <= n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = suelo(x, z);
        if (Math.abs(y - prev) > 0.8 || sobreAgua(x, z)) return false;
        if (SO && SO.activo && SO.dentro && SO.dentro(x, z, y + 0.3) > -Infinity) return false;
        const q = { x, z }; empujar(q, y + 0.3); if (Math.hypot(q.x - x, q.z - z) > 0.05) return false;
        prev = y;
      }
      return true;
    }
    function libre() {
      const A = G.actores, C = A && A.companion3D;
      if (!C || !C.root.visible || est.ch !== C) return false;
      if (est.libreForzado) return true;
      if (G.criadero && G.criadero.abierto && G.criadero.abierto()) return false;
      if (G.dialogo && G.dialogo.open && G.dialogo.open()) return false;
      if (G.ui && G.ui.busy && G.ui.busy()) return false;
      if (G.retosApi && G.retosApi.activo) return false;
      if (A.fotoModo) return false;
      return true;
    }
    const posVisual = () => (est.suelta ? est.p : est.base);
    // Hallazgos del Diario que aún no se encontraron (en tierra), con la altura de su modelo para dormirse encima
    function hallazgoCerca() {
      const D = G.diario; if (!D || !D.entries) return null;
      let mejor = null, bd = Infinity;
      for (const f of D.entries) {
        if (f.agua || (S.field || []).includes(f.id) || est.senalados.has(f.id)) continue;
        const d = Math.hypot(f.x - S.pos.x, f.z - S.pos.z);
        if (d < Math.max(CFG.radioMin, (f.r || 1.6) + 1.5) || d > CFG.radioHallazgo || d >= bd) continue;
        const y = D.y ? D.y(f.id) : G.terreno.height(f.x, f.z);
        if (Math.abs(y - S.pos.y) > 2.5) continue;
        mejor = f; bd = d;
      }
      return mejor;
    }
    function cimaDe(f) {
      const D = G.diario, m = D && D.meshes && D.meshes[f.id], y0 = suelo(f.x, f.z);
      if (!m) return y0;
      const box = new THREE.Box3(); m.updateMatrixWorld(true);
      for (const c of m.children) if (c.name !== 'spark' && c.isMesh) box.expandByObject(c);
      return box.isEmpty() ? y0 : clamp(box.max.y, y0, y0 + 0.8);
    }

    // ---------- Gags ----------
    function foto() { try { return G.renderer && G.renderer.snapshot ? G.renderer.snapshot(480, 360, 0.72) : null; } catch (e) { return null; } }
    function emitir(g, extra) {
      if (g.emitido) return; g.emitido = true;
      est.vistos[g.tipo]++; est.total++;
      const d = Object.assign({ gag: g.tipo, clave: CLAVES[g.tipo], id: est.capId, etapa: est.etapa, foto }, extra || {});
      est.eventos.push(d); if (est.eventos.length > 20) est.eventos.shift();
      G.emit('criadero', 'gag', d);
    }
    function reiniciarPose() { est.ala = null; est.expr = null; est.mira = null; est.pose = null; est.sq = 0; est.cabX = est.cabZ = est.torsoX = est.torsoZ = est.pico = 0; est.parpados = 0; est.vel = 0; }
    function empezar(tipo, o) {
      o = o || {};
      if (!est.ch || !est.base.ok) return false;
      if (est.gag) limpiarVisuales();
      const desde = posVisual();
      est.p.x = desde.x; est.p.z = desde.z;
      est.suelta = tipo === 'mariposa' || tipo === 'siesta' || (est.gag && est.suelta);
      est.yaw = est.ch.root.rotation.y; est.giro = true; est.oy = 0;
      reiniciarPose();
      const g = est.gag = { tipo, t: 0, fase: '', datos: o, emitido: false, salto: 0 };
      if (tipo === 'caida') { const h = o.altura != null ? o.altura : 0; g.fase = h > 0.05 ? 'cae' : 'plop'; est.oy = h; g.vy = 0; if (g.fase === 'plop') plop(); }
      else if (tipo === 'mariposa') {
        g.fase = 'mira';
        const m = mariposa, a = est.yaw + (Math.random() < 0.5 ? 0.9 : -0.9);
        m.pos.set(desde.x + Math.sin(a) * 1.1, suelo(desde.x, desde.z) + 0.85, desde.z + Math.cos(a) * 1.1);
        m.vel.set(0, 0, 0); m.t = 0; m.posada = false; m.a = 1; m.g.visible = true; g.fi = Math.random() * 6.28;
      } else if (tipo === 'siesta') {
        g.fase = 'va'; g.obj = o.objetivo; est.senalados.add(g.obj.id);
      } else if (tipo === 'imitar') {
        g.fase = 'espera'; g.gesto = o.gesto;
      }
      return true;
    }
    function limpiarVisuales() {
      mariposa.g.visible = false; mariposa.posada = false;
      zetas.sp.visible = false; zetas.sp.material.opacity = 0;
      estrellas.on = false; for (const s of estrellas.l) s.visible = false;
    }
    function limpiar() {
      limpiarVisuales(); reiniciarPose();
      const C = est.ch;
      if (C) { C.emote = null; const s0 = C.root.userData.s; if (s0) C.root.scale.setScalar(s0); }
      est.gag = null; est.suelta = false; est.oy = 0; est.giro = false; est.sentado = 0;
      est.cool = Math.max(est.cool, CFG.pausa);
    }
    // Termina el gag: si el pichón quedó lejos de su sitio, vuelve a saltitos (fase «vuelta»); si no, listo
    function terminar() {
      const g = est.gag; if (!g) return;
      limpiarVisuales();
      if (est.suelta && Math.hypot(est.p.x - est.base.x, est.p.z - est.base.z) > 0.12) { reiniciarPose(); g.fase = 'vuelta'; g.t = 0; est.oy = 0; est.expr = 'happy'; return; }
      limpiar();
    }
    function plop() {
      const p = posVisual();
      try { if (G.fx && G.fx.polvo && !reducido()) G.fx.polvo(p.x, suelo(p.x, p.z), p.z, 0.5); } catch (e) { /* sin fx */ }
    }
    // Avanza hacia (tx, tz) a v m/s; true al llegar. Mira hacia donde va.
    function irHacia(tx, tz, v, dt, llegar, sinEmpujar) {
      const dx = tx - est.p.x, dz = tz - est.p.z, d = Math.hypot(dx, dz);
      if (d <= (llegar || 0.08)) { est.vel = 0; return true; }
      const paso = Math.min(d, v * dt);
      est.p.x += dx / d * paso; est.p.z += dz / d * paso; if (!sinEmpujar) empujar(est.p, suelo(est.p.x, est.p.z) + 0.3);
      est.vel = v; est.yaw += angulo(est.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 10);
      return false;
    }
    function mirarA(x, z, dt, k) { est.yaw += angulo(est.yaw, Math.atan2(x - posVisual().x, z - posVisual().z)) * Math.min(1, dt * (k || 5)); }
    function vittataCabeza(out) { const P = G.actores && G.actores.player3D; return out.set(S.pos.x, S.pos.y + 1.35 * ((P && P.root.scale.y / (P.root.userData.s || P.root.scale.y)) || 1), S.pos.z); }

    function avanzar(g, dt) {
      g.t += dt;
      const red = reducido(), C = est.ch;
      est.sentado += ((g.sentado ? 1 : 0) - est.sentado) * Math.min(1, dt * 9); g.sentado = false;
      if (g.fase === 'vuelta') {
        const b = est.base, d = Math.hypot(est.p.x - b.x, est.p.z - b.z);
        est.ala = 'walk'; est.expr = 'happy';
        if (irHacia(b.x, b.z, Math.max(red ? 1.6 : 2.6, d / 2.5), dt, 0.12, true) || g.t > 12) limpiar();
        return;
      }
      if (g.tipo === 'caida') {
        if (g.fase === 'cae') {
          g.vy -= 22 * dt; est.oy += g.vy * dt; est.ala = 'flap'; est.expr = 'surprised'; est.cabX = -0.2;
          if (est.oy <= 0) { est.oy = 0; g.fase = 'plop'; g.t = 0; plop(); }
          return;
        }
        if (g.fase === 'plop') {
          const x = g.t / 0.35; est.sq = red ? 0 : Math.sin(Math.min(1, x) * Math.PI) * 0.3; est.expr = 'surprised'; est.ala = 'flap'; g.sentado = true; est.torsoX = 0.35 * suave(x);
          if (g.t >= 0.35) { g.fase = 'mareo'; g.t = 0; est.sq = 0; estrellas.on = !red; estrellas.t = 0; }
          return;
        }
        if (g.fase === 'mareo') {
          g.sentado = true; est.ala = 'idle'; est.expr = g.t < 0.5 ? 'surprised' : 'curious'; est.torsoX = 0.35 * (1 - suave(g.t / 1.1));
          const w = red ? 0 : 1; est.cabZ = Math.sin(g.t * 7) * 0.22 * w; est.cabX = Math.cos(g.t * 7) * 0.12 * w;
          if (g.t >= 1.2) { g.fase = 'sacude'; g.t = 0; estrellas.on = false; if (C && !red) C.shakeT = 0.7; pio();
            const p = posVisual(); try { if (G.fx && G.fx.burst && !red) G.fx.burst(p.x, suelo(p.x, p.z) + 0.45 * est.escala, p.z, 'feathers', 8); } catch (e) { /* sin fx */ }
            emitir(g); }
          return;
        }
        if (g.fase === 'sacude') { est.ala = 'idle'; est.expr = 'happy'; est.parpados = g.t < 0.6 ? 0.7 : 0; if (g.t >= 0.8) { g.fase = 'listo'; g.t = 0; } return; }
        if (g.fase === 'listo') {
          est.expr = 'happy'; est.oy = g.t < 0.4 && !red ? Math.sin(g.t / 0.4 * Math.PI) * 0.1 : 0; est.ala = est.oy > 0.02 ? 'flap' : 'idle';
          if (g.t >= 0.7) terminar();
        }
        return;
      }
      if (g.tipo === 'mariposa') {
        const m = mariposa, b = est.base, MV = M();
        const huye = MV.flying || (MV.speed || 0) > 3.2 || !libre();
        if (huye && (g.fase === 'mira' || g.fase === 'persigue')) { g.fase = 'adios'; g.t = 0; g.sinDespedida = true; }
        if (g.fase === 'mira' || g.fase === 'persigue') {
          // Vuelo en ochos alrededor del sitio del pichón (sigue a Vittata si ella camina)
          const s = (g.fase === 'mira' ? 0 : g.t) * (red ? 0.55 : 1) + g.fi, R = red ? 0.8 : 1.7;
          const tx = b.x + Math.sin(s * 1.1) * R, tz = b.z + Math.sin(s * 2.2) * R * 0.55, ty = suelo(tx, tz) + 0.7 + Math.sin(s * 3.1) * 0.22 + g.salto * 0.35;
          const k = Math.min(1, dt * 2.5), ox = m.pos.x, oz = m.pos.z;
          m.pos.x += (tx - m.pos.x) * k; m.pos.z += (tz - m.pos.z) * k; m.pos.y += (ty - m.pos.y) * k;
          m.vel.set((m.pos.x - ox) / Math.max(dt, 1e-3), 0, (m.pos.z - oz) / Math.max(dt, 1e-3));
          est.mira = mira.copy(m.pos); est.expr = g.fase === 'mira' ? 'curious' : 'happy';
          if (g.fase === 'mira') { mirarA(m.pos.x, m.pos.z, dt, 6); est.cabX = -0.15; if (g.t >= 0.9) { g.fase = 'persigue'; g.t = 0; } return; }
          // Persigue a saltitos sin pasar de 2,3 m de su sitio; salta cada 1,3 s y la mariposa sube justo a tiempo
          let qx = m.pos.x - b.x, qz = m.pos.z - b.z; const ql = Math.hypot(qx, qz), Rm = red ? 1.0 : 2.3;
          if (ql > Rm) { qx *= Rm / ql; qz *= Rm / ql; }
          const llego = irHacia(b.x + qx, b.z + qz, red ? 1.1 : 2.6, dt, 0.35);
          if (llego) mirarA(m.pos.x, m.pos.z, dt, 6);
          est.ala = 'walk';
          if (!red) {
            const c = g.t % 1.3, sal = c > 0.85 ? Math.sin((c - 0.85) / 0.45 * Math.PI) : 0;
            est.oy = sal * 0.26; g.salto = sal; if (sal > 0.1) est.ala = 'flap';
          }
          if (g.t >= 5.5) { g.fase = 'posa'; g.t = 0; est.oy = 0; g.salto = 0; g.desde = m.pos.clone(); }
          return;
        }
        if (g.fase === 'posa') {
          est.vel = 0; est.oy = 0; est.ala = 'idle'; est.cabX = -0.32 * suave(g.t / 0.6); est.mira = null;
          est.expr = g.t < 1.0 ? 'surprised' : 'happy';
          if (g.t >= 0.75 && !g.emitido) { m.posada = true; emitir(g); }
          if (g.t >= 2.2) { g.fase = 'adios'; g.t = 0; m.posada = false; g.desde = m.pos.clone(); if (C && C.play) C.play('Welcome', true); pio(); }
          return;
        }
        if (g.fase === 'adios') {
          const x = Math.min(1, g.t / 1.4); est.vel = 0; est.oy = 0; est.cabX = -0.25 * (1 - x); est.expr = 'happy'; est.mira = mira.copy(m.pos);
          if (!g.desde) g.desde = m.pos.clone();
          m.pos.set(g.desde.x + Math.sin(est.yaw) * 2.2 * x, g.desde.y + 2.4 * x * x + 0.2 * x, g.desde.z + Math.cos(est.yaw) * 2.2 * x);
          m.vel.set(Math.sin(est.yaw), 0, Math.cos(est.yaw)); m.a = 1 - suave((x - 0.6) / 0.4);
          if (x >= 1) { m.g.visible = false; terminar(); }
        }
        return;
      }
      if (g.tipo === 'siesta') {
        const o = g.obj, encontrado = (S.field || []).includes(o.id), dV = Math.hypot(S.pos.x - o.x, S.pos.z - o.z);
        if (g.fase === 'va') {
          est.ala = 'walk'; est.expr = 'curious';
          const d = Math.hypot(o.x - est.p.x, o.z - est.p.z), cima = o.cima != null ? o.cima : suelo(o.x, o.z);
          // Al llegar se sube encima del hallazgo
          est.oy = d < 0.6 ? (cima - suelo(est.p.x, est.p.z)) * suave((0.6 - d) / 0.45) : 0;
          if (irHacia(o.x, o.z, red ? 1.4 : 2.2, dt, 0.08, true)) { // el camino ya se revisó (caminoLibre): el hallazgo puede estar junto a un tronco
            g.fase = 'bosteza'; g.t = 0; est.p.x = o.x; est.p.z = o.z; est.oy = Math.max(0, cima - suelo(o.x, o.z)); }
          else if (g.t > 12 || encontrado || d > 2 * CFG.radioHallazgo + 6) terminar();
          return;
        }
        if (g.fase === 'bosteza') {
          g.sentado = true; est.ala = g.t < 0.8 ? 'flap' : 'idle'; est.expr = 'happy'; est.pico = 0.55 * Math.sin(Math.min(1, g.t / 1.1) * Math.PI); est.cabX = -0.25 * Math.sin(Math.min(1, g.t / 1.1) * Math.PI);
          est.parpados = suave((g.t - 0.6) / 0.6) * 0.95;
          if (g.t >= 1.3) { g.fase = 'duerme'; g.t = 0; zetas.t = 0; emitir(g, { hallazgo: o.id }); }
          return;
        }
        if (g.fase === 'duerme') {
          g.sentado = true; est.ala = 'idle'; est.expr = 'happy'; est.parpados = 0.97; est.pico = 0;
          est.cabX = 0.45; est.cabZ = 0.15; est.torsoX = 0.12 + (red ? 0 : Math.sin(g.t * 1.6) * 0.03);
          if (dV < CFG.despiertaCerca || encontrado || dV > CFG.lejos || g.t > CFG.siestaMax) { g.fase = 'despierta'; g.t = 0; pio(); }
          return;
        }
        if (g.fase === 'despierta') {
          est.parpados = 0; est.pico = 0; est.cabX = est.cabZ = est.torsoX = 0;
          est.expr = g.t < 0.6 ? 'surprised' : 'happy';
          est.oy = Math.max(0, (o.cima != null ? o.cima : 0) - suelo(est.p.x, est.p.z)) + (red ? 0 : Math.sin(Math.min(1, g.t / 0.5) * Math.PI) * 0.3);
          est.ala = g.t < 0.5 ? 'flap' : 'idle';
          vittataCabeza(_w); est.mira = mira.copy(_w); mirarA(S.pos.x, S.pos.z, dt, 5);
          if (g.t >= 1.2) { est.oy = 0; est.mira = null; terminar(); }
        }
        return;
      }
      if (g.tipo === 'imitar') {
        const A = G.actores, E = (A && A.EMOTES) || {}, def = E[g.gesto] || {}, sigue = A && A.emote && A.emote.name === g.gesto;
        if (g.fase === 'espera') {
          est.expr = 'curious'; vittataCabeza(_w); est.mira = mira.copy(_w); mirarA(S.pos.x, S.pos.z, dt, 6);
          if (g.t >= (g.datos.retraso != null ? g.datos.retraso : CFG.retraso)) {
            g.fase = 'copia'; g.t = 0; est.mira = null; est.pose = def.pose || null; est.expr = def.face || 'happy';
            g.dur = Math.min(def.secs || 2, g.datos.forzado ? 4 : 8);
            if (def.clip && C && C.play) C.play(def.clip, true);
            emitir(g, { gesto: g.gesto });
          }
          return;
        }
        if (g.fase === 'copia') {
          est.pose = def.pose || null; est.expr = def.face || 'happy'; mirarA(S.pos.x, S.pos.z, dt, 3);
          if (g.t >= g.dur || (!g.datos.forzado && !sigue && g.t > 1.2)) { g.fase = 'final'; g.t = 0; est.pose = null; }
          return;
        }
        if (g.fase === 'final') {
          // El bebé pierde el equilibrio y queda sentado de sopetón; juvenil y adulto, saltito orgulloso
          if (est.etapa === 'bebe') { g.sentado = g.t > 0.1; est.expr = g.t < 0.45 ? 'surprised' : 'happy'; est.sq = red ? 0 : (g.t > 0.1 && g.t < 0.35 ? Math.sin((g.t - 0.1) / 0.25 * Math.PI) * 0.18 : 0); }
          else { est.expr = 'happy'; est.oy = red ? 0 : (g.t < 0.4 ? Math.sin(g.t / 0.4 * Math.PI) * 0.12 : 0); est.ala = est.oy > 0.02 ? 'flap' : 'idle'; }
          if (g.t >= 0.9) terminar();
        }
      }
    }

    // ¿Qué gag espontáneo toca? (cada 0,5 s). Primero la siesta (señala un hallazgo), luego la mariposa.
    function elegir() {
      if (est.cool > 0) return null;
      const f = hallazgoCerca();
      if (f && est.candidato === f.id) est.cerca += 0.5; else { est.candidato = f ? f.id : null; est.cerca = 0; }
      if (f && est.cerca >= CFG.siestaEspera) {
        const p = posVisual();
        if (caminoLibre(p.x, p.z, f.x, f.z)) return { tipo: 'siesta', o: { objetivo: { id: f.id, x: f.x, z: f.z, cima: cimaDe(f) } } };
        est.senalados.add(f.id); // sin camino: no se insiste
      }
      const MV = M(), p = posVisual();
      if (est.quieta >= CFG.quietaMariposa && Math.hypot(p.x - S.pos.x, p.z - S.pos.z) < 4 && !sobreAgua(p.x, p.z) && !MV.swimming) return { tipo: 'mariposa' };
      return null;
    }

    function paso(dt) {
      dt = Math.min(Math.max(dt || 0, 0), 0.1);
      const A = G.actores, C = est.ch;
      if (!C || !A || C !== A.companion3D || !C.root.visible) { if (est.gag) limpiar(); return; }
      const MV = M();
      est.quieta = (MV.speed || 0) < 0.3 && MV.grounded && !MV.flying && !MV.swimming ? est.quieta + dt : 0;
      est.cool = Math.max(0, est.cool - dt); est.coolCaida = Math.max(0, est.coolCaida - dt);
      // Imitación: un gesto nuevo de Vittata cerca (no interrumpe una siesta ni una persecución)
      const gesto = A.emote && A.emote.name || '';
      if (gesto !== est.emoteVisto) {
        est.emoteVisto = gesto;
        const p = posVisual(), g = est.gag;
        if (gesto && Math.hypot(p.x - S.pos.x, p.z - S.pos.z) < CFG.imitarRadio && (!g || g.tipo === 'imitar' || g.fase === 'vuelta')) empezar('imitar', { gesto });
      }
      if (est.gag) avanzar(est.gag, dt);
      else if (!G.quiet && !est.manual) {
        est.revisar -= dt;
        if (est.revisar <= 0) { est.revisar = 0.5; if (libre()) { const e = elegir(); if (e) empezar(e.tipo, e.o); } }
      }
      pasoMariposa(dt);
    }

    // ---------- Ganchos de criadero.vestir (solo el compañero del mundo) ----------
    function detectarCaida(ch, k) {
      const r = ch.root.position, u = est.ult;
      if (u && Math.hypot(r.x - u.x, r.z - u.z) > 3) est.aireMax = null; // reapareció detrás de Vittata: no es una caída
      est.ult = { x: r.x, z: r.z };
      if (ch.airborne && !ch.flying) { est.aireMax = Math.max(est.aireMax == null ? r.y : est.aireMax, r.y); return; }
      if (est.aireMax == null) return;
      const caida = est.aireMax - r.y; est.aireMax = null;
      const g = est.gag;
      if (caida >= CFG.caidaMin && k.etapa !== 'adulto' && est.coolCaida <= 0 && (!g || g.tipo === 'imitar' || g.fase === 'vuelta') && !G.quiet && !est.manual && libre()) {
        empezar('caida', { altura: 0, caida: +caida.toFixed(2) }); est.coolCaida = 10;
      }
    }
    function antes(ch, k, info) {
      const A = G.actores; if (!A || ch !== A.companion3D) return;
      if (est.ch !== ch) { if (est.gag) limpiar(); est.ch = ch; }
      est.k = k; est.info = info || est.info; est.etapa = k.etapa; est.capId = k.capId; est.escala = (info && info.escala) || est.escala || 1;
      const r = ch.root.position;
      est.base.x = r.x; est.base.y = r.y; est.base.z = r.z; est.base.ok = true; est.nAntes++;
      detectarCaida(ch, k);
      const g = est.gag; if (!g) return;
      const s0 = ch.root.userData.s || ch.root.scale.x, pies = (k.yOff || 0) * s0;
      if (est.suelta || est.oy) {
        const x = est.suelta ? est.p.x : r.x, z = est.suelta ? est.p.z : r.z, gy = suelo(x, z);
        r.set(x, gy - pies + est.oy, z); ch.groundY = gy; ch.airborne = est.oy > 0.04;
      }
      if (est.giro) ch.root.rotation.y = est.yaw;
      ch.speed = est.vel; ch.gait = est.vel > 0.3 ? 2 : 0; ch.flying = false; ch.legsDown = 0;
      ch.wingMode = est.ala || (est.vel > 0.3 ? 'walk' : 'idle');
      if (est.expr) ch.expression = est.expr;
      if (est.mira) ch.lookAt = est.mira;
      ch.emote = est.pose || null;
      if (est.sq) ch.root.scale.set(s0 * (1 + est.sq * 0.5), s0 * (1 - est.sq), s0 * (1 + est.sq * 0.5));
      else if (Math.abs(ch.root.scale.y - s0) > 1e-6) ch.root.scale.setScalar(s0);
    }
    function despues(ch, k) {
      if (ch !== est.ch || !est.gag) return;
      const B = ch.bones, w = est.sentado;
      if (w > 0.01) {
        for (const [hip, knee, ank] of [['pieL1', 'pieL2', 'pieL3'], ['pieL1001', 'pieL2001', 'pieL3001']]) if (B[hip] && B[knee] && B[ank]) { ch.rot(B[hip], 'x', -0.55 * w); ch.rot(B[knee], 'x', 1.25 * w); ch.rot(B[ank], 'x', -0.7 * w); }
        ch.root.position.y -= 0.14 * est.escala * w;
      }
      if (B.cabeza && (est.cabX || est.cabZ)) { ch.rot(B.cabeza, 'x', est.cabX); ch.rot(B.cabeza, 'z', est.cabZ); }
      if (B.espalda1 && (est.torsoX || est.torsoZ)) { ch.rot(B.espalda1, 'x', est.torsoX); ch.rot(B.espalda1, 'z', est.torsoZ); }
      if (B.pico && est.pico) ch.rot(B.pico, 'x', -est.pico); // -X abre (AUDITORIA_ANIMACION_COMBATE.md §4)
      if (est.parpados > 0.02 && ch.lids && ch._lid) { try { for (const l of ch.lids) ch._lid(l, est.parpados); } catch (e) { /* sin párpados */ } }
      // Cabeza en el mundo: la mariposa se posa encima, las zetas suben de ahí y las estrellitas giran alrededor
      const cab = B.cabeza001 || B.cabeza;
      if (!cab) return;
      ch.root.updateMatrixWorld(true); cab.getWorldPosition(_v);
      // Coronilla: el hueso de la cabeza está en la nuca; arriba del todo queda la altura del modelo a escala
      let cima = Math.max(_v.y + 0.1, ch.root.position.y + (ch.height || 1) * (ch.root.userData.s || ch.root.scale.y) * 0.97);
      // Mejor: el punto de montaje de la coronilla (mount_head_top); el cascarón-gorro del bebé sobresale unos 12 cm
      if (B.mount_head_top) { B.mount_head_top.getWorldPosition(_w); cima = _w.y + (k && k.extras && k.extras.cascaron ? 0.12 : 0.02); }
      if (mariposa.posada) { mariposa.pos.set(_v.x, cima + 0.01, _v.z); mariposa.g.rotation.y = ch.root.rotation.y; pasoMariposa(0); }
      const g = est.gag, red = reducido();
      const dormido = g.tipo === 'siesta' && g.fase === 'duerme';
      zetas.sp.visible = dormido;
      if (dormido) {
        const c = red ? 0.5 : (g.t * 0.45) % 1;
        zetas.sp.position.set(_v.x + 0.12 * est.escala, cima + 0.18 + c * 0.35, _v.z);
        zetas.sp.material.opacity = red ? 0.9 : Math.min(1, g.t * 2) * (c < 0.75 ? 1 : 1 - (c - 0.75) / 0.25);
        const s = 0.32 + 0.18 * est.escala; zetas.sp.scale.set(s, s, 1);
      }
      for (let i = 0; i < estrellas.l.length; i++) {
        const s = estrellas.l[i]; s.visible = estrellas.on;
        if (!estrellas.on) continue;
        const a = g.t * 5 + i * Math.PI * 2 / 3, rr = 0.5 * est.escala + 0.12;
        s.position.set(_v.x + Math.cos(a) * rr, cima + 0.02 + Math.sin(a * 2) * 0.03, _v.z + Math.sin(a) * rr);
      }
    }
    function quitar(ch) { if (ch === est.ch) { if (est.gag) limpiar(); est.ch = null; est.base.ok = false; } }

    G.on('update', dt => { if (!est.manual) paso(dt); }, 72);
    // La sombra del compañero va donde está el pichón (actores.js la pone en su punto de seguimiento)
    G.on('render', () => {
      const A = G.actores; if (!est.gag || !A || !A.cShadow || !est.ch || !est.ch.root.visible) return;
      const p = posVisual(); if (est.suelta) A.cShadow.position.set(p.x, suelo(p.x, p.z) + 0.03, p.z);
    }, 16);

    function forzar(tipo, o) {
      o = Object.assign({}, o || {});
      if (!TIPOS.includes(tipo)) return false;
      if (tipo === 'caida' && o.altura == null) o.altura = 1.1;
      if (tipo === 'imitar') { o.gesto = o.gesto || 'saludar'; o.forzado = true; }
      if (tipo === 'siesta' && !o.objetivo) {
        const f = hallazgoCerca(); if (!f) return false;
        o.objetivo = { id: f.id, x: f.x, z: f.z, cima: cimaDe(f) };
      }
      return empezar(tipo, o);
    }
    const estado = () => ({ gag: est.gag ? est.gag.tipo : null, fase: est.gag ? est.gag.fase : null, vistos: Object.assign({}, est.vistos), total: est.total,
      cool: est.cool, conCompanero: !!est.ch, mariposa: mariposa.g.visible, zetas: zetas.sp.visible, estrellas: estrellas.on });

    // =====================================================================================================================
    // Prueba: AV.gagsTest() — cada gag a mano, paso a paso, con la cría bebé en el mundo (y el juvenil para la caída)
    // =====================================================================================================================
    async function test() {
      const checks = [], check = (name, ok, info) => { const x = info == null ? '' : String(info); checks.push({ name, ok: !!ok, info: x, extra: x }); };
      const errores0 = (window.__aveErrores || []).length;
      const cuadro = () => new Promise(r => { let hecho = false; const fin = () => { if (!hecho) { hecho = true; r(); } }; requestAnimationFrame(fin); setTimeout(fin, 400); });
      // n cuadros dibujados de verdad con el compañero (antes/después aplicados); con SwiftShader un cuadro tarda
      const cuadros = async (n, cond) => { const c0 = est.nAntes, t0 = performance.now(); while ((est.nAntes < c0 + n || (cond && !cond())) && performance.now() - t0 < 120000) await new Promise(r => setTimeout(r, 25)); };
      const A = G.actores, emitidos = [];
      const oye = (tipo, d) => { if (!oye.muerto && tipo === 'gag') emitidos.push(d); };
      G.on('criadero', oye);
      const bk = { manual: est.manual, cool: est.cool, coolCaida: est.coolCaida, vistos: Object.assign({}, est.vistos), total: est.total, senal: new Set(est.senalados), red: est.reducido, eventos: est.eventos.slice(), emote: est.emoteVisto };
      let cria = null;
      const pasos = (n, dt) => { for (let i = 0; i < n; i++) paso(dt || 1 / 30); };
      const hasta = async (cond, max) => { for (let i = 0; i < (max || 600) && !cond(); i++) { paso(1 / 30); if (i % 20 === 0) await cuadro(); } return cond(); };
      try {
        est.manual = true; if (est.gag) limpiar(); est.reducido = false; est.libreForzado = true;
        check('Gags: cuatro tipos con su clave de evento', TIPOS.length === 4 && TIPOS.every(t => /^Chick[A-Z]\w+$/.test(CLAVES[t])), TIPOS.map(t => CLAVES[t]).join(','));
        const E = (A && A.EMOTES) || {}, K = (A && A.EMOTE_KEYS) || [];
        check('Imitar: los 7 gestos tienen clip o pose que el pichón puede copiar', K.length === 7 && K.every(n => E[n].clip || E[n].pose), K.join(','));
        if (!A || !A.companion3D) { check('Compañero 3D cargado', false, A && A.failed3D ? 'sin modelo 3D' : 'sin actores'); return fin(); }
        if (!api.conCria) { check('El criadero presta una cría para la prueba', false); return fin(); }
        cria = await api.conCria('bebe');
        const C = A.companion3D;
        await cuadros(2, () => est.ch === C && est.etapa === 'bebe');
        check('Con una cría nacida, el compañero del mundo lleva los gags (vestir → antes/después)', C.root.visible && est.ch === C && est.etapa === 'bebe' && est.base.ok, est.etapa);
        const s0 = C.root.userData.s || C.root.scale.x;

        // 1. Caída: cae, ¡plop! con aplastón, mareo con estrellitas, sacudida y saltito
        emitidos.length = 0;
        check('Caída: arranca desde 1,1 m', forzar('caida') && est.gag.fase === 'cae' && est.oy > 1);
        await cuadros(1);
        const yCae = C.root.position.y - (est.base.y);
        check('Caída: el pichón se ve en el aire sobre su sitio', yCae > 0.5, yCae.toFixed(2));
        let sqMin = 1;
        await hasta(() => est.gag && est.gag.fase === 'plop');
        for (let i = 0; i < 6; i++) { paso(1 / 30); await cuadros(1); sqMin = Math.min(sqMin, C.root.scale.y / s0); }
        check('Caída: ¡plop! con aplastón (escala Y baja)', sqMin < 0.9, sqMin.toFixed(2));
        await hasta(() => est.gag && est.gag.fase === 'mareo');
        pasos(5); await cuadros(2);
        check('Caída: mareo sentado con estrellitas', estrellas.on && estrellas.l.every(s => s.visible) && est.sentado > 0.3, est.sentado.toFixed(2));
        await hasta(() => est.gag && est.gag.fase === 'sacude');
        check('Caída: se sacude las plumas (shakeT del personaje)', C.shakeT > 0.3, C.shakeT);
        const evC = emitidos.find(d => d.gag === 'caida');
        check('Caída: hecho para el cómic (criadero/gag, ChickTumbled, con foto())', evC && evC.clave === 'ChickTumbled' && evC.id === est.capId && evC.etapa === 'bebe' && typeof evC.foto === 'function', evC && evC.clave);
        await hasta(() => !est.gag);
        await cuadros(2);
        check('Caída: termina con la escala intacta y sin estrellitas', !est.gag && Math.abs(C.root.scale.y - s0) < 1e-6 && !estrellas.l.some(s => s.visible));

        // 2. Mariposa: aparece, la persigue a saltitos, se le posa en la cabeza y se va
        emitidos.length = 0;
        check('Mariposa: aparece junto al pichón', forzar('mariposa') && mariposa.g.visible && est.gag.fase === 'mira');
        await hasta(() => est.gag && est.gag.fase === 'persigue');
        let desp = 0, salto = 0, dMin = Infinity;
        for (let i = 0; i < 150 && est.gag && est.gag.fase === 'persigue'; i++) {
          paso(1 / 30); if (i % 10 === 0) await cuadro();
          desp = Math.max(desp, Math.hypot(est.p.x - est.base.x, est.p.z - est.base.z)); salto = Math.max(salto, est.oy);
          dMin = Math.min(dMin, Math.hypot(mariposa.pos.x - est.p.x, mariposa.pos.z - est.p.z));
        }
        check('Mariposa: el pichón la persigue (se aparta de su sitio, sin pasar de 2,3 m)', desp > 0.4 && desp <= 2.31, desp.toFixed(2));
        check('Mariposa: salta para atraparla', salto > 0.15, salto.toFixed(2));
        check('Mariposa: la sigue de cerca', dMin < 0.9, dMin.toFixed(2));
        await hasta(() => mariposa.posada);
        const cab = C.bones.cabeza001 || C.bones.cabeza, sobre = () => { cab.getWorldPosition(_w); const q = mariposa.g.position; return { h: Math.hypot(q.x - _w.x, q.z - _w.z), dy: q.y - _w.y }; };
        await cuadros(2, () => { const o = sobre(); return o.h < 0.12 && o.dy > 0.05 && o.dy < 0.7; });
        const oc = sobre();
        check('Mariposa: se le posa en la coronilla', mariposa.posada && oc.h < 0.12 && oc.dy > 0.05 && oc.dy < 0.7, oc.h.toFixed(2) + ' / ' + oc.dy.toFixed(2));
        const evM = emitidos.find(d => d.gag === 'mariposa');
        check('Mariposa: hecho para el cómic (ChickChasedButterfly)', evM && evM.clave === 'ChickChasedButterfly');
        await hasta(() => !est.gag, 900);
        check('Mariposa: se va y el pichón vuelve a su sitio', !est.gag && !mariposa.g.visible && !est.suelta);

        // 3. Siesta: va hasta un hallazgo, bosteza, se duerme encima (zetas) y se despierta cuando llega Vittata
        emitidos.length = 0;
        const b0 = { x: est.base.x, z: est.base.z };
        let ang = 0, ox = b0.x + 3, oz = b0.z;
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, x = b0.x + Math.cos(a) * 3.2, z = b0.z + Math.sin(a) * 3.2; if (Math.hypot(x - S.pos.x, z - S.pos.z) > 2.8 && caminoLibre(b0.x, b0.z, x, z)) { ang = a; ox = x; oz = z; break; } }
        void ang;
        const obj = { id: 'prueba_gag', x: ox, z: oz, cima: suelo(ox, oz) + 0.12 };
        check('Siesta: sale hacia el hallazgo', forzar('siesta', { objetivo: obj }) && est.gag.fase === 'va');
        await hasta(() => est.gag && est.gag.fase === 'duerme', 900);
        await cuadros(2);
        const dObj = Math.hypot(C.root.position.x - ox, C.root.position.z - oz);
        check('Siesta: se duerme encima del hallazgo (lo señala)', est.gag && est.gag.fase === 'duerme' && dObj < 0.2, dObj.toFixed(2));
        check('Siesta: zetas sobre la cabeza y ojos cerrados', zetas.sp.visible && est.parpados > 0.9);
        const evS = emitidos.find(d => d.gag === 'siesta');
        check('Siesta: hecho para el cómic con el hallazgo (ChickNappedOnFind)', evS && evS.clave === 'ChickNappedOnFind' && evS.hallazgo === 'prueba_gag');
        pasos(30);
        check('Siesta: sigue dormido mientras Vittata no llega', est.gag && est.gag.fase === 'duerme');
        const pv = { x: S.pos.x, z: S.pos.z }; S.pos.x = ox + 1; S.pos.z = oz; paso(1 / 30); S.pos.x = pv.x; S.pos.z = pv.z;
        check('Siesta: Vittata llega y el pichón se despierta de un brinco', est.gag && est.gag.fase === 'despierta');
        await hasta(() => !est.gag, 900);
        check('Siesta: vuelve con Vittata y las zetas se van', !est.gag && !zetas.sp.visible && !est.suelta);

        // 4. Imitar: copia el gesto de Vittata medio segundo tarde (pose procedural y clip del rig)
        emitidos.length = 0;
        A.emote.name = 'bailar'; A.emote.until = performance.now() + 8000; est.emoteVisto = '';
        paso(1 / 30);
        check('Imitar: un gesto de Vittata cerca lo dispara solo', est.gag && est.gag.tipo === 'imitar' && est.gag.gesto === 'bailar' && est.gag.fase === 'espera');
        await hasta(() => est.gag && est.gag.fase === 'copia');
        await cuadros(2);
        check('Imitar: baila con la pose de Vittata (dance)', C.emote === 'dance', C.emote);
        const evI = emitidos.find(d => d.gag === 'imitar');
        check('Imitar: hecho para el cómic con el gesto (ChickCopiedGesture)', evI && evI.clave === 'ChickCopiedGesture' && evI.gesto === 'bailar');
        A.emote.name = '';
        await hasta(() => !est.gag);
        await cuadros(2);
        check('Imitar: al parar Vittata, el bebé queda sentado de sopetón y suelta la pose', !est.gag && !C.emote);
        check('Imitar: saludar usa el clip Welcome', forzar('imitar', { gesto: 'saludar', retraso: 0 }) && (paso(1 / 30), est.gag.fase === 'copia') && C.actions && C.actions.Welcome && C.actions.Welcome.isRunning());
        await hasta(() => !est.gag);

        // 5. Reducir movimiento: sin aplastón ni sacudida ni estrellitas; persecución corta
        est.reducido = true;
        forzar('caida', { altura: 0.4 }); let sqR = 0, starsR = false, shakeR = 0; C.shakeT = 0;
        for (let i = 0; i < 600 && est.gag; i++) { paso(1 / 30); sqR = Math.max(sqR, est.sq); starsR = starsR || estrellas.on; shakeR = Math.max(shakeR, C.shakeT || 0); }
        check('Reducir movimiento: la caída sin aplastón, sacudida ni estrellitas', sqR === 0 && !starsR && shakeR === 0, [sqR, starsR, shakeR].join('/'));
        forzar('mariposa'); let despR = 0, saltoR = 0;
        for (let i = 0; i < 260 && est.gag && est.gag.fase !== 'posa'; i++) { paso(1 / 30); despR = Math.max(despR, Math.hypot(est.p.x - est.base.x, est.p.z - est.base.z)); saltoR = Math.max(saltoR, est.oy); }
        check('Reducir movimiento: persecución a paso, a 1 m como mucho y sin saltos', despR <= 1.01 && saltoR === 0, despR.toFixed(2) + ' / ' + saltoR.toFixed(2));
        limpiar(); est.reducido = false;

        // 6. Disparadores espontáneos
        est.cool = 0; est.quieta = CFG.quietaMariposa + 0.1; est.candidato = null; est.cerca = 0;
        const elegido = elegir();
        check('Espontáneo: con Vittata quieta 5 s, la mariposa (o la siesta si hay hallazgo cerca)', elegido && (elegido.tipo === 'mariposa' || elegido.tipo === 'siesta'), elegido && elegido.tipo);
        est.cool = 5; check('Espontáneo: respeta la pausa entre gags', elegir() === null);
        const qv = G.quiet; G.quiet = true; est.manual = false; est.cool = 0; est.revisar = 0; est.quieta = 99; paso(1 / 30);
        check('Espontáneo: nunca en las baterías (G.quiet)', !est.gag); G.quiet = qv; est.manual = true; if (est.gag) limpiar();
        // Caída real: el juvenil (también salta, no vuela) baja 1,2 m y aterriza → gag
        api.restaurar(cria); cria = await api.conCria('juvenil'); await cuadros(2, () => est.etapa === 'juvenil');
        est.manual = false; est.coolCaida = 0; est.aireMax = null; est.ult = null;
        const kk = est.k, qq = G.quiet; G.quiet = false;
        C.airborne = true; C.root.position.y = est.base.y + 1.2; detectarCaida(C, kk);
        C.airborne = false; C.root.position.y -= 1.2; detectarCaida(C, kk);
        G.quiet = qq;
        check('Espontáneo: el juvenil cae 1,2 m de un borde y hace el gag al aterrizar', est.gag && est.gag.tipo === 'caida' && est.gag.fase === 'plop' && est.etapa === 'juvenil', est.gag && est.gag.fase);
        est.manual = true; limpiar();
        C.airborne = true; C.root.position.y = est.base.y + 0.4; detectarCaida(C, kk); C.airborne = false; C.root.position.y -= 0.4; detectarCaida(C, kk);
        check('Espontáneo: un saltito (0,4 m) no es una caída', !est.gag);

        // 7. Sin compañero no hay gags
        api.restaurar(cria); cria = null; await new Promise(r => setTimeout(r, 300));
        const vis = C.root.visible; forzar('mariposa'); C.root.visible = false; paso(1 / 30); C.root.visible = vis;
        check('Si el compañero se oculta (minijuegos, sin cría), el gag se recoge solo', !est.gag && !mariposa.g.visible);
        check('Sin errores de JavaScript nuevos', (window.__aveErrores || []).length === errores0, (window.__aveErrores || []).slice(errores0).join(' | '));
      } catch (e) {
        check('La prueba terminó sin excepciones', false, e && e.stack || e);
      }
      return fin();
      function fin() {
        try { if (est.gag) limpiar(); } catch (e) { /* */ }
        if (cria) { try { api.restaurar(cria); } catch (e) { /* */ } cria = null; }
        oye.muerto = true; est.libreForzado = false;
        if (G.actores && G.actores.emote) G.actores.emote.name = '';
        est.manual = bk.manual; est.cool = bk.cool; est.coolCaida = bk.coolCaida; est.vistos = bk.vistos; est.total = bk.total; est.senalados = bk.senal; est.reducido = bk.red; est.eventos = bk.eventos; est.emoteVisto = bk.emote;
        const ok = checks.every(c => c.ok);
        console[ok ? 'log' : 'warn']('gagsTest', ok ? 'OK' : 'FALLA', checks.filter(c => !c.ok));
        return { ok, pasan: checks.filter(c => c.ok).length, total: checks.length, checks };
      }
    }

    G.gags = { antes, despues, quitar, paso, forzar, estado, TIPOS, CLAVES, CFG, test, _est: est };
    return G.gags;
  };
})();
