import express from "express";
import {
    createSensorData,
    deleteSensorData,
    getAllDevicesWithSensorStats,
    getAllSensorData,
    getDeviceWithLatestSensorData,
    getSensorDataByDevice,
    getSensorDataById,
    updateSensorData,
} from "../controllers/sensordataController.js";

const router = express.Router();

router.get("/", getAllSensorData);
router.get("/:id", getSensorDataById);
router.get("/device/:device_id", getSensorDataByDevice);
router.get("/device/:device_id/latest", getDeviceWithLatestSensorData);
router.get("/devices/stats", getAllDevicesWithSensorStats);
router.post("/", createSensorData);
router.put("/:id", updateSensorData);
router.delete("/:id", deleteSensorData);

export default router;