@echo off
echo ========================================
echo 여행사 계약 관리 시스템 통합 테스트
echo ========================================
echo.

echo [1/3] Python 의존성 설치 중...
cd api
pip install -r requirements.txt
if errorlevel 1 (
    echo 의존성 설치 실패!
    pause
    exit /b 1
)
echo.

echo [2/3] 백엔드 서버 시작 중...
start "Travel Agency API" cmd /k "python main.py"
echo 서버가 시작되었습니다. 5초 대기 중...
timeout /t 5 /nobreak
echo.

echo [3/3] 브라우저에서 프론트엔드 열기...
start http://localhost:8000/pages/group_list.html
start http://localhost:8000/docs
echo.

echo ========================================
echo 테스트 준비 완료!
echo ========================================
echo.
echo 다음 URL에 접속하여 테스트하세요:
echo.
echo 1. 프론트엔드: http://localhost:8000/pages/group_list.html
echo 2. API 문서: http://localhost:8000/docs
echo 3. 헬스 체크: http://localhost:8000/health
echo.
echo 자동화된 테스트를 실행하려면:
echo   cd tests
echo   python integration_test.py
echo.
echo 서버를 종료하려면 API 서버 창을 닫으세요.
echo.
pause
