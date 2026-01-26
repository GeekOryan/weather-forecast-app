const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const city = event.queryStringParameters.city;
  const type = event.queryStringParameters.type;
  
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  let url;
  if (type === 'current') {
    url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  } else {
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
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