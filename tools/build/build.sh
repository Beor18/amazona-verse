#!/bin/bash
# Amazona Verse · build reproducible del artifact (dueño: Build/Release Engineer). Documentado en docs/equipo/BUILD.md.
#
#   tools/build/build.sh <ref> [<salida>] [--anterior <lista>] [--sin-optimizar] [--sin-texturas-compartidas] [--sin-geometria] [--estricto] [--sin-cache]
#
# Exporta <ref> con git archive (no toca la copia de trabajo), quita .glb/.blend, marca index.html (ave:sin-glb), valida,
# poda, optimiza texturas y escribe <salida>/site (lo que se publica), <salida>/manifiesto.json y reporte-build.{md,json}.
# --anterior: lo publicado hoy (lista de archivos del artifact o manifiesto anterior) para quitar los huérfanos.
# <salida> por defecto: tools/build/salida/<ref>-<commit7>-<pid> (única por corrida; ignorada por git y dentro del repo, así el Artifact tool la
# acepta como origen). Salida: 0 pasa, 1 falla la validación, 2 error de uso.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

uso() { sed -n '4,10p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }
[ $# -ge 1 ] || { uso; exit 2; }
case "$1" in -h|--help) uso; exit 0 ;; esac

REF="$1"; shift
OUT=""
OPTS=()
while [ $# -gt 0 ]; do
  a="$1"; shift
  case "$a" in
    --sin-optimizar|--sin-texturas-compartidas|--sin-geometria|--estricto|--sin-cache) OPTS+=("$a") ;;
    --anterior) [ $# -ge 1 ] || { avb_err "--anterior necesita un archivo"; exit 2; }
                [ -f "$1" ] || { avb_err "no existe $1"; exit 2; }
                OPTS+=(--anterior "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"); shift ;;
    -*) avb_err "opción desconocida: $a"; uso; exit 2 ;;
    *) [ -z "$OUT" ] || { avb_err "sobra el argumento $a"; exit 2; }; OUT="$a" ;;
  esac
done

PY="$(avb_python)" || exit 2
SHA="$(git -C "$AVB_REPO" rev-parse --verify --quiet "$REF^{commit}")" || { avb_err "el ref '$REF' no existe en $AVB_REPO"; exit 2; }
FECHA="$(git -C "$AVB_REPO" show -s --format=%cI "$SHA")"
[ -n "$OUT" ] || OUT="$AVB_DIR/salida/$(printf '%s' "$REF" | tr -c 'A-Za-z0-9._-' '_')-${SHA:0:7}-$$"   # única por proceso (QA-35)
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"

# Solo se reutiliza una carpeta que ya sea una build (marcador .avbuild); nunca se borra otra cosa.
REUSAR=""
if [ -n "$(ls -A "$OUT")" ]; then
  [ -f "$OUT/.avbuild" ] || { avb_err "$OUT no está vacía y no es una build anterior; elige otra carpeta"; exit 2; }
  REUSAR=1
fi
# Si otro build.sh o test.sh está usando la carpeta, no se toca (QA-35: antes se borraba site/ a mitad de una prueba).
avb_ocupar "$OUT" || exit 2
trap avb_soltar EXIT
if [ -n "$REUSAR" ]; then
  rm -rf "$OUT/site" "$OUT/manifiesto.json" "$OUT/reporte-build.md" "$OUT/reporte-build.json" \
         "$OUT/reporte-test.md" "$OUT/reporte-test.json" "$OUT/captura-arranque.png" "$OUT/captura-final.png"
fi
printf 'avbuild\nref=%s\ncommit=%s\n' "$REF" "$SHA" > "$OUT/.avbuild"
mkdir -p "$OUT/site"

# Rutas de la export (las que existan en ese commit); index.html es obligatorio.
RUTAS=()
for p in index.html sw.js src content assets; do
  if git -C "$AVB_REPO" cat-file -e "$SHA:$p" 2>/dev/null; then RUTAS+=("$p"); fi
done
[ "${RUTAS[0]:-}" = index.html ] || { avb_err "$REF no tiene index.html en la raíz"; exit 1; }

echo "Amazona Verse · build de $REF ($SHA) → $OUT"
git -C "$AVB_REPO" archive --format=tar "$SHA" "${RUTAS[@]}" | tar -x -C "$OUT/site"

set +e
"$PY" -I "$AVB_DIR/avbuild.py" --sitio "$OUT/site" --salida "$OUT" --ref "$REF" --commit "$SHA" --commit-fecha "$FECHA" \
  --repo "$AVB_REPO" --config "$AVB_DIR/config.json" ${OPTS[@]+"${OPTS[@]}"}
rc=$?
set -e
[ $rc -eq 0 ] && echo "Siguiente paso: tools/build/test.sh $OUT"
exit $rc
