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

# Candado de una carpeta de build (QA-35): build.sh y test.sh lo toman para que otra corrida no rehaga site/ mientras se usa.
# avb_ocupar <carpeta>: falla si lo tiene otro proceso vivo; si está libre (vacío) o su dueño murió, lo toma. avb_soltar lo vacía.
AVB_CANDADO=""
avb_ocupar() {
  local f="$1/.avbuild.ocupada" pid
  pid="$(head -n1 "$f" 2>/dev/null || true)"
  if [ -n "$pid" ] && [ "$pid" != "$$" ] && kill -0 "$pid" 2>/dev/null; then
    avb_err "$1 la está usando otro proceso (pid $pid, build.sh o test.sh); espera o elige otra carpeta"; return 1
  fi
  printf '%s\n' "$$" > "$f"
  AVB_CANDADO="$f"
}
avb_soltar() {
  [ -n "$AVB_CANDADO" ] && [ "$(head -n1 "$AVB_CANDADO" 2>/dev/null)" = "$$" ] && : > "$AVB_CANDADO"
  AVB_CANDADO=""
}
