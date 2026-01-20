# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Calboard is a calendar and weather dashboard designed for any display. It's a single-server Node.js application that fetches ICS calendars and weather data, then serves a web interface for display in kiosk mode.

## Development Commands

### Basic Commands
- `npm install` - Install dependencies
- `npm start` - Start the server (production)
- `npm run dev` - Start the server (development, same as start)

### Testing External APIs
The application provides test endpoints during setup:
- POST `/api/setup/test-weather` - Test OpenWeatherMap API connection
- POST `/api/setup/test-calendar` - Test ICS calendar URL validity

### Running in Fullscreen Mode
The server runs on port 3000 by default (configurable in `config.json`). For kiosk/fullscreen mode:
```bash
# Linux
chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000

# Windows
chrome.exe --kiosk http://localhost:3000

# Mac
open -a "Google Chrome" --args --kiosk http://localhost:3000
```

## Architecture

### Single-Server Architecture
The entire application runs in a single `server.js` file (~3800+ lines). This is intentional for simplicity and ease of deployment on any device or server.

**Key architectural components:**

1. **Configuration Management** (lines 18-415)
   - Config stored in `config.json` (created from `config.example.json`)
   - Extensive default configuration with 14 phases of widgets
   - Auto-migration of plain text passwords to bcrypt hashes
   - First-run setup wizard if no config exists

2. **Security Layer** (lines 417-597)
   - Helmet.js for security headers (CSP, HSTS, etc.)
   - Three-tier rate limiting:
     - API: 60 requests/minute
     - Login: 5 attempts/15 minutes
     - Admin: 20 requests/minute
   - Optional IP whitelist middleware
   - Session-based authentication with bcrypt password hashing
   - HTTPS support (optional, for reverse proxy setups)

3. **Setup Wizard Flow** (lines 598-753)
   - Auto-redirect from `/` to `/setup` on first run
   - Multi-step wizard: Weather → Location → Calendars → Display → Security
   - Validation endpoints for testing before saving configuration

4. **Admin Panel** (lines 755-1293)
   - Web-based configuration at `/admin`
   - Session-based authentication (24-hour sessions)
   - QR code generation for mobile access
   - Live testing of calendar/weather APIs before saving

5. **Core Data APIs** (lines 913-1260)
   - `/api/weather` - Fetches OpenWeatherMap data (current + 4-day forecast)
   - `/api/calendars` - Fetches and parses all ICS calendar feeds
   - `/api/config` - Returns sanitized config (removes sensitive data)

6. **Widget System** (lines 1295-3448)
   - 40+ widgets organized in 14 phases:
     - Phase 1: Information (news, quotes, word of day)
     - Phase 2: Environment (moon phase, tides, pollen, UV)
     - Phase 3: Productivity (tasks, grocery lists, chores, medications)
     - Phase 4: Transportation (traffic, transit, flights, gas prices)
     - Phase 5: Finance (stocks, crypto)
     - Phase 6: Sports & Entertainment (sports scores, Spotify, TV schedule)
     - Phase 7: Media (photos, photo frame)
     - Phase 8: Smart Home (Home Assistant integration)
     - Phase 9: Social (message board, shared lists, family profiles)
     - Phase 10: Advanced (system stats)
     - Phase 11: Time (world clocks, event countdowns, Pomodoro)
     - Phase 12: Health (habit tracker, water intake, sleep schedule)
     - Phase 13: Daily Content (recipes, affirmations, horoscope, trivia)
     - Phase 14: Home Management (garbage day, meal planning, pet care, plant care, laundry)
   - Each widget has its own `/api/widgets/{name}` endpoint
   - Widget state managed in config.json

### Frontend Structure (public/)

The frontend is vanilla JavaScript with no build process:

- `index.html` - Main dashboard interface
- `app.js` - Dashboard logic (weather, calendar rendering, auto-refresh)
- `styles.css` - Dashboard styling (dark theme optimized for displays)
- `setup.html` / `setup.js` / `setup.css` - Setup wizard interface
- `admin.html` / `admin.js` / `admin.css` - Admin panel interface
- `sw.js` - Service worker for offline caching
- `backgrounds/` - Custom background images

**Frontend features:**
- Auto-refresh every N minutes (configurable)
- Double-click for fullscreen kiosk mode with hidden cursor
- Service worker for offline resilience
- Screen wake lock API to prevent display sleep
- Responsive design for different screen sizes

### Configuration Schema

The `config.json` has five main sections:

1. **weather** - OpenWeatherMap API settings (key, lat/lon, units)
2. **calendars** - Array of ICS feeds with name/url/color
3. **display** - UI preferences (days to show, refresh interval, backgrounds, time format)
4. **server** - Port and security settings (IP whitelist, rate limiting, HTTPS)
5. **admin** - Bcrypt-hashed password (null = no auth required)
6. **features** - Global feature flags (screen wake lock, offline mode, voice, etc.)
7. **widgets** - Configuration for all 40+ widgets organized by phase

### Data Flow

**Weather Updates:**
1. Frontend calls `/api/weather` every refresh interval
2. Server fetches from OpenWeatherMap API (One Call 3.0)
3. Returns current weather + 4-day forecast
4. Frontend renders temperature, conditions, forecast cards

**Calendar Updates:**
1. Frontend calls `/api/calendars` every refresh interval
2. Server fetches all ICS URLs from config in parallel
3. Uses `ical.js` library to parse recurring events
4. Returns unified event list sorted by date
5. Frontend renders color-coded events by calendar

**Configuration Updates:**
1. Admin panel sends PUT to `/api/admin/config`
2. Server validates, saves to `config.json`, updates in-memory config
3. Dashboard automatically picks up changes on next refresh

## Key Dependencies

- `express` - Web server framework
- `ical.js` - ICS calendar parsing with recurrence support
- `node-fetch@2` - HTTP requests (v2 for CommonJS compatibility)
- `bcrypt` - Password hashing (12 rounds)
- `helmet` - Security headers middleware
- `express-rate-limit` - Rate limiting middleware
- `express-session` - Session management
- `validator` - Input validation and sanitization
- `rss-parser` - RSS feed parsing for news widget

## Security Considerations

**Authentication:**
- Admin panel uses session-based auth with bcrypt-hashed passwords
- Sessions stored in memory (not persistent across restarts)
- 24-hour session timeout
- Rate limiting on login attempts (5 per 15 minutes)

**Network Security:**
- Optional IP whitelist for admin endpoints
- HTTPS support via config (requires cert/key paths)
- Helmet.js security headers (CSP, HSTS, X-Frame-Options)
- Request body size limited to 100KB

**API Keys:**
- OpenWeatherMap API key stored in config.json
- Config endpoint strips sensitive data (API keys, passwords) before sending to frontend
- Admin endpoints require authentication to view/modify sensitive config

**Deployment Notes:**
- Designed for local network use (home or office network)
- For internet exposure, use reverse proxy (Nginx) with SSL
- Set admin password immediately after first setup
- Keep Node.js and npm packages updated (`npm audit`)

## Common Development Patterns

### Adding a New Widget

1. Add widget config to `DEFAULT_CONFIG.widgets` section in server.js
2. Create API endpoint: `app.get('/api/widgets/name', (req, res) => { ... })`
3. Add widget rendering logic to `public/app.js`
4. Add widget configuration UI to `public/admin.html` and `admin.js`
5. Add widget styles to `public/styles.css`

### Adding a New Calendar Source

Calendars must provide ICS format URLs. The application:
- Fetches via HTTP/HTTPS
- Parses with ical.js library
- Expands recurring events automatically
- No OAuth required (uses public/secret ICS URLs)

### Modifying Configuration Schema

If adding new config fields:
1. Update `DEFAULT_CONFIG` constant
2. Update validation in config save endpoint
3. Update admin panel UI to expose new fields
4. Document in README.md configuration section

## Important Files

- `server.js` - Entire backend (do not split without good reason)
- `config.json` - Runtime configuration (git-ignored, created from example)
- `config.example.json` - Template with documentation
- `public/app.js` - Main dashboard frontend logic
- `public/index.html` - Dashboard UI
- `public/admin.js` - Admin panel logic
- `README.md` - User-facing documentation

## Design Philosophy

**Simplicity:** Single-file server for easy deployment and maintenance on any device.

**No Build Process:** Frontend uses vanilla JavaScript, no bundlers or transpilers.

**Offline First:** Service worker caches assets, works without internet after first load.

**Kiosk Optimized:** Dark theme, large text, auto-refresh, fullscreen mode, hidden cursor support.

**Progressive Enhancement:** Core features (clock, weather, calendar) work first; widgets are optional add-ons.
