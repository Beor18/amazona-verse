# Directiva maestra V4: Manga Toon Story Creator

**Cuándo y de quién:** la dio Kelvin García el 27-oct-2026, dirigida a Claude Code y a Fernando.
**Referencia visual obligatoria:** `docs/img/referencia_manga_toon.webp`. Es la imagen que aprobó Kelvin: la página «Crea tu cómic» con 6 viñetas, el título «¡Me perdí, pero lo logré!» y, abajo, los recuadros «¿Qué aprendí?» y «Mi enseñanza de vida».
**Estado:** directiva de diseño y auditoría, previa a la implementación. **El generador actual no se reemplaza hasta que Kelvin apruebe el prototipo.**

> Lo que sigue resume fielmente la directiva de Kelvin. Si hay alguna duda, manda su texto original, que está en la conversación de la sesión coordinadora.

## 1. Visión
Convertir el generador de cómics actual en un **creador de historias manga toon**: el jugador revive su partida y cuenta cómo la vivió. No basta con poner cuatro capturas con subtítulos.

El cómic muestra:
- qué hizo el jugador y qué decisiones tomó;
- dónde se confundió, qué obstáculos encontró y cómo intentó resolverlos;
- si mejoró su tiempo y cómo terminó;
- qué aprendió y qué enseñanza de vida se lleva.

**La partida pone los acontecimientos. El niño pone su interpretación.** Tiene que ser divertido y educativo, sin parecer una tarea escolar.

## 2. El diseño gráfico es la prioridad absoluta
Hay que conservar el nivel de la referencia:
- colores vibrantes y tropicales, en estilo Vibrant Toon refinado, como un manga de aventuras a color;
- viñetas de tamaños distintos, composiciones diagonales y marcos negros expresivos;
- planos panorámicos y primeros planos;
- globos de diálogo y de pensamiento, onomatopeyas grandes, líneas de velocidad y efectos de movimiento;
- fondos ricos, buena iluminación y portada personalizada;
- tipografía clara y divertida, y una interfaz que invite a crear.

**Antes del editor completo** hay que producir una página de demostración con los personajes y recursos oficiales y compararla con la referencia. Si pierde calidad, se corrige antes de seguir. No se sacrifica el acabado por terminar antes.

## 3. Personajes oficiales: prohibido inventar cotorras
Las cotorras de la imagen de referencia son ilustrativas. **No se usan como modelos.** Primero hay que auditar los recursos reales:
- modelos y especies;
- skins, rigs y animaciones;
- poses y expresiones;
- modelos juveniles y bebés (si existen);
- el criadero.

Solo se ofrecen las especies que tengan recursos utilizables y estén habilitadas. No se inventan especies, nombres ni colores.

**Cotorras bebés:** hay que evaluar cómics protagonizados por ellas, por ejemplo «Mi primer día fuera del huevo», «Aprendiendo a volar», «Mi primera aventura», «Creciendo en la selva» o «Mi primer gran desafío». Solo con diseños oficiales o prototipos aprobados.

## 4. Dos modos
- **A, «Mi partida, mi historia».** El sistema analiza los acontecimientos que de verdad puede identificar (inicio, cambio de ruta, retroceso, obstáculo, nuevo intento, mejora, meta) y propone una secuencia. El niño decide qué contar y cómo. Nunca se presentan emociones, intenciones o errores como hechos si no están registrados: un cambio de dirección puede ser una estrategia, una exploración o una confusión, y eso lo explica el niño.
- **B, «Yo invento mi aventura».** Una historia original con personajes y escenarios oficiales. Usa el mismo editor, pero el sistema distingue este modo de la reconstrucción de una partida.

## 5. El niño es el autor
El niño puede:
- escoger el título, elegir su cotorra oficial y ponerle nombre;
- elegir acontecimientos y escenas, y reordenar las viñetas;
- escribir diálogos, pensamientos y narración;
- explicar sus decisiones, contar cómo resolvió un problema y cómo se sintió;
- elegir el final y editar las enseñanzas;
- guardar y exportar.

El sistema puede sugerir textos breves, siempre editables. **No es una historia escrita por la IA.**

## 6. La historia real de la partida (story timeline)
Hay que auditar los registros que ya existen de carreras, retos, movimientos, puntuaciones y récords, y aprovechar lo que haya sin sistemas innecesarios.

| Evento | Oportunidad para la historia |
|---|---|
| Inicio | Presentar la aventura |
| Cambio de ruta | Una decisión |
| Retroceso | Reconsiderar |
| Obstáculo | Una dificultad o sorpresa |
| Fallo | Un intento que no salió |
| Nuevo intento | La recuperación |
| Mejora de tiempo | El progreso |
| Récord | La superación |
| Meta | El resultado |
| Partida incompleta | La historia continúa |

No se recogen datos personales innecesarios ni se graba video continuo. No se inventan eventos que no estén en la telemetría.

## 7. El editor, en 4 pasos (pensado para el móvil y para niños)
1. **Mi historia:** el título, el nombre del protagonista, la cotorra oficial y si es una partida real o una historia libre.
2. **Mis momentos:** las escenas, la línea de tiempo, los eventos, los fondos oficiales y el orden.
3. **Mi manga:** plantillas de viñetas, composición dinámica, globos, pensamientos, narración, efectos, expresiones y vista previa.
4. **Mi enseñanza y mi final:** «¿Qué aprendí?», la enseñanza de vida, la revisión, guardar y exportar.

## 8. El final con dos enseñanzas (obligatorio)
Son dos espacios visuales bien diferenciados que forman parte del arte de la última página, no un bloque de texto escolar:
- **A, «¿Qué aprendí en mi aventura?»** Personal: qué descubrió el niño sobre estrategia, orientación, velocidad, resolución de problemas, equipo, naturaleza, conservación, planificación, creatividad o perseverancia. Lo escribe él. Si pide ayuda, el sistema le sugiere algo relacionado con su partida.
- **B, «Mi enseñanza de vida».** Una frase corta, memorable y positiva que lleva la aventura a la vida real, por ejemplo «Equivocarte de camino no significa que hayas perdido tu destino». La puede escoger, editar o escribir él.

Los dos espacios no repiten el mismo mensaje. Nunca se genera una moraleja que contradiga lo que pasó o lo que el niño quiso contar.

## 9. La última página
- **Arriba:** una gran viñeta con el desenlace (la meta, una celebración, un descubrimiento, los amigos, un nuevo intento o un momento tranquilo).
- **En el centro:** el cierre que escribió el niño.
- **Abajo:** dos recuadros. A la izquierda, «¿Qué aprendí?», con un icono de libro o de brújula. A la derecha, «Mi enseñanza de vida», en una banda ilustrada con tipografía expresiva.
- **Al cierre:** el nombre elegido para el protagonista y el título, **sin pedir el nombre real del menor**.

Las enseñanzas no van en letra diminuta: son parte importante del diseño.

## 10. Ejemplo
**«¡Me perdí, pero lo logré!»:**
1. Comienza la aventura.
2. La decisión.
3. La confusión.
4. El nuevo intento.
5. La recuperación.
6. La meta.

Cierre: «¿Qué aprendí?» y «Mi enseñanza de vida». Es solo una ilustración: cada historia sale de los eventos reales y de lo que escriba el jugador.

## 11. Enseñanzas según el tipo de aventura (sugerencias variadas, nunca una sola frase para todos)

| Tipo de aventura | Enseñanza sugerida |
|---|---|
| Carrera | Perseverancia y aprendizaje |
| Exploración | Curiosidad |
| Error de ruta | Adaptación |
| Equipo | Cooperación |
| Criadero | Responsabilidad y paciencia |
| Conservación | Respeto por los seres vivos |
| Tormenta | Resiliencia |
| Reto incompleto | Aprender de los intentos |
| Récord | Superación |

Sin sermones ni culpas. La enseñanza acompaña la diversión, no la reemplaza.

## 12. Calidad gráfica y técnica
Antes de nada, hay que auditar:
- el generador actual, las capturas y el registro de eventos;
- los modelos, rigs, cámaras, materiales toon y escenarios;
- la exportación, el guardado y el móvil.

Para el acabado manga, estudia:
- cámaras propias para las viñetas y composición ilustrada;
- contornos, cel shading y fondos estilizados;
- efectos de movimiento y globos editables;
- plantillas reutilizables.

**No dependas de la generación de imágenes por IA:** primero ve qué se consigue con los modelos y escenas que ya hay.

## 13. El prototipo que quiere ver Kelvin
1. Portada manga toon personalizada.
2. Una cotorra oficial.
3. El título escrito por el jugador.
4. 6 viñetas dinámicas.
5. Escenas de una partida de prueba.
6. Diálogos editables.
7. Una decisión o dificultad explicada por el niño.
8. Un desenlace.
9. El recuadro «¿Qué aprendí?».
10. El recuadro «Mi enseñanza de vida».
11. La vista móvil.
12. Una exportación de muestra.

Se compara lado a lado con la referencia. **Si se ve como el cómic anterior, todavía no cumple.**

## 14. Criterios de aprobación
- Calidad visual comparable con la referencia, estilo manga toon a color.
- Cotorras oficiales reconocibles.
- Viñetas dinámicas y legibles, y una historia coherente.
- Los eventos reales bien representados.
- El niño escribe con libertad y la edición es sencilla.
- Las dos enseñanzas.
- La exportación funciona y el móvil rinde bien.
- La privacidad de los menores está protegida.
- Se reutilizan los recursos existentes.

## 15. Lo esencial
El juego aporta lo que ocurrió. El niño cuenta cómo lo vivió. El manga lo convierte en una aventura visual. No todas las historias terminan en victoria: también se aprende al confundirse, perder o volver a intentarlo.

*Mi aventura. Mi historia. Mi aprendizaje.*
