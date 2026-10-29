#!/bin/bash
# Un trabajador de la API en la PC con Windows (Ubuntu en WSL) o en cualquier Linux. Preparar antes con instalar_pc.sh.
# Uso: tools/agente_api/ejecutar_pc.sh [--total 140]
# Toma tareas de tools/agente_api/cola_pc.txt (leída de GitHub): nunca las mismas que la Mac (cola.txt), porque los
# bloqueos entre ventanas son por computadora. Las pruebas corren con el Chromium de Playwright (WebGL por software).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
PY="$HOME/av-venv/bin/python"
[ -x "$PY" ] || { echo "Falta preparar la PC: corre primero tools/agente_api/instalar_pc.sh" >&2; exit 2; }
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -f "$HOME/.av_api_key" ]; then ANTHROPIC_API_KEY="$(cat "$HOME/.av_api_key")"; fi
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  read -rs -p "Pega tu clave de la API (sk-ant-…; no se verá) y pulsa Enter: " ANTHROPIC_API_KEY; echo
  ( umask 077; printf '%s' "$ANTHROPIC_API_KEY" > "$HOME/.av_api_key" )   # fuera del repo; bórrala con: rm ~/.av_api_key
fi
export ANTHROPIC_API_KEY
CHROMIUM=$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome 2>/dev/null | sort | tail -1)
[ -x "$CHROMIUM" ] || { echo "Falta el Chromium de Playwright: corre instalar_pc.sh" >&2; exit 2; }
BIN="$HOME/.av_bin"; mkdir -p "$BIN"
# taskpolicy (macOS) no existe en Linux: se imita con nice. AV_CHROME envuelve Chromium con WebGL por software.
printf '#!/bin/sh\nwhile [ $# -gt 0 ]; do case "$1" in -b) shift;; -n) shift 2;; *) break;; esac; done\nexec nice -n 15 "$@"\n' > "$BIN/taskpolicy"
printf '#!/bin/sh\nexec "%s" --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist "$@"\n' "$CHROMIUM" > "$BIN/chrome"
chmod +x "$BIN/taskpolicy" "$BIN/chrome"
export PATH="$BIN:$PATH" AV_PYTHON="$PY" AV_CHROME="$BIN/chrome" AV_COLA="tools/agente_api/cola_pc.txt"
git fetch -q origin main || true
TOTAL=140; [ "${1:-}" = "--total" ] && TOTAL="${2:-140}"
echo "Trabajador de la PC · cola_pc.txt · tope de esta ventana \$$TOTAL"
exec "$PY" -I tools/agente_api/ejecutor.py --cola 1 --total "$TOTAL"
