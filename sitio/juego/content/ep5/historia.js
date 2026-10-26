/* Episodio 5 · ruinas y memoria (EP5_MISIONES M2). Cinco marcas. Lo que no es canon va en notas, no en la frase. */
(function () {
  'use strict';
  const EP = window.AV_EP5 = window.AV_EP5 || {};
  EP.ruinas = [
    { id: 'torre', nombre: 'la torre', x: 0, z: -18, marca: 'un número: 36', se: 'En la piedra está escrito 36.' },
    { id: 'mirador', nombre: 'el mirador', x: 0, z: -28, marca: 'dos cotorras dibujadas', se: 'Hay dos cotorras dibujadas en la piedra.' },
    { id: 'pilar', nombre: 'el pilar', x: 18, z: -6, marca: 'un camino de torres', se: 'La marca es un camino de torres.' },
    { id: 'portal', nombre: 'el portal', x: -18, z: -14, marca: 'un fuego en lo alto', se: 'Hay un fuego dibujado en lo alto.' },
    { id: 'altar', nombre: 'el altar', x: 12, z: 12, marca: 'una mano que pasa algo a otra', se: 'Una mano le pasa algo a otra mano.' },
  ];
  // Opción por defecto de EP5_GDD §10. El jugador no ve estos marcadores.
  EP.notasKelvin = [
    '[KELVIN] §10.1 Cómo se presentan: dos voces distintas, retrato neutro de dos ondas, sin verse y sin nombres propios.',
    '[KELVIN] §10.2 Por qué hablan desde ahora: no se explica; se guarda para más adelante.',
    '[KELVIN] §10.3 No tienen nombre propio aquí. Iguaca las nombra por la especie, con las fichas de especies.js.',
    '[KELVIN] §10.4 El Guardián recuerda a pedazos y, al final, un recuerdo: «Eran dos. Las de las islas del sur.» No se explica por qué olvida ni qué forma tiene.',
    '[KELVIN] §10.5 Toca la medalla y no se explica.',
    '[KELVIN] §10.6 Las marcas son las cinco del diseño (36, dos cotorras, camino, fuego, mano). No se dice quién construyó las ruinas.',
    '[KELVIN] §10.7 La luz de más allá de la niebla se enciende y no se explica.',
    '[KELVIN] §10.8 No empiezan de consejeras: solo piden reunir a los que quedan.',
    '[KELVIN] §10.9 Las estaciones las atienden Iguaca y el aprendiz. El episodio no depende de los capítulos 2, 3 ni 4.',
    '[KELVIN] §10.10 Piden reunir a los que quedan del pacto de los 36. Gancho al episodio 6.',
  ];
})();
