/* Juego · V18.1 · segunda amenaza de fantasía: la Serpiente de la Maraña (Kelvin 5-nov, docs/DECISION_LOG.md).
   Ficha en docs/equipo/V18_AMENAZAS.md. No es una serpiente de verdad (la boa de Puerto Rico no se toca): son los bejucos
   grises de la Maraña (src/game/marana.js, CG-46) cuando se juntan y se enroscan. Gruñona, le gusta lo enredado.
   Kelvin: «su desafío principal será desenredar nudos utilizando movimientos y precisión, no simplemente quitarle vida».
   - Dónde: en un rastro de la Maraña que no esté limpio (G.marana.rastros); sale después de dispersar la Sombra de Tormenta.
   - Cómo se ve (sin modelos nuevos): 1 InstancedMesh de bejucos (esferas en espiral que se enroscan y giran despacio),
     1 InstancedMesh de nudos (4) y 2 ojos verdes. 3 draw calls, solo cerca.
   - El reto: 4 nudos repartidos por la espiral, a distinta altura. Hay que LLEGAR volando o a pie a cada uno (la espiral gira,
     así que los nudos se mueven) y pulsar Acción cuando el nudo BRILLA (cada pocos segundos, un momento). Hay que hacerlos en
     orden (el que toca brilla en dorado). Acción a destiempo o lejos: un bejuco te aparta (empujón y mareo corto, sin daño).
     Cada nudo suelto la hace girar más rápido. Con el último, se deshace en hojas y el rastro queda limpio.
   - Premio (una vez): 1 madera al inventario de siempre; el mundo recuerda que se deshizo.
   Solo con la bandera V18. Prueba: AV.v18SerpienteTest(). */
window.AVV18Serpiente = function (G) {
  'use strict';
  if (G.v18serpiente) return G.v18serpiente;
  const S = G.S, V = G.v18, scene = G.renderer.scene;
  const ID = 'serpiente_marana', NUDOS = 4, R_EMPIEZA = 14, R_SALE = 34, R_NUDO = 2.6, PREMIO = { madera: 1 };
  const TXT = {
    nombre: 'Serpiente de la Maraña', empieza: 'Shhh… todo está mejor enredado.', fin: 'Ya vendré a enredar otro día…',
    gana: '¡Desenredaste la Maraña! Ganaste 1 madera.', ganaOtra: '¡Desenredada otra vez! Ya te llevaste su madera.',
    suelto: '¡Nudo suelto!', espera: '¡Espera a que brille!', lejos: 'Acércate más al nudo dorado.',
    guia: 'Vuela al nudo dorado y pulsa Acción cuando brille', guiaT: 'Ve al nudo dorado y toca Acción cuando brille',
    sale: 'Te alejaste: la Maraña se vuelve a enredar.', verbo: 'Desenredar'
  };
  const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const sonar = (n, a) => { try { G.audio.play(n, a); } catch (e) { /* sin audio */ } };
  const toast = (t, ms) => { try { G.ui.toast(t, ms || 2400); } catch (e) { /* sin interfaz */ } };
  const fx = (k, x, y, z, n) => { try { G.fx.burst(x, y, z, k, n || 8); } catch (e) { /* sin fx */ } };
  const emitir = ev => { try { G.emit('v18serpiente', ev); } catch (e) { /* sin oyentes */ } };
  const altura = (x, z) => G.terreno.height(x, z);

  // ---------- Sitio: un rastro de la Maraña sin limpiar (el más cerca de Villa Raíz) ----------
  function buscarSitio() {
    const pl = G.terreno.places || {}, v = pl.villa || pl.plaza || { x: S.pos.x, z: S.pos.z };
    const R = (G.marana && G.marana.rastros) || [];
    let mejor = null;
    for (const r of R) { if (r.limpio || r.inliminable) continue; const d = Math.hypot(r.x - v.x, r.z - v.z); if (!mejor || d < mejor.d) mejor = { x: r.x, z: r.z, d, r }; }
    return mejor ? { x: mejor.x, z: mejor.z, rastro: mejor.r } : { x: v.x - 22, z: v.z + 18, rastro: null };
  }
  let sitio = buscarSitio();

  // ---------- Escena ----------
  const NB = (G.renderer.REDUCED ? 22 : 34);
  const bejucos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 8, 6), new THREE.MeshLambertMaterial({ color: '#6f7a66' }), NB);
  const matNudo = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: false });
  const nudos = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 0), matNudo, NUDOS);
  const ojos = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: '#7dff9a' }), 2);
  for (const m of [bejucos, nudos, ojos]) { m.frustumCulled = false; m.castShadow = m.receiveShadow = false; m.visible = false; scene.add(m); }
  bejucos.name = 'v18_serpiente'; nudos.name = 'v18_serpiente_nudos'; ojos.name = 'v18_serpiente_ojos';
  const colNudo = { apagado: new THREE.Color('#8a8f78'), toca: new THREE.Color('#ffd84a'), brilla: new THREE.Color('#fff7c2'), suelto: new THREE.Color('#5c6b50') };
  const _o = new THREE.Object3D();

  // ---------- Estado ----------
  const A = { fase: 'nada', t: 0, giro: 0, vel: 0.35, siguiente: 0, sueltos: [false, false, false, false], brillo: 0, ciclo: 0, empuje: null, manual: false, premio: false, escala: 1 };
  const deshecha = () => !!(V && V.mundo(ID) === 'deshecha');
  const lista = () => !!(V && V.mundo('sombra_tormenta') === 'dispersa'); // segunda amenaza: después de la Sombra
  // Espiral: radio 1,6 m alrededor del tronco, de 0,6 a 7 m de alto; los nudos van a alturas 1,2 · 3 · 4,8 · 6,4 m
  const ALTOS = [1.2, 3.0, 4.8, 6.4];
  // out y y0 opcionales (QA-200): dibujar() reutiliza objetos de trabajo y consulta la altura una vez por cuadro
  function puntoEspiral(u, giro, out, y0) { const a = u * Math.PI * 5 + giro, h = 0.6 + u * 6.6; const p = out || {}; p.x = sitio.x + Math.cos(a) * 1.6; p.y = (y0 === undefined ? altura(sitio.x, sitio.z) : y0) + h; p.z = sitio.z + Math.sin(a) * 1.6; return p; }
  function posNudo(i, out, y0) { const u = (ALTOS[i] - 0.6) / 6.6; const p = puntoEspiral(u, A.giro, out, y0); const a = u * Math.PI * 5 + A.giro; p.x += Math.cos(a) * 0.5; p.z += Math.sin(a) * 0.5; return p; }
  const _pt = { x: 0, y: 0, z: 0 };
  // Brillo: ventana de 1,1 s cada 2,6 s (más corta con cada nudo suelto: más precisión)
  const PERIODO = 2.6, ventana = () => Math.max(0.65, 1.1 - 0.12 * A.siguiente);
  const brilla = () => A.ciclo < ventana();

  function iniciar(o) {
    o = o || {};
    if ((deshecha() || !lista()) && !o.forzar) return false;
    if (G.v18combate && G.v18combate.estado && G.v18combate.estado().fase !== 'nada') return false;
    if (G.v18amenaza && G.v18amenaza.estado && G.v18amenaza.estado().fase === 'lucha') return false;
    Object.assign(A, { fase: 'lucha', t: 0, vel: 0.35, siguiente: 0, sueltos: [false, false, false, false], ciclo: 0, empuje: null, premio: false, escala: 1 });
    bejucos.visible = nudos.visible = ojos.visible = true;
    enganchar(); toast(TXT.empieza, 2600); sonar('nido_chispa'); emitir({ tipo: 'empieza' });
    return true;
  }
  function salir(motivo) {
    if (A.fase !== 'lucha') return false;
    A.fase = 'nada'; soltar(); if (motivo) toast(motivo, 2600); emitir({ tipo: 'sale' }); return true;
  }
  // Acción: soltar el nudo que toca si estás cerca y brilla; si no, un bejuco te aparta
  function accion() {
    if (A.fase !== 'lucha') return { ok: false, motivo: 'fase' };
    if (A.empuje && A.empuje.t > 0) return { ok: false, motivo: 'mareo' };
    const i = A.siguiente, p = posNudo(i), d = Math.hypot(S.pos.x - p.x, (S.pos.y + 0.8 - p.y) * 0.8, S.pos.z - p.z);
    if (d > R_NUDO) { latigo(TXT.lejos); return { ok: false, motivo: 'lejos', d }; }
    if (!brilla()) { latigo(TXT.espera); return { ok: false, motivo: 'destiempo' }; }
    A.sueltos[i] = true; A.siguiente++; A.vel += 0.18;
    fx('leaves', p.x, p.y, p.z, 14); fx('stars', p.x, p.y, p.z, 8); sonar('unlock');
    emitir({ tipo: 'nudo', n: A.siguiente });
    if (A.siguiente >= NUDOS) terminar(); else toast(TXT.suelto + ' ' + A.siguiente + '/' + NUDOS, 1600);
    return { ok: true, n: A.siguiente };
  }
  function latigo(txt) {
    const dx = S.pos.x - sitio.x, dz = S.pos.z - sitio.z, d = Math.hypot(dx, dz) || 1;
    A.empuje = { x: dx / d * 6, z: dz / d * 6, t: 0.4 };
    fx('leaves', S.pos.x, S.pos.y + 1, S.pos.z, 6); sonar('wrong'); toast(txt, 1500);
    emitir({ tipo: 'latigo' });
  }
  function terminar() {
    A.fase = 'deshace'; A.t = 0;
    const nueva = !!(V && V.otorgar('amenaza_serpiente', 'victoria_serpiente', 1));
    if (V) V.cambiarMundo(ID, 'deshecha');
    if (nueva) pagar();
    A.premio = nueva;
    try { if (sitio.rastro && G.marana && G.marana.limpiar) G.marana.limpiar(sitio.rastro); } catch (e) { /* sin maraña */ }
    toast(TXT.fin, 2600); setTimeout(() => toast(nueva ? TXT.gana : TXT.ganaOtra, 3400), G.quiet ? 0 : 1800);
    fx('leaves', sitio.x, altura(sitio.x, sitio.z) + 3, sitio.z, 30); fx('gold', sitio.x, altura(sitio.x, sitio.z) + 3, sitio.z, 18); sonar('unlock');
    emitir({ tipo: 'win', premio: nueva });
    soltar();
  }
  function pagar() {
    if (!S.inv) S.inv = {};
    for (const k in PREMIO) S.inv[k] = (S.inv[k] || 0) + PREMIO[k];
    try { G.objetos.renderInv(); } catch (e) { /* HUD */ }
    try { if (G.guardado.save) G.guardado.save(true); else G.guardado.autosave(); } catch (e) { /* guardado */ }
  }

  // ---------- Entrada (Acción) ----------
  let enganchado = false, modo0 = null;
  const modo = { activo: () => A.fase === 'lucha', accion: () => accion(), aviso: () => (TACTIL ? TXT.guiaT : TXT.guia), get verbo() { return TXT.verbo; } };
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
    const k = A.escala, y0 = altura(sitio.x, sitio.z);
    for (let i = 0; i < NB; i++) {
      const p = puntoEspiral(i / (NB - 1), A.giro, _pt, y0);
      _o.position.set(sitio.x + (p.x - sitio.x) * k, p.y, sitio.z + (p.z - sitio.z) * k);
      _o.scale.setScalar(Math.max(0.01, (1 - 0.35 * i / NB) * (A.fase === 'deshace' ? Math.max(0, 1 - A.t / 1.3) : 1)));
      _o.updateMatrix(); bejucos.setMatrixAt(i, _o.matrix);
    }
    bejucos.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NUDOS; i++) {
      const p = posNudo(i, _pt, y0), suelto = A.sueltos[i], toca = i === A.siguiente && A.fase === 'lucha';
      _o.position.set(p.x, p.y, p.z); _o.rotation.set(A.t * 2, A.t * 3, 0);
      _o.scale.setScalar(suelto ? 0.01 : toca && brilla() ? 1.35 : toca ? 1.1 : 0.85); _o.updateMatrix(); nudos.setMatrixAt(i, _o.matrix);
      nudos.setColorAt(i, suelto ? colNudo.suelto : toca ? (brilla() ? colNudo.brilla : colNudo.toca) : colNudo.apagado);
    }
    _o.rotation.set(0, 0, 0);
    nudos.instanceMatrix.needsUpdate = true; if (nudos.instanceColor) nudos.instanceColor.needsUpdate = true;
    const cab = puntoEspiral(1, A.giro, _pt, y0), dx = S.pos.x - cab.x, dz = S.pos.z - cab.z, n = Math.hypot(dx, dz) || 1;
    for (let i = 0; i < 2; i++) { const s = i ? 1 : -1; _o.position.set(cab.x + dx / n * 0.45 - dz / n * 0.22 * s, cab.y + 0.15, cab.z + dz / n * 0.45 + dx / n * 0.22 * s); _o.scale.setScalar(A.fase === 'deshace' ? 0.01 : 1); _o.updateMatrix(); ojos.setMatrixAt(i, _o.matrix); }
    ojos.instanceMatrix.needsUpdate = true;
  }
  function paso(dt) {
    A.t += dt;
    if (A.fase === 'deshace') {
      A.escala = 1 + A.t * 1.5; dibujar();
      if (A.t > 1.3) { A.fase = 'nada'; bejucos.visible = nudos.visible = ojos.visible = false; A.escala = 1; }
      return;
    }
    const dc = Math.hypot(S.pos.x - sitio.x, S.pos.z - sitio.z);
    const ver = !deshecha() && lista() && dc < 60;
    if (A.fase === 'nada') {
      bejucos.visible = nudos.visible = ojos.visible = ver;
      if (ver) { A.giro += 0.25 * dt; dibujar(); }
      if (!A.manual && ver && dc < R_EMPIEZA && libre()) iniciar();
      return;
    }
    A.giro += A.vel * dt; A.ciclo = (A.ciclo + dt) % PERIODO;
    if (A.empuje && A.empuje.t > 0) { S.pos.x += A.empuje.x * dt; S.pos.z += A.empuje.z * dt; A.empuje.t -= dt; }
    if (dc > R_SALE) { salir(TXT.sale); return; }
    dibujar();
  }
  // En pausa o con una tarjeta abierta no avanza (como el resto del mundo)
  G.on('update', (dt, busy) => { if (A.manual || busy) return; paso(Math.min(dt, 0.1)); }, 73);
  G.on('apply', () => { if (A.fase === 'lucha') salir(); sitio = buscarSitio(); }, 49);
  const reubicar = () => { if (A.fase === 'nada') sitio = buscarSitio(); };
  let intentos = 0; (function esperar() { reubicar(); if (!(G.marana && G.marana.rastros) && ++intentos < 60) setTimeout(esperar, 2000); })();

  // =====================================================================================================================
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(V.clave()); } catch (e) { /* */ }
    const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, inv0 = Object.assign({}, S.inv || {});
    const toasts = [], toast0 = G.ui.toast; G.ui.toast = t => { toasts.push(String(t)); };
    const limpiar0 = G.marana && G.marana.limpiar; if (G.marana) G.marana.limpiar = () => true; // la prueba no limpia rastros reales
    const susp = G.guardado.suspender; if (susp) susp(true);
    A.manual = true;
    const correr = s => { for (let t = 0; t < s; t += 1 / 30) paso(1 / 30); };
    const alNudo = i => { const p = posNudo(i); S.pos.x = p.x + 0.6; S.pos.z = p.z; S.pos.y = p.y - 0.8; };
    const esperarBrillo = () => { for (let k = 0; k < 200 && !brilla(); k++) paso(1 / 30); return brilla(); };
    const esperarApagado = () => { for (let k = 0; k < 200 && brilla(); k++) paso(1 / 30); return !brilla(); };
    try {
      V.borrar(); V.recargar();
      check('Sin la Sombra dispersada no sale (es la segunda amenaza)', iniciar({}) === false);
      V.cambiarMundo('sombra_tormenta', 'dispersa');
      S.pos.x = sitio.x + 8; S.pos.z = sitio.z; S.pos.y = altura(S.pos.x, S.pos.z); correr(0.1);
      check('Se ve cerca (bejucos, nudos y ojos: 3 draw calls)', bejucos.visible && nudos.visible && ojos.visible && bejucos.count <= 34 && nudos.count === NUDOS);
      check('No empieza durante la apertura del capítulo', (() => { const f = document.createElement('div'); f.id = 'c1-fade'; document.body.appendChild(f); const r = libre(); f.remove(); return r === false; })());
      check('Empieza: «Shhh… todo está mejor enredado.» y toma la Acción', iniciar({}) && A.fase === 'lucha' && toasts.includes(TXT.empieza) && G.interaccion.modo === modo);
      S.pos.x = sitio.x + 8; S.pos.z = sitio.z; esperarBrillo();
      check('Lejos del nudo: no se suelta y un bejuco te aparta', accion().motivo === 'lejos' && A.siguiente === 0 && A.empuje && A.empuje.t > 0 && toasts.includes(TXT.lejos));
      correr(0.5);
      const p0 = posNudo(0); correr(1); const p1 = posNudo(0);
      check('La Maraña gira: los nudos se mueven (hay que seguirlos)', Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.2);
      esperarApagado(); alNudo(0);
      check('Cerca pero sin brillo: no se suelta (precisión)', accion().motivo === 'destiempo' && A.siguiente === 0);
      correr(0.5);
      for (let i = 0; i < NUDOS; i++) { esperarBrillo(); alNudo(A.siguiente); A.empuje = null; const r = accion(); if (!r.ok) break; correr(0.1); }
      check('Los 4 nudos en orden, cada uno cuando brilla, la deshacen: «Ya vendré a enredar otro día…»', A.siguiente === NUDOS && A.fase === 'deshace' && toasts.includes(TXT.fin), 'nudos ' + A.siguiente + ', fase ' + A.fase);
      check('Cada nudo suelto la hace girar más rápido y acorta el brillo', A.vel > 0.35 + 0.18 * 3 && ventana() < 1.1);
      check('Premio una vez: 1 madera', (S.inv.madera || 0) === (inv0.madera || 0) + 1 && A.premio);
      correr(1.5);
      check('Se deshace y no vuelve a salir; tras recargar sigue deshecha', !bejucos.visible && deshecha() && iniciar({}) === false && (V.recargar(), deshecha()));
      iniciar({ forzar: true });
      for (let i = 0; i < NUDOS; i++) { esperarBrillo(); alNudo(A.siguiente); A.empuje = null; accion(); correr(0.1); }
      check('Repetirla no da el premio otra vez', !A.premio && (S.inv.madera || 0) === (inv0.madera || 0) + 1);
      correr(1.5);
      iniciar({ forzar: true }); S.pos.x = sitio.x + R_SALE + 5; S.pos.z = sitio.z; correr(0.1);
      check('Al alejarse se sale y suelta la Acción', A.fase === 'nada' && G.interaccion.modo !== modo);
    } catch (e) { check('Sin excepciones', false, e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e); }
    if (A.fase === 'lucha') salir();
    A.fase = 'nada'; A.manual = false; bejucos.visible = nudos.visible = ojos.visible = false;
    if (G.marana && limpiar0) G.marana.limpiar = limpiar0;
    G.ui.toast = toast0;
    S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; S.inv = inv0; try { G.objetos.renderInv(); } catch (e) { /* */ }
    try { if (crudo == null) localStorage.removeItem(V.clave()); else localStorage.setItem(V.clave(), crudo); } catch (e) { /* */ }
    V.recargar(); if (susp) susp(false);
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  G.v18serpiente = { ID, iniciar, salir, accion, paso, estado: () => A, get sitio() { return sitio; }, posNudo, test };
  return G.v18serpiente;
};
