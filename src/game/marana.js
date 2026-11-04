/* Juego · CG-46. La Maraña como misterio de fantasía. No es un animal, ni una persona, ni un hecho de Puerto Rico.
   Rastros grises en rincones del mapa. Se descubren volando y se limpian con la bandada (una pasada cerca).
   Una malla instanciada (1 draw call), apagada lejos. Nota en el Diario y G.emit('momento'). No cambia los capítulos.
   window.AVMarana(G). Prueba: AV.maranaTest(). */
window.AVMarana = function (G) {
  'use strict';
  if (G.marana) return G.marana;
  const S = G.S, M = G.fisica.MOVE;
  const H = (x, z) => G.terreno.height(x, z);
  const RASTROS = [
    { id: 'loma', x: 40, z: 80 }, { id: 'poza', x: -20, z: 60 }, { id: 'mirador', x: 90, z: -30 },
    { id: 'rio', x: 150, z: 200 }, { id: 'meseta', x: 11, z: -90 }
  ];
  const rastros = RASTROS.map(r => ({ id: r.id, x: r.x, z: r.z, y: 0, limpio: false, visto: false }));
  const geo = new THREE.SphereGeometry(0.45, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0x8a8f86 });
  const malla = new THREE.InstancedMesh(geo, mat, rastros.length);
  malla.name = 'marana'; malla.frustumCulled = false; malla.castShadow = false; malla.count = 0; malla.visible = false;
  G.renderer.scene.add(malla);
  const dummy = new THREE.Object3D();
  const notas = [];
  function pintar() {
    let n = 0;
    for (const r of rastros) {
      if (r.limpio) continue;
      r.y = H(r.x, r.z) + 0.6;
      dummy.position.set(r.x, r.y, r.z); dummy.scale.set(1.4, 0.55, 1.1); dummy.updateMatrix();
      malla.setMatrixAt(n++, dummy.matrix);
    }
    malla.count = n; malla.instanceMatrix.needsUpdate = true;
    const lejos = rastros.every(r => r.limpio || Math.hypot(S.pos.x - r.x, S.pos.z - r.z) > 80);
    malla.visible = !G.quiet && n > 0 && !lejos;
  }
  function limpiar(r) {
    if (!r || r.limpio) return false;
    r.limpio = true;
    const linea = 'Limpiaste un rastro de la Maraña. Es un cuento de la bandada, no un dato de la isla.';
    notas.push(linea);
    G.emit('momento', { id: 'marana-' + r.id, texto: linea });
    if (G.ui && G.ui.toast) G.ui.toast('La bandada desenredó un rastro de fantasía.', 2200);
    if (G.fx && G.fx.burst) G.fx.burst(r.x, r.y, r.z, 'leaves', 8);
    pintar();
    return true;
  }
  G.on('update', () => {
    if (G.quiet) { malla.visible = false; return; }
    pintar();
    if (!M.flying) return;
    for (const r of rastros) {
      const d = Math.hypot(S.pos.x - r.x, S.pos.z - r.z);
      if (!r.visto && d < 18) { r.visto = true; if (G.ui) G.ui.toast('Hay un rastro gris entre las hojas. Es la Maraña, un cuento.', 2400); }
      if (!r.limpio && d < 4) limpiar(r);
    }
  });
  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const q = G.quiet, fly = M.flying, px = S.pos.x, pz = S.pos.z;
    try {
      ok('Hay rastros escondidos y ninguno habla de una plaga', rastros.length >= 5 && notas.every(n => !/invasor|plaga|amenaza/i.test(n)));
      G.quiet = false; M.flying = true;
      const r = rastros[0]; r.limpio = false; r.visto = false;
      S.pos.x = r.x + 2; S.pos.z = r.z; S.pos.y = H(r.x, r.z) + 3;
      pintar();
      ok('El rastro está sobre el suelo', r.y >= H(r.x, r.z) - 0.05, r.y.toFixed(2));
      const info = G.renderer.renderer.info;
      const una = () => { G.renderer.renderer.render(G.renderer.scene, G.renderer.camera); return info.render.calls; };
      malla.visible = false; const base = una();
      malla.visible = true; const con = una();
      ok('Como mucho 2 draw calls', con - base <= 2, base + ' → ' + con);
      ok('Limpiar con la bandada lo quita y avisa', limpiar(r) === true && r.limpio && notas.length >= 1, notas[0]);
      S.pos.x = 0; S.pos.z = 0; G.quiet = true; pintar();
      ok('Lejos o en silencio se apaga', malla.visible === false);
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    G.quiet = q; M.flying = fly; S.pos.x = px; S.pos.z = pz; pintar();
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.marana = { test, rastros, limpiar, notas, pintar };
  return G.marana;
};
