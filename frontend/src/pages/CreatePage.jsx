import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router";
import api from "../lib/axios";

const CreatePage = () => {
  const [deviceName, setDeviceName] = useState("");
  const [substation, setSubstation] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!deviceName.trim() || !substation.trim() || !longitude || !latitude) {
      toast.error("All fields are required");
      return;
    }

    if (longitude < -180 || longitude > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    if (latitude < -90 || latitude > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }

    setLoading(true);
    try {
      await api.post("/notes", {
        device_name: deviceName,
        substation,
        location: {
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude),
        },
      });

      toast.success("Device created successfully!");
      navigate("/");
    } catch (error) {
      console.log("Error creating note", error);
      if (error.response.status === 429) {
        toast.error("Slow down! You're creating Devices too fast", {
          duration: 4000,
          icon: "💀",
        });
      } else {
        toast.error("Failed to create Device");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Link to={"/"} className="btn btn-ghost mb-6">
            <ArrowLeftIcon className="size-5" />
            Back to Notes
          </Link>

          <div className="card bg-base-100">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">Create New Device</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Device Name</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Device Name"
                    className="input input-bordered"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Substation</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Substation Name"
                    className="input input-bordered"
                    value={substation}
                    onChange={(e) => setSubstation(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Longitude</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Longitude"
                      className="input input-bordered"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      min="-180"
                      max="180"
                      step="any"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Latitude</span>
                    </label>
                    <input
                      type="number"
                      placeholder="Latitude"
                      className="input input-bordered"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      min="-90"
                      max="90"
                      step="any"
                    />
                  </div>
                </div>

                <div className="card-actions justify-end">
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Creating..." : "Create Device"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;