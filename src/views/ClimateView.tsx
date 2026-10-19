import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart
} from 'recharts';
import {
  CloudSun,
  Thermometer,
  CloudRain,
  Wind,
  Compass,
  Download,
  Info,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';
import {
  calculateSummaryStatistics,
  aggregateTimeSeries,
  exportToCsv,
  triggerFileDownload
} from '../utils/dataProcessing';

export const ClimateView: React.FC = () => {
  const { filteredRecords, stations, selectedStationId } = useObservatory();

  const [timeSpan, setTimeSpan] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Statistics for weather parameters
  const tempStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'temperature'), [filteredRecords]);
  const rainStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'precipitation'), [filteredRecords]);
  const humidityStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'humidity'), [filteredRecords]);
  const windStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'windSpeed'), [filteredRecords]);
  const pressureStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'pressure'), [filteredRecords]);

  // Aggregated data for Temperature Range (Min, Mean, Max)
  const tempSeries = useMemo(() => {
    return aggregateTimeSeries(filteredRecords, 'temperature', timeSpan);
  }, [filteredRecords, timeSpan]);

  // Aggregated data for Precipitation
  const rainSeries = useMemo(() => {
    const rawAgg = aggregateTimeSeries(filteredRecords, 'precipitation', timeSpan);
    let cumulative = 0;
    return rawAgg.map(pt => {
      const intervalSum = pt.sum || 0;
      cumulative += intervalSum;
      return {
        ...pt,
        intervalSum: Number(intervalSum.toFixed(1)),
        cumulative: Number(cumulative.toFixed(1))
      };
    });
  }, [filteredRecords, timeSpan]);

  // Handle Export
  const handleExportCsv = () => {
    const exportData = filteredRecords.map(r => ({
      timestamp: r.timestamp,
      stationId: r.stationId,
      stationName: r.stationName,
      temperature: r.temperature ?? '',
      humidity: r.humidity ?? '',
      precipitation: r.precipitation ?? '',
      windSpeed: r.windSpeed ?? '',
      windDirection: r.windDirection ?? '',
      pressure: r.pressure ?? '',
      provenance: r.provenance
    }));

    const csvContent = exportToCsv(exportData);
    triggerFileDownload(csvContent, `ecosense_climate_observations_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 04</span>
            <span>·</span>
            <span>Meteorological Telemetry</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <CloudSun className="w-8 h-8 text-[#B78A4D]" />
            Climate & Weather Analytics
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Historical surface boundary-layer observations including temperature thermal ranges, precipitation sums, and wind dynamics.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3 py-1.5 bg-[#FFFEF9] border border-[#D9DCCF] hover:bg-[#E5EBDD] text-xs font-mono font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer text-[#24352D]"
        >
          <Download className="w-3.5 h-3.5 text-[#B78A4D]" /> Export Meteorological CSV
        </button>
      </div>

      {/* Mandatory Scientific Disclaimer Banner */}
      <div className="p-3.5 bg-[#E5EBDD]/70 border border-[#D9DCCF] rounded-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[#315C45] shrink-0 mt-0.5" />
        <div className="text-xs text-[#24352D] leading-relaxed">
          <strong className="font-semibold text-[#315C45]">Scientific Integrity Protocol:</strong> All analyses presented below represent verified historical sensor telemetry. In compliance with strict observatory policy, this system does not fabricate or extrapolate future weather forecasts without an authenticated physical numerical weather model (NWP).
        </div>
      </div>

      {/* Summary Meteorological Instrument Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3.5 rounded-xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-[#B78A4D]" /> Temperature
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#24352D]">
            {tempStats.mean}°C
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1 flex justify-between">
            <span>Range: {tempStats.min}° – {tempStats.max}°C</span>
          </div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3.5 rounded-xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-[#477D92]" /> Peak Rainfall
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#24352D]">
            {rainStats.max} mm
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1 flex justify-between">
            <span>Cumulative: {rainSeries[rainSeries.length - 1]?.cumulative || 0} mm</span>
          </div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3.5 rounded-xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1">
              <CloudSun className="w-3.5 h-3.5 text-[#82966B]" /> Relative Humidity
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#24352D]">
            {humidityStats.mean}%
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1 flex justify-between">
            <span>Span: {humidityStats.min}% – {humidityStats.max}%</span>
          </div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3.5 rounded-xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-[#315C45]" /> Wind Speed
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#24352D]">
            {windStats.mean} m/s
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1 flex justify-between">
            <span>Max Gust: {windStats.max} m/s</span>
          </div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3.5 rounded-xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase font-semibold flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[#68756B]" /> Baro Pressure
            </span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#24352D]">
            {pressureStats.validCount > 0 ? `${pressureStats.mean} hPa` : '—'}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1 flex justify-between">
            <span>{pressureStats.validCount > 0 ? `Span: ${pressureStats.min}–${pressureStats.max}` : 'Unmapped in dataset'}</span>
          </div>
        </div>
      </div>

      {/* Main Thermal Envelope Chart (Min / Mean / Max Range Band) */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9DCCF] pb-3 mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-[#82966B] font-semibold">
              Thermal Diurnal Envelope
            </span>
            <h3 className="font-heading text-2xl font-bold text-[#24352D]">
              Ambient Temperature Range [Min · Mean · Max]
            </h3>
          </div>

          <div className="flex border border-[#D9DCCF] rounded-xs overflow-hidden text-xs font-mono">
            <button
              onClick={() => setTimeSpan('daily')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                timeSpan === 'daily' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B]'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeSpan('weekly')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                timeSpan === 'weekly' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeSpan('monthly')}
              className={`px-3 py-1 transition-colors cursor-pointer ${
                timeSpan === 'monthly' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B]'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="h-76 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={tempSeries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="tempRangeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B78A4D" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#B78A4D" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9DCCF" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={ts => ts.slice(5, 10)}
                stroke="#68756B"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                dy={6}
              />
              <YAxis
                stroke="#68756B"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                unit="°C"
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs shadow-md text-xs font-mono">
                        <div className="text-[#82966B] font-semibold mb-1">{data.timestamp.slice(0, 10)}</div>
                        <div className="text-sm font-bold text-[#24352D]">Mean: {data.mean}°C</div>
                        <div className="text-[11px] text-[#68756B] mt-1 space-y-0.5">
                          <div>Max Temperature: {data.max}°C</div>
                          <div>Min Temperature: {data.min}°C</div>
                          <div>Diurnal Delta: {(data.max - data.min).toFixed(1)}°C</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'IBM Plex Mono', paddingTop: '10px' }} />
              {/* Max line */}
              <Line type="monotone" dataKey="max" name="Daily Max" stroke="#B64D43" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
              {/* Mean line */}
              <Line type="monotone" dataKey="mean" name="Daily Mean" stroke="#B78A4D" strokeWidth={2.5} dot={{ r: 3, fill: '#B78A4D' }} />
              {/* Min line */}
              <Line type="monotone" dataKey="min" name="Daily Min" stroke="#477D92" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Precipitation Bar & Cumulative Accumulation Chart */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9DCCF] pb-3 mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-[#82966B] font-semibold">
              Hydrometeorological Accumulation
            </span>
            <h3 className="font-heading text-2xl font-bold text-[#24352D]">
              Precipitation Hyetograph & Cumulative Mass Curve
            </h3>
          </div>
          <div className="text-xs font-mono text-[#68756B]">
            Measured via calibrated optical & tipping-bucket gauges
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rainSeries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9DCCF" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={ts => ts.slice(5, 10)}
                stroke="#68756B"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                dy={6}
              />
              <YAxis
                yAxisId="left"
                stroke="#477D92"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                unit=" mm"
                label={{ value: 'Daily Rain (mm)', angle: -90, position: 'insideLeft', fill: '#477D92', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#315C45"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                unit=" mm"
                label={{ value: 'Cumulative (mm)', angle: 90, position: 'insideRight', fill: '#315C45', fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs shadow-md text-xs font-mono">
                        <div className="text-[#82966B] font-semibold mb-1">{data.timestamp.slice(0, 10)}</div>
                        <div className="text-sm font-bold text-[#477D92]">Daily Rain: {data.intervalSum} mm</div>
                        <div className="text-[11px] text-[#315C45] mt-1 font-semibold">
                          Accumulated Total: {data.cumulative} mm
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'IBM Plex Mono', paddingTop: '10px' }} />
              <Bar yAxisId="left" dataKey="intervalSum" name="Daily Rainfall (mm)" fill="#477D92" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative Total (mm)" stroke="#315C45" strokeWidth={2.2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
