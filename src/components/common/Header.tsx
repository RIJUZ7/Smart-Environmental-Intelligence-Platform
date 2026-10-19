import React, { useState } from 'react';
import {
  Menu,
  Calendar,
  Layers,
  MapPin,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { useObservatory } from '../../context/ObservatoryContext';
import { DataQualityModal } from './DataQualityModal';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const {
    activeDataset,
    availableDatasets,
    stations,
    selectedStationId,
    setSelectedStationId,
    dateRange,
    setDateRange,
    resetDateRange,
    isDemoMode,
    serverStatus
  } = useObservatory();

  const [qualityModalOpen, setQualityModalOpen] = useState(false);

  // Format date range display
  const startDateStr = dateRange.start ? dateRange.start.slice(0, 10) : '';
  const endDateStr = dateRange.end ? dateRange.end.slice(0, 10) : '';

  return (
    <header className="sticky top-0 z-30 bg-[#FFFEF9] border-b border-[#D9DCCF] text-[#24352D] px-4 py-2.5 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left side: Hamburger + Title + Provenance Tag */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-1.5 text-[#24352D] hover:bg-[#E5EBDD] rounded-xs md:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#82966B] font-semibold">
                Field Observatory
              </span>
              {/* Provenance Badge */}
              {isDemoMode ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-[#B78A4D]/15 text-[#B78A4D] border border-[#B78A4D]/30 text-[10px] font-mono font-semibold rounded-2xs">
                  <AlertTriangle className="w-3 h-3 text-[#B78A4D]" />
                  DEMO DATA — NOT LIVE MEASUREMENTS
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-[#315C45]/15 text-[#315C45] border border-[#315C45]/30 text-[10px] font-mono font-semibold rounded-2xs">
                  IMPORTED TELEMETRY
                </span>
              )}
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#24352D] flex items-center gap-2">
              {activeDataset.title}
            </h1>
          </div>
        </div>

        {/* Right side: Station Selector + Date Range + Data Quality Badge + AI Status */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Station Selector */}
          <div className="flex items-center gap-1 bg-[#F3F1E8] border border-[#D9DCCF] px-2 py-1 rounded-xs">
            <MapPin className="w-3.5 h-3.5 text-[#68756B]" />
            <select
              value={selectedStationId}
              onChange={e => setSelectedStationId(e.target.value)}
              className="bg-transparent text-xs font-mono font-medium text-[#24352D] focus:outline-none cursor-pointer"
              aria-label="Filter by monitoring station"
            >
              <option value="ALL">All Stations ({stations.length})</option>
              {stations.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.id})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-1 bg-[#F3F1E8] border border-[#D9DCCF] px-2 py-1 rounded-xs font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-[#68756B]" />
            <input
              type="date"
              value={startDateStr}
              onChange={e => setDateRange({ ...dateRange, start: `${e.target.value}T00:00:00Z` })}
              className="bg-transparent text-[#24352D] focus:outline-none cursor-pointer"
              aria-label="Start date filter"
            />
            <span className="text-[#68756B]">→</span>
            <input
              type="date"
              value={endDateStr}
              onChange={e => setDateRange({ ...dateRange, end: `${e.target.value}T23:59:59Z` })}
              className="bg-transparent text-[#24352D] focus:outline-none cursor-pointer"
              aria-label="End date filter"
            />
            <button
              onClick={resetDateRange}
              title="Reset date range to dataset bounds"
              className="ml-1 text-[#68756B] hover:text-[#315C45] p-0.5 rounded-2xs"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Data Quality Indicator (Clickable for transparent methodology) */}
          <button
            onClick={() => setQualityModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E5EBDD] hover:bg-[#D9DCCF] border border-[#D9DCCF] rounded-xs transition-colors cursor-pointer"
            title="Inspect Data Quality Scoring Methodology"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#315C45]" />
            <span className="font-mono font-bold text-[#315C45]">
              {activeDataset.dataQualityScore}/100
            </span>
            <span className="text-[10px] font-mono text-[#68756B] hidden sm:inline">QC INDEX</span>
          </button>

          {/* Server-side AI Status Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-1 border rounded-xs font-mono text-[10px] ${
              serverStatus.hasGeminiKey
                ? 'bg-[#315C45]/10 border-[#315C45]/30 text-[#315C45]'
                : 'bg-[#C77938]/10 border-[#C77938]/30 text-[#C77938]'
            }`}
            title={serverStatus.hasGeminiKey ? 'Gemini AI Analyst Server Active' : 'Gemini AI Key Not Set on Server'}
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">AI OBSERVER:</span>
            <span>{serverStatus.hasGeminiKey ? 'READY' : 'OFFLINE'}</span>
          </div>
        </div>
      </div>

      <DataQualityModal
        isOpen={qualityModalOpen}
        onClose={() => setQualityModalOpen(false)}
        dataset={activeDataset}
      />
    </header>
  );
};
