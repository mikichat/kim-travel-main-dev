@echo off
chcp 65001 >nul 2>&1

REM ============================================================
REM TourWorld Next-Gen Monorepo start script (Windows)
REM Usage: start-next-gen.bat
REM Stop:   start-next-gen.bat stop
REM Status: start-next-gen.bat status
REM ============================================================

setlocal enabledelayedexpansion

set LOG_DIR=%TEMP%\tourworld-monorepo
mkdir %LOG_DIR% 2>nul

set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

:start
    echo.
    echo [INFO] TourWorld Next-Gen monorepo starting...
    echo.

    echo [INFO] Cleaning up existing processes...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul 2>&1

    netstat -ano 2>nul | findstr ":3000" 2>nul | findstr "LISTENING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [WARN] Port 3000 is already in use.
        echo [INFO] Run 'start-next-gen.bat stop' to stop existing processes.
        goto :end
    )

    if not exist "node_modules" (
        echo [INFO] Installing dependencies...
        call npm install
    ) else (
        echo [INFO] Checking dependencies...
        call npm install --silent
    )

    echo [INFO] Syncing database...
    call npm run db:push

    echo [INFO] Starting server...
    start /B cmd /c "npm run dev > \"%LOG_DIR%\monorepo.log\" 2>&1"
    timeout /t 5 /nobreak >nul 2>&1

    netstat -ano 2>nul | findstr ":3000" 2>nul | findstr "LISTENING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo.
        echo [OK] TourWorld Next-Gen monorepo started!
        echo.
        echo   Next.js Frontend: http://localhost:3000
        echo   Express Backend:  http://localhost:3000/api
        echo   Log file:        %LOG_DIR%\monorepo.log
        echo.
    ) else (
        echo [ERROR] Server failed to start. Cleaning up processes...
        taskkill /F /IM node.exe >nul 2>&1
        echo [INFO] Check log: type %LOG_DIR%\monorepo.log
        goto :end
    )
    goto :end

:stop
    echo.
    echo [INFO] Stopping TourWorld Next-Gen monorepo...
    echo.

    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 1 /nobreak >nul 2>&1

    netstat -ano 2>nul | findstr ":3000" 2>nul | findstr "LISTENING" >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
            taskkill /F /PID %%a >nul 2>&1
        )
    )

    echo [OK] All servers stopped.
    echo.
    goto :end

:status
    echo.
    echo TourWorld Next-Gen Monorepo Status
    echo ==============================================

    netstat -ano 2>nul | findstr ":3000" 2>nul | findstr "LISTENING" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Next.js Frontend (:3000) - Online
        echo [OK] Express Backend (:3000) - Online
        echo.
        echo [INFO] Access: http://localhost:3000
    ) else (
        echo [ERROR] Server is offline.
        echo.
        echo [INFO] Run 'start-next-gen.bat' to start.
    )
    echo.
    goto :end

:logs
    echo [INFO] Log file: %LOG_DIR%\monorepo.log
    if exist "%LOG_DIR%\monorepo.log" (
        powershell -c "Get-Content '%LOG_DIR%\monorepo.log' -Tail 50"
    ) else (
        echo Log file does not exist.
    )
    goto :end

:restart
    call :stop
    timeout /t 2 /nobreak >nul 2>&1
    call :start
    goto :end

:end
    endlocal
