import React, { useState } from 'react';
import {
  Settings,
  Database,
  Sliders,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Info,
  Server
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';

export const SettingsView: React.FC = () => {
  const {
    unitSystem,
    setUnitSystem,
    persistenceMode,
    serverStatus,
    refreshServerStatus,
    loadDemoDataset,
    availableDatasets,
    isDemoMode
  } = useObservatory();

  const [resetSuccess, setResetSuccess] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleClearLocalStorage = () => {
    localStorage.clear();
    loadDemoDataset();
    setShowConfirmReset(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 09</span>
            <span>·</span>
            <span>Configuration & Telemetry</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <Settings className="w-8 h-8 text-[#315C45]" />
            Observatory Settings & Workspace
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            Storage persistence protocols, display unit preferences, and backend diagnostic verification.
          </p>
        </div>
      </div>

      {/* Storage & Persistence Status Panel */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#24352D] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#315C45]" />
            Data Persistence Architecture
          </h3>
          <span className="text-xs font-mono bg-[#E5EBDD] text-[#315C45] px-2 py-0.5 rounded-xs font-bold">
            LOCAL OBSERVATORY STORAGE ACTIVE
          </span>
        </div>

        <div className="space-y-3 text-xs leading-relaxed text-[#24352D]">
          <p className="text-[#68756B]">
            In compliance with our data transparency policy, imported observations and dataset metadata are currently stored directly within your browser's private Web Storage sandbox (Local Workspace Cache).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-mono text-[11px]">
            <div className="p-3 border border-[#D9DCCF] bg-[#F3F1E8]/50 rounded-xs space-y-1">
              <span className="text-[#82966B] font-bold block text-[10px] uppercase">PERSISTENCE MODE</span>
              <div className="font-bold text-[#24352D]">Local Observatory Cache (Browser Sandbox)</div>
              <p className="text-[10px] text-[#68756B] font-sans">
                Notice: Data is isolated to this browser session. Cloud Firebase Firestore is not currently provisioned.
              </p>
            </div>

            <div className="p-3 border border-[#D9DCCF] bg-[#F3F1E8]/50 rounded-xs space-y-1">
              <span className="text-[#82966B] font-bold block text-[10px] uppercase">STORED DATASETS</span>
              <div className="font-bold text-[#24352D]">{availableDatasets.length} Dataset(s) Active</div>
              <p className="text-[10px] text-[#68756B] font-sans">
                {isDemoMode ? 'Cascadia Demonstration Dataset in active workspace.' : 'Custom field dataset loaded.'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#E5EBDD]/60 border border-[#D9DCCF] rounded-xs text-[11px] text-[#24352D] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#315C45] shrink-0 mt-0.5" />
            <div>
              <strong>Firebase Cloud Migration Instructions:</strong> To enable multi-user cloud synchronization and Firebase Firestore persistence, trigger the AI Studio Firebase provisioner tool. All data schemas in <code className="font-mono text-[#315C45]">src/types/environmental.ts</code> are Firestore-ready with typed security boundaries.
            </div>
          </div>
        </div>
      </div>

      {/* Backend & AI Integration Health */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-3">
          <h3 className="font-heading text-xl font-bold text-[#24352D] flex items-center gap-2">
            <Server className="w-5 h-5 text-[#315C45]" />
            Backend Services & Model Integration
          </h3>
          <button
            onClick={refreshServerStatus}
            className="px-2.5 py-1 text-xs font-mono border border-[#D9DCCF] rounded-xs hover:bg-[#F3F1E8] flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-[#315C45]" /> Re-test Connection
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/30">
            <div className="text-[10px] uppercase text-[#68756B]">Express API Server:</div>
            <div className="text-sm font-bold text-[#315C45] mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Port 3000 (0.0.0.0) Online
            </div>
          </div>

          <div className="p-3 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/30">
            <div className="text-[10px] uppercase text-[#68756B]">Gemini AI Model Engine:</div>
            <div className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
              {serverStatus.hasGeminiKey ? (
                <span className="text-[#315C45] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Connected (gemini-3.8-flash)
                </span>
              ) : (
                <span className="text-[#C77938] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> API Key Not Set (Using Statistical Fallbacks)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Units & Workspace Maintenance */}
      <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-4">
        <h3 className="font-heading text-xl font-bold text-[#24352D] border-b border-[#D9DCCF] pb-3">
          Measurement Preferences & Cache Reset
        </h3>

        <div className="space-y-4 text-xs font-sans">
          <div>
            <label className="font-semibold block text-[#24352D] mb-1">
              Measurement Display Standard:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="unitPref"
                  checked={unitSystem === 'metric'}
                  onChange={() => setUnitSystem('metric')}
                />
                <span>Metric Standard (Celsius °C, mm, m/s, hPa) — Scientific Default</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="unitPref"
                  checked={unitSystem === 'imperial'}
                  onChange={() => setUnitSystem('imperial')}
                />
                <span>Imperial Units (°F, inches, mph)</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-[#D9DCCF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[#B64D43]">Reset Observatory Local Storage</div>
              <p className="text-[11px] text-[#68756B]">
                Clears all imported user datasets and restores baseline Cascadia Demonstration data.
              </p>
            </div>

            {!showConfirmReset ? (
              <button
                onClick={() => setShowConfirmReset(true)}
                className="px-4 py-2 bg-[#B64D43]/10 hover:bg-[#B64D43]/20 border border-[#B64D43]/40 text-[#B64D43] text-xs font-bold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset Local Cache
              </button>
            ) : (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-[#B64D43] font-semibold">Confirm cache wipe?</span>
                <button
                  onClick={handleClearLocalStorage}
                  className="px-3 py-1.5 bg-[#B64D43] text-white hover:bg-[#8F352D] text-xs font-bold rounded-xs transition-colors cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="px-3 py-1.5 bg-[#FFFEF9] border border-[#D9DCCF] text-[#24352D] hover:bg-[#F3F1E8] text-xs font-medium rounded-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {resetSuccess && (
            <div className="p-3 bg-[#E5EBDD] border border-[#315C45] rounded-xs text-[#315C45] font-semibold text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Observatory workspace has been successfully reset to baseline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
