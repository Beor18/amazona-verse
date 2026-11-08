# Especies: estados UICN que no coinciden con el catálogo de Kelvin

Kelvin decide. Estas 13 de las 36 especies del catálogo (34 vivas y 2 extintas) no coinciden.

- **Catálogo:** `AmazonaVerse_Catalogo_Especies.pdf` (Wikipedia «List of parrots» y BirdLife, 24 oct 2026).
- **Verificado:** la evaluación de BirdLife International, autoridad de la Lista Roja para aves, que cita la Wikipedia en inglés. Se leyó el 25 oct 2026.
- **Datos:** `content/comun/especies.js` usa el estado verificado y guarda el del catálogo en `catalogo.uicn`.
**2-nov-2026 · Kelvin: aplicado.** Los 12 estados verificados pasan al catálogo del juego (`content/comun/especies.js`, campo `catalogo.uicn`), y el Diario ya los muestra con su evaluación de BirdLife. *A. tresmariae* sigue sin estado, porque la UICN no la evalúa por separado. Las 36 especies se conservan.


## Verificación con fuentes vigentes (8-nov-2026)

Decisión de Kelvin (DECISION_LOG, 8-nov): verificar con fuentes científicas vigentes y documentar las discrepancias taxonómicas, **sin cambiar el catálogo narrativo**. Este apartado no toca ningún archivo del juego.

**Resultado:** de las 13 filas, **12 discrepancias confirmadas** y **1 sin resolver** (*A. tresmariae*: la UICN no la evalúa aparte; no es un dato que falte, es que no existe). Además se cotejaron las otras 23 especies (21 vivas y 2 extintas) con la misma fuente y **ninguna difiere** del estado que ya usa el juego (`uicn.categoria`).

**Fuentes y límites (todas consultadas el 8-nov-2026):**
- **A.** IOC World Bird List v15.2 (Gill, Donsker y Rasmussen, 2026), archivo de comparación con otras listas, columna «2025 IUCN Red List category»: https://www.worldbirdnames.org/IOC_15.2_vs_other_lists.xlsx. Recoge la categoría UICN de 2025 para las 36 y la clasificación de HBW-BirdLife v10 y Clements 2025 lado a lado. Es una fuente secundaria que copia a la UICN.
- **B.** IOC World Bird List v15.2, lista maestra con notas taxonómicas: https://worldbirdnames.org/master_ioc_list_v15.2.xlsx
- **C.** eBird/Clements checklist v2026, API pública de taxonomía: https://api.ebird.org/v2/ref/taxonomy/ebird?fmt=json&version=2026
- **D.** Wikipedia en inglés, infobox y cita de la UICN de cada especie (con DOI de la evaluación). Secundaria. Artículos citados en la tabla por su título, p. ej. https://en.wikipedia.org/wiki/Yellow-naped_amazon
- **E.** BirdLife DataZone (https://datazone.birdlife.org/species/factsheet/<especie>): la ficha abre pero **no carga la categoría ni el historial al leerla con herramienta** (campos «Loading…»). El contenido de la tabla de historial se obtuvo por el buscador web (extractos de la propia ficha), así que se marca «DataZone (extracto)». No es lectura directa de la página.
- **F.** American Ornithological Society, NACC, propuestas 2023-A: https://americanornithology.org/wp-content/uploads/2023/03/2023-A.pdf (propuesta 2023-A-17, texto leído).
- **No se pudo abrir:** iucnredlist.org (HTTP 403 en todas las fichas, p. ej. https://www.iucnredlist.org/species/22686342/180373727). Por eso **ninguna cifra viene de la ficha de la UICN leída directamente**. Las categorías coinciden entre A, D y E en las 12 filas; el año es el de la evaluación citada por D/E (el de la versión de la Lista Roja en el DOI cuando D no da fecha).

| Especie | Estado en el catálogo | UICN vigente (año) | Fuente | Nota taxonómica | Recomendación para Kelvin |
|---|---|---|---|---|---|
| *Amazona diadema* | En peligro | **Preocupación menor** (2020; antes EN en 2014 y 2016, criterio A4cd) | A (LC); E (extracto DataZone, historial); D «Diademed amazon», evaluación e.T22731595A171906249 | Antes se trataba dentro de *A. autumnalis*. Clements 2026 e IOC 15.2 la tienen como especie. | Usar LC. El EN del catálogo coincide con la evaluación vieja (2014–2016). |
| *Amazona imperialis* | En peligro | **En peligro crítico** (2021; CR también en 2019) | A (CR); E, BirdLife DataZone (ficha leída por otra sesión el 8-nov, sin releer aquí); D, e.T22686411A154800996 (2019) | Sin diferencias entre IOC, Clements y HBW-BirdLife. | Usar CR. Es la única donde el Diario ya muestra la UICN verificada. |
| *Amazona lilacina* | En peligro | **En peligro crítico** (2020) | A (CR); D «Lilacine amazon» (CR; DOI e.T22728296A181432250, año 2020 según el infobox). **No se pudo abrir la ficha DataZone ni la de la UICN** | Separada de *A. autumnalis* (Loro cachete amarillo/«Red-lored»); Clements 2026 e IOC la tratan como especie. Un extracto de prensa de BirdLife dice «Vulnerable», pero no hay forma de fecharlo y contradice A y D. | Usar CR. Año 2020 apoyado solo por Wikipedia; conviene confirmarlo en iucnredlist.org desde un equipo con acceso. |
| *Amazona tresmariae* | En peligro | **Sin evaluación propia** (la UICN evalúa *A. oratrix* en conjunto: EN, 2020, e.T22686337A179331301) | A (fila *A. oratrix tresmariae* sin categoría propia); D «Yellow-headed amazon» | Es subespecie (*A. oratrix tresmariae*) en HBW-BirdLife, Clements 2026 e IOC 15.2. El IOC la había separado (Navarro-Sigüenza y Peterson 2004; Eberhard y Bermingham 2004) y la volvió a unir siguiendo al NACC y a HBW/BirdLife. La propuesta NACC 2023-A-17 (F) decía que la separación del IOC no tenía base suficiente. | **No resuelta (a propósito).** El «En peligro» del catálogo solo vale como el de *A. oratrix*. Dejar el nombre narrativo, y en el Diario decir «subespecie del loro de cabeza amarilla». Decide Kelvin. |
| *Amazona rhodocorytha* | En peligro | **Vulnerable** (2017; criterios B2ab, C2a(i)) | A (VU); E (extracto DataZone, bajado 18-dic-2024); D, e.T22686288A118968809 | Sin diferencias entre listas. | Usar VU. |
| *Amazona agilis* | Vulnerable | **En peligro** (2020; criterios A3cde+4acde; Vulnerable de 1988 a 2016) | A (EN); E (extracto DataZone, historial); D, e.T22686231A180748265 | Sin diferencias entre listas. | Usar EN. |
| *Amazona auropalliata* | Vulnerable | **En peligro crítico** (2021, criterio A4cd; EN en 2017, VU en 2012 y 2016) | A (CR); E (extracto DataZone, historial); D «Yellow-naped amazon», e.T22686342A180373727 | Wikipedia anota que a veces se trata como subespecie de *A. ochrocephala*, pero HBW-BirdLife, Clements 2026 e IOC 15.2 la tienen como especie. Subespecies: *auropalliata*, *caribaea*, *parvipes* (IOC). | Usar CR. |
| *Amazona barbadensis* | Vulnerable | **Casi amenazada** (2021) | A (NT); D «Yellow-shouldered amazon», e.T22686325A198373501. No se encontró extracto DataZone | Sin diferencias entre listas. El texto de Wikipedia dice «Vulnerable» y su infobox dice NT: el texto está viejo. | Usar NT. |
| *Amazona brasiliensis* | Vulnerable | **Casi amenazada** (2017, B1ab(ii,v); C2a(i); VU de 2004 a 2016) | A (NT); E (extracto DataZone, historial); D, e.T22686296A118478685 | Sin diferencias entre listas. | Usar NT. |
| *Amazona farinosa* | Casi amenazada | **Preocupación menor** (2022) | A (LC); E (extracto DataZone, 2022 LC); D «Mealy amazon», e.T45430572A210109682 | **Dividida o no según la lista.** HBW-BirdLife v10 separa *A. guatemalae* (Loro harinoso del norte), que la UICN evalúa aparte como NT (2020, e.T45430583A179386817). IOC 15.2 y Clements 2026 las **vuelven a unir** como *A. farinosa* (NACC 2023-A-16: la zona de intergradación en Panamá y la falta de diferencia vocal, Hellmich et al. 2021). | Usar LC solo para *A. farinosa* en sentido HBW (sur). El juego ya tiene *A. guatemalae* aparte: NT, coherente con HBW-BirdLife. Documentar que es especie en una lista y subespecie en otras. |
| *Amazona festiva* | Casi amenazada | **Preocupación menor** (2022, e.T22727626A209890756; NT en 2014 y 2016, A4cd) | A (LC); E (extracto DataZone, historial); D «Festive amazon» | HBW-BirdLife v10 trata a *A. bodini* (Loro festivo del norte/del Orinoco) como especie aparte. IOC 15.2 y Clements 2026 la dejan como subespecie *A. festiva bodini* (IOC: «propuesta de división»). La UICN 2022 evalúa *A. festiva* sola; A da LC para ambas. | Usar LC. Anotar que el juego cuenta *festiva* como una sola. |
| *Amazona kawalli* | Casi amenazada | **Preocupación menor** (2022, e.T22686363A210148938) | A (LC); E (extracto DataZone, 2022 LC, bajado nov-2024); D «Kawall's amazon» | BirdLife la llama «White-faced Amazon»; IOC y Clements, «Kawall's Amazon» (el IOC cambió el nombre para alinearse con el SACC). Es especie en todas las listas. | Usar LC. Nombre inglés distinto, no la especie. |
| *Amazona aestiva* | Preocupación menor | **Casi amenazada** (2019, A2bcd+3bcd+4bcd; LC de 1988 a 2016) | A (NT); E (extracto DataZone, historial); D «Blue-fronted amazon», e.T22686332A154573813 | El mismo ave se llama «Turquoise-fronted Amazon» en IOC, Clements y BirdLife, y «Blue-fronted amazon» en Wikipedia. Sin cambios de especie. | Usar NT. Cuidado con la fuente vieja de peruaves.org (LC). |

### Resto del catálogo cotejado (sin discrepancia con la UICN vigente)

Todas coinciden con la columna «2025 IUCN Red List category» del IOC 15.2 (fuente A) y con el estado que usa el juego: *vittata* CR, *finschi* EN, *oratrix* EN, *vinacea* EN, *viridigenalis* EN, *arausiaca* VU, *collaria* VU, *guildingii* VU, *pretrei* VU, *tucumana* VU, *ventralis* VU, *versicolor* VU, *dufresniana* NT, *guatemalae* NT, *leucocephala* NT, *albifrons* LC, *amazonica* LC, *autumnalis* LC, *mercenarius* LC, *ochrocephala* LC, *xantholora* LC; *martinicana* y *violacea* EX. Años citados por Wikipedia (fuente D) para algunas: *vittata* 2020, *vinacea* 2017, *oratrix* 2020, *ventralis* 2020, *guildingii* 2020, *pretrei* 2022, *tucumana* 2022, *leucocephala* 2020, *amazonica* 2018, *autumnalis* 2018, *ochrocephala* 2018, *mercenarius* 2016, *xantholora* 2021, *martinicana* 2021, *violacea* 2016. No se verificó el año de *finschi*, *arausiaca*, *collaria*, *versicolor*, *dufresniana*, *albifrons* (A confirma la categoría; el año quedó sin abrir).

### Hallazgos taxonómicos para Kelvin
1. **Dos especies del catálogo que otras listas tratan distinto:** *A. tresmariae* (subespecie de *A. oratrix* en las tres listas vigentes) y, en sentido inverso, *A. guatemalae* (especie solo en HBW-BirdLife; subespecie de *A. farinosa* en IOC 15.2 y Clements 2026). Las 36 especies del catálogo son canon de Kelvin: se mantienen, con esta nota.
2. **Una especie que el juego cuenta como una y HBW-BirdLife como dos:** *A. festiva* / *A. bodini*.
3. **Sin discrepancia entre listas:** *diadema*, *lilacina*, *finschi* y *kawalli* son especies en HBW-BirdLife, IOC 15.2 y Clements 2026.
4. **Estado desactualizado:** el catálogo (PDF, 24-oct) reflejaba evaluaciones de 2014–2016 en varios casos (*diadema*, *agilis*, *brasiliensis*, *festiva*).
5. **No resuelto:** la UICN no da categoría propia a *A. tresmariae*; el estado «En peligro» que muestre el juego, si lo muestra, debe decir que es el de *A. oratrix*.

### Qué falta (necesita acceso a la fuente primaria)
Ninguna ficha de iucnredlist.org se pudo leer (HTTP 403) y DataZone no carga sin navegador. Para cerrar al 100 %, alguien con acceso debería abrir las 12 fichas y anotar categoría y año. No se espera que cambie ninguna categoría: A (2025) coincide con D y E en las 12.


## Tabla anterior (25-oct-2026, sin los datos de arriba)

| Especie | Nombre en el catálogo | Catálogo | Verificado | Evaluación citada | Ficha UICN |
|---|---|---|---|---|---|
| *Amazona diadema* | Loro diadema | En peligro | Preocupación menor | BirdLife 2020 · e.T22731595A171906249 | https://www.iucnredlist.org/species/22731595/171906249 |
| *Amazona imperialis* | Loro imperial | En peligro | En peligro crítico | BirdLife 2019 · e.T22686411A154800996 | https://www.iucnredlist.org/species/22686411/154800996 |
| *Amazona lilacina* | Loro lilacino | En peligro | En peligro crítico | BirdLife 2020 · e.T22728296A181432250 | https://www.iucnredlist.org/species/22728296/181432250 |
| *Amazona tresmariae* | Loro de las Tres Marías | En peligro | — (no evaluada aparte) | Wikipedia la trata como subespecie (Amazona oratrix tresmariae); la UICN no la evalúa por separado (A. oratrix: EN). | https://en.wikipedia.org/wiki/Tres_Mar%C3%ADas_amazon |
| *Amazona rhodocorytha* | Loro de corona roja | En peligro | Vulnerable | BirdLife 2017 · e.T22686288A118968809 | https://www.iucnredlist.org/species/22686288/118968809 |
| *Amazona agilis* | Loro de pico negro | Vulnerable | En peligro | BirdLife 2020 · e.T22686231A180748265 | https://www.iucnredlist.org/species/22686231/180748265 |
| *Amazona auropalliata* | Loro de nuca amarilla | Vulnerable | En peligro crítico | BirdLife 2021 · e.T22686342A180373727 | https://www.iucnredlist.org/species/22686342/180373727 |
| *Amazona barbadensis* | Loro de hombros amarillos | Vulnerable | Casi amenazada | BirdLife 2021 · e.T22686325A198373501 | https://www.iucnredlist.org/species/22686325/198373501 |
| *Amazona brasiliensis* | Loro de cola roja | Vulnerable | Casi amenazada | BirdLife 2017 · e.T22686296A118478685 | https://www.iucnredlist.org/species/22686296/118478685 |
| *Amazona farinosa* | Loro harinoso | Casi amenazada | Preocupación menor | BirdLife 2022 · e.T45430572A210109682 | https://www.iucnredlist.org/species/45430572/210109682 |
| *Amazona festiva* | Loro festivo | Casi amenazada | Preocupación menor | BirdLife 2022 · e.T22727626A209890756 | https://www.iucnredlist.org/species/22727626/209890756 |
| *Amazona kawalli* | Loro de Kawall | Casi amenazada | Preocupación menor | BirdLife 2022 · e.T22686363A210148938 | https://www.iucnredlist.org/species/22686363/210148938 |
| *Amazona aestiva* | Loro hablador / frente azul | Preocupación menor | Casi amenazada | BirdLife 2019 · e.T22686332A154573813 | https://www.iucnredlist.org/species/22686332/154573813 |

**Recomendación:**
- Para cada fila, abrir la ficha en iucnredlist.org (fuente oficial) y usar la categoría vigente.
  - Hay evaluaciones de 2016 a 2022. Si existe una más nueva, esa manda.
- Hasta confirmarlo, el juego no muestra el estado UICN de estas especies.
- *Amazona tresmariae*: la UICN no la evalúa aparte, porque la trata como subespecie de *A. oratrix*, que está En peligro.

**Evidencia nueva, 8-nov-2026:** *A. imperialis* — BirdLife DataZone (https://datazone.birdlife.org/species/factsheet/imperial-amazon-amazona-imperialis) confirma En peligro crítico: 2019 (C2a(i,ii); D) y 2021 (A4acd; C1+2a(i,ii); D). La ficha de 2019 (e.T22686411A154800996) coincide con la fila de la tabla. El resto de las filas no se volvió a consultar. Sin cambios de estado (decide Kelvin).
