/* Juego · objetos e inventario
   Tipos de objeto (pack.objetos), objetos colocados en el mundo (pack.recursos), recoger al pasar o con Acción,
   inventario en el HUD y costos (has/pay/missingText).
   Datos: objetos { tipo: { nombre, modelo?: () => THREE.Object3D, hud?: 'id-del-elemento' } },
          recursos [{ id, tipo, x, z, fondo?: true (solo buceando), desdePaso?: n, burbujas?: paso desde el que suelta burbujas, avisoFondo? }]. */
AVE.module('objetos', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, scene = G.renderer.scene;
  const tipos = G.pack.objetos || {};
  const recursos = G.pack.recursos || [];
  const H = (x, z) => G.terreno.height(x, z);
  const label = t => (tipos[t] && tipos[t].nombre) || t;

  function defaultModel() {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshLambertMaterial({ color: '#ffd84a', emissive: '#5a3a00' }));
    m.position.y = 0.6; return m;
  }
  const meshes = {};
  for (const r of recursos) {
    const t = tipos[r.tipo] || {};
    const g = new THREE.Group(); g.add(t.modelo ? t.modelo() : defaultModel());
    g.position.set(r.x, H(r.x, r.z), r.z);
    scene.add(g); meshes[r.id] = g;
  }

  function available(r) { return !S.collected.includes(r.id) && S.step >= (r.desdePaso || 0); }
  // Los objetos del fondo solo se alcanzan buceando: los pies a menos de 1,6 m del fondo
  function reachUnder(r) { return S.pos.y - H(r.x, r.z) < 1.6; }
  for (const r of recursos) G.interaccion.add({
    id: r.id, x: r.x, z: r.z, r: 1.8, visible: () => available(r),
    label: () => (r.fondo && !reachUnder(r) ? 'Bucear (C) hasta la ' : 'Recoger ') + label(r.tipo),
    use: () => {
      if (r.fondo && !reachUnder(r)) { G.ui.toast(r.avisoFondo || 'Está en el fondo del agua: mantén C (o Bucear) para bajar', 3000); return; }
      collect(r);
    },
  });

  function has(cost) { return Object.keys(cost).every(k => S.inv[k] >= cost[k]); }
  function pay(cost) { for (const k in cost) S.inv[k] -= cost[k]; }
  function missingText(cost) { return Object.keys(cost).filter(k => S.inv[k] < cost[k]).map(k => (cost[k] - S.inv[k]) + ' ' + label(k)).join(', '); }

  function collect(r) {
    S.collected.push(r.id);
    S.inv[r.tipo]++;
    meshes[r.id].visible = false;
    // Combo: recoger seguido sube la nota del arpegio
    const juice = G.camara.juice;
    juice.combo = S.clock - juice.comboT < 3 ? juice.combo + 1 : 0; juice.comboT = S.clock;
    G.audio.play('pickup', juice.combo); G.camara.hitStop(0.06);
    G.fx.burst(r.x, H(r.x, r.z) + 0.6, r.z, r.fondo ? 'bubbles' : 'feathers', r.fondo ? 20 : 16, r.fondo ? S.water : null);
    G.ui.toast('+1 ' + label(r.tipo) + (juice.combo > 0 ? '  ·  combo x' + (juice.combo + 1) : ''));
    G.misiones.check();
  }
  function syncVisible() { for (const r of recursos) meshes[r.id].visible = available(r); }
  function renderInv() { for (const k of Object.keys(tipos)) { const el = $(tipos[k].hud || 'i-' + k); if (el) el.textContent = S.inv[k]; } }

  // Recoger al pasar por encima (también funciona E / Acción desde más lejos)
  G.on('moved', busy => {
    if (busy) return;
    for (const r of recursos) {
      if (!available(r)) continue;
      if (Math.hypot(S.pos.x - r.x, S.pos.z - r.z) < 1.1 && S.pos.y - H(r.x, r.z) < 1.6) collect(r);
    }
  });
  const bubbleT = {};
  G.on('render', dt => { for (const r of recursos) if (meshes[r.id].visible) meshes[r.id].rotation.y += dt * 0.6; }, 20);
  // Burbujas que guían hasta los objetos del fondo
  G.on('render', dt => {
    for (const r of recursos) {
      if (r.burbujas == null || !available(r) || S.step < r.burbujas) continue;
      if ((bubbleT[r.id] = (bubbleT[r.id] || 0) - dt) <= 0) { bubbleT[r.id] = 0.7; G.fx.burst(r.x, H(r.x, r.z) + 0.4, r.z, 'bubbles', 5, S.water); }
    }
  }, 54);
  G.on('apply', syncVisible, 10);
  G.on('apply', renderInv, 91);

  return { tipos, recursos, meshes, label, available, reachUnder, has, pay, missingText, collect, syncVisible, renderInv, find: id => recursos.find(r => r.id === id) };
});
