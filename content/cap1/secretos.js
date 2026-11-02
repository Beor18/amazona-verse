/* Content pack cap1 · secretos del capítulo 1 (CG-12).
   Datos solos: el módulo genérico es src/game/secretos.js. No va en pack.js (el cómic lo edita).
   Coordenadas de PROPUESTA_PODERES_SECRETOS_BANDADAS.md §B.1. Las piezas de ropa marcadas
   [arte] las decide Kelvin: aquí el premio es el aviso, la carta de leyenda y la viñeta. */
(function () {
  'use strict';
  const p = AVE.packs && AVE.packs.cap1;
  if (!p) return;

  const L = (es, en) => (S, G) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const vineta = (id, needs, es, en, o1, o2) => ({
    id, needs, img: 'portrait', sinCaptura: true,
    texto: L(es, en),
    opciones: [L(o1[0], o1[1]), L(o2[0], o2[1])],
  });

  p.secretos = [
    {
      id: 'hacienda', tipo: 'perchas',
      nombre: { es: 'Los tres pilares de la hacienda', en: 'The three pillars of the hacienda' },
      puntos: [
        { x: 196, z: -6, y: 44, r: 1.4 },
        { x: 198, z: -4, y: 44, r: 1.4 },
        { x: 200.5, z: -2, y: 44, r: 1.4 },
      ],
      premio: { fragmento: 1, vineta: 'sec_hacienda', evento: 'SecretoHacienda' },
      leyenda: {
        es: 'La hacienda guarda el primer pedazo de un mapa viejo. Nadie dice quién lo dibujó.',
        en: 'The hacienda keeps the first piece of an old map. No one says who drew it.',
      },
    },
    {
      id: 'cascada', tipo: 'seguir',
      nombre: { es: 'Detrás de la cascada', en: 'Behind the waterfall' },
      punto: { x: 65.5, y: 9.7, z: -98.5, r: 5 },
      premio: { vineta: 'sec_cascada', evento: 'SecretoCascada' },
      leyenda: {
        es: 'Detrás de la cortina de La Mina hay un atajo. Es un cuento de Vittata, no un dato.',
        en: 'Behind La Mina’s curtain there is a shortcut. It is one of Vittata’s stories, not a fact.',
      },
    },
    {
      id: 'picachos', tipo: 'perchas',
      nombre: { es: 'La percha más alta', en: 'The highest perch' },
      puntos: [{ x: 60, z: -231, y: 90.4, r: 2.2 }],
      premio: { vineta: 'sec_picachos', evento: 'SecretoPicachos' },
      leyenda: {
        es: 'En Los Picachos hay un nido vacío y una pluma de nube. La cima se alcanza sin dones.',
        en: 'At Los Picachos there is an empty nest and a cloud feather. The summit needs no gift.',
      },
    },
    {
      id: 'cueva', tipo: 'llevar',
      nombre: { es: 'La Cueva del Mar de noche', en: 'The Sea Cave at night' },
      hora: 19, fondo: true,
      desde: { x: 232, y: 0.4, z: -3, r: 5 },
      hasta: { x: 150, y: 0, z: 205, r: 8 },
      premio: { vineta: 'sec_cueva', evento: 'SecretoCueva' },
      leyenda: {
        es: 'De noche, una caracola del fondo llega al muelle y parece que se oye el mar.',
        en: 'At night a shell from the bottom reaches the dock, and the sea seems to answer.',
      },
    },
    {
      id: 'bahia', tipo: 'seguir',
      nombre: { es: 'Escribe con luz', en: 'Write with light' },
      vuelta: { x: -160, z: 207, r: 10 },
      premio: { vineta: 'sec_bahia', evento: 'SecretoBahia' },
      leyenda: {
        es: 'De noche, nadar un círculo en la bahía deja un anillo de luz. El brillo del mar ya tiene su fuente en el propio lugar.',
        en: 'At night, swimming a circle in the bay leaves a ring of light. The sea’s glow already has its source at the place itself.',
      },
    },
  ];

  if (p.comic && Array.isArray(p.comic.vinetas)) {
    p.comic.vinetas.push(
      vineta('sec_hacienda', 'SecretoHacienda',
        'La hacienda guarda algo.', 'The hacienda is keeping something.',
        ['Tres notas y apareció un pedazo de mapa.', 'Three notes, and a piece of map appeared.'],
        ['Me posé en orden y la piedra contestó.', 'I perched in order and the stone answered.']),
      vineta('sec_cascada', 'SecretoCascada',
        'Pasé por detrás de la cascada.', 'I went behind the waterfall.',
        ['El agua me tapó y del otro lado seguía el camino.', 'The water covered me, and the path went on.'],
        ['La Mina tiene una puerta mojada.', 'La Mina has a wet door.']),
      vineta('sec_picachos', 'SecretoPicachos',
        '¡En la cima!', 'On the summit!',
        ['Los Picachos caben en una percha.', 'Los Picachos fit on one perch.'],
        ['Desde arriba la isla se ve entera.', 'From up here the whole island shows.']),
      vineta('sec_cueva', 'SecretoCueva',
        'La caracola se oye como el mar.', 'The shell sounds like the sea.',
        ['La llevé de noche hasta el muelle.', 'I carried it to the dock at night.'],
        ['Alguien se la puso al oído y se rió.', 'Someone held it to an ear and laughed.']),
      vineta('sec_bahia', 'SecretoBahia',
        'Dibujé con luz.', 'I drew with light.',
        ['Un círculo en el agua brilló un momento.', 'A circle in the water shone for a moment.'],
        ['Nadé la vuelta completa.', 'I swam the whole loop.'])
    );
  }

  const g = p.guardado;
  if (g && Array.isArray(g.claves) && !g.claves.includes('secretos')) {
    g.claves.push('secretos');
    const est = g.estado;
    g.estado = () => Object.assign(est ? est() : {}, { secretos: [] });
  }
})();
