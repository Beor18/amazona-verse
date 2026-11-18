/* Juego · CG-53. Modo familia por turnos, en el mismo dispositivo.
   De 2 a 4 jugadores se pasan el control. Cada uno elige una cotorra del creador, juega un turno
   (trucos, escondite o la Maraña) y al final todos reciben un premio alegre, según el puntaje.
   No se guarda ningún nombre ni dato personal: solo dura esta partida en pantalla.
   No toca musica.js, el modelo de Vittata, ni reescribe los minijuegos: los abre si ya están.
   window.AVFamilia(G). Prueba: AV.familiaTest(). */
window.AVFamilia = function (G) {
  'use strict';
  if (G.familia) return G.familia;
  const $ = G.util.$;
  const ESPECIES = ['vittata', 'agilis', 'albifrons', 'guildingii', 'versicolor', 'festiva'];
  const JUEGOS = ['trucos', 'escondite', 'marana'];
  const NOMBRE = {
    trucos: ['Trucos', 'Tricks'],
    escondite: ['Escondite', 'Hide-and-seek'],
    marana: ['La Maraña', 'The Tangle'],
  };
  const en = () => (G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  const nombreJuego = id => { const p = NOMBRE[id] || [id, id]; return L(p[0], p[1]); };
  let jugadores = [], juego = 'trucos', turno = 0, abierto = false;
  let enJuego = false, maxCombo = 0, t0 = 0, sitios = null, limpios0 = 0, listo = Promise.resolve();
  let cuantos = 2; // PULIR 7 r2: el número de jugadores se elige y luego se pulsa «Empezar» (antes empezaba al tocar el número)

  const raiz = document.createElement('div');
  raiz.id = 'familia'; raiz.hidden = true;
  raiz.innerHTML = '<div class="caja" role="dialog" aria-labelledby="fam-titulo"><h2 id="fam-titulo"></h2><p id="fam-texto"></p><div class="fila" id="fam-juegos"></div><div class="fila" id="fam-fila"></div><div id="fam-marca"></div><div class="fila"><button type="button" class="btn magic" id="fam-aventuras"></button></div><div class="fila"><button type="button" class="btn" id="fam-ok"></button><button type="button" class="btn ghost" id="fam-cerrar"></button></div></div>';
  document.body.appendChild(raiz);
  const fin = document.createElement('button');
  fin.type = 'button'; fin.id = 'fam-fin'; fin.className = 'btn'; fin.hidden = true;
  document.body.appendChild(fin);
  // PULIR 7 r2: marcador del turno (quién juega, qué hay que hacer, puntos y tiempo). Antes no se veía nada durante el turno y la
  // instrucción salía en un aviso que compartía la cola con avisos viejos (el de «Iguaca te llama» la tapaba).
  const hudT = document.createElement('div');
  hudT.id = 'fam-hud'; hudT.className = 'hud'; hudT.hidden = true; hudT.setAttribute('role', 'status');
  hudT.innerHTML = '<b id="fam-hud-quien"></b><span id="fam-hud-que"></span><span id="fam-hud-marca"></span>';
  document.body.appendChild(hudT);
  const css = document.createElement('style');
  css.textContent = '#fam-fin{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:45;min-height:44px}'
    // W31: en el móvil el botón de turno no pisa el joystick ni Saltar (va arriba a la izquierda, bajo el cronómetro) y el botón «Poder» (V18) no tapa el panel
    + '@media (pointer:coarse),(max-width:700px){#fam-fin{left:14px;bottom:auto;top:calc(env(safe-area-inset-top,0px) + 126px);transform:none}}'
    + 'body:has(#familia:not([hidden])) #v18-exp-poder{display:none!important}'
    // PULIR 7 r2: la letra del juego (no la del sistema) y un «elegido» que se ve: fondo verde, borde dorado y ✓
    + '#familia .caja{font-family:var(--font-body,sans-serif)}#familia h2{font-family:var(--font-display,sans-serif)}'
    + '#familia .btn.sel{--btn-bg:#1f6b4f;--btn-ink:#fff;--btn-lip:#0e3d2c;background:#1f6b4f;color:#fff;outline:3px solid #e0a93a;outline-offset:2px}'
    + '#familia .btn.sel::before{content:"\\2713  ";content:"\\2713  " / ""}'
    + '#familia .lbl-fam{margin:0 0 6px;font:700 13px/1.2 var(--font-display,sans-serif);text-transform:uppercase;letter-spacing:.06em;color:#7a5634}'
    + '#familia .marca small{font:600 14px/1.3 var(--font-body,sans-serif);color:#5b4a36}'
    + '#fam-hud{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translateX(-50%);z-index:44;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 16px;max-width:min(440px,calc(100vw - 32px));border-radius:16px;background:var(--c-paper,#fff8e8);color:var(--c-ink,#2b2118);box-shadow:0 4px 0 var(--c-paper-edge,#d9c7a3),0 8px 20px rgba(0,0,0,.25);text-align:center;pointer-events:none}'
    + '#fam-hud[hidden]{display:none}#fam-hud b{font:700 12px/1.2 var(--font-display,sans-serif);text-transform:uppercase;letter-spacing:.06em;color:#7a5634}'
    + '#fam-hud span{font:400 15px/1.3 var(--font-body,sans-serif)}#fam-hud #fam-hud-marca{font:700 20px/1.2 var(--font-display,sans-serif);font-variant-numeric:tabular-nums}'
    + '@media (pointer:coarse),(max-width:700px){#fam-hud{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 212px)}}';
  document.head.appendChild(css);

  function nombreEspecie(id) {
    const todas = window.AV_ESPECIES && window.AV_ESPECIES.especies;
    const e = todas && todas.find(x => x.id === id);
    if (!e) return id;
    if (en()) return (e.comun && e.comun.en) || id;
    return (e.catalogo && e.catalogo.nombre) || (e.comun && e.comun.es) || id;
  }
  function botonPausa() {
    const grid = document.querySelector('#pause .pause-grid');
    if (!grid || grid.querySelector('#b-familia')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn tile'; b.id = 'b-familia'; b.dataset.icon = 'star';
    grid.appendChild(b);
    b.addEventListener('click', () => {
      const menu = $('pause');
      try { if (menu && menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
      abrir();
    });
  }
  botonPausa();
  function refrescar() {
    const b = $('b-familia'); if (b) b.textContent = L('En familia', 'Family');
    $('fam-cerrar').textContent = L('Cerrar', 'Close');
    $('fam-aventuras').textContent = L('Aventuras en familia', 'Family adventures');
    fin.textContent = L('Terminé mi turno', 'My turn is done');
    if (abierto && !enJuego) paso();
    if (enJuego) pintarHud(true);
  }
  refrescar();
  G.on('apply', refrescar);
  G.on('aula', k => { if (k === 'idioma') refrescar(); });

  function pintarJuegos() {
    const box = $('fam-juegos');
    box.innerHTML = '';
    box.hidden = jugadores.length > 0;
    if (box.hidden) return;
    for (const id of JUEGOS) {
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'fam-juego-' + id; b.className = 'btn sm' + (juego === id ? ' sel' : ''); b.setAttribute('aria-pressed', String(juego === id));
      b.textContent = nombreJuego(id);
      b.addEventListener('click', () => { juego = id; pintarJuegos(); });
      box.appendChild(b);
    }
  }
  function pintarEspecies(j) {
    const fila = $('fam-fila');
    fila.innerHTML = '';
    for (const id of ESPECIES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn sm' + (j.especie === id ? ' sel' : ''); b.setAttribute('aria-pressed', String(j.especie === id));
      b.dataset.especie = id;
      b.textContent = nombreEspecie(id);
      b.addEventListener('click', () => { j.especie = id; pintarEspecies(j); });
      fila.appendChild(b);
    }
  }
  function fraseTurno() {
    const modo = {
      trucos: ['juega tu turno de trucos', 'play your tricks turn'],
      escondite: ['juega tu turno de escondite', 'play your hide-and-seek turn'],
      marana: ['juega tu turno de la Maraña', 'play the Tangle turn'],
    }[juego] || ['juega tu turno', 'play your turn'];
    return L('Pasa el control. Elige tu cotorra y ' + modo[0] + '.', 'Pass the controller. Pick your parrot and ' + modo[1] + '.');
  }
  function premioDe(lista) {
    const y = (a, b) => (en() ? a + ' and ' + b : a + ' y ' + b);
    const rapidoT = L('el más rápido', 'the fastest');
    const valienteT = L('el más valiente', 'the bravest');
    const sobras = [L('el más gracioso', 'the funniest'), L('el más amigo', 'the friendliest'), L('voló con todos', 'flew with everyone')];
    // PULIR 7 r2: un turno de 0 puntos no gana premio (antes quien estuvo 5 s sin hacer nada salía «el más rápido y el más valiente»)
    const conPuntos = lista.filter(j => j.puntos > 0);
    const porTiempo = conPuntos.slice().sort((a, b) => a.segundos - b.segundos || b.puntos - a.puntos || a.n - b.n);
    const porPuntos = conPuntos.slice().sort((a, b) => b.puntos - a.puntos || a.segundos - b.segundos || a.n - b.n);
    const texto = new Map();
    function poner(j, t) { const prev = texto.get(j.n); texto.set(j.n, prev ? y(prev, t) : t); }
    if (porTiempo.length) poner(porTiempo[0], rapidoT);
    if (porPuntos.length) poner(porPuntos[0], valienteT);
    const resto = conPuntos.filter(j => j.n !== porTiempo[0].n && j.n !== porPuntos[0].n)
      .sort((a, b) => b.puntos - a.puntos || a.segundos - b.segundos || a.n - b.n);
    resto.forEach((j, i) => poner(j, sobras[Math.min(i, sobras.length - 1)]));
    const revancha = L('¡Revancha en la próxima ronda!', 'Rematch next round!');
    return lista.map(j => ({ n: j.n, especie: j.especie, puntos: j.puntos, segundos: j.segundos, premio: texto.get(j.n) || null, nota: texto.get(j.n) || revancha }));
  }
  // PULIR 7 r2: puntos y tiempo con su palabra («3 trucos · 1:12»), no «0 · 72.2s» en crudo
  const UNIDAD = {
    trucos: [['truco', 'trucos'], ['trick', 'tricks']],
    escondite: [['amigo hallado', 'amigos hallados'], ['friend found', 'friends found']],
    marana: [['rastro limpio', 'rastros limpios'], ['trail cleared', 'trails cleared']],
  };
  function tiempoTxt(seg) { const s = Math.max(0, Math.round(Number(seg) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function puntosTxt(n) { const u = UNIDAD[juego] || UNIDAD.trucos, p = en() ? u[1] : u[0]; return n + ' ' + (n === 1 ? p[0] : p[1]); }
  function pintarMarca(filas) {
    const e = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    $('fam-marca').innerHTML = filas.map(f => `<div class="marca"><b>${L('Jugador', 'Player')} ${f.n}</b> · ${e(nombreEspecie(f.especie))}<div class="premio">${e(f.nota || f.premio || '')}</div><small>${e(puntosTxt(f.puntos))} · ${tiempoTxt(f.segundos)}</small></div>`).join('');
  }
  function puntosAhora() {
    if (juego === 'trucos') return maxCombo;
    if (juego === 'escondite') return (sitios || []).filter(s => s.hallado).length;
    if (juego === 'marana' && G.marana) return Math.max(0, G.marana.rastros.filter(r => r.limpio).length - limpios0);
    return 0;
  }
  function instruccion() {
    if (juego === 'escondite') return L('Busca a las cotorras escondidas.', 'Find the hidden parrots.');
    if (juego === 'marana') return L('Vuela cerca de un rastro gris y límpialo.', 'Fly close to a gray trail and clear it.');
    return L('Haz trucos en el aire. Cuando quieras, termina el turno.', 'Do tricks in the air. End the turn when you want.');
  }
  let hudTxt = '';
  function pintarHud(forzar) {
    if (!enJuego) { hudT.hidden = true; hudTxt = ''; return; }
    const j = jugadores[turno], marca = puntosTxt(puntosAhora()) + ' · ' + tiempoTxt((performance.now() - t0) / 1000);
    const k = (j ? j.n : 0) + '|' + marca + '|' + (en() ? 'en' : 'es');
    hudT.hidden = false;
    if (!forzar && k === hudTxt) return; hudTxt = k;
    $('fam-hud-quien').textContent = L('Turno del jugador ', 'Player ') + (j ? j.n : '') + (en() ? '\'s turn' : '');
    $('fam-hud-que').textContent = instruccion();
    $('fam-hud-marca').textContent = marca;
  }
  G.on('update', () => { if (enJuego || !hudT.hidden) pintarHud(); });
  function paso() {
    $('fam-titulo').textContent = L('En familia', 'Family');
    fin.hidden = !enJuego;
    $('fam-aventuras').hidden = jugadores.length > 0; // Family Quest (familia_aventuras.js): solo en la primera pantalla
    if (!jugadores.length) {
      $('fam-texto').textContent = L('¿Cuántos juegan? De 2 a 4. Se pasan el control.', 'How many are playing? From 2 to 4. Pass the controller.');
      const fila = $('fam-fila'); fila.innerHTML = '';
      [2, 3, 4].forEach(n => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn' + (cuantos === n ? ' sel' : ''); b.textContent = String(n); b.dataset.n = String(n);
        b.setAttribute('aria-pressed', String(cuantos === n)); b.setAttribute('aria-label', L(n + ' jugadores', n + ' players'));
        b.addEventListener('click', () => { cuantos = n; paso(); });
        fila.appendChild(b);
      });
      pintarJuegos();
      $('fam-marca').innerHTML = '';
      $('fam-ok').hidden = false;
      $('fam-ok').textContent = L('Empezar', 'Start');
      return;
    }
    pintarJuegos();
    if (turno < jugadores.length) {
      const j = jugadores[turno];
      $('fam-texto').textContent = fraseTurno();
      $('fam-titulo').textContent = L('Turno ' + (turno + 1), 'Turn ' + (turno + 1));
      pintarEspecies(j);
      $('fam-ok').hidden = false;
      $('fam-ok').textContent = L('Jugar mi turno', 'Play my turn');
      return;
    }
    const filas = premioDe(jugadores);
    $('fam-texto').textContent = filas.every(f => f.premio) ? L('¡Todos ganan un premio!', 'Everyone gets a prize!') : L('¡Así quedó la ronda!', 'Here is how the round went!');
    $('fam-fila').innerHTML = '';
    $('fam-ok').hidden = true;
    pintarMarca(filas);
  }
  function empezar(n, cual) {
    if (n < 2 || n > 4) return null;
    if (JUEGOS.includes(cual)) juego = cual;
    else if (!JUEGOS.includes(juego)) juego = 'trucos';
    enJuego = false; fin.hidden = true;
    jugadores = [];
    for (let i = 0; i < n; i++) jugadores.push({ n: i + 1, especie: ESPECIES[i % ESPECIES.length], puntos: 0, segundos: 0 });
    turno = 0;
    abierto = true; raiz.hidden = false;
    paso();
    return jugadores;
  }
  function anotar(puntos, segundos) {
    if (!jugadores[turno]) return null;
    const j = jugadores[turno];
    j.puntos = Math.max(0, Number(puntos) || 0);
    j.segundos = Math.max(0, Number(segundos) || 0);
    turno += 1;
    const eraTurno = enJuego;
    enJuego = false; fin.hidden = true; raiz.hidden = false; pintarHud();
    if (eraTurno) { try { if (G.ui && G.ui.quitarAviso) G.ui.quitarAviso(instruccion()); } catch (e) { /* sin ui */ } } // la instrucción no se queda encima de los resultados
    paso();
    return turno >= jugadores.length ? premioDe(jugadores) : null;
  }
  async function asegurar(clave, src, fabrica) {
    if (G[clave]) return G[clave];
    if (!window[fabrica] && window.AVE && AVE.assets && AVE.assets.script) {
      try { await AVE.assets.script(src); } catch (e) { /* sigue sin el módulo */ }
    }
    return window[fabrica] ? window[fabrica](G) : null;
  }
  async function jugar() {
    if (turno >= jugadores.length || enJuego) return null;
    if (juego === 'escondite') await asegurar('escondite', 'src/game/escondite.js', 'AVEscondite');
    else if (juego === 'marana') await asegurar('marana', 'src/game/marana.js', 'AVMarana');
    else await asegurar('trucos', 'src/game/trucos.js', 'AVTrucos');
    enJuego = true; raiz.hidden = true; fin.hidden = false;
    t0 = performance.now(); maxCombo = 0; sitios = null; limpios0 = 0;
    // PULIR 7 r2: los avisos de antes del turno (la aventura, otro jugador) no se quedan delante de la instrucción
    try { if (G.ui && G.ui.vaciarAvisos) G.ui.vaciarAvisos(); } catch (e) { /* sin ui */ }
    if (juego === 'escondite' && G.escondite) sitios = G.escondite.empezar();
    else if (juego === 'marana' && G.marana) {
      limpios0 = G.marana.rastros.filter(r => r.limpio).length;
      if (G.marana.pintar) G.marana.pintar();
      if (G.ui && G.ui.toast) G.ui.toast(instruccion(), 2600, { ya: true });
    } else if (G.ui && G.ui.toast) G.ui.toast(instruccion(), 2600, { ya: true });
    pintarHud(true);
    return juego;
  }
  function cerrarTurno() {
    if (!enJuego) return null;
    const seg = Math.max(0, Math.round((performance.now() - t0) / 100) / 10);
    let puntos = 0;
    if (juego === 'trucos') puntos = maxCombo;
    else if (juego === 'escondite') puntos = (sitios || []).filter(s => s.hallado).length;
    else if (juego === 'marana' && G.marana) puntos = Math.max(0, G.marana.rastros.filter(r => r.limpio).length - limpios0);
    return anotar(puntos, seg);
  }
  G.on('truco', () => { if (enJuego && juego === 'trucos' && G.trucos) maxCombo = Math.max(maxCombo, G.trucos.combo || 0); });
  G.on('record', d => {
    if (!enJuego || juego !== 'escondite' || !d || d.modo !== 'escondite') return;
    const seg = Number.isFinite(d.segundos) ? d.segundos : Math.max(0, (performance.now() - t0) / 1000);
    anotar((sitios || []).filter(s => s.hallado).length, seg);
  });
  function abrir() {
    enJuego = false; fin.hidden = true;
    jugadores = []; turno = 0; abierto = true; raiz.hidden = false; paso();
    return true;
  }
  function cerrar() { enJuego = false; fin.hidden = true; abierto = false; raiz.hidden = true; jugadores = []; turno = 0; pintarHud(); }
  $('fam-cerrar').addEventListener('click', cerrar);
  $('fam-aventuras').addEventListener('click', () => { cerrar(); asegurar('familyQuest', 'src/game/familia_aventuras.js', 'AVFamiliaAventuras').then(f => f && f.abrir()); });
  // Escape cierra el panel como «Cerrar» (captura + stopPropagation: no abre la pausa debajo)
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && abierto && !raiz.hidden) { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); } }, true);
  $('fam-ok').addEventListener('click', () => { if (!jugadores.length) { empezar(cuantos); return; } listo = jugar(); });
  fin.addEventListener('click', cerrarTurno);

  async function test() {
    const out = [], ok = (name, pass, extra) => out.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const antes = raiz.hidden;
    const pos = { x: G.S.pos.x, y: G.S.pos.y, z: G.S.pos.z };
    const quietBk = G.quiet;
    const aj = G.aula && G.aula.aj, idi = aj ? aj.idioma : null;
    const claves = ['trucos', 'escondite', 'marana'].map(k => ((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.' + k);
    const copias = claves.map(k => { try { return localStorage.getItem(k); } catch (e) { return null; } });
    try {
      ok('Hacen falta de 2 a 4', empezar(1) == null && empezar(5) == null);
      const js = empezar(3, 'trucos');
      ok('Tres jugadores, cada uno con una cotorra del creador', js.length === 3 && js.every(j => ESPECIES.includes(j.especie)), js.map(j => j.especie).join(','));
      ok('La pantalla pide pasar el control', /Pasa el control|Pass the controller/.test($('fam-texto').textContent));
      ok('Hay tres minijuegos', JUEGOS.length === 3);
      anotar(2, 30); anotar(5, 12); const marca = anotar(3, 20);
      ok('Al final todos tienen un premio distinto', marca && marca.length === 3 && new Set(marca.map(m => m.premio)).size === 3, marca && marca.map(m => m.premio).join(' · '));
      const valiente = marca.find(m => /valiente|bravest/.test(m.premio));
      ok('El más valiente es quien más puntos hizo', valiente && valiente.puntos === 5, valiente && String(valiente.puntos));
      ok('No se guarda ningún dato personal', !localStorage.getItem(((G.pack && G.pack.meta && G.pack.meta.almacen) || 'amazonaverse') + '.familia'));
      const cuatro = empezar(4, 'escondite');
      anotar(1, 9); anotar(1, 8); anotar(1, 7); const m4 = anotar(1, 6);
      ok('Con 4 jugadores nadie se queda sin premio', cuatro.length === 4 && m4.length === 4 && m4.every(m => m.premio), m4.map(m => m.premio).join(' · '));

      abrir();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      ok('Escape cierra el panel En familia', raiz.hidden && !abierto);
      abrir();
      ok('QA-116 hay botones de Escondite y de la Maraña', !!$('fam-juego-escondite') && !!$('fam-juego-marana') && !!$('fam-juego-trucos'));
      $('fam-juego-marana').click();
      [...$('fam-fila').children].find(b => b.textContent === '2').click();
      ok('PULIR 7 r2 · elegir cuántos juegan no empieza solo: el número queda marcado y hay botón «Empezar»', !jugadores.length && !$('fam-ok').hidden && /Empezar|Start/.test($('fam-ok').textContent) && (b => !!b && b.classList.contains('sel') && b.getAttribute('aria-pressed') === 'true')([...$('fam-fila').children].find(b => b.textContent === '2')), $('fam-ok').textContent);
      ok('PULIR 7 r2 · el juego elegido se ve marcado (aria-pressed y estilo «elegido» distinto)', $('fam-juego-marana').getAttribute('aria-pressed') === 'true' && $('fam-juego-trucos').getAttribute('aria-pressed') === 'false' && getComputedStyle($('fam-juego-marana')).backgroundColor !== getComputedStyle($('fam-juego-trucos')).backgroundColor, getComputedStyle($('fam-juego-marana')).backgroundColor);
      ok('PULIR 7 r2 · el panel usa la letra del juego, no la del sistema', getComputedStyle($('fam-titulo')).fontFamily.trim() !== 'sans-serif', getComputedStyle($('fam-titulo')).fontFamily);
      $('fam-ok').click();
      ok('QA-116 el turno usa el minijuego elegido, no trucos', G.familia.juego === 'marana' && /la Maraña|the Tangle/.test($('fam-texto').textContent) && !/your The/.test($('fam-texto').textContent), G.familia.juego + ' · ' + $('fam-texto').textContent);
      const nombres = [...$('fam-fila').querySelectorAll('button')].map(b => b.textContent);
      ok('QA-120 salen con el nombre común, no el id en latín', nombres.length === 6 && nombres.every(t => !/^(vittata|agilis|albifrons|guildingii|versicolor|festiva)$/.test(t) && !/^Amazona /.test(t)) && /puertorriqueña|Puerto Rican/i.test(nombres.join(' ')), nombres.join(' | '));
      if (aj) aj.idioma = 'en';
      G.emit('aula', 'idioma', 'en');
      empezar(2, 'trucos');
      ok('QA-118 el nombre del modo sale en inglés', /play your tricks turn/.test($('fam-texto').textContent) && !/\btrucos\b/.test($('fam-texto').textContent) && !/your The/.test($('fam-texto').textContent), $('fam-texto').textContent);
      empezar(2, 'escondite');
      ok('QA-123 el escondite cabe en la frase inglesa', /play your hide-and-seek turn/.test($('fam-texto').textContent), $('fam-texto').textContent);
      empezar(2, 'marana');
      ok('QA-123 la Maraña no dice «your The»', /play the Tangle turn/.test($('fam-texto').textContent) && !/your The/.test($('fam-texto').textContent), $('fam-texto').textContent);
      const bp = $('b-familia');
      ok('QA-119 la pausa dice Family', !!bp && bp.textContent === 'Family', bp && bp.textContent);
      if (aj) aj.idioma = idi || 'es';
      G.emit('aula', 'idioma', idi || 'es');

      await asegurar('escondite', 'src/game/escondite.js', 'AVEscondite');
      await asegurar('trucos', 'src/game/trucos.js', 'AVTrucos');
      const quiet = G.quiet; G.quiet = true;
      const ronda = empezar(2, 'escondite');
      $('fam-ok').click(); await listo;
      ok('QA-117 Jugar abre el escondite y no anota 1 punto', raiz.hidden && !fin.hidden && ronda[0].puntos === 0 && G.escondite && G.escondite.cerca().quien, 'puntos ' + ronda[0].puntos);
      fin.click();
      ok('QA-117 sin jugar no son 1 punto y 10 s', ronda[0].puntos === 0 && ronda[0].segundos !== 10, ronda[0].puntos + ' · ' + ronda[0].segundos + 's');
      $('fam-ok').click(); await listo;
      let guard = 0;
      while (G.escondite.cerca().quien && guard++ < 6) {
        const q = G.escondite.cerca().quien;
        G.S.pos.x = q.x; G.S.pos.z = q.z;
        G.escondite.paso(0.2);
      }
      const marcas117 = [...$('fam-marca').querySelectorAll('.marca')].map(m => m.textContent);
      ok('QA-117 el premio sigue el puntaje, no el orden del jugador', ronda[1].puntos === 3 && marcas117.some(t => /Jugador 2|Player 2/.test(t) && /valiente|bravest/.test(t)), marcas117.join(' || ').slice(0, 220));
      empezar(3, 'trucos');
      anotar(9, 40); anotar(2, 4); const desemp = anotar(6, 25);
      const rap = desemp.find(m => /rápido|fastest/.test(m.premio));
      const val = desemp.find(m => /valiente|bravest/.test(m.premio));
      ok('QA-129 el más rápido es quien tardó menos, no el segundo puesto', rap && rap.n === 2 && rap.segundos === 4 && !/valiente|bravest/.test(rap.premio), JSON.stringify(desemp.map(m => m.n + ':' + m.premio + ' ' + m.puntos + '/' + m.segundos)));
      ok('QA-129 el más valiente es quien más puntos hizo, aunque haya tardado', val && val.n === 1 && val.puntos === 9 && !/rápido|fastest/.test(val.premio), val && val.premio);
      empezar(3, 'trucos');
      anotar(9, 4); anotar(3, 30); const ambos = anotar(1, 20);
      const campeon = ambos.find(m => m.n === 1);
      ok('QA-129 quien gana en puntos y en tiempo se lleva los dos premios', campeon && /valiente|bravest/.test(campeon.premio) && /rápido|fastest/.test(campeon.premio) && ambos.every(m => m.n === 1 || !/rápido|fastest/.test(m.premio)), campeon && campeon.premio);
      const tr = empezar(2, 'trucos');
      $('fam-ok').click(); await listo;
      G.S.clock = (G.S.clock || 0) + 1; G.trucos.anotar('tonel');
      G.S.clock += 1; G.trucos.anotar('looping');
      G.S.clock += 1; G.trucos.anotar('barrena');
      fin.click();
      ok('QA-117 los trucos cuentan el combo del turno', tr[0].puntos === 3, String(tr[0].puntos));
      { // PULIR 7 r2: la instrucción del turno se ve de verdad (un aviso viejo { fijo } ya no la tapa) y hay marcador durante el turno
        G.ui.toast('Aviso viejo PULIR7', 6000, { fijo: true });
        $('fam-ok').click(); await listo;
        const c = G.ui.colaTest(), ins = instruccion();
        ok('PULIR 7 r2 · al empezar el turno sale la instrucción y el aviso viejo no vuelve después', c.actual === ins && !c.cola.includes('Aviso viejo PULIR7'), JSON.stringify(c).slice(0, 200));
        G.S.clock += 1; G.trucos.anotar('tonel'); pintarHud();
        ok('PULIR 7 r2 · durante el turno se ve quién juega, qué hacer, los trucos y el tiempo', !hudT.hidden && /2/.test($('fam-hud-quien').textContent) && $('fam-hud-que').textContent === ins && /^\d+ trucos? · \d+:\d\d$/.test($('fam-hud-marca').textContent), $('fam-hud-marca').textContent);
        fin.click();
        ok('PULIR 7 r2 · al terminar el turno el marcador y la instrucción se van', hudT.hidden && (c2 => c2.actual !== ins && !c2.cola.includes(ins))(G.ui.colaTest()), JSON.stringify(G.ui.colaTest()).slice(0, 160));
      }
      empezar(3, 'trucos');
      anotar(0, 5); anotar(4, 30); const cero = anotar(2, 12);
      const c0 = cero.find(m => m.n === 1);
      ok('PULIR 7 r2 · un turno de 0 puntos no gana premio (ni «el más rápido» por no hacer nada)', c0 && !c0.premio && !/rápido|fastest|valiente|bravest/.test(c0.nota) && cero.find(m => m.n === 3 && /rápido|fastest/.test(m.premio)) && cero.find(m => m.n === 2 && /valiente|bravest/.test(m.premio)), JSON.stringify(cero.map(m => m.n + ':' + (m.premio || '-'))));
      const filasT = [...$('fam-marca').querySelectorAll('.marca')].map(m => m.textContent).join(' || ');
      ok('PULIR 7 r2 · los resultados dicen «4 trucos · 0:30», no «0 · 72.2s» en crudo, y la cabecera no promete premio a todos', /4 trucos · 0:30/.test(filasT) && /0 trucos · 0:05/.test(filasT) && !/\d+(\.\d+)?s\b/.test(filasT) && /Así quedó|Here is how/.test($('fam-texto').textContent), filasT.slice(0, 200));
      empezar(2, 'trucos'); anotar(0, 3); const nadie = anotar(0, 9);
      ok('PULIR 7 r2 · si nadie hizo puntos, nadie gana premio', nadie.every(m => !m.premio), JSON.stringify(nadie.map(m => m.premio)));
      G.quiet = quiet;
    } catch (e) { ok('sin excepciones', false, e && (e.stack || e.message || e)); }
    cerrar(); raiz.hidden = antes; hudT.hidden = true;
    try { if (G.ui && G.ui.quitarAviso) G.ui.quitarAviso('Aviso viejo PULIR7'); } catch (e) { /* sin ui */ }
    try { if (G.ui && G.ui.hideToast) G.ui.hideToast(); } catch (e) { /* sin ui */ } // los avisos de la prueba (trucos, premios) no se quedan en pantalla
    { const chip = document.getElementById('truco-chip'); if (chip) chip.hidden = true; } // el contador de trucos del turno de prueba (se apaga solo con cuadros del juego)
    if (G.escondite && G.escondite.paso) { try { G.escondite.paso(1000); } catch (e) { /* cierra la ronda de la prueba */ } }
    G.S.pos.x = pos.x; G.S.pos.y = pos.y; G.S.pos.z = pos.z;
    if (aj) { aj.idioma = idi || 'es'; G.emit('aula', 'idioma', aj.idioma); }
    G.quiet = quietBk;
    claves.forEach((k, i) => { try { if (copias[i] == null) localStorage.removeItem(k); else localStorage.setItem(k, copias[i]); } catch (e) { /* */ } });
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  G.familia = {
    abrir, cerrar, empezar, anotar, premioDe, jugar, ESPECIES, JUEGOS, test,
    get juego() { return juego; },
    get listo() { return listo; },
  };
  return G.familia;
};
