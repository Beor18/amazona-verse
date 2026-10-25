# GDD Capítulo 1 · "El Vuelo de Vittata" (10–15 min)

**Diagnóstico.** El capítulo funciona, pero volar, nadar, dash y gestos no tocan la historia. Solución: cada paso de `STEPS` exige una habilidad distinta, sin reescribir el guion. Todo con primitivas Three.js y WebAudio sintético; cero assets nuevos.

## 1. Core loop (30–60 s)
**Ver pista → usar una habilidad → capturar → recompensa juicy → Diario/ropa → pista nueva.** Siempre hay un objetivo visible (haz de luz y flecha).

## 2. Ritmo
| Min | Beat | Habilidad |
|---|---|---|
| 0–1 | Despertar, taller, Luma | caminar |
| 1–4 | M1: pieza de metal en el río | nadar |
| 4–7 | M2: marcas de agua desde el aire | volar |
| 7–10 | Construir y crecida | dash/volar |
| 10–13 | M3: coro de coquíes enciende el transmisor | hablar |
| 13–15 | Mirador, bandada, final | volar |

## 3. Tres misiones
**M1 · "Fondo del río" (nadar).** Luma: "La pieza cayó al río". `c1` pasa a un banco sumergido; se bucea con `c`, burbujas guían. Sin oxígeno ni enemigos.
**M2 · "Ojos de guaraguao" (volar).** Para evaluar los terrenos, 7 anillos de luz (TorusGeometry) trazan una ruta sobre el río; cada anillo consecutivo sube el tono del sonido. Desde arriba aparece el rastro de las marcas de agua del terreno A.
**M3 · "Co-quí" (hablar).** El transmisor necesita voz: Vittata, cotorra imitadora, repite el canto de 3 coquíes escondidos (arbustos que brillan). Simon de 2–3 notas ("co" grave, "quí" agudo); al acertar los tres, el coro enciende el transmisor. Incluye una elección de diálogo con Luma que cambia la frase, no el desenlace.

## 4. Diario de Campo Boricua (12 coleccionables)
Se obtienen por proximidad, con tarjeta de una línea y silueta de primitivas.
- **Fauna (6):** coquí común, San Pedrito, reinita mariposera, dajao, jicotea, manatí (en el horizonte).
- **Cultura (6):** maraca, güiro, cuatro, petroglifo taíno, máscara de vejigante, pava jíbara.

Los datos deben validarse con una fuente cultural antes de publicar.

## 5. Ropa desbloqueable (ids de `wardrobe.js`)
| Hito | Desbloquea |
|---|---|
| M1 | `botas` azules |
| M2 | `pava` jíbara |
| M3 | `camisa` guayabera |
| 4 de fauna | `gorra` estilo "pr" |
| 4 de cultura | `mano` (maraca) |
| 12/12 | `camisa` "Deportiva 787" y `lentes` dorados |

Cada hito abre un cofre-pluma y se ve al instante en Vittata 3D.

## 6. Momentos "wow"
1. **Despegue del mirador:** el FOV se abre y aparecen las islas.
2. **Bahía bioluminiscente** (guiño a Vieques): nadando de noche, el agua deja estela azul.
3. **Coro de coquíes** al atardecer, con luciérnagas (Points).
4. **Bandada:** tras el último anillo, 20 cotorras (InstancedMesh) vuelan contigo.
5. **Crecida:** tiembla la cámara; escape en vuelo, sin castigo.

## 7. Feedback juicy
- **Sonido (WebAudio):** arpegio pentatónico ascendente al recoger (el combo sube la nota), ruido filtrado para dash y chapuzón, "co-quí" con osciladores, güiro con ráfagas de ruido. Volúmenes separados.
- **Cámara:** FOV +8 en dash/vuelo, sacudida al aterrizar, zoom en diálogo, hit-stop de 60 ms.
- **Partículas:** reutilizar `fx`, `ringFx`, `drops`; añadir `burst` (plumas, estrellas de la bandera).

## 8. Móvil
Ya existen joystick, Volar, Impulso, Saltar y Acción. Añadir: botón `Acción` contextual (verbo de `nearest()`), botón Bucear (hoy solo tecla `c`), asistencia de vuelo hacia anillos, botones de 56 px, modo zurdo, vibración al capturar, panel de misión de una línea.

## 9. Accesibilidad
`prefers-reduced-motion` apaga sacudida, FOV y destellos; subtítulos de sonido ("[canta un coquí a la izquierda]"); texto ajustable y remapeo de teclas; modo relajado (anillos grandes, flecha siempre, sin tiempos); iconos y formas además de color; Simon con opción "pasar" tras 2 fallos.

## 10. Features

| Feature | Pri | Implementación (enganche en `game.js`) |
|---|---|---|
| Módulo `AUDIO` WebAudio + volumen | P0 | Llamar desde `collect`, `splash`, `tryDash`, `tryJump`, `toast` |
| Flecha/haz guía | P0 | `updateGuide()` en `render`; destino según `S.step` en `checkProgress` |
| M1 Nado | P0 | Mover `c1` en `RESOURCES`; `collect` exige `MOVE.swimming`; burbujas con `drops` |
| M2 Anillos de vuelo | P0 | `RINGS` revisados en `update` con `MOVE.flying`; marcan `S.evaluated` vía `openParcelCard` |
| Acción contextual + Bucear táctil | P0 | Label de `b-act` desde `nearest()`; `b-dive` en `index.html` |
| Desbloqueo de ropa | P0 | `S.unlocked` en `SAVED_KEYS`; filtrar en `renderSlots`; otorgar en `checkProgress` |
| M3 Coquíes | P1 | `startChorus()` en paso 6; arbustos en `interactables`; `say` con opciones |
| Diario de Campo | P1 | `FIELD[]`; `collect` genérico; `renderQuest`; nuevo tipo en `logEvent` |
| `burst` y combo | P1 | Extender `fx`/`drops`; combo en `collect` |
| FOV, sacudida, hit-stop | P1 | `render` y `camDist()`; banderas en `MOVE` |
| Reducir movimiento y subtítulos | P1 | Objeto `A11Y` leído en `render` y `AUDIO`; panel de ajustes |
| Texto grande, remapeo, zurdo | P1 | Variables CSS; mapa de teclas en `update` |
| Bandada de cotorras | P2 | `InstancedMesh` en `render` al completar `STEPS[7]` |
| Bahía bioluminiscente | P2 | `S.clock` + `ringFx` azul en `update` |
| Final 12/12 | P2 | Flag en `ChapterCompleted`; `renderComic` |

## 11. Riesgos
Duración (8–12 min) y rendimiento móvil sin medir: limitar partículas a 200 y bandada a 20. Correr `AV.selfTest` tras cada P0.
