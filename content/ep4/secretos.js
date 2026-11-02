/* Content pack ep4 · secretos (CG-14). Solo datos. La historia no cambia.
   M() es el mismo traslado del río que pack.js. Sin datos nuevos: las piedras y el puente son del juego. */
(function () {
  'use strict';
  const p = AVE.packs && AVE.packs.ep4;
  if (!p) return;
  const REAL = !!(window.AVE && window.AVE.mundoReal && window.AV_MAPA_CAP1);
  const RIO = 8, DZ = 160;
  const CAUCE = REAL ? window.AV_MAPA_CAP1.agua.rio.puntos.filter(q => q[0] > 185 && q[0] < 225 && q[1] > 110 && q[1] < 205).sort((u, v) => u[1] - v[1]) : [];
  function cauce(z) {
    const P = CAUCE; if (!P.length) return [RIO, 5];
    if (z <= P[0][1]) return [P[0][0], P[0][3]];
    for (let i = 1; i < P.length; i++) if (z <= P[i][1]) { const t = (z - P[i - 1][1]) / (P[i][1] - P[i - 1][1]); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][3] + (P[i][3] - P[i - 1][3]) * t]; }
    const u = P[P.length - 1]; return [u[0], u[3]];
  }
  const seco = (x, z, lado) => { const MD = window.AV_MAPA_CAP1; let k = 0; while (k < 16 && MD.nivelAguaEn(x, z) > MD.alturaEn(x, z) - 0.3) { x += lado * 0.5; k++; } return k ? x + lado : x; };
  const M = q => { if (!REAL) return q; const z = q.z + DZ, c = cauce(z)[0]; return Object.assign({}, q, { x: seco(c + (q.x - RIO), z, q.x < RIO ? -1 : 1), z }); };
  const L = (es, en) => (S, G) => (G.aula && G.aula.aj && G.aula.aj.idioma === 'en' ? en : es);
  const vin = (id, needs, es, en, a, b) => ({ id, needs, img: 'portrait', sinCaptura: true, texto: L(es, en), opciones: [L(a[0], a[1]), L(b[0], b[1])] });

  p.secretos = [
    {
      id: 'ep4_piedras', tipo: 'perchas',
      nombre: { es: 'Las piedras de paso', en: 'The stepping stones' },
      puntos: [-12, -9, -6, -3].map(x => M({ x, z: -9, r: 1.15 })),
      premio: { vineta: 'sec_ep4_piedras', evento: 'SecretoEp4Piedras' },
      leyenda: { es: 'Cruzar por las piedras, posándose, sin ir por el aire. Si caes al agua, se vuelve a intentar.', en: 'Cross on the stones, landing, without going through the air. If you fall in, you try again.' },
    },
    {
      id: 'ep4_puente', tipo: 'rasante', altura: 8,
      nombre: { es: 'Bajo el puente', en: 'Under the bridge' },
      punto: M({ x: 8, z: 0, r: 8 }),
      premio: { fragmento: 4, vineta: 'sec_ep4_puente', evento: 'SecretoEp4Puente' },
      leyenda: { es: 'A ras del agua, bajo el puente, hay una nota con el pedazo 4 del mapa.', en: 'Skimming the water, under the bridge, a note holds piece 4 of the map.' },
    },
    {
      id: 'ep4_maqueta', tipo: 'seguir',
      nombre: { es: 'La Vittata de la maqueta', en: 'The little Vittata on the model' },
      punto: M({ x: -5, z: -2, r: 4 }),
      premio: { vineta: 'sec_ep4_maqueta', evento: 'SecretoEp4Maqueta' },
      leyenda: { es: 'En la maqueta hay una Vittata diminuta. «¿Esa soy yo? Me hicieron el pico enorme.»', en: 'On the model there is a tiny Vittata. “Is that me? They made my beak huge.”' },
    },
    {
      id: 'ep4_poza', tipo: 'fondo',
      nombre: { es: 'Lo que se llevó el río', en: 'What the river carried' },
      punto: M({ x: 6, z: 8, r: 6 }),
      premio: { vineta: 'sec_ep4_poza', evento: 'SecretoEp4Poza' },
      leyenda: { es: 'En el fondo hay un remo chico, un juguete y una olla. Se devuelven, sin regaño.', en: 'On the bottom there is a small paddle, a toy, and a pot. They go back, with no scolding.' },
    },
  ];

  if (p.comic && Array.isArray(p.comic.vinetas)) {
    p.comic.vinetas.push(
      vin('sec_ep4_piedras', 'SecretoEp4Piedras', 'Crucé sin alas.', 'I crossed without wings.',
        ['Piedra por piedra, a pie.', 'Stone by stone, on foot.'], ['Al agua se vuelve a empezar.', 'In the water, you start again.']),
      vin('sec_ep4_puente', 'SecretoEp4Puente', 'Bajo el puente había una nota.', 'Under the bridge there was a note.',
        ['Iba a ras del agua.', 'I was skimming the water.'], ['Es el pedazo 4 de 6.', 'It is piece 4 of 6.']),
      vin('sec_ep4_maqueta', 'SecretoEp4Maqueta', '¿Esa soy yo?', 'Is that me?',
        ['En la maqueta tengo el pico enorme.', 'On the model my beak is huge.'], ['Me reí y la dejé ahí.', 'I laughed and left her there.']),
      vin('sec_ep4_poza', 'SecretoEp4Poza', 'El río había guardado cosas.', 'The river had kept some things.',
        ['Un remo, un juguete y una olla.', 'A paddle, a toy, and a pot.'], ['Se las llevé a quien las extrañaba.', 'I took them to whoever missed them.'])
    );
  }
  const g = p.guardado;
  if (g && Array.isArray(g.claves) && g.claves.indexOf('secretos') < 0) {
    g.claves.push('secretos');
    const est = g.estado;
    g.estado = () => Object.assign(est ? est() : {}, { secretos: [] });
  }
})();
