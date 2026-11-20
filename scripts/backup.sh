#!/usr/bin/env bash
# Backup database + certificate storage of the live unlinked+ stack.
# Safe to run while the application is online (pg_dump takes a consistent snapshot).
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/unlinked-plus}"
PG_CONTAINER="${PG_CONTAINER:-unlinked-plus-postgres-1}"
APP_CONTAINER="${APP_CONTAINER:-unlinked-plus-backend-1}"
DB_NAME="${DB_NAME:-unlinked}"
DB_USER="${DB_USER:-unlinked}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

DUMP_NAME="db-$TS.dump"
echo "[backup] dumping $DB_NAME -> $DUMP_NAME"
docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
  -f "/tmp/$DUMP_NAME"
docker cp "$PG_CONTAINER:/tmp/$DUMP_NAME" "$BACKUP_DIR/$DUMP_NAME"
docker exec "$PG_CONTAINER" rm -f "/tmp/$DUMP_NAME"

STORAGE_NAME="storage-$TS.tgz"
echo "[backup] archiving /data -> $STORAGE_NAME"
docker exec "$APP_CONTAINER" tar -czf "/tmp/$STORAGE_NAME" -C /data .
docker cp "$APP_CONTAINER:/tmp/$STORAGE_NAME" "$BACKUP_DIR/$STORAGE_NAME"
docker exec "$APP_CONTAINER" rm -f "/tmp/$STORAGE_NAME"

# Row-count manifest makes restores verifiable without touching production.
docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -F, \
  -c "select 'users',count(*) from users union all select 'posts',count(*) from posts union all select 'comments',count(*) from comments union all select 'transactions',count(*) from transactions union all select 'certificates',count(*) from certificates order by 1;" \
  > "$BACKUP_DIR/counts-$TS.csv"

printf 'timestamp=%s\ndb=%s\nstorage=%s\ncounts=%s\n' \
  "$TS" "$DUMP_NAME" "$STORAGE_NAME" "counts-$TS.csv" > "$BACKUP_DIR/latest.txt"

find "$BACKUP_DIR" -maxdepth 1 -type f -mtime "+$RETENTION_DAYS" -name '*.dump' -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -mtime "+$RETENTION_DAYS" -name '*.tgz' -delete
find "$BACKUP_DIR" -maxdepth 1 -type f -mtime "+$RETENTION_DAYS" -name 'counts-*.csv' -delete

echo "[backup] complete: $BACKUP_DIR/$DUMP_NAME"
