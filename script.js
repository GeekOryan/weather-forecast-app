/* ══════════════════════════════════════════════════════════
   Skies — Weather App
   ══════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────
let unit = localStorage.getItem('skies_unit') || 'C';       // 'C' | 'F'
let theme = localStorage.getItem('skies_theme') || 'dark';  // 'dark' | 'light'
let lastCity = null;      // last searched city string
let lastCoords = null;    // { lat, lon } for geo search
let lastWeatherData = null;
let lastForecastData = null;
let tempChart = null;
let debounceTimer = null;
let autocompleteController = null;

// ── DOM refs ───────────────────────────────────────────────
const $  = id => document.getElementById(id);
const cityInput        = $('cityInput');
const searchBtn        = $('searchBtn');
const clearBtn         = $('clearBtn');
const geoBtn           = $('geoBtn');
const unitToggle       = $('unitToggle');
const unitLabel        = $('unitLabel');
const themeToggle      = $('themeToggle');
const autocompleteList = $('autocompleteList');
const savedSection     = $('savedSection');
const savedList        = $('savedList');
const emptyState       = $('emptyState');
const errorState       = $('errorState');
const errorMsg         = $('errorMsg');
const retryBtn         = $('retryBtn');
const skeleton         = $('skeleton');
const weatherContent   = $('weatherContent');

// ── Init ───────────────────────────────────────────────────
applyTheme(theme);
updateUnitLabel();
renderSaved();
showEmpty();

// ── Theme ──────────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '');
}

themeToggle.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('skies_theme', theme);
  applyTheme(theme);
});

// ── Unit toggle ────────────────────────────────────────────
function updateUnitLabel() {
  unitLabel.textContent = `°${unit}`;
}

unitToggle.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  localStorage.setItem('skies_unit', unit);
  updateUnitLabel();
  if (lastWeatherData) renderAll(lastWeatherData, lastForecastData);
});

function toDisplay(celsius) {
  if (unit === 'F') return Math.round(celsius * 9 / 5 + 32);
  return Math.round(celsius);
}
function unitSuffix() { return `°${unit}`; }

// ── Saved locations ────────────────────────────────────────
function getSaved() {
  try { return JSON.parse(localStorage.getItem('skies_saved') || '[]'); }
  catch { return []; }
}
function setSaved(arr) {
  localStorage.setItem('skies_saved', JSON.stringify(arr));
}

function renderSaved() {
  const saved = getSaved();
  if (saved.length === 0) { savedSection.classList.add('hidden'); return; }
  savedSection.classList.remove('hidden');
  savedList.innerHTML = '';
  saved.forEach(name => {
    const chip = document.createElement('div');
    chip.className = 'saved-chip';
    chip.innerHTML = `
      <span class="saved-chip-name">${name}</span>
      <button class="saved-chip-remove" data-city="${name}" aria-label="Remove ${name}">×</button>
    `;
    chip.querySelector('.saved-chip-name').addEventListener('click', () => searchByCity(name));
    chip.querySelector('.saved-chip-remove').addEventListener('click', e => {
      e.stopPropagation();
      const updated = getSaved().filter(c => c !== name);
      setSaved(updated);
      renderSaved();
      updateSaveBtn();
    });
    savedList.appendChild(chip);
  });
}

function updateSaveBtn() {
  const saveBtn = $('saveBtn');
  if (!lastCity) return;
  const isSaved = getSaved().includes(lastCity);
  saveBtn.classList.toggle('saved', isSaved);
  saveBtn.title = isSaved ? 'Remove from saved' : 'Save location';
}

$('saveBtn').addEventListener('click', () => {
  if (!lastCity) return;
  const saved = getSaved();
  const idx = saved.indexOf(lastCity);
  if (idx === -1) { saved.push(lastCity); }
  else { saved.splice(idx, 1); }
  setSaved(saved);
  renderSaved();
  updateSaveBtn();
});

// ── State transitions ──────────────────────────────────────
function showEmpty() {
  skeleton.classList.add('hidden');
  errorState.classList.add('hidden');
  weatherContent.classList.add('hidden');
  emptyState.classList.remove('hidden');
}
function showSkeleton() {
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  weatherContent.classList.add('hidden');
  skeleton.classList.remove('hidden');
}
function showError(msg) {
  skeleton.classList.add('hidden');
  emptyState.classList.add('hidden');
  weatherContent.classList.add('hidden');
  errorMsg.textContent = msg || 'Something went wrong. Please try again.';
  errorState.classList.remove('hidden');
}
function showWeather() {
  skeleton.classList.add('hidden');
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');
  weatherContent.classList.remove('hidden');
}

// ── Search ─────────────────────────────────────────────────
async function searchByCity(city) {
  if (!city.trim()) return;
  lastCity = city.trim();
  lastCoords = null;
  cityInput.value = city;
  clearBtn.classList.remove('hidden');
  closeAutocomplete();
  await fetchAndRender({ city: lastCity });
}

async function searchByCoords(lat, lon) {
  lastCoords = { lat, lon };
  lastCity = null;
  closeAutocomplete();
  await fetchAndRender({ lat, lon });
}

searchBtn.addEventListener('click', () => {
  const val = cityInput.value.trim();
  if (val) searchByCity(val);
});

cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = cityInput.value.trim();
    if (val) searchByCity(val);
    closeAutocomplete();
  }
  if (e.key === 'Escape') closeAutocomplete();
  if (e.key === 'ArrowDown') navigateAutocomplete(1);
  if (e.key === 'ArrowUp') navigateAutocomplete(-1);
});

clearBtn.addEventListener('click', () => {
  cityInput.value = '';
  clearBtn.classList.add('hidden');
  closeAutocomplete();
  cityInput.focus();
});

cityInput.addEventListener('input', () => {
  const val = cityInput.value.trim();
  clearBtn.classList.toggle('hidden', !val);
  clearTimeout(debounceTimer);
  if (val.length < 2) { closeAutocomplete(); return; }
  debounceTimer = setTimeout(() => fetchAutocomplete(val), 320);
});

// ── Geolocation ────────────────────────────────────────────
geoBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  showSkeleton();
  geoBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    async pos => {
      geoBtn.disabled = false;
      const { latitude: lat, longitude: lon } = pos.coords;
      // reverse geocode to get city name
      try {
        const res = await fetch(`/.netlify/functions/getWeather?type=reverse&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (data && data[0]) {
          lastCity = data[0].name;
          cityInput.value = lastCity;
          clearBtn.classList.remove('hidden');
        }
      } catch { /* use coords only */ }
      await searchByCoords(lat, lon);
    },
    err => {
      geoBtn.disabled = false;
      showError('Location access denied. Search for a city instead.');
    },
    { timeout: 8000 }
  );
});

// ── Retry ──────────────────────────────────────────────────
retryBtn.addEventListener('click', () => {
  if (lastCoords) fetchAndRender(lastCoords);
  else if (lastCity) fetchAndRender({ city: lastCity });
});

// ── Autocomplete ───────────────────────────────────────────
async function fetchAutocomplete(query) {
  if (autocompleteController) autocompleteController.abort();
  autocompleteController = new AbortController();
  try {
    const res = await fetch(`/.netlify/functions/getWeather?type=autocomplete&city=${encodeURIComponent(query)}`, {
      signal: autocompleteController.signal
    });
    const data = await res.json();
    renderAutocomplete(data, query);
  } catch (e) {
    if (e.name !== 'AbortError') closeAutocomplete();
  }
}

function renderAutocomplete(results, query) {
  autocompleteList.innerHTML = '';
  if (!Array.isArray(results) || results.length === 0) {
    autocompleteList.innerHTML = `<li class="autocomplete-no-results">No results for "${query}"</li>`;
    autocompleteList.classList.remove('hidden');
    return;
  }
  results.forEach((r, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.dataset.index = i;
    const label = [r.name, r.state, r.country].filter(Boolean).join(', ');
    li.innerHTML = `${r.name}<span class="ac-country">${[r.state, r.country].filter(Boolean).join(', ')}</span>`;
    li.addEventListener('mousedown', e => {
      e.preventDefault();
      searchByCity(r.name + (r.country ? `, ${r.country}` : ''));
    });
    autocompleteList.appendChild(li);
  });
  autocompleteList.classList.remove('hidden');
}

function closeAutocomplete() {
  autocompleteList.classList.add('hidden');
  autocompleteList.innerHTML = '';
}

function navigateAutocomplete(dir) {
  const items = autocompleteList.querySelectorAll('li[role="option"]');
  if (!items.length) return;
  const current = autocompleteList.querySelector('.active');
  let idx = current ? parseInt(current.dataset.index) + dir : (dir === 1 ? 0 : items.length - 1);
  idx = Math.max(0, Math.min(items.length - 1, idx));
  items.forEach(i => i.classList.remove('active'));
  items[idx].classList.add('active');
  cityInput.value = items[idx].firstChild.textContent;
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-section')) closeAutocomplete();
});

// ── Fetch & render ─────────────────────────────────────────
async function fetchAndRender({ city, lat, lon }) {
  showSkeleton();
  try {
    let currentUrl, forecastUrl, airUrl;

    if (lat && lon) {
      currentUrl  = `/.netlify/functions/getWeather?type=current&lat=${lat}&lon=${lon}`;
      forecastUrl = `/.netlify/functions/getWeather?type=forecast&lat=${lat}&lon=${lon}`;
      airUrl      = `/.netlify/functions/getWeather?type=air&lat=${lat}&lon=${lon}`;
    } else {
      currentUrl  = `/.netlify/functions/getWeather?type=current&city=${encodeURIComponent(city)}`;
      forecastUrl = `/.netlify/functions/getWeather?type=forecast&city=${encodeURIComponent(city)}`;
    }

    console.log('URLs:', currentUrl, forecastUrl);

    const [currentRes, forecastRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    const [current, forecast] = await Promise.all([currentRes.json(), forecastRes.json()]);

    const rawCurrent = await currentRes.text();
    console.log('RAW CURRENT RESPONSE:', rawCurrent);
    const rawForecast = await forecastRes.text();
    console.log('RAW FORECAST RESPONSE:', rawForecast);

    if (current.cod && current.cod !== 200) {
      const msg = current.message || 'City not found.';
      showError(msg.charAt(0).toUpperCase() + msg.slice(1));
      return;
    }

    lastWeatherData = current;
    lastForecastData = forecast;

    // Set lastCity from response if not set
    if (!lastCity) lastCity = current.name;

    // Fetch air quality using response coords
    let airData = null;
    try {
      const rLat = current.coord.lat;
      const rLon = current.coord.lon;
      const airRes = await fetch(`/.netlify/functions/getWeather?type=air&lat=${rLat}&lon=${rLon}`);
      airData = await airRes.json();
    } catch { /* air quality optional */ }

    renderAll(current, forecast, airData);
    updateSaveBtn();
    showWeather();

  } catch (err) {
    console.error(err);
    showError('Unable to reach the weather service. Check your connection.');
  }
}

// ── Render all ─────────────────────────────────────────────
function renderAll(current, forecast, airData) {
  renderHero(current);
  if (forecast && forecast.list) {
    renderHourly(forecast.list);
    renderForecast(forecast.list);
    renderChart(forecast.list);
  }
  if (airData) renderAir(airData);
  renderTip(current);
}

// ── Weather emoji ──────────────────────────────────────────
function weatherEmoji(desc = '', icon = '') {
  const d = desc.toLowerCase();
  const isNight = icon && icon.endsWith('n');
  if (d.includes('thunderstorm')) return '⛈️';
  if (d.includes('drizzle'))      return '🌦️';
  if (d.includes('heavy rain') || d.includes('shower')) return '🌧️';
  if (d.includes('rain'))         return isNight ? '🌧️' : '🌦️';
  if (d.includes('snow'))         return '❄️';
  if (d.includes('sleet'))        return '🌨️';
  if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
  if (d.includes('dust') || d.includes('sand')) return '🌪️';
  if (d.includes('clear'))        return isNight ? '🌙' : '☀️';
  if (d.includes('few clouds') || d.includes('scattered')) return isNight ? '⛅' : '🌤️';
  if (d.includes('cloud') || d.includes('overcast')) return '☁️';
  return '🌡️';
}

// ── Hero card ──────────────────────────────────────────────
function renderHero(d) {
  const now = new Date();
  $('heroCity').textContent      = d.name + (d.sys?.country ? `, ${d.sys.country}` : '');
  $('heroDate').textContent      = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  $('heroEmoji').textContent     = weatherEmoji(d.weather[0].description, d.weather[0].icon);
  $('heroTemp').textContent      = toDisplay(d.main.temp) + unitSuffix();
  $('heroCondition').textContent = d.weather[0].description;
  $('heroFeels').textContent     = `Feels like ${toDisplay(d.main.feels_like)}${unitSuffix()}`;
  $('statHigh').textContent      = toDisplay(d.main.temp_max) + unitSuffix();
  $('statLow').textContent       = toDisplay(d.main.temp_min) + unitSuffix();
  $('statHumidity').textContent  = d.main.humidity + '%';
  $('statWind').textContent      = Math.round(d.wind.speed * 3.6) + ' km/h';

  if (d.sys?.sunrise && d.sys?.sunset) {
    $('statSunrise').textContent = fmtTime(d.sys.sunrise);
    $('statSunset').textContent  = fmtTime(d.sys.sunset);
  }
}

function fmtTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

// ── Go-outside tip ─────────────────────────────────────────
function renderTip(d) {
  const tipBar  = $('tipBar');
  const tipText = $('tipText');
  const desc    = d.weather[0].description.toLowerCase();
  const temp    = d.main.temp;
  const wind    = d.wind.speed * 3.6; // km/h
  const humidity = d.main.humidity;

  let tip = null;

  if (desc.includes('thunder')) tip = 'Stay indoors — thunderstorm warning.';
  else if (desc.includes('heavy rain') || desc.includes('shower')) tip = 'Heavy rain — bring an umbrella or skip the trip.';
  else if (desc.includes('rain') || desc.includes('drizzle')) tip = 'Light rain expected — grab a light jacket.';
  else if (desc.includes('snow')) tip = 'Snow on the ground — dress in warm layers.';
  else if (temp > 32) tip = 'Very hot out — stay hydrated and limit sun exposure.';
  else if (temp > 26 && humidity > 75) tip = 'Hot and humid — light, breathable clothing recommended.';
  else if (wind > 40) tip = 'Strong winds today — secure any loose outdoor items.';
  else if (temp < 5) tip = 'Cold conditions — a heavy coat is a must.';
  else if (desc.includes('clear') && temp >= 18 && temp <= 28) tip = 'Great day to be outside — enjoy it!';
  else if (desc.includes('cloud') && temp >= 15) tip = 'Comfortable conditions for outdoor activities.';

  if (tip) {
    tipText.textContent = tip;
    tipBar.classList.remove('hidden');
  } else {
    tipBar.classList.add('hidden');
  }
}

// ── Air quality ────────────────────────────────────────────
function renderAir(data) {
  const aqiBar = $('aqiBar');
  try {
    const aqi = data.list[0].main.aqi;
    const labels  = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const classes = ['', 'good', 'fair', 'fair',     'poor', 'very-poor'];
    const descs   = [
      '', 'Air quality is satisfactory.', 'Acceptable air quality.',
      'Some pollutants may be a concern.', 'Health effects possible for sensitive groups.',
      'Health alert — limit outdoor activity.'
    ];
    const badge = $('aqiBadge');
    badge.textContent = labels[aqi] || '—';
    badge.className   = `aqi-badge ${classes[aqi] || ''}`;
    $('aqiDesc').textContent = descs[aqi] || '';
    aqiBar.classList.remove('hidden');
  } catch { aqiBar.classList.add('hidden'); }
}

// ── Hourly strip ───────────────────────────────────────────
function renderHourly(list) {
  const strip = $('hourlyStrip');
  strip.innerHTML = '';
  const now = Date.now() / 1000;
  const todaySlots = list.filter(item => item.dt - now < 86400 && item.dt >= now - 1800).slice(0, 10);
  const slots = todaySlots.length ? todaySlots : list.slice(0, 10);

  slots.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'hourly-card' + (i === 0 ? ' now' : '');
    const time = new Date(item.dt * 1000);
    const timeLabel = i === 0 ? 'Now' : time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    const rain = item.pop ? Math.round(item.pop * 100) : 0;
    card.innerHTML = `
      <span class="hourly-card-time${i === 0 ? ' now-label' : ''}">${timeLabel}</span>
      <span class="hourly-card-emoji">${weatherEmoji(item.weather[0].description, item.weather[0].icon)}</span>
      <span class="hourly-card-temp">${toDisplay(item.main.temp)}${unitSuffix()}</span>
      ${rain > 20 ? `<span class="hourly-card-rain">💧 ${rain}%</span>` : '<span></span>'}
    `;
    strip.appendChild(card);
  });
}

// ── 5-day forecast ─────────────────────────────────────────
function renderForecast(list) {
  const grid = $('forecastGrid');
  grid.innerHTML = '';

  // Group by day
  const days = {};
  list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (!days[key]) days[key] = [];
    days[key].push(item);
  });

  // Skip today, take next 5
  const keys = Object.keys(days).slice(1, 6);

  keys.forEach(key => {
    const slots = days[key];
    const temps = slots.map(s => s.main.temp);
    const high  = Math.max(...temps);
    const low   = Math.min(...temps);
    // Prefer midday slot for icon/description
    const rep   = slots.find(s => new Date(s.dt * 1000).getHours() === 12) || slots[Math.floor(slots.length / 2)];
    const maxRain = Math.round(Math.max(...slots.map(s => (s.pop || 0) * 100)));
    const date  = new Date(key);
    const dayName = date.toLocaleDateString('en-ZA', { weekday: 'short' });

    const row = document.createElement('div');
    row.className = 'forecast-row';
    row.innerHTML = `
      <span class="forecast-day">${dayName}</span>
      <span class="forecast-emoji">${weatherEmoji(rep.weather[0].description, rep.weather[0].icon)}</span>
      <span class="forecast-desc">${rep.weather[0].description}</span>
      <span class="forecast-rain">${maxRain > 20 ? `💧 ${maxRain}%` : ''}</span>
      <span class="forecast-temps">
        <span class="forecast-high">${toDisplay(high)}°</span>
        <span class="forecast-low">${toDisplay(low)}°</span>
      </span>
    `;
    grid.appendChild(row);
  });
}

// ── Temperature chart ──────────────────────────────────────
function renderChart(list) {
  const section = $('chartSection');
  const canvas  = $('tempChart');

  // Next 24 hours
  const now    = Date.now() / 1000;
  const slots  = list.filter(s => s.dt >= now && s.dt <= now + 86400).slice(0, 8);
  if (slots.length < 2) { section.classList.add('hidden'); return; }

  section.classList.remove('hidden');

  const labels = slots.map(s => new Date(s.dt * 1000).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }));
  const temps  = slots.map(s => toDisplay(s.main.temp));

  const isDark = theme !== 'light';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const accentColor = isDark ? '#38bdf8' : '#0284c7';

  if (tempChart) tempChart.destroy();
  tempChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: temps,
        borderColor: accentColor,
        backgroundColor: isDark ? 'rgba(56,189,248,0.08)' : 'rgba(2,132,199,0.08)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: accentColor,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => `${ctx.parsed.y}${unitSuffix()}` }
        }
      },
      scales: {
        x: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } },
        y: {
          ticks: { color: textColor, font: { size: 11 }, callback: v => `${v}°` },
          grid: { color: gridColor }
        }
      }
    }
  });
}