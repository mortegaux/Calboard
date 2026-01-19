// Calboard Admin Panel JavaScript
// Supports all features including themes, accessibility, and advanced settings

// Widget metadata for rendering the widgets tab
const WIDGET_METADATA = {
  information: {
    icon: 'newspaper',
    name: 'Information',
    widgets: {
      news: { icon: 'rss_feed', name: 'News Feed', description: 'Display news from RSS feeds', hasConfig: true },
      quotes: { icon: 'format_quote', name: 'Quotes', description: 'Show inspirational quotes', hasConfig: true },
      wordOfDay: { icon: 'menu_book', name: 'Word of the Day', description: 'Learn a new word each day', hasConfig: false },
      jokeOfDay: { icon: 'sentiment_satisfied', name: 'Joke of the Day', description: 'Daily humor', hasConfig: false },
      onThisDay: { icon: 'history_edu', name: 'On This Day', description: 'Historical events', hasConfig: false }
    }
  },
  environment: {
    icon: 'nights_stay',
    name: 'Environment',
    widgets: {
      moonPhase: { icon: 'brightness_3', name: 'Moon Phase', description: 'Current moon phase', hasConfig: false },
      tides: { icon: 'waves', name: 'Tides', description: 'Tide predictions', hasConfig: true },
      pollen: { icon: 'local_florist', name: 'Pollen Count', description: 'Allergy information', hasConfig: false },
      uvIndex: { icon: 'wb_sunny', name: 'UV Index', description: 'UV radiation levels', hasConfig: false }
    }
  },
  productivity: {
    icon: 'check_circle',
    name: 'Productivity',
    widgets: {
      tasks: { icon: 'task_alt', name: 'Tasks', description: 'Todo lists and task management', hasConfig: true },
      groceryList: { icon: 'shopping_cart', name: 'Grocery List', description: 'Shopping list', hasConfig: true },
      chores: { icon: 'cleaning_services', name: 'Chores', description: 'Household tasks tracker', hasConfig: true },
      packages: { icon: 'inventory_2', name: 'Package Tracking', description: 'Track deliveries', hasConfig: true },
      medications: { icon: 'medication', name: 'Medications', description: 'Medication reminders', hasConfig: true }
    }
  },
  transportation: {
    icon: 'directions_car',
    name: 'Transportation',
    widgets: {
      traffic: { icon: 'traffic', name: 'Traffic', description: 'Real-time traffic conditions', hasConfig: true },
      transit: { icon: 'directions_bus', name: 'Public Transit', description: 'Bus and train times', hasConfig: true },
      flights: { icon: 'flight', name: 'Flight Tracking', description: 'Track flights', hasConfig: true },
      gasPrices: { icon: 'local_gas_station', name: 'Gas Prices', description: 'Local fuel prices', hasConfig: true }
    }
  },
  finance: {
    icon: 'account_balance',
    name: 'Finance',
    widgets: {
      stocks: { icon: 'show_chart', name: 'Stock Prices', description: 'Track stock market', hasConfig: true },
      crypto: { icon: 'currency_bitcoin', name: 'Cryptocurrency', description: 'Crypto prices', hasConfig: true },
      currencyExchange: { icon: 'currency_exchange', name: 'Currency Exchange', description: 'Exchange rates', hasConfig: true },
      budgetTracker: { icon: 'account_balance_wallet', name: 'Budget Tracker', description: 'Track spending', hasConfig: true }
    }
  },
  entertainment: {
    icon: 'sports_esports',
    name: 'Entertainment',
    widgets: {
      sports: { icon: 'sports_soccer', name: 'Sports Scores', description: 'Live scores and schedules', hasConfig: true },
      spotify: { icon: 'library_music', name: 'Spotify', description: 'Now playing', hasConfig: true },
      tvSchedule: { icon: 'tv', name: 'TV Schedule', description: 'Show reminders', hasConfig: true },
      redditFeed: { icon: 'forum', name: 'Reddit Feed', description: 'Subreddit posts', hasConfig: true }
    }
  },
  media: {
    icon: 'photo_library',
    name: 'Media',
    widgets: {
      photos: { icon: 'photo_camera', name: 'Photo Gallery', description: 'Display photos', hasConfig: true },
      photoFrame: { icon: 'image', name: 'Photo Frame Mode', description: 'Full-screen photo display', hasConfig: true }
    }
  },
  smartHome: {
    icon: 'home',
    name: 'Smart Home',
    widgets: {
      homeAssistant: { icon: 'sensors', name: 'Home Assistant', description: 'Smart home controls', hasConfig: true },
      energy: { icon: 'bolt', name: 'Energy Monitor', description: 'Power usage', hasConfig: true }
    }
  },
  social: {
    icon: 'chat',
    name: 'Social',
    widgets: {
      messageBoard: { icon: 'message', name: 'Message Board', description: 'Family messages', hasConfig: true },
      sharedLists: { icon: 'playlist_add_check', name: 'Shared Lists', description: 'Collaborative lists', hasConfig: true },
      familyProfiles: { icon: 'people', name: 'Family Profiles', description: 'Member info and schedules', hasConfig: true }
    }
  },
  system: {
    icon: 'computer',
    name: 'System',
    widgets: {
      systemStats: { icon: 'analytics', name: 'System Stats', description: 'CPU, memory, temperature', hasConfig: true }
    }
  },
  time: {
    icon: 'schedule',
    name: 'Time & Countdowns',
    widgets: {
      worldClocks: { icon: 'public', name: 'World Clocks', description: 'Multiple timezones', hasConfig: true },
      eventCountdowns: { icon: 'hourglass_empty', name: 'Event Countdowns', description: 'Count down to events', hasConfig: true },
      pomodoroTimer: { icon: 'timer', name: 'Pomodoro Timer', description: 'Focus timer', hasConfig: true }
    }
  },
  health: {
    icon: 'favorite',
    name: 'Health & Wellness',
    widgets: {
      habitTracker: { icon: 'fact_check', name: 'Habit Tracker', description: 'Track daily habits', hasConfig: true },
      waterIntake: { icon: 'water_drop', name: 'Water Intake', description: 'Hydration tracking', hasConfig: true },
      sleepSchedule: { icon: 'bedtime', name: 'Sleep Schedule', description: 'Bedtime reminders', hasConfig: true }
    }
  },
  dailyContent: {
    icon: 'lightbulb',
    name: 'Daily Content',
    widgets: {
      recipeOfDay: { icon: 'restaurant', name: 'Recipe of the Day', description: 'Daily cooking ideas', hasConfig: true },
      affirmations: { icon: 'auto_awesome', name: 'Affirmations', description: 'Positive daily messages', hasConfig: true },
      horoscope: { icon: 'stars', name: 'Horoscope', description: 'Daily horoscope', hasConfig: true },
      trivia: { icon: 'quiz', name: 'Trivia', description: 'Fun facts and questions', hasConfig: true }
    }
  },
  homeManagement: {
    icon: 'home_work',
    name: 'Home Management',
    widgets: {
      garbageDay: { icon: 'delete', name: 'Garbage Day', description: 'Trash and recycling schedule', hasConfig: true },
      mealPlanner: { icon: 'restaurant_menu', name: 'Meal Planner', description: 'Weekly meal planning', hasConfig: true },
      petFeeding: { icon: 'pets', name: 'Pet Feeding', description: 'Pet feeding schedule', hasConfig: true },
      plantWatering: { icon: 'eco', name: 'Plant Watering', description: 'Plant care reminders', hasConfig: true },
      laundryTimer: { icon: 'local_laundry_service', name: 'Laundry Timer', description: 'Washer/dryer timers', hasConfig: true }
    }
  }
};

// ============================================
// Layout Manager Class
// ============================================
class LayoutManager {
  constructor(adminInstance) {
    this.admin = adminInstance;
    this.sectionOrderSortable = null;
    this.widgetGridSortable = null;
    this.currentLayout = null;
  }

  init() {
    // Initialize section order sortable
    this.initSectionOrderSortable();

    // Initialize grid controls
    this.initGridControls();

    // Initialize widget grid editor
    this.initWidgetGridEditor();

    // Set up event listeners for grid settings
    this.setupGridSettingsListeners();
  }

  initSectionOrderSortable() {
    const sectionOrderList = document.getElementById('section-order-list');
    if (!sectionOrderList || typeof Sortable === 'undefined') {
      console.warn('Sortable.js not loaded or section-order-list not found');
      return;
    }

    this.sectionOrderSortable = new Sortable(sectionOrderList, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      onEnd: () => {
        this.admin.markUnsavedChanges();
      }
    });
  }

  initGridControls() {
    const resetBtn = document.getElementById('layout-reset-btn');
    const previewBtn = document.getElementById('layout-preview-btn');
    const showGridCheckbox = document.getElementById('layout-show-grid');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetLayout());
    }

    if (previewBtn) {
      previewBtn.addEventListener('click', () => this.previewLayout());
    }

    if (showGridCheckbox) {
      showGridCheckbox.addEventListener('change', (e) => {
        const gridEditor = document.getElementById('widget-grid-editor');
        if (gridEditor) {
          gridEditor.classList.toggle('show-grid', e.target.checked);
        }
      });
    }
  }

  setupGridSettingsListeners() {
    const columnsInput = document.getElementById('layout-grid-columns');
    const gapInput = document.getElementById('layout-grid-gap');

    if (columnsInput) {
      columnsInput.addEventListener('change', () => {
        this.updateGridColumns();
        this.admin.markUnsavedChanges();
      });
    }

    if (gapInput) {
      gapInput.addEventListener('change', () => {
        this.updateGridGap();
        this.admin.markUnsavedChanges();
      });
    }

    // Add listeners for other grid settings
    const inputs = [
      'layout-min-widget-width',
      'layout-weather-width',
      'layout-weather-min-width'
    ];

    inputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('change', () => {
          this.admin.markUnsavedChanges();
        });
      }
    });
  }

  initWidgetGridEditor() {
    // This will be called after widgets are loaded
    // Initial state shows "no widgets" message
  }

  updateWidgetGridEditor() {
    const gridEditor = document.getElementById('widget-grid-editor');
    const noWidgetsMsg = document.getElementById('no-widgets-message');
    if (!gridEditor) return;

    const enabledWidgets = this.getEnabledWidgets();

    if (enabledWidgets.length === 0) {
      if (noWidgetsMsg) {
        noWidgetsMsg.style.display = 'block';
      }
      // Clear any existing grid
      const existingGrid = gridEditor.querySelector('.grid-preview');
      if (existingGrid) {
        existingGrid.remove();
      }
      return;
    }

    if (noWidgetsMsg) {
      noWidgetsMsg.style.display = 'none';
    }

    this.createGridPreview(enabledWidgets);
  }

  getEnabledWidgets() {
    const widgets = [];
    const config = this.admin.config;

    if (!config || !config.widgets) return widgets;

    // Iterate through all widget categories
    for (const [category, metadata] of Object.entries(WIDGET_METADATA)) {
      if (!metadata.widgets) continue;

      for (const [widgetKey, widgetMeta] of Object.entries(metadata.widgets)) {
        const widgetConfig = config.widgets[widgetKey];
        if (widgetConfig && widgetConfig.enabled) {
          widgets.push({
            id: widgetKey,
            name: widgetMeta.name,
            category: category,
            position: this.currentLayout?.widgets?.[widgetKey] || {}
          });
        }
      }
    }

    return widgets;
  }

  createGridPreview(widgets) {
    const gridEditor = document.getElementById('widget-grid-editor');
    if (!gridEditor) return;

    // Remove existing grid if any
    let gridPreview = gridEditor.querySelector('.grid-preview');
    if (!gridPreview) {
      gridPreview = document.createElement('div');
      gridPreview.className = 'grid-preview';
      gridEditor.appendChild(gridPreview);
    } else {
      gridPreview.innerHTML = '';
    }

    // Set grid columns
    const columns = parseInt(document.getElementById('layout-grid-columns')?.value || 3);
    const gap = document.getElementById('layout-grid-gap')?.value || 15;
    gridPreview.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    gridPreview.style.gap = `${gap}px`;

    // Create widget items
    widgets.forEach((widget, index) => {
      const widgetItem = this.createWidgetGridItem(widget, index);
      gridPreview.appendChild(widgetItem);
    });

    // Initialize sortable for widget grid
    if (this.widgetGridSortable) {
      this.widgetGridSortable.destroy();
    }

    if (typeof Sortable !== 'undefined') {
      this.widgetGridSortable = new Sortable(gridPreview, {
        animation: 150,
        handle: '.widget-preview-drag',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: (evt) => {
          this.updateWidgetPositionsAfterDrag();
          this.admin.markUnsavedChanges();
        }
      });
    }
  }

  createWidgetGridItem(widget, index) {
    const item = document.createElement('div');
    item.className = 'grid-widget-item';
    item.dataset.widgetId = widget.id;

    const position = widget.position;
    const column = position.column || (index % 3) + 1;
    const row = position.row || Math.floor(index / 3) + 1;
    const colSpan = position.colSpan || 1;
    const rowSpan = position.rowSpan || 1;

    // Set grid position
    item.style.gridColumn = `${column} / span ${colSpan}`;
    item.style.gridRow = `${row} / span ${rowSpan}`;

    item.innerHTML = `
      <div class="widget-preview-header">
        <span class="widget-preview-title">${widget.name}</span>
        <span class="widget-preview-drag">⋮⋮</span>
      </div>
      <div class="widget-preview-controls">
        <div class="widget-preview-control">
          <label>Column</label>
          <input type="number" class="widget-col-input" min="1" max="6" value="${column}" data-widget="${widget.id}">
        </div>
        <div class="widget-preview-control">
          <label>Row</label>
          <input type="number" class="widget-row-input" min="1" max="20" value="${row}" data-widget="${widget.id}">
        </div>
        <div class="widget-preview-control">
          <label>Width</label>
          <input type="number" class="widget-colSpan-input" min="1" max="6" value="${colSpan}" data-widget="${widget.id}">
        </div>
        <div class="widget-preview-control">
          <label>Height</label>
          <input type="number" class="widget-rowSpan-input" min="1" max="4" value="${rowSpan}" data-widget="${widget.id}">
        </div>
      </div>
      <div class="widget-position-badge">${column},${row}</div>
    `;

    // Add event listeners for manual inputs
    const inputs = item.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.updateWidgetPositionFromInput(e.target);
      });
    });

    return item;
  }

  updateWidgetPositionFromInput(input) {
    const widgetId = input.dataset.widget;
    const widgetItem = document.querySelector(`.grid-widget-item[data-widget-id="${widgetId}"]`);
    if (!widgetItem) return;

    const colInput = widgetItem.querySelector('.widget-col-input');
    const rowInput = widgetItem.querySelector('.widget-row-input');
    const colSpanInput = widgetItem.querySelector('.widget-colSpan-input');
    const rowSpanInput = widgetItem.querySelector('.widget-rowSpan-input');

    const column = parseInt(colInput.value) || 1;
    const row = parseInt(rowInput.value) || 1;
    const colSpan = parseInt(colSpanInput.value) || 1;
    const rowSpan = parseInt(rowSpanInput.value) || 1;

    // Update grid position
    widgetItem.style.gridColumn = `${column} / span ${colSpan}`;
    widgetItem.style.gridRow = `${row} / span ${rowSpan}`;

    // Update position badge
    const badge = widgetItem.querySelector('.widget-position-badge');
    if (badge) {
      badge.textContent = `${column},${row}`;
    }

    this.admin.markUnsavedChanges();
  }

  updateWidgetPositionsAfterDrag() {
    const gridPreview = document.querySelector('.grid-preview');
    if (!gridPreview) return;

    const columns = parseInt(document.getElementById('layout-grid-columns')?.value || 3);
    const widgetItems = gridPreview.querySelectorAll('.grid-widget-item');

    widgetItems.forEach((item, index) => {
      const column = (index % columns) + 1;
      const row = Math.floor(index / columns) + 1;

      const colInput = item.querySelector('.widget-col-input');
      const rowInput = item.querySelector('.widget-row-input');
      const colSpanInput = item.querySelector('.widget-colSpan-input');
      const rowSpanInput = item.querySelector('.widget-rowSpan-input');

      if (colInput) colInput.value = column;
      if (rowInput) rowInput.value = row;

      const colSpan = parseInt(colSpanInput?.value || 1);
      const rowSpan = parseInt(rowSpanInput?.value || 1);

      item.style.gridColumn = `${column} / span ${colSpan}`;
      item.style.gridRow = `${row} / span ${rowSpan}`;

      const badge = item.querySelector('.widget-position-badge');
      if (badge) {
        badge.textContent = `${column},${row}`;
      }
    });
  }

  updateGridColumns() {
    const columns = parseInt(document.getElementById('layout-grid-columns')?.value || 3);
    const gridPreview = document.querySelector('.grid-preview');
    if (gridPreview) {
      gridPreview.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
  }

  updateGridGap() {
    const gap = document.getElementById('layout-grid-gap')?.value || 15;
    const gridPreview = document.querySelector('.grid-preview');
    if (gridPreview) {
      gridPreview.style.gap = `${gap}px`;
    }
  }

  resetLayout() {
    if (!confirm('Reset layout to auto-flow? This will clear all custom positions.')) {
      return;
    }

    // Clear all position inputs
    const gridItems = document.querySelectorAll('.grid-widget-item');
    gridItems.forEach((item, index) => {
      const columns = parseInt(document.getElementById('layout-grid-columns')?.value || 3);
      const column = (index % columns) + 1;
      const row = Math.floor(index / columns) + 1;

      const colInput = item.querySelector('.widget-col-input');
      const rowInput = item.querySelector('.widget-row-input');
      const colSpanInput = item.querySelector('.widget-colSpan-input');
      const rowSpanInput = item.querySelector('.widget-rowSpan-input');

      if (colInput) colInput.value = column;
      if (rowInput) rowInput.value = row;
      if (colSpanInput) colSpanInput.value = 1;
      if (rowSpanInput) rowSpanInput.value = 1;

      item.style.gridColumn = `${column} / span 1`;
      item.style.gridRow = `${row} / span 1`;

      const badge = item.querySelector('.widget-position-badge');
      if (badge) {
        badge.textContent = `${column},${row}`;
      }
    });

    this.admin.markUnsavedChanges();
  }

  previewLayout() {
    window.open('/', '_blank');
  }

  populateFromConfig(config) {
    if (!config || !config.display) return;

    this.currentLayout = config.display.layout || {};

    // Populate grid settings
    const layout = this.currentLayout;

    if (layout.grid) {
      const columnsInput = document.getElementById('layout-grid-columns');
      const gapInput = document.getElementById('layout-grid-gap');
      const minWidthInput = document.getElementById('layout-min-widget-width');

      if (columnsInput && layout.grid.columns) {
        columnsInput.value = layout.grid.columns;
      }
      if (gapInput && layout.grid.gap) {
        gapInput.value = parseInt(layout.grid.gap) || 15;
      }
      if (minWidthInput && layout.grid.minWidgetWidth) {
        minWidthInput.value = parseInt(layout.grid.minWidgetWidth) || 280;
      }
    }

    // Populate panel settings
    if (layout.panels) {
      const weatherWidthInput = document.getElementById('layout-weather-width');
      const weatherMinWidthInput = document.getElementById('layout-weather-min-width');

      if (weatherWidthInput && layout.panels.weatherWidth) {
        weatherWidthInput.value = parseInt(layout.panels.weatherWidth) || 520;
      }
      if (weatherMinWidthInput && layout.panels.weatherMinWidth) {
        weatherMinWidthInput.value = parseInt(layout.panels.weatherMinWidth) || 450;
      }
    }

    // Populate section order
    if (layout.sectionOrder && this.sectionOrderSortable) {
      const sectionOrderList = document.getElementById('section-order-list');
      if (sectionOrderList) {
        // Reorder DOM elements based on config
        layout.sectionOrder.forEach((sectionName, index) => {
          const item = sectionOrderList.querySelector(`[data-section="${sectionName}"]`);
          if (item) {
            sectionOrderList.appendChild(item);
          }
        });
      }
    }

    // Update widget grid editor with current layout
    this.updateWidgetGridEditor();
  }

  collectFormData() {
    const formData = {
      grid: {
        columns: parseInt(document.getElementById('layout-grid-columns')?.value || 3),
        gap: `${document.getElementById('layout-grid-gap')?.value || 15}px`,
        minWidgetWidth: `${document.getElementById('layout-min-widget-width')?.value || 280}px`
      },
      panels: {
        weatherWidth: `${document.getElementById('layout-weather-width')?.value || 420}px`,
        weatherMinWidth: `${document.getElementById('layout-weather-min-width')?.value || 350}px`
      },
      sectionOrder: [],
      widgets: {},
      mode: 'grid'
    };

    // Collect section order
    const sectionItems = document.querySelectorAll('#section-order-list .sortable-item');
    sectionItems.forEach(item => {
      const section = item.dataset.section;
      if (section) {
        formData.sectionOrder.push(section);
      }
    });

    // Collect widget positions
    const widgetItems = document.querySelectorAll('.grid-widget-item');
    widgetItems.forEach(item => {
      const widgetId = item.dataset.widgetId;
      if (!widgetId) return;

      const colInput = item.querySelector('.widget-col-input');
      const rowInput = item.querySelector('.widget-row-input');
      const colSpanInput = item.querySelector('.widget-colSpan-input');
      const rowSpanInput = item.querySelector('.widget-rowSpan-input');

      formData.widgets[widgetId] = {
        column: parseInt(colInput?.value || 1),
        row: parseInt(rowInput?.value || 1),
        colSpan: parseInt(colSpanInput?.value || 1),
        rowSpan: parseInt(rowSpanInput?.value || 1)
      };
    });

    return formData;
  }
}

class CalboardAdmin {
  constructor() {
    this.config = null;
    this.unsavedChanges = false;

    this.init();
  }

  async init() {
    // Check if authentication is required
    const authStatus = await this.checkAuthRequired();

    if (authStatus.required && !authStatus.isAuthenticated) {
      this.showLoginModal();
    } else {
      await this.loadConfig();
    }

    this.bindEvents();
    this.setupTabs();

    // Initialize layout manager
    this.layoutManager = new LayoutManager(this);
    this.layoutManager.init();
  }

  async checkAuthRequired() {
    try {
      const response = await fetch('/api/admin/auth-required', {
        credentials: 'same-origin'
      });
      return await response.json();
    } catch (err) {
      console.error('Failed to check auth status:', err);
      return { required: false, isAuthenticated: false };
    }
  }

  showLoginModal() {
    document.getElementById('login-modal').classList.add('visible');
  }

  hideLoginModal() {
    document.getElementById('login-modal').classList.remove('visible');
  }

  async login(password) {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.hideLoginModal();
        await this.loadConfig();
        return true;
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      throw err;
    }
  }

  async logout() {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  async fetchWithAuth(url, options = {}) {
    options.credentials = 'same-origin';
    const response = await fetch(url, options);

    if (response.status === 401) {
      this.showLoginModal();
      throw new Error('Session expired. Please login again.');
    }

    return response;
  }

  async loadConfig() {
    try {
      const response = await this.fetchWithAuth('/api/admin/config');
      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }
      this.config = await response.json();
      this.populateForm();
      this.unsavedChanges = false;
    } catch (err) {
      if (err.message !== 'Session expired. Please login again.') {
        this.showStatus('error', 'Failed to load configuration: ' + err.message);
      }
    }
  }

  populateForm() {
    // Weather settings
    document.getElementById('weather-api-key').value = this.config.weather?.apiKey || '';
    document.getElementById('weather-lat').value = this.config.weather?.latitude || '';
    document.getElementById('weather-lon').value = this.config.weather?.longitude || '';
    document.getElementById('weather-units').value = this.config.weather?.units || 'imperial';
    document.getElementById('weather-show-alerts').checked = this.config.weather?.showAlerts !== false;
    document.getElementById('weather-show-aqi').checked = this.config.weather?.showAirQuality !== false;

    // Display settings
    document.getElementById('display-days').value = this.config.display?.daysToShow || 7;
    document.getElementById('display-refresh').value = this.config.display?.refreshIntervalMinutes || 5;
    document.getElementById('display-time-format').value = this.config.display?.timeFormat || '12h';
    document.getElementById('display-date-format').value = this.config.display?.dateFormat || 'en-US';
    document.getElementById('display-theme').value = this.config.display?.theme || 'dark';
    document.getElementById('display-calendar-view').value = this.config.display?.calendarView || 'list';
    document.getElementById('display-background').value = this.config.display?.backgroundImage || '';
    document.getElementById('display-slideshow').checked = this.config.display?.backgroundSlideshow || false;
    document.getElementById('display-slideshow-interval').value = this.config.display?.slideshowInterval || 30;
    document.getElementById('display-slideshow-images').value = (this.config.display?.backgroundImages || []).join(', ');
    document.getElementById('display-show-duration').checked = this.config.display?.showEventDuration !== false;
    document.getElementById('display-show-countdown').checked = this.config.display?.showEventCountdown !== false;
    document.getElementById('display-show-badge').checked = this.config.display?.showTodayBadge !== false;
    document.getElementById('display-custom-css').value = this.config.display?.customCSS || '';

    // Features
    document.getElementById('feature-wakelock').checked = this.config.features?.screenWakeLock !== false;
    document.getElementById('feature-offline').checked = this.config.features?.offlineMode !== false;
    document.getElementById('feature-birthday').checked = this.config.features?.birthdayRecognition !== false;
    document.getElementById('feature-voice').checked = this.config.features?.voiceAnnouncements || false;
    document.getElementById('feature-touch').checked = this.config.features?.touchGestures !== false;

    // Accessibility
    document.getElementById('access-high-contrast').checked = this.config.accessibility?.highContrast || false;
    document.getElementById('access-large-text').checked = this.config.accessibility?.largeText || false;
    document.getElementById('access-reduce-motion').checked = this.config.accessibility?.reduceMotion || false;

    // Server settings
    document.getElementById('server-port').value = this.config.server?.port || 3000;

    // Admin password
    const passwordField = document.getElementById('admin-password');
    if (this.config.admin?.passwordHash === '********' || this.config.admin?.password === '********') {
      passwordField.value = '********';
      passwordField.placeholder = 'Password is set (enter new to change)';
    } else {
      passwordField.value = '';
      passwordField.placeholder = 'Set a password (min 8 characters)';
    }

    // Render lists
    this.renderCalendars();
    this.renderAdditionalLocations();
    this.renderWidgets();

    // Populate layout settings
    if (this.layoutManager) {
      this.layoutManager.populateFromConfig(this.config);
    }
  }

  renderCalendars() {
    const container = document.getElementById('calendars-list');
    const template = document.getElementById('calendar-template');
    container.innerHTML = '';

    (this.config.calendars || []).forEach((cal, index) => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector('.calendar-item');

      item.dataset.index = index;
      item.querySelector('.calendar-color-preview').style.backgroundColor = cal.color || '#4CAF50';
      item.querySelector('.calendar-name').textContent = cal.name || 'Unnamed Calendar';
      item.querySelector('.calendar-name-input').value = cal.name || '';
      item.querySelector('.calendar-color-input').value = cal.color || '#4CAF50';
      item.querySelector('.calendar-url-input').value = cal.url || '';

      container.appendChild(clone);
    });

    this.bindCalendarEvents();
  }

  renderAdditionalLocations() {
    const container = document.getElementById('additional-locations-list');
    const template = document.getElementById('location-template');
    container.innerHTML = '';

    (this.config.weather?.additionalLocations || []).forEach((loc, index) => {
      const clone = template.content.cloneNode(true);
      const item = clone.querySelector('.location-item');

      item.dataset.index = index;
      item.querySelector('.location-name-input').value = loc.name || '';
      item.querySelector('.location-lat-input').value = loc.latitude || '';
      item.querySelector('.location-lon-input').value = loc.longitude || '';

      container.appendChild(clone);
    });

    this.bindLocationEvents();
  }

  renderWidgets() {
    const container = document.getElementById('widgets-container');
    container.innerHTML = '';

    // Render each category
    Object.keys(WIDGET_METADATA).forEach(categoryKey => {
      const categoryData = WIDGET_METADATA[categoryKey];
      const categoryElement = this.createCategoryElement(categoryKey, categoryData);
      container.appendChild(categoryElement);
    });

    this.bindWidgetEvents();
    this.updateWidgetStats();

    // Update layout manager widget grid
    if (this.layoutManager) {
      this.layoutManager.updateWidgetGridEditor();
    }
  }

  createCategoryElement(categoryKey, categoryData) {
    const category = document.createElement('div');
    category.className = 'widget-category';
    category.dataset.category = categoryKey;

    // Count enabled widgets in this category
    let enabledCount = 0;
    Object.keys(categoryData.widgets).forEach(widgetKey => {
      if (this.config.widgets?.[widgetKey]?.enabled) {
        enabledCount++;
      }
    });

    category.innerHTML = `
      <div class="category-header">
        <i class="material-icons category-icon">${categoryData.icon}</i>
        <span class="category-title">${categoryData.name}</span>
        <span class="category-badge ${enabledCount === 0 ? 'empty' : ''}">${enabledCount}</span>
        <i class="material-icons category-chevron">expand_more</i>
      </div>
      <div class="category-widgets">
        ${Object.keys(categoryData.widgets).map(widgetKey =>
          this.createWidgetHTML(widgetKey, categoryData.widgets[widgetKey])
        ).join('')}
      </div>
    `;

    return category;
  }

  createWidgetHTML(widgetKey, widgetMeta) {
    const widgetConfig = this.config.widgets?.[widgetKey] || { enabled: false };
    const isEnabled = widgetConfig.enabled || false;

    return `
      <div class="widget-item ${isEnabled ? 'enabled' : ''} ${widgetMeta.hasConfig ? 'has-config' : ''}"
           data-widget="${widgetKey}">
        <div class="widget-header">
          <i class="material-icons widget-icon">${widgetMeta.icon}</i>
          <div class="widget-info">
            <div class="widget-name">${widgetMeta.name}</div>
            <div class="widget-description">${widgetMeta.description}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" class="widget-toggle" ${isEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          <i class="material-icons config-expand-icon">expand_more</i>
        </div>
        ${widgetMeta.hasConfig ? `
          <div class="widget-config">
            ${this.getWidgetConfigHTML(widgetKey, widgetConfig)}
          </div>
        ` : ''}
      </div>
    `;
  }

  getWidgetConfigHTML(widgetKey, config) {
    // Widget-specific configuration forms
    switch (widgetKey) {
      case 'news':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>RSS Feed URLs (one per line)</label>
              <textarea rows="4" class="widget-input" data-field="feeds" placeholder="https://example.com/feed.rss">${(config.feeds || []).join('\n')}</textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Max Items</label>
              <input type="number" class="widget-input" data-field="maxItems" value="${config.maxItems || 5}" min="1" max="20">
            </div>
            <div class="form-group">
              <label>Refresh (minutes)</label>
              <input type="number" class="widget-input" data-field="refreshMinutes" value="${config.refreshMinutes || 30}" min="5" max="1440">
            </div>
          </div>
        `;

      case 'quotes':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select class="widget-input" data-field="category">
                <option value="inspirational" ${config.category === 'inspirational' ? 'selected' : ''}>Inspirational</option>
                <option value="motivational" ${config.category === 'motivational' ? 'selected' : ''}>Motivational</option>
                <option value="funny" ${config.category === 'funny' ? 'selected' : ''}>Funny</option>
                <option value="famous" ${config.category === 'famous' ? 'selected' : ''}>Famous</option>
              </select>
            </div>
            <div class="form-group">
              <label>Refresh (hours)</label>
              <input type="number" class="widget-input" data-field="refreshHours" value="${config.refreshHours || 24}" min="1" max="168">
            </div>
          </div>
        `;

      case 'tides':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>NOAA Station ID</label>
              <input type="text" class="widget-input" data-field="stationId" value="${config.stationId || ''}" placeholder="e.g., 9414290">
              <span class="help-text">Find your station at <a href="https://tidesandcurrents.noaa.gov" target="_blank">tidesandcurrents.noaa.gov</a></span>
            </div>
          </div>
        `;

      case 'tasks':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Provider</label>
              <select class="widget-input" data-field="provider">
                <option value="local" ${config.provider === 'local' ? 'selected' : ''}>Local</option>
                <option value="todoist" ${config.provider === 'todoist' ? 'selected' : ''}>Todoist</option>
                <option value="google" ${config.provider === 'google' ? 'selected' : ''}>Google Tasks</option>
              </select>
            </div>
            <div class="form-group">
              <label>API Key (if required)</label>
              <input type="password" class="widget-input" data-field="todoistApiKey" value="${config.todoistApiKey || ''}" placeholder="API key">
            </div>
          </div>
        `;

      case 'groceryList':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Items (one per line)</label>
              <textarea rows="6" class="widget-input" data-field="items" placeholder="Milk&#10;Bread&#10;Eggs">${(config.items || []).join('\n')}</textarea>
            </div>
          </div>
        `;

      case 'traffic':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Google Maps API Key</label>
              <input type="password" class="widget-input" data-field="googleMapsApiKey" value="${config.googleMapsApiKey || ''}" placeholder="Your API key">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>Routes (JSON format)</label>
              <textarea rows="4" class="widget-input" data-field="routes" placeholder='[{"name":"Work","origin":"Home address","destination":"Work address"}]'>${JSON.stringify(config.routes || [], null, 2)}</textarea>
            </div>
          </div>
        `;

      case 'stocks':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>API Key (Alpha Vantage)</label>
              <input type="password" class="widget-input" data-field="apiKey" value="${config.apiKey || ''}" placeholder="API key">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>Stock Symbols (comma-separated)</label>
              <input type="text" class="widget-input" data-field="symbols" value="${(config.symbols || []).join(', ')}" placeholder="AAPL, GOOGL, MSFT">
            </div>
          </div>
        `;

      case 'crypto':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Cryptocurrencies (comma-separated)</label>
              <input type="text" class="widget-input" data-field="coins" value="${(config.coins || ['bitcoin', 'ethereum']).join(', ')}" placeholder="bitcoin, ethereum, cardano">
            </div>
          </div>
        `;

      case 'homeAssistant':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Home Assistant URL</label>
              <input type="url" class="widget-input" data-field="url" value="${config.url || ''}" placeholder="http://homeassistant.local:8123">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>Long-Lived Access Token</label>
              <input type="password" class="widget-input" data-field="token" value="${config.token || ''}" placeholder="Your access token">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>Entity IDs (one per line)</label>
              <textarea rows="4" class="widget-input" data-field="entities" placeholder="light.living_room&#10;sensor.temperature">${(config.entities || []).join('\n')}</textarea>
            </div>
          </div>
        `;

      case 'spotify':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Client ID</label>
              <input type="password" class="widget-input" data-field="clientId" value="${config.clientId || ''}" placeholder="Client ID">
            </div>
            <div class="form-group">
              <label>Client Secret</label>
              <input type="password" class="widget-input" data-field="clientSecret" value="${config.clientSecret || ''}" placeholder="Client Secret">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group full-width">
              <label>Refresh Token</label>
              <input type="password" class="widget-input" data-field="refreshToken" value="${config.refreshToken || ''}" placeholder="Refresh token">
            </div>
          </div>
        `;

      case 'pomodoroTimer':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Work Minutes</label>
              <input type="number" class="widget-input" data-field="workMinutes" value="${config.workMinutes || 25}" min="1" max="120">
            </div>
            <div class="form-group">
              <label>Break Minutes</label>
              <input type="number" class="widget-input" data-field="breakMinutes" value="${config.breakMinutes || 5}" min="1" max="60">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Long Break Minutes</label>
              <input type="number" class="widget-input" data-field="longBreakMinutes" value="${config.longBreakMinutes || 15}" min="1" max="120">
            </div>
            <div class="form-group">
              <label>Sessions Until Long Break</label>
              <input type="number" class="widget-input" data-field="sessionsUntilLongBreak" value="${config.sessionsUntilLongBreak || 4}" min="2" max="10">
            </div>
          </div>
        `;

      case 'sleepSchedule':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Bedtime</label>
              <input type="time" class="widget-input" data-field="bedtime" value="${config.bedtime || '22:00'}">
            </div>
            <div class="form-group">
              <label>Wake Time</label>
              <input type="time" class="widget-input" data-field="wakeTime" value="${config.wakeTime || '06:00'}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Reminder Before (minutes)</label>
              <input type="number" class="widget-input" data-field="reminderBefore" value="${config.reminderBefore || 30}" min="0" max="120">
            </div>
          </div>
        `;

      case 'waterIntake':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Daily Goal (glasses)</label>
              <input type="number" class="widget-input" data-field="dailyGoal" value="${config.dailyGoal || 8}" min="1" max="20">
            </div>
            <div class="form-group">
              <label>Glass Size (oz)</label>
              <input type="number" class="widget-input" data-field="glassSize" value="${config.glassSize || 8}" min="1" max="32">
            </div>
          </div>
        `;

      case 'horoscope':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Zodiac Sign</label>
              <select class="widget-input" data-field="sign">
                <option value="aries" ${config.sign === 'aries' ? 'selected' : ''}>Aries</option>
                <option value="taurus" ${config.sign === 'taurus' ? 'selected' : ''}>Taurus</option>
                <option value="gemini" ${config.sign === 'gemini' ? 'selected' : ''}>Gemini</option>
                <option value="cancer" ${config.sign === 'cancer' ? 'selected' : ''}>Cancer</option>
                <option value="leo" ${config.sign === 'leo' ? 'selected' : ''}>Leo</option>
                <option value="virgo" ${config.sign === 'virgo' ? 'selected' : ''}>Virgo</option>
                <option value="libra" ${config.sign === 'libra' ? 'selected' : ''}>Libra</option>
                <option value="scorpio" ${config.sign === 'scorpio' ? 'selected' : ''}>Scorpio</option>
                <option value="sagittarius" ${config.sign === 'sagittarius' ? 'selected' : ''}>Sagittarius</option>
                <option value="capricorn" ${config.sign === 'capricorn' ? 'selected' : ''}>Capricorn</option>
                <option value="aquarius" ${config.sign === 'aquarius' ? 'selected' : ''}>Aquarius</option>
                <option value="pisces" ${config.sign === 'pisces' ? 'selected' : ''}>Pisces</option>
              </select>
            </div>
          </div>
        `;

      case 'recipeOfDay':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Dietary Preference</label>
              <select class="widget-input" data-field="dietary">
                <option value="any" ${config.dietary === 'any' ? 'selected' : ''}>Any</option>
                <option value="vegetarian" ${config.dietary === 'vegetarian' ? 'selected' : ''}>Vegetarian</option>
                <option value="vegan" ${config.dietary === 'vegan' ? 'selected' : ''}>Vegan</option>
                <option value="gluten-free" ${config.dietary === 'gluten-free' ? 'selected' : ''}>Gluten-Free</option>
              </select>
            </div>
          </div>
        `;

      case 'affirmations':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Category</label>
              <select class="widget-input" data-field="category">
                <option value="general" ${config.category === 'general' ? 'selected' : ''}>General</option>
                <option value="confidence" ${config.category === 'confidence' ? 'selected' : ''}>Confidence</option>
                <option value="gratitude" ${config.category === 'gratitude' ? 'selected' : ''}>Gratitude</option>
                <option value="success" ${config.category === 'success' ? 'selected' : ''}>Success</option>
              </select>
            </div>
          </div>
        `;

      case 'redditFeed':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Subreddits (comma-separated)</label>
              <input type="text" class="widget-input" data-field="subreddits" value="${(config.subreddits || ['worldnews', 'technology']).join(', ')}" placeholder="worldnews, technology">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Max Posts</label>
              <input type="number" class="widget-input" data-field="maxPosts" value="${config.maxPosts || 5}" min="1" max="20">
            </div>
          </div>
        `;

      case 'systemStats':
        return `
          <div class="form-row">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" class="widget-input" data-field="showCpu" ${config.showCpu !== false ? 'checked' : ''}>
                <span>Show CPU</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" class="widget-input" data-field="showMemory" ${config.showMemory !== false ? 'checked' : ''}>
                <span>Show Memory</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" class="widget-input" data-field="showTemp" ${config.showTemp !== false ? 'checked' : ''}>
                <span>Show Temperature</span>
              </label>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" class="widget-input" data-field="showNetwork" ${config.showNetwork ? 'checked' : ''}>
                <span>Show Network</span>
              </label>
            </div>
          </div>
        `;

      case 'currencyExchange':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Base Currency</label>
              <input type="text" class="widget-input" data-field="baseCurrency" value="${config.baseCurrency || 'USD'}" placeholder="USD" maxlength="3">
            </div>
            <div class="form-group full-width">
              <label>Target Currencies (comma-separated)</label>
              <input type="text" class="widget-input" data-field="currencies" value="${(config.currencies || ['EUR', 'GBP', 'JPY']).join(', ')}" placeholder="EUR, GBP, JPY">
            </div>
          </div>
        `;

      case 'gasPrices':
        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>ZIP Code</label>
              <input type="text" class="widget-input" data-field="zipCode" value="${config.zipCode || ''}" placeholder="90210" maxlength="5">
            </div>
          </div>
        `;

      case 'laundryTimer':
        return `
          <div class="form-row">
            <div class="form-group">
              <label>Washer Minutes</label>
              <input type="number" class="widget-input" data-field="washerMinutes" value="${config.washerMinutes || 45}" min="1" max="180">
            </div>
            <div class="form-group">
              <label>Dryer Minutes</label>
              <input type="number" class="widget-input" data-field="dryerMinutes" value="${config.dryerMinutes || 60}" min="1" max="180">
            </div>
          </div>
        `;

      case 'garbageDay':
        const schedule = config.schedule || [];
        const scheduleItemsHtml = schedule.map((item, index) => `
          <div class="garbage-schedule-item" data-index="${index}">
            <input type="text" class="garbage-type" placeholder="Type (e.g., Trash)" value="${this.escapeHtml(item.type || '')}" />
            <select class="garbage-day">
              <option value="Monday" ${item.day === 'Monday' ? 'selected' : ''}>Monday</option>
              <option value="Tuesday" ${item.day === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
              <option value="Wednesday" ${item.day === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
              <option value="Thursday" ${item.day === 'Thursday' ? 'selected' : ''}>Thursday</option>
              <option value="Friday" ${item.day === 'Friday' ? 'selected' : ''}>Friday</option>
              <option value="Saturday" ${item.day === 'Saturday' ? 'selected' : ''}>Saturday</option>
              <option value="Sunday" ${item.day === 'Sunday' ? 'selected' : ''}>Sunday</option>
            </select>
            <input type="color" class="garbage-color" value="${item.color || '#4CAF50'}" />
            <button type="button" class="btn-remove-garbage" title="Remove">✕</button>
          </div>
        `).join('');

        return `
          <div class="form-row">
            <div class="form-group full-width">
              <label>Garbage Schedule</label>
              <div class="garbage-config-mode">
                <button type="button" class="btn-toggle-mode" data-mode="simple">Switch to Advanced (JSON)</button>
              </div>

              <!-- Simple Form Mode -->
              <div class="garbage-simple-mode">
                <div class="garbage-schedule-list" id="garbage-schedule-list-${widgetKey}">
                  ${scheduleItemsHtml || '<div class="no-items-message">No items added yet</div>'}
                </div>
                <button type="button" class="btn-add-garbage">+ Add Item</button>
              </div>

              <!-- Advanced JSON Mode -->
              <div class="garbage-advanced-mode" style="display: none;">
                <textarea rows="8" class="widget-input garbage-json" data-field="schedule">${JSON.stringify(schedule, null, 2)}</textarea>
                <details class="json-help">
                  <summary>JSON Format Help</summary>
                  <pre class="json-example">[
  {
    "type": "Trash",
    "day": "Monday",
    "color": "#4CAF50"
  },
  {
    "type": "Recycling",
    "day": "Thursday",
    "color": "#2196F3"
  },
  {
    "type": "Yard Waste",
    "day": "Wednesday",
    "color": "#8BC34A"
  }
]</pre>
                  <p><strong>Fields:</strong></p>
                  <ul>
                    <li><code>type</code>: Name of collection (e.g., "Trash", "Recycling")</li>
                    <li><code>day</code>: Day of week (Monday-Sunday)</li>
                    <li><code>color</code>: Hex color code for display (e.g., "#4CAF50")</li>
                  </ul>
                </details>
              </div>
            </div>
          </div>
        `;

      default:
        // For widgets with hasConfig but no specific form yet
        if (widgetKey === 'chores' || widgetKey === 'packages' || widgetKey === 'medications' ||
            widgetKey === 'transit' || widgetKey === 'flights' || widgetKey === 'sports' ||
            widgetKey === 'tvSchedule' || widgetKey === 'photos' || widgetKey === 'photoFrame' ||
            widgetKey === 'energy' || widgetKey === 'messageBoard' || widgetKey === 'sharedLists' ||
            widgetKey === 'familyProfiles' || widgetKey === 'worldClocks' || widgetKey === 'eventCountdowns' ||
            widgetKey === 'habitTracker' || widgetKey === 'trivia' ||
            widgetKey === 'mealPlanner' || widgetKey === 'petFeeding' || widgetKey === 'plantWatering' ||
            widgetKey === 'budgetTracker') {
          return `
            <div class="form-row">
              <div class="form-group full-width">
                <p class="help-text">Configuration for this widget will be available soon. Enable the widget to use default settings.</p>
              </div>
            </div>
          `;
        }
        return '';
    }
  }

  bindWidgetEvents() {
    // Category collapse/expand
    document.querySelectorAll('.category-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const category = header.closest('.widget-category');
        category.classList.toggle('collapsed');
      });
    });

    // Widget toggle switches
    document.querySelectorAll('.widget-toggle').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const item = e.target.closest('.widget-item');
        const widgetKey = item.dataset.widget;

        if (e.target.checked) {
          item.classList.add('enabled');
        } else {
          item.classList.remove('enabled');
        }

        // Update category badge
        const category = item.closest('.widget-category');
        this.updateCategoryBadge(category);
        this.updateWidgetStats();
        this.unsavedChanges = true;
      });
    });

    // Config expand/collapse
    document.querySelectorAll('.config-expand-icon').forEach(icon => {
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = e.target.closest('.widget-item');
        if (item.classList.contains('has-config')) {
          item.classList.toggle('config-expanded');
        }
      });
    });

    // Track config changes
    document.querySelectorAll('.widget-input').forEach(input => {
      input.addEventListener('change', () => {
        this.unsavedChanges = true;
      });
    });

    // Search functionality
    const searchInput = document.getElementById('widget-search');
    searchInput.addEventListener('input', (e) => {
      this.filterWidgets(e.target.value);
    });

    // Show only enabled filter
    const filterCheckbox = document.getElementById('widget-filter-enabled');
    filterCheckbox.addEventListener('change', () => {
      this.filterWidgets(searchInput.value);
    });

    // Garbage day widget handlers
    this.bindGarbageDayHandlers();
  }

  bindGarbageDayHandlers() {
    // Toggle between simple and advanced mode
    document.querySelectorAll('.btn-toggle-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target;
        const widgetItem = button.closest('.widget-item');
        const simpleMode = widgetItem.querySelector('.garbage-simple-mode');
        const advancedMode = widgetItem.querySelector('.garbage-advanced-mode');
        const currentMode = button.dataset.mode;

        if (currentMode === 'simple') {
          // Switch to advanced (JSON)
          const schedule = this.collectGarbageScheduleFromForm(widgetItem);
          const jsonTextarea = advancedMode.querySelector('.garbage-json');
          jsonTextarea.value = JSON.stringify(schedule, null, 2);

          simpleMode.style.display = 'none';
          advancedMode.style.display = 'block';
          button.textContent = 'Switch to Simple Form';
          button.dataset.mode = 'advanced';
        } else {
          // Switch to simple form
          try {
            const jsonTextarea = advancedMode.querySelector('.garbage-json');
            const schedule = JSON.parse(jsonTextarea.value || '[]');
            this.renderGarbageScheduleItems(widgetItem, schedule);

            simpleMode.style.display = 'block';
            advancedMode.style.display = 'none';
            button.textContent = 'Switch to Advanced (JSON)';
            button.dataset.mode = 'simple';
          } catch (err) {
            alert('Invalid JSON format. Please fix the JSON before switching back to simple mode.');
          }
        }
      });
    });

    // Add new garbage item
    document.querySelectorAll('.btn-add-garbage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const widgetItem = e.target.closest('.widget-item');
        const list = widgetItem.querySelector('.garbage-schedule-list');
        const noItemsMsg = list.querySelector('.no-items-message');
        if (noItemsMsg) noItemsMsg.remove();

        const index = list.children.length;
        const itemHtml = `
          <div class="garbage-schedule-item" data-index="${index}">
            <input type="text" class="garbage-type" placeholder="Type (e.g., Trash)" value="" />
            <select class="garbage-day">
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
            <input type="color" class="garbage-color" value="#4CAF50" />
            <button type="button" class="btn-remove-garbage" title="Remove">✕</button>
          </div>
        `;
        list.insertAdjacentHTML('beforeend', itemHtml);
        this.bindGarbageItemRemoveHandlers();
        this.unsavedChanges = true;
      });
    });

    this.bindGarbageItemRemoveHandlers();
  }

  bindGarbageItemRemoveHandlers() {
    document.querySelectorAll('.btn-remove-garbage').forEach(btn => {
      btn.replaceWith(btn.cloneNode(true)); // Remove old listeners
    });

    document.querySelectorAll('.btn-remove-garbage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.garbage-schedule-item');
        const list = item.closest('.garbage-schedule-list');
        item.remove();

        // Show message if no items left
        if (list.children.length === 0) {
          list.innerHTML = '<div class="no-items-message">No items added yet</div>';
        }

        this.unsavedChanges = true;
      });
    });
  }

  collectGarbageScheduleFromForm(widgetItem) {
    const items = widgetItem.querySelectorAll('.garbage-schedule-item');
    const schedule = [];

    items.forEach(item => {
      const type = item.querySelector('.garbage-type').value.trim();
      const day = item.querySelector('.garbage-day').value;
      const color = item.querySelector('.garbage-color').value;

      if (type) { // Only add if type is not empty
        schedule.push({ type, day, color });
      }
    });

    return schedule;
  }

  renderGarbageScheduleItems(widgetItem, schedule) {
    const list = widgetItem.querySelector('.garbage-schedule-list');

    if (schedule.length === 0) {
      list.innerHTML = '<div class="no-items-message">No items added yet</div>';
      return;
    }

    list.innerHTML = schedule.map((item, index) => `
      <div class="garbage-schedule-item" data-index="${index}">
        <input type="text" class="garbage-type" placeholder="Type (e.g., Trash)" value="${this.escapeHtml(item.type || '')}" />
        <select class="garbage-day">
          <option value="Monday" ${item.day === 'Monday' ? 'selected' : ''}>Monday</option>
          <option value="Tuesday" ${item.day === 'Tuesday' ? 'selected' : ''}>Tuesday</option>
          <option value="Wednesday" ${item.day === 'Wednesday' ? 'selected' : ''}>Wednesday</option>
          <option value="Thursday" ${item.day === 'Thursday' ? 'selected' : ''}>Thursday</option>
          <option value="Friday" ${item.day === 'Friday' ? 'selected' : ''}>Friday</option>
          <option value="Saturday" ${item.day === 'Saturday' ? 'selected' : ''}>Saturday</option>
          <option value="Sunday" ${item.day === 'Sunday' ? 'selected' : ''}>Sunday</option>
        </select>
        <input type="color" class="garbage-color" value="${item.color || '#4CAF50'}" />
        <button type="button" class="btn-remove-garbage" title="Remove">✕</button>
      </div>
    `).join('');

    this.bindGarbageItemRemoveHandlers();
  }

  updateCategoryBadge(category) {
    const widgets = category.querySelectorAll('.widget-item');
    let enabledCount = 0;

    widgets.forEach(widget => {
      const toggle = widget.querySelector('.widget-toggle');
      if (toggle && toggle.checked) {
        enabledCount++;
      }
    });

    const badge = category.querySelector('.category-badge');
    badge.textContent = enabledCount;
    if (enabledCount === 0) {
      badge.classList.add('empty');
    } else {
      badge.classList.remove('empty');
    }
  }

  updateWidgetStats() {
    let totalEnabled = 0;
    document.querySelectorAll('.widget-toggle:checked').forEach(() => {
      totalEnabled++;
    });

    document.getElementById('widget-count').textContent = totalEnabled;
  }

  filterWidgets(searchTerm) {
    const showOnlyEnabled = document.getElementById('widget-filter-enabled').checked;
    const term = searchTerm.toLowerCase().trim();

    document.querySelectorAll('.widget-category').forEach(category => {
      const widgets = category.querySelectorAll('.widget-item');
      let visibleWidgets = 0;

      widgets.forEach(widget => {
        const widgetName = widget.querySelector('.widget-name').textContent.toLowerCase();
        const widgetDesc = widget.querySelector('.widget-description').textContent.toLowerCase();
        const isEnabled = widget.querySelector('.widget-toggle').checked;

        const matchesSearch = !term || widgetName.includes(term) || widgetDesc.includes(term);
        const matchesFilter = !showOnlyEnabled || isEnabled;

        if (matchesSearch && matchesFilter) {
          widget.classList.remove('hidden');
          visibleWidgets++;
        } else {
          widget.classList.add('hidden');
        }
      });

      // Hide category if no visible widgets
      if (visibleWidgets === 0) {
        category.classList.add('hidden');
      } else {
        category.classList.remove('hidden');
      }
    });
  }

  collectWidgetConfig(widgetKey, item) {
    const config = { enabled: item.querySelector('.widget-toggle').checked };

    // Special handling for garbage day widget
    if (widgetKey === 'garbageDay') {
      const advancedMode = item.querySelector('.garbage-advanced-mode');
      const simpleMode = item.querySelector('.garbage-simple-mode');

      if (advancedMode && advancedMode.style.display !== 'none') {
        // In advanced mode - use JSON textarea
        const jsonTextarea = item.querySelector('.garbage-json');
        try {
          config.schedule = JSON.parse(jsonTextarea.value || '[]');
        } catch {
          config.schedule = [];
        }
      } else {
        // In simple mode - collect from form
        config.schedule = this.collectGarbageScheduleFromForm(item);
      }

      return config;
    }

    // Collect widget-specific configuration
    item.querySelectorAll('.widget-input').forEach(input => {
      const field = input.dataset.field;
      if (!field) return;

      if (input.type === 'checkbox') {
        config[field] = input.checked;
      } else if (input.type === 'number') {
        config[field] = parseFloat(input.value) || 0;
      } else if (input.tagName === 'TEXTAREA') {
        // Handle arrays (one per line)
        if (field === 'feeds' || field === 'items' || field === 'entities') {
          config[field] = input.value.split('\n').map(s => s.trim()).filter(s => s);
        } else if (field === 'routes' || field === 'schedule') {
          try {
            config[field] = JSON.parse(input.value || '[]');
          } catch {
            config[field] = [];
          }
        } else {
          config[field] = input.value;
        }
      } else if (field === 'symbols' || field === 'coins' || field === 'subreddits' || field === 'currencies') {
        // Handle comma-separated arrays
        config[field] = input.value.split(',').map(s => s.trim()).filter(s => s);
      } else {
        config[field] = input.value;
      }
    });

    return config;
  }

  setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabId = e.target.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
      });
    });
  }

  bindEvents() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      const submitBtn = e.target.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';

      try {
        await this.login(password);
        errorEl.classList.remove('visible');
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('visible');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => this.saveConfig());

    // Reload button
    document.getElementById('reload-btn').addEventListener('click', () => this.reloadConfig());

    // Add calendar button
    document.getElementById('add-calendar-btn').addEventListener('click', () => this.addCalendar());

    // Add location button
    document.getElementById('add-location-btn').addEventListener('click', () => this.addLocation());

    // Test weather button
    document.getElementById('test-weather-btn').addEventListener('click', () => this.testWeather());

    // Toggle API key visibility
    document.getElementById('toggle-api-key').addEventListener('click', (e) => {
      const input = document.getElementById('weather-api-key');
      const btn = e.target;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });

    // Track changes
    document.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('change', () => {
        this.unsavedChanges = true;
      });
    });

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Password field handling
    const passwordField = document.getElementById('admin-password');
    passwordField.addEventListener('focus', function() {
      if (this.value === '********') {
        this.value = '';
      }
    });

    passwordField.addEventListener('blur', function() {
      if (this.value === '' && this.placeholder.includes('Password is set')) {
        this.value = '********';
      }
    });
  }

  bindCalendarEvents() {
    // Toggle expand/collapse
    document.querySelectorAll('.calendar-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-calendar-btn')) return;
        const item = header.closest('.calendar-item');
        item.classList.toggle('expanded');
      });
    });

    // Remove calendar buttons
    document.querySelectorAll('.remove-calendar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.calendar-item');
        const index = parseInt(item.dataset.index);
        this.removeCalendar(index);
      });
    });

    // Test calendar buttons
    document.querySelectorAll('.test-calendar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.calendar-item');
        const index = parseInt(item.dataset.index);
        this.testCalendar(index);
      });
    });

    // Update preview on name/color change
    document.querySelectorAll('.calendar-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const item = e.target.closest('.calendar-item');
        item.querySelector('.calendar-name').textContent = e.target.value || 'Unnamed Calendar';
        this.unsavedChanges = true;
      });
    });

    document.querySelectorAll('.calendar-color-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const item = e.target.closest('.calendar-item');
        item.querySelector('.calendar-color-preview').style.backgroundColor = e.target.value;
        this.unsavedChanges = true;
      });
    });

    document.querySelectorAll('.calendar-url-input').forEach(input => {
      input.addEventListener('change', () => {
        this.unsavedChanges = true;
      });
    });
  }

  bindLocationEvents() {
    // Remove location buttons
    document.querySelectorAll('.remove-location-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.location-item');
        const index = parseInt(item.dataset.index);
        this.removeLocation(index);
      });
    });

    // Track changes
    document.querySelectorAll('.location-name-input, .location-lat-input, .location-lon-input').forEach(input => {
      input.addEventListener('change', () => {
        this.unsavedChanges = true;
      });
    });
  }

  addCalendar() {
    if (!this.config.calendars) {
      this.config.calendars = [];
    }

    this.config.calendars.push({
      name: 'New Calendar',
      url: '',
      color: this.getRandomColor()
    });

    this.renderCalendars();
    this.unsavedChanges = true;

    // Expand the new calendar
    const items = document.querySelectorAll('.calendar-item');
    const lastItem = items[items.length - 1];
    if (lastItem) {
      lastItem.classList.add('expanded');
      lastItem.querySelector('.calendar-name-input').focus();
    }
  }

  removeCalendar(index) {
    if (confirm('Are you sure you want to remove this calendar?')) {
      this.config.calendars.splice(index, 1);
      this.renderCalendars();
      this.unsavedChanges = true;
    }
  }

  addLocation() {
    if (!this.config.weather) {
      this.config.weather = {};
    }
    if (!this.config.weather.additionalLocations) {
      this.config.weather.additionalLocations = [];
    }

    this.config.weather.additionalLocations.push({
      name: '',
      latitude: 0,
      longitude: 0
    });

    this.renderAdditionalLocations();
    this.unsavedChanges = true;

    // Focus the new location name
    const items = document.querySelectorAll('.location-item');
    const lastItem = items[items.length - 1];
    if (lastItem) {
      lastItem.querySelector('.location-name-input').focus();
    }
  }

  removeLocation(index) {
    if (confirm('Are you sure you want to remove this location?')) {
      this.config.weather.additionalLocations.splice(index, 1);
      this.renderAdditionalLocations();
      this.unsavedChanges = true;
    }
  }

  getRandomColor() {
    const colors = ['#4CAF50', '#9C27B0', '#2196F3', '#FF9800', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  collectFormData() {
    // Collect calendar data
    const calendars = [];
    document.querySelectorAll('.calendar-item').forEach(item => {
      calendars.push({
        name: item.querySelector('.calendar-name-input').value.trim(),
        url: item.querySelector('.calendar-url-input').value.trim(),
        color: item.querySelector('.calendar-color-input').value
      });
    });

    // Collect additional locations
    const additionalLocations = [];
    document.querySelectorAll('.location-item').forEach(item => {
      const name = item.querySelector('.location-name-input').value.trim();
      const lat = parseFloat(item.querySelector('.location-lat-input').value);
      const lon = parseFloat(item.querySelector('.location-lon-input').value);
      if (name && !isNaN(lat) && !isNaN(lon)) {
        additionalLocations.push({ name, latitude: lat, longitude: lon });
      }
    });

    // Parse slideshow images
    const slideshowImagesStr = document.getElementById('display-slideshow-images').value;
    const slideshowImages = slideshowImagesStr
      ? slideshowImagesStr.split(',').map(s => s.trim()).filter(s => s)
      : [];

    const passwordValue = document.getElementById('admin-password').value;

    // Collect widget configurations
    const widgets = {};
    document.querySelectorAll('.widget-item').forEach(item => {
      const widgetKey = item.dataset.widget;
      widgets[widgetKey] = this.collectWidgetConfig(widgetKey, item);
    });

    return {
      weather: {
        apiKey: document.getElementById('weather-api-key').value.trim(),
        latitude: parseFloat(document.getElementById('weather-lat').value) || 0,
        longitude: parseFloat(document.getElementById('weather-lon').value) || 0,
        units: document.getElementById('weather-units').value,
        showAlerts: document.getElementById('weather-show-alerts').checked,
        showAirQuality: document.getElementById('weather-show-aqi').checked,
        additionalLocations: additionalLocations
      },
      calendars: calendars,
      display: {
        daysToShow: parseInt(document.getElementById('display-days').value) || 7,
        refreshIntervalMinutes: parseInt(document.getElementById('display-refresh').value) || 5,
        timeFormat: document.getElementById('display-time-format').value,
        dateFormat: document.getElementById('display-date-format').value,
        theme: document.getElementById('display-theme').value,
        calendarView: document.getElementById('display-calendar-view').value,
        backgroundImage: document.getElementById('display-background').value.trim() || null,
        backgroundSlideshow: document.getElementById('display-slideshow').checked,
        slideshowInterval: parseInt(document.getElementById('display-slideshow-interval').value) || 30,
        backgroundImages: slideshowImages,
        showEventDuration: document.getElementById('display-show-duration').checked,
        showEventCountdown: document.getElementById('display-show-countdown').checked,
        showTodayBadge: document.getElementById('display-show-badge').checked,
        customCSS: document.getElementById('display-custom-css').value,
        hiddenCalendars: this.config.display?.hiddenCalendars || [],
        layout: this.layoutManager ? this.layoutManager.collectFormData() : (this.config.display?.layout || {})
      },
      features: {
        screenWakeLock: document.getElementById('feature-wakelock').checked,
        offlineMode: document.getElementById('feature-offline').checked,
        birthdayRecognition: document.getElementById('feature-birthday').checked,
        voiceAnnouncements: document.getElementById('feature-voice').checked,
        touchGestures: document.getElementById('feature-touch').checked
      },
      accessibility: {
        highContrast: document.getElementById('access-high-contrast').checked,
        largeText: document.getElementById('access-large-text').checked,
        reduceMotion: document.getElementById('access-reduce-motion').checked
      },
      server: {
        port: parseInt(document.getElementById('server-port').value) || 3000
      },
      admin: {
        password: passwordValue || null
      },
      widgets: widgets,
      integrations: this.config.integrations || {},
      setupComplete: true
    };
  }

  async saveConfig() {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      const newConfig = this.collectFormData();

      // Client-side validation
      if (newConfig.admin.password && newConfig.admin.password !== '********' && newConfig.admin.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const response = await this.fetchWithAuth('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      const data = await response.json();

      if (response.ok) {
        this.unsavedChanges = false;
        this.showStatus('success', 'Configuration saved successfully!');
        await this.loadConfig();
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      this.showStatus('error', 'Failed to save: ' + err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }

  async reloadConfig() {
    if (this.unsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to reload?')) {
        return;
      }
    }

    try {
      const response = await this.fetchWithAuth('/api/admin/reload', {
        method: 'POST'
      });

      if (response.ok) {
        await this.loadConfig();
        this.showStatus('success', 'Configuration reloaded from file');
      } else {
        throw new Error('Failed to reload');
      }
    } catch (err) {
      this.showStatus('error', 'Failed to reload: ' + err.message);
    }
  }

  async testWeather() {
    const resultEl = document.getElementById('weather-test-result');
    const testBtn = document.getElementById('test-weather-btn');

    resultEl.textContent = 'Testing...';
    resultEl.className = 'test-result';
    testBtn.disabled = true;

    try {
      const response = await this.fetchWithAuth('/api/admin/test-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: document.getElementById('weather-api-key').value.trim(),
          latitude: parseFloat(document.getElementById('weather-lat').value),
          longitude: parseFloat(document.getElementById('weather-lon').value)
        })
      });

      const data = await response.json();

      if (data.success) {
        resultEl.textContent = data.message;
        resultEl.className = 'test-result success';
      } else {
        resultEl.textContent = 'Error: ' + data.error;
        resultEl.className = 'test-result error';
      }
    } catch (err) {
      resultEl.textContent = 'Error: ' + err.message;
      resultEl.className = 'test-result error';
    } finally {
      testBtn.disabled = false;
    }
  }

  async testCalendar(index) {
    const item = document.querySelector(`.calendar-item[data-index="${index}"]`);
    const resultEl = item.querySelector('.calendar-test-result');
    const testBtn = item.querySelector('.test-calendar-btn');
    const url = item.querySelector('.calendar-url-input').value.trim();

    resultEl.textContent = 'Testing...';
    resultEl.className = 'test-result';
    testBtn.disabled = true;

    if (!url) {
      resultEl.textContent = 'Please enter a URL';
      resultEl.className = 'test-result error';
      testBtn.disabled = false;
      return;
    }

    try {
      const response = await this.fetchWithAuth('/api/admin/test-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        resultEl.textContent = data.message;
        resultEl.className = 'test-result success';
      } else {
        resultEl.textContent = 'Error: ' + data.error;
        resultEl.className = 'test-result error';
      }
    } catch (err) {
      resultEl.textContent = 'Error: ' + err.message;
      resultEl.className = 'test-result error';
    } finally {
      testBtn.disabled = false;
    }
  }

  showStatus(type, message) {
    const statusBar = document.getElementById('status-bar');
    statusBar.textContent = message;
    statusBar.className = 'status-bar ' + type;

    setTimeout(() => {
      statusBar.className = 'status-bar';
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.calboardAdmin = new CalboardAdmin();
});
