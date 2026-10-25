/* Juego · diálogo
   Caja de diálogo (#dialog), cola de líneas, elecciones que cambian la frase (no el desenlace) y estado "talk"
   para que el modelo 3D mueva el pico y ponga cara.
   Datos: pack.dialogos { datos: () => { escenas: [{ id, disparador, personaje, emocion, lineas }] }, retratos: { personaje: img },
   retratoDefecto, emociones: { emocion: mood } }. Disparadores: "evento:<Clave>", "inicio:<momento>", "interact:<objeto>";
   las escenas del mismo disparador se encadenan en orden.
   Línea = { who, img, text, mood?, onShow?, lang? } (lang marca el idioma de la línea en #d-text: lectores y voz). */
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
  // Retrato de la línea; sin imagen no se pone src vacío (el navegador pediría la propia página): se oculta
  function retrato(src, who) {
    const el = $('d-img');
    if (src) { if (el.getAttribute('src') !== src) el.src = src; el.alt = who || ''; el.hidden = false; }
    else { el.removeAttribute('src'); el.alt = ''; el.hidden = true; }
  }
  function say(lines, done) { queue = lines.slice(); onDone = done || null; next(); }
  function next() {
    const l = queue.shift();
    if (!l) { $('dialog').hidden = true; const d = onDone; onDone = null; if (d) d(); return; }
    $('d-who').textContent = l.who; $('d-text').lang = l.lang || ''; $('d-text').textContent = l.text; retrato(l.img || img(l.who), l.who);
    $('dialog').hidden = false;
    // El protagonista en 3D mueve el pico mientras "dice" la línea y pone cara según el tono
    talk.who = l.who; talk.until = performance.now() + Math.min(5000, 600 + l.text.length * 55);
    talk.mood = l.mood || moodOf(l.text);
    if (l.onShow) l.onShow(G);
  }
  $('d-next').onclick = next;
  function open() { return !$('dialog').hidden; }
  function clear() { $('dialog').hidden = true; queue = []; onDone = null; }
  // Elección de diálogo: cambia la frase de respuesta, no el desenlace
  function choose(line, options, done) {
    G.ui.showCard(`<h2>${line.who}</h2><p>${line.text}</p><div class="row">${options.map((o, i) => `<button class="btn" id="ch-${i}" type="button">${o.label}</button>`).join('')}</div>`);
    options.forEach((o, i) => { $('ch-' + i).onclick = () => { G.ui.hideCard(); done(o); }; });
    const b = $('ch-0'); if (b) b.focus();
  }
  G.on('apply', () => { G.ui.hideCard(); clear(); }, 45);

  return { L, say, next, open, clear, choose, talk, moodOf, img, get queue() { return queue; }, escenas: data.escenas || [] };
});
