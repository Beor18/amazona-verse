/* Juego · Ajustes de accesibilidad (sección «Lectura» del menú de pausa)
   - Tamaño de texto en 3 niveles: Normal, Grande (×1,15) y Muy grande (×1,3). Escala los tokens --fs-* de la interfaz.
   - Alto contraste: superficies negras opacas, texto blanco, papel blanco con tinta negra y bordes visibles.
   Se guardan en la partida (S.profile.a11y = { texto: 0|1|2, contraste: bool }) y se aplican al cargar o reiniciar. «Comenzar de
   cero» (y cargar una partida vieja, sin ajustes) conserva lo elegido en esta sesión; «Nuevo estudiante» lo olvida.
   Pinta clases en <html>: a11y-t1 / a11y-t2 / a11y-contraste (estilos en src/ui/ui.css, sección 7b).
   PRUEBAS: G.accesibilidad.test() (AV.accesibilidadTest) comprueba niveles, contraste, guardado y, en una maqueta móvil (iframe de
   375×812 y de 320×568 con las hojas de estilo reales y copias del HUD), que nada desborda. */
AVE.module('accesibilidad', function (G) {
  'use strict';
  const S = G.S, $ = G.util.$, raiz = document.documentElement;
  const NIVELES = 3;
  const esObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const L = (es, en) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const TX = () => ({
    titulo: L('Lectura', 'Reading'), texto: L('Texto', 'Text'),
    niveles: [L('Normal', 'Normal'), L('Grande', 'Large'), L('Muy grande', 'Extra large')],
    contraste: L('Alto contraste', 'High contrast'),
  });

  function leer() {
    const a = esObj(S.profile && S.profile.a11y) ? S.profile.a11y : {};
    const t = Number.isInteger(a.texto) && a.texto >= 0 && a.texto < NIVELES ? a.texto : 0;
    return { texto: t, contraste: a.contraste === true };
  }
  let guardarAlCambiar = true;
  let ultimo = null; // lo último elegido en esta sesión: sobrevive a «Comenzar de cero» y a cargar una partida sin ajustes
  function set(k, v) {
    const a = leer();
    if (k === 'texto') a.texto = Math.max(0, Math.min(NIVELES - 1, v | 0));
    else if (k === 'contraste') a.contraste = !!v;
    else return;
    ultimo = Object.assign({}, a);
    S.profile = Object.assign({}, S.profile, { a11y: a });
    sync();
    if (guardarAlCambiar && S.profile.created && G.guardado) G.guardado.save(true);
  }

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
      <button class="chip" type="button" data-a11y-contraste></button></div>`;
    const tras = menu.querySelector('.pause-aula') || menu.querySelector('.pause-grid');
    if (tras) tras.after(sec); else menu.appendChild(sec);
    sec.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a11yTexto != null) set('texto', parseInt(b.dataset.a11yTexto, 10));
      else if ('a11yContraste' in b.dataset) set('contraste', !leer().contraste);
    });
  }
  function rotular() {
    if (!sec) return;
    const T = TX();
    sec.querySelector('#a11y-titulo').textContent = T.titulo;
    sec.querySelector('#a11y-lbl-texto').textContent = T.texto;
    sec.querySelectorAll('[data-a11y-texto]').forEach(b => { b.textContent = T.niveles[+b.dataset.a11yTexto]; });
    sec.querySelector('[data-a11y-contraste]').textContent = T.contraste;
  }
  function sync() {
    const a = leer();
    for (let i = 1; i < NIVELES; i++) raiz.classList.toggle('a11y-t' + i, a.texto === i);
    raiz.classList.toggle('a11y-contraste', a.contraste);
    if (!sec) return;
    sec.querySelectorAll('[data-a11y-texto]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.a11yTexto === a.texto)));
    sec.querySelector('[data-a11y-contraste]').setAttribute('aria-pressed', String(a.contraste));
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
  G.on('aula', k => { if (k === 'idioma') rotular(); });

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
  // reglas @media (max-width: 560px) (la ventana de la prueba es de escritorio) sin arrancar otra partida ni otro WebGL.
  async function maqueta(ancho, alto, clases) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.style.cssText = `position:fixed;left:-10000px;top:0;width:${ancho}px;height:${alto}px;border:0;`;
    const hojas = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `<link rel="stylesheet" href="${l.href}">`).join('');
    const copia = ids => ids.map(id => { const e = $(id); return e ? e.outerHTML : ''; }).join('');
    // En escritorio los controles táctiles están ocultos por (hover: hover) and (pointer: fine); en la maqueta se muestran. Sin animaciones: se mide el reposo
    // (el panel de gestos entra con un pop-in que durante 0,2 s le quita el translateY(-50%))
    f.srcdoc = `<!doctype html><html lang="es" class="${clases}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${hojas}` +
      '<style>*, *::before, *::after { animation: none !important; transition: none !important; } @media (hover: hover) and (pointer: fine) { #stick { display: block !important; } #acts { display: grid !important; } }</style></head>' +
      `<body>${copia(['top', 'sys', 'toast', 'prompt', 'card', 'dialog', 'stick', 'emotes', 'acts'])}</body></html>`;
    document.body.appendChild(f);
    await new Promise(r => { f.addEventListener('load', r, { once: true }); setTimeout(r, 4000); });
    const d = f.contentDocument;
    try { await Promise.race([d.fonts.ready, espera(2500)]); } catch (e) { /* sin fuentes */ }
    // Contenido de ejemplo largo: el peor caso para el desborde
    const q = id => d.getElementById(id);
    const mostrar = (id, f2) => { const e = q(id); if (e) { e.hidden = false; if (f2) f2(e); } };
    const pd = q('d-type'); if (pd) pd.remove(); if (q('dialog')) q('dialog').classList.remove('tw');
    mostrar('toast', e => { e.textContent = 'La Gran Ruptura dañó el taller de Vittata. Examina la máquina y el transmisor.'; });
    mostrar('prompt', e => { e.innerHTML = '<span class="prompt-txt">Acción: examinar la máquina del taller dañado</span>'; });
    if (q('d-who')) q('d-who').textContent = 'Guardián';
    if (q('d-text')) q('d-text').textContent = 'Hubo un tiempo en que las islas estaban conectadas. Las aves cruzaban de una a otra y el agua de las montañas llegaba hasta el mar sin detenerse.';
    mostrar('emotes');
    return { f, d, w: f.contentWindow, q, cerrar: () => f.remove() };
  }
  const visible = e => { const cs = e.ownerDocument.defaultView.getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && !e.closest('[hidden]'); };
  // Qué se sale de la pantalla o de su caja en la maqueta (lista vacía = todo bien)
  function desbordes(m, ancho, etiqueta, ids) {
    const d = m.d, malos = [];
    if (d.documentElement.scrollWidth > ancho + 1) malos.push(`${etiqueta}: la página mide ${d.documentElement.scrollWidth} px`);
    for (const id of ids) {
      const e = m.q(id); if (!e || !visible(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.width && (r.left < -1 || r.right > ancho + 1)) malos.push(`${etiqueta}: #${id} se sale (${Math.round(r.left)}…${Math.round(r.right)})`);
    }
    for (const e of d.querySelectorAll('#quest, #steps li.now, #toast, #emotes .btn, #acts .round, #d-who, #d-next, #inv, .hud-btn')) {
      if (visible(e) && e.scrollWidth > e.clientWidth + 1) malos.push(`${etiqueta}: ${e.id ? '#' + e.id : e.className || e.tagName} desborda su caja (${e.scrollWidth} > ${e.clientWidth})`);
    }
    return malos;
  }
  const choca = (a, b) => !!a && !!b && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;

  async function test() {
    const out = [];
    const check = (name, ok, extra) => { out.push({ name, ok: !!ok, extra: extra == null ? '' : String(extra) }); };
    const perfil0 = S.profile, ultimo0 = ultimo, abierto0 = (() => { try { return menu.matches(':popover-open'); } catch (e) { return false; } })();
    guardarAlCambiar = false;
    try {
      check('Sección «Lectura» en el menú de pausa con 3 niveles y alto contraste',
        !!sec && sec.querySelectorAll('[data-a11y-texto]').length === 3 && !!sec.querySelector('[data-a11y-contraste]'));

      // Tamaño de texto: cada nivel agranda el diálogo, la interfaz, el aviso, el aviso de acción y los gestos
      const dTxt = $('d-text'), body = document.body, tam = [];
      for (let i = 0; i < NIVELES; i++) { set('texto', i); tam.push([px(dTxt || body), px(body), px($('toast')), px($('prompt')), px(document.querySelector('#emotes .btn') || body)]); }
      check('Los 3 niveles agrandan el texto del diálogo y de la interfaz',
        tam[1][0] > tam[0][0] && tam[2][0] > tam[1][0] && tam[2][1] > tam[0][1] && tam[2][0] / tam[0][0] >= 1.25, tam.map(t => t[0].toFixed(1)).join(' → ') + ' px');
      check('También crecen el aviso, el aviso de acción y los gestos (los que traen su tamaño en píxeles)',
        tam[1][2] > tam[0][2] && tam[2][2] > tam[1][2] && tam[2][3] > tam[0][3] && tam[2][4] > tam[0][4], `aviso ${tam[0][2]} → ${tam[2][2]} · acción ${tam[0][3]} → ${tam[2][3].toFixed(1)} · gestos ${tam[0][4]} → ${tam[2][4].toFixed(1)}`);
      set('texto', 1);
      check('El nivel marcado se anuncia con aria-pressed', sec.querySelector('[data-a11y-texto="1"]').getAttribute('aria-pressed') === 'true' &&
        sec.querySelector('[data-a11y-texto="0"]').getAttribute('aria-pressed') === 'false' && raiz.classList.contains('a11y-t1'));

      // Alto contraste: texto ≥ 7:1 (AAA) en el menú, el aviso y el papel
      set('contraste', true);
      if (menu && !abierto0) menu.showPopover();
      await frame();
      const cm = menu ? getComputedStyle(menu) : null, lbl = $('a11y-lbl-texto');
      const rMenu = cm ? ratio(cm.color, cm.backgroundColor) : 0, rMuted = lbl && cm ? ratio(getComputedStyle(lbl).color, cm.backgroundColor) : 0;
      const card = $('d-text') && $('d-text').closest('#dialog'), cc = card ? getComputedStyle(card) : null;
      const rPapel = $('d-text') && cc ? ratio(getComputedStyle($('d-text')).color, cc.backgroundColor) : 0;
      const ct = $('toast') ? getComputedStyle($('toast')) : null, rAviso = ct ? ratio(ct.color, ct.backgroundColor) : 21;
      check('Alto contraste: texto del menú, texto secundario, diálogo y aviso ≥ 7:1', rMenu >= 7 && rMuted >= 7 && (!cc || rPapel >= 7) && rAviso >= 7,
        [rMenu, rMuted, rPapel, rAviso].map(r => r.toFixed(1)).join(' · '));
      check('Alto contraste se marca', raiz.classList.contains('a11y-contraste') && sec.querySelector('[data-a11y-contraste]').getAttribute('aria-pressed') === 'true');
      set('contraste', false);
      check('Alto contraste se quita', !raiz.classList.contains('a11y-contraste') && sec.querySelector('[data-a11y-contraste]').getAttribute('aria-pressed') === 'false');
      try { if (menu && !abierto0) menu.hidePopover(); } catch (e) { /* sin popover */ }

      // Nada desborda en el móvil: 375×812 (teléfono actual) y 320×568 (el más pequeño), en los 3 niveles, con alto contraste puesto
      for (const [W, H] of [[375, 812], [320, 568]]) {
        const malos = [], notas = [];
        for (let i = 0; i < NIVELES; i++) {
          const m = await maqueta(W, H, `${i ? 'a11y-t' + i : ''} a11y-contraste`);
          try {
            if (m.w.getComputedStyle(m.q('stick')).position !== 'fixed') malos.push('la maqueta no cargó las hojas de estilo');
            const ids = ['quest', 'inv', 'sys', 'toast', 'prompt', 'emotes', 'stick', 'acts'];
            // 1. HUD con el diálogo cerrado: objetivo, inventario, botones, aviso, aviso de acción y gestos
            m.q('dialog').hidden = true;
            malos.push(...desbordes(m, W, `${W}px nivel ${i}`, ids));
            // 2. El aviso no tapa los botones de la derecha (Diario, Gestos, Pausa)
            const rT = m.q('toast').getBoundingClientRect(), rS = m.q('sys').getBoundingClientRect();
            if (choca(rT, rS)) malos.push(`${W}px nivel ${i}: el aviso tapa los botones del menú`);
            // 2b. En un teléfono normal el panel de gestos abierto no tapa el joystick ni los botones de acción (a 320 px de ancho no cabe)
            if (H >= 800 && (choca(m.q('emotes').getBoundingClientRect(), m.q('acts').getBoundingClientRect()) || choca(m.q('emotes').getBoundingClientRect(), m.q('stick').getBoundingClientRect()))) malos.push(`${W}px nivel ${i}: el panel de gestos tapa los controles`);
            // 3. Objetivo desplegado
            m.q('quest').classList.add('abierto');
            malos.push(...desbordes(m, W, `${W}px nivel ${i} (objetivo abierto)`, ['quest']));
            // 4. Diálogo: el retrato y el nombre se ven enteros, y el texto largo se desplaza dentro de su caja
            m.q('dialog').hidden = false; m.q('toast').hidden = true;
            const dl = m.q('dialog').getBoundingClientRect(), pr = m.d.querySelector('.d-portrait').getBoundingClientRect(), wh = m.q('d-who').getBoundingClientRect();
            if (pr.top < -1 || wh.top < -1 || dl.right > W + 1 || dl.left < -1) malos.push(`${W}px nivel ${i}: el diálogo se sale (retrato ${Math.round(pr.top)}, nombre ${Math.round(wh.top)})`);
            if (dl.height > H * 0.62) malos.push(`${W}px nivel ${i}: el diálogo ocupa ${Math.round(dl.height / H * 100)} % de la pantalla`);
            const ds = m.d.querySelector('.d-say'); if (ds.scrollWidth > ds.clientWidth + 1) malos.push(`${W}px nivel ${i}: el texto del diálogo desborda`);
            const sinRecorte = m.w.getComputedStyle(m.q('dialog')).overflowY;
            if (sinRecorte !== 'visible') malos.push(`${W}px nivel ${i}: el diálogo recorta lo que sobresale (${sinRecorte})`);
            notas.push(`${i}: diálogo ${Math.round(dl.height)} px`);
            // 5. Menú de pausa abierto
            m.q('dialog').hidden = true;
            const pz = m.q('pause'); pz.showPopover(); await espera(30);
            const rp = pz.getBoundingClientRect();
            if (pz.scrollWidth > pz.clientWidth + 1 || rp.left < -1 || rp.right > W + 1) malos.push(`${W}px nivel ${i}: el menú mide ${pz.scrollWidth} px de ancho (caja ${Math.round(rp.width)})`);
            for (const b of pz.querySelectorAll('button, h2, h3, dd, p')) {
              if (!visible(b)) continue;
              const q2 = b.getBoundingClientRect();
              if (q2.width && (q2.left < rp.left - 1 || q2.right > rp.right + 1)) { malos.push(`${W}px nivel ${i}: ${b.id || b.className || b.tagName} se sale del menú`); break; }
            }
            for (const b of pz.querySelectorAll('.pause-grid .btn')) if (b.scrollWidth > b.clientWidth + 1) { malos.push(`${W}px nivel ${i}: el botón «${b.textContent.trim()}» desborda`); break; }
            pz.hidePopover();
          } catch (e) { malos.push(`${W}px nivel ${i}: ${e.message}`); }
          m.cerrar();
        }
        check(`Móvil ${W}×${H}: ningún nivel desborda el HUD, el aviso, el diálogo, los gestos ni el menú`, !malos.length, malos.slice(0, 4).join('; ') || notas.join(' · '));
      }

      // Se guarda en la partida y se aplica al cargarla
      set('texto', 2); set('contraste', true);
      const d = JSON.parse(G.guardado.serialize(true));
      check('La partida guardada lleva los ajustes', d.profile && d.profile.a11y && d.profile.a11y.texto === 2 && d.profile.a11y.contraste === true, JSON.stringify(d.profile && d.profile.a11y));
      S.profile = Object.assign({}, perfil0, { a11y: { texto: 0, contraste: false } }); sync();
      S.profile = d.profile; G.emit('apply');
      check('Al cargar la partida se aplican los ajustes', raiz.classList.contains('a11y-t2') && raiz.classList.contains('a11y-contraste'));
      // «Comenzar de cero» (perfil nuevo, sin ajustes) y una partida vieja sin ajustes conservan lo elegido
      S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
      check('«Comenzar de cero» conserva el tamaño de texto y el alto contraste', raiz.classList.contains('a11y-t2') && raiz.classList.contains('a11y-contraste') && leer().texto === 2 && leer().contraste === true);
      ultimo = null; S.profile = { created: false, name: 'Aprendiz', look: null }; G.emit('apply');
      check('Sin nada elegido en la sesión, una partida sin ajustes queda en Normal', !raiz.classList.contains('a11y-t2') && !raiz.classList.contains('a11y-contraste'));
      S.profile = Object.assign({}, perfil0, { a11y: { texto: 9, contraste: 'sí' } }); sync();
      check('Un valor dañado vuelve a Normal sin contraste', !raiz.classList.contains('a11y-t1') && !raiz.classList.contains('a11y-t2') && !raiz.classList.contains('a11y-contraste'));
    } catch (e) {
      check('Sin excepciones', false, e && e.message);
    } finally {
      S.profile = perfil0; ultimo = ultimo0; sync(); guardarAlCambiar = true;
      try { if (menu && !abierto0 && menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
    }
    return { passed: out.filter(o => o.ok).length, total: out.length, results: out };
  }

  return { leer, set, sync, test };
});
