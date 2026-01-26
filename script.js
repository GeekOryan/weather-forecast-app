// Select all DOM elements
let input = document.querySelector("#cityInput");
let searchBtn = document.querySelector("#searchBtn");
let currentWeather = document.querySelector("#currentWeather");
let forecast5Btn = document.querySelector("#forecast5");
let forecastDisplay = document.querySelector("#forecastDisplay");
let hourlyTitle = document.querySelector("#hourlyTitle");

let currentForecastData = null;

// Function to get weather emoji based on description
function getWeatherEmoji(description) {
    if (description.includes("clear")) return "☀️";
    if (description.includes("cloud")) return "☁️";
    if (description.includes("rain")) return "🌧️";
    if (description.includes("thunder")) return "⛈️";
    if (description.includes("snow")) return "❄️";
    if (description.includes("mist") || description.includes("fog")) return "🌫️";
    return "🌤️";
}

// Main search function - fetches and displays all weather data
searchBtn.addEventListener("click", async () => {
    let city = input.value;

    if (city === "") {
        currentWeather.textContent = "Please enter a city name!";
        return;
    }

    try {
        // Fetch current weather via serverless function
        console.log("Fetching current weather for:", city);
        let url = `/.netlify/functions/getWeather?city=${encodeURIComponent(city)}&type=current`;
        let response = await fetch(url);
        let data = await response.json();
        console.log("Current weather data:", data);

        // Display current weather
console.log("Full data object:", data);
console.log("data.weather:", data.weather);

if (data && data.weather && data.weather[0]) {
    currentWeather.innerHTML = `
        <h2>${data.name}</h2>
        <p style="font-size: 60px;">${getWeatherEmoji(data.weather[0].description)}</p>
        <p><strong>Temperature:</strong> ${data.main.temp}℃</p>
        <p><strong>Feels like:</strong> ${data.main.feels_like}℃</p>
        <p><strong>Weather:</strong> ${data.weather[0].description}</p>
        <p><strong>Humidity:</strong> ${data.main.humidity}%</p>
        <p><strong>Wind Speed:</strong> ${data.wind.speed} m/s</p>
    `;
} else {
    currentWeather.textContent = "Weather data format error";
    console.error("Unexpected data structure:", data);
}
        // Fetch forecast via serverless function
        console.log("Fetching forecast for:", city);
        let forecastUrl = `/.netlify/functions/getWeather?city=${encodeURIComponent(city)}&type=forecast`;
        let forecastResponse = await fetch(forecastUrl);
        let forecastData = await forecastResponse.json();
        console.log("Forecast data:", forecastData);
    
        // Check if forecastData has list property
        if (forecastData && forecastData.list) {
            currentForecastData = forecastData.list;
            
            let today = new Date().toDateString();
            displayHourlyForecast(currentForecastData, today, "Today");
        }

        input.value = "";
    } catch (error) {
        console.error("Full error:", error);
        currentWeather.textContent = "City not found or error occurred!";
    }
});

// Enter key support
input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        searchBtn.click();
    }
});

// 5-Day Forecast button
forecast5Btn.addEventListener("click", async () => {
    let city = input.value || "Johannesburg";

    try {
        let url = `/.netlify/functions/getWeather?city=${encodeURIComponent(city)}&type=forecast`;
        let response = await fetch(url);
        let data = await response.json();
        
        console.log("5-day forecast data:", data);

        // Check if data has list property
        if (data && data.list) {
            currentForecastData = data.list;
            displayForecast(data.list.slice(0, 40));
        } else {
            forecastDisplay.innerHTML = "<p>No forecast data available</p>";
        }
    } catch (error) {
        console.error("Error:", error);
        forecastDisplay.innerHTML = "<p>Error loading forecast</p>";
    }
});

function displayForecast(forecastData) {
    forecastDisplay.innerHTML = "";

    let dailyData = {};

    forecastData.forEach(item => {
        let date = new Date(item.dt * 1000);
        let day = date.toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric"});
        let dateString = date.toDateString();

        let hour = date.getHours();
        if (hour === 12 || !dailyData[day]) {
            dailyData[day] = {
                item: item,
                dateString: dateString
            };
        }
    });

    Object.keys(dailyData).forEach(day => {
        let item = dailyData[day].item;
        let dateString = dailyData[day].dateString;

        let card = document.createElement("div");
        card.classList.add("forecast-card");
        card.style.cursor = "pointer";

        card.addEventListener("click", () => {
            displayHourlyForecast(currentForecastData, dateString, day);
            document.querySelector(".hourly-section").scrollIntoView({behavior: "smooth"});
        });

        card.innerHTML = `
            <h3>${day}</h3>
            <p style="font-size: 40px;">${getWeatherEmoji(item.weather[0].description)}</p>
            <p><strong>${Math.round(item.main.temp)}℃</strong></p>
            <p>${item.weather[0].description}</p>
        `;

        forecastDisplay.appendChild(card);
    });
}

function displayHourlyForecast(forecastData, targetDateString, dayLabel) {
    let hourlyDisplay = document.querySelector("#hourlyDisplay");
    hourlyDisplay.innerHTML = "";
    
    hourlyTitle.textContent = `${dayLabel}'s Hourly Forecast`;

    let dayData = forecastData.filter(item => {
        let itemDate = new Date(item.dt * 1000).toDateString();
        return itemDate === targetDateString;
    });

    if (dayData.length === 0) {
        hourlyDisplay.innerHTML = "<p style='color: white; text-align: center;'>No hourly data available.</p>";
        return;
    }

    dayData.forEach(item => {
        let time = new Date(item.dt * 1000);
        let hour = time.toLocaleTimeString("en-US", {hour: "numeric", hour12: true});

        let card = document.createElement("div");
        card.classList.add("hourly-card");

        card.innerHTML = `
            <h4>${hour}</h4>
            <p style="font-size: 30px;">${getWeatherEmoji(item.weather[0].description)}</p>
            <p><strong>${Math.round(item.main.temp)}℃</strong></p>
            <p>${item.weather[0].description}</p>
        `;

        hourlyDisplay.appendChild(card);
    });
}