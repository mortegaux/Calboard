# Demo Screenshot Guide

This guide explains how to create a professional screenshot/thumbnail for Calboard with demo data instead of real personal information.

## Quick Method (Recommended)

### Step 1: Backup Current Config

```bash
cp config.json config.backup.json
```

### Step 2: Use Demo Config

```bash
cp config.demo.json config.json
```

### Step 3: Add Demo Calendar Events

Since we can't use real calendar URLs, we'll need to manually add some demo events to showcase the calendar. You have two options:

**Option A: Use a Demo ICS URL**

Create a simple demo.ics file in the public folder:

```bash
cat > public/demo.ics << 'EOF'
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Calboard//Demo//EN
BEGIN:VEVENT
UID:demo1@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260120T140000
DTEND:20260120T150000
SUMMARY:Team Meeting
LOCATION:Conference Room A
END:VEVENT
BEGIN:VEVENT
UID:demo2@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260120T100000
DTEND:20260120T110000
SUMMARY:Morning Standup
END:VEVENT
BEGIN:VEVENT
UID:demo3@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260121T130000
DTEND:20260121T143000
SUMMARY:Client Presentation
LOCATION:Zoom
END:VEVENT
BEGIN:VEVENT
UID:demo4@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260121T160000
DTEND:20260121T170000
SUMMARY:Code Review Session
END:VEVENT
BEGIN:VEVENT
UID:demo5@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260122T090000
DTEND:20260122T100000
SUMMARY:Product Planning
LOCATION:Office
END:VEVENT
BEGIN:VEVENT
UID:demo6@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260123T110000
DTEND:20260123T120000
SUMMARY:Design Review
END:VEVENT
BEGIN:VEVENT
UID:demo7@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260124T000000
DTEND:20260124T235959
SUMMARY:🎂 Team Member Birthday
END:VEVENT
END:VCALENDAR
EOF
```

Then update config.json to point to this local demo file:

```json
"calendars": [
  {
    "name": "Demo Calendar",
    "url": "http://localhost:3000/demo.ics",
    "color": "#4CAF50"
  }
]
```

**Option B: Create Static Demo Page**

I'll create a static HTML demo page for you that looks exactly like Calboard but with demo data.

### Step 4: Restart Server

```bash
# If using npm
npm start

# If using Docker
docker-compose restart
```

### Step 5: Take Screenshot

1. Open browser to `http://localhost:3000`
2. Wait for page to fully load
3. Press F11 for fullscreen (optional but recommended)
4. Take screenshot:
   - **Windows**: Windows + Shift + S, then select full screen
   - **Mac**: Command + Shift + 3
   - **Linux**: Use your screenshot tool (Spectacle, gnome-screenshot, etc.)

**Recommended Screenshot Settings:**
- Resolution: 1920x1080 (Full HD)
- Format: PNG
- Browser: Chrome/Chromium (most consistent rendering)
- Zoom: 100%

### Step 6: Optimize Screenshot

```bash
# If you have ImageMagick installed
convert screenshot.png -resize 1920x1080 -quality 85 docs/preview.png

# Or use online tools:
# - TinyPNG (https://tinypng.com)
# - Squoosh (https://squoosh.app)
```

### Step 7: Restore Original Config

```bash
cp config.backup.json config.json
docker-compose restart
# or
npm start
```

## Alternative: Browser DevTools Method

If you want to mock the data without changing config files:

### Step 1: Open Calboard

Navigate to `http://localhost:3000`

### Step 2: Open DevTools

Press F12 (or Cmd+Option+I on Mac)

### Step 3: Mock API Responses

Go to the **Network** tab, right-click on `/api/weather` or `/api/calendars`, and use "Override content" to provide demo responses.

**Demo Weather Response:**

```json
{
  "current": {
    "temp": 72,
    "feels_like": 70,
    "humidity": 65,
    "pressure": 1013,
    "wind_speed": 8,
    "wind_deg": 180,
    "clouds": 20,
    "uvi": 5,
    "visibility": 10000,
    "weather": [
      {
        "id": 800,
        "main": "Clear",
        "description": "clear sky",
        "icon": "01d"
      }
    ]
  },
  "daily": [
    {
      "dt": 1642521600,
      "temp": { "min": 58, "max": 75 },
      "weather": [{ "id": 800, "main": "Clear", "icon": "01d" }]
    },
    {
      "dt": 1642608000,
      "temp": { "min": 60, "max": 78 },
      "weather": [{ "id": 801, "main": "Clouds", "icon": "02d" }]
    },
    {
      "dt": 1642694400,
      "temp": { "min": 62, "max": 80 },
      "weather": [{ "id": 500, "main": "Rain", "icon": "10d" }]
    },
    {
      "dt": 1642780800,
      "temp": { "min": 59, "max": 73 },
      "weather": [{ "id": 802, "main": "Clouds", "icon": "03d" }]
    }
  ]
}
```

**Demo Calendar Response:**

```json
{
  "events": [
    {
      "date": "2026-01-20",
      "events": [
        {
          "title": "Team Meeting",
          "start": "2026-01-20T14:00:00",
          "end": "2026-01-20T15:00:00",
          "location": "Conference Room A",
          "allDay": false,
          "color": "#4CAF50",
          "calendar": "Work"
        },
        {
          "title": "Morning Standup",
          "start": "2026-01-20T10:00:00",
          "end": "2026-01-20T10:15:00",
          "allDay": false,
          "color": "#2196F3",
          "calendar": "Work"
        }
      ]
    },
    {
      "date": "2026-01-21",
      "events": [
        {
          "title": "Client Presentation",
          "start": "2026-01-21T13:00:00",
          "end": "2026-01-21T14:30:00",
          "location": "Zoom",
          "allDay": false,
          "color": "#4CAF50",
          "calendar": "Work"
        }
      ]
    }
  ]
}
```

## Tips for a Great Screenshot

1. **Choose the Right Time**
   - Set your system time to show a nice hour (like 2:00 PM or 10:30 AM)
   - Avoid midnight or very early morning times

2. **Demo Data Guidelines**
   - Use generic event names (Team Meeting, Client Call, etc.)
   - Include a mix of event types (meetings, appointments, birthdays)
   - Show 3-5 events across 2-3 days
   - Enable 2-3 widgets to showcase features

3. **Visual Polish**
   - Clean browser (no bookmarks bar, extensions visible)
   - Hide mouse cursor
   - Full screen (F11) for immersive view
   - Make sure weather shows nice conditions (partly cloudy at 72°F looks great)

4. **Widget Showcase**
   - Enable Moon Phase widget (always looks good)
   - Enable News widget with BBC feed
   - Enable Quotes widget
   - Keep it simple - don't overcrowd

5. **Avoid**
   - Real personal information (names, addresses, emails)
   - Real calendar events
   - Actual API keys visible
   - Too many widgets (looks cluttered)

## Screenshot Checklist

- [ ] Personal information removed/replaced with demo data
- [ ] Weather showing nice conditions
- [ ] Calendar has 3-5 demo events
- [ ] 2-3 widgets enabled
- [ ] Time shows reasonable hour
- [ ] Clean browser window
- [ ] Full resolution (1920x1080)
- [ ] Optimized file size (<200KB)
- [ ] Saved to `docs/preview.png`

## Quick Script (All-in-One)

Save this as `screenshot-demo.sh`:

```bash
#!/bin/bash
echo "Setting up demo mode..."

# Backup
cp config.json config.backup.json

# Create demo ICS
cat > public/demo.ics << 'EOF'
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Calboard//Demo//EN
BEGIN:VEVENT
UID:demo1@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260120T140000
DTEND:20260120T150000
SUMMARY:Team Meeting
LOCATION:Conference Room A
END:VEVENT
BEGIN:VEVENT
UID:demo2@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260121T130000
DTEND:20260121T143000
SUMMARY:Client Presentation
LOCATION:Zoom
END:VEVENT
BEGIN:VEVENT
UID:demo3@calboard
DTSTAMP:20260120T120000Z
DTSTART:20260122T090000
DTEND:20260122T100000
SUMMARY:Product Planning
END:VEVENT
END:VCALENDAR
EOF

# Use demo config
cp config.demo.json config.json

# Update calendar URL to local demo
sed -i 's|https://example.com/calendar.ics|http://localhost:3000/demo.ics|' config.json

echo "Demo mode ready!"
echo "1. Start server: npm start"
echo "2. Open http://localhost:3000"
echo "3. Take screenshot"
echo "4. Run cleanup: ./screenshot-cleanup.sh"
```

Save cleanup as `screenshot-cleanup.sh`:

```bash
#!/bin/bash
echo "Cleaning up demo mode..."
rm -f public/demo.ics
cp config.backup.json config.json
echo "Restored original config"
```

Make them executable:
```bash
chmod +x screenshot-demo.sh screenshot-cleanup.sh
```

Then run:
```bash
./screenshot-demo.sh
npm start
# Take screenshot
./screenshot-cleanup.sh
```

---

**Note:** The demo config file (`config.demo.json`) is already created with safe demo values. You just need to add calendar events and take the screenshot!
