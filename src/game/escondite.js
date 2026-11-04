/* Juego · CG-43. Escondite con los pichones. Rejugable, 2 minutos, el pío suena más cerca.
   Al encontrarlos se pide un gag de gags.js si ya está cargado (sin cambiar ese archivo) y, si no, el gesto Celebrar.
   Una sola malla, apagada cuando no se juega. Récord en el dispositivo. window.AVEscondite(G). Prueba: AV.esconditeTest(). */
window.AVEscondite = function (G) {
  'use strict';
  if (G.escondite) return G.escondite;
  const S = G.S, M = G.fisica.MOVE;
  const H = (x, z) => G.terreno.height(x, z);
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.escondite';
  const LIMITE = 120;
  let mejor = null, jugando = false, t = 0, sitios = [], pio = 0;
  try { const d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (d && d.mejor) mejor = d.mejor; } catch (e) { /* */ }
  const geo = new THREE.SphereGeometry(0.16, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
  const malla = new THREE.InstancedMesh(geo, mat, 3);
  malla.count = 0; malla.visible = false; malla.frustumCulled = false; malla.castShadow = false; malla.name = 'escondite';
  G.renderer.scene.add(malla);
  const dummy = new THREE.Object3D();
  if (G.audio && G.audio.define) {
    try { G.audio.define('pio_escondite', (t0, g, X) => X.tone(1400, t0, 0.08, { type: 'sine', gain: 0.03 + 0.05 * (g || 0) })); } catch (e) { /* */ }
  }
  function armar(ox, oz) {
    const base = [{ id: 'copa', dx: 8, dz: 2, alto: 6 }, { id: 'muelle', dx: -6, dz: 4, alto: 0.35 }, { id: 'tejado', dx: 3, dz: -7, alto: 3.2 }];
    sitios = base.map(b => { const x = ox + b.dx, z = oz + b.dz; return { id: b.id, x, z, y: H(x, z) + b.alto, hallado: false }; });
  }
  function pintar() {
    let n = 0;
    sitios.forEach(s => {
      if (s.hallado) return;
      dummy.position.set(s.x, s.y, s.z); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      malla.setMatrixAt(n++, dummy.matrix);
    });
    malla.count = n; malla.instanceMatrix.needsUpdate = true; malla.visible = jugando && n > 0;
  }
  function gag() {
    try {
      if (G.gags && G.gags.forzar) { if (G.gags.forzar('imitar', { gesto: 'celebrar', forzado: true })) return 'gag'; }
    } catch (e) { /* sin compañero */ }
    try { if (G.actores && G.actores.playEmote) G.actores.playEmote('celebrar'); } catch (e) { /* sin gesto */ }
    return 'gesto';
  }
  function empezar(x, z) {
    armar(x == null ? S.pos.x : x, z == null ? S.pos.z : z);
    jugando = true; t = 0; pintar();
    if (G.ui && G.ui.toast) G.ui.toast('¡Escondite! Encuentra a los pichones. El pío se oye más fuerte cerca.', 2800);
    return sitios;
  }
  function cerca() {
    let mejorD = 1e9, quien = null;
    for (const s of sitios) if (!s.hallado) { const d = Math.hypot(S.pos.x - s.x, S.pos.z - s.z); if (d < mejorD) { mejorD = d; quien = s; } }
    return { d: mejorD, quien };
  }
  function paso(dt) {
    if (!jugando) return;
    t += dt;
    const c = cerca();
    if (c.quien && c.d < 22) {
      pio = Math.max(0, 1 - c.d / 22);
      if (G.audio && G.audio.play && Math.floor(t * 2) !== Math.floor((t - dt) * 2)) {
        try { G.audio.play('pio_escondite', pio); } catch (e) { /* */ }
      }
      if (c.d < 2.4) { c.quien.hallado = true; gag(); pintar(); }
    }
    if (sitios.every(s => s.hallado)) {
      jugando = false; malla.visible = false;
      if (mejor == null || t < mejor) { mejor = t; try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, mejor })); } catch (e) { /* */ } }
      G.emit('record', { modo: 'escondite', segundos: t });
      if (G.ui && G.ui.toast) G.ui.toast('¡Los encontraste!', 2000);
    } else if (t >= LIMITE) {
      jugando = false; malla.visible = false;
      if (G.ui && G.ui.toast) G.ui.toast('Se escondieron otra vez. Cuando quieras, otra ronda.', 2200);
    }
  }
  G.on('update', dt => { if (!G.quiet) paso(Math.min(0.05, dt || 0)); });
  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const q = G.quiet, px = S.pos.x, pz = S.pos.z;
    try {
      G.quiet = true;
      const lista = empezar(100, 100);
      ok('Hay copa, muelle y tejado', lista.map(s => s.id).join() === 'copa,muelle,tejado' && lista.every(s => s.y >= H(s.x, s.z) - 0.05), lista.map(s => s.id + '@' + s.y.toFixed(1)).join(' '));
      const lejos = cerca().d, cercaUno = (S.pos.x = lista[0].x, S.pos.z = lista[0].z, cerca().d);
      ok('El pío corresponde a la distancia: más cerca, menos metros', cercaUno < lejos && cercaUno < 1, lejos.toFixed(1) + ' → ' + cercaUno.toFixed(1));
      paso(0.2);
      ok('Al llegar se encuentra y el gag no rompe', lista[0].hallado === true, String(lista[0].hallado));
      ok('Sigue jugable y la malla es una', jugando && malla.count === 2, 'count ' + malla.count);
      lista[1].hallado = lista[2].hallado = true; paso(0.1);
      ok('Al completar guarda un récord', mejor != null && mejor < LIMITE, String(mejor));
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    jugando = false; malla.visible = false; malla.count = 0; G.quiet = q; S.pos.x = px; S.pos.z = pz;
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.escondite = { empezar, paso, test, cerca, get mejor() { return mejor; } };
  return G.escondite;
};
