import express from "express";
import { getWeatherData } from "../controllers/weatherController.js";

const router = express.Router();

// GET /api/weather?lat=123&lon=456
router.get("/", getWeatherData);

export default router;