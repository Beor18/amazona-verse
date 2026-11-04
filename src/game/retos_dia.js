/* Juego · CG-52. Retos del día. Tres retos cortos, distintos cada día, solo en este dispositivo.
   La semilla es la fecha local. No hay racha, ni aviso del sistema, ni compra.
   La insignia la pinta htmlRecords() dentro de «Mis récords». La lista se ve en la pausa.
   window no hace falta: AVE.module. Prueba: AV.retosDiaTest(). */
AVE.module('retosDia', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.retosDia';
  const POOL = [
    { id: 'tonel_rio', es: 'Haz un tonel sobre el río', en: 'Do a barrel roll over the river' },
    { id: 'pichones', es: 'Encuentra a los pichones en 90 s', en: 'Find the chicks in 90 s' },
    { id: 'tejado', es: 'Pósate en un tejado alto de la ciudad', en: 'Land on a high roof in the city' },
    { id: 'reir', es: 'Haz reír a un vecino', en: 'Make a neighbor laugh' },
    { id: 'marana', es: 'Limpia un rastro de fantasía', en: 'Clear a make-believe trail' },
    { id: 'perfecto', es: 'Haz un aterrizaje perfecto', en: 'Stick a perfect landing' },
    { id: 'looping', es: 'Haz un looping', en: 'Do a loop' },
    { id: 'sorpresa', es: 'Mira una sorpresa de la ciudad', en: 'Watch a city surprise' },
  ];
  const porId = {};
  for (let i = 0; i < POOL.length; i++) porId[POOL[i].id] = POOL[i];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const en = () => !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const txt = r => (en() ? r.en : r.es);

  function semilla(fecha) {
    let h = 2166136261;
    for (let i = 0; i < fecha.length; i++) h = Math.imul(h ^ fecha.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function elegir(fecha) {
    let s = semilla(String(fecha || ''));
    const usados = {};
    const out = [];
    let guard = 0;
    while (out.length < 3 && guard++ < 40) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const i = s % POOL.length;
      if (usados[i]) continue;
      usados[i] = 1;
      out.push(POOL[i].id);
    }
    return out;
  }
  function fechaHoy() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  let fechaForzada = null;
  let memoria = { v: 1, fecha: '', hechos: [] };
  let hoyIds = [];
  function fechaActiva() { return fechaForzada || fechaHoy(); }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, fecha: memoria.fecha, hechos: memoria.hechos })); } catch (e) { /* sin almacén */ }
  }
  function cargar() {
    const f = fechaActiva();
    try {
      const d = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (d && d.v === 1 && d.fecha === f && Array.isArray(d.hechos)) {
        memoria = { v: 1, fecha: f, hechos: d.hechos.filter(id => typeof id === 'string' && porId[id]) };
        hoyIds = elegir(f);
        return;
      }
    } catch (e) { /* sin almacén */ }
    memoria = { v: 1, fecha: f, hechos: [] };
    hoyIds = elegir(f);
  }
  cargar();

  function asegurarDia() {
    const f = fechaActiva();
    if (memoria.fecha === f) return;
    memoria = { v: 1, fecha: f, hechos: [] };
    hoyIds = elegir(f);
    guardar();
    pintar();
  }
  function usarFecha(f) {
    fechaForzada = f || null;
    const fecha = fechaActiva();
    if (memoria.fecha !== fecha) {
      memoria = { v: 1, fecha, hechos: [] };
      guardar();
    }
    hoyIds = elegir(fecha);
    pintar();
    return hoyIds.slice();
  }
  function completar(id) {
    asegurarDia();
    if (!porId[id] || hoyIds.indexOf(id) < 0 || memoria.hechos.indexOf(id) >= 0) return false;
    memoria.hechos.push(id);
    guardar();
    pintar();
    if (G.ui && G.ui.toast && !G.quiet) G.ui.toast(en() ? 'Daily challenge done!' : '¡Reto del día!', 1600);
    return true;
  }

  function sobreRio() {
    if (!G.agua || !G.agua.levelAt || !G.terreno) return false;
    const w = G.agua.levelAt(S.pos.x, S.pos.z);
    const suelo = G.terreno.height(S.pos.x, S.pos.z);
    return isFinite(w) && isFinite(suelo) && w - suelo > 0.5 && Math.abs(S.pos.y - w) < 14;
  }
  G.on('truco', id => {
    if (id === 'tonel' && sobreRio()) completar('tonel_rio');
    else if (id === 'looping') completar('looping');
    else if (id === 'perfecto') completar('perfecto');
  });
  G.on('record', r => { if (r && r.modo === 'escondite' && typeof r.segundos === 'number' && r.segundos <= 90) completar('pichones'); });
  G.on('momento', m => { if (m && typeof m.id === 'string' && m.id.indexOf('marana-') === 0) completar('marana'); });
  G.on('sorpresa', () => completar('sorpresa'));
  let verRisa = false;
  G.on('vuelo', on => {
    if (on) return;
    const suelo = G.terreno.height(S.pos.x, S.pos.z);
    if (Math.hypot(S.pos.x - 11, S.pos.z + 76) < 90 && S.pos.y - suelo > 3.2) completar('tejado');
    verRisa = true;
  });
  let reloj = 0;
  G.on('update', dt => {
    if (verRisa) { verRisa = false; if (G.humor && G.humor.ultimo === 'risa') completar('reir'); }
    if (G.quiet) return;
    reloj += dt || 0;
    if (reloj < 30) return;
    reloj = 0;
    asegurarDia();
  });

  function seccion() {
    const menu = $('pause');
    if (!menu || menu.querySelector('#pause-retos-dia')) return;
    const sec = document.createElement('section');
    sec.id = 'pause-retos-dia';
    sec.innerHTML = '<h3></h3><p></p><ol></ol>';
    const ayuda = menu.querySelector('.pause-help');
    if (ayuda) menu.insertBefore(sec, ayuda); else menu.appendChild(sec);
  }
  function pintar() {
    const sec = document.getElementById('pause-retos-dia');
    if (!sec) return;
    sec.querySelector('h3').textContent = en() ? "Today's challenges" : 'Retos de hoy';
    sec.querySelector('p').textContent = en() ? 'Tomorrow there are new ones. No streaks.' : 'Mañana hay otros. Sin rachas.';
    sec.querySelector('ol').innerHTML = hoyIds.map(id => {
      const hecho = memoria.hechos.indexOf(id) >= 0;
      return '<li class="' + (hecho ? 'hecha' : '') + '"><span class="rd-pt" style="--fill:' + (hecho ? '1' : '0') + '"></span><span>' + esc(txt(porId[id])) + '</span></li>';
    }).join('');
  }
  seccion();
  pintar();
  G.on('aula', pintar);

  function htmlRecords() {
    const n = memoria.hechos.length;
    const titulo = en() ? "Today's challenges" : 'Retos de hoy';
    const nota = en() ? 'They change tomorrow. No streaks.' : 'Mañana cambian. Sin rachas.';
    return '<section class="rec-sec" id="rec-retos-dia" aria-labelledby="rec-h-dia"><h3 id="rec-h-dia">' + esc(titulo) + ' <small>' + esc(nota) + '</small></h3><ul class="rec-insignias"><li><span class="rec-ins" style="--fill:' + (n / 3).toFixed(3) + '" role="img" aria-label="' + esc(titulo) + '"><span>' + n + '/3</span></span><b>' + esc(titulo) + '</b><small>' + esc(nota) + '</small></li></ul></section>';
  }

  async function test() {
    const out = [], ok = (name, pass, extra) => out.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    let crudo = null; try { crudo = localStorage.getItem(CLAVE); } catch (e) { /* */ }
    const idiomaAntes = G.aula && G.aula.aj ? G.aula.aj.idioma : null;
    const q = G.quiet;
    try {
      const a = elegir('2026-11-04'), b = elegir('2026-11-04'), c = elegir('2026-11-05');
      ok('La misma fecha da los mismos tres retos', a.length === 3 && a.join() === b.join() && a.every(id => porId[id]), a.join(','));
      ok('Al día siguiente cambian', c.join() !== a.join() && c.length === 3, c.join(','));
      usarFecha('2026-11-04');
      ok('Ese día salen en la pausa', document.querySelectorAll('#pause-retos-dia li').length === 3, String(document.querySelectorAll('#pause-retos-dia li').length));
      G.quiet = true;
      G.emit('truco', 'looping');
      ok('Hacer el looping de hoy lo completa', memoria.hechos.indexOf('looping') >= 0);
      G.emit('truco', 'looping');
      ok('Repetirlo no lo cuenta dos veces', memoria.hechos.filter(id => id === 'looping').length === 1);
      ok('Un reto que no es de hoy no entra', completar('sorpresa') === false && memoria.hechos.indexOf('sorpresa') < 0);
      const guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}');
      ok('Se guarda la fecha y lo hecho, sin racha ni compra', guardado.fecha === '2026-11-04' && guardado.hechos.join() === 'looping' && !/racha|streak|compra|loot|notif/i.test(JSON.stringify(guardado)), JSON.stringify(guardado));
      usarFecha('2026-11-05');
      ok('El día nuevo empieza de cero', memoria.hechos.length === 0 && elegir('2026-11-05').join() === hoyIds.join());
      if (G.aula && G.aula.aj) {
        G.aula.aj.idioma = 'en'; pintar();
        const enTxt = document.getElementById('pause-retos-dia').textContent;
        ok('La pausa también está en inglés', /Today's challenges/.test(enTxt) && /No streaks/.test(enTxt) && !/¡/.test(enTxt), enTxt.replace(/\s+/g, ' ').slice(0, 140));
        G.aula.aj.idioma = idiomaAntes; pintar();
      }
      usarFecha('2026-11-04'); completar('looping');
      if (G.aula && G.aula.aj) G.aula.aj.idioma = 'es';
      const html = htmlRecords();
      ok('La insignia de Mis récords se llena con lo hecho', /1\/3/.test(html) && /--fill:0.333/.test(html) && /Retos de hoy/.test(html) && !/compra|loot/i.test(html), html.slice(0, 120));
      if (G.aula && G.aula.aj) { G.aula.aj.idioma = 'en'; }
      const htmlEn = htmlRecords();
      ok('La insignia también se llena en inglés', /1\/3/.test(htmlEn) && /Today(?:'|&#39;)s challenges/.test(htmlEn) && !/Retos de hoy/.test(htmlEn), htmlEn.slice(0, 140));
      if (window.AV && window.AV.records) {
        if (G.aula && G.aula.aj) G.aula.aj.idioma = 'es';
        await window.AV.records({ desde: 'portada' });
        const badge = () => document.querySelector('#rec-retos-dia');
        ok('Mis récords muestra los retos de hoy en español', !!badge() && /1\/3/.test(badge().textContent) && /Retos de hoy/.test(badge().textContent));
        if (G.aula && G.aula.aj) { G.aula.aj.idioma = 'en'; G.emit('aula'); }
        ok('Mis récords muestra los retos de hoy en inglés', !!badge() && /1\/3/.test(badge().textContent) && /Today's challenges/.test(badge().textContent) && !/Retos de hoy/.test(badge().textContent));
        if (G.recordsApi && G.recordsApi.cerrar) G.recordsApi.cerrar();
      }
    } catch (e) { ok('sin excepciones', false, String(e && e.stack || e).slice(0, 300)); }
    if (G.recordsApi && G.recordsApi.cerrar) { try { G.recordsApi.cerrar(); } catch (e) { /* */ } }
    G.quiet = q;
    fechaForzada = null;
    try { if (crudo == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, crudo); } catch (e) { /* */ }
    if (G.aula && G.aula.aj && idiomaAntes) G.aula.aj.idioma = idiomaAntes;
    cargar(); pintar();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  return { elegir, usarFecha, completar, htmlRecords, test, get hechos() { return memoria.hechos.slice(); }, get hoy() { return hoyIds.slice(); } };
});
