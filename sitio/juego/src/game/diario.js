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

  // F4-11 (docs/diseno/F4_GAME_FEEL.md): al encontrar algo, el botón «Diario n/13» salta con un destello dorado y ya muestra el
  // número nuevo. Al 13/13, pétalos sobre Vittata y «panel_final»: un poco después, para no doblarse con el sonido del hallazgo
  // (0,7 s) ni con el «unlock» de la ropa del Diario completo (1,6 s). «Reducir movimiento» (sistema o menú): sin salto ni
  // destello; el sonido y los pétalos se quedan. Con G.quiet (baterías), nada.
  const KF_DESTELLO = [{ color: '#ffd24a', textShadow: '0 0 12px rgba(255, 210, 74, 0.95)', offset: 0.3 }];
  const OPT_DESTELLO = { duration: 700, easing: 'ease-out' };
  const FIN = { esperaMs: 700, esperaRopaMs: 1600, petalos: 30 };
  const feel = { saltos: 0, completos: 0, finales: 0 };
  const movReducido = () => !!(G.renderer.REDUCED || (G.audio && G.audio.reducido === true) || document.documentElement.classList.contains('mov-reducido'));
  let finT = 0;
  function finalDiario() {
    finT = 0;
    if (G.quiet) return;
    G.audio.play('panel_final'); feel.finales++;
    if (G.fx.petalos) G.fx.petalos(S.pos.x, S.pos.y + 1.6, S.pos.z, FIN.petalos);
  }
  function celebrarHallazgo(completo, conRopa) {
    if (G.quiet) return;
    renderButton();
    const b = $('b-diary');
    if (b && !b.hidden && !movReducido() && G.fx.saltar(b)) {
      feel.saltos++;
      if (b.animate) try { b.animate(KF_DESTELLO, OPT_DESTELLO); } catch (e) { /* sin animación */ }
    }
    if (!completo) return;
    feel.completos++;
    clearTimeout(finT); finT = setTimeout(finalDiario, conRopa ? FIN.esperaRopaMs : FIN.esperaMs);
  }
  feel.celebrar = celebrarHallazgo; // las pruebas lo miran sin pasar por found() (que guarda y avisa al Aula)
  G.on('apply', () => { clearTimeout(finT); finT = 0; }, 46);
  function found(f) {
    if (S.field.includes(f.id)) return;
    const completoAntes = S.field.length >= total;
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
    let ropa = false;
    for (const h of D.hitos || []) if (h.todos ? S.field.length >= total : count(h.cat) >= h.min) { if (G.misiones.grant(h.id).length) ropa = true; }
    G.misiones.renderQuest(); G.guardado.autosave();
    celebrarHallazgo(!completoAntes && S.field.length >= total, ropa); // F4-11
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
    st.textContent = '#card details.especies > summary.lbl { cursor: pointer; list-style: none; min-height: var(--tap-sm, 44px); box-sizing: border-box; flex-wrap: wrap; align-content: center; overflow-wrap: anywhere; }'
      + '#card details.especies > summary.lbl::-webkit-details-marker { display: none; }'
      + '#card:has(.diary) details.especies > summary.lbl::before { -webkit-mask-image: var(--i-paw); mask-image: var(--i-paw); }'
      + '#card details.especies > summary.lbl::after { content: ""; margin-left: auto; width: 9px; height: 9px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(-45deg); }'
      + '#card details.especies[open] > summary.lbl::after { transform: rotate(45deg); }'
      + '#card details.especies > ul.diary { margin-top: var(--sp-3); }'
      + '#card details.especies li small { overflow-wrap: anywhere; }'
      + '#card .diario-sec{margin:12px 0 4px;padding-top:8px;border-top:2px dotted rgba(107,82,54,.28)}'
      + '#card .diario-sec > .lbl{display:block;font-weight:800;margin:0 0 6px}'
      + '#card .peces-album,#card .fauna-album,#card .inv-album{list-style:none;margin:.3em 0 .8em;padding:0;display:grid;gap:.45em}'
      + '#card .pez-tarjeta,#card .fauna-tarjeta{display:flex;gap:.6em;align-items:flex-start;padding:.55em .6em;border-radius:12px;background:rgba(255,248,230,.82);border:2px solid rgba(107,82,54,.18)}'
      + '#card .pez-tarjeta svg,#card .fauna-tarjeta svg{flex:none;width:60px;height:40px;background:#fff;border-radius:8px}'
      + '#card .pez-tarjeta span,#card .fauna-tarjeta span{display:flex;flex-direction:column;gap:.15em;min-width:0}'
      + '#card .pez-fuente a,#card .fauna-fuente a{color:inherit;text-decoration:underline;word-break:break-word}';
    document.head.appendChild(st);
  }
  // «BirdLife International (2020). Amazona vittata. IUCN Red List 2020: e.T22686239A179276011» → «BirdLife International (2020), Lista Roja UICN e.T22686239A179276011»
  const citaUicn = ev => { const m = /^(.*?\(\d{4}\))\.\s.*?(e\.T\w+)\s*$/.exec(ev || ''); return m ? `${m[1]}, ${idioma() === 'en' ? 'IUCN Red List' : 'Lista Roja UICN'} ${m[2]}` : ev; };
  function htmlEspecies() {
    const L = especies(), l = idioma(), otro = l === 'es' ? 'en' : 'es';
    if (!L.length) return '';
    const items = L.map(s => {
      // Revisión T2 (lista «terminado», b): sin estado UICN verificado la línea no sale (nunca «por verificar» ante el jugador)
      const estado = s.uicn ? `<small class="uicn">${esc(tx('uicn'))}: ${esc(s.uicnNombre[l])} (${s.uicn})</small>` : '';
      const fuente = ['Wikipedia (EN, ES)'].concat(s.evaluacion ? [citaUicn(s.evaluacion)] : []).join(' · ');
      return `<li class="found" lang="${l}" data-especie="${esc(s.id)}"><span class="ico fauna" aria-hidden="true"></span><div>`
        + `<b>${esc(s.comun[l])}</b><small><span lang="${otro}">${esc(s.comun[otro])}</span> · <i lang="la">${esc(s.cientifico)}</i></small>`
        + `<small>${esc(s.distribucion[l])}</small>${estado}`
        + `<small class="fuente">${esc(tx('fuente'))}: ${esc(fuente)}</small></div></li>`;
    }).join('');
    return `<details class="especies"><summary class="lbl lbl-especies">${esc(tx('titulo'))} <small>${L.length} ${esc(tx('especies'))}</small></summary><ul class="diary especies">${items}</ul></details>`;
  }
  // Ropa del Diario: el nombre y, si hay, la pista. Sin pista no se imprime «(undefined)» (QA-94).
  const textoRopa = s => {
    if (s == null || s === '' || s === 'undefined' || s === 'null') return '';
    const t = String(s);
    return (G.idioma && G.idioma.tr) ? G.idioma.tr(t) : t;
  };
  function htmlRopa(lista, desbloqueada) {
    return (lista || []).map(u => {
      const tiene = !!(u && desbloqueada(u.clave));
      const nombre = textoRopa(u && u.nombre);
      const pista = textoRopa(u && u.pista);
      return `<li class="${tiene ? 'found' : ''}">${tiene ? '✓' : '·'} ${nombre}${pista ? ` <small>(${pista})</small>` : ''}</li>`;
    }).join('');
  }
  function open() {
    const items = entries.map(f => S.field.includes(f.id)
      ? `<li class="found"><span class="ico ${f.cat}" aria-hidden="true"></span><div><b>${f.nombre}</b><small>${f.texto}</small></div></li>`
      : `<li><span class="ico" aria-hidden="true"></span><div><b>???</b><small>${(cats[f.cat] || {}).desconocido || 'Algo'} por descubrir</small></div></li>`).join('');
    const ropa = htmlRopa(G.misiones.unlocks, k => S.unlocked.includes(k));
    const byCat = Object.keys(cats).map(c => ` · ${cats[c].nombre} ${count(c)}/${entries.filter(x => x.cat === c).length}`).join('');
    const notasCiudad = (G.sorpresas && G.sorpresas.estado) ? G.sorpresas.estado().notas : [];
    const bloqueCiudad = notasCiudad.length ? `<span class="lbl">${esc(G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 'The city' : 'La ciudad')}</span><ul class="diary">${notasCiudad.map(n => `<li class="found"><div><small>${esc(n)}</small></div></li>`).join('')}</ul>` : '';
    const orden = ['fauna', 'peces', 'invasoras'];
    const secs = secciones.slice().sort((a, b) => (orden.indexOf(a.id) < 0 ? 9 : orden.indexOf(a.id)) - (orden.indexOf(b.id) < 0 ? 9 : orden.indexOf(b.id)));
    G.ui.showCard(`<h2>${D.titulo || 'Diario'}</h2><p class="note">${S.field.length}/${total}${byCat}</p>
      <ul class="diary">${items}</ul>${secs.map(x => `<section class="diario-sec" data-sec="${esc(x.id)}">${x.html()}</section>`).join('')}${htmlEspecies()}${bloqueCiudad}<span class="lbl">Ropa desbloqueable</span><ul class="ropa">${ropa}</ul>
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
  // Cada hallazgo flota y su destello gira. Solo se dibuja cerca del jugador: a más de ~120 m la
  // silueta y la chispa (0,16 m) son subpíxel, y cada entrada son 2 draw calls en cualquier vista.
  const VER2 = 120 * 120;
  G.on('render', dt => {
    const now = performance.now() / 1000, px = S.pos.x, pz = S.pos.z;
    for (const f of entries) {
      const g = meshes[f.id];
      const ver = !S.field.includes(f.id) && (f.x - px) * (f.x - px) + (f.z - pz) * (f.z - pz) < VER2;
      if (g.visible !== ver) g.visible = ver;
      if (!ver) continue;
      g.position.y = ys[f.id] + (f.agua ? Math.sin(now * 1.5 + f.x) * 0.08 : 0.15 + Math.sin(now * 2 + f.z) * 0.08);
      g.getObjectByName('spark').rotation.y += dt * 2.5;
    }
  }, 52);
  G.on('apply', () => { for (const f of entries) meshes[f.id].visible = !S.field.includes(f.id); }, 12);

  // BM72: prueba de «Amazonas del mundo» (AV.diarioTest). Comprueba el HTML y la tarjeta real a 343 px de ancho.
  async function test() {
    const out = [], check = (name, ok, extra) => out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) });
    const E = window.AV_ESPECIES, todas = E ? (E.especies || []).concat(E.extintas || []) : [], L = especies();
    check('Hay datos de especies (AV_ESPECIES)', !!E && todas.length > 0, todas.length);
    check('Solo salen las especies con datos completos', L.length === todas.filter(conDatos).length && L.length > 0, L.length + '/' + todas.length);
    const difiere = e => !(e.catalogo && e.uicn && e.catalogo.uicn === e.uicn.categoria), disc = todas.filter(e => conDatos(e) && difiere(e));
    const sinUicn = L.filter(s => !s.uicn);
    check('Las que siguen sin coincidir con el catálogo (tresmariae, sin evaluación propia) van sin estado UICN', todas.filter(difiere).length >= 1 && disc.every(e => { const s = L.find(x => x.id === e.id); return s && !s.uicn && !s.evaluacion; }), `${disc.length} con datos de ${todas.filter(difiere).length}`);
    check('Las que coinciden sí traen estado UICN', L.filter(s => s.uicn).length === L.length - sinUicn.length && L.some(s => s.id === 'vittata' && s.uicn === 'CR'));
    const aj = G.aula && G.aula.aj, ant = aj && aj.idioma;
    const lang0 = G.idioma && G.idioma.actual ? G.idioma.actual() : null;
    try {
      for (const l of ['es', 'en']) {
        if (aj) aj.idioma = l;
        const d = document.createElement('div'); d.innerHTML = htmlEspecies();
        const li = d.querySelectorAll('li[data-especie]');
        check(`[${l}] Una ficha por especie, con común, científico, distribución, UICN y fuente`, li.length === L.length && [...li].every(x => x.querySelectorAll('b').length === 1 && x.querySelector('i[lang=la]') && x.querySelector('.fuente') && x.querySelectorAll('small').length === (x.querySelector('.uicn') ? 4 : 3)));
        check(`[${l}] Revisión T2 · sin estado UICN verificado no sale la línea ni «por verificar»`, [...li].every(x => { const s = L.find(e => e.id === x.dataset.especie); return s && !!x.querySelector('.uicn') === !!s.uicn; }) && !/verificar|verified/i.test(d.textContent), sinUicn.length + ' sin estado');
        check(`[${l}] Sin «undefined» ni «null» en el texto`, !/undefined|null|\[object/.test(d.textContent));
        const fila = d.querySelector('[data-especie=diadema]');
        check(`[${l}] El loro diadema ya trae su estado verificado (${E.categorias.LC[l]}, LC; Kelvin 2-nov)`, !!fila && fila.querySelector('.uicn').textContent.includes(E.categorias.LC[l] + ' (LC)'));
        const v = d.querySelector('[data-especie=vittata]');
        check(`[${l}] La cotorra muestra ${E.categorias.CR[l]} (CR) y la cita de BirdLife`, !!v && v.querySelector('.uicn').textContent.includes(E.categorias.CR[l] + ' (CR)') && /BirdLife/.test(v.querySelector('.fuente').textContent));
        if (G.idioma && G.idioma.poner) await G.idioma.poner(l);
        const ropa = document.createElement('div');
        ropa.innerHTML = htmlRopa([
          { clave: 'mano:mapa', nombre: 'Carta de la bahía', pista: 'cruzar la bahía' },
          { clave: 'botas:constructor', nombre: 'Botas de constructor', pista: 'una casa que aguanta' },
          { clave: 'sin', nombre: 'Sin dato' },
          { clave: 'roto', nombre: 'Rota', pista: undefined },
        ], () => true);
        const rt = ropa.textContent;
        check(`[${l}] Carta de la bahía y Botas de constructor muestran su pista, y sin pista no sale «undefined»`,
          !/undefined|\(null\)/.test(rt) && /Carta de la bahía|Bay chart/.test(rt) && /cruzar la bahía|crossing the bay/.test(rt) &&
          /Botas de constructor|Builder/.test(rt) && /una casa que aguanta|a house that holds/.test(rt) &&
          /Sin dato/.test(rt) && !/Sin dato\s*\(/.test(rt) && /Rota/.test(rt) && !/Rota\s*\(/.test(rt), rt);
      }
    } finally {
      if (aj) aj.idioma = ant;
      if (lang0 && G.idioma && G.idioma.poner && G.idioma.actual && G.idioma.actual() !== lang0) await G.idioma.poner(lang0);
    }
    // La tarjeta real, estrecha: la sección existe, se abre y no desborda
    const card = $('card');
    if (card && card.hidden !== false || !G.ui.overlayOpen()) {
      try {
        card.style.maxWidth = '343px'; card.style.boxSizing = 'border-box';
        open();
        const det = card.querySelector('details.especies');
        check('El Diario muestra el desplegable «Amazonas del mundo»', !!det && det.querySelectorAll('li[data-especie]').length === L.length);
        if (det) det.open = true;
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const cr = card.getBoundingClientRect();
        const malos = [...card.querySelectorAll('details.especies *')].filter(n => n.getBoundingClientRect().right > cr.right + 1);
        check('A 343 px de ancho la sección no desborda', card.scrollWidth <= card.clientWidth + 1 && !malos.length, `scrollW ${card.scrollWidth} / ${card.clientWidth}, ${malos.length} fuera`);
        const sum = card.querySelector('details.especies > summary');
        check('El resumen mide ≥ 44 px de alto', !!sum && sum.getBoundingClientRect().height >= 43.5, sum && sum.getBoundingClientRect().height);
        const prevP = secciones.find(s => s.id === 'peces'), prevI = secciones.find(s => s.id === 'invasoras');
        seccion({ id: 'peces', html: () => '<span class="lbl">Peces del río (1/1)</span><ul class="peces-album"><li class="pez-tarjeta"><svg viewBox="0 0 60 40"></svg><span><b>Olivo</b> <i>Sicydium plumieri</i><small class="pez-fuente">Fuente: <a href="https://www.fishbase.se">FishBase</a></small></span></li></ul>' });
        seccion({ id: 'invasoras', html: () => '<span class="lbl">Patrulla</span><ul class="fauna-album inv-album"><li class="fauna-tarjeta"><svg viewBox="0 0 60 40"></svg><span><b>Tilapia</b> <i>Oreochromis mossambicus</i><small class="fauna-fuente">Fuente: <a href="https://nas.er.usgs.gov">USGS</a></small></span></li></ul>' });
        open();
        const pez = card.querySelector('[data-sec="peces"] .pez-tarjeta'), inv = card.querySelector('[data-sec="invasoras"] .fauna-tarjeta');
        const flex = n => n && getComputedStyle(n).display === 'flex';
        const pecesAntes = !!(pez && inv && card.querySelector('[data-sec="peces"]').compareDocumentPosition(card.querySelector('[data-sec="invasoras"]')) & Node.DOCUMENT_POSITION_FOLLOWING);
        check('Peces e invasoras van en su sección, con ficha, fuente y el mismo estilo que la fauna', !!pez && !!inv && flex(pez) && flex(inv) && /FishBase/.test(pez.textContent) && /USGS/.test(inv.textContent) && pecesAntes);
        if (prevP) seccion(prevP); else { const i = secciones.findIndex(s => s.id === 'peces'); if (i >= 0) secciones.splice(i, 1); }
        if (prevI) seccion(prevI); else { const i = secciones.findIndex(s => s.id === 'invasoras'); if (i >= 0) secciones.splice(i, 1); }
      } finally { G.ui.hideCard(); card.style.maxWidth = ''; card.style.boxSizing = ''; }
    }
    // F4-11: el botón del Diario salta con destello y muestra el número; al 13/13, pétalos y «panel_final» (tras el hallazgo o la ropa)
    {
      const A = G.audio, b = $('b-diary'), q0 = G.quiet, R0 = G.renderer.REDUCED, red0 = A.reducido, html = document.documentElement, mov0 = html.classList.contains('mov-reducido');
      const espera = ms => new Promise(r => setTimeout(r, ms)), veces = n => A.log.filter(x => x === n).length, J = G.fx.juicy;
      try {
        G.quiet = false; G.renderer.REDUCED = false; A.reducido = false; html.classList.remove('mov-reducido');
        const f0 = Object.assign({}, feel); A.log.length = 0;
        celebrarHallazgo(false, false); const numero = b.textContent === `${D.boton || 'Diario'} ${S.field.length}/${total}`;
        const salto = feel.saltos - f0.saltos;
        A.reducido = true; celebrarHallazgo(false, false); const saltoMenu = feel.saltos - f0.saltos - salto; A.reducido = false;
        await espera(FIN.esperaMs + 150); const sinFin = veces('panel_final') === 0;
        const p0 = J.petalos; celebrarHallazgo(true, false); const antes = veces('panel_final');
        await espera(FIN.esperaMs + 150); const fin = { sonido: veces('panel_final'), antes, petalos: J.petalos - p0 };
        A.log.length = 0; celebrarHallazgo(true, true); await espera(FIN.esperaMs + 150); const conRopaPronto = veces('panel_final');
        await espera(FIN.esperaRopaMs - FIN.esperaMs + 100); const conRopa = veces('panel_final');
        G.quiet = true; const f1 = Object.assign({}, feel); celebrarHallazgo(true, false); await espera(FIN.esperaMs + 150);
        const quieto = feel.saltos === f1.saltos && feel.completos === f1.completos && feel.finales === f1.finales;
        check('F4-11: el botón «Diario n/13» salta (no con «Reducir movimiento» del menú) y muestra el número; al 13/13, pétalos y «panel_final» una vez, después del hallazgo o de la ropa; con G.quiet, nada',
          numero && (b.hidden || salto === 1) && saltoMenu === 0 && sinFin && fin.antes === 0 && fin.sonido === 1 && fin.petalos === 1 && conRopaPronto === 0 && conRopa === 1 && quieto,
          JSON.stringify({ numero, salto, saltoMenu, sinFin, fin, conRopaPronto, conRopa, quieto }));
        // Revisión F4-11: el rebote CSS (.bump de ui.js) no se suma al salto por script (doble rebote). La guarda de ui.js
        // (AV.reboteContador.saltaYa) dice «ya salta» durante el salto y no sin él; si el observador está puesto, sin .bump.
        const RB = window.AV.reboteContador || {};
        G.quiet = false; const txt0 = b.textContent; b.classList.remove('bump'); for (const a of b.getAnimations ? b.getAnimations() : []) a.cancel();
        const quietoAntes = RB.saltaYa ? RB.saltaYa(b) : null;
        b.textContent = txt0 + ' ·'; const s1 = feel.saltos; celebrarHallazgo(false, false); const salta = feel.saltos - s1;
        const yaSalta = RB.saltaYa ? RB.saltaYa(b) : null; await espera(0);
        const rebote = { activo: RB.activo, quietoAntes, salta, yaSalta, bump: b.classList.contains('bump') };
        check('F4-11 (revisión): al saltar por script, el botón del Diario no lleva además el rebote CSS (.bump): un solo rebote',
          quietoAntes === false && (b.hidden || (salta === 1 && yaSalta === true)) && !rebote.bump, JSON.stringify(rebote));
      } finally { G.quiet = q0; G.renderer.REDUCED = R0; A.reducido = red0; html.classList.toggle('mov-reducido', mov0); }
    }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  return { feel, FIN, entries, meshes, total, found, open, seccion, especies, htmlEspecies, test, hud, renderButton, count, y: id => ys[id] };
});
