# K4-08 · Decisiones de Kelvin: lo que sigue abierto (6-nov-2026)

Cruce de `docs/equipo/PENDIENTES_KELVIN.md` (PK), `docs/equipo/DECISIONES_KELVIN_LISTA.md` (DKL), `docs/DECISION_LOG.md` (DL, hasta el 6-nov), `docs/DIRECTIVA_PLEHA_04NOV.txt` (PLEHA), `docs/DIRECTIVA_V18_3_RESOLUCION.md` (V18.3R) y `docs/equipo/KELVIN_CERRAR_HOY.md` (KCH). También se consultaron `docs/equipo/V18_3_AUDITORIA.md` §6, `docs/equipo/V18_MATRIZ_36.md`, `docs/equipo/ESTADO_REAL.md` y `docs/equipo/BUGS.md` para comprobar el estado.

Este documento no decide nada. Cada fila lleva su referencia. Si el equipo no ha hecho una recomendación, la fila dice «sin recomendación».

## 1. Siguen abiertas, empezando por lo que más frena

| # | Id (origen) | Pregunta | Opciones | Recomendación del equipo | Qué bloquea |
|---|---|---|---|---|---|
| 1 | A9 / KCH B8 / PK 32 | ¿Se aprueba el aspecto de la Ciudad de los 36? | Sí, o qué cambiar después de ver las capturas de BM133, BM134 y BM136 | Mirar las capturas y responder (KCH B8) | El cierre del cap. 6, que está al 56 % (`ESTADO_REAL.md:29`). También el encuentro final en la Ciudad (H13, K25 B). PLEHA A9: «No aprobar el resultado definitivo sin revisar imágenes». |
| 2 | KCH B12 (KIMI-122) | ¿Se aprueban las cotorras vivas nuevas («todo como los personajes actuales», DL 6-nov)? | Sí, o pedir cambios después del antes y después | Mirar el antes y después y decir sí (KCH B12) | La ciudad viva y el cap. 6. `ESTADO_REAL.md:40` lo marca como el riesgo n.º 1 contra la calidad comercial. |
| 3 | KCH B6 / PLEHA H18 / auditoría V18.3 §6.6 | Cap. 3: ¿sigue en la desembocadura o pasa a Puerto de La Mina? | (a) desembocadura, como en el código (`zonas.js:21`); (b) mudarlo a Puerto de La Mina | (a): cuesta de 0,5 a 1 día; mudarlo cuesta de 3 a 5 días más (KCH B6) | El cierre del cap. 3. **Choca con lo ya firmado:** en H18 a Kelvin aprobó «Capítulo 3: Puerto de La Mina» (PLEHA:86), y la primera misión V18.3 es en Puerto de La Mina sin «modificar el capítulo principal asociado al lugar» (V18.3R §7). `ESTADO_REAL.md:224` cree que H18 copió la propuesta del 1-nov. Kelvin tiene que aclararlo. |
| 4 | K23 / KCH B9 | ¿Cómo es el dibujo final del emblema del pacto? | (a) lo dibuja Kelvin; (b) el equipo propone 3 y Kelvin elige uno | Cualquiera de las dos (KCH B9) | El cierre del cap. 6 (`ESTADO_REAL.md:261`). Que el pacto es un emblema físico ya está firmado (H6 b). Falta solo el dibujo. |
| 5 | KCH A1 | Cap. 1: ¿se aprueban en bloque las 15 fichas que pasen a tener fuente oficial? | (A) aprobarlas en bloque si la fuente es oficial; (B) revisarlas una por una | A: Kimi 4 trae las fuentes (K4-02) y las que no tengan fuente oficial siguen ocultas | Que se muestren esas fichas y las preguntas q3 y q4 del Aula del cap. 1. Mientras tanto quedan ocultas, que es lo correcto (KCH, «no se puede cerrar hoy»). |
| 6 | KCH A2.1 / A2.2 / A2.3 (K55, K56, K57) | Otras fichas: la casa criolla del cap. 2, la etimología de «canoa» del cap. 3 (más CG-51) y la ficha «esperan» del cap. 6 | A2.1 aprobarla en bloque o revisarla; A2.2 aceptar la RAE con enlace; A2.3 citar el catálogo por especie o quitar la cifra | Las de KCH A2. Para A2.3, E3 ya prohíbe presentar «34 vivas y 2 extintas» como clasificación definitiva sin verificarla (PLEHA:59) | Que se muestren esas fichas. CG-51 deja `temporadaRealEnTest` en 9/10 (`ESTADO_REAL.md:225`). |
| 7 | KCH B5 (minigolf) | ¿Es divertido el hoyo 1? | Sí: se hacen los otros 5. No: se rediseña | Que lo pruebe con sus hijos (KCH B5) | Los hoyos 2 a 6. Lo que pide DL 5-nov es «un hoyo completo antes de pensar en seis». |
| 8 | KCH B4 (V18.2) | ¿Valen como punto de partida estos números: nivel 10 en la primera sesión y nivel 20 en 2 o 3 sesiones? | Sí, o dar otros | Sí, y se ajustan después de jugar (KCH B4; `V18_2_DISENO.md:43`) | El ajuste del prototipo V18.2. La V18.2 en sí ya está aprobada para prototipo (DL 6-nov). |
| 9 | KCH B3 (matriz de 36) | ¿Cómo se aprueban las siguientes tandas de poderes (descubrimiento por especie, lugares y balance)? | (a) el equipo propone tandas de 6 y Kelvin las aprueba en bloque; (b) otra forma | (a) (KCH B3) | Los poderes que vienen después de los 4 ya aprobados (Quiebro, Lluvia de semillas, Ojo del cenote y Ala fuerte; DL 5-nov). |
| 10 | V18.3R §1 y §10 / auditoría V18.3 §6.9 / KCH C | Derechos de los seis modelos: ¿hay cesión o licencia por escrito del colaborador? ¿Quién hizo «cotorrofiver»? | Confirmarlo por escrito, o no publicar esas piezas | Sin recomendación. V18.3R ordena verificarlo por separado antes de publicar | Publicar cualquier cosa de V18.3 (V18.3R §11: «No publicar recursos con derechos pendientes»). La auditoría señala que «cotorrofiver» afecta también a Vittata. No frena los prototipos internos. |
| 11 | Auditoría V18.3 §6.1 y §6.5 | Lo que la resolución dejó sin contestar: (a) la altura de los humanos al lado de las cotorras (1,4 m); (b) la especie y la piel del Guardián del Primer Vuelo, para que no se confunda con Vittata | (a) una cifra; (b) una especie o piel que no sea la de vittata | (b): una piel de otra especie, nunca la de vittata (auditoría §2, `V18_3_AUDITORIA.md:106`) | Las fases 2 y 5 de V18.3 (V18.3R §12): la escala del Constructor y el prototipo del Piloto Cotorra. |
| 12 | KCH B11 | En el iPhone, en calidad «bajo», ¿el kit de arte se carga a 512 px? | Sí / no | Sí, para que no se cierre por memoria | La estabilidad en el iPhone (prioridad 1, PLEHA). |
| 13 | KCH B1 | ¿Se quedan quitados los árboles alrededor del círculo del duelo (13 m) y en el paso del puente, solo con `?v18=1`? | Sí / no | Sí | La demo V18.1. |
| 14 | KCH B7 / PLEHA H1 / PK 2 | ¿Se aprueba el guion final del cap. 1? | (a) tal cual; (b) con cambios; (c) seguir pendiente | Aprobar el guion actual (KCH B7) | Que `CHAPTER_01_SCRIPT.md` deje de figurar como «propuesto». H1 c lo dejó pendiente sin frenar el trabajo. |
| 15 | DL 4-nov («Música») | Música: faltan los MP3 de los dos temas aprobados y verificar sus derechos de uso comercial | Entregar los MP3 y la licencia | Sin recomendación | Los temas de la ciudad de noche y de las sorpresas. PK 0.2 dice que Suno lo cubre la cuenta comercial de Kelvin; el 4-nov la verificación seguía pendiente. |
| 16 | Aclarar canon: PLEHA H4 frente a DL 5-nov | Mara y Vela: H4 dice que en la temporada 1 orientan «sin nombramiento formal como consejeras». DL 5-nov dice «En la temporada 1 son consejeras y no se pueden elegir» | Fijar una de las dos frases | Sin recomendación | No frena nada técnico. Es el texto de `V18_MATRIZ_36.md:13` y las líneas del cap. 6 (K30 A: no se formaliza). |
| 17 | Legal (KCH E; PLEHA L1, L3 y L6; PK 42–45) | Antes del lanzamiento público: revisión COPPA con abogado, apagar la analítica de Vercel, acuerdos de datos con Vercel y Supabase, firmar el programa de seguridad, recibos de KitBash3D y Archmodels, revisión de la bandera para ropa y ventas, y un host apto para niños | Firma de Kelvin o de un abogado | El criterio ya está firmado (L1 a+b, L3 a, L6 a). Falta ejecutarlo. Supabase no se toca hasta que Kelvin lo diga (DL 5-nov) | El lanzamiento público y el piloto con niños. No frena lo técnico (PK §0). Borradores en `docs/legal/`. |
| 18 | Restos menores de PK que PLEHA no cubrió | PK 23: ¿«wow» obligatorios en el cap. 1? ¿El taller tiene interior en el cap. 1 o después? (hoy: después). PK 31: orden de los retratos de la Abuela, el Papá, Iguaca y Nudo. PK 41: orden de mudanza de los caps. 5 y 6. PK 49: parcelas de creación | Las de PK | Sin recomendación | Poco. Si no contesta, se queda lo de hoy (PK §0). |

**No son decisiones, pero frenan más que casi todo lo anterior:**
- La prueba con niños de los caps. 2 a 6 y de la demo `?v18=1` (KCH D1; PLEHA P4). Con ella la temporada pasaría del 74 % al 83 %. Necesita el permiso de los padres.
- Las pruebas físicas en iPhone, iPad, Android y Chromebook (PLEHA P1–P3; KCH D2 y D3).

## 2. Ya decididas, aunque los documentos las siguen mostrando abiertas

- **DKL, tablas K1–K50: casi todas siguen con la columna «Si no decides».** Kelvin contestó el 4-nov: «K8 C, K25 B, K32 B, K35 B, K36 B, K42 B, K47 B […] Todas las demás A» (DKL «Respuestas»; DL 4-nov). Casos concretos:
  - **K35:** DKL dice «no se aplica hasta que Kelvin diga cómo rehacer el paso 4». PLEHA H2 a (4-nov) sustituye a K35 B: el Guardián sigue llegando al construir.
  - **K48:** DKL dice «Se quedan los de ahora hasta que elijas». La A ya está en el código: Nido, Bosque, Cielo y Leyenda (`content/comun/huevos.js:199-210`).
  - **K1:** la A ya está aplicada: «Villa Mangle · Mesa del Este» (`src/game/comunidades.js:21`). PK 13 dice todavía que falta.
  - **K46, K54–K57:** cubiertas por PLEHA E5, E8, E9, E6 y E3.
- **PK §0 (legal y dinero):** las licencias 3D (L1 a+b), la política solo CC0 (L2 a), el ranking (L3 a, desactivado), los límites de la build (L10 b, presupuestos por aparato) y la monetización (L7 b sin precios públicos; L8 b cartas sin venta). Fuente: PLEHA:44-52, DL 4-nov. Lo que queda es ejecutarlo (fila 17).
- **PK §1, canon:**
  - 5 → H3 a / K15 A
  - 6 → H4 (ver la fila 16)
  - 8 → H5 a / K16 A
  - 9 → H6 b / K23 A
  - 10 → H7 b / K14 A
  - 11 → H8, misterio / K41 A
  - 14 → H9 b
  - 15 → CG-60 A / K38
  - 16 → H10 a, E7 a, DL 1-nov
  - 17 → H11 / K7, K10, K40
  - 19 → H12 / K17, K20, K21
  - 20, lo que faltaba → H13 / K24–K31
  - 21 → H14 a, H15 b
  - 22 → H16 a
  - 23, la duración → H17
  - 24 → H19 b

  Fuente: PLEHA:69-88.
- **PK §2, arte:**
  - 25 → A4 c
  - 26 → A5 a / K39 A
  - 27 → A2 a
  - 28 → A6 a
  - 29 → A7 b
  - 30 → A8 a

  Fuente: PLEHA:93-100. La 32 sigue abierta: es la fila 1.
- **PK §3, datos:**
  - 33 → DL 2-nov (12 estados UICN al catálogo) y E4 c (una por una)
  - 34 → E2 c
  - 35 → E1
  - 36 → E6 a / E7 a

  Lo mismo vale para KCH A2.4: la decisión es E4 c, no «en bloque».
- **PK §4–§6, producto, legal y mapa:**
  - 37 → H20 a
  - 38 → L8 b
  - 39 → L7 b
  - 40 → L9 a
  - 43, las fuentes → L5 a
  - 44 → L6 a
  - 45 → L1
  - 47 y 48 → H18 a (cap. 4: el río al este de Villa Raíz)
- **KCH A2.5 (`"grados": "3-6"`):** no hay nada que decidir. Es regla de Kelvin («nunca escribas grados 3 a 6», `CLAUDE.md`). Queda solo la tarea K4-01.
- **KCH B2 (QA-173):** ya corregido como se recomendaba. En el duelo, G solo es Poder y no inclina la cámara (`BUGS.md:37`, «resuelto (local, sin push)»).
- **KCH B7, la mariposa (K46):** PLEHA E5 la decidió. La cebra se queda de forma provisional.
- **KCH B10 (piel provisional de Mara y Vela, `a188c4e9`):** Kelvin la pidió el 2-nov («Busca cómo se veían y hazlas», DL 2-nov). PLEHA A4 c limita su uso: en la revelación de la temporada 1 son solo voces y luces.
- **`V18_MATRIZ_36.md`, «Estado: propuesta, pendiente» y sus 4 preguntas:**
  - Kelvin aprobó la base con nombres provisionales y los 4 poderes siguientes.
  - Mara y Vela se quedan sin poderes jugables en la temporada 1.
  - Fuente: DL 5-nov, confirmado el 6-nov.
- **`V18_3_AUDITORIA.md` §6, puntos 1–8 y 10, contestados por V18.3R:**
  - Hay humanos (§2).
  - El padre guía es el Papá del cap. 2 (§5).
  - Nombres base (§6).
  - Mundo abierto con el arco en la temporada 3, y los caps. 1–6 no se tocan (§3 y §4).
  - El Piloto Cotorra es mentor de vuelo (§6F).
  - La misión va en Puerto de La Mina (§7).
  - La Ingeniera ayuda a desactivar y a reparar (§6B y §7).
  - El estilo se adapta a Amazona Verse (§10.8).

  Siguen abiertos el punto 9 (fila 10) y parte del 1 y del 5 (fila 11).
- **DL 6-nov, «Recursos 3D de Kelvin disponibles (sin uso decidido)»:** V18.3R §6 les da uso a Human, Girl, Monkey, Shiba, Cat Superior Moon y Piloto Cotorra.
