import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';

export function useSimulation() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [topology, setTopology] = useState(null);
  const [events, setEvents] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [qosStatus, setQosStatus] = useState(null);
  const [qosHistory, setQosHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Poll state every 400ms when running, 1500ms when idle
  const isRunning = status?.is_running;

  const refreshAll = useCallback(async () => {
    try {
      const [st, cfg, hist, topo, ev, diag, qos, qosHist] = await Promise.all([
        api.getSimulationStatus(),
        api.getConfig(),
        api.getMetricsHistory(),
        api.getTopology(),
        api.getCongestionEvents(),
        api.getDiagnostics(),
        api.getQoSStatus(),
        api.getQoSHistory(),
      ]);

      setStatus(st);
      setConfig(cfg);
      setHistory(hist.history || []);
      setTopology(topo);
      setEvents(ev.events || []);
      setDiagnostics(diag.diagnostics || []);
      setQosStatus(qos);
      setQosHistory(qosHist.transitions || []);
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to sync simulation state:', err);
      setIsConnected(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Polling loop
  useEffect(() => {
    const intervalTime = isRunning ? 300 : 1200;
    const interval = setInterval(() => {
      refreshAll();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isRunning, refreshAll]);

  // Actions
  const handleStart = async () => {
    setIsBusy(true);
    try {
      await api.startSimulation();
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  const handlePause = async () => {
    setIsBusy(true);
    try {
      await api.pauseSimulation();
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  const handleResume = async () => {
    setIsBusy(true);
    try {
      await api.resumeSimulation();
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  const handleStop = async () => {
    setIsBusy(true);
    try {
      await api.stopSimulation();
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  const handleReset = async () => {
    setIsBusy(true);
    try {
      await api.resetSimulation();
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  const handleNewScenario = async (seed) => {
    setIsBusy(true);
    try {
      const res = await api.newScenario(seed);
      await refreshAll();
      return res;
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetPreset = async (presetName, qosMode) => {
    setIsBusy(true);
    try {
      await api.updateConfig({ preset_name: presetName, qos_mode: qosMode });
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetQoSMode = async (qosMode) => {
    setIsBusy(true);
    try {
      await api.updateConfig({ qos_mode: qosMode });
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateConfig = async (newConfig) => {
    setIsBusy(true);
    try {
      await api.updateConfig(newConfig);
      await refreshAll();
    } finally {
      setIsBusy(false);
    }
  };

  return {
    status,
    config,
    history,
    topology,
    events,
    diagnostics,
    qosStatus,
    qosHistory,
    isConnected,
    isBusy,
    actions: {
      start: handleStart,
      pause: handlePause,
      resume: handleResume,
      stop: handleStop,
      reset: handleReset,
      newScenario: handleNewScenario,
      setPreset: handleSetPreset,
      setQoSMode: handleSetQoSMode,
      updateConfig: handleUpdateConfig,
      refresh: refreshAll,
    },
  };
}
