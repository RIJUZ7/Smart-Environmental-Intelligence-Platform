/**
 * ECO-SENSE Observatory State Context & Repository
 *
 * Centralized environmental state store managing:
 * - Active dataset & observation records
 * - Filtering (stations, date ranges, parameters)
 * - Anomaly cache and acknowledgment workflow
 * - Transparent local storage persistence with explicit provenance indicators
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  EnvironmentalRecord,
  MonitoringStation,
  DatasetMetadata,
  AnomalyRecord
} from '../types/environmental';
import { generateDeterministicDemoData, getDemoDatasetMetadata, DEMO_STATIONS } from '../data/demoDataset';
import { detectEnvironmentalAnomalies, DEFAULT_DETECTION_CONFIG, AnomalyDetectionConfig } from '../utils/anomalyDetection';

export type NavigationSection =
  | 'overview'
  | 'air'
  | 'water'
  | 'climate'
  | 'anomalies'
  | 'import'
  | 'reports'
  | 'methodology'
  | 'settings';

interface ObservatoryContextType {
  // Navigation
  activeSection: NavigationSection;
  setActiveSection: (sec: NavigationSection) => void;

  // Active Dataset & Records
  activeDataset: DatasetMetadata;
  availableDatasets: DatasetMetadata[];
  records: EnvironmentalRecord[];
  filteredRecords: EnvironmentalRecord[];
  stations: MonitoringStation[];

  // Filtering Controls
  selectedStationId: string; // 'ALL' or specific stationId
  setSelectedStationId: (id: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  resetDateRange: () => void;

  // Anomalies
  anomalies: AnomalyRecord[];
  filteredAnomalies: AnomalyRecord[];
  acknowledgeAnomaly: (anomalyId: string, notes?: string) => void;
  anomalyConfig: AnomalyDetectionConfig;
  setAnomalyConfig: React.Dispatch<React.SetStateAction<AnomalyDetectionConfig>>;

  // Dataset Management
  isDemoMode: boolean;
  loadDemoDataset: () => void;
  importDataset: (meta: DatasetMetadata, records: EnvironmentalRecord[]) => void;
  deleteDataset: (datasetId: string) => void;

  // Settings & System
  unitSystem: 'metric' | 'imperial';
  setUnitSystem: (u: 'metric' | 'imperial') => void;
  persistenceMode: 'local_storage' | 'cloud_firestore';
  serverStatus: {
    online: boolean;
    hasGeminiKey: boolean;
    checking: boolean;
  };
  refreshServerStatus: () => Promise<void>;
}

const ObservatoryContext = createContext<ObservatoryContextType | null>(null);

const STORAGE_KEYS = {
  USER_DATASETS_META: 'ecosense_datasets_meta_v1',
  USER_RECORDS_PREFIX: 'ecosense_dataset_records_',
  ACTIVE_DATASET_ID: 'ecosense_active_dataset_id_v1',
  ANOMALY_ACK: 'ecosense_anomaly_acks_v1',
  UNIT_PREF: 'ecosense_unit_pref_v1'
};

export const ObservatoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');

  // Initialize demo data
  const demoRecords = useMemo(() => generateDeterministicDemoData(), []);
  const demoMeta = useMemo(() => getDemoDatasetMetadata(demoRecords), [demoRecords]);

  // Datasets repository
  const [availableDatasets, setAvailableDatasets] = useState<DatasetMetadata[]>([demoMeta]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(demoMeta.id);
  const [currentRecords, setCurrentRecords] = useState<EnvironmentalRecord[]>(demoRecords);

  // Filters
  const [selectedStationId, setSelectedStationId] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(demoMeta.dateRange);

  // Anomaly config & state
  const [anomalyConfig, setAnomalyConfig] = useState<AnomalyDetectionConfig>(DEFAULT_DETECTION_CONFIG);
  const [acknowledgedAnomalyIds, setAcknowledgedAnomalyIds] = useState<Record<string, { at: string; notes?: string }>>({});

  // Settings
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [serverStatus, setServerStatus] = useState<{ online: boolean; hasGeminiKey: boolean; checking: boolean }>({
    online: false,
    hasGeminiKey: false,
    checking: true
  });

  // Load stored datasets & preferences from localStorage on mount
  useEffect(() => {
    try {
      const storedDatasetsRaw = localStorage.getItem(STORAGE_KEYS.USER_DATASETS_META);
      const storedUnit = localStorage.getItem(STORAGE_KEYS.UNIT_PREF) as 'metric' | 'imperial' | null;
      const storedAcksRaw = localStorage.getItem(STORAGE_KEYS.ANOMALY_ACK);

      if (storedUnit) setUnitSystem(storedUnit);
      if (storedAcksRaw) setAcknowledgedAnomalyIds(JSON.parse(storedAcksRaw));

      if (storedDatasetsRaw) {
        const parsedMeta: DatasetMetadata[] = JSON.parse(storedDatasetsRaw);
        // Combine demo with custom imported
        const combined = [demoMeta, ...parsedMeta.filter(m => m.id !== demoMeta.id)];
        setAvailableDatasets(combined);

        const lastActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_DATASET_ID);
        if (lastActive && lastActive !== demoMeta.id) {
          const targetMeta = combined.find(m => m.id === lastActive);
          const recordsJson = localStorage.getItem(STORAGE_KEYS.USER_RECORDS_PREFIX + lastActive);
          if (targetMeta && recordsJson) {
            setActiveDatasetId(lastActive);
            const parsedRecs: EnvironmentalRecord[] = JSON.parse(recordsJson);
            setCurrentRecords(parsedRecs);
            setDateRange(targetMeta.dateRange);
          }
        }
      }
    } catch (e) {
      console.warn('Could not read from local storage:', e);
    }
  }, [demoMeta]);

  // Ping backend server for Gemini availability
  const refreshServerStatus = async () => {
    setServerStatus(s => ({ ...s, checking: true }));
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus({
          online: true,
          hasGeminiKey: !!data.hasGeminiKey,
          checking: false
        });
      } else {
        setServerStatus({ online: false, hasGeminiKey: false, checking: false });
      }
    } catch {
      setServerStatus({ online: false, hasGeminiKey: false, checking: false });
    }
  };

  useEffect(() => {
    refreshServerStatus();
  }, []);

  const activeDataset = useMemo(() => {
    return availableDatasets.find(d => d.id === activeDatasetId) || demoMeta;
  }, [availableDatasets, activeDatasetId, demoMeta]);

  const isDemoMode = activeDataset.provenance === 'demo';

  // Extract stations from active records
  const stations = useMemo<MonitoringStation[]>(() => {
    if (isDemoMode) return DEMO_STATIONS;

    const stationMap = new Map<string, MonitoringStation>();
    for (const r of currentRecords) {
      if (!stationMap.has(r.stationId)) {
        stationMap.set(r.stationId, {
          id: r.stationId,
          name: r.stationName || r.stationId,
          region: r.region || 'Observed Region',
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          elevationMeters: r.elevationMeters,
          environmentType: 'custom',
          activeParameters: [],
          totalObservations: 0,
          firstObservation: r.timestamp,
          lastObservation: r.timestamp
        });
      }

      const st = stationMap.get(r.stationId)!;
      st.totalObservations++;
      if (r.timestamp < st.firstObservation) st.firstObservation = r.timestamp;
      if (r.timestamp > st.lastObservation) st.lastObservation = r.timestamp;
    }

    return Array.from(stationMap.values());
  }, [currentRecords, isDemoMode]);

  // Filter records by selected station and date range
  const filteredRecords = useMemo(() => {
    const startMs = new Date(dateRange.start).getTime();
    const endMs = new Date(dateRange.end).getTime();

    return currentRecords.filter(r => {
      // Station filter
      if (selectedStationId !== 'ALL' && r.stationId !== selectedStationId) {
        return false;
      }
      // Date filter
      const rTime = new Date(r.timestamp).getTime();
      if (!isNaN(startMs) && rTime < startMs) return false;
      if (!isNaN(endMs) && rTime > endMs) return false;

      return true;
    });
  }, [currentRecords, selectedStationId, dateRange]);

  // Calculate anomalies on active records
  const anomalies = useMemo(() => {
    const detected = detectEnvironmentalAnomalies(currentRecords, anomalyConfig);
    // Apply acknowledgment state
    return detected.map(a => {
      if (acknowledgedAnomalyIds[a.id]) {
        return {
          ...a,
          acknowledged: true,
          acknowledgedAt: acknowledgedAnomalyIds[a.id].at,
          notes: acknowledgedAnomalyIds[a.id].notes
        };
      }
      return a;
    });
  }, [currentRecords, anomalyConfig, acknowledgedAnomalyIds]);

  // Filter anomalies based on active filters
  const filteredAnomalies = useMemo(() => {
    const startMs = new Date(dateRange.start).getTime();
    const endMs = new Date(dateRange.end).getTime();

    return anomalies.filter(a => {
      if (selectedStationId !== 'ALL' && a.stationId !== selectedStationId) return false;
      const aTime = new Date(a.timestamp).getTime();
      if (!isNaN(startMs) && aTime < startMs) return false;
      if (!isNaN(endMs) && aTime > endMs) return false;
      return true;
    });
  }, [anomalies, selectedStationId, dateRange]);

  const acknowledgeAnomaly = (anomalyId: string, notes?: string) => {
    const updated = {
      ...acknowledgedAnomalyIds,
      [anomalyId]: {
        at: new Date().toISOString(),
        notes: notes || 'Reviewed by Observatory Analyst'
      }
    };
    setAcknowledgedAnomalyIds(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.ANOMALY_ACK, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save anomaly acknowledgment:', e);
    }
  };

  const loadDemoDataset = () => {
    setActiveDatasetId(demoMeta.id);
    setCurrentRecords(demoRecords);
    setSelectedStationId('ALL');
    setDateRange(demoMeta.dateRange);
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DATASET_ID, demoMeta.id);
    } catch (e) {
      console.warn('Storage error:', e);
    }
  };

  const importDataset = (meta: DatasetMetadata, records: EnvironmentalRecord[]) => {
    const updatedDatasets = [meta, ...availableDatasets.filter(d => d.id !== meta.id && d.id !== demoMeta.id), demoMeta];
    setAvailableDatasets(updatedDatasets);
    setActiveDatasetId(meta.id);
    setCurrentRecords(records);
    setSelectedStationId('ALL');
    setDateRange(meta.dateRange);

    try {
      // Store metadata list (excluding demo)
      const userMetas = updatedDatasets.filter(d => d.provenance === 'imported');
      localStorage.setItem(STORAGE_KEYS.USER_DATASETS_META, JSON.stringify(userMetas));
      localStorage.setItem(STORAGE_KEYS.USER_RECORDS_PREFIX + meta.id, JSON.stringify(records));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DATASET_ID, meta.id);
    } catch (e) {
      console.warn('Could not persist dataset to localStorage (may exceed quota):', e);
    }
  };

  const deleteDataset = (datasetId: string) => {
    if (datasetId === demoMeta.id) return; // Cannot delete demo

    const updated = availableDatasets.filter(d => d.id !== datasetId);
    setAvailableDatasets(updated);

    try {
      localStorage.removeItem(STORAGE_KEYS.USER_RECORDS_PREFIX + datasetId);
      const userMetas = updated.filter(d => d.provenance === 'imported');
      localStorage.setItem(STORAGE_KEYS.USER_DATASETS_META, JSON.stringify(userMetas));
    } catch (e) {
      console.warn('Storage cleanup error:', e);
    }

    if (activeDatasetId === datasetId) {
      loadDemoDataset();
    }
  };

  const resetDateRange = () => {
    setDateRange(activeDataset.dateRange);
  };

  return (
    <ObservatoryContext.Provider
      value={{
        activeSection,
        setActiveSection,
        activeDataset,
        availableDatasets,
        records: currentRecords,
        filteredRecords,
        stations,
        selectedStationId,
        setSelectedStationId,
        dateRange,
        setDateRange,
        resetDateRange,
        anomalies,
        filteredAnomalies,
        acknowledgeAnomaly,
        anomalyConfig,
        setAnomalyConfig,
        isDemoMode,
        loadDemoDataset,
        importDataset,
        deleteDataset,
        unitSystem,
        setUnitSystem: u => {
          setUnitSystem(u);
          try {
            localStorage.setItem(STORAGE_KEYS.UNIT_PREF, u);
          } catch {}
        },
        persistenceMode: 'local_storage',
        serverStatus,
        refreshServerStatus
      }}
    >
      {children}
    </ObservatoryContext.Provider>
  );
};

export const useObservatory = () => {
  const context = useContext(ObservatoryContext);
  if (!context) {
    throw new Error('useObservatory must be used within an ObservatoryProvider');
  }
  return context;
};
