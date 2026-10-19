/**
 * ECO-SENSE — Environmental Intelligence & Climate Analytics Platform
 * Portfolio Project 07: Field Observatory Architecture
 */

import React, { useState } from 'react';
import { ObservatoryProvider, useObservatory } from './context/ObservatoryContext';
import { NavRail } from './components/common/NavRail';
import { Header } from './components/common/Header';

import { OverviewView } from './views/OverviewView';
import { AirQualityView } from './views/AirQualityView';
import { WaterQualityView } from './views/WaterQualityView';
import { ClimateView } from './views/ClimateView';
import { AnomalyExplorerView } from './views/AnomalyExplorerView';
import { ImportView } from './views/ImportView';
import { ReportsView } from './views/ReportsView';
import { MethodologyView } from './views/MethodologyView';
import { SettingsView } from './views/SettingsView';

const ObservatoryApp: React.FC = () => {
  const { activeSection } = useObservatory();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F3F1E8] text-[#24352D] flex flex-col md:flex-row font-body">
      {/* Left Navigation Rail */}
      <NavRail mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} />

      {/* Main Workspace Frame */}
      <div className="flex-1 md:pl-60 flex flex-col min-h-screen">
        {/* Persistent Observatory Header */}
        <Header onMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />

        {/* Dynamic Viewport Section */}
        <main className="flex-1 max-w-7xl w-full mx-auto pb-16">
          {activeSection === 'overview' && <OverviewView />}
          {activeSection === 'air' && <AirQualityView />}
          {activeSection === 'water' && <WaterQualityView />}
          {activeSection === 'climate' && <ClimateView />}
          {activeSection === 'anomalies' && <AnomalyExplorerView />}
          {activeSection === 'import' && <ImportView />}
          {activeSection === 'reports' && <ReportsView />}
          {activeSection === 'methodology' && <MethodologyView />}
          {activeSection === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ObservatoryProvider>
      <ObservatoryApp />
    </ObservatoryProvider>
  );
}
