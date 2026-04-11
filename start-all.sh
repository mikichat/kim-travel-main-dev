#!/bin/bash
# ============================================================
# 여행세상 전체 서버 시작 스크립트
# 사용법: ./start-all.sh
# 중지:   ./start-all.sh stop
# 상태:   ./start-all.sh status
# ============================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOG_DIR="/tmp/travel-servers"
mkdir -p "$LOG_DIR"

# 외장하드 경로
EXT_DRIVE="/Volumes/Crucial X8/backup-2026-03-29/main"

# ── 서버 목록 ──
# [이름]|[포트]|[디렉토리]|[시작 명령어]
SERVERS=(
  "Portal|8080|${EXT_DRIVE}|npx http-server -p 8080 -c-1"
  "TourWorld-Main|5001|/Users/kimgukjin/projects/main/backend|node server.js"
  "Landing-Server|5505|${EXT_DRIVE}/tourworld1/landing/server|npx ts-node-dev src/index.ts"
  "Landing-Client|4005|${EXT_DRIVE}/tourworld1/landing/client|npx vite --host 0.0.0.0"
  "AirBooking-Server|5510|/Users/kimgukjin/projects/main/air-booking/server|npx tsx src/index.ts"
  "AirBooking-Client|5174|/Users/kimgukjin/projects/main/air-booking/client|npx vite --host 0.0.0.0"
)

start_server() {
  local name="$1" port="$2" dir="$3" cmd="$4"
  
  # 이미 실행 중인지 확인
  if lsof -i ":$port" -P 2>/dev/null | grep -q LISTEN; then
    echo -e "  ${YELLOW}⏭  $name (:$port) — 이미 실행 중${NC}"
    return 0
  fi

  # 디렉토리 존재 확인
  if [ ! -d "$dir" ]; then
    echo -e "  ${RED}❌ $name — 디렉토리 없음: $dir${NC}"
    return 1
  fi

  # 서버 시작
  cd "$dir" && nohup $cmd > "$LOG_DIR/$name.log" 2>&1 &
  local pid=$!
  sleep 2

  # 시작 확인
  if lsof -i ":$port" -P 2>/dev/null | grep -q LISTEN; then
    echo -e "  ${GREEN}✅ $name (:$port) — 시작 완료 (PID: $pid)${NC}"
  else
    echo -e "  ${RED}❌ $name (:$port) — 시작 실패. 로그: $LOG_DIR/$name.log${NC}"
    tail -3 "$LOG_DIR/$name.log" 2>/dev/null
  fi
}

stop_server() {
  local name="$1" port="$2"
  local pid=$(lsof -i ":$port" -P 2>/dev/null | grep LISTEN | awk '{print $2}' | head -1)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null
    echo -e "  ${YELLOW}⏹  $name (:$port) — 중지 (PID: $pid)${NC}"
  else
    echo -e "  ${NC}   $name (:$port) — 실행 중 아님${NC}"
  fi
}

check_status() {
  local name="$1" port="$2"
  if lsof -i ":$port" -P 2>/dev/null | grep -q LISTEN; then
    echo -e "  ${GREEN}✅ $name (:$port) — Online${NC}"
  else
    echo -e "  ${RED}❌ $name (:$port) — Offline${NC}"
  fi
}

case "${1:-start}" in
  start)
    echo ""
    echo "🚀 여행세상 서버 전체 시작"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 외장하드 확인
    if [ ! -d "$EXT_DRIVE" ]; then
      echo -e "${RED}❌ 외장하드 미연결: $EXT_DRIVE${NC}"
      echo "   외장하드를 연결한 후 다시 실행하세요."
      exit 1
    fi
    
    for entry in "${SERVERS[@]}"; do
      IFS='|' read -r name port dir cmd <<< "$entry"
      start_server "$name" "$port" "$dir" "$cmd"
    done
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 포털: http://192.168.0.15:8080/portal.html"
    echo "📝 로그: $LOG_DIR/"
    echo ""
    ;;
    
  stop)
    echo ""
    echo "⏹  여행세상 서버 전체 중지"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    for entry in "${SERVERS[@]}"; do
      IFS='|' read -r name port dir cmd <<< "$entry"
      stop_server "$name" "$port"
    done
    echo ""
    ;;
    
  status)
    echo ""
    echo "📊 여행세상 서버 상태"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    for entry in "${SERVERS[@]}"; do
      IFS='|' read -r name port dir cmd <<< "$entry"
      check_status "$name" "$port"
    done
    echo ""
    ;;
    
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
    
  *)
    echo "사용법: $0 {start|stop|status|restart}"
    ;;
esac
