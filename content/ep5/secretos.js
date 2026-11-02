/* Content pack ep5 · secretos (CG-14). Solo datos. La historia no cambia.
   De noche en el mapa real el capítulo ya pone S.hora; en el mundo pequeño no hace falta.
   No nombra especies ni dice qué recuerda el Guardián: eso es de Kelvin. */
(function () {
  'use strict';
  const p = AVE.packs && AVE.packs.ep5;
  if (!p) return;
  const MAPA_REAL = false;
  const REAL = (MAPA_REAL || /[?&]mapa=real(&|$)/.test(location.search)) && !!(window.AVE && window.AVE.mundoReal && window.AV_MAPA_CAP1);
  const EN = (relleno, mapa) => (REAL ? mapa : relleno);
  const L = (es, en) => (S, G) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const vin = (id, needs, es, en, a, b) => ({ id, needs, img: 'portrait', sinCaptura: true, texto: L(es, en), opciones: [L(a[0], a[1]), L(b[0], b[1])] });
  const pt = (relleno, mapa, extra) => Object.assign({}, EN(relleno, mapa), extra || {});

  p.secretos = [
    {
      id: 'ep5_espejo', tipo: 'llevar',
      nombre: { es: 'El espejo de repuesto', en: 'The spare mirror' },
      desde: pt({ x: 4, z: 8 }, { x: -42, z: -120 }, { r: 4 }),
      hasta: pt({ x: 14, z: 2 }, { x: -59, z: -102 }, { r: 5 }),
      premio: { fragmento: 5, vineta: 'sec_ep5_espejo', evento: 'SecretoEp5Espejo' },
      leyenda: { es: 'Llevar el espejo de repuesto hasta el pilar enciende un farol viejo. Qué recuerda el Guardián queda en silencio.', en: 'Carrying the spare mirror to the pillar lights an old lantern. What the Guardian remembers stays quiet.' },
    },
    {
      id: 'ep5_tambor', tipo: 'seguir',
      nombre: { es: 'El ritmo de las marcas', en: 'The rhythm of the marks' },
      punto: pt({ x: -8, z: 16 }, { x: -12, z: -80 }, { r: 5 }),
      premio: { vineta: 'sec_ep5_tambor', evento: 'SecretoEp5Tambor' },
      leyenda: { es: 'Las marcas tienen un ritmo: largo, corto, corto, largo, corto. El tambor lo repite y el portal se enciende un rato.', en: 'The marks have a rhythm: long, short, short, long, short. The drum repeats it and the portal lights for a while.' },
    },
    {
      id: 'ep5_luces', tipo: 'seguir',
      nombre: { es: 'Las luces que guían', en: 'The lights that lead' },
      punto: pt({ x: 18, z: 6 }, { x: -74, z: -132 }, { r: 6 }),
      premio: { vineta: 'sec_ep5_luces', evento: 'SecretoEp5Luces' },
      leyenda: { es: 'De noche, unas luces pequeñas marcan el camino hasta un nicho con una pluma azul. Es un cuento, no una especie.', en: 'At night, small lights mark the way to a niche with a blue feather. It is a story, not a species.' },
    },
    {
      id: 'ep5_eco', tipo: 'perchas',
      nombre: { es: 'El eco que contesta', en: 'The echo that answers' },
      puntos: [pt({ x: 10, z: 12 }, { x: -34, z: -147 }, { r: 4 })],
      premio: { vineta: 'sec_ep5_eco', evento: 'SecretoEp5Eco' },
      leyenda: { es: 'Junto al portal, un saludo vuelve con otra voz. La tercera vez no dice un nombre: solo contesta.', en: 'By the portal, a greeting comes back in another voice. The third time it says no name: it only answers.' },
    },
  ];

  if (p.comic && Array.isArray(p.comic.vinetas)) {
    p.comic.vinetas.push(
      vin('sec_ep5_espejo', 'SecretoEp5Espejo', 'El farol viejo se encendió.', 'The old lantern lit.',
        ['Llevé el espejo hasta el pilar.', 'I carried the mirror to the pillar.'], ['Es el pedazo 5 de 6.', 'It is piece 5 of 6.']),
      vin('sec_ep5_tambor', 'SecretoEp5Tambor', 'El portal respondió.', 'The portal answered.',
        ['Toqué el ritmo de las marcas.', 'I played the rhythm of the marks.'], ['Si me equivoco, no pasa nada.', 'If I miss, nothing happens.']),
      vin('sec_ep5_luces', 'SecretoEp5Luces', 'Seguí las luces pequeñas.', 'I followed the small lights.',
        ['Al final había una pluma azul.', 'At the end there was a blue feather.'], ['Iba de noche, sin prisa.', 'I went at night, in no hurry.']),
      vin('sec_ep5_eco', 'SecretoEp5Eco', 'El eco contestó.', 'The echo answered.',
        ['Tres saludos, y el último fue distinto.', 'Three greetings, and the last was different.'], ['No dijo quién era.', 'It did not say who it was.'])
    );
  }
  const g = p.guardado;
  if (g && Array.isArray(g.claves) && g.claves.indexOf('secretos') < 0) {
    g.claves.push('secretos');
    const est = g.estado;
    g.estado = () => Object.assign(est ? est() : {}, { secretos: [] });
  }
})();
