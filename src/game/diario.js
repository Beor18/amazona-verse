/* Juego · Diario de coleccionables (data-driven)
   Hallazgos por proximidad con tarjeta de una línea, silueta 3D con destello, hitos que dan recompensas y la tarjeta del Diario.
   Datos: pack.diario { titulo, corto, boton, categorias: { cat: { nombre, desconocido, sonido, rafaga } },
     entradas: [{ id, cat, nombre, texto, x, z, r?, agua?, hundir?, chispa?, modelo?: (add, S1) => void }],
     hitos: [{ id, cat, min } | { id, todos: true }] }  (el id del hito es el "hito" de pack.ropa).
   Otros módulos añaden secciones a la tarjeta del Diario con G.diario.seccion({ id, html: () => string })
   (p. ej. las fichas de Ciencia de una lección); se dibujan antes de la ropa, seguidas de «Amazonas del mundo». */
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

  // «Amazonas del mundo» (window.AV_ESPECIES, content/comun/especies.js). Solo especies con nombre común ES y EN,
  // nombre científico y distribución verificados. El estado UICN se calla cuando no coincide con el catálogo de Kelvin
  // (las 13 de docs/equipo/ESPECIES_DISCREPANCIAS.md) hasta que él decida. Sin enlaces: la fuente va en texto.
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const idioma = () => (G.aula && G.aula.aj && G.aula.aj.idioma) === 'en' ? 'en' : 'es';
  const TX = {
    titulo: { es: 'Amazonas del mundo', en: 'Amazons of the world' }, especies: { es: 'especies', en: 'species' },
    uicn: { es: 'Estado UICN', en: 'IUCN status' }, porVerificar: { es: 'por verificar', en: 'to be verified' },
    fuente: { es: 'Fuente', en: 'Source' },
  };
  const tx = k => TX[k][idioma()];
  const conDatos = e => !!(e && e.cientifico && e.comun && e.comun.es && e.comun.en && e.distribucion && e.distribucion.es && e.distribucion.en && e.fuentes);
  const uicnVerificada = e => !!(e.uicn && e.uicn.categoria && e.catalogo && e.catalogo.uicn === e.uicn.categoria);
  function especies() {
    const E = window.AV_ESPECIES;
    if (!E) return [];
    return (E.especies || []).concat(E.extintas || []).filter(conDatos).map(e => {
      const ok = uicnVerificada(e), cat = ok ? (E.categorias || {})[e.uicn.categoria] : null;
      return { id: e.id, cientifico: e.cientifico, comun: e.comun, distribucion: e.distribucion,
        uicn: cat ? e.uicn.categoria : null, uicnNombre: cat, evaluacion: ok ? e.uicn.evaluacion : null };
    });
  }
  // Estilo propio de la sección (ui.css es de otro módulo): resumen plegable con la huella y una flecha que gira al abrir
  if (!document.getElementById('diario-especies-css')) {
    const st = document.createElement('style'); st.id = 'diario-especies-css';
    st.textContent = '#card details.especies > summary.lbl { cursor: pointer; list-style: none; }'
      + '#card details.especies > summary.lbl::-webkit-details-marker { display: none; }'
      + '#card:has(.diary) details.especies > summary.lbl::before { -webkit-mask-image: var(--i-paw); mask-image: var(--i-paw); }'
      + '#card details.especies > summary.lbl::after { content: ""; margin-left: auto; width: 9px; height: 9px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(-45deg); }'
      + '#card details.especies[open] > summary.lbl::after { transform: rotate(45deg); }'
      + '#card details.especies > ul.diary { margin-top: var(--sp-3); }'
      + '#card details.especies li small { overflow-wrap: anywhere; }';
    document.head.appendChild(st);
  }
  // «BirdLife International (2020). Amazona vittata. IUCN Red List 2020: e.T22686239A179276011» → «BirdLife International (2020), Lista Roja UICN e.T22686239A179276011»
  const citaUicn = ev => { const m = /^(.*?\(\d{4}\))\.\s.*?(e\.T\w+)\s*$/.exec(ev || ''); return m ? `${m[1]}, ${idioma() === 'en' ? 'IUCN Red List' : 'Lista Roja UICN'} ${m[2]}` : ev; };
  function htmlEspecies() {
    const L = especies(), l = idioma(), otro = l === 'es' ? 'en' : 'es';
    if (!L.length) return '';
    const items = L.map(s => {
      const estado = s.uicn ? `${esc(s.uicnNombre[l])} (${s.uicn})` : esc(tx('porVerificar'));
      const fuente = ['Wikipedia (EN, ES)'].concat(s.evaluacion ? [citaUicn(s.evaluacion)] : []).join(' · ');
      return `<li class="found" lang="${l}" data-especie="${esc(s.id)}"><span class="ico fauna" aria-hidden="true"></span><div>`
        + `<b>${esc(s.comun[l])}</b><small><span lang="${otro}">${esc(s.comun[otro])}</span> · <i lang="la">${esc(s.cientifico)}</i></small>`
        + `<small>${esc(s.distribucion[l])}</small><small class="uicn">${esc(tx('uicn'))}: ${estado}</small>`
        + `<small class="fuente">${esc(tx('fuente'))}: ${esc(fuente)}</small></div></li>`;
    }).join('');
    return `<details class="especies"><summary class="lbl lbl-especies">${esc(tx('titulo'))} <small>${L.length} ${esc(tx('especies'))}</small></summary><ul class="diary especies">${items}</ul></details>`;
  }
  function open() {
    const items = entries.map(f => S.field.includes(f.id)
      ? `<li class="found"><span class="ico ${f.cat}" aria-hidden="true"></span><div><b>${f.nombre}</b><small>${f.texto}</small></div></li>`
      : `<li><span class="ico" aria-hidden="true"></span><div><b>???</b><small>${(cats[f.cat] || {}).desconocido || 'Algo'} por descubrir</small></div></li>`).join('');
    const ropa = G.misiones.unlocks.map(u => `<li class="${S.unlocked.includes(u.clave) ? 'found' : ''}">${S.unlocked.includes(u.clave) ? '✓' : '·'} ${u.nombre} <small>(${u.pista})</small></li>`).join('');
    const byCat = Object.keys(cats).map(c => ` · ${cats[c].nombre} ${count(c)}/${entries.filter(x => x.cat === c).length}`).join('');
    G.ui.showCard(`<h2>${D.titulo || 'Diario'}</h2><p class="note">${S.field.length}/${total}${byCat}</p>
      <ul class="diary">${items}</ul>${secciones.map(x => x.html()).join('')}${htmlEspecies()}<span class="lbl">Ropa desbloqueable</span><ul class="ropa">${ropa}</ul>
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

  return { entries, meshes, total, found, open, seccion, especies, hud, renderButton, count, y: id => ys[id] };
});
