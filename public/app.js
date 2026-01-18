// Calboard - Calendar & Weather Dashboard
// Main application JavaScript with all features

class Calboard {
  constructor() {
    this.config = null;
    this.weatherData = null;
    this.calendarData = null;
    this.refreshInterval = null;
    this.wakeLock = null;
    this.currentView = 'list';
    this.hiddenCalendars = new Set();
    this.slideshowIndex = 0;
    this.slideshowInterval = null;
    this.isOnline = navigator.onLine;
    this.touchStartX = 0;
    this.touchStartY = 0;

    this.init();
  }

  async init() {
    // Start the clock immediately
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Load configuration
    await this.loadConfig();

    // Apply theme
    this.applyTheme();

    // Apply custom CSS
    this.applyCustomCSS();

    // Apply accessibility settings
    this.applyAccessibility();

    // Set up connection monitoring
    this.setupConnectionMonitoring();

    // Request wake lock if enabled
    if (this.config?.features?.screenWakeLock) {
      this.requestWakeLock();
    }

    // Register service worker for offline mode
    if (this.config?.features?.offlineMode) {
      this.registerServiceWorker();
    }

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

    // Set background image/slideshow
    this.setupBackground();

    // Set up calendar filters
    this.renderCalendarFilters();

    // Set up view toggle
    this.setupViewToggle();

    // Set up touch gestures
    if (this.config?.features?.touchGestures) {
      this.setupTouchGestures();
    }

    // Enable kiosk mode on double-click
    document.addEventListener('dblclick', () => this.toggleKioskMode());

    // Handle visibility change for wake lock
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.config?.features?.screenWakeLock) {
        this.requestWakeLock();
      }
    });
  }

  // ==========================================
  // Configuration
  // ==========================================

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      this.config = await response.json();

      // Load hidden calendars from local storage
      const savedHidden = localStorage.getItem('calboard_hidden_calendars');
      if (savedHidden) {
        this.hiddenCalendars = new Set(JSON.parse(savedHidden));
      }

      // Load current view from local storage
      const savedView = localStorage.getItem('calboard_view');
      if (savedView) {
        this.currentView = savedView;
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      this.config = { display: {}, features: {}, accessibility: {} };
    }
  }

  // ==========================================
  // Theme System
  // ==========================================

  applyTheme() {
    const theme = this.config?.display?.theme || 'dark';
    document.body.className = `theme-${theme}`;

    // Apply high contrast if enabled
    if (this.config?.accessibility?.highContrast) {
      document.body.classList.add('high-contrast');
    }

    // Apply large text if enabled
    if (this.config?.accessibility?.largeText) {
      document.body.classList.add('large-text');
    }

    // Apply reduce motion if enabled
    if (this.config?.accessibility?.reduceMotion) {
      document.body.classList.add('reduce-motion');
    }
  }

  applyCustomCSS() {
    const customCSS = this.config?.display?.customCSS;
    if (customCSS) {
      document.getElementById('custom-css').textContent = customCSS;
    }
  }

  applyAccessibility() {
    // Set aria labels and roles
    document.getElementById('time').setAttribute('aria-label', 'Current time');
    document.getElementById('date').setAttribute('aria-label', 'Current date');
    document.getElementById('current-temp').setAttribute('aria-label', 'Current temperature');
  }

  // ==========================================
  // Connection Monitoring
  // ==========================================

  setupConnectionMonitoring() {
    const statusEl = document.getElementById('connection-status');

    const updateStatus = () => {
      this.isOnline = navigator.onLine;
      if (this.isOnline) {
        statusEl.classList.remove('offline');
        statusEl.classList.add('online');
        statusEl.querySelector('.status-text').textContent = 'Online';
      } else {
        statusEl.classList.remove('online');
        statusEl.classList.add('offline');
        statusEl.querySelector('.status-text').textContent = 'Offline';
      }
    };

    window.addEventListener('online', () => {
      updateStatus();
      // Refresh data when back online
      this.loadWeather();
      this.loadCalendar();
    });

    window.addEventListener('offline', updateStatus);
    updateStatus();

    // Hide status after 5 seconds if online
    setTimeout(() => {
      if (this.isOnline) {
        statusEl.classList.add('hidden');
      }
    }, 5000);
  }

  // ==========================================
  // Wake Lock (Screen Stay On)
  // ==========================================

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');

        this.wakeLock.addEventListener('release', () => {
          console.log('Wake lock released');
        });
      } catch (err) {
        console.log('Wake lock request failed:', err.message);
      }
    }
  }

  // ==========================================
  // Service Worker (Offline Mode)
  // ==========================================

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration.scope);
      } catch (err) {
        console.log('Service Worker registration failed:', err);
      }
    }
  }

  // ==========================================
  // Background Image/Slideshow
  // ==========================================

  setupBackground() {
    const bgElement = document.getElementById('background-image');
    const config = this.config?.display;

    if (config?.backgroundSlideshow && config?.backgroundImages?.length > 1) {
      // Start slideshow
      this.showBackgroundImage(bgElement, config.backgroundImages[0]);
      this.slideshowInterval = setInterval(() => {
        this.slideshowIndex = (this.slideshowIndex + 1) % config.backgroundImages.length;
        this.showBackgroundImage(bgElement, config.backgroundImages[this.slideshowIndex]);
      }, (config.slideshowInterval || 30) * 1000);
    } else if (config?.backgroundImage) {
      this.showBackgroundImage(bgElement, config.backgroundImage);
    }
  }

  showBackgroundImage(element, imagePath) {
    if (element && imagePath) {
      element.style.backgroundImage = `url('${imagePath}')`;
    }
  }

  // ==========================================
  // Clock
  // ==========================================

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

  // ==========================================
  // Weather
  // ==========================================

  async loadWeather() {
    try {
      const response = await fetch('/api/weather');
      if (!response.ok) throw new Error('Weather API error');

      this.weatherData = await response.json();
      this.renderWeather();

      // Cache for offline
      if (this.config?.features?.offlineMode) {
        localStorage.setItem('calboard_weather_cache', JSON.stringify(this.weatherData));
      }
    } catch (err) {
      console.error('Failed to load weather:', err);

      // Try to load from cache
      const cached = localStorage.getItem('calboard_weather_cache');
      if (cached) {
        this.weatherData = JSON.parse(cached);
        this.renderWeather();
      } else {
        this.renderWeatherError(err.message);
      }
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

    // Feels like temperature
    const feelsLikeEl = document.getElementById('feels-like');
    if (feelsLikeEl) {
      feelsLikeEl.querySelector('.feels-like-value').textContent = `${data.current.feelsLike}°`;
      // Only show if different from actual temp
      feelsLikeEl.style.display = Math.abs(data.current.temp - data.current.feelsLike) > 2 ? 'flex' : 'none';
    }

    // Sunrise
    const sunriseTime = new Date(data.current.sunrise);
    document.getElementById('sunrise').textContent = this.formatTime(sunriseTime);

    // Sunset
    const sunsetTime = new Date(data.current.sunset);
    document.getElementById('sunset').textContent = this.formatTime(sunsetTime);

    // Wind
    const windUnit = data.units === 'imperial' ? 'mph' : 'm/s';
    document.getElementById('wind').textContent = `${data.current.windSpeed} ${windUnit}`;

    // Humidity
    document.getElementById('humidity').textContent = `${data.current.humidity}%`;

    // Air Quality
    this.renderAirQuality(data.airQuality);

    // Weather Alerts
    this.renderWeatherAlerts(data.alerts);

    // Additional Locations
    this.renderAdditionalLocations(data.additionalLocations);

    // Forecast
    this.renderForecast(data.forecast);
  }

  renderAirQuality(airQuality) {
    const container = document.getElementById('air-quality');
    if (!airQuality || !this.config?.weather?.showAirQuality) {
      container.style.display = 'none';
      return;
    }

    const aqiLabels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiColors = ['', '#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336'];

    document.getElementById('aqi-value').textContent = airQuality.aqi;
    document.getElementById('aqi-value').style.color = aqiColors[airQuality.aqi] || '#fff';
    document.getElementById('aqi-text').textContent = aqiLabels[airQuality.aqi] || '';

    container.style.display = 'flex';
  }

  renderWeatherAlerts(alerts) {
    const container = document.getElementById('weather-alerts');

    if (!alerts || alerts.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.innerHTML = alerts.map(alert => `
      <div class="alert-item">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">
          <strong>${this.escapeHtml(alert.event)}</strong>
          <span class="alert-time">Until ${this.formatTime(new Date(alert.end))}</span>
        </div>
        <button class="alert-dismiss" onclick="this.parentElement.remove()">×</button>
      </div>
    `).join('');

    container.style.display = 'block';

    // Voice announcement for severe alerts
    if (this.config?.features?.voiceAnnouncements) {
      this.announceAlert(alerts[0]);
    }
  }

  renderAdditionalLocations(locations) {
    const container = document.getElementById('additional-locations');

    if (!locations || locations.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.innerHTML = `
      <div class="locations-title">Other Locations</div>
      ${locations.map(loc => {
        if (loc.error) {
          return `<div class="location-item error">${this.escapeHtml(loc.name)}: --</div>`;
        }
        return `
          <div class="location-item">
            <span class="location-name">${this.escapeHtml(loc.name)}</span>
            <span class="location-temp">${loc.temp}°</span>
            ${this.getWeatherIcon(loc.icon, null, 24)}
          </div>
        `;
      }).join('')}
    `;

    container.style.display = 'block';
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
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    return `<img src="${iconUrl}" alt="weather" style="width: ${size}px; height: ${size}px;" loading="lazy">`;
  }

  renderWeatherError(message) {
    document.getElementById('current-temp').textContent = '--';
    document.getElementById('forecast').innerHTML = `
      <div class="error">Weather unavailable: ${message}</div>
    `;
  }

  // ==========================================
  // Calendar
  // ==========================================

  async loadCalendar() {
    try {
      const response = await fetch('/api/calendars');
      if (!response.ok) throw new Error('Calendar API error');

      this.calendarData = await response.json();
      this.renderCalendar();
      this.renderCountdowns();
      this.updateTodayBadge();

      // Cache for offline
      if (this.config?.features?.offlineMode) {
        localStorage.setItem('calboard_calendar_cache', JSON.stringify(this.calendarData));
      }
    } catch (err) {
      console.error('Failed to load calendar:', err);

      // Try to load from cache
      const cached = localStorage.getItem('calboard_calendar_cache');
      if (cached) {
        this.calendarData = JSON.parse(cached);
        this.renderCalendar();
        this.renderCountdowns();
        this.updateTodayBadge();
      } else {
        this.renderCalendarError(err.message);
      }
    }
  }

  updateTodayBadge() {
    const badge = document.getElementById('today-badge');
    if (!badge || !this.config?.display?.showTodayBadge) {
      badge.style.display = 'none';
      return;
    }

    const count = this.calendarData?.todayEventCount || 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    badge.title = `${count} event${count !== 1 ? 's' : ''} today`;
  }

  renderCalendarFilters() {
    const container = document.getElementById('calendar-filters');
    if (!container || !this.config?.calendarNames) return;

    container.innerHTML = this.config.calendarNames.map(cal => `
      <label class="filter-item" style="--cal-color: ${cal.color}">
        <input type="checkbox" ${!this.hiddenCalendars.has(cal.name) ? 'checked' : ''} data-calendar="${this.escapeHtml(cal.name)}">
        <span class="filter-color" style="background-color: ${cal.color}"></span>
        <span class="filter-name">${this.escapeHtml(cal.name)}</span>
      </label>
    `).join('');

    // Bind filter events
    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const calName = e.target.dataset.calendar;
        if (e.target.checked) {
          this.hiddenCalendars.delete(calName);
        } else {
          this.hiddenCalendars.add(calName);
        }
        localStorage.setItem('calboard_hidden_calendars', JSON.stringify([...this.hiddenCalendars]));
        this.renderCalendar();
      });
    });
  }

  setupViewToggle() {
    const buttons = document.querySelectorAll('.view-btn');
    buttons.forEach(btn => {
      if (btn.dataset.view === this.currentView) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }

      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.currentView = view;
        localStorage.setItem('calboard_view', view);

        buttons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        this.renderCalendar();
      });
    });
  }

  renderCalendar() {
    if (this.currentView === 'week') {
      this.renderWeekView();
    } else {
      this.renderListView();
    }
  }

  renderListView() {
    const container = document.getElementById('calendar-section');
    const weekView = document.getElementById('week-view');
    const data = this.calendarData;

    container.style.display = 'block';
    weekView.style.display = 'none';

    if (!data || !data.events || data.events.length === 0) {
      container.innerHTML = '<div class="no-events">No upcoming events</div>';
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    container.innerHTML = '';

    data.events.forEach(dayGroup => {
      // Filter hidden calendars
      const filteredEvents = dayGroup.events.filter(e => !this.hiddenCalendars.has(e.calendar));
      if (filteredEvents.length === 0) return;

      const dayDate = new Date(dayGroup.date + 'T12:00:00');
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';

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
          ${this.renderEvents(filteredEvents)}
        </div>
      `;

      container.appendChild(dayEl);
    });
  }

  renderWeekView() {
    const container = document.getElementById('calendar-section');
    const weekView = document.getElementById('week-view');
    const data = this.calendarData;

    container.style.display = 'none';
    weekView.style.display = 'grid';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Generate 7 days starting from today
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    weekView.innerHTML = days.map(date => {
      const dateKey = date.toISOString().split('T')[0];
      const dayGroup = data?.events?.find(g => g.date === dateKey);
      const events = dayGroup?.events?.filter(e => !this.hiddenCalendars.has(e.calendar)) || [];
      const isToday = date.toDateString() === today.toDateString();

      return `
        <div class="week-day ${isToday ? 'today' : ''}">
          <div class="week-day-header">
            <span class="week-day-name">${dayNames[date.getDay()]}</span>
            <span class="week-day-number">${date.getDate()}</span>
          </div>
          <div class="week-day-events">
            ${events.slice(0, 5).map(event => `
              <div class="week-event ${event.eventType}" style="border-left-color: ${event.color}">
                <span class="week-event-time">${event.allDay ? '' : this.formatEventTime(event.start)}</span>
                <span class="week-event-title">${this.escapeHtml(event.title)}</span>
              </div>
            `).join('')}
            ${events.length > 5 ? `<div class="week-more">+${events.length - 5} more</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  renderEvents(events) {
    if (!events || events.length === 0) {
      return '<div class="no-events">No events</div>';
    }

    const showDuration = this.config?.display?.showEventDuration;

    return events.map(event => {
      const timeStr = event.allDay ? 'All day' : this.formatEventTime(event.start);
      const durationStr = showDuration && !event.allDay ? `<span class="event-duration">${event.durationFormatted}</span>` : '';
      const eventTypeClass = event.eventType !== 'regular' ? `event-type-${event.eventType}` : '';
      const eventTypeIcon = this.getEventTypeIcon(event.eventType);

      return `
        <div class="event ${eventTypeClass}">
          <div class="event-color" style="background-color: ${event.color || '#4CAF50'}"></div>
          <div class="event-time">${timeStr}${durationStr}</div>
          <div class="event-details">
            <div class="event-title">${eventTypeIcon}${this.escapeHtml(event.title)}</div>
            ${event.location ? `<div class="event-location">${this.escapeHtml(event.location)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  getEventTypeIcon(type) {
    switch (type) {
      case 'birthday': return '<span class="event-icon">🎂</span>';
      case 'anniversary': return '<span class="event-icon">💑</span>';
      case 'holiday': return '<span class="event-icon">🎉</span>';
      default: return '';
    }
  }

  renderCountdowns() {
    const container = document.getElementById('countdowns');
    if (!container || !this.config?.display?.showEventCountdown) {
      container.style.display = 'none';
      return;
    }

    const important = this.calendarData?.importantUpcoming || [];
    if (important.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.innerHTML = `
      <div class="countdowns-title">Coming Up</div>
      ${important.slice(0, 3).map(event => `
        <div class="countdown-item ${event.eventType}">
          <span class="countdown-icon">${this.getEventTypeIcon(event.eventType)}</span>
          <span class="countdown-title">${this.escapeHtml(event.title)}</span>
          <span class="countdown-days">${event.daysUntil === 0 ? 'Today' : event.daysUntil === 1 ? 'Tomorrow' : `${event.daysUntil} days`}</span>
        </div>
      `).join('')}
    `;

    container.style.display = 'block';
  }

  renderCalendarError(message) {
    const container = document.getElementById('calendar-section');
    container.innerHTML = `<div class="error">Calendar unavailable: ${message}</div>`;
  }

  // ==========================================
  // Voice Announcements
  // ==========================================

  announceAlert(alert) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Weather alert: ${alert.event}`);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }

  // ==========================================
  // Touch Gestures
  // ==========================================

  setupTouchGestures() {
    const dashboard = document.querySelector('.dashboard');

    dashboard.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    dashboard.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - this.touchStartX;
      const deltaY = touchEndY - this.touchStartY;

      // Minimum swipe distance
      const minSwipe = 50;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipe) {
        if (deltaX > 0) {
          // Swipe right - previous view
          this.swipeRight();
        } else {
          // Swipe left - next view
          this.swipeLeft();
        }
      } else if (Math.abs(deltaY) > minSwipe) {
        if (deltaY > 0) {
          // Swipe down - refresh
          this.loadWeather();
          this.loadCalendar();
        }
      }
    }, { passive: true });
  }

  swipeLeft() {
    // Could switch to week view or next day
    if (this.currentView === 'list') {
      this.currentView = 'week';
      localStorage.setItem('calboard_view', 'week');
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.view-btn[data-view="week"]')?.classList.add('active');
      this.renderCalendar();
    }
  }

  swipeRight() {
    // Could switch to list view or previous day
    if (this.currentView === 'week') {
      this.currentView = 'list';
      localStorage.setItem('calboard_view', 'list');
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.view-btn[data-view="list"]')?.classList.add('active');
      this.renderCalendar();
    }
  }

  // ==========================================
  // Kiosk Mode
  // ==========================================

  toggleKioskMode() {
    document.body.classList.toggle('kiosk-mode');
    if (document.documentElement.requestFullscreen) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }

  // ==========================================
  // Utility Functions
  // ==========================================

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
