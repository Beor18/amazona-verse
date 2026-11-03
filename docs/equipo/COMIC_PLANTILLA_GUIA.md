# Cómic con la plantilla de Kelvin (3-nov-2026) · guía de uso de las 65 piezas PNG

Fuente: la guía que Kelvin entregó el 3-nov. Las piezas van en `assets/comic/`, y las sube Kelvin desde la carpeta `comic` de la Mac. **Objetivo:** un compositor de cómic dinámico que conserve exactamente el formato aprobado de 6 viñetas (`99_REFERENCIA_FORMATO_ORIGINAL.png`). No se rediseña y el logo no se sustituye.

## Reglas
- **Logo:** solo `00_LOGO_OFICIAL_ORIGINAL_INTACTO.png`, insertado tal cual (proporción y transparencia). Nunca el logo de la referencia ni uno recreado.
- **La referencia** solo sirve para la composición; no se usa como página aplanada. `MANIFIESTO_ELEMENTOS.json` trae las coordenadas de recorte sobre 1024×1536.
- **Piezas:**
  - 01–06: viñeta aislada (transparente) o recorte completo.
  - 07: cabecera. 08: pasos. 09–10: campos de título y de cotorra.
  - 11–12: «¿Qué aprendí?» y «Mi enseñanza de vida».
  - 13: hueco del personaje central; se sustituye por el render real del personaje elegido.
  - 14–17: botones (sus acciones son de la interfaz).
  - 18–23: globos. 24–29: círculos. 30–35: cajas de texto. 36–41: cintillos.
  - 42–45: decoraciones (¡FUUUSH!, ???, bandera, NUEVO RÉCORD), solo si el evento lo justifica.
  - 46–57: globos y avatares con transparencia aproximada; validar los bordes.
- **Un solo enfoque por componente:** no superponer el recorte completo y la pieza transparente de la misma viñeta, porque se duplican bordes, rótulos y globos. Si un recorte no sirve como capa limpia, ese elemento se reconstruye por programa respetando su aspecto.

## Composición (capas)
1. Lienzo 2:3 (1024×1536 en el prototipo; más grande para exportar, con las mismas posiciones relativas).
2. Fondo de página, cabecera, **logo oficial** y título dinámico.
3. Seis escenas en 2 columnas × 3 filas, con las inclinaciones y bordes aprobados.
4. **En cada escena:**
   - captura real del juego, recortada a su máscara;
   - encima, el borde y el cintillo con el título, el globo con su texto y los efectos que toquen;
   - abajo a la izquierda, el círculo con el **retrato de la cotorra del jugador**: especie, piel, traje y corona equipados. **Nunca la silueta gris en la exportación;**
   - la caja de texto con la narración.
5. Abajo: «¿Qué aprendí?», el personaje central real y «Mi enseñanza de vida»; los botones Ver mis escenas, Editar, Descargar PNG/PDF y Compartir. Compartir respeta la puerta de adultos.

## Datos que aporta el juego
- `chapterId`, `chapterTitle`, `adventureTitle`, `language`.
- `playerSpeciesId`, `skinId`, `outfitId`, `crownId` y el retrato del modelo real.
- Por viñeta: `eventId`, `sceneImage`, `sceneTitle`, `dialogueText`, `captionText`, `effectId` y `timestamp`.
- `lessonText`, `lifeLessonText` y `recordValue`.

Si falta un dato, el editor muestra un marcador claro: no se inventan eventos ni capturas. Los textos van como capas dinámicas, ES y EN.

## Prueba mínima antes de pasar a los 6 capítulos
1. Un cómic completo del cap. 1 con 6 eventos reales de una partida.
2. El logo es el `00_…` original, sin cambios.
3. Dos cotorras distintas, cada una con su piel, traje y corona: los círculos cambian.
4. Revisión en móvil, iPad y PC.
5. Exportar PNG y PDF, abrirlos y comprobar que nada sale recortado.
6. Las pruebas de regresión del juego en verde.
7. Capturas del editor y de la exportación, y la lista de errores pendientes.

**Criterio de aceptación:** el jugador termina el capítulo, abre el cómic, reconoce sus 6 momentos, ve su cotorra equipada y exporta una página legible, sin que intervenga ningún diseñador. **Kelvin valida un cómic completo antes de extenderlo al resto de capítulos.**
