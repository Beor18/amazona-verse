/* Juego · cuenta de lugares descubiertos (DIVERSION_CAP1 § 3, mejora 2: «Descubriste: Poza Honda»)
   src/game/lugares.js ya descubre los lugares con nombre del mapa (G.terreno.pois y los asentamientos), los guarda en la
   partida (S.lugares) y saca el aviso; src/engine/fx.js pone el destello, el título grande y el acorde 'descubrir' al
   recibir G.emit('lugar'). Este módulo suma lo que faltaba para que «lo que gano se vea»:
   - Cuenta N/M: cuenta() = { n, m } sobre la lista viva de lugares (G.lugares.lista()); los ids viejos que ya no están en
     el mapa no cuentan. Una partida vieja sin S.lugares da 0/M (no se crea nada hasta descubrir el primero).
   - Aviso: htmlAviso(nombre) es el toast de lugares.js en dos líneas, «¡Descubriste Poza Honda!» y debajo
     htmlCuenta(), «Lugares descubiertos 3/27» (el toast es role=status aria-live=polite; un espacio entre las dos para
     que el lector de pantalla no las pegue). htmlCuenta() va también en el rótulo de los asentamientos. Al completar el mapa dice
     «¡Descubriste todos los lugares!» y suena 'unlock' (G.audio, solo lectura).
   - Diario: sección «Lugares descubiertos N/M» con barra y los nombres ya encontrados (los asentamientos tienen además su
     propia sección en lugares.js).
   - Pausa: la misma cuenta con barra (role=progressbar) bajo «Seguir jugando», al día cada vez que se abre el menú.
   Textos ES y EN con L() (como lugares.js) y data-no-tr. Sin animaciones propias: nada que quitar con «reducir movimiento».
   Funciona en todos los capítulos con el mapa real (pack.descubrir); sin lista de lugares no muestra nada.
   Pruebas: AV.descubrirTest(). */
AVE.module('descubrir', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const enIngles = () => !!((G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || (G.aula && G.aula.aj && G.aula.aj.idioma === 'en'));
  const L = (es, en) => (enIngles() ? en : es);
  const LG = () => G.lugares || null;

  // ---------- Cuenta ----------
  function lista() { const l = LG(); return l && l.lista ? l.lista() : []; }
  function cuenta() {
    const todos = lista(), hechos = Array.isArray(S.lugares) ? S.lugares : [];
    const n = todos.filter(p => hechos.includes(p.id)).length;
    return { n, m: todos.length, todos: n > 0 && n === todos.length };
  }
  const pct = c => (c.m ? Math.round((c.n / c.m) * 100) : 0);

  // ---------- Estilos (una vez) ----------
  const ESTILO = '.desc-titulo{display:block}.desc-cuenta{display:block;margin-top:2px;font:600 calc(13px * var(--fs-k,1))/1.3 var(--font-body,sans-serif);opacity:.9}' +
    '.desc-cuenta.todos{font-weight:800;opacity:1}#rotulo-lugar .desc-cuenta{color:#ffd23f}' +
    '.desc-barra{display:block;height:8px;border-radius:999px;background:rgba(127,127,127,.28);overflow:hidden;margin:6px 0 2px}' +
    '.desc-barra>i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2f8f4e,#ffd23f)}' +
    '.pause-lugares{margin:var(--sp-3,12px) 0 0;padding:var(--sp-3,12px) var(--sp-4,16px);border-radius:var(--r-lg,14px);background:rgba(244,247,241,.05);border:1px solid rgba(244,247,241,.1);color:var(--c-text,#fff)}' +
    '.pause-lugares .desc-fila{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font:700 var(--fs-sm,14px)/1.3 var(--font-body,sans-serif)}' +
    '.pause-lugares .desc-fila b{font:700 var(--fs-md,16px)/1 var(--font-display,sans-serif)}' +
    '.desc-diario{list-style:none;margin:4px 0 10px;padding:0;display:flex;flex-wrap:wrap;gap:6px}' +
    '.desc-diario li{padding:3px 10px;border-radius:999px;background:rgba(47,143,78,.14);border:1px solid rgba(47,143,78,.35);font-size:var(--fs-sm,14px)}' +
    '.desc-diario li.falta{background:none;border-style:dashed;opacity:.7}' +
    ':root.a11y-contraste .desc-barra{background:#fff}:root.a11y-contraste .desc-barra>i{background:#000;outline:2px solid #fff}' +
    ':root.a11y-contraste .pause-lugares{background:#000;border-color:#fff}';
  function estilos() {
    if (document.getElementById('estilo-descubrir')) return;
    const st = document.createElement('style'); st.id = 'estilo-descubrir'; st.textContent = ESTILO; document.head.appendChild(st);
  }
  estilos();

  const textoCuenta = c => (c.todos ? L('¡Descubriste todos los lugares!', 'You discovered every place!') : `${L('Lugares descubiertos', 'Places discovered')} ${c.n}/${c.m}`);
  // Línea para el aviso de lugares.js (vacía si el capítulo no tiene lugares)
  function htmlCuenta() {
    const c = cuenta();
    if (!c.m) return '';
    return ` <small class="desc-cuenta${c.todos ? ' todos' : ''}" data-no-tr>${esc(textoCuenta(c))}</small>`;
  }
  // El toast de «descubriste» (lugares.js): dos líneas, título y cuenta (en inglés, el nombre por el diccionario del juego)
  function htmlAviso(nombre) {
    const en = () => (G.idioma && G.idioma.tr ? G.idioma.tr(nombre) : nombre);
    return `<b class="desc-titulo" data-no-tr>${esc(enIngles() ? `You discovered ${en()}!` : `¡Descubriste ${nombre}!`)}</b>${htmlCuenta()}`;
  }
  const barra = c => `<span class="desc-barra" role="progressbar" aria-valuemin="0" aria-valuemax="${c.m}" aria-valuenow="${c.n}" aria-label="${esc(L('Lugares descubiertos', 'Places discovered'))}"><i style="width:${pct(c)}%"></i></span>`;

  // ---------- Diario ----------
  function htmlDiario() {
    const c = cuenta();
    if (!c.m) return '';
    const l = LG(), hechos = Array.isArray(S.lugares) ? S.lugares : [];
    const vistos = lista().filter(p => hechos.includes(p.id) && !p.asentamiento).map(p => `<li>${esc(l.nombreDe(p))}</li>`);
    const faltan = c.m - c.n;
    if (faltan) vistos.push(`<li class="falta">${esc(L(`${faltan} por descubrir`, `${faltan} still to find`))}</li>`);
    return `<div class="desc-sec" data-no-tr><span class="lbl">${esc(L('Lugares descubiertos', 'Places discovered'))} ${c.n}/${c.m}</span>${barra(c)}` +
      `<ul class="desc-diario">${vistos.join('')}</ul></div>`;
  }
  if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'descubiertos', html: htmlDiario });

  // ---------- Menú de pausa ----------
  const menu = $('pause');
  let caja = null;
  function pintarPausa() {
    if (!menu) return null;
    const c = cuenta();
    if (!caja) {
      caja = document.createElement('div'); caja.className = 'pause-lugares'; caja.setAttribute('data-no-tr', '');
      const tras = menu.querySelector('.pause-resume') || menu.querySelector('.pause-head');
      if (tras) tras.after(caja); else menu.prepend(caja);
    }
    caja.hidden = !c.m;
    caja.innerHTML = c.m ? `<div class="desc-fila"><span>${esc(c.todos ? textoCuenta(c) : L('Lugares descubiertos', 'Places discovered'))}</span><b>${c.n}/${c.m}</b></div>${barra(c)}` : '';
    return caja;
  }
  if (menu) {
    menu.addEventListener('beforetoggle', e => {
      if (e.newState !== 'open') return;
      pintarPausa();
      // Los asentamientos llegan tras el primer gesto: si aún no están, se piden y la cuenta se repinta al llegar
      const l = LG(); if (l && l.cargarAsentamientos) l.cargarAsentamientos().then(pintarPausa, () => {});
    });
  }

  // ---------- Todos los lugares: celebración ----------
  G.on('lugar', () => { if (!G.quiet && cuenta().todos) G.audio.play('unlock'); });

  // =====================================================================================================================
  // AV.descubrirTest(): cuenta N/M, partida vieja sin la clave, se guarda, aviso con la cuenta (aria-live), Diario y pausa
  // en ES y EN, todos los lugares, y G.S queda como estaba
  // =====================================================================================================================
  async function test() {
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const SV = G.guardado, snap = SV.instantanea(), quiet = G.quiet, posBk = Object.assign({}, S.pos);
    const aj = G.aula && G.aula.aj, idiomaBk = aj && aj.idioma;
    SV.suspender(true); G.quiet = true;
    try {
      const l = LG();
      check('lugares.js está cargado', !!(l && l.lista && l.descubrir));
      if (l && l.cargarAsentamientos && G.pack.asentamientos) await l.cargarAsentamientos().catch(() => {});
      const P = lista();
      check('Hay lugares con nombre en el mapa (M ≥ 3)', P.length >= 3, P.length + ' lugares');
      // Partida vieja: sin la clave
      delete S.lugares;
      let c = cuenta();
      check('Partida vieja sin S.lugares: 0/M y no se crea la clave', c.n === 0 && c.m === P.length && !('lugares' in S), c.n + '/' + c.m);
      check('La clave lugares se guarda en la partida de este capítulo', SV.KEYS.includes('lugares') && Array.isArray(SV.freshState().lugares));
      // Descubrir uno: la cuenta sube; los ids que no están en el mapa no cuentan
      const p = P.find(q => q.id === 'poza_honda') || P.find(q => !q.asentamiento) || P[0];
      l.descubrir(p, true);
      S.lugares.push('lugar_que_ya_no_existe');
      c = cuenta();
      check('Descubrir un lugar suma 1 (los ids viejos no cuentan)', c.n === 1 && c.m === P.length, c.n + '/' + c.m);
      const ser = SV.serialize ? SV.serialize(true) : '';
      check('La cuenta viaja con la partida (serialize)', typeof ser !== 'string' || (ser.includes('"lugares"') && ser.includes(p.id)));
      // Aviso: «Descubriste <lugar>» + «Lugares descubiertos 1/M» en el toast (aria-live) o el rótulo del asentamiento
      S.lugares = ['lugar_que_ya_no_existe'];
      S.profile = Object.assign({}, S.profile, { created: true });
      const py = p.y != null ? p.y : G.terreno.height(p.x, p.z);
      S.pos.x = p.x; S.pos.z = p.z; S.pos.y = py + 1;
      if (aj) aj.idioma = 'es';
      // El aviso se mira en lo que lugares.js manda al toast (G.ui.toastHTML): el toast es compartido y puede seguir mostrando
      // uno anterior (su espera de 3,4 s no corre con avisar(0), o la tarjeta lo tapa, QA-93); por eso se vacía la cola.
      const enviados = [], toastBk = G.ui.toastHTML;
      G.ui.toastHTML = function (h, ms) { enviados.push(String(h)); return toastBk.apply(this, arguments); };
      const html = h => { const x = document.createElement('div'); x.innerHTML = h; return x; };
      const plano = x => (x ? x.textContent.replace(/\s+/g, ' ').trim() : '');
      let q = null, el = null;
      try {
        G.quiet = false; l.revisar();
        // (cerca de p puede haber otro lugar: el aviso es el del primero que se descubrió, con la cuenta de ese momento)
        q = P.find(x => x.id === S.lugares[1]) || p;
        for (let i = 0; i < 40 && !el; i++) {
          if (!q.asentamiento && G.ui.hideToast) G.ui.hideToast();
          l.avisar(10);
          if (q.asentamiento) { const rt = document.getElementById('rotulo-lugar'); if (rt && !rt.hidden && rt.textContent.includes(l.nombreDe(q))) el = rt; }
          else el = enviados.map(html).find(x => plano(x.querySelector('.desc-titulo')).includes(l.nombreDe(q))) || null;
        }
      } finally { G.ui.toastHTML = toastBk; G.quiet = true; }
      const nAhora = cuenta().n, linea = `Lugares descubiertos ${nAhora}/${P.length}`;
      const tit = el && (q.asentamiento ? el.querySelector('b') : el.querySelector('.desc-titulo')), cta = el && el.querySelector('.desc-cuenta');
      check('El aviso dice el lugar y la cuenta en dos líneas («¡Descubriste <lugar>!» y «Lugares descubiertos N/M»)', nAhora >= 1 && !!tit && !!cta &&
        (q.asentamiento ? plano(tit).includes(l.nombreDe(q)) : plano(tit) === `¡Descubriste ${l.nombreDe(q)}!`) && plano(cta) === linea &&
        (q.asentamiento || plano(el) === `¡Descubriste ${l.nombreDe(q)}! ${linea}`) && /\.desc-titulo\{display:block\}/.test(ESTILO) && /\.desc-cuenta\{display:block/.test(ESTILO),
        el ? plano(el) : enviados.length + ' avisos enviados: ' + enviados.join(' | ').slice(0, 200));
      el = q.asentamiento ? document.getElementById('rotulo-lugar') : $('toast');
      check('El aviso se lee con lector de pantalla (aria-live polite)', !!el && el.getAttribute('aria-live') === 'polite');
      if (G.ui.hideToast) G.ui.hideToast();
      S.lugares = ['lugar_que_ya_no_existe', p.id];
      // Diario y pausa, ES y EN
      let d = document.createElement('div'); d.innerHTML = htmlDiario();
      check('Diario: «Lugares descubiertos 1/M», barra y el nombre del lugar', d.textContent.includes(`Lugares descubiertos 1/${P.length}`) && !!d.querySelector('[role=progressbar][aria-valuenow="1"]') &&
        (p.asentamiento || d.textContent.includes(l.nombreDe(p))) && d.textContent.includes(`${P.length - 1} por descubrir`), d.textContent.slice(0, 120));
      const bx = pintarPausa();
      check('Pausa: la cuenta 1/M con barra accesible', !menu || (bx && !bx.hidden && bx.textContent.includes(`1/${P.length}`) && bx.querySelector('[role=progressbar]').getAttribute('aria-valuemax') === String(P.length)), bx ? bx.textContent : 'sin menú');
      if (aj) aj.idioma = 'en';
      d = document.createElement('div'); d.innerHTML = htmlDiario() + htmlAviso('Poza Honda');
      check('En inglés: «Places discovered 1/M» (Diario, aviso y pausa)', d.textContent.includes(`Places discovered 1/${P.length}`) && !/Lugares descubiertos|Descubriste/.test(d.textContent) &&
        d.textContent.includes('You discovered Poza Honda! Places discovered') &&
        (!menu || /Places discovered/.test(pintarPausa().textContent)), d.textContent.slice(0, 120));
      if (aj) aj.idioma = 'es';
      // Todos
      S.lugares = P.map(q => q.id);
      c = cuenta();
      check('Con todos: «¡Descubriste todos los lugares!»', c.todos && /todos los lugares/.test(htmlCuenta()) && !/por descubrir/.test(htmlDiario()));
      // Sin animaciones propias: «reducir movimiento» (regla global de ui.css) no tiene nada que quitar
      check('Sin animaciones propias (respeta «reducir movimiento»)', !/animation|transition/.test(ESTILO));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      if (aj) aj.idioma = idiomaBk;
      if (G.ui.hideToast) G.ui.hideToast();
      const rt = document.getElementById('rotulo-lugar'); if (rt) rt.hidden = true;
      Object.assign(S.pos, posBk);
      SV.restaurar(snap);
      SV.suspender(false); G.quiet = quiet;
      pintarPausa();
    }
    check('G.S queda como estaba', JSON.stringify(SV.instantanea()) === JSON.stringify(snap));
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }
  // AV.descubrirTest (boot.js es del coordinador: se expone aquí, como AV.lugaresTest)
  setTimeout(() => { const AV = window.AV; if (AV && AV.G === G && !AV.descubrirTest) AV.descubrirTest = o => test(o); }, 0);

  return { cuenta, htmlCuenta, htmlAviso, htmlDiario, pintarPausa, test };
});
