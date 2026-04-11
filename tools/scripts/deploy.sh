#!/bin/bash
# @TASK INFRA - 여행세상 통합 배포 스크립트
# 사용법: bash scripts/deploy.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "=========================================="
echo "  여행세상 업무 시스템 배포"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# 1. Git pull (최신 코드)
echo ""
echo "[1/6] 최신 코드 가져오기..."
cd "$ROOT"
git pull origin main 2>/dev/null || echo "  (git pull 스킵)"

# 2. Install dependencies
echo ""
echo "[2/6] 의존성 설치..."
cd "$ROOT/backend" && npm install --production 2>/dev/null
cd "$ROOT/air-booking/server" && npm install --production 2>/dev/null
cd "$ROOT/air-booking/client" && npm install && npm run build 2>/dev/null
cd "$ROOT/tourworld1/landing/server" && npm install --production 2>/dev/null
cd "$ROOT/tourworld1/landing/client" && npm install && npm run build 2>/dev/null
cd "$ROOT/gateway" && npm install --production 2>/dev/null
echo "  완료"

# 3. Build clients
echo ""
echo "[3/6] 프론트엔드 빌드..."
cd "$ROOT/air-booking/client" && npm run build 2>/dev/null && echo "  air-booking 빌드 완료"
cd "$ROOT/tourworld1/landing/client" && npm run build 2>/dev/null && echo "  landing 빌드 완료"
# Portal build if exists
if [ -d "$ROOT/gateway/portal" ]; then
  cd "$ROOT/gateway/portal" && npm install && npm run build 2>/dev/null && echo "  portal 빌드 완료"
fi

# 4. Database migration
echo ""
echo "[4/6] DB 마이그레이션..."
cd "$ROOT/tourworld1/landing/server" && npx prisma db push 2>/dev/null && echo "  Prisma 완료"

# 5. Stop existing services
echo ""
echo "[5/6] 기존 서비스 중지..."
pkill -f "node.*backend/server" 2>/dev/null || true
pkill -f "tsx.*air-booking" 2>/dev/null || true
pkill -f "ts-node-dev.*landing" 2>/dev/null || true
pkill -f "tsx.*gateway" 2>/dev/null || true
sleep 2
echo "  중지 완료"

# 6. Start services
echo ""
echo "[6/6] 서비스 시작..."
cd "$ROOT/backend" && node server.js &
echo "  MAIN        → :5000"
cd "$ROOT/air-booking/server" && npx tsx src/index.ts &
echo "  AIR-BOOKING → :5510"
cd "$ROOT/tourworld1/landing/server" && npm run start &
echo "  LANDING     → :5505"
cd "$ROOT/gateway" && npx tsx src/index.ts &
echo "  GATEWAY     → :8080"

echo ""
echo "=========================================="
echo "  배포 완료! $(date '+%H:%M:%S')"
echo ""
echo "  통합 진입점: http://localhost:8080"
echo "  Admin: admin@tourworld.com / admin1234"
echo "=========================================="
