const fetch = require('node-fetch');

exports.handler = async (event) => {
  const { city, lat, lon, type } = event.queryStringParameters || {};
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' }),
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    let url;

    // Autocomplete / city search suggestions
    if (type === 'autocomplete') {
      if (!city) return { statusCode: 400, headers, body: JSON.stringify({ error: 'city required' }) };
      url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5&appid=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // Reverse geocode lat/lon to city name
    if (type === 'reverse') {
      if (!lat || !lon) return { statusCode: 400, headers, body: JSON.stringify({ error: 'lat/lon required' }) };
      url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    // Build location query — supports both city name and lat/lon
    let locationQuery;
    if (lat && lon) {
      locationQuery = `lat=${lat}&lon=${lon}`;
    } else if (city) {
      locationQuery = `q=${encodeURIComponent(city)}`;
    } else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'city or lat/lon required' }) };
    }

    // Current weather
    if (type === 'current') {
      url = `https://api.openweathermap.org/data/2.5/weather?${locationQuery}&appid=${apiKey}&units=metric`;
    }
    // 5-day / hourly forecast
    else if (type === 'forecast') {
      url = `https://api.openweathermap.org/data/2.5/forecast?${locationQuery}&appid=${apiKey}&units=metric`;
    }
    // Air quality
    else if (type === 'air') {
      if (!lat || !lon) return { statusCode: 400, headers, body: JSON.stringify({ error: 'lat/lon required for air quality' }) };
      url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    }
    else {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid type' }) };
    }

    const response = await fetch(url);
    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch weather data' }),
    };
  }
};