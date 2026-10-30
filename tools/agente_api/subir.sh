#!/bin/bash
# Sube a GitHub, cada 5 minutos, los commits que dejan los trabajadores de la API (el ejecutor les prohíbe «git push»).
# Una sola ventana por computadora:   tools/agente_api/subir.sh
# 29-oct: con 3 trabajadores siempre hay alguno editando, así que esperar a que la carpeta esté limpia no subía nunca.
# Ahora: si main de GitHub no se movió, sube directo a main; si se movió, sube a la rama de paso «api-mac» (sin tocar
# la carpeta de trabajo) y la coordinadora de la nube la une con main en cada ronda. Solo con la carpeta limpia trae main.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
# Rama de paso propia de esta computadora (la Mac y la PC no se pisan): api-<nombre de la máquina>.
RAMA="${AV_RAMA:-api-$(hostname -s 2>/dev/null | tr -c "A-Za-z0-9\n" "-" | cut -c1-30)}"
while true; do
  if ! git fetch -q origin main 2>/dev/null; then echo "$(date '+%H:%M') sin red; reintento en 5 min"; sleep 300; continue; fi
  n=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
  if [ "$n" -gt 0 ]; then
    if git merge-base --is-ancestor origin/main HEAD; then
      git push -q origin HEAD:main && echo "$(date '+%H:%M') subidos $n commit(s) a main: $(git log --oneline -1 | cut -c1-90)" \
        || echo "$(date '+%H:%M') push a main falló; reintento en 5 min"
    else
      git push -q -f origin "HEAD:refs/heads/$RAMA" && echo "$(date '+%H:%M') $n commit(s) en la rama $RAMA (la nube los une con main)" \
        || echo "$(date '+%H:%M') push a $RAMA falló; reintento en 5 min"
    fi
  fi
  # Con la carpeta limpia, trae lo nuevo de main (la cola y las tareas que añade la coordinadora).
  if git diff --quiet && git diff --cached --quiet && ! git merge-base --is-ancestor origin/main HEAD; then
    if git pull -q --rebase origin main; then echo "$(date '+%H:%M') al día con main ($(git rev-parse --short HEAD))"
    else git rebase --abort 2>/dev/null; echo "$(date '+%H:%M') no se pudo unir con main; lo une la nube desde $RAMA"; fi
  elif [ "$n" -eq 0 ]; then
    echo "$(date '+%H:%M') nada que subir"
  fi
  sleep 300
done
