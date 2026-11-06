# Modelos de Kelvin (inventario BM158)

Origen: `~/AmazonaVerse/modelos/*.blend` (los `.blend` **no** están en el repo). Capturas frontales 512×512 (Workbench, sin texturas porque faltan) en `docs/img/modelos_kelvin/<nombre>.jpg`. Script: `tools/blender/inventario_modelos_kelvin.py` (`blender -b <x>.blend -P ... -- out.jpg out.json`).

**No encontrados:** Piloto CiberPunk Human y Piloto CiberPunk Monkey (ni en `modelos/` ni en `~/Downloads`). En `~/Downloads/cotorras/` hay 23 `.blend` de especies de cotorra (no inventariados: fuera del encargo).

Notas comunes: **ningún modelo trae huesos** (salvo el rig de la cotorra, ver abajo); todos usan Mirror + Subdivisión, así que los «tris» son con la subdivisión del visor y bajan mucho si se aplica nivel bajo; **en todos faltan las texturas** (rutas rotas a `.jpg/.png` externos: salen grises o magenta); son figuras estilo Funko, cabezón y cuerpo pequeño. Los usos son sugerencias, no papeles de historia.

| Modelo | Trae | Rig / anim. | Tris (con subdiv.) | Texturas que faltan | Derechos / armas | Uso |
|---|---|---|---|---|---|---|
| Piloto Cotorra | Cabeza de cotorra morada sobre cuerpo de piloto (4 mallas: cuerpo, 2 brazos, cabeza) | Armadura `RigCotorra` (0 huesos contados en la escena) y 12 acciones que son de cámara/área, no de personaje | 369 730 | 3 (BaseColor, Normal, Roughness de `cotorrofiver`) | Original; sin armas | **Con ajustes**: la cabeza es el mejor candidato; reducir tris y recuperar texturas |
| Piloto CiberPunk Dog Shiba | Perro shiba piloto, 13 mallas (cuerpo, cejas, ojos, brazos) | No | 180 512 | 2 (`Texture.jpg`, camiseta) | Shiba genérico; revisar que no imite a un personaje concreto | Con ajustes |
| Piloto CiberPunk Girl | Niña piloto, 16 mallas (cabello, pestañas, nariz, cejas) | No rig; 3 acciones de cabello | 217 964 | 4 (`Texture.jpg`, `Kid Texture`, foto IMG_2021…, camiseta) | Revisar la foto/camiseta usadas como textura | Con ajustes (cabello animado aprovechable) |
| Cat Superior Moon | Gato con túnica/kimono morado, melena con puntas, katana en la espalda | No | 295 904 | 6 (`Attachment_*`, camiseta) | **Lleva katana** (arma) y cejas/melena estilo anime; no sirve tal cual en un juego infantil | Solo idea (quitar la katana) |
| Cat Aburame | Gato ninja con bandana, 32 mallas | No | 325 632 | 4 (logo Ryoshi, camiseta Real Madrid, 2 jpg) | **Parece copiar a Shino Aburame (Naruto)**; textura con camiseta de club | Solo idea |
| Cat Illumi Funko Pop | Gato estilo Illumi (Hunter x Hunter), 39 mallas | No | 258 964 | 1 | **Parece copiar a Illumi Zoldyck**; posible arma (agujas) no comprobada | Solo idea / descartar |
| Funko Pop BigCatFett | Gato con jetpack y armadura estilo Boba Fett | No | 193 620 | 2 (referencia BobaFett…) | **Copia a Boba Fett (Star Wars)**; pistola/casco | Descartar |
| Funko Pop Cat Dollar | Gato con zapatos y brazos propios, textura «Dollar» | No | 246 044 | 3 (`lars-funko`, `TextureDollar`) | Revisar la textura de dólar (no apto: billetes); sin armas vistas | Solo idea |
| Funko Pop Cat Gymnasta | Gato gimnasta con bandana, base Funko | No | 249 808 | 4 (logo Ryoshi, camiseta Real Madrid, capturas) | **Textura con escudo de club real**; base Funko con nombre ajeno | Con ajustes (cambiar texturas) |
| Funko Pop Cat Herk | Gato con cabeza y hocico propios, 19 mallas | No | 167 608 | 3 (`henrik-funko-example`, preview) | Parece personaje por encargo (Henrik/Herk); preguntar | Con ajustes, tras preguntar |
| Funko Pop Cat Pumkin | Gato calabaza con bandana, gancho y hebilla | No | 236 104 | 2 (`devenisfat`, logo Ryoshi) | **Gancho**: comprobar que no es arma; resto original | Con ajustes |
| Funko Pop Knigth Cat | Gato caballero con yelmo, escudo y espada pequeña, 36 mallas | No | 294 240 | 2 (`KNIGHTDONNIE`, malla metálica) | **Lleva espada y escudo** (arma); textura de otra persona (Donnie) | Con ajustes (quitar espada) o idea |
| Funko Soccer Cat | Gato futbolista con zapatos, 15 mallas | No | 135 744 | 4 (logos Ryoshi/PlayersOnly, camiseta Real Madrid) | **Camiseta/escudo de club real** | Con ajustes (cambiar camiseta); el más ligero |
| Custom Box / Custom Box 4 | Caja de presentación con soporte (5 mallas, idénticas en geometría) | No | 29 568 | 2–3 (cajas «Ryoshib», «THor») | Marcas y personaje de terceros en las cajas | Solo idea (no es personaje) |

Resumen: todos son demasiado pesados para el juego (135 k–370 k tris con subdivisión; el presupuesto de un personaje es ~3 k, ver el traje de Guardián). El que más encaja es **Piloto Cotorra** (original, sin armas). Evitar tal cual: Aburame, Illumi, BigCatFett (personajes ajenos) y Superior Moon / Knigth Cat (armas). Las camisetas de club real aparecen en 6 modelos; hay que cambiarlas siempre.
