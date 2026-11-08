/* Juego · Ajustes de accesibilidad (sección «Accesibilidad» del menú de pausa)
   - Tamaño de texto en 3 niveles: Normal, Grande (×1,15) y Muy grande (×1,3). Escala los tokens --fs-* de la interfaz.
   - Alto contraste: superficies negras opacas, texto blanco, papel blanco con tinta negra y bordes visibles.
   - Subtítulos de sonido: lluvia, trueno, río, martillazos, BIP del transmisor, coquíes y el resto de los sonidos de la historia, en ES y EN,
     arriba y al centro (el diálogo va abajo). Se enganchan a G.audio.alSonar (src/engine/audio.js): salen suene o no el sonido (sonido
     apagado, sin altavoces). El Simon de los coquíes sigue con su nota «[Canta un coquí…]» en la tarjeta.
   - Modo relajado: la flecha de guía (src/engine/fx.js) siempre se ve, más grande y de cerca, el haz brilla más y el objetivo del móvil
     no se corta. El capítulo no tiene tiempos; los modos con reloj (Modo Retos, src/game/retos.js) pueden leer G.accesibilidad.relajado().
   - Modo zurdo (solo pantalla táctil): el joystick pasa a la derecha y los botones de acción a la izquierda (CSS, sin tocar input.js).
   - CG-54: subtítulos del pío del escondite («¡Pío cerca!») y del coquí vecino, además del trueno que ya estaba.
     Modo daltonismo: solo las pistas (flecha, anillo, chip de truco) cambian de color y de trama. El mundo y las cotorras no.
     Una mano (táctil): joystick, volar y trucos juntos en el lado del pulgar. Los botones de un módulo nuevo pueden usar .a11y-controles-extra.
   Se guardan en la partida (S.profile.a11y = { texto: 0|1|2, contraste, subtitulos, relajado, zurdo, daltonismo, unamano }) y se aplican al cargar o reiniciar.
   «Comenzar de cero» (y cargar una partida vieja, sin ajustes) conserva lo elegido en esta sesión; «Nuevo estudiante» lo olvida.
   Pinta clases en <html>: a11y-t1 / a11y-t2 / a11y-contraste / a11y-relajado / a11y-zurdo / a11y-daltonismo / a11y-unamano (estilos en src/ui/ui.css, sección 7b).
   API: leer(), set(clave, valor), subtitulos(), relajado(), zurdo(), daltonismo(), unaMano(), subtitular(nombre, arg), maqueta(ancho, alto, clases) + rect() (pruebas de
   maquetación móvil de cualquier módulo: un iframe con el HUD y las hojas de estilo reales).
   PRUEBAS: G.accesibilidad.test() (AV.accesibilidadTest) comprueba niveles, contraste, subtítulos, modo relajado, modo zurdo, daltonismo, una mano, guardado y, en
   una maqueta móvil (iframe con las hojas de estilo reales y copias del HUD: 375×812, 390×844, 320×568, 812×375…), que nada desborda ni se tapa
   (tampoco el aviso sobre los botones táctiles), que el tamaño de texto sobrevive a recargar la partida y el remapeo de teclas de
   src/engine/input.js (mover de verdad, impulso/poder, volar, acción, mapa, choque, tecla fija, pistas, guardado y Restablecer). */
AVE.module('accesibilidad', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, raiz = document.documentElement;
  const NIVELES = 3;
  const BOOLS = ['contraste', 'subtitulos', 'relajado', 'zurdo', 'daltonismo', 'unamano'];
  const esObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const TX = () => ({
    titulo: L('Accesibilidad', 'Accessibility'), texto: L('Texto', 'Text'),
    niveles: [L('Normal', 'Normal'), L('Grande', 'Large'), L('Muy grande', 'Extra large')],
    bool: { contraste: L('Alto contraste', 'High contrast'), subtitulos: L('Subtítulos de sonido', 'Sound captions'),
      relajado: L('Modo relajado', 'Relaxed mode'), zurdo: L('Modo zurdo', 'Left-handed mode'),
      daltonismo: L('Daltonismo', 'Colorblind cues'), unamano: L('Una mano', 'One hand') },
    notaRelajado: L('Modo relajado: la flecha de guía siempre se ve y el capítulo no tiene tiempos.', 'Relaxed mode: the guide arrow is always visible and the chapter has no timers.'),
    notaZurdo: L('Modo zurdo (pantalla táctil): el joystick pasa a la derecha y los botones de acción a la izquierda.', 'Left-handed mode (touch screens): the joystick moves to the right and the action buttons to the left.'),
    notaDaltonismo: L('Pistas para daltonismo: la flecha y los anillos cambian de color y de trama. El mundo y las cotorras siguen igual.', 'Colorblind cues: the arrow and the rings change color and pattern. The world and the parrots stay the same.'),
    notaMano: L('Una mano (pantalla táctil): el joystick, volar y los trucos quedan juntos, en el lado del pulgar.', 'One hand (touch screens): the joystick, fly and the tricks sit together, on the thumb side.'),
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
    // CG-54. El pío del escondite trae la cercanía (0 lejos … 1 encima) en el argumento de G.audio.play.
    pio_escondite: { ms: 1600, umbral: 0.55, es: '[¡Pío!]', en: '[Peep!]', cercaEs: '[¡Pío cerca!]', cercaEn: '[Peep nearby!]' },
    vecino_coqui: { ms: 2200, es: '[¡Coquí!]', en: '[Coquí!]' },
  };
  // Esos dos sonidos los definen escondite.js y vecinos.js al primer gesto. Si aún no están, un silencio
  // ocupa el nombre para que el subtítulo pueda salir; el módulo dueño lo reemplaza al cargar.
  for (const n of ['pio_escondite', 'vecino_coqui']) {
    if (G.audio && G.audio.define && !G.audio.has(n)) {
      try { G.audio.define(n, () => {}); } catch (e) { /* el módulo del sonido lo pone al cargar */ }
    }
  }
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
  const vivos = new Map(); // clave → { el, t, origen }
  const pendientes = []; // subtítulos con retraso: el texto se arma al mostrarse, no al programarse
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
  function cancelarPendientes() {
    for (const p of pendientes) clearTimeout(p.t);
    pendientes.length = 0;
  }
  function limpiar() { cancelarPendientes(); for (const k of [...vivos.keys()]) quitar(k); cont.hidden = true; }
  function textoDe(d, arg) {
    if (d.umbral != null && typeof arg === 'number' && arg >= d.umbral && d.cercaEs) return L(d.cercaEs, d.cercaEn);
    return L(d.es, d.en);
  }
  // El idioma se lee aquí, en el momento de pintar. Un cambio de idioma no deja el texto que había al programar el retraso.
  function textoAhora(d, arg) {
    if (d.nota) {
      if (!vivos.has('coqui')) notas = [];
      notas.push(d.nota); if (notas.length > 7) notas.shift();
      return { texto: L(`[Un coquí canta: ${notas.join(' · ')}]`, `[A coquí frog sings: ${notas.join(' · ')}]`), origen: { nota: true, notas: notas.slice() } };
    }
    return { texto: textoDe(d, arg), origen: { d, arg } };
  }
  function textoDeOrigen(origen) {
    if (!origen) return '';
    if (origen.nota) return L(`[Un coquí canta: ${origen.notas.join(' · ')}]`, `[A coquí frog sings: ${origen.notas.join(' · ')}]`);
    return textoDe(origen.d, origen.arg);
  }
  function refrescarSubs() {
    for (const v of vivos.values()) {
      const texto = textoDeOrigen(v.origen);
      if (texto && v.el.textContent !== texto) v.el.textContent = texto;
    }
  }
  function mostrar(k, texto, ms, origen) {
    let v = vivos.get(k);
    if (!v) {
      const el = document.createElement('p'); el.className = 'sub'; el.dataset.k = k; el.textContent = texto;
      cont.appendChild(el); v = { el, t: 0, origen }; vivos.set(k, v);
      while (vivos.size > MAXIMO) quitar(vivos.keys().next().value);
      colocar();
    } else {
      v.origen = origen;
      if (v.el.textContent !== texto) v.el.textContent = texto;
    }
    cont.hidden = false;
    clearTimeout(v.t); v.t = setTimeout(() => quitar(k), ms * escala);
  }
  // Lo llama G.audio.play (src/engine/audio.js) con cada sonido; devuelve true si hay subtítulo para él y están activados.
  // Con retraso (el BIP suena después del coro) el texto se resuelve al salir, no al programar el temporizador.
  function subtitular(nombre, arg) {
    const d = SUB[nombre];
    if (!d || !leer().subtitulos) return false;
    const salir = () => {
      if (!leer().subtitulos) return;
      const hecho = textoAhora(d, arg);
      mostrar(d.k || nombre, hecho.texto, d.ms, hecho.origen);
    };
    if (!d.retraso) { salir(); return true; }
    const p = {};
    p.t = setTimeout(() => {
      const i = pendientes.indexOf(p); if (i >= 0) pendientes.splice(i, 1);
      salir();
    }, d.retraso * escala);
    pendientes.push(p);
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
      <button class="chip a11y-solo-tactil" type="button" data-a11y-bool="zurdo" aria-describedby="a11y-nota-zurdo"></button>
      <button class="chip" type="button" data-a11y-bool="daltonismo" aria-describedby="a11y-nota-daltonismo"></button>
      <button class="chip a11y-solo-tactil" type="button" data-a11y-bool="unamano" aria-describedby="a11y-nota-mano"></button></div>
      <p class="note" id="a11y-nota-relajado"></p><p class="note a11y-solo-tactil" id="a11y-nota-zurdo"></p>
      <p class="note" id="a11y-nota-daltonismo"></p><p class="note a11y-solo-tactil" id="a11y-nota-mano"></p>`;
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
    sec.querySelector('#a11y-nota-daltonismo').textContent = T.notaDaltonismo;
    sec.querySelector('#a11y-nota-mano').textContent = T.notaMano;
    const tonel = $('b-tonel'), loop = $('b-loop');
    if (tonel) tonel.textContent = L('Tonel', 'Roll');
    if (loop) loop.textContent = L('Loop', 'Loop');
  }
  function pedirTruco(id) {
    if (G.trucos && G.trucos.anotar) G.trucos.anotar(id);
  }
  function montarTrucos() {
    const acts = $('acts'); if (!acts || $('b-tonel')) return;
    const hacer = (id, truco) => {
      const el = document.createElement('button');
      el.id = id; el.type = 'button'; el.className = 'btn round a11y-truco'; el.hidden = true;
      el.addEventListener('pointerdown', e => { e.preventDefault(); pedirTruco(truco); });
      acts.appendChild(el);
    };
    hacer('b-tonel', 'tonel'); hacer('b-loop', 'looping');
  }
  function sync() {
    const a = leer();
    for (let i = 1; i < NIVELES; i++) raiz.classList.toggle('a11y-t' + i, a.texto === i);
    for (const k of BOOLS) raiz.classList.toggle('a11y-' + k, a[k]);
    if (!a.subtitulos) limpiar();
    const tonel = $('b-tonel'), loop = $('b-loop');
    if (tonel) tonel.hidden = !a.unamano;
    if (loop) loop.hidden = !a.unamano;
    if (!sec) return;
    sec.querySelectorAll('[data-a11y-texto]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.a11yTexto === a.texto)));
    sec.querySelectorAll('[data-a11y-bool]').forEach(b => b.setAttribute('aria-pressed', String(a[b.dataset.a11yBool])));
  }

  montar(); montarTrucos(); rotular(); sync();
  // Cargar, reiniciar o restaurar una partida: se aplican sus ajustes; si la partida no trae (nueva o vieja), quedan los de la sesión
  G.on('apply', () => {
    const p = S.profile || {};
    if (esObj(p.a11y)) ultimo = leer();
    else if (ultimo) S.profile = Object.assign({}, p, { a11y: Object.assign({}, ultimo) });
    sync();
  }, 50);
  G.on('nuevoEstudiante', () => { ultimo = null; }); // equipo compartido: el siguiente niño empieza sin ajustes
  G.on('aula', k => { if (k === 'idioma') { rotular(); refrescarSubs(); } });

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
  // En un SVG className es un SVGAnimatedString. Sin baseVal el fallo dice «path.[object SVGAnimatedString]».
  const clsDe = e => { const c = e && e.className; if (c && typeof c.baseVal === 'string') return c.baseVal; return typeof c === 'string' ? c : ''; };
  const nomEl = e => e.id ? '#' + e.id : e.tagName.toLowerCase() + (clsDe(e).trim() ? '.' + clsDe(e).trim().split(/\s+/)[0] : '');
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
      if (visible(e) && e.scrollWidth > e.clientWidth + 1) malos.push(`${etiqueta}: ${e.id ? '#' + e.id : clsDe(e) || e.tagName} desborda su caja (${e.scrollWidth} > ${e.clientWidth})`);
    }
    return malos;
  }


  // BM37: maqueta de las pantallas grandes (creador, Diario y Retos) con sus hojas de estilo y un contenido de ejemplo del peor caso
  async function maquetaPantallas(ancho, alto, clases) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = `position:fixed;left:-10000px;top:0;width:${ancho}px;height:${alto}px;border:0;`;
    const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
    const estilos = [...document.querySelectorAll('head style')].map(e => e.outerHTML).join('');
    const creator = $('creator') ? $('creator').outerHTML : '';
    const retos = $('retos') ? $('retos').outerHTML : '';
    const slot = (n, nombre) => `<div class="slot" data-slot="${n}"><div class="sname">${nombre}<small>Sombrero de ala ancha</small></div><div class="opts"><div class="thumbs"><button class="thumb" type="button" data-act="none" aria-pressed="true">Nada</button><button class="thumb" type="button" aria-label="Gorra"><span></span></button><button class="thumb" type="button" aria-label="Sombrero"><span></span></button></div><div class="styles"><button class="chip" type="button" aria-pressed="true">Clásico</button><button class="chip" type="button" aria-pressed="false">Con cinta</button></div><div class="swatches"><button class="swatch" type="button" aria-label="Color rojo"></button><button class="swatch" type="button" aria-label="Color azul"></button></div></div></div>`;
    const cardHtml = '<h2>Diario de campo</h2><p class="note">3/12 · Fauna 2/6 · Plantas 1/6</p><ul class="diary"><li class="found"><span class="ico fauna" aria-hidden="true"></span><div><b>Coquí común</b><small>Canta «co-quí» al anochecer y vive en las hojas del bosque lluvioso de El Yunque.</small></div></li><li><span class="ico" aria-hidden="true"></span><div><b>???</b><small>Algo por descubrir</small></div></li></ul><details class="especies"><summary class="lbl lbl-especies">Especies <small>12 especies</small></summary></details><span class="lbl">Ropa desbloqueable</span><ul class="ropa"><li>· Sombrero <small>(pista)</small></li></ul><div class="row"><button class="btn ghost" id="d-close" type="button">Cerrar</button></div>';
    f.srcdoc = `<!doctype html><html lang="es" class="${clases}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}${estilos}` +
      '<style>*, *::before, *::after { animation: none !important; transition: none !important; }</style></head>' +
      `<body>${creator}<div id="card" class="hud paper"></div>${retos}</body></html>`;
    document.body.appendChild(f);
    await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
    const d = f.contentDocument;
    try { await Promise.race([d.fonts.ready, espera(2500)]); } catch (e) { /* sin fuentes */ }
    const q = id => d.getElementById(id);
    // Cada pantalla se pone una detrás de otra en su propia caja visible (no se tapan: se miden por separado con la caja a pantalla completa)
    if (q('creator')) { q('creator').hidden = false; if (q('p-slots')) q('p-slots').innerHTML = slot('head', 'Cabeza') + slot('eyes', 'Ojos'); if (q('p-error')) q('p-error').hidden = true; }
    q('card').innerHTML = cardHtml; q('card').hidden = false;
    const menu = d.querySelector('#retos .rt-menu'); if (menu) { q('retos').hidden = false; menu.hidden = false; }
    return { f, d, w: f.contentWindow, q, cerrar: () => f.remove() };
  }
  // BM53: maqueta de las demás pantallas (pausa, final del capítulo, cómic, criadero, Aula, mapa grande, menú de modos y minijuegos) con una
  // copia de su DOM real y de todas las hojas de estilo; cada una se muestra entera (todo lo oculto a la vista) para medir el peor caso
  const PANTALLAS = ['title', 'records', 'pause', 'end', 'comic', 'criadero', 'maestro', 'mapa-grande', 'modos', 'flight', 'maze', 'riverrush'];
  // Los módulos que montan su pantalla al abrirla (mapa grande, Aula, criadero, minijuegos) se abren y se cierran una vez para tener su DOM
  const copias = new Map(), sinPantalla = [];
  async function prepararOtras() {
    const AVg = window.AV || {}, cargaMini = () => (G.minimapa ? Promise.resolve(G.minimapa) : AVE.assets.script('src/game/minimapa.js').then(() => window.AVMinimapa(G)));
    const abre = {
      'mapa-grande': [async () => { const m = await cargaMini(); await espera(300); return m.abrir(); }, () => G.minimapa && G.minimapa.cerrar()],
      records: [() => G.recordsApi && G.recordsApi.abrir({}), () => G.recordsApi && G.recordsApi.cerrar()],
      criadero: [() => G.criadero && G.criadero.abrir(), () => G.criadero && G.criadero.cerrar()],
      maestro: [() => G.aula && G.aula.abrirMaestro(), () => G.aula && G.aula.cerrarMaestro()],
      flight: [() => AVg.flight && AVg.flight(), () => G.flightApi && G.flightApi.salir()],
      maze: [() => AVg.maze && AVg.maze(), () => G.mazeApi && G.mazeApi.salir()],
      riverrush: [() => AVg.riverRush && AVg.riverRush(), () => G.riverRushApi && G.riverRushApi.salir()],
    };
    // La chapa «Lo último que jugaste» solo existe si hay un modo recordado. Se pone para medirla (en español no cabe en la tarjeta) y se quita después.
    const pack = G.pack || {}, claveMenu = ((pack.meta && pack.meta.almacen) || pack.id || 'cap1') + '.menu';
    let menuPrev;
    try {
      menuPrev = localStorage.getItem(claveMenu);
      localStorage.setItem(claveMenu, JSON.stringify({ v: 1, ultimo: 'aventura' }));
      if (G.menuModos && G.menuModos.mostrar) G.menuModos.mostrar();
    } catch (e) { /* sin almacén */ }
    // «Mis récords» con su sección V18 llena (minigolf, Chispa, Moon, Guardián, duelos por etapa, niveles y alianzas): datos de ejemplo en una
    // clave aparte de la real, que se quita al copiar
    const RA = G.recordsApi, k18 = RA && RA.CLAVE && RA.CLAVE.v18;
    if (k18 && !copias.has('records')) {
      const datos18 = { v: 2, especies: { arausiaca: 'seleccionable', agilis: 'seleccionable' }, inv: {}, otorgados: { combate_1: true, duelo_gana_vittata: true, duelo_gana_arausiaca: true }, sel: 'vittata',
        mundo: { minigolf_villa: { mejor: 3, medalla: 'oro' }, carrera_chispa: { mejor: 41300, ganadas: 2, jugadas: 5, xp: true }, entreno_moon: { mejor: 0, victorias: 1, jugadas: 4, xp: true }, circuito_guardian: { mejor: 75250, vueltas: 3, jugadas: 3, xp: true }, duelos_ganados: 4, duelos_ganados_e0: 3, duelos_ganados_e2: 1, puente_villa: 'reparado' },
        evo: { esp: { vittata: { xp: 553, nivel: 12, mejoras: {}, variante: null }, arausiaca: { xp: 1540, nivel: 21, mejoras: {}, variante: null }, agilis: { xp: 0, nivel: 1, mejoras: {}, variante: null } }, alianzas: { eco_protector: 'desbloqueada', lluvia_guiada: 'disponible' }, alianzaSel: 'eco_protector', marcas: {}, dia: { fecha: '', por: {} }, retro: true } };
      RA.CLAVE.v18 = k18 + '.a11y';
      try {
        localStorage.setItem(RA.CLAVE.v18, JSON.stringify(datos18));
        await abre.records[0](); await espera(600);
        if ($('records') && $('records').querySelector('#rec-v18')) copias.set('records', $('records').outerHTML);
        await abre.records[1](); await espera(200);
      } catch (e) { sinPantalla.push('records V18: ' + e.message); } finally {
        try { localStorage.removeItem(RA.CLAVE.v18); } catch (e) { /* sin almacén */ }
        RA.CLAVE.v18 = k18;
      }
    }
    for (const id of PANTALLAS) {
      if ($(id) && !copias.has(id)) copias.set(id, $(id).outerHTML);
      else if (!$(id) && abre[id]) {
        try { await abre[id][0](); await espera(900); } catch (e) { sinPantalla.push(id + ': ' + e.message); }
        if ($(id)) copias.set(id, $(id).outerHTML);
        try { await abre[id][1](); await espera(200); } catch (e) { /* ya cerrada */ }
      }
    }
    try {
      if (menuPrev == null) localStorage.removeItem(claveMenu); else localStorage.setItem(claveMenu, menuPrev);
      if (G.menuModos && G.menuModos.mostrar) G.menuModos.mostrar();
    } catch (e) { /* sin almacén */ }
  }
  async function maquetaOtras(ancho, alto, clases) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = `position:fixed;left:-10000px;top:0;width:${ancho}px;height:${alto}px;border:0;`;
    const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
    const estilos = [...document.querySelectorAll('style')].map(e => e.outerHTML).join('');
    const hay = PANTALLAS.filter(id => copias.has(id));
    f.srcdoc = `<!doctype html><html lang="es" class="${clases}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}${estilos}` +
      '<style>*, *::before, *::after { animation: none !important; transition: none !important; }</style></head>' +
      `<body>${hay.map(id => copias.get(id)).join('')}</body></html>`;
    document.body.appendChild(f);
    await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
    const d = f.contentDocument;
    if (!d) return { f, d: null, w: f.contentWindow, hay, cerrar: () => f.remove() };
    try { await Promise.race([d.fonts.ready, espera(2500)]); } catch (e) { /* sin fuentes */ }
    for (const id of hay) {
      const e = d.getElementById(id); if (!e) continue;
      e.removeAttribute('popover'); e.hidden = false;
      for (const h of e.querySelectorAll('[hidden]')) if (!h.closest('#end-confirm, #confirm-reset')) h.hidden = false;
      if (id === 'pause') e.style.display = 'block';
    }
    return { f, d, w: f.contentWindow, hay, cerrar: () => f.remove() };
  }
  function cajaDe(m, pid) {
    if (!m || !m.d || !m.d.getElementById) return null;
    return m.d.getElementById(pid);
  }
  // BM83: dos controles visibles (botones, selectores, resúmenes) no se pisan entre sí; devuelve las parejas que se solapan más de 4 px
  // Los pies «pegajosos» (Cerrar del Diario, Empezar del creador) se superponen al contenido que se desliza por debajo: eso es lo normal, no un solape
  const enPegajoso = b => { for (let n = b; n && n.nodeType === 1; n = n.parentElement) if (/sticky|fixed/.test(n.ownerDocument.defaultView.getComputedStyle(n).position)) return true; return false; };
  function solapes(raiz) {
    const bs = [...raiz.querySelectorAll('button, select, input:not([type=hidden]), summary, a[href]')].filter(b => visible(b) && b.getBoundingClientRect().width && !b.closest('.maestro-scroll, .cr-hatch, .cr-skip, .cr-globo, [aria-hidden="true"]') && !enPegajoso(b));
    const mal = [];
    for (let a = 0; a < bs.length; a++) for (let c = a + 1; c < bs.length; c++) {
      if (bs[a].contains(bs[c]) || bs[c].contains(bs[a])) continue;
      const A = bs[a].getBoundingClientRect(), B = bs[c].getBoundingClientRect();
      if (Math.min(A.right, B.right) - Math.max(A.left, B.left) > 4 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 4) mal.push([bs[a], bs[c]]);
    }
    return mal;
  }
  const nombreB = b => (b.getAttribute('aria-label') || b.textContent || b.id || clsDe(b)).trim().slice(0, 14);
  // Contraste (WCAG) del texto de un elemento contra su fondo opaco más cercano
  function contrasteDe(e) {
    const w = e.ownerDocument.defaultView;
    const rgba = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
    const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    let fondo = [255, 255, 255];
    const capas = [];
    for (let n = e; n; n = n.parentElement) { const c = rgba(w.getComputedStyle(n).backgroundColor); if (c[3] > 0) capas.push(c); if (c[3] >= 1) break; }
    for (let k = capas.length - 1; k >= 0; k--) { const c = capas[k]; fondo = fondo.map((v, j) => c[j] * c[3] + v * (1 - c[3])); }
    const t = rgba(w.getComputedStyle(e).color), txt = [0, 1, 2].map(j => t[j] * t[3] + fondo[j] * (1 - t[3]));
    const a = lum(txt), b = lum(fondo);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  async function test(o) {
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const perfil0 = S.profile, ultimo0 = ultimo, mudo0 = G.audio.vol.muted, abierto0 = (() => { try { return menu.matches(':popover-open'); } catch (e) { return false; } })();
    const ajIdi = G.aula && G.aula.aj, idi0 = ajIdi ? ajIdi.idioma : null;
    // Asignar aj.idioma a mano deja el traductor (G.idioma) en el idioma de arranque. Con la partida en inglés,
    // ese observador reescribe el subtítulo en español en cuanto pasa un rato: el BIP, que espera, sale en inglés.
    const ponerIdioma = async id => {
      if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', id);
      else if (ajIdi) ajIdi.idioma = id;
      if (!(G.aula && G.aula.setAjuste) && G.idioma && G.idioma.poner) await G.idioma.poner(id);
      if (G.idioma && G.idioma.listo) await G.idioma.listo;
    };
    if (o && (o.idioma === 'en' || o.idioma === 'es')) await ponerIdioma(o.idioma);
    guardarAlCambiar = false;
    try {
      check('Sección «Accesibilidad» en el menú de pausa: texto, contraste, subtítulos, relajado, zurdo, daltonismo y una mano',
        !!sec && sec.querySelectorAll('[data-a11y-texto]').length === 3 && BOOLS.every(k => !!sec.querySelector(`[data-a11y-bool="${k}"]`)));
      check('Los ajustes nuevos están apagados de entrada', (() => { S.profile = Object.assign({}, perfil0, { a11y: undefined }); const a = leer(); return a.texto === 0 && BOOLS.every(k => a[k] === false); })());
      check('QA-97 · sin documento o sin caja no se llama a querySelectorAll', (() => {
        try {
          const vacia = cajaDe(null, 'pause');
          const sinCaja = cajaDe({ d: { getElementById() { return null; } } }, 'pause');
          if (vacia) vacia.querySelectorAll('button');
          if (sinCaja) sinCaja.querySelectorAll('button');
          return vacia == null && sinCaja == null;
        } catch (e) { return false; }
      })());

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
      // Cada caso tiene su nombre: si falla, se ve el idioma y el sonido. /BIP/ también casa con BEEP, así que el español pide la frase entera.
      const FRASE = {
        es: { lluvia: /llueve/i, trueno: /trueno/i, crecida: /r[ií]o crece/i, construir: /martillazos/i, chorus: /coro de coqu/i, bip: /suena el transmisor/, pio: /¡Pío!/, cerca: /¡Pío cerca!/, lejosNo: /cerca/, coqui: /\[¡Coquí!\]/ },
        en: { lluvia: /rain falls/i, trueno: /thunder/i, crecida: /river rises/i, construir: /hammer/i, chorus: /chorus of coqu/i, bip: /the transmitter sounds/, pio: /Peep!/, cerca: /Peep nearby/i, lejosNo: /nearby/i, coqui: /\[Coquí!\]/ },
      };
      for (const id of ['es', 'en']) {
        await ponerIdioma(id);
        const F = FRASE[id];
        escala = 50;
        for (const n of ['lluvia', 'trueno', 'crecida', 'construir', 'chorus']) {
          limpiar(); G.audio.play(n);
          check(`Subtítulo ${id} · ${n}`, F[n].test(cont.textContent) && !cont.hidden, cont.textContent);
        }
        // El retraso real es 0,9 s; aquí se acorta. Una sola espera, más larga que ese retraso: si el hilo estuvo
        // ocupado, los temporizadores salen en orden y el subtítulo ya está pintado cuando miramos.
        limpiar(); escala = 0.2; G.audio.play('bip');
        await espera(400);
        check(`Subtítulo ${id} · bip`, F.bip.test(cont.textContent), cont.textContent || '(vacío)');
        escala = 50; limpiar();
        G.audio.play('pio_escondite', 0.2); const lejosP = cont.textContent;
        G.audio.play('pio_escondite', 0.9);
        check(`Subtítulo ${id} · pío`, cont.children.length === 1 && F.pio.test(lejosP) && !F.lejosNo.test(lejosP) && F.cerca.test(cont.textContent), (lejosP || '(vacío)') + ' → ' + (cont.textContent || '(vacío)'));
        limpiar(); G.audio.play('vecino_coqui');
        check(`Subtítulo ${id} · coquí`, F.coqui.test(cont.textContent), cont.textContent || '(vacío)');
      }
      // El BIP se programa en español y el idioma pasa a inglés antes de que salga. El cambio es síncrono
      // (esperar al diccionario puede durar más que el subtítulo) y la espera es más larga que el retraso.
      await ponerIdioma('es');
      escala = 0.2; limpiar();
      G.audio.play('bip');
      if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', 'en'); else if (ajIdi) ajIdi.idioma = 'en';
      await espera(400);
      check('Subtítulo en · bip pendiente', /the transmitter sounds/.test(cont.textContent) && !/suena el transmisor/.test(cont.textContent), cont.textContent || '(vacío)');
      await ponerIdioma(idi0 === 'en' ? 'en' : 'es');
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
      await ponerIdioma(idi0 === 'en' ? 'en' : 'es');
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

      // ---------- CG-54: daltonismo, solo en las pistas ----------
      const lejosD = { x: S.pos.x + 12, z: S.pos.z };
      set('daltonismo', false); G.fx.guide(lejosD, 0);
      const hex0 = G.fx.guideArrow.material.color.getHex(), wire0 = G.fx.guideArrow.material.wireframe, haz0 = G.fx.guideBeam.material.color.getHex();
      set('daltonismo', true); G.fx.guide(lejosD, 0);
      const hex1 = G.fx.guideArrow.material.color.getHex(), wire1 = G.fx.guideArrow.material.wireframe, haz1 = G.fx.guideBeam.material.color.getHex();
      const filtroCuerpo = getComputedStyle(document.body).filter, filtroLienzo = G.renderer && G.renderer.canvas ? getComputedStyle(G.renderer.canvas).filter : 'none';
      const sinFiltro = (filtroCuerpo === 'none' || filtroCuerpo === '') && (filtroLienzo === 'none' || filtroLienzo === '');
      const pm = $('pm-pista'); let pistaOk = false, pistaExtra = 'sin #pm-pista';
      if (pm) {
        const ocultoPm = pm.hidden; pm.hidden = false; pm.classList.remove('pm-atascado');
        const azul = getComputedStyle(pm).borderTopColor;
        const centroVacio = el => { const cs = getComputedStyle(el); return (cs.backgroundImage === 'none' || cs.backgroundImage === '') && /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(cs.backgroundColor); };
        const v1 = centroVacio(pm);
        pm.classList.add('pm-atascado');
        const naranja = getComputedStyle(pm).borderTopColor, trama = getComputedStyle(pm).borderTopStyle, v2 = centroVacio(pm);
        const rgb = s => (String(s).match(/[\d.]+/g) || []).map(Number);
        const a = rgb(azul), b = rgb(naranja);
        pistaOk = a.length >= 3 && b.length >= 3 && a[2] > a[0] && b[0] > b[2] && trama === 'dashed' && v1 && v2;
        pistaExtra = `anillo ${azul} / atascado ${naranja} ${trama} / centro ${v1 && v2 ? 'vacío' : 'relleno'}`;
        pm.classList.remove('pm-atascado'); pm.hidden = ocultoPm;
      }
      G.fx.guide(null, 0); set('daltonismo', false); G.fx.guide(lejosD, 0); G.fx.guide(null, 0);
      check('Daltonismo: la flecha pasa a azul en alambre y el haz a bermellón; al quitarlo vuelven al naranja',
        hex0 === 0xf2a03d && !wire0 && haz0 === 0xfff1b0 && hex1 === 0x0072b2 && wire1 && haz1 === 0xd55e00 && G.fx.guideArrow.material.color.getHex() === 0xf2a03d && !G.fx.guideArrow.material.wireframe,
        hex0.toString(16) + '→' + hex1.toString(16) + ' haz ' + haz0.toString(16) + '→' + haz1.toString(16));
      check('Daltonismo: el anillo es azul y, si te atascas, el borde es naranja discontinuo; el centro queda vacío', pistaOk, pistaExtra);
      check('Daltonismo no tiñe el mundo ni a las cotorras', sinFiltro && raiz.classList.contains('a11y-daltonismo') === false, filtroCuerpo + ' / ' + filtroLienzo);

      // ---------- Maqueta móvil ----------
      const COLOCADOS = ['quest', 'inv', 'sys', 'toast', 'prompt', 'emotes', 'stick', 'acts'];
      // 1. Teléfono (375×812, 390×844) y el más pequeño (320×568), 3 niveles de texto, con alto contraste, relajado y subtítulos a la vista
      for (const [W, H] of [[375, 812], [390, 844], [320, 568]]) {
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
            // El aviso y el aviso de acción no tapan el joystick ni los botones táctiles (con la letra más grande se parten en líneas)
            for (const [a, b] of [['#toast', '#acts'], ['#toast', '#stick'], ['#prompt', '#acts'], ['#prompt', '#stick']]) if (choca(rect(m, a), rect(m, b))) malosM.push(`${W}px nivel ${i}: ${a} tapa ${b}`);
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
              if (q2.width && (q2.left < rp.left - 1 || q2.right > rp.right + 1)) { malosM.push(`${W}px nivel ${i}: ${b.id || clsDe(b) || b.tagName} se sale del menú`); break; }
            }
            for (const b of pz.querySelectorAll('.pause-grid .btn, .a11y-chips .chip')) if (b.scrollWidth > b.clientWidth + 1) { malosM.push(`${W}px nivel ${i}: el botón «${b.textContent.trim()}» desborda`); break; }
            pz.hidePopover();
          } catch (e) { malosM.push(`${W}px nivel ${i}: ${e.message}`); }
          m.cerrar();
        }
        check(`Móvil ${W}×${H}: en los 3 niveles nada desborda ni se tapa (HUD, aviso, objetivo, botones táctiles, subtítulos, diálogo, gestos, menú)`, !malosM.length, malosM.slice(0, 4).join('; ') || notas2.join(' · '));
      }

      // 1b. BM37: creador, Diario y Retos a 375×812 (y 320×568): botones de 44 px como mínimo, nada desborda en los 3 tamaños de texto y,
      // con alto contraste, el texto se lee (≥ 7:1 sobre su fondo)
      for (const [W, H] of [[375, 812], [390, 844], [320, 568]]) {
        const malosP = [];
        for (let i = 0; i < NIVELES; i++) for (const contr of [false, true]) {
          const m = await maquetaPantallas(W, H, `${i ? 'a11y-t' + i : ''} ${contr ? 'a11y-contraste' : ''}`);
          try {
            for (const [pid, raizSel] of [['creator', '#creator'], ['card', '#card'], ['retos', '#retos .rt-menu']]) {
              const cajaP = m.d.querySelector(raizSel); if (!cajaP) { if (pid === 'retos') continue; malosP.push(`${pid} no está en la maqueta`); continue; }
              const et = `${W}px nivel ${i}${contr ? ' contraste' : ''} ${pid}`;
              for (const b of cajaP.querySelectorAll('button, select, input, summary, a[href]')) {
                if (!visible(b) || b.closest('.rt-fin')) continue;
                const r = b.getBoundingClientRect();
                if (r.width && (r.width < 43.5 || r.height < 43.5)) malosP.push(`${et}: «${(b.getAttribute('aria-label') || b.textContent || b.id || clsDe(b)).trim().slice(0, 18)}» mide ${Math.round(r.width)}×${Math.round(r.height)}`);
              }
              if (cajaP.scrollWidth > cajaP.clientWidth + 1) { const cr = cajaP.getBoundingClientRect(); const culpa = [...cajaP.querySelectorAll('*')].filter(e => visible(e) && e.getBoundingClientRect().right > cr.left + cajaP.clientWidth + 1).slice(0, 2).map(nomEl).join(','); malosP.push(`${et}: desborda (${cajaP.scrollWidth} > ${cajaP.clientWidth}) por ${culpa}`); }
              for (const [x, y] of solapes(cajaP)) malosP.push(`${et}: «${nombreB(x)}» se solapa con «${nombreB(y)}»`);
              if (m.d.documentElement.scrollWidth > W + 1) malosP.push(`${et}: la página mide ${m.d.documentElement.scrollWidth} px`);
              if (contr) {
                let peor = 99, quien = '';
                for (const e of cajaP.querySelectorAll('h2, h3, p, b, small, label, .lbl, .chip, .btn, li, summary, .sname, span')) {
                  if (!visible(e) || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
                  const c = contrasteDe(e); if (c < peor) { peor = c; quien = (clsDe(e) || e.tagName) + ' «' + e.textContent.trim().slice(0, 14) + '»'; }
                }
                if (peor < 7) malosP.push(`${et}: contraste ${peor.toFixed(1)}:1 en ${quien}`);
              }
            }
          } finally { m.cerrar(); }
        }
        check(`Creador, Diario y Retos a ${W}×${H}: botones ≥ 44 px, sin desbordes en los 3 tamaños de texto y alto contraste ≥ 7:1`, !malosP.length, [...new Set(malosP)].slice(0, 5).join('; '));
      }

      // 1c. BM53: pausa, final, cómic, criadero, Aula, mapa grande, modos y minijuegos a 375×812: botones ≥ 44 px, sin desbordes en los 3 tamaños de
      // texto, y con alto contraste el texto se lee (≥ 7:1). BM73: añade la portada (#title) y «Mis récords», también a 320×568
      {
        const malosO = []; let vistas = []; await prepararOtras();
        for (const [W, H] of [[375, 812], [390, 844], [320, 568]]) for (let i = 0; i < NIVELES; i++) for (const contr of [false, true]) {
          const m = await maquetaOtras(W, H, `${i ? 'a11y-t' + i : ''} ${contr ? 'a11y-contraste' : ''}`);
          if (!m || !m.d) { if (m && m.cerrar) m.cerrar(); continue; }
          try {
            vistas = m.hay;
            for (const pid of m.hay) {
              const cajaP = cajaDe(m, pid); if (!cajaP) continue;
              const et = `${W}px nivel ${i}${contr ? ' contraste' : ''} #${pid}`;
              for (const b of cajaP.querySelectorAll('button, select, input:not([type=hidden]), summary, a[href]')) {
                if (!visible(b)) continue;
                const r = b.getBoundingClientRect();
                if (r.width && (r.width < 43.5 || r.height < 43.5)) malosO.push(`${et}: «${(b.getAttribute('aria-label') || b.textContent || b.id || clsDe(b)).trim().slice(0, 18)}» mide ${Math.round(r.width)}×${Math.round(r.height)}`);
              }
              for (const [x, y] of solapes(cajaP)) malosO.push(`${et}: «${nombreB(x)}» se solapa con «${nombreB(y)}»`);
              for (const e of [cajaP, ...cajaP.querySelectorAll('*')]) {
                if (!visible(e) || e.closest('canvas') || e.tagName === 'CANVAS') continue;
                const r = e.getBoundingClientRect();
                // QA-151: polygon.logo-shine es el barrido del logo. La animación shine lo lleva a translateX(-700px) y el clip de la palabra AMAZONA lo recorta a propósito. Su caja sale por la izquierda; no es un desborde de la portada.
                if (r.width && (r.right > W + 1 || r.left < -1) && !e.closest('.cr-globo, .maestro-scroll') && !(e.matches && e.matches('.logo-shine'))) { malosO.push(`${et}: ${nomEl(e)} se sale (${Math.round(r.left)}…${Math.round(r.right)})`); break; }
              }
              if (contr) {
                let peor = 99, quien = '';
                for (const e of cajaP.querySelectorAll('h2, h3, p, b, small, label, button, li, summary, span, div')) {
                  if (!visible(e) || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
                  const c = contrasteDe(e); if (c < peor) { peor = c; quien = (clsDe(e) || e.tagName) + ' «' + e.textContent.trim().slice(0, 14) + '»'; }
                }
                if (peor < 7) malosO.push(`${et}: contraste ${peor.toFixed(1)}:1 en ${quien}`);
              }
            }
          } finally { m.cerrar(); }
        }
        check('Portada, récords, pausa, final, cómic, criadero, Aula, mapa grande, modos y minijuegos a 375×812, 390×844 y 320×568: botones ≥ 44 px, sin desbordes en los 3 tamaños de texto y alto contraste ≥ 7:1', !malosO.length, [...new Set(malosO.map(x => x.replace(/^\d+px nivel \d( contraste)? /, '')))].slice(0, 25).join('; ') || ('medidas: ' + vistas.join(',') + ' · sin: ' + sinPantalla.join(' | ')));
      }

      // 2. Modo zurdo: el joystick a la derecha y los botones de acción a la izquierda (teléfono vertical y horizontal)
      for (const [W, H] of [[375, 812], [412, 915], [812, 375], [320, 568]]) {
        const malosZ = [];
        for (const zurdo of [false, true]) {
          const m = await maqueta(W, H, zurdo ? 'a11y-zurdo' : '');
          try {
            m.q('dialog').hidden = true; m.q('emotes').hidden = true; m.q('toast').hidden = true; m.q('subtitulos').hidden = true;
            // QA-196: la maqueta clona el HUD vivo; si el clon captura un cuadro de natación, #b-fly trae `hidden` (interaccion.js
            // lo sincroniza con MOVE.swimming) y el layout no se puede medir. Se normaliza al estado canónico en tierra.
            if (m.q('b-fly')) m.q('b-fly').hidden = false;
            if (m.q('b-dive')) m.q('b-dive').hidden = true;
            const rS = rect(m, '#stick'), rA = rect(m, '#acts'), rJ = rect(m, '#b-jump'), rG = rect(m, '#b-act'), rF = rect(m, '#b-fly'), rD = rect(m, '#b-dash');
            const et = `${W}×${H} ${zurdo ? 'zurdo' : 'diestro'}`;
            if (!rS || !rA || !rJ || !rG || !rF || !rD) { malosZ.push(`${et}: faltan los controles`); continue; }
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
      const chipMano = sec.querySelector('[data-a11y-bool="unamano"]');
      check('Una mano solo se ofrece en pantallas táctiles', !!chipMano && (getComputedStyle(chipMano).display !== 'none') === esTactil, esTactil ? 'táctil' : 'ratón');

      // ---------- CG-54: una mano (trucos, escondite, retos y el gancho de familia) ----------
      const trucos0 = G.trucos, anots = [];
      try {
        G.trucos = { anotar(id) { anots.push(id); return 1; } };
        set('unamano', false);
        check('Sin una mano, Tonel y Loop no estorban', !!$('b-tonel') && $('b-tonel').hidden && $('b-loop').hidden);
        set('unamano', true);
        $('b-tonel').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
        $('b-loop').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
        check('Tonel y Loop llaman al truco (se puede hacer el combo con un dedo)', anots.join(',') === 'tonel,looping', anots.join(','));
      } finally { G.trucos = trucos0; }
      const malosMano = [];
      for (const [W, H, zurdoM] of [[375, 812, false], [320, 568, false], [812, 375, false], [375, 812, true]]) {
        const m = await maqueta(W, H, 'a11y-unamano' + (zurdoM ? ' a11y-zurdo' : ''));
        try {
          m.q('dialog').hidden = true; m.q('emotes').hidden = true; m.q('toast').hidden = true; m.q('subtitulos').hidden = true;
          // QA-196: mismo criterio que en «Modo zurdo»: el clon puede traer #b-fly oculto por natación; se mide el estado en tierra.
          if (m.q('b-fly')) m.q('b-fly').hidden = false;
          if (m.q('b-dive')) m.q('b-dive').hidden = true;
          const et = `${W}×${H} ${zurdoM ? 'pulgar derecho' : 'pulgar izquierdo'}`;
          const rS = rect(m, '#stick'), rA = rect(m, '#acts'), rAct = rect(m, '#b-act'), rJump = rect(m, '#b-jump'), rFly = rect(m, '#b-fly'), rTonel = rect(m, '#b-tonel'), rLoop = rect(m, '#b-loop');
          if (!rS || !rA || !rAct || !rJump || !rFly || !rTonel || !rLoop) { malosMano.push(`${et}: faltan controles`); continue; }
          const medio = W / 2;
          const enLado = r => zurdoM ? (r.left + r.right) / 2 > medio - 1 : (r.left + r.right) / 2 < medio + 1;
          if (!enLado(rS) || !enLado(rA) || !enLado(rFly) || !enLado(rTonel)) malosMano.push(`${et}: el joystick y los botones no caben en una mano`);
          if (choca(rS, rA)) malosMano.push(`${et}: el joystick pisa los botones`);
          for (const [n, r] of [['joystick', rS], ['botones', rA], ['volar', rFly], ['tonel', rTonel], ['loop', rLoop]]) {
            if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) malosMano.push(`${et}: ${n} se sale`);
          }
          if (zurdoM ? !(rAct.left > rJump.left) : !(rAct.left < rJump.left)) malosMano.push(`${et}: Acción no queda en la esquina de fuera`);
          for (const id of ['sys', 'quest', 'inv']) if (choca(rS, rect(m, '#' + id)) || choca(rA, rect(m, '#' + id))) malosMano.push(`${et}: los controles tapan #${id}`);
          for (const b of m.d.querySelectorAll('#b-fly, #b-dash, #b-jump, #b-act, #b-tonel, #b-loop')) {
            if (!visible(b)) { malosMano.push(`${et}: #${b.id} oculto`); continue; }
            const r = b.getBoundingClientRect();
            if (r.width < 44 || r.height < 44) malosMano.push(`${et}: #${b.id} mide ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
          if (zurdoM && W === 375 && H === 812) {
            const aviso = m.q('toast'); aviso.hidden = false; aviso.textContent = 'Cargando River Rush…';
            const rT = rect(m, '#toast'), rV = rect(m, '#b-fly');
            if (!rT || rT.width < 40) malosMano.push(`${et}: el aviso no se mide`);
            else if (choca(rT, rV)) malosMano.push(`${et}: el aviso tapa Volar`);
          }
          if (W === 375 && H === 812 && !zurdoM) {
            const extra = m.d.createElement('div'); extra.className = 'a11y-controles-extra';
            extra.innerHTML = '<button class="btn" type="button">Mi turno</button>';
            m.d.body.appendChild(extra);
            const rE = extra.getBoundingClientRect(), bE = extra.querySelector('button').getBoundingClientRect();
            if (!enLado(rE)) malosMano.push(`${et}: el panel de familia no está en el lado del pulgar`);
            if (bE.width < 44 || bE.height < 44) malosMano.push(`${et}: el botón de turno mide ${Math.round(bE.width)}×${Math.round(bE.height)}`);
            if (choca(rE, rS) || choca(rE, rA)) malosMano.push(`${et}: el panel de familia pisa los controles`);
          }
        } catch (e) { malosMano.push(`${W}×${H}: ${e.message}`); }
        m.cerrar();
      }
      set('unamano', false);
      check('Una mano en 375×812, 320×568 y 812×375: joystick, volar, trucos y el turno de familia en el lado del pulgar, botones ≥ 44 px, sin pisarse', !malosMano.length, malosMano.slice(0, 4).join('; '));

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

      // ---------- W35 · teclado y lector de pantalla en lo nuevo ----------
      // Menú «¿Cómo quieres jugar?» (con Minigolf) y la tarjeta «emparejar» del Aula aquí; el minigolf («¿Cuántos juegan?»), Chispa,
      // Moon, el Guardián y el puerto con su propio teclado() cuando su módulo ya está cargado (boot.js los carga a demanda: esta
      // prueba no los carga; v18MinigolfTest, v18ChispaTest, v18MoonTest, v18GuardianTest y v18PuertoTest corren los mismos checks).
      {
        const nombreDe = el => !el ? '' : ((el.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => id && document.getElementById(id)).filter(Boolean).map(x => x.textContent.trim()).join(' ') ||
          el.getAttribute('aria-label') || el.textContent || '').trim();
        const foco0 = document.activeElement;
        // Sonda: una tecla neutra. Si alguien se la queda (preventDefault), es la escucha «cualquier tecla salta la apertura» del
        // cap. 1 que sigue puesta aunque la apertura ya se cortó (apertura.fin() quita el botón pero no la escucha): se gasta aquí
        // para que los checks de teclado sean deterministas y se anota (no es de esta prueba: content/cap1/historia.js).
        let sonda = false;
        { const t0 = G.ui.toast; G.ui.toast = () => {}; try { const ev = new KeyboardEvent('keydown', { key: 'F24', bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); sonda = ev.defaultPrevented; } finally { G.ui.toast = t0; } }
        const tecla = (el, key) => { const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); el.dispatchEvent(ev); return ev; };
        // Foco visible: la regla global de ui.css (anillo de ≥ 3 px) sigue en las hojas cargadas
        let anillo = false;
        for (const sh of document.styleSheets) { let rs = null; try { rs = sh.cssRules; } catch (e) { continue; } for (const r of rs || []) if (r.selectorText === ':focus-visible' && r.style && /solid/.test(r.style.outline || r.style.outlineStyle) && parseFloat(r.style.outlineWidth || (r.style.outline || '').replace(/^\D*/, '')) >= 3) anillo = true; }
        check('W35 · Foco visible: la regla :focus-visible (anillo sólido ≥ 3 px) está en las hojas del juego', anillo);
        const form = $('modos'), tiles = form ? [...form.querySelectorAll('.modo')] : [], golf = form && form.querySelector('[data-modo="golf"]');
        const malosM = tiles.filter(b => b.tagName !== 'BUTTON' || !nombreDe(b) || b.tabIndex < 0 || b.disabled).map(b => b.dataset.modo || b.id);
        check('W35 · «¿Cómo quieres jugar?»: el menú tiene nombre y sus tarjetas (también Minigolf) son <button> con nombre que se alcanzan con Tab',
          !!form && !!nombreDe(form) && tiles.length >= 7 && !!golf && /golf/i.test(nombreDe(golf)) && !malosM.length, malosM.join(', ') || nombreDe(golf));
        const tit = $('title');
        if (tit && tit.open && golf && golf.offsetParent !== null) { // la portada abierta (en la prueba normal ya se cerró al empezar)
          const av = form.querySelector('[data-modo="aventura"]'); av.focus(); const ev = tecla(av, 'ArrowRight');
          check('W35 · «¿Cómo quieres jugar?»: las flechas pasan de Aventura a Minigolf', document.activeElement === golf && ev.defaultPrevented, document.activeElement && document.activeElement.dataset.modo);
        }
        // Tarjeta «emparejar» del Aula (bdb436d4)
        const AU = G.aula, q3 = AU && AU.pregunta && AU.pregunta('q3');
        if (q3 && q3.tipo === 'emparejar' && AU.hacerPregunta) {
          const card = $('card'), b = (l, k) => $('emp-' + l + '-' + k), abierta0 = !card.hidden, html0 = card.innerHTML;
          try {
            AU.hacerPregunta(q3, { cabecera: '', alTerminar() {} });
            const grupo = card.querySelector('.edu[role="group"]'), ops = [...card.querySelectorAll('button')];
            const sinNombre = ops.filter(x => !nombreDe(x)).map(x => x.id || x.className);
            check('W35 · Aula «emparejar»: la tarjeta se nombra con su pregunta, el foco empieza dentro (primero de la izquierda) y todos sus botones tienen nombre',
              !card.hidden && !!grupo && nombreDe(grupo) === card.querySelector('#emp-q').textContent.trim() && document.activeElement === b('i', 0) && card.contains(document.activeElement) && !sinNombre.length, sinNombre.join(', ') || (document.activeElement && document.activeElement.id));
            b('i', 0).click();
            await new Promise(r => setTimeout(r, 160));
            const av = $('emp-aviso');
            check('W35 · Aula «emparejar»: al elegir uno se anuncia en su zona aria-live (escrita después de pintar la tarjeta)', !!av && av.getAttribute('aria-live') === 'polite' && !!av.textContent.trim(), av && av.textContent);
            const diag = [document.activeElement && (document.activeElement.id || document.activeElement.tagName), [...((G.pausa && G.pausa.motivos) || [])].join('+')];
            tecla(document.activeElement, 'Escape');
            const suelto = !card.hidden && b('i', 0).getAttribute('aria-pressed') === 'false';
            diag.push(document.activeElement && (document.activeElement.id || document.activeElement.tagName));
            tecla(document.activeElement || document.body, 'Escape');
            check('W35 · Aula «emparejar»: Escape suelta la elección y, sin nada elegido, cierra la tarjeta', suelto && card.hidden, JSON.stringify({ suelto, cerrada: card.hidden, diag }));
          } finally {
            if (abierta0) { G.ui.showCard(html0); } else if (!card.hidden) G.ui.hideCard();
          }
        }
        // Módulos V18 a demanda: sus checks de teclado si ya están cargados
        const mods = [['v18minigolf', 'Minigolf'], ['v18chispa', 'Chispa'], ['v18moon', 'Moon'], ['v18guardian', 'Guardián'], ['v18puerto', 'Puerto']], aqui = [], fuera = [];
        for (const [k, n] of mods) {
          const m = G[k];
          if (!m || typeof m.teclado !== 'function') { fuera.push(n); continue; }
          const rs = m.teclado(); if (rs.length) aqui.push(n); else fuera.push(n + ' (ocupado o fuera de su capítulo)');
          for (const r of rs) out.push(r);
        }
        try { if (foco0 && foco0 !== document.body && document.contains(foco0)) foco0.focus({ preventScroll: true }); else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); } catch (e) { /* sin foco */ }
        check('W35 · Teclado en lo nuevo: menú y Aula comprobados aquí; módulos V18 cargados también (los demás, en su propia prueba)', true, 'aquí: ' + (aqui.join(', ') || '—') + ' · en su prueba: ' + (fuera.join(', ') || '—') + (sonda ? ' · AVISO: una escucha de teclado se quedó la 1.ª tecla (la de «saltar la apertura» del cap. 1, ya cortada)' : ''));
      }

      // ---------- Remapeo de teclas (PC; src/engine/input.js) ----------
      // Mover, volar, acción, impulso/poder y mapa: un cambio mueve de verdad a Vittata, el choque intercambia y avisa, Restablecer
      // vuelve a fábrica, se guarda en el dispositivo y las pistas con nombres de teclas (HUD, Controles, guía, minimapa) siguen al mapa.
      if (G.input && G.input.asignar && G.input.releer) {
        const I = G.input, previo = I.mapa, CL = I.CLAVE;
        let crudoT = null; try { crudoT = localStorage.getItem(CL); } catch (e) { /* sin almacenamiento */ }
        const pos0 = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, mov0 = Object.assign({}, G.fisica.MOVE), vy0 = S.vy;
        const dash0 = G.fisica.tryDash, sost0 = G.dones && G.dones.sostener;
        const kev = (tipo, key) => { const ev = new KeyboardEvent(tipo, { key, bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); return ev; };
        const kbdTxt = sel => [...document.querySelectorAll(sel)].map(k => k.textContent.trim()).join('');
        try {
          I.restablecer();
          check('Teclas · de fábrica: mover WASD, volar V, acción E, impulso F y mapa M', ['w', 'a', 's', 'd'].join('') === [I.mapa.arriba, I.mapa.izquierda, I.mapa.abajo, I.mapa.derecha].join('') &&
            I.mapa.volar === 'v' && I.mapa.accion === 'e' && I.mapa.poder === 'f' && I.mapa.mapa === 'm', JSON.stringify(I.mapa));
          const secT = document.querySelector('#pause .pause-teclas');
          check('Teclas · la sección de la pausa tiene mover, volar, acción, impulso y mapa, y el botón Restablecer',
            !!secT && ['arriba', 'abajo', 'izquierda', 'derecha', 'volar', 'accion', 'poder', 'mapa'].every(a => !!secT.querySelector(`[data-tecla="${a}"]`)) && !!secT.querySelector('#b-teclas-reset'));
          // Mover: avanzar con I mueve de verdad (pasos de la física con la tecla pulsada); la W ya no
          const mover = key => {
            S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; Object.assign(G.fisica.MOVE, mov0, { vx: 0, vz: 0, flying: false, landing: false }); S.vy = 0;
            kev('keydown', key); for (let n = 0; n < 12; n++) G.fisica.step(1 / 30, false); kev('keyup', key);
            const d = Math.hypot(S.pos.x - pos0.x, S.pos.z - pos0.z);
            S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; Object.assign(G.fisica.MOVE, mov0); S.vy = vy0;
            return d;
          };
          const dW0 = mover('w');
          I.asignar('arriba', 'i');
          const dI = mover('i'), dW = mover('w');
          check('Teclas · avanzar pasa a I: con I Vittata se mueve y con W ya no', dI > 0.3 && dW < 0.05 && dW0 > 0.3, `W antes ${dW0.toFixed(2)} m · I ${dI.toFixed(2)} m · W después ${dW.toFixed(2)} m`);
          // Impulso y poder: con la tecla nueva se lanza el impulso y se mantiene el don; la F ya no
          let dashes = 0; const sost = [];
          G.fisica.tryDash = () => { dashes++; };
          if (G.dones) G.dones.sostener = on => { sost.push(on); };
          I.asignar('poder', 'o');
          kev('keydown', 'o'); const tieneF = I.keys.has('f'); kev('keyup', 'o');
          kev('keydown', 'f'); kev('keyup', 'f');
          check('Teclas · impulso y poder pasan a O: O lanza el impulso y mantiene el don; F ya no', dashes === 1 && tieneF && !I.keys.has('f') && (!G.dones || sost.join() === 'true,false'), `impulsos ${dashes} · don ${sost.join()}`);
          G.fisica.tryDash = dash0; if (G.dones) G.dones.sostener = sost0;
          // Volar y acción
          I.asignar('volar', 'b'); I.asignar('accion', 'n');
          check('Teclas · volar con B y acción con N (Enter sigue siendo acción)', I.es('volar', { key: 'B' }) && !I.es('volar', { key: 'v' }) && I.es('accion', { key: 'n' }) && I.es('accion', { key: 'Enter' }) && !I.es('accion', { key: 'e' }));
          // Mapa: K abre el mapa grande (si ahora se puede abrir) y M ya no
          I.asignar('mapa', 'k');
          const mm = G.minimapa;
          if (mm && !mm.abierto && mm.abrir()) {
            mm.cerrar();
            kev('keydown', 'm'); const conM = mm.abierto; kev('keyup', 'm'); if (mm.abierto) mm.cerrar();
            kev('keydown', 'k'); const conK = mm.abierto; kev('keyup', 'k'); if (mm.abierto) mm.cerrar();
            check('Teclas · el mapa pasa a K: K abre el mapa grande y M ya no', conK && !conM, `K ${conK} · M ${conM}`);
          } else check('Teclas · el mapa pasa a K (el mapa grande no se puede abrir ahora: se mira la tecla)', I.es('mapa', { key: 'K' }) && !I.es('mapa', { key: 'm' }), mm ? 'ocupado' : 'minimapa sin cargar');
          // Choque: acción a I (que es de avanzar) → se intercambian, se avisa y la otra fila se marca
          I.asignar('accion', 'n');
          const nota0 = secT && secT.querySelector('#teclas-nota');
          const capt = secT && secT.querySelector('[data-tecla="accion"]');
          if (capt) capt.click(); // espera una tecla
          const esperando = !!capt && capt.getAttribute('aria-pressed') === 'true';
          kev('keydown', 'i'); kev('keyup', 'i');
          const filaArriba = secT && secT.querySelector('[data-tecla="arriba"]');
          check('Teclas · choque: dar a Acción la I de Avanzar las intercambia, lo dice y marca la otra fila',
            esperando && I.mapa.accion === 'i' && I.mapa.arriba === 'n' && I.ultimoCambio === 'arriba' && new Set(Object.values(I.mapa)).size === I.ACCIONES.length &&
            !!nota0 && /cambiamos/i.test(nota0.textContent) && !!filaArriba && filaArriba.classList.contains('tecla-cambiada'),
            `${I.mapa.accion}/${I.mapa.arriba} · ${nota0 && nota0.textContent}`);
          // Tecla fija: P (pausa) se rechaza y se sigue esperando; Esc cancela
          if (capt) capt.click();
          kev('keydown', 'p'); kev('keyup', 'p');
          const rechazo = !!nota0 && /no se puede usar/.test(nota0.textContent) && capt.getAttribute('aria-pressed') === 'true' && I.mapa.accion === 'i';
          kev('keydown', 'Escape'); kev('keyup', 'Escape');
          check('Teclas · una tecla fija (P, la pausa) se rechaza con aviso y Esc cancela', rechazo && capt.getAttribute('aria-pressed') === 'false', nota0 && nota0.textContent);
          // Pistas con nombres de teclas
          const hint = kbdTxt('#keyhint kbd');
          const fila = f => document.querySelector(`#pause .help-keys:not(.pause-teclas) > div[data-tecla-fila="${f}"] dt`);
          const ayudaOk = fila('mover') && fila('mover').textContent === 'NASD' &&
            fila('volar').textContent === 'B' && fila('accion').textContent === 'I' && fila('poder').textContent === 'O' && fila('mapa').textContent === 'K';
          let guiaOk = true, guiaTxt = 'táctil: sin guía de teclado';
          const GC = G.guiaControles;
          if (GC && GC.mostrar && GC.mostrar(true)) {
            const gf = id => { const e = document.querySelector(`#guia-panel [data-fila="${id}"] dt`); return e ? kbdTxt(`#guia-panel [data-fila="${id}"] dt kbd`) : ''; };
            guiaTxt = ['mover', 'volar', 'accion', 'don'].map(id => id + ' ' + gf(id)).join(' · ');
            guiaOk = gf('mover') === 'NASD' && gf('volar') === 'B' && gf('accion') === 'I' && gf('don') === 'O';
            GC.cerrar();
          }
          const mmB = document.querySelector('#minimapa .mm-btn, .mm-btn');
          check('Teclas · las pistas usan las teclas nuevas: HUD, Controles de la pausa y guía de controles',
            hint.startsWith('NASD') && hint.endsWith('I') && !!ayudaOk && guiaOk, `HUD ${hint} · pausa ${ayudaOk ? 'bien' : ['mover', 'volar', 'accion', 'poder', 'mapa'].map(f => fila(f) ? fila(f).textContent : '—').join(',')} · ${guiaTxt}`);
          // Guardado en el dispositivo: lo que se relee al recargar es lo mismo
          let g = null; try { g = JSON.parse(localStorage.getItem(CL)); } catch (e) { /* sin almacenamiento */ }
          const relee = I.releer();
          check('Teclas · se guardan en el dispositivo y al recargar se leen igual', !!g && g.v === 1 && I.ACCIONES.every(a => relee[a] === I.mapa[a] && g.mapa[a] === I.mapa[a]), JSON.stringify(g && g.mapa));
          // Restablecer
          secT.querySelector('#b-teclas-reset').click();
          let tras = 'x'; try { tras = localStorage.getItem(CL); } catch (e) { tras = null; }
          check('Teclas · Restablecer vuelve a WASD, V, E, F y M, borra lo guardado y las pistas vuelven',
            I.ACCIONES.every(a => I.mapa[a] === I.DEFECTO[a]) && tras === null && kbdTxt('#keyhint kbd').startsWith('WASD') && fila('poder').textContent === 'F' && fila('mapa').textContent === 'M');
          if (mmB) { const aria = mmB.getAttribute('aria-label') || ''; check('Teclas · el minimapa nombra su tecla (M de fábrica)', /\(tecla M\)|\(M key\)/.test(aria) || !/tecla|key/.test(aria), aria); }
          // Táctil: la sección no se ofrece y los botones de pantalla no dependen del teclado
          const esT = !(matchMedia('(hover: hover) and (pointer: fine)').matches), vis = secT && getComputedStyle(secT).display !== 'none';
          check('Teclas · solo con teclado: en pantalla táctil la sección no sale', !!secT && secT.classList.contains('help-keys') && vis === !esT, esT ? 'táctil' : 'ratón');
        } catch (e) {
          check('Teclas · sin excepciones', false, e && (e.stack || e.message));
        } finally {
          G.fisica.tryDash = dash0; if (G.dones && sost0) G.dones.sostener = sost0;
          I.restablecer(); for (const a of I.ACCIONES) if (previo[a] !== I.DEFECTO[a]) I.asignar(a, previo[a]);
          try { if (crudoT == null) localStorage.removeItem(CL); else localStorage.setItem(CL, crudoT); } catch (e) { /* sin almacenamiento */ }
          S.pos.x = pos0.x; S.pos.y = pos0.y; S.pos.z = pos0.z; Object.assign(G.fisica.MOVE, mov0); S.vy = vy0;
          const n = document.querySelector('#teclas-nota'); if (n) n.textContent = '';
        }
      }

      // ---------- V18 · lo nuevo (8-nov): tarjeta de nivel y de etapa, «+N XP», Mis cotorras (ficha y retos de alianza), Retos con amigos y
      // los paneles de Chispa, Moon y el Guardián. Mis cotorras y Retos con amigos se abren por el menú (como el jugador; cargan evolucion.js);
      // los paneles se miden si su módulo ya está cargado (boot.js los carga a demanda; menuModosTest o su prueba los montan). Cada pieza
      // se copia a una maqueta de 375×812 y 320×568 con los 3 tamaños de texto, con y sin alto contraste: contraste ≥ 4,5:1 (también
      // sobre los degradados y con la opacidad), botones ≥ 44 px, nada se sale ni se corta, y el texto crece con --fs-k.
      {
        const piezas = [], sinV18 = [], card = $('card'), foco0 = document.activeElement;
        const copiaCard = (nombre, sel) => { if (!card.hidden && card.querySelector(sel)) piezas.push({ nombre, html: card.outerHTML, sel: '#card' }); else sinV18.push(nombre); };
        let respaldo = false;
        if (G.V18 && G.menuModos && G.menuModos.elegir && G.pack && G.pack.id === 'cap1') {
          const abierta0 = !card.hidden, html0 = card.innerHTML;
          try {
            await Promise.race([G.menuModos.elegir('amigos'), espera(4000)]); await frame();
            copiaCard('Retos con amigos', '.mm-amigos'); if (!card.hidden) G.ui.hideCard();
            await Promise.race([G.menuModos.elegir('cotorras'), espera(8000)]); await frame();
            if (!card.hidden) G.ui.hideCard();
            const E = G.v18evo;
            if (E && E.prueba) {
              E.prueba({ especie: 'vittata', nivel: 22, alianza: true }); respaldo = true;
              await Promise.race([G.menuModos.elegir('cotorras'), espera(8000)]); await frame();
            }
            copiaCard('Mis cotorras', '[data-v18alianzas]'); if (!card.hidden) G.ui.hideCard();
            if (E && E.carta) {
              const c1 = E.carta('Nueva etapa', 'Despertar', 'Tu poder despierta: ahora llega más lejos y dura más.', false, 'Elige cómo crece tu poder en Mis cotorras.');
              const ok1 = !!c1 && document.activeElement === foco0 && !c1.contains(document.activeElement);
              if (c1) piezas.push({ nombre: 'Tarjeta de etapa', html: c1.outerHTML, sel: '#v18-evo-carta' });
              const c2 = E.carta('Subiste de nivel', ['Cotorra de Hispaniola', 'Nv 12'], 'Faltan 132 XP para el nivel 13', 'arausiaca', '');
              if (c2) piezas.push({ nombre: 'Tarjeta de nivel', html: c2.outerHTML, sel: '#v18-evo-carta' });
              const c3 = E.carta('+40 XP', ['Vittata', 'Nv 12'], 'Faltan 132 XP para el nivel 13', false, '', 'mini');
              if (c3) piezas.push({ nombre: '«+N XP»', html: c3.outerHTML, sel: '#v18-evo-carta' });
              const c = c3 || c2 || c1;
              const enfocables = c ? c.querySelectorAll('button, a[href], input, select, [tabindex]').length : -1;
              const vivas = c ? c.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]').length : -1;
              check('V18 · Tarjeta de nivel y «+N XP»: se anuncian (role=status, sin regiones anidadas), no roban el foco, no se tocan y no tienen nada enfocable',
                ok1 && !!c && c.getAttribute('role') === 'status' && !vivas && !enfocables && getComputedStyle(c).pointerEvents === 'none' && document.activeElement === foco0,
                JSON.stringify({ foco: ok1, role: c && c.getAttribute('role'), vivas, enfocables, puntero: c && getComputedStyle(c).pointerEvents }));
              if (c) c.hidden = true;
            } else sinV18.push('tarjeta de nivel (sin evolucion.js)');
          } catch (e) { sinV18.push('V18: ' + (e && e.message)); } finally {
            if (respaldo) { try { G.v18evo.prueba(null); } catch (e) { /* sin evolución */ } }
            if (abierta0) G.ui.showCard(html0); else if (!card.hidden) G.ui.hideCard();
          }
        } else sinV18.push('V18 apagada o fuera del cap. 1');
        // La regla global de «reducir movimiento» (ui.css, sección 7) apaga toda animación (la entrada v18evo de la tarjeta, la chapa «Lo último»…)
        const quieto = [...document.styleSheets].some(h => { try { return [...h.cssRules].some(r => r.media && /prefers-reduced-motion:\s*reduce/.test(r.media.mediaText) && [...r.cssRules].some(x => /(^|,)\s*\*\s*(,|$)/.test(x.selectorText || '') && /animation:\s*none\s*!important/.test(x.cssText))); } catch (e) { return false; } });
        check('V18 · Con «reducir movimiento» la tarjeta de nivel, el «+N XP» y las tarjetas del menú no se animan (regla global de ui.css)', quieto);
        const paneles = [['v18-chispa', 'Chispa'], ['v18-moon', 'Moon'], ['v18-guardian', 'Guardián']], panelSin = [];
        for (const [id, n] of paneles) {
          const el = $(id); if (!el) { panelSin.push(n); continue; }
          const nom = (el.getAttribute('aria-labelledby') || '').split(/\s+/).map(x => x && document.getElementById(x)).filter(Boolean).map(x => x.textContent.trim()).join(' ');
          piezas.push({ nombre: 'Panel de ' + n, html: el.outerHTML, sel: '#' + id, panel: true, aria: el.getAttribute('role') === 'status' && el.getAttribute('aria-live') === 'polite' && !!nom });
        }
        // Contraste del texto contra cada fondo posible: color de fondo, cada parada de un degradado y la opacidad de los padres
        const contrasteMin = e => {
          const w = e.ownerDocument.defaultView;
          const rgba = s => { const m = /rgba?\(([^)]+)\)/.exec(s); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
          const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const sobre = (a, b) => { const al = a[3] + b[3] * (1 - a[3]); if (!al) return [0, 0, 0, 0]; return [0, 1, 2].map(j => (a[j] * a[3] + b[j] * b[3] * (1 - a[3])) / al).concat(al); };
          const capas = [];
          for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
            const cs = w.getComputedStyle(n), paradas = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgba);
            capas.push({ fondo: rgba(cs.backgroundColor), paradas, op: parseFloat(cs.opacity) || 1 });
          }
          const gi = capas.findIndex(c => c.paradas.length), variantes = gi < 0 ? [null] : capas[gi].paradas;
          let peor = 99;
          for (const v of variantes) {
            let t = rgba(w.getComputedStyle(e).color), f = [0, 0, 0, 0];
            capas.forEach((c, k) => { const fk = k === gi ? sobre(v, c.fondo) : c.fondo; f = sobre(f, fk); t = sobre(t, fk); f[3] *= c.op; t[3] *= c.op; });
            const blanco = [255, 255, 255, 1], tt = sobre(t, blanco), ff = sobre(f, blanco), a = lum(tt), b = lum(ff);
            peor = Math.min(peor, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05));
          }
          return peor;
        };
        const conTexto = e => [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim());
        const malos18 = [], avisos18 = [], tam = {};
        if (piezas.length) {
          const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
          for (const [W, H] of [[375, 812], [320, 568]]) for (let i = 0; i < NIVELES; i++) for (const contr of [false, true]) {
            const f = document.createElement('iframe');
            f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
            f.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;height:${H}px;border:0;`;
            const estilos = [...document.querySelectorAll('style')].map(e => e.outerHTML).join('');
            f.srcdoc = `<!doctype html><html lang="es" class="${i ? 'a11y-t' + i : ''} ${contr ? 'a11y-contraste' : ''}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}${estilos}` +
              '<style>*, *::before, *::after { animation: none !important; transition: none !important; }</style></head><body></body></html>';
            document.body.appendChild(f);
            try {
              await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
              const d = f.contentDocument; if (!d) continue;
              try { await Promise.race([d.fonts.ready, espera(2500)]); } catch (e) { /* sin fuentes */ }
              for (const p of piezas) {
                d.body.innerHTML = p.html;
                const caja = d.querySelector(p.sel); if (!caja) continue;
                caja.hidden = false; caja.inert = false;
                for (const h of caja.querySelectorAll('[hidden]')) h.hidden = false;
                const muestra = { n: '3', r: 'Récord: 1:15.25', s: '1:15.25', p: 'Puerta 5 de 5', t: p.nombre };
                if (p.panel) for (const s of caja.querySelectorAll('span, div')) if (!s.children.length && !s.textContent.trim()) s.textContent = muestra[(clsDe(s).match(/-(\w)$/) || [])[1]] || 'Puerta 5 de 5';
                await frame();
                const et = `${W}px nivel ${i}${contr ? ' contraste' : ''} ${p.nombre}`, lista = p.panel ? avisos18 : malos18;
                const rc = caja.getBoundingClientRect();
                if (rc.left < -1 || rc.right > W + 1) lista.push(`${et}: se sale de la pantalla (${Math.round(rc.left)}…${Math.round(rc.right)})`);
                if (p.sel === '#v18-evo-carta' && rc.bottom > H + 1) lista.push(`${et}: la tarjeta pasa del borde de abajo (${Math.round(rc.bottom)} > ${H})`);
                for (const b of caja.querySelectorAll('button, select, input:not([type=hidden]), summary, a[href]')) {
                  if (!visible(b)) continue; const r = b.getBoundingClientRect();
                  if (r.width && (r.width < 43.5 || r.height < 43.5)) lista.push(`${et}: «${nombreB(b)}» mide ${Math.round(r.width)}×${Math.round(r.height)}`);
                }
                const fs = [];
                for (const e of [caja, ...caja.querySelectorAll('*')]) {
                  if (!visible(e) || e.closest('svg') || e.tagName === 'STYLE') continue;
                  const r = e.getBoundingClientRect(), cs = d.defaultView.getComputedStyle(e);
                  if (e !== caja && r.width && (r.left < rc.left - 1 || r.right > rc.right + 1) && cs.position !== 'fixed') { lista.push(`${et}: ${nomEl(e)} se sale de su caja`); break; }
                  if (conTexto(e) && /hidden|clip/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) lista.push(`${et}: ${nomEl(e)} corta el texto`);
                  if (!conTexto(e)) continue;
                  fs.push(parseFloat(cs.fontSize));
                  const c = contrasteMin(e); if (c < 4.5) lista.push(`${et}: contraste ${c.toFixed(1)}:1 en ${nomEl(e)} «${e.textContent.trim().slice(0, 16)}»`);
                }
                if (W === 375 && !contr) (tam[p.nombre] = tam[p.nombre] || [])[i] = fs;
              }
            } finally { f.remove(); }
          }
          // Texto grande: con «Muy grande» (--fs-k 1,3) cada texto de la pieza crece al menos un 10 %
          for (const p of piezas) {
            const t = tam[p.nombre]; if (!t || !t[0] || !t[NIVELES - 1]) continue;
            const fijos = t[0].filter((v, k) => t[NIVELES - 1][k] != null && t[NIVELES - 1][k] < v * 1.1).length;
            if (fijos) (p.panel ? avisos18 : malos18).push(`${p.nombre}: ${fijos} de ${t[0].length} textos no crecen con el texto grande`);
          }
        }
        const sinPiezas = !piezas.some(p => !p.panel);
        check('V18 · Tarjeta de etapa y de nivel, «+N XP», Mis cotorras con los retos de alianza y Retos con amigos a 375×812 y 320×568: contraste ≥ 4,5:1 (también con alto contraste), botones ≥ 44 px, nada se sale ni se corta y el texto crece con --fs-k',
          !malos18.length && (!G.V18 || !sinPiezas), [...new Set(malos18.map(x => x.replace(/^\d+px nivel \d( contraste)? /, '')))].slice(0, 12).join('; ') || ('medidas: ' + piezas.map(p => p.nombre).join(', ') + (sinV18.length ? ' · sin: ' + sinV18.join(' | ') : '')));
        const malosAria = piezas.filter(p => p.panel && !p.aria).map(p => p.nombre);
        // Los paneles son de la V18.3 (chispa.js, moon.js, guardian.js): lo que falle se anota aquí para su dueño, sin poner la prueba en rojo
        check('V18 · Paneles de Chispa, Moon y el Guardián: se anuncian con nombre (role=status, aria-live polite); medidas de contraste, toque y texto grande anotadas',
          !malosAria.length, (malosAria.length ? 'sin nombre o sin aria: ' + malosAria.join(', ') + ' · ' : '') + 'medidos: ' + (piezas.filter(p => p.panel).map(p => p.nombre.replace('Panel de ', '')).join(', ') || '—') +
          ' · sin cargar: ' + (panelSin.join(', ') || '—') + (avisos18.length ? ' · AVISO V18.3: ' + [...new Set(avisos18.map(x => x.replace(/^\d+px nivel \d( contraste)? /, '')))].slice(0, 8).join('; ') : ''));
        try { if (foco0 && foco0 !== document.body && document.contains(foco0)) foco0.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
      }

      // ---------- Guardado ----------
      set('texto', 2); set('contraste', true); set('subtitulos', true); set('relajado', true); set('zurdo', true); set('daltonismo', true); set('unamano', true);
      const d = JSON.parse(G.guardado.serialize(true)), a0 = d.profile && d.profile.a11y;
      check('La partida guardada lleva los ajustes', a0 && a0.texto === 2 && a0.contraste === true && a0.subtitulos === true && a0.relajado === true && a0.zurdo === true && a0.daltonismo === true && a0.unamano === true, JSON.stringify(a0));
      S.profile = Object.assign({}, perfil0, { a11y: { texto: 0, contraste: false } }); sync();
      check('Con todo apagado no queda ninguna clase puesta', !/a11y-/.test(raiz.className));
      // Recarga: la partida guardada (serialize → JSON → migrate) vuelve a poner el texto Muy grande en una sesión sin ajustes
      {
        const snapR = G.guardado.instantanea(), ultR = ultimo;
        let okR = false, extraR = '';
        try {
          const crudo = G.guardado.serialize(true);
          ultimo = null; S.profile = Object.assign({}, S.profile, { a11y: undefined }); G.emit('apply');
          const limpio = !/a11y-t2/.test(raiz.className) && leer().texto === 0;
          const dR = G.guardado.migrate(JSON.parse(crudo));
          const valida = G.guardado.validSave(dR);
          G.guardado.restaurar(dR);
          okR = limpio && valida && raiz.classList.contains('a11y-t2') && leer().texto === 2 && px(document.body) > tam[0][1];
          extraR = `limpio ${limpio} · válida ${valida} · texto ${leer().texto} · ${px(document.body)} px`;
        } catch (e) { extraR = e.message; }
        finally { ultimo = ultR; G.guardado.restaurar(snapR); }
        check('El tamaño de texto sobrevive a recargar la partida guardada', okR, extraR);
      }
      S.profile = d.profile; G.emit('apply');
      check('Al cargar la partida se aplican los ajustes', ['a11y-t2', 'a11y-contraste', 'a11y-relajado', 'a11y-zurdo', 'a11y-daltonismo', 'a11y-unamano'].every(c => raiz.classList.contains(c)) && subtitulos());
      // «Comenzar de cero» (perfil nuevo, sin ajustes) y una partida vieja sin ajustes conservan lo elegido
      S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
      check('«Comenzar de cero» conserva texto, contraste, subtítulos, relajado, zurdo, daltonismo y una mano', ['a11y-t2', 'a11y-contraste', 'a11y-relajado', 'a11y-zurdo', 'a11y-daltonismo', 'a11y-unamano'].every(c => raiz.classList.contains(c)) && leer().texto === 2 && subtitulos() && leer().daltonismo && leer().unamano);
      ultimo = null; S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
      check('Sin nada elegido en la sesión, una partida sin ajustes queda con todo apagado', !/a11y-/.test(raiz.className));
      S.profile = Object.assign({}, perfil0, { a11y: { texto: 9, contraste: 'sí', subtitulos: 1, relajado: 'true', zurdo: {} } }); sync();
      check('Un valor dañado vuelve a Normal y todo apagado', !/a11y-/.test(raiz.className));
    } catch (e) {
      check('Sin excepciones', false, e && (e.stack || e.message)); // QA-97: con la pila, para ver dónde falla cuando la máquina va cargada
    } finally {
      await ponerIdioma(idi0 === 'en' ? 'en' : 'es');
      S.profile = perfil0; ultimo = ultimo0; escala = 1; G.audio.vol.muted = mudo0; limpiar(); sync(); guardarAlCambiar = true;
      try { const tg = { x: S.pos.x + 12, z: S.pos.z }; G.fx.guide(tg, 0); G.fx.guide(null, 0); } catch (e) { /* sin guía */ }
      try { if (menu && !abierto0 && menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
    }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  const subtitulos = () => leer().subtitulos, relajado = () => leer().relajado, zurdo = () => leer().zurdo;
  const daltonismo = () => leer().daltonismo, unaMano = () => leer().unamano;
  return { leer, set, sync, subtitulos, relajado, zurdo, daltonismo, unaMano, subtitular, SUB, maqueta, rect, test };
});
