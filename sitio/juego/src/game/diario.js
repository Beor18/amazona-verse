/* Juego · Diario de coleccionables (data-driven)
   Hallazgos por proximidad con tarjeta de una línea, silueta 3D con destello, hitos que dan recompensas y la tarjeta del Diario.
   Datos: pack.diario { titulo, corto, boton, categorias: { cat: { nombre, desconocido, sonido, rafaga } },
     entradas: [{ id, cat, nombre, texto, x, z, r?, agua?, hundir?, chispa?, modelo?: (add, S1) => void }],
     hitos: [{ id, cat, min } | { id, todos: true }] }  (el id del hito es el "hito" de pack.ropa).
   Otros módulos añaden secciones a la tarjeta del Diario con G.diario.seccion({ id, html: () => string })
   (p. ej. las fichas de Ciencia de una lección); se dibujan antes de la ropa. */
AVE.module('diario', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, scene = G.renderer.scene;
  const D = G.pack.diario || {};
  const entries = D.entradas || [];
  const cats = D.categorias || {};
  const total = entries.length;
  const H = (x, z) => G.terreno.height(x, z);

  // Siluetas hechas con primitivas y un destello dorado encima
  function model(f) {
    const g = new THREE.Group(), M = c => new THREE.MeshLambertMaterial({ color: c });
    const add = (geo, c, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); if (sx) m.scale.set(sx, sy, sz); g.add(m); return m; };
    const S1 = new THREE.SphereGeometry(1, 12, 10);
    if (f.modelo) f.modelo(add, S1);
    else add(new THREE.IcosahedronGeometry(0.25, 0), '#c9a227', 0, 0.3, 0);
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: '#ffd84a' }));
    spark.position.y = f.chispa || 1.1; spark.name = 'spark'; g.add(spark);
    return g;
  }
  // Nivel del agua en el sitio de un hallazgo acuático (el mapa puede tener agua a varias alturas: río, pozas, mar)
  const nivel = f => { const y = G.agua.levelAt(f.x, f.z); return y > -Infinity ? y : G.terreno.waterBase; };
  const meshes = {}, ys = {};
  for (const f of entries) {
    const g = model(f);
    ys[f.id] = f.agua ? nivel(f) - (f.hundir != null ? f.hundir : 0.35) : H(f.x, f.z);
    g.position.set(f.x, ys[f.id], f.z); scene.add(g); meshes[f.id] = g;
  }
  const count = c => entries.filter(x => x.cat === c && S.field.includes(x.id)).length;

  function found(f) {
    if (S.field.includes(f.id)) return;
    const cat = cats[f.cat] || {};
    S.field.push(f.id);
    meshes[f.id].visible = false;
    G.eventos.log('FieldEntryFound', { entry: f.id, cat: f.cat });
    G.emit('aprendizaje', { tipo: 'hallazgo', id: f.id });
    const juice = G.camara.juice;
    juice.combo = S.clock - juice.comboT < 3 ? juice.combo + 1 : 0; juice.comboT = S.clock;
    G.audio.play(cat.sonido || 'pickup', juice.combo + 3); G.camara.hitStop(0.06);
    G.fx.burst(f.x, ys[f.id] + 0.8, f.z, cat.rafaga || 'feathers', 22);
    G.ui.toastHTML(`<b>${D.corto || 'Diario'} · ${f.nombre}</b> (${S.field.length}/${total})<br>${f.texto}`, 5000);
    for (const h of D.hitos || []) if (h.todos ? S.field.length >= total : count(h.cat) >= h.min) G.misiones.grant(h.id);
    G.misiones.renderQuest(); G.guardado.autosave();
  }
  const secciones = [];
  function seccion(sec) { const i = secciones.findIndex(x => x.id === sec.id); if (i >= 0) secciones[i] = sec; else secciones.push(sec); }
  function open() {
    const items = entries.map(f => S.field.includes(f.id)
      ? `<li class="found"><span class="ico ${f.cat}" aria-hidden="true"></span><div><b>${f.nombre}</b><small>${f.texto}</small></div></li>`
      : `<li><span class="ico" aria-hidden="true"></span><div><b>???</b><small>${(cats[f.cat] || {}).desconocido || 'Algo'} por descubrir</small></div></li>`).join('');
    const ropa = G.misiones.unlocks.map(u => `<li class="${S.unlocked.includes(u.clave) ? 'found' : ''}">${S.unlocked.includes(u.clave) ? '✓' : '·'} ${u.nombre} <small>(${u.pista})</small></li>`).join('');
    const byCat = Object.keys(cats).map(c => ` · ${cats[c].nombre} ${count(c)}/${entries.filter(x => x.cat === c).length}`).join('');
    G.ui.showCard(`<h2>${D.titulo || 'Diario'}</h2><p class="note">${S.field.length}/${total}${byCat}</p>
      <ul class="diary">${items}</ul>${secciones.map(x => x.html()).join('')}<span class="lbl">Ropa desbloqueable</span><ul class="ropa">${ropa}</ul>
      <div class="row"><button class="btn ghost" id="d-close" type="button">Cerrar</button></div>`);
    $('d-close').onclick = G.ui.hideCard;
    // Foco: entra a la tarjeta al abrirla y vuelve al botón Diario al cerrarla (QA-07)
    abierto = true;
    const card = $('card'); card.tabIndex = -1; card.focus({ preventScroll: true });
  }
  let abierto = false;
  G.on('cardHidden', () => { if (!abierto) return; abierto = false; const b = $('b-diary'); if (b && !b.hidden) b.focus({ preventScroll: true }); });
  // Línea del HUD y botón del Diario
  function hud() { return total ? { ok: S.field.length >= total, text: `${D.boton || 'Diario'} ${S.field.length}/${total}` } : null; }
  function renderButton() { const b = $('b-diary'); b.hidden = !total; b.textContent = `${D.boton || 'Diario'} ${S.field.length}/${total}`; }
  $('b-diary').addEventListener('click', () => { if (!G.ui.overlayOpen()) open(); });

  // Los hallazgos se recogen al acercarse
  G.on('update', (dt, busy) => {
    if (busy) return;
    for (const f of entries) {
      if (S.field.includes(f.id)) continue;
      if (Math.hypot(S.pos.x - f.x, S.pos.z - f.z) < (f.r || 1.6) && (f.agua ? S.pos.y < nivel(f) + 1.5 : Math.abs(S.pos.y - ys[f.id]) < 3)) found(f);
    }
  }, 40);
  // Cada hallazgo flota y su destello gira
  G.on('render', dt => {
    const now = performance.now() / 1000;
    for (const f of entries) {
      const g = meshes[f.id]; if (!g.visible) continue;
      g.position.y = ys[f.id] + (f.agua ? Math.sin(now * 1.5 + f.x) * 0.08 : 0.15 + Math.sin(now * 2 + f.z) * 0.08);
      g.getObjectByName('spark').rotation.y += dt * 2.5;
    }
  }, 52);
  G.on('apply', () => { for (const f of entries) meshes[f.id].visible = !S.field.includes(f.id); }, 12);

  return { entries, meshes, total, found, open, seccion, hud, renderButton, count, y: id => ys[id] };
});
