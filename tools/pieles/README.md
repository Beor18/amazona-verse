# Pintar pieles de especie (método aprobado por Kelvin, 1-nov)

Las pieles son JPG de 1024² sobre el UV del modelo de Vittata (`assets/textures/pieles/<id>.jpg`). Las 22 primeras salieron de
los .blend de Kelvin; ventralis, finschi, lilacina, vinacea, autumnalis y el verde v4 de vittata se pintaron con este método.

## Reglas (no negociables)
- **Nada inventado.** Cada rasgo pintado lleva fuente seria (BirdLife/Datazone, Cornell/eBird, Wikipedia con referencias,
  Parrots.org…) en `docs/equipo/pieles_fuentes/<id>.md` (copia el formato de `ventralis.md`). Si las fuentes discrepan, se anota.
- **Diseño de Kelvin primero:** sus renders oficiales están en `docs/referencias/renders_especies/` (hojas de poses). Si la
  especie tiene render, el color va según su render; las fuentes confirman los rasgos.
- Fotos de referencia solo para comparar (en la comparativa, CC BY de iNaturalist con autor y URL). Sin IA generativa.
- El modelo y el rig de Vittata no se tocan. Calidad comercial: textura de plumas conservada, bordes suaves.
- **Las extintas** (martinicana, violacea) solo como PROPUESTA aparte: su aspecto es canon de Kelvin (son «la Voz»).

## Herramientas (`tools/pieles/`)
- `pintor.py <id> [salida.jpg]`: pintor por regiones 3D (`datos/posmap.npz`: posición 3D de cada texel del UV). Cada especie
  es una función; parte de la piel de Kelvin más parecida (base de verde, sombreado, pico y patas). Añade la tuya copiando una.
- `ren.sh <textura.jpg> <id_piel> [prefijo]`: render del modelo real con el look vibrant_toon (frente, lado, espalda, 3/4,
  cara) en `tools/pieles/out/`. Necesita Chromium de Playwright (`/opt/pw-browsers/chromium`) y la piel declarada (abajo).
- `comparar.py`: hoja con renders y fotos. `posmap.py`/`uvmap.py`: regeneran `datos/posmap.npz` si cambiara el UV.

## Integrar una piel
1. `assets/textures/pieles/<id>.jpg` (1024², ~75 KB, calidad 70–80).
2. `src/personaje/pieles.js`: `{ piel: '<id>', especie: '<id>', archivo: null, anillo: '#…' }` en `PIELES`.
3. `content/comun/especies.js`: `"piel": "<id>",` en la ficha.
4. Cuentas en `src/pruebas/pieles.js` (pieles y especies enlazadas) y `src/game/creador.js` (`conPiel`, `sinPiel`).
5. Nombre común en inglés en `content/cap1/en.js` (si no, `idiomaTest` falla).
6. Pruebas: `pielesTest`, `creadorTest`, `idiomaTest` y las 13 baterías antes del commit.
