#!/bin/zsh
# Prueba CLI sin interfaz de la PoC web (equivalente a `Godot --headless -s tests/run_tests.gd`).
# Chrome headless abre ?test=1 con tiempo virtual y vuelca el DOM; sale con 0 si todo pasa. Uso: ./run_test.sh [puerto]
cd "${0:A:h}"; PORT=${1:-8782}
OUT=$(taskpolicy -b nice -n 15 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir="$PWD/chrome-prof" \
  --virtual-time-budget=30000 --no-first-run --disable-extensions --mute-audio --window-size=1280,720 \
  --dump-dom "http://127.0.0.1:$PORT/index.html?test=1" 2>/dev/null | grep -o 'RESULT&gt; [^<]*' | sed 's/&gt;/>/')
echo "${OUT:-RESULT> sin resultado}"
[[ "$OUT" == *'"fallos":[]'* ]]
