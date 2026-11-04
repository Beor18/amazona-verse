/* Episodio 5 · ruinas y memoria (EP5_MISIONES M2). Cinco marcas. Lo que no es canon va en notas, no en la frase. */
(function () {
  'use strict';
  const EP = window.AV_EP5 = window.AV_EP5 || {};
  // Mundo único (pack.js, MAPA_REAL): con el interruptor encendido, las ruinas en el mapa real. kit: false = la ruina es un
  // edificio de Kelvin (el pilar de piedra de la cornisa de Los Miradores) y no se pone la pieza del kit.
  const R = !!EP.mapaReal, EN = (relleno, mapa) => Object.assign(relleno, R ? mapa : {});
  EP.ruinas = [
    EN({ id: 'torre', nombre: 'la torre', x: 0, z: -18, marca: 'un número: 36', se: 'En la piedra está escrito 36.' }, { x: -50, z: -145 }),
    EN({ id: 'mirador', nombre: 'el mirador', x: 0, z: -28, marca: 'dos cotorras dibujadas', se: 'Hay dos cotorras dibujadas en la piedra.' }, { x: -63, z: -146 }),
    EN({ id: 'pilar', nombre: 'el pilar', x: 18, z: -6, marca: 'un camino de torres', se: 'La marca es un camino de torres.' }, { x: -59, z: -102, kit: false }),
    EN({ id: 'portal', nombre: 'el portal', x: -18, z: -14, marca: 'un fuego en lo alto', se: 'Hay un fuego dibujado en lo alto.' }, { x: -34, z: -147 }),
    EN({ id: 'altar', nombre: 'el altar', x: 12, z: 12, marca: 'una mano que pasa algo a otra', se: 'Una mano le pasa algo a otra mano.' }, { x: -30, z: -124 }),
  ];
  // Opción por defecto de EP5_GDD §10. El jugador no ve estos marcadores.
  EP.notasKelvin = [
    'Kelvin 2-nov: §10.1 dos voces distintas, cada una con su onda (dorada y violeta), que se unen al final en una sola; sin verse (que se vean sería arte nuevo). Los nombres están en §10.3.',
    '[KELVIN] §10.2 Por qué hablan desde ahora: aquí no se explica; D4 (DECIDIDO-EQUIPO 30-oct) deja una insinuación al final del ep. 6 y la explicación sigue guardada.',
    'Kelvin 2-nov: §10.3 se llaman Mara (martinicana) y Vela (violacea); lo dicen ellas al final. Iguaca las nombra por la especie, con las fichas de especies.js.',
    '[KELVIN] §10.4 Por qué olvida el Guardián: al final dice «Eran dos. Las de las islas del sur.» y no se explica el olvido. Kelvin 2-nov: su forma ya está decidida, una cotorra mayor Amazona imperialis.',
    'Kelvin 2-nov: la medalla es una de las 36 piezas del emblema; al final del cap. 6 el Guardián se la da a Vittata. [KELVIN] §10.5 si al tocarla le vuelve un recuerdo, y por qué, sigue abierto.',
    '[KELVIN] §10.6 Las marcas son las cinco del diseño (36, dos cotorras, camino, fuego, mano). No se dice quién construyó las ruinas.',
    '[KELVIN] §10.7 La luz de más allá de la niebla se enciende y no se explica.',
    '[KELVIN] §10.8 No empiezan de consejeras: solo piden reunir a los que quedan.',
    '[KELVIN] §10.9 Las estaciones las atienden Iguaca y el aprendiz. El episodio no depende de los capítulos 2, 3 ni 4.',
    '[KELVIN] §10.10 Piden reunir a los que quedan del pacto de los 36. Gancho al episodio 6.',
  ];
})();
