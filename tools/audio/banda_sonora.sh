#!/bin/bash
# Amazona Verse · banda sonora (C13): recodifica los temas de Kelvin y propone puntos de bucle. Doc: docs/equipo/BANDA_SONORA.md
#
#   tools/audio/banda_sonora.sh [<carpeta con los MP3>]        (por defecto ~/Downloads/soundtrack)
#
# 1. afconvert (macOS, sin instalar nada) → assets/audio/musica/<id>.m4a, AAC-LC estéreo 96 kb/s CBR, 48 kHz (moov al principio:
#    el navegador puede empezar a sonar sin bajar todo el archivo).
# 2. Decodifica a WAV mono 11 kHz en una carpeta temporal y, con el Python de Blender (-I, nunca el python3 del sistema), mide el nivel
#    medio (→ «nivel» de la tabla) y busca el mejor par de puntos de bucle (costura B → A) por similitud de croma y bandas en ventanas
#    de 8 s. Solo IMPRIME: la tabla BANDA_SONORA de src/game/musica.js se edita a mano (y se escucha la costura antes de cambiarla).
set -euo pipefail
ORIGEN="${1:-$HOME/Downloads/soundtrack}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEST="$REPO/assets/audio/musica"
PY="$HOME/Applications/Blender.app/Contents/Resources/4.2/python/bin/python3.11"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$DEST"

# id ← archivo de origen (nombres de Kelvin)
PISTAS=(
  "exploracion|El Yunque Awakens — Exploración y aventura.mp3"
  "carrera|yunque.mp3"
  "criadero|The Golden Hatch — El huevo legendario.mp3"
  "tormenta|Guardians of Borikén — Desafíos y jefes.mp3"
  "arena|El Yunque battle.mp3"
)
for p in "${PISTAS[@]}"; do
  id="${p%%|*}"; f="$ORIGEN/${p#*|}"
  [ -f "$f" ] || { echo "falta $f" >&2; exit 1; }
  echo "· $id ← $(basename "$f")  ($(mdls -raw -name kMDItemComment "$f" 2>/dev/null | sed 's/.*id=//'))"
  taskpolicy -b nice -n 15 afconvert -f m4af -d aac -b 96000 -s 0 -q 127 "$f" "$DEST/$id.m4a"
  afconvert -f WAVE -d LEI16@11025 -c 1 "$f" "$TMP/$id.wav"
  printf '  %s: %s bytes · %s\n' "$id.m4a" "$(stat -f %z "$DEST/$id.m4a")" "$(afinfo "$DEST/$id.m4a" | grep -E 'estimated duration' | sed 's/estimated //')"
done

[ -x "$PY" ] || { echo "sin el Python de Blender: no se analizan los bucles"; exit 0; }
cat > "$TMP/bucle.py" <<'EOF'
import sys, os, wave, numpy as np
HOP, N, X = 256, 2048, 2.5
def leer(p):
    w = wave.open(p); sr = w.getframerate()
    return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768, sr
def rasgos(x, sr):
    nf = (len(x) - N) // HOP
    fr = np.lib.stride_tricks.as_strided(x, (nf, N), (x.strides[0] * HOP, x.strides[0])) * np.hanning(N)
    S = np.abs(np.fft.rfft(fr, axis=1)) ** 2; f = np.fft.rfftfreq(N, 1 / sr)
    m = (f > 60) & (f < 4000); pc = (np.round(12 * np.log2(f[m] / 440)) % 12).astype(int)
    ch = np.stack([S[:, m][:, pc == k].sum(1) for k in range(12)], 1)
    ed = np.geomspace(40, 5000, 9); bd = np.stack([S[:, (f >= ed[i]) & (f < ed[i + 1])].sum(1) for i in range(8)], 1)
    F = np.concatenate([np.log1p(ch * 50), np.log1p(bd * 50)], 1); F -= F.mean(1, keepdims=True)
    return F / (np.linalg.norm(F, axis=1, keepdims=True) + 1e-9)
for p in sys.argv[1:]:
    x, sr = leer(p); dur = len(x) / sr; F = rasgos(x, sr); dt = HOP / sr
    h = int(sr * 0.25); r = np.array([np.sqrt(np.mean(x[i*h:(i+1)*h] ** 2)) for i in range(len(x) // h)]); db = 20 * np.log10(r + 1e-9)
    util = (np.where(db > np.median(db) - 6)[0][-1] + 1) * 0.25
    ib = np.arange(int(4 / dt), int(60 / dt)); ja = np.arange(int((dur - 40) / dt), int((util - X / 2 - 0.3) / dt))
    Sim = np.nan_to_num(F[ib] @ F[ja].T); W = int(8 / dt); C = np.zeros_like(Sim); C[0] = Sim[0]; C[:, 0] = Sim[:, 0]
    for k in range(1, len(ib)): C[k, 1:] = Sim[k, 1:] + C[k - 1, :-1]
    sc = np.full_like(Sim, -1.0); sc[W:, W:] = (C[W:, W:] - C[:-W, :-W]) / W
    i, j = np.unravel_index(np.argmax(sc), sc.shape)
    print('%-12s dur %.2f s · nivel medio %.3f (nivel de la tabla ≈ %.2f) · bucle sugerido [%.2f, %.2f] (similitud %.2f)' % (
        os.path.basename(p)[:-4], dur, np.sqrt(np.mean(x ** 2)), 0.05 / np.sqrt(np.mean(x ** 2)), ib[i] * dt, ja[j] * dt, sc[i, j]))
EOF
echo "· bucles (sugerencias; los de la tabla se afinaron a mano: nivel parecido a ambos lados y pulso alineado)"
taskpolicy -b nice -n 15 "$PY" -I "$TMP/bucle.py" "$TMP"/*.wav
