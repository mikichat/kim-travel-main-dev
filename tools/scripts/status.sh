#!/bin/bash
# @TASK INFRA - 서비스 상태 확인
echo "=========================================="
echo "  여행세상 서비스 상태"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

check_service() {
  local name=$1
  local url=$2
  local result=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
  if [ "$result" = "200" ]; then
    echo "  [OK] $name -> $url"
  else
    echo "  [FAIL] $name -> $url (HTTP $result)"
  fi
}

check_service "GATEWAY     " "http://localhost:8080/api/health"
check_service "MAIN        " "http://localhost:5000/api/health"
check_service "AIR-BOOKING " "http://localhost:5510/api/health"
check_service "LANDING     " "http://localhost:5505/api/health"

echo ""
echo "  통합 진입점: http://localhost:8080"
echo "=========================================="
