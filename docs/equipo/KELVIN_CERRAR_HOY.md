# Lo que falta de Kelvin para cerrar (6-nov-2026)

Todo lo que hoy depende de Kelvin, en un solo sitio. Cada punto trae una **respuesta recomendada**: basta con contestar «1 sí, 2 sí, 3 B…» o «todo como recomiendas». Fuentes: `ESTADO_REAL.md` §10, `content/*/lecciones.js`, `V18_3_AUDITORIA.md` §6, `BUGS.md` y `DECISION_LOG.md`.

## A. Datos educativos (lo que pediste ver)

**Cómo funciona hoy:** cada ficha tiene un estado.
- **«verificado»:** se publica.
- **«parcial»:** la fuente es buena pero falta citar la página exacta. Hoy sí se publica.
- **«por_verificar»:** no se publica hasta que lo valide DRNA, USFWS o USDA FS.

El juego ya cumple esa regla; lo que falta es subir fichas a «verificado».

### A1. Capítulo 1: 15 de 23 fichas sin «verificado»

| Ficha | Estado | Lo que dice | Fuente que tiene |
|---|---|---|---|
| cotorra_1975 | parcial | En 1975 quedaron solo 13 cotorras | USFWS (comunicado de 1975) |
| zorzal_pardo | parcial | El zorzal pardo compite con la cotorra por los huecos | USFWS (comunicado de 1975) |
| cotorra_alimento | por_verificar | Come frutos y semillas, como los de la palma de sierra | Pendiente (plan de recuperación USFWS) |
| capas_bosque | por_verificar | El bosque se estudia por capas: suelo, sotobosque, dosel y emergentes | Pendiente (USDA FS / IITF) |
| bosque_tipos | parcial | 4 tipos de bosque por altura: tabonuco, palo colorado, palma de sierra y enano | USDA FS, El Yunque |
| lluvia_bosque_enano | parcial | En el bosque enano caen de 150 a 200 pulgadas de lluvia al año | USDA FS, El Yunque |
| tabonuco | parcial | El bosque de tabonuco está por debajo de unos 2,000 pies | USDA FS, El Yunque |
| helecho_gigante | parcial | Los helechos gigantes son comunes en El Yunque | USDA FS, El Yunque |
| arboles_nativos | parcial | Más de 240 especies de árboles nativos; 23 solo crecen allí | USDA FS, El Yunque |
| bromelia | por_verificar | Las bromelias crecen sobre las ramas y guardan agua | Pendiente (USDA FS) |
| coqui_bromelia | por_verificar | El coquí nace sin etapa de renacuajo y pone huevos en sitios húmedos | Pendiente (DRNA); referencia IUCN GISD |
| heliconia | por_verificar | La heliconia tiene brácteas rojas que visitan los colibríes | Pendiente |
| ceiba | por_verificar | La ceiba es de los árboles más altos, con raíces en tablas | Pendiente (USDA FS) |
| bambu | parcial | El bambú común (*Bambusa vulgaris*) es introducido en Puerto Rico | IUCN GISD (validar con USDA FS) |
| ciclo_agua | parcial | El Sol evapora el agua, se forman nubes, llueve y el agua vuelve a ríos y mar | USGS Water Science School |

Además, en el Aula del cap. 1 hay 2 preguntas (q3 y q4) en «por_verificar».

**Decisión A1:**
- **Recomendada (A):** Kimi 4 está buscando hoy las fuentes exactas de las 15 (tarea K4-02, con enlace y cita). Las que salgan con fuente oficial pasan a «verificado» con tu visto bueno en bloque. Las que no, se quedan ocultas como ahora. Tú solo dices «sí, en bloque, si la fuente es oficial».
- **B:** revisarlas tú una a una.

### A2. Otras fichas
| # | Qué | Recomendada |
|---|---|---|
| A2.1 | Cap. 2, la casa criolla (E9): revisar la fuente | Igual que A1: Kimi 4 la busca y tú apruebas en bloque |
| A2.2 | Cap. 3, etimología de «canoa» (del taíno, según la RAE) y CG-51 (en inglés la fuente sale en español) | Aceptar la de la RAE con enlace; arreglar CG-51 traduciendo la fuente |
| A2.3 | Cap. 6, ficha «esperan» («34 vivas y 2 extintas», sin fuente) | Citar el catálogo del juego con sus fuentes por especie (`content/comun/especies.js`), o quitar la cifra de la ficha |
| A2.4 | Estado UICN de 13 especies que no coinciden con el catálogo (`ESPECIES_DISCREPANCIAS.md`) | Usar siempre el de la Lista Roja de la UICN vigente, con fecha; Kimi 4 lo trae hoy (K4-14) y se actualiza en bloque |
| A2.5 | Campo `"grados": "3-6"` en los datos de lecciones | Cambiarlo a «Nivel 1 / Nivel 2» o borrarlo (Kimi 4, K4-01, mira si se ve en algún sitio) |

## B. Decisiones rápidas del juego (minutos)
| # | Decisión | Recomendada |
|---|---|---|
| B1 | Árboles quitados alrededor del círculo del duelo (13 m) y en el paso del puente, solo con `?v18=1` | Sí, se quedan |
| B2 | QA-173: en el duelo, G es Poder pero también inclina la cámara | Que en el duelo G sea solo Poder |
| B3 | Matriz de 36 poderes: cómo se descubre cada especie, nombres de lugares y balance | Que el equipo proponga las siguientes 6 y tú apruebes en bloque cada tanda |
| B4 | V18.2: los números de niveles y etapas del prototipo (nivel 10 en la primera sesión, nivel 20 en 2 o 3) | Sí como punto de partida; se ajusta tras jugarlo |
| B5 | Minigolf: ¿es divertido el hoyo 1? (antes de hacer los otros 5) | Pruébalo con tus hijos y di sí o no |
| B6 | Cap. 3: ¿se queda en la desembocadura o se muda a Puerto de La Mina? | Se queda en la desembocadura (0,5 a 1 día; mudarlo cuesta 3 a 5 días más) |
| B7 | Cap. 1: revisión final del guion (H1 c) y la mariposa (K46) | Aprobar el guion actual; la mariposa como esté |
| B8 | Ciudad de los 36 (A9): aprobación visual | Mirar las capturas de BM134 y decir sí o qué cambiar |
| B9 | Emblema del cap. 6 (K23) | Un dibujo tuyo, o que el equipo proponga 3 y eliges |
| B10 | Piel provisional de Mara y Vela (`a188c4e9`) | Sí como provisional |
| B11 | En el iPhone, kit de arte a 512 px en calidad «bajo» | Sí (evita que se cierre por memoria) |
| B12 | Cotorras vivas nuevas (KIMI-122) | Mirar el antes/después y decir sí |

## C. V18.3, los seis personajes (10 decisiones de `V18_3_AUDITORIA.md` §6)
| # | Pregunta | Recomendada |
|---|---|---|
| C1 | ¿Hay humanos en Amazona Verse? | Solo en la capa V18 o en la temporada 3, no en los caps. 1–6 |
| C2 | ¿Quién es el «padre guía»? | El Guardián |
| C3 | Nombres de Human, Girl, Shiba, Monkey, Cat y Piloto | Que el equipo proponga 3 por personaje |
| C4 | ¿Solo en la capa V18 y la temporada 3? | Sí |
| C5 | Piloto Cotorra: ¿anfitrión de Retos o mentor? | Anfitrión de Retos, con otra especie y piel distinta de Vittata |
| C6 | Lugar de la fase 2 | Puerto de La Mina |
| C7 | Función de Girl | La que conoce la máquina y lo explica |
| C8 | Cat mentor y Monkey de obstáculos, como fantasía | Sí |
| C9 | Derechos de los seis `.blend` (colaborador, «FeixZero», «cotorrofiver»); quitar Real Madrid, foto y katana | Confirmación escrita del colaborador; sí a quitar esos tres |
| C10 | Estilo: ¿cyberpunk o toon vibrante? | Toon vibrante con un toque tecnológico |

## D. Lo que necesita tu tiempo o tus aparatos (no se decide, se hace)
| # | Qué | Tiempo |
|---|---|---|
| D1 | **Prueba con niños** de los caps. 2 a 6 y la demo `?v18=1`. La guía la prepara Kimi 4 (K4-07). Es lo que más acerca el cierre: la temporada pasaría de 74 % a 83 % | 2 a 3 h |
| D2 | Jugar la demo y el minigolf en tu iPhone o iPad y mandar un video o `#fps` | 30 min |
| D3 | Conseguir un Chromebook escolar para medirlo | — |
| D4 | Kimi en la PC: comprobar que las 3 ventanas volvieron a trabajar con el plan Ultra | 5 min |

## E. Legal (no lo cierra el equipo; necesita tu firma o un abogado)
- Privacidad infantil, licencias de modelos de terceros, el reglamento de la bandera en ropa y ventas, la ronda con niños de la V18.1 (permiso de los padres) y el ranking en línea (apagado).
- Pendientes del 5-nov: apagar la analítica de Vercel, los acuerdos de datos con Vercel y Supabase, y firmar el programa de seguridad.
- **Supabase no se toca** hasta que tú lo digas (5-nov).

## Lo que no se puede cerrar hoy aunque contestes todo
- La prueba con niños: necesita a los niños y el permiso de sus padres.
- El Chromebook: necesita el aparato.
- La parte legal: necesita la revisión.
- Las fichas sin fuente oficial: quedan ocultas, que es lo correcto.

El resto, con tus respuestas, el equipo lo cierra en **5 a 9,5 días de trabajo** (`ESTADO_REAL.md` §11).
