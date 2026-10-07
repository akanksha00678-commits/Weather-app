// ---------- API (Open-Meteo: free, no API key needed) ----------
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";
 
// ---------- Page elements ----------
const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const message = document.getElementById("message");
const currentBox = document.getElementById("current");
const forecastBox = document.getElementById("forecast-section");
const forecastList = document.getElementById("forecast");
const btnC = document.getElementById("unit-c");
const btnF = document.getElementById("unit-f");
 
let unit = "celsius";   // "celsius" or "fahrenheit"
let lastPlace = null;   // remembers the city so unit switching can reload
 
// Weather codes from Open-Meteo -> text + page theme
function describe(code) {
  if (code === 0) return { text: "Clear sky", theme: "clear" };
  if (code <= 3) return { text: "Partly cloudy", theme: "clouds" };
  if (code <= 48) return { text: "Fog", theme: "clouds" };
  if (code <= 57) return { text: "Drizzle", theme: "rain" };
  if (code <= 67) return { text: "Rain", theme: "rain" };
  if (code <= 77) return { text: "Snow", theme: "snow" };
  if (code <= 82) return { text: "Rain showers", theme: "rain" };
  if (code <= 86) return { text: "Snow showers", theme: "snow" };
  return { text: "Thunderstorm", theme: "storm" };
}
 
function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "message error" : "message";
  message.hidden = false;
}
 
// ---------- Step 1: city name -> latitude/longitude ----------
async function findCity(name) {
  const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(name)}&count=1`);
  if (!res.ok) throw new Error("Could not reach the search service.");
  const data = await res.json();
  if (!data.results) throw new Error(`No city found for "${name}". Check the spelling.`);
  const c = data.results[0];
  return { name: `${c.name}${c.country ? ", " + c.country : ""}`, lat: c.latitude, lon: c.longitude };
}
 
// ---------- Step 2: coordinates -> weather ----------
async function getWeather(place) {
  const params = new URLSearchParams({
    latitude: place.lat,
    longitude: place.lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    temperature_unit: unit,
    wind_speed_unit: unit === "celsius" ? "kmh" : "mph",
    timezone: "auto",
    forecast_days: 6
  });
  const res = await fetch(`${WEATHER_URL}?${params}`);
  if (!res.ok) throw new Error("Could not load the weather. Try again.");
  return res.json();
}
 
// ---------- Step 3: show it on the page ----------
function render(place, data) {
  const sym = unit === "celsius" ? "°C" : "°F";
  const windUnit = unit === "celsius" ? "km/h" : "mph";
  const now = data.current;
  const info = describe(now.weather_code);
 
  document.body.dataset.weather = info.theme;
  document.getElementById("city-name").textContent = place.name;
  document.getElementById("condition").textContent = info.text;
  document.getElementById("temp").textContent = `${Math.round(now.temperature_2m)}°`;
  document.getElementById("feels").textContent = `${Math.round(now.apparent_temperature)}${sym}`;
  document.getElementById("humidity").textContent = `${now.relative_humidity_2m}%`;
  document.getElementById("wind").textContent = `${Math.round(now.wind_speed_10m)} ${windUnit}`;
 
  // Skip index 0 (today) and show the next 5 days
  forecastList.innerHTML = "";
  for (let i = 1; i < data.daily.time.length; i++) {
    const day = new Date(data.daily.time[i] + "T00:00:00")
      .toLocaleDateString("en-US", { weekday: "long" });
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="day">${day}</span>
      <span class="desc">${describe(data.daily.weather_code[i]).text}</span>
      <span class="range">${Math.round(data.daily.temperature_2m_max[i])}°
        <span>${Math.round(data.daily.temperature_2m_min[i])}°</span></span>`;
    forecastList.appendChild(li);
  }
 
  message.hidden = true;
  currentBox.hidden = false;
  forecastBox.hidden = false;
}
 
// ---------- Put it all together ----------
async function loadWeather(place) {
  showMessage("Loading…");
  try {
    const data = await getWeather(place);
    lastPlace = place;
    render(place, data);
  } catch (err) {
    showMessage(err.message, true);
  }
}
 
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = input.value.trim();
  if (!name) return;
  showMessage("Searching…");
  try {
    const place = await findCity(name);
    await loadWeather(place);
  } catch (err) {
    currentBox.hidden = true;
    forecastBox.hidden = true;
    showMessage(err.message, true);
  }
});
 
function setUnit(newUnit) {
  unit = newUnit;
  btnC.classList.toggle("active", unit === "celsius");
  btnF.classList.toggle("active", unit === "fahrenheit");
  if (lastPlace) loadWeather(lastPlace);
}
btnC.addEventListener("click", () => setUnit("celsius"));
btnF.addEventListener("click", () => setUnit("fahrenheit"));
 