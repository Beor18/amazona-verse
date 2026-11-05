/* Juego · CG-46. La Maraña como misterio de fantasía. No es un animal, ni una persona, ni un hecho de Puerto Rico.
   Rastros grises en rincones del mapa. Se descubren volando y se limpian con la bandada (una pasada cerca).
   Una malla instanciada (1 draw call), apagada lejos. Nota en el Diario y G.emit('momento'). No cambia los capítulos.
   KIMI-063 · cara: ojos luminosos que se abren a <26 m y siguen al jugador, enredaderas que se mueven y
   una voz = sonido existente (nido_chispa) al despertar. Todo instanciado (≤ 2 draw calls con la cara) y
   apagado en calidad baja/lejos/silencio, igual que los rastros. Sin personaje 3D nuevo.
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
  const rastros = RASTROS.map((r, i) => ({
    id: r.id, x: r.x, z: r.z, y: 0, limpio: false, visto: false,
    apertura: 0, despierto: false, vozEn: -1e9, brillo: 0, fase: i * 2.39,
  }));
  const geo = new THREE.SphereGeometry(0.45, 8, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0x8a8f86 });
  // KIMI-070: cabecera para rastros dinámicos (la V18.1 invoca uno junto al puente roto); los 5 de siempre + 3 de margen
  const CAP = RASTROS.length + 3;
  const malla = new THREE.InstancedMesh(geo, mat, CAP);
  malla.name = 'marana'; malla.frustumCulled = false; malla.castShadow = false; malla.count = 0; malla.visible = false;
  G.renderer.scene.add(malla);
  // KIMI-063 · los ojos: esferas achatadas aditivas; la apertura las escala de 0 (cerrado) a su talla
  const ojoGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const ojoMat = new THREE.MeshBasicMaterial({ color: 0xb9f57e, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const ojos = new THREE.InstancedMesh(ojoGeo, ojoMat, CAP * 2);
  ojos.name = 'marana:ojos'; ojos.frustumCulled = false; ojos.castShadow = false; ojos.count = 0; ojos.visible = false;
  G.renderer.scene.add(ojos);
  const dummy = new THREE.Object3D();
  const notas = [];
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.marana';
  const limpios = [];
  let t = 0;
  function guardarLimpios() { try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, limpios })); } catch (e) { /* sin almacén */ } }
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (d && Array.isArray(d.limpios)) for (const id of d.limpios) {
      const r = rastros.find(x => x.id === id);
      if (r && !r.limpio) { r.limpio = true; if (!limpios.includes(id)) limpios.push(id); }
    }
  } catch (e) { /* sin almacén */ }
  function pintar() {
    let n = 0;
    for (const r of rastros) {
      if (r.limpio || n >= CAP) continue;
      r.y = H(r.x, r.z) + 0.6;
      dummy.position.set(r.x, r.y, r.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1.4, 0.55, 1.1); dummy.updateMatrix();
      malla.setMatrixAt(n++, dummy.matrix);
    }
    malla.count = n; malla.instanceMatrix.needsUpdate = true;
    const lejos = rastros.every(r => r.limpio || Math.hypot(S.pos.x - r.x, S.pos.z - r.z) > 80);
    malla.visible = !G.quiet && n > 0 && !lejos;
  }
  // KIMI-063 · animación de los rastros (enredaderas) y la cara (ojos). Solo se llama cerca y visible.
  function animar(dt) {
    t += dt;
    const reducido = !!(G.renderer && G.renderer.REDUCED);
    let n = 0;
    for (const r of rastros) {
      if (r.limpio || n >= CAP) continue;
      r.y = H(r.x, r.z) + 0.6;
      const d = Math.hypot(S.pos.x - r.x, S.pos.z - r.z);
      // enredaderas: balanceo lento + respiración; con «Reducir movimiento» queda casi quieto
      const sway = reducido ? 0.15 : 1;
      dummy.position.set(r.x, r.y, r.z);
      dummy.rotation.set(
        Math.sin(t * 0.9 + r.fase) * 0.10 * sway,
        Math.sin(t * 0.5 + r.fase * 2) * 0.25 * sway,
        Math.cos(t * 0.7 + r.fase) * 0.12 * sway);
      const respiro = 1 + Math.sin(t * 1.1 + r.fase) * 0.05;
      // cerca se estira un poco hacia el jugador: la maraña te sigue con el cuerpo
      const estira = Math.max(0, 1 - d / 14) * 0.3;
      dummy.scale.set(1.4 * respiro, 0.55 * (1 + estira * 0.6), 1.1 * (1 + estira));
      dummy.updateMatrix();
      malla.setMatrixAt(n++, dummy.matrix);
    }
    malla.count = n; malla.instanceMatrix.needsUpdate = true;
    // ojos: se abren a <26 m y miran al jugador; la voz suena una vez por despertar
    let k = 0;
    for (const r of rastros) {
      if (r.limpio || k + 2 > CAP * 2) continue;
      const d = Math.hypot(S.pos.x - r.x, S.pos.z - r.z);
      const objetivo = d < 26 ? 1 : 0;
      r.apertura += (objetivo - r.apertura) * Math.min(1, dt * 2.5);
      if (r.apertura < 0.02) { r.apertura = objetivo === 0 ? 0 : r.apertura; r.despierto = false; continue; }
      if (!r.despierto && r.apertura > 0.5) {
        r.despierto = true;
        const ahora = performance.now();
        if (ahora - r.vozEn > 20000 && G.audio && G.audio.play) { r.vozEn = ahora; r.brillo = 1; G.audio.play('nido_chispa'); }
      }
      r.brillo = Math.max(0, r.brillo - dt * 1.5);
      const baseY = r.y + 0.42;
      const ang = Math.atan2(S.pos.x - r.x, S.pos.z - r.z);
      const hx = Math.sin(ang), hz = Math.cos(ang);      // hacia el jugador: los ojos se asoman por su lado de la mancha
      const px = Math.cos(ang), pz = -Math.sin(ang);     // perpendicular a la vista, para separar el par
      for (let o = 0; o < 2; o++) {
        const s = o === 0 ? 1 : -1;
        dummy.position.set(r.x + hx * 0.45 + px * 0.15 * s, baseY, r.z + hz * 0.45 + pz * 0.15 * s);
        dummy.lookAt(S.pos.x, S.pos.y + 0.4, S.pos.z);
        const escala = r.apertura * (1 + r.brillo * 0.5);
        dummy.scale.set(escala, escala * 1.35, escala * 0.55); // ojo almendrado: se lee la apertura
        dummy.updateMatrix();
        ojos.setMatrixAt(k++, dummy.matrix);
      }
    }
    ojos.count = k; ojos.instanceMatrix.needsUpdate = true; ojos.visible = k > 0;
  }
  function limpiar(r) {
    if (!r || r.limpio || r.inliminable) return false; // inliminable: misterio de la V18.1 (KIMI-070), la bandada no lo toca
    r.limpio = true;
    const linea = 'Limpiaste un rastro de la Maraña. Es un cuento de la bandada, no un dato de la isla.';
    notas.push(linea);
    G.emit('momento', { id: 'marana-' + r.id, texto: linea });
    if (G.ui && G.ui.toast) G.ui.toast(en() ? 'The flock cleared a make-believe trail.' : 'La bandada desenredó un rastro de fantasía.', 2200);
    if (G.fx && G.fx.burst) G.fx.burst(r.x, r.y, r.z, 'leaves', 8);
    if (!limpios.includes(r.id)) { limpios.push(r.id); guardarLimpios(); }
    pintar();
    return true;
  }
  function paso(dt) {
    const bajo = G.renderer.calidad && G.renderer.calidad.nivel === 'bajo';
    if (G.quiet || bajo) { malla.visible = false; ojos.visible = false; return; }
    let cerca = false;
    for (let i = 0; i < rastros.length; i++) {
      const r = rastros[i];
      if (!r.limpio && Math.hypot(S.pos.x - r.x, S.pos.z - r.z) < 80) cerca = true;
    }
    if (!cerca) { malla.visible = false; ojos.visible = false; return; }
    animar(dt || 0.016);
    malla.visible = malla.count > 0;
    if (!M.flying) return;
    for (let i = 0; i < rastros.length; i++) {
      const r = rastros[i];
      const d = Math.hypot(S.pos.x - r.x, S.pos.z - r.z);
      if (!r.visto && d < 18) { r.visto = true; if (G.ui) G.ui.toast(en() ? 'A gray trail hides in the leaves. It is a flock story.' : 'Hay un rastro gris entre las hojas. Es la Maraña, un cuento.', 2400); }
      if (!r.limpio && !r.inliminable && d < 4) limpiar(r);
    }
  }
  // KIMI-070 · rastros dinámicos invocados desde fuera (la V18.1 pone uno junto al puente roto como misterio).
  // inliminable: la bandada no lo limpia ni entra en el diario; visto: sin aviso de «descubrimiento».
  function aparecer(cfg) {
    if (!cfg || !cfg.id) return null;
    const previo = rastros.find(x => x.id === cfg.id);
    if (previo) {
      previo.limpio = false;
      if (cfg.x != null) previo.x = cfg.x;
      if (cfg.z != null) previo.z = cfg.z;
      pintar();
      return previo;
    }
    if (rastros.filter(x => !x.limpio).length >= CAP) return null; // sin cabecera (con CAP = 5+3 no ocurre)
    const r = { id: cfg.id, x: cfg.x, z: cfg.z, y: 0, limpio: false, visto: cfg.visto !== false,
      inliminable: !!cfg.inliminable, apertura: 0, despierto: false, vozEn: -1e9, brillo: 0, fase: (rastros.length * 2.39) % 6.283 };
    rastros.push(r); pintar();
    return r;
  }
  // solo los dinámicos (inliminables) se pueden retirar: los 5 de siempre viven hasta que la bandada los limpia
  function retirar(id) {
    const i = rastros.findIndex(x => x.id === id && x.inliminable);
    if (i < 0) return false;
    rastros.splice(i, 1);
    pintar();
    return true;
  }
  G.on('update', dt => paso(dt));
  function test() {
    const results = [], ok = (name, pass, extra) => results.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const q = G.quiet, fly = M.flying, px = S.pos.x, pz = S.pos.z;
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
    try {
      ok('Hay rastros escondidos y ninguno habla de una plaga', rastros.length >= 5 && notas.every(n => !/invasor|plaga|amenaza/i.test(n)));
      G.quiet = false; M.flying = true;
      const r = rastros[0]; r.limpio = false; r.visto = false;
      S.pos.x = r.x + 2; S.pos.z = r.z; S.pos.y = H(r.x, r.z) + 3;
      pintar();
      ok('El rastro está sobre el suelo', r.y >= H(r.x, r.z) - 0.05, r.y.toFixed(2));
      const info = G.renderer.renderer.info;
      const una = () => { G.renderer.renderer.render(G.renderer.scene, G.renderer.camera); return info.render.calls; };
      malla.visible = false; ojos.visible = false; const base = una();
      malla.visible = true; ojos.visible = true; const con = una();
      ok('Como mucho 2 draw calls', con - base <= 2, base + ' → ' + con);
      ok('Limpiar con la bandada lo quita y avisa', limpiar(r) === true && r.limpio && notas.length >= 1, notas[0]);
      S.pos.x = 0; S.pos.z = 0; G.quiet = true; pintar();
      ok('Lejos o en silencio se apaga', malla.visible === false);
      // KIMI-063 · la cara: ojos que se abren y siguen, enredaderas que se mueven y voz existente
      G.quiet = false; M.flying = false;
      const r2 = rastros[1]; r2.limpio = false; r2.apertura = 0; r2.despierto = false; r2.vozEn = -1e9; r2.brillo = 0;
      S.pos.x = r2.x + 6; S.pos.z = r2.z; S.pos.y = H(r2.x, r2.z) + 1.5;
      for (let i = 0; i < 14; i++) paso(0.1);
      const abrio = ojos.visible && ojos.count >= 2 && r2.apertura > 0.8;
      const m1 = ojos.count ? Array.from(ojos.instanceMatrix.array.slice(0, 16)) : null;
      S.pos.x = r2.x - 6; // el jugador cruza al otro lado: los ojos deben girar
      for (let i = 0; i < 14; i++) paso(0.1);
      const m2 = ojos.count ? Array.from(ojos.instanceMatrix.array.slice(0, 16)) : null;
      const giran = !!m1 && !!m2 && m1.some((v, i) => Math.abs(v - m2[i]) > 1e-4);
      ok('Los ojos se abren cerca y siguen al jugador', abrio && giran, 'apertura ' + r2.apertura.toFixed(2) + ' · ojos ' + ojos.count);
      const e1 = malla.count ? Array.from(malla.instanceMatrix.array.slice(0, 16)) : null;
      for (let i = 0; i < 6; i++) paso(0.25);
      const e2 = malla.count ? Array.from(malla.instanceMatrix.array.slice(0, 16)) : null;
      ok('Las enredaderas se mueven', !!e1 && !!e2 && e1.some((v, i) => Math.abs(v - e2[i]) > 1e-5));
      const sonados = [], play0 = G.audio && G.audio.play;
      if (play0) G.audio.play = n => { sonados.push(n); return play0.call(G.audio, n); };
      r2.apertura = 0; r2.despierto = false; r2.vozEn = -1e9;
      for (let i = 0; i < 14; i++) paso(0.1);
      if (play0) G.audio.play = play0;
      ok('Su voz al despertar es un sonido existente', sonados.includes('nido_chispa') && G.audio.has('nido_chispa'), sonados.join(','));
      S.pos.x = 0; S.pos.z = 0;
      for (let i = 0; i < 30; i++) paso(0.1);
      const lejosOk = ojos.count === 0 && ojos.visible === false;
      S.pos.x = r2.x + 6; S.pos.z = r2.z; G.quiet = true; paso(0.1);
      const quietOk = malla.visible === false && ojos.visible === false;
      ok('Los ojos se cierran lejos o en silencio', lejosOk && quietOk);
      // KIMI-070 · rastros dinámicos (la V18.1 invoca uno junto al puente roto): aparecen, no se limpian y se retiran
      G.quiet = false; M.flying = true;
      const rd = aparecer({ id: 'test_v18', x: 0, z: -40, inliminable: true, visto: true });
      ok('Un rastro dinámico aparece y entra en la lista', !!rd && rastros.indexOf(rd) >= 0 && rd.inliminable === true && rd.visto === true, rd && rd.id);
      S.pos.x = rd.x; S.pos.z = rd.z; S.pos.y = H(rd.x, rd.z) + 2;
      for (let i = 0; i < 10; i++) paso(0.1);
      ok('El inliminable no se limpia pasando por encima de la bandada', !rd.limpio && limpiar(rd) === false && notas.every(n => !/puente/i.test(n)));
      ok('Se dibuja junto a los demás (misma malla instanciada)', malla.visible === true && malla.count >= 1);
      ok('Retirar lo quita del todo', retirar('test_v18') === true && rastros.indexOf(rd) < 0 && retirar('loma') === false);
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    G.quiet = q; M.flying = fly; S.pos.x = px; S.pos.z = pz;
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
    limpios.length = 0;
    for (const r of rastros) { r.limpio = false; r.apertura = 0; r.despierto = false; r.brillo = 0; r.vozEn = -1e9; }
    try {
      const d = JSON.parse(crudo || 'null');
      if (d && Array.isArray(d.limpios)) for (const id of d.limpios) { const r = rastros.find(x => x.id === id); if (r) { r.limpio = true; limpios.push(id); } }
    } catch (e) { /* */ }
    pintar();
    return { passed: results.filter(r => r.ok).length, total: results.length, results };
  }
  G.marana = { test, rastros, limpiar, notas, pintar, paso, malla, ojos, aparecer, retirar };
  return G.marana;
};
