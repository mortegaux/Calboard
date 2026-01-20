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
    this.hiddenProfiles = new Set();
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

    // Load widgets
    await this.loadWidgets();

    // Apply layout customization
    this.applyLayout();

    // Set up auto-refresh
    const refreshMinutes = this.config?.display?.refreshIntervalMinutes || 5;
    this.refreshInterval = setInterval(() => {
      this.loadWeather();
      this.loadCalendar();
      this.loadWidgets();
    }, refreshMinutes * 60 * 1000);

    // Check screensaver mode periodically
    this.checkScreensaver();
    setInterval(() => this.checkScreensaver(), 60000);

    // Set background image/slideshow
    this.setupBackground();

    // Set up calendar filters
    this.renderCalendarFilters();

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
      const savedHidden = localStorage.getItem('calboard_hidden_profiles');
      if (savedHidden) {
        this.hiddenProfiles = new Set(JSON.parse(savedHidden));
      }

      // Always use list view (week view removed for TV display)
      this.currentView = 'list';
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
  // Layout Customization
  // ==========================================

  applyLayout() {
    const layout = this.config?.display?.layout;

    // If no layout config or no custom widgets, use default auto-flow
    if (!layout || !layout.widgets || Object.keys(layout.widgets).length === 0) {
      return;
    }

    // Apply section order if specified
    if (layout.sectionOrder && Array.isArray(layout.sectionOrder)) {
      this.applySectionOrder(layout.sectionOrder);
    }

    // Apply widget grid layout
    this.applyWidgetLayout(layout);

    // Apply panel settings
    if (layout.panels) {
      this.applyPanelSettings(layout.panels);
    }
  }

  applySectionOrder(order) {
    // Note: This is a simplified implementation
    // For full section reordering, the HTML structure needs to support it
    // Currently this just adds CSS order properties
    const sectionMap = {
      'weather': document.querySelector('.weather-panel'),
      'calendar': document.querySelector('.calendar-section'),
      'widgets': document.querySelector('.widgets-section')
    };

    order.forEach((sectionName, index) => {
      const section = sectionMap[sectionName];
      if (section) {
        section.style.order = index;
      }
    });
  }

  applyWidgetLayout(layout) {
    const widgetsSection = document.getElementById('widgets-section');
    if (!widgetsSection) return;

    const { grid, widgets } = layout;

    // Apply grid settings
    if (grid) {
      widgetsSection.style.display = 'grid';
      widgetsSection.style.gridTemplateColumns = `repeat(${grid.columns || 3}, 1fr)`;
      widgetsSection.style.gap = grid.gap || '15px';
      widgetsSection.style.gridAutoRows = 'minmax(150px, auto)';

      // Set min width on grid items
      if (grid.minWidgetWidth) {
        const style = document.createElement('style');
        style.textContent = `
          #widgets-section > * {
            min-width: ${grid.minWidgetWidth};
          }
        `;
        document.head.appendChild(style);
      }
    }

    // Apply individual widget positions
    for (const [widgetId, position] of Object.entries(widgets)) {
      // Widget IDs in config use camelCase, but HTML IDs use kebab-case
      const widgetEl = document.getElementById(widgetId) ||
                       document.getElementById(this.camelToKebab(widgetId));

      if (!widgetEl) continue;

      // Apply grid positioning
      if (position.column && position.colSpan) {
        widgetEl.style.gridColumn = `${position.column} / span ${position.colSpan}`;
      }
      if (position.row && position.rowSpan) {
        widgetEl.style.gridRow = `${position.row} / span ${position.rowSpan}`;
      }
    }
  }

  applyPanelSettings(panels) {
    const weatherPanel = document.querySelector('.weather-panel');
    if (!weatherPanel) return;

    if (panels.weatherWidth) {
      weatherPanel.style.width = panels.weatherWidth;
      weatherPanel.style.maxWidth = panels.weatherWidth;
    }
    if (panels.weatherMinWidth) {
      weatherPanel.style.minWidth = panels.weatherMinWidth;
    }
  }

  camelToKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
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
    if (!container || !this.config?.profiles) return;

    container.innerHTML = this.config.profiles.map(profile => `
      <label class="filter-item" style="--cal-color: ${profile.color}">
        <input type="checkbox" ${!this.hiddenProfiles.has(profile.id) ? 'checked' : ''} data-profile-id="${this.escapeHtml(profile.id)}">
        <span class="filter-color" style="background-color: ${profile.color}"></span>
        <span class="filter-name">${this.escapeHtml(profile.name)}</span>
      </label>
    `).join('');

    // Bind filter events
    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const profileId = e.target.dataset.profileId;
        if (e.target.checked) {
          this.hiddenProfiles.delete(profileId);
        } else {
          this.hiddenProfiles.add(profileId);
        }
        localStorage.setItem('calboard_hidden_profiles', JSON.stringify([...this.hiddenProfiles]));
        this.renderCalendar();
      });
    });
  }

  renderCalendar() {
    // Always render list view (week view removed for TV display)
    this.renderListView();
  }

  renderListView() {
    const container = document.getElementById('calendar-section');
    const data = this.calendarData;

    container.style.display = 'block';

    if (!data || !data.events || data.events.length === 0) {
      container.innerHTML = '<div class="no-events">No upcoming events</div>';
      return;
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 30 minutes ago for the event filter
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    container.innerHTML = '';

    data.events.forEach(dayGroup => {
      const dayDate = new Date(dayGroup.date + 'T12:00:00');

      // Skip past days (before today)
      if (dayDate < today) return;

      const isToday = dayDate.toDateString() === today.toDateString();

      // Filter hidden profiles
      let filteredEvents = dayGroup.events.filter(e => !this.hiddenProfiles.has(e.profileId));

      // For today, filter out events that ended more than 30 minutes ago
      if (isToday) {
        filteredEvents = filteredEvents.filter(event => {
          if (event.allDay) return true; // Keep all-day events

          // Parse event end time
          const eventEnd = new Date(event.end);

          // Keep event if it hasn't ended yet, or ended less than 30 minutes ago
          return eventEnd > thirtyMinutesAgo;
        });
      }

      // Skip days with no events after filtering
      if (filteredEvents.length === 0) return;

      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';

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
      const events = dayGroup?.events?.filter(e => !this.hiddenProfiles.has(e.profileId)) || [];
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
    // Swipe gestures disabled for TV display
  }

  swipeRight() {
    // Swipe gestures disabled for TV display
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

  // ==========================================
  // Widget System
  // ==========================================

  async loadWidgets() {
    try {
      const response = await fetch('/api/widgets');
      const widgets = await response.json();

      // Load enabled widgets - Original
      if (widgets.quotes?.enabled) this.loadQuote();
      if (widgets.moonPhase?.enabled) this.loadMoonPhase();
      if (widgets.news?.enabled) this.loadNews();
      if (widgets.wordOfDay?.enabled) this.loadWordOfDay();
      if (widgets.jokeOfDay?.enabled) this.loadJoke();
      if (widgets.onThisDay?.enabled) this.loadOnThisDay();
      if (widgets.stocks?.enabled) this.loadStocks();
      if (widgets.crypto?.enabled) this.loadCrypto();
      if (widgets.sports?.enabled) this.loadSports();
      if (widgets.tasks?.enabled) this.loadTasks();
      if (widgets.groceryList?.enabled) this.loadGrocery();
      if (widgets.messageBoard?.enabled) this.loadMessages();
      if (widgets.homeAssistant?.enabled) this.loadHomeAssistant();
      if (widgets.systemStats?.enabled) this.loadSystemStats();

      // New widgets - Phase 11: Time & Countdowns
      if (widgets.worldClocks?.enabled) this.loadWorldClocks();
      if (widgets.eventCountdowns?.enabled) this.loadEventCountdowns();
      if (widgets.pomodoroTimer?.enabled) this.loadPomodoro();

      // Phase 12: Health & Wellness
      if (widgets.habitTracker?.enabled) this.loadHabits();
      if (widgets.waterIntake?.enabled) this.loadWaterIntake();
      if (widgets.sleepSchedule?.enabled) this.loadSleepSchedule();

      // Phase 13: Daily Content
      if (widgets.recipeOfDay?.enabled) this.loadRecipe();
      if (widgets.affirmations?.enabled) this.loadAffirmation();
      if (widgets.horoscope?.enabled) this.loadHoroscope();
      if (widgets.trivia?.enabled) this.loadTrivia();

      // Phase 14: Home Management
      if (widgets.garbageDay?.enabled) this.loadGarbageDay();
      if (widgets.mealPlanner?.enabled) this.loadMealPlanner();
      if (widgets.petFeeding?.enabled) this.loadPetFeeding();
      if (widgets.plantWatering?.enabled) this.loadPlantWatering();
      if (widgets.laundryTimer?.enabled) this.loadLaundryTimer();

      // Phase 15: Entertainment
      if (widgets.redditFeed?.enabled) this.loadReddit();

      // Phase 16: Finance Extended
      if (widgets.currencyExchange?.enabled) this.loadCurrency();
      if (widgets.budgetTracker?.enabled) this.loadBudget();
    } catch (err) {
      console.error('Failed to load widgets:', err);
    }
  }

  async loadQuote() {
    try {
      const response = await fetch('/api/widgets/quote');
      const data = await response.json();

      if (data.enabled && data.quote) {
        const widget = document.getElementById('quote-widget');
        document.getElementById('quote-text').textContent = data.quote;
        document.getElementById('quote-author').textContent = data.author;
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Quote widget error:', err);
    }
  }

  async loadMoonPhase() {
    try {
      const response = await fetch('/api/widgets/moon');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('moon-widget');
        document.getElementById('moon-icon').textContent = data.icon;
        document.getElementById('moon-phase').textContent = data.phase;
        widget.style.display = 'flex';
      }
    } catch (err) {
      console.error('Moon widget error:', err);
    }
  }

  async loadNews() {
    try {
      const response = await fetch('/api/widgets/news');
      const data = await response.json();

      if (data.enabled && data.items?.length) {
        const widget = document.getElementById('news-widget');
        const container = document.getElementById('news-items');

        container.innerHTML = data.items.map(item => `
          <div class="news-item" onclick="window.open('${item.link}', '_blank')">
            <div class="news-item-title">${this.escapeHtml(item.title)}</div>
            <div class="news-item-source">${this.escapeHtml(item.source)}</div>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('News widget error:', err);
    }
  }

  async loadWordOfDay() {
    try {
      const response = await fetch('/api/widgets/word');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('word-widget');
        document.getElementById('word-word').textContent = data.word;
        document.getElementById('word-pos').textContent = data.partOfSpeech;
        document.getElementById('word-definition').textContent = data.definition;
        document.getElementById('word-example').textContent = data.example;
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Word widget error:', err);
    }
  }

  async loadJoke() {
    try {
      const response = await fetch('/api/widgets/joke');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('joke-widget');
        document.getElementById('joke-setup').textContent = data.setup;
        document.getElementById('joke-punchline').textContent = data.punchline;
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Joke widget error:', err);
    }
  }

  async loadOnThisDay() {
    try {
      const response = await fetch('/api/widgets/onthisday');
      const data = await response.json();

      if (data.enabled && data.events?.length) {
        const widget = document.getElementById('history-widget');
        const container = document.getElementById('history-events');

        container.innerHTML = data.events.map(event => `
          <div class="history-event">
            <span class="history-year">${event.year}</span>
            <span class="history-text">${this.escapeHtml(event.text)}</span>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('History widget error:', err);
    }
  }

  async loadStocks() {
    try {
      const response = await fetch('/api/widgets/stocks');
      const data = await response.json();

      if (data.enabled && data.stocks?.length) {
        const widget = document.getElementById('stocks-widget');
        const container = document.getElementById('stocks-list');

        container.innerHTML = data.stocks.map(stock => {
          const changeClass = parseFloat(stock.change) >= 0 ? 'positive' : 'negative';
          const changeSign = parseFloat(stock.change) >= 0 ? '+' : '';
          return `
            <div class="stock-item">
              <span class="stock-symbol">${stock.symbol}</span>
              <span class="stock-price">$${stock.price}</span>
              <span class="stock-change ${changeClass}">${changeSign}${stock.change}</span>
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Stocks widget error:', err);
    }
  }

  async loadCrypto() {
    try {
      const response = await fetch('/api/widgets/crypto');
      const data = await response.json();

      if (data.enabled && data.coins?.length) {
        const widget = document.getElementById('crypto-widget');
        const container = document.getElementById('crypto-list');

        container.innerHTML = data.coins.map(coin => {
          const change = parseFloat(coin.change24h);
          const changeClass = change >= 0 ? 'positive' : 'negative';
          const changeSign = change >= 0 ? '+' : '';
          return `
            <div class="crypto-item">
              <span class="crypto-name">${coin.name}</span>
              <span class="crypto-price">$${coin.price}</span>
              <span class="crypto-change ${changeClass}">${changeSign}${change.toFixed(1)}%</span>
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Crypto widget error:', err);
    }
  }

  async loadSports() {
    try {
      const response = await fetch('/api/widgets/sports');
      const data = await response.json();

      if (data.enabled && data.leagues?.length) {
        const widget = document.getElementById('sports-widget');
        const container = document.getElementById('sports-scores');

        container.innerHTML = data.leagues.map(league => {
          if (league.error || !league.events?.length) return '';
          return `
            <div class="sports-league">
              <div class="sports-league-name">${league.league}</div>
              ${league.events.map(game => `
                <div class="sports-game">
                  <div class="sports-teams">
                    <span>${game.awayTeam}</span>
                    <span>${game.homeTeam}</span>
                  </div>
                  <div class="sports-score">
                    <span>${game.awayScore || '-'}</span>
                    <span>${game.homeScore || '-'}</span>
                  </div>
                  <div class="sports-status">${game.status}</div>
                </div>
              `).join('')}
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Sports widget error:', err);
    }
  }

  async loadTasks() {
    try {
      const response = await fetch('/api/widgets/tasks');
      const data = await response.json();

      if (data.enabled && data.lists?.length) {
        const widget = document.getElementById('tasks-widget');
        const container = document.getElementById('tasks-list');

        const allTasks = data.lists.flatMap(list => list.items || []);

        container.innerHTML = allTasks.slice(0, 10).map(task => `
          <div class="task-item ${task.completed ? 'completed' : ''}">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}
              onchange="calboard.toggleTask('${task.id}', this.checked)">
            <span class="task-text">${this.escapeHtml(task.text)}</span>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Tasks widget error:', err);
    }
  }

  async toggleTask(id, completed) {
    try {
      await fetch(`/api/widgets/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  }

  async loadGrocery() {
    try {
      const response = await fetch('/api/widgets/grocery');
      const data = await response.json();

      if (data.enabled && data.items?.length) {
        const widget = document.getElementById('grocery-widget');
        const container = document.getElementById('grocery-items');

        container.innerHTML = data.items.map(item => `
          <div class="grocery-item ${item.checked ? 'checked' : ''}">
            <input type="checkbox" class="grocery-checkbox" ${item.checked ? 'checked' : ''}
              onchange="calboard.toggleGrocery('${item.id}', this.checked)">
            <span class="grocery-name">${this.escapeHtml(item.name)}</span>
            <span class="grocery-qty">${item.quantity > 1 ? 'x' + item.quantity : ''}</span>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Grocery widget error:', err);
    }
  }

  async toggleGrocery(id, checked) {
    try {
      await fetch(`/api/widgets/grocery/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked })
      });
    } catch (err) {
      console.error('Toggle grocery error:', err);
    }
  }

  async loadMessages() {
    try {
      const response = await fetch('/api/widgets/messages');
      const data = await response.json();

      if (data.enabled && data.messages?.length) {
        const widget = document.getElementById('messages-widget');
        const container = document.getElementById('messages-list');

        container.innerHTML = data.messages.slice(0, 5).map(msg => {
          const date = new Date(msg.timestamp);
          const timeAgo = this.getTimeAgo(date);
          return `
            <div class="message-item">
              <div class="message-text">${this.escapeHtml(msg.text)}</div>
              <div class="message-meta">
                <span>${this.escapeHtml(msg.author)}</span>
                <span>${timeAgo}</span>
              </div>
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Messages widget error:', err);
    }
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }

  async loadHomeAssistant() {
    try {
      const response = await fetch('/api/widgets/homeassistant');
      const data = await response.json();

      if (data.enabled && data.entities?.length) {
        const widget = document.getElementById('ha-widget');
        const container = document.getElementById('ha-entities');

        container.innerHTML = data.entities.map(entity => {
          const isOn = entity.state === 'on';
          const icon = this.getHAIcon(entity.entityId, isOn);
          return `
            <div class="ha-entity ${isOn ? 'on' : ''}" onclick="calboard.toggleHA('${entity.entityId}')">
              <span class="ha-entity-icon">${icon}</span>
              <span class="ha-entity-name">${this.escapeHtml(entity.friendlyName)}</span>
              <span class="ha-entity-state">${entity.state}${entity.unitOfMeasurement || ''}</span>
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Home Assistant widget error:', err);
    }
  }

  getHAIcon(entityId, isOn) {
    if (entityId.startsWith('light.')) return isOn ? '💡' : '🔌';
    if (entityId.startsWith('switch.')) return isOn ? '🔵' : '⚫';
    if (entityId.startsWith('sensor.')) return '📊';
    if (entityId.startsWith('climate.')) return '🌡️';
    if (entityId.startsWith('lock.')) return isOn ? '🔒' : '🔓';
    if (entityId.startsWith('cover.')) return '🪟';
    return '⚡';
  }

  async toggleHA(entityId) {
    try {
      await fetch('/api/widgets/homeassistant/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId })
      });
      // Reload HA widget after toggle
      setTimeout(() => this.loadHomeAssistant(), 500);
    } catch (err) {
      console.error('HA toggle error:', err);
    }
  }

  async loadSystemStats() {
    try {
      const response = await fetch('/api/widgets/system');
      const data = await response.json();

      if (data.enabled && data.stats) {
        const widget = document.getElementById('system-widget');
        const container = document.getElementById('system-stats');
        const stats = data.stats;

        let html = '';
        if (stats.cpuUsage !== null) {
          html += `
            <div class="stat-item">
              <span class="stat-icon">💻</span>
              <span class="stat-value">${stats.cpuUsage}%</span>
              <span class="stat-label">CPU</span>
            </div>
          `;
        }
        if (stats.memoryUsage !== null) {
          html += `
            <div class="stat-item">
              <span class="stat-icon">🧠</span>
              <span class="stat-value">${stats.memoryUsage}%</span>
              <span class="stat-label">Memory</span>
            </div>
          `;
        }
        if (stats.cpuTemp !== null) {
          html += `
            <div class="stat-item">
              <span class="stat-icon">🌡️</span>
              <span class="stat-value">${stats.cpuTemp}°C</span>
              <span class="stat-label">Temp</span>
            </div>
          `;
        }
        if (stats.uptime !== null) {
          html += `
            <div class="stat-item">
              <span class="stat-icon">⏱️</span>
              <span class="stat-value">${stats.uptime}</span>
              <span class="stat-label">Uptime</span>
            </div>
          `;
        }

        container.innerHTML = html;
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('System stats widget error:', err);
    }
  }

  // ==========================================
  // New Widgets - Phase 11-16
  // ==========================================

  async loadWorldClocks() {
    try {
      const response = await fetch('/api/widgets/worldclocks');
      const data = await response.json();

      if (data.enabled && data.clocks?.length) {
        const widget = document.getElementById('clocks-widget');
        const container = document.getElementById('world-clocks');

        container.innerHTML = data.clocks.map(clock => {
          if (clock.error) {
            return `<div class="clock-item error">${this.escapeHtml(clock.name)}: Error</div>`;
          }
          return `
            <div class="clock-item">
              <span class="clock-name">${this.escapeHtml(clock.name)}</span>
              <span class="clock-time">${clock.time}</span>
              <span class="clock-day">${clock.day}</span>
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('World clocks error:', err);
    }
  }

  async loadEventCountdowns() {
    try {
      const response = await fetch('/api/widgets/countdowns');
      const data = await response.json();

      if (data.enabled && data.countdowns?.length) {
        const widget = document.getElementById('countdown-widget');
        const container = document.getElementById('event-countdowns');

        container.innerHTML = data.countdowns.map(event => {
          const daysText = event.daysUntil === 0 ? 'Today!' :
                          event.daysUntil === 1 ? 'Tomorrow' :
                          `${event.daysUntil} days`;
          return `
            <div class="countdown-event">
              <span class="countdown-event-icon">${event.icon}</span>
              <span class="countdown-event-name">${this.escapeHtml(event.name)}</span>
              <span class="countdown-event-days ${event.daysUntil <= 1 ? 'soon' : ''}">${daysText}</span>
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Event countdowns error:', err);
    }
  }

  async loadPomodoro() {
    try {
      const response = await fetch('/api/widgets/pomodoro');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('pomodoro-widget');
        this.pomodoroSettings = data;
        this.pomodoroState = {
          running: false,
          mode: 'work',
          seconds: data.workMinutes * 60,
          sessions: 0
        };

        this.updatePomodoroDisplay();
        this.setupPomodoroControls();
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Pomodoro error:', err);
    }
  }

  setupPomodoroControls() {
    const startBtn = document.getElementById('pomodoro-start');
    const resetBtn = document.getElementById('pomodoro-reset');

    startBtn.onclick = () => {
      if (this.pomodoroState.running) {
        this.pausePomodoro();
      } else {
        this.startPomodoro();
      }
    };

    resetBtn.onclick = () => this.resetPomodoro();
  }

  startPomodoro() {
    this.pomodoroState.running = true;
    document.getElementById('pomodoro-start').textContent = 'Pause';
    document.getElementById('pomodoro-status').textContent =
      this.pomodoroState.mode === 'work' ? 'Focus time!' : 'Break time';

    this.pomodoroInterval = setInterval(() => {
      this.pomodoroState.seconds--;
      this.updatePomodoroDisplay();

      if (this.pomodoroState.seconds <= 0) {
        this.pomodoroComplete();
      }
    }, 1000);
  }

  pausePomodoro() {
    this.pomodoroState.running = false;
    document.getElementById('pomodoro-start').textContent = 'Start';
    document.getElementById('pomodoro-status').textContent = 'Paused';
    clearInterval(this.pomodoroInterval);
  }

  resetPomodoro() {
    clearInterval(this.pomodoroInterval);
    this.pomodoroState.running = false;
    this.pomodoroState.mode = 'work';
    this.pomodoroState.seconds = this.pomodoroSettings.workMinutes * 60;
    document.getElementById('pomodoro-start').textContent = 'Start';
    document.getElementById('pomodoro-status').textContent = 'Ready to focus';
    this.updatePomodoroDisplay();
  }

  pomodoroComplete() {
    clearInterval(this.pomodoroInterval);
    this.pomodoroState.running = false;

    if (this.pomodoroState.mode === 'work') {
      this.pomodoroState.sessions++;
      const isLongBreak = this.pomodoroState.sessions % this.pomodoroSettings.sessionsUntilLongBreak === 0;
      this.pomodoroState.mode = 'break';
      this.pomodoroState.seconds = isLongBreak
        ? this.pomodoroSettings.longBreakMinutes * 60
        : this.pomodoroSettings.breakMinutes * 60;
      document.getElementById('pomodoro-status').textContent = isLongBreak ? 'Long break!' : 'Short break!';
    } else {
      this.pomodoroState.mode = 'work';
      this.pomodoroState.seconds = this.pomodoroSettings.workMinutes * 60;
      document.getElementById('pomodoro-status').textContent = 'Ready to focus';
    }

    document.getElementById('pomodoro-start').textContent = 'Start';
    this.updatePomodoroDisplay();

    // Play notification sound or show alert
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro', { body: document.getElementById('pomodoro-status').textContent });
    }
  }

  updatePomodoroDisplay() {
    const mins = Math.floor(this.pomodoroState.seconds / 60);
    const secs = this.pomodoroState.seconds % 60;
    document.getElementById('pomodoro-display').textContent =
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  async loadHabits() {
    try {
      const response = await fetch('/api/widgets/habits');
      const data = await response.json();

      if (data.enabled && data.habits?.length) {
        const widget = document.getElementById('habits-widget');
        const container = document.getElementById('habits-list');

        container.innerHTML = data.habits.map(habit => `
          <div class="habit-item ${habit.completedToday ? 'completed' : ''}">
            <input type="checkbox" class="habit-checkbox" ${habit.completedToday ? 'checked' : ''}
              onchange="calboard.toggleHabit('${habit.id}', this.checked)">
            <span class="habit-icon">${habit.icon || '✓'}</span>
            <span class="habit-name">${this.escapeHtml(habit.name)}</span>
            <span class="habit-streak" title="Current streak">${habit.streak || 0} day${habit.streak !== 1 ? 's' : ''}</span>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Habits error:', err);
    }
  }

  async toggleHabit(id, completed) {
    try {
      await fetch(`/api/widgets/habits/${id}/toggle`, { method: 'POST' });
      this.loadHabits();
    } catch (err) {
      console.error('Toggle habit error:', err);
    }
  }

  async loadWaterIntake() {
    try {
      const response = await fetch('/api/widgets/water');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('water-widget');
        const current = data.current || 0;
        const goal = data.dailyGoal || 8;
        const percent = Math.min(100, (current / goal) * 100);

        document.getElementById('water-current').textContent = current;
        document.getElementById('water-goal').textContent = goal;
        document.getElementById('water-progress').style.background =
          `linear-gradient(to right, #2196F3 ${percent}%, rgba(255,255,255,0.1) ${percent}%)`;

        document.getElementById('water-add').onclick = () => this.addWater();
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Water intake error:', err);
    }
  }

  async addWater() {
    try {
      await fetch('/api/widgets/water/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 1 })
      });
      this.loadWaterIntake();
    } catch (err) {
      console.error('Add water error:', err);
    }
  }

  async loadSleepSchedule() {
    try {
      const response = await fetch('/api/widgets/sleep');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('sleep-widget');
        document.getElementById('bedtime').textContent = data.bedtime;
        document.getElementById('waketime').textContent = data.wakeTime;

        const reminder = document.getElementById('sleep-reminder');
        if (data.showReminder) {
          reminder.style.display = 'block';
        } else {
          reminder.style.display = 'none';
        }

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Sleep schedule error:', err);
    }
  }

  async loadRecipe() {
    try {
      const response = await fetch('/api/widgets/recipe');
      const data = await response.json();

      if (data.enabled && data.recipe) {
        const widget = document.getElementById('recipe-widget');
        const recipe = data.recipe;

        document.getElementById('recipe-name').textContent = recipe.name;
        document.getElementById('recipe-time').textContent = recipe.time;
        document.getElementById('recipe-difficulty').textContent = recipe.difficulty;
        document.getElementById('recipe-ingredients').innerHTML = recipe.ingredients
          .map(i => `<span class="recipe-ingredient">${this.escapeHtml(i)}</span>`).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Recipe error:', err);
    }
  }

  async loadAffirmation() {
    try {
      const response = await fetch('/api/widgets/affirmation');
      const data = await response.json();

      if (data.enabled && data.affirmation) {
        const widget = document.getElementById('affirmation-widget');
        document.getElementById('affirmation-text').textContent = data.affirmation;
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Affirmation error:', err);
    }
  }

  async loadHoroscope() {
    try {
      const response = await fetch('/api/widgets/horoscope');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('horoscope-widget');
        document.getElementById('horoscope-emoji').textContent = data.emoji;
        document.getElementById('horoscope-sign').textContent = data.sign;
        document.getElementById('horoscope-text').textContent = data.horoscope;
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Horoscope error:', err);
    }
  }

  async loadTrivia() {
    try {
      const response = await fetch('/api/widgets/trivia');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('trivia-widget');
        document.getElementById('trivia-category').textContent = data.category;
        document.getElementById('trivia-question').textContent = data.question;
        document.getElementById('trivia-answer').textContent = data.answer;
        document.getElementById('trivia-answer').style.display = 'none';

        const revealBtn = document.getElementById('trivia-reveal');
        revealBtn.textContent = 'Reveal Answer';
        revealBtn.onclick = () => {
          const answerEl = document.getElementById('trivia-answer');
          if (answerEl.style.display === 'none') {
            answerEl.style.display = 'block';
            revealBtn.textContent = 'Hide Answer';
          } else {
            answerEl.style.display = 'none';
            revealBtn.textContent = 'Reveal Answer';
          }
        };

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Trivia error:', err);
    }
  }

  async loadGarbageDay() {
    try {
      const response = await fetch('/api/widgets/garbage');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('garbage-widget');
        const container = document.getElementById('garbage-schedule');

        let html = '';
        if (data.hasToday) {
          html += `<div class="garbage-alert today">Today: ${data.todayItems.map(i =>
            `<span class="garbage-type" style="color: ${i.color || '#666'}">${this.escapeHtml(i.type)}</span>`
          ).join(', ')}</div>`;
        }
        if (data.hasTomorrow) {
          html += `<div class="garbage-alert tomorrow">Tomorrow: ${data.tomorrowItems.map(i =>
            `<span class="garbage-type" style="color: ${i.color || '#666'}">${this.escapeHtml(i.type)}</span>`
          ).join(', ')}</div>`;
        }

        if (!data.hasToday && !data.hasTomorrow) {
          const next = data.schedule[0];
          html = `<div class="garbage-next">Next: ${this.escapeHtml(next.type)} on ${next.day}</div>`;
        }

        container.innerHTML = html;
        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Garbage day error:', err);
    }
  }

  async loadMealPlanner() {
    try {
      const response = await fetch('/api/widgets/meals');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('meals-widget');
        const container = document.getElementById('meals-content');
        const today = data.today || {};

        container.innerHTML = `
          <div class="meal-item">
            <span class="meal-icon">🌅</span>
            <span class="meal-label">Breakfast</span>
            <span class="meal-value">${this.escapeHtml(today.breakfast) || '—'}</span>
          </div>
          <div class="meal-item">
            <span class="meal-icon">☀️</span>
            <span class="meal-label">Lunch</span>
            <span class="meal-value">${this.escapeHtml(today.lunch) || '—'}</span>
          </div>
          <div class="meal-item">
            <span class="meal-icon">🌙</span>
            <span class="meal-label">Dinner</span>
            <span class="meal-value">${this.escapeHtml(today.dinner) || '—'}</span>
          </div>
        `;

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Meal planner error:', err);
    }
  }

  async loadPetFeeding() {
    try {
      const response = await fetch('/api/widgets/pets');
      const data = await response.json();

      if (data.enabled && data.pets?.length) {
        const widget = document.getElementById('pets-widget');
        const container = document.getElementById('pets-list');

        container.innerHTML = data.pets.map(pet => `
          <div class="pet-item">
            <span class="pet-icon">${pet.icon || '🐾'}</span>
            <span class="pet-name">${this.escapeHtml(pet.name)}</span>
            <span class="pet-status">${pet.fedToday}/${pet.totalFeedingsToday} feedings</span>
            <button class="pet-feed-btn" onclick="calboard.feedPet('${pet.id}')">Feed</button>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Pet feeding error:', err);
    }
  }

  async feedPet(id) {
    try {
      await fetch(`/api/widgets/pets/${id}/feed`, { method: 'POST' });
      this.loadPetFeeding();
    } catch (err) {
      console.error('Feed pet error:', err);
    }
  }

  async loadPlantWatering() {
    try {
      const response = await fetch('/api/widgets/plants');
      const data = await response.json();

      if (data.enabled && data.plants?.length) {
        const widget = document.getElementById('plants-widget');
        const container = document.getElementById('plants-list');

        container.innerHTML = data.plants.map(plant => `
          <div class="plant-item ${plant.needsWater ? 'needs-water' : ''}">
            <span class="plant-icon">${plant.icon || '🌱'}</span>
            <span class="plant-name">${this.escapeHtml(plant.name)}</span>
            <span class="plant-status">${plant.needsWater ? 'Needs water!' : `Water in ${plant.daysUntilWater} days`}</span>
            <button class="plant-water-btn" onclick="calboard.waterPlant('${plant.id}')">Water</button>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Plant watering error:', err);
    }
  }

  async waterPlant(id) {
    try {
      await fetch(`/api/widgets/plants/${id}/water`, { method: 'POST' });
      this.loadPlantWatering();
    } catch (err) {
      console.error('Water plant error:', err);
    }
  }

  async loadLaundryTimer() {
    try {
      const response = await fetch('/api/widgets/laundry');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('laundry-widget');
        const container = document.getElementById('laundry-timers');

        // Set up start buttons
        document.getElementById('start-washer').onclick = () => this.startLaundry('washer');
        document.getElementById('start-dryer').onclick = () => this.startLaundry('dryer');

        // Show active timers
        const now = Date.now();
        const activeTimers = (data.activeTimers || []).filter(t => new Date(t.endsAt) > now);

        container.innerHTML = activeTimers.map(timer => {
          const remaining = Math.max(0, Math.floor((new Date(timer.endsAt) - now) / 1000 / 60));
          return `
            <div class="laundry-timer">
              <span class="laundry-type">${timer.type === 'dryer' ? '🔥 Dryer' : '💧 Washer'}</span>
              <span class="laundry-remaining">${remaining} min left</span>
              <button class="laundry-clear" onclick="calboard.clearLaundry('${timer.id}')">×</button>
            </div>
          `;
        }).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Laundry timer error:', err);
    }
  }

  async startLaundry(type) {
    try {
      await fetch('/api/widgets/laundry/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      this.loadLaundryTimer();
    } catch (err) {
      console.error('Start laundry error:', err);
    }
  }

  async clearLaundry(id) {
    try {
      await fetch(`/api/widgets/laundry/${id}`, { method: 'DELETE' });
      this.loadLaundryTimer();
    } catch (err) {
      console.error('Clear laundry error:', err);
    }
  }

  async loadReddit() {
    try {
      const response = await fetch('/api/widgets/reddit');
      const data = await response.json();

      if (data.enabled && data.posts?.length) {
        const widget = document.getElementById('reddit-widget');
        const container = document.getElementById('reddit-posts');

        container.innerHTML = data.posts.map(post => `
          <div class="reddit-post" onclick="window.open('${post.url}', '_blank')">
            <div class="reddit-post-subreddit">r/${post.subreddit}</div>
            <div class="reddit-post-title">${this.escapeHtml(post.title)}</div>
            <div class="reddit-post-meta">
              <span>↑ ${post.score}</span>
              <span>💬 ${post.comments}</span>
            </div>
          </div>
        `).join('');

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Reddit error:', err);
    }
  }

  async loadCurrency() {
    try {
      const response = await fetch('/api/widgets/currency');
      const data = await response.json();

      if (data.enabled && data.rates?.length) {
        const widget = document.getElementById('currency-widget');
        const container = document.getElementById('currency-rates');

        container.innerHTML = `
          <div class="currency-base">1 ${data.base} =</div>
          ${data.rates.map(rate => `
            <div class="currency-rate">
              <span class="currency-code">${rate.currency}</span>
              <span class="currency-value">${rate.rate}</span>
            </div>
          `).join('')}
        `;

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Currency error:', err);
    }
  }

  async loadBudget() {
    try {
      const response = await fetch('/api/widgets/budget');
      const data = await response.json();

      if (data.enabled) {
        const widget = document.getElementById('budget-widget');
        const budget = data.monthlyBudget || 0;
        const spent = data.spent || 0;
        const remaining = data.remaining || 0;
        const percent = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

        document.getElementById('budget-spent').textContent = spent.toFixed(2);
        document.getElementById('budget-remaining').textContent = remaining.toFixed(2);

        const progressColor = percent > 90 ? '#f44336' : percent > 75 ? '#FF9800' : '#4CAF50';
        document.getElementById('budget-progress').innerHTML = `
          <div class="budget-bar" style="width: ${percent}%; background: ${progressColor}"></div>
        `;

        widget.style.display = 'block';
      }
    } catch (err) {
      console.error('Budget error:', err);
    }
  }

  // ==========================================
  // Screensaver Mode
  // ==========================================

  checkScreensaver() {
    const display = this.config?.display;
    if (!display?.screensaverEnabled) return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = (display.screensaverStart || '22:00').split(':').map(Number);
    const [endHour, endMin] = (display.screensaverEnd || '07:00').split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    let isScreensaverTime = false;
    if (startTime > endTime) {
      // Overnight (e.g., 22:00 to 07:00)
      isScreensaverTime = currentTime >= startTime || currentTime < endTime;
    } else {
      isScreensaverTime = currentTime >= startTime && currentTime < endTime;
    }

    if (isScreensaverTime) {
      document.body.classList.add('screensaver-mode');
      document.body.style.setProperty('--screensaver-dim', (display.screensaverDimLevel || 20) / 100);
    } else {
      document.body.classList.remove('screensaver-mode');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.calboard = new Calboard();
});
