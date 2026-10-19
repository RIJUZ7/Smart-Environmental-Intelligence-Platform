/**
 * ECO-SENSE Environmental Standards & Reference Benchmarks
 * All thresholds and equations are grounded in verified scientific standards:
 * - WHO Air Quality Guidelines (2021 update)
 * - US EPA National Ambient Air Quality Standards (NAAQS) & 40 CFR Part 58
 * - USGS National Field Manual for the Collection of Water-Quality Data
 * - EU Water Framework Directive (2000/60/EC)
 */

import { MetricThreshold, ParameterGlossaryItem } from '../types/environmental';

export const METRIC_THRESHOLDS: Record<string, MetricThreshold> = {
  pm25: {
    metric: 'pm25',
    label: 'PM2.5 (Fine Particulate)',
    unit: 'µg/m³',
    domain: 'air',
    physicalMin: 0,
    physicalMax: 1000,
    advisoryMax: 15.0,  // WHO 24-hr guideline (15 µg/m³)
    warningMax: 35.4,   // US EPA 24-hr standard Moderate threshold
    criticalMax: 55.4,  // US EPA Unhealthy for Sensitive Groups upper bound
    sourceStandard: 'WHO 2021 Global Air Quality Guidelines / US EPA NAAQS',
    description: 'Fine inhalable particles with diameters 2.5 micrometers and smaller. Capable of penetrating deep into alveolar tissue.'
  },
  pm10: {
    metric: 'pm10',
    label: 'PM10 (Coarse Particulate)',
    unit: 'µg/m³',
    domain: 'air',
    physicalMin: 0,
    physicalMax: 2000,
    advisoryMax: 45.0,  // WHO 24-hr guideline
    warningMax: 154.0,  // US EPA 24-hr standard
    criticalMax: 254.0, // Unhealthy threshold
    sourceStandard: 'WHO 2021 Air Quality Guidelines / US EPA 40 CFR Part 50',
    description: 'Inhalable particles with diameters 10 micrometers and smaller from dust, pollen, and industrial emissions.'
  },
  no2: {
    metric: 'no2',
    label: 'Nitrogen Dioxide (NO₂)',
    unit: 'ppb',
    domain: 'air',
    physicalMin: 0,
    physicalMax: 1000,
    advisoryMax: 25.0,  // ~WHO 24-hr equivalent (25 µg/m³ ≈ 13.3 ppb, 1-hr WHO ≈ 53 ppb)
    warningMax: 53.0,   // US EPA 1-hour primary NAAQS 100 ppb; 53 ppb annual
    criticalMax: 100.0,
    sourceStandard: 'US EPA NAAQS / WHO Ambient Air Quality 2021',
    description: 'Reactive gas formed by high-temperature combustion in vehicles and power generation; precursor to photochemical smog.'
  },
  so2: {
    metric: 'so2',
    label: 'Sulfur Dioxide (SO₂)',
    unit: 'ppb',
    domain: 'air',
    physicalMin: 0,
    physicalMax: 1000,
    advisoryMax: 20.0,
    warningMax: 75.0,   // US EPA 1-hr primary standard is 75 ppb
    criticalMax: 185.0,
    sourceStandard: 'US EPA 40 CFR Part 50 (75 ppb 1-hr standard)',
    description: 'Gaseous pollutant originating from fossil fuel combustion containing sulfur (coal, diesel) and ore smelting.'
  },
  co: {
    metric: 'co',
    label: 'Carbon Monoxide (CO)',
    unit: 'ppm',
    domain: 'air',
    physicalMin: 0,
    physicalMax: 200,
    advisoryMax: 4.4,
    warningMax: 9.4,    // US EPA 8-hr standard 9 ppm
    criticalMax: 15.4,
    sourceStandard: 'US EPA 8-hour National Ambient Air Quality Standard',
    description: 'Colorless, odorless gas produced by incomplete combustion of carbon-based fuels.'
  },
  o3: {
    metric: 'o3',
    label: 'Tropospheric Ozone (O₃)',
    unit: 'ppb',
    domain: 'air',
    physicalMin: 0,
    physicalMax: 500,
    advisoryMax: 54.0,  // WHO 8-hr peak season 60 µg/m³
    warningMax: 70.0,   // US EPA 8-hr NAAQS standard (70 ppb)
    criticalMax: 85.0,  // US EPA Unhealthy threshold
    sourceStandard: 'US EPA 2015 8-Hour Ozone NAAQS (70 ppb)',
    description: 'Secondary pollutant produced when nitrogen oxides (NOx) react with volatile organic compounds (VOCs) in sunlight.'
  },

  // Water Quality
  ph: {
    metric: 'ph',
    label: 'pH Level',
    unit: 'pH',
    domain: 'water',
    physicalMin: 0,
    physicalMax: 14,
    advisoryMin: 6.5,
    advisoryMax: 8.5,
    warningMin: 6.0,
    warningMax: 9.0,
    criticalMin: 5.5,
    criticalMax: 9.5,
    sourceStandard: 'USGS National Field Manual & EPA Freshwater Aquatic Life Criteria',
    description: 'Measurement of hydrogen ion concentration. Healthy freshwater ecosystems typically sustain between 6.5 and 8.5.'
  },
  turbidity: {
    metric: 'turbidity',
    label: 'Turbidity',
    unit: 'NTU',
    domain: 'water',
    physicalMin: 0,
    physicalMax: 1000,
    advisoryMax: 5.0,   // WHO Drinking Water standard (5 NTU)
    warningMax: 15.0,   // EPA Aquatic protection standard
    criticalMax: 30.0,  // Severe sediment runoff / erosion threshold
    sourceStandard: 'USGS Office of Water Quality / WHO Water Safety Guidelines',
    description: 'Cloudiness or haziness of fluid caused by large numbers of suspended particles invisible to the naked eye.'
  },
  dissolvedOxygen: {
    metric: 'dissolvedOxygen',
    label: 'Dissolved Oxygen (DO)',
    unit: 'mg/L',
    domain: 'water',
    physicalMin: 0,
    physicalMax: 20,
    criticalMin: 2.0,   // Severe Hypoxia / fish kill threshold (< 2 mg/L)
    warningMin: 4.0,    // Impairment threshold for warmwater species
    advisoryMin: 6.5,   // Optimal healthy stream support threshold (> 6.5 mg/L)
    sourceStandard: 'US EPA Ambient Water Quality Criteria for Dissolved Oxygen',
    description: 'Concentration of free, non-compound oxygen molecules dissolved in water; indispensable for aquatic respiration.'
  },
  conductivity: {
    metric: 'conductivity',
    label: 'Specific Conductivity',
    unit: 'µS/cm',
    domain: 'water',
    physicalMin: 0,
    physicalMax: 50000,
    advisoryMax: 500.0,  // Baseline pristine freshwater
    warningMax: 1000.0, // Agricultural runoff / saline intrusion
    criticalMax: 2000.0,
    sourceStandard: 'USGS Benchmark for Inland Freshwater Aquatic Communities',
    description: 'Electrical conductivity of water normalized to 25°C, serving as a direct proxy for dissolved ionic solutes and salinity.'
  },
  waterTemp: {
    metric: 'waterTemp',
    label: 'Water Temperature',
    unit: '°C',
    domain: 'water',
    physicalMin: -2,
    physicalMax: 50,
    advisoryMax: 21.0,  // Coldwater aquatic criteria
    warningMax: 25.0,
    criticalMax: 28.0,
    sourceStandard: 'US EPA Temperature Criteria for Freshwater Habitats',
    description: 'Water temperature influences chemical reaction rates, oxygen solubility, and biological metabolic rates.'
  },
  nitrate: {
    metric: 'nitrate',
    label: 'Nitrate (NO₃-N)',
    unit: 'mg/L',
    domain: 'water',
    physicalMin: 0,
    physicalMax: 100,
    advisoryMax: 3.0,   // Natural unimpacted stream background
    warningMax: 10.0,   // US EPA Maximum Contaminant Level (MCL) for drinking water
    criticalMax: 20.0,  // Eutrophication hazard
    sourceStandard: 'US EPA Safe Drinking Water Act (MCL 10 mg/L as N)',
    description: 'Essential nutrient commonly entering waterways through synthetic nitrogen fertilizer runoff, animal waste, and wastewater.'
  },

  // Climate
  temperature: {
    metric: 'temperature',
    label: 'Ambient Air Temperature',
    unit: '°C',
    domain: 'climate',
    physicalMin: -60,
    physicalMax: 60,
    advisoryMin: 0,
    advisoryMax: 35,
    warningMin: -15,
    warningMax: 40,
    criticalMin: -30,
    criticalMax: 46,
    sourceStandard: 'WMO Guide to Meteorological Instruments and Methods of Observation',
    description: 'Standard screen-level ambient dry-bulb temperature measured at 1.5 to 2 meters above ground level.'
  },
  humidity: {
    metric: 'humidity',
    label: 'Relative Humidity',
    unit: '%',
    domain: 'climate',
    physicalMin: 0,
    physicalMax: 100,
    sourceStandard: 'WMO Guide to Meteorological Instruments',
    description: 'Ratio of current absolute vapor pressure to the saturation vapor pressure at the current temperature.'
  },
  precipitation: {
    metric: 'precipitation',
    label: 'Precipitation',
    unit: 'mm',
    domain: 'climate',
    physicalMin: 0,
    physicalMax: 500,
    warningMax: 25.0, // Heavy rain alert (> 25mm in 1h or short period)
    criticalMax: 50.0, // Flash flood hazard threshold
    sourceStandard: 'WMO Hydro-Meteorological Classifications',
    description: 'Depth of water equivalent accumulating on a flat surface over the specified observation interval.'
  },
  windSpeed: {
    metric: 'windSpeed',
    label: 'Wind Speed',
    unit: 'm/s',
    domain: 'climate',
    physicalMin: 0,
    physicalMax: 100,
    warningMax: 17.2, // Beaufort 8: Fresh Gale (17.2–20.7 m/s)
    criticalMax: 24.5, // Beaufort 10: Storm (>24.5 m/s)
    sourceStandard: 'WMO Beaufort Wind Scale',
    description: 'Horizontal speed of air movement measured at standard 10m mast elevation.'
  },
  pressure: {
    metric: 'pressure',
    label: 'Barometric Pressure',
    unit: 'hPa',
    domain: 'climate',
    physicalMin: 800,
    physicalMax: 1100,
    sourceStandard: 'WMO Barometry Standards',
    description: 'Atmospheric pressure exerted by the weight of air in the Earth atmosphere.'
  }
};

/**
 * US EPA Air Quality Index (AQI) Breakpoint Definition
 * Equation: Ip = [(Ihi - Ilo) / (BPhi - BPlo)] * (Cp - BPlo) + Ilo
 * Source: 40 CFR Part 58, Appendix G
 */
interface AQIBreakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
  category: string;
  colorHex: string;
}

export const PM25_AQI_BREAKPOINTS: AQIBreakpoint[] = [
  { cLow: 0.0,   cHigh: 12.0,  iLow: 0,   iHigh: 50,  category: 'Good',                            colorHex: '#315C45' },
  { cLow: 12.1,  cHigh: 35.4,  iLow: 51,  iHigh: 100, category: 'Moderate',                        colorHex: '#82966B' },
  { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', colorHex: '#B78A4D' },
  { cLow: 55.5,  cHigh: 150.4, iLow: 151, iHigh: 200, category: 'Unhealthy',                       colorHex: '#C77938' },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'Very Unhealthy',                  colorHex: '#B64D43' },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'Hazardous',                       colorHex: '#6F2B2B' },
];

/**
 * Calculates US EPA AQI for PM2.5 with proper truncation and rounding.
 * Note: Real regulatory AQI requires a 24-hour truncated average. When computed on
 * instantaneous/hourly observations, it represents the "NowCast" or instantaneous proxy.
 */
export function calculatePM25AQI(concentration: number): {
  aqi: number;
  category: string;
  colorHex: string;
  isTruncated: boolean;
} {
  if (concentration < 0 || isNaN(concentration)) {
    return { aqi: 0, category: 'Invalid Observation', colorHex: '#68756B', isTruncated: false };
  }

  // EPA truncation: PM2.5 concentration is truncated to one decimal place
  const truncatedC = Math.floor(concentration * 10) / 10;

  for (const bp of PM25_AQI_BREAKPOINTS) {
    if (truncatedC >= bp.cLow && truncatedC <= bp.cHigh) {
      const aqiValue = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (truncatedC - bp.cLow) + bp.iLow;
      return {
        aqi: Math.round(aqiValue),
        category: bp.category,
        colorHex: bp.colorHex,
        isTruncated: true
      };
    }
  }

  // If exceeds highest breakpoint
  if (truncatedC > 500.4) {
    return { aqi: 500, category: 'Hazardous (Beyond Scale)', colorHex: '#6F2B2B', isTruncated: true };
  }

  return { aqi: 0, category: 'Good', colorHex: '#315C45', isTruncated: true };
}

/**
 * Scientific Parameter Glossary
 */
export const PARAMETER_GLOSSARY: ParameterGlossaryItem[] = [
  {
    key: 'pm25',
    name: 'Particulate Matter ≤ 2.5 µm',
    domain: 'air',
    unit: 'µg/m³',
    standardReference: 'WHO 2021 (15 µg/m³ 24h) / US EPA NAAQS (35 µg/m³ 24h)',
    explanation: 'Combustion by-products from vehicles, wildfires, and factories. Suspended microscopic aerosols capable of lodging deep into the pulmonary alveolar sacs and vascular bloodstream.',
    typicalRange: '2 – 150 µg/m³ (clean baseline 3–10 µg/m³)',
    ecologicalImpact: 'Causes regional haze, alters radiative atmospheric forcing, and deposits heavy metals on canopy foliage.'
  },
  {
    key: 'pm10',
    name: 'Particulate Matter ≤ 10 µm',
    domain: 'air',
    unit: 'µg/m³',
    standardReference: 'WHO 2021 (45 µg/m³ 24h) / US EPA NAAQS (150 µg/m³ 24h)',
    explanation: 'Coarse dust, pollen, crushed rock, and mechanical wear debris that irritates the upper respiratory tract.',
    typicalRange: '5 – 300 µg/m³',
    ecologicalImpact: 'Accelerates abrasion of leaf stomata and reduces photosynthetic efficiency.'
  },
  {
    key: 'no2',
    name: 'Nitrogen Dioxide',
    domain: 'air',
    unit: 'ppb',
    standardReference: 'US EPA NAAQS 100 ppb 1-hr / WHO 25 µg/m³ 24h',
    explanation: 'Pungent reddish-brown gas produced primarily from diesel and petrol engines; primary chemical driver of photochemical smog and nitric acid deposition.',
    typicalRange: '2 – 80 ppb',
    ecologicalImpact: 'Precursor to ground-level ozone; contributes to acid precipitation and nitrogen eutrophication in soils.'
  },
  {
    key: 'ph',
    name: 'Water pH (Hydrogen Ion Activity)',
    domain: 'water',
    unit: 'pH units',
    standardReference: 'USGS Freshwater Benchmark (6.5 – 8.5 pH)',
    explanation: 'Logarithmic scale of hydronium ion activity. Waters with pH < 6.5 dissolve toxic heavy metals like aluminum; waters > 8.5 form ammonia toxicity.',
    typicalRange: '6.5 – 8.5 for unpolluted inland waterways',
    ecologicalImpact: 'Controls speciation of heavy metals, enzyme kinetics of aquatic fauna, and reproductive viability of salmonids.'
  },
  {
    key: 'dissolvedOxygen',
    name: 'Dissolved Oxygen (DO)',
    domain: 'water',
    unit: 'mg/L',
    standardReference: 'EPA Aquatic Life (> 6.5 mg/L coldwater; < 2.0 mg/L hypoxia)',
    explanation: 'Amount of free molecular oxygen available in aqueous solution for gill respiration. Depleted by organic matter decomposition (BOD) and elevated temperature.',
    typicalRange: '4.0 – 12.0 mg/L (hypoxic < 2.0 mg/L, saturated 10–14 mg/L at cold temps)',
    ecologicalImpact: 'Defines biological carrying capacity. Low DO leads to massive invertebrate die-offs and fish kills.'
  },
  {
    key: 'turbidity',
    name: 'Turbidity (Optical Clarity)',
    domain: 'water',
    unit: 'NTU',
    standardReference: 'WHO Drinking < 5 NTU / EPA Aquatic Benchmark < 25 NTU',
    explanation: 'Light-scattering caused by suspended clays, silts, plankton, and organic colloids. Spikes during heavy surface runoff and bank erosion.',
    typicalRange: '0.5 – 50 NTU (storm surges up to 200+ NTU)',
    ecologicalImpact: 'Smothers benthic gravel beds where fish spawn and inhibits light penetration required for submerged macrophyte photosynthesis.'
  },
  {
    key: 'conductivity',
    name: 'Specific Electrical Conductivity',
    domain: 'water',
    unit: 'µS/cm',
    standardReference: 'USGS Baseline: 50 – 1500 µS/cm',
    explanation: 'Capacity of an aqueous solution to conduct an electric current, directly proportional to dissolved mineral salts (calcium, magnesium, chloride, sulfates).',
    typicalRange: '50 – 1200 µS/cm in inland rivers',
    ecologicalImpact: 'Drastic changes signal road salt runoff, agricultural fertilizer leach, or municipal effluent discharge.'
  },
  {
    key: 'nitrate',
    name: 'Nitrate-Nitrogen (NO₃-N)',
    domain: 'water',
    unit: 'mg/L',
    standardReference: 'EPA Primary Drinking Water MCL: 10 mg/L NO₃-N',
    explanation: 'Soluble oxidized nitrogen compound readily carried by surface runoff from synthetic fertilizers and manure.',
    typicalRange: '0.1 – 5.0 mg/L in clean streams; > 10 mg/L in impacted agricultural watersheds',
    ecologicalImpact: 'Primary limiting nutrient trigger for explosive algal blooms, toxic cyanobacteria, and subsequent bottom-water hypoxia.'
  }
];

/**
 * Computes an honest Data Quality Index with transparent formula:
 * Score = 0.40 * Completeness + 0.35 * Validity + 0.15 * Consistency + 0.10 * Timeliness
 *
 * Missing data, out-of-range sensor glitches, and duplicated transmissions are penalized explicitly.
 */
export function calculateDatasetQualityScore(
  totalExpectedRows: number,
  validRows: number,
  missingCells: number,
  totalCells: number,
  duplicateRows: number,
  gapCount: number
): {
  overallScore: number;
  breakdown: { completeness: number; validity: number; consistency: number; timeliness: number };
  methodologyNotes: string[];
} {
  if (totalExpectedRows === 0 || totalCells === 0) {
    return {
      overallScore: 0,
      breakdown: { completeness: 0, validity: 0, consistency: 0, timeliness: 0 },
      methodologyNotes: ['No records provided in dataset for quality evaluation.']
    };
  }

  // Completeness: (total non-missing cells / total cells)
  const completeness = Math.max(0, Math.min(100, Math.round(((totalCells - missingCells) / totalCells) * 100)));

  // Validity: (valid rows / total expected rows)
  const validity = Math.max(0, Math.min(100, Math.round((validRows / totalExpectedRows) * 100)));

  // Consistency: penalize duplicates
  const duplicatePenalty = (duplicateRows / totalExpectedRows) * 100;
  const consistency = Math.max(0, Math.min(100, Math.round(100 - duplicatePenalty * 3)));

  // Timeliness: penalize unexpected sampling gaps (> 2x regular cadence)
  const gapPenalty = Math.min(60, gapCount * 10);
  const timeliness = Math.max(0, Math.min(100, Math.round(100 - gapPenalty)));

  // Weighted composite score
  const overallScore = Math.round(
    completeness * 0.4 +
    validity * 0.35 +
    consistency * 0.15 +
    timeliness * 0.10
  );

  const notes = [
    `Completeness (${completeness}%): ${totalCells - missingCells} valid measurement cells out of ${totalCells} expected observation slots.`,
    `Validity (${validity}%): ${validRows} out of ${totalExpectedRows} records conform to instrument physical boundaries.`,
    `Consistency (${consistency}%): ${duplicateRows} duplicate transmission timestamps identified and isolated.`,
    `Temporal Fidelity (${timeliness}%): ${gapCount} data gaps identified exceeding regular observation cadence.`
  ];

  return {
    overallScore,
    breakdown: { completeness, validity, consistency, timeliness },
    methodologyNotes: notes
  };
}
