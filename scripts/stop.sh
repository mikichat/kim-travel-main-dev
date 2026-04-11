#!/bin/bash
# @TASK INFRA - 모든 서비스 중지
echo "모든 서비스 중지..."
pkill -f "node.*backend/server" 2>/dev/null
pkill -f "tsx.*air-booking" 2>/dev/null
pkill -f "ts-node-dev.*landing" 2>/dev/null
pkill -f "tsx.*gateway" 2>/dev/null
echo "완료"
