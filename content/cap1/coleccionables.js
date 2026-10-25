/* Content pack cap1 · Diario de Campo Boricua (GDD_CAP1 §4) y ropa desbloqueable (§5)
   12 hallazgos por proximidad. Textos pendientes de validar con una fuente cultural.
   Cada entrada trae su silueta hecha con primitivas: modelo(add, S1), donde add(geo, color, x, y, z, sx?, sy?, sz?) y S1 es una esfera unitaria. */
(function () {
  'use strict';
  // Los modelos se llaman al construir el mundo, cuando THREE ya está cargado
  AVE.registerPack({
    id: 'cap1',
    diario: {
      titulo: 'Diario de Campo Boricua', corto: 'Diario de Campo', boton: 'Diario',
      categorias: {
        fauna: { nombre: 'Fauna', desconocido: 'Un animal', sonido: 'pickup', rafaga: 'feathers' },
        cultura: { nombre: 'Cultura', desconocido: 'Algo de nuestra cultura', sonido: 'guiro', rafaga: 'stars' },
      },
      entradas: [
        { id: 'coqui', cat: 'fauna', nombre: 'Coquí común', x: -17, z: 1, texto: 'Ranita que solo vive en Puerto Rico. De noche, el macho canta "co-quí".',
          modelo: (add, S1) => { add(S1, '#b0773a', 0, 0.12, 0, 0.14, 0.11, 0.17); add(S1, '#1b1b1b', 0.06, 0.2, 0.1, 0.035, 0.035, 0.035); add(S1, '#1b1b1b', -0.06, 0.2, 0.1, 0.035, 0.035, 0.035); } },
        { id: 'sanpedrito', cat: 'fauna', nombre: 'San Pedrito', x: -4, z: -21, texto: 'Ave diminuta, verde y con garganta roja. Anida en túneles que cava en la tierra.',
          modelo: (add, S1) => { add(S1, '#3fae4a', 0, 0.2, 0, 0.12, 0.12, 0.15); add(S1, '#d6403a', 0, 0.16, 0.11, 0.06, 0.05, 0.04); add(new THREE.ConeGeometry(0.03, 0.16, 6), '#d6403a', 0, 0.24, 0.2).rotation.x = Math.PI / 2; } },
        { id: 'reinita', cat: 'fauna', nombre: 'Reinita mariposera', x: -33, z: 8, texto: 'Ave de Puerto Rico que vive en los bosques de montaña. Hay muy pocas.',
          modelo: (add, S1) => { add(S1, '#2b2b2b', 0, 0.22, 0, 0.11, 0.11, 0.15); add(S1, '#f4f4f0', 0, 0.2, 0.1, 0.07, 0.07, 0.04); add(new THREE.ConeGeometry(0.08, 0.2, 6), '#2b2b2b', 0, 0.2, -0.18).rotation.x = -Math.PI / 2; } },
        { id: 'dajao', cat: 'fauna', nombre: 'Dajao', x: 29, z: -5, r: 2.6, agua: true, texto: 'Pez de nuestros ríos. Nada contra la corriente hasta la montaña.',
          modelo: (add, S1) => { add(S1, '#b8c6cc', 0, 0, 0, 0.12, 0.13, 0.35); add(new THREE.ConeGeometry(0.14, 0.2, 6), '#8fa3ab', 0, 0, -0.42).rotation.x = Math.PI / 2; } },
        { id: 'jicotea', cat: 'fauna', nombre: 'Jicotea', x: 21, z: -21, texto: 'Tortuga de agua dulce de Puerto Rico. Toma sol en las orillas.',
          modelo: (add, S1) => { add(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#4f6f2f', 0, 0, 0); add(S1, '#7a9a3a', 0, 0.08, 0.33, 0.09, 0.08, 0.1); } },
        { id: 'manati', cat: 'fauna', nombre: 'Manatí', x: 30, z: 42, r: 3.5, agua: true, hundir: 0.25, chispa: 1.6, texto: 'Mamífero grande y tranquilo que come hierbas del agua. Está protegido.',
          modelo: (add, S1) => { add(S1, '#7f8a8f', 0, 0, 0, 0.8, 0.55, 1.6); add(new THREE.ConeGeometry(0.5, 0.6, 8), '#6f7a7f', 0, 0, -1.9).rotation.x = -Math.PI / 2; } },
        { id: 'maraca', cat: 'cultura', nombre: 'Maraca', x: 0, z: 5, texto: 'Instrumento de origen taíno: una higüera seca con semillas adentro.',
          modelo: (add, S1) => { add(S1, '#d6403a', 0, 0.42, 0, 0.14, 0.17, 0.14); add(new THREE.CylinderGeometry(0.03, 0.035, 0.3, 8), '#8a6a3a', 0, 0.15, 0); } },
        { id: 'guiro', cat: 'cultura', nombre: 'Güiro', x: 14, z: 3, texto: 'Calabaza con rayas que se raspa con un pincho. Suena en la música jíbara.',
          modelo: (add, S1) => { const b = add(S1, '#c9a04a', 0, 0.3, 0, 0.14, 0.14, 0.42); b.rotation.x = 0.2; for (let i = -2; i <= 2; i++) add(new THREE.TorusGeometry(0.14, 0.012, 4, 16), '#7a5634', 0, 0.3, i * 0.1); } },
        { id: 'cuatro', cat: 'cultura', nombre: 'Cuatro', x: -5, z: -13, texto: 'Guitarra pequeña de diez cuerdas. Es el instrumento nacional de Puerto Rico.',
          modelo: (add, S1) => { add(S1, '#a8743f', 0, 0.3, 0, 0.26, 0.3, 0.07); add(new THREE.BoxGeometry(0.07, 0.5, 0.04), '#5a3a22', 0, 0.78, 0); add(new THREE.CircleGeometry(0.07, 12), '#2b1a0a', 0, 0.36, 0.075); } },
        { id: 'petroglifo', cat: 'cultura', nombre: 'Petroglifo taíno', x: -14, z: 27, texto: 'Dibujo tallado en piedra por los taínos, como los de Caguana en Utuado.',
          modelo: add => { const r = add(new THREE.DodecahedronGeometry(0.55, 0), '#8f8a80', 0, 0.3, 0, 1, 0.6, 1); r.rotation.y = 0.5; add(new THREE.TorusGeometry(0.16, 0.025, 4, 18), '#4a4640', 0, 0.48, 0.42); } },
        { id: 'vejigante', cat: 'cultura', nombre: 'Máscara de vejigante', x: 8, z: -21, texto: 'Careta con cuernos de las fiestas de Loíza y del carnaval de Ponce.',
          modelo: (add, S1) => { add(S1, '#d6403a', 0, 0.45, 0, 0.26, 0.28, 0.2); for (const [x, rz] of [[-0.14, 0.5], [0, 0], [0.14, -0.5]]) add(new THREE.ConeGeometry(0.05, 0.28, 6), '#ffd84a', x, 0.78, 0).rotation.z = rz; add(S1, '#1b1b1b', 0.08, 0.5, 0.17, 0.04, 0.04, 0.03); add(S1, '#1b1b1b', -0.08, 0.5, 0.17, 0.04, 0.04, 0.03); } },
        { id: 'pava', cat: 'cultura', nombre: 'Pava jíbara', x: -25, z: 29, texto: 'Sombrero de paja del jíbaro, el campesino de la montaña.',
          modelo: add => { add(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 24), '#d9b56a', 0, 0.3, 0); add(new THREE.ConeGeometry(0.2, 0.22, 16), '#d9b56a', 0, 0.42, 0); add(new THREE.CylinderGeometry(0.19, 0.2, 0.05, 16, 1, true), '#d6403a', 0, 0.35, 0); } },
      ],
      // Hitos del Diario (en este orden): dan la ropa de pack.ropa con el mismo hito
      hitos: [{ id: 'fauna4', cat: 'fauna', min: 4 }, { id: 'cultura4', cat: 'cultura', min: 4 }, { id: 'all12', todos: true }],
    },
    // Ropa que se desbloquea al progresar (ids de src/personaje/wardrobe.js). clave: pieza entera, pieza:estilo o pieza:color.
    ropa: [
      { clave: 'botas', hito: 'm1', nombre: 'Botas azules', pista: 'la misión del río', viste: { slot: 'feet', id: 'botas', color: '#3d8fb0', style: 'aventura' } },
      { clave: 'pava', hito: 'm2', nombre: 'Pava jíbara', pista: 'los 7 anillos', viste: { slot: 'head', id: 'pava', color: '#d6403a' } },
      { clave: 'camisa:guayabera', hito: 'm3', nombre: 'Camisa guayabera', pista: 'el coro de coquíes', viste: { slot: 'torso', id: 'camisa', color: '#f4f4f0', style: 'guayabera' } },
      { clave: 'gorra:pr', hito: 'fauna4', nombre: 'Gorra de la bandera', pista: '4 animales del Diario', viste: { slot: 'head', id: 'gorra', color: '#d6403a', style: 'pr' } },
      { clave: 'mano:maracas', hito: 'cultura4', nombre: 'Maracas', pista: '4 objetos de cultura del Diario', viste: { slot: 'hand', id: 'mano', color: '#d6403a', style: 'maracas' } },
      { clave: 'camisa:deportiva', hito: 'all12', nombre: 'Camisa Deportiva 787', pista: 'el Diario completo', viste: { slot: 'torso', id: 'camisa', color: '#d6403a', style: 'deportiva' } },
      { clave: 'lentes:#c9a227', hito: 'all12', nombre: 'Lentes dorados', pista: 'el Diario completo', viste: { slot: 'eyes', id: 'lentes', color: '#c9a227', style: 'sol' } },
    ],
  });
})();
