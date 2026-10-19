/**
 * ECO-SENSE Environmental Intelligence Platform
 * Domain Models & Type Definitions
 */

export type ProvenanceType = 'demo' | 'imported' | 'external';

export interface EnvironmentalRecord {
  id: string;
  timestamp: string; // ISO 8601 string: YYYY-MM-DDTHH:mm:ssZ
  stationId: string;
  stationName: string;
  region: string;
  latitude?: number;
  longitude?: number;
  elevationMeters?: number;

  // Air Quality Parameters
  pm25?: number; // µg/m³
  pm10?: number; // µg/m³
  no2?: number;  // ppb
  so2?: number;  // ppb
  co?: number;   // ppm
  o3?: number;   // ppb

  // Water Quality Parameters
  ph?: number;              // pH units (0-14)
  turbidity?: number;       // NTU
  dissolvedOxygen?: number; // mg/L
  conductivity?: number;    // µS/cm
  waterTemp?: number;       // °C
  nitrate?: number;         // mg/L (as NO3-N)

  // Climate & Weather Parameters
  temperature?: number;      // °C
  humidity?: number;         // %
  precipitation?: number;    // mm
  windSpeed?: number;        // m/s
  windDirection?: number;    // degrees (0-360)
  pressure?: number;         // hPa

  provenance: ProvenanceType;
  flags?: string[];
}

export interface MonitoringStation {
  id: string;
  name: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  elevationMeters?: number;
  environmentType: 'highland_forest' | 'river_valley' | 'urban_basin' | 'coastal_estuary' | 'custom';
  activeParameters: string[];
  totalObservations: number;
  firstObservation: string;
  lastObservation: string;
}

export type AnomalySeverity = 'advisory' | 'warning' | 'critical';
export type AnomalyMethod = 'threshold' | 'abrupt_change' | 'iqr_outlier' | 'duplicate_record' | 'data_gap';

export interface AnomalyRecord {
  id: string;
  recordId?: string;
  metric: string;
  metricLabel: string;
  stationId: string;
  stationName: string;
  timestamp: string;
  observedValue: number;
  expectedRange: [number, number];
  baselineValue?: number;
  detectionMethod: AnomalyMethod;
  severity: AnomalySeverity;
  explanation: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notes?: string;
}

export interface DatasetQualityBreakdown {
  completeness: number; // percentage of expected observations present
  validity: number;     // percentage of values within physical/instrument limits
  consistency: number;  // percentage free from duplicates or extreme step errors
  timeliness: number;   // regular reporting interval fidelity
}

export interface DatasetMetadata {
  id: string;
  title: string;
  description: string;
  provenance: ProvenanceType;
  fileName?: string;
  fileSizeBytes?: number;
  uploadedAt: string;
  totalRows: number;
  validRows: number;
  rejectedRows: number;
  duplicateRows: number;
  missingValueCounts: Record<string, number>;
  dateRange: {
    start: string;
    end: string;
  };
  stations: string[];
  parametersDetected: string[];
  dataQualityScore: number; // 0 - 100
  qualityBreakdown: DatasetQualityBreakdown;
}

export interface ColumnMappingConfig {
  sourceColumn: string;
  targetField: keyof EnvironmentalRecord | 'ignore';
  unitSource?: string;
  unitTarget?: string;
  multiplier?: number;
  offset?: number;
}

export interface ValidationErrorItem {
  rowNumber: number;
  column: string;
  rawValue: string;
  errorType: 'unparseable_date' | 'invalid_number' | 'out_of_physical_range' | 'missing_required' | 'duplicate_key';
  message: string;
  suggestion?: string;
}

export interface ImportValidationReport {
  totalRows: number;
  validRowsCount: number;
  rejectedRowsCount: number;
  duplicateRowsCount: number;
  missingValuesSummary: Record<string, number>;
  errors: ValidationErrorItem[];
  rejectedRowsData: Array<Record<string, string> & { __rejection_reason: string }>;
  detectedDateRange?: { start: string; end: string };
  detectedStations: string[];
  detectedParameters: string[];
}

export interface MetricThreshold {
  metric: keyof EnvironmentalRecord;
  label: string;
  unit: string;
  domain: 'air' | 'water' | 'climate';
  physicalMin: number;
  physicalMax: number;
  advisoryMax?: number;
  warningMax?: number;
  criticalMax?: number;
  advisoryMin?: number;
  warningMin?: number;
  criticalMin?: number;
  sourceStandard: string;
  description: string;
}

export interface SummaryStatistics {
  count: number;
  missingCount: number;
  validCount: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  p10: number;
  p90: number;
}

export interface ParameterGlossaryItem {
  key: string;
  name: string;
  domain: 'air' | 'water' | 'climate';
  unit: string;
  standardReference: string;
  explanation: string;
  typicalRange: string;
  ecologicalImpact: string;
}
