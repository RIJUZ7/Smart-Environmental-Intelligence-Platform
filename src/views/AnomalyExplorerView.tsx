import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Download,
  Info,
  Sliders,
  Check,
  Search,
  BookOpen,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';
import { AnomalyRecord, AnomalySeverity, AnomalyMethod } from '../types/environmental';
import { exportToCsv, triggerFileDownload } from '../utils/dataProcessing';

export const AnomalyExplorerView: React.FC = () => {
  const {
    anomalies,
    acknowledgeAnomaly,
    stations,
    selectedStationId,
    setSelectedStationId,
    anomalyConfig,
    setAnomalyConfig
  } = useObservatory();

  // Filters
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AnomalySeverity>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | AnomalyMethod>('ALL');
  const [ackFilter, setAckFilter] = useState<'ALL' | 'UNACK' | 'ACK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected anomaly for deep inspection
  const [inspectedAnomaly, setInspectedAnomaly] = useState<AnomalyRecord | null>(null);
  const [acknowledgmentNote, setAcknowledgmentNote] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Filtered anomalies
  const filteredList = useMemo(() => {
    return anomalies.filter(a => {
      if (selectedStationId !== 'ALL' && a.stationId !== selectedStationId) return false;
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (methodFilter !== 'ALL' && a.detectionMethod !== methodFilter) return false;
      if (ackFilter === 'UNACK' && a.acknowledged) return false;
      if (ackFilter === 'ACK' && !a.acknowledged) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          a.metricLabel.toLowerCase().includes(q) ||
          a.stationName.toLowerCase().includes(q) ||
          a.explanation.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [anomalies, selectedStationId, severityFilter, methodFilter, ackFilter, searchQuery]);

  // Statistics
  const counts = useMemo(() => {
    return {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length,
      warning: anomalies.filter(a => a.severity === 'warning').length,
      advisory: anomalies.filter(a => a.severity === 'advisory').length,
      unack: anomalies.filter(a => !a.acknowledged).length,
    };
  }, [anomalies]);

  // Handle Export
  const handleExportCsv = () => {
    const exportData = filteredList.map(a => ({
      id: a.id,
      timestamp: a.timestamp,
      stationId: a.stationId,
      stationName: a.stationName,
      metric: a.metric,
      metricLabel: a.metricLabel,
      observedValue: a.observedValue,
      expectedMin: a.expectedRange[0],
      expectedMax: a.expectedRange[1],
      baselineValue: a.baselineValue ?? '',
      detectionMethod: a.detectionMethod,
      severity: a.severity,
      explanation: a.explanation,
      acknowledged: a.acknowledged ? 'YES' : 'NO',
      acknowledgedAt: a.acknowledgedAt ?? '',
      notes: a.notes ?? ''
    }));

    const csvContent = exportToCsv(exportData);
    triggerFileDownload(csvContent, `ecosense_anomalies_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleAcknowledge = (anomalyId: string) => {
    acknowledgeAnomaly(anomalyId, acknowledgmentNote || 'Field verification logged by analyst');
    setAcknowledgmentNote('');
    if (inspectedAnomaly?.id === anomalyId) {
      setInspectedAnomaly(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 05</span>
            <span>·</span>
            <span>Signal Verification</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-8 h-8 text-[#C77938]" />
            Explainable Anomaly Explorer
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Deterministic detection of regulatory breaches, statistical outliers (1.5× IQR), abrupt delta shifts (3σ), and telemetry gaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setConfigModalOpen(true)}
            className="px-3 py-1.5 bg-[#FFFEF9] border border-[#D9DCCF] hover:bg-[#E5EBDD] text-xs font-mono font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer text-[#24352D]"
          >
            <Sliders className="w-3.5 h-3.5 text-[#315C45]" /> Detection Parameters
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-[#FFFEF9] border border-[#D9DCCF] hover:bg-[#E5EBDD] text-xs font-mono font-medium rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer text-[#24352D]"
          >
            <Download className="w-3.5 h-3.5 text-[#C77938]" /> Export Anomalies CSV
          </button>
        </div>
      </div>

      {/* Triage Overview Banners */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => { setSeverityFilter('ALL'); setAckFilter('ALL'); }}
          className={`p-3 border rounded-xs text-left transition-all cursor-pointer ${
            severityFilter === 'ALL' && ackFilter === 'ALL'
              ? 'bg-[#315C45] text-white border-[#315C45]'
              : 'bg-[#FFFEF9] border-[#D9DCCF] text-[#24352D] hover:bg-[#F3F1E8]'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">Total Identified</div>
          <div className="text-2xl font-mono font-bold mt-0.5">{counts.total}</div>
          <div className="text-[10px] font-mono opacity-80 mt-1">Across all metrics</div>
        </button>

        <button
          onClick={() => setSeverityFilter('critical')}
          className={`p-3 border rounded-xs text-left transition-all cursor-pointer ${
            severityFilter === 'critical'
              ? 'bg-[#B64D43] text-white border-[#B64D43]'
              : 'bg-[#FFFEF9] border-[#D9DCCF] text-[#24352D] hover:bg-[#F3F1E8]'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">Critical Breaches</div>
          <div className="text-2xl font-mono font-bold mt-0.5 text-[#B64D43] group-hover:text-white">
            <span className={severityFilter === 'critical' ? 'text-white' : 'text-[#B64D43]'}>{counts.critical}</span>
          </div>
          <div className="text-[10px] font-mono opacity-80 mt-1">Immediate review</div>
        </button>

        <button
          onClick={() => setSeverityFilter('warning')}
          className={`p-3 border rounded-xs text-left transition-all cursor-pointer ${
            severityFilter === 'warning'
              ? 'bg-[#C77938] text-white border-[#C77938]'
              : 'bg-[#FFFEF9] border-[#D9DCCF] text-[#24352D] hover:bg-[#F3F1E8]'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">Warning Signals</div>
          <div className="text-2xl font-mono font-bold mt-0.5">
            <span className={severityFilter === 'warning' ? 'text-white' : 'text-[#C77938]'}>{counts.warning}</span>
          </div>
          <div className="text-[10px] font-mono opacity-80 mt-1">Moderate deviation</div>
        </button>

        <button
          onClick={() => setSeverityFilter('advisory')}
          className={`p-3 border rounded-xs text-left transition-all cursor-pointer ${
            severityFilter === 'advisory'
              ? 'bg-[#B78A4D] text-white border-[#B78A4D]'
              : 'bg-[#FFFEF9] border-[#D9DCCF] text-[#24352D] hover:bg-[#F3F1E8]'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">Advisories / Drift</div>
          <div className="text-2xl font-mono font-bold mt-0.5">
            <span className={severityFilter === 'advisory' ? 'text-white' : 'text-[#B78A4D]'}>{counts.advisory}</span>
          </div>
          <div className="text-[10px] font-mono opacity-80 mt-1">Informational signals</div>
        </button>

        <button
          onClick={() => setAckFilter('UNACK')}
          className={`p-3 border rounded-xs text-left transition-all cursor-pointer ${
            ackFilter === 'UNACK'
              ? 'bg-[#315C45] text-white border-[#315C45]'
              : 'bg-[#FFFEF9] border-[#D9DCCF] text-[#24352D] hover:bg-[#F3F1E8]'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-80">Pending Review</div>
          <div className="text-2xl font-mono font-bold mt-0.5">
            <span className={ackFilter === 'UNACK' ? 'text-white' : 'text-[#315C45]'}>{counts.unack}</span>
          </div>
          <div className="text-[10px] font-mono opacity-80 mt-1">Unacknowledged</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFEF9] p-3 border border-[#D9DCCF] rounded-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Method Selector */}
          <div className="flex items-center gap-1.5 bg-[#F3F1E8] border border-[#D9DCCF] px-2 py-1 rounded-xs font-mono">
            <span className="text-[#68756B]">Method:</span>
            <select
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value as 'ALL' | AnomalyMethod)}
              className="bg-transparent font-medium text-[#24352D] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Methods</option>
              <option value="threshold">Threshold Limit Breach</option>
              <option value="iqr_outlier">IQR Statistical Outlier</option>
              <option value="abrupt_change">Abrupt Step Shift (3σ)</option>
              <option value="data_gap">Telemetry Data Gap</option>
              <option value="duplicate_record">Duplicate Transmission</option>
            </select>
          </div>

          {/* Review Status Selector */}
          <div className="flex items-center gap-1.5 bg-[#F3F1E8] border border-[#D9DCCF] px-2 py-1 rounded-xs font-mono">
            <span className="text-[#68756B]">Status:</span>
            <select
              value={ackFilter}
              onChange={e => setAckFilter(e.target.value as 'ALL' | 'UNACK' | 'ACK')}
              className="bg-transparent font-medium text-[#24352D] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="UNACK">Pending Review</option>
              <option value="ACK">Acknowledged</option>
            </select>
          </div>
        </div>

        {/* Text Search */}
        <div className="relative min-w-[200px] max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#68756B]" />
          <input
            type="text"
            placeholder="Search anomaly details..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F3F1E8] border border-[#D9DCCF] pl-8 pr-3 py-1 rounded-xs text-xs font-mono focus:outline-none focus:border-[#315C45]"
          />
        </div>
      </div>

      {/* Main Anomaly Records Table */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#E5EBDD]/50 border-b border-[#D9DCCF] text-[10px] font-mono uppercase text-[#68756B]">
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Station</th>
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3">Observed</th>
                <th className="py-2.5 px-3">Expected Range</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Review Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9DCCF]/60 font-mono text-[11px]">
              {filteredList.map(a => {
                const badgeColor =
                  a.severity === 'critical'
                    ? 'bg-[#B64D43]/15 text-[#B64D43] border-[#B64D43]/40'
                    : a.severity === 'warning'
                    ? 'bg-[#C77938]/15 text-[#C77938] border-[#C77938]/40'
                    : 'bg-[#B78A4D]/15 text-[#B78A4D] border-[#B78A4D]/40';

                return (
                  <tr
                    key={a.id}
                    className="hover:bg-[#F3F1E8]/70 transition-colors cursor-pointer"
                    onClick={() => setInspectedAnomaly(a)}
                  >
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[9px] uppercase font-bold border rounded-2xs ${badgeColor}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#68756B] whitespace-nowrap">
                      {a.timestamp.slice(0, 16).replace('T', ' ')}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#24352D] whitespace-nowrap">
                      {a.stationName}
                    </td>
                    <td className="py-3 px-3 font-medium text-[#24352D]">{a.metricLabel}</td>
                    <td className="py-3 px-3 font-bold text-[#24352D]">
                      {a.observedValue}
                    </td>
                    <td className="py-3 px-3 text-[#68756B]">
                      [{a.expectedRange[0]}, {a.expectedRange[1]}]
                    </td>
                    <td className="py-3 px-3 text-[#68756B]">
                      <span className="capitalize">{a.detectionMethod.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-3">
                      {a.acknowledged ? (
                        <span className="text-[#315C45] flex items-center gap-1 text-[10px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                        </span>
                      ) : (
                        <span className="text-[#C77938] text-[10px] font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      {!a.acknowledged ? (
                        <button
                          onClick={() => handleAcknowledge(a.id)}
                          className="px-2.5 py-1 bg-[#315C45] hover:bg-[#24352D] text-white text-[10px] font-semibold rounded-2xs transition-colors cursor-pointer"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <button
                          onClick={() => setInspectedAnomaly(a)}
                          className="text-[#68756B] hover:text-[#24352D] text-[10px] underline"
                        >
                          View Notes
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#68756B]">
                    No anomalies matching current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#F3F1E8]/50 border-t border-[#D9DCCF] flex items-center justify-between text-[11px] text-[#68756B]">
          <span>Showing {filteredList.length} of {anomalies.length} anomaly records</span>
          <span className="font-mono">Signal Verification Protocol active</span>
        </div>
      </div>

      {/* Anomaly Inspection Drawer / Modal */}
      {inspectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md shadow-xl max-w-xl w-full p-6 text-[#24352D] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#D9DCCF] pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">
                  Field Anomaly Investigation Dossier
                </span>
                <h3 className="font-heading text-2xl font-bold text-[#24352D]">
                  {inspectedAnomaly.metricLabel} Signal
                </h3>
              </div>
              <button
                onClick={() => setInspectedAnomaly(null)}
                className="text-[#68756B] hover:text-[#24352D] text-xs font-mono"
              >
                [ESC / Close]
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F3F1E8] border border-[#D9DCCF] rounded-xs">
                <div>
                  <span className="text-[#68756B] block text-[10px]">STATION</span>
                  <span className="font-bold text-[#24352D]">{inspectedAnomaly.stationName}</span>
                </div>
                <div>
                  <span className="text-[#68756B] block text-[10px]">TIMESTAMP (UTC)</span>
                  <span className="font-bold text-[#24352D]">{inspectedAnomaly.timestamp}</span>
                </div>
                <div>
                  <span className="text-[#68756B] block text-[10px]">OBSERVED READING</span>
                  <span className="font-bold text-base text-[#B64D43]">{inspectedAnomaly.observedValue}</span>
                </div>
                <div>
                  <span className="text-[#68756B] block text-[10px]">EXPECTED BOUNDS</span>
                  <span className="font-bold text-[#24352D]">
                    [{inspectedAnomaly.expectedRange[0]}, {inspectedAnomaly.expectedRange[1]}]
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-[#82966B] font-semibold block mb-1">
                  DETECTION METHOD & RATIONALE
                </span>
                <div className="p-3 border border-[#D9DCCF] bg-[#FFFEF9] rounded-xs font-sans text-xs text-[#24352D] leading-relaxed">
                  {inspectedAnomaly.explanation}
                </div>
              </div>

              {/* Review status or note input */}
              {inspectedAnomaly.acknowledged ? (
                <div className="p-3 bg-[#E5EBDD] border border-[#D9DCCF] rounded-xs">
                  <div className="text-[10px] text-[#315C45] font-bold uppercase mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Analyst Review Acknowledged
                  </div>
                  <div className="text-xs text-[#24352D]">
                    Notes: {inspectedAnomaly.notes || 'Acknowledged with no remarks.'}
                  </div>
                  <div className="text-[10px] text-[#68756B] mt-1">
                    Logged: {inspectedAnomaly.acknowledgedAt}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase text-[#82966B] font-semibold block">
                    ADD ANALYST FIELD ASSESSMENT / NOTES
                  </span>
                  <textarea
                    rows={3}
                    placeholder="E.g., Verified localized sensor power dip; or confirmed regional agricultural burn event..."
                    value={acknowledgmentNote}
                    onChange={e => setAcknowledgmentNote(e.target.value)}
                    className="w-full bg-[#F3F1E8] border border-[#D9DCCF] p-2 rounded-xs text-xs font-sans focus:outline-none focus:border-[#315C45]"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setInspectedAnomaly(null)}
                      className="px-3 py-1.5 border border-[#D9DCCF] text-xs rounded-xs hover:bg-[#F3F1E8]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAcknowledge(inspectedAnomaly.id)}
                      className="px-4 py-1.5 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                    >
                      Acknowledge & Record Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detection Configuration Modal */}
      {configModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md shadow-xl max-w-lg w-full p-6 text-[#24352D] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#D9DCCF] pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">
                  Statistical Detection Parameters
                </span>
                <h3 className="font-heading text-2xl font-bold text-[#24352D]">
                  Configure Anomaly Engine
                </h3>
              </div>
              <button
                onClick={() => setConfigModalOpen(false)}
                className="text-[#68756B] hover:text-[#24352D] text-xs font-mono"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div>
                <label className="font-semibold block mb-1">
                  Tukey Outlier Multiplier (IQR Fence Factor):
                  <span className="font-mono text-[#315C45] ml-2">{anomalyConfig.iqrMultiplier}×</span>
                </label>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={anomalyConfig.iqrMultiplier}
                  onChange={e => setAnomalyConfig({ ...anomalyConfig, iqrMultiplier: parseFloat(e.target.value) })}
                  className="w-full accent-[#315C45]"
                />
                <p className="text-[11px] text-[#68756B] mt-0.5">
                  Default 1.5× represents standard Tukey outlier fence [Q1 - 1.5×IQR, Q3 + 1.5×IQR]. Increase to 2.5× to capture only extreme statistical anomalies.
                </p>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Rate-of-Change Standard Deviation Factor (3σ):
                  <span className="font-mono text-[#315C45] ml-2">{anomalyConfig.rateOfChangeStdDevFactor}σ</span>
                </label>
                <input
                  type="range"
                  min="2.0"
                  max="5.0"
                  step="0.5"
                  value={anomalyConfig.rateOfChangeStdDevFactor}
                  onChange={e => setAnomalyConfig({ ...anomalyConfig, rateOfChangeStdDevFactor: parseFloat(e.target.value) })}
                  className="w-full accent-[#315C45]"
                />
                <p className="text-[11px] text-[#68756B] mt-0.5">
                  Flags consecutive step shifts exceeding N times the sample standard deviation.
                </p>
              </div>

              <div>
                <label className="font-semibold block mb-1">
                  Expected Telemetry Cadence:
                  <span className="font-mono text-[#315C45] ml-2">{anomalyConfig.expectedCadenceHours} hours</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={anomalyConfig.expectedCadenceHours}
                  onChange={e => setAnomalyConfig({ ...anomalyConfig, expectedCadenceHours: parseInt(e.target.value, 10) || 6 })}
                  className="w-24 bg-[#F3F1E8] border border-[#D9DCCF] px-2 py-1 rounded-xs font-mono"
                />
                <p className="text-[11px] text-[#68756B] mt-0.5">
                  Data gaps greater than 2× this interval trigger missing telemetry warnings.
                </p>
              </div>

              <div className="pt-3 border-t border-[#D9DCCF] flex justify-end">
                <button
                  onClick={() => setConfigModalOpen(false)}
                  className="px-4 py-1.5 bg-[#315C45] text-white rounded-xs font-semibold hover:bg-[#24352D]"
                >
                  Save & Re-evaluate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
