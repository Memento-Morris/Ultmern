import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    device_name: {
      type: String,
      required: true,
    },
    substation: {
      type: String,
      required: true,
    },
    location: {
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
    },
  },
  { timestamps: true }
);

// Updated Sensor Data Schema with device_id reference
const sensorDataSchema = new mongoose.Schema(
  {
    device_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device_Status',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    measurements: {
      voltage_phasors: [
        {
          channel: {
            type: String,
            required: true,
          },
          magnitude: {
            type: Number,
            required: true,
          },
          angle: {
            type: Number,
            required: true,
          },
        }
      ],
      current_phasors: [
        {
          channel: {
            type: String,
            required: true,
          },
          magnitude: {
            type: Number,
            required: true,
          },
          angle: {
            type: Number,
            required: true,
          },
        }
      ],
      frequency: {
        type: Number,
        required: true,
      },
    },
  },
  { timestamps: true }
);


const Note = mongoose.model("Device_Status", noteSchema);
const Data = mongoose.model("Sensor_Data", sensorDataSchema);

export default { Note, Data };