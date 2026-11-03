/* Content pack ep6 · secretos (CG-14). Solo datos. La historia no cambia.
   Los fragmentos 4, 5 y 6 se cuentan en el Diario de este capítulo como pedazo 6;
   juntarlos en la mesa no apaga las luces que esperan. */
(function () {
  'use strict';
  const p = AVE.packs && AVE.packs.ep6;
  if (!p) return;
  const MAPA_REAL = false;
  const REAL = (MAPA_REAL || /[?&]mapa=real(&|$)/.test(location.search)) && !!(window.AVE && window.AVE.mundoReal && window.AV_MAPA_CAP1);
  const EN = (relleno, mapa) => (REAL ? mapa : relleno);
  const RIO_X = 20, RIO_R = { x: 22.5, z: -50, k: 1.2308 };
  const RX = x => (REAL ? RIO_R.x - (x - RIO_X) * RIO_R.k : x), RZ = z => (REAL ? RIO_R.z + z : z);
  const PR = (x, z) => ({ x: RX(x), z: RZ(z) });
  const PC = { x: -40, z: -131 };
  const CI = (x, z) => (REAL ? { x: PC.x + x, z: PC.z + z } : { x, z });
  const L = (es, en) => (S, G) => ((G.aula && G.aula.aj && G.aula.aj.idioma === 'en') || (G.idioma && G.idioma.activo && G.idioma.activo()) ? en : es); // W7: también el idioma del juego
  const vin = (id, needs, es, en, a, b) => ({ id, needs, img: 'portrait', sinCaptura: true, texto: L(es, en), opciones: [L(a[0], a[1]), L(b[0], b[1])] });

  const asientos = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    asientos.push(Object.assign(CI(Math.cos(a) * 8, Math.sin(a) * 8), { r: 1.3 }));
  }

  p.secretos = [
    {
      id: 'ep6_nudo', tipo: 'fondo',
      nombre: { es: 'El nudo perdido', en: 'The lost knot' },
      punto: Object.assign(PR(20, 0), { r: 6 }),
      premio: { vineta: 'sec_ep6_nudo', evento: 'SecretoEp6Nudo' },
      leyenda: { es: 'Bajo el puente, nadando, está la soga de Nudo. Cuando se la llevan, la ata tan bonita que no se puede desatar.', en: 'Under the bridge, swimming, is Nudo’s rope. When it is brought back, the knot is so pretty it will not undo.' },
    },
    {
      id: 'ep6_mesa', tipo: 'seguir',
      nombre: { es: 'El mapa en la mesa', en: 'The map on the table' },
      punto: Object.assign(EN({ x: -6, z: 4.5 }, { x: 45, z: -60 }), { r: 3 }),
      premio: { vineta: 'sec_ep6_mesa', evento: 'SecretoEp6Mesa' },
      leyenda: { es: 'En la mesa del taller los pedazos se miran juntos. Sin ellos, el capítulo se termina igual.', en: 'On the workshop table the pieces sit together. Without them, the chapter still ends.' },
    },
    {
      id: 'ep6_asientos', tipo: 'perchas',
      nombre: { es: 'Los seis asientos', en: 'The six seats' },
      puntos: asientos,
      premio: { vineta: 'sec_ep6_asientos', evento: 'SecretoEp6Asientos' },
      leyenda: { es: 'En cada asiento, un saludo distinto. Con los seis, la foto de grupo entra al cómic.', en: 'At each seat, a different greeting. With all six, the group picture goes into the comic.' },
    },
    {
      id: 'ep6_luz', tipo: 'seguir',
      nombre: { es: 'La luz que parpadea distinto', en: 'The light that blinks differently' },
      punto: Object.assign(EN({ x: -20, z: -20 }, { x: -40, z: -117 }), { r: 3 }),
      premio: { fragmento: 6, vineta: 'sec_ep6_luz', evento: 'SecretoEp6Luz' },
      leyenda: { es: 'Una de las luces que esperan parpadea distinto y suelta el pedazo 6. Las demás siguen esperando.', en: 'One of the lights that are waiting blinks differently and drops piece 6. The others keep waiting.' },
    },
  ];

  if (p.comic && Array.isArray(p.comic.vinetas)) {
    p.comic.vinetas.push(
      vin('sec_ep6_nudo', 'SecretoEp6Nudo', 'El nudo quedó precioso.', 'The knot came out beautiful.',
        ['La soga estaba bajo el puente.', 'The rope was under the bridge.'], ['Nudo se rió y no lo desató.', 'Nudo laughed and did not undo it.']),
      vin('sec_ep6_mesa', 'SecretoEp6Mesa', 'Los pedazos se vieron juntos.', 'The pieces were seen together.',
        ['Los puse en la mesa del taller.', 'I put them on the workshop table.'], ['El capítulo sigue aunque falte uno.', 'The chapter goes on even if one is missing.']),
      vin('sec_ep6_asientos', 'SecretoEp6Asientos', 'La foto de los seis.', 'The picture of the six.',
        ['Un saludo en cada asiento.', 'A greeting at each seat.'], ['Quedó en el cómic.', 'It went into the comic.']),
      vin('sec_ep6_luz', 'SecretoEp6Luz', 'Cayó el último pedazo.', 'The last piece fell.',
        ['Una luz parpadeaba distinto.', 'One light blinked differently.'], ['Las otras catorce siguen esperando.', 'The other fourteen keep waiting.'])
    );
  }
  const g = p.guardado;
  if (g && Array.isArray(g.claves) && g.claves.indexOf('secretos') < 0) {
    g.claves.push('secretos');
    const est = g.estado;
    g.estado = () => Object.assign(est ? est() : {}, { secretos: [] });
  }
})();
