# Mundo vivo · ecología de las colonias

Qué cotorras viven en cada lugar del mapa del cap. 1 y por qué. Está en código en `src/game/residentes.js` (`HAB` y `DEF`). La bandada de `bandada.js` elige sus especies con la misma tabla: las del lugar con colonia más cercano a su destino o a su ruta.

**Regla.** Cada colonia tiene un hábitat, y cada hábitat sus especies reales. Ninguna sale «al azar entre las 34». Las dos extintas (*martinicana* y *violacea*) no están en ningún hábitat y nunca salen vivas en el mundo. Entre las 9 colonias están las 34 vivas, así que el Álbum de las 36 se puede llenar en el cap. 1.

**Fuentes.** La distribución de cada especie viene de `content/comun/especies.js` (Wikipedia en inglés, verificada el 25-oct). El hábitat sale de la sección *Habitat* del mismo artículo (`fuentes.distribucion`). Ese hábitat no está en `especies.js` y queda **por verificar contra BirdLife** antes de usarlo como dato educativo. Aquí solo sirve para colocar las colonias, y el juego no lo muestra como dato.

| Colonia (lugar del mapa) | Hábitat del lugar | Especies | Por qué |
|---|---|---|---|
| Plaza de Villa Raíz (`plaza`) | Pueblo en la costa de Puerto Rico | vittata | Es su casa: la cotorra puertorriqueña es endémica de Puerto Rico. |
| Orilla del río (`rio_terrenoA`) | Bosque de río en tierras bajas | festiva, kawalli, amazonica, ochrocephala, diadema, farinosa | Especies de várzea y de la selva de los ríos amazónicos. *amazonica* y *ochrocephala* también están introducidas en Puerto Rico (`especies.js`). |
| Poza Honda (`poza_honda`) | Selva baja húmeda y manglar, cerca del mar | autumnalis, guatemalae, dufresniana, oratrix | Selva baja húmeda y manglares de Centroamérica, del norte de Sudamérica y de las Guayanas. |
| Poza del Dajao (`poza_dajao`) | Quebrada con bosque húmedo de ladera | rhodocorytha, brasiliensis, vinacea, pretrei | La Mata Atlántica de Brasil, con sus bosques de la Serra do Mar y de araucaria. |
| Ciudad de los 36 (`kelvin_ruinas_yunque`) | Cumbre de El Yunque, bosque nublado | vittata, imperialis, arausiaca, guildingii, versicolor | Bosque montano de las Antillas: Dominica, San Vicente y Santa Lucía, más vittata, que vivía en El Yunque. **Excepción de historia:** en el cap. 6 y después del pacto (`PactRenewed`, o el cap. 6 terminado en el registro de temporada) es la colonia mezclada de las 34 vivas, sin repetir especie. Los guardianes llegaron para el pacto de los 36 (STORY_BIBLE ep. 6, CANON_REGISTRY). |
| Charca de las Nubes (`charca_nubes`) | Bosque nublado alto | mercenarius, tucumana | Bosque montano de los Andes y de las yungas. |
| Puerta del Yunque (`kelvin_aldea_yunque`) | Bosque de las faldas de El Yunque | ventralis, leucocephala, agilis, collaria | Bosques de las Antillas Mayores (La Española, Cuba, Bahamas, Caimán y Jamaica): las vecinas de Puerto Rico. |
| Templos de la Colina (`kelvin_aldea_colina`) | Colina seca del sur | albifrons, auropalliata, xantholora, finschi, viridigenalis, tresmariae | El bosque seco de México y Centroamérica, como el bosque seco del sur de Puerto Rico. *albifrons* también está introducida en Puerto Rico. |
| Ruinas de la hacienda (`ruinas`) | Loma seca y abierta junto al mar | aestiva, barbadensis, lilacina | El cerrado, el chaco y el matorral seco de la costa de Sudamérica. |

**Bandaditas** (de 4 a 8 aves). Solo viajan entre colonias vecinas, de 25 a 170 m, de la misma familia de hábitat:

- **Tierras bajas:** plaza, río, Poza Honda y Dajao.
- **Montaña:** Ciudad de los 36, Charca de las Nubes y Puerta del Yunque.
- **Seco:** Colina y Hacienda.

Las aves llevan las especies de su colonia, se posan un rato en la otra y vuelven a casa. Las cotorras de verdad también van y vienen cada día entre el dormidero y los árboles donde comen.

**Para Kelvin (canon y arte, sin decidir):** ¿la Ciudad de los 36 se queda en «bosque nublado de las Antillas» hasta el pacto? ¿Y las colonias de especies de fuera, son «guardianes de paso» o tienen otra explicación en la historia? Mientras tanto queda así.
