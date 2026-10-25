/* Juego · aula (funciones para la clase, data-driven)
   - Ajustes del dispositivo: idioma ES/EN de los textos de la lección, modo de texto corto, lectura en voz alta
     (speechSynthesis, tolera que falle o no exista), grado (3-4 o 5-6) y etiqueta de estación del maestro.
     Se cambian en el menú de pausa (sección Aula) y en el Modo Maestro.
   - Fichas de ciencia de la lección: solo se publican las verificadas (y del grado elegido); se muestran en el Diario
     con su fuente. Las URL solo aparecen en el Modo Maestro.
   - Preguntas de la lección (opción múltiple y ordenar) con retroalimentación inmediata, pista en el 2.º intento y
     respuesta explicada en el 3.º, sin puntaje visible. La usa la evaluación formativa del pack.
   - Modo Maestro: acceso discreto desde el menú de pausa resolviendo una suma (no es contraseña ni cuenta). Contiene la
     guía de clase, el progreso de este dispositivo y el reporte descargable (CSV/JSON) sin datos personales.
   - Registro local (localStorage, separado de la partida). Sin red, sin cuentas, sin nombres, sin texto libre del niño.
   Datos del pack: aula { clave: 'clave.de.localStorage', estado: 'clave de G.S' (el pack la declara en guardado.claves),
     archivo: 'prefijo_del_reporte', lecciones: () => objeto con el esquema de assets/data/lecciones_cap1.json
     (meta, objetivos, diario, preguntas, formativa, modo_maestro) }. Sin pack.aula el módulo queda inerte.
   Gancho 'aula' (clave, valor) al cambiar un ajuste. Gancho 'aprendizaje' ({ tipo: 'ficha'|'pregunta'|'paso'|'mision'|'hallazgo', id, intento? })
   cuando el niño aprende algo (lo escuchan otros módulos, p. ej. el criadero). Otros módulos añaden pestañas al Modo Maestro con
   G.aula.pestana({ id, titulo: { es, en }, html: () => string, enlazar?: elemento => void }). */
AVE.module('aula', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const A = G.pack.aula || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tx0 = v => (v == null ? '' : typeof v === 'string' ? v : v.es != null ? v.es : v.en || '');
  if (!A) return { activo: false, t: tx0, tc: tx0, aj: { idioma: 'es', corto: false, voz: false, grado: '3-4', estacion: '' }, esc, leer: () => false, callar() {}, vozDisponible: () => false };

  const LEC = (A.lecciones && A.lecciones()) || {};
  const KEY = A.clave || ((G.pack.meta && G.pack.meta.almacen) || G.pack.id) + '.aula';
  const st = () => S[A.estado || 'aula'] || (S[A.estado || 'aula'] = {});

  // ---------- Almacén del aula (dispositivo) ----------
  const AJ0 = { idioma: 'es', corto: false, voz: false, grado: '3-4', estacion: '' };
  const MAX_PARTIDAS = 200;
  function cargar() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1) return { v: 1, ajustes: Object.assign({}, AJ0, d.ajustes), partidas: Array.isArray(d.partidas) ? d.partidas : [] };
    } catch (e) { /* almacén ilegible: se empieza de cero */ }
    return { v: 1, ajustes: Object.assign({}, AJ0), partidas: [] };
  }
  let data = cargar();
  const aj = data.ajustes;
  function persistir() { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }

  // ---------- Idioma y texto corto ----------
  const t = v => (v == null ? '' : typeof v === 'string' ? v : v[aj.idioma] != null ? v[aj.idioma] : tx0(v));
  const tc = (largo, corto) => (aj.corto && corto ? t(corto) : t(largo));
  const UI = {
    aula: { es: 'Aula', en: 'Classroom' }, idioma: { es: 'Idioma', en: 'Language' },
    corto: { es: 'Texto corto', en: 'Short text' }, voz: { es: 'Leer en voz alta', en: 'Read aloud' },
    sinVoz: { es: 'Sin voz en este equipo', en: 'No on-device voice' },
    escuchar: { es: 'Escuchar', en: 'Listen' }, seguir: { es: 'Seguir', en: 'Continue' },
    docentes: { es: 'Docentes', en: 'Teachers' }, entrar: { es: 'Entrar', en: 'Enter' }, cancelar: { es: 'Cancelar', en: 'Cancel' },
    reto: { es: 'Para docentes: ¿cuánto es', en: 'For teachers: what is' }, retoMal: { es: 'No es correcto. Prueba esta otra.', en: 'Not quite. Try this one.' },
    mantener: { es: 'Mantén pulsado', en: 'Press and hold' },
    maestro: { es: 'Modo Maestro', en: 'Teacher Mode' }, cerrar: { es: 'Cerrar', en: 'Close' },
    guia: { es: 'Guía de clase', en: 'Lesson guide' }, progreso: { es: 'Progreso', en: 'Progress' },
    reporte: { es: 'Reporte', en: 'Report' }, fuentes: { es: 'Fuentes', en: 'Sources' },
    pista: { es: 'Pista', en: 'Hint' }, asi: { es: 'Así es', en: "Here's how" },
    respuesta: { es: 'Tu respuesta', en: 'Your answer' }, deNuevo: { es: 'Empezar de nuevo', en: 'Start over' },
    fuente: { es: 'Fuente', en: 'Source' }, ciencia: { es: 'Ciencia', en: 'Science' },
    porDescubrir: { es: 'Ficha de ciencia por descubrir', en: 'Science card to discover' },
  };
  const u = k => t(UI[k]);

  function setAjuste(k, v) {
    if (!(k in AJ0)) return;
    aj[k] = v; persistir();
    if (k === 'voz' && !v) callar();
    syncPausa();
    G.emit('aula', k, v);
    if (G.misiones) G.misiones.renderQuest();
  }

  // ---------- Lectura en voz alta (speechSynthesis; si falla, el juego sigue igual) ----------
  // Solo voces locales (localService): una voz en línea mandaría el texto a un servidor de terceros (seguridad infantil).
  const synth = (() => { try { return window.speechSynthesis || null; } catch (e) { return null; } })();
  const hayMotorVoz = () => !!(synth && window.SpeechSynthesisUtterance);
  let voces = [], montado = false;
  function cargarVoces() { try { voces = (synth.getVoices() || []).filter(v => v.localService); } catch (e) { voces = []; } if (montado) syncPausa(); }
  const vozDisponible = () => hayMotorVoz() && !!vozPara(aj.idioma);
  if (hayMotorVoz()) {
    cargarVoces();
    try { if (synth.addEventListener) synth.addEventListener('voiceschanged', cargarVoces); else synth.onvoiceschanged = cargarVoces; } catch (e) { /* sin evento */ }
  }
  // Variante de Puerto Rico primero; solo voces del dispositivo
  const PREF = { es: ['es-PR', 'es-US', 'es-419', 'es-MX', 'es'], en: ['en-US', 'en'] };
  function vozPara(lang) {
    for (const p of PREF[lang] || [lang]) {
      const m = voces.filter(v => String(v.lang || '').replace('_', '-').toLowerCase().startsWith(p.toLowerCase()));
      if (m.length) return m[0];
    }
    return null;
  }
  // Frases cortas: algunos navegadores cortan las locuciones largas
  function trozos(texto) {
    const out = [];
    for (const f of String(texto).replace(/\s+/g, ' ').trim().split(/(?<=[.!?…:;])\s+/)) {
      if (!f) continue;
      if (f.length <= 180) out.push(f); else for (let i = 0; i < f.length; i += 180) out.push(f.slice(i, i + 180));
    }
    return out;
  }
  const vozLog = [];
  function leer(texto, lang) {
    if (!texto) return false;
    lang = lang === 'en' || lang === 'es' ? lang : aj.idioma;
    vozLog.push({ lang, texto: String(texto).slice(0, 80) }); if (vozLog.length > 20) vozLog.shift();
    const v = hayMotorVoz() ? vozPara(lang) : null;
    if (!v) return false; // sin voz local no se lee (nunca una voz en línea)
    try {
      synth.cancel();
      let base = 0;
      for (const tr of trozos(texto)) {
        const ut = new SpeechSynthesisUtterance(tr), off = base;
        ut.lang = v.lang; ut.voice = v; ut.rate = 0.9;
        ut.onerror = () => {};
        // Para que el pico siga la voz (rol de movimiento): índice de la letra que se está diciendo
        ut.onboundary = e => G.emit('voz', { charIndex: off + (e.charIndex || 0), texto: String(texto) });
        ut.onend = () => G.emit('voz', { fin: true, texto: String(texto) });
        synth.speak(ut);
        base += tr.length + 1;
      }
      return true;
    } catch (e) { return false; }
  }
  function callar() { try { if (hayMotorVoz()) synth.cancel(); } catch (e) { /* nada que callar */ } }
  // Botones "Escuchar" de cualquier tarjeta: <button data-leer="texto" data-lang="es">
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-leer]');
    if (b) leer(b.getAttribute('data-leer'), b.getAttribute('data-lang') || aj.idioma);
  });
  // Con la lectura activada, las líneas del diálogo también se leen (en su idioma: atributo lang de #d-text)
  const dText = $('d-text');
  if (dText) new MutationObserver(() => {
    if (aj.voz && !$('dialog').hidden && dText.textContent) leer(dText.textContent, dText.lang || 'es');
  }).observe(dText, { childList: true, characterData: true, subtree: true });
  const btnLeer = (texto, lang, compacto) => compacto
    ? `<button class="btn ghost sm icon edu-leer" type="button" data-icon="sound" data-leer="${esc(texto)}" data-lang="${lang || aj.idioma}" aria-label="${u('escuchar')}" title="${u('escuchar')}"></button>`
    : `<button class="btn ghost sm" type="button" data-icon="sound" data-leer="${esc(texto)}" data-lang="${lang || aj.idioma}">${u('escuchar')}</button>`;
  // Lectura automática de una tarjeta de la lección (si el maestro o el niño la activaron)
  const auto = texto => { if (aj.voz) leer(texto); };

  // ---------- Hoja de estilo del aula (componentes nuevos; usa los tokens de src/ui/tokens.css) ----------
  if (!document.getElementById('aula-css')) {
    const l = document.createElement('link'); l.id = 'aula-css'; l.rel = 'stylesheet'; l.href = 'src/ui/aula.css';
    document.head.appendChild(l);
  }

  // ---------- Menú de pausa: sección Aula y acceso discreto al Modo Maestro ----------
  const menu = $('pause');
  let retoSuma = 0;
  function montarPausa() {
    if (!menu || menu.querySelector('.pause-aula')) return;
    const sec = document.createElement('section');
    sec.className = 'pause-aula'; sec.setAttribute('aria-labelledby', 'aula-titulo');
    sec.innerHTML = `<h3 id="aula-titulo"></h3><div class="aula-chips">
      <div class="aula-grupo" role="group" aria-labelledby="aula-lbl-idioma"><span id="aula-lbl-idioma" class="aula-lbl"></span>
        <button class="chip" type="button" data-aula-idioma="es" lang="es">ES</button><button class="chip" type="button" data-aula-idioma="en" lang="en">EN</button></div>
      <button class="chip" type="button" data-aula-op="corto"></button>
      <button class="chip" type="button" data-aula-op="voz"></button></div>`;
    const grid = menu.querySelector('.pause-grid');
    if (grid) grid.after(sec); else menu.appendChild(sec);
    const pie = document.createElement('div');
    pie.className = 'pause-maestro';
    pie.innerHTML = `<button class="maestro-link" type="button" data-icon="lock"></button>
      <form class="maestro-reto" hidden><label for="maestro-resp"></label>
        <input id="maestro-resp" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" enterkeyhint="go">
        <button class="btn sm" type="submit"></button><button class="btn ghost sm" type="button" data-cancelar></button>
        <p class="maestro-err" role="alert" hidden></p></form>`;
    menu.appendChild(pie);
    sec.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.aulaIdioma) setAjuste('idioma', b.dataset.aulaIdioma);
      if (b.dataset.aulaOp) setAjuste(b.dataset.aulaOp, !aj[b.dataset.aulaOp]);
    });
    const link = pie.querySelector('.maestro-link'), form = pie.querySelector('form');
    // Puerta docente: mantener pulsado 1,2 s (dedo, ratón o Enter/Espacio) y resolver una multiplicación. No es contraseña:
    // solo evita que un niño entre por accidente o por curiosidad.
    let hold = 0;
    const abrirReto = () => { hold = 0; link.classList.remove('manteniendo'); nuevoReto(); link.hidden = true; form.hidden = false; form.querySelector('input').focus(); };
    const empezar = e => { if (e.type === 'keydown' && (e.repeat || (e.key !== 'Enter' && e.key !== ' '))) return; if (e.type === 'keydown') e.preventDefault(); clearTimeout(hold); link.classList.add('manteniendo'); hold = setTimeout(abrirReto, HOLD_MS); };
    const soltar = () => { clearTimeout(hold); hold = 0; link.classList.remove('manteniendo'); };
    link.addEventListener('pointerdown', empezar); link.addEventListener('keydown', empezar);
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel', 'keyup', 'blur']) link.addEventListener(ev, soltar);
    link.addEventListener('click', e => e.preventDefault());
    link.addEventListener('contextmenu', e => e.preventDefault());
    form.querySelector('[data-cancelar]').addEventListener('click', cerrarReto);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const inp = form.querySelector('input');
      if (parseInt(inp.value, 10) === retoSuma) { cerrarReto(); abrirMaestro(); return; }
      const err = form.querySelector('.maestro-err'); err.textContent = u('retoMal'); err.hidden = false;
      nuevoReto(); inp.value = ''; inp.focus();
    });
    menu.addEventListener('toggle', e => { if (e.newState !== 'open') cerrarReto(); });
    montado = true;
    syncPausa();
  }
  const HOLD_MS = 1200;
  function nuevoReto() {
    const a = 13 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 4); // 13–19 × 6–9
    retoSuma = a * b;
    const lbl = menu && menu.querySelector('.maestro-reto label');
    if (lbl) lbl.innerHTML = `${esc(u('reto'))} <b>${a} × ${b}</b>?`;
  }
  function cerrarReto() {
    if (!menu) return;
    const pie = menu.querySelector('.pause-maestro'); if (!pie) return;
    pie.querySelector('.maestro-link').hidden = false;
    const form = pie.querySelector('form'); form.hidden = true; form.reset();
    form.querySelector('.maestro-err').hidden = true;
  }
  function syncPausa() {
    if (!menu) return;
    const set = (sel, txt) => { const el = menu.querySelector(sel); if (el) el.textContent = txt; };
    set('#aula-titulo', u('aula')); set('#aula-lbl-idioma', u('idioma'));
    for (const b of menu.querySelectorAll('[data-aula-idioma]')) b.setAttribute('aria-pressed', String(aj.idioma === b.dataset.aulaIdioma));
    for (const b of menu.querySelectorAll('[data-aula-op]')) {
      const k = b.dataset.aulaOp, off = k === 'voz' && !vozDisponible();
      b.textContent = off ? u('sinVoz') : u(k); b.disabled = off;
      b.setAttribute('aria-pressed', String(!!aj[k] && !off));
    }
    set('.maestro-link', u('docentes'));
    const ml = menu.querySelector('.maestro-link'); if (ml) ml.title = u('mantener');
    set('.maestro-reto [type=submit]', u('entrar')); set('.maestro-reto [data-cancelar]', u('cancelar'));
    if (panel && !panel.hidden) pintarMaestro();
  }

  // ---------- Fichas de ciencia (solo verificadas) ----------
  const FICHAS = LEC.diario || [];
  const rango = g => String(g || '3-6').split('-').map(Number);
  const enGrado = g => { const [a, b] = rango(g), [x, y] = rango(aj.grado); return a <= y && (b || a) >= x; };
  const verificada = f => f && f.verificacion === 'verificado';
  const publicada = f => verificada(f) && enGrado(f.grado);
  const ficha = id => FICHAS.find(f => f.id === id) || null;
  const fichasPublicadas = () => FICHAS.filter(publicada);
  const tieneFicha = id => (st().fichas || []).includes(id);
  // Desbloquea las fichas publicadas de la lista; devuelve las nuevas
  function desbloquear(ids, opts) {
    opts = opts || {};
    const s = st(); s.fichas = s.fichas || [];
    const nuevas = [].concat(ids || []).map(ficha).filter(f => publicada(f) && !s.fichas.includes(f.id));
    for (const f of nuevas) { s.fichas.push(f.id); G.emit('aprendizaje', { tipo: 'ficha', id: f.id }); }
    if (nuevas.length && !opts.silencio) {
      const f = nuevas[0];
      G.ui.toastHTML(`<b>${esc(G.pack.diario && G.pack.diario.corto || 'Diario')} · ${esc(u('ciencia'))}: ${esc(t(f.titulo))}</b><br>${esc(tc(f.dato, f.corto))}<br><small>${esc(u('fuente'))}: ${esc(f.fuente)}</small>`, 6000);
      G.audio.play('unlock');
      auto(`${t(f.titulo)}. ${tc(f.dato, f.corto)}`);
    }
    if (nuevas.length) G.guardado.autosave();
    return nuevas;
  }
  if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'ciencia', html: () => {
    const lista = fichasPublicadas();
    if (!lista.length) return '';
    const items = lista.map(f => tieneFicha(f.id)
      ? `<li class="found" lang="${aj.idioma}"><span class="ico ciencia" aria-hidden="true"></span><div><b>${esc(t(f.titulo))}</b><small>${esc(tc(f.dato, f.corto))}</small><small class="fuente">${esc(u('fuente'))}: ${esc(f.fuente)}</small>${btnLeer(t(f.titulo) + '. ' + t(f.dato), null, true)}</div></li>`
      : `<li><span class="ico" aria-hidden="true"></span><div><b>???</b><small>${esc(u('porDescubrir'))}</small></div></li>`).join('');
    const n = lista.filter(f => tieneFicha(f.id)).length;
    return `<span class="lbl lbl-ciencia">${esc(u('ciencia'))} · ${esc(t(LEC.meta && LEC.meta.titulo))} <small>${n}/${lista.length}</small></span><ul class="diary ciencia">${items}</ul>`;
  } });

  // ---------- Preguntas de la lección ----------
  const PREG = LEC.preguntas || [];
  const pregunta = id => PREG.find(q => q.id === id) || null;
  // Sin validar no se pregunta (mismo criterio que las fichas)
  const preguntaPublicable = q => !!q && !/^por_verificar/.test(String(q.verificacion || ''));
  // Orden de las opciones (estable por semilla). evitar: índice que no debe quedar primero (la respuesta correcta)
  function mezclar(n, semilla, evitar) {
    const R = G.util.rng(semilla || 1), idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    if (evitar != null && n > 1 && idx[0] === evitar) [idx[0], idx[1]] = [idx[1], idx[0]];
    return idx;
  }
  // Una pregunta en la tarjeta. o = { cabecera: html, alTerminar(intento 1-3) }
  function hacerPregunta(q, o) {
    const s = { intento: 1, orden: [], hecho: false, semilla: (q.id.charCodeAt(1) || 7) * 31 };
    const pintar = (msg, cls) => {
      const opts = q.opciones.map((op, i) => ({ op, i }));
      const vista = q.tipo === 'ordenar' ? opts : mezclar(opts.length, s.semilla, q.correcta).map(k => opts[k]);
      const correcta = q.correcta;
      let cuerpo;
      if (q.tipo === 'ordenar') {
        const sec = s.hecho ? correcta : s.orden;
        cuerpo = `<ol class="edu-seq" aria-label="${esc(u('respuesta'))}">${q.opciones.map((_, k) => `<li class="${sec[k] != null ? 'ok' : ''}">${sec[k] != null ? esc(t(q.opciones[sec[k]])) : '…'}</li>`).join('')}</ol>
          <div class="row edu-opts">${vista.filter(x => !s.hecho && !s.orden.includes(x.i)).map(x => `<button class="btn secondary edu-opt" id="ch-${x.i}" type="button" data-i="${x.i}">${esc(t(x.op))}</button>`).join('')}</div>`;
      } else {
        cuerpo = `<div class="row edu-opts">${vista.map(x => {
          const st2 = s.hecho && x.i === correcta ? ' ok' : s.malas && s.malas.includes(x.i) ? ' bad' : '';
          return `<button class="btn secondary edu-opt${st2}" id="ch-${x.i}" type="button" data-i="${x.i}"${s.hecho || (s.malas && s.malas.includes(x.i)) ? ' disabled' : ''}>${esc(t(x.op))}</button>`;
        }).join('')}</div>`;
      }
      const leerTxt = t(q.enunciado) + ' ' + q.opciones.map(op => t(op)).join('. ');
      G.ui.showCard(`<div class="edu" lang="${aj.idioma}">${o.cabecera || ''}<p class="edu-q">${esc(t(q.enunciado))}</p>${cuerpo}
        ${msg ? `<p class="edu-retro ${cls || ''}" role="status">${msg}</p>` : ''}
        <div class="row edu-pie">${btnLeer(leerTxt)}${s.hecho ? `<button class="btn" id="edu-seguir" type="button" data-icon="play">${u('seguir')}</button>` : ''}</div></div>`);
      const card = $('card');
      for (const b of card.querySelectorAll('.edu-opt')) b.onclick = () => elegir(+b.dataset.i);
      const sg = $('edu-seguir'); if (sg) { sg.onclick = () => o.alTerminar(s.intento); sg.focus(); }
      else { const f = card.querySelector('.edu-opt:not([disabled])'); if (f) f.focus(); }
    };
    const fallo = () => {
      G.audio.play('wrong');
      if (s.intento >= 2) { s.intento = 3; s.hecho = true; pintar(`<b>${esc(u('asi'))}:</b> ${esc(t(q.retro.correcta))}`, 'asi'); auto(t(q.retro.correcta)); return; }
      s.intento = 2; pintar(`<b>${esc(u('pista'))}:</b> ${esc(t(q.retro.incorrecta))}`, 'pista'); auto(t(q.retro.incorrecta));
    };
    function elegir(i) {
      if (s.hecho) return;
      if (q.tipo === 'ordenar') {
        const k = s.orden.length;
        if (q.correcta[k] === i) {
          s.orden.push(i); G.audio.play('pickup', k);
          if (s.orden.length === q.correcta.length) { s.hecho = true; pintar(esc(t(q.retro.correcta)), 'ok'); G.audio.play('unlock'); auto(t(q.retro.correcta)); }
          else pintar();
        } else { s.orden = []; fallo(); }
        return;
      }
      if (i === q.correcta) { s.hecho = true; pintar(esc(t(q.retro.correcta)), 'ok'); G.audio.play('unlock'); auto(t(q.retro.correcta)); return; }
      (s.malas = s.malas || []).push(i); fallo();
    }
    pintar();
    auto(t(q.enunciado));
    return { q, elegir, estado: s };
  }
  // Varias preguntas seguidas (formativa). o = { cabecera(i, n): html, alTerminar(resultados) }; guarda el intento en st().formativa
  let enCurso = null;
  function serie(ids, o) {
    const lista = ids.map(pregunta).filter(preguntaPublicable);
    const s = st(); s.formativa = s.formativa || {};
    const pend = lista.filter(q => !s.formativa[q.id]);
    let i = lista.length - pend.length;
    const siguiente = () => {
      const q = pend.shift();
      if (!q) { enCurso = null; o.alTerminar && o.alTerminar(Object.assign({}, s.formativa)); return; }
      enCurso = hacerPregunta(q, { cabecera: o.cabecera ? o.cabecera(i, lista.length) : '', alTerminar: intento => {
        s.formativa[q.id] = intento; i++; G.guardado.autosave();
        G.emit('aprendizaje', { tipo: 'pregunta', id: q.id, intento });
        if (o.alResponder) o.alResponder(q.id, intento);
        siguiente();
      } });
    };
    siguiente();
    return lista.map(q => q.id);
  }

  // ---------- Registro local del progreso (sin datos personales) ----------
  function hoy() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
  function partida(crear) {
    const s = st();
    let p = s.registro ? data.partidas.find(x => x._id === s.registro) : null;
    if (!p && crear) {
      p = { _id: G.util.newId(), estacion: aj.estacion, fecha: hoy(), grado: aj.grado };
      data.partidas.push(p);
      while (data.partidas.length > MAX_PARTIDAS) data.partidas.shift();
      s.registro = p._id; G.guardado.autosave();
    }
    return p;
  }
  function registrar(cambios) {
    const p = partida(true);
    Object.assign(p, cambios, { idioma: aj.idioma, modo_texto_corto: !!aj.corto, lectura_voz: !!aj.voz });
    persistir();
    return p;
  }
  // Valor de celda: sí/no, listas con |, sin fórmulas de hoja de cálculo
  function celda(v) {
    if (v === true) return 'sí'; if (v === false) return 'no';
    if (Array.isArray(v)) v = v.join('|');
    let s = v == null ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  // Fila exportable: sin claves internas (_id) y con la estación del dispositivo si la partida no tenía
  function exportable(p) {
    const o = {};
    for (const k of Object.keys(p)) if (k[0] !== '_') o[k] = p[k];
    if (!o.estacion) o.estacion = aj.estacion || '';
    return o;
  }
  function aplanar(o) {
    const f = {};
    for (const [k, v] of Object.entries(o)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) f[k2] = v2;
      else f[k] = v;
    }
    return f;
  }
  function reporteCSV() {
    const filas = data.partidas.map(p => aplanar(exportable(p)));
    const cols = [];
    for (const f of filas) for (const k of Object.keys(f)) if (!cols.includes(k)) cols.push(k);
    return '﻿' + [cols.join(','), ...filas.map(f => cols.map(c => celda(f[c])).join(','))].join('\r\n') + '\r\n';
  }
  function reporteJSON() {
    const R = LEC.modo_maestro && LEC.modo_maestro.reporte_progreso;
    return JSON.stringify({
      juego: 'Amazona Verse', capitulo: LEC.meta && LEC.meta.capitulo, leccion: LEC.meta && LEC.meta.titulo, version_leccion: LEC.meta && LEC.meta.version,
      generado: hoy(), estacion: aj.estacion || '', privacidad: t(PRIVACIDAD).concat(R && R.cumplimiento ? ['Pendiente: ' + R.cumplimiento] : []),
      nota: 'objetivos_logrados = evidencia del juego. O5 y O6 se completan en clase con la rúbrica (R5) y el boleto de salida.',
      partidas: data.partidas.map(exportable),
    }, null, 2);
  }
  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24);
  const nombreArchivo = ext => `${A.archivo || G.pack.id}_${slug(aj.estacion) || 'estacion'}_${hoy()}.${ext}`;
  // Copia al portapapeles (API moderna; si falla, selección + execCommand)
  async function copiar(texto) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(texto); return true; } } catch (e) { /* sin permiso */ }
    try {
      const ta = document.createElement('textarea'); ta.value = texto; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return !!ok;
    } catch (e) { return false; }
  }
  // Descarga con la capacidad "downloads" del artifact; si no está, se ofrece copiar. Nunca <a download> (no funciona en el visor).
  async function descargar(nombre, contenido) {
    let d = null;
    try { d = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { d = null; }
    if (d && typeof d.save === 'function') {
      try { await d.save({ filename: nombre, data: contenido }); return 'guardado'; }
      catch (e) { if (e && e.code === 'declined') return 'rechazado'; if (e && e.code === 'rate_limited') return 'espera'; }
    }
    return (await copiar(contenido)) ? 'copiado' : 'manual';
  }
  // Equipos compartidos: borra la partida (y sus copias .prev/.unreadable, que guardan el nombre inventado) sin tocar el
  // reporte del aula. Los demás módulos (criadero) borran lo suyo con el gancho 'nuevoEstudiante'.
  function nuevoEstudiante() {
    const K = G.guardado.KEY;
    for (const k of [K, K + '.prev', K + '.unreadable']) { try { localStorage.removeItem(k); } catch (e) { /* sin almacenamiento */ } }
    G.emit('nuevoEstudiante');
    G.guardado.reset(true);
    try { localStorage.removeItem(K + '.prev'); } catch (e) { /* sin almacenamiento */ }
  }
  function borrarProgreso() { data.partidas = []; persistir(); const s = st(); s.registro = null; G.guardado.autosave(); }

  // Declaración de privacidad del reporte y del Modo Maestro: solo lo que es cierto hoy (revisión de seguridad infantil)
  const PRIVACIDAD = {
    es: ['Sin cuentas, correos, fotos, audio ni ubicación. El reporte no lleva nombres ni identificadores.',
      'El juego no envía datos del estudiante por la red: el progreso queda solo en este dispositivo.',
      'El motor 3D (Three.js) y las fuentes vienen con el juego: no se piden a servidores de terceros.',
      'Sin texto libre: el niño elige de listas su nombre de aventurero y los textos de su cómic, que quedan en el dispositivo y no van en el reporte.',
      'La lectura en voz alta usa solo voces del dispositivo.',
      'El maestro decide qué hacer con el archivo descargado; el juego no lo envía.'],
    en: ['No accounts, emails, photos, audio or location. The report has no names or identifiers.',
      'The game sends no student data over the network: progress stays on this device only.',
      'The 3D engine (Three.js) and the fonts ship with the game: nothing is requested from third-party servers.',
      'No free text: the child picks an adventurer name and comic texts from lists; they stay on the device and are not in the report.',
      'Read-aloud uses on-device voices only.',
      'The teacher decides what to do with the downloaded file; the game does not send it.'],
  };

  // ---------- Modo Maestro ----------
  const MU = {
    intro: { es: 'Solo para docentes. El juego sigue en pausa mientras está abierto.', en: 'For teachers only. The game stays paused while this is open.' },
    pregunta: { es: 'Pregunta guía', en: 'Guiding question' }, materiales: { es: 'Materiales', en: 'Materials' },
    antes: { es: 'Antes', en: 'Before' }, durante: { es: 'Durante', en: 'During' }, despues: { es: 'Después', en: 'After' },
    dif: { es: 'Diferenciación', en: 'Differentiation' }, sinPantalla: { es: 'Actividades sin pantalla', en: 'Unplugged activities' },
    rubrica: { es: 'Rúbrica', en: 'Rubric' }, objetivos: { es: 'Objetivos', en: 'Objectives' }, min: { es: 'min', en: 'min' },
    soloEs: { es: '', en: 'The detailed guide is in Spanish.' },
    sinPartidas: { es: 'Todavía no hay partidas en este dispositivo.', en: 'No sessions on this device yet.' },
    soloDisp: { es: 'Solo lo guardado en este dispositivo. No se envía nada por la red.', en: 'Only what is stored on this device. Nothing is sent over the network.' },
    estacion: { es: 'Estación', en: 'Station' }, estacionNota: { es: 'Solo un número de estación: el reporte nunca lleva nombres de estudiantes.', en: 'Only a station number: the report never includes student names.' },
    sinEstacion: { es: '(sin estación)', en: '(no station)' },
    nuevo: { es: 'Nuevo estudiante en este equipo', en: 'New student on this device' }, nuevoSeguro: { es: 'Sí, empezar de cero', en: 'Yes, start fresh' },
    nuevoNota: { es: 'Borra la partida de este equipo (personaje, avance, cómic y criadero) para el siguiente estudiante. El reporte del aula se conserva.', en: 'Erases the game on this device (character, progress, comic and nursery) for the next student. The class report is kept.' },
    nuevoHecho: { es: 'Listo para el siguiente estudiante.', en: 'Ready for the next student.' },
    grado: { es: 'Grado', en: 'Grade' }, predet: { es: 'Predeterminados de este dispositivo', en: 'Defaults for this device' },
    csv: { es: 'Descargar CSV', en: 'Download CSV' }, json: { es: 'Descargar JSON', en: 'Download JSON' }, copiar: { es: 'Copiar CSV', en: 'Copy CSV' },
    borrar: { es: 'Borrar progreso de este dispositivo', en: 'Erase progress on this device' }, borrarSeguro: { es: 'Sí, borrar todo', en: 'Yes, erase everything' },
    borrado: { es: 'Progreso borrado.', en: 'Progress erased.' }, preparando: { es: 'Preparando el archivo…', en: 'Preparing the file…' },
    guardado: { es: 'Archivo listo para guardar.', en: 'File ready to save.' }, rechazado: { es: 'Descarga cancelada.', en: 'Download cancelled.' },
    espera: { es: 'Hay otra descarga abierta; inténtalo en un momento.', en: 'Another download is open; try again in a moment.' },
    copiado: { es: 'No se pudo descargar aquí: el reporte se copió al portapapeles.', en: 'Download is not available here: the report was copied to the clipboard.' },
    manual: { es: 'Copia el reporte desde el cuadro de abajo.', en: 'Copy the report from the box below.' },
    privacidad: { es: 'Privacidad', en: 'Privacy' },
    publicadas: { es: 'Fichas publicadas (verificadas)', en: 'Published cards (verified)' },
    noPublicadas: { es: 'No publicadas hasta verificar su fuente', en: 'Not published until their source is verified' },
    estandares: { es: 'Estándares', en: 'Standards' },
    cols: { es: ['Fecha', 'Estación', 'Grado', 'Pasos', 'Perchas', 'Cadena', 'Predicción', 'Explicación', 'Preguntas', 'Objetivos', 'Min'], en: ['Date', 'Station', 'Grade', 'Steps', 'Perches', 'Chain', 'Prediction', 'Explanation', 'Questions', 'Objectives', 'Min'] },
  };
  const m = k => t(MU[k]);
  const TABS = ['guia', 'progreso', 'reporte', 'fuentes'];
  const extras = []; // pestañas de otros módulos
  function pestana(def) { const i = extras.findIndex(x => x.id === def.id); if (i >= 0) extras[i] = def; else extras.push(def); }
  let tab = 'guia', panel = null, focoPrevio = null;
  function montarMaestro() {
    panel = document.createElement('div');
    panel.id = 'maestro'; panel.className = 'hud'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'maestro-titulo');
    panel.innerHTML = '<div class="maestro-box paper"></div>';
    document.body.appendChild(panel);
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrarMaestro(); } });
  }
  const lista = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  function htmlGuia() {
    const MM = LEC.modo_maestro || {}, g = MM.guia_45_min || {};
    const fase = (k, f) => f ? `<details${k === 'antes' ? ' open' : ''}><summary>${esc(m(k))} · ${f.minutos} ${esc(m('min'))}</summary><ol>${(f.pasos || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>` : '';
    const dif = g.diferenciacion ? `<details><summary>${esc(m('dif'))}</summary><dl>${Object.entries(g.diferenciacion).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>` : '';
    const obj = (LEC.objetivos || []).map(o => `<li><b>${esc(o.id)}</b> ${esc(t(o.enunciado))} <small>DEPR ${esc((o.depr_2022 || []).join(', '))} · NGSS ${esc((o.ngss || []).join(', '))}</small></li>`).join('');
    const act = (MM.actividades_sin_pantalla || []).map(a => `<details><summary>${esc(a.titulo)} · ${esc(a.grados)} · ${a.minutos} ${esc(m('min'))}</summary>
      <p><b>${esc(m('materiales'))}:</b> ${esc((a.materiales || []).join(', '))}</p><ol>${(a.pasos || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>`).join('');
    const R = MM.rubrica;
    const rub = R ? `<details><summary>${esc(m('rubrica'))}</summary><div class="maestro-scroll"><table><thead><tr><th></th>${Object.keys(R.escala).sort().reverse().map(k => `<th>${k} · ${esc(R.escala[k])}</th>`).join('')}</tr></thead>
      <tbody>${R.criterios.map(c => `<tr><th>${esc(c.id)} ${esc(c.criterio)}<small>${esc(c.objetivo)}</small></th>${['4', '3', '2', '1'].map(k => `<td>${esc(c.niveles[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>` : '';
    return `${m('soloEs') ? `<p class="note">${esc(m('soloEs'))}</p>` : ''}
      <p class="maestro-pregunta"><span class="eyebrow">${esc(m('pregunta'))}</span>${esc(t(g.pregunta_guia))}</p>
      <details><summary>${esc(m('materiales'))}</summary>${lista(g.materiales)}</details>
      ${fase('antes', g.antes)}${fase('durante', g.durante)}${fase('despues', g.despues)}${dif}
      <details><summary>${esc(m('objetivos'))}</summary><ul class="maestro-obj">${obj}</ul></details>
      <h3>${esc(m('sinPantalla'))}</h3>${act}${rub}`;
  }
  function htmlProgreso() {
    if (!data.partidas.length) return `<p class="note">${esc(m('sinPartidas'))}</p><p class="note">${esc(m('soloDisp'))}</p>`;
    const C = t(MU.cols);
    const yn = v => (v === true ? t({ es: 'sí', en: 'yes' }) : v === false ? t({ es: 'no', en: 'no' }) : '');
    const filas = data.partidas.slice().reverse().map(p => {
      const pr = p.preguntas ? Object.entries(p.preguntas).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ') : '';
      return `<tr><td>${esc(p.fecha)}</td><td>${esc(p.estacion || aj.estacion)}</td><td>${esc(p.grado)}</td><td>${(p.pasos_completados || []).length}/8</td>
        <td>${p.perchas_observadas != null ? p.perchas_observadas + '/4' : ''}</td><td>${p.cadena_correcta_intento || ''}</td>
        <td>${yn(p.prediccion_coincidio)}</td><td>${p.explicacion_ciclo_intento || ''}</td><td>${esc(pr)}</td>
        <td>${esc((p.objetivos_logrados || []).join(' '))}</td><td>${p.minutos_mision != null ? p.minutos_mision : ''}</td></tr>`;
    }).join('');
    return `<p class="note">${esc(m('soloDisp'))}</p><div class="maestro-scroll"><table class="maestro-tabla"><thead><tr>${C.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></div>`;
  }
  function htmlReporte() {
    const R = LEC.modo_maestro && LEC.modo_maestro.reporte_progreso;
    const chip = (k, on, txt) => `<button class="chip" type="button" data-m-op="${k}" aria-pressed="${on}">${esc(txt)}</button>`;
    const ests = Array.from({ length: 40 }, (_, i) => `${t({ es: 'Estación', en: 'Station' })} ${i + 1}`);
    if (aj.estacion && !ests.includes(aj.estacion)) ests.unshift(aj.estacion);
    return `<label for="m-estacion">${esc(m('estacion'))}</label>
      <select id="m-estacion"><option value="">${esc(m('sinEstacion'))}</option>${ests.map(e => `<option${e === aj.estacion ? ' selected' : ''}>${esc(e)}</option>`).join('')}</select>
      <p class="note">${esc(m('estacionNota'))}</p>
      <label for="m-grado">${esc(m('grado'))}</label>
      <select id="m-grado"><option value="3-4"${aj.grado === '3-4' ? ' selected' : ''}>3.º–4.º</option><option value="5-6"${aj.grado === '5-6' ? ' selected' : ''}>5.º–6.º</option></select>
      <span class="lbl">${esc(m('predet'))}</span>
      <div class="row maestro-chips">${chip('idioma-es', aj.idioma === 'es', 'ES')}${chip('idioma-en', aj.idioma === 'en', 'EN')}${chip('corto', !!aj.corto, u('corto'))}${vozDisponible() ? chip('voz', !!aj.voz, u('voz')) : ''}</div>
      <div class="row maestro-acciones"><button class="btn" type="button" id="m-csv" data-icon="save">${esc(m('csv'))}</button>
        <button class="btn ghost" type="button" id="m-json" data-icon="save">${esc(m('json'))}</button>
        <button class="btn ghost" type="button" id="m-copiar">${esc(m('copiar'))}</button></div>
      <p class="maestro-estado" id="m-estado" role="status" aria-live="polite"></p>
      <textarea id="m-manual" readonly hidden rows="5" aria-label="CSV"></textarea>
      <div class="row maestro-borrar"><button class="btn ghost sm" type="button" id="m-nuevo" data-icon="reset">${esc(m('nuevo'))}</button>
        <button class="btn danger sm" type="button" id="m-nuevo-si" hidden>${esc(m('nuevoSeguro'))}</button></div>
      <p class="note">${esc(m('nuevoNota'))}</p>
      <div class="row maestro-borrar"><button class="btn ghost sm" type="button" id="m-borrar" data-icon="reset">${esc(m('borrar'))}</button>
        <button class="btn danger sm" type="button" id="m-borrar-si" hidden>${esc(m('borrarSeguro'))}</button></div>
      <details><summary>${esc(m('privacidad'))}</summary>${lista(t(PRIVACIDAD))}${R && R.cumplimiento ? `<p class="note">${esc(R.cumplimiento)}</p>` : ''}</details>`;
  }
  function htmlFuentes() {
    const pub = FICHAS.filter(verificada), no = FICHAS.filter(f => !verificada(f));
    const E = (LEC.meta && LEC.meta.fuentes_estandares) || {};
    return `<h3>${esc(m('publicadas'))}</h3><ul class="maestro-fuentes">${pub.map(f => `<li><b>${esc(t(f.titulo))}</b> · ${esc(f.fuente)} <small>(${esc(f.grado)})</small><br><code>${esc(f.fuente_url || '')}</code></li>`).join('')}</ul>
      <details><summary>${esc(m('noPublicadas'))} (${no.length})</summary><ul class="maestro-fuentes">${no.map(f => `<li><b>${esc(t(f.titulo))}</b> · ${esc(f.verificacion)}${f.nota_verificacion ? ' · ' + esc(f.nota_verificacion) : ''}</li>`).join('')}</ul></details>
      <h3>${esc(m('estandares'))}</h3><ul class="maestro-fuentes"><li>DEPR 2022 <code>${esc(E.depr_2022 || '')}</code></li><li>NGSS <code>${esc(E.ngss || '')}</code></li></ul>`;
  }
  function pintarMaestro() {
    const box = panel.querySelector('.maestro-box');
    const ex = extras.find(x => x.id === tab);
    if (!ex && !TABS.includes(tab)) tab = 'guia';
    let cuerpo = '';
    try { cuerpo = ex ? ex.html() : { guia: htmlGuia, progreso: htmlProgreso, reporte: htmlReporte, fuentes: htmlFuentes }[tab](); } catch (e) { cuerpo = '<p class="note">—</p>'; }
    box.innerHTML = `<div class="maestro-head"><div><span class="eyebrow">${esc(t(LEC.meta && LEC.meta.titulo))}</span><h2 id="maestro-titulo">${esc(u('maestro'))}</h2></div>
      <button class="btn ghost icon" type="button" data-icon="close" id="m-cerrar" aria-label="${esc(u('cerrar'))}"></button></div>
      <p class="note">${esc(m('intro'))}</p>
      <div class="maestro-tabs" role="tablist">${TABS.map(k => [k, u(k)]).concat(extras.map(x => [x.id, t(x.titulo)])).map(([k, n]) => `<button class="chip" type="button" role="tab" id="m-tab-${esc(k)}" aria-selected="${k === tab}" aria-pressed="${k === tab}" aria-controls="m-panel" data-tab="${esc(k)}">${esc(n)}</button>`).join('')}</div>
      <div class="maestro-body" id="m-panel" role="tabpanel" aria-labelledby="m-tab-${tab}" lang="${aj.idioma}">${cuerpo}</div>`;
    box.querySelector('#m-cerrar').onclick = cerrarMaestro;
    for (const b of box.querySelectorAll('[data-tab]')) b.onclick = () => { tab = b.dataset.tab; pintarMaestro(); const nb = $('m-tab-' + tab); if (nb) nb.focus(); };
    if (tab === 'reporte') enlazarReporte(box);
    if (ex && ex.enlazar) try { ex.enlazar(box.querySelector('#m-panel')); } catch (e) { /* la pestaña ajena no rompe el panel */ }
  }
  function enlazarReporte(box) {
    const est = box.querySelector('#m-estacion');
    est.addEventListener('change', () => setAjuste('estacion', est.value.slice(0, 24)));
    box.querySelector('#m-grado').addEventListener('change', e => setAjuste('grado', e.target.value === '5-6' ? '5-6' : '3-4'));
    for (const b of box.querySelectorAll('[data-m-op]')) b.onclick = () => {
      const k = b.dataset.mOp;
      if (k.startsWith('idioma-')) setAjuste('idioma', k.slice(7)); else setAjuste(k, !aj[k]);
    };
    const estado = msg => { const e = box.querySelector('#m-estado'); if (e) e.textContent = msg; };
    const fin = (r, contenido) => {
      estado(m(r));
      const ta = box.querySelector('#m-manual');
      if (ta) { ta.hidden = r !== 'manual'; if (r === 'manual') { ta.value = contenido; ta.focus(); ta.select(); } }
    };
    box.querySelector('#m-csv').onclick = async () => { if (est.value !== aj.estacion) est.dispatchEvent(new Event('change')); estado(m('preparando')); const c = reporteCSV(); fin(await descargar(nombreArchivo('csv'), c), c); };
    box.querySelector('#m-json').onclick = async () => { if (est.value !== aj.estacion) est.dispatchEvent(new Event('change')); estado(m('preparando')); const c = reporteJSON(); fin(await descargar(nombreArchivo('json'), c), c); };
    box.querySelector('#m-copiar').onclick = async () => { const c = reporteCSV(); fin((await copiar(c)) ? 'copiado' : 'manual', c); if (box.querySelector('#m-estado').textContent === m('copiado')) estado(t({ es: 'Reporte copiado al portapapeles.', en: 'Report copied to the clipboard.' })); };
    const nb = box.querySelector('#m-nuevo'), nsi = box.querySelector('#m-nuevo-si');
    nb.onclick = () => { nsi.hidden = false; nsi.focus(); };
    nsi.onclick = () => { nuevoEstudiante(); nsi.hidden = true; estado(m('nuevoHecho')); };
    const bb = box.querySelector('#m-borrar'), si = box.querySelector('#m-borrar-si');
    bb.onclick = () => { si.hidden = false; si.focus(); };
    si.onclick = () => { borrarProgreso(); si.hidden = true; estado(m('borrado')); };
  }
  function abrirMaestro() {
    if (!panel) montarMaestro();
    focoPrevio = document.activeElement;
    G.pausa && G.pausa.set('maestro', true); // antes de cerrar el menú: la pausa no se suelta en el cambio
    try { if (menu && menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
    callar();
    tab = 'guia';
    pintarMaestro();
    panel.hidden = false;
    const c = $('m-cerrar'); if (c) c.focus();
  }
  function cerrarMaestro() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    G.pausa && G.pausa.set('maestro', false);
    const b = focoPrevio && document.contains(focoPrevio) && focoPrevio.offsetParent ? focoPrevio : $('b-menu');
    if (b && b.focus) b.focus();
  }
  const maestroAbierto = () => !!(panel && !panel.hidden);

  montarPausa();

  return {
    activo: true, LEC, KEY, aj, t, tc, u, esc, setAjuste,
    vozDisponible, leer, callar, auto, btnLeer, vozLog,
    ficha, fichas: fichasPublicadas, verificada, publicada, desbloquear, tieneFicha,
    pregunta, preguntaPublicable, hacerPregunta, serie, enCurso: () => enCurso, mezclar,
    partida, registrar, reporteCSV, reporteJSON, nombreArchivo, descargar, copiar, borrarProgreso, nuevoEstudiante, PRIVACIDAD,
    abrirMaestro, cerrarMaestro, maestroAbierto, nuevoReto, reto: () => retoSuma, pestana, pestanas: () => TABS.concat(extras.map(x => x.id)),
    get partidas() { return data.partidas; }, recargar() { data = cargar(); Object.assign(aj, data.ajustes); data.ajustes = aj; syncPausa(); },
  };
});
