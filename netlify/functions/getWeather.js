const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const { city, lat, lon, type } = event.queryStringParameters;

  const apiKey = process.env.OPENWEATHER_API_KEY;

  let url;

  // Location query — city name or lat/lon coordinates
  const locationByCity   = `q=${encodeURIComponent(city)}`;
  const locationByCoords = `lat=${lat}&lon=${lon}`;
  const location         = (lat && lon) ? locationByCoords : locationByCity;

  if (type === 'current') {
    url = `https://api.openweathermap.org/data/2.5/weather?${location}&appid=${apiKey}&units=metric`;
  } else if (type === 'forecast') {
    url = `https://api.openweathermap.org/data/2.5/forecast?${location}&appid=${apiKey}&units=metric`;
  } else if (type === 'autocomplete') {
    url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5&appid=${apiKey}`;
  } else if (type === 'reverse') {
    url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
  } else if (type === 'air') {
    url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch weather data' })
    };
  }
};