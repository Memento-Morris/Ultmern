import models from "../models/Note.js";
const { Data, Note } = models;

export async function getAllSensorData(req, res) {
  try {
    const { device_id, limit = 100, skip = 0 } = req.query;
    
    let query = {};
    if (device_id) {
      query.device_id = device_id;
    }

    const sensorData = await Data.find(query)
      .populate('device_id', 'device_name substation location')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.status(200).json(sensorData);
  } catch (error) {
    console.error("Error in getAllSensorData controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSensorDataById(req, res) {
  try {
    const sensorData = await Data.findById(req.params.id)
      .populate('device_id', 'device_name substation location');
    if (!sensorData) return res.status(404).json({ message: "Sensor data not found!" });
    res.json(sensorData);
  } catch (error) {
    console.error("Error in getSensorDataById controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createSensorData(req, res) {
  try {
    const { device_id, measurements, timestamp } = req.body;
    
    // Validate that the device exists
    const deviceExists = await Note.findById(device_id);
    if (!deviceExists) {
      return res.status(400).json({ message: "Device not found. Please provide a valid device ID." });
    }
    
    const sensorData = new Data({
      device_id,
      measurements,
      timestamp: timestamp || new Date(),
    });

    const savedSensorData = await sensorData.save();
    await savedSensorData.populate('device_id', 'device_name substation location');
    
    res.status(201).json(savedSensorData);
  } catch (error) {
    console.error("Error in createSensorData controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateSensorData(req, res) {
  try {
    const { device_id, measurements, timestamp } = req.body;
    const updatedSensorData = await Data.findByIdAndUpdate(
      req.params.id,
      { device_id, measurements, timestamp },
      { new: true }
    ).populate('device_id', 'device_name substation location');

    if (!updatedSensorData) return res.status(404).json({ message: "Sensor data not found" });

    res.status(200).json(updatedSensorData);
  } catch (error) {
    console.error("Error in updateSensorData controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteSensorData(req, res) {
  try {
    const deletedSensorData = await Data.findByIdAndDelete(req.params.id);
    if (!deletedSensorData) return res.status(404).json({ message: "Sensor data not found" });
    res.status(200).json({ message: "Sensor data deleted successfully!" });
  } catch (error) {
    console.error("Error in deleteSensorData controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getSensorDataByDevice(req, res) {
  try {
    const { device_id } = req.params;
    const { limit = 100, skip = 0 } = req.query;

    // Check if device exists
    const device = await Note.findById(device_id);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const sensorData = await Data.find({ device_id })
      .populate('device_id', 'device_name substation location')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.status(200).json({
      device: device,
      sensorData: sensorData,
      totalRecords: sensorData.length
    });
  } catch (error) {
    console.error("Error in getSensorDataByDevice controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getDeviceWithLatestSensorData(req, res) {
  try {
    const { device_id } = req.params;

    // Get device info
    const device = await Note.findById(device_id);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    // Get latest sensor data for this device
    const latestSensorData = await Data.findOne({ device_id })
      .sort({ timestamp: -1 });

    res.status(200).json({
      device: device,
      latestSensorData: latestSensorData,
      hasData: !!latestSensorData
    });
  } catch (error) {
    console.error("Error in getDeviceWithLatestSensorData controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getAllDevicesWithSensorStats(req, res) {
  try {
    // Get all devices
    const devices = await Note.find().sort({ createdAt: -1 });

    // Get sensor data stats for each device
    const devicesWithStats = await Promise.all(
      devices.map(async (device) => {
        const sensorDataCount = await Data.countDocuments({ device_id: device._id });
        const latestSensorData = await Data.findOne({ device_id: device._id })
          .sort({ timestamp: -1 })
          .select('timestamp measurements.frequency');

        return {
          ...device.toObject(),
          sensorDataCount,
          latestDataTimestamp: latestSensorData?.timestamp || null,
          latestFrequency: latestSensorData?.measurements?.frequency || null,
          isOnline: latestSensorData ? (Date.now() - new Date(latestSensorData.timestamp).getTime()) < 300000 : false // 5 minutes
        };
      })
    );

    res.status(200).json(devicesWithStats);
  } catch (error) {
    console.error("Error in getAllDevicesWithSensorStats controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
