export const getWeatherData = async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    // Validate coordinates are numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude values"
      });
    }

    // Check if API key is configured
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Weather API key not configured"
      });
    }

    // Make request to OpenWeatherMap API
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
    );

    if (!weatherResponse.ok) {
      const errorData = await weatherResponse.json();
      return res.status(weatherResponse.status).json({
        success: false,
        message: errorData.message || "Failed to fetch weather data"
      });
    }

    const weatherData = await weatherResponse.json();

    // Return formatted weather data
    res.json({
      success: true,
      data: {
        temperature: Math.round(weatherData.main.temp),
        humidity: weatherData.main.humidity,
        windSpeed: weatherData.wind.speed,
        description: weatherData.weather[0].description,
        icon: weatherData.weather[0].icon,
        location: weatherData.name,
        country: weatherData.sys.country,
        feelsLike: Math.round(weatherData.main.feels_like),
        pressure: weatherData.main.pressure,
        visibility: weatherData.visibility ? weatherData.visibility / 1000 : null, // Convert to km
        cloudiness: weatherData.clouds.all,
        windDirection: weatherData.wind.deg
      }
    });

  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching weather data"
    });
  }
};

export const getWeatherForecast = async (req, res) => {
  try {
    const { lat, lon, days = 5 } = req.query;

    // Validate required parameters
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    // Validate coordinates are numbers
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude values"
      });
    }

    // Validate days parameter
    const forecastDays = parseInt(days);
    if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 5) {
      return res.status(400).json({
        success: false,
        message: "Days must be a number between 1 and 5"
      });
    }

    // Check if API key is configured
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Weather API key not configured"
      });
    }

    // Make request to OpenWeatherMap 5-day forecast API
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
    );

    if (!forecastResponse.ok) {
      const errorData = await forecastResponse.json();
      return res.status(forecastResponse.status).json({
        success: false,
        message: errorData.message || "Failed to fetch forecast data"
      });
    }

    const forecastData = await forecastResponse.json();

    // Process forecast data - group by day and get daily summaries
    const dailyForecasts = [];
    const processedDates = new Set();

    for (const item of forecastData.list) {
      const date = new Date(item.dt * 1000);
      const dateString = date.toDateString();

      // Skip if we already processed this date or if we have enough days
      if (processedDates.has(dateString) || dailyForecasts.length >= forecastDays) {
        continue;
      }

      // Find all forecasts for this day
      const dayForecasts = forecastData.list.filter(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        return forecastDate.toDateString() === dateString;
      });

      // Calculate daily summary
      const temperatures = dayForecasts.map(f => f.main.temp);
      const humidities = dayForecasts.map(f => f.main.humidity);
      
      // Get the most common weather condition for the day
      const weatherConditions = dayForecasts.map(f => f.weather[0]);
      const mostCommonWeather = weatherConditions.reduce((prev, current) => 
        weatherConditions.filter(w => w.main === current.main).length > 
        weatherConditions.filter(w => w.main === prev.main).length ? current : prev
      );

      dailyForecasts.push({
        date: dateString,
        dateISO: date.toISOString().split('T')[0],
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        temperature: {
          min: Math.round(Math.min(...temperatures)),
          max: Math.round(Math.max(...temperatures)),
          avg: Math.round(temperatures.reduce((a, b) => a + b, 0) / temperatures.length)
        },
        humidity: Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length),
        description: mostCommonWeather.description,
        icon: mostCommonWeather.icon,
        main: mostCommonWeather.main,
        windSpeed: dayForecasts[0].wind.speed,
        windDirection: dayForecasts[0].wind.deg,
        cloudiness: dayForecasts[0].clouds.all,
        pressure: dayForecasts[0].main.pressure,
        hourlyForecasts: dayForecasts.map(forecast => ({
          time: new Date(forecast.dt * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          temperature: Math.round(forecast.main.temp),
          feelsLike: Math.round(forecast.main.feels_like),
          humidity: forecast.main.humidity,
          description: forecast.weather[0].description,
          icon: forecast.weather[0].icon,
          windSpeed: forecast.wind.speed,
          pop: Math.round(forecast.pop * 100) // Probability of precipitation
        }))
      });

      processedDates.add(dateString);
    }

    // Return formatted forecast data
    res.json({
      success: true,
      data: {
        location: forecastData.city.name,
        country: forecastData.city.country,
        coordinates: {
          latitude: forecastData.city.coord.lat,
          longitude: forecastData.city.coord.lon
        },
        timezone: forecastData.city.timezone,
        forecasts: dailyForecasts,
        totalDays: dailyForecasts.length
      }
    });

  } catch (error) {
    console.error("Error fetching forecast data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching forecast data"
    });
  }
};