# TECNICO_PC: estado de la Mac y plan de espacio

Revisión: 24-oct-2026, 20:40.

## Estado

- **RAM 16 GB**: memoria libre 67 %, compresor ~3 GB.
- **Swap**: 0,8 GB usados de 2 GB (dos swapfiles de 1 GB). Un swapfile nuevo sería de ~2 GB y dejaría el disco en ~1,7 GB libres: no es margen real.
- **Disco**: 228 GB, **3,7 GB libres** (99 % usado).
- **Mayores consumidores de RAM**: procesos WebKit (varios, ~0,7–0,9 GB los mayores), Claude (renderer ~0,9 GB, app ~0,6 GB), WhatsApp 0,4 GB.
- **Servidor** `tests/server.py` en 8765: sano, 10 MB.
- **Riesgo**: el .max de 2,4 GB llega a ~9 GB de RAM y el swap no alcanza. El peligro real es llenar el disco, no la CPU.

## Vigilante (ya activo)

Baja Blender a prioridad de fondo, lo pausa (SIGSTOP) si la memoria libre cae de 12 % o el disco de 1 GB, y lo reanuda al subir la memoria de 30 %. Se apaga solo a las 8 h.

- Ver el log: `tail -f ~/AmazonaVerse/Juego/tests/out/vigilante.log`
- Estado: `~/AmazonaVerse/Juego/tools/sys/vigilante.sh status`
- Detener: `~/AmazonaVerse/Juego/tools/sys/vigilante.sh stop` (reanuda lo pausado)
- Si algo queda congelado: `kill -CONT <pid>`

## Cómo liberar 15–20 GB (lo haces tú, ordenado por impacto)

1. **Librería de iMovie, ~66 GB**: está en `Documentos/untitled folder 2/iMovie Library.imovielibrary`. Muévela a un disco externo, o borra desde iMovie los eventos y proyectos viejos. Con esto sobra para el objetivo. Verifica la copia antes de borrar el original.
2. **iCloud y Fotos**: Ajustes del Sistema > tu nombre > iCloud > Fotos > "Optimizar almacenamiento de Mac". No pude medir la fototeca (macOS la protege); suele rendir varios GB.
3. **Apps grandes sin uso**: iMovie 3,7 GB (si ya no lo usas), CapCut 1,9 GB, GarageBand 1,1 GB (más sus sonidos), Keynote 0,5 GB. Arrástralas a la Papelera desde Aplicaciones.
4. **Descargas, 6,3 GB**: instaladores .dmg ya instalados (Claude ×3, Chrome, WhatsApp, ~1,5 GB) y dos videos .MOV de ~1,1 GB. Revísalos y mueve lo que quieras conservar.
5. **Papelera**: tiene ~1,5 GB de caché de Chrome ya movida. Revísala y vacíala tú.
6. **AmazonaVerse**: `04_Mapa_3D` (3 GB) y `07_ZIPs_Originales` (157 MB) a disco externo cuando termine la importación.

Con ~15 GB libres el sistema podrá crear swap con holgura y el riesgo de congelamiento baja mucho. Cierra también las pestañas WebGL que no uses.
