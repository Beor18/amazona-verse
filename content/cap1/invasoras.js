/* Content pack cap1 · Especies invasoras de Puerto Rico (expansión, encendida para todos; lo usa src/game/invasoras.js,
   que carga este archivo al pedirlo). Aprobado para la expansión por Kelvin (ROADMAP «Después de la temporada 1», 8 y 9-nov):
   fichas del Diario y una actividad de observación, NUNCA como enemigos (nada se ataca ni se caza en el juego).
   Cada texto sale literal de su fuente oficial (consultadas el 9-nov-2026); lo que la fuente no dice no está en el texto.
   - Pez león: USGS NAS, ficha «Pterois volitans/miles»: área nativa (Pacífico occidental; P. miles del Índico y el mar Rojo),
     tabla de Puerto Rico «PR 2008», «dorsal fin has strong, venomous spines … anal fin also has sharp, venomous spines»,
     «relatively inactive during the day, typically sheltering in reef crevices», «prey … includes small fishes and crustaceans»,
     «most probable explanation for the arrival … is via the aquarium trade».
   - Tilapia de Mozambique: USGS NAS, ficha «Oreochromis mossambicus»: «Tropical and subtropical Africa», «Occurs in both fresh and
     brackish waters», tabla «PR 1958», «A true detritivore», «may impact native fishes through competition for food and/or space».
   - Pleco (coroncoro de vela): USGS NAS, ficha «Pterygoplichthys sp. (sailfin armored catfish)»: «flexible bony plates» y «ventral
     suctorial mouth», tabla «PR 1992», «Male members … dig into river banks to create burrows in which an attracted female will lay and
     guard her eggs», «burrows potentially destabilize the banks, leading to an increased rate of erosion».
   - Iguana verde: DRNA, Orden Administrativa 2024-06: «gallina de palo o iguana verde (Iguana iguana)», «Declaro como especies de vida
     silvestre perjudiciales o invasoras», «está amenazando los ecosistemas terrestres, las áreas agrícolas y la salud y seguridad de
     nuestra ciudadanía»; el Reglamento 6765 que cita define las invasoras como «especies exóticas».
   [KELVIN] Nombres en el juego («Patrulla invasora», «pleco»), el texto de la Estación y si entra en la temporada 1 o en la expansión. */
(function () {
  'use strict';
  const USGS = id => 'https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=' + id;
  window.AV_INVASORAS = {
    album: {
      titulo: 'Patrulla invasora', tituloEn: 'Invasive species patrol',
      intro: 'Busca 4 animales que no son de aquí y avísale a la Estación de Conservación. Míralos de lejos: ¡nunca se tocan!',
      introEn: 'Find 4 animals that are not from here and tell the Conservation Station. Watch them from far away: never touch!',
      nota: 'Aquí solo se miran y se avisan. Nadie los persigue ni les hace daño.',
      notaEn: 'Here you only watch and report them. Nobody chases them or hurts them.',
    },
    especies: [
      { id: 'iguana', nombre: 'Iguana verde', nombreEn: 'Green iguana', cientifico: 'Iguana iguana', donde: 'orilla', cerca: { x: 149, z: 145 }, radio: 7,
        pista: 'Toma el sol en la orilla del río, cerca del puente de Villa Raíz.', pistaEn: 'It basks on the riverbank, near the Villa Raíz bridge.',
        texto: 'También le dicen gallina de palo. No es de aquí: en 2024 el DRNA la declaró especie invasora porque amenaza la naturaleza en tierra, los cultivos y la seguridad de la gente.',
        textoEn: 'People here also call it "gallina de palo" (tree chicken). It is not from here: in 2024 the DRNA declared it an invasive species because it threatens nature on land, crops and people\'s safety.',
        fuente: 'DRNA, Orden Administrativa 2024-06 (gallina de palo o iguana verde)',
        url: 'https://drna.pr.gov/wp-content/uploads/2024/06/ORDEN-ADMINISTRATIVA-2024-06-CONTROL-DE-LA-GALLINA-DE-PALO-O-IGUANA-VERDE.pdf',
        estado: 'verificado', color: '#5f9a3a', silueta: 'iguana' },
      { id: 'tilapia', nombre: 'Tilapia de Mozambique', nombreEn: 'Mozambique tilapia', cientifico: 'Oreochromis mossambicus', donde: 'rio', cerca: { x: 127, z: 143 }, radio: 8,
        pista: 'Nada en grupo en el río, junto a Villa Raíz.', pistaEn: 'It swims in a group in the river, next to Villa Raíz.',
        texto: 'Viene de África. El USGS la registra en Puerto Rico desde 1958. Vive en agua dulce y en agua salobre, come detrito (restos de plantas y animales) y les puede quitar comida y espacio a los peces nativos.',
        textoEn: 'It comes from Africa. The USGS has records of it in Puerto Rico since 1958. It lives in fresh and brackish water, eats detritus (bits of dead plants and animals) and can take food and space from native fish.',
        fuente: 'USGS, Nonindigenous Aquatic Species: Oreochromis mossambicus', url: USGS(466),
        estado: 'verificado', color: '#7d8a74', silueta: 'tilapia' },
      { id: 'pleco', nombre: 'Pleco (coroncoro de vela)', nombreEn: 'Sailfin armored catfish (pleco)', cientifico: 'Pterygoplichthys sp.', donde: 'fondo', cerca: { x: 126, z: 100 }, radio: 8,
        pista: 'Pegado al fondo del río, río arriba de Villa Raíz.', pistaEn: 'Stuck to the river bottom, upstream from Villa Raíz.',
        texto: 'Tiene placas de hueso como armadura y la boca como una ventosa, por debajo. El USGS lo registra en Puerto Rico desde 1992. Los machos cavan cuevas en la orilla para sus nidos y, cuando son muchos, esas cuevas aflojan la orilla y la erosionan.',
        textoEn: 'It has bony plates like armor and a suction-cup mouth underneath. The USGS has records of it in Puerto Rico since 1992. Males dig burrows in the riverbank for their nests and, when there are many, the burrows loosen the bank and erode it.',
        fuente: 'USGS, Nonindigenous Aquatic Species: Pterygoplichthys sp.', url: USGS(770),
        estado: 'verificado', color: '#5a4630', silueta: 'pleco' },
      { id: 'pezleon', nombre: 'Pez león', nombreEn: 'Lionfish', cientifico: 'Pterois volitans / P. miles', donde: 'arrecife', cerca: { x: 160, z: 222 }, radio: 10,
        pista: 'Se esconde en el arrecife de la playa, cerca del muelle.', pistaEn: 'It hides on the beach reef, near the dock.',
        texto: 'Viene del Pacífico y del océano Índico; lo más probable es que llegara desde los acuarios. El USGS lo registra en Puerto Rico desde 2008. De día se esconde en las grietas del arrecife y come peces pequeños y crustáceos. Sus espinas tienen veneno: se mira, no se toca.',
        textoEn: 'It comes from the Pacific and Indian Oceans; most likely it arrived from aquariums. The USGS has records of it in Puerto Rico since 2008. By day it hides in reef cracks, and it eats small fish and crustaceans. Its spines are venomous: look, don\'t touch.',
        fuente: 'USGS, Nonindigenous Aquatic Species: Pterois volitans/miles', url: USGS(963),
        estado: 'verificado', color: '#c8553d', silueta: 'pezleon' },
    ],
  };
})();
