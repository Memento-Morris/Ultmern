import { Activity, ArrowLeft, Calendar, Filter, Loader, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush } from 'recharts';
import api from "../lib/axios";

const DataPage = () => {
  const [sensorData, setSensorData] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [selectedMetric, setSelectedMetric] = useState('frequency');
  const [showRawData, setShowRawData] = useState(false);
  const [splitPhasors, setSplitPhasors] = useState(false);
  
  // Time range filtering states
  const [timeRange, setTimeRange] = useState('1w'); // '1h', '6h', '1d', '1w', '1m', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const { id } = useParams();

  // Calculate time range filter
  const getTimeRangeFilter = () => {
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1w':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate)
          };
        }
        return null;
      default:
        return null;
    }
    
    return { start: startDate, end: now };
  };

  // Filter sensor data based on time range
  const filteredSensorData = useMemo(() => {
    if (!sensorData.length) return [];
    
    const filter = getTimeRangeFilter();
    if (!filter) return sensorData;
    
    return sensorData.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= filter.start && readingDate <= filter.end;
    });
  }, [sensorData, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const sensorResponse = await api.get(`/sensor-data/device/${id}`);
        setSensorData(sensorResponse.data.sensorData);
        setDeviceInfo(sensorResponse.data.device);
      } catch (error) {
        console.log("Error fetching data:", error);
        setError("Failed to fetch sensor data");
        toast.error("Failed to load sensor data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Enhanced time formatting function
  const formatTimeAxis = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / (1000 * 60 * 60);
    
    // For very recent data (< 1 hour), show time only
    if (diffInHours < 1) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    }
    
    // For data within 24 hours, show time and "today/yesterday"
    if (diffInHours < 24) {
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      return `${timeStr} ${isToday ? 'Today' : 'Yesterday'}`;
    }
    
    // For older data, show date and time
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Enhanced tooltip formatter
  const formatTooltip = (value, name, props) => {
    if (props && props.payload && props.payload.fullTimestamp) {
      const date = new Date(props.payload.fullTimestamp);
      const unit = name === 'frequency' ? 'Hz' : name.includes('voltage') ? 'V' : 'A';
      return [
        `${typeof value === 'number' ? value.toFixed(2) : value} ${unit}`,
        `${name} at ${date.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}`
      ];
    }
    return [typeof value === 'number' ? value.toFixed(2) : value, name];
  };

  // Prepare chart data with enhanced timestamp formatting
  const chartData = useMemo(() => {
    if (!filteredSensorData.length) return [];
    
    // Sort by timestamp and limit for performance
    const sorted = [...filteredSensorData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const maxPoints = timeRange === '1h' ? 60 : timeRange === '6h' ? 100 : 500;
    const recent = sorted.slice(-maxPoints);
    
    return recent.map(reading => ({
      timestamp: formatTimeAxis(reading.timestamp),
      fullTimestamp: reading.timestamp,
      rawTimestamp: new Date(reading.timestamp).getTime(),
      frequency: reading.measurements.frequency,
      va_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VA')?.magnitude || 0,
      vb_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VB')?.magnitude || 0,
      vc_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VC')?.magnitude || 0,
      ia_current: reading.measurements.current_phasors.find(p => p.channel === 'IA')?.magnitude || 0,
      ib_current: reading.measurements.current_phasors.find(p => p.channel === 'IB')?.magnitude || 0,
      ic_current: reading.measurements.current_phasors.find(p => p.channel === 'IC')?.magnitude || 0,
    }));
  }, [filteredSensorData, timeRange]);

  // Pagination for raw data
  const totalPages = Math.ceil(filteredSensorData.length / itemsPerPage);
  const paginatedData = filteredSensorData
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatValue = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value;
  };

  const getFrequencyStatus = (frequency) => {
    const diff = Math.abs(frequency - 50);
    if (diff <= 0.1) return "text-green-500";
    if (diff <= 0.5) return "text-yellow-500";
    return "text-red-500";
  };

  const calculateStats = () => {
    if (filteredSensorData.length === 0) return {};
    
    const frequencies = filteredSensorData.map(d => d.measurements.frequency);
    const voltages = filteredSensorData.flatMap(d => d.measurements.voltage_phasors.map(p => p.magnitude));
    const currents = filteredSensorData.flatMap(d => d.measurements.current_phasors.map(p => p.magnitude));
    
    return {
      avgFrequency: frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
      avgVoltage: voltages.reduce((a, b) => a + b, 0) / voltages.length,
      avgCurrent: currents.reduce((a, b) => a + b, 0) / currents.length,
      minFreq: Math.min(...frequencies),
      maxFreq: Math.max(...frequencies),
      latestReading: filteredSensorData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="animate-spin w-10 h-10 text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
              <Link to={`/note/${id}`} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Device</span>
              </Link>
            </div>
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <span>{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <Link to={`/note/${id}`} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Device</span>
            </Link>
            <div className="text-left sm:text-right">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sensor Data Dashboard</h1>
              {deviceInfo && (
                <p className="text-base sm:text-lg text-gray-600">
                  {deviceInfo.device_name} • {deviceInfo.substation}
                </p>
              )}
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-500" />
              Time Range Filter
            </h3>
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: '1h', label: '1H' },
                  { value: '6h', label: '6H' },
                  { value: '1d', label: '1D' },
                  { value: '1w', label: '1W' },
                  { value: '1m', label: '1M' },
                  { value: 'custom', label: 'Custom' }
                ].map(range => (
                  <button
                    key={range.value}
                    onClick={() => {
                      setTimeRange(range.value);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === range.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              
              {timeRange === 'custom' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                  <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
                  />
                  <span className="text-gray-500 hidden sm:inline">to</span>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-auto"
                  />
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                Showing {filteredSensorData.length} of {sensorData.length} records
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          {filteredSensorData.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Records</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">{filteredSensorData.length}</p>
                  </div>
                  <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Latest Freq</p>
                    <p className={`text-lg sm:text-2xl font-bold ${getFrequencyStatus(stats.latestReading?.measurements.frequency)}`}>
                      {formatValue(stats.latestReading?.measurements.frequency)} Hz
                    </p>
                  </div>
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Avg Voltage</p>
                    <p className="text-lg sm:text-2xl font-bold text-yellow-600">{formatValue(stats.avgVoltage)} V</p>
                  </div>
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Last Updated</p>
                    <p className="text-xs sm:text-sm font-medium text-purple-600">
                      {stats.latestReading ? formatDateTime(stats.latestReading.timestamp) : 'N/A'}
                    </p>
                  </div>
                  <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Charts Section */}
          {chartData.length > 0 && (
            <div className="space-y-6 mb-6">
              {/* Frequency Chart */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Frequency Trend
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval="preserveStartEnd"
                    />
                    <YAxis domain={[49, 51]} />
                    <Tooltip formatter={formatTooltip} />
                    <Line type="monotone" dataKey="frequency" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Brush dataKey="timestamp" height={30} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Voltage Chart */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-yellow-500" />
                    Voltage Phasors
                  </h3>
                  <button
                    onClick={() => setSplitPhasors(!splitPhasors)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    {splitPhasors ? 'Combined View' : 'Split View'}
                  </button>
                </div>
                
                {splitPhasors ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* VA Voltage */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-red-600">Phase VA</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip formatter={formatTooltip} />
                          <Line type="monotone" dataKey="va_voltage" stroke="#ef4444" strokeWidth={2} dot={false} name="VA" />
                          <Brush dataKey="timestamp" height={30} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* VB Voltage */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-yellow-600">Phase VB</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip formatter={formatTooltip} />
                          <Line type="monotone" dataKey="vb_voltage" stroke="#f59e0b" strokeWidth={2} dot={false} name="VB" />
                          <Brush dataKey="timestamp" height={30} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* VC Voltage */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-green-600">Phase VC</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip formatter={formatTooltip} />
                          <Line type="monotone" dataKey="vc_voltage" stroke="#10b981" strokeWidth={2} dot={false} name="VC" />
                          <Brush dataKey="timestamp" height={30} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval="preserveStartEnd"
                      />
                      <YAxis />
                      <Tooltip formatter={formatTooltip} />
                      <Legend />
                      <Line type="monotone" dataKey="va_voltage" stroke="#ef4444" strokeWidth={2} dot={false} name="VA" />
                      <Line type="monotone" dataKey="vb_voltage" stroke="#f59e0b" strokeWidth={2} dot={false} name="VB" />
                      <Line type="monotone" dataKey="vc_voltage" stroke="#10b981" strokeWidth={2} dot={false} name="VC" />
                      <Brush dataKey="timestamp" height={30} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Current Chart */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" />
                    Current Phasors
                  </h3>
                  <button
                    onClick={() => setSplitPhasors(!splitPhasors)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    {splitPhasors ? 'Combined View' : 'Split View'}
                  </button>
                </div>
                
                {splitPhasors ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* IA Current */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-purple-600">Phase IA</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip formatter={formatTooltip} />
                          <Area type="monotone" dataKey="ia_current" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="IA" />
                          <Brush dataKey="timestamp" height={30} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* IB Current */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-cyan-600">Phase IB</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip formatter={formatTooltip} />
                          <Area type="monotone" dataKey="ib_current" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="IB" />
                          <Brush dataKey="timestamp" height={30} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* IC Current */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-lime-600">Phase IC</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="timestamp" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                          />
                          <YAxis />
                          <Tooltip formatter={formatTooltip} />
                          <Area type="monotone" dataKey="ic_current" stroke="#84cc16" fill="#84cc16" fillOpacity={0.6} name="IC" />
                          <Brush dataKey="timestamp" height={30} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval="preserveStartEnd"
                      />
                      <YAxis />
                      <Tooltip formatter={formatTooltip} />
                      <Legend />
                      <Area type="monotone" dataKey="ia_current" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="IA" />
                      <Area type="monotone" dataKey="ib_current" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="IB" />
                      <Area type="monotone" dataKey="ic_current" stackId="1" stroke="#84cc16" fill="#84cc16" fillOpacity={0.6} name="IC" />
                      <Brush dataKey="timestamp" height={30} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* Toggle Raw Data View */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <Filter className="w-4 h-4" />
              {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
            </button>
            {showRawData && (
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredSensorData.length)} of {filteredSensorData.length} records
              </div>
            )}
          </div>

          {/* Raw Data Table */}
          {showRawData && (
            <>
              {filteredSensorData.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center">
                  <h2 className="text-xl font-semibold mb-2">No Sensor Data Found</h2>
                  <p className="text-gray-600">
                    No sensor data available for the selected time range.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedData.map((reading) => (
                    <div key={reading._id} className="bg-white rounded-lg shadow">
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                            <div className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                              {formatDateTime(reading.timestamp)}
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getFrequencyStatus(reading.measurements.frequency)} bg-gray-100`}>
                              {formatValue(reading.measurements.frequency)} Hz
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Voltage Phasors */}
                          <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <Zap className="w-5 h-5 text-yellow-500" />
                              Voltage Phasors
                            </h3>
                            <div className="space-y-2">
                              {reading.measurements.voltage_phasors.map((phasor, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">{phasor.channel}</div>
                                    <span className="font-medium">{formatValue(phasor.magnitude)} V</span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    ∠ {formatValue(phasor.angle)}°
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Current Phasors */}
                          <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <Activity className="w-5 h-5 text-blue-500" />
                              Current Phasors
                            </h3>
                            <div className="space-y-2">
                              {reading.measurements.current_phasors.map((phasor, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded">{phasor.channel}</div>
                                    <span className="font-medium">{formatValue(phasor.magnitude)} A</span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    ∠ {formatValue(phasor.angle)}°
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <div className="flex gap-1">
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                          if (pageNum > totalPages) return null;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-2 rounded-lg ${currentPage === pageNum ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} shadow transition-colors`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataPage;
