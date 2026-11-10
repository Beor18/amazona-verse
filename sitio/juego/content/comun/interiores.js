/* CG-110 y CG-113 · datos de interiores. Solo se usan con ?interiores=1.
   casa: el bohío amueblado de Villa Raíz. cuerpo es el ancho que tiene que poder cruzar Vittata. */
window.AV_INTERIORES = {
  v: 1,
  casa: { id: 'bohio_villa', cuerpo: 0.64, piezas: ['banco'] },
  edificios: [
    { id: 'bohio_villa', modo: 'sitio', nombre: 'Bohío de Villa Raíz',
      puerta: { x: 140, z: 175, r: 2.4 }, dentro: { x: 140, z: 173 }, fuera: { x: 140, z: 178 } },
    { id: 'taller_tuerca', modo: 'transicion', nombre: 'Taller de Tuerca',
      puerta: { x: -66.4, z: 70.6, r: 2.4 }, cuarto: { x: 8, z: 8, y: 40 }, fuera: { x: -64, z: 72 } },
  ],
};
