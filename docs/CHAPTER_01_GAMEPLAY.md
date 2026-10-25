# CHAPTER_01_GAMEPLAY · cómo se juega hoy

Capítulo 1, «El día que el cielo se rompió». Estado real de `main` al 25 de octubre de 2026, según `docs/equipo/CAP1_PENDIENTE.md` (revisión del productor y cierre de los paquetes A, B, C y D) y el código de `content/cap1/` y `src/game/`. Guía corta para familias: `docs/COMO_SE_JUEGA.md`. Principio del proyecto: **diversión primero**; lo educativo sale del juego, no es el gancho.

| Secuencia del guion | En el juego | Estado | Prueba |
|---|---|---|---|
| 0. Crear personaje | Nombre de dos listas (sin texto libre), 8 plumajes, pañuelo, accesorio; la cotorra creada es el aprendiz que sigue a Vittata (`src/game/creador.js`) | Hecho | `pruebas.js` creador; E2E pasos 1-2 |
| 1. Gancho y ruptura | Pantalla negra con viento → taller con luz y VMMMM → brillo de nubes, ZZZT, sacudida y onda en el cielo → negro; fundido al abrir los ojos (`historia.js` `inicio`, capas DOM del pack) | Hecho | `missionTest` apertura |
| 2. Despertar | Vittata examina la máquina experimental y el transmisor desde fuera del taller (el bohío no tiene interior; decisión 9) | Hecho | `pruebas.js` `examine` |
| 3. Ayudar a Luma | Luma llama, pide ayuda y entrega 3 tablas; Vittata acepta | Hecho | `pruebas.js` `talkLuma` |
| 4. Recolectar · M1 «Fondo del río» | 4 madera, 2 piedras y 1 pieza de metal; la pieza está en el fondo de la poza: nadar, bucear (C) y agarrarla. Premio: botas azules (`content/cap1/misiones.js` `m1`) | Hecho | `missionTest` M1 |
| Nido | Al cerrar M1 aparece el nido junto a la Estación; Luma lo presenta y sale el botón **Nido**. El huevo gana XP con el juego y eclosiona a los 26 «días» (104 XP); la cría acompaña a Vittata (`src/game/criadero.js`) | Hecho | `criaderoTest`; E2E |
| 5. Terrenos · M2 «La ruta de la gota» | Predicción con Luma, 4 perchas (suelo, sotobosque, dosel, emergente), cadena alimentaria, los dos terrenos desde el aire, el vapor hasta la nube, la gota por la quebrada, buceo a la marca de crecida y explicación a Luma (p1-p8, `content/cap1/educativa.js`, `lecciones.js`). Premio: pava jíbara. Sustituye a los anillos de vuelo, que no van | Hecho | `eduTest`; E2E |
| Paradas de aprendizaje | 3 paradas de repaso (agua, construcción, bosque) y 5 de ciencia de Puerto Rico (cotorra, palma de sierra, nido, María, flamboyán) en la aldea, en ES/EN y con fuente (`content/cap1/paradas.js`) | Hecho | `eduTest` |
| 6. Construir | Fantasma verde/rojo, valida terreno y choques, consume 3 madera + 2 piedras (`historia.js` `placeRefuge`) | Hecho | `missionTest` |
| Consecuencia · crecida | Lluvia y trueno, el río sube y daña el refugio del terreno A; se desarma (recupera materiales) y se reconstruye en la colina. Sin castigo irreversible. Techo con el engranaje: solo en diálogo (P2-2) | Hecho | `missionTest` crecida |
| 7. Guardián | Llega después de la crecida, reconoce el refugio y regala el banco de trabajo. Difiere del guion: no ayuda a construir ni entra la familia de Luma (decisiones 2 y 5) | Hecho, con desvío | `pruebas.js` `talkGuardian` |
| M3 «Co-quí» | Simon de 3 coquíes escondidos (co grave, quí agudo) con «Pasar» tras 2 fallos; elección de diálogo con Luma. Premio: camisa guayabera | Hecho | `missionTest` M3 |
| 8. Misterio | Reparar el transmisor en el banco (1 madera + 1 pieza), símbolo de 36 fragmentos, BIP y estática, la Voz («viene otra tormenta») con retrato neutro: ya no lleva la cara del Guardián (P0-2 cerrado); el Guardián reconoce el símbolo y calla | Hecho | `missionTest`; E2E QA-34 |
| Página 12 · mirador | Islas en la niebla, plano de la embarcación en un lienzo, luz que parpadea tres veces, cliffhanger al capítulo 2 | Hecho | `missionTest` mirador |
| Final | Panel con **Crear mi cómic**, **Seguir explorando** (mundo libre: Diario 12/12, nido, retos) y **Comenzar de cero**, que pregunta dentro del juego antes de borrar (P0-1 cerrado) | Hecho | `pruebas.js` panel final; `saveTest` |
| Cómic | Página personal con 4 viñetas de historia + viñetas de hechos del motor (techo, rama alta, nido, eclosión); textos de listas; PNG/PDF (`src/game/comic.js`) | Hecho | `comicTest`; E2E |
| Diario de Campo | 12 hallazgos por proximidad (6 fauna, 6 cultura) con dato y fuente (`content/cap1/coleccionables.js`, validados en `docs/equipo/DIARIO_VALIDACION.md`); sección «Amazonas del mundo» con las especies verificadas | Hecho | `missionTest`; `eduTest` |
| Modo Retos (fuera de la historia) | «Carrera en El Yunque» y «¡Escapa de la tormenta!», desde la portada o la pausa; récords locales; la partida no se toca (`src/game/retos.js`) | Hecho | `retosTest` |

**Recorrido completo:** `tests/qa/e2e.js` juega el capítulo entero con la build publicada (portada → creador → 8 etapas → panel final → cómic → Seguir explorando → guardar y recargar) y las baterías de `tools/build/test.sh --extra` quedan en verde.

**Diferencias con el guion y pendientes (detalle en `CAP1_PENDIENTE.md`):**
- El taller no tiene interior (decisión 9) y el Guardián llega después de la crecida (decisión 2).
- El engranaje en el techo, la bandada de 20 cotorras, las luciérnagas y la bahía bioluminiscente del GDD siguen pendientes (P2-1, P2-2; decisión 7).
- **Duración sin medir con jugadores:** el piso automático del E2E es 5 min 42 s (colina) a 5 min 55 s (río), sin leer ni explorar. La meta (10-15, 20-30 o 45 min) es la decisión 7.
- **FPS en equipos de escuela sin medir** (P0-4); la calidad automática ya arranca baja o media en equipos modestos.
- Idioma: la ruta de la gota, las paradas y el Aula son ES/EN; historia, HUD y diálogos solo en español (decisión 8).

**Siguiente paso de diseño:** `docs/equipo/DIVERSION_CAP1.md`, las cinco mejoras ★ (Luma llama desde arriba, lo que gano se ve, diálogo que no bloquea, la crecida se juega, cómic con humor y foto).
