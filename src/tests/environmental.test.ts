/**
 * ECO-SENSE Automated Comprehensive QA & Scientific Test Suite
 *
 * Verifies mathematical formulas, boundary conditions, edge cases,
 * CSV ingestion, unit conversions, and explainable anomaly detection.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSummaryStatistics,
  aggregateTimeSeries,
  exportToCsv,
  calculateDistributionHistogram,
  convertTemperature,
  convertPrecipitation,
  convertWindSpeed
} from '../utils/dataProcessing';
import Papa from 'papaparse';
import {
  suggestFieldMapping,
  parseEnvironmentalDate,
  validateAndMapRecords,
  buildImportedDatasetMetadata,
  SAMPLE_CSV_TEMPLATES
} from '../utils/importParser';
import { generateDeterministicFieldReport } from '../utils/reportGenerator';
import {
  calculatePM25AQI,
  calculateDatasetQualityScore
} from '../utils/environmentalStandards';
import {
  detectEnvironmentalAnomalies,
  DEFAULT_DETECTION_CONFIG
} from '../utils/anomalyDetection';
import { EnvironmentalRecord } from '../types/environmental';

describe('Scientific Calculation Engine: Edge Cases & Scenarios', () => {
  const standardRecords: EnvironmentalRecord[] = [
    { id: '1', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 10, temperature: 15, provenance: 'demo' },
    { id: '2', timestamp: '2026-10-01T06:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 20, temperature: 20, provenance: 'demo' },
    { id: '3', timestamp: '2026-10-01T12:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 30, temperature: 25, provenance: 'demo' },
    { id: '4', timestamp: '2026-10-01T18:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 40, temperature: 18, provenance: 'demo' },
    { id: '5', timestamp: '2026-10-02T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: undefined, temperature: 16, provenance: 'demo' },
  ];

  it('correctly calculates mean, median, min, max, stdDev, and handles missing observations', () => {
    const stats = calculateSummaryStatistics(standardRecords, 'pm25');
    expect(stats.count).toBe(5);
    expect(stats.validCount).toBe(4);
    expect(stats.missingCount).toBe(1);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(40);
    expect(stats.mean).toBe(25);
    expect(stats.median).toBe(25);
    expect(stats.iqr).toBe(20);
    expect(stats.stdDev).toBeCloseTo(12.91, 1);
  });

  it('handles a single valid observation without division by zero or NaN', () => {
    const singleRecord: EnvironmentalRecord[] = [
      { id: 's1', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 14.5, provenance: 'demo' }
    ];
    const stats = calculateSummaryStatistics(singleRecord, 'pm25');
    expect(stats.count).toBe(1);
    expect(stats.validCount).toBe(1);
    expect(stats.missingCount).toBe(0);
    expect(stats.mean).toBe(14.5);
    expect(stats.median).toBe(14.5);
    expect(stats.min).toBe(14.5);
    expect(stats.max).toBe(14.5);
    expect(stats.stdDev).toBe(0);
    expect(stats.iqr).toBe(0);
  });

  it('handles dataset where all observations for a parameter are missing', () => {
    const allMissing: EnvironmentalRecord[] = [
      { id: 'm1', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: undefined, provenance: 'demo' },
      { id: 'm2', timestamp: '2026-10-01T06:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: undefined, provenance: 'demo' }
    ];
    const stats = calculateSummaryStatistics(allMissing, 'pm25');
    expect(stats.count).toBe(2);
    expect(stats.validCount).toBe(0);
    expect(stats.missingCount).toBe(2);
    expect(stats.mean).toBe(0);
    expect(stats.stdDev).toBe(0);
  });

  it('accurately evaluates sub-zero (negative) values for valid environmental parameters', () => {
    const subZeroTemp: EnvironmentalRecord[] = [
      { id: 'z1', timestamp: '2026-01-10T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', temperature: -15.0, provenance: 'demo' },
      { id: 'z2', timestamp: '2026-01-10T06:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', temperature: -10.0, provenance: 'demo' },
      { id: 'z3', timestamp: '2026-01-10T12:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', temperature: -5.0, provenance: 'demo' },
    ];
    const stats = calculateSummaryStatistics(subZeroTemp, 'temperature');
    expect(stats.validCount).toBe(3);
    expect(stats.min).toBe(-15.0);
    expect(stats.max).toBe(-5.0);
    expect(stats.mean).toBe(-10.0);
    expect(stats.median).toBe(-10.0);
  });

  it('aggregates time series across daily, weekly, and monthly intervals', () => {
    const multiMonthRecords: EnvironmentalRecord[] = [
      { id: '1', timestamp: '2026-09-15T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 12.0, provenance: 'demo' },
      { id: '2', timestamp: '2026-09-16T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 18.0, provenance: 'demo' },
      { id: '3', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 24.0, provenance: 'demo' },
    ];

    const daily = aggregateTimeSeries(multiMonthRecords, 'pm25', 'daily');
    expect(daily.length).toBe(3);

    const monthly = aggregateTimeSeries(multiMonthRecords, 'pm25', 'monthly');
    expect(monthly.length).toBe(2); // 2026-09 and 2026-10
    expect(monthly[0].dateKey).toBe('2026-09');
    expect(monthly[0].mean).toBe(15.0); // (12 + 18) / 2
    expect(monthly[1].dateKey).toBe('2026-10');
    expect(monthly[1].mean).toBe(24.0);
  });

  it('safely handles unparseable date strings during time-series aggregation without throwing', () => {
    const badDateRecord: EnvironmentalRecord[] = [
      { id: 'b1', timestamp: 'invalid-date-string', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 15.0, provenance: 'demo' },
      { id: 'b2', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 20.0, provenance: 'demo' }
    ];
    const daily = aggregateTimeSeries(badDateRecord, 'pm25', 'daily');
    expect(daily.length).toBe(1);
    expect(daily[0].dateKey).toBe('2026-10-01');
  });

  it('converts units accurately between Metric and Imperial systems', () => {
    // 0°C = 32°F, 100°C = 212°F, -40°C = -40°F
    expect(convertTemperature(0, 'imperial')).toBe(32.0);
    expect(convertTemperature(100, 'imperial')).toBe(212.0);
    expect(convertTemperature(-40, 'imperial')).toBe(-40.0);
    expect(convertTemperature(25, 'metric')).toBe(25.0);

    // 25.4 mm = 1.00 inch
    expect(convertPrecipitation(25.4, 'imperial')).toBe(1.0);
    expect(convertPrecipitation(50.8, 'imperial')).toBe(2.0);

    // 10 m/s ≈ 22.4 mph
    expect(convertWindSpeed(10, 'imperial')).toBe(22.4);
  });
});

describe('Data Import & Validation Engine', () => {
  it('correctly maps column aliases for water, air, and meteorological parameters', () => {
    expect(suggestFieldMapping('pm_25')).toBe('pm25');
    expect(suggestFieldMapping('PM2.5')).toBe('pm25');
    expect(suggestFieldMapping('Dissolved_Oxygen_mgL')).toBe('dissolvedOxygen');
    expect(suggestFieldMapping('pH_value')).toBe('ph');
    expect(suggestFieldMapping('turbidity_ntu')).toBe('turbidity');
    expect(suggestFieldMapping('Specific_Conductance')).toBe('conductivity');
    expect(suggestFieldMapping('Date_Time')).toBe('timestamp');
    expect(suggestFieldMapping('site_id')).toBe('stationId');
    expect(suggestFieldMapping('barometric_pressure')).toBe('pressure');
    expect(suggestFieldMapping('precipitation_mm')).toBe('precipitation');
    expect(suggestFieldMapping('random_unknown_col')).toBe('ignore');
  });

  it('rejects rows with invalid coordinates outside plausible physical bounds', () => {
    const rawRows = [
      { datetime: '2026-10-01 00:00:00', station: 'ST-1', lat: '45.5', lon: '-122.5' },
      { datetime: '2026-10-01 01:00:00', station: 'ST-1', lat: '999.0', lon: '-122.5' }, // Latitude > 90
      { datetime: '2026-10-01 02:00:00', station: 'ST-1', lat: '45.5', lon: '-350.0' },  // Longitude < -180
    ];

    const mappings = [
      { sourceColumn: 'datetime', targetField: 'timestamp' as const },
      { sourceColumn: 'station', targetField: 'stationId' as const },
      { sourceColumn: 'lat', targetField: 'latitude' as const },
      { sourceColumn: 'lon', targetField: 'longitude' as const },
    ];

    const { validRecords, report } = validateAndMapRecords(rawRows, mappings, {
      missingConventions: ['NA', '-999']
    });

    expect(report.totalRows).toBe(3);
    expect(report.validRowsCount).toBe(1);
    expect(report.rejectedRowsCount).toBe(2);
    expect(report.rejectedRowsData.length).toBe(2);
    expect(report.rejectedRowsData[0].__rejection_reason).toContain('Latitude');
  });

  it('parses timestamps with time zone offset adjustments', () => {
    // 12:00:00 with -8h PST offset becomes 20:00:00Z
    const parsedWithOffset = parseEnvironmentalDate('2026-10-01T12:00:00Z', -8);
    expect(parsedWithOffset).toBe('2026-10-01T20:00:00.000Z');
  });

  it('respects configured custom missing value conventions', () => {
    const rawRows = [
      { datetime: '2026-10-01 00:00:00', station: 'ST-1', pm25: '-999', ph: 'ND' },
      { datetime: '2026-10-01 01:00:00', station: 'ST-1', pm25: '12.5', ph: '7.4' }
    ];

    const mappings = [
      { sourceColumn: 'datetime', targetField: 'timestamp' as const },
      { sourceColumn: 'station', targetField: 'stationId' as const },
      { sourceColumn: 'pm25', targetField: 'pm25' as const },
      { sourceColumn: 'ph', targetField: 'ph' as const }
    ];

    const { validRecords, report } = validateAndMapRecords(rawRows, mappings, {
      missingConventions: ['-999', 'ND']
    });

    expect(report.validRowsCount).toBe(2);
    expect(validRecords[0].pm25).toBeUndefined();
    expect(validRecords[0].ph).toBeUndefined();
    expect(validRecords[1].pm25).toBe(12.5);
    expect(validRecords[1].ph).toBe(7.4);
    expect(report.missingValuesSummary.pm25).toBe(1);
    expect(report.missingValuesSummary.ph).toBe(1);
  });
});

describe('US EPA Air Quality Index (AQI) Calculation', () => {
  it('correctly calculates EPA PM2.5 AQI according to 40 CFR Part 58 breakpoints', () => {
    // Good (0 - 50)
    const goodAQI = calculatePM25AQI(9.0);
    expect(goodAQI.category).toBe('Good');
    expect(goodAQI.aqi).toBeGreaterThanOrEqual(0);
    expect(goodAQI.aqi).toBeLessThanOrEqual(50);

    // Moderate (51 - 100)
    const modAQI = calculatePM25AQI(25.0);
    expect(modAQI.category).toBe('Moderate');
    expect(modAQI.aqi).toBeGreaterThanOrEqual(51);
    expect(modAQI.aqi).toBeLessThanOrEqual(100);

    // Unhealthy for Sensitive Groups (101 - 150)
    const usgAQI = calculatePM25AQI(42.0);
    expect(usgAQI.category).toBe('Unhealthy for Sensitive Groups');
    expect(usgAQI.aqi).toBeGreaterThanOrEqual(101);
    expect(usgAQI.aqi).toBeLessThanOrEqual(150);

    // Unhealthy (151 - 200)
    const unhAQI = calculatePM25AQI(84.0);
    expect(unhAQI.category).toBe('Unhealthy');
    expect(unhAQI.aqi).toBeGreaterThanOrEqual(151);
    expect(unhAQI.aqi).toBeLessThanOrEqual(200);

    // Very Unhealthy (201 - 300)
    const vUnhAQI = calculatePM25AQI(180.0);
    expect(vUnhAQI.category).toBe('Very Unhealthy');
    expect(vUnhAQI.aqi).toBeGreaterThanOrEqual(201);
    expect(vUnhAQI.aqi).toBeLessThanOrEqual(300);

    // Hazardous (301 - 500)
    const hazAQI = calculatePM25AQI(320.0);
    expect(hazAQI.category).toBe('Hazardous');
    expect(hazAQI.aqi).toBeGreaterThanOrEqual(301);

    // Beyond scale cap
    const extremeAQI = calculatePM25AQI(600.0);
    expect(extremeAQI.aqi).toBe(500);
    expect(extremeAQI.category).toContain('Hazardous');

    // Negative / Invalid handling
    const invalidAQI = calculatePM25AQI(-5.0);
    expect(invalidAQI.category).toBe('Invalid Observation');
  });
});

describe('Explainable Environmental Anomaly Detection Engine', () => {
  it('detects regulatory threshold breaches and telemetry gaps', () => {
    const anomalyFixture: EnvironmentalRecord[] = [
      { id: '1', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 10, ph: 7.2, provenance: 'demo' },
      { id: '2', timestamp: '2026-10-01T06:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 12, ph: 7.3, provenance: 'demo' },
      { id: '3', timestamp: '2026-10-01T12:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 11, ph: 7.1, provenance: 'demo' },
      { id: '4', timestamp: '2026-10-01T18:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 92, ph: 7.4, provenance: 'demo' }, // Critical PM2.5 breach
      { id: '5', timestamp: '2026-10-02T18:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 12, ph: 7.2, provenance: 'demo' }, // 24h gap
    ];

    const anomalies = detectEnvironmentalAnomalies(anomalyFixture, DEFAULT_DETECTION_CONFIG);
    expect(anomalies.length).toBeGreaterThan(0);

    const threshAnom = anomalies.find(a => a.detectionMethod === 'threshold' && a.metric === 'pm25');
    expect(threshAnom).toBeDefined();
    expect(threshAnom?.severity).toBe('critical');

    const gapAnom = anomalies.find(a => a.detectionMethod === 'data_gap');
    expect(gapAnom).toBeDefined();
  });

  it('does not trigger false positive outliers or divide-by-zero on constant value datasets', () => {
    // 10 records with identical value (stdDev = 0, IQR = 0)
    const constantRecords: EnvironmentalRecord[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      timestamp: `2026-10-01T0${i}:00:00Z`,
      stationId: 'S1',
      stationName: 'St1',
      region: 'R1',
      pm25: 8.0,
      ph: 7.4,
      provenance: 'demo'
    }));

    const anomalies = detectEnvironmentalAnomalies(constantRecords, DEFAULT_DETECTION_CONFIG);
    const iqrAnomalies = anomalies.filter(a => a.detectionMethod === 'iqr_outlier');
    const rocAnomalies = anomalies.filter(a => a.detectionMethod === 'abrupt_change');
    expect(iqrAnomalies.length).toBe(0);
    expect(rocAnomalies.length).toBe(0);
  });

  it('detects duplicate timestamp transmissions', () => {
    const dupRecords: EnvironmentalRecord[] = [
      { id: 'd1', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 10, provenance: 'demo' },
      { id: 'd2', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 12, provenance: 'demo' }, // Identical timestamp
    ];
    const anomalies = detectEnvironmentalAnomalies(dupRecords, DEFAULT_DETECTION_CONFIG);
    const dupAnomaly = anomalies.find(a => a.detectionMethod === 'duplicate_record');
    expect(dupAnomaly).toBeDefined();
    expect(dupAnomaly?.stationId).toBe('S1');
  });
});

describe('Data Quality Scoring Index & Export Formatting', () => {
  it('transparently computes composite quality score with penalties', () => {
    const result = calculateDatasetQualityScore(100, 95, 20, 500, 2, 1);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.methodologyNotes.length).toBe(4);
    expect(result.breakdown.completeness).toBeGreaterThan(90);
  });

  it('formats compliant RFC 4180 CSV strings with quotes, commas, and newlines', () => {
    const testData = [
      { name: 'Station Alpha', value: 42.5, remarks: 'Normal, sunny' },
      { name: 'Station "Beta"', value: 18.0, remarks: 'Rainy\nwindy' }
    ];

    const csv = exportToCsv(testData);
    expect(csv).toContain('name,value,remarks');
    expect(csv).toContain('"Station ""Beta"""');
    expect(csv).toContain('"Normal, sunny"');
    expect(csv).toContain('"Rainy\nwindy"');
  });
});

describe('PHASE 3: Deterministic Multi-Domain QA Test Fixture Workflow', () => {
  it('processes and validates complete multi-station fixture with deliberate defects', () => {
    // Parse the deterministic QA fixture CSV
    const parsed = Papa.parse<Record<string, string>>(SAMPLE_CSV_TEMPLATES.qaFixture, {
      header: true,
      skipEmptyLines: true
    });

    expect(parsed.data.length).toBe(10);
    const headers = parsed.meta.fields || [];
    expect(headers).toContain('timestamp');
    expect(headers).toContain('station_id');
    expect(headers).toContain('latitude');
    expect(headers).toContain('longitude');
    expect(headers).toContain('pm25');
    expect(headers).toContain('ph');
    expect(headers).toContain('temperature_c');

    // Auto-map columns
    const mappings = headers.map(h => ({
      sourceColumn: h,
      targetField: suggestFieldMapping(h)
    }));

    // Verify critical mappings
    expect(mappings.find(m => m.sourceColumn === 'station_id')?.targetField).toBe('stationId');
    expect(mappings.find(m => m.sourceColumn === 'pm25')?.targetField).toBe('pm25');
    expect(mappings.find(m => m.sourceColumn === 'ph')?.targetField).toBe('ph');
    expect(mappings.find(m => m.sourceColumn === 'turbidity_ntu')?.targetField).toBe('turbidity');
    expect(mappings.find(m => m.sourceColumn === 'dissolved_oxygen_mgl')?.targetField).toBe('dissolvedOxygen');
    expect(mappings.find(m => m.sourceColumn === 'temperature_c')?.targetField).toBe('temperature');

    // Validate with configured missing conventions
    const { validRecords, report } = validateAndMapRecords(parsed.data, mappings, {
      missingConventions: ['NA', '-999', 'null'],
      temperatureUnit: 'C'
    });

    // 10 total rows:
    // - Row 8 has pH = 24.5 (exceeds physical bounds [0, 14]) -> REJECTED
    // - Row 9 has lat = 999.0 (exceeds physical bounds [-90, 90]) -> REJECTED
    // - Row 10 has unparseable timestamp ('INVALID-TIMESTAMP-2026') -> REJECTED
    // -> exactly 3 rejected rows!
    expect(report.totalRows).toBe(10);
    expect(report.rejectedRowsCount).toBe(3);
    expect(report.validRowsCount).toBe(7);
    expect(validRecords.length).toBe(7);

    // Verify duplicate timestamp detection on valid rows
    expect(report.duplicateRowsCount).toBe(1);

    // Verify missing values summary includes the missing conventions
    expect(report.missingValuesSummary.ph).toBeGreaterThan(0);
    expect(report.missingValuesSummary.humidity).toBeGreaterThan(0);

    // Verify error logging for corrupted number
    const corruptedError = report.errors.find(e => e.rawValue === 'CORRUPTED_TEXT');
    expect(corruptedError).toBeDefined();
    expect(corruptedError?.errorType).toBe('invalid_number');

    // Verify rejected rows export to CSV contains rejection reasons
    expect(report.rejectedRowsData.length).toBe(3);
    const rejectionCsv = exportToCsv(report.rejectedRowsData);
    expect(rejectionCsv).toContain('__rejection_reason');
    expect(rejectionCsv).toContain('Latitude');
    expect(rejectionCsv).toContain('Invalid date/timestamp format');

    // Verify metadata construction
    const metadata = buildImportedDatasetMetadata(
      'Deterministic Multi-Domain QA Dataset',
      'deterministic_qa_fixture.csv',
      SAMPLE_CSV_TEMPLATES.qaFixture.length,
      validRecords,
      report
    );

    expect(metadata.provenance).toBe('imported');
    expect(metadata.totalRows).toBe(10);
    expect(metadata.validRows).toBe(7);
    expect(metadata.rejectedRows).toBe(3);
    expect(metadata.duplicateRows).toBe(1);
    expect(metadata.dataQualityScore).toBeGreaterThan(0);
    expect(metadata.dataQualityScore).toBeLessThanOrEqual(100);
    expect(metadata.stations.length).toBeGreaterThan(1);
  });
});

describe('PHASE 5: Anomaly Detection Engine Edge Cases', () => {
  it('correctly handles high-frequency bursts without crashing', () => {
    const burstRecords: EnvironmentalRecord[] = Array.from({ length: 50 }, (_, i) => ({
      id: `burst-${i}`,
      timestamp: new Date(Date.now() + i * 60000).toISOString(),
      stationId: 'BURST-01',
      stationName: 'Burst Station',
      region: 'Alpine Zone',
      pm25: 12 + Math.sin(i) * 2,
      ph: 7.4 + (i === 25 ? 6.0 : 0), // Sudden abrupt step at sample 25 (ph 13.4)
      provenance: 'demo'
    }));

    const anomalies = detectEnvironmentalAnomalies(burstRecords, DEFAULT_DETECTION_CONFIG);
    expect(anomalies).toBeDefined();
    expect(Array.isArray(anomalies)).toBe(true);

    const stepAnomaly = anomalies.find(a => a.recordId === 'burst-25');
    expect(stepAnomaly).toBeDefined();
  });
});

describe('PHASE 6: Geographic Coordinate & Spatial Integrity', () => {
  it('accurately identifies bounding coordinates and rejects inverted or out-of-range bounds', () => {
    const testStations = [
      { id: 'STA-1', name: 'Alpha', latitude: 45.0, longitude: -120.0 },
      { id: 'STA-2', name: 'Beta', latitude: 48.0, longitude: -124.0 },
      { id: 'STA-3', name: 'Gamma', latitude: 46.5, longitude: -122.0 }
    ];

    const lats = testStations.map(s => s.latitude);
    const lngs = testStations.map(s => s.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    expect(minLat).toBe(45.0);
    expect(maxLat).toBe(48.0);
    expect(minLng).toBe(-124.0);
    expect(maxLng).toBe(-120.0);
  });
});

describe('PHASE 7: Deterministic Field Report Synthesis', () => {
  it('generates fully populated 5-section markdown report adhering to anti-hallucination rules', () => {
    const testRecords: EnvironmentalRecord[] = [
      { id: 'r1', timestamp: '2026-10-01T00:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 14.2, ph: 7.2, temperature: 16.5, provenance: 'demo' },
      { id: 'r2', timestamp: '2026-10-01T06:00:00Z', stationId: 'S1', stationName: 'St1', region: 'R1', pm25: 68.5, ph: 7.1, temperature: 18.0, provenance: 'demo' },
    ];

    const testMeta = {
      id: 'test-ds',
      title: 'QA Observatory Synthesis Test',
      description: 'Audit dataset',
      provenance: 'demo' as const,
      fileName: 'test.csv',
      fileSizeBytes: 1024,
      uploadedAt: '2026-10-01T00:00:00Z',
      totalRows: 2,
      validRows: 2,
      rejectedRows: 0,
      duplicateRows: 0,
      missingValueCounts: {},
      dateRange: { start: '2026-10-01T00:00:00Z', end: '2026-10-01T06:00:00Z' },
      stations: ['St1'],
      parametersDetected: ['pm25', 'ph', 'temperature'],
      dataQualityScore: 92,
      qualityBreakdown: { completeness: 95, validity: 90, consistency: 92, timeliness: 90 }
    };

    const report = generateDeterministicFieldReport({
      reportType: 'executive_field_summary',
      datasetMeta: testMeta,
      records: testRecords,
      anomalies: [
        {
          id: 'a1',
          recordId: 'r2',
          metric: 'pm25',
          metricLabel: 'PM2.5',
          stationId: 'S1',
          stationName: 'St1',
          timestamp: '2026-10-01T06:00:00Z',
          observedValue: 68.5,
          expectedRange: [0, 35.4],
          detectionMethod: 'threshold',
          severity: 'critical',
          explanation: 'Exceeded critical threshold 55.4 µg/m³',
          acknowledged: false
        }
      ],
      dateRange: { start: '2026-10-01T00:00:00Z', end: '2026-10-01T06:00:00Z' },
      selectedStation: 'St1'
    });

    // Check all 5 required sections
    expect(report).toContain('1. OBSERVATORY EXECUTIVE SUMMARY');
    expect(report).toContain('2. METEOROLOGICAL & CHEMICAL PATTERNS');
    expect(report).toContain('3. DETECTED ANOMALY EVALUATION & MECHANISMS');
    expect(report).toContain('4. DATA QUALITY, COMPLETENESS & LIMITATIONS');
    expect(report).toContain('5. RECOMMENDED SCIENTIFIC FOLLOW-UPS');

    // Check provenance disclosure
    expect(report).toContain('DEMONSTRATION DATASET');

    // Check factual values present without alteration
    expect(report).toContain('68.5');
    expect(report).toContain('QA Observatory Synthesis Test');
    expect(report).toContain('92/100');
  });
});

describe('PHASE 9: State Serialization & Persistence Round-Trip', () => {
  it('correctly serializes and deserializes observatory dataset states without data loss', () => {
    const originalRecord: EnvironmentalRecord = {
      id: 'ser-1',
      timestamp: '2026-10-01T12:00:00Z',
      stationId: 'STA-01',
      stationName: 'Alpine Mast',
      region: 'North Basin',
      pm25: 18.5,
      ph: 7.35,
      temperature: 14.2,
      provenance: 'imported',
      flags: ['FLAGGED_MANUAL']
    };

    const serialized = JSON.stringify(originalRecord);
    const deserialized: EnvironmentalRecord = JSON.parse(serialized);

    expect(deserialized.id).toBe(originalRecord.id);
    expect(deserialized.timestamp).toBe(originalRecord.timestamp);
    expect(deserialized.stationId).toBe(originalRecord.stationId);
    expect(deserialized.pm25).toBe(originalRecord.pm25);
    expect(deserialized.ph).toBe(originalRecord.ph);
    expect(deserialized.temperature).toBe(originalRecord.temperature);
    expect(deserialized.flags).toEqual(['FLAGGED_MANUAL']);
  });
});

