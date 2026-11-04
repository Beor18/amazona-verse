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
    'Kelvin 4-nov (K15 A): §10.2 aquí no se explica por qué hablan desde ahora. En el cap. 6 queda la insinuación, sin más.',
    'Kelvin 2-nov: §10.3 se llaman Mara (martinicana) y Vela (violacea); lo dicen ellas al final. Iguaca las nombra por la especie, con las fichas de especies.js.',
    'Kelvin 4-nov (K16 A): §10.4 recuerda a pedazos y al final dice «Eran dos. Las de las islas del sur.» Su forma ya está decidida (2-nov): cotorra mayor Amazona imperialis.',
    'Kelvin 4-nov (K22 A): la medalla es una de las 36 piezas; al tocarla le vuelve un recuerdo. Al final del cap. 6 se la da a Vittata.',
    'Kelvin 4-nov (K17 A): §10.6 las marcas son las cinco del diseño. No se dice quién construyó las ruinas.',
    'Kelvin 4-nov (K18 A): §10.7 la luz se enciende y no se explica.',
    'Kelvin 4-nov (K19 A): §10.8 no empiezan de consejeras: solo piden reunir a los que quedan.',
    'Kelvin 4-nov (K20 A): §10.9 las estaciones las atienden Iguaca y el aprendiz.',
    'Kelvin 4-nov (K21 A): §10.10 piden reunir a los que quedan del pacto de los 36.',
  ];
})();
