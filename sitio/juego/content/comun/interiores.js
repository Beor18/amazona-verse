/* CG-110 y CG-113 · datos de interiores. Solo se usan con ?interiores=1.
   casa: el bohío amueblado de Villa Raíz. cuerpo es el ancho que tiene que poder cruzar Vittata.
   QA-250: el prototipo «taller_tuerca» (CG-110, cuarto vacío con la puerta encima de Tuerca en el Puerto) ya no está: tapaba su
   charla. El Taller de Tuerca es el de la torre k300 (src/game/v18/taller_tuerca.js, CG-117). */
window.AV_INTERIORES = {
  v: 1,
  casa: { id: 'bohio_villa', cuerpo: 0.64, piezas: ['banco'] },
  edificios: [
    { id: 'bohio_villa', modo: 'sitio', nombre: 'Bohío de Villa Raíz',
      puerta: { x: 140, z: 175, r: 2.4 }, dentro: { x: 140, z: 173 }, fuera: { x: 140, z: 178 } },
  ],
};
