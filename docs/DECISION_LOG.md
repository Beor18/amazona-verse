# DECISION_LOG

## 2026-10-24 · Motor del hito 1: web 3D con Three.js (reversible)
- **Por qué:** corre ya en iPhone, Android, Windows, macOS y navegadores sin builds ni firmas. Se puede probar aquí y compartir como link.
- **Descartado por ahora:** Godot 4 (requiere descargar el editor y plantillas de exportación; iOS necesita Xcode completo y cuenta de Apple) y Unity (licencia y un editor pesado).
- **Camino futuro:** mantener datos y lógica separados del render para portar a Godot o empaquetar la web (Capacitor) para tiendas cuando haya modelos 3D convertidos.
- Three.js r128 desde cdnjs (UMD) para que funcione también dentro del visor de Claude.

## 2026-10-24 · Vittata como sprite 2.5D (temporal)
El modelo `Piloto Cotorra.blend` (Blender 2.80) aún no está convertido: Blender no estaba instalado. Se usa el render oficial con transparencia como sustituto declarado.

## 2026-10-24 · Cámara en tercera persona libre (PROPUESTO)
Decisión abierta en el documento maestro. Se eligió tercera persona para el prototipo porque es la más fácil de cambiar después.

## 2026-10-24 · Prototipo web como referencia jugable, no como reemplazo
- La lógica del capítulo está separada del render y los datos (eventos, guardado, cómic) son JSON versionado, para portarlos a Godot o Unity sin rehacer el diseño.
- **Condición para cambiar de motor:** tener modelos con rig y animaciones (ahora no existen) o necesitar builds nativas de tienda.

## 2026-10-24 · Eventos con esquema propio y migración de partidas (v2 → v3)
Se adopta el esquema del directivo V4 §7.3. Las partidas v2 se migran; las ilegibles se copian antes de descartarlas.

## 2026-10-24 · PDF sin librerías
Se genera un PDF de una página con el JPEG del cómic, en vez de cargar jsPDF, para que funcione dentro del visor de Claude (que bloquea fetch externos). Reversible si se necesita texto seleccionable.

## 2026-10-24 · El aprendiz del jugador acompaña a Vittata
El jugador controla a Vittata en la historia y su personaje creado la sigue y aparece en el cómic. Revisar en pruebas con niños (V4 §3.2).

## 2026-10-24 · Modelo Blender convertido a GLB, pero no se usa todavía
`vittata_base_lod1.glb` (20k triángulos) existe, pero el .blend no trae texturas (rutas a un disco E:\ de Windows) ni el esqueleto RigCotorra, y muestra un traje negro de piloto. Se sigue usando el render 2D hasta que Kelvin confirme el diseño y aparezcan las texturas y el rig.

## 2026-10-24 · Vittata es la cotorra verde (decisión de Kelvin)
La protagonista se representa con los renders verdes oficiales. Los uniformes se crearán después. El modelo con traje de piloto se reserva para un minijuego aparte; no se usa en la historia principal.
