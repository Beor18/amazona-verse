# Amazona Verse · ayudas comunes de tools/build (las cargan build.sh y test.sh; dueño: Build/Release Engineer).
# shellcheck shell=bash

AVB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AVB_REPO="$(cd "$AVB_DIR/../.." && pwd)"

avb_err() { printf 'error: %s\n' "$*" >&2; }

# Python de Blender (3.11, con numpy). Nunca `python3` del sistema: se cuelga en esta máquina.
avb_python() {
  if [ -n "${AV_PYTHON:-}" ]; then
    [ -x "$AV_PYTHON" ] && { printf '%s\n' "$AV_PYTHON"; return 0; }
    avb_err "AV_PYTHON=$AV_PYTHON no es ejecutable"; return 1
  fi
  local c
  for c in "$HOME/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11" \
           "/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11" \
           "$HOME"/Applications/Blender.app/Contents/Resources/*/python/bin/python3.1? \
           /Applications/Blender.app/Contents/Resources/*/python/bin/python3.1?; do
    [ -x "$c" ] && { printf '%s\n' "$c"; return 0; }
  done
  avb_err "no encuentro el python de Blender; define AV_PYTHON=/ruta/a/python3.11"
  return 1
}
