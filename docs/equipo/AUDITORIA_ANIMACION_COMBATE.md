# Auditoría de animación de combate (Amazona Combat Animation 2.0 · etapa 1)

10-nov-2026 · Kelvin: «las cotorras en los duelos parecen zombis: rígidas, sin personalidad, no abren el pico, ataques sin energía».
Esto es solo la auditoría. Nada del juego cambia con este documento. La evidencia sale de leer los .glb (JSON y pesos de
vértices) y de una sonda en Chrome que renderiza la cabeza de lado y gira el hueso `pico` en cada eje.

## 1. Modelos que se usan

| Quién | Modelo | Rig |
|---|---|---|
| Vittata (jugadora), rival del duelo («Campeona»), Jugador 2 (Duelo de 2), Iguaca y cotorras NPC, cotorras en línea, criadero, cómic | `assets/models/vittata.glb` (por `AVCharacter.create`; la especie es solo piel con `applyLook`) | 1 piel con 60 huesos |
| Chispa, Maestro Moon, Guardián del vuelo, Constructor, Ingeniera, Tuerca | `assets/models/personajes/*.glb` | Sin piel: piezas rígidas que se mueven por nodos. **No son cotorras** (hocico, orejas o bigotes) y no salen en el duelo |
| `vittata_base.glb` y `vittata_base_lod1.glb` | Mallas estáticas, sin piel ni clips | — |

Todas las cotorras comparten el rig de Vittata. Ninguna trae un rig propio.

## 2. El rig de `vittata.glb`

| Parte | Huesos | ¿Se anima hoy en el duelo? |
|---|---|---|
| Cuerpo | `root`, `espalda1`, `espalda2` | Sí: procedural (inclinación y respiración, en `vida()`) |
| Cuello y cabeza | `cabeza` (cuello), `cabeza.001` (cabeza) | Sí: mira a la rival, ladeo y asentir |
| **Pico** | `pico` (hijo de `cabeza.001`): pesa en **249 + 17 vértices de la mandíbula inferior** (y 0,85–0,92, delante). La superior va rígida con la cabeza | **Mal: gira al revés** (ver §4) |
| Alas | `armL1`, `armL2`, `armL3` por lado y cadenas de plumas `armL2.002…019`, `Bone.003…006` (unos 13 por ala) | Solo `armL1` y `armL2` (z y x). Las plumas nunca se mueven |
| Cola | `espalda1.001` (1 hueso, 494 vértices) | Sí: x (arriba y abajo) y escala en abanico al aterrizar |
| Patas | `pieL1`, `pieL2`, `pieL3` y dedos `pieL4…8` por lado | Paso procedural e IK de pies (desde 84a2a19 también en la rival) |
| Ojos | Párpados procedurales (casquete), parpadeo | Sí, con la expresión |
| Anclas | `mount_*` (ropa) | — |
| Morph targets | Ninguno | — |

**Clips del .glb (5):** `Idle` (3,0 s), `Walk` (1,0 s, se sincroniza con la fase del paso), `Celebrate` (1,5 s, una vez al ganar),
`Curious` (2,0 s) y `Welcome` (2,0 s). Los dos últimos no se usan en el duelo. **No hay ningún clip de ataque, golpe, esquiva,
derrota ni grito**: todo eso es procedural.

## 3. De dónde sale la rigidez

1. **Sin clips de combate.** Aviso, aletazo, golpe recibido, mareo y derrota son giros procedurales pequeños en `vida()`
   (combate.js): alas entre 0,15 y 0,55 rad, pecho entre 0,1 y 0,3 rad y desplazamientos de pocos centímetros. Además, cada
   salida va limitada a 9 rad/s (`VIDA_VEL`) y entra y sale por pesos suaves, así que los golpes quedan blandos: hay poca
   anticipación, poco impacto y nada de seguimiento.
2. **Alas de 2 huesos de los ~16 que tienen.** Las plumas primarias (`armL2.002…`) no se abren ni hacen abanico, y el ala se
   ve como una paleta.
3. **Una capa encima de otra sin máscara por hueso.** Clip (`Idle`/`Walk`) → `locomotion` → `face` → `vida` → `andar`. Cada
   capa suma con `ch.rot()` sin pesos por hueso. No se pisan, pero ninguna capa manda: todo queda a medias. `play()` hace
   `reset()` y un fundido de 0,3 s entre clips.
4. **La cola es un solo hueso**, y la cabeza solo tiene cuello más cabeza: los arcos son cortos.
5. **Las patas patinan.** El paso de `character.js` (zancada de 1,25 m) se desliza a más de 3 m/s: Vittata patina ~2,8 m/s
   con el pie apoyado (medido a 20 cuadros por segundo). La rival lo corrige con su cadencia (`AND.paso` 0,8) desde 84a2a19.
6. **Frecuencia de actualización y LOD.** Dentro del duelo la rival se anima en cada cuadro, y eso está bien. En espera, a
   más de 30 m se anima un cuadro de cada dos y a más de 60 m nada. En Modo Escuela se quitan los extras de `vida()`
   (respirar, aleteo al andar).
7. **Orientación, pivote y escala:** correctos. Escala 1,75 / 1,4 y `rotation.order` YXZ. No hay errores.

## 4. El pico: por qué no se abre (causa encontrada)

- `character.js` (`face()`, el comentario dice «pico +X abre») gira `pico` en **+X** al hablar (`mouth`/`talking`) y en el
  duelo (`picoT` → `mouth`). La sonda muestra que **+X cierra la mandíbula y la mete dentro del pico superior**, y que
  **−X la abre** (la punta baja 5 cm con −0,4 rad). Capturas: `pico_ejes.jpg` (reposo, +0,4, −0,4 y `mouth=1`).
- Por eso, al hablar, gritar o atacar, el pico se cierra del todo. En reposo, en cambio, el clip lo deja algo entreabierto.
  Las expresiones `happy` y `surprised` suman +X, así que también lo cierran.
- **Afecta a todas las cotorras** (Vittata en los diálogos, Iguaca, la rival, el J2 y las cotorras en línea), porque todas
  usan este rig. Las cotorras en línea, además, ponen `mouth: null` siempre (`en_linea.js`).
- **Arreglo barato, sin tocar el modelo ni el rig:** invertir el signo del pico en `character.js` (hablar, expresión, `use`
  y `carry`) y subir la apertura máxima (`mouthMax` 0,4 → ~0,55 rad para el grito). Es una línea por uso. La mandíbula ya
  existe y tiene buenos pesos, así que no hace falta una malla aparte ni un shader.

## 5. Lo más barato para cada hueco

| Hueco | Solución propuesta (en tiempo de ejecución; el .glb no cambia) | Coste |
|---|---|---|
| El pico no abre | Signo de `pico` en `character.js` y más apertura en Grito y Canto | Muy bajo |
| Sin clips de combate | Máquina de estados de duelo con capas (por encima de `vida()`): poses clave con curvas de anticipación, golpe, seguimiento y asentarse (no clips nuevos) | Medio (solo CPU, ~20 giros por cuadro) |
| Alas como paletas | Abanico de primarias: girar la cadena `armL2.002…` con un solo parámetro «abrir» por ala | Bajo |
| Golpes sin energía | Pausa al impacto (`juice.hitStop` ya existe), sacudida pequeña de cámara, estirar y aplastar moderado en `root.scale`, y partículas de `fx_poderes.js` | Bajo |
| Familias de poder (PICO: grito y canto; OJOS; PLUMAS; ALAS) | Una base de 4 fases (anticipación → ejecución → impacto → recuperación) con una pose por familia y variaciones por parámetros | Medio |
| Cola rígida | Muelle de 2º orden en `espalda1.001` (seguimiento del cuerpo) | Muy bajo |
| Pies que patinan | Cadencia por instancia, como la rival (`AND.paso`). En Vittata solo si Kelvin lo aprueba (toca su paso) | Bajo |
| Cotorras en línea sin pico | Mandar `picoT` y `talking` en el paquete de pares | Bajo |
| Rendimiento (Chromebook, iPhone, Escuela) | La capa de duelo solo corre en el duelo y con 2 cotorras. En Escuela, sin abanico de plumas ni partículas extra. Medir ms por cuadro con `G.perf` | — |

## 6. Decisiones de Kelvin pendientes

- Arreglar el pico es global: Vittata también abrirá el pico en los diálogos. No cambia el modelo, pero sí cómo se ve.
- La cadencia de las patas de Vittata (deja de patinar al correr) es un cambio en su movimiento.
