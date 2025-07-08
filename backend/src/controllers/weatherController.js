
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