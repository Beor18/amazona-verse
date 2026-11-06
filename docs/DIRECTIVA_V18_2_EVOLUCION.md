# AMAZONA VERSE — V18.2 · Evolución, niveles y alianzas de poderes
(Propuesta de Kelvin y Nathanael, 6-nov-2026. Copia guardada por la coordinadora web. **Estado:** aprobada para diseño y prototipo inicial. **Prioridad:** complementaria a V18.1; no la detiene.)

## 1. Visión
Un sistema de evolución y progresión con la satisfacción de los juegos de colección, pero con identidad y mecánicas propias. Nace de una conversación entre Kelvin y su hijo Nathanael:
- **Nathanael:** que las cotorras desarrollen poderes de fantasía de colores y elementos, como fuego y agua.
- **Kelvin:** que puedan evolucionar, subir de nivel y combinar poderes con otras cotorras.

**Decisión fundamental: las cotorras no cambian de especie.** Una *Amazona vittata* siempre es una *Amazona vittata*. Nada de modelos 3D nuevos por evolución: se usan los modelos, rigs, animaciones y efectos que ya existen. La evolución se ve en habilidades, dominio de poderes, movimientos, efectos visuales y nuevas posibilidades de juego.

## 2. Las 36 especies
- Se conservan las 36: 34 del catálogo base y las 2 históricas (*A. martinicana* y *A. violacea*).
- Las históricas siguen como consejeras en la temporada 1. No se presentan como vivas ni se convierten en híbridos.
- Las 34 del catálogo pueden progresar una por una.
- Cada especie conserva su nombre, identidad, aspecto y su poder principal de la matriz V18.1. No se sustituye ni se borra ningún poder.

## 3. Niveles (parámetros iniciales, a equilibrar con pruebas)
| Nivel | Etapa | Desbloqueo |
|---|---|---|
| 1–9 | Aprendiz | Poder principal |
| 10–19 | Despertar | Mejora del poder |
| 20–29 | Guardián | Habilidad secundaria |
| 30–40 | Maestro | Dominio avanzado y efecto visual especial |

El nivel máximo inicial es 40. Subir no es solo aumentar números: cada etapa trae una mejora que el jugador percibe y usa.

## 4. Ejemplo: Vittata
- **Nivel 1, Grito del Yunque:** onda sonora que empuja e interrumpe.
- **Nivel 10, Eco Amplificado:** más alcance o amplitud, con límites.
- **Nivel 20, Eco Dirigido:** más precisión e interacción con obstáculos.
- **Nivel 30, Grito Maestro:** variante avanzada con efectos especiales y mejora táctica.

Conserva su aspecto, sin una Vittata distinta por nivel. Se reutilizan el rig, la animación del pico y las partículas.

## 5. Las cuatro familias técnicas (arquitectura V18.1)
| Familia | Qué abarca |
|---|---|
| **PICO** | Gritos, ondas, semillas y proyectiles |
| **OJOS** | Visión, detección, anticipación y marcado |
| **PLUMAS** | Escudos, protección, desvíos y efectos defensivos |
| **ALAS** | Ráfagas, velocidad, esquivas y movimientos especiales |

No hay un motor propio por especie.

## 6. Elementos de fantasía (idea de Nathanael)
Fuego, Agua, Viento, Naturaleza, Luz y Eco.
- Son solo fantasía, no capacidades reales de las cotorras.
- Los colores naturales pueden inspirar efectos, pero no deciden el elemento.
- **No sustituyen los 36 poderes por 6 genéricos:** los enriquecen. Por ejemplo:
  - una onda con luz;
  - una ráfaga con agua;
  - un escudo con naturaleza;
  - una visión que revela rastros luminosos.
- No hace falta tenerlos todos en el primer prototipo.

## 7. Alianzas de bandada
Dos cotorras descubiertas forman una alianza que desbloquea un poder combinado.
- No se casan, no se reproducen y no hay híbrido: las dos conservan su identidad.
- La habilidad es temporal y fantástica, con duración limitada, coste de energía y recarga.
- **Primer ejemplo, Vittata + Arausiaca = Eco Protector:** onda sonora (Grito del Yunque) con protección temporal (Escudo de plumas).

## 8. Activación
1. Descubrir las dos cotorras.
2. Desbloquear sus poderes individuales.
3. Cumplir una misión o un desafío de entrenamiento.
4. Desbloquear la alianza.
5. Elegirla.
6. Usarla jugando.

En el prototipo, la cotorra del jugador ejecuta el poder y la segunda aporta un efecto visual de apoyo. Más adelante se estudiarán alianzas con las dos cotorras presentes.

## 9. Combinaciones limitadas
Entre 36 especies hay 630 parejas: demasiadas para esta fase.
- Empiezan **6 alianzas especiales**. La primera es Vittata + Arausiaca; las otras 5 se eligen luego por variedad, compatibilidad y coste técnico.
- No se promete un poder único para cada pareja.

## 10. Experiencia
Se gana con actividades que ya existen:
- exploración;
- descubrimientos;
- misiones;
- combates contra la IA;
- carreras;
- desafíos;
- minigolf;
- construcción y reparación.

Reglas:
- Sin repetir cientos de veces lo mismo.
- Ninguna actividad sube demasiado rápido.
- **Sin compras, pagos ni azar monetizado.**

## 11. Colección y motivación
Razones para seguir después de tener todas las especies:
- subir niveles;
- desbloquear y dominar habilidades;
- conseguir alianzas;
- completar desafíos especiales;
- mejorar récords;
- probar estrategias distintas.

No se entrega todo desde el principio.

## 12. Balance de combate
Las de nivel alto se sienten más capaces, pero no invencibles. El nivel no decide quién gana: un jugador hábil con menos nivel puede competir.

Prohibido:
- invulnerabilidad permanente;
- poderes sin recarga;
- ataques imposibles de esquivar;
- alianzas que ganen solas;
- ventajas excesivas por acumular experiencia.

Se mantienen las 5 plumas del duelo cuando corresponda, sin violencia gráfica.

## 13. Implementación técnica
- **Reutilizar:**
  - `src/game/v18/habilidades.js`, `src/game/dones.js`, `src/engine/fx.js` y `src/game/v18/fx_poderes.js`;
  - el combate y la IA;
  - la colección;
  - el guardado local;
  - los modelos y rigs.
- **Verificar** el estado real de cada uno antes de tocarlo.
- **Módulo:** un sistema de progresión aparte.
- **Datos por especie:** nivel, experiencia, mejoras, poderes disponibles y alianzas.
- **Guardado:** conservar los datos anteriores, sin romper partidas guardadas.

## 14. Primer prototipo (no las 34 progresiones)
1. Vittata con tres etapas funcionales de poder.
2. Arausiaca con su Escudo de plumas.
3. Experiencia y subida de nivel.
4. Un desbloqueo visible.
5. La alianza Eco Protector.
6. Un rival de IA para probarla.
7. Guardado y recuperación del progreso.
8. Controles en móvil y computadora.

Tiene que demostrar dos cosas: que subir de nivel cambia de verdad cómo se juega y que la alianza usa bien los dos poderes.

## 15. Entregables
1. Diseño técnico breve.
2. Código integrado en un entorno de prueba (en `main`, detrás de la bandera `?v18=1`).
3. Video real de una subida de nivel.
4. Video real de Eco Protector.
5. Pruebas de combate y equilibrio.
6. Pruebas de guardado y carga.
7. Validación móvil.
8. Commit.
9. Problemas conocidos y siguientes pasos.

No está terminado solo porque las animaciones se vean bonitas: los poderes tienen que funcionar.

## 16. Restricciones
- No cambiar especies ni crear híbridos biológicos.
- No hacer modelos 3D nuevos por evolución.
- No eliminar la matriz de 36 poderes.
- No tocar el canon de los seis capítulos.
- No alterar el papel de Mara y Vela.
- No romper el combate existente ni perjudicar el rendimiento móvil.
- No activar rankings online ni cuentas infantiles.
- No detener la V18.1.
- **No incluir todavía la identidad autóctona por regiones:** va en una fase futura aparte.

**Resultado que queremos:** un niño descubre su cotorra favorita, la entrena, ve cómo desarrolla habilidades nuevas y siente satisfacción al subir de nivel. Después descubre otra, aprende sus poderes y forma alianzas, sin perder la identidad real de las especies. Primero el prototipo con Vittata, Arausiaca y Eco Protector; después, ampliar poco a poco.
