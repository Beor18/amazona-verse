/* QA · CG-3 · motor común para jugar un capítulo (2 a 6) de punta a punta SIN teleport (AV.epCaminar) · no toca el juego, solo lo juega
   Lo usan tests/qa/ep3_e2e.js … ep6_e2e.js (cada uno trae lo propio de su capítulo: cómo elige en sus tarjetas y qué comprueba
   al final). Sale de tests/qa/ep2_e2e.js y juega igual que un niño: abre index.html?pack=epN en un iframe del mismo origen
   (el almacenamiento se respalda entero y se devuelve igual), portada → creador → escena de inicio → sigue la flecha de la guía
   con las teclas de verdad (W y Mayús, la cámara mira al destino; si a pie no avanza, despega con V, sube con Espacio, va con W,
   baja con C y se posa con X), pulsa la tecla de Acción (E) ante lo que la guía señala, pasa cada línea con E y pulsa los botones
   reales de las tarjetas. NUNCA cambia S.step ni la posición: lo que no se pueda hacer así es un bug y el paso sale en rojo.
   Atajos, siempre dichos: el tiempo es el del juego (G.renderer.update a 0,05 s por cuadro) y no el reloj de pared; las opciones de
   cada tarjeta se leen envolviendo G.dialogo.choose (solo se miran: el clic es en el botón real).
   Elección por defecto en una tarjeta que el capítulo no conoce: la primera opción aún no probada con ese mismo texto; si la tarjeta
   vuelve igual (respuesta que no sirve: pista y se repite), prueba la siguiente; la que sirvió se recuerda para la próxima vez.
   Las opciones marcadas «✓ …» (ya hechas) van al final.
   cfg: { pack: 'ep3', n: 3, query: '&mapa=real' (opcional), limpiar: /regex de claves de localStorage/, politica(ops, line, ctx)
   → índice | null, tarjeta(card, ctx) → true si la resolvió (tarjetas propias del pack), esperar(G) → true mientras el juego lleva
   el control (p. ej. la canoa sobre raíles), volar(G, it) → true si al objetivo se llega volando y posándose encima (perchas),
   objetivo(G, guia, ctx) → { x, z, id, porque, bug } cuando la guía no basta (sale en rojo), finales(ctx) comprobaciones del final,
   maxIter, mismoMax }.
   opts: { idioma: 'es'|'en' (solo una vuelta), timeout: ms de arranque, keep: true (deja el iframe) }.
   Salida: { ok, passed, total, results, tramos, md }. */
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

  async function vuelta(cfg, idioma, opts) {
    const out = [], tramos = [], atascos = [], faltanEN = new Set();
    const pre = idioma.toUpperCase() + ' · ';
    const log = (...a) => { if (window.AV_E2E_LOG) console.info('[CG3] ' + cfg.pack + ' ' + idioma + ' · ' + a.map(s).join(' ').slice(0, 400)); }; // traza opcional
    const check = (name, ok, extra) => { out.push({ name: pre + name, ok: ok === true, extra: s(extra == null ? '' : extra).slice(0, 500) }); if (!ok) log('✗', name, extra); };
    let W, fr = null, G, S, $;
    const respaldo = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); respaldo[k] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
    try { for (const k of Object.keys(respaldo)) if ((cfg.limpiar || new RegExp('^' + cfg.pack + '|aula\\.' + cfg.pack + '|temporada')).test(k)) localStorage.removeItem(k); } catch (e) { /* */ }
    fr = document.createElement('iframe');
    fr.setAttribute('aria-hidden', 'true'); fr.tabIndex = -1;
    fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:700px;border:0;';
    const url = new URL(location.href); url.search = '?pack=' + cfg.pack + (cfg.query || ''); url.hash = '';
    fr.src = url.href; document.body.appendChild(fr);
    W = await until(() => { const x = fr.contentWindow; return x && x.AV && x.AV.pack === cfg.pack && x.AV.G && (x.AV.G.actores.player3D || x.AV.G.actores.failed3D) && x; }, opts.timeout || 240000, 100);
    if (W) await sleep(800);
    const devolver = () => {
      try {
        for (const k of Object.keys(localStorage)) if (!(k in respaldo)) localStorage.removeItem(k);
        for (const k of Object.keys(respaldo)) if (localStorage.getItem(k) !== respaldo[k]) localStorage.setItem(k, respaldo[k]);
      } catch (e) { /* sin almacenamiento */ }
    };
    if (!W || !W.AV || W.AV.pack !== cfg.pack) { check('El capítulo ' + cfg.n + ' arranca (?pack=' + cfg.pack + (cfg.query || '') + ')', false, 'no arrancó'); if (fr && !opts.keep) fr.remove(); devolver(); return { out, tramos, atascos, faltanEN: [] }; }
    G = W.AV.G; S = G.S; $ = id => W.document.getElementById(id);
    const doc = W.document;
    const errores0 = (W.__aveErrores || []).length;

    // ---------- Medida por tramo ----------
    let tr = null;
    const empezar = nombre => { cerrar(); log('▶', nombre, Math.round(performance.now() / 1000) + ' s'); tr = { nombre, simS: 0, metros: 0, vueloS: 0, usos: 0, lineas: 0, clics: 0, errores: 0, atascos: [], _t0: performance.now() }; };
    const cerrar = () => { if (!tr) return; tr.paredMs = Math.round(performance.now() - tr._t0); delete tr._t0; tr.simS = r1(tr.simS); tr.vueloS = r1(tr.vueloS); tr.metros = Math.round(tr.metros); tramos.push(tr); tr = null; };
    const atasco = (que, extra) => { const a = { paso: S.step, tramo: tr ? tr.nombre : '', que, extra: s(extra || '').slice(0, 300) }; atascos.push(a); if (tr) tr.atascos.push(que); log('atasco', a); };
    const MV = () => G.fisica.MOVE;
    async function jugar(segs) {
      const n = Math.max(1, Math.ceil(segs / 0.05));
      for (let i = 0; i < n; i++) {
        const x = S.pos.x, z = S.pos.z; G.renderer.update(0.05);
        if (tr) { tr.simS += 0.05; tr.metros += Math.hypot(S.pos.x - x, S.pos.z - z); if (MV().flying) tr.vueloS += 0.05; }
        if (i % 20 === 19) await sleep(0);
      }
    }
    // Inglés: lo que siga en español en pantalla (igual que ep2_e2e.js)
    const MOTOR = new Set(['Pulsa', 'para volar']);
    let fijosES = new Set(), valores = null;
    // Solo cuenta como español lo que lo parece: una palabra de enlace española o una palabra en minúscula con tilde o ñ, fuera de
    // los nombres entre «» (un texto inglés con un nombre propio, «Her name will be «Coquí»!», no es español); o un texto fijo del
    // pack tal cual. Y solo si sigue igual 300 ms después (el observador de idioma traduce en microtareas)
    const ES_PAL = /(^|[\s(,.:;¿¡])(y|el|los|las|del|que|con|para|por|una|en|de|la|al|está|sin|pero|como|cuando|aquí|también|muy)(?=$|[\s),.:;!?])/i;
    const pareceES = t => { const u = t.replace(/«[^»]*»/g, ' '); return ES_PAL.test(u) || /(^|\s)[a-záéíóúüñ]*[áéíóúñ][a-záéíóúüñ]*/.test(u) || /[¿¡]/.test(u); };
    async function mirarEN() {
      if (idioma !== 'en' || !G.idioma || !G.idioma.faltan) return;
      await sleep(15);
      if (G.idioma.actual() !== 'en') faltanEN.add('[el juego no está en inglés: ' + G.idioma.actual() + ']');
      const cand = [];
      const w = doc.createTreeWalker(doc.body, W.NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const p = n.parentElement, t = n.data.replace(/\s+/g, ' ').trim();
        if (!p || !/\p{L}{2}/u.test(t) || /^(SCRIPT|STYLE)$/.test(p.nodeName) || p.closest('[data-no-tr],[hidden]') || !p.getClientRects().length) continue;
        const base = t.replace(/^[·✓]\s*/, '').replace(/\s*\(\d+\/\d+\)$/, '').replace(/\s*\d+\/\d+$/, '');
        if (fijosES.has(base)) { cand.push([n, t]); continue; }
        if (MOTOR.has(t) || !pareceES(t) || !G.idioma.faltan([t]).length) continue;
        if (!valores) valores = Object.values(W.AV_EN || {});
        if (valores.some(v => v === t || (t.length >= 3 && v.endsWith(t)))) continue;
        cand.push([n, t]);
      }
      if (!cand.length) return;
      await sleep(300);
      for (const [n, t] of cand) if (n.isConnected && n.data.replace(/\s+/g, ' ').trim() === t && n.parentElement && n.parentElement.getClientRects().length) faltanEN.add(t.slice(0, 200));
    }
    // Teclas de verdad (las que lee src/engine/input.js)
    const CODE = { ' ': 'Space', Shift: 'ShiftLeft' };
    const tecla = (tipo, k) => W.dispatchEvent(new W.KeyboardEvent(tipo, { key: k, code: CODE[k] || 'Key' + k.toUpperCase(), bubbles: true }));
    const pulsar = async k => { tecla('keydown', k); await jugar(0.05); tecla('keyup', k); };
    const accion = async () => { tecla('keydown', 'e'); tecla('keyup', 'e'); };
    const ocupado = () => G.ui.busy();

    // ---------- Tarjetas ----------
    let ultimas = null, lineaCarta = null;
    const chooseOrig = G.dialogo.choose;
    G.dialogo.choose = function (line, options, done) { ultimas = options; lineaCarta = line; return chooseOrig.apply(this, arguments); };
    const yaFallo = new Set();
    const fallaUnaVez = k => { if (yaFallo.has(k)) return false; yaFallo.add(k); if (tr) tr.errores++; return true; };
    // Memoria por texto de tarjeta: lo probado que no sirvió y lo que sirvió
    const probado = new Map(), sirvio = new Map();
    let pendiente = null;
    const nota = clave => { // la tarjeta que sale ahora dice si la anterior sirvió (si vuelve la misma, no sirvió)
      if (!pendiente) return;
      if (pendiente.clave === clave) { if (tr) tr.errores++; }
      else { sirvio.set(pendiente.clave, pendiente.i); }
      pendiente = null;
    };
    function porDefecto(clave, labels) {
      const t = probado.get(clave) || [];
      const orden = labels.map((l, i) => i).sort((a, b) => (/^✓/.test(labels[a]) ? 1 : 0) - (/^✓/.test(labels[b]) ? 1 : 0));
      let i = sirvio.has(clave) && !/^✓/.test(labels[sirvio.get(clave)] || '') && !t.includes(sirvio.get(clave)) ? sirvio.get(clave) : orden.find(k => !t.includes(k));
      if (i == null) { probado.set(clave, []); i = orden[0]; }
      probado.set(clave, (probado.get(clave) || []).concat(i));
      return i;
    }
    const ctx = { cfg, idioma, check, atasco, fallaUnaVez, jugar, pulsar, accion, until, sleep, get G() { return G; }, get S() { return S; }, get W() { return W; }, $, get tr() { return tr; } };
    const cartaAbierta = () => G.ui.cardOpen && !$('card').hidden;
    const clic = async b => { if (tr) tr.clics++; b.click(); await jugar(0.05); };
    ctx.clic = clic;
    async function resolver() {
      let n = 0, hizo = false;
      while (n++ < 600) {
        await mirarEN();
        if (G.dialogo.open()) { if (tr) tr.lineas++; await accion(); hizo = true; await jugar(0.05); continue; }
        if (cartaAbierta()) {
          const card = $('card'); hizo = true;
          if (card.querySelector('.edu-opt')) { // «Iguaca te pregunta»: prueba opciones hasta acertar (pista y respuesta sin castigo)
            const sg = $('edu-seguir');
            if (sg) { await clic(sg); continue; }
            const b = card.querySelector('.edu-opt:not([disabled])');
            if (!b) { atasco('tarjeta del aula sin opciones'); break; }
            await clic(b); continue;
          }
          if (ultimas) { // tarjeta de elección (G.dialogo.choose): se pulsa el botón real
            const ops = ultimas, line = lineaCarta; ultimas = null;
            const clave = (line && line.text) || '';
            nota(clave);
            let i = cfg.politica ? cfg.politica(ops, line, ctx) : null;
            if (i == null || i < 0 || i >= ops.length) i = porDefecto(clave, ops.map(o => o.label || ''));
            pendiente = { clave, i };
            const b = $('ch-' + i); if (!b) { atasco('falta el botón ' + i, card.textContent.slice(0, 80)); break; }
            await clic(b); continue;
          }
          // Tarjeta propia del pack (G.ui.showCard)
          if (cfg.tarjeta && await cfg.tarjeta(card, ctx)) { await jugar(0.05); continue; }
          const bs = [...card.querySelectorAll('[id^="ch-"]')];
          const clave = 'card:' + ((card.querySelector('h2') || {}).textContent || '') + '|' + ((card.querySelector('p') || {}).textContent || '');
          nota(clave);
          if (!bs.length) { atasco('tarjeta sin botones de elección', card.textContent.slice(0, 80)); await accion(); await jugar(0.1); if (cartaAbierta()) break; continue; }
          const i = porDefecto(clave, bs.map(b => b.textContent));
          pendiente = { clave, i };
          await clic(bs[i]); continue;
        }
        break;
      }
      await mirarEN();
      return hizo;
    }

    // ---------- Moverse: a pie y, si no se puede, volando ----------
    async function hacia(x, z, max, tol, id) {
      const obj = id && G.interaccion.find(id);
      if (obj && obj.r) tol = Math.min(tol, Math.max(0.4, obj.r - 0.4)); // dentro del radio de lo que se quiere usar
      tecla('keydown', 'Shift'); tecla('keydown', 'w');
      let quieto = 0, llego = false, lado = 'a', mejor = Infinity, sinMejora = 0, corre = true;
      for (let t = 0; t < max; t += 0.25) {
        const dx = x - S.pos.x, dz = z - S.pos.z, d = Math.hypot(dx, dz);
        if (corre !== d > 4) { corre = d > 4; tecla(corre ? 'keydown' : 'keyup', 'Shift'); } // cerca, camina (no se pasa de largo)
        const nb = G.interaccion.nearest();
        if (d < tol || (id && nb && nb.id === id && d < nb.r - 0.3)) { llego = true; break; }
        if (ocupado()) { await resolver(); continue; }
        if (cfg.esperar && cfg.esperar(G)) { tecla('keyup', 'w'); await jugar(0.25); tecla('keydown', 'w'); continue; }
        G.camara.yaw = Math.atan2(-dx, -dz);
        const p0 = { x: S.pos.x, z: S.pos.z };
        await jugar(d < 2.5 ? 0.05 : 0.25);
        quieto = Math.hypot(S.pos.x - p0.x, S.pos.z - p0.z) < (d < 2.5 ? 0.03 : 0.15) ? quieto + 1 : 0;
        if (quieto >= 4) { tecla('keydown', lado); await jugar(0.6); tecla('keyup', lado); lado = lado === 'a' ? 'd' : 'a'; quieto = 0; }
        if (d < mejor - 0.5) { mejor = d; sinMejora = 0; } else if (++sinMejora > 60) break; // 15 s sin acercarse: a pie no se llega
      }
      tecla('keyup', 'w'); tecla('keyup', 'Shift');
      await jugar(0.3);
      return llego;
    }
    // Vuela hasta (x,z): V despega, Espacio sube hasta pasar lo que tapa, W avanza; al llegar baja con C y se posa con X
    async function volarA(x, z, max, tol, alto) {
      if (!MV().flying) { await pulsar('v'); await jugar(0.6); }
      if (!MV().flying) return false;
      if (tr) tr.vuelo = true;
      tecla('keydown', ' '); await jugar(alto || 1.2); tecla('keyup', ' ');
      let llego = false;
      for (let t = 0; t < max; t += 0.25) {
        const dx = x - S.pos.x, dz = z - S.pos.z, d = Math.hypot(dx, dz);
        if (d < tol) { // se queda cernida para frenar y vuelve a mirar: posarse pide estar justo encima
          await jugar(0.6);
          if (Math.hypot(x - S.pos.x, z - S.pos.z) < tol) { llego = true; break; }
          continue;
        }
        if (ocupado()) { await resolver(); continue; }
        G.camara.yaw = Math.atan2(-dx, -dz);
        const y0 = S.pos.y;
        if (d < 5) { tecla('keydown', 'w'); await jugar(d < 1.5 ? 0.05 : 0.1); tecla('keyup', 'w'); await jugar(0.3); } // toques cortos
        else { tecla('keydown', 'w'); await jugar(0.25); }
        if (d >= 5 && Math.abs(S.pos.y - y0) < 0.02 && MV().speed < 1) { tecla('keydown', ' '); await jugar(0.4); tecla('keyup', ' '); } // algo tapa: más alto
      }
      tecla('keyup', 'w');
      await jugar(0.4); // cernida
      await pulsar('x'); // aterrizar: baja suave
      for (let i = 0; i < 40 && MV().flying; i++) await jugar(0.25); // baja sola hasta posarse
      for (let i = 0; i < 40 && MV().flying; i++) { tecla('keydown', 'c'); await jugar(0.25); } // si no, baja con C
      tecla('keyup', 'c');
      await jugar(0.5);
      return llego && !MV().flying;
    }
    ctx.hacia = hacia; ctx.volarA = volarA; ctx.resolver = resolver;

    try {
      check('Arranca limpio el capítulo ' + cfg.n + (cfg.query ? ' (' + cfg.query.replace(/^&/, '') + ')' : ''), W.AV.pack === cfg.pack && !S.profile.created, { pack: W.AV.pack, creado: S.profile.created });
      if (idioma === 'en') {
        if (G.aula && G.aula.setAjuste) G.aula.setAjuste('idioma', 'en'); else G.idioma.poner('en');
        await G.idioma.listo; await sleep(200);
        check('Con EN puesto, el diccionario carga y traduce («Acción» → «Action»)', G.idioma.actual() === 'en' && G.idioma.tr('Acción') === 'Action', G.idioma.actual() + ' · ' + G.idioma.tr('Acción'));
        try {
          const P = G.pack, D = P.diario || {}, fijos = [].concat(
            P.dialogos && P.dialogos.datos ? P.dialogos.datos().escenas.flatMap(e => e.lineas || []) : [], (P.historia.pasos || []).map(p => p.texto), [P.historia.fin && P.historia.fin()],
            (P.misiones || []).flatMap(m => [m.titulo, m.hud].concat((m.pasos || []).map(p => p.texto))),
            [D.titulo].concat(Object.values(D.categorias || {}).flatMap(c => [c.nombre, c.desconocido]), (D.entradas || []).flatMap(e => [e.nombre, e.texto])),
            (P.ropa || []).flatMap(r => [r.nombre, r.pista]), ((P.comic || {}).vinetas || []).map(v => typeof v.texto === 'string' ? v.texto : null),
            Object.values((P.meta || {}).hud || {}).filter(v => typeof v === 'string')).filter(t => typeof t === 'string' && t).map(t => t.replace(/\s+/g, ' ').trim());
          fijosES = new Set(fijos);
          const sinEN = G.idioma.faltan(fijos);
          check('Todos los textos fijos del pack tienen EN (' + fijos.length + ')', !sinEN.length, [...new Set(sinEN)].slice(0, 20).join(' | '));
        } catch (e) { check('Se leen los textos fijos del pack', false, e && e.message); }
      }
      // ---------- Portada y creador ----------
      empezar('0 · Portada, creador e inicio');
      const t = $('title');
      check('La portada está abierta para un jugador nuevo', !!t && t.open);
      await mirarEN();
      const bj = t && t.querySelector('form[method=dialog] button'); if (bj) { bj.click(); tr.clics++; }
      const cr = $('creator');
      check('Jugar abre el creador', !!await until(() => cr && !cr.hidden, 8000));
      await until(() => $('p-stage-status') && $('p-stage-status').hidden, 30000);
      await mirarEN();
      if ($('p-save')) { $('p-save').click(); tr.clics++; }
      await until(() => cr.hidden, 8000);
      await jugar(0.5);
      check('Empezar cierra el creador y crea el perfil', cr.hidden && S.profile.created, S.profile.name);
      const habla = await until(() => G.ui.busy(), 90000); // pack.inicio llega tras guardar; con la máquina cargada tarda
      check('Al empezar se abre la escena de inicio', !!habla, G.dialogo.actual() && G.dialogo.actual().text);
      await resolver();
      await jugar(1);

      // ---------- Historia: sigue la guía hasta el final ----------
      const pasos = G.misiones.steps;
      const progreso = () => S.step + '|' + S.collected.length + '|' + (S.events || []).length + '|' + Object.keys(S.missions || {}).filter(k => S.missions[k]).length;
      let mismo = 0, ultimoPaso = -1, iter = 0, ultimoProg = '', fallo = null;
      const vistos = new Set();
      while (!S.complete && iter++ < (cfg.maxIter || 260)) {
        const st = S.step, def = pasos[st];
        if (st !== ultimoPaso) { empezar((st + 1) + ' · ' + (def ? def.texto : '?')); tr.paso = st; mismo = 0; ultimoPaso = st; }
        if (!vistos.has(st)) {
          vistos.add(st);
          const quest = $('quest') ? $('quest').textContent : '';
          check('Paso ' + (st + 1) + ' · el objetivo está a la vista', idioma === 'en' ? quest.trim().length > 5 : !!def && quest.includes(def.texto), quest.replace(/\s+/g, ' ').trim().slice(0, 90));
        }
        if (ocupado()) { await resolver(); continue; }
        if (cfg.esperar && cfg.esperar(G)) { await jugar(0.5); continue; }
        let g = G.misiones.guideTarget();
        // Donde la guía no basta (señala algo que ya está hecho o deshace lo hecho), el capítulo dice qué haría un niño que lee
        // los avisos; queda apuntado como atasco y como comprobación en rojo (es un bug de la guía, ver BUGS.md)
        const otro = cfg.objetivo && cfg.objetivo(G, g, ctx);
        if (otro) {
          const k = 'guia:' + st + ':' + otro.porque;
          if (!vistos.has(k)) { vistos.add(k); atasco('la guía no basta', otro.porque); check('Paso ' + (st + 1) + ' · la guía señala lo que falta (' + otro.porque + ')', false, otro.bug || ''); }
          g = otro;
        }
        if (!g) { atasco('sin guía', 'paso ' + st); fallo = 'Paso ' + (st + 1) + ' · la guía señala adónde ir (guideTarget() null)'; break; }
        const it = (g.id && G.interaccion.find(g.id)) || G.interaccion.list.find(x => Math.abs(x.x - g.x) < 0.01 && Math.abs(x.z - g.z) < 0.01 && (!x.visible || x.visible()));
        const porAire = cfg.volar && cfg.volar(G, it);
        let llego = porAire ? false : await hacia(g.x, g.z, 120, 1.4, it && it.id);
        if (!llego && !S.complete && !ocupado()) { // a pie no se llega: se intenta volando (como haría un niño)
          if (!porAire) atasco('a pie no llega: prueba volando', [r1(S.pos.x), r1(S.pos.y), r1(S.pos.z), '→', r1(g.x), r1(g.z), it && it.id].join(' '));
          llego = await volarA(g.x, g.z, 120, porAire ? 0.5 : 1.2, porAire ? 2.5 : 1.2);
          if (!llego && it) { const nb = G.interaccion.nearest(); llego = !!(nb && nb.id === it.id); }
        }
        if (!llego) {
          atasco('no se llega ni a pie ni volando', [r1(S.pos.x), r1(S.pos.y), r1(S.pos.z), '→', r1(g.x), r1(g.z), 'ocupado', ocupado(), 'agua', MV().swimming, 'vuela', MV().flying].join(' '));
          fallo = 'Paso ' + (st + 1) + ' · se llega (a pie o volando) adonde señala la guía: ' + ((it && it.id) || [r1(g.x), r1(g.z)].join(',')) + ' desde ' + [r1(S.pos.x), r1(S.pos.y), r1(S.pos.z)].join(',');
          break;
        }
        const nb = G.interaccion.nearest();
        if (it && (!nb || nb.id !== it.id)) atasco('al llegar, Acción no apunta a lo que señala la guía', (nb && nb.id) + ' ≠ ' + it.id);
        const antes = progreso();
        if (tr) tr.usos++;
        await accion();
        const hizo = await resolver();
        await jugar(0.5);
        if (cfg.esperar) for (let k = 0; k < 2400 && (cfg.esperar(G) || ocupado()) && !S.complete; k++) { if (ocupado()) await resolver(); else await jugar(0.5); }
        if (!hizo && progreso() === antes) atasco('Acción no hace nada', nb && nb.id);
        const ahora = progreso();
        if (ahora === ultimoProg || ahora === antes) {
          if (++mismo >= (cfg.mismoMax || 6)) { atasco('el paso no avanza tras ' + mismo + ' intentos', def && def.texto); fallo = 'Paso ' + (st + 1) + ' · avanza: sigue en «' + (def && def.texto) + '» tras ' + mismo + ' intentos en ' + ((it && it.id) || '?'); break; }
        } else mismo = 0;
        ultimoProg = ahora;
      }
      if (fallo) check(fallo, false, (atascos[atascos.length - 1] || {}).extra);
      else if (!S.complete) check('La historia llega al final en ' + (cfg.maxIter || 260) + ' acciones', false, 'paso ' + S.step);
      else check('Toda la historia jugada sin teleport (' + pasos.length + ' pasos)', true, atascos.map(a => a.que).join('; '));
      // ---------- Final ----------
      await until(() => !$('end').hidden, 3000);
      const fin = !$('end').hidden;
      const ev = 'Chapter' + cfg.n + 'Completed';
      check('Final: ' + ev + ' y pantalla de fin', S.complete && S.step === G.misiones.DONE && G.eventos.had(ev) && fin, { paso: S.step, completo: S.complete, fin });
      const ms = (G.pack.misiones || []).map(m => m.id);
      check('Las ' + ms.length + ' misiones completas', ms.length > 0 && ms.every(m => S.missions[m]), JSON.stringify(S.missions));
      if (cfg.finales) await cfg.finales(ctx);
      if (S.complete) {
        empezar('Extra · Seguir explorando e «Iguaca te pregunta»');
        const bs = $('b-seguir'); if (bs && !bs.hidden) { bs.click(); tr.clics++; } await jugar(0.5);
        check('«Seguir explorando» deja el mundo libre', $('end').hidden && !G.ui.busy());
        const ig = G.aula && G.aula.activo && G.interaccion.find('iguaca');
        if (ig) {
          for (let k = 0; k < 3 && Object.keys((S.edu && S.edu.formativa) || {}).length < 6; k++) {
            let ok = await hacia(ig.x, ig.z, 120, 1.4, 'iguaca'); if (!ok) ok = await volarA(ig.x, ig.z, 120, 1.2);
            tr.usos++; await accion(); await resolver(); await jugar(0.3);
          }
          const f = (S.edu && S.edu.formativa) || {};
          check('«Iguaca te pregunta»: las 6 preguntas, sin puntaje', Object.keys(f).length === 6 && !G.ui.cardOpen, JSON.stringify(f));
        }
        // Diario · Ciencia: jugando el capítulo (sin buscar los hallazgos) se ganan todas las fichas publicadas (G.aula.enlazar)
        const AUc = G.aula;
        if (AUc && AUc.activo && AUc.pendientes && AUc.fichas().length) {
          for (let k = 0; k < 240 && AUc.pendientes().length; k++) { if (ocupado()) await resolver(); await jugar(0.5); }
          const fal = AUc.fichas().filter(x => !AUc.tieneFicha(x.id)).map(x => x.id);
          check('Diario · las ' + AUc.fichas().length + ' fichas de Ciencia del capítulo quedan ganadas al jugarlo', !fal.length, fal.join(',') || (S.edu.fichas || []).join(','));
        }
      }
      cerrar();
      const errs = (W.__aveErrores || []).slice(errores0);
      check('Sin errores de JavaScript en el recorrido', errs.length === 0, errs.slice(0, 3).join(' | '));
      if (idioma === 'en') check('En inglés, ningún texto en español en pantalla en todo el recorrido', faltanEN.size === 0, [...faltanEN].slice(0, 40).join(' | '));
    } catch (e) {
      check('Sin excepción en el recorrido', false, e && e.stack || e);
    } finally {
      cerrar();
      G.dialogo.choose = chooseOrig;
      for (const k of ['w', 'Shift', 'a', 'd', ' ', 'c']) tecla('keyup', k);
      if (fr && !opts.keep) { try { G.renderer.renderer.dispose(); G.renderer.renderer.forceContextLoss(); } catch (e) { /* ya cerrado */ } fr.remove(); }
      devolver();
    }
    const sum = k => tramos.reduce((a, x) => a + (x[k] || 0), 0);
    const resumen = { simS: r1(sum('simS')), vueloS: r1(sum('vueloS')), metros: sum('metros'), lineas: sum('lineas'), clics: sum('clics'), errores: sum('errores'), atascos: atascos.length, paredS: r1(sum('paredMs') / 1000) };
    check('Resumen (juego, vuelo, metros, líneas, clics, atascos)', true, resumen);
    check('Por paso: s de juego / m / usos / s volando', true, tramos.map(x => x.nombre.split(' · ')[0] + ':' + x.simS + '/' + x.metros + '/' + x.usos + (x.vueloS ? '/v' + x.vueloS : '')).join(' '));
    return { out, tramos, atascos, faltanEN: [...faltanEN], resumen };
  }

  function tabla(r, idioma, n) {
    const L = ['### Capítulo ' + n + ' · ' + (idioma === 'en' ? 'inglés' : 'español'), '',
      `${(r.resumen || {}).simS} s de juego (${(r.resumen || {}).vueloS} s volando), ${(r.resumen || {}).metros} m, ${(r.resumen || {}).lineas} líneas, ${(r.resumen || {}).clics} clics, ${(r.resumen || {}).atascos} atascos.`, '',
      '| Paso | Juego (s) | Vuelo (s) | Metros | Usos | Líneas | Clics | Errores | Atascos |', '|---|---|---|---|---|---|---|---|---|'];
    for (const x of r.tramos) L.push(`| ${x.nombre} | ${x.simS} | ${x.vueloS} | ${x.metros} | ${x.usos} | ${x.lineas} | ${x.clics} | ${x.errores} | ${x.atascos.join('; ') || '—'} |`);
    if (r.faltanEN.length) L.push('', 'Textos en español con el juego en inglés: ' + r.faltanEN.map(t => '«' + t + '»').join(', '));
    return L.join('\n');
  }

  async function epCaminar(cfg, opts) {
    opts = opts || {};
    const idiomas = opts.idioma ? [opts.idioma] : ['es', 'en'];
    const results = [], tramos = {}, md = [];
    for (const id of idiomas) {
      const r = await vuelta(cfg, id, opts);
      results.push(...r.out); tramos[id] = r;
      md.push(tabla(r, id, cfg.n));
    }
    return { ok: results.every(x => x.ok), passed: results.filter(x => x.ok).length, total: results.length, results, tramos, md: md.join('\n\n') };
  }

  window.AV = window.AV || {};
  window.AV.epCaminar = epCaminar;
})();
