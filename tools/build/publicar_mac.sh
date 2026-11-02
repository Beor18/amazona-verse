#!/bin/bash
# Publicar desde la Mac (GPU real, sin límites de nube). Une lo que dejan las computadoras, prueba las 13 baterías y publica sitio/.
#   tools/build/publicar_mac.sh              # una vez
#   tools/build/publicar_mac.sh --continuo   # cada 3 horas (AV_CADA=1200 para cada 20 min); sin cambios nuevos no construye nada
#   tools/build/publicar_mac.sh --probar     # igual pero sin commit ni push
# Autorizado por Kelvin (publicar sin pedirle permiso si las pruebas pasan). Nunca usa --force.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.."; ORIG="$PWD"
PROBAR=0; CONT=0; IGUAL=0
for a in "$@"; do case "$a" in --probar) PROBAR=1;; --continuo) CONT=1;; --igual) IGUAL=1;; esac; done
# --igual: publica aunque las pruebas estén en rojo (Kelvin lo pidió para ver los gráficos del día en vivo;
# queda el ajuste de vuelo BM76 pendiente). Solo para una publicación puntual, no en --continuo.
COAUTOR="${AV_COAUTOR:-Claude Sonnet 5.5 <noreply@anthropic.com>}"

una_vuelta() {
  git fetch -q origin main || { echo "sin red"; return 1; }
  # Une las ramas de paso (api-*) con main; en conflictos de documentos se queda con las dos versiones
  for r in $(git ls-remote origin 'refs/heads/api-*' | awk '{print $2}'); do
    git fetch -q origin "$r:refs/remotes/origin/${r#refs/heads/}" 2>/dev/null
  done
  if git diff --quiet && git diff --cached --quiet; then :; else echo "hay cambios sin commit (un trabajador edita): se publica lo que ya está en GitHub"; fi
  W=$(mktemp -d); trap 'rm -rf "$W"' RETURN
  git worktree add -q --detach "$W" origin/main || return 1
  ( cd "$W"
    for r in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | grep '^origin/api-'); do
      if [ "$(git rev-list --count HEAD.."$r")" -gt 0 ]; then
        git merge --no-ff -q -m "Une $r" "$r" 2>/dev/null || {
          for f in $(git diff --name-only --diff-filter=U); do
            python3 - "$f" <<'PY'
import re,sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
s=re.sub(r'<<<<<<< [^\n]*\n(.*?)=======\n(.*?)>>>>>>> [^\n]*\n', lambda m: m.group(1)+m.group(2), s, flags=re.S)
open(p,'w',encoding='utf-8').write(s)
PY
            git add "$f"
          done
          git commit -q --no-edit; }
      fi
    done
    SHA=$(git rev-parse --short=7 HEAD)
    ULT=$(git log -1 --format=%s -- sitio | sed -n 's/^Sitio: publica \([0-9a-f]\{7,\}\).*/\1/p')
    if [ -n "$ULT" ] && git diff --quiet "$ULT" HEAD -- . ':!sitio' ':!docs' ':!*.md' 2>/dev/null; then echo "nada nuevo que publicar (sitio ya es $ULT)"; exit 0; fi
    OUT="$PWD/tools/build/salida/publicar-$SHA"; rm -rf "$OUT"
    echo "== build de $SHA =="; taskpolicy -b nice -n 15 tools/build/build.sh HEAD "$OUT" || { echo "NO SE PUBLICA: el build falló"; exit 1; }
    NOTA="13 baterías en verde en la Mac con GPU real"
    if [ $IGUAL -eq 1 ]; then
      echo "== pruebas OMITIDAS (--igual): se publica con el vuelo pendiente (BM76) =="
      NOTA="gráficos del día; vuelo con ajuste pendiente (BM76, movementTest 46/49)"
    else
      echo "== pruebas (13 baterías + extras) =="; tools/build/test.sh "$OUT/" --extra || { echo "NO SE PUBLICA $SHA: pruebas en rojo (arriba está cuál)"; exit 1; }
    fi
    # Informe de la publicación (CG-2): resumen de $OUT/reporte-test.json; con --igual no hay pruebas («-»)
    REPJ="$OUT/reporte-test.json"; [ $IGUAL -eq 1 ] && REPJ=-
    PY="$(source tools/build/lib.sh && avb_python)" || PY=""
    informe() { [ -n "$PY" ] && "$PY" -I tools/build/ultima_publicacion.py "$REPJ" "$1" --codigo "$SHA" --nota "$NOTA"; }
    [ $PROBAR -eq 1 ] && { informe "$ORIG/tools/build/salida/ultima_publicacion-$SHA.json"; echo "pruebas en verde para $SHA (--probar: sin publicar)"; exit 0; }
    tools/build/sitio.sh "$OUT/site" || exit 1
    T=$(mktemp); GIT_INDEX_FILE=$T git read-tree HEAD; GIT_INDEX_FILE=$T git add -A sitio
    GIT_INDEX_FILE=$T git diff --cached --quiet && { echo "sitio/ sin cambios"; exit 0; }
    # Va en el mismo commit «Sitio: publica»; si falla, se publica igual sin él
    if informe docs/equipo/ultima_publicacion.json; then GIT_INDEX_FILE=$T git add docs/equipo/ultima_publicacion.json
    else echo "aviso: no se pudo escribir docs/equipo/ultima_publicacion.json"; fi
    TREE=$(GIT_INDEX_FILE=$T git write-tree); rm -f "$T"
    C=$(git commit-tree "$TREE" -p HEAD -m "Sitio: publica $SHA ($NOTA)

Co-Authored-By: $COAUTOR")
    for i in 1 2 3 4 5; do
      git push -q origin "$C:refs/heads/main" && { echo "PUBLICADO $SHA; Vercel lo sirve en 1-2 minutos"; exit 0; }
      # main se movió mientras se probaba (otro agente subió algo): se rehace el commit de sitio/ ENCIMA del main nuevo,
      # con el mismo sitio/ ya probado (antes se reintentaba con un commit viejo y GitHub lo rechazaba siempre; 1-nov)
      sleep $((2**i)); git fetch -q origin main || continue
      T2=$(mktemp); GIT_INDEX_FILE=$T2 git read-tree origin/main && GIT_INDEX_FILE=$T2 git rm -r -q --cached --ignore-unmatch sitio >/dev/null \
        && GIT_INDEX_FILE=$T2 git read-tree --prefix=sitio/ "$C:sitio" \
        && { B=$(git rev-parse -q --verify "$C:docs/equipo/ultima_publicacion.json" || true)   # el informe va con su sitio/
             [ -z "$B" ] || GIT_INDEX_FILE=$T2 git update-index --add --cacheinfo "100644,$B,docs/equipo/ultima_publicacion.json"; } \
        && TREE2=$(GIT_INDEX_FILE=$T2 git write-tree) \
        && C=$(git commit-tree "$TREE2" -p origin/main -m "Sitio: publica $SHA ($NOTA)

Co-Authored-By: $COAUTOR"); rm -f "$T2"
      echo "main se movió: reintento $i encima de $(git rev-parse --short origin/main)"
    done; echo "push falló"; exit 1 )
  RC=$?
  git worktree remove --force "$W" 2>/dev/null
  # Trae a la carpeta de trabajo lo publicado si está limpia
  git diff --quiet && git diff --cached --quiet && git pull -q --ff-only origin main 2>/dev/null
  return $RC
}

while true; do
  echo "──── $(date '+%d/%m %H:%M') ────"
  una_vuelta
  [ $CONT -eq 1 ] || exit 0
  CADA="${AV_CADA:-10800}"; echo "Próxima vuelta en $((CADA/60)) min."; sleep "$CADA"
done
