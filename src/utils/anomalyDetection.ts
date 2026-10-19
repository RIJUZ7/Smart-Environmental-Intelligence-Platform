/**
 * ECO-SENSE Explainable Environmental Anomaly Detection Engine
 *
 * Implements deterministic, transparent statistical tests:
 * 1. Regulatory & Physical Threshold Violations (advisory, warning, critical)
 * 2. Statistical Outliers via Tukey's Fences (1.5 * IQR)
 * 3. Temporal Rate-of-Change (Abrupt step between consecutive samples)
 * 4. Duplicate Observation Transmissions
 * 5. Temporal Sampling Gaps (Missing data spans exceeding 2x sampling cadence)
 */

import { EnvironmentalRecord, AnomalyRecord, AnomalySeverity } from '../types/environmental';
import { METRIC_THRESHOLDS } from './environmentalStandards';
import { calculateSummaryStatistics } from './dataProcessing';

export interface AnomalyDetectionConfig {
  iqrMultiplier: number;           // Default 1.5 for Tukey outliers
  rateOfChangeStdDevFactor: number;// Default 3.0 standard deviations
  expectedCadenceHours: number;    // Default 6 hours
  enabledMethods: {
    threshold: boolean;
    abrupt_change: boolean;
    iqr_outlier: boolean;
    duplicate_record: boolean;
    data_gap: boolean;
  };
}

export const DEFAULT_DETECTION_CONFIG: AnomalyDetectionConfig = {
  iqrMultiplier: 1.5,
  rateOfChangeStdDevFactor: 3.0,
  expectedCadenceHours: 6,
  enabledMethods: {
    threshold: true,
    abrupt_change: true,
    iqr_outlier: true,
    duplicate_record: true,
    data_gap: true,
  }
};

export function detectEnvironmentalAnomalies(
  records: EnvironmentalRecord[],
  config: AnomalyDetectionConfig = DEFAULT_DETECTION_CONFIG
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  if (records.length === 0) return anomalies;

  // Group records by station to preserve spatial and physical continuity
  const recordsByStation = new Map<string, EnvironmentalRecord[]>();
  for (const r of records) {
    if (!recordsByStation.has(r.stationId)) {
      recordsByStation.set(r.stationId, []);
    }
    recordsByStation.get(r.stationId)!.push(r);
  }

  // Active environmental metrics to test
  const metricsToEvaluate: (keyof EnvironmentalRecord)[] = [
    'pm25', 'pm10', 'no2', 'so2', 'co', 'o3',
    'ph', 'turbidity', 'dissolvedOxygen', 'conductivity', 'waterTemp', 'nitrate',
    'temperature', 'humidity', 'precipitation', 'windSpeed', 'pressure'
  ];

  // 1. DUPLICATE CHECK across all records
  if (config.enabledMethods.duplicate_record) {
    const seenKeys = new Map<string, EnvironmentalRecord>();
    for (const r of records) {
      const key = `${r.stationId}___${r.timestamp}`;
      if (seenKeys.has(key)) {
        anomalies.push({
          id: `anom-dup-${r.id}`,
          recordId: r.id,
          metric: 'duplicate_record',
          metricLabel: 'Transmission Duplicate',
          stationId: r.stationId,
          stationName: r.stationName,
          timestamp: r.timestamp,
          observedValue: 0,
          expectedRange: [0, 0],
          detectionMethod: 'duplicate_record',
          severity: 'advisory',
          explanation: `Identical timestamp transmission detected for station ${r.stationName}. Indicates telemetry re-broadcast or clock synchronization glitch.`,
          acknowledged: false
        });
      } else {
        seenKeys.set(key, r);
      }
    }
  }

  // 2. PER-STATION ANALYSIS (Chronological sequence)
  for (const [stationId, stRecords] of recordsByStation.entries()) {
    // Sort chronologically
    const sorted = [...stRecords].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const stationName = sorted[0]?.stationName || stationId;

    // A. TEMPORAL DATA GAP CHECK
    if (config.enabledMethods.data_gap && sorted.length > 1) {
      const maxGapMs = config.expectedCadenceHours * 2 * 3600 * 1000;
      for (let i = 1; i < sorted.length; i++) {
        const prevTime = new Date(sorted[i - 1].timestamp).getTime();
        const currTime = new Date(sorted[i].timestamp).getTime();
        const deltaMs = currTime - prevTime;

        if (deltaMs > maxGapMs) {
          const gapHours = (deltaMs / (3600 * 1000)).toFixed(1);
          anomalies.push({
            id: `anom-gap-${stationId}-${sorted[i].id}`,
            recordId: sorted[i].id,
            metric: 'data_gap',
            metricLabel: 'Telemetry Data Gap',
            stationId,
            stationName,
            timestamp: sorted[i - 1].timestamp,
            observedValue: Number(gapHours),
            expectedRange: [0, config.expectedCadenceHours * 1.5],
            detectionMethod: 'data_gap',
            severity: Number(gapHours) > 24 ? 'warning' : 'advisory',
            explanation: `Missing telemetry gap of ${gapHours} hours between ${sorted[i - 1].timestamp.slice(0, 16)} and ${sorted[i].timestamp.slice(0, 16)}. Exceeds expected cadence of ${config.expectedCadenceHours}h. Potential station power or network disruption.`,
            acknowledged: false
          });
        }
      }
    }

    // B. METRIC-SPECIFIC CHECKS: Thresholds, IQR, and Rate-of-Change
    for (const metric of metricsToEvaluate) {
      const thresholdDef = METRIC_THRESHOLDS[metric as string];
      if (!thresholdDef) continue;

      // Extract numeric observations for this station & metric
      const validPoints: { record: EnvironmentalRecord; val: number; index: number }[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const val = sorted[i][metric];
        if (val !== undefined && val !== null && !isNaN(val as number)) {
          validPoints.push({ record: sorted[i], val: val as number, index: i });
        }
      }

      if (validPoints.length === 0) continue;

      // Compute statistics for this station/metric
      const stats = calculateSummaryStatistics(sorted, metric);

      // Tukey's fences: [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
      const lowerFence = stats.q1 - config.iqrMultiplier * stats.iqr;
      const upperFence = stats.q3 + config.iqrMultiplier * stats.iqr;

      // Threshold violation checks & IQR outlier checks
      for (let i = 0; i < validPoints.length; i++) {
        const pt = validPoints[i];
        const val = pt.val;
        const rec = pt.record;

        // 1. Configured Standards Threshold Check
        if (config.enabledMethods.threshold) {
          let severity: AnomalySeverity | null = null;
          let thresholdHit: number | undefined;
          let limitType = 'upper';

          // Critical checks
          if (thresholdDef.criticalMax !== undefined && val >= thresholdDef.criticalMax) {
            severity = 'critical';
            thresholdHit = thresholdDef.criticalMax;
          } else if (thresholdDef.criticalMin !== undefined && val <= thresholdDef.criticalMin) {
            severity = 'critical';
            thresholdHit = thresholdDef.criticalMin;
            limitType = 'lower';
          }
          // Warning checks
          else if (thresholdDef.warningMax !== undefined && val >= thresholdDef.warningMax) {
            severity = 'warning';
            thresholdHit = thresholdDef.warningMax;
          } else if (thresholdDef.warningMin !== undefined && val <= thresholdDef.warningMin) {
            severity = 'warning';
            thresholdHit = thresholdDef.warningMin;
            limitType = 'lower';
          }
          // Advisory checks
          else if (thresholdDef.advisoryMax !== undefined && val >= thresholdDef.advisoryMax) {
            severity = 'advisory';
            thresholdHit = thresholdDef.advisoryMax;
          } else if (thresholdDef.advisoryMin !== undefined && val <= thresholdDef.advisoryMin) {
            severity = 'advisory';
            thresholdHit = thresholdDef.advisoryMin;
            limitType = 'lower';
          }

          if (severity && thresholdHit !== undefined) {
            anomalies.push({
              id: `anom-thresh-${rec.id}-${metric}`,
              recordId: rec.id,
              metric: String(metric),
              metricLabel: thresholdDef.label,
              stationId,
              stationName,
              timestamp: rec.timestamp,
              observedValue: val,
              expectedRange: [
                thresholdDef.advisoryMin ?? thresholdDef.physicalMin,
                thresholdDef.advisoryMax ?? thresholdDef.physicalMax
              ],
              baselineValue: stats.median,
              detectionMethod: 'threshold',
              severity,
              explanation: `Observed ${val} ${thresholdDef.unit} breaches the ${severity} ${limitType} limit (${thresholdHit} ${thresholdDef.unit}) based on ${thresholdDef.sourceStandard}. This is an observational signal warranting field verification.`,
              acknowledged: false
            });
          }
        }

        // 2. Statistical IQR Outlier Check (Tukey's Fences)
        if (config.enabledMethods.iqr_outlier && validPoints.length >= 8 && stats.iqr > 0) {
          if (val > upperFence || val < lowerFence) {
            // Determine severity based on distance from fence
            const distance = val > upperFence ? val - upperFence : lowerFence - val;
            const severity: AnomalySeverity = distance > 2 * stats.iqr ? 'warning' : 'advisory';

            anomalies.push({
              id: `anom-iqr-${rec.id}-${metric}`,
              recordId: rec.id,
              metric: String(metric),
              metricLabel: thresholdDef.label,
              stationId,
              stationName,
              timestamp: rec.timestamp,
              observedValue: val,
              expectedRange: [Number(lowerFence.toFixed(2)), Number(upperFence.toFixed(2))],
              baselineValue: stats.median,
              detectionMethod: 'iqr_outlier',
              severity,
              explanation: `Value of ${val} ${thresholdDef.unit} is a statistical outlier outside the interquartile range bounds [${lowerFence.toFixed(1)}, ${upperFence.toFixed(1)} ${thresholdDef.unit}]. Represents an extreme deviation from local median (${stats.median} ${thresholdDef.unit}).`,
              acknowledged: false
            });
          }
        }

        // 3. Abrupt Rate-of-Change Check between consecutive readings
        if (config.enabledMethods.abrupt_change && i > 0 && stats.stdDev > 0) {
          const prevVal = validPoints[i - 1].val;
          const delta = Math.abs(val - prevVal);
          const thresholdDelta = config.rateOfChangeStdDevFactor * stats.stdDev;

          if (delta > thresholdDelta) {
            const severity: AnomalySeverity = delta > (config.rateOfChangeStdDevFactor + 1.5) * stats.stdDev ? 'warning' : 'advisory';
            anomalies.push({
              id: `anom-roc-${rec.id}-${metric}`,
              recordId: rec.id,
              metric: String(metric),
              metricLabel: thresholdDef.label,
              stationId,
              stationName,
              timestamp: rec.timestamp,
              observedValue: val,
              expectedRange: [
                Number((prevVal - thresholdDelta).toFixed(2)),
                Number((prevVal + thresholdDelta).toFixed(2))
              ],
              baselineValue: prevVal,
              detectionMethod: 'abrupt_change',
              severity,
              explanation: `Abrupt step shift of ${delta.toFixed(1)} ${thresholdDef.unit} from previous reading (${prevVal} → ${val} ${thresholdDef.unit}). Exceeds 3σ standard-deviation rate threshold (${thresholdDelta.toFixed(1)}). May indicate physical surge or sensor calibration step.`,
              acknowledged: false
            });
          }
        }
      }
    }
  }

  // Sort anomalies: critical first, then warning, then advisory; newest first
  const severityRank = { critical: 3, warning: 2, advisory: 1 };
  anomalies.sort((a, b) => {
    const sDiff = severityRank[b.severity] - severityRank[a.severity];
    if (sDiff !== 0) return sDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return anomalies;
}
