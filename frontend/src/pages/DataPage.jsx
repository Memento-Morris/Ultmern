import { Activity, ArrowLeft, Calendar, Filter, Loader, TrendingUp, Zap, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush, ReferenceArea } from 'recharts';

// Mock API for demonstration
const mockApi = {
  get: async (url) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock device data
    const deviceData = {
      device: {
        _id: "device_001",
        device_name: "PMU-001",
        substation: "Main Substation",
        location: { lat: -33.9249, lon: 18.4241 } // Cape Town coordinates
      },
      sensorData: generateMockSensorData(100)
    };
    
    return { data: deviceData };
  }
};

// Generate mock sensor data
function generateMockSensorData(count) {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000); // 5 minutes apart
    data.push({
      _id: `reading_${i}`,
      timestamp: timestamp.toISOString(),
      measurements: {
        frequency: 50 + (Math.random() - 0.5) * 0.5, // 49.75 to 50.25 Hz
        voltage_phasors: [
          { channel: 'VA', magnitude: 220 + (Math.random() - 0.5) * 20, angle: Math.random() * 360 },
          { channel: 'VB', magnitude: 220 + (Math.random() - 0.5) * 20, angle: Math.random() * 360 },
          { channel: 'VC', magnitude: 220 + (Math.random() - 0.5) * 20, angle: Math.random() * 360 }
        ],
        current_phasors: [
          { channel: 'IA', magnitude: 10 + Math.random() * 50, angle: Math.random() * 360 },
          { channel: 'IB', magnitude: 10 + Math.random() * 50, angle: Math.random() * 360 },
          { channel: 'IC', magnitude: 10 + Math.random() * 50, angle: Math.random() * 360 }
        ]
      }
    });
  }
  
  return data;
}

// Custom hook for chart zoom functionality
const useChartZoom = (data) => {
  const [zoomDomain, setZoomDomain] = useState({ left: null, right: null });
  const [isZooming, setIsZooming] = useState(false);

  const resetZoom = useCallback(() => {
    setZoomDomain({ left: null, right: null });
  }, []);

  const handleZoom = useCallback((domain) => {
    if (domain && domain.left !== domain.right) {
      setZoomDomain(domain);
    }
  }, []);

  const filteredData = useMemo(() => {
    if (!data || !zoomDomain.left || !zoomDomain.right) return data;
    
    return data.filter((item, index) => {
      return index >= zoomDomain.left && index <= zoomDomain.right;
    });
  }, [data, zoomDomain]);

  return {
    zoomDomain,
    isZooming,
    setIsZooming,
    resetZoom,
    handleZoom,
    filteredData
  };
};
const useTimeRangeFilter = (timeRange, customStartDate, customEndDate) => {
  return useMemo(() => {
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
  }, [timeRange, customStartDate, customEndDate]);
};

// Zoomable Chart Component
const ZoomableChart = ({ 
  data, 
  title, 
  icon: Icon, 
  iconColor,
  children,
  yAxisDomain,
  height = 300 
}) => {
  const { zoomDomain, isZooming, setIsZooming, resetZoom, handleZoom, filteredData } = useChartZoom(data);
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');

  const handleMouseDown = (e) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
      setIsZooming(true);
    }
  };

  const handleMouseMove = (e) => {
    if (isZooming && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight) {
      const leftIndex = data.findIndex(item => item.timestamp === refAreaLeft);
      const rightIndex = data.findIndex(item => item.timestamp === refAreaRight);
      
      if (leftIndex !== -1 && rightIndex !== -1) {
        const left = Math.min(leftIndex, rightIndex);
        const right = Math.max(leftIndex, rightIndex);
        handleZoom({ left, right });
      }
    }
    setIsZooming(false);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {(zoomDomain.left !== null || zoomDomain.right !== null) && (
            <button
              onClick={resetZoom}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Zoom
            </button>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ZoomIn className="w-3 h-3" />
            Click and drag to zoom
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={filteredData || data}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis domain={yAxisDomain} />
          <Tooltip 
            labelFormatter={(label) => `Time: ${label}`}
            formatter={(value, name) => [
              typeof value === 'number' ? value.toFixed(2) : value,
              name
            ]}
          />
          {children}
          {refAreaLeft && refAreaRight && (
            <ReferenceArea
              x1={refAreaLeft}
              x2={refAreaRight}
              strokeOpacity={0.3}
              fillOpacity={0.1}
              fill="#3b82f6"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      
      {data && data.length > 20 && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={60}>
            <LineChart data={data}>
              <XAxis dataKey="timestamp" />
              <Brush 
                dataKey="timestamp"
                height={30}
                stroke="#3b82f6"
                onChange={(brushData) => {
                  if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
                    handleZoom({ left: brushData.startIndex, right: brushData.endIndex });
                  }
                }}
              />
              {React.cloneElement(children, { dot: false, strokeWidth: 1 })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon: Icon, color = "blue", subtitle }) => (
  <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <Icon className={`w-8 h-8 text-${color}-500`} />
    </div>
  </div>
);

// Time Range Filter Component
const TimeRangeFilter = ({ 
  timeRange, 
  setTimeRange, 
  customStartDate, 
  setCustomStartDate, 
  customEndDate, 
  setCustomEndDate,
  dataCount,
  totalCount,
  onPageReset
}) => {
  const timeRanges = [
    { value: '1h', label: '1 Hour' },
    { value: '6h', label: '6 Hours' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1m', label: '1 Month' },
    { value: 'custom', label: 'Custom' }
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Filter className="w-5 h-5 text-blue-500" />
        Time Range Filter
      </h3>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {timeRanges.map(range => (
            <button
              key={range.value}
              onClick={() => {
                setTimeRange(range.value);
                onPageReset();
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
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="datetime-local"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          Showing {dataCount} of {totalCount} records
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const DataPage = () => {
  const [sensorData, setSensorData] = useState([]);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showRawData, setShowRawData] = useState(false);
  
  // Time range filtering states
  const [timeRange, setTimeRange] = useState('1w');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Mock device ID for demonstration
  const id = "device_001";

  // Use custom hook for time range filtering
  const timeFilter = useTimeRangeFilter(timeRange, customStartDate, customEndDate);

  // Filter sensor data based on time range
  const filteredSensorData = useMemo(() => {
    if (!sensorData.length) return [];
    
    if (!timeFilter) return sensorData;
    
    return sensorData.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= timeFilter.start && readingDate <= timeFilter.end;
    });
  }, [sensorData, timeFilter]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await mockApi.get(`/sensor-data/device/${id}`);
        setSensorData(response.data.sensorData);
        setDeviceInfo(response.data.device);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch sensor data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!filteredSensorData.length) return [];
    
    const sorted = [...filteredSensorData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const maxPoints = timeRange === '1h' ? 60 : timeRange === '6h' ? 100 : 200;
    const recent = sorted.slice(-maxPoints);
    
    return recent.map(reading => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
      fullTimestamp: reading.timestamp,
      frequency: reading.measurements.frequency,
      va_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VA')?.magnitude || 0,
      vb_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VB')?.magnitude || 0,
      vc_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VC')?.magnitude || 0,
      ia_current: reading.measurements.current_phasors.find(p => p.channel === 'IA')?.magnitude || 0,
      ib_current: reading.measurements.current_phasors.find(p => p.channel === 'IB')?.magnitude || 0,
      ic_current: reading.measurements.current_phasors.find(p => p.channel === 'IC')?.magnitude || 0,
    }));
  }, [filteredSensorData, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredSensorData.length === 0) return {};
    
    const frequencies = filteredSensorData.map(d => d.measurements.frequency);
    const voltages = filteredSensorData.flatMap(d => d.measurements.voltage_phasors.map(p => p.magnitude));
    const currents = filteredSensorData.flatMap(d => d.measurements.current_phasors.map(p => p.magnitude));
    
    return {
      avgFrequency: frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
      avgVoltage: voltages.reduce((a, b) => a + b, 0) / voltages.length,
      avgCurrent: currents.reduce((a, b) => a + b, 0) / currents.length,
      latestReading: filteredSensorData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    };
  }, [filteredSensorData]);

  // Pagination
  const totalPages = Math.ceil(filteredSensorData.length / itemsPerPage);
  const paginatedData = filteredSensorData
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Utility functions
  const formatDateTime = (dateString) => new Date(dateString).toLocaleString();
  const formatValue = (value) => typeof value === 'number' ? value.toFixed(2) : value;
  const getFrequencyStatus = (frequency) => {
    const diff = Math.abs(frequency - 50);
    if (diff <= 0.1) return "text-green-500";
    if (diff <= 0.5) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin w-12 h-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading sensor data...</p>
        </div>
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
                Back to Device
              </Link>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="font-semibold text-red-800">Error Loading Data</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link to={`/note/${id}`} className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <ArrowLeft className="h-5 w-5" />
              Back to Device
            </Link>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900">Sensor Data Dashboard</h1>
              {deviceInfo && (
                <p className="text-lg text-gray-600">
                  {deviceInfo.device_name} • {deviceInfo.substation}
                </p>
              )}
            </div>
          </div>

          {/* Time Range Filter */}
          <TimeRangeFilter
            timeRange={timeRange}
            setTimeRange={setTimeRange}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
            dataCount={filteredSensorData.length}
            totalCount={sensorData.length}
            onPageReset={() => setCurrentPage(1)}
          />

          {/* Stats Overview */}
          {filteredSensorData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatsCard
                title="Filtered Records"
                value={filteredSensorData.length}
                icon={Calendar}
                color="blue"
              />
              <StatsCard
                title="Latest Frequency"
                value={`${formatValue(stats.latestReading?.measurements.frequency)} Hz`}
                icon={Zap}
                color="green"
                subtitle={formatDateTime(stats.latestReading?.timestamp)}
              />
              <StatsCard
                title="Avg Voltage"
                value={`${formatValue(stats.avgVoltage)} V`}
                icon={TrendingUp}
                color="yellow"
              />
              <StatsCard
                title="Avg Current"
                value={`${formatValue(stats.avgCurrent)} A`}
                icon={Activity}
                color="purple"
              />
            </div>
          )}

          {/* Charts Section */}
          {chartData.length > 0 && (
            <div className="space-y-6 mb-6">
              {/* Frequency Chart */}
              <ZoomableChart
                data={chartData}
                title="Frequency Trend"
                icon={Zap}
                iconColor="text-blue-500"
                yAxisDomain={[49, 51]}
              >
                <Line type="monotone" dataKey="frequency" stroke="#3b82f6" strokeWidth={2} dot={false} name="Frequency (Hz)" />
              </ZoomableChart>

              {/* Voltage Chart */}
              <ZoomableChart
                data={chartData}
                title="Voltage Phasors"
                icon={TrendingUp}
                iconColor="text-yellow-500"
              >
                <Legend />
                <Line type="monotone" dataKey="va_voltage" stroke="#ef4444" strokeWidth={2} dot={false} name="VA (V)" />
                <Line type="monotone" dataKey="vb_voltage" stroke="#f59e0b" strokeWidth={2} dot={false} name="VB (V)" />
                <Line type="monotone" dataKey="vc_voltage" stroke="#10b981" strokeWidth={2} dot={false} name="VC (V)" />
              </ZoomableChart>

              {/* Current Chart */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  Current Phasors
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => `Time: ${label}`}
                      formatter={(value) => [`${formatValue(value)} A`]}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="ia_current" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="IA" />
                    <Area type="monotone" dataKey="ib_current" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="IB" />
                    <Area type="monotone" dataKey="ic_current" stackId="1" stroke="#84cc16" fill="#84cc16" fillOpacity={0.6} name="IC" />
                    <Brush dataKey="timestamp" height={30} stroke="#8b5cf6" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Toggle Raw Data View */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <Filter className="w-4 h-4" />
              {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
            </button>
            {showRawData && (
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} • Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredSensorData.length)} of {filteredSensorData.length} records
              </div>
            )}
          </div>

          {/* Raw Data Table */}
          {showRawData && (
            <>
              {filteredSensorData.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No Sensor Data Found</h2>
                  <p className="text-gray-600">
                    No sensor data available for the selected time range.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedData.map((reading) => (
                    <div key={reading._id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium">
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
                            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <Zap className="w-5 h-5 text-yellow-500" />
                              Voltage Phasors
                            </h4>
                            <div className="space-y-2">
                              {reading.measurements.voltage_phasors.map((phasor, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="px-2 py-1 bg-yellow-500 text-white text-xs rounded font-medium">{phasor.channel}</div>
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
                            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                              <Activity className="w-5 h-5 text-blue-500" />
                              Current Phasors
                            </h4>
                            <div className="space-y-2">
                              {reading.measurements.current_phasors.map((phasor, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="px-2 py-1 bg-blue-500 text-white text-xs rounded font-medium">{phasor.channel}</div>
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
                              className={`px-3 py-2 rounded-lg ${currentPage === pageNum ? 'bg-blue-500 text-white' : 'bg-white
