#!/usr/bin/env bash
# Verify a backup by restoring it into a throwaway database and comparing the
# row-count manifest captured by backup.sh. Production data is never modified.
set -euo pipefail

DUMP="${1:-}"
COUNTS="${2:-}"
if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 /path/db.dump [/path/counts-*.csv]" >&2
  exit 1
fi

PG_CONTAINER="${PG_CONTAINER:-unlinked-plus-postgres-1}"
DB_USER="${DB_USER:-unlinked}"
CHECK_DB="unlinked_restore_check_$(date -u +%s)"

cleanup() {
  docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS \"$CHECK_DB\" WITH (FORCE)" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[verify] restoring into throwaway DB $CHECK_DB"
TARGET_DB="$CHECK_DB" CONFIRM_RESTORE=yes "$(dirname "$0")/restore.sh" "$DUMP" >/dev/null

if [[ -n "$COUNTS" && -f "$COUNTS" ]]; then
  docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$CHECK_DB" -t -A -F, \
    -c "select 'users',count(*) from users union all select 'posts',count(*) from posts union all select 'comments',count(*) from comments union all select 'transactions',count(*) from transactions union all select 'certificates',count(*) from certificates order by 1;" \
    > /tmp/unlinked-restored-counts.csv
  if ! diff -u "$COUNTS" /tmp/unlinked-restored-counts.csv; then
    echo "VERIFY=FAIL (row counts differ)" >&2
    exit 1
  fi
  rm -f /tmp/unlinked-restored-counts.csv
fi

echo "VERIFY=PASS"
