@echo off
REM Calboard Docker Build Script for Windows

echo ========================================
echo   Calboard Docker Build
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Check if docker-compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker Compose is not installed
    echo Please install Docker Desktop which includes Compose
    exit /b 1
)

echo Docker installed
echo Docker Compose installed
echo.

REM Build the image
echo Building Calboard Docker image...
docker-compose build

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Next steps:
echo   1. Start: docker-compose up -d
echo   2. View logs: docker-compose logs -f
echo   3. Open browser: http://localhost:3000
echo.

pause
