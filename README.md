# ECO-SENSE — Environmental Intelligence & Climate Analytics Platform

**Portfolio Project 07 · Field Observatory Architecture**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-315C45.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-477D92.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-82966B.svg)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested%20with-Vitest-B78A4D.svg)](https://vitest.dev/)

---

## 1. Project Overview

**ECO-SENSE** is an environmental data observatory and intelligence platform designed to ingest, validate, analyze, and synthesize air quality, surface water chemistry, and microclimate datasets into evidence-based field reports.

Built under the **"Field Observatory"** design constitution, the interface rejects generic SaaS card templates in favor of a tactile, high-density scientific instrument layout with fine borders, disciplined typography (`Barlow Condensed`, `IBM Plex Sans`, and `IBM Plex Mono`), and earth-toned semantic palettes.

---

## 2. Key Capabilities

- **Observatory Field Report (Overview):**
  - Regional transect station monitoring with real-time parameter readouts.
  - Multi-parameter chronological area charts with threshold overlays.
  - Interactive spatial coordinate mesh and elevation transect plotter.
  - Real-time explainable anomaly ticker and telemetry log.
- **Air Quality Intelligence:**
  - Standard-referenced tracking for PM2.5, PM10, NO₂, SO₂, CO, and O₃.
  - Authentic US EPA Air Quality Index (AQI) NowCast calculation adhering to 40 CFR Part 58 Appendix G piecewise linear interpolation.
  - Multi-station comparative analysis.
  - WHO 2021 24-hour guidelines and EPA primary NAAQS reference limits.
- **Water Quality Intelligence:**
  - Dynamic discovery of hydrological parameters (pH, Turbidity, Dissolved Oxygen, Specific Conductivity, Water Temperature, Nitrate).
  - USGS National Field Manual benchmarks and EPA Freshwater Aquatic Life criteria.
  - Out-of-range exceedance auditing and observation density distribution histograms.
  - Ecological and biotic impact glossaries.
- **Climate & Weather Analytics:**
  - Diurnal thermal envelopes (Daily/Weekly Min · Mean · Max bands).
  - Hydrometeorological hyetographs and cumulative mass precipitation curves.
  - Explicit labeling: *Historical observation analysis — no speculative forecasting without physical numerical weather modeling.*
- **Explainable Anomaly Explorer:**
  - Deterministic statistical outlier identification using Tukey's Fences ($1.5 \times \text{IQR}$).
  - Abrupt step rate-of-change detection ($3.0\sigma$ standard deviation velocity).
  - Regulatory threshold limit breaches.
  - Telemetry cadence gap detection ($> 2\times$ sampling interval).
  - Transmission duplicate detection.
  - Analyst review and acknowledgment workflow with persistent audit notes.
- **Guided 7-Step Data Import & Validation Engine:**
  - Automated column alias heuristics with manual overrides.
  - Multi-format timestamp parsing (ISO 8601, RFC 2822, YYYY-MM-DD HH:mm, US format).
  - Physical and instrument boundary validation.
  - Rejection logging with downloadable rejected-row CSV and full JSON audit logs.
  - Bundled sample templates for EPA Air Quality, USGS River Catchment, and NOAA Weather.
- **AI-Assisted Field Reports (Gemini API):**
  - Server-side invocation of `gemini-3.8-flash` via `@google/genai`.
  - Grounded strictly in factual calculated statistics and detected anomalies without hallucinating unobserved measurements or causal medical claims.
  - Exportable to Markdown, Print, or PDF formats.
- **Auditable Data Quality Index (DQI):**
  - Transparent mathematical formula:
    $$\text{DQI} = 0.40(\text{Completeness}) + 0.35(\text{Validity}) + 0.15(\text{Consistency}) + 0.10(\text{Timeliness})$$

---

## 3. Architecture & Directory Structure

```
├── server.ts                    # Express backend + Vite dev middleware & server-side Gemini endpoint
├── src/
│   ├── App.tsx                  # Root application router and shell layout
│   ├── main.tsx                 # Client entrypoint
│   ├── index.css                # Field Observatory theme (@theme variables and font tokens)
│   ├── context/
│   │   └── ObservatoryContext.tsx # Centralized repository, filtering, and local persistence
│   ├── types/
│   │   └── environmental.ts     # Domain models: records, stations, anomalies, and metadata
│   ├── utils/
│   │   ├── environmentalStandards.ts # WHO/EPA thresholds, AQI formulas, and DQI math
│   │   ├── dataProcessing.ts    # Summary statistics (mean, median, IQR), aggregations, CSV export
│   │   ├── anomalyDetection.ts  # Explainable anomaly detection engine
│   │   └── importParser.ts      # 7-step CSV parsing, validation, and sample templates
│   ├── data/
│   │   └── demoDataset.ts       # Deterministic Cascadia Transect 30-day demonstration dataset
│   ├── components/
│   │   └── common/
│   │       ├── Header.tsx       # Date range selector, station filter, quality index badge
│   │       ├── NavRail.tsx      # Persistent asymmetric navigation rail
│   │       ├── TopographicLogo.tsx # Original leaf-ring / contour emblem
│   │       ├── StationMap.tsx   # Spatial transect map and coordinate mesh
│   │       └── DataQualityModal.tsx # Transparent DQI mathematical breakdown modal
│   ├── views/
│   │   ├── OverviewView.tsx     # "Environmental Field Report" overview
│   │   ├── AirQualityView.tsx   # Air quality intelligence & EPA AQI
│   │   ├── WaterQualityView.tsx # Water chemistry & USGS benchmarks
│   │   ├── ClimateView.tsx      # Diurnal temperature bands & rainfall hyetographs
│   │   ├── AnomalyExplorerView.tsx # Anomaly triage & analyst acknowledgment
│   │   ├── ImportView.tsx       # 7-step guided CSV ingestion wizard
│   │   ├── ReportsView.tsx      # Gemini-assisted scientific Field Reports
│   │   ├── MethodologyView.tsx  # Mathematical proofs & standard citations
│   │   └── SettingsView.tsx     # Units preference & persistence settings
│   └── tests/
│       └── environmental.test.ts # Vitest automated test suite
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. Setup and Installation

### Prerequisites
- Node.js 20+
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Provide your `GEMINI_API_KEY` for server-side AI Field Report synthesis. *(Note: in Google AI Studio, this key is injected automatically via user secrets).*

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 4. Run Automated Test Suite
```bash
npm run test
```

### 5. Production Build
```bash
npm run build
npm start
```

---

## 5. Demonstration Dataset Details

The application bundles a 30-day, deterministic dataset across three stations in the Pacific Northwest Cascadia Transect:
1. `STA-FOREST-01` (Pine Ridge Mountain Observatory — Highland forest baseline)
2. `STA-VALLEY-02` (Verdant River Valley Station — Agricultural river corridor)
3. `STA-URBAN-03` (Harbor Industrial Basin — Estuarine industrial coast)

### Documented Synthetic Anomalies:
- **Wildfire smoke inversion:** Days 12–14 at Pine Ridge Observatory (PM2.5 surges to 84 µg/m³).
- **Storm sediment pulse:** Days 20–22 at Verdant River Valley (Rainfall 62mm, turbidity surge to 38.5 NTU, dissolved oxygen drops to 4.2 mg/L).
- **Sensor step calibration drift:** Day 26 at Verdant River Valley (pH jumps from 7.4 to 9.2).
- **Power loss telemetry gap:** 12-hour transmission outage at Verdant River Station.
- **Telemetry re-broadcast duplicate:** Duplicate timestamp packet at Harbor Industrial Basin.

All synthetic data is visibly labeled as:
`DEMO DATA — NOT LIVE MEASUREMENTS`.

---

## 6. Standards & Methodological Citations

1. **World Health Organization (WHO):** *Global Air Quality Guidelines (2021).* Particulate Matter (PM2.5, PM10), Ozone, Nitrogen Dioxide, Sulfur Dioxide.
2. **United States Code of Federal Regulations:** *40 CFR Part 58, Appendix G.* Uniform Air Quality Index (AQI) Calculation and Breakpoints.
3. **United States Geological Survey (USGS):** *National Field Manual for the Collection of Water-Quality Data.* Chapter A6: Field Measurements.
4. **World Meteorological Organization (WMO):** *Guide to Meteorological Instruments and Methods of Observation (WMO-No. 8).*
"# Smart-Environmental-Intelligence-Platform" 
