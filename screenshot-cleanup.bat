@echo off
REM Cleanup demo mode after screenshot (Windows)

echo ==========================================
echo   Calboard Screenshot Demo Cleanup
echo ==========================================
echo.

REM Remove demo ICS file
if exist public\demo.ics (
    echo Removing demo calendar...
    del public\demo.ics
    echo Demo calendar removed
)

REM Restore original config
if exist config.backup.json (
    echo.
    echo Restoring original config...
    copy config.backup.json config.json >nul
    del config.backup.json
    echo Original config restored
) else (
    echo.
    echo No backup found, keeping current config
)

echo.
echo ==========================================
echo   Cleanup Complete!
echo ==========================================
echo.
echo Your original configuration has been restored.
echo.
echo Don't forget to:
echo   1. Restart server if it's running
echo   2. Commit the new screenshot:
echo      git add docs\preview.png
echo      git commit -m "Update preview screenshot with demo data"
echo      git push
echo.

pause
