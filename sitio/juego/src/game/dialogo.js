/* Juego · diálogo
   Caja de diálogo (#dialog), cola de líneas, elecciones que cambian la frase (no el desenlace) y estado "talk"
   para que el modelo 3D mueva el pico y ponga cara.
   Datos: pack.dialogos { datos: () => { escenas: [{ id, disparador, personaje, emocion, lineas }] }, retratos: { personaje: img },
   retratoDefecto, emociones: { emocion: mood } }. Disparadores: "evento:<Clave>", "inicio:<momento>", "interact:<objeto>";
   las escenas del mismo disparador se encadenan en orden.
   Línea = { who, img, text, mood?, onShow?, lang? } (lang marca el idioma de la línea en #d-text: lectores y voz).
   Dos modos (DIVERSION_CAP1, mejora 3):
   - say(lines, done): la caja #dialog bloquea el juego (ui.busy) hasta pulsar «Seguir»; para las decisiones y las charlas.
   - say(lines, done, { libre: true }): bocadillos (#bocadillos) que pasan solos con el tiempo del juego mientras la cotorra
     sigue moviéndose; la narración (Narrador, Guardián, Voz) y los comentarios. No cuentan como ocupado. Un toque en el
     bocadillo pasa al siguiente; `done` llega al terminar el último. Si se abre una caja o una tarjeta, se esconden y esperan.
   API: open() = caja bloqueante abierta · libre() = bocadillo en curso o null · activo() = cualquiera de los dos ·
   actual() = { who, text, img, libre } de la línea a la vista · next() pasa la línea (caja primero; si no, bocadillo) ·
   cancelarLibre() corta los bocadillos y devuelve las líneas que faltaban (para fundirlas en una charla). */
AVE.module('dialogo', function (G) {
  'use strict';
  const $ = G.util.$, D = G.pack.dialogos || {};
  const retratos = D.retratos || {};
  const defImg = D.retratoDefecto || (G.pack.jugador && G.pack.jugador.sprite) || '';
  const EMO_MOOD = D.emociones || { feliz: 'happy', triste: 'sad', sorpresa: 'surprised', idea: 'idea', enojo: 'angry' };
  const img = who => retratos[who] || defImg;
  const DIALOG = {};
  const data = (D.datos && D.datos()) || {};
  for (const sc of data.escenas || []) {
    (DIALOG[sc.disparador] = DIALOG[sc.disparador] || []).push(...sc.lineas.map(text => ({
      who: sc.personaje, img: img(sc.personaje), text, mood: EMO_MOOD[sc.emocion] || null, scene: sc.id,
    })));
  }
  // Líneas de un disparador (copia); si los datos faltan, se usan las líneas de respaldo del pack
  function L(trigger, fallback) { const l = DIALOG[trigger]; return l && l.length ? l.map(x => Object.assign({}, x)) : (fallback || []); }

  let queue = [], onDone = null;
  const talk = { who: '', until: 0, mood: 'neutral' };
  function moodOf(text) {
    if (/…\s*$|perdido|inund|no tenemos/i.test(text)) return 'sad';
    if (/^¡|!\s*$|gracias|logramos/i.test(text)) return 'happy';
    if (/\?\s*$/.test(text)) return 'curious';
    return 'neutral';
  }
  // La línea a la vista mueve el pico del protagonista (talk) mientras la "dice" y pone cara según el tono
  function hablar(l) {
    talk.who = l.who; talk.until = performance.now() + Math.min(5000, 600 + l.text.length * 55);
    talk.mood = l.mood || moodOf(l.text);
  }
  // Retrato de la línea; sin imagen no se pone src vacío (el navegador pediría la propia página): se oculta
  function retrato(el, src, who) {
    if (src) { if (el.getAttribute('src') !== src) el.src = src; el.alt = who || ''; el.hidden = false; }
    else { el.removeAttribute('src'); el.alt = ''; el.hidden = true; }
  }
  function say(lines, done, opts) {
    if (opts && opts.libre) { sayLibre(lines, done); return; }
    queue = lines.slice(); onDone = done || null; nextCaja();
  }
  function nextCaja() {
    const l = queue.shift();
    if (!l) { $('dialog').hidden = true; const d = onDone; onDone = null; if (d) d(); return; }
    $('d-who').textContent = l.who; $('d-text').lang = l.lang || ''; $('d-text').textContent = l.text; retrato($('d-img'), l.img || img(l.who), l.who);
    $('dialog').hidden = false;
    hablar(l);
    if (l.onShow) l.onShow(G);
  }
  $('d-next').onclick = () => nextCaja();
  function open() { return !$('dialog').hidden; }

  // ---------- Bocadillos libres (no paran el juego) ----------
  // DOM y estilo los pone este módulo (ni index.html ni ui.css): bajo el aviso de acción en PC; en el móvil, sobre el aviso
  // para no tapar la palanca ni los botones. Con una caja o una tarjeta abiertas se esconden (CSS) y su reloj se para.
  const LIBRE = { min: 2.4, max: 7, base: 0.9, porCar: 0.055 }; // s en pantalla: base + caracteres × porCar, entre min y max
  let libreQ = [], libreDone = null, libreCur = null, libreT = 0;
  let caja = null;
  function bocadillo() {
    if (caja) return caja;
    if (!document.getElementById('bocadillos-css')) {
      const st = document.createElement('style'); st.id = 'bocadillos-css';
      st.textContent =
        '#bocadillos{position:fixed;left:0;right:0;margin-inline:auto;width:fit-content;max-width:min(620px,calc(100vw - 32px));bottom:calc(env(safe-area-inset-bottom,0px) + 140px);z-index:var(--z-hud,5);display:flex;justify-content:center;pointer-events:none}' +
        '#bocadillos[hidden]{display:none}' +
        '.bocadillo{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:8px 20px 8px 8px;background:var(--c-paper,#fff8e8);color:var(--c-ink,#2b2118);border-radius:999px;' +
        'box-shadow:0 4px 0 var(--c-paper-edge,#d9c7a3),0 8px 24px rgba(0,0,0,.28);font:400 17px/1.3 var(--font-body,sans-serif);cursor:pointer;animation:bl-in .25s ease-out both;text-wrap:pretty}' +
        '.bocadillo img{width:46px;height:46px;border-radius:50%;object-fit:cover;object-position:50% 20%;background:#e9dcc2;flex:none}' +
        '.bocadillo img[hidden]{display:none}' +
        '.bocadillo b{display:block;font:700 12px/1.2 var(--font-display,sans-serif);text-transform:uppercase;letter-spacing:.06em;color:var(--c-eyebrow,#7a5634)}' +
        'body:has(#dialog:not([hidden])) #bocadillos,body:has(#card:not([hidden])) #bocadillos{visibility:hidden}' +
        '@keyframes bl-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
        '@media (prefers-reduced-motion:reduce){.bocadillo{animation:none}}' +
        '@media (hover:none),(pointer:coarse){#bocadillos{max-width:min(560px,calc(100vw - 320px))}}' +
        '@media (max-width:560px){#bocadillos{left:max(12px,env(safe-area-inset-left,0px));right:auto;margin-inline:0;bottom:calc(env(safe-area-inset-bottom,0px) + 330px);max-width:calc(100vw - 24px - 56px)}.bocadillo{font-size:15px;border-radius:18px}.bocadillo img{width:38px;height:38px}}' +
        '@media (max-height:520px) and (orientation:landscape){#bocadillos{bottom:calc(env(safe-area-inset-bottom,0px) + 70px);max-width:min(480px,calc(100vw - 360px))}}';
      document.head.appendChild(st);
    }
    const c = document.createElement('div'); c.id = 'bocadillos'; c.className = 'hud'; c.hidden = true;
    c.setAttribute('aria-live', 'polite');
    c.innerHTML = '<div class="bocadillo" id="bocadillo" role="status"><img id="bl-img" alt=""><div class="bl-txt"><b id="bl-who"></b><span id="bl-text"></span></div></div>';
    document.body.appendChild(c);
    c.firstElementChild.addEventListener('click', () => { if (libreCur) nextLibre(); });
    return (caja = c);
  }
  function sayLibre(lines, done) {
    const prev = libreDone;
    libreQ.push(...lines); if (done) libreDone = prev ? () => { prev(); done(); } : done;
    if (!libreCur) nextLibre();
  }
  function nextLibre() {
    const c = bocadillo();
    const l = libreQ.shift();
    if (!l) { libreCur = null; c.hidden = true; const d = libreDone; libreDone = null; if (d) d(); return; }
    libreCur = l; libreT = Math.min(LIBRE.max, Math.max(LIBRE.min, LIBRE.base + l.text.length * LIBRE.porCar));
    $('bl-who').textContent = l.who; const t = $('bl-text'); t.lang = l.lang || ''; t.textContent = l.text;
    retrato($('bl-img'), l.img || img(l.who), l.who);
    c.hidden = false;
    hablar(l);
    if (l.onShow) l.onShow(G);
  }
  // Corta los bocadillos y devuelve lo que faltaba por decir (la línea a la vista incluida)
  function cancelarLibre() {
    const rest = libreCur ? [libreCur, ...libreQ] : libreQ.slice();
    libreQ = []; libreCur = null; libreDone = null; if (caja) caja.hidden = true;
    return rest;
  }
  // Tiempo del juego (se puede probar con tick()); con la caja o una tarjeta abiertas, espera
  G.on('update', dt => {
    if (!libreCur || open() || G.ui.cardOpen) return;
    libreT -= dt; if (libreT <= 0) nextLibre();
  }, 84);

  function next() { if (open()) nextCaja(); else if (libreCur) nextLibre(); else nextCaja(); }
  function libre() { return libreCur; }
  function activo() { return open() || !!libreCur; }
  function actual() {
    if (open()) return { who: $('d-who').textContent, text: $('d-text').textContent, img: $('d-img').getAttribute('src') || '', libre: false };
    if (libreCur) return { who: libreCur.who, text: libreCur.text, img: libreCur.img || img(libreCur.who), libre: true };
    return null;
  }
  function clear() { $('dialog').hidden = true; queue = []; onDone = null; cancelarLibre(); }
  // Elección de diálogo: cambia la frase de respuesta, no el desenlace
  function choose(line, options, done) {
    G.ui.showCard(`<h2>${line.who}</h2><p>${line.text}</p><div class="row">${options.map((o, i) => `<button class="btn" id="ch-${i}" type="button">${o.label}</button>`).join('')}</div>`);
    options.forEach((o, i) => { $('ch-' + i).onclick = () => { G.ui.hideCard(); done(o); }; });
    const b = $('ch-0'); if (b) b.focus();
  }
  G.on('apply', () => { G.ui.hideCard(); clear(); }, 45);

  return { L, say, next, open, libre, activo, actual, cancelarLibre, clear, choose, talk, moodOf, img, LIBRE,
    get queue() { return open() ? queue : libreCur ? libreQ : queue; }, escenas: data.escenas || [] };
});
