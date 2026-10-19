import React, { useState } from 'react';
import { MapPin, Navigation, Mountain, Layers, AlertTriangle, CheckCircle, ExternalLink, Shield } from 'lucide-react';
import { MonitoringStation, EnvironmentalRecord, AnomalyRecord } from '../../types/environmental';

interface StationMapProps {
  stations: MonitoringStation[];
  records: EnvironmentalRecord[];
  anomalies: AnomalyRecord[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
}

export const StationMap: React.FC<StationMapProps> = ({
  stations,
  records,
  anomalies,
  selectedStationId,
  onSelectStation
}) => {
  const [activeLayer, setActiveLayer] = useState<'topography' | 'satellite_style' | 'coordinate_grid'>('topography');
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);

  // Filter stations that have valid coordinates
  const validCoordinateStations = stations.filter(s => s.latitude !== null && s.longitude !== null);
  const unmappedStations = stations.filter(s => s.latitude === null || s.longitude === null);

  // Compute bounding box for projection
  const lats = validCoordinateStations.map(s => s.latitude as number);
  const lngs = validCoordinateStations.map(s => s.longitude as number);

  const minLat = lats.length > 0 ? Math.min(...lats) - 0.4 : 45.0;
  const maxLat = lats.length > 0 ? Math.max(...lats) + 0.4 : 48.0;
  const minLng = lngs.length > 0 ? Math.min(...lngs) - 0.5 : -124.0;
  const maxLng = lngs.length > 0 ? Math.max(...lngs) + 0.5 : -121.0;

  // Convert lat/lng to SVG viewbox percentages [80, 80] to [720, 360]
  const projectX = (lng: number) => {
    const norm = (lng - minLng) / (maxLng - minLng || 1);
    return 60 + norm * 680;
  };

  const projectY = (lat: number) => {
    // Invert Y because latitude goes South -> North
    const norm = (maxLat - lat) / (maxLat - minLat || 1);
    return 40 + norm * 320;
  };

  // Find latest observation and anomaly count for each station
  const stationStats = stations.map(station => {
    const stRecords = records.filter(r => r.stationId === station.id);
    const stAnomalies = anomalies.filter(a => a.stationId === station.id && !a.acknowledged);
    const criticalCount = stAnomalies.filter(a => a.severity === 'critical').length;
    const warningCount = stAnomalies.filter(a => a.severity === 'warning').length;

    // Latest record
    const latest = stRecords.length > 0
      ? [...stRecords].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      : null;

    return {
      station,
      latest,
      totalRecords: stRecords.length,
      anomaliesCount: stAnomalies.length,
      criticalCount,
      warningCount
    };
  });

  const selectedStats = stationStats.find(s => s.station.id === selectedStationId);

  return (
    <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md overflow-hidden text-[#24352D]">
      {/* Map Control Bar */}
      <div className="bg-[#E5EBDD]/50 border-b border-[#D9DCCF] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#315C45]" />
          <span className="font-heading text-lg font-bold tracking-wide uppercase text-[#24352D]">
            Geographic Monitoring Transect
          </span>
          <span className="text-[11px] font-mono bg-[#FFFEF9] border border-[#D9DCCF] px-2 py-0.5 rounded-xs text-[#68756B]">
            {validCoordinateStations.length} Mapped Station(s)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border border-[#D9DCCF] rounded-xs bg-[#FFFEF9] text-xs overflow-hidden">
            <button
              onClick={() => setActiveLayer('topography')}
              className={`px-2.5 py-1 flex items-center gap-1 font-medium transition-colors ${
                activeLayer === 'topography' ? 'bg-[#315C45] text-white' : 'text-[#68756B] hover:text-[#24352D]'
              }`}
            >
              <Layers className="w-3 h-3" /> Field Topo
            </button>
            <button
              onClick={() => setActiveLayer('coordinate_grid')}
              className={`px-2.5 py-1 flex items-center gap-1 font-medium transition-colors ${
                activeLayer === 'coordinate_grid' ? 'bg-[#315C45] text-white' : 'text-[#68756B] hover:text-[#24352D]'
              }`}
            >
              Grid Projection
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#68756B] hidden sm:inline">
            Datum: WGS 84 / Cartographic Projection
          </span>
        </div>
      </div>

      {/* Main Map View Area */}
      <div className="relative w-full h-80 sm:h-96 bg-[#F3F1E8] overflow-hidden border-b border-[#D9DCCF] select-none">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Geographic Station Map"
        >
          {/* Subtle Cartographic Grid Lines */}
          <defs>
            <pattern id="cartoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D9DCCF" strokeWidth="0.75" strokeDasharray="2 3" />
            </pattern>
            {/* Topographic Elevation Contour simulation */}
            <radialGradient id="highlandGrad" cx="70%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#82966B" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#82966B" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#F3F1E8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="waterGrad" cx="20%" cy="70%" r="40%">
              <stop offset="0%" stopColor="#477D92" stopOpacity="0.22" />
              <stop offset="70%" stopColor="#477D92" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#F3F1E8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid Background */}
          <rect width="800" height="400" fill="url(#cartoGrid)" />

          {/* Topographic and Watershed zones if topography mode */}
          {activeLayer === 'topography' && (
            <>
              {/* Estuarine Waterbody Shape */}
              <ellipse cx="220" cy="180" rx="140" ry="90" fill="url(#waterGrad)" />
              {/* River corridor trace */}
              <path
                d="M 160 120 C 240 180, 360 220, 480 270 C 560 300, 680 340, 750 360"
                fill="none"
                stroke="#477D92"
                strokeWidth="2.5"
                strokeOpacity="0.4"
                strokeLinecap="round"
              />
              {/* Highland Ridge Area */}
              <circle cx="620" cy="120" r="130" fill="url(#highlandGrad)" />
              <path
                d="M 520 90 C 580 60, 660 70, 720 110"
                fill="none"
                stroke="#82966B"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.5"
              />
              <path
                d="M 550 140 C 600 110, 670 120, 730 150"
                fill="none"
                stroke="#82966B"
                strokeWidth="1.25"
                strokeDasharray="3 3"
                strokeOpacity="0.4"
              />
            </>
          )}

          {/* Coordinate Scale Indicators */}
          <text x="20" y="30" fill="#68756B" fontSize="10" fontFamily="IBM Plex Mono">
            {maxLat.toFixed(2)}°N
          </text>
          <text x="20" y="385" fill="#68756B" fontSize="10" fontFamily="IBM Plex Mono">
            {minLat.toFixed(2)}°N
          </text>
          <text x="60" y="390" fill="#68756B" fontSize="10" fontFamily="IBM Plex Mono">
            {minLng.toFixed(2)}°W
          </text>
          <text x="730" y="390" fill="#68756B" fontSize="10" fontFamily="IBM Plex Mono">
            {maxLng.toFixed(2)}°W
          </text>

          {/* Transect connectivity line between mapped stations */}
          {validCoordinateStations.length > 1 && (
            <path
              d={validCoordinateStations
                .map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${projectX(s.longitude!)} ${projectY(s.latitude!)}`)
                .join(' ')}
              fill="none"
              stroke="#B78A4D"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              opacity="0.6"
            />
          )}

          {/* Station Markers */}
          {validCoordinateStations.map(station => {
            const x = projectX(station.longitude!);
            const y = projectY(station.latitude!);
            const isSelected = selectedStationId === station.id;
            const isHovered = hoveredStationId === station.id;
            const stats = stationStats.find(s => s.station.id === station.id);
            const hasCritical = stats && stats.criticalCount > 0;
            const hasWarning = stats && stats.warningCount > 0;

            const pinColor = hasCritical ? '#B64D43' : (hasWarning ? '#C77938' : '#315C45');

            return (
              <g
                key={station.id}
                className="cursor-pointer transition-transform duration-150"
                onClick={() => onSelectStation(station.id)}
                onMouseEnter={() => setHoveredStationId(station.id)}
                onMouseLeave={() => setHoveredStationId(null)}
              >
                {/* Selection / Warning halo */}
                {(isSelected || isHovered || hasCritical) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 18 : 14}
                    fill={pinColor}
                    fillOpacity={isSelected ? 0.2 : 0.12}
                    className="animate-pulse"
                  />
                )}

                {/* Primary Anchor Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 8 : 6}
                  fill={pinColor}
                  stroke="#FFFEF9"
                  strokeWidth="2"
                />

                {/* Station ID Tag */}
                <rect
                  x={x - 45}
                  y={y - 30}
                  width="90"
                  height="18"
                  rx="2"
                  fill="#FFFEF9"
                  stroke={isSelected ? '#315C45' : '#D9DCCF'}
                  strokeWidth={isSelected ? 1.5 : 1}
                />
                <text
                  x={x}
                  y={y - 18}
                  textAnchor="middle"
                  fill="#24352D"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="IBM Plex Mono"
                >
                  {station.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Quick Legend */}
        <div className="absolute bottom-3 left-3 bg-[#FFFEF9]/90 border border-[#D9DCCF] px-3 py-1.5 rounded-xs text-[10px] font-mono text-[#68756B] flex items-center gap-3 backdrop-blur-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#315C45]"></span> Nominal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#C77938]"></span> Warning Anomaly
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#B64D43]"></span> Critical Anomaly
          </span>
          <span className="border-l border-[#D9DCCF] pl-2 text-[#24352D]">Click node to filter</span>
        </div>

        {/* Map Attribution */}
        <div className="absolute bottom-3 right-3 text-[9px] font-mono text-[#68756B] bg-[#FFFEF9]/80 px-2 py-0.5 rounded-xs border border-[#D9DCCF]">
          Map Projection: ECO-SENSE Spatial Mesh · WGS84
        </div>
      </div>

      {/* Selected Station Inspector Detail Strip */}
      <div className="p-4 bg-[#FFFEF9]">
        {selectedStats ? (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9DCCF] pb-2 mb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#82966B] font-semibold">Active Monitoring Node</span>
                <h4 className="font-heading text-xl font-bold text-[#24352D] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#315C45]" />
                  {selectedStats.station.name}
                  <span className="text-xs font-mono font-normal text-[#68756B]">({selectedStats.station.id})</span>
                </h4>
              </div>

              <div className="flex items-center gap-3 text-xs">
                {selectedStats.station.latitude !== null && (
                  <span className="font-mono text-[#68756B]">
                    Coords: {selectedStats.station.latitude.toFixed(4)}°N, {selectedStats.station.longitude?.toFixed(4)}°W
                  </span>
                )}
                {selectedStats.station.elevationMeters && (
                  <span className="font-mono text-[#68756B] flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5 text-[#82966B]" /> {selectedStats.station.elevationMeters}m MSL
                  </span>
                )}
                {selectedStationId !== 'ALL' && (
                  <button
                    onClick={() => onSelectStation('ALL')}
                    className="text-xs font-mono text-[#315C45] hover:underline"
                  >
                    Clear Filter (Show All)
                  </button>
                )}
              </div>
            </div>

            {/* Latest Readings Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              <div className="p-2 border border-[#D9DCCF] bg-[#F3F1E8]/40 rounded-xs">
                <div className="text-[10px] uppercase font-mono text-[#68756B]">PM2.5</div>
                <div className="text-base font-mono font-bold text-[#24352D]">
                  {selectedStats.latest?.pm25 !== undefined ? `${selectedStats.latest.pm25} µg/m³` : '—'}
                </div>
              </div>
              <div className="p-2 border border-[#D9DCCF] bg-[#F3F1E8]/40 rounded-xs">
                <div className="text-[10px] uppercase font-mono text-[#68756B]">Water pH</div>
                <div className="text-base font-mono font-bold text-[#24352D]">
                  {selectedStats.latest?.ph !== undefined ? selectedStats.latest.ph : '—'}
                </div>
              </div>
              <div className="p-2 border border-[#D9DCCF] bg-[#F3F1E8]/40 rounded-xs">
                <div className="text-[10px] uppercase font-mono text-[#68756B]">Dissolved O₂</div>
                <div className="text-base font-mono font-bold text-[#24352D]">
                  {selectedStats.latest?.dissolvedOxygen !== undefined ? `${selectedStats.latest.dissolvedOxygen} mg/L` : '—'}
                </div>
              </div>
              <div className="p-2 border border-[#D9DCCF] bg-[#F3F1E8]/40 rounded-xs">
                <div className="text-[10px] uppercase font-mono text-[#68756B]">Turbidity</div>
                <div className="text-base font-mono font-bold text-[#24352D]">
                  {selectedStats.latest?.turbidity !== undefined ? `${selectedStats.latest.turbidity} NTU` : '—'}
                </div>
              </div>
              <div className="p-2 border border-[#D9DCCF] bg-[#F3F1E8]/40 rounded-xs">
                <div className="text-[10px] uppercase font-mono text-[#68756B]">Temperature</div>
                <div className="text-base font-mono font-bold text-[#24352D]">
                  {selectedStats.latest?.temperature !== undefined ? `${selectedStats.latest.temperature}°C` : '—'}
                </div>
              </div>
              <div className="p-2 border border-[#D9DCCF] bg-[#F3F1E8]/40 rounded-xs">
                <div className="text-[10px] uppercase font-mono text-[#68756B]">Active Anomalies</div>
                <div className={`text-base font-mono font-bold ${selectedStats.anomaliesCount > 0 ? 'text-[#C77938]' : 'text-[#315C45]'}`}>
                  {selectedStats.anomaliesCount} {selectedStats.criticalCount > 0 && `(${selectedStats.criticalCount} crit)`}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-[#68756B]">
            <span>Click any station marker or row above to inspect specific telemetry and focal observations.</span>
            <span className="font-mono">{stations.length} Total Observatory Stations Active</span>
          </div>
        )}

        {/* Warning if any stations lack coordinates */}
        {unmappedStations.length > 0 && (
          <div className="mt-3 p-2.5 bg-[#F3F1E8] border border-[#D9DCCF] rounded-xs text-[11px] text-[#68756B] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#B78A4D]" />
              <strong>Notice:</strong> {unmappedStations.length} station(s) do not contain valid geographic coordinates in the dataset ({unmappedStations.map(s => s.name).join(', ')}).
            </span>
            <span className="text-[10px] font-mono">Coordinates were not fabricated.</span>
          </div>
        )}
      </div>
    </div>
  );
};
