# Lista «terminado» (14-nov-2026)

Sale de un recorrido real del juego publicado como lo jugaría un niño, en teléfono (390×844) y escritorio, con capturas.
**Veredicto:** el juego funciona de principio a fin. El capítulo 1 se completa con el pulgar, los capítulos 2 a 6 se pueden jugar enteros y no hay errores. Lo que falla es la presentación: sobran cosas a medias a la vista.

**Congelado de funciones:** hasta cerrar esta lista no entra ningún modo ni función nueva. Solo se arregla, se pule o se esconde lo que está a medias.

## Definición de «terminado»
- (a) En la portada solo hay modos que se pueden jugar hasta el final, y de todos se sale con Esc o con un botón visible.
- (b) Nunca se ven «Prototipo», «provisional», «por verificar», corchetes ni notas técnicas.
- (c) Ninguna barra, aviso o ventana tapa la escena. Cada aviso sale solo cuando le toca.
- (d) En el capítulo 1 la cámara nunca deja la pantalla llena de hojas o de pared.
- (e) El final de cada capítulo se lee bien, y tu cotorra sigue contigo en el capítulo siguiente.
- (f) Las 12 baterías en verde con 0 errores, y un recorrido nuevo con capturas donde no se vea nada de lo anterior.

## Pasos y dueños
Cada paso es un commit pequeño con build y pruebas en su propia carpeta de salida.

| # | Paso | Dueño | Estado |
|---|---|---|---|
| T1 | La barra «Patrulla 0/4» cruza la pantalla (`invasoras.js:515`) y se oculta en los minijuegos. Quitar el letrero «Prototipo» (`index.html:125` y `:361`, `en.js:843`). Contraste del panel final (`marcador.css:26-28`). Quitar la nota «[Canta un coquí…]» (`misiones.js:118`) | coordinadora | hecho · bc94115 |
| T2 | Un solo silenciador de avisos: nada sale durante la intro, los diálogos, los minijuegos ni el panel final (`reparar.js`, `descubrir.js`, `invasoras.js`, `misiones.js:168`) | coordinadora | hecho · a6d361d (ronda 2: los avisos de fuera esperan a que acabe la escena y la cola llena no tira los de una sola vez) · f9e37f7 (revisión: una cola de avisos en `ui.js`, el aviso se aparta con el diálogo, visor del río con `enEscena`, sin «por verificar» en tren y Diario) |
| T3 | Recortes del menú con bandera, sin borrar código. Sacar Casa, Escuela, Duelo y Duelo de 2 de la portada y de «¿Qué hay para hacer?». River Rush, Tormenta y Banquete van dentro de «Más juegos», con Esc funcionando. «Capítulos» sube arriba. Esconder «Mejor combo» y «Escondite» mientras estén vacíos | Claude web | hecho, c803fad9 + ajuste de «Más juegos» (bandera `G.menuRecorte`; `?menu=completo` la quita) |
| T4a | Pesca: apagar el Visor del río mientras se pesca (`rio_vivo.js:263-270`) y quitar el arbusto que tapa la vista (`content/cap1/misiones.js:49-66` frente a `pesca.js:43`) | coordinadora | hecho · dad3bde |
| T4b | Casa del bohío: Vittata llega a unos 2,5 m de la puerta, mirándola (`que_hacer.js:29` y `:67`) | Claude web | hecho, c7544bae |
| T5 | Cámara: perchas de misión como «posado» (`fisica.js:607`) y que no se meta en las copas (`camara.js:171-256`); se prueba en el paso 4 del capítulo 1 en el teléfono | Claude web (reasignada 14-nov) | hecho, 3258690b |
| T6 | HUD del teléfono: quitar «PRÓXIMO», agrupar los contadores, objetivo en 2 líneas como mucho, minimapa más limpio y la etiqueta «Grito del Yunque» explicada o fuera. Sin tocar `invasoras.js` | Claude web (14-nov, de la Nube) | hecho, c8d9ed0d |
| T7 | Continuidad: «Siguiente capítulo» copia el perfil del capítulo anterior (nombre, aspecto, ropa, estrellas) y salta el creador (`guardado.js:7`, `menu_modos.js:833-844`) | Claude web | hecho, 30f64660 (nombre, aspecto y ropa; las piezas ganadas no, por K3; «estrellas»: no hay un campo con ese nombre, ver nota en TAREAS_WEB) |
| T8 | Capítulos 2 a 6: pistas de «vuela» en los objetivos en altura (ep5 y ep6); en el capítulo 3, hablar con el papá y no con la abuela; la etiqueta del HUD del capítulo 2 no choca con el reloj | Claude web (14-nov, de la Nube) | hecho, 84a73fc9 + cap. 3 (ver nota en TAREAS_WEB) |
| T9 | Ocultar al jugador los textos «(provisional)» y «por verificar» (`character.js:120`, `creador.js:314`, `rescate.js:51-54` y `:124`, `album.js:174` y `:185`). Se ocultan y no se inventan datos | coordinadora | hecho · f41558c |
| T10 | Salir de todo: cada modo de la portada y de «Más juegos» deja salir con Esc y con un botón visible, y vuelve a la portada | Claude web | hecho, f99f8de3 |
| T11 | La intro y la «Pista» no nombran el minimapa antes de que exista | Claude web | hecho, b6c1b533 |
| T12 | Lo nuevo de T3 a T8 también en inglés | Claude web | hecho, f99f8de3 |
| — | Taller de Tuerca, el prototipo flotando | Claude web | hecho, QA-250 |

## Decisiones de Kelvin (no las tomamos nosotros)
- K1. Iguaca, el Guardián, la Abuela y el Papá son recortes planos al lado de Vittata en 3D. ¿Se modelan en 3D o se presentan mientras tanto con un marco ilustrado? (PENDIENTES #27)
- K2. El final de la temporada en el capítulo 6: texto, créditos y premio único (#8-11, #20).
- K3. El reparto de ropa por capítulo, sin repetir: hoy el capítulo 4 da lo mismo que el 2.
- K4. La lista final de modos en la portada. Mientras no conteste, T3 los esconde con una bandera fácil de revertir.

Capturas del recorrido: las guarda la coordinadora fuera del repo.
