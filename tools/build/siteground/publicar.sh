#!/bin/bash
# Amazona Verse · sube sitio/ de HEAD a SiteGround (www.amazonaverse.com). Sustituye a la publicación automática de Vercel.
#
#   tools/build/siteground/publicar.sh            # a mano, con la llave ~/.ssh/siteground_amazona
#   SG_SSH_KEY=<llave privada> publicar.sh        # en la Action publicar_siteground.yml (secreto del repo)
#
# Sube solo lo que cambió (--checksum) y cambia los archivos al final (--delay-updates), así nadie carga medio juego viejo y
# medio nuevo. Borra en el servidor lo que ya no está en sitio/. Si sitio/ y el .htaccess no cambiaron desde la última subida,
# no hace nada. La llave nunca va en el repo.
set -euo pipefail
JUEGO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; AQUI="$JUEGO/tools/build/siteground"
SG_HOST="${SG_HOST:-gtxm1363.siteground.biz}"; SG_USER="${SG_USER:-u245-h5irsqvxpoij}"; SG_PORT=18765
DOCROOT="www/amazonaverse.com/public_html"
[ -f "$JUEGO/sitio/index.html" ] || { echo "falta sitio/ (se arma con tools/build/sitio.sh)" >&2; exit 2; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "[$SG_HOST]:$SG_PORT ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKcamJAhfElu+/bDlG1dUbfoMRDhsG16X5LaYogSEFM7" > "$TMP/known_hosts"
if [ -n "${SG_SSH_KEY:-}" ]; then printf '%s\n' "$SG_SSH_KEY" > "$TMP/llave"; chmod 600 "$TMP/llave"; LLAVE="$TMP/llave"
else LLAVE="$HOME/.ssh/siteground_amazona"; fi
SSH=(ssh -i "$LLAVE" -p "$SG_PORT" -o IdentitiesOnly=yes -o BatchMode=yes -o UserKnownHostsFile="$TMP/known_hosts" -o StrictHostKeyChecking=yes)

# Huella de lo que se publica: el árbol de sitio/ en git + el .htaccess (en el servidor, fuera de public_html)
HUELLA="$(git -C "$JUEGO" rev-parse HEAD:sitio)-$(git -C "$JUEGO" hash-object "$AQUI/htaccess")"
if [ "$("${SSH[@]}" "$SG_USER@$SG_HOST" 'cat ~/.amazona_publicado 2>/dev/null' < /dev/null)" = "$HUELLA" ]; then
  echo "SiteGround ya tiene esta versión ($HUELLA)"; exit 0
fi

cp "$AQUI/htaccess" "$TMP/.htaccess"
RSYNC=(rsync -rlz --checksum --delay-updates --delete-after -e "${SSH[*]}"
  --exclude vercel.json --exclude /.well-known/ --exclude /Default.html --exclude /.htaccess)
"${RSYNC[@]}" --stats "$JUEGO/sitio/" "$SG_USER@$SG_HOST:$DOCROOT/" | { grep -E "^(Number of (regular files transferred|deleted files)|Total transferred file size)" || true; }
rsync -z -e "${SSH[*]}" "$TMP/.htaccess" "$SG_USER@$SG_HOST:$DOCROOT/.htaccess"
# La caché dinámica está apagada (un sitio estático no la necesita); se vacía igual por si alguien la enciende
"${SSH[@]}" "$SG_USER@$SG_HOST" "timeout 60 site-tools-client domain update id=1 flush_cache=1 >/dev/null 2>&1 || true; echo '$HUELLA' > ~/.amazona_publicado" < /dev/null
echo "publicado en SiteGround: sitio de $(git -C "$JUEGO" rev-parse --short HEAD) ($HUELLA)"
