#!/usr/bin/env bash
# Stand up one merchant: slug in, running stack out. Fifty lines, one afternoon
# — anything more visual is a decision to make after the app exists.
set -euo pipefail

SLUG="${1:?usage: provision.sh <slug> <domain>}"
DOMAIN="${2:?usage: provision.sh <slug> <domain>}"
ROOT="${MERCHANT_ROOT:-/srv/fajr}/$SLUG"

if [ -d "$ROOT" ]; then
	echo "✗ $ROOT already exists — refusing to overwrite a live merchant." >&2
	exit 1
fi

mkdir -p "$ROOT"
cp deploy/docker-compose.yml deploy/Caddyfile "$ROOT/"

# Generated, never chosen: a password somebody types is a password somebody reuses.
POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"
ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -d '/+=')"

cat > "$ROOT/.env" <<ENV
IMAGE=${IMAGE:-fajr-shop:latest}
DOMAIN=$DOMAIN
ORIGIN=https://$DOMAIN
POSTGRES_USER=fajr
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=fajr
STORAGE_ENDPOINT=${STORAGE_ENDPOINT:-}
STORAGE_ACCESS_KEY_ID=${STORAGE_ACCESS_KEY_ID:-}
STORAGE_SECRET_ACCESS_KEY=${STORAGE_SECRET_ACCESS_KEY:-}
STORAGE_BUCKET=$SLUG-media
STORAGE_PUBLIC_URL=${STORAGE_PUBLIC_URL:-}
SMS_PROVIDER=console
ENV
chmod 600 "$ROOT/.env"

echo "→ starting the stack"
docker compose --project-directory "$ROOT" --project-name "fajr-$SLUG" up -d

echo "→ waiting for the database"
until docker compose --project-directory "$ROOT" --project-name "fajr-$SLUG" \
	exec -T postgres pg_isready -U fajr >/dev/null 2>&1; do sleep 2; done

echo "→ migrating and seeding"
docker compose --project-directory "$ROOT" --project-name "fajr-$SLUG" \
	run --rm -e ADMIN_PASSWORD="$ADMIN_PASSWORD" web \
	sh -c 'node packages/db/src/migrate.ts && node packages/db/src/seed.ts'

cat <<DONE

✓ $SLUG is up at https://$DOMAIN

  admin:    https://$DOMAIN/admin
  email:    admin@fajr.shop
  password: $ADMIN_PASSWORD

  Save that password now — it is not stored anywhere.
  The merchant lands on the setup wizard on first sign-in.
DONE
