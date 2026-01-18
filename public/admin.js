// Calboard Admin Panel JavaScript

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
  }

  async checkAuthRequired() {
    try {
      const response = await fetch('/api/admin/auth-required', {
        credentials: 'same-origin' // Include cookies
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
        headers: {
          'Content-Type': 'application/json'
        },
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
    // Always include credentials for session cookies
    options.credentials = 'same-origin';

    const response = await fetch(url, options);

    // If we get a 401, redirect to login
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

    // Display settings
    document.getElementById('display-days').value = this.config.display?.daysToShow || 7;
    document.getElementById('display-refresh').value = this.config.display?.refreshIntervalMinutes || 5;
    document.getElementById('display-time-format').value = this.config.display?.timeFormat || '12h';
    document.getElementById('display-date-format').value = this.config.display?.dateFormat || 'en-US';
    document.getElementById('display-background').value = this.config.display?.backgroundImage || '';

    // Server settings
    document.getElementById('server-port').value = this.config.server?.port || 3000;

    // Admin settings - show placeholder if password is set
    const passwordField = document.getElementById('admin-password');
    if (this.config.admin?.passwordHash === '********' || this.config.admin?.password === '********') {
      passwordField.value = '********';
      passwordField.placeholder = 'Password is set (enter new to change)';
    } else {
      passwordField.value = '';
      passwordField.placeholder = 'Set a password (min 8 characters)';
    }

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
      const submitBtn = e.target.querySelector('button[type="submit"]');

      // Disable button during login
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

    // Clear password placeholder on focus
    document.getElementById('admin-password').addEventListener('focus', function() {
      if (this.value === '********') {
        this.value = '';
      }
    });

    // Restore placeholder if empty on blur
    document.getElementById('admin-password').addEventListener('blur', function() {
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
        name: item.querySelector('.calendar-name-input').value.trim(),
        url: item.querySelector('.calendar-url-input').value.trim(),
        color: item.querySelector('.calendar-color-input').value
      });
    });

    const passwordValue = document.getElementById('admin-password').value;

    return {
      weather: {
        apiKey: document.getElementById('weather-api-key').value.trim(),
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
        backgroundImage: document.getElementById('display-background').value.trim() || null
      },
      server: {
        port: parseInt(document.getElementById('server-port').value) || 3000
      },
      admin: {
        password: passwordValue || null
      }
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      });

      const data = await response.json();

      if (response.ok) {
        this.unsavedChanges = false;
        this.showStatus('success', 'Configuration saved successfully!');

        // Reload config to get updated state
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
        headers: {
          'Content-Type': 'application/json'
        },
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
    } finally {
      testBtn.disabled = false;
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
