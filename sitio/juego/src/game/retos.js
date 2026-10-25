/* Juego · Modo Retos: arcade de habilidad sobre el mismo mundo (partidas de 1 a 3 minutos, «Otra vez» al instante)
   - «Carrera en El Yunque»: Vittata contra 3 cotorras rivales (character.js con otros plumajes y gafas de carrera).
     Cuenta atrás 3-2-1, 6 puntos de control sobre lugares conocidos (banderín con su número y una flor de maga que brilla;
     nunca anillos de vuelo), corrientes de aire que impulsan y meta en el Mirador Yokahú. La IA sigue la spline de la ruta con
     variación lateral y «goma» (si va muy por delante del jugador se frena y si va muy por detrás acelera; cerca de la meta
     la goma se suaviza para que gane quien vuela mejor). HUD: puesto (1.º/4), tiempo, punto y flecha al siguiente.
     Resultados con medalla (1.º oro, 2.º plata, 3.º bronce) y récord personal.
   - «¡Escapa de la tormenta!»: 90 s de vuelo bajo sobre el mar frente a la playa. El frente de la tormenta avanza desde el
     mar; las ramas que caen se anuncian con su sombra en el agua y los rayos con un brillo, antes de llegar. Semillas doradas
     (y alguna pluma dorada) suman puntos; seguidas, suben el combo. 3 plumas de vida. La dificultad sube poco a poco.
   Carga perezosa: boot.js lo pide con AVE.assets.script al tocar «Retos» (portada o pausa) o al correr AV.retosTest, así no
   suma a la descarga inicial. window.AVRetos(G) devuelve la API: abrir(), jugar('carrera'|'tormenta'), salir(), test().
   La partida de la historia no se toca:
   - Solo se entra con el mundo libre (sin conversación, tarjeta ni panel abiertos; el creador de un jugador nuevo se aparta
     y vuelve al salir).
   - Al entrar: instantánea de G.S, guardado suspendido (G.guardado.suspender) y G.quiet (sin viñetas ni avisos narrativos).
   - Mientras dura, los ganchos de la historia ven el mundo «ocupado» (G.ui.busy da true: ni diálogos, ni hallazgos, ni guía)
     pero el vuelo sigue (G.fisica.step recibe busy = false). Los recursos cuentan como recogidos (no se recoge nada al pasar).
     Acción (E) no hace nada. Esas tres envolturas se quitan al salir.
   - Al salir: se restaura la instantánea (G.guardado.restaurar, con el gancho 'apply'), se reanuda el guardado y G.quiet.
     El almacén de la partida no se escribe en ningún momento.
   Récords aparte, en este dispositivo: localStorage `<almacen>.retos` = { v: 1, carrera: { mejor (ms), puesto (mejor),
   oros, jugadas }, tormenta: { mejor (puntos), tiempo (s), jugadas } }. «Nuevo estudiante» lo borra (gancho en boot.js);
   «Comenzar de cero» no (no es la partida). Al acabar una partida emite G.emit('retosResultado', { modo, ..., prueba }) para «Mis récords»
   (src/game/records.js), que anota el mejor resultado por nombre de cotorra en su propia clave.
   Controles: los del vuelo, con las teclas remapeables de input.js (mover), Espacio sube, C baja, F impulso; en táctil el
   joystick, Subir, Bajar e Impulso. En la carrera la altura se ayuda sola hacia la de la ruta (quien no toca Subir/Bajar
   no se estrella). En los resultados: Enter, Espacio o la tecla de Acción = «Otra vez»; Esc abre la pausa.
   prefers-reduced-motion (G.renderer.REDUCED): sin cambio de FOV, sin sacudidas, sin líneas de velocidad y destellos suaves.
   La ruta y la arena salen del mapa de cap1 (AV_MAPA_CAP1, por id de POI); otro pack sin mapa recibe una ruta en círculo
   alrededor de su aparición. Pruebas: AV.retosTest() (test() al final). */
(function () {
  'use strict';
  window.AVRetos = function (G) {
    if (G.retosApi) return G.retosApi;
    const S = G.S, R = G.renderer, F = G.fisica, M = F.MOVE, scene = R.scene, $ = G.util.$;
    const REDUCED = !!R.REDUCED;
    const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const ALMACEN = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.retos';
    let claveRec = ALMACEN;
    const rate = (k, dt) => 1 - Math.exp(-dt * k);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const giro = a => Math.atan2(Math.sin(a), Math.cos(a));
    const H = (x, z) => G.terreno.height(x, z);
    const nivelAgua = (x, z) => { const w = G.agua.levelAt(x, z); return w > -1e8 ? w : -Infinity; };
    const superficie = (x, z) => Math.max(H(x, z), nivelAgua(x, z));
    // m:ss.d con aritmética entera (el tiempo y el récord de la misma carrera se ven iguales)
    const reloj = t => { const d = Math.max(0, Math.round(t * 10)); return Math.floor(d / 600) + ':' + String(Math.floor(d / 10) % 60).padStart(2, '0') + '.' + (d % 10); };
    const ordinal = n => n + (n === 1 || n === 3 ? '.er' : '.º');
    const MAPA = window.AV_MAPA_CAP1 || null;

    // =================================================================================================================
    // Récords (aparte de la partida)
    // =================================================================================================================
    function leerRec() {
      try { const d = JSON.parse(localStorage.getItem(claveRec) || 'null'); if (d && d.v === 1) return Object.assign({ carrera: {}, tormenta: {} }, d); } catch (e) { /* sin almacén o dañado */ }
      return { v: 1, carrera: {}, tormenta: {} };
    }
    function guardarRec(d) { try { localStorage.setItem(claveRec, JSON.stringify(d)); return true; } catch (e) { return false; } }

    // =================================================================================================================
    // Sonido (sintetizado con audio.js)
    // =================================================================================================================
    const A = G.audio;
    if (!A.has('r_cuenta')) {
      A.define('r_cuenta', (t, a, X) => { X.tone(587, t, 0.16, { type: 'square', gain: 0.06 }); X.tone(1174, t, 0.1, { type: 'sine', gain: 0.05 }); });
      A.define('r_ya', (t, a, X) => { [0, 2, 4].forEach((i, k) => X.tone(X.pent(i + 5, 392), t + k * 0.04, 0.45, { type: 'triangle', gain: 0.14 })); X.noise(t, 0.5, { freq: 500, to: 3000, q: 0.7, gain: 0.18 }); });
      A.define('r_punto', (t, i, X) => { i = i || 0; X.tone(X.pent(i + 4, 392), t, 0.3, { type: 'sine', gain: 0.22 }); X.tone(X.pent(i + 6, 392), t + 0.08, 0.32, { type: 'sine', gain: 0.14 }); X.noise(t + 0.05, 0.35, { freq: 7000, q: 0.8, gain: 0.05 }); });
      A.define('r_impulso', (t, a, X) => { X.noise(t, 0.6, { freq: 280, to: 2600, q: 0.6, gain: 0.34 }); X.tone(196, t, 0.45, { type: 'sine', to: 640, gain: 0.08 }); });
      A.define('r_meta', (t, a, X) => { [0, 2, 4, 5, 7, 9].forEach((i, k) => X.tone(X.pent(i, 523.25), t + k * 0.08, 0.3, { gain: 0.15 })); [7, 9, 12].forEach(i => X.tone(X.pent(i, 392), t + 0.55, 0.9, { type: 'sine', gain: 0.1 })); X.noise(t + 0.5, 0.9, { freq: 6500, q: 0.6, gain: 0.06 }); });
      A.define('r_bien', (t, a, X) => { [0, 2, 4].forEach((i, k) => X.tone(X.pent(i, 440), t + k * 0.1, 0.35, { type: 'sine', gain: 0.13 })); });
      A.define('r_aviso_rama', (t, a, X) => X.tone(1500, t, 0.55, { type: 'sine', to: 520, gain: 0.04 }));
      A.define('r_rama', (t, a, X) => { X.noise(t, 0.3, { type: 'lowpass', freq: 700, to: 160, gain: 0.32 }); X.tone(110, t, 0.22, { type: 'sine', to: 55, gain: 0.14 }); X.noise(t + 0.02, 0.25, { freq: 3000, q: 1.2, gain: 0.06 }); });
      A.define('r_aviso_rayo', (t, a, X) => { for (let k = 0; k < 4; k++) X.noise(t + k * 0.09, 0.06, { freq: 5000 + k * 900, q: 2, gain: 0.06 }); });
      A.define('r_trueno', (t, a, X) => { X.noise(t, 0.12, { freq: 4000, q: 0.6, gain: 0.25 }); X.noise(t + 0.05, 1.7, { type: 'lowpass', freq: 900, to: 90, gain: 0.42 }); X.tone(52, t + 0.05, 1.2, { type: 'sine', to: 38, gain: 0.16 }); });
      A.define('r_golpe', (t, a, X) => { X.tone(440, t, 0.32, { type: 'triangle', to: 170, gain: 0.16 }); X.tone(660, t + 0.06, 0.25, { type: 'sine', to: 300, gain: 0.08 }); });
      A.define('r_semilla', (t, c, X) => { c = Math.min(c || 0, 12); X.tone(X.pent(c + 2, 523.25), t, 0.16, { gain: 0.14 }); X.tone(X.pent(c + 4, 523.25), t + 0.05, 0.22, { type: 'sine', gain: 0.1 }); });
      A.define('r_dorada', (t, c, X) => { [0, 2, 4, 7].forEach((i, k) => X.tone(X.pent(i + 3, 523.25), t + k * 0.05, 0.25, { type: 'sine', gain: 0.12 })); X.noise(t, 0.5, { freq: 8000, q: 0.7, gain: 0.06 }); });
      A.define('r_viento', (t, a, X) => X.noise(t, 1.4, { freq: 420, to: 260, q: 0.5, gain: 0.07 }));
      A.define('r_fin_mal', (t, a, X) => { X.tone(392, t, 0.3, { type: 'triangle', gain: 0.12 }); X.tone(330, t + 0.22, 0.45, { type: 'triangle', to: 262, gain: 0.12 }); });
    }
    const sonar = (n, a) => { try { A.play(n, a); } catch (e) { /* sin audio */ } };

    // =================================================================================================================
    // Texturas dibujadas (canvas) y materiales
    // =================================================================================================================
    const TEX = {};
    function lienzo(nombre, w, h, pintar) {
      if (TEX[nombre]) return TEX[nombre];
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      pintar(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 2;
      return (TEX[nombre] = t);
    }
    const texBrillo = () => lienzo('brillo', 128, 128, (x, w) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.7)'); g.addColorStop(0.6, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, w);
    });
    const texSombra = () => lienzo('sombra', 128, 128, (x, w) => {
      const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(10,14,30,.85)'); g.addColorStop(0.62, 'rgba(10,14,30,.7)'); g.addColorStop(0.8, 'rgba(10,14,30,.35)'); g.addColorStop(1, 'rgba(10,14,30,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, w);
    });
    // Flor de maga (la flor nacional de Puerto Rico): cinco pétalos rojos con el centro amarillo
    const texFlor = () => lienzo('flor', 256, 256, (x) => {
      x.translate(128, 128);
      const g0 = x.createRadialGradient(0, 0, 10, 0, 0, 128); g0.addColorStop(0, 'rgba(255,240,200,.55)'); g0.addColorStop(1, 'rgba(255,200,160,0)');
      x.fillStyle = g0; x.beginPath(); x.arc(0, 0, 128, 0, Math.PI * 2); x.fill();
      for (let i = 0; i < 5; i++) {
        x.save(); x.rotate(i / 5 * Math.PI * 2);
        const g = x.createLinearGradient(0, -10, 0, -96); g.addColorStop(0, '#9e1030'); g.addColorStop(0.5, '#e8365a'); g.addColorStop(1, '#ff8fa8');
        x.fillStyle = g; x.strokeStyle = '#7a0c26'; x.lineWidth = 4;
        x.beginPath(); x.moveTo(0, -6); x.bezierCurveTo(46, -26, 52, -92, 0, -100); x.bezierCurveTo(-52, -92, -46, -26, 0, -6); x.fill(); x.stroke();
        x.restore();
      }
      x.fillStyle = '#ffd84a'; x.strokeStyle = '#b8620e'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 16, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#fff6c8'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; x.beginPath(); x.arc(Math.cos(a) * 26, Math.sin(a) * 26 - 4, 5, 0, Math.PI * 2); x.fill(); }
    });
    // Semilla dorada y pluma dorada (lo que se recoge en la tormenta)
    const texSemilla = () => lienzo('semilla', 128, 128, (x) => {
      const g0 = x.createRadialGradient(64, 64, 4, 64, 64, 64); g0.addColorStop(0, 'rgba(255,240,170,.9)'); g0.addColorStop(1, 'rgba(255,200,80,0)');
      x.fillStyle = g0; x.fillRect(0, 0, 128, 128);
      x.translate(64, 64); x.rotate(-0.5);
      const g = x.createLinearGradient(-20, -30, 20, 30); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffc93a'); g.addColorStop(1, '#c97a10');
      x.fillStyle = g; x.strokeStyle = '#7a4a0a'; x.lineWidth = 3;
      x.beginPath(); x.ellipse(0, 0, 18, 30, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 4; x.beginPath(); x.moveTo(-6, -18); x.quadraticCurveTo(-11, -2, -6, 12); x.stroke();
    });
    const texPluma = () => lienzo('pluma', 128, 128, (x) => {
      const g0 = x.createRadialGradient(64, 64, 4, 64, 64, 64); g0.addColorStop(0, 'rgba(255,250,200,.95)'); g0.addColorStop(1, 'rgba(255,210,90,0)');
      x.fillStyle = g0; x.fillRect(0, 0, 128, 128);
      x.translate(64, 66); x.rotate(0.6);
      const g = x.createLinearGradient(0, -48, 0, 48); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd24a'); g.addColorStop(1, '#e08a12');
      x.fillStyle = g; x.strokeStyle = '#8a5208'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(0, -50); x.bezierCurveTo(24, -30, 22, 22, 2, 40); x.lineTo(-2, 40); x.bezierCurveTo(-22, 22, -24, -30, 0, -50); x.fill(); x.stroke();
      x.strokeStyle = '#8a5208'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -46); x.lineTo(0, 52); x.stroke();
    });
    // Cinta de viento: franja blanca con el borde suave y tramos que se desplazan (la corriente "fluye")
    const texViento = () => lienzo('viento', 256, 32, (x, w, h) => {
      for (let i = 0; i < 4; i++) {
        const x0 = i * 64, g = x.createLinearGradient(x0, 0, x0 + 64, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(x0, 0, 64, h);
      }
      const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = v; x.fillRect(0, 0, w, h);
    });
    // Hoja pequeña (las que vuelan en las corrientes): sin ella los puntos se ven como cuadrados
    const texHoja = () => lienzo('hoja', 64, 64, (x) => {
      x.translate(32, 32); x.rotate(0.7);
      const g = x.createLinearGradient(0, -26, 0, 26); g.addColorStop(0, '#c8f59a'); g.addColorStop(1, '#3f9a4e');
      x.fillStyle = g; x.beginPath(); x.moveTo(0, -27); x.bezierCurveTo(19, -14, 17, 16, 0, 27); x.bezierCurveTo(-17, 16, -19, -14, 0, -27); x.fill();
      x.strokeStyle = 'rgba(30,80,40,.8)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, -22); x.lineTo(0, 24); x.stroke();
    });
    const texRayo = () => lienzo('rayo', 64, 512, (x) => {
      const pts = [[32, 0]]; let px = 32;
      for (let y = 40; y <= 512; y += 40) { px = clamp(px + (Math.random() - 0.5) * 30, 12, 52); pts.push([px, y]); }
      for (const [lw, col] of [[16, 'rgba(160,190,255,.35)'], [8, 'rgba(210,225,255,.8)'], [3, '#ffffff']]) {
        x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
      }
    });
    // Cortina de lluvia del frente: gris azulado casi opaco hasta el agua, con trazos de lluvia (la textura se desplaza)
    const texCortina = () => lienzo('cortina', 256, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(34,40,62,.96)'); g.addColorStop(0.55, 'rgba(52,62,90,.86)'); g.addColorStop(1, 'rgba(70,84,112,.72)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(205,220,245,.35)'; x.lineWidth = 1.6;
      for (let i = 0; i < 220; i++) { const a = Math.random() * w, b = Math.random() * h; x.beginPath(); x.moveTo(a, b); x.lineTo(a - 5, b + 22); x.stroke(); }
    });
    // Banderín con número (o META): triángulo de tela con el borde cosido
    function texBanderin(txt) {
      return lienzo('band_' + txt, 256, 160, (x) => {
        x.fillStyle = '#ffffff'; x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 6;
        x.beginPath(); x.moveTo(6, 6); x.lineTo(250, 80); x.lineTo(6, 154); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = 'rgba(0,0,0,.08)'; x.beginPath(); x.moveTo(6, 6); x.lineTo(250, 80); x.lineTo(6, 80); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(214,64,58,.9)'; x.lineWidth = 12; x.beginPath(); x.moveTo(12, 10); x.lineTo(12, 150); x.stroke();
        x.font = '700 ' + (txt.length > 2 ? 46 : 84) + 'px Fredoka, "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.lineWidth = 10; x.strokeStyle = '#ffffff'; x.strokeText(txt, txt.length > 2 ? 92 : 78, 84);
        x.fillStyle = '#2a1d10'; x.fillText(txt, txt.length > 2 ? 92 : 78, 84);
      });
    }
    const lm = m => R.linMat(m);
    const MAT = {};
    function mats() {
      if (MAT.palo) return MAT;
      MAT.palo = lm(new THREE.MeshLambertMaterial({ color: '#c9a46a' }));
      MAT.rama = lm(new THREE.MeshLambertMaterial({ color: '#7a4f2a' }));
      MAT.hoja = lm(new THREE.MeshLambertMaterial({ color: '#3f9a4e', side: THREE.DoubleSide }));
      return MAT;
    }
    const aditivo = (map, color, op) => lm(new THREE.MeshBasicMaterial({ map, color: color || '#ffffff', transparent: true, opacity: op == null ? 1 : op, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    const spriteMat = (map, color, add, op) => lm(new THREE.SpriteMaterial({ map, color: color || '#ffffff', transparent: true, opacity: op == null ? 1 : op, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: false }));
    if (G.fx.PALETTE && !G.fx.PALETTE.petalos) G.fx.PALETTE.petalos = ['#e8365a', '#ff8fa8', '#ffd84a', '#ffffff', '#c41e3a'];

    const raiz = new THREE.Group(); raiz.name = 'retos'; raiz.userData.sinSolido = true;
    // Lo transparente de los retos se dibuja después del agua (src/engine/agua.js: mar 2, río 3, crecida 4, rocío 6); si no,
    // el mar transparente lo tapa (la cortina, las sombras sobre el agua, las flores sobre una poza)
    const sobreAgua = o => { o.traverse(m => { const mt = m.material; if (mt && (mt.transparent || mt.blending === THREE.AdditiveBlending)) m.renderOrder = Math.max(m.renderOrder, 7); }); return o; };

    // =================================================================================================================
    // Interfaz (inyectada: estilos mínimos con los tokens de src/ui/tokens.css)
    // =================================================================================================================
    const CSS = `
body.retos-on #top, body.retos-on #b-diary, body.retos-on #b-emotes, body.retos-on #b-nido, body.retos-on #prompt, body.retos-on #toast,
body.retos-on #keyhint, body.retos-on #tag, body.retos-on #emotes, body.retos-on #b-act, body.retos-on #b-fly, body.retos-on #quest-toggle, body.retos-on #guia-hud { display: none !important; }
body.retos-on #pause .pause-grid > :not(#b-retos):not(#b-sound) { display: none !important; }
body.retos-on #acts #b-dive { display: inline-flex !important; }
#retos { inset: 0; z-index: var(--z-card); font-family: var(--font-display); color: var(--c-text); }
#retos > * { pointer-events: none; }
#retos [hidden] { display: none !important; }
#retos .rt-hud { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 12px); left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: stretch; }
#retos .rt-chip { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--r-pill); padding: 6px 16px; display: flex; align-items: baseline; gap: 4px;
  font: 700 22px/1.1 var(--font-display); box-shadow: 0 4px 14px rgba(0,0,0,.3); font-variant-numeric: tabular-nums; white-space: nowrap; }
#retos .rt-chip small { font-size: 14px; color: var(--c-text-muted); }
#retos .rt-pos b { color: var(--gold); font-size: 28px; }
#retos .rt-lbl { font: 600 12px/1 var(--font-body); color: var(--c-text-muted); text-transform: uppercase; letter-spacing: .06em; align-self: center; }
#retos .rt-flecha { position: absolute; top: calc(env(safe-area-inset-top, 0px) + 70px); left: 50%; width: 260px; margin-left: -130px; display: grid; justify-items: center; gap: 2px; }
#retos .rt-flecha svg { width: 56px; height: 56px; filter: drop-shadow(0 3px 4px rgba(0,0,0,.45)); transition: transform .08s linear; }
#retos .rt-flecha span { font: 700 15px/1.2 var(--font-display); background: var(--c-surface); padding: 3px 12px; border-radius: var(--r-pill); white-space: nowrap; }
#retos .rt-vidas { display: flex; gap: 2px; align-items: center; }
#retos .rt-vidas i { width: 22px; height: 22px; display: inline-block; background: radial-gradient(circle at 40% 35%, #fff6c8, #ffc93a 55%, #c97a10); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); margin: 0 3px; box-shadow: 0 0 6px rgba(255,210,90,.8); }
#retos .rt-vidas i.off { background: rgba(255,255,255,.18); box-shadow: none; }
#retos .rt-combo { color: var(--gold); }
#retos .rt-cuenta { position: absolute; inset: 0; display: grid; place-items: center; font: 700 min(28vw, 220px)/1 var(--font-display); color: #fff;
  -webkit-text-stroke: 8px rgba(43,26,5,.85); paint-order: stroke; text-shadow: 0 10px 0 rgba(0,0,0,.25); }
#retos .rt-cuenta.pop { animation: rt-pop .55s var(--ease-pop) both; }
#retos .rt-aviso { position: absolute; left: 50%; top: 30%; transform: translateX(-50%); font: 700 34px/1.1 var(--font-display); color: #fff; white-space: nowrap;
  -webkit-text-stroke: 5px rgba(43,26,5,.8); paint-order: stroke; opacity: 0; }
#retos .rt-aviso.ver { animation: rt-aviso 1.1s var(--ease-out) both; }
#retos .rt-tag { position: absolute; left: 0; top: 0; padding: 2px 8px; border-radius: var(--r-pill); font: 700 13px/1.2 var(--font-display); color: #fff;
  background: rgba(12,30,22,.7); border: 2px solid var(--c, #fff); white-space: nowrap; will-change: transform; }
#retos .rt-panel { pointer-events: auto; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto;
  background: var(--c-paper); color: var(--c-ink); border-radius: var(--r-lg); padding: 24px; box-shadow: 0 6px 0 var(--c-paper-edge), 0 18px 50px rgba(0,0,0,.45); text-align: center; animation: pop-in .45s var(--ease-pop) both; }
#retos .rt-panel h2 { margin: 0 0 6px; font: 700 var(--fs-2xl)/1.15 var(--font-display); }
#retos .rt-panel p { margin: 0 0 14px; font: 400 var(--fs-md)/1.4 var(--font-body); color: var(--c-ink-muted); }
#retos .rt-retos { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin: 10px 0 16px; text-align: left; }
#retos .rt-reto { background: #fff8e8; border: 2px solid var(--c-paper-edge); border-radius: var(--r-md); padding: 14px; display: grid; gap: 8px; align-content: start; }
#retos .rt-reto h3 { margin: 0; font: 700 var(--fs-lg)/1.2 var(--font-display); color: var(--c-ink); }
#retos .rt-reto p { margin: 0; font-size: var(--fs-sm); }
#retos .rt-reto .rt-rec { font: 700 var(--fs-sm)/1.2 var(--font-display); color: #8a5208; }
#retos .rt-fila { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
#retos .rt-medalla { width: 96px; height: 96px; margin: -70px auto 8px; border-radius: 50%; display: grid; place-items: center; font: 700 40px/1 var(--font-display); color: #4a2a05;
  background: radial-gradient(circle at 35% 30%, #fff8d8, var(--m1) 45%, var(--m2)); box-shadow: 0 0 0 5px #fff, 0 6px 0 5px rgba(0,0,0,.18), 0 0 40px var(--m1); position: relative; }
#retos .rt-medalla::before, #retos .rt-medalla::after { content: ""; position: absolute; top: -30px; width: 22px; height: 44px; background: var(--crest); z-index: -1; }
#retos .rt-medalla::before { left: 22px; transform: rotate(18deg); } #retos .rt-medalla::after { right: 22px; transform: rotate(-18deg); background: var(--sky); }
#retos .rt-medalla.oro { --m1: #ffd24a; --m2: #c98a10; } #retos .rt-medalla.plata { --m1: #e4ecf2; --m2: #8a9aa8; } #retos .rt-medalla.bronce { --m1: #f0a86a; --m2: #9a5a24; }
#retos .rt-medalla.sin { --m1: #bfe7c8; --m2: #3f9a55; font-size: 30px; }
#retos .rt-fin .rt-panel { padding-top: 54px; }
#retos .rt-datos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 14px; }
#retos .rt-dato { background: #fff8e8; border-radius: var(--r-sm); padding: 8px; font: 700 22px/1.1 var(--font-display); color: var(--c-ink); font-variant-numeric: tabular-nums; }
#retos .rt-dato small { display: block; font: 600 12px/1.2 var(--font-body); color: var(--c-ink-muted); text-transform: uppercase; letter-spacing: .05em; }
#retos .rt-nuevo { display: inline-block; background: var(--crest); color: #fff; padding: 3px 12px; border-radius: var(--r-pill); font: 700 14px/1.3 var(--font-display); margin: 0 0 10px; animation: rt-latido 1s ease-in-out infinite; }
#retos .rt-tecla { font: 600 12px/1 var(--font-body); opacity: .75; margin-left: 6px; }
#retos-fx { position: fixed; inset: 0; pointer-events: none; z-index: var(--z-hud); }
#retos-fx > div { position: absolute; inset: 0; opacity: 0; }
#retos-fx .rt-lineas { inset: -20%; background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0) 0deg 5deg, rgba(255,255,255,.6) 5deg 5.5deg, rgba(255,255,255,0) 5.5deg 11deg);
  -webkit-mask: radial-gradient(circle at 50% 50%, transparent 30%, #000 72%); mask: radial-gradient(circle at 50% 50%, transparent 30%, #000 72%); animation: rt-girar .5s steps(4) infinite; }
#retos-fx .rt-destello { background: #f4f8ff; }
#retos-fx .rt-oscuro { background: radial-gradient(ellipse at 50% 45%, rgba(12,18,40,0) 30%, rgba(8,12,30,.72) 100%), rgba(22,30,58,.42); }
#retos-fx .rt-moja { background: radial-gradient(ellipse at 50% 50%, rgba(60,90,160,0) 45%, rgba(40,70,150,.55) 100%); }
@keyframes rt-pop { 0% { transform: scale(1.8); opacity: 0; } 60% { opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes rt-aviso { 0% { opacity: 0; transform: translate(-50%, 12px) scale(.8); } 15% { opacity: 1; transform: translate(-50%, 0) scale(1.05); } 70% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -16px); } }
@keyframes rt-girar { to { transform: rotate(11deg); } }
@keyframes rt-latido { 50% { transform: scale(1.08); } }
@media (prefers-reduced-motion: reduce) { #retos .rt-cuenta.pop, #retos .rt-aviso.ver, #retos .rt-panel, #retos .rt-nuevo, #retos-fx .rt-lineas { animation-duration: .01s; animation-iteration-count: 1; } }
@media (max-width: 640px) { #retos .rt-chip { font-size: 17px; padding: 5px 10px; } #retos .rt-pos b { font-size: 21px; } #retos .rt-lbl { display: none; } #retos .rt-aviso { font-size: 24px; } }
`;
    const FLECHA = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="rgba(12,30,22,.78)" stroke="#ffd27a" stroke-width="3"/><path d="M32 9 L48 38 L36 34 L36 52 L28 52 L28 34 L16 38 Z" fill="#ffd27a" stroke="#2b1a05" stroke-width="2.5" stroke-linejoin="round"/></svg>';
    let ui = null;
    function montarUI() {
      if (ui) return ui;
      const st = document.createElement('style'); st.id = 'retos-css'; st.textContent = CSS; document.head.appendChild(st);
      const fx = document.createElement('div'); fx.id = 'retos-fx'; fx.setAttribute('aria-hidden', 'true');
      fx.innerHTML = '<div class="rt-oscuro"></div><div class="rt-moja"></div><div class="rt-lineas"></div><div class="rt-destello"></div>';
      document.body.appendChild(fx);
      const el = document.createElement('div'); el.id = 'retos'; el.className = 'hud'; el.hidden = true;
      el.innerHTML = `
<div class="rt-hud" hidden>
  <div class="rt-chip rt-pos"><span class="rt-lbl">Puesto</span><b>1.º</b><small>/4</small></div>
  <div class="rt-chip rt-tiempo"><span class="rt-lbl">Tiempo</span><span>0:00.0</span></div>
  <div class="rt-chip rt-pts"><span class="rt-lbl">Punto</span><span>0/6</span></div>
  <div class="rt-chip rt-vidas" aria-label="Plumas de vida"></div>
  <div class="rt-chip rt-puntos"><span class="rt-lbl">Puntos</span><span>0</span><small class="rt-combo"></small></div>
</div>
<div class="rt-flecha" hidden>${FLECHA}<span>0 m</span></div>
<div class="rt-tags"></div>
<div class="rt-cuenta" aria-live="assertive"></div>
<div class="rt-aviso" aria-live="polite"></div>
<div class="rt-menu" hidden><div class="rt-panel" role="dialog" aria-labelledby="rt-menu-t">
  <h2 id="rt-menu-t">Retos</h2>
  <p>Partidas cortas para volar con Vittata. Tu partida de la historia queda tal como está.</p>
  <div class="rt-retos">
    <div class="rt-reto"><h3>Carrera en El Yunque</h3><p>Cuatro cotorras, seis banderines y la meta en el Mirador Yokahú. Atraviesa las corrientes de aire para ir más rápido.</p>
      <span class="rt-rec" data-rec="carrera"></span><button class="btn" type="button" data-jugar="carrera" data-icon="flag">Jugar</button></div>
    <div class="rt-reto"><h3>¡Escapa de la tormenta!</h3><p>Aguanta 90 segundos sobre el mar. Mira las sombras y los brillos: avisan dónde caen las ramas y los rayos. Recoge semillas doradas.</p>
      <span class="rt-rec" data-rec="tormenta"></span><button class="btn" type="button" data-jugar="tormenta" data-icon="bolt">Jugar</button></div>
  </div>
  <div class="rt-fila"><button class="btn ghost secondary" type="button" data-salir data-icon="close">Volver a la historia</button></div>
</div></div>
<div class="rt-fin" hidden><div class="rt-panel" role="dialog" aria-labelledby="rt-fin-t">
  <div class="rt-medalla"></div>
  <h2 id="rt-fin-t"></h2>
  <div class="rt-nuevo" hidden>¡Nuevo récord!</div>
  <div class="rt-datos"></div>
  <div class="rt-fila">
    <button class="btn xl" type="button" data-otra data-icon="reset">Otra vez<span class="rt-tecla">${TACTIL ? '' : 'Enter'}</span></button>
    <button class="btn ghost secondary" type="button" data-menu data-icon="trophy">Otro reto</button>
    <button class="btn ghost secondary" type="button" data-salir data-icon="close">Volver a la historia</button>
  </div>
</div></div>`;
      document.body.appendChild(el);
      const q = s => el.querySelector(s);
      ui = { el, fx, hud: q('.rt-hud'), pos: q('.rt-pos b'), posN: q('.rt-pos small'), tiempo: q('.rt-tiempo span:last-child'), pts: q('.rt-pts span:last-child'),
        vidas: q('.rt-vidas'), puntos: q('.rt-puntos span:nth-of-type(2)'), combo: q('.rt-combo'), flecha: q('.rt-flecha'), flechaSvg: q('.rt-flecha svg'), flechaTxt: q('.rt-flecha span'),
        tags: q('.rt-tags'), cuenta: q('.rt-cuenta'), aviso: q('.rt-aviso'), menu: q('.rt-menu'), fin: q('.rt-fin'), medalla: q('.rt-medalla'), finT: q('#rt-fin-t'),
        nuevo: q('.rt-nuevo'), datos: q('.rt-datos'), chipPos: q('.rt-pos'), chipPts: q('.rt-pts'), chipVidas: q('.rt-vidas'), chipPuntos: q('.rt-puntos'), chipTiempo: q('.rt-tiempo'),
        lineas: fx.querySelector('.rt-lineas'), destello: fx.querySelector('.rt-destello'), oscuro: fx.querySelector('.rt-oscuro'), moja: fx.querySelector('.rt-moja') };
      el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.jugar) jugar(b.dataset.jugar);
        else if (b.hasAttribute('data-otra')) otraVez();
        else if (b.hasAttribute('data-menu')) abrir();
        else if (b.hasAttribute('data-salir')) salir();
      });
      return ui;
    }
    function aviso(txt) {
      const a = ui.aviso; a.textContent = txt; a.classList.remove('ver'); void a.offsetWidth; a.classList.add('ver');
    }
    function mostrarCuenta(txt) {
      const c = ui.cuenta; c.textContent = txt; c.classList.remove('pop'); if (txt) { void c.offsetWidth; c.classList.add('pop'); }
    }

    // =================================================================================================================
    // Entrar y salir del modo (envolturas reversibles; la partida se restaura al salir)
    // =================================================================================================================
    const st = { activo: false, reto: null, fase: 'nada', snap: null, quiet: false, creador: false, env: null, ultimoManual: -1e9 };
    const efectos = { fovExtra: 0, fovAplicado: 0, lineas: 0, destello: 0, oscuro: 0, moja: 0 };
    let modo = null; // CARRERA o TORMENTA mientras se juega
    // ¿Se puede entrar? Con una conversación, tarjeta o panel abiertos, no (se perdería el hilo de la historia)
    function libre() {
      const creadorNuevo = !$('creator').hidden && !(S.profile && S.profile.created);
      const ocupado = G.dialogo.open() || G.ui.cardOpen || !$('end').hidden || !$('comic').hidden || (!$('creator').hidden && !creadorNuevo);
      return !ocupado;
    }
    function entrar() {
      if (st.activo) return true;
      if (!libre()) { G.ui.toast('Termina lo que estás haciendo y vuelve a tocar «Retos».', 3200); return false; }
      st.snap = G.guardado.instantanea();
      G.guardado.suspender(true);
      st.quiet = G.quiet; G.quiet = true;
      // Recursos como recogidos (al pasar volando bajo no se recoge nada) y sin evento de lluvia de la historia
      const ids = ((G.objetos && G.objetos.recursos) || []).map(r => r.id);
      S.collected = Array.from(new Set((S.collected || []).concat(ids)));
      S.event = null; G.fx.rain.visible = false;
      // Envolturas: la historia ve el mundo ocupado, el vuelo no; Acción no hace nada; FOV y cámara del reto
      const env = st.env = { busy: G.ui.busy, step: F.step, action: G.interaccion.action, fov: G.camara.fov, manual: G.camara.manual,
        cam: Object.assign({}, G.camara.CAM), saltar: $('b-jump').textContent, bucear: $('b-dive').textContent };
      G.ui.busy = () => true;
      F.step = (dt) => env.step(dt, false);
      G.interaccion.action = () => {};
      G.camara.manual = () => { st.ultimoManual = performance.now(); if (env.manual) env.manual(); };
      G.camara.fov = function (dt) {
        const cam = R.camera; cam.fov -= efectos.fovAplicado; env.fov(dt);
        efectos.fovAplicado = REDUCED ? 0 : efectos.fovExtra; cam.fov += efectos.fovAplicado; cam.updateProjectionMatrix();
      };
      $('b-jump').textContent = 'Subir'; $('b-dive').textContent = 'Bajar';
      document.body.classList.add('retos-on');
      if (!raiz.parent) scene.add(raiz);
      const br = $('b-retos'); if (br) br.textContent = 'Salir de los retos';
      st.activo = true;
      return true;
    }
    function salir() {
      cerrarPaneles();
      if (modo) { modo.terminar(); modo = null; }
      st.fase = 'nada'; st.reto = null;
      G.pausa.set('retos', false);
      const volverCreador = () => { if (st.creador && !(S.profile && S.profile.created)) G.creador.open(true); st.creador = false; };
      if (!st.activo) { if (ui) ui.el.hidden = true; document.body.classList.remove('retos-on'); volverCreador(); return; }
      const env = st.env;
      G.ui.busy = env.busy; F.step = env.step; G.interaccion.action = env.action; G.camara.manual = env.manual;
      const cam = R.camera; cam.fov -= efectos.fovAplicado; efectos.fovAplicado = efectos.fovExtra = 0; cam.updateProjectionMatrix(); G.camara.fov = env.fov;
      Object.assign(G.camara.CAM, env.cam);
      $('b-jump').textContent = env.saltar; $('b-dive').textContent = env.bucear;
      document.body.classList.remove('retos-on');
      if (raiz.parent) scene.remove(raiz);
      limpiarFx();
      // La partida vuelve exactamente a como estaba (y el mundo con ella)
      F.endFlight(); M.vx = M.vz = 0; M.dashT = 0; M.landing = false; M.takeoff = 0;
      G.guardado.restaurar(st.snap); st.snap = null;
      G.guardado.suspender(false); G.quiet = st.quiet;
      volverCreador();
      const pj = G.actores.player3D; if (pj) pj.root.visible = true;
      G.camara.place(true);
      const br = $('b-retos'); if (br) br.textContent = 'Retos';
      if (ui) ui.el.hidden = true;
      st.activo = false; st.env = null;
    }
    function cerrarPaneles() { if (!ui) return; ui.menu.hidden = true; ui.fin.hidden = true; }
    function limpiarFx() {
      if (!ui) return;
      efectos.lineas = efectos.destello = efectos.oscuro = efectos.moja = 0;
      for (const k of ['lineas', 'destello', 'oscuro', 'moja']) ui[k].style.opacity = 0;
      ui.hud.hidden = true; ui.flecha.hidden = true; ui.tags.textContent = ''; mostrarCuenta('');
    }
    // Menú de retos (pausa el mundo mientras se elige)
    function abrir() {
      montarUI();
      if (modo) { modo.terminar(); modo = null; }
      if (!st.activo && !libre()) { G.ui.toast('Termina lo que estás haciendo y vuelve a tocar «Retos».', 3200); return false; }
      if (!$('creator').hidden) { st.creador = true; G.creador.close(); } // jugador nuevo: el creador vuelve al salir
      limpiarFx();
      document.body.classList.add('retos-on');
      if (!st.activo) G.camara.place(true);
      ui.el.hidden = false; ui.fin.hidden = true; ui.menu.hidden = false;
      const rec = leerRec();
      ui.menu.querySelector('[data-rec="carrera"]').textContent = rec.carrera.mejor ? 'Récord: ' + reloj(rec.carrera.mejor / 1000) + (rec.carrera.puesto ? ' · mejor puesto ' + ordinal(rec.carrera.puesto) : '') : 'Aún sin récord';
      ui.menu.querySelector('[data-rec="tormenta"]').textContent = rec.tormenta.mejor ? 'Récord: ' + rec.tormenta.mejor + ' puntos' : 'Aún sin récord';
      st.fase = 'menu';
      G.pausa.set('retos', true);
      const b = ui.menu.querySelector('[data-jugar]'); if (b) b.focus({ preventScroll: true });
      return true;
    }
    function jugar(reto) {
      montarUI();
      if (!entrar()) return false;
      cerrarPaneles(); limpiarFx();
      ui.el.hidden = false;
      if (modo) modo.terminar();
      st.reto = reto; modo = reto === 'tormenta' ? TORMENTA : CARRERA;
      G.pausa.set('retos', false);
      modo.iniciar();
      return true;
    }
    function otraVez() { if (st.reto) jugar(st.reto); }
    function resultados(html) {
      ui.hud.hidden = true; ui.flecha.hidden = true; ui.tags.textContent = '';
      ui.fin.hidden = false; st.fase = 'fin';
      G.pausa.set('retos', true);
      html();
      const b = ui.fin.querySelector('[data-otra]'); if (b) b.focus({ preventScroll: true });
    }
    // Enter, Espacio o la tecla de Acción: «Otra vez» en los resultados (un botón con el foco ya hace su propio clic)
    addEventListener('keydown', e => {
      if (!st.activo || st.fase !== 'fin' || e.repeat) return;
      if (e.target && e.target.closest && e.target.closest('#retos button, input, select, textarea')) return;
      if (e.key === 'Enter' || e.key === ' ' || (G.input.es && G.input.es('accion', e))) { e.preventDefault(); otraVez(); }
    });

    // Cámara del reto: se coloca detrás de la dirección de vuelo (G.camara.lazyYaw no corre con G.ui.busy)
    function seguirCamara(dt, fuerza) {
      if (performance.now() - st.ultimoManual < 1300) return;
      const sp = Math.hypot(M.vx, M.vz); if (sp < 2) return;
      const detras = Math.atan2(-M.vx, -M.vz), d = giro(detras - G.camara.yaw);
      G.camara.yaw += d * Math.min(1, fuerza * Math.min(1, sp / 12) * dt);
    }
    function mirarHacia(dx, dz) { G.camara.yaw = Math.atan2(-dx, -dz); }
    // Entrada de dirección (teclas canónicas de input.js, ya remapeadas, y joystick)
    function hayDireccion() {
      const k = G.input.keys, s = G.input.stick;
      return k.has('w') || k.has('a') || k.has('s') || k.has('d') || k.has('arrowup') || k.has('arrowdown') || k.has('arrowleft') || k.has('arrowright') || Math.hypot(s.x, s.y) > 0.12;
    }
    const subiendo = () => G.input.jumpHeld;
    const bajando = () => G.input.keys.has('c');
    function forzarVuelo() { M.flying = true; M.landing = false; M.takeoff = 0; M.swimming = false; M.grounded = false; }
    function colocarJugador(x, y, z, fx, fz) {
      S.pos.x = x; S.pos.y = y; S.pos.z = z; S.vy = 0; M.vx = M.vz = 0; M.dashT = 0;
      const l = Math.hypot(fx, fz) || 1; S.facing = { x: fx / l, z: fz / l };
      forzarVuelo();
    }
    function chispasFx(dt) {
      const k = rate(5, dt);
      efectos.destello = Math.max(0, efectos.destello - dt * 3.2);
      ui.lineas.style.opacity = REDUCED ? 0 : efectos.lineas.toFixed(3);
      ui.destello.style.opacity = (efectos.destello * (REDUCED ? 0.25 : 0.75)).toFixed(3);
      ui.oscuro.style.opacity = efectos.oscuro.toFixed(3);
      ui.moja.style.opacity = efectos.moja.toFixed(3);
      return k;
    }

    // =================================================================================================================
    // CARRERA EN EL YUNQUE
    // =================================================================================================================
    const RIVALES = [
      { nombre: 'Mango', especie: 'oratrix', gafas: '#c9a227', color: '#f2c21a', base: 15.4, fase: 0.15, amp: 3.4, lam: 31 },
      { nombre: 'Cielo', especie: 'versicolor', gafas: '#3d8fb0', color: '#5aa0ff', base: 16.3, fase: 0.55, amp: 2.6, lam: 43 },
      { nombre: 'Perla', especie: 'albifrons', gafas: '#d6403a', color: '#ff7a7a', base: 17.1, fase: 0.85, amp: 3.0, lam: 37 },
    ];
    const T_CARRERA = { empuje: 17.5, empujeImpulso: 30, impulso: 11, impulsoT: 1.7, radioPunto: 10, altoPunto: 14, margenSuelo: 11, cuentaPaso: 0.85, limite: 180 };
    function poi(id) {
      const p = MAPA && (MAPA.pois || []).find(q => q.id === id);
      return p ? { x: p.pos[0], z: p.pos[2] } : null;
    }
    function datosCarrera() {
      const L = MAPA && MAPA.lugares;
      if (MAPA && L && L.mirador) {
        const def = (id, x, z) => poi(id) || { x, z };
        return {
          salida: Object.assign(def('plaza', 150, 170), { nombre: 'Villa Raíz' }),
          puntos: [
            { x: 160, z: 64, nombre: 'La ceiba del río' }, // ceiba héroe del mapa (flora.heroes)
            Object.assign(def('kelvin_aldea_rio_este_2', 135.9, 12.6), { nombre: 'Aldea del río' }), // las ruinas de la hacienda tienen templos de +40 m: no se pueden sobrevolar
            Object.assign(def('poza_la_mina', 72, -91.5), { nombre: 'Cascada La Mina' }),
            Object.assign(def('poza_dajao', 77, -12.5), { nombre: 'Poza del Dajao' }),
            Object.assign(def('kelvin_aldea_meandros', -14.3, 16.8), { nombre: 'Los meandros' }),
            Object.assign(def('casita', -104, 138), { nombre: 'Casita jíbara' }),
            { x: -35, z: 118, via: true }, { x: 28, z: 138, via: true }, // de paso (sin banderín): entra al mirador por el sur, lejos del complejo de ruinas
          ],
          meta: { x: L.mirador.x, z: L.mirador.z, y: (L.mirador.yPlataforma || H(L.mirador.x, L.mirador.z) + 13) + 4, nombre: 'Mirador Yokahú' },
        };
      }
      // Pack sin mapa: círculo alrededor de la aparición
      const a = G.guardado.spawn, pts = [];
      for (let i = 1; i <= 6; i++) { const t = i / 7 * Math.PI * 2; pts.push({ x: a.x + Math.sin(t) * 55, z: a.z - 55 + Math.cos(t) * 55, nombre: 'Punto ' + i }); }
      return { salida: { x: a.x, z: a.z, nombre: 'Salida' }, puntos: pts, meta: { x: a.x + 8, z: a.z - 4, nombre: 'Meta' } };
    }
    // Rejilla (celdas de 6 m) con la cima de lo que sobresale del terreno: edificios de Kelvin (alto y radio del kit, por
    // instancia, aunque aún no se hayan cargado) y copas de los árboles. Así la ruta pasa por encima de torres y templos.
    function rejillaAltos() {
      const CEL = 6, g = new Map(), K = window.AV_EDIFICIOS_KIT || {};
      const poner = (x, z, r, top) => {
        for (let ix = Math.floor((x - r) / CEL); ix <= Math.floor((x + r) / CEL); ix++) for (let iz = Math.floor((z - r) / CEL); iz <= Math.floor((z + r) / CEL); iz++) {
          const k = ix + ',' + iz; if (!(g.get(k) >= top)) g.set(k, top);
        }
      };
      const esc = MAPA && MAPA.escenaKelvin && MAPA.escenaKelvin.compacto;
      for (const e of esc || []) {
        const kit = K[e.modelo] || { alto: 8, radio: 6 };
        for (const it of e.inst || []) {
          let x, y, z, sc;
          if (it.length >= 16) { x = it[12]; y = it[13]; z = it[14]; sc = Math.hypot(it[0], it[1], it[2]); } else { x = it[0]; y = it[1]; z = it[2]; sc = it[4] || 1; }
          poner(x, z, (kit.radio || 4) * sc * 0.75 + 1.5, y + (kit.alto || 6) * sc + 4);
        }
      }
      for (const b of (MAPA && MAPA.edificiosKelvin) || []) if (b.pos && b.dim) poner(b.pos[0], b.pos[2], Math.max(b.dim[0], b.dim[2]) / 2 + 1.5, b.pos[1] + b.dim[1] + 4);
      const V = G.vegetacion;
      if (V && V.instancias && V.info) for (const m in V.instancias) {
        const inf = V.info[m], P = V.instancias[m]; if (!inf || !(inf.alto > 4)) continue;
        for (let i = 0; i < P.n; i++) poner(P.pos[i * 4], P.pos[i * 4 + 2], 2, P.pos[i * 4 + 1] + inf.alto * P.pos[i * 4 + 3] + 3);
      }
      return (x, z) => { const v = g.get(Math.floor(x / CEL) + ',' + Math.floor(z / CEL)); return v == null ? -Infinity : v; };
    }
    // Ruta: spline Catmull-Rom (centrípeta) por la salida, los puntos y la meta, muestreada cada metro; la altura sigue al
    // terreno con margen y pasa sobre edificios y copas (máximo adelantado ±30 m y suavizado), así la IA y la ayuda de altura
    // no chocan con colinas, torres ni árboles
    function construirRuta(def) {
      const alto = rejillaAltos();
      const ctrl = [def.salida].concat(def.puntos, [def.meta]).map(p => new THREE.Vector3(p.x, 0, p.z));
      const curva = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
      const n = Math.max(40, Math.ceil(curva.getLength()));
      const pts = curva.getSpacedPoints(n), N = pts.length;
      const X = new Float32Array(N), Z = new Float32Array(N), Y = new Float32Array(N), base = new Float32Array(N), techo = new Float32Array(N), obst = new Float32Array(N);
      const disco = [[0, 0], [7, 0], [-7, 0], [0, 7], [0, -7], [5, 5], [-5, -5], [5, -5], [-5, 5]];
      for (let i = 0; i < N; i++) {
        X[i] = pts[i].x; Z[i] = pts[i].z;
        let m = -Infinity, o = -Infinity; for (const [ox, oz] of disco) { m = Math.max(m, superficie(X[i] + ox, Z[i] + oz)); o = Math.max(o, alto(X[i] + ox, Z[i] + oz)); }
        techo[i] = superficie(X[i], Z[i]) + 23; // por debajo del techo de vuelo (fisica: flyCeil 26 m sobre el suelo)
        obst[i] = o;
        base[i] = Math.min(techo[i], Math.max(m + T_CARRERA.margenSuelo, o));
      }
      const mx = new Float32Array(N);
      for (let i = 0; i < N; i++) { let m = -Infinity; for (let j = Math.max(0, i - 25); j <= Math.min(N - 1, i + 25); j++) m = Math.max(m, base[j]); mx[i] = m; }
      for (let i = 0; i < N; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - 18); j <= Math.min(N - 1, i + 18); j++) { s += mx[j]; c++; } Y[i] = Math.min(techo[i], Math.max(base[i], s / c)); }
      // Final: la meta está sobre la plataforma del mirador; los últimos 60 m bajan suave hasta ella
      if (def.meta.y != null) for (let i = Math.max(0, N - 60); i < N; i++) { const k = (i - (N - 60)) / 59; Y[i] = Math.max(base[i] - 6, lerp(Y[i], def.meta.y, k * k)); }
      // s de cada control (el más cercano de la muestra)
      const sDe = p => { let b = 0, bd = Infinity; for (let i = 0; i < N; i++) { const d = (X[i] - p.x) ** 2 + (Z[i] - p.z) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
      const cps = def.puntos.filter(p => !p.via);
      const puntos = cps.map((p, i) => ({ i, s: sDe(p), nombre: p.nombre })).concat([{ i: cps.length, s: N - 1, nombre: def.meta.nombre, meta: true }]);
      return { N, X, Y, Z, largo: N - 1, puntos, def, obst };
    }
    const ruta = { R: null };
    // Posición y tangente a una distancia s de la ruta (interpolada)
    function enRuta(s, out) {
      const Rr = ruta.R, f = clamp(s, 0, Rr.largo), i = Math.min(Rr.N - 2, Math.floor(f)), k = f - i;
      out.x = lerp(Rr.X[i], Rr.X[i + 1], k); out.y = lerp(Rr.Y[i], Rr.Y[i + 1], k); out.z = lerp(Rr.Z[i], Rr.Z[i + 1], k);
      const tx = Rr.X[i + 1] - Rr.X[i], tz = Rr.Z[i + 1] - Rr.Z[i], ty = Rr.Y[i + 1] - Rr.Y[i], l = Math.hypot(tx, ty, tz) || 1;
      out.tx = tx / l; out.ty = ty / l; out.tz = tz / l;
      return out;
    }
    // Punto de la ruta más cercano al jugador, buscando cerca del último (no salta a otro tramo que pase cerca)
    function proyectar(x, z, s0) {
      const Rr = ruta.R; let b = s0, bd = Infinity;
      for (let i = Math.max(0, Math.floor(s0) - 30); i <= Math.min(Rr.N - 1, Math.floor(s0) + 90); i++) { const d = (Rr.X[i] - x) ** 2 + (Rr.Z[i] - z) ** 2; if (d < bd) { bd = d; b = i; } }
      return b;
    }

    // ---------- Puntos de control: banderín con número, flor de maga que brilla y haz de luz ----------
    function hacerPunto(p, n, total) {
      const m = mats(), g = new THREE.Group(), q = enRuta(p.s, {});
      const nx = -q.tz, nz = q.tx, y = q.y, lado = p.i % 2 ? 1 : -1;
      const px = q.x + nx * 6.5 * lado, pz = q.z + nz * 6.5 * lado, py = superficie(px, pz), alto = y + 3.2 - py;
      const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, alto, 8), m.palo); palo.position.set(px, py + alto / 2, pz); g.add(palo);
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), lm(new THREE.MeshLambertMaterial({ color: '#ffd24a', emissive: '#6a4a00' }))); bola.position.set(px, py + alto + 0.15, pz); g.add(bola);
      const txt = p.meta ? 'META' : String(n);
      const tela = new THREE.Mesh(new THREE.PlaneGeometry(p.meta ? 7 : 5.2, p.meta ? 4.4 : 3.25), lm(new THREE.MeshBasicMaterial({ map: texBanderin(txt), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: '#ffffff' })));
      const banda = new THREE.Group(); banda.position.set(px, py + alto - (p.meta ? 2.3 : 1.7), pz); tela.position.x = (p.meta ? 3.5 : 2.6); banda.add(tela); g.add(banda);
      banda.rotation.y = Math.atan2(-nz * lado, -nx * lado) + Math.PI / 2; // la tela apunta hacia la ruta
      const flor = new THREE.Sprite(spriteMat(texFlor(), '#ffffff', false)); flor.scale.setScalar(p.meta ? 5.2 : 4.2); flor.position.set(q.x, y, q.z); g.add(flor);
      const halo = new THREE.Sprite(spriteMat(texBrillo(), '#ff5c8a', true, 0.4)); halo.scale.setScalar(8); halo.position.copy(flor.position); g.add(halo);
      const hazAlto = y - superficie(q.x, q.z) + 30;
      const haz = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, hazAlto, 16, 1, true), aditivo(null, '#ffc46b', 0.1));
      haz.position.set(q.x, y - (y - superficie(q.x, q.z)) + hazAlto / 2, q.z); g.add(haz);
      g.userData = { p, flor, halo, haz, tela, banda, x: q.x, y, z: q.z };
      return g;
    }
    // ---------- Corrientes de aire: haz de estelas rectas que fluyen hacia delante (y hojas) ----------
    // Estelas a lo largo del eje, en cruz para verse desde cualquier lado; de frente se ven como trazos sueltos, nunca como un aro
    function hacerCorriente(s, lado) {
      const q = enRuta(s, {}), L = 22, seg = 18;
      const nx = -q.tz, nz = q.tx;
      const c = { s, x: q.x + nx * 2.2 * lado, y: q.y + 0.5, z: q.z + nz * 2.2 * lado, tx: q.tx, ty: q.ty, tz: q.tz, L, radio: 4.8, t: 0 };
      const g = new THREE.Group(); g.position.set(c.x, c.y, c.z);
      const t = new THREE.Vector3(q.tx, q.ty, q.tz), u = new THREE.Vector3(nx, 0, nz).normalize(), v = new THREE.Vector3().crossVectors(t, u).normalize();
      const mapa = texViento().clone(); mapa.needsUpdate = true; mapa.wrapS = THREE.RepeatWrapping; mapa.repeat.set(1.5, 1);
      const mat = aditivo(mapa, '#e6fbff', 0.65); c.mapa = mapa; c.mat = mat;
      const pos = [], uv = [], idx = [];
      for (let k = 0; k < seg; k++) {
        const a = k * 2.4, r = k === 0 ? 0 : 0.8 + (k % 5) * 0.65, off = (k * 0.37) % 1, largo = L * (0.6 + (k % 3) * 0.18), w = 0.2 + (k % 2) * 0.12;
        const ox = (u.x * Math.cos(a) + v.x * Math.sin(a)) * r, oy = (u.y * Math.cos(a) + v.y * Math.sin(a)) * r, oz = (u.z * Math.cos(a) + v.z * Math.sin(a)) * r;
        for (const [px, py, pz] of [[u.x, u.y, u.z], [v.x, v.y, v.z]]) {
          const b = pos.length / 3;
          for (const f of [-0.5, 0.5]) for (const sw of [-w, w]) {
            pos.push(ox + t.x * f * largo + px * sw, oy + t.y * f * largo + py * sw, oz + t.z * f * largo + pz * sw);
            uv.push(off + (f + 0.5) * 1.5, sw < 0 ? 0 : 1);
          }
          idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      g.add(new THREE.Mesh(geo, mat));
      // Hojas que vuelan dentro de la corriente
      const nH = 40, ph = new Float32Array(nH * 3); c.hojas = []; for (let i = 0; i < nH; i++) c.hojas.push([Math.random() * L, Math.random() * Math.PI * 2, 0.6 + Math.random() * 2.6]);
      const gh = new THREE.BufferGeometry(); gh.setAttribute('position', new THREE.BufferAttribute(ph, 3));
      const pm = lm(new THREE.PointsMaterial({ map: texHoja(), color: '#ffffff', size: 0.55, transparent: true, alphaTest: 0.3, depthWrite: false }));
      const puntos = new THREE.Points(gh, pm); puntos.frustumCulled = false; g.add(puntos);
      Object.assign(c, { g, puntos, t3: t, u, v });
      return c;
    }
    function animarCorriente(c, dt) {
      c.mapa.offset.x -= dt * 2.2;
      const a = c.puntos.geometry.attributes.position;
      for (let i = 0; i < c.hojas.length; i++) {
        const h = c.hojas[i]; h[0] = (h[0] + dt * 20) % c.L; h[1] += dt * 3;
        const f = h[0] - c.L / 2, ca = Math.cos(h[1]) * h[2], sa = Math.sin(h[1]) * h[2];
        a.setXYZ(i, c.t3.x * f + c.u.x * ca + c.v.x * sa, c.t3.y * f + c.u.y * ca + c.v.y * sa, c.t3.z * f + c.u.z * ca + c.v.z * sa);
      }
      a.needsUpdate = true;
    }
    // ¿El punto (x, y, z) está dentro de la corriente (cápsula a lo largo de su eje)?
    function dentroCorriente(c, x, y, z) {
      const dx = x - c.x, dy = y - c.y, dz = z - c.z, u = dx * c.tx + dy * c.ty + dz * c.tz;
      if (Math.abs(u) > c.L / 2 + 1) return false;
      return Math.hypot(dx - c.tx * u, dy - c.ty * u, dz - c.tz * u) < c.radio;
    }

    // ---------- Rivales (character.js con otros plumajes) ----------
    let rivalesListos = null;
    function crearRivales() {
      if (rivalesListos) return rivalesListos;
      rivalesListos = Promise.all(RIVALES.map(def => window.AVCharacter.create().then(ch => {
        ch.applyLook({ species: def.especie, accessories: { eyes: { id: 'gafas', color: def.gafas } } });
        const alto = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
        ch.root.scale.setScalar(alto / ch.height); ch.root.userData.sinCulling = true; ch.root.visible = false;
        ch.root.rotation.order = 'YXZ'; ch.play('Idle');
        return ch;
      }))).catch(() => []);
      return rivalesListos;
    }

    const C = { fase: 'nada', t: 0, cuenta: 0, sig: 0, sJug: 0, objetos: [], corrientes: [], rivales: [], llegadas: [], boostT: 0, ultCorriente: null,
      tiempo: 0, puesto: 0, finT: 0, q: {}, ya: false, tags: [] };
    const CARRERA = {
      iniciar() {
        mats();
        if (!ruta.R) ruta.R = construirRuta(datosCarrera());
        const Rr = ruta.R;
        // Escena: puntos, corrientes (en el 55 % de cada tramo, a un lado y al otro) y rivales
        if (!C.objetos.length) {
          Rr.puntos.forEach((p, i) => { const o = hacerPunto(p, i + 1, Rr.puntos.length); C.objetos.push(o); });
          let s0 = 0; Rr.puntos.forEach((p, i) => { C.corrientes.push(hacerCorriente(s0 + (p.s - s0) * 0.55, i % 2 ? -1 : 1)); s0 = p.s; });
        }
        if (!C.grupo) { C.grupo = new THREE.Group(); C.objetos.concat(C.corrientes.map(c => c.g)).forEach(o => C.grupo.add(o)); sobreAgua(C.grupo); }
        raiz.add(C.grupo); C.grupo.visible = true;
        Object.assign(C, { fase: 'cuenta', t: 0, cuenta: T_CARRERA.cuentaPaso * 3, sig: 0, sJug: 0, llegadas: [], boostT: 0, ultCorriente: null, tiempo: 0, puesto: 0, finT: 0, ya: false, ultimoN: 4 });
        C.objetos.forEach(o => { o.visible = true; o.userData.flor.visible = o.userData.halo.visible = o.userData.haz.visible = true; });
        // Salida: en el aire, mirando al primer punto; los rivales en fila a los lados
        const q0 = enRuta(4, {});
        colocarJugador(q0.x, q0.y, q0.z, q0.tx, q0.tz);
        C.inicio = { x: q0.x, y: q0.y, z: q0.z, tx: q0.tx, tz: q0.tz };
        mirarHacia(q0.tx, q0.tz);
        Object.assign(G.camara.CAM, { distFly: 8.6, heightFly: 3.4, follow: 9 });
        G.camara.place(true);
        crearRivales().then(lista => {
          if (modo !== CARRERA) return;
          C.rivales = lista.map((ch, i) => ({ ch, def: RIVALES[i], s: 4, lat: [-4.5, 4.5, 9][i], v: 0, boostT: 0, llego: false, tLlegada: 0, ult: null, yaw: 0, latV: 0 }));
          for (const r of C.rivales) { raiz.add(r.ch.root); r.ch.root.visible = true; }
          ui.tags.innerHTML = C.rivales.map(r => `<span class="rt-tag" style="--c:${r.def.color}">${r.def.nombre}</span>`).join('');
          C.tags = Array.from(ui.tags.children);
        });
        ui.hud.hidden = false; ui.flecha.hidden = false;
        ui.chipVidas.hidden = ui.chipPuntos.hidden = true; ui.chipPos.hidden = ui.chipPts.hidden = ui.chipTiempo.hidden = false;
        ui.posN.textContent = '/' + (RIVALES.length + 1);
        st.fase = 'juego';
        sonar('r_cuenta'); mostrarCuenta('3');
      },
      terminar() {
        if (C.grupo) C.grupo.visible = false;
        for (const r of C.rivales) { r.ch.root.visible = false; raiz.remove(r.ch.root); }
        C.rivales = []; C.tags = []; C.fase = 'nada';
      },
      update(dt) { actualizarCarrera(dt); },
      render(dt) { dibujarCarrera(dt); },
    };
    function progresoJugador() {
      const Rr = ruta.R; if (C.fase === 'fin') return Rr.largo + 1000 - C.tiempo;
      const lim = C.sig < Rr.puntos.length ? Rr.puntos[C.sig].s - 0.5 : Rr.largo;
      return Math.min(C.sJug, lim);
    }
    function progresoRival(r) { return r.llego ? ruta.R.largo + 1000 - r.tLlegada : r.s; }
    function puestoActual() { const p = progresoJugador(); return 1 + C.rivales.filter(r => progresoRival(r) > p).length; }
    function actualizarCarrera(dt) {
      const Rr = ruta.R; if (!Rr || C.fase === 'nada') return;
      const q = C.q;
      if (C.fase === 'cuenta') {
        const I = C.inicio; colocarJugador(I.x, I.y, I.z, I.tx, I.tz);
        C.cuenta -= dt;
        const n = Math.ceil(C.cuenta / T_CARRERA.cuentaPaso);
        if (n !== C.ultimoN && n > 0 && n < 3) { C.ultimoN = n; mostrarCuenta(String(n)); sonar('r_cuenta'); }
        if (n === 3) C.ultimoN = 3;
        if (C.cuenta <= 0) { C.fase = 'juego'; mostrarCuenta('¡Ya!'); sonar('r_ya'); setTimeout(() => { if (C.fase !== 'cuenta' && ui.cuenta.textContent === '¡Ya!') mostrarCuenta(''); }, 700); }
        rivalesIA(0);
        return;
      }
      if (C.fase === 'juego') C.t += dt;
      else C.finT += dt;
      // Vuelo del jugador: nunca aterriza en carrera; empuje que sube la velocidad de crucero y ayuda de altura
      forzarVuelo();
      C.sJug = proyectar(S.pos.x, S.pos.z, C.sJug);
      const sp = Math.hypot(M.vx, M.vz);
      C.boostT = Math.max(0, C.boostT - dt);
      if (C.fase === 'juego' && hayDireccion() && sp > 3) {
        const a = T_CARRERA.empuje + (C.boostT > 0 ? T_CARRERA.empujeImpulso * (C.boostT / T_CARRERA.impulsoT) : 0);
        M.vx += M.vx / sp * a * dt; M.vz += M.vz / sp * a * dt;
      }
      enRuta(C.sJug + Math.min(30, sp * 1.2), q);
      const suelo = superficie(S.pos.x, S.pos.z);
      if (!subiendo() && !bajando()) { const want = clamp((q.y - S.pos.y) * 1.1, -7, 7); S.vy += (want - S.vy) * rate(3.2, dt); }
      if (S.pos.y < suelo + 3) S.vy = Math.max(S.vy, (suelo + 3 - S.pos.y) * 3);
      // Corrientes de aire
      for (const c of C.corrientes) {
        if (C.ultCorriente !== c && dentroCorriente(c, S.pos.x, S.pos.y + 0.6, S.pos.z)) {
          C.ultCorriente = c; C.boostT = T_CARRERA.impulsoT;
          const v = Math.hypot(M.vx, M.vz) || 1, k = T_CARRERA.impulso;
          M.vx = M.vx * 0.5 + (c.tx * 0.5 + M.vx / v * 0.5) * (v + k); M.vz = M.vz * 0.5 + (c.tz * 0.5 + M.vz / v * 0.5) * (v + k); S.vy += 2.5;
          sonar('r_impulso'); G.camara.shake(0.1, 0.25); efectos.fovExtra += 10; aviso('¡Impulso!');
          G.fx.burst(S.pos.x, S.pos.y + 0.8, S.pos.z, 'feathers', 10);
        }
      }
      // Puntos de control en orden (la flor del siguiente)
      if (C.fase === 'juego' && C.sig < Rr.puntos.length) {
        const o = C.objetos[C.sig].userData;
        if (Math.hypot(S.pos.x - o.x, S.pos.z - o.z) < T_CARRERA.radioPunto && Math.abs(S.pos.y + 0.8 - o.y) < T_CARRERA.altoPunto) pasarPunto();
      }
      if (C.fase === 'juego' && C.t > T_CARRERA.limite) acabarCarrera(false);
      rivalesIA(dt);
      if (C.fase === 'fin' && C.finT > 1.6 && st.fase !== 'fin') mostrarResultadosCarrera();
      seguirCamara(dt, 2.4);
      // Efectos de velocidad
      const v2 = Math.hypot(M.vx, M.vz);
      efectos.fovExtra += (clamp((v2 - 12) / 12, 0, 1) * 9 - efectos.fovExtra) * rate(efectos.fovExtra > 9 ? 1.5 : 3, dt);
      efectos.lineas += ((C.boostT > 0 ? 0.55 * C.boostT / T_CARRERA.impulsoT : 0) + clamp((v2 - 17) / 10, 0, 0.25) - efectos.lineas) * rate(6, dt);
    }
    function pasarPunto() {
      const Rr = ruta.R, o = C.objetos[C.sig], u = o.userData;
      u.flor.visible = u.halo.visible = u.haz.visible = false;
      G.fx.burst(u.x, u.y, u.z, 'petalos', 30); G.fx.burst(u.x, u.y + 0.5, u.z, 'gold', 14);
      sonar('r_punto', C.sig);
      C.sig++;
      if (C.sig >= Rr.puntos.length) { acabarCarrera(true); return; }
      aviso(C.sig === Rr.puntos.length - 1 ? '¡A la meta!' : 'Punto ' + C.sig + ' de ' + (Rr.puntos.length - 1));
    }
    function acabarCarrera(llego) {
      C.fase = 'fin'; C.finT = 0; C.tiempo = Math.round(C.t * 1000) / 1000; C.llego = llego;
      C.puesto = llego ? 1 + C.llegadas.length : puestoActual();
      if (llego) { sonar(C.puesto <= 3 ? 'r_meta' : 'r_bien'); G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'gold', 40); G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'petalos', 30); aviso(C.puesto === 1 ? '¡Primera!' : '¡Meta!'); }
      else { sonar('r_fin_mal'); aviso('¡Se acabó el tiempo!'); }
      // Récord (solo si llegó)
      const rec = leerRec(), r = rec.carrera, ms = Math.round(C.tiempo * 1000);
      C.nuevo = llego && (!r.mejor || ms < r.mejor);
      r.jugadas = (r.jugadas || 0) + 1;
      if (llego) { if (C.nuevo) r.mejor = ms; r.puesto = Math.min(r.puesto || 9, C.puesto); if (C.puesto === 1) r.oros = (r.oros || 0) + 1; }
      C.recAnterior = rec.carrera.mejor; guardarRec(rec); C.rec = r;
      // «Mis récords» (src/game/records.js) anota el resultado a nombre de la cotorra que jugó; prueba = la clave de las pruebas
      G.emit('retosResultado', { modo: 'carrera', llego, puesto: C.puesto, ms, rivales: (C.rivales || []).map(x => x.def.especie), prueba: claveRec !== ALMACEN });
    }
    function mostrarResultadosCarrera() {
      resultados(() => {
        const p = C.puesto, md = ui.medalla;
        md.className = 'rt-medalla ' + (!C.llego ? 'sin' : p === 1 ? 'oro' : p === 2 ? 'plata' : p === 3 ? 'bronce' : 'sin');
        md.textContent = C.llego && p <= 3 ? String(p) : C.llego ? '¡Bien!' : '…';
        ui.finT.textContent = !C.llego ? 'Casi llegas a la meta' : p === 1 ? '¡Ganaste la carrera!' : p === 2 ? '¡Segundo lugar!' : p === 3 ? '¡Tercer lugar!' : '¡Llegaste a la meta!';
        ui.nuevo.hidden = !C.nuevo;
        ui.datos.innerHTML = `<div class="rt-dato"><small>Tu tiempo</small>${C.llego ? reloj(C.tiempo) : '—'}</div>` +
          `<div class="rt-dato"><small>Récord</small>${C.rec.mejor ? reloj(C.rec.mejor / 1000) : '—'}</div>` +
          `<div class="rt-dato"><small>Puesto</small>${ordinal(p)} de ${RIVALES.length + 1}</div>` +
          `<div class="rt-dato"><small>Carreras ganadas</small>${C.rec.oros || 0}</div>`;
      });
    }
    // IA: sigue la ruta con su variación (seno lateral y vertical, menor cerca de cada punto) y goma respecto al jugador
    function rivalesIA(dt) {
      const Rr = ruta.R, sP = progresoJugador();
      for (const r of C.rivales) {
        if (C.fase !== 'cuenta' && !r.llego) {
          const gap = sP - r.s;
          let goma = clamp(gap / 70, -0.38, 0.34);
          goma *= clamp((Rr.largo - r.s) / 160, 0.5, 1); // cerca de la meta, menos goma: el final es justo
          const arranque = clamp(C.t / 1.2, 0.25, 1), vari = 1 + 0.05 * Math.sin(C.t * 0.7 + r.def.fase * 6.28);
          r.boostT = Math.max(0, r.boostT - dt);
          const obj = r.def.base * (1 + goma) * vari * (r.boostT > 0 ? 1.3 : 1) * arranque;
          r.v += (obj - r.v) * rate(1.6, dt);
          r.s += r.v * dt;
          for (const c of C.corrientes) if (r.ult !== c && Math.abs(r.s - c.s) < 8) { r.ult = c; r.boostT = 1.4; }
          if (r.s >= Rr.largo) { r.s = Rr.largo; r.llego = true; r.tLlegada = C.t; C.llegadas.push(r); }
        }
      }
    }
    const _q = {};
    function dibujarCarrera(dt) {
      const Rr = ruta.R; if (!Rr || C.fase === 'nada') return;
      const now = performance.now() / 1000;
      // Puntos: el siguiente late en dorado, los demás quedan tenues
      C.objetos.forEach((o, i) => {
        const u = o.userData, sig = i === C.sig, pasado = i < C.sig;
        u.tela.material.color.set(pasado ? '#8fdc9c' : sig ? '#ffc23a' : '#b9dcff');
        u.banda.rotation.z = Math.sin(now * 3 + i) * 0.08; u.tela.rotation.y = Math.sin(now * 4.2 + i) * 0.25;
        if (!pasado) {
          const k = sig ? 1 + Math.sin(now * 5) * 0.08 : 0.75;
          u.flor.scale.setScalar((u.p.meta ? 5.2 : 4.2) * k); u.flor.material.rotation = Math.sin(now * 1.3 + i) * 0.2;
          u.halo.material.opacity = sig ? 0.4 + Math.sin(now * 5) * 0.12 : 0.12; u.halo.scale.setScalar(sig ? 9 : 6);
          u.haz.material.opacity = sig ? 0.13 + Math.sin(now * 3) * 0.04 : 0.03;
          const cp = R.camera.position; u.haz.visible = Math.hypot(cp.x - u.x, cp.z - u.z) > 5;
        }
      });
      for (const c of C.corrientes) animarCorriente(c, dt);
      // Rivales
      const cam = R.camera, w = innerWidth, h = innerHeight, v3 = new THREE.Vector3();
      C.rivales.forEach((r, i) => {
        const ch = r.ch, root = ch.root;
        const sR = r.llego ? Rr.largo : r.s;
        enRuta(sR, _q);
        const env = 0.35 + 0.65 * Math.min(1, Math.min(...Rr.puntos.map(p => Math.abs(p.s - sR))) / 25);
        let lat = C.fase === 'cuenta' || r.s < 30 ? lerp(r.lat, 0, clamp((r.s - 4) / 26, 0, 1)) : 0;
        lat += r.def.amp * Math.sin(sR / r.def.lam + r.def.fase * 6.28) * env * clamp((r.s - 10) / 30, 0, 1);
        let x = _q.x - _q.tz * lat, z = _q.z + _q.tx * lat, y = _q.y + 0.9 * Math.sin(sR / 23 + r.def.fase * 9);
        if (r.llego) { const a = i * 2.1 + 0.6, dd = 3.2 + i * 0.4; x = Rr.X[Rr.N - 1] + Math.cos(a) * dd; z = Rr.Z[Rr.N - 1] + Math.sin(a) * dd; y = Rr.Y[Rr.N - 1] + 0.6 + Math.sin(now * 2 + i) * 0.2; }
        if (C.fase === 'cuenta') y += Math.sin(now * 3 + i) * 0.15;
        y = Math.max(y, superficie(x, z) + 2.5);
        const prevYaw = root.rotation.y;
        root.position.set(x, y, z);
        const want = Math.atan2(_q.tx, _q.tz);
        root.rotation.y += giro(want - root.rotation.y) * Math.min(1, dt * 6);
        const yawRate = dt > 0 ? giro(root.rotation.y - prevYaw) / dt : 0;
        root.rotation.x += ((r.llego || C.fase === 'cuenta' ? 0.12 : 0.55) - root.rotation.x) * Math.min(1, dt * 5);
        root.rotation.z += (clamp(-yawRate * 0.5, -0.6, 0.6) - root.rotation.z) * Math.min(1, dt * 4);
        const quieto = C.fase === 'cuenta' || r.llego;
        Object.assign(ch, { speed: quieto ? 1 : r.v, gait: 0, airborne: true, flying: true, legsDown: quieto ? 0.65 : 0, swimming: false, diving: false,
          wingMode: quieto ? 'hover' : r.boostT > 0 ? 'glide' : r.v < 10 ? 'flap' : 'fly', expression: 'happy', mouth: null, lookAt: null, emote: null, posado: '', agachada: 0, groundY: superficie(x, z), groundAt: null });
        ch.update(dt);
        // Nombre sobre la cabeza (DOM proyectado)
        const tag = C.tags[i];
        if (tag) {
          v3.set(x, y + 2.3, z).project(cam);
          const d = Math.hypot(x - S.pos.x, y - S.pos.y, z - S.pos.z), ver = v3.z < 1 && d < 90 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
          tag.style.display = ver ? '' : 'none';
          if (ver) tag.style.transform = `translate(${((v3.x + 1) / 2 * w).toFixed(0)}px, ${((1 - v3.y) / 2 * h).toFixed(0)}px) translate(-50%, -100%)`;
        }
      });
      // HUD
      {
        const p = C.fase === 'fin' ? C.puesto : puestoActual();
        ui.pos.textContent = p + (p === 1 || p === 3 ? '.er' : '.º');
        ui.tiempo.textContent = reloj(C.fase === 'fin' ? C.tiempo : C.t);
        ui.pts.textContent = Math.min(C.sig, Rr.puntos.length - 1) + '/' + (Rr.puntos.length - 1);
        const o = C.objetos[Math.min(C.sig, C.objetos.length - 1)].userData;
        const dx = o.x - S.pos.x, dz = o.z - S.pos.z, yaw = G.camara.yaw;
        const ang = Math.atan2(dx * Math.cos(yaw) - dz * Math.sin(yaw), -dx * Math.sin(yaw) - dz * Math.cos(yaw));
        ui.flechaSvg.style.transform = 'rotate(' + ang.toFixed(3) + 'rad)';
        const pt = Rr.puntos[Math.min(C.sig, Rr.puntos.length - 1)];
        ui.flechaTxt.textContent = C.fase === 'fin' ? '¡Meta!' : pt.nombre + ' · ' + Math.round(Math.hypot(dx, dz)) + ' m';
      }
      chispasFx(dt);
    }

    // =================================================================================================================
    // ¡ESCAPA DE LA TORMENTA!
    // =================================================================================================================
    const T_TORMENTA = { dur: 90, radio: 24, vidas: 3, altoMin: 1.2, altoMax: 7.5, altoIdeal: 3.2, combo: 3, invul: 1.6 };
    function datosArena() {
      const pl = poi('playa');
      if (pl) return { x: pl.x + 15, z: pl.z + 24, dx: 0, dz: -1 }; // sobre el mar frente a la playa; la tormenta llega del mar (del sur)
      const a = G.guardado.spawn; return { x: a.x, z: a.z, dx: 0, dz: -1 };
    }
    const TM = { fase: 'nada', t: 0, cuenta: 0, vidas: 3, puntos: 0, combo: 0, comboT: 0, invul: 0, peligros: [], semillas: [], rT: 0, lT: 0, sT: 0, frente: 0, fuera: 0, ultimoN: 4, vientoT: 0 };
    const pool = { ramas: [], sombras: [], rayos: [], brillos: [], semillas: [] };
    function hacerRama() {
      const m = mats(), g = new THREE.Group();
      const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 3, 7), m.rama); palo.rotation.z = Math.PI / 2 - 0.25; g.add(palo);
      const sub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.3, 6), m.rama); sub.position.set(0.5, 0.35, 0); sub.rotation.z = -0.6; g.add(sub);
      for (let i = 0; i < 6; i++) { const hj = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), m.hoja); hj.position.set(-1.2 + i * 0.5, 0.25 + (i % 2) * 0.15, (i % 3 - 1) * 0.3); hj.rotation.set(i, i * 0.7, 0.3); g.add(hj); }
      return g;
    }
    function desdePool(tipo, crear) { const l = pool[tipo]; const o = l.find(x => !x.userData.usado) || (l.push(sobreAgua(crear())), l[l.length - 1]); o.userData.usado = true; o.visible = true; if (!o.parent) TM.grupo.add(o); return o; }
    function soltar(o) { if (o) { o.userData.usado = false; o.visible = false; } }
    const nuevaSombra = () => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), lm(new THREE.MeshBasicMaterial({ map: texSombra(), transparent: true, depthWrite: false, fog: false }))); s.rotation.x = -Math.PI / 2; return s; };
    const nuevoBrillo = () => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), aditivo(texBrillo(), '#fff2a0', 1)); s.rotation.x = -Math.PI / 2; const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 1, 12, 1, true), aditivo(null, '#fff6c0', 0.2)); col.rotation.x = Math.PI / 2; col.name = 'col'; s.add(col); return s; };
    const nuevoRayo = () => { const s = new THREE.Sprite(spriteMat(texRayo(), '#ffffff', true, 1)); s.center.set(0.5, 0); return s; };
    const nuevaSemilla = () => new THREE.Sprite(spriteMat(texSemilla(), '#ffffff', false, 1));
    function construirArena() {
      const a = TM.arena = datosArena(), m = mats();
      TM.grupo = new THREE.Group(); TM.grupo.name = 'tormenta';
      // Banderines alrededor: marcan el borde de la arena
      for (let i = 0; i < 14; i++) {
        const t = i / 14 * Math.PI * 2, x = a.x + Math.cos(t) * (T_TORMENTA.radio + 1.5), z = a.z + Math.sin(t) * (T_TORMENTA.radio + 1.5), y0 = superficie(x, z) - 0.5;
        const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 9, 6), m.palo); palo.position.set(x, y0 + 4.5, z); TM.grupo.add(palo);
        const tela = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), lm(new THREE.MeshLambertMaterial({ map: texBanderin(' '), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, color: i % 2 ? '#ffcf5a' : '#7fd3ff' })));
        tela.position.set(x + 0.8 * Math.cos(t + 1.57), y0 + 8.3, z + 0.8 * Math.sin(t + 1.57)); tela.rotation.y = -t; TM.grupo.add(tela);
      }
      // Frente: cortina de lluvia vertical (se mueve) y techo de nubes sobre lo que ya cubrió
      const mc = texCortina().clone(); mc.needsUpdate = true; mc.wrapS = mc.wrapT = THREE.RepeatWrapping; mc.repeat.set(6, 2); TM.mapaCortina = mc;
      const cort = new THREE.Mesh(new THREE.PlaneGeometry(140, 36), lm(new THREE.MeshBasicMaterial({ map: mc, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, opacity: 0.92 })));
      cort.rotation.y = Math.atan2(a.dx, a.dz); TM.cortina = cort; TM.grupo.add(cort);
      const techo = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), lm(new THREE.MeshBasicMaterial({ color: '#262d44', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, fog: false })));
      techo.rotation.x = -Math.PI / 2; TM.techo = techo; TM.grupo.add(techo);
      sobreAgua(TM.grupo); TM.cortina.renderOrder = TM.techo.renderOrder = 8;
      raiz.add(TM.grupo);
    }
    const TORMENTA = {
      iniciar() {
        mats();
        if (!TM.grupo) construirArena();
        TM.grupo.visible = true; if (!TM.grupo.parent) raiz.add(TM.grupo);
        for (const k in pool) pool[k].forEach(soltar);
        Object.assign(TM, { fase: 'cuenta', t: 0, cuenta: T_CARRERA.cuentaPaso * 3, vidas: T_TORMENTA.vidas, puntos: 0, combo: 0, comboT: 0, invul: 0, peligros: [], semillas: [],
          rT: 1.5, lT: 15, sT: 0, frente: 0, fuera: 0, ultimoN: 3, vientoT: 0, recogidas: 0, golpes: 0, finT: 0, lanzados: 0 });
        const a = TM.arena, y = superficie(a.x, a.z) + T_TORMENTA.altoIdeal;
        TM.inicio = { x: a.x + a.dx * 4, y, z: a.z + a.dz * 4 }; // mirando hacia la tormenta que llega
        colocarJugador(TM.inicio.x, TM.inicio.y, TM.inicio.z, -a.dx, -a.dz);
        mirarHacia(-a.dx, -a.dz);
        Object.assign(G.camara.CAM, { distFly: 11.5, heightFly: 8.5, follow: 7 });
        G.camara.place(true);
        G.fx.rain.visible = true;
        ui.hud.hidden = false; ui.flecha.hidden = true;
        ui.chipPos.hidden = ui.chipPts.hidden = true; ui.chipVidas.hidden = ui.chipPuntos.hidden = ui.chipTiempo.hidden = false;
        pintarVidas(); ui.puntos.textContent = '0'; ui.combo.textContent = '';
        for (let i = 0; i < 5; i++) ponerSemilla();
        st.fase = 'juego';
        sonar('r_cuenta'); mostrarCuenta('3');
      },
      terminar() {
        if (TM.grupo) TM.grupo.visible = false;
        for (const k in pool) pool[k].forEach(soltar);
        TM.peligros = []; TM.semillas = []; TM.fase = 'nada';
        G.fx.rain.visible = false;
        const pj = G.actores.player3D; if (pj) pj.root.visible = true;
      },
      update(dt) { actualizarTormenta(dt); },
      render(dt) { dibujarTormenta(dt); },
    };
    function pintarVidas() { ui.vidas.innerHTML = Array.from({ length: T_TORMENTA.vidas }, (_, i) => `<i class="${i < TM.vidas ? '' : 'off'}"></i>`).join(''); ui.vidas.setAttribute('aria-label', TM.vidas + ' plumas de vida'); }
    // Coordenada a lo largo de la dirección en que avanza la tormenta (d): el frente cubre lo que queda por debajo de TM.frente
    const avance = (x, z) => (x - TM.arena.x) * TM.arena.dx + (z - TM.arena.z) * TM.arena.dz;
    function puntoLibre(cerca, minDist) {
      const a = TM.arena, Rr = T_TORMENTA.radio - 2;
      for (let k = 0; k < 20; k++) {
        let x, z;
        if (cerca) { const ang = Math.random() * Math.PI * 2, r = Math.random() * cerca; x = cerca === 0.01 ? S.pos.x : S.pos.x + Math.cos(ang) * r; z = S.pos.z + Math.sin(ang) * r; }
        else { const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * Rr; x = a.x + Math.cos(ang) * r; z = a.z + Math.sin(ang) * r; }
        if (Math.hypot(x - a.x, z - a.z) > Rr) continue;
        if (avance(x, z) < TM.frente + 2) continue;
        if (minDist && Math.hypot(x - S.pos.x, z - S.pos.z) < minDist) continue;
        return { x, z };
      }
      return null;
    }
    function ponerSemilla() {
      const p = puntoLibre(0, 6); if (!p) return;
      const dorada = Math.random() < 0.12, sp = desdePool('semillas', nuevaSemilla);
      sp.material.map = dorada ? texPluma() : texSemilla(); sp.material.needsUpdate = true;
      sp.scale.setScalar(dorada ? 2.1 : 1.5);
      const y = superficie(p.x, p.z) + 1.8 + Math.random() * 3;
      sp.position.set(p.x, y, p.z);
      TM.semillas.push({ sp, x: p.x, y, z: p.z, dorada, t: Math.random() * 6 });
    }
    function lanzarPeligro(tipo, donde) {
      const k = clamp(TM.t / T_TORMENTA.dur, 0, 1);
      const apuntado = Math.random() < lerp(0.4, 0.65, k);
      const avisoT = tipo === 'rama' ? lerp(1.35, 0.85, k) : lerp(1.5, 1.0, k);
      let p = donde || null;
      if (!p && apuntado) { const lx = S.pos.x + M.vx * avisoT * 0.6, lz = S.pos.z + M.vz * avisoT * 0.6; p = { x: lx + (Math.random() - 0.5) * 2, z: lz + (Math.random() - 0.5) * 2 }; if (avance(p.x, p.z) < TM.frente + 1 || Math.hypot(p.x - TM.arena.x, p.z - TM.arena.z) > T_TORMENTA.radio) p = null; }
      if (!p) p = puntoLibre(10, 0) || puntoLibre(0, 0);
      if (!p) return;
      const r = tipo === 'rama' ? 2.1 : 2.6, y0 = superficie(p.x, p.z);
      const z = { tipo, x: p.x, z: p.z, y0, r, aviso: avisoT, t: 0, fase: 'aviso', golpeo: false };
      if (tipo === 'rama') {
        z.sombra = desdePool('sombras', nuevaSombra); z.sombra.position.set(p.x, y0 + 0.12, p.z); z.sombra.scale.setScalar(0.2);
        z.rama = desdePool('ramas', hacerRama); z.rama.visible = false; z.rama.rotation.y = Math.random() * 6;
        z.yr = y0 + 22; z.vy = 0;
        sonar('r_aviso_rama');
      } else {
        z.brillo = desdePool('brillos', nuevoBrillo); z.brillo.position.set(p.x, y0 + 0.14, p.z); z.brillo.scale.setScalar(0.5);
        sonar('r_aviso_rayo');
      }
      TM.peligros.push(z); TM.lanzados++;
    }
    function golpe(desdeX, desdeZ) {
      if (TM.invul > 0 || TM.fase !== 'juego') return false;
      TM.vidas--; TM.golpes++; TM.combo = 0; TM.comboT = 0; TM.invul = T_TORMENTA.invul;
      const dx = S.pos.x - desdeX, dz = S.pos.z - desdeZ, d = Math.hypot(dx, dz) || 1;
      M.vx += dx / d * 8; M.vz += dz / d * 8; S.vy += 2;
      sonar('r_golpe'); G.camara.shake(0.25, 0.35);
      G.fx.burst(S.pos.x, S.pos.y + 1.4, S.pos.z, 'stars', 16);
      pintarVidas(); aviso(TM.vidas > 0 ? '¡Uy! Te quedan ' + TM.vidas : '¡Uy!');
      if (TM.vidas <= 0) acabarTormenta(false);
      return true;
    }
    function actualizarTormenta(dt) {
      if (TM.fase === 'nada') return;
      const a = TM.arena;
      if (TM.fase === 'cuenta') {
        const I = TM.inicio; colocarJugador(I.x, I.y, I.z, -a.dx, -a.dz);
        TM.cuenta -= dt;
        const n = Math.ceil(TM.cuenta / T_CARRERA.cuentaPaso);
        if (n !== TM.ultimoN && n > 0 && n < 3) { TM.ultimoN = n; mostrarCuenta(String(n)); sonar('r_cuenta'); }
        if (TM.cuenta <= 0) { TM.fase = 'juego'; mostrarCuenta('¡Vuela!'); sonar('r_ya'); setTimeout(() => { if (ui.cuenta.textContent === '¡Vuela!') mostrarCuenta(''); }, 700); }
        TM.frente = -T_TORMENTA.radio - 14;
        return;
      }
      forzarVuelo();
      const k = clamp(TM.t / T_TORMENTA.dur, 0, 1);
      if (TM.fase === 'juego') TM.t += dt; else TM.finT += dt;
      // El frente avanza desde fuera de la arena hasta cubrir un tercio
      TM.frente = lerp(-T_TORMENTA.radio - 14, T_TORMENTA.radio * 0.3, Math.pow(k, 0.85));
      // Altura: vuelo bajo (franja entre altoMin y altoMax sobre el agua o la arena), con ayuda hacia la altura ideal
      const suelo = superficie(S.pos.x, S.pos.z);
      if (!subiendo() && !bajando()) S.vy += ((suelo + T_TORMENTA.altoIdeal - S.pos.y) * 1.5 - S.vy) * rate(3, dt);
      if (S.pos.y > suelo + T_TORMENTA.altoMax) { S.pos.y = suelo + T_TORMENTA.altoMax; S.vy = Math.min(S.vy, 0); }
      if (S.pos.y < suelo + T_TORMENTA.altoMin) { S.pos.y = suelo + T_TORMENTA.altoMin; S.vy = Math.max(S.vy, 0); }
      // Borde de la arena: el viento devuelve hacia dentro
      const dx = S.pos.x - a.x, dz = S.pos.z - a.z, dist = Math.hypot(dx, dz);
      if (dist > T_TORMENTA.radio) {
        const f = (dist - T_TORMENTA.radio) * 6 * dt; M.vx -= dx / dist * f * 4; M.vz -= dz / dist * f * 4;
        if (dist > T_TORMENTA.radio + 4) { S.pos.x = a.x + dx / dist * (T_TORMENTA.radio + 4); S.pos.z = a.z + dz / dist * (T_TORMENTA.radio + 4); }
        if ((TM.vientoT -= dt) <= 0) { TM.vientoT = 1.5; sonar('r_viento'); }
      }
      // Bajo la tormenta: empuja hacia fuera y moja; 2 s seguidos dentro cuestan una pluma
      const dentro = TM.fase === 'juego' && avance(S.pos.x, S.pos.z) < TM.frente;
      if (dentro) {
        M.vx += a.dx * 14 * dt; M.vz += a.dz * 14 * dt; M.vx *= 1 - 0.8 * dt; M.vz *= 1 - 0.8 * dt;
        TM.fuera += dt; if (TM.fuera > 2) { TM.fuera = 0.6; golpe(S.pos.x - a.dx, S.pos.z - a.dz); }
        if ((TM.vientoT -= dt) <= 0) { TM.vientoT = 1.3; sonar('r_viento'); aviso('¡Sal de la tormenta!'); }
      } else TM.fuera = Math.max(0, TM.fuera - dt * 2);
      efectos.moja += ((dentro ? 0.9 : 0) - efectos.moja) * rate(4, dt);
      efectos.oscuro += (lerp(0.3, 0.85, k) - efectos.oscuro) * rate(1, dt);
      TM.invul = Math.max(0, TM.invul - dt);
      // Peligros: cada vez más seguidos y con menos aviso
      if (TM.fase === 'juego') {
        TM.rT -= dt; if (TM.rT <= 0) { lanzarPeligro('rama'); TM.rT = lerp(1.8, 0.55, Math.pow(k, 0.9)) * (0.75 + Math.random() * 0.5); }
        TM.lT -= dt; if (TM.lT <= 0) { lanzarPeligro('rayo'); TM.lT = lerp(5, 2, k) * (0.8 + Math.random() * 0.4); }
      }
      for (let i = TM.peligros.length - 1; i >= 0; i--) {
        const z = TM.peligros[i]; if (!z) continue; // un golpe que acaba la partida vacía la lista a mitad del recorrido
        z.t += dt;
        const hd = Math.hypot(S.pos.x - z.x, S.pos.z - z.z);
        if (z.tipo === 'rama') {
          if (z.fase === 'aviso' && z.t >= z.aviso) { z.fase = 'cae'; z.rama.visible = true; z.vy = -6; }
          if (z.fase === 'cae') {
            z.vy -= 40 * dt; z.yr += z.vy * dt;
            if (!z.golpeo && hd < z.r && z.yr < S.pos.y + 1.9 && z.yr > S.pos.y - 0.6) { z.golpeo = true; golpe(z.x, z.z); }
            if (z.yr <= z.y0 + 0.2) { z.yr = z.y0 + 0.2; z.fase = 'suelo'; z.t = 0; sonar('r_rama'); G.fx.burst(z.x, z.y0 + 0.4, z.z, nivelAgua(z.x, z.z) > H(z.x, z.z) ? 'bubbles' : 'feathers', 10); if (nivelAgua(z.x, z.z) > H(z.x, z.z)) G.agua.splash(z.x, z.y0, z.z, 1.1); }
          }
          if (z.fase === 'suelo' && z.t > 0.9) { soltar(z.sombra); soltar(z.rama); TM.peligros.splice(i, 1); }
        } else {
          if (z.fase === 'aviso' && z.t >= z.aviso) {
            z.fase = 'rayo'; z.t = 0; z.rayo = desdePool('rayos', nuevoRayo); z.rayo.position.set(z.x, z.y0, z.z); z.rayo.scale.set(3.4, 34, 1);
            efectos.destello = 1; sonar('r_trueno'); G.camara.shake(0.18, 0.3);
            if (hd < z.r) golpe(z.x, z.z);
          }
          if (z.fase === 'rayo' && z.t > 0.35) { soltar(z.rayo); soltar(z.brillo); TM.peligros.splice(i, 1); }
        }
      }
      // Semillas: se recogen al pasar; seguidas (menos de 3 s entre una y otra) suben el combo
      TM.comboT = Math.max(0, TM.comboT - dt); if (TM.comboT <= 0) TM.combo = 0;
      for (let i = TM.semillas.length - 1; i >= 0; i--) {
        const s = TM.semillas[i];
        if (avance(s.x, s.z) < TM.frente - 1) { soltar(s.sp); TM.semillas.splice(i, 1); continue; }
        if (TM.fase === 'juego' && Math.hypot(S.pos.x - s.x, S.pos.z - s.z) < 2.2 && Math.abs(S.pos.y + 0.7 - s.y) < 2.6) {
          TM.combo = Math.min(9, TM.combo + 1); TM.comboT = T_TORMENTA.combo;
          const pts = (s.dorada ? 50 : 10) * TM.combo; TM.puntos += pts; TM.recogidas++;
          sonar(s.dorada ? 'r_dorada' : 'r_semilla', TM.combo);
          G.fx.burst(s.x, s.y, s.z, 'gold', s.dorada ? 22 : 10);
          if (TM.combo >= 2) aviso('+' + pts + '  ·  combo x' + TM.combo); else aviso('+' + pts);
          soltar(s.sp); TM.semillas.splice(i, 1);
        }
      }
      if (TM.fase === 'juego' && (TM.sT -= dt) <= 0) { TM.sT = 0.6; if (TM.semillas.length < 6) ponerSemilla(); }
      if (TM.fase === 'juego' && TM.t >= T_TORMENTA.dur) acabarTormenta(true);
      if (TM.fase === 'fin' && TM.finT > 1.4 && st.fase !== 'fin') mostrarResultadosTormenta();
      seguirCamara(dt, 0.9);
      efectos.fovExtra += (0 - efectos.fovExtra) * rate(3, dt);
    }
    function acabarTormenta(sobrevivio) {
      TM.fase = 'fin'; TM.finT = 0; TM.sobrevivio = sobrevivio;
      TM.bonus = sobrevivio ? 200 + 100 * TM.vidas : 0; TM.total = TM.puntos + TM.bonus;
      if (sobrevivio) { sonar('r_meta'); aviso('¡Escapaste!'); G.fx.burst(S.pos.x, S.pos.y + 1, S.pos.z, 'gold', 40); efectos.oscuro = 0.2; }
      else { sonar('r_fin_mal'); }
      for (const z of TM.peligros) { soltar(z.sombra); soltar(z.rama); soltar(z.brillo); soltar(z.rayo); } TM.peligros = [];
      const rec = leerRec(), r = rec.tormenta;
      TM.nuevo = TM.total > 0 && (!r.mejor || TM.total > r.mejor);
      r.jugadas = (r.jugadas || 0) + 1; if (TM.nuevo) r.mejor = TM.total; r.tiempo = Math.max(r.tiempo || 0, Math.round(TM.t));
      guardarRec(rec); TM.rec = r;
      G.emit('retosResultado', { modo: 'tormenta', sobrevivio, puntos: TM.total, prueba: claveRec !== ALMACEN });
    }
    function mostrarResultadosTormenta() {
      resultados(() => {
        const md = ui.medalla, tot = TM.total;
        const medalla = !TM.sobrevivio ? 'sin' : tot >= 1500 ? 'oro' : tot >= 800 ? 'plata' : 'bronce';
        md.className = 'rt-medalla ' + medalla; md.textContent = TM.sobrevivio ? '' + Math.round(TM.t) + 's' : '…';
        ui.finT.textContent = TM.sobrevivio ? '¡Escapaste de la tormenta!' : 'La tormenta te alcanzó';
        ui.nuevo.hidden = !TM.nuevo;
        ui.datos.innerHTML = `<div class="rt-dato"><small>Puntos</small>${tot}</div><div class="rt-dato"><small>Récord</small>${TM.rec.mejor || 0}</div>` +
          `<div class="rt-dato"><small>Semillas</small>${TM.recogidas}</div><div class="rt-dato"><small>${TM.sobrevivio ? 'Bono por plumas' : 'Aguantaste'}</small>${TM.sobrevivio ? '+' + TM.bonus : Math.round(TM.t) + ' s'}</div>`;
      });
    }
    function dibujarTormenta(dt) {
      if (TM.fase === 'nada') return;
      const a = TM.arena, now = performance.now() / 1000;
      // Frente (cortina) y techo de nubes sobre la parte cubierta
      const fx = a.x + a.dx * TM.frente, fz = a.z + a.dz * TM.frente, y0 = superficie(a.x, a.z);
      TM.cortina.position.set(fx, y0 + 17, fz);
      TM.techo.position.set(fx - a.dx * 80, y0 + 15, fz - a.dz * 80);
      TM.mapaCortina.offset.y += dt * 1.8; TM.mapaCortina.offset.x += dt * 0.05;
      for (const z of TM.peligros) {
        if (z.tipo === 'rama') {
          const k = z.fase === 'aviso' ? clamp(z.t / z.aviso, 0, 1) * 0.75 : z.fase === 'cae' ? 0.75 + 0.25 * clamp(1 - (z.yr - z.y0) / 22, 0, 1) : 1 - clamp(z.t / 0.9, 0, 1) * 0.6;
          z.sombra.scale.setScalar(z.r * 2.2 * (0.35 + 0.65 * k)); z.sombra.material.opacity = z.fase === 'suelo' ? 1 - z.t / 0.9 : 0.55 + 0.45 * k;
          if (z.rama.visible) { z.rama.position.set(z.x, z.yr, z.z); z.rama.rotation.x += dt * 2; }
        } else if (z.brillo && z.brillo.visible) {
          const k = z.fase === 'aviso' ? clamp(z.t / z.aviso, 0, 1) : 1;
          const parpadeo = 0.55 + 0.45 * Math.sin(now * (14 + k * 20));
          z.brillo.scale.setScalar(z.r * 2.4 * (0.5 + 0.5 * k)); z.brillo.material.opacity = (0.45 + 0.55 * k) * parpadeo;
          const col = z.brillo.getObjectByName('col'); col.scale.set(1, 1, 24); col.position.set(0, 0, 12); col.material.opacity = 0.08 + 0.18 * k * parpadeo;
          if (z.rayo) z.rayo.material.opacity = 1 - z.t / 0.35;
        }
      }
      for (const s of TM.semillas) { s.t += dt; s.sp.position.y = s.y + Math.sin(s.t * 2.4) * 0.25; s.sp.material.rotation = Math.sin(s.t * 1.7) * 0.3; }
      // Parpadeo de Vittata tras un golpe
      const pj = G.actores.player3D; if (pj) pj.root.visible = TM.invul <= 0 || Math.floor(now * 12) % 2 === 0;
      ui.tiempo.textContent = reloj(Math.max(0, T_TORMENTA.dur - TM.t));
      ui.puntos.textContent = String(TM.puntos);
      ui.combo.textContent = TM.combo >= 2 ? ' x' + TM.combo : '';
      chispasFx(dt);
    }

    // =================================================================================================================
    // Ganchos (se registran una vez; solo actúan con el modo activo)
    // =================================================================================================================
    G.on('update', dt => { if (st.activo && modo) modo.update(dt); }, 46);
    G.on('render', dt => {
      if (!st.activo) return;
      const comp = G.actores.companion3D; if (comp) comp.root.visible = false;
      if (modo) modo.render(dt);
    }, 16);

    // =================================================================================================================
    // AV.retosTest(): cada reto arranca, se cruzan los puntos en orden, termina, guarda el récord (en una clave aislada)
    // y la partida de la historia queda intacta (almacén real y G.S). Corre la simulación con G.renderer.update.
    // =================================================================================================================
    async function test() {
      const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
      const SV = G.guardado, claves = ['', '.tmp', '.prev'].map(s => SV.KEY + s);
      const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
      const comparable = d => { const o = {}; for (const k of SV.KEYS) o[k] = d && d[k]; return JSON.stringify(o); };
      const realAntes = claves.map(leer), sAntes = comparable(S), recReal = leer(ALMACEN), errores0 = (window.__aveErrores || []).length;
      const ce = console.error, errores = []; console.error = function () { errores.push(Array.from(arguments).join(' ')); return ce.apply(console, arguments); };
      const tick = (s, dt) => { dt = dt || 0.05; for (let i = 0, n = Math.ceil(s / dt); i < n; i++) R.update(dt); };
      const esperar = ms => new Promise(r => setTimeout(r, ms));
      const pausa0 = G.pausa.activa(), quiet0 = G.quiet;
      // Mundo libre para la prueba (otra batería pudo dejar algo abierto): se aparta y se devuelve al final
      const apartados = ['dialog', 'end', 'comic'].filter(id => $(id) && !$(id).hidden);
      apartados.forEach(id => { $(id).hidden = true; });
      if (G.ui.cardOpen) G.ui.hideCard();
      claveRec = ALMACEN + '.prueba';
      try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
      const busy0 = G.ui.busy, step0 = F.step;
      try {
        // ---------- Menú ----------
        check('Abre el menú de retos', abrir() && !ui.menu.hidden && ui.menu.querySelectorAll('[data-jugar]').length === 2);
        check('Con el menú abierto el mundo queda en pausa', G.pausa.activa());
        check('Abrir el menú no toca la partida', comparable(S) === sAntes && !st.activo);
        // ---------- Carrera ----------
        check('La carrera arranca', jugar('carrera') && st.activo && modo === CARRERA && C.fase === 'cuenta');
        check('El guardado queda suspendido y G.quiet activo', SV.save(true) === false && G.quiet === true);
        check('La historia ve el mundo ocupado; el vuelo no', G.ui.busy() === true && F.step !== step0);
        const Rr = ruta.R;
        check('Ruta de 6 puntos más la meta', Rr && Rr.puntos.length === 7 && Rr.puntos[6].meta, Rr && Rr.puntos.length);
        check('Ruta de 500 a 1100 m', Rr && Rr.largo > 500 && Rr.largo < 1100, Rr && Rr.largo);
        check('Una corriente de aire por tramo', C.corrientes.length === 7);
        let minAlto = Infinity; for (let s = 0; s < Rr.largo; s += 3) { const q = enRuta(s, {}); minAlto = Math.min(minAlto, q.y - superficie(q.x, q.z)); }
        check('La ruta pasa al menos a 5 m del suelo', minAlto > 5, minAlto.toFixed(1));
        await crearRivales();
        await esperar(30);
        check('Hay 3 rivales con otros plumajes', C.rivales.length === 3 && new Set(C.rivales.map(r => r.def.especie)).size === 3 && !C.rivales.some(r => r.def.especie === 'vittata'));
        let anillos = 0; C.grupo.traverse(o => { if (o.geometry && /Ring|Torus/.test(o.geometry.type)) anillos++; });
        check('Ningún anillo: cada punto es banderín y flor', !anillos && C.objetos.every(o => o.userData.flor && o.userData.tela), anillos);
        tick(1.0);
        check('Cuenta atrás: el jugador espera en la salida', C.fase === 'cuenta' && Math.hypot(S.pos.x - C.inicio.x, S.pos.z - C.inicio.z) < 0.5 && ui.cuenta.textContent !== '');
        tick(2.0);
        check('Tras 3-2-1 empieza la carrera', C.fase === 'juego' && C.t > 0);
        // Rivales avanzan; goma: muy por delante del jugador se frenan, muy por detrás aceleran
        const s0 = C.rivales.map(r => r.s); tick(4);
        check('Los rivales avanzan por la ruta', C.rivales.every((r, i) => r.s > s0[i] + 25), C.rivales.map(r => r.s.toFixed(0)).join('/'));
        check('Goma: muy por delante del jugador se frenan', C.rivales.every(r => r.v < r.def.base * 0.95), C.rivales.map(r => r.v.toFixed(1)).join('/'));
        modo.render(0.016);
        check('Puesto en el HUD con el jugador atrás: 4.º/4', puestoActual() === 4 && ui.pos.textContent === '4.º' && ui.posN.textContent === '/4', ui.pos.textContent);
        const sig0 = C.sig, sj0 = C.sJug; C.sig = 3; C.sJug = Rr.puntos[3].s - 1; tick(2);
        check('Goma: muy por detrás del jugador aceleran', C.rivales.every(r => r.v > r.def.base * 1.05), C.rivales.map(r => r.v.toFixed(1)).join('/'));
        modo.render(0.016);
        check('Puesto en el HUD con el jugador delante: 1.er/4', ui.pos.textContent === '1.er');
        C.sig = sig0; C.sJug = sj0;
        // Corriente: impulso medible
        const c0 = C.corrientes[1]; colocarJugador(c0.x - c0.tx * 12, c0.y, c0.z - c0.tz * 12, c0.tx, c0.tz); C.sJug = c0.s - 12; M.vx = c0.tx * 12; M.vz = c0.tz * 12;
        const v0 = Math.hypot(M.vx, M.vz); let vMax = 0; for (let i = 0; i < 20; i++) { tick(0.05); vMax = Math.max(vMax, Math.hypot(M.vx, M.vz)); }
        check('Atravesar una corriente de aire impulsa', C.ultCorriente === c0 && vMax > v0 + 6, v0.toFixed(1) + ' → ' + vMax.toFixed(1));
        // Puntos en orden: saltarse uno no cuenta
        const ir = (o) => { colocarJugador(o.x, o.y - 0.8, o.z, 1, 0); C.sJug = proyectar(o.x, o.z, C.sJug); tick(0.1); };
        C.sJug = 0; C.sig = 0;
        ir(C.objetos[2].userData);
        check('Saltarse un punto no cuenta', C.sig === 0);
        const marcas = [];
        for (let i = 0; i < 6; i++) { ir(C.objetos[i].userData); marcas.push(C.sig); }
        check('Se cruzan los 6 puntos en orden', marcas.join(',') === '1,2,3,4,5,6', marcas.join(','));
        check('El sonido del punto suena', A.log.includes('r_punto'));
        // Rivales lejos de la meta para que el jugador llegue primero
        C.rivales.forEach(r => { r.s = 100; r.llego = false; }); C.llegadas = [];
        ir(C.objetos[6].userData);
        check('Cruzar la meta termina la carrera', C.fase === 'fin' && C.puesto === 1, C.fase + ' ' + C.puesto);
        tick(2);
        check('Pantalla de resultados con medalla de oro', st.fase === 'fin' && !ui.fin.hidden && ui.medalla.classList.contains('oro'));
        const rec1 = JSON.parse(leer(claveRec) || 'null');
        check('Se guarda el récord de tiempo (clave aparte)', rec1 && rec1.v === 1 && rec1.carrera.mejor === Math.round(C.tiempo * 1000) && rec1.carrera.oros === 1, leer(claveRec));
        check('Primer récord marcado como nuevo', C.nuevo === true && !ui.nuevo.hidden);
        // «Otra vez» con Enter
        dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
        check('Enter en los resultados: otra vez', modo === CARRERA && C.fase === 'cuenta' && ui.fin.hidden && C.sig === 0);
        // Un tiempo peor no pisa el récord
        tick(3); C.t = 999; C.sig = 6; ir(C.objetos[6].userData);
        const rec2 = JSON.parse(leer(claveRec) || 'null');
        check('Un tiempo peor no cambia el récord', rec2.carrera.mejor === rec1.carrera.mejor && rec2.carrera.jugadas === 2 && !C.nuevo);
        // ---------- Tormenta ----------
        abrir();
        check('«Otro reto» vuelve al menú', !ui.menu.hidden && ui.fin.hidden);
        check('La tormenta arranca', jugar('tormenta') && modo === TORMENTA && TM.fase === 'cuenta' && C.fase === 'nada');
        check('Las cosas de la carrera se esconden', !C.grupo.visible && !C.rivales.length);
        tick(3);
        check('Tras 3-2-1 empieza la tormenta', TM.fase === 'juego');
        check('Hay semillas para recoger', TM.semillas.length >= 4, TM.semillas.length);
        // Una semilla junto al jugador suma puntos y la siguiente sube el combo
        // Una semilla sin otra al alcance (se recoge a menos de 2,2 m y 2,6 m de alto): salen al azar y, si dos caían juntas, un
        // solo paso recogía las dos y el combo subía de más (0 → 30 → 60, combo 3)
        const sola = () => TM.semillas.find(s => TM.semillas.every(o => o === s || Math.hypot(o.x - s.x, o.z - s.z) > 3 || Math.abs(o.y - s.y) > 3));
        const recoger = () => { const s = sola() || TM.semillas[0]; colocarJugador(s.x, s.y - 0.7, s.z, 0, -1); tick(0.05); };
        const p0 = TM.puntos; recoger(); const p1 = TM.puntos; recoger();
        check('Recoger semillas suma puntos', p1 > p0 && TM.recogidas === 2, p0 + ' → ' + p1 + ' → ' + TM.puntos);
        check('Seguidas suben el combo', TM.combo === 2, TM.combo);
        // Aviso antes del peligro: la sombra de la rama aparece antes de que caiga; el brillo, antes del rayo
        const a = TM.arena; colocarJugador(a.x, superficie(a.x, a.z) + 3, a.z, 0, -1);
        lanzarPeligro('rama'); const rama = TM.peligros[TM.peligros.length - 1];
        check('La rama se anuncia con su sombra (≥ 0,8 s antes)', rama && rama.sombra.visible && !rama.rama.visible && rama.aviso >= 0.8, rama && rama.aviso.toFixed(2));
        lanzarPeligro('rayo'); const rayo = TM.peligros[TM.peligros.length - 1];
        check('El rayo se anuncia con un brillo (≥ 0,9 s antes)', rayo && rayo.tipo === 'rayo' && rayo.brillo.visible && rayo.aviso >= 0.9);
        // Golpe: pierde una pluma y el combo; luego invulnerable un momento
        TM.invul = 0; const v0d = TM.vidas; golpe(S.pos.x + 1, S.pos.z);
        check('Un golpe quita una pluma y el combo', TM.vidas === v0d - 1 && TM.combo === 0 && TM.invul > 0);
        // La dificultad sube: más peligros por segundo al final
        const contar = t0 => { TM.t = t0; TM.vidas = 99; TM.invul = 99; TM.rT = TM.lT = 0; const n0 = TM.lanzados; tick(5); return TM.lanzados - n0; };
        const nIni = contar(1), nFin = contar(80);
        check('La dificultad sube poco a poco', nFin > nIni, nIni + ' → ' + nFin);
        check('El frente de la tormenta avanza', TM.frente > -T_TORMENTA.radio);
        // Final: aguantar los 90 s
        TM.vidas = 2; TM.invul = 0; TM.t = T_TORMENTA.dur - 0.1; tick(0.2);
        check('A los 90 s se escapa de la tormenta', TM.fase === 'fin' && TM.sobrevivio === true);
        tick(2);
        const rec3 = JSON.parse(leer(claveRec) || 'null');
        check('Resultados y récord de puntos', st.fase === 'fin' && !ui.fin.hidden && rec3.tormenta.mejor === TM.total && TM.total >= TM.puntos + 200, TM.total);
        // ---------- Salir ----------
        salir();
        check('Al salir se quitan las envolturas', G.ui.busy === busy0 && F.step === step0 && !document.body.classList.contains('retos-on'));
        check('Al salir G.quiet vuelve a como estaba', G.quiet === quiet0);
        check('La partida de la historia (G.S) queda intacta', comparable(S) === sAntes);
        check('El almacén de la partida no se escribió', claves.every((k, i) => leer(k) === realAntes[i]));
        check('El mundo no queda en pausa', G.pausa.activa() === pausa0);
        check('Récords reales intactos', leer(ALMACEN) === recReal);
        const nuevos = (window.__aveErrores || []).slice(errores0);
        check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
      } catch (e) {
        check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 400));
        try { salir(); } catch (e2) { /* ya fuera */ }
      } finally {
        console.error = ce;
        apartados.forEach(id => { $(id).hidden = false; });
        try { localStorage.removeItem(claveRec); } catch (e) { /* sin almacén */ }
        claveRec = ALMACEN;
      }
      return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
    }

    const api = G.retosApi = { abrir, jugar, salir, otraVez, test, get activo() { return st.activo; }, get fase() { return st.fase; }, get reto() { return st.reto; },
      _dev: { C, TM, ruta, lanzarPeligro, ponerSemilla, T_CARRERA, T_TORMENTA, efectos, enRuta, proyectar, superficie, rejillaAltos, construirRuta, datosCarrera } };
    return api;
  };
})();
