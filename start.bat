@echo off
chcp 65001
title 여행사 관리 시스템 시작

echo =================================================
echo  여행사 관리 시스템 시작 스크립트
echo =================================================
echo.
echo  이 스크립트를 실행하려면 Node.js와 npm이 설치되어 있어야 합니다.
echo.

REM --- 백엔드 설정 ---
echo [1/2] 백엔드 종속성을 설치합니다...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [오류] 백엔드 패키지 설치에 실패했습니다. npm이 올바르게 설치되었는지 확인하세요.
    pause
    exit /b
)
echo 백엔드 종속성 설치 완료.
echo.

echo [2/2] 백엔드 서버를 시작합니다...
start "Backend Server" node server.js
echo 백엔드 서버가 새 창에서 시작됩니다 (http://localhost:5000).
echo.

cd ..

echo =================================================
echo  모든 프로세스가 시작되었습니다.
echo =================================================
echo.
echo - 통합 서버 주소: http://localhost:5000
echo.
echo   종료하려면 새로 열린 'Backend Server' 창을 닫으세요.
echo.

pause
