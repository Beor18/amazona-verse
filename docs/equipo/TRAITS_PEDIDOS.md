# Pedidos del artista de traits al código (src/personaje/*)

Formato: para · de · qué · por qué · estado.

## 2026-10-24 · Equipo de espalda: la cabeza entra en la mochila al nadar
- **Para:** TA de personaje · **De:** artista de traits
- **Qué:** con la ranura `back` ocupada, en `swim` (y en menor medida en `dance`) que el cuello no se eche tan atrás.
  Propuesta: restar ~0,6 rad a la extensión del cuello (`cabeza.rotation.x`; en swim es −3,71 y en Idle −2,87) y
  compensar con menos inclinación del cuerpo (root 1,1 → 0,5 rad) para que la mirada siga al frente. Para `tanques`
  (buceo) es imprescindible. Alternativa: ocultar `mochila_pr`/`cuatro`/`jetpack` mientras nada.
- **Por qué:** medido con piel por CPU (`RF.sweep`): en swim la nuca baja hasta la mitad de la mochila (−9 a −10 cm de
  holgura con mochila, tanques y jetpack; −5 cm con el cuatro). En dance la cabeza ladeada roza el canto de arriba
  (−1 a −3 cm). Ya pasaba antes con las piezas pequeñas (−99 mm). Con el cuello −0,6 rad baja a −4 cm. La geometría no
  puede evitarlo: entre la cola (z<0,50) y la nuca (z≈0,85) solo hay 35 cm de espalda.
- **Estado:** resuelto por el TA (character.js, `SWIM_BACK_SHIFT = 0,6`): nadando con la ranura `back` ocupada, 0,6 rad de
  la extensión del cuello pasan al pecho (`espalda2`). La mirada queda casi igual, no se oculta ninguna pieza y no se toca la
  inclinación del cuerpo (es del juego). Revisado en capturas laterales con mochila, tanques, jetpack y cuatro.

## 2026-10-24 · Bandera en la mano: en dance el asta cruza el pico
- **Para:** TA de personaje · **De:** artista de traits
- **Qué:** con `hand` = `mano.bandera` (asta de 0,69 m), en `dance` (t≈0,3–0,55 y 1,05–1,3) el brazo izquierdo sube
  hasta la cara y el asta y el paño atraviesan el pico y la cabeza (−7 a −9 cm, `RF.sweep`). Propuestas: con objetos
  largos en la mano (bandera, mapa, martillo), que el gesto de baile use sobre todo el brazo derecho o abra más el
  izquierdo (≈+0,5 rad en `armL1`); o bajar ese objeto mientras dura el gesto.
- **Por qué:** en Idle, Walk, Run y swim la bandera queda limpia (solo el agarre del puño, −8 mm). Un asta legible no
  puede ser más corta sin perder la proporción 2:3 del paño a la distancia de juego.
- **Estado:** resuelto por el TA (character.js, `clothes()`): con bandera, mapa o martillo en la mano, al bailar el brazo
  izquierdo deja de barrer por delante de la cara y se queda en alto y abierto. Distancia mínima del objeto a la cabeza en 20
  instantes del baile: bandera 13,8 cm, mapa 11,4 cm y martillo 5,8 cm (antes 0,1–0,4 cm). Al pelear no hace falta: más de 20 cm.
