# HUEVOS_RAREZA · Rareza y poderes de las crías (directiva P2)

Dueño: game designer de huevos. Código: `src/game/rareza.js` (perezoso, lo trae `criadero.js`); datos: `content/comun/huevos.js` → `rarezaCria`.
Dos ejes que no se mezclan: la **cápsula** se gana con un reto (sin azar, como siempre) y la **cría** recibe su rareza al nacer.

## Estado
| Qué | Estado | Dónde |
|---|---|---|
| 8 cápsulas ganadas por reto, incubación 26 días, 4 etapas con el mismo modelo, eclosión cómica (patitas, cascarón-gorro) | EXISTE | `criadero.js`, `huevos.js`, HUEVOS_GDD §2–5 |
| Compañero en el mundo (`companero()`, `vestir()`), pieles de especie por cápsula (`especie` → `AVE.pieles`) | EXISTE | `criadero.js`, `actores.js`, `pieles.js` |
| «Mis récords» cuenta huevos, crías y libres | EXISTE → ampliado con la colección por rareza | `records.js` |
| Huevos por rescates (cápsula «Pichón rescatado») | PARCIAL (carril rescate; entra por `G.criadero.dar` y `obtener`) | `rescate.js` |
| Rareza al nacer (común 60 · rara 29 · épica 10 · legendaria 1), garantías, marco, aura, poderes, Retos sin poderes, guardado viejo | HECHO aquí | `rareza.js` + hunks |
| Velocidad de vuelo, impulso y vista de frutos aplicados en el motor | HECHO (`5b7a512`): vuelo solo en el aire, impulso en el despegue, vista en el radio de los frutos del mundo | `fisica.js`, `banquete.js` |
| La bandada acude al canto (`G.on('canto')` → `pedir('canto', { en: 1 })`) | HECHO (`5b7a512`) | `bandada.js` |

## Diseño
- **Cuándo se decide:** al tocar «Ver la eclosión» (`asignar` en `iniciarEclosion`) y se guarda al instante: recargar no vuelve a tirar. La sorpresa es la eclosión; no hay botón de repetir ni pantalla de tragamonedas.
- **Pesos iniciales** 60/29/10/1 (propuesta P2, a balancear). **La suerte no castiga** (`garantias`): tras 2 comunes seguidas la siguiente es rara o mejor; tras 5 crías sin épica, épica o mejor; tras 7 sin legendaria, legendaria. Con las 8 cápsulas del cap. 1 toda colección completa trae al menos una épica y una legendaria.
- **Qué da cada rareza** (`poderes`): común = aura suave (habilidades básicas); rara = aura y **vista** (frutos y hallazgos desde más lejos ×1,2); épica = además **vuelo** ×1,08, **impulso** ×1,08 y **estela** de chispas al volar; legendaria = vuelo ×1,12, impulso ×1,12, vista ×1,5, estela dorada y **canto** único: al despegar (cada 90 s) llama a la bandada.
- **Dónde no cuentan:** Modo Retos (`retos-on` o `G.retosApi.activo`), «¡Salva al pichón!» (`G.rescate.activo()`) y «¡Banquete!» (`G.banqueteApi.activo()`): `mult()` devuelve 1 y `tiene()` false.
- **Cómo se ve:** marco de color en la cápsula (`.cr-cap[data-rz]`), etiqueta junto al nombre de la cría y un aura (sprite aditivo que late) bajo la cría en el criadero y en el mundo. Nunca cambia el modelo, el pico, los ojos, las proporciones ni las animaciones: solo `extras`.
- **Sin dinero:** nada se compra; las cápsulas siguen saliendo del juego (XP del nido, misiones, Diario, rescates).
- **Guardado:** `c.rareza` por cápsula y contadores `st.rz` dentro de `<almacen>.criadero` (v1, campos nuevos opcionales). Crías de partidas viejas sin `rareza` = común (`de(c)`). Nada se borra salvo «Comenzar de cero» o «Nuevo estudiante».
- **Prueba:** `AV.rarezaTest()` (distribución con semilla, garantías, poderes, Retos, guardado viejo, colección en récords).

## Pendientes y decisiones
- `[KELVIN]` nombres de las rarezas: aquí los de P2 (Común, Rara, Épica, Legendaria); opción neutra sin vocabulario de cajas de botín: Nido, Bosque, Cielo, Leyenda (se cambian en `rarezaCria.niveles[].nombre`).
- `[KELVIN]` si la legendaria es una especie concreta (hoy: la especie la decide la cápsula; la rareza no la cambia) y el nombre del canto (hoy «Canto de la bandada»).
- Pedidos de motor: hechos en `5b7a512`. `fisica.js` multiplica el crucero por `mult('vuelo')` y el despegue por `mult('impulso')`. `banquete.js` alarga el radio de ver los frutos del mundo por `mult('vista')` (el minijuego no). `bandada.js` escucha `canto` y pide la bandada a 1 s. En Retos y duelos `mult()` sigue en 1.
