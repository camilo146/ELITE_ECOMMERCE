#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# ELITE — PostgreSQL Backup Script
#
# Usage:
#   ./scripts/backup.sh                  # manual backup
#   Add to cron: 0 2 * * * /path/to/backup.sh  >> /var/log/elite-backup.log 2>&1
#
# Stores compressed backups in BACKUP_DIR.
# Sends alert to ALERT_EMAIL on failure.
# Uploads to S3 if AWS_S3_BUCKET is set.
# Retains backups for RETENTION_DAYS.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration (override via environment variables) ────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:?DB_NAME is required}"
DB_USER="${DB_USER:?DB_USER is required}"
PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"
export PGPASSWORD

BACKUP_DIR="${BACKUP_DIR:-/var/backups/elite}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
AWS_S3_BUCKET="${AWS_S3_BUCKET:-}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/elite_${TIMESTAMP}.sql.gz"
LOG_PREFIX="[BACKUP ${TIMESTAMP}]"

# ── Create backup directory ────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

echo "${LOG_PREFIX} Starting backup of ${DB_NAME}@${DB_HOST}:${DB_PORT}"

# ── Dump and compress ─────────────────────────────────────────────────────────
if pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --exclude-table=audit_logs \
    | gzip -9 > "${BACKUP_FILE}"; then

    SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
    echo "${LOG_PREFIX} Backup successful: ${BACKUP_FILE} (${SIZE})"
else
    echo "${LOG_PREFIX} ERROR: pg_dump failed!" >&2
    if [[ -n "${ALERT_EMAIL}" ]]; then
        echo "ELITE backup failed at ${TIMESTAMP}" | \
            mail -s "ALERT: Elite DB Backup Failed" "${ALERT_EMAIL}" || true
    fi
    exit 1
fi

# ── Upload to S3 (optional) ────────────────────────────────────────────────────
if [[ -n "${AWS_S3_BUCKET}" ]]; then
    if aws s3 cp "${BACKUP_FILE}" "s3://${AWS_S3_BUCKET}/backups/$(basename ${BACKUP_FILE})"; then
        echo "${LOG_PREFIX} Uploaded to s3://${AWS_S3_BUCKET}/backups/"
    else
        echo "${LOG_PREFIX} WARNING: S3 upload failed — local backup retained" >&2
    fi
fi

# ── Rotate old backups ─────────────────────────────────────────────────────────
DELETED=$(find "${BACKUP_DIR}" -name "elite_*.sql.gz" \
    -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
if [[ "${DELETED}" -gt 0 ]]; then
    echo "${LOG_PREFIX} Deleted ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

echo "${LOG_PREFIX} Done."
