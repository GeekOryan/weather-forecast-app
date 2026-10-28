# Weather Forecast App

A clean and modern weather application that provides current weather conditions and 5-day forecasts for any city worldwide.

## Link to the site: https://weather-prognosticate.netlify.app/

## Features

- **Current Weather**: Real-time temperature, weather conditions, humidity, and wind speed
- **Hourly Forecast**: View hourly weather updates for today
- **5-Day Forecast**: Click any day to see its hourly breakdown
- **Responsive Design**: Clean, modern interface with gradient background
- **Search Support**: Enter key support for quick searches

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- OpenWeatherMap API

## How to Use

1. Enter a city name in the search box
2. Press Enter or click "Search" to get current weather
3. Click "5-Day Forecast" to see the upcoming week
4. Click on any forecast day to view its hourly breakdown

## API Key

This app uses the OpenWeatherMap API through the Netlify Function at
`netlify/functions/getWeather.js`. Set `OPENWEATHER_API_KEY` as an environment
variable in Netlify, and in a local `.env` file when using Netlify Dev. Do not
commit the key to `netlify.toml` or source files. Get a key from
[OpenWeatherMap](https://openweathermap.org/api).

## Author

GeekOryan
