/* CG-118 · medidas y piezas de la casita. Sin textos educativos.
   La fachada es casa_paja_a (edificios): no se cambia. dim sale del mapa.
   Los datos con fuente están en docs/equipo/PROPUESTA_CG118_TEXTOS.md. */
window.AV_CASITA = {
  id: 'casa_paja_a_1',
  modelo: 'assets/models/edificios/casa_paja_a.glb',
  puerta: { x: -104, z: 138, r: 4 },
  fuera: { x: -99.2, z: 138 },
  cuarto: { x: 480, y: 40, z: 480 },
  fachada: { ancho: 8.3, alto: 5.27, fondo: 8.49 },
  ancho: 6.4,
  fondo: 4.8,
  alto: 2.4,
  cumbrera: 3.6,
  vano: 0.86,
  piso: 0.45,
  piezas: ['piso', 'pared', 'techo', 'vano', 'banco', 'hamaca', 'olla', 'fogon']
};
