#!/bin/bash
# Setup demo mode for screenshot

set -e

echo "=========================================="
echo "  Calboard Screenshot Demo Setup"
echo "=========================================="
echo ""

# Backup current config
if [ -f "config.json" ]; then
    echo "📦 Backing up config.json..."
    cp config.json config.backup.json
    echo "✓ Backup saved to config.backup.json"
else
    echo "ℹ️  No existing config.json found"
fi

# Create demo ICS file with sample events
echo ""
echo "📅 Creating demo calendar events..."
cat > public/demo.ics << 'EOF'
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Calboard Demo//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Demo Calendar
X-WR-TIMEZONE:America/Los_Angeles

BEGIN:VEVENT
UID:demo-meeting-1@calboard
DTSTART:20260120T140000
DTEND:20260120T150000
SUMMARY:Team Meeting
LOCATION:Conference Room A
DESCRIPTION:Weekly team sync and project updates
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-standup@calboard
DTSTART:20260120T100000
DTEND:20260120T101500
SUMMARY:Morning Standup
DESCRIPTION:Daily team standup meeting
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-presentation@calboard
DTSTART:20260121T130000
DTEND:20260121T143000
SUMMARY:Client Presentation
LOCATION:Zoom Meeting
DESCRIPTION:Q1 product demo for key client
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-review@calboard
DTSTART:20260121T160000
DTEND:20260121T170000
SUMMARY:Code Review Session
DESCRIPTION:Review pull requests and discuss architecture
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-planning@calboard
DTSTART:20260122T090000
DTEND:20260122T103000
SUMMARY:Product Planning
LOCATION:Main Office
DESCRIPTION:Sprint planning and roadmap discussion
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-design@calboard
DTSTART:20260122T140000
DTEND:20260122T150000
SUMMARY:Design Review
DESCRIPTION:Review new UI mockups
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-lunch@calboard
DTSTART:20260123T120000
DTEND:20260123T130000
SUMMARY:Team Lunch
LOCATION:Downtown Bistro
DESCRIPTION:Monthly team bonding lunch
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-birthday@calboard
DTSTART;VALUE=DATE:20260124
SUMMARY:🎂 Sarah's Birthday
DESCRIPTION:Remember to wish Sarah happy birthday!
STATUS:CONFIRMED
END:VEVENT

BEGIN:VEVENT
UID:demo-workshop@calboard
DTSTART:20260125T100000
DTEND:20260125T120000
SUMMARY:Workshop: Docker Basics
LOCATION:Training Room B
DESCRIPTION:Introduction to containerization
STATUS:CONFIRMED
END:VEVENT

END:VCALENDAR
EOF

echo "✓ Demo calendar created with 9 sample events"

# Copy demo config
echo ""
echo "⚙️  Setting up demo configuration..."
cp config.demo.json config.json

# Update calendar URL to point to local demo file
if command -v sed &> /dev/null; then
    # Mac/Linux compatible sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' 's|https://example.com/calendar.ics|http://localhost:3000/demo.ics|g' config.json
    else
        sed -i 's|https://example.com/calendar.ics|http://localhost:3000/demo.ics|g' config.json
    fi
    echo "✓ Demo config activated"
else
    echo "⚠️  Please manually update config.json calendar URL to: http://localhost:3000/demo.ics"
fi

echo ""
echo "=========================================="
echo "  ✅ Demo Mode Ready!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Start server:"
echo "     npm start"
echo "     (or: docker-compose up -d)"
echo ""
echo "  2. Open browser:"
echo "     http://localhost:3000"
echo ""
echo "  3. Take screenshot:"
echo "     - Press F11 for fullscreen"
echo "     - Windows: Win+Shift+S"
echo "     - Mac: Cmd+Shift+3"
echo "     - Linux: Use your screenshot tool"
echo ""
echo "  4. Save to: docs/preview.png"
echo ""
echo "  5. Cleanup when done:"
echo "     ./screenshot-cleanup.sh"
echo ""
echo "💡 Tip: The demo shows San Francisco weather"
echo "         and generic calendar events"
echo ""
