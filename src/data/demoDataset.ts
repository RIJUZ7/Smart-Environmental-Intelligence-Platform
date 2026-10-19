/**
 * ECO-SENSE Deterministic Synthetic Demonstration Dataset
 *
 * NOTICE:
 * DEMO DATA — NOT LIVE MEASUREMENTS.
 * Synthetic environmental observations designed for algorithm verification,
 * interface demonstration, and anomaly detection testing.
 */

import { EnvironmentalRecord, MonitoringStation, DatasetMetadata } from '../types/environmental';
import { calculateDatasetQualityScore } from '../utils/environmentalStandards';

export const DEMO_STATIONS: MonitoringStation[] = [
  {
    id: 'STA-FOREST-01',
    name: 'Pine Ridge Mountain Observatory',
    region: 'Cascadia Highland Basin',
    latitude: 47.3821,
    longitude: -121.8492,
    elevationMeters: 1140,
    environmentType: 'highland_forest',
    activeParameters: ['pm25', 'pm10', 'o3', 'ph', 'dissolvedOxygen', 'turbidity', 'temperature', 'humidity', 'precipitation', 'windSpeed'],
    totalObservations: 120,
    firstObservation: '2026-09-01T00:00:00Z',
    lastObservation: '2026-09-30T18:00:00Z',
  },
  {
    id: 'STA-VALLEY-02',
    name: 'Verdant River Valley Station',
    region: 'Willamette Agricultural Corridor',
    latitude: 45.1294,
    longitude: -123.0315,
    elevationMeters: 68,
    environmentType: 'river_valley',
    activeParameters: ['pm25', 'pm10', 'no2', 'ph', 'dissolvedOxygen', 'turbidity', 'conductivity', 'waterTemp', 'nitrate', 'temperature', 'humidity', 'precipitation'],
    totalObservations: 120,
    firstObservation: '2026-09-01T00:00:00Z',
    lastObservation: '2026-09-30T18:00:00Z',
  },
  {
    id: 'STA-URBAN-03',
    name: 'Harbor Industrial Basin',
    region: 'Puget Sound Estuary',
    latitude: 47.5684,
    longitude: -122.3582,
    elevationMeters: 12,
    environmentType: 'urban_basin',
    activeParameters: ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'conductivity', 'waterTemp', 'temperature', 'humidity', 'windSpeed', 'pressure'],
    totalObservations: 120,
    firstObservation: '2026-09-01T00:00:00Z',
    lastObservation: '2026-09-30T18:00:00Z',
  }
];

/**
 * Deterministic pseudo-random number generator for reproducible synthetic physics
 */
function seededSin(seed: number): number {
  const x = Math.sin(seed * 9999.123) * 10000;
  return x - Math.floor(x);
}

export function generateDeterministicDemoData(): EnvironmentalRecord[] {
  const records: EnvironmentalRecord[] = [];
  const baseTime = new Date('2026-09-01T00:00:00Z').getTime();
  const stepMs = 6 * 3600 * 1000; // 6-hour interval: 00:00, 06:00, 12:00, 18:00 (120 points per station = 360 observations)
  const totalSteps = 120;

  for (let step = 0; step < totalSteps; step++) {
    const timeMs = baseTime + step * stepMs;
    const isoTime = new Date(timeMs).toISOString();
    const day = Math.floor(step / 4) + 1;
    const hour = (step % 4) * 6;
    const diurnalCycle = Math.sin((hour - 8) * (Math.PI / 12)); // peaks around 14:00

    // Station 1: Pine Ridge Highland (Baseline clean mountain)
    // Documented Anomaly 1: Days 12-14 Wildfire smoke layer blown upvalley
    const isForestSmoke = day >= 12 && day <= 14;
    const forestPM25Base = isForestSmoke ? 48.0 + (step % 5) * 8.5 : 4.5 + seededSin(step * 1.1) * 3.2;
    const forestPM10Base = isForestSmoke ? 88.0 + (step % 5) * 14.0 : 9.0 + seededSin(step * 1.3) * 6.0;

    records.push({
      id: `rec-forest-${step}`,
      timestamp: isoTime,
      stationId: 'STA-FOREST-01',
      stationName: 'Pine Ridge Mountain Observatory',
      region: 'Cascadia Highland Basin',
      latitude: 47.3821,
      longitude: -121.8492,
      elevationMeters: 1140,
      pm25: Number(forestPM25Base.toFixed(1)),
      pm10: Number(forestPM10Base.toFixed(1)),
      o3: Number((32 + diurnalCycle * 14 + seededSin(step * 1.7) * 4).toFixed(1)),
      ph: Number((7.35 + seededSin(step * 2.1) * 0.25).toFixed(2)),
      dissolvedOxygen: Number((9.8 - (diurnalCycle * 0.6) + seededSin(step * 2.3) * 0.3).toFixed(1)),
      turbidity: Number((1.2 + seededSin(step * 2.7) * 0.6).toFixed(1)),
      temperature: Number((14.0 + diurnalCycle * 7.5 - day * 0.15 + seededSin(step * 3.1) * 1.5).toFixed(1)),
      humidity: Number(Math.max(25, Math.min(98, 62 - diurnalCycle * 22 + seededSin(step * 3.3) * 8)).toFixed(0)),
      precipitation: (day === 8 || day === 21) ? Number((4.5 + seededSin(step * 3.7) * 6.0).toFixed(1)) : 0,
      windSpeed: Number((3.2 + seededSin(step * 4.1) * 2.8).toFixed(1)),
      provenance: 'demo',
      flags: isForestSmoke ? ['WILDFIRE_SMOKE_EVENT'] : []
    });

    // Station 2: Verdant River Valley (Agricultural & River)
    // Documented Anomaly 2: Days 20-22 Extreme storm runoff event (Rainfall 62mm, Turbidity 38.5 NTU, DO drop to 4.2 mg/L, Nitrate spike)
    // Documented Anomaly 3: Day 26 Step change in pH sensor calibration (jumps from 7.4 to 9.2)
    const isValleyStorm = day >= 20 && day <= 22;
    const isPhDrift = day >= 26;
    const valleyRain = isValleyStorm ? (step % 2 === 0 ? 28.5 : 33.5) : ((day === 8) ? 6.2 : 0);
    const valleyTurbidity = isValleyStorm ? 38.5 + seededSin(step * 5.2) * 8.2 : 3.8 + seededSin(step * 5.3) * 1.9;
    const valleyDO = isValleyStorm ? 4.2 - seededSin(step * 5.7) * 0.8 : 7.6 - (diurnalCycle * 0.5) + seededSin(step * 5.9) * 0.4;
    const valleyNitrate = isValleyStorm ? 14.8 + seededSin(step * 6.1) * 2.4 : 4.2 + seededSin(step * 6.3) * 1.5;
    const valleyPH = isPhDrift ? 9.2 + seededSin(step * 6.7) * 0.3 : 7.4 + seededSin(step * 6.9) * 0.25;

    // Documented Anomaly 4: Day 16 power outage gap is simulated by skipping step 64
    if (step === 64) {
      // Deliberate 12-hour gap for testing temporal gap detector
      continue;
    }

    records.push({
      id: `rec-valley-${step}`,
      timestamp: isoTime,
      stationId: 'STA-VALLEY-02',
      stationName: 'Verdant River Valley Station',
      region: 'Willamette Agricultural Corridor',
      latitude: 45.1294,
      longitude: -123.0315,
      elevationMeters: 68,
      pm25: Number((11.5 + (isValleyStorm ? -4 : 0) + seededSin(step * 7.1) * 6.0).toFixed(1)),
      pm10: Number((24.0 + seededSin(step * 7.3) * 11.0).toFixed(1)),
      no2: Number((16.0 + diurnalCycle * 8.0 + seededSin(step * 7.7) * 4.0).toFixed(1)),
      ph: Number(valleyPH.toFixed(2)),
      dissolvedOxygen: Number(valleyDO.toFixed(1)),
      turbidity: Number(valleyTurbidity.toFixed(1)),
      conductivity: Number((isValleyStorm ? 680 : 340 + seededSin(step * 8.1) * 45).toFixed(0)),
      waterTemp: Number((16.5 + diurnalCycle * 2.2 + seededSin(step * 8.3) * 0.8).toFixed(1)),
      nitrate: Number(valleyNitrate.toFixed(1)),
      temperature: Number((18.5 + diurnalCycle * 8.0 - day * 0.1 + seededSin(step * 8.7) * 1.8).toFixed(1)),
      humidity: Number(Math.max(30, Math.min(100, isValleyStorm ? 95 : 68 - diurnalCycle * 24 + seededSin(step * 8.9) * 10)).toFixed(0)),
      precipitation: Number(valleyRain.toFixed(1)),
      provenance: 'demo',
      flags: isValleyStorm ? ['STORM_RUNOFF_SEDIMENT_PULSE'] : (isPhDrift ? ['SENSOR_CALIBRATION_STEP_ANOMALY'] : [])
    });

    // Station 3: Harbor Industrial Basin (Urban Industrial Coast)
    // Documented Anomaly 5: Day 5 High Inversion episode with PM2.5 = 68 µg/m³, NO2 = 78 ppb, SO2 = 64 ppb
    const isUrbanInversion = day === 5;
    const urbanPM25 = isUrbanInversion ? 68.4 + (step % 4) * 6.2 : 19.5 + diurnalCycle * 9.5 + seededSin(step * 9.1) * 7.0;
    const urbanNO2 = isUrbanInversion ? 78.2 + (step % 3) * 8.0 : 34.0 + diurnalCycle * 18.0 + seededSin(step * 9.3) * 8.5;
    const urbanSO2 = isUrbanInversion ? 64.0 + (step % 4) * 9.0 : 12.0 + seededSin(step * 9.7) * 7.5;

    records.push({
      id: `rec-urban-${step}`,
      timestamp: isoTime,
      stationId: 'STA-URBAN-03',
      stationName: 'Harbor Industrial Basin',
      region: 'Puget Sound Estuary',
      latitude: 47.5684,
      longitude: -122.3582,
      elevationMeters: 12,
      pm25: Number(urbanPM25.toFixed(1)),
      pm10: Number((urbanPM25 * 1.7 + seededSin(step * 10.1) * 12.0).toFixed(1)),
      no2: Number(urbanNO2.toFixed(1)),
      so2: Number(urbanSO2.toFixed(1)),
      co: Number((0.85 + (isUrbanInversion ? 2.4 : 0) + seededSin(step * 10.3) * 0.35).toFixed(2)),
      o3: Number(Math.max(5, 26 + diurnalCycle * 24 - (urbanNO2 * 0.15) + seededSin(step * 10.7) * 6).toFixed(1)),
      conductivity: Number((1450 + seededSin(step * 11.1) * 380).toFixed(0)), // Estuarine brackish
      waterTemp: Number((15.2 + diurnalCycle * 1.5 + seededSin(step * 11.3) * 0.7).toFixed(1)),
      temperature: Number((17.2 + diurnalCycle * 6.5 - day * 0.12 + seededSin(step * 11.7) * 1.6).toFixed(1)),
      humidity: Number(Math.max(40, Math.min(95, 74 - diurnalCycle * 18 + seededSin(step * 11.9) * 8)).toFixed(0)),
      windSpeed: Number((isUrbanInversion ? 0.8 : 4.4 + seededSin(step * 12.1) * 3.5).toFixed(1)), // Stagnant wind during inversion
      pressure: Number((1016 + (isUrbanInversion ? 12 : -8 * diurnalCycle) + seededSin(step * 12.3) * 4).toFixed(0)),
      provenance: 'demo',
      flags: isUrbanInversion ? ['ATMOSPHERIC_INVERSION_EPISODE'] : []
    });

    // Documented Anomaly 6: Intentional duplicate transmission at step 30 for station 3
    if (step === 30) {
      records.push({
        id: `rec-urban-30-dup`,
        timestamp: isoTime, // Exact matching timestamp
        stationId: 'STA-URBAN-03',
        stationName: 'Harbor Industrial Basin',
        region: 'Puget Sound Estuary',
        latitude: 47.5684,
        longitude: -122.3582,
        elevationMeters: 12,
        pm25: Number(urbanPM25.toFixed(1)),
        pm10: Number((urbanPM25 * 1.7).toFixed(1)),
        provenance: 'demo',
        flags: ['DUPLICATE_TRANSMISSION_ANOMALY']
      });
    }
  }

  return records;
}

export function getDemoDatasetMetadata(records: EnvironmentalRecord[]): DatasetMetadata {
  const totalRows = records.length;
  const duplicateRows = 1; // known deliberate duplicate
  const validRows = totalRows - duplicateRows;

  // Compute parameter occurrences
  const paramCounts: Record<string, number> = {};
  const params = ['pm25', 'pm10', 'no2', 'so2', 'co', 'o3', 'ph', 'turbidity', 'dissolvedOxygen', 'conductivity', 'waterTemp', 'nitrate', 'temperature', 'humidity', 'precipitation', 'windSpeed', 'pressure'];

  let totalSlots = 0;
  let missingSlots = 0;

  for (const p of params) {
    let present = 0;
    for (const r of records) {
      totalSlots++;
      if ((r as unknown as Record<string, unknown>)[p] !== undefined && (r as unknown as Record<string, unknown>)[p] !== null) {
        present++;
      } else {
        missingSlots++;
      }
    }
    paramCounts[p] = totalRows - present;
  }

  const { overallScore, breakdown } = calculateDatasetQualityScore(
    totalRows,
    validRows,
    missingSlots,
    totalSlots,
    duplicateRows,
    1 // known 12h gap at Valley station
  );

  return {
    id: 'demo-cascadia-basin-2026',
    title: 'Cascadia Ecological Observatory Transect (Demo)',
    description: 'DEMO DATA — NOT LIVE MEASUREMENTS. Synthesized multi-station transect covering montane forest, agricultural river corridor, and urban-estuarine basin. Features documented wildfire smoke, runoff turbidity spike, sensor drift, and transmission gap for validation.',
    provenance: 'demo',
    fileName: 'cascadia_transect_sep2026_demo.csv',
    fileSizeBytes: 78400,
    uploadedAt: '2026-10-01T08:00:00Z',
    totalRows,
    validRows,
    rejectedRows: 0,
    duplicateRows,
    missingValueCounts: paramCounts,
    dateRange: {
      start: '2026-09-01T00:00:00Z',
      end: '2026-09-30T18:00:00Z'
    },
    stations: DEMO_STATIONS.map(s => s.name),
    parametersDetected: params.filter(p => paramCounts[p] < totalRows),
    dataQualityScore: overallScore,
    qualityBreakdown: breakdown
  };
}
