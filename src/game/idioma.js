/* Juego · idioma (U1: inglés completo, listo para activarse)
   El juego se escribe en español; el inglés vive en un diccionario aparte (content/cap1/en.js, window.AV_EN: «texto ES» → «text EN»,
   con {} donde va un dato que cambia: «Coquíes {}/{}» → «Coquís {}/{}»). Solo se descarga cuando el idioma es EN, así que la
   descarga inicial no cambia. No toca la lógica: traduce lo que ya está en pantalla (nodos de texto y los atributos title,
   aria-label, placeholder y alt) con un MutationObserver que solo existe mientras el idioma es EN; al volver a ES se restaura
   el texto original. El idioma por defecto es ES; el cambio se hace en el Aula (menú de pausa: chips ES/EN) y se guarda ahí.
   Un texto sin entrada en el diccionario se queda en español (no se inventa nada). Se omiten los nodos con lang="es" o data-no-tr.
   API: G.idioma = { actual(), activo(), poner('es'|'en'), tr(texto), listo (Promise), faltan(), test }. Prueba: AV.idiomaTest(). */
AVE.module('idioma', function (G) {
  'use strict';
  // pack.idioma: una ruta o una lista (se cargan en orden; p. ej. el ep. 2 suma content/ep2/en.js al de cap1)
  const RUTAS = [].concat((G.pack && G.pack.idioma) || 'content/cap1/en.js');
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  const ACENTO = /[áéíóúñüÁÉÍÓÚÑ¿¡]/;
  const PALABRA = /(?:^|[\s«"(¡¿])(el|la|los|las|de|del|que|con|para|por|una?|tu|tus|te|se|es|al|su|mi|no|hay|más|muy|ya|vamos|hola|pulsa|toca|usa|elige|sigue|busca|ve|cierra|abre|aún|sin|ahora|otra|otro|cerca|hasta|desde|todo|todos|esta|este|eso|aquí|allí|qué|cómo|dónde)(?=$|[\s.,;:!?»")])/i;
  const esEs = s => ACENTO.test(s) || PALABRA.test(s);
  // Nombres propios y palabras del lugar que se quedan como son en inglés (con tilde o artículo en español)
  const NOMBRES = /(El Yunque|Villa Raíz|Río Abajo|Flamboyán|Co-quí|Pava jíbara|Raíz|Río|María|José|Coquí|coquí|coquís|Taíno|taíno|jíbaro|jíbara|güiro|Güiro|Iguaca|Maricao|Loíza|Yokahú|Caguana|Utuado|flamboyán|yagrumo|tabonuco|ceiba|Mina|Dajao|Boricua|boricua|Wepa|Pa'lante|Apóstol|vejigante|pavas?|quí|Quí)/g;
  // Lo que queda en español en un texto (ya traducido o no), sin contar esos nombres
  const resto = s => { const t = s.replace(NOMBRES, ' '); return ACENTO.test(t) || /\b(el|la|los|las|de|del|que|con|para|por|una|tu|tus|te|se|al|su|mi|hay|más|muy|ya|sin|aún)\b/i.test(t); };

  let lang = 'es', dic = null, cargando = null, obs = null;
  let exactas = new Map(), patrones = [], frases = [];
  const cache = new Map();
  const origTxt = new WeakMap(), origAttr = new WeakMap();
  const nodosVistos = new Set(); // WeakRef: para poder restaurar sin recorrer todo el DOM dos veces
  const tmp = { listo: Promise.resolve() };

  const norm = s => String(s).replace(/\s+/g, ' ').trim();
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function compilar(d) {
    exactas = new Map(); patrones = []; frases = [];
    for (const k of Object.keys(d)) {
      const v = d[k];
      if (k.indexOf('{}') < 0) { exactas.set(k, v); if (k.length >= 6) frases.push(k); continue; }
      const partes = k.split('{}');
      // Si casi no hay letras fijas («{} de {}»), los datos tienen que ser números o signos: no se parte una frase cualquiera
      const letras = partes.join('').replace(/[^\p{L}]/gu, '').length;
      const re = new RegExp('^' + partes.map(reEsc).join(letras < 8 ? '([\\d.,:%+\\-–/×# ]+?)' : '(.+?)') + '$');
      const lit = partes[0].slice(0, 3);
      patrones.push({ re, v, lit, n: partes.length - 1 });
    }
    frases.sort((a, b) => b.length - a.length);
    patrones.sort((a, b) => b.lit.length - a.lit.length || b.re.source.length - a.re.source.length);
    cache.clear();
  }

  function rellenar(v, caps) {
    let i = 0;
    return v.replace(/\{\}/g, () => (i < caps.length ? tr(caps[i++]) : ''));
  }

  // Traduce un texto (sin espacios de sobra) o lo devuelve igual
  function traducir(t) {
    const e = exactas.get(t);
    if (e != null) return e;
    for (const p of patrones) {
      if (p.lit && t.indexOf(p.lit) !== 0) continue;
      const m = p.re.exec(t);
      if (m) return rellenar(p.v, m.slice(1));
    }
    if (!esEs(t)) return t;
    // Frases enteras dentro de un texto armado con trozos (p. ej. «Vuela hasta Iguaca, en» + lugar)
    let r = t, cambio = false;
    for (const f of frases) {
      const i = r.indexOf(f);
      if (i < 0) continue;
      const antes = i === 0 || /[^\p{L}]/u.test(r[i - 1]), despues = i + f.length >= r.length || /[^\p{L}]/u.test(r[i + f.length]);
      if (!antes || !despues) continue;
      r = r.split(f).join(exactas.get(f)); cambio = true;
    }
    return cambio ? r : t;
  }

  function tr(texto) {
    if (lang !== 'en' || !dic || texto == null) return texto;
    const s = String(texto);
    if (!/\p{L}/u.test(s)) return s;
    const t = norm(s);
    let r = cache.get(t);
    if (r === undefined) {
      r = traducir(t);
      if (cache.size > 4000) cache.clear();
      cache.set(t, r);
    }
    if (r === t) return s;
    const ini = s.match(/^\s*/)[0], fin = s.match(/\s*$/)[0];
    return ini + r + fin;
  }

  const ignorar = el => {
    if (!el || el.nodeType !== 1) return false;
    const n = el.nodeName;
    if (n === 'SCRIPT' || n === 'STYLE' || n === 'TEXTAREA' || n === 'CANVAS') return true;
    return !!(el.closest && el.closest('[lang="es"],[data-no-tr]'));
  };

  function nodoTexto(n) {
    const p = n.parentNode;
    if (!p || ignorar(p)) return;
    const ya = origTxt.get(n);
    const act = n.data;
    if (ya && ya.en === act) return; // lo acabamos de poner nosotros
    const en = tr(act);
    if (en === act) { if (ya) origTxt.delete(n); return; }
    origTxt.set(n, { es: act, en });
    nodosVistos.add(new WeakRef(n));
    n.data = en;
    if (p.id === 'd-text' || p.id === 'bl-text') p.lang = 'en';
  }

  function atributos(el) {
    if (ignorar(el)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const reg = origAttr.get(el);
      if (reg && reg[a] && reg[a].en === v) continue;
      const en = tr(v);
      if (en === v) { if (reg && reg[a]) delete reg[a]; continue; }
      const r = reg || {}; r[a] = { es: v, en }; origAttr.set(el, r);
      nodosVistos.add(new WeakRef(el));
      el.setAttribute(a, en);
    }
  }

  function recorrer(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { nodoTexto(raiz); return; }
    if (raiz.nodeType !== 1 || ignorar(raiz)) return;
    atributos(raiz);
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) nodoTexto(n); else if (n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE') { /* sin tocar */ } else atributos(n);
    }
  }

  function observar() {
    if (obs || !window.MutationObserver) return;
    obs = new MutationObserver(lista => {
      for (const m of lista) {
        if (m.type === 'childList') m.addedNodes.forEach(recorrer);
        else if (m.type === 'characterData') nodoTexto(m.target);
        else if (m.type === 'attributes') atributos(m.target);
      }
    });
    obs.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ATTRS });
  }

  function restaurar() {
    if (obs) { obs.disconnect(); obs = null; }
    for (const ref of nodosVistos) {
      const n = ref.deref();
      if (!n) continue;
      if (n.nodeType === 3) { const o = origTxt.get(n); if (o && n.data === o.en) n.data = o.es; origTxt.delete(n); }
      else { const r = origAttr.get(n); if (r) for (const a of Object.keys(r)) if (n.getAttribute(a) === r[a].en) n.setAttribute(a, r[a].es); origAttr.delete(n); }
    }
    nodosVistos.clear();
    for (const id of ['d-text', 'bl-text']) { const e = document.getElementById(id); if (e && e.lang === 'en') e.lang = ''; }
  }

  function cargarDic() {
    if (dic) return Promise.resolve(dic);
    if (!cargando) {
      cargando = (window.AV_EN ? Promise.resolve() : RUTAS.reduce((p, r) => p.then(() => AVE.assets.script(r)), Promise.resolve())).then(() => { dic = window.AV_EN || {}; compilar(dic); return dic; },
        e => { cargando = null; throw e; });
    }
    return cargando;
  }

  function poner(l) {
    l = l === 'en' ? 'en' : 'es';
    if (l === lang && (l === 'es' || obs)) return tmp.listo;
    if (l === 'es') { lang = 'es'; restaurar(); document.documentElement.lang = 'es'; tmp.listo = Promise.resolve(); return tmp.listo; }
    lang = 'en';
    tmp.listo = cargarDic().then(() => { if (lang !== 'en') return; document.documentElement.lang = 'en'; observar(); recorrer(document.body); }, () => { /* sin diccionario: sigue en español */ });
    return tmp.listo;
  }

  // Lo que el aula dice y lo que se guardó
  G.on('aula', (k, v) => { if (k === 'idioma') poner(v); });
  G.on('apply', () => { poner(G.aula && G.aula.aj && G.aula.aj.idioma); }, 90);
  const inicial = G.aula && G.aula.aj && G.aula.aj.idioma;
  if (inicial === 'en') poner('en');

  // ---------- Prueba: ningún texto visible sin EN ----------
  // Recoge los textos de la interfaz (también los paneles cerrados: portada, pausa, tarjetas) y los de los datos (diálogos, misiones)
  // y comprueba que tengan EN.
  function textosVisibles() {
    const fuera = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const p = n.parentNode;
      if (!p || ignorar(p) || !/\p{L}/u.test(n.data)) continue;
      if (p.closest && p.closest('#dialog[hidden]')) continue; // línea que quedó de un diálogo ya cerrado
      const t = norm(n.data);
      if (resto(t)) fuera.push(t);
    }
    return fuera;
  }
  function faltan(textos) { return textos.filter(t => { if (exactas.has(t)) return false; const d = lang; lang = 'en'; const r = tr(t); lang = d; return r === t && esEs(t); }); }


  // Recorre las pantallas de la interfaz (abre cada una, también las que se arman al abrirse) y junta lo que sigue en español
  async function pantallas() {
    const esp = ms => new Promise(r => setTimeout(r, ms));
    const $ = id => document.getElementById(id);
    const sal = {}, uni = a => a.filter((t, i) => a.indexOf(t) === i);
    const toma = async (nombre, abrir, cerrar, extra) => {
      try {
        await abrir(); await esp(250);
        let v = textosVisibles();
        if (extra) { for (const f of await extra()) { await esp(150); v = v.concat(textosVisibles()); } }
        sal[nombre] = uni(v);
      } catch (e) { sal[nombre] = ['(error: ' + e.message + ')']; }
      try { if (cerrar) await cerrar(); } catch (e) { /* ya cerrada */ }
      await esp(120);
    };
    const pausa = $('pause');
    const popAbrir = () => { try { if (pausa && pausa.showPopover && !pausa.matches(':popover-open')) pausa.showPopover(); } catch (e) { /* sin popover */ } };
    const popCerrar = () => { try { if (pausa && pausa.matches(':popover-open')) pausa.hidePopover(); } catch (e) { /* sin popover */ } };
    await toma('pausa', popAbrir, popCerrar);
    await toma('menu de modos', () => G.menuModos && G.menuModos.mostrar(), () => { const d = $('modos'); if (d && d.open) d.close(); });
    await toma('mis records', () => { popAbrir(); const b = $('b-records'); if (b) b.click(); }, () => { const r = $('records'); const c = r && r.querySelector('[data-cerrar],.rec-cerrar,button'); if (r && !r.hidden && c) c.click(); popCerrar(); });
    await toma('retos', () => { const b = $('b-retos'); if (b) b.click(); }, () => { popCerrar(); });
    await toma('criadero', () => G.criadero && G.criadero.abrir(), () => G.criadero && G.criadero.cerrar());
    await toma('comic', () => { const b = $('b-comic-menu'); if (b) b.click(); }, () => { const c = $('c-close'); if (c) c.click(); });
    await toma('creador', () => G.creador && G.creador.open(false), () => G.creador && G.creador.close());
    await toma('capitulos', () => { const b = $('b-capitulos'); if (b) b.click(); }, () => { const c = $('b-capitulos-cerrar'); if (c) c.click(); });
    await toma('modo maestro', () => G.aula && G.aula.abrirMaestro(), () => G.aula && G.aula.cerrarMaestro(), async () => {
      const ts = [...document.querySelectorAll('#maestro [role="tab"], #maestro .m-tab, #maestro nav button')];
      ts.forEach((b, i) => setTimeout(() => b.click(), 0));
      return ts;
    });
    await toma('fin del capitulo', () => { const e = $('end'); if (e) e.hidden = false; }, () => { const e = $('end'); if (e) e.hidden = true; });
    popCerrar();
    return sal;
  }

  async function test(o) {
    o = o || {};
    const R = [], ok = (name, c, extra) => R.push({ name, ok: !!c, extra: extra == null ? '' : String(extra) });
    const antes = lang;
    await cargarDic();
    const claves = Object.keys(dic);
    ok('El diccionario EN carga y tiene más de 700 textos', claves.length > 700, claves.length);
    ok('Ninguna traducción está vacía', claves.every(k => typeof dic[k] === 'string' && dic[k].trim()), claves.filter(k => !String(dic[k]).trim()).slice(0, 3).join(' | '));
    ok('Los datos {} coinciden entre ES y EN', claves.every(k => k.split('{}').length === String(dic[k]).split('{}').length),
      claves.filter(k => k.split('{}').length !== String(dic[k]).split('{}').length).slice(0, 3).join(' | '));
    const ts = (G.dialogo && G.dialogo.escenas || []).flatMap(s => s.lineas || []);
    const sinDlg = faltan(ts.map(norm));
    ok('Todas las líneas de diálogo tienen EN (' + ts.length + ')', ts.length > 0 && !sinDlg.length, sinDlg.slice(0, 15).join(' | '));
    const ms = (G.pack.misiones || []).flatMap(m => [m.titulo, typeof m.hud === 'string' ? m.hud : null].concat((m.pasos || []).map(p => p.texto && p.texto.length > 3 && !/^p\d$/.test(p.texto) ? p.texto : null))).filter(Boolean);
    const sinMis = faltan(ms.map(norm));
    ok('Títulos, avisos y pasos de misión tienen EN (' + ms.length + ')', !sinMis.length, sinMis.slice(0, 15).join(' | '));
    // Ejemplos con datos y trozos armados
    const dd = { d: lang };
    lang = 'en';
    ok('Un texto con datos se traduce («Coquíes 1/3»)', tr('Coquíes 1/3') === 'Coquís 1/3', tr('Coquíes 1/3'));
    ok('Un texto sin entrada se queda igual', tr('Zzz qué cosa rara') === 'Zzz qué cosa rara');
    ok('Iguaca se queda como «Iguaca»', tr('Hablar con Iguaca') === 'Talk to Iguaca', tr('Hablar con Iguaca'));
    lang = dd.d;
    // En pantalla: con EN puesto, ningún texto español visible
    const aula = G.aula && G.aula.setAjuste ? G.aula : null, idAntes = aula ? aula.aj.idioma : null;
    if (aula) aula.setAjuste('idioma', 'en'); else poner('en');
    await tmp.listo; await new Promise(r => setTimeout(r, 150));
    const vis = textosVisibles();
    const visFalta = vis.filter((t, i) => vis.indexOf(t) === i);
    ok('Con EN puesto, no queda texto en español en la interfaz (' + vis.length + ')', !visFalta.length, visFalta.slice(0, 60).join(' | '));
    const pan = await pantallas();
    for (const k of Object.keys(pan)) { const f = pan[k]; ok('Pantalla «' + k + '» sin texto en español (' + f.length + ')', !f.length, f.slice(0, 200).join(' | ')); }
    // Diálogo en pantalla
    if (G.dialogo && ts.length) {
      const l = { who: 'Vittata', text: ts[0] };
      G.dialogo.say([l], null); await new Promise(r => setTimeout(r, 60));
      const vt = document.getElementById('d-text') && document.getElementById('d-text').textContent;
      ok('El diálogo sale en inglés', vt && vt !== ts[0] && !esEs(vt), vt);
      ok('El texto en inglés se lee con voz inglesa (lang="en")', document.getElementById('d-text').lang === 'en');
      G.dialogo.clear();
    }
    const rotuloHud = modo => {
      const ol = document.getElementById('steps');
      const quest = document.getElementById('quest');
      if (!ol) return '';
      const abierto = quest && quest.classList.contains('abierto');
      if (quest) quest.classList.add('abierto');
      const ahora = [...ol.querySelectorAll('li.now')];
      const li = document.createElement('li');
      let c = '';
      if (modo === 'fin') {
        ahora.forEach(n => n.classList.remove('now'));
        li.className = 'done';
        ol.appendChild(li);
        c = getComputedStyle(ol, '::after').content;
      } else {
        li.className = 'now';
        ol.appendChild(li);
        c = getComputedStyle(li, '::after').content;
      }
      li.remove();
      ahora.forEach(n => n.classList.add('now'));
      if (quest && !abierto) quest.classList.remove('abierto');
      return c;
    };
    const enObj = rotuloHud('ahora'), enFin = rotuloHud('fin');
    ok('El rótulo del objetivo sale en inglés (Goal, no Objetivo)', /Goal/.test(enObj) && !/Objetivo/.test(enObj), enObj);
    ok('Al terminar los pasos el rótulo sale en inglés', /Chapter complete/.test(enFin) && !/Capítulo/.test(enFin), enFin);
    if (aula) aula.setAjuste('idioma', 'es'); else poner('es');
    await tmp.listo; await new Promise(r => setTimeout(r, 60));
    const esObj = rotuloHud('ahora');
    ok('El rótulo del objetivo vuelve a español', /Objetivo/.test(esObj) && !/Goal/.test(esObj), esObj);
    ok('Al volver a ES, el texto original se restaura', !document.querySelector('#d-text[lang="en"]') && (document.getElementById('b-menu').getAttribute('aria-label') === 'Pausa y opciones'));
    ok('El idioma por defecto sigue en español', lang === 'es' && document.documentElement.lang === 'es');
    if (aula && idAntes) aula.setAjuste('idioma', idAntes); else if (antes === 'en') poner('en');
    return { ok: R.every(r => r.ok), passed: R.filter(r => r.ok).length, total: R.length, results: R };
  }

  G.idioma = { actual: () => lang, activo: () => lang === 'en', poner, tr, get listo() { return tmp.listo; }, faltan, textosVisibles, pantallas, test };
  return G.idioma;
});
