@echo off
REM Setup demo mode for screenshot (Windows)

echo ==========================================
echo   Calboard Screenshot Demo Setup
echo ==========================================
echo.

REM Backup current config
if exist config.json (
    echo Backing up config.json...
    copy config.json config.backup.json >nul
    echo Backup saved to config.backup.json
) else (
    echo No existing config.json found
)

REM Create demo ICS file
echo.
echo Creating demo calendar events...
(
echo BEGIN:VCALENDAR
echo VERSION:2.0
echo PRODID:-//Calboard Demo//EN
echo CALSCALE:GREGORIAN
echo METHOD:PUBLISH
echo X-WR-CALNAME:Demo Calendar
echo X-WR-TIMEZONE:America/Los_Angeles
echo.
echo BEGIN:VEVENT
echo UID:demo-meeting-1@calboard
echo DTSTART:20260120T140000
echo DTEND:20260120T150000
echo SUMMARY:Team Meeting
echo LOCATION:Conference Room A
echo DESCRIPTION:Weekly team sync and project updates
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-standup@calboard
echo DTSTART:20260120T100000
echo DTEND:20260120T101500
echo SUMMARY:Morning Standup
echo DESCRIPTION:Daily team standup meeting
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-presentation@calboard
echo DTSTART:20260121T130000
echo DTEND:20260121T143000
echo SUMMARY:Client Presentation
echo LOCATION:Zoom Meeting
echo DESCRIPTION:Q1 product demo for key client
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-review@calboard
echo DTSTART:20260121T160000
echo DTEND:20260121T170000
echo SUMMARY:Code Review Session
echo DESCRIPTION:Review pull requests and discuss architecture
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-planning@calboard
echo DTSTART:20260122T090000
echo DTEND:20260122T103000
echo SUMMARY:Product Planning
echo LOCATION:Main Office
echo DESCRIPTION:Sprint planning and roadmap discussion
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-design@calboard
echo DTSTART:20260122T140000
echo DTEND:20260122T150000
echo SUMMARY:Design Review
echo DESCRIPTION:Review new UI mockups
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-lunch@calboard
echo DTSTART:20260123T120000
echo DTEND:20260123T130000
echo SUMMARY:Team Lunch
echo LOCATION:Downtown Bistro
echo DESCRIPTION:Monthly team bonding lunch
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-birthday@calboard
echo DTSTART;VALUE=DATE:20260124
echo SUMMARY:Sarah's Birthday
echo DESCRIPTION:Remember to wish Sarah happy birthday!
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo BEGIN:VEVENT
echo UID:demo-workshop@calboard
echo DTSTART:20260125T100000
echo DTEND:20260125T120000
echo SUMMARY:Workshop: Docker Basics
echo LOCATION:Training Room B
echo DESCRIPTION:Introduction to containerization
echo STATUS:CONFIRMED
echo END:VEVENT
echo.
echo END:VCALENDAR
) > public\demo.ics

echo Demo calendar created with 9 sample events

REM Copy demo config
echo.
echo Setting up demo configuration...
copy config.demo.json config.json >nul
echo Demo config activated

echo.
echo Please manually update config.json:
echo   Change calendar URL to: http://localhost:3000/demo.ics
echo.

echo ==========================================
echo   Demo Mode Ready!
echo ==========================================
echo.
echo Next steps:
echo   1. Update calendar URL in config.json
echo   2. Start server: npm start
echo   3. Open browser: http://localhost:3000
echo   4. Take screenshot (Win+Shift+S)
echo   5. Save to: docs\preview.png
echo   6. Cleanup: screenshot-cleanup.bat
echo.

pause
