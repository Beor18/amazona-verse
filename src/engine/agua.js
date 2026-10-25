/* AVE · agua
   Franja de río nadable (plano con normal animada), nivel del agua en la partida (S.water, sube con una crecida),
   y efectos: ondas, salpicadura y gotas. Datos: mundo.agua { x, ancho, nivel, color, textura }.
   Sin mundo.agua no hay agua: levelAt devuelve -Infinity y nadie nada. */
AVE.module('agua', function (G) {
  'use strict';
  const S = G.S, WA = (G.pack.mundo || {}).agua;
  const WORLD = G.terreno.WORLD, base = G.terreno.waterBase;
  let mesh = null, tAgua = null, half = 0;
  if (WA) {
    tAgua = G.assets.tex(WA.textura || 'assets/tex/agua_normal.jpg'); tAgua.repeat.set(3, 18);
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(WA.ancho, WORLD * 2 + 20), new THREE.MeshPhongMaterial({
      color: WA.color || '#2f7f9f', transparent: true, opacity: 0.85, normalMap: tAgua, normalScale: new THREE.Vector2(0.5, 0.5),
      shininess: 40, specular: new THREE.Color('#5f8fa8') }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(WA.x, base, 0);
    G.renderer.scene.add(mesh);
    half = WA.ancho / 2;
  }
  function levelAt(x) { return mesh && Math.abs(x - mesh.position.x) < half ? S.water : -Infinity; }
  function setLevel(y) { S.water = y; if (mesh) mesh.position.y = y; }

  // Efectos de agua: anillos que se expanden (salpicadura y ondas) y gotas con gravedad
  function ripple(x, y, z, size) { G.fx.ringFx(x, y, z, size || 1.2, 0.9, 0.4); }
  function splash(x, y, z, s) {
    G.audio.play('splash');
    G.fx.ringFx(x, y, z, 2.2 * s, 0.75, 0.75); G.fx.ringFx(x, y, z, 1.2 * s, 0.5, 0.55);
    G.fx.drops(x, y, z, s, y);
  }
  function spray(x, y, z) { G.fx.drops(x, y, z, 0.7, y - 1.2); }

  G.on('render', (dt, t) => { if (tAgua) { tAgua.offset.y = t * 0.04; tAgua.offset.x = Math.sin(t * 0.3) * 0.05; } }, 25);
  G.on('apply', () => { if (mesh) mesh.position.y = S.water; }, 40);

  return { base, mesh, levelAt, setLevel, ripple, splash, spray };
});
