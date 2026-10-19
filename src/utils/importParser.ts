/**
 * ECO-SENSE CSV/JSON Import Parser & Scientific Validation Engine
 *
 * Implements strict, auditable validation for incoming environmental records:
 * - Column alias heuristics & manual overrides
 * - Robust timestamp parsing (ISO 8601, RFC 2822, YYYY-MM-DD HH:mm:ss, US format)
 * - Physical & instrument boundary validation (avoids nonsensical sensor inputs)
 * - Rejection tracking with downloadable rejected-row CSV
 */

import Papa from 'papaparse';
import {
  EnvironmentalRecord,
  ColumnMappingConfig,
  ImportValidationReport,
  ValidationErrorItem,
  DatasetMetadata
} from '../types/environmental';
import { METRIC_THRESHOLDS, calculateDatasetQualityScore } from './environmentalStandards';

/**
 * Standard alias mapping dictionary for environmental column names
 */
export const COLUMN_ALIAS_MAP: Record<keyof EnvironmentalRecord | 'ignore', string[]> = {
  timestamp: ['timestamp', 'datetime', 'date_time', 'time', 'date', 'recorded_at', 'obs_time', 'sample_date'],
  stationId: ['stationid', 'station_id', 'station', 'site_id', 'site', 'sensor_id', 'station_code', 'station_no'],
  stationName: ['stationname', 'station_name', 'site_name', 'location_name', 'station_description', 'facility_name'],
  region: ['region', 'basin', 'catchment', 'watershed', 'county', 'area', 'zone'],
  latitude: ['latitude', 'lat', 'y', 'geo_lat', 'coord_lat'],
  longitude: ['longitude', 'lon', 'lng', 'x', 'geo_lon', 'coord_lon'],
  elevationMeters: ['elevation', 'elevation_m', 'altitude', 'elev', 'height_m'],

  pm25: ['pm25', 'pm2.5', 'pm2_5', 'pm_25', 'fine_particulate', 'particulate_25', 'pm25_ugm3'],
  pm10: ['pm10', 'pm_10', 'coarse_particulate', 'particulate_10', 'pm10_ugm3'],
  no2: ['no2', 'nitrogen_dioxide', 'no2_ppb', 'no2_conc'],
  so2: ['so2', 'sulfur_dioxide', 'so2_ppb', 'so2_conc'],
  co: ['co', 'carbon_monoxide', 'co_ppm', 'co_mgm3'],
  o3: ['o3', 'ozone', 'tropospheric_ozone', 'o3_ppb'],

  ph: ['ph', 'ph_units', 'water_ph', 'ph_value'],
  turbidity: ['turbidity', 'ntu', 'turbidity_ntu', 'clarity_ntu'],
  dissolvedOxygen: ['dissolvedoxygen', 'dissolved_oxygen', 'do', 'do_mgl', 'oxygen_dissolved', 'do_concentration'],
  conductivity: ['conductivity', 'specific_conductivity', 'conductance', 'specific_conductance', 'sp_cond', 'cond_uscm', 'ec', 'electrical_conductivity'],
  waterTemp: ['watertemp', 'water_temp', 'temp_water', 'water_temperature_c', 'stream_temp'],
  nitrate: ['nitrate', 'nitrate_n', 'no3', 'no3_n', 'nitrate_mgl'],

  temperature: ['temperature', 'temp', 'ambient_temp', 'air_temp', 'temperature_c', 'temp_c', 'temp_f'],
  humidity: ['humidity', 'relative_humidity', 'rh', 'rh_percent', 'hum'],
  precipitation: ['precipitation', 'precip', 'rain', 'rainfall_mm', 'rain_mm', 'precipitation_mm'],
  windSpeed: ['windspeed', 'wind_speed', 'wind_velocity', 'ws_ms', 'wind_spd'],
  windDirection: ['winddirection', 'wind_dir', 'wind_direction_deg', 'wd_deg'],
  pressure: ['pressure', 'barometric_pressure', 'baro_pressure', 'atmospheric_pressure', 'pressure_hpa'],

  id: ['id', 'record_id', 'obs_id', 'uuid'],
  provenance: ['provenance', 'source', 'data_source'],
  flags: ['flags', 'flag', 'status', 'qc_flag'],
  ignore: ['notes', 'comments', 'remarks', 'unnamed', 'empty']
};

/**
 * Suggests the best matching standard field for a raw CSV header
 */
export function suggestFieldMapping(headerName: string): keyof EnvironmentalRecord | 'ignore' {
  const cleanHeader = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Pass 1: Exact match first across all fields
  for (const [field, aliases] of Object.entries(COLUMN_ALIAS_MAP)) {
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanHeader === cleanAlias) {
        return field as keyof EnvironmentalRecord | 'ignore';
      }
    }
  }

  // Pass 2: Substring match (requires cleanAlias length >= 3 to avoid single letter false positives like 'x' or 'y')
  for (const [field, aliases] of Object.entries(COLUMN_ALIAS_MAP)) {
    if (field === 'ignore') continue;
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanAlias.length >= 3 && cleanHeader.includes(cleanAlias)) {
        return field as keyof EnvironmentalRecord | 'ignore';
      }
    }
  }

  return 'ignore';
}

/**
 * Parses diverse timestamp formats into standard UTC ISO 8601 string
 */
export function parseEnvironmentalDate(dateString: string, timeZoneOffset = 0): string | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const trimmed = dateString.trim();
  if (trimmed === '' || trimmed === 'NA' || trimmed === 'NULL') return null;

  // Must match typical date structure (digits with standard date separators or RFC month prefix)
  const isCandidateDate =
    /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(trimmed) ||
    /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(trimmed) ||
    /^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/.test(trimmed);

  if (!isCandidateDate) {
    return null;
  }

  // 1. Direct standard parse
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    if (d.getUTCFullYear() > 1970 && d.getUTCFullYear() < 2100) {
      if (timeZoneOffset !== 0) {
        return new Date(d.getTime() - timeZoneOffset * 3600 * 1000).toISOString();
      }
      return d.toISOString();
    }
  }

  // 2. Format: YYYY-MM-DD HH:mm[:ss]
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (isoMatch) {
    const [_, y, m, d, hr, mn, sc] = isoMatch;
    const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hr), Number(mn), Number(sc || 0)));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
  }

  // 3. Format: MM/DD/YYYY HH:mm[:ss] (US style)
  const usMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (usMatch) {
    const [_, m, d, y, hr, mn, sc] = usMatch;
    const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hr), Number(mn), Number(sc || 0)));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
  }

  return null;
}

/**
 * Validates a batch of parsed raw rows using the configured column mapping
 */
export function validateAndMapRecords(
  rawRows: Record<string, string>[],
  mappings: ColumnMappingConfig[],
  options: {
    missingConventions: string[]; // e.g. ['NA', 'null', '-999', 'ND', '']
    defaultStationId?: string;
    defaultStationName?: string;
    defaultRegion?: string;
    temperatureUnit?: 'C' | 'F';
    timeZoneOffsetHours?: number;
  }
): {
  validRecords: EnvironmentalRecord[];
  report: ImportValidationReport;
} {
  const missingSet = new Set(options.missingConventions.map(s => s.toLowerCase().trim()));
  missingSet.add('');
  missingSet.add('null');
  missingSet.add('na');
  missingSet.add('n/a');
  missingSet.add('nan');
  missingSet.add('-999');
  missingSet.add('-9999');

  const validRecords: EnvironmentalRecord[] = [];
  const errors: ValidationErrorItem[] = [];
  const rejectedRowsData: (Record<string, string> & { __rejection_reason: string })[] = [];
  const missingSummary: Record<string, number> = {};
  const seenKeys = new Set<string>();
  let duplicateCount = 0;

  // Track discovered stations and parameters
  const detectedStations = new Set<string>();
  const detectedParams = new Set<string>();

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];
    const rowNumber = idx + 1;
    let rowRejected = false;
    let rejectionReason = '';

    // Extracted target values for this record
    const recordCandidate: Partial<EnvironmentalRecord> = {
      id: `rec-imp-${rowNumber}-${Date.now() % 100000}`,
      provenance: 'imported',
      flags: []
    };

    // Process each configured mapped column
    for (const map of mappings) {
      if (map.targetField === 'ignore') continue;
      const rawVal = row[map.sourceColumn];
      const target = map.targetField;

      // Check missing value
      if (rawVal === undefined || rawVal === null || missingSet.has(String(rawVal).toLowerCase().trim())) {
        missingSummary[target] = (missingSummary[target] || 0) + 1;
        continue;
      }

      const strVal = String(rawVal).trim();

      // Case 1: Timestamp
      if (target === 'timestamp') {
        const parsedIso = parseEnvironmentalDate(strVal, options.timeZoneOffsetHours);
        if (!parsedIso) {
          rowRejected = true;
          rejectionReason = `Invalid date/timestamp format: "${strVal}"`;
          errors.push({
            rowNumber,
            column: map.sourceColumn,
            rawValue: strVal,
            errorType: 'unparseable_date',
            message: `Could not parse "${strVal}" into a valid date. Expected ISO 8601 or YYYY-MM-DD HH:mm.`,
            suggestion: 'Ensure format is YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ'
          });
          break;
        }
        recordCandidate.timestamp = parsedIso;
        continue;
      }

      // Case 2: String fields (stationId, stationName, region)
      if (target === 'stationId' || target === 'stationName' || target === 'region') {
        (recordCandidate as unknown as Record<string, unknown>)[target] = strVal;
        if (target === 'stationId' || target === 'stationName') {
          detectedStations.add(strVal);
        }
        continue;
      }

      // Case 3: Numeric fields
      const numVal = Number(strVal);
      if (isNaN(numVal)) {
        errors.push({
          rowNumber,
          column: map.sourceColumn,
          rawValue: strVal,
          errorType: 'invalid_number',
          message: `Expected numeric observation for ${target}, received "${strVal}".`,
          suggestion: 'Check if column headers were mixed up or contains text remarks'
        });
        continue;
      }

      // Unit conversion if configured (e.g. °F to °C)
      let convertedVal = numVal;
      if (target === 'temperature' && options.temperatureUnit === 'F') {
        convertedVal = (numVal - 32) * (5 / 9);
      }

      // Check physical boundaries if threshold exists
      const thresh = METRIC_THRESHOLDS[target as string];
      if (thresh) {
        if (convertedVal < thresh.physicalMin || convertedVal > thresh.physicalMax) {
          rowRejected = true;
          rejectionReason = `Physical boundary exceeded for ${thresh.label}: ${convertedVal} outside [${thresh.physicalMin}, ${thresh.physicalMax}]`;
          errors.push({
            rowNumber,
            column: map.sourceColumn,
            rawValue: strVal,
            errorType: 'out_of_physical_range',
            message: `Value ${convertedVal} ${thresh.unit} exceeds plausible instrument bounds [${thresh.physicalMin}, ${thresh.physicalMax}].`,
            suggestion: 'Inspect sensor calibration or check if unit conversion is required.'
          });
          break;
        }
      }

      // Lat/Lon physical boundaries check
      if (target === 'latitude' && (convertedVal < -90 || convertedVal > 90)) {
        rowRejected = true;
        rejectionReason = `Invalid Latitude: ${convertedVal}`;
        errors.push({
          rowNumber,
          column: map.sourceColumn,
          rawValue: strVal,
          errorType: 'out_of_physical_range',
          message: `Latitude ${convertedVal} is outside physical bounds [-90, 90].`
        });
        break;
      }
      if (target === 'longitude' && (convertedVal < -180 || convertedVal > 180)) {
        rowRejected = true;
        rejectionReason = `Invalid Longitude: ${convertedVal}`;
        errors.push({
          rowNumber,
          column: map.sourceColumn,
          rawValue: strVal,
          errorType: 'out_of_physical_range',
          message: `Longitude ${convertedVal} is outside physical bounds [-180, 180].`
        });
        break;
      }

      (recordCandidate as unknown as Record<string, unknown>)[target] = Number(convertedVal.toFixed(2));
      detectedParams.add(target);
    }

    if (rowRejected) {
      rejectedRowsData.push({
        ...row,
        __rejection_reason: rejectionReason
      });
      continue;
    }

    // Required fields check: timestamp
    if (!recordCandidate.timestamp) {
      rowRejected = true;
      rejectionReason = 'Missing mandatory timestamp field';
      errors.push({
        rowNumber,
        column: 'timestamp',
        rawValue: '',
        errorType: 'missing_required',
        message: 'Record does not specify a valid timestamp.',
        suggestion: 'Map a timestamp column or configure default time'
      });
      rejectedRowsData.push({ ...row, __rejection_reason: rejectionReason });
      continue;
    }

    // Assign fallback defaults for station & region if missing
    recordCandidate.stationId = recordCandidate.stationId || options.defaultStationId || 'IMP-STATION-01';
    recordCandidate.stationName = recordCandidate.stationName || options.defaultStationName || 'Imported Monitoring Station 01';
    recordCandidate.region = recordCandidate.region || options.defaultRegion || 'Observed Study Area';
    detectedStations.add(recordCandidate.stationName);

    // Duplicate detection: same station + exact timestamp
    const uniqueKey = `${recordCandidate.stationId}___${recordCandidate.timestamp}`;
    if (seenKeys.has(uniqueKey)) {
      duplicateCount++;
      recordCandidate.flags?.push('DUPLICATE_TIMESTAMP');
    } else {
      seenKeys.add(uniqueKey);
    }

    validRecords.push(recordCandidate as EnvironmentalRecord);
  }

  // Determine detected date range
  let detectedDateRange: { start: string; end: string } | undefined;
  if (validRecords.length > 0) {
    const sortedTimes = validRecords.map(r => r.timestamp).sort();
    detectedDateRange = {
      start: sortedTimes[0],
      end: sortedTimes[sortedTimes.length - 1]
    };
  }

  const report: ImportValidationReport = {
    totalRows: rawRows.length,
    validRowsCount: validRecords.length,
    rejectedRowsCount: rejectedRowsData.length,
    duplicateRowsCount: duplicateCount,
    missingValuesSummary: missingSummary,
    errors: errors.slice(0, 100), // Cap first 100 detailed error messages for UI responsiveness
    rejectedRowsData,
    detectedDateRange,
    detectedStations: Array.from(detectedStations),
    detectedParameters: Array.from(detectedParams)
  };

  return { validRecords, report };
}

/**
 * Creates DatasetMetadata from confirmed imported records and validation report
 */
export function buildImportedDatasetMetadata(
  title: string,
  fileName: string,
  fileSizeBytes: number,
  records: EnvironmentalRecord[],
  report: ImportValidationReport
): DatasetMetadata {
  const totalSlots = records.length * Math.max(1, report.detectedParameters.length);
  let missingSlots = 0;
  for (const count of Object.values(report.missingValuesSummary)) {
    missingSlots += count;
  }

  const { overallScore, breakdown } = calculateDatasetQualityScore(
    report.totalRows,
    records.length,
    missingSlots,
    totalSlots,
    report.duplicateRowsCount,
    0
  );

  return {
    id: `dataset-imp-${Date.now()}`,
    title: title || fileName.replace(/\.[^/.]+$/, ''),
    description: `User-imported dataset containing ${records.length} validated observations across ${report.detectedStations.length} station(s). Validated against standard environmental bounds.`,
    provenance: 'imported',
    fileName,
    fileSizeBytes,
    uploadedAt: new Date().toISOString(),
    totalRows: report.totalRows,
    validRows: records.length,
    rejectedRows: report.rejectedRowsCount,
    duplicateRows: report.duplicateRowsCount,
    missingValueCounts: report.missingValuesSummary,
    dateRange: report.detectedDateRange || {
      start: new Date().toISOString(),
      end: new Date().toISOString()
    },
    stations: report.detectedStations,
    parametersDetected: report.detectedParameters,
    dataQualityScore: overallScore,
    qualityBreakdown: breakdown
  };
}

/**
 * Generates sample CSV template strings that users can download or paste
 */
export const SAMPLE_CSV_TEMPLATES = {
  airQuality: `timestamp,station_id,station_name,region,pm25,pm10,no2,so2,o3,temperature,humidity
2026-10-01T00:00:00Z,AIR-01,Highland Peak,North Range,8.4,14.2,12.1,4.3,34.5,14.2,65
2026-10-01T06:00:00Z,AIR-01,Highland Peak,North Range,12.6,22.1,18.4,5.1,41.2,16.8,58
2026-10-01T12:00:00Z,AIR-01,Highland Peak,North Range,24.8,42.5,29.8,8.2,56.4,22.4,42
2026-10-01T18:00:00Z,AIR-01,Highland Peak,North Range,18.2,31.0,22.0,6.4,44.1,19.1,50
2026-10-02T00:00:00Z,AIR-01,Highland Peak,North Range,9.1,15.8,13.0,4.0,32.0,13.5,68
2026-10-02T06:00:00Z,AIR-01,Highland Peak,North Range,58.4,98.2,42.1,14.5,49.0,17.2,55
2026-10-02T12:00:00Z,AIR-01,Highland Peak,North Range,72.1,124.0,51.8,18.2,68.4,24.1,38
2026-10-02T18:00:00Z,AIR-01,Highland Peak,North Range,38.5,65.2,28.4,9.0,48.2,20.0,45`,

  waterQuality: `timestamp,site_id,site_name,watershed,ph,turbidity_ntu,dissolved_oxygen_mgl,conductivity_uscm,water_temp_c,nitrate_mgl
2026-10-01T00:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.42,1.8,9.4,240,11.2,1.4
2026-10-01T06:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.38,2.1,9.8,245,10.8,1.5
2026-10-01T12:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.55,1.6,8.9,250,13.4,1.3
2026-10-01T18:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.48,2.0,9.1,248,12.6,1.4
2026-10-02T00:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.40,34.2,4.8,580,14.2,8.9
2026-10-02T06:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.25,48.5,3.9,640,14.8,12.4
2026-10-02T12:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.31,28.4,5.4,510,15.1,9.2
2026-10-02T18:00:00Z,WTR-01,Clearwater Creek,Alpine Watershed,7.39,12.0,7.1,380,13.9,5.1`,

  climate: `timestamp,station_id,station_name,temperature_c,humidity_pct,precipitation_mm,wind_speed_ms,baro_pressure_hpa
2026-10-01T00:00:00Z,CLM-01,Summit Weather Mast,12.4,85,0.0,3.2,1014
2026-10-01T06:00:00Z,CLM-01,Summit Weather Mast,10.8,92,0.0,2.8,1015
2026-10-01T12:00:00Z,CLM-01,Summit Weather Mast,18.5,60,0.0,4.5,1013
2026-10-01T18:00:00Z,CLM-01,Summit Weather Mast,15.2,72,0.0,3.9,1012
2026-10-02T00:00:00Z,CLM-01,Summit Weather Mast,13.0,95,14.2,8.4,1004
2026-10-02T06:00:00Z,CLM-01,Summit Weather Mast,11.5,98,28.5,14.2,998
2026-10-02T12:00:00Z,CLM-01,Summit Weather Mast,14.2,94,18.0,11.5,1001
2026-10-02T18:00:00Z,CLM-01,Summit Weather Mast,12.8,90,4.5,6.2,1008`,

  qaFixture: `timestamp,station_id,station_name,region,latitude,longitude,pm25,pm10,ph,turbidity_ntu,dissolved_oxygen_mgl,temperature_c,humidity,precipitation_mm,pressure_hpa
2026-10-01T00:00:00Z,ST-AIR-01,Valley Air Monitor,Olympic Basin,47.60,-122.33,14.2,28.5,NA,NA,NA,15.4,72,0.0,1015
2026-10-01T06:00:00Z,ST-AIR-01,Valley Air Monitor,Olympic Basin,47.60,-122.33,22.8,44.1,NA,NA,NA,18.1,64,0.0,1013
2026-10-01T12:00:00Z,ST-WTR-02,Clear Creek Inflow,Cascade Watershed,47.45,-121.80,NA,NA,7.45,2.4,9.8,12.2,-999,0.0,1012
2026-10-01T18:00:00Z,ST-WTR-02,Clear Creek Inflow,Cascade Watershed,47.45,-121.80,NA,NA,7.60,2.1,9.4,13.0,NA,0.0,1011
2026-10-02T00:00:00Z,ST-CLM-03,High Pass Mast,Alpine Ridge,47.75,-121.10,8.2,12.0,NA,NA,NA,8.5,95,12.4,998
2026-10-02T00:00:00Z,ST-CLM-03,High Pass Mast,Alpine Ridge,47.75,-121.10,8.2,12.0,NA,NA,NA,8.5,95,12.4,998
2026-10-02T06:00:00Z,ST-AIR-01,Valley Air Monitor,Olympic Basin,47.60,-122.33,CORRUPTED_TEXT,32.0,NA,NA,NA,16.0,80,1.2,1009
2026-10-02T12:00:00Z,ST-WTR-02,Clear Creek Inflow,Cascade Watershed,47.45,-121.80,NA,NA,24.5,4.2,8.0,14.1,NA,0.0,1008
2026-10-02T18:00:00Z,ST-CLM-03,High Pass Mast,Alpine Ridge,999.0,-121.10,12.1,19.0,NA,NA,NA,10.2,88,3.2,1005
INVALID-TIMESTAMP-2026,ST-AIR-01,Valley Air Monitor,Olympic Basin,47.60,-122.33,18.5,35.0,NA,NA,NA,17.2,75,0.0,1010`
};
