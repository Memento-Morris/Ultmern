import express from "express";
import { getWeatherData, getWeatherForecast } from "../controllers/weatherController.js";

const router = express.Router();

// GET /api/weather?lat=123&lon=456
router.get("/", getWeatherData);

// GET /api/weather/forecast?lat=123&lon=456&days=5
router.get("/forecast", getWeatherForecast);

export default router;