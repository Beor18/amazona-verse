/* Juego · Criadero de cotorras (huevos, eclosión, cuidado, XP y etapas). Dueño: game designer de huevos.
   - Datos: window.AV_HUEVOS (content/comun/huevos.js, compartido entre packs; se carga solo si falta).
   - XP: escucha G.on('aprendizaje', { tipo, id, intento }) de aula/diario/misiones. Cada tipo:id cuenta una vez.
     La mayor parte sale de aprender y explorar; cuidar da poco y sus cargas se recargan aprendiendo. Nada baja con el
     tiempo real, nada enferma ni muere, no hay azar ni compras.
   - Etapas: el bebé y el juvenil son el MISMO modelo de Vittata (AVCharacter.create) con escalas uniformes por hueso y
     plumón (cascarones de pelusa que comparten malla y esqueleto). No edita src/personaje: usa ch.bones, ch.rot, ch.play,
     ch.update y las banderas de animación. El factor de escala se deshace antes de ch.update y se reaplica después (los
     clips traen pistas de scale y el mixer solo escribe al cambiar), igual que rot() con las rotaciones.
   - Vista: overlay #criadero con su propio WebGLRenderer. Se abre con ?criadero=1 o G.criadero.abrir(). El mundo queda
     en pausa (G.pausa.set('criadero')). Estilos: src/ui/criadero.css (index.html lo enlaza; si falta, se inyecta al abrir).
   - Guardado propio en localStorage `${pack.meta.almacen}.criadero`: sin datos personales ni texto libre.
   - Modo Maestro: pestaña 'criadero' en G.aula.pestana (misma puerta de suma del menú de pausa).
   API: G.criadero = { abrir, cerrar, abierto, estado, dar, test, debug }.
   Diseño: docs/equipo/HUEVOS_GDD.md. Bandera: docs/BANDERA_PR_GUIA.md. */
AVE.module('criadero', function (G) {
  'use strict';
  const DATA_SRC = 'content/comun/huevos.js', CSS_SRC = 'src/ui/criadero.css';
  const D = () => window.AV_HUEVOS;
  const KEY = ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.' + ((window.AV_HUEVOS && window.AV_HUEVOS.sufijo) || 'criadero');
  const REDUCED = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Botones para simular XP: solo en el prototipo con ?demo=1 (en clase la XP sale del juego)
  const DEMO = /^(1|true)$/i.test(new URLSearchParams(location.search).get('demo') || '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lang = () => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? 'en' : 'es');
  const t = v => (v == null ? '' : typeof v === 'string' ? v : v[lang()] != null ? v[lang()] : v.es || '');
  const U = {
    titulo: { es: 'Criadero', en: 'Hatchery' }, eyebrow: { es: 'Aviario de Villa Raíz', en: 'Villa Raíz aviary' },
    cerrar: { es: 'Cerrar el criadero', en: 'Close the hatchery' }, docentes: { es: 'Docentes', en: 'Teachers' },
    nivel: { es: 'Nivel', en: 'Level' }, dias: { es: 'Días de incubación', en: 'Incubation days' },
    capsulas: { es: 'Cápsulas', en: 'Capsules' }, aprende: { es: 'Crece aprendiendo', en: 'Grows by learning' },
    real: { es: 'Del aviario real', en: 'From the real aviary' }, fuente: { es: 'Fuente', en: 'Source' },
    aprender: { es: 'Aprender', en: 'Learning' }, explorar: { es: 'Explorar', en: 'Exploring' }, cuidar: { es: 'Cuidar', en: 'Caring' },
    cargas: { es: 'Cuidados disponibles', en: 'Care available' }, sinCargas: { es: 'Tu cotorrita está feliz. Aprende algo nuevo en el juego para tener más cuidados.', en: 'Your chick is happy. Learn something new in the game to get more care.' },
    huevoCuidado: { es: 'Primero tiene que nacer: aprende y explora para darle calor.', en: 'It has to hatch first: learn and explore to keep it warm.' },
    incubar: { es: 'Poner en el nido', en: 'Place in the nest' }, ver: { es: 'Ver', en: 'View' }, bloqueada: { es: 'Por ganar', en: 'To earn' },
    eclosion: { es: '¡Se mueve! Ver la eclosión', en: 'It\'s moving! Watch it hatch' }, saltar: { es: 'Saltar', en: 'Skip' },
    nacio: { es: '¡Nació tu pichón!', en: 'Your chick hatched!' }, crecio: { es: '¡Creció!', en: 'It grew!' },
    liberar: { es: 'Lección de la liberación', en: 'Release lesson' }, siguiente: { es: 'Siguiente', en: 'Next' },
    demo: { es: 'Simular aprendizaje (prototipo)', en: 'Simulate learning (prototype)' }, posturas: { es: 'Posturas', en: 'Poses' },
    ganada: { es: '¡Ganaste una cápsula!', en: 'You earned a capsule!' }, nada: { es: 'Gana tu primera cápsula abriendo el criadero.', en: 'Earn your first capsule by opening the hatchery.' },
    libre: { es: 'Libre en el bosque', en: 'Free in the forest' }, xpSig: { es: 'para el nivel', en: 'to level' }, max: { es: 'Nivel máximo', en: 'Max level' },
    proxima: { es: 'Próxima etapa', en: 'Next stage' }, cargando: { es: 'Preparando el nido…', en: 'Preparing the nest…' },
  };
  const u = k => t(U[k]);

  // =====================================================================================================================
  // Estado y guardado (propio, versionado, sin datos personales)
  // =====================================================================================================================
  function fresh() {
    return { v: 1, activa: null, vista: null, capsulas: {}, otorgado: {}, banco: 0, cargas: 2, xpCarga: 0,
      fuentes: { aprender: 0, explorar: 0, cuidar: 0 }, conteo: {}, cuidados: { comida: 0, agua: 0, juego: 0, descanso: 0 },
      vistos: {}, liberadas: 0, avisos: [] };
  }
  let st = fresh();
  function cargar() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1 && d.capsulas && d.fuentes) st = Object.assign(fresh(), d);
      else st = fresh();
    } catch (e) { st = fresh(); }
  }
  function guardar() { try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; } }
  cargar();

  // =====================================================================================================================
  // XP, niveles, etapas e incubación
  // =====================================================================================================================
  const NIV = () => D().xp.niveles;
  const XP_MAX = () => NIV()[D().xp.nivelMax - 1];
  const XP_INCUBAR = () => D().incubacion.dias * D().incubacion.xpPorDia;
  function nivelDe(xp) { const n = NIV(); let L = 1; for (let i = 0; i < n.length; i++) if (xp >= n[i]) L = i + 1; return Math.min(L, D().xp.nivelMax); }
  function etapaDeNivel(L) { const e = D().etapas.find(x => x.niveles && L >= x.niveles[0] && L <= x.niveles[1]); return e ? e.id : 'adulto'; }
  function etapaDe(c) { if (!c || c.estado === 'disponible' || c.estado === 'incubando' || c.estado === 'lista') return 'huevo'; return etapaDeNivel(nivelDe(c.xp)); }
  const etapaDef = id => D().etapas.find(e => e.id === id);
  const huevoDef = id => D().huevos.find(h => h.id === id);
  const activa = () => (st.activa && st.capsulas[st.activa]) || null;
  const diasDe = c => Math.min(D().incubacion.dias, Math.floor((c ? c.xp : 0) / D().incubacion.xpPorDia));

  // Condiciones de 'obtener' (por pack; 'defecto' si el pack no tiene mapa propio). Nada aleatorio.
  const otorgados = pref => Object.keys(st.otorgado).filter(k => k.startsWith(pref + ':'));
  const catDe = id => { const e = ((G.pack.diario && G.pack.diario.entradas) || []).find(x => x.id === id); return e && e.cat; };
  function hallazgos(cat) {
    const ids = new Set(((G.S && G.S.field) || []).concat(otorgados('hallazgo').map(k => k.slice(9))));
    return [...ids].filter(id => !cat || catDe(id) === cat).length;
  }
  function misionesHechas() {
    const ids = new Set(Object.entries((G.S && G.S.missions) || {}).filter(([, v]) => v === true).map(([k]) => k).concat(otorgados('mision').map(k => k.slice(7))));
    return ids;
  }
  function cumple(c) {
    if (!c) return false;
    if (c.inicio) return true;
    if (c.mision) return misionesHechas().has(c.mision);
    if (c.misiones) return misionesHechas().size >= c.misiones;
    if (c.hallazgos) return hallazgos(c.hallazgos.cat) >= c.hallazgos.min;
    if (c.fichas) return otorgados('ficha').length >= c.fichas;
    if (c.preguntas) return otorgados('pregunta').length >= c.preguntas;
    if (c.liberadas) return st.liberadas >= c.liberadas;
    if (c.xpAprender) return st.fuentes.aprender + st.fuentes.explorar >= c.xpAprender;
    if (c.todas) return c.todas.every(cumple);
    return false;
  }
  const condDe = h => (h.obtener && (h.obtener[G.pack.id] || h.obtener.defecto)) || null;
  function revisarCapsulas() {
    const nuevas = [];
    for (const h of D().huevos) {
      if (st.capsulas[h.id]) continue;
      if (cumple(condDe(h))) { st.capsulas[h.id] = { estado: 'disponible', xp: 0 }; nuevas.push(h.id); }
    }
    // Sin cápsula activa: la primera disponible empieza a incubar sola (el niño ve el progreso desde el principio)
    if (!activa()) {
      const lib = D().huevos.find(h => st.capsulas[h.id] && st.capsulas[h.id].estado === 'disponible');
      if (lib) incubar(lib.id, true);
    }
    for (const id of nuevas) st.avisos.push({ tipo: 'capsula', id });
    return nuevas;
  }
  function incubar(id, auto) {
    const c = st.capsulas[id]; if (!c || c.estado !== 'disponible') return false;
    const a = activa();
    if (a && a.estado !== 'liberada' && etapaDe(a) !== 'adulto' && !auto) return false; // una cría a la vez hasta que sea adulta
    c.estado = 'incubando'; c.xp = st.banco; st.banco = 0;
    st.activa = id; st.vista = id;
    if (c.xp >= XP_INCUBAR()) c.estado = 'lista';
    return true;
  }

  // Suma XP a la cría activa (o al banco). grupo: aprender | explorar | cuidar
  function sumar(xp, grupo) {
    st.fuentes[grupo] = (st.fuentes[grupo] || 0) + xp;
    if (grupo !== 'cuidar') {
      st.xpCarga += xp;
      while (st.xpCarga >= D().cuidado.xpPorCarga) { st.xpCarga -= D().cuidado.xpPorCarga; st.cargas = Math.min(D().cuidado.cargasMax, st.cargas + 1); }
    }
    const c = activa();
    const antes = c ? etapaDe(c) : null;
    if (c && (c.estado === 'incubando' || c.estado === 'nacida') && c.xp < XP_MAX()) {
      const room = XP_MAX() - c.xp, add = Math.min(room, xp);
      c.xp += add; st.banco += xp - add;
      if (c.estado === 'incubando' && c.xp >= XP_INCUBAR()) { c.estado = 'lista'; st.avisos.push({ tipo: 'lista', id: st.activa }); }
    } else st.banco += xp;
    const despues = c ? etapaDe(c) : null;
    if (c && antes && antes !== despues && c.estado === 'nacida') st.avisos.push({ tipo: 'etapa', id: st.activa, de: antes, a: despues });
  }

  // Fuentes de XP del juego que no están en huevos.js (DIVERSION_CAP1 mejora 2): descubrir un lugar con nombre del mapa
  // (src/game/lugares.js) da poca XP de «explorar»; si huevos.js define la fuente, manda la suya.
  const FUENTES_EXTRA = { lugar: { xp: 8, grupo: 'explorar', nombre: { es: 'Lugar descubierto', en: 'Place discovered' } },
    fruta: { xp: 5, grupo: 'cuidar', nombre: { es: 'Fruto llevado al nido', en: 'Fruit brought to the nest' } } }; // src/game/banquete.js
  const fuenteDe = tipo => (D() && D().xp.fuentes[tipo]) || FUENTES_EXTRA[tipo] || null;
  // Evento de aprendizaje del juego (también lo usan los botones del prototipo)
  function dar(tipo, id, intento) {
    if (!D()) return 0;
    const F = fuenteDe(tipo); if (!F) return 0;
    const k = tipo + ':' + id;
    if (st.otorgado[k]) return 0;
    st.otorgado[k] = intento || 1;
    st.conteo[tipo] = (st.conteo[tipo] || 0) + 1;
    const xp = Array.isArray(F.xp) ? F.xp[Math.max(0, Math.min(F.xp.length - 1, (intento || 1) - 1))] : F.xp;
    sumar(xp, F.grupo);
    revisarCapsulas();
    guardar();
    avisarCompanero();
    if (abierto()) { pintar(); procesarAvisos(); }
    avisarXP(xp);
    return xp;
  }
  // Durante las baterías automáticas (G.quiet) el criadero no registra nada: las pruebas no ensucian la cría del niño
  G.on('aprendizaje', d => { if (!G.quiet && d && d.tipo && d.id != null) dar(d.tipo, d.id, d.intento); });

  // Cuidado: gasta una carga, da poca XP y una animación. Sin cargas: no castiga, invita a aprender.
  function cuidar(accion) {
    const A = D().cuidado.acciones.find(a => a.id === accion); if (!A) return { ok: false };
    const c = st.vista && st.capsulas[st.vista];
    if (!c || c.estado !== 'nacida') { aviso(u('huevoCuidado')); return { ok: false, motivo: 'huevo' }; }
    if (scene3d.chick) postura(A.postura, 4.5);
    if (st.cargas <= 0) { aviso(u('sinCargas')); return { ok: false, motivo: 'sinCargas' }; }
    st.cargas--; st.cuidados[accion] = (st.cuidados[accion] || 0) + 1;
    const prev = st.activa; st.activa = st.vista;   // el cuidado premia a la cría que estás mirando
    sumar(D().xp.fuentes.cuidado.xp, 'cuidar');
    st.activa = prev && st.capsulas[prev] && st.capsulas[prev].estado !== 'liberada' ? prev : st.vista;
    guardar(); globo(t(A.frase)); pintar(); procesarAvisos();
    return { ok: true };
  }

  // =====================================================================================================================
  // DOM del overlay
  // =====================================================================================================================
  let root = null, canvas = null, open = false, focoPrevio = null, cssListo = null;
  function css() {
    if (cssListo) return cssListo;
    cssListo = new Promise(res => {
      if (document.querySelector('link[data-criadero]')) { res(); return; }
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = CSS_SRC; l.dataset.criadero = '1';
      l.onload = () => res(); l.onerror = () => res(); document.head.appendChild(l);
    });
    return cssListo;
  }
  function datos() { return D() ? Promise.resolve() : AVE.assets.script(DATA_SRC); }
  const ICON = {
    semilla: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c4 3 6 7 6 10a6 6 0 0 1-12 0c0-3 2-7 6-10z" fill="currentColor"/><path d="M12 8v10" stroke="#0003" stroke-width="2" fill="none"/></svg>',
    gota: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c3.5 5 7 8.5 7 12.5A7 7 0 0 1 5 14.5C5 10.5 8.5 7 12 2z" fill="currentColor"/><path d="M9 15a3 3 0 0 0 3 3" stroke="#fff8" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    pelota: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="currentColor"/><path d="M4.5 9.5c5 2 10 2 15 0M6 16c4-1.5 8-1.5 12 0" stroke="#0003" stroke-width="2" fill="none"/></svg>',
    luna: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3a8 8 0 1 0 6 13A9 9 0 0 1 15 3z" fill="currentColor"/></svg>',
  };
  function montar() {
    root = document.createElement('section');
    root.id = 'criadero'; root.className = 'cr'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'cr-titulo');
    root.innerHTML = `
      <canvas class="cr-canvas" aria-label="Nido 3D del criadero"></canvas>
      <div class="cr-loading" role="status">${esc(u('cargando'))}</div>
      <header class="cr-top">
        <div class="cr-brand"><span class="cr-eyebrow">${esc(u('eyebrow'))}</span><h1 id="cr-titulo">${esc(u('titulo'))}</h1></div>
        <div class="cr-top-actions">
          <button class="btn ghost sm" type="button" data-cr="docentes" data-icon="book">${esc(u('docentes'))}</button>
          <button class="btn ghost icon" type="button" data-cr="cerrar" data-icon="close" aria-label="${esc(u('cerrar'))}"></button>
        </div>
      </header>
      <aside class="cr-col cr-left">
        <article class="cr-card cr-pet" aria-live="polite"></article>
        <article class="cr-card cr-real paper"></article>
      </aside>
      <aside class="cr-col cr-right">
        <article class="cr-card cr-caps"></article>
        <article class="cr-card cr-learn"></article>
      </aside>
      <nav class="cr-dock" aria-label="Cuidado"></nav>
      <div class="cr-hatch" hidden><button class="btn xl" type="button" data-cr="eclosion" data-icon="sparkle"></button></div>
      <button class="btn ghost sm cr-skip" type="button" data-cr="saltar" hidden></button>
      <div class="cr-banner" hidden aria-live="assertive"></div>
      <div class="cr-toast" role="status" aria-live="polite" hidden></div>
      <div class="cr-globo" role="status" aria-live="polite" hidden></div>
      <div class="cr-modal" hidden><div class="cr-modal-box paper" role="dialog" aria-modal="true" aria-labelledby="cr-modal-t"></div></div>`;
    document.body.appendChild(root);
    canvas = root.querySelector('.cr-canvas');
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-cr]'); if (!b) return;
      const k = b.dataset.cr, v = b.dataset.v;
      if (k === 'cerrar') cerrar();
      else if (k === 'docentes') { cerrar(); const m = document.getElementById('pause'); try { if (m && m.showPopover) m.showPopover(); } catch (er) { /* sin popover */ } }
      else if (k === 'cuidar') cuidar(v);
      else if (k === 'postura') postura(v, 6);
      else if (k === 'capsula') elegirCapsula(v);
      else if (k === 'incubar') { if (incubar(v)) { guardar(); construirNido(); pintar(); } }
      else if (k === 'eclosion') iniciarEclosion();
      else if (k === 'saltar') saltarEclosion();
      else if (k === 'demo') { const [tipo, n] = v.split(':'); dar(tipo, 'demo-' + n + '-' + Date.now().toString(36), 1); }
      else if (k === 'liberar') abrirLiberacion();
    });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!root.querySelector('.cr-modal').hidden) cerrarModal(); else cerrar(); }
    });
  }

  function barra(v, max, cls) { const p = max > 0 ? Math.max(0, Math.min(1, v / max)) : 1; return `<div class="cr-bar ${cls || ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.round(v)}"><i style="--p:${(p * 100).toFixed(1)}%"></i></div>`; }
  function pintar() {
    if (!root || !D()) return;
    const c = st.vista && st.capsulas[st.vista], h = c && huevoDef(st.vista), et = etapaDe(c);
    // --- Ficha de la cría ---
    const pet = root.querySelector('.cr-pet');
    if (!c) pet.innerHTML = `<p class="cr-empty">${esc(u('nada'))}</p>`;
    else {
      const chips = ['huevo', 'bebe', 'juvenil', 'adulto'].map(id => {
        const e = etapaDef(id), on = id === et, done = ['huevo', 'bebe', 'juvenil', 'adulto'].indexOf(id) < ['huevo', 'bebe', 'juvenil', 'adulto'].indexOf(et);
        return `<li class="${on ? 'on' : done ? 'done' : ''}"><b>${esc(t(e.nombre))}</b>${e.real && id !== 'huevo' ? `<small>${esc(t(e.real))}</small>` : ''}</li>`;
      }).join('');
      let cuerpo;
      if (et === 'huevo') {
        const d = diasDe(c), N = D().incubacion.dias;
        cuerpo = `<p class="cr-stat"><span>${esc(u('dias'))}</span><b>${d}/${N}</b></p>${barra(d, N, 'warm')}
          <p class="cr-hint">${esc(c.estado === 'lista' ? u('eclosion') : u('huevoCuidado'))}</p>`;
      } else {
        const L = nivelDe(c.xp), n = NIV(), lo = n[L - 1], hi = L < D().xp.nivelMax ? n[L] : lo;
        const sig = D().etapas.find(e => e.niveles && e.niveles[0] > L);
        cuerpo = `<p class="cr-stat"><span>${esc(u('nivel'))}</span><b>${L}</b><em>${c.xp} XP</em></p>${barra(c.xp - lo, hi - lo)}
          <p class="cr-hint">${L < D().xp.nivelMax ? `${hi - c.xp} XP ${esc(u('xpSig'))} ${L + 1}` : esc(u('max'))}${sig ? ` · ${esc(u('proxima'))}: ${esc(t(sig.nombre))} (${esc(u('nivel'))} ${sig.niveles[0]})` : ''}</p>
          ${c.estado === 'liberada' ? `<p class="cr-free">${esc(u('libre'))}</p>` : et === 'adulto' ? `<button class="btn magic sm" type="button" data-cr="liberar" data-icon="feather">${esc(u('liberar'))}</button>` : ''}`;
      }
      pet.innerHTML = `<p class="cr-eyebrow">${esc(t(D().rarezas[h.rareza]))}</p><h2>${esc(t(h.nombre))}</h2><p class="cr-lema">${esc(t(h.lema))}</p>
        <ol class="cr-stages" aria-label="Etapas">${chips}</ol>${cuerpo}`;
    }
    // --- Capa real ---
    const fact = hechoActual(), real = root.querySelector('.cr-real');
    real.innerHTML = fact ? `<p class="cr-eyebrow ink">${esc(u('real'))}</p><p>${esc(t(fact.texto))}</p>${fact.estado === 'verificado' ? `<p class="cr-src">${esc(u('fuente'))}: ${esc(fact.fuente)}</p>` : ''}` : '';
    real.hidden = !fact;
    // --- Cápsulas ---
    const caps = D().huevos.map(hh => {
      const cc = st.capsulas[hh.id], est = cc ? cc.estado : 'bloqueada', e2 = etapaDe(cc);
      const sel = st.vista === hh.id;
      const sub = !cc ? u('bloqueada') : est === 'liberada' ? u('libre') : est === 'disponible' ? t(D().rarezas[hh.rareza]) : t(etapaDef(e2).nombre) + (e2 !== 'huevo' ? ' · ' + nivelDe(cc.xp) : '');
      const a = hh.aspecto;
      return `<li><button type="button" class="cr-cap ${est}${sel ? ' sel' : ''}" data-cr="capsula" data-v="${hh.id}" aria-pressed="${sel}" style="--a:${a.a};--b:${a.b}" aria-label="${esc(t(hh.nombre))}: ${esc(sub)}${!cc ? '. ' + esc(t(hh.obtener.texto)) : ''}">
        <span class="cr-cap-egg" aria-hidden="true"></span><b>${esc(t(hh.nombre))}</b><small>${esc(sub)}</small></button></li>`;
    }).join('');
    const selH = st.vista && huevoDef(st.vista), selC = st.vista && st.capsulas[st.vista];
    const pista = !st.vista ? '' : !selC ? `<p class="cr-hint">${esc(t(selH.obtener.texto))}</p>`
      : selC.estado === 'disponible' ? `<button class="btn success sm" type="button" data-cr="incubar" data-v="${st.vista}" data-icon="sparkle">${esc(u('incubar'))}</button>` : '';
    root.querySelector('.cr-caps').innerHTML = `<h3>${esc(u('capsulas'))} <small>${Object.keys(st.capsulas).length}/${D().huevos.length}</small></h3><ul class="cr-cap-grid">${caps}</ul>${pista}`;
    // --- Aprender ---
    const F = st.fuentes, tot = F.aprender + F.explorar + F.cuidar || 1;
    const fila = (k, cls) => `<li><span>${esc(u(k))}</span>${barra(F[k], tot, cls)}<b>${F[k]} XP</b></li>`;
    root.querySelector('.cr-learn').innerHTML = `<h3>${esc(u('aprende'))}</h3><ul class="cr-src-list">${fila('aprender', 'learn')}${fila('explorar', 'explore')}${fila('cuidar', 'care')}</ul>
      ${DEMO ? `<details class="cr-demo"><summary>${esc(u('demo'))}</summary><div class="cr-demo-row">
        <button class="chip" type="button" data-cr="demo" data-v="ficha:1">+40 ${esc(t(D().xp.fuentes.ficha.nombre))}</button>
        <button class="chip" type="button" data-cr="demo" data-v="hallazgo:1">+25 ${esc(t(D().xp.fuentes.hallazgo.nombre))}</button>
        <button class="chip" type="button" data-cr="demo" data-v="mision:1">+60 ${esc(t(D().xp.fuentes.mision.nombre))}</button>
        <button class="chip" type="button" data-cr="demo" data-v="pregunta:1">+20 ${esc(t(D().xp.fuentes.pregunta.nombre))}</button></div></details>` : ''}`;
    // --- Dock de cuidado ---
    const nac = selC && selC.estado === 'nacida';
    const pips = Array.from({ length: D().cuidado.cargasMax }, (_, i) => `<i class="${i < st.cargas ? 'on' : ''}"></i>`).join('');
    const acc = D().cuidado.acciones.map(a => `<button class="cr-care" type="button" data-cr="cuidar" data-v="${a.id}" ${nac ? '' : 'aria-disabled="true"'}>${ICON[a.icono] || ''}<span>${esc(t(a.nombre))}</span></button>`).join('');
    const pos = nac ? (etapaDef(etapaDe(selC)).posturas || []).map(p => `<button class="chip" type="button" data-cr="postura" data-v="${p}" aria-pressed="${scene3d.pose === p}">${esc(t(D().posturas.find(x => x.id === p).nombre))}</button>`).join('') : '';
    root.querySelector('.cr-dock').innerHTML = `<div class="cr-care-row">${acc}</div><div class="cr-pips" title="${esc(u('cargas'))}" aria-label="${esc(u('cargas'))}: ${st.cargas}">${pips}</div>
      ${pos ? `<div class="cr-pose-row" aria-label="${esc(u('posturas'))}">${pos}</div>` : ''}`;
    // --- Botón de eclosión ---
    const hb = root.querySelector('.cr-hatch');
    hb.hidden = !(selC && selC.estado === 'lista') || hatch.on;
    hb.querySelector('button').textContent = u('eclosion');
    root.querySelector('.cr-skip').textContent = u('saltar');
  }
  // Ficha real según el momento de la cría que se mira (solo las verificadas tienen etiqueta de fuente)
  function hechoActual() {
    const R = D().real, c = st.vista && st.capsulas[st.vista], et = etapaDe(c);
    const momento = !c ? 'inicio' : c.estado === 'liberada' ? 'liberar' : et === 'huevo' ? (c.estado === 'lista' ? 'abrir' : 'incubar') : et === 'bebe' ? 'nacer' : et;
    const pick = R.filter(f => f.momento === momento && f.estado === 'verificado');
    const any = R.filter(f => f.momento === momento);
    // Las 'parcial' no se publican como ficha; su idea se cuenta en la narración (ver aviso al abrir la cápsula)
    return pick[0] || (any.length ? null : R.find(f => f.momento === 'inicio'));
  }
  let toastT = 0;
  function aviso(txt, ms) {
    if (!root) return;
    const el = root.querySelector('.cr-toast'); el.textContent = txt; el.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms || 3200);
    if (G.audio && G.audio.play) try { G.audio.play('tick'); } catch (e) { /* sin audio */ }
  }
  // Globo de papel sobre la cabeza de la cría (se recoloca en cada cuadro en paso())
  let globoT = 0;
  function globo(txt, ms) {
    if (!root) return;
    const el = root.querySelector('.cr-globo'); el.textContent = txt; el.hidden = false;
    clearTimeout(globoT); globoT = setTimeout(() => { el.hidden = true; }, ms || 2600);
    colocarGlobo();
  }
  const _v = new THREE.Vector3();
  function colocarGlobo() {
    const el = root && root.querySelector('.cr-globo'), k = scene3d.chick;
    if (!el || el.hidden || !k || !scene3d.camera) return;
    const head = k.ch.bones.cabeza001 || k.ch.root;
    head.getWorldPosition(_v); _v.y += 0.6 * (k.escala || 1) * (k.f.cabeza001 || 1); _v.project(scene3d.camera); // sobre la coronilla
    const w = canvas.clientWidth, h = canvas.clientHeight;
    el.style.left = Math.round((_v.x * 0.5 + 0.5) * w) + 'px'; el.style.top = Math.round((-_v.y * 0.5 + 0.5) * h) + 'px';
  }
  function banner(txt, sub) {
    const el = root.querySelector('.cr-banner');
    el.innerHTML = `<b>${esc(txt)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`; el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    setTimeout(() => { el.hidden = true; }, 3400);
  }
  function procesarAvisos() {
    while (st.avisos.length) {
      const a = st.avisos.shift();
      if (a.tipo === 'capsula') banner(u('ganada'), t(huevoDef(a.id).nombre));
      else if (a.tipo === 'lista' && a.id === st.vista) pintar();
      else if (a.tipo === 'etapa' && a.id === st.vista) crecer(a.a);
    }
    guardar();
  }
  function elegirCapsula(id) {
    st.vista = id;
    if (st.capsulas[id] && st.capsulas[id].estado === 'nacida') st.compa = id; // la que visitas es la que te acompaña
    guardar(); avisarCompanero();
    construirNido(); pintar();
  }

  // =====================================================================================================================
  // Escena 3D
  // =====================================================================================================================
  const scene3d = { renderer: null, scene: null, camera: null, clock: null, raf: 0, nest: null, chick: null, pose: 'sentado', t: 0 };
  const C = () => window.AVColor;
  const MS = o => C().make(THREE.MeshStandardMaterial, o);
  const GLSL = `
    float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
    vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n)); }
    float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 w=f*f*(3.0-2.0*f);
      return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),w.x), mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),w.x), w.y); }
    float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
    vec2 vor(vec2 p){ vec2 n=floor(p), f=fract(p); float m1=8.0, m2=8.0;
      for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 r=g+h22(n+g)-f; float d=dot(r,r);
        if(d<m1){ m2=m1; m1=d; } else if(d<m2){ m2=d; } }
      return vec2(sqrt(m1), sqrt(m2)-sqrt(m1)); }
    float sdStar5(vec2 p, float r, float rf){ const vec2 k1 = vec2(0.809016994375, -0.587785252292); const vec2 k2 = vec2(-k1.x,k1.y);
      p.x = abs(p.x); p -= 2.0*max(dot(k1,p),0.0)*k1; p -= 2.0*max(dot(k2,p),0.0)*k2; p.x = abs(p.x); p.y -= r;
      vec2 ba = rf*vec2(-k1.y,k1.x) - vec2(0.0,1.0); float h = clamp(dot(p,ba)/dot(ba,ba), 0.0, r);
      return length(p-ba*h) * sign(p.y*ba.x-p.x*ba.y); }`;

  // Perfil de huevo (más ancho abajo, punta arriba): puntos [radio, y] para LatheGeometry
  function eggProfile(R, Hh, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const p = i / n * Math.PI, y = -Math.cos(p) * Hh, r = Math.sin(p) * R * (1 + 0.16 * Math.cos(p));
      pts.push(new THREE.Vector2(Math.max(0.0001, r), y));
    }
    return pts;
  }
  const PAT = { paja: 0, flores: 1, olas: 2, hojas: 3, estrellas: 4, cosmos: 5, grabado: 6, cristal: 7 };
  // Material de pétalo de cápsula: patrón procedural por tema (uniformes en lineal), con la luz del motor
  function petalMaterial(asp) {
    const crystal = asp.patron === 'cristal', gold = asp.patron === 'grabado';
    const m = MS({ color: '#ffffff', roughness: gold ? 0.28 : crystal ? 0.08 : 0.62, metalness: gold ? 1 : 0, side: THREE.DoubleSide, transparent: crystal, depthWrite: !crystal });
    const un = { uA: { value: C().lin(asp.a) }, uB: { value: C().lin(asp.b) }, uC: { value: C().lin(asp.c || asp.b) }, uPat: { value: PAT[asp.patron] || 0 }, uTime: { value: 0 } };
    m.userData.u = un;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, un);
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
      sh.fragmentShader = 'uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uPat; uniform float uTime; varying vec3 vObj; vec3 avEm = vec3(0.0);\n' + GLSL + '\n' +
        sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float th = atan(vObj.z, vObj.x); vec2 q = vec2(th / 6.28318, vObj.y);
          vec3 col = uA;
          if (uPat < 0.5) {            // paja tejida
            vec2 w = vec2(q.x*30.0 + q.y*22.0, q.x*30.0 - q.y*22.0);
            float over = step(0.5, fract((floor(w.x) + floor(w.y)) * 0.5));
            float band = mix(abs(sin(w.x*3.14159)), abs(sin(w.y*3.14159)), over);
            col = mix(uB, uA, smoothstep(0.05, 0.85, band)) * (0.82 + 0.18*vnoise(q*vec2(260.0, 90.0)));
          } else if (uPat < 1.5) {     // flores tropicales
            col = mix(uA, uB, smoothstep(-0.25, 0.3, vObj.y));
            vec2 g = vec2(q.x*10.0, vObj.y*6.0); vec2 id = floor(g); vec2 f = fract(g) - 0.5 + (h22(id) - 0.5)*0.35;
            float r = length(f), an = atan(f.y, f.x), pr = 0.2 + 0.11*cos(an*5.0 + h21(id)*6.28);
            col = mix(col, vec3(1.0, 0.95, 0.86), (1.0 - smoothstep(pr - 0.02, pr + 0.02, r)) * 0.92);
            col = mix(col, vec3(1.0, 0.62, 0.08), 1.0 - smoothstep(0.045, 0.07, r));
          } else if (uPat < 2.5) {     // playa: arena abajo, olas arriba
            float sea = smoothstep(-0.02, 0.06, vObj.y + 0.03*sin(th*7.0));
            float wave = smoothstep(0.82, 0.95, sin(vObj.y*46.0 + sin(th*6.0)*1.4));
            vec3 sand = uA * (0.9 + 0.1*vnoise(q*vec2(300.0, 300.0)));
            col = mix(sand, uB * (0.8 + 0.25*smoothstep(0.0, 0.3, vObj.y)), sea);
            col = mix(col, vec3(1.0), wave * sea * 0.85);
            vec2 g = vec2(q.x*14.0, vObj.y*9.0); vec2 f = fract(g) - 0.5; float sh = 1.0 - smoothstep(0.05, 0.08, length(f + (h22(floor(g)) - 0.5)*0.5));
            col = mix(col, vec3(1.0, 0.86, 0.78), sh * (1.0 - sea) * step(0.6, h21(floor(g))));
          } else if (uPat < 3.5) {     // bosque: hojas con nervaduras
            vec2 v = vor(vec2(q.x*16.0, vObj.y*12.0));
            col = mix(uA, uB, smoothstep(0.0, 0.8, v.x) * 0.55 + 0.25*fbm(q*vec2(40.0, 30.0)));
            col = mix(col, uB * 1.25, 1.0 - smoothstep(0.0, 0.05, v.y));
            col *= 0.7 + 0.3*smoothstep(-0.3, 0.2, vObj.y);
          } else if (uPat < 4.5) {     // boricua: perla con estrellas azules y rojas (la bandera va en asta, no aquí)
            col = uA * (0.94 + 0.06*smoothstep(-0.3, 0.3, vObj.y));
            vec2 g = vec2(q.x*12.0, vObj.y*7.0 + 0.5*floor(q.x*12.0)); vec2 id = floor(g); vec2 f = (fract(g) - 0.5);
            float s = sdStar5(f*vec2(1.0, 1.0), 0.26, 0.382);
            vec3 sc = mod(id.x + id.y, 2.0) < 1.0 ? uB : uC;
            col = mix(col, sc, 1.0 - smoothstep(-0.01, 0.015, s));
          } else if (uPat < 5.5) {     // cosmos
            float neb = fbm(q*vec2(9.0, 7.0) + vec2(0.0, uTime*0.01));
            col = mix(uA, uB*0.6, smoothstep(0.45, 0.85, neb)) + vec3(0.25, 0.05, 0.3) * smoothstep(0.6, 0.9, fbm(q*vec2(14.0, 11.0) + 3.0));
            vec2 g = vec2(q.x*40.0, vObj.y*30.0); vec2 id = floor(g); vec2 f = fract(g) - 0.5 - (h22(id) - 0.5)*0.6;
            float star = step(0.82, h21(id)) * (1.0 - smoothstep(0.02, 0.07, length(f)));
            float tw = 0.6 + 0.4*sin(uTime*3.0 + h21(id + 7.0)*30.0);
            avEm = vec3(0.9, 0.95, 1.0) * star * tw * 2.0;
            col = mix(col, vec3(1.0), star);
          } else if (uPat < 6.5) {     // dorado grabado
            float lines = abs(sin(vObj.y*90.0 + sin(th*5.0)*2.0));
            float swirl = abs(sin(th*12.0 + vObj.y*30.0));
            col = mix(uA, uB, (1.0 - smoothstep(0.0, 0.18, lines)) * 0.5 + (1.0 - smoothstep(0.0, 0.12, swirl)) * 0.25);
          } else {                     // cristal iridiscente
            vec3 V = normalize(vViewPosition);
            float fr = pow(1.0 - abs(dot(V, normal)), 2.0);
            vec3 iri = 0.5 + 0.5*cos(6.28318*(vec3(0.0, 0.33, 0.67) + fr*1.4 + vObj.y*2.0));
            col = mix(uA, iri, 0.45) + fr*0.3;
            diffuseColor.a = 0.32 + 0.55*fr;
            avEm = iri * fr * 0.25;
          }
          diffuseColor.rgb = col;
        }`).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += avEm;');
    };
    m.customProgramCacheKey = () => 'avpetal' + (crystal ? 'c' : gold ? 'g' : '');
    return m;
  }
  // Huevo real: blanco mate, grietas procedurales que crecen (uCrack), brillo cálido (uGlow) y corte en zigzag (uPart)
  function eggMaterial(part) {
    const m = MS({ color: '#f7f3e8', roughness: 0.48, side: THREE.DoubleSide });
    const un = { uCrack: { value: 0 }, uGlow: { value: 0 }, uPart: { value: part }, uCutY: { value: 0.05 } };
    m.userData.u = un;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, un);
      sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vObj = position;');
      sh.fragmentShader = 'uniform float uCrack; uniform float uGlow; uniform float uPart; uniform float uCutY; varying vec3 vObj; float avC = 0.0;\n' + GLSL + '\n' +
        sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        {
          float th = atan(vObj.z, vObj.x);
          float zig = uCutY + 0.03 * (abs(fract(th * 9.0 / 6.28318) * 2.0 - 1.0) * 2.0 - 1.0);
          if (uPart > 0.5 && uPart < 1.5 && vObj.y > zig) discard;
          if (uPart > 1.5 && vObj.y < zig) discard;
          float dth = abs(mod(th - 1.5708 + 3.14159, 6.28318) - 3.14159);
          float seed = length(vec2(dth * 0.16, vObj.y - uCutY));
          vec2 v = vor(vec2(th * 0.15, vObj.y) * 34.0);
          float lines = (1.0 - smoothstep(0.02, 0.1, v.y)) * (1.0 - smoothstep(uCrack * 0.15 - 0.012, uCrack * 0.15, seed));
          float zl = (1.0 - smoothstep(0.002, 0.009, abs(vObj.y - zig))) * smoothstep(0.55, 0.85, uCrack);
          avC = max(lines * step(0.02, uCrack), zl);
          diffuseColor.rgb *= 0.97 + 0.03 * vnoise(vObj.xy * 120.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.13, 0.09), avC * 0.95);
          if (!gl_FrontFacing) diffuseColor.rgb *= vec3(0.93, 0.9, 0.82);
        }`).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.72, 0.32) * avC * uGlow * 2.5;');
    };
    m.customProgramCacheKey = () => 'avegg';
    return m;
  }
  // Textura de bandera fiel (AVWardrobe.prFlag cumple BANDERA_PR_GUIA.md; si faltara, se dibuja aquí con la misma regla)
  function flagCanvas(W) {
    const H = Math.round(W / 1.5), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    if (window.AVWardrobe && window.AVWardrobe.prFlag && !flagCanvas.propia) window.AVWardrobe.prFlag(g, 0, 0, W, H);
    else {
      for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : '#EE0000'; g.fillRect(0, i * H / 5, W, H / 5 + 0.5); }
      g.fillStyle = '#0044FF'; g.beginPath(); g.moveTo(0, 0); g.lineTo(H * Math.sqrt(3) / 2, H / 2); g.lineTo(0, H); g.closePath(); g.fill();
      const cx = H * Math.sqrt(3) / 6, cy = H / 2, R = H / 6; g.fillStyle = '#FFFFFF'; g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R * 0.381966 : R; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.closePath(); g.fill();
    }
    return cv;
  }

  function initScene() {
    if (scene3d.renderer) return;
    const r = scene3d.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    if (C().setMaxAnisotropy) C().setMaxAnisotropy(r.capabilities.getMaxAnisotropy());
    const s = scene3d.scene = new THREE.Scene();
    s.fog = new THREE.Fog(C().lin('#bfdcc0').getHex(), 4.5, 16);
    scene3d.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);
    scene3d.clock = new THREE.Clock();
    // Cielo: domo con degradado (sRGB directo, sin tone mapping)
    const sky = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color('#9fd6e8') }, mid: { value: new THREE.Color('#d9efc9') }, bot: { value: new THREE.Color('#1d4630') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = mix(mid, top, smoothstep(0.05, 0.6, h)); c = mix(bot, c, smoothstep(-0.12, 0.08, h)); gl_FragColor = vec4(c, 1.0); }',
    }));
    s.add(sky);
    s.add(new THREE.HemisphereLight(C().lin('#fff1d6'), C().lin('#2f5a3a'), 0.75));
    const key = new THREE.DirectionalLight(C().lin('#ffe2b0'), 1.35); key.position.set(2.5, 5, 3.2); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -2.5; key.shadow.camera.right = 2.5; key.shadow.camera.top = 2.5; key.shadow.camera.bottom = -2.5; key.shadow.bias = -0.0006;
    s.add(key);
    const rim = new THREE.DirectionalLight(C().lin('#a8e1ff'), 0.55); rim.position.set(-3, 2.2, -2.5); s.add(rim);
    // Suelo de musgo
    const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), MS({ color: '#3f6b35', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; s.add(ground);
    // Tronco cortado (palo colorado) con anillos en la tapa
    const ringsTex = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
      g.fillStyle = '#c99a62'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 18; i++) { g.strokeStyle = i % 2 ? 'rgba(110,70,35,.35)' : 'rgba(110,70,35,.18)'; g.lineWidth = 2 + (i % 3); g.beginPath(); g.arc(128 + Math.sin(i) * 2, 128, 8 + i * 6.6, 0, Math.PI * 2); g.stroke(); }
      g.strokeStyle = '#7a4a22'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 123, 0, Math.PI * 2); g.stroke();
      return C().tex(new THREE.CanvasTexture(cv));
    })();
    const barkTex = (() => {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
      g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, 256, 128);
      for (let i = 0; i < 90; i++) { const x = (i * 37) % 256; g.fillStyle = `rgba(${30 + (i % 5) * 8},${20 + (i % 4) * 6},10,.35)`; g.fillRect(x, 0, 2 + (i % 4), 128); }
      return C().tex(new THREE.CanvasTexture(cv), 'u');
    })();
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.98, 0.62, 40), [MS({ map: barkTex, roughness: 0.95 }), MS({ map: ringsTex, roughness: 0.85 }), MS({ color: '#4a3220' })]);
    stump.position.y = 0.31; stump.castShadow = stump.receiveShadow = true; s.add(stump);
    // Follaje: hojas de yagrumo, helechos y heliconias en tarjetas con silueta (canvas) y vaivén por shader
    s.add(follaje());
    // Polen y luciérnagas
    const pg = new THREE.BufferGeometry(), pp = [];
    for (let i = 0; i < 90; i++) pp.push((Math.random() - 0.5) * 7, 0.3 + Math.random() * 3, (Math.random() - 0.5) * 6 - 0.5);
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: C().lin('#fff3b0'), size: 0.035, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.name = 'polen'; s.add(pts);
    scene3d.nestRoot = new THREE.Group(); scene3d.nestRoot.position.y = 0.62; s.add(scene3d.nestRoot);
    s.add(nido());
    scene3d.fx = particulas(); s.add(scene3d.fx.obj);
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', tocar);
  }
  function follaje() {
    const g = new THREE.Group();
    const atlas = (() => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const x = cv.getContext('2d');
      // 0: yagrumo (palmeada, envés plateado) · 1: helecho · 2: hoja de plátano · 3: heliconia
      const cell = (i, fn) => { x.save(); x.translate((i % 2) * 256, Math.floor(i / 2) * 256); fn(); x.restore(); };
      cell(0, () => { for (let k = 0; k < 8; k++) { x.save(); x.translate(128, 150); x.rotate(-1.4 + k * 0.4); x.fillStyle = k % 2 ? '#3f8a3a' : '#4f9a44'; x.beginPath(); x.ellipse(0, -62, 22, 64, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#cfe3c0'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -120); x.stroke(); x.restore(); } x.fillStyle = '#5a3a22'; x.fillRect(124, 150, 8, 106); });
      cell(1, () => { x.strokeStyle = '#2f6b2a'; x.lineWidth = 4; x.beginPath(); x.moveTo(128, 250); x.quadraticCurveTo(140, 120, 110, 10); x.stroke(); for (let k = 0; k < 22; k++) { const t = k / 22, px = 128 + (140 - 128) * t * 2 * (1 - t) - 18 * t * t, py = 250 - 240 * t; for (const sd of [-1, 1]) { x.fillStyle = '#3f8a35'; x.beginPath(); x.ellipse(px + sd * 26 * (1 - t * 0.6), py, 26 * (1 - t * 0.6), 6, sd * 0.4, 0, Math.PI * 2); x.fill(); } } });
      cell(2, () => { x.fillStyle = '#4f9a3c'; x.beginPath(); x.ellipse(128, 128, 50, 122, 0.08, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#d7e8a8'; x.lineWidth = 4; x.beginPath(); x.moveTo(128, 250); x.lineTo(118, 8); x.stroke(); x.strokeStyle = 'rgba(30,70,20,.5)'; x.lineWidth = 2; for (let k = 0; k < 18; k++) { x.beginPath(); x.moveTo(122, 30 + k * 12); x.lineTo(80, 20 + k * 12); x.moveTo(122, 30 + k * 12); x.lineTo(170, 20 + k * 12); x.stroke(); } });
      cell(3, () => { x.strokeStyle = '#2f6b2a'; x.lineWidth = 12; x.beginPath(); x.moveTo(128, 256); x.lineTo(128, 30); x.stroke();
        for (let k = 0; k < 7; k++) { const y = 46 + k * 28, sd = k % 2 ? 1 : -1; x.fillStyle = '#e8402f'; x.beginPath(); x.moveTo(128, y + 18); x.quadraticCurveTo(128 + sd * 70, y + 6, 128 + sd * 84, y - 22); x.quadraticCurveTo(128 + sd * 40, y - 4, 128, y - 2); x.closePath(); x.fill();
          x.fillStyle = '#ffd23f'; x.beginPath(); x.moveTo(128 + sd * 84, y - 22); x.lineTo(128 + sd * 66, y - 10); x.lineTo(128 + sd * 70, y - 20); x.closePath(); x.fill(); x.fillStyle = '#3f8a3a'; x.fillRect(128 + sd * 30 - 3, y + 2, 6, 4); } });
      return C().tex(new THREE.CanvasTexture(cv));
    })();
    const mat = MS({ map: atlas, color: '#d9e8cf', alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
    const tm = { value: 0 }; mat.userData.time = tm;
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = tm;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float sway = sin(uTime * 1.3 + instanceMatrix[3].x * 1.7 + instanceMatrix[3].z) * 0.06 * max(0.0, position.y + 0.5);
        transformed.x += sway; transformed.z += sway * 0.5;`);
    };
    mat.customProgramCacheKey = () => 'avleaf';
    const CUANTOS = [9, 16, 8, 5], geos = [0, 1, 2, 3].map(i => {
      const p = new THREE.PlaneGeometry(1, 1); p.translate(0, 0.5, 0);
      const uv = p.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (i % 2) * 0.5 + uv.getX(k) * 0.5, (1 - Math.floor(i / 2) * 0.5 - 0.5) + uv.getY(k) * 0.5);
      return p;
    });
    const dummy = new THREE.Object3D(), rnd = AVE.util.rng(11);
    geos.forEach((geo, gi) => {
      const n = CUANTOS[gi], im = new THREE.InstancedMesh(geo, mat, n);
      for (let k = 0; k < n; k++) {
        // Semicírculo detrás del nido; los helechos más cerca, los yagrumos y plátanos al fondo
        const a = -Math.PI * 0.97 + (k + rnd() * 0.8) / n * Math.PI * 0.94, rad = (gi === 1 ? 2.6 : gi === 3 ? 3.8 : 4.2) + rnd() * 3.2;
        const sc = (gi === 0 ? 2.2 : gi === 2 ? 2.8 : gi === 3 ? 0.8 : 1.2) * (0.75 + rnd() * 0.6);
        dummy.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad - 0.3);
        dummy.rotation.set(0, -a + Math.PI / 2 + (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.3);
        dummy.scale.set(sc, sc * (0.9 + rnd() * 0.5), sc); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix);
      }
      im.castShadow = true; g.add(im);
    });
    // Troncos al fondo
    const trunkM = MS({ color: '#3b2a1c', roughness: 1 });
    for (let k = 0; k < 7; k++) { const a = -Math.PI * 0.85 + k * 0.42, rad = 6 + (k % 3); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 9, 10), trunkM); tr.position.set(Math.cos(a) * rad, 4.5, Math.sin(a) * rad - 1); g.add(tr); }
    g.userData.mat = mat;
    scene3d.leafMat = mat;
    return g;
  }
  function nido() {
    const g = new THREE.Group(); g.position.y = 0.62;
    const twig = new THREE.CylinderGeometry(0.008, 0.011, 0.4, 6);
    const N = 170, im = new THREE.InstancedMesh(twig, MS({ color: '#ffffff', roughness: 0.95 }), N);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), rnd = AVE.util.rng(5);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + rnd() * 0.3, ring = 0.36 + rnd() * 0.12, y = 0.02 + rnd() * 0.12;
      dummy.position.set(Math.cos(a) * ring, y, Math.sin(a) * ring);
      dummy.rotation.set(Math.PI / 2 + (rnd() - 0.5) * 0.7, 0, 0); dummy.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -a + (rnd() - 0.5) * 0.9);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, col.copy(C().lin(['#7a5434', '#93683f', '#5e3f24', '#a8814f'][i % 4])));
    }
    im.castShadow = true; im.receiveShadow = true; g.add(im);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 10, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), MS({ color: '#6e4d2c', roughness: 1, side: THREE.DoubleSide }));
    bowl.position.y = 0.25; bowl.receiveShadow = true; g.add(bowl);
    // Plumas sueltas y hojitas dentro del nido
    // Plumitas verdes sueltas en el fondo del nido (elipsoides aplanados)
    const feather = MS({ color: '#7fbf6a', roughness: 0.9 }), fg = new THREE.SphereGeometry(1, 10, 6);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(fg, feather); f.scale.set(0.012, 0.004, 0.05); f.position.set(Math.cos(i * 1.1) * 0.2, 0.035, Math.sin(i * 1.1) * 0.2); f.rotation.y = i * 1.7; g.add(f); }
    return g;
  }
  // Partículas: chispas doradas y trocitos de cáscara (pool fijo)
  function particulas() {
    const N = 160, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const spr = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,240,190,.8)'); gr.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
    const obj = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, map: spr, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    obj.frustumCulled = false;
    const P = Array.from({ length: N }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() }));
    function burst(at, n, color, speed, up) {
      let k = 0;
      for (const q of P) { if (q.life > 0) continue; q.life = 0.8 + Math.random() * 0.7; q.p.copy(at); q.v.set((Math.random() - 0.5), Math.random() * (up || 1), (Math.random() - 0.5)).normalize().multiplyScalar(speed * (0.5 + Math.random())); q.c.copy(C().lin(Array.isArray(color) ? color[k % color.length] : color)); if (++k >= n) break; }
    }
    function step(dt) {
      P.forEach((q, i) => {
        if (q.life > 0) { q.life -= dt; q.v.y -= 1.6 * dt; q.p.addScaledVector(q.v, dt); }
        const a = Math.max(0, Math.min(1, q.life));
        pos[i * 3] = q.p.x; pos[i * 3 + 1] = q.life > 0 ? q.p.y : -99; pos[i * 3 + 2] = q.p.z;
        col[i * 3] = q.c.r * a; col[i * 3 + 1] = q.c.g * a; col[i * 3 + 2] = q.c.b * a;
      });
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    }
    return { obj, burst, step };
  }

  // ---------- Cápsula + huevo real ----------
  const EGG_R = 0.15, EGG_H = 0.21;
  function construirNido() {
    if (!scene3d.scene) return;
    const R = scene3d.nestRoot;
    // limpia lo anterior (la cría se reconstruye si cambia la cápsula vista)
    for (const ch of R.children.slice()) { R.remove(ch); ch.traverse(o => { if (o.geometry && !o.userData.keepGeo) o.geometry.dispose(); }); }
    scene3d.capsule = null; scene3d.egg = null;
    if (scene3d.chick && scene3d.chick.capId !== st.vista) quitarCria();
    const c = st.vista && st.capsulas[st.vista], h = st.vista && huevoDef(st.vista);
    if (!c || !h) return;
    const et = etapaDe(c);
    if (et === 'huevo' && !hatch.on) quitarCria();
    ponerBandera(h);
    if (c.estado === 'liberada' && !(scene3d.chick && scene3d.pose === 'volando')) { quitarCria(); return; } // nido vacío: voló libre
    if (et === 'huevo' || hatch.on) { construirCapsula(h, c.estado !== 'disponible'); if (c.estado === 'lista' && !hatch.on) scene3d.capsule.userData.ready = true; }
    else ponerCria(st.vista, et, false);
  }
  // Bandera fiel en asta junto al nido (cápsula boricua, en todas las etapas): plana, 2:3, triángulo en el asta
  function ponerBandera(h) {
    scene3d.flag = null;
    if (!h.aspecto.bandera) return;
    const R = scene3d.nestRoot, g = new THREE.Group(); g.name = 'asta';
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.5, 8), MS({ color: '#8a6a3a' })); pole.position.y = 0.25; g.add(pole);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), MS({ color: '#d8b04a', metalness: 0.8, roughness: 0.3 })); knob.position.y = 0.505; g.add(knob);
    const tex = C().tex(new THREE.CanvasTexture(flagCanvas(300)));
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12, 12, 1), MS({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
    flag.geometry.translate(0.09, 0, 0); flag.position.y = 0.43; flag.name = 'bandera'; g.add(flag);
    g.position.set(0.5, 0, 0.12); g.rotation.y = -0.5; R.add(g);
    scene3d.flag = flag;
  }
  function construirCapsula(h, conHuevo) {
    const R = scene3d.nestRoot, g = new THREE.Group(); g.name = 'capsula';
    const asp = h.aspecto, pm = petalMaterial(asp);
    const prof = eggProfile(EGG_R * 1.42, EGG_H * 1.36, 28), N = 6, gap = 0.03, base = -EGG_H * 1.36;
    const petals = [];
    for (let i = 0; i < N; i++) {
      const phi0 = i * Math.PI * 2 / N + gap / 2, len = Math.PI * 2 / N - gap;
      const geo = new THREE.LatheGeometry(prof, 6, phi0, len);
      const pivot = new THREE.Group(); pivot.position.y = base + 0.02;
      const mesh = new THREE.Mesh(geo, pm); mesh.position.y = -(base + 0.02); mesh.castShadow = true;
      pivot.add(mesh); g.add(pivot);
      const mid = phi0 + len / 2;
      // LatheGeometry: x = r·sin(phi), z = r·cos(phi)
      pivot.userData.axis = new THREE.Vector3(Math.cos(mid), 0, -Math.sin(mid));
      petals.push(pivot);
    }
    // Base decorada de la cápsula
    const ring = new THREE.Mesh(new THREE.TorusGeometry(EGG_R * 1.25, 0.03, 10, 40), MS({ color: asp.b, roughness: 0.4, metalness: asp.brillo > 0.5 ? 1 : 0.2 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = base + 0.05; g.add(ring);
    g.position.y = -base + 0.02; // la base toca el fondo del nido
    // Huevo real (dos mitades con el mismo perfil: abajo y arriba del zigzag)
    const egg = new THREE.Group(); egg.name = 'huevo';
    const eprof = eggProfile(EGG_R, EGG_H, 32), eg = new THREE.LatheGeometry(eprof, 40);
    const bottom = new THREE.Mesh(eg, eggMaterial(1)), top = new THREE.Mesh(eg, eggMaterial(2));
    bottom.castShadow = top.castShadow = true; bottom.userData.keepGeo = false; top.userData.keepGeo = true;
    egg.add(bottom, top);
    egg.position.y = EGG_H + 0.06;
    // Patitas del pichón (zigodáctilas: dos dedos adelante y dos atrás), salen por debajo en la eclosión
    const legM = MS({ color: '#e8a07a', roughness: 0.65 }), legs = new THREE.Group();
    for (const sd of [-1, 1]) {
      const L = new THREE.Group(); L.position.set(sd * 0.055, -EGG_H * 0.82, 0.02);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.015, 0.09, 10), legM); shin.position.y = -0.045; L.add(shin);
      for (const [a, len] of [[0.35, 0.05], [-0.35, 0.05], [Math.PI - 0.3, 0.04], [Math.PI + 0.3, 0.035]]) {
        const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, len, 6), legM);
        toe.rotation.set(Math.PI / 2, 0, 0); toe.position.set(Math.sin(a) * len * 0.5, -0.09, Math.cos(a) * len * 0.5);
        toe.rotation.y = a; const pv = new THREE.Group(); pv.add(toe); L.add(pv);
      }
      L.scale.setScalar(0.001); legs.add(L);
    }
    egg.add(legs);
    R.add(g); R.add(egg);
    scene3d.capsule = g; scene3d.egg = egg;
    g.userData = { petals, pm, open: conHuevo ? 0 : 0, base };
    egg.userData = { bottom, top, legs };
    egg.visible = false; // dentro de la cápsula cerrada no se ve (se muestra al abrir)
  }

  // ---------- Cría (mismo modelo de Vittata) ----------
  const TOE_BONES = ['pieL4', 'pieL5', 'pieL6', 'pieL7', 'pieL8', 'pieL8002', 'pieL4001', 'pieL5001', 'pieL6001', 'pieL7001', 'pieL8001', 'pieL8003'];
  let charPromise = null;
  async function ponerCria(capId, etapa, pop) {
    if (scene3d.chick && scene3d.chick.capId === capId) { fijarEtapa(etapa, false); return scene3d.chick; }
    quitarCria();
    const token = scene3d.chickToken = {};
    let ch;
    try { ch = await window.AVCharacter.create(); } catch (e) { console.warn('criadero: sin modelo de Vittata', e); return null; }
    if (token !== scene3d.chickToken || !scene3d.scene) { window.AVCharacter.disposeObject && window.AVCharacter.disposeObject(ch.root); return null; }
    const holder = new THREE.Group(); holder.name = 'cria';
    const base = 1.25 / ch.height; // el adulto mide 1,25 unidades del criadero
    holder.add(ch.root);
    scene3d.nestRoot.add(holder);
    const k = { ch, holder, base, capId, f: {}, fNow: {}, fluff: crearPlumon(ch), extras: {}, yOff: 0, etapa: null, grow: null, pose: {}, poseT: 0, auto: 0 };
    scene3d.chick = k;
    fijarEtapa(etapa, false);
    if (pop) { holder.scale.setScalar(0.25); k.popT = 0; }
    pintar();
    return k;
  }
  function quitarCria() {
    scene3d.chickToken = null;          // también cancela una creación pendiente
    const k = scene3d.chick; if (!k) return;
    k.holder.parent && k.holder.parent.remove(k.holder);
    for (const s of k.fluff.shells) { s.mesh.material.dispose(); }
    if (window.AVCharacter.disposeObject) window.AVCharacter.disposeObject(k.ch.root);
    scene3d.chick = null;
  }
  // Look por etapa: piezas existentes del ropero (las NUEVAS usan su 'respaldo' hasta que exista el modelo)
  function lookDe(capId, etapa) {
    const h = huevoDef(capId), acc = {};
    const orden = etapa === 'adulto' ? ['bebe', 'juvenil', 'adulto'] : etapa === 'juvenil' ? ['bebe', 'juvenil'] : ['bebe'];
    // Las piezas se acumulan por etapa; la de la etapa más alta gana su ranura
    for (const e of orden) for (const p of (h.traits[e] || [])) {
      const it = p.nuevo ? p.respaldo : p;
      if (it && it.slot) acc[it.slot] = { id: it.id, color: it.color, style: it.style };
    }
    return { species: 'vittata', accessories: acc };
  }
  // Piel de especie de la cría (huevos.js: 'especie' opcional por cápsula). Sin especie o sin piel: Vittata con su tinte
  const pielCria = (ch, capId) => { const h = huevoDef(capId); if (window.AVE.pieles) window.AVE.pieles.aplicar(ch, (h && h.especie) || null); };
  const tieneNuevo = (capId, etapa, id) => { const h = huevoDef(capId); const o = etapa === 'adulto' ? ['bebe', 'juvenil', 'adulto'] : etapa === 'juvenil' ? ['bebe', 'juvenil'] : ['bebe']; return o.some(e => (h.traits[e] || []).some(p => p.nuevo === id)); };
  function fijarEtapa(etapa, animar) {
    const k = scene3d.chick; if (!k) return;
    const E = etapaDef(etapa), P = (E && E.proporciones) || { escala: 1, huesos: {}, plumon: null };
    k.etapa = etapa;
    const target = {}; for (const [b, v] of Object.entries(P.huesos || {})) if (k.ch.bones[b]) target[b] = v;
    for (const b of Object.keys(k.f)) if (!(b in target)) target[b] = 1;
    const from = Object.assign({}, k.f), fromS = k.escala || P.escala, fromFl = k.fl || { capas: 0, largo: 0 };
    const toFl = P.plumon || { capas: 0, largo: 0 };
    if (animar && !REDUCED) k.grow = { t: 0, dur: 1.8, from, to: target, fromS, toS: P.escala, fromFl, toFl, plumon: P.plumon };
    else { k.f = target; k.escala = P.escala; k.fl = toFl; aplicarPlumon(k, toFl, P.plumon); k.yOff = medirPies(k); }
    // Cascarón-gorro (bebé), anillo científico (adulto) y look
    k.ch.applyLook(lookDe(k.capId, etapa)); pielCria(k.ch, k.capId);
    extras(k, etapa);
  }
  // Escala por hueso: se deshace antes de ch.update y se reaplica después
  function deshacer(k) { for (const [b, v] of Object.entries(k.fNow)) { const bone = k.ch.bones[b]; if (bone && v !== 1) bone.scale.multiplyScalar(1 / v); } k.fNow = {}; }
  function reaplicar(k) { for (const [b, v] of Object.entries(k.f)) { const bone = k.ch.bones[b]; if (bone && v !== 1) bone.scale.multiplyScalar(v); k.fNow[b] = v; } }
  function minPie(k) { let m = Infinity; const v = new THREE.Vector3(); for (const n of TOE_BONES) { const b = k.ch.bones[n]; if (b) { b.getWorldPosition(v); m = Math.min(m, v.y); } } return m; }
  // Cuánto hay que bajar la cría para que los pies (más cortos) toquen el nido
  function medirPies(k) {
    deshacer(k); k.ch.root.updateMatrixWorld(true); const a = minPie(k);
    reaplicar(k); k.ch.root.updateMatrixWorld(true); const b = minPie(k);
    const s = k.holder.getWorldScale(new THREE.Vector3()).y || 1;
    return isFinite(a) && isFinite(b) ? (a - b) / s : 0;
  }
  // Plumón: cascarones (shell fur) sobre la malla del cuerpo, compartiendo geometría y esqueleto; ojos y cara despejados
  function crearPlumon(ch) {
    let body = null;
    ch.root.traverse(o => { if (o.isSkinnedMesh && !o.userData.isAccessory && o.material && !Array.isArray(o.material) && (!body || o.geometry.attributes.position.count > body.geometry.attributes.position.count)) body = o; });
    const shells = [];
    if (!body) return { shells };
    const mi = window.AVCharacter.mountsInfo && window.AVCharacter.mountsInfo();
    const eyeL = new THREE.Vector3().fromArray((mi && mi.eyes && mi.eyes.L) || [0.16, 1.2, 0.12]), eyeR = new THREE.Vector3().fromArray((mi && mi.eyes && mi.eyes.R) || [-0.16, 1.2, 0.12]);
    const beak = mi && mi.beak_bbox;
    const NL = 4;
    for (let i = 0; i < NL; i++) {
      const m = MS({ color: '#ffffff', map: body.material.map || null, roughness: 1, metalness: 0 });
      m.skinning = true; m.defines = Object.assign({}, m.defines, { USE_UV: '' });
      const un = { uLen: { value: 0 }, uLayer: { value: (i + 1) / NL }, uTint: { value: C().lin('#eef0e2') }, uTip: { value: C().lin('#cfe6b8') },
        uEyeL: { value: eyeL }, uEyeR: { value: eyeR }, uFade: { value: 1 }, uBeakZ: { value: beak ? beak.min[2] + 0.12 : 0.1 } };
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, un);
        sh.vertexShader = 'uniform float uLen; uniform float uLayer; varying vec3 vBind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vBind = position;
          float tuft = smoothstep(1.24, 1.4, position.y);
          transformed += normal * uLen * uLayer * (1.0 + 1.8 * tuft);`);
        sh.fragmentShader = 'uniform float uLayer; uniform vec3 uTint; uniform vec3 uTip; uniform vec3 uEyeL; uniform vec3 uEyeR; uniform float uFade; uniform float uBeakZ; varying vec3 vBind;\n' + GLSL + '\n' +
          sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          {
            vec2 g = vUv * 300.0; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
            float strand = h21(id) * (1.0 - length(f) * 1.6);
            if (strand < uLayer * 0.62) discard;
            float eye = min(distance(vBind, uEyeL), distance(vBind, uEyeR));
            if (eye < 0.115) discard;
            if (vBind.y > 0.86 && vBind.y < 1.19 && vBind.z > uBeakZ) discard;
            diffuseColor.rgb = mix(diffuseColor.rgb, uTint, 0.5 + 0.3 * uLayer);
            diffuseColor.rgb = mix(diffuseColor.rgb, uTip, uLayer * uLayer * 0.4);
            diffuseColor.rgb *= 0.72 + 0.28 * uLayer;
          }`);
      };
      m.customProgramCacheKey = () => 'avfluff';
      const s = new THREE.SkinnedMesh(body.geometry, m);
      s.bind(body.skeleton, body.bindMatrix);
      s.position.copy(body.position); s.quaternion.copy(body.quaternion); s.scale.copy(body.scale);
      s.frustumCulled = false; s.castShadow = false; s.receiveShadow = true; s.visible = false; s.userData.isFluff = true;
      body.parent.add(s);
      shells.push({ mesh: s, u: un });
    }
    return { shells };
  }
  function aplicarPlumon(k, fl, def) {
    const n = Math.round(fl.capas || 0);
    k.fluff.shells.forEach((s, i) => {
      s.mesh.visible = i < n && fl.largo > 0.0005;
      s.u.uLen.value = fl.largo || 0;
      s.u.uLayer.value = n ? (i + 1) / Math.max(1, n) : 1;
      if (def) { C().set(s.u.uTint.value, def.color); C().set(s.u.uTip.value, def.punta); }
    });
  }
  // Piezas propias del criadero: cascarón-gorro (bebé, el huevo es blanco) y anillo de anillamiento científico (adulto)
  function extras(k, etapa) {
    const B = k.ch.bones;
    for (const o of Object.values(k.extras)) o.parent && o.parent.remove(o);
    k.extras = {};
    if (etapa === 'bebe' && tieneNuevo(k.capId, etapa, 'cascaron_gorro') && B.mount_head_top) {
      const m = new THREE.Mesh(new THREE.LatheGeometry(eggProfile(EGG_R, EGG_H, 32), 32), eggMaterial(2));
      m.material.userData.u.uCrack.value = 0.35;
      // mount_head_top: +Z sale de la cabeza (arriba), +Y al frente
      const wrap = new THREE.Group(); wrap.add(m);
      m.rotation.x = Math.PI / 2; m.position.z = -0.02;
      const s = 1 / Math.max(1e-4, B.mount_head_top.getWorldScale(new THREE.Vector3()).x) * (k.holder.getWorldScale(new THREE.Vector3()).x * k.base) * 1.15;
      wrap.scale.setScalar(isFinite(s) ? s : 1);
      wrap.rotation.set(0, 0.25, 0.3);
      B.mount_head_top.add(wrap); k.extras.cascaron = wrap;
    }
    if (etapa === 'adulto' && tieneNuevo(k.capId, etapa, 'anillo_cientifico') && B.pieL3) {
      const ring = new THREE.Group();
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 20, 1, true), MS({ color: '#c9d1d6', metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }));
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0345, 0.0345, 0.008, 20, 1, true), MS({ color: huevoDef(k.capId).aspecto.b, roughness: 0.5, side: THREE.DoubleSide }));
      ring.add(band, stripe); ring.position.y = 0.045;
      B.pieL3.add(ring); k.extras.anillo = ring;
    }
  }

  // ---------- Posturas del bebé (clips del rig + rot() de la API pública, que se deshace solo en el cuadro siguiente) ----------
  function postura(id, dur) {
    const k = scene3d.chick; if (!k) return false;
    if (!D().posturas.some(p => p.id === id) && id !== 'volando') return false;
    scene3d.pose = id; k.poseT = 0; k.poseDur = dur || 0; k.auto = 0;
    const base = (D().posturas.find(p => p.id === id) || {}).base || 'Idle';
    if (id === 'jugando') k.ch.play('Celebrate', true);
    else if (k.ch.current !== k.ch.actions[base]) k.ch.play(base);
    if (root) for (const b of root.querySelectorAll('[data-cr="postura"]')) b.setAttribute('aria-pressed', String(b.dataset.v === id));
    return true;
  }
  const lerp = (a, b, x) => a + (b - a) * x;
  function animarCria(dt) {
    const k = scene3d.chick; if (!k) return;
    const ch = k.ch, B = ch.bones;
    // Crecimiento animado entre etapas
    if (k.grow) {
      const g = k.grow; g.t += dt; const x = Math.min(1, g.t / g.dur), e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const f = {}; for (const b of new Set(Object.keys(g.from).concat(Object.keys(g.to)))) f[b] = lerp(g.from[b] || 1, g.to[b] == null ? 1 : g.to[b], e);
      deshacer(k); k.f = f; k.escala = lerp(g.fromS, g.toS, e);
      const fl = { capas: Math.max(g.fromFl.capas || 0, g.toFl.capas || 0), largo: lerp(g.fromFl.largo || 0, g.toFl.largo || 0, e) };
      if (x >= 1) { fl.capas = g.toFl.capas || 0; k.grow = null; k.fl = g.toFl; }
      aplicarPlumon(k, fl, g.plumon || g.toFl.color ? g.plumon : null);
      k.holder.rotation.y = e * Math.PI * 2;
      reaplicar(k); k.yOff = medirPies(k); deshacer(k);
    }
    // Pose automática: el bebé va solo de una postura a otra (sin pedir nada al niño)
    k.poseT += dt;
    if (k.poseDur && k.poseT > k.poseDur) { k.poseDur = 0; postura('sentado'); }
    if (!k.poseDur && !hatch.on) { k.auto += dt; if (k.auto > 5.5) { const op = k.etapa === 'adulto' ? ['caminando', 'aleteando', 'sentado', 'jugando'] : ['caminando', 'saltando', 'aleteando', 'sentado', 'jugando']; postura(op[Math.floor(Math.random() * op.length)], 3.2); } }
    const pose = scene3d.pose, T = k.poseT;
    // Banderas del personaje antes de update
    const s = k.base * (k.escala || 1) * (k.popS == null ? 1 : k.popS);
    ch.root.scale.setScalar(k.base);
    k.holder.scale.setScalar((k.escala || 1) * (k.popS == null ? 1 : k.popS));
    ch.root.position.set(0, 0, 0);
    ch.gait = pose === 'caminando' ? 1 : 0;
    ch.airborne = false;
    ch.wingMode = pose === 'aleteando' ? 'flap' : pose === 'caminando' ? 'walk' : pose === 'volando' ? 'fly' : 'idle';
    ch.expression = pose === 'durmiendo' ? 'happy' : pose === 'jugando' || pose === 'comiendo' ? 'happy' : pose === 'bebiendo' ? 'curious' : 'neutral';
    deshacer(k);
    ch.update(dt);
    reaplicar(k);
    // Encima del clip: ajustes de postura (ch.rot se deshace solo en el siguiente update)
    let y = 0, ang = k.holder.userData.ang || 0, px = 0, pz = 0;
    if (pose === 'sentado' || pose === 'durmiendo' || pose === 'comiendo' || pose === 'bebiendo') {
      for (const [hip, knee, ank] of [['pieL1', 'pieL2', 'pieL3'], ['pieL1001', 'pieL2001', 'pieL3001']]) {
        if (B[hip]) { ch.rot(B[hip], 'x', -0.55); ch.rot(B[knee], 'x', 1.25); ch.rot(B[ank], 'x', -0.7); }
      }
      y -= 0.07;
      if (pose === 'durmiendo') { if (B.cabeza) { ch.rot(B.cabeza, 'x', 0.45); ch.rot(B.cabeza, 'z', 0.15); } y += Math.sin(scene3d.t * 1.6) * 0.004; if (B.espalda1) ch.rot(B.espalda1, 'x', 0.12); }
      if (pose === 'comiendo') { const peck = Math.max(0, Math.sin(T * 7)); if (B.cabeza) ch.rot(B.cabeza, 'x', 0.6 * peck); if (B.espalda2) ch.rot(B.espalda2, 'x', 0.25 * peck); }
      if (pose === 'bebiendo') { const c = (T % 1.6) / 1.6, dip = c < 0.4 ? Math.sin(c / 0.4 * Math.PI) : 0, up = c > 0.45 && c < 0.8 ? Math.sin((c - 0.45) / 0.35 * Math.PI) : 0; if (B.cabeza) ch.rot(B.cabeza, 'x', 0.7 * dip - 0.45 * up); }
    } else if (pose === 'saltando') {
      const c = (T * 1.6) % 1, air = c < 0.55 ? Math.sin(c / 0.55 * Math.PI) : 0;
      y += air * 0.16; ch.airborne = air > 0.2;
      if (air > 0.1) ch.wingMode = 'flap';
      else for (const [hip, knee] of [['pieL1', 'pieL2'], ['pieL1001', 'pieL2001']]) if (B[hip]) { ch.rot(B[hip], 'x', -0.3); ch.rot(B[knee], 'x', 0.6); }
    } else if (pose === 'aleteando') {
      y += Math.max(0, Math.sin(T * 5)) * 0.05;
    } else if (pose === 'jugando') {
      const c = Math.sin(T * 6); if (B.cabeza) ch.rot(B.cabeza, 'z', 0.25 * c); y += Math.max(0, Math.sin(T * 6)) * 0.04;
    } else if (pose === 'caminando') {
      ang += dt * 0.9; px = Math.cos(ang) * 0.16; pz = Math.sin(ang) * 0.16;
      k.holder.rotation.y = -ang + Math.PI;  // mira hacia donde camina (tangente)
    } else if (pose === 'volando') {
      ang += dt * 0.8; px = Math.cos(ang) * 0.9; pz = Math.sin(ang) * 0.6; y += 0.9 + Math.sin(T * 2) * 0.08;
      k.holder.rotation.y = -ang + Math.PI;
      if (B.espalda1) ch.rot(B.espalda1, 'x', 0.6);
    }
    if (pose !== 'caminando' && pose !== 'volando' && !k.grow) {
      // vuelve al centro mirando a la cámara
      k.holder.position.x *= 0.9; k.holder.position.z *= 0.9;
      k.holder.rotation.y = lerp(k.holder.rotation.y % (Math.PI * 2), 0, Math.min(1, dt * 4));
    } else if (pose === 'caminando' || pose === 'volando') { k.holder.position.x = px; k.holder.position.z = pz; }
    k.holder.userData.ang = ang;
    // yOff está en unidades del holder: se multiplica por su escala actual. El bebé se apoya sobre las ramitas.
    k.holder.position.y = (k.yOff || 0) * k.holder.scale.y + y * (k.escala || 1) * 2 + 0.07;
    // Pop al nacer
    if (k.popT != null) { k.popT += dt; const x = Math.min(1, k.popT / 0.7); const el = 1 - Math.pow(2, -10 * x) * Math.cos(x * 10.5); k.popS = 0.25 + 0.75 * el; if (x >= 1) { k.popT = null; k.popS = null; } }
    void s;
  }

  // ---------- Eclosión (línea de tiempo) ----------
  const hatch = { on: false, t: 0, speed: 1, fase: '', capId: null, skip: false };
  function iniciarEclosion() {
    const c = st.vista && st.capsulas[st.vista];
    if (!c || c.estado !== 'lista' || hatch.on || !scene3d.capsule) return false;
    hatch.on = true; hatch.t = 0; hatch.capId = st.vista; hatch.speed = REDUCED ? 2.2 : 1; hatch.fase = 'abrir'; hatch.done = {};
    root.querySelector('.cr-hatch').hidden = true; root.querySelector('.cr-skip').hidden = false;
    // la cría se prepara oculta (el modelo tarda en cargar la primera vez)
    ponerCria(hatch.capId, 'bebe', false).then(k => { if (k) { k.holder.visible = false; } });
    return true;
  }
  function saltarEclosion() { if (hatch.on) hatch.t = Math.max(hatch.t, 9.3); }
  const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function pasoEclosion(dt) {
    const cap = scene3d.capsule, egg = scene3d.egg; if (!cap || !egg) return;
    hatch.t += dt * hatch.speed; const T = hatch.t, once = k => (hatch.done[k] ? false : (hatch.done[k] = true));
    const wp = egg.getWorldPosition(new THREE.Vector3());
    const E = egg.userData, U1 = E.bottom.material.userData.u, U2 = E.top.material.userData.u;
    // A · la cápsula se abre como una flor (fantasía) y deja ver el huevo blanco (real)
    const shake = T < 0.6 ? Math.sin(T * 40) * 0.06 * (1 - T / 0.6) : 0; cap.rotation.z = shake;
    const o = Math.max(0, Math.min(1, (T - 0.5) / 1.0)), oe = easeOutBack(o) * 1.75;
    for (const p of cap.userData.petals) p.quaternion.setFromAxisAngle(p.userData.axis, -oe);
    if (T > 0.55) egg.visible = true;
    if (T > 0.8 && once('chispas')) { scene3d.fx.burst(wp.clone().add(new THREE.Vector3(0, 0.1, 0)), 40, ['#ffe08a', '#ffffff', '#ffb3c7'], 1.2, 2); aviso(t({ es: '¡Mira! Adentro hay un huevo blanco, como los de las cotorras de verdad.', en: 'Look! Inside there is a white egg, like real parrot eggs.' }), 4200); }
    if (T > 1.6) { cap.position.y -= dt * hatch.speed * 0.05; cap.scale.setScalar(Math.max(0.001, 1 - (T - 1.6) * 0.8)); }
    // B · el huevo se mueve
    let wob = 0, hop = 0;
    if (T > 1.6 && T < 7.4) { const a = Math.min(1, (T - 1.6) / 1.8); wob = Math.sin(T * 13) * 0.18 * a; hop = Math.max(0, Math.sin(T * 6.5)) * 0.03 * a; }
    // C · grietas (tres golpecitos)
    for (const [k, at] of [['g1', 3.4], ['g2', 4.0], ['g3', 4.6]]) if (T > at && once(k)) { scene3d.fx.burst(wp.clone().add(new THREE.Vector3(0, 0.05, 0.12)), 8, '#fffaf0', 0.6, 1.2); if (G.audio && G.audio.play) try { G.audio.play('tick'); } catch (e) { /* */ } }
    const crack = T < 3.4 ? 0 : T < 5 ? (T - 3.4) / 1.6 : 1;
    U1.uCrack.value = U2.uCrack.value = crack;
    U1.uGlow.value = U2.uGlow.value = T > 6.8 ? Math.min(1, (T - 6.8) / 0.6) : crack * 0.25;
    // D · patitas y paseo
    const lg = Math.max(0, Math.min(1, (T - 5.0) / 0.4)), legUp = T < 7.3 ? lg : Math.max(0, 1 - (T - 7.3) / 0.2);
    let walkX = 0, walkZ = 0, side = 0;
    if (T > 5.4 && T < 7.2) { const w = (T - 5.4) * 3.2; walkX = Math.sin(w * 0.5) * 0.09; walkZ = Math.cos(w * 0.5) * 0.05 - 0.05; side = Math.sin(w * 2.0); wob = side * 0.12; }
    E.legs.children.forEach((L, i) => { L.scale.setScalar(Math.max(0.001, legUp)); L.rotation.x = (i ? 1 : -1) * side * 0.5; });
    egg.position.set(walkX, EGG_H + 0.06 + legUp * 0.09 + hop, walkZ);
    egg.rotation.z = wob;
    // E · ¡hatch!: la tapa sale volando y aparece el pichón
    if (T > 7.6) {
      if (once('pop')) {
        scene3d.fx.burst(wp.clone().add(new THREE.Vector3(0, 0.12, 0)), 60, ['#ffe08a', '#ffffff', '#9fe3a0', '#ffb347'], 1.8, 2.2);
        const k = scene3d.chick; if (k) { k.holder.visible = true; k.popT = 0; k.popS = 0.25; postura('aleteando', 2); }
        banner(u('nacio'), t(huevoDef(hatch.capId).nombre));
      }
      const x = Math.min(1, (T - 7.6) / 1.4);
      E.top.position.set(Math.sin(x * 2.4) * 0.25, 0.25 * Math.sin(x * Math.PI) + x * 0.15, 0.05);
      E.top.rotation.z = -x * 3.6;
      E.bottom.scale.setScalar(Math.max(0.001, 1 - Math.max(0, T - 8.4) * 1.2));
      E.top.scale.setScalar(Math.max(0.001, 1 - Math.max(0, T - 8.8) * 2));
    }
    if (T > 9.4) terminarEclosion();
  }
  let chispaSonada = false;
  function terminarEclosion() {
    if (!hatch.on) return;
    hatch.on = false;
    if (G.audio && G.audio.play) try { G.audio.play('eclosion_huevo'); } catch (e) { /* sin audio */ }
    const c = st.capsulas[hatch.capId];
    if (c && c.estado === 'lista') c.estado = 'nacida';
    st.vistos['nacio:' + hatch.capId] = 1; st.compa = hatch.capId; guardar(); avisarCompanero();
    if (root) root.querySelector('.cr-skip').hidden = true;
    const k = scene3d.chick;
    if (scene3d.capsule) { scene3d.nestRoot.remove(scene3d.capsule); scene3d.capsule = null; }
    if (scene3d.egg) { scene3d.nestRoot.remove(scene3d.egg); scene3d.egg = null; }
    if (scene3d.flag) { /* la bandera se queda junto al nido */ }
    if (k) { k.holder.visible = true; k.popT = null; k.popS = null; fijarEtapa(etapaDe(c), false); postura('jugando', 2.4); }
    pintar();
    // Cómic (src/game/comic.js): viñeta de la eclosión con la foto de esta escena. Nunca en las pruebas.
    if (!silencio && !G.quiet) G.emit('criadero', 'eclosion', { id: hatch.capId, imagen: fotoEscena() });
  }
  // Foto de la escena 3D del criadero para el cómic (480×360, recorte centrado); null si no se puede
  function fotoEscena() {
    try {
      if (!scene3d.renderer || !scene3d.scene || !scene3d.camera) return null;
      scene3d.renderer.render(scene3d.scene, scene3d.camera);
      const src = scene3d.renderer.domElement, sw = src.width, sh = src.height;
      if (!sw || !sh) return null;
      const c = document.createElement('canvas'); c.width = 480; c.height = 360;
      let cw = sw, ch = sw * 0.75; if (ch > sh) { ch = sh; cw = sh / 0.75; }
      c.getContext('2d').drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, 480, 360);
      return c.toDataURL('image/jpeg', 0.78);
    } catch (e) { return null; }
  }
  function crecer(etapa) {
    const k = scene3d.chick; if (!k || hatch.on) { construirNido(); return; }
    fijarEtapa(etapa, true);
    const wp = k.holder.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
    scene3d.fx.burst(wp, 50, ['#ffd27a', '#ffffff', '#7fd38f'], 1.4, 2);
    banner(u('crecio'), t(etapaDef(etapa).nombre) + ' · ' + t(etapaDef(etapa).real));
    pintar();
  }

  // ---------- Toques y cámara ----------
  const ray = new THREE.Raycaster();
  function tocar(e) {
    const k = scene3d.chick; if (!k || hatch.on) return;
    const r = canvas.getBoundingClientRect(), p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, scene3d.camera);
    const hit = ray.intersectObject(k.holder, true);
    if (hit.length) {
      postura(k.etapa === 'adulto' ? 'aleteando' : 'saltando', 2.2); scene3d.fx.burst(hit[0].point, 10, ['#ffffff', '#ffd27a'], 0.8, 1.5);
      G.emit('criadero', 'brinco', { id: k.capId, foto: () => fotoEscena() }); // cómic: viñeta del brinco (src/game/momentos.js)
    }
  }
  function resize() {
    if (!scene3d.renderer || !canvas) return;
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    scene3d.renderer.setSize(w, h, false); scene3d.camera.aspect = w / h; scene3d.camera.updateProjectionMatrix();
  }
  function camara(dt) {
    const k = scene3d.chick, cam = scene3d.camera, narrow = cam.aspect < 0.9;
    let ty = 0.85, dist = 3.5;
    if (k && !hatch.on) { const hgt = 1.25 * (k.escala || 1); ty = 0.7 + hgt * 0.5; dist = 2.2 + hgt * 1.55; if (scene3d.pose === 'volando') { ty += 0.6; dist += 1.2; } }
    else if (hatch.on) { ty = 0.95; dist = 2.6; }
    if (narrow) dist *= 1.45;
    const want = new THREE.Vector3(Math.sin(scene3d.t * 0.12) * 0.25, ty + 0.62, dist);
    const look = cam.userData.look || (cam.userData.look = new THREE.Vector3(0, ty, 0));
    const lookWant = new THREE.Vector3(0, ty - (narrow ? 0.12 : 0), 0);
    // Al abrir, la cámara se coloca de golpe (sin entrar volando desde el centro del nido)
    const k2 = scene3d.camSnap ? 1 : Math.min(1, dt * 2.2); scene3d.camSnap = false;
    cam.position.lerp(want, k2); look.lerp(lookWant, k2);
    cam.lookAt(look);
  }
  function frame() {
    scene3d.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, scene3d.clock.getDelta());
    paso(dt);
    scene3d.renderer.render(scene3d.scene, scene3d.camera);
  }
  function paso(dt) {
    scene3d.t += dt;
    if (scene3d.leafMat) scene3d.leafMat.userData.time.value = scene3d.t;
    const cap = scene3d.capsule;
    if (cap) {
      cap.userData.pm.userData.u.uTime.value = scene3d.t;
      if (!hatch.on) { cap.rotation.y += dt * 0.25; if (cap.userData.ready) cap.rotation.z = Math.sin(scene3d.t * 9) * 0.04 * (Math.sin(scene3d.t * 0.9) > 0.3 ? 1 : 0); }
    }
    if (scene3d.flag) { const p = scene3d.flag.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 30 - scene3d.t * 4) * 0.008 * (x / 0.18)); } p.needsUpdate = true; }
    if (hatch.on) pasoEclosion(dt);
    animarCria(dt);
    scene3d.fx.step(dt);
    const pol = scene3d.scene.getObjectByName('polen'); if (pol) pol.rotation.y += dt * 0.02;
    camara(dt);
    colocarGlobo();
  }


  // =====================================================================================================================
  // Compañero en el mundo: actores.js (Movimiento) lo sigue y anima; aquí solo el estado y el aspecto.
  //   companero() → null | { id, etapa, nivel, nombre, look, escala }   (escala relativa a la adulta)
  //   vestir(ch, info) → { antes(), despues(), quitar(), pies() }     (antes/después de ch.update(dt), como rot())
  //   G.emit('companero', info | null) al nacer, crecer, liberar, borrar o cambiar la cría elegida.
  // =====================================================================================================================
  function companeroId() {
    const nac = id => { const c = id && st.capsulas[id]; return c && c.estado === 'nacida' ? id : null; };
    if (nac(st.compa)) return st.compa;
    let best = null;
    for (const [id, c] of Object.entries(st.capsulas)) if (c.estado === 'nacida' && (!best || c.xp > st.capsulas[best].xp)) best = id;
    return best;
  }
  function companero() {
    if (!D()) return null;
    const id = companeroId(); if (!id) return null;
    const c = st.capsulas[id], etapa = etapaDe(c), E = etapaDef(etapa), h = huevoDef(id);
    return { id, etapa, nivel: nivelDe(c.xp), nombre: t(h.cria), look: lookDe(id, etapa), escala: (E.proporciones && E.proporciones.escala) || 1 };
  }
  function etiqueta(info) {
    info = info === undefined ? companero() : info;
    return info ? `${info.nombre} · ${t(etapaDef(info.etapa).nombre)} · ${u('nivel').toLowerCase()} ${info.nivel}` : '';
  }
  let ultimoCompa = null, silencio = false;
  function avisarCompanero() {
    if (silencio) return;
    const info = companero(), key = info ? info.id + ':' + info.etapa : '';
    if (ultimoCompa === null) { ultimoCompa = key; return; }   // primera lectura: actores lo lee al iniciar
    if (key === ultimoCompa) return;
    const antes = ultimoCompa; ultimoCompa = key;
    // Fuera del criadero, un aviso amable cuando la cotorrita crece mientras el niño aprende en el mundo
    if (info && !open && antes.split(':')[0] === info.id && G.ui && (G.ui.toastHTML || G.ui.toast)) { try { const msg = `<b>¡${esc(info.nombre)} creció!</b> Ahora es ${esc(t(etapaDef(info.etapa).nombre).toLowerCase())}.`; if (G.ui.toastHTML) G.ui.toastHTML(msg, 3200); else G.ui.toast(msg.replace(/<[^>]+>/g, ''), 3200); } catch (e) { /* sin HUD */ } }
    G.emit('companero', info);
  }
  function vestir(ch, info) {
    info = info || companero(); if (!info || !ch || !ch.bones) return null;
    const P = (etapaDef(info.etapa) || {}).proporciones || {};
    const k = { ch, holder: ch.root, base: 1, capId: info.id, f: {}, fNow: {}, fluff: crearPlumon(ch), extras: {}, etapa: info.etapa, yOff: 0 };
    for (const [b, v] of Object.entries(P.huesos || {})) if (ch.bones[b]) k.f[b] = v;
    aplicarPlumon(k, P.plumon || { capas: 0, largo: 0 }, P.plumon);
    ch.applyLook(info.look); pielCria(ch, info.id);
    k.yOff = medirPies(k);              // deja las escalas puestas (fNow)
    ch.root.updateMatrixWorld(true);
    extras(k, info.etapa);
    let vivo = true;
    return {
      etapa: info.etapa,
      antes() { if (vivo) deshacer(k); },
      despues() { if (vivo) reaplicar(k); },
      pies() { return vivo ? k.yOff * (ch.root.scale.y || 1) : 0; },
      quitar() {
        if (!vivo) return; vivo = false;
        deshacer(k);
        for (const s of k.fluff.shells) { s.mesh.parent && s.mesh.parent.remove(s.mesh); s.mesh.material.dispose(); }
        for (const o of Object.values(k.extras)) o.parent && o.parent.remove(o);
      },
    };
  }
  // =====================================================================================================================
  // Abrir / cerrar
  // =====================================================================================================================
  function abierto() { return open; }
  async function abrir() {
    if (open) return true;
    await datos();
    if (!D()) { console.error('criadero: faltan los datos ' + DATA_SRC); return false; }
    await css();
    if (!root) montar();
    focoPrevio = document.activeElement;
    root.hidden = false; open = true;
    G.pausa && G.pausa.set('criadero', true);
    try {
      st.vistos.abierto = 1; revisarCapsulas(); guardar();
      if (!st.vista) st.vista = st.activa;
      initScene(); resize();
      construirNido(); pintar();
    } catch (e) {
      // Un fallo de la escena no deja el overlay trabado: se informa y se cierra
      console.error('criadero: no se pudo abrir', e); (window.__aveErrores || []).push('criadero: ' + (e && e.message));
      cerrar(); return false;
    }
    scene3d.clock.getDelta(); scene3d.camSnap = true;
    if (!scene3d.raf) frame();
    setTimeout(() => { const l = root.querySelector('.cr-loading'); if (l) l.hidden = true; }, 400);
    procesarAvisos();
    const b = root.querySelector('[data-cr="cerrar"]'); if (b) b.focus();
    return true;
  }
  function cerrar() {
    if (!open) return;
    open = false; root.hidden = true;
    cancelAnimationFrame(scene3d.raf); scene3d.raf = 0;
    if (hatch.on) { hatch.t = 99; pasoEclosion(0); terminarEclosion(); }
    G.pausa && G.pausa.set('criadero', false);
    guardar();
    if (focoPrevio && document.contains(focoPrevio) && focoPrevio.focus) focoPrevio.focus();
  }

  // ---------- Lección de la liberación (modal, sin puntaje; pista al fallar) ----------
  function cerrarModal() { root.querySelector('.cr-modal').hidden = true; }
  function abrirLiberacion() {
    const c = st.vista && st.capsulas[st.vista]; if (!c || etapaDe(c) !== 'adulto' || c.estado === 'liberada') return;
    const Q = D().liberacion.preguntas; let i = 0;
    const box = root.querySelector('.cr-modal-box'), modal = root.querySelector('.cr-modal');
    const pintarQ = (fb) => {
      const q = Q[i];
      box.innerHTML = `<p class="cr-eyebrow ink">${esc(u('liberar'))} · ${i + 1}/${Q.length}</p><h2 id="cr-modal-t">${esc(t(q.texto))}</h2>
        <div class="cr-opts">${q.opciones.map((o, j) => j).map((_, k, a) => a[(k + i + 1) % a.length]).map(j => `<button class="btn secondary" type="button" data-op="${j}">${esc(t(q.opciones[j]))}</button>`).join('')}</div>
        <p class="cr-fb" role="status">${fb ? esc(fb) : ''}</p>`;
      for (const b of box.querySelectorAll('[data-op]')) b.onclick = () => {
        if (+b.dataset.op === q.correcta) { i++; if (i >= Q.length) confirmar(); else pintarQ(); }
        else pintarQ(t({ es: 'Casi. Piensa en lo que hacen los aviarios del programa.', en: 'Almost. Think about what the program\'s aviaries do.' }));
      };
      const f = box.querySelector('[data-op]'); if (f) f.focus();
    };
    // Confirmación final: liberar es para siempre en el criadero, pero la cotorra sigue en el álbum de cápsulas
    const confirmar = () => {
      const nom = t(huevoDef(st.vista).cria);
      box.innerHTML = `<p class="cr-eyebrow ink">${esc(u('liberar'))}</p><h2 id="cr-modal-t">${esc(t({ es: '¿Lista para volar libre, ' + nom + '?', en: 'Ready to fly free, ' + nom + '?' }))}</h2>
        <p>${esc(t({ es: 'Volará al bosque como las cotorras de los aviarios. Seguirá en tu álbum y tu próxima cápsula la puedes incubar.', en: 'It will fly to the forest like the aviary parrots. It stays in your album and you can incubate your next capsule.' }))}</p>
        <div class="cr-opts"><button class="btn magic" type="button" data-fin="si" data-icon="feather">${esc(t({ es: 'Sí, ¡a volar!', en: 'Yes, fly!' }))}</button>
        <button class="btn secondary" type="button" data-fin="no">${esc(t({ es: 'Todavía no', en: 'Not yet' }))}</button></div>`;
      box.querySelector('[data-fin="si"]').onclick = () => { modal.hidden = true; liberar(); };
      box.querySelector('[data-fin="no"]').onclick = () => { modal.hidden = true; };
      box.querySelector('[data-fin="si"]').focus();
    };
    modal.hidden = false; pintarQ();
  }
  function liberar() {
    const c = st.capsulas[st.vista]; if (!c) return;
    c.estado = 'liberada'; st.liberadas++;
    dar('liberacion', st.vista, 1);
    postura('volando', 6);
    banner(t({ es: '¡Volando libre!', en: 'Flying free!' }), t(huevoDef(st.vista).nombre));
    // Tras el vuelo, el nido queda vacío: la cotorra vive libre en el bosque (sigue en el álbum de cápsulas)
    const id = st.vista;
    setTimeout(() => { if (open && st.vista === id && scene3d.chick) { scene3d.fx.burst(scene3d.chick.holder.getWorldPosition(new THREE.Vector3()), 40, ['#ffffff', '#7fd38f', '#ffd27a'], 1.2, 2); quitarCria(); construirNido(); pintar(); } }, 5500);
    revisarCapsulas(); guardar(); pintar(); procesarAvisos(); avisarCompanero();
  }


  // =====================================================================================================================
  // El nido en el mundo y el botón «Nido» del HUD. Se activan al terminar la primera misión o, antes, cuando se cumple
  // pack.criadero.desde (cap1: el evento LumaHelped de la charla con Iguaca, minuto 2; DIVERSION_CAP1 mejora 2);
  // Iguaca lo presenta una vez. Sitio: pack.criadero.nido (id de POI) o junto a la Estación de Conservación ('estacion'),
  // la plaza o el inicio.
  // =====================================================================================================================
  function desdeCumplido() {
    const d = (G.pack.criadero || {}).desde;
    if (!d) return false;
    if (typeof d === 'function') { try { return !!d(G); } catch (e) { return false; } }
    return !!(G.eventos && G.eventos.had && G.eventos.had(d));
  }
  const nidoActivo = () => !!D() && (misionesHechas().size > 0 || desdeCumplido());
  let nidoMundo = null, nidoIt = null, nidoBtnHidden = null, presentarT = 0, revisarT = 0;
  // ---------- «+XP al nido» y el huevo en el HUD (mejora 2: la XP ya no sube en silencio) ----------
  // Dentro del botón «Nido»: un huevo que se va llenando con los días de incubación (o la cría cuando ya nació) y, con cada
  // XP que llega, un «+25 XP al nido» que sube y se desvanece. Estilo inyectado aquí (ui.css es de otro carril).
  const ESTILO_HUD = '#b-nido{position:relative;overflow:visible}' +
    '#b-nido .nido-huevo{display:inline-block;width:14px;height:18px;margin-left:6px;vertical-align:-3px;flex:none}' +
    '#b-nido .nido-huevo svg{display:block;width:100%;height:100%;overflow:visible}' +
    '#b-nido .nido-mas{position:absolute;left:50%;top:-6px;transform:translate(-50%,0);white-space:nowrap;pointer-events:none;' +
    'font:700 13px/1.2 var(--font-display,sans-serif);color:#fff;background:var(--c-primary,#f2a03d);border-radius:999px;padding:3px 10px;' +
    'box-shadow:0 2px 0 var(--c-primary-lip,#b86f1a);opacity:0;animation:nido-mas 1.7s ease-out forwards}' +
    '@keyframes nido-mas{0%{opacity:0;transform:translate(-50%,6px)}15%{opacity:1;transform:translate(-50%,-14px)}75%{opacity:1;transform:translate(-50%,-30px)}100%{opacity:0;transform:translate(-50%,-40px)}}' +
    '#b-nido .nido-huevo.late svg{animation:nido-late .6s ease-out}@keyframes nido-late{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}' +
    '@media (prefers-reduced-motion:reduce){#b-nido .nido-mas{animation:nido-mas-quieto 1.7s linear forwards;transform:translate(-50%,-24px)}@keyframes nido-mas-quieto{0%,70%{opacity:1}100%{opacity:0}}#b-nido .nido-huevo.late svg{animation:none}}';
  let hudHuevo = null, hudHuevoClave = '';
  // El <style> va dentro de #sys (junto al botón) para que la maqueta móvil de accesibilidad.js, que copia #sys, lo lleve
  function estiloHUD() {
    if (document.getElementById('estilo-nido-hud')) return;
    const s = document.createElement('style'); s.id = 'estilo-nido-hud'; s.textContent = ESTILO_HUD;
    const b = document.getElementById('b-nido'), padre = b && b.parentNode;
    if (padre) padre.insertBefore(s, b); else document.head.appendChild(s);
  }
  // Huevo (ruta cerrada) con relleno desde abajo según los días; nacida: la cría (círculo) en vez del huevo
  function pintarHuevoHUD(b) {
    if (!b) return;
    const c = activa(), huevo = !!c && etapaDe(c) === 'huevo', dias = c ? diasDe(c) : 0, tot = D() ? D().incubacion.dias : 26;
    const clave = c ? `${huevo ? 'h' : 'c'}:${dias}/${tot}` : '';
    if (clave === hudHuevoClave && hudHuevo) return;
    hudHuevoClave = clave;
    if (!hudHuevo) { estiloHUD(); hudHuevo = document.createElement('span'); hudHuevo.className = 'nido-huevo'; hudHuevo.setAttribute('aria-hidden', 'true'); b.appendChild(hudHuevo); }
    if (!c) { hudHuevo.innerHTML = ''; b.setAttribute('aria-label', 'Nido: mi cotorrita'); return; }
    const f = huevo ? Math.max(0, Math.min(1, dias / tot)) : 1, h = 18 * f;
    hudHuevo.innerHTML = huevo
      ? `<svg viewBox="0 0 14 18"><defs><clipPath id="nido-huevo-clip"><rect x="0" y="${(18 - h).toFixed(2)}" width="14" height="${h.toFixed(2)}"/></clipPath></defs>` +
        `<path d="M7 1C3.4 1 1 6.2 1 10.4 1 14.6 3.6 17 7 17s6-2.4 6-6.6C13 6.2 10.6 1 7 1Z" fill="rgba(255,255,255,.22)" stroke="currentColor" stroke-width="1.4"/>` +
        `<path d="M7 1C3.4 1 1 6.2 1 10.4 1 14.6 3.6 17 7 17s6-2.4 6-6.6C13 6.2 10.6 1 7 1Z" fill="var(--c-primary,#f2a03d)" clip-path="url(#nido-huevo-clip)"/></svg>`
      : `<svg viewBox="0 0 14 18"><circle cx="7" cy="9" r="6" fill="var(--c-primary,#f2a03d)" stroke="currentColor" stroke-width="1.2"/><circle cx="5" cy="8" r="1" fill="#10241c"/><path d="M9 9.5l3 .8-3 .8z" fill="#10241c"/></svg>`;
    b.setAttribute('aria-label', huevo ? `Nido: mi cotorrita · huevo, ${dias} de ${tot} días` : 'Nido: mi cotorrita');
  }
  // «+N XP al nido» sobre el botón; sin botón visible (nido aún no activo) no se muestra
  function avisarXP(xp) {
    const b = botonNido();
    if (!b || b.hidden || !xp) return false;
    estiloHUD();
    const m = document.createElement('span'); m.className = 'nido-mas'; m.setAttribute('aria-hidden', 'true');
    m.textContent = `+${xp} XP ${t({ es: 'al nido', en: 'to the nest' })}`;
    for (const viejo of b.querySelectorAll('.nido-mas')) viejo.remove();
    b.appendChild(m);
    setTimeout(() => { if (m.parentNode) m.remove(); }, 1800);
    if (hudHuevo) { hudHuevo.classList.remove('late'); void hudHuevo.offsetWidth; hudHuevo.classList.add('late'); }
    let vivo = document.getElementById('nido-xp-vivo');
    if (!vivo) { vivo = document.createElement('div'); vivo.id = 'nido-xp-vivo'; vivo.setAttribute('aria-live', 'polite'); vivo.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'; document.body.appendChild(vivo); }
    vivo.textContent = m.textContent;
    return true;
  }
  function sitioNido() {
    const T = G.terreno, cfg = G.pack.criadero || {};
    if (cfg.nido && T.poi) { const p = T.poi(cfg.nido); if (p) return { x: p.x, z: p.z }; }
    for (const id of ['nido_criadero', 'estacion', 'plaza']) { const p = T.poi && T.poi(id); if (p) return { x: p.x + 2.8, z: p.z + 1.4, donde: id }; }
    const sp = (G.pack.jugador && G.pack.jugador.aparicion) || { x: 0, z: 0 };
    return { x: sp.x + 3, z: sp.z + 2 };
  }
  // Sitio libre: a 5 m o más de cualquier otro interactuable (si no, nearest() podría quedarse con Iguaca o el flamboyán),
  // fuera de los colliders fijos (edificios, NPC, objetos; los árboles de vegetacion.js se recrean y no cuentan) y en tierra firme.
  // El mundo carga sus edificios después: pasoMundo vuelve a comprobarlo cada 2 s y lo mueve si quedó dentro de algo.
  function libreNido(q) {
    const otros = (G.interaccion.list || []).filter(it => it.id !== 'nido_criadero' && typeof it.x === 'number');
    const cols = ((G.fisica && G.fisica.colliders) || []).filter(c => c.id !== 'nido_criadero' && typeof c.x === 'number' && c.r > 0 && !/^(arbol|tree)$/.test(c.kind || ''));
    const seco = !(G.agua && G.agua.levelAt && G.terreno.height) || G.agua.levelAt(q.x, q.z) < G.terreno.height(q.x, q.z) - 0.05;
    return seco && otros.every(it => Math.hypot(it.x - q.x, it.z - q.z) >= 5) && cols.every(c => Math.hypot(c.x - q.x, c.z - q.z) >= c.r + 1.4) && sinCopa(q);
  }
  // Lejos de las copas de los árboles (posiciones fijas de G.vegetacion): que la cámara no quede dentro de las hojas
  const ARBOLES = ['palma_sierra', 'yagrumo', 'tabonuco', 'helecho_arboreo', 'ceiba', 'flamboyan', 'bambu'];
  function sinCopa(q) {
    const V = G.vegetacion, inst = V && V.instancias, info = V && V.info;
    if (!inst || !info) return true;
    for (const m of ARBOLES) {
      const P = inst[m], I = info[m]; if (!P || !I) continue;
      const base = Math.min(7, (I.ancho || 4) * 0.42);
      for (let i = 0; i < P.n; i++) {
        const dx = P.pos[i * 4] - q.x, dz = P.pos[i * 4 + 2] - q.z, r = base * P.pos[i * 4 + 3] + 1.5;
        if (dx * dx + dz * dz < r * r) return false;
      }
    }
    return true;
  }
  function separarNido(p) {
    if (libreNido(p)) return p;
    for (let r = 2; r <= 24; r += 1.5) for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6, q = { x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r, donde: p.donde };
      if (libreNido(q)) return q;
    }
    return p;
  }
  function moverNido(p) {
    if (!nidoMundo) return;
    nidoMundo.position.set(p.x, G.terreno.height ? G.terreno.height(p.x, p.z) : 0, p.z);
    if (nidoIt) { nidoIt.x = p.x; nidoIt.z = p.z; }
    const c = nidoMundo.userData.collider; if (c) { c.x = p.x; c.z = p.z; }
  }
  function construirNidoMundo() {
    if (nidoMundo || !G.renderer || !G.renderer.scene || !window.AVColor) return;
    const p = separarNido(sitioNido()), y = G.terreno.height ? G.terreno.height(p.x, p.z) : 0;
    const g = new THREE.Group(); g.name = 'nido_criadero'; g.position.set(p.x, y, p.z);
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.85, 18), MS({ color: '#6b4a2e', roughness: 0.95 }));
    tronco.position.y = 0.42; tronco.castShadow = tronco.receiveShadow = true; g.add(tronco);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.02, 18), MS({ color: '#c99a62', roughness: 0.85 })); tapa.position.y = 0.85; g.add(tapa);
    const n = nido(); n.position.y = 0.85; n.scale.setScalar(0.95); g.add(n);
    // Huevo blanco en el nido mientras la cría activa es un huevo (pista: allí está tu cápsula)
    const huevo = new THREE.Mesh(new THREE.LatheGeometry(eggProfile(0.1, 0.14, 20), 20), MS({ color: '#f7f3e8', roughness: 0.5 }));
    huevo.position.y = 1.02; huevo.castShadow = true; huevo.name = 'huevo'; g.add(huevo);
    // Letrero de madera "Criadero"
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const x = cv.getContext('2d');
    x.fillStyle = '#8a5a2b'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#5a3818'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 88);
    x.fillStyle = '#fbf1dc'; x.font = 'bold 44px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Criadero', 128, 52);
    const signM = MS({ map: C().tex(new THREE.CanvasTexture(cv)), roughness: 0.9 });
    for (const sd of [1, -1]) { const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.24), signM); sign.position.set(0, 0.5, sd * 0.575); if (sd < 0) sign.rotation.y = Math.PI; g.add(sign); }
    // Chispa dorada (como los hallazgos del Diario) cuando hay algo nuevo: cápsula lista, cápsula ganada o primera visita
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: C().lin('#ffd84a') }));
    spark.position.y = 1.65; spark.name = 'chispa'; g.add(spark);
    g.scale.setScalar(1.3); // que se vea desde el sendero (Vittata mide 1,75 m)
    g.visible = false; g.userData.donde = p.donde || ''; G.renderer.scene.add(g); nidoMundo = g;
    // Collider del tronco (como los NPC de actores.js: r = 0 mientras el nido no está activo)
    g.userData.collider = { x: p.x, z: p.z, r: 0, kind: 'objeto', id: 'nido_criadero' };
    if (G.fisica && G.fisica.colliders) G.fisica.colliders.push(g.userData.collider);
    nidoIt = G.interaccion.add({ id: 'nido_criadero', x: p.x, z: p.z, r: 2.6, visible: () => nidoActivo() && !open,
      label: () => (novedad() ? 'Visitar el nido: ¡hay algo nuevo!' : 'Visitar el nido de mi cotorrita'), use: () => abrir() });
  }
  // ¿Hay algo que mirar en el nido? (cápsula lista para nacer, cápsula ganada sin ver o el nido sin abrir nunca)
  function novedad() {
    if (!st.vistos.abierto) return true;
    return Object.values(st.capsulas).some(c => c.estado === 'lista') || st.avisos.some(a => a.tipo === 'capsula');
  }
  function botonNido() {
    const b = document.getElementById('b-nido'); if (!b) return null;
    if (!b.dataset.cr) { b.dataset.cr = '1'; b.addEventListener('click', () => abrir()); }
    return b;
  }
  function puedePresentar() {
    const S = G.S || {}, leccion = (G.aula && G.aula.enCurso && G.aula.enCurso()) || (S.step === 3 && S.missions && !S.missions.educativa);
    // Ni durante un evento (la crecida se juega) ni con un bocadillo libre en pantalla: el nido espera a que haya calma
    const calma = !S.event && !(G.dialogo && G.dialogo.libre && G.dialogo.libre());
    return !G.quiet && !open && !leccion && calma && !!G.ui && !G.ui.busy() && !!G.dialogo && !G.dialogo.open();
  }
  function pasoMundo(dt) {
    const on = nidoActivo();
    if (on && !nidoMundo) construirNidoMundo();
    if (nidoMundo && on && nidoIt && (revisarT += dt) > 2) {
      revisarT = 0;
      if (!libreNido({ x: nidoIt.x, z: nidoIt.z })) moverNido(separarNido(sitioNido()));
    }
    if (nidoMundo) {
      nidoMundo.visible = on;
      if (nidoMundo.userData.collider) nidoMundo.userData.collider.r = on ? 0.8 : 0;
      const sp = nidoMundo.getObjectByName('chispa'), hv = nidoMundo.getObjectByName('huevo');
      if (sp) { sp.visible = on && novedad(); sp.rotation.y += dt * 2; sp.position.y = 1.65 + Math.sin(performance.now() / 600) * 0.06; }
      // Sonido de la chispa: una vez cada vez que aparece algo nuevo, cuando Vittata está a 30 m o menos del nido
      if (!sp || !sp.visible) chispaSonada = false;
      else if (!chispaSonada && nidoIt && Math.hypot(G.S.pos.x - nidoIt.x, G.S.pos.z - nidoIt.z) <= 30) { chispaSonada = true; if (G.audio && G.audio.play) try { G.audio.play('nido_chispa'); } catch (e) { /* sin audio */ } }
      if (hv) { const c = activa(); hv.visible = !!c && etapaDe(c) === 'huevo'; }
    }
    const b = botonNido();
    if (b && nidoBtnHidden !== !on) { nidoBtnHidden = !on; b.hidden = !on; if (on) b.setAttribute('aria-label', 'Nido: mi cotorrita'); }
    if (b && on) pintarHuevoHUD(b);
    // Presentación (una vez): Iguaca cuenta que hay un nido. Nunca encima de otro diálogo, tarjeta u overlay, ni en pruebas.
    // Tampoco en medio de una lección (las tarjetas de la misión educativa se reabren con retraso)
    // y solo tras 1,5 s seguidos de juego libre (entre baterías automáticas G.quiet cambia muy rápido)
    presentarT = on && !st.presentado && puedePresentar() ? presentarT + dt : 0;
    if (presentarT > 1.5) {
      presentarT = 0;
      st.presentado = true; guardar();
      if (!silencio) G.emit('criadero', 'nido'); // cómic: viñeta de la aparición del nido (src/game/comic.js)
      const lang = (G.aula && G.aula.aj && G.aula.aj.idioma) || 'es';
      G.dialogo.say([
        { who: 'Iguaca', lang, text: nidoMundo && nidoMundo.userData.donde === 'estacion'
          ? t({ es: '¡Vittata, mira! En la Estación de Conservación hay un nido con una cápsula. Adentro hay un huevo blanco, como los de las cotorras de verdad.', en: 'Vittata, look! There is a nest with a capsule at the Conservation Station. Inside is a white egg, like real parrot eggs.' })
          : t({ es: '¡Vittata, mira! Aquí cerca hay un nido con una cápsula. Adentro hay un huevo blanco, como los de las cotorras de verdad.', en: 'Vittata, look! There is a nest with a capsule nearby. Inside is a white egg, like real parrot eggs.' }) },
        { who: 'Iguaca', lang, text: t({ es: 'Todo lo que aprendas y explores le dará calor. Visítalo cuando quieras, o toca «Nido».', en: 'Everything you learn and explore keeps it warm. Visit it anytime, or tap "Nest".' }) },
      ]);
    }
  }
  G.on('update', dt => pasoMundo(dt), 70);
  // =====================================================================================================================
  // Modo Maestro (pestaña en G.aula) · arranque con ?criadero=1
  // =====================================================================================================================
  function htmlMaestro() {
    if (!D()) return '<p class="note">Cargando…</p>';
    const F = st.fuentes, tot = F.aprender + F.explorar + F.cuidar || 1, pc = v => Math.round(v / tot * 100);
    const filas = D().huevos.map(h => { const c = st.capsulas[h.id]; const et = etapaDe(c);
      return `<tr><td>${esc(t(h.nombre))}</td><td>${esc(t(D().rarezas[h.rareza]))}</td><td>${c ? esc(c.estado === 'liberada' ? u('libre') : t(etapaDef(et).nombre)) : '·'}</td><td>${c && et !== 'huevo' ? nivelDe(c.xp) : c ? diasDe(c) + '/' + D().incubacion.dias + ' d' : ''}</td><td>${esc(t(h.obtener.texto))}</td></tr>`; }).join('');
    const reales = D().real.map(f => `<li><b>${esc(f.estado)}</b> · ${esc(t(f.texto))}<br><small>${esc(f.fuente)}${f.url ? ` · <code>${esc(f.url)}</code>` : ''}${f.nota ? ' · ' + esc(f.nota) : ''}</small></li>`).join('');
    return `<p class="note">${esc(t({ es: 'La cotorra crece con lo que el estudiante aprende y explora; cuidar da poco y nunca castiga. Nada baja con el tiempo y nada se compra. Solo se guarda en este dispositivo.', en: 'The parrot grows with what the student learns and explores; care gives little and never punishes. Nothing decays over time and nothing is bought. Stored on this device only.' }))}</p>
      <h3>${esc(t({ es: 'De dónde sale la XP', en: 'Where XP comes from' }))}</h3>
      <ul><li>${esc(u('aprender'))}: ${F.aprender} XP (${pc(F.aprender)} %)</li><li>${esc(u('explorar'))}: ${F.explorar} XP (${pc(F.explorar)} %)</li><li>${esc(u('cuidar'))}: ${F.cuidar} XP (${pc(F.cuidar)} %)</li></ul>
      <h3>${esc(u('capsulas'))}</h3><div class="maestro-scroll"><table class="maestro-tabla"><thead><tr><th>${esc(u('capsulas'))}</th><th>Reto</th><th>Etapa</th><th>Nivel / días</th><th>Cómo se gana</th></tr></thead><tbody>${filas}</tbody></table></div>
      <h3>${esc(t({ es: 'Capa real y fuentes', en: 'Real-world layer and sources' }))}</h3><ul class="maestro-fuentes">${reales}</ul>
      <h3>${esc(t({ es: 'Para la clase', en: 'For class' }))}</h3>
      <div class="row maestro-acciones"><button class="btn ghost sm" type="button" data-crm="abrir">${esc(t({ es: 'Abrir el criadero', en: 'Open the hatchery' }))}</button>
        <button class="btn ghost sm" type="button" data-crm="demo">${esc(t({ es: 'Demostración: siguiente etapa', en: 'Demo: next stage' }))}</button>
        <button class="btn ghost sm" type="button" data-crm="borrar" data-icon="reset">${esc(t({ es: 'Borrar el criadero de este dispositivo', en: 'Erase this device\'s hatchery' }))}</button>
        <button class="btn danger sm" type="button" data-crm="borrar-si" hidden>${esc(t({ es: 'Sí, borrar', en: 'Yes, erase' }))}</button></div>`;
  }
  function enlazarMaestro(panel) {
    const q = s => panel.querySelector(s);
    const a = q('[data-crm="abrir"]'); if (a) a.onclick = () => { G.aula.cerrarMaestro && G.aula.cerrarMaestro(); abrir(); };
    const d = q('[data-crm="demo"]'); if (d) d.onclick = () => { demoEtapa(); d.textContent = '✓ ' + d.textContent.replace(/^✓ /, ''); };
    const b = q('[data-crm="borrar"]'), si = q('[data-crm="borrar-si"]');
    if (b && si) { b.onclick = () => { si.hidden = false; si.focus(); }; si.onclick = () => { borrar(); si.hidden = true; }; }
  }
  function borrar() { st = fresh(); try { localStorage.removeItem(KEY); } catch (e) { /* */ } quitarCria(); construirNido(); if (root) pintar(); avisarCompanero(); }
  // Demostración para la clase: lleva la cría vista a la siguiente etapa (o hace lista la cápsula)
  function demoEtapa() {
    if (!D()) return;
    revisarCapsulas();
    const id = st.vista || st.activa; const c = id && st.capsulas[id]; if (!c) return;
    if (c.estado === 'disponible') incubar(id, true);
    if (c.estado === 'incubando') { c.xp = Math.max(c.xp, XP_INCUBAR()); c.estado = 'lista'; }
    else if (c.estado === 'nacida') { const et = etapaDe(c); const nxt = et === 'bebe' ? 6 : et === 'juvenil' ? 16 : null; if (nxt) { c.xp = Math.max(c.xp, NIV()[nxt - 1]); st.avisos.push({ tipo: 'etapa', id, de: et, a: etapaDe(c) }); } }
    guardar(); avisarCompanero(); if (open) { construirNido(); pintar(); procesarAvisos(); }
  }
  function registrarMaestro() {
    if (G.aula && G.aula.pestana) G.aula.pestana({ id: 'criadero', titulo: { es: 'Criadero', en: 'Hatchery' }, html: htmlMaestro, enlazar: enlazarMaestro });
  }
  G.on('nuevoEstudiante', () => { if (open) cerrar(); borrar(); });
  G.on('listo', () => {
    registrarMaestro();
    if (/^(1|true|si|sí)$/i.test(new URLSearchParams(location.search).get('criadero') || '')) setTimeout(() => abrir(), 0);
  });
  if (!D()) datos().catch(() => { /* se reintenta al abrir */ });

  // =====================================================================================================================
  // Depuración (video del pitch y pruebas)
  // =====================================================================================================================
  const debug = {
    abrir, cerrar,
    // Fuerza la etapa visible de una cápsula (la gana si hace falta). etapa: 'huevo' | 'bebe' | 'juvenil' | 'adulto'
    async etapa(id, etapa) {
      await abrir(); id = id || 'clasico';
      const c = st.capsulas[id] || (st.capsulas[id] = { estado: 'disponible', xp: 0 });
      if (etapa === 'huevo') { c.estado = 'lista'; c.xp = XP_INCUBAR(); }
      else { c.estado = 'nacida'; c.xp = Math.max(XP_INCUBAR(), NIV()[(etapa === 'adulto' ? 16 : etapa === 'juvenil' ? 6 : 1) - 1]); if (etapa === 'bebe') c.xp = Math.min(c.xp, NIV()[4] - 1); if (etapa === 'juvenil') c.xp = Math.min(Math.max(c.xp, NIV()[5]), NIV()[14] - 1); }
      st.activa = st.vista = id; if (etapa !== 'huevo') st.compa = id; guardar(); avisarCompanero();
      if (hatch.on) { hatch.on = false; root.querySelector('.cr-skip').hidden = true; }
      quitarCria(); construirNido(); pintar();
      if (etapa !== 'huevo') { for (let i = 0; i < 120 && !(scene3d.chick && scene3d.chick.ch); i++) await new Promise(r => setTimeout(r, 50)); }
      return etapaDe(c);
    },
    async eclosion(id) { await debug.etapa(id || st.vista || 'clasico', 'huevo'); return iniciarEclosion(); },
    postura: (id, dur) => postura(id, dur || 8),
    volar: () => postura('volando', 30),
    estado: () => JSON.parse(JSON.stringify(st)),
    cria: () => scene3d.chick,
    hatch: () => Object.assign({}, hatch),
    paso: dt => paso(dt),
    // Un paso del nido del mundo (revisión del sitio, botón del HUD y presentación de Iguaca)
    mundo: dt => pasoMundo(dt || 0),
    // Lleva la eclosión en curso al segundo t (0–9,4) para capturas
    irA: tt => { if (hatch.on) { hatch.t = tt; pasoEclosion(0); } return hatch.on; },
  };

  // =====================================================================================================================
  // Prueba automática: AV.criaderoTest()
  // =====================================================================================================================
  async function test() {
    const checks = [], check = (name, ok, info) => { checks.push({ name, ok: !!ok, info: info == null ? '' : String(info) }); };
    const errores0 = (window.__aveErrores || []).length;
    let backup = null; try { backup = localStorage.getItem(KEY); } catch (e) { /* */ }
    const stBackup = JSON.parse(JSON.stringify(st));
    silencio = true; // la prueba no cambia el compañero del mundo
    try {
      await datos();
      const H = D();
      check('Datos: 8 cápsulas y 4 etapas', H && H.huevos.length === 8 && H.etapas.length === 4, H && H.huevos.map(h => h.id).join(','));
      check('Datos: niveles crecientes', H.xp.niveles.every((v, i, a) => i === 0 || v > a[i - 1]));
      check('Curva: bebé 1–5, juvenil 6–15, adulto 16+', etapaDeNivel(nivelDe(0)) === 'bebe' && nivelDe(274) === 5 && etapaDeNivel(nivelDe(275)) === 'juvenil' && nivelDe(1574) === 15 && etapaDeNivel(nivelDe(1575)) === 'adulto', [nivelDe(274), nivelDe(275), nivelDe(1574), nivelDe(1575)].join(','));
      const sinAzar = H.huevos.every(h => h.obtener && (h.obtener.defecto || h.obtener.cap1) && !JSON.stringify(h).match(/precio|probabilidad|azar|aleatori|random|price/i));
      check('Rareza ganada: cada cápsula tiene reto y ninguna tiene precio ni azar', sinAzar);
      check('Cada huevo tiene traits por etapa', H.huevos.every(h => ['bebe', 'juvenil', 'adulto'].every(e => (h.traits[e] || []).length)));
      // Especies (content/comun/especies.js): 34 vivas del catálogo + 2 extintas, campos obligatorios y fuentes por dato
      if (!window.AV_ESPECIES) { try { await AVE.assets.script('content/comun/especies.js'); } catch (e) { /* la comprobación falla abajo */ } }
      const ES = window.AV_ESPECIES;
      const IDS34 = ['vittata', 'diadema', 'finschi', 'imperialis', 'lilacina', 'oratrix', 'tresmariae', 'rhodocorytha', 'vinacea', 'viridigenalis', 'agilis', 'arausiaca',
        'auropalliata', 'barbadensis', 'brasiliensis', 'collaria', 'guildingii', 'pretrei', 'tucumana', 'ventralis', 'versicolor', 'dufresniana', 'farinosa', 'festiva',
        'guatemalae', 'kawalli', 'leucocephala', 'aestiva', 'albifrons', 'amazonica', 'autumnalis', 'mercenarius', 'ochrocephala', 'xantholora'];
      check('Especies: las 34 del catálogo sin repetir, más 2 extintas', !!ES && ES.especies.length === 34 && new Set(ES.especies.map(x => x.id)).size === 34 && IDS34.every(id => ES.especies.some(x => x.id === id)) && ES.extintas.length === 2, ES && ES.especies.length);
      const https = v => typeof v === 'string' && /^https:\/\//.test(v);
      const sp = ES ? ES.especies.concat(ES.extintas) : [];
      const incompletas = sp.filter(x => !(x.id && x.cientifico === 'Amazona ' + x.id && x.comun && x.comun.en && 'es' in x.comun && 'distribucion' in x && x.uicn && 'categoria' in x.uicn && Array.isArray(x.rasgos) && x.catalogo && x.catalogo.nombre && x.fuentes && https(x.fuentes.comun_en)));
      check('Especies: campos obligatorios presentes (null si no se pudo verificar)', !!ES && !incompletas.length, incompletas.map(x => x && x.id).join(','));
      const sinFuente = sp.filter(x => (x.comun.es && !https(x.fuentes.comun_es)) || (x.uicn.categoria && !(https(x.fuentes.uicn) && x.uicn.evaluacion && https(x.uicn.url) && ES.categorias[x.uicn.categoria])) || (x.distribucion && !https(x.fuentes.distribucion)) || (x.rasgos.length && !https(x.fuentes.rasgos)));
      check('Especies: cada dato verificado trae su fuente (UICN con evaluación y ficha)', !!ES && !sinFuente.length, sinFuente.map(x => x.id).join(','));
      check('Especies: textos en ES y EN; las extintas son EX', !!ES && sp.every(x => (!x.distribucion || (x.distribucion.es && x.distribucion.en)) && x.rasgos.every(r => r.es && r.en)) && ES.extintas.every(x => x.uicn.categoria === 'EX'));
      // Estado limpio para la prueba
      st = fresh(); quitarCria();
      revisarCapsulas();
      check('La cápsula de nido se gana al abrir y empieza a incubar', st.capsulas.clasico && st.capsulas.clasico.estado === 'incubando' && st.activa === 'clasico');
      const x1 = dar('ficha', 'test-a'), x2 = dar('ficha', 'test-a');
      check('XP: una ficha da 40 y no se repite', x1 === 40 && x2 === 0, x1 + '/' + x2);
      check('Pregunta: el esfuerzo siempre suma (3.er intento = 10)', dar('pregunta', 'test-q', 3) === 10);
      const cargas0 = st.cargas; st.vista = 'clasico';
      const r0 = cuidar('comida');
      check('Cuidar un huevo no gasta cargas ni castiga', !r0.ok && st.cargas === cargas0);
      for (let i = 0; i < 3; i++) dar('mision', 'test-m' + i);
      check('Incubación: 26 días (104 XP) dejan la cápsula lista', st.capsulas.clasico.estado === 'lista' && diasDe(st.capsulas.clasico) === 26, st.capsulas.clasico.xp);
      check('Cargas de cuidado se recargan aprendiendo (máx. 4)', st.cargas === H.cuidado.cargasMax, st.cargas);
      // Vista y eclosión
      await abrir();
      check('El overlay abre y pausa el mundo', open && !root.hidden && (!G.pausa || G.pausa.activa()));
      st.vista = 'clasico'; construirNido(); pintar();
      check('Huevo PR: la cápsula boricua lleva bandera en asta, no estirada', huevoDef('pr').aspecto.bandera === true && huevoDef('pr').aspecto.patron === 'estrellas');
      const okHatch = iniciarEclosion();
      for (let i = 0; i < 160 && hatch.on; i++) { paso(1 / 15); await new Promise(r => setTimeout(r, 0)); }
      for (let i = 0; i < 120 && !(scene3d.chick && scene3d.chick.ch); i++) await new Promise(r => setTimeout(r, 50));
      const k = scene3d.chick;
      check('Eclosión: corre y nace el pichón', okHatch && !hatch.on && st.capsulas.clasico.estado === 'nacida' && !!k);
      if (k) {
        paso(1 / 30);
        const head = k.ch.bones.cabeza001;
        check('Bebé = mismo modelo escalado por huesos (cabeza ×1,42)', head && Math.abs(head.scale.x / (k.fNow.cabeza001 || 1) - 1) < 0.5 && Math.abs((k.fNow.cabeza001 || 0) - 1.42) < 0.01, head && head.scale.x.toFixed(3));
        check('Bebé con plumón (cascarones visibles)', k.fluff.shells.filter(s => s.mesh.visible).length >= 3);
        check('Bebé con cascarón-gorro blanco', !!k.extras.cascaron);
        for (const p of ['sentado', 'caminando', 'saltando', 'aleteando', 'durmiendo', 'jugando']) { postura(p, 2); paso(1 / 30); }
        check('Seis posturas del bebé', ['sentado', 'caminando', 'saltando', 'aleteando', 'durmiendo', 'jugando'].every(p => D().posturas.some(x => x.id === p)));
        const r1 = cuidar('comida');
        check('Cuidar al pichón gasta una carga y da 5 XP', r1.ok && st.fuentes.cuidar === 5);
        st.capsulas.clasico.xp = 275 - 1; dar('hallazgo', 'test-h');
        procesarAvisos(); for (let i = 0; i < 70; i++) paso(1 / 30);
        check('Cambio de etapa: juvenil con 275 XP', etapaDe(st.capsulas.clasico) === 'juvenil' && k.etapa === 'juvenil' && Math.abs((k.f.cabeza001 || 1) - 1.16) < 0.01, k.etapa);
        st.capsulas.clasico.xp = 1575 - 1; dar('hallazgo', 'test-h2'); procesarAvisos(); for (let i = 0; i < 70; i++) paso(1 / 30);
        const adultoIntacto = Object.values(k.fNow).every(v => v === 1) && k.fluff.shells.every(s => !s.mesh.visible);
        check('Adulto = Vittata intacta (sin escalas ni plumón)', k.etapa === 'adulto' && adultoIntacto);
        check('Adulto con anillo de anillamiento científico', !!k.extras.anillo);
        // Compañero en el mundo: estado y aspecto para actores.js
        const info = companero();
        check('Compañero: la cría nacida es el compañero (adulta, escala 1)', info && info.id === 'clasico' && info.etapa === 'adulto' && info.escala === 1 && /Iguaca/.test(etiqueta(info)), etiqueta(info));
        const ch2 = await window.AVCharacter.create();
        const ctl = vestir(ch2, Object.assign({}, info, { etapa: 'bebe', look: lookDe('clasico', 'bebe') }));
        ctl.antes(); ch2.update(1 / 30); ctl.despues();
        const hs = ch2.bones.cabeza001 ? ch2.bones.cabeza001.scale.x : 0;
        check('vestir(): otra instancia queda en bebé (cabeza ×1,42, pies más abajo)', hs > 1.3 && ctl.pies() < 0, hs.toFixed(3) + ' / ' + ctl.pies().toFixed(3));
        ctl.quitar();
        check('vestir().quitar() deja el modelo intacto', ch2.bones.cabeza001 && Math.abs(ch2.bones.cabeza001.scale.x - hs / 1.42) < 1e-6);
        if (window.AVCharacter.disposeObject) window.AVCharacter.disposeObject(ch2.root);
      }
      // Bandera de la cápsula boricua: proporciones fieles en la textura
      const cv = flagCanvas(300), g = cv.getContext('2d'), px = (x, y) => Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3));
      const Hf = cv.height, near = (a, hex) => { const c = new THREE.Color(hex); return Math.abs(a[0] - c.r * 255) < 30 && Math.abs(a[1] - c.g * 255) < 30 && Math.abs(a[2] - c.b * 255) < 30; };
      const franjas = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => px(cv.width * 0.92, Hf * f));
      check('Bandera: 5 franjas rojo-blanco-rojo-blanco-rojo', near(franjas[0], '#EE0000') && near(franjas[1], '#FFFFFF') && near(franjas[2], '#EE0000') && near(franjas[3], '#FFFFFF') && near(franjas[4], '#EE0000'));
      check('Bandera: triángulo equilátero (punta al 57,7 %)', near(px(Hf * 0.866 - 3, Hf / 2), '#0044FF') && !near(px(Hf * 0.866 + 4, Hf / 2), '#0044FF'));
      check('Bandera: estrella blanca en el baricentro', near(px(Hf * 0.2887, Hf / 2), '#FFFFFF') && near(px(Hf * 0.2887, Hf / 2 - Hf / 6 - 3), '#0044FF'));
      check('Modo Maestro: pestaña del criadero registrada', !(G.aula && G.aula.pestana) || (G.aula.pestanas && G.aula.pestanas().includes('criadero')));
      check('Guardado sin datos personales', !/name|nombre|profile|email|correo/i.test(Object.keys(st).join(',')));
      cerrar();
      check('Cerrar suelta la pausa', !open && root.hidden && (!G.pausa || !G.pausa.motivos.has('criadero')));
      // Integración en el juego: nido en el mundo y botón «Nido» del HUD, tras la primera misión o el disparador del pack
      const misBk = JSON.parse(JSON.stringify((G.S && G.S.missions) || {})), cfgBk = G.pack.criadero;
      try {
        st = fresh(); st.presentado = true;
        for (const k of Object.keys(G.S.missions || {})) G.S.missions[k] = false;
        G.pack.criadero = Object.assign({}, cfgBk || {}, { desde: () => false }); // la prueba controla el disparador del pack
        pasoMundo(0);
        const btn = document.getElementById('b-nido');
        check('Sin misión ni disparador del pack: no hay nido en el mundo ni botón Nido', !nidoActivo() && (!nidoMundo || !nidoMundo.visible) && (!btn || btn.hidden) && !(nidoIt && nidoIt.visible()));
        // Disparador del pack (criadero.desde; cap1: la charla con Iguaca, minuto 2): el nido entra antes de la primera misión
        G.pack.criadero.desde = () => true; pasoMundo(0); pasoMundo(2.1);
        check('Con el disparador del pack y sin misión: nido visible y botón «Nido» en el HUD', nidoActivo() && !!nidoMundo && nidoMundo.visible && !!btn && !btn.hidden && !!nidoIt && nidoIt.visible());
        check('El pack cap1 engancha el nido a la charla con Iguaca (LumaHelped)', !cfgBk || G.pack.id !== 'cap1' || cfgBk.desde === 'LumaHelped', cfgBk && String(cfgBk.desde));
        // Huevo del HUD y «+XP al nido»: la XP ya no sube en silencio
        const xpLugar = dar('lugar', 'prueba-lugar'), mas = btn && btn.querySelector('.nido-mas');
        check('Descubrir un lugar da XP de explorar (fuente extra, 8 XP) y el botón muestra «+8 XP al nido»', xpLugar === 8 && st.fuentes.explorar >= 8 && !!mas && /\+8 XP/.test(mas.textContent), mas ? mas.textContent : 'sin aviso');
        check('La misma fuente no se repite (lugar ya otorgado)', dar('lugar', 'prueba-lugar') === 0);
        pasoMundo(0);
        const huevoHUD = btn && btn.querySelector('.nido-huevo svg'), etiqueta = btn ? btn.getAttribute('aria-label') || '' : '';
        check('El botón «Nido» lleva el huevo con los días de incubación', !!activa() && !!huevoHUD && /huevo, \d+ de \d+ d/.test(etiqueta), etiqueta);
        G.pack.criadero.desde = () => false; st = fresh(); st.presentado = true; pasoMundo(0);
        const primera = Object.keys(G.S.missions || {})[0];
        if (primera) {
          G.S.missions[primera] = true; pasoMundo(0); pasoMundo(2.1);
          check('Con la primera misión: nido visible e interactuable', nidoActivo() && !!nidoMundo && nidoMundo.visible && !!nidoIt && nidoIt.visible());
          const lejos = (G.interaccion.list || []).filter(it => it !== nidoIt && typeof it.x === 'number').every(it => Math.hypot(it.x - nidoIt.x, it.z - nidoIt.z) >= 5);
          // Solo colliders fijos (edificios, NPC, objetos): los árboles de vegetacion.js se recrean alrededor del jugador
          const fijo = c => !/^(arbol|tree)$/.test(c.kind || '');
          const fuera = ((G.fisica && G.fisica.colliders) || []).filter(c => c.id !== 'nido_criadero' && typeof c.x === 'number' && c.r > 0 && fijo(c)).every(c => Math.hypot(c.x - nidoIt.x, c.z - nidoIt.z) >= c.r + 1);
          check('El nido queda a 5 m o más de otros interactuables, fuera de edificios y de copas de árboles', lejos && fuera && sinCopa({ x: nidoIt.x, z: nidoIt.z }));
          check('Botón Nido visible en el HUD', !!btn && !btn.hidden);
          await nidoIt.use();
          check('Se abre desde el nido del mundo', open); cerrar();
          if (btn) { btn.click(); for (let i = 0; i < 60 && !open; i++) await new Promise(r => setTimeout(r, 50)); }
          check('Se abre desde el botón Nido del HUD', open); cerrar();
          st.presentado = false; if (G.dialogo.open()) G.dialogo.clear();
          const puede = puedePresentar(); pasoMundo(2);
          check('Iguaca presenta el nido una sola vez (si no hay lección ni diálogo)', puede ? st.presentado && G.dialogo.open() : !st.presentado);
          if (G.dialogo.open()) G.dialogo.clear();
          pasoMundo(2);
          check('La presentación no se repite', !G.dialogo.open());
        }
      } finally { for (const k of Object.keys(misBk)) G.S.missions[k] = misBk[k]; G.pack.criadero = cfgBk; pasoMundo(0); }
      check('Sin errores de JavaScript nuevos', (window.__aveErrores || []).length === errores0, (window.__aveErrores || []).slice(errores0).join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, e && e.stack || e);
    } finally {
      quitarCria(); st = stBackup; silencio = false;
      try { if (backup == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, backup); } catch (e) { /* */ }
      avisarCompanero();
      if (scene3d.scene) construirNido();
    }
    const ok = checks.every(c => c.ok);
    console[ok ? 'log' : 'warn']('criaderoTest', ok ? 'OK' : 'FALLA', checks.filter(c => !c.ok));
    return { ok, pasan: checks.filter(c => c.ok).length, total: checks.length, checks };
  }

  avisarCompanero(); // primera lectura (no emite)
  return { abrir, cerrar, abierto, estado: () => st, dar, cuidar, test, debug, KEY, nivelDe, etapaDe, companero, vestir, etiqueta };
});
