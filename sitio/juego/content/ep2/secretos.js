/* Content pack ep2 · secretos (CG-13). Solo datos: el módulo es src/game/secretos.js.
   No cambia la historia. Coordenadas con el mismo EN() que pack.js (relleno o mapa real).
   Lo cultural de los postes no se afirma. La cometa, como ropa, espera arte de Kelvin. */
(function () {
  'use strict';
  const p = AVE.packs && AVE.packs.ep2;
  if (!p) return;
  const REAL = !!(window.AVE && window.AVE.mundoReal);
  const EN = (relleno, mapa) => (REAL ? mapa : relleno);
  const L = (es, en) => (S, G) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const vin = (id, needs, es, en, a, b) => ({
    id, needs, img: 'portrait', sinCaptura: true,
    texto: L(es, en), opciones: [L(a[0], a[1]), L(b[0], b[1])],
  });
  const pt = (relleno, mapa, extra) => Object.assign({}, EN(relleno, mapa), extra || {});

  p.secretos = [
    {
      id: 'ep2_cometa', tipo: 'llevar',
      nombre: { es: 'La cometa en el techo', en: 'The kite on the roof' },
      desde: pt({ x: 16, z: -6 }, { x: 0, z: 60 }, { r: 6 }),
      hasta: pt({ x: 8, z: 9 }, { x: -27, z: 30 }, { r: 6 }),
      premio: { vineta: 'sec_ep2_cometa', evento: 'SecretoEp2Cometa' },
      leyenda: {
        es: 'Una cometa se había quedado en la loma. Se la llevé al niño, junto a la abuela. Es un cuento de Vittata.',
        en: 'A kite had stuck on the hill. I brought it to the child, next to the grandmother. It is one of Vittata’s stories.',
      },
    },
    {
      id: 'ep2_barquito', tipo: 'rasante', altura: 4,
      nombre: { es: 'El barquito de papel', en: 'The paper boat' },
      punto: pt({ x: -12, z: 15 }, { x: -30, z: 27 }, { r: 8 }),
      premio: { vineta: 'sec_ep2_barquito', evento: 'SecretoEp2Barquito' },
      leyenda: {
        es: 'Tras la llovizna, un barquito de papel bajó hasta el charco. Hay que ir bajo, con él.',
        en: 'After the drizzle, a paper boat ran down to the puddle. You stay low, with it.',
      },
    },
    {
      id: 'ep2_postes', tipo: 'perchas',
      nombre: { es: 'Los postes que cantan', en: 'The posts that sing' },
      puntos: [0, 3, 6, 9].map(dx => pt({ x: 13 + dx, z: 12 }, { x: -17 + dx, z: 22 }, { r: 1.2 })),
      premio: { vineta: 'sec_ep2_postes', evento: 'SecretoEp2Postes' },
      leyenda: {
        es: 'Cuatro postes, del más cercano al más lejos, suenan como una escala. No cuentan una historia de nadie: solo suenan.',
        en: 'Four posts, from the nearest to the farthest, sound like a scale. They do not tell anyone’s history: they just sound.',
      },
    },
    {
      id: 'ep2_huellas', tipo: 'seguir',
      nombre: { es: 'Huellas en el barro', en: 'Tracks in the mud' },
      punto: pt({ x: -9, z: 18 }, { x: -33, z: 24 }, { r: 5 }),
      premio: { vineta: 'sec_ep2_huellas', evento: 'SecretoEp2Huellas' },
      leyenda: {
        es: 'Unas huellas pequeñas cruzan el llano y se pierden. Vittata dice que alguien hacía flexiones. Es un cuento, no un dato.',
        en: 'Small tracks cross the flat and fade. Vittata says someone was doing push-ups. It is a story, not a fact.',
      },
    },
    {
      id: 'ep2_mapa', tipo: 'seguir',
      nombre: { es: 'Bajo el techo', en: 'Under the roof' },
      punto: pt({ x: -14, z: -12 }, { x: -29, z: 8.5 }, { r: 4 }),
      premio: { fragmento: 2, vineta: 'sec_ep2_mapa', evento: 'SecretoEp2Mapa' },
      leyenda: {
        es: 'Agachada bajo la plancha del techo aparece el segundo pedazo del mapa viejo.',
        en: 'Ducking under the roof sheet, the second piece of the old map shows up.',
      },
    },
  ];

  if (p.comic && Array.isArray(p.comic.vinetas)) {
    p.comic.vinetas.push(
      vin('sec_ep2_cometa', 'SecretoEp2Cometa', 'La cometa volvió a volar.', 'The kite flew again.',
        ['La bajé de la loma y se la di al niño.', 'I brought it down from the hill and gave it to the child.'],
        ['Él la soltó y se fue sobre la loma.', 'He let it go and it went over the hill.']),
      vin('sec_ep2_barquito', 'SecretoEp2Barquito', 'El barquito llegó al charco.', 'The little boat reached the puddle.',
        ['Fui bajo, detrás del papel.', 'I stayed low, behind the paper.'],
        ['La llovizna lo empujó sola.', 'The drizzle pushed it by itself.']),
      vin('sec_ep2_postes', 'SecretoEp2Postes', 'Los postes sonaron en orden.', 'The posts sounded in order.',
        ['Del primero al último, una escala.', 'From the first to the last, a scale.'],
        ['Si me salto uno, no pasa nada.', 'If I skip one, nothing happens.']),
      vin('sec_ep2_huellas', 'SecretoEp2Huellas', 'Seguí unas huellas en el barro.', 'I followed tracks in the mud.',
        ['Se perdían, y Vittata se rió.', 'They faded, and Vittata laughed.'],
        ['Nadie me regañó por no encontrarlas todas.', 'No one scolded me for not finding every one.']),
      vin('sec_ep2_mapa', 'SecretoEp2Mapa', 'El mapa tenía otro pedazo.', 'The map had another piece.',
        ['Estaba bajo la plancha del techo.', 'It was under the roof sheet.'],
        ['Es el pedazo 2 de 6.', 'It is piece 2 of 6.'])
    );
  }

  const g = p.guardado;
  if (g && Array.isArray(g.claves) && g.claves.indexOf('secretos') < 0) {
    g.claves.push('secretos');
    const est = g.estado;
    g.estado = () => Object.assign(est ? est() : {}, { secretos: [] });
  }
})();
