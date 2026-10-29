#!/bin/bash
# Sube a GitHub, cada 5 minutos, los commits que dejan los trabajadores de la API (el ejecutor les prohíbe «git push»).
# Una sola ventana por computadora:   tools/agente_api/subir.sh
# En la Mac antes lo hacía el supervisor de ~/AmazonaVerse/juego; la copia limpia juego_api no lo tiene, y sin esto
# el trabajo se queda en la Mac sin llegar a la web (29-oct: toda una noche de API sin un commit en GitHub).
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
while true; do
  git fetch -q origin main 2>/dev/null || { echo "$(date '+%H:%M') sin red; reintento en 5 min"; sleep 300; continue; }
  n=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
  if [ "$n" -gt 0 ]; then
    if git diff --quiet && git diff --cached --quiet; then
      if git pull -q --rebase origin main; then
        git push -q origin HEAD:main && echo "$(date '+%H:%M') subidos $n commit(s): $(git log --oneline -1)" \
          || echo "$(date '+%H:%M') push falló; reintento en 5 min"
      else
        git rebase --abort 2>/dev/null; echo "$(date '+%H:%M') conflicto al unir con main; lo mira la coordinadora"
      fi
    else
      echo "$(date '+%H:%M') hay $n commit(s) pero un trabajador está editando; espero"
    fi
  else
    echo "$(date '+%H:%M') nada que subir"
  fi
  sleep 300
done
