/* Juego · CG-44. Vecinos que no son cotorras: prototipo corto en Villa Raíz y en la Ciudad de los 36.
   Coquí (canta de tarde y de noche, salta si te acercas), lagartijo (sol en el muro, huye, papada) y
   mariposa (ochos junto a las flores; si Vittata se queda quieta, una se le posa).
   Presupuesto: calidad baja 2 (mínima visible en el iPhone, que arranca en «bajo»: QA-110/0l), media ≤ 6, alta ≤ 12. Una sola malla instanciada (1 draw call) y se apaga
   si el jugador está lejos de los dos sitios o si la batería va en silencio (G.quiet). No toca cotorras ni la ciudad.
   window.AVVecinos(G) → { test, estado }. Prueba: AV.vecinosTest(). */
window.AVVecinos = function (G) {
  'use strict';
  if (G.vecinos) return G.vecinos;
  const S = G.S, M = G.fisica.MOVE, scene = G.renderer.scene;
  const H = (x, z) => G.terreno.height(x, z);
  const SITIOS = [{ id: 'villa', x: 125, z: 140 }, { id: 'ciudad', x: 11, z: -76 }];
  const TOPE = { bajo: 2, medio: 6, alto: 12 };
  const ESPECIE = ['coqui', 'lagartijo', 'mariposa'];
  const CLAVE_V = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.vecinos';
  const VISTOS = { coqui: false, lagartijo: false, mariposa: false };
  function guardarVistos() {
    const lista = [];
    if (VISTOS.coqui) lista.push('coqui');
    if (VISTOS.lagartijo) lista.push('lagartijo');
    if (VISTOS.mariposa) lista.push('mariposa');
    try { localStorage.setItem(CLAVE_V, JSON.stringify({ v: 1, vistos: lista })); } catch (e) { /* sin almacén */ }
  }
  function ver(esp) { if (!VISTOS[esp]) { VISTOS[esp] = true; guardarVistos(); } }
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_V) || 'null');
    if (d && Array.isArray(d.vistos)) for (let i = 0; i < d.vistos.length; i++) if (d.vistos[i] in VISTOS) VISTOS[d.vistos[i]] = true;
  } catch (e) { /* sin almacén */ }
  const COLOR = { coqui: [0.45, 0.62, 0.28], lagartijo: [0.22, 0.72, 0.34], mariposa: [0.95, 0.78, 0.18] };
  const CAP = 12;
  const geo = new THREE.SphereGeometry(0.11, 10, 8);
  const mat = new THREE.MeshBasicMaterial();
  const malla = new THREE.InstancedMesh(geo, mat, CAP);
  malla.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
  malla.count = 0; malla.frustumCulled = false; malla.castShadow = false; malla.receiveShadow = false;
  malla.visible = false; malla.name = 'vecinos';
  scene.add(malla);
  const dummy = new THREE.Object3D();
  const aves = [];
  let forzar = false, t = 0;
  const nivel = () => (forzar && forzar.nivel) || (G.renderer.calidad && G.renderer.calidad.nivel) || 'medio';
  const tope = () => TOPE[nivel()] || 0;
  const fase = () => { const h = typeof S.hora === 'number' ? S.hora : 12; return h >= 19 || h < 5 ? 'noche' : (h >= 17.5 ? 'atardecer' : 'dia'); };
  const lejos = () => SITIOS.every(s => Math.hypot(S.pos.x - s.x, S.pos.z - s.z) > 90);
  if (G.audio && G.audio.define) {
    try { G.audio.define('vecino_coqui', (t0, a, X) => { X.tone(520, t0, 0.12, { type: 'sine', gain: 0.05 }); X.tone(680, t0 + 0.14, 0.16, { type: 'sine', gain: 0.04 }); }); } catch (e) { /* ya estaba */ }
  }

  function sembrar() {
    aves.length = 0;
    const n = tope();
    for (let i = 0; i < n; i++) {
      const sitio = SITIOS[i % SITIOS.length];
      const ang = (i / Math.max(1, n)) * Math.PI * 2;
      const especie = ESPECIE[i % 3];
      const radio = especie === 'lagartijo' ? 6 + (i % 3) : 4 + (i % 5);
      const x = sitio.x + Math.cos(ang) * radio, z = sitio.z + Math.sin(ang) * radio;
      const suelo = H(x, z);
      aves.push({ especie, sitio: sitio.id, x, z, y: suelo + (especie === 'lagartijo' ? 1.15 : especie === 'mariposa' ? 1.6 : 0.12),
        base: suelo, fase: 0, huida: 0, papada: 0, ox: x, oz: z });
      const c = COLOR[especie];
      malla.instanceColor.setXYZ(i, c[0], c[1], c[2]);
    }
    malla.count = aves.length;
    if (malla.instanceColor.needsUpdate != null) malla.instanceColor.needsUpdate = true;
  }
  function pintar() {
    const quieta = !M.flying && (M.speed || 0) < 0.35 && M.grounded;
    for (let i = 0; i < aves.length; i++) {
      const a = aves[i];
      const suelo = H(a.x, a.z);
      if (a.y < suelo) a.y = suelo + 0.05;
      let s = a.especie === 'mariposa' ? 0.7 : (a.especie === 'lagartijo' ? 1.15 : 0.85);
      if (a.especie === 'lagartijo' && a.papada > 0) s *= 1 + 0.35 * Math.sin(a.papada * 8);
      dummy.position.set(a.x, a.y, a.z);
      dummy.scale.set(a.especie === 'lagartijo' ? s * 1.5 : s, a.especie === 'mariposa' ? s * 0.35 : s, s);
      dummy.updateMatrix();
      malla.setMatrixAt(i, dummy.matrix);
    }
    malla.instanceMatrix.needsUpdate = true;
    const cerca = !lejos();
    malla.visible = !G.quiet && (forzar ? true : cerca) && aves.length > 0;
  }
  function paso(dt) {
    if (!forzar && (G.quiet || lejos())) {
      if (malla.visible || malla.count) { malla.visible = false; malla.count = 0; aves.length = 0; }
      return;
    }
    if (!aves.length || aves.length !== tope()) sembrar();
    t += dt;
    const f = fase();
    for (const a of aves) {
      const d = Math.hypot(S.pos.x - a.x, S.pos.z - a.z);
      if (d < 6) ver(a.especie);
      if (a.especie === 'coqui') {
        a.y = a.base + 0.12 + (a.huida > 0 ? Math.sin(a.huida * 14) * 0.35 : 0);
        if (d < 3.2 && a.huida <= 0) a.huida = 0.7;
        if (a.huida > 0) a.huida -= dt;
        if ((f === 'noche' || f === 'atardecer') && d < 18 && Math.floor(t) !== Math.floor(t - dt) && G.audio && G.audio.play) {
          try { G.audio.play('vecino_coqui'); } catch (e) { /* sin audio */ }
        }
      } else if (a.especie === 'lagartijo') {
        if (d < 4 && a.huida <= 0) { a.huida = 1.1; a.x += (a.x - S.pos.x) * 0.15; a.z += (a.z - S.pos.z) * 0.15; }
        if (a.huida > 0) a.huida -= dt;
        else { a.x += (a.ox - a.x) * Math.min(1, dt * 0.8); a.z += (a.oz - a.z) * Math.min(1, dt * 0.8); a.papada = f === 'dia' ? t : 0; }
        a.base = H(a.x, a.z); a.y = a.base + 1.15;
      } else {
        a.fase += dt;
        const quieta = !M.flying && (M.speed || 0) < 0.35 && M.grounded && d < 2.2;
        if (quieta) { a.x += (S.pos.x - a.x) * Math.min(1, dt * 2); a.z += (S.pos.z - a.z) * Math.min(1, dt * 2); a.y = S.pos.y + 0.35; }
        else { a.x = a.ox + Math.cos(a.fase * 1.4) * 1.4; a.z = a.oz + Math.sin(a.fase * 2.1) * 0.8; a.y = H(a.x, a.z) + 1.5 + Math.sin(a.fase * 3) * 0.25; }
      }
    }
    pintar();
  }
  G.on('update', dt => paso(Math.min(0.05, dt || 0)));
  sembrar(); pintar();

  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const guard = { quiet: G.quiet, x: S.pos.x, y: S.pos.y, z: S.pos.z, hora: S.hora, nivel: G.renderer.calidad && G.renderer.calidad.nivel };
    let crudoV = null; try { crudoV = localStorage.getItem(CLAVE_V); } catch (e) { /* */ }
    try {
      ok('Tope: baja 2 (mínima visible), media 6, alta 12', TOPE.bajo === 2 && TOPE.medio === 6 && TOPE.alto === 12);
      forzar = { nivel: 'bajo' }; sembrar();
      ok('En calidad baja hay 2 (mínima visible)', aves.length === 2 && malla.count === 2, String(aves.length));
      forzar = { nivel: 'medio' }; sembrar(); pintar();
      ok('En calidad media hay 6, entre Villa Raíz y la ciudad', aves.length === 6 && aves.some(a => a.sitio === 'villa') && aves.some(a => a.sitio === 'ciudad'), aves.map(a => a.sitio + ':' + a.especie).join(','));
      ok('Ninguno atraviesa el suelo', aves.every(a => a.y >= H(a.x, a.z) - 0.02), aves.map(a => (a.y - H(a.x, a.z)).toFixed(2)).join(','));
      S.pos.x = 125; S.pos.z = 140; S.hora = 20; G.quiet = false; M.speed = 2; M.grounded = true; M.flying = false;
      const antes = aves.find(a => a.especie === 'coqui');
      const y0 = antes.y;
      S.pos.x = antes.x + 1; S.pos.z = antes.z; paso(0.2);
      ok('El coquí salta si te acercas de noche', antes.y > y0 + 0.05 || antes.huida > 0, 'y ' + antes.y.toFixed(2));
      const lag = aves.find(a => a.especie === 'lagartijo');
      S.pos.x = lag.x; S.pos.z = lag.z; paso(0.05);
      ok('El lagartijo huye al acercarte', lag.huida > 0, String(lag.huida));
      const mar = aves.find(a => a.especie === 'mariposa');
      S.pos.x = mar.ox + 1.6; S.pos.z = mar.oz; S.pos.y = H(S.pos.x, S.pos.z);
      M.speed = 0; M.grounded = true; M.flying = false;
      for (let i = 0; i < 10; i++) paso(0.2);
      ok('Quieta, la mariposa se le acerca', Math.hypot(mar.x - S.pos.x, mar.z - S.pos.z) < 1.2, Math.hypot(mar.x - S.pos.x, mar.z - S.pos.z).toFixed(2));
      S.pos.x = 11; S.pos.z = -76;
      const info = G.renderer.renderer.info, cam = G.renderer.camera, sc = G.renderer.scene;
      const una = () => { G.renderer.renderer.render(sc, cam); return { c: info.render.calls, t: info.render.triangles }; };
      malla.visible = false; const base = una();
      malla.visible = true; malla.count = aves.length; const con = una();
      ok('Suman 2 draw calls o menos', con.c - base.c >= 0 && con.c - base.c <= 2 && con.t >= base.t,
        base.c + ' calls / ' + base.t + ' tris → ' + con.c + ' calls / ' + con.t + ' tris');
      forzar = { nivel: 'alto' }; sembrar();
      ok('En calidad alta no pasan de 12', aves.length === 12 && aves.length <= 12, String(aves.length));
      S.pos.x = 0; S.pos.z = 0; forzar = null; G.quiet = true; paso(0.016);
      ok('Lejos o en silencio la malla se apaga', malla.visible === false);
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    G.quiet = guard.quiet; S.pos.x = guard.x; S.pos.y = guard.y; S.pos.z = guard.z; S.hora = guard.hora;
    if (G.renderer.calidad) G.renderer.calidad.nivel = guard.nivel;
    VISTOS.coqui = VISTOS.lagartijo = VISTOS.mariposa = false;
    try { if (crudoV == null) localStorage.removeItem(CLAVE_V); else localStorage.setItem(CLAVE_V, crudoV); } catch (e) { /* */ }
    try {
      const d = JSON.parse(crudoV || 'null');
      if (d && Array.isArray(d.vistos)) for (let i = 0; i < d.vistos.length; i++) if (d.vistos[i] in VISTOS) VISTOS[d.vistos[i]] = true;
    } catch (e) { /* */ }
    forzar = null; sembrar(); pintar();
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.vecinos = { test, estado: () => ({ n: aves.length, visible: malla.visible, tope: tope() }), paso };
  return G.vecinos;
};
