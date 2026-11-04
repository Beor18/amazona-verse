/* Amazona Verse · pantalla de carga (Kelvin, 4-nov: «un pequeño loading de avance para que se pueda cargar todo»)
   Entre «Empezar» (o la elección de modo en la portada) y el control del jugador: antes el jugador entraba en cuanto el
   mundo básico existía y luego llegaban de golpe la ciudad, los _hd, las texturas grandes y los programas (tirones y picos
   de memoria; en el iPhone se cerraba la página: QA-110, KIMI-011, QA-53). Ahora, mientras el juego está en pausa y el
   mundo tapado, se espera a lo que de verdad falta, por tandas, con una barra que avanza según eso:
     1. mundo   (peso 0,15): terreno listo (G.terreno.listo) y mundo listo (G.mundo.listo).
     2. zona    (peso 0,45): G.mundo.streaming.precargarZona(x, z): lo que el streaming cargaría en los primeros segundos de
                juego (modelo completo y _hd de lo cercano, kit de la ciudad a la vista, lejanos) con sus rangos de siempre.
     3. texturas (peso 0,2): renderer.precarga.subirTexturas, unas pocas por cuadro (2 en el móvil o en «bajo»).
     4. programas (peso 0,2): el precalentado de renderer.js (QA-53), que con el mundo tapado enlaza hasta 8 por cuadro.
     Al final, dos cuadros de verdad debajo de la pantalla (opaca) y una marca en la GPU (renderer.precarga.marcaGPU): el
     jugador no ve el primer dibujo, que es el que paga los búferes a pantalla completa y la cola de subidas.
   Si ya está todo (caché, segunda vez) termina en el primer cuadro y casi no se ve: el contenido aparece a los 250 ms.
   Tope de 20 s: entra igual y lo que falte sigue en segundo plano como hoy. Sin texto de consola.
   Solo una vez por sesión (la primera entrada). ?carga=0 la apaga; los minijuegos aparte (flight, maze, river, tren) no la usan.
   API: AV.carga = { activa, hecha, corridas, esperar(ms), correr(o), test(o) }; AV.cargaTest(). */
window.AVCarga = function (G) {
  'use strict';
  if (G.carga) return G.carga;
  const doc = document, $ = id => doc.getElementById(id), R = G.renderer, RP = R.precarga;
  const L = (es, en) => (G.idioma && G.idioma.actual && G.idioma.actual() === 'en' ? en : es);
  const TOPE = 20000, CONTENIDO_MS = 250, FRASE_MS = 2200;
  const PESOS = { mundo: 0.15, zona: 0.45, texturas: 0.2, programas: 0.2 };
  const ligero = () => !!(R.MOBILE || (R.calidad && R.calidad.nivel === 'bajo'));
  // Frases que rotan (juego, no datos): ES y EN
  const FRASES = [
    ['Afilando el pico…', 'Sharpening the beak…'],
    ['Contando cotorras…', 'Counting parrots…'],
    ['Despertando a los coquíes…', 'Waking up the coquís…'],
    ['Peinando las plumas…', 'Preening the feathers…'],
    ['Inflando las nubes…', 'Fluffing up the clouds…'],
    ['Buscando la mejor rama…', 'Finding the best branch…'],
    ['Calentando las alas…', 'Warming up the wings…'],
    ['Regando El Yunque…', 'Watering El Yunque…'],
  ];
  const AVISOS = {
    empieza: ['Preparando la isla…', 'Getting the island ready…'],
    paso: ['Preparando la isla: {} %', 'Getting the island ready: {} %'],
    listo: ['¡Lista la isla! A volar.', 'The island is ready! Let’s fly.'],
    etiqueta: ['Preparando la isla', 'Getting the island ready'],
  };
  const tx = (par, v) => L(par[0], par[1]).replace('{}', v);
  const MINI = new Set(['flight', 'maze', 'river', 'tren']);
  const apagada = /[?&]carga=0\b/.test(location.search);

  // Hoja de estilo propia (no va en index.html)
  if (!doc.querySelector('link[data-carga]')) {
    const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = 'src/ui/carga.css'; l.setAttribute('data-carga', '');
    doc.head.appendChild(l);
  }

  // ---------- Pantalla ----------
  let el = null, lleno = null, barra = null, frase = null, aviso = null;
  function logo() {
    const svg = doc.querySelector('#title-logo svg');
    if (!svg) return '<b style="font:700 var(--fs-3xl)/1 var(--font-display)">Amazona Verse</b>';
    // Copia del logo de la portada con ids propios (los degradados no se comparten con un <dialog> cerrado)
    return svg.outerHTML.replace(/id="([\w-]+)"/g, 'id="$1-carga"').replace(/url\(#([\w-]+)\)/g, 'url(#$1-carga)')
      .replace(/ role="img"/, '').replace(/ aria-label="[^"]*"/, '');
  }
  function crear() {
    if (el) return el;
    el = doc.createElement('div');
    el.id = 'carga'; el.hidden = true; el.tabIndex = -1; el.setAttribute('data-no-tr', '');
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-busy', 'true');
    const nubes = [[10, 160, 70, -20], [22, 280, 110, -70], [36, 210, 90, -40]]
      .map(([y, w, t, d]) => `<span class="carga-nube" style="--y:${y}%;--w:${w}px;--t:${t}s;--d:${d}s"></span>`).join('');
    const plumas = [[9, 15, -3], [27, 19, -11, 16, 'var(--gold)'], [48, 17, -7, 18], [68, 21, -15, 26, 'var(--crest)'], [88, 16, -1, 18, 'var(--gold)']]
      .map(([x, t, d, s, c]) => `<span class="carga-pluma" style="--x:${x}%;--t:${t}s;--d:${d}s${s ? ';--s:' + s + 'px' : ''}${c ? ';--c:' + c : ''}"></span>`).join('');
    const colinas = doc.querySelector('#title .title-sky .hills'); // las colinas y palmas de la portada, si las hay
    el.innerHTML = `<div class="carga-cielo" aria-hidden="true"><span class="carga-sol"></span>${nubes}${colinas ? colinas.outerHTML : ''}${plumas}</div>`
      + '<div class="carga-main">'
      + `<div class="carga-logo" aria-hidden="true">${logo()}</div>`
      + '<div class="carga-ave" aria-hidden="true"><span class="carga-sombra"></span><img src="assets/vittata.png" alt="" width="512" height="512" decoding="async"></div>'
      + '<p class="carga-frase" aria-hidden="true"></p>'
      + '<div class="carga-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="carga-lleno"></span></div>'
      + '<p class="sr-only" aria-live="polite" aria-atomic="true"></p>'
      + '</div>';
    doc.body.appendChild(el);
    lleno = el.querySelector('.carga-lleno'); barra = el.querySelector('.carga-barra');
    frase = el.querySelector('.carga-frase'); aviso = el.querySelector('[aria-live]');
    return el;
  }
  function ponerFrase(i) { frase.innerHTML = ''; const s = doc.createElement('span'); s.textContent = L(FRASES[i][0], FRASES[i][1]); frase.appendChild(s); }

  // ---------- Estado y medida ----------
  const estado = { activa: false, hecha: false, corridas: [], ultima: null };
  let mundoOk = false, terrenoOk = false, ocultar = false, corriendo = null, nDibujos = 0;
  G.on('render', () => { nDibujos++; }, 99); // cuadros dibujados de verdad (con el mundo destapado)
  if (G.mundo && G.mundo.listo) Promise.resolve(G.mundo.listo).then(() => { mundoOk = true; }, () => { mundoOk = true; });
  else mundoOk = true;
  if (G.terreno && G.terreno.listo) Promise.resolve(G.terreno.listo).then(() => { terrenoOk = true; }, () => { terrenoOk = true; });
  else terrenoOk = true;
  // Opaca: mientras está, el mundo no se dibuja (el bucle del renderer precalienta por tandas en su lugar), como con el creador
  if (G.ui && G.ui.worldHidden && !G.ui.worldHidden.carga) {
    const previo = G.ui.worldHidden; G.ui.worldHidden = () => ocultar || previo(); G.ui.worldHidden.carga = true;
  }
  // El inicio del capítulo (diálogo) espera a que termine la carga: no arranca debajo de la pantalla
  const diferidas = [];
  if (G.pack && typeof G.pack.inicio === 'function' && !G.pack.inicio.carga) {
    const inicio0 = G.pack.inicio;
    G.pack.inicio = function () { const a = arguments, t = this; if (estado.activa) { diferidas.push(() => inicio0.apply(t, a)); return; } return inicio0.apply(t, a); };
    G.pack.inicio.carga = true;
  }

  // Una corrida: muestra la pantalla, mide y avanza hasta que no falte nada (o el tope). o: { tope, forzar, simularPendiente }
  function correr(o) {
    o = o || {};
    if (corriendo) return corriendo;
    const tope = o.tope || TOPE, t0 = performance.now(), lig = ligero();
    const C = { t0, ms: 0, motivo: '', muestras: [0], etapas: {}, ligero: lig, cuadroRevelar: 0, texSubidas: 0, maxTex: 0, maxProg: 0, zona: null };
    estado.activa = true; estado.ultima = C;
    crear();
    el.classList.remove('carga-sale', 'carga-vis'); el.hidden = false;
    lleno.style.setProperty('--v', '0'); barra.setAttribute('aria-valuenow', '0');
    barra.setAttribute('aria-label', tx(AVISOS.etiqueta)); barra.setAttribute('aria-valuetext', tx(AVISOS.empieza));
    aviso.textContent = tx(AVISOS.empieza);
    let iFrase = Math.floor(Math.random() * FRASES.length); ponerFrase(iFrase);
    ocultar = true;
    if (G.pausa) G.pausa.set('carga', true);
    const foco = doc.activeElement; try { el.focus({ preventScroll: true }); } catch (e) { /* sin foco */ }
    const tVis = setTimeout(() => el.classList.add('carga-vis'), CONTENIDO_MS);
    let tFrase = t0, zona = null, mostrado = 0, hito = 0, fase = 'carga', d0 = 0, marca = null;
    const ST = () => G.mundo && G.mundo.streaming;
    corriendo = new Promise(fin => {
      let rafId = 0, guarda = 0, cerrado = false;
      function medir() {
        const now = performance.now();
        // 1. mundo
        const pM = mundoOk ? 1 : terrenoOk ? 0.5 : 0;
        // 2. zona de inicio (cuando el mundo está listo; antes, el streaming todavía arranca)
        if (mundoOk && !zona && ST() && ST().precargarZona) {
          const S = G.S, p = S.pos || { x: 0, z: 0 };
          zona = ST().precargarZona(p.x, p.z, lig ? { descargas: 1, ms: 8 } : { descargas: 3, ms: 16 });
          C.zona = zona ? { radio: zona.radio, total: zona.total() } : null;
        }
        const zHecho = mundoOk && (!zona || zona.hecho()), pZ = !mundoOk ? 0 : zona ? (zHecho ? 1 : zona.progreso()) : 1;
        // 3. texturas por tandas
        let pT = 0, nT = 0;
        if (mundoOk && RP) {
          C.texSubidas += RP.subirTexturas(lig ? 2 : 6, lig ? 6 : 10);
          nT = RP.texturas(); C.maxTex = Math.max(C.maxTex, nT + C.texSubidas);
          pT = C.maxTex ? Math.min(1, C.texSubidas / C.maxTex) : 1; if (!nT) pT = 1;
        } else if (mundoOk) pT = 1;
        // 4. programas (los enlaza el bucle del renderer con el mundo tapado)
        let pP = 0, nP = 0;
        if (mundoOk && RP) {
          nP = Math.max(0, RP.programas()); C.maxProg = Math.max(C.maxProg, nP);
          pP = C.maxProg ? 1 - nP / C.maxProg : 1;
        } else if (mundoOk) pP = 1;
        const simulado = o.simularPendiente && now - t0 < tope + 10000;
        const listo = mundoOk && zHecho && !nT && !nP && !simulado;
        C.etapas = { mundo: pM, zona: Math.round(pZ * 100) / 100, texturas: nT, programas: nP };
        let v = PESOS.mundo * pM + PESOS.zona * pZ + PESOS.texturas * pT + PESOS.programas * pP;
        if (simulado) v = Math.min(v, 0.5);
        if (!listo) v = Math.min(v, 0.97);
        mostrado = Math.max(mostrado, v); // la barra no retrocede (llegan cosas nuevas por el camino)
        return { listo, now };
      }
      function pintar() {
        const pct = Math.round(mostrado * 100);
        lleno.style.setProperty('--v', mostrado.toFixed(3));
        barra.setAttribute('aria-valuenow', String(pct));
        barra.setAttribute('aria-valuetext', tx(AVISOS.paso, pct));
        const h = Math.floor(mostrado * 4); // aviso hablado cada cuarto, no en cada cuadro
        if (h > hito && h < 4) { hito = h; aviso.textContent = tx(AVISOS.paso, h * 25); }
      }
      function cerrar(motivo) {
        if (cerrado) return; cerrado = true;
        cancelAnimationFrame(rafId); clearTimeout(guarda); clearTimeout(tVis);
        mostrado = 1; C.muestras.push(1); pintar();
        aviso.textContent = tx(AVISOS.listo);
        C.ms = Math.round(performance.now() - t0); C.motivo = motivo;
        if (zona) { C.zona = Object.assign(C.zona || {}, { faltan: zona.faltan(), hecho: zona.hecho() }); zona.terminar(); }
        // Se destapa el mundo: el cuadro siguiente es el primero de verdad (todo enlazado). Se mide cuánto tarda.
        ocultar = false;
        if (G.pausa) G.pausa.set('carga', false);
        const tR = performance.now();
        // El peor cuadro del primer segundo de juego (QA-53: < 500 ms)
        let tp = tR; const peor = () => { const n = performance.now(); C.cuadroRevelar = Math.max(C.cuadroRevelar, Math.round(n - tp)); tp = n; if (n - tR < 1000) requestAnimationFrame(peor); };
        requestAnimationFrame(peor);
        el.classList.add('carga-sale'); el.removeAttribute('aria-busy');
        setTimeout(() => { if (!estado.activa) { el.hidden = true; el.setAttribute('aria-busy', 'true'); } }, o.rapido ? 0 : 420);
        estado.activa = false; estado.hecha = true; estado.corridas.push(C); corriendo = null;
        if (foco && foco.focus && doc.contains(foco) && doc.activeElement === el) { try { foco.focus({ preventScroll: true }); } catch (e) { /* nada */ } }
        for (const f of diferidas.splice(0)) setTimeout(() => { try { f(); } catch (e) { /* lo reporta el propio pack */ } }, 0);
        fin(C);
      }
      function paso() {
        rafId = 0;
        const { listo, now } = medir();
        C.muestras.push(Math.round(mostrado * 1000) / 1000);
        pintar();
        if (now - tFrase > FRASE_MS) { tFrase = now; iFrase = (iFrase + 1) % FRASES.length; ponerFrase(iFrase); }
        // Con todo cargado, los dos primeros cuadros de verdad se dibujan debajo de la pantalla (opaca): ahí se crean los búferes
        // a pantalla completa y el mapa de sombras. Luego se espera a que la GPU termine lo enviado (marca, sin bloquear). Así el
        // primer cuadro que ve el jugador no paga la cola de subidas (en la nube, 6 s de cuadro al destapar).
        if (fase === 'carga' && listo) { fase = 'dibujo'; d0 = nDibujos; ocultar = false; C.tCargado = Math.round(now - t0); }
        if (fase === 'dibujo' && nDibujos - d0 >= 2 && RP && !RP.texturas() && !Math.max(0, RP.programas())) { fase = 'gpu'; marca = RP.marcaGPU ? RP.marcaGPU() : null; }
        if (fase === 'gpu' && (!marca || marca.listo())) return cerrar('listo');
        if (now - t0 >= tope) return cerrar('tope');
        rafId = requestAnimationFrame(paso);
      }
      // El tope también vale con la pestaña en segundo plano (sin requestAnimationFrame)
      guarda = setTimeout(() => cerrar('tope'), tope + 250);
      paso();
    });
    return corriendo;
  }
  function esperar(ms) {
    return new Promise(ok => {
      const t0 = performance.now();
      const mirar = () => { if (!estado.activa && !corriendo) ok(estado.ultima); else if (performance.now() - t0 > (ms || 30000)) ok(estado.ultima); else setTimeout(mirar, 50); };
      mirar();
    });
  }

  // ---------- Cuándo: la primera vez que el jugador entra al mundo ----------
  const portada = $('title'), creador = $('creator');
  const enJuego = () => !!(G.S.profile && G.S.profile.created) && !(portada && portada.open) && !(creador && !creador.hidden);
  function vigilar() {
    if (estado.hecha || estado.activa || apagada || !enJuego()) return;
    if (portada && MINI.has(portada.returnValue)) { estado.hecha = true; return; } // minijuego aparte: no necesita la zona de inicio
    if (/[?&](mini|manga)=/.test(location.search)) { estado.hecha = true; return; }
    correr();
  }
  if (portada) portada.addEventListener('close', vigilar);
  if (creador) new MutationObserver(vigilar).observe(creador, { attributes: true, attributeFilter: ['hidden'] });
  vigilar();

  // ---------- Prueba: AV.cargaTest ----------
  async function test() {
    const P = G.pruebas, { check, result } = P.runner();
    const e0 = (window.__aveErrores || []).length, errores = [], ce = console.error;
    console.error = function () { errores.push([].slice.call(arguments).join(' ')); return ce.apply(console, arguments); };
    const sube = m => m.every((v, i) => !i || v >= m[i - 1] - 1e-9);
    try {
      await esperar(TOPE + 5000);
      if (G.mundo && G.mundo.listo) await G.mundo.listo;
      // 1. La entrada de verdad (portada → creador → Empezar en avtest), si la hubo
      const real = estado.corridas[0];
      if (real) {
        check('Entrada real: la barra sube de 0 a 100 sin retroceder', real.muestras[0] === 0 && real.muestras[real.muestras.length - 1] === 1 && sube(real.muestras),
          real.muestras.length + ' muestras, ' + real.ms + ' ms, ' + real.motivo + (real.ligero ? ' (tandas cortas: móvil o bajo)' : ''));
        check('Entrada real: termina con todo listo o en el tope de 20 s', (real.motivo === 'listo' && real.ms <= TOPE + 300) || (real.motivo === 'tope' && real.ms <= TOPE + 600),
          real.motivo + ' en ' + real.ms + ' ms; zona ' + JSON.stringify(real.zona) + '; etapas ' + JSON.stringify(real.etapas));
        check('Entrada real: el peor cuadro del primer segundo de juego tarda < 500 ms (QA-53)', real.cuadroRevelar > 0 && real.cuadroRevelar < 500, real.cuadroRevelar + ' ms (todo cargado a los ' + real.tCargado + ' ms; dibujo y GPU al día a los ' + real.ms + ' ms)');
      } else check('Sin entrada real en esta sesión (la prueba simula las dos corridas)', true, 'sin corrida previa');
      check('Al terminar, el mundo está listo', mundoOk);
      const ST = G.mundo && G.mundo.streaming;
      if (ST && ST.precargarZona) {
        const st = ST.stats(), zs = Object.values(ST.zonas);
        const cerca = zs.filter(Z => Z.nivel === 2), sinColocar = ST.instancias.filter(I => ST.zonas[I.zona].nivel === 2 && !I.colocado).length;
        check('Zona de inicio cargada: sus zonas cercanas con el modelo completo y colocadas', !real || real.motivo !== 'listo' || (cerca.length > 0 && sinColocar === 0),
          cerca.length + ' zonas cerca, ' + sinColocar + ' instancias sin colocar; modelos cerca ' + st.modelosCerca + ', _hd ' + st.modelosHD + ', lejos ' + st.modelosLejos + ', ' + st.kbGeometria + ' KB de geometría');
      }
      // 2. Con caché (todo ya en memoria): casi no se ve
      const pend0 = { tex: RP ? RP.texturas() : 0, prog: RP ? RP.programas() : 0 };
      const c2 = await correr({ forzar: true, rapido: true });
      await new Promise(r => setTimeout(r, 120));
      check('Con caché tarda < 1,5 s', c2.motivo === 'listo' && c2.ms < 1500, c2.ms + ' ms (' + c2.motivo + '), pendientes antes: ' + pend0.tex + ' texturas, ' + pend0.prog + ' programas');
      check('Con caché: la barra sube de 0 a 100 sin retroceder', c2.muestras[0] === 0 && c2.muestras[c2.muestras.length - 1] === 1 && sube(c2.muestras), c2.muestras.slice(-4).join(' → '));
      check('Al terminar se devuelve el control: sin pausa de carga, el mundo se dibuja y la pantalla se va',
        !(G.pausa && G.pausa.motivos.has('carga')) && !ocultar && !estado.activa && el.hidden, 'pausa ' + (G.pausa ? [...G.pausa.motivos].join(',') : '-') + ', oculto ' + (G.ui.worldHidden && G.ui.worldHidden()));
      // 3. El tope: con algo que no termina nunca, entra igual a su hora
      const c3 = await correr({ forzar: true, rapido: true, tope: 600, simularPendiente: true });
      const m3 = c3.muestras;
      check('Respeta el tope: entra igual al llegar (aquí 600 ms en vez de 20 s)', c3.motivo === 'tope' && c3.ms >= 590 && c3.ms < 1600, c3.ms + ' ms, ' + c3.motivo);
      check('En el tope la barra tampoco retrocede y se llena al entrar', sube(m3) && m3[m3.length - 2] <= 0.97 && m3[m3.length - 1] === 1, m3.slice(-3).join(' → '));
      check('Tras el tope el juego sigue (sin pausa ni mundo tapado)', !(G.pausa && G.pausa.motivos.has('carga')) && !ocultar);
      // 4. Accesible y de la marca
      crear();
      check('Accesible: barra con role=progressbar y aviso aria-live', barra.getAttribute('role') === 'progressbar' && barra.getAttribute('aria-valuenow') === '100' && aviso.getAttribute('aria-live') === 'polite' && !!aviso.textContent.trim(),
        'aria-valuenow ' + barra.getAttribute('aria-valuenow') + ', aviso «' + aviso.textContent + '»');
      check('Sin porcentajes a la vista: la cifra solo va para el lector de pantalla', !/\d\s*%/.test(el.querySelector('.carga-main').innerText.replace(aviso.innerText, '')));
      check('Logo, Vittata y frases en ES y EN', !!el.querySelector('.carga-logo svg') && !!el.querySelector('.carga-ave img') && FRASES.every(f => f[0] && f[1] && f[0] !== f[1]), FRASES.length + ' frases');
      check('En el móvil o en «bajo», tandas cortas (1 descarga, 2 texturas por cuadro)', !ligero() || (estado.corridas.every(c => c.ligero)), ligero() ? 'ligero' : 'escritorio: 3 descargas, 6 texturas');
      const nuevos = (window.__aveErrores || []).slice(e0);
      check('Sin errores de consola', !errores.length && !nuevos.length, errores.concat(nuevos).slice(0, 3).join(' | '));
    } catch (e) {
      check('La prueba terminó sin excepciones', false, String(e && e.stack || e).slice(0, 300));
    } finally {
      console.error = ce;
    }
    const out = result();
    out.medidas = estado.corridas.map(c => ({ ms: c.ms, motivo: c.motivo, cuadroRevelar: c.cuadroRevelar, texturas: c.texSubidas, programas: c.maxProg, zona: c.zona, ligero: c.ligero }));
    return out;
  }

  G.carga = Object.assign(estado, { esperar, correr, test });
  return G.carga;
};
