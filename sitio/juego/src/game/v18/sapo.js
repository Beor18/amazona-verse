/* Juego · V18.1 · tercera amenaza de fantasía: el Sapo Encantado (Kelvin 5-nov, docs/DECISION_LOG.md).
   Ficha en docs/equipo/V18_AMENAZAS.md. Es un sapo de FANTASÍA hecho de piedra y musgo, dormido; no es un sapo real ni el coquí
   (el coquí sigue siendo amigo y dato verdadero). Kelvin: «se resuelve despertándolo con semillas sincronizadas con sus
   ronquidos. Debe sentirse como un minijuego, no como una pelea».
   - Dónde: a la orilla de la Poza Honda del río (misiones.POOL del mapa); tapa la salida del agua. Sale después de deshacer la
     Serpiente de la Maraña.
   - Cómo se ve (sin modelos nuevos): un peñasco (la misma forma que la piedra del cap. 1) verde musgo, 2 ojos que se entreabren,
     una boca oscura que se abre al roncar y burbujas (fx.js). 3 draw calls.
   - El minijuego: ronca a ritmo (cada 2,4 s; más rápido con cada acierto). En cada ronquido abre la boca un momento. Acción
     lanza una semilla en arco a su boca (hay que estar a menos de 12 m): si llega con la boca ABIERTA, ¡ñam! (1 de 3);
     si llega cerrada, rebota y él ronca más fuerte: si estás posada cerca, el temblor te hace rebotar (mareo corto, sin daño).
     Tres semillas a tiempo: despierta, bosteza, se aparta de un salto y destapa el agua.
   - Premio (una vez): 1 piedra al inventario de siempre; el mundo recuerda que despertó.
   Solo con la bandera V18. Prueba: AV.v18SapoTest(). */
window.AVV18Sapo = function (G) {
  'use strict';
  if (G.v18sapo) return G.v18sapo;
  const S = G.S, V = G.v18, scene = G.renderer.scene;
  const ID = 'sapo_encantado', SEMILLAS = 3, R_EMPIEZA = 14, R_SALE = 34, R_TIRO = 12, PREMIO = { piedra: 1 };
  const TXT = {
    nombre: 'Sapo Encantado', empieza: 'Zzz… cinco minutitos más…', fin: '¡Ay, qué hambre tenía! Gracias, cotorrita.',
    gana: '¡El Sapo Encantado despertó y destapó el agua! Ganaste 1 piedra.', ganaOtra: '¡Despierto otra vez! Ya te llevaste su piedra.',
    nam: '¡Ñam!', rebota: 'Rebotó… ¡espera a que abra la boca!', lejos: 'Acércate un poco más al sapo.',
    guia: 'Lanza una semilla (Acción) cuando abra la boca al roncar', guiaT: 'Toca Acción cuando abra la boca al roncar',
    sale: 'Te alejaste: el sapo sigue roncando.', verbo: 'Semilla'
  };
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 2200); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18sapo', ev); } catch (e) { /* sin oyentes */ } };
  const H = (x, z) => G.terreno.height(x, z);
  const agua = (x, z) => { try { return G.agua && G.agua.levelAt ? G.agua.levelAt(x, z) : -Infinity; } catch (e) { return -Infinity; } };

  // ---------- Sitio: la orilla seca de la Poza Honda, del lado de Villa Raíz ----------
  function buscarSitio() {
    const M = (window.AV_MAPA_CAP1 && window.AV_MAPA_CAP1.misiones) || {}, P = M.POOL || { x: 30, z: -18 };
    const pl = G.terreno.places || {}, v = pl.villa || { x: 0, z: 0 };
    const a0 = Math.atan2(v.z - P.z, v.x - P.x);
    for (let r = 4; r <= 16; r += 1.5) for (let k = 0; k < 12; k++) {
      const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.35, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
      if (H(x, z) > agua(x, z) + 0.3) return { x, z, poza: { x: P.x, z: P.z } };
    }
    return { x: P.x + 6, z: P.z, poza: { x: P.x, z: P.z } };
  }
  let sitio = buscarSitio();

  // ---------- Escena ----------
  const cuerpo = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: '#5f7550', roughness: 1, metalness: 0, flatShading: true }));
  cuerpo.scale.set(1.25, 0.8, 1.05);
  const boca = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color: '#2a1a14' }));
  const ojos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe07a' }), 2);
  for (const m of [cuerpo, boca, ojos]) { m.frustumCulled = false; m.castShadow = false; m.visible = false; scene.add(m); }
  cuerpo.name = 'v18_sapo'; boca.name = 'v18_sapo_boca'; ojos.name = 'v18_sapo_ojos';
  const geoSemilla = new THREE.SphereGeometry(0.16, 8, 6), matSemilla = new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.8 });
  const _o = new THREE.Object3D();

  // ---------- Estado ----------
  const A = { fase: 'nada', t: 0, ritmo: 2.4, reloj: 0, abierta: 0, aciertos: 0, balas: [], empuje: null, manual: false, premio: false, salto: 0, ronquidos: 0 };
  const despierto = () => !!(V && V.mundo(ID) === 'despierto');
  const lista = () => !!(V && V.mundo('serpiente_marana') === 'deshecha'); // tercera amenaza: después de la Serpiente
  const ABRE = 0.8; // la boca queda abierta 0,8 s en cada ronquido
  const centroBoca = () => { const y = H(sitio.x, sitio.z); const dx = S.pos.x - sitio.x, dz = S.pos.z - sitio.z, n = Math.hypot(dx, dz) || 1; return { x: sitio.x + dx / n * 1.7, y: y + 0.9, z: sitio.z + dz / n * 1.7, ux: dx / n, uz: dz / n }; };

  function iniciar(o) {
    o = o || {};
    if ((despierto() || !lista()) && !o.forzar) return false;
    for (const otro of [G.v18combate, G.v18amenaza, G.v18serpiente]) { try { const f = otro && otro.estado && otro.estado().fase; if (f && f !== 'nada' && f !== 'disuelve' && f !== 'deshace') return false; } catch (e) { /* */ } }
    Object.assign(A, { fase: 'lucha', t: 0, ritmo: 2.4, reloj: o.reloj != null ? o.reloj : 0, abierta: 0, aciertos: 0, empuje: null, premio: false, salto: 0, ronquidos: 0 });
    quitarBalas(); cuerpo.visible = boca.visible = ojos.visible = true;
    enganchar(); toast(TXT.empieza, 2600); emitir({ tipo: 'empieza' });
    return true;
  }
  function salir(motivo) {
    if (A.fase !== 'lucha') return false;
    A.fase = 'nada'; quitarBalas(); soltar(); if (motivo) toast(motivo, 2400); emitir({ tipo: 'sale' }); return true;
  }
  // Acción: lanza una semilla en arco hacia la boca
  function lanzar() {
    if (A.fase !== 'lucha') return { ok: false, motivo: 'fase' };
    if (A.empuje && A.empuje.t > 0) return { ok: false, motivo: 'mareo' };
    if (A.balas.length >= 2) return { ok: false, motivo: 'espera' };
    const b0 = centroBoca(), d = Math.hypot(S.pos.x - b0.x, S.pos.z - b0.z);
    if (d > R_TIRO) { toast(TXT.lejos, 1400); return { ok: false, motivo: 'lejos', d }; }
    const vuelo = 0.35 + d / 22; // segundos hasta la boca
    const m = new THREE.Mesh(geoSemilla, matSemilla); m.position.set(S.pos.x, S.pos.y + 1, S.pos.z); scene.add(m);
    A.balas.push({ m, t: 0, dura: vuelo, de: { x: S.pos.x, y: S.pos.y + 1, z: S.pos.z } });
    sonar('dash'); emitir({ tipo: 'semilla', vuelo });
    return { ok: true, vuelo };
  }
  function quitarBalas() { for (const b of A.balas) scene.remove(b.m); A.balas.length = 0; }
  function llega() {
    const b = centroBoca();
    if (A.abierta > 0) {
      A.aciertos++; fx('gold', b.x, b.y + 0.4, b.z, 10); sonar('unlock'); emitir({ tipo: 'nam', n: A.aciertos });
      A.abierta = 0; A.ritmo = Math.max(1.6, A.ritmo - 0.3); // ¡ñam!: cierra la boca y ronca un poco más rápido
      if (A.aciertos >= SEMILLAS) { terminar(); return; }
      toast(TXT.nam + ' ' + A.aciertos + '/' + SEMILLAS, 1300);
    } else {
      fx('dust', b.x, b.y, b.z, 6); sonar('wrong'); toast(TXT.rebota, 1500); emitir({ tipo: 'rebota' });
      A.fuerte = true; // el próximo ronquido tiembla más
    }
  }
  function roncar() {
    A.ronquidos++; A.abierta = ABRE;
    const y = H(sitio.x, sitio.z); fx('bubbles', sitio.x, y + 2.2, sitio.z, A.fuerte ? 12 : 6); sonar('nido_chispa');
    const d = Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z), M = G.fisica && G.fisica.MOVE;
    if (A.fuerte && d < 7 && !(M && M.flying)) { // temblor: rebota si estás en el suelo cerca (sin daño)
      A.empuje = { x: (S.pos.x - sitio.x) / (d || 1) * 7, z: (S.pos.z - sitio.z) / (d || 1) * 7, t: 0.35 }; S.vy = Math.max(S.vy || 0, 4);
      emitir({ tipo: 'temblor' });
    }
    A.fuerte = false; emitir({ tipo: 'ronca' });
  }
  function terminar() {
    A.fase = 'despierta'; A.t = 0; quitarBalas();
    const nueva = !!(V && V.otorgar('amenaza_sapo', 'victoria_sapo', 1));
    if (V) V.cambiarMundo(ID, 'despierto');
    if (nueva) pagar();
    A.premio = nueva;
    toast(TXT.fin, 2800); setTimeout(() => toast(nueva ? TXT.gana : TXT.ganaOtra, 3400), G.quiet ? 0 : 2000);
    const y = H(sitio.x, sitio.z); fx('stars', sitio.x, y + 2, sitio.z, 16); fx('bubbles', sitio.poza.x, y + 0.5, sitio.poza.z, 20); sonar('unlock');
    emitir({ tipo: 'win', premio: nueva });
    soltar();
  }
  function pagar() {
    if (!S.inv) S.inv = {};
    for (const k in PREMIO) S.inv[k] = (S.inv[k] || 0) + PREMIO[k];
    try { G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* guardado */ }
  }

  // ---------- Entrada ----------
  let enganchado = false, modo0 = null;
  const modo = { activo: () => A.fase === 'lucha', accion: () => lanzar(), aviso: () => (TACTIL ? TXT.guiaT : TXT.guia), get verbo() { return TXT.verbo; } };
  function enganchar() { if (enganchado) return; enganchado = true; modo0 = G.interaccion.modo; G.interaccion.modo = modo; }
  function soltar() { if (!enganchado) return; enganchado = false; if (G.interaccion.modo === modo) G.interaccion.modo = modo0; }
  function libre() {
    const $ = id => document.getElementById(id), oculto = id => !$(id) || $(id).hidden;
    try {
      if ($('c1-fade') || (G.dialogo && G.dialogo.open && G.dialogo.open()) || G.ui.cardOpen || (G.ui.busy && G.ui.busy())) return false;
      return oculto('end') && oculto('comic') && oculto('creator');
    } catch (e) { return false; }
  }

  // ---------- Dibujo y paso ----------
  function dibujar() {
    const y = H(sitio.x, sitio.z), b = centroBoca();
    let dx = sitio.x, dz = sitio.z, dy = y + 1.1;
    if (A.fase === 'despierta') { // salto de lado hasta dejar libre la orilla
      const k = Math.min(1, A.t / 1.2); dx += b.uz * 4 * k; dz -= b.ux * 4 * k; dy += Math.sin(k * Math.PI) * 2.5;
    }
    const resp = A.fase === 'lucha' ? 1 + 0.05 * Math.sin(A.reloj / A.ritmo * Math.PI * 2) : 1;
    cuerpo.position.set(dx, dy, dz); cuerpo.scale.set(1.25 * resp, 0.8 * resp, 1.05 * resp); cuerpo.rotation.y = Math.atan2(b.ux, b.uz);
    const ab = A.fase === 'despierta' ? Math.max(0, 1 - A.t) : Math.min(1, A.abierta / 0.15);
    boca.position.set(dx + b.ux * 1.75, dy - 0.15, dz + b.uz * 1.75); boca.scale.set(1, 0.08 + 0.75 * ab, 0.5); boca.visible = cuerpo.visible;
    [-1, 1].forEach((s, i) => {
      _o.position.set(dx + b.ux * 1.4 - b.uz * 0.6 * s, dy + 0.85, dz + b.uz * 1.4 + b.ux * 0.6 * s);
      _o.scale.set(1, A.fase === 'despierta' ? 1 : A.fase === 'lucha' && A.abierta > 0 ? 0.45 : 0.12, 1); _o.updateMatrix(); ojos.setMatrixAt(i, _o.matrix);
    });
    ojos.instanceMatrix.needsUpdate = true;
  }
  function pasoBalas(dt) {
    const b = centroBoca();
    for (let i = A.balas.length - 1; i >= 0; i--) {
      const s = A.balas[i]; s.t += dt; const k = Math.min(1, s.t / s.dura);
      s.m.position.set(s.de.x + (b.x - s.de.x) * k, s.de.y + (b.y - s.de.y) * k + Math.sin(k * Math.PI) * 2.2, s.de.z + (b.z - s.de.z) * k);
      if (k >= 1) { scene.remove(s.m); A.balas.splice(i, 1); llega(); if (A.fase !== 'lucha') return; }
    }
  }
  function paso(dt) {
    A.t += dt;
    if (A.fase === 'despierta') { dibujar(); if (A.t > 1.6) { A.fase = 'nada'; cuerpo.visible = boca.visible = ojos.visible = false; } return; }
    const dc = Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z), ver = !despierto() && lista() && dc < 60;
    if (A.fase === 'nada') {
      cuerpo.visible = boca.visible = ojos.visible = ver;
      if (ver) { A.reloj += dt; dibujar(); }
      if (!A.manual && ver && dc < R_EMPIEZA && libre()) iniciar();
      return;
    }
    A.reloj += dt; if (A.reloj >= A.ritmo) { A.reloj -= A.ritmo; roncar(); }
    A.abierta = Math.max(0, A.abierta - dt);
    if (A.empuje && A.empuje.t > 0) { S.pos.x += A.empuje.x * dt; S.pos.z += A.empuje.z * dt; A.empuje.t -= dt; }
    pasoBalas(dt); if (A.fase !== 'lucha') return;
    if (dc > R_SALE) { salir(TXT.sale); return; }
    dibujar();
  }
  G.on('update', (dt, busy) => { if (A.manual || busy) return; paso(Math.min(dt, 0.1)); }, 74);
  G.on('apply', () => { if (A.fase === 'lucha') salir(); sitio = buscarSitio(); }, 50);
  setTimeout(() => { if (A.fase === 'nada') sitio = buscarSitio(); }, 4000);

  // =====================================================================================================================
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, inv0 = Object.assign({}, S.inv || {});
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = t => { toasts.push(String(t)); };
    const susp = G.guardado.suspender; if (susp) susp(true);
    const M = G.fisica && G.fisica.MOVE, fly0 = M && M.flying;
    A.manual = true;
    const correr = s => { for (let t = 0; t < s; t += 1 / 30) paso(1 / 30); };
    const ir = d => { S.pos.x = sitio.x + d; S.pos.z = sitio.z; S.pos.y = H(S.pos.x, S.pos.z); };
    // lanza para que la semilla llegue justo cuando abre (o cuando está cerrada)
    const aTiempo = abierta => { // lanza para que la semilla llegue 0,3 s después del ronquido (abierta) o 0,9 s antes (cerrada)
      const v = 0.35 + Math.hypot(S.pos.x - centroBoca().x, S.pos.z - centroBoca().z) / 22, antes = abierta ? v - 0.3 : v + 0.9;
      for (let k = 0; k < 400; k++) { const falta = A.ritmo - A.reloj; if (falta <= antes && falta > antes - 0.05) break; paso(1 / 30); }
      lanzar(); correr(v + 0.2);
    };
    try {
      V.borrar(); V.recargar();
      check('Sin la Serpiente deshecha no sale (es la tercera amenaza)', iniciar({}) === false);
      V.cambiarMundo('serpiente_marana', 'deshecha');
      ir(8); correr(0.1);
      check('Está a la orilla de la poza, en seco, y se ve (3 draw calls)', cuerpo.visible && ojos.visible && H(sitio.x, sitio.z) > agua(sitio.x, sitio.z));
      check('No empieza durante la apertura del capítulo', (() => { const f = document.createElement('div'); f.id = 'c1-fade'; document.body.appendChild(f); const r = libre(); f.remove(); return r === false; })());
      check('Empieza: «Zzz… cinco minutitos más…» y Acción lanza semillas', iniciar({}) && toasts.includes(TXT.empieza) && G.interaccion.modo === modo);
      ir(R_TIRO + 6);
      check('Lejos (más de 12 m) no se puede lanzar', lanzar().motivo === 'lejos');
      ir(8); if (M) M.flying = false;
      const r0 = A.ronquidos; correr(A.ritmo + 0.1);
      check('Ronca a ritmo y abre la boca en cada ronquido', A.ronquidos > r0);
      aTiempo(false);
      check('Semilla con la boca cerrada: rebota y no cuenta', A.aciertos === 0 && toasts.includes(TXT.rebota));
      ir(4); if (M) M.flying = false; const ex = S.pos.x; correr(A.ritmo + 0.5);
      check('...y el siguiente ronquido, más fuerte, te hace rebotar si estás posada cerca (sin daño)', Math.abs(S.pos.x - ex) > 0.5, 'movida ' + Math.abs(S.pos.x - ex).toFixed(2));
      ir(8); const ritmo0 = A.ritmo;
      aTiempo(true);
      check('Semilla que llega con la boca abierta: ¡ñam! (1/3) y ronca más rápido', A.aciertos === 1 && A.ritmo < ritmo0, 'aciertos ' + A.aciertos);
      aTiempo(true); aTiempo(true);
      check('Tres a tiempo lo despiertan: «¡Ay, qué hambre tenía! Gracias, cotorrita.»', A.aciertos === 3 && A.fase !== 'lucha' && toasts.includes(TXT.fin), 'aciertos ' + A.aciertos + ', fase ' + A.fase);
      check('Premio una vez: 1 piedra', (S.inv.piedra || 0) === (inv0.piedra || 0) + 1 && A.premio);
      correr(1.8);
      check('Se aparta de un salto, no vuelve y tras recargar sigue despierto', !cuerpo.visible && despierto() && iniciar({}) === false && (V.recargar(), despierto()));
      iniciar({ forzar: true }); ir(8); aTiempo(true); aTiempo(true); aTiempo(true);
      check('Repetirlo no da el premio otra vez', !A.premio && (S.inv.piedra || 0) === (inv0.piedra || 0) + 1);
      correr(1.8);
      iniciar({ forzar: true }); ir(R_SALE + 5); correr(0.1);
      check('Al alejarse se sale y suelta la Acción', A.fase === 'nada' && G.interaccion.modo !== modo);
      check('Es un minijuego: no hay plumas ni vida que quitar', !('plumas' in A));
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e); }
    if (A.fase === 'lucha') salir();
    A.fase = 'nada'; A.manual = false; quitarBalas(); cuerpo.visible = boca.visible = ojos.visible = false;
    if (M) M.flying = fly0;
    G.ui.toast = toast0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.inv = inv0; try { G.objetos.renderInv(); } catch (e) { /* */ }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  G.v18sapo = { ID, iniciar, salir, lanzar, paso, estado: () => A, get sitio() { return sitio; }, test };
  return G.v18sapo;
};
