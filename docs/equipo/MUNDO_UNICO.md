# MUNDO_UNICO · la temporada en un solo mundo (propuesta, 1-nov)

**Decisión de Kelvin (1-nov): «reutilizar cada ciudad y área del mapa real; el juego se desarrolla en un solo mundo y se
desbloquean ciudades».** Los capítulos 2–6 dejan el mundo de relleno (llano con árboles de primitivas, prototipos del 25-oct) y
pasan al mapa real del cap. 1 (escena de Kelvin, vibrant_toon, flora y edificios reales), cada uno en su zona.

## Zona por capítulo
Coordenadas: centro de la zona en `assets/data/mapa_cap1.js` → `zonasEdificios` (m, X/Z). Nombres: `content/cap1/asentamientos.js`.

| Cap. | Título | Zona del mapa real | Centro (x, z) | Por qué encaja |
|---|---|---|---|---|
| 1 | El día que el cielo se rompió | **Villa Raíz · la Empalizada** (`kelvin_aldea_rio_este`) | 112, 97 | Ya está ahí: refugio, río y crecida |
| 2 | Un lugar para todos | **Caney del Meandro** (`kelvin_aldea_meandros`) | −14, 17 | «Aquí se reúne la gente cuando hay algo que decidir entre todos»: escuchar a la Abuela y al Papá antes de construir |
| 3 | Más allá de la bahía | **Embarcadero de las Canoas** (`kelvin_aldea_rio_oeste`) → **Puerto de La Mina** (`kelvin_aldea_mina`) | −134, 27 → 78, −106 | «De aquí salen los que se atreven más allá de la bahía»: bote, navegar y llegar a otra comunidad |
| 4 | El precio del progreso | **Los Portales del Río** (`kelvin_aldea_rio_este_3`) y **La Otra Orilla** (`kelvin_aldea_rio_este_2`) | 38, 52 / 136, 13 | Seis puentes cruzan los meandros; el Navegante «ve la otra orilla cada día» |
| 5 | Las voces olvidadas | **Los Miradores** (`kelvin_ruinas_yunque_2`) y **Puerta del Yunque** (`kelvin_aldea_yunque`), **de noche** | −74, −132 / −21, −70 | Ruinas, la torre antigua y el transmisor; la noche y la bahía bioluminiscente ya existen |
| 6 | El pacto de los 36 | **Ciudad de los 36** (`kelvin_ruinas_yunque`), sobre el tepuy | −4, −131 | El nombre del capítulo y el de la ciudad coinciden |

Zonas libres para exploración, retos y el modo creador: Atalayas del Oeste, Los Monumentos, Ladera de los Cuatro, Templos de la
Colina, Campamento de los Toldos.

## Desbloqueo
- Al empezar solo está abierta la zona del capítulo en curso y las ya jugadas; el resto se ve a lo lejos (da ganas de ir).
- La barrera es el viento fuerte del techo de vuelo que ya existe (`F.techoVuelo`, aviso «viento fuerte») más un aviso amable:
  «Esta zona se abre en el capítulo N». Nada de muros invisibles sin explicación.
- Al terminar un capítulo: «Descubriste…» (ya existe en `src/game/lugares.js`) y se abre la zona siguiente.
- El registro de temporada (`src/game/temporada.js`) ya lleva lo hecho de un capítulo al otro.

## Cómo se muda un capítulo (uno por vez, empezando por el 2)
1. En `content/epN/pack.js`: `mundo` deja el terreno/árboles generados y usa el mapa real (como `content/cap1/pack.js`).
2. Las coordenadas de misiones, personajes, hallazgos del Diario y objetos se trasladan a la zona (offset desde su centro) y
   se apoyan en el suelo real (`G.terreno.height`, sólidos).
3. Sus pruebas (`epNTest`, `ep2e2eTest`, `temporadaE2eTest`) se ajustan a las coordenadas nuevas; las 13 baterías en verde.
4. Capturas antes/después en `docs/img/mundo_unico/`.

**Dependencia:** las zonas de piedra (caps. 5 y 6) son las más pesadas (222 draw calls en las ruinas). Antes de mudarlos:
KIMI-Task-001 a 003 (`docs/equipo/TAREAS_KIMI.md`). Los caps. 2–4 (aldeas de madera) pueden ir antes.

## Caps. 5 y 6 en el mapa real: interruptor (apagado por defecto)
Los dos capítulos ya tienen su sitio medido en el mapa real, pero siguen en su mundo pequeño hasta que Kimi termine de bajar el
peso de las zonas de piedra (KIMI-Task-001 a 003). Con el interruptor apagado se juegan exactamente igual que antes.

**Cómo encenderlo** (una línea por capítulo; no hay que tocar nada más):
- Cap. 5: en `content/ep5/pack.js`, `const MAPA_REAL = false;` → `true`.
- Cap. 6: en `content/ep6/pack.js`, `const MAPA_REAL = false;` → `true`.
- Para probar sin tocar el código: `?pack=ep5&mapa=real` o `?pack=ep6&mapa=real`.
- Las zonas (`src/game/zonas.js`) se activan solas cuando el pack usa el mapa real; apagado, no hacen nada.
- Pruebas con el interruptor encendido sin tocar el pack: inyectar `tests/qa/mapa_real.js` (añade `?mapa=real` a la pestaña y
  a los iframes de `ep5Test`, `ep6Test` y `temporadaE2eTest`). `tests/qa/zonas56.js` (`AV.zonas56Test`) abre los dos capítulos
  apagados y encendidos, corre `AV.zonasTest` en cada uno y comprueba que todo queda dentro de su zona y fuera del agua.

**Cap. 5 · Las voces olvidadas** (de noche: el permiso «noche» del look y `S.hora = 21`). Medido el 2-nov sobre el suelo real
(pendiente, agua y edificios de Kelvin) y con la línea de vista de la cadena contra el relieve real:
| Qué | Dónde (x, z) |
|---|---|
| Taller (inicio de la cadena), transmisor, Iguaca, aprendiz, prueba del relevo, aparición | (−42, −120), (−38, −118), (−46, −118), (−49, −122), (−42, −124), (−46, −121): borde norte de la meseta del tepuy (97 m), mirando a la Puerta del Yunque |
| La loma baja · la otra loma · la torre | (−42, −133) · (−30, −138) · (−50, −145), en la meseta |
| El mirador · la niebla | (−63, −146) · (−74, −150), en el claro de Los Miradores (94 m) |
| El pilar | (−59, −102), en la cornisa norte (78 m), junto al pilar de piedra de Kelvin (no se pone el del kit); el borde de la meseta lo tapa desde el taller |
| El portal · el altar (ruinas del kit) | (−34, −147) · (−30, −124) |
| El Guardián | (−19, −79), en la Puerta del Yunque (24 m) |
| Diario | espejo (−37, −123), marcas (−46, −140), el 36 (−34, −131) en la meseta; tambor (−12, −80), bandera (−15, −64), las dos especies (−17, −85) en la Puerta del Yunque |
Cadena con luz libre taller → loma (13 m) → torre (14,4 m) → mirador (13 m) → niebla (11,7 m), también al alcance del sonido
(16 m); el pilar a 24,8 m del taller (más que el sonido, menos que la torre) queda detrás del borde (3,5 m bajo la línea).

**Cap. 6 · El pacto de los 36** (de día). Dos sitios:
| Qué | Dónde (x, z) |
|---|---|
| Aparición, taller y mesa, Iguaca (M1) | (44, −62), (47, −62) y (45, −60), (42, −60,5): orilla baja del este del río (11–12 m) |
| Muelles · canoas | (29, −58) y (27,5, −42) · (27,5, −62) y (27, −38) |
| Visitantes | Mira (39, −60), Roca (36,5, −58), Eco (37, −55), Brote (46, −60), Marea (35, −40), Nudo (35,5, −43); quien navega (37, −35) |
| Puente (M2) | de (30,5, −50) a (14,5, −50) sobre el agua (9 m), tablero a 11 m; perchas (24,7, −51,6), (24,7, −48,4) y la de la señal (20,3, −50); la tabla larga (35, −49); el cuaderno (33,5, −52,5) |
| Plaza, grupos, círculo de los 36, Guardián, transmisor (M3) | centro (−40, −131): explanada de la Ciudad de los 36 ante su puerta oeste (97 m); el Guardián (−36,5, −137) |
| Mirador | (−40, −117), en el borde norte de la meseta; las 14 luces que esperan, sobre el mar del norte |

**Para Kelvin ([KELVIN], decisión de canon y de mapa):**
- La Ciudad de los 36 no tiene agua (está en la meseta del tepuy, a 97 m) y el capítulo 6 necesita el río para las canoas, los
  muelles y el puente. Por eso M1 y M2 se juegan en el río real al pie del tepuy (el tramo recto junto a la Puerta del Yunque,
  en la orilla del este, fuera del monumento de Los Monumentos) y M3, el círculo y el pacto, en la Ciudad. Si prefiere todo en
  la Ciudad, hace falta agua allí (es terreno de Kimi) o cambiar la obra de M2 por otra que no necesite río.
- Los Miradores casi no tienen suelo libre (los edificios de Kelvin lo ocupan); el relevo del cap. 5 usa la meseta que los une
  con la Ciudad, que es también la plaza del cap. 6 (capítulos distintos: no se pisan).
- Zonas (`ZONAS[5]` y `ZONAS[6]`) con varios círculos: la del 5 son Los Miradores con la meseta y la Puerta del Yunque; la del
  6, el río, la Ciudad y el paso entre los dos.

## Preparado para el modo creador (llega en el prompt del 2-nov)
Kelvin: «los jugadores podrán crear sus propios mapas con los elementos que les determinemos; el mundo crecerá con lo que hagan».
El mundo único ayuda: los creadores construyen **dentro de la misma isla**, con la misma calidad.
- Parcelas de creación en las zonas libres de arriba (y en las ya desbloqueadas).
- Catálogo de elementos = el kit que ya existe y se ve bien: edificios ligeros (Savage y Ancient), flora del kit, props del ropero.
- Presupuesto por parcela (triángulos y draw calls) para que siga corriendo en iPad.
- Seguridad infantil: sin chat; compartir creaciones solo con moderación (decisión de Kelvin y revisión COPPA antes del piloto).
