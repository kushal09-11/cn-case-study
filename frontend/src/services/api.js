/**
 * API Service for communicating with the FastAPI Simulation Backend.
 */

const API_BASE = '/api';

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getConfig() {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function updateConfig(payload) {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function startSimulation() {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
  return res.json();
}

export async function resumeSimulation() {
  const res = await fetch(`${API_BASE}/simulation/resume`, { method: 'POST' });
  return res.json();
}

export async function stopSimulation() {
  const res = await fetch(`${API_BASE}/simulation/stop`, { method: 'POST' });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
  return res.json();
}

export async function getSimulationStatus() {
  const res = await fetch(`${API_BASE}/simulation/status`);
  return res.json();
}

export async function getCurrentMetrics() {
  const res = await fetch(`${API_BASE}/metrics/current`);
  return res.json();
}

export async function getMetricsHistory() {
  const res = await fetch(`${API_BASE}/metrics/history`);
  return res.json();
}

export async function getTopology() {
  const res = await fetch(`${API_BASE}/topology`);
  return res.json();
}

export async function getCongestionEvents() {
  const res = await fetch(`${API_BASE}/congestion/events`);
  return res.json();
}

export async function getDiagnostics() {
  const res = await fetch(`${API_BASE}/congestion/diagnostics`);
  return res.json();
}

export async function getQoSStatus() {
  const res = await fetch(`${API_BASE}/qos/status`);
  return res.json();
}

export async function getQoSHistory() {
  const res = await fetch(`${API_BASE}/qos/history`);
  return res.json();
}

export async function getQoSDecision() {
  const res = await fetch(`${API_BASE}/qos/decision`);
  return res.json();
}

export async function runComparison(payload) {
  const res = await fetch(`${API_BASE}/experiments/run-comparison`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getExperiments() {
  const res = await fetch(`${API_BASE}/experiments`);
  return res.json();
}

export async function getExperimentDetails(experimentId) {
  const res = await fetch(`${API_BASE}/experiments/${experimentId}`);
  return res.json();
}

export function getExportCsvUrl(experimentId) {
  return `${API_BASE}/experiments/${experimentId}/export`;
}
