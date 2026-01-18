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
const RSSParser = require('rss-parser');

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
    units: 'imperial',
    showAlerts: true,
    showAirQuality: true,
    showUvIndex: true,
    showMoonPhase: true,
    showPollenForecast: false,
    additionalLocations: []
  },
  calendars: [],
  display: {
    daysToShow: 7,
    refreshIntervalMinutes: 5,
    backgroundImage: null,
    backgroundSlideshow: false,
    backgroundImages: [],
    slideshowInterval: 30,
    dateFormat: 'en-US',
    timeFormat: '12h',
    theme: 'dark',
    customCSS: '',
    showEventDuration: true,
    showEventCountdown: true,
    showTodayBadge: true,
    calendarView: 'list',
    hiddenCalendars: [],
    layout: 'default',
    screensaverEnabled: true,
    screensaverStart: '22:00',
    screensaverEnd: '07:00',
    screensaverDimLevel: 20
  },
  server: {
    port: 3000
  },
  admin: {
    password: null
  },
  features: {
    screenWakeLock: true,
    offlineMode: true,
    birthdayRecognition: true,
    voiceAnnouncements: false,
    touchGestures: true,
    multiPage: true
  },
  // Phase 1: Information Widgets
  widgets: {
    news: {
      enabled: false,
      feeds: [],
      maxItems: 5,
      refreshMinutes: 30
    },
    quotes: {
      enabled: true,
      category: 'inspirational',
      refreshHours: 24
    },
    wordOfDay: {
      enabled: false
    },
    jokeOfDay: {
      enabled: false
    },
    onThisDay: {
      enabled: false
    },
    // Phase 2: Environment
    moonPhase: {
      enabled: true
    },
    tides: {
      enabled: false,
      stationId: ''
    },
    pollen: {
      enabled: false
    },
    uvIndex: {
      enabled: true
    },
    // Phase 3: Productivity
    tasks: {
      enabled: false,
      provider: 'local',
      todoistApiKey: '',
      lists: []
    },
    groceryList: {
      enabled: false,
      items: []
    },
    chores: {
      enabled: false,
      members: [],
      tasks: []
    },
    packages: {
      enabled: false,
      trackingNumbers: []
    },
    medications: {
      enabled: false,
      reminders: []
    },
    // Phase 4: Transportation
    traffic: {
      enabled: false,
      googleMapsApiKey: '',
      routes: []
    },
    transit: {
      enabled: false,
      stops: []
    },
    flights: {
      enabled: false,
      tracking: []
    },
    gasPrices: {
      enabled: false,
      zipCode: ''
    },
    // Phase 5: Finance
    stocks: {
      enabled: false,
      symbols: [],
      apiKey: ''
    },
    crypto: {
      enabled: false,
      coins: ['bitcoin', 'ethereum']
    },
    // Phase 6: Sports & Entertainment
    sports: {
      enabled: false,
      teams: [],
      leagues: []
    },
    spotify: {
      enabled: false,
      clientId: '',
      clientSecret: '',
      refreshToken: ''
    },
    tvSchedule: {
      enabled: false,
      shows: []
    },
    // Phase 7: Media
    photos: {
      enabled: false,
      provider: 'local',
      googlePhotosAlbumId: '',
      unsplashCollection: '',
      localFolder: '/backgrounds'
    },
    photoFrame: {
      enabled: false,
      interval: 60,
      showClock: true,
      showWeather: true
    },
    // Phase 8: Smart Home
    homeAssistant: {
      enabled: false,
      url: '',
      token: '',
      entities: []
    },
    energy: {
      enabled: false,
      provider: ''
    },
    // Phase 9: Social
    messageBoard: {
      enabled: false,
      messages: []
    },
    sharedLists: {
      enabled: false,
      lists: []
    },
    familyProfiles: {
      enabled: false,
      profiles: []
    },
    // Phase 10: Advanced
    systemStats: {
      enabled: false,
      showCpu: true,
      showMemory: true,
      showTemp: true,
      showNetwork: false
    }
  },
  integrations: {
    homeAssistant: {
      enabled: false,
      url: '',
      token: ''
    },
    tasks: {
      enabled: false,
      provider: null
    }
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false
  },
  setupComplete: false
};

// RSS Parser instance
const rssParser = new RSSParser();

// Cache for widget data (to reduce API calls)
const widgetCache = {
  news: { data: null, timestamp: 0 },
  quote: { data: null, timestamp: 0 },
  wordOfDay: { data: null, timestamp: 0 },
  joke: { data: null, timestamp: 0 },
  onThisDay: { data: null, timestamp: 0 },
  stocks: { data: null, timestamp: 0 },
  crypto: { data: null, timestamp: 0 },
  sports: { data: null, timestamp: 0 }
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
    const { apiKey, latitude, longitude, units, showAlerts, showAirQuality, additionalLocations } = config.weather || {};

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

    // Get weather alerts (One Call API 3.0 - may require subscription)
    let alerts = [];
    if (showAlerts) {
      try {
        const alertsUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,daily&appid=${apiKey}`;
        const alertsResponse = await fetch(alertsUrl);
        const alertsData = await alertsResponse.json();
        if (alertsData.alerts) {
          alerts = alertsData.alerts.map(a => ({
            event: a.event,
            sender: a.sender_name,
            start: a.start * 1000,
            end: a.end * 1000,
            description: a.description
          }));
        }
      } catch (alertErr) {
        // Alerts API may not be available, continue without them
        console.log('Weather alerts not available:', alertErr.message);
      }
    }

    // Get air quality index
    let airQuality = null;
    if (showAirQuality) {
      try {
        const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
        const aqiResponse = await fetch(aqiUrl);
        const aqiData = await aqiResponse.json();
        if (aqiData.list && aqiData.list[0]) {
          const aqi = aqiData.list[0];
          airQuality = {
            aqi: aqi.main.aqi, // 1-5 scale (1=Good, 5=Very Poor)
            components: {
              pm2_5: aqi.components.pm2_5,
              pm10: aqi.components.pm10,
              o3: aqi.components.o3,
              no2: aqi.components.no2
            }
          };
        }
      } catch (aqiErr) {
        console.log('Air quality data not available:', aqiErr.message);
      }
    }

    // Get weather for additional locations
    let additionalWeather = [];
    if (additionalLocations && additionalLocations.length > 0) {
      const locationPromises = additionalLocations.map(async (loc) => {
        try {
          const locUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${loc.latitude}&lon=${loc.longitude}&units=${units}&appid=${apiKey}`;
          const locResponse = await fetch(locUrl);
          const locData = await locResponse.json();
          return {
            name: loc.name,
            temp: Math.round(locData.main.temp),
            icon: locData.weather[0].icon,
            description: locData.weather[0].description
          };
        } catch (err) {
          return { name: loc.name, error: true };
        }
      });
      additionalWeather = await Promise.all(locationPromises);
    }

    res.json({
      current: {
        temp: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        tempMin: Math.round(currentData.main.temp_min),
        tempMax: Math.round(currentData.main.temp_max),
        humidity: currentData.main.humidity,
        pressure: currentData.main.pressure,
        windSpeed: Math.round(currentData.wind.speed),
        windDirection: currentData.wind.deg,
        visibility: currentData.visibility,
        clouds: currentData.clouds?.all,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
        iconCode: currentData.weather[0].id,
        sunrise: currentData.sys.sunrise * 1000,
        sunset: currentData.sys.sunset * 1000,
        location: currentData.name,
        country: currentData.sys.country
      },
      forecast: dailyForecast,
      alerts: alerts,
      airQuality: airQuality,
      additionalLocations: additionalWeather,
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

    // Calculate today's event count
    const todayKey = now.toISOString().split('T')[0];
    const todayGroup = grouped.find(g => g.date === todayKey);
    const todayEventCount = todayGroup ? todayGroup.events.length : 0;

    // Calculate upcoming important events for countdown
    const importantEvents = events
      .filter(e => e.eventType === 'birthday' || e.eventType === 'anniversary' || e.eventType === 'holiday')
      .slice(0, 5)
      .map(e => ({
        ...e,
        daysUntil: Math.ceil((new Date(e.start) - now) / (1000 * 60 * 60 * 24))
      }));

    res.json({
      events: grouped,
      daysToShow: daysToShow,
      todayEventCount: todayEventCount,
      totalEvents: events.length,
      importantUpcoming: importantEvents
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
  const title = sanitizeString(event.summary || 'Untitled Event', 200);

  // Calculate duration in minutes
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  // Detect special event types (birthdays, anniversaries)
  const lowerTitle = title.toLowerCase();
  let eventType = 'regular';
  if (lowerTitle.includes('birthday') || lowerTitle.includes('bday') || lowerTitle.includes("'s birthday")) {
    eventType = 'birthday';
  } else if (lowerTitle.includes('anniversary')) {
    eventType = 'anniversary';
  } else if (lowerTitle.includes('holiday') || calendarName.toLowerCase().includes('holiday')) {
    eventType = 'holiday';
  }

  return {
    id: event.uid + '_' + start.getTime(),
    title: title,
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: isAllDay,
    duration: durationMinutes,
    durationFormatted: formatDuration(durationMinutes, isAllDay),
    calendar: sanitizeString(calendarName, 100),
    color: validateColor(color) ? color : '#4CAF50',
    location: event.location ? sanitizeString(event.location, 200) : null,
    eventType: eventType,
    description: null // Don't expose descriptions for privacy
  };
}

function formatDuration(minutes, isAllDay) {
  if (isAllDay) return 'All day';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
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
    display: config.display || DEFAULT_CONFIG.display,
    features: config.features || DEFAULT_CONFIG.features,
    accessibility: config.accessibility || DEFAULT_CONFIG.accessibility,
    calendarCount: config.calendars?.length || 0,
    calendarNames: (config.calendars || []).map(c => ({
      name: sanitizeString(c.name, 100),
      color: validateColor(c.color) ? c.color : '#4CAF50'
    })),
    weather: {
      showAlerts: config.weather?.showAlerts ?? true,
      showAirQuality: config.weather?.showAirQuality ?? true,
      hasAdditionalLocations: (config.weather?.additionalLocations?.length || 0) > 0
    }
  });
});

// Serve service worker for offline mode
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Generate QR code for admin access
app.get('/api/admin/qrcode', adminAuth, (req, res) => {
  const host = req.get('host');
  const protocol = req.secure ? 'https' : 'http';
  const adminUrl = `${protocol}://${host}/admin`;

  res.json({
    url: adminUrl,
    message: 'Scan to access admin panel'
  });
});

// ============================================
// Widget API Endpoints
// ============================================

// Built-in quotes database
const QUOTES_DB = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "What you get by achieving your goals is not as important as what you become.", author: "Zig Ziglar" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "Two roads diverged in a wood, and I took the one less traveled by.", author: "Robert Frost" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
  { text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Life shrinks or expands in proportion to one's courage.", author: "Anais Nin" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" }
];

// Built-in words database
const WORDS_DB = [
  { word: "Serendipity", definition: "The occurrence of events by chance in a happy way", partOfSpeech: "noun", example: "Finding that rare book was pure serendipity." },
  { word: "Ephemeral", definition: "Lasting for a very short time", partOfSpeech: "adjective", example: "The ephemeral beauty of cherry blossoms." },
  { word: "Eloquent", definition: "Fluent or persuasive in speaking or writing", partOfSpeech: "adjective", example: "She gave an eloquent speech." },
  { word: "Ubiquitous", definition: "Present, appearing, or found everywhere", partOfSpeech: "adjective", example: "Smartphones have become ubiquitous." },
  { word: "Resilience", definition: "The capacity to recover quickly from difficulties", partOfSpeech: "noun", example: "Her resilience after the setback was inspiring." },
  { word: "Mellifluous", definition: "Sweet-sounding; pleasant to hear", partOfSpeech: "adjective", example: "The mellifluous tones of the violin." },
  { word: "Quintessential", definition: "Representing the most perfect example of a quality", partOfSpeech: "adjective", example: "He was the quintessential gentleman." },
  { word: "Sanguine", definition: "Optimistic or positive, especially in a difficult situation", partOfSpeech: "adjective", example: "She remained sanguine about her chances." },
  { word: "Ineffable", definition: "Too great or extreme to be expressed in words", partOfSpeech: "adjective", example: "The ineffable beauty of the sunset." },
  { word: "Perspicacious", definition: "Having a ready insight into things; shrewd", partOfSpeech: "adjective", example: "A perspicacious analysis of the situation." },
  { word: "Luminous", definition: "Full of or shedding light; bright or shining", partOfSpeech: "adjective", example: "Her luminous smile lit up the room." },
  { word: "Panacea", definition: "A solution or remedy for all difficulties or diseases", partOfSpeech: "noun", example: "There is no panacea for economic problems." },
  { word: "Ethereal", definition: "Extremely delicate and light; heavenly", partOfSpeech: "adjective", example: "The ethereal beauty of the aurora borealis." },
  { word: "Magnanimous", definition: "Very generous or forgiving, especially toward rivals", partOfSpeech: "adjective", example: "A magnanimous gesture of forgiveness." },
  { word: "Zenith", definition: "The highest point reached; the peak", partOfSpeech: "noun", example: "At the zenith of her career." }
];

// Built-in jokes database
const JOKES_DB = [
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!" },
  { setup: "Why did the scarecrow win an award?", punchline: "Because he was outstanding in his field!" },
  { setup: "Why don't eggs tell jokes?", punchline: "They'd crack each other up!" },
  { setup: "What do you call a fake noodle?", punchline: "An impasta!" },
  { setup: "Why did the coffee file a police report?", punchline: "It got mugged!" },
  { setup: "What do you call a bear with no teeth?", punchline: "A gummy bear!" },
  { setup: "Why can't you give Elsa a balloon?", punchline: "Because she will let it go!" },
  { setup: "What did the ocean say to the beach?", punchline: "Nothing, it just waved." },
  { setup: "Why do programmers prefer dark mode?", punchline: "Because light attracts bugs!" },
  { setup: "Why was the math book sad?", punchline: "Because it had too many problems." },
  { setup: "What do you call a fish without eyes?", punchline: "A fsh!" },
  { setup: "Why did the bicycle fall over?", punchline: "Because it was two-tired!" },
  { setup: "What do you call a lazy kangaroo?", punchline: "A pouch potato!" },
  { setup: "Why don't skeletons fight each other?", punchline: "They don't have the guts!" },
  { setup: "What did one wall say to the other wall?", punchline: "I'll meet you at the corner!" }
];

// Get quote of the day
app.get('/api/widgets/quote', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.quotes?.enabled) {
      return res.json({ enabled: false });
    }

    // Use date as seed for consistent daily quote
    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const quote = QUOTES_DB[seed % QUOTES_DB.length];

    res.json({
      enabled: true,
      quote: quote.text,
      author: quote.author,
      date: today
    });
  } catch (err) {
    console.error('Quote API error:', err);
    res.status(500).json({ error: 'Quote unavailable' });
  }
});

// Get word of the day
app.get('/api/widgets/word', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.wordOfDay?.enabled) {
      return res.json({ enabled: false });
    }

    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const word = WORDS_DB[seed % WORDS_DB.length];

    res.json({
      enabled: true,
      word: word.word,
      definition: word.definition,
      partOfSpeech: word.partOfSpeech,
      example: word.example,
      date: today
    });
  } catch (err) {
    console.error('Word API error:', err);
    res.status(500).json({ error: 'Word unavailable' });
  }
});

// Get joke of the day
app.get('/api/widgets/joke', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.jokeOfDay?.enabled) {
      return res.json({ enabled: false });
    }

    // Try external API first, fallback to built-in
    try {
      const response = await fetch('https://official-joke-api.appspot.com/random_joke', { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        return res.json({
          enabled: true,
          setup: data.setup,
          punchline: data.punchline,
          source: 'api'
        });
      }
    } catch (apiErr) {
      // Fallback to built-in
    }

    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const joke = JOKES_DB[seed % JOKES_DB.length];

    res.json({
      enabled: true,
      setup: joke.setup,
      punchline: joke.punchline,
      source: 'local'
    });
  } catch (err) {
    console.error('Joke API error:', err);
    res.status(500).json({ error: 'Joke unavailable' });
  }
});

// Get "On This Day" historical events
app.get('/api/widgets/onthisday', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.onThisDay?.enabled) {
      return res.json({ enabled: false });
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Try Wikipedia API
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
      const response = await fetch(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Calboard/2.0' }
      });

      if (response.ok) {
        const data = await response.json();
        const events = (data.events || []).slice(0, 5).map(e => ({
          year: e.year,
          text: e.text,
          pages: e.pages?.slice(0, 1).map(p => ({ title: p.title, thumbnail: p.thumbnail?.source }))
        }));

        return res.json({
          enabled: true,
          date: `${month}/${day}`,
          events: events
        });
      }
    } catch (apiErr) {
      console.log('Wikipedia API error:', apiErr.message);
    }

    res.json({
      enabled: true,
      date: `${month}/${day}`,
      events: []
    });
  } catch (err) {
    console.error('On This Day API error:', err);
    res.status(500).json({ error: 'Historical data unavailable' });
  }
});

// Get news from RSS feeds
app.get('/api/widgets/news', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.news?.enabled || !widgets.news.feeds?.length) {
      return res.json({ enabled: false, items: [] });
    }

    const maxItems = widgets.news.maxItems || 5;
    const cacheTime = (widgets.news.refreshMinutes || 30) * 60 * 1000;

    // Check cache
    if (widgetCache.news.data && Date.now() - widgetCache.news.timestamp < cacheTime) {
      return res.json({ enabled: true, items: widgetCache.news.data, cached: true });
    }

    const allItems = [];

    for (const feedUrl of widgets.news.feeds) {
      try {
        const feed = await rssParser.parseURL(feedUrl);
        const items = (feed.items || []).slice(0, 10).map(item => ({
          title: sanitizeString(item.title, 200),
          link: item.link,
          pubDate: item.pubDate,
          source: feed.title || 'News',
          description: sanitizeString(item.contentSnippet || item.description || '', 300)
        }));
        allItems.push(...items);
      } catch (feedErr) {
        console.error(`RSS feed error for ${feedUrl}:`, feedErr.message);
      }
    }

    // Sort by date and limit
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const items = allItems.slice(0, maxItems);

    // Update cache
    widgetCache.news.data = items;
    widgetCache.news.timestamp = Date.now();

    res.json({ enabled: true, items: items });
  } catch (err) {
    console.error('News API error:', err);
    res.status(500).json({ error: 'News unavailable' });
  }
});

// ============================================
// Phase 2: Environment Widgets
// ============================================

// Calculate moon phase
function getMoonPhase(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let c, e, jd, b;

  if (month < 3) {
    year--;
    month += 12;
  }

  ++month;
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = parseInt(jd);
  jd -= b;
  b = Math.round(jd * 8);

  if (b >= 8) b = 0;

  const phases = [
    { name: 'New Moon', icon: '🌑', illumination: 0 },
    { name: 'Waxing Crescent', icon: '🌒', illumination: 25 },
    { name: 'First Quarter', icon: '🌓', illumination: 50 },
    { name: 'Waxing Gibbous', icon: '🌔', illumination: 75 },
    { name: 'Full Moon', icon: '🌕', illumination: 100 },
    { name: 'Waning Gibbous', icon: '🌖', illumination: 75 },
    { name: 'Last Quarter', icon: '🌗', illumination: 50 },
    { name: 'Waning Crescent', icon: '🌘', illumination: 25 }
  ];

  return phases[b];
}

app.get('/api/widgets/moon', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.moonPhase?.enabled) {
      return res.json({ enabled: false });
    }

    const phase = getMoonPhase();
    res.json({
      enabled: true,
      phase: phase.name,
      icon: phase.icon,
      illumination: phase.illumination
    });
  } catch (err) {
    console.error('Moon phase error:', err);
    res.status(500).json({ error: 'Moon phase unavailable' });
  }
});

// Get UV Index (uses OpenWeatherMap UV API)
app.get('/api/widgets/uv', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.uvIndex?.enabled) {
      return res.json({ enabled: false });
    }

    const { apiKey, latitude, longitude } = config.weather || {};
    if (!apiKey) {
      return res.json({ enabled: false, error: 'Weather API not configured' });
    }

    const url = `https://api.openweathermap.org/data/2.5/uvi?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();

    const uvIndex = Math.round(data.value || 0);
    let level, color, advice;

    if (uvIndex <= 2) {
      level = 'Low';
      color = '#4CAF50';
      advice = 'No protection needed';
    } else if (uvIndex <= 5) {
      level = 'Moderate';
      color = '#FFEB3B';
      advice = 'Wear sunscreen';
    } else if (uvIndex <= 7) {
      level = 'High';
      color = '#FF9800';
      advice = 'Reduce sun exposure';
    } else if (uvIndex <= 10) {
      level = 'Very High';
      color = '#f44336';
      advice = 'Extra protection needed';
    } else {
      level = 'Extreme';
      color = '#9C27B0';
      advice = 'Avoid sun exposure';
    }

    res.json({
      enabled: true,
      index: uvIndex,
      level: level,
      color: color,
      advice: advice
    });
  } catch (err) {
    console.error('UV Index error:', err);
    res.status(500).json({ error: 'UV data unavailable' });
  }
});

// Get tide information (NOAA Tides API)
app.get('/api/widgets/tides', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.tides?.enabled || !widgets.tides.stationId) {
      return res.json({ enabled: false });
    }

    const stationId = widgets.tides.stationId;
    const today = new Date();
    const beginDate = today.toISOString().split('T')[0].replace(/-/g, '');
    const endDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0].replace(/-/g, '');

    const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${beginDate}&end_date=${endDate}&station=${stationId}&product=predictions&datum=MLLW&time_zone=lst_ldt&units=english&format=json&interval=hilo`;

    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();

    const predictions = (data.predictions || []).map(p => ({
      time: p.t,
      height: parseFloat(p.v).toFixed(1),
      type: p.type === 'H' ? 'High' : 'Low'
    }));

    res.json({
      enabled: true,
      stationId: stationId,
      predictions: predictions.slice(0, 4)
    });
  } catch (err) {
    console.error('Tides error:', err);
    res.status(500).json({ error: 'Tide data unavailable' });
  }
});

// ============================================
// Phase 3: Productivity Widgets
// ============================================

// Local tasks/todo list
app.get('/api/widgets/tasks', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.tasks?.enabled) {
      return res.json({ enabled: false });
    }

    res.json({
      enabled: true,
      provider: widgets.tasks.provider || 'local',
      lists: widgets.tasks.lists || []
    });
  } catch (err) {
    console.error('Tasks error:', err);
    res.status(500).json({ error: 'Tasks unavailable' });
  }
});

// Add task
app.post('/api/widgets/tasks', adminAuth, (req, res) => {
  try {
    const { listName, task } = req.body;
    if (!config.widgets) config.widgets = { ...DEFAULT_CONFIG.widgets };
    if (!config.widgets.tasks) config.widgets.tasks = { enabled: true, provider: 'local', lists: [] };

    let list = config.widgets.tasks.lists.find(l => l.name === listName);
    if (!list) {
      list = { name: listName || 'Tasks', items: [] };
      config.widgets.tasks.lists.push(list);
    }

    list.items.push({
      id: Date.now().toString(),
      text: sanitizeString(task, 200),
      completed: false,
      createdAt: new Date().toISOString()
    });

    saveConfig(config);
    res.json({ success: true, lists: config.widgets.tasks.lists });
  } catch (err) {
    console.error('Add task error:', err);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

// Update task
app.put('/api/widgets/tasks/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { completed, text } = req.body;

    if (!config.widgets?.tasks?.lists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    for (const list of config.widgets.tasks.lists) {
      const task = list.items.find(t => t.id === id);
      if (task) {
        if (completed !== undefined) task.completed = completed;
        if (text !== undefined) task.text = sanitizeString(text, 200);
        saveConfig(config);
        return res.json({ success: true, task });
      }
    }

    res.status(404).json({ error: 'Task not found' });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
app.delete('/api/widgets/tasks/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;

    if (!config.widgets?.tasks?.lists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    for (const list of config.widgets.tasks.lists) {
      const index = list.items.findIndex(t => t.id === id);
      if (index !== -1) {
        list.items.splice(index, 1);
        saveConfig(config);
        return res.json({ success: true });
      }
    }

    res.status(404).json({ error: 'Task not found' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Grocery list
app.get('/api/widgets/grocery', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.groceryList?.enabled) {
      return res.json({ enabled: false });
    }

    res.json({
      enabled: true,
      items: widgets.groceryList.items || []
    });
  } catch (err) {
    console.error('Grocery list error:', err);
    res.status(500).json({ error: 'Grocery list unavailable' });
  }
});

// Add grocery item
app.post('/api/widgets/grocery', adminAuth, (req, res) => {
  try {
    const { item, quantity, category } = req.body;
    if (!config.widgets) config.widgets = { ...DEFAULT_CONFIG.widgets };
    if (!config.widgets.groceryList) config.widgets.groceryList = { enabled: true, items: [] };

    config.widgets.groceryList.items.push({
      id: Date.now().toString(),
      name: sanitizeString(item, 100),
      quantity: quantity || 1,
      category: category || 'Other',
      checked: false
    });

    saveConfig(config);
    res.json({ success: true, items: config.widgets.groceryList.items });
  } catch (err) {
    console.error('Add grocery error:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// Toggle grocery item
app.put('/api/widgets/grocery/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { checked } = req.body;

    if (!config.widgets?.groceryList?.items) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = config.widgets.groceryList.items.find(i => i.id === id);
    if (item) {
      item.checked = checked;
      saveConfig(config);
      return res.json({ success: true, item });
    }

    res.status(404).json({ error: 'Item not found' });
  } catch (err) {
    console.error('Update grocery error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete grocery item
app.delete('/api/widgets/grocery/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;

    if (!config.widgets?.groceryList?.items) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const index = config.widgets.groceryList.items.findIndex(i => i.id === id);
    if (index !== -1) {
      config.widgets.groceryList.items.splice(index, 1);
      saveConfig(config);
      return res.json({ success: true });
    }

    res.status(404).json({ error: 'Item not found' });
  } catch (err) {
    console.error('Delete grocery error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Chores rotation
app.get('/api/widgets/chores', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.chores?.enabled) {
      return res.json({ enabled: false });
    }

    res.json({
      enabled: true,
      members: widgets.chores.members || [],
      tasks: widgets.chores.tasks || []
    });
  } catch (err) {
    console.error('Chores error:', err);
    res.status(500).json({ error: 'Chores unavailable' });
  }
});

// Medication reminders
app.get('/api/widgets/medications', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.medications?.enabled) {
      return res.json({ enabled: false });
    }

    res.json({
      enabled: true,
      reminders: widgets.medications.reminders || []
    });
  } catch (err) {
    console.error('Medications error:', err);
    res.status(500).json({ error: 'Medications unavailable' });
  }
});

// ============================================
// Phase 4: Transportation Widgets
// ============================================

// Traffic/commute times (Google Maps API)
app.get('/api/widgets/traffic', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.traffic?.enabled || !widgets.traffic.googleMapsApiKey) {
      return res.json({ enabled: false });
    }

    const apiKey = widgets.traffic.googleMapsApiKey;
    const routes = widgets.traffic.routes || [];
    const results = [];

    for (const route of routes) {
      try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(route.origin)}&destinations=${encodeURIComponent(route.destination)}&departure_time=now&key=${apiKey}`;
        const response = await fetch(url, { timeout: 10000 });
        const data = await response.json();

        if (data.rows?.[0]?.elements?.[0]) {
          const element = data.rows[0].elements[0];
          results.push({
            name: route.name || `${route.origin} to ${route.destination}`,
            duration: element.duration?.text,
            durationInTraffic: element.duration_in_traffic?.text,
            distance: element.distance?.text,
            status: element.status
          });
        }
      } catch (routeErr) {
        results.push({ name: route.name, error: true });
      }
    }

    res.json({ enabled: true, routes: results });
  } catch (err) {
    console.error('Traffic error:', err);
    res.status(500).json({ error: 'Traffic data unavailable' });
  }
});

// Gas prices
app.get('/api/widgets/gas', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.gasPrices?.enabled) {
      return res.json({ enabled: false });
    }

    // Gas prices would require a specific API subscription
    // For now, return placeholder
    res.json({
      enabled: true,
      message: 'Gas price API requires subscription',
      prices: []
    });
  } catch (err) {
    console.error('Gas prices error:', err);
    res.status(500).json({ error: 'Gas prices unavailable' });
  }
});

// ============================================
// Phase 5: Finance Widgets
// ============================================

// Stock prices
app.get('/api/widgets/stocks', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.stocks?.enabled || !widgets.stocks.symbols?.length) {
      return res.json({ enabled: false });
    }

    const symbols = widgets.stocks.symbols;
    const apiKey = widgets.stocks.apiKey;

    // Check cache (5 minute refresh)
    if (widgetCache.stocks.data && Date.now() - widgetCache.stocks.timestamp < 300000) {
      return res.json({ enabled: true, stocks: widgetCache.stocks.data, cached: true });
    }

    const stocks = [];

    // Use Alpha Vantage API if key provided
    if (apiKey) {
      for (const symbol of symbols.slice(0, 5)) {
        try {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
          const response = await fetch(url, { timeout: 10000 });
          const data = await response.json();

          if (data['Global Quote']) {
            const quote = data['Global Quote'];
            stocks.push({
              symbol: symbol,
              price: parseFloat(quote['05. price']).toFixed(2),
              change: parseFloat(quote['09. change']).toFixed(2),
              changePercent: quote['10. change percent']
            });
          }
        } catch (stockErr) {
          stocks.push({ symbol, error: true });
        }
      }
    }

    widgetCache.stocks.data = stocks;
    widgetCache.stocks.timestamp = Date.now();

    res.json({ enabled: true, stocks });
  } catch (err) {
    console.error('Stocks error:', err);
    res.status(500).json({ error: 'Stock data unavailable' });
  }
});

// Cryptocurrency prices (CoinGecko - free)
app.get('/api/widgets/crypto', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.crypto?.enabled) {
      return res.json({ enabled: false });
    }

    // Check cache (5 minute refresh)
    if (widgetCache.crypto.data && Date.now() - widgetCache.crypto.timestamp < 300000) {
      return res.json({ enabled: true, coins: widgetCache.crypto.data, cached: true });
    }

    const coins = widgets.crypto.coins || ['bitcoin', 'ethereum'];
    const ids = coins.join(',');

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url, { timeout: 10000 });
    const data = await response.json();

    const results = coins.map(coin => ({
      id: coin,
      name: coin.charAt(0).toUpperCase() + coin.slice(1),
      price: data[coin]?.usd?.toFixed(2) || 'N/A',
      change24h: data[coin]?.usd_24h_change?.toFixed(2) || 'N/A'
    }));

    widgetCache.crypto.data = results;
    widgetCache.crypto.timestamp = Date.now();

    res.json({ enabled: true, coins: results });
  } catch (err) {
    console.error('Crypto error:', err);
    res.status(500).json({ error: 'Crypto data unavailable' });
  }
});

// ============================================
// Phase 6: Sports & Entertainment
// ============================================

// Sports scores (ESPN API - unofficial)
app.get('/api/widgets/sports', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.sports?.enabled) {
      return res.json({ enabled: false });
    }

    const leagues = widgets.sports.leagues || ['nfl', 'nba'];
    const results = [];

    for (const league of leagues) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${getEspnSport(league)}/${league}/scoreboard`;
        const response = await fetch(url, { timeout: 10000 });
        const data = await response.json();

        const events = (data.events || []).slice(0, 3).map(e => ({
          name: e.name,
          status: e.status?.type?.description,
          homeTeam: e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.abbreviation,
          homeScore: e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.score,
          awayTeam: e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.abbreviation,
          awayScore: e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.score
        }));

        results.push({ league: league.toUpperCase(), events });
      } catch (leagueErr) {
        results.push({ league: league.toUpperCase(), error: true });
      }
    }

    res.json({ enabled: true, leagues: results });
  } catch (err) {
    console.error('Sports error:', err);
    res.status(500).json({ error: 'Sports data unavailable' });
  }
});

function getEspnSport(league) {
  const sportMap = {
    'nfl': 'football',
    'nba': 'basketball',
    'mlb': 'baseball',
    'nhl': 'hockey',
    'mls': 'soccer',
    'epl': 'soccer'
  };
  return sportMap[league.toLowerCase()] || 'football';
}

// ============================================
// Phase 7: Media Widgets
// ============================================

// Get photos from Unsplash
app.get('/api/widgets/photos/unsplash', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.photos?.enabled || widgets.photos.provider !== 'unsplash') {
      return res.json({ enabled: false });
    }

    // Unsplash Source (free, no API key needed for random photos)
    const collection = widgets.photos.unsplashCollection || '1053828';
    const url = `https://source.unsplash.com/collection/${collection}/1920x1080`;

    res.json({
      enabled: true,
      imageUrl: url,
      provider: 'unsplash'
    });
  } catch (err) {
    console.error('Unsplash error:', err);
    res.status(500).json({ error: 'Photos unavailable' });
  }
});

// Photo frame mode settings
app.get('/api/widgets/photoframe', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;

    res.json({
      enabled: widgets.photoFrame?.enabled || false,
      interval: widgets.photoFrame?.interval || 60,
      showClock: widgets.photoFrame?.showClock ?? true,
      showWeather: widgets.photoFrame?.showWeather ?? true
    });
  } catch (err) {
    console.error('Photo frame error:', err);
    res.status(500).json({ error: 'Photo frame settings unavailable' });
  }
});

// ============================================
// Phase 8: Smart Home
// ============================================

// Home Assistant integration
app.get('/api/widgets/homeassistant', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.homeAssistant?.enabled || !widgets.homeAssistant.url) {
      return res.json({ enabled: false });
    }

    const haUrl = widgets.homeAssistant.url;
    const token = widgets.homeAssistant.token;
    const entities = widgets.homeAssistant.entities || [];

    if (!token || !entities.length) {
      return res.json({ enabled: true, entities: [] });
    }

    const states = [];

    for (const entityId of entities) {
      try {
        const response = await fetch(`${haUrl}/api/states/${entityId}`, {
          timeout: 10000,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          states.push({
            entityId: data.entity_id,
            state: data.state,
            friendlyName: data.attributes?.friendly_name || entityId,
            icon: data.attributes?.icon,
            unitOfMeasurement: data.attributes?.unit_of_measurement
          });
        }
      } catch (entityErr) {
        states.push({ entityId, error: true });
      }
    }

    res.json({ enabled: true, entities: states });
  } catch (err) {
    console.error('Home Assistant error:', err);
    res.status(500).json({ error: 'Home Assistant unavailable' });
  }
});

// Toggle Home Assistant entity
app.post('/api/widgets/homeassistant/toggle', adminAuth, async (req, res) => {
  try {
    const { entityId } = req.body;
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;

    if (!widgets.homeAssistant?.enabled || !widgets.homeAssistant.url) {
      return res.status(400).json({ error: 'Home Assistant not configured' });
    }

    const haUrl = widgets.homeAssistant.url;
    const token = widgets.homeAssistant.token;

    const domain = entityId.split('.')[0];
    const service = 'toggle';

    const response = await fetch(`${haUrl}/api/services/${domain}/${service}`, {
      method: 'POST',
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entity_id: entityId })
    });

    if (response.ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to toggle entity' });
    }
  } catch (err) {
    console.error('HA toggle error:', err);
    res.status(500).json({ error: 'Toggle failed' });
  }
});

// ============================================
// Phase 9: Social Widgets
// ============================================

// Message board
app.get('/api/widgets/messages', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.messageBoard?.enabled) {
      return res.json({ enabled: false });
    }

    res.json({
      enabled: true,
      messages: widgets.messageBoard.messages || []
    });
  } catch (err) {
    console.error('Messages error:', err);
    res.status(500).json({ error: 'Messages unavailable' });
  }
});

// Post message
app.post('/api/widgets/messages', adminAuth, (req, res) => {
  try {
    const { text, author } = req.body;
    if (!config.widgets) config.widgets = { ...DEFAULT_CONFIG.widgets };
    if (!config.widgets.messageBoard) config.widgets.messageBoard = { enabled: true, messages: [] };

    config.widgets.messageBoard.messages.unshift({
      id: Date.now().toString(),
      text: sanitizeString(text, 500),
      author: sanitizeString(author || 'Anonymous', 50),
      timestamp: new Date().toISOString()
    });

    // Keep only last 20 messages
    config.widgets.messageBoard.messages = config.widgets.messageBoard.messages.slice(0, 20);

    saveConfig(config);
    res.json({ success: true, messages: config.widgets.messageBoard.messages });
  } catch (err) {
    console.error('Post message error:', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

// Delete message
app.delete('/api/widgets/messages/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;

    if (!config.widgets?.messageBoard?.messages) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const index = config.widgets.messageBoard.messages.findIndex(m => m.id === id);
    if (index !== -1) {
      config.widgets.messageBoard.messages.splice(index, 1);
      saveConfig(config);
      return res.json({ success: true });
    }

    res.status(404).json({ error: 'Message not found' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Family profiles
app.get('/api/widgets/profiles', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.familyProfiles?.enabled) {
      return res.json({ enabled: false });
    }

    res.json({
      enabled: true,
      profiles: widgets.familyProfiles.profiles || []
    });
  } catch (err) {
    console.error('Profiles error:', err);
    res.status(500).json({ error: 'Profiles unavailable' });
  }
});

// ============================================
// Phase 10: System Stats
// ============================================

app.get('/api/widgets/system', async (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;
    if (!widgets.systemStats?.enabled) {
      return res.json({ enabled: false });
    }

    const stats = {};

    // CPU usage (Linux only)
    if (widgets.systemStats.showCpu) {
      try {
        const cpuData = fs.readFileSync('/proc/stat', 'utf8');
        const cpuLine = cpuData.split('\n')[0].split(/\s+/);
        const idle = parseInt(cpuLine[4]);
        const total = cpuLine.slice(1, 8).reduce((a, b) => a + parseInt(b), 0);
        stats.cpuUsage = Math.round((1 - idle / total) * 100);
      } catch (e) {
        stats.cpuUsage = null;
      }
    }

    // Memory usage
    if (widgets.systemStats.showMemory) {
      try {
        const memData = fs.readFileSync('/proc/meminfo', 'utf8');
        const memTotal = parseInt(memData.match(/MemTotal:\s+(\d+)/)?.[1] || 0);
        const memAvailable = parseInt(memData.match(/MemAvailable:\s+(\d+)/)?.[1] || 0);
        stats.memoryUsage = Math.round((1 - memAvailable / memTotal) * 100);
        stats.memoryTotal = Math.round(memTotal / 1024);
        stats.memoryUsed = Math.round((memTotal - memAvailable) / 1024);
      } catch (e) {
        stats.memoryUsage = null;
      }
    }

    // CPU temperature (Raspberry Pi)
    if (widgets.systemStats.showTemp) {
      try {
        const temp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
        stats.cpuTemp = (parseInt(temp) / 1000).toFixed(1);
      } catch (e) {
        stats.cpuTemp = null;
      }
    }

    // Uptime
    try {
      const uptime = fs.readFileSync('/proc/uptime', 'utf8');
      const seconds = parseInt(uptime.split(' ')[0]);
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      stats.uptime = `${days}d ${hours}h`;
    } catch (e) {
      stats.uptime = null;
    }

    res.json({ enabled: true, stats });
  } catch (err) {
    console.error('System stats error:', err);
    res.status(500).json({ error: 'System stats unavailable' });
  }
});

// Get all widget states for dashboard
app.get('/api/widgets', (req, res) => {
  try {
    const widgets = config.widgets || DEFAULT_CONFIG.widgets;

    // Return enabled status for all widgets
    res.json({
      news: { enabled: widgets.news?.enabled || false },
      quotes: { enabled: widgets.quotes?.enabled || false },
      wordOfDay: { enabled: widgets.wordOfDay?.enabled || false },
      jokeOfDay: { enabled: widgets.jokeOfDay?.enabled || false },
      onThisDay: { enabled: widgets.onThisDay?.enabled || false },
      moonPhase: { enabled: widgets.moonPhase?.enabled || false },
      tides: { enabled: widgets.tides?.enabled || false },
      uvIndex: { enabled: widgets.uvIndex?.enabled || false },
      tasks: { enabled: widgets.tasks?.enabled || false },
      groceryList: { enabled: widgets.groceryList?.enabled || false },
      chores: { enabled: widgets.chores?.enabled || false },
      medications: { enabled: widgets.medications?.enabled || false },
      traffic: { enabled: widgets.traffic?.enabled || false },
      stocks: { enabled: widgets.stocks?.enabled || false },
      crypto: { enabled: widgets.crypto?.enabled || false },
      sports: { enabled: widgets.sports?.enabled || false },
      photos: { enabled: widgets.photos?.enabled || false },
      photoFrame: { enabled: widgets.photoFrame?.enabled || false },
      homeAssistant: { enabled: widgets.homeAssistant?.enabled || false },
      messageBoard: { enabled: widgets.messageBoard?.enabled || false },
      familyProfiles: { enabled: widgets.familyProfiles?.enabled || false },
      systemStats: { enabled: widgets.systemStats?.enabled || false }
    });
  } catch (err) {
    console.error('Widgets status error:', err);
    res.status(500).json({ error: 'Widget status unavailable' });
  }
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
