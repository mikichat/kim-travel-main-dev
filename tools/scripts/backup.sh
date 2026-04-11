#!/bin/bash
# @TASK INFRA - 일일 백업 스크립트
# crontab: 0 2 * * * bash /path/to/scripts/backup.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$ROOT/backups/$(date '+%Y-%m-%d')"
mkdir -p "$BACKUP_DIR"

echo "[백업] $(date '+%Y-%m-%d %H:%M:%S')"

# DB 백업
cp "$ROOT/backend/travel_agency.db" "$BACKUP_DIR/travel_agency.db" 2>/dev/null && echo "  travel_agency.db OK"
cp "$ROOT/air-booking/server/data/air-booking.db" "$BACKUP_DIR/air-booking.db" 2>/dev/null && echo "  air-booking.db OK"
cp "$ROOT/gateway/data/gateway.db" "$BACKUP_DIR/gateway.db" 2>/dev/null && echo "  gateway.db OK"

# Landing Prisma DB
LANDING_DB=$(find "$ROOT/tourworld1/landing/server" -name "*.db" -not -path "*/node_modules/*" 2>/dev/null | head -1)
if [ -n "$LANDING_DB" ]; then
  cp "$LANDING_DB" "$BACKUP_DIR/landing.db" && echo "  landing.db OK"
fi

# 7일 이전 백업 삭제
find "$ROOT/backups" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
echo "[백업] 완료 → $BACKUP_DIR"
