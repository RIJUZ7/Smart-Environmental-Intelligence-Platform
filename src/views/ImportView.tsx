import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Trash2,
  FileCheck,
  RefreshCw,
  Info,
  Layers,
  Database
} from 'lucide-react';
import { useObservatory } from '../context/ObservatoryContext';
import {
  suggestFieldMapping,
  validateAndMapRecords,
  buildImportedDatasetMetadata,
  SAMPLE_CSV_TEMPLATES
} from '../utils/importParser';
import {
  ColumnMappingConfig,
  ImportValidationReport,
  EnvironmentalRecord
} from '../types/environmental';
import { exportToCsv, triggerFileDownload } from '../utils/dataProcessing';

type ImportStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ImportView: React.FC = () => {
  const { importDataset, availableDatasets, deleteDataset, activeDataset, loadDemoDataset, setActiveSection } = useObservatory();

  const [activeTab, setActiveTab] = useState<'wizard' | 'datasets'>('wizard');
  const [currentStep, setCurrentStep] = useState<ImportStep>(1);

  // File & Raw Data State
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  // Step 3: Column Mappings
  const [columnMappings, setColumnMappings] = useState<ColumnMappingConfig[]>([]);

  // Step 4: Options
  const [missingConventions, setMissingConventions] = useState<string>('NA, -999, null, ND, -9999');
  const [defaultStationName, setDefaultStationName] = useState<string>('Imported Field Station');
  const [defaultStationId, setDefaultStationId] = useState<string>('STA-IMP-01');
  const [defaultRegion, setDefaultRegion] = useState<string>('Observed Study Basin');
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('C');
  const [timeZoneOffsetHours, setTimeZoneOffsetHours] = useState<number>(0);

  // Step 5 & 6: Validation State & Report
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<ImportValidationReport | null>(null);
  const [validatedRecords, setValidatedRecords] = useState<EnvironmentalRecord[]>([]);

  // Step 7: Confirmation & Metadata
  const [datasetTitle, setDatasetTitle] = useState<string>('');
  const [datasetDescription, setDatasetDescription] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV string into rawRows and rawHeaders
  const processCsvText = (csvText: string, name: string, size: number) => {
    setUploadError(null);
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        if (results.data.length === 0) {
          setUploadError('No observation rows found in the selected CSV file. Please verify content and delimiter.');
          return;
        }

        const headers = results.meta.fields || Object.keys(results.data[0]);
        setFileName(name);
        setFileSizeBytes(size);
        setRawHeaders(headers);
        setRawRows(results.data);

        // Auto-suggest mappings for Step 3
        const suggested: ColumnMappingConfig[] = headers.map(h => ({
          sourceColumn: h,
          targetField: suggestFieldMapping(h)
        }));
        setColumnMappings(suggested);

        setDatasetTitle(name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        setCurrentStep(2);
      },
      error: (error: Error) => {
        setUploadError(`CSV parsing failed: ${error.message}`);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      processCsvText(text, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const loadSampleTemplate = (type: 'airQuality' | 'waterQuality' | 'climate' | 'qaFixture') => {
    const sampleText = SAMPLE_CSV_TEMPLATES[type];
    const name = type === 'qaFixture' ? 'deterministic_qa_fixture.csv' : `sample_${type}_field_data.csv`;
    processCsvText(sampleText, name, sampleText.length);
  };

  // Run validation
  const executeValidation = () => {
    setIsValidating(true);
    setCurrentStep(5);

    setTimeout(() => {
      const conventions = missingConventions.split(',').map(s => s.trim());
      const { validRecords, report } = validateAndMapRecords(rawRows, columnMappings, {
        missingConventions: conventions,
        defaultStationId,
        defaultStationName,
        defaultRegion,
        temperatureUnit,
        timeZoneOffsetHours
      });

      setValidatedRecords(validRecords);
      setValidationReport(report);
      setIsValidating(false);
      setCurrentStep(6);
    }, 400);
  };

  // Final Confirmation & Import
  const handleFinalConfirm = () => {
    if (!validationReport || validatedRecords.length === 0) return;

    const metadata = buildImportedDatasetMetadata(
      datasetTitle,
      fileName,
      fileSizeBytes,
      validatedRecords,
      validationReport
    );

    importDataset(metadata, validatedRecords);
    setActiveSection('overview');
  };

  const handleDownloadRejections = () => {
    if (!validationReport?.rejectedRowsData.length) return;
    const csvStr = exportToCsv(validationReport.rejectedRowsData);
    triggerFileDownload(csvStr, `rejections_${fileName || 'dataset'}.csv`);
  };

  const handleDownloadAuditReport = () => {
    if (!validationReport) return;
    const auditObj = {
      dataset: fileName,
      totalRows: validationReport.totalRows,
      validRows: validationReport.validRowsCount,
      rejectedRows: validationReport.rejectedRowsCount,
      duplicateRows: validationReport.duplicateRowsCount,
      missingSummary: validationReport.missingValuesSummary,
      sampleErrors: validationReport.errors,
      auditTimestamp: new Date().toISOString()
    };
    const blob = JSON.stringify(auditObj, null, 2);
    triggerFileDownload(blob, `validation_audit_${fileName || 'data'}.json`, 'application/json');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#D9DCCF] pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#82966B] uppercase font-semibold">
            <span>Observatory Section 06</span>
            <span>·</span>
            <span>Data Ingestion & Integrity</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#24352D] tracking-tight flex items-center gap-2.5">
            <UploadCloud className="w-8 h-8 text-[#315C45]" />
            Data Import & Validation Engine
          </h2>
          <p className="text-xs text-[#68756B] mt-1">
            7-Step rigorous environmental data ingestion with column mapping, boundary validation, and rejection audit.
          </p>
        </div>

        {/* Tab switch: New Import vs Managed Datasets */}
        <div className="flex items-center border border-[#D9DCCF] rounded-xs bg-[#FFFEF9] text-xs font-mono overflow-hidden">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'wizard' ? 'bg-[#315C45] text-white font-semibold' : 'text-[#68756B] hover:text-[#24352D]'
            }`}
          >
            Import Wizard
          </button>
          <button
            onClick={() => setActiveTab('datasets')}
            className={`px-3 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'datasets' ? 'bg-[#315C45] text-white font-semibold' : 'text-[#68756B] hover:text-[#24352D]'
            }`}
          >
            Dataset Library ({availableDatasets.length})
          </button>
        </div>
      </div>

      {activeTab === 'datasets' ? (
        /* Dataset Library Tab */
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#D9DCCF] pb-3">
            <h3 className="font-heading text-xl font-bold text-[#24352D] flex items-center gap-2">
              <Database className="w-5 h-5 text-[#315C45]" />
              Active Observatory Datasets
            </h3>
            <button
              onClick={() => { setActiveTab('wizard'); setCurrentStep(1); }}
              className="px-3 py-1.5 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
            >
              + Ingest New Dataset
            </button>
          </div>

          <div className="divide-y divide-[#D9DCCF]/70">
            {availableDatasets.map(ds => {
              const isActive = ds.id === activeDataset.id;
              return (
                <div key={ds.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded-2xs border ${
                        ds.provenance === 'demo'
                          ? 'bg-[#B78A4D]/15 text-[#B78A4D] border-[#B78A4D]/30'
                          : 'bg-[#315C45]/15 text-[#315C45] border-[#315C45]/30'
                      }`}>
                        {ds.provenance === 'demo' ? 'DEMO DATA' : 'IMPORTED'}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-mono bg-[#315C45] text-white px-1.5 py-0.2 rounded-2xs font-semibold">
                          ACTIVE WORKSPACE
                        </span>
                      )}
                      <h4 className="font-heading text-lg font-bold text-[#24352D]">{ds.title}</h4>
                    </div>
                    <p className="text-xs text-[#68756B] mt-1 max-w-2xl">{ds.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#68756B] mt-2">
                      <span>Rows: {ds.validRows} valid / {ds.totalRows} total</span>
                      <span>·</span>
                      <span>Date Span: {ds.dateRange.start.slice(0, 10)} to {ds.dateRange.end.slice(0, 10)}</span>
                      <span>·</span>
                      <span>Quality Score: <strong className="text-[#315C45]">{ds.dataQualityScore}/100</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    {ds.provenance === 'demo' ? (
                      <button
                        onClick={loadDemoDataset}
                        disabled={isActive}
                        className={`px-3 py-1.5 text-xs font-mono rounded-xs transition-colors cursor-pointer ${
                          isActive ? 'bg-[#E5EBDD] text-[#68756B]' : 'bg-[#FFFEF9] border border-[#D9DCCF] hover:bg-[#E5EBDD] text-[#24352D]'
                        }`}
                      >
                        {isActive ? 'Current Active' : 'Switch To Demo'}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => deleteDataset(ds.id)}
                          className="p-1.5 text-[#B64D43] hover:bg-[#B64D43]/10 border border-[#D9DCCF] rounded-xs transition-colors cursor-pointer"
                          title="Delete dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Guided 7-Step Import Wizard */
        <div className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-md p-5 shadow-2xs space-y-6">
          {/* Step Progress Tracker */}
          <div className="border-b border-[#D9DCCF] pb-4">
            <div className="flex items-center justify-between text-xs font-mono text-[#68756B] mb-2">
              <span className="font-bold text-[#24352D]">
                Step {currentStep} of 7: {
                  currentStep === 1 ? 'Select File' :
                  currentStep === 2 ? 'Preview Raw Rows' :
                  currentStep === 3 ? 'Map Columns' :
                  currentStep === 4 ? 'Configure Formatting' :
                  currentStep === 5 ? 'Running Integrity Validation' :
                  currentStep === 6 ? 'Validation Audit Report' :
                  'Confirm & Ingest'
                }
              </span>
              <span>{(currentStep / 7 * 100).toFixed(0)}% Complete</span>
            </div>
            <div className="w-full bg-[#E5EBDD] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#315C45] h-full transition-all duration-300"
                style={{ width: `${(currentStep / 7) * 100}%` }}
              />
            </div>
          </div>

          {/* STEP 1: Select File */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {uploadError && (
                <div className="p-3 bg-[#B64D43]/10 border border-[#B64D43]/30 rounded-xs text-xs text-[#B64D43] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <strong>Upload Error:</strong> {uploadError}
                  </span>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-[10px] font-mono hover:underline text-[#B64D43] font-semibold cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#D9DCCF] hover:border-[#315C45] bg-[#F3F1E8]/50 hover:bg-[#F3F1E8] p-10 rounded-md text-center cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-12 h-12 text-[#315C45] mx-auto mb-3" />
                <h3 className="font-heading text-xl font-bold text-[#24352D]">
                  Select or Drop Environmental Data CSV
                </h3>
                <p className="text-xs text-[#68756B] mt-1 max-w-sm mx-auto">
                  Supports comma-delimited CSV files containing timestamps, station identifiers, and numeric air, water, or meteorological observations.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  className="mt-4 px-4 py-2 bg-[#315C45] text-white text-xs font-semibold rounded-xs shadow-2xs hover:bg-[#24352D] transition-colors"
                >
                  Browse Local Storage
                </button>
              </div>

              {/* Sample Templates Fast-Start */}
              <div className="border-t border-[#D9DCCF] pt-4">
                <span className="text-[10px] font-mono uppercase text-[#82966B] font-semibold block mb-2">
                  Or Test With Documented Sample Templates:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => loadSampleTemplate('airQuality')}
                    className="p-3 border border-[#D9DCCF] rounded-xs text-left bg-[#FFFEF9] hover:bg-[#F3F1E8] transition-colors cursor-pointer"
                  >
                    <div className="font-heading text-base font-bold text-[#24352D]">
                      EPA Air Quality CSV
                    </div>
                    <div className="text-[11px] text-[#68756B] mt-0.5">
                      PM2.5, PM10, NO₂, SO₂, O₃ multi-station series
                    </div>
                  </button>
                  <button
                    onClick={() => loadSampleTemplate('waterQuality')}
                    className="p-3 border border-[#D9DCCF] rounded-xs text-left bg-[#FFFEF9] hover:bg-[#F3F1E8] transition-colors cursor-pointer"
                  >
                    <div className="font-heading text-base font-bold text-[#24352D]">
                      USGS River Catchment CSV
                    </div>
                    <div className="text-[11px] text-[#68756B] mt-0.5">
                      pH, Turbidity, Dissolved O₂, Conductivity, Nitrate
                    </div>
                  </button>
                  <button
                    onClick={() => loadSampleTemplate('climate')}
                    className="p-3 border border-[#D9DCCF] rounded-xs text-left bg-[#FFFEF9] hover:bg-[#F3F1E8] transition-colors cursor-pointer"
                  >
                    <div className="font-heading text-base font-bold text-[#24352D]">
                      NOAA Surface Weather CSV
                    </div>
                    <div className="text-[11px] text-[#68756B] mt-0.5">
                      Temp, Humidity, Rain accumulation, Wind speed
                    </div>
                  </button>
                  <button
                    onClick={() => loadSampleTemplate('qaFixture')}
                    className="p-3 border border-[#B78A4D]/40 rounded-xs text-left bg-[#B78A4D]/5 hover:bg-[#B78A4D]/15 transition-colors cursor-pointer"
                  >
                    <div className="font-heading text-base font-bold text-[#B78A4D] flex items-center justify-between">
                      <span>Full QA Audit Fixture</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 bg-[#B78A4D]/20 text-[#B78A4D] rounded-2xs">TEST</span>
                    </div>
                    <div className="text-[11px] text-[#68756B] mt-0.5">
                      Deterministic multi-domain fixture with invalid rows & bounds
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview First Rows */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-xl font-bold text-[#24352D]">
                    File Preview: {fileName}
                  </h3>
                  <p className="text-xs text-[#68756B]">
                    Detected {rawHeaders.length} columns and {rawRows.length} total rows. Previewing initial rows:
                  </p>
                </div>
                <span className="font-mono text-xs bg-[#E5EBDD] text-[#315C45] px-2 py-1 rounded-xs">
                  {(fileSizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>

              <div className="overflow-x-auto border border-[#D9DCCF] rounded-xs max-h-80">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-[#F3F1E8] border-b border-[#D9DCCF]">
                      <th className="p-2 border-r border-[#D9DCCF] text-[10px] text-[#68756B]">#</th>
                      {rawHeaders.map(h => (
                        <th key={h} className="p-2 border-r border-[#D9DCCF] text-[11px] font-semibold text-[#24352D]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9DCCF]">
                    {rawRows.slice(0, 6).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F3F1E8]/50">
                        <td className="p-2 border-r border-[#D9DCCF] text-[#68756B]">{idx + 1}</td>
                        {rawHeaders.map(h => (
                          <td key={h} className="p-2 border-r border-[#D9DCCF] text-[#24352D] whitespace-nowrap">
                            {row[h] || <span className="text-[#68756B]/60 italic">empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-3 border-t border-[#D9DCCF]">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-1.5 border border-[#D9DCCF] text-xs font-medium rounded-xs hover:bg-[#F3F1E8]"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-1.5 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5"
                >
                  Proceed to Column Mapping <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Map Columns to Environmental Fields */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#24352D]">
                  Map CSV Columns to Standard Observatory Fields
                </h3>
                <p className="text-xs text-[#68756B]">
                  Common aliases have been auto-matched. Review and correct the mappings to match your sensor specification:
                </p>
              </div>

              <div className="border border-[#D9DCCF] rounded-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#E5EBDD]/50 border-b border-[#D9DCCF] font-mono text-[10px] uppercase text-[#68756B]">
                      <th className="p-2.5">Source CSV Header</th>
                      <th className="p-2.5">First Row Sample</th>
                      <th className="p-2.5">Target Environmental Field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9DCCF]">
                    {columnMappings.map((mapping, idx) => (
                      <tr key={mapping.sourceColumn} className="hover:bg-[#F3F1E8]/40">
                        <td className="p-2.5 font-mono font-semibold text-[#24352D]">
                          {mapping.sourceColumn}
                        </td>
                        <td className="p-2.5 font-mono text-[#68756B] max-w-xs truncate">
                          {rawRows[0]?.[mapping.sourceColumn] ?? '—'}
                        </td>
                        <td className="p-2.5">
                          <select
                            value={mapping.targetField}
                            onChange={e => {
                              const updated = [...columnMappings];
                              updated[idx].targetField = e.target.value as any;
                              setColumnMappings(updated);
                            }}
                            className="bg-[#FFFEF9] border border-[#D9DCCF] rounded-xs px-2.5 py-1 text-xs font-mono font-medium text-[#24352D] focus:border-[#315C45]"
                          >
                            <option value="ignore">— Ignore / Do Not Map —</option>
                            <optgroup label="Metadata & Coordinates">
                              <option value="timestamp">Timestamp (ISO / Date-Time) *</option>
                              <option value="stationId">Station ID (Code)</option>
                              <option value="stationName">Station Name</option>
                              <option value="region">Region / Watershed</option>
                              <option value="latitude">Latitude (°N)</option>
                              <option value="longitude">Longitude (°W)</option>
                              <option value="elevationMeters">Elevation (m)</option>
                            </optgroup>
                            <optgroup label="Air Quality Parameters">
                              <option value="pm25">PM2.5 (Fine Particulate, µg/m³)</option>
                              <option value="pm10">PM10 (Coarse Particulate, µg/m³)</option>
                              <option value="no2">Nitrogen Dioxide (NO₂, ppb)</option>
                              <option value="so2">Sulfur Dioxide (SO₂, ppb)</option>
                              <option value="co">Carbon Monoxide (CO, ppm)</option>
                              <option value="o3">Ozone (O₃, ppb)</option>
                            </optgroup>
                            <optgroup label="Water Quality Parameters">
                              <option value="ph">Water pH (0–14)</option>
                              <option value="turbidity">Turbidity (NTU)</option>
                              <option value="dissolvedOxygen">Dissolved Oxygen (mg/L)</option>
                              <option value="conductivity">Specific Conductivity (µS/cm)</option>
                              <option value="waterTemp">Water Temperature (°C)</option>
                              <option value="nitrate">Nitrate (NO₃-N, mg/L)</option>
                            </optgroup>
                            <optgroup label="Climate & Weather">
                              <option value="temperature">Ambient Temperature (°C/°F)</option>
                              <option value="humidity">Relative Humidity (%)</option>
                              <option value="precipitation">Precipitation (mm)</option>
                              <option value="windSpeed">Wind Speed (m/s)</option>
                              <option value="windDirection">Wind Direction (deg)</option>
                              <option value="pressure">Atmospheric Pressure (hPa)</option>
                            </optgroup>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-3 border-t border-[#D9DCCF]">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-1.5 border border-[#D9DCCF] text-xs font-medium rounded-xs hover:bg-[#F3F1E8]"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-1.5 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5"
                >
                  Next: Format Settings <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Configure Formatting & Missing Value Conventions */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#24352D]">
                  Configure Missing Values, Units & Station Defaults
                </h3>
                <p className="text-xs text-[#68756B]">
                  Ensure physical units and missing indicators align with field sensor telemetry:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                <div className="p-3 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/40 space-y-2">
                  <label className="font-semibold block text-[#24352D]">
                    Missing Value Conventions (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={missingConventions}
                    onChange={e => setMissingConventions(e.target.value)}
                    className="w-full bg-[#FFFEF9] border border-[#D9DCCF] p-2 rounded-xs font-mono text-xs focus:border-[#315C45]"
                  />
                  <p className="text-[11px] text-[#68756B]">
                    E.g.: NA, -999, null, ND, -9999. These will be treated as missing without throwing syntax errors.
                  </p>
                </div>

                <div className="p-3 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/40 space-y-2">
                  <label className="font-semibold block text-[#24352D]">
                    Temperature Unit in Source:
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={temperatureUnit === 'C'}
                        onChange={() => setTemperatureUnit('C')}
                        name="tempUnit"
                      />
                      <span>Celsius (°C) — Default</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={temperatureUnit === 'F'}
                        onChange={() => setTemperatureUnit('F')}
                        name="tempUnit"
                      />
                      <span>Fahrenheit (°F) — Convert to °C</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/40 space-y-2">
                  <label className="font-semibold block text-[#24352D]">
                    Fallback Station Name & Code (if missing in CSV):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Station ID"
                      value={defaultStationId}
                      onChange={e => setDefaultStationId(e.target.value)}
                      className="bg-[#FFFEF9] border border-[#D9DCCF] p-2 rounded-xs font-mono text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Station Name"
                      value={defaultStationName}
                      onChange={e => setDefaultStationName(e.target.value)}
                      className="bg-[#FFFEF9] border border-[#D9DCCF] p-2 rounded-xs text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 border border-[#D9DCCF] rounded-xs bg-[#F3F1E8]/40 space-y-2">
                  <label className="font-semibold block text-[#24352D]">
                    Time Zone UTC Offset (Hours):
                  </label>
                  <input
                    type="number"
                    value={timeZoneOffsetHours}
                    onChange={e => setTimeZoneOffsetHours(parseInt(e.target.value, 10) || 0)}
                    className="w-24 bg-[#FFFEF9] border border-[#D9DCCF] p-2 rounded-xs font-mono text-xs"
                  />
                  <span className="text-[11px] text-[#68756B] ml-2">0 for UTC (recommended)</span>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-[#D9DCCF]">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-1.5 border border-[#D9DCCF] text-xs font-medium rounded-xs hover:bg-[#F3F1E8]"
                >
                  Back
                </button>
                <button
                  onClick={executeValidation}
                  className="px-4 py-1.5 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5"
                >
                  Run Validation & Integrity Check <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Running Validation Spinner */}
          {currentStep === 5 && (
            <div className="text-center py-12 space-y-3">
              <RefreshCw className="w-10 h-10 text-[#315C45] animate-spin mx-auto" />
              <h3 className="font-heading text-2xl font-bold text-[#24352D]">
                Validating Records Against Physical & Standard Boundaries...
              </h3>
              <p className="text-xs text-[#68756B]">
                Checking {rawRows.length} rows for date parsability, physical limits, duplicate timestamps, and gaps.
              </p>
            </div>
          )}

          {/* STEP 6: Review Validation Report */}
          {currentStep === 6 && validationReport && (
            <div className="space-y-5">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#24352D] flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#315C45]" />
                  Validation Audit Report
                </h3>
                <p className="text-xs text-[#68756B]">
                  Detailed accounting of valid, duplicate, and rejected observation records. No malformed rows are silently discarded.
                </p>
              </div>

              {/* Tally Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 bg-[#E5EBDD] border border-[#D9DCCF] rounded-xs">
                  <div className="text-[10px] uppercase text-[#315C45] font-semibold">Valid Observations</div>
                  <div className="text-2xl font-bold text-[#315C45]">{validationReport.validRowsCount}</div>
                  <div className="text-[10px] text-[#68756B]">Ready for ingestion</div>
                </div>

                <div className="p-3 bg-[#FFFEF9] border border-[#D9DCCF] rounded-xs">
                  <div className="text-[10px] uppercase text-[#68756B] font-semibold">Total Raw Rows</div>
                  <div className="text-2xl font-bold text-[#24352D]">{validationReport.totalRows}</div>
                  <div className="text-[10px] text-[#68756B]">Source lines</div>
                </div>

                <div className="p-3 bg-[#FFFEF9] border border-[#D9DCCF] rounded-xs">
                  <div className="text-[10px] uppercase text-[#B64D43] font-semibold">Rejected Records</div>
                  <div className="text-2xl font-bold text-[#B64D43]">{validationReport.rejectedRowsCount}</div>
                  <div className="text-[10px] text-[#68756B]">Violated constraints</div>
                </div>

                <div className="p-3 bg-[#FFFEF9] border border-[#D9DCCF] rounded-xs">
                  <div className="text-[10px] uppercase text-[#B78A4D] font-semibold">Duplicates</div>
                  <div className="text-2xl font-bold text-[#B78A4D]">{validationReport.duplicateRowsCount}</div>
                  <div className="text-[10px] text-[#68756B]">Identical timestamps</div>
                </div>
              </div>

              {/* Action Buttons for Rejected Rows and Audit Log */}
              <div className="flex flex-wrap items-center gap-2">
                {validationReport.rejectedRowsCount > 0 && (
                  <button
                    onClick={handleDownloadRejections}
                    className="px-3 py-1.5 bg-[#B64D43]/10 border border-[#B64D43]/30 text-[#B64D43] hover:bg-[#B64D43]/20 text-xs font-mono font-semibold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Rejected Rows CSV ({validationReport.rejectedRowsCount})
                  </button>
                )}
                <button
                  onClick={handleDownloadAuditReport}
                  className="px-3 py-1.5 bg-[#FFFEF9] border border-[#D9DCCF] hover:bg-[#E5EBDD] text-xs font-mono font-semibold rounded-xs transition-colors flex items-center gap-1.5 cursor-pointer text-[#24352D]"
                >
                  <Download className="w-3.5 h-3.5 text-[#315C45]" /> Download Full Audit Report (JSON)
                </button>
              </div>

              {/* Errors Log Table */}
              {validationReport.errors.length > 0 && (
                <div className="border border-[#D9DCCF] rounded-xs overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-[#F3F1E8] border-b border-[#D9DCCF] text-[10px] text-[#68756B] uppercase">
                        <th className="p-2">Row #</th>
                        <th className="p-2">Field</th>
                        <th className="p-2">Observed Raw Value</th>
                        <th className="p-2">Error Diagnostic & Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9DCCF]">
                      {validationReport.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-[#F3F1E8]/50">
                          <td className="p-2 font-bold text-[#B64D43]">{err.rowNumber}</td>
                          <td className="p-2 font-semibold text-[#24352D]">{err.column}</td>
                          <td className="p-2 text-[#68756B]">{err.rawValue || 'empty'}</td>
                          <td className="p-2 text-[#24352D]">
                            {err.message}
                            {err.suggestion && (
                              <span className="block text-[10px] text-[#82966B] mt-0.5">
                                Suggestion: {err.suggestion}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t border-[#D9DCCF]">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-1.5 border border-[#D9DCCF] text-xs font-medium rounded-xs hover:bg-[#F3F1E8]"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(7)}
                  disabled={validationReport.validRowsCount === 0}
                  className="px-4 py-1.5 bg-[#315C45] hover:bg-[#24352D] disabled:opacity-50 text-white text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5"
                >
                  Proceed to Final Confirmation <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Confirm & Import */}
          {currentStep === 7 && validationReport && (
            <div className="space-y-4">
              <div>
                <h3 className="font-heading text-xl font-bold text-[#24352D]">
                  Step 7: Confirm & Ingest into Observatory Workspace
                </h3>
                <p className="text-xs text-[#68756B]">
                  Assign a descriptive title and provenance metadata for the active dataset:
                </p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div>
                  <label className="font-semibold block mb-1">Dataset Title:</label>
                  <input
                    type="text"
                    value={datasetTitle}
                    onChange={e => setDatasetTitle(e.target.value)}
                    className="w-full bg-[#F3F1E8] border border-[#D9DCCF] p-2 rounded-xs font-medium text-xs focus:border-[#315C45]"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Observational Notes / Description:</label>
                  <textarea
                    rows={3}
                    value={datasetDescription}
                    onChange={e => setDatasetDescription(e.target.value)}
                    placeholder="E.g., Autumn 2026 baseline sampling campaign at Pine Creek watershed..."
                    className="w-full bg-[#F3F1E8] border border-[#D9DCCF] p-2 rounded-xs text-xs focus:border-[#315C45]"
                  />
                </div>

                <div className="p-3 bg-[#E5EBDD]/60 border border-[#D9DCCF] rounded-xs font-mono text-[11px] space-y-1">
                  <div>Valid Records to Ingest: <strong className="text-[#315C45]">{validationReport.validRowsCount}</strong></div>
                  <div>Stations Discovered: <strong>{validationReport.detectedStations.join(', ') || 'N/A'}</strong></div>
                  <div>Parameters Mapped: <strong>{validationReport.detectedParameters.join(', ')}</strong></div>
                </div>
              </div>

              <div className="flex justify-between pt-3 border-t border-[#D9DCCF]">
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-4 py-1.5 border border-[#D9DCCF] text-xs font-medium rounded-xs hover:bg-[#F3F1E8]"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalConfirm}
                  className="px-5 py-2 bg-[#315C45] hover:bg-[#24352D] text-white text-xs font-bold rounded-xs transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirm & Ingest Dataset
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
