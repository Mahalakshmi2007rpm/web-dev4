const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const searchForm = document.querySelector("#search-form");
const cityInput = document.querySelector("#city-input");
const statusRegion = document.querySelector("#status-region");
const weatherContent = document.querySelector("#weather-content");
const errorState = document.querySelector("#error-state");
const errorMessage = document.querySelector("#error-message");
const forecastGrid = document.querySelector("#forecast-grid");

const weatherCodes = {
  0: ["Clear sky", "☀"], 1: ["Mainly clear", "🌤"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁"], 45: ["Foggy", "〰"], 48: ["Rime fog", "〰"],
  51: ["Light drizzle", "🌦"], 53: ["Drizzle", "🌦"], 55: ["Heavy drizzle", "🌧"],
  61: ["Light rain", "🌦"], 63: ["Rain", "🌧"], 65: ["Heavy rain", "🌧"],
  71: ["Light snow", "🌨"], 73: ["Snow", "🌨"], 75: ["Heavy snow", "❄"],
  80: ["Rain showers", "🌦"], 81: ["Rain showers", "🌧"], 82: ["Heavy showers", "🌧"],
  95: ["Thunderstorm", "⛈"], 96: ["Storm with hail", "⛈"], 99: ["Storm with hail", "⛈"]
};

function getWeatherCode(code) {
  return weatherCodes[code] || ["Unknown conditions", "·"];
}

function setLoading(isLoading, message = "") {
  statusRegion.classList.toggle("is-loading", isLoading);
  statusRegion.textContent = message;
}

function showError(message) {
  weatherContent.hidden = true;
  errorState.hidden = false;
  errorMessage.textContent = message;
}

function showWeather() {
  errorState.hidden = true;
  weatherContent.hidden = false;
}

async function findCity(city) {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Location service is unavailable.");
  const data = await response.json();
  if (!data.results?.length) throw new Error("We couldn't find that city. Check the spelling and try again.");
  return data.results[0];
}

async function fetchForecast(location) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", location.latitude);
  url.searchParams.set("longitude", location.longitude);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather data is temporarily unavailable.");
  return response.json();
}

function renderCurrent(location, weather) {
  const current = weather.current;
  const [condition, symbol] = getWeatherCode(current.weather_code);
  document.querySelector("#location-name").textContent = location.name;
  document.querySelector("#location-region").textContent = [location.admin1, location.country].filter(Boolean).join(", ");
  document.querySelector("#current-date").textContent = new Date(current.time).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  document.querySelector("#current-symbol").textContent = symbol;
  document.querySelector("#current-temperature").textContent = Math.round(current.temperature_2m);
  document.querySelector("#current-condition").textContent = condition;
  document.querySelector("#feels-like").textContent = Math.round(current.apparent_temperature);
  document.querySelector("#humidity").textContent = current.relative_humidity_2m;
  document.querySelector("#wind-speed").textContent = Math.round(current.wind_speed_10m);
  document.querySelector("#wind-direction").textContent = `${Math.round(current.wind_direction_10m)}°`;
}

function renderForecast(weather) {
  const daily = weather.daily;
  forecastGrid.replaceChildren(...daily.time.map((date, index) => {
    const [condition, symbol] = getWeatherCode(daily.weather_code[index]);
    const card = document.createElement("article");
    card.className = "forecast-card";
    card.setAttribute("aria-label", `${new Date(date).toLocaleDateString(undefined, { weekday: "long" })}: ${condition}`);
    card.innerHTML = `
      <div class="forecast-day">${index === 0 ? "Today" : new Date(date).toLocaleDateString(undefined, { weekday: "short" })}</div>
      <div class="forecast-date">${new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
      <div class="forecast-symbol" aria-hidden="true">${symbol}</div>
      <div class="forecast-temperatures"><span class="forecast-high">${Math.round(daily.temperature_2m_max[index])}°</span><span class="forecast-low">${Math.round(daily.temperature_2m_min[index])}°</span></div>
    `;
    return card;
  }));
}

async function loadWeather(city) {
  setLoading(true, "Finding your forecast...");
  weatherContent.hidden = true;
  errorState.hidden = true;
  try {
    const location = await findCity(city);
    const weather = await fetchForecast(location);
    renderCurrent(location, weather);
    renderForecast(weather);
    document.querySelector("#updated-time").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    showWeather();
    setLoading(false);
  } catch (error) {
    setLoading(false);
    showError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const city = cityInput.value.trim();
  if (city) loadWeather(city);
});

loadWeather("London");
