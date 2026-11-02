# Pedido: ver los edificios en el .max de 2021

27-oct-2026. Kelvin pidió una máquina Windows con 3ds Max para comparar los originales, sin cuentas ni clics suyos.

No hay 3ds Max en esta máquina, y no se va a instalar uno.

- El KVM anidado del kernel 6.12.94+ entra en `kvm_spurious_fault` al crear una CPU virtual, con `/dev/kvm` y VT-x presentes. No se vuelve a arrancar: puede tirar el kernel de esta VM.
- QEMU sin KVM llegó a la pantalla «press any key» del instalador de Windows 11 Enterprise eval (ISO en `/home/ubuntu/win-eval/`, SHA-256 `bc3f24086ebadc94489066b5ad78089e2cf5c3491e90e790bb81a2b199c10e38`) y no deja un Windows usable. El script `start-vm.sh` sigue deshabilitado.
- El trial de 3ds Max pide la cuenta de Autodesk de Kelvin. No se crea, no se piratea y no se baja un Max «lite».

Lo que sí se hizo: leer `AV3DMaxExportBuildings.max` (2,3 GB) con el lector OLE del repo y poner la malla del `.max` al lado de la del juego. El resultado está en `docs/EDIFICIOS.md`, sección «Verificación contra el .max».
