#!/usr/bin/env bash
# Restore a unlinked+ backup.
#
# Non-destructive verification into a separate database:
#   TARGET_DB=unlinked_restore_check CONFIRM_RESTORE=yes ./scripts/restore.sh /path/db.dump
#
# Destructive restore into the live database (explicit approval required):
#   CONFIRM_RESTORE=yes ./scripts/restore.sh /path/db.dump
#   STORAGE_ARCHIVE=/path/storage.tgz CONFIRM_RESTORE=yes ./scripts/restore.sh /path/db.dump
set -euo pipefail

if [[ "${CONFIRM_RESTORE:-}" != "yes" ]]; then
  echo "REFUSED: set CONFIRM_RESTORE=yes to acknowledge that restore overwrites data." >&2
  exit 1
fi

DUMP="${1:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: CONFIRM_RESTORE=yes $0 /path/to/db.dump" >&2
  exit 1
fi

PG_CONTAINER="${PG_CONTAINER:-unlinked-plus-postgres-1}"
APP_CONTAINER="${APP_CONTAINER:-unlinked-plus-backend-1}"
SOURCE_DB="${DB_NAME:-unlinked}"
DB_USER="${DB_USER:-unlinked}"
TARGET_DB="${TARGET_DB:-$SOURCE_DB}"
REMOTE_DUMP="/tmp/unlinked-restore-$(date -u +%s).dump"

echo "[restore] target database: $TARGET_DB"
if [[ "$TARGET_DB" != "$SOURCE_DB" ]]; then
  docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -t -A \
    -c "SELECT 1 FROM pg_database WHERE datname='$TARGET_DB'" | grep -q 1 \
    || docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$TARGET_DB\""
fi

docker cp "$DUMP" "$PG_CONTAINER:$REMOTE_DUMP"
docker exec "$PG_CONTAINER" pg_restore -U "$DB_USER" -d "$TARGET_DB" \
  --clean --if-exists --no-owner "$REMOTE_DUMP"
docker exec "$PG_CONTAINER" rm -f "$REMOTE_DUMP"

if [[ -n "${STORAGE_ARCHIVE:-}" ]]; then
  if [[ "$TARGET_DB" != "$SOURCE_DB" ]]; then
    echo "REFUSED: storage restore is only allowed for the live database." >&2
    exit 1
  fi
  REMOTE_STORAGE="/tmp/unlinked-storage-$(date -u +%s).tgz"
  docker cp "$STORAGE_ARCHIVE" "$APP_CONTAINER:$REMOTE_STORAGE"
  docker exec "$APP_CONTAINER" tar -xzf "$REMOTE_STORAGE" -C /data
  docker exec "$APP_CONTAINER" rm -f "$REMOTE_STORAGE"
fi

echo "[restore] complete"
