# AMAZONA VERSE — V18.2
## SISTEMA DE EVOLUCIÓN, NIVELES Y ALIANZAS DE PODERES
### Propuesta de Kelvin y Nathanael para Claude y los equipos de desarrollo
(Kelvin, 6-nov-2026. Copia guardada por la otra cuenta, tal cual la envió Kelvin.)

**Estado:** Aprobado para diseño y prototipo inicial.

**Prioridad:** Complementaria a V18.1. No detener el desarrollo actual.

---

## 1. VISIÓN PRINCIPAL

Queremos que Amazona Verse tenga un sistema de evolución y progresión inspirado en la satisfacción de los videojuegos de colección, pero con identidad y mecánicas propias.

La idea nace de una conversación entre Kelvin y su hijo Nathanael.

Nathanael propuso que las cotorras desarrollen poderes de fantasía relacionados con colores y elementos como fuego y agua.

Kelvin propuso que las cotorras puedan evolucionar, aumentar de nivel y combinar poderes con otras cotorras.

**DECISIÓN FUNDAMENTAL: LAS COTORRAS NO CAMBIAN DE ESPECIE.**

Una Amazona vittata siempre será una Amazona vittata.

No queremos crear decenas de modelos 3D nuevos para representar evoluciones.

Queremos utilizar los modelos, rigs, animaciones y efectos que ya existen.

La evolución debe manifestarse mediante habilidades, dominio de poderes, movimientos, efectos visuales y nuevas posibilidades de juego.

---

## 2. LAS 36 ESPECIES

Conservar las 36 especies del universo de Amazona Verse.

- 34 especies del catálogo base.
- 2 especies históricas: Amazona martinicana y Amazona violacea.

Las dos especies históricas conservarán su papel de consejeras en la primera temporada.

No deben presentarse como especies actualmente vivientes ni transformarse en híbridos.

Las 34 especies del catálogo base podrán progresar individualmente.

Cada especie conservará su nombre, identidad, apariencia y poder principal ya definido en la matriz V18.1.

No sustituir ni borrar los poderes existentes.

---

## 3. SISTEMA DE NIVELES

Propuesta inicial de progresión:

| Nivel | Etapa | Desbloqueo |
|---|---|---|
| 1–9 | Aprendiz | Poder principal |
| 10–19 | Despertar | Mejora del poder |
| 20–29 | Guardián | Habilidad secundaria |
| 30–40 | Maestro | Dominio avanzado y efecto visual especial |

El nivel máximo inicial será 40.

Los valores son parámetros iniciales que deberán equilibrarse mediante pruebas.

La progresión debe sentirse significativa.

No queremos que subir de nivel sea simplemente aumentar números.

Cada etapa debe introducir una mejora que el jugador pueda percibir y utilizar.

---

## 4. EJEMPLO: EVOLUCIÓN DE VITTATA

**Nivel 1 — Grito del Yunque**

Vittata abre el pico y produce una onda sonora que empuja e interrumpe.

**Nivel 10 — Eco Amplificado**

La onda gana alcance o amplitud, con límites de equilibrio.

**Nivel 20 — Eco Dirigido**

Permite una mayor precisión y una interacción adicional con obstáculos.

**Nivel 30 — Grito Maestro**

Desbloquea una variante avanzada con efectos visuales especiales y una mejora táctica.

La cotorra conserva su apariencia original.

No crear una Vittata diferente para cada nivel.

Reutilizar el rig, la animación del pico y las partículas existentes.

---

## 5. LAS CUATRO FAMILIAS TÉCNICAS

Conservar la arquitectura de V18.1:

**PICO**
- Gritos.
- Ondas sonoras.
- Semillas.
- Proyectiles especiales.

**OJOS**
- Visión.
- Detección.
- Anticipación.
- Marcado de objetivos.

**PLUMAS**
- Escudos.
- Protección.
- Desvíos.
- Efectos defensivos.

**ALAS**
- Ráfagas.
- Velocidad.
- Esquivas.
- Movimientos especiales.

Estas familias siguen siendo la base técnica de los poderes individuales.

No desarrollar un motor independiente por cada especie.

---

## 6. PODERES ELEMENTALES DE FANTASÍA

Incorporar una segunda capa visual y estratégica inspirada en la idea de Nathanael.

Elementos iniciales propuestos:

1. Fuego.
2. Agua.
3. Viento.
4. Naturaleza.
5. Luz.
6. Eco.

Estos elementos son exclusivamente fantásticos.

No representan capacidades biológicas reales de las cotorras.

Los colores naturales pueden inspirar ciertos efectos visuales, pero no deben determinar automáticamente el elemento.

**Importante:** no sustituir los 36 poderes individuales de la matriz V18.1 por seis poderes genéricos.

Los elementos deben enriquecer las habilidades existentes.

Ejemplos:

- Una onda sonora puede incorporar un efecto de luz.
- Una ráfaga puede combinarse con agua.
- Un escudo de plumas puede adquirir una variante de naturaleza.
- Una habilidad de visión puede revelar rastros luminosos.

No es necesario implementar todos los elementos desde el primer prototipo.

---

## 7. SISTEMA DE ALIANZAS DE BANDADA

Esta es una de las principales novedades.

Dos cotorras descubiertas pueden formar una **Alianza de Bandada**.

La alianza permite desbloquear un poder combinado.

No se casan, no se reproducen y no generan una especie híbrida.

Ambas conservan sus identidades.

La combinación es temporal y corresponde a una habilidad fantástica compartida.

### Ejemplo inicial

**Vittata + Arausiaca = Eco Protector**

- Vittata aporta el Grito del Yunque.
- Arausiaca aporta el Escudo de plumas.
- La alianza genera una onda sonora acompañada de protección temporal.

La habilidad debe tener duración limitada, coste de energía y tiempo de recarga.

No puede utilizarse indefinidamente.

---

## 8. CÓMO SE ACTIVAN LAS ALIANZAS

Propuesta inicial:

1. El jugador descubre las dos cotorras.
2. Desbloquea sus poderes individuales.
3. Cumple una misión o desafío de entrenamiento.
4. Desbloquea la alianza.
5. Selecciona la combinación disponible.
6. Utiliza el poder compartido durante el juego.

Para el primer prototipo, una sola cotorra controlada por el jugador ejecutará el poder combinado.

La segunda cotorra aportará su habilidad mediante un efecto visual de apoyo.

Esto evita tener que implementar inmediatamente dos personajes simultáneos con IA y nuevas animaciones.

Posteriormente podremos estudiar alianzas con dos cotorras presentes físicamente.

---

## 9. LIMITAR LAS COMBINACIONES INICIALES

No implementar todas las combinaciones posibles.

Entre 36 especies existen 630 parejas distintas si se combinan especies diferentes sin importar el orden.

Ese volumen no es apropiado para la fase actual.

Crear inicialmente seis alianzas especiales.

La primera será Vittata + Arausiaca.

Las otras cinco se seleccionarán posteriormente según variedad jugable, compatibilidad de habilidades y coste técnico.

No prometer que todas las parejas tendrán un poder único.

---

## 10. EXPERIENCIA Y PROGRESIÓN

Las cotorras podrán ganar experiencia mediante actividades existentes:

- Exploración.
- Descubrimientos.
- Misiones.
- Combates contra IA.
- Carreras.
- Desafíos.
- Minigolf.
- Construcción y reparación cuando corresponda.

Evitar que el jugador tenga que repetir la misma actividad cientos de veces para progresar.

Las recompensas deben equilibrarse para que ninguna actividad permita subir niveles de forma excesivamente rápida.

No introducir compras, pagos ni sistemas de azar monetizados.

---

## 11. COLECCIÓN Y MOTIVACIÓN

El jugador debe tener razones para seguir jugando después de descubrir todas las especies.

Objetivos de largo plazo:

- Descubrir las cotorras.
- Subir sus niveles.
- Desbloquear habilidades.
- Dominar sus poderes.
- Conseguir alianzas.
- Completar desafíos especiales.
- Mejorar récords.
- Desarrollar estrategias distintas.

No entregar todas las habilidades desde el comienzo.

La progresión debe recompensar el esfuerzo y la exploración.

---

## 12. BALANCE DE COMBATE

Las cotorras de niveles altos deben sentirse más capaces, pero no invencibles.

El nivel no debe determinar automáticamente quién gana.

Un jugador hábil con una cotorra de nivel inferior debe poder competir mediante estrategia, precisión y buen uso de los poderes.

Evitar:
- Invulnerabilidad permanente.
- Poderes sin recarga.
- Ataques imposibles de esquivar.
- Alianzas que ganen automáticamente.
- Ventajas excesivas por acumular experiencia.

Mantener las cinco plumas de resistencia del sistema de duelo cuando corresponda.

No introducir violencia gráfica.

---

## 13. IMPLEMENTACIÓN TÉCNICA

Claude debe revisar y reutilizar:

- src/game/v18/habilidades.js
- src/game/dones.js
- src/engine/fx.js
- src/game/v18/fx_poderes.js
- Sistemas de combate e IA existentes.
- Sistema de colección.
- Guardado local.
- Modelos y rigs existentes.

Los nombres de archivos son referencias de la arquitectura documentada; verificar su estado real antes de modificar.

Crear un sistema de progresión modular.

Guardar por especie:
- Nivel.
- Experiencia.
- Mejoras desbloqueadas.
- Poderes disponibles.
- Alianzas desbloqueadas.

Las actualizaciones deben conservar los datos anteriores.

No borrar progreso existente ni romper partidas guardadas.

---

## 14. PRIMER PROTOTIPO

**No desarrollar las 34 progresiones completas de inmediato.**

Primera prueba:

1. Vittata con tres etapas funcionales de poder.
2. Arausiaca con su Escudo de plumas.
3. Experiencia y subida de nivel.
4. Un desbloqueo visible.
5. Alianza Eco Protector.
6. Un rival de IA contra quien probar.
7. Guardado y recuperación del progreso.
8. Controles funcionales en móvil y computadora.

Demostrar que subir de nivel produce una diferencia real en la jugabilidad.

Demostrar que la alianza utiliza correctamente ambos poderes.

---

## 15. PRUEBAS Y ENTREGABLES

Entregar:

1. Diseño técnico breve del sistema.
2. Código integrado en una rama o entorno de prueba.
3. Video real de una subida de nivel.
4. Video real de Eco Protector funcionando.
5. Pruebas de combate y equilibrio.
6. Pruebas de guardado y carga.
7. Validación móvil.
8. Commit correspondiente.
9. Problemas conocidos y siguientes pasos.

No considerar terminado el trabajo únicamente porque las animaciones se vean bonitas.

Los poderes deben funcionar.

---

## 16. RESTRICCIONES

- No cambiar las especies.
- No crear híbridos biológicos.
- No crear modelos 3D nuevos para cada evolución.
- No eliminar la matriz de 36 poderes.
- No modificar el canon de los seis capítulos.
- No alterar el papel de Mara y Vela.
- No romper el combate existente.
- No perjudicar el rendimiento móvil.
- No activar rankings online ni cuentas infantiles.
- No detener V18.1.
- No incorporar todavía el proyecto de identidad autóctona por regiones.

**La identidad autóctona se trabajará por separado en una fase futura. No incluirla en esta implementación.**

---

# RESULTADO QUE QUEREMOS

Queremos que un niño descubra su cotorra favorita, la entrene, vea cómo desarrolla nuevas habilidades y sienta satisfacción al alcanzar nuevos niveles.

Después podrá descubrir otra cotorra, aprender sus poderes y formar alianzas estratégicas.

Todo sin perder la identidad real de las especies.

**Amazona Verse tendrá 36 especies, evolución de habilidades, poderes elementales fantásticos y alianzas de bandada, sin necesitar cientos de personajes nuevos.**

Primero entregar un prototipo funcional con Vittata, Arausiaca y Eco Protector.

Después ampliar de manera progresiva.

**FIN DE LA DIRECTIVA — EVOLUCIÓN Y ALIANZAS V18.2**
