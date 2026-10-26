/* Content pack cap1 · Fauna que reacciona (BOSQUE_VIVO_DISENO ficha 2; lo usa src/game/fauna.js, que carga este archivo al pedirlo)
   Cuatro animales de El Yunque que hacen una cosa cuando Vittata se acerca y otra si se queda quieta. Observar uno por primera vez
   da su tarjeta en el álbum «Fauna de El Yunque» del Diario. Cada texto lleva su fuente (consultada el 25-oct-2026) y su estado:
   lo que la fuente no dice literalmente no está en el texto del juego y queda anotado en «nota» como «por verificar».
   Decisiones [KELVIN] con la opción neutra de la ficha: la boa entra como encuentro opcional (boa: true; false la quita), la mariposa
   es la cebra (común y verificable) y el álbum es una sección aparte del Diario. */
(function () {
  'use strict';
  AVE.registerPack({
    id: 'cap1',
    fauna: {
      boa: true, // [KELVIN] si la boa entra en el capítulo 1 o se guarda para el 2
      album: { titulo: 'Fauna de El Yunque', tituloEn: 'Wildlife of El Yunque', pista: 'Quédate quieta cerca de un animal para conocerlo.', pistaEn: 'Stay still near an animal to meet it.' },
      // Dónde viven (ids de POI del mapa; si falta uno se usa el punto de aparición)
      zonas: {
        mariposas: ['plaza', 'parada_claro', 'poza_dajao'],
        boa: 'cueva_rio',
        coquiHojas: { x: -10, z: -185, n: 5 }, // Bosque enano y nublado (mapa: zona con niebla); los otros 3 son los arbustos de M3 (G.c.BUSHES)
      },
      especies: [
        { id: 'lagartijo', nombre: 'Lagartijo común', nombreEn: 'Puerto Rican crested anole', cientifico: 'Anolis cristatellus',
          texto: 'Vive en los dos metros bajos de los troncos. El macho despliega un abanico amarillo con borde anaranjado y hace flexiones para marcar su sitio.',
          textoEn: 'It lives on the lowest two meters of tree trunks. The male shows a yellow fan with an orange edge and does push-ups to mark its spot.',
          fuente: 'Wikipedia (EN), «Puerto Rican crested anole»', url: 'https://en.wikipedia.org/wiki/Puerto_Rican_crested_anole',
          estado: 'verificado', nota: 'Fuente secundaria: confirmar en una guía del DRNA antes de publicar.',
          color: '#8a7a52', silueta: 'lagartijo' },
        { id: 'mariposa', nombre: 'Mariposa cebra', nombreEn: 'Zebra longwing', cientifico: 'Heliconius charithonia',
          texto: 'Come polen, no solo néctar, y de noche duerme en grupo en la misma rama: hasta 60 juntas.',
          textoEn: 'It eats pollen, not just nectar, and at night it sleeps in a group on the same branch: up to 60 together.',
          fuente: 'Wikipedia (EN), «Heliconius charithonia»', url: 'https://en.wikipedia.org/wiki/Heliconius_charithonia',
          estado: 'verificado', nota: 'Por verificar que sea común en El Yunque. [KELVIN] cebra o arlequín (Atlantea tulita, que no es de El Yunque).',
          color: '#f2cf3a', silueta: 'mariposa' },
        { id: 'coqui', nombre: 'Coquí común', nombreEn: 'Common coquí', cientifico: 'Eleutherodactylus coqui',
          texto: 'Ranita nativa de Puerto Rico. De noche, el macho canta "co-quí".',
          textoEn: 'A small frog native to Puerto Rico. At night, the male sings "co-quí".',
          fuente: 'ISSG/UICN, Global Invasive Species Database (y Beard & Pitt 2012, USGS: docs/equipo/DIARIO_VALIDACION.md)', url: 'https://www.iucngisd.org/gisd/species.php?sc=105',
          estado: 'verificado', nota: 'Por verificar que cante de día con lluvia: el texto no lo afirma.',
          color: '#b0773a', silueta: 'coqui' },
        { id: 'boa', nombre: 'Boa puertorriqueña', nombreEn: 'Puerto Rican boa', cientifico: 'Chilabothrus inornatus',
          texto: 'La serpiente más grande de la isla: crece hasta 1,9 m. Atrapa a sus presas apretándolas y come roedores y murciélagos.',
          textoEn: 'The largest snake on the island: it grows up to 1.9 m. It catches its prey by squeezing and eats rodents and bats.',
          fuente: 'Wikipedia (EN), «Puerto Rican boa»', url: 'https://en.wikipedia.org/wiki/Puerto_Rican_boa',
          estado: 'verificado', nota: 'Por verificar en USFWS o DRNA: que no tiene veneno, que es tímida y su estatus federal.',
          color: '#6b5a3e', silueta: 'boa' },
      ],
    },
  });
})();
