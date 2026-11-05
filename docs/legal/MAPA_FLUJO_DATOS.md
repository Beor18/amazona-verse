# Mapa de flujo de datos · Amazona Verse (5-nov-2026)

```
                 ┌──────────────────────────── APARATO DEL JUGADOR ───────────────────────────┐
                 │  Navegador                                                                  │
                 │   ├─ localStorage: partidas, temporada, Aula, criadero, récords, V18        │
                 │   ├─ sessionStorage: aspecto del personaje                                  │
                 │   └─ Caché del service worker: archivos del sitio                           │
                 └───────────────┬──────────────────────────────────────┬──────────────────────┘
                                 │ (1) pide páginas y archivos           │ (2) SOLO si el ranking
                                 │     GET, sin cookies                  │     estuviera encendido
                                 ▼                                       ▼     (hoy APAGADO)
                      ┌────────────────────┐                 ┌──────────────────────────────┐
                      │ Vercel (alojamiento)│                 │ Supabase · amazona-records    │
                      │ - sirve el sitio    │                 │ - recibe: reto, marca,        │
                      │ - registros técnicos│                 │   duración, apodo, código de  │
                      │   (IP, navegador)   │                 │   aparato                     │
                      │   PENDIENTE: plazo  │                 │ - guarda: hash del aparato y  │
                      └────────────────────┘                 │   de la IP + marca            │
                                                              │ - sin plazo de borrado        │
                                                              └──────────────────────────────┘
   (3) Enlaces a fuentes y patrocinadores: el navegador sale a esos sitios solo si alguien hace clic.
   (4) Compartir cómic o récords: menú del sistema o descarga, tras la puerta de adulto; sin servidor del juego.
```

| Flujo | Datos | ¿Llega a terceros? | Estado |
| --- | --- | --- | --- |
| (1) Navegador → Vercel | Petición de archivos; Vercel ve IP y navegador | Vercel como proveedor de alojamiento | Activo; plazo de registros PENDIENTE |
| (2) Navegador → Supabase | Récord, apodo, código de aparato (el servidor guarda hashes con sal) | Supabase como proveedor | **Apagado** desde el 5-nov; filas antiguas BLOQUEADO de comprobar |
| (3) Clic en un enlace externo | Lo que ese sitio recoja | El sitio enlazado | Solo por acción del usuario |
| (4) Compartir | La imagen que el adulto decida | La app que elija el adulto | Tras puerta de adulto |
| Datos en el aparato | Partidas y progreso | No | Activo |
