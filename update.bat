@echo off
REM Calboard Docker Update Script for Windows

echo ========================================
echo   Calboard Update
echo ========================================
echo.

REM Backup config before update
if exist config.json (
    set BACKUP_FILE=config.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.json
    set BACKUP_FILE=%BACKUP_FILE: =0%
    echo Backing up config.json to %BACKUP_FILE%
    copy config.json %BACKUP_FILE% >nul
    echo Backup created
    echo.
)

REM Pull latest changes if in git repo
if exist .git (
    echo Pulling latest changes...
    git pull
    echo Code updated
    echo.
)

REM Stop current container
echo Stopping current container...
docker-compose down

REM Rebuild image
echo Rebuilding Docker image...
docker-compose build --no-cache

REM Start new container
echo Starting updated container...
docker-compose up -d

REM Wait for container to start
echo.
echo Waiting for Calboard to start...
timeout /t 5 /nobreak >nul

REM Check if running
docker-compose ps | find "Up" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ========================================
    echo   Update Failed
    echo ========================================
    echo.
    echo Check logs with: docker-compose logs
    echo.
    if defined BACKUP_FILE (
        echo Restoring config from backup...
        copy %BACKUP_FILE% config.json >nul
        echo Config restored. Try running: docker-compose up -d
    )
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Update Complete!
echo ========================================
echo.
echo Calboard is running at: http://localhost:3000
echo.
echo To view logs: docker-compose logs -f
echo.

pause
