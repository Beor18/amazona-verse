/* Juego · Ajustes de accesibilidad (sección «Accesibilidad» del menú de pausa)
   - Tamaño de texto en 3 niveles: Normal, Grande (×1,15) y Muy grande (×1,3). Escala los tokens --fs-* de la interfaz.
   - Alto contraste: superficies negras opacas, texto blanco, papel blanco con tinta negra y bordes visibles.
   - Subtítulos de sonido: lluvia, trueno, río, martillazos, BIP del transmisor, coquíes y el resto de los sonidos de la historia, en ES y EN,
     arriba y al centro (el diálogo va abajo). Se enganchan a G.audio.alSonar (src/engine/audio.js): salen suene o no el sonido (sonido
     apagado, sin altavoces). El Simon de los coquíes sigue con su nota «[Canta un coquí…]» en la tarjeta.
   - Modo relajado: la flecha de guía (src/engine/fx.js) siempre se ve, más grande y de cerca, el haz brilla más y el objetivo del móvil
     no se corta. El capítulo no tiene tiempos; los modos con reloj (Modo Retos, src/game/retos.js) pueden leer G.accesibilidad.relajado().
   - Modo zurdo (solo pantalla táctil): el joystick pasa a la derecha y los botones de acción a la izquierda (CSS, sin tocar input.js).
   Se guardan en la partida (S.profile.a11y = { texto: 0|1|2, contraste, subtitulos, relajado, zurdo }) y se aplican al cargar o reiniciar.
   «Comenzar de cero» (y cargar una partida vieja, sin ajustes) conserva lo elegido en esta sesión; «Nuevo estudiante» lo olvida.
   Pinta clases en <html>: a11y-t1 / a11y-t2 / a11y-contraste / a11y-relajado / a11y-zurdo (estilos en src/ui/ui.css, sección 7b).
   API: leer(), set(clave, valor), subtitulos(), relajado(), zurdo(), subtitular(nombre, arg), maqueta(ancho, alto, clases) + rect() (pruebas de
   maquetación móvil de cualquier módulo: un iframe con el HUD y las hojas de estilo reales).
   PRUEBAS: G.accesibilidad.test() (AV.accesibilidadTest) comprueba niveles, contraste, subtítulos, modo relajado, modo zurdo, guardado y, en
   una maqueta móvil (iframe con las hojas de estilo reales y copias del HUD: 375×812, 320×568, 812×375…), que nada desborda ni se tapa. */
AVE.module('accesibilidad', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, raiz = document.documentElement;
  const NIVELES = 3;
  const BOOLS = ['contraste', 'subtitulos', 'relajado', 'zurdo'];
  const esObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const TX = () => ({
    titulo: L('Accesibilidad', 'Accessibility'), texto: L('Texto', 'Text'),
    niveles: [L('Normal', 'Normal'), L('Grande', 'Large'), L('Muy grande', 'Extra large')],
    bool: { contraste: L('Alto contraste', 'High contrast'), subtitulos: L('Subtítulos de sonido', 'Sound captions'),
      relajado: L('Modo relajado', 'Relaxed mode'), zurdo: L('Modo zurdo', 'Left-handed mode') },
    notaRelajado: L('Modo relajado: la flecha de guía siempre se ve y el capítulo no tiene tiempos.', 'Relaxed mode: the guide arrow is always visible and the chapter has no timers.'),
    notaZurdo: L('Modo zurdo (pantalla táctil): el joystick pasa a la derecha y los botones de acción a la izquierda.', 'Left-handed mode (touch screens): the joystick moves to the right and the action buttons to the left.'),
    subs: L('Subtítulos de sonido', 'Sound captions'),
  });

  function leer() {
    const a = esObj(S.profile && S.profile.a11y) ? S.profile.a11y : {};
    const t = Number.isInteger(a.texto) && a.texto >= 0 && a.texto < NIVELES ? a.texto : 0;
    const r = { texto: t };
    for (const k of BOOLS) r[k] = a[k] === true;
    return r;
  }
  let guardarAlCambiar = true;
  let ultimo = null; // lo último elegido en esta sesión: sobrevive a «Comenzar de cero» y a cargar una partida sin ajustes
  function set(k, v) {
    const a = leer();
    if (k === 'texto') a.texto = Math.max(0, Math.min(NIVELES - 1, v | 0));
    else if (BOOLS.includes(k)) a[k] = !!v;
    else return;
    ultimo = Object.assign({}, a);
    S.profile = Object.assign({}, S.profile, { a11y: a });
    sync();
    if (guardarAlCambiar && S.profile.created && G.guardado) G.guardado.save(true);
  }

  // ---------- Subtítulos de sonido ----------
  // nombre del sonido → texto (ES/EN) y cuánto se queda en pantalla (ms). `retraso`: el sonido empieza dentro de sí mismo (el BIP suena tras
  // el coro). `nota`: los coquíes (co grave, quí agudo) van juntos en una línea que se va completando.
  const SUB = {
    lluvia: { ms: 2600, es: '[Llueve]', en: '[Rain falls]' },
    trueno: { ms: 3600, es: '[Un trueno retumba a lo lejos]', en: '[Thunder rumbles in the distance]' },
    crecida: { ms: 4200, es: '[El río crece y ruge]', en: '[The river rises and roars]' },
    construir: { ms: 2800, es: '[Martillazos en la madera]', en: '[Hammering on wood]' },
    bip: { ms: 2400, retraso: 900, es: '[BIP… BIP… suena el transmisor]', en: '[BEEP… BEEP… the transmitter sounds]' },
    co: { k: 'coqui', ms: 2400, nota: 'co' },
    qui: { k: 'coqui', ms: 2400, nota: 'quí' },
    chorus: { ms: 3000, es: '[Un coro de coquíes canta: co-quí, co-quí]', en: '[A chorus of coquí frogs sings: co-quí, co-quí]' },
    // El resto de los sonidos de la historia (content/cap1/pack.js e historia.js)
    viento: { ms: 3000, es: '[Sopla el viento]', en: '[The wind blows]' },
    vmmm: { ms: 2600, es: '[VMMMM… zumba el mecanismo]', en: '[VMMMM… the mechanism hums]' },
    zzzt: { ms: 2200, es: '[ZZZT… un chispazo]', en: '[ZZZT… a spark]' },
    onda: { ms: 2800, es: '[Una onda de luz cruza el cielo]', en: '[A wave of light crosses the sky]' },
    estatica: { ms: 2200, es: '[Estática de radio]', en: '[Radio static]' },
    parpadeo: { ms: 2200, es: '[Una campanita suena con cada destello]', en: '[A little bell chimes with each flash]' },
    guiro: { ms: 2000, es: '[Suena un güiro]', en: '[A güiro rasps]' },
  };
  const MAXIMO = 3; // líneas a la vez: la más vieja sale
  // Móvil (hasta 560 px): bajo el objetivo y el inventario, que crecen con la letra grande; tableta (hasta 944 px): bajo el inventario y los
  // botones de la derecha; escritorio: el sitio fijo de ui.css. Solo pone la variable --sub-top (así ui.css puede mandar en otros casos).
  function colocar(d) {
    d = d || document;
    const c = d.getElementById('subtitulos'), w = d.defaultView; if (!c || !w) return;
    const ancho = w.innerWidth, ids = ancho <= 560 ? ['quest', 'inv'] : ancho <= 944 ? ['inv', 'sys'] : null;
    if (!ids) { c.style.removeProperty('--sub-top'); return; }
    let fondo = 0;
    for (const id of ids) { const e = d.getElementById(id); if (e && !e.hidden && w.getComputedStyle(e).display !== 'none') fondo = Math.max(fondo, e.getBoundingClientRect().bottom); }
    if (fondo) c.style.setProperty('--sub-top', Math.ceil(fondo + 8) + 'px'); else c.style.removeProperty('--sub-top');
  }
  let escala = 1; // multiplica los tiempos (la prueba los acorta)
  let notas = [];
  const vivos = new Map(); // clave → { el, t }
  const cont = document.createElement('div');
  cont.id = 'subtitulos'; cont.className = 'hud'; cont.hidden = true;
  cont.setAttribute('role', 'log'); cont.setAttribute('aria-live', 'polite'); cont.setAttribute('aria-relevant', 'additions');
  document.body.appendChild(cont);
  function quitar(k) {
    const v = vivos.get(k); if (!v) return;
    clearTimeout(v.t); v.el.remove(); vivos.delete(k);
    if (k === 'coqui') notas = [];
    if (!vivos.size) cont.hidden = true;
  }
  function limpiar() { for (const k of [...vivos.keys()]) quitar(k); cont.hidden = true; }
  function mostrar(k, texto, ms) {
    let v = vivos.get(k);
    if (!v) {
      const el = document.createElement('p'); el.className = 'sub'; el.dataset.k = k; el.textContent = texto;
      cont.appendChild(el); v = { el, t: 0 }; vivos.set(k, v);
      while (vivos.size > MAXIMO) quitar(vivos.keys().next().value);
      colocar();
    } else if (v.el.textContent !== texto) v.el.textContent = texto;
    cont.hidden = false;
    clearTimeout(v.t); v.t = setTimeout(() => quitar(k), ms * escala);
  }
  // Lo llama G.audio.play (src/engine/audio.js) con cada sonido; devuelve true si hay subtítulo para él y están activados
  function subtitular(nombre) {
    const d = SUB[nombre];
    if (!d || !leer().subtitulos) return false;
    const poner = () => {
      if (!leer().subtitulos) return;
      let texto;
      if (d.nota) {
        if (!vivos.has('coqui')) notas = [];
        notas.push(d.nota); if (notas.length > 7) notas.shift();
        texto = L(`[Un coquí canta: ${notas.join(' · ')}]`, `[A coquí frog sings: ${notas.join(' · ')}]`);
      } else texto = L(d.es, d.en);
      mostrar(d.k || nombre, texto, d.ms);
    };
    if (d.retraso) setTimeout(poner, d.retraso * escala); else poner();
    return true;
  }
  if (G.audio && G.audio.alSonar) G.audio.alSonar(subtitular);
  addEventListener('resize', () => { if (!cont.hidden) colocar(); });

  // ---------- Sección en el menú de pausa ----------
  const menu = $('pause');
  let sec = null;
  function montar() {
    if (!menu || menu.querySelector('.pause-a11y')) return;
    sec = document.createElement('section');
    sec.className = 'pause-a11y'; sec.setAttribute('aria-labelledby', 'a11y-titulo');
    sec.innerHTML = `<h3 id="a11y-titulo"></h3><div class="a11y-chips">
      <div class="a11y-grupo" role="group" aria-labelledby="a11y-lbl-texto"><span id="a11y-lbl-texto" class="a11y-lbl"></span>
        ${Array.from({ length: NIVELES }, (_, i) => `<button class="chip a11y-t" type="button" data-a11y-texto="${i}"></button>`).join('')}</div>
      <button class="chip" type="button" data-a11y-bool="contraste"></button>
      <button class="chip" type="button" data-a11y-bool="subtitulos"></button>
      <button class="chip" type="button" data-a11y-bool="relajado" aria-describedby="a11y-nota-relajado"></button>
      <button class="chip a11y-solo-tactil" type="button" data-a11y-bool="zurdo" aria-describedby="a11y-nota-zurdo"></button></div>
      <p class="note" id="a11y-nota-relajado"></p><p class="note a11y-solo-tactil" id="a11y-nota-zurdo"></p>`;
    const tras = menu.querySelector('.pause-aula') || menu.querySelector('.pause-grid');
    if (tras) tras.after(sec); else menu.appendChild(sec);
    sec.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a11yTexto != null) set('texto', parseInt(b.dataset.a11yTexto, 10));
      else if (b.dataset.a11yBool) set(b.dataset.a11yBool, !leer()[b.dataset.a11yBool]);
    });
  }
  function rotular() {
    cont.setAttribute('aria-label', TX().subs);
    if (!sec) return;
    const T = TX();
    sec.querySelector('#a11y-titulo').textContent = T.titulo;
    sec.querySelector('#a11y-lbl-texto').textContent = T.texto;
    sec.querySelectorAll('[data-a11y-texto]').forEach(b => { b.textContent = T.niveles[+b.dataset.a11yTexto]; });
    sec.querySelectorAll('[data-a11y-bool]').forEach(b => { b.textContent = T.bool[b.dataset.a11yBool]; });
    sec.querySelector('#a11y-nota-relajado').textContent = T.notaRelajado;
    sec.querySelector('#a11y-nota-zurdo').textContent = T.notaZurdo;
  }
  function sync() {
    const a = leer();
    for (let i = 1; i < NIVELES; i++) raiz.classList.toggle('a11y-t' + i, a.texto === i);
    for (const k of BOOLS) raiz.classList.toggle('a11y-' + k, a[k]);
    if (!a.subtitulos) limpiar();
    if (!sec) return;
    sec.querySelectorAll('[data-a11y-texto]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.a11yTexto === a.texto)));
    sec.querySelectorAll('[data-a11y-bool]').forEach(b => b.setAttribute('aria-pressed', String(a[b.dataset.a11yBool])));
  }

  montar(); rotular(); sync();
  // Cargar, reiniciar o restaurar una partida: se aplican sus ajustes; si la partida no trae (nueva o vieja), quedan los de la sesión
  G.on('apply', () => {
    const p = S.profile || {};
    if (esObj(p.a11y)) ultimo = leer();
    else if (ultimo) S.profile = Object.assign({}, p, { a11y: Object.assign({}, ultimo) });
    sync();
  }, 50);
  G.on('nuevoEstudiante', () => { ultimo = null; }); // equipo compartido: el siguiente niño empieza sin ajustes
  G.on('aula', k => { if (k === 'idioma') { rotular(); limpiar(); } });

  // ---------- Pruebas ----------
  const lum = c => {
    const m = String(c).match(/[\d.]+/g); if (!m) return 0;
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(+m[0]) + 0.7152 * f(+m[1]) + 0.0722 * f(+m[2]);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const px = el => parseFloat(getComputedStyle(el).fontSize) || 0;
  // Un cuadro de pantalla; si la pestaña está oculta (no hay requestAnimationFrame) sigue a los 80 ms para no colgar la prueba
  const frame = () => new Promise(r => { let ya = false; const fin = () => { if (!ya) { ya = true; r(); } }; requestAnimationFrame(fin); setTimeout(fin, 80); });
  const espera = ms => new Promise(r => setTimeout(r, ms));

  // Maqueta móvil: un iframe del tamaño de un teléfono con las hojas de estilo del juego y copias del HUD. Así valen de verdad las
  // reglas @media (la ventana de la prueba es de escritorio) sin arrancar otra partida ni otro WebGL.
  async function maqueta(ancho, alto, clases) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = `position:fixed;left:-10000px;top:0;width:${ancho}px;height:${alto}px;border:0;`;
    const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
    const copia = ids => ids.map(id => { const e = $(id); return e ? e.outerHTML : ''; }).join('');
    // En escritorio los controles táctiles están ocultos por (hover: hover) and (pointer: fine); en la maqueta se muestran
    f.srcdoc = `<!doctype html><html lang="es" class="${clases}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}` +
      '<style>*, *::before, *::after { animation: none !important; transition: none !important; } @media (hover: hover) and (pointer: fine) { #stick { display: block !important; } #acts { display: grid !important; } }</style></head>' +
      `<body>${copia(['top', 'sys', 'toast', 'prompt', 'card', 'dialog', 'stick', 'emotes', 'acts', 'subtitulos'])}</body></html>`;
    document.body.appendChild(f);
    await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
    const d = f.contentDocument;
    try { await Promise.race([d.fonts.ready, espera(2500)]); } catch (e) { /* sin fuentes */ }
    // Contenido de ejemplo largo: el peor caso para el desborde
    const q = id => d.getElementById(id);
    const mostrar2 = (id, f2) => { const e = q(id); if (e) { e.hidden = false; if (f2) f2(e); } };
    const pd = q('d-type'); if (pd) pd.remove(); if (q('dialog')) q('dialog').classList.remove('tw');
    mostrar2('toast', e => { e.textContent = 'La Gran Ruptura dañó el taller de Vittata. Examina la máquina y el transmisor.'; });
    mostrar2('prompt', e => { e.innerHTML = '<span class="prompt-txt">Acción: examinar la máquina del taller dañado</span>'; });
    if (q('d-who')) q('d-who').textContent = 'Guardián';
    if (q('d-text')) q('d-text').textContent = 'Hubo un tiempo en que las islas estaban conectadas. Las aves cruzaban de una a otra y el agua de las montañas llegaba hasta el mar sin detenerse.';
    mostrar2('emotes');
    const largos = Object.values(SUB).filter(s => s.es).sort((a, b) => b.es.length - a.es.length).slice(0, MAXIMO);
    mostrar2('subtitulos', e => { e.innerHTML = largos.map((s, i) => `<p class="sub" data-k="m${i}">${s.es}</p>`).join(''); });
    colocar(d);
    return { f, d, w: f.contentWindow, q, cerrar: () => f.remove() };
  }
  const visible = e => { const cs = e.ownerDocument.defaultView.getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  const rect = (m, sel) => { const e = typeof sel === 'string' ? m.d.querySelector(sel) : sel; return e && visible(e) ? e.getBoundingClientRect() : null; };
  const choca = (a, b) => !!a && !!b && a.width > 0 && b.width > 0 && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  // Qué se sale de la pantalla o de su caja en la maqueta (lista vacía = todo bien)
  function desbordes(m, ancho, etiqueta, ids) {
    const d = m.d, malos = [];
    if (d.documentElement.scrollWidth > ancho + 1) malos.push(`${etiqueta}: la página mide ${d.documentElement.scrollWidth} px`);
    for (const id of ids) {
      const e = m.q(id); if (!e || !visible(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width && (r.left < -1 || r.right > ancho + 1)) malos.push(`${etiqueta}: #${id} se sale (${Math.round(r.left)}…${Math.round(r.right)})`);
    }
    for (const e of d.querySelectorAll('#quest, #steps li.now, #toast, #emotes .btn, #acts .round, #d-who, #d-next, #inv, .hud-btn, .sub')) {
      if (visible(e) && e.scrollWidth > e.clientWidth + 1) malos.push(`${etiqueta}: ${e.id ? '#' + e.id : e.className || e.tagName} desborda su caja (${e.scrollWidth} > ${e.clientWidth})`);
    }
    return malos;
  }

  async function test() {
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const perfil0 = S.profile, ultimo0 = ultimo, mudo0 = G.audio.vol.muted, abierto0 = (() => { try { return menu.matches(':popover-open'); } catch (e) { return false; } })();
    guardarAlCambiar = false;
    try {
      check('Sección «Accesibilidad» en el menú de pausa: 3 niveles de texto, alto contraste, subtítulos, modo relajado y modo zurdo',
        !!sec && sec.querySelectorAll('[data-a11y-texto]').length === 3 && BOOLS.every(k => !!sec.querySelector(`[data-a11y-bool="${k}"]`)));
      check('Los ajustes nuevos están apagados de entrada', (() => { S.profile = Object.assign({}, perfil0, { a11y: undefined }); const a = leer(); return a.texto === 0 && BOOLS.every(k => a[k] === false); })());

      // Tamaño de texto: cada nivel agranda el diálogo, la interfaz, el aviso, el aviso de acción y los gestos
      const dTxt = $('d-text'), body = document.body, tam = [];
      for (let i = 0; i < NIVELES; i++) { set('texto', i); tam.push([px(dTxt || body), px(body), px($('toast')), px($('prompt')), px(document.querySelector('#emotes .btn') || body), px(cont.querySelector('.sub') || $('toast'))]); }
      check('Los 3 niveles agrandan el texto del diálogo y de la interfaz',
        tam[1][0] > tam[0][0] && tam[2][0] > tam[1][0] && tam[2][1] > tam[0][1] && tam[2][0] / tam[0][0] >= 1.25, tam.map(t => t[0].toFixed(1)).join(' → ') + ' px');
      check('También crecen el aviso, el aviso de acción y los gestos (los que traen su tamaño en píxeles)',
        tam[1][2] > tam[0][2] && tam[2][2] > tam[1][2] && tam[2][3] > tam[0][3] && tam[2][4] > tam[0][4], `aviso ${tam[0][2]} → ${tam[2][2]} · acción ${tam[0][3]} → ${tam[2][3].toFixed(1)} · gestos ${tam[0][4]} → ${tam[2][4].toFixed(1)}`);
      set('texto', 1);
      check('El nivel marcado se anuncia con aria-pressed', sec.querySelector('[data-a11y-texto="1"]').getAttribute('aria-pressed') === 'true' &&
        sec.querySelector('[data-a11y-texto="0"]').getAttribute('aria-pressed') === 'false' && raiz.classList.contains('a11y-t1'));

      // Alto contraste: texto ≥ 7:1 (AAA) en el menú, el aviso, el papel y los subtítulos
      set('contraste', true);
      if (menu && !abierto0) menu.showPopover();
      await frame();
      const cm = menu ? getComputedStyle(menu) : null, lbl = $('a11y-lbl-texto');
      const rMenu = cm ? ratio(cm.color, cm.backgroundColor) : 0, rMuted = lbl && cm ? ratio(getComputedStyle(lbl).color, cm.backgroundColor) : 0;
      const card = $('d-text') && $('d-text').closest('#dialog'), cc = card ? getComputedStyle(card) : null;
      const rPapel = $('d-text') && cc ? ratio(getComputedStyle($('d-text')).color, cc.backgroundColor) : 0;
      const ct = $('toast') ? getComputedStyle($('toast')) : null, rAviso = ct ? ratio(ct.color, ct.backgroundColor) : 21;
      const sp = document.createElement('p'); sp.className = 'sub'; cont.appendChild(sp); const cs = getComputedStyle(sp), rSub = ratio(cs.color, cs.backgroundColor); sp.remove();
      check('Alto contraste: texto del menú, texto secundario, diálogo, aviso y subtítulos ≥ 7:1', rMenu >= 7 && rMuted >= 7 && (!cc || rPapel >= 7) && rAviso >= 7 && rSub >= 7,
        [rMenu, rMuted, rPapel, rAviso, rSub].map(r => r.toFixed(1)).join(' · '));
      check('Alto contraste se marca', raiz.classList.contains('a11y-contraste') && sec.querySelector('[data-a11y-bool="contraste"]').getAttribute('aria-pressed') === 'true');
      set('contraste', false);
      check('Alto contraste se quita', !raiz.classList.contains('a11y-contraste') && sec.querySelector('[data-a11y-bool="contraste"]').getAttribute('aria-pressed') === 'false');
      try { if (menu && !abierto0) menu.hidePopover(); } catch (e) { /* sin popover */ }

      // ---------- Subtítulos de sonido ----------
      const pedidos = ['lluvia', 'trueno', 'crecida', 'construir', 'bip', 'co', 'qui', 'chorus'];
      check('Hay subtítulo, en español y en inglés, para lluvia, trueno, río, martillazos, BIP del transmisor y coquíes',
        pedidos.every(n => SUB[n] && (SUB[n].nota || (SUB[n].es && SUB[n].en && /^\[.+\]$/.test(SUB[n].es) && /^\[.+\]$/.test(SUB[n].en)))));
      const sinSonido = Object.keys(SUB).filter(n => !G.audio.has(n));
      check('Todos los subtítulos corresponden a sonidos que existen en el motor (nombres sin errores)', !sinSonido.length, sinSonido.join(', '));
      set('subtitulos', false); limpiar(); G.audio.play('lluvia');
      check('Con los subtítulos apagados no sale nada', !cont.children.length && cont.hidden);
      set('subtitulos', true); escala = 50; // los subtítulos se quedan mientras se mira
      G.audio.vol.muted = true; // aunque el sonido esté apagado el subtítulo sale
      const porNombre = [['lluvia', /llueve/i], ['trueno', /trueno/i], ['crecida', /río/i], ['construir', /martillazos/i], ['chorus', /coro de coqu/i]];
      const malos = [];
      for (const [n, re] of porNombre) { limpiar(); G.audio.play(n); const t = cont.textContent; if (!re.test(t) || cont.hidden) malos.push(`${n}: «${t}»`); }
      limpiar(); escala = 0.2; G.audio.play('bip'); const antes = cont.children.length; await espera(320);
      const tBip = cont.textContent; if (antes || !/BIP/.test(tBip)) malos.push(`bip: antes ${antes}, luego «${tBip}»`);
      check('Salen los subtítulos de lluvia, trueno, río, martillazos, coro de coquíes y BIP (el BIP al sonar, tras el coro), aun con el sonido apagado', !malos.length, malos.join('; '));
      escala = 50; limpiar();
      G.audio.play('lluvia'); G.audio.play('lluvia');
      check('El mismo sonido repetido (la lluvia cada segundo) no apila líneas', cont.querySelectorAll('[data-k="lluvia"]').length === 1 && cont.children.length === 1);
      limpiar(); G.audio.play('co'); G.audio.play('qui'); G.audio.play('co');
      check('Las notas de un coquí (co grave, quí agudo) se juntan en una línea', cont.children.length === 1 && /co · quí · co/.test(cont.textContent), cont.textContent);
      limpiar(); for (const n of ['lluvia', 'trueno', 'crecida', 'construir']) G.audio.play(n);
      check('Como mucho 3 líneas a la vez: sale la más vieja', cont.children.length === MAXIMO && !cont.querySelector('[data-k="lluvia"]') && !!cont.querySelector('[data-k="construir"]'), cont.children.length);
      limpiar(); escala = 0.02; G.audio.play('trueno'); const hay = cont.children.length; await espera(160);
      check('Cada subtítulo se va solo y el contenedor se oculta', hay === 1 && !cont.children.length && cont.hidden);
      escala = 50; limpiar(); G.audio.play('trueno'); set('subtitulos', false);
      check('Apagar los subtítulos quita los que hay', !cont.children.length && cont.hidden);
      set('subtitulos', true); G.audio.play('chorus');
      const sub = cont.querySelector('.sub'), csub = getComputedStyle(sub);
      check('Los subtítulos no capturan toques (el juego sigue recibiéndolos) y se anuncian como registro', csub.pointerEvents === 'none' && cont.getAttribute('role') === 'log' && cont.getAttribute('aria-live') === 'polite');
      const reducido = [...document.styleSheets].some(h => { try { return [...h.cssRules].some(r => r.media && /prefers-reduced-motion:\s*reduce/.test(r.media.mediaText) && [...r.cssRules].some(x => /\.sub\b/.test(x.selectorText || '') && /animation:[^;]*\bnone\b/.test(x.cssText))); } catch (e) { return false; } });
      check('Con «reducir movimiento» los subtítulos aparecen sin animación', reducido);
      limpiar(); escala = 1; G.audio.vol.muted = mudo0;

      // ---------- Modo relajado: la flecha de guía siempre se ve ----------
      const tg = { x: S.pos.x + 2.5, z: S.pos.z }; // objetivo a 2,5 m: de cerca la flecha se apaga… salvo en modo relajado
      set('relajado', false); G.fx.guide(tg, 0); const flecha0 = G.fx.guideArrow.visible, op0 = G.fx.guideBeam.material.opacity, esc0 = G.fx.guideArrow.scale.x;
      set('relajado', true); G.fx.guide(tg, 0); const flecha1 = G.fx.guideArrow.visible, op1 = G.fx.guideBeam.material.opacity, esc1 = G.fx.guideArrow.scale.x;
      const lejos = { x: S.pos.x + 12, z: S.pos.z }; G.fx.guide(lejos, 0); const flechaLejos = G.fx.guideArrow.visible;
      G.fx.guide(null, 0); set('relajado', false);
      check('Modo relajado: la flecha se ve también a 2,5 m (más grande) y el haz brilla más; sin él, de cerca no hay flecha',
        !flecha0 && flecha1 && flechaLejos && esc1 > esc0 && (op1 > op0 || op0 === 0), `flecha ${flecha0}→${flecha1} · tamaño ${esc0}→${esc1} · haz ${op0.toFixed(3)}→${op1.toFixed(3)}`);
      set('relajado', true);
      check('G.accesibilidad.relajado() y la clase de <html> siguen al ajuste (para los modos con reloj)', relajado() === true && raiz.classList.contains('a11y-relajado'));
      set('relajado', false);

      // ---------- Maqueta móvil ----------
      const COLOCADOS = ['quest', 'inv', 'sys', 'toast', 'prompt', 'emotes', 'stick', 'acts'];
      // 1. Teléfono (375×812) y el más pequeño (320×568), 3 niveles de texto, con alto contraste, relajado y subtítulos a la vista
      for (const [W, H] of [[375, 812], [320, 568]]) {
        const malosM = [], notas2 = [];
        for (let i = 0; i < NIVELES; i++) {
          const m = await maqueta(W, H, `${i ? 'a11y-t' + i : ''} a11y-contraste a11y-relajado`);
          try {
            if (m.w.getComputedStyle(m.q('stick')).position !== 'fixed') malosM.push('la maqueta no cargó las hojas de estilo');
            // HUD con el diálogo cerrado: objetivo, inventario, botones, aviso, aviso de acción y gestos
            m.q('dialog').hidden = true; m.q('subtitulos').hidden = true;
            malosM.push(...desbordes(m, W, `${W}px nivel ${i}`, COLOCADOS));
            // El aviso no tapa los botones de la derecha (Diario, Gestos, Pausa)
            if (choca(rect(m, '#toast'), rect(m, '#sys'))) malosM.push(`${W}px nivel ${i}: el aviso tapa los botones del menú`);
            // En un teléfono normal el panel de gestos abierto no tapa el joystick ni los botones de acción (a 320 px de ancho no cabe)
            if (H >= 800 && (choca(rect(m, '#emotes'), rect(m, '#acts')) || choca(rect(m, '#emotes'), rect(m, '#stick')))) malosM.push(`${W}px nivel ${i}: el panel de gestos tapa los controles`);
            // Objetivo desplegado y, con el modo relajado, sin cortar con puntos suspensivos
            const li = m.d.querySelector('#steps li.now');
            if (li && (li.scrollWidth > li.clientWidth + 1 || li.scrollHeight > li.clientHeight + 2)) malosM.push(`${W}px nivel ${i}: el objetivo se corta`);
            m.q('quest').classList.add('abierto');
            malosM.push(...desbordes(m, W, `${W}px nivel ${i} (objetivo abierto)`, ['quest']));
            m.q('quest').classList.remove('abierto');
            // Subtítulos: dentro de la pantalla, sin tapar el HUD ni los botones
            m.q('subtitulos').hidden = false;
            malosM.push(...desbordes(m, W, `${W}px nivel ${i} (subtítulos)`, ['subtitulos']));
            const rs = rect(m, '#subtitulos');
            if (!rs || rs.top < -1 || rs.bottom > H + 1) malosM.push(`${W}px nivel ${i}: los subtítulos se salen de la pantalla`);
            for (const id of ['quest', 'inv', 'sys', 'stick', 'acts']) if (choca(rs, rect(m, '#' + id))) malosM.push(`${W}px nivel ${i}: los subtítulos tapan #${id}`);
            // Diálogo: el retrato y el nombre se ven enteros, no tapa los subtítulos y el texto largo se desplaza dentro de su caja
            m.q('dialog').hidden = false; m.q('toast').hidden = true;
            const dl = m.q('dialog').getBoundingClientRect(), pr = m.d.querySelector('.d-portrait').getBoundingClientRect(), wh = m.q('d-who').getBoundingClientRect();
            if (pr.top < -1 || wh.top < -1 || dl.right > W + 1 || dl.left < -1) malosM.push(`${W}px nivel ${i}: el diálogo se sale (retrato ${Math.round(pr.top)}, nombre ${Math.round(wh.top)})`);
            if (dl.height > H * 0.62) malosM.push(`${W}px nivel ${i}: el diálogo ocupa ${Math.round(dl.height / H * 100)} % de la pantalla`);
            const ds = m.d.querySelector('.d-say'); if (ds.scrollWidth > ds.clientWidth + 1) malosM.push(`${W}px nivel ${i}: el texto del diálogo desborda`);
            const sinRecorte = m.w.getComputedStyle(m.q('dialog')).overflowY;
            if (sinRecorte !== 'visible') malosM.push(`${W}px nivel ${i}: el diálogo recorta lo que sobresale (${sinRecorte})`);
            if (choca(rect(m, '#subtitulos'), dl) || m.d.querySelectorAll('.sub').length && [...m.d.querySelectorAll('.sub')].some(s => visible(s) && choca(s.getBoundingClientRect(), dl))) malosM.push(`${W}px nivel ${i}: los subtítulos tapan el diálogo`);
            notas2.push(`${i}: diálogo ${Math.round(dl.height)} px`);
            // Menú de pausa abierto
            m.q('dialog').hidden = true;
            const pz = m.q('pause'); pz.showPopover(); await espera(30);
            const rp = pz.getBoundingClientRect();
            if (pz.scrollWidth > pz.clientWidth + 1 || rp.left < -1 || rp.right > W + 1) malosM.push(`${W}px nivel ${i}: el menú mide ${pz.scrollWidth} px de ancho (caja ${Math.round(rp.width)})`);
            for (const b of pz.querySelectorAll('button, h2, h3, dd, p')) {
              if (!visible(b)) continue;
              const q2 = b.getBoundingClientRect();
              if (q2.width && (q2.left < rp.left - 1 || q2.right > rp.right + 1)) { malosM.push(`${W}px nivel ${i}: ${b.id || b.className || b.tagName} se sale del menú`); break; }
            }
            for (const b of pz.querySelectorAll('.pause-grid .btn, .a11y-chips .chip')) if (b.scrollWidth > b.clientWidth + 1) { malosM.push(`${W}px nivel ${i}: el botón «${b.textContent.trim()}» desborda`); break; }
            pz.hidePopover();
          } catch (e) { malosM.push(`${W}px nivel ${i}: ${e.message}`); }
          m.cerrar();
        }
        check(`Móvil ${W}×${H}: en los 3 niveles nada desborda ni se tapa (HUD, aviso, objetivo, botones, subtítulos, diálogo, gestos, menú)`, !malosM.length, malosM.slice(0, 4).join('; ') || notas2.join(' · '));
      }

      // 2. Modo zurdo: el joystick a la derecha y los botones de acción a la izquierda (teléfono vertical y horizontal)
      for (const [W, H] of [[375, 812], [412, 915], [812, 375]]) { // (a 320 px el joystick y los botones ya no caben uno al lado del otro, también sin zurdo)
        const malosZ = [];
        for (const zurdo of [false, true]) {
          const m = await maqueta(W, H, zurdo ? 'a11y-zurdo' : '');
          try {
            m.q('dialog').hidden = true; m.q('emotes').hidden = true; m.q('toast').hidden = true; m.q('subtitulos').hidden = true;
            const rS = rect(m, '#stick'), rA = rect(m, '#acts'), rJ = rect(m, '#b-jump'), rG = rect(m, '#b-act'), rF = rect(m, '#b-fly'), rD = rect(m, '#b-dash');
            const et = `${W}×${H} ${zurdo ? 'zurdo' : 'diestro'}`;
            if (!rS || !rA || !rJ || !rG) { malosZ.push(`${et}: faltan los controles`); continue; }
            for (const [n, r] of [['joystick', rS], ['botones', rA]]) if (r.left < -1 || r.right > W + 1 || r.bottom > H + 1 || r.top < -1) malosZ.push(`${et}: ${n} se sale de la pantalla`);
            if (choca(rS, rA)) malosZ.push(`${et}: el joystick y los botones se pisan`);
            for (const id of ['sys', 'quest', 'inv']) if (choca(rS, rect(m, '#' + id)) || choca(rA, rect(m, '#' + id))) malosZ.push(`${et}: los controles tapan #${id}`);
            if (zurdo) {
              if (!(rS.left > rA.left && rS.left > W / 2 - 1 && rA.left < W / 2)) malosZ.push(`${et}: el joystick no está a la derecha y los botones a la izquierda`);
              if (!(rG.left < rJ.left && rD.left < rF.left)) malosZ.push(`${et}: el botón grande de Acción no queda en la esquina de fuera`);
            } else if (!(rS.left < rA.left && rJ.left < rG.left)) malosZ.push(`${et}: la disposición de siempre cambió`);
            // Todos los botones de acción siguen siendo del tamaño táctil de siempre (≥ 44 px)
            for (const b of m.d.querySelectorAll('#acts .btn')) if (visible(b) && (b.getBoundingClientRect().width < 44 || b.getBoundingClientRect().height < 44)) malosZ.push(`${et}: «${b.textContent.trim()}» mide menos de 44 px`);
          } catch (e) { malosZ.push(`${W}×${H}: ${e.message}`); }
          m.cerrar();
        }
        check(`Modo zurdo ${W}×${H}: joystick a la derecha, botones a la izquierda, con el botón grande en la esquina de fuera; sin salirse ni pisarse`, !malosZ.length, malosZ.slice(0, 3).join('; '));
      }
      const chipZ = sec.querySelector('[data-a11y-bool="zurdo"]'), esTactil = !(matchMedia('(hover: hover) and (pointer: fine)').matches);
      check('El modo zurdo solo se ofrece en pantallas táctiles', (getComputedStyle(chipZ).display !== 'none') === esTactil, esTactil ? 'táctil' : 'ratón');

      // 3. Subtítulos con otros tamaños de pantalla (tableta, escritorio): no tapan el objetivo, el inventario ni los botones, ni el diálogo
      for (const [W, H] of [[812, 375], [800, 600], [1280, 720]]) {
        const malosS = [];
        for (const claves of ['', 'a11y-t2 a11y-contraste a11y-zurdo']) {
          const m = await maqueta(W, H, claves);
          try {
            m.q('toast').hidden = true; m.q('emotes').hidden = true;
            const et = `${W}×${H}${claves ? ' (texto muy grande)' : ''}`;
            m.q('dialog').hidden = true;
            const rs = rect(m, '#subtitulos');
            if (!rs || rs.left < -1 || rs.right > W + 1 || rs.top < -1 || rs.bottom > H + 1) malosS.push(`${et}: los subtítulos se salen de la pantalla`);
            for (const id of ['quest', 'inv', 'sys', 'stick', 'acts']) if (choca(rs, rect(m, '#' + id))) malosS.push(`${et}: los subtítulos tapan #${id}`);
            m.q('dialog').hidden = false;
            for (const s of m.d.querySelectorAll('.sub')) if (visible(s) && choca(s.getBoundingClientRect(), m.q('dialog').getBoundingClientRect())) { malosS.push(`${et}: los subtítulos tapan el diálogo`); break; }
          } catch (e) { malosS.push(`${W}×${H}: ${e.message}`); }
          m.cerrar();
        }
        check(`Subtítulos ${W}×${H}: dentro de la pantalla, sin tapar el objetivo, los botones ni el diálogo`, !malosS.length, malosS.slice(0, 3).join('; '));
      }

      // ---------- Guardado ----------
      set('texto', 2); set('contraste', true); set('subtitulos', true); set('relajado', true); set('zurdo', true);
      const d = JSON.parse(G.guardado.serialize(true)), a0 = d.profile && d.profile.a11y;
      check('La partida guardada lleva los ajustes', a0 && a0.texto === 2 && a0.contraste === true && a0.subtitulos === true && a0.relajado === true && a0.zurdo === true, JSON.stringify(a0));
      S.profile = Object.assign({}, perfil0, { a11y: { texto: 0, contraste: false } }); sync();
      check('Con todo apagado no queda ninguna clase puesta', !/a11y-/.test(raiz.className));
      S.profile = d.profile; G.emit('apply');
      check('Al cargar la partida se aplican los ajustes', ['a11y-t2', 'a11y-contraste', 'a11y-relajado', 'a11y-zurdo'].every(c => raiz.classList.contains(c)) && subtitulos());
      // «Comenzar de cero» (perfil nuevo, sin ajustes) y una partida vieja sin ajustes conservan lo elegido
      S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
      check('«Comenzar de cero» conserva texto, contraste, subtítulos, modo relajado y modo zurdo', ['a11y-t2', 'a11y-contraste', 'a11y-relajado', 'a11y-zurdo'].every(c => raiz.classList.contains(c)) && leer().texto === 2 && subtitulos());
      ultimo = null; S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
      check('Sin nada elegido en la sesión, una partida sin ajustes queda con todo apagado', !/a11y-/.test(raiz.className));
      S.profile = Object.assign({}, perfil0, { a11y: { texto: 9, contraste: 'sí', subtitulos: 1, relajado: 'true', zurdo: {} } }); sync();
      check('Un valor dañado vuelve a Normal y todo apagado', !/a11y-/.test(raiz.className));
    } catch (e) {
      check('Sin excepciones', false, e && e.message);
    } finally {
      S.profile = perfil0; ultimo = ultimo0; escala = 1; G.audio.vol.muted = mudo0; limpiar(); sync(); guardarAlCambiar = true;
      try { G.fx.guide(null, 0); } catch (e) { /* sin guía */ }
      try { if (menu && !abierto0 && menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
    }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  const subtitulos = () => leer().subtitulos, relajado = () => leer().relajado, zurdo = () => leer().zurdo;
  return { leer, set, sync, subtitulos, relajado, zurdo, subtitular, SUB, maqueta, rect, test };
});
