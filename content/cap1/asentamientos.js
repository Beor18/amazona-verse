/* Content pack cap1 · los 14 asentamientos de la escena de Kelvin con nombre propio (MAPA_PLAN_COMPLETO § 5, F0.1, F2.4 y F2.5)
   Un solo archivo para cambiar los nombres: [KELVIN] K2 los aprueba, los cambia o da los suyos. Mientras, son la propuesta del plan.
   Los ids son los grupos de assets/data/mapa_cap1.js (zonasEdificios y pois) y no cambian.
   - nombre / en: rótulo «Bienvenido a …» al llegar, aviso «Descubriste», mapa grande y minimapa.
   - diario / diarioEn: una línea por asentamiento en el Diario («Lugares de la isla»): quién vive aquí o qué pasa ahí. Es ficción
     del juego (TEMPORADA1_HILO.md), no dato educativo.
   - glifo: 'piedra' (ciudades de piedra antigua, kit Ancient) o 'madera' (aldeas de bohíos, kit Savage).
   No va en la descarga inicial: lo pide src/game/lugares.js en el primer gesto del jugador (pack.asentamientos). */
window.AV_ASENTAMIENTOS_CAP1 = [
  { id: 'kelvin_aldea_rio_este', glifo: 'madera', nombre: 'Villa Raíz · la Empalizada', en: 'Villa Raíz · the Stockade',
    diario: 'Aquí empieza todo: el refugio, las casas de bohío y la gente de Villa Raíz que reconstruye después de la tormenta.',
    diarioEn: 'Where it all begins: the shelter, the bohío houses and the people of Villa Raíz rebuilding after the storm.' },
  { id: 'kelvin_aldea_rio_este_3', glifo: 'madera', nombre: 'Los Portales del Río', en: 'The River Gateways',
    diario: 'Seis puentes de madera y nueve portales cruzan los meandros. Quien quiera pasar al otro lado, pasa por aquí.',
    diarioEn: 'Six wooden bridges and nine gateways cross the river bends. Anyone going to the other side passes through here.' },
  { id: 'kelvin_aldea_meandros', glifo: 'madera', nombre: 'Caney del Meandro', en: 'Meander Caney',
    diario: 'El gran caney redondo de la península: aquí se reúne la gente cuando hay algo que decidir entre todos.',
    diarioEn: 'The great round caney on the peninsula: people gather here when there is something to decide together.' },
  { id: 'kelvin_aldea_rio_oeste', glifo: 'madera', nombre: 'Embarcadero de las Canoas', en: 'Canoe Landing',
    diario: 'Canoas en la orilla y murallas que vigilan el río: de aquí salen los que se atreven más allá de la bahía.',
    diarioEn: 'Canoes on the bank and walls watching the river: those who dare go beyond the bay set out from here.' },
  { id: 'kelvin_aldea_rio_este_2', glifo: 'piedra', nombre: 'La Otra Orilla · Mesa del Este', en: 'The Far Shore · East Mesa',
    diario: 'Piedra antigua en lo alto y bohíos al pie, al otro lado del río y abierta al mar: aquí vive otra comunidad.',
    diarioEn: 'Ancient stone up top and bohíos below, across the river and open to the sea: another community lives here.' },
  { id: 'kelvin_aldea_lomas', glifo: 'madera', nombre: 'Atalayas del Oeste', en: 'Western Watchtowers',
    diario: 'Once torres vigía entre muros de roca. Desde arriba se ve casi toda la isla.',
    diarioEn: 'Eleven watchtowers among rock walls. From the top you can see almost the whole island.' },
  { id: 'kelvin_aldea_mina_2', glifo: 'madera', nombre: 'Los Monumentos', en: 'The Monuments',
    diario: 'Cuatro monumentos de piedra junto al río. Nadie recuerda quién los levantó.',
    diarioEn: 'Four stone monuments by the river. No one remembers who raised them.' },
  { id: 'kelvin_aldea_mina', glifo: 'madera', nombre: 'Puerto de La Mina', en: 'La Mina Harbor',
    diario: 'Bohíos y canoas en el embarcadero del norte, entre tres torres antiguas que ya estaban aquí antes que nadie.',
    diarioEn: 'Bohíos and canoes at the northern landing, among three ancient towers that were here before anyone.' },
  { id: 'kelvin_ruinas_yunque', glifo: 'piedra', nombre: 'Ciudad de los 36', en: 'City of the 36',
    diario: 'La gran ciudad de torres en lo alto de El Yunque. Hay un círculo de piedra con muchos asientos, todos vacíos.',
    diarioEn: 'The great city of towers high on El Yunque. There is a stone circle with many seats, all of them empty.' },
  { id: 'kelvin_ruinas_yunque_2', glifo: 'piedra', nombre: 'Los Miradores', en: 'The Lookouts',
    diario: 'Siete miradores de piedra sobre el promontorio. Dicen que desde aquí, de noche, se ven luces más allá de la niebla.',
    diarioEn: 'Seven stone lookouts on the headland. They say that from here, at night, you can see lights beyond the fog.' },
  { id: 'kelvin_aldea_yunque', glifo: 'madera', nombre: 'Puerta del Yunque', en: 'El Yunque Gate',
    diario: 'Murallas y torres al pie de la montaña: por esta puerta sube el camino a la cumbre.',
    diarioEn: 'Walls and towers at the foot of the mountain: the path to the summit goes up through this gate.' },
  { id: 'kelvin_aldea_meandros_2', glifo: 'madera', nombre: 'Ladera de los Cuatro', en: 'Slope of the Four',
    diario: 'Cuatro piedras grandes y unas carpas en la ladera norte: un buen sitio para acampar si vienes de lejos.',
    diarioEn: 'Four big stones and a few tents on the north slope: a good place to camp if you come from far away.' },
  { id: 'kelvin_aldea_colina', glifo: 'piedra', nombre: 'Templos de la Colina', en: 'Hill Temples',
    diario: 'Doce templos antiguos con sus losas en la colina del sur. Se ven desde el mirador Yokahú.',
    diarioEn: 'Twelve ancient temples and their stone slabs on the southern hill. You can see them from the Yokahú lookout.' },
  { id: 'kelvin_aldea_rio_oeste_2', glifo: 'madera', nombre: 'Campamento de los Toldos', en: 'Awning Camp',
    diario: 'Trece toldos pequeños entre los árboles: un campamento para quien todavía no tiene casa.',
    diarioEn: 'Thirteen small awnings among the trees: a camp for those who do not have a house yet.' },
];
