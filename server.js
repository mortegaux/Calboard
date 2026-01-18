const express = require('express');
const fetch = require('node-fetch');
const ICAL = require('ical.js');
const fs = require('fs');
const path = require('path');

const app = express();

// Load configuration
let config;
try {
  config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
} catch (err) {
  console.error('Error loading config.json. Please copy config.example.json to config.json and configure it.');
  console.error(err.message);
  process.exit(1);
}

const PORT = config.server?.port || 3000;

// Serve static files
app.use(express.static('public'));

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Calboard server running at http://localhost:${PORT}`);
  console.log(`Access from other devices: http://<your-pi-ip>:${PORT}`);
});
