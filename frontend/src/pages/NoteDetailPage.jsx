import { ArrowLeftIcon, CloudIcon, DropletIcon, LoaderIcon, ThermometerIcon, Trash2Icon, WindIcon } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../lib/axios";

const NoteDetailPage = () => {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await api.get(`/notes/${id}`);
        setNote(res.data);
      } catch (error) {
        console.log("Error in fetching device", error);
        toast.error("Failed to fetch the device");
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  const fetchWeather = async () => {
    if (!note?.location?.latitude || !note?.location?.longitude) {
      toast.error("Location coordinates are required for weather data");
      return;
    }

    setWeatherLoading(true);
    try {
      const response = await api.get(`/weather?lat=${note.location.latitude}&lon=${note.location.longitude}`);
      
      if (response.data.success) {
        setWeather(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch weather data');
      }
    } catch (error) {
      console.log("Error fetching weather:", error);
      toast.error(`Failed to fetch weather data: ${error.response?.data?.message || error.message}`);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this Device?")) return;

    try {
      await api.delete(`/notes/${id}`);
      toast.success("Device deleted");
      navigate("/");
    } catch (error) {
      console.log("Error deleting the device:", error);
      toast.error("Failed to delete device");
    }
  };

  const handleSave = async () => {
    if (!note.device_name.trim() || !note.substation.trim()) {
      toast.error("Please add a device name and substation");
      return;
    }

    setSaving(true);

    try {
      await api.put(`/notes/${id}`, note);
      toast.success("Device updated successfully");
      navigate("/");
    } catch (error) {
      console.log("Error saving the device:", error);
      toast.error("Failed to update device");
    } finally {
      setSaving(false);
    }
  };

  const handleViewData = () => {
    navigate(`/sensor-data/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <LoaderIcon className="animate-spin size-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="btn btn-ghost">
              <ArrowLeftIcon className="h-5 w-5" />
              Back to Devices
            </Link>
            <div className="flex gap-2">
              <button onClick={handleViewData} className="btn btn-info btn-outline">
                View Data
              </button>
              <button onClick={handleDelete} className="btn btn-error btn-outline">
                <Trash2Icon className="h-5 w-5" />
                Delete Device
              </button>
            </div>
          </div>

          <div className="card bg-base-100 mb-6">
            <div className="card-body">
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Device Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Device name"
                  className="input input-bordered"
                  value={note.device_name}
                  onChange={(e) => setNote({ ...note, device_name: e.target.value })}
                />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Substation</span>
                </label>
                <input
                  type="text"
                  placeholder="Substation name"
                  className="input input-bordered"
                  value={note.substation}
                  onChange={(e) => setNote({ ...note, substation: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Longitude</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={note.location.longitude}
                    readOnly
                    disabled
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Latitude</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={note.location.latitude}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="card-actions justify-end">
                <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Weather Card */}
          <div className="card bg-base-100">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title">
                  <CloudIcon className="h-5 w-5" />
                  Weather Information
                </h2>
                <button 
                  onClick={fetchWeather} 
                  className="btn btn-secondary btn-outline btn-sm"
                  disabled={weatherLoading}
                >
                  {weatherLoading ? <LoaderIcon className="animate-spin h-4 w-4" /> : "Get Weather"}
                </button>
              </div>

              {weather ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <ThermometerIcon className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-sm text-gray-600">Temperature</p>
                      <p className="font-semibold">{weather.temperature}°C</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DropletIcon className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-600">Humidity</p>
                      <p className="font-semibold">{weather.humidity}%</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <WindIcon className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Wind Speed</p>
                      <p className="font-semibold">{weather.windSpeed} m/s</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CloudIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Conditions</p>
                      <p className="font-semibold capitalize">{weather.description}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CloudIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Click "Get Weather" to fetch current weather data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetailPage;