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

## Preparado para el modo creador (llega en el prompt del 2-nov)
Kelvin: «los jugadores podrán crear sus propios mapas con los elementos que les determinemos; el mundo crecerá con lo que hagan».
El mundo único ayuda: los creadores construyen **dentro de la misma isla**, con la misma calidad.
- Parcelas de creación en las zonas libres de arriba (y en las ya desbloqueadas).
- Catálogo de elementos = el kit que ya existe y se ve bien: edificios ligeros (Savage y Ancient), flora del kit, props del ropero.
- Presupuesto por parcela (triángulos y draw calls) para que siga corriendo en iPad.
- Seguridad infantil: sin chat; compartir creaciones solo con moderación (decisión de Kelvin y revisión COPPA antes del piloto).
