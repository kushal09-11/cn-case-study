import React from 'react';
import { Layers, Video, Globe, DownloadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';

export function FlowMetricsTable({ latestMetrics, config }) {
  const flows = config?.flows || [];
  const flowMetrics = latestMetrics?.flow_metrics || {};

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'real_time':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Video className="w-3 h-3" /> Real-Time
          </span>
        );
      case 'bulk':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <DownloadCloud className="w-3 h-3" /> Bulk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Globe className="w-3 h-3" /> Best-Effort
          </span>
        );
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            Per-Flow Granular Performance Metrics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual simulated client statistics showing offered load, delivered throughput, P95 tail latency, and loss.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
          {flows.length} Virtual Stations Active
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Flow / Station</th>
              <th className="py-2.5 px-3">Scheduling Class</th>
              <th className="py-2.5 px-3 text-right">Offered Load</th>
              <th className="py-2.5 px-3 text-right">Delivered Throughput</th>
              <th className="py-2.5 px-3 text-right">Avg Latency</th>
              <th className="py-2.5 px-3 text-right">P95 Latency</th>
              <th className="py-2.5 px-3 text-right">Jitter</th>
              <th className="py-2.5 px-3 text-right">Instant Loss</th>
              <th className="py-2.5 px-3 text-right">Cumulative Drops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono">
            {flows.map((flow) => {
              const m = flowMetrics[flow.flow_id];
              const offered = Number(flow.offered_load_mbps ?? 0);
              const delivered = Number(m?.throughput_mbps ?? m?.delivered_throughput_mbps ?? 0);
              const avgLat = Number(m?.avg_latency_ms ?? 0);
              const p95Lat = Number(m?.p95_latency_ms ?? 0);
              const jitter = Number(m?.jitter_ms ?? 0);
              const lossPct = Number(m?.packet_loss_pct ?? 0);
              const cumDrops = Number(m?.cumulative_packets_dropped ?? m?.dropped_packets ?? 0);
              const cumLossPct = Number(m?.cumulative_loss_pct ?? 0);

              return (
                <tr key={flow.flow_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-sans font-medium text-slate-200">
                    <div className="flex items-center gap-2">
                      <span>{flow.client_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({flow.flow_id})</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    {getCategoryBadge(flow.category)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-300">
                    {offered.toFixed(1)} Mbps
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-sky-400">
                    {delivered.toFixed(1)} Mbps
                  </td>
                  <td className={`py-3 px-3 text-right ${avgLat > 40 ? 'text-rose-400 font-bold' : 'text-slate-200'}`}>
                    {avgLat.toFixed(1)} ms
                  </td>
                  <td className={`py-3 px-3 text-right ${p95Lat > 60 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                    {p95Lat.toFixed(1)} ms
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-300">
                    {jitter.toFixed(1)} ms
                  </td>
                  <td className={`py-3 px-3 text-right ${lossPct > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                    {lossPct.toFixed(1)}%
                  </td>
                  <td className={`py-3 px-3 text-right ${cumDrops > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}`}>
                    {cumDrops} pkts {cumLossPct > 0 ? `(${cumLossPct.toFixed(1)}%)` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
