// Calboard - Calendar & Weather Dashboard
// Main application JavaScript

class Calboard {
  constructor() {
    this.config = null;
    this.weatherData = null;
    this.calendarData = null;
    this.refreshInterval = null;

    this.init();
  }

  async init() {
    // Start the clock immediately
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Load configuration
    await this.loadConfig();

    // Initial data load
    await Promise.all([
      this.loadWeather(),
      this.loadCalendar()
    ]);

    // Set up auto-refresh
    const refreshMinutes = this.config?.display?.refreshIntervalMinutes || 5;
    this.refreshInterval = setInterval(() => {
      this.loadWeather();
      this.loadCalendar();
    }, refreshMinutes * 60 * 1000);

    // Set background image if configured
    this.setBackgroundImage();

    // Enable kiosk mode on double-click
    document.addEventListener('dblclick', () => {
      document.body.classList.toggle('kiosk-mode');
      if (document.documentElement.requestFullscreen) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    });
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      this.config = await response.json();
    } catch (err) {
      console.error('Failed to load config:', err);
      this.config = { display: {} };
    }
  }

  setBackgroundImage() {
    const bgElement = document.getElementById('background-image');
    const bgImage = this.config?.display?.backgroundImage;

    if (bgImage && bgElement) {
      bgElement.style.backgroundImage = `url('${bgImage}')`;
    }
  }

  // Clock functions
  updateClock() {
    const now = new Date();
    const timeFormat = this.config?.display?.timeFormat || '12h';
    const dateFormat = this.config?.display?.dateFormat || 'en-US';

    // Time
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    if (timeFormat === '12h') {
      hours = hours % 12 || 12;
    }

    document.getElementById('time').textContent = `${hours}:${minutes}`;
    document.getElementById('seconds').textContent = seconds;

    // Date
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString(dateFormat, dateOptions);
    document.getElementById('date').textContent = dateString;
  }

  // Weather functions
  async loadWeather() {
    try {
      const response = await fetch('/api/weather');
      if (!response.ok) throw new Error('Weather API error');

      this.weatherData = await response.json();
      this.renderWeather();
    } catch (err) {
      console.error('Failed to load weather:', err);
      this.renderWeatherError(err.message);
    }
  }

  renderWeather() {
    const data = this.weatherData;
    if (!data) return;

    // Current temperature
    document.getElementById('current-temp').textContent = data.current.temp;

    // Weather icon
    const iconContainer = document.getElementById('current-weather-icon');
    iconContainer.innerHTML = this.getWeatherIcon(data.current.icon, data.current.iconCode, 60);

    // Sunset
    const sunsetTime = new Date(data.current.sunset);
    document.getElementById('sunset').textContent = this.formatTime(sunsetTime);

    // Wind
    const windUnit = data.units === 'imperial' ? 'mph' : 'm/s';
    document.getElementById('wind').textContent = `${data.current.windSpeed} ${windUnit}`;

    // Humidity
    document.getElementById('humidity').textContent = `${data.current.humidity}%`;

    // Forecast
    this.renderForecast(data.forecast);
  }

  renderForecast(forecast) {
    const container = document.getElementById('forecast');
    container.innerHTML = '';

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    forecast.slice(0, 4).forEach((day, index) => {
      const dayDate = new Date(day.date + 'T12:00:00');
      let label;

      if (dayDate.toDateString() === today.toDateString()) {
        label = 'Today';
      } else {
        label = dayNames[dayDate.getDay()];
      }

      const dayEl = document.createElement('div');
      dayEl.className = 'forecast-day';
      dayEl.innerHTML = `
        <div class="forecast-label">${label}</div>
        <div class="forecast-icon">${this.getWeatherIcon(day.icon, day.iconCode, 40)}</div>
        <div class="forecast-pop"><span class="drop-icon">💧</span> ${day.pop}%</div>
        <div class="forecast-temps">
          <span class="high">${day.high}°</span>
          <span class="low">${day.low}°</span>
        </div>
      `;
      container.appendChild(dayEl);
    });
  }

  getWeatherIcon(iconCode, weatherId, size = 40) {
    // Use OpenWeatherMap icons
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    return `<img src="${iconUrl}" alt="weather" style="width: ${size}px; height: ${size}px;">`;
  }

  renderWeatherError(message) {
    document.getElementById('current-temp').textContent = '--';
    document.getElementById('forecast').innerHTML = `
      <div class="error">Weather unavailable: ${message}</div>
    `;
  }

  // Calendar functions
  async loadCalendar() {
    try {
      const response = await fetch('/api/calendars');
      if (!response.ok) throw new Error('Calendar API error');

      this.calendarData = await response.json();
      this.renderCalendar();
    } catch (err) {
      console.error('Failed to load calendar:', err);
      this.renderCalendarError(err.message);
    }
  }

  renderCalendar() {
    const container = document.getElementById('calendar-section');
    const data = this.calendarData;

    if (!data || !data.events || data.events.length === 0) {
      container.innerHTML = '<div class="no-events">No upcoming events</div>';
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    container.innerHTML = '';

    data.events.forEach(dayGroup => {
      const dayDate = new Date(dayGroup.date + 'T12:00:00');
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';

      // Determine day label
      const isToday = dayDate.toDateString() === today.toDateString();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow = dayDate.toDateString() === tomorrow.toDateString();

      let dayLabel;
      if (isToday) {
        dayLabel = 'Today';
      } else if (isTomorrow) {
        dayLabel = 'Tomorrow';
      } else {
        dayLabel = dayDate.toLocaleDateString(this.config?.display?.dateFormat || 'en-US', { weekday: 'long' });
      }

      const dayNumber = dayDate.getDate();

      dayEl.innerHTML = `
        <div class="day-header ${isToday ? 'today' : ''}">
          <span class="day-number">${dayNumber}</span>
          <span class="day-name">${dayLabel}</span>
        </div>
        <div class="event-list">
          ${this.renderEvents(dayGroup.events)}
        </div>
      `;

      container.appendChild(dayEl);
    });
  }

  renderEvents(events) {
    if (!events || events.length === 0) {
      return '<div class="no-events">No events</div>';
    }

    return events.map(event => {
      const timeStr = event.allDay ? 'All day' : this.formatEventTime(event.start);

      return `
        <div class="event">
          <div class="event-color" style="background-color: ${event.color || '#4CAF50'}"></div>
          <div class="event-time">${timeStr}</div>
          <div class="event-details">
            <div class="event-title">${this.escapeHtml(event.title)}</div>
            ${event.location ? `<div class="event-location">${this.escapeHtml(event.location)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  formatEventTime(isoString) {
    const date = new Date(isoString);
    const timeFormat = this.config?.display?.timeFormat || '12h';

    if (timeFormat === '12h') {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      if (minutes === 0) {
        return `${hours} ${ampm}`;
      }
      return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  }

  formatTime(date) {
    const timeFormat = this.config?.display?.timeFormat || '12h';

    if (timeFormat === '12h') {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } else {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  }

  renderCalendarError(message) {
    const container = document.getElementById('calendar-section');
    container.innerHTML = `<div class="error">Calendar unavailable: ${message}</div>`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.calboard = new Calboard();
});
