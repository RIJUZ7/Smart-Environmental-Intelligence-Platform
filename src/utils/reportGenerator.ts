/**
 * ECO-SENSE Environmental Field Report Generator
 *
 * Implements deterministic scientific report synthesis and prompt construction:
 * - Anti-hallucination grounding in factual summary statistics
 * - Rule-based local synthesis fallback when API key is unavailable or offline
 * - Rigorous 5-part scientific structure adhering to observatory guidelines
 */

import { DatasetMetadata, EnvironmentalRecord, AnomalyRecord } from '../types/environmental';
import { calculateSummaryStatistics } from './dataProcessing';

export interface ReportGenerationInput {
  reportType: string;
  datasetMeta: DatasetMetadata;
  records: EnvironmentalRecord[];
  anomalies: AnomalyRecord[];
  dateRange: { start: string; end: string };
  selectedStation: string;
  customPrompt?: string;
}

export function generateDeterministicFieldReport(input: ReportGenerationInput): string {
  const {
    reportType,
    datasetMeta,
    records,
    anomalies,
    dateRange,
    selectedStation,
    customPrompt
  } = input;

  const pm25Stats = calculateSummaryStatistics(records, 'pm25');
  const pm10Stats = calculateSummaryStatistics(records, 'pm10');
  const phStats = calculateSummaryStatistics(records, 'ph');
  const doStats = calculateSummaryStatistics(records, 'dissolvedOxygen');
  const turbidityStats = calculateSummaryStatistics(records, 'turbidity');
  const tempStats = calculateSummaryStatistics(records, 'temperature');
  const rainStats = calculateSummaryStatistics(records, 'precipitation');

  const reportTypeTitles: Record<string, string> = {
    executive_field_summary: 'EXECUTIVE FIELD OBSERVATORY SUMMARY',
    air_quality_brief: 'AIR QUALITY & AMBIENT POLLUTANT INVESTIGATION',
    water_quality_brief: 'HYDROLOGICAL & WATERSHED CATCHMENT ASSESSMENT',
    anomaly_investigation_brief: 'ANOMALY & SENSOR ARTIFACT FORENSIC DOSSIER',
    data_quality_audit: 'OBSERVATORY TELEMETRY & DATA QUALITY AUDIT'
  };

  const title = reportTypeTitles[reportType] || 'ENVIRONMENTAL FIELD REPORT';
  const provenanceLabel = datasetMeta.provenance === 'demo'
    ? 'DEMONSTRATION DATASET (SYNTHETIC BENCHMARK)'
    : 'IMPORTED FIELD TELEMETRY';

  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
  const warningAnomalies = anomalies.filter(a => a.severity === 'warning');
  const advisoryAnomalies = anomalies.filter(a => a.severity === 'advisory');

  let report = `# ${title}
**Observatory Dataset:** ${datasetMeta.title}  
**Provenance Status:** ${provenanceLabel}  
**Monitoring Scope:** Station ${selectedStation} (${records.length} valid observations)  
**Temporal Span:** ${dateRange.start.slice(0, 16)} to ${dateRange.end.slice(0, 16)}  
**Report Synthesis Engine:** ECO-SENSE Deterministic Scientific Fallback Engine  
**Generation Timestamp:** ${new Date().toISOString()}  

---

## 1. OBSERVATORY EXECUTIVE SUMMARY
During the evaluated observation window, a total of ${records.length} observational records were processed across monitored environmental domains. The active dataset demonstrates an overall Data Quality Index of **${datasetMeta.dataQualityScore}/100** (Completeness: ${datasetMeta.qualityBreakdown?.completeness ?? 'N/A'}%, Validity: ${datasetMeta.qualityBreakdown?.validity ?? 'N/A'}%, Consistency: ${datasetMeta.qualityBreakdown?.consistency ?? 'N/A'}%).

A total of **${anomalies.length} anomaly conditions** were identified using multi-method statistical verification:
- **Critical Threshold Breaches:** ${criticalAnomalies.length}
- **Warning Outliers / Gaps:** ${warningAnomalies.length}
- **Advisory / Informational Events:** ${advisoryAnomalies.length}

${customPrompt ? `> **Analyst Special Focus:** ${customPrompt}\n` : ''}

## 2. METEOROLOGICAL & CHEMICAL PATTERNS
Factual statistical summaries computed across active continuous parameters:

### Air Quality Observations
- **Fine Particulate Matter (PM2.5):** Mean = ${pm25Stats.mean} µg/m³, Median = ${pm25Stats.median} µg/m³, Range = [${pm25Stats.min}, ${pm25Stats.max}] µg/m³ across ${pm25Stats.validCount} valid samples. ${pm25Stats.missingCount > 0 ? `(${pm25Stats.missingCount} observations missing/unrecorded).` : ''}
- **Coarse Particulate Matter (PM10):** Mean = ${pm10Stats.mean} µg/m³, Median = ${pm10Stats.median} µg/m³, Max = ${pm10Stats.max} µg/m³ across ${pm10Stats.validCount} valid samples.

### Water Quality Observations
- **pH:** Mean = ${phStats.mean} pH units (Min = ${phStats.min}, Max = ${phStats.max}) across ${phStats.validCount} valid measurements.
- **Dissolved Oxygen:** Mean = ${doStats.mean} mg/L, Min = ${doStats.min} mg/L, Max = ${doStats.max} mg/L.
- **Turbidity:** Mean = ${turbidityStats.mean} NTU, Max = ${turbidityStats.max} NTU across ${turbidityStats.validCount} samples.

### Meteorological & Climate Conditions
- **Ambient Air Temperature:** Mean = ${tempStats.mean} °C (Min = ${tempStats.min} °C, Max = ${tempStats.max} °C).
- **Precipitation Accumulation:** Maximum event precipitation recorded at ${rainStats.max} mm.

## 3. DETECTED ANOMALY EVALUATION & MECHANISMS
Analysis of primary anomalous behavior flagged by automated explainable detection algorithms:
${anomalies.length === 0 ? '- No anomalous departures or threshold violations detected in current scope.' : ''}
${anomalies.slice(0, 10).map((a, i) => `
${i + 1}. **[${a.severity.toUpperCase()}] ${a.metricLabel || a.metric} at ${a.stationName}** (${a.timestamp.slice(0, 16)})
   - **Observed Value:** ${a.observedValue} (Expected baseline: ${a.expectedRange ? `[${a.expectedRange[0]}, ${a.expectedRange[1]}]` : 'nominal'})
   - **Detection Method:** ${a.detectionMethod.replace(/_/g, ' ')}
   - **Scientific Explanation:** ${a.explanation}
`).join('')}

## 4. DATA QUALITY, COMPLETENESS & LIMITATIONS
1. **Provenance Notice:** ${datasetMeta.provenance === 'demo' ? 'This report analyzes a controlled synthetic baseline created for verification. Do not cite for real-world public health enforcement.' : 'This report reflects user-ingested observation telemetry validated against physical sensor boundaries.'}
2. **Missing Observation Audit:** Missing counts recorded — PM2.5 (${pm25Stats.missingCount}), pH (${phStats.missingCount}), Dissolved Oxygen (${doStats.missingCount}), Temperature (${tempStats.missingCount}).
3. **Temporal Continuity:** Sampling cadence intervals were analyzed; ${anomalies.filter(a => a.detectionMethod === 'data_gap').length} temporal data gaps exceeded the expected sampling threshold.

## 5. RECOMMENDED SCIENTIFIC FOLLOW-UPS
1. **Instrument Calibration Check:** Review sensor calibration records for stations exhibiting critical threshold departures or abrupt steps.
2. **Field Verification:** Deploy hydrological or atmospheric grab-sampling to cross-validate automated optical sensor measurements during peak turbidity or particulate pulses.
3. **Telemetry Redundancy:** Inspect power supply and cellular/satellite transceiver logs for stations with identified data gaps.

---
*Notice: Synthesized by ECO-SENSE Observatory Scientific Engine (${new Date().toISOString()}). All interpretations require certified environmental scientist review.*`;

  return report;
}
