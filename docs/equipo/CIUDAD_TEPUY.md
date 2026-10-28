# Ciudad de piedra del tepuy (G18)

Pedido del 27-oct, prioridad 1: `kelvin_ruinas_yunque` (57 piezas Ancient, cumbre a 97 m) tiene que leerse como la gran ciudad del render de 2022 (`docs/img/ciudad_tepuy_render2022.jpg`). Kelvin la aprueba. No se publicó `sitio/`. No se tocaron el cómic, F2.1, F2.2, el atlas del resto del mapa ni la flora.

## Qué se veía

Desde el aire la zona caía en la silueta lejana: un solo material de color de vértice, sin la piedra del kit. El `_hd` general llega a 45 / 70 / 90 m y la ciudad, de punta a punta, pasa de eso. La vista `ciudad` de `look_capturas.py` (Vittata en 52, −84, mirando al tepuy) ya dejaba los templos del fondo en esa silueta beige. De ahí los bloques planos, las torres con «ganchos» y la falta de sombra: el lejano no proyecta sombra.

## Qué hace el juego ahora

Solo esta zona, en `src/engine/streaming.js`:

- A menos de 220 m del borde carga el kit (ligero y `_hd`). El spawn (134, 182) queda a unos 290 m y no entra.
- Hasta 340 m de la superficie se dibuja el `_hd` (piedra clara, detalle y normales del atlas Ancient). Donde no hay `_hd` (las cuatro `plataforma_piedra`, cajas del propio `.max`) se dibuja el ligero con su textura, no la silueta.
- La malla fundida beige de la zona no se usa mientras esa vista está activa.
- Al alejarse se suelta, igual que el resto. Las otras zonas siguen a 45 / 70 / 90 m.

La luz del sol entra por el material del kit. La sombra de mapa sigue el radio de la calidad (30 m en alto, alrededor de Vittata): no se tocó `renderer.js` (AJ1). Junto a la ciudad, las piezas que caen en ese radio proyectan sombra. La oclusión del lejano (F0.5) no se pisa: esa malla no se dibuja en esta vista.

## Orientación y escala (contra el layout migrado)

El `.max` no está en esta máquina. La comparación es `escena_kelvin_cap1.json` (la migración) y la altura de `mapa_cap1_altura.js`.

- Las 57 piezas llevan la misma escala 0,837 en los tres ejes. No hay ninguna estirada. Las alturas cuadran con el kit (el templo A mide 35,6 m; en el `.max`, 42,5 m a esta escala).
- La matriz web no tumba ninguna pieza respecto a la migrada. Los 8 `muro_templo` ya salen acostados del export (el eje vertical del muro apunta en Z). En el aire se leen como cornisas o ganchos. No se giraron: sería otro layout.
- Las 4 `plataforma_piedra` son cajas de unos 19 m. Su tapa queda en el suelo de la cumbre (~97 m) o en la terraza de 81 m (`k015`). El cuerpo va bajo el terreno: es el podio, no un bloque flotando. No tienen `_hd` (ya estaba anotado: son Box del `.max`).
- Piezas con la base a más de 4 m del suelo y sin otra pieza debajo: `k058` (muro, +20 m), `k113` y `k117` (torre B, +8 y +7 m), `k125` (torre E, +5 m), `k126` (torre C, +6 m), `k129` (torre, +13 m, encima de `k130` con 7 m de aire), `k172` (templo A, +6 m). `k056`, `k118` y `k128` también flotan, pero son de las 67 apartadas del agua o del sendero: no se volvieron a mover. El resto se dejó en el layout migrado. Bajarlas cambia la composición del render y es decisión de Kelvin.

## Selva (para la API, carril AW)

G18 no colocó flora. En el render de 2022 el tepuy va cubierto y la ciudad queda en un claro.

- Anillo en la ladera, centro (−4, −131), radio unos 80 m, desde la costa hasta la cota 90. Copa densa, sin tapar las fachadas de la cumbre.
- Claro de la cumbre: (−4, −131), radio unos 35 m, cota 95–97. Solo matas bajas entre las piezas, no árboles sobre los templos.
- Espolón oeste (torres `k113`, `k117`, `k118`, `k128`, alrededor de −20, −145): en el render hay roca y dosel debajo. Hoy el terreno cae y esas piezas quedan al aire. La roca es del terreno (BB); el dosel, de AW.

G19 (`8dcf5fb`) colocó la selva con el respaldo `20261027-2108`: elipse (−25, −160), radios 135 y 105 m. El splat cubre el risco vertical y los árboles quedan fuera de las piezas (margen 8 m). El horneado del dosel a pendiente 0.55 no se publicó: tendía una sábana de unos 60 m en el borde sur. La máscara horneable está en `tools/blender/entorno_dosel.py` (misma pendiente que el resto) y todavía no está horneada. No se movieron edificios ni las 67 apartadas.

## Segunda vuelta (carril C, 28-oct)

La revisión en vivo seguía viendo lingotes dorados, torres con ganchos y el conjunto de la izquierda apagado. No se tocó la gradación de `vibrant_toon` ni la vegetación.

- **Piedra crema mate.** El atlas `AV_HD_Ancient` es ocre. En el shader de esa piedra (no en el de Savage) el albedo pasa a blanco roto, un poco frío para que la gradación cálida lo deje en crema, y el especular queda en cero. La normal sigue dando el relieve de cornisas y almenas. La clave del programa es `av-hd-atlas-crema`, así el tinte cálido del look no se le suma otra vez.
- **Torres F.** `ruina_torre_f` mide 6,6 m en Y. Las tres de `kelvin_ruinas_yunque` (`k169`, `k170`, `k171`) traían un cabeceo de −90° y quedaban acostadas. Se enderezan conservando rumbo, escala y origen. Los ocho `muro_templo` no: su eje largo es Z y esa misma matriz ya los deja en vertical; girarlos los convertiría en losas.
- **Conjunto de la izquierda.** `kelvin_ruinas_yunque_2` (23 piezas, todas erguidas, centro −74, −132) es ese grupo sobre la roca. Desde la vista aérea caía en la silueta beige (a unos 80 m del borde, fuera de los 75 m de «cerca»). Ahora entra en la misma vista de ciudad que la cumbre (220 m / 340 m).

Kelvin la aprueba. No está hecha.

## Captura

`docs/img/ciudad_tepuy_vs_2022.jpg`: el render de 2022 al lado de la vista `ciudad_tepuy` (desde el sureste). En esa toma el juego contó 55 instancias `_hd` y 6 del ligero con textura; la silueta beige de la zona no se dibujó. `streamingTest` 16/16 en `g18-5425820`, con el caso «desde el aire» (hd 21, silueta apagada) y la suelta al volver al inicio. Falta el visto de Kelvin.
