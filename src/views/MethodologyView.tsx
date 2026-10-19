import React from 'react';
import {
  BookOpen,
  ShieldCheck,
  Award,
  Layers,
  Info,
  Scale,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { PARAMETER_GLOSSARY, PM25_AQI_BREAKPOINTS, METRIC_THRESHOLDS } from '../utils/environmentalStandards';

export const MethodologyView: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 08</span>
            <span>·</span>
            <span>Scientific Reference</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-8 h-8 text-[#315C45]" />
            Data Sources & Methodology
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Authoritative standards, mathematical formulations, and validation constraints governing ECO-SENSE.
          </p>
        </div>
      </div>

      {/* Core Scientific Authorities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-md shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-[#315C45] font-bold text-xs uppercase font-mono">
            <Award className="w-4 h-4" /> Air Quality Standards
          </div>
          <h4 className="font-heading text-lg font-bold text-[#24352D]">
            WHO & US EPA NAAQS
          </h4>
          <p className="text-xs text-[#68756B] leading-relaxed">
            Thresholds derived from WHO Global Air Quality Guidelines (2021) and US Code of Federal Regulations (40 CFR Part 50 & 58). All particulate concentrations adhere to standard ambient temperature and pressure (25°C, 1 atm).
          </p>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-md shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-[#477D92] font-bold text-xs uppercase font-mono">
            <Scale className="w-4 h-4" /> Hydrological Benchmarks
          </div>
          <h4 className="font-heading text-lg font-bold text-[#24352D]">
            USGS National Field Manual
          </h4>
          <p className="text-xs text-[#68756B] leading-relaxed">
            Freshwater chemistry benchmarks referenced from USGS Office of Water Quality protocols and EPA Ambient Water Quality Criteria for Dissolved Oxygen, pH, and Turbidity.
          </p>
        </div>

        <div className="bg-[#FFFEF9] border border-[#D9DCCF] p-4 rounded-md shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-[#B78A4D] font-bold text-xs uppercase font-mono">
            <Layers className="w-4 h-4" /> Surface Meteorology
          </div>
          <h4 className="font-heading text-lg font-bold text-[#24352D]">
            WMO Guide to Instruments
          </h4>
          <p className="text-xs text-[#68756B] leading-relaxed">
            Meteorological observation practices follow WMO Guide No. 8. Wind speed normalized to 10-meter standard mast height; screen-level air temperature evaluated with ventilated psychrometric shields.
          </p>
        </div>
      </div>

      {/* Mathematical Formulations Section */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-4">
        <h3 className="font-heading text-2xl font-bold text-[#24352D] border-b border-[#D9DCCF] pb-2">
          Algorithmic & Mathematical Formulations
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-[#24352D]">
          {/* Anomaly Detection Formulation */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">
              1. Statistical Outlier Detection (Tukey's Fences)
            </div>
            <p className="text-[#68756B] leading-relaxed">
              Outliers are flagged without assuming Gaussian normality by evaluating values beyond the inner interquartile fences:
            </p>
            <div className="bg-[#F3F1E8] border border-[#D9DCCF] p-3 rounded-xs font-mono text-[11px] space-y-1">
              <div>IQR = Q₃ - Q₁</div>
              <div>Lower Fence = Q₁ - 1.5 × IQR</div>
              <div>Upper Fence = Q₃ + 1.5 × IQR</div>
            </div>
            <p className="text-[11px] text-[#68756B]">
              Values outside these boundaries represent unusual deviation from the local median and are recorded as candidate anomaly events.
            </p>
          </div>

          {/* Rate of Change Formulation */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">
              2. Consecutive Step Rate-of-Change (3σ Velocity)
            </div>
            <p className="text-[#68756B] leading-relaxed">
              Sudden sensor jumps between consecutive observation intervals (t and t-1) are identified using:
            </p>
            <div className="bg-[#F3F1E8] border border-[#D9DCCF] p-3 rounded-xs font-mono text-[11px] space-y-1">
              <div>Δ = |x(t) - x(t-1)|</div>
              <div>Condition: Δ &gt; 3.0 × σ(x)</div>
            </div>
            <p className="text-[11px] text-[#68756B]">
              Prevents sensor calibration drift or optical debris fouling from contaminating baseline averages.
            </p>
          </div>

          {/* EPA AQI Formula */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">
              3. EPA Air Quality Index Linear Interpolation
            </div>
            <p className="text-[#68756B] leading-relaxed">
              In accordance with 40 CFR Part 58 Appendix G, pollutant concentration is truncated to one decimal place before piecewise interpolation:
            </p>
            <div className="bg-[#F3F1E8] border border-[#D9DCCF] p-3 rounded-xs font-mono text-[11px]">
              <div>Ip = [ (I_high - I_low) / (BP_high - BP_low) ] × (Cp - BP_low) + I_low</div>
            </div>
            <p className="text-[11px] text-[#68756B]">
              Where Cp is the truncated concentration, [BP_low, BP_high] are the standard concentration breakpoints, and [I_low, I_high] are the index range values.
            </p>
          </div>

          {/* Data Quality Scoring */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">
              4. Multi-Factor Data Quality Index (DQI)
            </div>
            <p className="text-[#68756B] leading-relaxed">
              Transparent, non-heuristic composite score reflecting dataset hygiene:
            </p>
            <div className="bg-[#F3F1E8] border border-[#D9DCCF] p-3 rounded-xs font-mono text-[11px]">
              <div>Score = 0.40(Completeness) + 0.35(Validity) + 0.15(Consistency) + 0.10(Timeliness)</div>
            </div>
            <p className="text-[11px] text-[#68756B]">
              Penalizes missing measurement slots, out-of-bounds sensor glitch spikes, duplicated packets, and transmission gaps.
            </p>
          </div>
        </div>
      </div>

      {/* Parameter Glossary */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-4">
        <h3 className="font-heading text-2xl font-bold text-[#24352D] border-b border-[#D9DCCF] pb-2">
          Observed Parameter Glossary & Environmental Impact
        </h3>

        <div className="divide-y divide-[#D9DCCF]">
          {PARAMETER_GLOSSARY.map(param => (
            <div key={param.key} className="py-4 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-2xs text-[10px] font-mono uppercase font-bold ${
                    param.domain === 'air' ? 'bg-[#315C45]/15 text-[#315C45]' : 'bg-[#477D92]/15 text-[#477D92]'
                  }`}>
                    {param.domain}
                  </span>
                  <h4 className="font-heading text-lg font-bold text-[#24352D]">
                    {param.name} ({param.unit})
                  </h4>
                </div>
                <span className="font-mono text-[11px] text-[#68756B]">
                  Standard: {param.standardReference}
                </span>
              </div>

              <p className="text-[#24352D] leading-relaxed">
                {param.explanation}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] pt-1">
                <div className="p-2 bg-[#F3F1E8]/50 border border-[#D9DCCF] rounded-xs font-mono">
                  <span className="text-[#68756B] block text-[10px]">NATURAL BASELINE RANGE:</span>
                  {param.typicalRange}
                </div>
                <div className="p-2 bg-[#F3F1E8]/50 border border-[#D9DCCF] rounded-xs">
                  <span className="text-[#68756B] block text-[10px] font-mono">ECOLOGICAL IMPACT:</span>
                  {param.ecologicalImpact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
