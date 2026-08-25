#!/usr/bin/env bash
# Nightly backup, and — the part that matters — a restore that is actually
# tested. An untested backup is not a backup.
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL}"
: "${BACKUP_DIR:=/var/backups/fajr}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/fajr-$STAMP.dump"

mkdir -p "$BACKUP_DIR"

echo "→ dumping to $FILE"
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" > "$FILE"

# A dump that cannot be listed is corrupt, and finding that out during an
# outage is the worst possible time.
echo "→ verifying the dump is readable"
pg_restore --list "$FILE" > /dev/null
echo "  $(du -h "$FILE" | cut -f1), $(pg_restore --list "$FILE" | grep -c 'TABLE DATA') tables with data"

if [ -n "${RESTORE_TEST_URL:-}" ]; then
	# Restore into a scratch database and count a table. This is the only thing
	# that proves the backup works.
	echo "→ test-restoring into $RESTORE_TEST_URL"
	pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_TEST_URL" "$FILE" 2>/dev/null || true

	# Compare counts, not just "it ran". A restore that produces an empty
	# database exits zero and is worthless.
	LIVE=$(psql "$DATABASE_URL" -tAc 'select count(*) from "order"')
	COUNT=$(psql "$RESTORE_TEST_URL" -tAc 'select count(*) from "order"')
	if [ "$LIVE" != "$COUNT" ]; then
		echo "✗ restore mismatch: $LIVE orders live, $COUNT restored" >&2
		exit 1
	fi
	echo "  restored and verified: $COUNT orders match"
fi

if [ -n "${R2_BUCKET:-}" ]; then
	echo "→ uploading to R2"
	aws s3 cp "$FILE" "s3://$R2_BUCKET/backups/$(basename "$FILE")" \
		--endpoint-url "${STORAGE_ENDPOINT:?}" --only-show-errors
fi

find "$BACKUP_DIR" -name 'fajr-*.dump' -mtime "+$KEEP_DAYS" -delete
echo "✓ backup complete"
