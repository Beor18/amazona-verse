# Inventario de edificios (G15)

Pedido del 27-oct, punto 3: cada pieza de `AV3DMaxExportBuildings` contra `assets/data/escena_kelvin_cap1.json`. F2.1 (el `_hd` más lejos) y F2.2 (paleta de tejados) no entran aquí.

El `.max` (2,4 GB) no está en esta máquina. Lo que sí está, y es la migración de ese archivo, es `assets/models/edificios/conversion.json` (74 assets) y la escena (376 instancias, ids `k000`–`k376`). El recuento se hizo leyendo esos dos JSON, `kit.js` y si existe el `.glb`. No se releyó el `.max`.

## Qué falta

| Qué | Dónde | Qué pasa |
|---|---|---|
| `ancient_largej_sculptmd` | en `conversion.json`, `web: null` | El único asset del export que no está en la escena. La nota del JSON dice «descartado (geometría degenerada)». En `docs/EDIFICIOS.md` es la caja de 12 caras que mide 0 y queda fuera. |
| id `k050` | hueco entre `k000` y `k376` | Único id que no existe. `mapa_kelvin.py` numera con el índice del layout y salta la pieza de caja degenerada, así que el hueco es esa pieza saltada. Sin `escena_layout.json` no se copia aquí el nombre del nodo: el único asset sin modelo web es `ancient_largej_sculptmd`. El recuento cuadra: 377 en el export, 376 en el juego, 1 descartada. |
| `muelle_troncos` | en el kit, 0 instancias | Es la misma malla que `empalizada` (`src: savage_wall_pikessm`). Las estacas acostadas del muelle están colocadas como `empalizada`, no como otro modelo. No falta una pieza. |

Nada más falta. Las 376 instancias tienen `modelo`, las 73 claves de asset de la escena están en `conversion.json`, y los 63 modelos usados están en `kit.js`.

- Sin `.glb`: ninguno.
- Sin `_lejos.glb`: ninguno.
- Sin `_hd.glb` (ya documentado: cajas del propio `.max`, la canoa y `carpa_g`): bloque_piedra, canoa, carpa_g, losa_piedra, plataforma_piedra.
- Instancias con `espera` (apoyo sin modelo, no se dibujan): 0.
- Instancias sin modelo: 0.
- Modelo que no está en el kit: ninguno.
- Asset de la escena que no está en `conversion.json`: ninguno.
- Asset de `conversion.json` que no está en la escena: ancient_largej_sculptmd.
- La matriz web no tumba ninguna pieza respecto a la migrada (ejes verticales distintos: 0).

## Qué no se dibuja

`streaming` se salta `oculto`. Hay 1.

| id | zona | nodo | asset | modelo | ajuste dx, dy, dz | motivo |
|---|---|---|---|---|---|---|
| k187 | kelvin_aldea_mina | savage_208 | savage_monumentc | monumento_c | 0.00, 5.75, 0.00 | choca con agua o sendero |

`k187` es un `monumento_c` en La Mina. Sigue en el JSON y no entra en el mundo: al asentarlo chocaba con agua o sendero y no hubo sitio libre a 24 m (`mapa_kelvin.py`).

## Apartadas del layout

`ajuste` es el desplazamiento que aplicó `mapa_kelvin.py` para sacar la pieza del agua o del sendero y apoyarla en el terreno nuevo. 67 piezas se movieron 1 m o más en planta (35 de ellas, 4 m o más). La altura (`dy`) es el asiento en el suelo, no un traslado.

| id | zona | modelo | nodo | dx | dz | planta | dy |
|---|---|---|---|---:|---:|---:|---:|
| k367 | kelvin_aldea_rio_este_3 | puente_madera | savage_169 | -18.02 | 7.46 | 19.5 | 7.67 |
| k181 | kelvin_aldea_mina_2 | monumento_a | savage_186 | 10.61 | 10.61 | 15.0 | 2.75 |
| k049 | kelvin_aldea_colina | complejo_ruinas | Group001 | -10.50 | 0.00 | 10.5 | 18.39 |
| k364 | kelvin_aldea_rio_este | portal_puas | savage_162 | -8.31 | -3.44 | 9.0 | 12.34 |
| k368 | kelvin_aldea_meandros_2 | puente_madera | savage_170 | 3.44 | -8.31 | 9.0 | 18.98 |
| k333 | kelvin_aldea_rio_este | empalizada | savage_148 | -6.93 | -2.87 | 7.5 | 8.98 |
| k336 | kelvin_aldea_rio_este | empalizada | savage_159 | -6.93 | -2.87 | 7.5 | 13.67 |
| k352 | kelvin_aldea_rio_este | empalizada | savage_147 | -6.93 | -2.87 | 7.5 | 12.59 |
| k355 | kelvin_aldea_rio_este | empalizada | savage_152 | -6.93 | -2.87 | 7.5 | 8.33 |
| k359 | kelvin_aldea_rio_este | empalizada | savage_158 | -6.93 | -2.87 | 7.5 | 12.91 |
| k012 | kelvin_aldea_colina | losa_piedra | Box052 | -6.93 | -2.87 | 7.5 | 9.42 |
| k351 | kelvin_aldea_rio_este | empalizada | savage_144 | -7.50 | 0.00 | 7.5 | 13.88 |
| k353 | kelvin_aldea_rio_este | empalizada | savage_149 | -7.50 | 0.00 | 7.5 | 14.09 |
| k184 | kelvin_aldea_mina | monumento_a | savage_189 | -0.00 | -7.50 | 7.5 | 12.42 |
| k182 | kelvin_aldea_mina_2 | monumento_a | savage_187 | 7.50 | 0.00 | 7.5 | 4.51 |
| k056 | kelvin_ruinas_yunque | muro_templo | MediumJ_WallM006 | 6.00 | 0.00 | 6.0 | 74.05 |
| k118 | kelvin_ruinas_yunque | ruina_torre_b | ancient_118 | 6.00 | 0.00 | 6.0 | 74.05 |
| k128 | kelvin_ruinas_yunque | ruina_torre | ancient_092 | 6.00 | 0.00 | 6.0 | 74.05 |
| k315 | kelvin_aldea_rio_este | muralla_atalaya_b | savage_145 | -6.00 | 0.00 | 6.0 | 7.46 |
| k350 | kelvin_aldea_rio_oeste | empalizada | savage_141 | -6.00 | 0.00 | 6.0 | 14.59 |
| k335 | kelvin_aldea_rio_este | empalizada | savage_157 | -5.54 | -2.30 | 6.0 | 11.24 |
| k356 | kelvin_aldea_rio_este | empalizada | savage_153 | -5.54 | -2.30 | 6.0 | 11.07 |
| k357 | kelvin_aldea_rio_este | empalizada | savage_154 | -5.54 | -2.30 | 6.0 | 12.48 |
| k330 | kelvin_aldea_rio_oeste | empalizada | savage_135 | -5.54 | -2.30 | 6.0 | 15.71 |
| k354 | kelvin_aldea_rio_este | empalizada | savage_151 | -4.24 | -4.24 | 6.0 | 13.97 |
| k046 | kelvin_aldea_mina | canoa | Box088 | -4.24 | -4.24 | 6.0 | 7.47 |
| k032 | kelvin_aldea_mina_2 | canoa | Box074 | -3.54 | 3.54 | 5.0 | 3.47 |
| k334 | kelvin_aldea_rio_este | empalizada | savage_155 | -4.16 | -1.72 | 4.5 | 10.27 |
| k358 | kelvin_aldea_rio_este | empalizada | savage_156 | -4.16 | -1.72 | 4.5 | 11.64 |
| k317 | kelvin_aldea_rio_este | muralla_atalaya_b | savage_150 | -4.50 | 0.00 | 4.5 | 7.65 |
| k331 | kelvin_aldea_rio_oeste | empalizada | savage_142 | -4.50 | 0.00 | 4.5 | 15.02 |
| k361 | kelvin_aldea_mina | empalizada | savage_212 | 4.50 | 0.00 | 4.5 | 0.93 |
| k013 | kelvin_aldea_colina | losa_piedra | Box053 | -0.00 | -4.50 | 4.5 | 10.91 |
| k360 | kelvin_aldea_mina | empalizada | savage_211 | 3.18 | 3.18 | 4.5 | -0.52 |
| k011 | kelvin_aldea_colina | losa_piedra | Box051 | -3.18 | -3.18 | 4.5 | 11.97 |
| k332 | kelvin_aldea_rio_oeste | empalizada | savage_143 | -3.00 | 0.00 | 3.0 | 14.94 |
| k033 | kelvin_aldea_mina | canoa | Box075 | -3.00 | 0.00 | 3.0 | 3.47 |
| k340 | kelvin_aldea_mina | empalizada | savage_217 | 0.00 | 3.00 | 3.0 | 5.07 |
| k316 | kelvin_aldea_rio_este | muralla_atalaya_b | savage_146 | -2.77 | -1.15 | 3.0 | 8.00 |
| k110 | kelvin_aldea_rio_este_2 | templo_mediano_h | ancient_108 | -1.15 | 2.77 | 3.0 | 19.13 |
| k134 | kelvin_aldea_rio_este_2 | ruina_torre | ancient_112 | -1.15 | 2.77 | 3.0 | 17.65 |
| k137 | kelvin_aldea_rio_este_2 | ruina_torre | ancient_115 | -1.15 | 2.77 | 3.0 | 17.65 |
| k045 | kelvin_aldea_mina | canoa | Box087 | 1.15 | 2.77 | 3.0 | 7.47 |
| k029 | kelvin_aldea_mina_2 | canoa | Box071 | -2.77 | 1.15 | 3.0 | 3.47 |
| k135 | kelvin_aldea_rio_este_2 | ruina_torre | ancient_113 | 2.12 | 2.12 | 3.0 | 21.95 |
| k136 | kelvin_aldea_rio_este_2 | ruina_torre | ancient_114 | 2.12 | 2.12 | 3.0 | 21.95 |
| k031 | kelvin_aldea_mina_2 | canoa | Box073 | -1.85 | 0.77 | 2.0 | 3.47 |
| k039 | kelvin_aldea_rio_oeste | canoa | Box081 | 2.00 | 0.00 | 2.0 | 11.42 |
| k048 | kelvin_aldea_mina | canoa | Box090 | -1.41 | 1.41 | 2.0 | 3.47 |
| k328 | kelvin_aldea_rio_este | muralla_atalaya_a | savage_167 | -1.39 | -0.57 | 1.5 | 2.75 |
| k311 | kelvin_aldea_rio_oeste | muralla_atalaya_b | savage_131 | -1.39 | 0.57 | 1.5 | 14.00 |
| k363 | kelvin_aldea_mina | empalizada | savage_218 | 1.39 | 0.57 | 1.5 | 1.62 |
| k102 | kelvin_ruinas_yunque | templo_grande_e | ancient_065 | 1.50 | 0.00 | 1.5 | 46.10 |
| k173 | kelvin_ruinas_yunque | templo_grande_a | ancient_C004 | 1.50 | 0.00 | 1.5 | 35.24 |
| k289 | kelvin_aldea_rio_este | torre_vigia_b | savage_161 | -1.50 | 0.00 | 1.5 | 3.52 |
| k327 | kelvin_aldea_rio_este | muralla_atalaya_a | savage_166 | -1.50 | 0.00 | 1.5 | 3.02 |
| k098 | kelvin_aldea_rio_este_2 | templo_grande_d | ancient_050 | -1.50 | 0.00 | 1.5 | 11.26 |
| k109 | kelvin_aldea_rio_este_2 | templo_mediano_h | ancient_107 | -1.50 | 0.00 | 1.5 | 11.26 |
| k111 | kelvin_aldea_rio_este_2 | templo_mediano_h | ancient_109 | -1.50 | 0.00 | 1.5 | 11.26 |
| k132 | kelvin_aldea_rio_este_2 | ruina_torre | ancient_110 | -1.50 | 0.00 | 1.5 | 11.26 |
| k008 | kelvin_aldea_colina | losa_piedra | Box050 | -1.50 | 0.00 | 1.5 | 9.87 |
| k337 | kelvin_aldea_mina_2 | empalizada | savage_213 | 1.50 | 0.00 | 1.5 | 7.74 |
| k338 | kelvin_aldea_mina_2 | empalizada | savage_215 | 1.50 | 0.00 | 1.5 | 8.54 |
| k326 | kelvin_aldea_rio_este | muralla_atalaya_a | savage_163 | -1.06 | 1.06 | 1.5 | 1.28 |
| k040 | kelvin_aldea_rio_oeste | canoa | Box082 | 1.00 | 0.00 | 1.0 | 11.42 |
| k041 | kelvin_aldea_rio_oeste | canoa | Box083 | 1.00 | 0.00 | 1.0 | 11.42 |
| k030 | kelvin_aldea_mina_2 | canoa | Box072 | -1.00 | 0.00 | 1.0 | 3.47 |

La que más se aparta es `k367` (`puente_madera`, `savage_169`): 19,5 m. Sigue dentro del radio de su zona. Ninguna instancia queda fuera del radio de su zona.

## Acostadas ya en el export

El eje vertical de `matrizMigrado` y el de `matriz` coinciden. Si una pieza está tumbada, ya lo estaba en el export, no lo hizo el encaje del modelo web.

| modelo | cuántas tumbadas | de cuántas | lectura |
|---|---:|---:|---|
| empalizada | 21 | 25 | Estacas del muelle o de la cerca, a propósito (`mapa_kelvin.py` las trata como acostadas). |
| muro_templo | 8 | 8 | Los 8 muros `MediumJ_WallM` llegan horizontales. No es un giro del juego. |
| ruina_torre_f | 3 | 3 | Las 3 torres F llegan horizontales. No es un giro del juego. |

## Escala distinta dentro del mismo asset

La escala Y se mide en `matrizMigrado` (la del export, ya a la escala de la isla, 0,255/0,3048). Si una instancia se aleja más de un 25 % de la mediana de su asset, el `.max` ya la traía así: la matriz web no añade otro giro. No se corrige aquí (F2.2 no se retoma).

| id | zona | modelo | nodo | escala Y | mediana del asset | veces |
|---|---|---|---|---:|---:|---:|
| k107 | kelvin_ruinas_yunque | templo_mediano_h | ancient_072 | 0.837 | 3.028 | 0.28 |
| k129 | kelvin_ruinas_yunque | ruina_torre | ancient_093 | 0.446 | 0.966 | 0.46 |
| k130 | kelvin_ruinas_yunque | ruina_torre | ancient_094 | 0.446 | 0.966 | 0.46 |
| k342 | kelvin_aldea_rio_oeste | muro_roca | savage_137 | 0.391 | 0.837 | 0.47 |
| k343 | kelvin_aldea_rio_oeste | muro_roca | savage_138 | 0.391 | 0.837 | 0.47 |
| k344 | kelvin_aldea_rio_oeste | muro_roca | savage_139 | 0.391 | 0.837 | 0.47 |
| k345 | kelvin_aldea_rio_oeste | muro_roca | savage_140 | 0.391 | 0.837 | 0.47 |
| k295 | kelvin_aldea_rio_este | torre_vigia | savage_160 | 0.536 | 1.147 | 0.47 |
| k296 | kelvin_aldea_rio_este | torre_vigia | savage_168 | 0.536 | 1.147 | 0.47 |
| k101 | kelvin_ruinas_yunque_2 | templo_grande | ancient_126 | 0.438 | 0.837 | 0.52 |
| k255 | kelvin_aldea_rio_este_2 | cercado_redondo | savage_087 | 0.837 | 1.488 | 0.56 |
| k257 | kelvin_aldea_rio_este_2 | bohio_puntiagudo | savage_089 | 0.837 | 1.481 | 0.57 |
| k366 | kelvin_aldea_rio_este | puente_madera | savage_164 | 0.837 | 1.440 | 0.58 |
| k149 | kelvin_ruinas_yunque | ruina_pilar | ancient_078 | 0.837 | 1.424 | 0.59 |
| k150 | kelvin_ruinas_yunque | ruina_pilar | ancient_087 | 0.837 | 1.424 | 0.59 |
| k151 | kelvin_ruinas_yunque | ruina_pilar | ancient_088 | 0.837 | 1.424 | 0.59 |
| k283 | kelvin_aldea_meandros | mirador_escalonado | savage_248 | 0.384 | 0.630 | 0.61 |
| k154 | kelvin_ruinas_yunque | ruina_pilar | ancient_091 | 0.901 | 1.424 | 0.63 |
| k288 | kelvin_aldea_yunque | torre_vigia_b | savage_123 | 0.599 | 0.944 | 0.63 |
| k108 | kelvin_ruinas_yunque | templo_mediano_h | ancient_106 | 1.946 | 3.028 | 0.64 |
| k147 | kelvin_ruinas_yunque_2 | ruina_mirador | ancient_138 | 0.557 | 0.837 | 0.67 |
| k160 | kelvin_ruinas_yunque_2 | ruina_pilar | ancient_137 | 0.947 | 1.424 | 0.67 |
| k239 | kelvin_aldea_rio_oeste_2 | toldo_pequeno | savage_061 | 0.837 | 1.249 | 0.67 |
| k240 | kelvin_aldea_rio_oeste_2 | toldo_pequeno | savage_065 | 0.837 | 1.249 | 0.67 |
| k241 | kelvin_aldea_rio_oeste_2 | toldo_pequeno | savage_066 | 0.837 | 1.249 | 0.67 |
| k184 | kelvin_aldea_mina | monumento_a | savage_189 | 0.201 | 0.284 | 0.71 |
| k179 | kelvin_aldea_meandros_2 | monumento_a | savage_074 | 0.201 | 0.284 | 0.71 |
| k237 | kelvin_aldea_rio_oeste_2 | campamento_c | savage_060 | 0.837 | 1.152 | 0.73 |
| k148 | kelvin_ruinas_yunque_2 | ruina_mirador | ancient_139 | 0.610 | 0.837 | 0.73 |
| k294 | kelvin_aldea_yunque | torre_vigia | savage_116 | 0.837 | 1.147 | 0.73 |
| k293 | kelvin_aldea_mina_2 | torre_vigia_b | savage_197 | 0.705 | 0.944 | 0.75 |
| k082 | kelvin_aldea_lomas | carpa_e | SavageG1_V_020 | 1.144 | 0.837 | 1.37 |
| k083 | kelvin_aldea_lomas | carpa_e | SavageG1_V_021 | 1.144 | 0.837 | 1.37 |
| k085 | kelvin_aldea_lomas | carpa_e | SavageG1_V_03 | 1.144 | 0.837 | 1.37 |
| k178 | kelvin_aldea_meandros_2 | monumento_a | savage_073 | 0.390 | 0.284 | 1.37 |
| k181 | kelvin_aldea_mina_2 | monumento_a | savage_186 | 0.390 | 0.284 | 1.37 |
| k200 | kelvin_aldea_rio_oeste | bohio_redondo | savage_064 | 0.672 | 0.469 | 1.43 |
| k256 | kelvin_aldea_yunque | cercado_redondo | savage_120 | 2.140 | 1.488 | 1.44 |
| k199 | kelvin_aldea_rio_oeste | bohio_redondo | savage_063 | 0.724 | 0.469 | 1.54 |
| k170 | kelvin_ruinas_yunque | ruina_torre_f | ancient_104 | 1.320 | 0.837 | 1.58 |
| k197 | kelvin_aldea_rio_oeste | bohio_redondo | savage_053 | 0.837 | 0.469 | 1.78 |
| k073 | kelvin_aldea_meandros_2 | carpa_d | SavageG1_V_014 | 0.837 | 0.455 | 1.84 |
| k272 | kelvin_aldea_mina | bohio_redondo | savage_198 | 1.597 | 0.837 | 1.91 |
| k273 | kelvin_aldea_mina | bohio_redondo | savage_200 | 1.597 | 0.837 | 1.91 |
| k274 | kelvin_aldea_mina | bohio_redondo | savage_202 | 1.597 | 0.837 | 1.91 |
| k275 | kelvin_aldea_mina | bohio_redondo | savage_203 | 1.597 | 0.837 | 1.91 |
| k276 | kelvin_aldea_mina | bohio_redondo | savage_205 | 1.597 | 0.837 | 1.91 |
| k367 | kelvin_aldea_rio_este_3 | puente_madera | savage_169 | 2.813 | 1.440 | 1.95 |
| k368 | kelvin_aldea_meandros_2 | puente_madera | savage_170 | 3.275 | 1.440 | 2.27 |
| k210 | kelvin_aldea_meandros | bohio_redondo | savage_175 | 1.214 | 0.469 | 2.59 |
| k209 | kelvin_aldea_meandros | bohio_redondo | savage_114 | 1.214 | 0.469 | 2.59 |
| k176 | kelvin_aldea_mina_2 | monumento_a | savage_044 | 0.837 | 0.284 | 2.94 |
| k198 | kelvin_aldea_rio_oeste | bohio_redondo | savage_062 | 1.403 | 0.469 | 2.99 |
| k208 | kelvin_aldea_meandros | bohio_redondo | savage_113 | 1.589 | 0.469 | 3.39 |
| k201 | kelvin_aldea_rio_oeste | bohio_redondo | savage_076 | 1.719 | 0.469 | 3.66 |

55 instancias.

## Por zona

Las 14 zonas y las cuentas coinciden con `docs/equipo/MAPA_PLAN_COMPLETO.md` §1.3.

| zona | piezas | modelos |
|---|---:|---|
| `kelvin_ruinas_yunque` | 57 | ruina_torre_b 9, muro_templo 8, ruina_portal 7, ruina_pilar 6, ruina_torre 5, plataforma_piedra 4, ruina_mirador 3, ruina_torre_f 3, templo_grande 2, templo_grande_e 2, templo_mediano_h 2, templo_grande_a 2, templo_grande_f 1, ruina_torre_e 1, ruina_torre_c 1, ruina_altar 1 |
| `kelvin_aldea_rio_este` | 42 | bohio_redondo 13, empalizada 13, casa_paja_a 3, muralla_atalaya_b 3, muralla_atalaya_a 3, torre_vigia 2, monumento_g 1, torre_vigia_b 1, portal_puas 1, puente_madera 1, campamento_c 1 |
| `kelvin_aldea_rio_oeste` | 35 | canoa 8, carpa_e 6, bohio_redondo 5, muralla_atalaya_b 4, empalizada 4, muro_roca 4, carpa_a 1, carpa_b 1, monumento_b 1, tienda_pequena 1 |
| `kelvin_aldea_lomas` | 34 | torre_vigia 11, carpa_d 5, muro_roca 5, carpa_c 3, carpa_e 3, carpa_a 2, carpa_b 2, carpa_f 1, carpa_g 1, portal_madera_b 1 |
| `kelvin_aldea_rio_este_2` | 29 | bohio_redondo 12, ruina_torre 7, templo_mediano_h 3, caney_largo 2, templo_grande_d 1, monumento_d 1, cercado_redondo 1, bohio_puntiagudo 1, casa_paja_b 1 |
| `kelvin_aldea_mina` | 25 | canoa 7, bohio_redondo 5, empalizada 4, ruina_torre_b 3, bohio_puntiagudo 2, casa_paja_b 2, monumento_a 1, monumento_c 1 |
| `kelvin_aldea_meandros` | 25 | bohio_redondo 10, canoa 9, monumento_c 1, bohio_puntiagudo 1, casa_paja_a 1, corral 1, mirador_escalonado 1, casa_plataforma 1 |
| `kelvin_ruinas_yunque_2` | 23 | ruina_mirador 7, ruina_pilar 6, bloque_piedra 4, templo_grande 1, templo_mediano_g 1, templo_mediano_f 1, templo_mediano 1, templo_mediano_h 1, templo_grande_a 1 |
| `kelvin_aldea_colina` | 22 | losa_piedra 9, carpa_e 8, muralla_atalaya_b 2, complejo_ruinas 1, monumento_f 1, mirador_escalonado 1 |
| `kelvin_aldea_mina_2` | 23 | canoa 6, monumento_a 4, muralla_atalaya_b 4, empalizada 4, torre_vigia_b 3, monumento_f 1, casa_plataforma 1 |
| `kelvin_aldea_rio_este_3` | 21 | puente_madera 6, portal_madera_b 3, portal_madera_c 3, portal_madera_a 3, monumento_e 1, mirador_escalonado 1, torre_vigia_b 1, muralla_atalaya_a 1, portal_puas 1, campamento_c 1 |
| `kelvin_aldea_rio_oeste_2` | 18 | toldo_pequeno 13, campamento_c 2, canoa 1, campamento_f 1, campamento_a 1 |
| `kelvin_aldea_yunque` | 11 | muralla_atalaya_b 3, torre_vigia_b 2, muralla_atalaya_a 2, canoa 1, cercado_redondo 1, casa_plataforma 1, torre_vigia 1 |
| `kelvin_aldea_meandros_2` | 11 | monumento_a 4, carpa_a 3, carpa_b 1, carpa_c 1, carpa_d 1, puente_madera 1 |

## Pieza a pieza

376 filas. Vacío en «nota» quiere decir: tiene modelo, se dibuja, se movió menos de 1 m en planta, está de pie y su escala Y está a menos de un 25 % de la mediana de su asset.

| id | zona | nodo del .max | asset | modelo | x | z | y0 | y1 | dx | dy | dz | nota |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| k004 | kelvin_ruinas_yunque | Box043 | losa_piso_v2 | plataforma_piedra | -2.00 | -127.59 | 77.67 | 97.04 | 0.00 | 62.11 | 0.00 |  |
| k014 | kelvin_ruinas_yunque | Box056 | losa_piso_v6 | plataforma_piedra | -12.92 | -151.99 | 77.66 | 97.03 | 0.00 | 62.10 | 0.00 |  |
| k015 | kelvin_ruinas_yunque | Box057 | losa_piso_v7 | plataforma_piedra | 4.19 | -151.42 | 62.31 | 81.68 | 0.00 | 46.75 | 0.00 |  |
| k016 | kelvin_ruinas_yunque | Box058 | losa_piso_v7 | plataforma_piedra | 19.99 | -144.14 | 78.23 | 97.59 | 0.00 | 62.07 | 0.00 |  |
| k051 | kelvin_ruinas_yunque | MediumJ_WallM001 | ancient_mediumj_wallm | muro_templo | 5.31 | -114.64 | 94.43 | 109.08 | 0.00 | 61.58 | 0.00 | acostada ya en el export |
| k052 | kelvin_ruinas_yunque | MediumJ_WallM002 | ancient_mediumj_wallm | muro_templo | 23.80 | -114.90 | 85.53 | 100.18 | 0.00 | 53.57 | 0.00 | acostada ya en el export |
| k053 | kelvin_ruinas_yunque | MediumJ_WallM003 | ancient_mediumj_wallm | muro_templo | -7.71 | -115.44 | 97.12 | 111.77 | 0.00 | 67.35 | 0.00 | acostada ya en el export |
| k054 | kelvin_ruinas_yunque | MediumJ_WallM004 | ancient_mediumj_wallm | muro_templo | -18.94 | -120.99 | 98.30 | 112.94 | 0.00 | 68.53 | 0.00 | acostada ya en el export |
| k055 | kelvin_ruinas_yunque | MediumJ_WallM005 | ancient_mediumj_wallm | muro_templo | -22.13 | -132.97 | 97.06 | 111.71 | 0.00 | 66.04 | 0.00 | acostada ya en el export |
| k056 | kelvin_ruinas_yunque | MediumJ_WallM006 | ancient_mediumj_wallm | muro_templo | -17.43 | -151.75 | 101.70 | 117.48 | 6.00 | 74.05 | 0.00 | apartada 6.0 m en planta; acostada ya en el export |
| k057 | kelvin_ruinas_yunque | MediumJ_WallM007 | ancient_mediumj_wallm | muro_templo | -20.10 | -160.47 | 95.68 | 111.46 | 0.00 | 68.03 | 0.00 | acostada ya en el export |
| k058 | kelvin_ruinas_yunque | MediumJ_WallM008 | ancient_mediumj_wallm | muro_templo | -6.65 | -157.18 | 100.88 | 116.66 | 0.00 | 73.24 | 0.00 | acostada ya en el export |
| k099 | kelvin_ruinas_yunque | ancient_064 | ancient_largeb | templo_grande | 25.00 | -127.82 | 93.54 | 112.54 | 0.00 | 49.52 | 0.00 |  |
| k100 | kelvin_ruinas_yunque | ancient_086 | ancient_largeb | templo_grande | 15.27 | -143.81 | 91.21 | 110.22 | 0.00 | 47.20 | 0.00 |  |
| k102 | kelvin_ruinas_yunque | ancient_065 | ancient_largee | templo_grande_e | -9.30 | -149.36 | 91.34 | 112.38 | 1.50 | 46.10 | 0.00 | apartada 1.5 m en planta |
| k103 | kelvin_ruinas_yunque | ancient_066 | ancient_largef | templo_grande_f | 9.65 | -140.20 | 94.29 | 119.05 | 0.00 | 47.20 | 0.00 |  |
| k107 | kelvin_ruinas_yunque | ancient_072 | ancient_mediumh | templo_mediano_h | 14.93 | -113.54 | 85.66 | 93.18 | 0.00 | 43.97 | 0.00 | escala Y del export 0.28× la mediana del asset |
| k108 | kelvin_ruinas_yunque | ancient_106 | ancient_mediumh | templo_mediano_h | 16.05 | -108.11 | 86.57 | 104.05 | 0.00 | 52.21 | 0.00 | escala Y del export 0.64× la mediana del asset |
| k113 | kelvin_ruinas_yunque | ancient_073 | ancient_towerb | ruina_torre_b | -22.03 | -126.25 | 104.98 | 112.94 | 0.00 | 67.21 | 0.00 |  |
| k114 | kelvin_ruinas_yunque | ancient_081 | ancient_towerb | ruina_torre_b | -19.77 | -140.43 | 96.92 | 104.89 | 0.00 | 59.15 | 0.00 |  |
| k115 | kelvin_ruinas_yunque | ancient_082 | ancient_towerb | ruina_torre_b | -18.57 | -143.60 | 96.92 | 104.89 | 0.00 | 59.15 | 0.00 |  |
| k116 | kelvin_ruinas_yunque | ancient_083 | ancient_towerb | ruina_torre_b | -16.59 | -145.32 | 96.91 | 104.87 | 0.00 | 59.14 | 0.00 |  |
| k117 | kelvin_ruinas_yunque | ancient_117 | ancient_towerb | ruina_torre_b | -25.31 | -133.98 | 103.81 | 111.78 | 0.00 | 66.04 | 0.00 |  |
| k118 | kelvin_ruinas_yunque | ancient_118 | ancient_towerb | ruina_torre_b | -20.36 | -149.09 | 111.81 | 119.78 | 6.00 | 74.05 | 0.00 | apartada 6.0 m en planta |
| k119 | kelvin_ruinas_yunque | ancient_119 | ancient_towerb | ruina_torre_b | -7.04 | -110.59 | 94.29 | 102.26 | 0.00 | 56.52 | 0.00 |  |
| k120 | kelvin_ruinas_yunque | ancient_120 | ancient_towerb | ruina_torre_b | 5.65 | -109.58 | 94.02 | 101.99 | 0.00 | 56.25 | 0.00 |  |
| k121 | kelvin_ruinas_yunque | ancient_121 | ancient_towerb | ruina_torre_b | 24.25 | -91.27 | 47.58 | 55.55 | 0.00 | 24.31 | 0.00 |  |
| k125 | kelvin_ruinas_yunque | ancient_074 | ancient_towere | ruina_torre_e | -0.62 | -113.57 | 99.72 | 113.42 | 0.00 | 56.79 | 0.00 |  |
| k126 | kelvin_ruinas_yunque | ancient_075 | ancient_towerc | ruina_torre_c | -11.34 | -164.89 | 92.96 | 109.93 | 0.00 | 57.46 | 0.00 |  |
| k127 | kelvin_ruinas_yunque | ancient_076 | ancient_towera | ruina_torre | -17.62 | -116.38 | 98.05 | 109.86 | 0.00 | 62.51 | 0.00 |  |
| k128 | kelvin_ruinas_yunque | ancient_092 | ancient_towera | ruina_torre | -15.39 | -156.61 | 114.69 | 128.32 | 6.00 | 74.05 | 0.00 | apartada 6.0 m en planta |
| k129 | kelvin_ruinas_yunque | ancient_093 | ancient_towera | ruina_torre | -2.47 | -139.70 | 110.15 | 116.46 | 0.00 | 51.38 | 0.00 | escala Y del export 0.46× la mediana del asset |
| k130 | kelvin_ruinas_yunque | ancient_094 | ancient_towera | ruina_torre | -2.47 | -139.70 | 96.92 | 103.22 | 0.00 | 31.93 | 0.00 | escala Y del export 0.46× la mediana del asset |
| k131 | kelvin_ruinas_yunque | ancient_095 | ancient_towera | ruina_torre | 30.11 | -138.71 | 94.08 | 107.71 | 0.00 | 53.43 | 0.00 |  |
| k139 | kelvin_ruinas_yunque | ancient_077 | ancient_lookout | ruina_mirador | -0.63 | -111.02 | 94.28 | 103.01 | 0.00 | 56.40 | 0.00 |  |
| k140 | kelvin_ruinas_yunque | ancient_084 | ancient_lookout | ruina_mirador | -0.57 | -117.08 | 94.46 | 103.18 | 0.00 | 59.27 | 0.00 |  |
| k141 | kelvin_ruinas_yunque | ancient_085 | ancient_lookout | ruina_mirador | 5.94 | -127.62 | 96.53 | 107.87 | 0.00 | 62.26 | 0.00 |  |
| k149 | kelvin_ruinas_yunque | ancient_078 | ancient_pillarc | ruina_pilar | -19.65 | -120.29 | 97.97 | 105.31 | 0.00 | 62.97 | 0.00 | escala Y del export 0.59× la mediana del asset |
| k150 | kelvin_ruinas_yunque | ancient_087 | ancient_pillarc | ruina_pilar | -19.65 | -122.83 | 97.93 | 105.27 | 0.00 | 62.93 | 0.00 | escala Y del export 0.59× la mediana del asset |
| k151 | kelvin_ruinas_yunque | ancient_088 | ancient_pillarc | ruina_pilar | -11.01 | -114.76 | 95.21 | 102.54 | 0.00 | 60.21 | 0.00 | escala Y del export 0.59× la mediana del asset |
| k152 | kelvin_ruinas_yunque | ancient_089 | ancient_pillarc | ruina_pilar | -18.28 | -113.11 | 93.99 | 108.99 | 0.00 | 64.34 | 0.00 |  |
| k153 | kelvin_ruinas_yunque | ancient_090 | ancient_pillarc | ruina_pilar | -0.65 | -103.41 | 92.48 | 107.48 | 0.00 | 58.43 | 0.00 |  |
| k154 | kelvin_ruinas_yunque | ancient_091 | ancient_pillarc | ruina_pilar | 24.26 | -110.86 | 85.46 | 93.36 | 0.00 | 50.36 | 0.00 | escala Y del export 0.63× la mediana del asset |
| k161 | kelvin_ruinas_yunque | ancient_079 | ancient_altar | ruina_altar | -16.44 | -123.39 | 97.88 | 99.59 | 0.00 | 63.24 | 0.00 |  |
| k162 | kelvin_ruinas_yunque | ancient_080 | ancient_gateb | ruina_portal | -9.94 | -135.71 | 98.10 | 106.08 | 0.00 | 61.82 | 0.00 |  |
| k163 | kelvin_ruinas_yunque | ancient_096 | ancient_gateb | ruina_portal | -11.86 | -134.17 | 98.10 | 106.08 | 0.00 | 61.82 | 0.00 |  |
| k164 | kelvin_ruinas_yunque | ancient_097 | ancient_gateb | ruina_portal | -13.76 | -133.07 | 98.10 | 106.08 | 0.00 | 61.82 | 0.00 |  |
| k165 | kelvin_ruinas_yunque | ancient_098 | ancient_gateb | ruina_portal | -16.28 | -131.84 | 98.09 | 106.07 | 0.00 | 61.82 | 0.00 |  |
| k166 | kelvin_ruinas_yunque | ancient_099 | ancient_gateb | ruina_portal | 8.93 | -127.31 | 96.13 | 104.11 | 0.00 | 59.85 | 0.00 |  |
| k167 | kelvin_ruinas_yunque | ancient_100 | ancient_gateb | ruina_portal | 10.41 | -125.08 | 92.88 | 100.86 | 0.00 | 56.60 | 0.00 |  |
| k168 | kelvin_ruinas_yunque | ancient_101 | ancient_gateb | ruina_portal | 7.41 | -129.56 | 97.88 | 105.86 | 0.00 | 61.61 | 0.00 |  |
| k169 | kelvin_ruinas_yunque | ancient_103 | ancient_towerf | ruina_torre_f | -20.99 | -127.23 | 97.01 | 98.95 | 0.00 | 62.99 | 0.00 | acostada ya en el export |
| k170 | kelvin_ruinas_yunque | ancient_104 | ancient_towerf | ruina_torre_f | -21.12 | -117.42 | 97.14 | 100.20 | 0.00 | 64.93 | 0.00 | acostada ya en el export; escala Y del export 1.58× la mediana del asset |
| k171 | kelvin_ruinas_yunque | ancient_105 | ancient_towerf | ruina_torre_f | -20.23 | -133.21 | 97.06 | 99.00 | 0.00 | 63.04 | 0.00 | acostada ya en el export |
| k172 | kelvin_ruinas_yunque | ancient_C003 | ancient_largea | templo_grande_a | 24.94 | -154.88 | 92.53 | 128.09 | 0.00 | 47.20 | 0.00 |  |
| k173 | kelvin_ruinas_yunque | ancient_C004 | ancient_largea | templo_grande_a | 8.15 | -163.91 | 80.57 | 116.13 | 1.50 | 35.24 | 0.00 | apartada 1.5 m en planta |
| k175 | kelvin_ruinas_yunque | ancient_C1 | ancient_largee_v2 | templo_grande_e | -4.73 | -130.30 | 96.80 | 117.85 | 0.00 | 51.38 | 0.00 |  |
| k191 | kelvin_aldea_rio_este | savage_049 | savage_monumentg | monumento_g | 102.20 | 65.55 | 10.82 | 23.95 | 0.00 | 2.36 | 0.00 |  |
| k194 | kelvin_aldea_rio_este | savage_234 | savage_bldga | casa_paja_a | 98.02 | 131.57 | 8.05 | 14.02 | 0.00 | 2.74 | 0.00 |  |
| k195 | kelvin_aldea_rio_este | savage_236 | savage_bldga | casa_paja_a | 79.74 | 133.45 | 8.60 | 14.56 | 0.00 | 3.28 | 0.00 |  |
| k196 | kelvin_aldea_rio_este | savage_237 | savage_bldga | casa_paja_a | 92.82 | 116.37 | 8.32 | 14.29 | 0.00 | 3.01 | 0.00 |  |
| k212 | kelvin_aldea_rio_este | savage_231 | savage_hut_roundthatched | bohio_redondo | 90.56 | 124.48 | 8.13 | 9.48 | 0.00 | 4.70 | 0.00 |  |
| k213 | kelvin_aldea_rio_este | savage_232 | savage_hut_roundthatched | bohio_redondo | 89.74 | 128.67 | 8.09 | 9.77 | 0.00 | 4.51 | 0.00 |  |
| k214 | kelvin_aldea_rio_este | savage_233 | savage_hut_roundthatched | bohio_redondo | 90.60 | 133.09 | 8.10 | 9.55 | 0.00 | 4.67 | 0.00 |  |
| k215 | kelvin_aldea_rio_este | savage_235 | savage_hut_roundthatched | bohio_redondo | 94.53 | 124.12 | 8.21 | 9.88 | 0.00 | 4.62 | 0.00 |  |
| k216 | kelvin_aldea_rio_este | savage_238 | savage_hut_roundthatched | bohio_redondo | 81.36 | 124.44 | 8.53 | 10.20 | 0.00 | 4.94 | 0.00 |  |
| k217 | kelvin_aldea_rio_este | savage_239 | savage_hut_roundthatched | bohio_redondo | 78.86 | 127.45 | 8.62 | 9.97 | 0.00 | 5.19 | 0.00 |  |
| k218 | kelvin_aldea_rio_este | savage_240 | savage_hut_roundthatched | bohio_redondo | 79.55 | 120.75 | 8.67 | 10.34 | 0.00 | 5.08 | 0.00 |  |
| k219 | kelvin_aldea_rio_este | savage_241 | savage_hut_roundthatched | bohio_redondo | 99.54 | 122.26 | 8.27 | 9.62 | 0.00 | 4.84 | 0.00 |  |
| k220 | kelvin_aldea_rio_este | savage_242 | savage_hut_roundthatched | bohio_redondo | 83.88 | 120.15 | 8.55 | 10.23 | 0.00 | 4.97 | 0.00 |  |
| k221 | kelvin_aldea_rio_este | savage_243 | savage_hut_roundthatched | bohio_redondo | 83.73 | 115.25 | 8.78 | 10.13 | 0.00 | 5.35 | 0.00 |  |
| k222 | kelvin_aldea_rio_este | savage_244 | savage_hut_roundthatched | bohio_redondo | 86.19 | 123.00 | 8.35 | 9.81 | 0.00 | 4.92 | 0.00 |  |
| k223 | kelvin_aldea_rio_este | savage_245 | savage_hut_roundthatched | bohio_redondo | 93.59 | 127.47 | 8.15 | 9.60 | 0.00 | 4.71 | 0.00 |  |
| k224 | kelvin_aldea_rio_este | savage_246 | savage_hut_roundthatched | bohio_redondo | 88.65 | 136.60 | 8.16 | 9.61 | 0.00 | 4.73 | 0.00 |  |
| k289 | kelvin_aldea_rio_este | savage_161 | savage_towerb | torre_vigia_b | 123.77 | 85.14 | 7.98 | 17.66 | -1.50 | 3.52 | 0.00 | apartada 1.5 m en planta |
| k295 | kelvin_aldea_rio_este | savage_160 | savage_towera | torre_vigia | 130.66 | 77.26 | 7.32 | 11.56 | 0.00 | 1.87 | 0.00 | escala Y del export 0.47× la mediana del asset |
| k296 | kelvin_aldea_rio_este | savage_168 | savage_towera | torre_vigia | 132.08 | 72.73 | 7.74 | 11.97 | 0.00 | 2.28 | 0.00 | escala Y del export 0.47× la mediana del asset |
| k315 | kelvin_aldea_rio_este | savage_145 | savage_wall_watchtowerb | muralla_atalaya_b | 129.59 | 68.62 | 8.60 | 18.02 | -6.00 | 7.46 | 0.00 | apartada 6.0 m en planta |
| k316 | kelvin_aldea_rio_este | savage_146 | savage_wall_watchtowerb | muralla_atalaya_b | 120.88 | 86.26 | 9.23 | 18.65 | -2.77 | 8.00 | -1.15 | apartada 3.0 m en planta |
| k317 | kelvin_aldea_rio_este | savage_150 | savage_wall_watchtowerb | muralla_atalaya_b | 128.39 | 74.55 | 8.82 | 18.23 | -4.50 | 7.65 | 0.00 | apartada 4.5 m en planta |
| k326 | kelvin_aldea_rio_este | savage_163 | savage_wall_watchtowera | muralla_atalaya_a | 133.34 | 70.61 | 6.82 | 11.29 | -1.06 | 1.28 | 1.06 | apartada 1.5 m en planta |
| k327 | kelvin_aldea_rio_este | savage_166 | savage_wall_watchtowera | muralla_atalaya_a | 128.94 | 79.85 | 7.39 | 11.87 | -1.50 | 3.02 | 0.00 | apartada 1.5 m en planta |
| k328 | kelvin_aldea_rio_este | savage_167 | savage_wall_watchtowera | muralla_atalaya_a | 123.30 | 87.64 | 7.13 | 11.60 | -1.39 | 2.75 | -0.57 | apartada 1.5 m en planta |
| k333 | kelvin_aldea_rio_este | savage_148 | savage_wall_pikessm | empalizada | 126.48 | 80.34 | 10.83 | 11.36 | -6.93 | 8.98 | -2.87 | apartada 7.5 m en planta; acostada ya en el export (muelle o estacas) |
| k334 | kelvin_aldea_rio_este | savage_155 | savage_wall_pikessm | empalizada | 124.57 | 83.03 | 14.63 | 15.16 | -4.16 | 10.27 | -1.72 | apartada 4.5 m en planta; acostada ya en el export (muelle o estacas) |
| k335 | kelvin_aldea_rio_este | savage_157 | savage_wall_pikessm | empalizada | 123.83 | 83.34 | 14.58 | 16.18 | -5.54 | 11.24 | -2.30 | apartada 6.0 m en planta; acostada ya en el export (muelle o estacas) |
| k336 | kelvin_aldea_rio_este | savage_159 | savage_wall_pikessm | empalizada | 123.72 | 84.25 | 14.55 | 17.57 | -6.93 | 13.67 | -2.87 | apartada 7.5 m en planta; acostada ya en el export (muelle o estacas) |
| k351 | kelvin_aldea_rio_este | savage_144 | savage_wall_pikessm_v2 | empalizada | 131.44 | 72.09 | 15.73 | 16.27 | -7.50 | 13.88 | 0.00 | apartada 7.5 m en planta; acostada ya en el export (muelle o estacas) |
| k352 | kelvin_aldea_rio_este | savage_147 | savage_wall_pikessm_v2 | empalizada | 123.26 | 84.51 | 14.44 | 14.98 | -6.93 | 12.59 | -2.87 | apartada 7.5 m en planta; acostada ya en el export (muelle o estacas) |
| k353 | kelvin_aldea_rio_este | savage_149 | savage_wall_pikessm_v2 | empalizada | 128.92 | 77.82 | 15.94 | 16.48 | -7.50 | 14.09 | 0.00 | apartada 7.5 m en planta; acostada ya en el export (muelle o estacas) |
| k354 | kelvin_aldea_rio_este | savage_151 | savage_wall_pikessm_v2 | empalizada | 128.41 | 78.62 | 15.96 | 18.17 | -4.24 | 13.97 | -4.24 | apartada 6.0 m en planta; acostada ya en el export (muelle o estacas) |
| k355 | kelvin_aldea_rio_este | savage_152 | savage_wall_pikessm_v2 | empalizada | 125.98 | 79.59 | 10.83 | 11.37 | -6.93 | 8.33 | -2.87 | apartada 7.5 m en planta; acostada ya en el export (muelle o estacas) |
| k356 | kelvin_aldea_rio_este | savage_153 | savage_wall_pikessm_v2 | empalizada | 123.73 | 83.33 | 14.60 | 15.13 | -5.54 | 11.07 | -2.30 | apartada 6.0 m en planta; acostada ya en el export (muelle o estacas) |
| k357 | kelvin_aldea_rio_este | savage_154 | savage_wall_pikessm_v2 | empalizada | 126.94 | 79.17 | 16.00 | 16.53 | -5.54 | 12.48 | -2.30 | apartada 6.0 m en planta; acostada ya en el export (muelle o estacas) |
| k358 | kelvin_aldea_rio_este | savage_156 | savage_wall_pikessm_v2 | empalizada | 127.78 | 78.87 | 16.00 | 16.53 | -4.16 | 11.64 | -1.72 | apartada 4.5 m en planta; acostada ya en el export (muelle o estacas) |
| k359 | kelvin_aldea_rio_este | savage_158 | savage_wall_pikessm_v2 | empalizada | 123.60 | 84.24 | 14.43 | 16.02 | -6.93 | 12.91 | -2.87 | apartada 7.5 m en planta; acostada ya en el export (muelle o estacas) |
| k364 | kelvin_aldea_rio_este | savage_162 | savage_entrance_spiked | portal_puas | 126.29 | 76.78 | 14.23 | 20.93 | -8.31 | 12.34 | -3.44 | apartada 9.0 m en planta |
| k366 | kelvin_aldea_rio_este | savage_164 | savage_bridge | puente_madera | 126.73 | 78.09 | 9.07 | 14.08 | 0.00 | 4.09 | 0.00 | escala Y del export 0.58× la mediana del asset |
| k374 | kelvin_aldea_rio_este | savage_165 | savage_campc_v2 | campamento_c | 127.71 | 73.21 | 9.72 | 13.90 | 0.00 | 6.06 | 0.00 |  |
| k026 | kelvin_aldea_rio_oeste | Box068 | canoa | canoa | -115.22 | 6.59 | 13.05 | 13.53 | 0.00 | 11.47 | 0.00 |  |
| k027 | kelvin_aldea_rio_oeste | Box069 | canoa | canoa | -116.88 | 2.88 | 13.05 | 13.53 | 0.00 | 11.47 | 0.00 |  |
| k035 | kelvin_aldea_rio_oeste | Box077 | canoa | canoa | -165.85 | -3.44 | 14.05 | 14.53 | 0.00 | 12.47 | 0.00 |  |
| k037 | kelvin_aldea_rio_oeste | Box079 | canoa | canoa | -173.99 | 22.63 | 14.05 | 14.53 | 0.00 | 12.47 | 0.00 |  |
| k039 | kelvin_aldea_rio_oeste | Box081 | canoa | canoa | -119.67 | 26.78 | 13.05 | 13.53 | 2.00 | 11.42 | 0.00 | apartada 2.0 m en planta |
| k040 | kelvin_aldea_rio_oeste | Box082 | canoa | canoa | -120.96 | 30.34 | 13.05 | 13.53 | 1.00 | 11.42 | 0.00 | apartada 1.0 m en planta |
| k041 | kelvin_aldea_rio_oeste | Box083 | canoa | canoa | -122.68 | 33.31 | 13.05 | 13.53 | 1.00 | 11.42 | 0.00 | apartada 1.0 m en planta |
| k042 | kelvin_aldea_rio_oeste | Box084 | canoa | canoa | -125.10 | 37.43 | 13.05 | 13.53 | 0.00 | 11.42 | 0.00 |  |
| k062 | kelvin_aldea_rio_oeste | SavageG1_V_015 | savage_carpa_suelta_a | carpa_a | -144.91 | 13.76 | 15.55 | 18.85 | 0.00 | 13.47 | 0.00 |  |
| k067 | kelvin_aldea_rio_oeste | SavageG1_V_016 | savage_carpa_suelta_b | carpa_b | -133.93 | 17.93 | 15.32 | 21.77 | 0.00 | 13.24 | 0.00 |  |
| k079 | kelvin_aldea_rio_oeste | SavageG1_V_017 | savage_carpa_suelta_e | carpa_e | -139.97 | 38.37 | 16.51 | 21.75 | 0.00 | 14.50 | 0.00 |  |
| k080 | kelvin_aldea_rio_oeste | SavageG1_V_018 | savage_carpa_suelta_e | carpa_e | -131.56 | 35.70 | 15.45 | 20.69 | 0.00 | 13.44 | 0.00 |  |
| k081 | kelvin_aldea_rio_oeste | SavageG1_V_019 | savage_carpa_suelta_e | carpa_e | -130.08 | 30.04 | 15.45 | 20.69 | 0.00 | 13.44 | 0.00 |  |
| k084 | kelvin_aldea_rio_oeste | SavageG1_V_029 | savage_carpa_suelta_e | carpa_e | -135.84 | 31.02 | 15.65 | 20.89 | 0.00 | 13.64 | 0.00 |  |
| k086 | kelvin_aldea_rio_oeste | SavageG1_V_030 | savage_carpa_suelta_e | carpa_e | -135.68 | 25.23 | 15.32 | 20.57 | 0.00 | 13.31 | 0.00 |  |
| k087 | kelvin_aldea_rio_oeste | SavageG1_V_031 | savage_carpa_suelta_e | carpa_e | -142.56 | 20.62 | 15.26 | 20.50 | 0.00 | 13.25 | 0.00 |  |
| k185 | kelvin_aldea_rio_oeste | savage_045 | savage_monumentb | monumento_b | -147.52 | 30.62 | 15.83 | 26.97 | 0.00 | 8.19 | 0.00 |  |
| k197 | kelvin_aldea_rio_oeste | savage_053 | savage_hut_roundthatched | bohio_redondo | -99.57 | 24.30 | 14.70 | 17.69 | 0.00 | 10.87 | 0.00 | escala Y del export 1.78× la mediana del asset |
| k198 | kelvin_aldea_rio_oeste | savage_062 | savage_hut_roundthatched | bohio_redondo | -90.19 | 34.08 | 14.30 | 19.32 | 0.00 | 9.49 | 0.00 | escala Y del export 2.99× la mediana del asset |
| k199 | kelvin_aldea_rio_oeste | savage_063 | savage_hut_roundthatched | bohio_redondo | -91.85 | 25.64 | 14.22 | 16.81 | 0.00 | 10.67 | 0.00 | escala Y del export 1.54× la mediana del asset |
| k200 | kelvin_aldea_rio_oeste | savage_064 | savage_hut_roundthatched | bohio_redondo | -97.83 | 30.08 | 14.59 | 16.99 | 0.00 | 11.04 | 0.00 | escala Y del export 1.43× la mediana del asset |
| k201 | kelvin_aldea_rio_oeste | savage_076 | savage_hut_roundthatched | bohio_redondo | -101.14 | 38.11 | 14.78 | 20.92 | 0.00 | 9.14 | 0.00 | escala Y del export 3.66× la mediana del asset |
| k234 | kelvin_aldea_rio_oeste | savage_057 | savage_tentsm | tienda_pequena | -197.72 | 36.24 | 16.37 | 17.93 | 0.00 | 8.51 | 0.00 |  |
| k311 | kelvin_aldea_rio_oeste | savage_131 | savage_wall_watchtowerb | muralla_atalaya_b | -128.33 | 24.20 | 15.14 | 24.56 | -1.39 | 14.00 | 0.57 | apartada 1.5 m en planta |
| k312 | kelvin_aldea_rio_oeste | savage_132 | savage_wall_watchtowerb | muralla_atalaya_b | -138.98 | 42.07 | 15.10 | 24.52 | 0.00 | 13.87 | 0.00 |  |
| k313 | kelvin_aldea_rio_oeste | savage_133 | savage_wall_watchtowerb | muralla_atalaya_b | -156.65 | 32.33 | 15.90 | 25.32 | 0.00 | 14.74 | 0.00 |  |
| k314 | kelvin_aldea_rio_oeste | savage_134 | savage_wall_watchtowerb | muralla_atalaya_b | -153.50 | 39.49 | 15.81 | 25.22 | 0.00 | 14.58 | 0.00 |  |
| k330 | kelvin_aldea_rio_oeste | savage_135 | savage_wall_pikessm | empalizada | -137.67 | 42.18 | 17.57 | 18.10 | -5.54 | 15.71 | -2.30 | apartada 6.0 m en planta; acostada ya en el export (muelle o estacas) |
| k331 | kelvin_aldea_rio_oeste | savage_142 | savage_wall_pikessm | empalizada | -130.06 | 32.92 | 16.87 | 17.40 | -4.50 | 15.02 | 0.00 | apartada 4.5 m en planta; acostada ya en el export (muelle o estacas) |
| k332 | kelvin_aldea_rio_oeste | savage_143 | savage_wall_pikessm | empalizada | -126.60 | 27.10 | 16.79 | 17.32 | -3.00 | 14.94 | 0.00 | apartada 3.0 m en planta; acostada ya en el export (muelle o estacas) |
| k342 | kelvin_aldea_rio_oeste | savage_137 | savage_wall_rock | muro_roca | -156.54 | 22.60 | 16.09 | 19.61 | 0.00 | 13.92 | 0.00 | escala Y del export 0.47× la mediana del asset |
| k343 | kelvin_aldea_rio_oeste | savage_138 | savage_wall_rock | muro_roca | -154.90 | 16.87 | 16.30 | 19.81 | 0.00 | 14.12 | 0.00 | escala Y del export 0.47× la mediana del asset |
| k344 | kelvin_aldea_rio_oeste | savage_139 | savage_wall_rock | muro_roca | -151.60 | 11.77 | 16.08 | 19.60 | 0.00 | 13.91 | 0.00 | escala Y del export 0.47× la mediana del asset |
| k345 | kelvin_aldea_rio_oeste | savage_140 | savage_wall_rock | muro_roca | -158.14 | 37.55 | 15.89 | 19.40 | 0.00 | 13.71 | 0.00 | escala Y del export 0.47× la mediana del asset |
| k350 | kelvin_aldea_rio_oeste | savage_141 | savage_wall_pikessm_v2 | empalizada | -134.26 | 39.32 | 16.44 | 16.97 | -6.00 | 14.59 | 0.00 | apartada 6.0 m en planta; acostada ya en el export (muelle o estacas) |
| k063 | kelvin_aldea_lomas | SavageG1_V_022 | savage_carpa_suelta_a | carpa_a | -89.99 | 95.08 | 15.61 | 18.91 | 0.00 | 11.58 | 0.00 |  |
| k064 | kelvin_aldea_lomas | SavageG1_V_04 | savage_carpa_suelta_a | carpa_a | -88.72 | 88.74 | 17.39 | 20.68 | 0.00 | 13.36 | 0.00 |  |
| k066 | kelvin_aldea_lomas | SavageG1_V_01 | savage_carpa_suelta_b | carpa_b | -83.75 | 76.89 | 19.14 | 25.59 | 0.00 | 16.32 | 0.00 |  |
| k068 | kelvin_aldea_lomas | SavageG1_V_032 | savage_carpa_suelta_b | carpa_b | -82.12 | 82.62 | 18.46 | 26.54 | 0.00 | 15.66 | 0.00 |  |
| k070 | kelvin_aldea_lomas | SavageG1_V_02 | savage_carpa_suelta_c | carpa_c | -92.21 | 103.11 | 15.06 | 17.84 | 0.00 | 12.60 | 0.00 |  |
| k071 | kelvin_aldea_lomas | SavageG1_V_024 | savage_carpa_suelta_c | carpa_c | -95.06 | 93.00 | 16.88 | 19.66 | 0.00 | 12.23 | 0.00 |  |
| k072 | kelvin_aldea_lomas | SavageG1_V_025 | savage_carpa_suelta_c | carpa_c | -87.18 | 101.54 | 14.85 | 17.63 | 0.00 | 10.20 | 0.00 |  |
| k074 | kelvin_aldea_lomas | SavageG1_V_023 | savage_carpa_suelta_d | carpa_d | -98.44 | 96.19 | 15.28 | 16.84 | 0.00 | 10.48 | 0.00 |  |
| k075 | kelvin_aldea_lomas | SavageG1_V_026 | savage_carpa_suelta_d | carpa_d | -82.08 | 91.39 | 17.30 | 18.86 | 0.00 | 14.52 | 0.00 |  |
| k076 | kelvin_aldea_lomas | SavageG1_V_027 | savage_carpa_suelta_d | carpa_d | -95.05 | 99.51 | 14.99 | 16.56 | 0.00 | 11.27 | 0.00 |  |
| k077 | kelvin_aldea_lomas | SavageG1_V_028 | savage_carpa_suelta_d | carpa_d | -86.46 | 93.07 | 16.27 | 17.83 | 0.00 | 11.47 | 0.00 |  |
| k078 | kelvin_aldea_lomas | SavageG1_V_06 | savage_carpa_suelta_d | carpa_d | -88.94 | 99.71 | 14.68 | 16.24 | 0.00 | 12.06 | 0.00 |  |
| k082 | kelvin_aldea_lomas | SavageG1_V_020 | savage_carpa_suelta_e | carpa_e | -81.06 | 101.78 | 16.93 | 24.10 | 0.00 | 15.96 | 0.00 | escala Y del export 1.37× la mediana del asset |
| k083 | kelvin_aldea_lomas | SavageG1_V_021 | savage_carpa_suelta_e | carpa_e | -98.74 | 89.71 | 18.13 | 25.30 | 0.00 | 16.04 | 0.00 | escala Y del export 1.37× la mediana del asset |
| k085 | kelvin_aldea_lomas | SavageG1_V_03 | savage_carpa_suelta_e | carpa_e | -81.98 | 94.45 | 17.62 | 24.79 | 0.00 | 17.19 | 0.00 | escala Y del export 1.37× la mediana del asset |
| k096 | kelvin_aldea_lomas | SavageG1_V_05 | savage_carpa_suelta_f | carpa_f | -73.00 | 83.22 | 23.13 | 27.31 | 0.00 | 20.38 | 0.00 |  |
| k097 | kelvin_aldea_lomas | SavageG1_V_07 | savage_carpa_suelta_g | carpa_g | -93.03 | 84.08 | 22.73 | 26.90 | 0.00 | 18.05 | 0.00 |  |
| k297 | kelvin_aldea_lomas | savage_220 | savage_towera | torre_vigia | -69.25 | 92.06 | 24.87 | 34.06 | 0.00 | 15.66 | 0.00 |  |
| k298 | kelvin_aldea_lomas | savage_221 | savage_towera | torre_vigia | -80.69 | 67.38 | 18.71 | 27.90 | 0.00 | 11.20 | 0.00 |  |
| k299 | kelvin_aldea_lomas | savage_222 | savage_towera | torre_vigia | -89.48 | 73.25 | 24.79 | 33.98 | 0.00 | 21.20 | 0.00 |  |
| k300 | kelvin_aldea_lomas | savage_223 | savage_towera | torre_vigia | -61.27 | 83.50 | 23.13 | 32.32 | 0.00 | 14.99 | 0.00 |  |
| k301 | kelvin_aldea_lomas | savage_224 | savage_towera | torre_vigia | -119.80 | 84.71 | 41.62 | 50.67 | 0.00 | 16.27 | 0.00 |  |
| k302 | kelvin_aldea_lomas | savage_225 | savage_towera | torre_vigia | -104.54 | 76.37 | 37.64 | 46.70 | 0.00 | 12.30 | 0.00 |  |
| k303 | kelvin_aldea_lomas | savage_226 | savage_towera | torre_vigia | -116.45 | 103.09 | 27.77 | 36.83 | 0.00 | 13.58 | 0.00 |  |
| k304 | kelvin_aldea_lomas | savage_227 | savage_towera | torre_vigia | -88.11 | 120.11 | 29.25 | 38.31 | 0.00 | 11.73 | 0.00 |  |
| k305 | kelvin_aldea_lomas | savage_228 | savage_towera | torre_vigia | -77.92 | 118.38 | 29.26 | 38.32 | 0.00 | 13.47 | 0.00 |  |
| k306 | kelvin_aldea_lomas | savage_229 | savage_towera | torre_vigia | -66.47 | 98.99 | 25.47 | 34.53 | 0.00 | 9.09 | 0.00 |  |
| k307 | kelvin_aldea_lomas | savage_230 | savage_towera | torre_vigia | -85.80 | 69.63 | 21.48 | 30.67 | 0.00 | 12.54 | 0.00 |  |
| k341 | kelvin_aldea_lomas | savage_136 | savage_wall_rock | muro_roca | -103.24 | 73.85 | 37.89 | 45.41 | 0.00 | 16.50 | 0.00 |  |
| k346 | kelvin_aldea_lomas | savage_171 | savage_wall_rock | muro_roca | -67.46 | 92.79 | 24.01 | 31.53 | 0.00 | 15.19 | 0.00 |  |
| k347 | kelvin_aldea_lomas | savage_172 | savage_wall_rock | muro_roca | -83.46 | 117.44 | 29.25 | 36.78 | 0.00 | 14.30 | 0.00 |  |
| k348 | kelvin_aldea_lomas | savage_173 | savage_wall_rock | muro_roca | -56.73 | 84.13 | 23.12 | 30.65 | 0.00 | 16.76 | 0.00 |  |
| k349 | kelvin_aldea_lomas | savage_174 | savage_wall_rock | muro_roca | -121.22 | 83.30 | 41.62 | 49.14 | 0.00 | 17.93 | 0.00 |  |
| k376 | kelvin_aldea_lomas | savage_219 | savage_entranceb_v2 | portal_madera_b | -76.25 | 77.48 | 17.39 | 23.52 | 0.00 | 13.80 | 0.00 |  |
| k098 | kelvin_aldea_rio_este_2 | ancient_050 | ancient_larged | templo_grande_d | 175.90 | -7.29 | 54.58 | 71.83 | -1.50 | 11.26 | 0.00 | apartada 1.5 m en planta |
| k109 | kelvin_aldea_rio_este_2 | ancient_107 | ancient_mediumh | templo_mediano_h | 171.00 | -4.00 | 46.45 | 74.58 | -1.50 | 11.26 | 0.00 | apartada 1.5 m en planta |
| k110 | kelvin_aldea_rio_este_2 | ancient_108 | ancient_mediumh | templo_mediano_h | 173.12 | 10.23 | 39.42 | 67.55 | -1.15 | 19.13 | 2.77 | apartada 3.0 m en planta |
| k111 | kelvin_aldea_rio_este_2 | ancient_109 | ancient_mediumh | templo_mediano_h | 178.48 | -9.35 | 56.35 | 84.47 | -1.50 | 11.26 | 0.00 | apartada 1.5 m en planta |
| k132 | kelvin_aldea_rio_este_2 | ancient_110 | ancient_towera | ruina_torre | 176.84 | -16.13 | 48.86 | 62.49 | -1.50 | 11.26 | 0.00 | apartada 1.5 m en planta |
| k133 | kelvin_aldea_rio_este_2 | ancient_111 | ancient_towera | ruina_torre | 175.72 | 5.43 | 52.94 | 66.58 | 0.00 | 35.19 | 0.00 |  |
| k134 | kelvin_aldea_rio_este_2 | ancient_112 | ancient_towera | ruina_torre | 174.57 | 8.20 | 47.87 | 61.51 | -1.15 | 17.65 | 2.77 | apartada 3.0 m en planta |
| k135 | kelvin_aldea_rio_este_2 | ancient_113 | ancient_towera | ruina_torre | 194.69 | 9.80 | 52.17 | 65.81 | 2.12 | 21.95 | 2.12 | apartada 3.0 m en planta |
| k136 | kelvin_aldea_rio_este_2 | ancient_114 | ancient_towera | ruina_torre | 194.69 | 9.80 | 39.70 | 53.34 | 2.12 | 21.95 | 2.12 | apartada 3.0 m en planta |
| k137 | kelvin_aldea_rio_este_2 | ancient_115 | ancient_towera | ruina_torre | 159.27 | -0.91 | 47.87 | 61.50 | -1.15 | 17.65 | 2.77 | apartada 3.0 m en planta |
| k138 | kelvin_aldea_rio_este_2 | ancient_116 | ancient_towera | ruina_torre | 160.42 | -3.68 | 46.47 | 60.10 | 0.00 | 28.72 | 0.00 |  |
| k252 | kelvin_aldea_rio_este_2 | savage_083 | savage_monumentd | monumento_d | 104.63 | 16.76 | 23.95 | 30.42 | 0.00 | 8.52 | 0.00 |  |
| k253 | kelvin_aldea_rio_este_2 | savage_084 | savage_hall_long | caney_largo | 109.39 | 22.93 | 23.65 | 26.42 | 0.00 | 8.00 | 0.00 |  |
| k254 | kelvin_aldea_rio_este_2 | savage_085 | savage_hall_long | caney_largo | 95.46 | 14.89 | 24.20 | 26.96 | 0.00 | 8.54 | 0.00 |  |
| k255 | kelvin_aldea_rio_este_2 | savage_087 | savage_hall_round | cercado_redondo | 103.03 | 6.39 | 23.45 | 25.30 | 0.00 | 7.80 | 0.00 | escala Y del export 0.56× la mediana del asset |
| k257 | kelvin_aldea_rio_este_2 | savage_089 | savage_hut_roundpointed_v2 | bohio_puntiagudo | 118.67 | 30.01 | 23.38 | 25.65 | 0.00 | 7.72 | 0.00 | escala Y del export 0.57× la mediana del asset |
| k260 | kelvin_aldea_rio_este_2 | savage_090 | savage_hut_roundthatched_v2 | bohio_redondo | 123.33 | 32.08 | 22.98 | 24.36 | 0.00 | 7.28 | 0.00 |  |
| k261 | kelvin_aldea_rio_este_2 | savage_092 | savage_hut_roundthatched_v2 | bohio_redondo | 126.14 | 27.82 | 23.06 | 24.45 | 0.00 | 7.37 | 0.00 |  |
| k262 | kelvin_aldea_rio_este_2 | savage_093 | savage_hut_roundthatched_v2 | bohio_redondo | 120.86 | 27.79 | 23.38 | 24.77 | 0.00 | 7.69 | 0.00 |  |
| k263 | kelvin_aldea_rio_este_2 | savage_094 | savage_hut_roundthatched_v2 | bohio_redondo | 119.01 | 20.59 | 23.43 | 24.81 | 0.00 | 7.74 | 0.00 |  |
| k264 | kelvin_aldea_rio_este_2 | savage_095 | savage_hut_roundthatched_v2 | bohio_redondo | 118.21 | 24.31 | 23.48 | 24.87 | 0.00 | 7.79 | 0.00 |  |
| k265 | kelvin_aldea_rio_este_2 | savage_096 | savage_hut_roundthatched_v2 | bohio_redondo | 127.67 | 31.05 | 22.64 | 24.02 | 0.00 | 6.94 | 0.00 |  |
| k266 | kelvin_aldea_rio_este_2 | savage_097 | savage_hut_roundthatched_v2 | bohio_redondo | 123.60 | 19.92 | 23.15 | 24.53 | 0.00 | 7.45 | 0.00 |  |
| k267 | kelvin_aldea_rio_este_2 | savage_098 | savage_hut_roundthatched_v2 | bohio_redondo | 95.63 | 21.82 | 24.29 | 25.67 | 0.00 | 8.60 | 0.00 |  |
| k268 | kelvin_aldea_rio_este_2 | savage_099 | savage_hut_roundthatched_v2 | bohio_redondo | 90.72 | 13.83 | 24.66 | 26.04 | 0.00 | 8.96 | 0.00 |  |
| k269 | kelvin_aldea_rio_este_2 | savage_101 | savage_hut_roundthatched_v2 | bohio_redondo | 100.40 | 22.18 | 24.08 | 25.46 | 0.00 | 8.38 | 0.00 |  |
| k270 | kelvin_aldea_rio_este_2 | savage_102 | savage_hut_roundthatched_v2 | bohio_redondo | 95.04 | 7.67 | 24.07 | 25.45 | 0.00 | 8.37 | 0.00 |  |
| k271 | kelvin_aldea_rio_este_2 | savage_103 | savage_hut_roundthatched_v2 | bohio_redondo | 109.72 | 5.89 | 23.14 | 24.52 | 0.00 | 7.45 | 0.00 |  |
| k277 | kelvin_aldea_rio_este_2 | savage_091 | savage_bldgb | casa_paja_b | 124.33 | 25.18 | 23.00 | 25.07 | 0.00 | 7.40 | 0.00 |  |
| k033 | kelvin_aldea_mina | Box075 | canoa | canoa | 68.46 | -72.80 | 5.05 | 5.53 | -3.00 | 3.47 | 0.00 | apartada 3.0 m en planta |
| k043 | kelvin_aldea_mina | Box085 | canoa | canoa | 54.90 | -79.95 | 6.19 | 6.67 | 0.00 | 4.61 | 0.00 |  |
| k044 | kelvin_aldea_mina | Box086 | canoa | canoa | 39.85 | -78.72 | 9.05 | 9.53 | 0.00 | 7.47 | 0.00 |  |
| k045 | kelvin_aldea_mina | Box087 | canoa | canoa | 44.96 | -82.55 | 9.05 | 9.53 | 1.15 | 7.47 | 2.77 | apartada 3.0 m en planta |
| k046 | kelvin_aldea_mina | Box088 | canoa | canoa | 41.57 | -72.13 | 9.05 | 9.53 | -4.24 | 7.47 | -4.24 | apartada 6.0 m en planta |
| k047 | kelvin_aldea_mina | Box089 | canoa | canoa | 48.90 | -77.86 | 8.05 | 8.53 | 0.00 | 6.47 | 0.00 |  |
| k048 | kelvin_aldea_mina | Box090 | canoa | canoa | 62.34 | -74.74 | 5.05 | 5.53 | -1.41 | 3.47 | 1.41 | apartada 2.0 m en planta |
| k122 | kelvin_aldea_mina | ancient_122 | ancient_towerb | ruina_torre_b | 43.66 | -102.96 | 53.90 | 61.86 | 0.00 | 24.03 | 0.00 |  |
| k123 | kelvin_aldea_mina | ancient_123 | ancient_towerb | ruina_torre_b | 49.49 | -117.31 | 51.50 | 59.46 | 0.00 | 27.29 | 0.00 |  |
| k124 | kelvin_aldea_mina | ancient_124 | ancient_towerb | ruina_torre_b | 51.79 | -134.06 | 59.58 | 67.54 | 0.00 | 35.37 | 0.00 |  |
| k184 | kelvin_aldea_mina | savage_189 | savage_monumenta | monumento_a | 128.16 | -95.17 | 30.89 | 34.81 | -0.00 | 12.42 | -7.50 | apartada 7.5 m en planta; escala Y del export 0.71× la mediana del asset |
| k187 | kelvin_aldea_mina | savage_208 | savage_monumentc | monumento_c | 84.07 | -94.06 | 15.08 | 29.93 | 0.00 | 5.75 | 0.00 | no se dibuja: choca con agua o sendero |
| k258 | kelvin_aldea_mina | savage_201 | savage_hut_roundpointed_v2 | bohio_puntiagudo | 87.94 | -138.27 | 40.28 | 44.63 | 0.00 | 36.93 | 0.00 |  |
| k259 | kelvin_aldea_mina | savage_204 | savage_hut_roundpointed_v2 | bohio_puntiagudo | 98.65 | -135.89 | 37.94 | 41.96 | 0.00 | 34.24 | 0.00 |  |
| k272 | kelvin_aldea_mina | savage_198 | savage_hut_roundthatched_v2 | bohio_redondo | 90.63 | -137.96 | 40.86 | 43.50 | 0.00 | 37.43 | 0.00 | escala Y del export 1.91× la mediana del asset |
| k273 | kelvin_aldea_mina | savage_200 | savage_hut_roundthatched_v2 | bohio_redondo | 92.26 | -142.06 | 43.60 | 46.24 | 0.00 | 40.17 | 0.00 | escala Y del export 1.91× la mediana del asset |
| k274 | kelvin_aldea_mina | savage_202 | savage_hut_roundthatched_v2 | bohio_redondo | 88.36 | -133.56 | 34.08 | 36.72 | 0.00 | 30.65 | 0.00 | escala Y del export 1.91× la mediana del asset |
| k275 | kelvin_aldea_mina | savage_203 | savage_hut_roundthatched_v2 | bohio_redondo | 93.77 | -133.35 | 34.18 | 36.82 | 0.00 | 30.75 | 0.00 | escala Y del export 1.91× la mediana del asset |
| k276 | kelvin_aldea_mina | savage_205 | savage_hut_roundthatched_v2 | bohio_redondo | 96.46 | -140.89 | 43.24 | 45.88 | 0.00 | 39.81 | 0.00 | escala Y del export 1.91× la mediana del asset |
| k278 | kelvin_aldea_mina | savage_199 | savage_bldgb | casa_paja_b | 95.10 | -136.76 | 39.00 | 41.07 | 0.00 | 35.79 | 0.00 |  |
| k279 | kelvin_aldea_mina | savage_206 | savage_bldgb | casa_paja_b | 89.10 | -136.21 | 37.10 | 39.17 | 0.00 | 33.89 | 0.00 |  |
| k340 | kelvin_aldea_mina | savage_217 | savage_wall_pikessm | empalizada | 85.82 | -78.75 | 10.37 | 16.19 | 0.00 | 5.07 | 3.00 | apartada 3.0 m en planta |
| k360 | kelvin_aldea_mina | savage_211 | savage_wall_pikessm_v2 | empalizada | 82.70 | -83.95 | 9.19 | 14.21 | 3.18 | -0.52 | 3.18 | apartada 4.5 m en planta |
| k361 | kelvin_aldea_mina | savage_212 | savage_wall_pikessm_v2 | empalizada | 83.68 | -92.95 | 8.70 | 13.72 | 4.50 | 0.93 | 0.00 | apartada 4.5 m en planta |
| k363 | kelvin_aldea_mina | savage_218 | savage_wall_pikessm_v2 | empalizada | 81.96 | -82.30 | 9.92 | 15.74 | 1.39 | 1.62 | 0.57 | apartada 1.5 m en planta |
| k017 | kelvin_aldea_meandros | Box059 | canoa | canoa | -46.29 | 10.62 | 11.05 | 11.53 | 0.00 | 9.47 | 0.00 |  |
| k018 | kelvin_aldea_meandros | Box060 | canoa | canoa | -44.34 | 6.98 | 11.05 | 11.53 | 0.00 | 9.47 | 0.00 |  |
| k019 | kelvin_aldea_meandros | Box061 | canoa | canoa | -46.00 | 3.27 | 11.05 | 11.53 | 0.00 | 9.47 | 0.00 |  |
| k020 | kelvin_aldea_meandros | Box062 | canoa | canoa | -43.69 | -9.17 | 11.05 | 11.53 | 0.00 | 9.47 | 0.00 |  |
| k022 | kelvin_aldea_meandros | Box064 | canoa | canoa | 23.84 | -24.66 | 9.05 | 9.53 | 0.00 | 7.47 | 0.00 |  |
| k023 | kelvin_aldea_meandros | Box065 | canoa | canoa | 22.19 | -28.37 | 9.05 | 9.53 | 0.00 | 7.47 | 0.00 |  |
| k024 | kelvin_aldea_meandros | Box066 | canoa | canoa | 26.07 | -11.01 | 9.05 | 9.53 | 0.00 | 7.47 | 0.00 |  |
| k025 | kelvin_aldea_meandros | Box067 | canoa | canoa | 19.91 | 1.00 | 9.05 | 9.53 | 0.00 | 7.47 | 0.00 |  |
| k028 | kelvin_aldea_meandros | Box070 | canoa | canoa | -9.54 | -10.41 | 10.05 | 10.53 | 0.00 | 8.47 | 0.00 |  |
| k186 | kelvin_aldea_meandros | savage_046 | savage_monumentc | monumento_c | -34.30 | 60.79 | 13.14 | 25.79 | 0.00 | 7.49 | 0.00 |  |
| k192 | kelvin_aldea_meandros | savage_051 | savage_hut_roundpointed | bohio_puntiagudo | -60.58 | 34.39 | 13.41 | 18.33 | 0.00 | 8.85 | 0.00 |  |
| k193 | kelvin_aldea_meandros | savage_052 | savage_bldga | casa_paja_a | -23.94 | 4.77 | 12.20 | 18.17 | 0.00 | 7.40 | 0.00 |  |
| k202 | kelvin_aldea_meandros | savage_107 | savage_hut_roundthatched | bohio_redondo | -25.06 | 13.12 | 12.28 | 13.96 | 0.00 | 9.21 | 0.00 |  |
| k203 | kelvin_aldea_meandros | savage_108 | savage_hut_roundthatched | bohio_redondo | -21.52 | 14.93 | 12.20 | 13.55 | 0.00 | 9.28 | 0.00 |  |
| k204 | kelvin_aldea_meandros | savage_109 | savage_hut_roundthatched | bohio_redondo | -17.25 | 4.49 | 11.84 | 13.29 | 0.00 | 8.93 | 0.00 |  |
| k205 | kelvin_aldea_meandros | savage_110 | savage_hut_roundthatched | bohio_redondo | -18.52 | 11.90 | 11.94 | 13.62 | 0.00 | 8.87 | 0.00 |  |
| k206 | kelvin_aldea_meandros | savage_111 | savage_hut_roundthatched | bohio_redondo | -9.78 | 24.53 | 12.77 | 14.81 | 0.00 | 9.27 | 0.00 |  |
| k207 | kelvin_aldea_meandros | savage_112 | savage_hut_roundthatched | bohio_redondo | -7.66 | 26.29 | 12.77 | 14.12 | 0.00 | 8.69 | 0.00 |  |
| k208 | kelvin_aldea_meandros | savage_113 | savage_hut_roundthatched | bohio_redondo | -2.50 | 46.05 | 16.06 | 21.74 | 0.00 | 6.86 | 0.00 | escala Y del export 3.39× la mediana del asset |
| k209 | kelvin_aldea_meandros | savage_114 | savage_hut_roundthatched | bohio_redondo | -2.14 | 39.20 | 19.40 | 24.08 | 0.00 | 10.14 | 0.00 | escala Y del export 2.59× la mediana del asset |
| k210 | kelvin_aldea_meandros | savage_175 | savage_hut_roundthatched | bohio_redondo | -4.14 | 36.17 | 14.56 | 19.82 | 0.00 | 7.34 | 0.00 | escala Y del export 2.59× la mediana del asset |
| k211 | kelvin_aldea_meandros | savage_176 | savage_hut_roundthatched | bohio_redondo | -4.61 | 26.65 | 12.74 | 14.09 | 0.00 | 8.66 | 0.00 |  |
| k280 | kelvin_aldea_meandros | savage_104 | savage_pen | corral | -4.97 | 41.04 | 14.89 | 19.98 | 0.00 | 10.14 | 0.00 |  |
| k283 | kelvin_aldea_meandros | savage_248 | savage_tieredlookout | mirador_escalonado | -17.76 | 73.82 | 16.69 | 22.34 | 0.00 | 10.48 | 0.00 | escala Y del export 0.61× la mediana del asset |
| k284 | kelvin_aldea_meandros | savage_106 | savage_hutwithdeck | casa_plataforma | -5.30 | 22.66 | 12.77 | 19.90 | 0.00 | 9.90 | 0.00 |  |
| k000 | kelvin_ruinas_yunque_2 | Box042 | losa_piso | bloque_piedra | -72.79 | -125.07 | 89.65 | 93.13 | 0.00 | 57.89 | 0.00 |  |
| k001 | kelvin_ruinas_yunque_2 | Box044 | losa_piso | bloque_piedra | -72.90 | -141.34 | 90.64 | 94.13 | 0.00 | 58.88 | 0.00 |  |
| k002 | kelvin_ruinas_yunque_2 | Box054 | losa_piso | bloque_piedra | -65.93 | -127.11 | 96.67 | 100.15 | 0.00 | 64.91 | 0.00 |  |
| k003 | kelvin_ruinas_yunque_2 | Box055 | losa_piso | bloque_piedra | -65.93 | -135.16 | 92.26 | 95.75 | 0.00 | 60.50 | 0.00 |  |
| k101 | kelvin_ruinas_yunque_2 | ancient_126 | ancient_largeb | templo_grande | -59.97 | -129.21 | 94.00 | 103.95 | 0.00 | 54.48 | 0.00 | escala Y del export 0.52× la mediana del asset |
| k104 | kelvin_ruinas_yunque_2 | ancient_069 | ancient_mediumg | templo_mediano_g | -74.72 | -133.69 | 94.25 | 102.33 | 0.00 | 53.06 | 0.00 |  |
| k105 | kelvin_ruinas_yunque_2 | ancient_070 | ancient_mediumf | templo_mediano_f | -67.00 | -125.08 | 94.13 | 106.17 | 0.00 | 54.48 | 0.00 |  |
| k106 | kelvin_ruinas_yunque_2 | ancient_071 | ancient_mediume | templo_mediano | -60.98 | -137.22 | 102.99 | 111.20 | 0.00 | 64.18 | 0.00 |  |
| k112 | kelvin_ruinas_yunque_2 | ancient_125 | ancient_mediumh | templo_mediano_h | -68.32 | -121.58 | 89.52 | 115.79 | 0.00 | 54.48 | 0.00 |  |
| k142 | kelvin_ruinas_yunque_2 | ancient_127 | ancient_lookout | ruina_mirador | -60.42 | -114.99 | 80.95 | 89.67 | 0.00 | 48.70 | 0.00 |  |
| k143 | kelvin_ruinas_yunque_2 | ancient_130 | ancient_lookout | ruina_mirador | -83.80 | -124.23 | 75.59 | 84.31 | 0.00 | 43.34 | 0.00 |  |
| k144 | kelvin_ruinas_yunque_2 | ancient_132 | ancient_lookout | ruina_mirador | -90.06 | -136.99 | 81.59 | 90.31 | 0.00 | 49.34 | 0.00 |  |
| k145 | kelvin_ruinas_yunque_2 | ancient_134 | ancient_lookout | ruina_mirador | -80.73 | -141.72 | 88.50 | 97.23 | 0.00 | 56.26 | 0.00 |  |
| k146 | kelvin_ruinas_yunque_2 | ancient_136 | ancient_lookout | ruina_mirador | -71.03 | -138.93 | 93.76 | 102.49 | 0.00 | 44.97 | 0.00 |  |
| k147 | kelvin_ruinas_yunque_2 | ancient_138 | ancient_lookout | ruina_mirador | -81.72 | -136.75 | 99.68 | 105.48 | 0.00 | 56.26 | 0.00 | escala Y del export 0.67× la mediana del asset |
| k148 | kelvin_ruinas_yunque_2 | ancient_139 | ancient_lookout | ruina_mirador | -83.28 | -133.10 | 88.62 | 94.98 | 0.00 | 42.24 | 0.00 | escala Y del export 0.73× la mediana del asset |
| k155 | kelvin_ruinas_yunque_2 | ancient_128 | ancient_pillarc | ruina_pilar | -60.44 | -108.25 | 77.45 | 89.93 | 0.00 | 54.36 | 0.00 |  |
| k156 | kelvin_ruinas_yunque_2 | ancient_129 | ancient_pillarc | ruina_pilar | -83.82 | -117.49 | 71.07 | 83.55 | 0.00 | 47.98 | 0.00 |  |
| k157 | kelvin_ruinas_yunque_2 | ancient_131 | ancient_pillarc | ruina_pilar | -91.30 | -141.70 | 81.50 | 93.98 | 0.00 | 58.40 | 0.00 |  |
| k158 | kelvin_ruinas_yunque_2 | ancient_133 | ancient_pillarc | ruina_pilar | -81.02 | -148.35 | 87.68 | 100.17 | 0.00 | 64.59 | 0.00 |  |
| k159 | kelvin_ruinas_yunque_2 | ancient_135 | ancient_pillarc | ruina_pilar | -71.01 | -145.66 | 93.72 | 106.20 | 0.00 | 54.08 | 0.00 |  |
| k160 | kelvin_ruinas_yunque_2 | ancient_137 | ancient_pillarc | ruina_pilar | -82.32 | -140.56 | 93.59 | 101.89 | 0.00 | 56.26 | 0.00 | escala Y del export 0.67× la mediana del asset |
| k174 | kelvin_ruinas_yunque_2 | ancient_C2 | ancient_largea | templo_grande_a | -74.51 | -129.49 | 107.51 | 143.07 | 0.00 | 54.49 | 0.00 |  |
| k005 | kelvin_aldea_colina | Box045 | losa_piso_v3 | losa_piedra | -22.39 | 172.08 | 34.08 | 35.82 | 0.00 | 9.82 | 0.00 |  |
| k006 | kelvin_aldea_colina | Box048 | losa_piso_v3 | losa_piedra | -14.68 | 170.88 | 34.10 | 35.85 | 0.00 | 9.84 | 0.00 |  |
| k007 | kelvin_aldea_colina | Box049 | losa_piso_v3 | losa_piedra | -1.14 | 166.97 | 34.10 | 35.84 | 0.00 | 9.83 | 0.00 |  |
| k008 | kelvin_aldea_colina | Box050 | losa_piso_v3 | losa_piedra | 3.89 | 165.42 | 34.13 | 35.87 | -1.50 | 9.87 | 0.00 | apartada 1.5 m en planta |
| k009 | kelvin_aldea_colina | Box046 | losa_piso_v4 | losa_piedra | -22.35 | 179.62 | 34.09 | 35.83 | 0.00 | 9.82 | 0.00 |  |
| k010 | kelvin_aldea_colina | Box047 | losa_piso_v4 | losa_piedra | -19.27 | 186.09 | 34.30 | 36.04 | 0.00 | 9.82 | 0.00 |  |
| k011 | kelvin_aldea_colina | Box051 | losa_piso_v5 | losa_piedra | 8.09 | 162.34 | 36.24 | 37.98 | -3.18 | 11.97 | -3.18 | apartada 4.5 m en planta |
| k012 | kelvin_aldea_colina | Box052 | losa_piso_v5 | losa_piedra | -0.53 | 169.44 | 34.08 | 35.82 | -6.93 | 9.42 | -2.87 | apartada 7.5 m en planta |
| k013 | kelvin_aldea_colina | Box053 | losa_piso_v5 | losa_piedra | 13.76 | 161.18 | 35.56 | 37.30 | -0.00 | 10.91 | -4.50 | apartada 4.5 m en planta |
| k049 | kelvin_aldea_colina | Group001 | ancient_complejo_group001 | complejo_ruinas | -14.36 | 176.85 | 35.66 | 74.60 | -10.50 | 18.39 | 0.00 | apartada 10.5 m en planta |
| k088 | kelvin_aldea_colina | SavageG1_V_033 | savage_carpa_suelta_e | carpa_e | -7.03 | 110.47 | 26.41 | 31.65 | 0.00 | 11.49 | 0.00 |  |
| k089 | kelvin_aldea_colina | SavageG1_V_034 | savage_carpa_suelta_e | carpa_e | -15.41 | 125.28 | 26.63 | 31.87 | 0.00 | 11.71 | 0.00 |  |
| k090 | kelvin_aldea_colina | SavageG1_V_035 | savage_carpa_suelta_e | carpa_e | -13.73 | 133.60 | 26.46 | 31.71 | 0.00 | 11.55 | 0.00 |  |
| k091 | kelvin_aldea_colina | SavageG1_V_036 | savage_carpa_suelta_e | carpa_e | -1.00 | 108.25 | 25.99 | 31.23 | 0.00 | 11.07 | 0.00 |  |
| k092 | kelvin_aldea_colina | SavageG1_V_037 | savage_carpa_suelta_e | carpa_e | 2.84 | 111.23 | 26.18 | 31.42 | 0.00 | 11.26 | 0.00 |  |
| k093 | kelvin_aldea_colina | SavageG1_V_038 | savage_carpa_suelta_e | carpa_e | 8.84 | 113.32 | 26.27 | 31.51 | 0.00 | 11.35 | 0.00 |  |
| k094 | kelvin_aldea_colina | SavageG1_V_039 | savage_carpa_suelta_e | carpa_e | -17.10 | 130.00 | 26.46 | 31.70 | 0.00 | 11.54 | 0.00 |  |
| k095 | kelvin_aldea_colina | SavageG1_V_040 | savage_carpa_suelta_e | carpa_e | 12.49 | 126.88 | 25.19 | 30.43 | 0.00 | 10.27 | 0.00 |  |
| k189 | kelvin_aldea_colina | savage_048 | savage_monumentf | monumento_f | -1.49 | 124.80 | 26.35 | 36.01 | 0.00 | 7.80 | 0.00 |  |
| k282 | kelvin_aldea_colina | savage_247 | savage_tieredlookout | mirador_escalonado | -14.63 | 84.26 | 17.91 | 27.16 | 0.00 | 11.35 | 0.00 |  |
| k322 | kelvin_aldea_colina | savage_249 | savage_wall_watchtowerb | muralla_atalaya_b | -13.76 | 117.42 | 26.84 | 36.26 | 0.00 | 12.70 | 0.00 |  |
| k323 | kelvin_aldea_colina | savage_250 | savage_wall_watchtowerb | muralla_atalaya_b | 11.58 | 110.68 | 26.19 | 35.61 | 0.00 | 12.05 | 0.00 |  |
| k029 | kelvin_aldea_mina_2 | Box071 | canoa | canoa | 84.53 | -45.79 | 5.05 | 5.53 | -2.77 | 3.47 | 1.15 | apartada 3.0 m en planta |
| k030 | kelvin_aldea_mina_2 | Box072 | canoa | canoa | 85.24 | -40.75 | 5.05 | 5.53 | -1.00 | 3.47 | 0.00 | apartada 1.0 m en planta |
| k031 | kelvin_aldea_mina_2 | Box073 | canoa | canoa | 85.01 | -44.12 | 5.05 | 5.53 | -1.85 | 3.47 | 0.77 | apartada 2.0 m en planta |
| k032 | kelvin_aldea_mina_2 | Box074 | canoa | canoa | 84.19 | -46.14 | 5.05 | 5.53 | -3.54 | 3.47 | 3.54 | apartada 5.0 m en planta |
| k034 | kelvin_aldea_mina_2 | Box076 | canoa | canoa | 73.89 | -58.23 | 5.05 | 5.53 | 0.00 | 3.47 | 0.00 |  |
| k038 | kelvin_aldea_mina_2 | Box080 | canoa | canoa | 80.99 | -18.75 | 5.05 | 5.53 | 0.00 | 3.47 | 0.00 |  |
| k176 | kelvin_aldea_mina_2 | savage_044 | savage_monumenta | monumento_a | 48.10 | -46.34 | 10.60 | 26.18 | 0.00 | 1.63 | 0.00 | escala Y del export 2.94× la mediana del asset |
| k181 | kelvin_aldea_mina_2 | savage_186 | savage_monumenta | monumento_a | 147.14 | -80.92 | 22.86 | 30.45 | 10.61 | 2.75 | 10.61 | apartada 15.0 m en planta; escala Y del export 1.37× la mediana del asset |
| k182 | kelvin_aldea_mina_2 | savage_187 | savage_monumenta | monumento_a | 141.52 | -74.59 | 21.57 | 28.50 | 7.50 | 4.51 | 0.00 | apartada 7.5 m en planta |
| k183 | kelvin_aldea_mina_2 | savage_188 | savage_monumenta | monumento_a | 142.95 | -81.66 | 22.14 | 28.48 | 0.00 | 5.06 | 0.00 |  |
| k190 | kelvin_aldea_mina_2 | savage_207 | savage_monumentf | monumento_f | 128.76 | -37.64 | 16.59 | 26.26 | 0.00 | 4.25 | 0.00 |  |
| k286 | kelvin_aldea_mina_2 | savage_191 | savage_hutwithdeck | casa_plataforma | 98.17 | -34.54 | 9.29 | 17.58 | 0.00 | 6.58 | 0.00 |  |
| k291 | kelvin_aldea_mina_2 | savage_192 | savage_towerb | torre_vigia_b | 101.85 | -28.74 | 9.65 | 20.74 | 0.00 | 6.11 | 0.00 |  |
| k292 | kelvin_aldea_mina_2 | savage_194 | savage_towerb | torre_vigia_b | 101.18 | -36.51 | 10.25 | 21.61 | 0.00 | 5.16 | 0.00 |  |
| k293 | kelvin_aldea_mina_2 | savage_197 | savage_towerb | torre_vigia_b | 94.85 | -43.79 | 9.24 | 17.34 | 0.00 | 7.68 | 0.00 | escala Y del export 0.75× la mediana del asset |
| k318 | kelvin_aldea_mina_2 | savage_190 | savage_wall_watchtowerb | muralla_atalaya_b | 95.96 | -31.85 | 9.51 | 18.97 | 0.00 | 7.19 | 0.00 |  |
| k319 | kelvin_aldea_mina_2 | savage_193 | savage_wall_watchtowerb | muralla_atalaya_b | 101.32 | -37.71 | 9.65 | 19.11 | 0.00 | 7.32 | 0.00 |  |
| k320 | kelvin_aldea_mina_2 | savage_195 | savage_wall_watchtowerb | muralla_atalaya_b | 96.80 | -44.40 | 8.87 | 18.34 | 0.00 | 6.55 | 0.00 |  |
| k321 | kelvin_aldea_mina_2 | savage_196 | savage_wall_watchtowerb | muralla_atalaya_b | 104.48 | -45.18 | 9.79 | 19.25 | 0.00 | 7.46 | 0.00 |  |
| k337 | kelvin_aldea_mina_2 | savage_213 | savage_wall_pikessm | empalizada | 91.04 | -41.31 | 9.30 | 9.83 | 1.50 | 7.74 | 0.00 | apartada 1.5 m en planta; acostada ya en el export (muelle o estacas) |
| k338 | kelvin_aldea_mina_2 | savage_215 | savage_wall_pikessm | empalizada | 91.31 | -34.23 | 10.10 | 10.64 | 1.50 | 8.54 | 0.00 | apartada 1.5 m en planta; acostada ya en el export (muelle o estacas) |
| k339 | kelvin_aldea_mina_2 | savage_216 | savage_wall_pikessm | empalizada | 90.79 | -28.16 | 9.61 | 10.14 | 0.00 | 8.04 | 0.00 | acostada ya en el export (muelle o estacas) |
| k362 | kelvin_aldea_mina_2 | savage_214 | savage_wall_pikessm_v2 | empalizada | 90.90 | -47.99 | 9.45 | 9.98 | 0.00 | 7.88 | 0.00 | acostada ya en el export (muelle o estacas) |
| k188 | kelvin_aldea_rio_este_3 | savage_047 | savage_monumente | monumento_e | 35.91 | 82.40 | 20.81 | 30.20 | 0.00 | 5.19 | 0.00 |  |
| k225 | kelvin_aldea_rio_este_3 | savage_054 | savage_entranceb | portal_madera_b | 15.90 | 84.38 | 21.38 | 24.22 | 0.00 | 9.00 | 0.00 |  |
| k226 | kelvin_aldea_rio_este_3 | savage_079 | savage_entranceb | portal_madera_b | 38.65 | 97.02 | 20.83 | 23.67 | 0.00 | 8.23 | 0.00 |  |
| k227 | kelvin_aldea_rio_este_3 | savage_082 | savage_entranceb | portal_madera_b | 47.21 | 71.22 | 20.46 | 23.29 | 0.00 | 8.09 | 0.00 |  |
| k228 | kelvin_aldea_rio_este_3 | savage_055 | savage_entrancec | portal_madera_c | 20.41 | 72.87 | 21.25 | 24.08 | 0.00 | 9.54 | 0.00 |  |
| k229 | kelvin_aldea_rio_este_3 | savage_077 | savage_entrancec | portal_madera_c | 26.69 | 96.71 | 21.21 | 24.04 | 0.00 | 9.47 | 0.00 |  |
| k230 | kelvin_aldea_rio_este_3 | savage_080 | savage_entrancec | portal_madera_c | 50.94 | 82.67 | 20.18 | 23.01 | 0.00 | 8.53 | 0.00 |  |
| k231 | kelvin_aldea_rio_este_3 | savage_056 | savage_entrancea | portal_madera_a | 16.36 | 78.71 | 21.32 | 24.01 | 0.00 | 9.21 | 0.00 |  |
| k232 | kelvin_aldea_rio_este_3 | savage_078 | savage_entrancea | portal_madera_a | 32.56 | 97.79 | 21.29 | 23.98 | 0.00 | 8.76 | 0.00 |  |
| k233 | kelvin_aldea_rio_este_3 | savage_081 | savage_entrancea | portal_madera_a | 50.70 | 76.30 | 20.33 | 23.02 | 0.00 | 8.31 | 0.00 |  |
| k281 | kelvin_aldea_rio_este_3 | savage_105 | savage_tieredlookout | mirador_escalonado | -9.46 | 75.44 | 18.48 | 30.77 | 0.00 | 11.72 | 0.00 |  |
| k290 | kelvin_aldea_rio_este_3 | savage_181 | savage_towerb | torre_vigia_b | 40.99 | 18.36 | 24.66 | 34.35 | 0.00 | 10.46 | 0.00 |  |
| k329 | kelvin_aldea_rio_este_3 | savage_183 | savage_wall_watchtowera | muralla_atalaya_a | 37.41 | 18.89 | 24.84 | 29.31 | 0.00 | 9.73 | 0.00 |  |
| k365 | kelvin_aldea_rio_este_3 | savage_182 | savage_entrance_spiked | portal_puas | 47.58 | 26.79 | 20.72 | 27.42 | 0.00 | 6.47 | 0.00 |  |
| k367 | kelvin_aldea_rio_este_3 | savage_169 | savage_bridge | puente_madera | 58.20 | 23.37 | 18.08 | 34.92 | -18.02 | 7.67 | 7.46 | apartada 19.5 m en planta; escala Y del export 1.95× la mediana del asset |
| k369 | kelvin_aldea_rio_este_3 | savage_177 | savage_bridge | puente_madera | 43.98 | 12.53 | 24.80 | 33.42 | 0.00 | 11.77 | 0.00 |  |
| k370 | kelvin_aldea_rio_este_3 | savage_178 | savage_bridge | puente_madera | 49.88 | 21.80 | 20.72 | 29.35 | 0.00 | 7.70 | 0.00 |  |
| k371 | kelvin_aldea_rio_este_3 | savage_179 | savage_bridge | puente_madera | 40.88 | 18.84 | 24.72 | 33.35 | 0.00 | 11.69 | 0.00 |  |
| k372 | kelvin_aldea_rio_este_3 | savage_180 | savage_bridge | puente_madera | 51.18 | 16.74 | 21.29 | 29.92 | 0.00 | 8.26 | 0.00 |  |
| k373 | kelvin_aldea_rio_este_3 | savage_185 | savage_bridge | puente_madera | 59.03 | 15.47 | 20.05 | 28.68 | 0.00 | 7.02 | 0.00 |  |
| k375 | kelvin_aldea_rio_este_3 | savage_184 | savage_campc_v2 | campamento_c | 38.80 | 10.24 | 24.83 | 30.96 | 0.00 | 10.93 | 0.00 |  |
| k036 | kelvin_aldea_rio_oeste_2 | Box078 | canoa | canoa | -151.37 | -48.72 | 14.05 | 14.53 | 0.00 | 12.47 | 0.00 |  |
| k235 | kelvin_aldea_rio_oeste_2 | savage_058 | savage_campf | campamento_f | -138.91 | -36.89 | 20.59 | 23.18 | 0.00 | 15.67 | 0.00 |  |
| k236 | kelvin_aldea_rio_oeste_2 | savage_059 | savage_campa | campamento_a | -142.07 | -40.24 | 20.06 | 21.36 | 0.00 | 15.79 | 0.00 |  |
| k237 | kelvin_aldea_rio_oeste_2 | savage_060 | savage_campc | campamento_c | -136.36 | -44.06 | 20.60 | 25.68 | 0.00 | 15.85 | 0.00 | escala Y del export 0.73× la mediana del asset |
| k238 | kelvin_aldea_rio_oeste_2 | savage_071 | savage_campc | campamento_c | -131.73 | -41.10 | 20.60 | 31.34 | 0.00 | 15.62 | 0.00 |  |
| k239 | kelvin_aldea_rio_oeste_2 | savage_061 | savage_campb | toldo_pequeno | -138.50 | -46.12 | 20.60 | 23.32 | 0.00 | 15.37 | 0.00 | escala Y del export 0.67× la mediana del asset |
| k240 | kelvin_aldea_rio_oeste_2 | savage_065 | savage_campb | toldo_pequeno | -134.71 | -45.68 | 20.60 | 23.32 | 0.00 | 13.88 | 0.00 | escala Y del export 0.67× la mediana del asset |
| k241 | kelvin_aldea_rio_oeste_2 | savage_066 | savage_campb | toldo_pequeno | -122.21 | -40.30 | 20.27 | 22.99 | 0.00 | 9.16 | 0.00 | escala Y del export 0.67× la mediana del asset |
| k242 | kelvin_aldea_rio_oeste_2 | savage_067 | savage_campb | toldo_pequeno | -122.95 | -36.46 | 20.00 | 24.06 | 0.00 | 10.01 | 0.00 |  |
| k243 | kelvin_aldea_rio_oeste_2 | savage_068 | savage_campb | toldo_pequeno | -125.81 | -32.08 | 20.31 | 24.21 | 0.00 | 11.67 | 0.00 |  |
| k244 | kelvin_aldea_rio_oeste_2 | savage_069 | savage_campb | toldo_pequeno | -126.72 | -44.69 | 20.60 | 25.43 | 0.00 | 11.13 | 0.00 |  |
| k245 | kelvin_aldea_rio_oeste_2 | savage_070 | savage_campb | toldo_pequeno | -133.46 | -31.01 | 20.55 | 25.37 | 0.00 | 14.27 | 0.00 |  |
| k246 | kelvin_aldea_rio_oeste_2 | savage_125 | savage_campb | toldo_pequeno | -125.30 | -40.61 | 20.47 | 24.53 | 0.00 | 10.44 | 0.00 |  |
| k247 | kelvin_aldea_rio_oeste_2 | savage_126 | savage_campb | toldo_pequeno | -130.57 | -42.98 | 20.60 | 24.66 | 0.00 | 13.11 | 0.00 |  |
| k248 | kelvin_aldea_rio_oeste_2 | savage_127 | savage_campb | toldo_pequeno | -138.55 | -42.75 | 20.59 | 24.65 | 0.00 | 16.27 | 0.00 |  |
| k249 | kelvin_aldea_rio_oeste_2 | savage_128 | savage_campb | toldo_pequeno | -136.97 | -40.57 | 20.60 | 24.66 | 0.00 | 15.86 | 0.00 |  |
| k250 | kelvin_aldea_rio_oeste_2 | savage_129 | savage_campb | toldo_pequeno | -136.09 | -36.61 | 20.60 | 24.66 | 0.00 | 15.85 | 0.00 |  |
| k251 | kelvin_aldea_rio_oeste_2 | savage_130 | savage_campb | toldo_pequeno | -139.98 | -38.09 | 20.59 | 24.65 | 0.00 | 15.85 | 0.00 |  |
| k021 | kelvin_aldea_yunque | Box063 | canoa | canoa | 24.78 | -61.45 | 9.05 | 9.53 | 0.00 | 7.47 | 0.00 |  |
| k256 | kelvin_aldea_yunque | savage_120 | savage_hall_round | cercado_redondo | -32.01 | -82.61 | 24.87 | 29.62 | 0.00 | 16.55 | 0.00 | escala Y del export 1.44× la mediana del asset |
| k285 | kelvin_aldea_yunque | savage_119 | savage_hutwithdeck | casa_plataforma | -9.40 | -54.80 | 28.93 | 37.22 | 0.00 | 13.64 | 0.00 |  |
| k287 | kelvin_aldea_yunque | savage_115 | savage_towerb | torre_vigia_b | -33.61 | -66.62 | 27.40 | 36.55 | 0.00 | 12.27 | 0.00 |  |
| k288 | kelvin_aldea_yunque | savage_123 | savage_towerb | torre_vigia_b | -5.21 | -51.16 | 28.92 | 35.47 | 0.00 | 13.57 | 0.00 | escala Y del export 0.63× la mediana del asset |
| k294 | kelvin_aldea_yunque | savage_116 | savage_towera | torre_vigia | -28.67 | -79.02 | 24.73 | 31.34 | 0.00 | 13.99 | 0.00 | escala Y del export 0.73× la mediana del asset |
| k308 | kelvin_aldea_yunque | savage_117 | savage_wall_watchtowerb | muralla_atalaya_b | -30.60 | -87.68 | 24.55 | 31.40 | 0.00 | 15.30 | 0.00 |  |
| k309 | kelvin_aldea_yunque | savage_122 | savage_wall_watchtowerb | muralla_atalaya_b | -40.64 | -72.15 | 27.40 | 38.50 | 0.00 | 16.06 | 0.00 |  |
| k310 | kelvin_aldea_yunque | savage_124 | savage_wall_watchtowerb | muralla_atalaya_b | -11.61 | -52.11 | 28.92 | 38.39 | 0.00 | 14.03 | 0.00 |  |
| k324 | kelvin_aldea_yunque | savage_118 | savage_wall_watchtowera | muralla_atalaya_a | -37.92 | -82.75 | 25.76 | 31.75 | 0.00 | 17.04 | 0.00 |  |
| k325 | kelvin_aldea_yunque | savage_121 | savage_wall_watchtowera | muralla_atalaya_a | -26.15 | -83.20 | 24.55 | 30.54 | 0.00 | 15.83 | 0.00 |  |
| k059 | kelvin_aldea_meandros_2 | SavageG1_V_008 | savage_carpa_suelta_a | carpa_a | -64.16 | -56.83 | 31.44 | 34.74 | 0.00 | 18.41 | 0.00 |  |
| k060 | kelvin_aldea_meandros_2 | SavageG1_V_012 | savage_carpa_suelta_a | carpa_a | -66.74 | -60.99 | 31.78 | 35.08 | 0.00 | 17.94 | 0.00 |  |
| k061 | kelvin_aldea_meandros_2 | SavageG1_V_013 | savage_carpa_suelta_a | carpa_a | -65.87 | -68.40 | 29.02 | 32.31 | 0.00 | 15.05 | 0.00 |  |
| k065 | kelvin_aldea_meandros_2 | SavageG1_V_009 | savage_carpa_suelta_b | carpa_b | -57.17 | -65.68 | 27.26 | 36.02 | 0.00 | 14.46 | 0.00 |  |
| k069 | kelvin_aldea_meandros_2 | SavageG1_V_010 | savage_carpa_suelta_c | carpa_c | -57.79 | -52.33 | 25.01 | 27.79 | 0.00 | 14.33 | 0.00 |  |
| k073 | kelvin_aldea_meandros_2 | SavageG1_V_014 | savage_carpa_suelta_d | carpa_d | -54.09 | -57.92 | 26.29 | 29.17 | 0.00 | 12.62 | 0.00 | escala Y del export 1.84× la mediana del asset |
| k177 | kelvin_aldea_meandros_2 | savage_072 | savage_monumenta | monumento_a | -98.06 | -89.50 | 33.02 | 39.36 | 0.00 | 14.51 | 0.00 |  |
| k178 | kelvin_aldea_meandros_2 | savage_073 | savage_monumenta | monumento_a | -94.71 | -75.34 | 34.75 | 42.34 | 0.00 | 13.22 | 0.00 | escala Y del export 1.37× la mediana del asset |
| k179 | kelvin_aldea_meandros_2 | savage_074 | savage_monumenta | monumento_a | -86.21 | -81.84 | 33.58 | 37.49 | 0.00 | 13.68 | 0.00 | escala Y del export 0.71× la mediana del asset |
| k180 | kelvin_aldea_meandros_2 | savage_075 | savage_monumenta | monumento_a | -89.82 | -88.12 | 33.34 | 40.26 | 0.00 | 14.85 | 0.00 |  |
| k368 | kelvin_aldea_meandros_2 | savage_170 | savage_bridge | puente_madera | -82.48 | -55.09 | 27.86 | 47.47 | 3.44 | 18.98 | -8.31 | apartada 9.0 m en planta; escala Y del export 2.27× la mediana del asset |

Agua, sendas, suelo, flora y nombres no se tocaron: siguen en los carriles BB, AW y AY.
