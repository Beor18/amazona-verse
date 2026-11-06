# W26 · Ranking apagado: seguridad para cuando se encienda

**Estado:** propuesta para aprobación de Kelvin. **No se aplicó nada** a los archivos del código y **no se tocó Supabase** (decisión de Kelvin, 5-nov: etapa de pruebas, el ranking sigue apagado). El diff exacto está en `docs/legal/W26_ranking.diff`.
**Origen:** `docs/legal/MEMO_ABOGADO_COPPA.md` §1 y §2, y su acción 6 (línea 74): «Antes de cualquier reactivación del ranking: sal fuera del código (secreto de la función) o eliminar el hash de IP, quitar la elección manual de NN y corregir el texto de `records.js:95`». Este documento cubre la sal, la IP y el texto. La elección manual de NN queda aparte (ver «Fuera de alcance»).

## 1. Qué está mal hoy

| # | Problema | Dónde |
|---|---|---|
| a | La **sal está escrita en el código** de un repositorio público: `const SAL = 'amazona-verse-records-v1'`. Quien la lee puede recalcular hashes. | `tools/supabase/amazona-records/index.ts:8` (usada en `:28`) |
| b | Se **guarda un hash de la IP** (`x-forwarded-for`). Con la sal pública y un espacio IPv4 pequeño, se puede revertir por fuerza bruta. La IP es un identificador persistente (memo §1). | `index.ts:69-70` (cálculo), `:71` (consulta por `ip`), `:73` (insert); columna `ip text not null` en `tools/supabase/migracion.sql:11`, índice `:19` |
| c | El texto que ve el niño dice «No se guarda nada personal: solo el apodo y tu marca», pero también se guardan el hash del código de dispositivo y el hash de la IP. No es veraz. | `src/game/records.js:95` (`rankTexto`, ES y EN) |
| d | La documentación y el comentario repiten la afirmación inexacta («sin datos personales… dispositivo e IP como SHA-256 con sal»). | `index.ts:3-4`, `tools/supabase/README.md:12` y `:15` |

Contexto: el ranking está apagado (`publicarRanking` devuelve `'desactivado'`, `records.js:804`; nada asigna `G.RANKING_EN_LINEA = true`), así que hoy no entra ningún dato nuevo. La tabla ya aplicada en Supabase (migración del 26-oct) conserva las filas viejas, que tienen su propio procedimiento de borrado (memo, acción 1).

## 2. Cambio propuesto (ver el diff)

1. **Sin sal en el código.** Se lee el secreto del entorno de la función: `Deno.env.get('RANKING_SECRET')`. Si falta o tiene menos de 32 caracteres, la función **no arranca** (nunca hay un valor por defecto). Además del secreto, el hash pasa de «SHA-256 de sal + texto» a **HMAC-SHA256** con esa clave, que es la forma correcta de hacerlo con un secreto.
2. **Sin IP.** La función ya no lee `x-forwarded-for`, ni calcula ni guarda nada derivado de la IP. Se elimina la columna `ip` y su índice de `migracion.sql` (instalaciones nuevas).
3. **Freno que sustituye al límite por IP.** Se mantiene 20 envíos por hora por dispositivo y se agrega un **tope global de 600 envíos por hora** (`TOPE_GLOBAL_HORA`) con un índice sobre `creado`. Es una decisión de ajuste: protege contra inundación sin identificar a nadie, pero no frena a un atacante que rote códigos de dispositivo hasta llegar al tope. Si se quiere algo más fuerte, lo adecuado es un freno en el borde (Vercel/Supabase) que no guarde la IP en nuestra tabla.
4. **Texto veraz** en `records.js:95`:
   - ES: «Elige tu apodo de animal. Se guardan tu apodo, tu marca y un código secreto de este dispositivo (no es tu nombre ni tu IP). Un adulto puede pedir que lo borremos.»
   - EN: «Pick your animal nickname. We save your nickname, your score and a secret code for this device (not your name or your IP). A grown-up can ask us to delete it.»
   - Es un texto provisional: **la redacción final es del abogado/Kelvin** (aviso de privacidad, `AVISO_PRIVACIDAD_PADRES_BORRADOR.md`). La promesa «un adulto puede pedir que lo borremos» exige que exista ese procedimiento antes de encender.
5. `README.md` de `tools/supabase` y el comentario de cabecera de `index.ts` quedan coherentes con lo anterior.

Nota honesta: aun sin IP, el código de dispositivo hasheado sigue siendo un identificador persistente (memo §1: el hash no lo saca de la definición de información personal). Este cambio **reduce** lo guardado y cierra el hueco de la sal pública; **no sustituye** la respuesta del abogado sobre el consentimiento (memo §1 y §5).

## 3. Riesgos

- **Rotar o perder `RANKING_SECRET`** cambia todos los hashes: los jugadores existentes dejan de coincidir con sus filas (el top "mejor por dispositivo" las vería como dispositivos distintos). Aceptable si la tabla se vacía antes del lanzamiento; si no, guardar el secreto en un gestor.
- **Las filas viejas** tienen `dispositivo` e `ip` calculados con la sal pública. No se arreglan con este cambio: hay que borrarlas (memo, acción 1) antes de encender.
- **Orden de despliegue:** el código nuevo inserta sin `ip`. Si se despliega antes de quitar el `not null` de la columna, el insert fallará (con el ranking apagado no afecta a nadie). Seguir el orden del §4.
- **Tope global:** un ataque de 600 envíos válidos por hora bloquea el ranking para todos (denegación de servicio blanda). A cambio no se guarda ningún dato de red.
- **Arranque con error:** si falta el secreto, la función responde 500/no arranca; es intencional.
- La verificación de verosimilitud por reto (`RETOS`) no cambia.

## 4. Pasos para quien despliegue más adelante (con aprobación de Kelvin; hoy NO se hace nada)

1. Abogado confirma la pregunta del memo §1 y §5 (consentimiento) y la redacción final del texto del niño.
2. Borrar las filas existentes de `amazona.records` con el procedimiento y el acta del memo (acción 1, con Fernando). Es irreversible.
3. Generar un valor aleatorio largo (por ejemplo 32 bytes en base64 con `openssl rand -base64 32`) y guardarlo como secreto de la función: `supabase secrets set RANKING_SECRET=<valor>` (o el panel de Supabase). **Nunca** en el repositorio, en un documento ni en un mensaje. Guardar copia en el gestor de secretos de Kelvin.
4. Migración en Supabase, antes del despliegue de código, solo cuando se apruebe:
   ```sql
   alter table amazona.records drop column if exists ip;   -- elimina también records_ip
   create index if not exists records_creado on amazona.records (creado);
   ```
5. Aplicar `docs/legal/W26_ranking.diff` en una sesión con permiso (`patch -p1 < docs/legal/W26_ranking.diff`), pasar `tools/build/test.sh … --extra` (hay pruebas del panel del ranking con `fetch` simulado) y revisar el texto en ES/EN.
6. Desplegar la función `amazona-records`; comprobar con un POST de prueba desde un origen permitido que responde 200, que la fila nueva **no** tiene `ip`, y que sin secreto la función no arranca (en un entorno de prueba).
7. Solo después de todo lo anterior considerar `G.RANKING_EN_LINEA = true` (decisión de Kelvin, con aviso de privacidad enlazado y puerta de adulto vigentes).

## Fuera de alcance (anotado para Kelvin)

- **Elección manual del número NN** (1-99, `records.js:738/747/758`; el servidor acepta 1-99, `index.ts:23`): el memo §2 la marca como cambio que decide Kelvin. No se incluye en el diff.
- Redacción legal definitiva, consentimiento parental verificable y política de conservación: son del abogado/Kelvin.

## Verificación hecha

El diff se aplicó en seco (`patch --dry-run`) sobre una copia de los cuatro archivos y aplica limpio. No se ejecutó nada contra Supabase ni contra el juego; no hay ningún valor secreto en este documento ni en el diff.
