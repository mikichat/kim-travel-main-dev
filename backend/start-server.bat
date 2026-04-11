@echo off
echo ========================================
echo 인보이스 시스템 서버 시작
echo ========================================
echo.

cd /d %~dp0

echo 현재 디렉토리: %CD%
echo.

echo Node.js 버전 확인...
node --version
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo Node.js를 설치해주세요: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo 서버를 시작합니다...
echo 브라우저에서 http://localhost:5000/invoice 로 접근하세요.
echo.
echo 서버를 중지하려면 Ctrl+C를 누르세요.
echo.

node server.js

pause
