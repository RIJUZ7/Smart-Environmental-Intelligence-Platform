/**
 * ECO-SENSE Environmental Data Processing & Statistical Calculations
 * Pure, tested mathematical algorithms for scientific aggregation,
 * summary metrics, and format conversions.
 */

import { EnvironmentalRecord, SummaryStatistics } from '../types/environmental';

/**
 * Computes descriptive statistics for any continuous environmental metric.
 * Handles missing / NaN values honestly without substitution or fabrication.
 */
export function calculateSummaryStatistics(
  records: EnvironmentalRecord[],
  metricKey: keyof EnvironmentalRecord
): SummaryStatistics {
  const values: number[] = [];
  let missingCount = 0;

  for (const r of records) {
    const val = r[metricKey];
    if (val === undefined || val === null || isNaN(val as number)) {
      missingCount++;
    } else {
      values.push(val as number);
    }
  }

  const validCount = values.length;
  if (validCount === 0) {
    return {
      count: records.length,
      missingCount,
      validCount: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      p10: 0,
      p90: 0
    };
  }

  // Sort ascending for rank-based statistics
  values.sort((a, b) => a - b);

  const min = values[0];
  const max = values[values.length - 1];

  // Mean
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / validCount;

  // Standard Deviation (sample std dev if n > 1)
  let variance = 0;
  if (validCount > 1) {
    variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (validCount - 1);
  }
  const stdDev = Math.sqrt(variance);

  // Median and Tukey's hinges for Q1 and Q3
  const getMedian = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  const median = getMedian(values);
  let q1 = values[0];
  let q3 = values[values.length - 1];

  if (validCount > 1) {
    const mid = Math.floor(validCount / 2);
    const lowerHalf = values.slice(0, mid);
    const upperHalf = validCount % 2 === 0 ? values.slice(mid) : values.slice(mid + 1);
    q1 = getMedian(lowerHalf);
    q3 = getMedian(upperHalf);
  }
  const iqr = q3 - q1;

  // Percentile helper using linear interpolation for P10 and P90
  const getPercentile = (p: number): number => {
    if (validCount === 1) return values[0];
    const index = (p / 100) * (validCount - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return values[lower] * (1 - weight) + values[upper] * weight;
  };

  const p10 = getPercentile(10);
  const p90 = getPercentile(90);

  return {
    count: records.length,
    missingCount,
    validCount,
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    q1: Number(q1.toFixed(2)),
    q3: Number(q3.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
    p10: Number(p10.toFixed(2)),
    p90: Number(p90.toFixed(2))
  };
}

export interface AggregatedTimePoint {
  dateKey: string; // YYYY-MM-DD or YYYY-WW or YYYY-MM
  timestamp: string;
  mean: number;
  min: number;
  max: number;
  sum?: number;
  count: number;
  stations: Record<string, number>;
}

/**
 * Aggregates observations into Daily, Weekly, or Monthly time buckets
 */
export function aggregateTimeSeries(
  records: EnvironmentalRecord[],
  metricKey: keyof EnvironmentalRecord,
  granularity: 'raw' | 'daily' | 'weekly' | 'monthly' = 'daily'
): AggregatedTimePoint[] {
  if (granularity === 'raw') {
    return records
      .filter(r => r[metricKey] !== undefined && r[metricKey] !== null && !isNaN(r[metricKey] as number))
      .map(r => ({
        dateKey: r.timestamp,
        timestamp: r.timestamp,
        mean: Number(r[metricKey]),
        min: Number(r[metricKey]),
        max: Number(r[metricKey]),
        count: 1,
        stations: { [r.stationId]: Number(r[metricKey]) }
      }));
  }

  const buckets = new Map<string, { values: number[]; timestamp: string; stationVals: Record<string, number[]> }>();

  for (const r of records) {
    const val = r[metricKey];
    if (val === undefined || val === null || isNaN(val as number)) continue;

    const d = new Date(r.timestamp);
    if (isNaN(d.getTime())) continue; // Ignore unparseable dates safely

    let key: string;
    let bucketTimestamp: string;

    if (granularity === 'daily') {
      key = d.toISOString().slice(0, 10);
      bucketTimestamp = `${key}T12:00:00Z`;
    } else if (granularity === 'weekly') {
      // Weekly: start of week ISO date
      const dayOfWeek = d.getUTCDay();
      const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
      key = startOfWeek.toISOString().slice(0, 10);
      bucketTimestamp = `${key}T12:00:00Z`;
    } else {
      // Monthly: YYYY-MM
      key = d.toISOString().slice(0, 7);
      bucketTimestamp = `${key}-01T12:00:00Z`;
    }

    if (!buckets.has(key)) {
      buckets.set(key, {
        values: [],
        timestamp: bucketTimestamp,
        stationVals: {}
      });
    }

    const b = buckets.get(key)!;
    b.values.push(val as number);
    if (!b.stationVals[r.stationId]) {
      b.stationVals[r.stationId] = [];
    }
    b.stationVals[r.stationId].push(val as number);
  }

  const result: AggregatedTimePoint[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort();

  for (const k of sortedKeys) {
    const b = buckets.get(k)!;
    const vals = b.values;
    const sum = vals.reduce((acc, v) => acc + v, 0);
    const mean = sum / vals.length;
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    const stationMeans: Record<string, number> = {};
    for (const [sId, sVals] of Object.entries(b.stationVals)) {
      const sSum = sVals.reduce((acc, v) => acc + v, 0);
      stationMeans[sId] = Number((sSum / sVals.length).toFixed(2));
    }

    result.push({
      dateKey: k,
      timestamp: b.timestamp,
      mean: Number(mean.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      sum: Number(sum.toFixed(2)),
      count: vals.length,
      stations: stationMeans
    });
  }

  return result;
}

/**
 * Generates an RFC 4180 compliant CSV string from an array of records
 */
export function exportToCsv<T extends Record<string, unknown>>(data: T[], columns?: (keyof T)[]): string {
  if (data.length === 0) return '';

  const headers = columns ? columns : (Object.keys(data[0]) as (keyof T)[]);

  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(h => escapeCell(String(h))).join(',');
  const rows = data.map(row => {
    return headers.map(h => escapeCell(row[h])).join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Triggers a browser file download of CSV content
 */
export function triggerFileDownload(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Computes a parameter distribution histogram for water or air measurements
 */
export function calculateDistributionHistogram(
  records: EnvironmentalRecord[],
  metricKey: keyof EnvironmentalRecord,
  binCount = 8
): { binLabel: string; min: number; max: number; count: number; percentage: number }[] {
  const values = records
    .map(r => r[metricKey])
    .filter((v): v is number => v !== undefined && v !== null && !isNaN(v as number));

  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    return [{
      binLabel: `${min}`,
      min,
      max,
      count: values.length,
      percentage: 100
    }];
  }

  const binWidth = range / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    min: min + i * binWidth,
    max: min + (i + 1) * binWidth,
    count: 0
  }));

  for (const v of values) {
    let placed = false;
    for (let i = 0; i < binCount; i++) {
      if (i === binCount - 1 ? v >= bins[i].min && v <= bins[i].max : v >= bins[i].min && v < bins[i].max) {
        bins[i].count++;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins[binCount - 1].count++;
    }
  }

  return bins.map(b => ({
    binLabel: `${b.min.toFixed(1)} – ${b.max.toFixed(1)}`,
    min: Number(b.min.toFixed(2)),
    max: Number(b.max.toFixed(2)),
    count: b.count,
    percentage: Number(((b.count / values.length) * 100).toFixed(1))
  }));
}

/**
 * Standard Scientific Unit Conversions
 */
export function convertTemperature(celsius: number, toUnit: 'metric' | 'imperial'): number {
  if (toUnit === 'imperial') {
    return Number((celsius * (9 / 5) + 32).toFixed(1));
  }
  return Number(celsius.toFixed(1));
}

export function convertPrecipitation(mm: number, toUnit: 'metric' | 'imperial'): number {
  if (toUnit === 'imperial') {
    return Number((mm / 25.4).toFixed(2));
  }
  return Number(mm.toFixed(1));
}

export function convertWindSpeed(ms: number, toUnit: 'metric' | 'imperial'): number {
  if (toUnit === 'imperial') {
    return Number((ms * 2.23694).toFixed(1));
  }
  return Number(ms.toFixed(1));
}
