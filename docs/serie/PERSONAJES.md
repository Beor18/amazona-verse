# Serie · Personajes (S1)

Fichas cortas para la serie animada. Cada personaje tiene 4 imágenes en `docs/serie/personajes/<id>/`: `frente`, `lado`, `tres_cuartos` y `accion`. Salen de su `.glb` del repo, sobre fondo neutro.

Lo que dicen y quieren sale de `content/comun/personajes_v18.js`, `docs/STORY_BIBLE.md` y `docs/CANON_REGISTRY.md`. Los nombres «el Constructor» y «la Ingeniera» siguen siendo **provisionales**: los decide Kelvin.

> **Cómo se hicieron las imágenes.** Script: `docs/serie/herramientas/render_personajes.mjs`, con Three.js en Chrome sin pantalla.
> - **Vittata:** se usa su Idle tal cual y Celebrate para la acción. No se tocó nada.
> - **Los muñecos de piezas** (Ingeniera, Tuerca, Chispa, Moon, Constructor, Guardián): sus `.glb` traen las rotaciones de la animación repetidas en cada pieza y perdieron la altura de la cabeza y los hombros. Por eso se dibujan en su pose de reposo, con esas alturas recolocadas solo para la foto. La acción es un brazo arriba. **Los `.glb` no se cambiaron.**
> - **Nota para el equipo del juego:** el problema de las rotaciones repetidas puede afectar también a cómo se ven en el juego. Conviene revisarlo; no es parte de esta tarea.

| id | Nombre | Papel en la serie | Imágenes |
|---|---|---|---|
| `vittata` | Vittata | Protagonista | `personajes/vittata/` |
| `ingeniera` | La Ingeniera (provisional) | Aliada | `personajes/ingeniera/` |
| `constructor` | El Constructor (provisional) | Antagonista que cambia | `personajes/constructor/` |
| `tuerca` | Tuerca | Antagonista secundario que cambia | `personajes/tuerca/` |
| `maquina_puerto` | La perforadora de Tuerca | Objeto o personaje cómico | `personajes/maquina_puerto/` |
| `chispa` | Chispa | Rival cómico | `personajes/chispa/` |
| `maestro_moon` | Maestro Moon | Mentor | `personajes/maestro_moon/` |
| `guardian_vuelo` | Guardián del Primer Vuelo | Mentor de vuelo | `personajes/guardian_vuelo/` |

---

## Vittata (CONFIRMADO)
- **Aspecto:** cotorra puertorriqueña verde lima, con la frente roja y un pico amarillo grande y curvo. Ojos azules muy expresivos, cuerpo redondo y patas amarillas. Su modelo y su rig no se cambian.
- **Personalidad:** inventora, constructora y líder. Es joven, intensa y valiente. Su defecto es querer hacerlo todo sola (Kelvin: «Vittata puede ser como yo»).
- **Cómo habla:** rápido y con energía. Primero actúa y luego piensa. Cuando aprende, lo dice sin vergüenza.
- **Qué quiere:** salvar su isla después de la Gran Ruptura. En la temporada 1 aprende que su fuerza está en ayudar a que los demás trabajen juntos (Iguaca y los 36).

## La Ingeniera (nombre provisional)
- **Aspecto:** chica humana de estilo muñeco de vinilo, con cabeza cuadrada y dos moños oscuros. Lleva chaqueta naranja, mochila turquesa, cinturón de herramientas, guantes, vaqueros y botas azules. En el juego cambia de color según la etapa: aprendiz, rescate (rojo) y jefa de obra (turquesa).
- **Personalidad:** cuidadosa y metódica. Es la que dice «mira antes de tocar». Trabaja en equipo y crece de aprendiz a jefa de obra.
- **Cómo habla:** directa y animada. Celebra lo que se hizo «juntas»: «¡Mira la escalera! La hicimos juntas, tabla por tabla».
- **Qué quiere:** construir bien y para todos. Es la socia natural de Vittata en las obras.

## El Constructor (nombre provisional)
- **Aspecto:** hombre de estilo muñeco de vinilo, con casco amarillo y chaleco naranja de bandas claras sobre una camisa gris azulada. Lleva pantalón verde oliva, botas marrones y una mochila de herramientas.
- **Personalidad:** al principio solo le importa terminar la obra a tiempo, aunque desplace a las cotorras. No es un villano caricaturesco: aprende y cambia, con causa.
- **Cómo habla:** fanfarrón al principio: «¿Las cotorras? Se mudan un ratito y ya. ¡Esta obra no se para!». Al final: «Ahora pregunto primero. ¡Y construyo mejor!».
- **Qué quiere:** al principio, progreso rápido. Al final, que lo que construye sea bueno para todos. Su arco es el tema de vivienda y desplazamiento.

## Tuerca
- **Aspecto:** inventor mayor con capucha turquesa y gafas redondas, mono azul marino, delantal de cuero marrón, guantes amarillos y botas.
- **Personalidad:** genio orgulloso de sus máquinas. Sus inventos causan problemas sin querer. Cree que toda máquina merece una segunda vida.
- **Cómo habla:** técnico y un poco presumido, con humor: «Mi perforadora hace escalones sola… cuando no se traga una tuerca».
- **Qué quiere:** que reconozcan sus inventos. Al final aprende a inventar con amigos: «¡Sale todo mejor!».

## La perforadora de Tuerca (`maquina_puerto`)
- **Aspecto:** máquina de orugas verde y gris, con taladro y engranaje gigante, chimenea de humo y una antena con luz.
- **Papel:** sirve para chistes visuales. Tapa caminos en el puerto y después se reconvierte para regar flores. Sin diálogo.

## Chispa
- **Aspecto:** perro shiba piloto. Cara naranja y blanca, lengua afuera, orejas grandes y gafas de piloto naranjas con cristales azules. Traje de piloto azul marino con rodilleras y cola esponjosa. Mide 1,25 m.
- **Personalidad:** rival amistoso, veloz y presumido. Siempre reta a carreras. Es el alivio cómico.
- **Cómo habla:** llama «plumitas» a las cotorras: «¡Hola, plumitas! Soy Chispa, la más veloz de los Portales. ¿Una carrerita?».
- **Qué quiere:** ganar y ser el más rápido. En la serie, ganarse el respeto de Vittata.

## Maestro Moon
- **Aspecto:** gato blanco de cabeza cuadrada grande, con bigotes y una banda dorada con luna creciente en la frente. Viste kimono y hakama azul con faja dorada. No lleva armas (directiva V18.3).
- **Personalidad:** mentor sereno de precisión y estrategia. Enseña la esquiva paso a paso.
- **Cómo habla:** calmado y amable, con frases de maestro: «Bienvenida a mi claro, pequeña cotorra… aquí se entrena la esquiva, paso a paso».
- **Qué quiere:** que sus alumnos aprendan a moverse con calma y cabeza.

## Guardián del Primer Vuelo
- **Aspecto:** cotorra verde de otra especie (no vittata), con traje de piloto gris azulado. Lleva gafas de vuelo en la frente y tiene el pico oscuro.
- **Personalidad:** mentor de vuelo, veterano y orgulloso de sus alumnos.
- **Cómo habla:** amistoso y con aire de leyenda: «De mí aprendieron a volar hasta las nubes viejas».
- **Qué quiere:** que las nuevas alas vuelen bien.
- **Nota de canon:** no confundir con *el Guardián* (la cotorra mayor *A. imperialis*, aprobada el 2-nov). Hay que decidir si los dos conviven en la serie. **Decide Kelvin.**

---

## Fuera de este paquete
- **Iguaca, la Abuela y el Papá** son *A. vittata* y todavía no tienen modelo propio. Sus propuestas van en la fase S4.
- **Las cotorras cosplay, los templos y los árboles comprados** no se usan en la serie (regla 4 de la tarea).
