/* Amazona Verse · V18.3 · personajes históricos del mundo abierto (datos de src/game/v18/npc.js; docs/equipo/V18_3_DISENO.md §1).
   Solo datos: el sistema (npc.js) no lleva ningún personaje dentro. La fase 5 (Tuerca, Chispa, Maestro Moon, Piloto Cotorra)
   añade filas aquí sin tocar código.
   Fila = { id, nombre {es,en}, rol, modelo (ruta literal del .glb, para que la build lo conserve), script (_glb.js), b64 (clave en
   window.AV_PERSONAJES_B64), respaldo (id de otra fila cuyo modelo se usa mientras falte el propio), provisional, alto (escala sobre
   la del .glb), retrato (ruta) o insignia ({ fondo, icono }) si aún no hay retrato, anim { idle, hablar, trabajar, senalar }
   (nombres de las acciones del .glb), mallas (grupos de mallas que se encienden y apagan), accesorios (piezas simples por
   instancia: casco, chaleco…, en el espacio del modelo), apariencias { nombre: { mallas, colores { MATERIAL: '#hex' }, accesorios } },
   estados [orden narrativo; el primero es el de partida], transiciones { de: { a: true } } (solo hacia delante; nunca se cambia de
   bando sin una causa en la misión: directiva V18.3 §8), porEstado { estado: { apariencia, anim, dialogo: [texto…] } }.
   Un modelo, varias apariencias (§8): nada de modelos nuevos por estado.
   Nombres en pantalla: «el Constructor» y «la Ingeniera» (provisionales; los definitivos los decide Kelvin, V18_3_AUDITORIA §0.4).
   El inglés de cada texto está en content/cap1/en.js. */
window.AV_NPC_V18 = [
  {
    id: 'ingeniera', nombre: { es: 'La Ingeniera', en: 'The Engineer' }, rol: 'aliada',
    // BM160 (Mac, 5-nov): modelo propio, colores lisos, sin foto ni marcas; mallas rígidas animadas por nodos (sin skin)
    modelo: 'assets/models/personajes/ingeniera.glb', script: 'assets/models/personajes/ingeniera_glb.js', b64: 'ingeniera',
    alto: 1, retrato: 'assets/retratos/v18/ingeniera.jpg',
    anim: { idle: 'Idle', hablar: 'Hablar', trabajar: 'Reparar', senalar: 'Hablar' },
    mallas: { Guantes: ['GuanteL', 'GuanteR'] },
    accesorios: {
      insignia: { hueso: null, forma: 'insignia', color: '#ffd84a', pos: [0.95, 5.3, 1.5] }
    },
    apariencias: {
      // De aprendiz: mono claro, guantes y cinturón (variante «aprendiz» del .glb), sin chaqueta ni mochila
      aprendiz: { mallas: { Chaqueta: false, Mochila: false, Cinturon: true, Guantes: true }, colores: { MONO: '#6f8fa8', GUANTES: '#c98a3c' }, accesorios: [] },
      // Responsable de la reconstrucción: chaqueta, cinturón, mochila y guantes (variante «ingeniera») e insignia dorada
      responsable: { mallas: { Chaqueta: true, Mochila: true, Cinturon: true, Guantes: true }, colores: { MONO: '#1f3550', CHAQUETA: '#e8622a', GUANTES: '#7a4a1e' }, accesorios: ['insignia'] }
    },
    estados: ['aprendiz', 'responsable'],
    transiciones: { aprendiz: { responsable: true } },
    porEstado: {
      aprendiz: { apariencia: 'aprendiz', anim: 'idle', dialogo: ['Esa máquina no debería estar ahí. Vamos a mirar bien antes de tocar nada.'] },
      responsable: { apariencia: 'responsable', anim: 'idle', dialogo: ['¡Mira la escalera! La hicimos juntas, tabla por tabla.', 'Ahora la máquina riega flores en vez de tapar caminos.'] }
    }
  },
  {
    id: 'constructor', nombre: { es: 'El Constructor', en: 'The Builder' }, rol: 'antagonista',
    // BM159 todavía no llegó: mientras tanto usa el modelo de la Ingeniera (respaldo) con otra paleta, sin pelo, con casco y chaleco
    // de piezas simples, y algo más alto. Cuando exista constructor.glb basta con poner aquí su modelo/script/b64 y quitar
    // respaldo y provisional: el código no cambia. No se pide un archivo que no existe (un 404 es un error de consola).
    modelo: null, script: null, b64: null, respaldo: 'ingeniera', provisional: true,
    alto: 1.08, insignia: { fondo: '#3b4250', icono: 'casco', color: '#ffd23a' },
    anim: { idle: 'Idle', hablar: 'Hablar', trabajar: 'Reparar', senalar: 'Hablar' },
    mallas: { Guantes: ['GuanteL', 'GuanteR'] },
    accesorios: {
      casco: { hueso: 'Cabeza', forma: 'casco', color: '#ffd23a', pos: [0, 3.25, 0] },
      franja: { hueso: 'Cabeza', forma: 'franja', color: '#3fae5a', pos: [0, 3.25, 0] },
      chaleco: { hueso: null, forma: 'chaleco', color: '#ff7a1a', pos: [0, 4.55, 0.3] }
    },
    apariencias: {
      // Supervisor industrial: casco amarillo, chaleco naranja de bandas, ropa gris oscura, nada de herramientas
      supervisor: { mallas: { Pelo: false, Chaqueta: false, Mochila: false, Cinturon: false, Guantes: false }, colores: { MONO: '#3d4148' }, accesorios: ['casco', 'chaleco'] },
      // El que empieza a reparar: sin chaleco, con mochila de herramientas, cinturón y guantes, ropa cálida y franja verde en el casco
      reparador: { mallas: { Pelo: false, Chaqueta: false, Mochila: true, Cinturon: true, Guantes: true }, colores: { MONO: '#7a5a3a', MOCHILA: '#4f6b2f', GUANTES: '#c98a3c' }, accesorios: ['casco', 'franja'] }
    },
    estados: ['supervisor', 'reparador'],
    transiciones: { supervisor: { reparador: true } },
    porEstado: {
      supervisor: { apariencia: 'supervisor', anim: 'hablar', dialogo: ['¿Las cotorras? Se mudan un ratito y ya. ¡Esta obra no se para!'] },
      reparador: { apariencia: 'reparador', anim: 'trabajar', dialogo: ['Construir rápido no es construir bien… Esta vez miré primero quién vive aquí.'] }
    }
  }
];
