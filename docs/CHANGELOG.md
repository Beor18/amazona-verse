# CHANGELOG

## 24 oct 2026 · v0.5: Vittata 3D original y accesorios modulares
- Vittata en 3D con el modelo original de Kelvin (`cotorrofiver.blend`) y su textura mejorada: esqueleto de 59 huesos, 5 animaciones (espera, bienvenida, celebrar, curiosidad, caminar), 28k triángulos, 1,3 MB.
- Taller de los Guardianes: el creador muestra al personaje 3D animado, que se puede girar, saluda al entrar, celebra cada cambio y se pone curioso si lo dejas quieto.
- 6 accesorios 3D modulares en 7 puntos de montaje (cabeza, ojos, cuello, pecho, espalda, dos alas): sombrero, gafas, pañuelo, brújula, mochila (provisional) y brazaletes, cada uno con colores. Miniaturas 3D.
- Plumajes por especie con máscara sobre la textura original (parche, anillo de ojos, pico).
- Vittata y el aprendiz caminan en 3D dentro del juego; el retrato del cómic sale del mismo modelo.
- Perfiles anteriores se convierten al formato nuevo.

## 24 oct 2026 · v0.4: el mirador
- Paso 8 del capítulo: subir al mirador de la colina; océano, tres islas lejanas y niebla luminosa (página 12 del guion).
- Guardado v4 con migración desde v3 y v2.

## 24 oct 2026 · v0.3: personaje y cómic
- Creador de personaje (nombre inventado, 8 plumajes, pañuelo, accesorio) y aprendiz que acompaña a Vittata.
- Eventos con el esquema del directivo V4; migración de partidas v2 → v3; copia de respaldo y de partidas ilegibles.
- Editor de cómic: portada, diseño (cuadrícula o tira), reordenar y editar viñetas; exportar PNG y PDF.
- Solo aparecen viñetas de eventos que ocurrieron.
- Descarga del PNG y del PDF con la capacidad oficial del visor de Claude (con confirmación del jugador).
- Correcciones: retrato completo en la tira vertical; el aprendiz sale en las capturas; panel de misión compacto en móvil; aviso de Three.js.

## 24 oct 2026 · v0.2: capítulo 1 de Kelvin
- Guion "El día que el cielo se rompió": Luma, el Guardián Constructor, el transmisor y el símbolo de los 36.
- Corregir la decisión del terreno (desarmar y reconstruir) sin castigos irreversibles.
- Registro de eventos y primera página de cómic en PNG.
- Modelo Blender convertido a GLB (sin usar todavía).

## 24 oct 2026 · v0.1: hito 1
- Mundo 3D, Vittata como sprite, recursos, dos terrenos, construcción, crecida, taller, guardado versionado.

## 2026-10-24 · Mundo con el mapa original
- Suelo con texturas del mapa 3ds Max (pasto pintado + suelo de selva; arena solo en la orilla del río).
- Palmas (2 de cada 3 árboles) con hoja y corteza del mapa original; colisiones sin cambios.
- Río con normal map animado.
- Islas lejanas con el relieve real del terreno de Kelvin (`isla_mapa.glb`, 14k tris, con respaldo base64 para el artifact).
- Pruebas: selfTest 45/45, accessoryTest 10/10.
- Pendiente: edificios (`AV3DMaxExportBuildings.zip`, 1,3 GB en Drive) sin descargar.

## 2026-10-24 · Movimiento de acción
- Alas animadas sobre cualquier clip: balanceo al caminar, aleteo al saltar, alas abiertas al planear e impulsarse.
- Movimiento con aceleración, correr (Shift o joystick a fondo), doble salto con aleteo, tiempo de coyote, impulso (F / botón Impulso, uno en el aire).
- Giro suave, inclinación al correr y aplastón al aterrizar; la animación de caminar se acelera con la velocidad.
- Choques reales con la caja del taller y el banco; Luma también choca; el mirador es suelo.
- Los materiales se recogen al pasar por encima (E / Acción sigue funcionando).
- Pruebas: selfTest 45/45, accessoryTest 10/10; movimiento medido: caminar 6,2 m/s, correr 10 m/s, impulso 4,75 m, salto 1,1 m, doble salto 2 m.

## 2026-10-24 · Paso nuevo de Vittata
- El clip Walk original casi no movía las patas (arrastraba los pies). Se añade un paso procedural sobre el rig:
  muslo/rodilla/tobillo con levantamiento real, rebote del cuerpo (dos por ciclo), balanceo lateral, inclinación al correr,
  cabeza que compensa, cola que se mece y patas recogidas en el aire. Caminar 3,4 pasos/s, correr 4,8 con zancada mayor.
- Arreglo: los ajustes por hueso se deshacen antes de mezclar (el mixer de three solo reescribe cuando el clip cambia).
- Antes/después: `docs/img/paso_antes.png`, `docs/img/paso_nuevo.png`. Pruebas: 45/45 y 10/10.

## 2026-10-24 · Cara, manos y cintura
- Nuevo hueso `pico` (mandíbula inferior) en el rig: 351 vértices bajo la línea blanca de la boca, pesos suaves hacia las comisuras; +X abre.
  Scripts en `tools/blender/` (beak2 línea de la boca, beak3 pesos, beak5 hueso + exportación desde o_final.blend, eyes medición de ojos).
- Párpados 3D sobre los ojos pintados (medidos: radio 6,6 cm, sobresalen 2,2 cm; datos en `vittata_mounts.json` → `eye_lids`).
- Expresiones: neutral, contento, sorprendido, triste, curioso, enojado (párpados, pico, cabeza). Parpadeo automático (a veces doble).
- Hablar: el pico se mueve con ritmo de sílabas, la cabeza asiente y las manos gesticulan; en diálogos el tono de la frase elige la cara; si habla otro, Vittata escucha con curiosidad.
- Mira alrededor cuando está quieta. Hombros/codos/dedos con vida; cintura gira con el paso y el pecho contrarresta.
- Pruebas: 45/45 y 10/10.
