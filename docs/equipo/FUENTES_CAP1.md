# FUENTES_CAP1 · datos reales del capítulo 1, con su fuente (BM120, 2-nov-2026)

Regla de Kelvin: todo dato real tiene fuente seria; lo que no la tiene se marca y no se inventa. Desde la nube no abren fws.gov, wikipedia.org, parrots.org ni el NAS del USGS (el DNS está bloqueado): lo nuevo de hoy sale de los extractos del buscador, con la URL de cada página, y conviene releerlo en la página original cuando haya red.

## 1. Diario de Campo (12 hallazgos)
Validado el 25-oct, uno por uno, en `docs/equipo/DIARIO_VALIDACION.md`: 12 de 12 con fuente (DRNA, USFWS, USGS, ICP, Smithsonian, UICN, Cornell Lab, Ley 154-2003). No se repite aquí.

## 2. La cotorra: capa real del criadero (`content/comun/huevos.js`, `real`)
| Dato en el juego | Fuente | Estado |
|---|---|---|
| Dos aviarios: Iguaca (El Yunque, USFWS) y José Vivaldi (Río Abajo, DRNA) | USFWS, ficha de 2026: https://www.fws.gov/sites/default/files/documents/2026-02/202602_puerto-rican-parrot-info-doc-spanish.pdf | verificado (antes) |
| Atienden pichones silvestres heridos; anidan en huecos de árboles; liberaciones desde 2020; Maricao desde 2022; más de 900 cotorras; María (2017) | Misma ficha del USFWS (2026) | verificado (antes) |
| **«La hembra calienta los huevos unos 26 días. Mientras tanto, el macho le trae comida.»** | 26 días: Wilson Bulletin 107(3), 1995, https://sora.unm.edu/sites/default/files/journals/wilson/v107n03/p0518-p0529.pdf, y parrots.org (puesta de 2 a 4 huevos, 26 días). Otras fuentes dan de 24 a 28 días. Durante la incubación la hembra está muy atenta al nido y el macho casi no entra en la cavidad: USGS, «Successful nesting behavior of Puerto Rican parrots», https://pubs.usgs.gov/publication/5222610. El macho le trae la comida: El Yunque, https://elyunque.com/en/nature/animals/birds/puerto-rican-parrot (fuente secundaria). | **verificado hoy** (antes «parcial»); ahora sale como ficha con su fuente |
| **«Los huevos de la cotorra puertorriqueña son blancos»** (ficha `huevo_blanco`; también lo dicen los diálogos del nido: «un huevo blanco, como los de las cotorras de verdad») | No se encontró fuente de *A. vittata*. Solo hay fichas de Wikipedia de otras amazonas (*A. amazonica*, *A. farinosa*, *A. albifrons*: «white eggs») | **parcial: no sale como ficha. [Kelvin: pedir la cita al DRNA o al USFWS, o quitar «blanco» de los diálogos del nido]** |

## 3. El coquí (misión «Co-quí», `src/game/atardecer.js`, `content/cap1/misiones.js`)
| Dato en el juego | Fuente | Estado |
|---|---|---|
| Es nocturno | USGS NAS, ficha de *Eleutherodactylus coqui*: «These treefrogs are nocturnal insectivores» | verificado (antes) |
| Canta del atardecer al amanecer (por eso la misión pasa al atardecer) | Discover Puerto Rico, https://www.discoverpuertorico.com/index.php/article/sounds-coqui-explained («from dusk 'till dawn»); https://www.topuertorico.org/coqui; El Yunque, https://elyunque.com/en/nature/animals/amphibians/common-coqui. Una ficha de gobierno («Common Coqui», copia en https://corpora.tika.apache.org/base/docs/govdocs1/416/416714.html) dice que el canto es máximo del anochecer a la medianoche y cerca del alba | **respaldo secundario; falta la cita del DRNA** |
| Tiene discos en los dedos para trepar; ojos dorados o pardos; el macho canta «ko-KEE» | USGS NAS (copia en https://corpora.tika.apache.org/base/docs/govdocs1/669/669802.html): «has toe disks (toepads) for climbing»; «eyes are gold, golden-brown, or brown»; «Call of male coqui is a rapid, loud "ko-KEE"» | verificado (no está como texto del juego; sirve si se añade) |

## 4. La bahía bioluminiscente (`src/game/maravillas.js`)
| Dato en el juego | Fuente | Estado |
|---|---|---|
| La caleta brilla azul de noche por los dinoflagelados *Pyrodinium bahamense*, como en Puerto Mosquito (Vieques) | NOAA Office for Coastal Management, https://coast.noaa.gov/states/stories/vieques-bioluminescent-bay.html (en el código, con `fuente` y `url`) | verificado (antes, BM21) |

## Para Kelvin
1. El huevo blanco: sin fuente de la especie. Hay que pedir la cita (DRNA o USFWS) o quitar «blanco» de los diálogos del nido.
2. «Del atardecer al amanecer» del coquí: solo hay respaldo de fuentes secundarias (turismo y El Yunque). Conviene la cita del DRNA.
