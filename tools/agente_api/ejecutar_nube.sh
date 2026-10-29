#!/bin/bash
# Lanza el ejecutor de la API desde una sesión en la nube (claude.ai/code), sin la Mac.
# Necesita ANTHROPIC_API_KEY en el entorno de la nube (Kelvin la guarda una vez en la configuración del entorno,
# como variable ANTHROPIC_API_KEY; nunca se pega en el chat ni en archivos). El claude-agent-sdk ya viene instalado.
# Uso: tools/agente_api/ejecutar_nube.sh --cola 2 --total 140
# Las pruebas corren con el Chromium de Playwright por software (SwiftShader), como tools/build/publicar_nube.sh.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
[ -n "${ANTHROPIC_API_KEY:-}" ] || { echo "Falta ANTHROPIC_API_KEY en el entorno de la nube (configuración del entorno → variables)." >&2; exit 2; }
python3 -c 'import claude_agent_sdk' 2>/dev/null || { echo "Falta claude-agent-sdk en python3." >&2; exit 2; }
BIN=/tmp/av_api_nube/bin; mkdir -p "$BIN"
# taskpolicy (macOS) no existe en Linux: lo imitamos con nice.
printf '#!/bin/sh\nwhile [ $# -gt 0 ]; do case "$1" in -b) shift;; -n) shift 2;; *) break;; esac; done\nexec nice -n 15 "$@"\n' > "$BIN/taskpolicy"
printf '#!/bin/sh\nexec /opt/pw-browsers/chromium --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist "$@"\n' > "$BIN/chrome"
chmod +x "$BIN/taskpolicy" "$BIN/chrome"
export PATH="$BIN:$PATH" AV_PYTHON="${AV_PYTHON:-/usr/bin/python3}" AV_CHROME="$BIN/chrome"
export AV_COLA="${AV_COLA:-tools/agente_api/cola_nube.txt}"
echo "Arrancando en la nube… cola: $AV_COLA"
exec python3 -I tools/agente_api/ejecutor.py "$@"
