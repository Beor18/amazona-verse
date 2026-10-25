/* Datos compartidos entre packs · Las 34 especies de Amazona del catálogo de Kelvin (+ 2 extintas)
   Solo dato reutilizable (window.AV_ESPECIES). piel: nombre de la piel cocida sobre la Vittata (assets/textures/pieles/<piel>.jpg,
   de los 22 .blend de Kelvin; la aplica src/personaje/pieles.js). Sin piel, el juego tiñe con máscaras (character.js).
   Regla: lo que no se pudo verificar va en null; nunca se rellena de memoria.
   Fuentes (verificado el 24–25 oct 2026):
   - Categoría UICN: la evaluación de BirdLife International (autoridad de la Lista Roja para aves) tal como la cita el infobox
     de la Wikipedia en inglés; uicn.url apunta a la ficha en iucnredlist.org. CONFIRMAR allí antes de publicar: hay
     evaluaciones de 2016 a 2022 y pueden existir otras más nuevas.
   - Nombre común en inglés, distribución y rasgos: Wikipedia en inglés (fuentes.*). Nombre común en español: la primera
     frase de la Wikipedia en español (null si no hay o es dudoso). Distribución y rasgos traducidos al español.
   - catalogo: nombre y estado del Catálogo AmazonaVerse de Kelvin (PDF, oct 2026). Las diferencias con la UICN están en
     docs/equipo/ESPECIES_DISCREPANCIAS.md para que Kelvin decida. */
(function () {
  'use strict';
  window.AV_ESPECIES = {
    "version": 1,
    "verificado": "2026-10-25",
    "categorias": {
      "CR": {
        "es": "En peligro crítico",
        "en": "Critically Endangered"
      },
      "EN": {
        "es": "En peligro",
        "en": "Endangered"
      },
      "VU": {
        "es": "Vulnerable",
        "en": "Vulnerable"
      },
      "NT": {
        "es": "Casi amenazada",
        "en": "Near Threatened"
      },
      "LC": {
        "es": "Preocupación menor",
        "en": "Least Concern"
      },
      "EX": {
        "es": "Extinta",
        "en": "Extinct"
      }
    },
    "especies": [
      {
        "id": "vittata",
        "cientifico": "Amazona vittata",
        "comun": {
          "es": "cotorra puertorriqueña",
          "en": "Puerto Rican amazon"
        },
        "distribucion": {
          "es": "Endémica de Puerto Rico; antes también en Vieques y Mona.",
          "en": "Endemic to Puerto Rico; formerly also on Vieques and Mona."
        },
        "uicn": {
          "categoria": "CR",
          "evaluacion": "BirdLife International (2020). Amazona vittata. IUCN Red List 2020: e.T22686239A179276011",
          "url": "https://www.iucnredlist.org/species/22686239/179276011"
        },
        "rasgos": [
          {
            "es": "frente roja",
            "en": "red forehead"
          },
          {
            "es": "plumaje mayormente verde con plumas de borde azul",
            "en": "mostly green plumage with blue-edged feathers"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Puerto_Rican_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_vittata",
          "uicn": "https://en.wikipedia.org/wiki/Puerto_Rican_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Puerto_Rican_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Puerto_Rican_amazon"
        },
        "catalogo": {
          "nombre": "Cotorra puertorriqueña",
          "uicn": "CR"
        },
        "nota": null
      },
      {
        "id": "diadema",
        "piel": "diadema",
        "cientifico": "Amazona diadema",
        "comun": {
          "es": "loro diadema",
          "en": "Diademed amazon"
        },
        "distribucion": {
          "es": "Endémica de la cuenca del Amazonas, en el norte de Brasil.",
          "en": "Endemic to the Amazon basin in northern Brazil."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2020). Amazona diadema. IUCN Red List 2020: e.T22731595A171906249",
          "url": "https://www.iucnredlist.org/species/22731595/171906249"
        },
        "rasgos": [
          {
            "es": "frente, lores y cera rojos",
            "en": "red forehead, lores and cere"
          },
          {
            "es": "destello rojo en las secundarias al volar",
            "en": "red flash in the secondaries in flight"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Diademed_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_diadema",
          "uicn": "https://en.wikipedia.org/wiki/Diademed_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Diademed_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Diademed_amazon"
        },
        "catalogo": {
          "nombre": "Loro diadema",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "finschi",
        "cientifico": "Amazona finschi",
        "comun": {
          "es": "loro corona lila",
          "en": "Lilac-crowned amazon"
        },
        "distribucion": {
          "es": "Endémica de la vertiente del Pacífico de México.",
          "en": "Endemic to the Pacific slopes of Mexico."
        },
        "uicn": {
          "categoria": "EN",
          "evaluacion": "BirdLife International (2020). Amazona finschi. IUCN Red List 2020: e.T22686268A179290500",
          "url": "https://www.iucnredlist.org/species/22686268/179290500"
        },
        "rasgos": [
          {
            "es": "frente granate",
            "en": "maroon forehead"
          },
          {
            "es": "corona, nuca y cuello azul lila claro",
            "en": "light blue-lilac crown, nape and neck"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Lilac-crowned_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_finschi",
          "uicn": "https://en.wikipedia.org/wiki/Lilac-crowned_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Lilac-crowned_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Lilac-crowned_amazon"
        },
        "catalogo": {
          "nombre": "Loro corona lila",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "imperialis",
        "piel": "imperialis",
        "cientifico": "Amazona imperialis",
        "comun": {
          "es": "loro imperial",
          "en": "Imperial amazon"
        },
        "distribucion": {
          "es": "Endémica de Dominica (Antillas Menores).",
          "en": "Endemic to Dominica (Lesser Antilles)."
        },
        "uicn": {
          "categoria": "CR",
          "evaluacion": "BirdLife International (2019). Amazona imperialis. IUCN Red List 2019: e.T22686411A154800996",
          "url": "https://www.iucnredlist.org/species/22686411/154800996"
        },
        "rasgos": [
          {
            "es": "pecho púrpura oscuro",
            "en": "dark purple chest"
          },
          {
            "es": "dorso verde oscuro con plumas de borde negro",
            "en": "dark green upperparts with black-edged feathers"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Imperial_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_imperialis",
          "uicn": "https://en.wikipedia.org/wiki/Imperial_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Imperial_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Imperial_amazon"
        },
        "catalogo": {
          "nombre": "Loro imperial",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "lilacina",
        "cientifico": "Amazona lilacina",
        "comun": {
          "es": "loro de lores rojas",
          "en": "Lilacine amazon"
        },
        "distribucion": {
          "es": "Oeste de Ecuador, hasta el extremo suroeste de Colombia.",
          "en": "Western Ecuador, reaching extreme southwestern Colombia."
        },
        "uicn": {
          "categoria": "CR",
          "evaluacion": "BirdLife International (2020). Amazona lilacina. IUCN Red List 2020: e.T22728296A181432250",
          "url": "https://www.iucnredlist.org/species/22728296/181432250"
        },
        "rasgos": [
          {
            "es": "plumaje mayormente verde",
            "en": "mostly green plumage"
          },
          {
            "es": "plumas de la corona con puntas lila",
            "en": "lilac-tipped crown feathers"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Lilacine_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_lilacina",
          "uicn": "https://en.wikipedia.org/wiki/Lilacine_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Lilacine_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Lilacine_amazon"
        },
        "catalogo": {
          "nombre": "Loro lilacino",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "oratrix",
        "piel": "oratrix",
        "cientifico": "Amazona oratrix",
        "comun": {
          "es": "loro cabeza amarilla",
          "en": "Yellow-headed amazon"
        },
        "distribucion": {
          "es": "México y el norte de Centroamérica.",
          "en": "Mexico and northern Central America."
        },
        "uicn": {
          "categoria": "EN",
          "evaluacion": "BirdLife International (2020). Amazona oratrix. IUCN Red List 2020: e.T22686337A179331301",
          "url": "https://www.iucnredlist.org/species/22686337/179331301"
        },
        "rasgos": [
          {
            "es": "verde brillante con la cabeza amarilla",
            "en": "bright green with a yellow head"
          },
          {
            "es": "rojo en el doblez del ala",
            "en": "red at the bend of the wing"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Yellow-headed_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_oratrix",
          "uicn": "https://en.wikipedia.org/wiki/Yellow-headed_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Yellow-headed_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Yellow-headed_amazon"
        },
        "catalogo": {
          "nombre": "Loro de cabeza amarilla",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "tresmariae",
        "piel": "tresmariae",
        "cientifico": "Amazona tresmariae",
        "comun": {
          "es": null,
          "en": "Tres Marías amazon"
        },
        "distribucion": {
          "es": "Archipiélago de las Islas Marías, frente a Nayarit (México).",
          "en": "Islas Marías archipelago off Nayarit, Mexico."
        },
        "uicn": {
          "categoria": null,
          "evaluacion": null,
          "url": null
        },
        "rasgos": [
          {
            "es": "cabeza, cuello, garganta y pecho alto amarillo brillante",
            "en": "bright yellow head, neck, throat and upper breast"
          },
          {
            "es": "pecho bajo y vientre verde azulado",
            "en": "bluish-green lower breast and belly"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Tres_Mar%C3%ADas_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Tres_Mar%C3%ADas_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Tres_Mar%C3%ADas_amazon"
        },
        "catalogo": {
          "nombre": "Loro de las Tres Marías",
          "uicn": "EN"
        },
        "nota": "Wikipedia la trata como subespecie (Amazona oratrix tresmariae); la UICN no la evalúa por separado (A. oratrix: EN)."
      },
      {
        "id": "rhodocorytha",
        "piel": "rhodocorytha",
        "cientifico": "Amazona rhodocorytha",
        "comun": {
          "es": "loro de cejas rojas",
          "en": "Red-browed amazon"
        },
        "distribucion": {
          "es": "Bosque atlántico del este de Brasil.",
          "en": "Atlantic forests of eastern Brazil."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2017). Amazona rhodocorytha. IUCN Red List 2017: e.T22686288A118968809",
          "url": "https://www.iucnredlist.org/species/22686288/118968809"
        },
        "rasgos": [
          {
            "es": "corona roja brillante que pasa a pardo púrpura",
            "en": "bright red crown fading to purplish-brown"
          },
          {
            "es": "mejillas y garganta azules",
            "en": "blue cheeks and throat"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Red-browed_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_rhodocorytha",
          "uicn": "https://en.wikipedia.org/wiki/Red-browed_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Red-browed_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Red-browed_amazon"
        },
        "catalogo": {
          "nombre": "Loro de corona roja",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "vinacea",
        "cientifico": "Amazona vinacea",
        "comun": {
          "es": "loro vináceo",
          "en": "Vinaceous-breasted amazon"
        },
        "distribucion": {
          "es": "Argentina, Brasil y Paraguay.",
          "en": "Argentina, Brazil and Paraguay."
        },
        "uicn": {
          "categoria": "EN",
          "evaluacion": "BirdLife International (2017). Amazona vinacea. IUCN Red List 2017: e.T22686374A118954406",
          "url": "https://www.iucnredlist.org/species/22686374/118954406"
        },
        "rasgos": [
          {
            "es": "lores y frente rojos",
            "en": "red lores and forehead"
          },
          {
            "es": "pecho color vino y nuca turquesa",
            "en": "vinaceous breast and turquoise nape"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Vinaceous-breasted_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_vinacea",
          "uicn": "https://en.wikipedia.org/wiki/Vinaceous-breasted_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Vinaceous-breasted_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Vinaceous-breasted_amazon"
        },
        "catalogo": {
          "nombre": "Loro de pecho vináceo",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "viridigenalis",
        "piel": "viridigenalis",
        "cientifico": "Amazona viridigenalis",
        "comun": {
          "es": "loro tamaulipeco",
          "en": "Red-crowned amazon"
        },
        "distribucion": {
          "es": "Tierras bajas del noreste de México.",
          "en": "Lowlands of northeastern Mexico."
        },
        "uicn": {
          "categoria": "EN",
          "evaluacion": "BirdLife International (2021). Amazona viridigenalis. IUCN Red List 2021: e.T22686259A152441187",
          "url": "https://www.iucnredlist.org/species/22686259/152441187"
        },
        "rasgos": [
          {
            "es": "frente y corona rojo brillante",
            "en": "bright red forehead and crown"
          },
          {
            "es": "mejillas verde claro",
            "en": "light green cheeks"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Red-crowned_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_viridigenalis",
          "uicn": "https://en.wikipedia.org/wiki/Red-crowned_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Red-crowned_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Red-crowned_amazon"
        },
        "catalogo": {
          "nombre": "Loro tamaulipeco",
          "uicn": "EN"
        },
        "nota": null
      },
      {
        "id": "agilis",
        "cientifico": "Amazona agilis",
        "comun": {
          "es": "amazona de pico negro",
          "en": "Black-billed amazon"
        },
        "distribucion": {
          "es": "Endémica de Jamaica.",
          "en": "Endemic to Jamaica."
        },
        "uicn": {
          "categoria": "EN",
          "evaluacion": "BirdLife International (2020). Amazona agilis. IUCN Red List 2020: e.T22686231A180748265",
          "url": "https://www.iucnredlist.org/species/22686231/180748265"
        },
        "rasgos": [
          {
            "es": "coberteras auriculares negruzcas y coberteras primarias rojas",
            "en": "blackish ear-coverts and red primary coverts"
          },
          {
            "es": "plumaje verde, más pálido abajo",
            "en": "green plumage, paler below"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Black-billed_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_agilis",
          "uicn": "https://en.wikipedia.org/wiki/Black-billed_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Black-billed_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Black-billed_amazon"
        },
        "catalogo": {
          "nombre": "Loro de pico negro",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "arausiaca",
        "cientifico": "Amazona arausiaca",
        "comun": {
          "es": "amazona gorgirroja",
          "en": "Red-necked amazon"
        },
        "distribucion": {
          "es": "Solo en la isla de Dominica.",
          "en": "Only on Dominica."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2021). Amazona arausiaca. IUCN Red List 2021: e.T22686395A179463121",
          "url": "https://www.iucnredlist.org/species/22686395/179463121"
        },
        "rasgos": [
          {
            "es": "cuerpo verde botella oscuro",
            "en": "deep bottle-green body"
          },
          {
            "es": "plumas rojo anaranjado en la garganta",
            "en": "orange-red throat feathers"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Red-necked_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_arausiaca",
          "uicn": "https://en.wikipedia.org/wiki/Red-necked_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Red-necked_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Red-necked_amazon"
        },
        "catalogo": {
          "nombre": "Loro de cuello rojo",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "auropalliata",
        "piel": "auropalliata",
        "cientifico": "Amazona auropalliata",
        "comun": {
          "es": "loro de nuca amarilla",
          "en": "Yellow-naped amazon"
        },
        "distribucion": {
          "es": "Vertiente del Pacífico, del sur de México al norte de Costa Rica.",
          "en": "Pacific side from southern Mexico to northern Costa Rica."
        },
        "uicn": {
          "categoria": "CR",
          "evaluacion": "BirdLife International (2021). Amazona auropalliata. IUCN Red List 2021: e.T22686342A180373727",
          "url": "https://www.iucnredlist.org/species/22686342/180373727"
        },
        "rasgos": [
          {
            "es": "frente y corona verdes",
            "en": "green forehead and crown"
          },
          {
            "es": "banda amarilla en la nuca",
            "en": "yellow band on the lower nape"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Yellow-naped_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_auropalliata",
          "uicn": "https://en.wikipedia.org/wiki/Yellow-naped_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Yellow-naped_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Yellow-naped_amazon"
        },
        "catalogo": {
          "nombre": "Loro de nuca amarilla",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "barbadensis",
        "piel": "barbadensis",
        "cientifico": "Amazona barbadensis",
        "comun": {
          "es": "cotorra cabeciamarilla",
          "en": "Yellow-shouldered amazon"
        },
        "distribucion": {
          "es": "Norte de Venezuela (incluidas Margarita y La Blanquilla) y Bonaire; reintroducida en Aruba.",
          "en": "Northern Venezuela (incl. Margarita and La Blanquilla) and Bonaire; reintroduced to Aruba."
        },
        "uicn": {
          "categoria": "NT",
          "evaluacion": "BirdLife International (2021). Amazona barbadensis. IUCN Red List 2021: e.T22686325A198373501",
          "url": "https://www.iucnredlist.org/species/22686325/198373501"
        },
        "rasgos": [
          {
            "es": "plumaje mayormente verde",
            "en": "mostly green plumage"
          },
          {
            "es": "anillo ocular desnudo blanco",
            "en": "bare white eye-ring"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Yellow-shouldered_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_barbadensis",
          "uicn": "https://en.wikipedia.org/wiki/Yellow-shouldered_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Yellow-shouldered_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Yellow-shouldered_amazon"
        },
        "catalogo": {
          "nombre": "Loro de hombros amarillos",
          "uicn": "VU"
        },
        "nota": "El texto del artículo aún dice VU (evaluación 2017); el infobox cita la de 2021 (NT)."
      },
      {
        "id": "brasiliensis",
        "piel": "brasiliensis",
        "cientifico": "Amazona brasiliensis",
        "comun": {
          "es": "papagayo de cara roja",
          "en": "Red-tailed amazon"
        },
        "distribucion": {
          "es": "Bosques costeros del sur de Brasil (Serra do Mar, Paraná).",
          "en": "Coastal forests of southern Brazil (Serra do Mar, Paraná)."
        },
        "uicn": {
          "categoria": "NT",
          "evaluacion": "BirdLife International (2017). Amazona brasiliensis. IUCN Red List 2017: e.T22686296A118478685",
          "url": "https://www.iucnredlist.org/species/22686296/118478685"
        },
        "rasgos": [
          {
            "es": "frente roja",
            "en": "red forecrown"
          },
          {
            "es": "banda roja ancha en la cola",
            "en": "broad red band on the tail"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Red-tailed_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_brasiliensis",
          "uicn": "https://en.wikipedia.org/wiki/Red-tailed_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Red-tailed_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Red-tailed_amazon"
        },
        "catalogo": {
          "nombre": "Loro de cola roja",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "collaria",
        "cientifico": "Amazona collaria",
        "comun": {
          "es": "amazona de pico amarillo",
          "en": "Yellow-billed amazon"
        },
        "distribucion": {
          "es": "Endémica de Jamaica.",
          "en": "Endemic to Jamaica."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2021). Amazona collaria. IUCN Red List 2021: e.T22686209A179193185",
          "url": "https://www.iucnredlist.org/species/22686209/179193185"
        },
        "rasgos": [
          {
            "es": "garganta, pecho alto y lados del cuello rosados",
            "en": "pink throat, upper breast and sides of the neck"
          },
          {
            "es": "cola verde con base roja",
            "en": "green tail with red bases"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Yellow-billed_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_collaria",
          "uicn": "https://en.wikipedia.org/wiki/Yellow-billed_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Yellow-billed_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Yellow-billed_amazon"
        },
        "catalogo": {
          "nombre": "Loro de pico amarillo",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "guildingii",
        "piel": "guildingii",
        "cientifico": "Amazona guildingii",
        "comun": {
          "es": "loro de San Vicente",
          "en": "Saint Vincent amazon"
        },
        "distribucion": {
          "es": "Montañas boscosas de San Vicente (Antillas Menores).",
          "en": "Forested mountains of Saint Vincent (Lesser Antilles)."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2020). Amazona guildingii. IUCN Red List: e.T22686403A179396130",
          "url": "https://www.iucnredlist.org/species/22686403/179396130"
        },
        "rasgos": [
          {
            "es": "cabeza blanco amarillenta, azul y verde",
            "en": "yellowish-white, blue and green head"
          },
          {
            "es": "cola azul con puntas amarillas anchas",
            "en": "blue tail with broad yellow tips"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Saint_Vincent_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_guildingii",
          "uicn": "https://en.wikipedia.org/wiki/Saint_Vincent_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Saint_Vincent_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Saint_Vincent_amazon"
        },
        "catalogo": {
          "nombre": "Loro de San Vicente",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "pretrei",
        "cientifico": "Amazona pretrei",
        "comun": {
          "es": "loro de anteojos rojos",
          "en": "Red-spectacled amazon"
        },
        "distribucion": {
          "es": "Argentina, Brasil y Paraguay.",
          "en": "Argentina, Brazil and Paraguay."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2022). Amazona pretrei. IUCN Red List 2022: e.T22686251A210018258",
          "url": "https://www.iucnredlist.org/species/22686251/210018258"
        },
        "rasgos": [
          {
            "es": "mayormente verde con rojo en la cabeza",
            "en": "mostly green with red on the head"
          },
          {
            "es": "rojo en el doblez del ala",
            "en": "red at the bend of the wing"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Red-spectacled_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_pretrei",
          "uicn": "https://en.wikipedia.org/wiki/Red-spectacled_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Red-spectacled_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Red-spectacled_amazon"
        },
        "catalogo": {
          "nombre": "Loro de anteojos rojos",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "tucumana",
        "cientifico": "Amazona tucumana",
        "comun": {
          "es": "loro alisero",
          "en": "Tucumán amazon"
        },
        "distribucion": {
          "es": "Argentina y Bolivia.",
          "en": "Argentina and Bolivia."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2022). Amazona tucumana. IUCN Red List 2022: e.T22686246A209899956",
          "url": "https://www.iucnredlist.org/species/22686246/209899956"
        },
        "rasgos": [
          {
            "es": "mayormente verde",
            "en": "mostly green"
          },
          {
            "es": "frente roja",
            "en": "red forehead"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Tucum%C3%A1n_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_tucumana",
          "uicn": "https://en.wikipedia.org/wiki/Tucum%C3%A1n_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Tucum%C3%A1n_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Tucum%C3%A1n_amazon"
        },
        "catalogo": {
          "nombre": "Loro tucumano",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "ventralis",
        "cientifico": "Amazona ventralis",
        "comun": {
          "es": "cotorra de La Española",
          "en": "Hispaniolan amazon"
        },
        "distribucion": {
          "es": "Endémica de La Española (República Dominicana y Haití).",
          "en": "Endemic to Hispaniola (Dominican Republic and Haiti)."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2020). Amazona ventralis. IUCN Red List 2020: e.T22686215A179267983",
          "url": "https://www.iucnredlist.org/species/22686215/179267983"
        },
        "rasgos": [
          {
            "es": "frente y zona de los ojos blancas",
            "en": "white forehead and eye area"
          },
          {
            "es": "coberteras auriculares negras",
            "en": "black ear coverts"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Hispaniolan_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_ventralis",
          "uicn": "https://en.wikipedia.org/wiki/Hispaniolan_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Hispaniolan_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Hispaniolan_amazon"
        },
        "catalogo": {
          "nombre": "Cotorra de La Española",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "versicolor",
        "piel": "versicolor",
        "cientifico": "Amazona versicolor",
        "comun": {
          "es": "loro de Santa Lucía",
          "en": "Saint Lucia amazon"
        },
        "distribucion": {
          "es": "Montañas del interior de Santa Lucía (Antillas Menores).",
          "en": "Interior mountains of Saint Lucia (Lesser Antilles)."
        },
        "uicn": {
          "categoria": "VU",
          "evaluacion": "BirdLife International (2020). Amazona versicolor. IUCN Red List: e.T22686387A179319598",
          "url": "https://www.iucnredlist.org/species/22686387/179319598"
        },
        "rasgos": [
          {
            "es": "frente azul rey",
            "en": "royal blue forehead"
          },
          {
            "es": "alas verdes con espejo rojo",
            "en": "green wings with a red speculum"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Saint_Lucia_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_versicolor",
          "uicn": "https://en.wikipedia.org/wiki/Saint_Lucia_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Saint_Lucia_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Saint_Lucia_amazon"
        },
        "catalogo": {
          "nombre": "Loro de Santa Lucía",
          "uicn": "VU"
        },
        "nota": null
      },
      {
        "id": "dufresniana",
        "piel": "dufresniana",
        "cientifico": "Amazona dufresniana",
        "comun": {
          "es": "loro de cachetes azules",
          "en": "Blue-cheeked amazon"
        },
        "distribucion": {
          "es": "Este de Venezuela, Guyana, Surinam, Guayana Francesa y norte de Brasil.",
          "en": "Eastern Venezuela, Guyana, Suriname, French Guiana and northern Brazil."
        },
        "uicn": {
          "categoria": "NT",
          "evaluacion": "BirdLife International (2020). Amazona dufresniana. IUCN Red List: e.T22686282A174107588",
          "url": "https://www.iucnredlist.org/species/22686282/174107588"
        },
        "rasgos": [
          {
            "es": "mayormente verde",
            "en": "mostly green"
          },
          {
            "es": "lados de la garganta azul lavanda",
            "en": "lavender-blue sides of the throat"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Blue-cheeked_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_dufresniana",
          "uicn": "https://en.wikipedia.org/wiki/Blue-cheeked_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Blue-cheeked_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Blue-cheeked_amazon"
        },
        "catalogo": {
          "nombre": "Loro de mejillas azules",
          "uicn": "NT"
        },
        "nota": null
      },
      {
        "id": "farinosa",
        "piel": "farinosa",
        "cientifico": "Amazona farinosa",
        "comun": {
          "es": "loro corona azul",
          "en": "Mealy amazon"
        },
        "distribucion": {
          "es": "Centroamérica y Sudamérica tropicales.",
          "en": "Tropical Central and South America."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2022). Amazona farinosa. IUCN Red List 2022: e.T45430572A210109682",
          "url": "https://www.iucnredlist.org/species/45430572/210109682"
        },
        "rasgos": [
          {
            "es": "mayormente verde",
            "en": "mainly green"
          },
          {
            "es": "tono blanquecino «enharinado» en el dorso y la nuca",
            "en": "whitish 'floury' tinge on the back and nape"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Mealy_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_farinosa",
          "uicn": "https://en.wikipedia.org/wiki/Mealy_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Mealy_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Mealy_amazon"
        },
        "catalogo": {
          "nombre": "Loro harinoso",
          "uicn": "NT"
        },
        "nota": null
      },
      {
        "id": "festiva",
        "cientifico": "Amazona festiva",
        "comun": {
          "es": "loro de lomo rojo",
          "en": "Festive amazon"
        },
        "distribucion": {
          "es": "Brasil, Colombia, Ecuador, Bolivia, Guyana, Perú y Venezuela.",
          "en": "Brazil, Colombia, Ecuador, Bolivia, Guyana, Peru and Venezuela."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2022). Amazona festiva. IUCN Red List 2022: e.T22727626A209890756",
          "url": "https://www.iucnredlist.org/species/22727626/209890756"
        },
        "rasgos": [
          {
            "es": "rabadilla roja, visible al volar",
            "en": "red rump, seen in flight"
          },
          {
            "es": "alas exteriores azul intenso al volar",
            "en": "deep blue outer wings in flight"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Festive_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_festiva",
          "uicn": "https://en.wikipedia.org/wiki/Festive_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Festive_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Festive_amazon"
        },
        "catalogo": {
          "nombre": "Loro festivo",
          "uicn": "NT"
        },
        "nota": "El texto del artículo menciona VU en 2012; el infobox cita la evaluación 2022 (LC)."
      },
      {
        "id": "guatemalae",
        "piel": "guatemalae",
        "cientifico": "Amazona guatemalae",
        "comun": {
          "es": null,
          "en": "Northern mealy amazon"
        },
        "distribucion": {
          "es": "Centroamérica tropical.",
          "en": "Tropical Central America."
        },
        "uicn": {
          "categoria": "NT",
          "evaluacion": "BirdLife International (2020). Amazona guatemalae. IUCN Red List: e.T45430583A179386817",
          "url": "https://www.iucnredlist.org/species/45430583/179386817"
        },
        "rasgos": [
          {
            "es": "tono blanquecino en el dorso y la nuca",
            "en": "whitish tinge on the back and nape"
          },
          {
            "es": "espejo rojo en el ala, visible al volar",
            "en": "red speculum visible in flight"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Northern_mealy_amazon",
          "uicn": "https://en.wikipedia.org/wiki/Northern_mealy_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Northern_mealy_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Northern_mealy_amazon"
        },
        "catalogo": {
          "nombre": "Loro harinoso del norte",
          "uicn": "NT"
        },
        "nota": "Wikipedia la trata como subespecie (A. farinosa guatemalae), pero el infobox cita la evaluación UICN de A. guatemalae."
      },
      {
        "id": "kawalli",
        "piel": "kawalli",
        "cientifico": "Amazona kawalli",
        "comun": {
          "es": null,
          "en": "Kawall's amazon"
        },
        "distribucion": {
          "es": "Cuenca del Amazonas en Brasil (Amazonas y Pará).",
          "en": "Amazon basin of Brazil (Amazonas and Pará)."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2022). Amazona kawalli. IUCN Red List: e.T22686363A210148938",
          "url": "https://www.iucnredlist.org/species/22686363/210148938"
        },
        "rasgos": [
          {
            "es": "franja blanca estrecha en la base del pico",
            "en": "narrow white strip at the base of the bill"
          },
          {
            "es": "anillo ocular blanco estrecho",
            "en": "narrow white eye-ring"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Kawall%27s_amazon",
          "uicn": "https://en.wikipedia.org/wiki/Kawall%27s_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Kawall%27s_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Kawall%27s_amazon"
        },
        "catalogo": {
          "nombre": "Loro de Kawall",
          "uicn": "NT"
        },
        "nota": "es.wikipedia da «loro de garbes»: nombre dudoso, no se usa."
      },
      {
        "id": "leucocephala",
        "piel": "leucocephala",
        "cientifico": "Amazona leucocephala",
        "comun": {
          "es": "loro cubano",
          "en": "Cuban amazon"
        },
        "distribucion": {
          "es": "Cuba (incluida la Isla de la Juventud), Bahamas (Ábaco, Gran Inagua) e Islas Caimán.",
          "en": "Cuba (incl. Isla de la Juventud), the Bahamas (Abaco, Great Inagua) and the Cayman Islands."
        },
        "uicn": {
          "categoria": "NT",
          "evaluacion": "BirdLife International (2020). Amazona leucocephala. IUCN Red List 2020: e.T22686201A179212864",
          "url": "https://www.iucnredlist.org/species/22686201/179212864"
        },
        "rasgos": [
          {
            "es": "frente y anillo ocular blancos",
            "en": "white forehead and eye-ring"
          },
          {
            "es": "cara baja, barbilla y garganta rosadas",
            "en": "rosy pink lower face, chin and throat"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Cuban_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_leucocephala",
          "uicn": "https://en.wikipedia.org/wiki/Cuban_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Cuban_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Cuban_amazon"
        },
        "catalogo": {
          "nombre": "Loro cubano",
          "uicn": "NT"
        },
        "nota": null
      },
      {
        "id": "aestiva",
        "piel": "aestiva",
        "cientifico": "Amazona aestiva",
        "comun": {
          "es": "loro hablador",
          "en": "Blue-fronted amazon"
        },
        "distribucion": {
          "es": "Este y norte de Bolivia, este de Brasil, Paraguay y norte de Argentina.",
          "en": "Eastern and northern Bolivia, eastern Brazil, Paraguay and northern Argentina."
        },
        "uicn": {
          "categoria": "NT",
          "evaluacion": "BirdLife International (2019). Amazona aestiva. IUCN Red List 2019: e.T22686332A154573813",
          "url": "https://www.iucnredlist.org/species/22686332/154573813"
        },
        "rasgos": [
          {
            "es": "plumas azules en la frente, sobre el pico",
            "en": "blue feathers on the forehead above the beak"
          },
          {
            "es": "cara y corona amarillas",
            "en": "yellow face and crown"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Blue-fronted_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_aestiva",
          "uicn": "https://en.wikipedia.org/wiki/Blue-fronted_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Blue-fronted_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Blue-fronted_amazon"
        },
        "catalogo": {
          "nombre": "Loro hablador / frente azul",
          "uicn": "LC"
        },
        "nota": "es.wikipedia: «loro hablador» (Argentina), «loro frentiazul» o «amazona frentiazul»."
      },
      {
        "id": "albifrons",
        "cientifico": "Amazona albifrons",
        "comun": {
          "es": "loro frente blanca",
          "en": "White-fronted amazon"
        },
        "distribucion": {
          "es": "México y Centroamérica; introducida en Puerto Rico.",
          "en": "Mexico and Central America; introduced in Puerto Rico."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2018). Amazona albifrons. IUCN Red List 2018: e.T22686222A131918643",
          "url": "https://www.iucnredlist.org/species/22686222/131918643"
        },
        "rasgos": [
          {
            "es": "parche blanco brillante en la frente",
            "en": "bright white forehead patch"
          },
          {
            "es": "mayormente verde con azul en las alas abiertas",
            "en": "mostly green with blue on the spread wings"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/White-fronted_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_albifrons",
          "uicn": "https://en.wikipedia.org/wiki/White-fronted_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/White-fronted_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/White-fronted_amazon"
        },
        "catalogo": {
          "nombre": "Loro frentiblanco",
          "uicn": "LC"
        },
        "nota": null
      },
      {
        "id": "amazonica",
        "piel": "amazonica",
        "cientifico": "Amazona amazonica",
        "comun": {
          "es": "loro guaro",
          "en": "Orange-winged amazon"
        },
        "distribucion": {
          "es": "Sudamérica tropical, de Colombia y Trinidad y Tobago a Perú, Bolivia y el centro de Brasil; introducida en Puerto Rico y Tenerife.",
          "en": "Tropical South America from Colombia and Trinidad and Tobago to Peru, Bolivia and central Brazil; introduced in Puerto Rico and Tenerife."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2018). Amazona amazonica. IUCN Red List: e.T22686350A131920257",
          "url": "https://www.iucnredlist.org/species/22686350/131920257"
        },
        "rasgos": [
          {
            "es": "plumas azules y amarillas en la cabeza",
            "en": "blue and yellow head feathers"
          },
          {
            "es": "naranja en alas y cola, visible al volar",
            "en": "orange in the wings and tail, seen in flight"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Orange-winged_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_amazonica",
          "uicn": "https://en.wikipedia.org/wiki/Orange-winged_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Orange-winged_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Orange-winged_amazon"
        },
        "catalogo": {
          "nombre": "Loro alianaranjado",
          "uicn": "LC"
        },
        "nota": null
      },
      {
        "id": "autumnalis",
        "cientifico": "Amazona autumnalis",
        "comun": {
          "es": "loro de cachetes amarillos",
          "en": "Red-lored amazon"
        },
        "distribucion": {
          "es": "Del este de México por Centroamérica hasta Ecuador y el extremo noroeste de Venezuela.",
          "en": "Eastern Mexico through Central America to Ecuador and far northwestern Venezuela."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2018). Amazona autumnalis. IUCN Red List 2018: e.T22728292A132031668",
          "url": "https://www.iucnredlist.org/species/22728292/132031668"
        },
        "rasgos": [
          {
            "es": "frente roja",
            "en": "red forehead"
          },
          {
            "es": "corona azul",
            "en": "blue crown"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Red-lored_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_autumnalis",
          "uicn": "https://en.wikipedia.org/wiki/Red-lored_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Red-lored_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Red-lored_amazon"
        },
        "catalogo": {
          "nombre": "Loro cachete amarillo",
          "uicn": "LC"
        },
        "nota": null
      },
      {
        "id": "mercenarius",
        "piel": "mercenarius",
        "cientifico": "Amazona mercenarius",
        "comun": {
          "es": "loro mercenario",
          "en": "Scaly-naped amazon"
        },
        "distribucion": {
          "es": "Bolivia, Colombia, Ecuador, Perú y Venezuela.",
          "en": "Bolivia, Colombia, Ecuador, Peru and Venezuela."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2016). Amazona mercenarius. IUCN Red List 2016: e.T22686354A93108783",
          "url": "https://www.iucnredlist.org/species/22686354/93108783"
        },
        "rasgos": [
          {
            "es": "plumaje verde brillante",
            "en": "bright green plumage"
          },
          {
            "es": "ojos rojos con anillo ocular gris pálido",
            "en": "red eyes with a pale grey eye-ring"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Scaly-naped_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_mercenarius",
          "uicn": "https://en.wikipedia.org/wiki/Scaly-naped_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Scaly-naped_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Scaly-naped_amazon"
        },
        "catalogo": {
          "nombre": "Loro de nuca escamosa",
          "uicn": "LC"
        },
        "nota": null
      },
      {
        "id": "ochrocephala",
        "piel": "ochrocephala",
        "cientifico": "Amazona ochrocephala",
        "comun": {
          "es": "loro real amazónico",
          "en": "Yellow-crowned amazon"
        },
        "distribucion": {
          "es": "Cuenca del Amazonas y las Guayanas, noroeste de Sudamérica y Panamá; introducida en Gran Caimán, Puerto Rico y Stuttgart.",
          "en": "Amazon basin and the Guianas, northwestern South America and Panama; introduced on Grand Cayman, Puerto Rico and Stuttgart."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2018). Amazona ochrocephala. IUCN Red List: e.T22686346A131919991",
          "url": "https://www.iucnredlist.org/species/22686346/131919991"
        },
        "rasgos": [
          {
            "es": "plumaje mayormente verde",
            "en": "mostly green plumage"
          },
          {
            "es": "anillo ocular blanco",
            "en": "white eye-ring"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Yellow-crowned_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_ochrocephala",
          "uicn": "https://en.wikipedia.org/wiki/Yellow-crowned_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Yellow-crowned_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Yellow-crowned_amazon"
        },
        "catalogo": {
          "nombre": "Loro de corona amarilla",
          "uicn": "LC"
        },
        "nota": null
      },
      {
        "id": "xantholora",
        "piel": "xantholora",
        "cientifico": "Amazona xantholora",
        "comun": {
          "es": "loro yucateco",
          "en": "Yucatan amazon"
        },
        "distribucion": {
          "es": "Península de Yucatán: México (Quintana Roo, Yucatán, Campeche, Cozumel), Belice, Guatemala y Honduras.",
          "en": "Yucatán Peninsula: Mexico (Quintana Roo, Yucatán, Campeche, Cozumel), Belize, Guatemala and Honduras."
        },
        "uicn": {
          "categoria": "LC",
          "evaluacion": "BirdLife International (2021). Amazona xantholora. IUCN Red List 2021: e.T22686226A140710748",
          "url": "https://www.iucnredlist.org/species/22686226/140710748"
        },
        "rasgos": [
          {
            "es": "lores amarillo cromo (machos adultos)",
            "en": "chrome-yellow lores (adult males)"
          },
          {
            "es": "borde delantero del ala rojo",
            "en": "red leading edge of the wing"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Yucatan_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_xantholora",
          "uicn": "https://en.wikipedia.org/wiki/Yucatan_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Yucatan_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Yucatan_amazon"
        },
        "catalogo": {
          "nombre": "Loro yucateco",
          "uicn": "LC"
        },
        "nota": null
      }
    ],
    "extintas": [
      {
        "id": "martinicana",
        "cientifico": "Amazona martinicana",
        "comun": {
          "es": "loro de Martinica",
          "en": "Martinique amazon"
        },
        "distribucion": {
          "es": "Endémica de Martinica.",
          "en": "Endemic to Martinique."
        },
        "uicn": {
          "categoria": "EX",
          "evaluacion": "BirdLife International (2021). Amazona martinicana. IUCN Red List 2021: e.T22728705A194903850",
          "url": "https://www.iucnredlist.org/species/22728705/194903850"
        },
        "rasgos": [
          {
            "es": "cabeza color pizarra con un poco de rojo (Labat, 1742)",
            "en": "slate-coloured head with a little red (Labat, 1742)"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Martinique_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_martinicana",
          "uicn": "https://en.wikipedia.org/wiki/Martinique_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Martinique_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Martinique_amazon"
        },
        "catalogo": {
          "nombre": "Cotorra de Martinica",
          "uicn": "EX"
        },
        "nota": "Especie hipotética: se conoce solo por relatos antiguos, sin restos. Extinta hacia 1779."
      },
      {
        "id": "violacea",
        "cientifico": "Amazona violacea",
        "comun": {
          "es": "amazona de Guadalupe",
          "en": "Guadeloupe amazon"
        },
        "distribucion": {
          "es": "Guadalupe (Antillas Menores).",
          "en": "Guadeloupe (Lesser Antilles)."
        },
        "uicn": {
          "categoria": "EX",
          "evaluacion": "BirdLife International (2016). Amazona violacea. IUCN Red List 2016: e.T22728701A94994037",
          "url": "https://www.iucnredlist.org/species/22728701/94994037"
        },
        "rasgos": [
          {
            "es": "cabeza, cuello y partes inferiores violeta con algo de verde y negro (Du Tertre, 1654)",
            "en": "violet head, neck and underparts with some green and black (Du Tertre, 1654)"
          }
        ],
        "fuentes": {
          "comun_en": "https://en.wikipedia.org/wiki/Guadeloupe_amazon",
          "comun_es": "https://es.wikipedia.org/wiki/Amazona_violacea",
          "uicn": "https://en.wikipedia.org/wiki/Guadeloupe_amazon",
          "distribucion": "https://en.wikipedia.org/wiki/Guadeloupe_amazon",
          "rasgos": "https://en.wikipedia.org/wiki/Guadeloupe_amazon"
        },
        "catalogo": {
          "nombre": "Cotorra de Guadalupe",
          "uicn": "EX"
        },
        "nota": "Especie hipotética: se conoce solo por relatos antiguos. Extinta hacia 1779."
      }
    ]
  };
})();
