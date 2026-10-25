#!/bin/bash
# Amazona Verse · pruebas de una build en Chrome sin interfaz (dueño: Build/Release Engineer). Ver docs/equipo/BUILD.md.
#
#   tools/build/test.sh <carpeta> [--extra] [--solo-medir] [--puerto N] [--informe DIR]
#
# <carpeta>: salida de build.sh (o una carpeta con index.html). Sirve la build en un puerto libre, abre un Chrome propio
# (perfil temporal, DevTools en un puerto que elige el sistema; nunca el 9333) y corre selfTest, missionTest,
# accessoryTest, templateTest, eduTest, maestroTest, criaderoTest, movementTest, saveTest, comicTest y e2eTest tras el
# flujo de jugador nuevo, y mide la carga inicial y el heap. Escribe reporte-test.{md,json} y capturas junto a la build.
# Salida: 0 pasa, 1 falla, 2 no se pudo correr.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

[ $# -ge 1 ] || { sed -n '4,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 2; }
case "$1" in -h|--help) sed -n '4,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;; esac
[ -d "$1" ] || { avb_err "no existe la carpeta $1"; exit 2; }

PY="$(avb_python)" || exit 2
exec "$PY" -I "$AVB_DIR/avtest.py" --config "$AVB_DIR/config.json" "$@"
