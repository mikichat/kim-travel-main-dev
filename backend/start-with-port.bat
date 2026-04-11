@echo off
chcp 65001
title 인보이스 시스템 서버 시작 (포트 설정)

echo ========================================
echo 인보이스 시스템 서버 시작
echo ========================================
echo.

cd /d %~dp0

REM 포트 번호 입력 받기
set /p PORT_NUM="사용할 포트 번호를 입력하세요 (기본값: 5000): "

if "%PORT_NUM%"=="" set PORT_NUM=5000

echo.
echo 포트 %PORT_NUM%로 서버를 시작합니다...
echo.

REM 환경 변수 설정 및 서버 시작
set PORT=%PORT_NUM%
node server.js

pause
