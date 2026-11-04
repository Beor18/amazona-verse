/* Juego · CG-53. Modo familia por turnos, en el mismo dispositivo.
   De 2 a 4 jugadores se pasan el control. Cada uno elige una cotorra del creador, juega un turno
   (trucos, escondite o la Maraña) y al final todos reciben un premio alegre.
   No se guarda ningún nombre ni dato personal: solo dura esta partida en pantalla.
   No toca musica.js, el modelo de Vittata, ni los minijuegos (los usa si ya están).
   window.AVFamilia(G). Prueba: AV.familiaTest(). */
window.AVFamilia = function (G) {
  'use strict';
  if (G.familia) return G.familia;
  const $ = G.util.$;
  const ESPECIES = ['vittata', 'agilis', 'albifrons', 'guildingii', 'versicolor', 'festiva'];
  const JUEGOS = ['trucos', 'escondite', 'marana'];
  const en = () => (G.idioma && G.idioma.actual && G.idioma.actual() === 'en') || !!(G.aula && G.aula.aj && G.aula.aj.idioma === 'en');
  const L = (es, eng) => (en() ? eng : es);
  let jugadores = [], juego = 'trucos', turno = 0, abierto = false;

  const raiz = document.createElement('div');
  raiz.id = 'familia'; raiz.hidden = true;
  raiz.innerHTML = '<div class="caja" role="dialog" aria-labelledby="fam-titulo"><h2 id="fam-titulo"></h2><p id="fam-texto"></p><div class="fila" id="fam-fila"></div><div id="fam-marca"></div><div class="fila"><button type="button" class="btn" id="fam-ok"></button><button type="button" class="btn ghost" id="fam-cerrar"></button></div></div>';
  document.body.appendChild(raiz);

  function botonPausa() {
    const grid = document.querySelector('#pause .pause-grid');
    if (!grid || grid.querySelector('#b-familia')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn tile'; b.id = 'b-familia'; b.dataset.icon = 'star';
    b.textContent = L('En familia', 'Family');
    grid.appendChild(b);
    b.addEventListener('click', () => {
      const menu = $('pause');
      try { if (menu && menu.matches(':popover-open')) menu.hidePopover(); } catch (e) { /* sin popover */ }
      abrir();
    });
  }
  botonPausa();

  function pintarEspecies(j) {
    const fila = $('fam-fila');
    fila.innerHTML = '';
    for (const id of ESPECIES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn sm' + (j.especie === id ? ' sel' : '');
      b.textContent = id;
      b.addEventListener('click', () => { j.especie = id; pintarEspecies(j); });
      fila.appendChild(b);
    }
  }
  function premioDe(lista) {
    const orden = lista.slice().sort((a, b) => b.puntos - a.puntos || a.segundos - b.segundos);
    const titulos = [
      L('el más valiente', 'the bravest'),
      L('el más rápido', 'the fastest'),
      L('el más gracioso', 'the funniest'),
      L('el más amigo', 'the friendliest'),
    ];
    return orden.map((j, i) => ({ n: j.n, especie: j.especie, puntos: j.puntos, segundos: j.segundos, premio: titulos[i] || titulos[2] }));
  }
  function pintarMarca(filas) {
    $('fam-marca').innerHTML = filas.map(f => `<div class="marca"><b>${L('Jugador', 'Player')} ${f.n}</b> · ${f.especie}<div class="premio">${f.premio}</div><small>${f.puntos} · ${f.segundos}s</small></div>`).join('');
  }
  function paso() {
    $('fam-titulo').textContent = L('En familia', 'Family');
    if (!jugadores.length) {
      $('fam-texto').textContent = L('¿Cuántos juegan? De 2 a 4. Se pasan el control.', 'How many are playing? From 2 to 4. Pass the controller.');
      const fila = $('fam-fila'); fila.innerHTML = '';
      [2, 3, 4].forEach(n => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn'; b.textContent = String(n);
        b.addEventListener('click', () => { empezar(n); });
        fila.appendChild(b);
      });
      $('fam-marca').innerHTML = '';
      $('fam-ok').hidden = true;
      return;
    }
    if (turno < jugadores.length) {
      const j = jugadores[turno];
      $('fam-texto').textContent = L('Pasa el control. Elige tu cotorra y juega tu turno de ' + juego + '.', 'Pass the controller. Pick your parrot and play your ' + juego + ' turn.');
      $('fam-titulo').textContent = L('Turno ' + (turno + 1), 'Turn ' + (turno + 1));
      pintarEspecies(j);
      $('fam-ok').hidden = false;
      $('fam-ok').textContent = L('Terminé mi turno', 'My turn is done');
      return;
    }
    const filas = premioDe(jugadores);
    $('fam-texto').textContent = L('¡Todos ganan un premio!', 'Everyone gets a prize!');
    $('fam-fila').innerHTML = '';
    $('fam-ok').hidden = true;
    pintarMarca(filas);
  }
  function empezar(n, cual) {
    if (n < 2 || n > 4) return null;
    juego = JUEGOS.includes(cual) ? cual : 'trucos';
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
    if (juego === 'trucos' && G.trucos && typeof G.trucos.combo === 'number') j.puntos = Math.max(j.puntos, G.trucos.combo);
    turno += 1;
    paso();
    return turno >= jugadores.length ? premioDe(jugadores) : null;
  }
  function abrir() {
    jugadores = []; turno = 0; abierto = true; raiz.hidden = false; paso();
    return true;
  }
  function cerrar() { abierto = false; raiz.hidden = true; jugadores = []; turno = 0; }
  $('fam-cerrar').textContent = L('Cerrar', 'Close');
  $('fam-cerrar').addEventListener('click', cerrar);
  $('fam-ok').addEventListener('click', () => anotar(1, 10));

  function test() {
    const out = [], ok = (name, pass, extra) => out.push({ name, ok: !!pass, extra: extra == null ? '' : String(extra) });
    const antes = raiz.hidden;
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
    } catch (e) { ok('sin excepciones', false, e && e.message); }
    cerrar(); raiz.hidden = antes;
    return { passed: out.filter(r => r.ok).length, total: out.length, results: out };
  }
  G.familia = { abrir, cerrar, empezar, anotar, premioDe, ESPECIES, JUEGOS, test };
  return G.familia;
};
