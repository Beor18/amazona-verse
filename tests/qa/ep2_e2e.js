/* QA · episodio 2 «Un lugar para todos» de punta a punta (AV.ep2e2eTest) · no toca el juego, solo lo juega
   Un jugador nuevo abre index.html?pack=ep2 en un iframe del mismo origen (el almacenamiento se respalda entero y se devuelve igual
   al terminar) y juega como un niño: portada → creador → escena de inicio → sigue la flecha de la guía caminando con las teclas de
   verdad (W y Mayús, la cámara mira al destino), pulsa Acción ante lo que la guía señala, pasa cada línea de diálogo con Acción y
   pulsa los botones reales de las tarjetas. Se equivoca a propósito una vez donde un niño suele equivocarse (una pregunta cerrada,
   una tarjeta mal ordenada, elegir solo a la abuela, el nido abajo, arreglar otra parte), hasta la fiesta, la pantalla final,
   «Seguir explorando» y «Iguaca te pregunta». Corre dos veces: en español y en inglés (Aula → EN), y en inglés apunta todo texto
   que siga en español en pantalla (G.idioma.textosVisibles) en cada línea, tarjeta, aviso y objetivo.
   Atajos, siempre dichos: el tiempo es el del juego (G.renderer.update a 0,05 s por cuadro) y no el reloj de pared; las opciones de
   cada tarjeta se leen envolviendo G.dialogo.choose (solo se miran: el clic es en el botón real).
   Por paso de la historia mide: segundos de juego caminando, metros, interacciones, líneas de diálogo y sus caracteres, clics en
   tarjetas, errores y «atascos» (sin guía, no se llega caminando, el aviso no dice la acción, Acción no hace nada o el paso no
   avanza tras varios intentos). Modelo de duración (cotas inferiores, NO sustituye medir con niños):
     mínimo  = segundos de juego + (líneas + clics) × 0,8 s (solo pulsar);
     leyendo = segundos de juego + caracteres de líneas y tarjetas / 15 por segundo (~180 palabras/min) + clics × 1 s.
   Opciones: { idioma: 'es'|'en' (solo una vuelta), aqui: true (juega en esta misma ventana, que debe ser ?pack=ep2; para
   tests/qa/ep2_capturas.py), capturas: true (con aqui: pide una captura en cada momento clave por window.__ep2Pide),
   sitio: 'a'|'b'|'c' (defecto 'c'), keep: true (deja el iframe), timeout: ms de espera de arranque }.
   Salida: { passed, total, results, tramos, md } (md: tabla para docs/equipo/EP2_PLAYTEST.md). Carga: inyectar y await AV.ep2e2eTest(). */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(fn, ms, step) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch (e) { /* aún no */ } await sleep(step || 80); }
    return null;
  }
  const r1 = v => Math.round(v * 10) / 10;
  const s = v => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { return String(v); } };
  const LECTURA = 15, PULSAR = 0.8; // caracteres por segundo leyendo; segundos por pulsación sin leer

  // Una vuelta completa del episodio en un idioma. Devuelve { out, tramos, atascos, faltanEN, resumen }.
  async function vuelta(idioma, opts) {
    const out = [], tramos = [], atascos = [], faltanEN = new Set();
    const pre = idioma.toUpperCase() + ' · ';
    const check = (name, ok, extra) => out.push({ name: pre + name, ok: ok === true, extra: s(extra == null ? '' : extra).slice(0, 500) });
    let W, fr = null, G, S, $, respaldo = null;
    if (opts.aqui) W = window;
    else {
      respaldo = {};
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
      try { for (const k of Object.keys(respaldo)) if (/^ep2|aula\.cap2/.test(k)) localStorage.removeItem(k); } catch (e) { /* */ }
      fr = document.createElement('iframe');
      fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
      fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
      const url = new URL(location.href); url.search = '?pack=ep2'; url.hash = '';
      fr.src = url.href; document.body.appendChild(fr);
      W = await until(() => { const x = fr.contentWindow; return x && x.AV && x.AV.pack === 'ep2' && x.AV.G && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x; }, opts.timeout || 180000, 100);
      if (W) await sleep(800);
    }
    const devolver = () => {
      if (!respaldo) return;
      try {
        for (const k of Object.keys(localStorage)) if (!(k in respaldo)) localStorage.removeItem(k);
        for (const k of Object.keys(respaldo)) if (localStorage.getItem(k) !== respaldo[k]) localStorage.setItem(k, respaldo[k]);
      } catch (e) { /* sin almacenamiento */ }
    };
    if (!W || !W.AV || W.AV.pack !== 'ep2') { check('El episodio 2 arranca (?pack=ep2)', false, 'no arrancó'); if (fr && !opts.keep) fr.remove(); devolver(); return { out, tramos, atascos, faltanEN: [] }; }
    G = W.AV.G; S = G.S; $ = id => W.document.getElementById(id);
    const doc = W.document;
    const errores0 = (W.__aveErrores || []).length;

    // ---------- Medida por tramo ----------
    let tr = null;
    const empezar = nombre => { cerrar(); tr = { nombre, simS: 0, metros: 0, usos: 0, lineas: 0, chars: 0, clics: 0, cardChars: 0, errores: 0, atascos: [], _t0: performance.now() }; };
    const cerrar = () => { if (!tr) return; tr.paredMs = Math.round(performance.now() - tr._t0); delete tr._t0; tr.simS = r1(tr.simS); tr.metros = Math.round(tr.metros); tramos.push(tr); tr = null; };
    const atasco = (que, extra) => { const a = { paso: S.step, tramo: tr ? tr.nombre : '', que, extra: s(extra || '').slice(0, 200) }; atascos.push(a); if (tr) tr.atascos.push(que); };
    async function jugar(segs) {
      const n = Math.max(1, Math.ceil(segs / 0.05));
      for (let i = 0; i < n; i++) { const x = S.pos.x, z = S.pos.z; G.renderer.update(0.05); if (tr) { tr.simS += 0.05; tr.metros += Math.hypot(S.pos.x - x, S.pos.z - z); } if (i % 20 === 19) await sleep(0); }
    }
    // Inglés: lo que siga en español en pantalla (el observador traduce en microtareas: se espera un poco). MOTOR: textos del motor que
    // no son del episodio y se anotan aparte en EP2_PLAYTEST.md (la pista «Pulsa <kbd>Espacio</kbd> para volar» va en 3 nodos de texto)
    const MOTOR = new Set(['Pulsa', 'para volar', 'Flor of El Yunque']); // «Flor of El Yunque»: nombre del criadero a medias en cap1/en.js
    let fijosES = new Set();
    let valores = null;
    async function mirarEN() {
      if (idioma !== 'en' || !G.idioma || !G.idioma.textosVisibles) return;
      await sleep(15);
      if (G.idioma.actual() !== 'en') faltanEN.add('[el juego no está en inglés: ' + G.idioma.actual() + ']');
      // Cada nodo de texto que se ve en pantalla (su elemento tiene caja) y que el diccionario no traduce
      const w = doc.createTreeWalker(doc.body, W.NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const p = n.parentElement, t = n.data.replace(/\s+/g, ' ').trim();
        if (!p || !/\p{L}{2}/u.test(t) || /^(SCRIPT|STYLE)$/.test(p.nodeName) || p.closest('[data-no-tr],[hidden]') || !p.getClientRects().length) continue;
        // Un texto fijo del pack tal cual (también como chip «· …» o con su progreso «(1/3)») sigue en español aunque no lo parezca
        const base = t.replace(/^[·✓]\s*/, '').replace(/\s*\(\d+\/\d+\)$/, '').replace(/\s*\d+\/\d+$/, '');
        if (fijosES.has(base)) { faltanEN.add(t.slice(0, 200)); continue; }
        if (!G.idioma.faltan([t]).length || MOTOR.has(t)) continue;
        // Ya en inglés (un valor del diccionario, o su final mientras el diálogo se escribe letra a letra) aunque diga «no» o «El Yunque»
        if (!valores) valores = Object.values(W.AV_EN || {});
        if (valores.some(v => v === t || (t.length > 20 && v.endsWith(t)))) continue;
        faltanEN.add(t.slice(0, 200));
      }
    }
    // Una captura por paso: en la primera tarjeta de elección o, si el paso no tiene, en su primera línea de diálogo
    const MOMENTOS = ['iguaca', 'sitios', 'eleccion', 'plano', 'preguntas', 'mesa', 'construir', 'nido', 'tormenta', 'mejora', 'fiesta'];
    const CON_CARTA = new Set([4, 5, 6, 7, 9]);
    const captura = async nombre => {
      if (!opts.aqui || !opts.capturas) return;
      await sleep(G.dialogo.open() ? 2500 : 300); W.__ep2Pide = nombre; // el diálogo se escribe letra a letra: se espera a que acabe
      await until(() => !W.__ep2Pide, 30000, 50);
    };
    const tecla = (tipo, k) => W.dispatchEvent(new W.KeyboardEvent(tipo, { key: k, code: k === ' ' ? 'Space' : k === 'Shift' ? 'ShiftLeft' : 'Key' + k.toUpperCase(), bubbles: true }));
    // Camina hasta (x,z) con las teclas, girando la cámara al destino; si no avanza, se aparta un poco (como un niño ante un árbol)
    async function hacia(x, z, max, tol, id) {
      tecla('keydown', 'Shift'); tecla('keydown', 'w');
      let quieto = 0, llego = false;
      for (let t = 0; t < max; t += 0.25) {
        const dx = x - S.pos.x, dz = z - S.pos.z, d = Math.hypot(dx, dz);
        const nb = G.interaccion.nearest();
        if (d < tol || (id && nb && nb.id === id && d < nb.r - 0.5)) { llego = true; break; }
        if (G.ui.busy()) { // algo se abrió por su cuenta mientras camina (un aviso con retraso): se lee y se sigue
          const a = G.dialogo.actual(); if (tr) tr.sueltos = (tr.sueltos || []).concat((a && a.who + ': ' + a.text || 'tarjeta').slice(0, 90));
          await resolver(); continue;
        }
        G.camara.yaw = Math.atan2(-dx, -dz);
        const p0 = { x: S.pos.x, z: S.pos.z };
        await jugar(0.25);
        quieto = Math.hypot(S.pos.x - p0.x, S.pos.z - p0.z) < 0.15 ? quieto + 1 : 0;
        if (quieto >= 4) { tecla('keydown', 'a'); await jugar(0.6); tecla('keyup', 'a'); quieto = 0; }
      }
      tecla('keyup', 'w'); tecla('keyup', 'Shift');
      await jugar(0.3);
      return llego;
    }

    // ---------- Tarjetas: se miran las opciones (sin tocarlas) y se pulsa el botón real ----------
    let ultimas = null, lineaCarta = null;
    const chooseOrig = G.dialogo.choose;
    G.dialogo.choose = function (line, options, done) { ultimas = options; lineaCarta = line; return chooseOrig.apply(this, arguments); };
    // La falla que marcó la tormenta se lee del texto original (en inglés la pantalla ya está traducida)
    const sayOrig = G.dialogo.say;
    G.dialogo.say = function (lines) { for (const l of lines || []) if (l && /Algo cede/.test(l.text)) ultimaFalla = l.text; return sayOrig.apply(this, arguments); };
    const yaFallo = new Set(); // un error a propósito por tipo de tarjeta
    const fallaUnaVez = k => { if (yaFallo.has(k)) return false; yaFallo.add(k); if (tr) tr.errores++; return true; };
    const DEC = Object.assign({ base: 'pilotes', paredes: 'tablas', techo: 'dos', anclaje: 'no' }, opts.decisiones || {});
    let ultimaFalla = '';
    function politica(ops, line) {
      const txt = (line && line.text) || '', idx = f => ops.findIndex(f);
      if (ops.some(o => o.p)) { // preguntas a la abuela y al papá: una cerrada primero, luego las abiertas
        const cerrada = idx(o => !o.p.tarjeta);
        if (cerrada >= 0 && fallaUnaVez('cerrada')) return cerrada;
        const ab = idx(o => o.p.tarjeta); return ab >= 0 ? ab : 0;
      }
      if (ops.some(o => o.v === 'criterio')) { // la mesa: «Iguaca te da» es una restricción; lo que dicen los residentes, un criterio
        const bien = /^Iguaca te da/.test(txt) ? 'restriccion' : 'criterio';
        const mal = bien === 'criterio' ? 'restriccion' : 'criterio';
        const v = fallaUnaVez('mesa') ? mal : bien; return idx(o => o.v === v);
      }
      if (ops.some(o => o.v === 'abuela')) return fallaUnaVez('choque') ? idx(o => o.v === 'abuela') : idx(o => o.v === 0);
      if (ops.some(o => o.k === 'ancha')) return idx(o => o.k === 'ancha');
      if (ops.some(o => o.ok !== undefined)) { const ok = !fallaUnaVez('nido'); return idx(o => o.ok === ok); }
      if (ops.some(o => o.k === 'anclaje' && o.label.startsWith('Amarrar'))) { // mejorar: lo que dice la falla marcada en rojo
        const pista = /amarras/i.test(ultimaFalla) ? 'anclaje' : /base|charco/i.test(ultimaFalla) ? 'base' : /pared|juntas|trenzado/i.test(ultimaFalla) ? 'paredes' : 'techo';
        if (fallaUnaVez('mejora')) { const otra = idx(o => o.k !== pista); if (otra >= 0) return otra; }
        return idx(o => o.k === pista);
      }
      if (ops.some(o => o.v === 'pilotes' || o.v === 'tablas' || o.v === 'dos' || o.v === 'si')) {
        const v = Object.values(DEC).find(x => ops.some(o => o.v === x)); return Math.max(0, idx(o => o.v === v));
      }
      if (ops.some(o => o.v === 1 && /pregúntame/.test(o.label))) { const v = fallaUnaVez('formativa') ? 0 : 1; return idx(o => o.v === v); } // «Ahora no» y luego sí
      if (tr) tr.atascos.push('tarjeta desconocida: ' + ops.map(o => o.label).join(' / ').slice(0, 80));
      return 0;
    }
    const cartaAbierta = () => G.ui.cardOpen && !$('card').hidden;
    // Resuelve lo que abra una acción: diálogos (Acción), tarjetas de elección (botón real) y tarjetas del aula (opciones y Seguir)
    async function resolver() {
      let n = 0, hizo = false;
      while (n++ < 400) {
        await mirarEN();
        if (G.dialogo.open()) {
          if (tr && !tr.cap && tr.momento && !CON_CARTA.has(tr.paso)) { tr.cap = true; await captura(tr.momento); }
          const a = G.dialogo.actual(); if (tr) { tr.lineas++; tr.chars += (a && a.text || '').length; }
          G.interaccion.action(); hizo = true; await jugar(0.05); continue;
        }
        if (cartaAbierta()) {
          const card = $('card'); hizo = true;
          if (tr && !tr.cap && tr.momento) { tr.cap = true; await captura(tr.momento); }
          if (card.querySelector('.edu-opt')) { // «Iguaca te pregunta»: prueba opciones hasta acertar (pista y respuesta sin castigo)
            const sg = $('edu-seguir');
            if (sg) { sg.click(); if (tr) tr.clics++; await jugar(0.05); continue; }
            const b = card.querySelector('.edu-opt:not([disabled])');
            if (!b) { atasco('tarjeta del aula sin opciones'); break; }
            if (tr) { tr.clics++; tr.cardChars += card.textContent.length; }
            b.click(); await jugar(0.05); continue;
          }
          const bs = [...card.querySelectorAll('[id^="ch-"]')];
          if (!bs.length || !ultimas) { atasco('tarjeta sin botones de elección', card.textContent.slice(0, 80)); G.ui.hideCard(); break; }
          if (tr) { tr.clics++; tr.cardChars += card.textContent.length; }
          const i = politica(ultimas, lineaCarta); ultimas = null;
          const b = $('ch-' + i); if (!b) { atasco('falta el botón ' + i); break; }
          b.click(); await jugar(0.05); continue;
        }
        break;
      }
      await mirarEN();
      return hizo;
    }

    try {
      check('Arranca limpio el episodio 2', W.AV.pack === 'ep2' && !S.profile.created, { pack: W.AV.pack, creado: S.profile.created });
      if (idioma === 'en') { if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', 'en'); else G.idioma.poner('en'); await G.idioma.listo; await sleep(200);
        check('Con EN puesto, el diccionario carga y traduce («Acción» → «Action»)', G.idioma.actual() === 'en' && G.idioma.tr('Acción') === 'Action', G.idioma.actual() + ' · ' + G.idioma.tr('Acción') + ' · AV_EN ' + Object.keys(W.AV_EN || {}).length);
        // También lo que esta partida no enseña (otras ramas): escenas, pasos, misiones, Cuaderno, ropa y cómic del pack
        const P = G.pack, D = P.diario || {}, fijos = [].concat(
          P.dialogos.datos().escenas.flatMap(e => e.lineas), (P.historia.pasos || []).map(p => p.texto), [P.historia.fin()],
          (P.misiones || []).flatMap(m => [m.titulo, m.hud].concat(m.pasos.map(p => p.texto))),
          [D.titulo].concat(Object.values(D.categorias || {}).flatMap(c => [c.nombre, c.desconocido]), (D.entradas || []).flatMap(e => [e.nombre, e.texto])),
          (P.ropa || []).flatMap(r => [r.nombre, r.pista]), (P.comic.vinetas || []).map(v => typeof v.texto === 'string' ? v.texto : null),
          Object.values(P.meta.hud).filter(v => typeof v === 'string')).filter(Boolean).map(t => t.replace(/\s+/g, ' ').trim());
        fijosES = new Set(fijos.concat([P.diario && P.diario.boton].filter(Boolean), 'Hablar Contarle Observar Elegir Enseñar Preguntar Ordenar Mirar Dibujar Armar Esperar Mejorar Probar'.split(' '))); // + los verbos del botón de Acción
        const sinEN = G.idioma.faltan(fijos).concat(fijos.filter(t => /[áéíóúñ¿¡]/i.test(t) && G.idioma.tr(t) === t));
        check('Todos los textos fijos del pack tienen EN (' + fijos.length + ')', !sinEN.length, [...new Set(sinEN)].slice(0, 20).join(' | '));
      }
      // ---------- Portada y creador ----------
      empezar('0 · Portada, creador e inicio');
      const t = $('title');
      check('La portada está abierta para un jugador nuevo', !!t && t.open);
      await mirarEN(); await captura('portada');
      const bj = t && t.querySelector('form[method=dialog] button'); if (bj) { bj.click(); tr.clics++; }
      const cr = $('creator');
      const abierto = await until(() => cr && !cr.hidden, 8000);
      check('Jugar abre el creador', !!abierto);
      await until(() => $('p-stage-status') && $('p-stage-status').hidden, 30000);
      await mirarEN(); await captura('creador');
      if ($('p-save')) { $('p-save').click(); tr.clics++; }
      await until(() => cr.hidden, 8000);
      await jugar(0.5);
      check('Empezar cierra el creador y crea el perfil', cr.hidden && S.profile.created, S.profile.name);
      const habla = await until(() => G.dialogo.open(), 20000); // pack.inicio llega 300 ms después de guardar (creador.js)
      check('Al empezar habla Vittata (escena de inicio)', !!habla, G.dialogo.actual() && G.dialogo.actual().text);
      await captura('inicio');
      await resolver();
      await jugar(1);

      // ---------- Historia: sigue la guía hasta el final ----------
      const pasos = G.misiones.steps;
      let mismo = 0, ultimoPaso = -1, iter = 0;
      while (!S.complete && iter++ < 90) {
        const st = S.step, def = pasos[st];
        if (st !== ultimoPaso) { empezar((st + 1) + ' · ' + (def ? def.texto : '?')); tr.paso = st; tr.momento = MOMENTOS[st]; mismo = 0; ultimoPaso = st; }
        const quest = $('quest') ? $('quest').textContent : '';
        if (mismo === 0) {
          check('Paso ' + (st + 1) + ' · el objetivo está a la vista', idioma === 'en' ? quest.trim().length > 5 : !!def && quest.includes(def.texto), quest.slice(0, 90));
          await mirarEN();
        }
        const g = G.misiones.guideTarget();
        if (!g) { atasco('sin guía', 'paso ' + st); check('Paso ' + (st + 1) + ' · la guía señala adónde ir', false, 'guideTarget() null'); break; }
        const it = G.interaccion.list.find(x => Math.abs(x.x - g.x) < 0.01 && Math.abs(x.z - g.z) < 0.01 && (!x.visible || x.visible()));
        const llego = await hacia(g.x, g.z, 70, 1.4, it && it.id);
        if (!llego) { atasco('no llega caminando', [r1(S.pos.x), r1(S.pos.y), r1(S.pos.z), '→', r1(g.x), r1(g.z), 'ocupado', G.ui.busy(), 'carta', G.ui.cardOpen, 'diálogo', G.dialogo.open(), 'agua', G.fisica.MOVE.swimming, 'vuela', G.fisica.MOVE.flying].join(' ')); check('Paso ' + (st + 1) + ' · se llega caminando adonde señala la guía', false, it && it.id); break; }
        const nb = G.interaccion.nearest();
        const pr = $('prompt');
        if (!nb || (it && nb.id !== it.id)) { atasco('al llegar, Acción no apunta a lo que señala la guía', (nb && nb.id) + ' ≠ ' + (it && it.id)); }
        if (mismo === 0) check('Paso ' + (st + 1) + ' · al llegar, el aviso dice qué hacer', !!nb && pr && !pr.hidden && pr.textContent.length > 8, pr && pr.textContent);
        await mirarEN();
        const antes = { step: S.step, col: S.collected.length };
        if (tr) tr.usos++;
        G.interaccion.action();
        const hizo = await resolver();
        await jugar(0.5);
        if (!hizo && S.step === antes.step && S.collected.length === antes.col) atasco('Acción no hace nada', nb && nb.id);
        if (S.step === antes.step) { if (++mismo >= 6) { atasco('el paso no avanza tras 6 intentos', def && def.texto); check('Paso ' + (st + 1) + ' · avanza', false, 'sigue en ' + st); break; } }
      }
      // ---------- Final ----------
      const fin = !$('end').hidden;
      check('Final: casa probada dos veces, fiesta y pantalla de fin', S.complete && S.step === G.misiones.DONE && G.eventos.had('Chapter2Completed') && fin, { paso: S.step, completo: S.complete, fin });
      check('Las 3 misiones completas y la ropa ganada (lentes, cuaderno, casco y botas)', ['lee_tierra', 'escuchar', 'casa'].every(m => S.missions[m]) && ['lentes:#2b2b2b:binoculares', 'mano:cuaderno', 'casco:constructor', 'botas:constructor'].every(k => S.unlocked.includes(k)), JSON.stringify(S.missions));
      const vin = G.comic.comicPanels().map(v => v.id);
      check('El cómic tiene las 4 viñetas del episodio', ['intro', 'sitio', 'escuchar', 'casa'].every(k => vin.includes(k)), vin.join(','));
      await mirarEN(); await captura('fin');
      empezar('Extra · Seguir explorando e «Iguaca te pregunta»');
      const bs = $('b-seguir'); if (bs && !bs.hidden) { bs.click(); tr.clics++; } await jugar(0.5);
      check('«Seguir explorando» deja el mundo libre', $('end').hidden && !G.ui.busy());
      if (G.aula && G.aula.activo) {
        const ig = G.interaccion.find('iguaca');
        for (let k = 0; k < 2; k++) { await hacia(ig.x, ig.z, 60, 1.4, 'iguaca'); tr.usos++; G.interaccion.action(); await resolver(); await jugar(0.3); }
        const f = (S.edu && S.edu.formativa) || {};
        check('«Iguaca te pregunta»: «Ahora no» primero, luego las 6 preguntas, sin puntaje', Object.keys(f).length === 6 && !G.ui.cardOpen, JSON.stringify(f));
      }
      cerrar();
      const errs = (W.__aveErrores || []).slice(errores0);
      check('Sin errores de JavaScript en el recorrido', errs.length === 0, errs.slice(0, 3).join(' | '));
      if (idioma === 'en') check('En inglés, ningún texto en español en pantalla en todo el recorrido', faltanEN.size === 0, [...faltanEN].slice(0, 40).join(' | '));
    } catch (e) {
      check('Sin excepción en el recorrido', false, e && e.stack || e);
    } finally {
      cerrar();
      G.dialogo.choose = chooseOrig; G.dialogo.say = sayOrig;
      for (const k of ['w', 'Shift', 'a']) tecla('keyup', k);
      if (fr && !opts.keep) { try { G.renderer.renderer.dispose(); G.renderer.renderer.forceContextLoss(); } catch (e) { /* ya cerrado */ } fr.remove(); }
      devolver();
    }
    // ---------- Resumen ----------
    const sum = k => tramos.reduce((a, x) => a + (x[k] || 0), 0);
    const historia = tramos.filter(x => !/^Extra/.test(x.nombre));
    const sumH = k => historia.reduce((a, x) => a + (x[k] || 0), 0);
    const minimo = sumH('simS') + (sumH('lineas') + sumH('clics')) * PULSAR;
    const leyendo = sumH('simS') + (sumH('chars') + sumH('cardChars')) / LECTURA + sumH('clics');
    const resumen = { minimoMin: r1(minimo / 60), leyendoMin: r1(leyendo / 60), simS: r1(sumH('simS')), metros: sumH('metros'), lineas: sumH('lineas'), clics: sumH('clics'), errores: sum('errores'), atascos: atascos.length, paredS: r1(sum('paredMs') / 1000) };
    check('Duración medida (mínimo y leyendo, sin el extra)', S.complete === true, resumen);
    return { out, tramos, atascos, faltanEN: [...faltanEN], resumen };
  }

  function tabla(r, idioma) {
    const L = ['### ' + (idioma === 'en' ? 'Inglés' : 'Español'), '',
      `Mínimo (solo pulsar): **${r.resumen.minimoMin} min** · leyendo: **${r.resumen.leyendoMin} min** · ${r.resumen.simS} s de juego caminando, ${r.resumen.metros} m, ${r.resumen.lineas} líneas, ${r.resumen.clics} clics, ${r.resumen.errores} errores a propósito, ${r.resumen.atascos} atascos.`, '',
      '| Paso | Juego (s) | Metros | Usos | Líneas | Caracteres | Clics | Errores | Leyendo (s) | Atascos |', '|---|---|---|---|---|---|---|---|---|---|'];
    for (const x of r.tramos) L.push(`| ${x.nombre} | ${x.simS} | ${x.metros} | ${x.usos} | ${x.lineas} | ${x.chars + x.cardChars} | ${x.clics} | ${x.errores} | ${Math.round(x.simS + (x.chars + x.cardChars) / LECTURA + x.clics)} | ${x.atascos.join('; ') || '—'} |`);
    for (const x of r.tramos) if (x.sueltos) L.push('', `Se abrió solo mientras caminaba (${x.nombre}): ` + x.sueltos.map(t => '«' + t + '»').join(', '));
    if (r.faltanEN.length) L.push('', 'Textos en español con el juego en inglés: ' + r.faltanEN.map(t => '«' + t + '»').join(', '));
    return L.join('\n');
  }

  async function ep2e2eTest(opts) {
    opts = opts || {};
    const idiomas = opts.idioma ? [opts.idioma] : ['es', 'en'];
    const results = [], tramos = {}, md = [];
    for (const id of idiomas) {
      const r = await vuelta(id, opts);
      results.push(...r.out); tramos[id] = r;
      md.push(tabla(r, id));
    }
    return { ok: results.every(x => x.ok), passed: results.filter(x => x.ok).length, total: results.length, results, tramos, md: md.join('\n\n') };
  }

  window.AV = window.AV || {};
  window.AV.ep2e2eTest = ep2e2eTest;
})();
