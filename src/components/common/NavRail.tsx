import React from 'react';
import {
  Compass,
  Wind,
  Droplets,
  CloudSun,
  AlertTriangle,
  UploadCloud,
  FileText,
  BookOpen,
  Settings,
  Database,
  ExternalLink
} from 'lucide-react';
import { TopographicLogo } from './TopographicLogo';
import { NavigationSection, useObservatory } from '../../context/ObservatoryContext';

interface NavRailProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface NavItem {
  id: NavigationSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const NavRail: React.FC<NavRailProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeSection, setActiveSection, anomalies, isDemoMode } = useObservatory();

  const unacknowledgedAnomaliesCount = anomalies.filter(a => !a.acknowledged).length;

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Field Report', icon: Compass },
    { id: 'air', label: 'Air Quality', icon: Wind },
    { id: 'water', label: 'Water Quality', icon: Droplets },
    { id: 'climate', label: 'Climate & Weather', icon: CloudSun },
    {
      id: 'anomalies',
      label: 'Anomaly Explorer',
      icon: AlertTriangle,
      badge: unacknowledgedAnomaliesCount > 0 ? unacknowledgedAnomaliesCount : undefined
    },
    { id: 'import', label: 'Data Import & QC', icon: UploadCloud },
    { id: 'reports', label: 'AI Field Reports', icon: FileText },
    { id: 'methodology', label: 'Methodology & Standards', icon: BookOpen },
    { id: 'settings', label: 'Observatory Settings', icon: Settings },
  ];

  const handleNavClick = (id: NavigationSection) => {
    setActiveSection(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Persistent Left Rail */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 md:w-60 bg-[#FFFEF9] border-r border-[#D9DCCF] flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Header & Observatory Branding */}
          <div className="p-4 border-b border-[#D9DCCF] bg-[#F3F1E8]/50 flex items-center gap-3">
            <TopographicLogo size={36} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading text-xl font-bold tracking-tight text-[#24352D] leading-none">
                  ECO-SENSE
                </span>
                <span className="text-[9px] font-mono uppercase bg-[#315C45] text-[#FFFEF9] px-1 py-0.2 rounded-2xs font-semibold">
                  OBS-7
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#68756B] tracking-tight mt-0.5">
                Environmental Intelligence
              </div>
            </div>
          </div>

          {/* Dataset Status Indicator */}
          <div className="px-3 py-2 bg-[#E5EBDD]/40 border-b border-[#D9DCCF] text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-mono text-[#315C45]">
              <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-[#B78A4D]' : 'bg-[#315C45]'} animate-pulse`} />
              {isDemoMode ? 'SYNTHETIC DEMO' : 'IMPORTED FIELD'}
            </span>
            <span className="text-[10px] font-mono text-[#68756B]">CADENCE: 6H</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-0.5" aria-label="Main Navigation">
            <div className="px-3 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#82966B] font-semibold">
              Monitoring Modules
            </div>
            {navItems.slice(0, 5).map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xs text-xs font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#315C45] text-[#FFFEF9] font-semibold shadow-xs'
                      : 'text-[#24352D] hover:bg-[#E5EBDD] hover:text-[#24352D]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFFEF9]' : 'text-[#68756B]'}`} />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-[#B64D43] text-white'
                          : 'bg-[#C77938]/15 text-[#C77938] font-semibold'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="px-3 pt-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#82966B] font-semibold">
              Analysis & Telemetry
            </div>
            {navItems.slice(5).map(item => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xs text-xs font-medium transition-colors text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#315C45] text-[#FFFEF9] font-semibold shadow-xs'
                      : 'text-[#24352D] hover:bg-[#E5EBDD] hover:text-[#24352D]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FFFEF9]' : 'text-[#68756B]'}`} />
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Meta & Field Observatory Attribution */}
        <div className="p-3 border-t border-[#D9DCCF] bg-[#F3F1E8]/60 text-[11px] space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px] text-[#68756B]">
            <span>STATION LATENCY</span>
            <span className="text-[#315C45] font-semibold">42 ms</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-[#68756B]">
            <span>STORAGE</span>
            <span>Local Cache</span>
          </div>
          <div className="pt-2 border-t border-[#D9DCCF]/60 text-[10px] text-[#68756B] leading-tight">
            Field Observatory v1.0.0
            <br />
            Cascadia Ecological Transect
          </div>
        </div>
      </aside>
    </>
  );
};
