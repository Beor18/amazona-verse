/* Amazona Verse · «Cotorras en línea» (Kelvin, 2026-11-09; docs/DECISION_LOG.md: «adelante con ese modelo»; va en la expansión)
   Volar junto a otras cotorras que tienen el mismo código de sala. Solo Realtime de Supabase (Broadcast + Presence en un canal):
   sin tablas, sin cuentas, nada se guarda. Apagado por defecto: este archivo y su config (en_linea_config.js) se cargan
   solo al pulsar «Jugar en línea» en la pausa (boot.js); sin abrirlo, el juego no toca la red.
   - Salas por código: 5 letras/números sin ambiguos (sin 0/O, 1/I/L). Tope de 8 cotorras por sala (la 9.ª no entra).
   - Lo único que se envía (CAMPOS): id al azar de esta partida (nuevo cada vez que se abre la página), especie de la cotorra,
     posición, rumbo, si vuela, el gesto en curso y el mundo (capítulo) para pintar solo a quien está en el mismo. Nada de
     nombres, chat, fotos ni correos; el único texto que escribe el jugador es el código de la sala.
   - ~8 envíos/s mientras se mueve (1/s quieta, para seguir viva); al recibir se interpola con ~150 ms de retraso. Una cotorra
     que calla 5 s se quita; Presence avisa al entrar y salir.
   - Las otras cotorras son instancias de AVCharacter (el mismo modelo que la rival del duelo, src/game/v18/combate.js) con su
     especie y sin accesorios, más un anillo de color flotante (sin nombres). Vittata (modelo y rig) no se toca. Con «bajo» o
     Modo Escuela se pintan como mucho 3 y su esqueleto se anima a medio ritmo; lejos (> 140 m) no se anima.
   - Sin red o con Supabase caído: aviso corto (toast) y el juego sigue igual; sin errores de consola.
   - Protocolo: el de Phoenix que usa Realtime (vsn 1.0.0: phx_join, heartbeat, broadcast, presence), mínimo y sin dependencias.
   API (G.enLinea): abrir(), cerrar(), crear(), unir(codigo), salir(), estado(), test(). Prueba: AV.enLineaTest(). */
(function () {
  'use strict';
  const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', LARGO = 5, MAX_SALA = 8;
  const CAMPOS = ['id', 'esp', 'x', 'y', 'z', 'rumbo', 'vuela', 'gesto', 'mundo'];
  const HZ = 8, HZ_QUIETA = 1, SILENCIO_MS = 5000, RETRASO_MS = 150, LEJOS = 140, JOIN_MS = 8000, LATIDO_MS = 25000;
  const reCodigo = new RegExp('^[' + ALFABETO + ']{' + LARGO + '}$');
  const azarId = () => { const a = new Uint8Array(8); try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 8; i++) a[i] = Math.random() * 256; } return Array.from(a, b => (b % 36).toString(36)).join(''); };
  const nuevoCodigo = () => { const a = new Uint8Array(LARGO); try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < LARGO; i++) a[i] = Math.random() * 256; } return Array.from(a, b => ALFABETO[b % ALFABETO.length]).join(''); };
  const limpiarCodigo = t => String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LARGO);

  // ---------- Transporte real: Phoenix (Realtime de Supabase) sobre WebSocket ----------
  // on: { abierto(), mensaje(evento, payload), presencia(estado|diff), cerrado(motivo) }. Nunca lanza: los fallos llegan a cerrado().
  function transporteReal(cfg) {
    return function (topic, clavePresencia, on) {
      let ws = null, ref = 0, joinRef = null, latido = 0, vivo = true, unido = false, timer = 0;
      const W = cfg.WebSocket || window.WebSocket;
      const enviar = (evento, payload, tema) => {
        if (!ws || ws.readyState !== 1) return false;
        if (ws.bufferedAmount > 32768) return false; // red lenta: se salta este envío (el siguiente trae la posición nueva)
        try { ws.send(JSON.stringify({ topic: tema || topic, event: evento, payload, ref: String(++ref), join_ref: tema ? undefined : joinRef })); return true; } catch (e) { return false; }
      };
      const fin = motivo => {
        if (!vivo) return; vivo = false; clearInterval(latido); clearTimeout(timer);
        if (ws) { ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null; try { ws.close(); } catch (e) { /* ya cerrado */ } }
        on.cerrado(motivo);
      };
      try {
        if (!W || (navigator.onLine === false)) { setTimeout(() => fin('sin_red'), 0); return { enviar() { return false; }, salir() { fin('salir'); } }; }
        ws = new W(cfg.ws + '?apikey=' + encodeURIComponent(cfg.clave) + '&vsn=1.0.0');
      } catch (e) { setTimeout(() => fin('sin_red'), 0); return { enviar() { return false; }, salir() { fin('salir'); } }; }
      timer = setTimeout(() => fin('tiempo'), JOIN_MS);
      ws.onopen = () => {
        joinRef = String(++ref);
        try {
          ws.send(JSON.stringify({ topic, event: 'phx_join', ref: joinRef, join_ref: joinRef,
            payload: { config: { broadcast: { self: false, ack: false }, presence: { key: clavePresencia, enabled: true }, private: false } } }));
        } catch (e) { fin('sin_red'); return; }
        latido = setInterval(() => enviar('heartbeat', {}, 'phoenix'), LATIDO_MS);
      };
      ws.onmessage = ev => {
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (!m || m.topic !== topic) return;
        if (m.event === 'phx_reply' && m.ref === joinRef) {
          if (m.payload && m.payload.status === 'ok') { unido = true; clearTimeout(timer); on.abierto(); } else fin('rechazo');
        } else if (m.event === 'broadcast' && m.payload) on.mensaje(m.payload.event, m.payload.payload);
        else if (m.event === 'presence_state') on.presencia({ estado: m.payload || {} });
        else if (m.event === 'presence_diff') on.presencia({ joins: (m.payload && m.payload.joins) || {}, leaves: (m.payload && m.payload.leaves) || {} });
        else if (m.event === 'phx_error' || m.event === 'phx_close') fin('servidor');
      };
      ws.onerror = () => { /* llega también onclose */ };
      ws.onclose = () => fin(unido ? 'perdida' : 'sin_red');
      return {
        enviar(evento, payload) { return unido && enviar('broadcast', { type: 'broadcast', event: evento, payload }); },
        presencia(meta) { return unido && enviar('presence', { type: 'presence', event: 'track', payload: meta }); },
        salir() { if (unido) enviar('phx_leave', {}); fin('salir'); },
      };
    };
  }

  // ---------- Transporte de prueba: un «servidor» en memoria con la misma forma (broadcast sin eco + presence) ----------
  function crearMock() {
    const salas = {};
    return function (topic, clave, on) {
      const sala = salas[topic] || (salas[topic] = new Map());
      let vivo = true;
      const yo = { on, meta: null };
      const fin = motivo => { if (!vivo) return; vivo = false; sala.delete(clave); if (yo.meta) for (const o of sala.values()) o.on.presencia({ joins: {}, leaves: { [clave]: { metas: [yo.meta] } } }); on.cerrado(motivo); };
      setTimeout(() => {
        if (!vivo) return; sala.set(clave, yo); on.abierto();
        const estado = {}; for (const [k, o] of sala) if (o.meta) estado[k] = { metas: [o.meta] };
        on.presencia({ estado });
      }, 5);
      return {
        enviar(evento, payload) { if (!vivo) return false; const copia = JSON.parse(JSON.stringify(payload)); for (const [k, o] of sala) if (k !== clave) setTimeout(() => o.on.mensaje(evento, copia), 1); return true; },
        presencia(meta) { if (!vivo) return false; yo.meta = Object.assign({}, meta); for (const [k, o] of sala) setTimeout(() => o.on.presencia({ joins: { [clave]: { metas: [yo.meta] } }, leaves: {} }), 1); return true; },
        salir() { fin('salir'); },
        cortar() { fin('perdida'); }, // la prueba simula que se cae la red
      };
    };
  }

  window.AVEnLinea = function (G) {
    if (G.enLinea) return G.enLinea;
    const S = G.S, $ = G.util.$, scene = G.renderer.scene;
    const CFG = window.AV_EN_LINEA_CFG || {};
    const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
    const TX = () => ({
      titulo: L('Jugar en línea', 'Play online'),
      intro: L('Vuela con otras cotorras que tengan el mismo código de sala. Solo se comparte tu cotorra y cómo se mueve: sin nombres ni chat.',
        'Fly with other parrots that have the same room code. Only your parrot and how it moves are shared: no names, no chat.'),
      crear: L('Crear sala', 'Create room'), codigo: L('Código de sala', 'Room code'), unir: L('Unirme', 'Join'),
      sala: L('Sala', 'Room'), comparte: L('Comparte este código con quien juegue contigo.', 'Share this code with whoever plays with you.'),
      cuantas: n => L(n === 1 ? 'Solo tú por ahora' : `${n} cotorras en la sala`, n === 1 ? 'Just you for now' : `${n} parrots in the room`),
      salir: L('Salir de la sala', 'Leave room'), cerrar: L('Seguir jugando', 'Keep playing'), conectando: L('Conectando…', 'Connecting…'),
      malCodigo: L('El código tiene 5 letras o números.', 'The code has 5 letters or numbers.'),
      sinRed: L('No se pudo conectar. El juego sigue sin conexión.', 'Could not connect. The game keeps going offline.'),
      perdida: L('Se perdió la conexión con la sala.', 'Lost the connection to the room.'),
      llena: L('Esa sala está llena (8 cotorras).', 'That room is full (8 parrots).'),
      entra: L('Llegó una cotorra a la sala', 'A parrot joined the room'), sale: L('Una cotorra salió de la sala', 'A parrot left the room'),
      dentro: c => L('Estás en la sala ' + c, 'You are in room ' + c), fuera: L('Saliste de la sala', 'You left the room'),
    });
    const toast = (t, ms) => { try { if (!G.quiet) G.ui.toast(t, ms || 2600); } catch (e) { /* sin HUD */ } };
    const yoId = azarId(); // nuevo en cada carga de la página: no identifica a nadie entre partidas

    // ---------- Estado ----------
    const E = { fase: 'fuera', codigo: '', canal: null, presentes: new Set(), enviados: 0, recibidos: 0, ultimoPayload: null, motivo: '' };
    let transporte = CFG.mock ? crearMock() : transporteReal(CFG);
    const pares = new Map(); // id → { id, esp, mundo, snaps: [{t,x,y,z,r,v,g}], ultimo, ch, cargando, marca, gesto, acum }

    function mundoActual() { return (G.pack && G.pack.id) || ''; }
    function miEspecie() {
      try { return (G.v18 && G.v18.seleccionada && G.v18.seleccionada()) || (S.profile && ((S.profile.look && S.profile.look.species) || S.profile.species)) || 'vittata'; } catch (e) { return 'vittata'; }
    }
    function miRumbo() { const p = G.actores && G.actores.player3D; if (p && p.root) return p.root.rotation.y; const f = S.facing || { x: 0, z: 1 }; return Math.atan2(f.x, f.z); }
    const r2 = v => Math.round(v * 100) / 100;
    // El payload sale de aquí y de ningún otro sitio: solo CAMPOS
    function miPayload() {
      const M = (G.fisica && G.fisica.MOVE) || {}, em = G.actores && G.actores.emote;
      return { id: yoId, esp: String(miEspecie()).slice(0, 24), x: r2(S.pos.x), y: r2(S.pos.y), z: r2(S.pos.z), rumbo: r2(miRumbo()),
        vuela: M.flying ? 1 : 0, gesto: (em && em.name) || '', mundo: mundoActual() };
    }
    // Lo recibido se valida campo a campo: lo que no cuadra se descarta
    function validar(p) {
      if (!p || typeof p !== 'object') return null;
      if (Object.keys(p).some(k => !CAMPOS.includes(k))) return null;
      if (typeof p.id !== 'string' || !/^[a-z0-9]{6,16}$/.test(p.id) || p.id === yoId) return null;
      for (const k of ['x', 'y', 'z', 'rumbo']) if (typeof p[k] !== 'number' || !isFinite(p[k]) || Math.abs(p[k]) > 1e5) return null;
      const esp = typeof p.esp === 'string' && /^[a-z_]{2,24}$/.test(p.esp) ? p.esp : 'vittata';
      const EM = (G.actores && G.actores.EMOTES) || {};
      const gesto = typeof p.gesto === 'string' && EM[p.gesto] ? p.gesto : '';
      const mundo = typeof p.mundo === 'string' && /^[a-z0-9_-]{1,24}$/.test(p.mundo) ? p.mundo : '';
      return { id: p.id, esp, x: p.x, y: p.y, z: p.z, rumbo: p.rumbo, vuela: p.vuela ? 1 : 0, gesto, mundo };
    }

    // ---------- Conectar / salir ----------
    function conectar(codigo) {
      if (E.fase !== 'fuera') salir(true);
      E.fase = 'conectando'; E.codigo = codigo; E.motivo = ''; E.presentes = new Set([yoId]); pintar();
      return new Promise(res => {
        let resuelto = false; const listo = v => { if (!resuelto) { resuelto = true; res(v); } };
        const canal = transporte('realtime:av1-sala-' + codigo, yoId, {
          abierto() {
            if (E.canal !== canal) return;
            E.fase = 'dentro'; canal.presencia({ id: yoId }); enviarAhora(); pintar(); toast(TX().dentro(codigo)); listo(true);
          },
          mensaje(ev, payload) { if (E.canal === canal && ev === 'p') recibir(payload); },
          presencia(d) {
            if (E.canal !== canal) return;
            if (d.estado) {
              E.presentes = new Set([yoId, ...Object.keys(d.estado)]);
              if (E.presentes.size > MAX_SALA) { E.motivo = 'llena'; toast(TX().llena, 3200); salir(true); listo(false); return; }
            }
            for (const k of Object.keys(d.joins || {})) if (!E.presentes.has(k)) { E.presentes.add(k); if (k !== yoId) toast(TX().entra, 1800); }
            for (const k of Object.keys(d.leaves || {})) { if (k === yoId) continue; E.presentes.delete(k); quitarPar(k); toast(TX().sale, 1800); }
            pintar();
          },
          cerrado(motivo) {
            if (E.canal !== canal) return;
            E.canal = null; limpiarPares();
            const antes = E.fase; E.fase = 'fuera'; E.motivo = E.motivo || motivo;
            if (motivo !== 'salir') toast(antes === 'dentro' ? TX().perdida : TX().sinRed, 3000);
            pintar(); listo(false);
          },
        });
        E.canal = canal;
      });
    }
    function salir(callado) {
      const c = E.canal; E.canal = null;
      if (c) try { c.salir(); } catch (e) { /* ya cerrado */ }
      const estaba = E.fase === 'dentro'; E.fase = 'fuera'; E.presentes = new Set(); limpiarPares(); pintar();
      if (estaba && !callado) toast(TX().fuera);
    }
    const crear = () => conectar(nuevoCodigo());
    function unir(t) { const c = limpiarCodigo(t); if (!reCodigo.test(c)) { toast(TX().malCodigo); return Promise.resolve(false); } return conectar(c); }

    // ---------- Enviar (throttle) ----------
    // Con el juego en pausa no hay cuadros: un latido de 1 s mantiene viva a esta cotorra para las demás (si no, a los 5 s se iría)
    let acumEnvio = 0, ultimoEnvio = null, desdeUltimo = 0, ultimoMs = 0;
    setInterval(() => { if (E.fase === 'dentro' && performance.now() - ultimoMs > 1000 / HZ_QUIETA) enviarAhora(); }, 1000);
    function enviarAhora() {
      if (!E.canal || E.fase !== 'dentro') return false;
      const p = miPayload();
      if (E.canal.enviar('p', p)) { E.enviados++; E.ultimoPayload = p; ultimoEnvio = p; desdeUltimo = 0; ultimoMs = performance.now(); return true; }
      return false;
    }
    function tickEnvio(dt) {
      if (E.fase !== 'dentro') return;
      acumEnvio += dt; desdeUltimo += dt;
      if (acumEnvio < 1 / HZ) return; acumEnvio = 0;
      if (document.hidden) return;
      const p = miPayload(), u = ultimoEnvio;
      const cambio = !u || Math.abs(p.x - u.x) + Math.abs(p.y - u.y) + Math.abs(p.z - u.z) > 0.02 || Math.abs(p.rumbo - u.rumbo) > 0.02 || p.vuela !== u.vuela || p.gesto !== u.gesto || p.esp !== u.esp || p.mundo !== u.mundo;
      if (cambio || desdeUltimo >= 1 / HZ_QUIETA) enviarAhora();
    }

    // ---------- Recibir y pintar a las demás ----------
    function recibir(raw) {
      const p = validar(raw); if (!p) return;
      E.recibidos++;
      let q = pares.get(p.id);
      if (!q) {
        if (pares.size >= MAX_SALA - 1) return;
        q = { id: p.id, esp: p.esp, mundo: p.mundo, snaps: [], ultimo: 0, ch: null, cargando: false, marca: null, gesto: '', acum: 0, vel: 0 };
        pares.set(p.id, q);
      }
      const t = performance.now();
      q.ultimo = t; q.mundo = p.mundo;
      if (q.esp !== p.esp) { q.esp = p.esp; if (q.ch) try { q.ch.applyLook({ species: p.esp, accessories: {} }); } catch (e) { /* piel */ } }
      q.snaps.push({ t, x: p.x, y: p.y, z: p.z, r: p.rumbo, v: p.vuela, g: p.gesto });
      if (q.snaps.length > 12) q.snaps.splice(0, q.snaps.length - 12);
    }
    const calidadBaja = () => { const c = G.renderer && G.renderer.calidad; return !!(c && (c.escuela === true || c.nivel === 'bajo')); };
    const tope = () => (calidadBaja() ? 3 : MAX_SALA - 1);
    let geoMarca = null;
    function colorDe(id) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return new THREE.Color().setHSL((h % 360) / 360, 0.75, 0.58); }
    function crearModelo(q) {
      if (q.ch || q.cargando || !window.AVCharacter || !window.AVCharacter.create) return;
      q.cargando = true;
      window.AVCharacter.create().then(ch => {
        q.cargando = false;
        if (pares.get(q.id) !== q) { try { window.AVCharacter.disposeObject(ch.root, true); } catch (e) { /* nada */ } return; }
        try { ch.applyLook({ species: q.esp, accessories: {} }); } catch (e) { /* piel por defecto */ }
        const alto = (G.pack.jugador && G.pack.jugador.altura) || 1.75;
        ch.root.scale.setScalar(alto / ch.height); ch.root.rotation.order = 'YXZ'; ch.root.name = 'en_linea_' + q.id;
        ch.root.userData.enLinea = true; ch.play('Idle');
        if (!geoMarca) geoMarca = new THREE.TorusGeometry(0.2, 0.045, 6, 18);
        const marca = new THREE.Mesh(geoMarca, new THREE.MeshBasicMaterial({ color: colorDe(q.id), depthWrite: false }));
        marca.name = 'en_linea_marca'; marca.userData.enLinea = true;
        scene.add(ch.root); scene.add(marca); q.ch = ch; q.marca = marca;
      }).catch(() => { q.cargando = false; });
    }
    function quitarModelo(q) {
      if (q.ch) { scene.remove(q.ch.root); try { window.AVCharacter.disposeObject(q.ch.root, true); } catch (e) { /* nada */ } try { q.ch.mixer && q.ch.mixer.stopAllAction(); } catch (e) { /* nada */ } q.ch = null; }
      if (q.marca) { scene.remove(q.marca); q.marca.material.dispose(); q.marca = null; }
    }
    function quitarPar(id) { const q = pares.get(id); if (!q) return; quitarModelo(q); pares.delete(id); }
    function limpiarPares() { for (const id of [...pares.keys()]) quitarPar(id); }
    const angLerp = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };
    function muestra(q, t) {
      const s = q.snaps; if (!s.length) return null;
      if (t <= s[0].t) return s[0];
      for (let i = s.length - 1; i > 0; i--) {
        const a = s[i - 1], b = s[i];
        if (t >= a.t && t <= b.t) { const k = (t - a.t) / Math.max(1, b.t - a.t); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k, r: angLerp(a.r, b.r, k), v: b.v, g: b.g }; }
      }
      return s[s.length - 1];
    }
    const _cam = new THREE.Vector3();
    function tickPares(dt) {
      const ahora = performance.now(), mundo = mundoActual(), lim = tope(), baja = calidadBaja();
      _cam.copy(G.renderer.camera.position);
      const visibles = [];
      for (const q of [...pares.values()]) {
        if (ahora - q.ultimo > SILENCIO_MS) { quitarPar(q.id); continue; }
        if (q.mundo !== mundo) { quitarModelo(q); continue; }
        const last = q.snaps[q.snaps.length - 1];
        visibles.push({ q, d: last ? (last.x - S.pos.x) ** 2 + (last.z - S.pos.z) ** 2 : 1e12 });
      }
      visibles.sort((a, b) => a.d - b.d);
      visibles.forEach(({ q }, i) => {
        if (i >= lim) { quitarModelo(q); return; }
        crearModelo(q);
        const ch = q.ch; if (!ch) return;
        const m = muestra(q, ahora - RETRASO_MS); if (!m) return;
        const root = ch.root, px = root.position.x, pz = root.position.z;
        root.position.set(m.x, m.y, m.z); root.rotation.y = m.r;
        const vel = dt > 0 ? Math.hypot(m.x - px, m.z - pz) / dt : 0; q.vel += (Math.min(vel, 30) - q.vel) * Math.min(1, dt * 6);
        const lejos = (m.x - _cam.x) ** 2 + (m.z - _cam.z) ** 2 > LEJOS * LEJOS;
        root.visible = true;
        if (q.marca) { q.marca.position.set(m.x, m.y + 2.35 + Math.sin(ahora / 400 + i) * 0.06, m.z); q.marca.rotation.y = ahora / 700; q.marca.visible = true; }
        if (lejos) return;
        q.acum += dt; if (baja && q.acum < 1 / 30) return; // «bajo»/Escuela: esqueleto a ~30 Hz como mucho
        const dta = q.acum; q.acum = 0;
        const EM = (G.actores && G.actores.EMOTES) || {}, em = m.g && EM[m.g];
        if (m.g !== q.gesto) { q.gesto = m.g; if (em && em.clip) ch.play(em.clip, true); }
        const suelo = G.terreno && G.terreno.height ? G.terreno.height(m.x, m.z) : m.y, enAire = m.v || m.y > suelo + 0.25, v = q.vel;
        Object.assign(ch, { speed: v, gait: enAire ? 0 : v > 4 ? 2 : v > 0.3 ? 1 : 0, airborne: enAire, flying: !!m.v, legsDown: m.v ? 0 : 1, swimming: false, diving: false,
          wingMode: m.v ? (v > 6 ? 'fly' : 'hover') : enAire ? 'flap' : v > 0.3 ? 'walk' : 'idle', expression: (em && em.face) || 'happy', mouth: null, lookAt: null,
          emote: (em && em.pose) || null, posado: '', agachada: 0, groundY: suelo, groundAt: null });
        try { ch.update(dta); } catch (e) { /* animación */ }
      });
    }
    const alRender = (dt) => { const d = Math.min(0.1, dt || 0); try { tickEnvio(d); if (pares.size) tickPares(d); } catch (e) { /* nunca rompe el cuadro */ } };
    G.on('render', alRender, 70);

    // ---------- Panel (encima del juego, con la pausa puesta) ----------
    let panel = null;
    function estilo() {
      if ($('en-linea-css')) return;
      const s = document.createElement('style'); s.id = 'en-linea-css';
      s.textContent = '#en-linea{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(6,16,12,.55);padding:16px}' +
        '#en-linea[hidden]{display:none}#en-linea .el-caja{background:var(--c-surface-solid,#132b21);color:var(--paper,#f4f7f1);border:2px solid var(--c-line,rgba(127,211,143,.4));border-radius:20px;padding:22px;max-width:420px;width:100%;display:grid;gap:12px;box-shadow:0 18px 50px rgba(0,0,0,.45)}' +
        '#en-linea h2{margin:0;font-size:1.4rem}#en-linea p{margin:0;color:var(--muted,#a9c2b1);line-height:1.4}#en-linea .el-fila{display:flex;gap:8px;flex-wrap:wrap}' +
        '#en-linea input{flex:1;min-width:0;font:inherit;font-size:1.4rem;letter-spacing:.3em;text-transform:uppercase;text-align:center;padding:10px;border-radius:12px;border:2px solid var(--c-line,#7fd38f);background:rgba(0,0,0,.25);color:inherit}' +
        '#en-linea .el-codigo{font-size:2.4rem;font-weight:800;letter-spacing:.3em;text-align:center;color:var(--gold,#ffd27a)}#en-linea .el-n{text-align:center}';
      document.head.appendChild(s);
    }
    function montar() {
      if (panel && document.contains(panel)) return panel;
      estilo();
      panel = document.createElement('div'); panel.id = 'en-linea'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'el-t');
      panel.innerHTML = '<div class="el-caja"><h2 id="el-t"></h2><p data-k="intro"></p>' +
        '<div data-k="fuera" class="el-caja-in" style="display:grid;gap:10px"><button class="btn xl" type="button" data-a="crear" data-icon="feather"></button>' +
        '<div class="el-fila"><input data-k="input" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text"><button class="btn" type="button" data-a="unir"></button></div></div>' +
        '<div data-k="dentro" style="display:grid;gap:8px"><p data-k="sala"></p><div class="el-codigo" data-k="codigo"></div><p class="el-n" data-k="n"></p><p data-k="comparte"></p><button class="btn warn" type="button" data-a="salir"></button></div>' +
        '<p data-k="conectando" aria-live="polite"></p><button class="btn ghost" type="button" data-a="cerrar" data-icon="play"></button></div>';
      const k = n => panel.querySelector('[data-k="' + n + '"]');
      panel.addEventListener('click', e => {
        const a = e.target.closest('[data-a]'); if (!a) { if (e.target === panel) cerrar(); return; }
        const acc = a.dataset.a;
        if (acc === 'crear') crear(); else if (acc === 'unir') unir(k('input').value); else if (acc === 'salir') salir(); else if (acc === 'cerrar') cerrar();
      });
      k('input').addEventListener('input', e => { const v = limpiarCodigo(e.target.value); if (v !== e.target.value) e.target.value = v; });
      k('input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); unir(e.target.value); } else if (e.key === 'Escape') cerrar(); });
      panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); cerrar(); } });
      document.body.appendChild(panel);
      return panel;
    }
    function pintar() {
      if (!panel) return;
      const T = TX(), k = n => panel.querySelector('[data-k="' + n + '"]'), b = n => panel.querySelector('[data-a="' + n + '"]');
      panel.querySelector('#el-t').textContent = T.titulo; k('intro').textContent = T.intro;
      b('crear').textContent = T.crear; b('unir').textContent = T.unir; b('salir').textContent = T.salir; b('cerrar').textContent = T.cerrar;
      k('input').setAttribute('aria-label', T.codigo); k('input').placeholder = T.codigo;
      k('fuera').style.display = E.fase === 'fuera' ? 'grid' : 'none';
      k('dentro').style.display = E.fase === 'dentro' ? 'grid' : 'none';
      k('conectando').textContent = E.fase === 'conectando' ? T.conectando : '';
      k('sala').textContent = T.sala; k('codigo').textContent = E.codigo; k('comparte').textContent = T.comparte;
      k('n').textContent = T.cuantas(Math.max(1, E.presentes.size));
      b('crear').disabled = b('unir').disabled = E.fase === 'conectando';
    }
    function abrir() {
      montar(); pintar(); panel.hidden = false;
      try { G.pausa && G.pausa.set('enlinea', true); } catch (e) { /* sin pausa */ }
      setTimeout(() => { const f = panel.querySelector(E.fase === 'dentro' ? '[data-a="cerrar"]' : '[data-a="crear"]'); if (f && !panel.hidden) f.focus({ preventScroll: true }); }, 0);
    }
    function cerrar() {
      if (panel) panel.hidden = true;
      try { G.pausa && G.pausa.set('enlinea', false); } catch (e) { /* sin pausa */ }
    }
    G.on('apply', () => pintar(), 92);

    // ---------- Prueba: AV.enLineaTest({ real: true|false }) ----------
    // Dos clientes en la misma sala: este juego y una «cotorra bot» (solo protocolo, sin juego) con su propio transporte. Con
    // real (por defecto si hay red) van al Realtime de Supabase de verdad; si no, al transporte en memoria.
    async function test(o) {
      o = o || {};
      const res = [], check = (name, ok, info) => res.push({ name, ok: !!ok, info: info == null ? '' : String(info) });
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const espera = async (f, ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (f()) return true; await sleep(50); } return !!f(); };
      const antesT = transporte, quietAntes = G.quiet; G.quiet = true;
      const posAntes = { x: S.pos.x, y: S.pos.y, z: S.pos.z };
      const real = o.real != null ? !!o.real : (navigator.onLine !== false && !!CFG.ws);
      let modo = real ? 'real' : 'mock';
      try {
        salir(true);
        // 0. Sin conexión (WebSocket que falla al instante): aviso, vuelta a «fuera» y nada en la escena
        transporte = transporteReal(Object.assign({}, CFG, { WebSocket: function () { const w = { readyState: 3, send() {}, close() {} }; setTimeout(() => w.onclose && w.onclose({}), 5); return w; } }));
        const okOff = await conectar(nuevoCodigo());
        check('Sin conexión: falla en silencio y el juego sigue (fase «fuera», sin cotorras)', !okOff && E.fase === 'fuera' && !E.canal && pares.size === 0, E.motivo);
        // 1. Unirse: este juego crea la sala y el bot entra con el código
        const mock = crearMock();
        const T = () => (modo === 'real' ? transporteReal(CFG) : mock);
        transporte = T();
        let ok = await conectar(nuevoCodigo());
        if (!ok && modo === 'real') { modo = 'mock'; transporte = T(); ok = await conectar(nuevoCodigo()); }
        check('Crear sala (' + modo + '): código de 5 sin ambiguos y dentro', ok && E.fase === 'dentro' && reCodigo.test(E.codigo), E.codigo);
        const botId = azarId(), botRecibe = [], botPres = new Set();
        let botAbierto = false;
        const bot = T()('realtime:av1-sala-' + E.codigo, botId, {
          abierto() { botAbierto = true; }, mensaje(ev, p) { if (ev === 'p') botRecibe.push(p); },
          presencia(d) { if (d.estado) for (const k of Object.keys(d.estado)) botPres.add(k); for (const k of Object.keys(d.joins || {})) botPres.add(k); for (const k of Object.keys(d.leaves || {})) botPres.delete(k); },
          cerrado() { botAbierto = false; },
        });
        await espera(() => botAbierto, 8000);
        bot.presencia({ id: botId });
        check('La otra cotorra entra con el código (presence en los dos lados)', await espera(() => E.presentes.has(botId) && botPres.has(yoId), 6000), [...E.presentes].length + ' en la sala');
        // 2. El bot vuela en círculo junto a Vittata; aquí se ve y se mueve
        const base = { x: S.pos.x + 3, z: S.pos.z + 2 }, especieBot = 'agilis';
        let paso = 0;
        const mueve = setInterval(() => { paso++; const a = paso * 0.15; bot.enviar('p', { id: botId, esp: especieBot, x: base.x + Math.cos(a) * 2, y: S.pos.y + 1.5, z: base.z + Math.sin(a) * 2, rumbo: a, vuela: 1, gesto: '', mundo: mundoActual() }); }, 1000 / HZ);
        const visto = await espera(() => { const q = pares.get(botId); return q && q.ch && q.ch.root.parent === scene; }, 15000);
        const q = pares.get(botId);
        check('Aquí se ve a la otra cotorra (modelo en la escena, con su especie y anillo)', visto && q.esp === especieBot && !!q.marca && q.marca.parent === scene, q ? q.esp : 'no llegó');
        const p0 = q && q.ch ? q.ch.root.position.clone() : null;
        await sleep(700);
        const p1 = q && q.ch ? q.ch.root.position.clone() : null;
        check('Y se mueve, interpolada', p0 && p1 && p0.distanceTo(p1) > 0.3 && q.ch.flying, p0 && p1 ? p0.distanceTo(p1).toFixed(2) + ' m en 0,7 s' : '');
        // 3. El bot ve a este juego moverse
        const n0 = botRecibe.length;
        S.pos.x += 1.5; await sleep(600); S.pos.x += 1.5; await sleep(600);
        const mios = botRecibe.slice(n0);
        check('La otra cotorra recibe a esta y la ve moverse', mios.length >= 2 && Math.abs(mios[mios.length - 1].x - mios[0].x) > 1, mios.length + ' mensajes');
        // 4. Solo los campos permitidos, y nada más
        const todos = botRecibe.concat(E.ultimoPayload ? [E.ultimoPayload] : []);
        const malos = todos.filter(p => Object.keys(p).some(k => !CAMPOS.includes(k)) || CAMPOS.some(k => !(k in p)));
        check('El mensaje lleva solo id, especie, posición, rumbo, vuelo, gesto y mundo', todos.length > 0 && malos.length === 0 && todos[0].id === yoId && /^[a-z0-9]{6,16}$/.test(todos[0].id), Object.keys(todos[0] || {}).join(','));
        check('Ritmo de envío ≤ 10 por segundo', mios.length <= 14, mios.length + ' en 1,2 s');
        // 5. Lo raro que llegue se descarta
        const nAntes = pares.size;
        recibir({ id: 'zzzzzzzz', esp: 'vittata', x: 0, y: 0, z: 0, rumbo: 0, vuela: 0, gesto: '', mundo: mundoActual(), nombre: 'Ana' });
        recibir({ id: 'yyyyyyyy', esp: 'vittata', x: NaN, y: 0, z: 0, rumbo: 0, vuela: 0, gesto: '', mundo: mundoActual() });
        check('Se descarta lo que trae campos de más (p. ej. un nombre) o números raros', pares.size === nAntes);
        // 6. Otro mundo: no se pinta
        clearInterval(mueve);
        bot.enviar('p', { id: botId, esp: especieBot, x: base.x, y: S.pos.y, z: base.z, rumbo: 0, vuela: 0, gesto: '', mundo: 'otro_mundo' });
        check('Si está en otro capítulo no se pinta', await espera(() => { const r = pares.get(botId); return r && !r.ch; }, 3000));
        // 7. Presencia: al salir el bot, se quita
        bot.salir();
        check('Cuando la otra sale de la sala, desaparece', await espera(() => !pares.has(botId) && !E.presentes.has(botId), 6000));
        // 8. Calidad baja: tope de 3
        const cal = G.renderer.calidad, escAntes = cal && cal.escuela;
        if (cal) cal.escuela = true;
        check('Modo Escuela/«bajo»: como mucho 3 cotorras pintadas', tope() === 3);
        if (cal) cal.escuela = escAntes;
        // 9. Silencio de 5 s: se quita sola (con un reloj adelantado)
        recibir({ id: 'abcdef12', esp: 'vittata', x: S.pos.x + 2, y: S.pos.y, z: S.pos.z, rumbo: 0, vuela: 0, gesto: 'saludar', mundo: mundoActual() });
        const qs = pares.get('abcdef12'); if (qs) qs.ultimo -= SILENCIO_MS + 100;
        tickPares(0.016);
        check('Una cotorra que calla 5 s se quita', !!qs && !pares.has('abcdef12'));
        // 10. Salir limpia: ni modelos ni marcas en la escena
        recibir({ id: 'abcdef34', esp: 'vittata', x: S.pos.x + 2, y: S.pos.y, z: S.pos.z, rumbo: 0, vuela: 0, gesto: '', mundo: mundoActual() });
        await espera(() => { const r = pares.get('abcdef34'); return r && r.ch; }, 8000);
        salir(true);
        let quedan = 0; scene.traverse(x => { if (x.userData && x.userData.enLinea) quedan++; });
        check('Salir de la sala quita todos los modelos y marcas', E.fase === 'fuera' && pares.size === 0 && quedan === 0, quedan + ' objetos');
        // 11. El panel: abre y cierra con la pausa
        abrir(); const abierto = !panel.hidden && G.pausa.motivos.has('enlinea'); cerrar();
        check('El panel «Jugar en línea» abre con pausa y cierra', abierto && panel.hidden && !G.pausa.motivos.has('enlinea'));
        check('Códigos: sin letras ambiguas y se limpia lo escrito', limpiarCodigo(' ab-c2d9 x') === 'ABC2D' && !/[01OIL]/.test(ALFABETO));
      } catch (e) {
        check('Sin excepciones', false, e && e.message);
      } finally {
        salir(true); transporte = antesT; G.quiet = quietAntes;
        S.pos.x = posAntes.x; S.pos.y = posAntes.y; S.pos.z = posAntes.z;
      }
      return { passed: res.filter(r => r.ok).length, total: res.length, results: res, modo };
    }

    const api = { abrir, cerrar, crear, unir, salir, test, CAMPOS, crearMock,
      estado: () => ({ fase: E.fase, codigo: E.codigo, presentes: E.presentes.size, pares: pares.size, pintadas: [...pares.values()].filter(q => q.ch).length, enviados: E.enviados, recibidos: E.recibidos, id: yoId }),
      usarTransporte(t) { transporte = t === 'mock' ? crearMock() : typeof t === 'function' ? t : transporteReal(CFG); } };
    G.enLinea = api;
    return api;
  };
})();
