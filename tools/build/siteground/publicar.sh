#!/bin/bash
# Amazona Verse · sube sitio/ de HEAD a SiteGround. Sustituye a la publicación automática de Vercel.
#
#   tools/build/siteground/publicar.sh [amazonaverse|kelving1]   # a mano, con la llave ~/.ssh/siteground_amazona
#   SG_SSH_KEY=<llave privada> publicar.sh kelving1              # en la Action publicar_siteground.yml (secreto del repo)
#
# Destinos:
#   amazonaverse  sitio Apache www.amazonaverse.com: sitio/ va a public_html con el .htaccess de esta carpeta.
#   kelving1      sitio Node.js kelving1.sg-host.com: sitio/ va a ~/www/kelving1.sg-host.com/amazona (fuera de public_html,
#                 que nginx entregaría con 180 días de caché) y lo sirve la app kelving1/server.js (ver su cabecera).
#
# Sube solo lo que cambió (--checksum) y cambia los archivos al final (--delay-updates), así nadie carga medio juego viejo y
# medio nuevo. Borra en el servidor lo que ya no está en sitio/. Si nada cambió desde la última subida, no hace nada.
# La llave nunca va en el repo.
set -euo pipefail
JUEGO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"; AQUI="$JUEGO/tools/build/siteground"
DESTINO="${1:-amazonaverse}"; SG_PORT=18765
case "$DESTINO" in
  amazonaverse) SG_HOST=gtxm1363.siteground.biz; SG_USER=u245-h5irsqvxpoij; DOCROOT=www/amazonaverse.com/public_html; HTACCESS=1
    LLAVE_HOST="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKcamJAhfElu+/bDlG1dUbfoMRDhsG16X5LaYogSEFM7";;
  kelving1) SG_HOST=ssh.kelving1.sg-host.com; SG_USER=u914-cotafljl0535; DOCROOT=www/kelving1.sg-host.com/amazona; HTACCESS=0
    LLAVE_HOST="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKC0O0KgWGCwOC7JtmsMNu4Epe2lshFygYj1ww0wnoTn";;
  *) echo "destino desconocido: $DESTINO (amazonaverse | kelving1)" >&2; exit 2;;
esac
[ -f "$JUEGO/sitio/index.html" ] || { echo "falta sitio/ (se arma con tools/build/sitio.sh)" >&2; exit 2; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "[$SG_HOST]:$SG_PORT $LLAVE_HOST" > "$TMP/known_hosts"
if [ -n "${SG_SSH_KEY:-}" ]; then printf '%s\n' "$SG_SSH_KEY" > "$TMP/llave"; chmod 600 "$TMP/llave"; LLAVE="$TMP/llave"
else LLAVE="$HOME/.ssh/siteground_amazona"; fi
SSH=(ssh -i "$LLAVE" -p "$SG_PORT" -o IdentitiesOnly=yes -o BatchMode=yes -o UserKnownHostsFile="$TMP/known_hosts" -o StrictHostKeyChecking=yes)

# Huella de lo que se publica: el árbol de sitio/ en git (+ el .htaccess en Apache); en el servidor, fuera de la carpeta pública
HUELLA="$(git -C "$JUEGO" rev-parse HEAD:sitio)"
[ "$HTACCESS" = 1 ] && HUELLA="$HUELLA-$(git -C "$JUEGO" hash-object "$AQUI/htaccess")"
if [ "$("${SSH[@]}" "$SG_USER@$SG_HOST" 'cat ~/.amazona_publicado 2>/dev/null' < /dev/null)" = "$HUELLA" ]; then
  echo "SiteGround ($DESTINO) ya tiene esta versión ($HUELLA)"; exit 0
fi

RSYNC=(rsync -rlz --checksum --delay-updates --delete-after -e "${SSH[*]}"
  --exclude vercel.json --exclude /.well-known/ --exclude /Default.html --exclude /.htaccess)
"${RSYNC[@]}" --stats "$JUEGO/sitio/" "$SG_USER@$SG_HOST:$DOCROOT/" | { grep -E "^(Number of (regular files transferred|deleted files)|Total transferred file size)" || true; }
if [ "$HTACCESS" = 1 ]; then
  cp "$AQUI/htaccess" "$TMP/.htaccess"
  rsync -z -e "${SSH[*]}" "$TMP/.htaccess" "$SG_USER@$SG_HOST:$DOCROOT/.htaccess"
fi
# La caché dinámica está apagada (un sitio estático no la necesita); se vacía igual por si alguien la enciende
"${SSH[@]}" "$SG_USER@$SG_HOST" "timeout 60 site-tools-client domain update id=1 flush_cache=1 >/dev/null 2>&1 || true; echo '$HUELLA' > ~/.amazona_publicado" < /dev/null
echo "publicado en SiteGround ($DESTINO): sitio de $(git -C "$JUEGO" rev-parse --short HEAD) ($HUELLA)"
