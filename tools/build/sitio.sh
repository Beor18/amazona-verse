#!/bin/bash
# Amazona Verse · sitio unificado para Vercel: la landing (~/AmazonaVerse/Web) en la raíz y el juego en /juego/.
#
#   tools/build/sitio.sh <build-del-juego>/site [--push]
#
# Arma ./tools/build/salida/sitio con la landing (git archive del HEAD de Web, sin docs) + el juego ya construido y
# probado (build.sh + test.sh) + vercel.json. Con --push lo sube, reemplazando la anterior, a la rama `deploy` del repo
# (Vercel publica esa rama tal cual, sin build).
set -euo pipefail
SITE="${1:?uso: sitio.sh <build>/site [--push]}"; PUSH="${2:-}"
JUEGO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"; WEB="$HOME/AmazonaVerse/Web"; OUT="$JUEGO/tools/build/salida/sitio"
[ -f "$SITE/index.html" ] || { echo "no es una build: $SITE" >&2; exit 2; }
rm -rf "$OUT" && mkdir -p "$OUT"
git -C "$WEB" archive HEAD | tar -x -C "$OUT"
rm -rf "$OUT/docs" "$OUT/README.md" "$OUT/netlify.toml" "$OUT/.nojekyll" "$OUT/.gitignore"
cp -R "$SITE" "$OUT/juego" && rm -rf "$OUT/juego/tests"
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
echo "sitio: $OUT ($(du -sh "$OUT" | cut -f1), $(find "$OUT" -type f | wc -l | tr -d ' ') archivos)"
[ "$PUSH" = "--push" ] || exit 0
cd "$OUT" && git init -q -b deploy && git add -A
git -c user.name="$(git -C "$JUEGO" config user.name)" -c user.email="$(git -C "$JUEGO" config user.email)" \
  commit -q -m "Sitio unificado: landing (Web $(git -C "$WEB" rev-parse --short HEAD)) + juego (Juego $(git -C "$JUEGO" rev-parse --short HEAD))"
git remote add origin "$(git -C "$JUEGO" remote get-url origin)"
GIT_TERMINAL_PROMPT=0 git push -q -f origin deploy && echo "subido a la rama deploy"
