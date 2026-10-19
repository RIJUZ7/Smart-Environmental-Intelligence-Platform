import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import {
  Wind,
  Droplets,
  CloudSun,
  AlertTriangle,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Info,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';
import { StationMap } from '../components/common/StationMap';
import { calculateSummaryStatistics, aggregateTimeSeries, convertTemperature, convertPrecipitation } from '../utils/dataProcessing';
import { METRIC_THRESHOLDS, calculatePM25AQI } from '../utils/environmentalStandards';

export const OverviewView: React.FC = () => {
  const {
    activeDataset,
    records,
    filteredRecords,
    stations,
    selectedStationId,
    setSelectedStationId,
    dateRange,
    anomalies,
    filteredAnomalies,
    acknowledgeAnomaly,
    setActiveSection,
    isDemoMode,
    unitSystem
  } = useObservatory();

  const [primaryChartMetric, setPrimaryChartMetric] = useState<string>('pm25');
  const [chartGranularity, setChartGranularity] = useState<'raw' | 'daily'>('daily');

  // Compute latest valid reading
  const sortedRecordsDesc = useMemo(() => {
    return [...filteredRecords].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filteredRecords]);

  const latestRecord = sortedRecordsDesc[0] || null;

  // Calculate statistics for key indicators
  const pm25Stats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'pm25'), [filteredRecords]);
  const phStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'ph'), [filteredRecords]);
  const doStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'dissolvedOxygen'), [filteredRecords]);
  const tempStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'temperature'), [filteredRecords]);
  const rainStats = useMemo(() => calculateSummaryStatistics(filteredRecords, 'precipitation'), [filteredRecords]);

  // Aggregated data for the primary time series chart
  const timeSeriesData = useMemo(() => {
    return aggregateTimeSeries(filteredRecords, primaryChartMetric as keyof typeof filteredRecords[0], chartGranularity);
  }, [filteredRecords, primaryChartMetric, chartGranularity]);

  const activeMetricThreshold = METRIC_THRESHOLDS[primaryChartMetric];

  // Latest AQI calculation for PM2.5
  const latestAQI = useMemo(() => {
    if (latestRecord?.pm25 !== undefined && latestRecord.pm25 !== null) {
      return calculatePM25AQI(latestRecord.pm25);
    }
    return null;
  }, [latestRecord]);

  if (filteredRecords.length === 0) {
    return (
      <div className="p-8 text-center bg-[#FFFEF9] border border-[#D9DCCF] rounded-md m-4">
        <Info className="w-12 h-12 text-[#82966B] mx-auto mb-3" />
        <h3 className="font-heading text-2xl font-bold text-[#24352D]">No Observations In Selected Range</h3>
        <p className="text-sm text-[#68756B] max-w-md mx-auto mt-2">
          There are no environmental records matching the currently active date filters or station selection.
        </p>
        <button
          onClick={() => setActiveSection('import')}
          className="mt-4 px-4 py-2 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
        >
          Import Environmental Dataset
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Editorial Title & Observatory Station Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 01</span>
            <span>·</span>
            <span>Spatial Transect Telemetry</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight">
            Environmental Field Report
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Aggregated multi-parameter observations from{' '}
            <strong className="text-[#24352D]">{selectedStationId === 'ALL' ? 'all regional stations' : selectedStationId}</strong>{' '}
            spanning {dateRange.start.slice(0, 10)} to {dateRange.end.slice(0, 10)}.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-end">
          <div className="text-right text-[11px] font-mono text-[#68756B]">
            <div>LAST TELEMETRY UPDATE</div>
            <div className="text-[#24352D] font-bold">
              {latestRecord?.timestamp ? new Date(latestRecord.timestamp).toUTCString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Key Indicators Bar (Real Readings, Not Mockups) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* PM2.5 / Air Quality Card */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-[#315C45]" /> Air: PM2.5
            </span>
            {latestAQI && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.2 rounded-2xs font-bold"
                style={{ backgroundColor: `${latestAQI.colorHex}20`, color: latestAQI.colorHex }}
              >
                AQI {latestAQI.aqi} ({latestAQI.category})
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-mono font-bold text-[#24352D]">
              {latestRecord?.pm25 !== undefined ? `${latestRecord.pm25}` : '—'}
              <span className="text-xs font-normal text-[#68756B] ml-1">µg/m³</span>
            </div>
            <div className="text-right text-[10px] font-mono text-[#68756B]">
              <span>Avg: {pm25Stats.mean}</span>
              <br />
              <span>Max: {pm25Stats.max}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#68756B] border-t border-[#D9DCCF]/60 pt-1.5 flex justify-between">
            <span>WHO 24h Guideline: 15 µg/m³</span>
            <span>{pm25Stats.validCount} samples</span>
          </div>
        </div>

        {/* Water: pH */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#477D92]" /> Stream pH
            </span>
            <span className="text-[9px] font-mono text-[#68756B]">USGS 6.5–8.5</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-mono font-bold text-[#24352D]">
              {latestRecord?.ph !== undefined ? `${latestRecord.ph}` : '—'}
              <span className="text-xs font-normal text-[#68756B] ml-1">pH</span>
            </div>
            <div className="text-right text-[10px] font-mono text-[#68756B]">
              <span>Median: {phStats.median}</span>
              <br />
              <span>Range: {phStats.min}–{phStats.max}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#68756B] border-t border-[#D9DCCF]/60 pt-1.5 flex justify-between">
            <span>Baseline: Neutral Freshwater</span>
            <span>{phStats.validCount} samples</span>
          </div>
        </div>

        {/* Water: Dissolved Oxygen */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#477D92]" /> Dissolved O₂
            </span>
            <span className="text-[9px] font-mono text-[#315C45]">Optimum &gt;6.5</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-mono font-bold text-[#24352D]">
              {latestRecord?.dissolvedOxygen !== undefined ? `${latestRecord.dissolvedOxygen}` : '—'}
              <span className="text-xs font-normal text-[#68756B] ml-1">mg/L</span>
            </div>
            <div className="text-right text-[10px] font-mono text-[#68756B]">
              <span>Min: {doStats.min}</span>
              <br />
              <span>Mean: {doStats.mean}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#68756B] border-t border-[#D9DCCF]/60 pt-1.5 flex justify-between">
            <span>Hypoxia Threshold: &lt;2.0</span>
            <span>{doStats.validCount} samples</span>
          </div>
        </div>

        {/* Climate: Ambient Temp */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5 text-[#B78A4D]" /> Ambient Air
            </span>
            <span className="text-[9px] font-mono text-[#68756B]">2m Mast</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-mono font-bold text-[#24352D]">
              {latestRecord?.temperature !== undefined ? convertTemperature(latestRecord.temperature, unitSystem) : '—'}
              <span className="text-xs font-normal text-[#68756B] ml-1">{unitSystem === 'imperial' ? '°F' : '°C'}</span>
            </div>
            <div className="text-right text-[10px] font-mono text-[#68756B]">
              <span>Min: {tempStats.validCount > 0 ? convertTemperature(tempStats.min, unitSystem) : 0}{unitSystem === 'imperial' ? '°F' : '°C'}</span>
              <br />
              <span>Max: {tempStats.validCount > 0 ? convertTemperature(tempStats.max, unitSystem) : 0}{unitSystem === 'imperial' ? '°F' : '°C'}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#68756B] border-t border-[#D9DCCF]/60 pt-1.5 flex justify-between">
            <span>Mean: {tempStats.validCount > 0 ? convertTemperature(tempStats.mean, unitSystem) : 0}{unitSystem === 'imperial' ? '°F' : '°C'}</span>
            <span>{tempStats.validCount} samples</span>
          </div>
        </div>

        {/* Climate: Rainfall */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-xs shadow-2xs">
          <div className="flex items-center justify-between text-[#68756B] mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5 text-[#315C45]" /> Precipitation
            </span>
            <span className="text-[9px] font-mono text-[#68756B]">Interval Sum</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className="text-2xl font-mono font-bold text-[#24352D]">
              {rainStats.max > 0 ? convertPrecipitation(rainStats.max, unitSystem) : '0.0'}
              <span className="text-xs font-normal text-[#68756B] ml-1">{unitSystem === 'imperial' ? 'in (peak)' : 'mm (peak)'}</span>
            </div>
            <div className="text-right text-[10px] font-mono text-[#68756B]">
              <span>Total Obs: {rainStats.validCount}</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#68756B] border-t border-[#D9DCCF]/60 pt-1.5 flex justify-between">
            <span>Heavy Rain Standard: 25mm</span>
            <span>Gauge Metric</span>
          </div>
        </div>
      </div>

      {/* Main Integrated Time Series Instrument */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9DCCF] pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase text-[#82966B] font-semibold">
                Multi-Station Chronological Series
              </span>
              <span className="text-[10px] font-mono bg-[#E5EBDD] text-[#315C45] px-1.5 py-0.2 rounded-2xs font-semibold">
                {chartGranularity.toUpperCase()} AGGREGATION
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#24352D] flex items-center gap-2 mt-0.5">
              <TrendingUp className="w-4 h-4 text-[#315C45]" />
              {activeMetricThreshold?.label || primaryChartMetric} Observation Chronology
            </h3>
          </div>

          {/* Metric Selector & Granularity Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={primaryChartMetric}
              onChange={e => setPrimaryChartMetric(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono font-medium border border-[#D9DCCF] rounded-xs bg-[#F3F1E8] text-[#24352D] cursor-pointer"
              aria-label="Select primary metric for time series"
            >
              <optgroup label="Air Quality">
                <option value="pm25">PM2.5 (Fine Particulate)</option>
                <option value="pm10">PM10 (Coarse Particulate)</option>
                <option value="no2">Nitrogen Dioxide (NO₂)</option>
                <option value="so2">Sulfur Dioxide (SO₂)</option>
                <option value="o3">Ozone (O₃)</option>
              </optgroup>
              <optgroup label="Water Quality">
                <option value="ph">Water pH</option>
                <option value="dissolvedOxygen">Dissolved Oxygen (DO)</option>
                <option value="turbidity">Turbidity (NTU)</option>
                <option value="conductivity">Specific Conductivity</option>
                <option value="nitrate">Nitrate (NO₃-N)</option>
              </optgroup>
              <optgroup label="Climate & Weather">
                <option value="temperature">Ambient Temperature (°C)</option>
                <option value="humidity">Relative Humidity (%)</option>
                <option value="precipitation">Precipitation (mm)</option>
                <option value="windSpeed">Wind Speed (m/s)</option>
              </optgroup>
            </select>

            <div className="flex border border-[#D9DCCF] rounded-xs overflow-hidden text-xs">
              <button
                onClick={() => setChartGranularity('daily')}
                className={`px-2 py-1 font-mono transition-colors ${
                  chartGranularity === 'daily' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B] hover:text-[#24352D]'
                }`}
              >
                Daily Mean
              </button>
              <button
                onClick={() => setChartGranularity('raw')}
                className={`px-2 py-1 font-mono transition-colors ${
                  chartGranularity === 'raw' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B] hover:text-[#24352D]'
                }`}
              >
                Raw Interval
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Main Graph Area */}
        <div className="h-72 sm:h-84 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <defs>
                <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#315C45" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#315C45" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9DCCF" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={ts => (chartGranularity === 'daily' ? ts.slice(5, 10) : `${ts.slice(5, 10)} ${ts.slice(11, 16)}`)}
                stroke="#68756B"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                dy={6}
              />
              <YAxis
                stroke="#68756B"
                fontSize={10}
                fontFamily="IBM Plex Mono"
                dx={-4}
                domain={['auto', 'auto']}
                unit={activeMetricThreshold ? ` ${activeMetricThreshold.unit}` : ''}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs shadow-md text-xs font-mono">
                        <div className="text-[#82966B] font-semibold mb-1">
                          {data.timestamp.slice(0, 16).replace('T', ' ')} UTC
                        </div>
                        <div className="text-sm font-bold text-[#24352D]">
                          Mean: {data.mean} {activeMetricThreshold?.unit}
                        </div>
                        <div className="text-[11px] text-[#68756B] mt-1 space-y-0.5">
                          <div>Min: {data.min} · Max: {data.max}</div>
                          <div>Sample Count: {data.count} observations</div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Reference Lines for Guidelines */}
              {activeMetricThreshold?.advisoryMax && (
                <ReferenceLine
                  y={activeMetricThreshold.advisoryMax}
                  stroke="#82966B"
                  strokeDasharray="4 4"
                  label={{ value: `Advisory (${activeMetricThreshold.advisoryMax})`, fill: '#82966B', fontSize: 10, position: 'right' }}
                />
              )}
              {activeMetricThreshold?.warningMax && (
                <ReferenceLine
                  y={activeMetricThreshold.warningMax}
                  stroke="#C77938"
                  strokeDasharray="4 4"
                  label={{ value: `Warning (${activeMetricThreshold.warningMax})`, fill: '#C77938', fontSize: 10, position: 'right' }}
                />
              )}
              {activeMetricThreshold?.criticalMax && (
                <ReferenceLine
                  y={activeMetricThreshold.criticalMax}
                  stroke="#B64D43"
                  strokeDasharray="3 3"
                  label={{ value: `Critical (${activeMetricThreshold.criticalMax})`, fill: '#B64D43', fontSize: 10, position: 'right' }}
                />
              )}
              <Area
                type="monotone"
                dataKey="mean"
                stroke="#315C45"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#metricFill)"
                dot={chartGranularity === 'daily' ? { r: 2.5, fill: '#315C45' } : false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Standard Reference Annotation Legend */}
        {activeMetricThreshold && (
          <div className="mt-3 pt-2.5 border-t border-[#D9DCCF] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#68756B]">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#82966B]" />
              <strong>Reference Standard:</strong> {activeMetricThreshold.sourceStandard}
            </span>
            <span className="font-mono text-[10px]">
              Units: {activeMetricThreshold.unit} · Plausible Sensor Range: [{activeMetricThreshold.physicalMin}, {activeMetricThreshold.physicalMax}]
            </span>
          </div>
        )}
      </div>

      {/* Regional Station Transect Map Component */}
      <StationMap
        stations={stations}
        records={records}
        anomalies={anomalies}
        selectedStationId={selectedStationId}
        onSelectStation={setSelectedStationId}
      />

      {/* Two Column Layout: Anomalies Ticker & Recent Observations Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Detected Anomalies Panel */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C77938]" />
                <h3 className="font-heading text-xl font-bold text-[#24352D]">
                  Active Detected Anomalies
                </h3>
              </div>
              <button
                onClick={() => setActiveSection('anomalies')}
                className="text-xs font-mono text-[#315C45] hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All ({filteredAnomalies.length}) <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-[#68756B] mb-3">
              Explainable statistical signals detected across sensor feeds. Anomalies require field verification and do not represent verified contamination.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {filteredAnomalies.slice(0, 5).map(anomaly => {
                const badgeColor =
                  anomaly.severity === 'critical'
                    ? 'bg-[#B64D43]/15 text-[#B64D43] border-[#B64D43]/30'
                    : anomaly.severity === 'warning'
                    ? 'bg-[#C77938]/15 text-[#C77938] border-[#C77938]/30'
                    : 'bg-[#B78A4D]/15 text-[#B78A4D] border-[#B78A4D]/30';

                return (
                  <div
                    key={anomaly.id}
                    className="p-3 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/30 hover:bg-[#F3F1E8]/80 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono uppercase font-bold border rounded-2xs ${badgeColor}`}>
                          {anomaly.severity}
                        </span>
                        <span className="font-semibold text-[#24352D]">{anomaly.metricLabel}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#68756B]">
                        {anomaly.timestamp.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#24352D] mb-1.5 leading-snug">
                      {anomaly.explanation}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#68756B] pt-1 border-t border-[#D9DCCF]/50">
                      <span>Station: {anomaly.stationName}</span>
                      {anomaly.acknowledged ? (
                        <span className="text-[#315C45] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Acknowledged
                        </span>
                      ) : (
                        <button
                          onClick={() => acknowledgeAnomaly(anomaly.id, 'Reviewed from Field Report Overview')}
                          className="text-[#315C45] hover:underline font-semibold cursor-pointer"
                        >
                          Acknowledge Signal
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredAnomalies.length === 0 && (
                <div className="text-center py-8 text-xs text-[#68756B]">
                  <CheckCircle2 className="w-8 h-8 text-[#315C45] mx-auto mb-2 opacity-80" />
                  No unacknowledged anomalies detected within the active parameters.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Observations Timeline */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#315C45]" />
                <h3 className="font-heading text-xl font-bold text-[#24352D]">
                  Recent Telemetry Feed
                </h3>
              </div>
              <span className="text-xs font-mono text-[#68756B]">
                {filteredRecords.length} Filtered Obs
              </span>
            </div>

            <p className="text-xs text-[#68756B] mb-3">
              Chronological log of verified sensor observations received by the observatory transect.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9DCCF] text-[10px] font-mono uppercase text-[#68756B]">
                    <th className="pb-1.5">Timestamp (UTC)</th>
                    <th className="pb-1.5">Station</th>
                    <th className="pb-1.5">PM2.5</th>
                    <th className="pb-1.5">pH</th>
                    <th className="pb-1.5">Temp</th>
                    <th className="pb-1.5">Rain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9DCCF]/50 font-mono text-[11px]">
                  {sortedRecordsDesc.slice(0, 8).map(record => (
                    <tr key={record.id} className="hover:bg-[#F3F1E8]/60 transition-colors">
                      <td className="py-2 text-[#68756B]">{record.timestamp.slice(0, 16).replace('T', ' ')}</td>
                      <td className="py-2 font-medium text-[#24352D]">{record.stationId}</td>
                      <td className="py-2 text-[#24352D]">{record.pm25 !== undefined ? `${record.pm25}` : '—'}</td>
                      <td className="py-2 text-[#24352D]">{record.ph !== undefined ? record.ph : '—'}</td>
                      <td className="py-2 text-[#24352D]">{record.temperature !== undefined ? `${record.temperature}°` : '—'}</td>
                      <td className="py-2 text-[#24352D]">{record.precipitation !== undefined ? `${record.precipitation}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-[#D9DCCF] flex items-center justify-between text-[11px] text-[#68756B]">
            <span>Showing latest 8 of {filteredRecords.length} records</span>
            <button
              onClick={() => setActiveSection('air')}
              className="text-[#315C45] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              Examine Air Telemetry <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
