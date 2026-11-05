# Ficha · La Maraña con cara (KIMI-063)

**Para aprobación de Kelvin.** Detrás del misterio de fantasía de los rastros grises (CG-46), la Maraña
ahora tiene cara: ojos luminosos que se abren y te siguen, enredaderas que se mueven y una voz.
Sin personaje 3D nuevo: todo son los 5 rastros actuales más una malla instanciada de ojos.

## Qué se ve

| | |
|---|---|
| ![Vista aérea: el rastro gris abre los ojos](docs/img/kimi063/k063_vista_aerea.jpg) | ![El rastro en su rinconcio del bosque](docs/img/kimi063/k063_vista_aerea_2.jpg) |
| Acercándote volando: la mancha gris te mira | El mismo rastro desde el otro lado: los ojos giran hacia Vittata |

- **Ojos**: dos puntos luminosos verdosos que **se abren** cuando te acercas (<26 m, apertura gradual ~1 s)
  y **giran para seguirte** a ti y a la cámara. Están posados en el borde del rastro que mira al jugador.
- **Enredaderas**: el rastro **se mueve**: balanceo lento, respiración y un estiramiento sutil hacia ti
  cuando pasas cerca (<14 m). Con «Reducir movimiento» queda casi quieto (solo respira).
- **Voz**: al despertar (abrir los ojos) suena un **sonido existente** del juego (`nido_chispa`, celesta
  pentatónica) una vez por acercamiento y rastro (mínimo 20 s entre voces). Nada nuevo que traducir.

## Reglas (igual que los rastros de siempre)

- Apagado en calidad **baja**, a más de 80 m y en silencio de pruebas: en el iPhone «bajo» no cuesta nada.
- Se sigue descubriendo volando y limpiando con una pasada de bandada (<4 m): sin cambios.
- Sigue siendo un cuento de la bandada: ningún texto habla de plaga ni amenaza.

## Coste medido (GPU real RX 5700 XT, herramienta `tools/build/kimi2_k063.js`)

- **+2 draw calls** con la cara visible (malla de rastros + malla de ojos), **0 texturas nuevas**,
  geometría diminuta (2×5 instancias). Memoria sin cambio.
- `AV.maranaTest()` **9/9** (5 checks de siempre + ojos se abren/siguen, enredaderas se mueven,
  voz existente, se cierran lejos/silencio, ≤2 draw calls).
- Baterías en página limpia: selfTest 103/103 · comicTest 67/67 · movementTest 52/52 (aislado;
  en corrida acumulada con contención 47/52 con los rojos de física ya documentados, no de este cambio).
- 0 errores de consola en todas las corridas.

## Cómo verla en el juego

Vuela (o camina) cerca de un rastro gris: loma (40,80), poza (−20,60), mirador (90,−30),
río (150,200) o meseta (11,−90). Acércate y los ojos se abren; cruza al otro lado y giran la mirada.

## Qué se decide aquí

- ¿Te gustan los **ojos luminosos** (verdosos, brillan en los rincones oscuros y blanquean a pleno sol)
  o los prefieres más verdes/opacos?
- ¿La **voz** (`nido_chispa`) encaja, o quieres otra de las existentes (p. ej. más grave/lenta)?
- ¿El **estiramiento hacia el jugador** es suficiente «enredadera viva» o quieres algo más animado?
