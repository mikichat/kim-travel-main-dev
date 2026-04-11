@echo off
chcp 65001 > nul
echo ==========================================
echo 과거 일정 조회 (최근 30일)
echo ==========================================
echo.

cd backend

sqlite3 travel_agency.db "SELECT group_name, event_date, location, schedule FROM schedules WHERE date(event_date) < date('now') AND date(event_date) >= date('now', '-30 days') ORDER BY event_date DESC;"

echo.
echo ==========================================
echo 조회 완료!
echo ==========================================
pause
