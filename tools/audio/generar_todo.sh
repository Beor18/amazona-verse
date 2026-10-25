#!/bin/bash
# Regenera todo el audio del pitch de Amazona Verse (sin descargas, solo numpy + `say`).
#   bash tools/audio/generar_todo.sh            -> SFX, voz, música, mezcla e informes (~5 min)
#   bash tools/audio/generar_todo.sh --mezcla   -> solo mezcla e informes (p. ej. tras grabar vo_kelvin/)
set -euo pipefail
PY="$HOME/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11"
D="$(cd "$(dirname "$0")" && pwd)"
OUT="$HOME/AmazonaVerse/_trabajo_claude/pitch/audio"
mkdir -p "$OUT"/{vo,musica,sfx,stems,analisis}
if [ "${1:-}" != "--mezcla" ]; then
  echo "== SFX";    "$PY" -I "$D/sfx.py"
  echo "== Voz";    "$PY" -I "$D/voz.py"
  echo "== Música"; "$PY" -I "$D/musica.py"
fi
echo "== Mezcla"; "$PY" -I "$D/mezcla.py"
echo "== Informes"
"$PY" -I "$D/analisis.py" "$OUT/pitch_mix.wav" "$OUT"/stems/{voz,musica,sfx}.wav "$OUT/musica/musica.wav" \
  --secciones --json "$OUT/analisis/informe_mezcla.json" | tee "$OUT/analisis/informe_mezcla.txt"
"$PY" -I "$D/analisis.py" "$OUT"/vo/VO_B*.wav "$OUT"/sfx/*.wav \
  --json "$OUT/analisis/informe_archivos.json" > "$OUT/analisis/informe_archivos.txt"
echo "Listo: $OUT/pitch_mix.wav"
