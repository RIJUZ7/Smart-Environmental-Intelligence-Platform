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
  BarChart,
  Bar
} from 'recharts';
import {
  Wind,
  Download,
  Info,
  Layers,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Calendar,
  Filter
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';
import {
  calculateSummaryStatistics,
  aggregateTimeSeries,
  exportToCsv,
  triggerFileDownload
} from '../utils/dataProcessing';
import {
  METRIC_THRESHOLDS,
  calculatePM25AQI,
  PM25_AQI_BREAKPOINTS
} from '../utils/environmentalStandards';
import { EnvironmentalRecord } from '../types/environmental';

export const AirQualityView: React.FC = () => {
  const { filteredRecords, stations, selectedStationId, setSelectedStationId, activeDataset } = useObservatory();

  const [selectedMetric, setSelectedMetric] = useState<keyof EnvironmentalRecord>('pm25');
  const [viewMode, setViewMode] = useState<'timeSeries' | 'stationComparison'>('timeSeries');
  const [aggregation, setAggregation] = useState<'daily' | 'raw'>('daily');

  // Active metric definition
  const metricThreshold = METRIC_THRESHOLDS[selectedMetric as string];

  // Summary statistics calculation
  const stats = useMemo(() => {
    return calculateSummaryStatistics(filteredRecords, selectedMetric);
  }, [filteredRecords, selectedMetric]);

  // Aggregated data for time series
  const aggregatedSeries = useMemo(() => {
    return aggregateTimeSeries(filteredRecords, selectedMetric, aggregation);
  }, [filteredRecords, selectedMetric, aggregation]);

  // Multi-station comparison dataset
  const stationComparisonData = useMemo(() => {
    // For each unique date, map values from each station
    const dateMap = new Map<string, Record<string, number | string>>();

    for (const r of filteredRecords) {
      const val = r[selectedMetric];
      if (val === undefined || val === null || isNaN(val as number)) continue;

      const dateKey = r.timestamp.slice(0, 10);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { dateKey, timestamp: r.timestamp });
      }

      const entry = dateMap.get(dateKey)!;
      // If multiple readings per day, compute running average
      const countKey = `__count_${r.stationId}`;
      const sumKey = `__sum_${r.stationId}`;

      entry[countKey] = ((entry[countKey] as number) || 0) + 1;
      entry[sumKey] = ((entry[sumKey] as number) || 0) + (val as number);
      entry[r.stationId] = Number(((entry[sumKey] as number) / (entry[countKey] as number)).toFixed(1));
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      String(a.dateKey).localeCompare(String(b.dateKey))
    );
  }, [filteredRecords, selectedMetric]);

  // Handle CSV Export
  const handleExportCsv = () => {
    const exportData = filteredRecords.map(r => ({
      timestamp: r.timestamp,
      stationId: r.stationId,
      stationName: r.stationName,
      region: r.region,
      [selectedMetric]: r[selectedMetric] ?? '',
      temperature: r.temperature ?? '',
      humidity: r.humidity ?? '',
      provenance: r.provenance
    }));

    const csvContent = exportToCsv(exportData);
    const filename = `ecosense_${selectedMetric}_${new Date().toISOString().slice(0, 10)}.csv`;
    triggerFileDownload(csvContent, filename);
  };

  // Color assignments for stations in comparison
  const stationColors = ['#315C45', '#477D92', '#B78A4D', '#C77938', '#82966B'];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 02</span>
            <span>·</span>
            <span>Atmospheric Chemistry</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <Wind className="w-8 h-8 text-[#315C45]" />
            Air Quality Intelligence
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Standard-referenced ambient particulate and gaseous contaminant monitoring with US EPA AQI nowcast evaluation.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#FFFEF9] border border-[#D9DCCF] hover:bg-[#E5EBDD] text-xs font-mono font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer text-[#24352D]"
          >
            <Download className="w-3.5 h-3.5 text-[#315C45]" /> Export Filtered CSV
          </button>
        </div>
      </div>

      {/* Metric Selector & Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFEF9] p-3 border border-[#D9DCCF] rounded-xs">
        {/* Metric Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'pm25', label: 'PM2.5 (Fine)', unit: 'µg/m³' },
            { id: 'pm10', label: 'PM10 (Coarse)', unit: 'µg/m³' },
            { id: 'no2', label: 'NO₂ (Dioxide)', unit: 'ppb' },
            { id: 'so2', label: 'SO₂ (Sulfur)', unit: 'ppb' },
            { id: 'co', label: 'CO (Monoxide)', unit: 'ppm' },
            { id: 'o3', label: 'O₃ (Ozone)', unit: 'ppb' },
          ].map(m => {
            const isSelected = selectedMetric === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id as keyof EnvironmentalRecord)}
                className={`px-3 py-1.5 rounded-xs text-xs font-mono font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#315C45] text-[#FFFEF9] font-bold shadow-2xs'
                    : 'bg-[#F3F1E8] text-[#24352D] hover:bg-[#E5EBDD]'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center border border-[#D9DCCF] rounded-xs overflow-hidden text-xs font-mono">
          <button
            onClick={() => setViewMode('timeSeries')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              viewMode === 'timeSeries' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B] hover:text-[#24352D]'
            }`}
          >
            Time Series
          </button>
          <button
            onClick={() => setViewMode('stationComparison')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              viewMode === 'stationComparison' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B] hover:text-[#24352D]'
            }`}
          >
            Station Comparison
          </button>
        </div>
      </div>

      {/* Summary Statistics Instrument Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Average (Mean)</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            {stats.mean}
            <span className="text-xs font-normal text-[#68756B] ml-1">{metricThreshold?.unit}</span>
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Arithmetic Mean</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Median (P50)</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            {stats.median}
            <span className="text-xs font-normal text-[#68756B] ml-1">{metricThreshold?.unit}</span>
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Rank Center</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Range [Min – Max]</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            {stats.min} – {stats.max}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Observation Span</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Std Deviation (σ)</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            ±{stats.stdDev}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Sample Variance Root</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">IQR [Q1 – Q3]</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            {stats.iqr}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">[{stats.q1} – {stats.q3}]</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Valid Samples</div>
          <div className="text-xl font-mono font-bold text-[#315C45] mt-0.5">
            {stats.validCount}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Non-null readings</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Missing / Null</div>
          <div className={`text-xl font-mono font-bold mt-0.5 ${stats.missingCount > 0 ? 'text-[#C77938]' : 'text-[#68756B]'}`}>
            {stats.missingCount}
            <span className="text-xs font-normal ml-1">
              ({stats.count > 0 ? ((stats.missingCount / stats.count) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Honest Gap Count</div>
        </div>
      </div>

      {/* Main Chart Instrument */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9DCCF] pb-3 mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-[#82966B] font-semibold">
              {viewMode === 'timeSeries' ? 'Time-Series Chronograph' : 'Cross-Station Comparative Array'}
            </span>
            <h3 className="font-heading text-2xl font-bold text-[#24352D]">
              {metricThreshold?.label} ({metricThreshold?.unit})
            </h3>
          </div>

          {viewMode === 'timeSeries' && (
            <div className="flex border border-[#D9DCCF] rounded-xs overflow-hidden text-xs font-mono">
              <button
                onClick={() => setAggregation('daily')}
                className={`px-2.5 py-1 transition-colors ${
                  aggregation === 'daily' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B]'
                }`}
              >
                Daily Mean
              </button>
              <button
                onClick={() => setAggregation('raw')}
                className={`px-2.5 py-1 transition-colors ${
                  aggregation === 'raw' ? 'bg-[#315C45] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B]'
                }`}
              >
                Raw Intervals
              </button>
            </div>
          )}
        </div>

        {/* View Mode 1: Single series with Thresholds */}
        {viewMode === 'timeSeries' ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aggregatedSeries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9DCCF" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={ts => (aggregation === 'daily' ? ts.slice(5, 10) : `${ts.slice(5, 10)} ${ts.slice(11, 16)}`)}
                  stroke="#68756B"
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                  dy={6}
                />
                <YAxis
                  stroke="#68756B"
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                  domain={['auto', 'auto']}
                  unit={` ${metricThreshold?.unit}`}
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
                            Observed: {data.mean} {metricThreshold?.unit}
                          </div>
                          <div className="text-[11px] text-[#68756B] mt-1 space-y-0.5">
                            <div>Min: {data.min} · Max: {data.max}</div>
                            <div>Observations aggregated: {data.count}</div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Guidelines Reference lines */}
                {metricThreshold?.advisoryMax && (
                  <ReferenceLine
                    y={metricThreshold.advisoryMax}
                    stroke="#82966B"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: `Advisory (${metricThreshold.advisoryMax})`, fill: '#82966B', fontSize: 10, position: 'right' }}
                  />
                )}
                {metricThreshold?.warningMax && (
                  <ReferenceLine
                    y={metricThreshold.warningMax}
                    stroke="#C77938"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: `Warning (${metricThreshold.warningMax})`, fill: '#C77938', fontSize: 10, position: 'right' }}
                  />
                )}
                {metricThreshold?.criticalMax && (
                  <ReferenceLine
                    y={metricThreshold.criticalMax}
                    stroke="#B64D43"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{ value: `Critical (${metricThreshold.criticalMax})`, fill: '#B64D43', fontSize: 10, position: 'right' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="mean"
                  name={metricThreshold?.label || String(selectedMetric)}
                  stroke="#315C45"
                  strokeWidth={2.2}
                  dot={aggregation === 'daily' ? { r: 3, fill: '#315C45' } : false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* View Mode 2: Station Comparison */
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stationComparisonData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9DCCF" vertical={false} />
                <XAxis
                  dataKey="dateKey"
                  stroke="#68756B"
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                  dy={6}
                />
                <YAxis
                  stroke="#68756B"
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                  unit={` ${metricThreshold?.unit}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs shadow-md text-xs font-mono">
                          <div className="text-[#82966B] font-semibold mb-1">Date: {label}</div>
                          {payload.map((p, idx) => (
                            <div key={`series-${idx}-${String(p.name)}`} className="flex justify-between gap-4 py-0.5">
                              <span style={{ color: p.color }}>{p.name}:</span>
                              <span className="font-bold text-[#24352D]">{p.value} {metricThreshold?.unit}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'IBM Plex Mono', paddingTop: '10px' }} />
                {stations.map((st, idx) => (
                  <Line
                    key={st.id}
                    type="monotone"
                    dataKey={st.id}
                    name={st.name}
                    stroke={stationColors[idx % stationColors.length]}
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Reference Standard Metadata Box */}
        <div className="mt-4 pt-3 border-t border-[#D9DCCF] flex flex-wrap items-center justify-between gap-3 text-xs text-[#68756B]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#82966B]" />
            <span>
              <strong>Authority Standard:</strong> {metricThreshold?.sourceStandard}
            </span>
          </div>
          <div className="font-mono text-[11px]">
            Physical Plausible Instrument Limits: [{metricThreshold?.physicalMin}, {metricThreshold?.physicalMax} {metricThreshold?.unit}]
          </div>
        </div>
      </div>

      {/* US EPA Air Quality Index (AQI) Calculation & Breakpoints Explainer */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-3 mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-[#82966B] font-semibold">
              Jurisdictional Conversion Methodology
            </span>
            <h3 className="font-heading text-xl font-bold text-[#24352D] flex items-center gap-2">
              US EPA Air Quality Index (AQI) Breakpoint Table
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#68756B]">
            40 CFR Part 58, Appendix G
          </span>
        </div>

        <p className="text-xs text-[#68756B] mb-4 leading-relaxed">
          The Air Quality Index (AQI) is a dimensionless indicator calculated by piecewise linear interpolation across regulated pollutant concentration breakpoints.
          Under US federal standards, pollutant concentration is truncated to one decimal place before calculation:
          <code className="mx-1 px-1.5 py-0.5 bg-[#F3F1E8] border border-[#D9DCCF] rounded-2xs font-mono text-[#24352D]">
            Ip = [(Ihi - Ilo) / (BPhi - BPlo)] × (Cp - BPlo) + Ilo
          </code>
        </p>

        {/* Breakpoints Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#D9DCCF] text-[10px] text-[#68756B] uppercase">
                <th className="pb-2">AQI Range</th>
                <th className="pb-2">PM2.5 (24-hr, µg/m³)</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Observatory Health Advisory Descriptor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DCCF]/60">
              {PM25_AQI_BREAKPOINTS.map(bp => (
                <tr key={bp.category} className="hover:bg-[#F3F1E8]/50 transition-colors">
                  <td className="py-2.5 font-bold text-[#24352D]">
                    {bp.iLow} – {bp.iHigh}
                  </td>
                  <td className="py-2.5 text-[#24352D]">
                    {bp.cLow.toFixed(1)} – {bp.cHigh.toFixed(1)}
                  </td>
                  <td className="py-2.5">
                    <span
                      className="px-2 py-0.5 rounded-2xs text-[11px] font-bold"
                      style={{ backgroundColor: `${bp.colorHex}20`, color: bp.colorHex }}
                    >
                      {bp.category}
                    </span>
                  </td>
                  <td className="py-2.5 text-[#68756B] text-[11px] font-sans">
                    {bp.category === 'Good' && 'Air quality is satisfactory, and air pollution poses little or no risk.'}
                    {bp.category === 'Moderate' && 'Acceptable air quality; moderate health concern for a very small number of individuals.'}
                    {bp.category === 'Unhealthy for Sensitive Groups' && 'Members of sensitive groups may experience health effects; general public less affected.'}
                    {bp.category === 'Unhealthy' && 'Some members of the general public may experience health effects; sensitive groups more serious.'}
                    {bp.category === 'Very Unhealthy' && 'Health alert: risk of health effects is increased for everyone.'}
                    {bp.category === 'Hazardous' && 'Health warning of emergency conditions: everyone is more likely to be affected.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
