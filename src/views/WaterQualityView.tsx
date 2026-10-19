import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  Droplets,
  Download,
  Info,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  Waves,
  ShieldAlert
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';
import {
  calculateSummaryStatistics,
  aggregateTimeSeries,
  calculateDistributionHistogram,
  exportToCsv,
  triggerFileDownload
} from '../utils/dataProcessing';
import { METRIC_THRESHOLDS, PARAMETER_GLOSSARY } from '../utils/environmentalStandards';
import { EnvironmentalRecord } from '../types/environmental';

export const WaterQualityView: React.FC = () => {
  const { filteredRecords, stations, selectedStationId } = useObservatory();

  // Dynamic parameter detection: check which water quality fields have data
  const waterParameters: (keyof EnvironmentalRecord)[] = [
    'ph',
    'turbidity',
    'dissolvedOxygen',
    'conductivity',
    'waterTemp',
    'nitrate'
  ];

  const availableWaterParams = useMemo(() => {
    return waterParameters.filter(param => {
      return filteredRecords.some(r => r[param] !== undefined && r[param] !== null && !isNaN(r[param] as number));
    });
  }, [filteredRecords]);

  const [selectedParam, setSelectedParam] = useState<keyof EnvironmentalRecord>(
    availableWaterParams[0] || 'ph'
  );
  const [chartMode, setChartMode] = useState<'timeSeries' | 'distribution'>('timeSeries');

  const threshold = METRIC_THRESHOLDS[selectedParam as string];
  const glossaryItem = PARAMETER_GLOSSARY.find(g => g.key === selectedParam);

  // Summary statistics
  const stats = useMemo(() => {
    return calculateSummaryStatistics(filteredRecords, selectedParam);
  }, [filteredRecords, selectedParam]);

  // Aggregated series
  const timeSeries = useMemo(() => {
    return aggregateTimeSeries(filteredRecords, selectedParam, 'daily');
  }, [filteredRecords, selectedParam]);

  // Distribution histogram
  const histogramData = useMemo(() => {
    return calculateDistributionHistogram(filteredRecords, selectedParam, 8);
  }, [filteredRecords, selectedParam]);

  // Out-of-range observations detection
  const outOfRangeRecords = useMemo(() => {
    if (!threshold) return [];
    return filteredRecords.filter(r => {
      const v = r[selectedParam];
      if (v === undefined || v === null || isNaN(v as number)) return false;
      const num = v as number;

      if (threshold.criticalMax !== undefined && num >= threshold.criticalMax) return true;
      if (threshold.criticalMin !== undefined && num <= threshold.criticalMin) return true;
      if (threshold.warningMax !== undefined && num >= threshold.warningMax) return true;
      if (threshold.warningMin !== undefined && num <= threshold.warningMin) return true;
      return false;
    });
  }, [filteredRecords, selectedParam, threshold]);

  const handleExportCsv = () => {
    const exportData = filteredRecords.map(r => ({
      timestamp: r.timestamp,
      stationId: r.stationId,
      stationName: r.stationName,
      region: r.region,
      [selectedParam]: r[selectedParam] ?? '',
      waterTemp: r.waterTemp ?? '',
      ph: r.ph ?? '',
      dissolvedOxygen: r.dissolvedOxygen ?? '',
      turbidity: r.turbidity ?? '',
      conductivity: r.conductivity ?? '',
      nitrate: r.nitrate ?? ''
    }));

    const csvContent = exportToCsv(exportData);
    triggerFileDownload(csvContent, `ecosense_water_${selectedParam}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (availableWaterParams.length === 0) {
    return (
      <div className="p-8 text-center bg-[#FFFEF9] border border-[#D9DCCF] rounded-md m-4">
        <Droplets className="w-12 h-12 text-[#477D92] mx-auto mb-3 opacity-60" />
        <h3 className="font-heading text-2xl font-bold text-[#24352D]">No Hydrological Parameters Detected</h3>
        <p className="text-xs text-[#68756B] max-w-md mx-auto mt-2">
          The currently loaded dataset does not include mapped water chemistry fields (pH, Dissolved Oxygen, Turbidity, Conductivity, Nitrate, Water Temp).
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 03</span>
            <span>·</span>
            <span>Hydrological Telemetry</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <Droplets className="w-8 h-8 text-[#477D92]" />
            Water Quality Intelligence
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Aquatic ecosystem health parameters evaluated against USGS National Benchmarks and EPA Aquatic Life Criteria.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-3 py-1.5 bg-[#FFFEF9] border border-[#D9DCCF] hover:bg-[#E5EBDD] text-xs font-mono font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer text-[#24352D]"
        >
          <Download className="w-3.5 h-3.5 text-[#477D92]" /> Export Filtered Water CSV
        </button>
      </div>

      {/* Parameter Selector & Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FFFEF9] p-3 border border-[#D9DCCF] rounded-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {availableWaterParams.map(param => {
            const isSelected = selectedParam === param;
            const paramDef = METRIC_THRESHOLDS[param as string];
            return (
              <button
                key={param}
                onClick={() => setSelectedParam(param)}
                className={`px-3 py-1.5 rounded-xs text-xs font-mono font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#477D92] text-[#FFFEF9] font-bold shadow-2xs'
                    : 'bg-[#F3F1E8] text-[#24352D] hover:bg-[#E5EBDD]'
                }`}
              >
                {paramDef?.label || param}
              </button>
            );
          })}
        </div>

        <div className="flex items-center border border-[#D9DCCF] rounded-xs overflow-hidden text-xs font-mono">
          <button
            onClick={() => setChartMode('timeSeries')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              chartMode === 'timeSeries' ? 'bg-[#477D92] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B]'
            }`}
          >
            Chronology Series
          </button>
          <button
            onClick={() => setChartMode('distribution')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              chartMode === 'distribution' ? 'bg-[#477D92] text-white font-semibold' : 'bg-[#FFFEF9] text-[#68756B]'
            }`}
          >
            Distribution Histogram
          </button>
        </div>
      </div>

      {/* Summary Statistics Instrument Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Average</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            {stats.mean}
            <span className="text-xs font-normal text-[#68756B] ml-1">{threshold?.unit}</span>
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Arithmetic Mean</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Median (P50)</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            {stats.median}
            <span className="text-xs font-normal text-[#68756B] ml-1">{threshold?.unit}</span>
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Typical Center</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Range Span</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            {stats.min} – {stats.max}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Observed Min/Max</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Std Deviation</div>
          <div className="text-xl font-mono font-bold text-[#24352D] mt-0.5">
            ±{stats.stdDev}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Spread Factor</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Out-of-Range Count</div>
          <div className={`text-xl font-mono font-bold mt-0.5 ${outOfRangeRecords.length > 0 ? 'text-[#C77938]' : 'text-[#315C45]'}`}>
            {outOfRangeRecords.length}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">Outside Benchmarks</div>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs">
          <div className="text-[10px] font-mono uppercase text-[#68756B]">Missing Readings</div>
          <div className="text-xl font-mono font-bold text-[#68756B] mt-0.5">
            {stats.missingCount}
          </div>
          <div className="text-[10px] font-mono text-[#68756B] mt-1">
            {stats.count > 0 ? ((stats.missingCount / stats.count) * 100).toFixed(1) : 0}% Gaps
          </div>
        </div>
      </div>

      {/* Main Hydrological Visualization */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9DCCF] pb-3 mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-[#82966B] font-semibold">
              {chartMode === 'timeSeries' ? 'Hydrological Time Chronology' : 'Observation Density Histogram'}
            </span>
            <h3 className="font-heading text-2xl font-bold text-[#24352D]">
              {threshold?.label} ({threshold?.unit})
            </h3>
          </div>
          <div className="text-xs font-mono text-[#68756B]">
            Benchmarked against {threshold?.sourceStandard}
          </div>
        </div>

        {chartMode === 'timeSeries' ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
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
                  unit={` ${threshold?.unit}`}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs shadow-md text-xs font-mono">
                          <div className="text-[#477D92] font-semibold mb-1">
                            {data.timestamp.slice(0, 10)} UTC
                          </div>
                          <div className="text-sm font-bold text-[#24352D]">
                            Daily Mean: {data.mean} {threshold?.unit}
                          </div>
                          <div className="text-[11px] text-[#68756B] mt-1">
                            Min: {data.min} · Max: {data.max}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Benchmark Reference lines */}
                {threshold?.advisoryMin && (
                  <ReferenceLine
                    y={threshold.advisoryMin}
                    stroke="#477D92"
                    strokeDasharray="4 4"
                    label={{ value: `Lower Benchmark (${threshold.advisoryMin})`, fill: '#477D92', fontSize: 10, position: 'right' }}
                  />
                )}
                {threshold?.advisoryMax && (
                  <ReferenceLine
                    y={threshold.advisoryMax}
                    stroke="#82966B"
                    strokeDasharray="4 4"
                    label={{ value: `Upper Benchmark (${threshold.advisoryMax})`, fill: '#82966B', fontSize: 10, position: 'right' }}
                  />
                )}
                {threshold?.criticalMin && (
                  <ReferenceLine
                    y={threshold.criticalMin}
                    stroke="#B64D43"
                    strokeDasharray="3 3"
                    label={{ value: `Critical Hypoxia (${threshold.criticalMin})`, fill: '#B64D43', fontSize: 10, position: 'right' }}
                  />
                )}
                {threshold?.criticalMax && (
                  <ReferenceLine
                    y={threshold.criticalMax}
                    stroke="#B64D43"
                    strokeDasharray="3 3"
                    label={{ value: `Critical Limit (${threshold.criticalMax})`, fill: '#B64D43', fontSize: 10, position: 'right' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="mean"
                  stroke="#477D92"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: '#477D92' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* Distribution Histogram */
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D9DCCF" vertical={false} />
                <XAxis
                  dataKey="binLabel"
                  stroke="#68756B"
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                  dy={6}
                />
                <YAxis
                  stroke="#68756B"
                  fontSize={10}
                  fontFamily="IBM Plex Mono"
                  unit=" obs"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-3 rounded-xs shadow-md text-xs font-mono">
                          <div className="font-semibold text-[#477D92] mb-1">Range: {data.binLabel} {threshold?.unit}</div>
                          <div className="text-sm font-bold text-[#24352D]">{data.count} observations</div>
                          <div className="text-[11px] text-[#68756B] mt-0.5">{data.percentage}% of valid samples</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#477D92" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Two Column: Scientific Meaning & Out-of-Range Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scientific Glossary & Ecological Impact */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-[#D9DCCF] pb-3 mb-4">
            <Info className="w-4 h-4 text-[#477D92]" />
            <h3 className="font-heading text-xl font-bold text-[#24352D]">
              Ecological & Chemical Meaning: {glossaryItem?.name || threshold?.label}
            </h3>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-[#24352D]">
            <div>
              <div className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">Scientific Description</div>
              <p className="mt-0.5 text-[#68756B]">
                {glossaryItem?.explanation || threshold?.description}
              </p>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">Typical Natural Baseline</div>
              <p className="mt-0.5 font-mono text-[11px] text-[#24352D]">
                {glossaryItem?.typicalRange || 'Varies by altitude and catchment geology.'}
              </p>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">Ecological & Biotic Impact</div>
              <p className="mt-0.5 text-[#68756B]">
                {glossaryItem?.ecologicalImpact || 'Directly influences benthic macroinvertebrates and fish spawning habitats.'}
              </p>
            </div>

            {/* Honest Reporting Disclaimer */}
            <div className="p-3 bg-[#E5EBDD]/60 border border-[#D9DCCF] rounded-xs mt-4 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-[#82966B] shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#68756B]">
                <strong>Scientific Attribution Requirement:</strong> In strict accordance with USGS guidelines, the observatory never classifies water as categorically "safe" or "unsafe" based solely on isolated sensor readings. Biological potability requires certified microbiological analysis.
              </div>
            </div>
          </div>
        </div>

        {/* Out-of-Range Observation Log */}
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C77938]" />
                <h3 className="font-heading text-xl font-bold text-[#24352D]">
                  Benchmark Exceedances
                </h3>
              </div>
              <span className="text-xs font-mono text-[#68756B]">
                {outOfRangeRecords.length} Flagged
              </span>
            </div>

            <p className="text-xs text-[#68756B] mb-3">
              Observations exceeding standard reference thresholds for {threshold?.label}.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {outOfRangeRecords.slice(0, 6).map(r => (
                <div
                  key={r.id}
                  className="p-2.5 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/40 text-xs flex items-center justify-between font-mono"
                >
                  <div>
                    <div className="font-semibold text-[#24352D]">
                      {r.stationName}
                    </div>
                    <div className="text-[10px] text-[#68756B]">
                      {r.timestamp.slice(0, 16).replace('T', ' ')} UTC
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#C77938]">
                      {r[selectedParam]} {threshold?.unit}
                    </span>
                    <div className="text-[10px] text-[#68756B]">
                      Benchmark: {threshold?.advisoryMin ?? threshold?.advisoryMax} {threshold?.unit}
                    </div>
                  </div>
                </div>
              ))}

              {outOfRangeRecords.length === 0 && (
                <div className="text-center py-8 text-xs text-[#68756B]">
                  <CheckCircle2 className="w-8 h-8 text-[#315C45] mx-auto mb-2 opacity-80" />
                  All observed measurements for {threshold?.label} remain within configured benchmark limits.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-[#D9DCCF] text-[11px] text-[#68756B] flex justify-between">
            <span>Evaluated against {threshold?.sourceStandard}</span>
            <span>Total valid: {stats.validCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
