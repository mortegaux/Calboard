const express = require('express');
const fetch = require('node-fetch');
const ICAL = require('ical.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const bcrypt = require('bcrypt');
const validator = require('validator');

const app = express();

// ============================================
// Configuration Management
// ============================================

let config;
const CONFIG_PATH = './config.json';
const BCRYPT_ROUNDS = 12;

// Default configuration for first launch
const DEFAULT_CONFIG = {
  weather: {
    apiKey: '',
    latitude: 0,
    longitude: 0,
    units: 'imperial'
  },
  calendars: [],
  display: {
    daysToShow: 7,
    refreshIntervalMinutes: 5,
    backgroundImage: null,
    dateFormat: 'en-US',
    timeFormat: '12h'
  },
  server: {
    port: 3000
  },
  admin: {
    password: null
  },
  setupComplete: false
};

function loadConfig() {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return true;
  } catch (err) {
    // Create default config if it doesn't exist
    console.log('No config.json found, creating default configuration...');
    config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    return true;
  }
}

function saveConfig(newConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    config = newConfig;
    return true;
  } catch (err) {
    console.error('Error saving config.json:', err.message);
    return false;
  }
}

function isSetupComplete() {
  // Check if setup has been completed
  if (config.setupComplete === true) return true;

  // Legacy check: if weather API key is set, consider setup complete
  if (config.weather?.apiKey && config.weather.apiKey.length > 10) {
    return true;
  }

  return false;
}

// Initial load
loadConfig();

const PORT = config.server?.port || 3000;

// ============================================
// Security Middleware
// ============================================

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "https://openweathermap.org", "data:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Allow loading weather icons
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));

// Rate limiting - General API
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting - Login attempts (stricter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting - Admin actions
const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Generate session secret if not exists
function getSessionSecret() {
  if (config.server?.sessionSecret) {
    return config.server.sessionSecret;
  }
  // Generate and save a new secret
  const secret = crypto.randomBytes(64).toString('hex');
  if (!config.server) config.server = {};
  config.server.sessionSecret = secret;
  saveConfig(config);
  return secret;
}

// Session middleware
app.use(session({
  secret: getSessionSecret(),
  name: 'calboard.sid', // Custom session name (not default 'connect.sid')
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS access to cookie
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

// Body parsing with size limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Serve static files with security headers
app.use(express.static('public', {
  dotfiles: 'ignore',
  index: false // We'll handle index routing manually
}));

// ============================================
// Setup Wizard Routes
// ============================================

// Redirect to setup wizard if not configured
app.get('/', (req, res, next) => {
  if (!isSetupComplete()) {
    return res.redirect('/setup');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Setup page
app.get('/setup', (req, res) => {
  // If already configured, redirect to dashboard
  if (isSetupComplete()) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'setup.html'));
});

// Check setup status
app.get('/api/setup/status', (req, res) => {
  res.json({
    setupComplete: isSetupComplete(),
    hasApiKey: !!(config.weather?.apiKey),
    hasCalendars: config.calendars?.length > 0
  });
});

// Test weather API during setup (no auth required)
app.post('/api/setup/test-weather', async (req, res) => {
  try {
    const { apiKey, latitude, longitude } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ success: false, error: 'API key is required' });
    }

    if (!validateLatitude(latitude)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude' });
    }

    if (!validateLongitude(longitude)) {
      return res.status(400).json({ success: false, error: 'Invalid longitude' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();

    if (data.cod && data.cod !== 200) {
      throw new Error(data.message || 'Weather API error');
    }

    res.json({
      success: true,
      location: data.name,
      country: data.sys?.country
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Test calendar URL during setup (no auth required)
app.post('/api/setup/test-calendar', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    if (!validateUrl(url)) {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }

    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const icsData = await response.text();
    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    res.json({
      success: true,
      eventCount: vevents.length
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Complete setup
app.post('/api/setup/complete', async (req, res) => {
  try {
    // Don't allow re-setup if already configured (unless via admin)
    if (isSetupComplete()) {
      return res.status(403).json({ success: false, error: 'Setup already complete. Use /admin to modify settings.' });
    }

    const newConfig = req.body;

    // Validate required fields
    if (!newConfig.weather?.apiKey) {
      return res.status(400).json({ success: false, error: 'Weather API key is required' });
    }

    if (!validateLatitude(newConfig.weather?.latitude)) {
      return res.status(400).json({ success: false, error: 'Invalid latitude' });
    }

    if (!validateLongitude(newConfig.weather?.longitude)) {
      return res.status(400).json({ success: false, error: 'Invalid longitude' });
    }

    // Validate calendars
    if (newConfig.calendars) {
      for (const cal of newConfig.calendars) {
        if (cal.url && !validateUrl(cal.url)) {
          return res.status(400).json({ success: false, error: `Invalid URL for calendar: ${cal.name}` });
        }
      }
    }

    // Hash password if provided
    if (newConfig.admin?.password) {
      if (newConfig.admin.password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      }
      newConfig.admin.passwordHash = await hashPassword(newConfig.admin.password);
      delete newConfig.admin.password;
    }

    // Preserve session secret if it exists
    if (config.server?.sessionSecret) {
      newConfig.server.sessionSecret = config.server.sessionSecret;
    }

    // Mark setup as complete
    newConfig.setupComplete = true;

    if (saveConfig(newConfig)) {
      res.json({ success: true, message: 'Setup complete!' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save configuration' });
    }
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ success: false, error: 'Setup failed' });
  }
});

// ============================================
// Input Validation Helpers
// ============================================

function validateUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true
  });
}

function validateLatitude(lat) {
  const num = parseFloat(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
}

function validateLongitude(lon) {
  const num = parseFloat(lon);
  return !isNaN(num) && num >= -180 && num <= 180;
}

function validateColor(color) {
  if (!color || typeof color !== 'string') return false;
  // Allow hex colors, rgb, rgba, and named colors
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color) ||
         /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/.test(color) ||
         /^[a-zA-Z]+$/.test(color);
}

function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== 'string') return '';
  return validator.escape(str.slice(0, maxLength));
}

// ============================================
// Password Hashing Utilities
// ============================================

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  // Handle legacy plain-text passwords (migrate on first login)
  if (!hash.startsWith('$2')) {
    // Legacy plain-text password - verify and schedule migration
    return password === hash;
  }
  return bcrypt.compare(password, hash);
}

async function migratePasswordIfNeeded(password) {
  const currentHash = config.admin?.passwordHash || config.admin?.password;

  // If using plain-text password, migrate to bcrypt
  if (currentHash && !currentHash.startsWith('$2')) {
    const newHash = await hashPassword(password);
    config.admin.passwordHash = newHash;
    delete config.admin.password; // Remove plain-text
    saveConfig(config);
    console.log('Admin password migrated to bcrypt hash');
  }
}

// ============================================
// Authentication Middleware
// ============================================

async function adminAuth(req, res, next) {
  // Check if user has valid session
  if (req.session?.isAdmin) {
    return next();
  }

  const passwordHash = config.admin?.passwordHash || config.admin?.password;

  // If no password is set, allow access (for initial setup)
  if (!passwordHash) {
    return next();
  }

  return res.status(401).json({
    error: 'Authentication required',
    needsAuth: true
  });
}

// ============================================
// Public API Routes
// ============================================

// Check if admin requires auth
app.get('/api/admin/auth-required', (req, res) => {
  res.json({
    required: !!(config.admin?.passwordHash || config.admin?.password),
    configured: !!config.weather?.apiKey,
    isAuthenticated: !!req.session?.isAdmin
  });
});

// Login endpoint
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const storedHash = config.admin?.passwordHash || config.admin?.password;

    if (!storedHash) {
      // No password set, create session
      req.session.isAdmin = true;
      return res.json({ success: true });
    }

    const isValid = await verifyPassword(password, storedHash);

    if (isValid) {
      // Migrate plain-text password to bcrypt if needed
      await migratePasswordIfNeeded(password);

      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ error: 'Authentication failed' });
        }
        req.session.isAdmin = true;
        res.json({ success: true });
      });
    } else {
      // Delay response to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      res.status(403).json({ error: 'Invalid password' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Logout endpoint
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('calboard.sid');
    res.json({ success: true });
  });
});

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { apiKey, latitude, longitude, units } = config.weather || {};

    if (!apiKey) {
      return res.status(503).json({ error: 'Weather not configured' });
    }

    // Get current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${units}&appid=${apiKey}`;
    const currentResponse = await fetch(currentUrl);
    const currentData = await currentResponse.json();

    if (currentData.cod && currentData.cod !== 200) {
      throw new Error(currentData.message || 'Weather API error');
    }

    // Get forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=${units}&appid=${apiKey}`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();

    if (forecastData.cod && forecastData.cod !== '200') {
      throw new Error(forecastData.message || 'Forecast API error');
    }

    // Process forecast to get daily highs/lows
    const dailyForecast = processForecast(forecastData.list);

    res.json({
      current: {
        temp: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        windSpeed: Math.round(currentData.wind.speed),
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        iconCode: currentData.weather[0].id,
        sunrise: currentData.sys.sunrise * 1000,
        sunset: currentData.sys.sunset * 1000
      },
      forecast: dailyForecast,
      units: units
    });
  } catch (err) {
    console.error('Weather API error:', err);
    res.status(500).json({ error: 'Weather data unavailable' });
  }
});

// Process forecast data into daily summaries
function processForecast(forecastList) {
  const daily = {};

  forecastList.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split('T')[0];

    if (!daily[dayKey]) {
      daily[dayKey] = {
        date: dayKey,
        temps: [],
        icons: [],
        iconCodes: [],
        pop: []
      };
    }

    daily[dayKey].temps.push(item.main.temp);
    daily[dayKey].icons.push(item.weather[0].icon);
    daily[dayKey].iconCodes.push(item.weather[0].id);
    daily[dayKey].pop.push(item.pop || 0);
  });

  return Object.values(daily).map(day => ({
    date: day.date,
    high: Math.round(Math.max(...day.temps)),
    low: Math.round(Math.min(...day.temps)),
    icon: getMostFrequent(day.icons),
    iconCode: getMostFrequent(day.iconCodes),
    pop: Math.round(Math.max(...day.pop) * 100)
  })).slice(0, 5);
}

function getMostFrequent(arr) {
  const counts = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

// Calendar API endpoint
app.get('/api/calendars', async (req, res) => {
  try {
    const events = [];
    const daysToShow = config.display?.daysToShow || 7;

    if (!config.calendars || config.calendars.length === 0) {
      return res.json({ events: [], daysToShow });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysToShow);

    const calendarPromises = config.calendars.map(async (cal) => {
      try {
        if (!validateUrl(cal.url)) {
          console.error(`Invalid calendar URL for ${cal.name}`);
          return [];
        }
        const response = await fetch(cal.url);
        const icsData = await response.text();
        const calEvents = parseICS(icsData, cal.name, cal.color, now, endDate);
        return calEvents;
      } catch (err) {
        console.error(`Error fetching calendar ${cal.name}:`, err.message);
        return [];
      }
    });

    const results = await Promise.all(calendarPromises);
    results.forEach(calEvents => events.push(...calEvents));

    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    const grouped = groupEventsByDay(events);

    res.json({
      events: grouped,
      daysToShow: daysToShow
    });
  } catch (err) {
    console.error('Calendar API error:', err);
    res.status(500).json({ error: 'Calendar data unavailable' });
  }
});

// Parse ICS data
function parseICS(icsData, calendarName, color, startDate, endDate) {
  const events = [];

  try {
    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    vevents.forEach(vevent => {
      const event = new ICAL.Event(vevent);

      if (event.isRecurring()) {
        const iterator = event.iterator();
        let next;
        let count = 0;
        const maxOccurrences = 100;

        while ((next = iterator.next()) && count < maxOccurrences) {
          count++;
          const occurrenceStart = next.toJSDate();

          if (occurrenceStart > endDate) break;
          if (occurrenceStart < startDate) continue;

          const duration = event.duration;
          const occurrenceEnd = new Date(occurrenceStart.getTime() +
            (duration ? duration.toSeconds() * 1000 : 0));

          events.push(createEventObject(event, occurrenceStart, occurrenceEnd, calendarName, color));
        }
      } else {
        const eventStart = event.startDate.toJSDate();
        const eventEnd = event.endDate ? event.endDate.toJSDate() : eventStart;

        if (eventStart <= endDate && eventEnd >= startDate) {
          events.push(createEventObject(event, eventStart, eventEnd, calendarName, color));
        }
      }
    });
  } catch (err) {
    console.error('Error parsing ICS:', err.message);
  }

  return events;
}

function createEventObject(event, start, end, calendarName, color) {
  const isAllDay = event.startDate.isDate;

  return {
    id: event.uid + '_' + start.getTime(),
    title: sanitizeString(event.summary || 'Untitled Event', 200),
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: isAllDay,
    calendar: sanitizeString(calendarName, 100),
    color: validateColor(color) ? color : '#4CAF50',
    location: event.location ? sanitizeString(event.location, 200) : null,
    description: null // Don't expose descriptions for privacy
  };
}

function groupEventsByDay(events) {
  const grouped = {};

  events.forEach(event => {
    const date = new Date(event.start);
    const dayKey = date.toISOString().split('T')[0];

    if (!grouped[dayKey]) {
      grouped[dayKey] = {
        date: dayKey,
        events: []
      };
    }

    grouped[dayKey].events.push(event);
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

// Config endpoint (only non-sensitive data)
app.get('/api/config', (req, res) => {
  res.json({
    display: config.display,
    calendarCount: config.calendars?.length || 0,
    calendarNames: (config.calendars || []).map(c => ({
      name: sanitizeString(c.name, 100),
      color: validateColor(c.color) ? c.color : '#4CAF50'
    }))
  });
});

// ============================================
// Admin API Endpoints (Protected)
// ============================================

// Get full configuration
app.get('/api/admin/config', adminLimiter, adminAuth, (req, res) => {
  const safeConfig = JSON.parse(JSON.stringify(config));

  // Mask sensitive data
  if (safeConfig.admin?.passwordHash) {
    safeConfig.admin.passwordHash = '********';
  }
  if (safeConfig.admin?.password) {
    safeConfig.admin.password = '********';
  }
  if (safeConfig.server?.sessionSecret) {
    delete safeConfig.server.sessionSecret;
  }

  res.json(safeConfig);
});

// Save configuration
app.put('/api/admin/config', adminLimiter, adminAuth, async (req, res) => {
  try {
    const newConfig = req.body;

    // Validate required structure
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    // Ensure required sections exist
    if (!newConfig.weather || !newConfig.display || !newConfig.server) {
      return res.status(400).json({ error: 'Missing required configuration sections' });
    }

    // Validate weather config
    if (newConfig.weather.latitude !== undefined && !validateLatitude(newConfig.weather.latitude)) {
      return res.status(400).json({ error: 'Invalid latitude' });
    }
    if (newConfig.weather.longitude !== undefined && !validateLongitude(newConfig.weather.longitude)) {
      return res.status(400).json({ error: 'Invalid longitude' });
    }
    if (newConfig.weather.units && !['imperial', 'metric'].includes(newConfig.weather.units)) {
      return res.status(400).json({ error: 'Invalid units' });
    }

    // Validate calendars
    if (newConfig.calendars) {
      if (!Array.isArray(newConfig.calendars)) {
        return res.status(400).json({ error: 'Calendars must be an array' });
      }
      for (const cal of newConfig.calendars) {
        if (cal.url && !validateUrl(cal.url)) {
          return res.status(400).json({ error: `Invalid URL for calendar: ${cal.name}` });
        }
        if (cal.color && !validateColor(cal.color)) {
          cal.color = '#4CAF50'; // Default to green if invalid
        }
      }
    }

    // Validate display config
    const display = newConfig.display;
    if (display.daysToShow !== undefined) {
      const days = parseInt(display.daysToShow);
      if (isNaN(days) || days < 1 || days > 30) {
        return res.status(400).json({ error: 'Days to show must be between 1 and 30' });
      }
      display.daysToShow = days;
    }
    if (display.refreshIntervalMinutes !== undefined) {
      const interval = parseInt(display.refreshIntervalMinutes);
      if (isNaN(interval) || interval < 1 || interval > 60) {
        return res.status(400).json({ error: 'Refresh interval must be between 1 and 60 minutes' });
      }
      display.refreshIntervalMinutes = interval;
    }

    // Handle password changes
    if (newConfig.admin) {
      const newPassword = newConfig.admin.password;

      if (newPassword && newPassword !== '********') {
        // Validate password strength
        if (newPassword.length < 8) {
          return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        // Hash new password
        newConfig.admin.passwordHash = await hashPassword(newPassword);
        delete newConfig.admin.password;
      } else {
        // Keep existing password hash
        newConfig.admin.passwordHash = config.admin?.passwordHash;
        delete newConfig.admin.password;
      }
    }

    // Preserve session secret
    if (config.server?.sessionSecret) {
      newConfig.server.sessionSecret = config.server.sessionSecret;
    }

    // Validate port
    if (newConfig.server.port !== undefined) {
      const port = parseInt(newConfig.server.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port number' });
      }
      newConfig.server.port = port;
    }

    if (saveConfig(newConfig)) {
      res.json({ success: true, message: 'Configuration saved' });
    } else {
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  } catch (err) {
    console.error('Config save error:', err);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Test calendar URL
app.post('/api/admin/test-calendar', adminLimiter, adminAuth, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!validateUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const response = await fetch(url, {
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const icsData = await response.text();

    const jcalData = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    res.json({
      success: true,
      eventCount: vevents.length,
      message: `Successfully parsed calendar with ${vevents.length} events`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Test weather API
app.post('/api/admin/test-weather', adminLimiter, adminAuth, async (req, res) => {
  try {
    const { apiKey, latitude, longitude } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required' });
    }

    if (!validateLatitude(latitude)) {
      return res.status(400).json({ error: 'Invalid latitude' });
    }

    if (!validateLongitude(longitude)) {
      return res.status(400).json({ error: 'Invalid longitude' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
    const response = await fetch(url, {
      timeout: 10000
    });
    const data = await response.json();

    if (data.cod && data.cod !== 200) {
      throw new Error(data.message || 'Weather API error');
    }

    res.json({
      success: true,
      location: data.name,
      country: data.sys?.country,
      message: `Successfully connected. Location: ${data.name}, ${data.sys?.country}`
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// Reload configuration
app.post('/api/admin/reload', adminLimiter, adminAuth, (req, res) => {
  if (loadConfig()) {
    res.json({ success: true, message: 'Configuration reloaded' });
  } else {
    res.status(500).json({ error: 'Failed to reload configuration' });
  }
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Calboard server running at http://localhost:${PORT}`);
  console.log(`Access from other devices: http://<your-pi-ip>:${PORT}`);
  console.log('');

  if (!isSetupComplete()) {
    console.log('*** FIRST RUN - Setup wizard available at /setup ***');
    console.log('');
  }

  console.log('Security features enabled:');
  console.log('  - Helmet security headers');
  console.log('  - Rate limiting on API endpoints');
  console.log('  - Session-based authentication');
  console.log('  - Bcrypt password hashing');
  console.log('  - Input validation');
});
