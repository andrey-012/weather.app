(() => {
  const API_KEY = "5fef99d270231beb44cf4f5778629e9a";
  console.log('шжывопот')

  const state = {
    unit: localStorage.getItem("weather_unit") || "C",
    data: null,
    locationName: "Москва"
  };

  async function fetchWeather(city) {
    const q = encodeURIComponent(city.trim());
    const url = `
 https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${API_KEY}&units=metric&lang=ru
`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Ошибка API");
    const data = await res.json();
    if (!data.city) throw new Error("Город не найден");


    const w = data.list[0];
    const weatherMain = w.weather[0].main;
    const weatherDesc = w.weather[0].description;

    const current = {
      tempC: w.main.temp,
      feelsLikeC: w.main.feels_like,
      description: weatherDesc,
      icon: getWeatherEmoji(weatherMain),
      humidity: w.main.humidity,
      pressure: w.main.pressure,
      visibilityKm: (w.visibility / 1000).toFixed(1),
      sunrise: new Date(data.city.sunrise * 1000).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      sunset: new Date(data.city.sunset * 1000).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
      }),
      windSpeed: Math.round(w.wind.speed * 3.6),
      windDir: degToArrow(w.wind.deg),
      main: weatherMain
    };

    const daily = [];

    for (let i = 0; i < data.list.length; i += 8) {
      const d = data.list[i];
      const date = new Date(d.dt * 1000);

      daily.push({
        date: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        day: date.toLocaleDateString("ru-RU", { weekday: "short" }),
        tempC: d.main.temp,
        icon: getWeatherEmoji(d.weather[0].main),
        description: d.weather[0].description
      });
    }
    const hourly = data.list.slice(0, 8).map(h => ({
      h: new Date(h.dt * 1000).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      tempC: h.main.temp,
      windSpeed: Math.round(h.wind.speed * 3.6),
      windDir: degToArrow(h.wind.deg),
      icon: getWeatherEmoji(h.weather[0].main),
    }));

    return {
      location: `${data.city.name}, ${data.city.country}`,
      current,
      hourly,
      daily,
      city: data.city,
    };
  }

  async function fetchSuggestions(query) {
    if (!query || query.length < 2) return [];

    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      return data.map((c) => `${c.name}${c.state ? ', ' + c.state : ''}, ${c.country}`);
    } catch {
      return [];
    }
  }

  function formatTemp(t) {
    return state.unit === "C"
      ? `${Math.round(t)}°C`
      : `${Math.round((t * 9) / 5 + 32)}°F`;
  }

  function getWeatherEmoji(main) {
    switch (main.toLowerCase()) {
      case "clear": return "⭐";
      case "clouds": return "☁️";
      case "rain": return "🌧️";
      case "snow": return "❄️";
      case "thunderstorm": return "🌩️";
      case "drizzle": return "🌦️";
      case "mist": return "";
      case "fog": return "";
      case "haze": return "🌫️";
    }
  }

  function degToArrow(deg) {
    const dirs = [
      '↑ N',   // Север
      '↗ NE',  // Северо-Восток
      '→ E',   // Восток
      '↘ SE',  // Юго-Восток
      '↓ S',   // Юг
      '↙ SW',  // Юго-Запад
      '← W',   // Запад
      '↖ NW'   // Северо-Запад
    ];

    return dirs[Math.round(deg / 45) % 8];
  }

  function renderAll() {
    renderCurrent();
    renderFiveDay();
    renderTodayGrid();
    renderHourly();
    renderMap();
  }

  function renderCurrent() {
    const d = state.data.current;

    document.querySelector('.temp').textContent = `${formatTemp(d.tempC)} ${d.icon}`;
    document.querySelector('.desc').textContent = d.description;
    document.querySelector('#location').textContent = state.data.location;
    document.querySelector('#date').textContent = new Date().toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  function renderFiveDay() {
    // Получаем элемент списка с id="days-list"
    const list = document.getElementById('days-list');

    // Очищаем содержимое списка (удаляем все дочерние элементы)
    list.innerHTML = '';

    // Проходим по каждому дню из массива state.data.daily
    state.data.daily.forEach((day) => {
      // Создаём новый элемент списка (<li>)
      const li = document.createElement('li');

      // Заполняем элемент <li> HTML-разметкой с данными о погоде
      li.innerHTML = `
      <div>
        ${day.icon} <!-- Иконка погоды -->
        <strong>${day.day}</strong> <!-- Название дня недели (например, "Понедельник") -->
        <span style="color: var(--muted)">(${day.date})</span> <!-- Дата в скобках, цвет из переменной CSS --muted -->
      </div>
      <div>
        ${day.description}, <!-- Краткое описание погоды (например, "Облачно") -->
        ${formatTemp(day.tempC)} <!-- Температура, отформатированная функцией formatTemp -->
      </div>
    `;

      // Добавляем созданный элемент <li> в список
      list.appendChild(li);
    });
  }

  function initAutocomplete() {
    const input = document.getElementById('location-input');
    const suggestBox = document.createElement('div');
    suggestBox.className = 'suggestions';
    input.parentNode.appendChild(suggestBox);

    let timeout = null;

    input.addEventListener('input', () => {
      clearTimeout(timeout);
      const query = input.value.trim();



      if (!query) {
        suggestBox.innerHTML = '';
        return;
      }

      timeout = setTimeout(async () => {
        const results = await fetchSuggestions(query);
        suggestBox.innerHTML = '';

        results.forEach(city => {
          const item = document.createElement('div');
          item.className = 'suggest-item';
          item.textContent = city;

          item.addEventListener('click', () => {
            input.value = city;
            suggestBox.innerHTML = '';
            setLocation(city);
          });

          suggestBox.appendChild(item);
        });
      }, 400);
    });

    document.addEventListener('click', (e) => {
      if (!suggestBox.contains(e.target) && e.target !== input) {
        suggestBox.innerHTML = '';
      }
    });

    document.addEventListener('DOMContentLoaded', () => {
      fetchWeather(state.locationName)
        .then((d) => {
          state.data = d;
          renderAll();
        })
        .catch((err) => console.log(err));

      document.getElementById('set-location').addEventListener('click', () => {
        const v = document.getElementById('location-input').value.trim();
        if (v) setLocation(v);
      });


    });

  }
  initAutocomplete();
  async function setLocation(name) {
    try {
      const data = await fetchWeather(name);
      state.data = data;
      renderAll();
    } catch (err) {
      console.error('Ошибка:', err);
    }
  }
  function renderTodayGrid() {
    const grid = document.getElementById('today-grid');
    if (!grid || !state.data || !state.data.current) return;

    const d = state.data.current;

    grid.innerHTML = `
    <div class="today-card">
      <h4>Ощущается</h4>
      <div class="value">${formatTemp(d.feelsLikeC)}</div>
    </div>
    <div class="today-card">
      <h4>Влажность</h4>
      <div class="value">${d.humidity}%</div>
    </div>
    <div class="today-card">
      <h4>Давление</h4>
      <div class="value">${d.pressure} hPa</div>
    </div>
    <div class="today-card">
  <h4>Видимость</h4>
  <div class="value">${d.visibilityKm} км</div>
</div>
<div class="today-card">
  <h4>Восход</h4>
  <div class="value">${d.sunrise}</div>
</div>
<div class="today-card">
  <h4>Закат</h4>
  <div class="value">${d.sunset}</div>
</div>
<div class="today-card">
  <h4>Ветер</h4>
  <div class="value">${d.windSpeed} км/ч ${d.windDir}</div>
</div>
  `;
  }

  function renderHourly() {
  const container = document.getElementById('hourly-grid');
  if (!container || !state.data || !state.data.hourly) {
    return;
  }
  container.innerHTML = '';

  state.data.hourly.forEach(hour => {
    const hourEl = document.createElement('div');
    hourEl.className = 'hour-card';

    hourEl.innerHTML = `
      <div class="hour">${hour.h}</div>
      <div class="icon">${hour.icon}</div>
      <div class="temp">${formatTemp(hour.tempC)}</div>
      <div class="hour-wind">
        <span class="wind-arrow">${hour.windDir}</span>
        ${hour.windSpeed} км/ч
      </div>
    `;

    container.appendChild(hourEl);
  });
}

function renderMap() {
  const mapContainer = document.getElementById('weather-map');
  if (!mapContainer) return;

  const { lat, lon } = state.data.city.coord;

  mapContainer.innerHTML = `
    <img 
      src="https://static-maps.yandex.ru/1.x/?ll=${lon},${lat}&size=400,200&z=10&l=map&pt=${lon},${lat},pm2rdm" 
      alt="Карта местности" 
    />
  `;
}

})();