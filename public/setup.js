// Calboard Setup Wizard JavaScript

class SetupWizard {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 7;
    this.profiles = [];
    this.config = {
      weather: {
        apiKey: '',
        latitude: 0,
        longitude: 0,
        units: 'imperial'
      },
      profiles: [],
      display: {
        daysToShow: 7,
        refreshIntervalMinutes: 5,
        timeFormat: '12h',
        dateFormat: 'en-US',
        backgroundImage: null,
        calendarView: 'timeline'
      },
      server: {
        port: 3000
      },
      admin: {
        password: null
      }
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.addInitialCalendar();
    this.updateNavigation();
  }

  bindEvents() {
    // Navigation buttons
    document.getElementById('next-btn').addEventListener('click', () => this.nextStep());
    document.getElementById('prev-btn').addEventListener('click', () => this.prevStep());

    // Detect location
    document.getElementById('detect-location').addEventListener('click', () => this.detectLocation());

    // Test weather
    document.getElementById('test-weather').addEventListener('click', () => this.testWeather());

    // Add profile
    document.getElementById('add-profile').addEventListener('click', () => this.addProfile());

    // Add calendar
    document.getElementById('add-calendar').addEventListener('click', () => this.addCalendar());

    // Password validation
    document.getElementById('confirm-password').addEventListener('input', () => this.validatePasswords());
    document.getElementById('admin-password').addEventListener('input', () => this.validatePasswords());
  }

  showStep(step) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(el => {
      el.classList.remove('active');
    });

    // Show current step
    const stepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
    if (stepEl) {
      stepEl.classList.add('active');
    }

    // Update progress bar
    document.querySelectorAll('.progress-steps .step').forEach(el => {
      const stepNum = parseInt(el.dataset.step);
      el.classList.remove('active', 'completed');
      if (stepNum === this.currentStep) {
        el.classList.add('active');
      } else if (stepNum < this.currentStep) {
        el.classList.add('completed');
      }
    });

    this.updateNavigation();
  }

  updateNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // Show/hide back button
    prevBtn.style.visibility = this.currentStep > 1 ? 'visible' : 'hidden';

    // Update next button text
    if (this.currentStep === 1) {
      nextBtn.textContent = 'Get Started';
    } else if (this.currentStep === this.totalSteps) {
      nextBtn.textContent = 'Complete Setup';
    } else if (this.currentStep > this.totalSteps) {
      nextBtn.textContent = 'Go to Dashboard';
    } else {
      nextBtn.textContent = 'Continue';
    }
  }

  async nextStep() {
    // Validate current step before proceeding
    if (!await this.validateCurrentStep()) {
      return;
    }

    // Collect data from current step
    this.collectStepData();

    if (this.currentStep === this.totalSteps) {
      // Complete setup
      await this.completeSetup();
      this.currentStep = 'complete';
      this.showStep('complete');
      this.updateCompletionSummary();
    } else if (this.currentStep === 'complete') {
      // Redirect to dashboard
      window.location.href = '/';
    } else {
      this.currentStep++;
      this.showStep(this.currentStep);
    }
  }

  prevStep() {
    if (this.currentStep > 1 && this.currentStep !== 'complete') {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  }

  async validateCurrentStep() {
    switch (this.currentStep) {
      case 2: // Weather API
        const apiKey = document.getElementById('api-key').value.trim();
        if (!apiKey) {
          this.showValidation('api-key-validation', 'Please enter your API key', 'error');
          return false;
        }
        if (apiKey.length < 20) {
          this.showValidation('api-key-validation', 'API key seems too short', 'error');
          return false;
        }
        this.showValidation('api-key-validation', '', '');
        return true;

      case 3: // Location
        const lat = parseFloat(document.getElementById('latitude').value);
        const lon = parseFloat(document.getElementById('longitude').value);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          this.showValidation('location-validation', 'Please enter a valid latitude (-90 to 90)', 'error');
          return false;
        }
        if (isNaN(lon) || lon < -180 || lon > 180) {
          this.showValidation('location-validation', 'Please enter a valid longitude (-180 to 180)', 'error');
          return false;
        }
        this.showValidation('location-validation', '', '');
        return true;

      case 4: // Profiles
        // Profiles are optional but recommended
        return true;

      case 5: // Calendars
        // Calendars are optional, so always valid
        return true;

      case 6: // Display
        // Always valid
        return true;

      case 7: // Security
        const password = document.getElementById('admin-password').value;
        const confirm = document.getElementById('confirm-password').value;
        if (password && password.length < 8) {
          this.showValidation('password-validation', 'Password must be at least 8 characters', 'error');
          return false;
        }
        if (password && password !== confirm) {
          this.showValidation('password-validation', 'Passwords do not match', 'error');
          return false;
        }
        return true;

      default:
        return true;
    }
  }

  collectStepData() {
    switch (this.currentStep) {
      case 2:
        this.config.weather.apiKey = document.getElementById('api-key').value.trim();
        break;

      case 3:
        this.config.weather.latitude = parseFloat(document.getElementById('latitude').value);
        this.config.weather.longitude = parseFloat(document.getElementById('longitude').value);
        this.config.weather.units = document.getElementById('units').value;
        break;

      case 4:
        this.collectProfiles();
        break;

      case 5:
        this.collectCalendars();
        break;

      case 6:
        this.config.display.daysToShow = parseInt(document.getElementById('days-to-show').value);
        this.config.display.refreshIntervalMinutes = parseInt(document.getElementById('refresh-interval').value);
        this.config.display.timeFormat = document.getElementById('time-format').value;
        this.config.display.dateFormat = document.getElementById('date-format').value;
        break;

      case 7:
        const password = document.getElementById('admin-password').value;
        this.config.admin.password = password || null;
        break;
    }
  }

  collectProfiles() {
    this.profiles = [];
    document.querySelectorAll('.profile-entry').forEach((entry, index) => {
      const name = entry.querySelector('.profile-name').value.trim();
      const color = entry.querySelector('.profile-color').value;

      if (name) {
        this.profiles.push({
          id: `profile-${index + 1}`,
          name: name,
          color: color,
          image: null,
          visible: true,
          calendars: []
        });
      }
    });

    // Update profile dropdowns in calendar section
    this.updateProfileDropdowns();
  }

  collectCalendars() {
    // Reset calendars in all profiles
    this.profiles.forEach(p => p.calendars = []);

    document.querySelectorAll('.calendar-entry').forEach((entry, index) => {
      const profileId = entry.querySelector('.calendar-profile').value;
      const name = entry.querySelector('.calendar-name').value.trim();
      const url = entry.querySelector('.calendar-url').value.trim();

      if (name && url && profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (profile) {
          profile.calendars.push({
            id: `cal-${index + 1}`,
            name: name,
            url: url,
            enabled: true
          });
        }
      }
    });

    this.config.profiles = this.profiles;
  }

  updateProfileDropdowns() {
    const selects = document.querySelectorAll('.calendar-profile');
    selects.forEach(select => {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Select Profile</option>';

      this.profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        if (profile.id === currentValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });
  }

  showValidation(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.className = 'validation-message ' + type;
    }
  }

  detectLocation() {
    const btn = document.getElementById('detect-location');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">...</span> Detecting...';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('latitude').value = position.coords.latitude.toFixed(4);
          document.getElementById('longitude').value = position.coords.longitude.toFixed(4);
          this.showValidation('location-validation', 'Location detected successfully!', 'success');
          btn.disabled = false;
          btn.innerHTML = '<span class="btn-icon">&#128205;</span> Detect My Location';
        },
        (error) => {
          let msg = 'Unable to detect location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg += 'Permission denied.';
              break;
            case error.POSITION_UNAVAILABLE:
              msg += 'Position unavailable.';
              break;
            case error.TIMEOUT:
              msg += 'Request timed out.';
              break;
          }
          this.showValidation('location-validation', msg, 'error');
          btn.disabled = false;
          btn.innerHTML = '<span class="btn-icon">&#128205;</span> Detect My Location';
        }
      );
    } else {
      this.showValidation('location-validation', 'Geolocation not supported by browser', 'error');
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-icon">&#128205;</span> Detect My Location';
    }
  }

  async testWeather() {
    const resultEl = document.getElementById('weather-test-result');
    const btn = document.getElementById('test-weather');

    const apiKey = document.getElementById('api-key').value.trim();
    const lat = document.getElementById('latitude').value;
    const lon = document.getElementById('longitude').value;

    if (!apiKey) {
      resultEl.textContent = 'Please enter API key first';
      resultEl.className = 'test-result error';
      return;
    }

    if (!lat || !lon) {
      resultEl.textContent = 'Please enter location first';
      resultEl.className = 'test-result error';
      return;
    }

    btn.disabled = true;
    resultEl.textContent = 'Testing...';
    resultEl.className = 'test-result';

    try {
      const response = await fetch('/api/setup/test-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon)
        })
      });

      const data = await response.json();

      if (data.success) {
        resultEl.textContent = `Success! Location: ${data.location}, ${data.country}`;
        resultEl.className = 'test-result success';
      } else {
        resultEl.textContent = `Error: ${data.error}`;
        resultEl.className = 'test-result error';
      }
    } catch (err) {
      resultEl.textContent = `Error: ${err.message}`;
      resultEl.className = 'test-result error';
    }

    btn.disabled = false;
  }

  addInitialCalendar() {
    // Don't add initial calendar - wait for profiles first
  }

  addProfile() {
    const container = document.getElementById('profiles-container');
    const template = document.getElementById('profile-template');
    const clone = template.content.cloneNode(true);

    // Assign random color
    const colors = ['#4CAF50', '#9C27B0', '#2196F3', '#FF9800', '#E91E63', '#00BCD4'];
    const colorInput = clone.querySelector('.profile-color');
    colorInput.value = colors[container.children.length % colors.length];

    // Bind remove button
    const removeBtn = clone.querySelector('.btn-remove');
    removeBtn.addEventListener('click', (e) => {
      e.target.closest('.profile-entry').remove();
    });

    container.appendChild(clone);
  }

  addCalendar() {
    const container = document.getElementById('calendars-container');
    const template = document.getElementById('calendar-template');
    const clone = template.content.cloneNode(true);

    // Populate profile dropdown
    const profileSelect = clone.querySelector('.calendar-profile');
    profileSelect.innerHTML = '<option value="">Select Profile</option>';
    this.profiles.forEach(profile => {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      profileSelect.appendChild(option);
    });

    // Bind remove button
    const removeBtn = clone.querySelector('.btn-remove');
    removeBtn.addEventListener('click', (e) => {
      e.target.closest('.calendar-entry').remove();
    });

    // Bind test button
    const testBtn = clone.querySelector('.btn-test-calendar');
    testBtn.addEventListener('click', (e) => {
      this.testCalendar(e.target.closest('.calendar-entry'));
    });

    container.appendChild(clone);
  }

  async testCalendar(entry) {
    const url = entry.querySelector('.calendar-url').value.trim();
    const resultEl = entry.querySelector('.calendar-test-result');
    const btn = entry.querySelector('.btn-test-calendar');

    if (!url) {
      resultEl.textContent = 'Please enter a URL';
      resultEl.className = 'calendar-test-result error';
      return;
    }

    btn.disabled = true;
    resultEl.textContent = 'Testing...';
    resultEl.className = 'calendar-test-result';

    try {
      const response = await fetch('/api/setup/test-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        resultEl.textContent = `Success! ${data.eventCount} events found`;
        resultEl.className = 'calendar-test-result success';
      } else {
        resultEl.textContent = `Error: ${data.error}`;
        resultEl.className = 'calendar-test-result error';
      }
    } catch (err) {
      resultEl.textContent = `Error: ${err.message}`;
      resultEl.className = 'calendar-test-result error';
    }

    btn.disabled = false;
  }

  validatePasswords() {
    const password = document.getElementById('admin-password').value;
    const confirm = document.getElementById('confirm-password').value;
    const resultEl = document.getElementById('password-validation');

    if (!password) {
      resultEl.textContent = '';
      resultEl.className = 'validation-message';
      return;
    }

    if (password.length < 8) {
      resultEl.textContent = 'Password must be at least 8 characters';
      resultEl.className = 'validation-message error';
      return;
    }

    if (confirm && password !== confirm) {
      resultEl.textContent = 'Passwords do not match';
      resultEl.className = 'validation-message error';
      return;
    }

    if (confirm && password === confirm) {
      resultEl.textContent = 'Passwords match';
      resultEl.className = 'validation-message success';
    } else {
      resultEl.textContent = '';
      resultEl.className = 'validation-message';
    }
  }

  async completeSetup() {
    const btn = document.getElementById('next-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      console.log('Sending config:', JSON.stringify(this.config, null, 2));

      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Setup failed');
      }

      btn.disabled = false;
    } catch (err) {
      console.error('Setup error:', err);
      alert('Setup failed: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Complete Setup';
      throw err;
    }
  }

  updateCompletionSummary() {
    // Location
    const locationEl = document.getElementById('summary-location');
    locationEl.textContent = `${this.config.weather.latitude.toFixed(2)}, ${this.config.weather.longitude.toFixed(2)}`;

    // Calendars
    const calendarsEl = document.getElementById('summary-calendars');
    let totalCalendars = 0;
    this.profiles.forEach(p => totalCalendars += p.calendars.length);
    calendarsEl.textContent = totalCalendars;

    // Security
    const securityEl = document.getElementById('summary-security');
    securityEl.textContent = this.config.admin.password
      ? 'Admin password set'
      : 'No password (open access)';
  }
}

// Initialize wizard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.setupWizard = new SetupWizard();
});
