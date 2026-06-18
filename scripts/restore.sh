#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# ELITE — Database Restore Script
#
# Usage:
#   ./scripts/restore.sh /path/to/elite_20260617_020000.sql.gz
#
# CAUTION: This will DROP and recreate the database.
# Run only during a maintenance window. Announce downtime first.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_FILE="${1:?Usage: restore.sh <backup-file.sql.gz>}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
    echo "ERROR: File not found: ${BACKUP_FILE}" >&2
    exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
DB_USER="${DB_USER:?DB_USER is required}"
PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
export PGPASSWORD

echo "======================================================"
echo "  ELITE DATABASE RESTORE"
echo "  File:     ${BACKUP_FILE}"
echo "  Target:   ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "  WARNING:  This will DESTROY all current data!"
echo "======================================================"
read -rp "Type 'RESTORE' to confirm: " CONFIRM

if [[ "${CONFIRM}" != "RESTORE" ]]; then
    echo "Aborted."
    exit 0
fi

echo "[RESTORE] Dropping existing database..."
dropdb --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USER}" \
       --if-exists "${DB_NAME}"

echo "[RESTORE] Creating empty database..."
createdb --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USER}" \
         "${DB_NAME}"

echo "[RESTORE] Restoring from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --quiet

echo "[RESTORE] Restore complete. Verify the application before resuming traffic."
echo "[RESTORE] Run Flyway repair if migration checksums are out of sync:"
echo "          flyway -url=jdbc:postgresql://${DB_HOST}/${DB_NAME} repair"
