#!/bin/bash
# ============================================================
# TourWorld Next-Gen Monorepo 시작 스크립트
# 사용법: ./start-next-gen.sh
# 중지:   ./start-next-gen.sh stop
# 상태:   ./start-next-gen.sh status
# ============================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

LOG_DIR="/tmp/tourworld-monorepo"
mkdir -p "$LOG_DIR"

# ── 색상 출력 함수 ──
log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# ── 서버 목록 ──
SERVERS=(
  "Express|3000|server"
  "Next.js|3001|client"
)

start_monorepo() {
  log_info "TourWorld Next-Gen 모노레포 시작..."

  cd "$(dirname "$0")"

  # 기존 프로세스 정리
  log_info "기존 프로세스 정리 중..."
  pkill -9 -f "next\|ts-node\|concurrently" 2>/dev/null
  sleep 2

  # 포트 확인
  if ss -tlnp 2>/dev/null | grep -q ":3000"; then
    log_warn "포트 3000이 이미 사용 중입니다."
    log_info "기존 프로세스를 중지하려면 './start-next-gen.sh stop' 을 실행하세요."
    return 1
  fi

  if ss -tlnp 2>/dev/null | grep -q ":3001"; then
    log_warn "포트 3001이 이미 사용 중입니다."
    log_info "기존 프로세스를 중지하려면 './start-next-gen.sh stop' 을 실행하세요."
    return 1
  fi

  # 의존성 설치 확인 및 설치
  if [ ! -d "node_modules" ]; then
    log_info "의존성 설치 중..."
    npm install
  else
    log_info "의존성 확인 중..."
    npm install --silent 2>/dev/null
  fi

  # DB 푸시
  log_info "데이터베이스 동기화 중..."
  npm run db:push

  # 모노레포 시작
  log_info "서버 시작 중..."
  nohup npm run dev > "$LOG_DIR/monorepo.log" 2>&1 &
  local pid=$!
  sleep 5

  # 상태 확인
  if ss -tlnp 2>/dev/null | grep -q ":3000" && ss -tlnp 2>/dev/null | grep -q ":3001"; then
    echo ""
    log_success "TourWorld Next-Gen 모노레포 시작 완료!"
    echo ""
    echo -e "  ${CYAN}🔧 Express Backend:${NC}  http://localhost:3000"
    echo -e "  ${CYAN}📱 Next.js Frontend:${NC} http://localhost:3001"
    echo -e "  ${CYAN}📋 로그 파일:${NC}          $LOG_DIR/monorepo.log"
    echo ""
    log_info "PID: $pid"
  else
    log_error "서버 시작에 실패했습니다. 프로세스를 정리합니다..."
    pkill -9 -f "next\|ts-node\|concurrently" 2>/dev/null
    log_info "로그 확인: tail -f $LOG_DIR/monorepo.log"
    return 1
  fi
}

stop_monorepo() {
  echo ""
  log_info "TourWorld Next-Gen 모노레포 중지..."

  # npm run dev 프로세스 중지
  pkill -f "next dev" 2>/dev/null
  pkill -f "ts-node-dev" 2>/dev/null
  pkill -f "concurrently" 2>/dev/null

  sleep 1

  if ss -tlnp 2>/dev/null | grep -q ":3000"; then
    local pid=$(ss -tlnp 2>/dev/null | grep ":3000" | grep -oP 'pid=\K[0-9]+' | head -1)
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
  fi

  if ss -tlnp 2>/dev/null | grep -q ":3001"; then
    local pid=$(ss -tlnp 2>/dev/null | grep ":3001" | grep -oP 'pid=\K[0-9]+' | head -1)
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
  fi

  log_success "모든 서버가 중지되었습니다."
  echo ""
}

check_status() {
  echo ""
  echo -e "${CYAN}📊 TourWorld Next-Gen 모노레포 상태${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if ss -tlnp 2>/dev/null | grep -q ":3000" && ss -tlnp 2>/dev/null | grep -q ":3001"; then
    log_success "Express Backend (:3000) — Online"
    log_success "Next.js Frontend (:3001) — Online"
    echo ""
    log_info "Express:  http://localhost:3000"
    log_info "Next.js:  http://localhost:3001"
  elif ss -tlnp 2>/dev/null | grep -q ":3000"; then
    log_success "Express Backend (:3000) — Online"
    log_error "Next.js Frontend (:3001) — Offline"
    echo ""
    log_info "Next.js 서버가 실행되지 않았습니다."
  elif ss -tlnp 2>/dev/null | grep -q ":3001"; then
    log_error "Express Backend (:3000) — Offline"
    log_success "Next.js Frontend (:3001) — Online"
    echo ""
    log_info "Express 서버가 실행되지 않았습니다."
  else
    log_error "모든 서버가オフ라인 상태입니다."
    echo ""
    log_info "시작하려면 './start-next-gen.sh start' 를 실행하세요."
  fi
  echo ""
}

case "${1:-start}" in
  start)
    start_monorepo
    ;;

  stop)
    stop_monorepo
    ;;

  status)
    check_status
    ;;

  restart)
    stop_monorepo
    sleep 2
    start_monorepo
    ;;

  logs)
    log_info "로그 파일: $LOG_DIR/monorepo.log"
    tail -50 "$LOG_DIR/monorepo.log"
    ;;

  *)
    echo "사용법: $0 {start|stop|status|restart|logs}"
    echo ""
    echo "  start   — 모노레포 시작 (기본값)"
    echo "  stop    — 모노레포 중지"
    echo "  status  — 서버 상태 확인"
    echo "  restart — 모노레포 재시작"
    echo "  logs    — 로그 확인"
    echo ""
    ;;
esac
