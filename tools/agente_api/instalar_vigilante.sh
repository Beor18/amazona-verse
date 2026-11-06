#!/bin/bash
# Instala el vigilante de la Mac (una sola vez): launchd lo corre al iniciar sesión y cada 10 minutos.
#   cd ~/AmazonaVerse/juego_api && tools/agente_api/instalar_vigilante.sh
# Para quitarlo:  launchctl unload ~/Library/LaunchAgents/com.amazonaverse.vigilante.plist
# Necesita la clave de la API en el Llavero (una vez; la pide sin mostrarla):
#   security add-generic-password -a "$USER" -s amazonaverse-api -w
set -eu
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
REPO="$PWD"; PL="$HOME/Library/LaunchAgents/com.amazonaverse.vigilante.plist"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/AmazonaVerse/logs_api"
chmod +x tools/agente_api/vigilante.sh
cat > "$PL" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.amazonaverse.vigilante</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$REPO/tools/agente_api/vigilante.sh</string></array>
  <key>StartInterval</key><integer>600</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HOME/AmazonaVerse/logs_api/vigilante.out</string>
  <key>StandardErrorPath</key><string>$HOME/AmazonaVerse/logs_api/vigilante.out</string>
</dict></plist>
EOF
launchctl unload "$PL" 2>/dev/null || true
launchctl load "$PL"
if security find-generic-password -a "$USER" -s amazonaverse-api -w > /dev/null 2>&1; then
  echo "Vigilante instalado. Revisa cada 10 min. Registro: ~/AmazonaVerse/logs_api/vigilante.log"
else
  echo "Vigilante instalado, PERO falta la clave en el Llavero. Pega esto y luego tu clave (no se verá):"
  echo '  security add-generic-password -a "$USER" -s amazonaverse-api -w'
fi
