const express = require('express');
const fetch = require('node-fetch');
const ICAL = require('ical.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Load configuration
let config;
const CONFIG_PATH = './config.json';

function loadConfig() {
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return true;
  } catch (err) {
    console.error('Error loading config.json:', err.message);
    return false;
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

// Initial load
if (!loadConfig()) {
  console.error('Please copy config.example.json to config.json and configure it.');
  process.exit(1);
}

const PORT = config.server?.port || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Admin authentication middleware
function adminAuth(req, res, next) {
  const adminPassword = config.admin?.password;

  // If no password is set, allow access (for initial setup)
  if (!adminPassword) {
    return next();
  }

  // Check for password in header or query
  const providedPassword = req.headers['x-admin-password'] || req.query.password;

  if (!providedPassword) {
    return res.status(401).json({ error: 'Authentication required', needsAuth: true });
  }

  // Compare passwords (timing-safe comparison)
  const providedHash = crypto.createHash('sha256').update(providedPassword).digest('hex');
  const storedHash = crypto.createHash('sha256').update(adminPassword).digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(storedHash))) {
    return next();
  }

  return res.status(403).json({ error: 'Invalid password' });
}

// Check if admin requires auth
app.get('/api/admin/auth-required', (req, res) => {
  res.json({
    required: !!config.admin?.password,
    configured: !!config.weather?.apiKey
  });
});

// Weather API endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { apiKey, latitude, longitude, units } = config.weather;

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
    res.status(500).json({ error: err.message });
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
        pop: [] // probability of precipitation
      };
    }

    daily[dayKey].temps.push(item.main.temp);
    daily[dayKey].icons.push(item.weather[0].icon);
    daily[dayKey].iconCodes.push(item.weather[0].id);
    daily[dayKey].pop.push(item.pop || 0);
  });

  // Convert to array and calculate daily values
  return Object.values(daily).map(day => ({
    date: day.date,
    high: Math.round(Math.max(...day.temps)),
    low: Math.round(Math.min(...day.temps)),
    icon: getMostFrequent(day.icons),
    iconCode: getMostFrequent(day.iconCodes),
    pop: Math.round(Math.max(...day.pop) * 100)
  })).slice(0, 5); // Next 5 days
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

    // Calculate date range
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysToShow);

    // Fetch all calendars in parallel
    const calendarPromises = config.calendars.map(async (cal) => {
      try {
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

    // Sort by start time
    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    // Group by day
    const grouped = groupEventsByDay(events);

    res.json({
      events: grouped,
      daysToShow: daysToShow
    });
  } catch (err) {
    console.error('Calendar API error:', err);
    res.status(500).json({ error: err.message });
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

      // Handle recurring events
      if (event.isRecurring()) {
        const iterator = event.iterator();
        let next;
        let count = 0;
        const maxOccurrences = 100; // Limit iterations

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

        // Check if event is in range
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
    title: event.summary || 'Untitled Event',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: isAllDay,
    calendar: calendarName,
    color: color,
    location: event.location || null,
    description: event.description || null
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
    calendarCount: config.calendars.length,
    calendarNames: config.calendars.map(c => ({ name: c.name, color: c.color }))
  });
});

// ============================================
// Admin API Endpoints
// ============================================

// Get full configuration (protected)
app.get('/api/admin/config', adminAuth, (req, res) => {
  // Return config with password masked
  const safeConfig = JSON.parse(JSON.stringify(config));
  if (safeConfig.admin?.password) {
    safeConfig.admin.password = '********';
  }
  res.json(safeConfig);
});

// Save configuration (protected)
app.put('/api/admin/config', adminAuth, (req, res) => {
  try {
    const newConfig = req.body;

    // Validate required fields
    if (!newConfig.weather || !newConfig.calendars || !newConfig.display || !newConfig.server) {
      return res.status(400).json({ error: 'Invalid configuration structure' });
    }

    // If password is masked, keep the old one
    if (newConfig.admin?.password === '********') {
      newConfig.admin.password = config.admin?.password;
    }

    // Save to file
    if (saveConfig(newConfig)) {
      res.json({ success: true, message: 'Configuration saved' });
    } else {
      res.status(500).json({ error: 'Failed to save configuration' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test calendar URL (protected)
app.post('/api/admin/test-calendar', adminAuth, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const icsData = await response.text();

    // Try to parse it
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

// Test weather API (protected)
app.post('/api/admin/test-weather', adminAuth, async (req, res) => {
  try {
    const { apiKey, latitude, longitude } = req.body;

    if (!apiKey || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'API key, latitude, and longitude are required' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
    const response = await fetch(url);
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

// Reload configuration from file (protected)
app.post('/api/admin/reload', adminAuth, (req, res) => {
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Calboard server running at http://localhost:${PORT}`);
  console.log(`Access from other devices: http://<your-pi-ip>:${PORT}`);
});
