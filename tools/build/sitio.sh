#!/bin/bash
# Amazona Verse · sitio publicable (Vercel, Root Directory = sitio): la landing (web/) en la raíz y el juego en /juego/.
#
#   tools/build/sitio.sh <build-del-juego>/site
#
# Rehace ./sitio con la landing (git archive de HEAD:web, sin docs) + el juego ya construido y probado (build.sh +
# test.sh) + vercel.json. Después se hace commit de sitio/ en main como cualquier otro cambio; Vercel publica main.
set -euo pipefail
SITE="${1:?uso: sitio.sh <build>/site}"
JUEGO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; OUT="$JUEGO/sitio"
[ -f "$SITE/index.html" ] || { echo "no es una build: $SITE" >&2; exit 2; }
rm -rf "$OUT" && mkdir -p "$OUT"
git -C "$JUEGO" archive HEAD:web | tar -x -C "$OUT"
rm -rf "$OUT/docs" "$OUT/README.md" "$OUT/netlify.toml" "$OUT/.nojekyll" "$OUT/.gitignore"
cp -R "$SITE" "$OUT/juego" && rm -rf "$OUT/juego/tests"
# Contador de avance de la esquina de la landing (web/index.html lo lee); si falla, la landing no lo enseña y el sitio sale igual
"$JUEGO/tools/build/progreso.sh" "$JUEGO" > "$OUT/progreso.json" 2>/dev/null || rm -f "$OUT/progreso.json"
cat > "$OUT/vercel.json" <<'EOF'
{
  "trailingSlash": true,
  "headers": [
    { "source": "/juego/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }] },
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600, stale-while-revalidate=86400" }] },
    { "source": "/(.*)", "headers": [
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ] }
  ]
}
EOF
echo "sitio: $OUT ($(du -sh "$OUT" | cut -f1), $(find "$OUT" -type f | wc -l | tr -d ' ') archivos). Siguiente: git add sitio && git commit"
