/* Content pack ep3 · secretos (CG-13). Solo datos: el módulo es src/game/secretos.js.
   No cambia la historia. Mismas coordenadas EN() que pack.js. Sin datos de arrecife ni de tortuga:
   eso pide fuente y aquí no se afirma. Las gafas, como ropa, esperan arte de Kelvin. */
(function () {
  'use strict';
  const p = AVE.packs && AVE.packs.ep3;
  if (!p) return;
  const REAL = !!(window.AVE && window.AVE.mundoReal && window.AV_MAPA_CAP1);
  const EN = (relleno, mapa) => (REAL ? mapa : relleno);
  const L = (es, en) => (S, G) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const vin = (id, needs, es, en, a, b) => ({
    id, needs, img: 'portrait', sinCaptura: true,
    texto: L(es, en), opciones: [L(a[0], a[1]), L(b[0], b[1])],
  });
  const pt = (relleno, mapa, extra) => Object.assign({}, EN(relleno, mapa), extra || {});

  p.secretos = [
    {
      id: 'ep3_botella', tipo: 'rasante', altura: 6,
      nombre: { es: 'La botella de la barra', en: 'The bottle on the bar' },
      punto: pt({ x: -18.5, z: 38.5 }, { x: 213, z: 242 }, { r: 10 }),
      premio: { fragmento: 3, vineta: 'sec_ep3_botella', evento: 'SecretoEp3Botella' },
      leyenda: {
        es: 'Sobre la barra de arena, a ras del agua, una botella trae el tercer pedazo del mapa.',
        en: 'On the sandbar, skimming the water, a bottle carries the third piece of the map.',
      },
    },
    {
      id: 'ep3_arrecife', tipo: 'fondo',
      nombre: { es: 'Bajo el agua de la playa', en: 'Under the beach water' },
      punto: pt({ x: -4, z: 30 }, { x: 170, z: 205 }, { y: 0.2, r: 8 }),
      premio: { vineta: 'sec_ep3_arrecife', evento: 'SecretoEp3Arrecife' },
      leyenda: {
        es: 'Buceando se ven cosas en el fondo: un ancla, un cántaro y dos conchas. Vittata las cuenta como leyenda, sin dato de libro.',
        en: 'Diving shows things on the bottom: an anchor, a jar, and two shells. Vittata tells it as a legend, with no textbook fact.',
      },
    },
    {
      id: 'ep3_faro', tipo: 'perchas',
      nombre: { es: 'Saludo en la otra orilla', en: 'A wave on the other shore' },
      puntos: [pt({ x: -32, z: 28.5 }, { x: 150, z: 200.5 }, { r: 4 })],
      premio: { vineta: 'sec_ep3_faro', evento: 'SecretoEp3Faro' },
      leyenda: {
        es: 'En la otra orilla, posarse y saludar hace que alguien conteste con tres luces. Es el cuento del viaje.',
        en: 'On the other shore, landing and waving makes someone answer with three lights. It is the story of the trip.',
      },
    },
    {
      id: 'ep3_costa', tipo: 'seguir',
      nombre: { es: 'La ruta larga', en: 'The long route' },
      punto: pt({ x: -11, z: 28 }, { x: 221, z: 238 }, { r: 12 }),
      premio: { vineta: 'sec_ep3_costa', evento: 'SecretoEp3Costa' },
      leyenda: {
        es: 'Quien toma el camino largo ve el mar con calma. No se pierde nada por ir por el corto.',
        en: 'Whoever takes the long way sees the sea at ease. Nothing is lost by taking the short one.',
      },
    },
  ];

  if (p.comic && Array.isArray(p.comic.vinetas)) {
    p.comic.vinetas.push(
      vin('sec_ep3_botella', 'SecretoEp3Botella', 'La botella traía un pedazo de mapa.', 'The bottle carried a piece of map.',
        ['La agarré a ras de la barra.', 'I grabbed it skimming the bar.'],
        ['Es el pedazo 3 de 6.', 'It is piece 3 of 6.']),
      vin('sec_ep3_arrecife', 'SecretoEp3Arrecife', 'Buceé y el fondo tenía cuentos.', 'I dived and the bottom had stories.',
        ['Un ancla, un cántaro y dos conchas.', 'An anchor, a jar, and two shells.'],
        ['No me llevé nada que no fuera mío.', 'I did not take anything that was not a story.']),
      vin('sec_ep3_faro', 'SecretoEp3Faro', 'Me contestaron.', 'They answered me.',
        ['Tres luces desde la otra orilla.', 'Three lights from the other shore.'],
        ['Saludé y alguien saludó.', 'I waved and someone waved.']),
      vin('sec_ep3_costa', 'SecretoEp3Costa', 'El camino largo también llega.', 'The long way arrives too.',
        ['Fui por la costa, sin prisa.', 'I went along the coast, in no hurry.'],
        ['El atajo sigue valiendo igual.', 'The shortcut is still just as good.'])
    );
  }

  const g = p.guardado;
  if (g && Array.isArray(g.claves) && g.claves.indexOf('secretos') < 0) {
    g.claves.push('secretos');
    const est = g.estado;
    g.estado = () => Object.assign(est ? est() : {}, { secretos: [] });
  }
})();
