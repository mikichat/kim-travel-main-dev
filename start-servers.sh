#!/bin/bash
# 여행세상 내부 서버 시작 스크립트
# 사용법: bash /Volumes/Crucial\ X8/backup-2026-03-29/main/start-servers.sh

EXT="/Volumes/Crucial X8/backup-2026-03-29/main"

echo "========================================="
echo "  여행세상 내부 서버 시작"
echo "  $(date '+%Y-%m-%d %H:%M')"
echo "========================================="

# 외장하드 dot_clean
dot_clean "$EXT" 2>/dev/null

# 1. 포털 (:8080)
echo "[1/5] 포털 시작 (:8080)..."
cd "$EXT" && nohup npx http-server -p 8080 -a 0.0.0.0 --cors -c-1 > /tmp/portal-server.log 2>&1 &

# 2. Main Backend (:5001)
echo "[2/5] Main Backend 시작 (:5001)..."
cd "$EXT/backend" && PORT=5001 nohup node server.js > /tmp/main-backend.log 2>&1 &

# 3. Landing Server (:5505)
echo "[3/5] Landing Server 시작 (:5505)..."
cd "$EXT/tourworld1/landing/server" && nohup npx ts-node-dev --respawn --transpile-only src/index.ts > /tmp/landing-server.log 2>&1 &

# 4. Landing Client (:4005)
echo "[4/5] Landing Client 시작 (:4005)..."
cd "$EXT/tourworld1/landing/client" && nohup npx vite --host 0.0.0.0 > /tmp/landing-client.log 2>&1 &

# 5. Air Booking Server (:5510)
echo "[5/5] Air Booking 시작 (:5510 + :5174)..."
cd "$EXT/air-booking/server" && nohup npx tsx src/index.ts > /tmp/air-booking-server.log 2>&1 &
cd "$EXT/air-booking/client" && nohup npx vite --host 0.0.0.0 > /tmp/air-booking-client.log 2>&1 &

sleep 3

# IP 확인
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo ""
echo "========================================="
echo "  모든 서버 시작 완료!"
echo "  포털: http://$IP:8080/portal.html"
echo "========================================="
