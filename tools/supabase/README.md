# Récords públicos (Supabase)

El ranking global de los minijuegos vive en el proyecto de Supabase de Fernando (`muxxdjyxwjxaoziczkcz`), en un esquema propio y privado, **`amazona`**. No toca ninguna tabla de ese proyecto. Kelvin lo decidió el 26-oct-2026.

- **Tabla:** `amazona.records`, con RLS activado y sin políticas: nadie la lee ni la escribe por la API REST. La migración está en `migracion.sql`.
- **Función:** `amazona-records` (Edge Function, sin JWT). Hace su propia validación, y su código está en `amazona-records/index.ts`.
  - `GET …/functions/v1/amazona-records?reto=flight&n=10` devuelve el top de un reto. Sin `reto`, devuelve el de todos.
  - `POST` con `{ reto, valor, dur_ms, alias, dispositivo }` publica una marca y devuelve el puesto y el top 10.
- **URL:** `https://muxxdjyxwjxaoziczkcz.supabase.co/functions/v1/amazona-records`
- **Seguridad infantil:**
  - El alias es «Animal Adjetivo NN», de listas fijas; no hay texto libre.
  - No se guarda nada personal: el dispositivo y la IP van como hash SHA-256 con sal.
- **Antitrampas:**
  - Cada reto tiene límites de verosimilitud (tiempos mínimos, puntos por segundo de partida).
  - Se aceptan 20 envíos por hora por dispositivo y 60 por IP.
  - Cada dispositivo aparece una sola vez en el top.
  - Una marca se oculta con `update amazona.records set oculto = true where id = …`.
- **Retos:**
  - `carrera` y `rio` van por ms: gana el menor.
  - `tormenta`, `banquete` y `flight` van por puntos: gana el mayor.
- **Para cambiar la función:** edita `index.ts` y despliégala con el MCP de Supabase o con `supabase functions deploy amazona-records --no-verify-jwt`.
