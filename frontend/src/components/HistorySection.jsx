import React, { useState, useEffect } from 'react';
import { Database, Download, RotateCcw, Calendar, CheckCircle } from 'lucide-react';
import * as api from '../services/api';

export function HistorySection() {
  const [experiments, setExperiments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRuns = async () => {
    setIsLoading(true);
    try {
      const data = await api.getExperiments();
      setExperiments(data || []);
    } catch (err) {
      console.error('Failed to fetch saved experiments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-400" />
            Persistent Experiment Runs (SQLite)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Archived simulation trials persisted in local database with time-series telemetry.
          </p>
        </div>
        <button
          onClick={fetchRuns}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {experiments.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-12 text-center text-slate-400 text-xs">
          No saved experiment runs found. Complete a simulation run to automatically archive results.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experiments.map((exp) => (
            <div 
              key={exp.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{exp.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">ID: {exp.id}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    {exp.qos_mode}
                  </span>
                </div>

                <div className="my-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Avg Throughput</span>
                    <span className="font-bold text-slate-200">{exp.overall_throughput_mbps} Mbps</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Avg Latency</span>
                    <span className="font-bold text-slate-200">{exp.overall_avg_latency_ms} ms</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">P95 Latency</span>
                    <span className="font-bold text-slate-200">{exp.overall_p95_latency_ms} ms</span>
                  </div>
                  <div className="p-2 rounded bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Packet Loss</span>
                    <span className={`font-bold ${exp.overall_packet_loss_pct > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {exp.overall_packet_loss_pct}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mb-4">
                  <span>Seed: {exp.random_seed}</span>
                  <span>Duration: {exp.duration_seconds}s</span>
                  {exp.created_at && (
                    <span className="truncate">Saved: {new Date(exp.created_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <a
                  href={api.getExportCsvUrl(exp.id)}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Telemetry CSV
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
