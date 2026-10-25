# GDD Capítulo 1 · «El día que el cielo se rompió»

Documento de diseño del capítulo 1 **puesto al día con lo que hay en `main`** (25 de octubre de 2026). Lo que falta está en `CAP1_PENDIENTE.md`; por qué se siente vacío y qué hacer, en `DIVERSION_CAP1.md`; cómo se juega en una página, en `docs/COMO_SE_JUEGA.md`. Historia y canon: `docs/STORY_BIBLE.md`, `docs/CHAPTER_01_SCRIPT.md`, `NARRATIVA_CAP1.md`.

**Principio (directiva V8.0): diversión primero.** Es un juego de aventura, exploración, creatividad y humor para niños y jóvenes de todas las edades. Lo educativo sale del juego de forma natural y tiene fuente verificable; no es el gancho ni se vende como «aprende ciencia». Sin anillos de vuelo, sin loot boxes, sin presión de compra, sin castigos irreversibles; Vittata (modelo y rig) no se toca.

## 1. Core loop (30–60 s)
**Ver pista → usar una habilidad → conseguir algo → recompensa que se ve → Diario, ropa o nido → pista nueva.** Siempre hay un objetivo visible (haz de luz y flecha) y una barra de 8 pasos. Lo que todavía falla del loop: la primera acción con habilidad llega al minuto ≈3, el mundo no se mueve solo y lo que se gana se ve tarde (`DIVERSION_CAP1.md` §1).

## 2. Ritmo
Los minutos son estimaciones; no hay medida con jugadores (P0-3). Piso automático del E2E: 5 min 42 s a 5 min 55 s sin leer ni explorar.

| Beat (paso de `historia.js`) | Habilidad | Qué pasa |
|---|---|---|
| Apertura (`inicio`) | ver | Negro con viento → taller con luz → ZZZT, sacudida y onda en el cielo → fundido |
| 1 `taller` | caminar, examinar | Máquina experimental y transmisor (E) |
| 2 `luma` | hablar | Luma pide ayuda y da 3 tablas |
| 3 `recolectar` · M1 | nadar, bucear | Madera y piedras al pasar; la pieza de metal en el fondo de la poza. Nace el nido |
| 4 `terrenos` · M2 | volar, nadar, hablar | «La ruta de la gota» (p1–p8) y los dos terrenos desde el aire |
| 5 `refugio` | construir | Fantasma verde/rojo; crecida con lluvia y trueno; desarmar y mover a la colina |
| 6 `guardian` | hablar | El Guardián conoce el refugio y regala el banco |
| 7 `transmisor` · M3 | escuchar, repetir | Simon de 3 coquíes; reparar el transmisor; símbolo de 36 y la Voz |
| 8 `mirador` | volar, ver | Islas, plano del bote, luz ×3; panel final |

## 3. Tres misiones (`content/cap1/misiones.js`)
**M1 · «Fondo del río» (nadar).** La pieza `c1` está sumergida; burbujas guían; bucear con C. Sin oxígeno ni enemigos. Premio: botas azules.
**M2 · «La ruta de la gota» (volar, nadar, hablar; `educativa.js`, `lecciones.js`).** Predecir con Luma, 4 perchas en flora real (suelo, sotobosque, dosel, emergente), cadena alimentaria, comparar terrenos desde el aire, seguir el vapor y la gota, bucear a la marca de crecida y explicarlo. Sustituye a la M2 de anillos, que el fundador rechazó. Premio: pava jíbara. Mejora propuesta: que p5–p8 se vuelen (`DIVERSION_CAP1.md` mejora 8).
**M3 · «Co-quí» (escuchar y repetir).** Tres coquíes en arbustos que brillan; Simon de 2–3 notas («co» grave, «quí» agudo); «Pasar» tras 2 fallos; elección de diálogo con Luma que cambia la frase, no el desenlace. Premio: camisa guayabera.

## 4. Diario de Campo Boricua (`content/cap1/coleccionables.js`)
12 hallazgos por proximidad, con tarjeta de una línea y silueta de primitivas. **Fauna (6):** coquí común, San Pedrito, reinita mariposera, dajao, jicotea, manatí. **Cultura (6):** maraca, güiro, cuatro, petroglifo taíno, máscara de vejigante, pava jíbara. Los 12 textos están **validados con fuente** (`DIARIO_VALIDACION.md`: DRNA, USFWS, USGS, ICP, Smithsonian, UICN, Cornell Lab, Ley 154-2003 y publicaciones académicas). El Diario trae además la sección «Amazonas del mundo» (`src/game/diario.js`, especies con datos verificados; 13 estados UICN esperan a Kelvin) y el Diario de ciencia de la ruta de la gota.

## 5. Ropa desbloqueable (ids de `src/personaje/wardrobe.js`)
| Hito | Desbloquea |
|---|---|
| M1 | `botas` azules |
| M2 «La ruta de la gota» | `pava` jíbara |
| M3 | `camisa` guayabera |
| 4 de fauna | `gorra` estilo «pr» (bandera fiel) |
| 4 de cultura | `mano` maracas |
| 12/12 | `camisa` «Deportiva 787» y `lentes` dorados |

Cada hito abre un cofre-pluma y se ve al instante en Vittata 3D. Lo bloqueado aparece apagado en «Mi personaje» con su pista. Pendiente de diseño: celebrar la combinación (foto, conjunto con nombre) y pieles de las 22 cotorras para el aprendiz (`DIVERSION_CAP1.md` §2).

## 6. Momentos «wow»
| Momento | Estado |
|---|---|
| Apertura con onda en el cielo | Hecho |
| Crecida: tiembla la cámara, lluvia y trueno, escape sin castigo | Hecho (sin «rescatar cosas en vuelo», mejora 4) |
| Plano del bote y luz que parpadea tres veces en el mirador | Hecho |
| Despegue del mirador con FOV abierto | Pendiente (P2-1, S) |
| Bandada de 20 cotorras (`InstancedMesh`) | Pendiente (P2-1, M) |
| Coro de coquíes al atardecer con luciérnagas | Pendiente; propuesto diferir al episodio 2 (decisión 7) |
| Bahía bioluminiscente | Pendiente; necesita noche (decisión 7) |

## 7. Feedback
- **Sonido (WebAudio sintético, `src/engine/audio.js` y `audio.define` del pack):** recoger, chapuzón, impulso, «co-quí», güiro, ZZZT, viento, lluvia, trueno, golpes al construir, BIP y estática del transmisor. Volúmenes separados. No hay música. Falta comprobarlo de oído en un dispositivo real.
- **Cámara (`camara.js`):** FOV en impulso y vuelo, sacudida al aterrizar y en la crecida; todo se apaga con «reducir movimiento».
- **Partículas (`fx`):** `burst` de plumas y estrellas, cofre-pluma, guía con haz y flecha.
- **Pendiente:** juice de vuelo (rasante, picado, aterrizaje perfecto), «Descubriste: …» al llegar a un lugar con nombre (`DIVERSION_CAP1.md` mejoras 2 y 6).

## 8. Móvil
Hecho: joystick, Volar/Aterrizar, Saltar, Impulso, Acción contextual (verbo de `nearest()`), Bucear táctil, botones de 44 px o más (matriz 375×812). Pendiente: modo zurdo (D4), vibración al capturar y prueba en un iPhone y un Android reales (P0-4).

## 9. Accesibilidad
Hecho: `prefers-reduced-motion` apaga sacudida, FOV y destellos; «Pasar» en el Simon; iconos y formas además de color; remapeo de las teclas de mover, volar, aterrizar y acción con «Restablecer teclas» (`input.js`); subtítulo del Simon («[Canta un coquí…]»). En curso (D2): tamaño de texto en 3 niveles y alto contraste. Pendiente (D4): subtítulos de sonido generales, modo relajado (guía siempre visible, sin tiempos) y modo zurdo.

## 10. Modo Retos (`src/game/retos.js`)
Arcade de habilidad sobre el mismo mundo, desde la portada o la pausa, con «Otra vez» al instante y la partida de la historia intacta (instantánea del estado, guardado suspendido). **Carrera en El Yunque:** 3 rivales con otros plumajes, 6 puntos de control con banderín y flor de maga (nunca anillos), corrientes de aire, meta en el Mirador Yokahú, medallas y récord. **¡Escapa de la tormenta!:** 90 s de vuelo bajo sobre el mar, ramas y rayos anunciados antes, semillas doradas con combo, 3 plumas de vida. Récords en el dispositivo. Siguiente paso: retos dentro del mundo, fantasma propio y código de amigo sin red (`DIVERSION_CAP1.md` mejora 7).

## 11. Features: estado y dónde viven
| Feature | Estado | Dónde |
|---|---|---|
| Audio WebAudio con volúmenes | Hecho | `src/engine/audio.js`, `audio.define` en `content/cap1/pack.js` e `historia.js` |
| Flecha y haz guía | Hecho | `fx.guide`, `misiones.guideTarget` |
| M1 nado y buceo | Hecho | `content/cap1/misiones.js`, `mundo.js` (`c1`, `fondo: true`) |
| M2 ruta de la gota (en lugar de anillos) | Hecho | `content/cap1/educativa.js`, `lecciones.js`, `assets/data/lecciones_cap1.json` |
| Paradas de aprendizaje | Hecho | `content/cap1/paradas.js` |
| Acción contextual y Bucear táctil | Hecho | `src/game/interaccion.js`, `src/engine/input.js` |
| Desbloqueo de ropa | Hecho | `coleccionables.js` (`ropa`), `src/game/misiones.js` |
| M3 coquíes | Hecho | `content/cap1/misiones.js` (`startChorus`, `startSimon`) |
| Diario de Campo (validado) y Amazonas del mundo | Hecho | `coleccionables.js`, `src/game/diario.js` |
| Nido y criadero | Hecho | `src/game/criadero.js`, `content/comun/huevos.js` |
| Cómic con hechos reales, PNG/PDF | Hecho | `src/game/comic.js`, `pack.js` (`vinetas`) |
| Apertura, sonidos de crecida, plano del bote, luz ×3, Voz neutra | Hecho | `content/cap1/historia.js`, `pack.js`, `mundo.js` |
| Panel final: Seguir explorando, Comenzar de cero con pregunta | Hecho | `src/game/misiones.js`, `src/engine/guardado.js`, `index.html` |
| Reducir movimiento, remapeo de teclas | Hecho | `renderer.js`, `camara.js`, `input.js` |
| Calidad automática en equipos modestos | Hecho | `renderer.js` (`perfilEquipo`) |
| Modo Retos | Hecho | `src/game/retos.js` (carga perezosa) |
| Texto grande y alto contraste | En curso (D2) | `src/game/accesibilidad.js`, `src/ui/ui.css` |
| Subtítulos generales, relajado, zurdo | Pendiente (D4) | mismos archivos e `input.js` |
| Bandada, luciérnagas, bahía, engranaje visible | Pendiente (P2-1, P2-2) | `content/cap1/mundo.js`, `historia.js`, `fx` |
| Modelos 3D de Luma y el Guardián; máquina y transmisor con calidad comercial | Pendiente (P1-6, P2-5; decisiones 5 y 6) | `tools/blender/`, `assets/models/` |

## 12. Riesgos y decisiones abiertas
- **Duración y FPS sin medir** en jugadores y equipos reales (P0-3, P0-4). Límites del motor: partículas a 200, bandada a 20.
- **Canon:** aprobación del guion, forma del Guardián, orden de su llegada, medalla, cara definitiva de la Voz, diseño de la máquina y el transmisor, duración meta, idioma, taller con interior (`CAP1_PENDIENTE.md` §3). Son de Kelvin.
- **Diversión:** el capítulo pide leer y caminar el 65 % del tiempo y volar con habilidad menos del 10 %. Las cinco mejoras ★ de `DIVERSION_CAP1.md` (Luma llama desde arriba, lo que gano se ve, diálogo que no bloquea, la crecida se juega, cómic con humor y foto) son el siguiente trabajo de diseño del capítulo.
