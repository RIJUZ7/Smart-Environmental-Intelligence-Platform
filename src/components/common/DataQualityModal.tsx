import React from 'react';
import { X, ShieldCheck, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { DatasetMetadata } from '../../types/environmental';

interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetMetadata;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({ isOpen, onClose, dataset }) => {
  if (!isOpen) return null;

  const b = dataset.qualityBreakdown;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md shadow-xl max-w-xl w-full p-6 text-[#24352D] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-[#D9DCCF] pb-3 mb-4">
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#82966B] font-semibold">
              Scientific Audit Protocol
            </span>
            <h3 className="font-heading text-2xl font-bold text-[#24352D] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#315C45]" />
              Data Quality Index Methodology
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#68756B] hover:text-[#24352D] p-1 rounded-sm hover:bg-[#E5EBDD] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score banner */}
        <div className="bg-[#E5EBDD]/60 border border-[#D9DCCF] p-4 rounded-sm mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-[#68756B] font-medium">Dataset Overall Index</div>
            <div className="text-sm font-semibold text-[#24352D] mt-0.5">{dataset.title}</div>
          </div>
          <div className="text-right">
            <span className="font-mono text-3xl font-bold text-[#315C45]">{dataset.dataQualityScore}</span>
            <span className="text-sm font-mono text-[#68756B]">/100</span>
          </div>
        </div>

        {/* Methodology explanation */}
        <div className="space-y-4 text-xs leading-relaxed text-[#24352D]">
          <p className="text-[#68756B]">
            In strict compliance with scientific validation protocols, this index is calculated using a deterministic, multi-factor scoring model. No arbitrary heuristic or black-box weighting is employed.
          </p>

          <div className="bg-[#F3F1E8] border border-[#D9DCCF] p-3 rounded-sm font-mono text-[11px]">
            <div className="text-[#315C45] font-semibold mb-1">Index Formula:</div>
            <code>Score = (0.40 × Completeness) + (0.35 × Validity) + (0.15 × Consistency) + (0.10 × Timeliness)</code>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 border border-[#D9DCCF] bg-[#FFFEF9] rounded-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#315C45]" /> Completeness
                </span>
                <span className="font-mono font-bold text-[#315C45]">{b?.completeness ?? 100}%</span>
              </div>
              <p className="text-[11px] text-[#68756B]">
                Ratio of populated observation cells against total theoretical measurement matrix slots.
              </p>
            </div>

            <div className="p-3 border border-[#D9DCCF] bg-[#FFFEF9] rounded-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#315C45]" /> Instrument Validity
                </span>
                <span className="font-mono font-bold text-[#315C45]">{b?.validity ?? 100}%</span>
              </div>
              <p className="text-[11px] text-[#68756B]">
                Percentage of recorded values conforming strictly within physical instrument sensor ranges.
              </p>
            </div>

            <div className="p-3 border border-[#D9DCCF] bg-[#FFFEF9] rounded-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#B78A4D]" /> Consistency
                </span>
                <span className="font-mono font-bold text-[#315C45]">{b?.consistency ?? 100}%</span>
              </div>
              <p className="text-[11px] text-[#68756B]">
                Penalizes duplicate observation timestamps and rapid re-transmission collisions ({dataset.duplicateRows} found).
              </p>
            </div>

            <div className="p-3 border border-[#D9DCCF] bg-[#FFFEF9] rounded-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#477D92]" /> Cadence Timeliness
                </span>
                <span className="font-mono font-bold text-[#315C45]">{b?.timeliness ?? 100}%</span>
              </div>
              <p className="text-[11px] text-[#68756B]">
                Measures regularity of observation intervals and flags periods where gaps exceed 2× nominal frequency.
              </p>
            </div>
          </div>

          <div className="border-t border-[#D9DCCF] pt-3 text-[11px] text-[#68756B] flex items-start gap-2">
            <Info className="w-4 h-4 text-[#82966B] shrink-0 mt-0.5" />
            <span>
              <strong>Scientific Limitation:</strong> A high score indicates high telemetry integrity and format compliance; it does not constitute certification of regulatory environmental compliance or biological safety.
            </span>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-[#D9DCCF] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#315C45] hover:bg-[#24352D] text-[#FFFEF9] text-xs font-medium rounded-sm transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
