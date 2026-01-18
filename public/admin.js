// Calboard Admin Panel JavaScript

class CalboardAdmin {
  constructor() {
    this.config = null;
    this.password = null;
    this.unsavedChanges = false;

    this.init();
  }

  async init() {
    // Check if authentication is required
    const authStatus = await this.checkAuthRequired();

    if (authStatus.required) {
      this.showLoginModal();
    } else {
      await this.loadConfig();
    }

    this.bindEvents();
  }

  async checkAuthRequired() {
    try {
      const response = await fetch('/api/admin/auth-required');
      return await response.json();
    } catch (err) {
      console.error('Failed to check auth status:', err);
      return { required: false };
    }
  }

  showLoginModal() {
    document.getElementById('login-modal').classList.add('visible');
  }

  hideLoginModal() {
    document.getElementById('login-modal').classList.remove('visible');
  }

  async login(password) {
    this.password = password;
    try {
      const response = await this.fetchWithAuth('/api/admin/config');
      if (response.ok) {
        this.hideLoginModal();
        await this.loadConfig();
        return true;
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      this.password = null;
      throw err;
    }
  }

  async fetchWithAuth(url, options = {}) {
    const headers = options.headers || {};
    if (this.password) {
      headers['X-Admin-Password'] = this.password;
    }
    return fetch(url, { ...options, headers });
  }

  async loadConfig() {
    try {
      const response = await this.fetchWithAuth('/api/admin/config');
      if (!response.ok) {
        if (response.status === 401) {
          this.showLoginModal();
          return;
        }
        throw new Error('Failed to load configuration');
      }
      this.config = await response.json();
      this.populateForm();
      this.unsavedChanges = false;
    } catch (err) {
      this.showStatus('error', 'Failed to load configuration: ' + err.message);
    }
  }

  populateForm() {
    // Weather settings
    document.getElementById('weather-api-key').value = this.config.weather?.apiKey || '';
    document.getElementById('weather-lat').value = this.config.weather?.latitude || '';
    document.getElementById('weather-lon').value = this.config.weather?.longitude || '';
    document.getElementById('weather-units').value = this.config.weather?.units || 'imperial';

    // Display settings
    document.getElementById('display-days').value = this.config.display?.daysToShow || 7;
    document.getElementById('display-refresh').value = this.config.display?.refreshIntervalMinutes || 5;
    document.getElementById('display-time-format').value = this.config.display?.timeFormat || '12h';
    document.getElementById('display-date-format').value = this.config.display?.dateFormat || 'en-US';
    document.getElementById('display-background').value = this.config.display?.backgroundImage || '';

    // Server settings
    document.getElementById('server-port').value = this.config.server?.port || 3000;

    // Admin settings
    document.getElementById('admin-password').value = this.config.admin?.password || '';

    // Calendars
    this.renderCalendars();
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

    // Bind calendar-specific events
    this.bindCalendarEvents();
  }

  bindEvents() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');

      try {
        await this.login(password);
        errorEl.classList.remove('visible');
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('visible');
      }
    });

    // Save button
    document.getElementById('save-btn').addEventListener('click', () => this.saveConfig());

    // Reload button
    document.getElementById('reload-btn').addEventListener('click', () => this.reloadConfig());

    // Add calendar button
    document.getElementById('add-calendar-btn').addEventListener('click', () => this.addCalendar());

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
    document.querySelectorAll('input, select').forEach(el => {
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

  getRandomColor() {
    const colors = ['#4CAF50', '#9C27B0', '#2196F3', '#FF9800', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  collectFormData() {
    // Collect calendar data from form
    const calendars = [];
    document.querySelectorAll('.calendar-item').forEach(item => {
      calendars.push({
        name: item.querySelector('.calendar-name-input').value,
        url: item.querySelector('.calendar-url-input').value,
        color: item.querySelector('.calendar-color-input').value
      });
    });

    return {
      weather: {
        apiKey: document.getElementById('weather-api-key').value,
        latitude: parseFloat(document.getElementById('weather-lat').value) || 0,
        longitude: parseFloat(document.getElementById('weather-lon').value) || 0,
        units: document.getElementById('weather-units').value
      },
      calendars: calendars,
      display: {
        daysToShow: parseInt(document.getElementById('display-days').value) || 7,
        refreshIntervalMinutes: parseInt(document.getElementById('display-refresh').value) || 5,
        timeFormat: document.getElementById('display-time-format').value,
        dateFormat: document.getElementById('display-date-format').value,
        backgroundImage: document.getElementById('display-background').value || null
      },
      server: {
        port: parseInt(document.getElementById('server-port').value) || 3000
      },
      admin: {
        password: document.getElementById('admin-password').value || null
      }
    };
  }

  async saveConfig() {
    try {
      const newConfig = this.collectFormData();

      const response = await this.fetchWithAuth('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });

      const data = await response.json();

      if (response.ok) {
        this.config = newConfig;
        this.unsavedChanges = false;
        this.showStatus('success', 'Configuration saved successfully!');

        // Update password if changed
        const newPassword = document.getElementById('admin-password').value;
        if (newPassword && newPassword !== '********') {
          this.password = newPassword;
        }
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      this.showStatus('error', 'Failed to save configuration: ' + err.message);
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
    resultEl.textContent = 'Testing...';
    resultEl.className = 'test-result';

    try {
      const response = await this.fetchWithAuth('/api/admin/test-weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: document.getElementById('weather-api-key').value,
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
    }
  }

  async testCalendar(index) {
    const item = document.querySelector(`.calendar-item[data-index="${index}"]`);
    const resultEl = item.querySelector('.calendar-test-result');
    const url = item.querySelector('.calendar-url-input').value;

    resultEl.textContent = 'Testing...';
    resultEl.className = 'test-result';

    if (!url) {
      resultEl.textContent = 'Please enter a URL';
      resultEl.className = 'test-result error';
      return;
    }

    try {
      const response = await this.fetchWithAuth('/api/admin/test-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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
    }
  }

  showStatus(type, message) {
    const statusBar = document.getElementById('status-bar');
    statusBar.textContent = message;
    statusBar.className = 'status-bar ' + type;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusBar.className = 'status-bar';
    }, 5000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.calboardAdmin = new CalboardAdmin();
});
