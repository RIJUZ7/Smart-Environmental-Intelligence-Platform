import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Download,
  Copy,
  Printer,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';
import { calculateSummaryStatistics, triggerFileDownload } from '../utils/dataProcessing';
import { generateDeterministicFieldReport } from '../utils/reportGenerator';

export const ReportsView: React.FC = () => {
  const {
    activeDataset,
    filteredRecords,
    filteredAnomalies,
    selectedStationId,
    dateRange,
    serverStatus
  } = useObservatory();

  const [reportType, setReportType] = useState<string>('executive_field_summary');
  const [customInquiry, setCustomInquiry] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [generationMeta, setGenerationMeta] = useState<{
    timestamp: string;
    model: string;
    datasetId: string;
    datasetTitle: string;
    station: string;
    dateRange: { start: string; end: string };
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Stale detection
  const isReportStale = Boolean(
    generationMeta && (
      generationMeta.datasetId !== activeDataset.id ||
      generationMeta.station !== selectedStationId ||
      generationMeta.dateRange.start !== dateRange.start ||
      generationMeta.dateRange.end !== dateRange.end
    )
  );

  // Generate Report Handler
  const handleGenerateReport = async () => {
    if (filteredRecords.length === 0) {
      setErrorMessage('Cannot generate scientific report: active dataset filter contains zero observation records.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    // Calculate real factual summary statistics to pass to the model
    const pm25Stats = calculateSummaryStatistics(filteredRecords, 'pm25');
    const pm10Stats = calculateSummaryStatistics(filteredRecords, 'pm10');
    const phStats = calculateSummaryStatistics(filteredRecords, 'ph');
    const doStats = calculateSummaryStatistics(filteredRecords, 'dissolvedOxygen');
    const turbidityStats = calculateSummaryStatistics(filteredRecords, 'turbidity');
    const tempStats = calculateSummaryStatistics(filteredRecords, 'temperature');
    const rainStats = calculateSummaryStatistics(filteredRecords, 'precipitation');

    const summaryStatsPayload = {
      pm25: { mean: pm25Stats.mean, median: pm25Stats.median, min: pm25Stats.min, max: pm25Stats.max, unit: 'µg/m³', validSamples: pm25Stats.validCount },
      pm10: { mean: pm10Stats.mean, median: pm10Stats.median, min: pm10Stats.min, max: pm10Stats.max, unit: 'µg/m³', validSamples: pm10Stats.validCount },
      ph: { mean: phStats.mean, median: phStats.median, min: phStats.min, max: phStats.max, unit: 'pH', validSamples: phStats.validCount },
      dissolvedOxygen: { mean: doStats.mean, median: doStats.median, min: doStats.min, max: doStats.max, unit: 'mg/L', validSamples: doStats.validCount },
      turbidity: { mean: turbidityStats.mean, median: turbidityStats.median, min: turbidityStats.min, max: turbidityStats.max, unit: 'NTU', validSamples: turbidityStats.validCount },
      temperature: { mean: tempStats.mean, median: tempStats.median, min: tempStats.min, max: tempStats.max, unit: '°C', validSamples: tempStats.validCount },
      precipitation: { max: rainStats.max, validSamples: rainStats.validCount, unit: 'mm' }
    };

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          datasetMeta: activeDataset,
          summaryStats: summaryStatsPayload,
          anomalies: filteredAnomalies,
          dateRange,
          selectedStation: selectedStationId === 'ALL' ? 'All Transect Stations' : selectedStationId,
          customPrompt: customInquiry.trim() || undefined
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      setGeneratedReport(data.reportMarkdown);
      setGenerationMeta({
        timestamp: data.generatedAt,
        model: data.modelUsed,
        datasetId: activeDataset.id,
        datasetTitle: activeDataset.title,
        station: selectedStationId,
        dateRange: { ...dateRange }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown generation failure';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFallbackReport = () => {
    if (filteredRecords.length === 0) {
      setErrorMessage('Cannot generate scientific report: active dataset filter contains zero observation records.');
      return;
    }
    const reportText = generateDeterministicFieldReport({
      reportType,
      datasetMeta: activeDataset,
      records: filteredRecords,
      anomalies: filteredAnomalies,
      dateRange,
      selectedStation: selectedStationId === 'ALL' ? 'All Transect Stations' : selectedStationId,
      customPrompt: customInquiry.trim() || undefined
    });
    setGeneratedReport(reportText);
    setGenerationMeta({
      timestamp: new Date().toISOString(),
      model: 'Deterministic Scientific Engine (Offline Fallback)',
      datasetId: activeDataset.id,
      datasetTitle: activeDataset.title,
      station: selectedStationId,
      dateRange: { ...dateRange }
    });
    setErrorMessage(null);
  };

  const handleCopy = () => {
    if (!generatedReport) return;
    navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!generatedReport) return;
    const filename = `ecosense_field_report_${reportType}_${new Date().toISOString().slice(0, 10)}.md`;
    triggerFileDownload(generatedReport, filename, 'text/markdown;charset=utf-8;');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 07</span>
            <span>·</span>
            <span>Evidence-Based Synthesis</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-8 h-8 text-[#315C45]" />
            AI-Assisted Environmental Reports
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Server-side Gemini engine transforming observed time series, factual statistics, and anomalies into objective Field Reports.
          </p>
        </div>

        {/* Server Status Indicator */}
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-xs border ${
            serverStatus.hasGeminiKey
              ? 'bg-[#315C45]/10 text-[#315C45] border-[#315C45]/30'
              : 'bg-[#C77938]/10 text-[#C77938] border-[#C77938]/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${serverStatus.hasGeminiKey ? 'bg-[#315C45]' : 'bg-[#C77938]'}`} />
            {serverStatus.hasGeminiKey ? 'Gemini 3.8 Flash Online' : 'Gemini Key Not Attached'}
          </span>
        </div>
      </div>

      {/* Report Configuration & Generator Panel */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#24352D]">
            Report Configuration & Synthesis Parameters
          </h3>
          <span className="text-xs font-mono text-[#68756B]">
            Data Scope: {filteredRecords.length} records · {filteredAnomalies.length} anomalies
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div>
            <label className="font-semibold block text-[#24352D] mb-1">
              Select Scientific Report Type:
            </label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="w-full bg-[#F3F1E8] border border-[#D9DCCF] p-2.5 rounded-xs font-mono text-xs focus:border-[#315C45]"
            >
              <option value="executive_field_summary">Executive Field Observatory Summary (Multi-Domain)</option>
              <option value="air_quality_brief">Air Quality & Ambient Pollutant Investigation</option>
              <option value="water_quality_brief">Hydrological & Watershed Catchment Assessment</option>
              <option value="anomaly_investigation_brief">Anomaly & Sensor Artifact Forensic Dossier</option>
              <option value="data_quality_audit">Observatory Telemetry & Data Quality Audit</option>
            </select>
          </div>

          <div>
            <label className="font-semibold block text-[#24352D] mb-1">
              Optional Analyst Focus / Target Questions:
            </label>
            <input
              type="text"
              placeholder="E.g., Highlight correlations between precipitation pulses and stream turbidity spikes..."
              value={customInquiry}
              onChange={e => setCustomInquiry(e.target.value)}
              className="w-full bg-[#F3F1E8] border border-[#D9DCCF] p-2.5 rounded-xs text-xs focus:border-[#315C45]"
            />
          </div>
        </div>

        {/* Generate Button Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#D9DCCF]">
          <div className="text-[11px] text-[#68756B] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#82966B]" />
            Reports are constrained to actual measurements and never invent unobserved values.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateFallbackReport}
              disabled={isGenerating}
              className="px-3.5 py-2 border border-[#82966B] bg-[#FFFEF9] hover:bg-[#E5EBDD] text-[#315C45] text-xs font-semibold rounded-xs transition-colors cursor-pointer"
              title="Generate factual report using local deterministic synthesis rules"
            >
              Generate Local Synthesis (Rule-Based)
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="px-5 py-2 bg-[#315C45] hover:bg-[#24352D] disabled:opacity-50 text-white text-xs font-bold rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Synthesizing Field Report with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Gemini AI Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error State if Gemini is not configured */}
      {errorMessage && (
        <div className="bg-[#B64D43]/10 border border-[#B64D43]/40 p-4 rounded-xs text-xs text-[#24352D] space-y-3">
          <div className="flex items-center gap-2 font-bold text-[#B64D43]">
            <AlertTriangle className="w-4 h-4" />
            AI Report Generation Notice
          </div>
          <p>{errorMessage}</p>
          <div className="p-2.5 bg-[#FFFEF9] border border-[#D9DCCF] rounded-xs font-mono text-[11px] text-[#68756B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Offline or secret unconfigured? You can run the deterministic scientific synthesis engine directly on this device.
            </span>
            <button
              onClick={handleGenerateFallbackReport}
              className="px-3 py-1 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-semibold rounded-xs transition-colors shrink-0 cursor-pointer"
            >
              Generate Local Synthesis
            </button>
          </div>
        </div>
      )}

      {/* Rendered Scientific Report Display */}
      {generatedReport && (
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-6 shadow-md space-y-5 print:border-none print:shadow-none">
          {/* Stale report warning if workspace selection shifted */}
          {isReportStale && (
            <div className="p-3 bg-[#B78A4D]/15 border border-[#B78A4D]/40 rounded-xs text-xs text-[#24352D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B78A4D] shrink-0" />
                <span>
                  <strong>Stale Report Notice:</strong> This analysis was synthesized for dataset <em>"{generationMeta?.datasetTitle}"</em> ({generationMeta?.station}) and does not reflect current active workspace filters.
                </span>
              </div>
              <button
                onClick={handleGenerateReport}
                className="px-2.5 py-1 bg-[#315C45] text-white text-[10px] font-bold rounded-2xs hover:bg-[#24352D] transition-colors shrink-0 cursor-pointer"
              >
                Regenerate for Current Scope
              </button>
            </div>
          )}

          {/* Report Top Meta Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D9DCCF] pb-4 gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#82966B] font-semibold">
                ECO-SENSE Field Observatory Report
              </span>
              <h3 className="font-heading text-2xl font-bold text-[#24352D] capitalize">
                {reportType.replace(/_/g, ' ')}
              </h3>
              <div className="text-[11px] font-mono text-[#68756B] mt-0.5">
                Generated: {generationMeta?.timestamp ? new Date(generationMeta.timestamp).toUTCString() : 'Just now'} · Engine: {generationMeta?.model}
              </div>
            </div>

            {/* Action Buttons: Copy, Download, Print */}
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 bg-[#F3F1E8] hover:bg-[#E5EBDD] border border-[#D9DCCF] text-xs font-mono rounded-xs transition-colors flex items-center gap-1.5 text-[#24352D] cursor-pointer"
                title="Copy markdown content to clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-[#315C45]" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="px-2.5 py-1.5 bg-[#F3F1E8] hover:bg-[#E5EBDD] border border-[#D9DCCF] text-xs font-mono rounded-xs transition-colors flex items-center gap-1.5 text-[#24352D] cursor-pointer"
                title="Download report as Markdown file"
              >
                <Download className="w-3.5 h-3.5 text-[#315C45]" />
                Markdown
              </button>
              <button
                onClick={handlePrint}
                className="px-2.5 py-1.5 bg-[#F3F1E8] hover:bg-[#E5EBDD] border border-[#D9DCCF] text-xs font-mono rounded-xs transition-colors flex items-center gap-1.5 text-[#24352D] cursor-pointer"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5 text-[#315C45]" />
                Print / PDF
              </button>
            </div>
          </div>

          {/* Report Markdown Content */}
          <div className="prose prose-sm max-w-none text-[#24352D] font-sans leading-relaxed space-y-4">
            {generatedReport.split('\n\n').map((paragraph, idx) => {
              // Simple markdown header formatting
              if (paragraph.startsWith('# ')) {
                return (
                  <h1 key={idx} className="font-heading text-2xl font-bold text-[#24352D] border-b border-[#D9DCCF] pb-1 mt-6">
                    {paragraph.replace('# ', '')}
                  </h1>
                );
              }
              if (paragraph.startsWith('## ')) {
                return (
                  <h2 key={idx} className="font-heading text-xl font-bold text-[#315C45] mt-5">
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              }
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={idx} className="font-heading text-base font-semibold text-[#24352D] mt-4">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                const items = paragraph.split('\n');
                return (
                  <ul key={idx} className="list-disc pl-5 space-y-1 text-xs text-[#24352D]">
                    {items.map((it, iIdx) => (
                      <li key={iIdx}>{it.replace(/^[-*]\s+/, '')}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-xs text-[#24352D] leading-relaxed">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Mandatory Peer Review Disclaimer Note */}
          <div className="mt-6 pt-4 border-t border-[#D9DCCF] p-3 bg-[#F3F1E8] rounded-xs flex items-start gap-2.5 text-[11px] text-[#68756B]">
            <ShieldAlert className="w-4 h-4 text-[#82966B] shrink-0 mt-0.5" />
            <div>
              <strong>Scientific Protocol Disclaimer:</strong> This interpretation was generated algorithmically from observed time series data using Google Gemini. It is intended to assist environmental researchers and field analysts. All conclusions, potential causes, and action recommendations require verification and human peer review.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
