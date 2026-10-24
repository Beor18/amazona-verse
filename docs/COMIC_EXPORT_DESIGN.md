# COMIC_EXPORT_DESIGN · cómic personal

**Flujo:** eventos guardados → selección (solo viñetas cuyo evento ocurrió) → orden elegido → captura de escena del propio juego → viñeta → texto → página 1080×1520 → vista previa → exportación local.

| Viñeta | Evento que la habilita | Imagen | Texto por defecto |
|---|---|---|---|
| Presentación | PlayerCharacterCreated | retrato del personaje creado | "Soy {nombre}, aprendiz de Vittata en Villa Raíz." |
| Taller | WorkshopExplored | captura al explorar el taller | "La Gran Ruptura dañó el taller…" |
| Decisión | ShelterConstructed | captura tras la lluvia | según la ruta real: colina directa / corrección río→colina / se quedó en el río |
| Resultado | ChapterCompleted | captura final + símbolo de los 36 | "Ayudamos a la familia de Luma…" |

**Editor (MVP):** título, portada (Vittata, mi personaje, taller, refugio), diseño (cuadrícula 2×2 o tira vertical), reordenar viñetas (↑↓), editar el texto de cada viñeta (máx. 120 caracteres).

**Exportación:**
- PNG 1080×1520: probado. Archivo inspeccionado en `tests/out/comic.png`.
- PDF de 1 página (JPEG incrustado, sin librerías): probado. macOS lo abre; página inspeccionada como imagen.
- Retrato del personaje en PNG 256×256: probado (`tests/out/retrato.png`).
- Dentro del visor de Claude se usa la capacidad oficial `downloads` (el visor pide confirmación al jugador). Fuera del visor se usa un enlace de descarga. Si el visor no la permite, el PNG se guarda manteniendo presionada la imagen. **No probado todavía en iPhone ni Android reales, ni el diálogo de descarga del visor.**
