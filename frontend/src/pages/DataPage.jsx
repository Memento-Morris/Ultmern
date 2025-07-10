import { Activity, ArrowLeft, Calendar, Filter, Loader, TrendingUp, Zap, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush } from 'recharts';

// Mock API for demonstration
const api = {
  get: async (url) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock sensor data
    const mockData = [];
    const now = new Date();
    
    for (let i = 0; i < 1000; i++) {
      const timestamp = new Date(now.getTime() - i * 60000); // Every minute
      mockData.push({
        _id: `reading_${i}`,
        timestamp: timestamp.toISOString(),
        measurements: {
          frequency: 50 + (Math.random() - 0.5) * 2, // 49-51 Hz
          voltage_phasors: [
            { channel: 'VA', magnitude: 230 + (Math.random() - 0.5) * 20, angle: Math.random() * 360 },
            { channel: 'VB', magnitude: 230 + (Math.random() - 0.5) * 20, angle: Math.random() * 360 },
            { channel: 'VC', magnitude: 230 + (Math.random() - 0.5) * 20, angle: Math.random() * 360 }
          ],
          current_phasors: [
            { channel: 'IA', magnitude: 10 + Math.random() * 15, angle: Math.random() * 360 },
            { channel: 'IB', magnitude: 10 + Math.random() * 15, angle: Math.random() * 360 },
            { channel: 'IC', magnitude: 10 + Math.random() * 15, angle: Math.random() * 360 }
          ]
        }
      });
    }
    
    return {
      data: {
        sensorData: mockData,
        device: {
          device_name: 'Power Monitor 001',
          substation: 'Main Substation Alpha'
        }
      }
    };
  }
};

// Virtual List Component for large datasets
const VirtualList = ({ items, itemHeight = 280, containerHeight = 600, renderItem }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(visibleStart + Math.ceil(containerHeight / itemHeight) + 1, items.length);
  const visibleItems = items.slice(visibleStart, visibleEnd);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="border rounded-lg"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={visibleStart + index} style={{ height: itemHeight }}>
              {renderItem(item, visibleStart + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Custom Chart Component with Zoom Controls
const ZoomableChart = ({ data, title, children, icon: Icon }) => {
  const [zoomDomain, setZoomDomain] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleZoomIn = () => {
    if (!zoomDomain && data.length > 0) {
      const midPoint = Math.floor(data.length / 2);
      const quarter = Math.floor(data.length / 4);
      setZoomDomain([Math.max(0, midPoint - quarter), Math.min(data.length - 1, midPoint + quarter)]);
      setIsZoomed(true);
    }
  };

  const handleZoomOut = () => {
    if (zoomDomain) {
      const [start, end] = zoomDomain;
      const range = end - start;
      const newRange = Math.min(range * 2, data.length - 1);
      const center = Math.floor((start + end) / 2);
      const newStart = Math.max(0, center - Math.floor(newRange / 2));
      const newEnd = Math.min(data.length - 1, newStart + newRange);
      
      if (newStart === 0 && newEnd === data.length - 1) {
        setZoomDomain(null);
        setIsZoomed(false);
      } else {
        setZoomDomain([newStart, newEnd]);
      }
    }
  };

  const handleReset = () => {
    setZoomDomain(null);
    setIsZoomed(false);
  };

  const displayData = zoomDomain ? data.slice(zoomDomain[0], zoomDomain[1] + 1) : data;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-500" />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            disabled={isZoomed}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={!isZoomed}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            disabled={!isZoomed}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        {children(displayData)}
      </ResponsiveContainer>
      {isZoomed && (
        <div className="mt-2 text-sm text-gray-600">
          Showing {zoomDomain[1] - zoomDomain[0] + 1} of {data.length} data points
        </div>
      )}
    </div>
  );
};

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

  const id = 'demo-device-1'; // Mock device ID

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
    
    return sorted.map((reading, index) => ({
      timestamp: new Date(reading.timestamp).toLocaleTimeString(),
      fullTimestamp: reading.timestamp,
      index: index,
      frequency: reading.measurements.frequency,
      va_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VA')?.magnitude || 0,
      vb_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VB')?.magnitude || 0,
      vc_voltage: reading.measurements.voltage_phasors.find(p => p.channel === 'VC')?.magnitude || 0,
      ia_current: reading.measurements.current_phasors.find(p => p.channel === 'IA')?.magnitude || 0,
      ib_current: reading.measurements.current_phasors.find(p => p.channel === 'IB')?.magnitude || 0,
      ic_current: reading.measurements.current_phasors.find(p => p.channel === 'IC')?.magnitude || 0,
    }));
  }, [filteredSensorData]);

  // Pagination for raw data
  const totalPages = Math.ceil(filteredSensorData.length / itemsPerPage);
  const paginatedData = filteredSensorData
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
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

  // Render item for virtual list
  const renderVirtualItem = useCallback((reading, index) => (
    <div className="bg-white rounded-lg shadow m-2 border">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-gray-100 rounded-full text-sm">
              {formatDateTime(reading.timestamp)}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getFrequencyStatus(reading.measurements.frequency)} bg-gray-100`}>
              {formatValue(reading.measurements.frequency)} Hz
            </div>
          </div>
          <div className="text-sm text-gray-500">#{index + 1}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voltage Phasors */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Voltage Phasors
            </h3>
            <div className="space-y-2">
              {reading.measurements.voltage_phasors.map((phasor, phasorIndex) => (
                <div key={phasorIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
              {reading.measurements.current_phasors.map((phasor, phasorIndex) => (
                <div key={phasorIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
  ), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin w-10 h-10 text-blue-500 mx-auto mb-4" />
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
              <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <ArrowLeft className="h-5 w-5" />
                Back to Device
              </button>
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <ArrowLeft className="h-5 w-5" />
              Back to Device
            </button>
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
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-500" />
              Time Range Filter
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex gap-2">
                {[
                  { value: '1h', label: '1 Hour' },
                  { value: '6h', label: '6 Hours' },
                  { value: '1d', label: '1 Day' },
                  { value: '1w', label: '1 Week' },
                  { value: '1m', label: '1 Month' },
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
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Filtered Records</p>
                    <p className="text-2xl font-bold text-blue-600">{filteredSensorData.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Latest Frequency</p>
                    <p className={`text-2xl font-bold ${getFrequencyStatus(stats.latestReading?.measurements.frequency)}`}>
                      {formatValue(stats.latestReading?.measurements.frequency)} Hz
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Voltage</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatValue(stats.avgVoltage)} V</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="text-sm font-medium text-purple-600">
                      {stats.latestReading ? formatDateTime(stats.latestReading.timestamp) : 'N/A'}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>
          )}

          {/* Zoomable Charts Section */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Frequency Chart */}
              <ZoomableChart data={chartData} title="Frequency Trend" icon={Zap}>
                {(data) => (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[49, 51]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="frequency" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Brush dataKey="timestamp" height={30} />
                  </LineChart>
                )}
              </ZoomableChart>

              {/* Voltage Chart */}
              <ZoomableChart data={chartData} title="Voltage Phasors" icon={TrendingUp}>
                {(data) => (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="va_voltage" stroke="#ef4444" strokeWidth={2} dot={false} name="VA" />
                    <Line type="monotone" dataKey="vb_voltage" stroke="#f59e0b" strokeWidth={2} dot={false} name="VB" />
                    <Line type="monotone" dataKey="vc_voltage" stroke="#10b981" strokeWidth={2} dot={false} name="VC" />
                    <Brush dataKey="timestamp" height={30} />
                  </LineChart>
                )}
              </ZoomableChart>

              {/* Current Chart */}
              <div className="lg:col-span-2">
                <ZoomableChart data={chartData} title="Current Phasors" icon={Activity}>
                  {(data) => (
                    <AreaChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="ia_current" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} name="IA" />
                      <Area type="monotone" dataKey="ib_current" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} name="IB" />
                      <Area type="monotone" dataKey="ic_current" stackId="1" stroke="#84cc16" fill="#84cc16" fillOpacity={0.6} name="IC" />
                      <Brush dataKey="timestamp" height={30} />
                    </AreaChart>
                  )}
                </ZoomableChart>
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
                Virtual scrolling enabled for {filteredSensorData.length} records
              </div>
            )}
          </div>

          {/* Raw Data with Virtual Scrolling */}
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
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Raw Data (Virtual Scrolling)</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Performance optimized for large datasets. Only visible items are rendered.
                    </p>
                    <VirtualList
                      items={filteredSensorData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))}
                      itemHeight={280}
                      containerHeight={600}
                      renderItem={renderVirtualItem}
                    />
                  </div>
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
