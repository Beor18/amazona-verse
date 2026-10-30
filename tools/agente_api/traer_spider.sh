#!/bin/bash
# Amazona Verse · trae a amazona-verse lo que la sesión de Claude web deja en Beor18/spider-web (carpeta amazona-verse/).
# Lo deja en la rama api-spider de amazona-verse; publicar_mac.sh --continuo la une a main, corre las 13 baterías y publica.
#
#   tools/agente_api/traer_spider.sh              # una vez
#   tools/agente_api/traer_spider.sh --continuo   # cada 10 minutos, sin parar (en su propia ventana)
# También vale una copia fuera del repo (p. ej. ~/traer_spider.sh) lanzada desde dentro del clon de amazona-verse.
#
# Nunca usa --force. Si un parche choca, para esa vuelta, no sube nada y lo dice. Las claves no pasan por aquí.
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "$(dirname "${BASH_SOURCE[0]}")/../..")"
SPIDER=https://github.com/Beor18/spider-web.git
MARCA="$(git rev-parse --git-dir)/spider_ultimo"     # último commit de spider-web ya traído (no va al repo)
[ -f "$MARCA" ] || echo 94bb869 > "$MARCA"           # 94bb869 = spider-web sincronizada con el main real 3dd8c8e: solo se trae lo posterior

una_vuelta() {
  git fetch -q "$SPIDER" main || { echo "$(date +%H:%M) sin red"; return 1; }
  local nuevo; nuevo=$(git rev-parse FETCH_HEAD); local ultimo; ultimo=$(cat "$MARCA")
  [ "$nuevo" = "$(git rev-parse -q --verify "$ultimo^{commit}" 2>/dev/null)" ] && { echo "$(date +%H:%M) nada nuevo"; return 0; }
  git fetch -q origin main
  local base=origin/main
  git ls-remote --exit-code -q origin refs/heads/api-spider >/dev/null 2>&1 && { git fetch -q origin api-spider:refs/remotes/origin/api-spider; base=origin/api-spider; }
  local W; W=$(mktemp -d)
  git worktree add -q --detach "$W" "$base" || return 1
  ( cd "$W"
    git merge -q --no-edit origin/main 2>/dev/null || { git merge --abort; echo "api-spider choca con main: revisar a mano"; exit 1; }
    git format-patch --relative=amazona-verse --stdout "$ultimo..$nuevo" -- . ':!amazona-verse/ORIGEN.md' > "$W.patch"
    [ -s "$W.patch" ] || exit 0
    git am -3 -q "$W.patch" || { git am --abort; echo "un parche choca: no se sube nada (avisar a la sesión de Claude web)"; exit 1; }
    git push -q origin HEAD:refs/heads/api-spider
  ) && { echo "$nuevo" > "$MARCA"; echo "$(date +%H:%M) traído hasta ${nuevo:0:7} en api-spider"; }
  local rc=$?; rm -f "$W.patch"; git worktree remove --force "$W" 2>/dev/null; return $rc
}

if [ "${1:-}" = "--continuo" ]; then
  while true; do una_vuelta; sleep 600; done
else
  una_vuelta
fi
