# V18.4 · Edificios vivos, interiores explorables y construcción modular

Directiva de Kelvin del 10-nov-2026 (PDF original en el chat de la coordinadora). Resumen operativo:

- **Decisión:** no ampliar el mapa. Convertir edificios decorativos en espacios para entrar, explorar, construir, amueblar y volver.
- **01 Reutilizar antes de crear:** catalogar modelos, geometrías, texturas, materiales, puertas, ventanas, pisos, techos, mobiliario, colisiones, interacción, inventario y persistencia que ya existen. Comprobar licencias de assets externos.
- **02 Auditoría de edificios:** id, zona, geometría, materiales, puertas, ventanas, colisiones, interior existente, coste de render. Clasificar A) convertible directo, B) abrir acceso y adaptar, C) fachada cerrada que necesita interior modular o transición. No afirmar que hay interior porque el exterior esté modelado.
- **03 Biblioteca modular compartida:** paredes, esquinas, pisos, techos, puertas, ventanas, escaleras, columnas, barandas; texturas originales con UV correctas; estilo toon propio; nada copiado de otros juegos.
- **04 Entradas, cámaras y movimiento:** entrar y salir claro, sin quedar atrapado; colisiones, cámara interior, techo ocultable, luz legible; accesos a escala de cotorra; si la fachada no se abre bien, interior modular con transición.
- **05 Construcción dentro:** extender el editor existente (Construir: selección, previsualización, encaje, rotación, colocar, retirar, deshacer/rehacer, guardar); solo en espacios autorizados; proteger arquitectura histórica, rutas, puertas y objetos de misión; habitaciones prediseñadas y edición pieza a pieza.
- **06 Muebles e interacción:** reutilizar primero; catálogo pequeño y funcional (decorar, interactuar o descubrir); nada de cientos de muebles ni física compleja.
- **07 Tres pilotos:** Histórico (fachada conservada, dos áreas interiores, descubrimiento opcional con información verificable); Taller de Tuerca (herramientas y una reparación breve con mecánicas existentes); Casa editable (decorar, mover muebles, guardar, salir y volver con cambios).
- **08 Persistencia y seguridad:** guardar ids, posiciones, rotaciones, materiales, estados y versión del formato; sin duplicar geometrías; compatibilidad con guardados previos; sin cuentas infantiles ni servicios remotos nuevos; ninguna construcción bloquea salidas ni rompe misiones.
- **09 Rendimiento iPhone/Chromebook:** interiores bajo demanda; suspender lo lejano; materiales compartidos, colisiones simples, mobiliario limitado; instancing/KTX2 solo con beneficio medido; medir antes/después; no prometer 30 FPS en todo Chromebook (equipos de referencia y límites documentados).
- **10 Secuencia:** inventario → un edificio funcional → editor y persistencia → tres pilotos y validación. Sin agentes redundantes ni conflictos de archivos. Duelo y optimización escolar siguen en paralelo.
- **11 Aceptación:** tres edificios existentes jugables (entrada/salida, cámara, colisiones), interiores útiles y coherentes, muebles colocables, guardado recuperable, sin roturas de capítulos ni regresiones en móvil, Chromebook medido.
- **12 Entregables a Kelvin:** inventario con porcentaje de reutilización calculado y su método; video corto (entrar, explorar, colocar muebles, recuperar lo guardado); rendimiento, errores pendientes y estimación para más edificios. No inventar porcentajes.

**Orden final:** no necesitamos un mapa más grande; necesitamos un mundo más vivo.
