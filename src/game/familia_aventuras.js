/* Juego · Family Quest: «Aventuras en familia» (ROADMAP, «Con niños y familias»).
   Seis aventuras opcionales y cortas (2 a 5 min) para un niño o niña y un adulto en el mismo aparato. Se pasan el mando
   por turnos y cooperan: nadie pierde, no hay compras, no hay premios al azar, no se piden nombres ni se comparte nada.
     relevo    Relevo de vuelo: el jugador 1 vuela hasta un lugar con nombre del mapa; pasa el mando; el 2 vuelve a la salida.
     espejo    Copia mi gesto: uno elige 3 gestos de la cotorra, pasa el mando y el otro los repite de memoria; luego al revés (4).
     foto      Foto en familia: uno elige el gesto, el otro el letrero; cuenta atrás y foto del juego.
     duo       Trucos a dúo: entre los dos, 6 trucos en el aire (cada uno al menos uno).
     cuento    Cuento en cadena: por turnos, cada uno elige una frase de una lista (sin texto libre: seguridad infantil).
     escondite Escondite en equipo: los 3 pichones del escondite (escondite.js); quien encuentra uno pasa el mando.
   Al terminar cada una sale su «viñeta conmemorativa»: la plantilla aprobada del cómic (comic_plantilla.js, componer) con
   las 6 aventuras en las 6 viñetas de una página «Nuestra aventura en familia»; la de la aventura se recorta de la página
   por su marco. Las que faltan dicen «Escena por descubrir» (de la plantilla). Todo se ve en el Diario («Recuerdos en familia»).
   Guardado: en el dispositivo, clave <almacen>.familyquest = { v: 1, hechas: { id: { veces, fecha, datos } }, foto }, aparte
   de la partida: las partidas viejas no cambian y una clave rota o vieja se lee vacía. La foto es una captura del juego
   (JPEG 320×240); si no cabe, se guarda sin foto. Sin nombres ni datos personales.
   Inglés: content/cap1/en.js (sección Family Quest). El DOM lo traduce idioma.js; lo que se pinta en el lienzo (la página y
   las viñetas) y los nombres de gestos se traducen aquí con G.idioma.tr.
   window.AVFamiliaAventuras(G) → G.familyQuest. Prueba: AV.familyQuestTest(). */
window.AVFamiliaAventuras = function (G) {
  'use strict';
  if (G.familyQuest) return G.familyQuest;
  const S = G.S;
  const CLAVE = ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.familyquest';
  const T = t => (G.idioma && G.idioma.tr ? G.idioma.tr(t) : t); // ES: igual; EN: content/cap1/en.js
  const enIngles = () => !!(G.idioma && G.idioma.actual && G.idioma.actual() === 'en');
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Las seis aventuras (orden = viñeta de la página) ----------
  const AVENTURAS = [
    { id: 'relevo', nombre: 'Relevo de vuelo', min: 4, resumen: 'Uno vuela hasta un lugar, el otro vuelve a la salida.' },
    { id: 'espejo', nombre: 'Copia mi gesto', min: 3, resumen: 'Uno inventa una serie de gestos y el otro la repite.' },
    { id: 'foto', nombre: 'Foto en familia', min: 2, resumen: 'Elijan el gesto y el letrero, y ¡clic!' },
    { id: 'duo', nombre: 'Trucos a dúo', min: 4, resumen: 'Entre los dos, 6 trucos en el aire.' },
    { id: 'cuento', nombre: 'Cuento en cadena', min: 3, resumen: 'Inventen un cuento eligiendo frases por turnos.' },
    { id: 'escondite', nombre: 'Escondite en equipo', min: 4, resumen: 'Encuentren juntos los 3 pichones escondidos.' },
  ];
  const IDS = AVENTURAS.map(a => a.id);
  const avDe = id => AVENTURAS.find(a => a.id === id);
  const GESTOS = ['saludar', 'celebrar', 'bailar', 'idea', 'enojo', 'molestia'];
  const MARCOS = ['¡Familia voladora!', '¡Equipo cotorra!', '¡Wepa, lo logramos!', 'Juntos llegamos lejos.'];
  const CUENTO = [
    { tit: 'Había una vez…', op: ['Vittata despertó con ganas de aventura.', 'Un coquí tocó a la puerta del nido.', 'El viento trajo un mapa misterioso.'] },
    { tit: 'Entonces…', op: ['Una iguana pidió ayuda para cruzar el río.', 'Una nube se puso a llorar justo encima.', 'El pichón se escondió en un sombrero.'] },
    { tit: 'De pronto…', op: ['¡Todos se pusieron a bailar plena!', '¡PLAF! Un mangó le cayó en la cabeza.', 'El coquí estornudó tan fuerte que salió volando.'] },
    { tit: 'Al final…', op: ['Y celebraron con un pícnic gigante.', 'Y se fueron a dormir riéndose bajito.', 'Y prometieron otra aventura mañana.'] },
  ];
  const META_TRUCOS = 6;
  const RADIO_LLEGADA = 12, RADIO_SALIDA = 10;

  // ---------- Guardado (en el dispositivo, aparte de la partida) ----------
  function vacio() { return { v: 1, hechas: {}, foto: null }; }
  function leer() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch (e) { d = null; }
    const o = vacio();
    if (!d || typeof d !== 'object' || d.v !== 1) return o;
    if (d.hechas && typeof d.hechas === 'object') {
      for (const id of IDS) {
        const h = d.hechas[id];
        if (h && typeof h === 'object') o.hechas[id] = { veces: Math.max(1, Math.floor(Number(h.veces) || 1)), fecha: typeof h.fecha === 'string' ? h.fecha.slice(0, 10) : '', datos: h.datos && typeof h.datos === 'object' ? h.datos : {} };
      }
    }
    if (typeof d.foto === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(d.foto)) o.foto = d.foto;
    return o;
  }
  let estado = leer();
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); return true; } catch (e) {
      // sin sitio: se guarda sin la foto (la viñeta usa el fondo de la plantilla)
      try { localStorage.setItem(CLAVE, JSON.stringify(Object.assign({}, estado, { foto: null }))); } catch (e2) { /* sin almacenamiento */ }
      return false;
    }
  }
  const hecha = id => !!estado.hechas[id];
  const cuenta = () => IDS.filter(hecha).length;
  function hoy() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fechaBonita(f) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f || ''); if (!m) return '';
    if (enIngles()) return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
    const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return (+m[3]) + ' ' + MES[+m[2] - 1] + ' ' + m[1];
  }

  // ---------- Interfaz ----------
  const raiz = document.createElement('div');
  raiz.id = 'fq'; raiz.hidden = true;
  raiz.innerHTML = '<div class="caja" role="dialog" aria-modal="true" aria-labelledby="fq-titulo"><h2 id="fq-titulo"></h2><div id="fq-cuerpo"></div></div>';
  document.body.appendChild(raiz);
  const hud = document.createElement('div');
  hud.id = 'fq-hud'; hud.hidden = true; hud.setAttribute('role', 'status');
  hud.innerHTML = '<span id="fq-hud-txt"></span><span class="fila"><button type="button" class="btn sm" id="fq-hud-ok"></button><button type="button" class="btn sm ghost" id="fq-hud-salir" aria-label="Dejar la aventura">✕</button></span>';
  document.body.appendChild(hud);
  const css = document.createElement('style');
  css.id = 'estilo-fq';
  css.textContent = '#fq{position:fixed;inset:0;z-index:46;display:grid;place-items:center;padding:16px;background:rgba(8,28,22,.6);container-type:inline-size;box-sizing:border-box}'
    + '#fq[hidden],#fq-hud[hidden]{display:none!important}'
    + '#fq .caja{box-sizing:border-box;width:min(600px,100%);max-height:calc(100% - 8px);overflow:auto;padding:20px;border-radius:18px;background:#f6f1e4;color:#1c140c;box-shadow:0 8px 0 #c9b48a}'
    + '#fq h2{margin:0 0 8px;font:800 26px/1.15 var(--font-display,sans-serif)}#fq p{margin:0 0 12px;font-size:17px;line-height:1.35}'
    + '#fq .fila{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}#fq .btn.sel{outline:3px solid #e0a93a}'
    + '#fq .tarjetas{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 14px}'
    + '#fq .tarjeta{min-height:76px;flex-direction:column;align-items:flex-start;text-align:left;padding:10px 12px;white-space:normal}'
    + '#fq .tarjeta small{font:500 13px/1.25 sans-serif;opacity:.85}#fq .tarjeta .hecho{color:#1f7a2e;font-weight:800}'
    + '#fq .serie{font:800 22px/1.2 sans-serif;letter-spacing:.06em;margin:0 0 12px}#fq .cuento li{margin:0 0 6px}'
    + '#fq canvas.vineta,#fq img.vineta{display:block;width:100%;height:auto;margin:0 0 12px;border-radius:10px;background:#fff}'
    + '#fq .pagina{max-width:420px;margin:0 auto 12px}'
    + '@container (max-width:700px){#fq .caja{padding:14px}#fq h2{font-size:22px}#fq .tarjetas{grid-template-columns:1fr}#fq .fila .btn{flex:1 1 auto}}'
    + '#fq-hud{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translateX(-50%);z-index:45;display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:min(560px,calc(100vw - 28px));box-sizing:border-box;padding:8px 10px;border-radius:14px;background:rgba(246,241,228,.95);color:#1c140c;font:700 16px/1.25 sans-serif;box-shadow:0 4px 0 #c9b48a}'
    + '#fq-hud .fila{display:flex;gap:8px}'
    // móvil: arriba a la izquierda, bajo el cronómetro (como el turno de En familia): no pisa el joystick ni Saltar
    + '@media (pointer:coarse),(max-width:700px){#fq-hud{left:14px;transform:none;top:calc(env(safe-area-inset-top,0px) + 126px);max-width:calc(100vw - 28px)}}'
    + 'body:has(#fq:not([hidden])) #v18-exp-poder{display:none!important}';
  document.head.appendChild(css);
  const $ = id => document.getElementById(id);
  const cuerpo = () => $('fq-cuerpo');
  let abierto = false;

  function boton(txt, fn, clase, id) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn' + (clase ? ' ' + clase : ''); b.textContent = txt;
    if (id) b.id = id;
    b.addEventListener('click', fn);
    return b;
  }
  function fila(...bs) { const f = document.createElement('div'); f.className = 'fila'; bs.filter(Boolean).forEach(b => f.appendChild(b)); return f; }
  function texto(t) { const p = document.createElement('p'); p.textContent = t; return p; }
  function pantalla(titulo, ...nodos) {
    $('fq-titulo').textContent = titulo;
    const c = cuerpo(); c.innerHTML = '';
    nodos.filter(Boolean).forEach(n => c.appendChild(n));
    raiz.hidden = false; hud.hidden = true; abierto = true;
    const f = c.querySelector('button'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { /* */ } }
  }
  function mostrarHud(txt, ok, fnOk) {
    raiz.hidden = true; hud.hidden = false;
    $('fq-hud-txt').textContent = txt;
    const b = $('fq-hud-ok'); b.hidden = !ok; b.textContent = ok || ''; b.onclick = fnOk || null;
  }
  const hudTexto = t => { $('fq-hud-txt').textContent = t; };
  $('fq-hud-salir').addEventListener('click', () => { soltar(); menu(); });

  // ---------- Menú ----------
  let actual = null; // { id, ...estado de la aventura en curso }
  function menu() {
    soltar();
    const t = document.createElement('div'); t.className = 'tarjetas';
    for (const a of AVENTURAS) {
      const b = boton('', () => empezar(a.id), 'secondary tarjeta', 'fq-av-' + a.id);
      b.innerHTML = `<b>${esc(a.nombre)}</b><small>${esc(a.resumen)}</small><small>≈ ${a.min} min${hecha(a.id) ? ' · <span class="hecho">✓ hecha</span>' : ''}</small>`;
      t.appendChild(b);
    }
    pantalla('Aventuras en familia',
      texto('Para jugar juntos en el mismo aparato: un niño o una niña y un adulto. Se pasan el mando por turnos y nadie pierde. Cada aventura termina con una viñeta para su cómic familiar.'),
      t,
      texto(`Viñetas de la familia: ${cuenta()}/6`),
      fila(boton('Ver nuestra página', () => verPagina(), 'info', 'fq-pagina'), boton('Cerrar', cerrar, 'ghost', 'fq-cerrar')));
  }
  function abrir() { menu(); return true; }
  function cerrar() { soltar(); raiz.hidden = true; hud.hidden = true; abierto = false; }
  let escapes = 0;
  // En la captura de window (antes que los atajos del juego): Esc cierra el panel y no abre la pausa debajo
  addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !abierto || raiz.hidden) return;
    escapes++; e.preventDefault(); e.stopImmediatePropagation(); cerrar();
  }, true);

  function soltar() { // deja la aventura en curso sin anotarla
    if (actual && actual.id === 'escondite' && actual.sitios) actual.sitios.forEach(s => { s.hallado = true; });
    actual = null; hud.hidden = true;
  }
  function empezar(id) {
    soltar();
    if (!avDe(id)) return null;
    actual = { id, t: 0 };
    ({ relevo: relevoInicio, espejo: espejoInicio, foto: fotoInicio, duo: duoInicio, cuento: cuentoInicio, escondite: esconditeInicio })[id]();
    return actual;
  }
  const quien = n => 'Jugador ' + n;

  // ---------- 1. Relevo de vuelo ----------
  function destinos() {
    const sx = S.pos.x, sz = S.pos.z;
    let lista = [];
    try { if (G.lugares && G.lugares.lista) lista = G.lugares.lista().map(p => ({ x: p.x, z: p.z, nombre: G.lugares.nombreDe(p) })); } catch (e) { lista = []; }
    if (!lista.length) { const P = (G.terreno && G.terreno.pois) || {}; lista = Object.keys(P).map(k => P[k]).filter(p => p && typeof p.x === 'number' && (p.nombre || p.name)).map(p => ({ x: p.x, z: p.z, nombre: String(p.nombre || p.name).replace(/\s*\([^)]*\)\s*$/, '') })); }
    const vistos = new Set();
    const ok = lista.map(p => Object.assign(p, { d: Math.hypot(p.x - sx, p.z - sz) }))
      .filter(p => p.d >= 30 && p.d <= 260 && !vistos.has(p.nombre) && vistos.add(p.nombre)).sort((a, b) => a.d - b.d).slice(0, 3);
    if (ok.length) return ok;
    return [{ x: sx + 60, z: sz, nombre: 'el árbol lejano', d: 60 }];
  }
  function relevoInicio() {
    const A = actual; A.paso = 'elegir'; A.opciones = destinos(); A.salida = { x: S.pos.x, z: S.pos.z };
    pantalla('Relevo de vuelo',
      texto(`${quien(1)} vuela hasta el lugar. Allí pasa el mando y ${quien(2)} vuelve volando a la salida. ¡Un equipo, dos vuelos!`),
      texto('¿A dónde va el relevo?'),
      fila(...A.opciones.map((p, i) => boton(`${p.nombre} (${Math.round(p.d)} m)`, () => relevoIr(i), 'secondary', 'fq-destino-' + i))),
      fila(boton('Volver', menu, 'ghost')));
  }
  function relevoIr(i) {
    const A = actual; if (!A || A.id !== 'relevo') return;
    A.destino = A.opciones[i] || A.opciones[0]; A.paso = 'ida'; A.t = 0; A.ultD = null;
    mostrarHud(`${quien(1)}: vuela hasta ${A.destino.nombre}.`, null);
  }
  function relevoPaso(dt) {
    const A = actual; A.t += dt;
    if (A.paso !== 'ida' && A.paso !== 'vuelta') return;
    const meta = A.paso === 'ida' ? A.destino : A.salida, r = A.paso === 'ida' ? RADIO_LLEGADA : RADIO_SALIDA;
    const d = Math.hypot(S.pos.x - meta.x, S.pos.z - meta.z);
    if (d <= r) {
      if (A.paso === 'ida') {
        A.paso = 'pasar';
        mostrarHud(`¡Llegaste a ${A.destino.nombre}! Pasa el mando a ${quien(2)}.`, 'Ya tengo el mando', () => { A.paso = 'vuelta'; A.ultD = null; mostrarHud(`${quien(2)}: vuelve volando a la salida.`, null); });
      } else terminar('relevo', { lugar: A.destino.nombre, segundos: Math.round(A.t) });
      return;
    }
    const pista = A.ultD == null ? '' : d < A.ultD - 0.5 ? ' ¡Caliente!' : d > A.ultD + 0.5 ? ' Frío…' : '';
    A.ultD = d;
    hudTexto(`${A.paso === 'ida' ? quien(1) + ': a ' + A.destino.nombre : quien(2) + ': a la salida'} · ${Math.round(d)} m${pista}`);
  }

  // ---------- 2. Copia mi gesto ----------
  const nombreGesto = g => { const E = G.actores && G.actores.EMOTES; return T((E && E[g] && E[g].label) || g); };
  const gestos = () => GESTOS.filter(g => !(G.actores && G.actores.EMOTES) || G.actores.EMOTES[g]);
  function hacerGesto(g) { try { if (G.actores && G.actores.playEmote) G.actores.playEmote(g); } catch (e) { /* en el aire no hay gesto */ } }
  function espejoInicio() { const A = actual; A.ronda = 1; A.intentos = 0; espejoCrear(); }
  function espejoCrear() {
    const A = actual, largo = A.ronda === 1 ? 3 : 4, lider = A.ronda === 1 ? 1 : 2;
    A.paso = 'crear'; A.serie = []; A.largo = largo;
    const pinta = () => {
      pantalla(`Copia mi gesto · ronda ${A.ronda}`,
        texto(`${quien(lider)}: inventa una serie de ${largo} gestos. Tócalos en orden (la cotorra los hace si está en el suelo).`),
        (() => { const p = document.createElement('p'); p.className = 'serie'; p.textContent = A.serie.map(nombreGesto).join(' → ') || '…'; return p; })(),
        fila(...gestos().map(g => boton(nombreGesto(g), () => { if (A.serie.length < largo) { A.serie.push(g); hacerGesto(g); pinta(); } }, 'secondary', 'fq-g-' + g))),
        fila(A.serie.length >= largo ? boton(`Listo: pasa el mando a ${quien(3 - lider)}`, () => espejoCopiar(), '', 'fq-espejo-listo') : null,
          boton('Borrar', () => { A.serie = []; pinta(); }, 'ghost'), boton('Volver', menu, 'ghost')));
    };
    pinta();
  }
  function espejoCopiar(aviso) {
    const A = actual, copia = A.ronda === 1 ? 2 : 1;
    A.paso = 'copiar'; A.resp = [];
    const pinta = (msg) => {
      pantalla(`Copia mi gesto · ronda ${A.ronda}`,
        texto(msg || `${quien(copia)}: repite los ${A.largo} gestos en el mismo orden.`),
        (() => { const p = document.createElement('p'); p.className = 'serie'; p.textContent = A.serie.map((g, i) => i < A.resp.length ? '●' : '○').join(' '); return p; })(),
        fila(...gestos().map(g => boton(nombreGesto(g), () => espejoToca(g, pinta), 'secondary', 'fq-g-' + g))),
        fila(boton('Volver', menu, 'ghost')));
    };
    pinta(aviso);
  }
  function espejoToca(g, pinta) {
    const A = actual; if (!A || A.paso !== 'copiar') return;
    hacerGesto(g);
    if (g !== A.serie[A.resp.length]) {
      A.intentos += 1; A.resp = [];
      pinta(`¡Casi! La serie era: ${A.serie.map(nombreGesto).join(' → ')}. ¡Otra vez, desde el principio!`);
      return;
    }
    A.resp.push(g);
    if (A.resp.length < A.largo) { pinta(); return; }
    if (A.ronda === 1) {
      A.ronda = 2;
      pantalla('¡Igualito!', texto(`¡Perfecto! Ahora cambian: ${quien(2)} inventa y ${quien(1)} copia.`), fila(boton('Seguir', espejoCrear, '', 'fq-espejo-seguir')));
    } else terminar('espejo', { gestos: 7, intentos: A.intentos });
  }

  // ---------- 3. Foto en familia ----------
  function fotoInicio() {
    const A = actual; A.gesto = A.gesto || 'saludar'; A.marco = A.marco == null ? 0 : A.marco;
    const pinta = () => pantalla('Foto en familia',
      texto(`${quien(1)} elige el gesto de la cotorra:`),
      fila(...gestos().map(g => boton(nombreGesto(g), () => { A.gesto = g; pinta(); }, 'secondary' + (A.gesto === g ? ' sel' : ''), 'fq-fg-' + g))),
      texto(`${quien(2)} elige el letrero:`),
      fila(...MARCOS.map((m, i) => boton(m, () => { A.marco = i; pinta(); }, 'secondary' + (A.marco === i ? ' sel' : ''), 'fq-marco-' + i))),
      texto('Consejo: para que la cotorra haga el gesto, pósenla en el suelo.'),
      fila(boton('¡A la foto! 3, 2, 1…', () => { A.listo = fotoTomar(); }, '', 'fq-foto-ya'), boton('Volver', menu, 'ghost')));
    pinta();
  }
  const espera = ms => new Promise(r => setTimeout(r, ms));
  async function fotoTomar() {
    const A = actual; if (!A || A.id !== 'foto') return null;
    A.paso = 'contar';
    for (const n of [3, 2, 1]) { mostrarHud(`Foto en ${n}…`, null); await espera(G.quiet ? 10 : 800); if (actual !== A) return null; }
    hacerGesto(A.gesto);
    await espera(G.quiet ? 10 : 600);
    let url = null;
    try {
      const r = G.renderer && G.renderer.snapshot ? G.renderer.snapshot(480, 360, 0.75) : null;
      url = await Promise.race([Promise.resolve(r), espera(5000).then(() => null)]);
    } catch (e) { url = null; }
    if (actual !== A) return null;
    const foto = (typeof url === 'string' && /^data:image\//.test(url)) ? await reducir(url, 320, 240).catch(() => null) : null;
    estado.foto = foto;
    if (G.audio && G.audio.play) { try { G.audio.play('foto'); } catch (e) { /* */ } }
    return terminar('foto', { gesto: A.gesto, marco: A.marco, conFoto: !!foto });
  }
  function cargarImg(src) { return new Promise((ok, mal) => { const im = new Image(); im.onload = () => ok(im); im.onerror = mal; im.src = src; }); }
  async function reducir(src, w, h) {
    const im = await cargarImg(src), c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(im, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.72);
  }

  // ---------- 4. Trucos a dúo ----------
  async function asegurar(clave, src, fabrica) {
    if (G[clave]) return G[clave];
    if (!window[fabrica] && window.AVE && AVE.assets && AVE.assets.script) { try { await AVE.assets.script(src); } catch (e) { /* sin el módulo */ } }
    return window[fabrica] ? window[fabrica](G) : null;
  }
  function duoInicio() {
    const A = actual; A.paso = 'explicar'; A.trucos = [0, 0]; A.turno = 0;
    asegurar('trucos', 'src/game/trucos.js', 'AVTrucos');
    pantalla('Trucos a dúo',
      texto(`Entre los dos, ${META_TRUCOS} trucos en el aire (toneles, loopings, barrenas…). ${quien(1)} empieza; cuando quiera, pasa el mando. Cada uno hace al menos uno.`),
      fila(boton('¡A volar!', () => { A.paso = 'jugar'; duoHud(); }, '', 'fq-duo-ya'), boton('Volver', menu, 'ghost')));
  }
  function duoHud() {
    const A = actual, total = A.trucos[0] + A.trucos[1];
    const pasar = A.turno === 0 && A.trucos[0] > 0;
    mostrarHud(`Trucos juntos: ${total}/${META_TRUCOS} · Turno: ${quien(A.turno + 1)}`, pasar ? `Pasar el mando a ${quien(2)}` : null, pasar ? () => { A.turno = 1; duoHud(); } : null);
  }
  G.on('truco', () => {
    const A = actual; if (!A || A.id !== 'duo' || A.paso !== 'jugar') return;
    A.trucos[A.turno] += 1;
    const total = A.trucos[0] + A.trucos[1];
    if (A.turno === 1 && total >= META_TRUCOS) terminar('duo', { trucos: total, j1: A.trucos[0], j2: A.trucos[1] });
    else if (A.turno === 0 && A.trucos[0] >= META_TRUCOS - 1) { A.turno = 1; duoHud(); hudTexto(`¡Qué racha! Ahora ${quien(2)}: falta ${META_TRUCOS - total}.`); }
    else duoHud();
  });

  // ---------- 5. Cuento en cadena ----------
  function cuentoInicio() { const A = actual; A.paso = 'elegir'; A.frases = []; cuentoPinta(); }
  function cuentoPinta() {
    const A = actual, k = A.frases.length, b = CUENTO[k];
    const lista = document.createElement('ol'); lista.className = 'cuento';
    A.frases.forEach((f, i) => { const li = document.createElement('li'); li.textContent = CUENTO[i].op[f]; lista.appendChild(li); });
    pantalla('Cuento en cadena',
      texto(`${quien(k % 2 + 1)}, te toca: ${b.tit}`),
      A.frases.length ? lista : null,
      ...b.op.map((o, i) => fila(boton(o, () => cuentoElige(i), 'secondary', 'fq-cuento-' + i))),
      fila(boton('Volver', menu, 'ghost')));
  }
  function cuentoElige(i) {
    const A = actual; if (!A || A.id !== 'cuento') return;
    A.frases.push(i);
    if (A.frases.length < CUENTO.length) { cuentoPinta(); return; }
    terminar('cuento', { frases: A.frases.slice() });
  }
  const frasesDe = d => (Array.isArray(d && d.frases) ? d.frases : []).map((f, i) => CUENTO[i] && CUENTO[i].op[f]).filter(Boolean);

  // ---------- 6. Escondite en equipo ----------
  async function esconditeInicio() {
    const A = actual; A.paso = 'explicar';
    pantalla('Escondite en equipo',
      texto(`Hay 3 pichones escondidos cerca (en una copa, un muelle y un tejado). El pío suena más fuerte cuando están cerca. Quien encuentre uno, pasa el mando. ${quien(1)} empieza.`),
      fila(boton('¡A buscar!', () => { A.listo = esconditeYa(); }, '', 'fq-esc-ya'), boton('Volver', menu, 'ghost')));
  }
  async function esconditeYa() {
    const A = actual; if (!A || A.id !== 'escondite') return null;
    const E = await asegurar('escondite', 'src/game/escondite.js', 'AVEscondite');
    if (actual !== A) return null;
    if (!E) { pantalla('Escondite en equipo', texto('El escondite no está en este capítulo. Prueben otra aventura.'), fila(boton('Volver', menu))); return null; }
    A.sitios = E.empezar(); A.paso = 'jugar'; A.turno = 0; A.hallados = 0; A.t = 0;
    esconditeHud();
    return A.sitios;
  }
  function esconditeHud(extra) {
    const A = actual;
    mostrarHud(`${extra ? extra + ' ' : ''}Pichones: ${A.hallados}/3 · Busca: ${quien(A.turno + 1)}`, null);
  }
  function esconditePaso(dt) {
    const A = actual; if (A.paso !== 'jugar' || !A.sitios) return;
    A.t += dt;
    const n = A.sitios.filter(s => s.hallado).length;
    if (n > A.hallados) {
      A.hallados = n;
      if (n >= A.sitios.length) { terminar('escondite', { segundos: Math.round(A.t) }); return; }
      A.turno = 1 - A.turno;
      esconditeHud(`¡Encontrado! Pasa el mando.`);
    } else if (A.t > 125) {
      A.paso = 'fin';
      pantalla('Escondite en equipo', texto('¡Uy! Los pichones se escondieron otra vez. ¿Otra ronda?'), fila(boton('Otra ronda', () => { A.listo = esconditeYa(); }, '', 'fq-esc-otra'), boton('Volver', menu, 'ghost')));
    }
  }

  G.on('update', dt => {
    const A = actual; if (!A) return;
    dt = Math.min(0.1, dt || 0);
    if (A.id === 'relevo') relevoPaso(dt);
    else if (A.id === 'escondite') esconditePaso(dt);
  });
  function paso(dt) { const A = actual; if (!A) return; if (A.id === 'relevo') relevoPaso(dt); else if (A.id === 'escondite') esconditePaso(dt); }

  // ---------- Final: anotar y viñeta conmemorativa ----------
  function terminar(id, datos) {
    const prev = estado.hechas[id];
    estado.hechas[id] = { veces: (prev ? prev.veces : 0) + 1, fecha: hoy(), datos: datos || {} };
    guardar();
    actual = null; hud.hidden = true;
    try { if (G.audio && G.audio.play && !G.quiet) G.audio.play('logro'); } catch (e) { /* */ }
    G.emit('familyQuest', { id, datos });
    const c = document.createElement('canvas'); c.className = 'vineta'; c.width = 8; c.height = 5;
    c.setAttribute('aria-label', T('Viñeta conmemorativa: ' + avDe(id).nombre)); c.setAttribute('role', 'img');
    pantalla('¡Viñeta conmemorativa!',
      texto(`${avDe(id).nombre}: ¡lo hicieron juntos! Su viñeta ya está en el Diario, en «Recuerdos en familia».`),
      c,
      fila(boton('Otra aventura', menu, '', 'fq-otra'), boton('Ver nuestra página', () => verPagina(), 'info'), boton('Cerrar', cerrar, 'ghost')));
    ultimaVineta = vineta(id, c).catch(() => null);
    return estado.hechas[id];
  }
  let ultimaVineta = Promise.resolve(null);

  function lookActual() {
    try { return JSON.parse(JSON.stringify(G.creador.profileLook(S.profile))); } catch (e) { return S.profile && S.profile.look ? S.profile.look : null; }
  }
  function datosVineta(id, img) {
    const h = estado.hechas[id], d = (h && h.datos) || {};
    const mmss = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
    const base = { id, sceneImage: null, dialogueType: 'dialogo', effectId: null, recordValue: null, look: null };
    switch (id) {
      case 'relevo': return Object.assign(base, { sceneTitle: T('Relevo de vuelo'), dialogueText: T('¡Te toca! ¡Vuela tú!'), captionText: T(`Volamos hasta ${d.lugar || 'un lugar'} y de vuelta${d.segundos ? ' en ' + mmss(d.segundos) : ''}.`), pose: 'crucero', effectId: 'fuush' });
      case 'espejo': return Object.assign(base, { sceneTitle: T('Copia mi gesto'), dialogueText: T('¡Igualito, igualito!'), captionText: T('Inventamos gestos y nos copiamos por turnos.'), pose: 'celebrar' });
      case 'foto': return Object.assign(base, { sceneTitle: T('Foto en familia'), dialogueText: T(MARCOS[d.marco] || MARCOS[0]), captionText: T('Nuestra foto juntos en la isla.'), pose: 'celebrar', sceneImage: img || null });
      case 'duo': return Object.assign(base, { sceneTitle: T('Trucos a dúo'), dialogueText: T('¡Combo en equipo!'), captionText: T(`Juntos hicimos ${d.trucos || META_TRUCOS} trucos en el aire.`), pose: 'impulso', effectId: 'fuush' });
      case 'cuento': { const f = frasesDe(d).map(T); return Object.assign(base, { sceneTitle: T('Cuento en cadena'), dialogueText: f[2] || T('¡Qué cuento!'), captionText: f[0] ? f[0] + ' ' + (f[3] || '') : T('Inventamos un cuento por turnos.'), pose: 'posarse', dialogueType: 'pensamiento' }); }
      case 'escondite': return Object.assign(base, { sceneTitle: T('Escondite en equipo'), dialogueText: T('¡Los encontramos!'), captionText: T(`Hallamos los 3 pichones${d.segundos ? ' en ' + d.segundos + ' s' : ''}.`), pose: 'celebrar', effectId: 'bandera' });
    }
    return base;
  }
  async function datosPagina() {
    let img = null;
    if (estado.foto) img = await cargarImg(estado.foto).catch(() => null);
    const look = lookActual();
    return {
      titulo: T('Nuestra aventura en familia'), nombre: (S.profile && S.profile.name) || 'Vittata', look,
      aprendi: T('Turnarse y esperar también es jugar en equipo.'), ensenanza: T('Juntos, cualquier aventura es más divertida.'), botones: false,
      vinetas: IDS.map(id => hecha(id) ? Object.assign(datosVineta(id, img), { look }) : { id: null, falta: true, look: null, pose: 'celebrar' }),
    };
  }
  // Compone la página familiar con la plantilla del cómic. → { canvas, info }
  async function pagina(cv) {
    cv = cv || document.createElement('canvas');
    if (!G.comicPlantilla || !G.comicPlantilla.componer) throw new Error('sin plantilla del cómic');
    const info = await G.comicPlantilla.componer(cv, await datosPagina());
    return { canvas: cv, info };
  }
  // La viñeta de una aventura, recortada de la página por su marco (el cuadrilátero de la plantilla)
  async function vineta(id, destino) {
    const i = IDS.indexOf(id); if (i < 0) return null;
    const { canvas: pag } = await pagina();
    const P = G.comicPlantilla, q = P.SLOTS[i].quad.map(([x, y]) => [x * P.K, y * P.K]), M = 6;
    const xs = q.map(p => p[0]), ys = q.map(p => p[1]);
    const x0 = Math.max(0, Math.min(...xs) - M), y0 = Math.max(0, Math.min(...ys) - M);
    const w = Math.min(pag.width, Math.max(...xs) + M) - x0, h = Math.min(pag.height, Math.max(...ys) + M) - y0;
    const cv = destino || document.createElement('canvas'); cv.width = Math.round(w); cv.height = Math.round(h);
    const x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    const cx = xs.reduce((a, b) => a + b, 0) / 4, cy = ys.reduce((a, b) => a + b, 0) / 4;
    x.save(); x.beginPath();
    q.forEach(([px, py], k) => { const dx = px - cx, dy = py - cy, l = Math.hypot(dx, dy) || 1, X = px + dx / l * M - x0, Y = py + dy / l * M - y0; if (k) x.lineTo(X, Y); else x.moveTo(X, Y); });
    x.closePath(); x.clip();
    x.drawImage(pag, x0, y0, w, h, 0, 0, w, h);
    x.restore();
    try { if (P.limpiarCache && raiz.hidden) P.limpiarCache(); } catch (e) { /* */ }
    return cv;
  }
  async function verPagina() {
    soltar();
    const c = document.createElement('canvas'); c.className = 'vineta pagina'; c.width = 8; c.height = 12;
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', T('Nuestra aventura en familia: página del cómic'));
    pantalla('Nuestra página familiar',
      texto(cuenta() < 6 ? `Llevan ${cuenta()} de 6 viñetas. Las que faltan aparecen al jugar su aventura.` : '¡Página completa! Todo un cómic hecho en familia.'),
      c, fila(boton('Volver', menu, '', 'fq-volver'), boton('Cerrar', cerrar, 'ghost')));
    ultimaVineta = pagina(c).then(r => r.canvas).catch(() => null);
    return ultimaVineta;
  }
  async function verVineta(id) {
    if (!hecha(id)) return null;
    soltar();
    const c = document.createElement('canvas'); c.className = 'vineta'; c.width = 8; c.height = 5;
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', T('Viñeta conmemorativa: ' + avDe(id).nombre));
    const h = estado.hechas[id];
    pantalla(avDe(id).nombre, texto(`Recuerdo en familia · ${fechaBonita(h.fecha)}${h.veces > 1 ? ` · jugada ${h.veces} veces` : ''}`), c,
      fila(boton('Jugar otra vez', () => empezar(id), '', 'fq-otra-vez'), boton('Volver', menu, 'ghost')));
    ultimaVineta = vineta(id, c).catch(() => null);
    return ultimaVineta;
  }

  // ---------- Diario: «Recuerdos en familia» ----------
  function htmlDiario() {
    const filas = AVENTURAS.map(a => {
      const h = estado.hechas[a.id];
      return h ? `<li class="found"><div><b>${esc(a.nombre)}</b><small>${esc(fechaBonita(h.fecha))}</small></div><button type="button" class="btn sm secondary" data-fq-ver="${a.id}">Ver viñeta</button></li>`
        : `<li><div><b>???</b><small>${esc(a.nombre)}: por jugar en familia</small></div></li>`;
    }).join('');
    return `<div class="fq-diario"><span class="lbl">Recuerdos en familia ${cuenta()}/6</span><ul class="diary">${filas}</ul>` +
      `<div class="row"><button type="button" class="btn sm" data-fq-abrir="1">Aventuras en familia</button>${cuenta() ? '<button type="button" class="btn sm info" data-fq-pagina="1">Ver nuestra página</button>' : ''}</div></div>`;
  }
  if (G.diario && G.diario.seccion) G.diario.seccion({ id: 'familyQuest', html: htmlDiario });
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-fq-ver],[data-fq-abrir],[data-fq-pagina]');
    if (!b) return;
    try { if (G.ui && G.ui.hideCard) G.ui.hideCard(); } catch (er) { /* */ }
    if (b.dataset.fqVer) verVineta(b.dataset.fqVer);
    else if (b.dataset.fqPagina) verPagina();
    else abrir();
  });

  // ---------- Prueba en inglés (dentro de AV.familyQuestTest) ----------
  // Recorre cada pantalla y cada HUD con EN puesto y junta lo que siga en español: los textos del panel que idioma.js
  // (textosVisibles) también da por españoles. Los nombres y expresiones de la isla no cuentan (idioma.js, NOMBRES).
  async function pruebaIngles(ok) {
    const norm = t => String(t).replace(/\s+/g, ' ').trim();
    const espera = ms => new Promise(r => setTimeout(r, ms));
    const restos = new Set(), vistas = [];
    const mirar = async nombre => {
      await espera(20); // el MutationObserver de idioma.js traduce en el siguiente microtask
      const mios = new Set();
      for (const el of [raiz, hud]) {
        if (el.hidden) continue;
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) if (/\p{L}/u.test(n.data)) mios.add(norm(n.data));
        for (const a of el.querySelectorAll('[aria-label]')) if (/[ñ¿¡]|Viñeta|aventura|página|Dejar/.test(a.getAttribute('aria-label'))) restos.add(nombre + ': [aria-label] ' + a.getAttribute('aria-label'));
      }
      for (const t of G.idioma.textosVisibles()) if (mios.has(t)) restos.add(nombre + ': ' + t);
      vistas.push(nombre);
    };
    await G.idioma.poner('en'); await G.idioma.listo;
    ok('Inglés: el diccionario EN está puesto', G.idioma.actual() === 'en');
    abrir(); await mirar('menú');
    // 1. Relevo: elegir, ida (frío y caliente), pasar el mando, vuelta y viñeta
    empezar('relevo'); await mirar('relevo');
    $('fq-destino-0').click(); await mirar('relevo HUD');
    const dest = actual.destino, sal = actual.salida;
    S.pos.x = dest.x + 30; S.pos.z = dest.z; paso(0.3); S.pos.x = dest.x + 20; paso(0.3); await mirar('relevo caliente');
    S.pos.x = dest.x + 40; paso(0.3); await mirar('relevo frío');
    S.pos.x = dest.x + 3; paso(0.3); await mirar('relevo pasar');
    $('fq-hud-ok').click(); await mirar('relevo vuelta');
    S.pos.x = sal.x + 30; S.pos.z = sal.z; paso(0.3); S.pos.x = sal.x + 20; paso(0.3); await mirar('relevo vuelta caliente');
    S.pos.x = sal.x; S.pos.z = sal.z; paso(0.3); await mirar('relevo viñeta');
    // 2. Copia mi gesto: crear, copiar, «¡Casi!», «¡Igualito!» y la ronda 2
    empezar('espejo'); await mirar('espejo');
    const g3 = gestos().slice(0, 3); g3.forEach(g => $('fq-g-' + g).click()); await mirar('espejo serie');
    $('fq-espejo-listo').click(); await mirar('espejo copiar');
    $('fq-g-' + g3[1]).click(); await mirar('espejo casi');
    g3.forEach(g => $('fq-g-' + g).click()); await mirar('espejo igualito');
    $('fq-espejo-seguir').click(); await mirar('espejo ronda 2');
    // 3. Foto: la pantalla, la cuenta atrás y la viñeta
    empezar('foto'); await mirar('foto');
    $('fq-foto-ya').click(); const cuenta3 = $('fq-hud-txt').textContent; // con G.quiet la cuenta dura 10 ms: se lee al ponerla
    await actual.listo; await mirar('foto viñeta');
    ok('Inglés: la cuenta atrás de la foto', G.idioma.tr(cuenta3) !== cuenta3 || /Photo/.test(cuenta3), cuenta3 + ' → ' + G.idioma.tr(cuenta3));
    // 4. Trucos a dúo: explicar, HUD, pasar el mando y «¡Qué racha!»
    empezar('duo'); await mirar('dúo');
    $('fq-duo-ya').click(); G.emit('truco', 'tonel'); await mirar('dúo HUD');
    for (let i = 0; i < 4; i++) G.emit('truco', 'tonel');
    await mirar('dúo racha');
    G.emit('truco', 'looping'); await mirar('dúo viñeta');
    // 5. Cuento en cadena: los 4 turnos y la viñeta
    empezar('cuento');
    for (let i = 0; i < 4; i++) { await mirar('cuento ' + (i + 1)); $('fq-cuento-' + (i % 3)).click(); }
    await mirar('cuento viñeta');
    // 6. Escondite: explicar, HUD, encontrado y «¡Uy!»
    await asegurar('escondite', 'src/game/escondite.js', 'AVEscondite');
    empezar('escondite'); await mirar('escondite');
    $('fq-esc-ya').click(); const sitios = await actual.listo; await mirar('escondite HUD');
    if (sitios && sitios.length) { S.pos.x = sitios[0].x; S.pos.z = sitios[0].z; G.escondite.paso(0.2); paso(0.2); await mirar('escondite encontrado'); }
    if (actual && actual.id === 'escondite') { paso(200); await mirar('escondite uy'); }
    try { if (G.escondite && G.escondite.paso) G.escondite.paso(1000); } catch (e) { /* cierra la ronda */ }
    // Página, viñeta del recuerdo y Diario
    await verPagina(); await mirar('página');
    await verVineta('cuento'); await mirar('viñeta del recuerdo');
    abrir(); const dia = document.createElement('div'); dia.innerHTML = htmlDiario(); cuerpo().appendChild(dia); await mirar('Diario');
    // Textos sueltos que no se pueden ver aquí: el escondite sin módulo y la fecha del recuerdo
    for (const t of ['El escondite no está en este capítulo. Prueben otra aventura.', 'el árbol lejano', 'Foto en 2…']) if (G.idioma.tr(t) === t) restos.add('suelto: ' + t);
    const fecha = fechaBonita('2026-01-08');
    ok('Inglés: la fecha del recuerdo sale con el mes en inglés', fecha === 'Jan 8, 2026', fecha);
    ok('Inglés: ninguna pantalla ni HUD de las aventuras queda en español (' + vistas.length + ' vistas)', !restos.size, [...restos].slice(0, 12).join(' | '));
    // El lienzo (página y viñetas): todos los textos traducidos
    const dp = await datosPagina();
    cerrar();
    await G.idioma.poner('es');
    const datosES = await datosPagina(), txt = d => [d.titulo, d.aprendi, d.ensenanza].concat(...d.vinetas.filter(v => !v.falta).map(v => [v.sceneTitle, v.dialogueText, v.captionText]));
    const es = txt(datosES), en = txt(dp), igual = en.filter((t, i) => t === es[i] || /[ñ¿¡]/.test(t));
    ok('Inglés: título, lecciones y textos de las viñetas del cómic familiar en inglés', en.length === es.length && en.length === 3 + 3 * cuenta() && cuenta() >= 4 && !igual.length, igual.slice(0, 4).join(' | ') || en.slice(0, 4).join(' | '));
  }

  // ---------- Prueba: AV.familyQuestTest() ----------
  async function test() {
    const out = [], ok = (name, pass, extra) => out.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const copia = (() => { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } })();
    const pos = { x: S.pos.x, y: S.pos.y, z: S.pos.z }, quiet = G.quiet;
    const guardadoPartida = (() => { try { return G.guardado && G.guardado.serialize ? JSON.stringify(G.guardado.serialize()) : null; } catch (e) { return null; } })();
    const visibles = () => [...raiz.querySelectorAll('button'), ...hud.querySelectorAll('button')].filter(b => !b.hidden && b.offsetParent !== null);
    const medir = () => visibles().map(b => b.getBoundingClientRect()).filter(r => r.width && r.height);
    const pantallaTiene = re => re.test(raiz.textContent);
    const idioma0 = G.idioma && G.idioma.actual ? G.idioma.actual() : null;
    try {
      G.quiet = true;
      try { localStorage.removeItem(CLAVE); } catch (e) { /* */ }
      estado = leer();
      ok('Partida sin recuerdos: empieza vacía', cuenta() === 0 && estado.foto === null);
      abrir();
      ok('El menú tiene las 6 aventuras', IDS.every(id => $('fq-av-' + id)) && AVENTURAS.every(a => a.min >= 2 && a.min <= 5), IDS.join(','));
      ok('Sin compras ni azar: ningún botón de tienda o sorpresa', !/compr|tienda|moneda|gema|sorteo|caja sorpresa|\$/i.test(raiz.textContent));
      const r0 = medir();
      ok('PC: botones de al menos 44 px', r0.length > 6 && r0.every(r => r.height >= 44 - 0.5 && r.width >= 44 - 0.5), r0.map(r => Math.round(r.height)).join(','));

      // 1. Relevo
      empezar('relevo');
      ok('Relevo: ofrece destinos con nombre', actual.opciones.length >= 1 && actual.opciones.every(p => p.nombre), actual.opciones.map(p => p.nombre + ' ' + Math.round(p.d)).join(' | '));
      $('fq-destino-0').click();
      const dest = actual.destino, sal = actual.salida;
      ok('Relevo: el HUD dice a dónde volar', !hud.hidden && raiz.hidden && /Jugador 1/.test(hud.textContent));
      S.pos.x = dest.x + 30; S.pos.z = dest.z; paso(0.3); S.pos.x = dest.x + 20; paso(0.3);
      ok('Relevo: frío y caliente según la distancia', /Caliente/.test(hud.textContent), hud.textContent);
      S.pos.x = dest.x + 3; S.pos.z = dest.z; paso(0.3);
      ok('Relevo: al llegar pide pasar el mando', actual && actual.paso === 'pasar' && !$('fq-hud-ok').hidden && /Pasa el mando/.test(hud.textContent));
      $('fq-hud-ok').click();
      S.pos.x = sal.x; S.pos.z = sal.z; paso(0.3);
      ok('Relevo: al volver a la salida se completa', hecha('relevo') && estado.hechas.relevo.datos.lugar === dest.nombre && pantallaTiene(/Viñeta conmemorativa/));

      // 2. Copia mi gesto
      empezar('espejo');
      const g3 = gestos().slice(0, 3);
      g3.forEach(g => $('fq-g-' + g).click());
      $('fq-espejo-listo').click();
      $('fq-g-' + g3[1]).click(); // error a propósito
      ok('Espejo: equivocarse no castiga, enseña la serie', actual && actual.paso === 'copiar' && actual.intentos === 1 && pantallaTiene(/Casi/));
      g3.forEach(g => $('fq-g-' + g).click());
      ok('Espejo: la ronda 1 bien hecha cambia los papeles', actual && actual.ronda === 2 && pantallaTiene(/cambian/));
      $('fq-espejo-seguir').click();
      const g4 = gestos().slice(1, 5);
      g4.forEach(g => $('fq-g-' + g).click());
      $('fq-espejo-listo').click();
      g4.forEach(g => $('fq-g-' + g).click());
      ok('Espejo: dos rondas completan la aventura', hecha('espejo') && estado.hechas.espejo.datos.intentos === 1);

      // 3. Foto
      empezar('foto');
      $('fq-fg-bailar').click(); $('fq-marco-2').click();
      $('fq-foto-ya').click();
      await actual.listo;
      ok('Foto: gesto y letrero elegidos quedan en el recuerdo', hecha('foto') && estado.hechas.foto.datos.gesto === 'bailar' && estado.hechas.foto.datos.marco === 2);
      ok('Foto: si hay foto es un JPEG pequeño del juego', estado.foto === null || (/^data:image\/jpeg/.test(estado.foto) && estado.foto.length < 120000), estado.foto ? estado.foto.length + ' B' : 'sin foto (fondo de la plantilla)');

      // 4. Trucos a dúo
      empezar('duo');
      $('fq-duo-ya').click();
      G.emit('truco', 'tonel'); G.emit('truco', 'looping'); G.emit('truco', 'barrena');
      ok('Dúo: el contador es de los dos', /3\/6/.test(hud.textContent) && !$('fq-hud-ok').hidden, hud.textContent);
      $('fq-hud-ok').click();
      ok('Dúo: el mando pasa al jugador 2', actual.turno === 1 && /Jugador 2/.test(hud.textContent));
      G.emit('truco', 'tonel'); G.emit('truco', 'tonel'); G.emit('truco', 'looping');
      ok('Dúo: 6 trucos entre los dos completan', hecha('duo') && estado.hechas.duo.datos.j1 === 3 && estado.hechas.duo.datos.j2 === 3);

      // 5. Cuento
      empezar('cuento');
      ok('Cuento: turnos alternos', /Jugador 1/.test(raiz.textContent));
      $('fq-cuento-1').click();
      ok('Cuento: luego le toca al jugador 2', /Jugador 2/.test(raiz.textContent));
      $('fq-cuento-0').click(); $('fq-cuento-1').click(); $('fq-cuento-2').click();
      const fr = frasesDe(estado.hechas.cuento && estado.hechas.cuento.datos);
      ok('Cuento: el cuento son las 4 frases elegidas', hecha('cuento') && fr.length === 4 && fr[0] === CUENTO[0].op[1] && fr[3] === CUENTO[3].op[2], fr.join(' / '));

      // 6. Escondite en equipo
      await asegurar('escondite', 'src/game/escondite.js', 'AVEscondite');
      empezar('escondite');
      $('fq-esc-ya').click();
      const sitios = await actual.listo;
      ok('Escondite: hay 3 pichones', Array.isArray(sitios) && sitios.length === 3);
      S.pos.x = sitios[0].x; S.pos.z = sitios[0].z; G.escondite.paso(0.2); paso(0.2);
      ok('Escondite: al encontrar uno se pasa el mando', actual && actual.turno === 1 && /Pasa el mando/.test(hud.textContent), hud.textContent);
      for (const s of sitios.slice(1)) { S.pos.x = s.x; S.pos.z = s.z; G.escondite.paso(0.2); paso(0.2); }
      ok('Escondite: los 3 completan la aventura', hecha('escondite'));

      ok('Las 6 aventuras quedan hechas', cuenta() === 6);

      // Viñeta conmemorativa y página
      const v = await vineta('duo');
      let tinta = 0;
      if (v) { const px = v.getContext('2d').getImageData(0, 0, v.width, v.height).data; for (let i = 0; i < px.length; i += 4 * 53) if (px[i + 3] > 0 && px[i] + px[i + 1] + px[i + 2] < 120) tinta++; }
      ok('Viñeta: sale recortada de la plantilla, con tinta', v && v.width > 300 && v.height > 200 && tinta > 20, v ? v.width + '×' + v.height + ' · tinta ' + tinta : 'sin viñeta');
      const dp = await datosPagina();
      ok('Página: 6 viñetas con su título, globo y texto (ninguna «por descubrir»)', dp.vinetas.length === 6 && dp.vinetas.every(x => !x.falta && x.sceneTitle && x.dialogueText && x.captionText), dp.vinetas.map(x => x.sceneTitle).join(' | '));
      const pg = await pagina();
      ok('Página: misma plantilla del cómic (1536×2304, 6 viñetas)', pg.canvas.width === 1536 && pg.canvas.height === 2304 && pg.info.vinetas.length === 6);
      verVineta('cuento'); await ultimaVineta;
      const cv = raiz.querySelector('canvas.vineta');
      ok('Viñeta: se ve en pantalla desde el recuerdo', !raiz.hidden && cv && cv.width > 300);

      // Guardado: recargar
      const antes = JSON.stringify(estado.hechas);
      estado = vacio(); estado = leer();
      ok('Recargar: los 6 recuerdos siguen ahí', cuenta() === 6 && JSON.stringify(estado.hechas) === antes);
      const dia = htmlDiario();
      ok('Diario: «Recuerdos en familia» con 6 viñetas para ver', /Recuerdos en familia 6\/6/.test(dia) && (dia.match(/data-fq-ver=/g) || []).length === 6);
      localStorage.setItem(CLAVE, '{roto');
      estado = leer();
      ok('Guardado roto: se lee vacío, sin error', cuenta() === 0);
      localStorage.setItem(CLAVE, JSON.stringify({ v: 1, hechas: { cuento: { veces: 2, fecha: '2026-11-08', datos: { frases: [0, 0, 0, 0] } }, inventada: { veces: 1 } } }));
      estado = leer();
      ok('Guardado viejo o con ids raros: solo se queda lo válido', cuenta() === 1 && hecha('cuento') && !estado.hechas.inventada);
      const guardadoDespues = (() => { try { return G.guardado && G.guardado.serialize ? JSON.stringify(G.guardado.serialize()) : null; } catch (e) { return null; } })();
      ok('La partida no cambia (los recuerdos van aparte)', guardadoPartida == null || (G.guardado.KEYS || []).every(k => k !== 'familyQuest') && (!guardadoDespues || guardadoDespues.indexOf('familyquest') < 0));
      ok('Sin nombres ni datos personales en el guardado', !/nombre|name|email|correo/i.test(localStorage.getItem(CLAVE) || ''));

      // Móvil 390×844
      abrir();
      const st = raiz.getAttribute('style');
      raiz.style.cssText = 'inset:auto;left:0;top:0;width:390px;height:844px';
      await espera(30);
      const caja = raiz.querySelector('.caja'), cr = caja.getBoundingClientRect();
      const r1 = medir();
      const tarj = raiz.querySelector('.tarjetas');
      ok('Móvil 390×844: el panel cabe sin desbordar', cr.width <= 390 && cr.width >= 300 && caja.scrollWidth <= caja.clientWidth + 1 && cr.height <= 844, Math.round(cr.width) + '×' + Math.round(cr.height));
      ok('Móvil: tarjetas en una columna', tarj && getComputedStyle(tarj).gridTemplateColumns.split(' ').length === 1, tarj && getComputedStyle(tarj).gridTemplateColumns);
      ok('Móvil: botones de al menos 44 px y dentro del ancho', r1.length > 6 && r1.every(r => r.height >= 43.5 && r.width >= 43.5 && r.right <= 390 + 1), r1.map(r => Math.round(r.width) + 'x' + Math.round(r.height)).join(','));
      if (st == null) raiz.removeAttribute('style'); else raiz.setAttribute('style', st);
      empezar('duo'); $('fq-duo-ya').click(); G.emit('truco', 'tonel');
      const hr = hud.getBoundingClientRect(), hb = [...hud.querySelectorAll('button')].filter(b => !b.hidden).map(b => b.getBoundingClientRect());
      ok('HUD de turno: botones de 44 px y no tapa la parte de abajo (joystick)', hb.length >= 2 && hb.every(r => r.height >= 43.5 && r.width >= 43.5) && hr.bottom < innerHeight * 0.6, Math.round(hr.top) + '-' + Math.round(hr.bottom));
      $('fq-hud-salir').click();
      ok('Dejar una aventura a medias vuelve al menú sin anotarla', !actual && !raiz.hidden && !hecha('duo'));
      const esc0 = escapes, diag = 'abierto ' + abierto + ' · oculto ' + raiz.hidden;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      ok('Escape cierra el panel', raiz.hidden && !abierto, diag + ' → ' + abierto + '/' + raiz.hidden + ' · escapes ' + (escapes - esc0));

      // Inglés (Kelvin 8-nov): con EN puesto, ninguna pantalla de las aventuras queda en español; solo nombres y expresiones
      // de la isla (Vittata, coquí, mangó, plena, Wepa), que idioma.js ya da por buenos
      if (G.idioma && G.idioma.poner && G.idioma.textosVisibles) await pruebaIngles(ok);
    } catch (e) { ok('sin excepciones', false, e && (e.stack || e.message || e)); }
    try { if (G.idioma && G.idioma.poner && idioma0 && G.idioma.actual() !== idioma0) await G.idioma.poner(idioma0); } catch (e) { /* */ }
    soltar(); cerrar();
    try { if (G.escondite && G.escondite.paso) G.escondite.paso(1000); } catch (e) { /* cierra la ronda */ }
    try { if (G.ui && G.ui.hideToast) G.ui.hideToast(); } catch (e) { /* */ }
    try { if (G.comicPlantilla && G.comicPlantilla.limpiarCache) G.comicPlantilla.limpiarCache(); } catch (e) { /* */ }
    { const chip = document.getElementById('truco-chip'); if (chip) chip.hidden = true; }
    S.pos.x = pos.x; S.pos.y = pos.y; S.pos.z = pos.z; G.quiet = quiet;
    try { if (copia == null) localStorage.removeItem(CLAVE); else localStorage.setItem(CLAVE, copia); } catch (e) { /* */ }
    estado = leer();
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }

  G.familyQuest = {
    AVENTURAS, abrir, cerrar, empezar, paso, vineta, pagina, verVineta, verPagina, htmlDiario, test,
    hecha, cuenta, get actual() { return actual; }, get estado() { return estado; }, get ultimaVineta() { return ultimaVineta; },
  };
  return G.familyQuest;
};
