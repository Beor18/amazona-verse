#!/bin/bash
# Publicar desde la Mac (GPU real, sin límites de nube). Une lo que dejan las computadoras, prueba las 13 baterías y publica sitio/.
#   tools/build/publicar_mac.sh              # una vez
#   tools/build/publicar_mac.sh --continuo   # cada 3 horas, sin parar (déjala en una ventana con caffeinate)
#   tools/build/publicar_mac.sh --probar     # igual pero sin commit ni push
# Autorizado por Kelvin (publicar sin pedirle permiso si las pruebas pasan). Nunca usa --force.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
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
    [ $PROBAR -eq 1 ] && { echo "pruebas en verde para $SHA (--probar: sin publicar)"; exit 0; }
    tools/build/sitio.sh "$OUT/site" || exit 1
    T=$(mktemp); GIT_INDEX_FILE=$T git read-tree HEAD; GIT_INDEX_FILE=$T git add -A sitio
    GIT_INDEX_FILE=$T git diff --cached --quiet && { echo "sitio/ sin cambios"; exit 0; }
    TREE=$(GIT_INDEX_FILE=$T git write-tree); rm -f "$T"
    C=$(git commit-tree "$TREE" -p HEAD -m "Sitio: publica $SHA ($NOTA)

Co-Authored-By: $COAUTOR")
    for i in 1 2 3 4; do
      git push -q origin "$C:refs/heads/main" && { echo "PUBLICADO $SHA; Vercel lo sirve en 1-2 minutos"; exit 0; }
      git fetch -q origin main; git rebase -q origin/main "$C" 2>/dev/null; C=$(git rev-parse HEAD); sleep $((2**i))
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
  echo "Próxima vuelta en 3 horas."; sleep 10800
done
