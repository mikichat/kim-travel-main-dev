#!/bin/bash
# ============================================================
# TourWorld Next-Gen Monorepo 시작 스크립트
# 사용법: ./start-next-gen.sh
# 중지:   ./start-next-gen.sh stop
# 상태:   ./start-next-gen.sh status
# 로그:   ./start-next-gen.sh logs
# ============================================================

# 이동到大항항 基告
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

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

# ── 포트 확인 함수 ──
is_port_in_use() {
  if command -v ss &>/dev/null; then
    ss -tlnp 2>/dev/null | grep -q ":$1"
  else
    lsof -i ":$1" -P 2>/dev/null | grep -q LISTEN
  fi
}

# ── 프로세스 중지 함수 ──
kill_port() {
  local port=$1
  if is_port_in_use "$port"; then
    local pid=$(ss -tlnp 2>/dev/null | grep ":$port" | grep -oP 'pid=\K[0-9]+' | head -1)
    [ -z "$pid" ] && pid=$(lsof -ti ":$port" 2>/dev/null | head -1)
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
    sleep 1
  fi
}

# ── 서버 시작 함수 ──
start_server() {
  local name=$1
  local port=$2
  local dir=$3
  local cmd=$4
  local log_file=$5

  # 포트 확인
  if is_port_in_use "$port"; then
    log_warn "$name (:$port) — 이미 실행 중"
    return 0
  fi

  # 디렉토리 확인
  if [ ! -d "$dir" ]; then
    log_error "$name — 디렉토리 없음: $dir"
    return 1
  fi

  # 서버 시작
  cd "$dir"
  nohup $cmd > "$log_file" 2>&1 &
  local pid=$!
  sleep 5

  # 시작 확인
  if is_port_in_use "$port"; then
    log_success "$name (:$port) — 시작 완료 (PID: $pid)"
    return 0
  else
    log_error "$name (:$port) — 시작 실패. 로그: $log_file"
    tail -5 "$log_file" 2>/dev/null
    return 1
  fi
}

# ── Gateway 시작 ──
start_gateway() {
  start_server "Gateway" 8080 "$PROJECT_ROOT/gateway" "npm run dev" "$LOG_DIR/gateway.log"
}

# ── Server 시작 ──
start_server_backend() {
  start_server "Express Server" 3001 "$PROJECT_ROOT/server" "npm run dev" "$LOG_DIR/server.log"
}

# ── Client 시작 ──
start_client() {
  start_server "Next.js Client" 3000 "$PROJECT_ROOT/client" "npm run dev" "$LOG_DIR/client.log"
}

# ── 중지 함수 ──
stop_all() {
  echo ""
  log_info "서버 중지 중..."

  kill_port 8080   # Gateway
  kill_port 3000   # Client
  kill_port 3001   # Server

  log_success "모든 서버가 중지되었습니다."
  echo ""
}

# ── 상태 확인 ──
check_status() {
  echo ""
  echo -e "${CYAN}📊 TourWorld Next-Gen 모노레포 상태${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local all_online=true

  if is_port_in_use 8080; then
    log_success "Gateway (8080) — Online"
  else
    log_error "Gateway (8080) — Offline"
    all_online=false
  fi

  if is_port_in_use 3001; then
    log_success "Express Server (3001) — Online"
  else
    log_error "Express Server (3001) — Offline"
    all_online=false
  fi

  if is_port_in_use 3000; then
    log_success "Next.js Client (3000) — Online"
  else
    log_error "Next.js Client (3000) — Offline"
    all_online=false
  fi

  echo ""
  if $all_online; then
    echo -e "  ${CYAN}🌐 Gateway:${NC}   http://localhost:8080"
    echo -e "  ${CYAN}📱 Client:${NC}    http://localhost:3000"
    echo -e "  ${CYAN}🔧 Server:${NC}    http://localhost:3001"
    echo -e "  ${CYAN}📋 Server API:${NC} http://localhost:3001/api/health"
    echo ""
    log_info "API 테스트: curl http://localhost:8080/api/health"
  else
    log_warn "일부 서버가 실행되지 않았습니다."
    log_info "로그 확인: ./start-next-gen.sh logs"
  fi
  echo ""
}

# ── 메인 로직 ──
case "${1:-start}" in
  start)
    echo ""
    echo -e "${CYAN}🚀 TourWorld Next-Gen 모노레포 시작${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 의존성 설치 (최상위)
    if [ ! -d "node_modules" ]; then
      log_info "의존성 설치 중..."
      npm install --silent 2>/dev/null
    fi

    # Gateway 설치 및 시작
    if [ ! -d "gateway/node_modules" ]; then
      log_info "Gateway 의존성 설치 중..."
      (cd "$PROJECT_ROOT/gateway" && npm install --silent 2>/dev/null)
    fi
    start_gateway

    # Server 설치 및 시작
    log_info "Server 의존성 설치 중..."
    (cd "$PROJECT_ROOT/server" && npm install --silent --legacy-peer-deps 2>/dev/null)
    npx prisma generate --cwd "$PROJECT_ROOT/server" 2>/dev/null
    start_server_backend

    # Client 설치 및 시작
    log_info "Client 의존성 설치 중..."
    (cd "$PROJECT_ROOT/client" && npm install --silent --legacy-peer-deps 2>/dev/null)
    # next symlink 복구 (workspaces에서 사라지는 문제 해결)
    (cd "$PROJECT_ROOT/client" && mkdir -p node_modules && rm -rf node_modules/next && ln -sf ../../node_modules/next node_modules/next)
    start_client

    echo ""
    check_status
    ;;

  stop)
    stop_all
    ;;

  status)
    check_status
    ;;

  restart)
    stop_all
    sleep 2
    $0 start
    ;;

  logs)
    echo ""
    echo -e "${CYAN}📋 서버 로그${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    for service in gateway server client; do
      if [ -f "$LOG_DIR/${service}.log" ]; then
        echo -e "${YELLOW}--- ${service}.log (최근 20줄) ---${NC}"
        tail -20 "$LOG_DIR/${service}.log" 2>/dev/null
        echo ""
      fi
    done
    ;;

  *)
    echo "사용법: $0 {start|stop|status|restart|logs}"
    echo ""
    echo "  start   — 모든 서버 시작 (기본값)"
    echo "  stop    — 모든 서버 중지"
    echo "  status  — 서버 상태 확인"
    echo "  restart — 모든 서버 재시작"
    echo "  logs    — 로그 확인"
    echo ""
    echo "  포트 구성:"
    echo "    Gateway (8080) → Server (3001) → Client (3000)"
    echo ""
    ;;
esac
